const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const r = await pg.evaluate(() => {
    // 独立計算：日柱の旬空（空亡2支）に年支が入れば生年中殺
    const STEMS=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'], BR=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    function idx60(gz){for(let n=0;n<60;n++)if(STEMS[n%10]===gz[0]&&BR[n%12]===gz[1])return n;return -1;}
    function junkuu(dayGZ){const i=idx60(dayGZ),xun=Math.floor(i/10)*10;return [BR[(xun+10)%12],BR[(xun+11)%12]];}
    let n=0,bad=[];
    for(let y=1955;y<=2010;y++)for(let mo of[1,4,7,10]){for(let d of[3,12,21,28]){
      const p=window.PersonBazi(y,mo,d,12,0,false,'female',null); if(!p||!p.ok)continue;
      const c=p.pro, yb=c.pillars[0].ganzhi[1], dayGZ=c.pillars[2].ganzhi;
      const exp=junkuu(dayGZ).indexOf(yb)>=0;
      const got=window.seinenChusatsuCard(p).length>0;
      n++; if(exp!==got && bad.length<10) bad.push(y+'/'+mo+'/'+d+' 年支'+yb+' 空亡'+junkuu(dayGZ).join('')+' 期待'+(exp?'あり':'なし')+' card'+(got?'あり':'なし'));
    }}
    return {n,bad};
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 生年中殺（年柱が空亡）の検出 vs 独立した旬空計算 ===');
  console.log('  検査 '+r.n+'件 / 不一致 '+r.bad.length);
  r.bad.forEach(x=>console.log('   ❌ '+x));
  console.log('  '+(r.bad.length===0?'✅ 年柱空亡＝生年中殺の判定が旬空と完全一致':'❌ ずれあり'));
  await b.close();
})();
