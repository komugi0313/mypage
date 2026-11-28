/* アイ・シンク（I-Sync）― わたしとあなたの、重なるところ（isync/）
 * 2択＋「こだわらない」に答えて、答え合わせをする。ひとりで／みんなのスマホで（2〜10人）／大人数の部屋（40人まで）。
 * 問題は questions.js（こちらで用意）と questions-mine.js（あなたが足す）。
 * みんなのスマホで遊ぶ部屋は、公開先では Firebase（Firestore の isync_rooms）、確認用ページ（claude.ai）ではページのデータ保存で共有する。 */

/* ===== 問題 ===== */
// CATS: [名前, 問題の上に出す札]  Q: [テーマ番号, 問題, 答えA, 答えB]
const CATS=window.SY_CATS||[];
const Q=[].concat(window.SY_Q||[],window.SY_MINE||[]).map(r=>[CATS.findIndex(c=>c[0]===r[0]),r[1],r[2],r[3],r[4]||'']).filter(r=>r[0]>=0&&r[1]&&r[2]&&r[3]);
// 問題の目印（問題の文と答えAから作る。並びが変わっても同じ）。答え合わせのリンク・みんなの答え・テーマ別のページで使う（tools/isync_matome.js と同じ作り方）
const hq=s=>{let h=5381;for(const c of s)h=(Math.imul(h,33)^c.codePointAt(0))>>>0;return h.toString(36)};
const QKEY=Q.map(q=>hq(q[1]+'|'+q[2]));
const KEY5=new Map(QKEY.map((k,i)=>[k.slice(0,5),i]));
// テーマ別のページ（/kekkon/ など）から来たときは、そのテーマの質問から出す（?pack=）。主催者の方へのページからは ?mode=kon
const QS=new URLSearchParams(location.search);
const PACK=(window.SY_PACKS||{})[QS.get('pack')]||null;
const PACKQ=PACK?PACK.keys.map(h=>QKEY.indexOf(h)).filter(i=>i>=0):null;
const CI=n=>CATS.findIndex(c=>c[0]===n);
// 問題ごとの重さ：大事＝2・ふつう＝1・軽い＝0.5（weights.js）
const WB=new Set((window.SY_W||{}).b||[]),WL=new Set((window.SY_W||{}).l||[]);
const WT=k=>WB.has(k)?2:WL.has(k)?.5:1;
// 話題：暮らし・価値観（前の「いろいろ」）＝6テーマを同じくらい／恋愛多め（前の「盛り上がる」）＝ドキドキ多め・結婚とお金の話はなし（お金の使い方のものさしだけ、軽いお金の問題を入れる）
const TOPICS={all:['恋愛・連絡','暮らし','食','お金','休日・遊び','将来・家族'].map(CI),
  party:['ドキドキ','恋愛・連絡','休日・遊び','ドキドキ','食','暮らし'].map(CI)};
const MAXP=10, KON_MAX=40, KON_LEN=20;
// 婚活の部屋は主催者の画面が60秒で自動で次へ
const KON_WAIT=60;
// 1問15秒（ひとりでも部屋でも）。部屋は、問題が出てから20秒たっても答えがそろわなければ、だれのスマホからでも次へ進む（鑑定者本人 2026-11-17「15秒」「20秒待機して来なかったら強制的に進む」）
const Q_LIMIT=15, WAIT_ADV=16;   // 15秒で答えなければ時間切れ。答えない人（電話・圏外など）がいても、16秒で次へ（鑑定者本人 2026-11-19）
let QT=null;
// ひとりで診断・答え合わせのリンクでは、ほかのアプリに切りかえているあいだ時計を止める（もどったら続きから数える。2026-11-27）。みんなの部屋は止めない
const LT={t0:0,hid:0,active:false};
document.addEventListener('visibilitychange',()=>{if(!LT.active)return;if(document.hidden){if(!LT.hid)LT.hid=Date.now()}else if(LT.hid){LT.t0+=Date.now()-LT.hid;LT.hid=0}});
window.addEventListener('pagehide',()=>{if(LT.active&&!LT.hid)LT.hid=Date.now()});
window.addEventListener('pageshow',()=>{if(LT.active&&LT.hid&&!document.hidden){LT.t0+=Date.now()-LT.hid;LT.hid=0}});
function qTimer(t0,onEnd,loc){clearInterval(QT);let ended=false;
  const tick=()=>{const el=$('qtime');if(!el){clearInterval(QT);return}
    if(loc&&(document.hidden||LT.hid))return;
    const left=Math.max(0,Q_LIMIT*1000-(Date.now()-(loc?LT.t0:t0))),sec=Math.ceil(left/1000);
    const bar=el.querySelector('i'),tx=el.querySelector('span');if(bar)bar.style.width=(left/(Q_LIMIT*10))+'%';
    if(tx&&tx.dataset.s!==String(sec)){tx.dataset.s=sec;tx.innerHTML='のこり<b>'+sec+'</b>秒'}
    el.classList.toggle('low',sec<=5);
    if(left<=0&&!ended){ended=true;clearInterval(QT);onEnd()}};
  tick();QT=setInterval(tick,200)}
const maxOf=room=>room&&room.kind==='kon'?KON_MAX:MAXP;
const OPTS=['A','B','どっちでも合わせられる'];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
/* LINEの中の画面で開いたら、いつものブラウザ（Safari・Chrome）で開き直す（恋のかたち診断と同じ。2026-11-27）
   この画面に残っている結果・途中の答えは、アドレスの「#」の後ろ（サーバーにもアクセス解析にも送られない）に入れて一緒にうつす */
const IN_LINE=/\sLine\/\d/i.test(navigator.userAgent||'');
const MV_KEYS=['kv_mine','kv_sent','kv_hist','kv_talked','kv_again','kv_prog','kv_name'];
function mvPack(){try{const o={};MV_KEYS.forEach(k=>{const v=store(k);if(v!=null&&!(Array.isArray(v)&&!v.length))o[k]=v});if(!Object.keys(o).length)return'';
  let j=JSON.stringify(o);while(j.length>20000&&Array.isArray(o.kv_mine)&&o.kv_mine.length>1){o.kv_mine=o.kv_mine.slice(0,-1);j=JSON.stringify(o)}
  return btoa(unescape(encodeURIComponent(j))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}catch(e){return''}}
function mvUnpack(x){try{x=x.replace(/-/g,'+').replace(/_/g,'/');while(x.length%4)x+='=';return JSON.parse(decodeURIComponent(escape(atob(x))))}catch(e){return null}}
function mvGo(){const q=new URLSearchParams(location.search);q.set('openExternalBrowser','1');const mv=mvPack(),h=(location.hash||'').replace(/(?:^#|&)mv=[A-Za-z0-9_-]*$/,'');
  location.replace(location.origin+location.pathname+'?'+q.toString()+(mv?(h&&h!=='#'?h+'&':'#')+'mv='+mv:h))}
let MV_N=0;
(()=>{const m=/(?:^#|&)mv=([A-Za-z0-9_-]+)$/.exec(location.hash||'');
  const q=new URLSearchParams(location.search),had=q.has('openExternalBrowser');if(!IN_LINE)q.delete('openExternalBrowser');
  if(!m&&!(had&&!IN_LINE))return;
  const h=m?location.hash.slice(0,m.index):location.hash,qs=q.toString();
  try{history.replaceState(null,'',location.pathname+(qs?'?'+qs:'')+(h&&h!=='#'?h:''))}catch(e){}
  const o=m?mvUnpack(m[1]):null;if(!o||typeof o!=='object')return;
  const arr=(k,kf,fix)=>{const b=o[k];if(!Array.isArray(b))return;const cur=Array.isArray(store(k))?store(k).slice():[];let n=0;
    b.forEach(x=>{if(!x||typeof x!=='object')return;const i=cur.findIndex(y=>y&&kf(y)===kf(x));if(i<0){cur.push(x);n++}else if((x.at||0)>(cur[i].at||0))cur[i]=x});store(k,fix(cur));return n};
  MV_N+=arr('kv_mine',x=>x.id,a=>a.sort((x,y)=>(y.at||0)-(x.at||0)).slice(0,10))||0;
  arr('kv_sent',x=>x.id,a=>a.sort((x,y)=>(y.at||0)-(x.at||0)).slice(0,20));
  arr('kv_hist',x=>x.id,a=>a.slice(-20));
  arr('kv_again',x=>x.id+'|'+x.h,a=>a.slice(-30));
  if(o.kv_talked&&typeof o.kv_talked==='object'){const t=store('kv_talked')||{};Object.keys(o.kv_talked).forEach(k=>{const a=Array.isArray(t[k])?t[k]:[],b=Array.isArray(o.kv_talked[k])?o.kv_talked[k]:[];t[k]=[...new Set(a.concat(b))]});store('kv_talked',t)}
  if(o.kv_name&&!store('kv_name'))store('kv_name',o.kv_name);
  if(o.kv_prog&&o.kv_prog.at){const c=store('kv_prog');if(!c||(o.kv_prog.at||0)>(c.at||0)){store('kv_prog',o.kv_prog);MV_N++}}})();
const MV_GO=IN_LINE&&/^https?:$/.test(location.protocol)&&!new URLSearchParams(location.search).has('openExternalBrowser')&&(()=>{try{return sessionStorage.getItem('kv_stay')!=='1'}catch(e){return true}})();
if(MV_GO)mvGo();
const app=$('app');
// 画面の上の「もどる」（鑑定者本人 2026-11-20「もどる手段がいちばん下のトップへしかない」）。どの画面も左上から前の画面かトップへもどれる
function tnav(id,label,right){return `<nav class="tnav" aria-label="もどる"><button class="tnav-b" id="${id}" type="button"><span aria-hidden="true">‹</span> ${label||'トップへ'}</button>${right||''}</nav>`}
const clearJoinHash=()=>{try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}JOIN=''};
function view(h){app.innerHTML='<div class="scr">'+h+'</div>';window.scrollTo(0,0);if(!NAV_TOP)navPush()}
/* スマホの「戻る」（Androidの戻るボタン・iPhoneのスワイプ）でサイトから出ないように（2026-11-27）
   トップ以外の画面では履歴を1つ足しておき、戻るを押したら：問題の画面＝1問もどる（1問目はトップへ・答えは残る）／部屋の中＝出ない／ほかの画面＝トップへ */
let NAV_ON=false,NAV_TOP=false;
function navPush(){if(NAV_ON||WHERE==='claude')return;try{history.pushState({isync:1},'',location.href);NAV_ON=true}catch(e){}}
window.addEventListener('popstate',()=>{NAV_ON=false;
  const ov=$('siov');if(ov){const x=$('si-x');if(x)x.click();else ov.remove();if(!$('go-each'))navPush();return}
  if($('mine-ls')){mineView();return}
  if(LT.active&&L.qs){const pv=$('qprev');if(pv){navPush();pv.click();return}LT.active=false;clearInterval(QT);toast('トップにもどりました。答えた分は「さっきの続きから答える」で続けられます');goTop();return}
  if(R.code){navPush();toast('部屋から出るときは、画面の「やめる」か「トップへ」を押してください');return}
  if(!$('go-each'))goTop()});
/* 価値観のタイプ（axes.js）：問題の文から番号を引く。left＝左の傾向になる答え */
const AX=Object.entries(window.SY_AX||{}).map(([key,a])=>{const m=new Map();a.qs.forEach(([t,o])=>{const i=Q.findIndex(q=>q[1]===t);if(i>=0)m.set(i,o)});return{key,l:a.l,r:a.r,name:a.name,m}}).filter(a=>a.m.size);
// その人の傾向：左の答え＝1・こだわらない＝0.5・右の答え＝0 の平均（左寄りの％）。その物差しの問題に答えていなければ null
// 3つ目の答えが「自分には当てはまらない」の意味（料理はあまりしない・お酒は飲まない など）。ものさしには数えず、片方だけがこの答えの問題はシンクロ率にも数えない（2026-11-27）
const NA_L=new Set(['料理はあまりしない','お酒は飲まない','あまり食べない','あまり読まない','あまり興味がない','あまり見ない']);
const isNA=(o,k)=>o===2&&NA_L.has(Q[k][4]);
function axScore(p,qs,a){let s=0,n=0;qs.forEach((k,i)=>{if(!a.m.has(k))return;const x=p.ans[i];if(!x||x.o<0||isNA(x.o,k))return;n++;s+=x.o===2?.5:x.o===a.m.get(k)?1:0});return n?{pct:Math.round(s/n*100),n}:null}
// 本当に「どっちでも合わせられる」答え（3つ目の答えが「日による」「ふつう」などの問題は、まん中の答えで、合わせられるには数えない。鑑定者本人 2026-11-20）
const FLEX_L=new Set(['どっちも','どっちも好き','どっちも大事','気にしない','金額は気にしない','年は気にしない','どっちでもうれしい','どっちもうれしい','どっちも買う']);
const isFlex=(o,k)=>o===2&&(!Q[k][4]||FLEX_L.has(Q[k][4]));
const ans=(o,k)=>o===0?Q[k][2]:o===1?Q[k][3]:o===2?(Q[k][4]||'どっちでも合わせられる'):o===3?UNDEC:'時間切れ';
// 「まだ決められない」（鑑定者本人 2026-11-19「絶対に答えなくても良いように」「即決できないという答えもわかる」）：答えの o は -1 のまま u:1 を付ける＝シンクロ率・みんなの答えの％には数えない。結果に「まだ決められなかった問題」として出す
const UNDEC='まだ決められない',oOf=a=>!a?-1:a.u?3:a.o;

/* テーマが偏らないように配る：テーマを順番に回して、まだ出ていない問題から選ぶ */
function deal(len,topic){
  if(PACKQ&&PACKQ.length>=len){const seen=new Set(store('kv_seen3')||[]);
    const out=shuffle(PACKQ).sort((a,b)=>seen.has(a)-seen.has(b)).slice(0,len);out.forEach(i=>seen.add(i));store('kv_seen3',[...seen]);return out}
  let cats=shuffle(TOPICS[topic]||TOPICS.all);
  if(topic==='party'){const d=CI('ドキドキ');cats=cats.filter(c=>c!==d);cats.splice(0,0,d);cats.splice(3,0,d)} // ドキドキは1つおきくらいに
  const seen=new Set(store('kv_seen3')||[]);
  const pool={};[...new Set(cats)].forEach(c=>{const all=Q.map((q,i)=>i).filter(i=>Q[i][0]===c),need=Math.ceil(len*cats.filter(x=>x===c).length/cats.length)+1;
    let fresh=shuffle(all.filter(i=>!seen.has(i)));
    if(fresh.length<need){all.forEach(i=>seen.delete(i));fresh=shuffle(all)} // そのテーマを出しきったら一周目にもどす
    pool[c]=fresh});
  const out=[];let r=0;
  while(out.length<len){const c=cats[r%cats.length];const i=pool[c].shift();if(i!=null&&!out.includes(i))out.push(i);r++;if(r>len*20)break}
  ensureAx(out,len,new Set(cats),seen);
  out.forEach(i=>seen.add(i));store('kv_seen3',[...seen]);
  return out;
}
/* 価値観のタイプが出せるよう、4つの物差しの問題をそれぞれ何問か入れる（10問＝1問ずつ・30問＝3問ずつ）。
   入れかえるのは、どの物差しにも入らない問題（できるだけ同じテーマどうし） */
const AX_LIGHT=new Set(['レジで「ポイントカードは？」と聞かれたら？','セールは？','お店のクーポンは？','自分へのごほうびは？','出かけるときの飲みものは？','ふだんの外食は？','サブスクは？','買い物のしかたは？','趣味に使うお金は？','ものが壊れたら？']);
function ensureAx(out,len,cats,seen){
  const m=len>=30?3:1,inAx=i=>AX.some(a=>a.m.has(i));
  AX.forEach(a=>{
    let have=out.filter(i=>a.m.has(i)).length;
    // 「恋愛多め」はお金の問題を出さないので、お金の使い方のものさしだけは軽いお金の問題（AX_LIGHT）から入れる（2026-11-27）
    const okc=i=>cats.has(Q[i][0])||(a.key==='okane'&&AX_LIGHT.has(Q[i][1]));
    const cand=shuffle([...a.m.keys()].filter(i=>okc(i)&&!out.includes(i))).sort((x,y)=>seen.has(x)-seen.has(y));
    const dk=CI('ドキドキ');
    while(have<m&&cand.length){const c=cand.shift();
      let j=out.findIndex(i=>!inAx(i)&&Q[i][0]===Q[c][0]);if(j<0)j=out.findIndex(i=>!inAx(i)&&Q[i][0]!==dk);if(j<0)j=out.findIndex(i=>!inAx(i));if(j<0)break;
      out[j]=c;have++}});
}
/* 婚活・街コン：大事な問題を中心に20問（大事14問＋暮らし・食・お金・休日のふつうの問題6問）。ドキドキは出さない */
function dealKon(len){
  const dk=CI('ドキドキ'),seen=new Set(store('kv_seen3')||[]);
  const pick=(pool,m)=>{let f=shuffle(pool.filter(i=>!seen.has(i)));if(f.length<m)f=shuffle(pool);
    const by={};f.forEach(i=>(by[Q[i][0]]=by[Q[i][0]]||[]).push(i));const cs=shuffle(Object.keys(by)),out=[];let r=0;
    while(out.length<m&&r<m*20){const i=by[cs[r%cs.length]].shift();if(i!=null)out.push(i);r++}return out};
  const all=Q.map((q,i)=>i).filter(i=>Q[i][0]!==dk),daily=[CI('暮らし'),CI('食'),CI('お金'),CI('休日・遊び')];
  const big=pick(all.filter(i=>WB.has(i)),Math.round(len*.7));
  const mid=pick(all.filter(i=>!WB.has(i)&&!WL.has(i)&&daily.includes(Q[i][0])),len-big.length);
  const out=shuffle(big.concat(mid));out.forEach(i=>seen.add(i));store('kv_seen3',[...seen]);return out;
}
function markSeen(ids){const s=new Set(store('kv_seen3')||[]);ids.forEach(i=>s.add(i));store('kv_seen3',[...s])}

/* ===== トップ ===== */
const CFG=Object.assign({mode:'each',len:30,topic:'party',anon:false},store('kv_cfg')||{});
if(!['each','solo'].includes(CFG.mode))CFG.mode='each';  // 大人数の部屋（kon）はやめた（2026-11-14）。中身は残してある  // 前の「1台を回して」はなくした
let JOIN=(/^#join-(\d{4}(?:-[a-z0-9]{6})?)$/.exec(location.hash||'')||[])[1]||'';
if(JOIN)CFG.mode='each';
if(['solo','each'].includes(QS.get('mode')))CFG.mode=QS.get('mode');
const saveCfg=()=>store('kv_cfg',{mode:CFG.mode,len:CFG.len,topic:CFG.topic,anon:CFG.anon});
/* トップの「まず1問、答えてみて」（鑑定者本人 2026-11-17 トップの見本で「2のオーロラ」。押すと、これまでに診断した人の％が出る。ここでは数えない） */
const TH_N=CATS.map((c,i)=>[c[0],Q.filter(q=>q[0]===i).length]).filter(x=>x[1]);
const TRY_K=Math.max(0,Q.findIndex(q=>q[1]==='休みの日は、恋人と？'));   // 上の見本に「LINEは？」があるので、ちがう問題にする（鑑定者本人 2026-11-19）
// トップの見本：3問の答えを左右に並べて、重なる／分かれるを見せる（鑑定者本人 2026-11-19「B」）
const OV_ROWS=[['記念日は？',0,0],['LINEは？',0,2],['お風呂は？',0,1]];
function bindTry(){
  const box=$('try');if(!box)return;let done=false,counts=null;
  getDb().then(db=>db&&db.votes?db.votes(['q'+QKEY[TRY_K]]):null).then(c=>{counts=c&&c['q'+QKEY[TRY_K]]}).catch(()=>{});
  box.querySelectorAll('.topt').forEach(b=>b.onclick=()=>{if(done)return;done=true;const v=+b.dataset.tv;
    const c=counts||{},cnt=[c.a||0,c.b||0,c.c||0];const t0=cnt[0]+cnt[1]+cnt[2];cnt[v]++;const t=t0+1;
    box.classList.add('done');
    box.querySelectorAll('.topt').forEach(o=>{const k=+o.dataset.tv;o.classList.toggle('me',o===b);
      if(t0>0){const pc=Math.round(cnt[k]*100/t);o.querySelector('.pct').textContent=pc+'%';o.querySelector('.tbar').style.width=pc+'%'}});
    $('tnote').innerHTML=t0>0?`これが<b>みんなの答え</b>です${t0+1>=SHOW_COUNT?`（${t.toLocaleString()}人）`:''}。大事な人の答えは、同じ？`:'大事な人の答えは、同じ？　下から一緒に診断できます。';
  });
}
function seg(name,items){return `<div class="chips c${items.length}" role="group">${items.map(([v,l])=>`<button class="chip" data-k="${name}" data-v="${v}" aria-pressed="${String(CFG[name])===String(v)}">${l}</button>`).join('')}</div>`}
function goTop(){
  const st=store('kv_room');LT.active=false;clearInterval(QT);NAV_TOP=true;
  view(`
  <header class="brand">
    <div class="bubbles" aria-hidden="true"><i class="m" style="left:4%;top:30px;--s:34px;--d:0s;--t:9s"></i><i class="p" style="left:16%;top:150px;--s:16px;--d:2s;--t:7s"></i><i class="p" style="left:80%;top:18px;--s:44px;--d:1s;--t:10s"></i><i class="m" style="left:90%;top:170px;--s:20px;--d:3s;--t:8s"></i><i class="l" style="left:70%;top:110px;--s:12px;--d:0.5s;--t:6s"></i><i class="l" style="left:24%;top:80px;--s:10px;--d:4s;--t:7s"></i><i class="m" style="left:58%;top:4px;--s:22px;--d:2.5s;--t:9s"></i><i class="p" style="left:3%;top:222px;--s:18px;--d:1.5s;--t:11s"></i><i class="m" style="left:93%;top:240px;--s:12px;--d:5s;--t:8s"></i></div>
    <div class="orb" aria-hidden="true"></div>
    <h1 class="logo">I-Sync</h1><p class="kana">アイ・シンク</p>
    <p class="catch">わたしとあなたの、<br>重なるところ。</p>
    <p class="lead">2人の答えを重ねると、<span class="nw">シンクロ率</span>がわかる。</p>
  </header>
  ${progCard()}<div id="ibx" hidden></div>${mineList().length?`<button type="button" class="mine-top" id="mine-top"><span>わたしの結果</span><small>${mineList().length}回ぶん・このスマホに保存</small></button>`:''}
  ${PACK?`<section class="card packb"><p class="label">「${esc(PACK.title)}」の質問から出します</p><p class="hint">このテーマの質問だけで、ひとりでも、みんなでも診断できます。</p><button class="btn ghost small" id="packx">いつもの質問にもどす</button></section>`:''}
  <section class="card ov" aria-label="見本：2人の答えの重なり">
    <div class="ov-who"><span>あなた</span><span>あの人</span></div>
    ${OV_ROWS.map(([q,a,b])=>{const k=Q.findIndex(x=>x[1]===q);if(k<0)return'';const mk=a===b?['eq','ぴったり']:(a===2||b===2)?['al','近い']:['ne','ちがい'];
      return `<div class="ov-r"><p class="ov-q"><span>${esc(q)}</span><i class="ov-m ${mk[0]}">${mk[1]}</i></p><span class="ov-c me">${esc(ans(a,k))}</span><span class="ov-c you">${esc(ans(b,k))}</span></div>`}).join('')}
    <div class="ov-sum"><p class="ov-cap">2人のシンクロ率</p><div class="ov-ring"><span>78<small>%</small></span></div>
      <p class="ov-why"><b>2人の価値観が、どれだけ重なっているか</b>がひと目でわかる数字です。お金・将来・暮らしのような大事な問題ほど、重く数えます。</p>
      <p class="ov-next">分かれたところには、<b>歩み寄りの案</b>が出ます。</p></div>
  </section>
  <div class="gos">
    <p class="gos-h">あの人と、みんなと。<br>「ふつう」はどこまで同じ？</p>
    <button class="gobig g1" id="go-each"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg></span><span><b>2人で・みんなで</b><small>QRを読むだけ・2〜10人</small></span></button>
    <button class="gobig g2" id="go-solo"><span class="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></span><span><b>ひとりで診断</b><small id="solo-sub">${CFG.len}問・約${minsOf(CFG.len)}分。あとで答え合わせ</small></span></button>
    <p class="free">${Q.length}の質問・${TH_N.length}つのテーマ　無料・登録なし・アプリ不要</p>
  </div>
  <section class="card try" id="try">
    <p class="kick">まず1問、答えてみて</p>
    <p class="exq">${esc(Q[TRY_K][1])}</p>
    <div class="tops">${[0,1,2].map(v=>`<button class="topt o${v}" data-tv="${v}"><span class="t">${v<2?OPTS[v]+'　':''}${esc(ans(v,TRY_K))}</span><span class="pct"></span><i class="tbar"></i></button>`).join('')}</div>
    <p class="tnote" id="tnote"></p>
  </section>

  ${st&&st.code?`<button class="btn ghost small" id="back">さっきの部屋（${esc(dcode(st.code))}）にもどる</button>`:''}
  <section class="card" id="setup">
    <p class="label">だれと診断する？</p>
    ${seg('mode',[['each','みんなで<br><small>それぞれのスマホで</small>'],['solo','ひとりで']])}
    <p class="hint" id="m-desc"></p>
    <div id="m-opts" class="stack">
    <p class="label">長さは？</p>
    ${seg('len',[[10,'簡易版<br><small>10問・さくっと</small>'],[30,'しっかり版<br><small>30問・★ゆずれない</small>']])}
    <div class="star-what" id="star-what"${CFG.len===30?'':' hidden'}><b>★ゆずれない とは？</b><span>「ここは相手に合わせられない」と思う問題に付ける印です。</span><span>結果で、おたがいのゆずれないところをくらべます。点数には入りません。</span></div>
    ${PACK?'':`<p class="label">話題は？</p>
    ${seg('topic',[['all','暮らし・価値観'],['party','恋愛多め']])}`}
    <div id="m-anon" class="stack">
      <p class="label">名前は？</p>
      ${seg('anon',[[false,'見せる'],[true,'見せない']])}
    </div>
    </div>
  </section>
  <section class="card" id="m-kon">
    <ul class="know">
      <li><b>番号だけで参加</b><span>会場の番号札の番号を入れるだけ。名前は出ません</span></li>
      <li><b>みんなで一斉に20問</b><span>お金・将来・暮らしなど、聞きにくい大事なことが中心。★ゆずれないも使えます</span></li>
      <li><b>合う人は自分のスマホにだけ</b><span>答えが重なった順に出ます。ほかの人どうしの結果は見えません</span></li>
      <li><b>名前はおたがいがOKのときだけ</b><span>2人とも「名前を見せてもいい」を押したときだけ、その2人に名前が出ます</span></li>
    </ul>
    <button class="btn" id="mkk">部屋を作る（主催者の方）</button>
    <div class="join">
      <label for="kcode"><span>参加する方（部屋番号を入れる）</span></label>
      <div class="join-row"><input type="text" id="kcode" inputmode="numeric" maxlength="4" placeholder="部屋番号（4けた）"><button class="btn small" id="kjn">参加</button></div>
    </div>
    <p class="hint">主催者の画面のQRコードを、自分のスマホのカメラで読みとっても参加できます。</p>
    <p class="err" id="kerr" role="alert"></p>
  </section>
  <section class="card" id="m-each">
    <label class="one-name" for="me"><span>ニックネーム</span><input type="text" id="me" maxlength="10" value="${esc(store('kv_name')||'')}"></label>
    <button class="btn" id="mk">部屋を作る</button>
    <p class="hint mk-what">押すと部屋ができて、そばの友だちに見せるQRコードと、LINEで送るリンクが出ます。</p>
    <div class="join">
      <label for="code"><span>招待された人は、こちら（部屋番号で参加）</span></label>
      <div class="join-row"><input type="text" id="code" inputmode="numeric" maxlength="4" placeholder="部屋番号（4けた）" value="${esc(dcode(JOIN))}"><button class="btn small" id="jn">参加</button></div>
    </div>
    <p class="hint">部屋のQRコードを、自分のスマホのカメラで読みとっても参加できます。</p>
    <p class="err" id="err" role="alert"></p>
  </section>
  <section class="card" id="m-solo">
    <label class="one-name" for="sn"><span>ニックネーム</span><input type="text" id="sn" maxlength="10" placeholder="なくてもOK" value="${esc(store('kv_name')||'')}"></label>
    <button class="btn" id="sgo">はじめる</button>
  </section>
  <a class="btn line small" id="lntop" href="#" target="_blank" rel="noopener">LINEでこのサイトを紹介する</a>
  <p class="hint lntop-what">あとで診断してほしい友だちに、サイトのリンクだけを送ります。いま一緒に診断するときは「部屋を作る」から誘ってください。</p>
  <section class="card themes"><p class="label">テーマ別の質問</p>
    <ul class="tlinks">${(window.SY_PAGES||[]).map(p=>`<li><a href="${p.slug}/">${esc(p.h1)}</a></li>`).join('')}</ul></section>
  ${PROMO}
  ${SIS_HTML}
  <p class="note">どの問題にも正解はありません。どちらでもいいときは、3つ目の答え（「どっちでも合わせられる」「どっちも好き」など）を選んでください。</p>
  <p class="credit" data-nocg><a class="pp-link" href="privacy.html">プライバシーポリシー</a><br>アイ・シンク（I-Sync）<br>Produced by Mizuki Nico</p>`);
  const DESC={kon:'最大40人。番号だけで参加して、名前を出さずに一斉に20問。終わると、自分と合う人が、自分のスマホにだけ出ます。',each:'2〜10人で。1人が部屋を作り、そばにいる人はQRコードを読みとるだけで参加できます。離れている人には、LINEなどでリンクを送ります。',solo:'答えから、あなたの価値観のかたちと、こだわり・合わせられることがわかります。'};
  const refresh=()=>{['each','solo','kon'].forEach(m=>$('m-'+m).hidden=CFG.mode!==m);
    $('m-desc').textContent=DESC[CFG.mode];$('solo-sub').textContent=CFG.len+'問・約'+minsOf(CFG.len)+'分。あとで答え合わせ';$('m-anon').hidden=CFG.mode!=='each';$('m-opts').hidden=CFG.mode==='kon';
  };
  app.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k,v=b.dataset.v;
    CFG[k]=k==='len'?+v:k==='anon'?v==='true':v;saveCfg();
    app.querySelectorAll(`[data-k="${k}"]`).forEach(x=>x.setAttribute('aria-pressed',x===b));const sw=$('star-what');if(sw)sw.hidden=CFG.len!==30;refresh()});
  refresh();
  // トップの大きな2つのボタン：選んで、下の設定へ
  const pickMode=m=>{CFG.mode=m;saveCfg();app.querySelectorAll('[data-k="mode"]').forEach(x=>x.setAttribute('aria-pressed',x.dataset.v===m));refresh();
    const t=$('setup');if(t)t.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})};
  $('go-each').onclick=()=>pickMode('each');$('go-solo').onclick=()=>pickMode('solo');
  bindTry();
  // みんなのスマホで
  const myName=()=>{const v=$('me').value.trim();if(v)store('kv_name',v);return v};
  const err=t=>{$('err').textContent=t};
  $('mk').onclick=async e=>{const n=myName();if(!n)return err('ニックネームを入れてください');e.target.disabled=true;const r=await createRoom(n);if(r!=='ok'){err(r);e.target.disabled=false}};
  $('jn').onclick=async e=>{const n=myName(),c=$('code').value.replace(/\D/g,'');if(!n)return err('ニックネームを入れてください');if(c.length!==4)return err('4けたの部屋番号を入れてください');
    e.target.disabled=true;const r=await joinRoom(c,n,false,true);if(r!=='ok'){err(r);e.target.disabled=false}};
  const bk=$('back');if(bk)bk.onclick=async()=>{const r=await joinRoom(st.code,store('kv_name')||'');if(r!=='ok'){store('kv_room',null);goTop()}};
  // 婚活・街コン
  $('mkk').onclick=async e=>{e.target.disabled=true;const r=await createKonRoom();if(r!=='ok'){$('kerr').textContent=r;e.target.disabled=false}};
  $('kjn').onclick=()=>{const c=$('kcode').value.replace(/\D/g,'');if(c.length!==4){$('kerr').textContent='4けたの部屋番号を入れてください';return}joinFromLink(c,true)};
  const px=$('packx');if(px)px.onclick=()=>{location.href=location.pathname};
  inboxBanner();const mt=$('mine-top');if(mt)mt.onclick=mineView;
  NAV_TOP=false;
  const pg=$('prog-go');if(pg){pg.onclick=progResume;$('prog-x').onclick=()=>{progClear();const c=$('prog');if(c)c.remove()}}
  const lt=$('lntop'),ltSet=()=>{lt.href=lineUrl('アイ・シンク｜カップル・友だちで答える価値観診断。2人の答えを重ねると、シンクロ率がわかる無料の診断です。',siteUrl())};ltSet();lt.addEventListener('click',ltSet);
  // ひとりで
  $('sgo').onclick=()=>{const v=$('sn').value.trim();if(v)store('kv_name',v);soloStart(v)};
}

