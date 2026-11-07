// 究極の二択：「それぞれのスマホで参加」の部屋（Netlify Functions ＋ Netlify Blobs）
// 部屋を作った人（ホスト）が問題と進み具合を書き、参加した人はそれぞれ自分の答えだけを書く。
// 画面は1.5秒ごとに GET で部屋の様子を読みなおす。
//
// GET  /.netlify/functions/nitaku-room?code=1234           → {room, players:[...]}（部屋がなければ room:null）
// POST {op:"create", room}                                  → 新しい部屋（4けたの番号がふさがっていれば 409）
// POST {op:"room",   code, host, room}                      → 部屋の進み具合を書きかえる（ホストだけ）
// POST {op:"player", code, pid, player}                    → 自分の名前・答えを書く
//
// 保存するのは、部屋の番号・問題・進み具合・参加者の呼び名と答えだけ。12時間たった部屋は無いものとして扱う。
import { getStore } from "@netlify/blobs";

const CODE = /^\d{4}$/;
const PID = /^[a-z0-9]{6,24}$/;
const LIFE = 12 * 60 * 60 * 1000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
const alive = (r) => r && typeof r.created === "number" && Date.now() - r.created < LIFE;

function cleanRoom(r) {
  if (!r || typeof r !== "object") return null;
  const s = JSON.stringify(r);
  if (s.length > 80000) return null;
  if (!PID.test(String(r.host || ""))) return null;
  return r;
}
function cleanPlayer(p) {
  if (!p || typeof p !== "object") return null;
  const name = String(p.name || "").slice(0, 12);
  const ans = p.ans && typeof p.ans === "object" ? p.ans : {};
  const times = p.times && typeof p.times === "object" ? p.times : {};
  const out = { name, joined: Number(p.joined) || Date.now(), ans: {}, times: {} };
  Object.keys(ans).slice(0, 200).forEach((k) => { if (/^\d{1,3}:\d{1,2}$/.test(k) && (ans[k] === "A" || ans[k] === "B")) out.ans[k] = ans[k]; });
  Object.keys(times).slice(0, 200).forEach((k) => { if (/^\d{1,3}:\d{1,2}$/.test(k)) out.times[k] = Math.max(0, Math.min(600000, Number(times[k]) || 0)); });
  return out;
}

export default async (req) => {
  const store = getStore({ name: "nitaku-rooms", consistency: "strong" });
  if (req.method === "GET") {
    const code = new URL(req.url).searchParams.get("code") || "";
    if (!CODE.test(code)) return json({ room: null, players: [] });
    const room = await store.get(`${code}/room`, { type: "json" });
    if (!alive(room)) return json({ room: null, players: [] });
    const { blobs } = await store.list({ prefix: `${code}/p/` });
    const players = [];
    await Promise.all(blobs.slice(0, 12).map(async (b) => {
      const p = await store.get(b.key, { type: "json" });
      if (p) players.push(Object.assign({ pid: b.key.split("/").pop() }, p));
    }));
    players.sort((a, b) => a.joined - b.joined);
    return json({ room, players });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "bad_json" }, 400); }
  const op = body && body.op;
  if (op === "create") {
    const room = cleanRoom(body.room);
    if (!room || !CODE.test(String(room.code))) return json({ error: "bad_room" }, 400);
    const cur = await store.get(`${room.code}/room`, { type: "json" });
    if (alive(cur)) return json({ error: "taken" }, 409);
    // 前の古い部屋の参加者は消してから使う
    const { blobs } = await store.list({ prefix: `${room.code}/p/` });
    await Promise.all(blobs.map((b) => store.delete(b.key)));
    room.created = Date.now();
    await store.setJSON(`${room.code}/room`, room);
    return json({ ok: true, room });
  }
  if (op === "room") {
    const code = String(body.code || "");
    if (!CODE.test(code)) return json({ error: "bad_code" }, 400);
    const cur = await store.get(`${code}/room`, { type: "json" });
    if (!alive(cur)) return json({ error: "gone" }, 404);
    if (cur.host !== body.host) return json({ error: "not_host" }, 403);
    const room = cleanRoom(body.room);
    if (!room || room.host !== cur.host) return json({ error: "bad_room" }, 400);
    room.code = code; room.created = cur.created;
    await store.setJSON(`${code}/room`, room);
    return json({ ok: true });
  }
  if (op === "player") {
    const code = String(body.code || ""), pid = String(body.pid || "");
    if (!CODE.test(code) || !PID.test(pid)) return json({ error: "bad" }, 400);
    const cur = await store.get(`${code}/room`, { type: "json" });
    if (!alive(cur)) return json({ error: "gone" }, 404);
    const p = cleanPlayer(body.player);
    if (!p) return json({ error: "bad_player" }, 400);
    const { blobs } = await store.list({ prefix: `${code}/p/` });
    if (!blobs.some((b) => b.key.endsWith("/" + pid)) && blobs.length >= 12) return json({ error: "full" }, 409);
    await store.setJSON(`${code}/p/${pid}`, p);
    return json({ ok: true });
  }
  return json({ error: "op" }, 400);
};
