// 調整ツール用：サンプル日付ごとの星の数・寒暖・身強弱を前計算して JSON に出す
require('./bazi.js');const {god,ZG}=require('./model.js');
const GODS=['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','印綬'];
const TEMP={子:-1,丑:-1,亥:-1,申:-0.5,酉:-0.5,戌:0.3,辰:-0.3,寅:0.3,卯:0.5,巳:1,午:1,未:1};
function feat(y,m,d,h,mw){const r=window.PersonBazi(y,m,d,h==null?12:h,0,h==null,1);const P=r.pillars.slice();if(h!=null)P.push(Object.assign({label:'時柱'},r.hourPillar));
 const me=r.dayMaster.stem;const g=new Array(10).fill(0);const gm=new Array(10).fill(0);let temp=0,tm=0;
 P.forEach(p=>{const isM=p.label==='月柱';if(p.label!=='日柱')g[GODS.indexOf(god(me,p.stem))]+=1;
  ZG[p.branch].forEach((s,i)=>{const gi=GODS.indexOf(god(me,s));if(i===0&&isM)gm[gi]+=1;else g[gi]+=(i===0?1:0.5);});
  if(isM)tm+=TEMP[p.branch];else temp+=TEMP[p.branch];});
 return {g,gm,temp,tm,yang:'甲丙戊庚壬'.includes(me)?1:0,strong:r.sType==='身強'?1:0,pillars:P.map(p=>p.ganzhi)};}
module.exports={feat,GODS};
if(require.main===module){const out=[];for(let t=Date.UTC(1950,0,1);t<Date.UTC(2015,0,1);t+=86400000*7){const d=new Date(t);const f=feat(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate());out.push([f.g,f.gm,+(f.temp).toFixed(2),f.tm,f.yang]);}
 require('fs').writeFileSync('sample.json',JSON.stringify(out));console.log(out.length);}
