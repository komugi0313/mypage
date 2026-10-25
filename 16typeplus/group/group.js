/* ---- グループの相性（サーバーから受け取ったメンバー一覧だけで計算する） ----
   members: [{name, born:"INTJ", now:"INFJ"}]  2〜10人。生年月日は使わない */
const GTR=typeof TR==="function"?TR:(s=>s);
const GL={E:"人といると元気が出る人",I:"ひとりの時間で元気が戻る人",S:"事実や経験を大事にする人",N:"思いつきや先のことを大事にする人",T:"理屈で決める人",F:"気持ちで決める人",J:"計画どおり進めたい人",P:"その場に合わせて動く人"};
const GAX=[["E","I"],["S","N"],["T","F"],["J","P"]];
/* 多い方の文字ごとの、グループでよくある場面 */
const GMANY={E:"集まると話が止まらず、気づいたら予定の時間を過ぎている。",I:"集まっても静かな時間がある。でも、それで気まずくならない。",S:"お店や日にちなど、具体的なことはすぐ決まる。",N:"「今度あれやろう」という話で盛り上がる。そのまま実現しない話も多い。",T:"意見がちがっても、言い合ったあとはすっきりしている。",F:"だれかが元気がないと、すぐ気づいて声をかける。",J:"待ち合わせの時間と場所が、早めに決まる。",P:"当日の気分で、行き先が変わることがある。"};
/* だれもいない文字ごとのコツ */
const GNONE={E:"みんな、自分からは誘いにくい人です。帰る前に、次に会う日を決めておきましょう。",I:"みんな話すのが好きなので、話す人がかたよりがちです。決める前に1人ずつ意見を聞いてみましょう。",S:"案はたくさん出るのに、細かいところが抜けがちです。お金と時間だけは、だれか1人が確認しましょう。",N:"いつものお店、いつもの流れになりがちです。たまに、だれも行ったことのない場所を選んでみましょう。",T:"言いにくいことを、みんながためこみがちです。決めるときは多数決で、さっぱり決めましょう。",F:"話が早いぶん、言い方がきつくなることがあります。決まったあとに「ありがとう」をひと言。",J:"計画を立てる人がいません。日にちと集合場所だけは、その場で決めてしまいましょう。",P:"予定が変わると、みんな少し困ります。雨の日の案を1つ決めておきましょう。"};
/* 役まわり：性格の文字で決める。同じ役はなるべく重ならないようにする */
const GROLE=[["日にちと場所を決める人","EJ"],["予約や持ち物を確認する人","SJ"],["新しい案を出す人","NP"],["その場を盛り上げる人","EP"],["じっくり話を聞く人","IF"],["元気がない人に気づく人","SF"],["意見をまとめる人","TJ"],["損か得かを冷静に見る人","IT"],["予定が変わってもあわてない人","SP"],["先のことを考えておく人","NJ"],["本音で話せる相手になる人","NF"],["ちがう意見をはっきり言う人","ET"]];
function gRoles(types){const used=new Set();return types.map(t=>{let best=null,bs=-1;
  GROLE.forEach(([r,k],i)=>{const s=[...k].filter(c=>t.includes(c)).length*2-(used.has(i)?3:0);if(s>bs){bs=s;best=i;}});used.add(best);return GTR(GROLE[best][0]);});}
