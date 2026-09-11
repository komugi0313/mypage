const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await pg.goto('file://' + path.resolve('/home/user/mypage/meishiki_standalone.html'), { waitUntil: 'networkidle' });

  const R = await pg.evaluate(() => {
    // ===== 資料6「月律分野蔵干表」を分単位で符号化 =====
    // 各支：[ [司令干, その司令が終わる節入り後の分], ... ]（最後の正気は end=Infinity）
    const D=1440, H=60;
    const TABLE = {
      子:[['壬',9*D+17*H],['癸',Infinity]],
      丑:[['癸',8*D+20*H],['辛',11*D+19*H],['己',Infinity]],
      寅:[['戊',7*D+11*H],['丙',13*D+9*H],['甲',Infinity]],
      卯:[['甲',9*D+23*H],['乙',Infinity]],
      辰:[['乙',9*D+5*H],['癸',12*D+7*H],['戊',Infinity]],
      巳:[['戊',7*D+19*H],['庚',14*D+1*H],['丙',Infinity]],
      午:[['丙',10*D+9*H],['己',19*D+19*H],['丁',Infinity]],
      未:[['丁',9*D+10*H],['乙',12*D+14*H],['己',Infinity]],
      申:[['戊',7*D+19*H],['壬',14*D+0*H],['庚',Infinity]],
      酉:[['庚',10*D+3*H],['辛',Infinity]],
      戌:[['辛',9*D+1*H],['丁',12*D+1*H],['戊',Infinity]],
      亥:[['戊',7*D+10*H],['甲',13*D+9*H],['壬',Infinity]]
    };
    // 蔵干stem+%（司令とは別に、干と比率が表と一致するかも確認）
    const STEMS_PCT = {
      子:[['壬',33],['癸',67]], 丑:[['癸',30],['辛',10],['己',60]], 寅:[['戊',25],['丙',20],['甲',55]],
      卯:[['甲',33],['乙',67]], 辰:[['乙',30],['癸',10],['戊',60]], 巳:[['戊',25],['庚',20],['丙',55]],
      午:[['丙',33],['己',30],['丁',37]], 未:[['丁',30],['乙',10],['己',60]], 申:[['戊',25],['壬',20],['庚',55]],
      酉:[['庚',33],['辛',67]], 戌:[['辛',30],['丁',10],['戊',60]], 亥:[['戊',25],['甲',20],['壬',55]]
    };
    function expectedLing(branch, elapsedMin){ const segs=TABLE[branch]; for(const s of segs){ if(elapsedMin < s[1]) return s[0]; } return segs[segs.length-1][0]; }

    function mk(y,mo,d,hh,mi){ const p=window.PersonBazi(y,mo,d,hh,mi,false,'female',null); return (p&&p.ok)?p:null; }

    const res = { stemPct:{checked:0,bad:[]}, ling:{checked:0,bad:[],near:[]}, noSetsu:0 };

    // ---- A) 蔵干 stem+% が表と一致（月支で確認・全支） ----
    (function(){
      const seen={};
      for(let y=1960;y<=2020 && Object.keys(seen).length<12;y++) for(let mo=1;mo<=12;mo++){
        const p=mk(y,mo,15,12,0); if(!p)continue; const mp=p.pro.pillars[1]; const bb=mp.ganzhi[1];
        if(seen[bb]||!mp.hiddenStems)continue; seen[bb]=1; res.stemPct.checked++;
        const got=mp.hiddenStems.map(h=>[h.stem,h.pct]);
        const exp=STEMS_PCT[bb];
        const ok = got.length===exp.length && got.every((g,i)=>g[0]===exp[i][0] && g[1]===exp[i][1]);
        if(!ok) res.stemPct.bad.push(bb+' engine='+JSON.stringify(got)+' 表='+JSON.stringify(exp));
      }
    })();

    // ---- B) 月支の★司令 が 節入り後日数で表どおりか ----
    // 多数の生年月日を走査。月支と setsuMin(経過分) を取り、表の期待司令とエンジンの★を比較。
    (function(){
      for(let y=1970;y<=2015;y+=1){
        for(let mo=1;mo<=12;mo++){
          for(let d=2;d<=27;d+=2){
            const p=mk(y,mo,d,12,0); if(!p)continue;
            const c=p.pro, mp=c.pillars[1], mb=mp.ganzhi[1];
            if(!mp.hiddenStems)continue;
            const b=c.birth||{};
            if(typeof b.setsuMin!=='number'){ res.noSetsu++; continue; }
            const e=b.setsuMin; if(e<0) continue; // 節境界の負値は別問題（既知）なので除外
            const lingStem=(mp.hiddenStems.find(h=>h.ling)||{}).stem;
            const exp=expectedLing(mb,e);
            res.ling.checked++;
            if(lingStem!==exp){
              // 区切り近傍(±12時間)なら「境界差」に分類、それ以外は本質的な不一致
              const segs=TABLE[mb]; let nearBoundary=false;
              for(const s of segs){ if(s[1]!==Infinity && Math.abs(e-s[1])<=12*60){ nearBoundary=true; break; } }
              const item=y+'/'+mo+'/'+d+' 月支'+mb+' 経過'+Math.floor(e/1440)+'d'+Math.floor((e%1440)/60)+'h engine★='+lingStem+' 表='+exp;
              if(nearBoundary) res.ling.near.push(item); else res.ling.bad.push(item);
            }
          }
        }
      }
    })();

    return res;
  });

  console.log('=== JS errors ===');
  console.log(errs.length ? errs.join('\n') : '(none)');
  console.log('\n=== A) 蔵干 stem+% vs 資料6の表 ===');
  console.log('  検査 ' + R.stemPct.checked + '支 / 不一致 ' + R.stemPct.bad.length);
  R.stemPct.bad.forEach(x => console.log('   ⚠ ' + x));
  console.log('  ' + (R.stemPct.bad.length===0 ? '✅ 全支の干・比率が表と一致' : '❌ 不一致あり'));

  console.log('\n=== B) 月支の★司令 vs 表の日数区切り ===');
  console.log('  検査 ' + R.ling.checked + '件');
  console.log('  本質的な不一致 ' + R.ling.bad.length + ' / 区切り近傍(±12h)の差 ' + R.ling.near.length + ' / setsuMin無し ' + R.noSetsu);
  R.ling.bad.slice(0,15).forEach(x => console.log('   ❌ ' + x));
  R.ling.near.slice(0,8).forEach(x => console.log('   ~ (境界近傍) ' + x));
  console.log('  ' + (R.ling.bad.length===0 ? '✅ 節入り後日数による司令選択が表どおり（境界近傍の微差を除く）' : '❌ 本質的な不一致あり'));

  await b.close();
})();
