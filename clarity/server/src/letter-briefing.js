/* =============================================================================
   letter-briefing.js — the sectioned "daily briefing" letter (US business voice)
   -----------------------------------------------------------------------------
   Alternative to letter.js's classic letter, modeled on the founder's Japanese
   運気予報 mail (sectioned: business / love / health / kit / one action) but
   written for a US business audience: concrete, plain-English, immediately
   actionable — nothing mystical-sounding, nothing vague.

   Coaching upgrades (v2):
   · "Bottom line" bridges the two axes the engine tracks — the day's outward
     conditions (rank) and your personal battery (十二運 vitality) — so the
     letter never reads as "push!" and "rest!" at once.
   · A "why this is you" line ties the day to your own default tendency
     (day-master blindspot / strength edge from the founder's lexicon) — that
     is what turns a to-do into coaching.
   · English-first: the underlying terms drive the logic but are not printed as
     untranslated jargon; a US reader understands every line at a glance.

   Faithfulness contract: every claim traces to a value DayFortune computed for
   THIS subscriber on THIS day (rank, verdict headline quoted verbatim, ten god,
   十二運 stage + energy, flags, color, foods, state, actions, wellness). We do
   NOT invent uncomputed values (no lucky numbers/directions — not computed).
   Rotations are deterministic by date: same person + same day ⇒ same letter.
   Compliance: identical CAN-SPAM footer to letter.js.
   ============================================================================= */
'use strict';

const path = require('path');
const LEX = require(path.resolve(__dirname, '..', '..', 'lexicon.js'));
const { TENGODS, DAYMASTER, STRENGTH } = LEX;
const { seedOf, pick, esc, EL_JP, JUNNI_LINES, WEEKDAY_LINES, subjectFor, deJargon } = require('./letter');

const isHighDay = (rank) => rank <= 2;      // 🌈🌸🟢
const isLowDay  = (rank) => rank >= 4;      // 🟡🟠🔴
const isHighE   = (e) => (e || 6) >= 10;    // 冠帯/建禄/帝旺
const isLowE    = (e) => (e || 6) <= 4;     // 病/胎/死/絶

// ---- BOTTOM LINE: reconcile the day (outward) with your battery (十二運) -----
// Resolves the "push vs rest" confusion by naming both and how to hold them.
function bottomLine(rank, energy) {
  const hd = isHighDay(rank), ld = isLowDay(rank), he = isHighE(energy), le = isLowE(energy);
  if (hd && le) return 'The day is open to you, but your own tank is low. Take your one big swing early, then let the rest of the day stay easy — don\'t confuse an open door with unlimited fuel.';
  if (hd && he) return 'Everything lines up today — the conditions are with you and so is your energy. Spend it on the one thing that actually matters, not the busywork that will feel productive.';
  if (ld && he) return 'You\'re charged up, but the day itself resists. Aim that energy inward — prep, practice, cleanup, the deep-work draft — rather than at big outward moves that won\'t land today.';
  if (ld && le) return 'A low day and a low tank. This is a protect-and-restore day: force nothing, keep every stake small, and you\'ll be glad tomorrow.';
  if (hd)       return 'A genuinely favorable day. Match it with one real move while it lasts, not a dozen small ones.';
  if (ld)       return 'A quieter day. Keep the stakes low and the plan simple; steadiness is the whole job today.';
  return 'A steady, workable day. Plain, honest progress is exactly the right ambition — pick three things and finish them.';
}

// ---- WHY THIS IS YOU: tie the day to your own default tendency ---------------
// Uses the day-master blindspot (a clean phrase) + the strength edge, in
// rotating phrasings so the line doesn't read identically every strong day.
function whyLine(chart, rank, seed) {
  const dm = (chart && DAYMASTER[chart.dayMaster]) || {};
  const st = (chart && STRENGTH[chart.strength]) || {};
  // normalize the blindspot to a bare verb phrase ("take on everyone's
  // problems", "keep pushing a direction…") so it slots after "to"/"you'll".
  const vp = ((dm.blindspot || '').includes('—') ? dm.blindspot.split('—').pop() : (dm.blindspot || 'overthink the start'))
    .trim().replace(/\.$/, '').replace(/^(you can |you |your )/i, '');
  const edge  = (st.edge || 'restraint').replace(/^your growth edge is /i, '').split(/[.;]/)[0].trim();
  if (isHighDay(rank)) return pick(seed, 41, [
    `Your usual trap is to ${vp}. Today is exactly the day not to do that — conditions back a decisive move, so make it before it feels perfect.`,
    `You tend to ${vp}. Not today — the day is behind a clear, committed move, so pick one and go.`,
    `Left to habit you'll ${vp}. Use today's tailwind to break the pattern: decide, then act.`
  ]);
  if (isLowDay(rank)) return pick(seed, 42, [
    `Your instinct on a day like this is to ${vp} — and today won't reward it. Lead instead with ${edge}.`,
    `The temptation today is to ${vp}. Resist it; this is a day for ${edge}.`,
    `Don't ${vp} today just because the day feels slow. The stronger move is ${edge}.`
  ]);
  return pick(seed, 43, [
    `A good day to practice ${edge} — the quiet skill that compounds when nothing is dramatic.`,
    `Use this even day to work on ${edge}; steady days are where that muscle actually grows.`,
    `Nothing forcing your hand today — a clean chance to practice ${edge}.`
  ]);
}

