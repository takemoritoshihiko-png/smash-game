#!/usr/bin/env node
// ============================================================
// VISUAL DIFF — 見た目が 変わっていないか 確かめる
//
//   node tools/visualdiff.mjs --save ベース名     いまの 見た目を 記録する
//   node tools/visualdiff.mjs --check ベース名    記録と 比べる（違えば 終了コード1）
//   node tools/visualdiff.mjs --save before && ...改修... && node tools/visualdiff.mjs --check before
//
// なぜ 専用ツールが 要るか:
//   画面全体を そのまま 比べると、スプライトの 非同期読み込みが
//   間に合うか どうかで 絵が 変わり、同じファイルでも 結果が ぶれる。
//   ここでは
//     ・全スプライトを 先に 触って 読み込み完了を 待つ
//     ・Math.random を 固定
//     ・時間に 依存する 値（battleFrame / battleTime / selectTime）を 固定
//   してから 描くので、同じ コードなら 必ず 同じ 値に なる。
// ============================================================
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, cpSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP_DIR = join(ROOT, 'tools', '.visualsnap');

const mode = process.argv[2];
const name = process.argv[3] || 'base';
if (mode !== '--save' && mode !== '--check') {
  console.error('使い方: node tools/visualdiff.mjs --save|--check [名前]');
  process.exit(2);
}

const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
].filter(Boolean).find(existsSync);
if (!CHROME) { console.error('Chrome が 見つかりません'); process.exit(1); }

