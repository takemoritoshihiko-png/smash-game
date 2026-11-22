#!/usr/bin/env node
// ============================================================
// index.html の 先頭の 目次を 作り直す。
//
//   node tools/toc.mjs          目次を 書き直す
//   node tools/toc.mjs --check  ずれていないか 見るだけ（ずれていたら 終了コード1）
//
// 見出しの 形:
//   // ======================================================================
//   // 見出し名
//   // （補足は 何行 書いてもよい）
//   // ======================================================================
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'index.html');
const CHECK = process.argv.includes('--check');
const BAR = '// ' + '='.repeat(70);
const isBar = (l) => /^\/\/ ={40,}$/.test(l);

let lines = readFileSync(FILE, 'utf8').split('\n');

// --- 既存の 目次を 外す ---
const sIdx = lines.findIndex((l) => l.startsWith('// ### 目次'));
const eIdx = lines.findIndex((l) => l.startsWith('// ### 目次ここまで'));
let old = [];
if (sIdx !== -1 && eIdx !== -1) {
  let lo = sIdx > 0 && isBar(lines[sIdx - 1]) ? sIdx - 1 : sIdx;
  let hi = eIdx + 1;
  while (hi < lines.length && (isBar(lines[hi]) || lines[hi] === '')) hi++;
  old = lines.slice(lo, hi);
  lines.splice(lo, hi - lo);
}

// --- 見出しを 集める（開始バーの 次の行が 見出し名）---
const toc = [];
for (let i = 0; i < lines.length; i++) {
  if (!isBar(lines[i])) continue;
  if (i > 0 && isBar(lines[i - 1])) continue;                              // 閉じバー
  if (i > 1 && lines[i - 1].startsWith('//') && isBar(lines[i - 2])) continue;
  const t = lines[i + 1];
  if (!t || !t.startsWith('// ') || isBar(t)) continue;
  let closed = false;
  for (let j = i + 2; j < Math.min(i + 8, lines.length); j++) if (isBar(lines[j])) { closed = true; break; }
  if (!closed) continue;
  const name = t.slice(3).trim();
  if (!name || name.startsWith('###')) continue;
  toc.push({ at: i, name });
}

const insertAt = lines.findIndex((l) => l.trim() === '<script>') + 1;
const build = (offset) => {
  const b = [
    BAR,
    '// ### 目次',
    '//',
    '//   このファイルは 1枚の HTML で 完結している（ビルド不要・file:// で 動く）。',
    '//   変更したら  node tools/smoketest.mjs  を 必ず 走らせること。',
    '//   目次が ずれたら  node tools/toc.mjs  で 作り直す。',
    '//',
  ];
  for (const { at, name } of toc) b.push('//   ' + String(at + 2 + offset).padEnd(6) + name);
  b.push('//', '// ### 目次ここまで', BAR, '');
  return b;
};
let block = build(0);
block = build(block.length);

if (CHECK) {
  const same = old.length === block.length && old.every((l, i) => l === block[i]);
  if (same) { console.log('ok  目次は 最新（' + toc.length + '項目）'); process.exit(0); }
  console.error('FAIL 目次が ずれています。node tools/toc.mjs で 作り直してください。');
  process.exit(1);
}

lines.splice(insertAt, 0, ...block);
writeFileSync(FILE, lines.join('\n'));
console.log('目次を 書き直しました（' + toc.length + '項目）');
