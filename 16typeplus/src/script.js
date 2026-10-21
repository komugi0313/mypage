/* 多言語：TR("日本語") で、その言語の辞書にあれば置き換える */
const LANG=(typeof PAGE_LANG!=="undefined")?PAGE_LANG:"ja";
const TR=(t)=>(typeof I18N!=="undefined"&&I18N[t]!=null)?I18N[t]:t;
const AX=[
 {k:"EI",sh:TR("エネルギー"),name:TR("エネルギー"),a:"E",aw:TR("外向型"),b:"I",bw:TR("内向型"),c:"--ei"},
 {k:"SN",sh:TR("見方"),name:TR("ものの見方"),a:"S",aw:TR("現実型"),b:"N",bw:TR("直感型"),c:"--sn"},
 {k:"TF",sh:TR("判断"),name:TR("判断のしかた"),a:"T",aw:TR("思考型"),b:"F",bw:TR("感情型"),c:"--tf"},
 {k:"JP",sh:TR("行動"),name:TR("行動のしかた"),a:"J",aw:TR("計画型"),b:"P",bw:TR("柔軟型"),c:"--jp"}];
const STEMS="甲乙丙丁戊己庚辛壬癸",BR="子丑寅卯辰巳午未申酉戌亥";
const CH=[11,6,2,9,2,9,5,0,8,3],ST=["長生","沐浴","冠帯","建禄","帝旺","衰","病","死","墓","絶","胎","養"];
const G={"胎":"J","養":"P","長生":"J","沐浴":"P","冠帯":"J","建禄":"P","帝旺":"J","衰":"P","病":"J","死":"P","墓":"J","絶":"P"};
const STR_EI=[95,78,92,74,80,70,86,76,90,72],STR_SN=[80,72,86,78,88,82,90,84,84,76],STR_TF=[85,72,82,86,70,80,92,76,88,90,74,78];
const STR_JP={"長生":70,"沐浴":75,"冠帯":80,"建禄":88,"帝旺":92,"衰":72,"病":68,"死":74,"墓":82,"絶":78,"胎":66,"養":70};
/* ---- 生まれつきの文字（C案：文字ごとに命式の材料を分け、理由を出す） ---- */
const MC={"med":{"EI":0,"SN":1,"TF":0,"JP":-1},"q":{"EI":[-2.5,2.5],"SN":[-1.5,3.5],"TF":[-3.35,3.35],"JP":[-4,2]}};
const ZGC={子:["癸"],丑:["己","癸","辛"],寅:["甲","丙","戊"],卯:["乙"],辰:["戊","乙","癸"],巳:["丙","庚","戊"],午:["丁","己"],未:["己","丁","乙"],申:["庚","壬","戊"],酉:["辛"],戌:["戊","辛","丁"],亥:["壬","甲"]};
const TMP={子:-1,丑:-1,亥:-1,申:-0.5,酉:-0.5,戌:0.3,辰:-0.3,寅:0.3,卯:0.5,巳:1,午:1,未:1};
function godC(me,o){const S0="甲乙丙丁戊己庚辛壬癸",a=S0.indexOf(me),b=S0.indexOf(o),em=a>>1,eo=b>>1,same=(a%2)===(b%2);const rel=eo===em?0:eo===(em+1)%5?1:eo===(em+2)%5?2:em===(eo+2)%5?3:4;return [["比肩","劫財"],["食神","傷官"],["偏財","正財"],["偏官","正官"],["偏印","印綬"]][rel][same?0:1];}
function chartC(y,m,d){const S0="甲乙丙丁戊己庚辛壬癸";const r=window.PersonBazi(y,m,d,12,0,true,1);const P=r.pillars,me=r.dayMaster.stem,g={},el=[0,0,0,0,0];let temp=0;
 P.forEach(p=>{const M=p.label==="月柱"?3:1;el[S0.indexOf(p.stem)>>1]+=1;if(p.label!=="日柱"){const x=godC(me,p.stem);g[x]=(g[x]||0)+1;}ZGC[p.branch].forEach((s2,i)=>{const w=i===0?M:0.5;el[S0.indexOf(s2)>>1]+=w;const x=godC(me,s2);g[x]=(g[x]||0)+w;});temp+=TMP[p.branch]*M;});
 const G=a=>a.reduce((t,x)=>t+(g[x]||0),0);
 return {strong:r.sType==="身強",temp,ex:G(["食神","傷官"]),en:G(["偏財","正財"]),in_:G(["偏印","印綬"]),self:G(["比肩","劫財"]),
  EI:G(["食神","傷官","偏財","正財"])-G(["比肩","劫財","偏印","印綬"]),SN:(el[2]+el[3])-(el[0]+el[4]),TF:(el[3]+el[4])-(el[0]+el[1])-temp*0.5,JP:G(["正官","正財","印綬","比肩"])-G(["偏官","偏財","偏印","傷官","劫財"])};}
