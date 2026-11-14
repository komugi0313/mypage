// アイ・シンク：テーマ別の質問のページ（検索から来てもらうため）を作る。
// 使い方：node tools/isync_matome.js （問題を直したら回し直す）
//  作るもの：isync/packs.js（テーマごとの質問の目印＝アプリが ?pack= で使う）・isync/<テーマ>/index.html・isync/sitemap.xml
//  問題の目印は app.js と同じ作り方（問題の文｜答えA のハッシュ）。i-sync.jp がつながったら BASE を書きかえて回し直す。
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', 'isync');
const BASE = 'https://isync-futari.web.app/';
global.window = {};
require(path.join(D, 'questions.js')); require(path.join(D, 'weights.js'));
const CATS = window.SY_CATS, W = window.SY_W;
const Q = window.SY_Q.map(r => ({ cat: r[0], q: r[1], a: r[2], b: r[3], c: r[4] || 'こだわらない' }));
const hq = s => { let h = 5381; for (const c of s) h = (Math.imul(h, 33) ^ c.codePointAt(0)) >>> 0; return h.toString(36); };
Q.forEach(x => { x.key = hq(x.q + '|' + x.a); });
const WB = new Set(W.b), WL = new Set(W.l);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const len = x => x.q.length + x.a.length + x.b.length;

// テーマ（ページどうしで同じ質問は出さない。短い問題から選ぶ）
const used = new Set();
const pick = (filter, n) => { const out = Q.map((x, i) => ({ x, i })).filter(({ x, i }) => !used.has(i) && filter(x, i)).sort((a, b) => len(a.x) - len(b.x)).slice(0, n); out.forEach(o => used.add(o.i)); return out.map(o => o.i).sort((a, b) => a - b); };
const PAGES = [
  { slug: 'kekkon', h1: '結婚前に話し合っておきたいこと40選', title: '結婚前に話し合っておきたいこと40選｜2択で答え合わせ', short: '結婚前に話し合っておきたいこと',
    lead: 'お金・仕事・家族・暮らしなど、結婚の前に知っておきたい価値観の質問を40こ集めました。言いにくいことも、2択なら気軽に聞けます。2人で答え合わせすると、重なるところとちがうところがわかります。',
    ids: () => pick((x, i) => WB.has(i) && x.cat !== 'ドキドキ', 40) },
  { slug: 'tsukiau', h1: '付き合う前に知りたい、恋愛の価値観の質問40選', title: '付き合う前に知りたい恋愛の価値観の質問40選｜2択で答え合わせ', short: '付き合う前に知りたい恋愛の価値観',
    lead: 'LINEの回数、会うペース、記念日、ケンカしたとき。付き合う前に知っておくと安心な、恋愛の価値観の質問を40こ集めました。気になる人と答え合わせしてみましょう。',
    ids: () => pick(x => x.cat === '恋愛・連絡', 40) },
  { slug: 'couple', h1: 'カップル・夫婦で答え合わせしたい、暮らしの質問40選', title: 'カップル・夫婦で答え合わせしたい暮らしの質問40選｜2択', short: 'カップル・夫婦の暮らしの質問',
    lead: '朝型か夜型か、部屋の片づけ、ごはん、お金の使い方。一緒に暮らすと気になる、毎日の小さな価値観の質問を40こ集めました。',
    ids: () => pick(x => ['暮らし', 'お金', '食'].includes(x.cat), 40) },
  { slug: 'tomodachi', h1: '友だち・グループで盛り上がる2択の質問40選', title: '友だち・グループで盛り上がる2択の質問40選｜みんなで答え合わせ', short: '友だち・グループで盛り上がる質問',
    lead: '休みの日の過ごし方、旅行、食べもの。友だちどうしで答えが分かれて盛り上がる2択の質問を40こ集めました。みんなのスマホで同時に答えられます。',
    ids: () => pick(x => ['休日・遊び', '食', '暮らし'].includes(x.cat), 40) },
];
PAGES.forEach(p => { p.list = p.ids(); });

// アプリが読むテーマの一覧
fs.writeFileSync(path.join(D, 'packs.js'),
  '/* アイ・シンク：テーマ別の質問（tools/isync_matome.js が作る。手で直さない）。?pack=<slug> で、そのテーマの質問から出す */\n' +
  'window.SY_PACKS = ' + JSON.stringify(Object.fromEntries(PAGES.map(p => [p.slug, { title: p.short, keys: p.list.map(i => Q[i].key) }]))) + ';\n' +
  'window.SY_PAGES = ' + JSON.stringify(PAGES.map(p => ({ slug: p.slug, h1: p.h1 }))) + ';\n');