// ---- BUSINESS: rank → today's concrete play (3 rotating variants per rank) ---
const BIZ_PLAYS = [
  [ 'Clear the calendar for your one big swing — sign it, pitch it, launch it. Windows like this are rare.',
    'This is the day for the biggest item on your list. Move it to 9am and protect the block.',
    'Make the irreversible move you\'ve been sitting on — today carries it further than next week will.' ],
  [ 'Green light: send the proposal, book the meeting you\'ve been circling, make the ask.',
    'Push outbound today — the pitch, the follow-up, the pricing conversation. Today favors the sender.',
    'Say yes to the bigger version of the plan; scale the ask up one notch.' ],
  [ 'Momentum favors outreach: follow up on warm leads before noon, while the day is with you.',
    'A good day to advance, not to start from zero — move every open deal one step forward.',
    'Take the meetings; skip the busywork. Face-time compounds today.' ],
  [ 'Execution beats ideation today: work the list, close open items, ship the small stuff.',
    'A steady day — perfect for the unglamorous work that actually moves the quarter.',
    'Keep the plan you already made; today rewards follow-through, not fresh pivots.' ],
  [ 'Negotiate, don\'t commit: gather terms and information today, sign tomorrow.',
    'Keep decisions reversible today — drafts, options, and soft commitments only.',
    'Trim the day\'s ambitions by a third and do the remainder properly.' ],
  [ 'Maintenance day: clean the pipeline, chase the invoices, prep tomorrow\'s meetings.',
    'Restore capacity: clear the inbox to zero, tidy the deck, sharpen next week\'s plan.',
    'Back-office day — the quiet work that makes next week\'s big day possible.' ],
  [ 'Hold anything irreversible: no signing, no big sends, no pricing calls. Draft now, schedule for tomorrow.',
    'Defend the calendar — decline the optional, buffer the essential, commit to nothing new.',
    'Damage-proof the day: double-check the numbers, back up the work, keep your counsel.' ]
];
// When the day is favorable but your battery is low, add a pacing caveat.
const PACE_NOTE = ' Do the one big thing, then coast — you don\'t have a full tank today.';

// A person salt from the chart, folded into the date seed so these fallback
// sections vary BY PERSON (not just by date) — two different charts get
// different lines on the same day, while staying deterministic per person.
const STEMS10 = '甲乙丙丁戊己庚辛壬癸', BR12 = '子丑寅卯辰巳午未申酉戌亥';
const ELN = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
function personSeed(chart, seed) {
  const dm = chart ? STEMS10.indexOf(chart.dayMaster) + 1 : 0;
  const fv = chart ? ELN.indexOf(chart.favorable) + 1 : 0;
  const db = chart && chart.pillars && chart.pillars.day ? BR12.indexOf(chart.pillars.day[1]) + 1 : 0;
  const pmix = (dm * 131 + fv * 17 + db * 7 + (chart && chart.strength === 'strong' ? 3 : chart && chart.strength === 'weak' ? 5 : 1)) >>> 0;
  return (seed ^ Math.imul(pmix, 2654435761)) >>> 0;
}

