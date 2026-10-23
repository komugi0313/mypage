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
 return {g,el,strong:r.sType==="身強",temp,ex:G(["食神","傷官"]),en:G(["偏財","正財"]),in_:G(["偏印","印綬"]),self:G(["比肩","劫財"]),
  EI:G(["食神","傷官","偏財","正財"])-G(["比肩","劫財","偏印","印綬"]),SN:(el[2]+el[3])-(el[0]+el[4]),TF:(el[3]+el[4])-(el[0]+el[1])-temp*0.5,JP:G(["正官","正財","印綬","比肩"])-G(["偏官","偏財","偏印","傷官","劫財"])};}
function reasonC(k,L,c){
 const top=a=>a.reduce((m,x)=>((c.g[x]||0)>(c.g[m]||0)?x:m),a[0]);
 if(k==="EI")return L==="E"?(c.ex>=c.en?TR("生まれた日に、思ったことを外に出す「表現の星」が強く出ています。気持ちや考えを外へ出すほど元気になる人。"):TR("生まれた日に、人やモノと関わる「縁の星」が強く出ています。人と会い、外の世界と関わるほど力が出る人。"))
  :(c.in_>=c.self?TR("生まれた日に、学んだことを内にためる「学びの星」が強く出ています。ひとりで考え、吸収する時間に力がたまる人。"):TR("生まれた日に、自分の軸を守る「自分の星」が強く出ています。人に合わせるより、自分のペースで力を出す人。"));
 if(k==="SN")return L==="S"?(c.el[2]>=c.el[3]?TR("生まれた日に、どっしり「支える力」が強く出ています。目に見えるもの、確かなものを土台に考える人。"):TR("生まれた日に、すっぱり「決める力」が強く出ています。事実をもとに、白黒をはっきりつけて考える人。"))
  :(c.el[0]>=c.el[4]?TR("生まれた日に、ぐんと「伸びる力」が強く出ています。まだ形のない可能性に、先回りして気づく人。"):TR("生まれた日に、さらさら「めぐる力」が強く出ています。物事のつながりや流れを、感覚でつかむ人。"));
 if(k==="TF")return L==="T"?(c.temp<0?TR("涼しい季節の生まれで、ものごとを冷静に見る力が強く出ています。熱くなる場面でも、一歩引いて筋道を見られる人。"):TR("生まれた日に、「決める力」「めぐる力」が強く出ています。気持ちより先に、筋道で考える人。"))
  :(c.temp>0?TR("あたたかい季節の生まれで、人の気持ちに寄り添う力が強く出ています。思いやりで決める人。"):TR("生まれた日に、「伸びる力」「燃える力」が強く出ています。理屈より、気持ちや思いを大事にして決める人。"));
 if(k==="JP"){if(L==="J")return {"正官":TR("生まれた日に、ルールや約束を大事にする「けじめの星」が強く出ています。決まった形を守るほど力を出せる人。"),"正財":TR("生まれた日に、こつこつ積み上げる「堅実の星」が強く出ています。見通しが立つと、着実に進める人。"),"印綬":TR("生まれた日に、じっくり学ぶ「学びの星」が強く出ています。準備を整えてから動くほど、力を出せる人。"),"比肩":TR("生まれた日に、自分の軸を守る「自分の星」が強く出ています。自分で決めた手順を守るほど、力を出せる人。")}[top(["正官","正財","印綬","比肩"])];
  return {"偏官":TR("生まれた日に、勢いで切り開く「挑戦の星」が強く出ています。予定外の場面ほど、力を出せる人。"),"偏財":TR("生まれた日に、チャンスをつかむ「めぐり合わせの星」が強く出ています。その場の流れに乗るほど、力を出せる人。"),"偏印":TR("生まれた日に、ひらめきを大事にする「個性の星」が強く出ています。決まった型より、自分なりのやり方で力を出す人。"),"傷官":TR("生まれた日に、感性で動く「感性の星」が強く出ています。気分が乗ったときに、一気に力を出す人。"),"劫財":TR("生まれた日に、負けずぎらいの「勝負の星」が強く出ています。状況が動くほど、燃えて力を出す人。")}[top(["偏官","偏財","偏印","傷官","劫財"])];}
 if(L==="A")return c.in_>c.self?TR("生まれた日に、まわりから支えてもらう力が強く出ています。安心できる土台があるので、自分の判断で進める人。"):TR("生まれた日に、自分を支える力が強く出ています。人の評価にゆれにくく、自分の判断で進める人。");
 const off=(c.g["偏官"]||0)+(c.g["正官"]||0),mx=Math.max(c.ex,c.en,off);
 return mx===c.ex?TR("生まれた日に、表現に力を注ぐ星が多く出ています。そのぶん気持ちが動きやすく、細やかに感じ取れる人。"):mx===c.en?TR("生まれた日に、人やモノと関わる星が多く出ています。そのぶんまわりの変化に敏感で、慎重に動ける人。"):TR("生まれた日に、まわりの期待を受け取る星が多く出ています。そのぶん空気をよく読み、慎重に動ける人。");}
function natal(y,m,d){const days=Math.floor(Date.UTC(y,m-1,d)/864e5);const num=(((days+17)%60)+60)%60+1;const s=(num-1)%10,b=(num-1)%12;
 const L=CH[s],i=s%2===0?((b-L)%12+12)%12:((L-b)%12+12)%12,u=ST[i];
 let t=(s%2===0?"E":"I")+(s>=4?"S":"N")+([0,1,4,8,9,11].includes(b)?"T":"F")+G[u];
 let at=null,str={EI:75,SN:75,TF:75,JP:75},strong={},vs={},why={},chart=null;
 try{const c=chartC(y,m,d);chart=c;at=c.strong?"A":"T";const AXK=[["EI","E","I"],["SN","S","N"],["TF","T","F"],["JP","J","P"]];
  t=AXK.map(([k,a,b2])=>{const v=c[k]-MC.med[k]+1e-6,L=v>0?a:b2,half=v>0?(MC.q[k][1]-MC.med[k]):(MC.med[k]-MC.q[k][0]);strong[k]=Math.abs(v)>=half*0.6;vs[k]=Math.abs(v)>=half;str[k]=Math.round(55+40*Math.min(1,Math.abs(v)/(2*half)));why[k]=reasonC(k,L,c);return L;}).join("");
  why.AT=reasonC("AT",at,c);}catch(e){}
 return {num,at,kan:STEMS[s]+BR[b],t,str,strong,vs,why,chart};}
const st={y:1998,m:7,d:15,t:["E","N","F","P"],at:null,pct:null,half:{}};let selAT=null;
const $=id=>document.getElementById(id);
/* 端末に覚えておく（使えない環境では何もしない） */
const KQ="16tp.quiz.v1",KR="16tp.result.v1";
const sget=k=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}};
const sset=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
/* 16Personalities での呼び名（参考表示用） */
/* 16Personalities での呼び名（参考としてカッコで表示） */
const P16={INTJ:TR("建築家"),INTP:TR("論理学者"),ENTJ:TR("指揮官"),ENTP:TR("討論者"),INFJ:TR("提唱者"),INFP:TR("仲介者"),ENFJ:TR("主人公"),ENFP:TR("運動家"),ISTJ:TR("管理者"),ISFJ:TR("擁護者"),ESTJ:TR("幹部"),ESFJ:TR("領事"),ISTP:TR("巨匠"),ISFP:TR("冒険家"),ESTP:TR("起業家"),ESFP:TR("エンターテイナー")};
const p16=t=>TR("（")+P16[t]+TR("）");
const an=t=>t+p16(t);
const CHAR_BASE=(typeof window.CHAR_BASE==="string")?window.CHAR_BASE:"chars/";
const charSrc=(t,small)=>CHAR_BASE+t+(small?"_s":"")+".webp";
const T16="INTJ INTP ENTJ ENTP INFJ INFP ENFJ ENFP ISTJ ISFJ ESTJ ESFJ ISTP ISFP ESTP ESFP".split(" ");
(function(){const el=$("parade");if(!el)return;const one=T16.map(t=>'<figure><img src="'+charSrc(t,1)+'" alt="" loading="lazy" width="100" height="100"><figcaption>'+t+'</figcaption></figure>').join("");el.innerHTML=one+one;})();
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function opts(el,a,b,cur,ph){el.innerHTML="";if(ph){const o=document.createElement("option");o.value="";o.textContent=ph;o.selected=cur==null;el.appendChild(o);}const vs=[];for(let v=a;v<=b;v++)vs.push(v);if(el.id==="y")vs.reverse();vs.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;if(v===cur)o.selected=true;el.appendChild(o);});}
/* 生年月日は最初は空。選ぶまで診断に進めない */
const dset={y:false,m:false,d:false};const dateAll=v=>{dset.y=dset.m=dset.d=v;};
function dateOK(){const ok=dset.y&&dset.m&&dset.d,er=$("dateErr");if(er)er.hidden=ok;if(!ok){$("y").closest(".field").scrollIntoView({behavior:"smooth",block:"center"});}return ok;}
function fillDate(){opts($("y"),1930,2020,dset.y?st.y:null,TR("年"));opts($("m"),1,12,dset.m?st.m:null,TR("月"));const mx=dset.y&&dset.m?new Date(st.y,st.m,0).getDate():31;if(st.d>mx)st.d=mx;opts($("d"),1,mx,dset.d?st.d:null,TR("日"));}
["y","m","d"].forEach(id=>$(id).addEventListener("change",e=>{const v=e.target.value;if(v===""){dset[id]=false;}else{st[id]=+v;dset[id]=true;}fillDate();if(dset.y&&dset.m&&dset.d){const er=$("dateErr");if(er)er.hidden=true;render();}}));
const pk=$("picker"),sel=[null,null,null,null];
function drawSlots(popI){$("slots").innerHTML=AX.map((A,i)=>'<span style="--c:var('+A.c+')" class="'+(sel[i]?"fill":"empty")+(i===popI?" pop":"")+'">'+(sel[i]||"?")+'</span>').join("");
 const left=sel.filter(v=>!v).length,go=$("go");const tt=sel.join("");$("slotName").innerHTML=left?"":'<b>'+tt+(selAT?"-"+selAT:"")+'</b>'+p16(tt);{const pf=$("pkFig");if(pf){pf.hidden=!!left;if(!left){$("pkImg").src=charSrc(tt);$("pkImg").alt=an(tt);}}}go.disabled=left>0;go.textContent=left?TR("あと")+left+TR("つ選んでください"):TR("結果を見る");}
AX.forEach((A,i)=>{const g=document.createElement("div");g.className="seg";g.style.setProperty("--c","var("+A.c+")");g.setAttribute("role","group");g.setAttribute("aria-label",A.name);
 [[A.a,A.aw],[A.b,A.bw]].forEach(([l,w])=>{const bt=document.createElement("button");bt.type="button";bt.innerHTML=l+"<small>"+w+"</small>";
  bt.setAttribute("aria-pressed","false");bt.onclick=()=>{sel[i]=l;g.classList.add("done");[...g.children].forEach(c=>c.setAttribute("aria-pressed",c===bt));drawSlots(i);};g.appendChild(bt);});
 pk.appendChild(g);});
drawSlots(-1);
document.querySelectorAll("#atPick button").forEach(bt=>bt.onclick=()=>{selAT=bt.dataset.v||null;document.querySelectorAll("#atPick button").forEach(x=>x.setAttribute("aria-pressed",x===bt));drawSlots(-1);});
$("go").onclick=()=>{if(sel.includes(null))return;st.t=sel.slice();st.at=selAT;st.love=null;st.pct=null;st.half={};st.sway=null;showResult();logType("select");render();document.querySelector(".hero").scrollIntoView({behavior:"smooth"});};
/* ---- 60問 ---- */
const SCALE=[[TR("とても当てはまる"),5,22],[TR("当てはまる"),4,18],[TR("やや当てはまる"),3,14],[TR("やや当てはまらない"),2,14],[TR("当てはまらない"),1,18],[TR("まったく当てはまらない"),0,22]];
const AXN={EI:0,SN:1,TF:2,JP:3,AT:4};const AXQ=AX.concat([{k:"AT",a:"A",b:"T",c:"--rose",name:TR("心の構え"),sh:TR("構え")}]);
let qa=[],qi=0,tbList=[],tbAns={},ord=[],ext=false;
/* 質問の数は人によって変わる：まず各指標6問（計30問）。答えが真ん中に近い指標だけ、残りの6問を追加する */
const BASE=30,EXT_T=12;
const baseOrd=()=>QZ.Q.map((_,i)=>i).slice(0,BASE);
function setPicker(){st.t.forEach((v,i)=>sel[i]=v);[...pk.children].forEach((g,i)=>{g.classList.add("done");[...g.children].forEach(c=>c.setAttribute("aria-pressed",c.firstChild.textContent===st.t[i]));});drawSlots(-1);}
let shown=false;
function saveResult(){if(!shown)return;sset(KR,{y:st.y,m:st.m,d:st.d,t:st.t,at:st.at,pct:st.pct,half:st.half,sway:st.sway,love:st.love||null});}
function showResult(){shown=true;$("result").style.display="contents";setTimeout(showInvitePair,0);}
function showQuiz(on){$("quizCard").hidden=!on;$("formCard").hidden=on;$("result").style.display=(!on&&shown)?"contents":"none";}
$("hasType").onclick=()=>{if(!dateOK())return;$("hasType").setAttribute("aria-pressed","true");$("pickField").hidden=false;$("pickField").scrollIntoView({behavior:"smooth",block:"nearest"});};
function startQuiz(saved){if(saved){qa=saved.qa;qi=saved.qi;tbList=saved.tbList||[];tbAns=saved.tbAns||{};ord=saved.ord;ext=!!saved.ext;}else{qa=new Array(QZ.Q.length).fill(null);qi=0;tbList=[];tbAns={};ord=baseOrd();ext=false;sset(KQ,null);}
 showQuiz(true);drawQ();$("quizCard").scrollIntoView({behavior:"smooth",block:"start"});}
function saveQuiz(){sset(KQ,{v:2,n:QZ.Q.length,qa,qi,tbList,tbAns,ord,ext,y:st.y,m:st.m,d:st.d});}
function savedQuiz(){const q=sget(KQ);return q&&q.v===2&&q.n===QZ.Q.length&&Array.isArray(q.qa)&&Array.isArray(q.ord)&&q.qi>0&&q.qi<q.ord.length+(q.tbList||[]).length?q:null;}
function drawResume(){let r=$("qResume");const q=savedQuiz();
 if(!q){if(r)r.hidden=true;return;}
 if(!r){r=document.createElement("button");r.type="button";r.id="qResume";r.className="btn resume";document.querySelector("#formCard .fork").after(r);
  r.onclick=()=>{const q2=savedQuiz();if(!q2)return;st.y=q2.y||st.y;st.m=q2.m||st.m;st.d=q2.d||st.d;dateAll(true);fillDate();startQuiz(q2);};}
 r.hidden=false;r.innerHTML=TR("前回の続きから再開する")+"<small>"+TR("{n}問目から").replace("{n}",q.qi+1)+"</small>";}
