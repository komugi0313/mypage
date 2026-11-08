require('./bazi.js');
const ST='甲乙丙丁戊己庚辛壬癸',EL=s=>Math.floor(ST.indexOf(s)/2);
const ZG={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
function god(me,o){const a=ST.indexOf(me),b=ST.indexOf(o),em=Math.floor(a/2),eo=Math.floor(b/2),same=(a%2)===(b%2);
 const rel=eo===em?0:eo===(em+1)%5?1:eo===(em+2)%5?2:em===(eo+2)%5?3:4;return [["比肩","劫財"],["食神","傷官"],["偏財","正財"],["偏官","正官"],["偏印","印綬"]][rel][same?0:1];}
const MAP={EI:{E:["食神","傷官","偏財","正財","劫財"],I:["印綬","偏印","比肩"]},
 SN:{S:["偏財","正財","正官","比肩"],N:["偏印","傷官","印綬"]},
 TF:{T:["偏官","正官","偏財"],F:["食神","印綬","正財"]},
 JP:{J:["正官","正財","印綬","比肩"],P:["偏官","偏財","傷官","劫財"]}};
function run(y,m,d,h){const r=window.PersonBazi(y,m,d,h==null?12:h,0,h==null,1);
 const P=r.pillars.slice();if(h!=null)P.push(Object.assign({label:'時柱'},r.hourPillar));
 const me=r.dayMaster.stem,cnt={};const add=(g,w)=>cnt[g]=(cnt[g]||0)+w;
 P.forEach(p=>{if(p.label!=='日柱')add(god(me,p.stem),1);const z=ZG[p.branch];const isM=p.label==='月柱';
  z.forEach((s,i)=>add(god(me,s),i===0?(isM?3:1):0.5));});
 const out={};for(const ax in MAP){const [a,b]=Object.keys(MAP[ax]);let sa=0,sb=0;MAP[ax][a].forEach(g=>sa+=cnt[g]||0);MAP[ax][b].forEach(g=>sb+=cnt[g]||0);
  if(ax==='TF'){const mb=P.find(p=>p.label==='月柱').branch;const cold='亥子丑申酉'.includes(mb),warm='巳午未寅卯'.includes(mb);if(cold)sa+=1.5;if(warm)sb+=1.5;const f=r.five;sa+=0.3*((f['金']||0)+(f['水']||0));sb+=0.3*((f['木']||0)+(f['火']||0));}
  out[ax]={a,b,sa:+sa.toFixed(1),sb:+sb.toFixed(1),pick:sa>sb?a:sb>sa?b:'='};}
 return {pillars:P.map(p=>p.label+':'+p.ganzhi).join(' '),me,cnt,out,type:Object.values(out).map(o=>o.pick).join(''),sType:r.sType};}
module.exports={run,god,ZG};
if(require.main===module){for(const [y,m,d] of [[2008,3,28],[1981,6,10]]){const R=run(y,m,d);console.log(y,m,d,R.pillars,'日干',R.me,R.sType);console.log(' 星',JSON.stringify(R.cnt));for(const k in R.out){const o=R.out[k];console.log(' ',k,o.a,o.sa,'vs',o.b,o.sb,'→',o.pick);}console.log(' 新タイプ',R.type);}}
