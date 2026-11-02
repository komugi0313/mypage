// Netlify Function：占いの言葉の自動直し（音声入力オプション）＝3サイト共通。鑑定者本人の決定 2026-10-27。
//   元のファイルは tools/voice_fix_server.js。tools/add_voice_input.py が用語一覧（tools/voice_terms.json）と
//   聞き間違い直し表（tools/voice_input.js の FIX）を埋め込んで、pro/・beginner/・eki-pro/ の functions/voice-fix.js を作る。
//   直すときは元のファイルを直して再実行する（作られた側を直接直さない）。
//
// しくみ：
//   ・声はブラウザの無料の聞き取りで文字になる（声はサーバーに来ない）。その文字（またはキーボードで打った文字）を受け取り、
//     Gemini に用語一覧を渡して、句読点・改行を入れ・言いよどみ（えー・あのー）を消して読みやすく整え、占いの言葉（干支・星の名前など）を正しい字に直して返す（言いかえ・要約はしない）。1回 約0.1円。
//   ・使える人：
//       音声入力オプション（月1,000円）の会員 … 会員確認の答えに voiceOption:true がある人。月 PK_VOICE_MONTH 回（既定3000）まで。
//       それ以外の会員 … おためし PK_VOICE_TRIAL 回（既定10）まで（会員ごと・商品ごと・期限なし）。使い切ったら 402 VOICE_OPTION。
//       1回に数えるのは、文が実際に直った・整ったときだけ。回数が数えられないとき（保存場所が使えない）は left:null（画面に残りを出さない）。
//       本番（URL か MEMBER_CHECK_URL がある環境）で保存場所が使えないときは、Gemini を呼ばずに 503 STORE（数えずに通さない。画面は無料の聞き取りで続く）。
//       数える値は、呼ぶ前に1回分を取り置き（Netlify Blobs の条件付き書き込み＝etag）、直らなかった・失敗したときは戻す＝同時にたくさん送っても上限をこえない。
//   ・会員確認には {token, product} を送る。memberId が無い答えは 503 MEMBER_ID、product（products）がこの商品とちがえば 403 PRODUCT。ヘッダ X-Product がちがう商品でも 403。
//   ・Google へはキーをヘッダ x-goog-api-key で送る（URL に入れない）。会員確認 PK_MEMBER_TIMEOUT_MS（既定5000）・Google PK_UPSTREAM_TIMEOUT_MS（既定20000）で打ち切る。
//   ・送るのは入力した文字だけ。お名前を伏せるのは画面の仕事（画面が保存したお客様のお名前を印に置きかえてから送ること＝プライバシーポリシーどおり）。
//     声で入力すること自体は、オプションがなくても無料のまま（画面はブラウザの聞き取り＋聞き間違い直し表だけで続ける）。
//   ・{mode:'status'} は Gemini を呼ばずに、オプションの有無とおためしの残りだけを返す。
//   ・直した文に用語にない漢字が新しく増えた（言いかえ）とき、または元の文と大きく違う（長さが半分以下・1.6倍以上、または助詞・です・ますが半分より少なくなった・文の数が減った・数字が変わった）ときは、言いかえ・答えを書いたとみなして元の文を返す。
//
// 環境変数（gemini.js と同じものを使う）：GEMINI_API_KEY・URL・MEMBER_CHECK_URL・ALLOWED_ORIGINS・PK_ALLOW_NO_MEMBER_CHECK・PK_OWNER_TOKEN・PK_ALLOW_NO_STORE・PK_REQUIRE_PRODUCT
//   任意 GEMINI_MODEL_VOICE … 既定 gemini-3.5-flash-lite
//   任意 PK_VOICE_TRIAL（既定10）・PK_VOICE_MONTH（既定3000）
//   会員確認（MEMBER_CHECK_URL）は、音声入力オプションを契約している会員に voiceOption:true を返すこと（エンジニアの作業）。
const PRODUCT = '__PRODUCT__';
const MODEL = process.env.GEMINI_MODEL_VOICE || 'gemini-3.5-flash-lite';
const TRIAL = parseInt(process.env.PK_VOICE_TRIAL || '10', 10) || 10;
const MONTH = parseInt(process.env.PK_VOICE_MONTH || '3000', 10) || 3000;
const OWNER_TOKEN = process.env.PK_OWNER_TOKEN || '';
const MAX_TEXT = 2000;
const MEMBER_MS = parseInt(process.env.PK_MEMBER_TIMEOUT_MS || '5000', 10) || 5000;     // 会員確認の時間切れ
const UPSTREAM_MS = parseInt(process.env.PK_UPSTREAM_TIMEOUT_MS || '20000', 10) || 20000; // Google への呼び出しの時間切れ
const SYSTEM = __SYSTEM__;
// 1語だけのとき（「にっちゅう」など）は、用語一覧の読み・化けやすい形と完全に同じなら、その漢字にそのまま変える（Gemini を呼ばない）
const DICT = __DICT__;
// 用語一覧に出てくる漢字。直した文に、これ以外の漢字が新しく増えていたら（月誌→月報 のような言いかえ）元の文に戻す
const TERM_CHARS = new Set(Array.from(new Set(Object.values(DICT).join('') + __TERMCHARS__)));


exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: { code: 'METHOD' } });
  const site = process.env.URL || '';
  const h = lower(event.headers || {});
  const origin = h.origin || h.referer || '';
  if (site) {
    const oOf = (u) => { try { return new URL(u).origin; } catch (e) { return ''; } };
    const allowed = [site, process.env.DEPLOY_PRIME_URL || '', ...(process.env.ALLOWED_ORIGINS || '').split(',')].map((x) => oOf(String(x).trim())).filter(Boolean);
    if (!origin || !allowed.includes(oOf(origin))) return json(403, { error: { code: 'ORIGIN' } });
  }
  // 商品の目印（X-Product）がちがう商品なら断る（本人・商品の確認はトークンで行う）
  const xp = clean(h['x-product']).toLowerCase();
  if (xp && xp !== PRODUCT) return json(403, { error: { code: 'PRODUCT' } });
  const memberCheck = process.env.MEMBER_CHECK_URL || '';
  if (site && !memberCheck && process.env.PK_ALLOW_NO_MEMBER_CHECK !== '1') return json(503, { error: { code: 'SETUP' } });
  if (String(event.body || '').length > MAX_TEXT * 4 + 2000) return json(413, { error: { code: 'TOO_LONG' } });

  let who = '', option = false, periodEnd = '';
  if (memberCheck) {
    const tk = clean(String(h.authorization || '').replace(/^Bearer\s+/i, ''), 4096);
    if (!tk) return json(401, { error: { code: 'LOGIN' } });
    let m;
    try {
      const r = await fetchT(memberCheck, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Product': PRODUCT }, body: JSON.stringify({ token: tk, product: PRODUCT }) }, MEMBER_MS);
      if (r.status >= 500) return json(503, { error: { code: 'MEMBER_CHECK' } });
      if (!r.ok) return json(401, { error: { code: 'LOGIN' } });
      m = await r.json();
    } catch (e) { return json(503, { error: { code: 'MEMBER_CHECK' } }); }
    const st = m && m.status, pe = m && m.periodEnd;
    periodEnd = /^\d{4}-\d{2}-\d{2}$/.test(String(pe || '')) ? String(pe) : '';
    const usable = st === 'active' || st === 'trialing' || ((st === 'canceled' || st === 'canceling') && pe ? Date.parse(pe + 'T23:59:59+09:00') > Date.now() : st === 'canceling');
    if (!m || !m.ok || !usable) return json(403, { error: { code: 'MEMBER' } });
    if (!productOk(m)) return json(403, { error: { code: 'PRODUCT' } });
    // 会員ごとに変わらないID（memberId）で数える。無いときはログインし直すと回数が戻ってしまうので止める
    if (!m.memberId) return json(503, { error: { code: 'MEMBER_ID' } });
    who = 'u' + sha(PRODUCT + ':' + String(m.memberId));
    option = m.voiceOption === true;
  } else {
    who = 'd' + sha(clean(h['x-pk-device']) || clean(h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || 'nodev'));
  }
  const isOwner = !!OWNER_TOKEN && safeEq(clean(h['x-pk-owner']), OWNER_TOKEN);
  if (isOwner) option = true;
  const enforce = !!memberCheck || !!site;   // 本番では、保存場所が使えないときは数えずに通さない
  const allowNoStore = process.env.PK_ALLOW_NO_STORE === '1';

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}
  const store = await getStore(event);
  const trialKey = `vt:${PRODUCT}:${who}`;
  const monthKey = `vm:${PRODUCT}:${periodId(periodEnd)}:${who}`;
  const useKey = option ? monthKey : trialKey, cap = option ? MONTH : TRIAL;
  // 回数が数えられないとき（保存場所が使えない）は、残りを「わからない」（null）として返す＝画面に残りの回数を出さない（まちがった数を見せない）
  let used = 0, counted = false;
  try { if (store) { used = await readCount(store, useKey); counted = true; } } catch (e) {}
  const leftOf = (n) => counted ? Math.max(0, cap - n) : null;
  const left = leftOf(used);
  const info = { option: option, left: left, trial: TRIAL };

  if (body.mode === 'status') return json(200, info);
  // 本番で数えられないときは、Gemini を呼ばずに止める（画面は無料の聞き取りと聞き間違い直し表だけで続く）
  if (!counted && enforce && !isOwner && !allowNoStore) return json(503, Object.assign({ error: { code: 'STORE' } }, info));
  if (left === 0 && !isOwner) return json(option ? 429 : 402, { error: { code: option ? 'VOICE_MONTH' : 'VOICE_OPTION' }, option: option, left: 0, trial: TRIAL });

  const text = String(body.text || '').slice(0, MAX_TEXT);
  if (!text.trim()) return json(200, Object.assign({ text: text, changed: false }, info));
  const one = text.trim().replace(/[。、．，.,！？!?\s]+$/g, '');
  if (DICT[one]) {
    const out = text.replace(one, DICT[one]);
    let n1 = used;
    if (out !== text && counted && store && !isOwner) {   // 1回に数えるのは、文が実際に直ったときだけ（上限は条件付き書き込みで守る）
      try { const a = await atomicAdd(store, useKey, 1, cap); if (!a.ok) return json(option ? 429 : 402, { error: { code: option ? 'VOICE_MONTH' : 'VOICE_OPTION' }, option: option, left: 0, trial: TRIAL }); n1 = a.n; }
      catch (e) { if (enforce && !allowNoStore) return json(503, Object.assign({ error: { code: 'STORE' } }, info)); }
    }
    return json(200, { text: out, changed: out !== text, option: option, left: leftOf(n1), trial: TRIAL });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: { code: 'NO_KEY' } });

  // 呼ぶ前に1回分を取り置く（同時にたくさん送っても上限をこえない）。直らなかった・失敗したときは戻す
  let held = false, n = used;
  if (counted && store && !isOwner) {
    try { const a = await atomicAdd(store, useKey, 1, cap); if (!a.ok) return json(option ? 429 : 402, { error: { code: option ? 'VOICE_MONTH' : 'VOICE_OPTION' }, option: option, left: 0, trial: TRIAL }); held = true; n = a.n; }
    catch (e) { if (enforce && !allowNoStore) return json(503, Object.assign({ error: { code: 'STORE' } }, info)); }
  }
  const release = async () => { if (!held) return; held = false; try { n = (await atomicAdd(store, useKey, -1, null)).n; } catch (e) { n = Math.max(0, n - 1); } };

  let fixed = text;
  try {
    const req = {
      system_instruction: { parts: [{ text: SYSTEM }] },
      // 文の中の <text>・</text> は区切りを抜けないよう全角に置きかえて送る（返ってきた文では元に戻す）
      contents: [{ role: 'user', parts: [{ text: '<text>' + text.replace(/<(\/?)text>/gi, '＜$1text＞') + '</text>' }] }],
      generationConfig: { temperature: 0, candidateCount: 1, maxOutputTokens: Math.min(4096, text.length * 3 + 200), thinkingConfig: /gemini-3/.test(MODEL) ? { thinkingLevel: 'minimal' } : { thinkingBudget: 0 } },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;   // キーは URL に入れず、ヘッダで送る
    const send = () => fetchT(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(req) }, UPSTREAM_MS);
    let r = await send();
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 800)); r = await send(); }
    if (!r.ok) { await release(); return json(502, Object.assign({ error: { code: 'UPSTREAM' } }, info)); }
    const j = await r.json();
    const parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    const got = parts ? parts.filter((p) => p && !p.thought).map((p) => (p && p.text) || '').join('') : '';
    fixed = guard(text, got.replace(/＜(\/?)text＞/g, (m0, s) => (text.indexOf('<' + s + 'text>') >= 0 ? '<' + s + 'text>' : m0)));
  } catch (e) { await release(); return json(502, Object.assign({ error: { code: 'UPSTREAM' } }, info)); }

  if (fixed === text) await release();   // 直すところがなかった・安全装置で元に戻した：数えない
  return json(200, { text: fixed, changed: fixed !== text, option: option, left: leftOf(n), trial: TRIAL });
};

