const fs=require('fs');function L(f){const window={};eval(fs.readFileSync(f,'utf8'));return window.Bazi;}
const V=L('v184_bazi.js'),P=L('fx/pro-bazi.js');
let seed=3;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
const key=c=>JSON.stringify([c.pillars.map(p=>p.ganzhi+p.tenStar+p.terrain+p.hiddenStems.map(h=>h.stem+h.tenStar+(h.ling?1:0)).join('')),c.startFortune.years,c.startFortune.months,c.startFortune.forward,c.decadeFortunes.map(x=>x.ganzhi+x.startAge+x.months+x.startYear+x.startMonth+x.tenStar+x.terrain),c.annualFortunes.slice(0,5).map(a=>a.year+a.ganzhi+a.tenStar),c.fiveElements,c.genmei&&c.genmei.tenStar,c.now.daeunIndex,c.now.year]);
let n=0,d=0,ex=[];
for(let k=0;k<20000;k++){
  const o={year:1930+Math.floor(rnd()*95),month:1+Math.floor(rnd()*12),day:1+Math.floor(rnd()*28),hour:Math.floor(rnd()*24),minute:Math.floor(rnd()*60),sex:rnd()<.5?'male':'female',correctionMode:'none',stdMer:135};
  if(k%2){o.correctionMode='full';o.longitude=129+rnd()*17;}
  const a=V.computeChart(o),b=P.computeChart(o);n++;
  if(key(a)!==key(b)){d++; if(ex.length<3)ex.push(JSON.stringify(o));}
}
console.log('件数',n,'不一致',d,ex);