$("quiz").onclick=()=>{if(!dateOK())return;startQuiz(null);};if($("startBtn"))$("startBtn").onclick=e=>{e.preventDefault();$("formCard").scrollIntoView({behavior:"smooth",block:"start"});};
if($("recheckBtn"))$("recheckBtn").onclick=()=>{startQuiz(null);$("quizCard").scrollIntoView({behavior:"smooth"});};
$("qQuit").onclick=()=>{showQuiz(false);drawResume();};
$("qBack").onclick=()=>{if(qi>0){qi--;saveQuiz();drawQ();}else{showQuiz(false);drawResume();}};
function scoreAll(){const sc={EI:[0,0],SN:[0,0],TF:[0,0],JP:[0,0],AT:[0,0]};
 QZ.Q.forEach((q,i)=>{const v=qa[i];if(v==null)return;const A=AXQ[AXN[q.ax]];if(q.p===A.a){sc[q.ax][0]+=v;sc[q.ax][1]+=5-v;}else{sc[q.ax][1]+=v;sc[q.ax][0]+=5-v;}});
 Object.keys(tbAns).forEach(k=>{const A=AXQ[AXN[k]];if(tbAns[k]===A.a)sc[k][0]+=3;else sc[k][1]+=3;});return sc;}
function drawQ(){const total=ord.length+tbList.length;const left=Math.max(0,total-qi-1);$("qCount").innerHTML=Math.min(qi+1,total)+" / "+total+(ext||qi>=BASE?"":TR("〜60"))+(!(ext||qi>=BASE)?'':left?'<span class="qleft">'+TR("あと{n}問").replace("{n}",left)+'</span>':'<span class="qleft">'+TR("最後の質問です")+'</span>');
 $("qProg").style.width=(qi/total*100)+"%";$("qNote").hidden=qi>0;
 let ch=$("qCheer");if(!ch){ch=document.createElement("p");ch.id="qCheer";ch.className="qcheer";$("qAxis").before(ch);}
 const add=ord.length-BASE;
 const CH=qi>=7&&qi<9?TR("いい調子です。直感で答えてくださいね。"):qi>=15&&qi<18?TR("半分まで来ました。途中で閉じても、続きから再開できます。"):qi>=24&&qi<27&&!ext?TR("もう少しで基本の30問が終わります。"):qi>=BASE&&qi<BASE+3&&add>0?TR("基本の30問が終わりました。答えが真ん中に近かった指標だけ、あと{n}問たしかめます。").replace("{n}",add):qi>=BASE+3&&left>0&&left<=5?TR("ラストスパート！あと{n}問です。").replace("{n}",left):"";
 ch.hidden=!CH;ch.textContent=CH;
 const o=$("qOpts");o.innerHTML="";
 if(qi<ord.length){const qn=ord[qi],q=QZ.Q[qn],A=AXQ[AXN[q.ax]];
  $("qAxis").textContent=A.name;$("qAxis").style.color="var("+A.c+")";$("qText").textContent=q.q;$("qEx").textContent=q.ex;$("qExW").hidden=false;$("qExW").open=false;
  SCALE.forEach(([t,v,sz])=>{const bt=document.createElement("button");bt.type="button";bt.style.setProperty("--qc","var("+A.c+")");
   bt.innerHTML='<i style="width:'+sz+'px;height:'+sz+'px"></i>'+t;bt.setAttribute("aria-pressed",qa[qn]===v);
   bt.onclick=()=>{qa[qn]=v;bt.setAttribute("aria-pressed","true");setTimeout(next,180);};o.appendChild(bt);});
 }else{const k=tbList[qi-ord.length],T=QZ.TB[k],A=AXQ[AXN[k]];
  $("qAxis").textContent=A.name+TR("：あと少しで決まります");$("qAxis").style.color="var("+A.c+")";$("qText").textContent=T.q;$("qExW").hidden=true;
  [T.a,T.b].forEach(([t,p])=>{const bt=document.createElement("button");bt.type="button";bt.className="ab";bt.textContent=t;bt.setAttribute("aria-pressed",tbAns[k]===p);
   bt.onclick=()=>{tbAns[k]=p;setTimeout(next,180);};o.appendChild(bt);});}}
function next(){qi++;
 if(qi===BASE&&!ext){ext=true;const sc=scoreAll(),close=Object.keys(sc).filter(k=>Math.abs(sc[k][0]-sc[k][1])<=EXT_T);
  QZ.Q.forEach((q,i)=>{if(i>=BASE&&close.includes(q.ax))ord.push(i);});}
 if(qi===ord.length&&tbList.length===0){const sc=scoreAll();tbList=Object.keys(sc).filter(k=>Math.abs(sc[k][0]-sc[k][1])<=6&&QZ.TB[k]);}
 if(qi>=ord.length+tbList.length){finish();return;}saveQuiz();drawQ();}
function swayOf(){/* 揺れやすさ：同じ指標を、向きを変えた質問どうしで答えが食い違っていないか */
 const sw={};AXQ.forEach(A=>{const a=[],b=[];QZ.Q.forEach((q,i)=>{if(q.ax!==A.k||qa[i]==null)return;(q.p===A.a?a:b).push(qa[i]);});
  const av=x=>x.length?x.reduce((s,v)=>s+v,0)/x.length:2.5;sw[A.k]=Math.abs(av(a)-av(b))<1.5;});return sw;}
function logType(src){try{const m=window.__me||{};if(!m.born||!m.now||typeof gtag!=="function")return;
 const p={source:src,born_type:m.born,now_type:m.now,same:m.born===m.now?"yes":"no",lang:LANG};
 if(st.pct)["EI","SN","TF","JP"].forEach(k=>{if(st.pct[k]!=null)p["pct_"+k]=st.pct[k];});
 gtag("event","type_result",p);}catch(e){}}
function finish(){sset(KQ,null);st.love=null;drawResume();const sc=scoreAll();st.pct={};st.half={};st.sway=swayOf();
 AX.forEach((A,i)=>{const[a,b]=sc[A.k],tot=a+b||1;st.t[i]=a>b?A.a:a<b?A.b:natal(st.y,st.m,st.d).t[i];st.pct[A.k]=Math.round(b/tot*100);st.half[A.k]=Math.abs(a-b)<=4||tbAns[A.k]!=null;});
 {const [a,b]=sc.AT;st.at=a>b?"A":a<b?"T":null;}setPicker();showResult();logType("quiz");showQuiz(false);render();document.querySelector(".hero").scrollIntoView({behavior:"smooth"});}
/* ---- 1列ずつめくって比べる ---- */
const AXW={EI:[TR("外向型"),TR("内向型")],SN:[TR("現実型"),TR("直感型")],TF:[TR("思考型"),TR("感情型")],JP:[TR("計画型"),TR("柔軟型")],AT:[TR("自己主張型"),TR("慎重型")]};
let RV=null;
function setupReveal(N,born,now,bAT,nAT,diff,atDiff,why,aligned,instant){
 const fl=$("flip"),bt=[...fl.querySelectorAll(".tile.b")],nt=[...fl.querySelectorAll(".tile.n")],ar=[...fl.querySelectorAll(".arw")];
 const cols=["EI","SN","TF","JP","AT"],colors=["--ei","--sn","--tf","--jp","--rose"],names=[TR("エネルギー"),TR("ものの見方"),TR("判断のしかた"),TR("行動のしかた"),TR("心の構え")];
 RV={opened:new Set(),story:$("rStory").innerHTML};
 [...bt,...nt].forEach(t=>t.classList.add("hid"));ar.forEach(a=>a.classList.add("hid"));
 /* めくる前でも、ほかの内容は止めない（タイルは結果の一番下） */
 $("revs").innerHTML="";$("flipAll").hidden=false;$("flipHint").textContent=TR("上が気質、下が性格");
 const open=i=>{if(RV.opened.has(i))return;RV.opened.add(i);const k=cols[i];
  const spin=(t,after)=>{if(instant){t.classList.remove("hid");after&&after();return;}t.classList.add("spin");setTimeout(()=>{t.classList.remove("spin","hid");t.classList.add("show");after&&after();},620);};
  spin(bt[i]);const shN=()=>spin(nt[i],()=>ar[i].classList.remove("hid"));instant?shN():setTimeout(shN,220);
  const bl=k==="AT"?bAT:born[i],nl=k==="AT"?nAT:now[i],ws=AXW[k],wOf=L=>L===({EI:"E",SN:"S",TF:"T",JP:"J",AT:"A"})[k]?ws[0]:ws[1];
  const d=k==="AT"?atDiff:diff[i];
  const tg=nl==null?TR('<span class="tg same">比べない</span>'):!d?TR('<span class="tg same">そのまま</span>'):TR('<span class="tg gap">ギャップ</span>');
  let q="";if(st.pct&&k!=="AT"&&st.pct[k]!=null){const A=AX[i],sh=nl===A.a?100-st.pct[k]:st.pct[k];
   q='<p class="rvq">'+TR("回答での強さ：")+wOf(nl)+" "+Math.max(50,sh)+"%"+((st.sway&&st.sway[k])||(st.half&&st.half[k])?TR('<span class="half sway">揺れやすい</span>'):'')+'</p>';}
  const div=document.createElement("div");div.className="rv";div.style.setProperty("--c","var("+colors[i]+")");if(instant)div.style.animation="none";
  div.innerHTML='<div class="h"><span class="ax">'+names[i]+'</span><span class="cd">'+bl+'</span><span>'+wOf(bl)+'</span>'+(nl?'<span class="nw">'+TR('<span>→ 性格</span><span class="cd">')+nl+'</span></span>':'')+tg+'</div><p>'+(why[k]||"")+(k!=="AT"&&!aligned[k]&&N.vs&&N.vs[k]?TR("この傾向は、気質としてかなりはっきりしています。"):"")+'</p>'+q;
  $("revs").appendChild(div);
  const left=5-RV.opened.size;
  if(!left){const fin=()=>{$("flipHint").textContent="";$("rStory").innerHTML=RV.story;document.querySelectorAll(".hero .pend").forEach(e=>e.classList.remove("wait"));};instant?fin():setTimeout(fin,1000);}};
 /* 1回タップすると、左から順にくるくる回ってめくれる */
 const runAll=()=>{if(RV.running)return;RV.running=true;$("flipAll").hidden=true;let j=0;cols.forEach((_,i)=>{if(!RV.opened.has(i)){setTimeout(()=>open(i),j*380);j++;}});};
 [...bt,...nt].forEach(t=>t.addEventListener("click",runAll));$("flipAll").onclick=runAll;
 if(instant){$("flipAll").hidden=true;cols.forEach((_,i)=>open(i));};}
/* ---- 人物像 ---- */
function drawPersona(which){const me=window.__me;if(!me||typeof PS==="undefined")return;
 const t=which==="now"?me.now:me.born,at=which==="now"?me.nAT:me.bAT,P=PS[t];
 $("pNow").innerHTML=TR('性格<b>')+me.now+(me.nAT?"-"+me.nAT:"")+'</b>';$("pBorn").innerHTML=TR('気質<b>')+me.born+(me.bAT?"-"+me.bAT:"")+'</b>';
 $("pNow").setAttribute("aria-selected",which==="now");$("pBorn").setAttribute("aria-selected",which!=="now");
 if(!P){$("psCatch").textContent="（"+t+TR("の人物像は準備中です）");["psOv","psRel","psLove","psWork","psGrow","psAT"].forEach(id=>$(id).textContent="");$("psStr").innerHTML=$("psPit").innerHTML=$("psJobs").innerHTML="";return;}
 const li=a=>a.map(x=>{const [h,d]=x.split("｜");return "<li><b>"+h+"</b><span>"+(d||"")+"</span></li>";}).join("");
 {const im=$("psImg");if(im){im.src=charSrc(t);im.alt=an(t);}}$("psCode").innerHTML='<span class="nw">'+t+(at?"-"+at:"")+'</span><span class="nw">'+p16(t)+'</span>';$("psCatch").textContent=P.catch;$("psOv").textContent=P.overview;
 $("psStr").innerHTML=li(P.strengths);$("psPit").innerHTML=li(P.pitfalls);
 $("psAT").innerHTML=at?'<b>'+(at==="A"?TR("自己主張型（A）"):TR("慎重型（T）"))+TR('のあなたは</b>')+P[at]:"";$("psAT").hidden=!at;
 $("aruH").textContent=t+TR(" のあるある");$("aru").innerHTML=(D.ARUARU[t]||[]).map(x=>"<li>"+x+"</li>").join("");
 $("cT").textContent=D.TCOMPAT[t].m;$("cW").textContent=D.TCOMPAT[t].why;
 $("psRel").textContent=P.relationships;$("psLove").textContent=P.love;$("psWork").textContent=P.work;$("psJobs").innerHTML=P.jobs.map(j=>"<li>"+j+"</li>").join("");$("psGrow").textContent=P.growth;}
