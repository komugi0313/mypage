// 究極の二択：みんなの回答を数えるサーバーの関数（Netlify Functions ＋ Netlify Blobs）
// GET  /.netlify/functions/nitaku-vote?ids=abc,def   → {"abc":{"a":12,"b":5}, ...}
// POST /.netlify/functions/nitaku-vote  {"votes":[{"id":"abc","c":"a"}, ...]} → 数えたあとの数
// 問題のidは questions.js の文から作る短い記号。a＝問題データの左側（Aの文）、b＝右側（Bの文）。
// 名前・生年月日など個人の情報は受け取らない・保存しない（どちらを選んだかの数だけ）。
import { getStore } from "@netlify/blobs";

const ID = /^[a-z0-9]{1,13}$/;
const MAX = 40;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function read(store, id) {
  const v = await store.get(id, { type: "json" });
  return v && typeof v.a === "number" && typeof v.b === "number" ? v : { a: 0, b: 0 };
}

export default async (req) => {
  const store = getStore({ name: "nitaku-votes", consistency: "strong" });
  if (req.method === "GET") {
    const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").filter((x) => ID.test(x)).slice(0, MAX);
    const out = {};
    await Promise.all(ids.map(async (id) => { out[id] = await read(store, id); }));
    return json(out);
  }
  if (req.method === "POST") {
    let body;
    try { body = await req.json(); } catch (e) { return json({ error: "bad_json" }, 400); }
    const votes = (Array.isArray(body && body.votes) ? body.votes : [])
      .filter((v) => v && ID.test(v.id) && (v.c === "a" || v.c === "b"))
      .slice(0, MAX);
    const out = {};
    // 同じ問題に何人分も来たとき（みんなで遊んだとき）はまとめて足す
    const add = {};
    votes.forEach((v) => { add[v.id] = add[v.id] || { a: 0, b: 0 }; add[v.id][v.c]++; });
    await Promise.all(Object.keys(add).map(async (id) => {
      const cur = await read(store, id);
      cur.a += add[id].a; cur.b += add[id].b;
      await store.setJSON(id, cur);
      out[id] = cur;
    }));
    return json(out);
  }
  return json({ error: "method" }, 405);
};
