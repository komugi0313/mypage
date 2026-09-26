const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const KEY=(process.env.GEMINI_KEY||'').trim(); if(!KEY){console.error('環境変数 GEMINI_KEY にテスト用のAPIキーを入れてください');process.exit(1);}
const {execFile}=require('child_process');
function curlPost(url,body){ return new Promise((res,rej)=>{ const p=execFile('curl',['-s','-m','120','-w','\\n%{http_code}','-X','POST','-H','Content-Type: application/json','--data-binary','@-',url],{maxBuffer:50e6},(err,out)=>{ if(err) return rej(err); const i=out.lastIndexOf('\n'); res({status:+out.slice(i+1)||500,body:out.slice(0,i)}); }); p.stdin.end(body); }); }
const ONLY=process.argv[2]?process.argv[2].split(','):null;
const Q=JSON.parse(fs.readFileSync('finalq.json','utf8'));
const PL={ja:'osaka',en:'london',zh:'shanghai',zt:'taipei',ko:'busan',vi:'hanoi',es:'mexico',pt:'saopaulo',id:'jakarta',th:'bangkok'};
const PLAN=Object.keys(Q).map(L=>[L,PL[L],Q[L]]);
let seed=Date.now()%100000;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
 const out=[];
 const one=async([L,place,qs])=>{
  const prof={name:'',y:1960+Math.floor(rnd()*45),m:1+Math.floor(rnd()*12),d:1+Math.floor(rnd()*28),tu:false,hh:Math.floor(rnd()*24),mi:Math.floor(rnd()*60),sex:L==='es'?'female':L==='pt'?'male':(rnd()<.5?'male':'female'),place};
  const pg=await b.newPage({viewport:{width:420,height:900}}); const errs=[];pg.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await pg.route('**/*',async r=>{const u=r.request().url();
    if(u.startsWith(base)) return r.continue();
    if(u.startsWith('https://generativelanguage.googleapis.com/')){ /* テスト環境のプロキシ経由で送る（TLS検証は有効のまま） */
      try{ const body=r.request().postData()||''; const res=await curlPost(u,body); try{ const j=JSON.parse(res.body); if(j.usageMetadata) fs.appendFileSync('usage_log.jsonl',JSON.stringify({L,model:(u.match(/models\/([^:]+)/)||[])[1],u:j.usageMetadata})+'\n'); }catch(_e){} return r.fulfill({status:res.status,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:res.body}); }
      catch(e){ return r.fulfill({status:599,body:'{}'}); } }
    return r.abort();});
  await pg.addInitScript((a)=>{localStorage.setItem('pk_lang',a.L);localStorage.setItem('pk_key',a.K);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify(a.p));},{L,K:KEY,p:prof});
  await pg.goto(base+'/index.html');
  /* 返事（複数の吹き出し）が出そろい、8秒間変化が無くなるまで待つ */
  const waitAi=async(n)=>{let last=-1,stable=0;for(let i=0;i<180;i++){await pg.waitForTimeout(1000);const s=await pg.evaluate(()=>state.msgs.map(m=>m.role));const typing=await pg.evaluate(()=>!!document.querySelector('.typing,.dots,.msg.typing'));
    if(s.length>=n&&s[s.length-1]==='ai'&&!typing){ if(s.length===last) stable++; else {stable=0; last=s.length;} if(stable>=8) return true; } else {stable=0; last=s.length;} }return false;};
  await waitAi(1);
  const facts=await pg.evaluate(()=>{const P=state.chart.pro,cd=curDecade(P),nd=P.decadeFortunes[P.now.daeunIndex+1]||P.decadeFortunes[0];let sb=null;try{const a=setsubokuAnalysis();sb=a&&a.next?{age:a.next.startAge,year:a.next.startYear,gz:a.next.ganzhi}:null;}catch(e){}
    return {pillars:P.pillars.map(p=>p.ganzhi).join(' '),ritsuun:P.startFortune.years+'y'+P.startFortune.months+'m '+(P.startFortune.forward?'順':'逆'),age:P.now.age,cur:cd&&(cd.ganzhi+' '+(cd.isMonth?'月柱':'')+' '+cd.startYear+'〜 (age '+cd.startAge+'y'+(cd.months||0)+'m)'),next:nd&&(nd.ganzhi+' from '+nd.startYear+'/'+nd.startMonth+' (age '+nd.startAge+'y'+nd.months+'m)'),year:P.now.year+' '+(P.annualFortunes.find(a=>a.year===P.now.year)||{}).ganzhi,setsuboku:sb};});
  for(const q of qs){ const n=await pg.evaluate(()=>state.msgs.length); await pg.fill('#askIn',q); await pg.click('#askBtn'); await waitAi(n+2); }
  const msgs=await pg.evaluate(()=>state.msgs.map(m=>({role:m.role,text:m.text})));
  out.push({L,place,prof,facts,msgs,errs}); await pg.close();
  fs.writeFileSync('final2_all.json',JSON.stringify(out,null,1));
  console.log('done',L,msgs.length,errs.length);
 };
 const todo=PLAN.filter(p=>!ONLY||ONLY.includes(p[0])); const run=async()=>{while(todo.length){await one(todo.shift());}};
 await Promise.all([run(),run(),run(),run(),run()]);
 await b.close();srv.close();
});
