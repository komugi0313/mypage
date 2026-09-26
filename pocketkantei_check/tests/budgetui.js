process.env.AUTH_SECRET='test-secret-0123456789abcdef'; process.env.REVENUECAT_WEBHOOK_AUTH='whsec-0123456789abcdefXYZ';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const auth=require('./fx/functions/auth.js').handler, bill=require('./fx/functions/billing.js').handler;
const hdrs=[];
const srv=http.createServer((q,r)=>{
  const fn=q.url.startsWith('/api/auth')?auth:q.url.startsWith('/api/billing')?bill:null;
  if(fn){let b='';q.on('data',c=>b+=c);q.on('end',async()=>{const o=await fn({httpMethod:q.method,headers:q.headers,body:b});r.writeHead(o.statusCode,o.headers);r.end(o.body);});return;}
  if(q.url.startsWith('/api/gemini')){ let bb='';q.on('data',c=>bb+=c);q.on('end',()=>{ let u=''; try{const j=JSON.parse(bb);const c=j.contents||[];u=(c[c.length-1].parts[0].text||'').split('\n')[0].slice(0,20);}catch(e){} if(q.headers['x-pk-classify']!=='1') hdrs.push({q:u,deep:q.headers['x-pk-deep'],nocount:q.headers['x-pk-nocount']}); if(global.BUDGET&&q.headers['x-pk-classify']!=='1'&&!(q.headers['x-pk-deep']==='1'&&q.headers['x-pk-nocount']==='0')){ r.writeHead(429,{'content-type':'application/json'}); return r.end(JSON.stringify({error:{code:'DAILY_BUDGET'}})); } r.writeHead(200,{'content-type':'application/json'}); r.end(JSON.stringify({candidates:[{content:{parts:[{text:q.headers['x-pk-classify']==='1'?(/恋愛/.test(bb)?'{"topic":"love"}':'{"topic":"other"}'):'テストの返事です。ゆっくりで大丈夫ですよ、あなたのペースで進みましょう。'}]}}]})); }); return; }
  let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});
}).listen(0,async()=>{
  const base='http://127.0.0.1:'+srv.address().port; const b=await chromium.launch();
  const mk=async(L)=>{const ctx=await b.newContext({viewport:{width:420,height:900}});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,200)));pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await pg.addInitScript((L)=>{localStorage.setItem('pk_lang',L);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'t',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));},L);
    await pg.goto(base+'/index.html'); await pg.waitForTimeout(900); return pg;};
  const sheet=async(pg)=>pg.evaluate(()=>{openSheet('shPlan');return new Promise(r=>setTimeout(()=>{const sh=document.getElementById('shPlan');r({top:document.getElementById('planTop').innerText.replace(/\n+/g,' | '),cards:[...sh.querySelectorAll('.plans .plan')].map(c=>c.innerText.replace(/\n+/g,' / ')),hint:sh.innerText.includes('💡')});},500));});
  for(const L of []){ const pg=await mk(L); let s=await sheet(pg); console.log(`【${L} 月額】`,s.top); s.cards.forEach(c=>console.log('   ',c.slice(0,150))); 
    await pg.evaluate(()=>document.querySelector('#planTop button[data-per="y"]').click()); await pg.waitForTimeout(300);
    console.log(`   年額:`, await pg.evaluate(()=>[...document.querySelectorAll('#shPlan .plans .pp')].map(x=>x.textContent).join(' | ')),' 💡',s.hint,' errors',pg.errs); await pg.context().close(); }
  // 有料（Standard）で本格鑑定を使い切る
  const now=Date.now();
  for(const plan of ['std']){
    const pg=await mk('ja');
    const tok=await pg.evaluate(async(plan)=>{ const j=await authCall('register',{email:plan+'@q.com',password:'sakura2026',data:cloudDump()}); authSet(j.email,j.token); return j.token; },plan);
    await pg.evaluate(async([uid,plan,now])=>{ await fetch('/api/billing',{method:'POST',headers:{'Content-Type':'application/json',authorization:'whsec-0123456789abcdefXYZ'},body:JSON.stringify({event:{type:'INITIAL_PURCHASE',app_user_id:uid,product_id:'pk_'+plan+'_monthly',expiration_at_ms:now+30*864e5,event_timestamp_ms:now}})}); const a=authGet(); await authCall('status',{token:a.token}).then(j=>applyServerPlan(j.plan)); },[tok.split('.')[0],plan,now]);
    await pg.waitForTimeout(300);
    const ask=async(q)=>{ const n=await pg.evaluate(()=>state.msgs.length); await pg.evaluate((q)=>{closeSheets(); ask(q);},q); for(let i=0;i<40;i++){ await pg.waitForTimeout(500); const d=await pg.evaluate((n)=>({len:state.msgs.length,busy:_askBusy,last:state.msgs.slice(n).filter(m=>m.role==='ai').map(m=>m.text).join(' ‖ ')}),n); if(!d.busy&&d.len>n+1) return d.last; } return '(timeout)'; };
    await pg.evaluate(()=>{ state.msgs=state.msgs.slice(0,1); _askBusy=false; });
    console.log(`\n【${plan}】プラン:`,await pg.evaluate(()=>curPlan()),'| 残り',await pg.evaluate(()=>deepLeft()));
    hdrs.length=0; await ask('彼との恋愛、この先どうなる？'); await pg.waitForTimeout(1500); console.log('   恋愛の質問 → 送信ヘッダ',JSON.stringify(hdrs),'| 残り',await pg.evaluate(()=>deepLeft()));
    hdrs.length=0; await ask('今日は暑いね'); await pg.waitForTimeout(1500); console.log('   雑談 → ',JSON.stringify(hdrs),'| 残り',await pg.evaluate(()=>deepLeft()));
    global.BUDGET=true;
    hdrs.length=0; const b1=await ask('今日は暑いね'); console.log('   雑談の割り当てを使い切った時の雑談 →',b1.slice(0,80));
    hdrs.length=0; const b2=await ask('彼との恋愛、この先どうなる？'); console.log('   同じ日の恋愛の質問（本格鑑定）→ AIへ',JSON.stringify(hdrs.slice(-1)),'| 返事',b2.slice(0,30));
    hdrs.length=0; const b3=await ask('もう死にたい'); console.log('   同じ日の深刻な相談 →',b3.slice(0,120));
    global.BUDGET=false;
    const mp=await pg.evaluate(()=>{closeSheets();document.querySelector('#shMenu .menu-item[data-act="mypage"]').click();return new Promise(r=>setTimeout(()=>r(document.getElementById('shMyPage').innerText.match(/現在のプラン[\s\S]{0,60}/)[0]),400));});
    console.log('   マイページ:',mp.replace(/\n+/g,' / '),'| errors',pg.errs);
    await pg.context().close();
  }
  await b.close(); srv.close();
});
