/* =============================================================================
   engine.js — run the founder's Four Pillars logic on the server
   -----------------------------------------------------------------------------
   The whole point of the free "morning letter": each note is computed from the
   SUBSCRIBER'S OWN chart with the SAME engine the app uses in the browser
   (bazi.js / dayfortune.js / cycles.js / geo.js). Those files already export a
   Node-friendly `api` (module.exports), so we load them as-is — no fork, no
   re-derivation. The founder edits one set of files; the app and the letters
   both follow.

   Two jobs:
     buildChart(birth)          → compute a chart ONCE (at signup) and store it.
     todaysReading(chart, date) → cheap per-day almanac (run every morning).

   buildChart mirrors app.html computeChart()'s ENGINE-FALLBACK path (bazi.js
   heuristics). The browser also has a higher-accuracy bridge that drives the
   full engine (meishiban_pillars.html); to match that server-side later, render
   it once per signup with Playwright and pass {favorable, strength} in as
   `engineOverride`. Everything downstream stays identical.
   ============================================================================= */
'use strict';
const path = require('path');
const CLARITY = path.resolve(__dirname, '..', '..'); // clarity/

// Loading each module also populates globalThis.{Geo,BaZi,DayFortune,Cycles}
// (they close over `root = globalThis` in Node), so cross-references resolve.
const Geo        = require(path.join(CLARITY, 'geo.js'));
const BaZi       = require(path.join(CLARITY, 'bazi.js'));
const DayFortune = require(path.join(CLARITY, 'dayfortune.js'));
const Cycles     = require(path.join(CLARITY, 'cycles.js'));

function shiftYmd(y, m, d, shift) {
  if (!shift) return { y, m, d };
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + shift);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/**
 * Compute a subscriber's chart. Call once at signup; persist the return value.
 * @param {{date:string,time?:string,sex:string,lon?:number,off?:number,dst?:boolean,place?:string}} birth
 * @param {{favorable?:string,strength?:string}} [engineOverride] exact values from the full engine
 */
function buildChart(birth, engineOverride = null) {
  const [y0, m0, d0] = birth.date.split('-').map(Number);
  let solarTime = birth.time || null, solarDelta = null, dayShift = 0;
  if (birth.time && birth.lon != null) {
    const c = Geo.correct(birth.date, birth.time, birth.lon, birth.off, birth.dst);
    if (c) { solarTime = c.time; solarDelta = c.deltaMin; dayShift = c.dayShift || 0; }
  }
  const eff = shiftYmd(y0, m0, d0, dayShift), y = eff.y, m = eff.m, d = eff.d;
  const hour = solarTime ? Number(solarTime.split(':')[0]) : null;
  const local = BaZi.compute(y, m, d, hour);

  const favorable = (engineOverride && engineOverride.favorable) || local.favorable;
  const strength  = (engineOverride && engineOverride.strength)  || local.strength;
  const pillars = local.pillars;

  const chart = {
    dayMaster: local.dayMaster,
    dayMasterElement: local.dayMasterElement,
    favorable, strength,
    branches:   [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).map(g => g[1]),
    chartStems: [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).map(g => g[0]),
    voidBranches: DayFortune.voidBranches(BaZi.dayPillarIndex(y, m, d)),
    pillars, sex: birth.sex,
    season: BaZi.seasonForYear(local, new Date().getFullYear()),
    place: birth.place || '', solarDelta, solarTime,
    // the exact solar day the pillars were read from — reused for daily lookups
    _solar: { y, m, d }
  };
  try {
    chart.cycles = Cycles.build({
      y, m, d, sex: birth.sex, dayMaster: chart.dayMaster, pillars: chart.pillars,
      favorable: chart.favorable, luckStart: null, nowYear: new Date().getFullYear()
    });
  } catch (_) { chart.cycles = null; }
  return chart;
}

/**
 * The day's almanac for this chart. Pure/cheap — safe to call for every
 * subscriber every morning. `date` is a JS Date in the subscriber's local day.
 */
function todaysReading(chart, date = new Date()) {
  return DayFortune.dayFortune(chart, date.getFullYear(), date.getMonth() + 1, date.getDate());
}

module.exports = { buildChart, todaysReading, Geo, BaZi, DayFortune, Cycles };
