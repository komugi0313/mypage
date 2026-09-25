const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();const ctx=await b.newContext();const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e).slice(0,150)));
 await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 const where=async()=>{await pg.waitForTimeout(900);const u=pg.url().replace(base,'');const sc=u.startsWith('/index')?await pg.evaluate(()=>[...document.querySelectorAll('.screen.on')].map(s=>s.id).join(',')):'';return u+' '+sc;};
 await pg.goto(base+'/'); console.log('1回目 / →',await where());
 await pg.goto(base+'/index.html'); console.log('2回目 index →',await where());
 await pg.goto(base+'/index.html?src=pwa'); console.log('ホーム画面アプリ →',await where());
 await pg.goto(base+'/lp.html'); await pg.click('a.cta.alt'); console.log('LPの「はじめる」→',await where());
 await pg.goto(base+'/lp.html'); await pg.click('a.lp-login'); console.log('LPの「ログイン」→',await where());
 await pg.evaluate(()=>localStorage.setItem('pk_profile',JSON.stringify({name:'x',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'})));
 await pg.goto(base+'/index.html'); console.log('登録済み index →',await where());
 await pg.goto(base+'/lp.html'); console.log('登録済み lp →',await where());
 console.log('errors',errs);await b.close();srv.close();});
