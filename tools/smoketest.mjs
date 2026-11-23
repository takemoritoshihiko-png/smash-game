#!/usr/bin/env node
// ============================================================
// SMOKE TEST — index.html を 壊していないか 自動で 確かめる
//
//   node tools/smoketest.mjs            全部 走らせる
//   node tools/smoketest.mjs --quick    重い テストを 飛ばす
//
// 仕組み: index.html に テスト用の <script> を 足した コピーを 作り、
// ヘッドレスChrome で 開いて 結果を DOM 経由で 受け取る。
// 大きな 改修の 前と 後で 走らせて、出力が 変わっていなければ OK。
// ============================================================
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const QUICK = process.argv.includes('--quick');

const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean).find(existsSync);

if (!CHROME) {
  const msg = 'Chrome が 見つかりません（CHROME_PATH で 指定できます）';
  if (process.env.CI) { console.error('FAIL ' + msg); process.exit(1); }
  console.error(msg + ' — テストを 飛ばします。');
  process.exit(0);
}

// ---------- 1. 構文チェック ----------
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const scriptBodies = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!scriptBodies.length) { console.error('FAIL: <script> が 見つからない'); process.exit(1); }

const work = mkdtempSync(join(tmpdir(), 'smash-smoke-'));
try {
  for (let i = 0; i < scriptBodies.length; i++) {
    const f = join(work, `chunk${i}.js`);
    writeFileSync(f, scriptBodies[i]);
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (e) {
      console.error(`FAIL: <script> #${i} に 構文エラー\n${e.stderr?.toString() || e.message}`);
      process.exit(1);
    }
  }
  console.log(`ok  構文チェック   (<script> ${scriptBodies.length}個)`);

  // ---------- 目次が 本文と ずれていないか ----------
  const earlyFailures = [];
  try {
    execFileSync(process.execPath, [join(ROOT, 'tools', 'toc.mjs'), '--check'], { stdio: 'pipe' });
    console.log('ok  目次');
  } catch (e) {
    console.error('FAIL 目次が ずれています → node tools/toc.mjs');
    earlyFailures.push('目次が ずれています → node tools/toc.mjs');
  }

  // ---------- 2. ブラウザで 実際に 動かす ----------
  for (const dir of ['images', 'sounds']) {
    if (existsSync(join(ROOT, dir))) cpSync(join(ROOT, dir), join(work, dir), { recursive: true });
  }

  const probe = `
<script>
(function(){
  var LOG = [];
  var ERRORS = [];
  window.addEventListener('error', function(e){ ERRORS.push('window.onerror: ' + e.message); });
  window.addEventListener('unhandledrejection', function(e){ ERRORS.push('unhandled promise: ' + e.reason); });
  var _ce = console.error;
  console.error = function(){ ERRORS.push('console.error: ' + Array.prototype.join.call(arguments,' ')); _ce.apply(console, arguments); };

  function say(k, v){ LOG.push(k + ' = ' + v); }
  function check(k, cond, detail){ LOG.push((cond ? 'ok  ' : 'FAIL') + '  ' + k + (detail ? '  (' + detail + ')' : '')); }

  // gameLoop を 手で 回す。
  // ・requestAnimationFrame を 止める: 止めないと 手で 呼ぶ たびに 別の ループが
  //   増えていき、進むフレーム数が 毎回 変わって テストが 不安定に なる
  // ・刻みは FIXED_DT と 同じ 1000/60。16 だと 4% の 呼び出しが 空振りする
  window.requestAnimationFrame = function(){ return 0; };
  var STEP = 1000 / 60;
  var T = performance.now() + 50;
  function run(n){ for (var i = 0; i < n; i++) { T += STEP; gameLoop(T); } }
  // 乱数を 固定（CPU の 行動や ヤッホの ランダム効果で 結果が ぶれないように）
  var _seed = 12345;
  Math.random = function(){ _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; };

  setTimeout(function(){
    try {
      var N = characters.length;
      say('characters', N);
      say('stages', stages.length);

      // --- キャラ別テーブルの 穴 ---
      var TABLES = {
        attackDefs: function(i){ return attackDefs[i]; },
        commandDefs: function(i){ return commandDefs[i]; },
        RECOVERY_MOVES: function(i){ return RECOVERY_MOVES[i]; },
        ultimateData: function(i){ return ultimateData[i]; },
        COMBO_FINISHERS: function(i){ return COMBO_FINISHERS[i]; },
        // 30(Chatta) は D=ワープメテオ なので D技を 持たないのが 正しい
        D_SKILL_NAMES: function(i){ return i === 30 ? true : D_SKILL_NAMES[i]; },
        CHAR_THROW_TYPE: function(i){ return CHAR_THROW_DMG[CHAR_THROW_TYPE[i]]; }
      };
      for (var name in TABLES) {
        var miss = [];
        for (var i = 0; i < N; i++) { try { if (!TABLES[name](i)) miss.push(i); } catch (e) { miss.push(i + '!'); } }
        check('table ' + name, miss.length === 0, miss.length ? 'missing ' + miss.join(',') : N + '/' + N);
      }

      // --- 全画面が 描けるか ---
      var SCENES = ['title','select','difficulty','stageselect','chardetail','howtoplay','online','combolist','stats','vsintro'];
      var badScenes = [];
      SCENES.forEach(function(sc){
        try { scene = sc; transitioning = false; run(3); } catch (e) { badScenes.push(sc + ':' + e.message); }
      });
      check('scenes draw', badScenes.length === 0, badScenes.join(' | ') || SCENES.length + ' scenes');

      // --- 詳細画面 全キャラ x 3ページ ---
      var badDetail = [];
      for (var c = 0; c < N; c++) {
        for (var t = 0; t < 3; t++) {
          try { charDetailIdx = c; charDetailTab = t; drawCharDetail(); }
          catch (e) { badDetail.push(c + '/' + t + ':' + e.message); }
        }
      }
      check('char detail pages', badDetail.length === 0, badDetail.slice(0,3).join(' | ') || (N*3) + ' pages');

      // --- 全キャラで 試合が 立ち上がるか + 技が 出るか ---
      var MOVES = ['normal','strong','side','up','down','aerial','downair','airup','airfront','airback','dash','special'];
      var badBoot = [], badMove = [];
      var step = QUICK_MODE ? 5 : 1;
      for (var ci = 0; ci < N; ci += step) {
        try {
          gameMode='cpu'; cpuDifficulty=0; p1Select=ci; p2Select=(ci+1)%N; selectedStage=ci%stages.length;
          onlineMode=false; isHost=false; bossRushMode=false;
          scene='battle'; transitioning=false; selectTransition=0;
          initBattle(); run(QUICK_MODE ? 60 : 200);
          if (!players[0] || !players[1]) { badBoot.push(ci+':no players'); continue; }
          if (isNaN(players[0].x) || isNaN(players[0].y)) { badBoot.push(ci+':NaN pos'); continue; }
          var p = players[0];
          players[1].x = 3000; players[1].invincibleTimer = 99999;
          MOVES.forEach(function(mv){
            try {
              p.attacking=false; p.attackFrame=0; p.hitstun=0; p.grabbing=false; p.grabbed=false;
              p.grounded = (mv.indexOf('air')!==0 && mv!=='downair');
              startAttack(p, mv);
              run(2);
            } catch (e) { badMove.push(ci+'/'+mv+':'+e.message); }
          });
          // 復帰技
          p.y=-200; p.grounded=false; p.recoveryUsed=false; p.attacking=false; p.hitstun=0;
          executeRecovery(p);
          // 投げ
          p.attacking=false; p.grounded=true; p.hitstun=0;
          try { executeThrow(p, 1, 0); } catch (e) { badMove.push(ci+'/throw:'+e.message); }
          // D技
          p.dSkillCooldown=0; p.dSkillActive=false; p.attacking=false; p.hitstun=0;
          try { triggerDSkill(p); } catch (e) { badMove.push(ci+'/dskill:'+e.message); }
          // コマンド技
          try {
            var cmds = commandDefs[ci] || [];
            for (var k = 0; k < cmds.length; k++) {
              p.attacking=false; p.hitstun=0; p.cd_cmd1=0; p.cd_cmd2=0; p.cd_cmd3=0;
              executeCommand(p, cmds[k]); run(2);
            }
          } catch (e) { badMove.push(ci+'/cmd:'+e.message); }
          // コンボフィニッシャー
          try {
            comboDisplay[0] = { count: 20, timer: 120, maxTimer: 120 };
            p.attacking=false; p.hitstun=0;
            if (canComboFinisher(0)) executeComboFinisher(p);
            comboDisplay[0] = null;
          } catch (e) { badMove.push(ci+'/finisher:'+e.message); }
          run(5);
        } catch (e) { badBoot.push(ci + ':' + e.message); }
      }
      check('battle boots', badBoot.length === 0, badBoot.slice(0,3).join(' | ') || 'all chars');
      check('moves execute', badMove.length === 0, badMove.slice(0,4).join(' | ') || MOVES.length + ' moves x chars');

      // --- オンライン: ホストが ゲスト入力を 処理できるか ---
      var onlineBad = [];
      try {
        gameMode='vs'; onlineMode=true; isHost=true; peerConn=null;
        p1Select=0; p2Select=0; selectedStage=0;
        scene='battle'; transitioning=false; initBattle(); run(300);
        remoteKeys={}; prevRemoteKeys={};
        var g = players[1];
        players[0].invincibleTimer = 99999;
        function feed(o, n){
          var b={left:0,right:0,up:0,down:0,z:0,x:0,c:0,s:0,a:0,d:0};
          for (var k in o) b[k]=o[k];
          remoteKeys=b; run(n||3);
        }
        // 復帰技
        g.y=-200; g.grounded=false; g.jumps=0; g.recoveryUsed=false; g.attacking=false; g.hitstun=0;
        feed({up:1,x:1}, 3);
        if (!g.recoveryUsed) onlineBad.push('guest recovery');
        // 上空中
        g.y=-200; g.grounded=false; g.attacking=false; g.hitstun=0; feed({},2);
        feed({up:1,z:1}, 3);
        if (g.attackType !== 'airup') onlineBad.push('guest airup=' + g.attackType);
        // コンボフィニッシャー
        feed({},3); g.grounded=true; g.attacking=false; g.hitstun=0;
        comboDisplay[1] = { count: 20, timer: 120, maxTimer: 120 };
        var finBefore = !!(comboFinisherActive && comboFinisherActive.active);
        feed({c:1}, 3);
        if (!(comboFinisherActive && comboFinisherActive.active) && !finBefore) onlineBad.push('guest finisher');
        comboDisplay[1] = null;
        // 切断の 後始末
        remoteKeys = {right:1};
        handleOnlineDisconnect('smoketest');
        if (onlineMode) onlineBad.push('disconnect left onlineMode=true');
        if (Object.keys(remoteKeys).length) onlineBad.push('disconnect left remoteKeys');
      } catch (e) { onlineBad.push('threw: ' + e.message); }
      onlineMode=false; isHost=false; remoteKeys={}; prevRemoteKeys={};
      check('online guest input', onlineBad.length === 0, onlineBad.join(' | ') || 'recovery/airup/finisher/disconnect');

      // --- スマッシュ攻撃（方向2回 + X）---
      var smashBad = [];
      try {
        gameMode='cpu'; cpuDifficulty=0; p1Select=0; p2Select=1; selectedStage=0;
        onlineMode=false; isHost=false; scene='battle'; transitioning=false;
        initBattle(); run(400);
        var sp = players[0];
        players[1].x = 3000; players[1].invincibleTimer = 99999;
        function pressKey(k, rep){ handleKeyDown({key:k, repeat:!!rep, preventDefault:function(){}}); }
        function freshSmash(){
          sp.x=480; sp.vx=0; sp.grounded=true; sp.attacking=false; sp.hitstun=0;
          sp.smashCharging=false; sp.smashType=null; sp.smashInputCount=0;
          for (var k in keys) delete keys[k];
        }
        freshSmash(); keys['ArrowRight']=true;
        pressKey('ArrowRight'); run(1); pressKey('ArrowRight'); run(1); pressKey('x');
        if (sp.smashType !== 'sideSmash') smashBad.push('side->' + sp.smashType);
        freshSmash(); keys['ArrowDown']=true;
        pressKey('ArrowDown'); run(1); pressKey('ArrowDown'); run(1); pressKey('x');
        if (sp.smashType !== 'downSmash') smashBad.push('down->' + sp.smashType);
        // キーの 自動リピートで 暴発しないこと
        freshSmash(); keys['ArrowRight']=true;
        pressKey('ArrowRight'); for (var r=0;r<8;r++){ pressKey('ArrowRight', true); run(1); }
        pressKey('x');
        if (sp.smashCharging) smashBad.push('key-repeat triggered smash');
        for (var k2 in keys) delete keys[k2];
      } catch (e) { smashBad.push('threw: ' + e.message); }
      check('smash attack', smashBad.length === 0, smashBad.join(' | ') || 'side/down + no key-repeat');

      // --- 周期処理が フレーム基準で 動くか（battleTime は ms なので 使ってはいけない）---
      var tickBad = [];
      try {
        gameMode='cpu'; cpuDifficulty=0; p1Select=0; p2Select=1; selectedStage=0;
        scene='battle'; transitioning=false; initBattle(); run(400);
        var zp = players[0]; players[1].x = 3000; players[1].alive = false;
        zp.invincibleTimer = 99999;   // 被弾でも 氷ゲージが 減るので 相手を 無効化しておく
        zp.zenIceGauge = 100;
        var f0 = battleFrame, g0 = zp.zenIceGauge;
        run(700);
        var df = battleFrame - f0, dg = g0 - zp.zenIceGauge;
        var want = Math.floor(df / 20);
        // 直っていなければ dg は 1〜2 程度にしかならない。±3 は フレーム境界の 誤差
        if (Math.abs(dg - want) > 3) tickBad.push('ice gauge -' + dg + ' over ' + df + 'F, expected ~' + want);
        if (Math.abs(battleTime / battleFrame - 1000/60) > 0.1) tickBad.push('battleFrame drift');
      } catch (e) { tickBad.push('threw: ' + e.message); }
      check('per-frame ticks', tickBad.length === 0, tickBad.join(' | ') || 'gauge decays at the designed rate');

      // --- P1(ローカル) と ゲスト で 同じ 入力 → 同じ 技 に なるか ---
      //     入力処理は pressZ/pressX/pressA/pressC に 一本化してある。
      //     ここが ずれたら 「ゲストだけ 技が 出ない」が 再発している
      var parityBad = [];
      try {
        var DIRMAP = { left:'ArrowLeft', right:'ArrowRight', up:'ArrowUp', down:'ArrowDown' };
        var PCASES = [
          ['ground Z',     {},          'z', false], ['ground fwd+Z', {right:1},  'z', false],
          ['ground down+Z',{down:1},    'z', false], ['air Z',        {},         'z', true ],
          ['air down+Z',   {down:1},    'z', true ], ['air up+Z',     {up:1},     'z', true ],
          ['air fwd+Z',    {right:1},   'z', true ], ['ground X',     {},         'x', false],
          ['air up+X',     {up:1},      'x', true ], ['ground A',     {},         'a', false],
          ['ground C',     {},          'c', false]
        ];
        var floorY = 0;
        function pReset(q, air){
          q.x=480; q.y = air ? floorY-220 : floorY; q.vx=0; q.vy=0;
          q.attacking=false; q.attackType=null; q.attackFrame=0; q.hitstun=0;
          q.facingLeft=false; q.grounded=!air; q.jumps=air?1:2; q.landLag=0;
          q.recoveryUsed=false; q.grabbing=false; q.grabbed=false; q.charging=false;
          q.jabTimer=0; q.jabCount=0; q.smashCharging=false; q.smashInputCount=0;
          cmdInputBuffers[q.id]=[]; cmdInputFrames[q.id]=[];
        }
        function pSnap(q){ return (q.attackType||'-')+'/'+(q.recoveryUsed?'r':'-')+'/'+(q.grabbing?'g':'-')+'/'+(q.smashCharging?'s':'-'); }
        function rkOf(o){ var b={left:0,right:0,up:0,down:0,z:0,x:0,c:0,s:0,a:0,d:0}; for (var k in o) b[k]=o[k]; return b; }

        gameMode='cpu'; cpuDifficulty=0; p1Select=0; p2Select=0; selectedStage=0;
        onlineMode=false; isHost=false; scene='battle'; transitioning=false; initBattle(); run(400);
        players[1].x=3000; players[1].alive=false;
        var PA = players[0]; PA.invincibleTimer=99999; PA.x=480; PA.vx=0; run(30); floorY = PA.y;
        var res1 = [];
        PCASES.forEach(function(c){
          for (var k in keys) delete keys[k];
          pReset(PA, c[3]);
          for (var d in c[1]) if (c[1][d]) keys[DIRMAP[d]] = true;
          run(1);
          handleKeyDown({ key: c[2], repeat: false, preventDefault: function(){} });
          res1.push(pSnap(PA));
        });
        for (var k3 in keys) delete keys[k3];

        gameMode='vs'; onlineMode=true; isHost=true; peerConn=null;
        p1Select=0; p2Select=0; scene='battle'; transitioning=false; initBattle(); run(400);
        remoteKeys={}; prevRemoteKeys={};
        players[0].x=3000; players[0].alive=false;
        var PB = players[1]; PB.invincibleTimer=99999; PB.x=480; PB.vx=0; run(30);
        PCASES.forEach(function(c, i){
          remoteKeys=rkOf({}); prevRemoteKeys=rkOf({});
          pReset(PB, c[3]);
          var dirOnly={}; for (var d in c[1]) if (c[1][d]) dirOnly[d]=1;
          remoteKeys=rkOf(dirOnly); run(1);
          var withBtn={}; for (var d2 in dirOnly) withBtn[d2]=1; withBtn[c[2]]=1;
          remoteKeys=rkOf(withBtn); run(1);
          var got = pSnap(PB);
          if (got !== res1[i]) parityBad.push(c[0] + ' P1=' + res1[i] + ' guest=' + got);
        });
        remoteKeys={}; prevRemoteKeys={}; onlineMode=false; isHost=false;
      } catch (e) { parityBad.push('threw: ' + e.message); }
      onlineMode=false; isHost=false;
      check('local vs guest parity', parityBad.length === 0, parityBad.slice(0,3).join(' | ') || '11 inputs identical');

      // ============================================================
      // ここから: 試合の ルールが 壊れていないか
      // ============================================================
      function battle(ci1, ci2, frames){
        gameMode='cpu'; cpuDifficulty=0; p1Select=ci1; p2Select=ci2; selectedStage=0;
        onlineMode=false; isHost=false; bossRushMode=false;
        scene='battle'; transitioning=false; selectTransition=0;
        initBattle(); run(frames || 400);
        return [players[0], players[1]];
      }

      // --- 撃墜 → ストック減 → 復活 ---
      var koBad = [];
      try {
        var r = battle(0, 1), ka = r[0];
        r[1].x = 3000; r[1].alive = false;
        var st0 = ka.stocks;
        ka.damage = 150; ka.x = BLAST_LEFT - 200; ka.invincibleTimer = 0;
        run(10);
        if (ka.stocks !== st0 - 1) koBad.push('stock ' + st0 + '->' + ka.stocks);
        if (ka.alive) koBad.push('still alive after blast');
        if (!(ka.respawnTimer > 0)) koBad.push('no respawn timer');
        for (var f = 0; f < 600 && !ka.alive; f++) { T += 16; gameLoop(T); }
        if (!ka.alive) koBad.push('never respawned');
        if (ka.damage !== 0) koBad.push('damage not reset: ' + ka.damage);
        if (!(ka.invincibleTimer > 0)) koBad.push('no respawn invincibility');
      } catch (e) { koBad.push('threw: ' + e.message); }
      check('KO / stock / respawn', koBad.length === 0, koBad.join(' | ') || 'blast -> -1 stock -> respawn clean');

      // --- 時間切れは 引き分け ---
      var drawBad = [];
      try {
        var r2 = battle(0, 1);
        r2[0].stocks = 3; r2[1].stocks = 1; r2[0].damage = 0; r2[1].damage = 200;
        battleTimer = 0; battleFrameAcc = 59;
        run(20);
        if (!gameOver) drawBad.push('not gameOver');
        if (!isDraw) drawBad.push('isDraw false (should be a draw regardless of stocks)');
      } catch (e) { drawBad.push('threw: ' + e.message); }
      check('timeout = DRAW', drawBad.length === 0, drawBad.join(' | ') || 'stock/damage lead ignored');

      // --- ダメージが 増えると 吹っ飛ぶ ---
      var kbBad = [];
      try {
        var r3 = battle(0, 0), A3 = r3[0], B3 = r3[1];
        function hitOnce(dmg){
          B3.x = A3.x + 50; B3.y = A3.y; B3.vx = 0; B3.vy = 0;
          B3.hitstun = 0; B3.invincibleTimer = 0; B3.guarding = false;
          A3.hitTargets = []; A3.repMove = null; A3.repCount = 0;
          B3.damage = dmg;
          applyHit(A3, B3, 10, 6, 0.1, -30, 'normal');
          return Math.abs(B3.vx) + Math.abs(B3.vy);
        }
        var low = hitOnce(0), high = hitOnce(150);
        if (!(high > low * 1.5)) kbBad.push('150% knockback (' + high.toFixed(1) + ') not well above 0% (' + low.toFixed(1) + ')');
        if (!(B3.damage > 150)) kbBad.push('damage did not accumulate');
      } catch (e) { kbBad.push('threw: ' + e.message); }
      check('damage scales knockback', kbBad.length === 0, kbBad.join(' | ') || '0% vs 150%');

      // --- 同じ技の 連発は ノックバック下限で ハメに ならない ---
      var repBad = [];
      try {
        var r4 = battle(0, 0), A4 = r4[0], B4 = r4[1];
        var kbs = [];
        for (var h = 0; h < 6; h++) {
          B4.x = A4.x + 50; B4.y = A4.y; B4.vx = 0; B4.vy = 0;
          B4.hitstun = 0; B4.invincibleTimer = 0; B4.guarding = false; B4.damage = 20;
          A4.hitTargets = [];
          A4.attackType = 'normal';
          applyHit(A4, B4, 4, 3, 0.05, -20, 'normal');
          kbs.push(Math.hypot(B4.vx, B4.vy));
        }
        var tail = Math.min(kbs[3], kbs[4], kbs[5]);
        if (!(tail >= REP_FLOOR[0] * 0.8)) repBad.push('5th+ knockback ' + tail.toFixed(2) + ' below floor ' + REP_FLOOR[0]);
      } catch (e) { repBad.push('threw: ' + e.message); }
      check('anti-spam knockback floor', repBad.length === 0, repBad.join(' | ') || 'repeated jab pushes away');

      // --- ガードは ダメージを 減らし、耐久が 減る ---
      var gdBad = [];
      try {
        var r5 = battle(0, 0), A5 = r5[0], B5 = r5[1];
        B5.x = A5.x + 50; B5.y = A5.y; B5.invincibleTimer = 0; B5.hitstun = 0;
        B5.damage = 0; B5.guarding = false; A5.hitTargets = [];
        applyHit(A5, B5, 20, 6, 0.1, -30, 'normal');
        var noGuard = B5.damage;
        B5.damage = 0; B5.guarding = true; B5.guardDurability = GUARD_MAX_DURABILITY;
        B5.hitstun = 0; B5.invincibleTimer = 0; A5.hitTargets = [];
        applyHit(A5, B5, 20, 6, 0.1, -30, 'normal');
        if (!(B5.damage < noGuard)) gdBad.push('guard did not reduce damage (' + B5.damage + ' vs ' + noGuard + ')');
        if (!(B5.guardDurability < GUARD_MAX_DURABILITY)) gdBad.push('guard durability did not drop');
      } catch (e) { gdBad.push('threw: ' + e.message); }
      check('guard reduces damage', gdBad.length === 0, gdBad.join(' | ') || 'damage down, durability down');

      // --- 掴み → 投げ ---
      var grBad = [];
      try {
        var r6 = battle(0, 0), A6 = r6[0], B6 = r6[1];
        B6.x = A6.x + 35; B6.y = A6.y; B6.grounded = true; B6.invincibleTimer = 0;
        B6.hitstun = 0; B6.damage = 0;
        A6.grounded = true; A6.attacking = false; A6.hitstun = 0; A6.throwCooldown = 0;
        tryGrab(A6); run(20);
        if (!A6.grabbing) grBad.push('grab failed');
        else { executeThrow(A6, 1, 0); run(10);
               if (!(B6.damage > 0)) grBad.push('throw dealt no damage'); }
      } catch (e) { grBad.push('threw: ' + e.message); }
      check('grab and throw', grBad.length === 0, grBad.join(' | ') || 'grab -> throw damage');

      // --- フィニッシャーは 15コンボ以上でのみ ---
      var finBad = [];
      try {
        battle(0, 0);
        comboDisplay[0] = { count: 14, timer: 120, maxTimer: 120 };
        if (canComboFinisher(0)) finBad.push('allowed at 14 combos');
        comboDisplay[0] = { count: 15, timer: 120, maxTimer: 120 };
        if (!canComboFinisher(0)) finBad.push('blocked at 15 combos');
        comboDisplay[0] = null;
      } catch (e) { finBad.push('threw: ' + e.message); }
      check('finisher needs 15 combos', finBad.length === 0, finBad.join(' | ') || '14 no / 15 yes');

      // --- 試合を やり直しても 前の 状態が 残らない ---
      var leakBad = [];
      try {
        battle(0, 1, 200);
        comboDisplay[0] = { count: 9, timer: 60, maxTimer: 60 };
        hitFlash.alpha = 0.9; screenShake.intensity = 20;
        ultimateVideoShowing = true; ultimateActive = true;
        gaugePopups.push({ x: 0, y: 0, text: 'x', life: 60, color: '#fff' });
        instantKillDisplay = { active: true, timer: 10, maxTimer: 60 };
        initBattle();
        if (comboDisplay[0]) leakBad.push('comboDisplay');
        if (hitFlash.alpha !== 0) leakBad.push('hitFlash');
        if (screenShake.intensity !== 0) leakBad.push('screenShake');
        if (ultimateVideoShowing) leakBad.push('ultimateVideoShowing (battle would never draw)');
        if (ultimateActive) leakBad.push('ultimateActive');
        if (gaugePopups.length) leakBad.push('gaugePopups');
        if (instantKillDisplay.active) leakBad.push('instantKillDisplay');
      } catch (e) { leakBad.push('threw: ' + e.message); }
      check('no state leak into a rematch', leakBad.length === 0, leakBad.join(' | ') || '7 globals cleared');

      // --- BGM が 無音の まま 残らない ---
      var bgmBad = [];
      try {
        battle(0, 1, 60);
        fadeOutBGM(0.1);
        if (currentBgmAudio) currentBgmAudio.volume = 0;   // フェード完了を 模す
        stopBGM();
        fadeInBGM(0.5);                                     // bgmPlaying=false なので 何も しない
        startBGM();
        if (currentBgmAudio && currentBgmAudio.volume !== BGM_VOLUME)
          bgmBad.push('volume stuck at ' + currentBgmAudio.volume);
      } catch (e) { bgmBad.push('threw: ' + e.message); }
      check('BGM does not stay muted', bgmBad.length === 0, bgmBad.join(' | ') || 'volume restored on restart');

      // --- 壊れた セーブデータで 落ちない ---
      var saveBad = [];
      try {
        var keep1 = localStorage.getItem('smash_battle_stats');
        var keep2 = localStorage.getItem('smash_unlocks');
        ['null', '123', '"x"', '[]', '{"charGames":5}', '{}'].forEach(function (junk) {
          try {
            localStorage.setItem('smash_battle_stats', junk);
            localStorage.setItem('smash_unlocks', junk);
            loadBattleStats(); loadUnlocks();
            recordBattleResult(0, 1, true);
            checkBossRushUnlocks(3, 'Flawless Champ');
            drawStats();
          } catch (e) { saveBad.push(junk + ' -> ' + e.message); }
        });
        localStorage.removeItem('smash_battle_stats');
        localStorage.removeItem('smash_unlocks');
        if (keep1) localStorage.setItem('smash_battle_stats', keep1);
        if (keep2) localStorage.setItem('smash_unlocks', keep2);
        loadBattleStats(); loadUnlocks();
      } catch (e) { saveBad.push('threw: ' + e.message); }
      check('corrupt save data survives', saveBad.length === 0, saveBad.slice(0,2).join(' | ') || '6 bad payloads');

      // --- 壊れた 通信パケットで 座標が NaN に ならない ---
      var netBad = [];
      try {
        gameMode='vs'; onlineMode=true; isHost=false; peerConn=null;
        p1Select=0; p2Select=0; scene='battle'; transitioning=false; initBattle(); run(200);
        var gx = players[0].x, gy = players[0].y;
        var handler = null;
        // setupPeerConnection を 通さず 直接 applyHostState / frame 相当を 叩く
        [{}, { x: NaN, y: 0, vx: 0, vy: 0 }, { x: 'a', y: 0, vx: 0, vy: 0 }, null].forEach(function (junk) {
          applyHostState({ type: 'state', p1: junk, p2: junk });
          if (!Number.isFinite(players[0].x) || !Number.isFinite(players[0].y))
            netBad.push('payload ' + JSON.stringify(junk) + ' broke the position');
        });
        players[0].x = gx; players[0].y = gy;
        onlineMode=false; isHost=false;
      } catch (e) {
        // 例外は 出てよい（捕まえている）。座標が 壊れていなければ 合格
        if (!Number.isFinite(players[0] && players[0].x)) netBad.push('x became NaN');
        onlineMode=false; isHost=false;
      }
      check('bad network packet keeps positions finite', netBad.length === 0, netBad.join(' | ') || 'x/y stay finite');

      // --- 復帰技が 設計どおりの 高さまで 上がる ---
      var recBad = [];
      try {
        [0, 5, 29, 30].forEach(function (ci) {
          var rr = battle(ci, 0, 300);
          var rp2 = rr[0]; rr[1].x = 3000; rr[1].alive = false;
          rp2.x = 480; rp2.y = -150; rp2.grounded = false; rp2.jumps = 0;
          rp2.vx = 0; rp2.vy = 0; rp2.recoveryUsed = false; rp2.attacking = false;
          rp2.hitstun = 0; rp2.invincibleTimer = 900;
          if (!executeRecovery(rp2)) { recBad.push(ci + ': would not fire'); return; }
          var y0 = rp2.y, top = rp2.y;
          for (var f = 0; f < 600 && rp2.recoveryActive > 0; f++) { T += 16; gameLoop(T); if (rp2.y < top) top = rp2.y; }
          var spec = RECOVERY_MOVES[ci];
          var want = Math.round(spec.height * Math.abs(Math.sin(spec.angle * Math.PI / 180)));
          var got = Math.round(y0 - top);
          if (Math.abs(got - want) > 5) recBad.push(ci + ': rose ' + got + ' want ' + want);
        });
      } catch (e) { recBad.push('threw: ' + e.message); }
      check('recovery reaches its designed height', recBad.length === 0, recBad.join(' | ') || 'chars 0/5/29/30');

      // --- 全キャラ × 全技キー が 存在し、実際に 出るか ---
      //     「例外が 出ない」だけでは 技が 無くても 気づけない（startAttack は 黙って 帰る）
      var keyBad = [];
      try {
        var MOVEKEYS = ['normal','strong','side','up','down','special','aerial','downair','airfront','airback','airup','dash'];
        for (var ci = 0; ci < characters.length; ci++) {
          var defs = attackDefs[ci];
          MOVEKEYS.forEach(function (mv) { if (!defs || !defs[mv]) keyBad.push(ci + ':' + mv + ' 未定義'); });
        }
        var rr0 = battle(0, 0, 250), ap = rr0[0];
        rr0[1].x = 3000; rr0[1].alive = false;
        for (var ci2 = 0; ci2 < characters.length; ci2 += (QUICK_MODE ? 7 : 1)) {
          ap.charIdx = ci2;
          MOVEKEYS.forEach(function (mv) {
            if (!attackDefs[ci2] || !attackDefs[ci2][mv]) return;
            ap.attacking=false; ap.attackType=null; ap.attackFrame=0; ap.hitstun=0;
            ap.charging=false; ap.grabbing=false; ap.chattaFly=0;
            ap.grounded = (mv.indexOf('air') !== 0 && mv !== 'downair');
            startAttack(ap, mv);
            // Chatta の strong は「飛行」なので attacking には ならない
            var ok = (ci2 === 30 && mv === 'strong') ? (ap.chattaFly > 0) : (ap.attacking && ap.attackType === mv);
            if (!ok) keyBad.push(ci2 + ':' + mv + ' 出ない(' + ap.attackType + ')');
          });
        }
      } catch (e) { keyBad.push('threw: ' + e.message); }
      check('every move key exists and fires', keyBad.length === 0, keyBad.slice(0,4).join(' | ') || '31 chars x 12 moves');

      // --- スマッシュが 威力ゼロに ならないか ---
      //     元にする 技（strong）が 飛び道具の キャラは 空振りに なっていた
      var smBad = [];
      try {
        var rs = battle(0, 0, 250), sp2 = rs[0];
        rs[1].x = 3000; rs[1].alive = false;
        for (var ci3 = 0; ci3 < characters.length; ci3++) {
          sp2.charIdx = ci3;
          ['upSmash','sideSmash','downSmash'].forEach(function (t) {
            sp2.attacking=false; sp2.hitstun=0; sp2.grounded=true;
            sp2.smashCharging = true; sp2.smashChargeTime = 0; sp2.smashType = t;
            executeSmash(sp2);
            var ad = sp2.attackData;
            if (!ad || !(ad.damage > 0) || !(ad.hw > 0)) smBad.push(ci3 + '/' + t + ' dmg=' + (ad && ad.damage) + ' hw=' + (ad && ad.hw));
          });
        }
      } catch (e) { smBad.push('threw: ' + e.message); }
      check('smash attacks are never empty', smBad.length === 0, smBad.slice(0,4).join(' | ') || '31 chars x 3 smashes');

      // --- 方向2回で ダッシュ / Micro の ↓↓分裂 ---
      //     どちらも ミリ秒を フレーム数として 比べていて 一度も 成立しなかった
      var dashBad = [];
      try {
        var rd = battle(2, 0, 300), dp = rd[0];
        rd[1].x = 3000; rd[1].alive = false;
        for (var k in keys) delete keys[k];
        dp.x = 480; dp.vx = 0; dp.grounded = true; dp.dashing = false; dp.lastMoveDirTime = 0;
        keys['ArrowRight'] = true; run(2);
        keys['ArrowRight'] = false; run(2);
        keys['ArrowRight'] = true; run(4);
        if (!dp.dashing) dashBad.push('dash never triggered');
        for (var k2 in keys) delete keys[k2];

        var rm = battle(20, 0, 300), mp = rm[0];
        rm[1].x = 3000; rm[1].alive = false;
        for (var k3 in keys) delete keys[k3];
        mp.grounded = true; mp.microSplit = false; mp._microDownTime = 0;
        keys['ArrowDown'] = true; run(1);
        keys['ArrowDown'] = false; run(1);
        keys['ArrowDown'] = true; run(3);
        if (!mp.microSplit) dashBad.push('Micro split never triggered');
        for (var k4 in keys) delete keys[k4];
      } catch (e) { dashBad.push('threw: ' + e.message); }
      check('double-tap dash / Micro split', dashBad.length === 0, dashBad.join(' | ') || 'both fire');

      // --- トレーニングに 入っても 戦績が 止まらない ---
      var trBad = [];
      try {
        gameMode = 'training'; scene='battle'; transitioning=false; initBattle(); run(10);
        if (!trainingMode) trBad.push('training did not set trainingMode');
        battle(0, 1, 60);
        if (trainingMode) trBad.push('trainingMode stuck true after a normal match (stats stop recording)');
      } catch (e) { trBad.push('threw: ' + e.message); }
      check('training mode does not stick', trBad.length === 0, trBad.join(' | ') || 'reset on every initBattle');

      // --- BGM の フェードタイマーが 置き去りに ならない ---
      var fadeBad = [];
      try {
        battle(0, 1, 30);
        startBGM(); fadeOutBGM(0.3);
        if (!bgmFadeInterval) fadeBad.push('fadeOut did not start a timer');
        stopBGM();
        if (bgmFadeInterval) fadeBad.push('stopBGM left the fade timer running (next match goes silent)');
      } catch (e) { fadeBad.push('threw: ' + e.message); }
      check('BGM fade timer is cleared', fadeBad.length === 0, fadeBad.join(' | ') || 'stopBGM clears it');

      // --- 必殺技が 必ず 終わるか（実時間タイマーが 効かない 最悪の 状況）---
      //     タブが 裏に 回る / タイマーが 間引かれる / 動画が 固まる と、
      //     'video' 段階から 抜けられず 画面が 止まったままに なっていた
      var ultBad = [];
      var realSetTimeout = window.setTimeout, realSetInterval = window.setInterval;
      try {
        window.setTimeout = function(){ return 0; };
        window.setInterval = function(){ return 0; };
        for (var uc = 0; uc < characters.length; uc += (QUICK_MODE ? 6 : 1)) {
          gameMode='cpu'; cpuDifficulty=0; p1Select=uc; p2Select=(uc+3)%characters.length;
          selectedStage=0; onlineMode=false; scene='battle'; transitioning=false;
          initBattle(); run(250);
          var up2 = players[0];
          players[1].x = up2.x + 70; players[1].invincibleTimer = 0;
          up2.ultimateGauge = 100;
          if (!triggerUltimate(up2)) { ultBad.push(uc + ': did not fire'); continue; }
          var uf = 0;
          while (ultimateActive && uf < 1500) { T += STEP; gameLoop(T); uf++; }
          if (ultimateActive) ultBad.push(uc + ': still running after 1500F (phase=' + ultimatePhase + ')');
          if (ultimateVideoShowing) ultBad.push(uc + ': video flag left set (battle would never draw)');
          if (document.querySelectorAll('video').length) ultBad.push(uc + ': <video> left in the DOM');
        }
      } catch (e) { ultBad.push('threw: ' + e.message); }
      window.setTimeout = realSetTimeout; window.setInterval = realSetInterval;
      try { removeUltimateVideo(); } catch (e) {}
      check('ultimate always ends, even with timers dead', ultBad.length === 0,
            ultBad.slice(0,3).join(' | ') || 'frame-based backstop works');

      // --- どの 状態も 必ず 抜けられるか ---
      //     「入れるのに 出られない 状態」が あると 画面が 止まる / 動けなく なる。
      //     必殺技の video 段階が まさに それだった
      var hangBad = [];
      try {
        function until(cond, max, label) {
          var f = 0; while (cond() && f < max) { T += STEP; gameLoop(T); f++; }
          if (cond()) hangBad.push(label + ': still set after ' + max + 'F');
        }
        var hr = battle(0, 0, 250), ha = hr[0], hb = hr[1];
        hb.x = ha.x + 45; hb.invincibleTimer = 0; ha.hitTargets = [];
        applyHit(ha, hb, 30, 8, 0.1, -30, 'strong');
        until(function(){ return hitStopFrames > 0; }, 200, 'hitStopFrames');

        hr = battle(0, 0, 250); hr[1].damage = 200; hr[1].x = BLAST_RIGHT + 50; blastCheck(hr[1]);
        until(function(){ return koSlowMotion.active; }, 400, 'koSlowMotion');

        hr = battle(0, 0, 250); comboDisplay[0] = { count: 20, timer: 120, maxTimer: 120 };
        hr[1].x = hr[0].x + 50; hr[1].invincibleTimer = 0;
        executeComboFinisher(hr[0]); comboDisplay[0] = null;
        until(function(){ return comboFinisherSlowmo > 0; }, 300, 'comboFinisherSlowmo');

        hr = battle(0, 0, 250); hr[1].x = hr[0].x + 35; hr[1].grounded = true;
        hr[0].grounded = true; hr[0].throwCooldown = 0; tryGrab(hr[0]);
        until(function(){ return hr[1].grabbed; }, 600, 'grabbed');

        hr = battle(0, 0, 250); hr[0].x = STAGE_LEFT; hr[0].y += 10; hr[0].vy = 0;
        hr[0].grounded = false; checkLedgeGrab(hr[0]);
        until(function(){ return hr[0].ledgeGrab; }, 400, 'ledgeGrab');

        hr = battle(0, 0, 250); hr[0].guardBreakStun = 120;
        until(function(){ return hr[0].guardBreakStun > 0; }, 400, 'guardBreakStun');

        hr = battle(0, 0, 250); hr[1].x = 3000; hr[1].alive = false;
        hr[0].damage = 200; hr[0].x = BLAST_LEFT - 100; hr[0].invincibleTimer = 0; run(5);
        until(function(){ return !hr[0].alive; }, 700, 'respawnTimer');

        scene = 'select'; transitioning = false; selectTransition = 0; startTransition('title');
        until(function(){ return transitioning; }, 200, 'transitioning');

        hr = battle(0, 0, 250); hr[0].grounded = false; hr[0].y -= 200; triggerAirDodge(hr[0], {});
        until(function(){ return hr[0].airDodging; }, 300, 'airDodging');

        hr = battle(5, 0, 250); hr[0].dSkillCooldown = 0; hr[0].dSkillActive = false; triggerDSkill(hr[0]);
        until(function(){ return hr[0].dSkillActive; }, 800, 'dSkillActive');
      } catch (e) { hangBad.push('threw: ' + e.message); }
      check('no state can get stuck', hangBad.length === 0, hangBad.slice(0,3).join(' | ') || '10 states all exit');

      // --- オンラインの やりとり（偽の 接続で 通信手順を 一通り）---
      //     壊れた パケットで 例外が 出ると applyHostState 全体が 中断し、
      //     ゲストの 同期が 黙って 止まる
      var netBad2 = [];
      var errBefore = ERRORS.length;
      try {
        function fakeConn() {
          return { open:true, sent:[], h:{},
                   on:function(e,f){ this.h[e]=f; }, send:function(m){ this.sent.push(m); }, close:function(){} };
        }
        isHost = true; scene = 'online'; transitioning = false;
        var fc = fakeConn(); setupPeerConnection(fc); fc.h.open();
        if (!onlineMode) netBad2.push('open did not set onlineMode');
        if (gameMode !== 'vs') netBad2.push('open did not set gameMode=vs');
        if (!(fc.sent[0] && fc.sent[0].type === 'charSelect')) netBad2.push('no charSelect sent');

        [999, -5, null, undefined, 'abc', NaN, 1.7, characters.length + 10].forEach(function (v) {
          fc.h.data({ type:'charSelect', charIdx: v });
          if (!(Number.isInteger(p2Select) && p2Select >= 0 && p2Select <= characters.length))
            netBad2.push('charIdx ' + v + ' -> p2Select=' + p2Select);
        });
        fc.h.data({ type:'startBattle', charIdx: characters.length, stageIdx: 999 });
        if (!(selectedStage >= 0 && selectedStage < stages.length)) netBad2.push('stageIdx 999 accepted');
        if (p1Select >= characters.length || p2Select >= characters.length) netBad2.push('RANDOM slot leaked into battle');

        run(60); scene = 'battle'; transitioning = false; initBattle(); run(250);
        [null, undefined, 'x', 123, {}].forEach(function (v) { fc.h.data({ type:'input', keys: v }); run(2); });
        if (typeof remoteKeys !== 'object' || remoteKeys === null) netBad2.push('remoteKeys corrupted');

        isHost = false; onlineMode = true;
        [{p1:{},p2:{}}, {p1:null,p2:null}, {p1:{x:NaN,y:0,vx:0,vy:0},p2:{}},
         {p1:{x:'a',y:'b',vx:0,vy:0},p2:{}}].forEach(function (pk) {
          fc.h.data(Object.assign({ type:'state' }, pk)); run(2);
        });
        [{}, {p1x:NaN,p1y:0,p1vx:0,p1vy:0,p2x:0,p2y:0,p2vx:0,p2vy:0}].forEach(function (pk) {
          fc.h.data(Object.assign({ type:'frame' }, pk)); run(2);
        });
        if (!Number.isFinite(players[0].x) || !Number.isFinite(players[1].x)) netBad2.push('position went NaN');
        if (!Number.isFinite(battleTimer)) netBad2.push('battleTimer went NaN');

        isHost = true; gameOver = true; gameSetTimer = 200;
        fc.sent.length = 0; fc.h.data({ type:'rematchReq' });
        if (!fc.sent.some(function (m) { return m.type === 'rematch'; })) netBad2.push('rematchReq ignored');

        scene = 'battle'; transitioning = false; onlineMode = true; remoteKeys = { right: 1 };
        fc.h.close();
        if (onlineMode) netBad2.push('close left onlineMode true');
        if (Object.keys(remoteKeys).length) netBad2.push('close left remoteKeys');
        if (gameMode !== 'cpu') netBad2.push('close left gameMode=' + gameMode);
        // 切断後に 遅れて 届いた パケットで 落ちない こと
        fc.h.data({ type:'state', p1:{x:1,y:1,vx:0,vy:0}, p2:{x:2,y:2,vx:0,vy:0} });
        fc.h.data({ type:'input', keys:{ z:1 } });
        fc.h.close();
      } catch (e) { netBad2.push('threw: ' + e.message); }
      onlineMode = false; isHost = false; remoteKeys = {}; prevRemoteKeys = {};
      // 握りつぶされた 例外も 失敗に する（applyHostState は try/catch の 中に ある）
      if (ERRORS.length > errBefore) netBad2.push((ERRORS.length - errBefore) + ' 件の 例外を 握りつぶした');
      check('online protocol survives junk', netBad2.length === 0, netBad2.slice(0,3).join(' | ') || '8 scenarios, no swallowed errors');

      // --- オンラインの 時間切れ引き分けで ゲストが 固まらないか ---
      //     ホストが isDraw を 送らず、winner も -1 なので ゲスト側の
      //     GAME SET 演出が 始まらず、Enter も ESC も 一生 効かなかった
      var drawBad2 = [];
      try {
        function fakeConn2() {
          return { open:true, sent:[], h:{},
                   on:function(e,f){ this.h[e]=f; }, send:function(m){ this.sent.push(m); }, close:function(){} };
        }
        isHost = false; scene = 'online'; transitioning = false;
        var dc = fakeConn2(); setupPeerConnection(dc); dc.h.open();
        p1Select = 0; p2Select = 1; selectedStage = 0;
        scene = 'battle'; transitioning = false; initBattle(); run(300);
        dc.h.data({ type:'state', _ts: 0,
          p1: serializePlayer(players[0]), p2: serializePlayer(players[1]),
          battleTimer: 0, battleStarted: true, battleCountdown: 0,
          gameOver: true, winner: -1, isDraw: true,
          hitStopFrames: 0, koSlowMotion: { active:false, frames:0, maxFrames:90 },
          projectiles: [], combo0: null, combo1: null });
        run(400);
        if (!gameOver) drawBad2.push('guest did not see gameOver');
        if (!isDraw) drawBad2.push('isDraw not synced');
        if (gameSetPhase === 0) drawBad2.push('GAME SET never started');
        if (!(gameSetTimer > 180)) drawBad2.push('gameSetTimer stuck at ' + gameSetTimer + ' - Enter/ESC would never work');
      } catch (e) { drawBad2.push('threw: ' + e.message); }
      onlineMode = false; isHost = false; remoteKeys = {}; prevRemoteKeys = {};
      check('online draw does not soft-lock the guest', drawBad2.length === 0,
            drawBad2.join(' | ') || 'GAME SET runs, input accepted');

      // --- タブを 離れた とき キーが 残らないか ---
      var blurBad = [];
      try {
        battle(0, 1, 100);
        keys['ArrowRight'] = true; keys['Shift'] = true;
        window.dispatchEvent(new Event('blur'));
        var held = Object.keys(keys).filter(function (k) { return keys[k]; });
        if (held.length) blurBad.push('blur left keys held: ' + held.join(','));
      } catch (e) { blurBad.push('threw: ' + e.message); }
      for (var bk in keys) delete keys[bk];
      check('held keys clear when the tab loses focus', blurBad.length === 0,
            blurBad.join(' | ') || 'blur + visibilitychange');

      // --- 描画で 例外が 出ても 操作不能に ならないか ---
      var resilBad = [];
      try {
        battle(0, 1, 100);
        scene = 'select'; transitioning = false; selectTransition = 0;
        startTransition('title');
        var realDrawSelect = drawSelect;
        // わざと 描画で 投げさせる
        window.drawSelect = function(){ throw new Error('smoketest: forced draw failure'); };
        var guard = 0;
        while (transitioning && guard++ < 200) { T += STEP; gameLoop(T); }
        window.drawSelect = realDrawSelect;
        if (transitioning) resilBad.push('a draw failure stranded transitioning (all input dead)');
        if (scene !== 'title') resilBad.push('transition did not complete, scene=' + scene);
      } catch (e) { resilBad.push('threw: ' + e.message); }
      // わざと 起こした 例外は 集計から 除く（本物の エラーは 残す）
      for (var ei = ERRORS.length - 1; ei >= 0; ei--) {
        if (ERRORS[ei].indexOf('smoketest: forced') >= 0) ERRORS.splice(ei, 1);
      }
      check('a draw failure cannot strand the UI', resilBad.length === 0,
            resilBad.join(' | ') || 'transition still completes');

      // --- 実戦で 起きる 組み合わせの 不具合（サブエージェント調査で 発覚）---
      var combo2Bad = [];
      try {
        // 掴むと 掴んだ側が ずれ続ける（崖際だと 2人とも 落ちる）
        var cr = battle(0, 0, 250), cA = cr[0], cB = cr[1];
        cA.x = 400; cB.x = 435; cA.grounded = true; cB.grounded = true;
        cA.throwCooldown = 0; cB.invincibleTimer = 0;
        tryGrab(cA); run(2);
        var gx0 = cA.x; run(24);
        if (Math.abs(cA.x - gx0) > 3) combo2Bad.push('grab slides the grabber ' + Math.round(cA.x - gx0) + 'px');

        // 飛び道具で 必殺ゲージが 増えない
        cr = battle(4, 0, 250); cA = cr[0]; cB = cr[1];
        cA.ultimateGauge = 0; cB.invincibleTimer = 0; cB.x = cA.x + 120; cB.y = cA.y;
        projectiles.push({ x: cB.x, y: cB.y - 30, vx: 0, vy: 0, w: 40, h: 40, life: 60,
          ownerId: cA.id, ownerCharIdx: cA.charIdx, damage: 10, kbBase: 5, kbScale: 0.08, kbAngle: -20, color: '#fff' });
        run(4);
        if (!(cA.ultimateGauge > 0)) combo2Bad.push('projectile hit gave no ultimate gauge');

        // 溜めスマッシュが 掴まれても 被弾しても 生き残り 勝手に 出る
        cr = battle(0, 0, 250); cA = cr[0]; cB = cr[1];
        cB.x = cA.x + 35; cA.grounded = true; cB.grounded = true; cB.throwCooldown = 0; cA.invincibleTimer = 0;
        cA.smashCharging = true; cA.smashChargeTime = 120; cA.smashType = 'sideSmash';
        tryGrab(cB); run(3);
        if (cA.attacking || cA.smashCharging) combo2Bad.push('charged smash survived being grabbed');
        cr = battle(0, 0, 250); cA = cr[0]; cB = cr[1];
        cA.smashCharging = true; cA.smashChargeTime = 120; cA.smashType = 'sideSmash';
        cA.invincibleTimer = 0; cB.x = cA.x + 40; cB.hitTargets = [];
        applyHit(cB, cA, 20, 8, 0.1, -30, 'strong'); run(3);
        if (cA.attacking || cA.smashCharging) combo2Bad.push('charged smash survived a hit');

        // 同時撃墜が 引き分けに ならない
        cr = battle(0, 0, 250); cA = cr[0]; cB = cr[1];
        cA.stocks = 1; cB.stocks = 1; cA.damage = 150; cB.damage = 150;
        cA.invincibleTimer = 0; cB.invincibleTimer = 0;
        cA.x = BLAST_LEFT - 200; cB.x = BLAST_RIGHT + 200; run(3);
        if (!(isDraw && winner === -1)) combo2Bad.push('double KO gave winner=' + winner + ' isDraw=' + isDraw);

        // ポーズで コンボが 消える / 1ヒットの コンボが 永久に 残る
        cr = battle(0, 0, 250);
        comboDisplay[0] = { count: 15, timer: 90, maxTimer: 90 }; comboFinisherUsed[0] = false;
        handleKeyDown({ key: 'Escape', preventDefault: function(){} }); run(95);
        if (!canComboFinisher(0)) combo2Bad.push('pausing dropped a ready finisher');
        closePause();
        cr = battle(0, 0, 250); comboDisplay[0] = { count: 1, timer: 90, maxTimer: 90 }; run(200);
        if (comboDisplay[0]) combo2Bad.push('a 1-hit combo never expires');

        // 無敵/不在の 相手に 必殺技を 撃って ゲージだけ 失う
        cr = battle(0, 0, 250); cA = cr[0]; cB = cr[1];
        cB.invincibleTimer = 600; cA.ultimateGauge = 100;
        if (triggerUltimate(cA) !== false || cA.ultimateGauge !== 100) combo2Bad.push('ultimate wasted on an invincible target');
        cr = battle(0, 0, 250); cA = cr[0]; cB = cr[1];
        cB.alive = false; cB.respawnTimer = 90; cA.ultimateGauge = 100;
        if (triggerUltimate(cA) !== false || cA.ultimateGauge !== 100) combo2Bad.push('ultimate wasted while the opponent respawns');

        // 何も 起きない D技で 10秒の クールダウンを 取られる
        cr = battle(1, 0, 250); cA = cr[0];
        cA.grounded = false; cA.dSkillCooldown = 0; cA.dSkillActive = false; triggerDSkill(cA);
        if (cA.dSkillCooldown !== 0) combo2Bad.push('airborne Don burned the D-skill cooldown');
        cr = battle(0, 0, 250); cA = cr[0]; cB = cr[1];
        cB.alive = false; cB.respawnTimer = 90; cA.dSkillCooldown = 0; triggerDSkill(cA);
        if (cA.dSkillCooldown !== 0) combo2Bad.push('targetless D-skill burned the cooldown');

        // 掴んでいる 相手の D技に 殴られて 掴みが 外れる
        cr = battle(0, 13, 250); cA = cr[0]; cB = cr[1];
        cB.dSkillCooldown = 0; cB.dSkillActive = false; triggerDSkill(cB);
        cB.x = cA.x + 35; cA.grounded = true; cB.grounded = true;
        cA.throwCooldown = 0; cB.invincibleTimer = 0; cA.damage = 0;
        tryGrab(cA); run(10);
        if (!cA.grabbing || cA.damage > 0) combo2Bad.push('a grabbed opponent D-skill hit the grabber');

        // 相手が 居ないのに フィニッシャーを 使い切る
        cr = battle(0, 0, 250); cA = cr[0]; cB = cr[1];
        cB.alive = false; cB.respawnTimer = 90;
        comboDisplay[0] = { count: 20, timer: 90, maxTimer: 90 };
        comboFinisherUsed[0] = false; comboFinisherSlowmo = 0;
        executeComboFinisher(cA);
        if (comboFinisherUsed[0] || comboFinisherSlowmo) combo2Bad.push('finisher consumed with no target');
        comboDisplay[0] = null;

        // 復活しても 変身が 解けない（0% で 竜のまま 戻ってくる）
        cr = battle(10, 0, 250); cA = cr[0]; cB = cr[1];
        cB.x = 3000; cB.alive = false;
        cA.dragonMode = true; cA.dragonTimer = 900; cA.damage = 200;
        cA.x = BLAST_LEFT - 200; cA.invincibleTimer = 0; run(5);
        var rf = 0; while (!cA.alive && rf < 700) { T += STEP; gameLoop(T); rf++; }
        if (cA.dragonMode) combo2Bad.push('dragon mode survived the respawn');
      } catch (e) { combo2Bad.push('threw: ' + e.message); }
      check('system interactions stay consistent', combo2Bad.length === 0,
            combo2Bad.slice(0,3).join(' | ') || '11 interaction bugs stay fixed');

      // --- ボスラッシュの クリア画面で キャンバス状態が 漏れないか ---
      var bossBad = [];
      try {
        var sDepth = 0;
        var cs = CanvasRenderingContext2D.prototype.save, crst = CanvasRenderingContext2D.prototype.restore;
        CanvasRenderingContext2D.prototype.save = function(){ sDepth++; return cs.apply(this, arguments); };
        CanvasRenderingContext2D.prototype.restore = function(){ sDepth--; return crst.apply(this, arguments); };
        gameMode='bossrush'; bossRushMode=true; p1Select=0; p2Select=1; selectedStage=0;
        onlineMode=false; scene='battle'; transitioning=false; initBattle(); run(250);
        bossRushPhase='clear'; bossRushTimer=200; gameOver=false;
        screenShake.x=40; screenShake.duration=9999;
        sDepth = 0; drawBattle(STEP);
        if (sDepth !== 0) bossBad.push('clear screen leaks ' + sDepth + ' canvas state(s) per frame');
        while (sDepth > 0) { ctx.restore(); sDepth--; }
        CanvasRenderingContext2D.prototype.save = cs; CanvasRenderingContext2D.prototype.restore = crst;
        bossRushMode = false; bossRushPhase = ''; screenShake.duration = 0;
      } catch (e) { bossBad.push('threw: ' + e.message); }
      check('boss rush clear keeps the canvas balanced', bossBad.length === 0,
            bossBad.join(' | ') || 'save/restore balanced');

      // --- ポーズメニュー ---
      var pauseBad = [];
      try {
        gameMode='cpu'; p1Select=0; p2Select=1; scene='battle'; transitioning=false; selectTransition=0;
        initBattle(); run(320);
        handleKeyDown({key:'Escape', preventDefault:function(){}});
        if (!pauseOpen) pauseBad.push('ESC did not open');
        var bt = battleTime; run(30);
        if (battleTime !== bt) pauseBad.push('not frozen');
        handleKeyDown({key:'Escape', preventDefault:function(){}});
        if (pauseOpen) pauseBad.push('ESC did not close');
      } catch (e) { pauseBad.push('threw: ' + e.message); }
      closePause();
      check('pause menu', pauseBad.length === 0, pauseBad.join(' | ') || 'open/freeze/close');

    } catch (e) {
      LOG.push('FATAL ' + e.message + ' @ ' + (e.stack||'').split('\\n')[1]);
    }

    LOG.push((ERRORS.length ? 'FAIL' : 'ok  ') + '  runtime errors  (' + (ERRORS.length ? ERRORS.slice(0,5).join(' | ') : 'none') + ')');
    var d = document.createElement('div');
    d.id = '__smoke__';
    d.style.display = 'none';
    d.textContent = LOG.join('\\n');
    document.body.appendChild(d);
    document.title = 'SMOKE_DONE';
  }, 2600);
})();
</script>`.replaceAll('QUICK_MODE', QUICK ? 'true' : 'false');

  const testFile = join(work, 'smoketest.html');
  writeFileSync(testFile, html + probe);

  const out = execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
    '--virtual-time-budget=' + (QUICK ? 30000 : 90000),
    '--dump-dom', 'file://' + testFile,
  ], { maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

  const m = out.match(/id="__smoke__"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) {
    console.error('FAIL: テストが 最後まで 走らなかった（起動時に 落ちた 可能性）');
    process.exit(1);
  }
  const report = m[1]
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  console.log(report);

  const failed = [
    ...earlyFailures,
    ...report.split('\n').filter(l => l.startsWith('FAIL') || l.startsWith('FATAL')),
  ];
  if (failed.length) {
    // 末尾に まとめて 出す。tail だけ 見ても 見落とさない ように
    console.error('\n' + '='.repeat(60));
    console.error(`失敗 ${failed.length} 件`);
    for (const f of failed) console.error('  - ' + f.replace(/^FAIL\s*/, ''));
    console.error('='.repeat(60));
    process.exit(1);
  }
  console.log('\n全部 通過（' + report.split('\n').filter(l => l.startsWith('ok')).length + '項目）');
} finally {
  rmSync(work, { recursive: true, force: true });
}
