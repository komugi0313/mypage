/* アイ・シンク（I-Sync）― わたしとあなたの、重なるところ（isync/）
 * 2択＋「こだわらない」に答えて、答え合わせをする。ひとりで／1台を回して／みんなのスマホで（2〜10人・1問20秒）。
 * 問題は questions.js（こちらで用意）と questions-mine.js（あなたが足す）。
 * みんなのスマホで遊ぶ部屋は、公開先では Firebase（Firestore の isync_rooms）、確認用ページ（claude.ai）ではページのデータ保存で共有する。 */

/* ===== 問題 ===== */
// CATS: [名前, 問題の上に出す札]  Q: [テーマ番号, 問題, 答えA, 答えB]
const CATS=window.SY_CATS||[];
const Q=[].concat(window.SY_Q||[],window.SY_MINE||[]).map(r=>[CATS.findIndex(c=>c[0]===r[0]),r[1],r[2],r[3]]).filter(r=>r[0]>=0&&r[1]&&r[2]&&r[3]);
const CI=n=>CATS.findIndex(c=>c[0]===n);
// 話題：いろいろ＝6テーマを同じくらい／盛り上がる＝ドキドキ多め・結婚とお金の話はなし
const TOPICS={all:['恋愛・連絡','暮らし','食','お金','休日・遊び','将来・家族'].map(CI),
  party:['ドキドキ','恋愛・連絡','休日・遊び','ドキドキ','食','暮らし'].map(CI)};
const LIMIT=20, MAXP=10;
const OPTS=['A','B','こだわらない'];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const app=$('app');
function view(h){app.innerHTML='<div class="scr">'+h+'</div>';window.scrollTo(0,0)}
const ans=(o,k)=>o===0?Q[k][2]:o===1?Q[k][3]:o===2?'こだわらない':'時間切れ';

/* テーマが偏らないように配る：テーマを順番に回して、まだ出ていない問題から選ぶ */
function deal(len,topic){
  let cats=shuffle(TOPICS[topic]||TOPICS.all);
  if(topic==='party'){const d=CI('ドキドキ');cats=cats.filter(c=>c!==d);cats.splice(0,0,d);cats.splice(3,0,d)} // ドキドキは1つおきくらいに
  const seen=new Set(store('kv_seen')||[]);
  const pool={};[...new Set(cats)].forEach(c=>{const all=Q.map((q,i)=>i).filter(i=>Q[i][0]===c),need=Math.ceil(len*cats.filter(x=>x===c).length/cats.length)+1;
    let fresh=shuffle(all.filter(i=>!seen.has(i)));
    if(fresh.length<need){all.forEach(i=>seen.delete(i));fresh=shuffle(all)} // そのテーマを出しきったら一周目にもどす
    pool[c]=fresh});
  const out=[];let r=0;
  while(out.length<len){const c=cats[r%cats.length];const i=pool[c].shift();if(i!=null&&!out.includes(i))out.push(i);r++;if(r>len*20)break}
  out.forEach(i=>seen.add(i));store('kv_seen',[...seen]);
  return out;
}
function markSeen(ids){const s=new Set(store('kv_seen')||[]);ids.forEach(i=>s.add(i));store('kv_seen',[...s])}

