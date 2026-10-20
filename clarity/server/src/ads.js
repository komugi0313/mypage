/* =============================================================================
   ads.js — sponsor slot for the morning letter (future revenue)
   -----------------------------------------------------------------------------
   The free letter is a reach/awareness channel. Once the list is large (the
   founder's target: 1–2M), a single tasteful sponsor line per letter becomes
   real ad revenue without charging readers. This module decides whether — and
   which — sponsor block to show; letter.js renders it only when this returns
   non-null, so ads stay completely invisible until you switch them on.

   Turn on by setting ADS_ENABLED=1 and filling CAMPAIGNS below (or load them
   from your DB / an ad network). Keep it to ONE short block; never make the
   letter feel like a billboard. Respect plan if you like (e.g. Pro = no ads).
   ============================================================================= */
'use strict';

const ENABLED = process.env.ADS_ENABLED === '1';

// Example house/sponsor campaigns. Replace with your inventory or a network.
const CAMPAIGNS = [
  // { id:'sponsor-x', html:'<a href="https://…" style="color:#20211d">Sponsor line — one clean sentence.</a>' }
];

/** @returns {null | {id?:string, html:string}} */
function getAdFor(sub, date) {
  if (!ENABLED || CAMPAIGNS.length === 0) return null;
  if (sub.plan === 'pro') return null; // optional: keep Pro ad-free
  // Deterministic pick from the day so a reader sees a stable ad that rotates daily.
  const idx = (date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate()) % CAMPAIGNS.length;
  return CAMPAIGNS[idx];
}

module.exports = { getAdFor, ENABLED };
