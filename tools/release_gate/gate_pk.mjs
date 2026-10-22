// 発売前の最低限の点検（PRO/ビギナー）：計算・答えが返る・空っぽにならない・むだな呼び出しがない・オフライン
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require_=createRequire(import.meta.url);
for (const k of ['URL','DEPLOY_PRIME_URL','MEMBER_CHECK_URL','ALLOWED_ORIGINS']) delete process.env[k];
const _log=console.log; console.log=(...a)=>{const t=a.join(' '); if(/AIza|key=/.test(t))return; if(/≈¥/.test(t)){_log('   [server] '+t.slice(0,90));return;} _log(...a);};
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..'), site=process.argv[2]||'pro', MODE=process.argv[3]||'online';
const dir=site==='pro'?'pro':'beginner', page0=site==='pro'?'app-pro.html':'app-beginner.html';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(0);
await new Promise(r=>srv.on('listening',r)); const port=srv.address().port;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
let calls=0; const R=[]; const ok=(name,pass,info='')=>{R.push({name,pass,info:String(info).slice(0,200)}); console.log((pass?'  OK ':'  NG ')+name+(info?'  … '+String(info).slice(0,160):''));};
await ctx.route('**/.netlify/functions/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
const CL=[]; const T00=Date.now(); await ctx.route('**/.netlify/functions/gemini',async route=>{ calls++; const _rq=route.request(); const _b=_rq.postData()||''; const rec={n:calls,from:(_rq.frame()&&_rq.frame().url()||'').split('/').pop().slice(0,30),t:Date.now()-T00,part:(_b.match(/今回書くのは(冒頭の答えだけ|、くわしい読み解きだけ)/)||[])[1]||'?',len:_b.length}; CL.push(rec); if(/meishi/.test(rec.from)) _log('   [点検] sheet request at',rec.t);
  if(MODE!=='online'){ await route.abort('internetdisconnected'); return; }
  const req=route.request(); const h=require_(path.join(ROOT,dir,'functions','gemini.js')).handler; let r; const _tt=setTimeout(()=>_log('   ... handler still pending 30s for call',rec.n,rec.from),30000); try{ r=await h({httpMethod:'POST',headers:req.headers(),body:req.postData()||''}); }catch(e){ rec.err=String(e&&e.message||e).slice(0,200); await route.fulfill({status:500,body:'{}'}).catch(()=>{}); return; } clearTimeout(_tt); rec.status=r.statusCode; if(/meishi/.test(rec.from)) _log('   [点検] sheet handler done at',Date.now()-T00); rec.end=Date.now()-T00; try{ await route.fulfill({status:r.statusCode,headers:Object.assign({'Content-Type':'application/json'},r.headers||{}),body:r.body||''}); }catch(e){ rec.fulfillErr=e.message.slice(0,80); } return;
  await route.fulfill({status:r.statusCode,headers:Object.assign({'Content-Type':'application/json'},r.headers||{}),body:r.body||''}); });
if(MODE==='nonet') await ctx.addInitScript(()=>{ try{ Object.defineProperty(Navigator.prototype,'onLine',{get:()=>false,configurable:true}); }catch(e){} });
await ctx.addInitScript(()=>{ navigator.share=async d=>{window.__shared=d;}; navigator.canShare=()=>true; try{Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{window.__clip=t;},readText:async()=>''},configurable:true});}catch(e){} window.print=()=>{}; });
const errs=[]; ctx.on('page',pg=>{pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200));}); pg.on('requestfailed',r=>errs.push('reqfail: '+r.url().slice(0,120)));});
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
await p.goto(`http://127.0.0.1:${port}/${page0}`); await p.waitForTimeout(2500);