/* ===== トップ ===== */
const CFG=Object.assign({mode:'each',len:10,topic:'all',anon:false},store('kv_cfg')||{});
let JOIN=(/^#join-(\d{4})$/.exec(location.hash||'')||[])[1]||'';
if(JOIN)CFG.mode='each';
const saveCfg=()=>store('kv_cfg',{mode:CFG.mode,len:CFG.len,topic:CFG.topic,anon:CFG.anon});
function seg(name,items){return `<div class="chips c${items.length}" role="group">${items.map(([v,l])=>`<button class="chip" data-k="${name}" data-v="${v}" aria-pressed="${String(CFG[name])===String(v)}">${l}</button>`).join('')}</div>`}
function goTop(){
  const st=store('kv_room');
  view(`
  <header class="brand">
    <div class="orb" aria-hidden="true"></div>
    <h1 class="logo">I-Sync</h1><p class="kana">アイ・シンク</p><p class="tl">わたしとあなたの、重なるところ</p>
    <p class="lead">2択に答えて、答え合わせ。<br>恋人・友だち・家族、だれとでも。</p>
  </header>
  ${st&&st.code?`<button class="btn ghost small" id="back">さっきの部屋（${esc(st.code)}）にもどる</button>`:''}
  <section class="card">
    <p class="label">だれと遊ぶ？</p>
    ${seg('mode',[['each','みんなの<br>スマホで'],['pass','1台を<br>回して'],['solo','ひとりで']])}
    <p class="hint" id="m-desc"></p>
    <p class="label">長さは？</p>
    ${seg('len',[[10,'簡易版<br><small>10問・さくっと</small>'],[30,'しっかり版<br><small>30問・★ゆずれない</small>']])}
    <p class="label">話題は？</p>
    ${seg('topic',[['all','いろいろ<br><small>恋愛・婚活むけ</small>'],['party','盛り上がる<br><small>友だち・飲み会むけ</small>']])}
    <p class="hint" id="t-desc"></p>
    <div id="m-anon" class="stack">
      <p class="label">名前は？</p>
      ${seg('anon',[[false,'みんなに見せる'],[true,'見せない<br><small>婚活・イベントむけ</small>']])}
    </div>
  </section>
  <section class="card" id="m-each">
    <label class="one-name" for="me">ニックネーム（本名でなくてOK）<input type="text" id="me" maxlength="10" placeholder="ニックネーム" value="${esc(store('kv_name')||'')}"></label>
    <button class="btn" id="mk">部屋を作る</button>
    <div class="join">
      <label for="code">友だちの部屋に参加する（部屋番号）</label>
      <div class="join-row"><input type="text" id="code" inputmode="numeric" maxlength="4" placeholder="4けた" value="${esc(JOIN)}"><button class="btn small" id="jn">参加</button></div>
    </div>
    <p class="hint">部屋のQRコードを、自分のスマホのカメラで読みとっても参加できます。</p>
    <p class="err" id="err" role="alert"></p>
  </section>
  <section class="card" id="m-pass">
    <p class="label">参加する人（2〜${MAXP}人）</p>
    <div id="plist" class="stack"></div>
    <button class="btn ghost small" id="padd">＋ 人を足す</button>
    <button class="btn" id="pgo">はじめる</button>
  </section>
  <section class="card" id="m-solo">
    <label class="one-name" for="sn">ニックネーム（なくてもOK）<input type="text" id="sn" maxlength="10" placeholder="ニックネーム" value="${esc(store('kv_name')||'')}"></label>
    <button class="btn" id="sgo">はじめる</button>
  </section>
  <p class="note">どの問題にも正解はありません。どちらでもいいときは「こだわらない」を選んでください。</p>`);
  const DESC={each:'2〜10人で。1人が部屋を作って、みんなは自分のスマホで参加します。1問20秒。離れていても遊べます。',pass:'1台のスマホを順番に回して、ひとりずつこっそり答えます。',solo:'自分の答えから、あなたのこだわりと、ゆずれることがわかります。'};
  const refresh=()=>{['each','pass','solo'].forEach(m=>$('m-'+m).hidden=CFG.mode!==m);
    $('m-desc').textContent=DESC[CFG.mode];$('m-anon').hidden=CFG.mode!=='each';
    $('t-desc').textContent=CFG.topic==='party'?'「ドキドキ」（キス・ハグ・手をつなぐ など）が多めに出ます。結婚・お金の話は出ません。':'恋愛・暮らし・食・お金・休日・将来の6つのテーマから、かたよらずに出ます。'};
  app.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{const k=b.dataset.k,v=b.dataset.v;
    CFG[k]=k==='len'?+v:k==='anon'?v==='true':v;saveCfg();
    app.querySelectorAll(`[data-k="${k}"]`).forEach(x=>x.setAttribute('aria-pressed',x===b));refresh()});
  refresh();
  // みんなのスマホで
  const myName=()=>{const v=$('me').value.trim();if(v)store('kv_name',v);return v};
  const err=t=>{$('err').textContent=t};
  $('mk').onclick=async e=>{const n=myName();if(!n)return err('ニックネームを入れてください');e.target.disabled=true;const r=await createRoom(n);if(r!=='ok'){err(r);e.target.disabled=false}};
  $('jn').onclick=async e=>{const n=myName(),c=$('code').value.replace(/\D/g,'');if(!n)return err('ニックネームを入れてください');if(c.length!==4)return err('4けたの部屋番号を入れてください');
    e.target.disabled=true;const r=await joinRoom(c,n);if(r!=='ok'){err(r);e.target.disabled=false}};
  const bk=$('back');if(bk)bk.onclick=async()=>{const r=await joinRoom(st.code,store('kv_name')||'');if(r!=='ok'){store('kv_room',null);goTop()}};
  // 1台を回して
  let names=store('kv_pnames')||['',''];
  const drawP=()=>{$('plist').innerHTML=names.map((n,i)=>`<div class="join-row"><input type="text" id="pn${i}" maxlength="10" placeholder="${i+1}人目のニックネーム" value="${esc(n)}">${names.length>2?`<button class="btn ghost small" data-del="${i}" aria-label="${i+1}人目を消す">✕</button>`:''}</div>`).join('');
    $('plist').querySelectorAll('input').forEach((x,i)=>x.oninput=()=>{names[i]=x.value});
    $('plist').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{names.splice(+b.dataset.del,1);drawP()});
    $('padd').hidden=names.length>=MAXP};
  drawP();
  $('padd').onclick=()=>{names.push('');drawP()};
  $('pgo').onclick=()=>{const ns=names.map((n,i)=>n.trim()||(i+1)+'人目');store('kv_pnames',names);passStart(ns)};
  // ひとりで
  $('sgo').onclick=()=>{const v=$('sn').value.trim();if(v)store('kv_name',v);soloStart(v)};
  if(JOIN)setTimeout(()=>$('me').focus(),0);
}

/* ===== 1問の画面（どのモードでも同じ） =====
   o: 0=A 1=B 2=こだわらない ／ g: 予想 ／ st: ★ゆずれない */
function askHTML(k,i,n,{who,guessLabel,step,star,starOn,timer}){
  const q=Q[k],cat=CATS[q[0]];
  const opt=(v,cls='')=>`<button class="opt ${cls}" data-v="${v}">${v<2?`<span class="k">${OPTS[v]}</span>`:''}<span>${esc(ans(v,k))}</span></button>`;
  return `<section class="card ask">
    ${timer?`<div class="timer" aria-hidden="true"><i id="tbar"></i></div>`:`<div class="prog">${Array.from({length:n},(_,j)=>`<i class="${j<=i?'on':''}"></i>`).join('')}</div>`}
    <div class="qhead"><span class="tag catg c${q[0]}">${esc(cat[0])}</span><span class="qn">${i+1}／${n}${who?`　${esc(who)}`:''}</span>${timer?`<span class="sec" id="tsec">${LIMIT}</span>`:''}</div>
    ${cat[1]?`<p class="if">${esc(cat[1])}</p>`:''}
    <h2 class="q">${esc(q[1])}</h2>
    ${step==='done'?`<div class="match">答えました！</div><p class="hint" id="tcnt">みんなを待っています</p>`:`
    <p class="label">${step==='own'?'あなたはどっち？':esc(guessLabel)}</p>
    ${step==='own'&&star?`<button class="star" id="star" aria-pressed="${!!starOn}">★ ここはゆずれない</button>`:''}
    <div class="opts">${opt(0)}${opt(1)}${opt(2,'mid')}</div>`}
  </section>`;
}
function bindAsk(onPick){
  app.querySelectorAll('.opt').forEach(b=>b.onclick=()=>onPick(+b.dataset.v));
  const s=$('star');if(s)s.onclick=()=>{const on=s.getAttribute('aria-pressed')!=='true';s.setAttribute('aria-pressed',on);onPick(null,on)};
}