function reasonC(k,L,c){
 if(k==="EI")return L==="E"?(c.ex>=c.en?TR("生まれた日に、思ったことを外に出す「表現の星」が強く出ています。気持ちや考えを外へ出すほど元気になる人。"):TR("生まれた日に、人やモノと関わる「縁の星」が強く出ています。人と会い、外の世界と関わるほど力が出る人。"))
  :(c.in_>=c.self?TR("生まれた日に、学んだことを内にためる「学びの星」が強く出ています。ひとりで考え、吸収する時間に力がたまる人。"):TR("生まれた日に、自分の軸を守る「自分の星」が強く出ています。人に合わせるより、自分のペースで力を出す人。"));
 if(k==="SN")return L==="S"?TR("生まれた日に、「支える力」「決める力」が強く出ています。目に見えるもの、確かなものを土台に考える人。"):TR("生まれた日に、「伸びる力」「めぐる力」が強く出ています。まだ形のない可能性やつながりを感じ取る人。");
 if(k==="TF")return L==="T"?(c.temp<0?TR("涼しい季節の生まれで、ものごとを冷静に見る力が強く出ています。熱くなる場面でも、一歩引いて筋道を見られる人。"):TR("生まれた日に、「決める力」「めぐる力」が強く出ています。気持ちより先に、筋道で考える人。"))
  :(c.temp>0?TR("あたたかい季節の生まれで、人の気持ちに寄り添う力が強く出ています。思いやりで決める人。"):TR("生まれた日に、「伸びる力」「燃える力」が強く出ています。理屈より、気持ちや思いを大事にして決める人。"));
 if(k==="JP")return L==="J"?TR("生まれた日に、決まった形を守って着実に積み上げる星が多く出ています。見通しが立つと力を出せる人。"):TR("生まれた日に、変化や自由に強い星が多く出ています。状況に合わせて柔軟に動けるほど力を出せる人。");
 return L==="A"?TR("生まれた日に、自分を支える力が強く出ています。人の評価にゆれにくく、自分の判断で進める人。"):TR("生まれた日に、まわりの影響を受け取る力が強く出ています。そのぶん空気をよく読み、慎重に動ける人。");}
function natal(y,m,d){const days=Math.floor(Date.UTC(y,m-1,d)/864e5);const num=(((days+17)%60)+60)%60+1;const s=(num-1)%10,b=(num-1)%12;
 const L=CH[s],i=s%2===0?((b-L)%12+12)%12:((L-b)%12+12)%12,u=ST[i];
 let t=(s%2===0?"E":"I")+(s>=4?"S":"N")+([0,1,4,8,9,11].includes(b)?"T":"F")+G[u];
 let at=null,str={EI:75,SN:75,TF:75,JP:75},strong={},why={};
 try{const c=chartC(y,m,d);at=c.strong?"A":"T";const AXK=[["EI","E","I"],["SN","S","N"],["TF","T","F"],["JP","J","P"]];
  t=AXK.map(([k,a,b2])=>{const v=c[k]-MC.med[k]+1e-6,L=v>0?a:b2,half=v>0?(MC.q[k][1]-MC.med[k]):(MC.med[k]-MC.q[k][0]);strong[k]=Math.abs(v)>=half*0.6;str[k]=Math.round(55+40*Math.min(1,Math.abs(v)/(2*half)));why[k]=reasonC(k,L,c);return L;}).join("");
  why.AT=reasonC("AT",at,c);}catch(e){}
 return {num,at,kan:STEMS[s]+BR[b],t,str,strong,why};}
const st={y:1998,m:7,d:15,t:["E","N","F","P"],at:null,pct:null,half:{}};let selAT=null;
const $=id=>document.getElementById(id);
/* 16Personalities での呼び名（参考表示用） */
const P16={INTJ:TR("建築家"),INTP:TR("論理学者"),ENTJ:TR("指揮官"),ENTP:TR("討論者"),INFJ:TR("提唱者"),INFP:TR("仲介者"),ENFJ:TR("主人公"),ENFP:TR("運動家"),ISTJ:TR("管理者"),ISFJ:TR("擁護者"),ESTJ:TR("幹部"),ESFJ:TR("領事"),ISTP:TR("巨匠"),ISFP:TR("冒険家"),ESTP:TR("起業家"),ESFP:TR("エンターテイナー")};
const p16=t=>"（"+P16[t]+"）";
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function opts(el,a,b,cur){el.innerHTML="";for(let v=a;v<=b;v++){const o=document.createElement("option");o.value=v;o.textContent=v;if(v===cur)o.selected=true;el.appendChild(o);}}
function fillDate(){opts($("y"),1930,2020,st.y);opts($("m"),1,12,st.m);const mx=new Date(st.y,st.m,0).getDate();if(st.d>mx)st.d=mx;opts($("d"),1,mx,st.d);}
["y","m","d"].forEach(id=>$(id).addEventListener("change",e=>{st[id]=+e.target.value;fillDate();render();}));
const pk=$("picker"),sel=[null,null,null,null];
function drawSlots(popI){$("slots").innerHTML=AX.map((A,i)=>'<span style="--c:var('+A.c+')" class="'+(sel[i]?"fill":"empty")+(i===popI?" pop":"")+'">'+(sel[i]||"?")+'</span>').join("");
 const left=sel.filter(v=>!v).length,go=$("go");const tt=sel.join("");$("slotName").innerHTML=left?"":'<b>'+tt+(selAT?"-"+selAT:"")+'</b>'+p16(tt);go.disabled=left>0;go.textContent=left?TR("あと")+left+TR("つ選んでください"):TR("結果を見る");}
