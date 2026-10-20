/* verify-engine.js — proves the chart math against independent references.
   Needs Chromium (full engine). Run: npm run verify:engine
   PLAYWRIGHT_CHROMIUM=<path> if Playwright can't auto-resolve the browser. */
'use strict';
const assert = require('assert');
const path = require('path');
const BaZi = require(path.resolve(__dirname, '..', '..', 'bazi.js'));
const { buildChartFull, runEngine, closeEngine } = require('../src/engine-full');

const S = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'], B = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const gz = (i) => S[i % 10] + B[i % 12];
const STEMS = '甲乙丙丁戊己庚辛壬癸', BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

// Pull the hour pillar (天干+地支) as the engine DISPLAYS it in #result. The row
// reads: 時柱 <label> <天干> <地支> <蔵干> 元 …  — so the first stem char is 天干
// and the first branch char after it is 地支 (蔵干 comes only after the branch).
function resultHourPillar(text) {
  const i = text.indexOf('時柱');
  if (i < 0) return null;
  const toks = text.slice(i, i + 80).split(/\s+/).filter(Boolean);
  let stem = null, branch = null;
  for (const t of toks) {
    if (t.length !== 1) continue;
    if (!stem && STEMS.includes(t)) stem = t;
    else if (stem && !branch && BRANCHES.includes(t)) { branch = t; break; }
  }
  return stem && branch ? stem + branch : null;
}

