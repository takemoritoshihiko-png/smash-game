#!/usr/bin/env node
// ============================================================
// BEHAVIOR DIFF — ゲームの 動きが 変わっていないか 確かめる
//
//   node tools/behaviordiff.mjs --save ベース名     いまの 動きを 記録する
//   node tools/behaviordiff.mjs --check ベース名    記録と 比べる（違えば 終了コード1）
//
// visualdiff が「絵」を 比べるのに 対して、こちらは「状態」を 比べる。
// updateBattle や applyHit を いじる ときは 絵が 同じでも 中身が
// 変わっている ことが ある（処理順・continue の 位置など）ので、
// 数百フレーム 走らせて プレイヤーの 全項目を 突き合わせる。
//
// 決まった 手順で 動かす ための 工夫:
//   ・乱数を 固定（CPU の 行動も 毎回 同じに なる）
//   ・requestAnimationFrame を 止め、1000/60 刻みで 手回し
//   ・入力は あらかじめ 決めた 台本（ランダム入力は 使わない）
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
  console.error('使い方: node tools/behaviordiff.mjs --save|--check [名前]');
  process.exit(2);
}
const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium',
].filter(Boolean).find(existsSync);
if (!CHROME) { console.error('Chrome が 見つかりません'); process.exit(1); }

const PROBE = String.raw`
<script>
(function () {
  var OUT = [], ERRS = [];
  window.addEventListener('error', function (e) { ERRS.push(e.message); });
  var _ce = console.error;
  console.error = function () { ERRS.push(Array.prototype.join.call(arguments, ' ').slice(0, 120)); _ce.apply(console, arguments); };

  var SEED = 20260101, __s = SEED;
  Math.random = function () { __s = (__s * 1103515245 + 12345) & 0x7fffffff; return __s / 0x7fffffff; };
  function reseed() { __s = SEED; }

  // 数で 表せる 状態を すべて 拾って 1つの 文字列に する。
  // 小数は 丸める（浮動小数の 最後の 桁まで 合わせる 必要は ない）
  function snapshot(p) {
    var keys = Object.keys(p).sort(), parts = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], v = p[k];
      if (k === 'prevX' || k === 'prevY' || k === 'renderX' || k === 'renderY') continue;
      var t = typeof v;
      if (t === 'number') parts.push(k + '=' + (Number.isFinite(v) ? Math.round(v * 100) / 100 : 'NaN'));
      else if (t === 'boolean' || t === 'string') parts.push(k + '=' + v);
      else if (v === null) parts.push(k + '=null');
      else if (Array.isArray(v)) parts.push(k + '#' + v.length);
    }
    return parts.join(',');
  }
  function globalSnap() {
    return [battleFrame, Math.round(battleTimer), battleStarted, gameOver, winner, isDraw,
            hitStopFrames, projectiles.length, comboDisplay[0] ? comboDisplay[0].count : -1,
            comboDisplay[1] ? comboDisplay[1].count : -1,
            koSlowMotion.active, comboFinisherSlowmo, ultimateActive, ultimatePhase].join('|');
  }
  function h(str) { var a = 0; for (var i = 0; i < str.length; i++) a = (a * 31 + str.charCodeAt(i)) | 0; return a; }

  // 台本: [開始フレーム, 押す/離す, キー]
  var SCRIPTS = {
    walk_attack: [[10,1,'ArrowRight'],[40,0,'ArrowRight'],[45,1,'z'],[47,0,'z'],
                  [70,1,'ArrowLeft'],[100,0,'ArrowLeft'],[105,1,'x'],[107,0,'x'],
                  [140,1,'ArrowUp'],[145,0,'ArrowUp'],[150,1,'z'],[152,0,'z'],
                  [200,1,'ArrowDown'],[205,1,'z'],[207,0,'z'],[210,0,'ArrowDown']],
    jump_air:    [[10,1,'ArrowUp'],[20,0,'ArrowUp'],[30,1,'z'],[32,0,'z'],
                  [60,1,'ArrowUp'],[62,0,'ArrowUp'],[70,1,'ArrowDown'],[75,1,'z'],[77,0,'z'],[80,0,'ArrowDown'],
                  [120,1,'ArrowUp'],[125,1,'x'],[127,0,'x'],[130,0,'ArrowUp']],
    guard_grab:  [[10,1,'Shift'],[60,0,'Shift'],[70,1,'a'],[72,0,'a'],
                  [120,1,'ArrowRight'],[150,0,'ArrowRight'],[155,1,'a'],[157,0,'a'],
                  [200,1,'Shift'],[260,0,'Shift']],
    smash_cmd:   [[10,1,'ArrowRight'],[12,0,'ArrowRight'],[14,1,'ArrowRight'],[16,0,'ArrowRight'],
                  [18,1,'x'],[60,0,'x'],
                  [100,1,'ArrowRight'],[102,0,'ArrowRight'],[104,1,'ArrowRight'],[106,0,'ArrowRight'],
                  [108,1,'ArrowUp'],[110,0,'ArrowUp'],[112,1,'ArrowUp'],[114,0,'ArrowUp'],[116,1,'z'],[118,0,'z']],
    special_d:   [[10,1,'c'],[12,0,'c'],[60,1,'d'],[120,0,'d'],[160,1,'c'],[162,0,'c'],
                  [200,1,'d'],[260,0,'d']],
  };

  setTimeout(function () {
    window.requestAnimationFrame = function () { return 0; };
    Date.now = function () { return 1700000000000; };
    var STEP = 1000 / 60;
    var T = 1000000;
    try {
      var SCEN = [];
      var names = Object.keys(SCRIPTS);
      // キャラは 全31体を 順に 使う（台本を 回しながら）
      for (var ci = 0; ci < characters.length; ci++) {
        SCEN.push({ c1: ci, c2: (ci + 5) % characters.length,
                    stage: ci % stages.length, script: names[ci % names.length] });
      }
      for (var si = 0; si < SCEN.length; si++) {
        var sc = SCEN[si];
        reseed();
        gameMode = 'cpu'; cpuDifficulty = 2;
        p1Select = sc.c1; p2Select = sc.c2; selectedStage = sc.stage;
        onlineMode = false; isHost = false; bossRushMode = false; trainingMode = false;
        scene = 'battle'; transitioning = false; selectTransition = 0;
        for (var kk in keys) delete keys[kk];
        lastTime = T; accumulator = 0;
        initBattle();
        var script = SCRIPTS[sc.script], sp = 0;
        var tag = sc.script + '/' + sc.c1 + 'v' + sc.c2;
        for (var f = 0; f < 420; f++) {
          while (sp < script.length && script[sp][0] === f) {
            var ev = script[sp++];
            if (ev[1]) keys[ev[2]] = true; else delete keys[ev[2]];
            if (ev[1]) { try { handleKeyDown({ key: ev[2], repeat: false, preventDefault: function(){} }); } catch (e) {} }
          }
          T += STEP;
          try { gameLoop(T); } catch (e) { OUT.push(tag + '@' + f + ' THROW ' + e.message); break; }
          if (f % 60 === 59) {
            OUT.push(tag + '@' + (f + 1) + ' p0=' + h(snapshot(players[0])) +
                     ' p1=' + h(snapshot(players[1])) + ' g=' + h(globalSnap()));
          }
        }
        for (var kk2 in keys) delete keys[kk2];
      }
    } catch (e) {
      OUT.push('FATAL ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]);
    }
    OUT.push('# errors ' + ERRS.length + (ERRS.length ? ' :: ' + ERRS.slice(0, 3).join(' | ') : ''));
    var d = document.createElement('div');
    d.id = '__behavior__'; d.style.display = 'none';
    d.textContent = OUT.join('\n');
    document.body.appendChild(d);
  }, 2500);
})();
</script>`;

