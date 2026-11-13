// 恋のかたち診断（koi16）の点検：スマホの幅6種類で、泣き別れ（最後の行が3文字以下）・横はみ出し・小さすぎるボタンがないかを数える。
// 使い方：node tools/release_gate/gate_koi16.cjs   （問題が0件なら終了コード0）
const { chromium } = require('playwright');
const path = require('path');
const URL = 'file://' + path.resolve(__dirname, '../../koi16/index.html');
// 端末の想定（鑑定者本人 2026-11-12「Android と Apple 両方の挙動を試して」）：
//   KOI_MODE=android … Android の Chrome（幅 360・384・393・412・432）
//   KOI_MODE=iphone  … iPhone の Safari に近い条件（幅 375・390・393・402・430・440。Safari は text-wrap:pretty を使わないので切る）
//   KOI_NOFONT=1     … Web フォントが読めないとき（端末の文字で表示）
const MODE = process.env.KOI_MODE || '';
const WIDTHS = MODE === 'android' ? [360, 384, 393, 412, 432] : MODE === 'iphone' ? [375, 390, 393, 402, 430, 440] : [320, 360, 375, 390, 414, 430];
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
      if (/\s/.test(t.nodeValue[i])) { if (chars.length) chars[chars.length - 1].spAfter = true; continue; }
      const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1);
      const b = r.getBoundingClientRect(); if (!b.width) continue;
      chars.push({ c: t.nodeValue[i], top: b.top, bottom: b.bottom, nw: t.parentElement.closest('.nw'), st: i === 0 || !t.nodeValue.slice(0, i).trim() });
    }
    if (chars.length < 2) continue;
    const lines = [];
    // 同じ行＝縦の範囲が重なる文字（大きさのちがう文字が並んでも1行と数える）
    for (const ch of chars) { let L = lines.find(l => ch.top < l.bottom - 2 && ch.bottom > l.top + 2); if (!L) { L = { top: ch.top, bottom: ch.bottom, s: '', nws: [] }; lines.push(L); } L.s += ch.c; L.nws.push(ch.nw); L.top = Math.min(L.top, ch.top); L.bottom = Math.max(L.bottom, ch.bottom); }
    lines.sort((a, b) => a.top - b.top);
    const last = lines[lines.length - 1];
    // 言葉のまとまり（.nw）がまるごと1行になっているのは、言葉の切れ目での改行なので泣き別れではない
    const wholeWord = last && last.nws[0] && last.nws.every(x => x === last.nws[0]) && last.nws[0].textContent.replace(/\s/g, '') === last.s;
    // 言葉の途中での改行：行の頭が、文節の切れ目（文のかたまりの頭）でも、句読点・かっこのあとでもない
    for (let li = 1; li < lines.length; li++) {
      const firstIdx = chars.findIndex(ch => ch.top >= lines[li].top - 1 && ch.bottom <= lines[li].bottom + 1);
      if (firstIdx <= 0) continue;
      const ch = chars[firstIdx], prev = chars[firstIdx - 1].c;
      if (/[（「『【(]/.test(prev)) out.push('かっこの直後で改行「' + lines[li - 1].s.slice(-6) + '／' + lines[li].s.slice(0, 6) + '」');
      if (!ch.st && /[A-Za-z0-9]/.test(prev) && /[A-Za-z0-9]/.test(ch.c) && !chars[firstIdx - 1].spAfter) out.push('英字の言葉の途中で改行「' + lines[li - 1].s.slice(-6) + '／' + lines[li].s.slice(0, 6) + '」');
      if (!ch.st && /[\u30a1-\u30fa\u30fc]/.test(prev) && /[\u30a1-\u30fa\u30fc]/.test(ch.c)) out.push('カタカナの言葉の途中で改行「' + lines[li - 1].s.slice(-6) + '／' + lines[li].s.slice(0, 6) + '」');
      else if (!ch.st && !chars[firstIdx - 1].spAfter && !/[（「『【]/.test(ch.c) && !/[、。，．・）」』】！？!?…：―ー\/／]/.test(prev) && /[\u3040-\u30ff\u4e00-\u9fff]/.test(ch.c + prev)) out.push('言葉の途中で改行「' + lines[li - 1].s.slice(-6) + '／' + lines[li].s.slice(0, 6) + '」');
    }
    if (lines.length > 1 && last.s.length <= 3 && !wholeWord) out.push('泣き別れ「' + lines[lines.length - 1].s + '」← ' + lines[lines.length - 2].s.slice(-12));
  }
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push('横にはみ出し');
  // ボタンの文字は横並びの箱なので、文字を分けるとすき間ができる（「この診断の考 え方を見る」）
  document.querySelectorAll('button .nb,.btn .nb,button wbr,.btn wbr').forEach(x => out.push('ボタンの文字にすき間：' + x.closest('button,.btn').textContent.trim().slice(0, 15)));
  document.querySelectorAll('button,a.btn,select').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height < 44) out.push('小さいボタン：' + b.textContent.trim().slice(0, 15)); });
  return out;
}

