// Netlify Function：易 EKI Pro のオンライン鑑定（Gemini）サーバー中継（四柱推命PRO版と同じ仕組み）。
// EKI では鑑定文（答え→残りの2回）・深掘り相談・鑑定書の作成に使う。
// 目的＝APIキーをブラウザに出さない（フロント直叩きを廃止）。会員ゲートで購読者のみアプリを使える前提のため、
//       この雛形が持つのは、ボット・暴走対策の“高い天井”（下の PK_MAX_DEVICE_DAY／PK_MAX_IP_DAY）だけ。
//       規約・料金ページで約束した回数の上限（PRO・ビギナー＝詳細鑑定1日25回／易 EKI Pro＝1日50回・1分15回、
//       無料期間中は3サイトとも1日3回）のうち、無料期間中の1日3回だけはこの雛形に入っている（会員確認の status が trialing のとき、
//       会員ごと・日本時間の1日ごとに数え、4回目から 429 {error:{code:'TRIAL_LIMIT'}} を返す。PK_TRIAL_DAY で変更可）。
//       有料の1日の上限（PRO・ビギナー25回／易50回。PK_PAID_DAY で変更可）も、会員確認ができたときは会員ごと・日本時間の1日ごとに数え、超えたら 429 {error:{code:'DAY_LIMIT'}}。
//       （易の1分15回の連打制限は、本番のサーバーで実装すること＝実装依頼書 §3-5）。
//       数え方：鑑定1件＝1回。次の目印が付いた呼び出しは、同じ鑑定の続きなので数えない（この雛形の天井でも数えない）。
//         x-pk-part: detail … PRO・ビギナーの相談1件の2回目（くわしい読み解き）
//         x-eki-kind: detail … 易の鑑定1件の2回目（台本・要点などの残り）／ x-eki-kind: sho … 易の鑑定書の作成
//
// ハイブリッド運用：重い自動鑑定レポートだけ上位モデル(DEEP)、ふだんの相談・相性は軽量モデル(LITE)。
//   クライアントが x-pk-deep:'1' を付けた時だけ DEEP を使う。どちらも環境変数で差し替え可能。
//   → 品質を保ちつつ、月額課金の原価（AIコスト）を抑えて粗利を守る。
//
// ※要設定：Netlify → Site settings → Environment variables
//   必須 GEMINI_API_KEY … Gemini APIキー（ブラウザには一切出さない）
//   任意 GEMINI_MODEL      … LITE（相談・相性）モデル。既定 gemini-2.5-flash（原価を下げたいときだけ gemini-2.5-flash-lite 等に）
//   任意 GEMINI_MODEL_DEEP … DEEP（自動鑑定レポート）モデル。既定 gemini-2.5-flash（品質重視。pro等へ差替可）
//   任意 PK_OWNER_TOKEN … 自分専用の合言葉。ヘッダ x-pk-owner が一致した時だけ、天井カウントを完全スキップ（動作確認用）。
//   任意 PK_MAX_DEVICE_DAY … 端末あたり1日の安全上限（既定 400。純粋なボット対策。通常利用では到達しない）。
//   任意 PK_MAX_IP_DAY     … 同一IPあたり1日の安全上限（既定 800）。
//   任意 PK_PRICE_IN / PK_PRICE_OUT / PK_PRICE_CACHE / PK_FX_JPY … 原価計測の単価（USD/1Mトークン・円レート）。既定はflash相当。
//        Blobs は Netlify の通常デプロイで自動有効。使えない環境ではフェイルオープン（天井なしで通す）。
//   自動 URL / DEPLOY_PRIME_URL … Netlify が自動で入れる自サイトのURL。Netlify 以外で動かすときは URL を必ず手で設定する
//        （URL が空だと、送信元（Origin）の確認と「MEMBER_CHECK_URL 未設定なら止める」安全装置が両方とも働かない）。
//   本番 MEMBER_CHECK_URL … 会員確認の関数のURL（必須）。任意 ALLOWED_ORIGINS … 追加で許可する送信元（カンマ区切り・完全一致）。
//   確認環境のみ PK_ALLOW_NO_MEMBER_CHECK=1 … 会員確認なしで動かす（本番では設定しない）。
//
// クライアント（app-pro.html generateReading）は Geminiの生リクエスト
//   { system_instruction, contents, generationConfig } を JSON で POST（modelはサーバーが決める）。
// 本関数は Google へ中継し、Gemini の“生レスポンス”をそのまま（statusCodeも）返す
//   → クライアント側の既存パース（data.candidates / data.error）を一切変えずに動く。

