// 恋のかたち診断（koi16）の「検索から来てもらうページ」を作る（鑑定者本人 2026-11-19「この形でOK、愛着スタイルも使っていいです」。
// 見本 https://claude.ai/artifact/GCacuiLp7Vz9gsxtfrNhGV・https://claude.ai/artifact/KpZaU8pkoDjVuAKsUALySu・https://claude.ai/artifact/RrHMvJiXMSDp2pfcVqfDGa）。
//   koi16/aichaku/ … 愛着スタイル診断（安定型・不安型・回避型・恐れ型）
//   koi16/chara/ … 恋愛キャラ診断（16キャラの一覧。前の /type/ はここへ）
//   koi16/kataomoi/・aisho/・izon/ … 片思い診断・自分に合う人のタイプ診断・恋愛依存体質チェック
//   koi16/type/<code>/index.html … 16タイプそれぞれのページ（文は診断の中の文＝koi16/index.html の T・ARU_T・JAKU をそのまま使う）
//   koi16/seo.css・koi16/seo.js（改行のしくみ＝診断と同じ BudouX の文節の改行）・koi16/sitemap.xml
// 質問の文はのせない（遊ぶ前に読めるとつまらないため）。研究者の名前・研究の型の名前は出さない。
// 使い方：node tools/koi16_seo.js → python3 tools/add_contrast_guard.py （診断の文を直したら回し直す）
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const K = path.join(ROOT, 'koi16');
const SRC = fs.readFileSync(path.join(K, 'index.html'), 'utf8');
const BASE = 'https://koikata.jp/';
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

// 診断のデータを読む（var 名 = ...; を、かっこの対応で切り出す）
function grab(name) {
  const m = SRC.match(new RegExp('\\nvar ' + name + '\\s*=\\s*'));
  if (!m) throw new Error('見つからない：' + name);
  let i = m.index + m[0].length, d = 0, q = null;
  const st = i;
  for (; i < SRC.length; i++) {
    const c = SRC[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '{' || c === '[') d++;
    else if (c === '}' || c === ']') { d--; if (d === 0) { i++; break; } }
  }
  return 'var ' + name + '=' + SRC.slice(st, i) + ';\n';
}
function grabFn(name) {
  const s = SRC.indexOf('\nfunction ' + name + '(');
  if (s < 0) throw new Error('見つからない：' + name);
  let i = SRC.indexOf('{', s), d = 0;
  for (; i < SRC.length; i++) { if (SRC[i] === '{') d++; else if (SRC[i] === '}') { d--; if (d === 0) { i++; break; } } }
  return SRC.slice(s, i) + '\n';
}
const ctx = {};
vm.createContext(ctx);
vm.runInContext(['AXES', 'T', 'ORDER', 'GROUP', 'GPALE', 'KUSE', 'PAIR', 'ARU_T', 'JAKU', 'CSPLIT'].map(grab).join('') +
  grabFn('pairPart') + grabFn('compat') + 'this.D={AXES,T,ORDER,GROUP,GPALE,KUSE,ARU_T,JAKU,CSPLIT,compat};', ctx);
const { T, ORDER, GROUP, GPALE, KUSE, ARU_T, JAKU, CSPLIT, compat } = ctx.D;

// 図鑑と同じ番号（色の仲間 TP→TC→SP→SC の順）
const NO = {}; let n = 0;
['TP', 'TC', 'SP', 'SC'].forEach(k => ORDER.filter(o => o[2] + o[3] === k).forEach(o => { NO[o] = ++n; }));
const esc = s => String(s).replace(/○○(?=[\u3040-\u309f])/g, '○○\u2060').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nw = s => '<span class="nw">' + esc(s) + '</span>';
const cname = c => { const t = T[c].c, k = CSPLIT[c]; return nw(t.slice(0, k)) + nw(t.slice(k)); };
const fname = c => { const f = T[c].f, m = f.match(/^(.*?(?:な|る|い|す))(.+)$/); return m ? nw(m[1]) + nw(m[2]) : esc(f); };
const grp = c => GROUP[c[2] + c[3]];
const lc = c => c.toLowerCase();
const kn = k => KUSE[k].n.replace('|', '');
const kh = k => KUSE[k].n.split('|').map(nw).join('');


// 改行のしくみ（診断と同じ BudouX）を共通のファイルに書き出す
const bxSrc = SRC.match(/\nvar GLUE_SEL=[^\n]*\n/)[0] + SRC.match(/\nvar BX_MODEL=[^\n]*\n/)[0] +
  SRC.slice(SRC.indexOf('\nvar BX=(function(){'), SRC.indexOf('\nfunction glueAll(')) + grabFn('glueAll');