$("pNow").onclick=()=>drawPersona("now");$("pBorn").onclick=()=>drawPersona("born");
function render(instant){
 const N=natal(st.y,st.m,st.d),now=st.t.join(""),aligned={},why=Object.assign({},N.why);
 /* 生まれつきの星がはっきりしない文字は、今のタイプに合わせる（ギャップは無理に作らない） */
 const born=AX.map((A,i)=>{if(N.strong[A.k]===false){aligned[A.k]=true;const w=AXW[A.k][now[i]===A.a?0:1];why[A.k]=TR("この文字は、生年月日の星がどちらにもはっきり傾いていません。そのため、性格の「")+w+TR("」を、気質としても同じと見ています。");return now[i];}return N.t[i];}).join("");
 $("rSrc").textContent=st.pct?TR("質問への回答から出した結果"):TR("あなたの診断結果");
 const bAT=N.at,nAT=st.at,bornF=born+(bAT?"-"+bAT:""),nowF=now+(nAT?"-"+nAT:"");
 const diff=AX.map((A,i)=>now[i]!==born[i]),atDiff=!!(bAT&&nAT&&bAT!==nAT),dn=diff.filter(Boolean).length+(atDiff?1:0);
 const cp=x=>'<span class="sc">'+TR("（")+x+TR("）")+'</span>';
 $("rStory").innerHTML=born===now?TR('<span class="ln">あなたは、気質も性格も</span><span class="ln"><span class="n">')+nowF+'</span>'+cp(P16[now])+TR('。</span>')+'<span class="ln sub">'+TR("裏も表もない、そのままのあなた。")+'</span>'
   :TR('<span class="ln">あなたは、</span><span class="ln"><span class="b">')+bornF+'</span>'+cp(P16[born])+TR('の気質と、</span><span class="ln"><span class="n">')+nowF+'</span>'+cp(P16[now])+TR('の性格をあわせ持つ人。</span>');
 const ATC="--rose";
 let fh=TR('<span class="rl"><b>気質</b>生年月日から</span>')+AX.map((A,i)=>'<span class="tile b'+(diff[i]?' c':'')+'" style="--c:var('+A.c+')">'+born[i]+'</span>').join("")+'<span class="tile b at'+(atDiff?' c':'')+'" style="--c:var('+ATC+')">'+(bAT||"–")+'</span>';
 fh+='<span class="rl e"></span>'+AX.map((A,i)=>'<span class="arw'+(diff[i]?' c':'')+'" style="--c:var('+A.c+')">'+(diff[i]?'↓':'｜')+'</span>').join("")+'<span class="arw'+(atDiff?' c':'')+'" style="--c:var('+ATC+')">'+(atDiff?'↓':'｜')+'</span>';
 fh+=TR('<span class="rl"><b>性格</b>16タイプから</span>')+AX.map((A,i)=>'<span class="tile n'+(diff[i]?' c':'')+'" style="--c:var('+A.c+');--i:'+i+'">'+now[i]+'</span>').join("")+'<span class="tile n at'+(atDiff?' c':'')+(nAT?'':' none')+'" style="--c:var('+ATC+');--i:4">'+(nAT||"?")+'</span>';
 fh+='<span class="rl e"></span>'+AX.map(A=>'<span class="axl">'+A.sh+'</span>').join("")+TR('<span class="axl">構え</span>');
 $("flip").innerHTML=fh;
 setupReveal(N,born,now,bAT,nAT,diff,atDiff,why,aligned,true);
 const ch1=AX.filter((A,i)=>diff[i]).map(A=>'<span class="nw">'+A.name+'</span>').concat(atDiff?[TR('<span class="nw">心の構え</span>')]:[]);
 const tot=nAT?5:4;
 $("rSum").innerHTML=(dn===0?tot+TR('文字すべて、<b>気質と性格が同じ</b>です。'):TR('気質と性格がちがうのは <b>')+dn+TR('文字</b>')+(dn<tot?'<br>'+ch1.join(TR("・")):TR('（すべて）')))+(nAT?'':TR('<br><small class="atnote">最後の1文字（A/T）は、選んだ人だけ比べます</small>'));
 const C=(typeof COMBO!=="undefined"&&COMBO[born+">"+now])||{name:TR("（文章を準備中）"),atari:["",""],karai:""};
 const strip=t=>t.replace(/\[\[(今|本):(.*?)\]\]/g,"$2");
 const HB=HN.type[born],HW=HN.type[now];
 $("hBornT").textContent=born;$("hNowT").textContent=now;$("hWant").textContent=HB.want;$("hEffort").textContent=HW.effort;
 const gk=AX.map((A,i)=>born[i]!==now[i]?born[i]+now[i]:null).filter(Boolean).concat(atDiff?[bAT+nAT]:[]);
 const colOf={E:"--ei",I:"--ei",S:"--sn",N:"--sn",T:"--tf",F:"--tf",J:"--jp",P:"--jp",A:"--rose"};const cOfG=k=>(k==="AT"||k==="TA")?"--rose":colOf[k[0]];
 if(gk.length){$("hWorryQ").hidden=false;
  const tintOf={E:"--tint-ei",I:"--tint-ei",S:"--tint-sn",N:"--tint-sn",T:"--tint-tf",F:"--tint-tf",J:"--tint-jp",P:"--tint-jp"};
  const isAT=k=>k==="AT"||k==="TA",cOf=k=>isAT(k)?"--rose":colOf[k[0]],tOf=k=>isAT(k)?"--tint-at":tintOf[k[0]];
  const wl=g=>'<ul class="wl">'+[].concat(g.worry).map(w=>'<li>'+w+'</li>').join("")+'</ul><p class="key"><b>'+TR("楽になるヒント")+'</b>'+g.key+'</p>';
  const wi=k=>{const g=HN.gap[k];return '<div class="it" style="--c:var('+cOf(k)+');--t:var('+tOf(k)+')"><div class="gc"><div class="gtiles"><span class="gtl"><span class="gt b">'+k[0]+'</span><b>'+g.from+'</b></span><span class="gar">→</span><span class="gtl"><span class="gt n">'+k[1]+'</span><b>'+g.to+'</b></span></div>'
   +'<div class="gtx"><small>'+g.axis+TR('</small><span class="row"><i>気質</i>')+(isAT(k)?HN.letter['AT_'+k[0]]:HN.letter[k[0]])+TR('</span><span class="row n"><i>性格</i>')+(isAT(k)?HN.letter['AT_'+k[1]]:HN.letter[k[1]])+'</span></div></div>'
   +wl(g)+'</div>';};
  $("hWorry").innerHTML=gk.slice(0,1).map(wi).join("")+(gk.length>1?TR('<details class="hmore"><summary>ほかの悩みのヒントも見る（')+(gk.length-1)+TR('つ）</summary><div class="hw">')+gk.slice(1).map(wi).join("")+'</div></details>':"");
  $("hWork").innerHTML=gk.slice(0,2).map(k=>'<div class="it wk" style="--c:var('+cOf(k)+')"><span class="ax">'+HN.gap[k].axis+'</span><p>'+HN.gap[k].work+'</p></div>').join("");
 }else{$("hWorryQ").hidden=false;$("hWorry").innerHTML='<div class="it">'+'<ul class="wl">'+[].concat(HN.same.worry).map(w=>'<li>'+w+'</li>').join("")+'</ul><p class="key"><b>'+TR("楽になるヒント")+'</b>'+HN.same.key+'</p></div>';$("hWork").innerHTML='<div class="it"><p>'+HN.same.work+'</p></div>';}
 $("hJobW").textContent=HB.work;$("hJobs").innerHTML=HB.jobs.map(t=>"<li>"+t+"</li>").join("");
 {const gx=$("gapX");if(gx){const oneG=!gk.length;gx.innerHTML=oneG?'<div class="gx"><p>'+HN.same.both+'</p></div>':gk.map(k=>{const g=HN.gap[k];return '<div class="gx" style="--c:var('+cOfG(k)+')"><p class="gxh"><span class="ax">'+g.axis+'</span><span class="nw"><b>'+k[0]+'</b>'+g.from+TR(" ＋ ")+'<b>'+k[1]+'</b>'+g.to+'</span></p><p>'+g.both+'</p></div>';}).join("");}
  window.__worry=gk.length?[].concat(HN.gap[gk[0]].worry)[0]:[].concat(HN.same.worry)[0];}
 window.__me={born,now,N,bAT,nAT};drawPersona("now");
 const nw=(a,b)=>'<span class="nw">'+a+'</span><span class="nw">'+b+'</span>';$("p16Born").innerHTML=nw(bornF,p16(born));$("p16Now").innerHTML=nw(nowF,p16(now));
 $("nkBorn").textContent=D.NICK[born];[["imBorn",born],["imNow",now]].forEach(([id,t])=>{const im=$(id);if(im){im.src=charSrc(t);im.alt=an(t);}});
 {const one=born===now,nb=$("imBorn").closest(".nk"),nn=$("imNow").closest(".nk"),nr=document.querySelector(".nicks .nar");nb.hidden=one;if(nr)nr.hidden=one;document.querySelector(".nicks").classList.toggle("one",one);
  const lb=nn.querySelector(".nl");if(!lb.dataset.def)lb.dataset.def=lb.textContent;lb.textContent=one?TR("気質も性格も"):lb.dataset.def;
  if(one)$("p16Now").innerHTML=$("p16Born").innerHTML;}$("nkNow").textContent=D.NICK[now];setupCards(instant,born===now);
 const pct=Math.round(dn/tot*100),lv=dn===0?0:Math.min(4,Math.ceil(dn/tot*4));window.__me.pct=pct;
 $("gNum").textContent=pct;$("gBar").style.width=pct+"%";$("gMeter").setAttribute("aria-label",TR("気質と性格のちがい ")+pct+"%");
 $("gLbl").textContent=[TR("気質と性格が同じ"),TR("少しちがう"),TR("ほどよくちがう"),TR("かなりちがう"),TR("ほとんどちがう")][lv];
 window.__me.karai=window.__worry||"";{const rc=$("recheck");if(rc)rc.hidden=!!st.pct;}
 {const fig=$("cloudFig");if(fig){const tk=(window.__cloudTok=(window.__cloudTok||0)+1);setTimeout(()=>drawCloud().then(cv=>{if(tk!==window.__cloudTok)return;const x=cv.getContext("2d"),W=cv.width,H=cv.height,d=x.getImageData(0,0,W,H-90).data;let t=0,b=H-91;const blank=y=>{for(let i=y*W*4;i<(y+1)*W*4;i+=16)if(d[i]<235)return false;return true;};while(t<b&&blank(t))t++;while(b>t&&blank(b))b--;t=Math.max(0,t-50);b=Math.min(H-91,b+50);const o2=document.createElement("canvas");o2.width=W;o2.height=b-t;o2.getContext("2d").drawImage(cv,0,t,W,b-t,0,0,W,b-t);$("cloudImg").src=o2.toDataURL("image/png");$("cloudImg").alt=TR("わたしの気質と性格");fig.hidden=false;}).catch(()=>{}),0);}}
 {const kf=$("karteFig");if(kf){const tk=(window.__karteTok=(window.__karteTok||0)+1);setTimeout(()=>drawKarte().then(cv=>{if(tk!==window.__karteTok)return;$("karteImg").src=cv.toDataURL("image/png");$("karteImg").alt=TR("性格カルテ");kf.hidden=false;}).catch(()=>{}),0);}}
 {const K=KT[born+">"+now],el=$("kt");window.__me.kt=K||null;["hWorryH","hWorryQ","hWorry"].forEach(i=>{const x=$(i);if(x)x.style.display=(K&&K.aru)?"none":"";});if(el){el.hidden=!K;const box=(id,cls)=>{let x=$(id);if(!x){x=document.createElement("div");x.id=id;x.className=cls;document.querySelector(".hero").appendChild(x);}return x;};box("coreBox","corebox").innerHTML=K?coreCard(born,now):"";box("funBox","funbox").innerHTML=K?'<dl class="ktl"><dt>'+TR("言いそうなこと")+'</dt><dd class="say">'+esc(K.say)+'</dd><dt>'+TR("やりそうなこと")+'</dt><dd>'+esc(K.do)+'</dd></dl><div class="ktk"><span>'+TR("辛口のひと言")+'</span>'+esc(K.karai)+'</div>':"";
 if(K)el.innerHTML='<h3 class="kth">'+TR("くわしい鑑定")+'</h3>'+(K.aru?[["aru","こんなこと、ありませんか？"],["why","どうしてそうなるの？"],["yure","16タイプの結果が変わるわけ"],["plus","悩みを、こう見てみる"],["hidden","あなたの、もう一つの力"],["tip","生かすヒント"]].filter(([f])=>K[f]).map(([f,h])=>'<div class="kts kt-'+f+'"><h4><i aria-hidden="true">'+({aru:"?",why:"!",yure:"⇄",plus:"+",hidden:"✦",tip:"✓"})[f]+'</i>'+TR(h)+'</h4>'+kfmt(K[f],f)+(f==="yure"?swayNote(born,now):'')+'</div>').join(""):'<p class="ktb">'+esc(K.body)+'</p>')+(K.aru?'':'<dl class="ktl"><dt>'+TR("悩みやすいこと")+'</dt><dd>'+esc(K.worry)+'</dd></dl>');}}window.__me.karaiC=strip(C.karai||"");drawBalance(N);lvInit();saveResult();layoutResult();
}
/* ---- 相性 ---- */
const ps={y:1995,m:4,d:20};
function fillP(){opts($("py"),1930,2020,ps.y);opts($("pm"),1,12,ps.m);const mx=new Date(ps.y,ps.m,0).getDate();if(ps.d>mx)ps.d=mx;opts($("pd"),1,mx,ps.d);}
["py","pm","pd"].forEach(id=>$(id).addEventListener("change",e=>{ps[id.slice(1)]=+e.target.value;fillP();}));
Object.keys(D.NICK).forEach(t=>{const o=document.createElement("option");o.value=t;o.textContent=t+p16(t);$("pt").appendChild(o);});
function same(a,b){let n=0;for(let i=0;i<4;i++)if(a[i]===b[i])n++;return n;}
const TIER=[[TR("正反対の刺激コンビ"),TR("お互いにないものを持っている2人。組めば最強、ぶつかれば大波乱。")],[TR("別ルートの発見コンビ"),TR("考え方は別ルート。だからこそ話すたびに発見がある。")],[TR("ほどよいバランス型"),TR("半分同じで、半分ちがう。ほどよい距離で長く続く。")],[TR("似た者同士の安心ペア"),TR("感覚がよく似ていて、無理せず自然体でいられる。")],[TR("鏡みたいな2人"),TR("長所も弱点もそっくり。いちばんの理解者になれる。")]];
/* P = {born, num, now(任意), who} */
function pairHTML(P){const me=window.__me,sb=same(me.born,P.born),tb=TIER[sb];
 let html='<div class="phead"><div><small>'+esc(P.who)+TR('の気質</small><span class="t">')+P.born+'</span><small>'+(P16[P.born]||"")+(P.now?TR('（性格は ')+P.now+TR('）'):'')+'</small></div></div>';
 html+=TR('<div class="mx"><div><span class="l">気質の相性</span><div class="v">')+tb[0]+'</div></div>';
 if(P.now){const sn=same(me.now,P.now),tn=TIER[sn];html+=TR('<div><span class="l">性格の相性</span><div class="v">')+tn[0]+'</div></div></div>';
  const hiB=sb>=2,hiN=sn>=2;
  const V=hiB&&hiN?[TR("どこから見ても相性のいい2人"),TR("性格も気質も、自然と波長が合う。一緒にいて疲れない相手。")]
   :hiB&&!hiN?[TR("性格はすれ違って見えても、気質は似た者同士"),TR("性格どうしは噛み合わない場面があっても、気質ではわかり合える。時間をかけるほど仲良くなる。")]
   :!hiB&&hiN?[TR("性格は気が合う。でも気質は別ルート"),TR("性格どうしは話が合うけれど、気質は考え方が違う。大事な決断のときに差が出やすいので、本音を話す時間を。")]
   :[TR("正反対だからこそ、組めば最強"),TR("性格も気質も違うからこそ、お互いの足りないところを埋め合える。ぶつかったら、違いを面白がって。")];
  html+='<p class="verdict"><b>'+V[0]+'</b>'+V[1]+'</p>';}
 else html+=TR('<div><span class="l">性格の相性</span><div class="v" style="color:var(--muted);font-weight:500">16タイプを入れると出ます</div></div></div><p class="verdict">')+tb[1]+'</p>';
 return html;}
$("pGo").onclick=()=>{const N=natal(ps.y,ps.m,ps.d);$("pRes").innerHTML=pairHTML({born:N.t,num:N.num,now:$("pt").value||null,who:TR("あの人")});$("pRes").hidden=false;};

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
 const msg=(nm?nm+TR("から"):"")+TR("相性診断が届いたよ。気質と性格の両方から、2人の相性がわかる👇")+"\n"+u;
 $("lnk").value=u;$("lnkLine").href="https://line.me/R/msg/text/?"+encodeURIComponent(msg);$("lnkBox").hidden=false;window.__msg=msg;};
/* スマホでは、長いURLを見せずに共有メニュー（LINEなど）を開く */
$("lnkLine").onclick=e=>{if(navigator.share&&window.__msg){e.preventDefault();navigator.share({text:window.__msg}).catch(()=>{});}};
$("cpLink").onclick=()=>{const t=$("lnk");const done=()=>{$("cpLink").textContent=TR("コピーしました");setTimeout(()=>$("cpLink").textContent=TR("リンクをコピー"),1600);};
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(window.__msg||t.value).then(done).catch(()=>{t.select();});}else t.select();};
if(INV){$("invBar").hidden=false;$("invWho").textContent=INV.who;$("invPair").textContent=INV.bornF+" → "+INV.nowF;

 $("partnerH").textContent=INV.who+TR("との相性");}
function showInvitePair(){if(!INV)return;$("pRes").innerHTML=pairHTML(INV);$("pRes").hidden=false;$("pForm").hidden=true;}
fillP();

