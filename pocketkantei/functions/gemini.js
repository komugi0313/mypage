// Netlify Function：鑑定エンジン（Gemini）のサーバー中継＋サーバー側レート制限。
// ・APIキーは環境変数 GEMINI_API_KEY に保管し、ブラウザには一切出さない。
// ・回数制限は「サーバー側」で強制（localStorage は改ざん可能なので信用しない）。
//   端末ID(x-pk-device)＋IP を Netlify Blobs に日次カウントし、超過なら 429 を返し
//   Gemini を呼ばない＝API浪費を防ぐ。
// ・プラン連携（Stripe）後は、購読状態で上限(getLimits)を引き上げるだけで拡張可能。
// ※要設定：Site settings → Environment variables → GEMINI_API_KEY
//          Blobs は Netlify の通常デプロイ（Git連携 / netlify deploy）で自動有効。

// ハイブリッド運用：ふだんの会話は軽量Lite、恋愛・重い相談・理屈など「品質が要る」質問だけ上位DEEPモデル。
// クライアントが x-pk-deep: '1' を付けた時だけ DEEP を使う。どちらも環境変数で差し替え可能。
//   LITE 候補: gemini-2.5-flash-lite（最安・casual）
//   DEEP 候補: gemini-3.6-flash（現行flash・推奨。速度と品質のバランス）/ gemini-3.1-pro-preview（最高品質・低速高コスト）
//   ※ Gemini 3.x は thinkingConfig.thinkingBudget:0 が非対応（下で自動除去）。旧2.5系に戻す場合のみ thinkingBudget:0 が有効。
const MODEL_LITE = process.env.GEMINI_MODEL      || 'gemini-2.5-flash-lite';
const MODEL_DEEP = process.env.GEMINI_MODEL_DEEP || 'gemini-3.6-flash';

