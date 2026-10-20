/* =============================================================================
   coach-ai.js — optional LLM "coach polish" that stays faithful to the engine
   -----------------------------------------------------------------------------
   OFF by default. Turn on with LETTER_AI=1 + GEMINI_API_KEY set.

   The engine remains the single source of truth. This module NEVER invents a
   fact: it receives the values DayFortune already computed (rank verdict, ten
   god, favorable vs day element, vitality energy, flags, color, food, business
   action, the reader's own blindspot/edge) and asks Gemini ONLY to rephrase
   them into warm, concrete, plain-English executive-coaching prose. The model
   is explicitly forbidden to add numbers, directions, or any new claim; the
   legal footer and links are appended in letter code and never sent to the LLM,
   so compliance can't be broken by a model.

   Scale: content depends only on the SITUATION (a small set of computed
   values + date), not on identity — so we cache by a situation hash. Thousands
   of subscribers who share today's situation cost ONE generation, which keeps
   the LLM bill sublinear as the list grows. On any error/timeout the caller
   falls back to the deterministic letter, so a Gemini outage never stops mail.
   ============================================================================= */
'use strict';
const crypto = require('crypto');
const cfg = require('./config');

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ENDPOINT = (key) => `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
const cache = new Map();               // situationHash -> sections (per process)
const MAX_CACHE = 5000;

const SECTIONS = ['bottom', 'business', 'love', 'health', 'move'];

function situationHash(facts) {
  // everything that determines the copy — but NOT the subscriber's identity
  const k = [facts.rankKey, facts.headline, facts.favorable, facts.dayElement, facts.tenGod,
    facts.energyTier, facts.flags.join(','), facts.color, facts.food, facts.bizAction,
    facts.dayMaster, facts.strength, facts.dateKey].join('|');
  return crypto.createHash('sha1').update(k).digest('hex');
}

function buildPrompt(f) {
  return `You are an executive coach writing ONE person's short morning briefing for a US business audience. Rewrite the facts into warm, direct, plain American English.
HARD RULES:
- Use ONLY the facts provided. Never invent numbers, lucky directions, times, or any new claim.
- Plain English only. NEVER use Japanese terms, romanized terms (like "sanhe", "peach blossom"), element names, or astrology/horoscope voice. A skeptical executive should find every line practical.
- Keep each section IN ITS LANE: 'health' is body/energy ONLY (never mention color or food — those live elsewhere). 'love' is people/relationships ONLY. 'business' is work ONLY.
- Concrete and immediately doable. Each section 1-2 sentences, speaking to "you". Confident, calm, kind.
Return STRICT JSON with keys: bottom, business, love, health, move. No text outside the JSON.

FACTS:
- Day verdict (honor its direction): "${f.headline}" (a ${f.rankTier} day).
- Outward conditions today: ${f.rankTier}. Their personal energy today: ${f.energyTier}.
- Today's working theme: ${f.tenGodBiz}. Strength to lean on: ${f.tenGodGift}. Watch out for: ${f.tenGodWatch}.
- Their standing default tendency (use this as the coaching hook in 'business'): they tend to ${f.blindspot}. Their growth edge: ${f.edge}.
- People/relationship signal today: ${f.flagText || 'nothing unusual — keep it light'}.
- Suggested concrete work action: ${f.bizAction || 'move your top priority forward'}.

WRITE:
- bottom: one reconciling "bottom line" balancing the outward conditions against their personal energy (e.g. if the day is favorable but energy is low: one big move early, then ease off).
- business: what to do at work today, then one sentence tying it to their default tendency above.
- love: people/relationships today (use the signal).
- health: body and energy only.
- move: one specific action to take today.`;
}

function parseJson(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]);
    if (SECTIONS.every(k => typeof o[k] === 'string' && o[k].trim())) return o;
  } catch (_) {}
  return null;
}

async function callGemini(prompt, key, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(ENDPOINT(key), {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // thinkingBudget:0 — 2.5-flash otherwise spends the token budget on
        // hidden reasoning and truncates the JSON (finishReason MAX_TOKENS).
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) return null;
    const d = await r.json();
    return parseJson(d.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (_) { return null; } finally { clearTimeout(t); }
}

/**
 * Returns {bottom,business,love,health,move} rewritten by the LLM, or null to
 * signal the caller to use the deterministic letter. Cached by situation.
 */
async function coachPolish(facts) {
  const key = cfg.geminiKey;
  if (!cfg.letterAI || !key) return null;
  const h = situationHash(facts);
  if (cache.has(h)) return cache.get(h);
  const out = await callGemini(buildPrompt(facts), key);
  if (out) {
    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(h, out);
  }
  return out;
}

module.exports = { coachPolish, situationHash };
