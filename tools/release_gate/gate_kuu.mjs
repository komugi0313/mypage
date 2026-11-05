// 発売前の点検（空亡の印）：月の空亡・日の空亡・年の空亡の印が、場所ごとにそろっているか／年明け・立春のさかい目で「今年」「1月」「2月」を正しく読むか／
// 決まった例（2006-06-07 男・時刻不明 × 2008-03-28 14:00 女・恋人・今日 2026-11-05）／ビギナーのやさしい言い方に「空亡」「解空」が出ないか、を確かめる。
// CLAUDE.md「月の空亡」「自分から動く時期」「オンラインの答えの空亡の安全装置」「返事を待っている相談」「立春前の『今年』と日本時間」（先生の承認 2026-11-05）。
// 文章作成は使わない（呼び出し0回）。今日の日付は Playwright の時計で固定する（端末の時間帯は Asia/Tokyo。KUU_TZ で変えられる）。
// 使い方：node tools/release_gate/gate_kuu.mjs <pro|beginner> [人数=50]
//   KUU_TODAY=2026-11-05T10:00:00+09:00（1・4の「今日」。3 は 2026-11-05 固定、2 は 2027-01-20／02-03／02-05 固定）
// 1 は「場所どうしが一致するか」で見る（どの月が空亡かは決め打ちしない＝解空を見る大運の決まりが変わっても使える）。
// NG＝不合格、注意＝不合格にはしないが確かめてほしいこと。
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..'), site=process.argv[2]||'pro', N=+(process.argv[3]||50);
const dir=site==='pro'?'pro':'beginner', page0=site==='pro'?'app-pro.html':'app-beginner.html';
const TODAY=process.env.KUU_TODAY||'2026-11-05T10:00:00+09:00', TZ=process.env.KUU_TZ||'Asia/Tokyo';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(0);
await new Promise(r=>srv.on('listening',r)); const port=srv.address().port;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let calls=0, uiFrom=-1; const errs=[], callFrom={};
const R=[], W=[]; const ok=(name,pass,info='')=>{ R.push({name,pass}); console.log((pass?'  OK ':'  NG ')+name+(info?'  … '+String(info).slice(0,600):'')); };
const warn=(name,info)=>{ W.push(name); console.log('  注意 '+name+(info?'  … '+String(info).slice(0,600):'')); };
const open=async(now,file,hash='')=>{ const ctx=await b.newContext({serviceWorkers:'block',timezoneId:TZ});
  await ctx.clock.setFixedTime(new Date(now));
  await ctx.route('**/.netlify/functions/**',r=>{ if(/gemini/.test(r.request().url())){ calls++; const fu=(r.request().frame()&&r.request().frame().url()||'').split('/').pop().split('#')[0]; callFrom[fu]=(callFrom[fu]||0)+1; } r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); });
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(file+': '+e.message)); p.on('dialog',d=>d.accept());
  await p.goto(`http://127.0.0.1:${port}/${file}${hash}`); await p.waitForTimeout(2500); return {ctx,p}; };
const sheetHash=(x)=>'#'+new URLSearchParams({d:x.date,t:x.notime?'12:00':x.time,sex:x.sex,corr:'none',z:'today',clk:'1',...(x.notime?{tu:'1'}:{}),...(site==='beginner'?{bg:'1'}:{})}).toString();
// 鑑定書のカレンダー（今年・来年の24マス）を読む：{key:'2026-11', ku:true, past:bool, em:'空'|'休'|''}
const readCal=async(p)=>p.evaluate(()=>[...document.querySelectorAll('.mcal')].map(m=>{ const Y=+(m.querySelector('.mcal-y').textContent.match(/(\d{4})年/)||[])[1];
  return {Y, lab:m.querySelector('.mcal-y').textContent, cells:[...m.querySelectorAll('.mc')].map(c=>{ const mo=+c.querySelector('b').textContent, em=c.querySelector('em'); return {key:(mo===1?Y+1:Y)+'-'+mo, mo, ku:c.classList.contains('ku'), em:em?em.textContent:'', past:c.classList.contains('past')}; })}; }));

// ───────────────────────── ページの中で使う道具（文字列で渡す） ─────────────────────────
const LIB=`
window.__G={
  mk(y,m,d,h,mi,sex,tu){ const run=()=>baziCompute({year:y,month:m,day:d,hour:h,minute:mi,sex,tu},'','none'); const c=(typeof pkWithOpts==='function'&&typeof pkOptsOf==='function')?pkWithOpts(pkOptsOf({}),run):run(); return tu?markTimeUnknown(c):c; },
  // 月の名前（「2026年11月〜12月上旬」「いま〜12月上旬」「（己亥・庚子の月）」）と印を読む。ML＝monthFortuneList（今の節月から12ヶ月）
  labs(t,ML){ const out=[], RE=/(いま|(\\d{4})年(\\d{1,2})月)〜(翌)?(\\d{1,2})月上旬(?:（([^）]*)の月）)?((?:〔[^〕]*〕)*)/g; let m; t=String(t||'');
    const ix=(y,mo)=>ML.findIndex(e=>e.calYear===y&&e.calMonth===mo);
    while((m=RE.exec(t))){ let keys=[];
      if(m[6]&&/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥](・[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])*$/.test(m[6])) keys=m[6].split('・');
      else { let i0=m[1]==='いま'?0:ix(+m[2],+m[3]); if(i0<0) continue; const endM=((+m[5])+10)%12+1; for(let i=i0;i<ML.length&&keys.length<12;i++){ keys.push(ML[i].ganzhi); if(ML[i].calMonth===endM) break; } }
      const marks=(m[7].match(/〔[^〕]*〕/g)||[]).filter(x=>/空亡|ひと休み/.test(x)&&!/\\d{4}年|その年|の年〕|の日〕/.test(x));
      out.push({raw:m[0],keys,mark:marks[0]||''}); }
    return out; },
  who(mark){ return {A:/本人|あなた|2人/.test(mark), B:/お相手|2人/.test(mark), any:!!mark}; },
  txt(html){ const d=document.createElement('div'); d.innerHTML=html; document.body.appendChild(d); const o={pro:[...d.querySelectorAll('.kd-pro')].map(x=>x.innerText).join('\\n'), plain:[...d.querySelectorAll('.kd-plain')].map(x=>{ x.style.display='block'; return x.innerText; }).join('\\n'), all:d.innerText}; d.remove(); return o; },
  gzOfDate(d){ try{ return _pillarForDate(d,'month').ganzhi; }catch(e){ return ''; } },
  gzOfDay(d){ try{ return _pkTransit(d.getFullYear(),d.getMonth()+1,d.getDate(),23,59).pillars[1].ganzhi; }catch(e){ return ''; } },   // 節入りの日は新しい月に数える（pkSetsuStart と同じ）
  // 「A〜Bは〔…〕(の月)なので」の範囲（避けると書いた月）と、それを除いた文
  avoid(t,ML){ const J=jstNow(), R=[]; t=String(t||'');
    const rest=t.replace(/(いま|(?:(\\d{4})年)?(\\d{1,2})月(\\d{1,2})日)〜(?:(?:\\d{4})年)?\\d{1,2}月\\d{1,2}日は(〔[^〕]*〕)(?:の月)?なので/g,(all,s,y,mo,d,tag)=>{ let gz='';
      if(s==='いま') gz=ML[0]&&ML[0].ganzhi; else { let yy=y?+y:J.y; let dt=new Date(yy,+mo-1,+d,12); if(!y&&dt<new Date(J.y,J.m-1,J.d)) dt=new Date(yy+1,+mo-1,+d,12); gz=this.gzOfDay(dt); }
      R.push({raw:all,gz,tag}); return '◆'; });
    return {ranges:R,rest}; },
};`;