// ---- LOVE & PEOPLE: engine flags first (plain English), rank fallback --------
// Flag lines carry 2-3 person-salted variants so people who share the same
// signal on a day don't all read the identical sentence.
function loveLines(r, pseed) {
  const f = r.flags || {};
  if (f.peach) return pick(pseed, 61, [
    'You read loud and warm to people today — accept the invitation, speak first, be seen. If you\'re partnered, plan something out in the world, not another night on the couch.',
    'You\'re magnetic today: say yes to the social thing, and let yourself be the one who reaches out first.',
    'Charm is on your side today — make the introduction, take the front-row seat, plan the date somewhere lively.' ]);
  if (f.ganhe || f.liuhe) return pick(pseed, 62, [
    'A day when new ties form easily. Reach out first — two lines beat a three-paragraph message. If an old contact resurfaces, answer them; it\'s worth it today.',
    'Connections click today. Send the short message you\'ve been meaning to; an old contact who resurfaces is worth answering.',
    'Good day to bridge two worlds — introduce people, accept the coffee, restart the thread that went quiet.' ]);
  if (f.chongToDay || f.clash) return pick(pseed, 63, [
    'There\'s friction in the air — not the day for the big relationship talk. Push the hard conversation 24 hours and bring home takeout instead.',
    'Tensions run close to the surface today; postpone the heavy conversation a day and keep tonight easy.',
    'Not the day to force a hard talk — give it 24 hours, and choose warmth over being right tonight.' ]);
  if (f.isVoid) return pick(pseed, 64, [
    'Keep relationship promises small today. Don\'t plan the trip or set the date; just be reliably, quietly present.',
    'Make no big relationship commitments today — no dates set, no trips booked; just show up steadily.',
    'A day to be present, not to promise. Keep it small and reliable with the people close to you.' ]);
  const tier = r.rank <= 2 ? 0 : r.rank <= 4 ? 1 : 2;
  const byTier = [
    [ 'A generous day with people: make the reservation, plan the weekend, say the kind thing out loud.',
      'Warm and easy with others today — call the friend, book the dinner, put the date on the calendar.',
      'People are drawn to you today — introduce two friends who should know each other, host the thing.',
      'A good day to say the warm thing you usually keep to yourself. It will land.' ],
    [ 'Small gestures land best today — a two-line text beats a long call, a coffee beats a summit.',
      'Keep it light with people today: check in, don\'t deep-dive.',
      'One thoughtful message to one person beats a whole afternoon of catching up today.',
      'Low-key is the move — a walk-and-talk, not a big plan.' ],
    [ 'Listen more than you fix tonight — presence beats solutions right now.',
      'A quiet-connection day: a walk, shared silence, an early night. Skip anything that needs negotiating.',
      'Protect the calm at home tonight — no big decisions, just be there.',
      'Give people room today; a little space now saves a conversation later.' ]
  ];
  return pick(pseed, 21, byTier[tier]);
}

// ---- HEALTH & ENERGY: 十二運 stage (varies by person) + tier-appropriate act --
function healthLines(r, pseed) {
  const e = r.junniEnergy || 6;
  const stage = r.junni ? `Your body\'s own cycle today: ${JUNNI_LINES[r.junni] || 'steady'}. ` : '';
  const tier = isHighE(e) ? 0 : isLowE(e) ? 2 : 1;
  const acts = [
    [ 'A hard workout will land well today — put it on the calendar, not on willpower.',
      'Good day to push physically: the long run, the heavy session, the early alarm.',
      'High engine today — train hard, then eat and sleep like you mean it.' ],
    [ 'Thirty minutes of movement — a walk between calls counts — keeps your edge today.',
      'Keep the body ticking over: a brisk walk, water before coffee, a real lunch.',
      'Moderate energy — move enough to stay sharp, not so much you fade by afternoon.' ],
    [ 'Trade the hard session for a walk and a stretch, front-load protein, sleep early.',
      'A restore day for the body: gentle movement, warm food, lights out early.',
      'Low battery — go easy, hydrate well, and let rest be the productive choice.' ]
  ];
  return stage + pick(pseed, 51, acts[tier]);
}

