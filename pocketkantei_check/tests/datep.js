const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const Q=JSON.parse(fs.readFileSync('bigq.json','utf8'));
const EX=[['en','She was born on 3 May 1990'],['en','his birthday is 5/3/1990'],['es','nació el 3/5/1990'],['th','วันเกิดของเขา 3 พฤษภาคม 2533'],['vi','ngày sinh 03-05-1990'],['ko','그 사람은 1990년 5월 3일생이에요 생일'],['pt','nascimento: 3 de março de 1990'],['id','lahir 25/12/1990'],['en','born December 25th, 1990'],['ja','2020年4月1日に入社しました']];
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await pg.addInitScript(()=>{localStorage.setItem('pk_lang','ja');localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'t',y:1985,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));});
 await pg.goto(base+'/index.html');await pg.waitForTimeout(1000);
 const cases=Object.keys(Q).map(L=>[L,Q[L][11]]).concat(EX);
 for(const [L,t] of cases){ const r=await pg.evaluate(([L,t])=>{state.lang=L;state.mode='self';state.chartB=null;const ok=chatPartnerScan(t);return [JSON.stringify(_parseDateAny(t)),ok,state.chartB&&state.chartB._bkey];},[L,t]); console.log(L,t.slice(0,40),'→',r.join(' ')); }
 console.log('errors',errs); await b.close();srv.close();});
