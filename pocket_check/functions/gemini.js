// Netlify Function：鑑定エンジン（Gemini）のサーバー中継＋サーバー側レート制限。
// ・APIキーは環境変数 GEMINI_API_KEY に保管し、ブラウザには一切出さない。
// ・回数制限は「サーバー側」で強制（localStorage は改ざん可能なので信用しない）。
//   端末ID(x-pk-device)＋IP を Netlify Blobs に日次カウントし、超過なら 429 を返し
//   Gemini を呼ばない＝API浪費を防ぐ。
// ・プラン連携（Stripe）後は、購読状態で上限(getLimits)を引き上げるだけで拡張可能。
// ※要設定：Site settings → Environment variables
//   必須 GEMINI_API_KEY … Gemini APIキー（ブラウザには出さない）
//   任意 GEMINI_MODEL / GEMINI_MODEL_DEEP … モデル差し替え（障害時の緊急切替や将来の値上げ対策）
//   任意 PK_ALERT_WEBHOOK … エラー急増時の通知先URL（Slack/Discord等のIncoming Webhook）。未設定なら通知しない（集計のみ）
//   任意 PK_ALERT_THRESHOLD … 通知するエラー件数/時（既定8）
//   任意 PK_ADMIN_TOKEN … 運営用の手動返金トークン（サポート対応時のみ運営が使用。利用者には出さない）
//          Blobs は Netlify の通常デプロイ（Git連携 / netlify deploy）で自動有効。
// 【運営用・手動返金の使い方】二重課金などの申告時：
//   curl -X POST "$SITE/api/gemini" -H "x-pk-admin: <PK_ADMIN_TOKEN>" \
//        -H "x-pk-refund-device: <対象端末ID>" -H "x-pk-refund-n: 1" -d '{}'
//   → その端末の本格鑑定カウントを当日ぶん 1 戻す（複数日は x-pk-refund-day: YYYY-MM-DD で指定）。

// ハイブリッド運用：ふだんの会話は軽量Lite、恋愛・重い相談・理屈など「品質が要る」質問だけ上位DEEPモデル。
// クライアントが x-pk-deep: '1' を付けた時だけ DEEP を使う。どちらも環境変数で差し替え可能。
//   LITE 候補: gemini-2.5-flash-lite（最安・casual）
//   DEEP 候補: gemini-3.6-flash（現行flash・推奨。速度と品質のバランス）/ gemini-3.1-pro-preview（最高品質・低速高コスト）
//   ※ Gemini 3.x は thinkingConfig.thinkingBudget:0 が非対応（下で自動除去）。旧2.5系に戻す場合のみ thinkingBudget:0 が有効。
const MODEL_LITE = process.env.GEMINI_MODEL      || 'gemini-2.5-flash-lite';
const MODEL_DEEP = process.env.GEMINI_MODEL_DEEP || 'gemini-3.6-flash';

