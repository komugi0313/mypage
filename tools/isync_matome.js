// アイ・シンク：テーマ別の質問のページ（検索から来てもらうため）を作る。
// 使い方：node tools/isync_matome.js （問題を直したら回し直す）
//  作るもの：isync/packs.js（テーマごとの質問の目印＝アプリが ?pack= で使う）・isync/<テーマ>/index.html・isync/sitemap.xml
//  問題の目印は app.js と同じ作り方（問題の文｜答えA のハッシュ）。i-sync.jp がつながったら BASE を書きかえて回し直す。
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', 'isync');
const BASE = 'https://i-sync.jp/';
global.window = {};
require(path.join(D, 'questions.js')); require(path.join(D, 'weights.js')); require(path.join(D, 'ayumi.js')); require(path.join(D, 'firebase-config.js'));
const AY = window.SY_AYUMI || {};
const CATS = window.SY_CATS, W = window.SY_W;
const Q = window.SY_Q.map(r => ({ cat: r[0], q: r[1], a: r[2], b: r[3], c: r[4] || 'どっちでも合わせられる' }));
const hq = s => { let h = 5381; for (const c of s) h = (Math.imul(h, 33) ^ c.codePointAt(0)) >>> 0; return h.toString(36); };
Q.forEach(x => { x.key = hq(x.q + '|' + x.a); });
const WB = new Set(W.b), WL = new Set(W.l);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const len = x => x.q.length + x.a.length + x.b.length;