// ───────────────────────── 1. 場所ごとの空亡の印がそろっているか ─────────────────────────
console.log(`■ 空亡の印の点検（${site}・今日 ${TODAY}・${N}人・時間帯 ${TZ}）`);
const A1=await open(TODAY,page0); await A1.p.evaluate(LIB);
if(process.env.KUU_SELFTEST) await A1.p.evaluate(()=>{ window.pkKuuMTag=function(){ return ''; }; });   // 点検の点検：月の印をわざと消して、食いちがいを見つけるか確かめる
const S1=await A1.p.evaluate((N)=>{ const G=window.__G, out={people:[],pairs:[],fails:[],warns:[]};
  let seed=20261105; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
  const spec=[[2006,6,7,12,0,'male',true],[2008,3,28,14,0,'female',false],[1981,6,10,22,28,'female',false],[1990,5,3,9,0,'female',false]];
  while(spec.length<N){ const tu=rnd()<0.25; spec.push([1950+Math.floor(rnd()*58),1+Math.floor(rnd()*12),1+Math.floor(rnd()*28),1+Math.floor(rnd()*22),Math.floor(rnd()*60),rnd()<0.5?'male':'female',tu]); }
  const P=spec.map(s=>{ const c=G.mk(...s); const ML=monthFortuneList(c,12).filter(e=>e&&e.calYear); const ref={}, refBr={}, ym={};
    ML.forEach(e=>{ ref[e.ganzhi]=pkKuuBadMonth(c,e); refBr[e.ganzhi]=pkKuuBadMonth(c,e.branch); ym[e.calYear+'-'+e.calMonth]=e.ganzhi; });
    const tag=s[0]+'-'+String(s[1]).padStart(2,'0')+'-'+String(s[2]).padStart(2,'0')+' '+(s[6]?'時刻不明':String(s[3]).padStart(2,'0')+':'+String(s[4]).padStart(2,'0'))+' '+(s[5]==='male'?'男':'女');
    return {c,ML,ref,refBr,ym,tag,spec:s,places:{}}; });
  const put=(o,place,gz,v)=>{ if(!gz||!(gz in o.ref)) return; (o.places[place]=o.places[place]||{})[gz]=!!v; };
  const putLabs=(o,place,t,two,side)=>{ G.labs(t,o.ML).forEach(l=>{ const w=G.who(l.mark); l.keys.forEach(k=>put(o,place,k,two?(side==='A'?w.A:w.B):w.any)); }); };
  const Q_ACT='告白したいです。いつがいいですか？';
  P.forEach((o,ix)=>{ const c=o.c;
    o.ML.forEach(e=>{ if(o.ref[e.ganzhi]!==o.refBr[e.ganzhi]) out.warns.push(o.tag+'：'+e.calYear+'年'+e.calMonth+'月（'+e.ganzhi+'）は pkKuuBadMonth に月運を渡すと'+o.ref[e.ganzhi]+'・十二支だけだと'+o.refBr[e.ganzhi]+'（呼び方で結果が変わる）'); });
    o.ML.forEach(e=>put(o,'月運の一覧（_kgMonRow）',e.ganzhi,/〔空亡〕/.test(_kgMonRow(e,c))));
    try{ const L=loveFourLines(c); if(L){ (L.topM||[]).forEach(x=>{ put(o,'恋愛の縁が動く月（topM の印）',x.gz,!!x.ku); if(!!x.ku!==!!x.kuP) out.fails.push(o.tag+'：縁が動く月 '+x.lab+' の専門の印と、やさしい印がちがう'); });
      putLabs(o,'恋愛の4項目の文（専門）',L.pro[3]); putLabs(o,'恋愛の4項目の文（やさしい）',L.plain[3]); putLabs(o,'縁が動く月の名前（monthLabs）',(L.monthLabs||[]).join('・')); putLabs(o,'縁が動く月の名前（monthLabsP）',(L.monthLabsP||[]).join('・')); } }catch(e){ out.fails.push(o.tag+'：loveFourLines エラー '+e.message); }
    try{ [false,true].forEach(pl=>{ const D=pkDigest(c,pl); if(D.love) putLabs(o,'鑑定まとめの恋愛'+(pl?'（やさしい）':''),D.love.s+' '+D.love.v);
      if(D.care){ const RE=/(\d{4})年(\d{1,2})月[^（、・。]*（([甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])）((?:〔[^〕]*〕)?)/g; let m; while((m=RE.exec(D.care.s+' '+D.care.v))) put(o,'鑑定まとめの仕事・環境の月'+(pl?'（やさしい）':''),m[3],/空亡|ひと休み/.test(m[4])); } }); }catch(e){ out.fails.push(o.tag+'：pkDigest エラー '+e.message); }
    try{ const F=pkConsultFocus(c,'金運はいつ上がりますか？').R; (F.moneyM||[]).forEach(x=>putLabs(o,'金運の月（R.moneyM）',x)); (F.moneyMP||[]).forEach(x=>putLabs(o,'金運の月（R.moneyMP）',x)); }catch(e){ out.fails.push(o.tag+'：pkConsultFocus エラー '+e.message); }
    // オンラインの答えの安全装置：「YYYY年M月に告白するのがおすすめです。」を直すかどうか
    o.ML.forEach(e=>{ try{ const r=pkKuuGuard('はい。\n'+e.calYear+'年'+e.calMonth+'月に告白するのがおすすめです。',c,null,'',false,false); put(o,'答えの安全装置（pkKuuGuard・1人）',e.ganzhi,(r.fix||[]).some(x=>/空亡の月/.test(x.what))); }catch(er){} });
    // 日の空亡の印（日運の一覧）
    try{ const ku=kubo(c); dayFortuneList(c,30).forEach(ev=>{ const has=/〔空亡の日〕/.test(_kgDayRow(ev,c)), want=ku.indexOf(ev.branch)>=0; if(has!==want) out.fails.push(o.tag+'：日運 '+(ev.date.getMonth()+1)+'/'+ev.date.getDate()+'（'+ev.ganzhi+'）の〔空亡の日〕の印が '+has+'（空亡＝'+ku.join('')+'）'); }); }catch(e){}
    // 通信なしの答えの1行目（自分から動く時期）：避けると書いた月は空亡、すすめる時期は空亡でない
    try{ const lead=pkOfflineLead(c,Q_ACT,false)||''; const A=G.avoid(lead,o.ML);
      A.ranges.forEach(r=>{ if(r.gz in o.ref&&!o.ref[r.gz]) out.fails.push(o.tag+'：1行目（1人・告白）で「'+r.raw+'」と書いたが、その月（'+r.gz+'）は解けない空亡ではない'); });
      if(/いまの時期（/.test(A.rest)&&o.ref[o.ML[0].ganzhi]) out.fails.push(o.tag+'：1行目（1人・告白）で、解けない空亡の今の月（'+o.ML[0].ganzhi+'）を「いまの時期」とすすめている：'+lead);
      G.labs(A.rest.replace(/[^。]*(?:避け|注意|揺れ)[^。]*。/g,''),o.ML).forEach(l=>{ if(!l.mark&&l.keys.length&&o.ref[l.keys[0]]) out.fails.push(o.tag+'：1行目（1人・告白）ですすめる「'+l.raw+'」が解けない空亡の月：'+lead); }); }catch(e){}
  });
  // 相性（2人ずつ。恋人）
  const pairs=[[0,1]]; for(let k=2;k+1<P.length;k+=2) pairs.push([k,k+1]); pairs.push([1,0]);
  pairs.forEach(([i,j])=>{ const a=P[i], bb=P[j], A=a.c, B=bb.c, tg=a.tag+' × '+bb.tag; let CM=[];
    try{ CM=compatMonths(A,B); CM.forEach(x=>{ put(a,'相性の月（compatMonths の本人側）',x.gz,x.kA); put(bb,'相性の月（compatMonths のお相手側）',x.gz,x.kB); }); }catch(e){ out.fails.push(tg+'：compatMonths エラー'); }
    const cmBy={}; CM.forEach(x=>cmBy[x.gz]=x);
    try{ const T=G.txt(compatMonthsHTML(A,B)); G.labs(T.pro,a.ML).forEach(l=>{ const w=G.who(l.mark); l.keys.forEach(k=>{ put(a,'相性の縁が動く月の欄（専門）',k,w.A); put(bb,'相性の縁が動く月の欄（専門）',k,w.B); }); });
      G.labs(T.plain,a.ML).forEach(l=>{ const w=G.who(l.mark); l.keys.forEach(k=>{ put(a,'相性の縁が動く月の欄（やさしい）',k,w.A); put(bb,'相性の縁が動く月の欄（やさしい）',k,w.B); }); }); }catch(e){}
    // これから1年の流れ：月の印は月の印として出ているか（年の空亡の印と同じ形で紛らわしくないか）
    try{ [false,true].forEach(pl=>{ compatFlowLines(A,B,pl).forEach((ln,ri)=>{ const F=compatFlow(A,B)[ri]; if(!F) return; const ms=F.gzs.map(g=>cmBy[g]).filter(Boolean); if(!ms.length) return;
        const kA=ms[0].kA, kB=ms[0].kB; if(ms.some(x=>x.kA!==kA||x.kB!==kB)) out.fails.push(tg+'：1年の流れの1行に、空亡の印がちがう月がまとまっている：'+ln);
        const lab=ln.split('｜')[0], want=pkCpKuuMK(kA,kB,pl);
        if(want&&lab.indexOf(want)<0) out.fails.push(tg+'：1年の流れ'+(pl?'（やさしい）':'')+'に月の印 '+want+' がない：'+lab);
        if(!want){ const got=(lab.match(/〔[^〕]*(?:空亡|ひと休み)[^〕]*〕/g)||[]).filter(x=>!/\d{4}年|その年/.test(x)); if(got.length){ const ys=[...new Set(ms.map(x=>pkMonAY(x.y,x.m)))], yt=ys.map(y=>pkCpKuu(A,B,y,pl));
          if(got.every(g=>yt.indexOf(g)>=0)) out.warns.push('1年の流れ'+(pl?'（やさしい）':'')+'：空亡の月ではないのに、年の空亡の印が月の印と同じ形 '+got.join('')+' で出る（'+tg+'：'+lab+'）');
          else out.fails.push(tg+'：1年の流れ'+(pl?'（やさしい）':'')+'に、空亡の月でない月の印 '+got.join('')+'：'+lab); } }
        if(!pl&&!!F.km!==!!(kA||kB)) out.fails.push(tg+'：1年の流れの km（空亡の月の文）が月の印とちがう：'+lab); }); }); }catch(e){ out.fails.push(tg+'：compatFlow エラー '+e.message); }
    // 2人の日（30日）
    try{ const kA=kubo(A), kB=kubo(B); compatDaysPick(A,B).all.forEach(o=>{ const ds=(o.d.getMonth()+1)+'/'+o.d.getDate();
      if(!!o.dA!==(kA.indexOf(o.x.branch)>=0)||!!o.dB!==(kB.indexOf(o.y.branch)>=0)) out.fails.push(tg+'：2人の日 '+ds+' の空亡の日の印（dA/dB）がちがう');
      const gz=G.gzOfDay(o.d); if(gz in a.ref&&(!!o.kA!==a.ref[gz]||!!o.kB!==bb.ref[gz])) out.fails.push(tg+'：2人の日 '+ds+'（'+gz+'の月）の空亡の月の印 kA/kB='+o.kA+'/'+o.kB+'、月の印は '+a.ref[gz]+'/'+bb.ref[gz]); }); }catch(e){}
    // 答えの安全装置（相性）：直すのは本人かお相手の解けない空亡の月だけ。印の種類も合う
    a.ML.forEach(e=>{ try{ const r=pkKuuGuard('はい。\n'+e.calYear+'年'+e.calMonth+'月に告白するのがおすすめです。',A,B,Q_ACT,true,false), fx=(r.fix||[]).some(x=>/空亡の月/.test(x.what)), rA=a.ref[e.ganzhi], rB=bb.ref[e.ganzhi];
      if(fx!==(rA||rB)) out.fails.push(tg+'：安全装置（相性）が '+e.calYear+'年'+e.calMonth+'月（'+e.ganzhi+'）を '+(fx?'直した':'直さない')+'（本人/お相手の空亡の月＝'+rA+'/'+rB+'）');
      else if(fx){ const want=pkCpKuuMK(rA,rB,false); if(r.text.indexOf(want)<0) out.fails.push(tg+'：安全装置（相性）の印が '+want+' でない：'+r.text.split('\n')[1]); } }catch(er){} });
    // 相性の1行目（告白したい）：避けると書いた月はその人の空亡、すすめる時期は2人とも空亡でない
    try{ const S=pkCompatSit(A,B,Q_ACT,false); const lead=S&&S.lead||''; const V=G.avoid(lead,a.ML);
      V.ranges.forEach(r=>{ if(!(r.gz in a.ref)) return; const w=G.who(r.tag), okA=!w.A||a.ref[r.gz], okB=!w.B||bb.ref[r.gz]; if(!(okA&&okB)) out.fails.push(tg+'：相性の1行目で「'+r.raw+'」と書いたが、その月（'+r.gz+'）の空亡は 本人'+a.ref[r.gz]+'／お相手'+bb.ref[r.gz]); });
      if(/いまの時期（/.test(V.rest)&&(a.ref[a.ML[0].ganzhi]||bb.ref[a.ML[0].ganzhi])) out.fails.push(tg+'：相性の1行目で、どちらかの解けない空亡の今の月を「いまの時期」とすすめている：'+lead);
      G.labs(V.rest.replace(/[^。]*(?:避け|注意|揺れ)[^。]*。/g,''),a.ML).forEach(l=>{ if(!l.mark&&l.keys.length&&(a.ref[l.keys[0]]||bb.ref[l.keys[0]])) out.fails.push(tg+'：相性の1行目ですすめる「'+l.raw+'」がどちらかの解けない空亡の月：'+lead); }); }catch(e){}
    out.pairs.push(tg);
  });
  // 場所どうしをくらべる
  P.forEach(o=>{ const rows=[]; o.ML.forEach(e=>{ const T=[], F=[]; if(o.ref[e.ganzhi]) T.push('基準 pkKuuBadMonth'); else F.push('基準 pkKuuBadMonth');
      Object.keys(o.places).forEach(pl=>{ const v=o.places[pl][e.ganzhi]; if(v===undefined) return; (v?T:F).push(pl); });
      if(T.length&&F.length) rows.push({m:e.calYear+'年'+e.calMonth+'月（'+e.ganzhi+'）',T,F}); });
    out.people.push({tag:o.tag,spec:o.spec,ref:o.ref,ym:o.ym,cur:o.ML[0].calYear+'-'+o.ML[0].calMonth,rows,nk:Object.values(o.ref).filter(Boolean).length,np:Object.keys(o.places).length}); });
  return out; },N);