const waitFor=async(fn,ms)=>{const t=Date.now();while(Date.now()-t<ms){ if(await p.evaluate(fn).catch(()=>false)) return Date.now()-t; await p.waitForTimeout(200);} return -1;};
const cleanStar=t=>(String(t).match(/[\*＊]/g)||[]).length;
console.log(`■ ${site} / ${MODE}`);
ok('開いただけでは文章作成を呼ばない', calls===0, 'calls='+calls);
// 計算（基準の例）
await p.fill('#f-name','基準'); await p.click('#f-quick'); await p.keyboard.type('19810610 2228'); await p.click('#f-sex button[data-v=female]');
await p.click('#f-go'); await p.waitForTimeout(6000);
{ const h=await p.evaluate(()=>document.body.innerHTML.replace(/<[^>]+>/g,' ').replace(/\s+/g,'')); const keys=['甲午','8年6ヶ月','0歳〜8歳6ヶ月','8歳6ヶ月〜18歳6ヶ月','乙未','丙申','丁酉'];
  const miss=keys.filter(k=>!h.includes(k)); ok('計算：基準の例（甲午・順行・立運8年6ヶ月・甲午→乙未→丙申→丁酉）', miss.length===0, miss.length?'見つからない:'+miss.join(','):''); }
// 次のお客様 → 相談
const c0=calls;
await p.evaluate(()=>{const b=document.getElementById('jn-next'); if(b) b.click();}); await p.waitForTimeout(1000);
{ const left=await p.evaluate(()=>[document.getElementById('f-name').value,document.getElementById('f-date').value,(document.getElementById('cs-q')||{}).value||''].join('|')); ok('次のお客様へ：前の人の入力が残らない', left.replace(/\|/g,'')==='' , left); }
await p.fill('#f-name','山田花子'); await p.click('#f-quick'); await p.keyboard.type('19850412 1030'); await p.click('#f-sex button[data-v=female]');
const Q1='転職するなら今年と来年のどちらがいいですか';
await p.fill('#cs-q',Q1);
const t1=Date.now(); await p.click('#f-go'); await p.click('#f-go').catch(()=>{}); await p.click('#f-go').catch(()=>{});   // 三度押し
const ms=await waitFor(()=>{const it=document.querySelector('#reading .rd-item:last-child');return it&&it.querySelector('.rd-bar')&&!it.querySelector('.loading');},60000);
await p.waitForTimeout(1500);
const items=await p.evaluate(()=>document.querySelectorAll('#reading .rd-item').length);
const A=await p.evaluate(()=>{const it=document.querySelector('#reading .rd-item:last-child');return it?it.querySelector('.rd-body').innerText:'';});
ok('相談1：答えが出る（60秒以内）'+(MODE!=='online'?'（端末の中の答え・30秒以内）':''), ms>=0&&(MODE==='online'||ms<30000) && A.length>200, `${(Date.now()-t1)/1000}秒・${A.length}字`);
ok('相談1：三度押しでも答えは1つ', items===1, 'items='+items);
const cQ1=calls-c0; ok('相談1：文章作成の呼び出し回数'+(site==='beginner'?'（ビギナーは専門用語の書き直しで最大4回）':''), MODE!=='online'? true : (site==='beginner'?(cQ1>=2&&cQ1<=4):cQ1===2), 'calls='+cQ1);
const first=(A.split('\n').map(s=>s.trim()).filter(s=>s.length>8&&!/^(コピー|言葉の意味)/.test(s))[0]||'');
ok('相談1：答えの最初に結論がある', first.length>=10, first.slice(0,80));
if(MODE==='online'){ ok('相談1：年を比べる質問に、年で答えている', /今年|来年|2026|2027|年内/.test(first), first.slice(0,80));
  ok('相談1：くわしい読み解きの見出しだけが残っていない', !/くわしい読み解き\s*$/.test(A.trim()), ''); }
