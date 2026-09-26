const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const cases=JSON.parse(fs.readFileSync('tzcases.json','utf8'));
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();const pg=await b.newPage();
 await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await pg.addInitScript(()=>{localStorage.setItem('pk_lang','ja');localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'t',y:1990,m:1,d:1,tu:false,hh:12,mi:0,sex:'female',place:''}));});
 await pg.goto(base+'/index.html');await pg.waitForTimeout(1000);
 const res=await pg.evaluate((cs)=>cs.map(c=>{const ch=computeChart({y:c.y,m:c.m,d:c.d,tu:false,hh:c.hh,mi:c.mi,sex:'female',place:c.place});return ch&&ch.ok?ch.pillars.map(p=>p.ganzhi):null;}),cases);
 cases.forEach((c,i)=>c.app=res[i]);
 fs.writeFileSync('tzresult.json',JSON.stringify(cases));
 await b.close();srv.close();
});