/* ===== 1問の画面（どのモードでも同じ） =====
   o: 0=A 1=B 2=こだわらない（3つ目の答え） ／ st: ★ゆずれない（相手の答えの予想はなくした＝鑑定者本人の判断 2026-11-13） */
// 恋愛・ドキドキの問題の案内（鑑定者本人 2026-11-20「あなたが思う人を浮かべてくださいって言葉でいい」）。その回の最初の1問だけくわしく
const IF_LONG='あなたが思う人（恋人・好きな人）を思い浮かべて答えてください。いない人は、いたらどうするかで答えてください。',IF_SHORT='※あなたが思う人を思い浮かべて答えてください';
function askHTML(k,i,n,{who,step,star,starOn,to,u,nav,qs,room,quit}){
  const q=Q[k],cat=CATS[q[0]],first=!(qs||[]).slice(0,i).some(x=>CATS[Q[x][0]][1]);
  const opt=(v,cls='')=>`<button class="opt ${cls}" data-v="${v}">${v<2?`<span class="k">${OPTS[v]}</span>`:''}<span>${esc(ans(v,k))}</span></button>`;
  // みんなの部屋：答える前は答えのボタンを先に、席（みんなのようす）はその下に。答えたら答えのボタンが消えるので、席が問題のすぐ下に上がる。「やめる」はカードの中へ
  // （背の低いスマホで答えのボタンが画面の下にはみ出していた。鑑定者本人 2026-11-21「案bでお願い」）
  const seats='<div class="hint" id="tcnt"></div><div class="allok" id="allok" hidden>全員決めた！<small>次の問題へ…</small></div>',seatsLow=room&&step!=='done';
  return `${nav||''}<section class="card ask${room?' rm':''}">${room?'':'<img class="chara c-ask" src="img/pair-think.webp" width="124" height="79" alt="" aria-hidden="true">'}
    <div class="prog">${Array.from({length:n},(_,j)=>`<i class="${j<=i?'on':''}"></i>`).join('')}</div>
    <div class="qhead"><span class="tag catg c${q[0]}">${esc(cat[0])}</span><span class="qn">${i+1}／${n}${who?`　${esc(who)}`:''}</span>${quit?'<button class="tnav-b quit qh-q" id="rquit" type="button">やめる</button>':''}</div>
    ${cat[1]?`<p class="if">${esc(cat[1])}</p><p class="if-note${first?'':' s'}">${first?IF_LONG:IF_SHORT}</p>`:''}
    <h2 class="q"><span class="qmark" aria-hidden="true">Q</span><span class="qtx">${esc(q[1])}</span></h2>
    ${seatsLow?'':seats}
    ${step==='done'?`<div class="match">${to?'時間切れ':u?'「'+UNDEC+'」にしました':'答えました！'}</div><div id="skipq"></div>`:`
    <div class="qtime" id="qtime" role="timer" aria-label="のこり時間"><span class="qt-s">のこり<b>${Q_LIMIT}</b>秒</span><b class="qt-b"><i></i></b></div>
    <p class="label">あなたはどっち？</p>
    ${star?`<div class="star-row${i<3?' nudge':''}"><button class="star" id="star" aria-pressed="${!!starOn}">★ ここはゆずれない</button>${i<3?'<span class="star-tip">ゆずれない問題なら、答える前にここをタップ</span>':''}</div>`:''}
    <div class="opts">${opt(0)}${opt(1)}${opt(2,'mid')}</div>
    <button class="opt-u" type="button" data-v="3">${UNDEC}</button>${seatsLow?seats:''}`}
  </section>`;
}
// その問題が長くて「まだ決められない」まで1画面に入らないときだけ、その問題の文字・答えのボタンを少しずつ小さくする
// （問題の文17px・答え15px・ボタンの高さ46pxまで。鑑定者本人 2026-11-21「とにかくはみ出さないで綺麗に見えたい」）
function askFit(){
  const a=app.querySelector('.card.ask'),q=a&&a.querySelector('.q'),u=a&&a.querySelector('.opt-u');if(!a||!q||!u)return;
  const os=[...a.querySelectorAll('.opt')],tip=a.querySelector('.star-tip'),ifl=a.querySelector('.if');
  a.style.rowGap='';const op=a.querySelector('.opts');if(op)op.style.gap='';
  q.style.fontSize='';os.forEach(o=>{o.style.fontSize='';o.style.minHeight=''});if(tip)tip.style.display='';if(ifl)ifl.style.display='';
  const need=()=>u.getBoundingClientRect().bottom+(window.scrollY||0);
  let qf=parseFloat(getComputedStyle(q).fontSize)||20,of=os[0]?parseFloat(getComputedStyle(os[0]).fontSize)||17:17,oh=os[0]?parseFloat(getComputedStyle(os[0]).minHeight)||52:52,n=0;
  let rg=parseFloat(getComputedStyle(a).rowGap)||0;
  while(need()>innerHeight&&n<30){n++;
    if(rg>7){rg=7;a.style.rowGap='7px';if(op)op.style.gap='6px'}
    else if(qf>17){qf=Math.max(17,qf-.5);q.style.fontSize=qf+'px'}
    else if(oh>46){oh=Math.max(46,oh-2);os.forEach(o=>o.style.minHeight=oh+'px')}
    else if(of>15){of=Math.max(15,of-.5);os.forEach(o=>o.style.fontSize=of+'px')}
    else if(tip&&tip.style.display!=='none'){tip.style.display='none'}
    else if(ifl&&ifl.style.display!=='none'){ifl.style.display='none'}
    else break}
}
(()=>{let tm;window.addEventListener('resize',()=>{clearTimeout(tm);tm=setTimeout(askFit,120)})})();
function bindAsk(onPick){
  askFit();
  app.querySelectorAll('.opt,.opt-u').forEach(b=>b.onclick=()=>onPick(+b.dataset.v));
  const s=$('star');if(s)s.onclick=()=>{const on=s.getAttribute('aria-pressed')!=='true';s.setAttribute('aria-pressed',on);onPick(null,on)};
}

/* ===== ひとりで ===== */
const L={};  // 手元で遊ぶときのゲーム
/* 答えている途中は、答えをこのスマホに残す。ページが読み直されても、トップの「さっきの続きから答える」で続きから（24時間まで。2026-11-27） */
const PROG_MS=24*3600e3;
function progSave(){if(!L.qs||!['solo','pair','late'].includes(L.mode))return;
  store('kv_prog',{at:Date.now(),mode:L.mode,qs:L.qs,i:L.i,players:L.players.map(p=>({id:p.id,name:p.name,ans:p.ans})),partner:L.partner||null,late:L.late||null})}
function progClear(){store('kv_prog',null)}
function progGet(){const g=store('kv_prog');if(!g||!Array.isArray(g.qs)||!g.qs.length||!(g.i>=0&&g.i<g.qs.length)||Date.now()-(g.at||0)>PROG_MS||!g.qs.every(k=>Q[k])){if(g)progClear();return null}return g}
function progCard(){const g=progGet();if(!g)return'';const n=g.qs.length,what=g.mode==='pair'?esc(san((g.partner||{}).name||'ともだち'))+'との答え合わせ':g.mode==='late'?'部屋（'+esc(dcode((g.late||{}).code))+'）にあとから参加':'ひとりで診断';
  return `<section class="card prog-c" id="prog"><p class="label">さっきの続きがあります</p><p class="hint">${what}・<b>${g.i+1}問目</b>から（全${n}問）。答えた分は、このスマホに残っています。</p>
    <button class="btn" id="prog-go" type="button">さっきの続きから答える</button><button class="btn ghost small" id="prog-x" type="button">最初からやりなおす（消す）</button></section>`}
function progResume(){const g=progGet();if(!g)return goTop();
  Object.assign(L,{counts:undefined,mode:g.mode,qs:g.qs,i:g.i,p:0,players:g.players.map(p=>({id:p.id,name:p.name,ans:p.ans||{}})),partner:g.partner||undefined,late:g.late||undefined});
  R.starDone=Object.assign(R.starDone||{},{local:1});if(g.i>0)prefetchVotes();localAsk()}
function soloStart(name){
  Object.assign(L,{counts:undefined,mode:'solo',qs:deal(CFG.len,CFG.topic),players:[{id:'me',name:name||'あなた',ans:{}}],p:0,i:0});
  localAsk();
}
/* 答えたあと、これまでに診断した人の答えの割合を少しだけ出す（究極の二択と同じ。ひとり・答え合わせのリンクのとき。鑑定者本人の指示 2026-11-16）
   問題の数は、はじめに1回だけまとめて読む（L.counts）。読めないとき・確認用ページでは出さないだけ */
function prefetchVotes(){L.counts=null;const qs=L.qs;getDb().then(db=>db&&db.vote&&db.votes?db.votes(qs.map(k=>'q'+QKEY[k])):null).then(c=>{if(c&&L.qs===qs)L.counts=c}).catch(()=>{})}
// 答えた人の数は、その問題に10人以上が答えてから出す（鑑定者本人 2026-11-16「5人、10人に遊んでもらって、それでカウントして始めても」）。少ないうちは％だけ
const SHOW_COUNT=10;
function flashVotes(k,v){
  if(!L.counts)return false;const id='q'+QKEY[k],c=L.counts[id]||{},cnt=[c.a||0,c.b||0,c.c||0],before=cnt[0]+cnt[1]+cnt[2];
  if(!(store('kv_voted')||[]).includes(id))cnt[v]++;
  const t=cnt[0]+cnt[1]+cnt[2];if(!t)return false;
  app.querySelectorAll('.opt').forEach(b=>{const o=+b.dataset.v,pc=Math.round(cnt[o]/t*100);b.disabled=true;if(o===v)b.classList.add('picked');
    b.classList.add('w');b.insertAdjacentHTML('beforeend',`<span class="wrow"><span class="wpct">みんなの${pc}%</span></span><i class="wbar" style="width:${pc}%"></i>`)});
  const o=app.querySelector('.opts');if(o&&t>=SHOW_COUNT)o.insertAdjacentHTML('afterend',`<p class="wnote">これまでに${t.toLocaleString()}人が答えました</p>`);
  return true}
// ★ゆずれないの使い方：はじめる前に画面いっぱいで説明し、「わかった」で進む（鑑定者本人 2026-11-19「押すってことが絶対分からない」「OKしたらスタート」）
function starIntro(key,ok,go){if(R.starSeen===key){go&&go();return}const old=$('siov');if(old)return;
  const d=document.createElement('div');d.id='siov';d.className='si-ov';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-labelledby','si-t');
  d.innerHTML=`<section class="si-card"><button class="si-x" id="si-x" type="button" aria-label="閉じる">×</button><p class="si-tag">はじめる前に</p><h2 id="si-t">「★ ここはゆずれない」ボタン</h2>
    <div class="si-demo" aria-hidden="true"><span class="si-q">お風呂は？</span><span class="star si-star">★ ここはゆずれない</span><span class="si-finger">↑ ここを押す</span></div>
    <div class="si-what"><b>「ゆずれない」とは？</b><span>相手とちがうと困る、ここは合わせられない、と思うことです。</span><span class="ex">例：お金のため方は、絶対にこうしたい</span></div>
    <p class="si-lead">そう思った問題では、答えを選ぶ前にこのボタンを押してください。</p>
    <ul class="si-list"><li>結果の「★ ゆずれないところ」で、答えをくらべます</li><li>シンクロ率の点数には入りません。気軽に押してください</li><li>押さなくても大丈夫。ゆずれない問題にだけ押してください</li></ul>
    <button class="btn" id="si-ok" type="button">${esc(ok)}</button></section>`;
  document.body.appendChild(d);navPush();const b=$('si-ok');try{b.focus()}catch(e){}
  b.onclick=()=>{R.starSeen=key;d.remove();go&&go()};
  // 閉じる：ひとりで・答え合わせはまだ始めずに元の画面へ（もう一度はじめると、また出る）／部屋はこの説明だけ閉じる
  const close=()=>{d.remove();document.removeEventListener('keydown',esc_);if(!go)R.starSeen=key};const esc_=e=>{if(e.key==='Escape')close()};
  $('si-x').onclick=close;document.addEventListener('keydown',esc_)}
function localAsk(){
  if(L.i===0&&L.p===0&&L.counts===undefined)prefetchVotes();
  const p=L.players[L.p],k=L.qs[L.i],n=L.qs.length,multi=L.players.length>1;
  if(n===30&&L.i===0&&L.p===0&&!(R.starDone||{}).local){starIntro('local','わかった、はじめる',()=>{R.starDone=Object.assign(R.starDone||{},{local:1});localAsk()});return}
  const a=p.ans[L.i]||(p.ans[L.i]={o:-1,st:0,ms:0});
  progSave();
  const nav=`<nav class="tnav" aria-label="もどる">${L.i>0?'<button class="tnav-b" id="qprev" type="button"><span aria-hidden="true">‹</span> 1問もどる</button>':'<span></span>'}<button class="tnav-b quit" id="qquit" type="button">やめる</button></nav>`;
  view(askHTML(k,L.i,n,{who:multi?p.name+'さん':'',step:'own',star:n===30,starOn:a.st,nav,qs:L.qs}));
  LT.t0=Date.now();LT.hid=0;LT.active=true;let fin=false;
  const pv=$('qprev');if(pv)pv.onclick=()=>{if(fin)return;fin=true;clearInterval(QT);L.i--;localAsk()};
  // やめる：まちがえて押しても消えないよう、2回押しでトップへ（答えはどこにも送らない）
  const qq=$('qquit');qq.onclick=()=>{if(!qq.dataset.arm){qq.dataset.arm=1;qq.textContent='もう一度押すと、やめてトップへ';setTimeout(()=>{if(qq.isConnected){delete qq.dataset.arm;qq.textContent='やめる'}},4000);return}
    fin=true;clearInterval(QT);progClear();clearJoinHash();goTop()};
  const go=()=>{
    L.i++;
    if(L.i<n){localAsk();return}
    L.i=0;L.p++;LT.active=false;progClear();
    if(L.mode==='late'){lateFinish();return}
    if(L.mode==='pair'){{const G2={players:[L.partner,L.players[0]],qs:L.qs,me:'me',anon:false,local:true,pair:true,ibx:L.partner.ibx};showResult(G2);inboxSend(L.partner.ibx,L.players[0],L.qs).then(ok=>backDone(G2,ok));if(window.PkNotify&&L.partner.ibx)window.PkNotify.answered({kind:'with',ref:L.partner.ibx,name:L.players[0].name})}return}
    showResult({players:L.players,qs:L.qs,me:L.mode==='solo'?'me':null,anon:false,local:true});
    };
  bindAsk((v,starOn)=>{
    if(v===null){a.st=starOn?1:0;return}
    if(fin)return;fin=true;clearInterval(QT);
    if(v===3){a.o=-1;a.u=1;a.ms=Date.now()-LT.t0;a.to=0;go();return}
    a.o=v;a.u=0;a.ms=Date.now()-LT.t0;a.to=0;
    if(L.mode==='late'&&lateTimes(L.i)){flashVotes(k,v);setTimeout(go,2000);return}
    if(!multi&&flashVotes(k,v))setTimeout(go,1400);else go();
  });
  // 15秒たったら「時間切れ」で次の問題へ（答えなしとして数えない）
  qTimer(0,()=>{if(fin)return;fin=true;a.o=-1;a.ms=Q_LIMIT*1000;a.to=1;
    app.querySelectorAll('.opt,.opt-u,#star').forEach(b=>b.disabled=true);
    const el=$('qtime');if(el){el.classList.add('end');el.querySelector('span').textContent='時間切れ'}
    setTimeout(go,L.mode==='late'&&lateTimes(L.i)?2000:900)},true);
}

/* ===== 結果 ===== */
// 2人の合い方：同じ＝ぴったり／片方がまん中の答え＝近い／AとBで分かれた＝ちがい
function pairStat(A,B,qs,only){
  // 問題の重さ（大事＝2・軽い＝0.5）で数える。★ゆずれないはシンクロ率に入れず、「★ ゆずれないところ」の枠で別に見せる（鑑定者本人 2026-11-19「点数差はつけない方がいい」）
  let s=0,n=0;const r={same:[],adj:[],diff:[],starSame:[],starAdj:[],starDiff:[]};
  qs.forEach((k,i)=>{if(only&&!only.has(i))return;const a=A.ans[i],b=B.ans[i];if(!a||!b||a.o<0||b.o<0)return;
    if(isNA(a.o,k)!==isNA(b.o,k))return; // 片方だけ「当てはまらない」答えの問題はくらべない
    const st=(a.st&&a.o<2)||(b.st&&b.o<2),w=WT(k);n+=w;
    if(a.o===b.o){s+=w;r.same.push(i);if(st)r.starSame.push(i)}
    else if(a.o===2||b.o===2){s+=w/2;r.adj.push(i);if(st)r.starAdj.push(i)}
    else{r.diff.push(i);if(st)r.starDiff.push(i)}});
  r.starN=r.starSame.length+r.starAdj.length+r.starDiff.length;
  r.pct=n?Math.round(s/n*100):0;r.n=n;return r;
}
// シンクロ率：全員の組み合わせのぴったり度（大事な問題・★は重く数える）の平均。全員で1つの数字＝勝ち負けなし
function syncStat(G){
  const ps=G.players,per={};ps.forEach(p=>per[p.id]={s:0,n:0});let s=0,n=0;
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const r=pairStat(ps[i],ps[j],G.qs);if(!r.n)continue;
    s+=r.pct;n++;[ps[i],ps[j]].forEach(p=>{per[p.id].s+=r.pct;per[p.id].n++})}
  return{pct:n?Math.round(s/n):0,per};
}
/* ===== くわしい結果（テーマ別・価値観のタイプ・話しておきたいこと・ひとこと） ===== */
// テーマ別のシンクロ率：そのテーマの問題だけで、全員の組み合わせのぴったり度を平均
function themeRows(G){
  const ps=G.players,rows=[];
  CATS.forEach((c,ci)=>{const only=new Set(G.qs.map((k,i)=>Q[k][0]===ci?i:-1).filter(i=>i>=0));if(!only.size)return;
    let s=0,n=0;for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const r=pairStat(ps[i],ps[j],G.qs,only);if(r.n){s+=r.pct;n++}}
    if(n)rows.push({ci,name:c[0],q:only.size,pct:Math.round(s/n)})});
  return rows}
function themeHTML(rows,who){
  return `<section class="card"><p class="label">テーマ別のシンクロ率</p>
    <ul class="thl">${rows.map(r=>`<li><span class="thn"><span class="tag catg c${r.ci}">${esc(r.name)}</span><small>${r.q}問</small></span><b>${r.pct}%</b><div class="bar"><i style="width:${r.pct}%"></i></div></li>`).join('')}</ul>
    <p class="hint">${who}の答えが、テーマごとにどれだけ重なったか。問題の少ないテーマは、参考ていどに見てください。</p></section>`}
// 価値観のタイプ：物差しごとに、それぞれの傾向を点で見せる（どちらが良い・悪いではない）
function axRows(G,list){return AX.map(a=>({a,xs:list.map(p=>({p,s:axScore(p,G.qs,a)})).filter(x=>x.s)})).filter(x=>x.xs.length)}
const axSide=(a,pct)=>pct>=60?a.l+'寄り':pct<=40?a.r+'寄り':'まん中';
function axHTML(G,list,nm){
  const rows=axRows(G,list);if(!rows.length)return '';
  return `<section class="card"><p class="label">${list.length>1?'価値観のタイプ':'あなたの価値観のタイプ'}</p>
    ${rows.map(({a,xs})=>`<div class="axb"><p class="axn">${esc(a.name)}</p><div class="axh"><span>${esc(a.l)}</span><span>${esc(a.r)}</span></div>
      ${xs.map(({p,s},j)=>`<div class="axr"><p class="axw"><b>${nm(p)}</b><small>${esc(axSide(a,s.pct))}</small></p><div class="axt"><i class="d${j%4}" style="left:${100-s.pct}%"></i></div></div>`).join('')}</div>`).join('')}
    <p class="hint">答えから見た傾向です。どちらが良い・悪いではありません。問題が多いほど、くわしくわかります。</p></section>`}
// 話しておきたいこと：答えがちがった問題を、大事な問題・★ゆずれないから順に5つまで
function talkItems(G){
  const ps=G.players,wt=i=>{const k=G.qs[i];return WT(k)*(ps.some(p=>{const a=p.ans[i];return a&&a.st&&a.o>=0&&a.o<2})?2:1)};
  if(ps.length===2){const r=pairStat(ps[0],ps[1],G.qs);return r.diff.slice().sort((x,y)=>wt(y)-wt(x)).slice(0,5)}
  return G.qs.map((k,i)=>{const c=[0,0];ps.forEach(p=>{const a=p.ans[i];if(a&&a.o>=0&&a.o<2)c[a.o]++});return{i,c}}).filter(x=>x.c[0]&&x.c[1])
    .sort((x,y)=>wt(y.i)-wt(x.i)||Math.abs(x.c[0]-x.c[1])-Math.abs(y.c[0]-y.c[1])).slice(0,5).map(x=>x.i)}
// 答えのうしろの★が1つだけ次の行に落ちないよう、最後の言葉と★をひとまとめにする（2026-11-21）
const ANS_SEG=window.Intl&&Intl.Segmenter?new Intl.Segmenter('ja',{granularity:'word'}):null;
function ansSt(t,st){t=String(t);if(!st)return esc(t);let h=t,tl='';
  const cm=t.lastIndexOf('、');if(cm>0&&t.length-cm-1>=2&&t.length-cm-1<=8){h=t.slice(0,cm+1);tl=t.slice(cm+1)}else if(ANS_SEG){const ws=[...ANS_SEG.segment(t)].map(x=>x.segment);tl=ws.pop()||'';while(ws.length&&tl.replace(/[、。！？]/g,'').length<3)tl=ws.pop()+tl;h=ws.join('')}else{h=t.slice(0,-3);tl=t.slice(-3)}
  return `${esc(h)}<span class="nw" data-nojw>${esc(tl)}<span class="tk-st">★</span></span>`}
function talkHTML(G,nm){
  const ps=G.players,its=talkItems(G),two=ps.length===2,me=ps.find(p=>p.id===G.me),tid=talkId(G),done=new Set(talkedOf(tid));
  if(its.length<2)return '';
  if(!its.length)return `<section class="card" id="talk"><p class="label">${two?'2人で':'みんなで'}話しておきたいこと</p><p class="hint">答えが反対になった問題はありませんでした。</p></section>`;
  const row=(i,n)=>{const k=G.qs[i],key=QKEY[k].slice(0,5),ok=done.has(key);
    const ws=ansGroups(G,i).map(({v,who})=>`<span class="tkr"><span class="tkw">${G.anon?`<span class="nmc pn">${who.length}人</span>`:who.map(p=>nmChip(G,p,p===me?'あなた':p.name)).join('')}</span><span class="tka"><span>${ansSt(ans(v,k),who.some(p=>p.ans[i].st&&v<2))}</span></span></span>`).join('');
    const ay=ayOf(k,two),hint='';   // だれから聞くかの1文は出さない（答えは名前の札で見え、聞き方はコツ・主役のカードにある。鑑定者本人 2026-11-20「はい」）
    return `<li class="${ok?'ok':''}"><b>${esc(Q[k][1])}</b><span class="tkg">${ws}</span>${hint?`<span class="tph">${hint}</span>`:''}${ay?`<span class="ayu"><b>${two?'歩み寄りの案':'みんなの歩み寄りの案'}</b>${esc(ay)}</span>`:''}<button class="talked" type="button" data-k="${key}" aria-pressed="${ok}">${ok?'✓ 話した':'話した'}</button></li>`};
  const rest=its.slice(1),top=rest.slice(0,2),more=rest.slice(2),ul=(xs,o)=>`<ul class="slist tk${two?'':' tkm'}">${xs.map((x,j)=>row(x,j+o)).join('')}</ul>`;
  return `<section class="card pt-a" id="talk"><p class="pt-h"><em>歩み寄り</em>${two?'ほかに話しておきたいこと':'みんなで話しておきたいこと'}</p>
    <p class="hint">${(()=>{const dn=two?pairStat(ps[0],ps[1],G.qs).diff.length:0;return two?(dn>its.length?`ちがった${dn}問のうち、大事な${its.length}問をのせました（いちばん上の1問もふくみます）。`:'')+'気になる問題から、1問ずつ話してみてください。':'気になる問題から話してみてください。'})()}</p>${its.slice(1).some(i=>ps.some(p=>p.ans[i]&&p.ans[i].st&&p.ans[i].o>=0&&p.ans[i].o<2))?'<p class="stl"><i>★</i>＝ゆずれない（答える前に付けた印）</p>':''}
    ${ul(top,0)}${more.length?`<details class="sfold"><summary>ほかに${more.length}問を見る</summary>${ul(more,2)}</details>`:''}
    <p class="tk-cnt" id="tkcnt">話した問題　${its.filter(i=>done.has(QKEY[G.qs[i]].slice(0,5))).length}／${its.length}</p>
    <p class="hint tk-note">話したら「話した」を押しておくと、このスマホに残ります。</p></section>`}
// ひとこと診断：テーマ別・価値観のタイプ・★ゆずれないから、数行の文を作る
function hitokoto(G,rows){
  const ps=G.players,two=ps.length===2,who=two?'2人':'みんな',all=two?'2人とも':'全員',out=[];
  const srt=rows.slice().sort((a,b)=>b.pct-a.pct),best=srt.filter(r=>r.pct>=70).slice(0,2),low=srt.filter(r=>r.pct<50&&!best.includes(r)).slice(-1);
  if(best.length){const b=best.map(r=>'「'+r.name+'」').join('と');out.push(two?`${b}の感覚が近い2人です。`:`みんな、${b}の感覚が近いようです。`)}
  else if(srt.length)out.push(srt[0].pct>0?`いちばん重なったのは「${srt[0].name}」（${srt[0].pct}%）。`:`どのテーマも、答えが分かれました。`);
  const ax=axRows(G,ps).filter(x=>x.xs.length===ps.length);
  const same=ax.filter(x=>x.xs.every(y=>y.s.pct>=60)).map(x=>x.a.l).concat(ax.filter(x=>x.xs.every(y=>y.s.pct<=40)).map(x=>x.a.r));
  if(same.length)out.push(`${all}「${same.slice(0,2).join('」「')}」の傾向です。`);
  if(two){const opp=ax.filter(x=>{const v=x.xs.map(y=>y.s.pct);return Math.max(...v)>=60&&Math.min(...v)<=40});
    if(opp.length)out.push(`「${opp[0].a.name}」はタイプがちがうので、おたがいのやり方を知っておくと安心です。`)}
  if(low.length)out.push(`「${low[0].name}」は考え方がちがうところ。話してみると、新しい発見がありそうです。`);
  if(two){const r=pairStat(ps[0],ps[1],G.qs);if(r.starDiff.length)out.push(`★ゆずれないところで、ちがいが${r.starDiff.length}問。先にゆっくり話しておくと安心です。`)}
  if(!out.length)out.push('答えの重なりを、下でくわしく見てみましょう。');
  return out}
/* ===== 2人の結果（鑑定者本人 2026-11-17「この形でお願いします」。見本 https://claude.ai/artifact/SExPZc7b5EReqEh8AptCih）
 * シンクロ率 → 2人だけの共通点 → 話しておきたいこと＋歩み寄りの案 → 残りはたたむ。計算は今のまま ===== */
/* ===== 2人・3人以上の結果（鑑定者本人 2026-11-17「この形でお願いします」。見本 https://claude.ai/artifact/Gcvek9hNsyE1gucoH1Tiz3）
 * 共通点はいつも出す（20人以上の決まりはやめた）・低いシンクロ率も前向きな言い方・3人以上も2人と同じ並び。計算は今のまま ===== */