// PROだけ：今月の運勢をまとめて作る（bmKuu の〔空亡〕の札と文）
const bmPlace={};
if(site==='pro'){ try{
  const has=await A1.p.evaluate((L)=>{ window.mpActive=()=>L.map((s,i)=>({id:'g'+i,name:'点検'+i,kana:'てんけん'+String(i).padStart(3,'0'),date:s[0]+'-'+String(s[1]).padStart(2,'0')+'-'+String(s[2]).padStart(2,'0'),time:String(s[3]).padStart(2,'0')+':'+String(s[4]).padStart(2,'0'),notime:!!s[6],sex:s[5],corr:'none',pref:''})); return !!document.getElementById('bm-open'); }, S1.people.map(x=>x.spec));
  if(!has) warn('今月の運勢をまとめて作る：ボタンが見つからない（点検できない）');
  else { const readBm=async()=>{ for(let k=0;k<20;k++){ const more=await A1.p.evaluate(()=>{ const m=document.getElementById('bm-more'); if(m&&!m.hidden){ m.click(); return true; } return false; }); if(!more) break; await A1.p.waitForTimeout(300); }
      await A1.p.waitForTimeout(500);
      return A1.p.evaluate(()=>[...document.querySelectorAll('#bm-list .bm-card')].map(cd=>({name:cd.querySelector('.bm-name').textContent,ku:!!cd.querySelector('.bm-badge.ku'),txt:(cd.querySelector('textarea')||{}).value||''}))); };
    await A1.p.evaluate(()=>document.getElementById('bm-open').click()); await A1.p.waitForTimeout(1200);
    for(const step of [0,1]){
      const ym=await A1.p.evaluate((step)=>{ const el=document.getElementById('bm-month'); if(step){ const [y,m]=(el.value||'').split('-').map(Number); const n=m===12?(y+1)+'-01':y+'-'+String(m+1).padStart(2,'0'); el.value=n; el.dispatchEvent(new Event('change')); } return el.value; },step);
      await A1.p.waitForTimeout(800); const cards=await readBm();
      const gz=await A1.p.evaluate((ym)=>{ const [y,m]=ym.split('-').map(Number); return _pillarForDate(new Date(y,m-1,20,12),'month').ganzhi; },ym);
      cards.forEach(cd=>{ const i=+cd.name.replace('点検',''); const pp=S1.people[i]; if(!pp||!(gz in pp.ref)) return; (bmPlace[i]=bmPlace[i]||{})['今月の運勢まとめ（'+ym+'・札）']={[gz]:cd.ku}; bmPlace[i]['今月の運勢まとめ（'+ym+'・文の〔空亡〕）']={[gz]:/〔空亡〕/.test(cd.txt)}; });
      console.log('   （今月の運勢まとめ：'+ym+'＝'+gz+'の月・'+cards.length+'人を読んだ）'); }
  } }catch(e){ warn('今月の運勢をまとめて作る：読めなかった',e.message); } }
