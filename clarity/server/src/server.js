/* =============================================================================
   server.js — HTTP API for the morning letter
   -----------------------------------------------------------------------------
   Endpoints:
     POST /api/subscribe      sign up (double opt-in): stores a PENDING row,
                              computes the chart once, emails a confirm link.
     GET  /confirm?t=…        verify email → status ACTIVE (letters start).
     GET  /unsubscribe?t=…    one-tap opt-out (also accepts POST for the native
                              List-Unsubscribe-Post one-click).
     POST /internal/send-due  cron trigger (X-Cron-Secret) → runs the hour's send.
     GET  /health
   All PII handling lives behind these routes; the static app only calls
   /api/subscribe and never stores email itself.
   ============================================================================= */
'use strict';
const express = require('express');
const cfg = require('./config');
const db = require('./db');
const mailer = require('./mailer');
const { buildChart } = require('./engine');
const { buildChartFull } = require('./engine-full');
const { sendDue } = require('./send');
const aiProxy = require('./ai-proxy');

const app = express();
// Behind Cloud Run / a GCE load balancer the real client IP is in X-Forwarded-For.
// Trust the proxy so req.ip reflects it — we log it as proof-of-consent.
app.set('trust proxy', true);
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false }));

// Version tag of the exact opt-in statement the signup form presents. Bump this
// string whenever that wording changes, so each stored consent points at what
// the user actually agreed to. (The full text lives in the app + terms.html.)
const CONSENT_REF = 'morning-letter-optin-v1';
const clientIp = (req) => (req.ip || (req.socket && req.socket.remoteAddress) || '').replace(/^::ffff:/, '');

// CORS: allow the app/LP origin to POST the signup form.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', cfg.appUrl);
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const page = (title, body) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><body style="margin:0;background:#f3efe6;font:16px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#20211d">
<div style="max-width:460px;margin:14vh auto;background:#fffdf8;border:1px solid #e7e0d3;border-radius:18px;padding:34px 30px;text-align:center">
<div style="font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:#a99461">Numinous · from Japan</div>
${body}</div></body>`;

function confirmEmail(sub) {
  const url = `${cfg.baseUrl}/confirm?t=${encodeURIComponent(sub.confirm_token)}`;
  const name = (sub.nickname || '').trim();
  return {
    to: sub.email,
    subject: `${name ? name + ', ' : ''}confirm your morning letter`,
    text: `${name ? 'Hi ' + name + ',' : 'Hi,'}\n\nConfirm this address and your free morning letter — written for you from your own chart — starts tomorrow:\n${url}\n\nIf you didn't ask for this, ignore this email and nothing will be sent.\n\n${cfg.orgName} · ${cfg.orgAddress}`,
    html: page('Confirm', `<h1 style="font:600 22px/1.3 'Iowan Old Style',Palatino,Georgia,serif;margin:12px 0">Confirm your morning letter</h1>
      <p style="color:#5a5546">One tap and your free daily letter — written for you from your own chart — begins tomorrow morning.</p>
      <a href="${url}" style="display:inline-block;margin-top:10px;background:#20211d;color:#f3efe6;text-decoration:none;border-radius:12px;padding:13px 22px;font-weight:600">Confirm &amp; start</a>
      <p style="font-size:12px;color:#9a958a;margin-top:18px">Didn't ask for this? Ignore this email — nothing will be sent.<br>${cfg.orgName} · ${cfg.orgAddress}</p>`)
  };
}