const KYO_MIN=3, KYO_FEW=20, KYO_MAX=0.5;
const HIGH_SYNC=80; // シンクロ率がこれ以上なら「HIGH SYNC」（鑑定者本人 2026-11-17「80%いけばいい」）
// 数字を0から数え上げる（動きを減らす設定のスマホでは動かさない）
function countUp(){const el=document.querySelector('.score .num');if(!el)return;const t=+el.dataset.v;if(!t||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const st=performance.now(),D=900;const f=n=>{const k=Math.min(1,(n-st)/D),e=1-Math.pow(1-k,3);el.firstChild.nodeValue=String(Math.round(t*e));if(k<1)requestAnimationFrame(f)};el.firstChild.nodeValue='0';requestAnimationFrame(f)}
// 共通点：全員が同じ答え（AかB）を選んだ問題。★＝全員が★／大事＝大事な問題
function kyoSame(G){const ps=G.players;
  return G.qs.map((k,i)=>{const a=ps[0].ans[i];return{k,i,o:a?a.o:-1}}).filter(x=>(x.o===0||x.o===1)&&ps.every(p=>p.ans[x.i]&&p.ans[x.i].o===x.o))
    .map(x=>({...x,st:ps.every(p=>p.ans[x.i].st),big:WB.has(x.k)}))}
// 選ぶ順番：少数派の答え（3人以上が答えた問題で半分より少ない）→ ★ → 大事な問題 → ほかの同じ答え。2つまで
function kyoPick(G,rare){const same=kyoSame(G),used=new Set(),out=[];
  const add=(x,why)=>{if(out.length<2&&!used.has(x.i)){used.add(x.i);out.push({...x,why})}};
  (rare||[]).forEach(x=>add(x,'r'));same.filter(x=>x.st).forEach(x=>add(x,'s'));same.filter(x=>x.big).forEach(x=>add(x,'d'));same.forEach(x=>add(x,''));return out}
function kyoHTML(G,list){const two=G.players.length===2,all=two?'2人とも':'全員';
  const why=x=>x.why==='r'?'少数派の答え':x.why==='s'?(two?'2人とも★ゆずれない':'全員★ゆずれない'):x.why==='d'?'大事な問題で一致':'';
  const item=x=>`<div class="kq"><div class="kqt"><b>${esc(Q[x.k][1])}</b>${why(x)?`<span class="why w-${x.why}">${why(x)}</span>`:''}</div><p class="a"><span class="ck" aria-hidden="true">✓</span><span>${all}「${esc(ans(x.o,x.k))}」</span></p>${x.share!=null?`<div class="pc"><span class="t"><i style="width:${Math.max(3,Math.round(x.share*100))}%"></i></span><em>みんなの${Math.round(x.share*100)}%</em></div>${x.tot<KYO_FEW?`<p class="kfew">まだ${x.tot}人の答えから</p>`:''}`:''}</div>`;
  return `<p class="pt-h"><em>共通点</em>${two?'2人の共通点':'みんなの共通点'}</p><p class="hint">${two?'2人が同じ答えを選んだ問題です。':'全員が同じ答えを選んだ問題です。'}</p>${list.map(item).join('')}`}
function kyoSlot(G){const list=kyoPick(G);return `<section class="card kyo" id="kyo"${list.length?'':' hidden'}>${list.length?kyoHTML(G,list):''}</section>`}
async function kyoRun(G){
  const same=kyoSame(G);if(!same.length)return;const db=await getDb();if(!db||!db.votes)return;
  let got;try{got=await db.votes(same.map(x=>'q'+QKEY[x.k]))}catch(e){return}
  const rare=same.map(x=>{const c=got['q'+QKEY[x.k]]||{},cnt=[c.a||0,c.b||0,c.c||0],tot=cnt[0]+cnt[1]+cnt[2];return{...x,tot,share:tot?cnt[x.o]/tot:1}})
    .filter(r=>r.tot>=KYO_MIN&&r.share<KYO_MAX).sort((a,b)=>a.share-b.share);
  const el=$('kyo');if(!el||!rare.length)return;
  el.innerHTML=kyoHTML(G,kyoPick(G,rare));el.hidden=false;if(window.__jw)window.__jw(el)}
/* ===== 結果を「次の一歩」につなげる（鑑定者本人 2026-11-19「診断しただけじゃ意味がない」→A〜E「全部お願いします」・見本 https://claude.ai/artifact/SrJKUHfTUHRGdEHYTGKhnN） ===== */
// D：「話した」の印（このスマホにだけ残す。同じ問題・同じ顔ぶれの結果ごと）
const talkId=G=>G.qs.map(k=>QKEY[k].slice(0,5)).join('.')+'|'+G.players.map(p=>String(p.name||'')).sort().join('・');
function talkedOf(id){const m=store('kv_talked')||{};return Array.isArray(m[id])?m[id]:[]}
function talkedSet(id,key,on){const m=store('kv_talked')||{};let a=Array.isArray(m[id])?m[id]:[];a=a.filter(x=>x!==key);if(on)a.push(key);m[id]=a;
  const ks=Object.keys(m);if(ks.length>30)delete m[ks[0]];store('kv_talked',m)}
function bindTalked(G){const id=talkId(G),bs=[...app.querySelectorAll('.talked')],c=$('tkcnt');
  bs.forEach(b=>b.onclick=()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);b.textContent=b.classList.contains('big')?(on?'✓ 話しました':'話したら、ここを押す'):(on?'✓ 話した':'話した');
    const li=b.closest('li');if(li)li.classList.toggle('ok',on);talkedSet(id,b.dataset.k,on);if(c)c.textContent='話した問題　'+bs.filter(x=>x.getAttribute('aria-pressed')==='true').length+'／'+bs.length})}
// E：だれの話から聞くとよいか（3人以上・名前を見せる部屋だけ）
function talkPairHint(G,i,me){if(G.anon)return'';const ps=G.players,side=v=>ps.filter(p=>p.ans[i]&&p.ans[i].o===v);
  // 名前は色の札・2文までに（鑑定者本人 2026-11-20「1、2、3を修正」）
  const a=side(0),b=side(1),c=side(2),ch=p=>nmChip(G,p,p===me?'あなた':p.name),chs=xs=>xs.map(ch).join('');
  if(!a.length||!b.length)return'';
  if(a.length===1&&b.length>=2||b.length===1&&a.length>=2){const one=a.length===1?a[0]:b[0];return `<span class="tph-l"><span class="nw">${ch(one)}の考えを、</span>先に聞いてみてください。</span>`}
  let best=null;a.forEach(x=>b.forEach(y=>{const r=pairStat(x,y,G.qs);if(!best||r.pct<best.pct)best={x,y,pct:r.pct}}));
  let t=best?`<span class="tph-l">まず<span class="nw">${ch(best.x)}${ch(best.y)}に、</span>「どうしてそう思う？」と聞いてみてください。</span>`:'';
  if(c.length)t+=`<span class="tph-l"><span class="nw">${chs(c)}は</span>まん中の答え。間に入ると決まりやすい問題です。</span>`;
  return t}
// 左右に並べた答えが枠に入りきらないときは、縦に並べる（「考えがまとまってか…」で切れていた）
function vsFit(){document.querySelectorAll('.vs2').forEach(v=>{if([...v.querySelectorAll('.va,.vw')].some(e=>e.scrollWidth>e.clientWidth+1)||v.scrollWidth>v.clientWidth+1){v.className='vsn';const m=v.querySelector('.vmid');if(m)m.remove()}})}
// B：これからの3つのステップ（まず話すこと→今週ためすこと→大切にしたいこと）
function stepsHTML(G){const ps=G.players,two=ps.length===2,me=ps.find(p=>p.id===G.me),its=talkItems(G);
  if(!its.length)return'';
  const i=its[0],k=G.qs[i],st=ps.some(p=>p.ans[i]&&p.ans[i].st&&p.ans[i].o<2),gs=ansGroups(G,i);
  const side=g=>{const c=G.anon?'pn':g.who.length===1?pcls(G,g.who[0]):'pm';
    return `<div class="vside ${c}"><span class="vw">${G.anon?g.who.length+'人':g.who.map((p,j,l)=>`<span class="nw" data-nojw>${p===me?'あなた':esc(p.name)}${j<l.length-1?'・':''}</span>`).join('')}</span><span class="va">${esc(ans(g.v,k))}</span></div>`};
  const vlong=gs.some(g=>ans(g.v,k).replace(/[、。（）「」\s]/g,'').length>10);
  const vs=gs.length===2&&!vlong?`<div class="vs2">${side(gs[0])}<span class="vmid" aria-hidden="true">⇔</span>${side(gs[1])}</div>`:`<div class="vsn">${gs.map(side).join('')}</div>`;
  const ay=ayOf(k,two),key=QKEY[k].slice(0,5),ok=talkedOf(talkId(G)).includes(key);
  return `<section class="hero-pt" id="steps"><p class="hp-ttl">${two?'答えが分かれた1問から話そう':'答えが分かれた1問から、みんなで話そう'}<small>${st?'★ゆずれないがついた問題で、答えが分かれました':WB.has(k)?'大事な問題で、'+(two?'2人':'みんな')+'の答えが分かれました':(two?'2人':'みんな')+'の答えが分かれた問題です'}</small></p>
    <div class="hq"><div class="hqh"><span class="qmark" aria-hidden="true">Q</span><p class="hqt">${esc(Q[k][1])}</p></div>${vs}</div>
    <p class="hp-arrow">↓ 歩み寄るなら</p>
    <div class="hp-ayu"><span class="rb">歩み寄りの案</span><p>${ay?esc(ay):'「どうしてそう思うの？」を聞き合って、'+(two?'2人':'みんな')+'のやり方を1つだけ決めてみる。'}</p></div>
    <div class="howto"><b>1</b><span>その答えになった、きっかけを聞いてみる</span><b>2</b><span>この案を1週間ためして、また話す</span></div>
    <button class="talked big" type="button" data-k="${key}" aria-pressed="${ok}">${ok?'✓ 話しました':'話したら、ここを押す'}</button></section>`}
// C：話し合うときのコツ（切り出しの例は、いちばん上の分かれた問題の答えから作る）
function tipsHTML(G){const ps=G.players,me=ps.find(p=>p.id===G.me),its=talkItems(G);let open='この答え、どうしてそう思ったの？';
  if(its.length){const i=its[0],k=G.qs[i],my=me&&me.ans[i]&&me.ans[i].o<2&&me.ans[i].o>=0?me.ans[i].o:0,ot=1-my;
    const qa=t=>{const x=esc(t);return x.length<=12?`<em class="nw" data-nojw>「${x}」</em>`:`<em>「${x}」</em>`};
    open=`わたしは${qa(ans(my,k))}にしたけど、${qa(ans(ot,k))}にしたのは、どうして？`}
  let tz='切り出しの例と、4つのコツ';if(its.length){const k=G.qs[its[0]],my=me&&me.ans[its[0]]&&me.ans[its[0]].o>=0&&me.ans[its[0]].o<2?me.ans[its[0]].o:0;tz=`<span class="sml">切り出しの例：</span><span class="sml"><em>わたしは「${esc(ans(my,k))}」にしたけど…</em></span>`}
  return foldBox('話し合うときのコツ',tz,`<div class="tips"><div class="bub"><div><small>切り出すとき（例）</small><p>${open}</p></div></div><div class="tp">
    <div><b>はじめに</b><span>同じだったところを1つ話す。</span></div>
    <div><b>1回に1つ</b><span>分かれた問題は、1つずつ話す。</span></div>
    <div><b>聞きかた</b><span>正しさより先に、「どうしてそう思うの？」と聞く。</span></div>
    <div><b>決めたら</b><span>まず1か月ためして、合わなければ変える。</span></div></div>
    <div class="bub"><div><small>話がかたくなったとき</small><p>どっちがいい・悪いじゃなくて、${ps.length===2?'2人':'みんな'}のやり方を決めたいな。</p></div></div></div>`)}
// A：2人の距離の縮め方（4つのものさしで、2人の組み合わせに合わせた一言）
const AXTIP={
  kicchiri:{d:'共有の場所だけ「ここまで片づいていればOK」のラインを2人で1つ決めて、自分の場所はそれぞれの自由にする。',
    l:'2人ともきっちり派。暮らしは整いやすい一方、決めごとが増えて窮屈になりがち。ときどき「今日はゆるくていい日」を作る。',
    r:'2人ともおおらか派。気楽に過ごせる一方、気づけば散らかりがち。週に1回だけ、一緒に片づける時間を決めておく。',
    m:'どちらかがまん中に近いので、合わせやすい組み合わせです。共有の場所のルールを1つだけ決めておけば十分です。'},
  keikaku:{d:'旅行や記念日など大きな予定は計画派が先に決めて、当日の過ごし方はその場で決める派にまかせる。役割を分けると、どちらも楽しめます。',
    l:'2人とも計画派。予定どおりに進む安心感がある一方、予定がくずれると2人ともあせりがち。予定の中に、何もしない時間を1つ入れておく。',
    r:'2人ともその場で決める派。思いつきを楽しめる一方、大事な予定が後回しになりがち。月に1つだけ、先に決める予定を作る。',
    m:'どちらかがまん中に近いので、合わせやすい組み合わせです。大事な予定だけ先に決めておけば十分です。'},
  futari:{d:'一緒に過ごす日と、それぞれの日を先に決めておく（例：週末のどちらかは自由な日）。ひとりの時間は「はなれたい」ではなく「元気をためる時間」だと、言葉で伝え合う。',
    l:'2人とも一緒派。近くにいる安心感が強い一方、ほかの人とのつながりが細くなりがち。おたがいの友だちとの時間も応援し合う。',
    r:'2人ともひとりの時間も派。おたがいの時間を大事にできる一方、気づけば会う時間が減りがち。会う日だけは先に決めておく。',
    m:'どちらかがまん中に近いので、合わせやすい組み合わせです。会うペースを、ときどき言葉で確かめ合えば十分です。'},
  okane:{d:'毎月「ためる分」を先に決めて、残りは楽しむお金にする。楽しむお金の使い方には、おたがい口を出さない。',
    l:'2人ともコツコツ派。お金の安心感は強い一方、楽しみをがまんしすぎがち。年に1回は「これに使う」と決めた楽しみを作っておく。',
    r:'2人とも楽しみ優先派。毎日が楽しい一方、急な出費に弱くなりがち。自動でためるしくみを1つだけ作っておく。',
    m:'どちらかがまん中に近いので、合わせやすい組み合わせです。大きな買い物のときだけ、先に話しておけば十分です。'}};
const axSideK=pct=>pct>=60?'l':pct<=40?'r':'m';
// 2人の価値観のかたち：シンクロ率のすぐ下に、4つのものさしで2人の位置を並べる（たたまない。鑑定者本人 2026-11-20）
// コツの文を、ようす（太字）・気をつけたいこと・コツ（黄色の枠）に分けて見せる（鑑定者本人 2026-11-20「全部同じカラーで読みづらい」）
function tipX(t,kind){const ss=String(t).match(/[^。]+。?/g)||[t];let h='',n='',k;
  if(kind==='d')k=ss.join('');else if(kind==='m'){n=ss[0];k=ss.slice(1).join('')}else{h=ss[0];n=ss[1]||'';k=ss.slice(2).join('')}
  if(!k){k=n;n=''}
  return `<div class="tipx">${h?`<p class="tx-h">${h}</p>`:''}${n?`<p class="tx-n">${n}</p>`:''}<p class="tx-k"><b>コツ</b><span>${k}</span></p></div>`}
function distHTML(G){const ps=G.players;if(ps.length!==2||G.anon)return'';const me=ps.find(p=>p.id===G.me);
  const nmS=p=>p===me?'あなた':esc(p.name);const P0=me||ps[0],P1=ps.find(p=>p!==P0);
  const rows=AX.map(a=>{const sa=axScore(ps[0],G.qs,a),sb=axScore(ps[1],G.qs,a);if(!sa||!sb||!AXTIP[a.key])return null;
    const ka=axSideK(sa.pct),kb=axSideK(sb.pct),kind=ka==='m'||kb==='m'?'m':ka===kb?ka:'d',t=AXTIP[a.key][kind];
    const lab=kind==='d'?['d','ちがう向き']:kind==='m'?['m','合わせやすい']:['s','同じ向き'];
    const near=Math.abs(sa.pct-sb.pct)<6,pin=(p,s,dx)=>`<i class="nxpin ${pcls(G,p)}" style="left:calc(${100-s.pct}% ${near?(dx<0?'- 7px':'+ 7px'):'+ 0px'})" title="${nmS(p)}"></i>`;
    // 1問だけで決めたものさしは「○○派寄り」（ひとりの結果と同じ。2026-11-21）
    const side=(k,n)=>(k==='l'?a.l:k==='r'?a.r:'まん中')+(k!=='m'&&n<2?'寄り':''),sP=p=>axSideK(p===ps[0]?sa.pct:sb.pct),sN=p=>(p===ps[0]?sa:sb).n;
    const who=kind==='s'||(ka===kb&&ka!=='m')?`<p class="dwho same"><b>2人とも</b><span class="nw">${esc(side(ka,Math.min(sa.n,sb.n)))}</span></p>`
      :`<p class="dwho">${[P0,P1].map(p=>`<span class="dw">${nmChip(G,p,p===me?'あなた':p.name)}<span class="nw">${esc(side(sP(p),sN(p)))}</span></span>`).join('')}</p>`;
    return {d:kind==='d',n:a.name,t,kind,h:`<div class="dax"><div class="daxh"><b>${esc(a.name)}</b><span class="kind ${lab[0]}">${lab[1]}</span></div>${who}
      <div class="dbar2">${pin(ps[0],sa,-1)}${pin(ps[1],sb,1)}</div><div class="dends"><span>${esc(a.l)}</span><span>${esc(a.r)}</span></div>${kind==='d'?tipX(t,'d'):''}</div>`}}).filter(Boolean);
  if(!rows.length)return'';
  const dd=rows.filter(x=>x.d),ot=rows.filter(x=>!x.d);
  const sum=dd.length?`${ot.length?`${rows.length}つのうち、${ot.length}つは同じ向きか合わせやすく、${dd.length}つはちがう向きです。`:`${rows.length}つとも、ちがう向きです。`}`:`${rows.length}つのものさしで、ちがう向きはありませんでした。`;
  return `<section class="card pshape"><p class="label">2人の価値観のかたち</p><p class="hint">${sum}</p>
    <div class="dist"><div class="dlg">${[P0,P1].map(p=>`<span><i class="${pcls(G,p)}"></i>${nmS(p)}</span>`).join('')}</div>${dd.map(x=>x.h).join('')}${ot.map(x=>x.h).join('')}
    ${ot.length?`<details class="sfold"><summary>ほかのものさしのコツ（${ot.length}つ）</summary><div class="tipl">${ot.map(x=>`<div class="tipc"><b class="tipn">${esc(x.n)}</b>${tipX(x.t,x.kind)}</div>`).join('')}</div></details>`:''}</div></section>`}
// E：このメンバーのかたち（3人以上）・つなぎ役
const GTIP={
  kicchiri:{l:'きっちり派が多いメンバーです。みんなで使う場所は、きっちり派の基準に合わせると気持ちよく過ごせます。',r:'おおらか派が多いメンバーです。片づけや決めごとは、最後に1人だけ確かめ役を決めておくと安心です。',s:'半々に分かれています。みんなで使う場所のルールを、1つだけ決めておくとうまくいきます。'},
  keikaku:{l:'計画派が多いメンバーです。計画派が骨組みを作り、当日のお楽しみを1つ、その場で決める人にまかせると、全員が楽しめます。',r:'その場で決める派が多いメンバーです。集まる日と場所だけは、先に1人が決めておくと集まりやすくなります。',s:'半々に分かれています。日にちと場所は先に決めて、そこで何をするかは当日に決めると、どちらも楽しめます。'},
  futari:{l:'一緒派が多いメンバーです。集まる回数が多くなりやすいので、来られない人がいても気にしない空気を作っておくと長続きします。',r:'ひとりの時間も派が多いメンバーです。気づけば集まらなくなりがちなので、次に集まる日をその場で決めておくと安心です。',s:'半々に分かれています。参加は自由、でも次に集まる日は決めておく、くらいがちょうどいいメンバーです。'},
  okane:{l:'コツコツ派が多いメンバーです。お金の面では安心なぶん、ときには「今日はちょっとぜいたく」の日を作ると、もっと楽しめます。',r:'楽しみ優先派が多いメンバーです。盛り上がって使いすぎないよう、行く前に「1人いくらまで」を決めておくと安心です。',s:'半々に分かれています。みんなで使うお金は、先に「1人いくらまで」を決めておくと気持ちよく遊べます。'}};
function groupShapeHTML(G){const ps=G.players;if(ps.length<3||G.anon)return'';
  const rows=AX.map(a=>{const c={l:0,r:0,m:0};ps.forEach(p=>{const s=axScore(p,G.qs,a);if(s)c[axSideK(s.pct)]++});if(!GTIP[a.key]||c.l+c.r===0)return'';
    const kind=c.l>c.r?'l':c.r>c.l?'r':'s',lab=c.l&&c.r?`${Math.max(c.l,c.r)}対${Math.min(c.l,c.r)}`:'同じ向き';
    return `<div class="dax"><div class="daxh"><b>${esc(a.name.replace(/^2人の/,''))}</b><span class="kind ${kind==='s'?'m':c.l&&c.r?'d':'s'}">${kind==='s'?'半々':lab}</span></div>
      <div class="gcnt"><span><b>${esc(a.l)}</b>${c.l}人</span>${c.m?`<span><b>まん中</b>${c.m}人</span>`:''}<span><b>${esc(a.r)}</b>${c.r}人</span></div><p class="dtip">${GTIP[a.key][kind]}</p></div>`}).join('');
  return rows?foldBox('このメンバーのかたち','4つのものさしの人数とコツ',`<div class="dist"><p class="hint">4つのものさしで、メンバーがどちらに多いかと、みんなで過ごすときのコツです。</p>${rows}</div>`):''}
function bridgeHTML(G){const ps=G.players;if(ps.length<3||G.anon)return'';const me=ps.find(p=>p.id===G.me);
  const c=ps.map(p=>({p,n:G.qs.filter((k,i)=>p.ans[i]&&isFlex(p.ans[i].o,k)).length})).sort((a,b)=>b.n-a.n);
  if(!c[0]||c[0].n<2||(c[1]&&c[1].n===c[0].n))return'';const p=c[0].p,nm=p===me?'あなた':esc(p.name)+'さん';
  return `<section class="card bridge"><p class="label">このメンバーのつなぎ役</p><div class="brg"><p class="brg-h"><img class="face" src="img/${p===me?'ai':'yuu'}.webp" width="44" height="44" alt="" aria-hidden="true"><b>${nm}</b></p><p class="hint">「どっちでも合わせられる」がいちばん多く、みんなの答えの間にいることが多い人です。意見が分かれたら、${p===me?'あなたが話を進めてみてください':nm+'に話を進めてもらいましょう'}。</p></div></section>`}
// D：もう一度の答え合わせ（同じ問題・同じ2人の前の結果と比べる。このスマホにだけ残す）
function againHTML(G,P2){const ps=G.players,me=ps.find(p=>p.id===G.me);if(ps.length!==2||!me)return'';
  const other=ps.find(p=>p!==me),id=talkId(G),h=G.qs.map((k,i)=>ps.map(p=>ansCode(p.ans[i])).join('')).join(''),dk=P2.diff.map(i=>QKEY[G.qs[i]].slice(0,5));
  let hist=(store('kv_again')||[]).filter(x=>x&&x.id);const prev=hist.filter(x=>x.id===id&&x.h!==h).sort((a,b)=>b.at-a.at)[0];
  if(!hist.some(x=>x.id===id&&x.h===h)){hist.push({id,h,pct:P2.pct,dk,at:Date.now()});hist=hist.slice(-30);store('kv_again',hist)}
  let cmp='';if(prev){const up=P2.pct-prev.pct,closer=(prev.dk||[]).filter(x=>!dk.includes(x)),nm=x=>{const k=G.qs.find(q=>QKEY[q].slice(0,5)===x);return k!=null?Q[k][1]:''};
    const d=new Date(prev.at);cmp=`<div class="cmp"><div><small>前回（${d.getMonth()+1}月${d.getDate()}日）</small><b>${prev.pct}%</b></div><div class="up${up<0?' dn':''}">${up>0?'＋'+up:up<0?'−'+(-up):'±0'}</div><div><small>今回</small><b>${P2.pct}%</b></div></div>
      ${closer.length?`<p class="hint">近づいた問題（${closer.length}問）：${closer.map(x=>esc(nm(x))).filter(Boolean).slice(0,5).join('・')}${closer.length>5?' ほか':''}</p>`:''}`}
  const inner=`${cmp}<p class="hint">${prev?'同じ':'1か月くらいたったら、同じ'}${G.qs.length}問にもう一度答えて、${esc(other.name)}さんに答え合わせのリンクを送ってください。話し合ったあと、2人がどれだけ近づいたかがわかります。この結果は、このスマホに残ります。</p>
    <button class="btn ghost" id="reans" type="button">同じ${G.qs.length}問に、もう一度答える</button>`;
  return prev?`<section class="card again"><p class="label">前回の答え合わせと、くらべると</p>${inner}</section>`:foldBox('1か月後に、もう一度答え合わせ','話し合ったあと、近づいたかがわかります',`<div class="again">${inner}</div>`)}
function bindAgain(G){const b=$('reans');if(!b)return;const me=G.players.find(p=>p.id===G.me);
  b.onclick=()=>{Object.assign(L,{counts:undefined,mode:'solo',qs:G.qs.slice(),players:[{id:'me',name:(me&&me.name)||store('kv_name')||'あなた',ans:{}}],p:0,i:0});localAsk()}}
// シンクロ率のひとこと（低くても前向きに読める言い方。鑑定者本人 2026-11-17）
function syncMsg(pct,two){const w=two?'2人':'メンバー';
  if(pct>=HIGH_SYNC)return{msg:two?'とても相性のいい2人です':'感覚がとても近いメンバーです',sub:''};
  if(pct>=60)return{msg:'いい感じにわかり合えています',sub:'重なるところが多いから、ちがうところも話しやすい関係です。'};
  if(pct>=40)return{msg:'ほどよく重なって、ほどよくちがう'+w,sub:'同じところは安心に、ちがうところは新しい発見に。'};
  return{msg:'発見の多い'+w,sub:'答えが分かれたところほど、話すとおたがいのことがよくわかります。'}}
// たたむ欄：左に色のマーク、題名の下に中身の一部（鑑定者本人 2026-11-19「表のバーが簡素すぎて開いてもらえない」）
// マークは線の絵（前の1文字の漢字〈芯・柔など〉は意味がわかりにくい＝鑑定者本人 2026-11-23）
const FIS={talk:'<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3.5V16h0a2 2 0 0 1-2-2z"/>',
 near:'<path d="M3 12h6M6.5 9 9 12l-2.5 3M21 12h-6M17.5 9 15 12l2.5 3"/>',
 bars:'<path d="M5 20V12M10 20V6M15 20v-9M20 20V9M3 20.5h18"/>',
 shape:'<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',
 star:'<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/>',
 again:'<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
 ask:'<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><circle cx="12" cy="16.8" r=".6"/>',
 group:'<circle cx="8" cy="8.5" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M2.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5M14 14.3c2.6-.6 5.2.8 6 4.2"/>',
 think:'<path d="M7 3.5h10M7 20.5h10M8 3.5c0 4 8 5 8 8.5s-8 4.5-8 8.5M16 3.5c0 4-8 5-8 8.5s8 4.5 8 8.5"/>',
 pin:'<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
 flex:'<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>'};
const FIC={'話し合うときのコツ':['talk','a'],'2人の距離の縮め方':['near','b'],'テーマ別のシンクロ率':['bars','c'],'価値観のタイプ':['shape','a'],'★ ゆずれないところ':['star','d'],'★ ゆずれないこと':['star','d'],'みんなの答えを1問ずつ':['list','c'],'1か月後に、もう一度答え合わせ':['again','b'],'まだ決められなかった問題':['ask','c'],'このメンバーのかたち':['group','b'],'いちばん悩んだ問題':['think','d'],'4つのものさし':['shape','a'],'あなたのこだわり':['pin','b'],'合わせられること・悩んだ問題':['flex','a'],'合わせられること':['flex','a'],'まん中の答え':['flex','a'],'まん中の答え・悩んだ問題':['flex','a'],'2人の価値観のかたち':['shape','a']};
const ficSvg=k=>`<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${FIS[k]}</svg>`;
// ★を押した数（人によって、ゆずれないことの多さがちがう。シンクロ率には入れない）
function starCnt(G){const ps=G.players,me=ps.find(p=>p.id===G.me),list=(G.anon&&me)?[me]:ps;
  const n=p=>G.qs.filter((k,i)=>{const a=p.ans[i];return a&&a.st&&a.o>=0&&a.o<2}).length;
  return `<p class="stcnt"><b>★を押した数</b>${list.map(p=>`<span>${nmChip(G,p,p===me?'あなた':p.name)}${n(p)}問</span>`).join('')}</p><p class="hint stnote">★はシンクロ率の点数には入れていません。ゆずれないことの多さは、人それぞれです。</p>`}
const foldBox=(t,sm,inner)=>{const ic=FIC[t]||['list','c'];return `<details class="fold"><summary><span class="fic f${ic[1]}" aria-hidden="true">${ficSvg(ic[0])}</span><span class="ft">${t}${sm?`<small>${sm}</small>`:''}</span></summary><div class="fb">${inner}</div></details>`};
// 人の色：あなた＝p0（みどり）・相手は順に p1（ピンク）…。あなたがわからないときは1人目が p0
function pcls(G,p){const ps=G.players,me=ps.find(x=>x.id===G.me)||ps[0];if(p===me)return 'p0';const o=ps.filter(x=>x!==me);return 'p'+((o.indexOf(p)+1)%6)}
const nmChip=(G,p,txt)=>`<span class="nmc ${pcls(G,p)}">${esc(txt)}</span>`;
// 自分のいる答えを先に（自分がいなければ答えの順）
function ansGroups(G,i){const ps=G.players,me=ps.find(p=>p.id===G.me);
  const gs=[0,1,2].map(v=>({v,who:ps.filter(p=>p.ans[i]&&p.ans[i].o===v)})).filter(g=>g.who.length);
  return gs.sort((a,b)=>(me&&b.who.includes(me)?1:0)-(me&&a.who.includes(me)?1:0))}
