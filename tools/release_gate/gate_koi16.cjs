// 恋のかたち診断（koi16）の点検：スマホの幅6種類で、泣き別れ（最後の行が3文字以下）・横はみ出し・小さすぎるボタンがないかを数える。
// 使い方：node tools/release_gate/gate_koi16.cjs   （問題が0件なら終了コード0）
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../../koi16/index.html');
const WIDTHS = [320, 360, 375, 390, 414, 430];
const CODES = ['LVTP','LVTC','LATP','LATC','LVSP','LVSC','LASP','LASC','RVTP','RVTC','RATP','RATC','RVSP','RVSC','RASP','RASC'];

function scan() {
  const out = [];
  const isBlock = el => { const d = getComputedStyle(el).display; return d !== 'inline' && d !== 'contents'; };
  const blocks = new Map();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    if (!n.nodeValue.trim()) continue;
    let el = n.parentElement;
    if (!el || el.closest('script,style,option,select,.hidden,[hidden],.toast')) continue;
    if (!el.getClientRects().length) continue;
    while (el && !isBlock(el)) el = el.parentElement;
    // 言葉のまとまり（.nw）の中ではなく、その外側の段落で見る
    if (el.classList.contains('nw')) { let p = el.parentElement; while (p && !isBlock(p)) p = p.parentElement; if (p) el = p; }
    if (!blocks.has(el)) blocks.set(el, []);
    blocks.get(el).push(n);
  }
  for (const [el, nodes] of blocks) {
    const chars = [];
    for (const t of nodes) for (let i = 0; i < t.nodeValue.length; i++) {
      if (/\s/.test(t.nodeValue[i])) continue;
      const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
      const b = r.getBoundingClientRect(); if (!b.width) continue;
      chars.push({ c: t.nodeValue[i], top: b.top, bottom: b.bottom, nw: t.parentElement.closest('.nw') });
    }
    if (chars.length < 2) continue;
    const lines = [];
    // 同じ行＝縦の範囲が重なる文字（大きさのちがう文字が並んでも1行と数える）
    for (const ch of chars) { let L = lines.find(l => ch.top < l.bottom - 2 && ch.bottom > l.top + 2); if (!L) { L = { top: ch.top, bottom: ch.bottom, s: '', nws: [] }; lines.push(L); } L.s += ch.c; L.nws.push(ch.nw); L.top = Math.min(L.top, ch.top); L.bottom = Math.max(L.bottom, ch.bottom); }
    lines.sort((a, b) => a.top - b.top);
    const last = lines[lines.length - 1];
    // 言葉のまとまり（.nw）がまるごと1行になっているのは、言葉の切れ目での改行なので泣き別れではない
    const wholeWord = last && last.nws[0] && last.nws.every(x => x === last.nws[0]) && last.nws[0].textContent.replace(/\s/g, '') === last.s;
    if (lines.length > 1 && last.s.length <= 3 && !wholeWord) out.push('泣き別れ「' + lines[lines.length - 1].s + '」← ' + lines[lines.length - 2].s.slice(-12));
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push('横にはみ出し');
  document.querySelectorAll('button,a.btn,select').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height < 44) out.push('小さいボタン：' + b.textContent.trim().slice(0, 15)); });
  return out;
}

(async () => {
  const b = await chromium.launch();
  const problems = [];
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    const p = await ctx.newPage();
    const check = async (label) => { (await p.evaluate(scan)).forEach(x => problems.push(w + 'px ' + label + '：' + x)); };
    await p.goto(URL); await check('はじめ');
    await p.goto(URL + '?from=RATC'); await check('はじめ（招待）');
    await p.goto(URL + '?types=1'); await check('16タイプ一覧');
    await p.goto(URL); await p.click('#start');
    for (let i = 0; i < 40; i++) { await check('質問' + (i + 1)); const bs = await p.$$('#scale button'); await bs[i % 5].click(); await p.waitForTimeout(200); }
    for (const [i, c] of CODES.entries()) {
      const other = CODES[(i + 5) % 16];
      const me = { code: c, pct: { LR: 62, VA: 71, TS: 55, PC: 80 }, anx: 30 + i * 4, mode: 'full', at: 1 };
      await p.evaluate(m => localStorage.setItem('koi16_v1', JSON.stringify({ me: m })), me);
      await p.goto(URL + '?t=' + c + '&with=' + other); await p.selectOption('#cmp-sel', other); await check('結果 ' + c);
      await p.evaluate(m => localStorage.setItem('koi16_v1', JSON.stringify({ me: Object.assign({}, m, { anx: null, mode: 'quick' }) })), me);
      await p.goto(URL + '?t=' + c); await check('結果（かんたん版） ' + c);
      await p.goto(URL + '?t=' + other); await check('友だちの結果 ' + other);
    }
    await ctx.close();
  }
  // 保存する画像の文（1080px幅の画像・38pxの文字・文の幅820px）
  const p = await b.newPage(); await p.goto(URL);
  const img = await p.evaluate((codes) => {
    const x = document.createElement('canvas').getContext('2d'); x.font = '400 38px "Hiragino Sans","Noto Sans JP",sans-serif';
    return codes.map(c => window.__koiWrapLines(x, window.__koiCatch(c), 820)).filter(L => L.length > 1 && L[L.length - 1].length <= 3).map(L => L.join('／'));
  }, CODES).catch(e => ['点検に失敗：' + e.message]);
  img.forEach(x => problems.push('保存する画像：' + x));
  await b.close();
  const uniq = [...new Set(problems)];
  console.log(uniq.length ? uniq.join('\n') : 'OK：泣き別れ・はみ出し・小さいボタンは0件（' + WIDTHS.join('/') + 'px）');
  process.exit(uniq.length ? 1 : 0);
})();
