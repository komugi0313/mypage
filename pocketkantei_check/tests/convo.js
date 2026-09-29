// 本物のAIで、1人の利用者として続けて会話する（アプリの画面をそのまま使う）。鍵は環境変数 GEMINI_KEY
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const KEY=(process.env.GEMINI_KEY||'').trim(); if(!KEY){ console.error('GEMINI_KEY'); process.exit(1); }
const {execFile}=require('child_process');
function curlPost(url,body){ return new Promise((res,rej)=>{ const p=execFile('curl',['-s','-m','120','-w','\\n%{http_code}','-X','POST','-H','Content-Type: application/json','--data-binary','@-',url],{maxBuffer:50e6},(err,out)=>{ if(err) return rej(err); const i=out.lastIndexOf('\n'); res({status:+out.slice(i+1)||500,body:out.slice(0,i)}); }); p.stdin.end(body); }); }
const C=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const OUT=process.argv[3];
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
 const pg=await b.newPage({viewport:{width:420,height:900}}); const errs=[];pg.on('pageerror',e=>errs.push(String(e).slice(0,200)));
 await pg.route('**/*',async r=>{const u=r.request().url(); if(u.startsWith(base)) return r.continue();
   if(u.startsWith('https://generativelanguage.googleapis.com/')){ try{ const res=await curlPost(u,r.request().postData()||''); return r.fulfill({status:res.status,contentType:'application/json',body:res.body}); }catch(e){ return r.fulfill({status:599,body:'{}'}); } }
   return r.abort();});
 await pg.addInitScript((a)=>{localStorage.setItem('pk_lang',a.L);localStorage.setItem('pk_key',a.K);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify(a.p));if(a.st) localStorage.setItem('pk_tmsg',String(a.st));},{L:C.lang,K:KEY,p:C.profile,st:C.stage||0});
 await pg.goto(base+'/index.html');
 const waitAi=async(n)=>{let last=-1,stable=0;for(let i=0;i<180;i++){await pg.waitForTimeout(1000);const s=await pg.evaluate(()=>state.msgs.map(m=>m.role));
   if(s.length>=n&&s[s.length-1]==='ai'){ if(s.length===last) stable++; else {stable=0; last=s.length;} if(stable>=7) return true; } else {stable=0; last=s.length;} }return false;};
 await waitAi(1);
 for(const q of C.qs){ const n=await pg.evaluate(()=>state.msgs.length); await pg.fill('#askIn',q); await pg.click('#askBtn'); await waitAi(n+2); console.log('sent',q.slice(0,20)); }
 const msgs=await pg.evaluate(()=>state.msgs.map(m=>({role:m.role,text:m.text})));
 fs.writeFileSync(OUT,JSON.stringify({C,msgs,errs},null,1)); await b.close(); srv.close();
});