function twoFolds(G,trows,nm,r){
  const [A,B]=G.players,me=G.players.find(p=>p.id===G.me);let out='';
  const keep=trows.filter(x=>x.q>=2),drop=trows.filter(x=>x.q<2);
  if(trows.length){const few=drop.length?`<p class="few">${drop.map(x=>'「'+esc(x.name)+'」').join('')}は1問だけだったので出していません。${G.qs.length<30?'しっかり版（30問）なら、テーマごとにくわしくわかります。':''}</p>`:'';
    const ks=keep.slice().sort((a,b)=>b.pct-a.pct),tz=ks.length&&ks[0].pct<=0?`<span class="sml">どのテーマも、答えが分かれました</span>`:ks.length?`<span class="sml">いちばん重なった：<em class="nw">${esc(ks[0].name)}（${ks[0].pct}%）</em></span>${ks.length>1&&ks[ks.length-1].pct<ks[0].pct?`<span class="sml">分かれた：<em class="nw">${esc(ks[ks.length-1].name)}（${ks[ks.length-1].pct}%）</em></span>`:''}`:'';
    out+=foldBox('テーマ別のシンクロ率',tz,(keep.length?themeHTML(keep,'2人'):'')+few)}
  if(G.anon){const ax=axHTML(G,me?[me]:G.players,nm);if(ax)out+=foldBox('価値観のタイプ',me?'あなたの位置':'2人の位置',ax)}
  if(r.starN){const row=(i,cls)=>{const k=G.qs[i],aa=A.ans[i],bb=B.ans[i];
      const who=(P,x)=>(G.anon&&me&&P!==me)?'':`<span class="tkr"><span class="tkw">${nmChip(G,P,P===me?'あなた':P.name)}</span><span class="tka"><span>${ansSt(ans(x.o,k),x.st)}</span></span></span>`;
      return `<li class="${cls}"><b>${esc(Q[k][1])}</b><span class="tkg">${who(A,aa)}${who(B,bb)}</span></li>`};
    const many=r.starDiff.length>=2&&r.starDiff.length>=r.starSame.length+r.starAdj.length;
    const verdict=!r.starDiff.length?`<p class="good">大事なところは、ちがいがありません</p>`:many?`<p class="warn">大事なところで、考え方がちがうことが多めです。この${r.starDiff.length}問は、先にゆっくり話しておくと安心です</p>`:`<p class="warn">大事なところで、ちがいが${r.starDiff.length}問あります。ここは先に話しておくと安心です</p>`;
    out+=foldBox('★ ゆずれないところ',`<span class="ftc"><i class="c-s">同じ ${r.starSame.length}</i><i class="c-m">近い ${r.starAdj.length}</i><i class="c-d">ちがう ${r.starDiff.length}</i></span>${r.starDiff.length?'<span class="ftl">ちがう問題：<em>'+esc(Q[G.qs[r.starDiff[0]]][1])+'</em></span>':''}`,
      `<div class="starbox">${starCnt(G)}${verdict}<ul class="slist">${r.starDiff.map(i=>row(i,'d')).join('')}${r.starAdj.map(i=>row(i,'m')).join('')}${r.starSame.map(i=>row(i,'s')).join('')}</ul></div>`)}
  const all=G.qs.map((k,i)=>`<li><b>${esc(Q[k][1])}</b>${[0,1,2,3].map(v=>{const who=G.players.filter(p=>oOf(p.ans[i])===v);return who.length?`<span class="ansrow"><i class="o${v}">${esc(ans(v,k))}</i>${G.anon?who.length+'人':who.map(nm).join('、')}</span>`:''}).join('')}</li>`).join('');
  out+=foldBox('みんなの答えを1問ずつ','全'+G.qs.length+'問',`<ul class="list all">${all}</ul>`);
  return out}
/* ===== わたしの結果（鑑定者本人 2026-11-19「保存もできますか」→「入れてください」。究極の二択と同じ）
 * 結果を出すたびに、このスマホの中に自動で残す（最新10回・どこにも送らない）。トップの「わたしの結果」から開ける。部屋が12時間で消えたあとも見られる ===== */
const MINE_MAX=10;
// 3人以上の結果では、歩み寄りの案の「2人で」などを「みんなで」に言いかえる（鑑定者本人 2026-11-19「全部直してください」）。
// 「2人きり」・暮らし／結婚の話（もともと2人の話）はそのまま
function ayOf(k,two){const a=(window.SY_AYUMI||{})[Q[k][1]];if(!a||two)return a;
  return (a.match(/[^。]+。?|。/g)||[a]).map(t=>/2人きり|暮らし|生活費|職場|家賃|結婚|一緒に住/.test(t)?t:t.replace(/2人とも/g,'みんな').replace(/2人で/g,'みんなで').replace(/2人の/g,'みんなの').replace(/2人に。/g,'みんなに。')).join('')}
function mineList(){const a=store('kv_mine');return Array.isArray(a)?a:[]}
function mineSave(G){try{
  const ps=G.players;if(!ps.some(p=>G.qs.some((k,i)=>{const a=p.ans[i];return a&&a.o>=0})))return;
  const pk=a=>a?[a.o,a.st?1:0,Math.round((a.ms||0)/100),a.to?1:0,a.u?1:0]:null;
  const ent={id:R.code&&!G.local?'r'+R.code+'-'+((R.room||{}).round||1)+'-'+((R.room||{}).created||0):'l'+G.qs.map(k=>QKEY[k].slice(0,4)).join('')+'|'+ps.map(p=>p.name).join(','),
    at:Date.now(),qs:G.qs,pct:ps.length>1?syncStat(G).pct:null,me:ps.findIndex(p=>p.id===G.me),anon:!!G.anon,pair:!!G.pair,
    pl:ps.map(p=>({n:String(p.name||''),a:G.qs.map((k,i)=>pk(p.ans[i]))}))};
  let L2=mineList().filter(x=>x&&x.id!==ent.id);L2.unshift(ent);store('kv_mine',L2.slice(0,MINE_MAX))}catch(e){}}
function mineOpen(ent){const un=x=>x?{o:x[0],st:x[1],ms:x[2]*100,to:!!x[3],u:x[4]}:null;
  const players=ent.pl.map((p,j)=>({id:j===ent.me?'me':'p'+j,name:p.n,ans:p.a.map(un)}));
  showResult({players,qs:ent.qs,me:ent.me>=0?'me':null,anon:ent.anon,local:true,pair:ent.pair,view:true,mine:ent})}
function mineLabel(ent){const n=ent.pl.length,me=ent.pl[ent.me];
  const who=n<2?'ひとりで':ent.pl.filter((p,j)=>j!==ent.me).map(p=>p.n+'さん').slice(0,3).join('・')+(n>4?' ほか':'')+'と';
  const d=new Date(ent.at),dt=(d.getMonth()+1)+'月'+d.getDate()+'日 '+d.getHours()+':'+String(d.getMinutes()).padStart(2,'0');
  return {who,dt,q:ent.qs.length}}
// ひとりの結果は、一覧に価値観のかたち（○○派×○○派）を添える（％がないので見分けられなかった。鑑定者本人 2026-11-19）
function mineShape(e){try{const x=e.pl[0],p={name:x.n,ans:x.a.map(v=>v?{o:v[0],st:v[1],ms:v[2]*100,to:!!v[3],u:v[4]}:null)};return shapeWords({qs:e.qs,players:[p]},p)}catch(err){return''}}
function mineView(){const L2=mineList();
  view(`${tnav('mine-top')}<section class="card"><p class="label">わたしの結果</p><p class="hint">このスマホに残っている結果です（新しい順・${MINE_MAX}回まで）。この一覧は、このスマホの中だけにあります。開いた結果のいちばん下から、1つずつ消せます。</p>
    ${L2.length?`<ul class="mine-l">${L2.map((e,j)=>{const x=mineLabel(e),n=e.pl.length,solo=n<2;
      const others=e.pl.filter((p,k)=>k!==e.me).map(p=>p.n+'さん'),sw=solo?mineShape(e):'';
      const tag=solo?'<span class="mb-tag t1">ひとりで</span>':n===2?'<span class="mb-tag t2">2人で</span>':`<span class="mb-tag t3">みんなで（${n}人）</span>`;
      const main=solo?(sw?sw.split('×').map(w=>`<span class="nw">${esc(w)}</span>`).join('<span class="mb-x">×</span><wbr>'):'価値観のかたち'):others.slice(0,3).map(w=>`<span class="nw">${esc(w)}</span>`).join('・<wbr>')+(others.length>3?`<span class="mb-more">ほか${others.length-3}人</span>`:'');
      return `<li><button type="button" class="mine-b" data-j="${j}"><span class="mb-top">${tag}<span class="md">${x.dt}・${x.q}問</span></span><span class="mb-main${solo?' solo':''}">${main}</span>${e.pct!=null?`<span class="mb-pct"><i>シンクロ率</i><b>${e.pct}<small>%</small></b></span>`:''}<span class="mb-go" aria-hidden="true">›</span></button></li>`}).join('')}</ul>`:'<p class="hint">まだありません。</p>'}
    ${IN_LINE?'<div class="mine-line"><b>いまLINEの中で開いています。</b><span>この一覧は、この画面の中だけにあります。</span><button class="btn" id="mv-go" type="button">いつもの画面で開く（結果も一緒にうつります）</button></div>':''}
    <button class="btn ghost" id="mine-back" style="align-self:stretch">トップへ</button></section>`);
  const mvb=$('mv-go');if(mvb)mvb.onclick=()=>{try{sessionStorage.removeItem('kv_stay')}catch(e){}mvGo()};
  app.querySelectorAll('.mine-b').forEach(b=>b.onclick=()=>mineOpen(L2[+b.dataset.j]));$('mine-back').onclick=goTop;$('mine-top').onclick=goTop}
function showResult(G){showResultCore(G);
  if(G.mine){const sc=app.querySelector('.scr'),x=mineLabel(G.mine);if(sc)sc.insertAdjacentHTML('afterbegin',tnav('mine-ls','わたしの結果の一覧へ',`<span class="tnav-n">${x.dt}の結果</span>`));const b=$('mine-ls');if(b)b.onclick=mineView;
    // この結果だけを消す（2回押し。2026-11-27）
    if(sc){sc.insertAdjacentHTML('beforeend',`<section class="card mine-del"><button class="btn ghost" id="mine-del" type="button">この結果を消す</button><p class="hint" id="mine-del-n">わたしの結果の一覧から、この結果だけを消します。</p></section>`);
      const db=$('mine-del');let armed=0,tm=0;db.onclick=()=>{if(!armed){armed=1;db.textContent='もう一度押すと、消します';$('mine-del-n').textContent='消した結果は、もとにもどせません。';tm=setTimeout(()=>{armed=0;db.textContent='この結果を消す';$('mine-del-n').textContent='わたしの結果の一覧から、この結果だけを消します。'},4000);return}
        clearTimeout(tm);const id=G.mine.id,at=G.mine.at;store('kv_mine',mineList().filter(x=>x&&!(x.id===id&&x.at===at)));toast('この結果を消しました');mineView()}}
    scrollTo(0,0)}
  else if(!G.view){mineSave(G);statPlay(G)}}
/* 診断した回数を数える（統計のページ stats.html 用。名前・答えは送らない。同じ回は1回だけ＝部屋に人が加わって描き直しても数え直さない。2026-11-19） */
function statPlay(G){try{if(!G.qs||!G.qs.length)return;
  const me=G.players.find(p=>p.id===G.me);if(!me)return;
  const kind=G.pair?'with':!G.local?'room':'solo',len=G.qs.length>=30?30:10;
  const id=kind==='room'?'r'+(R.code||'')+'-'+((R.room||{}).round||1)+'-'+((R.room||{}).created||0):kind+'-'+G.qs.join('.')+'-'+G.qs.map((k,i)=>{const a=(me.ans||{})[i];return a&&a.ms||0}).join('');
  let seen=[];try{seen=JSON.parse(sessionStorage.getItem('kv_play')||'[]')}catch(e){}
  if(seen.includes(id))return;seen.push(id);try{sessionStorage.setItem('kv_play',JSON.stringify(seen.slice(-50)))}catch(e){}
  try{if(window.gaEv)gaEv('play_done',{kind:kind,len:len})}catch(e){}  // アクセス解析：診断された回数（種類だけ）
  getDb().then(db=>{if(db&&db.stat)db.stat(kind+len).catch(()=>{})}).catch(()=>{})}catch(e){}}
// 秒の出し方：1秒未満は「1秒未満」（読む時間を引くので 0.0秒・0.1秒 が出ていた）。いちばん悩んだ問題は3秒以上のときだけ出す
const SECF=ms=>ms<1000?'1秒未満':(ms/1000).toFixed(1)+'秒',PONDER_MIN=3000;
// 結果の上に「だれと・いつ」（スクリーンショットで送られても、あとで見返してもわかるように）
function whoLine(G){const ps=G.players,me=ps.find(p=>p.id===G.me),d=new Date(G.mine&&G.mine.at||Date.now()),dt=(d.getMonth()+1)+'月'+d.getDate()+'日';
  let w;if(G.anon&&me)w='あなた ほか'+(ps.length-1)+'人';else{const o=me?[me].concat(ps.filter(p=>p!==me)):ps,nm=o.map(p=>p===me?'あなた':esc(p.name));w=nm.slice(0,4).map(x=>`<span class="nw">${x}</span>`).join(' × <wbr>')+(nm.length>4?`<span class="nw"> ほか${nm.length-4}人</span>`:'')}
  return `<p class="whl">${w}<span class="wdt">${dt}</span></p>`}
function showResultCore(G){
  const ps=G.players,me=ps.find(p=>p.id===G.me),multi=ps.length>1,sec=ms=>(ms/1000).toFixed(1);
  const nm=p=>esc(p.name)+(p===me?'（あなた）':''),sn=p=>p===me?'あなた':esc(p.name);
  let h='';
  if(!multi){h=soloHTML(G)+VS_SLOT;view(h+tailHTML(G));bindTail(G);votesRun(G);return}
  // ① シンクロ率（答えの重なり。全員で1つの数字）
  const gh=syncStat(G),pct=gh.pct,two=ps.length===2,P2=two?pairStat(ps[0],ps[1],G.qs):null;
  if(!ps.some((a,i)=>ps.slice(i+1).some(b=>pairStat(a,b,G.qs).n))){
    view(`<section class="card score none"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">${whoLine(G)}<p class="cap">${two?'2人':ps.length+'人'}のシンクロ率</p>
      <p class="msg">くらべられる答えがありませんでした</p><p class="hint">時間切れの問題と「${UNDEC}」の問題は、シンクロ率に数えていません。もう一度診断すると、答えが重なるところがわかります。</p></section>${undecHTML(G,nm)}`+VS_SLOT+tailHTML(G));
    bindTail(G);votesRun(G);return}
  const hi=pct>=HIGH_SYNC,sm=syncMsg(pct,two);
  const diffN=two?P2.diff.length:G.qs.filter((k,i)=>{const c=[0,0];ps.forEach(p=>{const a=p.ans[i];if(a&&a.o>=0&&a.o<2)c[a.o]++});return c[0]&&c[1]}).length;
  h+=`<section class="card score${hi?' hisync':''}">${hi?'<span class="hs-badge" data-nocg>HIGH SYNC</span>':''}<img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    ${whoLine(G)}<p class="cap">${two?'2人':ps.length+'人'}のシンクロ率</p><p class="hint cap-h">${two?'2人の':'みんなの'}答えが、どれだけ重なったか。お金・将来・暮らしのような大事な問題ほど、大きく効きます。</p>
    <div class="ring" style="background:${hi?`conic-gradient(#8FE3CF 0,#A9B2F5 ${pct/2}%,#F4B6D6 ${pct}%,var(--line) ${pct}% 100%)`:`conic-gradient(var(--a) 0 ${pct}%,var(--line) ${pct}% 100%)`}"><div class="in"><span class="num" data-v="${pct}">${pct}<small>%</small></span></div></div>
    <p class="msg">${sm.msg}</p>${hi?`<p class="hs-sub">${two?'ふだんの感覚が、ほとんど重なっています。<br>一緒にいて自然体でいられる組み合わせ。':'みんなの感覚が、ほとんど重なっています。<br>集まると自然体でいられるメンバー。'}</p>`:sm.sub?`<p class="hs-sub">${sm.sub}</p>`:''}${P2?`<div class="nums"><div class="n1"><small>ぴったり</small><b>${P2.same.length}<i>問</i></b></div><div class="n2"><small>近い</small><b>${P2.adj.length}<i>問</i></b></div><div class="n3"><small>ちがい</small><b>${P2.diff.length}<i>問</i></b></div></div>${P2.adj.length?`<p class="nums-n">近い＝片方が「日による」「ふつう」などの、<span class="nw">まん中の答え</span></p>`:''}`:''}
    ${diffN?`<button class="jump" id="tojump" type="button">${hi?'100%に近づくヒントを見る ↓':(()=>{const tn=talkItems(G).length;return tn<diffN?`話しておきたい${tn}問を見る ↓`:`ちがった${diffN}問から、話すことを見る ↓`})()}</button>`:''}</section>`;
  const trows=themeRows(G);
  const done=()=>{vsFit();setTimeout(vsFit,60);setTimeout(vsFit,600);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(vsFit);bindTail(G);bindTalked(G);bindAgain(G);countUp();votesRun(G);kyoRun(G);const j=$('tojump');if(j)j.onclick=()=>{const t=$('steps')||$('talk');if(t)t.scrollIntoView({behavior:'smooth',block:'start'})}};
  if(P2){if(G.pair){h+=pairBackCard(G,true);G.backTop=1}h+=distHTML(G)+stepsHTML(G)+kyoSlot(G)+talkHTML(G,nm)+'<p class="ref-h">くわしく見る</p>'+tipsHTML(G)+undecHTML(G,nm)+againHTML(G,P2)+twoFolds(G,trows,nm,P2);view(h+VS_SLOT+tailHTML(G));done();return}
  // ② あなたといちばん合う人（3人以上）
  const pairs=[];for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)pairs.push({a:ps[i],b:ps[j],r:pairStat(ps[i],ps[j],G.qs)});
  pairs.sort((x,y)=>y.r.pct-x.r.pct);
  const mine=me?pairs.filter(x=>x.a===me||x.b===me):pairs,other=x=>x.a===me?x.b:x.a;
  const list=(G.anon&&me)?mine:pairs;
  const prow=x=>`<li><span class="pn">${(G.anon&&me)?esc(other(x).name):sn(x.a)+' × '+sn(x.b)}</span><span class="t"><i style="width:${x.r.pct}%"></i></span><em>${x.r.pct}%</em></li>`;
  const best=me&&mine.length?`<div class="best"><span class="bn">${esc(other(mine[0]).name)}さん</span><span class="bp">${mine[0].r.pct}<small>%</small></span></div>`:'';
  h+=`<section class="card"><p class="label">${me?'あなたといちばん合う人':'いちばん合うペア'}</p>${best}
    <ul class="prs">${list.slice(0,3).map(prow).join('')}</ul>
    ${list.length>3?`<details class="sfold"><summary>ほかの組み合わせ（${list.length-3}組）を見る</summary><ul class="prs">${list.slice(3).map(prow).join('')}</ul></details>`:''}
    <p class="hint">同じ答え＝ぴったり、片方がまん中の答え（どっちでも合わせられる・日による など）＝近い、として数えています。お金・将来・暮らしのような大事な問題ほど、大きく効きます。</p></section>`;
  // ③ みんなの共通点 → ④ みんなで話しておきたいこと
  h+=stepsHTML(G)+kyoSlot(G)+talkHTML(G,nm)+bridgeHTML(G)+'<p class="ref-h">くわしく見る</p>'+tipsHTML(G)+undecHTML(G,nm)+groupShapeHTML(G);
  // ⑤ 残りはたたむ
  if(trows.length){const ks=trows.slice().sort((a,b)=>b.pct-a.pct);h+=foldBox('テーマ別のシンクロ率',ks[0].pct>0?`<span class="sml">いちばん重なった：<em class="nw">${esc(ks[0].name)}（${ks[0].pct}%）</em></span>`:`<span class="sml">どのテーマも、答えが分かれました</span>`,themeHTML(trows,'みんな'))}
  const ax=axHTML(G,(G.anon&&me)?[me]:ps,nm);if(ax)h+=foldBox('価値観のタイプ',(G.anon&&me)?'あなたの位置':ps.length+'人の位置',ax);
  const starP=(G.anon&&me?[me]:ps).map(p=>({p,xs:G.qs.map((k,i)=>({k,a:p.ans[i]})).filter(x=>x.a&&x.a.st&&x.a.o>=0&&x.a.o<2)})).filter(x=>x.xs.length);
  if(starP.length)h+=foldBox('★ ゆずれないこと',starP.slice().sort((a,b)=>b.xs.length-a.xs.length).slice(0,2).map(x=>`<em>${esc(x.p===me?'あなた':x.p.name)} ${x.xs.length}問</em>`).join('・')+(starP.length>2?'　ほか':''),starCnt(G)+starP.map(x=>`<div class="tori"><p class="sub">${nm(x.p)}</p><ul>${x.xs.map(y=>`<li>${esc(Q[y.k][1])} ${esc(ans(y.a.o,y.k))}</li>`).join('')}</ul></div>`).join(''));
  const qst=G.qs.map((k,i)=>{let ms=0,m=0;ps.forEach(p=>{const a=p.ans[i];if(!a)return;if(a.o>=0||a.to){ms+=a.ms;m++}});return{i,k,avg:m?ms/m:0}});
  const hard=qst.slice().sort((a,b)=>b.avg-a.avg)[0],timed=hard&&hard.avg>0&&ps.every(p=>G.qs.some((k,i)=>p.ans[i]&&p.ans[i].ms>0));
  if(timed&&hard.avg>=PONDER_MIN)h+=foldBox('いちばん悩んだ問題',`${esc(Q[hard.k][1])}（平均${sec(hard.avg)}秒）`,`<div class="ponder"><b>${esc(Q[hard.k][1])}</b><span>平均 <em>${sec(hard.avg)}</em> 秒</span></div>`);
  const all=G.qs.map((k,i)=>`<li><b>${esc(Q[k][1])}</b>${[0,1,2,3].map(v=>{const who=ps.filter(p=>oOf(p.ans[i])===v);return who.length?`<span class="ansrow"><i class="o${v}">${esc(ans(v,k))}</i>${G.anon?who.length+'人':who.map(nm).join('、')}</span>`:''}).join('')}</li>`).join('');
  h+=foldBox('みんなの答えを1問ずつ','全'+G.qs.length+'問',`<ul class="list all">${all}</ul>`);
  view(h+VS_SLOT+tailHTML(G));done();
}
// まだ決められなかった問題（だれかが「まだ決められない」を選んだ問題。名前を見せない部屋では自分の分だけ）
function undecHTML(G,nm){const me=G.players.find(p=>p.id===G.me),ps=(G.anon&&me)?[me]:G.players,solo=G.players.length<2;
  const xs=G.qs.map((k,i)=>({k,who:ps.filter(p=>p.ans[i]&&p.ans[i].u)})).filter(x=>x.who.length);if(!xs.length)return'';
  return foldBox('まだ決められなかった問題',xs.length+'問',`<div class="undec"><ul class="list">${xs.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${solo?'':`<span class="ansrow"><i class="o3">${UNDEC}</i>${x.who.map(nm).join('、')}</span>`}</li>`).join('')}</ul>
    <p class="hint">${solo?'すぐに決められないのも、ひとつの答えです。だれかと答え合わせすると、自分の気持ちが見えてくるかもしれません。':'迷った問題は、話してみると、おたがいの考えがわかるきっかけになります。'}</p></div>`)}
/* ひとりの結果：いちばん上は「価値観のかたち」（4つのものさしで強く出た2つ。称号・キャラクターではなく、ものさしの言葉そのまま） */
const POLE={kicchiri:['身のまわりや決めごとを、きちんと整えておくと落ち着く。','細かいことは気にせず、ゆるやかに暮らせると落ち着く。'],
  keikaku:['予定は、先に決めておくと安心。','予定は、その場の気分で決めるのが楽しい。'],
  futari:['好きな人とは、できるだけ一緒に過ごしたい。','好きな人がいても、ひとりの時間も大事にしたい。'],
  okane:['お金は先のことを考えて、コツコツためたい。','お金は、今の楽しみにもしっかり使いたい。']};
// 寄ったものさしを2つまで選ぶ（2026-11-21 鑑定者本人「1と2の両方直して」）：強さが同じときは、答えた問題の多いほう→その回の問題で決まる公平なくじ（前は並び順の先の「暮らし・予定」ばかりが選ばれていた）。
function leanTie(G,k){let h=2166136261;const t=k+'|'+G.qs.join(',');for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)%997}
function leanRows(G,p,rows){rows=rows||AX.map(a=>({a,s:axScore(p,G.qs,a)})).filter(x=>x.s);
  return rows.filter(x=>Math.abs(x.s.pct-50)>=10).sort((x,y)=>(Math.abs(y.s.pct-50)-Math.abs(x.s.pct-50))||(y.s.n-x.s.n)||(leanTie(G,y.a.key)-leanTie(G,x.a.key))).slice(0,2)}
// 1問だけで決めたものさしは「○○派寄り」（言い切らない）
function leanLab(x){const w=x.s.pct>50?x.a.l:x.a.r;return x.s.n<2?w+'寄り':w}
function shapeLean(G,p){return leanRows(G,p).map(leanLab)}
function shapeWords(G,p){const l=shapeLean(G,p);return l.length?l.join('×'):'どれにも寄らない、やわらかい人'}
function shapeBars(G,p){const rows=AX.map(a=>({a,s:axScore(p,G.qs,a)})).filter(x=>x.s);
  return rows.map(({a,s})=>`<div class="shx"><p>${esc(a.name)}</p><div class="sbar"><i style="left:calc(9px + (100% - 18px) * ${(100-s.pct)/100})"></i></div><div class="ends"><span${s.pct>=60?' class="on"':''}>${esc(a.l)}</span><span${s.pct<=40?' class="on"':''}>${esc(a.r)}</span></div></div>`).join('')}
function shapeHTML(G,p,who,extra){
  const rows=AX.map(a=>({a,s:axScore(p,G.qs,a)})).filter(x=>x.s);if(!rows.length)return '';
  const lean=leanRows(G,p,rows)
    .map(x=>({w:leanLab(x),t:(POLE[x.a.key]||[])[x.s.pct>50?0:1]}));
  const big=lean.length?lean.map(x=>`<span class="nw">${esc(x.w)}</span>`).join('<span class="x">×</span>'):'どれにも寄らない、やわらかい人';
  const desc=(lean.length?lean.map(x=>x.t||''):['どのものさしでも、まん中あたり。相手に合わせて動ける人です。']).filter(Boolean).map(t=>`<span class="sl">${esc(t)}</span>`).join('');
  const bars=rows.map(({a,s})=>`<div class="shx"><p>${esc(a.name)}</p><div class="sbar"><i style="left:calc(9px + (100% - 18px) * ${(100-s.pct)/100})"></i></div><div class="ends"><span${s.pct>=60?' class="on"':''}>${esc(a.l)}</span><span${s.pct<=40?' class="on"':''}>${esc(a.r)}</span></div></div>`).join('');
  return `<section class="card shape"><img class="chara c-solo" src="img/ai.webp" width="120" height="106" alt="" aria-hidden="true">
    <p class="cap">${who}の価値観のかたち</p><p class="big">${big}</p><p class="sdesc">${desc}</p>${extra!=null?extra:bars}
    ${G.qs.length<30?'<p class="hint">しっかり版（30問）なら、もっとはっきりわかります。</p>':''}</section>`}
// ひとりの結果：あなたと合いやすい人・ぶつかりやすい人（鑑定者本人 2026-11-20「お願いします」）。[合いやすい理由, ぶつかりやすい場面, 合わせ方]
const MATCH={kicchiri:[['暮らしのリズムが合い、片づけや決めごとでもめにくい。','脱いだ服・洗い物・片づけのタイミングで、ぶつかりやすい。','共有の場所だけ「ここまで片づいていればOK」のラインを1つ決めて、相手の場所には口を出さない。'],
    ['細かいことで注意し合わず、気楽に過ごせる。','「なんで片づけないの？」と言われて、窮屈に感じやすい。','共有の場所のルールを1つだけ聞いて、そこだけは守る。']],
  keikaku:[['予定を立てる楽しさを、一緒に味わえる。','旅行やおでかけの予定を、いつ・どこまで決めるかでぶつかりやすい。','大きな予定はあなたが先に決めて、当日の過ごし方は相手にまかせる。'],
    ['思いつきの寄り道を、一緒に楽しめる。','「まだ決めてないの？」と、予定を決める早さでぶつかりやすい。','大事な予定だけは先に決めて、あとは当日の気分で。']],
  futari:[['会いたい気持ちの強さが同じで、さみしくなりにくい。','会う回数や連絡の多さで、ぶつかりやすい（会えない日をさみしく感じやすい）。','会う日を先に決めておき、ひとりの日は相手が元気をためる日と考える。'],
    ['おたがいの時間を大事にできて、しばられない。','「もっと会いたい」と言われて、窮屈に感じやすい。','会えない日も、ひと言だけ連絡を入れる。']],
  okane:[['将来のお金の話がしやすく、安心できる。','外食・旅行・買い物にかけるお金で、ぶつかりやすい。','毎月ためる分を先に一緒に決めて、残りの使い方には口を出さない。'],
    ['一緒に楽しむことに、気持ちよくお金を使える。','「それ、本当に必要？」と、お金の使い方でぶつかりやすい。','ためる分だけは先に一緒に決めて、楽しむお金は気持ちよく使う。']]};
function matchHTML(G,p){const rows=AX.map(a=>({a,s:axScore(p,G.qs,a)})).filter(x=>x.s&&MATCH[x.a.key]);if(!rows.length)return'';
  const lean=leanRows(G,p,rows);
  const nw=t=>`<span class="nw">${esc(t)}</span>`;
  const body=lean.length?lean.map(x=>{const {a,s}=x,l=s.pct>50,me=l?a.l:a.r,ot=l?a.r:a.l,m=MATCH[a.key][l?0:1];
    return `<div class="mt-ax"><p class="mt-h">${nw(leanLab(x))}のあなたは</p>
      <div class="mt-r ok"><span class="mt-k">合いやすい</span><p><b>同じ${nw(me)}の人</b>${esc(m[0])}</p></div>
      <div class="mt-r ng"><span class="mt-k">ぶつかりやすい</span><p><b>${nw(ot)}の人</b>${esc(m[1])}</p></div>
      <p class="mt-tip"><span>合わせ方</span>${esc(m[2])}</p></div>`}).join('')
    :`<div class="mt-ax"><p class="mt-h">どれにも寄らないあなたは</p>
      <div class="mt-r ok"><span class="mt-k">合いやすい</span><p><b>どの人とも</b>相手のやり方に合わせやすく、大きくぶつかりにくい。</p></div>
      <div class="mt-r ng"><span class="mt-k">気をつけたい</span><p><b>こだわりの強い人</b>合わせすぎて、自分の気持ちを言いそびれやすい。</p></div>
      <p class="mt-tip"><span>合わせ方</span>ときどき「わたしはこうしたい」を1つだけ言ってみる。</p></div>`;
  return `<section class="card match"><p class="pt-h"><em>相性のヒント</em><span><span class="nw">あなたと合いやすい人・</span><span class="nw">ぶつかりやすい人</span></span></p>${body}</section>`}
