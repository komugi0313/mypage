/* config.js — one place for env-driven settings. Nothing secret is hard-coded. */
'use strict';
require('dotenv').config();

const cfg = {
  port:        Number(process.env.PORT || 8080),
  baseUrl:     process.env.BASE_URL   || 'http://localhost:8080', // where THIS server is reachable (confirm/unsub links)
  appUrl:      process.env.APP_URL    || 'https://numinous.app',   // the LP/app (calendar upsell link)
  fromName:    process.env.FROM_NAME  || 'Numinous',
  fromEmail:   process.env.FROM_EMAIL || 'letters@numinous.app',
  orgName:     process.env.ORG_NAME   || '72k Inc.',
  // CAN-SPAM REQUIRES a real, valid physical postal address in every email.
  // (Add the street number / building to complete it — see .env.example.)
  orgAddress:  process.env.ORG_ADDRESS || '72k Inc., Akasaka 8-chome, Minato-ku, Tokyo, Japan',
  // Email provider
  provider:    process.env.MAIL_PROVIDER || 'postmark', // postmark | console
  postmarkToken: process.env.POSTMARK_TOKEN || '',
  postmarkStream: process.env.POSTMARK_STREAM || 'broadcast', // bulk sends use a broadcast stream
  // Which letter layout to send: 'briefing' (sectioned, US business voice)
  // or 'classic' (single-flow letter). Both live in src/letter*.js.
  letterTemplate: process.env.LETTER_TEMPLATE || 'briefing',
  // Chart engine at signup: 'full' runs the founder's real engine headlessly
  // (exact strength/用神/month pillar); 'heuristic' uses bazi.js only. Default full.
  chartEngine: process.env.CHART_ENGINE || 'full',
  playwrightChromium: process.env.PLAYWRIGHT_CHROMIUM || '',
  // Optional LLM 'coach polish' (rephrases the engine's facts; never invents).
  // OFF unless BOTH are set. See src/coach-ai.js and README §AI.
  letterAI:    process.env.LETTER_AI === '1',
  geminiKey:   process.env.GEMINI_API_KEY || '',
  // Ops
  sendConcurrency: Number(process.env.SEND_CONCURRENCY || 20),
  cronSecret:  process.env.CRON_SECRET || '' // protect the /internal/send-due trigger
};

module.exports = cfg;
