const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    const out = { crash:0, cases:[], checks:{ honki:{n:0,empty:0}, mote:{n:0,bad:0}, kansatu:{n:0,bad:[]}, top:{n:0,bad:0}, kanchi:{n:0,bad:[]} } };
    function mk(y,mo,d,hh,mi,sex){ const p=window.PersonBazi(y,mo,d,hh,mi,false,sex,null); return (p&&p.ok)?p:null; }

    // ---- 具体ケース：一人目 己日(女) × 二人目 甲日(男) → 相互に配偶者星（甲=己の正官/夫星, 己=甲の正財/妻星）----
    (function(){
      // find charts with day stem 己 and 甲
      let pa=null, pb=null;
      for(let y=1980;y<=1990 && !(pa&&pb);y++)for(let mo=1;mo<=12;mo++)for(let d=1;d<=28;d++){
        const p=mk(y,mo,d,12,0,'female'); if(!p)continue; const ds=p.pro.pillars[2].ganzhi[0];
        if(ds==='己'&&!pa)pa={y,mo,d,p};
        if(ds==='甲'&&!pb)pb={y,mo,d,p:mk(y,mo,d,12,0,'male')};
      }
      if(pa&&pb){
        const cd=window.compatData(pa.p.pro,pb.p.pro);
        out.cases.push({name:'己(女)×甲(男)', tenAtoB:cd.tenAtoB, tenBtoA:cd.tenBtoA,
          expect:'tenAtoB=正官(甲は己の夫星), tenBtoA=正財(己は甲の妻星)',
          pass:(cd.tenAtoB==='正官' && cd.tenBtoA==='正財')});
      }
    })();

    // ---- 広域：クラッシュしない＋各判定の整合 ----
    const YOU=['帝旺','建禄','冠帯','長生'];
    for(let y=1955;y<=2010;y+=1){ ['female','male'].forEach(function(sex){ [[3,10],[7,20],[11,5]].forEach(function(md){
      const p=mk(y,md[0],md[1],10,30,sex); if(!p)return; const c=p.pro;
      let soloHtml;
      try{ soloHtml=window.pcLoveProfile(p,sex); }catch(e){ out.crash++; return; }
      // honki
      const ht=window.honkiTen(c.pillars[2]); out.checks.honki.n++; if(!ht)out.checks.honki.empty++;
      // mote stars 1-5
      const mm=(soloHtml.match(/★/g)||[]).length; out.checks.mote.n++; if(mm<1||mm>5)out.checks.mote.bad++;
      // 官殺混雑: card mentions 官殺混雑 iff (female & 正官&偏官) or (male 財混在)
      const sc=window.starCounts(c), female=(sex!=='male');
      const kanKonzatsu = female ? ((sc.正官||0)>0&&(sc.偏官||0)>0) : ((sc.正財||0)>0&&(sc.偏財||0)>0);
      const cardHasKonzatsu = /官殺混雑/.test(soloHtml) || /正財と偏財が混在/.test(soloHtml);
      out.checks.kansatu.n++;
      if(female){ if(((sc.正官||0)>0&&(sc.偏官||0)>0)!==/官殺混雑/.test(soloHtml) && out.checks.kansatu.bad.length<8) out.checks.kansatu.bad.push(y+'/'+md[0]+' '+sex+' 正官'+(sc.正官||0)+' 偏官'+(sc.偏官||0)+' card混雑='+/官殺混雑/.test(soloHtml)); }
      // 咸池: card mentions 桃花（咸池） iff starList has 咸池
      const sl=window.starList(c); const hasKanchi=sl.indexOf('咸池')>=0; const cardKanchi=/桃花（咸池）/.test(soloHtml);
      out.checks.kanchi.n++; if(hasKanchi!==cardKanchi && out.checks.kanchi.bad.length<8) out.checks.kanchi.bad.push(y+'/'+md[0]+' 咸池list='+hasKanchi+' card='+cardKanchi);
    }); }); }

    // pair crash test
    for(let k=0;k<200;k++){ const y1=1960+(k%45),y2=1965+((k*7)%40);
      const pa=mk(y1,1+(k%12),(k%27)+1,12,0,k%2?'female':'male'); const pb=mk(y2,1+((k*3)%12),((k*5)%27)+1,12,0,k%2?'male':'female');
      if(!pa||!pb)continue;
      try{ window.compatLoveCard(pa,pb,{name:'A',sex:k%2?'female':'male'},{name:'B',sex:k%2?'male':'female'}); }catch(e){ out.crash++; }
    }
    return out;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== 恋愛・相性ロジックの精査 ===');
  console.log('  クラッシュ:', R.crash);
  R.cases.forEach(c=>console.log('  具体ケース['+c.name+']: '+(c.pass?'✅ 一致':'❌ 不一致')+' tenAtoB='+c.tenAtoB+' tenBtoA='+c.tenBtoA+' （期待:'+c.expect+'）'));
  console.log('  honkiTen 空:', R.checks.honki.empty+'/'+R.checks.honki.n);
  console.log('  モテ度★が1-5外:', R.checks.mote.bad+'/'+R.checks.mote.n);
  console.log('  官殺混雑の判定ずれ(女性):', R.checks.kansatu.bad.length); R.checks.kansatu.bad.forEach(x=>console.log('     ⚠ '+x));
  console.log('  咸池表示の判定ずれ:', R.checks.kanchi.bad.length); R.checks.kanchi.bad.forEach(x=>console.log('     ⚠ '+x));
  const ok = R.crash===0 && R.cases.every(c=>c.pass) && R.checks.mote.bad===0 && R.checks.kansatu.bad.length===0 && R.checks.kanchi.bad.length===0 && errs.length===0;
  console.log('\n'+(ok?'✅ 恋愛・相性ロジックに問題なし（クラッシュ・判定ずれなし・具体ケース一致）':'❌ 要確認'));
  await b.close();
})();