// 恋人と話しておきたい3問：★→大事な問題の答えから3つ（ちがうと困るので、先に聞いておきたい問題）
const TALK3_WHY={'お金':'お金の考え方のちがいは、毎月くり返し出てきます。','将来・家族':'将来のことは、あとから変えにくいところです。','暮らし':'暮らしのことは、小さなちがいが積み重なりやすいところです。','恋愛・連絡':'付き合い方のちがいは、気持ちのすれ違いにつながりやすいところです。','食':'ごはんは毎日のことなので、好みのちがいに何度も出会います。','休日・遊び':'休みの過ごし方がちがうと、どちらかが毎回合わせることになりがちです。','ドキドキ':'仲が近づくペースのちがいは、言葉にしないと伝わりにくいところです。'};
// 順番：★の大事な問題→大事な問題→★のほかの問題→ふつうの問題（軽い問題は入れない）。同じテーマは、ほかがなければ2つ目から
// 付き合う前・はじめてのデートの問題は「恋人と話しておきたい」に入れない（恋人がいる人にも「初デートで手をつなぐのは？」が出ていたため。鑑定者本人 2026-11-23「全部直してください」）
const T3_PRE=/初デート|はじめてのデート|付き合う前|告白|気になる人|仲良くなるペース|好きな人には？|恋愛経験/;
function talk3Pick(firm){firm=firm.filter(x=>!T3_PRE.test(Q[x.k][1]));const B=x=>WB.has(x.k),pool=firm.filter(x=>x.a.st&&B(x)).concat(firm.filter(x=>!x.a.st&&B(x)),firm.filter(x=>x.a.st&&!B(x)&&!WL.has(x.k)),firm.filter(x=>!x.a.st&&!B(x)&&!WL.has(x.k)));
  const out=[],th=new Set();for(const x of pool){if(out.length>=3)break;const t=Q[x.k][0];if(!th.has(t)){out.push(x);th.add(t)}}
  for(const x of pool){if(out.length>=3)break;if(!out.includes(x))out.push(x)}return out}
// 友だちのテーマの質問で診断した回か（URLではなく質問で見る＝わたしの結果から開き直しても同じ）
function isFriendSet(qs){const f=((window.SY_PACKS||{}).tomodachi||{}).keys;if(!f||!qs.length)return false;const set=new Set(f);return qs.every(k=>set.has(QKEY[k]))}
function talk3HTML(G,t3){if(!t3.length)return'';
  return `<section class="card talk3"><p class="pt-h"><em>答え合わせの前に</em>${isFriendSet(G.qs)?'友だちに聞いてみたい':'恋人と話しておきたい'}${t3.length}問</p>
    <p class="hint">${(()=>{const imp=t3.filter(x=>x.a.st||WB.has(x.k)).length;return imp===t3.length?'あなたの答えから、相手とちがうと困りやすい問題を選びました（★ゆずれない問題・大事な問題を先に）。先に聞いておくと安心です。':imp?'あなたの答えから、相手とちがうと困りやすい問題と、先に聞いておくと話が広がる問題を選びました（★ゆずれない問題・大事な問題を先に）。':'あなたの答えから、先に聞いておくと話が広がる問題を選びました。'})()}</p>${t3.some(x=>x.a.st)?'<p class="stl"><i>★</i>＝ゆずれない（答える前に付けた印）</p>':''}
    <ol class="t3-l">${t3.map(x=>{const th=CATS[Q[x.k][0]][0];return `<li><b>${esc(Q[x.k][1])}</b><span class="t3-a">あなた：${x.a.st?'<i class="mk-s">★</i>':''}${esc(ans(x.a.o,x.k))}</span><small>${esc(TALK3_WHY[th]||'')}</small></li>`}).join('')}</ol>
    <button class="btn ghost small" id="t3-go" type="button"><span class="nw">この${t3.length}問で、</span><span class="nw">答え合わせに誘う ↓</span></button></section>`}
function soloHTML(G){
  const p=G.players[0],xs=G.qs.map((k,i)=>({k,i,a:p.ans[i]})).filter(x=>x.a&&x.a.o>=0),sec=ms=>(ms/1000).toFixed(1);
  const firm=xs.filter(x=>x.a.o<2),flex=xs.filter(x=>isFlex(x.a.o,x.k)),mid=xs.filter(x=>x.a.o===2&&!isFlex(x.a.o,x.k)),star=firm.filter(x=>x.a.st);
  const byT=xs.slice().sort((a,b)=>b.a.ms-a.a.ms);
  const pct=xs.length?Math.round(flex.length/xs.length*100):0;
  // ものさしでどれにも寄らない人に「好みがはっきり」と出すと上の文と食いちがうので、言い方を変える（2026-11-27）
  const axr=AX.map(a=>({a,s:axScore(p,G.qs,a)})).filter(x=>x.s),noLean=axr.length&&!leanRows(G,p,axr).length;
  const msg=pct>=50?'まわりに合わせられる、やわらかい人':noLean&&pct<25?'1問ずつはどちらかを選ぶけれど、全体ではまん中あたりの人':pct>=25?'こだわりとやわらかさのバランス型':'自分の好みがはっきりしている人';
  const who=p.name==='あなた'?'あなた':esc(p.name)+'さん';
  // 「合わせられる度 17%」は低い点数に見えるので、％ではなく問題の数で出す（鑑定者本人 2026-11-19「全部直して」）。4つのものさしはたたまずに見せる
  const bars0=shapeBars(G,p);
  const tiles=`${bars0?`<div class="shape-in">${bars0}</div>`:''}<div class="stiles"><div class="tile"><span>どっちでも合わせられる</span><em>${flex.length}<small>／${xs.length}問</small></em></div><div class="tile" id="tmaj" hidden><span>多数派度</span><em></em></div></div>
    <p class="hint">${msg}。</p>`;
  const shape=shapeHTML(G,p,who,tiles);
  if(!xs.length){const und=G.qs.some((k,i)=>p.ans[i]&&p.ans[i].u);
    return `<section class="card score none"><img class="chara c-solo" src="img/ai.webp" width="120" height="106" alt="" aria-hidden="true"><p class="msg">${und?'どの問題も、まだ決められませんでした':'時間切れで、答えた問題がありませんでした'}</p>
      <p class="hint">${und?'':'1問15秒で、次の問題へ進みます。'}答えた問題があると、あなたの価値観のかたちがわかります。下の「もう1回診断する」から、もう一度どうぞ。</p></section>${undecHTML(G,q=>esc(q.name))}`}
  const top=shape||`<section class="card score"><img class="chara c-solo" src="img/ai.webp" width="120" height="106" alt="" aria-hidden="true"><p class="cap">${who}の「合わせられる度」</p>
    <div class="ring" style="background:conic-gradient(var(--a) 0 ${pct}%,var(--line) ${pct}% 100%)"><div class="in"><span class="num">${pct}<small>%</small></span></div></div><p class="msg">${msg}</p></section>`;
  const kod=(star.length?`<p class="sub">★ ゆずれないこと</p><ul class="list">${star.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${esc(ans(x.a.o,x.k))}</li>`).join('')}</ul>`:'')
    +(star.length&&firm.some(x=>!x.a.st)?'<p class="sub">そのほかのこだわり</p>':'')+`<ul class="list">${firm.filter(x=>!x.a.st).map(x=>`<li><b>${esc(CATS[Q[x.k][0]][0])}｜${esc(Q[x.k][1])}</b><span class="ansrow"><i class="o${x.a.o}">${esc(ans(x.a.o,x.k))}</i></span></li>`).join('')||(star.length?'':xs.length?'<li>今回は、どの問題も「どっちでも合わせられる」か、まん中の答えでした</li>':(G.qs.some((k,i)=>p.ans[i]&&p.ans[i].u)?'<li>どの問題も、まだ決められませんでした</li>':'<li>時間切れで、答えた問題がありませんでした</li>'))}</ul>`;
  const flx=(flex.length?`<p class="sub">合わせられること</p><p class="hint">${flex.map(x=>`<span class="qi">${esc(Q[x.k][1])}</span>`).join('　')}</p>`:'')
    +(mid.length?`<p class="sub">まん中の答え</p><ul class="list">${mid.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${esc(ans(x.a.o,x.k))}</li>`).join('')}</ul>`:'')
    +(byT.length>1&&byT[0].a.ms>=PONDER_MIN?`<p class="sub">いちばん悩んだ問題</p><div class="ponder"><b>${esc(Q[byT[0].k][1])}</b><span>「${esc(ans(byT[0].a.o,byT[0].k))}<span style="white-space:nowrap">」まで <em>${sec(byT[0].a.ms)}</em> 秒</span></span></div>
    <p class="hint">いちばん即決は「${esc(Q[byT[byT.length-1].k][1])}」（${SECF(byT[byT.length-1].a.ms)}）</p>`:'');
  // あなたの大事な答え（★→大事な問題の順に5つまで）と、選び方のくせ（悩んだ・即決）。たたまずに見せる（鑑定者本人 2026-11-19「1人の結果が中身が少なく見えるのは問題」）
  const t3=talk3Pick(firm),t3k=new Set(t3.map(x=>x.k));
  const imp=firm.filter(x=>x.a.st).concat(firm.filter(x=>!x.a.st&&WB.has(x.k))).filter(x=>!t3k.has(x.k)).slice(0,5);
  // 大事な答えが「話しておきたい3問」に全部入ったときも、悩んだ・即決の問題は出す（2026-11-20 の点検で直した）
  const mine=(imp.length||byT.length>1)?`<section class="card mykey"><p class="pt-h"><em>あなたの答え</em>${imp.length?(t3.length?'そのほかの大事な答え':who+'の大事な答え'):who+'の選び方のくせ'}</p>
    ${imp.length?`<p class="hint">${imp.some(x=>x.a.st)?'★を付けた答えと、お金・暮らし・将来など大事な問題で選んだ答えです。':'お金・暮らし・将来など、大事な問題で選んだ答えです。'}</p>
    ${imp.some(x=>x.a.st)?'<p class="stl"><i>★</i>＝ゆずれない（答える前に付けた印）</p>':''}<ul class="mk-l">${imp.map(x=>`<li><b>${esc(Q[x.k][1])}</b><span class="mk-a">${x.a.st?'<i class="mk-s">★</i>':''}${esc(ans(x.a.o,x.k))}</span></li>`).join('')}</ul>
    <p class="hint mk-n">相手と答え合わせすると、同じ問題の相手の答えと並べて見られます。</p>`:''}
    ${byT.length>1?`<div class="mk-t">${byT[0].a.ms>=PONDER_MIN?`<div><span>いちばん悩んだ</span><b>${esc(Q[byT[0].k][1])}</b><em>${sec(byT[0].a.ms)}秒</em><i>→ ${esc(ans(byT[0].a.o,byT[0].k))}</i></div>`:''}<div class="qk"><span>いちばん即決</span><b>${esc(Q[byT[byT.length-1].k][1])}</b><em>${SECF(byT[byT.length-1].a.ms)}</em><i>→ ${esc(ans(byT[byT.length-1].a.o,byT[byT.length-1].k))}</i></div></div>`:''}</section>`:'';
  return `${top}
  ${matchHTML(G,p)}
  ${mine}
  ${talk3HTML(G,t3)}
  ${inviteCard(G,p)}
  <p class="ref-h">くわしく見る</p>
  ${firm.length?foldBox('あなたのこだわり',firm.length+'問',kod):''}
  ${flx?foldBox(flex.length||mid.length?(()=>{const t=flex.length?'合わせられること':'まん中の答え';return byT.length>1&&byT[0].a.ms>=PONDER_MIN?t+'・悩んだ問題':t})():'いちばん悩んだ問題',flex.length?flex.length+'問':mid.length?'まん中の答え '+mid.length+'問':'',flx):''}
  ${undecHTML(G,q=>esc(q.name))}
  ${G.me==='me'&&!G.view?`<div id="hist">${histHTML(saveHist(G,p,pct))}</div>`:''}`;
}
// 1.66 奇跡の相性診断（鑑定者本人のメインサービス）へのバナー。無料の診断から会員登録（毎朝の開運予報メール）へつながる
/* ほかの診断（3つのサイトの相互リンク。鑑定者本人 2026-11-20「見本その1のバナーでいきます」） */
const SIS_HTML=`<section class="sis"><p class="sis-h">あなたのこと、もっと知りたくない？</p><a class="bn bn-ko" data-nocg href="https://koikata.jp/aichaku/?ref=isync" target="_blank" rel="noopener" aria-label="恋のかたち診断（別のサイト koikata.jp が開きます）"><span class="pic" aria-hidden="true"><img src="img/sis/koi.webp" alt="" width="58" height="58" loading="lazy" decoding="async"></span><span class="tx"><span class="nm">恋のかたち診断</span><span class="ln"><span class="nw">16の恋愛タイプ×</span><span class="nw">愛着スタイル</span></span><span class="dm"><span class="nw">koikata.jp・</span><span class="nw">無料</span></span></span><span class="go">診断 ↗</span></a><a class="bn bn-nt" data-nocg href="https://honbare.com/?ref=isync" target="_blank" rel="noopener" aria-label="究極の二択（別のサイト honbare.com が開きます）"><span class="pic" aria-hidden="true"><img src="img/sis/panda.webp" alt="" width="56" height="56" loading="lazy" decoding="async"></span><span class="tx"><span class="nm">究極の二択</span><span class="ln"><span class="nw">恋もあるあるも、</span><span class="nw">本音がバレる2択</span></span><span class="dm"><span class="nw">honbare.com・</span><span class="nw">無料5分</span></span></span><span class="go">あそぶ ↗</span></a><a class="bn bn-wa" data-nocg href="https://44wansona.com/?ref=isync" target="_blank" rel="noopener" aria-label="ワンソナ（別のサイト 44wansona.com が開きます）"><span class="pic" aria-hidden="true"><img src="img/sis/wansona.webp" alt="" width="54" height="54" loading="lazy" decoding="async"></span><span class="tx"><span class="nm">ワンソナ</span><span class="ln"><span class="nw">うちの子の性格を、</span><span class="nw">44犬種のタイプで診断</span></span><span class="dm"><span class="nw">44wansona.com・</span><span class="nw">無料</span></span></span><span class="go">診断 ↗</span></a><a class="bn bn-16" data-nocg href="https://16typeplus.jp/?ref=isync" target="_blank" rel="noopener" aria-label="16TYPE+（別のサイト 16typeplus.jp が開きます）"><span class="pic" aria-hidden="true"><img src="img/sis/16tp.webp" alt="" width="54" height="54" loading="lazy" decoding="async"></span><span class="tx"><span class="nm">16TYPE<b>+</b></span><span class="ln"><span class="nw">生まれ持った気質と、</span><span class="nw">育ってきた性格がわかる</span></span><span class="dm"><span class="nw">16typeplus.jp・</span><span class="nw">無料</span></span></span><span class="go">診断 ↗</span></a></section>`;
const PROMO=`<a class="promo" href="https://166unmei.com" target="_blank" rel="noopener" aria-label="1.66 奇跡の相性診断で占う（別のサイト 166unmei.com が開きます）">
    <span class="pr-top">価値観の次は、生まれた日でわかる「運命の相性」</span>
    <span class="pr-pair" aria-hidden="true"><img src="img/166-usagi.webp" alt="" width="74" height="72" loading="lazy"><i>×</i><img src="img/166-inu.webp" alt="" width="63" height="72" loading="lazy"></span>
    <span class="pr-m"><span class="pr-k">奇跡の相性診断</span><span class="pr-n">1.66<small>%</small></span><span class="pr-d">あの人は、<em>奇跡の1.66%</em>に入っている？</span></span>
    <span class="pr-pts"><span>2人の生年月日だけ・1分</span><span>料金はかかりません</span><span>毎朝6時の開運予報メールも</span></span>
    <span class="pr-btn">二人の相性を占う <small>↗</small></span></a><p class="promo-u">166unmei.com（別のサイト）</p>`;
function tailHTML(G){const pr=G&&G.pair?pairBackCard(G):'';return `${pr}
  <button class="btn img small" id="img"><svg class="ic-ph" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="1.8" fill="currentColor"/><path d="M4.5 17.5l5-5 3.5 3.5 2.5-2.5 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>結果を画像で保存</button><p class="hint" id="imgmsg" hidden></p>
  ${G&&G.backTop?'':`<a class="btn line small${G&&(G.pair||G.players.length<2)?' line-w':''}" id="lnres" href="#" target="_blank" rel="noopener">LINEで結果を送る</a>
  <button class="btn ghost small" id="share">ほかのアプリでシェアする</button><p class="hint" id="shared" hidden></p>`}
  ${PROMO}
  <div class="row"><button class="btn" id="again">もう1回診断する</button><button class="btn ghost" id="home">トップへ</button></div>
  ${SIS_HTML}`}
// シェア：スマホの共有（使えないときはコピー）。名前は入れない
// ひとりの結果は、名前がわかれば答え合わせのリンクで送る（相手が同じ問題に答えると2人の結果が出る。鑑定者本人 2026-11-18）
function shareText(G,name){
  const ps=G.players,url=lx(WHERE==='claude'?ART_URL:location.href.split('#')[0].split('?')[0]);
  if(ps.length<2){const p=ps[0],xs=G.qs.map((k,i)=>p.ans[i]).filter(a=>a&&a.o>=0),f=G.qs.filter((k,i)=>p.ans[i]&&isFlex(p.ans[i].o,k)).length,pc=xs.length?Math.round(f/xs.length*100):0,n=G.qs.length;
    // 送る文は「価値観のかたち」で問いかける（％は出さない。鑑定者本人 2026-11-18「B」）
    const sw=shapeWords(G,p);
    if(name)return{t:`わたしは「${sw}」でした。${/派/.test(sw)?'あなたは何派？':'あなたはどんなタイプ？'}\n同じ${n}問に答えると、2人のシンクロ率がわかります（約${minsOf(n)}分・無料）\n#アイシンク`,url:withLink(name,G.qs,p.ans,ibxId(G,p,name))};
    return{t:`わたしは「${sw}」でした。${/派/.test(sw)?'あなたは何派？':'あなたはどんなタイプ？'}\n#アイシンク`,url}}
  const sp=syncStat(G).pct;
  return{t:`${sp>=HIGH_SYNC?'HIGH SYNC！ ':''}${ps.length===2?'2人':ps.length+'人'}のシンクロ率は ${sp}% でした！\n同じ質問に答えて答え合わせ。みんなでも診断できます\n#アイシンク`,url}}
function doShare(G,name){const {t}=shareText(G,name),url=lx(shareText(G,name).url),d=$('shared');
  if(navigator.share){navigator.share({title:'アイ・シンク（I-Sync）',text:t,url}).catch(()=>{});return}
  const full=t+'\n'+url;d.hidden=false;
  try{navigator.clipboard.writeText(full).then(()=>{d.textContent='シェアの文をコピーしました。SNSやメッセージに貼ってください。'},()=>{d.textContent=full})}catch(e){d.textContent=full}}
function bindTail(G){
  // ひとりの結果：名前（答え合わせの欄・前に入れた名前）があれば答え合わせのリンク。なければ先に名前を入れてもらう
  const solo=G.players.length<2&&!G.pair&&!!$('inv-name');
  const nmNow=()=>{if(!solo)return '';const i=$('inv-name'),v=i?i.value.trim():'';if(v){store('kv_name',v);return v}const p=G.players[0];return ['あなた','ともだち'].includes(p.name)?(store('kv_name')||''):p.name};
  const askName=e=>{if(!solo||nmNow())return false;if(e)e.preventDefault();const m=$('inv-msg'),i=$('inv-name');if(m){m.hidden=false;m.textContent='先にニックネームを入れてください。相手は同じ問題に答えて、あなたと答え合わせできます（相手の画面に「○○さんから」と出ます）。'}if(i){i.scrollIntoView({block:'center'});i.focus()}return true};
  if($('share'))$('share').onclick=()=>{if(askName())return;doShare(G,nmNow())};
  const lr=$('lnres');if(lr){const set=()=>{const {t,url}=shareText(G,nmNow());lr.href=lineUrl(t,url)};set();lr.addEventListener('click',e=>{if(askName(e))return;set();if(pkCanFiles()){e.preventDefault();const {t,url}=shareText(G,nmNow());saveImage(G,t+'\n'+url)}});const ni=$('inv-name');if(ni)ni.addEventListener('input',set)}
  const t=$('tog');if(t)t.onclick=()=>{CFG.mode='each';saveCfg();goTop()};
  $('again').onclick=e=>{if(R.code){e.target.disabled=true;roomAgain();return}
    const nm=L.players&&L.players[0]?L.players[0].name:'';soloStart(['あなた','ともだち'].includes(nm)?'':nm)};
  const im=$('img');if(im)im.onclick=()=>saveImage(G);
  bindInvite(G);
  $('home').onclick=()=>{if(R.code)leaveRoom();goTop()};
}

/* ===== 答え合わせのリンク（2人が同時に開いていなくても遊べる） =====
   ひとりで答えたあと、同じ問題と自分の答えをリンクに入れて送る。受けとった人が同じ問題に答えると、2人の結果が出る。
   受けとった人は、結果のリンクを送り返せる（送った人も同じ結果を見られる）・同じ問題のまま、ほかの人も誘える（広がる）。
   リンクに目印（ibx）があれば、答えた人の結果（ニックネームと答え）を Firestore の isync_inbox/<目印>/r に10日だけ置き（2026-11-20 に30日から10日へ）、送った人のトップに届ける（鑑定者本人 2026-11-18「Aで、保存30日で」）。問題は目印（QKEY の先頭5文字）で入れる */
const ansCode=a=>!a||a.o<0?(a&&a.u?'u':'-'):String(a.o+(a.st&&a.o<2?3:0));
const ansDecode=c=>c==='-'?{o:-1,st:0,ms:0}:c==='u'?{o:-1,u:1,st:0,ms:0}:{o:(+c)%3,st:+c>=3?1:0,ms:0};
const linkOf=(kind,parts)=>lx(siteUrl()+'#'+kind+'='+parts.map(x=>encodeURIComponent(x)).join('~'));
// 名前に「さん」を付ける（もう「くん」「ちゃん」「さん」で終わる名前には付けない。「けんたろうくんさん」になっていた。2026-11-21）
const san=n=>/(さん|くん|ちゃん|様|先生)$/.test(String(n).trim())?String(n):n+'さん';
const keysOf=qs=>qs.map(k=>QKEY[k].slice(0,5)).join('.');
const codesOf=(qs,ans)=>qs.map((k,i)=>ansCode(ans[i])).join('');
function withLink(name,qs,ans,id){return id?linkOf('with',['2',name,keysOf(qs),codesOf(qs,ans),id]):linkOf('with',['1',name,keysOf(qs),codesOf(qs,ans)])}
function pairLink(A,B,qs){return linkOf('pair',['1',A.name,B.name,keysOf(qs),codesOf(qs,A.ans),codesOf(qs,B.ans)])}
function parseLink(){
  const m=/^#(with|pair)=(.+)$/.exec(location.hash||'');if(!m)return null;
  const p=m[2].split('~').map(x=>{try{return decodeURIComponent(x)}catch(e){return ''}});if(p[0]!=='1'&&!(p[0]==='2'&&m[1]==='with'))return{bad:1};
  const qi=k=>KEY5.has(k)?KEY5.get(k):-1,nm=(x,d)=>(x||'').trim().slice(0,10)||d;
  const ok=(qs,...c)=>qs.length>0&&qs.length<=30&&qs.every(i=>i>=0)&&c.every(x=>x.length===qs.length&&/^[0-5u-]+$/.test(x));
  if(m[1]==='with'){const qs=(p[2]||'').split('.').map(qi);if(!ok(qs,p[3]||''))return{bad:1};
    return{kind:'with',name:nm(p[1],'ともだち'),qs,ans:[...p[3]].map(ansDecode),id:p[0]==='2'&&IBX_ID.test(p[4]||'')?p[4]:''}}
  const qs=(p[3]||'').split('.').map(qi);if(!ok(qs,p[4]||'',p[5]||''))return{bad:1};
  return{kind:'pair',qs,A:{id:'a',name:nm(p[1],'ひとり目'),ans:[...p[4]].map(ansDecode)},B:{id:'b',name:nm(p[2],'ふたり目'),ans:[...p[5]].map(ansDecode)}}}
const minsOf=n=>Math.max(3,Math.round(n/5));   // 10問＝約3分・30問＝約6分（トップの表示とそろえる。2026-11-20）
function inviteText(name,n){return `${san(name)}から、アイ・シンクの答え合わせのお誘いです！\n同じ${n}問に答えると、2人の価値観がどれだけ重なるかがわかります（約${minsOf(n)}分・無料）。`}
// ひとりの結果の下：この問題で、だれかと答え合わせ
function inviteCard(G,p){const n=G.qs.length,nm=['あなた','ともだち'].includes(p.name)?(store('kv_name')||''):p.name;
  return `<section class="hero-pt invite-hero"><span class="hp-tag">次は、この${n}問で答え合わせ</span>
    <p class="hp-q">大事な人に送ると、<br>2人のシンクロ率がわかります</p>
    <p class="hint">相手が同じ${n}問に答えるだけ。同じ時間に開いていなくても大丈夫です。</p>
    <label class="one-name" for="inv-name"><span>あなたのニックネーム（相手に出ます）</span><input type="text" id="inv-name" maxlength="10" value="${esc(nm)}"></label>
    <a class="btn line" id="inv-line" href="#" target="_blank" rel="noopener">LINEで答え合わせに誘う</a>
    <button class="btn ghost small" id="inv-share">ほかのアプリで送る</button><p class="hint" id="inv-msg" hidden></p>
    <p class="hint hp-note">あなたの答えは、相手が答え終わるまで見えません。答えた人との結果は、このスマホのトップに${IBX_DAYS}日間届きます（答えた人どうしは、おたがいの結果を見られません）。</p>
    <button class="btn ghost small" id="tog">みんなで診断する（部屋を作る）</button></section>${notifyCard(G,p)}`}
// 相手が答えたらメールでお知らせ（任意・いまは形だけ。tools/notify_email.js）。目印＝答え合わせのリンクの id（届く答え合わせと同じ）
function notifyCard(G,p){if(!window.PkNotify)return'';return window.PkNotify.card({kind:'with',days:IBX_DAYS,ref:()=>{const nm=($('inv-name')&&$('inv-name').value.trim())||store('kv_name')||'';if(!nm)return'';return ibxId(G,p,nm)||window.PkNotify.refOf(withLink(nm,G.qs,p.ans,''))}})}
// 答え合わせのリンクから答えた人の結果の下：送ってくれた人に結果を返す／同じ問題のまま、ほかの人も誘う
// 答え合わせのリンクから答えた人：2人の結果は自動で相手のスマホに届く（答え合わせが届く・2026-11-18〜）。
// 届いたときは1行だけ。届かなかったとき（古いリンク・通信の失敗）だけ「送り返す」枠を出す（鑑定者本人 2026-11-20「今ここで出す必要があるか」）
function backFullHTML(G,top){const A=G.players[0];
  return `<section class="card send-pt${top?' back-top':''}"><p class="pt-h"><em class="g">送る</em>${esc(A.name)}さんにも結果を送る</p>
    <p class="hint">${top&&!G.view?`${esc(A.name)}さんには、まだ届いていません。送ったリンクを開くと、${esc(A.name)}さんにも同じ結果が出ます。`:`送ったリンクを開くと、${esc(A.name)}さんにもこの結果が出ます。`}</p>
    <a class="btn line" id="back-line" href="#" target="_blank" rel="noopener">LINEで送る</a>
    <button class="btn ghost small" id="back-share">ほかのアプリで送る</button><p class="hint" id="back-msg" hidden></p></section>`}
function backOkHTML(G,st){const A=esc(G.players[0].name);
  return `<p class="back-ok${st?' ok':''}">${st?`<b>✓ ${A}さんのスマホにも、この結果が届きました</b><span>${A}さんがアイ・シンクを開くと見られます。</span>`:`<b>${A}さんのスマホに、この結果を届けています…</b>`}</p>
    <p class="back-also">${st?`<a class="btn line line-w small" id="back-line" href="#" target="_blank" rel="noopener">LINEでも知らせる</a><button class="btn ghost small" id="back-share" hidden></button><span class="hint" id="back-msg" hidden></span>`:''}</p>`}
function backDone(G,ok){const s=$('back-slot');if(!s)return;
  if(ok){s.innerHTML=backOkHTML(G,true)}else{s.innerHTML=backFullHTML(G,true)}bindBack(G)}
function pairBackCard(G,part){const A=G.players[0],me=G.players[1],n=G.qs.length;
  const back=backFullHTML(G,part===true);
  if(part===true)return G.ibx&&!G.view?`<div id="back-slot">${backOkHTML(G,false)}</div>`:back;
  return `${G.backTop?'':back}
  <section class="card invite"><p class="label">この${n}問で、ほかの人とも答え合わせ</p>
    <p class="hint">あなたの答えを入れたリンクを、ほかの友だちにも送れます。</p>
    <a class="btn line line-w small" id="inv-line" href="#" target="_blank" rel="noopener">LINEで答え合わせに誘う</a>
    <button class="btn ghost small" id="inv-share">ほかのアプリで送る</button><p class="hint" id="inv-msg" hidden></p></section>`}
function sendVia(text,url,msgEl){url=lx(url);
  if(navigator.share){navigator.share({title:'アイ・シンク（I-Sync）',text,url}).catch(()=>{});return}
  const full=text+'\n'+url;msgEl.hidden=false;
  try{navigator.clipboard.writeText(full).then(()=>{msgEl.textContent='文とリンクをコピーしました。LINEなどに貼って送ってください。'},()=>{msgEl.textContent=full})}catch(e){msgEl.textContent=full}}
function bindInvite(G){const t3g=$('t3-go');if(t3g)t3g.onclick=()=>{const h=document.querySelector('.invite-hero');if(h)h.scrollIntoView({behavior:'smooth',block:'start'})};
  const me=G.players.find(p=>p.id===G.me)||G.players[0],n=G.qs.length;
  const myName=()=>{const i=$('inv-name');const v=i?i.value.trim():'';if(v){store('kv_name',v);return v}return ['あなた','ともだち'].includes(me.name)?(store('kv_name')||''):me.name};
  // ニックネームがないと、相手の画面が「ともだちさんから…」になってわかりにくいので、先に入れてもらう
  const need=e=>{if(myName())return false;if(e)e.preventDefault();const m=$('inv-msg'),i=$('inv-name');if(m){m.hidden=false;m.textContent='先にニックネームを入れてください（相手の画面に「○○さんから」と出ます）。'}if(i)i.focus();return true};
  const inv=()=>({t:inviteText(myName(),n),u:withLink(myName(),G.qs,me.ans,ibxId(G,me,myName()))});
  const il=$('inv-line');if(il){const set=()=>{const x=inv();il.href=lineUrl(x.t,x.u)};set();il.addEventListener('click',e=>{if(!need(e))set()});const nmI=$('inv-name');if(nmI)nmI.addEventListener('input',set)}
  const is=$('inv-share');if(is)is.onclick=()=>{if(need())return;const x=inv();sendVia(x.t,x.u,$('inv-msg'))};
  if(G.pair)bindBack(G)}
