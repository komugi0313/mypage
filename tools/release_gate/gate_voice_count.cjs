// 占いの言葉の自動直し：おためしの回数が正しく数えられるか（文章作成は呼ばない。保存場所はにせもの）。gate_compat_rules.mjs から呼ぶ。
const Module = require('module'); const path = require('path'); const mem = new Map(); let broken = false;
const orig = Module._load; Module._load = function (r, ...a) { if (r === '@netlify/blobs') return { getStore: () => { if (broken) throw new Error('x'); return { get: async (k) => mem.has(k) ? JSON.parse(mem.get(k)) : null, setJSON: async (k, v) => { mem.set(k, JSON.stringify(v)); } }; } }; return orig.call(this, r, ...a); };
const ROOT = path.resolve(__dirname, '../..');
(async () => {
  const e = [];
  for (const d of ['pro', 'beginner', 'eki-pro']) {
    mem.clear(); broken = false;
    const h = require(path.join(ROOT, d, 'functions/voice-fix.js')).handler;
    const call = async (body, dev) => { const r = await h({ httpMethod: 'POST', headers: { 'x-pk-device': dev || 'A' }, body: JSON.stringify(body) }); return [r.statusCode, JSON.parse(r.body)]; };
    let [c, j] = await call({ mode: 'status' }); if (j.left !== 10 || j.trial !== 10) e.push(d + ' はじめの残り');
    for (let i = 1; i <= 10; i++) { [c, j] = await call({ text: 'にっちゅう' }); if (c !== 200 || j.left !== 10 - i || j.text !== '日柱') e.push(d + ' ' + i + '回目'); }
    [c, j] = await call({ text: 'にっちゅう' }); if (c !== 402 || !j.error || j.error.code !== 'VOICE_OPTION') e.push(d + ' 11回目が止まらない');
    [c, j] = await call({ mode: 'status' }, 'B'); if (j.left !== 10) e.push(d + ' 別の人の回数がまざった');
    broken = true; [c, j] = await call({ text: 'にっちゅう' }, 'C'); if (c !== 200 || j.left !== null) e.push(d + ' 数えられないときに残りを出した');
  }
  console.log(e.length ? 'NG ' + e.join('・') : 'OK'); process.exit(e.length ? 1 : 0);
})();
