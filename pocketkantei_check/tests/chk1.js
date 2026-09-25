const fs=require('fs');global.window=global;
eval(fs.readFileSync('fx/pro-bazi.js','utf8'));eval(fs.readFileSync('fx/pro-adapter.js','utf8'));
const G='甲乙丙丁戊己庚辛壬癸',Z='子丑寅卯辰巳午未申酉戌亥';const idx=g=>{for(let n=0;n<60;n++)if(G[n%10]===g[0]&&Z[n%12]===g[1])return n;};
let seed=5;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
let bad=0,hidden=0,n=10000;
for(let k=0;k<n;k++){const y=1930+Math.floor(rnd()*95),m=1+Math.floor(rnd()*12),d=1+Math.floor(rnd()*28),h=Math.floor(rnd()*24),sx=rnd()<.5?'male':'female';
 const c=PersonBazi(y,m,d,h,0,false,sx,{lon:139.69,mer:135}).pro, md=c.monthDecade, d0=c.decadeFortunes[0], sf=c.startFortune;
 if(!md){hidden++; if(sf.years||sf.months)bad++; continue;}
 const ok= md.ganzhi===c.pillars[1].ganzhi && md.startAge===0 && md.endAge===sf.years && md.endMonths===sf.months
   && d0.startAge===sf.years && d0.months===sf.months
   && ((idx(d0.ganzhi)-idx(md.ganzhi)+60)%60===(sf.forward?1:59))
   && c.decadeFortunes.every((x,i)=>i===0||((idx(x.ganzhi)-idx(c.decadeFortunes[i-1].ganzhi)+60)%60===(sf.forward?1:59)) && x.startAge===sf.years+10*i);
 if(!ok){bad++; if(bad<4)console.log('NG',y,m,d,h,md.ganzhi,d0.ganzhi,sf);}
}
console.log('件数',n,'NG',bad,'立運0歳0ヶ月(月柱期間ゼロ)',hidden);
