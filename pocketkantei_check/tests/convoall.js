// 本物のAIで、たくさんの利用者（言語・気持ち・悩み）として続けて会話する。鍵は環境変数 GEMINI_KEY
// 使い方: GEMINI_KEY=… node convoall.js personas.json 結果.json [同時に動かす数] [ID,ID…]
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const KEY=(process.env.GEMINI_KEY||'').trim(); if(!KEY){ console.error('環境変数 GEMINI_KEY にテスト用のキーを入れてください'); process.exit(1); }
const {execFile}=require('child_process');
function curlPost(url,body){ return new Promise((res,rej)=>{ const p=execFile('curl',['-s','-m','150','-w','\\n%{http_code}','-X','POST','-H','Content-Type: application/json','--data-binary','@-',url],{maxBuffer:50e6},(err,out)=>{ if(err) return rej(err); const i=out.lastIndexOf('\n'); res({status:+out.slice(i+1)||500,body:out.slice(0,i)}); }); p.stdin.end(body); }); }
const P=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const OUT=process.argv[3]; const PAR=+process.argv[4]||6; const ONLY=process.argv[5]?process.argv[5].split(','):null;
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch(); const out=[];
 const one=async(C)=>{
  const TZ={ja:'Asia/Tokyo',en:{london:'Europe/London',newyork:'America/New_York',sydney:'Australia/Sydney',toronto:'America/Toronto',la:'America/Los_Angeles'},ko:'Asia/Seoul',zh:'Asia/Shanghai',zt:'Asia/Taipei',vi:'Asia/Ho_Chi_Minh',es:{mexico:'America/Mexico_City',madrid:'Europe/Madrid'},pt:'America/Sao_Paulo',id:'Asia/Jakarta',th:'Asia/Bangkok'};
  const tzv=TZ[C.lang]; const tz=typeof tzv==='string'?tzv:(tzv[C.profile.place]||Object.values(tzv)[0]);
  const ctx=await b.newContext({viewport:{width:420,height:900},timezoneId:tz,locale:{ja:'ja-JP',en:'en-US',ko:'ko-KR',zh:'zh-CN',zt:'zh-TW',vi:'vi-VN',es:'es-ES',pt:'pt-BR',id:'id-ID',th:'th-TH'}[C.lang]}); const pg=await ctx.newPage(); const errs=[]; const models=[];pg.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await pg.route('**/*',async r=>{const u=r.request().url(); if(u.startsWith(base)) return r.continue();
    if(u.startsWith('https://generativelanguage.googleapis.com/')){ models.push((u.match(/models\/([^:]+)/)||[])[1]); try{ const res=await curlPost(u,r.request().postData()||''); return r.fulfill({status:res.status,contentType:'application/json',body:res.body}); }catch(e){ return r.fulfill({status:599,body:'{}'}); } }
    return r.abort();});
  await pg.addInitScript((a)=>{localStorage.setItem('pk_lang',a.L);localStorage.setItem('pk_key',a.K);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify(a.p));if(a.st) localStorage.setItem('pk_tmsg',String(a.st));},{L:C.lang,K:KEY,p:C.profile,st:C.stage||0});
  await pg.goto(base+'/index.html');
  const waitAi=async(n)=>{let last=-1,stable=0;for(let i=0;i<200;i++){await pg.waitForTimeout(1000);const s=await pg.evaluate(()=>state.msgs.map(m=>m.role));
    if(s.length>=n&&s[s.length-1]==='ai'){ if(s.length===last) stable++; else {stable=0; last=s.length;} if(stable>=7) return true; } else {stable=0; last=s.length;} }return false;};
  await waitAi(1);
  const turns=[];
  for(const q of C.qs){ const n=await pg.evaluate(()=>state.msgs.length); const m0=models.length; await pg.fill('#askIn',q); await pg.click('#askBtn'); await waitAi(n+2);
    const msgs=await pg.evaluate(()=>state.msgs.map(m=>({role:m.role,text:m.text})));
    const reply=msgs.slice(n+1).filter(m=>m.role==='ai').map(m=>m.text);
    turns.push({q,reply,models:models.slice(m0)}); }
  out.push({id:C.id,lang:C.lang,theme:C.theme,turns,errs}); fs.writeFileSync(OUT,JSON.stringify(out,null,1)); await ctx.close(); console.log('done',C.id,errs.length);
 };
 const todo=P.filter(p=>!ONLY||ONLY.includes(p.id)); const run=async()=>{while(todo.length){ const c=todo.shift(); try{ await one(c); }catch(e){ console.log('fail',c.id,String(e).slice(0,100)); } }};
 await Promise.all(Array.from({length:PAR},run));
 await b.close();srv.close();
});
