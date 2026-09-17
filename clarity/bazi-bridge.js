/* =============================================================================
   bazi-bridge.js — reuse the founder's proven engine for the hard fields
   -----------------------------------------------------------------------------
   The founder's engine (meishiban_pillars.html, built on the tyme calendar
   library) already computes strength (身強/身弱), the dominant Ten God
   (月支元命), and the Luck Pillars (大運) correctly — that logic is the
   founder's IP. Rather than re-derive it with heuristics, we PARSE the engine's
   rendered result and hand those exact values to Numinous.

   Two parts:
   - parseEngineResult(text): pull exact fields out of the engine's #result text.
   - readChartFromEngine(iframe, birth): drive a hidden copy of the engine and
     return a chart. On a hosted (same-origin) deployment this gives full
     accuracy; if the engine can't be read (e.g. file:// sandbox), the caller
     falls back to bazi.js heuristics.
   ============================================================================= */
(function (root) {
  const STEM_EL = { '甲':'Wood','乙':'Wood','丙':'Fire','丁':'Fire','戊':'Earth','己':'Earth','庚':'Metal','辛':'Metal','壬':'Water','癸':'Water' };
  const GEN = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
  const genOf = e => Object.keys(GEN).find(k => GEN[k] === e);
  // engine's Ten God label → Numinous lexicon key (印綬 == 正印)
  const TENGOD_MAP = { '比肩':'比肩','劫財':'劫財','食神':'食神','傷官':'傷官','偏財':'偏財','正財':'正財','偏官':'偏官','正官':'正官','偏印':'偏印','印綬':'正印','正印':'正印' };

  function parseEngineResult(text) {
    if (!text) return null;
    const out = { source: 'engine' };
    // iOS WebKit serializes the engine's VERTICAL (縦) layout one character per
    // line, splitting compound words ("日主" → "日\n主") so plain matching
    // fails. Every match below therefore also tries `flat` — the same text with
    // all whitespace removed. (Patterns using \s* match flat text unchanged.)
    const flat = text.replace(/\s+/g, '');
    const M = re => text.match(re) || flat.match(re);

    // strength 身強 / 身弱 / 中和(balanced)
    let m;
    if (/中和のあなた|中和に近い/.test(text) || /中和のあなた|中和に近い/.test(flat)) out.strength = 'balanced';
    else if ((m = M(/日主の強弱は\s*(身強|身弱)/) || M(/(身強|身弱)のあなた/)))
      out.strength = (m[1] === '身強' ? 'strong' : 'weak');
    else out.strength = null;

    // Day Master stem  ("日主 己(土)" / "日主 戊（土）")
    m = M(/日主[\s　]*([甲乙丙丁戊己庚辛壬癸])/);
    out.dayMaster = m ? m[1] : null;
    out.dayMasterElement = out.dayMaster ? STEM_EL[out.dayMaster] : null;

    // dominant Ten God (月支元命): "あなたの中心の星：偏印"
    m = M(/中心の星[：:]?\s*(比肩|劫財|食神|傷官|偏財|正財|偏官|正官|偏印|印綬|正印)/);
    out.tenGod = m ? (TENGOD_MAP[m[1]] || m[1]) : null;

    // luck-pillar direction & start ("立運 1歳11カ月・逆行")
    m = M(/立運\s*([0-9]+)歳([0-9]+)カ月[・･]?\s*(順行|逆行)/);
    out.luckStart = m ? { years:+m[1], months:+m[2], direction:(m[3]==='順行'?'forward':'reverse') } : null;

    const TENGOD = '比肩|劫財|食神|傷官|偏財|正財|偏官|正官|偏印|印綬';
    // current Luck Pillar (大運): "大運 31〜41歳（2020〜2029年）：乙卯 → 干偏官・支偏官"
    m = M(new RegExp('大運[^：:]*[：:]?\\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\\s*→?\\s*干('+TENGOD+')'));
    out.currentDaun = m ? { ganzhi:m[1], tenGod:TENGOD_MAP[m[2]]||m[2] } : null;
    // current Year (流年): "年運：2026 丙午 → 干印綬・支偏印"
    m = M(new RegExp('年運[：:]?\\s*([0-9]{4})\\s*([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])\\s*→?\\s*干('+TENGOD+')'));
    out.currentYear = m ? { year:+m[1], ganzhi:m[2], tenGod:TENGOD_MAP[m[3]]||m[3] } : null;

    // Season, grounded in the engine's real 大運×流年 — map the current-year Ten God:
    //  比劫→peak (self-energy) · 財/食傷→support (flow, opportunity) ·
    //  官殺→friction (pressure) · 印→consolidate (inward, learning, 守り)
    const SEASON_BY_TENGOD = {
      '比肩':'peak','劫財':'peak','偏財':'support','正財':'support','食神':'support','傷官':'support',
      '偏官':'friction','正官':'friction','偏印':'consolidate','正印':'consolidate','印綬':'consolidate'
    };
    out.season = out.currentYear ? (SEASON_BY_TENGOD[out.currentYear.tenGod] || 'transition') : null;

    // favorable element (用神): derive from the engine's EXACT strength + day master.
    // strong self → drain it (output = element the DM generates);
    // weak self  → support it (resource = element that generates the DM).
    if (out.strength === 'strong' && out.dayMasterElement) out.favorable = GEN[out.dayMasterElement];
    else if (out.strength === 'weak' && out.dayMasterElement) out.favorable = genOf(out.dayMasterElement);
    else out.favorable = null; // balanced (中和) needs season logic — leave for manual/season

    out.ok = !!(out.strength && out.dayMaster && out.tenGod);
    return out;
  }

  // Drive a hidden engine iframe and read a chart. Resolves to a chart object
  // or null if the engine can't be reached/read.
  async function readChartFromEngine(iframe, birth /* {date, time|null, sex} */) {
    try {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      // The engine page is heavy and parses in chunks on slow phones: the f-go
      // BUTTON can exist in the DOM long before the engine's init script has
      // wired it up (f-go.onclick = compute is one of init's last lines).
      // Clicking during that window does nothing — the exact iPhone failure.
      // So wait for the HANDLER, not the element (up to ~30s).
      let doc = null, tries = 0, ready = false;
      while (tries++ < 100) {
        doc = iframe.contentDocument;
        const go = doc && doc.getElementById('f-go');
        if (go && typeof go.onclick === 'function') { ready = true; break; }
        await sleep(300);
      }
      if (!ready) return null;
      const q = s => doc.getElementById(s);
      // On slow devices the engine's own init can still be running here and
      // will restore its SAVED form state over anything we write (the race the
      // 真太陽時 reject below defends against). Instead of writing once and
      // hoping, write our required settings repeatedly until they SURVIVE a
      // wait — that proves init is done and our values are the ones in force.
      for (let k = 0; k < 12; k++) {
        if (q('f-zishi')) q('f-zishi').value = 'next';
        if (q('f-corr'))  q('f-corr').value  = 'none';
        if (q('f-pref'))  q('f-pref').value  = '';
        await sleep(400);
        const held = (!q('f-corr') || q('f-corr').value === 'none') &&
                     (!q('f-pref') || q('f-pref').value === '') &&
                     (!q('f-zishi') || q('f-zishi').value === 'next');
        if (held && k >= 1) break;
      }
      // Pin the 子刻 convention to the founder's 時柱干支 table: 23:00-23:59 takes
      // the NEXT day's 子 stem (夜子時), while the day pillar stays on the current
      // day. zishiFix() and baziCompute() below both read this. Without it the
      // engine's default ('today') disagrees with the table for 23:00-hour births.
      if (q('f-zishi')) q('f-zishi').value = 'next';
      // CRITICAL: the caller (app.html computeChart) has ALREADY applied the one
      // validated true-solar-time correction via geo.js — birth.time arrives
      // solar-corrected. The engine form ALSO self-corrects by default
      // (f-corr='full' + f-pref pre-set to a prefecture longitude), which would
      // correct TWICE — enough to flip the hour pillar (and near midnight or a
      // solar-term boundary, the day/month pillar) and skew the strength/用神
      // parsed from #result. Force the form to take the time exactly as given.
      if (q('f-corr')) q('f-corr').value = 'none';
      if (q('f-pref')) q('f-pref').value = '';
      if (q('f-date')) q('f-date').value = birth.date;
      if (birth.time && q('f-time')) { q('f-time').value = birth.time; if (q('f-notime')) q('f-notime').checked = false; }
      else if (q('f-notime')) q('f-notime').checked = true;
      // f-sex is a button segment (data-v="female"/"male") — direction of 大運 depends on it
      const sex = q('f-sex');
      if (sex) {
        const btn = sex.querySelector && sex.querySelector('button[data-v="' + (birth.sex === 'F' ? 'female' : 'male') + '"]');
        if (btn) btn.click();
        else if (sex.options && sex.options.length) sex.selectedIndex = 0;
      }
      // CRITICAL: the saved engine HTML ships with a baked-in previous result.
      // Clear it first, so we can only ever parse the result of OUR click.
      const res = q('result'); if (!res) return null;
      res.innerHTML = '';
      q('f-go').click();
      // Poll until the result has re-rendered AND STOPPED GROWING (up to ~15s).
      // "length > 500" alone is a race: the engine renders the result
      // progressively, and parsing a half-rendered page can read an
      // intermediate strength (e.g. 中和) instead of the final one. Only a
      // length that holds steady across two consecutive polls is complete.
      let prevLen = -1, stable = 0;
      for (let i = 0; i < 50; i++) {
        await sleep(300);
        const len = (res.innerText || '').length;
        if (len > 500 && len === prevLen) { if (++stable >= 2) break; }
        else stable = 0;
        prevLen = len;
      }
      if (!res.innerText || res.innerText.length < 500 || stable < 2) return null;
      // With f-corr='none' the engine never prints a 真太陽時 line. If one is
      // present, the engine's own init restored its saved form state OVER our
      // f-corr/f-pref (a load-order race) and self-corrected the already
      // geo-corrected time — a double correction. Reject; the caller retries.
      if (/真太陽時/.test(res.innerText)) return null;
      const out = parseEngineResult(res.innerText) || { source: 'engine' };
      // Exact 4 pillars straight from the engine's own baziCompute (accurate 立春/節入り
      // boundaries — avoids bazi.js's approximate month/year pillar). Same-origin only.
      try {
        const w = iframe.contentWindow;
        if (w && typeof w.baziCompute === 'function') {
          const [yy, mm, dd] = String(birth.date).split('-').map(Number);
          const hasT = !!birth.time;
          const [hh, mi] = hasT ? String(birth.time).split(':').map(Number) : [12, 0];
          const cc = w.baziCompute({ year: yy, month: mm, day: dd, hour: hh, minute: mi, sex: (birth.sex === 'F' ? 'female' : 'male') }, '', 'none');
          if (cc && cc.pillars && cc.pillars[2]) {
            out.pillars = {
              year:  cc.pillars[0].ganzhi,
              month: cc.pillars[1].ganzhi,
              day:   cc.pillars[2].ganzhi,
              hour:  (hasT && cc.pillars[3]) ? cc.pillars[3].ganzhi : null
            };
          }
        }
      } catch (e) { /* keep text-parsed fields; caller falls back to bazi.js pillars */ }
      // Last-resort day-master recovery: pillars come from baziCompute directly
      // (pure JS, immune to layout/serialization quirks) — if the TEXT parse
      // missed the day stem, take it from the computed day pillar and finish
      // the favorable-element derivation the same way as above.
      if (!out.dayMaster && out.pillars && out.pillars.day) {
        out.dayMaster = out.pillars.day.charAt(0);
        out.dayMasterElement = STEM_EL[out.dayMaster] || null;
        if (out.strength === 'strong' && out.dayMasterElement) out.favorable = GEN[out.dayMasterElement];
        else if (out.strength === 'weak' && out.dayMasterElement) out.favorable = genOf(out.dayMasterElement);
        out.ok = !!(out.strength && out.dayMaster && out.tenGod);
      }
      return out;
    } catch (e) { return null; }
  }

  const api = { parseEngineResult, readChartFromEngine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BaZiBridge = api;
})(typeof window !== 'undefined' ? window : globalThis);
