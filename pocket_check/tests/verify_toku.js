const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    // ===== 資料5⑤ 吉凶星(3) を月支インデックスで符号化 =====
    const 月支=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const TENTOKU  ={子:'巳',丑:'庚',寅:'丁',卯:'申',辰:'壬',巳:'辛',午:'亥',未:'甲',申:'癸',酉:'寅',戌:'丙',亥:'乙'};
    const GETTOKU  ={子:'壬',丑:'庚',寅:'丙',卯:'甲',辰:'壬',巳:'庚',午:'丙',未:'甲',申:'壬',酉:'庚',戌:'丙',亥:'甲'};
    const TENTOKUGO={子:'申',丑:'乙',寅:'壬',卯:'巳',辰:'丁',巳:'丙',午:'寅',未:'己',申:'戊',酉:'亥',戌:'辛',亥:'庚'};
    const GETTOKUGO={子:'丁',丑:'乙',寅:'辛',卯:'己',辰:'丁',巳:'乙',午:'辛',未:'己',申:'丁',酉:'乙',戌:'辛',亥:'己'};
    const KAGAI    ={子:'辰',丑:'丑',寅:'戌',卯:'未',辰:'辰',巳:'丑',午:'戌',未:'未',申:'辰',酉:'丑',戌:'戌',亥:'未'}; // 華蓋（表＝月支基準）
    const MU       ={申:'辰',子:'辰',辰:'辰',寅:'戌',午:'戌',戌:'戌',巳:'丑',酉:'丑',丑:'丑',亥:'未',卯:'未',未:'未'}; // 各支の三合墓
    const STEMS=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    function norm(x){return x.replace('徳','德');}

    function mk(y,mo,d,hh,mi,sex){ const p=window.PersonBazi(y,mo,d,hh,mi,false,sex,null); return (p&&p.ok)?p.pro:null; }

    const res={ toku:{checked:0,bad:[]}, kagai:{checked:0, engMatchNichi:0, engMatchGetsu:0, diffBase:0, samples:[]} };

    for(let y=1950;y<=2010;y+=1){ ['female','male'].forEach(function(sex){ [[2,15],[5,15],[8,15],[11,15]].forEach(function(md){
      const c=mk(y,md[0],md[1],12,0,sex); if(!c)return;
      const branches=c.pillars.map(function(p){return p.branch;});
      const stems=c.pillars.map(function(p){return p.stem;});
      const mb=c.pillars[1].branch, db=c.pillars[2].branch;
      const hits=(window.shinsatsuHits?window.shinsatsuHits(c):[]).map(function(s){return norm(s.split('(')[0].replace(/^年/,''));});
      const has=function(nm){return hits.indexOf(norm(nm))>=0;};

      // 天德/月德/天德合/月德合（月支基準・干は天干列, 支は地支列と照合）
      [['天德貴人',TENTOKU],['月德貴人',GETTOKU],['天德合',TENTOKUGO],['月德合',GETTOKUGO]].forEach(function(pair){
        const t=pair[1][mb]; if(!t)return;
        const pool=(STEMS.indexOf(t)>=0)?stems:branches;
        const expPresent=pool.indexOf(t)>=0;
        const got=has(pair[0]);
        res.toku.checked++;
        if(expPresent!==got && res.toku.bad.length<12) res.toku.bad.push(y+'/'+md[0]+' '+sex+' 月支'+mb+' '+pair[0]+' target'+t+' 期待'+(expPresent?'あり':'なし')+' engine'+(got?'あり':'なし'));
      });

      // 華蓋：エンジン(日支基準) vs 表(月支基準)
      const engKagai=has('華蓋');
      const expNichi = branches.indexOf(MU[db])>=0;   // 日支基準（＝エンジンの想定）
      const expGetsu = branches.indexOf(MU[mb])>=0;   // 月支基準（＝表の想定）
      res.kagai.checked++;
      if(engKagai===expNichi) res.kagai.engMatchNichi++;
      if(engKagai===expGetsu) res.kagai.engMatchGetsu++;
      if(expNichi!==expGetsu){ res.kagai.diffBase++; if(res.kagai.samples.length<8) res.kagai.samples.push(y+'/'+md[0]+' 月支'+mb+'(墓'+MU[mb]+') 日支'+db+'(墓'+MU[db]+') → 月支基準'+(expGetsu?'華蓋':'なし')+' / 日支基準'+(expNichi?'華蓋':'なし')+' / engine'+(engKagai?'華蓋':'なし')); }
    }); }); }
    return res;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 天徳貴人・月徳貴人・天徳合・月徳合（月支基準）vs 資料5⑤ ===');
  console.log('  検査 '+R.toku.checked+' / 不一致 '+R.toku.bad.length);
  R.toku.bad.forEach(x=>console.log('   ❌ '+x));
  console.log('  '+(R.toku.bad.length===0?'✅ 4種すべて表どおり検出（値・干支の別・検出とも一致）':'❌ 不一致あり'));

  console.log('\n=== 華蓋：エンジンの基準は日支か月支か ===');
  console.log('  検査 '+R.kagai.checked+' / エンジン=日支基準と一致 '+R.kagai.engMatchNichi+' / エンジン=月支基準と一致 '+R.kagai.engMatchGetsu);
  console.log('  日支基準と月支基準で結果が割れる命式 '+R.kagai.diffBase+' 件');
  R.kagai.samples.forEach(x=>console.log('   ・ '+x));
  console.log('  → '+(R.kagai.engMatchNichi===R.kagai.checked?'エンジンは【日支基準】で華蓋を判定（資料の表は月支基準なので、基準が異なる）':'（要精査）'));

  await b.close();
})();
