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
{ const r=await p.evaluate(()=>{ if(typeof window.ekiEvidence!=='function') return ''; const h=HEXDB['1-1'], rr={h:h,ko:2,koData:h.ko[2]};   /* ③ 根拠のチェック表：卦の名前・原文・動いた爻・命式の話 */
    return window.ekiEvidence(rr,{hantei:'乾為天が出ました。卦辞は「乾。元亨利貞。」。動いた爻は三爻です。',script:'「見龍在田」。「天下太平無事」。坤為地のように。'},'あなたの命式では日柱に咸池があります。').map(x=>x.st+'|'+x.what).join('\n'); });
  ok('根拠のチェック表：卦・原文・動いた爻・命式の話を照らし合わせる', /^ok\|乾為天/m.test(r)&&/^warn\|坤為地/m.test(r)&&/^ok\|「乾。元亨利貞。」/m.test(r)&&/^ok\|「見龍在田」/m.test(r)&&/^warn\|「天下太平無事」/m.test(r)&&/^warn\|動いた爻＝三爻/m.test(r)&&/^drop\|命式・星の話/m.test(r), r.replace(/\n/g,' / ').slice(0,200)); }
{ /* 言い直した現代語訳（TAI_FIX）で、先生の元の訳より答えの記号が上がらないこと（例：水雷屯の初爻が✖→〇になっていた 2026-10-30） */
  const s=fs.readFileSync(path.join(ROOT,'eki-pro','app','index.html'),'utf8');
  const grab=st=>{const i=s.indexOf(st);let d=0,j=s.indexOf('{',i);for(;j<s.length;j++){if(s[j]=='{')d++;else if(s[j]=='}'){d--;if(!d)break;}}return s.slice(i,j+1);};
  const line=st=>{const i=s.indexOf(st);return s.slice(i,s.indexOf('\n',i));};
  const code=[line('const HEXKK='),line('const HEXDB='),line('const KO_KYO='),grab('const TAI_FIX=')+';',grab('function mTai('),grab('function koTone('),line('const TAI_POS='),line('const TAI_NEG='),grab('function koAdjustRank('),grab('function rankToVerdict(')].join('\n');
  const up=new Function(code+`;const o={'◎':0,'〇':1,'△':2,'✖':3},bad=[];for(const [k,h] of Object.entries(HEXDB)){const b=HEXKK[k]||'C';for(let ko=1;ko<=6;ko++){const d=h.ko[ko];const now=rankToVerdict(koAdjustRank(b,d.jd,d.tai,mTai(h,ko))).sym, raw=rankToVerdict(koAdjustRank(b,d.jd,d.tai,String(d.tai).replace(/◎/g,''))).sym;if(o[now]<o[raw])bad.push(h.nm+ko+'爻 '+raw+'→'+now);}}return bad;`)();
  ok('言い直した訳で答えの記号が先生の訳より上がらない（水雷屯の初爻など）', up.length===0, up.join(' / ')); }
{ const s=fs.readFileSync(path.join(ROOT,'eki-pro','app','index.html'),'utf8'); ok('坤為地の上爻（龍戦于野）は✖（鑑定者本人の判断 2026-10-30）', /var KO_RANK_FIX=\{[^}]*'2-6':'E'/.test(s)&&/return KO_RANK_FIX\[hx\.no\+'-'\+k\]\|\|koAdjustRank\(/.test(s)); }
{ /* 2026-11-14 実地の点検で直したもの：頼み方の注記・「続けるべきか」・ちがいの書かれていないA社B社・金運の時期・近い日の試験・今は「今は…」・要点メモの「・」 */
  const r=await p.evaluate(()=>{ const F=window.__ekiFix; if(!F) return {bad:['点検用の __ekiFix がない']}; const bad=[];
    const key=nm=>Object.keys(HEXDB).find(k=>HEXDB[k].nm===nm).split('-').map(Number);
    const run=(nm,ko,txt,q)=>{ const [u,l]=key(nm); const rr=F.buildResult(u,l,ko,[ko]); window.__ekiQ=q; return F.ekiFixSym(F.ekiCleanReading(F.parseReading(txt),q),rr,q); };
    let P=run('山火賁',3,'▼判定：〇 今の転職は急がない方がよいでしょう （※指示にある記号と一言の形式に合わせ、お仕事は丁寧な準備から進めるのが良い時期です）\n▼伝え方：いまの仕事について、内面を磨く時期です。\n▼助言：・生活を整えましょう','今の仕事を続けるべきか迷っています');
    if(/指示|形式|転職/.test(P.hantei)||!/続け/.test(P.hantei)) bad.push('続けるべきか：'+P.hantei);
    P=run('山火賁',3,'▼判定：〇 素直に進めるA社が合います。\n▼伝え方：素直に進めるほうの「A社」が合っていますよ。今は実力を蓄えるときです。次の春の足音が聞こえる頃には、良い方向へ向かいやすくなりますよ。\n▼助言：・小細工をしないようにしましょう。','A社とB社どちらに転職すべきですか');
    if(/A社が合|「A社」が合/.test(P.hantei+P.tsutae)||!/ほうを選ぶのが合います/.test(P.hantei)||/春の足音/.test(P.tsutae)) bad.push('A社B社：'+P.hantei+' / '+P.tsutae.slice(0,60));
    P=run('地天泰',2,'▼判定：〇 金運は上向きです\n▼伝え方：金運は良い流れです。上向く時期は来年の春以降が目安です。固定費を見直しましょう。\n▼助言：・貯金をしましょう','金運はどうですか');
    if(/来年|以降が目安|春/.test(P.tsutae)) bad.push('金運の時期：'+P.tsutae.slice(0,80));
    { const [u,l]=key('地天泰'); const mf=F.ekiMoneyFlow(F.buildResult(u,l,2,[2])); if(/来年|時期|ごろ|頃|以降/.test(mf)) bad.push('ekiMoneyFlow に時期：'+mf); }
    P=run('水雷屯',2,'▼判定：△ 焦らず準備を重ねましょう\n▼伝え方：これからの数か月で基礎を固め、整った頃を見据えて試験に臨みましょう。毎日少しずつ過去問を解きましょう。\n▼助言：・過去問を解く','来月の資格試験は受かりますか');
    if(/数か月|見据えて/.test(P.tsutae)||!/見込み|五分|厳しめ/.test(P.hantei)) bad.push('近い日の試験：'+P.hantei+' / '+P.tsutae.slice(0,80));
    { const [u,l]=key('雷地豫'); const o=F.buildOfflineReading(F.buildResult(u,l,2,[2]),'来月の資格試験は受かりますか'); if(!/見込み|五分|厳しめ/.test(o.hantei)||/前向きに進んで大丈夫/.test(o.hantei)) bad.push('通信なしの試験の1行目：'+o.hantei); }
    { const [u,l]=key('水天需'); const o=F.buildOfflineReading(F.buildResult(u,l,4,[4]),'仕事はこのままでいいですか'); if(/今は「今は/.test(o.tsutae)) bad.push('今は「今は…」：'+o.tsutae.slice(0,60)); }
    { const L=F.ekiBulSplit('今回の線（三爻＝下から3本目。物語でいうと内から外への境目・試練の段階）の言葉ですよ\n・Aです。・Bです'); if(L.length!==3) bad.push('要点メモの分け方：'+JSON.stringify(L)); }
    { const t=F.ekiNoTameguchi('今は準備の時期に入っているよ。大事なんだよね。一緒に進んでいこうね。'); if(/いるよ。|だよね|いこうね/.test(t)) bad.push('ため口：'+t); }
    { const TM=/(?:19|20)\d\d年|再来年|来年|今年|年内|来月|(?<![\d日])\d{1,2}月(?!\d)|か月|ヶ月|年後|以降が目安|が目安/;   /* 易は時期を出さない（鑑定者本人の決定 2026-11-15） */
      for(const [nm,ko] of [['乾為天',2],['水天需',4],['坤為地',6],['火地晋',3]]) for(const q of ['いつ転職すればいいですか','今年と来年どちらがいいですか','彼とはいつ結婚できますか']){ const [u,l]=key(nm); const o=F.buildOfflineReading(F.buildResult(u,l,ko,[ko]),q); const t=[o.hantei,o.tsutae,o.leadTodo].join('\n'); if(TM.test(t)) bad.push('通信なしの時期：'+nm+' '+q+' → '+t.split('\n').find(x=>TM.test(x)).slice(0,60)); }
      P=run('乾為天',2,'▼判定：◎ 来年の春に動くのがおすすめです\n▼伝え方：来年の春ごろに動くと流れに乗れます。準備が整ったら動き出しましょう。\n▼助言：・情報を集める','いつ転職すればいいですか');
      if(TM.test(P.hantei)||!P.hantei.trim()||TM.test(P.tsutae)) bad.push('オンラインの時期：'+P.hantei+' / '+P.tsutae.slice(0,60));
      const ts=F.ekiTimeStrip('来月の試験に向けて準備しましょう。春が来て氷が解けるように楽になります。3か月後には結果が出ます。','来月の試験は受かりますか');
      if(!/来月の試験/.test(ts)||!/氷が解ける/.test(ts)||/3か月後/.test(ts)) bad.push('時期の外し方：'+ts); }
    { /* ③は卦のテーマ名の中の「整った」で選ばない・④のかぎかっこを重ねない・この先の流れ（2026-11-15） */
      const [u,l]=key('水火既済'); const rr=F.buildResult(u,l,3,[3]); window.__ekiQ='A社とB社どちらに転職すべきですか';
      const h=F.ekiTalkHTML({hantei:'〇 卦から見ると、自分の力を出して伸びていけるほうを選ぶのが合います',tsutae:'卦から見ると合います。今は「整った状態を守る時」に入っています。'},rr,['卦から見ると合います。今は「整った状態を守る時」に入っています。'],['「A社」「B社」の条件を書き出してくらべましょう。']);
      const d=document.createElement('div'); d.innerHTML=h; const tx=d.innerText;
      if(/今は「整った状態を守る時」に入っています/.test((tx.split('動き出す合図を伝える')[1]||'').split('どうすればよいか')[0])) bad.push('③がテーマ名を拾った');
      if(!/合図を伝える/.test(tx)) bad.push('③がない');
      if(/「「/.test(tx)) bad.push('かぎかっこの重なり：'+(tx.match(/「「[^\n]{0,30}/)||[''])[0]);
      for(const nm of ['坎為水','沢天夬','天山遯']){ const k2=Object.keys(HEXDB).find(k=>HEXDB[k].nm===nm); for(const rk of ['C','D','E']){ const w=F.ekiFlowWord(HEXDB[k2],rk); if(/大きな波はなく|時期/.test(w)) bad.push('この先の流れ：'+nm+rk+' '+w); } } }
    { /* 2026-11-16：③は相談の種類で変わる・「できますか」は可能性・「いつ」の1行目は2文まで・台本の空 */
      const [u,l]=key('水天需'); const rr=F.buildResult(u,l,4,[4]); const th={};
      for(const q of ['来月の資格試験は受かりますか','元彼と復縁できますか','A社とB社どちらに転職すべきですか','職場の人間関係がつらいです']){ window.__ekiQ=q; const d=document.createElement('div'); document.body.appendChild(d); d.innerHTML=F.ekiTalkHTML({hantei:'△ 今は慎重に',tsutae:'今は焦らず待つ時です。力を蓄えましょう。'},rr,['今は焦らず待つ時です。力を蓄えましょう。'],['準備をしましょう。']); const m=d.innerText.match(/③\s*\n?([^\n]*)\n([^\n]*)/); th[q]=m?(m[1]+'|'+m[2]):''; d.remove(); }
      const vals=Object.values(th); if(vals.some(x=>!x)||new Set(vals).size!==vals.length) bad.push('③が相談で変わらない：'+JSON.stringify(th).slice(0,200));
      if(!/気持ちが軽くなる/.test(th['職場の人間関係がつらいです'])) bad.push('つらさの相談の③の見出し：'+th['職場の人間関係がつらいです']);
      if(/選/.test(th['来月の資格試験は受かりますか'])) bad.push('試験の③に「選ぶ」：'+th['来月の資格試験は受かりますか']);
      for(const [nm,ko] of [['乾為天',2],['坤為地',6],['水天需',4]]){ const [u2,l2]=key(nm); const r2=F.buildResult(u2,l2,ko,[ko]);
        const o=F.buildOfflineReading(r2,'元彼と復縁できますか'); if(!/可能性/.test(o.hantei)) bad.push('通信なしの「できますか」：'+o.hantei);
        for(const q of ['いつ転職すればいいですか','今年と来年どちらがいいですか']){ const o2=F.buildOfflineReading(r2,q); const n=String(o2.hantei).replace(/\s*[◎〇△✖]\s*$/,'').split(/(?<=[。！？])/).filter(x=>x.trim()).length; if(n>2) bad.push('「いつ」の1行目が'+n+'文：'+o2.hantei); }
        if(!String(o.script||'').trim()) bad.push('台本が空'); }
      P=run('水天需',4,'▼判定：〇 焦らず進めましょう\n▼伝え方：今は焦らず待つ時です。\n▼助言：・連絡を控える','元彼と復縁できますか');
      if(!/可能性/.test(P.hantei)||!/。\s*[◎〇△✖]$/.test(P.hantei)) bad.push('オンラインの「できますか」：'+P.hantei);
      if(/台本が取得できませんでした|要点を取得できませんでした/.test(document.documentElement.innerHTML)) bad.push('「取得できませんでした」が残っている'); }
    return {bad}; });
  ok('実地の点検の直し（注記・続けるべきか・A社B社・易の時期を出さない・近い日の試験・今は今は・要点メモ・ため口・③の合図・かぎかっこ・この先の流れ・③が相談で変わる・できますか・いつは2文まで・台本）', r.bad.length===0, r.bad.join(' | ')); }
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
{ const sy=await p.evaluate(()=>({tool:window.__ekiToolSym||'',shown:((document.getElementById('verdictCard')||{}).innerText||'').trim().charAt(0)})); ok('答えの記号がツールの決めた記号と同じ（文章作成が別の記号を書いても）', !!sy.tool&&sy.tool===sy.shown, JSON.stringify(sy)); }
ok('相談1：答えが出る'+(MODE!=='online'?'（端末の中の答え・40秒以内）':''), A.ms>=0&&A.res.length>200&&(MODE==='online'||A.ms<40000), `${A.secs}秒・卦=${A.hex}`);
if(MODE==='online') ok('相談1：三度押しでも呼び出しは1件分（2回以下）', A.calls<=2, 'calls='+A.calls);
const first=(A.v.split('\n').map(s=>s.trim()).filter(s=>s.length>6&&!/^(この相談への答え|[◎〇○△✖×])$/.test(s))[0]||'');
ok('相談1：答えの欄に結論がある', first.length>=8, first.slice(0,80));
ok('相談1：画面に＊が出ない', star(A.res)===0, star(A.res));
if(MODE==='online'){ await p.waitForTimeout(1500); const ev=await p.evaluate(()=>{ const d=document.querySelector('#ekiEv .ev-box'); if(!d) return null; d.open=true; const t=d.innerText; d.open=false; return {t,np:d.classList.contains('no-print')}; });   /* ③ 根拠のチェック表（先生の画面だけ） */
  if(process.env.GATE_DUMP&&ev) fs.writeFileSync(process.env.GATE_DUMP+'.ev',ev.t);
  ok('相談1：根拠のチェック表が出る（先生の画面・印刷しない）', !!ev&&ev.np&&/根拠チェック/.test(ev.t), ev?ev.t.slice(0,80):'表がない'); }
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
if(MODE!=='online'){ /* 生年月日を入れた鑑定書にも「時期の目安」・追い風の年を出さない（鑑定者本人 2026-11-15） */
  await p.evaluate(()=>{ const e=document.getElementById('fuBd'); e.value='1981-06-10'; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); document.getElementById('shoContent').innerHTML=''; document.getElementById('makeSho').click(); });
  const sm2=await waitFor(()=>{const t=document.getElementById('shoContent').innerText; return t.length>300&&/結びのことば|ご相談について/.test(t)&&!/作成しています/.test(t);},70000);
  await p.waitForTimeout(800); const S2=await p.evaluate(()=>document.getElementById('shoContent').innerText+'\n'+((document.getElementById('fuBdSum')||{}).innerText||'')+'\n'+((document.getElementById('fuBdInfo')||{}).innerHTML||''));
  ok('鑑定書（生年月日あり）：生まれ持った性質は入り、時期の目安・追い風の年は出ない', sm2>=0&&/生まれ持った性質/.test(S2)&&!/時期の目安|追い風の年|これから3年の流れ|20\d\d年がとくに|mh-y|年運（ねんうん）/.test(S2), (S2.match(/時期の目安|追い風の年|これから3年の流れ|20\d\d年がとくに|mh-y|年運（ねんうん）/)||['ok'])[0]);
  await p.evaluate(()=>{ const e=document.getElementById('fuBd'); e.value=''; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); }); }
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
