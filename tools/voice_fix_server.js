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
//     声で入力すること自体は、オプションがなくても無料のまま（画面はブラウザの聞き取り＋聞き間違い直し表だけで続ける）。
//   ・{mode:'status'} は Gemini を呼ばずに、オプションの有無とおためしの残りだけを返す。
//   ・直した文が元の文と大きく違う（長さが半分以下・1.6倍以上、または助詞・です・ますが半分より少なくなった・文の数が減った・数字が変わった）ときは、言いかえ・答えを書いたとみなして元の文を返す。
//
// 環境変数（gemini.js と同じものを使う）：GEMINI_API_KEY・URL・MEMBER_CHECK_URL・ALLOWED_ORIGINS・PK_ALLOW_NO_MEMBER_CHECK・PK_OWNER_TOKEN
//   任意 GEMINI_MODEL_VOICE … 既定 gemini-3.5-flash-lite
//   任意 PK_VOICE_TRIAL（既定10）・PK_VOICE_MONTH（既定3000）
//   会員確認（MEMBER_CHECK_URL）は、音声入力オプションを契約している会員に voiceOption:true を返すこと（エンジニアの作業）。
const PRODUCT = '__PRODUCT__';
const MODEL = process.env.GEMINI_MODEL_VOICE || 'gemini-3.5-flash-lite';
const TRIAL = parseInt(process.env.PK_VOICE_TRIAL || '10', 10) || 10;
const MONTH = parseInt(process.env.PK_VOICE_MONTH || '3000', 10) || 3000;
const OWNER_TOKEN = process.env.PK_OWNER_TOKEN || '';
const MAX_TEXT = 2000;
const SYSTEM = __SYSTEM__;

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
  const memberCheck = process.env.MEMBER_CHECK_URL || '';
  if (site && !memberCheck && process.env.PK_ALLOW_NO_MEMBER_CHECK !== '1') return json(503, { error: { code: 'SETUP' } });

  let who = '', option = false, periodEnd = '';
  if (memberCheck) {
    const tk = clean(String(h.authorization || '').replace(/^Bearer\s+/i, ''));
    if (!tk) return json(401, { error: { code: 'LOGIN' } });
    who = 'm' + sha(tk);
    try {
      const r = await fetch(memberCheck, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tk }) });
      if (!r.ok) return json(401, { error: { code: 'LOGIN' } });
      const m = await r.json();
      const st = m && m.status, pe = m && m.periodEnd;
      periodEnd = /^\d{4}-\d{2}-\d{2}$/.test(String(pe || '')) ? String(pe) : '';
      if (m && m.memberId) who = 'u' + sha(String(m.memberId));
      const usable = st === 'active' || st === 'trialing' || ((st === 'canceled' || st === 'canceling') && pe ? Date.parse(pe + 'T23:59:59+09:00') > Date.now() : st === 'canceling');
      if (!m || !m.ok || !usable) return json(403, { error: { code: 'MEMBER' } });
      option = m.voiceOption === true;
    } catch (e) { return json(503, { error: { code: 'MEMBER_CHECK' } }); }
  } else {
    who = 'd' + sha(clean(h['x-pk-device']) || clean(h['x-nf-client-connection-ip'] || h['x-forwarded-for'] || 'nodev'));
  }
  const isOwner = !!OWNER_TOKEN && clean(h['x-pk-owner']) === OWNER_TOKEN;
  if (isOwner) option = true;

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}
  const store = await getStore();
  const trialKey = `vt:${PRODUCT}:${who}`;
  const monthKey = `vm:${PRODUCT}:${periodId(periodEnd)}:${who}`;
  let used = 0;
  try { if (store) used = await readCount(store, option ? monthKey : trialKey); } catch (e) {}
  const left = option ? Math.max(0, MONTH - used) : Math.max(0, TRIAL - used);
  const info = { option: option, left: left, trial: TRIAL };

  if (body.mode === 'status') return json(200, info);
  if (!left && !isOwner) return json(option ? 429 : 402, { error: { code: option ? 'VOICE_MONTH' : 'VOICE_OPTION' }, option: option, left: 0, trial: TRIAL });

  const text = String(body.text || '').slice(0, MAX_TEXT);
  if (!text.trim()) return json(200, Object.assign({ text: text, changed: false }, info));
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: { code: 'NO_KEY' } });

  let fixed = text;
  try {
    const req = {
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: '<text>' + text + '</text>' }] }],
      generationConfig: { temperature: 0, maxOutputTokens: Math.min(4096, text.length * 3 + 200), thinkingConfig: /gemini-3/.test(MODEL) ? { thinkingLevel: 'minimal' } : { thinkingBudget: 0 } },
    };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    let r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 800)); r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) }); }
    if (!r.ok) return json(502, Object.assign({ error: { code: 'UPSTREAM' } }, info));
    const j = await r.json();
    const parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    fixed = guard(text, parts ? parts.map((p) => (p && p.text) || '').join('') : '');
  } catch (e) { return json(502, Object.assign({ error: { code: 'UPSTREAM' } }, info)); }

  let n = used;
  if (store && !isOwner) { try { n = await bump(store, option ? monthKey : trialKey); } catch (e) {} }
  return json(200, { text: fixed, changed: fixed !== text, option: option, left: option ? Math.max(0, MONTH - n) : Math.max(0, TRIAL - n), trial: TRIAL });
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
  return lead + t + tail;
}
function sha(s) { return require('crypto').createHash('sha256').update(String(s)).digest('hex').slice(0, 24); }
async function readCount(store, k) { const v = await store.get(k, { type: 'json' }).catch(() => null); return (v && typeof v.n === 'number') ? v.n : 0; }
async function bump(store, k) { const cur = await readCount(store, k); await store.setJSON(k, { n: cur + 1, t: Date.now() }); return cur + 1; }
async function getStore() { try { const { getStore } = require('@netlify/blobs'); return getStore('voice-fix'); } catch (e) { return null; } }
function periodId(pe) { const today = jstDay(); return (pe && pe >= today) ? pe : 'm' + today.slice(0, 7); }
function jstDay() { const d = new Date(Date.now() + 9 * 3600 * 1000); return d.toISOString().slice(0, 10); }
function lower(o) { const r = {}; for (const k in o) r[k.toLowerCase()] = o[k]; return r; }
function clean(s) { return (s == null ? '' : String(s)).replace(/[\r\n]/g, '').slice(0, 200); }
function json(statusCode, obj) { return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }

module.exports.__test = { guard, SYSTEM, PRODUCT };
