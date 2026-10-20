/* =============================================================================
   letter.js — compose the morning letter from a chart's daily reading
   -----------------------------------------------------------------------------
   Voice rules (must hold — this is the brand):
     · counsel & timing, NOT fortune-telling. Avoid "luck/fortune/horoscope".
     · addressed to one person, by name. Never "Dear subscriber".
     · one clear thing to do, one thing to hold. Calm, not hype.

   365-day variety, faithful to the engine:
   Every sentence traces to a value DayFortune actually computed for that
   subscriber on that day — the sexagenary day pillar (60-day cycle), the
   day's ten god (founder's own business lexicon, lexicon.js), the 十二運
   vitality stage (12), the flags (nobleman, peach-blossom, clash, void,
   三合/六合/干合), and the engine's verdict headline, which is quoted
   VERBATIM. On top of that, framing sentences rotate deterministically by
   date (no randomness — the same person on the same day always gets the
   same letter), so even two days with the same rank read differently.

   Compliance (must hold — US CAN-SPAM):
     · every letter carries a working 1-click unsubscribe link,
     · a real physical postal address, and an honest "why you got this".
   Monetization hook (future): an optional sponsor slot renders only when an ad
   object is passed in — invisible until you turn it on (see README §Ads).
   ============================================================================= */
'use strict';

const path = require('path');
const { TENGODS } = require(path.resolve(__dirname, '..', '..', 'lexicon.js'));

