const {run2}=require('./model2.js');const {raw}=require('./model3.js');const med3=require('./med3.json');
const DATA=[[2008,3,28,'INFP'],[1981,6,10,'INFJ'],[2006,6,7,'INFP'],[2007,9,18,'ENFP'],[1981,7,30,'ISTP'],[2006,5,27,'ENFP'],[2007,11,1,'INFJ'],[2007,10,11,'ENTP']];
const L={EI:['E','I'],SN:['S','N'],TF:['T','F'],JP:['J','P']},ks=['EI','SN','TF','JP'];
const tB=R=>ks.map(k=>{const v=R[k]-med3[k]+(k==='EI'?('甲丙戊庚壬'.includes(R.me)?0.01:-0.01):0.001);return v>0?L[k][0]:L[k][1];}).join('');
let sa=0,sb=0;
for(const [y,m,d,ans] of DATA){const A=run2(y,m,d),B=raw(y,m,d);const ta=A.type2,tb=tB(B);
 const ca=[...ans].filter((c,i)=>c===ta[i]).length,cb=[...ans].filter((c,i)=>c===tb[i]).length;sa+=ca;sb+=cb;
 console.log(`${y}-${m}-${d}`,A.pillars.replace(/年柱:|月柱:|日柱:/g,''),A.sType,'答',ans,'| A',ta,ca+'/4','| B',tb,cb+'/4','|星',JSON.stringify(A.cnt));}
console.log('A合計',sa+'/32','B合計',sb+'/32');
