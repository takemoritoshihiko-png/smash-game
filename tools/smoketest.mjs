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
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(existsSync);

if (!CHROME) {
  console.error('Chrome が 見つかりません。テストを 飛ばします。');
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

  // gameLoop を 手で 回す。実時間より 必ず 先に 進める（巻き戻すと 更新が 止まる）
  var T = performance.now() + 50;
  function run(n){ for (var i = 0; i < n; i++) { T += 16; gameLoop(T); } }

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

  const failed = report.split('\n').filter(l => l.startsWith('FAIL') || l.startsWith('FATAL'));
  if (failed.length) {
    console.error(`\n${failed.length} 件 失敗`);
    process.exit(1);
  }
  console.log('\n全部 通過');
} finally {
  rmSync(work, { recursive: true, force: true });
}
