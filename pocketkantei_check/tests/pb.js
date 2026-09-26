const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await pg.addInitScript(()=>{localStorage.setItem('pk_lang','es');localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'',y:1974,m:3,d:5,tu:false,hh:9,mi:5,sex:'female',place:'mexico'}));});
 await pg.goto(base+'/index.html');await pg.waitForTimeout(1000);
 const t=await pg.evaluate(()=>{chatPartnerScan('Su cumpleaños es el 3 de mayo de 1990. ¿Somos compatibles?');return proBlock();});
 t.split('\n').filter(l=>/^USER|^PARTNER \(|COMPATIBILITY/.test(l)).forEach(l=>console.log(l.slice(0,220)));
 console.log('errors',errs); await b.close();srv.close();});
