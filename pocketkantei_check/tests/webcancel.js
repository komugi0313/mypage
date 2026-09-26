process.env.AUTH_SECRET='test-secret-0123456789abcdef';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const AM=require('./fx/functions/auth.js'), auth=AM.handler, A=AM._t;
const srv=http.createServer((q,r)=>{
  if(q.url.startsWith('/api/auth')){let b='';q.on('data',c=>b+=c);q.on('end',async()=>{const o=await auth({httpMethod:q.method,headers:q.headers,body:b});r.writeHead(o.statusCode,o.headers);r.end(o.body);});return;}
  if(q.url.startsWith('/api/')){r.writeHead(500);return r.end('{}');}
  let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});
}).listen(0,async()=>{
  const base='http://127.0.0.1:'+srv.address().port; const b=await chromium.launch();
  for(const ready of [false,true]){
    A.TC.stop=async()=>ready?{ok:true}:{ok:false,code:'NOT_READY'};
    const ctx=await b.newContext({viewport:{width:420,height:900}});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await pg.addInitScript(()=>{localStorage.setItem('pk_lang','ja');localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'t',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));});
    await pg.goto(base+'/index.html'); await pg.waitForTimeout(800);
    const em='c'+ready+'@example.com';
    const tok=await pg.evaluate(async(em)=>{ const j=await authCall('register',{email:em,password:'sakura2026',data:cloudDump()}); authSet(j.email,j.token); return j.token; },em);
    // テレコムクレジットで購入済みの状態をサーバーに作る
    const st=await A.getStore({}); const k='u:'+tok.split('.')[0]; const rec=await st.get(k,{type:'json'}); rec.sub={plan:'std',expires:Date.now()+20*864e5,willRenew:true,store:'TELECOM'}; await st.setJSON(k,rec);
    await pg.evaluate(async()=>{ const a=authGet(); await authCall('load',{token:a.token}); await new Promise(r=>setTimeout(r,100)); openSheet('shPlan'); }); await pg.waitForTimeout(600);
    const t=await pg.evaluate(()=>({btn:[...document.querySelectorAll('#shPlan .plan-buy')].map(b=>b.textContent).join(' | '),box:document.getElementById('planActions').innerText.replace(/\n+/g,' / '),manage:!!document.getElementById('billManage'),cancel:!!document.getElementById('billCancel')}));
    console.log(`【ウェブ版・カード購入済み／解約の接続${ready?'あり':'なし'}】`,t.btn,'\n   ',t.box,'\n    管理リンク:',t.manage,'解約ボタン:',t.cancel);
    await pg.evaluate(()=>document.getElementById('billCancel').click()); await pg.waitForTimeout(1200);
    console.log('   解約を押す→',await pg.textContent('#billMsg'),'| サーバー willRenew:',(await st.get(k,{type:'json'})).sub.willRenew,'| 解約ボタン残る:',await pg.evaluate(()=>!!document.getElementById('billCancel')),'errors',errs);
    await ctx.close();
  }
  await b.close(); srv.close();
});