AX.forEach((A,i)=>{const g=document.createElement("div");g.className="seg";g.style.setProperty("--c","var("+A.c+")");g.setAttribute("role","group");g.setAttribute("aria-label",A.name);
 [[A.a,A.aw],[A.b,A.bw]].forEach(([l,w])=>{const bt=document.createElement("button");bt.type="button";bt.innerHTML=l+"<small>"+w+"</small>";
  bt.setAttribute("aria-pressed","false");bt.onclick=()=>{sel[i]=l;g.classList.add("done");[...g.children].forEach(c=>c.setAttribute("aria-pressed",c===bt));drawSlots(i);};g.appendChild(bt);});
 pk.appendChild(g);});
drawSlots(-1);
document.querySelectorAll("#atPick button").forEach(bt=>bt.onclick=()=>{selAT=bt.dataset.v||null;document.querySelectorAll("#atPick button").forEach(x=>x.setAttribute("aria-pressed",x===bt));drawSlots(-1);});
$("go").onclick=()=>{if(sel.includes(null))return;st.t=sel.slice();st.at=selAT;st.pct=null;st.half={};st.sway=null;showResult();render();document.querySelector(".hero").scrollIntoView({behavior:"smooth"});};
/* ---- 60問 ---- */
const SCALE=[[TR("とても当てはまる"),5,22],[TR("当てはまる"),4,18],[TR("やや当てはまる"),3,14],[TR("やや当てはまらない"),2,14],[TR("当てはまらない"),1,18],[TR("まったく当てはまらない"),0,22]];
const AXN={EI:0,SN:1,TF:2,JP:3,AT:4};const AXQ=AX.concat([{k:"AT",a:"A",b:"T",c:"--plus",name:TR("心の構え"),sh:TR("構え")}]);
let qa=[],qi=0,tbList=[],tbAns={};
function setPicker(){st.t.forEach((v,i)=>sel[i]=v);[...pk.children].forEach((g,i)=>{g.classList.add("done");[...g.children].forEach(c=>c.setAttribute("aria-pressed",c.firstChild.textContent===st.t[i]));});drawSlots(-1);}
let shown=false;
function showResult(){shown=true;$("result").style.display="contents";setTimeout(showInvitePair,0);}
function showQuiz(on){$("quizCard").hidden=!on;$("formCard").hidden=on;$("result").style.display=(!on&&shown)?"contents":"none";}
$("hasType").onclick=()=>{$("hasType").setAttribute("aria-pressed","true");$("pickField").hidden=false;$("pickField").scrollIntoView({behavior:"smooth",block:"nearest"});};
$("quiz").onclick=()=>{qa=new Array(QZ.Q.length).fill(null);qi=0;tbList=[];tbAns={};showQuiz(true);drawQ();$("quizCard").scrollIntoView({behavior:"smooth",block:"start"});};
$("qQuit").onclick=()=>{showQuiz(false);};
$("qBack").onclick=()=>{if(qi>0){qi--;drawQ();}else showQuiz(false);};
function scoreAll(){const sc={EI:[0,0],SN:[0,0],TF:[0,0],JP:[0,0],AT:[0,0]};
 QZ.Q.forEach((q,i)=>{const v=qa[i];if(v==null)return;const A=AXQ[AXN[q.ax]];if(q.p===A.a){sc[q.ax][0]+=v;sc[q.ax][1]+=5-v;}else{sc[q.ax][1]+=v;sc[q.ax][0]+=5-v;}});
 Object.keys(tbAns).forEach(k=>{const A=AXQ[AXN[k]];if(tbAns[k]===A.a)sc[k][0]+=3;else sc[k][1]+=3;});return sc;}
function drawQ(){const total=QZ.Q.length+tbList.length;$("qCount").textContent=Math.min(qi+1,total)+" / "+total;
 $("qProg").style.width=(qi/total*100)+"%";$("qNote").hidden=qi>0&&qi<QZ.Q.length;
 const o=$("qOpts");o.innerHTML="";
 if(qi<QZ.Q.length){const q=QZ.Q[qi],A=AXQ[AXN[q.ax]];
  $("qAxis").textContent=A.name;$("qAxis").style.color="var("+A.c+")";$("qText").textContent=q.q;$("qEx").textContent=q.ex;$("qExW").hidden=false;$("qExW").open=false;
  SCALE.forEach(([t,v,sz])=>{const bt=document.createElement("button");bt.type="button";bt.style.setProperty("--qc","var("+A.c+")");
   bt.innerHTML='<i style="width:'+sz+'px;height:'+sz+'px"></i>'+t;bt.setAttribute("aria-pressed",qa[qi]===v);
   bt.onclick=()=>{qa[qi]=v;bt.setAttribute("aria-pressed","true");setTimeout(next,180);};o.appendChild(bt);});
 }else{const k=tbList[qi-QZ.Q.length],T=QZ.TB[k],A=AXQ[AXN[k]];
  $("qAxis").textContent=A.name+TR("：あと少しで決まります");$("qAxis").style.color="var("+A.c+")";$("qText").textContent=T.q;$("qExW").hidden=true;
  [T.a,T.b].forEach(([t,p])=>{const bt=document.createElement("button");bt.type="button";bt.className="ab";bt.textContent=t;bt.setAttribute("aria-pressed",tbAns[k]===p);
   bt.onclick=()=>{tbAns[k]=p;setTimeout(next,180);};o.appendChild(bt);});}}
