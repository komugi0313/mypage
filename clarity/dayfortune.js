/* =============================================================================
   dayfortune.js — per-day almanac from the chart  (3-layer model)
   -----------------------------------------------------------------------------
   Modeled on the founder's proven 1.66 delivery system, adapted for the
   business + life-companion app. Three independent layers:

   ① RANK symbol (score)     — how the day scores overall → 7 tiers
   ② THEME icons (condition) — what kind of day it is; several can light at once
        · ten-god of the day (仕事/金運/対人/学び/発信)
        · 桃花 (peach-blossom → presence/charisma)
        · 干合 / 支合 (a "connection / 縁" flows)
        · 天乙貴人 (nobleman → people help you)
        · 日支と沖 (head-on clash → wobble / caution)
   ③ COLOR & how-to-spend    — the day's element vs your 喜神/忌神
   ============================================================================= */
(function (root) {
  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const STEM_EL = ['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
  const STEM_YIN = [false,true,false,true,false,true,false,true,false,true];
  const GEN = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
  const CTRL = { Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood' };

  function tenGod(dmIdx, oIdx) {
    const de = STEM_EL[dmIdx], oe = STEM_EL[oIdx], same = STEM_YIN[dmIdx] === STEM_YIN[oIdx];
    if (oe === de) return same ? '比肩' : '劫財';
    if (GEN[de] === oe) return same ? '食神' : '傷官';
    if (CTRL[de] === oe) return same ? '偏財' : '正財';
    if (CTRL[oe] === de) return same ? '偏官' : '正官';
    return same ? '偏印' : '正印';
  }

  const LIU_HE = {0:1,1:0,2:11,11:2,3:10,10:3,4:9,9:4,5:8,8:5,6:7,7:6};   // 六合(支合)
  const SAN_HE = [[8,0,4],[11,3,7],[2,6,10],[5,9,1]];                      // 三合
  const SAN_HE_EL = ['Water','Wood','Fire','Metal'];
  const NOBLE = { '甲':[1,7],'戊':[1,7],'庚':[1,7],'乙':[0,8],'己':[0,8],'丙':[11,9],'丁':[11,9],'壬':[3,5],'癸':[3,5],'辛':[2,6] };
  const GAN_HE = { 0:5,5:0, 1:6,6:1, 2:7,7:2, 3:8,8:3, 4:9,9:4 };          // 干合
  // 桃花: from the person's day branch group → the peach branch
  function peachOf(dayBranchIdx) {
    for (let gi = 0; gi < SAN_HE.length; gi++) if (SAN_HE[gi].includes(dayBranchIdx)) {
      return [9,0,3,6][gi]; // 申子辰→酉 / 亥卯未→子 / 寅午戌→卯 / 巳酉丑→午
    }
    return -1;
  }

  const TENGOD_ICON = {
    '正官':'work','偏官':'work','偏財':'money','正財':'money','比肩':'people','劫財':'people',
    '偏印':'learn','正印':'learn','食神':'create','傷官':'create'
  };
  // Business-first theme icons (life topics folded into the same set)
  const ICONS = {
    work:   {emoji:'💼', jp:'決断・信頼', en:'Decision day'},      // 正官/偏官
    money:  {emoji:'💰', jp:'商談・金運', en:'Deals / close'},      // 財
    people: {emoji:'🤝', jp:'対人・採用', en:'People / hire'},      // 比劫
    learn:  {emoji:'🧠', jp:'戦略・充電', en:'Deep work / recharge'},// 印
    create: {emoji:'🚀', jp:'発信・仕掛け',en:'Launch / pitch'},     // 食傷
    tenchi: {emoji:'💎', jp:'天地徳合', en:'Grand harmony'},
    presence:{emoji:'🌺',jp:'存在感（桃花）',en:'Presence / influence'},
    connect:{emoji:'🔗', jp:'ご縁（合）', en:'Rapport / key intros'},
    noble:  {emoji:'🍀', jp:'貴人',       en:'Allies / mentors'},
    bunsho: {emoji:'📝', jp:'文昌（知）', en:'Sharp mind'},        // 文昌貴人
    ekiba:  {emoji:'🚄', jp:'駅馬（動）', en:'Momentum / travel'},  // 駅馬
    kagai:  {emoji:'🎯', jp:'華蓋（専）', en:'Deep focus'},         // 華蓋
    caution:{emoji:'⚠️', jp:'ゆらぎ注意', en:'Friction / guard'}
  };
  // — additional 神殺, ported verbatim from the pro engine —
  // day-master-based: 文昌貴人 / 羊刃 / 紅艶
  const JIKAN = {
    '甲':{bunsho:'巳',yojin:'卯',kouen:'午'}, '乙':{bunsho:'午',yojin:null,kouen:'午'},
    '丙':{bunsho:'申',yojin:'午',kouen:'寅'}, '丁':{bunsho:'酉',yojin:null,kouen:'未'},
    '戊':{bunsho:'申',yojin:'午',kouen:'辰'}, '己':{bunsho:'酉',yojin:null,kouen:'辰'},
    '庚':{bunsho:'亥',yojin:'酉',kouen:'戌'}, '辛':{bunsho:'子',yojin:null,kouen:'酉'},
    '壬':{bunsho:'寅',yojin:'子',kouen:'子'}, '癸':{bunsho:'卯',yojin:null,kouen:'申'}
  };
  // year/day-branch-group based: 咸池 / 駅馬 / 劫殺 / 亡神
  const GROUP_OF = {'申':'水','子':'水','辰':'水','寅':'火','午':'火','戌':'火','巳':'金','酉':'金','丑':'金','亥':'木','卯':'木','未':'木'};
  const CHI = {
    '水':{kanchi:'酉',ekiba:'寅',goutsu:'巳',boushin:'亥'},
    '火':{kanchi:'卯',ekiba:'申',goutsu:'亥',boushin:'巳'},
    '金':{kanchi:'午',ekiba:'亥',goutsu:'寅',boushin:'申'},
    '木':{kanchi:'子',ekiba:'巳',goutsu:'申',boushin:'寅'}
  };
  // month-branch based: 華蓋
  const KAGAI_BY_MONTH = {'子':'辰','丑':'丑','寅':'戌','卯':'未','辰':'辰','巳':'丑','午':'戌','未':'未','申':'辰','酉':'丑','戌':'戌','亥':'未'};

  // ---- 十二運 (twelve life stages) — the day's vitality vs the Day Master ----
  const TWELVE = ['長生','沐浴','冠帯','建禄','帝旺','衰','病','死','墓','絶','胎','養'];
  const TWELVE_EN = {長生:'Long Life',沐浴:'Bathing',冠帯:'Capping',建禄:'Officer',帝旺:'Emperor',衰:'Decline',病:'Illness',死:'Death',墓:'Grave',絶:'Void',胎:'Womb',養:'Nurture'};
  const TERR_ENERGY = {胎:3,養:6,長生:9,沐浴:7,冠帯:10,建禄:11,帝旺:12,衰:8,病:4,死:2,墓:5,絶:1}; // from pro engine
  const CHOUSEI = {'甲':11,'丙':2,'戊':2,'庚':5,'壬':8,'乙':6,'丁':9,'己':9,'辛':0,'癸':3}; // 長生 branch index
  const YANG_STEM = new Set(['甲','丙','戊','庚','壬']);
  function junni(dayStem, branchIdx) {
    const start = CHOUSEI[dayStem]; if (start === undefined) return null;
    const dir = YANG_STEM.has(dayStem) ? 1 : -1;
    const step = (((branchIdx - start) * dir) % 12 + 12) % 12;
    return TWELVE[step];
  }

  // ---- 異常干支 (13 rare pillars) — from the pro engine, labels in English ----
  const IJOU = {
    '甲戌':'quietly strong, a determined worker','乙亥':'patient yet adaptable',
    '戊戌':'kind, principled, hard-working','庚子':'sharp-minded and fast',
    '辛亥':'competitive, self-assured, versatile','丁巳':'a curious challenger',
    '辛巳':'refined — always polishing the craft','壬午':'bright and warm, with a rare sixth sense',
    '丁亥':'calm, warm, keenly perceptive','丙戌':'an easygoing, bright mood-maker',
    '戊子':'pure, sincere, composed','癸巳':'a healer with hidden fire','己亥':'gentle, sincere, dependable'
  };
  function ijouOf(pillars) {
    if (!pillars) return [];
    return [['Year',pillars.year],['Month',pillars.month],['Day',pillars.day],['Hour',pillars.hour]]
      .filter(([k,g]) => g && IJOU[g]).map(([k,g]) => ({ pillar:k, ganzhi:g, label:IJOU[g] }));
  }

  const RANKS = [
    { key:'rainbow', jp:'虹の日',   en:'Peak window', emoji:'🌈' },
    { key:'gold',    jp:'花丸の日', en:'Strong day',  emoji:'🌸' },
    { key:'tail',    jp:'追い風',   en:'Tailwind',    emoji:'🟢' },
    { key:'flat',    jp:'平',       en:'Even keel',   emoji:'🔵' },
    { key:'ease',    jp:'控えめ',   en:'Ease off',    emoji:'🟡' },
    { key:'rest',    jp:'静養',     en:'Recovery',    emoji:'🟠' },
    { key:'guard',   jp:'要注意',   en:'Hold / guard',emoji:'🔴' }
  ];

  // one-line, executive voice, by rank
  const HEADLINE = [
    'Your peak window this month — make the move you\'ve been sitting on.',
    'Green light. Push the one thing that matters today.',
    'Conditions are with you — lean in and press.',
    'Steady day. Execute the plan; don\'t gamble.',
    'Dial it back. Hold the big calls for a day.',
    'Recovery day. Protect your energy, not your calendar.',
    'Friction ahead. Defend your focus and commit to nothing new.'
  ];
  // concrete business moves by theme
  const THEME_ACTIONS = {
    work:   ['Make the call', 'Sign / put your name on it', 'Board & formal meetings'],
    money:  ['Close the deal', 'Negotiate numbers', 'Chase the opportunity'],
    people: ['Recruit / hire', 'Align the team', 'Key introductions'],
    learn:  ['Deep work & strategy', 'Learn / plan the quarter', 'Step back and think'],
    create: ['Launch / ship it', 'Pitch & present', 'Go public / publish']
  };

  // ③ dayGogyo — ported from the founder's proven 1.66 tables (colour hex kept,
  //   names in English, foods adapted for a US audience; taste principle preserved).
  const EL_JP = { Wood:'Wood', Fire:'Fire', Earth:'Earth', Metal:'Metal', Water:'Water' };
  const COLORVAR = {
    Wood:[['Fresh green','#8cc18a'],['Mint green','#a7d3b0'],['Forest green','#5fa06a'],['Olive','#9caa55'],['Turquoise','#5fc1b0'],['Lime green','#b7d36a'],['Jade','#7cc7a8'],['Sage','#a7b892']],
    Fire:[['Coral red','#e88a80'],['Vermilion','#e3654f'],['Rose pink','#e78aa0'],['Orange','#f0a05a'],['Wine red','#b85a66'],['Purple','#9d6bb0'],['Scarlet','#d8556a'],['Peach','#f4b3a0']],
    Earth:[['Yellow','#e6c477'],['Goldenrod','#e7b13c'],['Beige','#dcc7a0'],['Camel','#c89a5a'],['Terracotta','#d08a5a'],['Mustard','#d6b13a'],['Amber','#e0a94a'],['Brick','#c07a56']],
    Metal:[['White','#efe9d6'],['Gold','#e6c477'],['Silver','#c9cdd4'],['Ivory','#efe7d2'],['Champagne','#e8d6a8'],['Platinum','#d8d8d0'],['Rose gold','#e2c2b8'],['Pearl','#e8e2d4']],
    Water:[['Navy','#3a5680'],['Sky blue','#84b0d0'],['Black','#3a3a44'],['Aqua','#4fa0c4'],['Lavender','#9a92c4'],['Indigo','#4a5a92'],['Cobalt','#4f7ec4'],['Slate gray','#5a606a']]
  };
  const FOOD = {
    Wood:['lemon','tomato','berries','apple','citrus','a vinegar dish'],
    Fire:['dark leafy greens','coffee','matcha','arugula','green tea','celery'],
    Earth:['squash','sweet potato','rice & grains','carrots','honey','root veg'],
    Metal:['ginger','onion','garlic','radish','a peppery dish','clean protein'],
    Water:['fish','seaweed','shellfish','miso or broth','oysters','a sea-salt dish']
  };
  const SPEND = {
    Wood:'start things, plan for growth, get outside',
    Fire:'be visible, present, connect, get your cardio in',
    Earth:'consolidate, keep your routines, eat well, ground yourself',
    Metal:'decide, cut the clutter, sharpen focus, breathe',
    Water:'strategize, rest, hydrate, reflect'
  };

  function dayFortune(chart, y, m, d) {
    const i = BaZi.dayPillarIndex(y, m, d);
    const stemIdx = i % 10, brIdx = i % 12;
    const dmIdx = STEMS.indexOf(chart.dayMaster);
    const tg = tenGod(dmIdx, stemIdx);
    const dayEl = STEM_EL[stemIdx];
    const fav = chart.favorable;

    const chartBr = (chart.branches || []).map(b => BR.indexOf(b)).filter(x => x >= 0);
    const chartStems = (chart.chartStems || []).map(s => STEMS.indexOf(s)).filter(x => x >= 0);
    const dayBranchIdx = BR.indexOf((chart.pillars && chart.pillars.day || '').charAt(1));

    // ---- flags ----
    let liuhe = false, clash = false, sanhe = false, sanheFav = false;
    for (const cb of chartBr) {
      if (LIU_HE[brIdx] === cb) liuhe = true;
      if ((brIdx + 6) % 12 === cb) clash = true;
    }
    for (let gi = 0; gi < SAN_HE.length; gi++) {
      const g = SAN_HE[gi];
      if (!g.includes(brIdx)) continue;
      const others = g.filter(x => x !== brIdx);
      const present = others.filter(x => chartBr.includes(x)).length;
      if (present >= 1) sanhe = true;
      if (present === 2 && SAN_HE_EL[gi] === fav) sanheFav = true;
    }
    const ganhe = chartStems.some(cs => GAN_HE[stemIdx] === cs);        // 干合 with any chart stem (scoring)
    const ganheSelf = GAN_HE[stemIdx] === dmIdx;                        // 干合 with the Day Master (self palace)
    const liuheDay = (dayBranchIdx >= 0) && LIU_HE[brIdx] === dayBranchIdx; // 六合 with the 日支
    // 天地徳合: the day forms BOTH 干合 and 支合 with your day pillar — a rare,
    // self-based auspicious day (recurs about once per 60-day cycle). No partner needed.
    const tenchiTokugo = ganheSelf && liuheDay;
    const peach = (dayBranchIdx >= 0) && (brIdx === peachOf(dayBranchIdx));
    const noble = (NOBLE[chart.dayMaster] || []).includes(brIdx);
    const chongToDay = (dayBranchIdx >= 0) && ((brIdx + 6) % 12 === dayBranchIdx);
    const isVoid = (chart.voidBranches || []).includes(brIdx);

    // ---- additional 神殺 (pro engine tables) ----
    const dayBr = BR[brIdx];
    const jk = JIKAN[chart.dayMaster] || {};
    const monthBr = ((chart.pillars && chart.pillars.month) || '').charAt(1);
    const grp = dayBranchIdx >= 0 ? GROUP_OF[BR[dayBranchIdx]] : null;
    const chi = grp ? CHI[grp] : {};
    const isBunsho = dayBr === jk.bunsho;                 // 文昌 — sharp mind
    const isEkiba  = dayBr === chi.ekiba;                 // 駅馬 — momentum / travel
    const isKagai  = dayBr === KAGAI_BY_MONTH[monthBr];   // 華蓋 — deep focus
    const isKouen  = dayBr === jk.kouen;                  // 紅艶 — charm (→ presence)
    const isYojin  = jk.yojin && dayBr === jk.yojin;      // 羊刃 — high voltage (caution)
    const isGoutsu = dayBr === chi.goutsu;                // 劫殺 — loss (caution)
    const isBoushin= dayBr === chi.boushin;               // 亡神 — loss (caution)
    // 十二運 of the day (vitality of the day branch vs the Day Master)
    const junniStage = junni(chart.dayMaster, brIdx);
    const junniEnergy = junniStage ? TERR_ENERGY[junniStage] : 6;

    // ---- ①.5 流年・流月 — the CURRENT year & month pillars ----------------------
    // The same 干支 day carries different energy in a different month or year:
    // the month season (月令) strengthens or mutes the day's element, the day can
    // clash the year/month branch (歳破/月破), and a 三合 can complete across
    // day + flow + natal. Solar-term boundaries (立春/節入り) come from BaZi.compute.
    let flowYear = null, flowMonth = null;
    let monthInSeason = false, saiha = false, geppa = false;
    let sanheFlowFav = false, sanheFlowBad = false;
    try {
      const fp = BaZi.compute(y, m, d, null).pillars;
      flowYear = fp.year; flowMonth = fp.month;
    } catch (_) {}
    if (flowYear && flowMonth) {
      const BR_EL = {子:'Water',丑:'Earth',寅:'Wood',卯:'Wood',辰:'Earth',巳:'Fire',午:'Fire',未:'Earth',申:'Metal',酉:'Metal',戌:'Earth',亥:'Water'};
      const yBrIdx = BR.indexOf(flowYear.charAt(1)), mBrIdx = BR.indexOf(flowMonth.charAt(1));
      const monthEl = BR_EL[flowMonth.charAt(1)];
      monthInSeason = (monthEl === dayEl || GEN[monthEl] === dayEl);   // 月令が日の五行を旺じる
      saiha = ((brIdx + 6) % 12) === yBrIdx;                            // 歳破
      geppa = ((brIdx + 6) % 12) === mBrIdx;                            // 月破
      for (let gi = 0; gi < SAN_HE.length; gi++) {
        const g = SAN_HE[gi];
        if (!g.includes(brIdx)) continue;
        const [o1, o2] = g.filter(x => x !== brIdx);
        const flowBr = [yBrIdx, mBrIdx];
        const complete = (flowBr.includes(o1) && chartBr.includes(o2)) ||
                         (flowBr.includes(o2) && chartBr.includes(o1));
        if (complete) {
          if (SAN_HE_EL[gi] === fav) sanheFlowFav = true;
          else if (CTRL[SAN_HE_EL[gi]] === fav) sanheFlowBad = true;
        }
      }
    }

    // ---- ① score ----
    let score = 0; const notes = [];
    if (fav) {
      if (dayEl === fav) score += 3;
      else if (GEN[dayEl] === fav) score += 2;
      else if (CTRL[dayEl] === fav) { score -= 3; notes.push('runs against your favorable element'); }
      else if (CTRL[fav] === dayEl) score -= 1;
    }
    if (liuhe) score += 2; else if (sanhe) score += 1;
    if (sanheFav) { score += 3; notes.push('completes a 三合 that forms your favorable element (用神)'); }
    if (ganhe) score += 1;
    if (peach) score += 1;
    if (noble) score += 2;
    if (tenchiTokugo) { score += 4; notes.push('天地徳合 — a rare grand-harmony day, auspicious for anything that matters'); }
    if (isBunsho) score += 1;
    if (isEkiba) score += 1;
    if (clash) { score -= 3; notes.push('clashes a pillar (冲)'); }
    if (isVoid) { score -= 2; notes.push('a void (空亡) day'); }
    if (isGoutsu || isBoushin) { score -= 1; notes.push('a 劫殺/亡神 day — guard money and don\'t overreach'); }
    if (isYojin) notes.push('羊刃 — high energy, but watch conflict and overreach');
    if (junniEnergy >= 10) score += 1;       // 冠帯/建禄/帝旺 — strong, active day
    else if (junniEnergy <= 3) score -= 1;   // 絶/死/胎 — low vitality, better for rest
    // ---- 流年・流月 modifiers (the calendar's own year & month change the day) ----
    if (monthInSeason) {
      if (dayEl === fav) { score += 1; notes.push('this month\'s season (月令) strengthens the element that works for you'); }
      else if (CTRL[dayEl] === fav) { score -= 1; notes.push('this month\'s season (月令) strengthens an element that runs against you'); }
    }
    if (sanheFlowFav) { score += 2; notes.push('today, this year/month and your chart complete a 三合 of your favorable element'); }
    if (sanheFlowBad) { score -= 2; notes.push('today, this year/month and your chart complete a 三合 that works against you'); }
    if (saiha) { score -= 1; notes.push('the day clashes this year\'s branch (歳破) — friction with the year\'s current'); }
    if (geppa) { score -= 1; notes.push('the day clashes this month\'s branch (月破) — friction with the month\'s current'); }

    let ri;
    if (sanheFav || tenchiTokugo) ri = 0;
    else if (score >= 5) ri = 1;
    else if (score >= 2) ri = 2;
    else if (score >= 0) ri = 3;
    else if (score >= -2) ri = 4;
    else if (score >= -4) ri = 5;
    else ri = 6;

    // ---- ② theme icons (independent) ----
    const iconKeys = [];
    if (TENGOD_ICON[tg]) iconKeys.push(TENGOD_ICON[tg]);
    if (tenchiTokugo) iconKeys.push('tenchi');            // 天地徳合 — the fuller form
    else if (ganheSelf || liuheDay) iconKeys.push('connect');
    if (peach || isKouen) iconKeys.push('presence');      // 桃花 or 紅艶
    if (noble) iconKeys.push('noble');
    if (isBunsho) iconKeys.push('bunsho');                // 文昌
    if (isEkiba) iconKeys.push('ekiba');                  // 駅馬
    if (isKagai) iconKeys.push('kagai');                  // 華蓋
    if (chongToDay || isYojin || isGoutsu || isBoushin) iconKeys.push('caution');
    const icons = iconKeys.map(k => ({ key:k, ...ICONS[k] }));

    // ---- ③ dayGogyo: choose the element to feature (fe) ----
    //   喜神 day → activate the day's qi; 忌神 day → settle it with the 喜神 that
    //   controls it (剋, the founder's primary), else the one it generates (洩); 中庸 → natural.
    const ctrlOf = e => { for (const k in CTRL) if (CTRL[k] === e) return k; return null; };
    let state, fe;
    if (fav && (dayEl === fav || GEN[dayEl] === fav)) { state = 'tailwind'; fe = dayEl; }
    else if (fav && CTRL[dayEl] === fav) { state = 'settle'; fe = ctrlOf(dayEl) || GEN[dayEl]; }
    else { state = 'neutral'; fe = dayEl; }
    // seeded colour + food (varies by day AND person, deterministic)
    const seed = i + (dmIdx + 1) * 7 + (dayBranchIdx + 1) * 13;
    const cv = COLORVAR[fe], pick = cv[((seed % cv.length) + cv.length) % cv.length];
    const colorName = pick[0], colorHex = pick[1];
    const fl = FOOD[fe], foods = [fl[seed % fl.length], fl[(seed + 3) % fl.length]].filter((v, idx, a) => a.indexOf(v) === idx).join(', ');
    let howto;
    if (state === 'tailwind') howto = 'Lean into '+EL_JP[dayEl]+'. Wear '+colorName.toLowerCase()+', favor '+foods+' — good to '+SPEND[dayEl]+'.';
    else if (state === 'settle') howto = 'The day\'s '+EL_JP[dayEl]+' runs strong. Balance it with '+EL_JP[fe]+': '+colorName.toLowerCase()+', '+foods+', and steadier choices.';
    else howto = 'An even day in its own '+EL_JP[dayEl]+' tone — '+colorName.toLowerCase()+' suits it; take it at your pace.';

    // ---- business actions + wellness (executive voice) ----
    const themeKey = TENGOD_ICON[tg];
    let headline = HEADLINE[ri];
    if (tenchiTokugo) headline = 'Grand-harmony day (天地徳合) — a rare, all-round auspicious window. Do the one thing that matters most.';
    else if (sanheFav) headline = 'Your favorable element crystallizes today (三合) — a peak window. Make the move.';
    let actions;
    if (ri >= 5) {                       // Recovery / Guard → wellness-first, no commitments
      actions = [];
    } else if (ri === 4) {               // Ease off
      actions = (THEME_ACTIONS[themeKey] || []).slice(0, 1).concat('Hold irreversible calls');
    } else {
      actions = (THEME_ACTIONS[themeKey] || []).slice(0, 2);
      const contractStar = (tg === '正官' || tg === '正財');
      if (contractStar && ri <= 2 && !clash && !isVoid) actions.unshift('Sign, file, or commit');
    }
    // wellness prescription — recovery framed as performance, for a US operator
    let wellness;
    if (ri === 6)      wellness = 'Guard your bandwidth: get outside, move your body, breathe. Make no irreversible calls — you\'ll thank yourself.';
    else if (ri === 5) wellness = 'Maintenance, not lost time. Train, walk, or sit 10 minutes. Recover today, decide sharper tomorrow.';
    else if (ri === 4) wellness = 'Leave some white space. A short reset now protects the week.';
    else if (chongToDay || isVoid) wellness = 'Undercurrents today — take one deliberate pause before you commit.';
    else               wellness = 'Bank the momentum: recharge tonight so you can keep pushing.';

    const r = RANKS[ri];
    return {
      rank: ri, rankKey: r.key, rankJP: r.jp, rankEN: r.en, emoji: r.emoji, score,
      tenGod: tg, element: dayEl, ganzhi: STEMS[stemIdx] + BR[brIdx],
      icons, iconKeys,
      flags: { peach, ganhe, ganheSelf, liuhe, liuheDay, tenchiTokugo, sanhe, sanheFav, noble, clash, chongToDay, isVoid,
               monthInSeason, sanheFlowFav, sanheFlowBad, saiha, geppa },
      flow: (flowYear && flowMonth) ? { year: flowYear, month: flowMonth } : null,
      state, color: colorName, colorHex, food: foods, howto,
      junni: junniStage, junniEN: junniStage ? TWELVE_EN[junniStage] : null, junniEnergy,
      headline, wellness,
      tags: [...new Set(actions)].slice(0, 4),   // business actions (kept as `tags` for the UI)
      note: notes.join('; ')
    };
  }

  function voidBranches(dayPillarIndex) {
    const s = dayPillarIndex % 10, start = dayPillarIndex - s;
    return [ (start + 10) % 12, (start + 11) % 12 ];
  }

  const api = { dayFortune, tenGod, voidBranches, peachOf, junni, ijouOf, IJOU, RANKS, ICONS, COLORVAR, FOOD, STEMS, BR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DayFortune = api;
})(typeof window !== 'undefined' ? window : globalThis);
