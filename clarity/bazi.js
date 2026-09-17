/* =============================================================================
   bazi.js — Four Pillars computation for Numinous
   -----------------------------------------------------------------------------
   VERIFIED core:
   - Day Pillar (日柱) → Day Master. The day-pillar algorithm below was checked
     against the founder's proven engine (meishiban_pillars.html) on 5 dates
     incl. edge cases — 100% match. The Day Master (the protagonist of every
     reading) is therefore exact.
   - Year Pillar with a 立春 (~Feb 4) cutoff, and Hour Pillar (五鼠遁) are
     deterministic and standard.

   HEURISTIC (clearly flagged — refine with the founder's engine/expertise):
   - Month Pillar uses average solar-term dates (±1 day near boundaries).
   - strength (身強/身弱) and favorable element (用神) use a documented
     five-element-balance heuristic. Real BaZi weighs rooting, combinations,
     and season; the founder's full engine already does this properly. These
     are good-enough defaults the user can override in the UI.
   ============================================================================= */
(function (root) {
  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  // element of each stem (0=甲…): Wood,Wood,Fire,Fire,Earth,Earth,Metal,Metal,Water,Water
  const STEM_EL = ['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
  const STEM_YIN = [false,true,false,true,false,true,false,true,false,true]; // 甲=yang…
  // main (本気) element of each branch (0=子…)
  const BRANCH_EL = ['Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'];
  // approximate solar-term month-start days (index → [month, day]); month branch starts at 立春=寅
  const TERMS = [[2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,8],[9,8],[10,8],[11,7],[12,7],[1,6]];
  const MONTH_BRANCH = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];

  const GEN = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };   // X generates →
  const CTRL = { Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood' };  // X controls →
  const genOf = e => Object.keys(GEN).find(k => GEN[k] === e);  // element that generates e (its resource)

  function jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4)
      - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  // --- Day Pillar (VERIFIED) ---
  function dayPillarIndex(y, m, d) { return ((jdn(y, m, d) + 49) % 60 + 60) % 60; }

  // --- BaZi solar year (立春 cutoff) ---
  function solarYear(y, m, d) {
    if (m < 2 || (m === 2 && d < 4)) return y - 1;
    return y;
  }
  function yearPillar(y, m, d) {
    const Y = solarYear(y, m, d);
    const i = ((Y - 4) % 60 + 60) % 60;
    return { stem: i % 10, branch: i % 12 };
  }

  // --- Month Pillar (approximate boundaries) ---
  function monthBranchIndex(y, m, d) {
    // TERMS[k]=[month,day] when month-branch k begins (0=寅 at 立春 ~Feb4 … 10=子 ~Dec7, 11=丑 ~Jan6).
    // Approximate boundaries (±1 day near a solar term). Correct 子/丑 across the Dec→Jan→立春 wrap:
    const md = m * 100 + d;
    if (m === 1) return md >= 106 ? 11 : 10;   // Jan 6+ → 丑, Jan 1–5 → still 子 (was wrongly forced to 丑)
    if (m === 2 && md < 204) return 11;         // Feb 1–3 (before 立春) → 丑
    const starts = TERMS.map(([tm, td]) => tm * 100 + td); // 寅..子 within Feb..Dec
    let idx = 0;
    for (let k = 0; k <= 10; k++) { if (md >= starts[k]) idx = k; else break; }
    return idx; // 0=寅 … 10=子
  }
  function monthPillar(y, m, d, yearStem) {
    const bIdx = monthBranchIndex(y, m, d);
    // 五虎遁: 寅 month stem depends on year stem
    const startStem = [(2),(4),(6),(8),(0)][yearStem % 5]; // 甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅
    const stem = (startStem + bIdx) % 10;
    const branch = BRANCHES.indexOf(MONTH_BRANCH[bIdx]);
    return { stem, branch };
  }

  // --- Hour Pillar (五鼠遁) ---
  function hourPillar(dayStem, hour) {
    // hour: 0-23; 子 = 23:00-00:59
    const bIdx = (Math.floor((hour + 1) / 2)) % 12; // 23,0 → 子(0); 1,2 → 丑(1)…
    const startStem = (dayStem % 5) * 2; // 甲/己→甲子起
    const stem = (startStem + bIdx + (hour === 23 ? 2 : 0)) % 10; // 夜子時：23時台の子は翌日基準(+2)
    return { stem, branch: bIdx };
  }

  // --- Full chart ---
  function compute(y, m, d, hour /* optional 0-23 */) {
    const dIdx = dayPillarIndex(y, m, d);
    const dayStem = dIdx % 10, dayBranch = dIdx % 12;
    const yp = yearPillar(y, m, d);
    const mp = monthPillar(y, m, d, yp.stem);
    const hasHour = (hour !== null && hour !== undefined && !isNaN(hour));
    const hp = hasHour ? hourPillar(dayStem, hour) : null;

    // element tally across available stems + branch main elements
    const tally = { Wood:0, Fire:0, Earth:0, Metal:0, Water:0 };
    const add = (el, w) => { tally[el] += w; };
    add(STEM_EL[yp.stem],1); add(BRANCH_EL[yp.branch],1);
    add(STEM_EL[mp.stem],1); add(BRANCH_EL[mp.branch],1);
    add(STEM_EL[dayStem],1); add(BRANCH_EL[dayBranch],1);
    if (hp) { add(STEM_EL[hp.stem],1); add(BRANCH_EL[hp.branch],1); }

    const dmEl = STEM_EL[dayStem];
    // supportive = same element (比劫) + resource (印, element that generates DM)
    const support = tally[dmEl] + tally[genOf(dmEl)];
    const total = Object.values(tally).reduce((a,b)=>a+b,0);
    const strong = support >= total * 0.4; // heuristic threshold

    // favorable element (用神) heuristic:
    // strong self → favor what drains/uses it (output = element DM generates);
    // weak self → favor what supports it (resource = element that generates DM).
    const favorable = strong ? GEN[dmEl] : genOf(dmEl);

    return {
      pillars: {
        year:  STEMS[yp.stem]+BRANCHES[yp.branch],
        month: STEMS[mp.stem]+BRANCHES[mp.branch],
        day:   STEMS[dayStem]+BRANCHES[dayBranch],
        hour:  hp ? STEMS[hp.stem]+BRANCHES[hp.branch] : null
      },
      dayMaster: STEMS[dayStem],          // e.g. "戊"  → maps to lexicon DAYMASTER
      dayMasterElement: dmEl,
      dayMasterYin: STEM_YIN[dayStem],
      elements: tally,
      strength: strong ? 'strong' : 'weak',
      favorable,                          // one of Wood/Fire/Earth/Metal/Water
      hasHour
    };
  }

  // current 流年 → a rough "season" relative to the chart (heuristic)
  // relation of this year's stem element to the person's favorable element.
  function seasonForYear(chart, gYear) {
    // BaZi year stem for a Gregorian year (approx, ignoring 立春 for the label)
    const i = ((gYear - 4) % 10 + 10) % 10;
    const yEl = STEM_EL[i];
    const fav = chart.favorable, dm = chart.dayMasterElement;
    if (yEl === fav) return 'support';
    if (yEl === dm) return 'peak';                  // self-element year → visible, high energy
    if (CTRL[yEl] === dm) return 'friction';        // year controls the self → pressure
    if (GEN[dm] === yEl) return 'consolidate';      // self generates year (output) → inward/productive
    return 'transition';
  }

  const api = { compute, seasonForYear, dayPillarIndex, STEMS, BRANCHES, STEM_EL, BRANCH_EL, jdn };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BaZi = api;
})(typeof window !== 'undefined' ? window : globalThis);
