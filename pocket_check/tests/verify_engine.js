const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  // standalone has the engine inlined
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
    const BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const out = { tests: [] };
    function rec(name, pass, detail){ out.tests.push({name, pass, detail}); }

    // ---------- independent helpers ----------
    // Fliegel–Van Flandern JDN (noon of civil Gregorian date)
    function jdn(y,m,d){ const a=Math.floor((14-m)/12), yy=y+4800-a, mm=m+12*a-3;
      return d + Math.floor((153*mm+2)/5) + 365*yy + Math.floor(yy/4) - Math.floor(yy/100) + Math.floor(yy/400) - 32045; }
    // calibrate day index so that 2000-01-07 = 甲子 (index 0) — a widely used 甲子日 anchor
    const anchor = jdn(2000,1,7);
    const off = ((-anchor)%60+60)%60;
    function dayGZ(y,m,d){ const i=((jdn(y,m,d)+off)%60+60)%60; return STEMS[i%10]+BR[i%12]; }
    // canonical year pillar (甲子 = 4 AD)
    function yearGZ(y){ return STEMS[((y-4)%10+10)%10]+BR[((y-4)%12+12)%12]; }
    // 五虎遁: month stem from year stem + month branch(寅=1..)
    // 甲己→丙寅首, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅
    function monthStemExpected(yearStem, monBr){
      const first = {甲:'丙',己:'丙',乙:'戊',庚:'戊',丙:'庚',辛:'庚',丁:'壬',壬:'壬',戊:'甲',癸:'甲'}[yearStem];
      const fi = STEMS.indexOf(first);
      const bi = BR.indexOf(monBr); // 寅=2
      const steps = (bi - 2 + 12) % 12; // months after 寅
      return STEMS[(fi+steps)%10];
    }
    // 五鼠遁: hour stem from day stem + hour branch(子=0)
    // 甲己→甲子首, 乙庚→丙子, 丙辛→戊子, 丁壬→庚子, 戊癸→壬子
    function hourStemExpected(dayStem, hourBr){
      const first = {甲:'甲',己:'甲',乙:'丙',庚:'丙',丙:'戊',辛:'戊',丁:'庚',壬:'庚',戊:'壬',癸:'壬'}[dayStem];
      const fi = STEMS.indexOf(first), bi = BR.indexOf(hourBr);
      return STEMS[(fi+bi)%10];
    }
    // 空亡(旬空) from day 干支 index
    function kuboExpected(gz){ const i = STEMS.indexOf(gz[0]) + ((BR.indexOf(gz[1]) - STEMS.indexOf(gz[0]))%2? 0:0);
      // compute absolute 60 index
      // find n in 0..59 with STEMS[n%10]==gz[0] and BR[n%12]==gz[1]
      let idx=-1; for(let n=0;n<60;n++){ if(STEMS[n%10]===gz[0]&&BR[n%12]===gz[1]){idx=n;break;} }
      const xun = Math.floor(idx/10)*10;
      return [ BR[(xun+10)%12], BR[(xun+11)%12] ].sort().join('');
    }
    // 蔵干 本気
    const HONKI = {子:'癸',丑:'己',寅:'甲',卯:'乙',辰:'戊',巳:'丙',午:'丁',未:'己',申:'庚',酉:'辛',戌:'戊',亥:'壬'};

    function mk(y,mo,d,hh,mi,sex){ const p=window.PersonBazi(y,mo,d,hh,mi,false,sex||'female',null); return (p&&p.ok)?p.pro:null; }

    // ---------- 1. day pillar vs JDN (absolute), over wide range ----------
    (function(){
      let n=0, bad=[]; const samples=[];
      // every day for 2020..2026 + first of each month 1900..2100
      for(let y=2020;y<=2026;y++) for(let mo=1;mo<=12;mo++){ const dim=[31,28,31,30,31,30,31,31,30,31,30,31][mo-1];
        for(let d=1;d<=dim;d++){ const c=mk(y,mo,d,12,0,'female'); if(!c)continue; n++;
          const got=c.pillars[2].ganzhi, exp=dayGZ(y,mo,d);
          if(got!==exp){ bad.push(y+'/'+mo+'/'+d+' engine='+got+' JDN='+exp); }
        } }
      for(let y=1900;y<=2100;y+=1){ const c=mk(y,6,15,12,0,'female'); if(!c)continue; n++;
        const got=c.pillars[2].ganzhi, exp=dayGZ(y,6,15); if(got!==exp)bad.push(y+'/6/15 engine='+got+' JDN='+exp); }
      // sample outputs for the report
      [[1981,6,10],[2000,1,7],[1984,2,2],[2026,9,11]].forEach(function(t){ const c=mk(t[0],t[1],t[2],12,0,'female'); if(c)samples.push(t.join('/')+' → 日柱 engine='+c.pillars[2].ganzhi+' / JDN='+dayGZ(t[0],t[1],t[2])); });
      rec('日柱 vs 独立JDN計算（甲子=2000/1/7基準）', bad.length===0, {checked:n, mismatches:bad.length, examples:bad.slice(0,8), samples});
    })();

    // ---------- 2. day 60-cycle continuity ----------
    (function(){
      let prev=null, bad=[], n=0; const start=new Date(Date.UTC(1950,0,1));
      for(let k=0;k<400*365;k+=1){ // ~400 years of days is too many; sample 40 years daily
      }
      // 40 years daily continuity
      let dt=new Date(Date.UTC(1985,0,1));
      for(let k=0;k<40*365;k++){
        const y=dt.getUTCFullYear(),mo=dt.getUTCMonth()+1,d=dt.getUTCDate();
        const c=mk(y,mo,d,12,0,'female');
        if(c){ n++; const gz=c.pillars[2].ganzhi; let idx=-1; for(let z=0;z<60;z++){if(STEMS[z%10]===gz[0]&&BR[z%12]===gz[1]){idx=z;break;}}
          if(prev!==null){ const expIdx=(prev+1)%60; if(idx!==expIdx && bad.length<8) bad.push(y+'/'+mo+'/'+d+' idx '+prev+'→'+idx+' (expected '+expIdx+')'); }
          prev=idx; }
        dt.setUTCDate(dt.getUTCDate()+1);
      }
      rec('日柱の60干支サイクル連続性（1985〜約40年・毎日）', bad.length===0, {checked:n, breaks:bad.length, examples:bad});
    })();

    // ---------- 3. tenGodOf vs engine tenStar ----------
    (function(){
      let n=0, bad=[];
      for(let y=1950;y<=2010;y+=3) for(let mo of [1,3,5,7,9,11]){ const c=mk(y,mo,15,10,0,'female'); if(!c)continue;
        const ds=c.pillars[2].ganzhi[0];
        [0,1,3].forEach(function(pi){ const pil=c.pillars[pi]; if(!pil||!pil.tenStar)return; n++;
          const mine=window.tenGodOf(ds, pil.ganzhi[0]);
          // engine 正印 vs 印綬 naming: normalize
          const norm=function(x){return x==='正印'?'印綬':x;};
          if(norm(mine)!==norm(pil.tenStar)) bad.push(y+'/'+mo+' 日干'+ds+' 相手'+pil.ganzhi[0]+' mine='+mine+' engine='+pil.tenStar); });
      }
      rec('十神 tenGodOf() vs エンジンtenStar（独立実装の突合）', bad.length===0, {checked:n, mismatches:bad.length, examples:bad.slice(0,8)});
    })();

    // ---------- 4. month pillar 五虎遁 ----------
    (function(){
      let n=0, bad=[];
      for(let y=1960;y<=2020;y+=2) for(let mo=1;mo<=12;mo++){ const c=mk(y,mo,15,12,0,'female'); if(!c)continue; n++;
        const yStem=c.pillars[0].ganzhi[0], mBr=c.pillars[1].ganzhi[1], mStem=c.pillars[1].ganzhi[0];
        const exp=monthStemExpected(yStem,mBr);
        if(exp!==mStem) bad.push(y+'/'+mo+' 年干'+yStem+' 月支'+mBr+' 月干 engine='+mStem+' 五虎遁='+exp); }
      rec('月柱の天干＝五虎遁ルール', bad.length===0, {checked:n, mismatches:bad.length, examples:bad.slice(0,8)});
    })();

    // ---------- 5. hour pillar 五鼠遁 ----------
    (function(){
      let n=0, bad=[];
      for(let y=1980;y<=2010;y+=5) for(let hh=0;hh<24;hh+=2){ const c=mk(y,6,15,hh,30,'female'); if(!c)continue; n++;
        const dStem=c.pillars[2].ganzhi[0], hBr=c.pillars[3].ganzhi[1], hStem=c.pillars[3].ganzhi[0];
        const exp=hourStemExpected(dStem,hBr);
        if(exp!==hStem) bad.push(y+' '+hh+'時 日干'+dStem+' 時支'+hBr+' 時干 engine='+hStem+' 五鼠遁='+exp); }
      rec('時柱の天干＝五鼠遁ルール', bad.length===0, {checked:n, mismatches:bad.length, examples:bad.slice(0,8)});
    })();

    // ---------- 6. year pillar absolute (1984=甲子) ----------
    (function(){
      let n=0, bad=[];
      for(let y=1920;y<=2060;y++){ const c=mk(y,6,15,12,0,'female'); if(!c)continue; n++;
        const got=c.pillars[0].ganzhi, exp=yearGZ(y);
        if(got!==exp) bad.push(y+' engine='+got+' expected='+exp); }
      rec('年柱の絶対位相（甲子=1984, 立春後）', bad.length===0, {checked:n, mismatches:bad.length, examples:bad.slice(0,8)});
    })();

    // ---------- 7. 空亡 vs 旬空 ----------
    (function(){
      let n=0, bad=[];
      for(let y=1960;y<=2010;y+=2) for(let mo of[2,6,10]){ const c=mk(y,mo,15,12,0,'female'); if(!c)continue;
        const k=(window.kuboX?window.kuboX(c):[])||[]; if(!k.length)continue; n++;
        const got=k.slice().sort().join(''), exp=kuboExpected(c.pillars[2].ganzhi);
        if(got!==exp) bad.push(y+'/'+mo+' 日柱'+c.pillars[2].ganzhi+' 空亡 engine='+got+' 旬空='+exp); }
      rec('空亡（天中殺）＝日柱の旬空', bad.length===0, {checked:n, mismatches:bad.length, examples:bad.slice(0,8)});
    })();

    // ---------- 8. 蔵干 本気 ----------
    (function(){
      let n=0, bad=[];
      for(let y=1970;y<=2010;y+=3) for(let mo of[1,4,7,10]){ const c=mk(y,mo,15,12,0,'female'); if(!c)continue;
        [0,1,2,3].forEach(function(pi){ const pil=c.pillars[pi]; if(!pil||!pil.hiddenStems)return; n++;
          const hs=pil.hiddenStems, honki=hs.filter(function(h){return h.role==='本氣';})[0] || hs[hs.length-1];
          const exp=HONKI[pil.ganzhi[1]];
          if(honki && honki.stem!==exp) bad.push(y+'/'+mo+' 支'+pil.ganzhi[1]+' 本気 engine='+honki.stem+' 標準='+exp); });
      }
      rec('蔵干（本気）＝標準table', bad.length===0, {checked:n, mismatches:bad.length, examples:bad.slice(0,8)});
    })();

    // ---------- 9. love tables self-consistency ----------
    (function(){
      const RK=window.RIKUGOU, CH=window.CHONG, PE=window.PEACH;
      let bad=[];
      // 冲 symmetric & opposite (6 apart)
      BR.forEach(function(b,i){ if(CH[b]!==BR[(i+6)%12]) bad.push('冲['+b+']='+CH[b]+' 期待'+BR[(i+6)%12]); if(CH[CH[b]]!==b)bad.push('冲非対称'+b); });
      // 支合 symmetric
      BR.forEach(function(b){ if(RK[RK[b]]!==b) bad.push('支合非対称'+b); });
      // 桃花: from day/year branch三合's 沐浴. check 三合火(寅午戌)→桃花卯 etc.
      const expectPeach={寅:'卯',午:'卯',戌:'卯',申:'酉',子:'酉',辰:'酉',巳:'午',酉:'午',丑:'午',亥:'子',卯:'子',未:'子'};
      BR.forEach(function(b){ if(PE[b]!==expectPeach[b]) bad.push('桃花['+b+']='+PE[b]+' 期待'+expectPeach[b]); });
      rec('恋愛table（冲対称/支合対称/桃花＝三合沐浴）', bad.length===0, {mismatches:bad.length, examples:bad.slice(0,8)});
    })();

    // ---------- reference charts for human eyeball ----------
    out.refCharts = [[1981,6,10,12,0,'female'],[1990,5,15,10,30,'female'],[2000,1,7,0,0,'male'],[1970,1,1,12,0,'male']].map(function(t){
      const c=mk(t[0],t[1],t[2],t[3],t[4],t[5]); if(!c)return null;
      return { date:t[0]+'/'+t[1]+'/'+t[2]+' '+t[3]+':'+String(t[4]).padStart(2,'0')+' '+t[5],
        四柱:[0,1,2,3].map(function(i){return c.pillars[i].ganzhi;}).join(' '),
        日主:c.pillars[2].ganzhi[0] };
    }).filter(Boolean);

    out.anchorCheck = { '2000/1/7 の日柱(engine)': (mk(2000,1,7,12,0,'male')||{}).pillars ? mk(2000,1,7,12,0,'male').pillars[2].ganzhi : 'n/a' };
    return out;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 検証結果 ===\n');
  let allPass = true;
  for (const t of R.tests) {
    const mark = t.pass ? '✅ PASS' : '❌ FAIL';
    if (!t.pass) allPass = false;
    console.log(mark + '  ' + t.name);
    const d = t.detail || {};
    const meta = [];
    if (d.checked != null) meta.push('検査 ' + d.checked + '件');
    if (d.mismatches != null) meta.push('不一致 ' + d.mismatches);
    if (d.breaks != null) meta.push('断絶 ' + d.breaks);
    if (meta.length) console.log('        ' + meta.join(' / '));
    if (d.examples && d.examples.length) d.examples.forEach(e => console.log('        ⚠ ' + e));
    if (d.samples) d.samples.forEach(s => console.log('        · ' + s));
  }
  console.log('\n=== 参考：四柱サンプル（お手元の万年暦/ソフトと照合用）===');
  R.refCharts.forEach(c => console.log('  ' + c.date + '  →  年月日時: ' + c.四柱 + '  （日主 ' + c.日主 + '）'));
  console.log('  anchor 2000/1/7 engine日柱 =', R.anchorCheck['2000/1/7 の日柱(engine)'], '（甲子であるべき）');
  console.log('\n=== 総合 ===');
  console.log(allPass ? '✅ すべてのテストに合格' : '❌ 失敗したテストあり（上記⚠を確認）');

  await b.close();
})();