/* ---- 結果を画像でシェア ---- */
const SHARE_URL="https://16typeplus.jp/"+(LANG==="ja"?"":LANG+"/");
const SC={ei:"#3E7FA6",sn:"#C29A3A",tf:"#3F9A72",jp:"#7A5EA8",plus:"#C2553F",rose:"#C9607A",ink:"#1F2733",muted:"#5E6A7A",rule:"#E2E6EC",bg:"#F6F7F9",soft:"#EEF1F5",paper:"#F8F3EA",card:"#FFFFFF"};
function wrapLines(ctx,text,maxW,maxLines){
 const units=LANG==="ja"&&typeof BX!=="undefined"?BX.seg(text.replace(/​/g,"")).split("​"):text.split(/(?<=\s)/);
 const lines=[];let cur="";
 const push=u=>{if(ctx.measureText(cur+u).width<=maxW||!cur){if(ctx.measureText(u).width>maxW&&!cur){for(const ch of u){if(ctx.measureText(cur+ch).width>maxW){lines.push(cur);cur="";}cur+=ch;}}else cur+=u;}else{lines.push(cur.trimEnd());cur=u.trimStart();}};
 units.forEach(push);if(cur)lines.push(cur);
 if(lines.length>maxLines){lines.length=maxLines;let l=lines[maxLines-1];while(l&&ctx.measureText(l+"…").width>maxW)l=l.slice(0,-1);lines[maxLines-1]=l+"…";}
 return lines;}
function rrect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function loadImg(src){return new Promise(r=>{const i=new Image();i.crossOrigin="anonymous";i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});}
async function drawShare(){
 const me=window.__me,W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;const ctx=cv.getContext("2d");
 const SANS=(LANG==="ko"?'"Noto Sans KR",':'')+'"IBM Plex Sans JP","Hiragino Sans","Noto Sans JP",sans-serif',ROUND=(LANG==="ko"?'"Noto Sans KR",':'')+'"IBM Plex Sans JP","Hiragino Sans","Noto Sans JP",sans-serif',MONO='"IBM Plex Mono",ui-monospace,Menlo,monospace';
 try{await Promise.all(["700 40px "+SANS,"500 40px "+SANS,"700 40px "+ROUND,"600 40px "+MONO].map(f=>document.fonts.load(f,"16TYPE+ あア가A")));}catch(e){}
 const one=me.born===me.now,[ib,inw]=await Promise.all([loadImg(charSrc(me.born)),one?Promise.resolve(null):loadImg(charSrc(me.now))]);
 ctx.fillStyle=SC.bg;ctx.fillRect(0,0,W,H);
 ctx.fillStyle=SC.card;rrect(ctx,48,48,W-96,H-96,36);ctx.fill();ctx.strokeStyle=SC.rule;ctx.lineWidth=2;ctx.stroke();
 ctx.textBaseline="alphabetic";ctx.textAlign="left";
 ctx.font="600 54px "+MONO;ctx.fillStyle=SC.ink;ctx.fillText("16TYPE",104,150);const lw=ctx.measureText("16TYPE").width;ctx.fillStyle=SC.plus;ctx.fillText("+",104+lw,150);
 ctx.font="500 26px "+SANS;ctx.fillStyle=SC.muted;ctx.textAlign="right";ctx.fillText(TR("わたしの気質と性格"),W-104,146);ctx.textAlign="left";
 const cols=[SC.ei,SC.sn,SC.tf,SC.jp],pw=one?470:430,ph=pw,py=196;
 const xs=one?[(W-pw)/2]:[W/2-pw-36,W/2+36];
 const items=one?[[me.born,ib,TR("気質も性格も"),me.bAT||me.nAT]]:[[me.born,ib,TR("気質"),me.bAT],[me.now,inw,TR("性格"),me.nAT]];
 items.forEach(([t,img,lab,at],k)=>{const x=xs[k];
  ctx.save();rrect(ctx,x,py,pw,ph,28);ctx.clip();ctx.fillStyle=SC.paper;ctx.fillRect(x,py,pw,ph);if(img)ctx.drawImage(img,x,py,pw,ph);ctx.restore();
  ctx.strokeStyle=SC.rule;ctx.lineWidth=2;rrect(ctx,x,py,pw,ph,28);ctx.stroke();
  ctx.font="700 24px "+ROUND;const lbw=ctx.measureText(lab).width+36;ctx.fillStyle=k===1||one?SC.plus:SC.ink;rrect(ctx,x+16,py+16,lbw,44,22);ctx.fill();ctx.fillStyle="#fff";ctx.fillText(lab,x+34,py+47);
  ctx.textAlign="center";ctx.font="600 76px "+MONO;const code=t.split("");let tw=ctx.measureText(t).width,cx=x+pw/2-tw/2;
  code.forEach((ch,i)=>{const changed=!one&&k===1&&me.born[i]!==ch;ctx.fillStyle=changed?cols[i]:SC.ink;ctx.textAlign="left";ctx.fillText(ch,cx,py+ph+84);cx+=ctx.measureText(ch).width;});
  if(at){ctx.font="600 40px "+MONO;ctx.fillStyle=SC.muted;ctx.fillText("-"+at,cx+4,py+ph+84);}
  ctx.textAlign="center";ctx.font="500 26px "+SANS;ctx.fillStyle=SC.muted;ctx.fillText(p16(t),x+pw/2,py+ph+126);ctx.textAlign="left";});
 if(!one){ctx.font="700 56px "+SANS;ctx.fillStyle=SC.plus;ctx.textAlign="center";ctx.fillText("→",W/2,py+ph/2+18);ctx.textAlign="left";}
 const x0=104;let y=py+ph+200;
 ctx.font="700 32px "+ROUND;ctx.fillStyle=SC.ink;const g=TR("気質と性格のちがい ")+me.pct+"%";ctx.fillText(g,x0,y);
 const gx=x0+ctx.measureText(g).width+28,gw=W-104-gx;ctx.fillStyle=SC.soft;rrect(ctx,gx,y-22,gw,18,9);ctx.fill();if(me.pct>0){ctx.fillStyle=SC.plus;rrect(ctx,gx,y-22,Math.max(18,gw*me.pct/100),18,9);ctx.fill();}
 y+=36;const kx=x0,kw=W-2*x0,room=H-196-y;let fs=36,kl,lh,kh;
 for(;fs>=24;fs-=2){ctx.font="700 "+fs+"px "+SANS;lh=Math.round(fs*1.5);kl=wrapLines(ctx,me.karai||"",kw-72,6);kh=kl.length*lh+78+lh*0.4;if(kh<=room)break;}
 ctx.fillStyle=SC.soft;rrect(ctx,kx,y,kw,kh,24);ctx.fill();ctx.fillStyle=SC.plus;ctx.font="700 24px "+ROUND;ctx.fillText(TR("こんなことで悩んでいませんか？"),kx+36,y+48);
 ctx.fillStyle=SC.ink;ctx.font="700 "+fs+"px "+SANS;kl.forEach((l,i)=>ctx.fillText(l,kx+36,y+60+lh*0.9+i*lh));
 ctx.textAlign="center";ctx.font="500 28px "+SANS;ctx.fillStyle=SC.muted;ctx.fillText(TR("あなたの気質と性格も見てみる →"),W/2,H-134);
 ctx.font="600 34px "+MONO;ctx.fillStyle=SC.ink;ctx.fillText(SHARE_URL.replace("https://",""),W/2,H-88);
 return cv;}
function shareText(){const me=window.__me,co=coreOf(me.born,me.now);return (co?TR("わたしは「{n}」タイプでした。").replace("{n}",co.name):"")+(me.born===me.now?TR("気質も性格も ")+an(me.now)+TR("。"):TR("気質は ")+an(me.born)+TR("、性格は ")+an(me.now)+TR("。"))+TR("｜16TYPE+（16タイププラス）");}
function track(ev,extra){try{const m=window.__me||{};if(typeof gtag!=="function")return;gtag("event",ev,Object.assign({born_type:m.born||"",now_type:m.now||"",lang:LANG},extra||{}));}catch(e){}}
async function shareResult(){track("share_click");const b=$("shareBtn"),lbl=b.textContent;b.disabled=true;b.textContent=TR("画像をつくっています…");
 try{const cvs=[await drawShare(),await drawCloud(),await drawKarte()];const blobs=await Promise.all(cvs.map(cv=>new Promise(r=>cv.toBlob(r,"image/png"))));
  const files=blobs.map((bl,i)=>new File([bl],"16typeplus-"+(i+1)+".png",{type:"image/png"}));
  if(navigator.canShare&&navigator.canShare({files})){try{await navigator.share({files,text:shareText()+" "+SHARE_URL});}catch(e){if(e&&e.name!=="AbortError")showShareBox(cvs);}}
  else showShareBox(cvs);}
 catch(e){alert(TR("画像をつくれませんでした。もう一度お試しください。"));}
 finally{b.disabled=false;b.textContent=lbl;}}
function showShareBox(cvs){let box=$("shareBox");
 if(!box){box=document.createElement("div");box.id="shareBox";box.className="sharebox";box.setAttribute("role","dialog");box.setAttribute("aria-modal","true");document.body.appendChild(box);
  box.addEventListener("click",e=>{if(e.target===box)box.hidden=true;});}
 const msg=shareText()+"\n"+SHARE_URL,tw="https://twitter.com/intent/tweet?text="+encodeURIComponent(shareText())+"&url="+encodeURIComponent(SHARE_URL),ln="https://line.me/R/msg/text/?"+encodeURIComponent(msg);
 box.innerHTML='<div class="sbin"><div class="sbline"><button type="button" class="btn primary sbl" id="sbLine">'+TR("画像を共有する")+'</button><p class="fine">'+TR("LINEやインスタなど、ふだん使っているアプリで送れます。画像を保存してから送ることもできます。")+'</p></div>'
  +cvs.map((_,i)=>'<figure class="sbf"><img alt="'+esc(TR("シェア用の画像"))+'"><a class="btn sv" download="16typeplus-'+(i+1)+'.png">'+TR("この画像を保存")+'</a></figure>').join("")
  +'<p class="fine">'+TR("画像を長押し（パソコンは右クリック）でも保存できます。")+'</p><div class="sbacts"><a class="btn tw" target="_blank" rel="noopener">'+TR("Xでシェア")+'</a></div><button type="button" class="qlink">'+TR("閉じる")+'</button></div>';
 const imgs=box.querySelectorAll("img"),svs=box.querySelectorAll(".sv");cvs.forEach((cv,i)=>{const u=cv.toDataURL("image/png");imgs[i].src=u;svs[i].href=u;});
 box.querySelector(".tw").href=tw;box.querySelector(".qlink").onclick=()=>{box.hidden=true;};box.hidden=false;box.querySelector(".sbin").scrollTop=0;
 /* LINE：画像ごと送れる端末は共有メニュー（LINEを選ぶ）、できなければLINEのトーク画面を開く */
 $("sbLine").onclick=async()=>{try{const blobs=await Promise.all(cvs.map(cv=>new Promise(r=>cv.toBlob(r,"image/png"))));const files=blobs.map((bl,i)=>new File([bl],"16typeplus-"+(i+1)+".png",{type:"image/png"}));
   if(navigator.canShare&&navigator.canShare({files})){await navigator.share({files,text:msg});return;}}catch(e){if(e&&e.name==="AbortError")return;}
  if(LANG==="ja")window.open(ln,"_blank","noopener");else{const f=box.querySelector(".sbf");if(f)f.scrollIntoView({behavior:"smooth"});}};
 /* プレビュー（claude.ai）では、保存は見る人の確認を通して行う */
 if(window.claude&&claude.use)claude.use("downloads").then(dl=>{if(!dl)return;svs.forEach((a,i)=>a.onclick=e=>{e.preventDefault();cvs[i].toBlob(bl=>{dl.save({filename:"16typeplus-"+(i+1)+".png",data:bl}).catch(()=>{});},"image/png");});}).catch(()=>{});}
/* 気質と性格の言葉（甘い→恋愛→あるある→辛口の順） */
function cwList(t){const K=CW[t];if(K)return [...(K.sweet||[]).slice(0,4),...(K.love||[]).slice(0,4),...(K.mild||[]).slice(0,3),...(K.spicy||[]).slice(0,4)];
 const P=PS[t]||{};return [...(P.strengths||[]).map(x=>x.split("｜")[0]),...(D.ARUARU[t]||[]),...(P.pitfalls||[]).map(x=>x.split("｜")[0])].slice(0,15);}
function cwColors(b,n){const GC={NT:SC.jp,NF:SC.tf,SJ:SC.ei,SP:SC.sn},grp=t=>t[1]==="N"?"N"+t[2]:"S"+t[3];const cb=GC[grp(b)];return [cb,b===n?cb:(grp(b)===grp(n)?SC.ink:GC[grp(n)])];}
function cwFonts(){const SANS=(LANG==="ko"?'"Noto Sans KR",':'')+'"IBM Plex Sans JP","Hiragino Sans","Noto Sans JP",sans-serif',MONO='"IBM Plex Mono",ui-monospace,Menlo,monospace';
 return Promise.all(["700 40px "+SANS,"500 40px "+SANS,"600 40px "+MONO].map(f=>document.fonts.load(f,"あア가A"))).catch(()=>{}).then(()=>({SANS,MONO}));}
/* 小さくしすぎず、入らないときは2行に折り返して書く */
function fitText(c,SANS,t,x,y,w,fs,min,col,wt){wt=wt||700;c.font=wt+" "+fs+"px "+SANS;while(c.measureText(t).width>w&&fs>min){fs--;c.font=wt+" "+fs+"px "+SANS;}
 c.fillStyle=col;if(c.measureText(t).width<=w){c.fillText(t,x,y);return;}const ls=wrapLines(c,t,w,2);ls.forEach((l,i)=>c.fillText(l,x,y-(ls.length-1)*fs*0.55+i*fs*1.1));}
const rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return "rgba("+(n>>16)+","+((n>>8)&255)+","+(n&255)+","+a+")";};
/* 円の真ん中「ゆるがない芯」：短い言葉を、白い丸枠に赤い太字で */
const CORE={E:"人といて元気になる",I:"ひとりの時間で充電",S:"事実と経験を頼りに",N:"ひらめきと可能性",T:"筋道で決める",F:"気持ちで決める",J:"計画どおり進める",P:"その場に合わせて動く"};
function corePill(c,SANS,t,x,y,w){let fs=25;c.font="700 "+fs+"px "+SANS;while(c.measureText(t).width>w-36&&fs>19){fs--;c.font="700 "+fs+"px "+SANS;}
 const tw=Math.min(w,c.measureText(t).width+36),h=fs+20;rrect(c,x-tw/2,y-h/2,tw,h,h/2);c.fillStyle="#FFFFFF";c.fill();c.lineWidth=2;c.strokeStyle=SC.plus;c.stroke();
 c.fillStyle=SC.plus;c.textBaseline="middle";c.fillText(t,x,y+1);c.textBaseline="alphabetic";}