function next(){qi++;
 if(qi===QZ.Q.length&&tbList.length===0){const sc=scoreAll();tbList=Object.keys(sc).filter(k=>Math.abs(sc[k][0]-sc[k][1])<=6&&QZ.TB[k]);}
 if(qi>=QZ.Q.length+tbList.length){finish();return;}drawQ();}
function swayOf(){/* 揺れやすさ：同じ指標を、向きを変えた質問どうしで答えが食い違っていないか */
 const sw={};AXQ.forEach(A=>{const a=[],b=[];QZ.Q.forEach((q,i)=>{if(q.ax!==A.k||qa[i]==null)return;(q.p===A.a?a:b).push(qa[i]);});
  const av=x=>x.length?x.reduce((s,v)=>s+v,0)/x.length:2.5;sw[A.k]=Math.abs(av(a)-av(b))<1.5;});return sw;}
function finish(){const sc=scoreAll();st.pct={};st.half={};st.sway=swayOf();
 AX.forEach((A,i)=>{const[a,b]=sc[A.k],tot=a+b||1;st.t[i]=a>b?A.a:a<b?A.b:natal(st.y,st.m,st.d).t[i];st.pct[A.k]=Math.round(b/tot*100);st.half[A.k]=Math.abs(a-b)<=4||tbAns[A.k]!=null;});
 {const [a,b]=sc.AT;st.at=a>b?"A":a<b?"T":null;}setPicker();showResult();showQuiz(false);render();document.querySelector(".hero").scrollIntoView({behavior:"smooth"});}
/* ---- 1列ずつめくって比べる ---- */
const AXW={EI:[TR("外向型"),TR("内向型")],SN:[TR("現実型"),TR("直感型")],TF:[TR("思考型"),TR("感情型")],JP:[TR("計画型"),TR("柔軟型")],AT:[TR("自己主張型"),TR("慎重型")]};
let RV=null;
function setupReveal(N,born,now,bAT,nAT,diff,atDiff){
 const fl=$("flip"),bt=[...fl.querySelectorAll(".tile.b")],nt=[...fl.querySelectorAll(".tile.n")],ar=[...fl.querySelectorAll(".arw")];
 const cols=["EI","SN","TF","JP","AT"],colors=["--ei","--sn","--tf","--jp","--plus"],names=[TR("エネルギー"),TR("ものの見方"),TR("判断のしかた"),TR("行動のしかた"),TR("心の構え")];
 RV={opened:new Set(),story:$("rStory").innerHTML};
 [...bt,...nt].forEach(t=>t.classList.add("hid"));ar.forEach(a=>a.classList.add("hid"));
 cols.forEach((k,i)=>{if(k!=="AT"&&N.strong[k]===false)bt[i].classList.add("weak");});
 document.querySelectorAll(".hero .pend").forEach(e=>e.classList.add("wait"));
 $("rStory").innerHTML=TR('<span class="ln">タイルをタップして、</span><span class="ln">1列ずつめくってください</span>');
 $("revs").innerHTML="";$("flipAll").hidden=false;$("flipHint").textContent=TR("上が生まれつき、下が今のあなた。あと5列");
 const open=i=>{if(RV.opened.has(i))return;RV.opened.add(i);const k=cols[i];
  bt[i].classList.remove("hid");bt[i].classList.add("show");
  setTimeout(()=>{nt[i].classList.remove("hid");nt[i].classList.add("show");ar[i].classList.remove("hid");},260);
  const bl=k==="AT"?bAT:born[i],nl=k==="AT"?nAT:now[i],ws=AXW[k],wOf=L=>L===({EI:"E",SN:"S",TF:"T",JP:"J",AT:"A"})[k]?ws[0]:ws[1];
  const d=k==="AT"?atDiff:diff[i],weak=k!=="AT"&&N.strong[k]===false;
  const tg=nl==null?TR('<span class="tg same">比べない</span>'):!d?TR('<span class="tg same">そのまま</span>'):weak?TR('<span class="tg small">小さなギャップ</span>'):TR('<span class="tg gap">ギャップ</span>');
  const div=document.createElement("div");div.className="rv";div.style.setProperty("--c","var("+colors[i]+")");
  div.innerHTML='<div class="h"><span class="ax">'+names[i]+'</span><span class="cd">'+bl+'</span><span>'+wOf(bl)+'</span>'+(nl?TR('<span>→ 今</span><span class="cd">')+nl+'</span>':'')+tg+'</div><p>'+(N.why&&N.why[k]?N.why[k]:"")+'</p>';
  $("revs").appendChild(div);
  const left=5-RV.opened.size;$("flipHint").textContent=left?TR("あと")+left+TR("列"):"";
  if(!left){$("flipAll").hidden=true;setTimeout(()=>{$("rStory").innerHTML=RV.story;document.querySelectorAll(".hero .pend").forEach(e=>e.classList.remove("wait"));},500);}};
 [...bt,...nt].forEach(t=>{const i=(bt.indexOf(t)>=0?bt.indexOf(t):nt.indexOf(t));t.addEventListener("click",()=>open(i));});
 $("flipAll").onclick=()=>{let j=0;cols.forEach((_,i)=>{if(!RV.opened.has(i)){setTimeout(()=>open(i),j*320);j++;}});};}