// 上限（1日）。将来プラン別に差し替え。
const LIMITS = {
  free:      { device: 5,   ip: 40  },   // 無料：端末5回/日、同一IP合計40回/日（悪用抑止）
  light:     { device: 50,  ip: 200 },   // おてがる 980円：50回/日（満使用でも利益7割が残る計算）
  unlimited: { device: 150, ip: 400 },   // 使い放題 2480円：フェアユース150回/日（bot対策）
};
const MAX_BODY = 12000; // ユーザーの1発言あたりの最大文字数（トークン浪費・悪用防止。※システムプロンプトは対象外）

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: { code: 'METHOD', message: 'Method Not Allowed' } });

  // 簡易オリジンチェック
  const site = process.env.URL || '';
  const origin = event.headers.origin || event.headers.referer || '';
  if (site && origin && !origin.startsWith(site)) return json(403, { error: { code: 'ORIGIN', message: 'Forbidden' } });

  // 極端に長い「ユーザー入力」だけを弾く（システムプロンプトは正規に大きいので、本文全体ではなく“ユーザーの最後の発言”の長さで判定する）
  try {
    var _pb = JSON.parse(event.body || '{}');
    var _contents = (_pb && _pb.contents) || [];
    var _lastUser = '';
    for (var _i = _contents.length - 1; _i >= 0; _i--) {
      var _m = _contents[_i];
      if (_m && _m.role === 'user') { _lastUser = (_m.parts && _m.parts[0] && _m.parts[0].text) || ''; break; }
    }
    if (_lastUser.length > MAX_BODY) return json(413, { error: { code: 'TOO_LONG', message: '入力が長すぎます' } });
  } catch (e) {}
  // 全体サイズの安全上限（プロンプト＋長い会話履歴）。極端な肥大化だけを弾く（Netlify関数の6MB上限より十分小さく）。
  if ((event.body || '').length > 900000) return json(413, { error: { code: 'TOO_LONG', message: 'リクエストが大きすぎます' } });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: { code: 'NO_KEY', message: 'サーバー設定が未完了です（GEMINI_API_KEY 未設定）' } });

  // 識別子
  const h = lower(event.headers || {});
  const device = clean(h['x-pk-device']) || 'nodev';
  const ip = clean(h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim() || 'noip';
  const plan = (clean(h['x-pk-plan']) || 'free').toLowerCase();   // 将来サーバーで購読照合して上書き
  const lim = LIMITS[plan] || LIMITS.free;
  const day = jstDay();
  // 話題分類用の軽量呼び出し（x-pk-classify:1）は、ユーザーの1日カウントに含めない（本体の応答呼び出しだけを課金対象にする）。常に軽量モデルで安価。
  const isClassify = clean(h['x-pk-classify']) === '1';

  // レート制限（Blobs が使えない環境ではフェイルオープン＝ヘッダで警告）
  const store = await getStore();
  let limited = false, degraded = false, dCount = 0;
  if (store && !isClassify) {
    try {
      const dKey = `d:${day}:${device}`, ipKey = `i:${day}:${ip}`;
      const dRec = await readCount(store, dKey), ipRec = await readCount(store, ipKey);
      dCount = dRec;
      if (dRec >= lim.device) return limitResp(lim.device, 'device');
      if (ipRec >= lim.ip)     return limitResp(lim.ip, 'ip');
    } catch (e) { degraded = true; }
  } else if (!store) { degraded = true; }

  // Gemini 呼び出し（ハイブリッド：深い質問だけ上位モデル）
  const MODEL = (clean(h['x-pk-deep']) === '1') ? MODEL_DEEP : MODEL_LITE;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  // Gemini 3.x 互換：thinkingBudget:0 は 3.x で 400 になるため除去し、思考ぶんの出力トークンを確保する（クライアントが古い形で送ってきても安全に整える）
  let sendBody = event.body;
  if (/gemini-3/.test(MODEL)) {
    try {
      const pj = JSON.parse(event.body || '{}');
      pj.generationConfig = pj.generationConfig || {};
      if (pj.generationConfig.thinkingConfig) delete pj.generationConfig.thinkingConfig;
      const want = (clean(h['x-pk-deep']) === '1') ? 3200 : 2400;
      if (!pj.generationConfig.maxOutputTokens || pj.generationConfig.maxOutputTokens < want) pj.generationConfig.maxOutputTokens = want;
      sendBody = JSON.stringify(pj);
    } catch (e) {}
  }
  const usedDeep = (clean(h['x-pk-deep']) === '1');
  let resp;
  try {
    let r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sendBody });
    let text = await r.text();
    // DEEP(上位/3.x)が失敗（課金枯渇429・一時的な5xx等）したら、LITEに一度だけフォールバックして必ず返答を返す（ユーザーにエラーを見せない）
    if (usedDeep && !r.ok && MODEL_DEEP !== MODEL_LITE) {
      try {
        const url2 = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_LITE}:generateContent?key=${encodeURIComponent(key)}`;
        const r2 = await fetch(url2, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: event.body });
        const text2 = await r2.text();
        if (r2.ok) { r = r2; text = text2; }
      } catch (e2) {}
    }
    resp = { statusCode: r.status, headers: baseHeaders(degraded), body: text };
    // 正常応答のときだけカウント加算（失敗した回・分類用の軽量呼び出しは数えない）
    if (r.ok && store && !degraded && !isClassify) {
      try {
        await bump(store, `d:${day}:${device}`);
        await bump(store, `i:${day}:${ip}`);
        resp.headers['x-pk-remaining'] = String(Math.max(0, lim.device - (dCount + 1)));
      } catch (e) {}
    }
    return resp;
  } catch (e) {
    return json(502, { error: { code: 'UPSTREAM', message: 'AIサービスへの接続に失敗しました' } });
  }
};

// ---- レート制限の純ロジック（テスト用に分離） ----
async function readCount(store, k) {
  const v = await store.get(k, { type: 'json' }).catch(() => null);
  return (v && typeof v.n === 'number') ? v.n : 0;
}
async function bump(store, k) {
  const cur = await readCount(store, k);
  await store.setJSON(k, { n: cur + 1, t: Date.now() });
  return cur + 1;
}
function limitResp(limit, scope) {
  return json(429, { error: { code: 'LIMIT', scope, limit, message: '本日の無料相談の上限に達しました。プランに登録すると、もっと相談できます。' } });
}

// ---- ユーティリティ ----
async function getStore() {
  try { const { getStore } = require('@netlify/blobs'); return getStore('pk-usage'); }
  catch (e) { return null; } // Blobs 未提供環境（手動zip等）ではフェイルオープン
}
function jstDay() { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10); }
function lower(o) { const r = {}; for (const k in o) r[k.toLowerCase()] = o[k]; return r; }
function clean(s) { return (s == null ? '' : String(s)).replace(/[\r\n]/g, '').slice(0, 200); }
function baseHeaders(degraded) { const h = { 'Content-Type': 'application/json' }; if (degraded) h['x-pk-ratelimit'] = 'degraded'; return h; }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

// ---- テスト用エクスポート（本番動作には影響しない） ----
module.exports.__test = { readCount, bump, LIMITS, jstDay };