// ---- ONE MOVE TODAY: most specific computed signal wins (plain English) ------
function oneMove(r, pseed) {
  const f = r.flags || {};
  if (f.tenchiTokugo || f.sanheFav) return pick(pseed, 71, [
    'Do the single most important thing on your list before 10am, before the day dilutes it.',
    'Pick the one move that would make today matter, and do it first — everything else can wait.',
    'Front-load your biggest task; a day this open rewards the person who moves early.' ]);
  if (f.noble)  return pick(pseed, 72, [
    'Ask for the favor you\'ve been sitting on — the intro, the reference, the warm handoff. Help comes easily today, but only if you actually ask.',
    'Make the ask you\'ve been putting off; today the right person is inclined to say yes.',
    'Reach out to the person who could open a door — help arrives easily today, if you request it plainly.' ]);
  if (f.peach)  return pick(pseed, 73, [
    'Take the visible slot: present the work, post the update, speak first in the meeting.',
    'Put yourself in front of people today — pitch, post, or present. You\'ll be well received.',
    'Speak up first today; visibility works in your favor, so take the stage you\'d usually pass on.' ]);
  if (f.ganhe || f.liuhe) return pick(pseed, 74, [
    'Send one short message to the person you\'ve been meaning to contact. Today it gets answered.',
    'Fire off the two-line message you keep rewriting in your head — today it lands.',
    'Reconnect with one person today; a short note reopens something worth reopening.' ]);
  if (f.isVoid) return pick(pseed, 75, [
    'Re-read everything before you hit send, and reconfirm today\'s meeting times. Small checks save the day.',
    'Double-check the details today — times, names, numbers — before anything goes out.',
    'Slow down on the fine print; a five-minute review now prevents a redo tomorrow.' ]);
  if (f.chongToDay || f.clash) return pick(pseed, 76, [
    'Put 15 minutes of buffer between meetings and don\'t stack the day. Room to wobble is the win.',
    'Leave slack in the schedule today — the day jostles, and margin is what protects it.',
    'Don\'t over-book today; build in a gap so one delay doesn\'t topple the rest.' ]);
  const generic = [
    'Close one loop that\'s been open all week — the email, the decision, the call.',
    'Write tomorrow\'s first task on a sticky note before you log off. Tomorrow-you moves faster.',
    'Do the two-minute version of the thing you\'re avoiding. Just the first two minutes.',
    'Tell one person exactly what they did well this week. Thirty seconds, outsized return.',
    'Water before coffee, and take your first call standing up.',
    'Block 25 quiet minutes for the one task that needs your full brain — phone in another room.',
    'Name the one outcome that would make today a win, and put it at the top of the list.',
    'Say no to one thing today so you can finish one thing today.',
    'Send the follow-up you\'ve been drafting in your head. Short is fine.',
    'Step outside for five minutes before the first meeting — it resets the whole day.'
  ];
  return pick(pseed, 33, generic);
}

// ---- 空亡 (void / 天中殺) YEAR — surfaced POSITIVELY and SPARINGLY --------------
// A void period lasts ~2 years; hammering "caution" daily would be miserable and
// wrong. In this tradition it is a foundation/consolidation season — a time to
// learn, tidy the base, and plant quietly. So we mention it only occasionally
// (about once a month) and always framed as a constructive chapter, never as
// bad luck. VOID_MONTHLY_DAY controls the cadence.
const VOID_MONTHLY_DAY = 1; // show on the 1st of the month during a void year
function inVoidYear(chart, date) {
  const vb = (chart && chart.voidBranches) || []; // day-pillar void branch indices
  const yBrIdx = (((date.getFullYear() - 4) % 12) + 12) % 12; // 1984 = 子
  return vb.includes(yBrIdx);
}
function voidYearNote(chart, date, pseed) {
  if (!inVoidYear(chart, date) || date.getDate() !== VOID_MONTHLY_DAY) return null;
  // Gentle caution + positive reframe: name the real risk (pushing hard tends
  // to spin its wheels, so hold big irreversible calls) without alarm, and point
  // to what the season IS good for. Inclusive, calm, moon-toned.
  return pick(pseed, 91, [
    '🌙 A season-level note, gently: you\'re in a quieter chapter right now, so forcing big, hard-to-reverse moves tends to spin its wheels rather than land. Nothing to fear — just a good stretch to hold the major decisions and let them wait. Use it to rest, review, and prepare; the groundwork you lay now pays off once the season turns.',
    '🌙 Zooming out: this is one of your low-tide seasons. Big external pushes can fall flat or loop back on themselves for a while, so it\'s wise to keep the irreversible calls on hold. Not a setback — a genuinely good stretch to consolidate, tidy the base, and look after yourself. The tide comes back.',
    '🌙 A gentle heads-up on the bigger picture: for a while, forcing outcomes tends to spin more than it sticks, so this isn\'t the season to launch or sign the big thing. Let it wait, and spend the time to plan, repair, and set roots. What feels slow now is groundwork — it grows once the season lifts.'
  ]);
}