function coreHead(c,SANS,x,y){c.font="700 26px "+SANS;const t=TR("ゆるがない芯"),tw=c.measureText(t).width+40;rrect(c,x-tw/2,y-22,tw,44,22);c.fillStyle=SC.plus;c.fill();c.fillStyle="#FFFFFF";c.textBaseline="middle";c.fillText(t,x,y+1);c.textBaseline="alphabetic";}
/* ゆるがない芯：名前＋あるある3つ（81通り）。キーは同じ文字ならその文字、違えば「-」 */
function coreKey(b,n){return b.split("").map((L,i)=>L===n[i]?L:"-").join("");}
function coreOf(b,n){return (typeof CR!=="undefined"&&CR[coreKey(b,n)])||null;}
/* 真ん中のブロックを描く。wAt(y)はその高さで使える幅。dryなら高さだけ返す */
function coreBlock(c,SANS,x,y0,wAt,co,dry){let y=y0;const lines=(t,w,fs,wt,max)=>{max=max||2;c.font=(wt||700)+" "+fs+"px "+SANS;let ls=wrapLines(c,t,w,9);while(ls.length>max&&fs>17){fs--;c.font=(wt||700)+" "+fs+"px "+SANS;ls=wrapLines(c,t,w,9);}
  if(ls.length===2&&ls[1].replace(/[、。」）]/g,"").length<=3){for(let k=0.92;k>0.5;k-=0.04){const t2=wrapLines(c,t,w*k,9);if(t2.length===2&&t2[1].length>3){ls=t2;break;}}}return [ls,fs];};
 if(!dry)coreHead(c,SANS,x,y+22);y+=58;
 let w=wAt(y+30)-40,[nl,nf]=lines(co.name,w,36,800,2);if(nl.length>1){c.font="800 30px "+SANS;if(c.measureText(co.name).width<=w){nl=[co.name];nf=30;}}
 if(!dry){c.fillStyle=SC.plus;c.font="800 "+nf+"px "+SANS;nl.forEach((l,i)=>c.fillText(l,x,y+nf+i*nf*1.25));}y+=nl.length*nf*1.25+16;
 co.aru.forEach(t=>{const bw=Math.min(wAt(y+30),wAt(y))-24,[ls,fs]=lines(t,bw-28,23,700,2),h=ls.length*fs*1.4+18;
  if(!dry){rrect(c,x-bw/2,y,bw,h,14);c.fillStyle="#FFFFFF";c.fill();c.lineWidth=2;c.strokeStyle=rgba(SC.plus,.55);c.stroke();c.fillStyle=SC.plus;c.font="700 "+fs+"px "+SANS;ls.forEach((l,i)=>c.fillText(l,x,y+9+fs*1.05+i*fs*1.4));}
  y+=h+10;});
 return y-y0;}
/* 案1：2つの円の重なり（重なったところが、ゆるがない芯） */
async function drawCloud(){const me=window.__me,{SANS,MONO}=await cwFonts(),W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;const c=cv.getContext("2d");
 const b=me.born,n=me.now,one=b===n,[cb,cn]=cwColors(b,n);
 c.fillStyle="#FFFFFF";c.fillRect(0,0,W,H);c.textAlign="center";c.textBaseline="alphabetic";
 const fitF=(t,w,fs,wt)=>{c.font=(wt||700)+" "+fs+"px "+SANS;while(c.measureText(t).width>w&&fs>14){fs--;c.font=(wt||700)+" "+fs+"px "+SANS;}return fs;};
 c.font="500 26px "+SANS;c.fillStyle=SC.muted;c.fillText(one?TR("気質も性格も同じ。2つの円がひとつに重なる人"):TR("2つの性質が重なったところが、あなたのゆるがない芯"),W/2,78);
 c.font="700 46px "+SANS;c.fillStyle=SC.ink;c.fillText(one?b+p16(b):b+"  ＋  "+n,W/2,140);
 const cy=730,ry=520;
 if(one){const R=470;c.beginPath();c.ellipse(W/2,cy,R,ry,0,0,Math.PI*2);c.fillStyle=rgba(cb,.09);c.fill();c.lineWidth=4;c.strokeStyle=rgba(cb,.65);c.stroke();
  c.font="700 28px "+SANS;c.fillStyle=cb;c.fillText(TR("気質 ＝ 性格"),W/2,cy-ry+70);
  /* 真ん中：4つの文字すべてが、ゆるがない芯 */
  const co=coreOf(b,n);let iry=150;
  if(co){const bw=600,hh=coreBlock(c,SANS,W/2,0,()=>bw,co,true)+36;iry=hh/2;const top0=cy-iry;rrect(c,W/2-bw/2-20,top0,bw+40,hh,28);c.fillStyle=rgba(cb,.16);c.fill();c.lineWidth=3;c.strokeStyle=rgba(cb,.8);c.stroke();coreBlock(c,SANS,W/2,top0+18,()=>bw,co,false);}
  else{const irx=300;c.beginPath();c.ellipse(W/2,cy,irx,iry,0,0,Math.PI*2);c.fillStyle=rgba(cb,.16);c.fill();c.lineWidth=3;c.strokeStyle=rgba(cb,.8);c.stroke();
  coreHead(c,SANS,W/2,cy-iry+40);
  b.split("").forEach((L,i)=>{const yy=cy-iry+96+i*50,dy=(yy-cy)/iry,sx=Math.sqrt(Math.max(0,1-dy*dy));corePill(c,SANS,TR(CORE[L]),W/2,yy,Math.min(2*irx-60,2*irx*sx-30));});}
  const ws=cwList(b),room=(ry*2-iry*2-150),nTop=Math.max(3,Math.min(7,Math.floor((cy-iry-14-(cy-ry+100))/40))),nBot=Math.max(3,Math.min(ws.length-nTop,Math.floor((cy+ry-40-(cy+iry+14))/40))),top=ws.slice(0,nTop),bot=ws.slice(nTop,nTop+nBot);
  const col=(arr,y0,y1,big)=>{const st=(y1-y0)/arr.length;arr.forEach((t,i)=>{const dy=y0+st*(i+.5)-cy,sx=Math.sqrt(Math.max(0,1-(dy/ry)**2));fitText(c,SANS,t,W/2,y0+st*(i+.5)+10,2*R*sx-90,big&&i<2?34:28,22,cb);});};
  col(top,cy-ry+100,cy-iry-14,true);col(bot,cy+iry+14,cy+ry-40,false);}
 else{const rx=330,x1=380,x2=700;
  [[x1,cb],[x2,cn]].forEach(([x,col])=>{c.beginPath();c.ellipse(x,cy,rx,ry,0,0,Math.PI*2);c.fillStyle=rgba(col===SC.ink?"#1F2733":col,.07);c.fill();c.lineWidth=4;c.strokeStyle=rgba(col===SC.ink?"#1F2733":col,.6);c.stroke();});
  c.font="700 26px "+SANS;c.fillStyle=cb;c.fillText(TR("気質（生まれ持った）"),x1-60,cy-ry-14);c.fillStyle=cn;c.fillText(TR("性格（経験で育った）"),x2+60,cy-ry-14);
  const side=(ws,col,sg)=>{const N=ws.length,step=Math.min(64,(2*ry-200)/N);ws.forEach((t,i)=>{const dy=-ry+150+i*step+step/2-40,s=Math.sqrt(Math.max(0,1-(dy/ry)**2)),x=W/2+sg*(rx*s);
    const w=(x2-x1)-24;fitF(t,w,i<2?30:24);c.fillStyle=col;c.fillText(t,x-sg*(x2-x1)/2*0+(sg<0?-(x2-x1)/2:(x2-x1)/2)+sg*0,cy+dy);});};
  const sideX=(ws,col,sg)=>{const N=ws.length,step=Math.min(64,(2*ry-220)/N);ws.forEach((t,i)=>{const dy=-ry+170+i*step,s=Math.sqrt(Math.max(0,1-(dy/ry)**2));
    const xl=sg<0?x1-rx*s:x2-rx*s,xr=sg<0?x2-rx*s:x2+rx*s,inner=sg<0?xr:x1+rx*s,from=sg<0?xl:inner,to=sg<0?xr:xr,cx=(from+to)/2,w=Math.max(120,to-from-30);
    fitText(c,SANS,t,cx,cy+dy,w,i<2?30:25,19,col);});};
  sideX(cwList(b),cb,-1);sideX(cwList(n),cn,1);
  /* 重なり：同じ文字の特徴 */
    const lw=(x1+rx)-(x2-rx),co=coreOf(b,n);
  if(co){const lens=y=>{const dy=(y-cy)/ry;return Math.max(160,2*rx*Math.sqrt(Math.max(0,1-dy*dy))-(x2-x1));};let w=lens(cy+200),hh=0;for(let k=0;k<3;k++){hh=coreBlock(c,SANS,W/2,0,()=>w,co,true);w=lens(cy+hh/2+10);}
   coreBlock(c,SANS,W/2,cy-hh/2+10,()=>w,co,false);}
  else{const core=["EI","SN","TF","JP"].map((k,i)=>b[i]===n[i]?TR(CORE[b[i]]):null).filter(Boolean),items=core.length?core:[TR("4つとも違う"),TR("幅の広さが芯")],gap=64,y0=cy-(items.length-1)*gap/2+30;
  coreHead(c,SANS,W/2,y0-74);items.forEach((t,i)=>corePill(c,SANS,t,W/2,y0+i*gap,lw-36));}}
 c.font="600 28px "+MONO;c.fillStyle=SC.ink;c.fillText(SHARE_URL.replace("https://",""),W/2,H-36);c.textAlign="left";return cv;}
/* 案2：性格カルテ */
async function drawKarte(){const me=window.__me,{SANS,MONO}=await cwFonts(),W=1080,b=me.born,n=me.now,one=b===n,[cb,cn]=cwColors(b,n);
 const K=me.kt||{},gk=["EI","SN","TF","JP"].map((k,i)=>b[i]!==n[i]?b[i]+n[i]:null).filter(Boolean),G=gk.length?HN.gap[gk[0]]:HN.same;
 const big=document.createElement("canvas");big.width=W;big.height=2600;const c=big.getContext("2d");
 c.fillStyle="#FFFFFF";c.fillRect(0,0,W,2600);c.fillStyle=SC.plus;c.fillRect(0,0,W,12);c.textBaseline="alphabetic";
 const X0=56,X1=W-56,LINE="#C9CFD8";
 const fitF=(t,w,fs,wt)=>{c.font=(wt||500)+" "+fs+"px "+SANS;while(c.measureText(t).width>w&&fs>14){fs--;c.font=(wt||500)+" "+fs+"px "+SANS;}return fs;};
 c.font="700 52px "+SANS;c.fillStyle=SC.ink;c.fillText(TR("性格カルテ"),X0,104);
 c.font="600 22px "+MONO;c.fillStyle=SC.muted;c.fillText("16TYPE+  No."+b+"-"+n,X0,144);
 const d=new Date();c.textAlign="right";c.font="500 22px "+SANS;c.fillText(LANG==="ja"?d.getFullYear()+"年"+(d.getMonth()+1)+"月"+d.getDate()+"日":d.toISOString().slice(0,10),X1,100);c.textAlign="left";
 let y=176;c.strokeStyle=LINE;c.lineWidth=2;c.strokeRect(X0,y,X1-X0,112);const mid=(X0+X1)/2;c.beginPath();c.moveTo(mid,y);c.lineTo(mid,y+112);c.stroke();
 c.font="500 22px "+SANS;c.fillStyle=SC.muted;c.fillText(TR("気質（生まれ持った）"),X0+24,y+40);c.fillText(TR("性格（経験で育った）"),mid+24,y+40);
 c.font="700 36px "+SANS;c.fillStyle=cb;c.fillText(b+p16(b),X0+24,y+90);c.fillStyle=cn;c.fillText(one?TR("気質と同じ"):n+p16(n),mid+24,y+90);y+=150;
 const LB=cwList(b),LN=cwList(n),co=coreOf(b,n)||{};
 /* 診断名（ゆるがない芯の名前） */
 if(co.name){y+=28;c.font="700 24px "+SANS;c.fillStyle=SC.muted;c.fillText(TR("診断名"),X0,y);c.font="800 46px "+SANS;c.fillStyle=SC.plus;fitF(co.name,X1-X0-140,46,800);c.fillStyle=SC.plus;c.fillText(co.name,X0+120,y+4);y+=66;}
 const head=t=>{c.font="700 26px "+SANS;c.fillStyle=SC.plus;c.fillText("■ "+t,X0,y);y+=18;};
 /* 所見：気質・性格・芯から1つずつ */
 const obs=[LB[0],one?LB[1]:LN[0],(co.aru||[])[0]].filter(Boolean),oc=[cb,one?cb:cn,SC.plus];
 head(TR("所見"));{const h=obs.length*48+20;c.strokeStyle=LINE;c.lineWidth=2;c.strokeRect(X0,y,X1-X0,h);
  obs.forEach((t,i)=>{const yy=y+46+i*48,x=X0+22;c.strokeStyle=oc[i];c.lineWidth=2.5;c.strokeRect(x,yy-22,22,22);c.beginPath();c.moveTo(x+4,yy-11);c.lineTo(x+10,yy-4);c.lineTo(x+19,yy-19);c.stroke();c.lineWidth=2;fitF(t,X1-X0-100,25);c.fillStyle=SC.ink;c.fillText(t,x+36,yy);});y+=h+44;}
 const para=(title,text,bg,bd,bold)=>{head(title);c.font="500 25px "+SANS;const ls=wrapLines(c,text||"",X1-X0-48,4),h=ls.length*40+30;
  if(bg){c.fillStyle=bg;c.fillRect(X0,y,X1-X0,h);}c.strokeStyle=bd||LINE;c.lineWidth=2;c.strokeRect(X0,y,X1-X0,h);c.fillStyle=SC.ink;c.font=(bold?"700 ":"500 ")+"25px "+SANS;ls.forEach((l,i)=>c.fillText(l,X0+24,y+46+i*40));y+=h+44;};
 para(TR("本人の訴え"),K.worry||[].concat(G.worry)[0]);
 if(co.rx&&co.rx.length){head(TR("処方"));
  co.rx.forEach((r,i)=>{const bx=X0,bw=X1-X0,pad=26;c.font="500 24px "+SANS;const how=wrapLines(c,TR("飲み方：")+r.how,bw-pad*2-70,2),eff=wrapLines(c,TR("効きめ：")+r.eff,bw-pad*2-70,2),h=70+(how.length+eff.length)*38+16;
   rrect(c,bx,y,bw,h,18);c.fillStyle="#FFF7F4";c.fill();c.lineWidth=2;c.strokeStyle=rgba(SC.plus,.45);c.stroke();
   /* カプセルの絵 */const px=bx+pad,py=y+30;rrect(c,px,py-14,48,26,13);c.fillStyle="#FFFFFF";c.fill();c.strokeStyle=SC.plus;c.stroke();c.save();c.beginPath();rrect(c,px,py-14,48,26,13);c.clip();c.fillStyle=i?cn===SC.ink?SC.plus:cn:cb;c.fillRect(px,py-14,24,26);c.restore();c.strokeStyle=SC.plus;rrect(c,px,py-14,48,26,13);c.stroke();
   c.font="800 30px "+SANS;c.fillStyle=SC.plus;fitF(r.name,bw-pad*2-70,30,800);c.fillStyle=SC.plus;c.fillText(r.name,px+66,py+10);
   c.font="500 24px "+SANS;c.fillStyle=SC.ink;let yy=y+70+22;how.concat(eff).forEach(l=>{c.fillText(l,px+66,yy);yy+=38;});y+=h+16;});y+=28;
  if(co.side)para(TR("副作用"),"※ "+co.side);
  if(co.doc)para(TR("先生からひと言"),co.doc,"#FBEDEA",SC.plus,true);
 }else{para(TR("処方（楽になるヒント）"),G.key);}
 const H=y+80;c.textAlign="center";c.font="600 28px "+MONO;c.fillStyle=SC.ink;c.fillText(SHARE_URL.replace("https://",""),W/2,H-36);c.textAlign="left";
 const out=document.createElement("canvas");out.width=W;out.height=H;out.getContext("2d").drawImage(big,0,0);return out;}
