const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    // ===== 資料5③ 吉凶星(1)：日干ベース =====
    const T = {
      '天乙貴人':{甲:['丑','未'],乙:['子','申'],丙:['酉','亥'],丁:['酉','亥'],戊:['丑','未'],己:['子','申'],庚:['丑','未'],辛:['寅','午'],壬:['卯','巳'],癸:['卯','巳']},
      '太極貴人':{甲:['子','午'],乙:['子','午'],丙:['卯','酉'],丁:['卯','酉'],戊:['丑','辰','未','戌'],己:['丑','辰','未','戌'],庚:['寅','亥'],辛:['寅','亥'],壬:['巳','申'],癸:['巳','申']},
      '福星貴人':{甲:['子','寅'],乙:['丑','亥'],丙:['子','戌'],丁:['酉'],戊:['申'],己:['未'],庚:['午'],辛:['巳'],壬:['辰'],癸:['卯']},
      '文昌貴人':{甲:['巳'],乙:['午'],丙:['申'],丁:['酉'],戊:['申'],己:['酉'],庚:['亥'],辛:['子'],壬:['寅'],癸:['卯']},
      '羊刃':{甲:['卯'],乙:['辰'],丙:['午'],丁:['未'],戊:['午'],己:['未'],庚:['酉'],辛:['戌'],壬:['子'],癸:['丑']},
      '飛刃':{甲:['酉'],乙:['戌'],丙:['子'],丁:['丑'],戊:['子'],己:['丑'],庚:['卯'],辛:['辰'],壬:['午'],癸:['未']},
      '暗禄':{甲:['亥'],乙:['戌'],丙:['申'],丁:['未'],戊:['申'],己:['未'],庚:['巳'],辛:['辰'],壬:['寅'],癸:['丑']},
      '金与禄':{甲:['辰'],乙:['巳'],丙:['未'],丁:['申'],戊:['未'],己:['申'],庚:['戌'],辛:['亥'],壬:['丑'],癸:['寅']},
      '紅艶':{甲:['午'],乙:['申'],丙:['寅'],丁:['未'],戊:['辰'],己:['辰'],庚:['戌'],辛:['酉'],壬:['子'],癸:['申']}
    };
    function normName(x){ return x==='大極貴人'?'太極貴人':x; }
    function mk(y,mo,d,hh,mi,sex){ const p=window.PersonBazi(y,mo,d,hh,mi,false,sex,null); return (p&&p.ok)?p.pro:null; }

    const res={ checked:0, bad:[], kouen:{bad:[]} };
    const STEMS=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    // KOUEN(アプリ) が表と一致するか
    STEMS.forEach(function(s){ if(!window.KOUEN||window.KOUEN[s]!==T['紅艶'][s][0]) res.kouen.bad.push('紅艶['+s+'] app='+(window.KOUEN&&window.KOUEN[s])+' 表='+T['紅艶'][s][0]); });

    for(let y=1950;y<=2012;y+=1){ ['female','male'].forEach(function(sex){ [[2,15],[5,15],[8,15],[11,15]].forEach(function(md){
      const c=mk(y,md[0],md[1],12,0,sex); if(!c)return;
      const ds=c.pillars[2].ganzhi[0], branches=c.pillars.map(function(p){return p.branch;});
      const hits=(window.shinsatsuHits?window.shinsatsuHits(c):[]).map(function(s){return normName(s.split('(')[0].replace(/^年/,''));});
      Object.keys(T).forEach(function(star){ const tg=T[star][ds]; if(!tg)return;
        const expPresent = tg.some(function(bB){return branches.indexOf(bB)>=0;});
        const got = hits.indexOf(normName(star))>=0;
        res.checked++;
        if(expPresent!==got && res.bad.length<15) res.bad.push(y+'/'+md[0]+' 日干'+ds+' '+star+' target'+tg.join('')+' 期待'+(expPresent?'あり':'なし')+' engine'+(got?'あり':'なし'));
      });
    }); }); }
    return res;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 吉凶星(1) 9星（日干ベース）vs 資料5③ ===');
  console.log('  検査 '+R.checked+' / 不一致 '+R.bad.length);
  R.bad.slice(0,15).forEach(x=>console.log('   ❌ '+x));
  console.log('  '+(R.bad.length===0?'✅ 天乙/太極/福星/文昌/羊刃/飛刃/暗禄/金与禄/紅艶 すべて表どおり':'❌ 不一致あり'));
  console.log('\n=== 恋愛用KOUENテーブル（アプリ） vs 資料5③紅艶 ===');
  console.log('  '+(R.kouen.bad.length===0?'✅ 一致（乙=申に修正済み）':'❌ '+R.kouen.bad.join(' / ')));
  await b.close();
})();
