/* smoke.js — end-to-end of the PURE core (engine → reading → letter), no deps.
   Runs with zero npm install so you can verify the founder's logic produces a
   real, compliant letter before wiring the DB/mailer. `npm run smoke`. */
'use strict';
const assert = require('assert');
const { buildChart, todaysReading } = require('../src/engine');
const { compose } = require('../src/letter');
const { composeBriefing } = require('../src/letter-briefing');

const birth = { date: '1988-07-13', time: '09:00', sex: 'F', lon: -118.24, off: -8, dst: true, place: 'Los Angeles, USA' };
const chart = buildChart(birth);
assert.ok(chart.favorable, 'chart should have a favorable element (用神)');

const day = new Date('2026-07-17T12:00:00');
const reading = todaysReading(chart, day);
assert.ok(reading.headline && reading.rankEN, 'reading should have a headline + rank');

const sub = {
  email: 'test@example.com', nickname: 'Rie', plan: 'free',
  unsubscribe_token: 'unsub-token-123', chart: JSON.stringify(chart)
};
const cfg = { baseUrl: 'https://letters.clarity.app', appUrl: 'https://clarity.app',
  orgName: '72k Inc.', orgAddress: '72k Inc., Tokyo, Japan', fromName: 'Numinous' };

const letter = compose(sub, reading, cfg, null, day);
assert.ok(letter.subject.includes('Rie'), 'subject should address the reader by name');
assert.ok(/unsubscribe\?t=unsub-token-123/.test(letter.html), 'HTML must carry the unsubscribe link (CAN-SPAM)');
assert.ok(letter.html.includes('72k Inc., Tokyo, Japan'), 'HTML must carry the postal address (CAN-SPAM)');
assert.ok(!/horoscope|fortune-tell/i.test(letter.text.replace('not fortune-telling', '')), 'voice: no fortune-telling framing');

// 365-day variety: every day's letter must be unique (date line stripped),
// no two consecutive days identical, no template variable leaking as "undefined"
{
  const crypto = require('crypto');
  const seen = new Set(); let prev = null;
  for (let i = 0; i < 365; i++) {
    const dd = new Date(2026, 6, 18 + i, 12);
    const L = compose(sub, todaysReading(chart, dd), cfg, null, dd);
    assert.ok(!/undefined/.test(L.subject + L.text), 'no "undefined" may leak into a letter');
    const core = L.text.split('\n').filter(l => !/^\w+day, /.test(l) && !l.includes('·')).join('\n');
    const h = crypto.createHash('md5').update(core).digest('hex');
    assert.notStrictEqual(h, prev, 'consecutive days must differ');
    seen.add(h); prev = h;
  }
  assert.strictEqual(seen.size, 365, 'all 365 letters must be unique (got ' + seen.size + ')');
  console.log('365-day check (classic): all letters unique, no consecutive repeats ✓');
}
// same full-year guarantee for the sectioned briefing template
{
  const crypto = require('crypto');
  const seen = new Set(); let prev = null;
  for (let i = 0; i < 365; i++) {
    const dd = new Date(2026, 6, 18 + i, 12);
    const L = composeBriefing(sub, todaysReading(chart, dd), cfg, null, dd);
    assert.ok(!/undefined/.test(L.subject + L.text), 'briefing: no "undefined" may leak');
    assert.ok(/unsubscribe\?t=/.test(L.html) && L.html.includes(cfg.orgAddress), 'briefing: CAN-SPAM footer required');
    const core = L.text.split('\n').filter(l => !/^\w+day, /.test(l) && !l.includes('·')).join('\n');
    const h = crypto.createHash('md5').update(core).digest('hex');
    assert.notStrictEqual(h, prev, 'briefing: consecutive days must differ');
    seen.add(h); prev = h;
  }
  assert.strictEqual(seen.size, 365, 'briefing: all 365 letters must be unique (got ' + seen.size + ')');
  console.log('365-day check (briefing): all letters unique, no consecutive repeats ✓');
}

console.log('用神(favorable):', chart.favorable, '| dayMaster:', chart.dayMaster, chart.dayMasterElement);
console.log('Today:', reading.emoji, reading.rankEN, '—', reading.headline);
console.log('Subject:', letter.subject);
console.log('\n--- text letter ---\n' + letter.text);
console.log('\n✅ smoke passed: engine → reading → compliant, personalized letter');
