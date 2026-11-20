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
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
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
const A=await p.evaluate(()=>{const it=document.querySelector('#reading .rd-item:last-child');if(!it) return ''; const op=[...it.querySelectorAll('details.r-fold:not([open])')]; op.forEach(d=>d.open=true); const t=it.querySelector('.rd-body').innerText; op.forEach(d=>d.open=false); return t;});   /* たたんだ「くわしい読み解き」の中も読む（タップで開く欄）*/
{ const need=await p.evaluate(()=>{ try{ const g=kakukyoku(chart); const plain=document.documentElement.classList.contains('bg-on'); if(plain&&typeof window.pkBTypeOf==='function'){ const t=window.pkBTypeOf(g,chart); return t?[t[0].replace(/\s/g,'')]:[]; } const m=String(g.name).match(/（([^）]+)）/); return [g.name].concat(m?[m[1]]:[]).map(x=>x.replace(/（.*$/,'')); }catch(e){ return ['(計算エラー)']; } });
  ok('相談1：鑑定文に格局（ビギナーは生まれ持った型）が入っている（安全装置）', need.length>0&&need.some(n=>A.replace(/\s/g,'').includes(n)), need.join('/')); }
ok('相談1：答えが出る（60秒以内）'+(MODE!=='online'?'（端末の中の答え・30秒以内）':''), ms>=0&&(MODE==='online'||ms<30000) && A.length>200, `${(Date.now()-t1)/1000}秒・${A.length}字`);
ok('相談1：三度押しでも答えは1つ', items===1, 'items='+items);
const cQ1=calls-c0; ok('相談1：文章作成の呼び出し回数'+(site==='beginner'?'（ビギナーは専門用語の書き直しで最大4回）':''), MODE!=='online'? true : (site==='beginner'?(cQ1>=2&&cQ1<=4):cQ1===2), 'calls='+cQ1);
const first=(A.split('\n').map(s=>s.trim()).filter(s=>s.length>8&&!/^(コピー|言葉の意味)/.test(s))[0]||'');
ok('相談1：答えの最初に結論がある', first.length>=10, first.slice(0,80));
if(MODE==='online'){ ok('相談1：年を比べる質問に、年で答えている', /今年|来年|2026|2027|年内/.test(first), first.slice(0,80));
  ok('相談1：くわしい読み解きの見出しだけが残っていない', !/くわしい読み解き\s*$/.test(A.trim()), ''); }
