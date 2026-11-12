// 恋のかたち診断：答えを集める受け口（koi16-collect）と取り出し口（koi16-export）の点検。
// 仮のデータ置き場を使い、正しい答えだけ受け取ること・おかしな答え／18歳未満／ほかのサイトからの送信を断ること・
// 名前やIPを保存しないこと・合言葉がないと取り出せないことを確かめる。
// 使い方：node tools/release_gate/gate_koi16_collect.cjs
const path = require('path');
const mem = new Map();
globalThis.__koi16TestStore = {
  async get(k, o) { const v = mem.get(k); if (v === undefined) return null; return o && o.type === 'json' ? JSON.parse(v) : v; },
  async set(k, v) { mem.set(k, String(v)); },
  async setJSON(k, v) { mem.set(k, JSON.stringify(v)); },
  async list({ prefix }) { return { blobs: [...mem.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
};
process.env.URL = 'https://koi.example';
process.env.KOI16_SALT = 'test-salt';
process.env.KOI16_OWNER_TOKEN = 'owner-secret';
process.env.KOI16_MAX_IP_DAY = '3';
const collect = require(path.resolve(__dirname, '../../koi16/functions/koi16-collect.js'));
const exp = require(path.resolve(__dirname, '../../koi16/functions/koi16-export.js'));
const QUICK = [0,1,2,3,5,6,7,8,10,11,12,13,15,16,17,18];
const full = () => Array.from({ length: 40 }, (_, i) => [-2, -1, 0, 1, 2][i % 5]);
const quick = () => Array.from({ length: 40 }, (_, i) => (QUICK.includes(i) ? 1 : null));
const ev = (body, h = {}) => ({ httpMethod: 'POST', headers: Object.assign({ origin: 'https://koi.example', 'x-nf-client-connection-ip': '203.0.113.' + (h.ip || 1) }, h.headers || {}), body: JSON.stringify(body) });
const base = { v: 'q2', mode: 'full', status: 'crush', age: '25-29', gender: 'female', code: 'LVTP', ans: full() };
let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.log('NG：' + m); } };
(async () => {
  ok((await collect.handler(ev(base))).statusCode === 200, '本格版の正しい答えを受け取る');
  ok((await collect.handler(ev(Object.assign({}, base, { mode: 'quick', ans: quick() }), { ip: 2 }))).statusCode === 200, 'かんたん版の正しい答えを受け取る');
  ok((await collect.handler(ev(Object.assign({}, base, { age: 'u18' }), { ip: 3 }))).statusCode === 400, '18歳未満は受け取らない');
  ok((await collect.handler(ev(Object.assign({}, base, { ans: full().slice(0, 39) }), { ip: 3 }))).statusCode === 400, '問題数がちがう答えは断る');
  ok((await collect.handler(ev(Object.assign({}, base, { ans: full().map((v, i) => (i === 7 ? 5 : v)) }), { ip: 3 }))).statusCode === 400, 'ありえない答え（5）は断る');
  ok((await collect.handler(ev(Object.assign({}, base, { mode: 'quick', ans: full() }), { ip: 3 }))).statusCode === 400, 'かんたん版なのに全部答えたものは断る');
  ok((await collect.handler(ev(Object.assign({}, base, { v: 'q1' }), { ip: 3 }))).statusCode === 400, '古い質問の版は断る');
  ok((await collect.handler(ev(Object.assign({}, base, { name: '山田' }), { ip: 4 }))).statusCode === 200, '余計な項目があっても受け取るが…');
  ok((await collect.handler(ev(base, { ip: 5, headers: { origin: 'https://evil.example' } }))).statusCode === 403, 'ほかのサイトからの送信は断る');
  ok((await collect.handler({ httpMethod: 'GET', headers: {}, body: '' })).statusCode === 405, 'POST 以外は断る');
  for (let i = 0; i < 3; i++) await collect.handler(ev(base, { ip: 9 }));
  ok((await collect.handler(ev(base, { ip: 9 }))).statusCode === 429, '同じIPからの連打は止める');
  const saved = [...mem.entries()].filter(([k]) => k.startsWith('r/')).map(([, v]) => v).join('\n');
  ok(!/山田|203\.0\.113|name|ip/.test(saved), '名前・IPは保存しない');
  ok(!/T\d\d:\d\d/.test(saved), '時刻は保存しない');
  ok((await exp.handler({ headers: {} })).statusCode === 403, '合言葉なしでは取り出せない');
  ok((await exp.handler({ headers: { 'x-koi16-owner': 'wrong' } })).statusCode === 403, 'ちがう合言葉では取り出せない');
  const r = await exp.handler({ headers: { 'x-koi16-owner': 'owner-secret' } });
  ok(r.statusCode === 200 && JSON.parse(r.body).length === 6, '合言葉があれば全件取り出せる（' + (r.statusCode === 200 ? JSON.parse(r.body).length : 0) + '件）');
  console.log(fail ? `NG：${fail}件` : 'OK：答えの受け口・取り出し口の点検はすべて合格');
  process.exit(fail ? 1 : 0);
})();
