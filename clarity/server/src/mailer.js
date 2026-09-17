/* =============================================================================
   mailer.js — send email through a provider, behind a tiny interface
   -----------------------------------------------------------------------------
   send({to, subject, html, text, unsubUrl}) → {ok, id?} | throws on hard fail.
   Default provider is Postmark (HTTP API, no SDK needed — uses global fetch).
   Swap MAIL_PROVIDER for SendGrid/SES by adding a branch here; nothing else in
   the app changes. `console` provider prints instead of sending — used by tests
   and local dry-runs so you can develop with no credentials.
   The List-Unsubscribe headers give Gmail/Apple the native one-click unsubscribe
   button (strongly improves deliverability and is expected for bulk mail).
   ============================================================================= */
'use strict';
const cfg = require('./config');

async function postmark({ to, subject, html, text, unsubUrl }) {
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': cfg.postmarkToken
    },
    body: JSON.stringify({
      From: `${cfg.fromName} <${cfg.fromEmail}>`,
      To: to, Subject: subject, HtmlBody: html, TextBody: text,
      MessageStream: cfg.postmarkStream,
      Headers: unsubUrl ? [
        { Name: 'List-Unsubscribe', Value: `<${unsubUrl}>` },
        { Name: 'List-Unsubscribe-Post', Value: 'List-Unsubscribe=One-Click' }
      ] : []
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Postmark ${res.status}: ${data.Message || 'send failed'}`);
    // ErrorCode 406 = inactive recipient (hard-bounced/suppressed) → caller marks bounced.
    err.inactiveRecipient = data.ErrorCode === 406;
    throw err;
  }
  return { ok: true, id: data.MessageID };
}

async function consoleProvider({ to, subject }) {
  console.log(`[mailer:console] would send "${subject}" → ${to}`);
  return { ok: true, id: 'console' };
}

async function send(msg) {
  if (cfg.provider === 'console' || (cfg.provider === 'postmark' && !cfg.postmarkToken)) {
    return consoleProvider(msg);
  }
  if (cfg.provider === 'postmark') return postmark(msg);
  throw new Error(`Unknown MAIL_PROVIDER: ${cfg.provider}`);
}

module.exports = { send };