/* ---- 人物像 ---- */
function drawPersona(which){const me=window.__me;if(!me||typeof PS==="undefined")return;
 const t=which==="now"?me.now:me.born,at=which==="now"?me.nAT:me.bAT,P=PS[t];
 $("pNow").innerHTML=TR('今のあなた<b>')+me.now+(me.nAT?"-"+me.nAT:"")+'</b>';$("pBorn").innerHTML=TR('本来のあなた<b>')+me.born+(me.bAT?"-"+me.bAT:"")+'</b>';
 $("pNow").setAttribute("aria-selected",which==="now");$("pBorn").setAttribute("aria-selected",which!=="now");
 if(!P){$("psCatch").textContent="（"+t+TR("の人物像は準備中です）");["psOv","psRel","psLove","psWork","psGrow","psAT"].forEach(id=>$(id).textContent="");$("psStr").innerHTML=$("psPit").innerHTML=$("psJobs").innerHTML="";return;}
 const li=a=>a.map(x=>{const [h,d]=x.split("｜");return "<li><b>"+h+"</b><span>"+(d||"")+"</span></li>";}).join("");
 $("psCode").textContent=t+(at?"-"+at:"")+"（"+P16[t]+"）";$("psCatch").textContent=P.catch;$("psOv").textContent=P.overview;
 $("psStr").innerHTML=li(P.strengths);$("psPit").innerHTML=li(P.pitfalls);
 $("psAT").innerHTML=at?'<b>'+(at==="A"?TR("自己主張型（A）"):TR("慎重型（T）"))+TR('のあなたは</b>')+P[at]:"";$("psAT").hidden=!at;
 $("psRel").textContent=P.relationships;$("psLove").textContent=P.love;$("psWork").textContent=P.work;$("psJobs").innerHTML=P.jobs.map(j=>"<li>"+j+"</li>").join("");$("psGrow").textContent=P.growth;}
