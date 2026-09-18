#!/usr/bin/env node
/* ============================================================
   verify-chart.js — 命式は必ずエンジンで算出するための照合ツール
   ------------------------------------------------------------
   このツールの唯一の目的：
     生年月日時から「四柱・蔵干（★司令）・天干通変・地支通変・十二運」を
     ツール本体とまったく同じエンジン（pro-bazi.js の
     window.Bazi.computeChart）で計算し、そのまま表示する。

   ※ 命式の値を人が暗算・手計算してはならない。
     必ず本スクリプト（＝本体と同一エンジン）が出した値をそのまま使う。

   使い方（Node）:
     node verify-chart.js 1981-06-10 22:28 female
     node verify-chart.js 2008-03-28 14:00 female
     node verify-chart.js 1990-01-05          （時刻不明→12:00で計算）

   引数:
     1) 生年月日  YYYY-MM-DD
     2) 時刻      HH:MM        （省略可。省略時は 12:00）
     3) 性別      male / female / 男 / 女  （省略可。既定 female）
   ------------------------------------------------------------
   ※ 本体(index.html)は correctionMode:'none' で computeChart を呼ぶ。
     本スクリプトも同じ設定なので、画面表示と一致する。
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// --- エンジン(pro-bazi.js)を本体と同じ状態で読み込む -----------------
// pro-bazi.js は末尾で window.Bazi = ... を代入するだけなので、
// window スタブを1つ用意して同一コンテキストで実行すればよい。
global.window = global.window || {};
const enginePath = path.join(__dirname, 'pro-bazi.js');
const engineSrc = fs.readFileSync(enginePath, 'utf8');
vm.runInThisContext(engineSrc, { filename: 'pro-bazi.js' });

if (!global.window.Bazi || typeof global.window.Bazi.computeChart !== 'function') {
  console.error('エンジンの読み込みに失敗しました（window.Bazi.computeChart が見つかりません）。');
  console.error('pro-bazi.js が verify-chart.js と同じフォルダにあるか確認してください。');
  process.exit(1);
}
const Bazi = global.window.Bazi;

// --- 命式を計算して返す（本体と同じ呼び出し） -------------------------
function computeChart(opt) {
  return Bazi.computeChart({
    year: opt.year,
    month: opt.month,
    day: opt.day,
    hour: opt.hour,
    minute: opt.minute,
    sex: opt.sex === 'male' ? 'male' : 'female',
    correctionMode: 'none', // 本体(index.html)と同一
  });
}

// --- 表示用フォーマット ---------------------------------------------
const PILLAR_LABELS = ['年柱', '月柱', '日柱', '時柱'];

function hiddenStr(hs) {
  // 蔵干を [癸] のように並べ、司令(★)には★を付ける
  if (!hs || !hs.length) return '';
  return hs.map(function (h) {
    return (h.ling ? '★' : '') + h.stem;
  }).join(' ');
}

function hiddenDetail(hs) {
  // 各蔵干の 役割/通変/司令 を1行で
  if (!hs || !hs.length) return '';
  return hs.map(function (h) {
    return '      ' + (h.ling ? '★' : ' ') + h.stem +
      '（' + (h.role || '') + '）' +
      ' 通変=' + (h.tenStar || '') +
      (h.ling ? '  ← 司令(当令)：この星が地支の通変になります' : '');
  }).join('\n');
}

function branchTenStar(hs) {
  // 地支の通変＝司令★の蔵干の通変
  if (!hs || !hs.length) return '';
  const ling = hs.find(function (h) { return h.ling; });
  return ling ? ling.tenStar : (hs[hs.length - 1] ? hs[hs.length - 1].tenStar : '');
}

function formatChart(c, meta) {
  const L = [];
  L.push('════════════════════════════════════════════════════════');
  L.push('  命式（エンジン算出／手計算ではありません）');
  L.push('  生年月日時: ' + meta.label);
  L.push('  日主: ' + (c.dayMaster ? (c.dayMaster.stem + '（' + c.dayMaster.element + '）') : '?'));
  L.push('════════════════════════════════════════════════════════');
  (c.pillars || []).forEach(function (p, i) {
    L.push('');
    L.push('【' + PILLAR_LABELS[i] + '】 ' + (p.ganzhi || '') +
      '   天干通変=' + (p.tenStar || '') +
      '   十二運=' + (p.terrain || ''));
    L.push('    地支[' + (p.branch || '') + '] 蔵干: ' + hiddenStr(p.hiddenStems) +
      '   → 地支通変=' + branchTenStar(p.hiddenStems));
    const d = hiddenDetail(p.hiddenStems);
    if (d) L.push(d);
  });
  L.push('');
  L.push('════════════════════════════════════════════════════════');
  return L.join('\n');
}

// --- 引数解析 --------------------------------------------------------
function parseArgs(argv) {
  const a = argv.slice(2);
  if (!a.length) return null;
  const dm = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(a[0]);
  if (!dm) return null;
  const out = {
    year: +dm[1], month: +dm[2], day: +dm[3],
    hour: 12, minute: 0, sex: 'female', timeGiven: false,
  };
  for (let i = 1; i < a.length; i++) {
    const t = a[i];
    const tm = /^(\d{1,2}):(\d{1,2})$/.exec(t);
    if (tm) { out.hour = +tm[1]; out.minute = +tm[2]; out.timeGiven = true; continue; }
    if (t === 'male' || t === '男') { out.sex = 'male'; continue; }
    if (t === 'female' || t === '女') { out.sex = 'female'; continue; }
  }
  return out;
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function main() {
  const opt = parseArgs(process.argv);
  if (!opt) {
    console.log('使い方: node verify-chart.js YYYY-MM-DD [HH:MM] [male|female]');
    console.log('  例: node verify-chart.js 1981-06-10 22:28 female');
    console.log('      node verify-chart.js 2008-03-28 14:00 female');
    process.exit(opt === null ? 1 : 0);
  }
  const label = opt.year + '/' + pad2(opt.month) + '/' + pad2(opt.day) +
    ' ' + pad2(opt.hour) + ':' + pad2(opt.minute) +
    (opt.timeGiven ? '' : '（時刻不明→12:00で計算）') +
    ' / ' + (opt.sex === 'male' ? '男性' : '女性');
  const c = computeChart(opt);
  console.log(formatChart(c, { label: label }));
}

// --- 自己テスト（--test）：既知の正解と一致するか検証 -----------------
// 1981/06/10 22:28（女性・日主 己土）… 実機スクショと一致確認済み
// 2008/03/28 14:00（女性・日主 丁火）
function selfTest() {
  const cases = [
    {
      label: '1981/06/10 22:28 女',
      opt: { year: 1981, month: 6, day: 10, hour: 22, minute: 28, sex: 'female' },
      dayMaster: '己',
      pillars: [
        { ganzhi: '辛酉', tenStar: '食神', branchTen: '傷官', terrain: '長生' },
        { ganzhi: '甲午', tenStar: '正官', branchTen: '印綬', terrain: '建禄' },
        { ganzhi: '己未', tenStar: '日主', branchTen: '偏印', terrain: '冠帯' },
        { ganzhi: '乙亥', tenStar: '偏官', branchTen: '劫財', terrain: '胎' },
      ],
    },
    {
      label: '2008/03/28 14:00 女',
      opt: { year: 2008, month: 3, day: 28, hour: 14, minute: 0, sex: 'female' },
      dayMaster: '丁',
      pillars: [
        { ganzhi: '戊子', tenStar: '傷官', branchTen: '偏官', terrain: '絶' },
        { ganzhi: '乙卯', tenStar: '偏印', branchTen: '偏印', terrain: '病' },
        { ganzhi: '丁卯', tenStar: '日主', branchTen: '偏印', terrain: '病' },
        { ganzhi: '丁未', tenStar: '比肩', branchTen: '食神', terrain: '冠帯' },
      ],
    },
  ];
  let allOK = true;
  cases.forEach(function (t) {
    const c = computeChart(t.opt);
    let ok = true;
    const errs = [];
    if (!c.dayMaster || c.dayMaster.stem !== t.dayMaster) {
      ok = false; errs.push('日主 期待=' + t.dayMaster + ' 実際=' + (c.dayMaster && c.dayMaster.stem));
    }
    t.pillars.forEach(function (exp, i) {
      const p = c.pillars[i] || {};
      const bt = branchTenStar(p.hiddenStems);
      if (p.ganzhi !== exp.ganzhi) { ok = false; errs.push(PILLAR_LABELS[i] + ' 干支 期待=' + exp.ganzhi + ' 実際=' + p.ganzhi); }
      if (p.tenStar !== exp.tenStar) { ok = false; errs.push(PILLAR_LABELS[i] + ' 天干通変 期待=' + exp.tenStar + ' 実際=' + p.tenStar); }
      if (bt !== exp.branchTen) { ok = false; errs.push(PILLAR_LABELS[i] + ' 地支通変 期待=' + exp.branchTen + ' 実際=' + bt); }
      if (p.terrain !== exp.terrain) { ok = false; errs.push(PILLAR_LABELS[i] + ' 十二運 期待=' + exp.terrain + ' 実際=' + p.terrain); }
    });
    console.log((ok ? '✅ PASS' : '❌ FAIL') + '  ' + t.label);
    if (!ok) { allOK = false; errs.forEach(function (e) { console.log('     - ' + e); }); }
  });
  console.log(allOK ? '\nすべての既知ケースと一致しました（エンジンは正しく動作しています）。'
    : '\n一致しないケースがあります。');
  process.exit(allOK ? 0 : 1);
}

if (process.argv[2] === '--test') selfTest();
else main();