// プラン別の1日上限。★実コスト（DEEP=gemini-3.6-flash：入力$0.75/出力$3.75 per1M、実測 約¥1.4〜2.0/通／
//   LITE=gemini-2.5-flash-lite：約¥0.17/通）にもとづき、手数料30%控除後も利益率が必ず60%以上に収まる値に設定。
// ★方針（月間プール）：本格鑑定(DEEP)は「1日◯回」ではなく「1か月◯回」で管理する。1日で1か月ぶんを使い切ってもよい（わざわざ1日で止めない）。
//   deep  = 本格鑑定（DEEP生成）の【月間】通数 … これが原価の主因。上限＝利益60%を守る月次の予算天井（目安＝旧1日枠×30）。
//   total = 雑談・理屈込みの【1日】総生成（LITE中心・bot対策の安全上限）。月ぶんを1日で使い切っても余裕で超えない高めの値。
//   ip    = 同一IPの【1日】総生成（悪用抑止）。
// ★雑談も「理屈（なぜ？根拠）」も LITE＝安価。deep 枠には数えず、本格鑑定枠を使い切っても続けられる（詐欺感を出さない）。
//   価格（USD/月・年）との対応：Standard $19.99/$214.99 / Pro $39.99/$429.99 / VIP $69.99/$749.99。
// ★月間 deep は「利益率が必ず60%以上（総額ベース・手数料30%控除後）」を満たす上限：条件＝Gemini原価 ≤ 総額の10%。
//   前提＝DEEP原価 ¥2.0/通（保守的上限）＋雑談等で約+25%。年額契約者（月割で総額が安い）でも60%維持。実測原価が下がれば上げてよい。
//   → Standard 100／Pro 200／VIP 350／無料はお試し合計15。
const LIMITS = {
  free:     { deep: 15,  total: 60,  ip: 120 },  // 無料お試し：本格鑑定 合計15（3日間・月間枠）＋雑談。獲得コストとして上限厳しめ
  standard: { deep: 100, total: 400, ip: 500 },  // Standard $19.99：本格鑑定 100/月＋雑談・理屈（1日で使い切ってもOK・利益率≥60%）
  pro:      { deep: 200, total: 600, ip: 700 },  // Pro $39.99：本格鑑定 200/月＋雑談・理屈（利益率≥60%）
  vip:      { deep: 350, total: 900, ip: 1000 }, // VIP $69.99：本格鑑定 350/月＋雑談・理屈（利益率≥60%）
};
// 旧プラン名からの後方互換（既存契約者が light/unlimited を送ってきても動くように）
const PLAN_ALIAS = { light: 'standard', unlimited: 'pro', premium: 'vip' };
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

  // ── 運営用：手動返金（サポート窓口対応）──────────────────────────────
  // ★安全設計：環境変数 PK_ADMIN_TOKEN と一致するリクエストだけ実行できる。
  //   トークンは運営だけが保持し、ブラウザには一切出さないため、クライアント（利用者）からは実行不可＝悪用でタダ乗りできない。
  //   例）二重課金の申告があったとき、運営が該当端末の本格鑑定カウントを N 戻す。
  const adminTok = process.env.PK_ADMIN_TOKEN;
  if (adminTok && clean(h['x-pk-admin']) === adminTok) {
    const st = await getStore();
    if (!st) return json(503, { error: { code: 'NO_STORE', message: 'Blobs unavailable' } });
    const dev = clean(h['x-pk-refund-device']);
    if (!dev) return json(400, { error: { code: 'NO_DEVICE', message: 'x-pk-refund-device required' } });
    const rn = Math.max(1, Math.min(50, parseInt(clean(h['x-pk-refund-n']) || '1', 10) || 1));
    const rday = clean(h['x-pk-refund-day']) || jstDay();
    const rmonth = clean(h['x-pk-refund-month']) || jstMonth();   // 本格鑑定は月間プール
    try {
      const ddK = `dd:${rmonth}:${dev}`, dK = `d:${rday}:${dev}`;
      const dd = Math.max(0, (await readCount(st, ddK)) - rn);
      const dtot = Math.max(0, (await readCount(st, dK)) - rn);
      await st.setJSON(ddK, { n: dd, t: Date.now() });
      await st.setJSON(dK, { n: dtot, t: Date.now() });
      return json(200, { ok: true, device: dev, month: rmonth, day: rday, refunded: rn, deep: dd, total: dtot });
    } catch (e) { return json(500, { error: { code: 'REFUND_FAIL', message: String(e && e.message) } }); }
  }

  const device = clean(h['x-pk-device']) || 'nodev';
  const ip = clean(h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim() || 'noip';
  // ★プランは「サーバーが検証・記録したエンタイトルメント(ent:<device>)」から解決する。
  //   ＝ クライアントの x-pk-plan は信用しない（localStorageで vip を名乗っても無効）。無ければ free。
  //   購入検証 verify-purchase.js が本物の購読だけ ent を書き込む。
  //   ※ IAP実装前の動作確認用に、環境変数 PK_TRUST_CLIENT_PLAN='true' の時だけ x-pk-plan を信用（本番では未設定＝安全）。
  const trustClient = (process.env.PK_TRUST_CLIENT_PLAN === 'true');
  let plan = 'free';
  if (trustClient) {
    plan = (clean(h['x-pk-plan']) || 'free').toLowerCase();
  } else {
    try {
      const es = await getStore();
      if (es) {
        const ent = await es.get(`ent:${device}`, { type: 'json' }).catch(() => null);
        if (ent && ent.plan && (!ent.exp || ent.exp > Date.now())) plan = String(ent.plan).toLowerCase();
      }
    } catch (e) {}
  }
  plan = PLAN_ALIAS[plan] || plan;
  const lim = LIMITS[plan] || LIMITS.free;
  const day = jstDay();
  const month = jstMonth();   // 本格鑑定(DEEP)は月間プールで管理（1日で使い切ってもOK）
  // 話題分類用の軽量呼び出し（x-pk-classify:1）は、ユーザーの1日カウントに含めない（本体の応答呼び出しだけを課金対象にする）。常に軽量モデルで安価。
  const isClassify = clean(h['x-pk-classify']) === '1';

  // 本格鑑定（DEEP・課金枠）か、雑談／理屈（LITE・無料枠）か。
  // ★理屈（なぜ？根拠）は LITE で返す＝安価。命式の計算済みデータ（システムプロンプト内の確定ロジック）を
  //   言い直すものなので LITE でも正確。deep 枠は消費せず、本格鑑定枠を使い切っても続けられる。
  const usedDeep = (clean(h['x-pk-deep']) === '1');

  // レート制限（Blobs が使えない環境ではフェイルオープン＝ヘッダで警告）
  const store = await getStore();
  let degraded = false, deepCount = 0;
  if (store && !isClassify) {
    try {
      const ddKey = `dd:${month}:${device}`;   // 本格鑑定（DEEP）専用カウンタ（課金枠・月間プール）
      const dKey  = `d:${day}:${device}`;      // 総生成カウンタ（雑談・理屈込み・bot対策・1日）
      const ipKey = `i:${day}:${ip}`;
      deepCount = await readCount(store, ddKey);
      const totalCount = await readCount(store, dKey);
      const ipCount    = await readCount(store, ipKey);
      // ① 本格鑑定の月間枠（雑談・理屈のLITEはこの枠を消費しない＝枠を使い切っても続けられる）
      if (usedDeep && deepCount >= lim.deep) return limitResp(lim.deep, 'deep');
      // ② 総量・IPの1日安全上限（bot・大量アクセス対策）。雑談・理屈もここには数える。
      if (totalCount >= lim.total) return limitResp(lim.total, 'total');
      if (ipCount    >= lim.ip)    return limitResp(lim.ip, 'ip');
    } catch (e) { degraded = true; }
  } else if (!store) { degraded = true; }

  // Gemini 呼び出し（本格鑑定＝DEEP／雑談・理屈＝LITE）
  const MODEL = usedDeep ? MODEL_DEEP : MODEL_LITE;
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
  let resp;
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  try {
    let r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sendBody });
    let text = await r.text();
    // 一時的なレート超過(429=無料枠の毎分/秒制限)は、少し待って1回だけ自動リトライ＝ユーザーに「混雑中」を見せない。
    //   ※DEEP(3.x=思考モデルで遅い)は二度打ちの遅延を避け、下のLITEフォールバックに任せる。速いLITE単体呼び出しのみ即リトライ。
    if (r.status === 429 && !usedDeep) {
      await sleep(900);
      const rr = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sendBody });
      const tt = await rr.text();
      r = rr; text = tt;
    }
    // DEEP(上位/3.x)が失敗（課金枯渇429・一時的な5xx等）したら、LITEに一度だけフォールバックして必ず返答を返す（ユーザーにエラーを見せない）
    if (usedDeep && !r.ok && MODEL_DEEP !== MODEL_LITE) {
      try {
        const url2 = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_LITE}:generateContent?key=${encodeURIComponent(key)}`;
        let r2 = await fetch(url2, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: event.body });
        let text2 = await r2.text();
        // LITEフォールバックも混雑(429)なら、少し待って1回だけ再試行（毎分制限の谷を越える）
        if (r2.status === 429) { await sleep(900); r2 = await fetch(url2, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: event.body }); text2 = await r2.text(); }
        if (r2.ok) { r = r2; text = text2; }
      } catch (e2) {}
    }
    // ★地域ブロック検知：Geminiが「この地域では使えない」を返したら、専用コード REGION で返す。
    //   → クライアントは「お住まいの地域では未対応」を表示し、購入導線を出さない（無駄な課金を防ぐ）。回数も減らない。
    if (isRegionBlock(r.status, text)) {
      try { console.error('[pk] region blocked:', ip, MODEL); } catch (e) {}
      await noteError(store, 'region');
      return json(451, { error: { code: 'REGION', message: '申し訳ありません。お住まいの地域では現在ご利用いただけません。' } });
    }
    resp = { statusCode: r.status, headers: baseHeaders(degraded), body: text };
    // ★「中身のある返答」が返ったときだけカウント（HTTP200でも空・セーフティブロック・MAX_TOKENSで本文ゼロの回は数えない
    //   ＝海外や特定話題で“生成が空振り”しても、ユーザーの本格鑑定の回数は減らない）。失敗・分類用の軽量呼び出しも数えない。
    const answered = r.ok && hasAnswerText(text);
    if (!answered && r.ok) { try { console.error('[pk] 200-but-empty (not counted):', device, MODEL, text.slice(0, 300)); } catch (e) {} await noteError(store, 'empty'); }
    if (answered && store && !degraded && !isClassify) {
      try {
        await bump(store, `d:${day}:${device}`);   // 総生成（雑談・理屈込み・1日）
        await bump(store, `i:${day}:${ip}`);        // IP（1日）
        if (usedDeep) await bump(store, `dd:${month}:${device}`);   // 本格鑑定枠は DEEP のみ加算（月間プール）
        // 本格鑑定の残り回数（月間プール／雑談・理屈は別枠なので deep 基準で通知）
        resp.headers['x-pk-remaining'] = String(Math.max(0, lim.deep - (deepCount + (usedDeep ? 1 : 0))));
      } catch (e) {}
    }
    if (!r.ok) { try { console.error('[pk] upstream not-ok:', r.status, MODEL, String(text).slice(0, 300)); } catch (e) {} await noteError(store, 'http' + r.status); }
    return resp;
  } catch (e) {
    try { console.error('[pk] upstream fetch failed:', (e && e.message) || e); } catch (e2) {}
    await noteError(store, 'fetch');
    return json(502, { error: { code: 'UPSTREAM', message: 'AIサービスへの接続に失敗しました' } });
  }
};

// Gemini の「地域未対応」応答か（例：HTTP400/403 + "User location is not supported for the API use."）
function isRegionBlock(status, text) {
  return (status === 400 || status === 403) &&
    /location is not supported|not available in your country|User location/i.test(String(text || ''));
}

// ── エラー率アラート ──────────────────────────────────────────────
// 1時間ごとにエラー件数を Blobs に集計し、しきい値（既定8件/時）を超えたら Webhook（Slack/Discord等）へ1回だけ通知。
// 設定：環境変数 PK_ALERT_WEBHOOK（通知先URL）／任意で PK_ALERT_THRESHOLD（件数）。未設定なら集計のみ（通知しない）。
function jstHour() { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 13); }
async function noteError(store, kind) {
  if (!store) return;
  try {
    const hr = jstHour();
    const n = await bump(store, `err:${hr}`);
    const thr = parseInt(process.env.PK_ALERT_THRESHOLD || '8', 10) || 8;
    const hook = process.env.PK_ALERT_WEBHOOK;
    if (hook && n >= thr) {
      const flagKey = `erralert:${hr}`;
      const flagged = await store.get(flagKey, { type: 'json' }).catch(() => null);
      if (!flagged) {
        await store.setJSON(flagKey, { n: 1, t: Date.now() });   // この時間帯は通知済み＝連投しない
        const site = process.env.URL || '(site)';
        const body = JSON.stringify({ text: `⚠️ Pocket本格鑑定：エラー急増 ${n}件/時（${hr} JST・最新種別:${kind}）\n${site}\nGemini障害／地域制限／APIキー枯渇の可能性。Netlify Functions のログをご確認ください。` });
        await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }).catch(() => {});
      }
    }
  } catch (e) {}
}

// 返答本文が実際に入っているか（HTTP200でも空・ブロックの回を課金しないための判定）
function hasAnswerText(bodyStr) {
  try {
    const j = JSON.parse(bodyStr);
    const c = j && j.candidates && j.candidates[0];
    const parts = c && c.content && c.content.parts;
    if (!parts || !parts.length) return false;
    const t = parts.map(function (p) { return (p && p.text) || ''; }).join('');
    return !!(t && t.trim().length > 0);
  } catch (e) { return false; }
}

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
  // scope='deep'（本格鑑定の枠）… 雑談は続けられる。プラン変更でさらに本格鑑定できる。
  // scope='total'/'ip' … bot対策の安全上限（通常利用では到達しない）。
  const message = (scope === 'deep')
    ? '今月の本格鑑定の上限に達しました。雑談は続けられます。プランを上げると、もっと本格鑑定ができます。'
    : '本日のご利用上限に達しました。時間をおいて再度お試しください。';
  return json(429, { error: { code: 'LIMIT', scope, limit, message } });
}

// ---- ユーティリティ ----
async function getStore() {
  try { const { getStore } = require('@netlify/blobs'); return getStore('pk-usage'); }
  catch (e) { return null; } // Blobs 未提供環境（手動zip等）ではフェイルオープン
}
function jstDay() { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10); }
function jstMonth() { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 7); } // 本格鑑定の月間プール用（YYYY-MM）
function lower(o) { const r = {}; for (const k in o) r[k.toLowerCase()] = o[k]; return r; }
function clean(s) { return (s == null ? '' : String(s)).replace(/[\r\n]/g, '').slice(0, 200); }
function baseHeaders(degraded) { const h = { 'Content-Type': 'application/json' }; if (degraded) h['x-pk-ratelimit'] = 'degraded'; return h; }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

// ---- テスト用エクスポート（本番動作には影響しない） ----
module.exports.__test = { readCount, bump, LIMITS, jstDay, jstMonth };