/* ===== ひとりで ===== */
const L={};  // 手元で遊ぶときのゲーム
function soloStart(name){
  Object.assign(L,{mode:'solo',qs:deal(CFG.len,CFG.topic),players:[{id:'me',name:name||'あなた',ans:{}}],p:0,i:0});
  localAsk();
}
/* ===== 1台を回して ===== */
function passStart(names){
  Object.assign(L,{mode:'pass',qs:deal(CFG.len,CFG.topic),players:names.map((n,i)=>({id:'p'+i,name:n,ans:{}})),p:0,i:0});
  passHand();
}
function passHand(){
  const p=L.players[L.p],nx=L.players.length;
  view(`<section class="card hand">
    <p class="cap">${L.p+1}人目／${nx}人</p>
    <p class="big">${esc(p.name)}さんの番です</p>
    <p class="hint">ほかの人には画面を見せないでね。<br>自分の答えと、${nx===2?esc(L.players[1-L.p].name)+'さん':'みんなの多数派'}の予想を${L.qs.length}問選びます。</p>
    <button class="btn" id="ready" style="align-self:stretch">準備できた</button>
  </section>`);
  $('ready').onclick=localAsk;
}
function localAsk(){
  const p=L.players[L.p],k=L.qs[L.i],n=L.qs.length,multi=L.players.length>1;
  const a=p.ans[L.i]||(p.ans[L.i]={o:-1,g:-1,st:0,ms:0});
  const step=a.o<0?'own':'guess';
  const other=L.players.length===2?L.players[1-L.p].name+'さんはどっちを選んだと思う？':'みんな（自分以外）でいちばん多い答えは？';
  view(askHTML(k,L.i,n,{who:multi?p.name+'さん':'',guessLabel:other,step,star:CFG.len===30,starOn:a.st}));
  const t0=Date.now();
  bindAsk((v,starOn)=>{
    if(v===null){a.st=starOn?1:0;return}
    if(step==='own'){a.o=v;a.ms=Date.now()-t0;if(multi){localAsk();return}}else a.g=v;
    L.i++;
    if(L.i<n){localAsk();return}
    L.i=0;L.p++;
    if(L.p<L.players.length){passHand();return}
    showResult({players:L.players,qs:L.qs,me:L.mode==='solo'?'me':null,anon:false,local:true});
  });
}

