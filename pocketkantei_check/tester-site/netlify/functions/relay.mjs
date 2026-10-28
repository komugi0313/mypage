// 実際の人に試してもらう版：AI（Gemini）への中継。キーは Netlify の環境変数にだけ置き、ブラウザには出さない。
// 招待コードを持つ人だけ使える。1人1日の上限・全体の1日の上限つき。会話の記録（任意）を運営が見られる。
// 環境変数（Netlify の画面 → Site configuration → Environment variables）：
//   GEMINI_API_KEY  … テスト用の Gemini の API キー（必須。上限つきの新しいキーを作って入れる）
//   PK_INVITES      … 招待コードをカンマ区切りで（必須。例：a7k2m9x4,q3w8e5r1）。1人に1つ
//   PK_ADMIN        … 記録を書き出す時の合言葉（16文字以上。記録を見ない時は空でよい）
//   PK_LOG          … '1' なら会話を記録する（試す人に「記録します」と伝えてから）
//   PK_PER_DAY      … 1人1日の呼び出しの上限（既定 200。1回の返事で2〜4回呼ぶ）
//   PK_ALL_DAY      … 全員の合計の1日の上限（既定 2000）
const MODELS = new Set(['gemini-3.1-flash-lite', 'gemini-3.6-flash']);
const H = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const j = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: H });
const jstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
async function store() { if (globalThis.__pkStore) return globalThis.__pkStore; const { getStore } = await import('@netlify/blobs'); return getStore('pk-tester'); }
async function bump(st, key) { const v = (await st.get(key, { type: 'json' })) || { n: 0 }; v.n++; await st.setJSON(key, v); return v.n; }
function safeEq(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

export default async (req) => {
  const url = new URL(req.url);
  const codes = String(process.env.PK_INVITES || '').split(',').map(s => s.trim()).filter(Boolean);
  const st = await store();
  // 運営：会話の記録を書き出す（GET /api/relay?admin=<合言葉>&day=2026-11-01）
  if (req.method === 'GET' && url.searchParams.has('admin')) {
    const need = process.env.PK_ADMIN || '';
    if (need.length < 16 || !safeEq(url.searchParams.get('admin'), need)) return j({ error: { code: 'FORBIDDEN' } }, 403);
    const day = url.searchParams.get('day') || jstDay(), out = {};
    for (const c of codes) { const log = await st.get(`log:${c}:${day}`, { type: 'json' }); const n = await st.get(`n:${c}:${day}`, { type: 'json' }); if (log || n) out[c] = { calls: (n && n.n) || 0, log: log || [] }; }
    return j({ day, testers: out });
  }
  if (req.method !== 'POST') return j({ error: { code: 'METHOD' } }, 405);
  const code = String(req.headers.get('x-pk-invite') || '').trim();
  if (!code || !codes.some(c => safeEq(c, code))) return j({ error: { code: 'BAD_INVITE', message: '招待コードが使えません' } }, 401);
  const m = url.searchParams.get('m') || '';
  if (!MODELS.has(m)) return j({ error: { code: 'BAD_MODEL' } }, 400);
  const key = process.env.GEMINI_API_KEY; if (!key) return j({ error: { code: 'NO_KEY' } }, 500);
  const day = jstDay(), per = +process.env.PK_PER_DAY || 200, all = +process.env.PK_ALL_DAY || 2000;
  if ((await bump(st, `all:${day}`)) > all) return j({ error: { code: 'TESTER_ALL_DAILY', message: '今日の試用の上限に達しました' } }, 429);
  if ((await bump(st, `n:${code}:${day}`)) > per) return j({ error: { code: 'TESTER_DAILY', message: '今日の上限に達しました。明日また使えます' } }, 429);
  const body = await req.text();
  if (body.length > 400000) return j({ error: { code: 'TOO_BIG' } }, 413);
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  const txt = await r.text();
  // 会話の記録（本体の返事だけ＝長い指示つきの呼び出し）。運営が実際のやり取りを見て、決定的なミスを探すため
  if (process.env.PK_LOG === '1' && r.ok) { try {
    const b = JSON.parse(body), sys = ((b.systemInstruction && b.systemInstruction.parts) || []).map(p => p.text || '').join('');
    if (sys.length > 8000) { const last = (b.contents || []).filter(c => c.role === 'user').pop(); const q = ((last && last.parts) || []).map(p => p.text || '').join('').split('\n\n[')[0].slice(0, 600);
      const a = (JSON.parse(txt).candidates || [])[0]; const ans = a && a.content && a.content.parts ? a.content.parts.map(p => p.text || '').join('').slice(0, 4000) : '';
      const k = `log:${code}:${day}`, log = (await st.get(k, { type: 'json' })) || []; log.push({ t: new Date().toISOString(), m, q, a: ans }); await st.setJSON(k, log.slice(-300)); }
  } catch (e) {} }
  return new Response(txt, { status: r.status, headers: H });
};
export const config = { path: '/api/relay' };