// 鑑定書のカレンダー（やさしい版・本格版・テーマ4つ）
const sheetPlace={}, easyTerm=[]; const SH=S1.people.map((x,i)=>i).filter(i=>i<4||(S1.people[i].spec[3]>=1&&S1.people[i].spec[3]<=22)).slice(0,site==='pro'?12:6);
for(const i of SH){ const x=S1.people[i], s=x.spec; const h={date:s[0]+'-'+String(s[1]).padStart(2,'0')+'-'+String(s[2]).padStart(2,'0'),time:String(s[3]).padStart(2,'0')+':'+String(s[4]).padStart(2,'0'),notime:s[6],sex:s[5]};
  const S=await open(TODAY,'meishi-sheet.html',sheetHash(h)); const pl=sheetPlace[i]={};
  const add=(name,cal)=>{ cal.forEach(row=>row.cells.forEach(c=>{ const gz=x.ym[c.key]; if(!gz) return; (pl[name]=pl[name]||{})[gz]=c.ku; })); };
  const ez=await readCal(S.p); add('鑑定書のカレンダー（やさしい版）',ez);
  if(ez.some(r=>r.cells.some(c=>c.ku&&c.em!=='休'))) easyTerm.push(x.tag+'：やさしい版のマスの印が「休」でない');
  { const t=await S.p.evaluate(()=>[...document.querySelectorAll('.mcal,.rd-mcap,.rd-mleg')].map(e=>e.textContent).join('\n')); const m=t.match(/[^\n]{0,20}(空亡|解空)[^\n]{0,20}/); if(m) easyTerm.push(x.tag+'：鑑定書のやさしい版のカレンダーに「'+m[1]+'」：'+m[0]); }
  if(site==='pro'){ const lv=await S.p.evaluate(()=>{ const x=document.getElementById('lvPro'); if(x) x.click(); return !!x; }); if(lv){ for(let k=0;k<40;k++){ await S.p.waitForTimeout(250); if(await S.p.evaluate(()=>{ const m=document.getElementById('readMount'); return !!(m&&m.querySelector('.mcal')&&!m.querySelector('.ez-wrap')); })) break; }
      for(const th of ['love','work','money','health']){ if(th!=='love'){ const bt=await S.p.evaluate((th)=>{ const x=document.querySelector('#readMount [data-calth="'+th+'"]')||document.querySelector('[data-calth="'+th+'"]'); if(x) x.click(); return !!x; },th); if(!bt) continue; await S.p.waitForTimeout(400); await S.p.waitForTimeout(600); }
        const cal=await readCal(S.p); add('鑑定書のカレンダー（本格版・'+th+'）',cal);
        if(cal.some(r=>r.cells.some(c=>c.ku&&c.em!=='空'))) easyTerm.push(x.tag+'：本格版のマスの印が「空」でない（'+th+'）'); } } }
  await S.ctx.close(); }
