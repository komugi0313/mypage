const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    const YANG = {甲:1,丙:1,戊:1,庚:1,壬:1,乙:0,丁:0,己:0,辛:0,癸:0};
    const out = { tests: [] };
    function rec(name, pass, detail){ out.tests.push({name, pass, detail}); }
    function mk(y,mo,d,hh,mi,sex){ const p=window.PersonBazi(y,mo,d,hh,mi,false,sex,null); return (p&&p.ok)?p.pro:null; }

    // 10. 大運 順行/逆行：年干陰陽×性別（陽干:男順女逆 / 陰干:男逆女順）
    (function(){
      let n=0, bad=[];
      for(let y=1950;y<=2010;y+=2){ ['female','male'].forEach(function(sex){
        const c=mk(y,6,15,12,0,sex); if(!c||!c.startFortune)return; n++;
        const yStem=c.pillars[0].ganzhi[0], yang=!!YANG[yStem], male=(sex==='male');
        const expForward = (yang===male); // 陽干:男=順(true) 女=逆 / 陰干:男=逆 女=順
        const got=!!c.startFortune.forward;
        if(got!==expForward) bad.push(y+' '+sex+' 年干'+yStem+(yang?'(陽)':'(陰)')+' engine='+(got?'順':'逆')+' 期待='+(expForward?'順':'逆'));
      }); }
      rec('大運の順行/逆行＝年干陰陽×性別', bad.length===0, {checked:n, mismatches:bad.length, examples:bad.slice(0,10)});
    })();

    // 11. 節入り：solar month の代表日で月支が正しい（境界±2日は避ける）
    (function(){
      // [month, day, expectedBranch] — 各節のど真ん中あたり
      const cases=[[2,15,'寅'],[3,20,'卯'],[4,20,'辰'],[5,20,'巳'],[6,20,'午'],[7,20,'未'],[8,20,'申'],[9,20,'酉'],[10,20,'戌'],[11,20,'亥'],[12,20,'子'],[1,20,'丑']];
      let n=0, bad=[];
      for(let y=1970;y<=2010;y+=5){ cases.forEach(function(cc){ const c=mk(y,cc[0],cc[1],12,0,'female'); if(!c)return; n++;
        const mb=c.pillars[1].ganzhi[1]; if(mb!==cc[2]) bad.push(y+'/'+cc[0]+'/'+cc[1]+' 月支 engine='+mb+' 期待='+cc[2]); }); }
      rec('節入り：月支が節（solar term）と一致', bad.length===0, {checked:n, mismatches:bad.length, examples:bad.slice(0,10)});
    })();

    // 12. 立運の妥当性：0〜10年の範囲に収まる（節境界ケースを除く）
    (function(){
      let n=0, bad=[];
      for(let y=1960;y<=2010;y+=1){ ['female','male'].forEach(function(sex){ const c=mk(y,7,15,12,0,sex); if(!c||!c.startFortune)return; n++;
        const mo=(c.startFortune.years||0)*12+(c.startFortune.months||0);
        if(mo<0 || mo>120) bad.push(y+' '+sex+' 立運='+(c.startFortune.years)+'y'+(c.startFortune.months)+'m'); }); }
      rec('立運が0〜10年に収まる（7/15生＝節境界を避けたサンプル）', bad.length===0, {checked:n, outOfRange:bad.length, examples:bad.slice(0,10)});
    })();

    // 13. 干合 table 対称性
    (function(){
      const G=window.GANGOU; let bad=[]; Object.keys(G).forEach(function(k){ if(G[G[k]]!==k)bad.push('干合非対称'+k+'→'+G[k]); });
      rec('干合table 対称性（甲己/乙庚/丙辛/丁壬/戊癸）', bad.length===0, {mismatches:bad.length, examples:bad});
    })();

    // reference: her chart 大運 direction
    const her=mk(1981,6,10,12,0,'female');
    out.her = her ? { year:her.pillars[0].ganzhi, forward:her.startFortune.forward, ritsu:(her.startFortune.years)+'y'+(her.startFortune.months)+'m' } : null;
    return out;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 追加検証（大運・節入り）===\n');
  let allPass=true;
  for(const t of R.tests){ const mark=t.pass?'✅ PASS':'❌ FAIL'; if(!t.pass)allPass=false;
    console.log(mark+'  '+t.name);
    const d=t.detail||{}; const meta=[];
    if(d.checked!=null)meta.push('検査 '+d.checked+'件');
    if(d.mismatches!=null)meta.push('不一致 '+d.mismatches);
    if(d.outOfRange!=null)meta.push('範囲外 '+d.outOfRange);
    if(meta.length)console.log('        '+meta.join(' / '));
    (d.examples||[]).forEach(e=>console.log('        ⚠ '+e));
  }
  if(R.her) console.log('\n参考：あなた(1981/6/10 女性) → 年柱'+R.her.year+' / 大運'+(R.her.forward?'順行':'逆行')+' / 立運'+R.her.ritsu);
  console.log('\n=== 総合 ===');
  console.log(allPass?'✅ すべて合格':'❌ 失敗あり');
  await b.close();
})();
