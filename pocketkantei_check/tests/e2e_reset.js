process.env.AUTH_SECRET='test-secret-0123456789abcdef'; process.env.RESEND_API_KEY='re_test'; process.env.MAIL_FROM='Pocket Kantei <no-reply@example.com>';
const mails=[]; const realFetch=global.fetch;
global.fetch=async(u,o)=>{ if(String(u).includes('api.resend.com')){ mails.push(JSON.parse(o.body)); return {ok:true}; } return realFetch(u,o); };
const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const auth=require('./fx/functions/auth.js').handler;
const srv=http.createServer((q,r)=>{
  if(q.url.startsWith('/api/auth')){let b='';q.on('data',c=>b+=c);q.on('end',async()=>{const o=await auth({httpMethod:q.method,headers:q.headers,body:b});r.writeHead(o.statusCode,o.headers);r.end(o.body);});return;}
  if(q.url.startsWith('/api/')){r.writeHead(500);return r.end('{}');}
  let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});
}).listen(0,async()=>{
  const base='http://127.0.0.1:'+srv.address().port; process.env.URL=base;
  const b=await chromium.launch();
  const mk=async(lang)=>{const ctx=await b.newContext({viewport:{width:400,height:820}});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,200)));pg.on('dialog',d=>d.accept());
    await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await pg.addInitScript((l)=>{try{localStorage.setItem('pk_lang',l);localStorage.setItem('pk_svd','1');}catch(e){}},lang);return pg;};
  const scr=pg=>pg.evaluate(()=>[...document.querySelectorAll('.screen.on')].map(s=>s.id).join(','));
  // 登録
  const A=await mk('ja'); await A.goto(base+'/index.html?start=1'); await A.waitForTimeout(800);
  await A.fill('#iname','はなこ'); await A.fill('#acEmail','hanako@example.com'); await A.fill('#acPw','oldpass111'); await A.fill('#acPw2','oldpass111'); await A.click('#regBtn'); await A.waitForTimeout(1500);
  await A.evaluate(()=>{state.msgs.push({role:'me',text:'テスト相談'});saveMsgs();}); await A.evaluate(()=>cloudSaveNow()); await A.waitForTimeout(400);
  // 別端末：忘れた
  const B=await mk('en'); await B.goto(base+'/index.html#login'); await B.waitForTimeout(700);
  console.log('ログイン画面のボタン:',await B.textContent('#lgForgot'));
  await B.click('#lgForgot'); await B.waitForTimeout(200); console.log('画面:',await scr(B));
  await B.fill('#fgEmail','nobody@example.com'); await B.click('#fgBtn'); await B.waitForTimeout(600);
  console.log('未登録アドレス→',(await B.textContent('#fgMsg')).slice(0,40),'| 送信数',mails.length);
  await B.fill('#fgEmail','hanako@example.com'); await B.click('#fgBtn'); await B.waitForTimeout(600);
  console.log('登録アドレス→',(await B.textContent('#fgMsg')).slice(0,40),'| 送信数',mails.length,'| 件名',mails[0]&&mails[0].subject,'| 宛先',mails[0]&&mails[0].to[0]);
  const link=/(http[^\s"<]+#reset=[0-9a-f.]+)/.exec(mails[0].text)[1];
  await B.goto(link); await B.waitForTimeout(800); console.log('リンクを開く→',await scr(B),'|',await B.textContent('#rsH'));
  await B.fill('#rsPw','newpass222'); await B.fill('#rsPw2','newpass222'); await B.click('#rsBtn'); await B.waitForTimeout(1500);
  console.log('設定後→',await scr(B),'| 名前',await B.evaluate(()=>state.profile&&state.profile.name),'| 会話',await B.evaluate(()=>state.msgs.filter(m=>m.text==='テスト相談').length));
  // 同じリンクを再利用
  const C=await mk('ja'); await C.goto(link); await C.waitForTimeout(700); await C.fill('#rsPw','another333'); await C.fill('#rsPw2','another333'); await C.click('#rsBtn'); await C.waitForTimeout(700);
  console.log('リンク再利用→',await C.textContent('#rsErr'));
  // 旧パスワード
  await C.goto(base+'/index.html#login'); await C.waitForTimeout(600); await C.fill('#lgEmail','hanako@example.com'); await C.fill('#lgPw','oldpass111'); await C.click('#lgBtn'); await C.waitForTimeout(700);
  console.log('旧パスワード→',await C.textContent('#lgErr'));
  // Aの端末（旧ログイン）は保存時に無効化される
  const j=await A.evaluate(()=>cloudSaveNow()); console.log('旧端末の保存→',j.code,'| ログイン状態',await A.evaluate(()=>!!authGet()));
  console.log('errors',A.errs,B.errs,C.errs);
  await b.close();srv.close();
});