const EXTRA = '.ty b,.ty>span,.dif .n,.links a>span,.q>b,.q>span,.jk .t,.jk .lb,.tip,.hero .k,.hero .sub,.pair i,.crumb,.cta small,.meta,.kick,.ex div>span,.ex b,.wk span,.kp>span,.dif p,summary span,.rk i';
fs.writeFileSync(path.join(K, 'seo.js'),
  '/* 恋のかたち診断の説明ページ用（tools/koi16_seo.js が koi16/index.html から写して作る。直接直さない）。\n' +
  '   文節で改行する（BudouX・Google・Apache License 2.0 https://github.com/google/budoux の日本語モデル）。 */\n' +
  '(function(){' + bxSrc + 'glueAll(document);Array.prototype.forEach.call(document.querySelectorAll("' + EXTRA + '"),glue);})();\n');

const CSS = `/* 恋のかたち診断の説明ページ用（tools/koi16_seo.js が作る。直すときは道具の中を直して作り直す） */
:root{--bg:#FBF6F1;--card:#FFFFFF;--ink:#33241B;--sub:#5E4A3D;--line:#E6D7CA;--rose:#B01A5A;--rose-soft:#FCE8EF;--rose-ink:#8A1246;--navy:#3B2A6B;
--mincho:"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif;color-scheme:light}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans JP",-apple-system,BlinkMacSystemFont,"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif;font-size:16px;line-height:1.8;font-weight:500}
img{max-width:100%}
a{color:var(--rose-ink)}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:640px;margin:0 auto;padding:6px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.logo{display:flex;flex-direction:column;justify-content:center;text-decoration:none;min-height:48px;line-height:1.25}
.logo b{font-family:var(--mincho);font-weight:800;color:var(--rose);font-size:19px}
.logo small{font-size:11.5px;font-weight:700;color:var(--navy);letter-spacing:.03em}
.top a.zk{font-size:13px;font-weight:700;text-decoration:none;color:var(--rose-ink);background:var(--rose-soft);border-radius:999px;padding:0 14px;min-height:44px;display:inline-flex;align-items:center;white-space:nowrap}
main{max-width:640px;margin:0 auto;padding:6px max(16px,env(safe-area-inset-right,0px)) 40px max(16px,env(safe-area-inset-left,0px));display:grid;gap:16px}
.crumb{font-size:13px;color:var(--sub)}
.crumb a{text-decoration:none}
h1{font-family:var(--mincho);font-size:28px;line-height:1.4;margin:0;text-wrap:balance}
h2{font-family:var(--mincho);font-size:20px;line-height:1.5;margin:0 0 8px}
.note{font-size:14px;color:var(--sub)}
.box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px}
.box p{margin:8px 0}
.box>p:last-child{margin-bottom:0}
.hero{background:linear-gradient(160deg,#FCE3EC 0%,#EDE6FB 100%);border-radius:24px;padding:20px 16px;text-align:center;display:grid;gap:10px}
.kick{justify-self:center;font-size:13px;font-weight:700;color:var(--navy);background:#fff;border-radius:999px;padding:3px 14px}
.hero .sub{display:block;font-family:var(--mincho);font-size:17px;color:var(--rose);margin-top:2px}
.hearts{display:flex;justify-content:center;gap:2px}
.hearts img{width:56px;height:56px}
.trio{display:flex;justify-content:center;gap:4px}.trio img{width:84px;height:84px;object-fit:contain}
.btn{display:block;text-align:center;background:var(--rose);color:#fff;font-weight:900;border-radius:999px;padding:12px 16px;min-height:52px;text-decoration:none;font-size:17px;box-shadow:0 6px 16px rgba(176,26,90,.28)}
.btn2{background:#fff;color:var(--rose);border:2px solid var(--rose);box-shadow:none;font-weight:700}
.meta{font-size:13px;color:var(--sub)}
.cta{display:grid;gap:8px;background:var(--card);border:1.5px solid #F2C2D5;border-radius:18px;padding:16px;text-align:center}
.cta p{margin:0;font-weight:700}
ul.pl{list-style:none;margin:0;padding:0;display:grid;gap:6px}
ul.pl li{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:8px 12px;font-size:15px}
.types{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ty{border-radius:16px;padding:12px 10px;display:grid;gap:2px;align-content:start}
.ty img{width:44px;height:44px}
.ty .k{font-size:12px;font-weight:700}
.ty b{font-size:16px;line-height:1.4}
.ty>span{font-size:13.5px;line-height:1.6}
.t-secure{background:#E3F4EE;color:#1F5F4B}.t-preoc{background:var(--rose-soft);color:var(--rose-ink)}
.t-dismiss{background:#E8EEFB;color:#2C4A86}.t-fear{background:#FFF4D6;color:#6E4A00}
.axis{display:flex;justify-content:space-between;font-size:13px;color:var(--sub);margin-top:6px}
.dif{background:#2F2552;color:#fff;border-radius:18px;padding:16px;text-align:center}
.dif .lb{font-size:13px;color:#E9E3FF}
.dif .n{font-family:var(--mincho);font-size:26px;font-weight:800;color:#FFD6E6;line-height:1.4}
.dif p{margin:6px 0 0;font-size:14px;color:#F1EEFF}
details.fold{background:var(--card);border:1px solid var(--line);border-radius:16px}
details.fold summary{list-style:none;cursor:pointer;padding:12px 16px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:48px}
details.fold summary::-webkit-details-marker{display:none}
details.fold summary::after{content:"開く ▼";flex:0 0 auto;font-size:12px;color:var(--rose);background:var(--rose-soft);border-radius:999px;padding:2px 10px}
details.fold[open] summary::after{content:"閉じる ▲"}
details.fold .in{padding:0 16px 14px;font-size:15px}
details.fold .in h3{font-size:16px;margin:12px 0 2px}
.q{border-left:3px solid var(--rose);padding:2px 0 2px 12px;margin:12px 0}
.q>b{display:block}
.q>span{display:block;color:var(--sub);font-size:15px}
.ex{display:flex;gap:12px;align-items:center;border-top:1px solid var(--line);padding:10px 0}
.ex:first-of-type{border-top:0}
.ex img{width:56px;height:56px;object-fit:contain;flex:0 0 auto}
.ex div{min-width:0}
.ex b{display:block;font-size:14px;color:var(--rose-ink)}
.ex div>span{display:block;font-size:15px}
.wk{display:flex;justify-content:space-between;align-items:baseline;gap:8px;border-top:1px solid var(--line);padding:8px 0;flex-wrap:wrap}
.wk .t{font-family:var(--mincho);font-weight:800;font-size:18px;color:var(--rose)}
.wk span:last-child{font-size:13px;color:var(--sub)}
.rank{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rank a{display:block;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:10px 6px;text-align:center;text-decoration:none;color:var(--ink)}
.rank img{width:72px;height:72px;object-fit:contain;display:block;margin:0 auto}
.rank b{display:block;font-family:var(--mincho);font-size:15px;line-height:1.4}
.rank small{display:block;font-size:12px;color:var(--sub)}
.rank i{display:block;font-style:normal;color:var(--rose);font-weight:700}
.kp{background:var(--rose-soft);border-radius:14px;padding:12px 14px}
.kp .t{display:block;font-family:var(--mincho);font-weight:800;font-size:19px;color:#A0164F}
.kp>span{display:block;font-size:13px;color:var(--sub)}
.kp p{font-size:15px;margin:6px 0 0}
.help{background:#FFF8E8;border:1px solid #EBD9A8;border-radius:16px;padding:14px 16px}
.help h2{font-size:18px}
.help p{margin:4px 0;font-size:15px}
.tel{font-weight:900;font-size:18px;letter-spacing:.02em}
.hero2{text-align:center;background:linear-gradient(180deg,var(--gp,#FBE3EC),var(--bg));border-radius:22px;padding:14px 12px 18px}
.hero2 img{width:180px;height:180px;object-fit:contain;display:block;margin:0 auto}
.hero2 .k{font-size:13px;color:var(--gc,var(--rose));font-weight:700}
.hero2 h1{font-size:30px;margin:2px 0;color:var(--gc,var(--ink))}
.hero2 .f{font-family:var(--mincho);font-weight:700;font-size:17px;color:var(--sub)}
.hero2 .c{font-size:13px;color:var(--sub);letter-spacing:.08em;border-top:1px solid var(--line);display:inline-block;margin-top:8px;padding-top:6px}
.hero2 p{margin:10px 0 0}
.jk .lb{font-size:14px;color:var(--sub)}
.jk .t{font-family:var(--mincho);font-size:24px;font-weight:800;color:var(--rose)}
.jk .tip{background:#FFF4D6;color:#6E4A00;border-radius:12px;padding:8px 12px;font-size:15px;margin-top:8px}
.gh{font-weight:700;font-size:14px;margin:14px 0 6px}
.gh:first-child{margin-top:0}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
@media (min-width:560px){.grid{grid-template-columns:repeat(4,1fr)}}
.grid a{display:block;background:linear-gradient(180deg,var(--gp),#fff);border:1px solid var(--line);border-radius:14px;padding:8px 6px 10px;text-align:center;text-decoration:none;color:var(--ink);min-height:44px}
.grid a[aria-current]{outline:2px solid var(--rose)}
.grid img{width:64px;height:64px;object-fit:contain;display:block;margin:0 auto}
.grid b{display:block;font-family:var(--mincho);font-size:15px;line-height:1.4;color:var(--gc)}
.grid small{display:block;font-size:12px;color:var(--sub)}
@media (max-width:359px){.grid b{font-size:13.5px}.grid a{padding:8px 3px 10px}.box{padding:14px 14px}}
.links{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.links a{font-size:14px;font-weight:700;border:1px solid var(--line);background:var(--card);border-radius:14px;padding:8px 12px;min-height:52px;display:flex;align-items:center;text-decoration:none}
footer{text-align:center;font-size:13px;color:var(--sub);padding:0 16px 32px}
footer a{display:inline-flex;align-items:center;min-height:44px}
footer .credit{font-size:11px;color:#A3948A;margin-top:4px}
.nw{display:inline-block}.nb{white-space:nowrap}
.bx{word-break:keep-all;overflow-wrap:break-word;line-break:strict}
:focus-visible{outline:3px solid #F2B8CF;outline-offset:2px}
`;
fs.writeFileSync(path.join(K, 'seo.css'), CSS);

