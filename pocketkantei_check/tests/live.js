const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const KEY=(process.env.GEMINI_KEY||'').trim(); if(!KEY){console.error('環境変数 GEMINI_KEY にテスト用のAPIキーを入れてください');process.exit(1);}
const {execFile}=require('child_process');
function curlPost(url,body){ return new Promise((res,rej)=>{ const p=execFile('curl',['-s','-m','120','-w','\\n%{http_code}','-X','POST','-H','Content-Type: application/json','--data-binary','@-',url],{maxBuffer:50e6},(err,out)=>{ if(err) return rej(err); const i=out.lastIndexOf('\n'); res({status:+out.slice(i+1)||500,body:out.slice(0,i)}); }); p.stdin.end(body); }); }
const ONLY=process.argv[2]?process.argv[2].split(','):null;
const PLAN=[
 ['ja','tokyo',['今の10年はどんな時期？いつ切り替わる？','今年の運勢はどう？','次の大きな人生の転機はいつ？']],
 ['en','newyork',['What is my current 10-year period like, and when does it change?','How is my luck this year?','When is my next big turning point in life?']],
 ['zh','beijing',['我现在这十年是什么样的时期？什么时候会转换？','我今年的运势怎么样？','我人生下一个大转折点是什么时候？']],
 ['zt','taipei',['我現在這十年是什麼樣的時期？什麼時候會轉換？','我今年的運勢怎麼樣？','我人生下一個大轉折點是什麼時候？']],
 ['ko','seoul',['지금 10년은 어떤 시기예요? 언제 바뀌어요?','올해 운세는 어때요?','인생의 다음 큰 전환점은 언제예요?']],
 ['vi','hcmc',['Giai đoạn 10 năm hiện tại của tôi thế nào, khi nào thay đổi?','Vận may năm nay của tôi thế nào?','Bước ngoặt lớn tiếp theo trong đời tôi là khi nào?']],
 ['es','madrid',['¿Cómo es mi etapa actual de 10 años y cuándo cambia?','¿Cómo es mi suerte este año?','¿Cuándo es mi próximo gran punto de inflexión en la vida?']],
 ['pt','saopaulo',['Como é o meu período atual de 10 anos e quando ele muda?','Como está a minha sorte este ano?','Quando é a minha próxima grande virada na vida?']],
 ['id','jakarta',['Seperti apa periode 10 tahun saya sekarang, dan kapan berganti?','Bagaimana keberuntungan saya tahun ini?','Kapan titik balik besar berikutnya dalam hidup saya?']],
 ['th','bangkok',['ช่วง 10 ปีตอนนี้ของฉันเป็นอย่างไร และจะเปลี่ยนเมื่อไหร่','ดวงปีนี้ของฉันเป็นอย่างไร','จุดเปลี่ยนใหญ่ครั้งต่อไปในชีวิตฉันคือเมื่อไหร่']],
];
let seed=Date.now()%100000;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
 const out=[];
 for(const [L,place,qs] of PLAN){
  if(ONLY&&!ONLY.includes(L)) continue;
  const prof={name:'',y:1960+Math.floor(rnd()*45),m:1+Math.floor(rnd()*12),d:1+Math.floor(rnd()*28),tu:false,hh:Math.floor(rnd()*24),mi:Math.floor(rnd()*60),sex:rnd()<.5?'male':'female',place};
  const pg=await b.newPage({viewport:{width:420,height:900}}); const errs=[];pg.on('pageerror',e=>errs.push(String(e).slice(0,200)));
  await pg.route('**/*',async r=>{const u=r.request().url();
    if(u.startsWith(base)) return r.continue();
    if(u.startsWith('https://generativelanguage.googleapis.com/')){ /* テスト環境のプロキシ経由で送る（TLS検証は有効のまま） */
      try{ const body=r.request().postData()||''; const res=await curlPost(u,body); return r.fulfill({status:res.status,headers:{'content-type':'application/json','access-control-allow-origin':'*'},body:res.body}); }
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
  fs.writeFileSync('live_'+(ONLY?ONLY.join('_'):'all')+'.json',JSON.stringify(out,null,1));
  console.log('done',L,msgs.length,errs.length);
 }
 await b.close();srv.close();
});
