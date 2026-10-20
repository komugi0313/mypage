/* =============================================================================
   cycles.js — 大運 (10-year chapters) · 流年 (annual cycle) · special alignments
   -----------------------------------------------------------------------------
   Ports the founder's engine doctrine faithfully:
   - 大運: direction from sex × year-stem polarity (順行/逆行); start age (立運)
     ≈ days to the next/previous solar term ÷ 3 (engine's exact value wins when
     the bridge provides it); sequence steps from the month pillar.
   - 流年: sexagenary year pillar (1984 = 甲子), ten-god tone vs the Day Master.
   - Alignments: the engine's runBranchRels rule — a transit branch (chapter or
     year) completing ≥3 distinct branches of a 三合 or 方合 group with the
     natal branches → that element is greatly strengthened (開局).
     Annual transits are checked against natal + the active chapter branch
     (the engine's 「年運 × 命式・大運」), chapters against natal.
   - Clashes (冲) of the annual branch with the natal day/month branch are
     flagged: partnership/home and career/workplace shake-ups respectively.
   ============================================================================= */
(function (root) {
  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const SANGO = [[ '申','子','辰','Water'],['亥','卯','未','Wood'],['寅','午','戌','Fire'],['巳','酉','丑','Metal']];
  const HOUGOU = [['寅','卯','辰','Wood'],['巳','午','未','Fire'],['申','酉','戌','Metal'],['亥','子','丑','Water']];
  const CTRL = { Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood' };
  const ctrlOf = e => { for (const k in CTRL) if (CTRL[k] === e) return k; return null; };
  // approximate solar-term (節入り) month starts: [month, day], index 0 = 立春
  const TERMS = [[2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,8],[9,8],[10,8],[11,7],[12,7],[1,6]];

  const gz = i => STEMS[((i%10)+10)%10] + BR[((i%12)+12)%12];
  function gzIndex(pair){ for(let i=0;i<60;i++) if(gz(i)===pair) return i; return -1; }
  // 空亡 (day-pillar void branches): the two branches missing from the day's 旬.
  // These mark the person's 空亡/天中殺 years (and days) — a caution/consolidation period.
  function voidBranchesOf(dayGz){
    const di=gzIndex(dayGz); if(di<0) return [];
    const start=di-(((di%10)+10)%10);
    return [ BR[(((start+10)%12)+12)%12], BR[(((start+11)%12)+12)%12] ];
  }
  function tenGodOf(dmStem, stemIdx){
    return (root.DayFortune && root.DayFortune.tenGod)
      ? root.DayFortune.tenGod(STEMS.indexOf(dmStem), ((stemIdx%10)+10)%10) : null;
  }
  // tone by ten god — same mapping the engine bridge uses for seasons
  const TONE = { '比肩':'peak','劫財':'peak','食神':'support','傷官':'support','偏財':'support','正財':'support',
                 '偏官':'friction','正官':'friction','偏印':'consolidate','正印':'consolidate' };
  const TONE_EN = { peak:'high self-energy', support:'flow & opportunity', friction:'pressure — prove it', consolidate:'inward — build & learn' };

  // days between two dates (UTC, no DST wobble)
  const days = (a,b) => Math.round((Date.UTC(b[0],b[1]-1,b[2]) - Date.UTC(a[0],a[1]-1,a[2]))/86400000);
  // nearest term boundary after (dir=+1) or before (dir=-1) birth
  function termGap(y,m,d,dir){
    const cands=[];
    for(let yy=y-1; yy<=y+1; yy++) for(const [tm,td] of TERMS) cands.push([yy,tm,td]);
    let best=null;
    for(const c of cands){ const g=days([y,m,d],c); if(dir>0 ? g>0 : g<0){ const a=Math.abs(g); if(best===null||a<best) best=a; } }
    return best==null?15:best;
  }

  // build({y,m,d, sex:'M'|'F', dayMaster, pillars:{year,month,day}, favorable, luckStart?})
  function build(o){
    const yearStemIdx = STEMS.indexOf((o.pillars.year||'').charAt(0));
    if(yearStemIdx<0) return null;
    const yang = yearStemIdx % 2 === 0;
    const forward = (yang && o.sex!=='F') || (!yang && o.sex==='F');
    // 立運 — engine's exact value wins; else ≈ days-to-term ÷ 3 (3 days = 1 year)
    let startYears, startMonths;
    if(o.luckStart){ startYears=o.luckStart.years; startMonths=o.luckStart.months; }
    else { const g=termGap(o.y,o.m,o.d, forward?1:-1); startYears=Math.floor(g/3); startMonths=Math.round((g%3)*4); }
    const m0 = gzIndex(o.pillars.month||''); if(m0<0) return null;
    const firstYear = o.y + startYears + (startMonths>=6?1:0); // chapter years, rounded
    const pillars=[];
    for(let k=0;k<9;k++){
      const gi=(m0 + (forward? k+1 : -(k+1)) + 60) % 60;
      const startYear=firstYear+10*k;
      pillars.push({ ganzhi:gz(gi), stem:gi%10, branch:BR[gi%12], startYear, endYear:startYear+9,
        startAge:startYears+10*k, tenGod:tenGodOf(o.dayMaster,gi%10) });
    }
    const now=o.nowYear;
    const voidBr = voidBranchesOf(o.pillars.day||'');   // 空亡 branches for this chart
    pillars.forEach(p=>{ p.isVoid = voidBr.includes(p.branch); });   // 空亡 (天中殺) chapters
    const current = pillars.find(p=>now>=p.startYear && now<=p.endYear) || null;
    const next = pillars.find(p=>p.startYear>now) || null;
    const preLuck = now<firstYear;

    // 流年 horizon
    const natalBr=[o.pillars.year,o.pillars.month,o.pillars.day,o.pillars.hour].map(g=>g&&g.charAt(1)).filter(Boolean);
    const dayBr=(o.pillars.day||'').charAt(1), monthBr=(o.pillars.month||'').charAt(1);
    const years=[], alignments=[];
    const chapterFor = yr => pillars.find(p=>yr>=p.startYear && yr<=p.endYear) || null;

    // chapter-driven 開局: the chapter branch completes a group with natal (whole decade)
    for(const p of pillars){
      if(p.endYear<now || p.startYear>now+10) continue;
      for(const G of [...SANGO.map(g=>['三合',g]), ...HOUGOU.map(g=>['方合',g])]){
        const [kind,g]=G, set=g.slice(0,3);
        if(!set.includes(p.branch)) continue;
        const have=new Set(natalBr.filter(b=>set.includes(b))); have.add(p.branch);
        const natalOnly=new Set(natalBr.filter(b=>set.includes(b)));
        if(have.size>=3 && natalOnly.size<3)
          alignments.push({ year:Math.max(p.startYear,now), until:p.endYear, kind, el:g[3], via:'chapter',
            branches:set.join(''), cls: g[3]===o.favorable?'gold':(g[3]===ctrlOf(o.favorable)?'warn':'strong') });
      }
    }
    for(let yr=now; yr<=now+10; yr++){
      const gi=((yr-1984)%60+60)%60, ybr=BR[gi%12];
      const tg=tenGodOf(o.dayMaster,gi%10), tone=TONE[tg]||'transition';
      years.push({ year:yr, ganzhi:gz(gi), tenGod:tg, tone, toneEN:TONE_EN[tone]||'', isVoid: voidBr.includes(ybr) });   // 空亡 year (天中殺)
      const ch=chapterFor(yr), chBr=ch?ch.branch:null;
      const base=[...natalBr, ...(chBr?[chBr]:[])];               // 年運 × 命式・大運
      for(const G of [...SANGO.map(g=>['三合',g]), ...HOUGOU.map(g=>['方合',g])]){
        const [kind,g]=G, set=g.slice(0,3);
        if(!set.includes(ybr)) continue;
        const have=new Set(base.filter(b=>set.includes(b))); have.add(ybr);
        const baseOnly=new Set(base.filter(b=>set.includes(b)));
        if(have.size>=3 && baseOnly.size<3)
          alignments.push({ year:yr, kind, el:g[3], via:'annual', branches:set.join(''),
            cls: g[3]===o.favorable?'gold':(g[3]===ctrlOf(o.favorable)?'warn':'strong') });
      }
      // annual clashes to the two most personal palaces
      const clash = b => (BR.indexOf(ybr)+6)%12===BR.indexOf(b);
      if(dayBr && clash(dayBr))   alignments.push({ year:yr, kind:'冲', via:'annual', target:'day',   cls:'warn' });
      if(monthBr && clash(monthBr)) alignments.push({ year:yr, kind:'冲', via:'annual', target:'month', cls:'warn' });
    }
    alignments.sort((a,b)=>a.year-b.year);

    // ---- 節木運: the 30-year great-season handoff ----------------------------
    // Chapters run through the four directional seasons (寅卯辰 Wood-spring /
    // 巳午未 Fire-summer / 申酉戌 Metal-autumn / 亥子丑 Water-winter), 30 years
    // each. Where the chapter branch crosses from one season to the next is the
    // grafting luck (節木運): a climate change — the years around the handoff
    // are classically read as turbulent, restructuring years.
    const groupOf = b => { for(const g of HOUGOU) if(g.slice(0,3).includes(b)) return g[3]; return null; };
    const SEASON_NAME = { Wood:'Wood — spring', Fire:'Fire — summer', Metal:'Metal — autumn', Water:'Water — winter' };
    const seasonChanges=[];
    for(let k=1;k<pillars.length;k++){
      const a=groupOf(pillars[k-1].branch), b2=groupOf(pillars[k].branch);
      if(a&&b2&&a!==b2) seasonChanges.push({ year:pillars[k].startYear, age:pillars[k].startAge,
        from:a, to:b2, fromName:SEASON_NAME[a], toName:SEASON_NAME[b2] });
    }
    const currentSeason = current ? groupOf(current.branch) : null;
    const nextSeasonChange = seasonChanges.find(s=>s.year>now) || null;
    // surface a near-term handoff in the alignment list too (±2y window)
    if(nextSeasonChange && nextSeasonChange.year<=now+10)
      alignments.push({ year:nextSeasonChange.year, kind:'節木運', via:'chapter', cls:'season',
        from:nextSeasonChange.fromName, to:nextSeasonChange.toName });
    alignments.sort((a,b)=>a.year-b.year);

    // ---- 墓庫開冲: the four storehouses (辰戌丑未) that open on a 冲 -----------
    // 辰=Water vault, 戌=Fire vault, 丑=Metal vault, 未=Wood vault. The stored
    // element sits dormant; a 冲 (辰↔戌, 丑↔未) cracks the vault open and the
    // stored Ten-God force comes out. Key for a chart that LACKS an element on
    // the surface but has it stored — it surges when the vault opens.
    const STEM_EL = {甲:'Wood',乙:'Wood',丙:'Fire',丁:'Fire',戊:'Earth',己:'Earth',庚:'Metal',辛:'Metal',壬:'Water',癸:'Water'};
    const GEN = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
    const KURA_EL = { '辰':'Water','戌':'Fire','丑':'Metal','未':'Wood' };
    const KURA_CHONG = { '辰':'戌','戌':'辰','丑':'未','未':'丑' };
    const VAULT = { Power:{jp:'官庫',en:'Power / career vault',opens:'status, career and responsibility move — promotion, a new role, a step up in position'},
                    Wealth:{jp:'財庫',en:'Wealth vault',opens:'stored wealth turns usable — a payoff, assets or savings become spendable, a big deal closes'},
                    Resource:{jp:'印庫',en:'Resource vault',opens:'study, credentials, backing, documents or property move — knowledge and support take concrete form'},
                    Output:{jp:'食傷庫',en:'Talent / output vault',opens:'talent and self-expression burst out — work, craft or a body of output finally lands'},
                    Peer:{jp:'比劫庫',en:'Peer vault',opens:'allies, partnership and independence move — teaming up or a step toward going solo'} };
    const dmEl = STEM_EL[o.dayMaster];
    function tenGroup(el){
      if(!dmEl||!el) return null;
      if(el===dmEl) return 'Peer';
      if(GEN[dmEl]===el) return 'Output';
      if(CTRL[dmEl]===el) return 'Wealth';
      if(CTRL[el]===dmEl) return 'Power';
      if(GEN[el]===dmEl) return 'Resource';
      return null;
    }
    const storehouses=[];
    [o.pillars.year,o.pillars.month,o.pillars.day,o.pillars.hour].forEach((g,idx)=>{
      if(!g) return; const br=g.charAt(1); if(!KURA_EL[br]) return;
      const el=KURA_EL[br], grp=tenGroup(el); if(!grp) return;
      const partner=KURA_CHONG[br];
      const natalOpen=natalBr.filter(b=>b===partner).length>0;
      const curOpen=!!(current && current.branch===partner);
      const openYears=[];
      if(!natalOpen && !curOpen){
        years.forEach(y=>{ if(y.year>now && y.ganzhi.charAt(1)===partner) openYears.push({when:y.year, via:'annual', ganzhi:y.ganzhi}); });
        pillars.forEach(p=>{ if(p.startYear>now && p.branch===partner) openYears.push({when:p.startYear, via:'chapter', startAge:p.startAge, endYear:p.endYear, ganzhi:p.ganzhi}); });
        openYears.sort((a,b)=>a.when-b.when);
      }
      storehouses.push({ pillarLabel:['year','month','day','hour'][idx], branch:br, el, group:grp,
        vaultJP:VAULT[grp].jp, vaultEN:VAULT[grp].en, opensMeaning:VAULT[grp].opens,
        partner, natalOpen, curOpen, openYears:openYears.slice(0,3) });
    });

    // ---- 駅馬 (Travel / Relocation Star): movement, distance, going abroad -----
    // From the year branch and the day branch's 三合 trine, the travel star is the
    // 冲 of the trine's leading (生) branch: 申子辰→寅, 亥卯未→巳, 寅午戌→申, 巳酉丑→亥.
    // Present natally = a born mover. A transit year/chapter bringing it —
    // especially when it also clashes the day branch — is the strong move window.
    const YIMA = { '申':'寅','子':'寅','辰':'寅', '亥':'巳','卯':'巳','未':'巳',
                   '寅':'申','午':'申','戌':'申', '巳':'亥','酉':'亥','丑':'亥' };
    const yearBr2=(o.pillars.year||'').charAt(1), dayBr2=(o.pillars.day||'').charAt(1);
    const yimaSet=[...new Set([YIMA[yearBr2],YIMA[dayBr2]].filter(Boolean))];
    const natalYima=natalBr.filter(b=>yimaSet.includes(b));
    const yimaYears=[]; years.forEach(y=>{ if(y.year>=now && yimaSet.includes(y.ganzhi.charAt(1)))
      yimaYears.push({year:y.year, ganzhi:y.ganzhi, clashesDay:(BR.indexOf(y.ganzhi.charAt(1))+6)%12===BR.indexOf(dayBr2)}); });
    const yimaChapters=[]; pillars.forEach(p=>{ if(p.endYear>=now && yimaSet.includes(p.branch))
      yimaChapters.push({startYear:p.startYear, startAge:p.startAge, ganzhi:p.ganzhi}); });
    const travelStar={ branches:yimaSet, natal:natalYima, natalHas:natalYima.length>0,
      years:yimaYears.slice(0,4), chapters:yimaChapters.slice(0,3) };

    const natalHarmonies=[];
    for(const G of [...SANGO.map(g=>['三合',g]), ...HOUGOU.map(g=>['方合',g])]){
      const [kind,g]=G, set=g.slice(0,3);
      if(set.every(bb=>natalBr.includes(bb)))
        natalHarmonies.push({ kind, el:g[3], branches:set.join(''),
          cls: g[3]===o.favorable?'gold':(g[3]===ctrlOf(o.favorable)?'warn':'strong') });
    }
    return { forward, startYears, startMonths, approx:!o.luckStart, firstYear, preLuck,
             voidBranches: voidBr, currentYearVoid: !!(years[0] && years[0].isVoid),
             pillars, current, next, years, alignments, natalHarmonies,
             currentSeason, currentSeasonName:SEASON_NAME[currentSeason]||null,
             seasonChanges, nextSeasonChange, storehouses, travelStar };
  }

  const api={ build, SANGO, HOUGOU };
  if (typeof module!=='undefined' && module.exports) module.exports=api;
  root.Cycles=api;
})(typeof window !== 'undefined' ? window : globalThis);
