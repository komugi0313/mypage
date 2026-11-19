// 恋のかたち診断（koi16）の「検索から来てもらうページ」を作る（鑑定者本人 2026-11-19「この形でOK、愛着スタイルも使っていいです」。
// 見本 https://claude.ai/artifact/GCacuiLp7Vz9gsxtfrNhGV）。
//   koi16/aichaku/index.html … 愛着スタイル診断（恋の心のくせ）の説明ページ
//   koi16/type/index.html     … 16タイプの一覧
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
fs.writeFileSync(path.join(K, 'seo.js'),
  '/* 恋のかたち診断の説明ページ用（tools/koi16_seo.js が koi16/index.html から写して作る。直接直さない）。\n' +
  '   文節で改行する（BudouX・Google・Apache License 2.0 https://github.com/google/budoux の日本語モデル）。 */\n' +
  '(function(){' + bxSrc + 'glueAll(document);Array.prototype.forEach.call(document.querySelectorAll(".map div,.q>b,.q>span,.jk .t,.jk .lb,.tip,.hero .k,.pair i,.crumb,.cta small"),glue);})();\n');

const CSS = `/* 恋のかたち診断の説明ページ用（tools/koi16_seo.js が作る。直すときは道具の中を直して作り直す） */
:root{--bg:#FBF6F1;--card:#FFFFFF;--ink:#33241B;--sub:#5E4A3D;--line:#E6D7CA;--rose:#B01A5A;--rose-soft:#FCE8EF;--rose-ink:#8A1246;
--mincho:"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif;color-scheme:light}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans JP",-apple-system,BlinkMacSystemFont,"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif;font-size:16px;line-height:1.8;font-weight:500}
img{max-width:100%}
a{color:var(--rose-ink)}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:640px;margin:0 auto;padding:8px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.logo{font-family:var(--mincho);font-weight:800;color:var(--rose);text-decoration:none;font-size:18px;display:inline-flex;align-items:center;min-height:44px}
.top a.zk{font-size:14px;font-weight:700;text-decoration:none;color:var(--rose-ink);background:var(--rose-soft);border-radius:999px;padding:0 14px;min-height:44px;display:inline-flex;align-items:center}
main{max-width:640px;margin:0 auto;padding:6px max(16px,env(safe-area-inset-right,0px)) 40px max(16px,env(safe-area-inset-left,0px));display:grid;gap:16px}
.crumb{font-size:13px;color:var(--sub)}
.crumb a{text-decoration:none}
h1{font-family:var(--mincho);font-size:27px;line-height:1.45;margin:0;text-wrap:balance}
h1 em{font-style:normal;color:var(--rose)}
h2{font-family:var(--mincho);font-size:20px;line-height:1.5;margin:0 0 8px}
.lead{color:var(--sub);margin:0}
.box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px}
.box p{margin:8px 0}
.box p:first-of-type{margin-top:0}
.cta{display:grid;gap:8px;background:linear-gradient(180deg,var(--rose-soft),var(--card));border:1.5px solid #F2C2D5;border-radius:18px;padding:16px;text-align:center}
.cta p{margin:0;font-weight:700}
.btn{display:block;text-align:center;background:var(--rose);color:#fff;font-weight:700;border-radius:999px;padding:10px 16px;min-height:48px;text-decoration:none;font-size:16px}
.btn2{background:#fff;color:var(--rose);border:2px solid var(--rose)}
.cta small{color:var(--sub);font-size:13px}
.map{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.map div{border-radius:12px;padding:10px;font-size:14px;line-height:1.6}
.map b{display:block;font-size:15px;margin-bottom:3px}
.m-secure{background:#E3F4EE;color:#1F5F4B}.m-preoc{background:var(--rose-soft);color:var(--rose-ink)}
.m-dismiss{background:#E8EEFB;color:#2C4A86}.m-fear{background:#FFF4D6;color:#6E4A00}
.axis{display:flex;justify-content:space-between;font-size:13px;color:var(--sub);margin-top:6px}
.note{font-size:14px;color:var(--sub)}
.q{border-left:3px solid var(--rose);padding:2px 0 2px 12px;margin:12px 0}
.q>b{display:block}
.q>span{display:block;color:var(--sub);font-size:15px}
ul.pl{list-style:none;margin:0;padding:0;display:grid;gap:6px}
ul.pl li{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:8px 12px;font-size:15px}
.hero{text-align:center;background:linear-gradient(180deg,var(--gp,#FBE3EC),var(--bg));border-radius:22px;padding:14px 12px 18px}
.hero img{width:180px;height:180px;object-fit:contain;display:block;margin:0 auto}
.hero .k{font-size:13px;color:var(--gc,var(--rose));font-weight:700}
.hero h1{font-size:30px;margin:2px 0}
.hero .f{color:var(--gc,var(--rose));font-weight:700;font-size:17px}
.hero .c{font-size:13px;color:var(--sub);letter-spacing:.08em;border-top:1px solid var(--line);display:inline-block;margin-top:8px;padding-top:6px}
.hero p{margin:10px 0 0}
.jk .lb{font-size:14px;color:var(--sub)}
.jk .t{font-family:var(--mincho);font-size:24px;font-weight:800;color:var(--rose)}
.jk .tip{background:#FFF4D6;color:#6E4A00;border-radius:12px;padding:8px 12px;font-size:15px;margin-top:8px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.pair a{display:block;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:10px 6px;text-align:center;font-size:13px;text-decoration:none;color:var(--ink)}
.pair img{width:76px;height:76px;object-fit:contain;display:block;margin:0 auto}
.pair b{display:block;font-family:var(--mincho);font-size:16px;line-height:1.4}
.pair i{display:block;font-style:normal;color:var(--rose);font-weight:700;margin-top:2px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
@media (min-width:560px){.grid{grid-template-columns:repeat(4,1fr)}}
.grid a{display:block;background:linear-gradient(180deg,var(--gp),#fff);border:1px solid var(--line);border-radius:14px;padding:8px 6px 10px;text-align:center;text-decoration:none;color:var(--ink);min-height:44px}
.grid a[aria-current]{outline:2px solid var(--rose)}
.grid img{width:64px;height:64px;object-fit:contain;display:block;margin:0 auto}
.grid b{display:block;font-family:var(--mincho);font-size:15px;line-height:1.4}
.grid small{display:block;font-size:12px;color:var(--sub)}
.gh{font-weight:700;font-size:15px;margin:14px 0 6px}
.gh:first-child{margin-top:0}
.links{display:flex;flex-wrap:wrap;gap:8px}
.links a{font-size:14px;border:1px solid var(--line);background:var(--card);border-radius:999px;padding:0 14px;min-height:44px;display:inline-flex;align-items:center;text-decoration:none}
footer{text-align:center;font-size:13px;color:var(--sub);padding:0 16px 32px}
footer a{display:inline-flex;align-items:center;min-height:44px}
footer .credit{font-size:11px;color:#A3948A;margin-top:4px}
.nw{display:inline-block}.nb{white-space:nowrap}
.bx{word-break:keep-all;overflow-wrap:break-word;line-break:strict}
:focus-visible{outline:3px solid #F2B8CF;outline-offset:2px}
`;
fs.writeFileSync(path.join(K, 'seo.css'), CSS);

