// ニコの姿勢（肯定・応援・厳しい助言・寄り添い・根拠）を、本物のAIで確かめる。鍵は .gemkey（テスト用）
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const KEY=(process.env.GEMINI_KEY||'').trim(); if(!KEY){ console.error('環境変数 GEMINI_KEY にテスト用のキーを入れてください'); process.exit(1); }
const {execFile}=require('child_process');
function curlPost(url,body){ return new Promise((res,rej)=>{ const p=execFile('curl',['-s','-m','120','-w','\\n%{http_code}','-X','POST','-H','Content-Type: application/json','--data-binary','@-',url],{maxBuffer:50e6},(err,out)=>{ if(err) return rej(err); const i=out.lastIndexOf('\n'); res({status:+out.slice(i+1)||500,body:out.slice(0,i)}); }); p.stdin.end(body); }); }
const Q=JSON.parse(fs.readFileSync('stanceq.json','utf8'));
const OUT=process.argv[2]||'stance_out.json';
const PL={ja:'osaka',en:'london',ko:'busan',es:'mexico',zh:'shanghai',zt:'taipei',vi:'hanoi',pt:'saopaulo',id:'jakarta',th:'bangkok'};
const STAGES=(process.env.STAGES||'5,80').split(',').map(Number);
const ONLY=process.env.ONLY?process.env.ONLY.split(','):null; const jobs=[]; for(const L of Object.keys(Q)) for(const S of Object.keys(Q[L])) for(const st of (L==='ja'?STAGES:[80])) if(!ONLY||ONLY.includes(L+S)) jobs.push({L,S,st,...Q[L][S]});
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch(); const out=[];
 const one=async(J)=>{
  const prof={name:J.L==='ja'?'みさき':'Misa',y:1994,m:3,d:17,tu:false,hh:9,mi:30,sex:'female',place:PL[J.L]};
  const pg=await b.newPage({viewport:{width:420,height:900}}); const errs=[]; const models=[];pg.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await pg.route('**/*',async r=>{const u=r.request().url(); if(u.startsWith(base)) return r.continue();
    if(u.startsWith('https://generativelanguage.googleapis.com/')){ try{ let _pb={}; try{_pb=JSON.parse(r.request().postData()||'{}');}catch(e){} models.push((u.match(/models\/([^:]+)/)||[])[1]+':'+(((_pb.systemInstruction||{}).parts||[{}])[0].text||'').length); const res=await curlPost(u,r.request().postData()||''); return r.fulfill({status:res.status,contentType:'application/json',body:res.body}); }catch(e){ return r.fulfill({status:599,body:'{}'}); } }
    return r.abort();});
  await pg.addInitScript((a)=>{localStorage.setItem('pk_lang',a.L);localStorage.setItem('pk_key',a.K);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify(a.p));localStorage.setItem('pk_tmsg',String(a.st));
    if(a.hist) localStorage.setItem('pk_msgs',JSON.stringify(a.hist.map(h=>({role:h[0],text:h[1]})))); if(a.mem) localStorage.setItem('pk_mem',a.mem);},{L:J.L,K:KEY,p:prof,st:J.st,hist:J.hist,mem:J.mem});
  await pg.goto(base+'/index.html');
  const waitAi=async(n)=>{let last=-1,stable=0;for(let i=0;i<180;i++){await pg.waitForTimeout(1000);const s=await pg.evaluate(()=>state.msgs.map(m=>m.role));
    if(s.length>=n&&s[s.length-1]==='ai'){ if(s.length===last) stable++; else {stable=0; last=s.length;} if(stable>=7) return true; } else {stable=0; last=s.length;} }return false;};
  await waitAi(1);
  const n=await pg.evaluate(()=>state.msgs.length); await pg.fill('#askIn',J.q); await pg.click('#askBtn'); await waitAi(n+2);
  const msgs=await pg.evaluate(()=>state.msgs.map(m=>({role:m.role,text:m.text})));
  const i=msgs.map(m=>m.text).lastIndexOf(J.q);
  const reply=msgs.slice(i+1).filter(m=>m.role==='ai').map(m=>m.text).join('\n');
  out.push({L:J.L,S:J.S,st:J.st,q:J.q,reply,errs,models}); fs.writeFileSync(OUT,JSON.stringify(out,null,1)); await pg.close();
  console.log('done',J.L,J.S,J.st);
 };
 const todo=jobs.slice(); const run=async()=>{while(todo.length){await one(todo.shift());}};
 await Promise.all([run(),run(),run(),run(),run()]);
 await b.close();srv.close();
});
