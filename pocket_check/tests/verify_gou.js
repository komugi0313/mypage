const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    // ===== 資料5⑧「合」表を符号化 =====
    const RIKUGO = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'}; // 六合(支合)
    const KANGO  = {甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};                 // 干合
    const SANGO  = [['申','子','辰','水'],['亥','卯','未','木'],['寅','午','戌','火'],['巳','酉','丑','金']];            // 三合
    const HOUGO  = [['寅','卯','辰','木'],['巳','午','未','火'],['申','酉','戌','金'],['亥','子','丑','水']];            // 方合
    const out = { A:{bad:[]}, B:{checked:0, missed:[], extra:[] } };

    // ---- A) アプリの window.GANGOU / window.RIKUGOU が表と一致 ----
    (function(){
      const G=window.GANGOU, RK=window.RIKUGOU;
      Object.keys(KANGO).forEach(function(k){ if(!G || G[k]!==KANGO[k]) out.A.bad.push('干合['+k+'] app='+(G&&G[k])+' 表='+KANGO[k]); });
      Object.keys(RIKUGO).forEach(function(k){ if(!RK || RK[k]!==RIKUGO[k]) out.A.bad.push('六合['+k+'] app='+(RK&&RK[k])+' 表='+RIKUGO[k]); });
    })();

    // ---- B) エンジン natalRelationsX vs 表から独立計算した期待値（合のみ） ----
    function mk(y,mo,d,hh,mi){ const p=window.PersonBazi(y,mo,d,hh,mi,false,'female',null); return (p&&p.ok)?p.pro:null; }
    function expectedGou(br){ // br = 4支（重複あり）
      const set=new Set();
      // 六合（総当たり）
      for(let i=0;i<br.length;i++)for(let j=i+1;j<br.length;j++){ if(RIKUGO[br[i]]===br[j]) set.add('六合:'+[br[i],br[j]].sort().join('')); }
      // 三合 / 半会（3支中の何支あるか）
      SANGO.forEach(function(g){ const need=g.slice(0,3); const hit=need.filter(function(x){return br.indexOf(x)>=0;});
        if(hit.length>=3) set.add('三合:'+g[3]); else if(hit.length===2) set.add('半会:'+g[3]); });
      // 方合（3支そろい）
      HOUGO.forEach(function(g){ const need=g.slice(0,3); const hit=need.filter(function(x){return br.indexOf(x)>=0;});
        if(hit.length>=3) set.add('方合:'+g[3]); });
      return set;
    }
    function engineGou(rels){
      const set=new Set();
      rels.forEach(function(r){
        if(r.kind==='六合') set.add('六合:'+r.branches.slice().sort().join(''));
        else if(r.kind==='三合') set.add('三合:'+r.el);
        else if(r.kind==='半会'||r.kind==='大半会') set.add('半会:'+r.el);
        else if(r.kind==='方合') set.add('方合:'+r.el);
      });
      return set;
    }
    for(let y=1950;y<=2015;y+=1){ for(let mo of [1,3,5,7,9,11]){ for(let d of [3,9,15,21,27]){ for(let hh of [1,9,17]){
      const c=mk(y,mo,d,hh,30); if(!c)continue;
      const br=(c.pillars||[]).map(function(p){return p.ganzhi[1];});
      const rels=window.natalRelationsX?window.natalRelationsX(c):[];
      const exp=expectedGou(br), eng=engineGou(rels);
      out.B.checked++;
      exp.forEach(function(k){ if(!eng.has(k)) out.B.missed.push(y+'/'+mo+'/'+d+' '+hh+'時 支'+br.join('')+' 期待にありエンジン無し: '+k); });
      eng.forEach(function(k){ if(!exp.has(k)) out.B.extra.push(y+'/'+mo+'/'+d+' '+hh+'時 支'+br.join('')+' エンジンにあり期待無し: '+k); });
    }}}}
    return out;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== A) アプリの干合/六合 table vs 資料5⑧の表 ===');
  console.log('  不一致 ' + R.A.bad.length);
  R.A.bad.forEach(x=>console.log('   ❌ '+x));
  console.log('  '+(R.A.bad.length===0?'✅ 干合5・六合6 とも表と一致':'❌ 不一致あり'));

  console.log('\n=== B) エンジン natalRelationsX vs 表からの独立計算（六合/三合/半会/方合）===');
  console.log('  検査 ' + R.B.checked + '命式 / 検出漏れ ' + R.B.missed.length + ' / 余分な検出 ' + R.B.extra.length);
  R.B.missed.slice(0,10).forEach(x=>console.log('   ❌(漏れ) '+x));
  R.B.extra.slice(0,10).forEach(x=>console.log('   ❌(余分) '+x));
  console.log('  '+(R.B.missed.length===0 && R.B.extra.length===0 ? '✅ 全命式でエンジンの合検出が表と完全一致' : '❌ ずれあり'));

  await b.close();
})();
