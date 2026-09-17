/* =============================================================================
   engine-full.js — compute the chart with the FOUNDER'S REAL ENGINE, server-side
   -----------------------------------------------------------------------------
   "絶対に間違えない" — instead of re-deriving month pillar / strength / 用神 with
   heuristics, we run the actual meishiban_pillars.html engine in a headless
   Chromium and read its exact output. Zero re-implementation: the numbers are
   byte-for-byte what the app shows the user.

   Flow (mirrors app.html computeChart()'s engine path exactly, so the email's
   chart === the app's chart):
     1. geo.js true-solar-time correction (validated, worldwide) → solar time +
        day shift.
     2. Load the engine once (singleton browser), fill the form with the
        SOLAR-CORRECTED date/time, run it, parse #result for the exact
        strength / day master / dominant ten god / luck pillars, and call the
        engine's own baziCompute() for the exact four pillars.
     3. Assemble the chart from those exact values. 用神 is derived from the
        engine's EXACT strength (strong→drain, weak→support) — the same method
        the app uses; balanced (中和) falls back to the bazi.js value, exactly
        like app.html.

   Correctness over availability: if the engine can't be run, buildChartFull
   THROWS — the caller must not store a heuristic chart. Charts are computed once
   at signup and cached, so the browser is never on the daily send path.
   ============================================================================= */
'use strict';
const path = require('path');
const CLARITY = path.resolve(__dirname, '..', '..');
const Geo = require(path.join(CLARITY, 'geo.js'));
const BaZi = require(path.join(CLARITY, 'bazi.js'));
const DayFortune = require(path.join(CLARITY, 'dayfortune.js'));
const Cycles = require(path.join(CLARITY, 'cycles.js'));
const { parseEngineResult } = require(path.join(CLARITY, 'bazi-bridge.js'));

const STEM_EL = { '甲': 'Wood', '乙': 'Wood', '丙': 'Fire', '丁': 'Fire', '戊': 'Earth', '己': 'Earth', '庚': 'Metal', '辛': 'Metal', '壬': 'Water', '癸': 'Water' };
const ENGINE_URL = 'file://' + path.join(CLARITY, 'meishiban_pillars.html');

let _browser = null, _page = null, _lock = Promise.resolve();

async function getPage() {
  if (_page) return _page;
  const { chromium } = require('playwright-core');
  const execPath = process.env.PLAYWRIGHT_CHROMIUM || undefined; // let PW resolve if unset
  _browser = await chromium.launch(execPath ? { executablePath: execPath } : {});
  _page = await _browser.newPage();
  await _page.goto(ENGINE_URL, { waitUntil: 'load' });
  await _page.waitForFunction(() => typeof window.baziCompute === 'function' && document.getElementById('f-go'), null, { timeout: 15000 });
  return _page;
}

async function closeEngine() { if (_browser) { await _browser.close(); _browser = _page = null; } }