function bindBack(G){const A=G.players[0],me=G.players.find(p=>p.id===G.me)||G.players[1],pct=pairStat(A,me,G.qs).pct,t=`${san(me.name)}が答え終わりました！\n2人のシンクロ率は ${pct}% でした。くわしい結果はこちら`,u=pairLink(A,me,G.qs);
    const bl=$('back-line');if(bl){bl.href=lineUrl(t,u);bl.addEventListener('click',e=>{if(pkCanFiles()){e.preventDefault();saveImage(G,t+'\n'+u)}})}const bs=$('back-share');if(bs)bs.onclick=()=>sendVia(t,u,$('back-msg'))}
// 答え合わせのリンクを開いた人：説明 → ニックネーム → 同じ問題に答える
function withStart(x){
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  const n=x.qs.length;
  view(`${tnav('w-top')}<section class="card hand"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    <p class="big">${esc(x.name)}さんから、答え合わせのお誘いです</p>
    <p class="hint">${esc(x.name)}さんが答えた${n}問に、あなたも答えてください（約${minsOf(n)}分）。答え終わると、2人の答えがどれだけ重なるかがわかります。</p>
    <p class="hint">${esc(x.name)}さんの答えは、あなたが答え終わるまで見えません。</p>
    ${x.id?`<p class="ib-note">答え終わると、2人の結果は${esc(x.name)}さんにも届きます（ほかの人には見えません）。</p>`:''}
    <label class="one-name" for="wn" style="align-self:stretch;text-align:left"><span>ニックネーム</span><input type="text" id="wn" maxlength="10" value="${esc(store('kv_name')||'')}"></label>
    <p class="hint" id="wmsg" hidden>ニックネームを入れてください（2人の結果に出ます）。</p>
    <button class="btn" id="wgo" style="align-self:stretch">答えはじめる</button>
    <button class="btn ghost small" id="wtop">アイ・シンクのトップを見る</button></section>`);
  $('wgo').onclick=()=>{const v=$('wn').value.trim();if(!v){$('wmsg').hidden=false;$('wn').focus();return}store('kv_name',v);
    Object.assign(L,{counts:undefined,mode:'pair',qs:x.qs,players:[{id:'me',name:v||'ともだち',ans:{}}],partner:{id:'p',name:x.name,ans:x.ans,ibx:x.id||''},p:0,i:0});localAsk()};
  $('wtop').onclick=goTop;$('w-top').onclick=goTop}
// 結果のリンク（送り返された結果）を開いた人
function pairView(x){
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  L.players=[];showResult({players:[x.A,x.B],qs:x.qs,me:'a',anon:false,local:true,view:true})}

/* ===== 答え合わせが届く（送った人のトップに、答えた人の結果を10日間） =====
   送った人：リンクに目印（12文字）を入れ、このスマホの kv_sent に目印・問題・自分の答えを覚える。
   答えた人：答え終わったら、isync_inbox/<目印>/r/<番号> にニックネームと答え（送るのはこの2つと時刻だけ）。
   一覧は目印を知っている送った人の画面にだけ出す。10日すぎたものは読むときに消す */
const IBX_ID=/^[0-9a-z]{12}$/,IBX_DAYS=10,IBX_MS=IBX_DAYS*864e5;
const rid=n=>{const c='0123456789abcdefghijklmnopqrstuvwxyz';let s='';const a=new Uint8Array(n);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<n;i++)a[i]=Math.random()*256}a.forEach(x=>s+=c[x%36]);return s};
function ibxSent(){const now=Date.now();return(store('kv_sent')||[]).filter(x=>x&&IBX_ID.test(x.id)&&now-x.at<IBX_MS)}
function ibxId(G,p,name){if(WHERE==='claude'||!window.ISYNC_FB||!window.ISYNC_FB.projectId)return'';
  if(!G.ibx)G.ibx=rid(12);const k=keysOf(G.qs),c=codesOf(G.qs,p.ans),l=ibxSent().filter(x=>x.id!==G.ibx);
  const old=(store('kv_sent')||[]).find(x=>x&&x.id===G.ibx);
  l.push({id:G.ibx,k,c,n:name||'',at:old?old.at:Date.now()});store('kv_sent',l.slice(-20));return G.ibx}
// 届けられたら true（届かなかったときは、送り返す枠を出す）
async function inboxSend(id,me,qs){if(!id)return false;let db;try{db=await getDb()}catch(e){return false}if(!db)return false;
  const put=c=>db.doc('inbox/'+id+'/r/'+rid(10)).set({name:(me.name||'ともだち').slice(0,10),codes:c,at:Date.now()});
  const c=codesOf(qs,me.ans);try{await put(c);return true}catch(e){if(c.includes('u'))try{await put(c.replace(/u/g,'-'));return true}catch(e2){}}return false}
// 送った人：届いた結果を集める（10日すぎたものは消す）
async function inboxLoad(){const sent=ibxSent();if(!sent.length)return[];const db=await getDb();if(!db)return[];
  const out=[];await Promise.all(sent.map(async s=>{let g;try{g=await db.collection('inbox/'+s.id+'/r').get()}catch(e){return}
    const qs=s.k.split('.').map(k=>KEY5.has(k)?KEY5.get(k):-1);if(!qs.length||qs.some(i=>i<0)||s.c.length!==qs.length)return;
    g.docs.forEach(d=>{const v=d.data()||{};if(Date.now()-(v.at||0)>IBX_MS){db.doc('inbox/'+s.id+'/r/'+d.id).delete().catch(()=>{});return}
      if(typeof v.codes!=='string'||v.codes.length!==qs.length||!/^[0-5u-]+$/.test(v.codes))return;
      out.push({key:s.id+'/'+d.id,s,qs,name:String(v.name||'ともだち').slice(0,10),ans:[...v.codes].map(ansDecode),at:v.at||0})})}));
  return out.sort((a,b)=>b.at-a.at)}
function ibxPair(x){const me=x.s.n||store('kv_name')||'あなた';
  return{qs:x.qs,A:{id:'a',name:me,ans:[...x.s.c].map(ansDecode)},B:{id:'b',name:x.name,ans:x.ans}}}
async function inboxBanner(){const box=$('ibx');if(!box||!ibxSent().length)return;
  const got=await inboxLoad();if(!got.length||!document.body.contains(box))return;
  const seen=new Set(store('kv_ibseen')||[]),nw=got.filter(x=>!seen.has(x.key)).length;
  const names=[...new Set(got.map(x=>x.name))];
  const nm=names.slice(0,2).map(n=>n+'さん').join('・')+(names.length>2?'ほか':'');
  box.innerHTML=`<button class="ib-ban" id="ibgo"><i class="ib-dot" aria-hidden="true"></i><span class="ib-t"><b>${got.length}人から、答え合わせが届きました</b><span>${esc(nm)}</span></span><span class="ib-go" aria-hidden="true">›</span></button>`;
  box.hidden=false;$('ibgo').onclick=()=>inboxView(got)}
function inboxView(got){
  store('kv_ibseen',got.map(x=>x.key).slice(-200));
  const groups=[];got.forEach(x=>{let g=groups.find(y=>y.s.id===x.s.id);if(!g)groups.push(g={s:x.s,xs:[]});g.xs.push(x)});
  const md=t=>{const d=new Date(t);return(d.getMonth()+1)+'月'+d.getDate()+'日'};
  const row=x=>{const P=ibxPair(x),G={players:[P.A,P.B],qs:P.qs},pc=pairStat(P.A,P.B,P.qs).pct,tr=themeRows(G).filter(r=>r.q>=2);
    let t='';if(tr.length){const hi=tr.reduce((a,b)=>b.pct>a.pct?b:a),lo=tr.reduce((a,b)=>b.pct<a.pct?b:a);
      t=hi.pct<=0?`どのテーマも分かれました`:hi.pct>=60?`よく重なった：${hi.name}`:`分かれた：${lo.name}`}
    return `<button class="ib-row" data-k="${esc(x.key)}"><span class="ib-r" style="--p:${pc}%"><i>${pc}%</i></span><span class="ib-n"><b>${esc(x.name)}さん${pc>=HIGH_SYNC?'<span class="ib-hs">HIGH SYNC</span>':''}</b><span>${esc(t||md(x.at)+'に届きました')}</span></span><span class="ib-go" aria-hidden="true">›</span></button>`};
  view(`${tnav('ib-top')}<section class="card ibx"><p class="label">答え合わせの結果</p>
    ${groups.map(g=>`<p class="hint ib-h">${md(g.s.at)}に送った${g.s.k.split('.').length}問</p>${g.xs.map(row).join('')}`).join('')}
    <p class="ib-wait">まだ答えていない人もいます。答えると、ここに増えます。</p>
    <p class="ib-note">この一覧は、あなたにしか見えません。答えた人どうしは、おたがいの結果を見られません。届いた結果は${IBX_DAYS}日で消えます。</p>
    <button class="btn ghost small" id="ibtop">トップへ</button></section>`);
  document.querySelectorAll('.ib-row').forEach(b=>b.onclick=()=>{const x=got.find(y=>y.key===b.dataset.k);if(x)pairView(ibxPair(x))});
  $('ibtop').onclick=goTop;$('ib-top').onclick=goTop}

/* ===== みんなの答え（これまでに診断した人の割合） =====
   Firestore の isync_votes/<問題の目印> に、答えA・B・3つ目の数だけを1つずつ足す（名前は送らない）。同じスマホで同じ問題は1回だけ数える */
const VS_SLOT='<section class="card vs" id="vs" hidden></section>';
async function votesRun(G){
  const me=G.players.find(p=>p.id===G.me);if(!me||G.view)return;
  const db=await getDb();if(!db||!db.vote)return;
  const done=new Set(store('kv_voted')||[]),jobs=[];
  G.qs.forEach((k,i)=>{const a=me.ans[i];if(!a||a.o<0)return;const v='q'+QKEY[k];if(done.has(v))return;done.add(v);jobs.push(db.vote(v,'abc'[a.o]).catch(()=>{}))});
  store('kv_voted',[...done].slice(-2000));
  await Promise.all(jobs);
  let got;try{got=await db.votes(G.qs.map(k=>'q'+QKEY[k]))}catch(e){return}
  const rows=G.qs.map((k,i)=>{const c=got['q'+QKEY[k]]||{},cnt=[c.a||0,c.b||0,c.c||0],tot=cnt[0]+cnt[1]+cnt[2],a=me.ans[i];
    return{k,i,cnt,tot,o:a&&a.o>=0?a.o:-1,share:tot&&a&&a.o>=0?cnt[a.o]/tot:null}}).filter(r=>r.tot>=3&&r.o>=0);
  const el=$('vs');if(!el||!rows.length)return;
  const avg=Math.round(rows.reduce((s,r)=>s+r.share,0)/rows.length*100);
  if(G.players.length===1&&G.me==='me')histSetM(G,avg);
  {const t=$('tmaj');if(t){t.querySelector('em').textContent=avg+'%';t.hidden=false}}
  const msg=avg>=55?'みんなと感覚が近いタイプ':avg<=38?'少数派の答えが多い、個性派':'ほどよくバランスのとれたタイプ';
  const minor=rows.slice().sort((a,b)=>a.share-b.share).slice(0,3).filter(r=>r.share<0.5);
  const pc=x=>Math.round(x*100);
  const bar=r=>{const p=r.cnt.map(c=>pc(c/r.tot));return `<div class="vbar" aria-hidden="true">${p.map((v,j)=>v?`<i class="v${j}" style="width:${v}%"></i>`:'').join('')}</div>
    <p class="vleg">${[0,1,2].map(j=>`<span class="v${j}">${esc(ans(j,r.k))} ${p[j]}%</span>`).join('')}</p>`};
  el.innerHTML=`<p class="label">これまでに診断した人とくらべると</p>
    <p class="vtop">${G.players.length>1?'あなたの':''}多数派度 <b>${avg}%</b></p><p class="msg">${msg}</p>
    ${minor.length?`<p class="sub">少数派だった答え</p><ul class="list">${minor.map(r=>`<li><b>${esc(Q[r.k][1])}</b><span class="ansrow"><i class="o${r.o}">${esc(ans(r.o,r.k))}</i>同じ答えの人 ${pc(r.share)}%</span></li>`).join('')}</ul>`:''}
    <details><summary>1問ずつ、みんなの答えを見る</summary><ul class="list vlist">${rows.map(r=>`<li><b>${esc(Q[r.k][1])}</b>${bar(r)}${r.tot>=SHOW_COUNT?`<small>${r.tot}人が答えました</small>`:''}</li>`).join('')}</ul></details>
    <p class="hint">これまでにアイ・シンクで答えた人の割合です（答えの数だけを数えていて、名前などは送っていません）。</p>`;
  el.hidden=false;if(window.__jw)window.__jw(el)}

/* ===== あなたの平均（究極の二択と同じ。ひとりで遊んだ結果をスマホが覚えておき、最新20回の平均を出す。鑑定者本人の指示 2026-11-16） ===== */
function saveHist(G,p,pct){
  const id=G.qs.join('.'),h=(store('kv_hist')||[]).filter(r=>r&&r.id);
  if(!h.some(r=>r.id===id)){const ax={};AX.forEach(a=>{const s=axScore(p,G.qs,a);if(s)ax[a.key]=s.pct});h.push({id,f:pct,ax,m:null});store('kv_hist',h.slice(-20))}
  return store('kv_hist')||h}
function histHTML(h){
  if(!h||!h.length)return '';const n=h.length;
  if(n<2)return `<p class="hist-note">あなたの平均は、2回目から出ます</p>`;
  const av=xs=>xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length):null;
  const f=av(h.map(r=>r.f)),m=av(h.map(r=>r.m).filter(x=>x!=null)),mn=h.filter(r=>r.m!=null).length;
  const axs=AX.map(a=>({a,v:av(h.map(r=>r.ax&&r.ax[a.key]).filter(x=>x!=null))})).filter(x=>x.v!=null);
  const bar=(name,v,sub)=>`<li><span class="thn"><b>${esc(name)}</b>${sub?`<small>${esc(sub)}</small>`:''}</span><b>${v}%</b><div class="bar"><i style="width:${v}%"></i></div></li>`;
  return foldBox(`あなたの平均（${n}回ぶん）`,'診断するほど、あなたらしい数字に',`<ul class="thl">${bar('どっちでも合わせられる答え',f)}${m!=null?bar('多数派度',m,mn<n?mn+'回ぶん':''):''}</ul>
    ${axs.length?`<ul class="list havg">${axs.map(({a,v})=>`<li><b>${esc(a.name)}</b>${esc(axSide(a,v))}</li>`).join('')}</ul>`:''}`)}
function histSetM(G,m){const id=G.qs.join('.'),h=store('kv_hist')||[],r=h.find(x=>x&&x.id===id);if(!r||r.m!=null)return;r.m=m;store('kv_hist',h);const el=$('hist');if(el){el.innerHTML=histHTML(h);if(window.__jw)window.__jw(el)}}

/* ===== 結果を画像で保存（インスタのストーリーズの縦長 1080×1920） ===== */
/* 写真つきで送る（鑑定者本人 2026-11-22「2択とアイシンクも同じ形に」。LINEのURLプレビューがオフの人が多く、リンクだけでは絵が見えないため）：
   スマホで写真の共有ができるときは、結果の「LINEで結果を送る」「○○さんにも結果を送る」を押すと、結果の画像と、送る文＋リンクを一緒に共有の画面へ渡す（LINEを選ぶと写真と文の両方が届く）。
   パソコン・共有できない端末は今までどおり LINE の送る画面。招待のボタンは文だけのまま */
function pkCanFiles(){try{return !!(window.matchMedia&&matchMedia('(pointer:coarse)').matches&&navigator.canShare&&navigator.canShare({files:[new File(['x'],'a.png',{type:'image/png'})]}))}catch(e){return false}}
function pkShareAgain(file,text){
  let d=document.getElementById('pk-share-again');if(d)d.remove();
  d=document.createElement('div');d.id='pk-share-again';
  d.setAttribute('style','position:fixed;left:16px;right:16px;bottom:20px;z-index:9999;background:#fff;border:2px solid #BFB6E2;border-radius:22px;box-shadow:0 10px 28px rgba(42,37,89,.22);padding:16px;text-align:center;color:#2A2559;font-weight:700');
  d.innerHTML='<p style="margin:0 0 10px">画像ができました</p><button type="button" style="min-height:48px;width:100%;border-radius:999px;border:0;background:#06C755;color:#1E1E2A;font-weight:800;font-size:16px">送る（LINEを選んでね）</button><button type="button" style="margin-top:6px;min-height:44px;background:none;border:0;color:#4E4878;font-weight:700">閉じる</button>';
  document.body.appendChild(d);
  const bs=d.querySelectorAll('button');
  bs[0].onclick=()=>{d.remove();navigator.share({files:[file],text}).catch(()=>{})};
  bs[1].onclick=()=>d.remove()}
async function saveImage(G,text){
  const msg=$('imgmsg');msg.hidden=false;msg.textContent='画像を作っています…';
  try{
    try{await Promise.all(['900 60px "Zen Maru Gothic"','700 60px Quicksand','500 30px "Zen Kaku Gothic New"'].map(f=>document.fonts.load(f)))}catch(e){}
    const cv=document.createElement('canvas');cv.width=1080;cv.height=1920;const c=cv.getContext('2d');drawResult(c,G);
    const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
    const file=new File([blob],'i-sync.png',{type:'image/png'});
    if(!text){try{const x=shareText(G,store('kv_name')||'');text=x.t+'\n'+x.url}catch(e){}}
    if(navigator.canShare&&navigator.canShare({files:[file]})){msg.hidden=true;await navigator.share(text?{files:[file],text}:{files:[file],title:'アイ・シンク（I-Sync）'}).catch(e=>{if(e&&e.name!=='AbortError'&&text)pkShareAgain(file,text)});return}
    const url=URL.createObjectURL(blob);
    msg.innerHTML=`<img class="shot" src="${url}" alt="結果の画像">画像を長押しして保存してください。`;
  }catch(e){msg.textContent='画像を作れませんでした。画面のスクリーンショットで保存してください。'}}