/* ===== 結果 ===== */
// 2人の合い方：同じ＝ぴったり／片方が「こだわらない」＝合わせられる／AとBで分かれた＝ちがい
function pairStat(A,B,qs){
  let s=0,n=0;const r={same:[],adj:[],diff:[],starSame:[],starDiff:[]};
  qs.forEach((k,i)=>{const a=A.ans[i],b=B.ans[i];if(!a||!b||a.o<0||b.o<0)return;n++;
    if(a.o===b.o){s+=1;r.same.push(i);if(a.st&&b.st&&a.o<2)r.starSame.push(i)}
    else if(a.o===2||b.o===2){s+=.5;r.adj.push(i)}
    else{r.diff.push(i);if(a.st||b.st)r.starDiff.push(i)}});
  r.pct=n?Math.round(s/n*100):0;r.n=n;return r;
}
function guessHits(G){
  let hit=0,tot=0;const per={};G.players.forEach(p=>per[p.id]={h:0,t:0});
  G.qs.forEach((k,i)=>G.players.forEach(p=>{const a=p.ans[i];if(!a||a.g<0)return;
    const os=G.players.filter(o=>o!==p).map(o=>o.ans[i]).filter(x=>x&&x.o>=0);if(!os.length)return;
    const c=[0,0,0];os.forEach(x=>c[x.o]++);const mx=Math.max(...c);
    tot++;per[p.id].t++;if(c[a.g]===mx){hit++;per[p.id].h++}}));
  return{hit,tot,per};
}
// 称号：だれも負けないように、全員に1つずつ配る
const TITLES=[
  ['読み名人','みんなの答えを、いちばん当てた人',p=>p.gh],
  ['合わせ上手','「こだわらない」がいちばん多い、まわりに合わせられる人',p=>p.flex],
  ['ブレない人','自分の好みがはっきりしている人',p=>-p.flex],
  ['みんなの真ん中','多数派の答えがいちばん多い人',p=>p.maj],
  ['個性派','少数派の答えがいちばん多い、自分らしさ全開の人',p=>p.min],
  ['即決さん','答えるのがいちばん速い人',p=>-p.ms],
  ['じっくりさん','いちばんじっくり考えて答える人',p=>p.ms],
  ['こだわり職人','「★ゆずれない」がいちばん多い人',p=>p.star],
];
function titles(G,gh){
  const ps=G.players.map(p=>{const xs=G.qs.map((k,i)=>p.ans[i]).filter(a=>a&&a.o>=0);
    let maj=0,min=0;G.qs.forEach((k,i)=>{const a=p.ans[i];if(!a||a.o<0||a.o===2)return;const c=[0,0,0];G.players.forEach(o=>{const x=o.ans[i];if(x&&x.o>=0)c[x.o]++});
      if(c[a.o]>c[1-a.o])maj++;else if(c[a.o]<c[1-a.o])min++});
    return{id:p.id,flex:xs.filter(a=>a.o===2).length,star:xs.filter(a=>a.st).length,ms:xs.length?xs.reduce((s,a)=>s+a.ms,0)/xs.length:0,maj,min,gh:gh.per[p.id].t?gh.per[p.id].h/gh.per[p.id].t:0}});
  const out={},used=new Set();
  const usable=TITLES.filter(t=>t[0]!=='こだわり職人'||ps.some(p=>p.star>0));
  // ばらつきの大きい称号から順に、その称号がいちばん似合う人へ
  const spread=t=>{const v=ps.map(t[2]);return Math.max(...v)-Math.min(...v)};
  usable.slice().sort((a,b)=>spread(b)-spread(a)).forEach(t=>{const c=ps.filter(p=>!out[p.id]).sort((a,b)=>t[2](b)-t[2](a))[0];if(c&&!used.has(t[0])){out[c.id]=t;used.add(t[0])}});
  ps.forEach(p=>{if(!out[p.id])out[p.id]=['バランス派','どの問題も、自分のペースで答えた人']});
  return out;
}
function showResult(G){
  const ps=G.players,me=ps.find(p=>p.id===G.me),multi=ps.length>1,sec=ms=>(ms/1000).toFixed(1);
  const nm=p=>esc(p.name)+(p===me?'（あなた）':'');
  let h='';
  if(!multi){h=soloHTML(G);view(h+tailHTML());bindTail(G);return}
  // ① シンクロ率（予想が当たった割合。全員で1つの数字）
  const gh=guessHits(G),pct=gh.tot?Math.round(gh.hit/gh.tot*100):0;
  const msg=pct>=80?'ほとんど以心伝心！':pct>=50?'いい感じにわかり合えています':'まだ知らない顔がたくさん。だから楽しい';
  h+=`<section class="card score">
    <p class="cap">${ps.length===2?'2人':ps.length+'人'}のシンクロ率</p>
    <div class="ring" style="background:conic-gradient(var(--a) 0 ${pct}%,var(--line) ${pct}% 100%)"><div class="in"><span class="num">${pct}<small>%</small></span></div></div>
    <p class="msg">${msg}</p><p class="hint">${ps.length===2?'おたがいの答えを':'みんなの答えを'}${gh.tot}回予想して、${gh.hit}回当たりました</p></section>`;
  // ② 称号
  const T=titles(G,gh);
  const tl=(G.anon&&me)?[me]:ps;
  h+=`<section class="card"><p class="label">${G.anon?'あなたの称号':'みんなの称号'}</p>
    <ul class="titles">${tl.map(p=>`<li><b>${esc(T[p.id][0])}</b><span>${nm(p)}</span><small>${esc(T[p.id][1])}</small></li>`).join('')}</ul></section>`;
  // ③ 合う人
  const pairs=[];for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)pairs.push({a:ps[i],b:ps[j],r:pairStat(ps[i],ps[j],G.qs)});
  pairs.sort((x,y)=>y.r.pct-x.r.pct);
  const mine=me?pairs.filter(x=>x.a===me||x.b===me):pairs;
  const pairCard=x=>{const o=me?(x.a===me?x.b:x.a):null,r=x.r;
    return `<li class="pair"><div class="ph"><b>${me?nm(o):nm(x.a)+' × '+nm(x.b)}</b><em>${r.pct}%</em></div>
      <div class="bar"><i style="width:${r.pct}%"></i></div>
      <p class="hint">ぴったり ${r.same.length}問・合わせられる ${r.adj.length}問・ちがい ${r.diff.length}問</p>
      ${r.starSame.length?`<p class="good">★ ゆずれないところが同じ：${r.starSame.map(i=>esc(Q[G.qs[i]][1])).join('、')}</p>`:''}
      ${r.starDiff.length?`<p class="warn">★ ゆずれないところがちがう：${r.starDiff.map(i=>esc(Q[G.qs[i]][1])).join('、')}<br>ここは先に話しておくと安心です</p>`:''}</li>`};
  h+=`<section class="card"><p class="label">${ps.length===2?'2人のぴったり度':me?'あなたと合う人':'合うペア'}</p>
    <ul class="pairs">${(me?mine:pairs).slice(0,me?MAXP:3).map(pairCard).join('')}</ul>
    <p class="hint">同じ答え＝ぴったり、片方が「こだわらない」＝合わせられる、として数えています。</p></section>`;
  // ④ 問題のランキング
  const qst=G.qs.map((k,i)=>{const c=[0,0,0],to=[];let ms=0,m=0;ps.forEach(p=>{const a=p.ans[i];if(!a)return;if(a.o>=0)c[a.o]++;if(a.to)to.push(p);if(a.o>=0||a.to){ms+=a.ms;m++}});return{i,k,c,to,avg:m?ms/m:0}});
  const split=qst.filter(x=>x.c[0]&&x.c[1]).sort((a,b)=>Math.abs(a.c[0]-a.c[1])-Math.abs(b.c[0]-b.c[1])).slice(0,3);
  const uni=qst.filter(x=>{const t=x.c[0]+x.c[1]+x.c[2];return t>=2&&(x.c[0]===t||x.c[1]===t)});
  const hard=qst.slice().sort((a,b)=>b.avg-a.avg)[0],tos=qst.filter(x=>x.to.length);
  h+=`<section class="card"><p class="label">問題のランキング</p>
    ${split.length?`<p class="sub">意見がまっぷたつ</p><ul class="list">${split.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${[0,1].map(v=>`<span class="ansrow"><i class="o${v}">${esc(Q[x.k][v+2])}</i>${x.c[v]}人</span>`).join('')}</li>`).join('')}</ul>`:''}
    ${uni.length?`<p class="sub">全員一致</p><ul class="list">${uni.slice(0,3).map(x=>`<li><b>${esc(Q[x.k][1])}</b><span class="ansrow"><i class="o${x.c[0]?0:1}">${esc(x.c[0]?Q[x.k][2]:Q[x.k][3])}</i>全員</span></li>`).join('')}</ul>`:''}
    <p class="sub">いちばん悩んだ問題</p>
    <div class="ponder"><b>${esc(Q[hard.k][1])}</b><span>平均 <em>${sec(hard.avg)}</em> 秒</span></div>
    ${tos.length?`<p class="sub">${LIMIT}秒、悩みきった人</p><ul class="list">${tos.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${G.anon?x.to.length+'人':x.to.map(nm).join('、')}</li>`).join('')}</ul>`:''}
  </section>`;
  // ⑤ ゆずれないこと
  const starP=(G.anon&&me?[me]:ps).map(p=>({p,xs:G.qs.map((k,i)=>({k,a:p.ans[i]})).filter(x=>x.a&&x.a.st&&x.a.o>=0&&x.a.o<2)})).filter(x=>x.xs.length);
  if(starP.length)h+=`<section class="card"><p class="label">★ ゆずれないこと</p>${starP.map(x=>`<div class="tori"><p class="sub">${nm(x.p)}</p><ul>${x.xs.map(y=>`<li>${esc(Q[y.k][1])} ${esc(ans(y.a.o,y.k))}</li>`).join('')}</ul></div>`).join('')}</section>`;
  // ⑥ みんなの答え（1問ずつ）
  h+=`<section class="card"><details><summary class="label">みんなの答えを1問ずつ見る</summary><ul class="list all">${qst.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${[0,1,2].map(v=>{const who=ps.filter(p=>p.ans[x.i]&&p.ans[x.i].o===v);return who.length?`<span class="ansrow"><i class="o${v}">${esc(ans(v,x.k))}</i>${G.anon?who.length+'人':who.map(nm).join('、')}</span>`:''}).join('')}</li>`).join('')}</ul></details></section>`;
  view(h+tailHTML());bindTail(G);
}
function soloHTML(G){
  const p=G.players[0],xs=G.qs.map((k,i)=>({k,i,a:p.ans[i]})).filter(x=>x.a&&x.a.o>=0),sec=ms=>(ms/1000).toFixed(1);
  const firm=xs.filter(x=>x.a.o<2),flex=xs.filter(x=>x.a.o===2),star=firm.filter(x=>x.a.st);
  const byT=xs.slice().sort((a,b)=>b.a.ms-a.a.ms);
  const pct=xs.length?Math.round(flex.length/xs.length*100):0;
  const msg=pct>=50?'まわりに合わせられる、やわらかい人':pct>=25?'こだわりと柔らかさのバランス型':'自分の好みがはっきりしている人';
  return `<section class="card score">
    <p class="cap">${p.name==='あなた'?'あなた':esc(p.name)+'さん'}の「合わせられる度」</p>
    <div class="ring" style="background:conic-gradient(var(--a) 0 ${pct}%,var(--line) ${pct}% 100%)"><div class="in"><span class="num">${pct}<small>%</small></span></div></div>
    <p class="msg">${msg}</p><p class="hint">${xs.length}問のうち「こだわらない」が${flex.length}問</p></section>
  ${star.length?`<section class="card"><p class="label">★ ゆずれないこと</p><ul class="list">${star.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${esc(ans(x.a.o,x.k))}</li>`).join('')}</ul></section>`:''}
  <section class="card"><p class="label">あなたのこだわり</p><ul class="list">${firm.filter(x=>!x.a.st).map(x=>`<li><b>${esc(CATS[Q[x.k][0]][0])}｜${esc(Q[x.k][1])}</b><span class="ansrow"><i class="o${x.a.o}">${esc(ans(x.a.o,x.k))}</i></span></li>`).join('')||'<li>今回はぜんぶ「こだわらない」でした</li>'}</ul></section>
  ${flex.length?`<section class="card"><p class="label">合わせられること</p><p class="hint">${flex.map(x=>esc(Q[x.k][1])).join('　')}</p></section>`:''}
  ${byT.length>1?`<section class="card"><p class="label">いちばん悩んだ問題</p><div class="ponder"><b>${esc(Q[byT[0].k][1])}</b><span>「${esc(ans(byT[0].a.o,byT[0].k))}」まで <em>${sec(byT[0].a.ms)}</em> 秒</span></div>
    <p class="hint">いちばん即決は「${esc(Q[byT[byT.length-1].k][1])}」（${sec(byT[byT.length-1].a.ms)} 秒）</p></section>`:''}
  <section class="card"><p class="label">だれかと答え合わせしてみる？</p><p class="hint">好みが合うか、2〜10人で遊べます。</p><button class="btn" id="tog">みんなで遊ぶ</button></section>`;
}
function tailHTML(){return `<a class="promo" href="https://166unmei.com" target="_blank" rel="noopener">
    <span class="t"><b>1.66 奇跡の相性診断</b><span>生年月日で、2人の運命の相性がわかる</span><em>166unmei.com</em></span><span class="go" aria-hidden="true">↗</span></a>
  <button class="btn ghost small" id="share">結果をシェアする</button><p class="hint" id="shared" hidden></p>
  <div class="row"><button class="btn" id="again">もう1回あそぶ</button><button class="btn ghost" id="home">トップへ</button></div>`}
