/* =============================================================================
   ai-proxy.js — server-side proxy for the app's readings/chat
   -----------------------------------------------------------------------------
   Lets the app run with NO API key or provider name anywhere in the UI: the
   client builds its prompt and POSTs the request here; the server calls the
   language model with its OWN key (never exposed) and returns { text }. This is
   what BACKEND.USE_PROXY=true in app.html expects, so flipping that flag makes
   the "API key" box and every provider mention disappear from the product.

   - Key lives only in env (GEMINI_API_KEY); the client never sees it.
   - The model name is chosen here, so it never appears client-side either.
   - Fair-use limit is server-authoritative: over the cap → HTTP 429 (the app
     already shows its calm "you've reached today's limit" message on 429).
   ============================================================================= */
'use strict';
const cfg = require('./config');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Founder-set fair-use caps, per client per day (Four Pillars + I Ching +
// advisor chat combined): 5 during the trial, 30 on a paid plan.
const CAP_TRIAL = Number(process.env.READING_DAILY_CAP_TRIAL || 5);
const CAP_PRO   = Number(process.env.READING_DAILY_CAP_PRO || 30);
const usage = new Map(); // key -> { day, n }

function clientKey(req) {
  // prefer the app's session token; fall back to IP
  const auth = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  return auth || req.ip || 'anon';
}
/* Which cap applies to this client?
   ENGINEER WIRE-UP (billing): make this return 'pro' for clients whose store
   receipt / account is on an active paid plan — e.g. look the session token up
   in your entitlement store (RevenueCat webhook → db.setPlan). Until that is
   wired, everyone gets the trial cap, so a client can never talk itself into
   the higher limit. */
function resolvePlan(req) {
  return 'trial';
}
function capFor(req) { return resolvePlan(req) === 'pro' ? CAP_PRO : CAP_TRIAL; }
function overCap(req) {
  const k = clientKey(req);
  const day = new Date().toISOString().slice(0, 10);
  const u = usage.get(k);
  if (!u || u.day !== day) { usage.set(k, { day, n: 1 }); return false; }
  if (u.n >= capFor(req)) return true;
  u.n++; return false;
}

async function callModel(payload) {
  // pass through the client's contents/systemInstruction/generationConfig, but
  // clamp output and force no-thinking so the JSON/latency stay predictable.
  const gen = Object.assign({}, payload.generationConfig, {
    maxOutputTokens: Math.min(2048, (payload.generationConfig && payload.generationConfig.maxOutputTokens) || 2000),
    thinkingConfig: { thinkingBudget: 0 }
  });
  const body = { contents: payload.contents, generationConfig: gen };
  if (payload.systemInstruction) body.systemInstruction = payload.systemInstruction;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${cfg.geminiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!r.ok) { const e = new Error('model ' + r.status); e.status = 502; throw e; }
  const d = await r.json();
  const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

function handler(req, res) {
  if (!cfg.geminiKey) return res.status(503).json({ error: 'Readings are temporarily unavailable.' });
  if (overCap(req)) return res.status(429).json({ error: "You've reached today's reading limit. Please come back tomorrow." });
  const payload = req.body || {};
  if (!Array.isArray(payload.contents)) return res.status(400).json({ error: 'bad request' });
  callModel(payload)
    .then(text => res.json({ text }))
    .catch(e => { console.error('ai-proxy', e.message); res.status(e.status || 500).json({ error: 'Reading could not be generated right now.' }); });
}

/** Mounts POST /api/reading and POST /api/chat on the given express app. */
function mount(app) {
  app.post('/api/reading', handler);
  app.post('/api/chat', handler);
}

module.exports = { mount };