// テーマ（ページどうしで同じ質問は出さない。短い問題から選ぶ。quota＝[条件, 数] の順に選ぶ）
const used = new Set();
const pick = (filter, n) => { const out = Q.map((x, i) => ({ x, i })).filter(({ x, i }) => !used.has(i) && filter(x, i)).sort((a, b) => rk(a.i) - rk(b.i) || len(a.x) - len(b.x)).slice(0, n); out.forEach(o => used.add(o.i)); return out.map(o => o.i); };
const rk = i => WB.has(i) ? 0 : WL.has(i) ? 2 : 1; // 大事な問題から
const quota = qs => () => qs.flatMap(([f, n]) => pick(f, n));
const cat = (...c) => x => c.includes(x.cat);
const sumi = /一緒に住|同棲/;
// 各ページ：guide＝そのテーマの読みもの（こちらの言葉）・try＝ページの中で試す3問は一覧の中から
const PAGES = [
  { slug: 'kekkon', n1: '結婚前に話し合っておきたいこと', title: n => `結婚前に話し合っておきたいこと${n}選｜2択で答え合わせ｜アイシンク`, h1: n => `結婚前に話し合っておきたいこと${n}選`, short: '結婚前に話し合っておきたいこと',
    lead: 'お金・仕事・家族・暮らしなど、結婚の前に知っておきたい価値観の質問を集めました。言いにくいことも、2択なら気軽に聞けます。2人で答え合わせすると、重なるところとちがうところがわかります。',
    guide: { h: '話し合いを、けんかにしないコツ', items: ['先に「正解はない」と決めておく。どっちの答えも、その人が育ってきた中で自然にできた「ふつう」です。', '一度に全部を話さない。今日はお金、次は家族、のようにテーマを分けると、疲れずに続けられます。', '答えが分かれたら「どうしてそう思うの？」を1つだけ聞く。理由がわかると、歩み寄りの方法が見えてきます。'] },
    ids: quota([[(x, i) => WB.has(i) && x.cat !== 'ドキドキ', 40]]) },
  { slug: 'dousei', title: n => `同棲前に話し合うことチェックリスト${n}｜お金・家事・生活リズム｜アイシンク`, h1: n => `同棲前に話し合うことチェックリスト${n}`, short: '同棲前に話し合うこと',
    lead: '一緒に住みはじめてから「えっ、そうなの？」となりやすいのは、大きなことより毎日の小さなこと。お金の分け方、家事、生活の時間、部屋の使い方。同棲の前に話しておきたいことを、2択のチェックリストにしました。',
    guide: { h: '同棲の前に、とくに話しておきたい4つ', items: ['お金：家賃や生活費をどう分けるか。ぴったり半分か、収入に合わせるか。', '家事：だれが何をするか、よりも「どのくらいきれいなら気にならないか」。', '生活の時間：起きる時間・寝る時間・ひとりになりたいとき。', 'ルール：友だちを呼ぶとき、帰りが遅くなるとき、連絡はどうするか。'] },
    ids: quota([[x => x.cat === '暮らし' && sumi.test(x.q), 20], [cat('暮らし'), 18], [x => x.cat === 'お金' && sumi.test(x.q), 4], [cat('お金'), 10], [cat('食'), 5]]) },
  { slug: 'hatsudate', title: n => `マッチングアプリの初デートで会話に困らない｜価値観がわかる2択の質問${n}選｜アイシンク`, h1: n => `マッチングアプリの初デートで会話に困らない｜価値観がわかる2択の質問${n}選`, short: '初デートで聞ける、価値観がわかる質問',
    lead: '初めて会う人と、何を話せばいいかわからない。重い話はまだ早いけれど、その人の「ふつう」は知りたい。そんなときは2択の質問が便利です。答えやすくて、会話が自然に広がり、価値観も少し見えてきます。',
    guide: { h: '2択の質問で、会話を広げるコツ', items: ['自分の答えも先に言う。「わたしは朝型なんだけど、どっち？」と聞くと、相手も答えやすくなります。', '答えを聞いたら「どうして？」を1つ。そこから好きなことや思い出の話に広がります。', 'お金・結婚・家族のくわしい話は、何度か会ってから。初デートは休日の過ごし方や食べものくらいがちょうどいい。'] },
    ids: quota([[x => /デート/.test(x.q) && ['ドキドキ', '恋愛・連絡', '休日・遊び'].includes(x.cat), 6], [cat('休日・遊び'), 18], [(x, i) => x.cat === '食' && !WB.has(i), 12], [(x, i) => x.cat === '恋愛・連絡' && !WB.has(i), 4]]) },
  { slug: 'tsukiau', title: n => `付き合う前に知りたい恋愛の価値観の質問${n}選｜2択で答え合わせ｜アイシンク`, h1: n => `付き合う前に知りたい、恋愛の価値観の質問${n}選`, short: '付き合う前に知りたい恋愛の価値観',
    lead: 'LINEの回数、会うペース、記念日、けんかしたとき。付き合う前に知っておくと安心な、恋愛の価値観の質問を集めました。気になる人と答え合わせしてみましょう。',
    guide: { h: '付き合う前に聞いておくと、安心なこと', items: ['連絡のペース：毎日やりとりしたいか、用があるときだけでいいか。', '会うペース：週に何回くらい会いたいか。', 'けんかしたとき：その場で話したいか、少し時間をおきたいか。'] },
    ids: quota([[cat('恋愛・連絡'), 40], [x => x.cat === 'ドキドキ' && !/キス|ハグ/.test(x.q), 40]]) },
  { slug: 'couple', title: n => `夫婦の価値観チェック${n}｜違いが見つかったときの歩み寄り方｜アイシンク`, h1: () => '夫婦の価値観チェック｜違いが見つかったときの歩み寄り方', short: '夫婦の価値観チェック',
    lead: '一緒に暮らしていても、毎日の「ふつう」は意外とちがいます。ちがいがあるのは悪いことではありません。どこがちがうのかを知って、2人のやり方を決めればいいのです。夫婦で答え合わせできる価値観チェックと、ちがいが見つかったときの歩み寄り方をまとめました。',
    guide: { h: 'ちがいが見つかったときの、3つのステップ', ol: true, items: ['どっちが正しいかではなく「なぜそう思うの？」を聞く。', '「ゆずれないこと」と「合わせられること」を分ける。どちらかにとって大事なことから決めます。', '試すルールを決めて、1か月たったら見直す。うまくいかなければ、また変えればいいだけです。'] },
    ids: quota([[cat('将来・家族'), 10], [cat('お金'), 12], [cat('暮らし'), 10], [cat('食'), 8]]) },
  { slug: 'kachikan', title: n => `恋人と価値観が合わない？すり合わせの仕方と、2人でできる恋愛価値観診断｜アイシンク`, h1: () => '恋人と価値観が合わない？すり合わせの仕方と、2人でできる恋愛価値観診断', short: '恋人との価値観のすり合わせ',
    lead: '「価値観が合わないかも」と感じるのは、だめな2人だからではありません。それまで別々に暮らしてきた2人なら、ちがうところがあって当たり前。大事なのは、どこがどのくらいちがうのかを知ることです。2人で同じ質問に答えると、重なるところとちがうところが、数字と一覧でわかります。',
    guide: { h: '価値観のすり合わせ、4つのステップ', ol: true, items: ['同じ質問に、別々に答える。先に相手の答えを聞かないのがポイントです。', '重なったところを先に見る。「ここは同じだね」から話すと、気持ちが楽になります。', '分かれたところは、片方ががまんするのではなく、2人の間の案を探す。', '★ゆずれないことが分かれたときは、時間をかけて話す。すぐに答えを出さなくても大丈夫です。'] },
    ids: quota([[cat('恋愛・連絡'), 14], [cat('休日・遊び'), 8], [cat('お金'), 6], [cat('暮らし'), 3], [cat('将来・家族'), 9]]) },
  { slug: 'tomodachi', title: n => `友だち・グループで盛り上がる2択の質問${n}選｜みんなで答え合わせ｜アイシンク`, h1: n => `友だち・グループで盛り上がる2択の質問${n}選`, short: '友だち・グループで盛り上がる質問',
    lead: '休みの日の過ごし方、旅行、食べもの。友だちどうしで答えが分かれて盛り上がる2択の質問を集めました。みんなのスマホで同時に答えられます。',
    guide: { h: 'みんなで遊ぶときのコツ', items: ['答えは同時に出す。あとから合わせられないので、本音が出ます。', '少数派の人に「どうして？」を聞くと、意外な話が出てきます。'] },
    ids: quota([[cat('休日・遊び'), 16], [cat('食'), 14], [cat('暮らし'), 10]]) },
];
['dousei', 'kekkon', 'hatsudate', 'kachikan', 'couple', 'tsukiau', 'tomodachi'].forEach(sl => { const p = PAGES.find(x => x.slug === sl); p.list = p.ids(); p.list.slice(40).forEach(i => used.delete(i)); p.list = p.list.slice(0, 40); });
PAGES.forEach(p => { p.n = p.list.length; p.h1s = p.h1(p.n); p.titles = p.title(p.n); });