// まとめてくらべる
{ const mism=[]; S1.people.forEach((x,i)=>{ const extra=Object.assign({},sheetPlace[i]||{},bmPlace[i]||{}); const rows=x.rows.slice();
    Object.keys(x.ref).forEach(gz=>{ const T=[],F=[]; Object.keys(extra).forEach(pl=>{ const v=extra[pl][gz]; if(v===undefined) return; (v?T:F).push(pl); }); if(!T.length&&!F.length) return;
      const r=rows.find(r=>r.m.indexOf('（'+gz+'）')>=0); if(r){ r.T.push(...T); r.F.push(...F); } else { (x.ref[gz]?T:F).unshift('基準 pkKuuBadMonth'); if(T.length&&F.length){ const k=Object.keys(x.ym).find(k=>x.ym[k]===gz); rows.push({m:k.replace('-','年')+'月（'+gz+'）',T,F}); } } });
    rows.forEach(r=>mism.push(x.tag+' '+r.m+'：印あり＝['+r.T.join('、')+']／印なし＝['+r.F.join('、')+']')); });
  const nk=S1.people.reduce((s,x)=>s+x.nk,0);
  ok('1. 空亡の月の印が場所ごとにそろっている（'+S1.people.length+'人・相性'+S1.pairs.length+'組・解けない空亡の月 のべ'+nk+'ヶ月・鑑定書'+SH.length+'人'+(site==='pro'?'・今月の運勢まとめ':'')+'）', mism.length===0, mism.length?mism.length+'件：\n      '+mism.slice(0,12).join('\n      '):'');
  const f1=S1.fails; ok('1. 日の空亡・2人の日・1年の流れ・答えの安全装置・1行目の時期が月の印と食いちがわない', f1.length===0, f1.length?f1.length+'件：\n      '+f1.slice(0,12).join('\n      '):'');
  const wu=[...new Set(S1.warns)]; if(wu.length) warn('1. 確かめてほしいこと '+wu.length+'件', '\n      '+wu.slice(0,10).join('\n      '));
  if(nk===0) ok('1. 点検した人の中に解けない空亡の月がある（点検が空回りしていない）', false); }
await A1.ctx.close();