// 直した文を確かめる：タグ・前後の空白を取り、長さが大きく変わったら元の文に戻す
function guard(src, out) {
  let t = String(out || '').replace(/^\s*<text>/, '').replace(/<\/text>\s*$/, '').replace(/^```[a-z]*\n?|```\s*$/g, '');
  const lead = (src.match(/^\s*/) || [''])[0], tail = (src.match(/\s*$/) || [''])[0];
  t = t.trim();
  if (!t) return src;
  const a = src.trim().length, b = t.length;
  if (b < a * 0.5 || b > a * 1.6 + 4) return src;
  // 文の形（助詞・です・ます）が大きく減った＝言葉だけ並べた・要約した、とみなして元の文に戻す
  const parts = (x) => (x.match(/です|ます|でした|ました|[はがをにでとも]/g) || []).length;
  const pa = parts(src), pb = parts(t);
  if (pa >= 4 && pb < pa * 0.5) return src;
  // 文が消えた（。？！の数が減った）・数字（生年月日・時刻など）が消えた・変わったときも元の文に戻す
  const ends = (x) => (x.match(/[。？！?!]/g) || []).length;
  if (ends(t) < ends(src)) return src;
  const nums = (x) => (x.match(/[0-9０-９]+/g) || []).map((n) => n.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))).join(',');
  if (nums(t) !== nums(src)) return src;
  // 用語にない漢字が新しく増えた＝ふつうの言葉を言いかえた、とみなして元の文に戻す
  const cnt = (x) => { const m = {}; for (const ch of x) if (/[\u4E00-\u9FFF]/.test(ch)) m[ch] = (m[ch] || 0) + 1; return m; };
  const ca = cnt(src), cb = cnt(t);
  for (const ch in cb) if (cb[ch] > (ca[ch] || 0) && !TERM_CHARS.has(ch)) return src;
  return lead + t + tail;
}
function sha(s) { return require('crypto').createHash('sha256').update(String(s)).digest('hex').slice(0, 24); }
function safeEq(a, b) { const c = require('crypto'); const x = c.createHash('sha256').update(String(a)).digest(), y = c.createHash('sha256').update(String(b)).digest(); return c.timingSafeEqual(x, y) && String(a).length === String(b).length; }
function productOk(m) {
  const list = Array.isArray(m.products) ? m.products.map(String) : (m.product ? [String(m.product)] : []);
  if (!list.length) return process.env.PK_REQUIRE_PRODUCT !== '1';
  return list.includes(PRODUCT);
}
async function fetchT(url, opt, ms) {
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  const tid = ac ? setTimeout(() => ac.abort(), ms) : null;
  try { return await fetch(url, ac ? Object.assign({}, opt, { signal: ac.signal }) : opt); }
  finally { if (tid) clearTimeout(tid); }
}
async function readCount(store, k) { const v = await store.get(k, { type: 'json' }); return (v && typeof v.n === 'number') ? v.n : 0; }
async function getMeta(store, k) {
  try { return await store.getWithMetadata(k, { type: 'json', consistency: 'strong' }); }
  catch (e) { if (/consisten/i.test(String(e && e.message))) return await store.getWithMetadata(k, { type: 'json' }); throw e; }
}
// k の値に delta を足す（Netlify Blobs の条件付き書き込み＝etag で、同時に送られても数えもれ・上限ごえがない）。足すと cap をこえるときは足さずに {ok:false}
async function atomicAdd(store, k, delta, cap) {
  const meta = typeof store.getWithMetadata === 'function';
  for (let i = 0; i < 8; i++) {
    let cur = null, etag;
    if (meta) { const g = await getMeta(store, k); if (g) { cur = g.data; etag = g.etag; } }
    else cur = await store.get(k, { type: 'json' });
    const n0 = (cur && typeof cur.n === 'number') ? cur.n : 0;
    if (cap != null && delta > 0 && n0 + delta > cap) return { ok: false, n: n0 };
    const n = Math.max(0, n0 + delta);
    const opt = meta ? (cur ? (etag ? { onlyIfMatch: etag } : undefined) : { onlyIfNew: true }) : undefined;
    const w = await store.setJSON(k, { n: n, t: Date.now() }, opt);
    if (!w || w.modified !== false) return { ok: true, n: n };
    await new Promise((ok) => setTimeout(ok, 15 + Math.floor(Math.random() * 40 * (i + 1))));
  }
  throw new Error('BLOB_CONTENTION');
}
async function bump(store, k) { return (await atomicAdd(store, k, 1, null)).n; }
async function getStore(event) {
  try {
    const blobs = require('@netlify/blobs');
    if (event && event.blobs && typeof blobs.connectLambda === 'function') blobs.connectLambda(event);   // exports.handler（Lambda 形式）では必要
    return blobs.getStore('voice-fix');
  } catch (e) { return null; }
}
function periodId(pe) { const today = jstDay(); return (pe && pe >= today) ? pe : 'm' + today.slice(0, 7); }
function jstDay() { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10); }
function lower(o) { const r = {}; for (const k in o) r[k.toLowerCase()] = o[k]; return r; }
function clean(s, max) { return (s == null ? '' : String(s)).replace(/[\r\n]/g, '').slice(0, max || 200); }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) }; }

module.exports.__test = { guard, SYSTEM, PRODUCT, DICT, atomicAdd };