// ---- PROVENANCE: show the machinery, so it never reads as random/auto-made ---
// Plain-English "show your work" with the actual computed inputs — the one place
// we surface the chart codes on purpose, clearly labeled as the technical basis.
function provenanceLine(chart, r) {
  if (!chart) return null;
  const rel = r.state === 'tailwind'
    ? (r.element === chart.favorable
        ? `today carries ${r.element}, the element you thrive on — a tailwind`
        : `today carries ${r.element}, which feeds ${chart.favorable}, the element you thrive on — a tailwind`)
    : r.state === 'settle'
    ? `today runs heavy in ${r.element}, which can pull against you, so it reads as a steadier day`
    : `today's ${r.element} sits fairly neutral to your chart`;
  const f = r.flags || {};
  let extra = '';
  if (f.sanhe || f.sanheFav || f.liuhe || f.ganhe) extra = ', and it forms a classical harmony with your pillars';
  else if (f.chongToDay || f.clash) extra = ', and it clashes with one of your pillars';
  else if (f.noble) extra = ', with a helpful "nobleman" influence in play';
  // The current year & month pillars (流年・流月) shift the same day's reading
  // from one month/year to the next — naming them here shows that, and keeps
  // any two letters from ever being verbatim-identical across the 60-day cycle.
  const flowLine = (r.flow && r.flow.year && r.flow.month)
    ? ` This reading sits inside a ${r.flow.month} month of a ${r.flow.year} year — the same day reads differently as those currents change.`
    : '';
  return `Your chart (day master ${chart.dayMaster} ${chart.dayMasterElement}; the element you thrive on is ${chart.favorable}) read against today's pillar ${r.ganzhi} ${r.element} — ${rel}${extra}. That is why today scores as "${r.rankEN}."${flowLine} Every line above follows from this calculation — the same one a Four Pillars practitioner works out by hand — never random.`;
}

// ---- TODAY'S KIT how-to — built here so it never contradicts the day's rank --
function kitHowTo(r, fav) {
  const el = r.element, color = (r.color || '').toLowerCase(), food = r.food;
  if (r.state === 'tailwind') return `Today leans into ${el} — wearing ${color} and keeping ${food} nearby puts you in step with it.`;
  if (r.state === 'settle')   return `Today's ${el} runs strong; ${color}${fav ? ' brings in your ' + fav : ''} and ${food} help you balance it.`;
  return `Keep ${color} close because it steadies you — no special effort needed today.`;
}

// Structured facts for the (optional) LLM coach polish — identity-free, so
// they double as the situation-cache key. Nothing here is invented.
function briefingFacts(sub, r, date) {
  const chart = sub.chart ? JSON.parse(sub.chart) : null;
  const dm = (chart && DAYMASTER[chart.dayMaster]) || {};
  const st = (chart && STRENGTH[chart.strength]) || {};
  const tg = TENGODS[r.tenGod] || {};
  const rank = Math.max(0, Math.min(6, r.rank | 0));
  const flags = Object.entries(r.flags || {}).filter(([, v]) => v).map(([k]) => k);
  // plain-English signal descriptions — never send raw term names to the LLM
  const FLAG_EN = {
    noble: 'help from others comes easily today', peach: 'you are especially visible and magnetic to people today',
    ganhe: 'new connections form easily today', ganheSelf: 'new connections form easily today',
    liuhe: 'new connections form easily today', liuheDay: 'a close personal connection is favored today',
    sanhe: 'your favorable element is strongly reinforced today', sanheFav: 'your favorable element peaks today',
    tenchiTokugo: 'a rare all-around favorable window today',
    clash: 'expect friction and disruption today', chongToDay: 'a personal/home disruption is possible today',
    isVoid: 'keep stakes small; commitments may not stick today',
    sanheFlowFav: 'a rare alignment of the year, the month and your chart peaks your favorable element today',
    sanheFlowBad: 'the year and month currents amplify an element that runs against you today — do not force outcomes',
    saiha: 'the day runs against the year\'s larger current — give plans extra slack today',
    geppa: 'the day runs against the month\'s current — double-check timing and commitments today'
  };
  const flagText = flags.map(k => FLAG_EN[k]).filter(Boolean).join('; ');
  const energyTier = isHighE(r.junniEnergy) ? 'high (well-rested cycle)' : isLowE(r.junniEnergy) ? 'low (a restore day for your body)' : 'moderate';
  return {
    dateKey: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    rankKey: r.rankKey, rankLabel: r.rankEN,
    rankTier: isHighDay(rank) ? 'favorable' : isLowDay(rank) ? 'resistant' : 'even',
    headline: deJargon(r.headline), favorable: chart && chart.favorable, dayElement: r.element,
    tenGod: r.tenGod, tenGodLabel: (tg.label || '').replace(/\s*[　-鿿]+/g, '').trim(),
    tenGodBiz: tg.biz, tenGodGift: tg.gift, tenGodWatch: tg.watch,
    energyTier, flags, flagText,
    color: r.color, food: r.food, bizAction: (rank <= 3 && r.tags && r.tags[0]) ? r.tags[0] : '',
    dayMaster: chart && chart.dayMaster, strength: chart && chart.strength,
    blindspot: (dm.blindspot || '').replace(/\s*[　-鿿]+/g, ''), edge: (st.edge || '')
  };
}

