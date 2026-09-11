const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const YANG = {甲:1,丙:1,戊:1,庚:1,壬:1,乙:0,丁:0,己:0,辛:0,癸:0};
    const GZ60 = []; for(let i=0;i<60;i++) GZ60.push(STEMS[i%10]+BR[i%12]);
    function mk(y,mo,d,hh,mi,sex){ const p=window.PersonBazi(y,mo,d,hh,mi,false,sex,null); return (p&&p.ok)?p.pro:null; }

    const res = {
      seq:{checked:0, bad:[]},           // 大運干支列＝月柱±k(60甲子)
      dir:{checked:0, bad:[]},           // 順行/逆行＝年干陰陽×性別
      first:{checked:0, bad:[]},         // 第一運＝月柱
      ritsuRev:{checked:0, worst:0, over:[]} // 立運(逆行)＝setsuMin÷1440÷3
    };

    for(let y=1950;y<=2010;y+=1){ ['female','male'].forEach(function(sex){
      // 節境界を避けて 7/15, 3/20 など複数日で
      [[3,20],[6,15],[9,12],[11,25]].forEach(function(md){
        const c=mk(y,md[0],md[1],12,0,sex); if(!c||!c.startFortune||!c.decadeFortunes)return;
        const monthGZ=c.pillars[1].ganzhi, mi=GZ60.indexOf(monthGZ);
        const yStem=c.pillars[0].ganzhi[0], yang=!!YANG[yStem], male=(sex==='male');
        const expForward=(yang===male);
        const fwd=!!c.startFortune.forward;

        // 方向
        res.dir.checked++;
        if(fwd!==expForward) res.dir.bad.push(y+' '+sex+' 年干'+yStem+' engine='+(fwd?'順':'逆')+' 表='+(expForward?'順':'逆'));

        // 第一運＝月柱（アプリ daeunList の先頭）
        const dl=window.daeunList?window.daeunList(c):null;
        if(dl&&dl.items&&dl.items[0]){ res.first.checked++; if(dl.items[0].ganzhi!==monthGZ) res.first.bad.push(y+' 先頭='+dl.items[0].ganzhi+' 月柱='+monthGZ); }

        // 大運干支列：decadeFortunes[i] == 月柱 ± (i+1)
        const dir = fwd?1:-1;
        c.decadeFortunes.forEach(function(d,i){ res.seq.checked++;
          const exp=GZ60[((mi+dir*(i+1))%60+60)%60];
          if(d.ganzhi!==exp && res.seq.bad.length<10) res.seq.bad.push(y+' '+sex+' 月柱'+monthGZ+(fwd?'順':'逆')+' 第'+(i+2)+'運 engine='+d.ganzhi+' 表='+exp);
        });

        // 立運（逆行のみ精密照合）：setsuMin(前の節からの経過分)÷1440÷3 = 立運(年)
        if(!fwd && typeof c.birth?.setsuMin==='number' && c.birth.setsuMin>=0){
          const daysBack = c.birth.setsuMin/1440;
          const expMonths = daysBack/3*12;                 // = daysBack*4
          const engMonths = (c.startFortune.years||0)*12+(c.startFortune.months||0);
          const diff = Math.abs(engMonths-expMonths);
          res.ritsuRev.checked++;
          if(diff>res.ritsuRev.worst) res.ritsuRev.worst=diff;
          if(diff>1.0 && res.ritsuRev.over.length<10) res.ritsuRev.over.push(y+'/'+md[0]+'/'+md[1]+' '+sex+' engine='+engMonths.toFixed(1)+'ヶ月 期待='+expMonths.toFixed(1)+'ヶ月(経過'+daysBack.toFixed(2)+'日)');
        }
      });
    }); }
    return res;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  function line(name,o){ const ok=o.bad.length===0; console.log('  '+(ok?'✅':'❌')+' '+name+'：検査 '+o.checked+' / 不一致 '+o.bad.length); o.bad.slice(0,8).forEach(x=>console.log('       ⚠ '+x)); }
  console.log('\n=== 大運の割り出し方 検証（資料(2)）===');
  line('順行/逆行＝年干陰陽×性別', R.dir);
  line('第一運＝月柱', R.first);
  line('大運干支列＝月柱±k（60甲子を順行/逆行）', R.seq);
  console.log('  '+(R.ritsuRev.worst<=1.0?'✅':'⚠️')+' 立運(逆行)＝経過日数÷3：検査 '+R.ritsuRev.checked+' / 最大誤差 '+R.ritsuRev.worst.toFixed(2)+'ヶ月');
  R.ritsuRev.over.slice(0,8).forEach(x=>console.log('       ~ '+x));

  const allok = R.dir.bad.length===0 && R.first.bad.length===0 && R.seq.bad.length===0 && R.ritsuRev.worst<=1.0;
  console.log('\n'+(allok?'✅ 大運の割り出し（順行逆行・第一運=月柱・干支列・立運）すべて資料どおり':'❌ 要確認'));
  await b.close();
})();
