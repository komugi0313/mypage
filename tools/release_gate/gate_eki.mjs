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
{ /* 64卦・384爻の点検（2026-11-17）：天水訟の五爻の訳・田（かり）の読み・互卦／綜卦／錯卦／之卦の計算（文王の順と陰陽の線から照らし合わせ） */
  const s=fs.readFileSync(path.join(ROOT,'eki-pro','app','index.html'),'utf8');
  const grab=st=>{const i=s.indexOf(st);let d=0,j=s.indexOf('{',i);for(;j<s.length;j++){if(s[j]=='{')d++;else if(s[j]=='}'){d--;if(!d)break;}}return s.slice(i,j+1);};
  const line=st=>{const i=s.indexOf(st);return s.slice(i,s.indexOf('\n',i));};
  const tg=(()=>{const i=s.indexOf('const TG=[');return s.slice(i,s.indexOf('];',i)+2);})();
  const code=[tg,line('const HEXKK='),line('const HEXDB='),grab('const TAI_FIX=')+';',grab('function mTai('),grab('function calcGoka('),grab('function calcSoka('),grab('function calcSakka('),grab('function calcShika('),grab('function ekiShikaMulti(')].join('\n');
  const bad=new Function(code+`;const bad=[];
    const KW=[[1,10,13,25,44,6,33,12],[43,58,49,17,28,47,31,45],[14,38,30,21,50,64,56,35],[34,54,55,51,32,40,62,16],[9,61,37,42,57,59,53,20],[5,60,63,3,48,29,39,8],[26,41,22,27,18,4,52,23],[11,19,36,24,46,7,15,2]];
    const tri=n=>{const l=TG[n-1].l;return [l[2],l[1],l[0]];};
    const key=b=>{const f=t=>TG.find(g=>g.l[0]===t[2]&&g.l[1]===t[1]&&g.l[2]===t[0]).n;return f(b.slice(3,6))+'-'+f(b.slice(0,3));};
    for(let u=1;u<=8;u++)for(let l=1;l<=8;l++){ const k=u+'-'+l, h=HEXDB[k], b=tri(l).concat(tri(u));
      if(!h||h.no!==KW[u-1][l-1]){bad.push('卦の番号 '+k);continue;}
      if(calcGoka(u,l).key!==key([b[1],b[2],b[3],b[2],b[3],b[4]])) bad.push('互卦 '+h.nm);
      if(calcSoka(u,l).key!==key(b.slice().reverse())) bad.push('綜卦 '+h.nm);
      if(calcSakka(u,l).key!==key(b.map(x=>1-x))) bad.push('錯卦 '+h.nm);
      for(let m=1;m<64;m++){ const mv=[],bb=b.slice(); for(let i=0;i<6;i++) if(m>>i&1){mv.push(i+1);bb[i]=1-bb[i];}
        if(ekiShikaMulti(u,l,mv).key!==key(bb)) bad.push('之卦 '+h.nm+mv.join(''));
        if(mv.length===1&&calcShika(u,l,mv[0]).key!==key(bb)) bad.push('之卦1本 '+h.nm+mv[0]); } }
    const sho=Object.values(HEXDB).find(h=>h.nm==='天水訟'), t5=mTai(sho,5);
    if(/戦って|勝利/.test(t5)||!/公正/.test(t5)) bad.push('天水訟の五爻の訳：'+t5);
    const kou=Object.values(HEXDB).find(h=>h.nm==='雷風恒'), kai=Object.values(HEXDB).find(h=>h.nm==='雷水解'), ket=Object.values(HEXDB).find(h=>h.nm==='沢天夬');
    if(!/^田（かり）して/.test(kou.ko[4].kd)||!/^田（かり）して/.test(kai.ko[2].kd)) bad.push('田（かり）の読み');
    if(/あって/.test(ket.kd)) bad.push('沢天夬の卦辞の読み下し：'+ket.kd);
    { const mi=Object.values(HEXDB).find(h=>h.nm==='地火明夷'), ri=Object.values(HEXDB).find(h=>h.nm==='地沢臨'); if(/うまい話/.test(mTai(mi,4))||!/本心/.test(mTai(mi,4))) bad.push('地火明夷の四爻の訳：'+mTai(mi,4)); if(/口は上手/.test(mTai(ri,3))||!/改めれば/.test(mTai(ri,3))) bad.push('地沢臨の三爻の訳：'+mTai(ri,3)); }
    { const J=JSON.stringify(HEXDB); if(/冽|[己巳]日乃/.test(J)) bad.push('水風井の「洌」・沢火革の「已日」の字がそろっていない（通行本の字にそろえる。2026-11-17）'); }
    if(JSON.stringify(HEXDB).includes('祇')) bad.push('祇と祗の字がそろっていない（祗にそろえる。2026-11-17）');
    return bad;`)();
  ok('64卦の番号・互卦・綜卦・錯卦・之卦の計算と、天水訟の五爻の訳・読み下しの直し（2026-11-17）', bad.length===0, bad.slice(0,6).join(' / ')); }
{ const s=fs.readFileSync(path.join(ROOT,'eki-pro','app','index.html'),'utf8'), g=fs.readFileSync(path.join(ROOT,'tools','contrast_guard.js'),'utf8');   // UX点検②（2026-11-18）
  ok('UX②：易の「① まずこれを読む」は、すぐ上の答えと同じ1段落目をくり返さない', /talkV=talkP\.filter/.test(s)&&/\$\{talkV\.map/.test(s));
  ok('UX②：易の続けて質問の例は相談の種類に合わせる（転職に「相手の気持ちは？」を出さない）', /work:'決め手になることは？'/.test(s));
  ok('UX②：易の「新しい鑑定」は「同じお客様のまま、別の相談を占う」（次のお客様へとの違いが分かる名前）', /btn_newReading:'同じお客様のまま、別の相談を占う'/.test(s)&&!/>新しい鑑定をする</.test(s));
  ok('UX②：易のスマホの結果は屋号とタブを貼りつけない', /html\.eki-resv \.topbar,html\.eki-resv \.tabs\{position:static!important\}/.test(s));
  ok('UX②：見えやすさの安全装置は、押せないときの色で直した字を、押せるようになったら戻す', /attributeName==='disabled'\) reset\(/.test(g)&&/'disabled','data-theme'/.test(g)); }
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
{ /* 2026-11-17 テスト用サイト v268 の実地の点検で直したもの */
  const r=await p.evaluate(()=>{ const F=window.__ekiFix; const bad=[]; if(!F||!F.ekiHarshKo) return {bad:['点検用の関数がない']};
    const key=nm=>Object.keys(HEXDB).find(k=>HEXDB[k].nm===nm).split('-').map(Number);
    const run=(nm,ko,txt,q)=>{ const [u,l]=key(nm); const rr=F.buildResult(u,l,ko,[ko]); window.__ekiQ=q; return F.ekiFixSym(F.ekiCleanReading(F.parseReading(txt),q),rr,q); };
    const off=(nm,ko,q)=>{ const [u,l]=key(nm); const rr=F.buildResult(u,l,ko,[ko]); window.__ekiQ=q; return {o:F.buildOfflineReading(rr,q),rr}; };
    const third=(o,rr,talk)=>{ const d=document.createElement('div'); document.body.appendChild(d); d.innerHTML=F.ekiTalkHTML(o,rr,talk||[o.tsutae],['準備をしましょう。']); const tx=d.innerText; d.remove(); const m=tx.match(/③\s*\n?[^\n]*\n([^\n]*)/); return m?m[1]:''; };
    const nS=x=>String(x).replace(/\s*[◎〇△✖]\s*$/,'').split(/(?<=[。！？])/).filter(z=>z.trim()).length;
    // ① 「できますか」：記号と合わない可能性の言葉（△なのに「低い」）は置きかえる
    { let P=run('山地剥',3,'▼判定：△ 復縁の可能性は低い時期です。\n▼伝え方：今は無理に進めようとせず、様子を見ていく時期です。','彼と復縁できますか'); const sym=(P.hantei.match(/[◎〇△✖]\s*$/)||[''])[0].trim();
      if(/低い時期/.test(P.hantei)||(sym==='△'&&!/可能性はあります（条件しだいです）/.test(P.hantei))) bad.push('可能性の言葉と記号：'+P.hantei); }
    // ② お相手の出てこない恋愛・「来年〜できますか」
    for(const [nm,ko] of [['山風蠱',4],['乾為天',2],['坤為地',6]]){ const {o}=off(nm,ko,'来年結婚できますか'); if(/相手の気持ち/.test(o.hantei)||!/言い当て/.test(o.hantei)||!/可能性/.test(o.hantei)||nS(o.hantei)>2) bad.push('通信なしの来年結婚：'+o.hantei); }
    { const P=run('山風蠱',4,'▼判定：△ 可能性はあります（条件しだいです）。相手の気持ちが落ち着くのを待ち、追いかけすぎないことが条件です。\n▼伝え方：来年結婚できるかというご心配ですね。\n\n表面はよさそうに見えても、内側に問題がたまっている時期です。このまま進めば恥の上塗りになるという意味も出ています。','来年結婚できますか');
      if(/相手の気持ち/.test(P.hantei)||!/言い当て/.test(P.hantei)||nS(P.hantei)>2) bad.push('オンラインの来年結婚：'+P.hantei);
      if(/^\s*来年結婚できるかというご心配ですね/.test(P.tsutae)) bad.push('本文の書き出しのあいづち：'+P.tsutae.slice(0,40));
      if(/恥の上塗り/.test(P.tsutae)) bad.push('恥の上塗り：'+P.tsutae.slice(0,80)); }
    // ③ 助言の文（〜たときは…します）を合図にしない・「続けるべきか」は続ける相談の合図（通信なし・オンライン同じ）
    { const q='仕事を続けるべきか迷っています'; const {o,rr}=off('風地観',4,q); if(F.ekiSignKey(q)!=='stay') bad.push('続けるべきかの合図の種類：'+F.ekiSignKey(q));
      const t1=third(o,rr); if(/条件（仕事の中身|転職|次に求める条件/.test(t1)||!/続け/.test(t1)) bad.push('通信なしの続けるべきかの③：'+t1);
      const t2=third({hantei:'〇 仕事を続けることは進めて大丈夫です。',tsutae:'今の場所で力を出せる流れです。心が疲れたときは一人で抱え込まず、リフレッシュできる時間を意識して作るようにします。転職先の情報を集めるときは、条件だけに流されず慎重に確かめます。'},rr,['今の場所で力を出せる流れです。心が疲れたときは一人で抱え込まず、リフレッシュできる時間を意識して作るようにします。転職先の情報を集めるときは、条件だけに流されず慎重に確かめます。']);
      if(/疲れたときは|集めるときは/.test(t2)||!t2) bad.push('③が助言の文を拾った：'+t2); }
    // ④ つらさ（「つらくて」「しんどくて」「やる気が出ない」）・飲み物食べ物の助言・季節のたとえは1回
    for(const q of ['つらくて何もしたくない','しんどくて何も手につかない','やる気が出ない毎日です','辛くて泣いてしまう']) if(F.ekiSignTopic(q)!=='feel'||F.ekiNoJudgeQ(q)) bad.push('つらさの相談として見分けない：'+q);
    { const {o,rr}=off('雷水解',3,'つらくて何もしたくない'); const d=document.createElement('div'); document.body.appendChild(d); d.innerHTML=F.ekiTalkHTML(o,rr,[o.tsutae],['休みましょう。']); const tx=d.innerText; d.remove();
      if(!/気持ちが軽くなる合図/.test(tx)||/距離のとり方|関係を変え/.test(tx)) bad.push('つらさの③：'+(tx.match(/③[^\n]*\n[^\n]*\n[^\n]*/)||[''])[0]); if(/チャンスを逃さ|ぐずぐず/.test(o.ketsuron+o.tsutae)) bad.push('つらさの相談に後押し：'+o.ketsuron.slice(0,80)); }
    { const t=F.ekiFeelSoft('今は無理に動こうとせず、温かい飲み物を飲んだり、静かな部屋で横になったりしてください。ゆっくり休みましょう。','つらくて何もしたくない'); if(/飲み物/.test(t)||!/ゆっくり休み/.test(t)) bad.push('つらさの相談の飲み物：'+t); }
    { const P=run('雷水解',3,'▼判定：△ 今は休む時期です。\n▼伝え方：春が来て氷が解けるように、少しずつ心が軽くなります。ゆっくり休みましょう。\n▼台本：いまの時は、春が来て氷が解けるように、困っていたことから解放される時期です。現代の言葉にすると、冬の寒さで固まっていた氷が春の陽気で自然にとけるように、つらい状況から解放されていきます。穏やかな春を待つようにゆっくり蓄えましょう。','つらくて何もしたくない');
      const n=(String(P.tsutae+P.script).match(/氷が|春を待つ/g)||[]).length; if(n!==1) bad.push('季節のたとえ '+n+'回：'+P.script.slice(0,80)); }
    // ⑤ #7119 の「#」・落ち針く
    { const t=F.pkTypoFix('救急車を呼ぶか迷うときは、救急安心センター 7119 に相談してください。心が落ち針くまで。＃8000'); if(!/センター #7119/.test(t)||/落ち針/.test(t)||!/#8000/.test(t)) bad.push('電話番号の#・誤字：'+t); }
    // ⑦ 体のご相談：きつい爻の原文（死如）を読み上げない・「チャンス」を書かない
    { const q='最近ずっと体調が悪い日が続きます'; const P=run('離為火',4,'▼判定：ご心配ですね。\n▼伝え方：温かいハーブティーを飲んでほっとしましょう。才能を発揮するチャンスの時期です。お体のことはお医者さまに相談してくださいね。\n▼台本：今回動いた四爻の爻辞は「突如其来如。焚如。死如。棄如。」であり、読み下しは「突如（とつじょ）として其（そ）れ来如（らいじょ）たり。焚如（ふんじょ）たり。死如（しじょ）たり。棄如（きじょ）たり。」です。現代の言葉にすると「守りに徹した上で細心の注意が必要な状態」となります。',q);
      if(/死如/.test(P.script)||!/細心の注意/.test(P.script)) bad.push('体の相談の台本：'+P.script.slice(0,80)); if(/ハーブティー|チャンス/.test(P.tsutae)) bad.push('体の相談の本文：'+P.tsutae.slice(0,80));
      const {o}=off('離為火',4,q); if(/死如|チャンス/.test(o.script+o.tsutae)) bad.push('通信なしの体の相談：'+(o.script.match(/[^。]*(?:死如|チャンス)[^。]*/)||[''])[0]); }
    // ⑧ 「時期は、易では言い当てません」・恥の上塗り（通信なし）
    { const {o}=off('雷沢帰妹',3,'転職はいつがいいですか'); if(/いつかは/.test(o.hantei)||!/時期は、易では言い当てません/.test(o.hantei)) bad.push('いつの1行目：'+o.hantei); }
    { const {o}=off('山風蠱',4,'仕事はうまくいきますか'); if(/恥の上塗り/.test(o.tsutae+o.script+o.ketsuron)) bad.push('通信なしの恥の上塗り'); }
    return {bad}; });
  ok('実地の点検の直し 2026-11-17（できますかの可能性と記号・お相手なし・来年〜できますか・③は合図の文だけ・続けるべきかの合図・つらくて・飲み物・季節のたとえ1回・#7119・きつい爻の原文・時期は言い当てない・恥の上塗り・あいづち）', r.bad.length===0, r.bad.join(' | ')); }
{ /* 2026-11-17：#7119 の「#」・「落ち針く」は PRO・ビギナー・鑑定書でも同じに直す（3つのツールを一緒に直す） */
  const bad=[]; const T='救急車を呼ぶか迷うときは、救急安心センター 7119 に相談してください。心が落ち針くまで。';
  for(const [f,nm] of [['pro/app-pro.html','const PK_TYPO='],['beginner/app-beginner.html','const PK_TYPO='],['pro/meishi-sheet.html','var SHEET_TYPO='],['beginner/meishi-sheet.html','var SHEET_TYPO='],['meishiki-original/meishi-sheet.html','var SHEET_TYPO=']]){
    const src=fs.readFileSync(path.join(ROOT,f),'utf8'); const i=src.indexOf(nm); if(i<0){ bad.push(f+'：表がない'); continue; } const ln=src.slice(i,src.indexOf('\n',i)).replace(/^(?:const|var)\s+\w+=/,'return ').replace(/;\s*(?:\/\/.*)?$/,'').replace(/\]\];.*$/,']]');
    let L; try{ L=new Function(ln)(); }catch(e){ bad.push(f+'：読めない '+e.message); continue; } let t=T; L.forEach(x=>{ t=t.replace(x[0],x[1]); }); if(!/センター #7119/.test(t)||/落ち針/.test(t)) bad.push(f+'：'+t); }
  for(const f of ['pro/app-pro.html','beginner/app-beginner.html']){ const src=fs.readFileSync(path.join(ROOT,f),'utf8'); if(/\^#\{1,6\}\[ 　\]/.test(src)) bad.push(f+'：行頭の「#7119」の#を見出しとして外す'); }
  ok('#7119 の「#」・誤字「落ち針く」を PRO・ビギナー・鑑定書でも直す（2026-11-17）', bad.length===0, bad.join(' | ')); }
{ /* 2026-11-17「A」：つらさの相談は軽いものでも◎〇△✖を付けない（答えの欄・答え・話す順番・鑑定書・続けての質問）。1行目・③の合図はそのまま。「続けるべきか」の通信なしの助言に思い切っての後押しを入れない */
  const r=await p.evaluate(()=>{ const F=window.__ekiFix; const bad=[]; if(!F||!F.ekiFeelNoSym||!F.renderVerdict||!F.shoOffline) return {bad:['点検用の関数がない']};
    const key=nm=>Object.keys(HEXDB).find(k=>HEXDB[k].nm===nm).split('-').map(Number);
    const mk=(nm,ko,q)=>{ const [u,l]=key(nm); const rr=F.buildResult(u,l,ko,[ko]); window.__ekiQ=q; return rr; };
    const SYM=/[◎〇○◯△▲✖✕×]/, SW=/とても良い流れ|前向きに進めてよい流れ|慎重に進めたい流れ|今は控えたほうがよい流れ/;
    const box=(p0,rr)=>{ let el=document.getElementById('verdictCard'), tmp=null; if(!el){ tmp=document.createElement('div'); tmp.id='verdictCard'; document.body.appendChild(tmp); el=tmp; } const keep=el.innerHTML; F.renderVerdict(p0,rr); const tx=el.innerText, mk2=!!el.querySelector('.v-mark'); el.innerHTML=keep; if(tmp) tmp.remove(); return {tx,mk:mk2}; };
    const talk=(p0,rr)=>{ const d=document.createElement('div'); document.body.appendChild(d); d.innerHTML=F.ekiTalkHTML(p0,rr,[p0.tsutae],['休みましょう。']); const tx=d.innerText; d.remove(); return tx; };
    { const q='不安で眠れない', rr=mk('乾為天',2,q); const o=F.buildOfflineReading(rr,q), b=box(o,rr); if(b.mk||SYM.test(b.tx)) bad.push('不安で眠れない（体のご相談として答えの欄は記号なし）：'+b.tx.slice(0,60)); }   // 「眠れない」は体のご相談（占いで決めないご相談）として、もともと答えの欄に記号を出さない
    for(const q of ['つらくて何もしたくない','職場の人間関係がつらい','将来が不安でたまらない']){ if(!F.ekiFeelNoSym(q)) { bad.push('つらさの相談として記号なしにしない：'+q); continue; }
      for(const [nm,ko] of [['乾為天',2],['雷水解',3],['山地剥',3],['坤為地',6]]){ const rr=mk(nm,ko,q);
        const o=F.buildOfflineReading(rr,q); if(SYM.test(o.hantei)||SW.test(o.hantei+o.tsutae+o.ketsuron)) bad.push('通信なしの答えに記号：'+q+' '+nm+' '+o.hantei);
        if(!/流れ|守る|気持ち|自分/.test(o.hantei)) bad.push('つらさの1行目：'+o.hantei);
        const b1=box(o,rr); if(b1.mk||SYM.test(b1.tx)) bad.push('答えの欄に記号：'+q+' '+nm+' '+b1.tx);
        const t1=talk(o,rr); if(!/気持ちが軽くなる合図/.test(t1)) bad.push('つらさの③の見出し：'+q); if(SYM.test(t1.replace(/[①-⑥]/g,''))||SW.test(t1)) bad.push('話す順番に記号：'+q+' '+nm);
        const P=F.ekiFixSym(F.ekiCleanReading(F.parseReading('▼判定：〇 今は前向きに進んで大丈夫です。\n▼伝え方：答えは「〇」、とても良い流れです。少しずつ気持ちを休めていきましょう。'),q),rr,q);
        if(SYM.test(P.hantei)||/進んで大丈夫/.test(P.hantei)||SW.test(P.tsutae)||SYM.test(P.tsutae)) bad.push('オンラインの答えに記号：'+q+' '+P.hantei+' / '+P.tsutae);
        const b2=box(P,rr); if(b2.mk||SYM.test(b2.tx)) bad.push('オンラインの答えの欄に記号：'+b2.tx);
        const S=F.ekiShoClean(F.shoOffline(rr,q,o,null),rr,q,o), st=S.map(x=>x.t).join('\n'); if(SYM.test(st)||SW.test(st)||/答えは「/.test(st)) bad.push('鑑定書に記号・答えの言葉：'+q+' '+nm+' '+(st.match(/[^\n]*(?:答えは「|とても良い流れ|前向きに進めてよい流れ|慎重に進めたい流れ|今は控えたほうがよい流れ|[◎〇△✖])[^\n]*/)||[''])[0]); }
      if(!/◎〇△✖を付けず/.test(F.ekiSafetyPrompt(q))) bad.push('頼み方に記号なしの決まりがない：'+q); }
    // つらさでない相談は記号のまま
    for(const q of ['彼と復縁できますか','転職がつらいけど転職すべきですか']){ if(F.ekiFeelNoSym(q)) bad.push('記号ありの相談を記号なしにした：'+q); const rr=mk('乾為天',2,q); const o=F.buildOfflineReading(rr,q); if(!SYM.test(o.hantei)) bad.push('記号が消えた：'+q+' '+o.hantei); const b=box(o,rr); if(!b.mk) bad.push('答えの欄の記号が消えた：'+q); }
    // 「続けるべきか」の通信なしの助言
    { const q='仕事を続けるべきか迷っています'; const A=F.ekiAdvSet(q); for(const g of ['g','m','b']) for(const x of (A[g]||[])) if(/思い切|転職|退職|動かすのに|時期/.test(x)) bad.push('続けるべきかの助言：'+x);
      for(const [nm,ko] of [['乾為天',2],['風地観',4],['山地剥',3]]){ const rr=mk(nm,ko,q); const o=F.buildOfflineReading(rr,q); const S=F.shoOffline(rr,q,o,null); const adv=(S.find(x=>/アドバイス/.test(x.h))||{t:''}).t; if(/思い切|転職/.test(adv)) bad.push('続けるべきかの鑑定書の助言：'+adv); } }
    return {bad}; });
  ok('つらさの相談は記号なし・続けるべきかの助言（2026-11-17「A」）', r.bad.length===0, r.bad.join(' | ')); }
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
