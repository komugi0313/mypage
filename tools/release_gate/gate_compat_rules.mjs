// 発売前の点検（相性の流派の決まり）：元の版（meishiki-original/pro-adapter.js の compatData）と同じ決まりで、
// PRO／ビギナーの相性の判定（compatBalance）が「律音・三合・方合・半会・支合」を1つも落としていないかを、たくさんの組み合わせで確かめる。
// 文章作成は使わない（呼び出し0回）。使い方：node tools/release_gate/gate_compat_rules.mjs <pro|beginner> [組み合わせの数=400]
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..'), site=process.argv[2]||'pro', N=+(process.argv[3]||400);
const dir=site==='pro'?'pro':'beginner', page0=site==='pro'?'app-pro.html':'app-beginner.html';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(0);
await new Promise(r=>srv.on('listening',r)); const port=srv.address().port;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({serviceWorkers:'block'}); let calls=0;
await ctx.route('**/.netlify/functions/**',r=>{ if(/gemini/.test(r.request().url())) calls++; r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}); });
const p=await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}/${page0}`); await p.waitForTimeout(2500);
const res=await p.evaluate((N)=>{
  // 元の版（pro-adapter.js）の表と決まり
  const CP_SANGO=[['申','子','辰'],['亥','卯','未'],['寅','午','戌'],['巳','酉','丑']], FP_HOUGO=[['寅','卯','辰'],['巳','午','未'],['申','酉','戌'],['亥','子','丑']];
  const CP_RIKUGO={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  let seed=20261022; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
  const fails=[], fixed=[[2008,3,28,14,0,false,'female'],[2006,6,7,12,0,true,'male'],[2007,1,17,12,0,true,'male'],[2006,8,19,12,0,true,'male']];
  const mk=(y,m,d,h,mi,tu,sex)=>{ const c=baziCompute({year:y,month:m,day:d,hour:h,minute:mi,sex,tu},0,'none'); return tu?markTimeUnknown(c):c; };   // 時刻不明は画面と同じく時柱を外す
  const people=fixed.map(x=>mk(...x));
  for(let k=0;k<N;k++){ const y=1950+Math.floor(rnd()*60), m=1+Math.floor(rnd()*12), d=1+Math.floor(rnd()*28), tu=rnd()<0.3; people.push(mk(y,m,d,Math.floor(rnd()*24),Math.floor(rnd()*60),tu,rnd()<0.5?'male':'female')); }
  const pairs=[[0,1],[0,2],[0,3]]; for(let k=4;k+1<people.length;k+=2) pairs.push([k,k+1]);
  // 月柱と日柱が同じ干支になる組を、わざと作って確かめる（律音の月×日）
  for(let k=4;k<people.length&&k<44;k++){ const a=people[k]; for(let j=4;j<people.length;j++){ const c=people[j]; if(j!==k&&a.pillars[1].ganzhi===c.pillars[2].ganzhi){ pairs.push([k,j]); break; } } }
  let checked=0, rit=0, ritMD=0, han=0;
  pairs.forEach(([i,j])=>{ const A=people[i], B=people[j]; const R=compatBalance(A,B), it=R.items, has=(kind,where)=>it.some(x=>x.kind.indexOf(kind)===0&&(!where||x.where.indexOf(where)>=0));
    const okA=q=>!(q===3&&A.timeUnknown), okB=q=>!(q===3&&B.timeUnknown), PN=['年柱','月柱','日柱','時柱'], gA=A.pillars.map(x=>x.ganzhi), gB=B.pillars.map(x=>x.ganzhi);
    const tag=A.birth.clock+' × '+B.birth.clock;
    // 律音
    if(gA[2]===gB[2]){ rit++; if(!has('律音（日柱どうし）')) fails.push(tag+'：日柱どうしの律音がない'); } else if(has('律音（日柱どうし）')) fails.push(tag+'：律音でないのに日柱どうしの律音');
    if(gA[1]===gB[2]){ ritMD++; if(!has('律音（あなたの月柱×お相手の日柱）')) fails.push(tag+'：月柱×日柱の律音がない'); }
    if(gA[2]===gB[1]){ ritMD++; if(!has('律音（あなたの日柱×お相手の月柱）')) fails.push(tag+'：日柱×月柱の律音がない'); }
    // 支合（全部の柱どうし）・半会（2支）
    for(let x=0;x<4;x++){ if(!okA(x)) continue; for(let y=0;y<4;y++){ if(!okB(y)) continue; const ba=A.pillars[x].branch, bb=B.pillars[y].branch, w='本人の'+PN[x]+'「'+gA[x]+'」×お相手の'+PN[y]+'「'+gB[y]+'」';
      const kanS=(typeof KANGO!=='undefined')&&KANGO[A.pillars[x].stem]===B.pillars[y].stem;
      if(CP_RIKUGO[ba]===bb&&!has('支合',w)&&!(kanS&&has('天地徳合',w))) fails.push(tag+'：支合がない '+w);
      if(ba!==bb&&CP_SANGO.some(g=>g.includes(ba)&&g.includes(bb))){ han++; if(!has('半合',w)) fails.push(tag+'：半会（半合）がない '+w); } } }
    // 三合・方合（2人で持ち寄ってそろう）
    const abr=A.pillars.map((q,x)=>okA(x)?q.branch:null), bbr=B.pillars.map((q,y)=>okB(y)?q.branch:null);
    [[CP_SANGO,'三合'],[FP_HOUGO,'方合']].forEach(([T,kind])=>T.forEach(g=>{ const inA=g.filter(z=>abr.includes(z)), inB=g.filter(z=>bbr.includes(z)), uni=g.filter(z=>abr.includes(z)||bbr.includes(z));
      if(uni.length===3&&inA.length>=1&&inB.length>=1&&inA.length<3&&inB.length<3&&!it.some(x=>x.kind===kind&&x.where.indexOf(g.join(''))>=0)) fails.push(tag+'：'+kind+'（'+g.join('')+'）がない'); }));
    checked++; });
  return {checked,rit,ritMD,han,fails};
},N);
const ok=res.fails.length===0&&res.rit>=1&&res.ritMD>=1&&calls===0;
console.log(`■ 相性の流派の決まり / ${site}：${res.checked}組を確認（律音 日柱どうし ${res.rit}組・月柱×日柱 ${res.ritMD}組・半会 ${res.han}か所）`);
res.fails.slice(0,10).forEach(f=>console.log('  NG '+f));
console.log(`  → ${ok?'合格':'不合格'}（ちがい ${res.fails.length}件・文章作成の呼び出し ${calls}回）`);
await b.close(); srv.close(); process.exit(ok?0:1);