$("shareBtn").onclick=shareResult;

/* ---- 最初に開いたとき：前回の結果があれば、すぐ見せる ---- */
function boot(){drawResume();const R=sget(KR);
 if(R&&Array.isArray(R.t)&&R.t.length===4&&R.y){st.y=R.y;st.m=R.m;st.d=R.d;dateAll(true);st.t=R.t.slice();st.at=R.at||null;st.pct=R.pct||null;st.half=R.half||{};st.sway=R.sway||null;st.love=R.love||null;
  fillDate();setPicker();selAT=st.at;showResult();render(true);
  document.querySelectorAll(".intro,.how").forEach(e=>e.hidden=true);
  const res=$("result");res.after($("quizCard"));res.after($("formCard"));$("formh").textContent=TR("もう一度診断する");
  const wb=document.createElement("section");wb.className="card welcome";
  wb.innerHTML='<p class="eyebrow">'+TR("おかえりなさい")+'</p><p class="wbt">'+TR("前回の結果を表示しています。")+'</p><div class="wbacts"><button type="button" class="btn primary" id="wbRedo">'+TR("診断をやり直す")+'</button><button type="button" class="btn" id="wbHome">'+TR("トップページに戻る")+'</button></div>';
  const hero=document.querySelector(".hero");hero.before(wb);
  $("wbRedo").onclick=()=>$("formCard").scrollIntoView({behavior:"smooth",block:"start"});$("wbHome").onclick=e=>goHome(e);
 }else{fillDate();render();}}
$("reset").onclick=()=>{if(!confirm(TR("保存している結果を消して、はじめからやり直しますか？")))return;sset(KR,null);sset(KQ,null);location.reload();};

/* ---- 気質の力のバランス（生年月日ごとにちがう） ---- */
const POWN=[TR("伸びる力"),TR("燃える力"),TR("支える力"),TR("決める力"),TR("めぐる力")];
const POWC=["--tf","--rose","--sn","--muted","--ei"];
const POWTOP=[TR("新しいことを始めたり、伸ばしたりするのが得意。"),TR("気持ちを表に出し、場を明るくするのが得意。"),TR("どっしり構えて、人や物事を支えるのが得意。"),TR("決めたことを、最後までやり切るのが得意。"),TR("状況を読み、しなやかに流れを変えるのが得意。")];
const POWLOW=[TR("新しいことは、小さく始めるくらいがちょうどいい。"),TR("気持ちは、言葉にして伝えると届きやすい。"),TR("疲れたら、休める場所を先に決めておくと安心。"),TR("迷ったら、期限を決めて選ぶとすっきりする。"),TR("考えすぎる前に、一度まわりに相談してみて。")];
const STARS={"比肩":[TR("自分の星"),TR("自分の軸とペースを守る力。")],"劫財":[TR("勝負の星"),TR("負けずぎらいで、仲間と競い合って伸びる力。")],"食神":[TR("表現の星"),TR("楽しいこと、好きなことを素直に出す力。")],"傷官":[TR("感性の星"),TR("鋭い感覚とこだわりで、ものごとを磨く力。")],"偏財":[TR("めぐり合わせの星"),TR("人やチャンスを広くつかむ力。")],"正財":[TR("堅実の星"),TR("こつこつ積み上げ、大事なものを守る力。")],"偏官":[TR("挑戦の星"),TR("勢いで壁を越え、人を引っぱる力。")],"正官":[TR("けじめの星"),TR("ルールを守り、信頼を積み重ねる力。")],"偏印":[TR("個性の星"),TR("ひらめきと独自の見方で、人と違う道を見つける力。")],"印綬":[TR("学びの星"),TR("学び、吸収し、深く理解する力。")]};
function drawBalance(N){let el=$("bal");const c=N.chart;
 if(!el){el=document.createElement("section");el.id="bal";el.className="card bal";document.querySelector(".hero").after(el);}
 if(!c){el.hidden=true;return;}el.hidden=false;
 const tot=c.el.reduce((a,b)=>a+b,0)||1,pc=c.el.map(v=>Math.round(v/tot*100)),mx=Math.max(...pc);
 const order=[0,1,2,3,4],hi=order.reduce((a,b)=>pc[b]>pc[a]?b:a,0),lo=order.reduce((a,b)=>pc[b]<pc[a]?b:a,0);
 const st2=Object.entries(c.g).filter(([k])=>STARS[k]).sort((a,b)=>b[1]-a[1]).slice(0,2);
 el.innerHTML='<h2>'+TR("気質の力のバランス")+'</h2><p class="hint">'+TR("生まれた日から出した、あなただけの配分です。同じタイプでも、人によって違います。")+'</p>'
  +'<div class="bars">'+pc.map((v,i)=>'<div class="br" style="--c:var('+POWC[i]+')"><span class="bn">'+POWN[i]+'</span><span class="bt"><i style="width:'+(mx?v/mx*100:0)+'%"></i></span><span class="bv">'+v+'%</span></div>').join("")+'</div>'
  +'<p class="bnote"><b>'+TR("いちばん多いのは「")+POWN[hi]+TR("」。")+'</b>'+POWTOP[hi]+'<br>'+TR("少なめなのは「")+POWN[lo]+TR("」。")+POWLOW[lo]+'</p>'
  +(st2.length?'<h3 class="psh">'+TR("いちばん強い星")+'</h3><ul class="stars">'+st2.map(([k])=>'<li><b>'+STARS[k][0]+'</b><span>'+STARS[k][1]+'</span></li>').join("")+'</ul>':'');}

/* ---- 恋愛編（12問）：恋のときのあなたと、2人のどちらが顔を出すか ---- */
const LVSCALE=SCALE;
let lv={a:null,i:0};
function lvInit(){if(typeof LV==="undefined"||!LV||!LV.questions)return;let el=$("love");
 if(!el){el=document.createElement("section");el.id="love";el.className="card love";$("persona").after(el);}
 el.innerHTML='<p class="eyebrow">'+TR("恋愛編")+'</p><h2 class="lvh">'+TR("恋をすると、あなたの中のどちらが強く出る？")+'</h2>'
  +'<p class="hint lvlead">'+TR("恋愛の場面だけを聞く12問・約2分。気質と性格がちがう文字について、恋ではどちらが強く出るかがわかります。")+'</p>'
  +'<button class="btn primary" type="button" id="lvStart">'+TR("恋愛編を診断する")+'</button>'
  +'<div id="lvQ" class="lvq" hidden><div class="qtop"><span class="qcount" id="lvCount"></span><button type="button" class="qlink" id="lvBack">'+TR("← 戻る")+'</button></div><div class="qprog"><span id="lvProg"></span></div><h3 class="qtext" id="lvText"></h3><div class="qopts" id="lvOpts"></div></div>'
  +'<div id="lvRes" hidden></div>';
 $("lvStart").onclick=()=>{lv={a:new Array(LV.questions.length).fill(null),i:0};$("lvStart").hidden=true;$("lvRes").hidden=true;$("lvQ").hidden=false;lvDraw();$("love").scrollIntoView({behavior:"smooth",block:"start"});};
 $("lvBack").onclick=()=>{if(lv.i>0){lv.i--;lvDraw();}else{$("lvQ").hidden=true;$("lvStart").hidden=false;}};
 const me=window.__me;if(me&&me.born===me.now){$("lvStart").hidden=true;el.querySelector(".lvlead").textContent=TR("気質と性格が同じなので、質問なしで恋のときのあなたがわかります。");lvShow(me.now);}
 else if(st.love&&st.love.t&&[...st.love.t].every((l,i)=>l===me.born[i]||l===me.now[i]))lvShow(st.love.t);}
function lvDraw(){const Q=LV.questions,q=Q[lv.i],A=AX[AXN[q.ax]];$("lvCount").textContent=(lv.i+1)+" / "+Q.length;$("lvProg").style.width=(lv.i/Q.length*100)+"%";
 $("lvText").textContent=q.q;const o=$("lvOpts");o.innerHTML="";
 LVSCALE.forEach(([t,v,sz])=>{const bt=document.createElement("button");bt.type="button";bt.style.setProperty("--qc","var(--rose)");bt.innerHTML='<i style="width:'+sz+'px;height:'+sz+'px"></i>'+t;bt.setAttribute("aria-pressed",lv.a[lv.i]===v);
  bt.onclick=()=>{lv.a[lv.i]=v;bt.setAttribute("aria-pressed","true");setTimeout(()=>{lv.i++;if(lv.i>=Q.length)lvFinish();else lvDraw();},180);};o.appendChild(bt);});}
function lvFinish(){const me=window.__me,sc={EI:0,SN:0,TF:0,JP:0};
 LV.questions.forEach((q,i)=>{const A=AX[AXN[q.ax]],v=(lv.a[i]==null?2.5:lv.a[i])-2.5;sc[q.ax]+=q.p===A.a?v:-v;});
 /* 気質と性格が同じ文字はそのまま。ちがう文字だけ、答えが寄った方を選ぶ（3つ目のタイプは作らない） */
 const t=AX.map((A,i)=>me.born[i]===me.now[i]?me.now[i]:(sc[A.k]>0?A.a:sc[A.k]<0?A.b:me.now[i])).join("");
 st.love={t,a:lv.a};saveResult();$("lvQ").hidden=true;lvShow(t);$("love").scrollIntoView({behavior:"smooth",block:"start"});}
function lvHook(born,now,love){let nb=0,nn=0;for(let i=0;i<4;i++){if(born[i]!==now[i]){if(love[i]===born[i])nb++;else nn++;}}
 const s=born===now?TR("気質も性格も同じ。恋をしても、ぶれずにそのままのあなたが出る。")
  :nb&&!nn?TR("ふだんは性格の{N}が前に出る。でも恋をすると、気質の{B}が強く出る。")
  :nn&&!nb?TR("恋をしても、性格の{N}がそのまま前に出る。気質の{B}は、心の奥で支えている。")
  :TR("恋をすると、気質の{B}と性格の{N}が混ざって出てくる。");
 return s.replace(/\{B\}/g,an(born)).replace(/\{N\}/g,an(now));}
function lvShow(t){const me=window.__me,P=LV.types&&LV.types[t];if(!me)return;const el=$("lvRes");el.hidden=false;$("lvStart").hidden=true;$("lvQ").hidden=true;
 const one=me.born===me.now;
 const lab=i=>me.born[i]===me.now[i]?'<em class="core">'+TR("芯")+'</em>':(t[i]===me.born[i]?'<em class="b">'+TR("気質")+'</em>':'<em class="n">'+TR("性格")+'</em>');
 let h='<p class="lvlab">'+TR("恋をしたときのあなた")+'</p><div class="lvtiles">'+t.split("").map((l,i)=>'<div class="lt'+(me.born[i]!==me.now[i]&&l===me.born[i]?' isb':'')+'"><b>'+l+'</b>'+lab(i)+'</div>').join("")+'</div>'
  +'<p class="hook">'+esc(lvHook(me.born,me.now,t))+'</p>';
 if(P){const nm=k=>k+p16(k);
  h+='<div class="lvp"><p class="lvsub">'+TR("恋のときのあなたは")+'</p><p class="lvname">'+esc(P.t+p16(P.t))+'</p><p class="one">'+TR("「")+esc(P.one)+TR("」")+'</p><p class="desc">'+esc(P.desc)+'</p>'
  +'<details class="pmore"><summary>'+TR("恋で光るところ・気をつけたいところ")+'</summary><div class="two"><div class="g"><h3>'+TR("恋で光るところ")+'</h3><ul>'+P.good.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div><div class="c"><h3>'+TR("気をつけたいところ")+'</h3><ul>'+P.care.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul></div></div><p class="key"><b>'+TR("うまくいくコツ")+'</b>'+esc(P.tip)+'</p></details>'
  +'<details class="pmore"><summary>'+TR("恋の相性")+'</summary><div class="cpl"><div class="o"><em>'+TR("相性◎")+'</em><b>'+esc(nm(P.best[0]))+'</b>'+esc(P.best[1])+'</div><div class="x"><em>'+TR("相性×")+'</em><b>'+esc(nm(P.hard[0]))+'</b>'+esc(P.hard[1])+'</div></div></details></div>'
  +'<button class="btn primary" type="button" id="lvShare">'+TR("恋愛編の結果を画像でシェア")+'</button>';}
 if(!one)h+='<button class="qlink" type="button" id="lvRedo">'+TR("恋愛編に答え直す")+'</button>';
 el.innerHTML=h;
 if($("lvShare"))$("lvShare").onclick=()=>lvShareRun(t);
 if($("lvRedo"))$("lvRedo").onclick=()=>{el.hidden=true;$("lvStart").hidden=false;$("lvStart").click();};}
async function lvShareRun(t){track("love_share_click");const b=$("lvShare"),lbl=b.textContent;b.disabled=true;b.textContent=TR("画像をつくっています…");
 try{const P=LV.types[t],cvs=[await lvCloud(P),await lvSheet(P)];const blobs=await Promise.all(cvs.map(cv=>new Promise(r=>cv.toBlob(r,"image/png"))));
  const files=blobs.map((bl,i)=>new File([bl],"16typeplus-love-"+(i+1)+".png",{type:"image/png"}));
  if(navigator.canShare&&navigator.canShare({files})){try{await navigator.share({files,text:TR("恋のときのあなたは")+" "+P.t+p16(P.t)+TR("｜16TYPE+（16タイププラス）")+" "+SHARE_URL});}catch(e){if(e&&e.name!=="AbortError")showShareBox(cvs);}}
  else showShareBox(cvs);}catch(e){alert(TR("画像をつくれませんでした。もう一度お試しください。"));}finally{b.disabled=false;b.textContent=lbl;}}
const LVC={ink:SC.ink,muted:SC.muted,soft:"#EEF1F5",rule:"#E2E6EC",rose:"#C9607A",roseT:"#F8E4EA",rose2:"#DE8FA3"};
function lvFonts(){const SANS=(LANG==="ko"?'"Noto Sans KR",':'')+'"IBM Plex Sans JP","Hiragino Sans","Noto Sans JP",sans-serif',MONO='"IBM Plex Mono",ui-monospace,Menlo,monospace';
 return Promise.all(["700 40px "+SANS,"500 40px "+SANS,"600 40px "+MONO].map(f=>document.fonts.load(f,"あア가A♡"))).catch(()=>{}).then(()=>({SANS,MONO}));}