function drawResult(c,G){
  const W=1080,H=1920,ps=G.players,solo=ps.length<2,ink='#2A2559',sub='#4E4878';
  const g=c.createLinearGradient(0,0,0,H);[['0','#5E5FA8'],['.24','#9A86C4'],['.5','#E3B3C8'],['.75','#F7D9C9'],['1','#FBEFEA']].forEach(([o,col])=>g.addColorStop(+o,col));
  c.fillStyle=g;c.fillRect(0,0,W,H);
  const F=(w,sz,fam)=>`${w} ${sz}px ${fam==='q'?'Quicksand,sans-serif':fam==='m'?'"Zen Maru Gothic",sans-serif':'"Zen Kaku Gothic New",sans-serif'}`;
  const T=(t,x,y,f,col,al='center')=>{c.font=f;c.fillStyle=col;c.textAlign=al;c.textBaseline='alphabetic';c.fillText(t,x,y)};
  const fit=(t,max,f)=>{c.font=f;if(c.measureText(t).width<=max)return t;while(t.length>1&&c.measureText(t+'…').width>max)t=t.slice(0,-1);return t+'…'};
  const rr=(x,y,w,h,r,col)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();c.fillStyle=col;c.fill()};
  // 輪のロゴと題名
  c.lineWidth=26;[['#8FE3CF',-0.6],['#A9B2F5',1.5],['#F4B6D6',3.6]].forEach(([col,a0])=>{c.strokeStyle=col;c.beginPath();c.arc(W/2,190,62,a0,a0+2.2);c.stroke()});
  T('I-Sync',W/2,370,F(700,110,'q'),'#FFFFFF');T('アイ・シンク　わたしとあなたの、重なるところ',W/2,430,F(700,34,'m'),'#FFFFFF');
  // 大きな数字のカード
  rr(80,490,920,620,48,'#FFFFFF');
  let pct,cap,who,msgT,sF=0,sN=0;
  if(solo){const p=ps[0],xs=G.qs.map((k,i)=>p.ans[i]).filter(a=>a&&a.o>=0),f=G.qs.filter((k,i)=>p.ans[i]&&isFlex(p.ans[i].o,k)).length;pct=xs.length?Math.round(f/xs.length*100):0;
    cap='わたしの価値観のかたち';who='';msgT=shapeWords(G,p);sF=f;sN=xs.length}
  else{pct=syncStat(G).pct;cap=ps.length===2?'2人のシンクロ率':ps.length+'人のシンクロ率';
    who=G.anon?'':ps.length===2?ps[0].name+' × '+ps[1].name:ps.slice(0,4).map(p=>p.name).join('・')+(ps.length>4?' ほか':'');
    msgT=syncMsg(pct,ps.length===2).msg}
  // くらべられる答えが1つもないとき（時間切れ・まだ決められないだけ）は 0% を出さない
  const none=!solo&&!ps.some((a,i)=>ps.slice(i+1).some(b=>pairStat(a,b,G.qs).n));
  if(!solo&&pct>=HIGH_SYNC&&!none)T('HIGH SYNC',W/2,545,F(700,30,'q'),'#6F72C9');
  T(cap,W/2,590,F(900,46,'m'),ink);
  if(who)T(fit(who,820,F(700,40,'m')),W/2,650,F(700,40,'m'),sub);
  if(none){T('くらべられる答えが',W/2,800,F(900,62,'m'),'#4B3C8F');T('ありませんでした',W/2,885,F(900,62,'m'),'#4B3C8F');
    T('時間切れの問題は、シンクロ率に数えていません',W/2,990,F(700,34,'k'),sub)}
  else if(solo){const ws=msgT.split('×');
    if(ws.length>1){T(fit(ws[0],820,F(900,84,'m')),W/2,800,F(900,84,'m'),ink);T('×',W/2,880,F(700,52,'q'),'#7A72AE');T(fit(ws[1],820,F(900,84,'m')),W/2,975,F(900,84,'m'),ink)}
    else T(fit(msgT,840,F(900,58,'m')),W/2,880,F(900,58,'m'),ink);
    T(sF+'／'+sN+'問は「どっちでも合わせられる」',W/2,1065,F(700,34,'k'),sub)}
  else{T(pct+'%',W/2,880,F(700,230,'q'),ink);
    T(fit(msgT,840,F(900,44,'m')),W/2,1000,F(900,44,'m'),'#4B3C8F')}
  // 下のカード：テーマ別（2人以上）／価値観のタイプ（ひとり）
  rr(80,1150,920,560,48,'#FFFFFF');
  if(solo){T('わたしの価値観のタイプ',W/2,1240,F(900,42,'m'),ink);
    const rows=axRows(G,[ps[0]]).slice(0,4);rows.forEach(({a,xs},j)=>{const y=1310+j*100,pc=xs[0].s.pct;
      T(a.l,140,y,F(700,30,'k'),ink,'left');T(a.r,940,y,F(700,30,'k'),ink,'right');
      rr(140,y+20,800,18,9,'#E2DDF5');c.beginPath();c.arc(140+800*(100-pc)/100,y+29,22,0,7);c.fillStyle='#4B3C8F';c.fill();c.lineWidth=6;c.strokeStyle='#fff';c.stroke()})}
  else if(none||!themeRows(G).length){T('もう一度、診断してみよう',W/2,1290,F(900,46,'m'),ink);
    ['同じ問題に2人で答えると、','どこが重なって、どこがちがうかが','テーマごとにわかります。'].forEach((t,j)=>T(t,W/2,1380+j*62,F(700,36,'k'),sub));
    T('1問15秒・答えないと時間切れになります',W/2,1610,F(700,32,'k'),'#4B3C8F')}
  else{T('テーマ別のシンクロ率',W/2,1240,F(900,42,'m'),ink);
    themeRows(G).slice(0,6).forEach((r,j)=>{const y=1310+j*66;T(r.name,140,y,F(700,32,'k'),ink,'left');T(r.pct+'%',940,y,F(700,34,'q'),ink,'right');
      rr(420,y-22,400,22,11,'#E2DDF5');if(r.pct)rr(420,y-22,Math.max(22,400*r.pct/100),22,11,'#9A86C4')})}
  T('#アイシンク　2人の価値観を答え合わせ',W/2,1800,F(900,40,'m'),ink);
  T(siteUrl().replace(/^https?:\/\//,'').replace(/\/$/,''),W/2,1860,F(700,32,'q'),sub);
}

/* ===== みんなのスマホで（部屋・10人まで） ===== */
const ART_URL='https://claude.ai/artifact/AdtUnSrAdJDGECVQmtHSht';  // 確認用ページ（claude.ai）のときだけQRの行き先にする
let WHERE='';  // 'claude'＝確認用ページ／'firebase'＝公開先
let PID=store('kv_pid')||(()=>{const p='p'+Math.random().toString(36).slice(2,10);store('kv_pid',p);return p})();
const R={code:null,room:undefined,players:{},un:[],key:'',seen:{},adv:{},tick:null,my:null,poll:null};
let dbP=null;
function getDb(){if(!dbP)dbP=(async()=>{
  try{if(window.claude&&typeof claude.use==='function'){const d=await claude.use('db');if(d){WHERE='claude';return d}}}catch(e){}
  try{const f=await FB.init();if(f){WHERE='firebase';return f}}catch(e){}
  return null})();return dbP}

/* Firebase（Firestore）：公開先で部屋を共有する。firebase-config.js に設定があるときだけ使う。
   ほかのサイトとまざらないよう、置き場所の名前の頭に「isync_」を付ける（rooms → isync_rooms）。
   読む・書くはふつうの通信（Firestore の REST）で行う。Gmail・LINE などのアプリの中の画面では Firebase の道具のつなぎ方が止められ、
   部屋が作れない・つながらないことがあったため（鑑定者本人 2026-11-17。恋のかたち診断と同じ直し）。変わったときの知らせ（onSnapshot）だけは道具を後から読んで使い、届かなくても2秒ごとの確認で追いつく */
const FB=(()=>{
  let ready=null,sdkP=null,base='',key='';
  const load=src=>new Promise((ok,ng)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ng;document.head.appendChild(s)});
  const P=p=>'isync_'+p;
  const clean=d=>JSON.parse(JSON.stringify(d||{}));   // 空の値（undefined）を取りのぞく
  // 消す日（expireAt。Firestore の TTL をこの欄に設定すると自動で消える）：部屋と、部屋に入った人（ニックネーム・答え）＝部屋を作ってから10日／番号の表＝12時間／答え合わせ＝10日（鑑定者本人 2026-11-20「10日にそろえる」）
  const ttl=(path,d)=>{let m;
    if((m=/^rooms\/([0-9a-z-]+)$/.exec(path))){const c=d.created||d.joined||Date.now();ROOM_CR[m[1]]=c;return Object.assign({},d,{expireAt:new Date(c+ROOM_MS)})}
    if((m=/^rooms\/([0-9a-z-]+)\/players\//.exec(path)))return Object.assign({},d,{expireAt:new Date((ROOM_CR[m[1]]||d.joined||Date.now())+ROOM_MS)});
    if(/^codes\//.test(path))return Object.assign({},d,{expireAt:new Date((d.created||Date.now())+H12)});
    if(/^inbox\//.test(path))return Object.assign({},d,{expireAt:new Date((d.at||Date.now())+IBX_MS)});
    return d};
  const strip=d=>{if(d){d=Object.assign({},d);delete d.expireAt}return d};
  const enc=v=>v===null||v===undefined?{nullValue:null}:v instanceof Date?{timestampValue:v.toISOString()}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?(Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v}):typeof v==='string'?{stringValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(enc)}}:{mapValue:{fields:encF(v)}};
  const encF=o=>{const f={};Object.keys(o).forEach(k=>{if(o[k]!==undefined)f[k]=enc(o[k])});return f};
  const dec=v=>!v?null:'nullValue' in v?null:'booleanValue' in v?v.booleanValue:'integerValue' in v?Number(v.integerValue):'doubleValue' in v?v.doubleValue:'stringValue' in v?v.stringValue:'timestampValue' in v?new Date(v.timestampValue):'arrayValue' in v?(v.arrayValue.values||[]).map(dec):'mapValue' in v?decF(v.mapValue.fields):null;
  const decF=f=>{const o={};Object.keys(f||{}).forEach(k=>o[k]=dec(f[k]));return o};
  const mask=ks=>ks.map(k=>'updateMask.fieldPaths='+encodeURIComponent(k)).join('&');
  async function rq(method,path,body,q){
    const ac=typeof AbortController==='function'?new AbortController():null,tm=ac&&setTimeout(()=>ac.abort(),12000);
    try{const r=await fetch((path===':commit'?base.replace(/\/$/,''):base)+path+'?key='+key+(q?'&'+q:''),{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:ac&&ac.signal,cache:'no-store'});
      if(r.status===404&&method==='GET')return null;
      const j=await r.json().catch(()=>({}));if(!r.ok){const er=new Error((j.error&&j.error.message)||('HTTP '+r.status));er.status=r.status;throw er}return j}
    finally{tm&&clearTimeout(tm)}}
  const snap=(id,doc)=>({id,exists:!!doc,data:()=>doc?strip(decF(doc.fields)):undefined});
  // 変わったときの知らせだけ、Firebase の道具を後から読んで使う（読めない画面では使わない）
  function sdk(cfg){if(!sdkP)sdkP=(async()=>{try{if(!window.firebase||!firebase.firestore){await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js')}
    const app=(firebase.apps||[]).find(a=>a.name==='isync')||firebase.initializeApp(cfg,'isync');const fs=app.firestore();
    try{fs.settings({experimentalAutoDetectLongPolling:true,merge:true})}catch(e){}return fs}catch(e){return null}})();return sdkP}
  function live(make,cb,err){let off=false,un=null;sdk(window.ISYNC_FB).then(fs=>{if(off||!fs)return;try{un=make(fs).onSnapshot(cb,err)}catch(e){}});return()=>{off=true;if(un)try{un()}catch(e){}}}
  function wrap(){return{
    doc(path){const p=P(path),id=path.split('/').pop();return{
      get:()=>rq('GET',p).then(d=>snap(id,d)),
      set:d=>rq('PATCH',p,{fields:encF(ttl(path,clean(d)))}),
      update:d=>{const c=clean(d);return rq('PATCH',p,{fields:encF(c)},mask(Object.keys(c))+'&currentDocument.exists=true')},
      delete:()=>rq('DELETE',p),
      onSnapshot:(cb,err)=>live(fs=>fs.doc(p),s=>cb({id:s.id,exists:s.exists,data:()=>strip(s.data())}),err)}},
    async vote(k,f){const name='projects/'+window.ISYNC_FB.projectId+'/databases/(default)/documents/'+P('votes/'+k);
      return rq('POST',':commit',{writes:[{transform:{document:name,fieldTransforms:[{fieldPath:f,increment:{integerValue:'1'}}]}}]})},
    // 部屋を作る：番号の表（codes/番号＝いまこの番号を使っている部屋の印）・部屋（rooms/番号-印）・自分を1回の通信でまとめて書く。
    // 番号の表は、その番号がまだない／12時間たった番号のときだけ書けるので、2人が同時に同じ番号を引いても上書きしない（2026-11-19）。
    // 部屋の置き場所は毎回ちがう名前なので、番号を使い回しても、前に送ったリンク（番号-印）は10日のあいだ前の部屋につながる（2026-11-20）
    async mkRoom(code,room,pid,me){const nm=x=>'projects/'+window.ISYNC_FB.projectId+'/databases/(default)/documents/'+P(x),key=code+'-'+newTag(),rp='rooms/'+key,cp='codes/'+code;
      const ix=await rq('GET',P(cp));let pre={exists:false};
      if(ix){const x=decF(ix.fields);if(Date.now()-(x.created||0)<H12)return 'taken';pre={updateTime:ix.updateTime}}
      const writes=[{update:{name:nm(cp),fields:encF(ttl(cp,{tag:key.split('-')[1],created:room.created}))},currentDocument:pre},
        {update:{name:nm(rp),fields:encF(ttl(rp,clean(room)))},currentDocument:{exists:false}},
        {update:{name:nm(rp+'/players/'+pid),fields:encF(ttl(rp+'/players/'+pid,clean(me)))}}];
      try{await rq('POST',':commit',{writes});return key}catch(e){if(e&&(e.status===409||e.status===400||e.status===412))return 'taken';throw e}},
    async stat(f){const name='projects/'+window.ISYNC_FB.projectId+'/databases/(default)/documents/'+P('stats/plays');
      return rq('POST',':commit',{writes:[{transform:{document:name,fieldTransforms:[{fieldPath:f,increment:{integerValue:'1'}}]}}]})},
    votes(keys){return Promise.all(keys.map(k=>rq('GET',P('votes/'+k)).then(d=>[k,d?decF(d.fields):null]).catch(()=>[k,null]))).then(Object.fromEntries)},
    collection(path){const p=P(path);return{
      get:()=>rq('GET',p,null,'pageSize=300').then(j=>({docs:((j&&j.documents)||[]).map(d=>snap(d.name.split('/').pop(),d))})),
      onSnapshot:(cb,err)=>live(fs=>fs.collection(p),q=>cb({docs:q.docs.map(d=>({id:d.id,exists:true,data:()=>strip(d.data())}))}),err)}}}}
  function init(){
    if(ready)return ready;
    ready=(async()=>{const cfg=window.ISYNC_FB;if(!cfg||!cfg.projectId||typeof fetch!=='function')return null;
      base='https://firestore.googleapis.com/v1/projects/'+cfg.projectId+'/databases/(default)/documents/';key=encodeURIComponent(cfg.apiKey);
      sdk(cfg);return wrap()})();
    return ready}
  return{init};
})();
const NO_DB='この画面では、みんなで診断する部屋が使えません。Safari・Chromeで開きなおすか、「ひとりで」で診断してください。';
const pPath=(c,id)=>'rooms/'+c+'/players/'+id;
/* ===== 部屋の有効期限（鑑定者本人 2026-11-20「3つのサイトで作ってから10日にそろえる」。究極の二択と同じ決まり） =====
 * ① 作ってから12時間までは、みんなでそろって「スタート」で一斉に始まる（悩み中・決めた！）
 * ② 結果が出たあと、または12時間をすぎたあとにリンクを開いた人は、同じ問題にひとりで答えて、みんなの結果に加わる
 * ③ 10日をすぎたら「この部屋は終わりました」
 * ④ 部屋とニックネーム・答えは、作ってから10日で消す日（expireAt）を書く
 * ⑤ 部屋番号を手で入れて入れるのは12時間まで。リンクは「番号-見分けの印」なので、番号が使い回されても10日のあいだはもとの部屋につながる */
const H12=12*3600e3,ROOM_DAYS=10,ROOM_MS=ROOM_DAYS*864e5,ROOM_CR={};
const dcode=k=>String(k||'').split('-')[0];
const newTag=()=>{let x='';while(x.length<6)x+=Math.random().toString(36).slice(2).replace(/[^a-z0-9]/g,'');return x.slice(0,6)};
const alive=r=>r&&Date.now()-(r.created||0)<ROOM_MS;
// live＝一緒に診断（12時間まで・結果の前）／late＝同じ問題にひとりで答えて結果に加わる／ended＝終わった（10日すぎ・12時間すぎても始まらなかった）／none＝見つからない（番号を手で入れたときは12時間まで）
function rState(r,typed){if(!r||!r.created)return 'none';const age=Date.now()-r.created;
  if(age>=ROOM_MS)return 'ended';if(typed&&age>=H12)return 'none';
  if(r.kind==='kon')return age>=H12?'ended':'live';
  if(r.phase==='result')return 'late';
  if(age>=H12)return r.phase==='play'?'late':'ended';
  return 'live'}
// 番号・リンクから部屋の置き場所の名前を決める。印つきならそのまま。番号だけ：リンク（前の形のリンク）は前の形の部屋があればそれ、なければ番号の表から12時間以内の部屋
async function resolveRoom(raw,link){raw=String(raw||'');if(raw.includes('-'))return raw;const db=await getDb();if(!db)return raw;
  try{if(link){const s=await db.doc('rooms/'+raw).get();if(s.exists)return raw}
    const ix=await db.doc('codes/'+raw).get();if(ix.exists){const x=ix.data()||{};if(x.tag&&Date.now()-(x.created||0)<H12)return raw+'-'+x.tag}
    if(!link){const s=await db.doc('rooms/'+raw).get();if(s.exists&&Date.now()-((s.data()||{}).created||0)<H12)return raw}}catch(e){}
  return raw}
// 確認用ページなど（まとめて書けないとき）：番号の表を見て、空いている番号に印を付けて取る
async function pickKey(db){for(let t=0;t<8;t++){const c=String(1000+Math.floor(Math.random()*9000));
    const s=await db.doc('codes/'+c).get();if(s.exists&&Date.now()-((s.data()||{}).created||0)<H12)continue;
    const key=c+'-'+newTag();await db.doc('codes/'+c).set({tag:key.split('-')[1],created:Date.now()});return key}
  return ''}
const ENDED_MSG='部屋のリンクは、作ってから10日まで使えます。送ってくれた人に、新しい部屋か答え合わせのリンクを送ってもらってください。';
function endedView(){view(`${tnav('en-top')}<section class="card hand"><img class="chara c-mid" src="img/pair-think.webp" width="200" height="127" alt="" aria-hidden="true"><p class="big">この部屋は終わりました</p><p class="hint">${ENDED_MSG}</p><button class="btn" id="en-solo" style="align-self:stretch">ひとりで診断する</button><button class="btn ghost" id="en-go" style="align-self:stretch">トップへ</button></section>`);
  $('en-top').onclick=goTop;$('en-go').onclick=goTop;$('en-solo').onclick=()=>soloStart(store('kv_name')||'')}
const plist=()=>Object.entries(R.players).map(([id,p])=>Object.assign({id},p)).sort((a,b)=>(a.joined||0)-(b.joined||0));
async function createRoom(name){
  const db=await getDb();if(!db)return NO_DB;
  try{
    if(db.mkRoom){const now=Date.now(),room={created:now,round:1,phase:'lobby',qi:0,qs:deal(CFG.len,CFG.topic),len:CFG.len,topic:CFG.topic,anon:CFG.anon},me={name,ans:{},round:1,joined:now,ready:true};
      for(let t=0;t<8;t++){const c=String(1000+Math.floor(Math.random()*9000)),k=await db.mkRoom(c,room,PID,me);if(k&&k!=='taken'){enterRoom(k);return 'ok'}}
      return '部屋を作れませんでした。もう一度押してください。'}
    const code=await pickKey(db);
    if(!code)return '部屋を作れませんでした。もう一度押してください。';
    await db.doc('rooms/'+code).set({created:Date.now(),round:1,phase:'lobby',qi:0,qs:deal(CFG.len,CFG.topic),len:CFG.len,topic:CFG.topic,anon:CFG.anon});
    await db.doc(pPath(code,PID)).set({name,ans:{},round:1,joined:Date.now(),ready:true});
    enterRoom(code);return 'ok';
  }catch(e){return '部屋を作れませんでした。この画面では書きこみが許可されていないかもしれません。'}
}
async function createKonRoom(){
  const db=await getDb();if(!db)return NO_DB;
  try{
    const code=await pickKey(db);
    if(!code)return '部屋を作れませんでした。もう一度押してください。';
    // 主催者は答えない（部屋の画面＝QR・人数・スタートだけ）
    await db.doc('rooms/'+code).set({created:Date.now(),round:1,phase:'lobby',qi:0,qs:dealKon(KON_LEN),len:KON_LEN,topic:'kon',anon:true,kind:'kon',host:PID});
    enterRoom(code);return 'ok';
  }catch(e){return '部屋を作れませんでした。この画面では書きこみが許可されていないかもしれません。'}
}
async function joinKon(code,f){
  const db=await getDb();if(!db)return NO_DB;
  try{
    const rs=await db.doc('rooms/'+code).get();
    if(rState(rs.exists?rs.data():null)!=='live')return 'その番号の部屋が見つかりません。番号を確かめてください。';
    const room=rs.data(),ps=await db.collection('rooms/'+code+'/players').get();
    if(!ps.docs.some(d=>d.id===PID)){
      if(ps.docs.length>=KON_MAX)return 'この部屋は、もう'+KON_MAX+'人そろっています。';
      if(ps.docs.some(d=>String((d.data()||{}).no)===String(f.no)))return 'その番号は、もう使われています。番号札を確かめてください。';
      await db.doc(pPath(code,PID)).set({name:'',no:String(f.no),sex:f.sex,want:f.want,ans:{},round:room.round||1,joined:Date.now(),ready:true});
    }
    enterRoom(code);return 'ok';
  }catch(e){return '参加できませんでした。この画面では書きこみが許可されていないかもしれません。'}
}
async function joinRoom(code,name,force,typed){
  const db=await getDb();if(!db)return NO_DB;
  try{
    if(typed)code=await resolveRoom(code,false);   // 番号を手で入れたとき：12時間以内の部屋だけ
    const rs=await db.doc('rooms/'+code).get(),st=rState(rs.exists?rs.data():null,typed);
    if(st==='none')return typed?'その番号の部屋が見つかりません。番号で入れるのは、部屋ができてから12時間までです。':'その部屋が見つかりません。';
    if(st==='ended')return 'この部屋は終わりました。'+ENDED_MSG;
    const room=rs.data(),ps=await db.collection('rooms/'+code+'/players').get();
    if(room.host===PID){enterRoom(code);return 'ok'}   // 婚活の部屋を作った主催者
    if(room.kind==='kon'&&!ps.docs.some(d=>d.id===PID)){joinFromLink(code);return 'ok'}
    if(st==='late'&&!ps.docs.some(d=>d.id===PID)){lateJoin(code,room);return 'ok'}
    if(!ps.docs.some(d=>d.id===PID)){
      if(!name)return 'ニックネームを入れてください';
      // 同じ名前の人がもういる＝部屋を作った人が、自分で送ったLINEのリンクを開いたことが多い（LINEの中の画面は別のブラウザあつかい）
      const sm=!force&&ps.docs.find(d=>String((d.data()||{}).name||'').trim()===String(name).trim());
      if(sm){sameAsk(code,name,sm.id,(sm.data()||{}).name);return 'ok'}
      if(ps.docs.length>=MAXP)return 'この部屋は、もう'+MAXP+'人そろっています。';
      await db.doc(pPath(code,PID)).set({name,ans:{},round:room.round||1,joined:Date.now(),ready:true});
    }
    enterRoom(code);return 'ok';
  }catch(e){return '参加できませんでした。この画面では書きこみが許可されていないかもしれません。'}
}
async function enterRoom(code){
  leaveRoom(true);
  Object.assign(R,{code,key:'',room:undefined,players:{},seen:{},adv:{},my:null,snapAt:0});store('kv_room',{code});
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}JOIN='';
  view(tnav('cn-top','やめてトップへ')+'<section class="card hand"><p class="hint">部屋につないでいます…</p></section>');
  $('cn-top').onclick=()=>{leaveRoom();goTop()};
  await subscribe();
  R.last=Date.now();pull(true);R.poll=setInterval(()=>pull(),2000);   // 知らせが止まっても取り残されないよう、2秒ごとに自分からも確かめる
  setTimeout(()=>connWatch(code),6000);
}
/* 「部屋につないでいます…」のまま止まらないように：
   部屋はあるのに自分が入っていない → 参加の画面へ／つながらない → もう一度つなぐ・トップへ */
function connWatch(code){
  if(R.code!==code||R.key)return;
  if(R.room&&alive(R.room)&&!R.players[PID]&&R.room.host!==PID){leaveRoom();joinFromLink(code);return}
  view(`<section class="card hand"><p class="big">部屋にうまくつながりません</p>
    <p class="hint">電波の弱い所や、LINEなどのアプリの中の画面では、つながりにくいことがあります。もう一度押すか、Safari・Chromeで開いてみてください。</p>
    <button class="btn" id="cw-re" style="align-self:stretch">もう一度つなぐ</button>
    <button class="btn ghost small" id="cw-top">トップへ</button></section>`);
  $('cw-re').onclick=()=>enterRoom(code);
  $('cw-top').onclick=()=>{leaveRoom();goTop()};
}
async function subscribe(){
  const db=await getDb(),code=R.code;if(!code)return;
  R.un.forEach(f=>{try{f()}catch(e){}});R.un=[];
  const again=()=>setTimeout(()=>{if(R.code===code)subscribe()},1000);
  R.un.push(db.doc('rooms/'+code).onSnapshot(s=>{R.last=R.snapAt=Date.now();R.room=s.exists?s.data():null;sync()},again));
  R.un.push(db.collection('rooms/'+code+'/players').onSnapshot(q=>{R.last=R.snapAt=Date.now();R.players={};q.docs.forEach(d=>R.players[d.id]=d.data());sync()},again));
}
/* 読む回数を少なく（データを読む回数には1日の上限がある）：知らせが4秒以上届いていないときだけ自分から確かめる。
   ふだんは部屋だけ（1回）、全員の答えは5回に1回（約10秒ごと）。アプリから戻ったとき・つながったばかりのときは全部読む */
async function pull(force){
  const db=await getDb(),code=R.code;if(!code||R.pulling)return;
  if(!force&&Date.now()-(R.last||0)<4000)return;
  // 結果が出たあとは5秒ごとで十分（読む回数を少なく。2026-11-19）
  if(!force&&R.room&&R.room.phase==='result'&&Date.now()-(R.lastPull||0)<5000)return;
  R.lastPull=Date.now();
  // 知らせが一度も届いていない画面（アプリの中の画面など）は、全員の答えも毎回読む（止まって見えないように）
  const all=force||!R.snapAt||((R.nth=(R.nth||0)+1)%5===1);R.pulling=true;
  try{const [rs,ps]=await Promise.all([db.doc('rooms/'+code).get(),all?db.collection('rooms/'+code+'/players').get():null]);
    if(R.code!==code)return;R.room=rs.exists?rs.data():null;if(ps){R.players={};ps.docs.forEach(d=>R.players[d.id]=d.data())}sync()}
  catch(e){}finally{R.pulling=false}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&R.code){subscribe();pull(true)}});
function leaveRoom(keep){R.un.forEach(f=>{try{f()}catch(e){}});R.un=[];R.code=null;clearInterval(R.tick);clearInterval(R.poll);if(!keep)store('kv_room',null)}
async function roomUpdate(patch){const db=await getDb();try{await db.doc('rooms/'+R.code).update(patch)}catch(e){}}
function advance(k,rd){const id=rd+'-'+k;if(R.adv[id])return;if(R.room&&((R.room.qi||0)!==k||(R.room.round||1)!==rd||R.room.phase!=='play'))return;R.adv[id]=1;const n=(R.room.qs||[]).length;roomUpdate(k+1<n?{qi:k+1}:{phase:'result'})}
const rAns=(p,k)=>{const x=p&&p.ans&&p.ans[k];return x?{o:x.o,st:x.st||0,ms:x.ms||0,to:!!x.to,d:!!x.d,u:x.u?1:0}:null};
// 前の問題にも今の問題にも答えの書きこみがない人（画面を閉じた人）は「お休み中」として待たない。また答えれば次の問題から待つ
const rDone=(p,k,rd)=>{const a=rAns(p,k);return !!(a&&a.d&&(p.round||1)===rd)};
const rActive=(p,k,rd)=>p.id===PID||k===0||(p.round||1)!==rd?true:!!(rAns(p,k-1)&&rAns(p,k-1).d)||!!rAns(p,k);
async function sync(){
  const room=R.room,me=R.players[PID];
  if(!R.code||room===undefined)return;
  if(!room){leaveRoom();goTop();return}
  if(rState(room)==='ended'){leaveRoom();endedView();return}
  if(room.kind==='kon'&&room.host===PID){hostSync();return}
  if(!me)return;
  const db=await getDb(),rd=room.round||1,ps=plist(),n=(room.qs||[]).length;
  if((me.round||1)<rd){db.doc(pPath(R.code,PID)).update({ans:{},round:rd});return}
  if(room.phase==='lobby'){
    const key='lobby'+ps.map(p=>p.id+':'+p.name).join('|');
    if(key!==R.key){
      // 新しく入ってきた人を知らせる（最初に開いたときは知らせない）
      if(R.key.startsWith('lobby')){const before=R.seenIds||[];ps.filter(p=>p.id!==PID&&!before.includes(p.id)).forEach(p=>{toast((room.kind==='kon'?p.no+'番さん':san(p.name))+'が入りました');try{navigator.vibrate&&navigator.vibrate(120)}catch(e){}})}
      R.seenIds=ps.map(p=>p.id);R.key=key;room.kind==='kon'?konWait():lobby()}
    return}
  if(room.phase==='play'){
    const k=room.qi||0,done=ps.filter(p=>rDone(p,k,rd)),act=ps.filter(p=>rActive(p,k,rd));
    const qk='q'+rd+'-'+k;
    if(room.kind==='kon'&&done.length>=ps.length&&ps.length>0){advance(k,rd);return}
    if(act.length&&act.every(p=>rDone(p,k,rd))&&room.kind!=='kon'){if(R.key===qk&&R.seen[qk]){rCount(done.length,ps.length,ps,done);holdAdvance(k,rd)}else advance(k,rd);return}
    if(R.key!==qk){const fresh=k===0&&!/^q/.test(R.key),pid=rd+'-'+(k-1),late=!fresh&&R.key==='q'+pid&&!(R.hold||{})[pid]&&$('tcnt')&&R.my&&R.my.fin&&ps.every(p=>rDone(p,k-1,rd));/* 本当に全員が答えたときだけ（時間切れ・20秒で進んだときは出さない） */R.key=qk;R.my={o:-1,st:0,ms:0,fin:false};
      // 知らせがおそい画面でも「全員決めた！」を見てから次の問題へ（先に進んだ人との差は約1秒）
      if(late){R.hold=R.hold||{};R.hold[pid]=1;allDoneNow(ps.some(p=>{const x=p.id===PID?null:rAns(p,k-1);return x&&x.to}));setTimeout(()=>{if(R.key!==qk)return;R.seen[qk]=Date.now();rAsk(k,qk)},1100)}
      else if(fresh){markSeen(room.qs);countdown(qk,()=>{R.seen[qk]=Date.now();rAsk(k,qk)})}else{R.seen[qk]=Date.now();rAsk(k,qk)}}
    else if(R.seen[qk])rCount(done.length,ps.length,ps,done);
    return}
  clearInterval(R.tick);
  if(room.phase==='result'&&room.kind==='kon'){
    // 婚活：名前を見せる「OK」が変わったら描き直す（名前を入力中なら待つ）
    const key='kres'+rd+'-'+ps.map(p=>p.id+(p.rname||'')+Object.keys(p.reveal||{}).sort().join(',')).join('|');
    if(key===R.key)return;const ae=document.activeElement;if(ae&&ae.tagName==='INPUT'&&app.contains(ae)){R.konLater=true;return}
    R.key=key;konResult();return}
  if(room.phase==='result'){const key='res'+rd+'-'+ps.map(p=>p.id).join();if(key===R.key)return;
    const before=R.key.startsWith('res'+rd+'-')?R.key.slice(('res'+rd+'-').length).split(','):null;R.key=key;
    // 途中で抜けた人（答えた問題が半分より少ない人。時間切れ・まだ決められないも、その場にいたに数える）は結果に入れない。残りが2人より少なくなるときは外さない（究極の二択と同じ）
    const nq=room.qs.length,cnt=p=>room.qs.filter((q,i)=>{const a=rAns(p,i);return a&&a.d}).length;
    let use=ps,gone=[];const keep=ps.filter(p=>p.id===PID||cnt(p)*2>=nq);if(keep.length>=2&&keep.length<ps.length){use=keep;gone=ps.filter(p=>!keep.includes(p))}
    showResult({players:use.map(p=>({id:p.id,name:p.name,ans:room.qs.map((q,i)=>rAns(p,i))})),qs:room.qs,me:PID,anon:!!room.anon});
    if(gone.length){const sc=app.querySelector('.score');if(sc)sc.insertAdjacentHTML('afterend',`<p class="gone-note">途中で抜けた人：${room.anon?gone.length+'人':gone.map(p=>esc(p.name)+'さん（'+cnt(p)+'／'+nq+'問）').join('、')}。答えた問題が半分より少ないので、結果には入れていません。</p>`)}
    if(before){ps.filter(p=>p.id!==PID&&!before.includes(p.id)).forEach(p=>toast(san(p.name)+'が答えて、結果に加わりました'))}
    roomLaterCard(ps,room)}
}
function countdown(qk,go){
  const ps=plist();let n=3;
  const draw=()=>view(`<section class="card hand"><p class="cap">${ps.length}人そろいました</p><p class="cd">${n}</p><p class="hint">${R.room&&R.room.kind==='kon'?'あわてなくて大丈夫です。全員が答えたら、次の問題へ進みます。':'1問15秒です。全員が答えたら、次の問題へ。'}</p></section>`);
  draw();clearInterval(R.tick);
  R.tick=setInterval(()=>{if(R.key!==qk){clearInterval(R.tick);return}n--;if(n>0)draw();else{clearInterval(R.tick);go()}},800);
}
function rAsk(k,qk){
  const room=R.room,qid=room.qs[k],n=room.qs.length;
  if(room.len===30&&room.kind!=='kon')starIntro('room'+R.code,'わかった');
  const draw=()=>{const m=R.my,step=m.fin?'done':'own';
    view(askHTML(qid,k,n,{step,star:room.len===30||room.kind==='kon',starOn:m.st,to:m.to,u:m.u,qs:room.qs,room:true,quit:room.kind!=='kon'}));
    bindAsk(tap);paint();bindQuit();rCountNow();if(!m.fin&&room.kind!=='kon')qTimer(R.seen[qk],timeUp)};
  // 15秒たったら「時間切れ」を書いて待つ（答えなしとして数えない）
  const timeUp=()=>{const m=R.my;if(m.fin||R.key!==qk)return;m.o=-1;m.ms=Q_LIMIT*1000;m.fin=true;m.to=true;save(k,true,true);draw()};
  const tap=(v,starOn)=>{const m=R.my;if(v===null){m.st=starOn?1:0;return}
    if(m.fin)return;clearInterval(QT);
    m.u=v===3;m.o=v===3?-1:v;m.ms=Date.now()-R.seen[qk];m.fin=true;m.to=false;
    save(k,!!m.fin,false);draw()};
  const paint=()=>{};
  // やめる：2回押しで部屋から出る。自分の記録を部屋から消すので、ほかの人は待たずに進める（鑑定者本人 2026-11-20「一人が抜けても周りは進むように」）
  const bindQuit=()=>{const b=$('rquit');if(!b)return;b.onclick=async()=>{if(!b.dataset.arm){b.dataset.arm=1;b.textContent='もう一度押すと、部屋から出ます';setTimeout(()=>{if(b.isConnected){delete b.dataset.arm;b.textContent='やめる'}},4000);return}
    clearInterval(QT);const db=await getDb(),code=R.code;leaveRoom();try{if(db&&code)await db.doc(pPath(code,PID)).delete()}catch(e){}goTop();toast('部屋から出ました。ほかの人はそのまま続けられます')}};
  clearInterval(R.tick);
  // 問題が出てから20秒たっても答えがそろわなければ、そのまま次へ進む（画面を閉じた人を待たない。婚活の部屋は主催者の画面が60秒で進める）
  R.tick=setInterval(()=>{if(R.key!==qk){clearInterval(R.tick);return}
    if(room.kind==='kon'||Date.now()-R.seen[qk]<WAIT_ADV*1000)return;clearInterval(R.tick);advance(k,R.room.round||1)},500);
  draw();
}
async function save(k,fin,to){const db=await getDb(),me=R.players[PID];if(!db||!me)return;
  const m=R.my,a=Object.assign({},me.ans||{});
  a[k]={o:m.o<0?-1:m.o,st:m.st||0,ms:m.ms||0,to:!!to,d:!!fin};if(m.u&&!to)a[k].u=true;
  R.players[PID]=Object.assign({},me,{ans:a});
  try{await db.doc(pPath(R.code,PID)).update({ans:a})}catch(e){}
  if(fin){const ps=plist(),rd=R.room.round||1;   // 自分が最後の1人なら、知らせを待たずにすぐ次へ
    if(ps.filter(p=>R.room.kind==='kon'||rActive(p,k,rd)).every(p=>rDone(p,k,rd))){if(R.room.kind==='kon')advance(k,rd);else{rCountNow();holdAdvance(k,rd)}}}}
// 全員が決めたら、すぐには進まず「全員決めた！」を約2秒見せてから次へ（鑑定者本人 2026-11-19「一旦その間を空けて悩み中っていうのも一つの面白さ」）
const HOLD_MS=1800;
function allDoneNow(to){allOkShow(to)}
function holdAdvance(k,rd){const id=rd+'-'+k;R.hold=R.hold||{};
  // 全員（お休み中の人もふくめて）が本当に答えたときだけ「全員決めた！」を見せる。そうでなければ待たずに次へ
  if(!plist().every(p=>rDone(p,k,rd))){advance(k,rd);return}
  allOkShow(plist().some(p=>{const x=p.id===PID?R.my:rAns(p,k);return x&&x.to}));if(R.hold[id])return;R.hold[id]=1;setTimeout(()=>advance(k,rd),HOLD_MS)}
// 全員が答えたときの帯。時間切れの人がいれば「全員決めた！」とは書かない
function allOkShow(to){const a=$('allok');if(!a)return;a.innerHTML=to?'時間切れの人がいます<small>次の問題へ…</small>':'全員決めた！<small>次の問題へ…</small>';a.classList.toggle('to',!!to);a.hidden=false}
// 答えたあと、ほかの人のようすを「考え中…／答えた」で見せる（答えの中身は見せない。鑑定者本人 2026-11-17「相手の様子は考え中ぐらい」）。
// 名前を見せない部屋・大人数の部屋は人数だけ。新しい通信はなく、今ある答えの書きこみを見るだけ
function rCount(d,n,ps,done){const el=$('tcnt');if(!el)return;const room=R.room||{};
  if(!ps||room.anon||room.kind==='kon'){el.textContent=`みんなを待っています（${d}／${n}人 答えた）`;return}
  const k=room.qi||0,rd=room.round||1,ok=new Set(done.map(p=>p.id));if(R.my&&R.my.fin)ok.add(PID);else ok.delete(PID);
  const stOf=p=>{if(ok.has(p.id)){const a=p.id===PID?R.my:rAns(p,k);return a&&a.to?'to':'ok'}return rActive(p,k,rd)?'think':'rest'};
  const key=ps.map(p=>p.id+stOf(p)).join();if(el.dataset.k===key)return;el.dataset.k=key;
  const lab={ok:'<span class="st ok">決めた！</span>',to:'<span class="st off">時間切れ</span>',rest:'<span class="st off">お休み中</span>',think:'<span class="st think">悩み中<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></span>'};
  const others=ps.filter(p=>p.id!==PID),col=p=>p.id===PID?'p0':'p'+((others.indexOf(p)+1)%6);
  const seat=p=>{const st=stOf(p),nm=String(p.name||'')||(p.id===PID?'あなた':'');return `<div class="seat ${col(p)} s-${st}"><span class="av" aria-hidden="true"><img src="img/${p.id===PID?'ai':'yuu'}.webp" width="40" height="36" alt=""></span><span class="nm">${esc(nm)}</span>${lab[st]}</div>`};
  const me=ps.filter(p=>p.id===PID);
  el.innerHTML=`<div class="seats-w"><span class="seats-l">みんなのようす</span><div class="seats${ps.length>4?' many':''}">${me.concat(others).map(seat).join('')}</div></div>`}
function rCountNow(){const room=R.room;if(!room||room.phase!=='play')return;const k=room.qi||0,rd=room.round||1,ps=plist();
  const done=ps.filter(p=>rDone(p,k,rd));rCount(done.length,ps.length,ps,done)}