// シェア：スマホの共有（使えないときはコピー）。名前は入れない
function shareText(G){
  const ps=G.players,url=WHERE==='claude'?ART_URL:location.href.split('#')[0].split('?')[0];
  if(ps.length<2){const p=ps[0],xs=G.qs.map((k,i)=>p.ans[i]).filter(a=>a&&a.o>=0),f=xs.filter(a=>a.o===2).length;
    return{t:`わたしの「合わせられる度」は ${xs.length?Math.round(f/xs.length*100):0}% でした。あなたは？\n#アイシンク`,url}}
  const gh=guessHits(G);return{t:`${ps.length===2?'2人':ps.length+'人'}のシンクロ率は ${gh.tot?Math.round(gh.hit/gh.tot*100):0}% でした！\n2択に答えて答え合わせ。みんなでも遊べます\n#アイシンク`,url}}
function doShare(G){const {t,url}=shareText(G),d=$('shared');
  if(navigator.share){navigator.share({title:'アイ・シンク（I-Sync）',text:t,url}).catch(()=>{});return}
  const full=t+'\n'+url;d.hidden=false;
  try{navigator.clipboard.writeText(full).then(()=>{d.textContent='シェアの文をコピーしました。SNSやメッセージに貼ってください。'},()=>{d.textContent=full})}catch(e){d.textContent=full}}
