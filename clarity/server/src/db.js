/* =============================================================================
   db.js — subscriber store (SQLite via better-sqlite3)
   -----------------------------------------------------------------------------
   SQLite is chosen so the whole system runs from one file with zero external
   services — perfect for launch and the first hundreds of thousands of rows.
   Every query below is plain SQL, so moving to Postgres at very large scale is
   a swap of this one module, not a rewrite. The daily send reads by
   (status, send_hour); those columns are indexed.
   ============================================================================= */
'use strict';
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '..', 'clarity.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS subscriber (
  id                 TEXT PRIMARY KEY,
  email              TEXT UNIQUE NOT NULL,
  email_verified     INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending',   -- pending|active|unsubscribed|bounced
  plan               TEXT NOT NULL DEFAULT 'free',      -- trialing|free|pro|canceled
  nickname           TEXT,
  gender             TEXT,
  role               TEXT,
  country_of_origin  TEXT,
  timezone           TEXT NOT NULL DEFAULT 'America/New_York',
  send_hour          INTEGER NOT NULL DEFAULT 5,        -- local hour to deliver (5 a.m., unified)
  birth              TEXT NOT NULL,                     -- JSON: {date,time,sex,lon,off,dst,place}
  chart              TEXT,                              -- JSON: cached buildChart() result
  confirm_token      TEXT,
  unsubscribe_token  TEXT NOT NULL,
  last_sent_on       TEXT,                              -- 'YYYY-MM-DD' (dedupe a day's send)
  -- Proof-of-consent (CAN-SPAM / GDPR / APPI): what the user agreed to, and when/where from.
  consent_at         TEXT,                              -- ISO timestamp the opt-in was recorded
  consent_ip         TEXT,                              -- source IP at opt-in (as seen by the server)
  consent_ref        TEXT,                              -- version tag of the consent statement shown
  -- CPRA right to limit/delete sensitive PI: when the optional profile was erased.
  attributes_forgotten_at TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_due ON subscriber (status, send_hour);
CREATE INDEX IF NOT EXISTS idx_confirm ON subscriber (confirm_token);
CREATE INDEX IF NOT EXISTS idx_unsub ON subscriber (unsubscribe_token);
`);

// --- Migrations for pre-existing databases: add any missing columns idempotently.
// (CREATE TABLE above only runs on a fresh file; older rows need ALTER TABLE.)
{
  const have = new Set(db.prepare(`PRAGMA table_info(subscriber)`).all().map(c => c.name));
  const addIfMissing = (name, decl) => { if (!have.has(name)) db.exec(`ALTER TABLE subscriber ADD COLUMN ${name} ${decl}`); };
  addIfMissing('consent_at', 'TEXT');
  addIfMissing('consent_ip', 'TEXT');
  addIfMissing('consent_ref', 'TEXT');
  addIfMissing('attributes_forgotten_at', 'TEXT');
}

const nowISO = () => new Date().toISOString();
const token = () => crypto.randomBytes(24).toString('base64url');

const stmt = {
  byEmail:   db.prepare('SELECT * FROM subscriber WHERE email = ?'),
  byConfirm: db.prepare('SELECT * FROM subscriber WHERE confirm_token = ?'),
  byUnsub:   db.prepare('SELECT * FROM subscriber WHERE unsubscribe_token = ?'),
  insert: db.prepare(`INSERT INTO subscriber
    (id,email,email_verified,status,plan,nickname,gender,role,country_of_origin,
     timezone,send_hour,birth,chart,confirm_token,unsubscribe_token,
     consent_at,consent_ip,consent_ref,created_at,updated_at)
    VALUES (@id,@email,0,'pending','free',@nickname,@gender,@role,@country_of_origin,
     @timezone,@send_hour,@birth,@chart,@confirm_token,@unsubscribe_token,
     @consent_at,@consent_ip,@consent_ref,@created_at,@updated_at)`),
  confirm:  db.prepare(`UPDATE subscriber SET email_verified=1, status='active',
                        confirm_token=NULL, updated_at=@updated_at WHERE id=@id`),
  unsub:    db.prepare(`UPDATE subscriber SET status='unsubscribed', updated_at=@updated_at WHERE id=@id`),
  markSent: db.prepare(`UPDATE subscriber SET last_sent_on=@day, updated_at=@updated_at WHERE id=@id`),
  markBounced: db.prepare(`UPDATE subscriber SET status='bounced', updated_at=@updated_at WHERE id=@id`),
  setPlan:  db.prepare(`UPDATE subscriber SET plan=@plan, updated_at=@updated_at WHERE id=@id`),
  dueByHour: db.prepare(`SELECT * FROM subscriber
                         WHERE status='active' AND email_verified=1 AND send_hour=@hour`),
  allActive: db.prepare(`SELECT * FROM subscriber
                         WHERE status='active' AND email_verified=1`)
};

/** Create a pending subscriber (idempotent on email: re-sending re-issues confirm). */
function upsertPending(fields) {
  // Normalize optional consent fields so binding never sees `undefined`.
  fields = { consent_at: null, consent_ip: null, consent_ref: null, ...fields };
  const existing = stmt.byEmail.get(fields.email);
  const ts = nowISO();
  if (existing) {
    // Let a returning, non-active email restart confirmation; leave actives alone.
    if (existing.status === 'active') return { row: existing, isNew: false, alreadyActive: true };
    const confirm_token = token();
    db.prepare(`UPDATE subscriber SET nickname=@nickname,gender=@gender,role=@role,
      country_of_origin=@country_of_origin,timezone=@timezone,send_hour=@send_hour,
      birth=@birth,chart=@chart,status='pending',confirm_token=@confirm_token,
      consent_at=@consent_at,consent_ip=@consent_ip,consent_ref=@consent_ref,updated_at=@updated_at
      WHERE id=@id`).run({ ...fields, id: existing.id, confirm_token, updated_at: ts });
    return { row: stmt.byConfirm.get(confirm_token), isNew: false, alreadyActive: false };
  }
  const row = {
    id: crypto.randomUUID(), ...fields,
    confirm_token: token(), unsubscribe_token: token(),
    created_at: ts, updated_at: ts
  };
  stmt.insert.run(row);
  return { row: stmt.byEmail.get(fields.email), isNew: true, alreadyActive: false };
}

// CPRA right to limit/delete sensitive PI: erase the OPTIONAL profile fields
// (nickname, gender, role, country of origin) but keep the birth data the reader
// signed up to have their chart built from. Idempotent; stamps the erase time.
const forgetAttributes = (id) => db.prepare(
  `UPDATE subscriber SET nickname=NULL, gender=NULL, role=NULL, country_of_origin=NULL,
   attributes_forgotten_at=@ts, updated_at=@ts WHERE id=@id`
).run({ id, ts: nowISO() });

const confirm = (id) => stmt.confirm.run({ id, updated_at: nowISO() });
const unsubscribe = (id) => stmt.unsub.run({ id, updated_at: nowISO() });
const markSent = (id, day) => stmt.markSent.run({ id, day, updated_at: nowISO() });
const markBounced = (id) => stmt.markBounced.run({ id, updated_at: nowISO() });
const setPlan = (id, plan) => stmt.setPlan.run({ id, plan, updated_at: nowISO() });

module.exports = {
  db, token,
  byEmail: (e) => stmt.byEmail.get(e),
  byConfirmToken: (t) => stmt.byConfirm.get(t),
  byUnsubToken: (t) => stmt.byUnsub.get(t),
  dueByHour: (hour) => stmt.dueByHour.all({ hour }),
  allActive: () => stmt.allActive.all(),
  upsertPending, confirm, unsubscribe, markSent, markBounced, setPlan, forgetAttributes
};