async function lvCloud(P){const {SANS,MONO}=await lvFonts(),W=1080,H=1350,cv=document.createElement("canvas");cv.width=W;cv.height=H;const c=cv.getContext("2d");
 const me=window.__me,t=P.t,X0=70,X1=W-70;
 c.fillStyle="#FFFFFF";c.fillRect(0,0,W,H);c.fillStyle=LVC.rose;c.fillRect(0,0,W,12);c.textBaseline="alphabetic";
 const fitF=(txt,w,fs,wt)=>{c.font=(wt||700)+" "+fs+"px "+SANS;while(c.measureText(txt).width>w&&fs>16){fs--;c.font=(wt||700)+" "+fs+"px "+SANS;}return fs;};
 c.font="600 26px "+MONO;c.fillStyle=LVC.muted;c.fillText("16TYPE+  "+TR("恋愛編"),X0,82);
 c.textAlign="center";c.font="600 30px "+MONO;c.fillStyle=LVC.rose;c.fillText(TR("恋をしたときのあなた"),W/2,150);
 fitF(P.t+p16(P.t),X1-X0,64);c.fillStyle=LVC.ink;c.fillText(P.t+p16(P.t),W/2,228);
 /* 恋の4文字と、それぞれが気質・性格のどちらから来たか */
 const tw=170,gap=26,x0=(W-(tw*4+gap*3))/2,ty=270;
 for(let i=0;i<4;i++){const x=x0+i*(tw+gap),l=t[i],b=me?me.born[i]:l,n=me?me.now[i]:l;
  const src=b===n?TR("芯"):(l===b?TR("気質"):TR("性格"));
  c.fillStyle=l===b&&b!==n?LVC.roseT:"#F3F5F8";rrect(c,x,ty,tw,tw,22);c.fill();
  c.font="600 96px "+MONO;c.fillStyle=LVC.ink;c.fillText(l,x+tw/2,ty+tw/2+34);
  c.font="700 24px "+SANS;c.fillStyle=src===TR("性格")?LVC.ink:LVC.rose;c.fillText(src,x+tw/2,ty+tw+38);}
 const hook=me?lvHook(me.born,me.now,t):P.one;c.font="500 28px "+SANS;c.fillStyle=LVC.muted;
 wrapLines(c,hook,X1-X0,2).forEach((l,i)=>c.fillText(l,W/2,ty+tw+96+i*40));
 /* 言葉：甘い→辛い の順に2列でしきつめる */
 const ws=(P.words||[]).slice().sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
 const top=ty+tw+250,bot=H-110,half=Math.ceil(ws.length/2),cols=[ws.slice(0,half),ws.slice(half)];
 c.strokeStyle="#EEE2E6";c.lineWidth=2;c.beginPath();c.moveTo(X0,top-30);c.lineTo(X1,top-30);c.stroke();
 c.font="700 22px "+SANS;c.textAlign="left";c.fillStyle=LVC.rose;c.fillText(TR("甘め"),X0,top-44);c.textAlign="right";c.fillStyle=LVC.muted;c.fillText(TR("ちょっと辛口 ↓"),X1,top-44);
 const colW=(X1-X0-40)/2,step=(bot-top)/half;
 cols.forEach((arr,k)=>arr.forEach((w,i)=>{const x=X0+k*(colW+40),y=top+step*i+step*.62,pos=(k*half+i)/ws.length;
  c.fillStyle=pos<.35?LVC.rose:pos<.7?LVC.rose2:LVC.ink;c.textAlign="left";c.beginPath();c.arc(x+8,y-11,6,0,Math.PI*2);c.fill();
  fitF(w,colW-34,pos<.2?34:30);c.fillText(w,x+28,y);}));
 c.textAlign="center";c.font="600 28px "+MONO;c.fillStyle=LVC.ink;c.fillText(SHARE_URL.replace("https://",""),W/2,H-46);c.textAlign="left";return cv;}
async function lvSheet(P){const {SANS,MONO}=await lvFonts(),W=1080,H=1700,cv=document.createElement("canvas");cv.width=W;cv.height=H;const c=cv.getContext("2d");
 const wrap=(t,w)=>wrapLines(c,t,w,9);
 c.fillStyle="#FFFFFF";c.fillRect(0,0,W,H);c.fillStyle=LVC.rose;c.fillRect(0,0,W,14);
 c.font="600 26px "+MONO;c.fillStyle=LVC.muted;c.fillText("16TYPE+  "+TR("恋愛編"),70,95);c.font="600 40px "+MONO;c.fillStyle=LVC.rose;c.fillText(TR("恋愛")+" "+an(P.t),70,185);
 c.font="700 60px "+SANS;c.fillStyle=LVC.ink;wrapLines(c,P.t+p16(P.t),W-140,2).forEach((l,i)=>c.fillText(l,70,275+i*70));
 let y=390;c.fillStyle=LVC.roseT;rrect(c,60,y,W-120,130,20);c.fill();c.font="500 24px "+SANS;c.fillStyle=LVC.rose;c.fillText(TR("一言で言うと…"),90,y+42);
 c.font="700 34px "+SANS;c.fillStyle=LVC.ink;wrap(TR("「")+P.one+TR("」"),W-180).slice(0,2).forEach((l,i)=>c.fillText(l,90,y+92+i*44));
 y=590;c.font="500 26px "+SANS;c.fillStyle=LVC.ink;wrap(P.desc,W-140).slice(0,5).forEach(l=>{c.fillText(l,70,y);y+=40;});y+=40;
 const col=(title,color,items,x,w)=>{c.font="700 32px "+SANS;c.fillStyle=color;c.fillText(title,x,y);let yy=y+50;items.forEach(t=>{c.font="500 25px "+SANS;const ls=wrap(t,w-44);c.fillStyle=color;c.fillText("♡",x,yy);c.fillStyle=LVC.ink;ls.forEach(l=>{c.fillText(l,x+40,yy);yy+=36;});yy+=10;});return yy;};
 const y1=col(TR("恋で光るところ"),LVC.rose,P.good,70,450),y2=col(TR("気をつけたいところ"),LVC.muted,P.care,560,450);
 y=Math.max(y1,y2)+30;c.strokeStyle=LVC.rule;c.lineWidth=2;c.beginPath();c.moveTo(70,y);c.lineTo(W-70,y);c.stroke();y+=60;
 const nm=k=>k+p16(k);
 const pair=(mark,color,k,text)=>{c.font="700 32px "+SANS;c.fillStyle=color;c.fillText(mark+"  "+nm(k),70,y);y+=46;c.font="500 25px "+SANS;c.fillStyle=LVC.ink;wrap(text,W-140).slice(0,3).forEach(l=>{c.fillText(l,70,y);y+=36;});y+=24;};
 pair(TR("相性◎"),LVC.rose,P.best[0],P.best[1]);pair(TR("相性×"),LVC.muted,P.hard[0],P.hard[1]);
 c.font="600 28px "+MONO;c.fillStyle=LVC.ink;c.textAlign="center";c.fillText(SHARE_URL.replace("https://",""),W/2,H-50);c.textAlign="left";return cv;}
