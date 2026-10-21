const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require_=createRequire(import.meta.url);
for (const k of ['URL','DEPLOY_PRIME_URL','MEMBER_CHECK_URL','ALLOWED_ORIGINS']) delete process.env[k];
const _log=console.log; console.log=(...a)=>{const t=a.join(' '); if(/AIza|key=|≈¥/.test(t))return; _log(...a);};
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..'), MODE=process.argv[2]||'online';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.jpg':'image/jpeg'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,'eki-pro',p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(0);
await new Promise(r=>srv.on('listening',r)); const port=srv.address().port;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
let calls=0, modals=0; const R=[]; const ok=(name,pass,info='')=>{R.push({name,pass}); console.log((pass?'  OK ':'  NG ')+name+(info!==''?'  … '+String(info).slice(0,160):''));};
await ctx.route('**/.netlify/functions/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
await ctx.route('**/.netlify/functions/gemini',async route=>{ calls++; if(MODE!=='online'){ await route.abort('internetdisconnected'); return; }
  const req=route.request(); const h=require_(path.join(ROOT,'eki-pro','functions','gemini.js')).handler; let r; try{ r=await h({httpMethod:'POST',headers:req.headers(),body:req.postData()||''}); }catch(e){ r={statusCode:500,body:'{}'}; }
  try{ await route.fulfill({status:r.statusCode,headers:Object.assign({'Content-Type':'application/json'},r.headers||{}),body:r.body||''}); }catch(e){} });
if(MODE==='nonet') await ctx.addInitScript(()=>{ try{ Object.defineProperty(Navigator.prototype,'onLine',{get:()=>false,configurable:true}); }catch(e){} });
await ctx.addInitScript(()=>{ navigator.share=async d=>{window.__shared=d;}; navigator.canShare=()=>true; try{Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__clip=t;},readText:async()=>'',write:async()=>{}},configurable:true});}catch(e){} window.print=()=>{}; });
const errs=[]; ctx.on('page',pg=>{ pg.on('pageerror',e=>errs.push(e.message)); });
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
await p.goto(`http://127.0.0.1:${port}/app/index.html`); await p.waitForTimeout(2500);
const waitFor=async(fn,ms,arg)=>{const t=Date.now();while(Date.now()-t<ms){ if(await p.evaluate(fn,arg).catch(()=>false)) return Date.now()-t; await p.waitForTimeout(200);} return -1;};
const star=t=>(String(t).match(/[\*＊]/g)||[]).length;
console.log(`■ eki / ${MODE}`);
ok('開いただけでは文章作成を呼ばない', calls===0, 'calls='+calls);
async function consult(q,nums){ await p.evaluate(()=>scrollTo(0,0)); await p.click('.ct-number'); await p.waitForTimeout(300);
  for(const [i,v] of [['#num1',nums[0]],['#num2',nums[1]],['#num3',nums[2]]]) await p.fill(i,String(v));
  await p.fill('#question',q); const c0=calls; const t0=Date.now();
  await p.click('#goBtn'); const _tk=Date.now(); await p.click('#goBtn',{timeout:3000}).catch(()=>{}); await p.click('#goBtn',{timeout:3000}).catch(()=>{});
  const keepModal=async()=>{ const m=await p.evaluate(()=>{const m=document.getElementById('nrModal'); if(m&&getComputedStyle(m).display!=='none'&&getComputedStyle(m).visibility!=='hidden'){ const k=m.querySelector('[data-k=keep]')||m.querySelector('[data-k=cancel]'); if(k){k.click(); return 'keep';} } return '';}); if(m) modals++; };
  for(let i=0;i<6;i++){ await p.waitForTimeout(300); await keepModal(); }
  const ms=await waitFor(()=>{const m=document.getElementById('nrModal'); if(m&&getComputedStyle(m).display!=='none'&&getComputedStyle(m).visibility!=='hidden'){const k=m.querySelector('[data-k=keep]')||m.querySelector('[data-k=cancel]'); if(k) k.click();} const w=document.getElementById('fuWait');const f=document.getElementById('fuSend');const v=document.getElementById('verdictCard');return document.getElementById('shikaBox').textContent.trim().length>0&&(!w||getComputedStyle(w).display==='none')&&f&&!f.disabled&&v&&v.innerText.length>20;},60000);
  await p.waitForTimeout(1200);
  return {ms, secs:(Date.now()-t0)/1000, calls:calls-c0, v:await p.evaluate(()=>(document.getElementById('verdictCard')||{}).innerText||''), res:await p.evaluate(()=>(document.getElementById('result')||{}).innerText||''), hex:await p.evaluate(()=>(document.getElementById('hexName')||{}).innerText||'')};
}
// 1人目
const A=await consult('転職するなら今年と来年のどちらがいいですか',[3,8,15]);
ok('相談1：答えが出る'+(MODE!=='online'?'（端末の中の答え・40秒以内）':''), A.ms>=0&&A.res.length>200&&(MODE==='online'||A.ms<40000), `${A.secs}秒・卦=${A.hex}`);
if(MODE==='online') ok('相談1：三度押しでも呼び出しは1件分（2回以下）', A.calls<=2, 'calls='+A.calls);
const first=(A.v.split('\n').map(s=>s.trim()).filter(s=>s.length>6&&!/^(この相談への答え|[◎〇○△✖×])$/.test(s))[0]||'');
ok('相談1：答えの欄に結論がある', first.length>=8, first.slice(0,80));
ok('相談1：画面に＊が出ない', star(A.res)===0, star(A.res));
// 続けての質問
const fb=await p.evaluate(()=>document.querySelectorAll('#fuLog .fu-msg.ai').length); const c1=calls;
await p.fill('#fuText','来年のいつ頃がいいですか'); await p.click('#fuSend'); await p.click('#fuSend').catch(()=>{});
const fm=await waitFor(b=>document.querySelectorAll('#fuLog .fu-msg.ai').length>b&&!document.querySelector('#fuLog .fu-msg.think'),60000,fb);
await p.waitForTimeout(800);
const F=await p.evaluate(()=>{const a=document.querySelectorAll('#fuLog .fu-msg.ai');return {n:a.length,t:a.length?a[a.length-1].innerText:''};});
ok('続けての質問：答えが出る', fm>=0&&F.t.length>30, F.t.length+'字 '+F.t.slice(0,90).replace(/\n/g,' '));
ok('続けての質問：二度押しでも答えは1つ', F.n===fb+1, 'n='+(F.n-fb));
if(MODE==='online') ok('続けての質問：呼び出し1回', calls-c1===1, 'calls='+(calls-c1));
// コピー
for(const id of ['copyScript','copyTalk']){ await p.evaluate(()=>{window.__clip='';}); await p.click('#'+id).catch(()=>{}); await p.waitForTimeout(500); const c=await p.evaluate(()=>window.__clip||''); ok(`コピー（${id==='copyScript'?'まずこれを読む':'台本'}）が空でない・＊なし`, c.length>40&&star(c)===0, c.length+'字'); }
// 鑑定書
const c2=calls; await p.evaluate(()=>{document.getElementById('shoContent').innerHTML=''; document.getElementById('makeSho').click();});
const sm=await waitFor(()=>{const t=document.getElementById('shoContent').innerText; return t.length>300&&/結びのことば|ご相談について/.test(t)&&!/作成しています/.test(t);},70000);
await p.waitForTimeout(800); const S=await p.evaluate(()=>document.getElementById('shoContent').innerText);
ok('鑑定書：中身が空でない', sm>=0&&S.length>300, S.length+'字');
ok('鑑定書：＊なし', star(S)===0, star(S));
if(MODE==='online') ok('鑑定書：呼び出し1回', calls-c2===1, 'calls='+(calls-c2));
await p.evaluate(()=>{const o=document.getElementById('shoOverlay'); if(o) o.classList.remove('open'); document.body.classList.remove('sho-open');});
// カルテ
const ls=await p.evaluate(()=>{let o='';for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);o+=localStorage.getItem(k);}return o;});
ok('カルテ（端末の保存）に相談が残る・＊なし', ls.includes('転職するなら今年と来年')&&star(ls)===0, ls.length+'字');
// 次のお客様
await p.evaluate(()=>{ const b=[...document.querySelectorAll('[data-next-cust]')].find(x=>x.offsetParent)||document.querySelector('[data-next-cust]'); if(b) b.click(); }); await p.waitForTimeout(800);
await p.evaluate(()=>{const m=document.getElementById('nrModal'); if(m){const n=m.querySelector('[data-k=new]'); n?n.click():m.remove();}}); await p.waitForTimeout(500);
const left=await p.evaluate(()=>({q:(document.getElementById('question')||{}).value||'', r:getComputedStyle(document.getElementById('result')).display, fu:(document.getElementById('fuLog')||{}).innerText||''}));
ok('次のお客様へ：前の人の相談・結果が残らない', !left.q&&(left.r==='none'||!left.fu.trim()), JSON.stringify(left).slice(0,100));
// 2人目
const B=await consult('彼から連絡は来ますか',[7,2,11]);
ok('相談2（次のお客様）：答えが出る', B.ms>=0&&B.res.length>200, `${B.secs}秒・卦=${B.hex}`);
ok('相談2：前の人の相談が混ざらない', !/転職/.test(B.v), '');
ok('画面のエラー0件', errs.length===0, errs.slice(0,3).join(' | '));
console.log(`  → ${R.filter(x=>!x.pass).length===0?'合格':'不合格'}（${R.filter(x=>x.pass).length}/${R.length}）  呼び出し合計 ${calls}`);
await b.close(); srv.close();
