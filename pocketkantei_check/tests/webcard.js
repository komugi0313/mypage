process.env.AUTH_SECRET='test-secret-0123456789abcdef';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const auth=require('./fx/functions/auth.js').handler;
const srv=http.createServer((q,r)=>{
  if(q.url.startsWith('/api/auth')){let b='';q.on('data',c=>b+=c);q.on('end',async()=>{const o=await auth({httpMethod:q.method,headers:q.headers,body:b});r.writeHead(o.statusCode,o.headers);r.end(o.body);});return;}
  if(q.url.startsWith('/api/')){r.writeHead(500);return r.end('{}');}
  if(q.url.startsWith('/paytest')){r.writeHead(200,{'content-type':'text/html'});return r.end('<p>PAY '+q.url+'</p>');}
  let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});
}).listen(0,async()=>{
  const base='http://127.0.0.1:'+srv.address().port; const b=await chromium.launch();
  for(const [L,conf] of [['ja',false],['en',false],['ja',true]]){
    if(conf) process.env.TELECOM_CHECKOUT_URLS=JSON.stringify({std:base+'/paytest?clientip=TEST&money=1980&sendid={uid}&email={email}&lang={lang}'}); else delete process.env.TELECOM_CHECKOUT_URLS;
    const ctx=await b.newContext({viewport:{width:420,height:900}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
    await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await pg.addInitScript((L)=>{localStorage.setItem('pk_lang',L);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'t',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));},L);
    await pg.goto(base+'/index.html'); await pg.waitForTimeout(800);
    await pg.evaluate(async(L)=>{ const j=await authCall('register',{email:'w'+L+Math.random()+'@example.com',password:'sakura2026',data:cloudDump()}); authSet(j.email,j.token); openSheet('shPlan'); },L); await pg.waitForTimeout(600);
    const t=await pg.evaluate(()=>({btn:[...document.querySelectorAll('#shPlan .plan-buy')].map(b=>b.textContent+(b.disabled?'(不可)':'')).join(' | '),note:document.querySelector('#shPlan .free-hint').textContent,box:document.getElementById('planActions').innerText.replace(/\n+/g,' / '),manage:document.getElementById('billManage').getAttribute('href'),restore:!!document.getElementById('billRestore')}));
    console.log(`【Web ${L} 決済URL${conf?'あり':'なし'}】`,t.btn,'\n   注記:',t.note,'\n   下部:',t.box.slice(0,300),'\n   管理:',t.manage,'復元ボタン:',t.restore);
    await pg.evaluate(()=>document.querySelector('#shPlan .plan-buy[data-plan="std"]').click()); await pg.waitForTimeout(1500);
    console.log('   購入を押す→', conf? pg.url().replace(base,''): await pg.textContent('#billMsg'),' errors',errs);
    const mp=await pg.evaluate(()=>{ if(!document.getElementById('shMenu')) return ''; closeSheets(); const b=document.querySelector('#shMenu .menu-item[data-act="mypage"]'); if(!b) return ''; b.click(); return new Promise(r=>setTimeout(()=>r(document.getElementById('shMyPage').innerText.match(/現在のプラン[\s\S]{0,120}|Current plan[\s\S]{0,140}/)?.[0]||''),400)); }).catch(()=> '(遷移済み)');
    if(!conf) console.log('   マイページ:',mp.replace(/\n+/g,' / '));
    await ctx.close();
  }
  await b.close(); srv.close();
});