/* ---- 性格の履歴書（1枚の画像） ---- */
async function drawCV(){
 const me=window.__me,W=1080;let H=2200;const cv=document.createElement("canvas");cv.width=W;cv.height=H;const c=cv.getContext("2d");
 const SANS=(LANG==="ko"?'"Noto Sans KR",':'')+'"IBM Plex Sans JP","Hiragino Sans","Noto Sans JP",sans-serif',MONO='"IBM Plex Mono",ui-monospace,Menlo,monospace';
 try{await Promise.all(["700 40px "+SANS,"500 40px "+SANS,"600 40px "+MONO].map(f=>document.fonts.load(f,"16TYPE+ あア가A")));}catch(e){}
 const img=await loadImg(charSrc(me.now));
 const P=PS[me.now]||{},PB=PS[me.born]||{},AN=D.ARUARU[me.now]||[],AB=D.ARUARU[me.born]||[],Q0=(D.QUOTE&&D.QUOTE[me.now])||[],Q=me.kt?[me.kt.say.replace(/^[「"']|[」"']$/g,"")].concat(Q0.slice(0,1)):Q0;
 const head=x=>String(x||"").split("｜")[0];
 const LINE="#B9C0CA",LBG="#F3F5F8",X0=60,X1=W-60,LW=190;
 c.fillStyle="#FFFFFF";c.fillRect(0,0,W,H);c.fillStyle=SC.plus;c.fillRect(0,0,W,12);
 c.textBaseline="alphabetic";c.textAlign="left";
 c.font="700 52px "+SANS;c.fillStyle=SC.ink;c.fillText(TR("性格の履歴書"),X0,108);
 const d=new Date(),ds=LANG==="ja"?d.getFullYear()+"年"+(d.getMonth()+1)+"月"+d.getDate()+"日現在":LANG==="ko"?d.getFullYear()+"년 "+(d.getMonth()+1)+"월 "+d.getDate()+"일 현재":"As of "+d.toISOString().slice(0,10);
 c.font="500 24px "+SANS;c.fillStyle=SC.muted;c.textAlign="right";c.fillText(ds,X1,104);c.textAlign="left";
 c.font="600 24px "+MONO;c.fillStyle=SC.muted;c.fillText("16TYPE",X0,150);c.fillStyle=SC.plus;c.fillText("+",X0+c.measureText("16TYPE").width,150);
 const box=(x,y,w,h)=>{c.strokeStyle=LINE;c.lineWidth=2;c.strokeRect(x,y,w,h);};
 const lab=(x,y,w,h,t)=>{c.fillStyle=LBG;c.fillRect(x,y,w,h);box(x,y,w,h);c.font="700 22px "+SANS;c.fillStyle=SC.muted;const ls=wrapLines(c,t,w-24,2);ls.forEach((l,i)=>c.fillText(l,x+14,y+h/2+8-(ls.length-1)*14+i*28));};
 const txt=(t,x,y,w,fs,lines,col,wt)=>{c.font=(wt||500)+" "+fs+"px "+SANS;c.fillStyle=col||SC.ink;const ls=wrapLines(c,t,w,lines);ls.forEach((l,i)=>c.fillText(l,x,y+i*Math.round(fs*1.5)));return ls.length;};
 /* 上の欄：名前・気質・性格 ＋ 写真 */
 const PW=270,PH=360,PX=X1-PW,PY=176,TW=PX-24-X0;let y=PY;
 const nm=($("myName")&&$("myName").value.trim())||TR("あなた");
 const rows=[[TR("氏名"),nm,40,700],[TR("性格"),me.now+(me.nAT?"-"+me.nAT:"")+p16(me.now),30,700],[TR("気質"),me.born===me.now?TR("性格と同じ"):me.born+(me.bAT?"-"+me.bAT:"")+p16(me.born),30,600],[TR("ひとことで"),((coreOf(me.born,me.now)||{}).name)||P.catch||"",24,700]];
 const rh=[86,74,74,PH-86-74-74];
 rows.forEach(([l,v,fs,wt],i)=>{lab(X0,y,LW,rh[i],l);box(X0+LW,y,TW-LW,rh[i]);c.fillStyle=i===2?SC.muted:SC.ink;
  const maxL=i===3?3:1;let f=fs,ls;for(;f>=16;f-=2){c.font=wt+" "+f+"px "+SANS;ls=wrapLines(c,v,TW-LW-32,maxL+1);if(ls.length<=maxL)break;}if(ls.length>maxL)ls=wrapLines(c,v,TW-LW-32,maxL);
  const lh=Math.round(f*1.45),top=y+rh[i]/2-(ls.length-1)*lh/2+f*0.36;ls.forEach((t,j)=>c.fillText(t,X0+LW+18,top+j*lh));y+=rh[i];});
 /* 写真欄：性格のキャラを、枠いっぱいに（はみ出す分は左右を切る） */
 c.fillStyle=SC.paper;c.fillRect(PX,PY,PW,PH);if(img){const s=Math.max(PW/img.width,PH/img.height),iw=img.width*s,ih=img.height*s;c.save();c.beginPath();c.rect(PX,PY,PW,PH);c.clip();c.drawImage(img,PX+(PW-iw)/2,PY+(PH-ih)/2,iw,ih);c.restore();}
 box(PX,PY,PW,PH);
 y=PY+PH+28;
 /* 歩み（気質は子どものころに、性格は大人になってから出やすい） */
 const sec=(t)=>{y+=10;c.font="700 26px "+SANS;c.fillStyle=SC.plus;c.fillText(t,X0,y+20);y+=36;};
 sec(TR("これまでの歩み（予測）"));
 const hist=[[TR("子どものころ"),AB[0]],[TR("学生時代"),AB[1]],[TR("社会に出て"),AN[2]||AN[0]],[TR("現在"),AN[0]===AB[0]?AN[3]||AN[1]:AN[0]]].filter(r=>r[1]);
 hist.forEach(([l,v])=>{const h=64;lab(X0,y,LW,h,l);box(X0+LW,y,X1-X0-LW,h);txt(v,X0+LW+18,y+h/2+9,X1-X0-LW-36,25,1);y+=h;});
 y+=30;
 /* 長所・短所 */
 const half=(X1-X0-20)/2;
 const two=(t1,a1,t2,a2)=>{const h=Math.max(a1.length,a2.length)*44+60;[[t1,a1,X0],[t2,a2,X0+half+20]].forEach(([t,a,x])=>{box(x,y,half,h);c.fillStyle=LBG;c.fillRect(x+1,y+1,half-2,42);c.font="700 22px "+SANS;c.fillStyle=SC.muted;c.fillText(t,x+14,y+30);a.forEach((s,i)=>txt("・"+s,x+14,y+82+i*44,half-28,23,1));});y+=h+30;};
 two(TR("長所"),[head((P.strengths||[])[0]),head((P.strengths||[])[1]),head((PB.strengths||[])[0])].filter(Boolean),TR("短所（自己申告）"),[head((P.pitfalls||[])[0]),head((P.pitfalls||[])[1]),head((PB.pitfalls||[])[0])].filter(Boolean));
 /* 口ぐせ */
 sec(TR("言いそうなこと"));
 {c.font="700 25px "+SANS;const parts=Q.map(q=>TR("「")+q+TR("」")),lines=[];let cur="";parts.forEach(p=>{const t=cur?cur+"   "+p:p;if(c.measureText(t).width>X1-X0-40&&cur){lines.push(cur);cur=p;}else cur=t;});if(cur)lines.push(cur);
  const qh=lines.length*40+30;box(X0,y,X1-X0,qh);c.fillStyle=SC.ink;lines.forEach((l,i)=>c.fillText(l,X0+20,y+45+i*40));y+=qh+30;}
 /* 本人希望欄・向いている仕事 */
 const want=(HN.type[me.born]||{}).want||"",jobs=((P.jobs||[]).slice(0,3)).join(TR("・"));
 [[TR("本人希望記入欄"),want]].concat(me.kt?[[TR("やりそうなこと"),me.kt.do]]:[]).concat([[TR("向いている仕事"),jobs]]).forEach(([l,v])=>{c.font="500 24px "+SANS;const n=Math.min(2,wrapLines(c,v,X1-X0-LW-36,2).length),h=n>1?96:64;lab(X0,y,LW,h,l);box(X0+LW,y,X1-X0-LW,h);txt(v,X0+LW+18,y+(n>1?40:h/2+9),X1-X0-LW-36,24,2);y+=h;});
 y+=30;
 /* 採用担当からのひと言（辛口） */
 const kr=(me.kt&&me.kt.karai)||me.karaiC||"";if(kr){c.font="700 28px "+SANS;let fs=28,ls;for(;fs>=22;fs-=2){c.font="700 "+fs+"px "+SANS;ls=wrapLines(c,kr,X1-X0-56,3);if(ls.length<=2||fs===22)break;}
  const kh=ls.length*Math.round(fs*1.5)+78;c.fillStyle="#FBEDEA";c.fillRect(X0,y,X1-X0,kh);c.strokeStyle=SC.plus;c.lineWidth=2;c.strokeRect(X0,y,X1-X0,kh);
  c.font="700 22px "+SANS;c.fillStyle=SC.plus;c.fillText(TR("採用担当からのひと言（辛口）"),X0+24,y+40);
  c.fillStyle=SC.ink;c.font="700 "+fs+"px "+SANS;ls.forEach((l,i)=>c.fillText(l,X0+24,y+84+i*Math.round(fs*1.5)));y+=kh;}
 H=y+150;c.textAlign="center";c.font="500 22px "+SANS;c.fillStyle=SC.muted;c.fillText(TR("※ 気質と性格の診断結果から予測した、遊びの履歴書です"),W/2,H-82);
 c.font="600 28px "+MONO;c.fillStyle=SC.ink;c.fillText(SHARE_URL.replace("https://",""),W/2,H-40);c.textAlign="left";
 const out=document.createElement("canvas");out.width=W;out.height=H;out.getContext("2d").drawImage(cv,0,0);return out;}
async function makeCV(){const b=$("cvBtn"),lbl=b.textContent;b.disabled=true;b.textContent=TR("画像をつくっています…");
 try{const cv=await drawCV();showShareBox([cv]);}catch(e){alert(TR("画像をつくれませんでした。もう一度お試しください。"));}finally{b.disabled=false;b.textContent=lbl;}}
if($("cvBtn"))$("cvBtn").onclick=()=>{track("karte_click");makeCV();};


/* トップへ戻る：ロゴ・ボタン・下のリンク・右下の丸ボタン */
function goHome(e){if(e)e.preventDefault();if(!$("quizCard").hidden)showQuiz(false);
 /* 2回目以降の「おかえりなさい」表示のときは、トップの説明と入力欄を元の位置に戻す */
 const intro=document.querySelector(".intro");if(intro&&intro.hidden){document.querySelectorAll(".intro,.how").forEach(x=>x.hidden=false);const how=document.querySelector(".how");how.after($("formCard"));$("formCard").after($("quizCard"));$("formh").textContent=TR("診断をはじめる");const wb=document.querySelector(".welcome");if(wb)wb.remove();}
 window.scrollTo({top:0,behavior:"smooth"});}
["logoHome","homeBtn","toTop","fabTop"].forEach(id=>{const el=$(id);if(el)el.addEventListener("click",goHome);});
{const fab=$("fabTop");if(fab){const f=()=>{fab.hidden=window.scrollY<700;};window.addEventListener("scroll",f,{passive:true});f();}}

/* 結果の並び：最初に「鑑定文・円の画像・シェア」、くわしい内容はたたんでおく */

/* 開運予報への案内（日本語版のみ）。URLが空のあいだは表示しない。
   {Y}{M}{D}=年月日（M・Dは2桁）、{YMD}=YYYYMMDD に置きかわる。行き先はLP（トップ）。「#y=&m=&d=」はLP側が対応すれば生年月日の引き継ぎに使える */
const KAIUN_URL="https://unkiyoho.jp/#y={Y}&m={M}&d={D}&from=16tp";
const KAIUN_IMG={mail:"data:image/webp;base64,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",cal:"data:image/webp;base64,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"};
/* 開運予報の見本画像：本番では開運予報のサイトから今月の画像を出す（季節でかわる）。読めないときは同梱の見本 */
function kaiunPics(){const j=new Date(Date.now()+9*3600e3),p2=n=>String(n).padStart(2,"0");let ym=j.getUTCFullYear()+"-"+p2(j.getUTCMonth()+1);if(ym<"2026-10")ym="2026-10";else if(ym>"2031-12")ym="2031-"+p2(j.getUTCMonth()+1);
 const fig=(src,fb,cap)=>'<figure><img src="'+src+'" data-fb="'+fb+'" alt="'+cap+'" loading="lazy"><figcaption>'+cap+'</figcaption></figure>';
 return '<div class="kaiun-pics">'+fig("https://unkiyoho.jp/hero-lucky-"+ym+".webp",KAIUN_IMG.mail,"毎朝届くメール")+fig("https://unkiyoho.jp/lpcal/lp-cal-"+ym+".webp",KAIUN_IMG.cal,"あなたの開運カレンダー")+'</div>';}
function kaiunCard(at){let c=$("kaiun");if(LANG!=="ja"||!KAIUN_URL||!st.y){if(c)c.hidden=true;return at;}
 if(!c){c=document.createElement("section");c.id="kaiun";c.className="card kaiun";}
 const p2=n=>String(n).padStart(2,"0"),Y=String(st.y),M=p2(st.m),D=p2(st.d);
 let u=KAIUN_URL.replace(/\{YMD\}/g,Y+M+D).replace(/\{Y\}/g,Y).replace(/\{M\}/g,M).replace(/\{D\}/g,D);
 const hi=u.indexOf("#"),base=hi<0?u:u.slice(0,hi),hash=hi<0?"":u.slice(hi),utm="utm_source=16typeplus&utm_medium=result&utm_campaign=kaiun";
 u=base+(base.includes("?")?"&":"?")+utm+hash;
 c.innerHTML='<p class="kaiun-eb">MY DAILY FORECAST</p><h2 class="kaiun-t">私だけの開運予報</h2><p class="kaiun-catch"><span class="nw">今日のあなたが、</span><span class="nw">一通の手紙になって届く。</span></p>'+kaiunPics()+'<p class="kaiun-p">この診断の「気質」は、あなたの生年月日から出しています。同じ生年月日から、毎朝あなただけの占いをメールでお届けします。</p><p class="kaiun-checks"><span>✓ 料金はかかりません</span><span>✓ 毎朝メールで届きます</span><span>✓ いつでも停止できます</span></p><a class="btn kaiun-btn" href="'+u+'" target="_blank" rel="noopener">どんなメールか見てみる</a><p class="kaiun-note">開運予報の説明ページが開きます。</p>';
 c.querySelectorAll(".kaiun-pics img").forEach(im=>{im.onerror=()=>{if(im.src!==im.dataset.fb)im.src=im.dataset.fb;};});c.hidden=false;c.querySelector("a").onclick=()=>{try{track("kaiun_click",{place:"result"});}catch(e){}};
 at.after(c);return c;}
/* その人の回答で揺れた向きを、気質と性格の組み合わせから説明する */
const SWN={EI:["元気の出し方","人といるか、ひとりか","--ei"],SN:["ものの見方","事実か、可能性か","--sn"],TF:["決め方","理屈か、気持ちか","--tf"],JP:["進め方","計画どおりか、その場に合わせるか","--jp"]};
function swayNote(born,now){const ks=["EI","SN","TF","JP"];
 if(!st.pct)return '<p class="mine">'+TR("質問に答えると、あなたの答えがどこで揺れているかがわかります。")+'</p>';
 const w=ks.filter(k=>(st.sway&&st.sway[k])||(st.half&&st.half[k]));
 if(!w.length)return '<div class="mine"><p>'+TR("今回のあなたの回答は、4つの向きすべてがはっきりしていました。結果が受けるたびに変わるなら、答えた時の気分や、思い浮かべた場面が違ったのかもしれません。")+'</p></div>';
 const df=k=>born[ks.indexOf(k)]!==now[ks.indexOf(k)];
 let t='<p class="mh">'+TR("今回のあなたの回答で、揺れていたのは")+'</p><ul class="swl">'+w.map(k=>'<li style="--c:var('+SWN[k][2]+')"><b>'+TR(SWN[k][0])+'</b><small>'+TR(SWN[k][1])+'</small><em class="'+(df(k)?'both':'core')+'">'+(df(k)?TR("両方の力"):TR("ゆるがない部分"))+'</em></li>').join("")+'</ul>';
 if(w.some(df))t+='<p><em class="both">'+TR("両方の力")+'</em>'+TR("生まれ持った気質と育ってきた性格の向きが違うところです。両方の力を持っているので、場面によって答えが変わるのは自然なことです。")+'</p>';
 if(w.some(k=>!df(k)))t+='<p><em class="core">'+TR("ゆるがない部分")+'</em>'+TR("気質も性格も同じ向きで、ふだんは揺れにくいところです。ここが揺れたのは、今の職場や人間関係で、いつもと違う力を使っている時期だからかもしれません。")+'</p>';
 return '<div class="mine">'+t+'<p class="mk"><b>'+TR("どちらかが正しいタイプ、ということはありません。")+'</b></p></div>';}
/* 鑑定文を読みやすく：気質・性格の言葉に色、かぎかっこを太字、結論の文を太字、ヒントは箇条書き */
const KW={ja:[/(生まれ持った気質|生まれ持った性質|生まれ持った|生まれつき|気質)|(経験の中で育った性格|経験の中で育った|経験の中で|育ってきた性格|育ってきた|性格)|(両方の力|ゆるがない部分)/g],
 en:[/\b(inborn temperament|temperament|born with|inborn)\b|\b(character you grew|character|grew through experience|through experience)\b|\b(both strengths|steady part|steady core)\b/gi],
 ko:[/(타고난 기질|타고난|기질)|(경험 속에서 자란|경험으로 자란|자라 온 성격|성격)|(두 가지 힘|흔들리지 않는 부분)/g]};
function sents(t){/* かぎかっこ・引用符の中では文を区切らない */
 const out=[];let cur="",dq=0,inQ=false;const ends=LANG==="ja"?"。！？":".!?";
 for(let i=0;i<t.length;i++){const c=t[i];cur+=c;
  if(c==="「"||c==="“"||c==="‘")dq++;else if((c==="」"||c==="”"||c==="’")&&dq>0)dq--;else if(c==='"')inQ=!inQ;
  if(!dq&&!inQ&&ends.includes(c)){while(i+1<t.length&&(ends.includes(t[i+1])||t[i+1]==='"'&&false))cur+=t[++i];
   if(LANG==="ja"||i+1>=t.length||/\s/.test(t[i+1])){out.push(cur.trim());cur="";}}}
 if(cur.trim())out.push(cur.trim());return out.length?out:[t];}
function kfmt1(t){t=esc(t).replace(/「([^」]{1,40})」/g,'<b class="q">「$1」</b>').replace(/&quot;([^&]{1,60})&quot;/g,'<b class="q">"$1"</b>').replace(/[“]([^”]{1,60})[”]/g,'<b class="q">“$1”</b>').replace(/‘([^’]{1,40})’/g,'<b class="q">‘$1’</b>');
 return t.replace(KW[LANG]?KW[LANG][0]:KW.ja[0],(m,b,n,c)=>b?'<span class="hb">'+m+'</span>':n?'<span class="hn">'+m+'</span>':'<b>'+m+'</b>');}
function kfmt(t,f){const ss=sents(t).map(kfmt1),J=LANG==="ja"?"":" ";
 if(f==="tip")return '<ul class="tipl">'+ss.map(x=>'<li>'+x+'</li>').join("")+'</ul>';
 if(f==="aru")return '<p>'+ss.join(J)+'</p>';
 if(f==="why"||f==="plus"||f==="hidden"){const last=ss.length>1?ss.pop():null;const ps=[];for(let i=0;i<ss.length;i+=2)ps.push('<p>'+ss.slice(i,i+2).join(J)+'</p>');return ps.join("")+(last?'<p class="key">'+last+'</p>':'');}
 return '<p>'+ss.join(J)+'</p>';}
function coreCard(b,n){const co=coreOf(b,n);if(!co)return "";
 return '<div class="ktcore"><p class="kch">'+TR("あなたのゆるがない芯")+'</p><p class="kcn">'+esc(co.name)+'</p><ul class="kcl">'+co.aru.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul><p class="kcs">'+(b===n?TR("気質も性格も同じ向きなので、4つすべてがあなたの芯です。"):TR("気質と性格で同じ向きのところが、どんな時も変わらないあなたの芯です。"))+'</p></div>';}
/* 結果の一番最初：キャラクターのカードをタップしてめくる */
function setupCards(instant,one){const cards=[...document.querySelectorAll(".nicks .nk")].filter(n=>!n.hidden),story=$("rStory");window.__story=story.innerHTML;
 cards.forEach(n=>{let bk=n.querySelector(".nkback");if(!bk){bk=document.createElement("div");bk.className="nkback";n.appendChild(bk);}
  const born=n.classList.contains("born");bk.innerHTML='<span class="q">?</span><b>'+(one?TR("気質も性格も"):born?TR("気質のあなた"):TR("性格のあなた"))+'</b><small>'+TR("タップしてめくる")+'</small>';
  n.classList.remove("turn","turn2");n.classList.toggle("open",!!instant);n.onclick=()=>flipCard(n);});
 const cb=$("coreBox");if(cb)cb.classList.toggle("wait2",!instant);
 if(!instant)story.innerHTML=TR('<span class="ln">カードをタップして、</span><span class="ln">あなたの2つの性質を見てみよう</span>');}
function flipCard(n){if(n.classList.contains("open")||n.classList.contains("turn"))return;n.classList.add("turn");
 setTimeout(()=>{n.classList.add("open");n.classList.remove("turn");n.classList.add("turn2");setTimeout(()=>n.classList.remove("turn2"),300);
  const left=[...document.querySelectorAll(".nicks .nk")].filter(x=>!x.hidden&&!x.classList.contains("open")).length;if(!left){if(window.__story)$("rStory").innerHTML=window.__story;const cb=$("coreBox");if(cb&&cb.classList.contains("wait2")){cb.classList.remove("wait2");cb.classList.add("reveal");}}},240);}
function layoutResult(){const hero=document.querySelector(".hero");if(!hero)return;
 {let dh=$("dataH");if(!dh){dh=document.createElement("h3");dh.id="dataH";dh.className="datah";dh.textContent=TR("気質と性格の文字くらべ");}
  const q=x=>typeof x==="string"?hero.querySelector(x):x;
  ["#rSrc","#rStory",".nicks","#coreBox","#funBox","#cloudFig",".shr","#kt","#recheck",dh,"#flipHint","#flip","#flipAll",".hgap","#rSum",".revw"].map(q).filter(Boolean).forEach(e=>hero.appendChild(e));}
 const mk=(id,title)=>{let d=$(id);if(!d){d=document.createElement("details");d.id=id;d.className="card more";d.innerHTML='<summary><h2>'+title+'</h2></summary><div class="mbody"></div>';}return d;};
 const dK=mk("dKarte",TR("性格カルテ")),dH=mk("dHints",TR("悩みと仕事のヒント")),dP=mk("dPersona",TR("タイプごとのくわしい説明")),dB=mk("dBal",TR("気質の力のバランス"));
 const body=d=>d.querySelector(".mbody");
 if($("karteFig")&&$("karteFig").parentNode!==body(dK))body(dK).appendChild($("karteFig"));
 if($("gapX")&&$("gapX").parentNode!==body(dH))body(dH).prepend($("gapX"));
 if($("hints")&&$("hints").parentNode!==body(dH))body(dH).appendChild($("hints"));
 if($("persona")&&$("persona").parentNode!==body(dP))body(dP).appendChild($("persona"));
 if($("bal")&&$("bal").parentNode!==body(dB))body(dB).appendChild($("bal"));
 let at=kaiunCard(hero);[dK,dH,dP,dB,$("love"),$("partner")].forEach(el=>{if(el){at.after(el);at=el;}});
 dB.hidden=!$("bal")||$("bal").hidden;}
boot();
