const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    // ===== 資料5⑦ 刑冲破害 を符号化 =====
    const CHONG={子:'午',丑:'未',寅:'申',卯:'酉',辰:'戌',巳:'亥',午:'子',未:'丑',申:'寅',酉:'卯',戌:'辰',亥:'巳'};
    const HA   ={子:'酉',丑:'辰',寅:'亥',卯:'午',辰:'丑',巳:'申',午:'卯',未:'戌',申:'巳',酉:'子',戌:'未',亥:'寅'};
    const GAI  ={子:'未',丑:'午',寅:'巳',卯:'辰',辰:'卯',巳:'寅',午:'丑',未:'子',申:'亥',酉:'戌',戌:'酉',亥:'申'};
    // 刑：子卯相刑／寅巳申・丑戌未の三刑／自刑=辰午酉亥
    const KEI2={子:'卯',卯:'子'};
    const KEI3=[['寅','巳','申'],['丑','戌','未']];
    const JIKEI={辰:1,午:1,酉:1,亥:1};
    function isKei(a,b){ if(KEI2[a]===b)return true; if(a===b&&JIKEI[a])return true; return KEI3.some(function(g){return a!==b&&g.indexOf(a)>=0&&g.indexOf(b)>=0;}); }

    function mk(y,mo,d,hh,mi,sex){ const p=window.PersonBazi(y,mo,d,hh,mi,false,sex,null); return (p&&p.ok)?p.pro:null; }
    function expected(br){ const set=new Set();
      for(let i=0;i<br.length;i++)for(let j=i+1;j<br.length;j++){ const a=br[i],bb=br[j],pr=[a,bb].sort().join('');
        if(CHONG[a]===bb) set.add('冲:'+pr);
        if(HA[a]===bb) set.add('破:'+pr);
        if(GAI[a]===bb) set.add('害:'+pr);
        if(isKei(a,bb)) set.add('刑:'+pr);
      } return set; }
    function engineSet(rels){ const set=new Set();
      rels.forEach(function(r){ if(['冲','刑','破','害'].indexOf(r.kind)>=0) set.add(r.kind+':'+(r.branches||[]).slice().sort().join('')); });
      return set; }

    const res={checked:0, missed:[], extra:[]};
    for(let y=1950;y<=2015;y+=1){ for(let mo of [1,3,5,7,9,11]){ for(let d of [3,9,15,21,27]){ for(let hh of [1,9,17]){
      const c=mk(y,mo,d,hh,30,'female'); if(!c)continue;
      const br=(c.pillars||[]).map(function(p){return p.ganzhi[1];});
      const rels=window.natalRelationsX?window.natalRelationsX(c):[];
      const exp=expected(br), eng=engineSet(rels);
      res.checked++;
      exp.forEach(function(k){ if(!eng.has(k) && res.missed.length<12) res.missed.push(y+'/'+mo+'/'+d+' 支'+br.join('')+' 期待にありengine無し '+k); });
      eng.forEach(function(k){ if(!exp.has(k) && res.extra.length<12) res.extra.push(y+'/'+mo+'/'+d+' 支'+br.join('')+' engineにあり期待無し '+k); });
    }}}}
    return res;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 刑冲破害（命式内・全ペア）vs 資料5⑦ ===');
  console.log('  検査 '+R.checked+'命式 / 検出漏れ '+R.missed.length+' / 余分な検出 '+R.extra.length);
  R.missed.slice(0,10).forEach(x=>console.log('   ❌(漏) '+x));
  R.extra.slice(0,10).forEach(x=>console.log('   ❌(余) '+x));
  console.log('  '+(R.missed.length===0&&R.extra.length===0?'✅ 刑・冲・破・害すべて表と完全一致（全命式）':'❌ ずれあり'));

  await b.close();
})();
