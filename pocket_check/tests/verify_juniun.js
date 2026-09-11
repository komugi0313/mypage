const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    // ===== 資料5「十二運星」表を符号化 =====
    // 行の順（十二運）
    const JUNI = ['長生','沐浴','冠帯','建禄','帝旺','衰','病','死','墓','絶','胎','養'];
    // 各日干（列）で、上のJUNI順に「その運になる地支」を並べる（画像から転記）
    const TAB = {
      甲:['亥','子','丑','寅','卯','辰','巳','午','未','申','酉','戌'],
      乙:['午','巳','辰','卯','寅','丑','子','亥','戌','酉','申','未'],
      丙:['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'],
      丁:['酉','申','未','午','巳','辰','卯','寅','丑','子','亥','戌'],
      戊:['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'],
      己:['酉','申','未','午','巳','辰','卯','寅','丑','子','亥','戌'],
      庚:['巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰'],
      辛:['子','亥','戌','酉','申','未','午','巳','辰','卯','寅','丑'],
      壬:['申','酉','戌','亥','子','丑','寅','卯','辰','巳','午','未'],
      癸:['卯','寅','丑','子','亥','戌','酉','申','未','午','巳','辰']
    };
    const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    // expected[日干][地支] = 十二運名
    const EXP = {};
    STEMS.forEach(function(day){ EXP[day]={}; JUNI.forEach(function(jn,i){ EXP[day][TAB[day][i]]=jn; }); });
    // 名称ゆれの正規化（旧字・別名）
    function norm(x){ if(!x)return x; return x.replace('祿','禄').replace('帶','帯').replace('臨官','建禄').replace('冠帶','冠帯'); }

    function mk(y,mo,d,hh,mi){ const p=window.PersonBazi(y,mo,d,hh,mi,false,'female',null); return (p&&p.ok)?p.pro:null; }

    const seen={}, bad=[], unknownNames={};
    for(let y=1950;y<=2015;y+=1){ for(let mo of [1,2,3,4,5,6,7,8,9,10,11,12]){ for(let hh of [1,5,9,13,17,21]){
      const c=mk(y,mo,15,hh,30); if(!c)continue; const ds=c.pillars[2].ganzhi[0];
      [0,1,2,3].forEach(function(pi){ const pil=c.pillars[pi]; if(!pil||!pil.terrain)return;
        const br=pil.ganzhi[1]; const key=ds+br;
        if(seen[key])return; seen[key]=1;
        const eng=norm(pil.terrain), exp=EXP[ds][br];
        if(!JUNI.includes(eng)) unknownNames[pil.terrain]=1;
        if(eng!==exp) bad.push('日干'+ds+' 地支'+br+' engine='+pil.terrain+'('+eng+') 表='+exp);
      });
    }}}
    return { distinct:Object.keys(seen).length, bad:bad, unknown:Object.keys(unknownNames) };
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 十二運星 vs 資料5の表（日干10×地支12＝120通り）===');
  console.log('  実際に出た (日干×地支) の種類 ' + R.distinct + ' / 不一致 ' + R.bad.length);
  if (R.unknown.length) console.log('  ※未知の運名（正規化要）: ' + R.unknown.join(', '));
  R.bad.slice(0,30).forEach(x => console.log('   ❌ ' + x));
  console.log('  ' + (R.bad.length===0 && R.distinct===120 ? '✅ 全120通り 表と一致（火土同法）' : (R.bad.length===0 ? '✅ 出現ぶんは一致（未出現あり:'+(120-R.distinct)+'）' : '❌ 不一致あり')));

  await b.close();
})();