const work = mkdtempSync(join(tmpdir(), 'smash-behavior-'));
try {
  for (const dir of ['images', 'sounds']) {
    if (existsSync(join(ROOT, dir))) cpSync(join(ROOT, dir), join(work, dir), { recursive: true });
  }
  const file = join(work, 'behavior.html');
  writeFileSync(file, readFileSync(join(ROOT, 'index.html'), 'utf8') + PROBE);
  const dom = execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
    '--hide-scrollbars', '--window-size=960,640', '--virtual-time-budget=300000',
    '--dump-dom', 'file://' + file,
  ], { maxBuffer: 1 << 28, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

  const m = dom.match(/id="__behavior__"[^>]*>([\s\S]*?)<\/div>/);
  if (!m) { console.error('FAIL: 計測が 完走しませんでした'); process.exit(1); }
  const report = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
  const lines = report.split('\n');
  const errLine = lines.find((l) => l.startsWith('# errors')) || '# errors ?';
  const throwLines = lines.filter((l) => l.includes(' THROW ') || l.startsWith('FATAL'));

  mkdirSync(SNAP_DIR, { recursive: true });
  const snapFile = join(SNAP_DIR, name + '.behavior.txt');

  if (mode === '--save') {
    writeFileSync(snapFile, report + '\n');
    console.log(`保存: ${snapFile}`);
    console.log(`  ${lines.filter((l) => !l.startsWith('#')).length} 地点 / ${errLine}`);
    if (throwLines.length) { console.error('  例外:'); throwLines.slice(0, 5).forEach((t) => console.error('    ' + t)); process.exit(1); }
    process.exit(0);
  }

  if (!existsSync(snapFile)) { console.error(`FAIL: 記録が ありません → node tools/behaviordiff.mjs --save ${name}`); process.exit(1); }
  const before = readFileSync(snapFile, 'utf8').trim().split('\n');
  const bMap = new Map(before.filter((l) => !l.startsWith('#')).map((l) => [l.split(' ')[0], l]));
  const diffs = [];
  for (const l of lines) {
    if (l.startsWith('#')) continue;
    const k = l.split(' ')[0];
    if (!bMap.has(k)) { diffs.push(`新規 ${k}`); continue; }
    if (bMap.get(k) !== l) {
      const [, ...a] = bMap.get(k).split(' ');
      const [, ...b] = l.split(' ');
      const which = ['p0', 'p1', 'g'].filter((_, i) => a[i] !== b[i]).join('+');
      diffs.push(`変化 ${k}  (${which})`);
    }
  }
  console.log(`比較 ${bMap.size} 地点 / ${errLine}`);
  if (throwLines.length) { console.error('例外:'); throwLines.slice(0, 5).forEach((t) => console.error('  ' + t)); }
  if (diffs.length) {
    console.error(`\n動きが 変わった 地点 ${diffs.length} 件:`);
    diffs.slice(0, 25).forEach((d) => console.error('  ' + d));
    if (diffs.length > 25) console.error(`  ... 他 ${diffs.length - 25} 件`);
    process.exit(1);
  }
  if (throwLines.length) process.exit(1);
  console.log('\n動きは 完全一致');
} finally {
  rmSync(work, { recursive: true, force: true });
}
