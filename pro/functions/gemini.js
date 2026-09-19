// Netlify Function：四柱推命PRO版のAI鑑定（Gemini）サーバー中継。
// 目的＝APIキーをブラウザに出さない（フロント直叩きを廃止）。会員ゲートで購読者のみアプリを使える前提のため、
//       「鑑定回数は無制限（有料プランの約束）」を守り、回数では止めない。ボット・暴走対策の“高い天井”だけを持つ。
//
// ※要設定：Netlify → Site settings → Environment variables
//   必須 GEMINI_API_KEY … Gemini APIキー（ブラウザには一切出さない）
//   任意 GEMINI_MODEL   … 既定モデルの差し替え（既定 gemini-2.5-flash）。障害時の緊急切替や将来のモデル更新用。
//   任意 PK_OWNER_TOKEN … 自分専用の合言葉。ヘッダ x-pk-owner が一致した時だけ、天井カウントを完全スキップ（自分の動作確認用）。
//   任意 PK_MAX_DEVICE_DAY … 端末あたり1日の安全上限（既定 400。通常利用では到達しない。純粋なボット対策）。
//   任意 PK_MAX_IP_DAY     … 同一IPあたり1日の安全上限（既定 800）。
//        Blobs は Netlify の通常デプロイで自動有効。使えない環境ではフェイルオープン（天井なしで通す）。
//
// クライアント（app-pro.html generateReading）は、Geminiの生リクエスト
//   { model, system_instruction, contents, generationConfig } を JSON で POST する。
// 本関数は Google へ中継し、Gemini の“生レスポンス”をそのまま（statusCodeも）返す。
//   → クライアント側の既存パース（data.candidates / data.error）を一切変えずに動く。

// 許可モデル（クライアントが送ってきた model を安全に受ける。想定外はサーバー既定へ丸める）。
const MODEL_DEFAULT = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MODEL_ALLOW = new Set([
  'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro',
  'gemini-3.6-flash', 'gemini-3.1-pro-preview', MODEL_DEFAULT,
]);

