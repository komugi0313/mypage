#!/usr/bin/env node
/*!
 * sync-engines.js — index.html のインライン版から外部エンジンを生成／検証する
 * ------------------------------------------------------------------
 * 背景：このサイトは「画面(index.html) と メール(外部 *.js) は単一ソース＝
 *       絶対に食い違わない」を大原則にしている。ところが index.html は
 *       engine.js / daily-engine.js を <script> でインライン埋め込みしており、
 *       外部ファイルは別に存在するため、片方だけ更新すると両者がズレる
 *       （実際に daily-engine.js が陳腐化し、メールの habit/moon/subject 欄が
 *        欠落する食い違いが発生していた）。
 *
 * このツールは index.html を“正”とみなし、埋め込みスクリプトを取り出して
 * 外部 engine.js / daily-engine.js に書き出す（--write）／一致を検証する（--check）。
 *
 * 使い方:
 *   node tools/sync-engines.js --check   # 一致していなければ差分を表示し exit 1（CI向き）
 *   node tools/sync-engines.js --write   # index.html の版で外部ファイルを上書き
 *   node tools/sync-engines.js           # --check と同じ（既定は非破壊）
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '..');
const INDEX = path.join(DIR, 'index.html');
const TARGETS = [
  { marker: /\*\s*engine\.js\s/, file: 'engine.js' },
  { marker: /\*\s*daily-engine\.js\s/, file: 'daily-engine.js' },
];

// index.html 内の <script>…</script> ブロックのうち、本文が /*! …<marker>… で
// 始まるものを取り出し、埋め込み用エスケープ <\/ を </ に戻す。
function extractInline(html, marker) {
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const body = m[1];
    if (/^\s*\/\*!/.test(body) && marker.test(body.slice(0, 120))) {
      return body.replace(/<\\\//g, '</').replace(/^\n/, '');
    }
  }
  return null;
}

function normalize(s) {
  // 末尾の改行ゆらぎを無視して比較（内容の一致だけを見る）
  return String(s).replace(/\s+$/, '');
}

function main() {
  const mode = process.argv.includes('--write') ? 'write' : 'check';
  const html = fs.readFileSync(INDEX, 'utf8');
  let mismatches = 0;

  for (const t of TARGETS) {
    const inline = extractInline(html, t.marker);
    if (inline == null) {
      console.error(`✗ index.html 内に ${t.file} のインライン版が見つかりません`);
      mismatches++;
      continue;
    }
    const out = path.join(DIR, t.file);
    const current = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';

    if (normalize(inline) === normalize(current)) {
      console.log(`✓ ${t.file} は index.html と一致`);
      continue;
    }

    if (mode === 'write') {
      fs.writeFileSync(out, inline.replace(/\s*$/, '') + '\n', 'utf8');
      console.log(`↻ ${t.file} を index.html の版で更新しました`);
    } else {
      console.error(`✗ ${t.file} が index.html と食い違っています（node tools/sync-engines.js --write で同期）`);
      mismatches++;
    }
  }

  if (mode === 'check' && mismatches > 0) {
    console.error(`\n${mismatches} 件の不一致。画面とメールが食い違う恐れがあります。`);
    process.exit(1);
  }
}

main();