const PROBE = String.raw`
<script>
(function () {
  var OUT = [], ERRS = [];
  window.addEventListener('error', function (e) { ERRS.push(e.message); });
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // 画面の 一部を 粗く 数値化する。色が 1つでも 違えば 値が 変わる
  function hashRegion(x, y, w, h) {
    var d = ctx.getImageData(x, y, w, h).data, a = 0, b = 0;
    for (var i = 0; i < d.length; i += 4) {
      a = (a * 31 + d[i] * 7 + d[i + 1] * 3 + d[i + 2] + d[i + 3]) | 0;
      b = (b + d[i] + d[i + 1] * 2 + d[i + 2] * 3 + d[i + 3]) | 0;
    }
    return a + '_' + b;
  }

  // すべての スプライトを 触って 読み込み完了を 待つ。
  // これを やらないと「間に合ったか どうか」で 絵が 変わって 比較に ならない
  async function loadAllSprites() {
    var imgs = [];
    for (var ci = 0; ci < characters.length; ci++) {
      var set = SPRITE_SETS[ci];
      if (!set) continue;
      for (var k in set) { var im = set[k]; if (im) imgs.push(im); }
    }
    // Proxy は ownKeys が 空なので、代表的な キーを 直接 叩く
    var KEYS = ['idle','walk','jump','fall','attack_n','attack_s','attack_side','attack_up',
                'attack_down','attack_air','special','damage','down','win','guard','rage'];
    for (var ci2 = 0; ci2 < characters.length; ci2++) {
      var s2 = SPRITE_SETS[ci2];
      if (!s2) continue;
      for (var j = 0; j < KEYS.length; j++) { var im2 = s2[KEYS[j]]; if (im2) imgs.push(im2); }
    }
    for (var t = 0; t < 200; t++) {
      var pending = imgs.filter(function (im) { return !im.complete; }).length;
      if (!pending) break;
      await sleep(50);
    }
    return imgs.length;
  }

  // 乱数を 毎回 同じ 並びに 戻す。
  // これを しないと「それまでに 何回 乱数を 使ったか」で 絵が 変わり、
  // 計測の 順番や 1回の 呼び出し差で 結果が ぶれる
  var __seed = 20260101;
  function reseed() { __seed = 20260101; }
  Math.random = function () { __seed = (__seed * 1103515245 + 12345) & 0x7fffffff; return __seed / 0x7fffffff; };

  // 時間で 変わる 値を 止める
  function freeze(frame) {
    reseed();
    battleFrame = frame; battleTime = frame * (1000 / 60);
    if (typeof selectTime !== 'undefined') selectTime = frame * 16;
    if (typeof titleTime !== 'undefined') titleTime = frame * 16;
    screenShake.x = 0; screenShake.y = 0; screenShake.intensity = 0; screenShake.duration = 0;
    hitFlash.alpha = 0;
    cam.x = cam.targetX = 480; cam.y = cam.targetY = 300; cam.zoom = cam.targetZoom = 0.9;
    sparks.length = 0; hitEffects.length = 0; trails.length = 0; damageNumbers.length = 0;
    // タイトルの 粒子は 別の 配列。放っておくと 毎回 違う 絵に なる
    if (typeof titleParticles !== 'undefined') titleParticles.length = 0;
  }

  async function measureAll() {
    var OUT = [];
    try {
      var loaded = await loadAllSprites();
      OUT.push('# sprites ' + loaded);

      // ---- ① メニュー用の キャラ絵（drawCharacterBody）----
      for (var ci = 0; ci < characters.length; ci++) {
        freeze(100);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, 960, 640);
        ctx.globalAlpha = 1; ctx.textAlign = 'left';
        try { drawCharacterBody(480, 420, 2.0, ci, 1600, false); }
        catch (e) { OUT.push('body/' + ci + ' ERR ' + e.message); continue; }
        OUT.push('body/' + ci + ' ' + hashRegion(300, 150, 360, 400));
      }

      // ---- ② バトル用の キャラ絵（drawBattleCharacter）----
      var STATES = [
        { animState: 'idle' }, { animState: 'walk' }, { animState: 'jump' },
        { animState: 'idle', attacking: true, attackType: 'normal', attackFrame: 4 },
        { animState: 'idle', attacking: true, attackType: 'side',   attackFrame: 4 },
        { animState: 'jump', attacking: true, attackType: 'aerial', attackFrame: 4 },
        { animState: 'idle', guarding: true },
        { animState: 'idle', hitstun: 10 },
      ];
      for (var ci2 = 0; ci2 < characters.length; ci2++) {
        for (var si = 0; si < STATES.length; si++) {
          freeze(100);
          var ad = { alive: true, animState: 'idle', attacking: false, attackType: null,
                     attackFrame: 0, hitstun: 0, guarding: false, walkCycle: 0.3,
                     spinAngle: 0, damageTint: 0, invincibleTimer: 0, grounded: true,
                     vx: 0, vy: 0, charging: false, chargeTime: 0, chargeMaxTime: 120,
                     dragonMode: false, botRobot: 0, chattaFly: 0, microSplit: false,
                     dSkillActive: false, dSkillTimer: 0, dSkillBuff: null,
                     landSquash: 0, jumpSquash: 0, damage: 40, stocks: 3, id: 0, charIdx: ci2 };
          for (var kk in STATES[si]) ad[kk] = STATES[si][kk];
          if (ad.attacking) ad.attackData = (attackDefs[ci2] || {})[ad.attackType] || null;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, 960, 640);
          ctx.globalAlpha = 1; ctx.textAlign = 'left';
          try { drawBattleCharacter(480, 420, 1.0, ci2, 1600, false, ad); }
          catch (e) { OUT.push('btl/' + ci2 + '/' + si + ' ERR ' + e.message); continue; }
          OUT.push('btl/' + ci2 + '/' + si + ' ' + hashRegion(330, 230, 300, 320));
        }
      }

      // ---- ②b 攻撃ポーズ（キャラ 0〜8 は 手描き）----
      var ATKS = ['normal','strong','side','up','down','aerial','downair','dash','special'];
      for (var pc = 0; pc <= 8 && pc < characters.length; pc++) {
        for (var ai = 0; ai < ATKS.length; ai++) {
          var adef = (attackDefs[pc] || {})[ATKS[ai]];
          if (!adef) continue;
          var frames = [1, (adef.startup || 2) + 1, (adef.startup || 2) + (adef.active || 4) + 1];
          for (var fi = 0; fi < frames.length; fi++) {
            freeze(100);
            var pd = { alive: true, animState: 'idle', attacking: true, attackType: ATKS[ai],
                       attackFrame: frames[fi], attackData: adef, hitstun: 0, guarding: false,
                       walkCycle: 0, spinAngle: 0, damageTint: 0, invincibleTimer: 0,
                       grounded: ATKS[ai].indexOf('air') !== 0, vx: 0, vy: 0, animTimer: 50,
                       charging: false, chargeTime: 0, chargeMaxTime: 120, specialState: null,
                       dragonMode: false, botRobot: 0, chattaFly: 0, microSplit: false,
                       dSkillActive: false, dSkillTimer: 0, dSkillBuff: null,
                       landSquash: 0, jumpSquash: 0, damage: 40, stocks: 3, id: 0, charIdx: pc };
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, 960, 640);
            ctx.globalAlpha = 1; ctx.textAlign = 'left';
            try { drawBattleCharacter(480, 420, 1.0, pc, 1600, false, pd); }
            catch (e) { OUT.push('pose/' + pc + '/' + ATKS[ai] + '/' + fi + ' ERR ' + e.message); continue; }
            OUT.push('pose/' + pc + '/' + ATKS[ai] + '/' + fi + ' ' + hashRegion(300, 200, 360, 360));
          }
        }
      }

      // ---- ③ 技エフェクト ----
      var EFFECTS = Object.keys(typeof ATTACK_EFFECTS !== 'undefined' ? ATTACK_EFFECTS : {});
      if (!EFFECTS.length) EFFECTS = ['slash','punch','kick','shockwave','slam'];
      for (var ei = 0; ei < EFFECTS.length; ei++) {
        for (var f = 4; f <= 10; f += 3) {
          freeze(100);
          var fp = { x: 480, y: 420, facingLeft: false, attackFrame: f, charIdx: 0,
                     attackData: { effect: EFFECTS[ei], startup: 2, active: 20, recovery: 10,
                                   damage: 10, hx: 20, hy: -40, hw: 70, hh: 50, color: '#66CCFF' } };
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, 960, 640);
          ctx.globalAlpha = 1; ctx.textAlign = 'left';
          try { drawAttackEffect(fp); }
          catch (e) { OUT.push('fx/' + EFFECTS[ei] + '/' + f + ' ERR ' + e.message); continue; }
          OUT.push('fx/' + EFFECTS[ei] + '/' + f + ' ' + hashRegion(300, 250, 360, 300));
        }
      }

      // ---- ④ 画面（メニュー類）----
      var SCENES = ['title', 'select', 'difficulty', 'stageselect', 'chardetail', 'howtoplay', 'online', 'combolist', 'stats'];
      for (var sj = 0; sj < SCENES.length; sj++) {
        freeze(100);
        scene = SCENES[sj]; transitioning = false; selectTransition = 0;
        modeSelected = true; gameMode = 'cpu'; p1Select = 3; p2Select = 7;
        charDetailIdx = 3; charDetailTab = 0; comboListCharIdx = 3;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, 960, 640);
        // 時刻も 固定する。performance.now() だと 1回ごとに 進み方が 変わり、
        // タイトルの 粒子など 時間で 動く ものが 毎回 違う 絵に なる
        if (typeof lastTime !== 'undefined') lastTime = 1000000;
        if (typeof accumulator !== 'undefined') accumulator = 0;
        try { gameLoop(1000000 + 1000 / 60); }
        catch (e) { OUT.push('scene/' + SCENES[sj] + ' ERR ' + e.message); continue; }
        OUT.push('scene/' + SCENES[sj] + ' ' + hashRegion(0, 0, 960, 640));
      }

      // ---- ⑤ HUD ----
      for (var ci3 = 0; ci3 < characters.length; ci3++) {
        freeze(100);
        gameMode = 'cpu'; p1Select = ci3; p2Select = (ci3 + 1) % characters.length;
        selectedStage = 0; onlineMode = false; scene = 'battle'; transitioning = false;
        initBattle();
        freeze(100);
        players[0].damage = 55; players[1].damage = 120;
        players[0].ultimateGauge = 70; players[1].ultimateGauge = 30;
        for (var pk in players[0]) if (/Gauge|Fury|Voltage|Armor|Stamina|Marks|Charges|Ammo|Bodies|Rank/.test(pk) && typeof players[0][pk] === 'number') players[0][pk] = 55;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, 960, 640);
        try { drawBattleHUD(); }
        catch (e) { OUT.push('hud/' + ci3 + ' ERR ' + e.message); continue; }
        OUT.push('hud/' + ci3 + ' ' + hashRegion(0, 440, 960, 200));
      }
    } catch (e) {
      OUT.push('FATAL ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]);
    }
    return OUT;
  }

  setTimeout(async function () {
    window.requestAnimationFrame = function () { return 0; };
    // 詳細画面などが Date.now() を 直接 使って 絵を 動かしている。固定しないと 毎回 変わる
    Date.now = function () { return 1700000000000; };

    // 2回 測って 一致した ものだけを 信用する。
    // 一致しない 項目は 計測が ぶれる もの（比較に 使えない）として 印を 付ける。
    // 画面全体の ハッシュを 1回だけ 測って 比べると、こういう 項目を
    // 「退行した」と 誤って 報告して しまう
    var A = await measureAll();
    var B = await measureAll();
    var mapB = {};
    B.forEach(function (l) { mapB[l.split(' ')[0]] = l; });
    var OUT2 = [], unstable = 0;
    A.forEach(function (l) {
      var k = l.split(' ')[0];
      if (k.charAt(0) === '#') { OUT2.push(l); return; }
      if (mapB[k] === l) OUT2.push(l);
      else { OUT2.push(k + ' UNSTABLE'); unstable++; }
    });
    OUT2.push('# unstable ' + unstable);
    OUT2.push('# errors ' + ERRS.length + (ERRS.length ? ' :: ' + ERRS.slice(0, 3).join(' | ') : ''));
    var d = document.createElement('div');
    d.id = '__visual__'; d.style.display = 'none';
    d.textContent = OUT2.join('\n');
    document.body.appendChild(d);
  }, 1500);
})();
</script>`;