function shiftYmd(y, m, d, shift) {
  if (!shift) return { y, m, d };
  const dt = new Date(Date.UTC(y, m - 1, d)); dt.setUTCDate(dt.getUTCDate() + shift);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// Drive the real engine for one birth (already solar-corrected). Serialized via
// _lock because the engine page holds a single shared form.
function runEngine(effDate, solarTime, sex) {
  const job = _lock.then(async () => {
    const page = await getPage();
    const hasTime = !!solarTime;
    const [yy, mm, dd] = effDate.split('-').map(Number);
    const [hh, mi] = hasTime ? solarTime.split(':').map(Number) : [12, 0];
    const res = await page.evaluate(async ({ effDate, solarTime, sex, yy, mm, dd, hh, mi, hasTime }) => {
      const q = (id) => document.getElementById(id);
      // 子刻 convention pinned to the founder's own 時柱干支 (五鼠遁) table:
      // the DAY pillar stays on the current day (verified 23:59 → same day),
      // but the 23:00–23:59 hour pillar takes the NEXT day's 子 stem (夜子時).
      // The engine calls this 'next'; 'today' would keep the current day's 子
      // stem and disagree with the founder's table (e.g. 甲日 23:30 → 丙子, not 甲子).
      const zs = q('f-zishi'); if (zs) zs.value = 'next';
      // CRITICAL: geo.js has ALREADY applied the one, validated true-solar-time
      // correction (worldwide). The engine form ALSO self-corrects by default
      // (f-corr='full' with f-pref defaulting to a prefecture longitude), which
      // would DOUBLE-correct the time — enough to flip the hour pillar (and, near
      // midnight / a solar-term boundary, the day or month pillar) and thus the
      // strength / 用神 / 大運 read from #result. Force the form to use the time
      // exactly as given so correction happens once, in geo.js, and #result stays
      // consistent with baziCompute(..., 'none') below.
      const fc = q('f-corr'); if (fc) fc.value = 'none';
      const fp = q('f-pref'); if (fp) fp.value = '';
      q('f-date').value = effDate;
      if (hasTime) { q('f-time').value = solarTime; if (q('f-notime')) q('f-notime').checked = false; }
      else if (q('f-notime')) q('f-notime').checked = true;
      const seg = q('f-sex');
      const btn = seg && seg.querySelector('button[data-v="' + (sex === 'F' ? 'female' : 'male') + '"]');
      if (btn) btn.click();
      const result = q('result'); result.innerHTML = '';
      q('f-go').click();
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      // Wait until the result has rendered AND STOPPED GROWING — "length > 500"
      // alone can catch the engine mid-render and parse an intermediate
      // strength (e.g. 中和) instead of the final value. Two consecutive polls
      // at the same length mark completion.
      let prevLen = -1, stable = 0;
      for (let i = 0; i < 60; i++) {
        await sleep(150);
        const len = (result.innerText || '').length;
        if (len > 500 && len === prevLen) { if (++stable >= 2) break; }
        else stable = 0;
        prevLen = len;
      }
      // exact four pillars straight from the engine's own compute (correction OFF —
      // geo.js already corrected the time, exactly like app.html)
      let pillars = null;
      try {
        const cc = window.baziCompute({ year: yy, month: mm, day: dd, hour: hh, minute: mi, sex: (sex === 'F' ? 'female' : 'male') }, '', 'none');
        if (cc && cc.pillars && cc.pillars[2]) pillars = {
          year: cc.pillars[0].ganzhi, month: cc.pillars[1].ganzhi,
          day: cc.pillars[2].ganzhi, hour: (hasTime && cc.pillars[3]) ? cc.pillars[3].ganzhi : null
        };
      } catch (e) { /* fall through */ }
      return { text: (result.innerText || ''), pillars };
    }, { effDate, solarTime, sex, yy, mm, dd, hh, mi, hasTime });
    if (!res.text || res.text.length < 500 || !res.pillars) throw new Error('engine produced no usable result');
    // With f-corr='none' the engine never prints a 真太陽時 line. Its presence
    // means the engine's init restored saved form state over our f-corr/f-pref
    // and re-corrected the already-corrected time (double correction) — reject
    // rather than parse a wrong strength/用神. The caller retries once.
    if (/真太陽時/.test(res.text)) throw new Error('engine self-corrected (form state raced our settings)');
    return res;
  });
  // keep the lock chain alive regardless of this job's outcome
  _lock = job.then(() => {}, () => {});
  return job;
}

/**
 * Full-accuracy chart. THROWS if the engine can't be run (never returns a
 * heuristic chart). `birth`: {date,time?,sex,lon?,off?,dst?,place?}
 */
async function buildChartFull(birth) {
  const [y0, m0, d0] = birth.date.split('-').map(Number);
  let solarTime = birth.time || null, solarDelta = null, dayShift = 0;
  if (birth.time && birth.lon != null) {
    const c = Geo.correct(birth.date, birth.time, birth.lon, birth.off, birth.dst);
    if (c) { solarTime = c.time; solarDelta = c.deltaMin; dayShift = c.dayShift || 0; }
  }
  const eff = shiftYmd(y0, m0, d0, dayShift), y = eff.y, m = eff.m, d = eff.d;
  const effDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // run the engine; on a dead/broken browser, relaunch once before giving up.
  let eng;
  try { eng = await runEngine(effDate, solarTime, birth.sex); }
  catch (e) { await closeEngine().catch(() => {}); eng = await runEngine(effDate, solarTime, birth.sex); }
  const parsed = parseEngineResult(eng.text) || {};
  const pillars = eng.pillars;

  const dayStem = pillars.day.charAt(0);
  const dmEl = STEM_EL[dayStem];
  // 用神: from the engine's EXACT strength; balanced → bazi.js value (as app.html does)
  let favorable = parsed.favorable;
  if (!favorable) favorable = BaZi.compute(y, m, d, solarTime ? Number(solarTime.split(':')[0]) : null).favorable;

  const chart = {
    dayMaster: dayStem, dayMasterElement: dmEl,
    favorable, strength: parsed.strength || null,
    branches: [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).map(g => g[1]),
    chartStems: [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).map(g => g[0]),
    voidBranches: DayFortune.voidBranches(BaZi.dayPillarIndex(y, m, d)),
    pillars, sex: birth.sex,
    tenGod: parsed.tenGod || null,
    luck: parsed.luckStart || null,   // {years,months,direction:'forward'|'reverse'} — 立運 & 順逆
    currentDaun: parsed.currentDaun || null, currentYear: parsed.currentYear || null,
    season: parsed.season || BaZi.seasonForYear(BaZi.compute(y, m, d, null), new Date().getFullYear()),
    place: birth.place || '', solarDelta, solarTime,
    source: 'full-engine', _solar: { y, m, d }
  };
  try {
    chart.cycles = Cycles.build({
      y, m, d, sex: birth.sex, dayMaster: chart.dayMaster, pillars: chart.pillars,
      favorable: chart.favorable, luckStart: parsed.luckStart || null, nowYear: new Date().getFullYear()
    });
  } catch (_) { chart.cycles = null; }
  return chart;
}

module.exports = { buildChartFull, runEngine, closeEngine };