(async () => {
  const b = await chromium.launch();
  const problems = [];
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
      userAgent: MODE === 'iphone' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36' });
    if (MODE === 'iphone') await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '*{text-wrap-style:auto!important}'; document.head.appendChild(s); }));
    if (process.env.KOI_NOFONT) await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => problems.push(w + 'px プログラムのエラー：' + e.message));
    const check = async (label) => { (await p.evaluate(scan)).forEach(x => problems.push(w + 'px ' + label + '：' + x)); };
    await p.goto(URL); await check('はじめ');
    await p.goto(URL + '?from=RATC'); await check('はじめ（招待）');
    await p.goto(URL + '?types=1'); await check('16タイプ一覧');
    await p.goto(URL + '?about=1'); await check('この診断の考え方');
    await p.goto(URL + '?privacy=1'); await check('プライバシーポリシー');
    await p.goto(URL + '?licenses=1'); await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true)); await p.waitForTimeout(400); await check('ライセンス');
    { // みんなで診断（グループ）：入る前・入ったあと（QR）・8人いっぱい、と結果の「QRを見せる」
      const nm = ['みき','ゆう','さき','あおい','はるか','りん','そら','ひなた'], cs = ['LVTP','RASC','RATC','LATC','RVSP','LVSC','RASP','RVTC'];
      const m = k => cs.slice(0, k).map((c, i) => c + '.' + encodeURIComponent(nm[i])).join('~');
      await p.evaluate(() => localStorage.removeItem('koi16_v1'));
      await p.goto(URL + '?g=gate01&m=' + m(3)); await check('みんなで診断（入る前）');
      await p.evaluate(() => localStorage.setItem('koi16_v1', JSON.stringify({ me: { code: 'RASC', pct: { LR: 60, VA: 60, TS: 60, PC: 60 }, anx: 40, mode: 'full', at: 1 }, groups: { gate01: { me: 'ゆう', m: [], at: 1 } } })));
      await p.goto(URL + '?g=gate01&m=' + m(5)); await check('みんなで診断（入ったあと）');
      await p.goto(URL + '?g=gate02&m=' + m(8)); await check('みんなで診断（8人）');
      await p.goto(URL + '?t=RASC'); await p.click('[data-act=qr]'); await check('結果のQR');
      await p.evaluate(([a8, a3]) => { const o = JSON.parse(localStorage.getItem('koi16_v1') || '{}'); o.groups = { g8: { me: 'ゆう', m: a8, at: Date.now() }, g3: { me: 'ゆう', m: a3, at: Date.now() - 1000 } }; localStorage.setItem('koi16_v1', JSON.stringify(o)); },
        [cs.map((c, i) => ({ c, n: nm[i] })), cs.slice(0, 3).map((c, i) => ({ c, n: nm[i] }))]);
      await p.goto(URL); await check('はじめ（参加したグループ）');
      await p.goto(URL + '?t=RASC'); await check('結果（参加したグループ）');
      await p.goto(URL); await p.click('[data-gid=g3]'); await check('参加したグループから開く');
    }
    await p.goto(URL); await p.click('#start'); await check('恋の状況'); await p.click('[data-status=crush]');
    for (let i = 0; i < 40; i++) { await check('質問' + (i + 1)); const bs = await p.$$('#scale button'); await bs[i % 5].click(); await p.waitForTimeout(200); }
    for (const [i, c] of CODES.entries()) {
      const other = CODES[(i + 5) % 16];
      const me = { code: c, pct: { LR: 62, VA: 71, TS: 55, PC: 80 }, anx: 30 + i * 4, mode: 'full', status: ['partner','crush','none','skip'][i % 4], at: 1 };
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
