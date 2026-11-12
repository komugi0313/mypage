// 究極の二択：みんなが考えた問題の投稿（Netlify Functions ＋ Netlify Blobs）
// 送られた問題は、まず「確認まち」に入る。サイトの持ち主が確認して「載せる」を押した問題だけが、みんなの問題に加わる。
//
// GET                                            → {approved:[{id,mode,a,b,ex,lv}]}（載せた問題。だれでも読める）
// POST {op:"submit", mode, a, b, ex}             → 確認まちに入れる（名前などは受け取らない）
// 以下は持ち主だけ（ヘッダー x-admin-key ＝ Netlify の環境変数 NITAKU_ADMIN_KEY と同じ文字）
// POST {op:"list"}                               → {pending:[...], approved:[...]}
// POST {op:"decide", id, ok, mode, a, b, ex, lv} → ok=true なら（直した文で）載せる。false なら消す
// POST {op:"remove", id}                         → 載せた問題を外す
import { getStore } from "@netlify/blobs";

const MAXLEN = 60, EXLEN = 60, MAX_PENDING = 500;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
const clean = (t, n) => String(t || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
function cleanQ(b) {
  const q = {
    mode: b.mode === "normal" ? "normal" : "love",
    a: clean(b.a, MAXLEN), b: clean(b.b, MAXLEN), ex: clean(b.ex, EXLEN),
    lv: [1, 2, 3].includes(Number(b.lv)) ? Number(b.lv) : 2,
  };
  if (q.a.length < 2 || q.b.length < 2 || q.a === q.b) return null;
  return q;
}
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

async function all(store, prefix) {
  const { blobs } = await store.list({ prefix });
  const out = [];
  await Promise.all(blobs.map(async (x) => {
    const v = await store.get(x.key, { type: "json" });
    if (v) out.push(Object.assign({ id: x.key.slice(prefix.length) }, v));
  }));
  return out.sort((a, b) => (a.t || 0) - (b.t || 0));
}

export default async (req) => {
  const store = getStore({ name: "nitaku-posts", consistency: "strong" });
  if (req.method === "GET") {
    const ok = await all(store, "ok/");
    return json({ approved: ok.map(({ id, mode, a, b, ex, lv }) => ({ id, mode, a, b, ex, lv })) });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "bad_json" }, 400); }
  const op = body && body.op;

  if (op === "submit") {
    const q = cleanQ(body);
    if (!q) return json({ error: "bad_question" }, 400);
    const { blobs } = await store.list({ prefix: "wait/" });
    if (blobs.length >= MAX_PENDING) return json({ error: "full" }, 429);
    await store.setJSON("wait/" + newId(), Object.assign(q, { t: Date.now() }));
    return json({ ok: true });
  }

  // ここから下は持ち主だけ
  const key = process.env.NITAKU_ADMIN_KEY || "";
  if (!key || req.headers.get("x-admin-key") !== key) return json({ error: "not_admin" }, 403);
  if (op === "list") {
    return json({ pending: await all(store, "wait/"), approved: await all(store, "ok/") });
  }
  if (op === "decide") {
    const id = String(body.id || "");
    if (!/^[a-z0-9]{6,30}$/.test(id)) return json({ error: "bad_id" }, 400);
    if (body.ok) {
      const q = cleanQ(body);
      if (!q) return json({ error: "bad_question" }, 400);
      await store.setJSON("ok/" + id, Object.assign(q, { t: Date.now() }));
    }
    await store.delete("wait/" + id);
    return json({ ok: true });
  }
  if (op === "remove") {
    const id = String(body.id || "");
    if (!/^[a-z0-9]{6,30}$/.test(id)) return json({ error: "bad_id" }, 400);
    await store.delete("ok/" + id);
    return json({ ok: true });
  }
  return json({ error: "op" }, 400);
};
