const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    // 表（資料5 吉凶星2）
    const KAIGOU=['庚辰','庚戌','壬辰','壬戌','戊戌'];
    const ROKUBA=['壬午','癸巳'];
    const NICHIJIN=['丙午','戊午','壬子'];
    function mk(y,mo,d,hh,mi){ const p=window.PersonBazi(y,mo,d,hh,mi,false,'female',null); return (p&&p.ok)?p.pro:null; }
    // 各日柱干支ごとに、その日柱を持つ命式を1つ見つけて神殺を確認
    const byDay={};
    for(let y=1950;y<=2010 && Object.keys(byDay).length<60;y++)for(let mo=1;mo<=12;mo++)for(let d=1;d<=28;d+=1){
      const c=mk(y,mo,d,12,0); if(!c)continue; const gz=c.pillars[2].ganzhi;
      if(byDay[gz])continue; byDay[gz]=(window.shinsatsuHits?window.shinsatsuHits(c):[]).map(s=>s.split('(')[0].replace(/^年/,''));
    }
    const res={ kaigou:{miss:[],false:[]}, rokuba:{miss:[],false:[]}, nichijin:{miss:[],false:[]}, coverage:Object.keys(byDay).length };
    Object.keys(byDay).forEach(function(gz){ const hits=byDay[gz];
      const hasK=hits.indexOf('魁罡')>=0, hasR=hits.indexOf('禄馬')>=0, hasN=hits.indexOf('日刃')>=0;
      // 期待
      const expK=KAIGOU.indexOf(gz)>=0, expR=ROKUBA.indexOf(gz)>=0, expN=NICHIJIN.indexOf(gz)>=0;
      if(expK&&!hasK)res.kaigou.miss.push(gz); if(!expK&&hasK)res.kaigou.false.push(gz);
      if(expR&&!hasR)res.rokuba.miss.push(gz); if(!expR&&hasR)res.rokuba.false.push(gz);
      if(expN&&!hasN)res.nichijin.miss.push(gz); if(!expN&&hasN)res.nichijin.false.push(gz);
    });
    return res;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 吉凶星(2) 検出 vs 資料5の表 ===');
  console.log('  カバーした日柱干支の種類: ' + R.coverage + '/60');
  function line(name,o,expN){ const ok=o.miss.length===0&&o.false.length===0; console.log('  '+(ok?'✅':'❌')+' '+name+'：検出漏れ '+o.miss.length+(o.miss.length?'('+o.miss.join(',')+')':'')+' / 誤検出 '+o.false.length+(o.false.length?'('+o.false.join(',')+')':'')); }
  line('魁罡（庚辰庚戌壬辰壬戌戊戌）',R.kaigou);
  line('禄馬貴人（壬午癸巳）',R.rokuba);
  line('日刃（丙午戊午壬子）',R.nichijin);
  const allok=[R.kaigou,R.rokuba,R.nichijin].every(o=>o.miss.length===0&&o.false.length===0);
  console.log('  '+(allok?'✅ 3星すべて表どおり検出・誤検出なし':'❌ ずれあり'));
  await b.close();
})();
