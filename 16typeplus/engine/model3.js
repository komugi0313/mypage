require('./bazi.js');
const {god,ZG}=require('./model.js');
const ST='甲乙丙丁戊己庚辛壬癸',ELN='木火土金水';
const elOf=s=>Math.floor(ST.indexOf(s)/2);
const TEMP={子:-1,丑:-1,亥:-1,申:-0.5,酉:-0.5,戌:0.3,辰:-0.3,寅:0.3,卯:0.5,巳:1,午:1,未:1};
function raw(y,m,d,h){const r=window.PersonBazi(y,m,d,h==null?12:h,0,h==null,1);
 const P=r.pillars.slice();if(h!=null)P.push(Object.assign({label:'時柱'},r.hourPillar));
 const me=r.dayMaster.stem;const g={},el=[0,0,0,0,0];let temp=0;
 P.forEach(p=>{const isM=p.label==='月柱';
  el[elOf(p.stem)]+=1; if(p.label!=='日柱'){const x=god(me,p.stem);g[x]=(g[x]||0)+1;}
  ZG[p.branch].forEach((s,i)=>{const w=i===0?(isM?3:1):0.5;el[elOf(s)]+=w;const x=god(me,s);g[x]=(g[x]||0)+w;});
  temp+=TEMP[p.branch]*(isM?3:1);});
 const G=k=>k.reduce((a,x)=>a+(g[x]||0),0);
 return {me,P,g,el,temp,
  EI:G(['食神','傷官','偏財','正財'])-G(['比肩','劫財','偏印','印綬']),   // 外へ流れる星 − 自分に向かう星
  SN:(el[2]+el[3])-(el[0]+el[4]),                                        // 土金（形・現実） − 木水（発想・知恵）
  TF:(el[3]+el[4])-(el[0]+el[1])-temp*0.5,                               // 金水・寒 − 木火・暖
  JP:G(['正官','正財','印綬','劫財'].filter(()=>true).slice(0,3).concat(['比肩']))-G(['偏官','偏財','偏印','傷官','劫財']).valueOf() // 正の星 − 偏の星
 };}
module.exports={raw};