// 既定は現行②と同じ gemini-2.5-flash（＝既定では品質・挙動を変えない）。
// 原価を下げたいときだけ、環境変数 GEMINI_MODEL=gemini-2.5-flash-lite（相談・相性用の軽量モデル）を設定すればよい。
// 自動鑑定レポートの品質を上げたいときは GEMINI_MODEL_DEEP=gemini-2.5-pro 等に。
const MODEL_LITE = process.env.GEMINI_MODEL      || 'gemini-2.5-flash';
const MODEL_DEEP = process.env.GEMINI_MODEL_DEEP || 'gemini-2.5-flash';

const OWNER_TOKEN = process.env.PK_OWNER_TOKEN || '';
const MAX_DEVICE_DAY = parseInt(process.env.PK_MAX_DEVICE_DAY || '400', 10) || 400;
const MAX_IP_DAY = parseInt(process.env.PK_MAX_IP_DAY || '800', 10) || 800;
// 無料お試し中（status=trialing）の1日の上限（鑑定1件＝1回。続きの2回目・鑑定書の作成は数えない）。3サイト共通で3回（発注者決定 2026-10-16）
const TRIAL_DAY = parseInt(process.env.PK_TRIAL_DAY || '3', 10) || 3;
// 有料（trialing 以外の使える会員）の1日の上限（鑑定1件＝1回）。原価で利益65%を守る上限（発注者決定 2026-10-16）
const PAID_DAY = parseInt(process.env.PK_PAID_DAY || '50', 10) || 50;
// 最後のユーザーメッセージの上限（字）。自動の詳細鑑定は命式データ全文を渡すため最大約24,300字になる。
// 12000だと正規の詳細鑑定が413で弾かれオンライン生成できず常にオフラインへ落ちていたので、余裕を持って40000に。
// （巨大な貼り付け等のボット対策の“天井”は維持。総リクエストサイズは別途 5,800,000字で制限）
const MAX_BODY = 40000;

