/* =============================================================================
 * 私だけの運気予報 ── 認証API 参考実装（移植用・Node.js / 依存なし）
 * -----------------------------------------------------------------------------
 * docs/認証設計_引き継ぎ.md §4 の4本のAPIを、Node標準モジュールだけで実装した例。
 *   POST /auth/request-code   確認コードをメール送信
 *   POST /auth/verify-code    検証してセッション発行(Cookie)
 *   POST /auth/logout         セッション破棄
 *   GET  /auth/session        ログイン状態
 *
 * ■ そのまま動かす（動作確認用）
 *     node server/index.js
 *   → http://localhost:8787 で起動。ストアはインメモリ、メールはコンソール出力。
 *
 * ■ 本番（Google環境）への移植ポイント
 *   - Store  : このファイル下部の memoryStore を Firestore 実装に差し替え。
 *   - Mailer : consoleMailer を Resend / SendGrid / Amazon SES に差し替え。
 *   - 実行   : Cloud Run（推奨）等に載せる。CORS の ORIGIN を本番ドメインに。
 *   ※ これは「動く仕様書」です。本番はレート制限の永続化・監視・秘密情報管理を追加してください。
 * ========================================================================== */
'use strict';
const http = require('http');
const crypto = require('crypto');

/* ---- 設定 ---- */
const CONFIG = {
  port: process.env.PORT || 8787,
  origin: process.env.CORS_ORIGIN || 'http://localhost:8000', // フロントの配信オリジン
  codeTTLms: 10 * 60 * 1000,
  maxAttempts: 5,
  resendCooldownMs: 60 * 1000,
  rememberDays: 90,
  pepper: process.env.OTP_PEPPER || 'change-me-in-production', // コードハッシュの追加秘密
  cookieSecure: process.env.NODE_ENV === 'production'          // 本番は必ず true（HTTPS）
};

/* ---- ユーティリティ ---- */
const normEmail = e => String(e || '').trim().toLowerCase();
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const genCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const hashCode = (email, code) => crypto.createHash('sha256').update(email + '|' + code + '|' + CONFIG.pepper).digest('hex');
const genToken = () => crypto.randomBytes(32).toString('hex');

/* =============================================================================
 * Store（差し替え対象）── 既定はインメモリ。本番は Firestore 等に置き換える。
 * ========================================================================== */
function memoryStore() {
  const users = new Map();     // email -> user
  const otps = new Map();      // email -> { code_hash, purpose, expires_at, attempts, sent_at }
  const sessions = new Map();  // token -> { email, expires_at }
  const rate = new Map();      // key -> [timestamps]
  return {
    getUser: async email => users.get(email) || null,
    upsertUser: async (email, patch) => {
      const cur = users.get(email) || { email, created_at: Date.now() };
      const next = Object.assign(cur, patch, { updated_at: Date.now() });
      users.set(email, next); return next;
    },
    getOtp: async email => otps.get(email) || null,
    putOtp: async (email, rec) => { otps.set(email, rec); },
    delOtp: async email => { otps.delete(email); },
    putSession: async (token, rec) => { sessions.set(token, rec); },
    getSession: async token => {
      const s = sessions.get(token);
      if (!s) return null;
      if (s.expires_at && Date.now() > s.expires_at) { sessions.delete(token); return null; }
      return s;
    },
    delSession: async token => { sessions.delete(token); },
    // 簡易レート制限（本番は Redis / Firestore で永続化）
    hitRate: async (key, windowMs, limit) => {
      const now = Date.now();
      const arr = (rate.get(key) || []).filter(t => now - t < windowMs);
      arr.push(now); rate.set(key, arr);
      return arr.length <= limit;
    }
  };
}

/* =============================================================================
 * Mailer（差し替え対象）── 既定はコンソール出力。本番は送信サービスに置き換える。
 * ========================================================================== */
function consoleMailer() {
  return {
    sendCode: async (email, code, purpose) => {
      console.log('\n──────── [メール送信(モック)] ────────');
      console.log('To      :', email);
      console.log('Subject :', '【運気予報】確認コード（10分間有効）');
      console.log('Body    :', `確認コードは ${code} です。10分以内にご入力ください。`);
      console.log('(purpose:', purpose + ')');
      console.log('───────────────────────────────────\n');
    }
  };
}
/* 例）Resend への差し替え：
 * function resendMailer(apiKey){
 *   return { sendCode: async (email, code) => {
 *     await fetch('https://api.resend.com/emails', { method:'POST',
 *       headers:{ Authorization:'Bearer '+apiKey, 'Content-Type':'application/json' },
 *       body: JSON.stringify({ from:'運気予報 <no-reply@unkiyoho.jp>', to:email,
 *         subject:'【運気予報】確認コード（10分間有効）',
 *         text:`確認コードは ${code} です。10分以内にご入力ください。` }) });
 *   }};
 * }
 */

const store = memoryStore();
const mailer = consoleMailer();

