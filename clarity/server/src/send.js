/* =============================================================================
   send.js — the morning delivery run
   -----------------------------------------------------------------------------
   sendDue(atHour): for every active subscriber whose LOCAL clock is now at
   their send_hour, compute today's reading from their stored chart, compose the
   letter, and send it. Idempotent per local day via last_sent_on, so running
   the job twice (or a retry) never double-sends.

   Meant to be invoked once an hour (see send-morning.js / README §Cron): each
   run catches the timezones that just hit their send hour, so one hourly job
   serves the whole world without per-user timers.
   ============================================================================= */
'use strict';
const cfg = require('./config');
const db = require('./db');
const mailer = require('./mailer');
const { todaysReading } = require('./engine');
const { compose } = require('./letter');
const { composeBriefing, composeBriefingAI } = require('./letter-briefing');
const { getAdFor } = require('./ads');

// The subscriber's local hour and calendar day, from an IANA timezone.
function localParts(tz, now = new Date()) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, hour: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).reduce((o, x) => (o[x.type] = x.value, o), {});
  const hour = Number(p.hour) % 24;
  return { hour, day: `${p.year}-${p.month}-${p.day}`, localDate: new Date(`${p.year}-${p.month}-${p.day}T12:00:00`) };
}

async function sendOne(sub, now = new Date()) {
  const { day, localDate } = localParts(sub.timezone, now);
  if (sub.last_sent_on === day) return { skipped: 'already-sent' };
  let chart;
  try { chart = JSON.parse(sub.chart); } catch { return { skipped: 'no-chart' }; }
  const reading = todaysReading(chart, localDate);
  const ad = getAdFor(sub, localDate);          // null until you turn ads on
  let msg;
  if (cfg.letterTemplate === 'classic') msg = compose(sub, reading, cfg, ad, localDate);
  else if (cfg.letterAI) msg = await composeBriefingAI(sub, reading, cfg, ad, localDate);
  else msg = composeBriefing(sub, reading, cfg, ad, localDate);
  try {
    const res = await mailer.send({ to: sub.email, ...msg });
    db.markSent(sub.id, day);
    return { ok: true, id: res.id };
  } catch (e) {
    if (e.inactiveRecipient) { db.markBounced(sub.id); return { bounced: true }; }
    throw e; // transient — leave last_sent_on unset so the next hourly run retries
  }
}

// small concurrency limiter so a big list doesn't open thousands of sockets
async function pool(items, n, worker) {
  const results = []; let i = 0;
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { results[idx] = await worker(items[idx]); }
      catch (e) { results[idx] = { error: e.message }; }
    }
  });
  await Promise.all(runners);
  return results;
}

async function sendDue(atHour, now = new Date()) {
  // Normal hourly run (no atHour): a subscriber is due when THEIR OWN local
  // clock reads their send_hour — so one hourly job serves every timezone.
  // (Filtering by the SERVER's hour here was the old bug: with everyone on
  // send_hour=5 it only ever matched during the server's 5 o'clock hour.)
  // Forced run (--hour H): everyone whose send_hour is H, clocks ignored —
  // for testing and same-day backfill; last_sent_on still prevents doubles.
  const candidates = atHour != null
    ? db.dueByHour(atHour)
    : db.allActive().filter(s => localParts(s.timezone, now).hour === s.send_hour);
  const results = await pool(candidates, cfg.sendConcurrency, (s) => sendOne(s, now));
  const sent = results.filter(r => r && r.ok).length;
  const bounced = results.filter(r => r && r.bounced).length;
  const errors = results.filter(r => r && r.error).length;
  return { hour: atHour != null ? atHour : 'local', candidates: candidates.length, sent, bounced, errors };
}

module.exports = { sendDue, sendOne, localParts };