function gSame(a,b){let n=0;for(let i=0;i<4;i++)if(a[i]===b[i])n++;return n;}
function groupResult(members){
 const M=members.filter(m=>/^[EI][SN][TF][JP]$/.test(m.born)&&/^[EI][SN][TF][JP]$/.test(m.now)),n=M.length;if(n<2)return null;
 const cnt=k=>GAX.map(([a,b],i)=>{const ca=M.filter(m=>m[k][i]===a).length;return {a,b,ca,cb:n-ca};});
 const now=cnt("now"),born=cnt("born");
 /* 特徴：偏りが大きい軸から最大3つ */
 const feats=now.map(x=>({x,r:Math.abs(x.ca-x.cb)/n})).filter(o=>o.r>=1/3).sort((p,q)=>q.r-p.r).slice(0,3).map(({x})=>{const L=x.ca>x.cb?x.a:x.b;return {L,text:GTR(GMANY[L])};});
 /* コツ：だれもいない文字（性格で見る） */
 let tips=[];now.forEach(x=>{if(x.ca===0)tips.push({L:x.a,text:GTR(GNONE[x.a])});if(x.cb===0)tips.push({L:x.b,text:GTR(GNONE[x.b])});});
 if(!tips.length){const x=now.slice().sort((p,q)=>Math.abs(q.ca-q.cb)-Math.abs(p.ca-p.cb))[0];const few=x.ca<x.cb?x.a:x.b,c=Math.min(x.ca,x.cb);
  tips.push({L:few,text:GTR("「{l}」は{c}人だけです。その人の意見は少数派になりがちなので、決める前に聞いてみましょう。").replace("{l}",GTR(GL[few])).replace("{c}",c)});}
 tips=tips.slice(0,3);
 /* 気質で見ると：性格と気質で多い方が入れかわる軸 */
 const flip=GAX.map((ax,i)=>{const a=now[i],b=born[i];const clear=x=>Math.abs(x.ca-x.cb)/n>=1/3,nm=a.ca>a.cb?a.a:a.b,bm=b.ca>b.cb?b.a:b.b;return clear(a)&&clear(b)&&nm!==bm?{now:nm,born:bm}:null;}).filter(Boolean).slice(0,2)
  .map(f=>GTR("性格では「{a}」が多いけれど、気質（生まれつき）では「{b}」が多いグループです。").replace("{a}",GTR(GL[f.now])).replace("{b}",GTR(GL[f.born])));
 /* 2人ずつ：性格と気質の両方で、同じ文字の数 */
 const pairs=[];for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)pairs.push({i,j,s:gSame(M[i].now,M[j].now)*2+gSame(M[i].born,M[j].born)});
 pairs.sort((p,q)=>q.s-p.s);
 const why=(p,match)=>{const A=M[p.i].now,B=M[p.j].now,out=[];for(let k=0;k<4;k++){if(match&&A[k]===B[k])out.push(GTR("どちらも「{l}」").replace("{l}",GTR(GL[A[k]])));if(!match&&A[k]!==B[k])out.push(GTR("{x}さんは「{a}」、{y}さんは「{b}」").replace("{x}",M[p.i].name).replace("{a}",GTR(GL[A[k]])).replace("{y}",M[p.j].name).replace("{b}",GTR(GL[B[k]])));}return out.slice(0,2);};
 const good=pairs[0],bad=pairs[pairs.length-1];
 const roles=gRoles(M.map(m=>m.now)),broles=gRoles(M.map(m=>m.born));
 return {n,members:M.map((m,i)=>({...m,role:roles[i],brole:broles[i]!==roles[i]?broles[i]:null})),now,born,feats,tips,flip,
  good:{a:M[good.i].name,b:M[good.j].name,why:why(good,true)},bad:n>2&&bad.s<good.s&&gSame(M[bad.i].now,M[bad.j].now)<4?{a:M[bad.i].name,b:M[bad.j].name,why:why(bad,false)}:null};}
function groupHTML(G,title){const e=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 let h='<div class="gr"><p class="gr-eb">'+GTR("グループの相性")+'</p><h2 class="gr-t">'+e(title)+'</h2><p class="gr-n">'+GTR("{n}人").replace("{n}",G.n)+'</p>';
 h+='<h3>'+GTR("このグループは、こんな集まり")+'</h3>'+(G.feats.length?'<ul class="gr-f">'+G.feats.map(f=>'<li>'+e(f.text)+'</li>').join("")+'</ul>':'<p>'+GTR("どの文字も人数が半々くらいです。いろいろなやり方の人がそろっています。")+'</p>');
 h+='<div class="gr-bars">'+G.now.map(x=>'<div class="gr-b"><span class="l">'+x.a+' '+x.ca+'</span><span class="gbar"><i style="width:'+(x.ca/G.n*100)+'%"></i></span><span class="r">'+x.cb+' '+x.b+'</span></div>').join("")+'<p class="gr-cap">'+GTR("性格の文字の人数")+'</p></div>';
 if(G.flip.length)h+='<div class="gr-flip"><b>'+GTR("気質で見ると")+'</b>'+G.flip.map(t=>'<p>'+e(t)+'</p>').join("")+'</div>';
 h+='<h3>'+GTR("それぞれの役まわり")+'</h3><ul class="gr-m">'+G.members.map(m=>'<li><div class="gr-mn"><b>'+e(m.name)+'</b><span>'+GTR("気質")+' '+m.born+' / '+GTR("性格")+' '+m.now+'</span></div><p class="gr-r">'+e(m.role)+'</p>'+(m.brole?'<p class="gr-br">'+GTR("生まれつきは「{r}」にも向いています").replace("{r}",e(m.brole))+'</p>':'')+'</li>').join("")+'</ul>';
 h+='<h3>'+GTR("気が合う2人")+'</h3><div class="gr-p good"><b>'+e(G.good.a)+'</b> × <b>'+e(G.good.b)+'</b>'+G.good.why.map(w=>'<p>'+e(w)+'</p>').join("")+'</div>';
 if(G.bad)h+='<h3>'+GTR("すれ違いやすい2人")+'</h3><div class="gr-p bad"><b>'+e(G.bad.a)+'</b> × <b>'+e(G.bad.b)+'</b>'+G.bad.why.map(w=>'<p>'+e(w)+'</p>').join("")+'<p class="gr-pt">'+GTR("やり方がちがうだけです。ぶつかったら、相手のやり方を1回だけ試してみてください。")+'</p></div>';
 h+='<h3>'+GTR("うまくいくコツ")+'</h3><ul class="gr-tips">'+G.tips.map(t=>'<li>'+e(t.text)+'</li>').join("")+'</ul></div>';return h;}
if(typeof module!=="undefined")module.exports={groupResult,groupHTML};
