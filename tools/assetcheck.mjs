#!/usr/bin/env node
// ============================================================
// ASSET CHECK — index.html と images/ の 食い違いを 見る
//
//   node tools/assetcheck.mjs
//
//   ・参照しているのに 存在しない ファイル（読み込み失敗に なる）
//   ・置いてあるのに 誰も 使っていない ファイル（消し忘れ）
//
// パスは 動的に 組み立てている ところが ある ので、
// lazySprites の キー一覧と 組み立て式を 読んで 復元する。
// ?v=2 のような キャッシュ回避は 取り除いて 比べる。
// ============================================================
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'index.html'), 'utf8');

const used = new Set();
const add = (p) => used.add(p.split('?')[0]);

for (const m of src.matchAll(/['"](images\/[^'"]+\.(?:webp|png|jpg|jpeg|gif|mp4))(\?[^'"]*)?['"]/g)) add(m[1]);

// lazySprites(キー一覧, k => 'images/xxx/' + ... )
for (const m of src.matchAll(/lazySprites\(\s*(\[[^\]]*\]|Object\.keys\((\w+)\)|(\w+))\s*,\s*k\s*=>\s*'([^']+)'\s*\+\s*([^)]+)\)/g)) {
  const [, keysrc, objName, varName, prefix, expr] = m;
  let keys = [];
  if (keysrc.startsWith('[')) {
    keys = [...keysrc.matchAll(/'([^']+)'/g)].map((x) => x[1]);
  } else {
    const nm = objName || varName;
    const decl = src.match(new RegExp('const ' + nm + '\\s*=\\s*(\\{[^}]*\\}|\\[[^\\]]*\\])'));
    if (!decl) continue;
    keys = decl[1].startsWith('{')
      ? [...decl[1].matchAll(/(\w+)\s*:/g)].map((x) => x[1])
      : [...decl[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
  const mapName = expr.match(/(\w+)\[k\]/);
  const suffix = (expr.match(/\+\s*'([^']*)'/) || [, ''])[1];
  let table = null;
  if (mapName) {
    const d2 = src.match(new RegExp('const ' + mapName[1] + '\\s*=\\s*\\{([^}]*)\\}'));
    table = d2 ? Object.fromEntries([...d2[1].matchAll(/(\w+)\s*:\s*'([^']+)'/g)].map((x) => [x[1], x[2]])) : {};
  }
  for (const k of keys) add(prefix + (table ? (table[k] ?? k) : k) + suffix);
}

// 必殺技の 動画
const ult = src.match(/const ultimateFileNames\s*=\s*\[([^\]]*)\]/);
if (ult) for (const n of [...ult[1].matchAll(/'([^']+)'/g)].map((x) => x[1])) add(`images/ultimates/${n}_ultimate.mp4`);

const present = new Set();
(function walk(dir) {
  for (const e of readdirSync(join(ROOT, dir))) {
    if (e.startsWith('.')) continue;
    const rel = dir + '/' + e;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
    else present.add(rel);
  }
})('images');

// 用意できていない ことが 分かっている もの（作る 予定 / 意図して 無い）
const KNOWN_MISSING = new Set([
  'images/bot/win.webp',          // idle に 落ちる（prepared: no win pose）
  'images/bot/robot/win.webp',
  'images/ultimates/poyo_ultimate.mp4',   // 動画 未作成（無い キャラは 演出を 飛ばす）
  'images/ultimates/pull_ultimate.mp4',
  'images/ultimates/mussy_ultimate.mp4',
]);

const missing = [...used].filter((f) => !present.has(f) && !KNOWN_MISSING.has(f)).sort();
const unused = [...present].filter((f) => !used.has(f)).sort();
const knownGone = [...KNOWN_MISSING].filter((f) => !present.has(f));

const mb = (f) => (statSync(join(ROOT, f)).size / 1048576).toFixed(2) + ' MB';
console.log(`参照 ${used.size} 件 / 実在 ${present.size} 件`);
if (knownGone.length) console.log(`  （未作成と 分かっている もの ${knownGone.length} 件は 除外: ${knownGone.join(', ')}）`);

let bad = 0;
if (missing.length) { bad = 1; console.error(`\nFAIL 参照しているのに 無い ${missing.length} 件:`); missing.forEach((f) => console.error('  ' + f)); }
if (unused.length) { bad = 1; console.error(`\nFAIL 置いてあるのに 使っていない ${unused.length} 件:`); unused.forEach((f) => console.error('  ' + f + '  ' + mb(f))); }
if (bad) process.exit(1);
console.log('\n食い違いなし');
