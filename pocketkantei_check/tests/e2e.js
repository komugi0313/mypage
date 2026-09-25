process.env.AUTH_SECRET='test-secret-0123456789abcdef';
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const auth=require('./fx/functions/auth.js').handler;
const root='fx';
const srv=http.createServer((q,r)=>{
  if(q.url.startsWith('/api/auth')){let b='';q.on('data',c=>b+=c);q.on('end',async()=>{const o=await auth({httpMethod:q.method,headers:q.headers,body:b});r.writeHead(o.statusCode,o.headers);r.end(o.body);});return;}
  if(q.url.startsWith('/api/')){r.writeHead(500);return r.end('{}');}
  let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':'application/octet-stream'});r.end(d);});
}).listen(0,async()=>{
  const base='http://127.0.0.1:'+srv.address().port;
  const b=await chromium.launch();
  const mk=async()=>{const ctx=await b.newContext({viewport:{width:420,height:900}});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,200)));pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>{const u=r.request().url();if(u.startsWith(base))return r.continue();return r.abort();});
    await pg.addInitScript(()=>{try{if(!localStorage.getItem('pk_lang'))localStorage.setItem('pk_lang','ja');localStorage.setItem('pk_svd','1');}catch(e){}});return pg;};
  const onScreen=pg=>pg.evaluate(()=>[...document.querySelectorAll('.screen.on')].map(s=>s.id).join(','));
  // 端末A：新規登録
  const A=await mk(); await A.goto(base+'/lp.html'); await A.waitForTimeout(500); console.log('LPログインリンク:',await A.textContent('.lp-login')); await A.goto(base+'/index.html?start=1'); await A.waitForTimeout(800);
  console.log('A 起動画面',await onScreen(A));
  
  console.log('A 登録画面',await onScreen(A),'| 見出し:',await A.textContent('#acH'));
  await A.fill('#iname','はなこ');
  await A.click('#regBtn'); await A.waitForTimeout(300); console.log('A 未入力エラー:',await A.textContent('#acErr'));
  await A.fill('#acEmail','hanako@example.com'); await A.fill('#acPw','sakura2026'); await A.fill('#acPw2','sakura2020');
  await A.click('#regBtn'); await A.waitForTimeout(300); console.log('A 確認不一致:',await A.textContent('#acErr'));
  await A.fill('#acPw2','sakura2026'); await A.click('#regBtn'); await A.waitForTimeout(1500);
  console.log('A 登録後',await onScreen(A),'| pk_auth:',await A.evaluate(()=>JSON.parse(localStorage.getItem('pk_auth')).email),'| パスワードが端末に残っていない:',await A.evaluate(()=>!Object.keys(localStorage).some(k=>(localStorage.getItem(k)||'').includes('sakura2026'))));
  await A.evaluate(()=>{state.msgs.push({role:'me',text:'テスト相談'});saveMsgs();}); await A.evaluate(()=>cloudSaveNow()); await A.waitForTimeout(500);
  await A.evaluate(()=>{renderBackup();openSheet('shBackup');}); await A.waitForTimeout(300);
  console.log('A アカウント欄:',(await A.textContent('#acCard')).replace(/\s+/g,' ').slice(0,80));
  // 端末B：機種変更 → ログイン
  const B=await mk(); await B.goto(base+'/index.html#login'); await B.waitForTimeout(800); console.log('B url',B.url(),await onScreen(B),B.errs);
  console.log('B',await onScreen(B),'|',await B.textContent('#lgH'));
  await B.fill('#lgEmail','hanako@example.com'); await B.fill('#lgPw','wrongpass'); await B.click('#lgBtn'); await B.waitForTimeout(800);
  console.log('B 誤りパスワード:',await B.textContent('#lgErr'));
  await B.fill('#lgPw','sakura2026'); await B.click('#lgBtn'); await B.waitForTimeout(2000);
  console.log('B ログイン後',await onScreen(B),'| 名前:',await B.evaluate(()=>state.profile&&state.profile.name),'| 会話件数:',await B.evaluate(()=>(state.msgs||[]).filter(m=>m.text==='テスト相談').length));
  // B：ログアウト
  await B.evaluate(()=>{renderBackup();openSheet('shBackup');}); await B.waitForTimeout(300); await B.click('#acOut'); await B.waitForTimeout(1500);
  console.log('B ログアウト後',await onScreen(B),'| 端末の命式:',await B.evaluate(()=>localStorage.getItem('pk_profile')),'| auth:',await B.evaluate(()=>localStorage.getItem('pk_auth')));
  // 英語表示
  await B.evaluate(()=>setLang('en')); await B.evaluate(()=>show('scOnboard')); console.log('B 英語:',await B.textContent('#acH'),'/',await B.textContent('#toLogin'));
  console.log('B ログアウト後の言語:',await B.evaluate(()=>localStorage.getItem('pk_lang')));
  await A.evaluate(()=>{closeSheets();});
  await A.evaluate(()=>{ if(typeof renderMypage==='function'){} });
  await A.evaluate(()=>{renderBackup();openSheet('shBackup');document.querySelector('#acCard details').open=true;});
  await A.fill('#acCur','sakura2026'); await A.click('#acDel'); await A.waitForTimeout(1500);
  console.log('A 削除後',A.url().replace(base,''),'| 端末データ:',await A.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('pk_')).join(',')));
  const C=await mk(); await C.goto(base+'/index.html#login'); await C.waitForTimeout(600); await C.fill('#lgEmail','hanako@example.com'); await C.fill('#lgPw','sakura2026'); await C.click('#lgBtn'); await C.waitForTimeout(800);
  console.log('削除後のログイン:',await C.textContent('#lgErr'));
  console.log('errors A',A.errs,'B',B.errs);
  await b.close();srv.close();
});