$("pNow").onclick=()=>drawPersona("now");$("pBorn").onclick=()=>drawPersona("born");
function render(){
 const N=natal(st.y,st.m,st.d),now=st.t.join(""),born=N.t;
 $("rSrc").textContent=st.pct?TR("60問の診断結果"):TR("あなたの診断結果");
 const bAT=N.at,nAT=st.at,bornF=born+(bAT?"-"+bAT:""),nowF=now+(nAT?"-"+nAT:"");
 const diff=AX.map((A,i)=>now[i]!==born[i]),atDiff=!!(bAT&&nAT&&bAT!==nAT),dn=diff.filter(Boolean).length+(atDiff?1:0);
 $("rStory").innerHTML=dn===0?TR('<span class="ln">本当のあなたは <span class="b">')+bornF+TR('</span>。</span><br><span class="ln">今も、そのまま <span class="n">')+nowF+TR('</span>。</span>')
   :TR('<span class="ln">本当のあなたは <span class="b">')+bornF+TR('</span>。</span><br><span class="ln">今は <span class="n">')+nowF+TR('</span> を生きている。</span>');
 const ATC="--plus";
 let fh=TR('<span class="rl"><b>生まれつき</b>本当の自分</span>')+AX.map((A,i)=>'<span class="tile b'+(diff[i]?' c':'')+'" style="--c:var('+A.c+')">'+born[i]+'</span>').join("")+'<span class="tile b at'+(atDiff?' c':'')+'" style="--c:var('+ATC+')">'+(bAT||"–")+'</span>';
 fh+='<span class="rl e"></span>'+AX.map((A,i)=>'<span class="arw'+(diff[i]?' c':'')+'" style="--c:var('+A.c+')">'+(diff[i]?'↓':'｜')+'</span>').join("")+'<span class="arw'+(atDiff?' c':'')+'" style="--c:var('+ATC+')">'+(atDiff?'↓':'｜')+'</span>';
 fh+=TR('<span class="rl"><b>いま</b>今の自分</span>')+AX.map((A,i)=>'<span class="tile n'+(diff[i]?' c':'')+'" style="--c:var('+A.c+');--i:'+i+'">'+now[i]+'</span>').join("")+'<span class="tile n at'+(atDiff?' c':'')+(nAT?'':' none')+'" style="--c:var('+ATC+');--i:4">'+(nAT||"?")+'</span>';
 fh+='<span class="rl e"></span>'+AX.map(A=>'<span class="axl">'+A.sh+'</span>').join("")+TR('<span class="axl">構え</span>');
 $("flip").innerHTML=fh;
 setupReveal(N,born,now,bAT,nAT,diff,atDiff);
 const ch1=AX.filter((A,i)=>diff[i]).map(A=>'<span class="nw">'+A.name+'</span>').concat(atDiff?[TR('<span class="nw">心の構え</span>')]:[]);
 const tot=nAT?5:4;
 $("rSum").innerHTML=(dn===0?tot+TR('文字すべて、<b>生まれつきのまま</b>です。'):TR('変わったのは <b>')+dn+TR('文字</b>')+(dn<tot?'<br>'+ch1.join(TR("・")):TR('（すべて）')))+(nAT?'':TR('<br><small class="atnote">最後の1文字（A/T）は、選んだ人だけ比べます</small>'));
 const C=(typeof COMBO!=="undefined"&&COMBO[born+">"+now])||{name:TR("（文章を準備中）"),atari:["",""],karai:""};
 const strip=t=>t.replace(/\[\[(今|本):(.*?)\]\]/g,"$2");
 const HB=HN.type[born],HW=HN.type[now];
 $("hBornT").textContent=born;$("hNowT").textContent=now;$("hWant").textContent=HB.want;$("hEffort").textContent=HW.effort;
 const gk=AX.map((A,i)=>born[i]!==now[i]?born[i]+now[i]:null).filter(Boolean).concat(atDiff?[bAT+nAT]:[]);
 const colOf={E:"--ei",I:"--ei",S:"--sn",N:"--sn",T:"--tf",F:"--tf",J:"--jp",P:"--jp",A:"--plus"};
 if(gk.length){$("hWorryQ").hidden=false;
  const tintOf={E:"--tint-ei",I:"--tint-ei",S:"--tint-sn",N:"--tint-sn",T:"--tint-tf",F:"--tint-tf",J:"--tint-jp",P:"--tint-jp"};
  const isAT=k=>k==="AT"||k==="TA",cOf=k=>isAT(k)?"--plus":colOf[k[0]],tOf=k=>isAT(k)?"--tint-at":tintOf[k[0]];
  const wi=k=>{const g=HN.gap[k];return '<div class="it" style="--c:var('+cOf(k)+');--t:var('+tOf(k)+')"><div class="gc"><div class="gtiles"><span class="gtl"><span class="gt b">'+k[0]+'</span><b>'+g.from+'</b></span><span class="gar">→</span><span class="gtl"><span class="gt n">'+k[1]+'</span><b>'+g.to+'</b></span></div>'
   +'<div class="gtx"><small>'+g.axis+TR('</small><span class="row"><i>本当は</i>')+(isAT(k)?HN.letter['AT_'+k[0]]:HN.letter[k[0]])+TR('</span><span class="row n"><i>今は</i>')+(isAT(k)?HN.letter['AT_'+k[1]]:HN.letter[k[1]])+'</span></div></div>'
   +'<p>'+g.worry+TR('</p><p class="key"><b>ほどき方</b>')+g.key+'</p></div>';};
  $("hWorry").innerHTML=gk.slice(0,2).map(wi).join("")+(gk.length>2?TR('<details class="hmore"><summary>ほかの悩みのヒントも見る（')+(gk.length-2)+TR('つ）</summary><div class="hw">')+gk.slice(2).map(wi).join("")+'</div></details>':"");
  $("hWork").innerHTML=gk.slice(0,2).map(k=>'<div class="it wk" style="--c:var('+cOf(k)+')"><span class="ax">'+HN.gap[k].axis+'</span><p>'+HN.gap[k].work+'</p></div>').join("");
 }else{$("hWorryQ").hidden=true;$("hWorry").innerHTML='<div class="it"><p>'+HN.same.worry+TR('</p><p class="key"><b>ほどき方</b>')+HN.same.key+'</p></div>';$("hWork").innerHTML='<div class="it"><p>'+HN.same.work+'</p></div>';}
 $("hJobW").textContent=HB.work;$("hJobs").innerHTML=HB.jobs.map(t=>"<li>"+t+"</li>").join("");
 $("ccKarai").textContent=strip(C.karai);
 window.__me={born,now,N,bAT,nAT};drawPersona("now");drawToday();
 $("p16Born").textContent=born+p16(born);$("p16Now").textContent=now+p16(now);
 $("nkBorn").textContent=D.NICK[born];$("nkNow").textContent=D.NICK[now];
 let pct=0,ch=[];
 const axHTML=AX.map((A,i)=>{const n=now[i],b=born[i],c=n!==b;
  if(c){pct+=N.strong[A.k]===false?12:25;ch.push(b+n);}
  const bPos=b===A.a?100-N.str[A.k]:N.str[A.k],nPos=st.pct?st.pct[A.k]:(n===A.a?25:75),shown=n===A.a?100-nPos:nPos;
  const pc=st.pct?Math.max(50,shown)+'% ':'',hf=(st.pct&&st.sway&&st.sway[A.k]?TR('<span class="half sway">揺れやすい</span>'):'')+(st.pct&&st.half[A.k]?TR('<span class="half">ほぼ半々</span>'):'');
  return '<div class="axis" style="--c:var('+A.c+')"><div class="axhead"><span>'+A.name+'：<b style="color:var('+A.c+')">'+pc+(n===A.a?A.aw:A.bw)+'</b>'+hf+'</span>'+(c?TR('<span class="chg">変化</span>'):TR('<span class="same">そのまま</span>'))+'</div>'
  +'<div class="track" style="background:var(--tint-'+A.k.toLowerCase()+')"><span class="m born" style="left:'+bPos+'%"></span><span class="m now" style="left:'+nPos+'%;background:var('+A.c+')"></span></div>'
  +'<div class="ends"><span class="'+(n===A.a?"on":"")+'">'+A.aw+' '+A.a+'</span><span class="'+(n===A.b?"on":"")+'">'+A.bw+' '+A.b+'</span></div></div>';}).join("");
 $("axes").innerHTML=axHTML;
 pct=Math.round(pct);const n=ch.length;
 $("gNum").textContent=pct;$("gBar").style.width=pct+"%";$("gMeter").setAttribute("aria-label",TR("ギャップ度 ")+pct+"%");
 $("gLbl").textContent=[TR("生まれつきのまま"),TR("ちょっとだけ変化"),TR("ほどよく変化"),TR("かなり変化"),TR("ほぼ別人レベルの変化")][n];
 $("aruH").textContent=now+TR(" のあるある");
 $("aru").innerHTML=D.ARUARU[now].map(t=>"<li>"+t+"</li>").join("");
 $("cT").textContent=D.TCOMPAT[now].m;$("cW").textContent=D.TCOMPAT[now].why;
}
/* ---- 相性 ---- */
const ps={y:1995,m:4,d:20};
function fillP(){opts($("py"),1930,2020,ps.y);opts($("pm"),1,12,ps.m);const mx=new Date(ps.y,ps.m,0).getDate();if(ps.d>mx)ps.d=mx;opts($("pd"),1,mx,ps.d);}
["py","pm","pd"].forEach(id=>$(id).addEventListener("change",e=>{ps[id.slice(1)]=+e.target.value;fillP();}));
Object.keys(D.NICK).forEach(t=>{const o=document.createElement("option");o.value=t;o.textContent=t+"（"+P16[t]+"）";$("pt").appendChild(o);});
function same(a,b){let n=0;for(let i=0;i<4;i++)if(a[i]===b[i])n++;return n;}
const TIER=[[TR("正反対の刺激コンビ"),TR("お互いにないものを持っている2人。組めば最強、ぶつかれば大波乱。")],[TR("別ルートの発見コンビ"),TR("考え方は別ルート。だからこそ話すたびに発見がある。")],[TR("ほどよいバランス型"),TR("半分同じで、半分ちがう。ほどよい距離で長く続く。")],[TR("似た者同士の安心ペア"),TR("感覚がよく似ていて、無理せず自然体でいられる。")],[TR("鏡みたいな2人"),TR("長所も弱点もそっくり。いちばんの理解者になれる。")]];
/* P = {born, num, now(任意), who} */
function pairHTML(P){const me=window.__me,sb=same(me.born,P.born),tb=TIER[sb];
 let html='<div class="phead"><img src="img/mascot/c'+String(P.num).padStart(2,"0")+'.webp" alt="'+esc(P.who)+TR('の相棒キャラクター"><div><small>')+esc(P.who)+TR('の生まれつき</small><span class="t">')+P.born+'</span><small>'+D.NICK[P.born]+(P.now?TR('（今は ')+P.now+TR('）'):'')+'</small></div></div>';
 html+=TR('<div class="mx"><div><span class="l">本当の相性</span><div class="v">')+tb[0]+'</div></div>';
 if(P.now){const sn=same(me.now,P.now),tn=TIER[sn];html+=TR('<div><span class="l">今の相性</span><div class="v">')+tn[0]+'</div></div></div>';
  const hiB=sb>=2,hiN=sn>=2;
  const V=hiB&&hiN?[TR("どこから見ても相性のいい2人"),TR("今も本当の部分も、自然と波長が合う。一緒にいて疲れない相手。")]
   :hiB&&!hiN?[TR("今はすれ違って見えても、根っこは似た者同士"),TR("今の2人は噛み合わない場面があっても、本当の部分ではわかり合える。時間をかけるほど仲良くなる。")]
   :!hiB&&hiN?[TR("今は気が合う。でも本音は別ルート"),TR("今の2人は話が合うけれど、本当の部分は考え方が違う。大事な決断のときに差が出やすいので、本音を話す時間を。")]
   :[TR("正反対だからこそ、組めば最強"),TR("今も本当の部分も違うからこそ、お互いの足りないところを埋め合える。ぶつかったら、違いを面白がって。")];
  html+='<p class="verdict"><b>'+V[0]+'</b>'+V[1]+'</p>';}
 else html+=TR('<div><span class="l">今の相性</span><div class="v" style="color:var(--muted);font-weight:500">16タイプを入れると出ます</div></div></div><p class="verdict">')+tb[1]+'</p>';
 return html;}