function page({ url, title, desc, body, ld, img }) {
  const full = BASE + url, im = img || BASE + 'og-image.png?v=3';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${full}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="恋のかたち診断">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${full}">
<meta property="og:image" content="${im}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${im}">
<meta name="theme-color" content="#FBF6F1">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&family=Shippori+Mincho+B1:wght@700;800&display=swap">
<link rel="stylesheet" href="/seo.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="top"><a class="logo" href="/"><b>恋のかたち診断</b><small>16タイプ×愛着スタイル診断</small></a><a class="zk" href="/chara/">16キャラ一覧</a></header>
<main>
${body}
</main>
<footer><a href="/">恋のかたち診断のトップへ</a>　<a href="/?privacy=1">プライバシーポリシー</a><div class="credit" data-nocg>Produced by Mizuki Nico</div></footer>
<script src="/seo.js"></script>
</body>
</html>
`;
}
const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x[0], item: BASE + x[1] })) });
const crumb = (items) => '<div class="crumb"><a href="/">恋のかたち診断</a>' + items.map(x => ' › ' + (x[1] ? `<a href="/${x[1]}">${esc(x[0])}</a>` : esc(x[0]))).join('') + '</div>';
const START = (t) => `<a class="btn" href="/">${(t || '無料で診断する').split(/(?=（)/).map(nw).join('')}</a>`;
const CTA = (lead, btn, note) => `<section class="cta"><p>${esc(lead)}</p>${START(btn)}<small>${esc(note || 'かんたん版20問・約4分／本格版48問・約8分　登録なし・無料')}</small></section>`;
const card = (c, cur) => `<a href="/type/${lc(c)}/" style="--gp:${GPALE[c[2] + c[3]]};--gc:${grp(c).hex}"${cur ? ' aria-current="page"' : ''}><img src="/img/${c}.webp" alt="" width="64" height="64" loading="lazy"><b>${fname(c)}</b><small>${esc(T[c].c)}</small></a>`;
const allGrid = (cur) => ['TP', 'TC', 'SP', 'SC'].map(k => `<div class="gh" style="color:${GROUP[k].hex}">${esc(GROUP[k].n)}</div><div class="grid">${ORDER.filter(o => o[2] + o[3] === k).map(o => card(o, o === cur)).join('')}</div>`).join('');
const ul = xs => '<ul class="pl">' + xs.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
const HEARTS = '<div class="hearts" aria-hidden="true">' + ['secure', 'preoc', 'dismiss', 'fear'].map(n => `<img src="/img/ico/k-${n}.webp" alt="" width="56" height="56">`).join('') + '</div>';
// 4つの心のくせ＝愛着スタイル（鑑定者本人 2026-11-19「不安型・回避型とかも出していい」）
const KT = {
  secure: { k: '安定型', h: '甘えもひとり時間も平気派' },
  preoc: { k: '不安型', h: '既読がつくと気になる派' },
  dismiss: { k: '回避型', h: '大事なことはひとりで決めたい派' },
  fear: { k: '恐れ型（不安＋回避）', h: '好きなのに一歩引いちゃう派' },
};
const tyCell = k => `<div class="ty t-${k}"><img src="/img/ico/k-${k}.webp" alt="" width="44" height="44" loading="lazy"><span class="k">${esc(KT[k].k)}</span><b>${esc(KT[k].h)}</b><span>${esc(KUSE[k].one)}</span></div>`;
const LINKS = (skip) => '<section class="box"><h2>ほかの恋愛診断</h2><div class="links">' + [['aichaku/', '愛着スタイル診断'], ['chara/', '恋愛キャラ診断'], ['kataomoi/', '片思い診断'], ['aisho/', '自分に合う人のタイプ診断'], ['izon/', '恋愛依存体質チェック']].filter(x => x[0] !== skip).map(x => `<a href="/${x[0]}"><span>${esc(x[1])}</span></a>`).join('') + '</div></section>';

const out = [];
function write(rel, html) { const f = path.join(K, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); out.push(rel.replace(/index\.html$/, '')); }

// ===== 16タイプのページ（本格名を先に、お菓子の名前はあと＝鑑定者本人 2026-11-19） =====
ORDER.forEach(c => {
  const t = T[c], a = ARU_T[c], j = JAKU[c], g = grp(c);
  const best = ORDER.filter(x => x !== c).map(x => ({ o: x, s: compat(c, x).score })).sort((p, q) => q.s - p.s).slice(0, 2);
  const body = `${crumb([['恋愛キャラ診断', 'chara/'], [t.f, '']])}
<section class="hero2" style="--gp:${GPALE[c[2] + c[3]]};--gc:${g.hex}">
<img src="/img/${c}.webp" alt="${esc(t.c)}のキャラクター" width="180" height="180">
<div class="k"><span class="nw">No.${('0' + NO[c]).slice(-2)}</span>　<span class="nw">${esc(g.n)}</span></div>
<h1>${fname(c)}</h1>
<div class="f">${cname(c)}</div>
<div class="c">${c}</div>
<p>${esc(t.catch)}</p>
</section>
<section class="box"><h2>どんな恋をする人？</h2><p>${esc(t.sum)}</p></section>
<section class="box"><h2>好きになり方</h2><p>${esc(t.fall)}</p></section>
<section class="box"><h2>好きな人の前でやりがちなこと</h2>${ul(a.aru)}</section>
<section class="box"><h2>このタイプの脈ありサイン</h2>${ul(a.sign)}</section>
<section class="box jk"><div class="lb">このタイプの恋の弱点</div><div class="t">${esc(j[0])}</div><p>${esc(j[1])}。</p><div class="tip">克服のコツ：${esc(j[2])}</div></section>
<section class="box"><h2>恋愛での強み</h2>${ul(t.st)}<h2 style="margin-top:14px">気をつけたいところ</h2>${ul(t.ca)}</section>
<section class="box"><h2>相性がいいタイプ</h2><div class="rank">${best.map(b => `<a href="/type/${lc(b.o)}/"><img src="/img/${b.o}.webp" alt="" width="72" height="72" loading="lazy"><b>${fname(b.o)}</b><small>${esc(T[b.o].c)}</small><i>${b.s}点</i></a>`).join('')}</div><p class="note" style="margin-top:8px">相性の点数は、4つのものさしの組み合わせから出した、この診断独自のめやすです。</p></section>
${CTA('あなたは、どのタイプ？', '無料で診断する')}
<section class="box"><h2>このタイプの結果をくわしく見る</h2><p>すれ違いやすい場面・長く続けるコツ・16タイプすべてとの相性は、診断の結果の画面で見られます。</p><a class="btn btn2" href="/?t=${c}"><span class="nw">${esc(t.f)}の</span><span class="nw">結果を見る</span></a></section>
<section class="box"><h2>16の恋愛キャラ</h2>${allGrid(c)}</section>
${LINKS('')}`;
  write(`type/${lc(c)}/index.html`, page({
    url: `type/${lc(c)}/`,
    title: `${t.f}（${t.c}）の恋愛の特徴・脈ありサイン・相性｜恋のかたち診断`,
    desc: `${t.catch}16タイプ×愛着スタイルの恋愛診断「恋のかたち診断」の「${t.f}」タイプの、好きになり方・やりがちなこと・脈ありサイン・恋の弱点・相性のいいタイプ。`,
    img: BASE + 'img/' + c + '.png',
    ld: crumbLd([['恋のかたち診断', ''], ['恋愛キャラ診断', 'chara/'], [t.f, `type/${lc(c)}/`]]),
    body,
  }));
});

// ===== 愛着スタイル診断 =====
write('aichaku/index.html', page({
  url: 'aichaku/',
  title: '愛着スタイル診断｜あなたは何型の恋をする？安定型・不安型・回避型・恐れ型（無料・4分）',
  desc: '既読がつくと気になる、好きなのに一歩引いてしまう。そんな恋のくせを、安定型・不安型・回避型・恐れ型の4つの愛着スタイルで見られる無料の診断。20問・約4分・登録なし。恋愛の16タイプと好きな人との相性もわかります。',
  ld: crumbLd([['恋のかたち診断', ''], ['愛着スタイル診断', 'aichaku/']]),
  img: BASE + 'img/og-aichaku.png?v=1',
  body: `${crumb([['愛着スタイル診断', '']])}
<section class="hero"><span class="kick">無料・登録なし・4分</span><h1>愛着スタイル診断<span class="sub">あなたは、何型の恋をする？</span></h1>${HEARTS}${START('やってみる（20問）')}<span class="meta">安定型・不安型・回避型・恐れ型の4つから、あなたの心のくせがわかります</span></section>
<section class="box"><h2>こんなこと、ありませんか？</h2>${ul(['既読がついたのに返事がないと、何度もスマホを見てしまう', '好きな人ができると、なぜかそっけなくしてしまう', '恋人に頼るより、ひとりで片づけたほうが楽', '近づきたいのに、近づくと少し怖くなる'])}<p class="note">1つでも思い当たったら、あなたの「心のくせ」が関わっているかもしれません。</p></section>
<section class="box"><h2>4つの愛着スタイル</h2><div class="types">${tyCell('preoc')}${tyCell('fear')}${tyCell('secure')}${tyCell('dismiss')}</div><div class="axis"><span>← 頼れる</span><span>ひとりで立つ →</span></div><p class="note">上の段ほど、心がゆれやすい型です。どれが良い・悪いではありません。境目の近くの人は、となりの型の面もあわせ持っています。</p></section>
${START('自分の型を見る（無料）')}
<section class="dif"><div class="lb">ほかの愛着スタイル診断とのちがい</div><div class="n">16タイプ ＋ 愛着スタイル</div><p>恋愛の16タイプと、4つの愛着スタイルを1回の診断で。好きな人との「2人の心のくせ」の相性まで見られます。</p></section>
<details class="fold"><summary><span>愛着スタイルって？</span></summary><div class="in"><p>大切な人に、どのくらい近づきたいか・頼りたいか、という心の向きのことです。「心のゆれやすさ（不安）」と「頼るのを避ける気持ち（回避）」の2つで、4つの型に分けて見るのが一般的です。</p><p>これまでの人とのかかわりの中で形づくられ、恋人ができたときに強く出やすいと言われています。同じ人でも、相手や時期によって変わります。</p></div></details>
<details class="fold"><summary><span>4つの型のくわしい説明</span></summary><div class="in">${['secure', 'preoc', 'dismiss', 'fear'].map(k => `<h3>${esc(KT[k].k)}（${esc(kn(k))}）</h3><p>${esc(KUSE[k].lead)}</p><p class="note">ひとこと：${esc(KUSE[k].tip)}</p>`).join('')}</div></details>
<details class="fold"><summary><span>この診断の考え方</span></summary><div class="in"><p>愛着の研究で使われている考え方を参考に、恋愛の場面の質問をこちらで作りました。研究の質問の文は使っていません。医療や心理の専門的な検査ではありません。</p><p>参考にした研究は「<a href="/?about=1">この診断の考え方</a>」にまとめています。</p></div></details>
${LINKS('aichaku/')}`,
}));

// ===== 恋愛キャラ診断（16キャラの一覧） =====
write('chara/index.html', page({
  url: 'chara/',
  title: '恋愛キャラ診断｜あなたの恋は16キャラのどれ？（無料・16タイプ×愛着スタイル）',
  desc: '近づき方・気持ちの伝え方・頼り方・恋の原動力の4つで決まる、16の恋愛キャラ。好きになり方・脈ありサイン・恋の弱点・相性のいいキャラがわかる無料の恋愛診断。登録なし。',
  ld: crumbLd([['恋のかたち診断', ''], ['恋愛キャラ診断', 'chara/']]),
  body: `${crumb([['恋愛キャラ診断', '']])}
<section class="hero"><span class="kick">無料・登録なし</span><h1>恋愛キャラ診断<span class="sub">あなたの恋は、16のうちどのキャラ？</span></h1><div class="trio" aria-hidden="true"><img src="/img/LVTP.webp" alt="" width="84" height="84"><img src="/img/RATP.webp" alt="" width="84" height="84"><img src="/img/RASC.webp" alt="" width="84" height="84"></div>${START('無料で診断する（20問・4分）')}<span class="meta">本格版48問もあります・登録なし</span></section>
<section class="box"><h2>キャラでわかること</h2>${ul(['好きになり方と、恋愛での強み', '好きな人の前でやりがちなこと・脈ありサイン', 'あなたの恋の弱点と、克服のコツ', '相性のいいキャラ（16キャラすべてとの相性）', '愛着スタイル（安定型・不安型・回避型・恐れ型）'])}</section>
<section class="box"><h2>16の恋愛キャラ</h2><p class="note">4つのものさし（近づき方・気持ちの伝え方・頼り方・恋の原動力）の組み合わせで決まります。押すと、そのキャラのくわしいページが開きます。</p>${allGrid('')}</section>
${CTA('自分のキャラを見てみる', '無料で診断する')}
${LINKS('chara/')}`,
}));

// ===== 片思い診断 =====
const exT = ['RATP', 'LVTP', 'RASP'], wkT = ['RATP', 'RASC', 'RVTC'];
write('kataomoi/index.html', page({
  url: 'kataomoi/',
  title: '片思い診断｜あなたの脈ありサインと恋の弱点がわかる（無料・4分）｜恋のかたち診断',
  desc: '好きな人の前でついやってしまうこと、あなたの脈ありサイン、片思いが長引きやすい恋の弱点。16タイプ×愛着スタイルでわかる無料の片思い診断。登録なし。',
  ld: crumbLd([['恋のかたち診断', ''], ['片思い診断', 'kataomoi/']]),
  body: `${crumb([['片思い診断', '']])}
<section class="hero"><span class="kick">片思い中の人へ</span><h1>片思い診断<span class="sub">あなたの脈ありサインと、恋の弱点</span></h1>${START('無料で診断する（20問・4分）')}<span class="meta">はじめに「片思い中」を選ぶと、片思いの人向けの説明が出ます</span></section>
<section class="box"><h2>片思い中に、こんなことありませんか？</h2>${ul(['好きな人のSNSは毎日見るのに、いいねは押せない', '好きな人の前だと、なぜかそっけなくなる', '返事が来るまで、何度もスマホを見てしまう', '「好きかも」と気づいてから、動くまでが長い'])}<p class="note">どれも、あなたの恋のタイプと心のくせから説明できます。</p></section>
<section class="box"><h2>タイプでちがう「脈ありサイン」</h2><p class="note">好きな人の前で、つい見せてしまうしぐさです。</p>${exT.map(c => `<div class="ex"><img src="/img/${c}.webp" alt="" width="56" height="56" loading="lazy"><div><b>${esc(T[c].f)}</b><span>${esc(ARU_T[c].sign[0])}</span></div></div>`).join('')}</section>
<section class="box"><h2>片思いが長引きやすい「恋の弱点」</h2>${wkT.map(c => `<div class="wk"><span class="t">${esc(JAKU[c][0])}</span><span>${esc(T[c].f)}</span></div>`).join('')}<p class="note">診断の結果には、あなたのタイプの克服のコツが出ます。</p></section>
<section class="box"><h2>片思いと愛着スタイル</h2><p>片思いのあいだは、相手の気持ちがわからないぶん、心がゆれやすくなります。とくに不安型（既読がつくと気になる派）の人は、返事の速さで一喜一憂しがち。回避型の人は、好きでも自分から距離をとってしまうことがあります。</p><p><a href="/aichaku/">愛着スタイル診断のくわしい説明を見る</a></p></section>
${CTA('自分の脈ありサインを見てみる', '無料で診断する', '好きな人にもリンクを送ると、2人の相性もわかります')}
${LINKS('kataomoi/')}`,
}));

// ===== 自分に合う人のタイプ診断 =====
const ex = 'RATP', exBest = ORDER.filter(x => x !== ex).map(x => ({ o: x, s: compat(ex, x).score })).sort((p, q) => q.s - p.s).slice(0, 2);
write('aisho/index.html', page({
  url: 'aisho/',
  title: '自分に合う人のタイプ診断｜相性のいいタイプと2人の愛着スタイル（無料）｜恋のかたち診断',
  desc: 'あなたに合うのはどんな人？16タイプすべてとの相性を100点満点で。好きな人も診断すると、2人の愛着スタイル（安定型・不安型・回避型・恐れ型）の組み合わせもわかる無料の相性診断。',
  ld: crumbLd([['恋のかたち診断', ''], ['自分に合う人のタイプ診断', 'aisho/']]),
  body: `${crumb([['自分に合う人のタイプ診断', '']])}
<section class="hero"><span class="kick">相性診断</span><h1>自分に合う人のタイプ診断<span class="sub">相性のいいタイプと、2人の心のくせ</span></h1>${START('無料で診断する（20問・4分）')}<span class="meta">本格版48問もあります・登録なし</span></section>
<section class="box"><h2>あなたに合うのは、どんな人？</h2><p>診断すると、16タイプすべてとの相性が100点満点で出ます。たとえば「${esc(T[ex].f)}」の人なら…</p><div class="rank">${exBest.map(b => `<a href="/type/${lc(b.o)}/"><img src="/img/${b.o}.webp" alt="" width="72" height="72" loading="lazy"><b>${fname(b.o)}</b><small>${esc(T[b.o].c)}</small><i>${b.s}点</i></a>`).join('')}</div></section>
<section class="box"><h2>相性の決め方</h2><p>4つのものさしの組み合わせで計算します。いちばん重く見るのは頼り方です。愛着の研究では、2人が頼り合えるかどうかが、関係の満足度に大きく関わることがわかっています。</p>${ul(['頼り方：2人とも頼り合える組み合わせがいちばん高い', '恋の原動力：ときめき派どうし・安心派どうしは満足しやすい', '気持ちの伝え方：言葉どうし・行動どうしは伝わりやすい', '近づき方：リードする人と受けとめる人は、かみ合いやすい'])}<p class="note">この診断独自のめやすです。</p></section>
<section class="box"><h2>2人の愛着スタイルの組み合わせ</h2><p>相手も本格版で診断すると、2人の心のくせの組み合わせが出ます。</p><div class="kp"><span class="t">追いかける人と、離れる人</span><span>不安型 × 回避型</span><p>不安になると近づきたくなる人と、近づかれるとひとりになりたい人。それぞれのコツも出ます。</p></div></section>
${CTA('診断して、相手にも送る', '無料で診断する', '相手が診断すると、2人の相性がわかります')}
${LINKS('aisho/')}`,
}));

// ===== 恋愛依存体質チェック =====
write('izon/index.html', page({
  url: 'izon/',
  title: '恋愛依存体質チェック｜どこからが依存？心のゆれやすさを診断（無料）｜恋のかたち診断',
  desc: '返事が来ないと手につかない、恋人に合わせすぎてしまう。恋愛依存とはどんな状態か、愛着スタイル（不安型）との関係、心がゆれたときのコツ。心のゆれやすさがわかる無料の診断つき。',
  ld: crumbLd([['恋のかたち診断', ''], ['恋愛依存体質チェック', 'izon/']]),
  body: `${crumb([['恋愛依存体質チェック', '']])}
<section class="hero"><span class="kick">どこからが依存？</span><h1>恋愛依存体質チェック<span class="sub">「好き」がつらくなるのは、心のくせのせいかも</span></h1>${START('心のくせを診断する（20問・4分）')}<span class="meta">登録なし・答えはこの端末の中だけ</span></section>
<section class="box"><h2>こんな恋、していませんか？</h2>${ul(['返事が来ないと、ほかのことが手につかない', '恋人の予定に、自分の予定をぜんぶ合わせてしまう', '嫌われるのがこわくて、言いたいことを飲みこむ', '恋人がいないと、自分には価値がない気がする', '別れたあと、すぐ次の恋人をさがしてしまう'])}<p class="note">いくつ当てはまるかで決めるものではありません。思い当たることがあれば、心のくせを知るきっかけにしてください。</p></section>
<section class="box"><h2>「恋愛依存」と、心のゆれやすさ</h2><p>「恋愛依存」は病名ではなく、恋人のことで頭がいっぱいになり、自分の毎日がまわらなくなる状態をさす言葉です。愛着スタイルでいうと、不安型（心がゆれやすく、相手の気持ちを確かめたくなる）の人に起きやすいと言われています。</p><p>この診断では「心のゆれやすさ」を、おだやか・ふつう・ゆれやすいの3つで見られます。</p></section>
<section class="box"><h2>心がゆれたときのコツ</h2>${ul(['「起きたこと」と「頭の中の想像」を分けて考える', '不安なときは、決めつけずに「どう思ってる？」と聞く', '恋人以外の、自分の好きなことに時間を使う'])}</section>
${CTA('自分の心のゆれやすさを見てみる', '無料で診断する')}
<section class="help"><h2>つらい気持ちが続くときは</h2><p>眠れない・食べられない・自分を責めてしまう気持ちが続くときは、ひとりで抱えずに相談してください。</p><p>こころの健康相談統一ダイヤル<br><span class="tel">0570-064-556</span></p><p class="note">この診断は、医療や心理の専門的な検査ではありません。</p></section>
${LINKS('izon/')}`,
}));

// 前の16タイプの一覧（/type/）は恋愛キャラ診断（/chara/）にまとめた（firebase.json で /type/ → /chara/）
try { fs.unlinkSync(path.join(K, 'type', 'index.html')); } catch (e) {}

// ===== サイトマップ =====
fs.writeFileSync(path.join(K, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ['', ...out].map(u => `  <url><loc>${BASE + u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n') + '\n</urlset>\n');
console.log('作ったページ：' + out.length + '（サイトマップ ' + (out.length + 1) + '件）');
