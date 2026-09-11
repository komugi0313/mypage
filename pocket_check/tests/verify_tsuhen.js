const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    // ===== 資料5「変通星」表を符号化 =====
    // 行の順（変通星）: 比肩,劫財,食神,傷官,偏財,正財,偏官,正官,偏印,印綬
    const STAR = ['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','印綬'];
    // 各日干（列）ごとに、上のSTAR順で「その星になる相手の干」を並べたもの（画像から転記）
    const TAB = {
      甲:['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'],
      乙:['乙','甲','丁','丙','己','戊','辛','庚','癸','壬'],
      丙:['丙','丁','戊','己','庚','辛','壬','癸','甲','乙'],
      丁:['丁','丙','己','戊','辛','庚','癸','壬','乙','甲'],
      戊:['戊','己','庚','辛','壬','癸','甲','乙','丙','丁'],
      己:['己','戊','辛','庚','癸','壬','乙','甲','丁','丙'],
      庚:['庚','辛','壬','癸','甲','乙','丙','丁','戊','己'],
      辛:['辛','庚','癸','壬','乙','甲','丁','丙','己','戊'],
      壬:['壬','癸','甲','乙','丙','丁','戊','己','庚','辛'],
      癸:['癸','壬','乙','甲','丁','丙','己','戊','辛','庚']
    };
    const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    // expected[日干][相手干] = 星名
    const EXP = {};
    STEMS.forEach(function(day){ EXP[day]={}; STAR.forEach(function(st,i){ EXP[day][TAB[day][i]]=st; }); });
    // 正印表記ゆれの正規化
    function norm(x){ return x==='正印'?'印綬':x; }

    const res = { tenGodOf:{checked:0,bad:[]}, engine:{checked:0,bad:[], pairs:{}} };

    // ---- A) アプリの tenGodOf() vs 表（全100通り） ----
    STEMS.forEach(function(day){ STEMS.forEach(function(other){
      res.tenGodOf.checked++;
      const mine=norm(window.tenGodOf(day,other));
      const exp=EXP[day][other];
      if(mine!==exp) res.tenGodOf.bad.push('日干'+day+' 相手'+other+' tenGodOf='+mine+' 表='+exp);
    }); });

    // ---- B) エンジンの tenStar vs 表（実際の命式から (日干,柱干,tenStar) を収集） ----
    function mk(y,mo,d,hh,mi){ const p=window.PersonBazi(y,mo,d,hh,mi,false,'female',null); return (p&&p.ok)?p.pro:null; }
    const seenPairs={};
    for(let y=1950;y<=2015;y+=1){ for(let mo of [1,3,4,6,8,10,12]){ for(let hh of [1,7,13,20]){
      const c=mk(y,mo,15,hh,30); if(!c)continue; const ds=c.pillars[2].ganzhi[0];
      [0,1,3].forEach(function(pi){ const pil=c.pillars[pi]; if(!pil||!pil.tenStar)return;
        const os=pil.ganzhi[0]; const key=ds+os;
        if(!seenPairs[key]){ seenPairs[key]=1; res.engine.checked++;
          const eng=norm(pil.tenStar), exp=EXP[ds][os];
          if(eng!==exp) res.engine.bad.push('日干'+ds+' 柱干'+os+' engine tenStar='+eng+' 表='+exp);
        }
      });
    }}}
    res.engine.distinctPairs = Object.keys(seenPairs).length;

    return res;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== A) アプリ tenGodOf() vs 資料5の表（全100通り）===');
  console.log('  検査 ' + R.tenGodOf.checked + '通り / 不一致 ' + R.tenGodOf.bad.length);
  R.tenGodOf.bad.slice(0,20).forEach(x => console.log('   ❌ ' + x));
  console.log('  ' + (R.tenGodOf.bad.length===0 ? '✅ 全100通り 表と一致' : '❌ 不一致あり'));

  console.log('\n=== B) エンジン tenStar vs 資料5の表（実命式から収集）===');
  console.log('  実際に出た (日干×柱干) の種類 ' + R.engine.distinctPairs + ' / 検査 ' + R.engine.checked + ' / 不一致 ' + R.engine.bad.length);
  R.engine.bad.slice(0,20).forEach(x => console.log('   ❌ ' + x));
  console.log('  ' + (R.engine.bad.length===0 ? '✅ エンジンの変通星も表と一致' : '❌ 不一致あり'));

  await b.close();
})();
