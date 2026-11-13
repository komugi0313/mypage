const {run}=require('./model.js');const MED=require('./med.json');
const ST='甲乙丙丁戊己庚辛壬癸';
function run2(y,m,d,h){const R=run(y,m,d,h);const s=ST.indexOf(R.me),yang=s%2===0,el=Math.floor(s/2);
 const tb={EI:yang?0.25:-0.25, SN:(el>=2)?0.25:-0.25 /*土金水=S寄り*/, TF:(el===3||el===4)?0.25:-0.25 /*金水=T寄り*/, JP:(el===2||el===3)?0.25:-0.25 /*土金=J寄り*/};
 const t=[],pct={};for(const k of ['EI','SN','TF','JP']){const o=R.out[k];const v=(o.sa-o.sb)-MED[k]+tb[k]*0.5;t.push(v>0?o.a:o.b);pct[k]=v;}
 return Object.assign(R,{type2:t.join(''),v:pct});}
module.exports={run2};
if(require.main===module){
 for(const [y,m,d] of [[2008,3,28],[1981,6,10]]){const R=run2(y,m,d);console.log(y,m,d,R.type2,JSON.stringify(R.v));}
 const c={};let n=0;for(let t=Date.UTC(1960,0,1);t<Date.UTC(2010,0,1);t+=86400000*3){const dd=new Date(t);const R=run2(dd.getUTCFullYear(),dd.getUTCMonth()+1,dd.getUTCDate());c[R.type2]=(c[R.type2]||0)+1;n++;}
 console.log(Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+(v/n*100).toFixed(1)).join('  '));
 const ax={};for(const [k,v] of Object.entries(c))for(const ch of k)ax[ch]=(ax[ch]||0)+v;console.log(Object.entries(ax).map(([k,v])=>k+':'+(v/n*100).toFixed(0)).join(' '));}
