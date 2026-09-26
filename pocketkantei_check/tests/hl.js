const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
 for(const [tz,loc,L] of [['America/Mexico_City','es-MX','es'],['Europe/Madrid','es-ES','es'],['Europe/London','en-GB','en'],['America/New_York','en-US','en'],['Europe/Lisbon','pt-PT','pt'],['Asia/Tokyo','ja-JP','ja'],['Asia/Hong_Kong','zh-HK','zt'],['Asia/Manila','en-PH','en'],['Europe/Berlin','de-DE','en']]){
  const ctx=await b.newContext({timezoneId:tz,locale:loc});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
  await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await pg.addInitScript((L)=>{localStorage.setItem('pk_lang',L);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'t',y:1985,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));},L);
  await pg.goto(base+'/index.html');await pg.waitForTimeout(700);
  console.log(tz,L,'→',await pg.evaluate((L)=>HELPLINE[L],L),errs.length?errs:''); await ctx.close(); }
 await b.close();srv.close();});
