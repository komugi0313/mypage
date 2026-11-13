// 究極の二択：テーマ別のまとめページ（honbare.com/renai/ など）を作る。問題は nitaku/questions.js からだけ選ぶ（ほかのサイトの文は使わない）。
// 問題を直したら `node tools/nitaku_matome.js` → `python3 tools/add_contrast_guard.py` を実行する。
const fs=require('fs');
const path=require('path');const ROOT=path.join(__dirname,'..','nitaku');
global.window={};require(path.join(ROOT,'questions.js'));
const B=window.NITAKU_BASE;
const short=(q,n)=>q[0].length<=n&&q[1].length<=n;
const used=new Set();
function take(list,n,max){const r=[];for(const q of list){if(r.length>=n)break;const k=q[0]+'|'+q[1];if(used.has(k)||!short(q,max))continue;used.add(k);r.push(q);}return r;}
const L=B.love, N=B.normal;
const PAGES=[
 {f:'renai',name:'恋愛の究極の二択',h1:'恋愛の究極の二択',lead:'付き合うなら？ 結婚するなら？ 恋人とのLINEは？ 好きな人のことを考えながら、本気で選んでみてください。',mode:'love',sub:'答えるだけで、小悪魔度や本音が％でわかる',
  qs:take(L.filter(q=>q[4]===1||q[4]===2),40,26),desc:'恋愛の究極の二択を40問まとめました。付き合うなら・結婚するなら・恋人のLINEなど、思わず本音が出る質問ばかり。そのまま無料で遊べて、小悪魔度もわかります。'},
 {f:'omoshiroi',name:'面白い究極の二択',h1:'面白い究極の二択（あるある）',lead:'朝の電車、職場、スマホ、ごはん。毎日の「あるある」から、くだらないけど本気で悩む二択を集めました。',mode:'normal',sub:'答えるだけで、見栄っぱり度や本音が％でわかる',
  qs:take(N.filter(q=>q[4]===1),40,26),desc:'くだらないけど本気で悩む、面白い究極の二択を40問まとめました。毎日のあるあるから選んだ質問なので、友だちや家族とすぐ盛り上がれます。'},
 {f:'muzukashii',name:'難しい究極の二択',h1:'難しい究極の二択（地獄の二択）',lead:'どっちを選んでも痛い、本気で悩む地獄の二択です。答えるまでの時間で、あなたの迷いどころが見えてきます。',mode:'love',sub:'答えるだけで、小悪魔度・見栄っぱり度などが％でわかる',
  qs:take(L.filter(q=>q[4]===3).concat(N.filter(q=>q[4]===3)),40,30),desc:'どっちを選んでも痛い、難しい究極の二択（地獄の二択）を40問まとめました。恋愛も人生も、本気で悩む質問ばかりです。'},
 {f:'minna',name:'みんなで盛り上がる究極の二択',h1:'みんなで盛り上がる究極の二択',lead:'答えが分かれるほど盛り上がる二択を集めました。その場でそれぞれのスマホで答えて、みんなの答えをくらべられます。',mode:'normal',sub:'答えるだけで、小悪魔度・見栄っぱり度などが％でわかる',
  qs:take(N.filter(q=>q[4]===2),28,26).concat(take(L.filter(q=>q[4]===2),12,26)),desc:'みんなで盛り上がる究極の二択を40問まとめました。友だち・家族・職場で答えが分かれる質問ばかり。近くの人はQRコード、離れた人はLINEで呼んで、それぞれのスマホから一緒に遊べます。'},
];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SITE='https://honbare.com';
function page(p){
 const items=p.qs.map((q,i)=>`<li class="it"><span class="n">${i+1}</span><div class="pair"><p class="a">${esc(q[0])}</p><p class="vs">VS</p><p class="b">${esc(q[1])}</p>${q[5]?`<p class="ex">たとえば：${esc(q[5])}</p>`:''}</div></li>`).join('\n');
 const others=PAGES.filter(x=>x!==p).map(x=>`<a class="ol" href="/${x.f}/">${esc(x.name)}</a>`).join('');
 const ld={"@context":"https://schema.org","@type":"ItemList","name":p.h1+' '+p.qs.length+'選',"numberOfItems":p.qs.length,"itemListElement":p.qs.map((q,i)=>({"@type":"ListItem","position":i+1,"name":q[0]+' VS '+q[1]}))};
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(p.h1)}${p.qs.length}選｜究極の二択 本音バレ診断</title>
<meta name="description" content="${esc(p.desc)}">
<link rel="canonical" href="${SITE}/${p.f}/">
<meta property="og:title" content="${esc(p.h1)}${p.qs.length}選｜究極の二択 本音バレ診断"><meta property="og:description" content="${esc(p.desc)}"><meta property="og:image" content="${SITE}/og-image.png?v=2"><meta property="og:url" content="${SITE}/${p.f}/"><meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@700;900&display=swap">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{--bg:#FFF8E1;--dot:#F5E3A8;--ink:#1E1E2A;--sub:#4A4A5A;--pink:#CC3166;--yel:#F2C94C;--mk:#FFE071;--a:${p.mode==='love'?'#FFD3E2':'#FFE071'};--b:${p.mode==='love'?'#CFE3FF':'#C9F0DF'};color-scheme:light}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);background-image:radial-gradient(var(--dot) 2px,transparent 2.4px);background-size:22px 22px;color:var(--ink);font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif;line-height:1.7;word-break:auto-phrase}
.w{max-width:640px;margin:0 auto;padding-block:20px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.crumb{font-size:13px;font-weight:700;color:var(--sub)}.crumb a{color:var(--sub)}
.hero{background:#fff;border:3px solid var(--ink);border-radius:22px;box-shadow:6px 6px 0 var(--yel);padding:22px 18px;margin:14px 4px 0;text-align:center}
h1{font-family:"Mochiy Pop One",sans-serif;font-weight:400;font-size:26px;line-height:1.35;color:var(--pink);text-shadow:2px 2px 0 var(--ink);margin:0;text-wrap:balance}
.cnt{display:inline-block;margin-top:10px;background:var(--ink);color:#fff;border-radius:999px;padding:3px 14px;font-weight:900;font-size:14px}
.lead{margin:12px 0 0;font-weight:700;font-size:15px;text-align:left}
.cta{display:block;text-align:center;margin:18px 4px 0;background:var(--ink);color:#fff;text-decoration:none;font-family:"Mochiy Pop One",sans-serif;font-size:18px;border-radius:999px;padding:14px;box-shadow:4px 4px 0 var(--yel)}
.cta small{display:block;font-family:"Zen Maru Gothic",sans-serif;font-weight:700;font-size:12px;opacity:.85}
h2{font-family:"Mochiy Pop One",sans-serif;font-weight:400;font-size:19px;margin:28px 2px 10px}h2 span{background:linear-gradient(transparent 58%,var(--mk) 58%);padding:0 4px}
ol{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.it{display:flex;gap:10px;background:#fff;border:2px solid var(--ink);border-radius:16px;padding:12px}
.n{flex:none;width:30px;height:30px;border-radius:50%;background:var(--ink);color:#fff;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center}
.pair{min-width:0;flex:1}
.pair p{margin:0}
.a,.b{border:2px solid var(--ink);border-radius:12px;padding:6px 10px;font-weight:900;font-size:15px}
.a{background:var(--a)}.b{background:var(--b)}
.vs{text-align:center;font-family:"Mochiy Pop One",sans-serif;font-size:13px;margin:4px 0!important}
.ex{font-size:13px;color:var(--sub);margin-top:6px!important}
.how{background:#fff;border:2px solid var(--ink);border-radius:16px;padding:14px 16px;font-size:14px}
.how p{margin:0 0 6px}
.others{display:grid;gap:8px}
.ol{display:block;background:#fff;border:2px solid var(--ink);border-radius:14px;padding:12px 14px;font-weight:900;color:var(--ink);text-decoration:none}
.ol::after{content:" →"}
.foot{text-align:center;font-size:12px;color:#7A7A8A;margin-top:28px}
</style></head><body><div class="w">
<nav class="crumb"><a href="/">究極の二択 本音バレ診断</a> ＞ ${esc(p.name)}</nav>
<header class="hero"><h1>${esc(p.h1)}</h1><span class="cnt">${p.qs.length}選</span><p class="lead">${esc(p.lead)}</p></header>
<a class="cta" href="/">究極の二択で遊ぶ（無料・3分）<small>${esc(p.sub)}</small></a>
<h2><span>${esc(p.name)} ${p.qs.length}選</span></h2>
<ol>
${items}
</ol>
<a class="cta" href="/">答えて本音をチェックする<small>ひとりでも、みんなでも遊べます</small></a>
<h2><span>遊び方</span></h2>
<div class="how"><p>① 「どっちで遊ぶ？」で恋愛編かふつう編を選びます。</p><p>② 出てくる二択を、直感でどんどん選びます（ひとりで15問・友だちとは8問から）。</p><p>③ 最後に、小悪魔度などが％で出ます。みんなで遊ぶときは、近くの人はQRコード、離れた人はLINEで呼べます。</p></div>
<h2><span>ほかの究極の二択</span></h2>
<div class="others">${others}</div>
<p class="foot">究極の二択 本音バレ診断</p>
</div></body></html>`;
}
for(const p of PAGES){ const d=path.join(ROOT,p.f); fs.mkdirSync(d,{recursive:true}); fs.writeFileSync(path.join(d,'index.html'),page(p)); console.log(p.f,p.qs.length); }
module.exports={PAGES};
