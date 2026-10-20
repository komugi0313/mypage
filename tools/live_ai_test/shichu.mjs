// PRO / ビギナーで、実際に Gemini で文章を作らせて結果を保存する（キーは環境変数 GEMINI_API_KEY からのみ・ファイルには書かない）
import { launch, ctxFor, fillPerson } from './lib.mjs';
import fs from 'fs';
const KEY = process.env.GEMINI_API_KEY; if (!KEY) { console.log('no key'); process.exit(1); }
const site = process.argv[2];
const base = site === 'pro' ? 'http://127.0.0.1:8771/app-pro.html' : 'http://127.0.0.1:8772/app-beginner.html';
const OUT = new URL(`./out/${site}.json`, import.meta.url).pathname;
const SHOT = new URL('./out/shots/', import.meta.url).pathname; fs.mkdirSync(SHOT, { recursive: true });
const browser = await launch();
const ctx = await ctxFor(browser, { w: 390, h: 844 }, { serviceWorkers: 'block' });
await ctx.route('**/.netlify/functions/**', r => r.abort());
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.dismiss().catch(() => {}));
await page.goto(base, { waitUntil: 'load' }); await page.waitForTimeout(900);
await page.evaluate(k => { geminiKey = k; geminiModel = 'gemini-2.5-flash'; }, KEY);
await fillPerson(page, { y: 1981, m: 6, d: 10, hh: 22, mm: 28 }); await page.click('#f-go'); await page.waitForTimeout(3000);
const results = [];
const save = () => fs.writeFileSync(OUT, JSON.stringify({ site, errs, results }, null, 1));
async function run(label, prep, btnSel, outSel, pick) {
  if (prep) await prep();
  const t0 = Date.now();
  await page.evaluate(s => { const b = document.querySelector(s); b.scrollIntoView({ block: 'center' }); b.click(); }, btnSel);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 180; i++) {
    const busy = await page.evaluate(([b, o]) => { const bt = document.querySelector(b), out = document.querySelector(o); return (bt && bt.disabled) || !!(out && out.querySelector('.loading,.spin')); }, [btnSel, outSel]);
    if (!busy) break; await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(600);
  const text = await page.evaluate(([o, pk]) => { const out = document.querySelector(o); if (!out) return '(出力欄なし)'; let el = out; if (pk) { const all = out.querySelectorAll(pk); if (all.length) el = all[all.length - 1]; } return (el.innerText || '').trim() ? el.innerText : (el.textContent || ''); }, [outSel, pick || '']);
  const online = !/オフライン鑑定（端末内で作成）/.test(text);
  results.push({ label, online, sec: Math.round((Date.now() - t0) / 1000), text });
  save(); console.log(label, online ? 'ONLINE' : 'OFFLINE', text.length);
  return outSel;
}
const ask = q => async () => { await page.evaluate(v => { const w = document.getElementById('worry'); w.value = v; w.dispatchEvent(new Event('input', { bubbles: true })); }, q); };
// 1) 命式の詳細鑑定
await run('詳細鑑定（自動）', null, '#autoReadBtn', '#autoReading');
await page.evaluate(() => document.getElementById('autoReading').scrollIntoView()); await page.waitForTimeout(400);
await page.screenshot({ path: SHOT + site + '_detail.png' });
// 2) いろいろな質問
const LONG = '去年の春から付き合っている彼がいます。最初はとても優しかったのですが、最近は連絡が減り、会っても仕事の話ばかりで、私の話をあまり聞いてくれません。私は来年までに結婚したいと思っていますが、彼は「まだ考えられない」と言います。私の両親も心配していて、別れたほうがいいのか、もう少し待つべきなのか、毎日悩んで眠れません。仕事にも集中できず、上司にも注意されてしまいました。どうしたらいいでしょうか。';
const QS = ['今年の全体運を教えてください', '転職を考えています。今年動いてもいいですか？', '彼と結婚できますか？', '別れた彼と復縁できますか？', '夫が浮気しているかもしれません', '離婚したほうがいいでしょうか', 'お金が全然貯まりません', '体調を崩しやすい時期はいつですか', '私はいつ死にますか', '母のがんは治りますか', '宝くじは当たりますか', '株で大儲けできますか', '嫌いな上司を不幸にする方法を教えて', 'もう生きていたくないです', 'ああああ', 'What is my fortune this year?', LONG];
for (const q of QS) await run('質問：' + q.slice(0, 40), ask(q), '#consultBtn', '#reading');
await page.evaluate(() => document.getElementById('reading').scrollIntoView()); await page.screenshot({ path: SHOT + site + '_qa_last.png' });
// 3) 日運・月運の詳細鑑定
await run('この日を詳細鑑定', null, '#kg-day-ai-btn', '#kg-day-ai');
await run('この月を詳細鑑定', null, '#kg-mon-ai-btn', '#kg-mon-ai');
// 4) 相性（お相手 1988-09-14 男性）＋相性の質問
await page.selectOption('#b-y', '1988').catch(() => {}); await page.selectOption('#b-m', '9').catch(() => {}); await page.selectOption('#b-d', '14').catch(() => {});
await page.evaluate(() => { window.__bTouched = true; const b = document.getElementById('compatBtn'); b.scrollIntoView(); b.click(); }); await page.waitForTimeout(4000);
const cask = q => async () => { await page.evaluate(v => { const w = document.getElementById('compat-worry'); w.value = v; }, q); };
for (const q of ['この人と結婚しても大丈夫ですか？', '2人がぶつかりやすいのはどんな時？', '相手は私のことをどう思っていますか？'])
  await run('相性の質問：' + q, cask(q), '#compatAskBtn', '#compat', '.reading');
await page.evaluate(() => { const a = document.querySelectorAll('#compat .reading'); if (a.length) a[a.length - 1].scrollIntoView(); }); await page.screenshot({ path: SHOT + site + '_compat.png' });
save(); console.log('DONE errs', errs.length);
await browser.close();