(async () => {
  // 1) JDN anchors
  assert.strictEqual(BaZi.jdn(2000, 1, 1), 2451545, 'JDN 2000-01-01');
  assert.strictEqual(BaZi.jdn(1970, 1, 1), 2440588, 'JDN 1970-01-01');

  // 2) Day pillar: external-confirmed anchor 2000-01-01 = 戊午, and independent
  //    (JS-epoch) recomputation must match bazi's (JDN) across a wide range.
  assert.strictEqual(gz(BaZi.dayPillarIndex(2000, 1, 1)), '戊午', '2000-01-01 day pillar');
  const A = Date.UTC(2000, 0, 1), Ai = 54;
  let mism = 0;
  for (let t = 0; t < 6000; t++) {
    const dt = new Date(Date.UTC(1950, 0, 1)); dt.setUTCDate(dt.getUTCDate() + t * 7);
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const indep = ((Ai + Math.round((Date.UTC(y, m - 1, d) - A) / 864e5)) % 60 + 60) % 60;
    if (indep !== BaZi.dayPillarIndex(y, m, d)) mism++;
  }
  assert.strictEqual(mism, 0, 'independent vs bazi day-pillar mismatches');

  // 3) Full engine end-to-end on a known chart (2000-01-01 = 己卯 丙子 戊午).
  const c = await buildChartFull({ date: '2000-01-01', time: '12:00', sex: 'M' });
  assert.strictEqual(c.pillars.year, '己卯', 'year pillar');
  assert.strictEqual(c.pillars.month, '丙子', 'month pillar');
  assert.strictEqual(c.pillars.day, '戊午', 'day pillar');
  assert.strictEqual(c.source, 'full-engine', 'used full engine');
  assert.ok(c.favorable && c.strength, 'has favorable + strength');

  // 4) Boundary handling — the cases that are easy to get wrong.
  const day = async (b) => (await buildChartFull(b)).pillars.day;
  const dir = async (b) => (await buildChartFull(b)).luck && (await buildChartFull(b)).luck.direction;

  // (a) 子刻 per the founder's 時柱干支 table: the DAY pillar stays current
  //     (00:00 boundary), and the 23:00-23:59 HOUR pillar takes the next day's
  //     子 stem (夜子時). 2000-06-15 is a 甲 day (甲辰).
  const hour = async (b) => (await buildChartFull(b)).pillars.hour;
  const noon = await day({ date: '2000-06-15', time: '12:00', sex: 'M', lon: null });
  assert.strictEqual(await day({ date: '2000-06-15', time: '23:59', sex: 'M', lon: null }), noon, '23:59 must stay on the current day (甲辰)');
  assert.strictEqual(await day({ date: '2000-06-15', time: '00:01', sex: 'M', lon: null }), noon, '00:01 is the current day');
  assert.strictEqual(await hour({ date: '2000-06-15', time: '00:30', sex: 'M', lon: null }), '甲子', '甲 day 00:30 → 甲子 (founder table)');
  assert.strictEqual(await hour({ date: '2000-06-15', time: '23:30', sex: 'M', lon: null }), '丙子', '甲 day 23:30 → 丙子, next-day 子 stem (founder table)');
  assert.strictEqual(await hour({ date: '2000-06-19', time: '23:30', sex: 'M', lon: null }), '甲子', '戊 day 23:30 → 甲子 (founder table)');

  // (b) true-solar-time correction that crosses midnight moves the DAY pillar
  //     east past 24:00 → next day; west past 00:00 → previous day
  assert.strictEqual(await day({ date: '2000-06-15', time: '23:50', sex: 'M', lon: 40, off: 0, dst: false }), '乙巳', 'east crossing → next day');
  assert.strictEqual(await day({ date: '2000-06-15', time: '00:20', sex: 'M', lon: -40, off: 0, dst: false }), '癸卯', 'west crossing → previous day');

  // (c) 大運 direction: 陽年 male 順行 / 女 逆行 ; 陰年 male 逆行 / 女 順行
  const b00 = { date: '2000-06-15', time: '12:00', lon: null }; // 庚辰 = 陽年
  const b01 = { date: '2001-06-15', time: '12:00', lon: null }; // 辛巳 = 陰年
  assert.strictEqual(await dir({ ...b00, sex: 'M' }), 'forward', 'yang-year male → 順行');
  assert.strictEqual(await dir({ ...b00, sex: 'F' }), 'reverse', 'yang-year female → 逆行');
  assert.strictEqual(await dir({ ...b01, sex: 'M' }), 'reverse', 'yin-year male → 逆行');
  assert.strictEqual(await dir({ ...b01, sex: 'F' }), 'forward', 'yin-year female → 順行');

  // (d) CROSS-PATH CONSISTENCY — the chart has two sources that MUST agree:
  //     the pillars come from baziCompute(...,'none'); the strength/用神/大運 are
  //     parsed from the engine's #result. A regression that corrects the time on
  //     only one path (e.g. the engine form re-correcting on top of geo.js — the
  //     double-correction bug) makes the hour they each see diverge. Assert the
  //     hour pillar shown in #result equals the one baziCompute returns.
  const crossCheck = async (b) => {
    const chart = await buildChartFull(b);
    const eff = chart._solar;
    const effDate = `${eff.y}-${String(eff.m).padStart(2, '0')}-${String(eff.d).padStart(2, '0')}`;
    const eng = await runEngine(effDate, chart.solarTime, b.sex);
    const shown = resultHourPillar(eng.text);
    assert.ok(shown, 'could parse #result hour pillar');
    assert.strictEqual(shown, chart.pillars.hour,
      `#result hour (${shown}) must equal baziCompute hour (${chart.pillars.hour}) — paths diverged`);
    return chart;
  };

  // (e) The exact boundary case the double-correction bug produced: a Tokyo
  //     22:28 birth. True solar time is ~22:48 = 亥刻 → hour pillar 乙亥. The bug
  //     double-corrected to 23:09 = 子刻 → 丙子 (and even flagged a false 空亡).
  //     crossCheck() also proves both code paths agree here.
  const tk = await crossCheck({ date: '1981-06-10', time: '22:28', sex: 'F', lon: 139.6917, off: 9, dst: false, place: 'Tokyo' });
  assert.strictEqual(tk.pillars.day, '己未', 'Tokyo 1981-06-10 day pillar 己未');
  assert.strictEqual(tk.pillars.hour, '乙亥', 'Tokyo 22:28 → 亥刻 乙亥 (single correction; guards against double)');
  // and a no-longitude control (raw clock time) must also stay path-consistent
  await crossCheck({ date: '2000-06-15', time: '23:30', sex: 'M', lon: null });

  await closeEngine();
  console.log('verify-engine: JDN ✓  day-pillar (external anchor + 6000-sample continuity) ✓  full engine pillars ✓');
  console.log('boundaries: 23:59=current-day ✓  solar midnight-crossing ✓  大運 順逆 by sex ✓');
  console.log('cross-path: #result hour == baziCompute hour ✓  Tokyo 22:28 → 乙亥 (double-correction guard) ✓');
})().catch(async (e) => { await closeEngine().catch(() => {}); console.error('verify-engine FAILED:', e.message); process.exit(1); });
