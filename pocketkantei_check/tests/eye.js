const {chromium}=require('playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end('not found');}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();const pg=await b.newPage({viewport:{width:400,height:820},deviceScaleFactor:2});const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await pg.addInitScript(()=>{localStorage.setItem('pk_lang','ja');});
 await pg.goto(base+'/index.html?start=1');await pg.waitForTimeout(900);
 await pg.fill('#acEmail','rie@example.com');await pg.fill('#acPw','sakura2026');await pg.fill('#acPw2','sakura2026');
 const eyes=await pg.$$('#obAcct .pw-eye'); console.log('目のボタン数(登録):',eyes.length);
 await eyes[1].click(); console.log('確認欄を表示→type:',await pg.getAttribute('#acPw2','type'),'| ラベル:',await eyes[1].getAttribute('aria-label'));
 const el=await pg.$('#obAcct');await el.scrollIntoViewIfNeeded();await el.screenshot({path:'eye.png'});
 await eyes[1].click(); console.log('もう一度→type:',await pg.getAttribute('#acPw2','type'));
 await eyes[0].click(); await pg.click('#regBtn'); await pg.waitForTimeout(800);
 console.log('送信時に隠れる→type:',await pg.getAttribute('#acPw','type'),'| エラー:',await pg.textContent('#acErr'));
 await pg.evaluate(()=>showLogin()); console.log('目のボタン数(ログイン):',(await pg.$$('#lgForm .pw-eye')).length);
 await pg.evaluate(()=>{localStorage.setItem('pk_profile',JSON.stringify({name:'x',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));state.profile=JSON.parse(localStorage.getItem('pk_profile'));renderBackup();openSheet('shBackup');});
 console.log('目のボタン数(アカウント作成欄):',(await pg.$$('#acCard .pw-eye')).length);
 console.log('errors',errs);await b.close();srv.close();});