// ───────────────────────── 2. 年明け・立春のさかい目 ─────────────────────────
for(const D of ['2027-01-20T12:00:00+09:00','2027-02-03T12:00:00+09:00','2027-02-05T12:00:00+09:00']){
  const exp={'2027-01-20':{Y:2026,pre:true,cur:'2027-1',gz:'辛丑'},'2027-02-03':{Y:2026,pre:true,cur:'2027-1',gz:'辛丑'},'2027-02-05':{Y:2027,pre:false,cur:'2027-2',gz:'壬寅'}}[D.slice(0,10)];
  const X=await open(D,page0); await X.p.evaluate(LIB);
  const r=await X.p.evaluate((exp)=>{ const G=window.__G, e=[], info=[], J=jstNow();
    const N=pkNenInfo(); if(N.Y!==exp.Y||N.pre!==exp.pre) e.push('pkNenInfo＝'+N.Y+'年・立春前'+N.pre+'（正しくは '+exp.Y+'年・'+exp.pre+'）');
    const c=G.mk(1990,5,3,9,0,'female',false); if(c.now&&c.now.year!==exp.Y) e.push('命式の「今年」（c.now.year）＝'+c.now.year+'（正しくは '+exp.Y+'）');
    try{ const lg=String(pkLifeGuide('いつ転職できますか')||''); if(!new RegExp('「今年」は(?:'+exp.Y+'年の年運|年運の年＝'+exp.Y+'年)').test(lg)) e.push('文章作成への指示の「今年」が '+exp.Y+'年の年運になっていない'); if(exp.pre&&!/立春まで/.test(lg)) e.push('文章作成への指示に立春までの期限がない'); }catch(er){ e.push('pkLifeGuide エラー'); }
    const ML=monthFortuneList(c,12); const f=ML[0]; if(!f||f.calYear+'-'+f.calMonth!==exp.cur||f.ganzhi!==exp.gz) e.push('今の月運（monthFortuneList の先頭）＝'+(f&&f.calYear+'-'+f.calMonth+f.ganzhi)+'（正しくは '+exp.cur+exp.gz+'）');
    const rs=pkRisshunOf(2027), s2=pkSetsuStart(2027,2), e1=pkSetsuEnd(2027,1); if(!rs||s2.getMonth()!==1||s2.getDate()!==rs.d) e.push('寅の月のはじまり（pkSetsuStart 2027-2）＝'+(s2.getMonth()+1)+'/'+s2.getDate()+'・立春＝2/'+(rs&&rs.d));
    if(e1.getMonth()!==1||e1.getDate()!==rs.d-1) e.push('丑の月の終わり（pkSetsuEnd 2027-1）＝'+(e1.getMonth()+1)+'/'+e1.getDate());
    if(pkMonAY(2027,1)!==2026||pkMonAY(2027,2)!==2027) e.push('pkMonAY（1月は前の年運の年）');
    if(J.m===1&&pkNowLab('2026年12月〜翌1月上旬')!=='いま〜1月上旬'&&J.d>6) e.push('pkNowLab（年明けの「いま〜1月上旬」）＝'+pkNowLab('2026年12月〜翌1月上旬'));
    // pkActPlan：丑の月だけが候補、寅の月が空亡
    const AP=pkActPlan([{y:2027,m:1}],[{y:2027,m:1,ku:''},{y:2027,m:2,ku:'〔空亡〕',kuP:'〔ひと休みの月〕'},{y:2027,m:3,ku:''}],false,'告白');
    if(J.m===2&&J.d===3){ if(!AP||AP.lab!=='いまの時期（2月3日まで）') e.push('pkActPlan（2/3・丑の月の残り1日）＝'+(AP&&AP.lab)); if(AP&&!/2月4日〜[^は]*は〔空亡〕/.test(AP.follow)) e.push('pkActPlan の次の注意に寅の月（2月4日〜）の空亡がない：'+(AP&&AP.follow)); }
    if(J.m===1&&J.d===20){ if(!AP||AP.short||!/^(2027年1月|いま)〜2月上旬/.test(AP.lab)) e.push('pkActPlan（1/20）＝'+(AP&&AP.lab)); }
    info.push('pkActPlan＝'+(AP?AP.lab+' / '+AP.follow:'なし'));
    // pkKuuGuard の「1月」「2月」「今月」「来月」の読み：丑・寅だけが解けない空亡の人を探す
    const bad=(c,y,m)=>pkKuuBadMonth(c,monthFortuneAt(c,new Date(y,m-1,20,12)));
    let U=null,T=null; for(let k=0;k<3000&&(!U||!T);k++){ const y=1955+(k*7)%55, m=1+(k*5)%12, d=1+(k*11)%28; const cc=G.mk(y,m,d,12,0,k%2?'male':'female',false);
      const b1=bad(cc,2027,1), b2=bad(cc,2027,2), b3=bad(cc,2028,1); if(!U&&b1&&!b2&&b3) U={c:cc,tag:y+'-'+m+'-'+d}; if(!T&&b2&&!b1&&!bad(cc,2028,1)) T={c:cc,tag:y+'-'+m+'-'+d}; }
    if(!U||!T){ e.push('点検用の人（丑だけ・寅だけが空亡）が見つからない'); return {e,info}; }
    const g=(c,s)=>{ const o=pkKuuGuard('はい。\n'+s,c,null,'',false,false); const f=(o.fix||[]).filter(x=>/空亡の月/.test(x.what)); return {fx:f.length>0,calc:f.map(x=>x.calc).join('／'),text:o.text.split('\n')[1]}; };
    const T1=[];
    if(J.m===1){ T1.push(['1月に告白するのがおすすめです。',U,true,/丑の月/,/2月3日/],['2月に告白するのがおすすめです。',T,true,/寅の月/,/2月4日/],['1月に告白するのがおすすめです。',T,false],['今月告白するのがおすすめです。',U,true,/丑の月/],['来月告白するのがおすすめです。',T,true,/寅の月/]); }
    if(J.m===2&&J.d===3){ T1.push(['今月告白するのがおすすめです。',U,true,/丑の月/],['2月に告白するのがおすすめです。',T,true,/寅の月/,/2月4日/],['1月に告白するのがおすすめです。',U,true,/2028年1月/],['2月に告白するのがおすすめです。',U,false]); }
    if(J.m===2&&J.d===5){ T1.push(['今月告白するのがおすすめです。',T,true,/寅の月/],['今月告白するのがおすすめです。',U,false],['1月に告白するのがおすすめです。',U,true,/2028年1月/],['2月に告白するのがおすすめです。',T,true,/寅の月/]); }
    T1.forEach(([s,P,want,re1,re2])=>{ const o=g(P.c,s); if(o.fx!==want) e.push('安全装置：「'+s+'」（'+(P===U?'丑':'寅')+'の月が空亡の人）を'+(o.fx?'直した':'直さない')+'（'+o.calc+'）');
      else if(want&&((re1&&!re1.test(o.calc))||(re2&&!re2.test(o.calc)))) e.push('安全装置：「'+s+'」の月の読みがちがう：'+o.calc); else info.push('「'+s+'」'+(P===U?'丑':'寅')+'の人→'+(o.fx?'直す：'+o.calc:'直さない')); });
    return {e,info,cur:ML[0].calYear+'-'+ML[0].calMonth}; },exp);
  await X.ctx.close();
  // 鑑定書のカレンダーの1年（2月〜翌年1月）
  const S=await open(D,'meishi-sheet.html',sheetHash({date:'1990-05-03',time:'09:00',sex:'female'}));
  const cal=await readCal(S.p); const sy=await S.p.evaluate(()=>{ try{ return _sheetYear(); }catch(e){ return null; } }); const capT=await S.p.evaluate(()=>[...document.querySelectorAll('.rd-mcap')].map(x=>x.textContent).join('\n'));
  await S.ctx.close();
  const e=r.e.slice();
  if(!sy||sy.y!==exp.Y||!!sy.pre!==exp.pre) e.push('鑑定書の「今年」（_sheetYear）＝'+(sy&&sy.y)+'・立春前'+(sy&&sy.pre));
  if(cal.length<2||cal[0].Y!==exp.Y||cal[1].Y!==exp.Y+1) e.push('鑑定書のカレンダーの年＝'+cal.map(x=>x.Y).join('・')+'（正しくは '+exp.Y+'・'+(exp.Y+1)+'）');
  if(cal.some(row=>row.cells.map(c=>c.mo).join(',')!=='2,3,4,5,6,7,8,9,10,11,12,1')) e.push('鑑定書のカレンダーの並びが2月〜翌年1月でない');
  if(exp.pre&&!/立春まで/.test(capT)) e.push('鑑定書の今年の行に立春までの期限がない');
  const curCell=cal.flatMap(x=>x.cells).find(c=>c.key===r.cur); if(curCell&&curCell.past) warn('2. '+D.slice(0,10)+'：鑑定書のカレンダーで、いまの節月（'+r.cur+'）のマスが「過ぎた月」の薄い色になっている（過ぎた月は暦の今月で判定）');
  ok('2. 年明け・立春のさかい目 '+D.slice(0,10)+'（今年＝'+exp.Y+'年の年運・今の月＝'+exp.gz+'・1月/2月/今月の読み・鑑定書の1年）', e.length===0, e.length?e.join(' / '):'');
  if(process.env.KUU_VERBOSE) console.log('     '+r.info.join('\n     '));
}