app.post('/api/subscribe', async (req, res) => {
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
    if (b.consent !== true) return res.status(400).json({ error: 'Consent is required to send you email.' });
    if (!b.birthDate) return res.status(400).json({ error: 'Birth date is required to build your chart.' });

    const birth = {
      date: String(b.birthDate),
      time: b.birthTime ? String(b.birthTime) : '',
      sex: b.sex === 'F' ? 'F' : 'M',
      lon: b.lon != null ? Number(b.lon) : null,
      off: b.off != null ? Number(b.off) : null,
      dst: !!b.dst,
      place: b.place ? String(b.place) : ''
    };
    let chart = null;
    try {
      // Correctness over availability: the full engine is authoritative. If it
      // can't run we do NOT fall back to a heuristic chart — we ask the user to
      // retry, so a wrong chart is never stored.
      chart = cfg.chartEngine === 'full' ? await buildChartFull(birth) : buildChart(birth);
    } catch (e) {
      if (cfg.chartEngine === 'full') { console.error('full-engine chart failed', e.message); return res.status(503).json({ error: 'We could not compute your chart just now. Please try again in a moment.' }); }
      return res.status(400).json({ error: 'Could not read that birth data.' });
    }
    if (!chart) return res.status(503).json({ error: 'We could not compute your chart just now. Please try again in a moment.' });

    const { row, alreadyActive } = db.upsertPending({
      email,
      nickname: b.nickname ? String(b.nickname).slice(0, 60) : null,
      gender: b.gender ? String(b.gender).slice(0, 40) : null,
      role: b.role ? String(b.role).slice(0, 40) : null,
      country_of_origin: b.countryOfOrigin ? String(b.countryOfOrigin).slice(0, 60) : null,
      timezone: b.timezone ? String(b.timezone).slice(0, 64) : 'America/New_York',
      send_hour: 5, // unified delivery hour (local 5 a.m. for every subscriber; not user-selectable)
      birth: JSON.stringify(birth),
      chart: JSON.stringify(chart),
      // Proof-of-consent: timestamp + source IP + which opt-in wording was shown.
      consent_at: new Date().toISOString(),
      consent_ip: clientIp(req),
      consent_ref: CONSENT_REF
    });

    if (alreadyActive) return res.json({ ok: true, status: 'already-subscribed' });
    await mailer.send(confirmEmail(row));
    return res.json({ ok: true, status: 'confirm-sent' });
  } catch (e) {
    console.error('subscribe error', e);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.get('/confirm', (req, res) => {
  const sub = db.byConfirmToken(String(req.query.t || ''));
  if (!sub) return res.status(404).send(page('Link expired', `<h1 style="font:600 22px 'Iowan Old Style',Palatino,serif">This link has expired</h1><p style="color:#5a5546">Sign up again from the app and we'll send a fresh confirmation.</p>`));
  db.confirm(sub.id);
  return res.send(page('Confirmed', `<h1 style="font:600 22px 'Iowan Old Style',Palatino,serif;margin:12px 0">You're all set${sub.nickname ? ', ' + sub.nickname : ''}.</h1>
    <p style="color:#5a5546">Your first morning letter — written for you from your own chart — arrives tomorrow. It's free, and it stays free.</p>
    <a href="${cfg.appUrl}" style="display:inline-block;margin-top:10px;background:#20211d;color:#f3efe6;text-decoration:none;border-radius:12px;padding:12px 22px;font-weight:600">Open Numinous</a>`));
});

function doUnsub(req, res) {
  const sub = db.byUnsubToken(String((req.query && req.query.t) || (req.body && req.body.t) || ''));
  if (sub) db.unsubscribe(sub.id);
  return res.send(page('Unsubscribed', `<h1 style="font:600 22px 'Iowan Old Style',Palatino,serif;margin:12px 0">You're unsubscribed</h1>
    <p style="color:#5a5546">No more letters will be sent. You're always welcome back — thank you for reading.</p>`));
}
app.get('/unsubscribe', doUnsub);
app.post('/unsubscribe', doUnsub); // List-Unsubscribe-Post one-click

// --- Data management (CPRA/GDPR/APPI): let a reader see and erase the OPTIONAL
// profile they gave us (nickname, gender, role, country of origin). These can be
// sensitive (gender identity, origin), so we offer self-serve deletion in addition
// to the email contact in privacy.html. Reachable with the unsubscribe token that
// every letter carries — no separate login. Birth data (needed to build the chart
// the reader asked for) is not touched here; full deletion is via unsubscribe/contact.
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function dataRow(label, value) {
  return `<tr><td style="padding:7px 0;color:#8c877c;font-size:13px">${label}</td>
    <td style="padding:7px 0;text-align:right;color:#20211d;font-size:14px">${value ? esc(value) : '<span style="color:#b3ad9f">—</span>'}</td></tr>`;
}
app.get('/data', (req, res) => {
  const sub = db.byUnsubToken(String(req.query.t || ''));
  if (!sub) return res.status(404).send(page('Link expired', `<h1 style="font:600 22px 'Iowan Old Style',Palatino,serif">This link has expired</h1><p style="color:#5a5546">Open a recent letter and use its “Manage your data” link.</p>`));
  const t = encodeURIComponent(sub.unsubscribe_token);
  const anyAttr = sub.nickname || sub.gender || sub.role || sub.country_of_origin;
  return res.send(page('Your data', `<h1 style="font:600 22px/1.3 'Iowan Old Style',Palatino,Georgia,serif;margin:12px 0">Your optional profile</h1>
    <p style="color:#5a5546;font-size:14px">These are the optional details you shared. You can erase them at any time. Your email and the birth data used to build your chart are kept so your letter can keep arriving — to stop the letter entirely, use <a href="${cfg.baseUrl}/unsubscribe?t=${t}" style="color:#8a856f">unsubscribe</a>.</p>
    <table width="100%" style="margin:14px 0;border-top:1px solid #efe9dd">
      ${dataRow('Name / nickname', sub.nickname)}
      ${dataRow('Gender', sub.gender)}
      ${dataRow('Attribute / role', sub.role)}
      ${dataRow('Country of origin', sub.country_of_origin)}
    </table>
    ${sub.attributes_forgotten_at
      ? `<p style="color:#6b6459;font-size:13px">These optional details were already erased on ${esc(sub.attributes_forgotten_at.slice(0,10))}.</p>`
      : anyAttr
        ? `<form method="POST" action="${cfg.baseUrl}/data/forget"><input type="hidden" name="t" value="${esc(sub.unsubscribe_token)}">
           <button type="submit" style="display:inline-block;margin-top:6px;background:#20211d;color:#f3efe6;border:0;border-radius:12px;padding:12px 22px;font-weight:600;cursor:pointer">Erase my optional profile</button></form>
           <p style="color:#9a958a;font-size:12px;margin-top:12px">This limits what we keep about you (name, gender, role, origin). It can’t be undone; your letter keeps arriving.</p>`
        : `<p style="color:#6b6459;font-size:13px">You haven’t shared any optional profile details.</p>`}`));
});
function doForget(req, res) {
  const tok = String((req.body && req.body.t) || (req.query && req.query.t) || '');
  const sub = db.byUnsubToken(tok);
  if (sub) db.forgetAttributes(sub.id);
  return res.send(page('Erased', `<h1 style="font:600 22px 'Iowan Old Style',Palatino,serif;margin:12px 0">Your optional profile is erased</h1>
    <p style="color:#5a5546">We’ve removed the name, gender, role and origin you shared. Your morning letter keeps arriving from your chart. To stop it entirely, use the unsubscribe link in any letter.</p>`));
}
app.post('/data/forget', doForget);

app.post('/internal/send-due', async (req, res) => {
  if (!cfg.cronSecret || req.get('X-Cron-Secret') !== cfg.cronSecret) return res.sendStatus(401);
  const hour = req.query.hour != null ? Number(req.query.hour) : undefined;
  try { res.json(await sendDue(hour)); }
  catch (e) { console.error('send-due error', e); res.status(500).json({ error: e.message }); }
});

aiProxy.mount(app); // POST /api/reading, /api/chat — key stays server-side

app.get('/health', (_req, res) => res.json({ ok: true }));

if (require.main === module) {
  app.listen(cfg.port, () => console.log(`Numinous letters API on :${cfg.port} (provider=${cfg.provider})`));
}
module.exports = app;
