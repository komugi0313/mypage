// 発売前の点検（近い日の質問）：「明日連絡してもいい？」に「次は2027年3月〜4月上旬」のような何ヶ月も先の時期だけを答えないか（先生の指示 2026-11-06「明日の話を何ヶ月先なんてありえない。絶対に修正」）
// 通信なしの決まった答え（相性＝pkCompatSit の1行目／1人＝pkOfflineLead）を、今日を固定して確かめる。文章作成は呼ばない。
//   NG：1行目に今日から60日より先の年月だけが出て、聞かれた日（今日・明日・○日）に答えていない／軽い動き（連絡・LINE・誘う）のかわりの日が聞かれた日から14日より先／軽い動きなのに空亡の月を理由に避けている
// 使い方：node tools/release_gate/gate_neardate.mjs <pro|beginner>   今日＝KUU_TODAY（既定 2026-11-06T10:00:00+09:00。2027-01-15・2027-06-01 なども同じく合格すること）
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..'), site=process.argv[2]||'pro';
const dir=site==='pro'?'pro':'beginner', page0=site==='pro'?'app-pro.html':'app-beginner.html';
const TODAYS=(process.env.KUU_TODAY||'2026-11-06T10:00:00+09:00').split(',');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(0);
await new Promise(r=>srv.on('listening',r)); const port=srv.address().port;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
let calls=0, ng=0, okN=0; const errs=[];
const Q=[{cp:1,q:'明日連絡してもいい？',light:1},{cp:1,q:'今日LINEしていい？',light:1},{cp:1,q:'明日告白してもいい？',light:0},{cp:1,q:'来週デートに誘いたい',light:1},{cp:0,q:'明日連絡してもいい？',light:1},{cp:0,q:'明日彼に告白してもいいですか',light:0},{cp:1,q:'11月8日に告白しようと思っています',light:0,only:'2026-11'}];
for(const TODAY of TODAYS){
  const ctx=await b.newContext({serviceWorkers:'block',timezoneId:'Asia/Tokyo'}); await ctx.clock.setFixedTime(new Date(TODAY));
  await ctx.route('**/.netlify/functions/**',r=>{ if(/gemini/.test(r.request().url())) calls++; r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); });
  const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message)); await p.goto(`http://127.0.0.1:${port}/${page0}`); await p.waitForTimeout(2500);
  console.log('■ 近い日の質問の点検（'+site+'・今日 '+TODAY+'）');
  for(const plain of [false,true]){
    const res=await p.evaluate(({Q,plain})=>{ const mk=(y,m,d,h,mi,sex,tu)=>{ const run=()=>baziCompute({year:y,month:m,day:d,hour:h,minute:mi,sex,tu},'','none'); const c=(typeof pkWithOpts==='function'&&typeof pkOptsOf==='function')?pkWithOpts(pkOptsOf({}),run):run(); return tu?markTimeUnknown(c):c; };
      const A=mk(2008,3,28,14,0,'female',false), B=mk(2006,6,7,12,0,'male',true); if(plain) document.documentElement.classList.add('bg-on'); else document.documentElement.classList.remove('bg-on');
      const T0=_jstToday(), J=jstNow(); const out=[];
      Q.forEach(o=>{ if(o.only&&!(J.y+'-'+String(J.m).padStart(2,'0')).startsWith(o.only)) return; let lead=''; try{ lead=o.cp?((pkCompatSit(A,B,o.q,plain)||{}).lead||''):(pkOfflineLead(A,o.q,plain)||''); }catch(e){ lead='ERR '+e.message; }
        const DS=pkDayDates(o.q); const ask=DS.length?DS[0].d:null; const fails=[];
        if(!lead) fails.push('1行目が空');
        // 1行目の年月
        const fst=lead.split(/(?<=[。！？])/)[0]||'';
        let far=false, m; const re=/(?:(20\d\d)年)?(\d{1,2})月(?!\d{0,2}日)/g; while((m=re.exec(fst))){ const M=+m[2]; let y=m[1]?+m[1]:J.y; let d=new Date(y,M-1,1,12); if(!m[1]&&new Date(y,M,0,12)<T0) d=new Date(y+1,M-1,1,12); if(d-T0>60*86400000) far=true; }
        const nearM=DS.some(d=>{ const k=Math.round((d.d-T0)/86400000), r=k===0?'今日':(k===1?'明日':(k===2?'明後日':'')); return new RegExp('(^|[^0-9])'+d.d.getDate()+'日'+(r?'|'+r:'')).test(fst); })||/今日|明日|来週|今週/.test(fst);
        if(!nearM) fails.push('1行目が聞かれた日に答えていない');
        if(far&&!nearM) fails.push('1行目が何ヶ月も先だけ');
        if(o.light){ if(/20\d\d年\d{1,2}月/.test(lead)&&!/本格的/.test(lead)) fails.push('軽い動きに何ヶ月も先の時期');
          const nm=lead.match(/近いところでは(?:[^（]*（)?(?:(20\d\d)年)?(\d{1,2})月(\d{1,2})日/); if(nm&&ask){ let y=nm[1]?+nm[1]:J.y; let d=new Date(y,+nm[2]-1,+nm[3],12); if(!nm[1]&&d<new Date(T0.getTime()-20*86400000)) d=new Date(y+1,+nm[2]-1,+nm[3],12); if(Math.abs(d-ask)>14*86400000) fails.push('かわりの日が14日より先'); }
          if(/〔[^〕]*(?:空亡|ひと休みの月)[^〕]*〕の?(?:月)?(?:の始まり|の中の日)?なので、[^。]*(?:連絡|お誘い|会うこと)は避け/.test(fst)&&!/空亡の日|ひと休みの日|冲|刑|揺れ|行き違い/.test(fst)) fails.push('軽い動きを空亡の月だけで避けた'); }
        out.push({q:(o.cp?'相性：':'1人：')+o.q,lead,fails}); });
      return out; },{Q,plain});
    res.forEach(r=>{ if(r.fails.length){ ng++; console.log('  NG '+(plain?'[やさしい] ':'')+r.q+'  … '+r.fails.join('・')+'｜'+r.lead.slice(0,160)); } else { okN++; console.log('  OK '+(plain?'[やさしい] ':'')+r.q+'  … '+r.lead.slice(0,140)); } });
  }
  await ctx.close(); }
if(calls) { ng++; console.log('  NG 文章作成を呼んだ（'+calls+'回）'); }
if(errs.length){ ng++; console.log('  NG 画面のエラー：'+errs.slice(0,3).join(' / ')); }
console.log(ng?'→ 不合格（NG '+ng+'件・OK '+okN+'件）':'→ 合格（'+okN+'件）');
await b.close(); srv.close(); process.exit(ng?1:0);