$("pGo").onclick=()=>{const N=natal(ps.y,ps.m,ps.d);$("pRes").innerHTML=pairHTML({born:N.t,num:N.num,now:$("pt").value||null,who:TR("あの人")});$("pRes").hidden=false;};

/* ---- 相棒の今日のひと言 ---- */
/* 生まれた日の干と、その日の干の関係（10パターン）でテーマを、
   生まれた日の干から見たその日の支の強さ（12段階→3段階）でパワーを決める */
const GODS=[["比肩","劫財"],["食神","傷官"],["偏財","正財"],["偏官","正官"],["偏印","印綬"]];
function godOf(me,ot){const em=Math.floor(me/2),eo=Math.floor(ot/2),samePol=(me%2)===(ot%2);
 const rel=eo===em?0:eo===(em+1)%5?1:eo===(em+2)%5?2:em===(eo+2)%5?3:4;return GODS[rel][samePol?0:1];}
function stageOf(s,b){const L=CH[s],i=s%2===0?((b-L)%12+12)%12:((L-b)%12+12)%12;return ST[i];}
const POW={"長生":"high","冠帯":"high","建禄":"high","帝旺":"high","沐浴":"mid","衰":"mid","養":"mid","胎":"mid","病":"low","死":"low","墓":"low","絶":"low"};
let tdOff=0;
function drawToday(){const me=window.__me;if(!me)return;const dt=new Date();dt.setDate(dt.getDate()+tdOff);
 const T=natal(dt.getFullYear(),dt.getMonth()+1,dt.getDate()),ms=(me.N.num-1)%10,ts=(T.num-1)%10,tb=(T.num-1)%12;
 const th=TD.themes[godOf(ms,ts)],pw=TD.power[POW[stageOf(ms,tb)]];
 const line=th.lines[(T.num+me.N.num)%th.lines.length].replace("{B}",me.born).replace("{N}",me.now);
 const wk="日月火水木金土"[dt.getDay()];
 $("tdDate").textContent=TR("今日のひと言　")+(LANG==="ja"?(dt.getMonth()+1)+"月"+dt.getDate()+"日（"+wk+"）":dt.toLocaleDateString(LANG==="ko"?"ko-KR":"en-US",{month:"short",day:"numeric",weekday:"short"}));
 $("tdImg").src="img/mascot/c"+String(me.N.num).padStart(2,"0")+".webp";
 $("tdLine").textContent=line;
 $("tdWho").textContent=th.who==="born"?TR("生まれつきの ")+me.born:TR("今の ")+me.now;
 $("tdPowL").textContent=pw.label;$("tdPow").innerHTML='<span class="st">'+"★★★".slice(0,pw.stars)+'</span><span style="color:var(--rule)">'+"★★★".slice(pw.stars)+'</span><small class="pwadd">'+pw.add+'</small>';
 $("tdTitle").textContent=th.title;$("tdTip").textContent=th.tip;
}

