process.env.AUTH_SECRET='test-secret-0123456789abcdef'; process.env.REVENUECAT_WEBHOOK_AUTH='whsec-0123456789abcdefXYZ';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const auth=require('./fx/functions/auth.js').handler, bill=require('./fx/functions/billing.js').handler;
const seen=[];
const srv=http.createServer((q,r)=>{
  const fn=q.url.startsWith('/api/auth')?auth:q.url.startsWith('/api/billing')?bill:null;
  if(fn){let b='';q.on('data',c=>b+=c);q.on('end',async()=>{const o=await fn({httpMethod:q.method,headers:q.headers,body:b});r.writeHead(o.statusCode,o.headers);r.end(o.body);});return;}
  if(q.url.startsWith('/api/gemini')){ seen.push(q.headers['x-pk-auth']||''); r.writeHead(500); return r.end('{}'); }
  let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});
}).listen(0,async()=>{
  const base='http://127.0.0.1:'+srv.address().port; const b=await chromium.launch();
  const mk=async(L,native)=>{const ctx=await b.newContext({viewport:{width:420,height:900}});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,200)));pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await pg.addInitScript(([L,native])=>{localStorage.setItem('pk_lang',L);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'t',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));
      if(!native) return;
      window.PK_RC_KEYS={ios:'appl_test'}; window.__rc={calls:[]};
      const uid=()=>{const a=JSON.parse(localStorage.getItem('pk_auth')||'null');return a&&a.token.split('.')[0];};
      const pkgs=[['pk_light_monthly','¥1,000'],['pk_std_monthly','¥2,000'],['pk_unl_monthly','¥3,000']].map(([id,p])=>({identifier:'$rc_'+id,product:{identifier:id,priceString:p}}));
      window.Capacitor={getPlatform:()=>'ios',Plugins:{Purchases:{
        isConfigured:async()=>({isConfigured:!!window.__rc.user}),
        configure:async(o)=>{window.__rc.calls.push('configure:'+o.appUserID.slice(0,8));window.__rc.user=o.appUserID;},
        logIn:async(o)=>{window.__rc.calls.push('logIn');window.__rc.user=o.appUserID;},
        getOfferings:async()=>({current:{availablePackages:pkgs}}),
        purchasePackage:async({aPackage})=>{ if(window.__rc.cancelNext){window.__rc.cancelNext=false; const e=new Error('Purchase was cancelled.'); e.userCancelled=true; throw e;}
          window.__rc.calls.push('buy:'+aPackage.product.identifier);
          const now=Date.now(); await fetch('/api/billing',{method:'POST',headers:{'Content-Type':'application/json',authorization:'Bearer whsec-0123456789abcdefXYZ'},body:JSON.stringify({event:{type:'INITIAL_PURCHASE',app_user_id:window.__rc.user,product_id:aPackage.product.identifier,expiration_at_ms:now+30*864e5,event_timestamp_ms:now,store:'APP_STORE'}})});
          return {customerInfo:{entitlements:{active:{pro:{}}}}}; },
        restorePurchases:async()=>({customerInfo:{entitlements:{active:window.__rc.user?{pro:{}}:{}}}})
      }}};
    },[L,native]); await pg.goto(base+'/index.html'); await pg.waitForTimeout(900); return pg;};
  const sheet=pg=>pg.evaluate(()=>{openSheet('shPlan');return new Promise(r=>setTimeout(()=>r({txt:document.getElementById('shPlan').innerText,btn:[...document.querySelectorAll('.plan-buy')].map(b=>b.textContent+(b.disabled?'(不可)':''))}),600));});
  // A) Web
  for(const L of ['ja','en','th']){ const pg=await mk(L,false); const s=await sheet(pg); console.log('【Web '+L+'】ボタン',s.btn.join(' | ')); console.log('   ',s.txt.replace(/\n+/g,' / ').slice(-420)); console.log('   errors',pg.errs); await pg.context().close(); }
  // B) ネイティブ（模擬）・未ログイン
  let pg=await mk('ja',true); let s=await sheet(pg); console.log('【iOS模擬・未ログイン】',s.btn.join(' | '));
  await pg.evaluate(()=>document.querySelector('#shPlan .plan-buy[data-plan="std"]').click()); await pg.waitForTimeout(400); console.log('   購入→',await pg.textContent('#billMsg'));
  // ログイン（登録）
  await pg.evaluate(async()=>{ const j=await authCall('register',{email:'rc@example.com',password:'sakura2026',data:cloudDump()}); authSet(j.email,j.token); closeSheets(); });
  s=await sheet(pg); console.log('【iOS模擬・ログイン】',s.btn.join(' | '),'| 価格',await pg.evaluate(()=>[...document.querySelectorAll('#shPlan .plans .pp')].map(x=>x.textContent).join(' ')));
  await pg.evaluate(()=>{window.__rc.cancelNext=true;}); await pg.evaluate(()=>document.querySelector('#shPlan .plan-buy[data-plan="std"]').click()); await pg.waitForTimeout(800); console.log('   キャンセル→「'+(await pg.textContent('#billMsg'))+'」');
  await pg.evaluate(()=>document.querySelector('#shPlan .plan-buy[data-plan="std"]').click()); await pg.waitForTimeout(3500);
  console.log('   購入→',await pg.textContent('#billMsg'),'| curPlan',await pg.evaluate(()=>curPlan()),'| calls',await pg.evaluate(()=>window.__rc.calls.join(',')));
  s=await sheet(pg); console.log('   購入後ボタン',s.btn.join(' | ')); console.log('   ',s.txt.match(/次回更新日：[^\n]*/)&&s.txt.match(/次回更新日：[^\n]*/)[0]);
  const mp=await pg.evaluate(()=>{closeSheets();document.querySelector('#shMenu .menu-item[data-act="mypage"]').click();return new Promise(r=>setTimeout(()=>r(document.getElementById('shMyPage').innerText),400));});
  console.log('   マイページ:',mp.replace(/\n+/g,' / ').match(/現在のプラン[^/]*\/[^/]*\/[^/]*\/[^/]*/));
  await pg.evaluate(()=>closeSheets()); await pg.fill('#askIn','テスト'); await pg.click('#askBtn'); for(let i=0;i<30&&!seen.some(x=>x&&x.length>100);i++) await pg.waitForTimeout(1000);
  console.log('   チャット送信時のトークン付与:',seen.map(x=>(x||'').length).join(','), await pg.evaluate(()=>state.msgs.slice(-2).map(m=>m.role+':'+m.text.slice(0,30)).join(' | ')));
  // 別端末で復元
  const pg2=await mk('en',true); await pg2.evaluate(async()=>{ const j=await authCall('login',{email:'rc@example.com',password:'sakura2026'}); authSet(j.email,j.token); });
  await pg2.waitForTimeout(500); s=await sheet(pg2); await pg2.evaluate(()=>document.getElementById('billRestore').click()); await pg2.waitForTimeout(2500); console.log('【別端末で復元】',await pg2.textContent('#billMsg'),'| curPlan',await pg2.evaluate(()=>curPlan()));
  console.log('errors',pg.errs,pg2.errs);
  await b.close(); srv.close();
});
