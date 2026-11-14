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
// 話題：いろいろ＝6テーマを同じくらい／盛り上がる＝ドキドキ多め・結婚とお金の話はなし
const TOPICS={all:['恋愛・連絡','暮らし','食','お金','休日・遊び','将来・家族'].map(CI),
  party:['ドキドキ','恋愛・連絡','休日・遊び','ドキドキ','食','暮らし'].map(CI)};
const MAXP=10, KON_MAX=40, KON_LEN=20;
// 時間の制限は出さない（焦らせないため）。答えない人がいて止まったときだけ：ふつうの部屋は45秒で「答えた人だけで先に進む」、婚活の部屋は60秒で自動で次へ
const WAIT_BTN=45, KON_WAIT=60;
const maxOf=room=>room&&room.kind==='kon'?KON_MAX:MAXP;
const OPTS=['A','B','こだわらない'];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function store(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||'null');if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const app=$('app');
function view(h){app.innerHTML='<div class="scr">'+h+'</div>';window.scrollTo(0,0)}
/* 価値観のタイプ（axes.js）：問題の文から番号を引く。left＝左の傾向になる答え */
const AX=Object.entries(window.SY_AX||{}).map(([key,a])=>{const m=new Map();a.qs.forEach(([t,o])=>{const i=Q.findIndex(q=>q[1]===t);if(i>=0)m.set(i,o)});return{key,l:a.l,r:a.r,name:a.name,m}}).filter(a=>a.m.size);
// その人の傾向：左の答え＝1・こだわらない＝0.5・右の答え＝0 の平均（左寄りの％）。その物差しの問題に答えていなければ null
function axScore(p,qs,a){let s=0,n=0;qs.forEach((k,i)=>{if(!a.m.has(k))return;const x=p.ans[i];if(!x||x.o<0)return;n++;s+=x.o===2?.5:x.o===a.m.get(k)?1:0});return n?{pct:Math.round(s/n*100),n}:null}
const ans=(o,k)=>o===0?Q[k][2]:o===1?Q[k][3]:o===2?(Q[k][4]||'こだわらない'):'時間切れ';

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
function ensureAx(out,len,cats,seen){
  const m=len>=30?3:1,inAx=i=>AX.some(a=>a.m.has(i));
  AX.forEach(a=>{
    let have=out.filter(i=>a.m.has(i)).length;
    const cand=shuffle([...a.m.keys()].filter(i=>cats.has(Q[i][0])&&!out.includes(i))).sort((x,y)=>seen.has(x)-seen.has(y));
    while(have<m&&cand.length){const c=cand.shift();
      let j=out.findIndex(i=>!inAx(i)&&Q[i][0]===Q[c][0]);if(j<0)j=out.findIndex(i=>!inAx(i));if(j<0)break;
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
const CFG=Object.assign({mode:'each',len:10,topic:'all',anon:false},store('kv_cfg')||{});
if(!['each','solo','kon'].includes(CFG.mode))CFG.mode='each';  // 前の「1台を回して」はなくした
let JOIN=(/^#join-(\d{4})$/.exec(location.hash||'')||[])[1]||'';
if(JOIN)CFG.mode='each';
if(['kon','solo','each'].includes(QS.get('mode')))CFG.mode=QS.get('mode');
const saveCfg=()=>store('kv_cfg',{mode:CFG.mode,len:CFG.len,topic:CFG.topic,anon:CFG.anon});
function seg(name,items){return `<div class="chips c${items.length}" role="group">${items.map(([v,l])=>`<button class="chip" data-k="${name}" data-v="${v}" aria-pressed="${String(CFG[name])===String(v)}">${l}</button>`).join('')}</div>`}
function goTop(){
  const st=store('kv_room');
  view(`
  <header class="brand">
    <div class="bubbles" aria-hidden="true"><i class="m" style="left:4%;top:30px;--s:34px;--d:0s;--t:9s"></i><i class="p" style="left:16%;top:150px;--s:16px;--d:2s;--t:7s"></i><i class="p" style="left:80%;top:18px;--s:44px;--d:1s;--t:10s"></i><i class="m" style="left:90%;top:170px;--s:20px;--d:3s;--t:8s"></i><i class="l" style="left:70%;top:110px;--s:12px;--d:0.5s;--t:6s"></i><i class="l" style="left:24%;top:80px;--s:10px;--d:4s;--t:7s"></i><i class="m" style="left:58%;top:4px;--s:22px;--d:2.5s;--t:9s"></i><i class="p" style="left:3%;top:222px;--s:18px;--d:1.5s;--t:11s"></i><i class="m" style="left:93%;top:240px;--s:12px;--d:5s;--t:8s"></i></div>
    <div class="orb" aria-hidden="true"></div>
    <h1 class="logo">I-Sync</h1><p class="kana">アイ・シンク</p><p class="tl">わたしとあなたの、重なるところ</p>
    <p class="lead">好みや考え方の2択に答えて、答え合わせ。<br>どこが重なって、どこがちがうかがわかる診断です。</p>
  </header>
  ${PACK?`<section class="card packb"><p class="label">「${esc(PACK.title)}」の質問から出します</p><p class="hint">このテーマの質問だけで、ひとりでも、みんなでも遊べます。</p><button class="btn ghost small" id="packx">いつもの質問にもどす</button></section>`:''}
  <section class="card intro">
    <p class="label">たとえば、こんな問題</p>
    <div class="ex"><p class="exq">LINEは？</p>
      <p class="exo"><span class="o0">A　毎日やりとりしたい</span><span class="o1">B　用があるときだけでいい</span><span class="o2">こだわらない</span></p></div>
    <p class="label">わかること</p>
    <ul class="know">
      <li><b>シンクロ率</b><span>2人の答えが、どれだけ重なったか</span></li>
      <li><b>ぴったり度</b><span>同じ・合わせられる・ちがう答えの数</span></li>
      <li><b>ゆずれないこと</b><span>「★ゆずれない」をつけた大事なところが合うか（しっかり版）</span></li>
      <li><b>価値観のタイプ</b><span>きっちり派？計画派？いつも一緒派？コツコツ派？</span></li>
      <li><b>話しておきたいこと</b><span>答えが反対になった、大事なところ</span></li>
    </ul>
    <p class="hint">恋人・気になる人・友だち・家族と。ひとりでも遊べます（10問・約3分）。</p>
    <p class="hint">婚活パーティー・街コンでも使えます。QRを読むだけで、その場の40人まで遊べます（アプリ不要）。</p>
  </section>
  ${st&&st.code?`<button class="btn ghost small" id="back">さっきの部屋（${esc(st.code)}）にもどる</button>`:''}
  <section class="card">
    <p class="label">だれと遊ぶ？</p>
    ${seg('mode',[['each','みんなで<br><small>それぞれのスマホで</small>'],['kon','大人数で<br><small>名前を出さずに</small>'],['solo','ひとりで']])}
    <p class="hint" id="m-desc"></p>
    <div id="m-opts" class="stack">
    <p class="label">長さは？</p>
    ${seg('len',[[10,'簡易版<br><small>10問・さくっと</small>'],[30,'しっかり版<br><small>30問・★ゆずれない</small>']])}
    <p class="label">話題は？</p>
    ${seg('topic',[['all','いろいろ'],['party','盛り上がる']])}
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
    <a class="btn ghost small" href="host/">主催者の方へ（使い方・テーブル用の案内）</a>
  </section>
  <section class="card" id="m-each">
    <label class="one-name" for="me"><span>ニックネーム</span><input type="text" id="me" maxlength="10" placeholder="本名でなくてOK" value="${esc(store('kv_name')||'')}"></label>
    <button class="btn" id="mk">部屋を作る</button>
    <div class="join">
      <label for="code"><span>友だちの部屋に参加する</span></label>
      <div class="join-row"><input type="text" id="code" inputmode="numeric" maxlength="4" placeholder="部屋番号（4けた）" value="${esc(JOIN)}"><button class="btn small" id="jn">参加</button></div>
    </div>
    <p class="hint">部屋のQRコードを、自分のスマホのカメラで読みとっても参加できます。</p>
    <p class="err" id="err" role="alert"></p>
  </section>
  <section class="card" id="m-solo">
    <label class="one-name" for="sn"><span>ニックネーム</span><input type="text" id="sn" maxlength="10" placeholder="なくてもOK" value="${esc(store('kv_name')||'')}"></label>
    <button class="btn" id="sgo">はじめる</button>
  </section>
  <a class="btn line small" id="lntop" href="#" target="_blank" rel="noopener">LINEでアイ・シンクを教える</a>
  <section class="card themes"><p class="label">テーマ別の質問</p>
    <ul class="tlinks">${(window.SY_PAGES||[]).map(p=>`<li><a href="${p.slug}/">${esc(p.h1)}</a></li>`).join('')}<li><a href="host/">婚活パーティー・街コンの主催者の方へ</a></li></ul></section>
  ${PROMO}
  <p class="note">どの問題にも正解はありません。どちらでもいいときは、3つ目の答え（「こだわらない」「どっちも好き」など）を選んでください。</p>`);
  const DESC={kon:'最大40人。番号だけで参加して、名前を出さずに一斉に20問。終わると、自分と合う人が、自分のスマホにだけ出ます。',each:'2〜10人で。1人が部屋を作り、そばにいる人はQRコードを読みとるだけで参加できます。離れている人には、LINEなどでリンクを送ります。',solo:'自分の答えから、あなたのこだわりと、ゆずれることがわかります。'};
  const refresh=()=>{['each','solo','kon'].forEach(m=>$('m-'+m).hidden=CFG.mode!==m);
    $('m-desc').textContent=DESC[CFG.mode];$('m-anon').hidden=CFG.mode!=='each';$('m-opts').hidden=CFG.mode==='kon';
  };
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
  // 婚活・街コン
  $('mkk').onclick=async e=>{e.target.disabled=true;const r=await createKonRoom();if(r!=='ok'){$('kerr').textContent=r;e.target.disabled=false}};
  $('kjn').onclick=()=>{const c=$('kcode').value.replace(/\D/g,'');if(c.length!==4){$('kerr').textContent='4けたの部屋番号を入れてください';return}joinFromLink(c)};
  const px=$('packx');if(px)px.onclick=()=>{location.href=location.pathname};
  const lt=$('lntop'),ltSet=()=>{lt.href=lineUrl('アイ・シンク｜2択に答えて答え合わせ。おたがいの重なるところがわかる無料の診断です。',siteUrl())};ltSet();lt.addEventListener('click',ltSet);
  // ひとりで
  $('sgo').onclick=()=>{const v=$('sn').value.trim();if(v)store('kv_name',v);soloStart(v)};
}

/* ===== 1問の画面（どのモードでも同じ） =====
   o: 0=A 1=B 2=こだわらない（3つ目の答え） ／ st: ★ゆずれない（相手の答えの予想はなくした＝鑑定者本人の判断 2026-11-13） */
function askHTML(k,i,n,{who,step,star,starOn}){
  const q=Q[k],cat=CATS[q[0]];
  const opt=(v,cls='')=>`<button class="opt ${cls}" data-v="${v}">${v<2?`<span class="k">${OPTS[v]}</span>`:''}<span>${esc(ans(v,k))}</span></button>`;
  return `<section class="card ask"><img class="chara c-ask" src="img/pair-think.webp" width="124" height="79" alt="" aria-hidden="true">
    <div class="prog">${Array.from({length:n},(_,j)=>`<i class="${j<=i?'on':''}"></i>`).join('')}</div>
    <div class="qhead"><span class="tag catg c${q[0]}">${esc(cat[0])}</span><span class="qn">${i+1}／${n}${who?`　${esc(who)}`:''}</span></div>
    ${cat[1]?`<p class="if">${esc(cat[1])}</p>`:''}
    <h2 class="q">${esc(q[1])}</h2>
    ${step==='done'?`<div class="match">答えました！</div><p class="hint" id="tcnt">みんなを待っています</p><div id="skipq"></div>`:`
    <p class="label">あなたはどっち？</p>
    ${star?`<button class="star" id="star" aria-pressed="${!!starOn}">★ ここはゆずれない</button>`:''}
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
function localAsk(){
  const p=L.players[L.p],k=L.qs[L.i],n=L.qs.length,multi=L.players.length>1;
  const a=p.ans[L.i]||(p.ans[L.i]={o:-1,st:0,ms:0});
  view(askHTML(k,L.i,n,{who:multi?p.name+'さん':'',step:'own',star:n===30,starOn:a.st}));
  const t0=Date.now();
  bindAsk((v,starOn)=>{
    if(v===null){a.st=starOn?1:0;return}
    a.o=v;a.ms=Date.now()-t0;
    L.i++;
    if(L.i<n){localAsk();return}
    L.i=0;L.p++;
    if(L.mode==='pair'){showResult({players:[L.partner,L.players[0]],qs:L.qs,me:'me',anon:false,local:true,pair:true});return}
    showResult({players:L.players,qs:L.qs,me:L.mode==='solo'?'me':null,anon:false,local:true});
  });
}

/* ===== 結果 ===== */
// 2人の合い方：同じ＝ぴったり／片方が「こだわらない」＝合わせられる／AとBで分かれた＝ちがい
function pairStat(A,B,qs,only){
  // 問題の重さ（大事＝2・軽い＝0.5）に、★ゆずれない（どちらかがつけた問題）はさらに2倍で数える。★の問題は別にも数えて、結果ではっきり見せる
  let s=0,n=0;const r={same:[],adj:[],diff:[],starSame:[],starAdj:[],starDiff:[]};
  qs.forEach((k,i)=>{if(only&&!only.has(i))return;const a=A.ans[i],b=B.ans[i];if(!a||!b||a.o<0||b.o<0)return;
    const st=(a.st&&a.o<2)||(b.st&&b.o<2),w=WT(k)*(st?2:1);n+=w;
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
function talkHTML(G,nm){
  const ps=G.players,its=talkItems(G),two=ps.length===2;
  if(!its.length)return `<section class="card"><p class="label">${two?'2人で':'みんなで'}話しておきたいこと</p><p class="hint">答えが反対になった問題はありませんでした。</p></section>`;
  const row=i=>{const k=G.qs[i];
    const ws=[0,1,2].map(v=>{const who=ps.filter(p=>p.ans[i]&&p.ans[i].o===v);if(!who.length)return '';
      return `<span class="who"><em>${G.anon?who.length+'人':who.map(p=>esc(p.name)).join('・')}</em>${esc(ans(v,k))}${who.some(p=>p.ans[i].st&&v<2)?' ★':''}</span>`}).join('');
    return `<li><b>${esc(Q[k][1])}</b>${ws}</li>`};
  return `<section class="card"><p class="label">${two?'2人で':'みんなで'}話しておきたいこと</p>
    <p class="hint">答えが反対になった問題です（大事な問題・★から順に）。ちがいは悪いことではありません。「どうしてそう思う？」と聞いてみると、相手のことがもっとわかります。</p>
    <ul class="slist tk">${its.map(row).join('')}</ul></section>`}
// ひとこと診断：テーマ別・価値観のタイプ・★ゆずれないから、数行の文を作る
function hitokoto(G,rows){
  const ps=G.players,two=ps.length===2,who=two?'2人':'みんな',all=two?'2人とも':'全員',out=[];
  const srt=rows.slice().sort((a,b)=>b.pct-a.pct),best=srt.filter(r=>r.pct>=70).slice(0,2),low=srt.filter(r=>r.pct<50&&!best.includes(r)).slice(-1);
  if(best.length){const b=best.map(r=>'「'+r.name+'」').join('と');out.push(two?`${b}の感覚が近い2人です。`:`みんな、${b}の感覚が近いようです。`)}
  else if(srt.length)out.push(`いちばん重なったのは「${srt[0].name}」（${srt[0].pct}%）。`);
  const ax=axRows(G,ps).filter(x=>x.xs.length===ps.length);
  const same=ax.filter(x=>x.xs.every(y=>y.s.pct>=60)).map(x=>x.a.l).concat(ax.filter(x=>x.xs.every(y=>y.s.pct<=40)).map(x=>x.a.r));
  if(same.length)out.push(`${all}「${same.slice(0,2).join('」「')}」の傾向です。`);
  if(two){const opp=ax.filter(x=>{const v=x.xs.map(y=>y.s.pct);return Math.max(...v)>=60&&Math.min(...v)<=40});
    if(opp.length)out.push(`「${opp[0].a.name}」はタイプがちがうので、おたがいのやり方を知っておくと安心です。`)}
  if(low.length)out.push(`「${low[0].name}」は考え方がちがうところ。話してみると、新しい発見がありそうです。`);
  if(two){const r=pairStat(ps[0],ps[1],G.qs);if(r.starDiff.length)out.push(`★ゆずれないところで、ちがいが${r.starDiff.length}問。先にゆっくり話しておくと安心です。`)}
  if(!out.length)out.push('答えの重なりを、下でくわしく見てみましょう。');
  return out}
function showResult(G){
  const ps=G.players,me=ps.find(p=>p.id===G.me),multi=ps.length>1,sec=ms=>(ms/1000).toFixed(1);
  const nm=p=>esc(p.name)+(p===me?'（あなた）':'');
  let h='';
  if(!multi){h=soloHTML(G)+VS_SLOT;view(h+tailHTML(G));bindTail(G);votesRun(G);return}
  // ① シンクロ率（答えの重なり。全員で1つの数字）
  const gh=syncStat(G),pct=gh.pct;
  const msg=pct>=80?'ほとんど以心伝心！':pct>=50?'いい感じにわかり合えています':'まだ知らない顔がたくさん。だから楽しい';
  h+=`<section class="card score"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    <p class="cap">${ps.length===2?'2人':ps.length+'人'}のシンクロ率</p>
    <div class="ring" style="background:conic-gradient(var(--a) 0 ${pct}%,var(--line) ${pct}% 100%)"><div class="in"><span class="num">${pct}<small>%</small></span></div></div>
    <p class="msg">${msg}</p><p class="hint">${ps.length===2?'2人の':'みんなの'}答えが、どれだけ重なったか（大事な問題と★ゆずれないは重く数えています）</p></section>`;
  const trows=themeRows(G);
  h+=`<section class="card hk"><p class="label">相性のひとこと診断</p>${hitokoto(G,trows).map(t=>`<p>${esc(t)}</p>`).join('')}</section>`;
  if(trows.length)h+=themeHTML(trows,ps.length===2?'2人':'みんな');
  h+=axHTML(G,(G.anon&&me)?[me]:ps,nm);
  h+=talkHTML(G,nm);
  // ③ 合う人
  const pairs=[];for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)pairs.push({a:ps[i],b:ps[j],r:pairStat(ps[i],ps[j],G.qs)});
  pairs.sort((x,y)=>y.r.pct-x.r.pct);
  const mine=me?pairs.filter(x=>x.a===me||x.b===me):pairs;
  const pairCard=x=>{const o=me?(x.a===me?x.b:x.a):null,r=x.r;
    return `<li class="pair"><div class="ph"><b>${me?nm(o):nm(x.a)+' × '+nm(x.b)}</b><em>${r.pct}%</em></div>
      <div class="bar"><i style="width:${r.pct}%"></i></div>
      <p class="hint">ぴったり ${r.same.length}問・合わせられる ${r.adj.length}問・ちがい ${r.diff.length}問</p>
      ${r.starN?starBox(x.a,x.b,r):''}</li>`};
  // ★ゆずれないところ：同じ・合わせられる・ちがうの数と、1問ずつの2人の答え。ちがいが多いときは、はっきり伝える
  const starBox=(A,B,r)=>{const row=(i,cls)=>{const k=G.qs[i],aa=A.ans[i],bb=B.ans[i];
      const who=(P,x)=>(G.anon&&me&&P!==me)?'':`<span class="who"><em>${esc(P.name)}</em>${esc(ans(x.o,k))}${x.st?' ★':''}</span>`;
      return `<li class="${cls}"><b>${esc(Q[k][1])}</b>${who(A,aa)}${who(B,bb)}</li>`};
    const many=r.starDiff.length>=2&&r.starDiff.length>=r.starSame.length+r.starAdj.length;
    const verdict=!r.starDiff.length?`<p class="good">大事なところは、ちがいがありません</p>`
      :many?`<p class="warn">大事なところで、考え方がちがうことが多めです。この${r.starDiff.length}問は、先にゆっくり話しておくと安心です</p>`
      :`<p class="warn">大事なところで、ちがいが${r.starDiff.length}問あります。ここは先に話しておくと安心です</p>`;
    return `<div class="starbox"><p class="sh">★ ゆずれないところ　${r.starN}問</p>
      <div class="sc"><span class="s0">同じ <b>${r.starSame.length}</b></span><span class="s2">合わせられる <b>${r.starAdj.length}</b></span><span class="s1">ちがう <b>${r.starDiff.length}</b></span></div>
      ${verdict}
      ${r.starDiff.length+r.starAdj.length?`<ul class="slist">${r.starDiff.map(i=>row(i,'d')).join('')}${r.starAdj.map(i=>row(i,'m')).join('')}</ul>`:''}
      ${r.starSame.length?`<details class="sfold"><summary>同じだったところ（${r.starSame.length}問）を見る</summary><ul class="slist">${r.starSame.map(i=>row(i,'s')).join('')}</ul></details>`:''}</div>`};
  h+=`<section class="card"><p class="label">${ps.length===2?'2人のぴったり度':me?'あなたと合う人':'合うペア'}</p>
    <ul class="pairs">${(me?mine:pairs).slice(0,me?MAXP:3).map(pairCard).join('')}</ul>
    <p class="hint">同じ答え＝ぴったり、片方がまん中の答え（こだわらない・どっちも好き など）＝合わせられる、として数えています。お金・将来・暮らしなど大事な問題は2倍、味の好みなど軽い問題は半分、★ゆずれないをつけた問題はさらに2倍の重さで数えています。</p></section>`;
  // ④ 問題のランキング
  const qst=G.qs.map((k,i)=>{const c=[0,0,0],to=[];let ms=0,m=0;ps.forEach(p=>{const a=p.ans[i];if(!a)return;if(a.o>=0)c[a.o]++;if(a.to)to.push(p);if(a.o>=0||a.to){ms+=a.ms;m++}});return{i,k,c,to,avg:m?ms/m:0}});
  const split=qst.filter(x=>x.c[0]&&x.c[1]).sort((a,b)=>Math.abs(a.c[0]-a.c[1])-Math.abs(b.c[0]-b.c[1])).slice(0,3);
  const uni=qst.filter(x=>{const t=x.c[0]+x.c[1]+x.c[2];return t>=2&&(x.c[0]===t||x.c[1]===t)});
  const hard=qst.slice().sort((a,b)=>b.avg-a.avg)[0];
  h+=`<section class="card"><p class="label">問題のランキング</p>
    ${split.length?`<p class="sub">意見がまっぷたつ</p><ul class="list">${split.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${[0,1].map(v=>`<span class="ansrow"><i class="o${v}">${esc(Q[x.k][v+2])}</i>${x.c[v]}人</span>`).join('')}</li>`).join('')}</ul>`:''}
    ${uni.length?`<p class="sub">全員一致</p><ul class="list">${uni.slice(0,3).map(x=>`<li><b>${esc(Q[x.k][1])}</b><span class="ansrow"><i class="o${x.c[0]?0:1}">${esc(x.c[0]?Q[x.k][2]:Q[x.k][3])}</i>全員</span></li>`).join('')}</ul>`:''}
    <p class="sub">いちばん悩んだ問題</p>
    <div class="ponder"><b>${esc(Q[hard.k][1])}</b><span>平均 <em>${sec(hard.avg)}</em> 秒</span></div>
  </section>`;
  // ⑤ ゆずれないこと
  const starP=(G.anon&&me?[me]:ps).map(p=>({p,xs:G.qs.map((k,i)=>({k,a:p.ans[i]})).filter(x=>x.a&&x.a.st&&x.a.o>=0&&x.a.o<2)})).filter(x=>x.xs.length);
  if(starP.length)h+=`<section class="card"><p class="label">★ ゆずれないこと</p>${starP.map(x=>`<div class="tori"><p class="sub">${nm(x.p)}</p><ul>${x.xs.map(y=>`<li>${esc(Q[y.k][1])} ${esc(ans(y.a.o,y.k))}</li>`).join('')}</ul></div>`).join('')}</section>`;
  // ⑥ みんなの答え（1問ずつ）
  h+=`<section class="card"><details><summary class="label">みんなの答えを1問ずつ見る</summary><ul class="list all">${qst.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${[0,1,2].map(v=>{const who=ps.filter(p=>p.ans[x.i]&&p.ans[x.i].o===v);return who.length?`<span class="ansrow"><i class="o${v}">${esc(ans(v,x.k))}</i>${G.anon?who.length+'人':who.map(nm).join('、')}</span>`:''}).join('')}</li>`).join('')}</ul></details></section>`;
  view(h+VS_SLOT+tailHTML(G));bindTail(G);votesRun(G);
}
function soloHTML(G){
  const p=G.players[0],xs=G.qs.map((k,i)=>({k,i,a:p.ans[i]})).filter(x=>x.a&&x.a.o>=0),sec=ms=>(ms/1000).toFixed(1);
  const firm=xs.filter(x=>x.a.o<2),flex=xs.filter(x=>x.a.o===2),star=firm.filter(x=>x.a.st);
  const byT=xs.slice().sort((a,b)=>b.a.ms-a.a.ms);
  const pct=xs.length?Math.round(flex.length/xs.length*100):0;
  const msg=pct>=50?'まわりに合わせられる、やわらかい人':pct>=25?'こだわりとやわらかさのバランス型':'自分の好みがはっきりしている人';
  return `<section class="card score"><img class="chara c-solo" src="img/ai.webp" width="120" height="106" alt="" aria-hidden="true">
    <p class="cap">${p.name==='あなた'?'あなた':esc(p.name)+'さん'}の「合わせられる度」</p>
    <div class="ring" style="background:conic-gradient(var(--a) 0 ${pct}%,var(--line) ${pct}% 100%)"><div class="in"><span class="num">${pct}<small>%</small></span></div></div>
    <p class="msg">${msg}</p><p class="hint">${xs.length}問のうち、まん中の答え（こだわらない など）が${flex.length}問</p></section>
  ${axHTML(G,[p],()=>p.name==='あなた'?'あなた':esc(p.name))}
  ${star.length?`<section class="card"><p class="label">★ ゆずれないこと</p><ul class="list">${star.map(x=>`<li><b>${esc(Q[x.k][1])}</b>${esc(ans(x.a.o,x.k))}</li>`).join('')}</ul></section>`:''}
  <section class="card"><p class="label">あなたのこだわり</p><ul class="list">${firm.filter(x=>!x.a.st).map(x=>`<li><b>${esc(CATS[Q[x.k][0]][0])}｜${esc(Q[x.k][1])}</b><span class="ansrow"><i class="o${x.a.o}">${esc(ans(x.a.o,x.k))}</i></span></li>`).join('')||'<li>今回はぜんぶ「こだわらない」でした</li>'}</ul></section>
  ${flex.length?`<section class="card"><p class="label">合わせられること</p><p class="hint">${flex.map(x=>esc(Q[x.k][1])).join('　')}</p></section>`:''}
  ${byT.length>1?`<section class="card"><p class="label">いちばん悩んだ問題</p><div class="ponder"><b>${esc(Q[byT[0].k][1])}</b><span>「${esc(ans(byT[0].a.o,byT[0].k))}」まで <em>${sec(byT[0].a.ms)}</em> 秒</span></div>
    <p class="hint">いちばん即決は「${esc(Q[byT[byT.length-1].k][1])}」（${sec(byT[byT.length-1].a.ms)} 秒）</p></section>`:''}
  ${inviteCard(G,p)}`;
}
// 1.66 奇跡の相性診断（鑑定者本人のメインサービス）へのバナー。無料の診断から会員登録（毎朝の開運予報メール）へつながる
const PROMO=`<a class="promo" href="https://166unmei.com" target="_blank" rel="noopener" aria-label="1.66 奇跡の相性診断で占う（別のサイト 166unmei.com が開きます）">
    <span class="pr-top">価値観の次は、生まれた日でわかる「運命の相性」</span>
    <span class="pr-pair" aria-hidden="true"><img src="img/166-cow.webp" alt="" width="68" height="72" loading="lazy"><i>×</i><img src="img/166-mouse.webp" alt="" width="66" height="72" loading="lazy"></span>
    <span class="pr-m"><span class="pr-k">奇跡の相性診断</span><span class="pr-n">1.66<small>%</small></span><span class="pr-d">あの人は、<em>奇跡の1.66%</em>に入っている？</span></span>
    <span class="pr-pts"><span>2人の生年月日だけ・1分</span><span>料金はかかりません</span><span>毎朝6時の開運予報メールも</span></span>
    <span class="pr-btn">二人の相性を占う <small>↗</small></span></a><p class="promo-u">166unmei.com（別のサイト）</p>`;
function tailHTML(G){const pr=G&&G.pair?pairBackCard(G):'';return `${pr}
  <button class="btn img small" id="img">結果を画像で保存</button><p class="hint" id="imgmsg" hidden></p>
  ${PROMO}
  <a class="btn line small" id="lnres" href="#" target="_blank" rel="noopener">LINEで結果を送る</a>
  <button class="btn ghost small" id="share">ほかのアプリでシェアする</button><p class="hint" id="shared" hidden></p>
  <div class="row"><button class="btn" id="again">もう1回あそぶ</button><button class="btn ghost" id="home">トップへ</button></div>`}
// シェア：スマホの共有（使えないときはコピー）。名前は入れない
function shareText(G){
  const ps=G.players,url=WHERE==='claude'?ART_URL:location.href.split('#')[0].split('?')[0];
  if(ps.length<2){const p=ps[0],xs=G.qs.map((k,i)=>p.ans[i]).filter(a=>a&&a.o>=0),f=xs.filter(a=>a.o===2).length;
    return{t:`わたしの「合わせられる度」は ${xs.length?Math.round(f/xs.length*100):0}% でした。あなたは？\n#アイシンク`,url}}
  return{t:`${ps.length===2?'2人':ps.length+'人'}のシンクロ率は ${syncStat(G).pct}% でした！\n2択に答えて答え合わせ。みんなでも遊べます\n#アイシンク`,url}}
function doShare(G){const {t,url}=shareText(G),d=$('shared');
  if(navigator.share){navigator.share({title:'アイ・シンク（I-Sync）',text:t,url}).catch(()=>{});return}
  const full=t+'\n'+url;d.hidden=false;
  try{navigator.clipboard.writeText(full).then(()=>{d.textContent='シェアの文をコピーしました。SNSやメッセージに貼ってください。'},()=>{d.textContent=full})}catch(e){d.textContent=full}}
function bindTail(G){
  $('share').onclick=()=>doShare(G);
  const lr=$('lnres');if(lr){const {t,url}=shareText(G);lr.href=lineUrl(t,url)}
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
   答えはリンクの中だけ（どこにも保存しない）。問題は目印（QKEY の先頭5文字）で入れる */
const ansCode=a=>!a||a.o<0?'-':String(a.o+(a.st&&a.o<2?3:0));
const ansDecode=c=>c==='-'?{o:-1,st:0,ms:0}:{o:(+c)%3,st:+c>=3?1:0,ms:0};
const linkOf=(kind,parts)=>siteUrl()+'#'+kind+'='+parts.map(x=>encodeURIComponent(x)).join('~');
const keysOf=qs=>qs.map(k=>QKEY[k].slice(0,5)).join('.');
const codesOf=(qs,ans)=>qs.map((k,i)=>ansCode(ans[i])).join('');
function withLink(name,qs,ans){return linkOf('with',['1',name,keysOf(qs),codesOf(qs,ans)])}
function pairLink(A,B,qs){return linkOf('pair',['1',A.name,B.name,keysOf(qs),codesOf(qs,A.ans),codesOf(qs,B.ans)])}
function parseLink(){
  const m=/^#(with|pair)=(.+)$/.exec(location.hash||'');if(!m)return null;
  const p=m[2].split('~').map(x=>{try{return decodeURIComponent(x)}catch(e){return ''}});if(p[0]!=='1')return{bad:1};
  const qi=k=>KEY5.has(k)?KEY5.get(k):-1,nm=(x,d)=>(x||'').trim().slice(0,10)||d;
  const ok=(qs,...c)=>qs.length>0&&qs.length<=30&&qs.every(i=>i>=0)&&c.every(x=>x.length===qs.length&&/^[0-5-]+$/.test(x));
  if(m[1]==='with'){const qs=(p[2]||'').split('.').map(qi);if(!ok(qs,p[3]||''))return{bad:1};
    return{kind:'with',name:nm(p[1],'ともだち'),qs,ans:[...p[3]].map(ansDecode)}}
  const qs=(p[3]||'').split('.').map(qi);if(!ok(qs,p[4]||'',p[5]||''))return{bad:1};
  return{kind:'pair',qs,A:{id:'a',name:nm(p[1],'ひとり目'),ans:[...p[4]].map(ansDecode)},B:{id:'b',name:nm(p[2],'ふたり目'),ans:[...p[5]].map(ansDecode)}}}
const minsOf=n=>Math.max(2,Math.round(n/3));
function inviteText(name,n){return `${name}さんから、アイ・シンクの答え合わせのお誘いです！\n同じ${n}問に答えると、2人の価値観がどれだけ重なるかがわかります（約${minsOf(n)}分・無料）。`}
// ひとりの結果の下：この問題で、だれかと答え合わせ
function inviteCard(G,p){const n=G.qs.length,nm=['あなた','ともだち'].includes(p.name)?(store('kv_name')||''):p.name;
  return `<section class="card invite"><p class="label">この${n}問で、だれかと答え合わせ</p>
    <p class="hint">リンクを送ると、相手が同じ${n}問に答えるだけで、2人の答えがどれだけ重なるかがわかります。同じ時間に開いていなくても大丈夫です。</p>
    <label class="one-name" for="inv-name"><span>あなたのニックネーム（相手に出ます）</span><input type="text" id="inv-name" maxlength="10" placeholder="本名でなくてOK" value="${esc(nm)}"></label>
    <a class="btn line" id="inv-line" href="#" target="_blank" rel="noopener">LINEで答え合わせに誘う</a>
    <button class="btn ghost small" id="inv-share">ほかのアプリで送る</button><p class="hint" id="inv-msg" hidden></p>
    <p class="hint">あなたの答えはリンクの中に入っていて、相手が答え終わるまで見えません。どこにも保存されません。</p>
    <button class="btn ghost small" id="tog">みんなで遊ぶ（部屋を作る）</button></section>`}
// 答え合わせのリンクから答えた人の結果の下：送ってくれた人に結果を返す／同じ問題のまま、ほかの人も誘う
function pairBackCard(G){const A=G.players[0],me=G.players[1],n=G.qs.length;
  return `<section class="card invite"><p class="label">${esc(A.name)}さんにも結果を送る</p>
    <p class="hint">送ったリンクを開くと、${esc(A.name)}さんにもこの結果が出ます。</p>
    <a class="btn line" id="back-line" href="#" target="_blank" rel="noopener">LINEで${esc(A.name)}さんに送る</a>
    <button class="btn ghost small" id="back-share">ほかのアプリで送る</button><p class="hint" id="back-msg" hidden></p></section>
  <section class="card invite"><p class="label">この${n}問で、ほかの人とも答え合わせ</p>
    <p class="hint">あなたの答えを入れたリンクを、ほかの友だちにも送れます。</p>
    <a class="btn line" id="inv-line" href="#" target="_blank" rel="noopener">LINEで答え合わせに誘う</a>
    <button class="btn ghost small" id="inv-share">ほかのアプリで送る</button><p class="hint" id="inv-msg" hidden></p></section>`}
function sendVia(text,url,msgEl){
  if(navigator.share){navigator.share({title:'アイ・シンク（I-Sync）',text,url}).catch(()=>{});return}
  const full=text+'\n'+url;msgEl.hidden=false;
  try{navigator.clipboard.writeText(full).then(()=>{msgEl.textContent='文とリンクをコピーしました。LINEなどに貼って送ってください。'},()=>{msgEl.textContent=full})}catch(e){msgEl.textContent=full}}
function bindInvite(G){
  const me=G.players.find(p=>p.id===G.me)||G.players[0],n=G.qs.length;
  const myName=()=>{const i=$('inv-name');const v=i?i.value.trim():'';if(v){store('kv_name',v);return v}return ['あなた','ともだち'].includes(me.name)?(store('kv_name')||'ともだち'):me.name};
  const inv=()=>({t:inviteText(myName(),n),u:withLink(myName(),G.qs,me.ans)});
  const il=$('inv-line');if(il){const set=()=>{const x=inv();il.href=lineUrl(x.t,x.u)};set();il.addEventListener('click',set);const nmI=$('inv-name');if(nmI)nmI.addEventListener('input',set)}
  const is=$('inv-share');if(is)is.onclick=()=>{const x=inv();sendVia(x.t,x.u,$('inv-msg'))};
  if(G.pair){const A=G.players[0],pct=pairStat(A,me,G.qs).pct,t=`${me.name}さんが答え終わりました！\n2人のシンクロ率は ${pct}% でした。くわしい結果はこちら`,u=pairLink(A,me,G.qs);
    const bl=$('back-line');if(bl)bl.href=lineUrl(t,u);const bs=$('back-share');if(bs)bs.onclick=()=>sendVia(t,u,$('back-msg'))}}
// 答え合わせのリンクを開いた人：説明 → ニックネーム → 同じ問題に答える
function withStart(x){
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  const n=x.qs.length;
  view(`<section class="card hand"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    <p class="big">${esc(x.name)}さんから、答え合わせのお誘いです</p>
    <p class="hint">${esc(x.name)}さんが答えた${n}問に、あなたも答えてください（約${minsOf(n)}分）。答え終わると、2人の答えがどれだけ重なるかがわかります。</p>
    <p class="hint">${esc(x.name)}さんの答えは、あなたが答え終わるまで見えません。</p>
    <label class="one-name" for="wn" style="align-self:stretch;text-align:left"><span>ニックネーム</span><input type="text" id="wn" maxlength="10" placeholder="本名でなくてOK" value="${esc(store('kv_name')||'')}"></label>
    <button class="btn" id="wgo" style="align-self:stretch">答えはじめる</button>
    <button class="btn ghost small" id="wtop">アイ・シンクのトップを見る</button></section>`);
  $('wgo').onclick=()=>{const v=$('wn').value.trim();if(v)store('kv_name',v);
    Object.assign(L,{mode:'pair',qs:x.qs,players:[{id:'me',name:v||'ともだち',ans:{}}],partner:{id:'p',name:x.name,ans:x.ans},p:0,i:0});localAsk()};
  $('wtop').onclick=goTop}
// 結果のリンク（送り返された結果）を開いた人
function pairView(x){
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
  L.players=[];showResult({players:[x.A,x.B],qs:x.qs,me:null,anon:false,local:true,view:true})}

/* ===== みんなの答え（これまでに遊んだ人の割合） =====
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
  const msg=avg>=55?'みんなと感覚が近いタイプ':avg<=38?'少数派の答えが多い、個性派':'ほどよくバランスのとれたタイプ';
  const minor=rows.slice().sort((a,b)=>a.share-b.share).slice(0,3).filter(r=>r.share<0.5);
  const pc=x=>Math.round(x*100);
  const bar=r=>{const p=r.cnt.map(c=>pc(c/r.tot));return `<div class="vbar" aria-hidden="true">${p.map((v,j)=>v?`<i class="v${j}" style="width:${v}%"></i>`:'').join('')}</div>
    <p class="vleg">${[0,1,2].map(j=>`<span class="v${j}">${esc(ans(j,r.k))} ${p[j]}%</span>`).join('')}</p>`};
  el.innerHTML=`<p class="label">これまでに遊んだ人とくらべると</p>
    <p class="vtop">${G.players.length>1?'あなたの':''}多数派度 <b>${avg}%</b></p><p class="msg">${msg}</p>
    ${minor.length?`<p class="sub">少数派だった答え</p><ul class="list">${minor.map(r=>`<li><b>${esc(Q[r.k][1])}</b><span class="ansrow"><i class="o${r.o}">${esc(ans(r.o,r.k))}</i>同じ答えの人 ${pc(r.share)}%</span></li>`).join('')}</ul>`:''}
    <details><summary class="label">1問ずつ、みんなの答えを見る</summary><ul class="list vlist">${rows.map(r=>`<li><b>${esc(Q[r.k][1])}</b>${bar(r)}<small>${r.tot}人が答えました</small></li>`).join('')}</ul></details>
    <p class="hint">これまでにアイ・シンクで答えた人の割合です（答えの数だけを数えていて、名前などは送っていません）。</p>`;
  el.hidden=false;if(window.__jw)window.__jw(el)}

/* ===== 結果を画像で保存（インスタのストーリーズの縦長 1080×1920） ===== */
async function saveImage(G){
  const msg=$('imgmsg');msg.hidden=false;msg.textContent='画像を作っています…';
  try{
    try{await Promise.all(['900 60px "Zen Maru Gothic"','700 60px Quicksand','500 30px "Zen Kaku Gothic New"'].map(f=>document.fonts.load(f)))}catch(e){}
    const cv=document.createElement('canvas');cv.width=1080;cv.height=1920;const c=cv.getContext('2d');drawResult(c,G);
    const blob=await new Promise(r=>cv.toBlob(r,'image/png'));
    const file=new File([blob],'i-sync.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){msg.hidden=true;await navigator.share({files:[file],title:'アイ・シンク（I-Sync）'}).catch(()=>{});return}
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
  let pct,cap,who,msgT;
  if(solo){const p=ps[0],xs=G.qs.map((k,i)=>p.ans[i]).filter(a=>a&&a.o>=0),f=xs.filter(a=>a.o===2).length;pct=xs.length?Math.round(f/xs.length*100):0;
    cap='わたしの「合わせられる度」';who='';msgT=pct>=50?'まわりに合わせられる、やわらかい人':pct>=25?'こだわりとやわらかさのバランス型':'自分の好みがはっきりしている人'}
  else{pct=syncStat(G).pct;cap=ps.length===2?'2人のシンクロ率':ps.length+'人のシンクロ率';
    who=G.anon?'':ps.length===2?ps[0].name+' × '+ps[1].name:ps.slice(0,4).map(p=>p.name).join('・')+(ps.length>4?' ほか':'');
    msgT=pct>=80?'ほとんど以心伝心！':pct>=50?'いい感じにわかり合えています':'まだ知らない顔がたくさん。だから楽しい'}
  T(cap,W/2,590,F(900,46,'m'),ink);
  if(who)T(fit(who,820,F(700,40,'m')),W/2,650,F(700,40,'m'),sub);
  T(pct+'%',W/2,880,F(700,230,'q'),ink);
  T(fit(msgT,840,F(900,44,'m')),W/2,1000,F(900,44,'m'),'#4B3C8F');
  // 下のカード：テーマ別（2人以上）／価値観のタイプ（ひとり）
  rr(80,1150,920,560,48,'#FFFFFF');
  if(solo){T('わたしの価値観のタイプ',W/2,1240,F(900,42,'m'),ink);
    const rows=axRows(G,[ps[0]]).slice(0,4);rows.forEach(({a,xs},j)=>{const y=1310+j*100,pc=xs[0].s.pct;
      T(a.l,140,y,F(700,30,'k'),ink,'left');T(a.r,940,y,F(700,30,'k'),ink,'right');
      rr(140,y+20,800,18,9,'#E2DDF5');c.beginPath();c.arc(140+800*(100-pc)/100,y+29,22,0,7);c.fillStyle='#4B3C8F';c.fill();c.lineWidth=6;c.strokeStyle='#fff';c.stroke()})}
  else{T('テーマ別のシンクロ率',W/2,1240,F(900,42,'m'),ink);
    themeRows(G).slice(0,6).forEach((r,j)=>{const y=1310+j*66;T(r.name,140,y,F(700,32,'k'),ink,'left');T(r.pct+'%',940,y,F(700,34,'q'),ink,'right');
      rr(420,y-22,400,22,11,'#E2DDF5');if(r.pct)rr(420,y-22,Math.max(22,400*r.pct/100),22,11,'#9A86C4')})}
  T('#アイシンク　2択で答え合わせ',W/2,1800,F(900,40,'m'),ink);
  T(siteUrl().replace(/^https?:\/\//,'').replace(/\/$/,''),W/2,1860,F(700,32,'q'),sub);
}

/* ===== みんなのスマホで（部屋・10人まで） ===== */
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
    async vote(key,f){return fs.doc(P('votes/'+key)).set({[f]:firebase.firestore.FieldValue.increment(1)},{merge:true})},
    votes(keys){return Promise.all(keys.map(k=>fs.doc(P('votes/'+k)).get().then(s=>[k,s.exists?s.data():null]))).then(Object.fromEntries)},
    collection(path){const c=fs.collection(P(path));return{
      get:()=>c.get().then(q=>({docs:q.docs.map(sd)})),
      onSnapshot:(cb,err)=>c.onSnapshot(q=>cb({docs:q.docs.map(sd)}),err)}}}}
  function init(){
    if(ready)return ready;
    ready=(async()=>{const cfg=window.ISYNC_FB;if(!cfg||!cfg.projectId)return null;
      try{if(!window.firebase||!firebase.firestore){await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');await load('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js')}
        const app=(firebase.apps||[]).find(a=>a.name==='isync')||firebase.initializeApp(cfg,'isync');const fs=app.firestore();
        try{fs.settings({experimentalAutoDetectLongPolling:true,merge:true})}catch(e){}   // LINE・アプリの中の画面など、ふつうのつなぎ方が止められる所でもつながるように
        return wrap(fs)}catch(e){return null}})();
    return ready}
  return{init};
})();
const NO_DB='この画面では、みんなで遊ぶ部屋が使えません。Safari・Chromeで開きなおすか、「ひとりで」で遊んでください。';
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
    await db.doc(pPath(code,PID)).set({name,ans:{},round:1,joined:Date.now(),ready:true});
    enterRoom(code);return 'ok';
  }catch(e){return '部屋を作れませんでした。この画面では書きこみが許可されていないかもしれません。'}
}
async function createKonRoom(){
  const db=await getDb();if(!db)return NO_DB;
  try{
    let code='';
    for(let t=0;t<8;t++){const c=String(1000+Math.floor(Math.random()*9000));const s=await db.doc('rooms/'+c).get();if(!s.exists||!alive(s.data())){code=c;break}}
    if(!code)return '部屋を作れませんでした。もう一度押してください。';
    const old=await db.collection('rooms/'+code+'/players').get();
    for(const d of old.docs)await db.doc(pPath(code,d.id)).delete();
    // 主催者は答えない（部屋の画面＝QR・人数・スタートだけ）
    await db.doc('rooms/'+code).set({created:Date.now(),round:1,phase:'lobby',qi:0,qs:dealKon(KON_LEN),len:KON_LEN,topic:'kon',anon:true,kind:'kon',host:PID});
    enterRoom(code);return 'ok';
  }catch(e){return '部屋を作れませんでした。この画面では書きこみが許可されていないかもしれません。'}
}
async function joinKon(code,f){
  const db=await getDb();if(!db)return NO_DB;
  try{
    const rs=await db.doc('rooms/'+code).get();
    if(!rs.exists||!alive(rs.data()))return 'その番号の部屋が見つかりません。番号を確かめてください。';
    const room=rs.data(),ps=await db.collection('rooms/'+code+'/players').get();
    if(!ps.docs.some(d=>d.id===PID)){
      if(ps.docs.length>=KON_MAX)return 'この部屋は、もう'+KON_MAX+'人そろっています。';
      if(ps.docs.some(d=>String((d.data()||{}).no)===String(f.no)))return 'その番号は、もう使われています。番号札を確かめてください。';
      await db.doc(pPath(code,PID)).set({name:'',no:String(f.no),sex:f.sex,want:f.want,ans:{},round:room.round||1,joined:Date.now(),ready:true});
    }
    enterRoom(code);return 'ok';
  }catch(e){return '参加できませんでした。この画面では書きこみが許可されていないかもしれません。'}
}
async function joinRoom(code,name){
  const db=await getDb();if(!db)return NO_DB;
  try{
    const rs=await db.doc('rooms/'+code).get();
    if(!rs.exists||!alive(rs.data()))return 'その番号の部屋が見つかりません。番号を確かめてください。';
    const room=rs.data(),ps=await db.collection('rooms/'+code+'/players').get();
    if(room.host===PID){enterRoom(code);return 'ok'}   // 婚活の部屋を作った主催者
    if(room.kind==='kon'&&!ps.docs.some(d=>d.id===PID)){joinFromLink(code);return 'ok'}
    if(!ps.docs.some(d=>d.id===PID)){
      if(!name)return 'ニックネームを入れてください';
      if(ps.docs.length>=MAXP)return 'この部屋は、もう'+MAXP+'人そろっています。';
      await db.doc(pPath(code,PID)).set({name,ans:{},round:room.round||1,joined:Date.now(),ready:true});
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
const rAns=(p,k)=>{const x=p&&p.ans&&p.ans[k];return x?{o:x.o,st:x.st||0,ms:x.ms||0,to:!!x.to,d:!!x.d}:null};
async function sync(){
  const room=R.room,me=R.players[PID];
  if(!R.code||room===undefined)return;
  if(!room||!alive(room)){leaveRoom();goTop();return}
  if(room.kind==='kon'&&room.host===PID){hostSync();return}
  if(!me)return;
  const db=await getDb(),rd=room.round||1,ps=plist(),n=(room.qs||[]).length;
  if((me.round||1)<rd){db.doc(pPath(R.code,PID)).update({ans:{},round:rd});return}
  if(room.phase==='lobby'){
    const key='lobby'+ps.map(p=>p.id+':'+p.name).join('|');
    if(key!==R.key){
      // 新しく入ってきた人を知らせる（最初に開いたときは知らせない）
      if(R.key.startsWith('lobby')){const before=R.seenIds||[];ps.filter(p=>p.id!==PID&&!before.includes(p.id)).forEach(p=>{toast((room.kind==='kon'?p.no+'番':p.name)+'さんが入りました');try{navigator.vibrate&&navigator.vibrate(120)}catch(e){}})}
      R.seenIds=ps.map(p=>p.id);R.key=key;room.kind==='kon'?konWait():lobby()}
    return}
  if(room.phase==='play'){
    const k=room.qi||0,done=ps.filter(p=>{const a=rAns(p,k);return a&&a.d&&(p.round||1)===rd});
    if(done.length>=ps.length&&ps.length>0){advance(k,rd);return}
    const qk='q'+rd+'-'+k;
    if(R.key!==qk){const fresh=k===0&&!/^q/.test(R.key);R.key=qk;R.my={o:-1,st:0,ms:0,fin:false};
      if(fresh){markSeen(room.qs);countdown(qk,()=>{R.seen[qk]=Date.now();rAsk(k,qk)})}else{R.seen[qk]=Date.now();rAsk(k,qk)}}
    else if(R.seen[qk])rCount(done.length,ps.length);
    return}
  clearInterval(R.tick);
  if(room.phase==='result'&&room.kind==='kon'){
    // 婚活：名前を見せる「OK」が変わったら描き直す（名前を入力中なら待つ）
    const key='kres'+rd+'-'+ps.map(p=>p.id+(p.rname||'')+Object.keys(p.reveal||{}).sort().join(',')).join('|');
    if(key===R.key)return;const ae=document.activeElement;if(ae&&ae.tagName==='INPUT'&&app.contains(ae)){R.konLater=true;return}
    R.key=key;konResult();return}
  if(room.phase==='result'){const key='res'+rd+'-'+ps.map(p=>p.id).join();if(key===R.key)return;R.key=key;
    showResult({players:ps.map(p=>({id:p.id,name:p.name,ans:room.qs.map((q,i)=>rAns(p,i))})),qs:room.qs,me:PID,anon:!!room.anon})}
}
function countdown(qk,go){
  const ps=plist();let n=3;
  const draw=()=>view(`<section class="card hand"><p class="cap">${ps.length}人そろいました</p><p class="cd">${n}</p><p class="hint">${R.room&&R.room.kind==='kon'?'あわてなくて大丈夫です。全員が答えたら、次の問題へ進みます。':'時間の制限はありません。全員が答えたら、次の問題へ。'}</p></section>`);
  draw();clearInterval(R.tick);
  R.tick=setInterval(()=>{if(R.key!==qk){clearInterval(R.tick);return}n--;if(n>0)draw();else{clearInterval(R.tick);go()}},800);
}
function rAsk(k,qk){
  const room=R.room,qid=room.qs[k],n=room.qs.length;
  const draw=()=>{const m=R.my,step=m.fin?'done':'own';
    view(askHTML(qid,k,n,{step,star:room.len===30||room.kind==='kon',starOn:m.st}));
    bindAsk(tap);paint()};
  const tap=(v,starOn)=>{const m=R.my;if(v===null){m.st=starOn?1:0;return}
    if(m.fin)return;
    m.o=v;m.ms=Date.now()-R.seen[qk];m.fin=true;
    save(k,!!m.fin,false);draw()};
  const paint=()=>{};
  clearInterval(R.tick);
  // 答えない人がいて止まったときだけ、答えた人に「答えた人だけで先に進む」を出す（婚活の部屋は主催者の画面が60秒で進める）
  R.tick=setInterval(()=>{if(R.key!==qk){clearInterval(R.tick);return}
    if(room.kind==='kon'||!R.my.fin||Date.now()-R.seen[qk]<WAIT_BTN*1000)return;const el=$('skipq');if(!el||el.firstChild)return;
    el.innerHTML='<p class="hint">まだ答えていない人がいます。画面を閉じてしまったのかも。</p><button class="btn ghost small" id="skipgo">答えた人だけで先に進む</button>';
    $('skipgo').onclick=()=>advance(k,R.room.round||1)},1000);
  draw();
}
async function save(k,fin,to){const db=await getDb(),me=R.players[PID];if(!db||!me)return;
  const m=R.my,a=Object.assign({},me.ans||{});
  a[k]={o:m.o<0?-1:m.o,st:m.st||0,ms:m.ms||0,to:!!to,d:!!fin};
  R.players[PID]=Object.assign({},me,{ans:a});
  try{await db.doc(pPath(R.code,PID)).update({ans:a})}catch(e){}
  if(fin){const ps=plist(),rd=R.room.round||1;   // 自分が最後の1人なら、知らせを待たずにすぐ次へ
    if(ps.every(p=>{const x=rAns(p,k);return x&&x.d&&(p.round||1)===rd}))advance(k,rd)}}
function rCount(d,n){const el=$('tcnt');if(el)el.textContent=`みんなを待っています（${d}／${n}人 答えた）`}
// LINEを開いて、文とリンクが入った状態にする（受け取った人はリンクを押すだけ）
const lineUrl=(t,u)=>'https://line.me/R/share?text='+encodeURIComponent(t+'\n'+u);
const siteUrl=()=>WHERE==='claude'?ART_URL:location.href.split('#')[0].split('?')[0];
function joinUrl(c){return (WHERE==='claude'?ART_URL:location.href.split('#')[0].split('?')[0])+'#join-'+c}
let qrP=null;
function loadQR(){if(window.QRCode)return Promise.resolve();if(!qrP)qrP=new Promise((ok,ng)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';sc.onload=ok;sc.onerror=ng;document.head.appendChild(sc)});return qrP}
function lobby(){
  const c=R.code,url=joinUrl(c),ps=plist(),room=R.room,can=ps.length>=2;
  view(`<img class="chara c-lobby" src="img/pair-smile.webp" width="180" height="100" alt="" aria-hidden="true">
  <section class="card hand">
    <p class="cap">部屋番号</p><p class="code">${esc(c)}</p>
    <div class="qr" id="qr" aria-label="参加用のQRコード"></div>
    <p class="hint">そばにいる人は、スマホのカメラでこのQRコードを読みとるだけで入れます。</p>
    <a class="btn line" id="ln" href="#" target="_blank" rel="noopener" style="align-self:stretch">LINEで友だちを招待する</a>
    <button class="btn ghost small" id="cp" style="align-self:stretch">ほかのアプリで送る</button><p class="hint" id="cpd" hidden></p>
    <p class="hint">送ったリンクを開くだけで、この部屋に入れます。</p>
  </section>
  <section class="card">
    <div class="lobby-head"><p class="label">部屋に入っている人</p><span class="cnt">${ps.length}／${MAXP}人</span></div>
    <ul class="members">${ps.map(p=>`<li class="ok"><span>${esc(p.name)}${p.id===PID?'（あなた）':''}</span><b>入りました</b></li>`).join('')}</ul>
    <p class="status ${can?'go':''}">${can?'みんな入ったら、スタートを押してください（だれが押してもOK）':'もう1人、入るのを待っています'}</p>
    <button class="btn" id="st" ${can?'':'disabled'}>${can?`スタート（${ps.length}人で）`:'スタート'}</button>
    <p class="hint">${room.len===30?'しっかり版（30問・★ゆずれない）':'簡易版（10問）'}・話題は${room.topic==='party'?'盛り上がる':'いろいろ'}${room.anon?'・名前は見せない':''}</p>
  </section>
  <button class="btn ghost small" id="home">部屋を出てトップへ</button>`);
  loadQR().then(()=>{const el=$('qr');if(!el)return;el.innerHTML='';new QRCode(el,{text:url,width:180,height:180,colorDark:'#22253A',colorLight:'#FFFFFF',correctLevel:QRCode.CorrectLevel.M})}).catch(()=>{const el=$('qr');if(el)el.hidden=true});
  $('ln').href=lineUrl('アイ・シンクで一緒に遊ぼう！\nこのリンクを開くだけで、部屋に入れます。',url);
  $('cp').onclick=()=>{const d=$('cpd'),text='アイ・シンクで一緒に遊ぼう！\nこのリンクを開くだけで、部屋に入れます。';
    // スマホの「共有」でLINE・メッセージなどへ（送るのは部屋に直接入れるリンク）。使えないときは文とリンクをコピー
    if(navigator.share){navigator.share({title:'アイ・シンク',text,url}).catch(()=>{});return}
    d.hidden=false;const full=text+'\n'+url;try{navigator.clipboard.writeText(full).then(()=>{d.textContent='招待の文とリンクをコピーしました。LINEなどに貼って送ってください。'},()=>{d.textContent=full})}catch(e){d.textContent=full}};
  $('st').onclick=e=>{if(!can)return;e.target.disabled=true;roomUpdate({phase:'play',qi:0})};
  $('home').onclick=async()=>{const db=await getDb(),code=R.code;leaveRoom();try{await db.doc(pPath(code,PID)).delete()}catch(e){}goTop()};
}
/* 招待のリンク・QRコード（…#join-1234）で開いたとき：トップを出さずに、その部屋へまっすぐ入る。
   前に名前を入れたことがあれば何も押さずに入る。はじめての人は、ニックネームを入れて「参加する」を1回押すだけ（空でも入れる） */
async function joinFromLink(code){
  view('<section class="card hand"><div class="orb" aria-hidden="true"></div><p class="hint">部屋に入っています…</p></section>');
  const db=await getDb();
  const clearHash=()=>{try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}JOIN=''};
  if(!db){clearHash();goTop();return}
  let room=null,ps=[];
  try{const rs=await db.doc('rooms/'+code).get();room=rs.exists&&alive(rs.data())?rs.data():null;
    if(room){const q=await db.collection('rooms/'+code+'/players').get();ps=q.docs.map(d=>d.id)}}catch(e){}
  const fail=msg=>{clearHash();view(`<section class="card hand"><p class="big">${msg}</p><p class="hint">部屋は12時間で閉じます。部屋を作った人に、もう一度送ってもらってください。</p><button class="btn" id="tp" style="align-self:stretch">トップへ</button></section>`);$('tp').onclick=goTop};
  if(!room)return fail('この部屋は見つかりませんでした');
  if(ps.includes(PID)){enterRoom(code);return}                     // もう入っている（ページを開きなおした）
  if(ps.length>=maxOf(room))return fail('この部屋は、もう'+maxOf(room)+'人そろっています');
  if(room.kind==='kon'){if(room.host===PID){enterRoom(code);return}konJoin(code,room,ps.length);return}
  const saved=store('kv_name');
  const go=async name=>{const r=await joinRoom(code,name);if(r!=='ok')fail(r)};
  if(saved){go(saved);return}                                        // 名前がわかっている人は、そのまま入る
  const started=room.phase!=='lobby';
  view(`<section class="card hand">
    <img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
    <p class="big">部屋に招待されました</p>
    <p class="hint">${started?'もう始まっています。入ると、いまの問題から参加します。':`いま${ps.length}人が待っています。`}</p>
    <label class="one-name" for="jn-name" style="align-self:stretch;text-align:left"><span>ニックネーム</span><input type="text" id="jn-name" maxlength="10" placeholder="本名でなくてOK" autocomplete="nickname"></label>
    <button class="btn" id="jn-go" style="align-self:stretch">参加する</button>
  </section>`);
  const inp=$('jn-name');
  const submit=e=>{if(e)e.preventDefault();const v=inp.value.trim();if(v)store('kv_name',v);$('jn-go').disabled=true;go(v||('ゲスト'+(ps.length+1)))};
  $('jn-go').onclick=submit;inp.onkeydown=e=>{if(e.key==='Enter')submit(e)};
}
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
    view(`<section class="card hand"><p class="cap">大人数の部屋 ${esc(R.code)}（主催者の画面）</p>
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
    <p class="cap">部屋番号</p><p class="code">${esc(c)}</p>
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
    <p class="cap">大人数の部屋 ${esc(R.code)}</p>
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
      <p class="hint">ぴったり ${r.same.length}問・合わせられる ${r.adj.length}問・ちがい ${r.diff.length}問</p>
      ${r.starN?`<p class="${r.starDiff.length?'warn':'good'}">★ ゆずれないところ ${r.starN}問のうち、同じ ${r.starSame.length}・合わせられる ${r.starAdj.length}・ちがう ${r.starDiff.length}</p>`:''}
      ${mutual?`<p class="good">おたがいに「名前を見せてもいい」を押しました。${p.rname?'':'（お相手の名前はまだ入っていません）'}</p>`
        :mine[p.id]?`<p class="hint">押しました。${esc(p.no)}番さんも押したら、ここに名前が出ます。</p>`
        :`<div class="rvbox" data-id="${p.id}"><button class="btn small ghost rv">${esc(p.no)}番さんに名前を見せてもいい</button></div>`}</li>`};
  const top=cand.slice(0,5),rest=cand.slice(5);
  view(`<section class="card score"><img class="chara c-mid" src="img/pair-smile.webp" width="200" height="111" alt="" aria-hidden="true">
      <p class="cap">${esc(me.no)}番さんと合う人</p>
      <p class="hint">答えが重なった順です。お金・将来・暮らしなど大事な問題と、★ゆずれないは重く数えています。この画面は、あなたにしか見えません。</p></section>
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
(()=>{const x=parseLink();
  if(x&&x.kind==='with')return withStart(x);
  if(x&&x.kind==='pair')return pairView(x);
  if(x&&x.bad){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}goTop();toast('このリンクは読みとれませんでした');return}
  if(JOIN)return joinFromLink(JOIN);goTop()})();