function bindTail(G){
  $('share').onclick=()=>doShare(G);
  const t=$('tog');if(t)t.onclick=()=>{CFG.mode='each';saveCfg();goTop()};
  $('again').onclick=e=>{if(R.code){e.target.disabled=true;roomAgain();return}
    if(L.mode==='solo')soloStart(L.players[0].name==='あなた'?'':L.players[0].name);else passStart(L.players.map(p=>p.name))};
  $('home').onclick=()=>{if(R.code)leaveRoom();goTop()};
}

/* ===== みんなのスマホで（部屋・10人まで・1問20秒） ===== */
const ART_URL='https://claude.ai/artifact/AdtUnSrAdJDGECVQmtHSht';  // 確認用ページ（claude.ai）のときだけQRの行き先にする
let WHERE='';  // 'claude'＝確認用ページ／'firebase'＝公開先
const PID=store('kv_pid')||(()=>{const p='p'+Math.random().toString(36).slice(2,10);store('kv_pid',p);return p})();
const R={code:null,room:undefined,players:{},un:[],key:'',seen:{},adv:{},tick:null,my:null,poll:null};
let dbP=null;
function getDb(){if(!dbP)dbP=(async()=>{
  try{if(window.claude&&typeof claude.use==='function'){const d=await claude.use('db');if(d){WHERE='claude';return d}}}catch(e){}
  try{const f=await FB.init();if(f){WHERE='firebase';return f}}catch(e){}
  return null})();return dbP}

/* Firebase（Firestore）：公開先で部屋を共有する。firebase-config.js に設定があるときだけ読みこむ。
   ほかのサイトとまざらないよう、置き場所の名前の頭に「isync_」を付ける（rooms → isync_rooms）。 */
const FB=(()=>{
  let ready=null;
  const load=src=>new Promise((ok,ng)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ng;document.head.appendChild(s)});
  const P=p=>'isync_'+p;
  const clean=d=>JSON.parse(JSON.stringify(d||{}));   // Firestore は空の値（undefined）を受けつけないので取りのぞく
  const ttl=(path,d)=>/^rooms\//.test(path)?Object.assign({},d,{expireAt:new Date((d.created||d.joined||Date.now())+12*3600e3)}):d; // 部屋は12時間で消す（expireAt に TTL を設定）
  const strip=d=>{if(d){d=Object.assign({},d);delete d.expireAt}return d};
  const sd=s=>({id:s.id,exists:s.exists,data:()=>strip(s.data())});
  function wrap(fs){return{
    doc(path){const r=fs.doc(P(path));return{
      get:()=>r.get().then(sd),
      set:d=>r.set(ttl(path,clean(d))),
      update:d=>r.update(clean(d)),
      delete:()=>r.delete(),
      onSnapshot:(cb,err)=>r.onSnapshot(s=>cb(sd(s)),err)}},
    collection(path){const c=fs.collection(P(path));return{
      get:()=>c.get().then(q=>({docs:q.docs.map(sd)})),
      onSnapshot:(cb,err)=>c.onSnapshot(q=>cb({docs:q.docs.map(sd)}),err)}}}}
  function init(){
    if(ready)return ready;
    ready=(async()=>{const cfg=window.ISYNC_FB;if(!cfg||!cfg.projectId)return null;
      try{if(!window.firebase||!firebase.firestore){await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js')}
        const app=(firebase.apps||[]).find(a=>a.name==='isync')||firebase.initializeApp(cfg,'isync');return wrap(app.firestore())}catch(e){return null}})();
    return ready}
  return{init};
})();
const NO_DB='この画面では「みんなのスマホで」が使えません。「1台を回して」で遊んでください。';
const pPath=(c,id)=>'rooms/'+c+'/players/'+id;
const alive=r=>r&&Date.now()-(r.created||0)<12*3600e3;
const plist=()=>Object.entries(R.players).map(([id,p])=>Object.assign({id},p)).sort((a,b)=>(a.joined||0)-(b.joined||0));
async function createRoom(name){
  const db=await getDb();if(!db)return NO_DB;
  try{
    let code='';
    for(let t=0;t<8;t++){const c=String(1000+Math.floor(Math.random()*9000));const s=await db.doc('rooms/'+c).get();if(!s.exists||!alive(s.data())){code=c;break}}
    if(!code)return '部屋を作れませんでした。もう一度押してください。';
    const old=await db.collection('rooms/'+code+'/players').get();
    for(const d of old.docs)await db.doc(pPath(code,d.id)).delete();
    await db.doc('rooms/'+code).set({created:Date.now(),round:1,phase:'lobby',qi:0,qs:deal(CFG.len,CFG.topic),len:CFG.len,topic:CFG.topic,anon:CFG.anon});
    await db.doc(pPath(code,PID)).set({name,ans:{},round:1,joined:Date.now(),ready:false});
    enterRoom(code);return 'ok';
  }catch(e){return '部屋を作れませんでした。この画面では書きこみが許可されていないかもしれません。'}
}
async function joinRoom(code,name){
  const db=await getDb();if(!db)return NO_DB;
  try{
    const rs=await db.doc('rooms/'+code).get();
    if(!rs.exists||!alive(rs.data()))return 'その番号の部屋が見つかりません。番号を確かめてください。';
    const room=rs.data(),ps=await db.collection('rooms/'+code+'/players').get();
    if(!ps.docs.some(d=>d.id===PID)){
      if(!name)return 'ニックネームを入れてください';
      if(ps.docs.length>=MAXP)return 'この部屋は、もう'+MAXP+'人そろっています。';
      await db.doc(pPath(code,PID)).set({name,ans:{},round:room.round||1,joined:Date.now(),ready:false});
    }
    enterRoom(code);return 'ok';
  }catch(e){return '参加できませんでした。この画面では書きこみが許可されていないかもしれません。'}
}
async function enterRoom(code){
  leaveRoom(true);
  Object.assign(R,{code,key:'',room:undefined,players:{},seen:{},adv:{},my:null});store('kv_room',{code});
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}JOIN='';
  view('<section class="card hand"><p class="hint">部屋につないでいます…</p></section>');
  await subscribe();
  R.poll=setInterval(pull,2000);   // 知らせが止まっても取り残されないよう、2秒ごとに自分からも確かめる
}
async function subscribe(){
  const db=await getDb(),code=R.code;if(!code)return;
  R.un.forEach(f=>{try{f()}catch(e){}});R.un=[];
  const again=()=>setTimeout(()=>{if(R.code===code)subscribe()},1000);
  R.un.push(db.doc('rooms/'+code).onSnapshot(s=>{R.room=s.exists?s.data():null;sync()},again));
  R.un.push(db.collection('rooms/'+code+'/players').onSnapshot(q=>{R.players={};q.docs.forEach(d=>R.players[d.id]=d.data());sync()},again));
}
async function pull(){
  const db=await getDb(),code=R.code;if(!code||R.pulling)return;R.pulling=true;
  try{const [rs,ps]=await Promise.all([db.doc('rooms/'+code).get(),db.collection('rooms/'+code+'/players').get()]);
    if(R.code!==code)return;R.room=rs.exists?rs.data():null;R.players={};ps.docs.forEach(d=>R.players[d.id]=d.data());sync()}
  catch(e){}finally{R.pulling=false}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&R.code){subscribe();pull()}});