const CSS = `:root{--ink:#2A2559;--sub:#4E4878;--deep:#4B3C8F;--line:#E2DDF5}
*{box-sizing:border-box}html{background:#FBEFEA}
body{margin:0;color:var(--ink);font-family:"Zen Kaku Gothic New","Hiragino Sans",sans-serif;font-size:16px;line-height:1.75;
 background:linear-gradient(180deg,#5E5FA8 0,#9A86C4 240px,#E3B3C8 520px,#F7D9C9 820px,#FBEFEA 1100px) no-repeat;
 padding:20px max(16px,env(safe-area-inset-left,0px)) 40px}
.wrap{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
a{color:var(--deep)}
.top{text-align:center;color:#fff;text-decoration:none;display:block}
.top b{font-family:Quicksand,sans-serif;font-weight:700;font-size:40px;display:block;line-height:1.1}
.top small{font-family:"Zen Maru Gothic",sans-serif;font-weight:700;font-size:14px}
h1{font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:24px;line-height:1.4;margin:0;color:#fff;text-align:center;text-shadow:0 2px 10px rgba(42,37,89,.35)}
h2{font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:19px;margin:0}
.card{background:#fff;border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 24px rgba(60,40,110,.16)}
.lead{margin:0}
.btn{display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:99px;background:var(--ink);color:#FFF1C9;font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:17px;text-decoration:none;padding:10px 18px;text-align:center}
.btn.ghost{background:#fff;color:var(--ink);border:2px solid #BFB6E2;min-height:46px;font-size:15px}
ol.qs{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;counter-reset:q}
ol.qs li{counter-increment:q;padding:12px 14px;border-radius:14px;background:#F6F4FC;border:1.5px solid var(--line)}
ol.qs li .qq{font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:17px;display:block}
ol.qs li .qq::before{content:"Q" counter(q) "．";color:var(--deep)}
ol.qs li .tag{font-size:13px;font-weight:700;color:var(--sub)}
.opts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.opts span{font-size:14px;font-weight:700;padding:2px 12px;border-radius:99px;border:2px solid}
.opts .o0{background:#E6F8F2;border-color:#3FA98F}.opts .o1{background:#FDEBF4;border-color:#D46FA3}.opts .o2{background:#F1EEFA;border-color:#9C93C8}
ul.links{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
ul.links a{display:flex;align-items:center;min-height:48px;padding:8px 14px;border-radius:14px;background:#F6F4FC;border:1.5px solid #DDD6F3;font-weight:700;text-decoration:none;color:var(--ink)}
ul.links a::after{content:"›";margin-left:auto;padding-left:8px;font-size:20px;color:var(--deep)}
ol.steps{margin:0;padding-left:1.4em;display:flex;flex-direction:column;gap:6px}
.note{font-size:14px;color:var(--sub)}
footer{text-align:center;font-size:13px;color:var(--sub)}`;
const head = (title, desc, url) => `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${BASE}og-image.png?v=5"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../favicon-32.png?v=5" sizes="32x32"><link rel="apple-touch-icon" href="../apple-touch-icon.png?v=5">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quicksand:wght@700&family=Zen+Maru+Gothic:wght@700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">
<style>${CSS}</style></head><body><div class="wrap">
<a class="top" href="../"><b>I-Sync</b><small>アイ・シンク　わたしとあなたの、重なるところ</small></a>`;
const others = (self) => `<section class="card"><h2>ほかのテーマの質問</h2><ul class="links">${PAGES.filter(p => p.slug !== self).map(p => `<li><a href="../${p.slug}/">${esc(p.h1)}</a></li>`).join('')}<li><a href="../">アイ・シンクのトップへ</a></li></ul></section>`;
const foot = `<footer>アイ・シンク（I-Sync）｜2択に答えて答え合わせ。無料・登録なし</footer></div><script src="../jw.js"></script></body></html>\n`;

PAGES.forEach(p => {
  const url = BASE + p.slug + '/';
  const desc = p.lead.split('。').slice(0, 2).join('。') + '。無料・登録なしで、2人でもみんなでも答え合わせできます。';
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: p.h1, numberOfItems: p.list.length,
    itemListElement: p.list.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: `${Q[i].q}　${Q[i].a}／${Q[i].b}` })) };
  const html = head(p.title, desc, url) + `
<h1>${esc(p.h1)}</h1>
<section class="card"><p class="lead">${esc(p.lead)}</p>
 <a class="btn" href="../?pack=${p.slug}&amp;mode=solo">この質問でひとりで診断（無料・約3分）</a>
 <a class="btn ghost" href="../?pack=${p.slug}&amp;mode=each">みんなのスマホで答え合わせ（部屋を作る）</a>
 <p class="note">ひとりで答えたあと、結果の画面から「答え合わせのリンク」を送ると、相手が同じ質問に答えるだけで2人の結果がわかります。</p></section>
<section class="card"><h2>質問の一覧（${p.list.length}問）</h2>
<ol class="qs">${p.list.map(i => { const x = Q[i]; return `<li><span class="tag">${esc(x.cat)}</span><span class="qq">${esc(x.q)}</span><span class="opts"><span class="o0">${esc(x.a)}</span><span class="o1">${esc(x.b)}</span><span class="o2">${esc(x.c)}</span></span></li>`; }).join('\n')}</ol></section>
<section class="card"><h2>答え合わせのしかた</h2><ol class="steps">
 <li>「この質問でひとりで診断」を押して、2択（または3つ目の答え）に答えます。</li>
 <li>結果の画面の「LINEで答え合わせに誘う」で、相手にリンクを送ります。</li>
 <li>相手が同じ質問に答えると、2人のシンクロ率・テーマ別の重なり・話しておきたいことがわかります。</li></ol>
 <a class="btn" href="../?pack=${p.slug}&amp;mode=solo">さっそく答える</a></section>
${others(p.slug)}
<script type="application/ld+json">${JSON.stringify(ld)}</script>
` + foot;
  fs.mkdirSync(path.join(D, p.slug), { recursive: true });
  fs.writeFileSync(path.join(D, p.slug, 'index.html'), html);
});

// サイトマップ
fs.writeFileSync(path.join(D, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE}</loc></url>
${PAGES.map(p => `  <url><loc>${BASE}${p.slug}/</loc></url>`).join('\n')}
</urlset>
`);
console.log(PAGES.map(p => p.slug + ':' + p.list.length).join(' '), '／ 目印の重なり', Q.length - new Set(Q.map(x => x.key.slice(0, 5))).size);