// 今年＝年運の年（立春で切りかわる。1/1〜立春は前の年。先生の決定 2026-11-03）。ツールの計算（chart.now.year＝日本時間のいまの年柱）から取り、暦の1/1では数えない
const NYR=await p.evaluate(()=>{ try{ return chart.now.year; }catch(e){ return null; } }), PRE=await p.evaluate(()=>{ try{ return pkNenInfo().pre; }catch(e){ return false; } });
const calCheck=(t,by)=>{ const G='甲乙丙丁戊己庚辛壬癸', Z='子丑寅卯辰巳午未申酉戌亥', gz=y=>{const i=((y-4)%60+60)%60; return G[i%10]+Z[i%12];}, NY=NYR||new Date().getFullYear(), bad=[];
  for(const m of t.matchAll(/((?:19|20)\d\d)年[（(]?(?:[^）)\n]{0,8}[・：:、])?(\d{1,3})歳/g)){ const e=+m[1]-by; if(+m[2]!==e) bad.push(m[0]+'（正しくは'+e+'歳）'); }
  for(const m of t.matchAll(/((?:19|20)\d\d)年[（(のは：:]([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])(?![^\n]{0,3}(?:大運|月|日|時))/g)){ if(m[2]!==gz(+m[1])) bad.push(m[0]+'（正しくは'+gz(+m[1])+'）'); }
  const REL={今年:0,来年:1,再来年:2,昨年:-1,去年:-1}; for(const m of t.matchAll(/(再来年|今年|来年|昨年|去年)[（(の]((?:19|20)\d\d)/g)){ if(+m[2]!==NY+REL[m[1]]) bad.push(m[0]); }
  for(const m of t.matchAll(/(^|[^0-9])([0-9]{2})年[（(]\d{1,3}歳/g)) bad.push(m[0].trim()+'（西暦が2けた）');
  return bad; };
const unStamped=t=>{ const ys={}, ok2={}; for(const m of t.matchAll(/((?:19|20)\d\d)年(?!\d{1,2}月|[0-9]|生|度|代)/g)){ const y=m[1], a=t.slice(m.index+m[0].length,m.index+m[0].length+6), b=t.slice(Math.max(0,m.index-6),m.index); if(/[0-9]$/.test(b)) continue; /* 「〜2027年（丁未・42歳）」の〜のあとの年も数える */ ys[y]=1; if(/^[（(〔]|^の?[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]|^(?:に|には|で|、)?\d{1,3}歳/.test(a)||/\d{1,3}歳(?:になる|を迎える)?[（(]?$/.test(b)||/[（(「『]$/.test(b)) ok2[y]=1; } return Object.keys(ys).filter(y=>!ok2[y]); };
{ const cb=calCheck(A,1985); ok('暦：年齢・年の干支・今年/来年が正しい（相談1）', cb.length===0, cb.slice(0,3).join(' / ')); }
if(PRE) ok('暦：立春前は「今年」に期限（○年2月○日の立春まで）がある（相談1）', !/今年/.test(A)||/立春まで/.test(A), '');
if(MODE==='online'){ const u=unStamped(A); ok('相談1：西暦にツールの干支・年齢が付いている', u.length===0, u.map(y=>{const i=A.indexOf(y+'年');return A.slice(Math.max(0,i-15),i+12).replace(/\n/g,'⏎');}).join(' / ')); }
if(MODE==='online'){ const kinds=await p.evaluate(()=>{ try{ return natalBondLines(chart,false).map(x=>x.kind); }catch(e){ return []; } }); const plainMode=await p.evaluate(()=>document.documentElement.classList.contains('bg-on')); const miss=plainMode?(kinds.length&&!/強く結びつ/.test(A)?['結びつき']:[]):kinds.filter(k=>!A.includes(k)); ok('相談1：命式内の天地徳合・干合を必ず伝える（'+(kinds.join('・')||'なし')+'）', miss.length===0, miss.join('・')); }
ok('相談1：見出しが途中で改行していない', !/【[^】\n]{0,40}\n[^】]{0,40}】/.test(A), (A.match(/【[^】\n]{0,40}\n[^】]{0,40}】/)||[''])[0].replace(/\n/g,'⏎'));
ok('相談1：画面に＊が出ない', cleanStar(A)===0, cleanStar(A));
// 画面の使いやすさ（2026-11-17 UX点検）：目次の帯がはみ出さない・鑑定まとめは1回・五行の見本は入力欄の外・PDFの窓に viewport・ぶつかりの特徴は⚠
{ const U=await p.evaluate(()=>{ const jn=document.getElementById('jumpnav'), vis=e=>e&&e.offsetParent!==null&&getComputedStyle(e).display!=='none';
    const bt=[...jn.querySelectorAll('button')].filter(vis), cut=bt.filter(b=>b.getBoundingClientRect().right>innerWidth+1).map(b=>b.textContent.trim());
    const qm=bt.some(b=>b.classList.contains('pk-qm-tg'));
    const dg=[...document.querySelectorAll('#pk-digest,.pk-digest-a')].filter(e=>vis(e)&&e.innerText.trim()).length;
    const lg=document.getElementById('legend5');
    return {sw:jn.scrollWidth,cw:jn.clientWidth,cut,qm,dg,lgIn:!!(lg&&lg.closest('section.card.panel')),pv:/name="viewport"/.test(String(printHTML)),neg:/neg:true/.test(String(compatBigFeatures))&&/x\.neg\?/.test(String(compatSummaryHTML))}; });
  ok('UX：目次の帯が横にはみ出さず、⚡すぐ答えが切れない（390px）', U.sw<=U.cw+1&&!U.cut.length&&U.qm, JSON.stringify(U.cut)+' sw='+U.sw+'/'+U.cw);
  ok('UX：鑑定まとめは画面に1回だけ', U.dg<=1, 'dg='+U.dg);
  ok('UX：五行の色の見本は入力欄の中に出さない', !U.lgIn);
  ok('UX：鑑定文のPDFの窓に viewport がある', U.pv);
  ok('UX：天戦地冲（ぶつかり）の大きな特徴は🌟ではなく⚠', U.neg); }
// UX点検②（2026-11-18）：目次の帯は1段・相性の答えはいちばん上で帯つき・入口は相性診断タブ・職業の一覧は1つ・言葉の意味は答えの下・？は丸いまま・カルテの削除は書き分け・月の区切りは日付
{ const U2=await p.evaluate(()=>{ const jn=document.getElementById('jumpnav'), vis=e=>e&&e.offsetParent!==null&&getComputedStyle(e).display!=='none';
    const bt=[...jn.querySelectorAll('button')].filter(vis), tops=[...new Set(bt.map(b=>Math.round(b.getBoundingClientRect().top)))];
    const cp=document.getElementById('compat'), cv=document.getElementById('compat-verdict'), nav=document.getElementById('cpnav');
    const order=!!(cp&&cv&&nav&&(nav.compareDocumentPosition(cp)&4)&&(cp.compareDocumentPosition(cv)&4));
    const cc=document.getElementById('compat-card'); const ccHidden=!document.body.classList.contains('mode-compat')?!(cc&&cc.offsetParent):true;
    const fb=String(featBookHTML(chart)); const jobs=(fb.match(/向く仕事＝/g)||[]).length;
    const rc=document.querySelector('#cs-ans .reading-card'), lg=rc&&rc.querySelector('details.r-legend'); const lgLast=!lg||rc.lastElementChild===lg;
    const q=[...document.querySelectorAll('.gl-q')].filter(e=>e.offsetParent).filter(e=>Math.abs(e.offsetWidth-e.offsetHeight)>1).length;
    const kl=/お客様を削除/.test(String(renderClients||''))||/お客様を削除/.test(document.documentElement.innerHTML);
    const ml=pkMonDayLab('2026年12月〜翌1月上旬');
    return {rows:tops.length, n:bt.length, order, ccHidden, jobs, lgLast, q, kl, ml}; });
  ok('UX②：スマホの目次の帯は1段（390px）', U2.rows<=1, 'rows='+U2.rows+' n='+U2.n);
  ok('UX②：相性の答えは「まとめ」より上・目次の帯つき', U2.order);
  ok('UX②：個人鑑定ではお相手の入力欄を出さない（入口は相性診断タブ）', U2.ccHidden);
  ok('UX②：特徴の欄に柱ごとの「向く仕事＝」の一覧を出さない', U2.jobs===0, 'n='+U2.jobs);
  ok('UX②：言葉の意味（木火土金水）は答えの下', U2.lgLast);
  ok('UX②：用語の「？」は丸いまま（縦横同じ）', U2.q===0, 'n='+U2.q);
  ok('UX②：カルテの削除は「お客様を削除」と書き分け', U2.kl);
  ok('UX②：相性の月の区切りは節入りの日付で見せる', /^2026年12月\d+日〜2027年1月\d+日$/.test(U2.ml), U2.ml); }
// UX点検②の続き（2026-11-18）：相性のこれからの年は1つの表に早い順（縁が深まる・三合方合・揺れやすい・運気の谷）
{ const Y=await p.evaluate(()=>{ try{ const h=compatTimingHTML(chart,chart,RELTYPES.love), tb=(h.match(/<table class="cty"/g)||[]).length, fold=/cty-fold/.test(h);
    const ys=[...h.matchAll(/<td class="cty-y">(\d{4})/g)].map(m=>+m[1]), sorted=ys.every((y,i)=>!i||ys[i-1]<y);
    const bg=[...document.scripts].some(s=>/pkCpYearRows\(a,b,d\.good,d\.strain,d\.low\)/.test(s.textContent));
    const isB=/app-beginner/.test(location.pathname);
    return {tb,fold,n:ys.length,sorted,bgOK:!isB||bg}; }catch(e){ return {err:String(e)}; } });
  ok('UX②：相性のこれからの年は1つの表（早い順・年は1行ずつ）', Y.tb===1&&!Y.fold&&Y.sorted&&Y.bgOK, JSON.stringify(Y)); }
// UX点検②の続き（2026-11-18）：ビギナーの「整えたい年」はPROの「運気の谷」と同じ年（compatSelfLowYears をそのまま使う）／「AかBか」の見送りの文の直し
{ const Z=await p.evaluate(()=>{ try{ const isB=/app-beginner/.test(location.pathname);
    const src=[...document.scripts].map(s=>s.textContent).join('\n');
    const bgSame=!isB||(/low=safe\(function\(\)\{return compatSelfLowYears\(a\);\},\[\]\)/.test(src)&&!/個人の判定が△の年と、◦\/△で注意の重なる年だけにする/.test(src));
    const B=window.Bazi, P=[[1981,6,10,22,28,'female'],[1979,3,15,8,0,'male'],[1990,1,1,12,0,'female'],[1975,11,20,6,30,'male']];
    let same=true, info=[]; P.forEach(function(x){ const c=B.computeChart({year:x[0],month:x[1],day:x[2],hour:x[3],minute:x[4],sex:x[5],correctionMode:'none'}); const lo=compatSelfLowYears(c).map(o=>o.year), rw=pkCpYearRows(c,c,[],[],compatSelfLowYears(c)).filter(r=>r.low).map(r=>r.year); if(lo.join()!==rw.join()) same=false; info.push(lo.join('/')); });
    const T='A社のほうが合います。\n今は急いで結論を出さずに見送るのが賢明です。\n・どちらも見送るのがよいでしょう。', o=pkChoiceHoldFix(T,'A社とB社、どちらに転職すべきですか');
    const ab=!/見送/.test(o)&&/条件をよく確かめてから決めましょう/.test(o)&&/^A社のほうが合います。/.test(o)&&pkChoiceHoldFix(T,'転職はいつがいいですか')===T;
    return {bgSame,same,ab,info:info.join(' | ')}; }catch(e){ return {err:String(e)}; } });
  ok('UX②：ビギナーの「整えたい年」はPROの「運気の谷」と同じ年', Z.bgSame&&Z.same, JSON.stringify(Z));
  ok('UX②：「AかBか」で本文の「どちらも見送る」は条件の言い方に（1行目は選ぶ答えのまま）', Z.ab, JSON.stringify(Z)); }
// UX点検②の続き（2026-11-19）：ビギナー1人の鑑定の「静かに整えたい年」はPROの年運の判定「静かに整える時期（△）」（pkYearMk）と同じ年
{ const W=await p.evaluate(()=>{ try{ const isB=/app-beginner/.test(location.pathname); if(!isB||typeof window.pkBgPlainOffline!=='function') return {skip:true,ok:true};
    const B=window.Bazi, P=[[1981,6,10,22,28,'female'],[1979,3,15,8,0,'male'],[1990,1,1,12,0,'female'],[1975,11,20,6,30,'male'],[2001,8,3,3,15,'female'],[1968,4,22,17,0,'male']];
    const keep=chart; let ok=true, info=[], n=0;
    P.forEach(function(x){ const c=B.computeChart({year:x[0],month:x[1],day:x[2],hour:x[3],minute:x[4],sex:x[5],correctionMode:'none'}); chart=c;
      const t=window.pkBgPlainOffline('')||'', m=t.match(/静かに整えたい年：([^。\n]*)/), bg=m?(m[1].match(/\d{4}/g)||[]).join('/'):'';
      const pro=(c.annualFortunes||[]).filter(a=>a.year>=c.now.year&&a.year<c.now.year+10&&pkYearMk(c,a)==='△').map(a=>a.year).join('/');
      if(bg!==pro) ok=false; if(pro) n++; info.push(bg+'='+pro); });
    chart=keep; return {ok,n,info:info.join(' | ')}; }catch(e){ return {ok:false,err:String(e)}; } });
  ok('UX②：ビギナー1人の鑑定の「静かに整えたい年」はPROの年運の判定（整える時期）と同じ年', W.ok&&(W.skip||W.n>0), JSON.stringify(W)); }
// UX点検③（2026-11-19）：送る文にお伝え方（最初から✓）・中国語の見出し・恋愛の「いつ」の1行目・生年月日のまちがいは赤・広い画面の目次は折り返す・カルテの開く／LINEの知らせ・ビギナーの鑑定文への近道・相性の入力の順と帯・画像の題とPDF・転職の言葉・もう1回ためす
{ const V=await p.evaluate(async()=>{ try{ const isB=/app-beginner/.test(location.pathname), src=[...document.scripts].map(s=>s.textContent).join('\n'), css=[...document.querySelectorAll('style')].map(s=>s.textContent).join('\n');
    const bars=document.querySelectorAll('.rd-bar .rd-incl'), incl=bars.length>0&&[...bars].every(b=>b.checked);
    const cn=pkFmTidy2('答え。\n\n【どう做什么】\n・a'), cnOK=/\n【どうすればよいか】\n/.test(cn)&&!/做|么/.test(cn), goro=pkFmTidy2('2027年（丁未・46歳）のごろです。')==='2027年（丁未・46歳）ごろです。'; const nen=/年運は丙午の年であり/.test(pkFmTidy2('今年（2026年の年運・2027年2月4日の立春まで）の年運は丁未の年であり、穏やかです。'));
    const q='彼と復縁できますか？いつ頃連絡が来そうですか', L0=pkOfflineLead(chart,q,false), k=(L0.match(/(?:19|20)\d\d年(?:1[0-2]|[1-9])?月?/)||[''])[0];
    const lf=pkLeadFix('2026年の年内から2027年のごろです。\n【お客様へのお伝え方】\nあ\n【どうすればよいか】\n・い',chart,q,false).split('\n')[0], e5=!k||lf.indexOf(k)>=0;
    const wide=/@media \(min-width:761px\)\{ html #jumpnav\.on\{flex-wrap:wrap!important/.test(css);
    const fb=/鑑定の記録を別の画面で開きました/.test(String(viewReading))&&/LINEに貼りつけてください/.test(String(copyText))&&/navigator\.share&&!_desk/.test(String(shareText));
    const bq=document.getElementById('b-quick'), bn=document.getElementById('b-name'), border=!!(bq&&bn&&(bq.compareDocumentPosition(bn)&4));
    const cn2=[...document.querySelectorAll('#cpnav button')].map(b=>b.getAttribute('data-cp')||(b.classList.contains('pk-qm-tg')?'qm':'?')).join(','), cpOrder=/^compat,next,qm,sum-sec,toc$/.test(cn2);
    const img=/t:brandName\|\|'鑑定文'/.test(String(pkShareImage)), pdf=/タップで開く\(\?:/.test(String(printHTML));
    const job=/続けるか転職するか/.test(pkOfflineLead(chart,'今の会社を続けるべきか転職するべきか迷っています',false)||'')||!!pkWorkDir(chart,'今の会社を続けるべきか転職するべきか迷っています');
    const retry=/_timedOut&&_part==='answer'&&!_srvKind/.test(src);
    const bg=!isB||(/bg-ar-go/.test(src)&&/jn-ar/.test(src)&&/var DUP=\{'cm-w':1,'tr-w':1\}/.test(src));
    // 生年月日のまちがいは赤い字・赤い枠（前の ✓ の緑が残らない）
    const qi=document.getElementById('f-quick'), m=document.getElementById('f-quick-msg'), keep=qi.value; const fire=v=>{ qi.value=v; qi.dispatchEvent(new Event('input',{bubbles:true})); };
    fire('19810610 2228'); await new Promise(r=>setTimeout(r,500)); fire('19811350'); await new Promise(r=>setTimeout(r,500));
    const col=getComputedStyle(m).color, red=/rgb\((1[5-9]\d|2\d\d), (\d{1,2}), (\d{1,2})\)/.test(col)&&qi.classList.contains('qd-bad');
    fire(keep); qi.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,500));
    return {nen,incl,cnOK,goro,e5,lf:lf.slice(0,60),k,wide,fb,border,cpOrder,cn2,img,pdf,job,retry,bg,red,col,back:!qi.classList.contains('qd-bad')}; }catch(e){ return {err:String(e)}; } });
  ok('UX③：送る文に「お伝え方」が最初から入る（✓が入っている）', V.incl, JSON.stringify(V).slice(0,120));
  ok('UX③：中国語がまじった見出しは【どうすればよいか】に戻す・「のごろ」を直す', V.cnOK&&V.goro);
  ok('事実：「（2026年の年運…）の年運は丁未の年」の干支を年に合わせる（2026-11-19 事実の点検）', V.nen);
  ok('UX③：恋愛・復縁の「いつ」の1行目は、話す順番③（通信なし）と同じ時期', V.e5, V.k+' / '+V.lf);
  ok('UX③：生年月日のまちがいは赤い字・赤い枠（前の ✓ の緑を残さない）', V.red&&V.back, V.col);
  ok('UX③：タブレット・パソコンでは目次の帯を折り返す', V.wide);
  ok('UX③：カルテの「開く」・パソコンの「LINEで送る」に知らせ', V.fb);
  ok('UX③：お相手の入力は生年月日が先・相性の帯は答え→次のお客様へ→すぐ答え', V.border&&V.cpOrder, V.cn2);
  ok('UX③：画像の題は「鑑定文」・PDFに「タップで開く」を出さない', V.img&&V.pdf);
  ok('UX③：「続けるか転職か」に「独立」と答えない', V.job);
  ok('UX③：答えが時間切れでも、通信できるならもう1回だけためす', V.retry);
  ok('UX③：ビギナーのまとめの下に鑑定文への近道・相性のくり返しを「くわしい内容」へ', V.bg); }
ok('UX③：鑑定書の章の見出しのすぐ下に「恋愛での持ち味」などの見出しを重ねない', /章の見出しのすぐ下に「恋愛での持ち味」などの見出しが重ならないように/.test(fs.readFileSync(path.join(ROOT,'pro','meishi-sheet.html'),'utf8')));
// 恋愛相談の点検（2026-11-20 鑑定者本人の承認「1から6を直して」）：好かれたい・前提と星のくいちがい・ご相談者・時刻不明・説明の二重・送る文の日柱・優しや
{ const L=await p.evaluate(()=>{ try{ const pl=document.documentElement.classList.contains('bg-on'), mk=(y,m,d,h,mi,sex,tu)=>{ const c=baziCompute({year:y,month:m,day:d,hour:h,minute:mi,sex,tu},0,'none'); return tu?markTimeUnknown(c):c; };
    const k0=chart, k1=(typeof chartB!=='undefined')?chartB:null, W=mk(1981,6,10,22,0,'female',false), M=mk(1971,4,25,12,0,'male',true); chart=M; chartB=W;
    const q='男性のほうが女性を好きだけど、女性はあまり男性に惹かれていない。もっと女性に好かれるにはどうしたらいいですか';
    const kinds=['彼に振り向いてほしい','もっと仲良くなりたいです','彼女に好かれるにはどうしたらいいですか',q].map(pkCompatQKind), kindOK=kinds.every(x=>x==='win')&&pkCompatQKind('告白したい')==='confess'&&pkCompatQKind('復縁したい')==='reunion';
    const S=pkCompatSit(M,W,q,pl), lead=(S&&S.lead)||'', leadOK=/近道/.test(lead)&&!pkCpFeelAssert(lead)&&/\d{1,2}月/.test(lead)&&!/(?:20[3-9]\d)年/.test(lead);
    const howOK=S&&S.how.some(x=>/好きになりやすい/.test(x))&&S.how.some(x=>/揺れやすい月/.test(x))&&S.how.some(x=>/駆け引き/.test(x))&&S.how.some(x=>/時刻がわかれば/.test(x));
    const ans='お相手はあなたにしっかり惹かれていますし、温かい相性です。\n【お客様へのお伝え方】\nお相手もあなたを大切に思っています。2032年は距離を縮めやすい好機です。\n【どうすればよいか】\n- ペースを大切に\n';
    const lf=pkLeadFix(ans,M,q,true).split('\n')[0], lfOK=lf===lead;
    const ew=pkEnsureWin(ans,M,W,q), ewOK=!/2032年/.test(ew)&&/星の並びからは見られます/.test(ew)&&/揺れやすい月/.test(ew)&&/好きになりやすい/.test(ew);
    const sel=document.getElementById('cp-who'); let who=false; if(sel){ sel.value='b'; const ab=pkCpAB(M,W); who=ab[0]===W&&ab[1]===M; sel.value='a'; who=who&&pkCpAB(M,W)[0]===M; }
    const par=pkFmParenTidy('喜神（きしん：あると調子が上がる五行〈調子が上がる五行〉）')==='喜神（きしん：あると調子が上がる五行）';
    const sh=pkShareTidy('【2人の持ち味（日柱）】\n・本人の日柱「庚辰」＝芯が強い（魁罡＝かいごう）。'), shOK=/【2人の持ち味】/.test(sh)&&/あなた：/.test(sh)&&!/日柱|魁罡/.test(sh);
    const ty=PK_TYPO.reduce((t,x)=>t.replace(x[0],x[1]),'小さな優しや思いやり')==='小さな優しさや思いやり';
    const one=pkOfflineLead(M,'好きな人にもっと好かれるにはどうしたらいいですか',pl)||'', oneOK=/近道/.test(one)&&/生年月日がわかれば/.test(one);
    chart=k0; chartB=k1; return {kindOK,kinds,leadOK,lead:lead.slice(0,90),howOK,lfOK,lf:lf.slice(0,60),ewOK,who,par,shOK,ty,oneOK}; }catch(e){ return {err:String(e)}; } });
  ok('恋愛：「好かれたい・振り向かせたい・距離を縮めたい」を相談の種類（win）として見分ける', L.kindOK, JSON.stringify(L.kinds||L.err));
  ok('恋愛：好かれたい相談の1行目は「どうすれば」に答え、前提を打ち消さず、これから12ヶ月の月で答える', L.leadOK, L.lead||L.err);
  ok('恋愛：どうすればよいかに、好きになりやすい人・注意の月・駆け引きをしない・時刻不明の一言', L.howOK);
  ok('恋愛：1行目が「もう惹かれています」と前提を打ち消したら、ツールの1行目に置きかえる', L.lfOK, L.lf);
  ok('恋愛：お相手の気持ちの言い切りをやわらげ、3年以上先の年を主な時期にせず、材料を足す', L.ewOK);
  ok('恋愛：ご相談者（本人／お相手）を選べる', L.who);
  ok('恋愛：説明の二重（〈調子が上がる五行〉）を1つに・送る文に日柱の専門用語を出さない・「優しや」を直す', L.par&&L.shOK&&L.ty);
  ok('恋愛：お相手の生年月日がない「好かれたい」も1行目で答える', L.oneOK); }
{ const L2=await p.evaluate(()=>{ try{ const pl=document.documentElement.classList.contains('bg-on'), k0=chart, k1=chartB; const mk=(y,m,d,h,sex)=>baziCompute({year:y,month:m,day:d,hour:h,minute:0,sex},0,'none');
    const W=mk(1990,3,3,12,'female'), M=mk(1988,8,15,9,'male'); chart=W; chartB=M; const T='\n【お客様へのお伝え方】\n本文。', f=(x,q,cp)=>pkLeadFix(x+T,W,q,cp).split('\n')[0];
    const ch=pkCompatQKind('彼に浮気されました。許して続けるべきですか')==='breakup';
    const fate=f('結婚まで進む可能性は十分にあります。お相手から見るとあなたはとても魅力的に映り、自然と心惹かれる組み合わせだからです。','彼と結婚できますか？いつ頃ですか',true), fateOK=!/十分|魅力的に映/.test(fate)&&/可能性はあります/.test(fate);
    const pre=f('お相手を許して関係を続けるべきかというご相談について、2人の生まれ持った性質と結びつきの強さからお答えします。','彼に浮気されました。許して続けるべきですか',true), preOK=!/お答えします/.test(pre)&&/決める/.test(pre);
    const two=f('どちらと付き合うかはあなた次第です。','2人の男性の間で迷っています。両方と付き合ってもいいですか',true), twoOK=/おすすめしません/.test(two);
    chartB=null; const re=pkOfflineLead(W,'別れた彼とやり直せますか',pl)||'', reOK=!/別れるかどうか/.test(re)&&/可能性/.test(re);
    const one=f('お互いの歩みを整えれば、一緒に未来へ進む可能性は十分にあります。','既婚者の彼と付き合っています。この先2人で一緒になれる可能性はありますか',false), oneOK=!/十分/.test(one)&&/可能性はあります/.test(one);
    const ch1=pkOfflineLead(W,'彼に浮気されました。許して続けるべきですか',pl)||'', ch1OK=/許して続けるか/.test(ch1);
    chart=k0; chartB=k1; return {ch,fateOK,fate:fate.slice(0,60),preOK,pre:pre.slice(0,60),twoOK,reOK,re:re.slice(0,50),oneOK,one:one.slice(0,50),ch1OK,ch1:ch1.slice(0,40)}; }catch(e){ return {err:String(e)}; } });
  ok('恋愛②：浮気された（許して続けるか）は別れるかの相談と同じ答え方', L2.ch&&L2.ch1OK, L2.ch1||L2.err);
  ok('恋愛②：結ばれるか・結婚できるかの1行目はツールの見込みにそろえる（「十分」・気持ちの言い切りを置きかえ）', L2.fateOK, L2.fate||L2.err);
  ok('恋愛②：1行目が前置きの1文だけならツールの1行目に', L2.preOK, L2.pre);
  ok('恋愛②：二股・両方と付き合う相談はすすめない', L2.twoOK);
  ok('恋愛②：「別れた彼とやり直せますか」を別れるかの相談にせず、1行目で見込みに答える', L2.reOK, L2.re);
  ok('恋愛②：1人の「一緒になれるか」で「可能性は十分」と言い切らない（pkLeadFix が止まらない）', L2.oneOK, L2.one); }
{ const G=await p.evaluate(()=>{ try{ const pl=document.documentElement.classList.contains('bg-on'), k0=chart, k1=chartB; const mk=(y,m,d,h,sex)=>baziCompute({year:y,month:m,day:d,hour:h,minute:0,sex},0,'none');
    const W=mk(1981,6,10,22,'female'), M=mk(2006,6,7,12,'male'); chart=W; chartB=M; const Q='かなりの年齢差がありますが、この2人の関係はどうなるか教えてください。';
    const kind=pkCompatQKind(Q)==='future'&&pkCompatQKind('15歳年下の彼との相性が気になります')==='future';
    const S=pkCompatSit(W,M,Q,pl)||{}, lead=S.lead||'', leadOK=/年齢差（約2[45]歳）/.test(lead)&&/流れ/.test(lead)&&/2人とも縁が動く月/.test(lead.split('。').slice(1).join('。')+lead)&&!/やめ|心配|まわりの目|介護/.test(lead);
    const ag=S.ag||{}, agOK=(ag.lines||[]).join('').match(/年齢差は約\d+歳/)&&/役割/.test((ag.lines||[]).join(''))&&/(大運|10年)/.test((ag.lines||[]).join(''));
    const T='\n【お客様へのお伝え方】\n本文。', lf=pkLeadFix('2人はこれから少しずつ距離が縮まります。'+T,W,Q,true).split('\n')[0], lfOK=/年齢差/.test(lf);
    const en=pkEnsureAgeGap('1行目です。\n\n本文です。\n【どうすればよいか】\n・話し合う',W,M,Q), enOK=(pl?/【年の差について】/:/【年齢差について】/).test(en)&&!(pl&&/大運|律音|日干/.test(en.split('【年の差について】')[1].split('【')[0]));
    const tx=pkCompatSitText(W,M,Q), txOK=/年齢差について書く材料/.test(tx)&&/全体の見通し/.test(tx);
    const no=pkEnsureAgeGap('1行目。\n\n本文。',W,M,'2人の相性はどうですか'), noOK=!/年齢差について/.test(no);
    chart=k0; chartB=k1; return {kind,leadOK:!!leadOK,lead:lead.slice(0,90),agOK:!!agOK,lfOK,lf:lf.slice(0,60),enOK,txOK,noOK}; }catch(e){ return {err:String(e)}; } });
  ok('年齢差：年齢差の相談を「どうなるか」として見分ける', G.kind, G.err);
  ok('年齢差：1行目で年齢差にふれ、全体の見通し→2人とも縁が動く月で答える（説教しない）', G.leadOK, G.lead||G.err);
  ok('年齢差：材料に年齢・共通点・役割・いまの10年', G.agOK);
  ok('年齢差：1行目が年齢差にふれていなければツールの1行目に', G.lfOK, G.lf);
  ok('年齢差：【年齢差について】（ビギナーは【年の差について】・専門用語なし）を書き足す／年齢差の相談でなければ足さない', G.enOK&&G.noOK);
  ok('年齢差：文章作成への渡しに年齢差の材料と「全体の見通し」', G.txOK); }
{ const A=await p.evaluate(()=>{ try{ const pl=document.documentElement.classList.contains('bg-on'), k0=chart, k1=chartB; const W=baziCompute({year:1981,month:6,day:10,hour:22,minute:0,sex:'female'},0,'none'); chart=W; chartB=null;
    const Qs=['既婚者の彼と結ばれますか','不倫中の彼が離婚して一緒になれますか','彼を奥さんから略奪できますか','彼に離婚させられますか','奥さんのいる彼といつ一緒になれますか'];
    const safe=Qs.filter(q=>pkSafeKind(q,30)||dangerKind(q)||worryCaveat(q)), love=Qs.filter(q=>!pkIsLoveQ(q)), kind=Qs.filter(q=>pkCompatQKind(q)!=='fate');
    const leads=Qs.map(q=>pkOfflineLead(W,q,pl)||''), lead=leads.filter(l=>!(/可能性はあります/.test(l)&&/20\d\d年/.test(l)));
    const law=!!pkSafeKind('慰謝料を請求されたらどうなりますか',30), re=pkCompatQKind('不倫相手とやり直せますか')==='reunion';
    chart=k0; chartB=k1; return {safe,love,kind,lead,lead0:leads[2].slice(0,60),law,re}; }catch(e){ return {err:String(e)}; } });
  ok('不倫：既婚の方との恋・略奪・離婚させられるかは安全の相談にしない（慰謝料など法律の手続きは今までどおり安全の相談）', A.safe&&!A.safe.length&&A.law, JSON.stringify(A.safe||A.err));
  ok('不倫：恋愛の相談として見分け、相性では「結ばれるか」の相談にする（やり直せるかは復縁）', A.love&&!A.love.length&&!A.kind.length&&A.re, JSON.stringify([A.love,A.kind]));
  ok('不倫：通信なしの1行目で見込みと時期に答える（鑑定者本人の決定 2026-11-20）', A.lead&&!A.lead.length, A.lead0||A.err); }
// 追加の質問
const c1=calls; await p.fill('#worry','彼から連絡が来るのはいつ頃ですか'); await p.click('#consultBtn'); await p.click('#consultBtn').catch(()=>{});
const ms2=await waitFor(()=>{const it=document.querySelectorAll('#reading .rd-item');const l=it[it.length-1];return it.length>=2&&l.querySelector('.rd-bar')&&!l.querySelector('.loading');},60000);
await p.waitForTimeout(1500);
const items2=await p.evaluate(()=>document.querySelectorAll('#reading .rd-item').length);
const A2=await p.evaluate(()=>{const L=document.querySelectorAll('#reading .rd-item');if(!L.length) return ''; const it=L[L.length-1]; const op=[...it.querySelectorAll('details.r-fold:not([open])')]; op.forEach(d=>d.open=true); const t=it.querySelector('.rd-body').innerText; op.forEach(d=>d.open=false); return t;});
if(process.env.GATE_DUMP){ (await import('fs')).writeFileSync(process.env.GATE_DUMP,A+'\n=====\n'+A2); }
ok('相談2（続けて質問）：答えが出る', ms2>=0 && A2.length>200, A2.length+'字');
{ const f2=(A2.split('\n').map(s=>s.trim()).filter(s=>s.length>8&&!/^(コピー|言葉の意味|ご相談|彼から連絡が来るのはいつ頃ですか|▲|オンライン鑑定|オフライン鑑定|📵|⏩|🔄|端末の中で作った)/.test(s))[0]||''); ok('相談2：「いつ」の質問に、1行目で時期を答えている', /20\d\d年|年内|来年|再来年|\d{1,3}歳|[春夏秋冬]|\d{1,2}月/.test(f2), f2.slice(0,80)); }
if(MODE==='online'){ const u=unStamped(A2); ok('相談2：西暦にツールの干支・年齢が付いている', u.length===0, u.map(y=>{const i=A2.indexOf(y+'年');return A2.slice(Math.max(0,i-15),i+12).replace(/\n/g,'⏎');}).join(' / ')); }
{ const cb=calCheck(A2,1985); ok('暦：年齢・年の干支・今年/来年が正しい（相談2）', cb.length===0, cb.slice(0,3).join(' / ')); }
ok('相談2：二度押しでも答えは1つ増えるだけ', items2===2, 'items='+items2);
if(MODE==='online') ok('相談2：呼び出し回数'+(site==='beginner'?'（ビギナーは専門用語の書き直しで最大4回）':'（2回）'), site==='beginner'?(calls-c1>=2&&calls-c1<=4):calls-c1===2, 'calls='+(calls-c1));
// チャット用コピー・共有
await p.evaluate(()=>{window.__clip='';window.__shared=null;});
await p.evaluate(()=>{ document.querySelectorAll('#reading .rd-item:last-child .rd-more').forEach(d=>d.open=true); }); await p.click('#reading .rd-item:last-child .rd-chat').catch(()=>{}); await p.waitForTimeout(600);
const chat=await p.evaluate(()=>window.__clip||''); { const cb=calCheck(chat,1985); ok('暦：チャット用コピーの年齢・干支・今年/来年が正しい', cb.length===0, cb.slice(0,3).join(' / ')); } ok('チャット用コピーが空でない・＊なし', chat.length>80&&cleanStar(chat)===0, chat.length+'字');
await p.click('#reading .rd-item:last-child .rd-share').catch(()=>{}); await p.waitForTimeout(600);
const sh=await p.evaluate(()=>((window.__shared||{}).text||'')); ok('共有（LINE）の文が空でない・＊なし', sh.length>80&&cleanStar(sh)===0, sh.length+'字');
// カルテ
const k=await p.evaluate(()=>{try{const c=mpLoad().clients.find(x=>x.name==='山田花子');return c?c.readings.map(r=>r.text):[];}catch(e){return ['ERR'];}});
ok('カルテに2件とも保存・空でない・＊なし', k.length>=2&&k.every(t=>t.length>100&&cleanStar(t)===0), k.map(t=>t.length).join(','));
// 鑑定書
const c2=calls;
const [pop]=await Promise.all([ctx.waitForEvent('page',{timeout:10000}).catch(()=>null), p.evaluate(()=>document.getElementById('jn-print').click())]);   // スマホ幅では「☰ 目次」の中にあるので、直接押す（2026-11-17）
if(!pop){ ok('鑑定書が開く', false); } else {
  await pop.waitForLoadState('load').catch(()=>{});
  const t=Date.now(); let txt='';
  _log('   [点検] wait loop start',Date.now()-T00); while(Date.now()-t<70000){ txt=await pop.evaluate(()=>{const o=document.getElementById('sheetsWrap');return o?o.innerText:'';}).catch(()=>''); const busy=await pop.evaluate(()=>/作成しています|作成中|生成中|読み解いています/.test((document.getElementById('sheetsWrap')||{}).innerText||'')).catch(()=>true); if(txt.length>1500&&!busy&&Date.now()-t>4000) break; await pop.waitForTimeout(500); }
  await pop.waitForTimeout(2500); txt=await pop.evaluate(()=>(document.getElementById('sheetsWrap')||{}).innerText||'').catch(()=>txt);

  ok('鑑定書：中身が空でない', txt.length>1500, txt.length+'字');
  ok('鑑定書：＊なし', cleanStar(txt)===0, cleanStar(txt));
  if(MODE==='online') ok('鑑定書：呼び出し回数（目安1〜3回）', calls-c2>=1&&calls-c2<=3, 'calls='+(calls-c2));
  await pop.close(); }
{ const rt=await p.evaluate(()=>(document.getElementById('reading')||{}).innerText||''); ok('1人の相談に相性の書き足しが付かない', !/惹かれ合う星|2人の役割と|この2人だけの読み|2人の合が三合|2人が惹かれ合う|2人の結びつきが強まる/.test(rt), (rt.match(/.{0,20}(惹かれ合う星|2人の役割と|この2人だけの読み|2人の合が三合).{0,20}/)||[''])[0]); }
const _e=errs.filter(x=>!/reqfail: .*gemini/.test(x)&&!(MODE!=='online'&&/ERR_INTERNET_DISCONNECTED/.test(x))); ok('画面のエラー0件', _e.length===0, _e.slice(0,3).join(' | '));

console.log(JSON.stringify(CL)); console.log(`  → ${R.filter(x=>!x.pass).length===0?'合格':'不合格'}（${R.filter(x=>x.pass).length}/${R.length}）  呼び出し合計 ${calls}`);
await b.close(); srv.close();