function leaveRoom(keep){R.un.forEach(f=>{try{f()}catch(e){}});R.un=[];R.code=null;clearInterval(R.tick);clearInterval(R.poll);if(!keep)store('kv_room',null)}
async function roomUpdate(patch){const db=await getDb();try{await db.doc('rooms/'+R.code).update(patch)}catch(e){}}
function advance(k,rd){const id=rd+'-'+k;if(R.adv[id])return;R.adv[id]=1;const n=(R.room.qs||[]).length;roomUpdate(k+1<n?{qi:k+1}:{phase:'result'})}
const rAns=(p,k)=>{const x=p&&p.ans&&p.ans[k];return x?{o:x.o,g:x.g,st:x.st||0,ms:x.ms||0,to:!!x.to,d:!!x.d}:null};
async function sync(){
  const room=R.room,me=R.players[PID];
  if(!R.code||room===undefined)return;
  if(!room||!alive(room)){leaveRoom();goTop();return}
  if(!me)return;
  const db=await getDb(),rd=room.round||1,ps=plist(),n=(room.qs||[]).length;
  if((me.round||1)<rd){db.doc(pPath(R.code,PID)).update({ans:{},round:rd});return}
  if(room.phase==='lobby'){
    if(ps.length>=2&&ps.every(p=>p.ready)&&!R.adv['go'+rd]){R.adv['go'+rd]=1;roomUpdate({phase:'play',qi:0})}
    const key='lobby'+ps.map(p=>p.name+(p.ready?1:0)).join('|');if(key!==R.key){R.key=key;lobby()}return}
  if(room.phase==='play'){
    const k=room.qi||0,done=ps.filter(p=>{const a=rAns(p,k);return a&&a.d&&(p.round||1)===rd});
    if(done.length>=ps.length&&ps.length>0){advance(k,rd);return}
    const qk='q'+rd+'-'+k;
    if(R.key!==qk){const fresh=k===0&&!/^q/.test(R.key);R.key=qk;R.my={o:-1,g:-1,st:0,ms:0,fin:false};
      if(fresh){markSeen(room.qs);countdown(qk,()=>{R.seen[qk]=Date.now();rAsk(k,qk)})}else{R.seen[qk]=Date.now();rAsk(k,qk)}}
    else if(R.seen[qk])rCount(done.length,ps.length);
    return}
  clearInterval(R.tick);
  if(room.phase==='result'){const key='res'+rd+'-'+ps.map(p=>p.id).join();if(key===R.key)return;R.key=key;
    showResult({players:ps.map(p=>({id:p.id,name:p.name,ans:room.qs.map((q,i)=>rAns(p,i))})),qs:room.qs,me:PID,anon:!!room.anon})}
}
function countdown(qk,go){
  const ps=plist();let n=3;
  const draw=()=>view(`<section class="card hand"><p class="cap">${ps.length}人そろいました</p><p class="cd">${n}</p><p class="hint">1問${LIMIT}秒。全員が答えたら、すぐ次の問題へ。</p></section>`);
  draw();clearInterval(R.tick);
  R.tick=setInterval(()=>{if(R.key!==qk){clearInterval(R.tick);return}n--;if(n>0)draw();else{clearInterval(R.tick);go()}},800);
}
function rAsk(k,qk){
  const room=R.room,ps=plist(),two=ps.length<=2,o=ps.find(p=>p.id!==PID),qid=room.qs[k],n=room.qs.length;
  const gl=two?`${o?o.name:'相手'}さんはどっちを選んだと思う？`:'みんな（自分以外）でいちばん多い答えは？';
  const draw=()=>{const m=R.my,step=m.fin?'done':m.o<0?'own':'guess';
    view(askHTML(qid,k,n,{guessLabel:gl,step,star:room.len===30,starOn:m.st,timer:true}));
    bindAsk(tap);paint()};
  const tap=(v,starOn)=>{const m=R.my;if(v===null){m.st=starOn?1:0;return}
    if(m.fin)return;
    if(m.o<0){m.o=v;m.ms=Date.now()-R.seen[qk]}else{m.g=v;m.fin=true}
    save(k,!!m.fin,false);draw()};
  const paint=()=>{const left=Math.max(0,LIMIT*1000-(Date.now()-R.seen[qk])),s=$('tsec'),b=$('tbar');
    if(s){s.textContent=Math.ceil(left/1000);s.classList.toggle('hurry',left<=5000)}if(b)b.style.width=(left/(LIMIT*10))+'%';return left};
  clearInterval(R.tick);
  R.tick=setInterval(()=>{if(R.key!==qk){clearInterval(R.tick);return}const left=paint();
    if(left<=0){const m=R.my;if(!m.fin){const to=m.o<0;if(to)m.ms=LIMIT*1000;m.fin=true;save(k,true,to);draw()}
      if(Date.now()-R.seen[qk]>LIMIT*1000+1500)advance(k,R.room.round||1)}},250);
  draw();
}
async function save(k,fin,to){const db=await getDb(),me=R.players[PID];if(!db||!me)return;
  const m=R.my,a=Object.assign({},me.ans||{});
  a[k]={o:m.o<0?-1:m.o,g:m.g<0?-1:m.g,st:m.st||0,ms:m.ms||0,to:!!to,d:!!fin};
  R.players[PID]=Object.assign({},me,{ans:a});
  try{await db.doc(pPath(R.code,PID)).update({ans:a})}catch(e){}
  if(fin){const ps=plist(),rd=R.room.round||1;   // 自分が最後の1人なら、知らせを待たずにすぐ次へ
    if(ps.every(p=>{const x=rAns(p,k);return x&&x.d&&(p.round||1)===rd}))advance(k,rd)}}
