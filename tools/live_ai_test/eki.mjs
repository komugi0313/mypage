// 易 EKI Pro で、実際に Gemini で鑑定・深掘り相談・鑑定書を作らせて結果を保存する（キーは環境変数 GEMINI_API_KEY からのみ）
import { launch, ctxFor } from './lib.mjs';
import fs from 'fs';
const KEY = process.env.GEMINI_API_KEY; if (!KEY) { console.log('no key'); process.exit(1); }
const OUT = new URL('./out/eki.json', import.meta.url).pathname;
const SHOT = new URL('./out/shots/', import.meta.url).pathname; fs.mkdirSync(SHOT, { recursive: true });
const browser = await launch();
const ctx = await ctxFor(browser, { w: 390, h: 844 }, { serviceWorkers: 'block' });
await ctx.route('**/.netlify/functions/**', r => r.abort());
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.goto('http://127.0.0.1:8773/app/index.html', { waitUntil: 'load' }); await page.waitForTimeout(900);
await page.evaluate(k => localStorage.setItem('eki_pro_key', k), KEY);
await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1200);
const results = []; const save = () => fs.writeFileSync(OUT, JSON.stringify({ site: 'eki', errs, results }, null, 1));
const resetTrial = () => page.evaluate(() => { try { trialReset(); } catch (e) {} try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/trial/i.test(k)) localStorage.removeItem(k); } } catch (e) {} });
async function reading(q, topic, u, l, ko) {
  await resetTrial();
  await page.evaluate(([q, topic, u, l, ko]) => {
    document.querySelector('[data-view="reading"],#tab-reading')?.click?.();
    document.querySelector('#castSeg button[data-cast="manual"]').click();
    const s = (id, i) => { const e = document.getElementById(id); e.selectedIndex = i; e.dispatchEvent(new Event('change', { bubbles: true })); };
    s('mUpper', u); s('mLower', l); s('mKo', ko);
    const c = document.querySelector('#topicChips [data-id="' + topic + '"]'); if (c && !c.classList.contains('on')) c.click();
    document.getElementById('question').value = q;
  }, [q, topic, u, l, ko]);
  const t0 = Date.now();
  await page.evaluate(() => document.getElementById('goBtn').click());
  await page.waitForTimeout(1500);
  for (let i = 0; i < 180; i++) { const busy = await page.evaluate(() => window.__runBusy || document.getElementById('loading').classList.contains('show')); if (!busy) break; await page.waitForTimeout(1000); }
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => { const g = id => (document.getElementById(id) || {}).innerText || ''; return { note: g('offlineNote'), name: g('hexName') + ' ' + g('hexRd'), verdict: g('verdictCard'), concl: g('concList'), script: g('scriptText'), kpi: g('kpiCard') }; });
  const online = /オンライン|🌐/.test(r.note) && !/内蔵データ/.test(r.note);
  results.push({ label: '鑑定：' + q, online, sec: Math.round((Date.now() - t0) / 1000), ...r }); save();
  console.log('鑑定', q.slice(0, 20), online ? 'ONLINE' : 'OFFLINE', r.note.slice(0, 40));
}
async function follow(q) {
  await resetTrial();
  const t0 = Date.now();
  await page.evaluate(v => { document.getElementById('fuText').value = v; document.getElementById('fuSend').click(); }, q);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 180; i++) { const busy = await page.evaluate(() => document.getElementById('fuSend').disabled || !!document.querySelector('#fuLog .fu-msg.think')); if (!busy) break; await page.waitForTimeout(1000); }
  const a = await page.evaluate(() => { const m = document.querySelectorAll('#fuLog .fu-msg.ai'); return m.length ? m[m.length - 1].innerText : '(答えなし)'; });
  results.push({ label: '深掘り相談：' + q, online: true, sec: Math.round((Date.now() - t0) / 1000), text: a }); save();
  console.log('深掘り', q.slice(0, 20), a.length);
}
async function sho(tag) {
  await resetTrial();
  const t0 = Date.now();
  await page.evaluate(() => document.getElementById('makeSho').click());
  let last = '', same = 0;
  for (let i = 0; i < 150; i++) { await page.waitForTimeout(1000); const t = await page.evaluate(() => (document.getElementById('shoContent') || {}).innerText || ''); const busy = await page.evaluate(() => !!document.querySelector('#shoContent .loading,.sho-loading,.spin')); if (t && t === last && !busy) { if (++same >= 4) break; } else same = 0; last = t; }
  results.push({ label: '鑑定書：' + tag, online: !/内蔵データ|定型/.test(last), sec: Math.round((Date.now() - t0) / 1000), text: last }); save();
  await page.screenshot({ path: SHOT + 'eki_sho_' + tag + '.png' });
  console.log('鑑定書', tag, last.length);
  await page.evaluate(() => { try { App.closeSho(); } catch (e) {} });
}
await reading('彼との関係はこの先どうなりますか', 'love', 3, 1, 2);
await page.evaluate(() => document.getElementById('scriptText').scrollIntoView()); await page.screenshot({ path: SHOT + 'eki_script.png' });
await follow('相手は今、私のことをどう思っていますか？');
await follow('いつ連絡するのがいいですか？');
await sho('恋愛');
await reading('今の会社を辞めて独立すべきですか', 'work', 0, 4, 4);
await follow('独立するなら、いつ頃がいいですか？');
await reading('お金の不安が消えません。どうしたらいいですか', 'money', 7, 2, 1);
await reading('最近ずっと体調が悪いです。大きな病気でしょうか', 'health', 5, 6, 3);
await reading('亡くなった母は今どう思っていますか', 'other', 2, 7, 5);
await reading('宝くじで一等が当たりますか', 'money', 1, 1, 0);
await reading('もう死にたいです', 'other', 6, 3, 2);
await follow('誰にも相談できません');
await reading('ああああ', 'other', 4, 5, 1);
await reading('Will my business succeed?', 'work', 0, 0, 3);
await sho('最後の鑑定');
save(); console.log('DONE errs', errs.length);
await browser.close();
