// 生まれつきの5文字（説明つき）。文字ごとに材料を分ける。
const ST='甲乙丙丁戊己庚辛壬癸',GODS=['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','印綬'];
const ZG={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','庚','戊'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
const TEMP={子:-1,丑:-1,亥:-1,申:-0.5,酉:-0.5,戌:0.3,辰:-0.3,寅:0.3,卯:0.5,巳:1,午:1,未:1};
function god(me,o){const a=ST.indexOf(me),b=ST.indexOf(o),em=a>>1,eo=b>>1,same=(a%2)===(b%2);const rel=eo===em?0:eo===(em+1)%5?1:eo===(em+2)%5?2:em===(eo+2)%5?3:4;return [['比肩','劫財'],['食神','傷官'],['偏財','正財'],['偏官','正官'],['偏印','印綬']][rel][same?0:1];}
function chart(r){ // r = PersonBazi の結果
 const P=r.pillars,me=r.dayMaster.stem,g={},el=[0,0,0,0,0];let temp=0;
 P.forEach(p=>{const M=p.label==='月柱'?3:1;el[ST.indexOf(p.stem)>>1]+=1;if(p.label!=='日柱'){const x=god(me,p.stem);g[x]=(g[x]||0)+1;}
  ZG[p.branch].forEach((s,i)=>{const w=i===0?M:0.5;el[ST.indexOf(s)>>1]+=w;const x=god(me,s);g[x]=(g[x]||0)+w;});temp+=TEMP[p.branch]*M;});
 const G=a=>a.reduce((s,x)=>s+(g[x]||0),0);
 return {g,el,temp,strong:r.sType==='身強',
  EI:G(['食神','傷官','偏財','正財'])-G(['比肩','劫財','偏印','印綬']),
  SN:(el[2]+el[3])-(el[0]+el[4]),
  TF:(el[3]+el[4])-(el[0]+el[1])-temp*0.5,
  JP:G(['正官','正財','印綬','比肩'])-G(['偏官','偏財','偏印','傷官','劫財'])};}
module.exports={chart,GODS};
if(require.main===module){require('./bazi.js');const ks=['EI','SN','TF','JP'];const D={EI:[],SN:[],TF:[],JP:[]};const rows=[];
 for(let t=Date.UTC(1950,0,1);t<Date.UTC(2015,0,1);t+=86400000*3){const d=new Date(t);const c=chart(window.PersonBazi(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),12,0,true,1));rows.push(c);ks.forEach(k=>D[k].push(c[k]));}
 const med={},q={};ks.forEach(k=>{const a=D[k].slice().sort((x,y)=>x-y);med[k]=a[a.length>>1];q[k]=[a[Math.floor(a.length*0.25)],a[Math.floor(a.length*0.75)]];});
 const L={EI:'EI',SN:'SN',TF:'TF',JP:'JP'};const cnt={};let A=0;rows.forEach(c=>{const t=ks.map(k=>(c[k]-med[k]+1e-6)>0?L[k][0]:L[k][1]).join('');cnt[t]=(cnt[t]||0)+1;if(c.strong)A++;});
 console.log('med',JSON.stringify(med),'IQR',JSON.stringify(q));console.log(Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+(v/rows.length*100).toFixed(1)).join('  '));console.log('A',(A/rows.length*100).toFixed(0)+'%');
 require('fs').writeFileSync('medC.json',JSON.stringify({med,q}));}