/**
 * Render the briefing. `ai` (optional) is {bottom,business,love,health,move}
 * from coach-ai; any provided key replaces that section's deterministic prose.
 * The subject, kit facts, links and legal footer are always deterministic.
 */
function composeBriefing(sub, r, cfg, ad = null, date = new Date(), ai = null) {
  const name = sub.nickname && sub.nickname.trim() ? sub.nickname.trim() : 'there';
  const chart = sub.chart ? JSON.parse(sub.chart) : null;
  const fav = chart && chart.favorable;
  const seed = seedOf(date);
  const pseed = personSeed(chart, seed); // date + this chart → per-person variety on a shared day
  const rank = Math.max(0, Math.min(6, r.rank | 0));
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const unsubUrl = `${cfg.baseUrl}/unsubscribe?t=${encodeURIComponent(sub.unsubscribe_token)}`;
  const dataUrl  = `${cfg.baseUrl}/data?t=${encodeURIComponent(sub.unsubscribe_token)}`;
  const calUrl = `${cfg.appUrl}#calendar`;
  // SNS share links — plain URLs only (email clients run no scripts)
  const shareTxt  = encodeURIComponent('My mornings start with a short letter computed from my own birth chart. Worth a look:');
  const shareUrl2 = encodeURIComponent(cfg.appUrl);
  const shareX    = `https://twitter.com/intent/tweet?text=${shareTxt}&url=${shareUrl2}`;
  const shareFb   = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl2}`;
  const shareLi   = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl2}`;
  const shareWa   = `https://wa.me/?text=${shareTxt}%20${shareUrl2}`;
  const shareMail = `mailto:?subject=${encodeURIComponent('A morning letter from your own birth chart')}&body=${shareTxt}%20${shareUrl2}`;


  const subject = subjectFor(sub.nickname && sub.nickname.trim(), r, date);
  const tg = (ai ? null : (TENGODS[r.tenGod] || null)); // AI folds the theme into 'business'
  const bottom = (ai && ai.bottom) || bottomLine(rank, r.junniEnergy);
  const why = ai ? null : whyLine(chart, rank, seed);
  let biz = (ai && ai.business) || pick(seed, 11 + rank, BIZ_PLAYS[rank]);
  if (!ai && isHighDay(rank) && isLowE(r.junniEnergy)) biz += PACE_NOTE;
  const love = (ai && ai.love) || loveLines(r, pseed);
  const health = (ai && ai.health) || healthLines(r, pseed);
  const move = (ai && ai.move) || oneMove(r, pseed);
  const weekday = WEEKDAY_LINES[date.getDay()];
  // Only surface the constructive best-fit move on favorable-to-even days.
  // On hold-back days (Ease off / Recovery / Guard) it would contradict the day.
  const bizAction = (rank <= 3 && r.tags && r.tags[0]) ? r.tags[0] : null;
  const kit = kitHowTo(r, fav);
  const headline = deJargon(r.headline);
  const prov = provenanceLine(chart, r);
  const voidNote = voidYearNote(chart, date, pseed); // positive, ~monthly, or null

  // ---- plain-text ------------------------------------------------------------
  const text = [
    `Good morning, ${name}.`,
    `${dateStr} — ${r.emoji} ${r.rankEN}`,
    `${headline}`,
    `Bottom line: ${bottom}`,
    ``,
    `BUSINESS — ${biz}${bizAction ? ` Best-fit move from your chart: ${bizAction}.` : ''}`,
    why ? `Why you: ${why}` : '',
    tg ? `The current running today is "${tg.label.replace(/\s*[　-鿿]+/g, '').trim()}": ${tg.biz}. Lean on ${tg.gift}; watch ${tg.watch}.` : '',
    ``,
    `LOVE & PEOPLE — ${love}`,
    ``,
    `HEALTH & ENERGY — ${health}`,
    `${r.wellness}`,
    ``,
    `TODAY'S KIT — Color: ${r.color}. Food that steadies you: ${r.food}. ${kit}`,
    ``,
    `ONE MOVE TODAY — ${move}`,
    weekday,
    ``,
    voidNote ? voidNote : '',
    voidNote ? `` : '',
    prov ? `HOW TODAY WAS COMPUTED — ${prov}` : '',
    ``,
    `See how the whole month lies for you — the full calendar is in Numinous Pro: ${calUrl}`,
    `Share Numinous with a friend: ${cfg.appUrl}`,
    ``,
    `— Written for you from your own chart, by Numinous. From Japan.`,
    ``,
    `You're getting this because you asked Numinous to write you a morning letter.`,
    `Unsubscribe anytime, one tap: ${unsubUrl}`,
    `See or erase your optional profile: ${dataUrl}`,
    `${cfg.orgName} · ${cfg.orgAddress}`
  ].filter(x => x !== '').join('\n').replace(/\n{3,}/g, '\n\n');

  // ---- HTML ------------------------------------------------------------------
  const S = (label, color, bodyHtml) => `
      <tr><td style="padding:14px 28px 0">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
          <td style="border-left:3px solid ${color};background:#fbf8f1;border-radius:0 12px 12px 0;padding:13px 16px">
            <div style="font:600 10.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.15em;text-transform:uppercase;color:${color};margin-bottom:7px">${label}</div>
            <div style="font:14.5px/1.62 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#3a372f">${bodyHtml}</div>
          </td></tr></table>
      </td></tr>`;

  const adBlock = ad && ad.html ? S('Today\'s sponsor', '#d8cfbc', ad.html) : '';
  const tgClean = tg ? tg.label.replace(/\s*[　-鿿]+/g, '').trim() : '';

  const html = `<!doctype html><html><body style="margin:0;background:#f3efe6">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3efe6"><tr><td align="center" style="padding:26px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#fffdf8;border:1px solid #e7e0d3;border-radius:18px;overflow:hidden">

      <tr><td style="padding:24px 28px 4px">
        <div style="font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:#a99461">From Japan · your morning briefing</div>
        <div style="font:600 24px/1.25 'Iowan Old Style',Palatino,Georgia,serif;color:#20211d;margin-top:10px">Good morning, ${esc(name)}.</div>
        <div style="font:13px/1.5 ui-monospace,Menlo,monospace;color:#8c877c;margin-top:6px">${esc(dateStr)}</div>
      </td></tr>

      <tr><td style="padding:12px 28px 0">
        <div style="background:#f7f3ea;border-radius:12px;padding:14px 16px">
          <div style="font:600 17px/1.4 'Iowan Old Style',Palatino,Georgia,serif;color:#20211d">${esc(r.emoji)} ${esc(r.rankEN)}</div>
          <div style="font:15px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#3a372f;margin-top:5px">${esc(headline)}</div>
          <div style="font:14px/1.62 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#5a5546;margin-top:9px"><b style="color:#20211d">Bottom line.</b> ${esc(bottom)}</div>
        </div>
      </td></tr>

      ${S('💼 Business', '#cb9c58', `${esc(biz)}${bizAction ? `<div style="margin-top:7px">Best-fit move from your chart: <b style="color:#20211d">${esc(bizAction)}</b>.</div>` : ''}
        ${why ? `<div style="margin-top:9px;padding-top:9px;border-top:1px solid #efe4cf"><span style="font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;color:#a99461">Why you</span><br><span style="color:#3a372f">${esc(why)}</span></div>` : ''}
        ${tg ? `<div style="margin-top:8px;color:#5a5546;font-size:13.5px">The current running today is <b style="color:#20211d">${esc(tgClean)}</b> — ${esc(tg.biz)}. Lean on ${esc(tg.gift)}; watch ${esc(tg.watch)}.</div>` : ''}`)}

      ${S('💗 Love &amp; people', '#bd7183', esc(love))}

      ${S('🌿 Health &amp; energy', '#77a88f', `${esc(health)}<div style="margin-top:7px;color:#5a5546;font-size:13.5px">${esc(r.wellness)}</div>`)}

      ${S('🎨 Today&rsquo;s kit', '#6f8bb0', `
        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tr>
          <td style="padding:0 10px 8px 0;vertical-align:top;width:50%">
            <div style="font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#8c877c;margin-bottom:4px">Color</div>
            <div><span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${esc(r.colorHex || '#cb9c58')};vertical-align:middle;margin-right:6px"></span><b style="color:#20211d">${esc(r.color)}</b></div>
          </td>
          <td style="padding:0 0 8px 0;vertical-align:top;width:50%">
            <div style="font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#8c877c;margin-bottom:4px">Food</div>
            <div style="color:#20211d">${esc(r.food)}</div>
          </td>
        </tr></table>
        <div style="color:#5a5546;font-size:13.5px">${esc(kit)}</div>`)}

      ${S('🔑 One move today', '#b0803f', `<b style="color:#20211d">${esc(move)}</b><div style="margin-top:7px;color:#8c877c;font-size:13px">${esc(weekday)}</div>`)}

      ${voidNote ? `<tr><td style="padding:14px 28px 0">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
          <td style="border-left:3px solid #7d8bc0;background:#f6f7fc;border-radius:0 12px 12px 0;padding:13px 16px">
            <div style="font:600 10.5px/1 ui-monospace,Menlo,monospace;letter-spacing:.15em;text-transform:uppercase;color:#6f7db3;margin-bottom:7px">🌙 The year</div>
            <div style="font:14.5px/1.62 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#3a372f">${esc(voidNote.replace(/^🌙\s*/,""))}</div>
          </td></tr></table>
      </td></tr>` : ''}

      ${adBlock}

      ${prov ? `<tr><td style="padding:16px 28px 0">
        <div style="border:1px solid #ece5d6;border-radius:10px;padding:11px 14px;background:#fcfaf4">
          <div style="font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.13em;text-transform:uppercase;color:#b0a684;margin-bottom:6px">How today was computed · not guessed</div>
          <div style="font:12.5px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#8a8578">${esc(prov)}</div>
        </div></td></tr>` : ''}

      <tr><td style="padding:18px 28px 4px">
        <a href="${esc(calUrl)}" style="display:block;text-align:center;background:#20211d;color:#f3efe6;text-decoration:none;border-radius:12px;padding:13px 18px;font:600 14px -apple-system,Segoe UI,Roboto,Arial,sans-serif">See your whole month → the full calendar (Pro)</a>
      </td></tr>
      <tr><td style="padding:12px 28px 0;text-align:center">
        <div style="font:12px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#9a958a;margin-bottom:6px">
          Know someone who would love this? Share Numinous:
        </div>
        <div style="font:600 13px/1.9 -apple-system,Segoe UI,Roboto,Arial,sans-serif;white-space:nowrap">
          <a href="${esc(shareX)}" style="color:#a5731f;text-decoration:underline">X</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${esc(shareFb)}" style="color:#a5731f;text-decoration:underline">Facebook</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${esc(shareLi)}" style="color:#a5731f;text-decoration:underline">LinkedIn</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${esc(shareWa)}" style="color:#a5731f;text-decoration:underline">WhatsApp</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${esc(shareMail)}" style="color:#a5731f;text-decoration:underline">Email</a>
        </div>
      </td></tr>
      <tr><td style="padding:14px 28px 22px">
        <div style="font:italic 14px/1.6 'Iowan Old Style',Palatino,Georgia,serif;color:#6b6459;border-top:1px solid #efe9dd;padding-top:14px">
          Written for you, from your own chart. I'll run alongside you.<br>— Numinous
        </div>
      </td></tr>
      <tr><td style="padding:0 28px 24px">
        <div style="font:11px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#9a958a;border-top:1px solid #efe9dd;padding-top:14px">
          You're receiving this because you asked Numinous to write you a morning letter.
          It's free and always will be — <a href="${esc(unsubUrl)}" style="color:#8a856f">unsubscribe in one tap</a>
          · <a href="${esc(dataUrl)}" style="color:#8a856f">manage your data</a>.<br>
          ${esc(cfg.orgName)} · ${esc(cfg.orgAddress)}<br>
          Numinous is a tool for self-reflection and timing — not fortune-telling, and not medical, legal or financial advice.
        </div></td></tr>
    </table>
  </td></tr></table></body></html>`;

  return { subject, html, text, unsubUrl };
}

// async wrapper: try the LLM coach polish, fall back to deterministic prose.
async function composeBriefingAI(sub, r, cfg, ad = null, date = new Date()) {
  const { coachPolish } = require('./coach-ai');
  let ai = null;
  try { ai = await coachPolish(briefingFacts(sub, r, date)); } catch (_) { ai = null; }
  return composeBriefing(sub, r, cfg, ad, date, ai);
}

module.exports = { composeBriefing, composeBriefingAI, briefingFacts };