// LINEを開いて、文とリンクが入った状態にする（受け取った人はリンクを押すだけ）
// LINEで送るリンクは、いつものブラウザ（Safari・Chrome）で開くように openExternalBrowser=1 を付ける（恋のかたち診断と同じ。QRには付けない。2026-11-27）
function lx(u){u=String(u||'');if(WHERE==='claude'||/openExternalBrowser=/.test(u)||!/^https?:/.test(u))return u;const i=u.indexOf('#'),a=i<0?u:u.slice(0,i),h=i<0?'':u.slice(i);return a+(a.includes('?')?'&':'?')+'openExternalBrowser=1'+h}
const lineUrl=(t,u)=>'https://line.me/R/share?text='+encodeURIComponent(t+'\n'+lx(u));
const siteUrl=()=>WHERE==='claude'?ART_URL:location.href.split('#')[0].split('?')[0];
function joinUrl(c){return (WHERE==='claude'?ART_URL:location.href.split('#')[0].split('?')[0])+'#join-'+c}
let qrP=null;
function loadQR(){if(window.QRCode)return Promise.resolve();if(!qrP)qrP=new Promise((ok,ng)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';sc.onload=ok;sc.onerror=ng;document.head.appendChild(sc)});return qrP}
function lobby(){
  const c=R.code,url=joinUrl(c),ps=plist(),room=R.room,can=ps.length>=1;
  if(room&&room.len===30&&room.kind!=='kon')setTimeout(()=>starIntro('room'+c,'わかった'),300);
  view(`<img class="chara c-lobby" src="img/pair-smile.webp" width="180" height="100" alt="" aria-hidden="true">
  <section class="card hand">
    <p class="cap">部屋番号</p><p class="code">${esc(dcode(c))}</p>
    <div class="qr qr-tap" id="qr" role="button" tabindex="0" aria-label="参加用のQRコード（押すとリンクを送れます）"></div>
    <p class="hint">そばにいる人は、スマホのカメラでこのQRコードを読みとるだけで入れます。<br><b class="qr-tapn">QRを押すと、部屋のリンクをLINEなどで送れます</b></p>
    <a class="btn line" id="ln" href="#" target="_blank" rel="noopener" style="align-self:stretch">LINEで友だちを招待する</a>
    <button class="btn ghost small" id="cp" style="align-self:stretch">ほかのアプリで送る</button><p class="hint" id="cpd" hidden></p>
    <p class="hint">送ったリンクを開くだけで、この部屋に入れます。</p>
  </section>
  <section class="card">
    <div class="lobby-head"><p class="label">部屋に入っている人</p><span class="cnt">${ps.length}／${MAXP}人</span></div>
    <ul class="members">${ps.map(p=>`<li class="ok"><span>${esc(p.name)}${p.id===PID?'（あなた）':''}</span><b>入りました</b></li>`).join('')}</ul>
    <p class="status ${ps.length>=2?'go':''}">${ps.length>=2?'みんな入ったら、スタートを押してください（だれが押してもOK）':'友だちが入るのを待っています'}</p>
    <button class="btn" id="st" ${ps.length>=2?'':'disabled'}>${ps.length>=2?`スタート（${ps.length}人で）`:'スタート（2人そろったら）'}</button>
    <p class="hint live-note">一緒に答えると、おたがいの「悩み中…」「決めた！」がリアルタイムで見えます。</p>
    ${ps.length<2?`<details class="sfold later-fold"><summary>今すぐそろわないときは</summary><p class="hint later-note">先にひとりで答えておくこともできます。部屋ができてから10日のあいだは、あとからリンクを開いた人も同じ問題に答えて、結果に加わります（部屋番号で入れるのは12時間まで）。</p><button class="btn ghost small" id="st1" style="align-self:stretch">先にひとりで答える</button></details>`:''}
    <p class="hint">${room.len===30?'しっかり版（30問・★ゆずれない）':'簡易版（10問）'}・<span class="nw" data-nojw>話題は${room.topic==='party'?'恋愛多め':'暮らし・価値観'}</span>${room.anon?'・名前は見せない':''}</p>
  </section>
  <button class="btn ghost small" id="home">部屋を出てトップへ</button>`);
  loadQR().then(()=>{const el=$('qr');if(!el)return;el.innerHTML='';new QRCode(el,{text:url,width:180,height:180,colorDark:'#22253A',colorLight:'#FFFFFF',correctLevel:QRCode.CorrectLevel.M})}).catch(()=>{const el=$('qr');if(el)el.hidden=true});
  $('ln').href=lineUrl('アイ・シンクで一緒に診断しよう！\nこのリンクを開くだけで、部屋に入れます。',url);
  $('cp').onclick=()=>{const d=$('cpd'),text='アイ・シンクで一緒に診断しよう！\nこのリンクを開くだけで、部屋に入れます。';
    // スマホの「共有」でLINE・メッセージなどへ（送るのは部屋に直接入れるリンク）。使えないときは文とリンクをコピー
    if(navigator.share){navigator.share({title:'アイ・シンク',text,url:lx(url)}).catch(()=>{});return}
    d.hidden=false;const full=text+'\n'+lx(url);try{navigator.clipboard.writeText(full).then(()=>{d.textContent='招待の文とリンクをコピーしました。LINEなどに貼って送ってください。'},()=>{d.textContent=full})}catch(e){d.textContent=full}};
  {const q=$('qr');if(q){q.onclick=()=>$('cp').click();q.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('cp').click()}}}}
  $('st').onclick=e=>{if(ps.length<2)return;e.target.disabled=true;roomUpdate({phase:'play',qi:0})};
  const s1=$('st1');if(s1)s1.onclick=e=>{e.target.disabled=true;roomUpdate({phase:'play',qi:0})};
  $('home').onclick=async()=>{const db=await getDb(),code=R.code;leaveRoom();try{await db.doc(pPath(code,PID)).delete()}catch(e){}goTop()};
}
/* 招待のリンク・QRコード（…#join-1234）で開いたとき：トップを出さずに、その部屋へまっすぐ入る。
   前に名前を入れたことがあれば何も押さずに入る。はじめての人は、ニックネームを入れて「参加する」を1回押すだけ（空でも入れる） */
async function joinFromLink(code,typed){
  view(tnav('jl-top','やめてトップへ')+'<section class="card hand"><div class="orb" aria-hidden="true"></div><p class="hint">部屋に入っています…</p></section>');
  $('jl-top').onclick=()=>{clearJoinHash();goTop()};
  const db=await getDb();
  const clearHash=()=>{try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}JOIN=''};
  if(!db){clearHash();goTop();return}
  code=await resolveRoom(code,!typed);   // リンク（番号-印）はもとの部屋へ。番号を手で入れたときは12時間以内の部屋だけ
  let room=null,ps=[],st='none';
  try{const rs=await db.doc('rooms/'+code).get();room=rs.exists?rs.data():null;st=rState(room,typed);
    if(st!=='none'&&st!=='ended'){const q=await db.collection('rooms/'+code+'/players').get();ps=q.docs.map(d=>d.id)}}catch(e){}
  const fail=msg=>{clearHash();view(`${tnav('fl-top')}<section class="card hand"><p class="big">${msg}</p><p class="hint">${typed?'部屋番号で入れるのは、部屋ができてから12時間までです。番号を確かめるか、部屋を作った人にリンクを送ってもらってください。':'部屋を作った人に、もう一度リンクを送ってもらってください。'}</p><button class="btn" id="tp" style="align-self:stretch">トップへ</button></section>`);$('tp').onclick=goTop;$('fl-top').onclick=goTop};
  if(st==='ended'){clearHash();return endedView()}                    // 10日すぎ・12時間すぎても始まらなかった
  if(st==='none')return fail('この部屋は見つかりませんでした');
  if(ps.includes(PID)){enterRoom(code);return}                     // もう入っている（ページを開きなおした）
  if(st==='late'&&room.kind!=='kon'){clearHash();return lateJoin(code,room)}   // 結果が出たあと・12時間すぎ：同じ問題にひとりで答えて、結果に加わる
  if(ps.length>=maxOf(room))return fail('この部屋は、もう'+maxOf(room)+'人そろっています');
  if(room.kind==='kon'){if(room.host===PID){enterRoom(code);return}konJoin(code,room,ps.length);return}
  const saved=store('kv_name');
  const go=async name=>{const r=await joinRoom(code,name);if(r!=='ok')fail(r)};
  if(saved){go(saved);return}                                        // 名前がわかっている人は、そのまま入る
  const started=room.phase!=='lobby';
  view(`${tnav('jn-top')}<section class="card hand">
    <img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    <p class="big">部屋に招待されました</p>
    <p class="hint">${started?'もう始まっています。入ると、いまの問題から参加します。':`いま${ps.length}人が待っています。`}</p>
    <label class="one-name" for="jn-name" style="align-self:stretch;text-align:left"><span>ニックネーム</span><input type="text" id="jn-name" maxlength="10" autocomplete="nickname"></label>
    <button class="btn" id="jn-go" style="align-self:stretch">参加する</button>
  </section>`);
  const inp=$('jn-name');
  const submit=e=>{if(e)e.preventDefault();const v=inp.value.trim();if(v)store('kv_name',v);$('jn-go').disabled=true;go(v||('ゲスト'+(ps.length+1)))};
  $('jn-go').onclick=submit;$('jn-top').onclick=()=>{clearHash();goTop()};inp.onkeydown=e=>{if(e.key==='Enter')submit(e)};
}
// 同じ名前の人がいるとき：「あなた自身ですか？」→ はい＝その人として続ける／ちがう人＝別の名前で入る（鑑定者本人 2026-11-19「作った人がLINEのリンクから入ると3人になる」）
function sameAsk(code,name,id,shown){
  view(`${tnav('sm-top')}<section class="card hand"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    <p class="big">「${esc(shown||name)}」さんは、もうこの部屋にいます</p>
    <p class="hint">部屋を作った人が、自分で送ったリンクを開いたときなどに出ます。あなた自身ですか？</p>
    <button class="btn" id="sm-yes" style="align-self:stretch">はい、自分です（この画面で続ける）</button>
    <button class="btn ghost" id="sm-no" style="align-self:stretch">ちがう人です（別の名前で入る）</button></section>`);
  $('sm-top').onclick=()=>{clearJoinHash();goTop()};
  $('sm-yes').onclick=()=>{PID=id;store('kv_pid',id);store('kv_name',shown||name);enterRoom(code)};
  $('sm-no').onclick=()=>{
    view(`${tnav('sm-back','もどる')}<section class="card hand"><p class="big">別のニックネームで入る</p><p class="hint">同じ名前の人がいるので、ちがうニックネームにしてください。</p>
      <label class="one-name" for="sm-name" style="align-self:stretch;text-align:left"><span>ニックネーム</span><input type="text" id="sm-name" maxlength="10" autocomplete="nickname"></label>
      <p class="err" id="sm-err" role="alert"></p><button class="btn" id="sm-go" style="align-self:stretch">参加する</button></section>`);
    const inp=$('sm-name'),go=async e=>{if(e)e.preventDefault();const v=inp.value.trim();if(!v){$('sm-err').textContent='ニックネームを入れてください';return}
      if(v===String(shown||name).trim()){$('sm-err').textContent='同じ名前の人がいます。少し変えてください（例：'+esc(v)+'2）';return}
      store('kv_name',v);$('sm-go').disabled=true;const r=await joinRoom(code,v);if(r!=='ok'){$('sm-err').textContent=r;$('sm-go').disabled=false}};
    $('sm-back').onclick=()=>sameAsk(code,name,id,shown);$('sm-go').onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go(e)};try{inp.focus()}catch(e){}}}
/* ===== あとから参加（鑑定者本人 2026-11-19「いつやっても答えが見れて」。2026-11-20 から作ってから10日まで）
 * 先に答えた人がいる部屋（結果の画面）のリンクを開いた人は、同じ問題にひとりで答え（1問15秒）、答え終わったら結果に加わる。
 * 答えは終わってからまとめて書くので、答えていない人が結果に加わることはない ===== */
async function lateJoin(code,room){
  const db=await getDb();let ps=[];try{const q=await db.collection('rooms/'+code+'/players').get();ps=q.docs.map(d=>({id:d.id,name:String((d.data()||{}).name||''),ans:(d.data()||{}).ans||{},round:(d.data()||{}).round||1}))}catch(e){}
  if(ps.some(p=>p.id===PID)){enterRoom(code);return}
  if(ps.length>=MAXP){view(`<section class="card hand"><p class="big">この部屋は、もう${MAXP}人そろっています</p><button class="btn" id="tp" style="align-self:stretch">トップへ</button></section>`);$('tp').onclick=goTop;return}
  const n=(room.qs||[]).length,nm=ps.slice(0,3).map(p=>`<span class="nw" data-nojw>${esc(san(p.name))}${ps.length>1?'・':''}</span>`).join('').replace(/・<\/span>$/,'</span>')+(ps.length>3?' ほか':'');
  view(`${tnav('lj-top2')}<section class="card hand"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    <p class="big">${nm}が、もう答えています</p>
    <p class="hint">同じ${n}問に答えると、みんなの結果にあなたも加わります（1問15秒・約${minsOf(n)}分）。答えは、答え終わるまで見えません。</p>
    <label class="one-name" for="lj-name" style="align-self:stretch;text-align:left"><span>ニックネーム</span><input type="text" id="lj-name" maxlength="10" autocomplete="nickname" value="${esc(store('kv_name')||'')}"></label>
    <p class="err" id="lj-err" role="alert"></p>
    <button class="btn" id="lj-go" style="align-self:stretch">答えはじめる</button>
    <button class="btn ghost small" id="lj-top" style="align-self:stretch">トップへ</button></section>`);
  $('lj-top').onclick=goTop;$('lj-top2').onclick=goTop;
  const inp=$('lj-name'),go=e=>{if(e)e.preventDefault();const v=inp.value.trim();if(!v){$('lj-err').textContent='ニックネームを入れてください';return}
    const sm=ps.find(p=>p.name.trim()===v);if(sm){sameAsk(code,v,sm.id,sm.name);return}
    store('kv_name',v);
    Object.assign(L,{counts:undefined,mode:'late',qs:(room.qs||[]).slice(),players:[{id:'me',name:v,ans:{}}],p:0,i:0,late:{code,round:room.round||1,name:v,toResult:room.phase!=='result',others:ps.filter(p=>p.round===(room.round||1))}});localAsk()};
  $('lj-go').onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go(e)}}
// あとから答える人に、先に答えた人がその問題で何秒悩んだかを見せる（答えの中身は見せない。鑑定者本人 2026-11-19「はい」）
function lateTimes(i){const os=((L.late||{}).others||[]).filter(p=>p.ans&&p.ans[i]);if(!os.length)return false;
  const row=p=>{const a=p.ans[i],sec=(a.ms||0)/1000,nm=esc(p.name)+'さん';
    const t=a.to?'時間切れでした':a.u?`${sec.toFixed(1)}秒、ずっと悩んでいました`:sec<1?'<b>1秒未満</b>で即決！':sec<=2.5?`<b>${sec.toFixed(1)}秒</b>で即決！`:sec>=8?`<b>${sec.toFixed(1)}秒</b>悩みました`:`<b>${sec.toFixed(1)}秒</b>で決めました`;
    return `<li><img src="img/yuu.webp" width="34" height="30" alt="" aria-hidden="true"><span>${nm}は、${t}</span></li>`};
  const o=app.querySelector('.opts');if(!o)return false;
  o.insertAdjacentHTML('afterend',`<ul class="late-t">${os.slice(0,4).map(row).join('')}</ul>`);return true}
async function lateFinish(){const j=L.late,me=L.players[0];view('<section class="card hand"><div class="orb" aria-hidden="true"></div><p class="hint">みんなの結果に加わっています…</p></section>');
  const ans={};L.qs.forEach((k,i)=>{const a=me.ans[i];if(!a)return;ans[i]={o:a.o<0?-1:a.o,st:a.st||0,ms:a.ms||0,to:!!a.to,d:true};if(a.u)ans[i].u=true});
  const db=await getDb();
  if(j.toResult)try{await db.doc('rooms/'+j.code).update({phase:'result'})}catch(e){}   // 12時間すぎて止まっていた部屋は、ここで結果の画面にする
  for(let t=0;t<3;t++){try{await db.doc(pPath(j.code,PID)).set({name:j.name,ans,round:j.round,joined:Date.now(),ready:true});enterRoom(j.code);return}catch(e){await new Promise(r=>setTimeout(r,1200))}}
  showResult({players:L.players,qs:L.qs,me:'me',anon:false,local:true})}
// 診断が終わった部屋のリンクを、あとから開いたとき（今は使っていない。あとから参加に置きかえた）
function doneRoom(clear){if(clear)clear();
  view(`<section class="card hand"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    <p class="big">この部屋の診断は、もう終わりました</p>
    <p class="hint">あとから入ると、みんなの結果が変わってしまうので、終わった部屋には入れません。</p>
    <p class="hint">送ってくれた人に、新しい部屋か「答え合わせのリンク」（ひとりで診断したあとに送れるリンク。好きなときに答えられます）を送ってもらってください。</p>
    <button class="btn" id="dr-solo" style="align-self:stretch">ひとりで診断する</button><button class="btn ghost" id="dr-top" style="align-self:stretch">トップへ</button></section>`);
  $('dr-top').onclick=goTop;$('dr-solo').onclick=()=>{soloStart(store('kv_name')||'')}}
// 部屋の結果のいちばん上：まだ1人のとき／あとからでも加われること（部屋ができてから10日）
function roomLaterCard(ps,room){const sc=app.querySelector('.scr');if(!sc||room.kind==='kon'||ps.length>=2)return;   // 2人以上そろったら出さない（鑑定者本人 2026-11-20「もう不要」）
  const url=joinUrl(R.code),ms=Math.max(0,(room.created||0)+ROOM_MS-Date.now()),left=ms>=2*864e5?Math.floor(ms/864e5)+'日':Math.max(1,Math.round(ms/3600e3))+'時間';
  const sco=ps.length>=2&&sc.querySelector('.score');(sco?sco:sc).insertAdjacentHTML(sco?'afterend':'afterbegin',`<section class="card later-card"><p class="pt-h"><em>あとからでもOK</em>${ps.length<2?'まだあなただけです':'ほかの人も、あとから加われます'}</p>
    <p class="hint">この部屋のリンクを開いた人は、同じ問題に答えると、この結果に加わります（あと${left}くらい）。加わると、この画面も新しくなります。</p>
    <a class="btn line${ps.length<2?'':' line-w'}" id="lt-ln" href="${lineUrl('アイ・シンクで価値観の答え合わせをしよう！\nこのリンクを開いて答えると、'+(ps.length<2?'2人の結果が見られます。':'みんなの結果に加われます。'),url)}" target="_blank" rel="noopener" style="align-self:stretch">LINEで友だちに送る</a></section>`)}
/* 画面の下に、短いお知らせを出す（数秒で消える） */
function toast(t){let el=$('toast');if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');el.setAttribute('data-nojw','');document.body.appendChild(el)}
  el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),2600)}
function roomAgain(){const r=R.room;roomUpdate({round:(r.round||1)+1,phase:'play',qi:0,qs:r.kind==='kon'?dealKon(KON_LEN):deal(r.len||10,r.topic||'all')})}

/* ===== 婚活・街コンの部屋（最大40人・番号だけ・名前はおたがいがOKのときだけ） =====
   主催者（部屋を作った人）は答えない。主催者の画面＝QR・人数・スタート・進み具合。
   参加する人は番号（会場の番号札）と、自分の性別・合う人に出してほしい人を選ぶ。 */
const SEXL={m:'男性',f:'女性',x:'答えない'},WANTL={m:'男性',f:'女性',a:'どちらも'};
function hostSync(){
  const room=R.room,ps=plist(),rd=room.round||1,n=(room.qs||[]).length;
  if(room.phase==='lobby'){const key='h-lobby'+ps.map(p=>p.id).join();if(key===R.key)return;
    if(R.key.startsWith('h-lobby')){const before=R.seenIds||[];ps.filter(p=>!before.includes(p.id)).forEach(p=>toast(p.no+'番さんが入りました'))}
    R.seenIds=ps.map(p=>p.id);R.key=key;hostLobby();return}
  if(room.phase==='play'){
    const k=room.qi||0,qk='h'+rd+'-'+k,done=ps.filter(p=>{const a=rAns(p,k);return a&&a.d&&(p.round||1)===rd});
    if(ps.length&&done.length>=ps.length){advance(k,rd);return}
    if(R.key!==qk){R.key=qk;R.seen[qk]=Date.now()+(k===0?2400:0);clearInterval(R.tick);
      // 答えない人がいても止まらないよう、60秒たったら主催者の画面から次へ進める（参加する人の画面には秒数を出さない）
      R.tick=setInterval(()=>{if(R.key!==qk){clearInterval(R.tick);return}if(Date.now()-R.seen[qk]>KON_WAIT*1000)advance(k,rd)},500)}
    const pc=Math.round(done.length/Math.max(1,ps.length)*100);
    view(`<section class="card hand"><p class="cap">大人数の部屋 ${esc(dcode(R.code))}（主催者の画面）</p>
      <p class="big">${k+1}問目／${n}問</p>
      <div class="bar"><i style="width:${pc}%"></i></div>
      <p class="hint">答えた人 ${done.length}／${ps.length}人。全員が答えるか、${KON_WAIT}秒たつと次の問題へ進みます（参加する人の画面に秒数は出ません）。</p></section>`);
    return}
  clearInterval(R.tick);
  if(room.phase==='result'){const key='h-res'+rd;if(key===R.key)return;R.key=key;
    view(`<section class="card hand"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
      <p class="big">結果が出ました</p>
      <p class="hint">参加した${ps.length}人それぞれのスマホに、その人と合う人が出ています。ほかの人どうしの結果は、主催者の画面にも出ません。</p>
      <p class="hint">名前は、2人とも「名前を見せてもいい」を押したときだけ、その2人に出ます。</p>
      <button class="btn" id="again" style="align-self:stretch">もう1回（別の${KON_LEN}問）</button></section>
      ${PROMO}<button class="btn ghost small" id="home">主催者の画面を閉じてトップへ</button>`);
    $('again').onclick=e=>{e.target.disabled=true;roomAgain()};$('home').onclick=()=>{leaveRoom();goTop()}}
}
function hostLobby(){
  const c=R.code,url=joinUrl(c),ps=plist(),can=ps.length>=2;
  const nos=ps.map(p=>p.no).sort((a,b)=>(+a)-(+b));
  view(`<section class="card hand">
    <p class="cap">大人数の部屋（主催者の画面）</p>
    <p class="hint">この画面を参加する方に見せて、QRコードを読みとってもらってください。</p>
    <div class="qr" id="qr" aria-label="参加用のQRコード"></div>
    <p class="cap">部屋番号</p><p class="code">${esc(dcode(c))}</p>
    <p class="hint">参加する方は、番号札の番号を入れるだけ。名前は出ません。</p>
    <a class="btn line small" id="ln" href="#" target="_blank" rel="noopener" style="align-self:stretch">LINEで参加のリンクを送る</a>
  </section>
  <section class="card">
    <div class="lobby-head"><p class="label">参加している人</p><span class="cnt">${ps.length}／${KON_MAX}人</span></div>
    ${nos.length?`<p class="nos">${nos.map(n=>`<span>${esc(n)}番</span>`).join('')}</p>`:'<p class="hint">まだだれも入っていません。</p>'}
    <p class="status ${can?'go':''}">${can?'みんな入ったら、スタートを押してください。全員のスマホで同時に始まります':'2人以上入ると、スタートできます'}</p>
    <button class="btn" id="st" ${can?'':'disabled'}>${can?`スタート（${ps.length}人で）`:'スタート'}</button>
    <p class="hint">${KON_LEN}問（10分くらい）。お金・将来・暮らしなど大事な問題が中心です。</p>
  </section>
  <button class="btn ghost small" id="home">主催者の画面を閉じてトップへ</button>`);
  loadQR().then(()=>{const el=$('qr');if(!el)return;el.innerHTML='';new QRCode(el,{text:url,width:220,height:220,colorDark:'#22253A',colorLight:'#FFFFFF',correctLevel:QRCode.CorrectLevel.M})}).catch(()=>{const el=$('qr');if(el)el.hidden=true});
  $('ln').href=lineUrl('アイ・シンク（大人数・名前を出さずに）の部屋です。\nこのリンクを開いて、番号札の番号を入れてください。',url);
  $('st').onclick=e=>{if(!can)return;e.target.disabled=true;roomUpdate({phase:'play',qi:0})};
  $('home').onclick=()=>{leaveRoom();goTop()};
}
function konWait(){
  const ps=plist(),me=R.players[PID];
  view(`<section class="card hand"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    <p class="cap">大人数の部屋 ${esc(dcode(R.code))}</p>
    <p class="big">${esc(me.no)}番で参加しています</p>
    <p class="hint">いま${ps.length}人。主催者がスタートを押すと、全員のスマホで同時に始まります。</p>
    <ul class="know">
      <li><b>名前は出ません</b><span>番号だけです</span></li>
      <li><b>${KON_LEN}問・10分くらい</b><span>大事なことには「★ ここはゆずれない」を押せます</span></li>
      <li><b>合う人は、あなたのスマホにだけ</b><span>ほかの人には見えません</span></li>
    </ul></section>
  ${PROMO}
  <button class="btn ghost small" id="home">部屋を出る</button>`);
  $('home').onclick=async()=>{const db=await getDb(),code=R.code;leaveRoom();try{await db.doc(pPath(code,PID)).delete()}catch(e){}goTop()};
}
/* 招待のQR・部屋番号から：番号と、性別・合う人に出してほしい人を選んで入る */
function konJoin(code,room,count){
  const f={no:'',sex:'',want:''};
  const chips=(k,L)=>`<div class="chips c3" role="group">${Object.entries(L).map(([v,l])=>`<button class="chip" data-f="${k}" data-v="${v}" aria-pressed="false">${l}</button>`).join('')}</div>`;
  view(`<section class="card hand" style="align-items:stretch;text-align:left">
    <p class="big" style="text-align:center">大人数の部屋に参加</p>
    <p class="hint" style="text-align:center">${room.phase!=='lobby'?'もう始まっています。入ると、いまの問題から参加します。':`いま${count}人が待っています。`}名前は出ません。</p>
    <label class="one-name" for="kno"><span>番号（会場の番号札）</span><input type="text" id="kno" inputmode="numeric" maxlength="3" placeholder="例：7"></label>
    <p class="label">あなたは？</p>${chips('sex',SEXL)}
    <p class="label">合う人に出してほしいのは？</p>${chips('want',WANTL)}
    <button class="btn" id="kgo">参加する</button>
    <p class="err" id="kerr2" role="alert"></p>
    <p class="hint">性別と番号は、合う人を選ぶためだけに使います。結果は、あなたのスマホにだけ出ます。</p>
  </section>`);
  app.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{f[b.dataset.f]=b.dataset.v;app.querySelectorAll(`[data-f="${b.dataset.f}"]`).forEach(x=>x.setAttribute('aria-pressed',x===b))});
  $('kgo').onclick=async e=>{const err=t=>{$('kerr2').textContent=t};f.no=$('kno').value.replace(/\D/g,'').replace(/^0+/,'');
    if(!f.no)return err('番号を入れてください');if(!f.sex)return err('「あなたは？」を選んでください');if(!f.want)return err('「合う人に出してほしいのは？」を選んでください');
    e.target.disabled=true;const r=await joinKon(code,f);if(r!=='ok'){err(r);e.target.disabled=false}};
}
/* 婚活の結果：自分と合う人だけを、合う順に。名前は2人とも「見せてもいい」を押したときだけ */
function konResult(){
  const room=R.room,ps=plist(),me=ps.find(p=>p.id===PID);if(!me)return;
  const P=p=>({id:p.id,ans:room.qs.map((q,i)=>rAns(p,i))});
  const fit=(a,b)=>(a.want==='a'||a.want===b.sex)&&(b.want==='a'||b.want===a.sex);
  const cand=ps.filter(p=>p.id!==PID&&fit(me,p)).map(p=>({p,r:pairStat(P(me),P(p),room.qs)})).filter(x=>x.r.n).sort((a,b)=>b.r.pct-a.r.pct);
  const mine=me.reveal||{};
  const card=(x,i)=>{const p=x.p,r=x.r,mutual=mine[p.id]&&(p.reveal||{})[PID];
    return `<li class="pair"><div class="ph"><b>${i+1}位　${esc(p.no)}番さん${mutual&&p.rname?`（${esc(p.rname)}さん）`:''}</b><em>${r.pct}%</em></div>
      <div class="bar"><i style="width:${r.pct}%"></i></div>
      <p class="hint">ぴったり ${r.same.length}問・近い ${r.adj.length}問・ちがい ${r.diff.length}問</p>
      ${r.starN?`<p class="${r.starDiff.length?'warn':'good'}">★ ゆずれないところ ${r.starN}問のうち、同じ ${r.starSame.length}・近い ${r.starAdj.length}・ちがう ${r.starDiff.length}</p>`:''}
      ${mutual?`<p class="good">おたがいに「名前を見せてもいい」を押しました。${p.rname?'':'（お相手の名前はまだ入っていません）'}</p>`
        :mine[p.id]?`<p class="hint">押しました。${esc(p.no)}番さんも押したら、ここに名前が出ます。</p>`
        :`<div class="rvbox" data-id="${p.id}"><button class="btn small ghost rv">${esc(p.no)}番さんに名前を見せてもいい</button></div>`}</li>`};
  const top=cand.slice(0,5),rest=cand.slice(5);
  view(`<section class="card score"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
      <p class="cap">${esc(me.no)}番さんと合う人</p>
      <p class="hint">答えが重なった順です。お金・将来・暮らしなど大事な問題は重く数えています。この画面は、あなたにしか見えません。</p></section>
    <section class="card"><p class="label">あなたと合う人</p>
      ${cand.length?`<ul class="pairs">${top.map(card).join('')}</ul>${rest.length?`<details><summary class="label">${top.length+1}位から下も見る（${rest.length}人）</summary><ul class="pairs">${rest.map((x,i)=>card(x,i+5)).join('')}</ul></details>`:''}`
        :'<p class="hint">いま、合う人に出せる人がいません（「合う人に出してほしいのは？」の選び方で、出る人が変わります）。</p>'}
      <p class="hint">「名前を見せてもいい」は、2人とも押したときだけ、その2人にだけ名前が出ます。片方だけが押しても、相手にはわかりません。</p></section>
    ${PROMO}
    <button class="btn ghost small" id="home">部屋を出てトップへ</button>`);
  app.querySelectorAll('.rvbox .rv').forEach(b=>b.onclick=()=>{const box=b.parentElement,id=box.dataset.id;
    if(me.rname){reveal(id,me.rname);return}
    box.innerHTML=`<label class="one-name" for="rv-${id}"><span>見せる名前（ニックネームでOK）</span><input type="text" id="rv-${id}" maxlength="10" value="${esc(store('kv_name')||'')}"></label><button class="btn small" id="rvok-${id}">この名前を見せてもいい</button>`;
    const inp=$('rv-'+id);inp.focus();
    $('rvok-'+id).onclick=()=>{const v=inp.value.trim();if(!v){inp.focus();return}store('kv_name',v);reveal(id,v)}});
  $('home').onclick=()=>{leaveRoom();goTop()};
}
async function reveal(id,name){const db=await getDb(),me=R.players[PID];if(!db||!me)return;
  const rv=Object.assign({},me.reveal||{},{[id]:true});R.players[PID]=Object.assign({},me,{reveal:rv,rname:name});
  try{await db.doc(pPath(R.code,PID)).update({reveal:rv,rname:name})}catch(e){}
  R.key='';R.konLater=false;konResult()}
document.addEventListener('focusout',()=>{if(R.konLater){R.konLater=false;setTimeout(()=>{if(R.code)sync()},50)}});

// 招待のリンクで開いたら、その部屋へ。答え合わせ・結果のリンクなら、それを開く。ふつうに開いたらトップ
// サイトを開いたまま、答え合わせ・結果のリンクを押したときも開く
window.addEventListener('hashchange',()=>{const x=parseLink();if(!x||x.bad||R.code)return;if(x.kind==='with')withStart(x);else pairView(x)});
(()=>{if(MV_GO){app.innerHTML=`<div class="scr"><section class="card hand"><div class="orb" aria-hidden="true"></div><p class="big">いつもの画面で開いています…</p><p class="hint">開いた画面（Safari・Chromeなど）で、そのまま続けてください。答えた結果も一緒にうつります。</p><button class="btn ghost" id="ext-stay" type="button">開かないときは、ここで続ける</button></section></div>`;
    $('ext-stay').onclick=()=>{try{sessionStorage.setItem('kv_stay','1')}catch(e){}location.reload()};return}
  if(MV_N)setTimeout(()=>toast('LINEの中で出した結果も、こちらにうつしました'),600);
  const x=parseLink();
  if(x&&x.kind==='with')return withStart(x);
  if(x&&x.kind==='pair')return pairView(x);
  if(x&&x.bad){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}goTop();toast('このリンクは読みとれませんでした');return}
  if(JOIN)return joinFromLink(JOIN);goTop()})();