function rCount(d,n){const el=$('tcnt');if(el)el.textContent=`みんなを待っています（${d}／${n}人 答えた）`}
function joinUrl(c){return (WHERE==='claude'?ART_URL:location.href.split('#')[0].split('?')[0])+'#join-'+c}
let qrP=null;
function loadQR(){if(window.QRCode)return Promise.resolve();if(!qrP)qrP=new Promise((ok,ng)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';sc.onload=ok;sc.onerror=ng;document.head.appendChild(sc)});return qrP}
function lobby(){
  const c=R.code,url=joinUrl(c),ps=plist(),me=R.players[PID]||{},nr=ps.filter(p=>p.ready).length,all=ps.length>=2&&nr===ps.length,room=R.room;
  view(`<section class="card hand">
    <p class="cap">部屋番号</p><p class="code">${esc(c)}</p>
    <div class="qr" id="qr" aria-label="参加用のQRコード"></div>
    <p class="hint">みんなのスマホのカメラで、このQRコードを読みとってください。<br>または、トップの「友だちの部屋に参加する」に ${esc(c)} を入れます。</p>
    <button class="btn ghost small" id="cp" style="align-self:stretch">離れている人に送るリンクをコピー</button><p class="hint" id="cpd" hidden></p>
    <p class="hint">${room.len===30?'しっかり版（30問・★ゆずれない）':'簡易版（10問）'}・話題は${room.topic==='party'?'盛り上がる':'いろいろ'}${room.anon?'・名前は見せない':''}</p>
  </section>
  <section class="card">
    <div class="lobby-head"><p class="label">参加している人</p><span class="cnt">${ps.length}／${MAXP}人</span></div>
    <ul class="members">${ps.map(p=>`<li class="${p.ready?'ok':''}"><span>${esc(p.name)}${p.id===PID?'（あなた）':''}</span><b>${p.ready?'✓ 準備OK':'まだ'}</b></li>`).join('')}</ul>
    <p class="status ${all?'go':''}">${all?'全員そろいました！ スタートします':ps.length<2?'もう1人以上の参加を待っています':`準備OK ${nr}／${ps.length}人。全員がOKになったら、自動でスタートします`}</p>
    <button class="btn ${me.ready?'ghost':''}" id="rd">${me.ready?'準備OKを取り消す':'準備OK'}</button>
    ${ps.length>=2&&!all?'<button class="btn ghost small" id="st">来ない人がいるので、このメンバーでスタート</button>':''}
  </section>
  <button class="btn ghost small" id="home">部屋を出てトップへ</button>`);
  loadQR().then(()=>{const el=$('qr');if(!el)return;el.innerHTML='';new QRCode(el,{text:url,width:180,height:180,colorDark:'#22253A',colorLight:'#FFFFFF',correctLevel:QRCode.CorrectLevel.M})}).catch(()=>{const el=$('qr');if(el)el.hidden=true});
  $('cp').onclick=()=>{const d=$('cpd');d.hidden=false;try{navigator.clipboard.writeText(url).then(()=>{d.textContent='コピーしました。メッセージで送ってください。'},()=>{d.textContent=url})}catch(e){d.textContent=url}};
  $('rd').onclick=async e=>{e.target.disabled=true;const db=await getDb();try{await db.doc(pPath(R.code,PID)).update({ready:!me.ready})}catch(x){}pull()};
  const st=$('st');if(st)st.onclick=e=>{e.target.disabled=true;roomUpdate({phase:'play',qi:0})};
  $('home').onclick=async()=>{const db=await getDb(),code=R.code;leaveRoom();try{await db.doc(pPath(code,PID)).delete()}catch(e){}goTop()};
}
function roomAgain(){const r=R.room;roomUpdate({round:(r.round||1)+1,phase:'play',qi:0,qs:deal(r.len||10,r.topic||'all')})}

goTop();