// アプリが読むテーマの一覧
fs.writeFileSync(path.join(D, 'packs.js'),
  '/* アイ・シンク：テーマ別の質問（tools/isync_matome.js が作る。手で直さない）。?pack=<slug> で、そのテーマの質問から出す */\n' +
  'window.SY_PACKS = ' + JSON.stringify(Object.fromEntries(PAGES.map(p => [p.slug, { title: p.short, keys: p.list.map(i => Q[i].key) }]))) + ';\n' +
  'window.SY_PAGES = ' + JSON.stringify(PAGES.map(p => ({ slug: p.slug, h1: p.h1s }))) + ';\n');

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
footer{text-align:center;font-size:13px;color:var(--sub)}
.nw{white-space:nowrap}.card>p.note{margin:0}
h3{font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:17px;margin:6px 0 0;padding:4px 12px;border-radius:10px;background:linear-gradient(90deg,#DDF6EE,#E7E9FD,#FCE6F1)}
.btn small{display:block;font-size:13px;font-weight:700;opacity:.9}
.btn{flex-direction:column;line-height:1.35}
.strong ul.ok{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.strong ul.ok li{padding:10px 12px 10px 40px;border-radius:14px;background:#F6F4FC;position:relative;font-size:15px}
.strong ul.ok li::before{content:"✓";position:absolute;left:12px;top:10px;width:20px;height:20px;border-radius:50%;background:#3FA98F;color:#fff;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center}
.strong ul.ok b{display:block;font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:16px}
.tq{padding:12px;border-radius:16px;border:1.5px solid var(--line);display:flex;flex-direction:column;gap:8px}
.tqq{margin:0;font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:18px}
.tbs{display:flex;flex-direction:column;gap:8px}
.tb{position:relative;overflow:hidden;display:flex;align-items:center;gap:8px;min-height:48px;padding:8px 14px;border-radius:14px;border:2.5px solid;font:inherit;font-weight:700;font-size:16px;color:var(--ink);text-align:left;cursor:pointer}
.tb.o0{background:#E6F8F2;border-color:#3FA98F}.tb.o1{background:#FDEBF4;border-color:#D46FA3}.tb.o2{background:#F1EEFA;border-color:#9C93C8;font-size:15px}
.tb .tt{position:relative;z-index:1;flex:1}.tb .pc{position:relative;z-index:1;font-weight:900}
.tb .bar{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(75,60,143,.13);transition:width .6s}
.tq.done .tb{cursor:default}.tq.done .tb:not(.me){opacity:.75}.tb.me{box-shadow:0 0 0 3px var(--ink)}
.tn{margin:0;font-size:15px;font-weight:700;color:var(--deep)}
.tend{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:16px;background:linear-gradient(135deg,#DDF6EE,#E7E9FD,#FCE6F1)}
.tend p{margin:0}.tend b{display:block;font-size:17px}
ul.gd,ol.gd{margin:0;padding-left:1.4em;display:flex;flex-direction:column;gap:8px}
ul.ck{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
ul.ck label{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:14px;background:#F6F4FC;border:1.5px solid var(--line);cursor:pointer;min-height:48px}
ul.ck input{width:24px;height:24px;margin:2px 0 0;flex:none;accent-color:#4B3C8F}
ul.ck .qq{font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:16px;display:block}
ul.ck input:checked+.cq{opacity:.6}
.cknum{margin:0;font-weight:700;color:var(--deep);text-align:center}.cknum:empty{display:none}
.ays{display:flex;flex-direction:column;gap:10px}
.ay{padding:12px 14px;border-radius:14px;background:#FFF8E0;border:1.5px solid #F0D98A}
.ay p{margin:0}.ayq{font-family:"Zen Maru Gothic",sans-serif;font-weight:900}
.ayab{font-size:14px;color:var(--sub)}.ayab span{font-weight:700;padding:0 6px;border-radius:6px}.ayab .o0{background:#E6F8F2}.ayab .o1{background:#FDEBF4}
.ayt{margin-top:4px!important}
.smp{background:linear-gradient(180deg,#fff 0,#fff 100%)}
.smp-h{display:flex;gap:10px;align-items:center}.smp-h i{flex:none;width:34px;height:34px;border-radius:50%;background:conic-gradient(#8FE3CF,#A9B2F5,#F4B6D6,#8FE3CF);-webkit-mask:radial-gradient(circle,transparent 9px,#000 10px);mask:radial-gradient(circle,transparent 9px,#000 10px)}
.smp-h p{margin:0;line-height:1.4}.smp-h b{display:block;font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:19px}.smp-h span{font-size:13px;color:var(--sub);font-weight:700}
.sr{display:flex;gap:14px;align-items:center;padding:12px;border-radius:16px;background:#F6F4FC}
.ring{flex:none;width:92px;height:92px;border-radius:50%;background:conic-gradient(#6F8FE8 calc(var(--p)*1%),#E2DDF5 0);display:flex;align-items:center;justify-content:center}
.ring b{width:72px;height:72px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-family:Quicksand,sans-serif;font-size:28px}.ring small{font-size:14px}
.sr p{margin:0;line-height:1.5}.sr p b{display:block;font-family:"Zen Maru Gothic",sans-serif;font-weight:900;font-size:18px}.sr p span{font-weight:700;color:var(--sub)}
h3.g-ok{background:#DDF6EE}h3.g-ng{background:#FCE6F1}
ul.sl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
ul.sl li{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:14px;border:1.5px solid var(--line)}
.sq{font-family:"Zen Maru Gothic",sans-serif;font-weight:900}
.sa{font-size:14px;font-weight:700;padding:2px 10px;border-radius:10px;align-self:flex-start}
.sa.ok{background:#E6F8F2;color:#1F6E5A}.sa.ad{background:#F1EEFA;color:#4B3C8F}.sa.ng{background:#FDEBF4;color:#9C2F67}
.sl .ayt{display:block;padding:8px 10px;border-radius:10px;background:#FFF8E0;border:1.5px solid #F0D98A;font-size:15px}.sl .ayt b{display:block;font-size:13px;color:#8A6A00}
.smp-q{margin:0}.smp-q b{display:block;font-size:17px}
ul.ql{list-style:none;margin:0;padding:0 4px;display:flex;flex-wrap:wrap;gap:2px 16px}
ul.ql li{font-size:15px;font-weight:700;color:var(--sub)}ul.ql li::before{content:"・"}`;
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
const others = (self) => `<section class="card"><h2>ほかのテーマの質問</h2><ul class="links">${PAGES.filter(p => p.slug !== self).map(p => `<li><a href="../${p.slug}/">${esc(p.h1s)}</a></li>`).join('')}<li><a href="../">アイ・シンクのトップへ</a></li></ul></section>`;
const foot = `<footer>アイシンク（アイ・シンク／I-Sync）｜2択に答えて答え合わせ。無料・登録なし</footer></div><script src="../jw.js"></script></body></html>\n`;
const opt3 = x => `<span class="opts"><span class="o0">${esc(x.a)}</span><span class="o1">${esc(x.b)}</span><span class="o2">${esc(x.c)}</span></span>`;
// アイ・シンクでできること（どのページも同じ）
const STRONG = `<section class="card strong"><h2>アイ・シンクで、できること</h2><ul class="ok">
 <li><b>リンクを送るだけで、2人で答え合わせ</b>アプリも登録もいりません。相手は同じ質問に答えるだけ。</li>
 <li><b>シンクロ率と、テーマごとの重なり</b>2人の答えがどれだけ重なったかが、数字でわかります。</li>
 <li><b>分かれた答えには「歩み寄りの案」</b>どちらかががまんするのではない、2人の間の案を出します。</li>
 <li><b>相手が答えると、結果があなたにも届く</b>送ったあとは待つだけ。アイ・シンクを開くと、届いた結果が見られます。</li></ul></section>`;
PAGES.forEach(p => {
  const url = BASE + p.slug + '/';
  const desc = p.lead.split('。').slice(0, 2).join('。') + '。無料・登録なしで、2人でもみんなでも答え合わせできます。';
  const ld = { '@context': 'https://schema.org', '@type': 'ItemList', name: p.h1s, numberOfItems: p.n,
    itemListElement: p.list.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: Q[i].q })) };
  // 結果の見本：ずれた2問（歩み寄りの案がある大事な問題）・ぴったり4問・合わせられる1問
  const byW = [...p.list].sort((a, b) => (WB.has(b) - WB.has(a)) || len(Q[a]) - len(Q[b]));
  const dif = byW.filter(i => AY[Q[i].q]).slice(0, 2);
  const rest = byW.filter(i => !dif.includes(i));
  const same = rest.slice(0, 4), adj = rest.slice(4, 5);
  const tot = dif.length + same.length + adj.length, pct = Math.round((same.length + adj.length * 0.5) * 100 / tot);
  const groups = [...new Set(p.list.map(i => Q[i].cat))].map(c => ({ c, is: p.list.filter(i => Q[i].cat === c) }));
  const cta = `<a class="btn" href="../?pack=${p.slug}&amp;mode=solo">この質問で、2人で答え合わせ<small>無料・アプリ不要・約6分</small></a>`;
  const G = p.guide;
  const ans = (x, v) => v ? x.b : x.a;
  const html = head(p.titles, desc, url) + `
<h1>${esc(p.h1s)}</h1>
<section class="card"><p class="lead">${esc(p.lead)}</p>
 ${cta}
 <a class="btn ghost" href="../?pack=${p.slug}&amp;mode=each">そばにいる人と、みんなのスマホで（部屋を作る）</a></section>
<section class="card smp"><div class="smp-h"><i aria-hidden="true"></i><p><b>2人の結果は、こんなふうに出ます</b><span>見本・あなた × あの人</span></p></div>
 <div class="sr"><div class="ring" style="--p:${pct}"><b>${pct}<small>%</small></b></div><p><b>シンクロ率</b><span>合う ${same.length + adj.length}問・ずれた ${dif.length}問</span></p></div>
 <h3 class="g-ok">合うところ</h3><ul class="sl">
 ${same.map((i, n) => { const x = Q[i]; return `<li><span class="sq">${esc(x.q)}</span><span class="sa ok">2人とも「${esc(ans(x, n % 2))}」</span></li>`; }).join('')}
 ${adj.map(i => { const x = Q[i]; return `<li><span class="sq">${esc(x.q)}</span><span class="sa ad">あなた「${esc(x.a)}」／あの人「${esc(x.c)}」＝合わせられる</span></li>`; }).join('')}</ul>
 <h3 class="g-ng">ずれたところ</h3><ul class="sl">
 ${dif.map((i, n) => { const x = Q[i]; return `<li><span class="sq">${esc(x.q)}</span><span class="sa ng">あなた「${esc(x.a)}」／あの人「${esc(x.b)}」</span>${n ? '' : `<span class="ayt"><b>歩み寄りの案</b>${esc(AY[x.q])}</span>`}</li>`; }).join('')}</ul>
 <p class="smp-q"><b>あなたとあの人は、どこが合って、どこがずれる？</b>同じ質問に別々に答えると、わかります。</p>
 ${cta}</section>
${STRONG}
<section class="card"><h2>${esc(G.h)}</h2><${G.ol ? 'ol' : 'ul'} class="gd">${G.items.map(t => `<li>${esc(t)}</li>`).join('')}</${G.ol ? 'ol' : 'ul'}></section>
<section class="card"><h2>こんな質問が出ます（${p.n}問）</h2><p class="note">答えは、アプリの中で。口で聞くと相手に合わせた答えになりがちですが、別々に答えると本音が見えます。</p>
${groups.map(g => `<h3>${esc(g.c)}編</h3><ul class="ql">${g.is.map(i => `<li>${esc(Q[i].q)}</li>`).join('')}</ul>`).join('\n')}
${cta}</section>
<section class="card"><h2>答え合わせのしかた</h2><ol class="steps">
 <li>「この質問で、2人で答え合わせ」を押して、まず自分が答えます。</li>
 <li>結果の画面の「LINEで答え合わせに誘う」で、相手にリンクを送ります。</li>
 <li>相手が同じ質問に答えると、2人のシンクロ率・重なったところ・話しておきたいこと・歩み寄りの案がわかります。結果はあなたにも届きます。</li></ol>
 ${cta}</section>
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
console.log(PAGES.map(p => p.slug + ':' + p.n).join(' '), '／ 目印の重なり', Q.length - new Set(Q.map(x => x.key.slice(0, 5))).size);