/* ---- あの人に送る（招待リンク） ---- */
/* 生年月日は送らず、タイプとキャラ番号と名前だけを載せる */
const SITE=/16typeplus\.jp$/.test(location.hostname)?location.origin+"/":"https://claude.ai/artifact/GxvDBQNx6fvapiXBHVgYXH";
const b64e=t=>btoa(String.fromCharCode(...new TextEncoder().encode(t))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const b64d=t=>new TextDecoder().decode(Uint8Array.from(atob(t.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0)));
function inviteURL(){const me=window.__me,nm=$("myName").value.trim().slice(0,12);
 const tok="from."+me.born+(me.bAT?"-"+me.bAT:"")+"."+me.now+(me.nAT?"-"+me.nAT:"")+"."+me.N.num+(nm?"."+b64e(nm):"");
 return /16typeplus\.jp$/.test(location.hostname)?SITE+"?"+tok.replace(/^from\./,"from="):SITE+"#"+tok;}
function parseInvite(){try{let t=location.hash.replace(/^#/,"");const q=new URLSearchParams(location.search).get("from");
  if(q)t="from."+q;if(!/^from\./.test(t))return null;const a=t.split(".");
  const ok=x=>/^[EI][SN][TF][JP](-[AT])?$/.test(x);if(!ok(a[1])||!ok(a[2]))return null;const num=+a[3];if(!(num>=1&&num<=60))return null;
  return {born:a[1].slice(0,4),now:a[2].slice(0,4),bornF:a[1],nowF:a[2],num,who:a[4]?b64d(a[4])+TR("さん"):TR("送ってくれた人")};}catch(e){return null;}}
const INV=parseInvite();
$("mkLink").onclick=()=>{const u=inviteURL(),nm=$("myName").value.trim();
 const msg=(nm?nm+TR("から"):"")+TR("相性診断が届いたよ。生まれつきのタイプと今のタイプ、2人の相性がわかる👇")+"\n"+u;
 $("lnk").value=u;$("lnkLine").href="https://line.me/R/msg/text/?"+encodeURIComponent(msg);$("lnkBox").hidden=false;window.__msg=msg;};
$("cpLink").onclick=()=>{const t=$("lnk");const done=()=>{$("cpLink").textContent=TR("コピーしました");setTimeout(()=>$("cpLink").textContent=TR("リンクをコピー"),1600);};
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(window.__msg||t.value).then(done).catch(()=>{t.select();});}else t.select();};
if(INV){$("invBar").hidden=false;$("invWho").textContent=INV.who;$("invPair").textContent=INV.bornF+" → "+INV.nowF;
 $("invImg").src="img/mascot/c"+String(INV.num).padStart(2,"0")+".webp";
 $("partnerH").textContent=INV.who+TR("との相性");}
function showInvitePair(){if(!INV)return;$("pRes").innerHTML=pairHTML(INV);$("pRes").hidden=false;$("pForm").hidden=true;}
fillP();
fillDate();render();