/* ---- HTTP ヘルパ ---- */
function send(res, status, body, extraHeaders) {
  const headers = Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CONFIG.origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  }, extraHeaders || {});
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}
function readJSON(req) {
  return new Promise(resolve => {
    let d = ''; req.on('data', c => { d += c; if (d.length > 1e5) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch (e) { resolve({}); } });
  });
}
function parseCookies(req) {
  const out = {}; (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('='); if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }); return out;
}
function sessionCookie(token, remember) {
  const parts = ['session=' + token, 'HttpOnly', 'Path=/', 'SameSite=Lax'];
  if (CONFIG.cookieSecure) parts.push('Secure');
  if (remember) parts.push('Max-Age=' + Math.floor(CONFIG.rememberDays * 864e5 / 1000));
  return parts.join('; ');
}

/* ---- ルーティング ---- */
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'OPTIONS') return send(res, 204, {});

  try {
    if (req.method === 'POST' && url === '/auth/request-code') return await requestCode(req, res);
    if (req.method === 'POST' && url === '/auth/verify-code') return await verifyCode(req, res);
    if (req.method === 'POST' && url === '/auth/logout') return await logout(req, res);
    if (req.method === 'GET' && url === '/auth/session') return await sessionInfo(req, res);
    return send(res, 404, { ok: false, message: 'not found' });
  } catch (e) {
    console.error(e);
    return send(res, 500, { ok: false, message: 'server error' });
  }
});

async function requestCode(req, res) {
  const body = await readJSON(req);
  const email = normEmail(body.email);
  const purpose = body.purpose || 'login';
  if (!validEmail(email)) return send(res, 400, { ok: false, code: 'bad_email', message: 'invalid email' });

  const ip = req.socket.remoteAddress || 'unknown';
  if (!await store.hitRate('email:' + email, 60 * 60 * 1000, 5) ||
      !await store.hitRate('ip:' + ip, 60 * 60 * 1000, 30)) {
    return send(res, 429, { ok: false, code: 'rate_limited', message: 'しばらくしてからお試しください。' });
  }

  const existing = await store.getOtp(email);
  if (existing && Date.now() - existing.sent_at < CONFIG.resendCooldownMs) {
    // クールダウン中：新規発行せず成功扱い（列挙・乱用対策）
    return send(res, 200, { ok: true });
  }

  const code = genCode();
  await store.putOtp(email, {
    code_hash: hashCode(email, code), purpose,
    expires_at: Date.now() + CONFIG.codeTTLms, attempts: 0, sent_at: Date.now()
  });

  // change-email 以外、または本人照合が済んでいる場合に送信。列挙対策で存在有無に関わらず 200。
  await mailer.sendCode(email, code, purpose);
  return send(res, 200, { ok: true });
}

async function verifyCode(req, res) {
  const body = await readJSON(req);
  const email = normEmail(body.email);
  const code = String(body.code || '').replace(/\s/g, '');
  const remember = !!body.remember;

  const rec = await store.getOtp(email);
  if (!rec) return send(res, 400, { ok: false, code: 'no_pending', message: '先に確認コードを送信してください。' });
  if (Date.now() > rec.expires_at) { await store.delOtp(email); return send(res, 400, { ok: false, code: 'expired', message: 'コードの有効期限が切れました。' }); }
  rec.attempts += 1;
  if (rec.attempts > CONFIG.maxAttempts) { await store.delOtp(email); return send(res, 400, { ok: false, code: 'too_many', message: '入力回数の上限を超えました。' }); }
  await store.putOtp(email, rec);
  if (hashCode(email, code) !== rec.code_hash) {
    return send(res, 400, { ok: false, code: 'invalid_code', remaining: CONFIG.maxAttempts - rec.attempts, message: 'コードが違います。' });
  }

  await store.delOtp(email);
  const user = await store.upsertUser(email, { email }); // 未作成なら作成／既存はそのまま

  const token = genToken();
  await store.putSession(token, { email, expires_at: remember ? Date.now() + CONFIG.rememberDays * 864e5 : null });
  return send(res, 200, { ok: true, nick: user.nick || null }, { 'Set-Cookie': sessionCookie(token, remember) });
}

async function logout(req, res) {
  const token = parseCookies(req).session;
  if (token) await store.delSession(token);
  return send(res, 200, { ok: true }, { 'Set-Cookie': 'session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax' });
}

async function sessionInfo(req, res) {
  const token = parseCookies(req).session;
  const sess = token ? await store.getSession(token) : null;
  if (!sess) return send(res, 200, { loggedIn: false });
  const user = await store.getUser(sess.email);
  return send(res, 200, { loggedIn: true, email: sess.email, nick: (user && user.nick) || null });
}

server.listen(CONFIG.port, () => {
  console.log('運気予報 認証API（参考実装）: http://localhost:' + CONFIG.port);
  console.log('CORS 許可オリジン:', CONFIG.origin, '（フロントの配信元に合わせてください）');
  console.log('ストア: インメモリ / メール: コンソール出力（本番は差し替え）');
});