// 原価計測（USD / 1Mトークン）。既定は gemini-2.5-flash 相当の保守値。キャッシュ入力は75%引きで見積もる。
const PX_IN   = parseFloat(process.env.PK_PRICE_IN   || '0.30');
const PX_OUT  = parseFloat(process.env.PK_PRICE_OUT  || '2.50');
const PX_CACHE= parseFloat(process.env.PK_PRICE_CACHE|| String(0.30 * 0.25));
const PX_FX   = parseFloat(process.env.PK_FX_JPY     || '150');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: { code: 'METHOD', message: 'Method Not Allowed' } });

  const site = process.env.URL || '';
  const origin = event.headers.origin || event.headers.referer || '';
  // 本番（URL が設定された環境）では、自サイトからの呼び出し以外を断る（Origin/Referer の無い呼び出しも断る）
  // 前方一致だと https://72k.ai.evil.example なども通ってしまうため、オリジン（https://ドメイン）が完全に一致するものだけ通す。
  // 追加で許可したいオリジン（独自ドメインと netlify.app の併用など）は ALLOWED_ORIGINS にカンマ区切りで指定。
  if (site) {
    const oOf = (u) => { try { return new URL(u).origin; } catch (e) { return ''; } };
    const allowed = [site, process.env.DEPLOY_PRIME_URL || '', ...(process.env.ALLOWED_ORIGINS || '').split(',')].map((x) => oOf(String(x).trim())).filter(Boolean);
    if (!origin || !allowed.includes(oOf(origin))) return json(403, { error: { code: 'ORIGIN', message: 'Forbidden' } });
  }

  // 会員確認（実装仕様 §3-3・必須）：MEMBER_CHECK_URL（auth-check と同じ確認を行うサーバー内の関数）が設定されていれば、
  // Authorization: Bearer <member_token> を検証し、使える状態の会員だけ中継する。未設定（公開前の確認環境）のときは確認しない。
  const memberCheck = process.env.MEMBER_CHECK_URL || '';
  // 本番（URL が設定された環境）で会員確認が未設定のままだと、誰でもAPIキーを使えてしまう。設定忘れに気づけるよう、本番では止める。
  // （公開前の確認環境でどうしても会員確認なしで動かすときだけ、PK_ALLOW_NO_MEMBER_CHECK=1 を設定する）
  if (site && !memberCheck && process.env.PK_ALLOW_NO_MEMBER_CHECK !== '1') return json(503, { error: { code: 'SETUP', message: 'サーバー設定が未完了です（MEMBER_CHECK_URL 未設定）' } });
  let memberKey = '', memberStatus = '';
  if (memberCheck) {
    const hh = lower(event.headers || {});
    const tk = clean(String(hh['authorization'] || '').replace(/^Bearer\s+/i, ''));
    if (!tk) return json(401, { error: { code: 'LOGIN', message: 'ログインが必要です' } });
    // 回数の天井は、書きかえられる端末ヘッダではなく会員ごとに数える（トークンの要約だけを使い、トークン自体は保存しない）
    memberKey = 'm' + require('crypto').createHash('sha256').update(tk).digest('hex').slice(0, 24);
    try {
      const r = await fetch(memberCheck, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk }) });
      if (!r.ok) return json(401, { error: { code: 'LOGIN', message: 'ログインが必要です' } });
      const m = await r.json();
      const st = m && m.status, pe = m && m.periodEnd;
      memberStatus = st || '';
      const usable = st === 'active' || st === 'trialing' || ((st === 'canceled' || st === 'canceling') && pe ? Date.parse(pe + 'T23:59:59+09:00') > Date.now() : st === 'canceling');   // 解約した人は最終日（日本時間23:59:59）まで
      if (!m || !m.ok || !usable) return json(403, { error: { code: 'MEMBER', message: 'ご利用いただけない状態です' } });
    } catch (e) {
      return json(503, { error: { code: 'MEMBER_CHECK', message: '会員確認ができませんでした' } });
    }
  }

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
  if ((event.body || '').length > 5800000) return json(413, { error: { code: 'TOO_LONG', message: 'リクエストが大きすぎます' } });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: { code: 'NO_KEY', message: 'サーバー設定が未完了です（GEMINI_API_KEY 未設定）' } });

  const h = lower(event.headers || {});
  const isOwner = !!OWNER_TOKEN && clean(h['x-pk-owner']) === OWNER_TOKEN;
  const device = memberKey || clean(h['x-pk-device']) || 'nodev';
  const ip = clean(h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || '').split(',')[0].trim() || 'noip';
  const day = jstDay();
  const usedDeep = (clean(h['x-pk-deep']) === '1');
  // 同じ鑑定の続き（2回目）・鑑定書の作成は、回数に数えない（鑑定1件＝1回。画面の数え方と同じ）
  const noCount = clean(h['x-pk-part']) === 'detail' || /^(detail|sho)$/.test(clean(h['x-eki-kind']));

  // 安全天井（回数制限ではなく、ボット・暴走対策のみ）。Blobs 不可ならフェイルオープン
  const store = await getStore();
  let degraded = false;
  if (store && !isOwner) {
    try {
      const dCount = await readCount(store, `d:${day}:${device}`);
      const ipCount = await readCount(store, `i:${day}:${ip}`);
      if (dCount >= MAX_DEVICE_DAY) return json(429, { error: { code: 'BUSY', message: 'アクセスが集中しています。時間をおいて再度お試しください。' } });
      if (ipCount >= MAX_IP_DAY) return json(429, { error: { code: 'BUSY', message: 'アクセスが集中しています。時間をおいて再度お試しください。' } });
      // 無料お試し中は1日3回まで（会員ごと。日本時間の0時に戻る）
      if (memberStatus && memberStatus !== 'trialing' && !noCount && dCount >= PAID_DAY) return json(429, { error: { code: 'DAY_LIMIT', message: '本日のご利用は1日' + PAID_DAY + '回までです。明日（日本時間の0時から）またご利用いただけます。' } });
      if (memberStatus === 'trialing' && !noCount && dCount >= TRIAL_DAY) return json(429, { error: { code: 'TRIAL_LIMIT', message: '無料お試し中のご利用は1日' + TRIAL_DAY + '回までです。明日（日本時間の0時から）またご利用いただけます。' } });
    } catch (e) { degraded = true; }
  } else if (!store) { degraded = true; }

  // モデル決定：サーバー側でティア（DEEP/LITE）から選ぶ＝クライアントに選ばせない（コスト管理・安全）
  const model = usedDeep ? MODEL_DEEP : MODEL_LITE;
  const sendBody = buildBody(parsed, model, usedDeep);

  const urlOf = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    let r = await fetch(urlOf(model), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sendBody });
    let text = await r.text();
    // 一時的なレート超過(429)は少し待って1回だけ再試行（LITEのみ。DEEPは遅いので下のフォールバックに任せる）
    if (r.status === 429 && !usedDeep) { await sleep(900); const rr = await fetch(urlOf(model), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: sendBody }); r = rr; text = await rr.text(); }
    // DEEPが失敗（枯渇429・一時5xx等）したら、LITEに一度だけフォールバックして必ず返す
    if (usedDeep && !r.ok && MODEL_DEEP !== MODEL_LITE) {
      try {
        const body2 = buildBody(parsed, MODEL_LITE, false);
        let r2 = await fetch(urlOf(MODEL_LITE), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body2 });
        let t2 = await r2.text();
        if (r2.status === 429) { await sleep(900); r2 = await fetch(urlOf(MODEL_LITE), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body2 }); t2 = await r2.text(); }
        if (r2.ok) { r = r2; text = t2; }
      } catch (e2) {}
    }

    if (isRegionBlock(r.status, text)) return json(451, { error: { code: 'REGION', message: '申し訳ありません。お住まいの地域では現在ご利用いただけません。' } });

    const resp = { statusCode: r.status, headers: baseHeaders(degraded), body: text };
    const answered = r.ok && hasAnswerText(text);
    // 原価計測：usageMetadata から入力/出力/キャッシュ済みトークンと概算¥を算出し、ログ＋ヘッダに出す
    if (r.ok) {
      try {
        const u = readUsage(text);
        if (u) {
          const yen = usageYen(u);
          resp.headers['x-pk-tok'] = 'p=' + u.p + ',cache=' + u.c + ',out=' + u.o + ',yen=' + yen.toFixed(2);
          console.log('[pro-cost] ' + (usedDeep ? 'deep' : 'lite') + ' model=' + model + ' prompt=' + u.p + ' cached=' + u.c + ' out=' + u.o + ' ≈¥' + yen.toFixed(2) + '/通 (cacheHit=' + (u.p > 0 ? Math.round(u.c / u.p * 100) : 0) + '%)');
        }
      } catch (e) {}
    }
    if (answered && store && !degraded && !isOwner && !noCount) {
      try { await bump(store, `d:${day}:${device}`); await bump(store, `i:${day}:${ip}`); } catch (e) {}
    }
    if (!r.ok) { try { console.error('[pro-gemini] upstream not-ok:', r.status, model, String(text).slice(0, 200)); } catch (e) {} }
    return resp;
  } catch (e) {
    try { console.error('[pro-gemini] fetch failed:', (e && e.message) || e); } catch (e2) {}
    return json(502, { error: { code: 'UPSTREAM', message: 'AIサービスへの接続に失敗しました' } });
  }
};

