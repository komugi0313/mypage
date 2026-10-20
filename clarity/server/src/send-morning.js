#!/usr/bin/env node
/* =============================================================================
   send-morning.js — CLI entry for the hourly send (run by system cron)
   -----------------------------------------------------------------------------
   Usage:
     node src/send-morning.js            # send to everyone due at the current hour
     node src/send-morning.js --hour 7   # force a specific hour (backfill/testing)
   Run it once an hour (see README §Cron). Prints a one-line JSON summary and
   exits non-zero if any send hit an unexpected error, so cron can alert.
   ============================================================================= */
'use strict';
const { sendDue } = require('./send');

(async () => {
  const i = process.argv.indexOf('--hour');
  const hour = i > -1 ? Number(process.argv[i + 1]) : undefined;
  const summary = await sendDue(hour);
  console.log(JSON.stringify({ at: new Date().toISOString(), ...summary }));
  process.exit(summary.errors > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