// ───────────────────────── 3. 決まった例 ─────────────────────────
{ const X=await open('2026-11-05T10:00:00+09:00',page0); await X.p.evaluate(LIB);
  let r=await X.p.evaluate(()=>{ const G=window.__G, e=[], A=G.mk(2006,6,7,12,0,'male',true), B=G.mk(2008,3,28,14,0,'female',false), q='告白したいです。いつがいいですか？';
    const rel=document.getElementById('rel-type'); if(rel) rel.value='love';
    const cm=compatMonths(A,B), m11=cm.find(x=>x.y===2026&&x.m===11);
    if(!m11||!m11.kA||m11.kB) e.push('2026年11月の月＝本人だけ解けない空亡になっていない（'+JSON.stringify(m11&&{kA:m11.kA,kB:m11.kB})+'）');
    if(pkDLab(pkSetsuStart(2026,11))!=='11月7日'||pkDLab(pkSetsuEnd(2026,11))!=='12月6日') e.push('亥の月の区切り＝'+pkDLab(pkSetsuStart(2026,11))+'〜'+pkDLab(pkSetsuEnd(2026,11)));
    if(pkCpKuuMK(m11&&m11.kA,m11&&m11.kB,false)!=='〔本人は空亡〕') e.push('11月の印＝'+pkCpKuuMK(m11&&m11.kA,m11&&m11.kB,false));
    const d8=compatDaysPick(A,B).all.find(o=>o.d.getMonth()===10&&o.d.getDate()===8); if(!d8||!d8.dA||!d8.dB) e.push('11/8 が2人とも空亡の日になっていない');
    const body=G.txt(compatDaysBody(A,B,'2026-11-08','本人','お相手')); if(body.pro.indexOf('〔2人とも空亡の日〕')<0) e.push('日運の欄（11/8）に〔2人とも空亡の日〕がない'); if(body.plain.indexOf('〔2人ともひと休みの日〕')<0) e.push('日運の欄（11/8・やさしい）に〔2人ともひと休みの日〕がない');
    if(!pkKuuBad(A,2031)||pkKuuBad(B,2031)) e.push('2031年＝本人だけの解けない空亡の年になっていない');
    if(pkCpKuu(A,B,2031,false)!=='〔本人は空亡〕'||pkCpKuu(B,A,2031,false)!=='〔お相手は空亡〕') e.push('2031年の印＝'+pkCpKuu(A,B,2031,false)+'／入れかえ '+pkCpKuu(B,A,2031,false));
    const sw=compatMonths(B,A).find(x=>x.y===2026&&x.m===11); if(!sw||sw.kA||!sw.kB||pkCpKuuMK(sw.kA,sw.kB,false)!=='〔お相手は空亡〕') e.push('入れかえたとき11月が〔お相手は空亡〕にならない');
    const S=pkCompatSit(A,B,q,false), lead=S&&S.lead||'';
    if(!/^[^。]*いまの時期（11月6日まで）/.test(lead)||!/11月7日〜12月6日は〔本人は空亡〕の月なので[^。]*避け/.test(lead)||!/次は2027年3月〜4月上旬/.test(lead)) e.push('告白したい相談の1行目：'+lead);
    const S2=pkCompatSit(B,A,q,false), lead2=S2&&S2.lead||''; if(!/11月7日〜12月6日は〔お相手は空亡〕の月なので[^。]*避け/.test(lead2)) e.push('入れかえたときの1行目：'+lead2);
    const SP=pkCompatSit(A,B,q,true), leadP=SP&&SP.lead||''; if(!/〔あなたはひと休みの月〕/.test(leadP)||/空亡|解空/.test(leadP)) e.push('やさしい1行目：'+leadP);
    const g=pkKuuGuard('はい、可能性はあります。\n告白するなら11月がおすすめです。\n11月は告白を避けましょう。\n11月は勉強に向いた月です。',A,B,q,true,false), L=g.text.split('\n');
    if(L[0]!=='はい、可能性はあります。') e.push('安全装置が1行目を変えた：'+L[0]);
    if(!/避け/.test(L[1]||'')||!/〔本人は空亡〕/.test(L[1]||'')||/告白するなら11月がおすすめです/.test(L[1]||'')) e.push('安全装置が「告白するなら11月がおすすめです」を「避ける」の言い方にしていない：'+L[1]);
    if(L[2]!=='11月は告白を避けましょう。') e.push('安全装置が注意の文を変えた：'+L[2]);
    if(L[3]!=='11月は勉強に向いた月です。') e.push('安全装置が勉強の文を変えた：'+L[3]);
    const g0=pkKuuGuard('告白するなら11月がおすすめです。',A,B,q,true,false); if(g0.text.trim()!==lead.trim()) e.push('安全装置：1行目がすすめる空亡の月のとき、通信なしの1行目に置きかえない：'+g0.text);
    const gs=pkKuuGuard('はい。\n告白するなら11月がおすすめです。',A,null,q,false,false); if(!/〔空亡〕/.test(gs.text)||!/避け/.test(gs.text.split('\n')[1]||'')) e.push('安全装置（1人）：'+gs.text.split('\n')[1]);
    const gd=pkKuuGuard('はい。\n11月8日に告白するのがおすすめです。',A,B,q,true,false); if(!/〔2人とも空亡の日〕/.test(gd.text)||!/避け/.test(gd.text)) e.push('安全装置（日）：11月8日が〔2人とも空亡の日〕で避けにならない：'+gd.text.split('\n')[1]);
    const gy=pkKuuGuard('はい。\n2031年に入籍するのがおすすめです。',A,B,'結婚はいつですか',true,false); const W2=[]; if(!/〔本人は空亡〕|解けない空亡の年/.test(gy.text)||!/2032年/.test(gy.text)) e.push('安全装置（年）：2031年の入籍を避ける言い方になっていない：'+gy.text.split('\n').slice(1).join(' '));
    else if(!/〔本人は空亡〕/.test(gy.text)) W2.push('安全装置（年）：2031年の入籍の文は「避ける」の言い方に書きかわるが、〔本人は空亡〕の印が残らない（書きかえで印が消える）：'+gy.text.split('\n').slice(1).join(' '));
    return {e,W2}; });
  await X.ctx.close(); r.W2.forEach(x=>warn('3. '+x)); r=r.e;
  ok('3. 決まった例（2006-06-07 男・時刻不明 × 2008-03-28 14:00 女・恋人・2026-11-05）', r.length===0, r.join(' / '));
}