const calCheck=(t,by)=>{ const G='甲乙丙丁戊己庚辛壬癸', Z='子丑寅卯辰巳午未申酉戌亥', gz=y=>{const i=((y-4)%60+60)%60; return G[i%10]+Z[i%12];}, NY=new Date().getFullYear(), bad=[];
  for(const m of t.matchAll(/((?:19|20)\d\d)年[（(]?(?:[^）)\n]{0,8}[・：:、])?(\d{1,3})歳/g)){ const e=+m[1]-by; if(+m[2]!==e) bad.push(m[0]+'（正しくは'+e+'歳）'); }
  for(const m of t.matchAll(/((?:19|20)\d\d)年[（(のは：:]([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])(?![^\n]{0,3}(?:大運|月|日|時))/g)){ if(m[2]!==gz(+m[1])) bad.push(m[0]+'（正しくは'+gz(+m[1])+'）'); }
  const REL={今年:0,来年:1,再来年:2,昨年:-1,去年:-1}; for(const m of t.matchAll(/(再来年|今年|来年|昨年|去年)[（(の]((?:19|20)\d\d)/g)){ if(+m[2]!==NY+REL[m[1]]) bad.push(m[0]); }
  for(const m of t.matchAll(/(^|[^0-9])([0-9]{2})年[（(]\d{1,3}歳/g)) bad.push(m[0].trim()+'（西暦が2けた）');
  return bad; };
const unStamped=t=>{ const ys={}, ok2={}; for(const m of t.matchAll(/((?:19|20)\d\d)年(?!\d{1,2}月|[0-9]|生|度|代)/g)){ const y=m[1], a=t.slice(m.index+m[0].length,m.index+m[0].length+6), b=t.slice(Math.max(0,m.index-6),m.index); if(/[0-9〜~]$/.test(b)) continue; ys[y]=1; if(/^[（(]|^の?[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]|^(?:に|には|で|、)?\d{1,3}歳/.test(a)||/\d{1,3}歳(?:になる|を迎える)?[（(]?$/.test(b)||/[（(「『]$/.test(b)) ok2[y]=1; } return Object.keys(ys).filter(y=>!ok2[y]); };
{ const cb=calCheck(A,1985); ok('暦：年齢・年の干支・今年/来年が正しい（相談1）', cb.length===0, cb.slice(0,3).join(' / ')); }
if(MODE==='online'){ const u=unStamped(A); ok('相談1：西暦にツールの干支・年齢が付いている', u.length===0, u.map(y=>{const i=A.indexOf(y+'年');return A.slice(Math.max(0,i-15),i+12).replace(/\n/g,'⏎');}).join(' / ')); }
ok('相談1：画面に＊が出ない', cleanStar(A)===0, cleanStar(A));
// 追加の質問
const c1=calls; await p.fill('#worry','彼から連絡が来るのはいつ頃ですか'); await p.click('#consultBtn'); await p.click('#consultBtn').catch(()=>{});
const ms2=await waitFor(()=>{const it=document.querySelectorAll('#reading .rd-item');const l=it[it.length-1];return it.length>=2&&l.querySelector('.rd-bar')&&!l.querySelector('.loading');},60000);
await p.waitForTimeout(1500);
const items2=await p.evaluate(()=>document.querySelectorAll('#reading .rd-item').length);
const A2=await p.evaluate(()=>{const it=document.querySelectorAll('#reading .rd-item');return it.length?it[it.length-1].querySelector('.rd-body').innerText:'';});
if(process.env.GATE_DUMP){ (await import('fs')).writeFileSync(process.env.GATE_DUMP,A+'\n=====\n'+A2); }
ok('相談2（続けて質問）：答えが出る', ms2>=0 && A2.length>200, A2.length+'字');
{ const f2=(A2.split('\n').map(s=>s.trim()).filter(s=>s.length>8&&!/^(コピー|言葉の意味|ご相談|彼から連絡が来るのはいつ頃ですか|▲|オンライン鑑定|オフライン鑑定|📵|⏩|🔄|端末の中で作った)/.test(s))[0]||''); ok('相談2：「いつ」の質問に、1行目で時期を答えている', /20\d\d年|年内|来年|再来年|\d{1,3}歳|[春夏秋冬]|\d{1,2}月/.test(f2), f2.slice(0,80)); }
if(MODE==='online'){ const u=unStamped(A2); ok('相談2：西暦にツールの干支・年齢が付いている', u.length===0, u.map(y=>{const i=A2.indexOf(y+'年');return A2.slice(Math.max(0,i-15),i+12).replace(/\n/g,'⏎');}).join(' / ')); }
{ const cb=calCheck(A2,1985); ok('暦：年齢・年の干支・今年/来年が正しい（相談2）', cb.length===0, cb.slice(0,3).join(' / ')); }
ok('相談2：二度押しでも答えは1つ増えるだけ', items2===2, 'items='+items2);
if(MODE==='online') ok('相談2：呼び出し回数'+(site==='beginner'?'（ビギナーは専門用語の書き直しで最大4回）':'（2回）'), site==='beginner'?(calls-c1>=2&&calls-c1<=4):calls-c1===2, 'calls='+(calls-c1));
// チャット用コピー・共有
await p.evaluate(()=>{window.__clip='';window.__shared=null;});
await p.click('#reading .rd-item:last-child .rd-chat').catch(()=>{}); await p.waitForTimeout(600);
const chat=await p.evaluate(()=>window.__clip||''); { const cb=calCheck(chat,1985); ok('暦：チャット用コピーの年齢・干支・今年/来年が正しい', cb.length===0, cb.slice(0,3).join(' / ')); } ok('チャット用コピーが空でない・＊なし', chat.length>80&&cleanStar(chat)===0, chat.length+'字');
await p.click('#reading .rd-item:last-child .rd-share').catch(()=>{}); await p.waitForTimeout(600);
const sh=await p.evaluate(()=>((window.__shared||{}).text||'')); ok('共有（LINE）の文が空でない・＊なし', sh.length>80&&cleanStar(sh)===0, sh.length+'字');
// カルテ
const k=await p.evaluate(()=>{try{const c=mpLoad().clients.find(x=>x.name==='山田花子');return c?c.readings.map(r=>r.text):[];}catch(e){return ['ERR'];}});
ok('カルテに2件とも保存・空でない・＊なし', k.length>=2&&k.every(t=>t.length>100&&cleanStar(t)===0), k.map(t=>t.length).join(','));
// 鑑定書
const c2=calls;
const [pop]=await Promise.all([ctx.waitForEvent('page',{timeout:10000}).catch(()=>null), p.click('#jn-print')]);
if(!pop){ ok('鑑定書が開く', false); } else {
  await pop.waitForLoadState('load').catch(()=>{});
  const t=Date.now(); let txt='';
  _log('   [点検] wait loop start',Date.now()-T00); while(Date.now()-t<70000){ txt=await pop.evaluate(()=>{const o=document.getElementById('sheetsWrap');return o?o.innerText:'';}).catch(()=>''); const busy=await pop.evaluate(()=>/作成しています|作成中|生成中|読み解いています/.test((document.getElementById('sheetsWrap')||{}).innerText||'')).catch(()=>true); if(txt.length>1500&&!busy&&Date.now()-t>4000) break; await pop.waitForTimeout(500); }
  await pop.waitForTimeout(2500); txt=await pop.evaluate(()=>(document.getElementById('sheetsWrap')||{}).innerText||'').catch(()=>txt);

  ok('鑑定書：中身が空でない', txt.length>1500, txt.length+'字');
  ok('鑑定書：＊なし', cleanStar(txt)===0, cleanStar(txt));
  if(MODE==='online') ok('鑑定書：呼び出し回数（目安1〜3回）', calls-c2>=1&&calls-c2<=3, 'calls='+(calls-c2));
  await pop.close(); }
const _e=errs.filter(x=>!/reqfail: .*gemini/.test(x)&&!(MODE!=='online'&&/ERR_INTERNET_DISCONNECTED/.test(x))); ok('画面のエラー0件', _e.length===0, _e.slice(0,3).join(' | '));

console.log(JSON.stringify(CL)); console.log(`  → ${R.filter(x=>!x.pass).length===0?'合格':'不合格'}（${R.filter(x=>x.pass).length}/${R.length}）  呼び出し合計 ${calls}`);
await b.close(); srv.close();