// クライアントの生リクエストから system_instruction/contents/generationConfig を取り出し、モデルに合わせて整える
function buildBody(parsed, model, usedDeep) {
  const genCfg = Object.assign({}, (parsed && parsed.generationConfig) || {});
  if (/gemini-3/.test(model)) {
    // Gemini 3.x は thinkingBudget:0 が 400 になるため除去し、出力トークンを確保
    if (genCfg.thinkingConfig) delete genCfg.thinkingConfig;
    const want = usedDeep ? 3200 : 2400;
    if (!genCfg.maxOutputTokens || genCfg.maxOutputTokens < want) genCfg.maxOutputTokens = want;
  } else if (/flash/.test(model)) {
    // 2.5系flashは思考ONで本文が空になりうるので思考オフ（本文を確実に出す）
    genCfg.thinkingConfig = { thinkingBudget: 0 };
    if (!genCfg.maxOutputTokens) genCfg.maxOutputTokens = 2048;
  }
  return JSON.stringify({
    system_instruction: (parsed && parsed.system_instruction) || undefined,
    contents: (parsed && parsed.contents) || [],
    generationConfig: genCfg,
  });
}

function isRegionBlock(status, text) {
  return (status === 400 || status === 403) &&
    /location is not supported|not available in your country|User location/i.test(String(text || ''));
}
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
// usageMetadata から使用トークン（p=入力合計 / c=うちキャッシュ済み / o=出力）
function readUsage(bodyStr) {
  try {
    const j = JSON.parse(bodyStr); const m = j && j.usageMetadata; if (!m) return null;
    const p = m.promptTokenCount || 0, c = m.cachedContentTokenCount || 0, o = m.candidatesTokenCount || 0;
    if (!p && !o) return null; return { p: p, c: c, o: o };
  } catch (e) { return null; }
}
function usageYen(u) {
  const fullIn = Math.max(0, u.p - u.c);
  const usd = (fullIn * PX_IN + u.c * PX_CACHE + u.o * PX_OUT) / 1e6;
  return usd * PX_FX;
}
async function readCount(store, k) { const v = await store.get(k, { type: 'json' }).catch(() => null); return (v && typeof v.n === 'number') ? v.n : 0; }
async function bump(store, k) { const cur = await readCount(store, k); await store.setJSON(k, { n: cur + 1, t: Date.now() }); return cur + 1; }
async function getStore() { try { const { getStore } = require('@netlify/blobs'); return getStore('pro-usage'); } catch (e) { return null; } }
function jstDay() { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10); }
function lower(o) { const r = {}; for (const k in o) r[k.toLowerCase()] = o[k]; return r; }
function clean(s) { return (s == null ? '' : String(s)).replace(/[\r\n]/g, '').slice(0, 200); }
function baseHeaders(degraded) { const x = { 'Content-Type': 'application/json' }; if (degraded) x['x-pk-ratelimit'] = 'degraded'; return x; }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

// ---- テスト用エクスポート（本番動作には影響しない） ----
module.exports.__test = { readCount, bump, hasAnswerText, isRegionBlock, jstDay, readUsage, usageYen, buildBody };