// ───────────────────────── 4. やさしい言い方に「空亡」「解空」が出ない ─────────────────────────
{ const X=await open(TODAY,page0); await X.p.evaluate(LIB);
  const r=await X.p.evaluate((site)=>{ const G=window.__G, hits=[], soft=[], H=document.documentElement, had=H.classList.contains('bg-on'); H.classList.add('bg-on');
    const BAD=/空亡|解空/, SOFT=/冲|配偶宮|命式|大運|通変星|節入り|節月/;
    const chk=(where,t)=>{ t=String(t||''); const m=t.match(new RegExp('[^\\n。]{0,24}('+BAD.source+')[^\\n。]{0,24}')); if(m) hits.push(where+'：「'+m[1]+'」…'+m[0]); else { const s=t.match(new RegExp('[^\\n。]{0,16}('+SOFT.source+')[^\\n。]{0,16}')); if(s) soft.push(where+'：「'+s[1]+'」…'+s[0]); } };
    let seed=7; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
    const ps=[G.mk(2006,6,7,12,0,'male',true),G.mk(2008,3,28,14,0,'female',false),G.mk(1981,6,10,22,28,'female',false)];
    while(ps.length<16) ps.push(G.mk(1955+Math.floor(rnd()*50),1+Math.floor(rnd()*12),1+Math.floor(rnd()*28),1+Math.floor(rnd()*22),0,rnd()<0.5?'male':'female',rnd()<0.25));
    const QS=['告白したいです。いつがいいですか？','告白したのに返事が来ません','結婚はいつですか？','転職はいつがいいですか？','金運はいつ上がりますか？'];
    ps.forEach((c,i)=>{ const w='人'+i;
      try{ const D=pkDigest(c,true); Object.keys(D).forEach(k=>chk(w+' 鑑定まとめ（'+k+'）',(D[k].v||'')+' '+(D[k].s||''))); }catch(e){}
      try{ const L=loveFourLines(c); if(L){ chk(w+' 恋愛の4項目',L.plain.join('\n')); chk(w+' 縁が動く月の名前',(L.monthLabsP||[]).join('・')); } }catch(e){}
      QS.forEach(q=>{ try{ chk(w+' 通信なしの1行目「'+q+'」',pkOfflineLead(c,q,true)); }catch(e){} try{ const F=pkConsultFocus(c,q); chk(w+' 相談の要点「'+q+'」',(F.plain||[]).join('\n')+'\n'+(F.R.moneyMP||[]).join('・')); }catch(e){} });
      try{ (c.annualFortunes||[]).slice(0,30).forEach(a=>chk(w+' 年の印',pkKuuTag(c,a.year,true))); }catch(e){}
      try{ const ML=monthFortuneList(c,12); ML.forEach(ev=>{ const t=pkKuuGuard('はい。\n'+ev.calYear+'年'+ev.calMonth+'月に告白するのがおすすめです。\n2031年に入籍するのがおすすめです。',c,null,QS[0],false,true).text; chk(w+' 安全装置（1人）',t); }); }catch(e){}
    });
    for(let i=0;i+1<ps.length;i+=2){ const a=ps[i], b=ps[i+1], w='相性'+i+'×'+(i+1);
      QS.forEach(q=>{ try{ const S=pkCompatSit(a,b,q,true); if(S) chk(w+' 相性の答え「'+q+'」',S.lead+'\n'+(S.how||[]).join('\n')+'\n'+(S.why||'')); }catch(e){} });
      try{ chk(w+' 1年の流れ',compatFlowLines(a,b,true).join('\n')); }catch(e){}
      try{ chk(w+' 縁が動く月の欄',G.txt(compatMonthsHTML(a,b)).plain); }catch(e){}
      try{ const P=compatDaysPick(a,b).all.find(o=>o.dA||o.dB)||compatDaysPick(a,b).all[0]; const ds=P.d.getFullYear()+'-'+String(P.d.getMonth()+1).padStart(2,'0')+'-'+String(P.d.getDate()).padStart(2,'0'); chk(w+' 2人の日運の欄',G.txt(compatDaysBody(a,b,ds,'あなた','お相手')).plain); }catch(e){}
      try{ const ys=(a.annualFortunes||[]).map(x=>x.year).slice(0,30); chk(w+' 結婚の年の注意',pkMarryNote([a,b],ys,true)); ys.forEach(y=>chk(w+' 年の印',pkCpKuu(a,b,y,true))); }catch(e){}
      try{ compatMonths(a,b).forEach(x=>{ const t=pkKuuGuard('はい。\n'+x.y+'年'+x.m+'月に告白するのがおすすめです。\n'+x.y+'年'+x.m+'月8日に告白するのがおすすめです。',a,b,QS[0],true,true).text; chk(w+' 安全装置（相性）',t); }); }catch(e){}
    }
    try{ chk('印の説明',pkCpKuuMNote(true)+'\n'+PK_MON_KUU_NOTEP+'\n'+PK_MON_KUU_NOTE_WP+'\n'+[[1,0],[0,1],[1,1]].map(([x,y])=>pkKuuDayLine(pkKuuDayTag(!!x,!!y,true,true),true)+pkCpKuuMK(!!x,!!y,true)).join('\n')+pkKuuDayLine(pkKuuDayTag(true,false,true,false),true)); }catch(e){ hits.push('印の説明が読めない '+e.message); }
    if(!had) H.classList.remove('bg-on');
    return {hits:[...new Set(hits)],soft:[...new Set(soft)]}; },site);
  // ビギナーは実際のやさしい画面（bg-on）も読む
  if(site==='beginner'){ try{ const p=X.p; uiFrom=calls; await p.evaluate(()=>{ try{ localStorage.clear(); }catch(e){} }); await p.reload(); await p.waitForTimeout(2500);
      await p.fill('#f-name','点検'); await p.click('#f-quick'); await p.keyboard.type('20060607 1200'); await p.click('#f-sex button[data-v=male]'); await p.click('#f-go'); await p.waitForTimeout(6000);
      const scr=await p.evaluate(()=>({on:document.documentElement.classList.contains('bg-on'),t:[...document.querySelectorAll('[id^="bg-"]')].filter(e=>!e.closest('details:not([open])')).map(e=>e.innerText).join('\n')}));
      if(!scr.on) r.hits.push('ビギナーの画面が初心者モード（bg-on）になっていない');
      const m=scr.t.match(/[^\n。]{0,24}(空亡|解空)[^\n。]{0,24}/); if(m) r.hits.push('ビギナーのやさしい画面：「'+m[1]+'」…'+m[0]);
      if(!/ひと休み/.test(scr.t)) r.soft.push('ビギナーのやさしい画面（2006-06-07 男）に「ひと休み」の印が見当たらない'); }catch(e){ r.hits.push('ビギナーの画面が開けない '+e.message); } }
  await X.ctx.close();
  const all=r.hits.concat(easyTerm);
  ok('4. やさしい言い方（bg-on・鑑定書のやさしい版）に「空亡」「解空」が出ない', all.length===0, all.length?all.length+'件：\n      '+all.slice(0,12).join('\n      '):'');
  if(r.soft.length) warn('4. やさしい言い方に専門用語らしい言葉 '+r.soft.length+'件（空亡の印と関係ないものも含む・参考）','\n      '+r.soft.slice(0,8).join('\n      '));
}
{ const app=Object.keys(callFrom).filter(k=>!/meishi-sheet/.test(k)).reduce((s,k)=>s+callFrom[k],0)-(uiFrom>=0?Math.min(2,calls-uiFrom):0);   // ビギナーの画面を開いて鑑定する点検（4）の2回は除く   // 鑑定書はアプリのリンクから開くと詳細鑑定を自分で頼む（もとからの動き）ので数えない。返事は空にしてある
  ok('アプリが文章作成を呼ばない（点検は計算だけ）', app===0, 'calls='+calls+' '+JSON.stringify(callFrom)); }
ok('画面のエラーが0件', errs.length===0, errs.slice(0,5).join(' / '));
await b.close(); srv.close();
const ng=R.filter(x=>!x.pass).length;
console.log(ng?`→ 不合格（${ng}件）`+(W.length?`・注意 ${W.length}件`:''):'→ 合格'+(W.length?`（注意 ${W.length}件）`:''));
process.exit(ng?1:0);