const EL_JP = { Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水' };
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Strip any parenthetical that contains CJK, and any stray CJK run, from an
// engine-provided string — so special-day headlines/notes (天地徳合, 三合,
// 劫殺/亡神…) read as plain English in the letter body. Tidies leftover spaces.
const CJK = /[　-〿぀-ヿ㐀-䶿一-鿿＀-￯]/;
function deJargon(s) {
  if (!s) return s;
  return String(s)
    .replace(/[（(][^)）]*[)）]/g, (m) => (CJK.test(m) ? '' : m))
    .replace(new RegExp(CJK.source, 'g'), '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+\/\s+/g, ' ')      // collapse a slash orphaned between two removed terms
    .replace(/\s+([,.;:])/g, '$1')  // tidy space before punctuation (NOT before —/–)
    .replace(/\s{2,}/g, ' ').trim();
}

// deterministic per-date index — same person + same day ⇒ same letter, always.
// The multiplicative mix (splitmix-style) decorrelates the 60-day pillar cycle
// from the variant pools, so repeated ganzhi days don't repeat their framing.
const seedOf = (date) => date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
function pick(seed, salt, arr) {
  let x = (seed + salt * 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0x45d9f3b) >>> 0;
  return arr[((x ^ (x >>> 16)) >>> 0) % arr.length];
}

// ---- weekday closers: 7 lines, and 7 is coprime with the 60-day pillar cycle
// (60×7 = 420 days), which guarantees no two letters in a year read the same --
const WEEKDAY_LINES = [
  'It\'s Sunday — let the day be wider than the to-do list.',                 // 0
  'It\'s Monday — set the week\'s one priority while the week is still soft.',// 1
  'It\'s Tuesday — the week is real now; match it with one real step.',       // 2
  'It\'s Wednesday — midweek: a good day to correct course, not to judge it.',// 3
  'It\'s Thursday — finish one thing properly before starting another.',      // 4
  'It\'s Friday — close the week\'s loops; unfinished things get heavy over weekends.', // 5
  'It\'s Saturday — the chart applies to rest as much as work; spend it deliberately.'  // 6
];

// ---- rotating openers (framing only; carries no reading content) -------------
const OPENERS = [
  'Before the day picks up speed, here is how it lies for you.',
  'A quiet minute before everything starts — this is your day, read plainly.',
  'The day has its own weather. Here is yours.',
  'Read this with your coffee; it only takes a minute.',
  'Every day arrives with its own character. Today\'s, for you:',
  'One page, just for you, before the first meeting claims you.',
  'Here is the shape of your day — so you can spend it on purpose.',
  'The same sky, a different day. This one is yours.',
  'Before the inbox wins, thirty seconds on what today favors.',
  'Your chart is fixed; the days move around it. Today moves like this.'
];

// ---- rank framing: 3 rotating lead-ins per rank; the engine's verdict
//      (r.headline) is then quoted verbatim — never altered -------------------
const RANK_FRAMES = [
  [ 'A rare, wide-open window today.', 'Days like this are scarce — treat it accordingly.', 'The strongest kind of day your chart gets.' ],                    // 0 🌈
  [ 'The current is clearly with you.', 'A genuinely strong day.', 'Today leans your way.' ],                                                                   // 1 🌸
  [ 'A tailwind day.', 'Things move a little easier than usual today.', 'The day gives more than it asks.' ],                                                   // 2 🟢
  [ 'An even, workable day.', 'No drama in the day — which is its own gift.', 'A plain day; plain days reward plain work.' ],                                    // 3 ⚪
  [ 'A day to keep the load light.', 'The day asks for a lighter touch.', 'Not a day to force anything.' ],                                                      // 4 🟡
  [ 'A recovery day.', 'The day favors restoring over pushing.', 'Today refills the tank rather than spending it.' ],                                            // 5 🟠
  [ 'A guarded day.', 'The day pushes back — plan around it.', 'Friction is the theme; make it cost you nothing.' ]                                              // 6 🔴
];

// ---- 十二運 (12-stage vitality cycle) — one line per stage, aligned with the
//      engine's junniEnergy (high = push, low = restore) ----------------------
const JUNNI_LINES = {
  '長生': 'vitality is fresh and rising — good soil for anything you start',
  '沐浴': 'a changeable, restless stage — feelings run ahead of facts today',
  '冠帯': 'confidence dresses well today — step into the room like you belong',
  '建禄': 'steady, earned strength — your competence carries further than charm',
  '帝旺': 'the peak of the cycle — full power, so pick what deserves it',
  '衰':   'the energy softens — consolidate rather than expand',
  '病':   'a low-vitality stage — pace yourself and keep the day humane',
  '死':   'stillness in the cycle — reflect, close things, don\'t launch',
  '墓':   'a storing stage — file, archive, bank what you\'ve built',
  '絶':   'the emptiest point of the cycle — rest is productive today',
  '胎':   'something new is quietly forming — protect it, don\'t announce it',
  '養':   'a nurturing stage — feed what\'s young: projects, ties, yourself'
};

// ---- flag callouts — only rendered when the engine set the flag --------------
function flagLines(r) {
  const out = [];
  const f = r.flags || {};
  if (f.noble)      out.push('A nobleman day (天乙貴人): help arrives easily — ask for the favor, make the intro.');
  if (f.peach)      out.push('Peach-blossom runs today (桃花): your presence lands — show your face, post, present.');
  if (f.ganhe || f.liuhe) out.push('A connection day (縁): ties form easily — reach out first, take the meeting.');
  if (f.chongToDay || f.clash) out.push('A head-on clash (冲) runs through today: expect a wobble, double-book nothing important.');
  if (f.isVoid)     out.push('A void day (空亡): keep the stakes small and the promises few.');
  return out.slice(0, 2); // never more than two — the letter stays short
}

// Subject lines keyed to the day's rank (DayFortune RANKS index 0=🌈 … 6=🔴),
// with rotating variants per rank — honest, never clickbait.
const SUBJECTS = [
  [ 'a rare open window today', 'today opens wide for you', 'the strongest kind of day',
    'this is the window — use it', 'a day worth clearing the deck for', 'today, the doors are open' ],
  [ 'today runs with you', 'the current is with you today', 'a genuinely strong day',
    'a green-light day', 'today carries you — push', 'a day that backs your move' ],
  [ 'a good day to make the move', 'a tailwind kind of day', 'today gives more than it asks',
    'the day leans your way', 'a little easier than usual today', 'today rewards the doer' ],
  [ 'steady today — one clean step', 'an even day; use it plainly', 'a workable, quiet-engine day',
    'no drama today — good', 'a plain day for honest work', 'steady hands win today' ],
  [ 'an easy day — hold the big calls', 'keep it light today', 'a lighter-touch day',
    'go gently today', 'small moves only today', 'today asks for a soft grip' ],
  [ 'a day to restore, on purpose', 'refill the tank today', 'recovery is the work today',
    'rest counts double today', 'a day to bank your energy', 'today, restoring IS progress' ],
  [ 'a quiet day — guard your focus', 'plan around the friction today', 'a guarded day, by design',
    'defend the day; win the week', 'hold your ground today', 'a day to commit to nothing new' ]
];
function subjectFor(name, r, date) {
  const who = name ? `${name}, ` : '';
  const rank = Math.max(0, Math.min(6, r.rank | 0));
  const variants = SUBJECTS[rank];
  if (!date) return who + variants[0];
  // salt with the day pillar too, so back-to-back same-rank days rarely repeat
  const gz = r.ganzhi ? r.ganzhi.charCodeAt(0) + r.ganzhi.charCodeAt(1) : 0;
  return who + pick(seedOf(date), rank * 131 + gz, variants);
}

/**
 * @param {object} sub   subscriber row (nickname, unsubscribe_token, plan, timezone…)
 * @param {object} r     DayFortune.dayFortune() result
 * @param {object} cfg   { baseUrl, appUrl, orgName, orgAddress, fromName }
 * @param {object} [ad]  optional { html } sponsor block (future revenue)
 * @param {Date}   [date]
 */
function compose(sub, r, cfg, ad = null, date = new Date()) {
  const name = sub.nickname && sub.nickname.trim() ? sub.nickname.trim() : 'there';
  const fav = sub.chart && JSON.parse(sub.chart).favorable;
  const seed = seedOf(date);
  const rank = Math.max(0, Math.min(6, r.rank | 0));
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  // don't surface a push-action ("Close the deal") on a hold-back day (rank>=4)
  const move = (rank <= 3 && r.tags && r.tags[0]) ? r.tags[0] : null;
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
  const headline = deJargon(r.headline);
  const note = deJargon(r.note);
  const opener  = pick(seed, 1, OPENERS);
  const frame   = pick(seed, 2 + rank, RANK_FRAMES[rank]);
  const tg      = TENGODS[r.tenGod] || null;   // founder's business lexicon
  const junni   = r.junni ? JUNNI_LINES[r.junni] : null;
  const flags   = flagLines(r);
  const weekday = WEEKDAY_LINES[date.getDay()];

  // ---- plain-text part (deliverability + accessibility) ----------------------
  const text = [
    `Good morning, ${name}.`,
    opener,
    ``,
    `${dateStr} · ${r.ganzhi} — ${r.emoji} ${r.rankEN}`,
    `${frame} ${headline}`,
    fav ? `Your element is ${fav} (${EL_JP[fav]}); today carries ${r.element} (${EL_JP[r.element]}).` : '',
    ``,
    tg ? `Today's current is ${tg.label}: ${tg.biz}. Lean on ${tg.gift}; watch ${tg.watch}.` : '',
    junni ? `In the 12-stage cycle today sits at ${r.junni} (${r.junniEN}) — ${junni}.` : '',
    ...flags,
    note ? `One more note from your chart: ${note}.` : '',
    ``,
    move ? `One move that fits today: ${move}.` : '',
    weekday,
    `A grounding note: ${r.wellness}`,
    `Today's color to keep near you: ${r.color}.`,
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

  // ---- HTML part -------------------------------------------------------------
  const adBlock = ad && ad.html ? `
    <tr><td style="padding:8px 28px 0">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
        <td style="border:1px solid #e7e0d3;border-radius:12px;padding:14px 16px;background:#faf7f0;font:13px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#6b6459">
          <div style="font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#a99461;margin-bottom:6px">Today's sponsor</div>
          ${ad.html}
        </td>
      </tr></table>
    </td></tr>` : '';

  const flagsHtml = flags.map(f =>
    `<div style="font:13.5px/1.55 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#5a5546;margin-top:6px">◦ ${esc(f)}</div>`).join('');

  const html = `<!doctype html><html><body style="margin:0;background:#f3efe6">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3efe6"><tr><td align="center" style="padding:26px 12px">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#fffdf8;border:1px solid #e7e0d3;border-radius:18px;overflow:hidden">
      <tr><td style="padding:24px 28px 6px">
        <div style="font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:#a99461">From Japan · your morning letter</div>
        <div style="font:600 24px/1.25 'Iowan Old Style',Palatino,Georgia,serif;color:#20211d;margin-top:10px">Good morning, ${esc(name)}.</div>
        <div style="font:italic 13.5px/1.5 'Iowan Old Style',Palatino,Georgia,serif;color:#8c877c;margin-top:6px">${esc(opener)}</div>
        <div style="font:13px/1.5 ui-monospace,Menlo,monospace;color:#8c877c;margin-top:8px">${esc(dateStr)} · ${esc(r.ganzhi)}</div>
      </td></tr>
      <tr><td style="padding:14px 28px 0">
        <div style="font:600 17px/1.4 'Iowan Old Style',Palatino,Georgia,serif;color:#20211d">${esc(r.emoji)} ${esc(r.rankEN)} — ${esc(frame)}</div>
        <div style="font:16px/1.65 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#3a372f;margin-top:6px">${esc(headline)}</div>
      </td></tr>
      ${fav ? `<tr><td style="padding:16px 28px 0">
        <div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#5a5546">
          Your element is <b style="color:#20211d">${esc(fav)} ${esc(EL_JP[fav]||'')}</b>; today carries <b>${esc(r.element)} ${esc(EL_JP[r.element]||'')}</b>.
        </div></td></tr>` : ''}
      ${tg || junni || flagsHtml ? `<tr><td style="padding:16px 28px 0">
        <div style="background:#f7f3ea;border-radius:12px;padding:14px 16px">
          <div style="font:600 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#a99461;margin-bottom:8px">Today's current</div>
          ${tg ? `<div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#3a372f"><b style="color:#20211d">${esc(tg.label)}</b> — ${esc(tg.biz)}.<br><span style="color:#5a5546">Lean on ${esc(tg.gift)}; watch ${esc(tg.watch)}.</span></div>` : ''}
          ${junni ? `<div style="font:13.5px/1.55 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#5a5546;margin-top:8px">The 12-stage cycle sits at <b style="color:#20211d">${esc(r.junni)} ${esc(r.junniEN||'')}</b> — ${esc(junni)}.</div>` : ''}
          ${flagsHtml}
          ${note ? `<div style="font:13px/1.55 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#8a6d4f;margin-top:8px">Note from your chart: ${esc(note)}.</div>` : ''}
        </div></td></tr>` : ''}
      ${move ? `<tr><td style="padding:14px 28px 0">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
          <td style="border-left:3px solid #cb9c58;padding:2px 0 2px 14px">
            <div style="font:600 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;color:#a99461">One move that fits today</div>
            <div style="font:16px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#20211d;margin-top:5px">${esc(move)}</div>
          </td></tr></table></td></tr>` : ''}
      <tr><td style="padding:16px 28px 0">
        <div style="background:#f7f3ea;border-radius:12px;padding:14px 16px;font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#5a5546">
          ${esc(weekday)}<br>
          <b style="color:#20211d">A grounding note.</b> ${esc(r.wellness)}
          <div style="margin-top:8px"><span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${esc(r.colorHex||'#cb9c58')};vertical-align:middle;margin-right:6px"></span>Keep <b style="color:#20211d">${esc(r.color)}</b> near you today.</div>
        </div></td></tr>
      ${adBlock}
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

module.exports = { compose, subjectFor, deJargon,
  // shared building blocks for alternative letter templates (letter-briefing.js)
  seedOf, pick, esc, EL_JP, JUNNI_LINES, WEEKDAY_LINES, flagLines };