function page({ url, title, desc, body, ld, img }) {
  const full = BASE + url;
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
<meta property="og:image" content="${img || BASE + 'og-image.png?v=3'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${img || BASE + 'og-image.png?v=3'}">
<meta name="theme-color" content="#FBF6F1">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700&family=Shippori+Mincho+B1:wght@700;800&display=swap">
<link rel="stylesheet" href="/seo.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="top"><a class="logo" href="/">恋のかたち診断</a><a class="zk" href="/type/">16タイプ一覧</a></header>
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
const CTA = (lead, btn) => `<section class="cta"><p>${lead}</p><a class="btn" href="/">${btn}</a><small>本格版48問・約8分／かんたん版20問・約4分　登録なし・無料</small></section>`;
const card = (c, cur) => `<a href="/type/${lc(c)}/" style="--gp:${GPALE[c[2] + c[3]]}"${cur ? ' aria-current="page"' : ''}><img src="/img/${c}.webp" alt="" width="64" height="64" loading="lazy"><b>${cname(c)}</b><small>${fname(c)}</small></a>`;
const allGrid = (cur) => ['TP', 'TC', 'SP', 'SC'].map(k => `<div class="gh" style="color:${GROUP[k].hex}">${esc(GROUP[k].n)}</div><div class="grid">${ORDER.filter(o => o[2] + o[3] === k).map(o => card(o, o === cur)).join('')}</div>`).join('');

const out = [];
function write(rel, html) { const f = path.join(K, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); out.push(rel.replace(/index\.html$/, '')); }

// ===== 16タイプのページ =====
ORDER.forEach(c => {
  const t = T[c], a = ARU_T[c], j = JAKU[c], g = grp(c);
  const best = ORDER.filter(x => x !== c).map(x => ({ o: x, s: compat(c, x).score })).sort((p, q) => q.s - p.s).slice(0, 2);
  const body = `<div class="crumb"><a href="/">恋のかたち診断</a> › <a href="/type/">16タイプ</a> › ${esc(t.c)}</div>
<section class="hero" style="--gp:${GPALE[c[2] + c[3]]};--gc:${g.hex}">
<img src="/img/${c}.webp" alt="${esc(t.c)}のキャラクター" width="180" height="180">
<div class="k"><span class="nw">No.${('0' + NO[c]).slice(-2)}</span>　<span class="nw">${esc(g.n)}</span></div>
<h1>${cname(c)}</h1>
<div class="f">${fname(c)}</div>
<div class="c">${c}</div>
<p>${esc(t.catch)}</p>
</section>
<section class="box"><h2>どんな恋をする人？</h2><p>${esc(t.sum)}</p></section>
<section class="box"><h2>好きになり方</h2><p>${esc(t.fall)}</p></section>
<section class="box"><h2>好きな人の前でやりがちなこと</h2><ul class="pl">${a.aru.map(x => '<li>' + esc(x) + '</li>').join('')}</ul></section>
<section class="box"><h2>${esc(t.c)}の脈ありサイン</h2><ul class="pl">${a.sign.map(x => '<li>' + esc(x) + '</li>').join('')}</ul></section>
<section class="box jk"><div class="lb">このタイプの恋の弱点</div><div class="t">${esc(j[0])}</div><p>${esc(j[1])}。</p><div class="tip">克服のコツ：${esc(j[2])}</div></section>
<section class="box"><h2>恋愛での強み</h2><ul class="pl">${t.st.map(x => '<li>' + esc(x) + '</li>').join('')}</ul><h2 style="margin-top:14px">気をつけたいところ</h2><ul class="pl">${t.ca.map(x => '<li>' + esc(x) + '</li>').join('')}</ul></section>
<section class="box"><h2>相性がいいタイプ</h2><div class="pair">${best.map(b => `<a href="/type/${lc(b.o)}/"><img src="/img/${b.o}.webp" alt="" width="76" height="76" loading="lazy"><b>${cname(b.o)}</b>${fname(b.o)}<i>${b.s}点</i></a>`).join('')}</div><p class="note" style="margin-top:8px">相性の点数は、4つのものさしの組み合わせから出した、この診断独自のめやすです。</p></section>
${CTA('あなたは、どのタイプ？', '無料で診断する')}
<section class="box"><h2>このタイプの結果をくわしく見る</h2><p>すれ違いやすい場面・長く続けるコツ・16タイプすべてとの相性は、診断の結果の画面で見られます。</p><a class="btn btn2" href="/?t=${c}"><span class="nw">${esc(t.c)}の</span><span class="nw">結果を見る</span></a></section>
<section class="box"><h2>16の恋愛タイプ</h2>${allGrid(c)}</section>
<div class="links"><a href="/aichaku/">愛着スタイル診断（恋の心のくせ）</a></div>`;
  write(`type/${lc(c)}/index.html`, page({
    url: `type/${lc(c)}/`,
    title: `${t.c}（${t.f}）の恋愛の特徴・脈ありサイン・相性｜恋のかたち診断`,
    desc: `${t.catch}恋のかたち診断の16タイプ「${t.c}」の、好きになり方・やりがちなこと・脈ありサイン・恋の弱点・相性のいいタイプ。`,
    img: BASE + 'img/' + c + '.png',
    ld: crumbLd([['恋のかたち診断', ''], ['16タイプ', 'type/'], [t.c, `type/${lc(c)}/`]]),
    body,
  }));
});

// ===== 16タイプの一覧 =====
write('type/index.html', page({
  url: 'type/',
  title: '16の恋愛タイプ一覧｜恋のかたち診断',
  desc: '恋のかたち診断の16の恋愛タイプ（キャラクター）の一覧。好きになり方・脈ありサイン・恋の弱点・相性を、タイプごとに見られます。',
  ld: crumbLd([['恋のかたち診断', ''], ['16タイプ', 'type/']]),
  body: `<div class="crumb"><a href="/">恋のかたち診断</a> › 16タイプ</div>
<h1>16の<em>恋愛タイプ</em>一覧</h1>
<p class="lead">近づき方・気持ちの伝え方・頼り方・恋の原動力の4つのものさしで決まる、16のお菓子のキャラクターです。気になるタイプを押すと、くわしい説明が開きます。</p>
<section class="box">${allGrid('')}</section>
${CTA('あなたは、どのタイプ？', '無料で診断する')}
<div class="links"><a href="/aichaku/">愛着スタイル診断（恋の心のくせ）</a></div>`,
}));

// ===== 愛着スタイル診断（恋の心のくせ） =====
const mapCell = k => `<div class="m-${k}"><b>${kh(k)}</b>${esc(KUSE[k].one)}</div>`;
write('aichaku/index.html', page({
  url: 'aichaku/',
  title: '愛着スタイル診断｜恋の心のくせが4つの型でわかる（無料）｜恋のかたち診断',
  desc: '返事が遅いと不安になる、好きなのに近づくと引いてしまう。そんな恋のくせを、心のゆれやすさと頼り方の2つのものさしで、4つの型に分けて見られる無料の診断です。登録なし。',
  ld: crumbLd([['恋のかたち診断', ''], ['愛着スタイル診断', 'aichaku/']]),
  body: `<div class="crumb"><a href="/">恋のかたち診断</a> › 恋の心のくせ</div>
<h1>愛着スタイル診断｜<em>恋の心のくせ</em>が、4つの型でわかる</h1>
<p class="lead">返事が遅いと不安になる。好きなのに、近づくと一歩引いてしまう。そんな恋のくせには、心の「ゆれやすさ」と「頼り方」が関わっています。</p>
${CTA('自分の心のくせを見てみる', '無料で診断する')}
<section class="box"><h2>愛着スタイルって？</h2><p>大切な人に、どのくらい近づきたいか・頼りたいか、という心の向きのことです。これまでの人とのかかわりの中で形づくられ、恋人ができたときに強く出やすいと言われています。</p><p>同じ人でも、相手や時期によって変わることがあります。恋のかたち診断では、愛着の研究を参考に、2つのものさしで今のあなたの心のくせを見ています。</p></section>
<section class="box"><h2>2つのものさしで、4つの心のくせ</h2>
<div class="map">${mapCell('preoc')}${mapCell('fear')}${mapCell('secure')}${mapCell('dismiss')}</div>
<div class="axis"><span>← 頼れる</span><span>ひとりで立つ →</span></div>
<p class="note">上の段ほど、心がゆれやすい型です。どれが良い・悪いではありません。境目の近くの人は、となりの型の面もあわせ持っています。</p></section>
<section class="box"><h2>こんな悩みはありませんか？</h2>
<div class="q"><b>既読がついたのに返事がないと、落ち着かない</b><span>「${esc(kn('preoc'))}」くせが出ているのかもしれません。</span></div>
<div class="q"><b>好きな人ができると、なぜか冷たくしてしまう</b><span>「${esc(kn('fear'))}」くせの人によくあることです。</span></div>
<div class="q"><b>恋人に頼るのが苦手で、つい「大丈夫」と言ってしまう</b><span>「${esc(kn('dismiss'))}」くせかもしれません。</span></div>
<div class="q"><b>不安なときも、相手に素直に話せる</b><span>「${esc(kn('secure'))}」くせの人に多い強みです。</span></div></section>
<section class="box"><h2>4つの心のくせ</h2>${['secure', 'preoc', 'dismiss', 'fear'].map(k => `<h2 style="font-size:17px;margin:14px 0 4px">${kh(k)}</h2><p>${esc(KUSE[k].lead)}</p><p class="note">ひとこと：${esc(KUSE[k].tip)}</p>`).join('')}</section>
<section class="box"><h2>診断でわかること</h2><ul class="pl"><li>あなたの心のくせと、図の上の位置</li><li>心のゆれやすさ（おだやか・ふつう・ゆれやすい）</li><li>16の恋愛タイプと、恋の弱点・脈ありサイン</li><li>好きな人と2人の心のくせの組み合わせ（2人とも本格版で診断したとき）</li></ul></section>
${CTA('自分の心のくせを見る', '無料で診断する')}
<p class="note">恋愛心理学の研究を参考にした診断です。医療や心理の専門的な検査ではありません。参考にした研究は「<a href="/?about=1">この診断の考え方</a>」にまとめています。</p>
<section class="box"><h2>16の恋愛タイプ</h2>${allGrid('')}</section>`,
}));

// ===== サイトマップ =====
fs.writeFileSync(path.join(K, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ['', ...out].map(u => `  <url><loc>${BASE + u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n') + '\n</urlset>\n');
console.log('作ったページ：' + out.length + '（サイトマップ ' + (out.length + 1) + '件）');