const OWNER_TOKEN = process.env.PK_OWNER_TOKEN || '';
const MAX_DEVICE_DAY = parseInt(process.env.PK_MAX_DEVICE_DAY || '400', 10) || 400; // 1端末/日の安全天井（無制限運用でも到達しない高さ）
const MAX_IP_DAY = parseInt(process.env.PK_MAX_IP_DAY || '800', 10) || 800;         // 1IP/日の安全天井（bot対策）
const MAX_BODY = 12000;   // ユーザーの1発言あたりの最大文字数（システムプロンプトは対象外）

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: { code: 'METHOD', message: 'Method Not Allowed' } });

  // 簡易オリジンチェック（同一サイトからの呼び出しのみ）
  const site = process.env.URL || '';
  const origin = event.headers.origin || event.headers.referer || '';
  if (site && origin && !origin.startsWith(site)) return json(403, { error: { code: 'ORIGIN', message: 'Forbidden' } });

  // 極端に長い「ユーザー入力」だけを弾く（システムプロンプトは正規に大きいので、最後のuser発言の長さで判定）
  let parsed = {};
  try {
    parsed = JSON.parse(event.body || '{}');
    const contents = (parsed && parsed.contents) || [];
    let lastUser = '';
    for (let i = contents.length - 1; i >= 0; i--) {
      const m = contents[i];
      if (m && m.role === 'user') { lastUser = (m.parts && m.parts[0] && m.parts[0].text) || ''; break; }
    }
    if (lastUser.length > MAX_BODY) return json(413, { error: { code: 'TOO_LONG', message: '入力が長すぎます' } });
  } catch (e) {}
  if ((event.body || '').length > 900000) return json(413, { error: { code: 'TOO_LONG', message: 'リクエストが大きすぎます' } });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: { code: 'NO_KEY', message: 'サーバー設定が未完了です（GEMINI_API_KEY 未設定）' } });

  const h = lower(event.headers || {});
  const isOwner = !!OWNER_TOKEN && clean(h['x-pk-owner']) === OWNER_TOKEN;
  const device = clean(h['x-pk-device']) || 'nodev';
  const ip = clean(h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim() || 'noip';
  const day = jstDay();

  // ── 安全天井（回数制限ではなく、ボット・暴走対策のみ）。Blobs 不可ならフェイルオープン ──
  const store = await getStore();
  let degraded = false;
  if (store && !isOwner) {
    try {
      const dKey = `d:${day}:${device}`;
      const ipKey = `i:${day}:${ip}`;
      const dCount = await readCount(store, dKey);
      const ipCount = await readCount(store, ipKey);
      if (dCount >= MAX_DEVICE_DAY) return json(429, { error: { code: 'BUSY', message: 'アクセスが集中しています。時間をおいて再度お試しください。' } });
      if (ipCount >= MAX_IP_DAY) return json(429, { error: { code: 'BUSY', message: 'アクセスが集中しています。時間をおいて再度お試しください。' } });
    } catch (e) { degraded = true; }
  } else if (!store) { degraded = true; }

  // モデル決定（クライアント指定を安全に受ける。許可外はサーバー既定へ）
  let model = clean((parsed && parsed.model) || '') || MODEL_DEFAULT;
  if (!MODEL_ALLOW.has(model)) model = MODEL_DEFAULT;

  // 送信ボディ（クライアントの生リクエストから system_instruction / contents / generationConfig を取り出して再構築）
  const genCfg = (parsed && parsed.generationConfig) || {};
  if (/gemini-3/.test(model)) {
    // Gemini 3.x は thinkingBudget:0 が 400 になるため除去し、出力トークンを確保
    if (genCfg.thinkingConfig) delete genCfg.thinkingConfig;
    if (!genCfg.maxOutputTokens || genCfg.maxOutputTokens < 2400) genCfg.maxOutputTokens = 2400;
  }
  const sendBody = JSON.stringify({
    system_instruction: (parsed && parsed.system_instruction) || undefined,
    contents: (parsed && parsed.contents) || [],
    generationConfig: genCfg,
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sendBody });
    let text = await r.text();
    // 一時的なレート超過(429)は少し待って1回だけ再試行（毎分制限の谷を越える）
    if (r.status === 429) { await sleep(900); const rr = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sendBody }); r = rr; text = await rr.text(); }

    // 地域ブロック：Geminiが「この地域では使えない」を返したら専用コードで返す（クライアントはオフライン鑑定に切替）
    if (isRegionBlock(r.status, text)) {
      return json(451, { error: { code: 'REGION', message: '申し訳ありません。お住まいの地域では現在ご利用いただけません。' } });
    }

    const resp = { statusCode: r.status, headers: baseHeaders(degraded), body: text };
    // 中身のある返答が返ったときだけ天井カウントを進める（空・ブロックは数えない＝無駄に上限へ近づけない）
    const answered = r.ok && hasAnswerText(text);
    if (answered && store && !degraded && !isOwner) {
      try { await bump(store, `d:${day}:${device}`); await bump(store, `i:${day}:${ip}`); } catch (e) {}
    }
    if (!r.ok) { try { console.error('[pro-gemini] upstream not-ok:', r.status, model, String(text).slice(0, 200)); } catch (e) {} }
    return resp;
  } catch (e) {
    try { console.error('[pro-gemini] fetch failed:', (e && e.message) || e); } catch (e2) {}
    return json(502, { error: { code: 'UPSTREAM', message: 'AIサービスへの接続に失敗しました' } });
  }
};

// Gemini の「地域未対応」応答か
function isRegionBlock(status, text) {
  return (status === 400 || status === 403) &&
    /location is not supported|not available in your country|User location/i.test(String(text || ''));
}
// 返答本文が実際に入っているか（HTTP200でも空・ブロックの回を数えないため）
function hasAnswerText(bodyStr) {
  try {
    const j = JSON.parse(bodyStr);
    const c = j && j.candidates && j.candidates[0];
    const parts = c && c.content && c.content.parts;
    if (!parts || !parts.length) return false;
    const t = parts.map((p) => (p && p.text) || '').join('');
    return !!(t && t.trim().length > 0);
  } catch (e) { return false; }
}
// ---- レート（天井）ユーティリティ ----
async function readCount(store, k) {
  const v = await store.get(k, { type: 'json' }).catch(() => null);
  return (v && typeof v.n === 'number') ? v.n : 0;
}
async function bump(store, k) {
  const cur = await readCount(store, k);
  await store.setJSON(k, { n: cur + 1, t: Date.now() });
  return cur + 1;
}
async function getStore() {
  try { const { getStore } = require('@netlify/blobs'); return getStore('pro-usage'); }
  catch (e) { return null; } // Blobs 未提供環境ではフェイルオープン
}
function jstDay() { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10); }
function lower(o) { const r = {}; for (const k in o) r[k.toLowerCase()] = o[k]; return r; }
function clean(s) { return (s == null ? '' : String(s)).replace(/[\r\n]/g, '').slice(0, 200); }
function baseHeaders(degraded) { const x = { 'Content-Type': 'application/json' }; if (degraded) x['x-pk-ratelimit'] = 'degraded'; return x; }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

// ---- テスト用エクスポート（本番動作には影響しない） ----
module.exports.__test = { readCount, bump, hasAnswerText, isRegionBlock, jstDay };
