// 生まれつきタイプの星の寄せ方を、答え合わせの人に合うように自動で探す
const {feat}=require('./sample.js');
const GODS=['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','印綬'];
const AXK=['EI','SN','TF','JP'],LET={EI:'EI',SN:'SN',TF:'TF',JP:'JP'};
const PEOPLE=[['2008-03-28','INFP/ENFP'],['1981-06-10','INFJ'],['2006-06-07','INFP'],['2007-09-18','ENFP'],['1981-07-30','ISTP'],['2006-05-27','ENFP'],['2007-11-01','INFJ'],['2007-10-11','ENTP'],['2007-05-20','ISFP/ESTP'],['2007-09-07','ESFP']];
// 四柱推命の意味から見た初期値（+＝E/S/T/J、−＝I/N/F/P）
const PRIOR={EI:{食神:1,傷官:1,偏財:1,正財:1,劫財:1,偏官:0.5,印綬:-1,偏印:-1,比肩:-1},
 SN:{偏財:1,正財:1,正官:1,比肩:0.5,偏印:-1,傷官:-1,印綬:-0.5,食神:-0.5},
 TF:{偏官:1,正官:1,偏財:0.5,劫財:0.5,食神:-1,印綬:-1,正財:-0.5,傷官:-0.5},
 JP:{正官:1,正財:1,印綬:1,比肩:0.5,偏官:-1,偏財:-1,傷官:-1,劫財:-1,偏印:-0.5}};
const sample=require('./sample.json').map(r=>({g:r[0],gm:r[1],temp:r[2],tm:r[3],yang:r[4]}));
const ppl=PEOPLE.map(([d,t])=>{const [y,m,dd]=d.split('-').map(Number);return {d,f:feat(y,m,dd),ts:t.split('/')};});
function score(f,w,k,M,T){let s=0;for(let i=0;i<10;i++){const x=w[k][GODS[i]]||0;if(x)s+=x*(f.g[i]+M*f.gm[i]);}if(k==='TF')s-=T*(f.temp+M*f.tm);return s;}
function evalCfg(c,people){const med={};for(const k of AXK){const a=sample.map(f=>score(f,c.w,k,c.M,c.T)).sort((x,y)=>x-y);med[k]=a[a.length>>1];}
 const tb=f=>({EI:f.yang?1e-3:-1e-3,SN:1e-4,TF:1e-4,JP:1e-4});
 const typeOf=f=>AXK.map(k=>{const v=score(f,c.w,k,c.M,c.T)-med[k]+tb(f)[k];return v>0?LET[k][0]:LET[k][1];}).join('');
 let fix=0,fixT=0,sw=0,swT=0;for(const p of people){const t=typeOf(p.f);for(let i=0;i<4;i++){const set=[...new Set(p.ts.map(x=>x[i]))];if(set.length>1){swT++;if(set.includes(t[i]))sw++;}else{fixT++;if(set[0]===t[i])fix++;}}}
 const cnt={};for(const f of sample){const t=typeOf(f);cnt[t]=(cnt[t]||0)+1;}let imb=0,minp=1;
 for(const a of 'EI')for(const b of 'SN')for(const cc of 'TF')for(const d of 'JP'){const p=(cnt[a+b+cc+d]||0)/sample.length;minp=Math.min(minp,p);imb+=Math.max(0,0.03-p)*100+Math.max(0,p-0.12)*50;}
 return {fix,fixT,sw,swT,imb,minp,med,typeOf};}
function objective(c,people){const e=evalCfg(c,people);let dev=0;for(const k of AXK)for(const g of GODS)dev+=Math.abs((c.w[k][g]||0)-(PRIOR[k][g]||0));return e.fix+0.5*e.sw-0.6*e.imb-0.08*dev;}
function clone(c){return JSON.parse(JSON.stringify(c));}
const VALS=[-1,-0.5,0,0.5,1];
function fitOn(people,seed){let rnd=seed;const R=()=>((rnd=(rnd*1103515245+12345)&0x7fffffff)/0x7fffffff);
 let best={w:clone(PRIOR),M:3,T:1},bs=objective(best,people);
 for(let it=0;it<6;it++){let improved=false;
  const order=[];for(const k of AXK)for(const g of GODS)order.push([k,g]);order.sort(()=>R()-0.5);
  for(const [k,g] of order){const pr=PRIOR[k][g]||0;for(const v of VALS){if(pr!==0&&v!==0&&Math.sign(v)!==Math.sign(pr))continue; // 意味と逆向きにはしない
    const c=clone(best);c.w[k][g]=v;const s=objective(c,people);if(s>bs+1e-9){best=c;bs=s;improved=true;}}}
  for(const M of [1,2,3,4])for(const T of [0,0.5,1,1.5,2]){const c=clone(best);c.M=M;c.T=T;const s=objective(c,people);if(s>bs+1e-9){best=c;bs=s;improved=true;}}
  if(!improved)break;}
 return best;}
if(require.main===module){
 const base={w:clone(PRIOR),M:3,T:1};const e0=evalCfg(base,ppl);console.log('初期(意味どおり)',`固定 ${e0.fix}/${e0.fixT}`,`揺れ ${e0.sw}/${e0.swT}`,'最少タイプ',(e0.minp*100).toFixed(1)+'%');
 let best=null,bo=-1e9;for(const sd of [1,7,42,99,123,2024,31337]){const c=fitOn(ppl,sd);const o=objective(c,ppl);if(o>bo){bo=o;best=c;}}
 const e=evalCfg(best,ppl);console.log('調整後',`固定 ${e.fix}/${e.fixT}`,`揺れ ${e.sw}/${e.swT}`,'最少タイプ',(e.minp*100).toFixed(1)+'%','M',best.M,'T',best.T);
 ppl.forEach(p=>console.log(' ',p.d,p.ts.join('/'),'→',e.typeOf(p.f)));
 // 1人ずつ外して当たる力を確認
 let lf=0,lt=0;for(let i=0;i<ppl.length;i++){const tr=ppl.filter((_,j)=>j!==i);const c=fitOn(tr,42);const ev=evalCfg(c,[ppl[i]]);lf+=ev.fix;lt+=ev.fixT;}
 console.log('1人ずつ外した確認',`${lf}/${lt}`);
 require('fs').writeFileSync('fitted.json',JSON.stringify(best,null,1));}
module.exports={evalCfg,fitOn,PRIOR,ppl};