const work = mkdtempSync(join(tmpdir(), 'smash-visual-'));
try {
  for (const dir of ['images', 'sounds']) {
    if (existsSync(join(ROOT, dir))) cpSync(join(ROOT, dir), join(work, dir), { recursive: true });
  }
  const file = join(work, 'visual.html');
  writeFileSync(file, readFileSync(join(ROOT, 'index.html'), 'utf8') + PROBE);

  const dom = execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
    '--hide-scrollbars', '--window-size=960,640', '--virtual-time-budget=400000',
    '--dump-dom', 'file://' + file,
  ], { maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

  const m = dom.match(/id="__visual__"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) { console.error('FAIL: 計測が 完走しませんでした'); process.exit(1); }
  const report = m[1]
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .trim();
  const lines = report.split('\n');
  const errLine = lines.find((l) => l.startsWith('# errors'));
  const unsLine = lines.find((l) => l.startsWith('# unstable')) || '# unstable ?';
  const bad = lines.filter((l) => l.includes(' ERR ') || l.startsWith('FATAL'));

  mkdirSync(SNAP_DIR, { recursive: true });
  const snapFile = join(SNAP_DIR, name + '.txt');

  if (mode === '--save') {
    writeFileSync(snapFile, report + '\n');
    console.log(`保存: ${snapFile}`);
    console.log(`  ${lines.filter((l) => !l.startsWith('#')).length} 項目 / ${errLine} / ${unsLine}`);
    if (bad.length) { console.error(`  描画エラー ${bad.length} 件:`); bad.slice(0, 5).forEach((b) => console.error('    ' + b)); }
    process.exit(0);
  }

  if (!existsSync(snapFile)) { console.error(`FAIL: 記録が ありません → node tools/visualdiff.mjs --save ${name}`); process.exit(1); }
  const before = readFileSync(snapFile, 'utf8').trim().split('\n');
  const bMap = new Map(before.map((l) => [l.split(' ')[0], l]));
  const aMap = new Map(lines.map((l) => [l.split(' ')[0], l]));
  const diffs = [];
  for (const [k, v] of aMap) {
    if (k.startsWith('#')) continue;
    if (!bMap.has(k)) { diffs.push(`新規 ${k}`); continue; }
    if (v.endsWith(' UNSTABLE') || (bMap.get(k) || '').endsWith(' UNSTABLE')) continue;   // 計測が ぶれる 項目
    if (bMap.get(k) !== v) diffs.push(`変化 ${k}`);
  }
  for (const k of bMap.keys()) if (!k.startsWith('#') && !aMap.has(k)) diffs.push(`消失 ${k}`);

  console.log(`比較 ${aMap.size - 1} 項目 / ${errLine} / ${unsLine}`);
  if (bad.length) { console.error(`描画エラー ${bad.length} 件:`); bad.slice(0, 5).forEach((b) => console.error('  ' + b)); }
  if (diffs.length) {
    console.error(`\n見た目が 変わった 箇所 ${diffs.length} 件:`);
    diffs.slice(0, 30).forEach((d) => console.error('  ' + d));
    if (diffs.length > 30) console.error(`  ... 他 ${diffs.length - 30} 件`);
    process.exit(1);
  }
  if (bad.length) process.exit(1);
  console.log('\n見た目は 完全一致');
} finally {
  rmSync(work, { recursive: true, force: true });
}
