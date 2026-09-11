const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    // ===== 資料5⑥ 吉凶星(4)：年支・日支基準（隔角は年→日）=====
    const KANCHI ={子:'酉',丑:'午',寅:'卯',卯:'子',辰:'酉',巳:'午',午:'卯',未:'子',申:'酉',酉:'午',戌:'卯',亥:'子'};
    const EKIBA  ={子:'寅',丑:'亥',寅:'申',卯:'巳',辰:'寅',巳:'亥',午:'申',未:'巳',申:'寅',酉:'亥',戌:'申',亥:'巳'};
    const GOSATU ={子:'巳',丑:'寅',寅:'亥',卯:'申',辰:'巳',巳:'寅',午:'亥',未:'申',申:'巳',酉:'寅',戌:'亥',亥:'申'};
    const BOJIN  ={子:'亥',丑:'申',寅:'巳',卯:'寅',辰:'亥',巳:'申',午:'巳',未:'寅',申:'亥',酉:'申',戌:'巳',亥:'寅'};
    const KETSU  ={子:'戌',丑:'酉',寅:'申',卯:'未',辰:'午',巳:'巳',午:'辰',未:'卯',申:'寅',酉:'丑',戌:'子',亥:'亥'};
    const SHUGOK ={子:'午',丑:'卯',寅:'子',卯:'酉',辰:'午',巳:'卯',午:'子',未:'酉',申:'午',酉:'卯',戌:'子',亥:'酉'};
    const KAKKAKU={子:'卯',丑:'卯',寅:'午',卯:'午',辰:'午',巳:'酉',午:'酉',未:'酉',申:'子',酉:'子',戌:'子',亥:'卯'};
    const STARS = [['咸池',KANCHI],['驛馬',EKIBA],['劫殺',GOSATU],['亡神',BOJIN],['血刃',KETSU],['囚獄',SHUGOK]];
    function norm(x){return x.replace('駅','驛');}

    function mk(y,mo,d,hh,mi,sex){ const p=window.PersonBazi(y,mo,d,hh,mi,false,sex,null); return (p&&p.ok)?p.pro:null; }

    const res={ six:{checked:0,missed:[],extra:[]}, kaku:{checked:0,bad:[]}, covered:{} };

    for(let y=1950;y<=2012;y+=1){ ['female','male'].forEach(function(sex){ [[2,15],[5,15],[8,15],[11,15]].forEach(function(md){
      const c=mk(y,md[0],md[1],12,0,sex); if(!c)return;
      const branches=c.pillars.map(function(p){return p.branch;});
      const yb=c.pillars[0].branch, db=c.pillars[2].branch;
      res.covered[yb]=1; res.covered[db]=1;
      const hits=(window.shinsatsuHits?window.shinsatsuHits(c):[]);

      // 6星：日支基準 + 年支基準 の合併集合（star:targetBranch）
      const exp=new Set(), eng=new Set();
      STARS.forEach(function(st){ const nm=st[0], tbl=st[1];
        [tbl[db], tbl[yb]].forEach(function(t){ if(t && branches.indexOf(t)>=0) exp.add(nm+':'+t); });
      });
      hits.forEach(function(h){ const nm=norm(h.split('(')[0].replace(/^年/,'')); const m=h.match(/\(年?([子丑寅卯辰巳午未申酉戌亥])\)/);
        if(['咸池','驛馬','劫殺','亡神','血刃','囚獄'].indexOf(nm)>=0 && m) eng.add(nm+':'+m[1]);
      });
      res.six.checked++;
      exp.forEach(function(k){ if(!eng.has(k) && res.six.missed.length<12) res.six.missed.push(y+'/'+md[0]+' 年'+yb+'日'+db+' 期待にありengine無し '+k); });
      eng.forEach(function(k){ if(!exp.has(k) && res.six.extra.length<12) res.six.extra.push(y+'/'+md[0]+' 年'+yb+'日'+db+' engineにあり期待無し '+k); });

      // 隔角（年→日）
      const expKaku = (KAKKAKU[yb]===db);
      const engKaku = hits.some(function(h){return h.indexOf('隔角')===0;});
      res.kaku.checked++;
      if(expKaku!==engKaku && res.kaku.bad.length<12) res.kaku.bad.push(y+'/'+md[0]+' 年'+yb+'日'+db+' 隔角 期待'+(expKaku?'あり':'なし')+' engine'+(engKaku?'あり':'なし'));
    }); }); }
    res.coveredN=Object.keys(res.covered).length;
    return res;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 吉凶星(4) 6星（咸池・駅馬・劫殺・亡神・血刃・囚獄）年支/日支基準 vs 資料5⑥ ===');
  console.log('  検査 '+R.six.checked+'命式 / カバーした支 '+R.coveredN+'/12 / 検出漏れ '+R.six.missed.length+' / 余分 '+R.six.extra.length);
  R.six.missed.slice(0,8).forEach(x=>console.log('   ❌(漏) '+x));
  R.six.extra.slice(0,8).forEach(x=>console.log('   ❌(余) '+x));
  console.log('  '+(R.six.missed.length===0&&R.six.extra.length===0?'✅ 6星すべて表どおり（年支・日支の両基準で完全一致）':'❌ ずれあり'));

  console.log('\n=== 隔角（年→日） vs 資料5⑥ ===');
  console.log('  検査 '+R.kaku.checked+' / 不一致 '+R.kaku.bad.length);
  R.kaku.bad.slice(0,8).forEach(x=>console.log('   ❌ '+x));
  console.log('  '+(R.kaku.bad.length===0?'✅ 隔角（年→日）表どおり':'❌ ずれあり'));

  await b.close();
})();
