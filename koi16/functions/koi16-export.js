// Netlify Function：集まった答えを、先生（運営者）だけが取り出す口。
// 合言葉（環境変数 KOI16_OWNER_TOKEN）をヘッダ x-koi16-owner に付けたときだけ、全件を JSON で返す。
// 取り出した JSON は tools/koi16_analyze.py にかけて、質問の確かめ（信頼性・タイプのかたより など）に使う。
//
// ※要設定：KOI16_OWNER_TOKEN … 長いランダムな合言葉（ほかの人に教えない）。未設定のときは何も返さない。
// 取り出し方の例：
//   curl -H "x-koi16-owner: 合言葉" https://（サイトのURL）/.netlify/functions/koi16-export -o koi16_answers.json

const crypto = require('crypto');

function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

exports.handler = async (event) => {
  const token = process.env.KOI16_OWNER_TOKEN || '';
  const got = (event.headers || {})['x-koi16-owner'] || '';
  if (!token || !got || !same(token, got)) return { statusCode: 403, body: '' };
  const store = globalThis.__koi16TestStore || await getStore();
  if (!store) return { statusCode: 503, body: '' };
  const out = [];
  const { blobs } = await store.list({ prefix: 'r/' });
  for (const b of blobs) {
    const r = await store.get(b.key, { type: 'json' });
    if (r) out.push(r);
  }
  return { statusCode: 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(out) };
};

async function getStore() { try { const { getStore } = require('@netlify/blobs'); return getStore('koi16-answers'); } catch (e) { return null; } }
