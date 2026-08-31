// Netlify Function：アプリ内課金(IAP)のレシート検証＋エンタイトルメント付与。
// ・クライアント(Capacitor IAPプラグイン)が購入後に {platform, productId, receipt/token, device} を送る。
// ・このサーバーが Apple / Google に問い合わせて「本物の有効な購読か」を確認し、
//   本物のときだけ Netlify Blobs に ent:<device> = {plan, exp} を書き込む。
// ・gemini.js はこの ent を読んでプランを決める＝クライアントが vip を名乗っても無効（タダ乗り防止）。
//
// ★必要な環境変数（あなた側のストア設定）：
//   iOS   : APPLE_SHARED_SECRET（App Store Connect → App内課金 → App用共有シークレット）
//   Android: GOOGLE_SA_EMAIL / GOOGLE_SA_KEY（サービスアカウントのメールと秘密鍵。\n はそのままでOK）/ ANDROID_PACKAGE（例 ai.72k.pocketkantei）
//   共通   : PK_PRODUCTS（商品ID→プランの対応。未設定なら下の既定値）
//   例) PK_PRODUCTS='{"pk_standard_monthly":"standard","pk_pro_monthly":"pro","pk_vip_monthly":"vip"}'
//
// ※これは本番形の実装ですが、実機ストアでのテストはあなたの環境変数設定後に行ってください。

const PRODUCTS = safeJSON(process.env.PK_PRODUCTS) || {
  'pk_standard_monthly': 'standard', 'pk_standard_yearly': 'standard',
  'pk_pro_monthly': 'pro',           'pk_pro_yearly': 'pro',
  'pk_vip_monthly': 'vip',           'pk_vip_yearly': 'vip',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
  let b; try { b = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'BAD_JSON' }); }

  const platform = String(b.platform || '').toLowerCase();
  const productId = String(b.productId || '');
  const device = clean(b.device);
  if (!device) return json(400, { error: 'NO_DEVICE' });
  if (!productId || !PRODUCTS[productId]) return json(400, { error: 'UNKNOWN_PRODUCT', productId });

  try {
    let exp = 0, txId = '';
    if (platform === 'ios') {
      const receipt = String(b.receipt || '');
      if (!receipt) return json(400, { error: 'NO_RECEIPT' });
      const info = await appleVerify(receipt, productId);
      if (!info) return json(402, { error: 'INVALID_RECEIPT' });
      exp = info.exp; txId = info.txId;
    } else if (platform === 'android') {
      const token = String(b.token || b.purchaseToken || '');
      if (!token) return json(400, { error: 'NO_TOKEN' });
      const info = await googleVerify(productId, token);
      if (!info) return json(402, { error: 'INVALID_TOKEN' });
      exp = info.exp; txId = info.txId;
    } else {
      return json(400, { error: 'BAD_PLATFORM' });
    }

    if (!exp || exp <= Date.now()) return json(402, { error: 'EXPIRED', exp });
    const plan = PRODUCTS[productId];

    const store = await getStore();
    if (store) {
      // 少し猶予（猶予期間の取り逃し防止に +2日）。無料は書き込まない。
      await store.setJSON(`ent:${device}`, { plan, exp: exp + 2 * 864e5, platform, productId, txId, t: Date.now() });
    }
    return json(200, { ok: true, plan, exp });
  } catch (e) {
    try { console.error('[pk] verify-purchase failed:', (e && e.message) || e); } catch (e2) {}
    return json(502, { error: 'VERIFY_FAILED' });
  }
};

// ---- Apple：App Store レシート検証（verifyReceipt。sandboxへ自動フォールバック） ----
async function appleVerify(receipt, productId) {
  const secret = process.env.APPLE_SHARED_SECRET;
  if (!secret) throw new Error('APPLE_SHARED_SECRET not set');
  const body = JSON.stringify({ 'receipt-data': receipt, password: secret, 'exclude-old-transactions': true });
  let r = await fetch('https://buy.itunes.apple.com/verifyReceipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  let j = await r.json();
  if (j && (j.status === 21007 || j.status === 21008)) { // 21007=サンドボックスのレシートを本番に送った
    const url = j.status === 21007 ? 'https://sandbox.itunes.apple.com/verifyReceipt' : 'https://buy.itunes.apple.com/verifyReceipt';
    r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    j = await r.json();
  }
  if (!j || j.status !== 0) return null;
  const arr = (j.latest_receipt_info || []).filter(x => x && x.product_id === productId);
  if (!arr.length) return null;
  // 最も新しい expires_date_ms を採用
  let best = 0, tx = '';
  for (const x of arr) { const e = parseInt(x.expires_date_ms || '0', 10) || 0; if (e > best) { best = e; tx = x.original_transaction_id || x.transaction_id || ''; } }
  if (!best) return null;
  return { exp: best, txId: tx };
}

// ---- Google Play：購読トークン検証（Play Developer API。サービスアカウントJWTでアクセストークン取得） ----
async function googleVerify(productId, token) {
  const email = process.env.GOOGLE_SA_EMAIL, key = process.env.GOOGLE_SA_KEY, pkg = process.env.ANDROID_PACKAGE;
  if (!email || !key || !pkg) throw new Error('GOOGLE_SA_EMAIL/GOOGLE_SA_KEY/ANDROID_PACKAGE not set');
  const at = await googleAccessToken(email, key);
  if (!at) return null;
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(pkg)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}`;
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + at } });
  if (!r.ok) return null;
  const j = await r.json();
  const exp = parseInt(j.expiryTimeMillis || '0', 10) || 0;
  // paymentState: 1=受領済 / 2=無料トライアル。0=未払い、null=保留。有効なものだけ通す。
  if (!exp) return null;
  if (j.paymentState != null && j.paymentState !== 1 && j.paymentState !== 2) return null;
  return { exp, txId: j.orderId || '' };
}

async function googleAccessToken(email, privateKey) {
  const crypto = require('crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const signInput = header + '.' + claim;
  const pem = String(privateKey).replace(/\\n/g, '\n');
  const sig = crypto.createSign('RSA-SHA256').update(signInput).sign(pem);
  const jwt = signInput + '.' + b64url(sig);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt),
  });
  const j = await r.json();
  return j && j.access_token;
}

// ---- utils ----
function getStore() { try { const { getStore } = require('@netlify/blobs'); return Promise.resolve(getStore('pk-usage')); } catch (e) { return Promise.resolve(null); } }
function b64url(x) { return Buffer.from(x).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function clean(s) { return (s == null ? '' : String(s)).replace(/[\r\n]/g, '').slice(0, 200); }
function safeJSON(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }
