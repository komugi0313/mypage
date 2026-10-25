// 発売前の点検（相性の流派の決まり）：鑑定者本人が伝えた決まり（CLAUDE.md「相性の決まり」・写真の表）どおりに、
// PRO／ビギナーの相性の判定（compatBalance）が「律音・三合・方合・半会・支合」を1つも落としていないかを、たくさんの組み合わせで確かめる。
// あわせて、神殺・合冲の表が鑑定者本人の表（写真 2026-10-23）と1マスずつ同じか（アプリと鑑定書の両方）、恋愛相談の4項目が必ず入るかも確かめる。
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
  // 鑑定者本人の決まり（CLAUDE.md「相性の決まり」・写真の表）
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
      const CEN={子:1,午:1,卯:1,酉:1}, hanOK=ba!==bb&&(CEN[ba]||CEN[bb])&&CP_SANGO.some(g=>g.includes(ba)&&g.includes(bb));   // 半合は子午卯酉を含む2支だけ（鑑定者本人の表＝写真 2026-10-23）
      if(hanOK){ han++; if(!has('半合',w)) fails.push(tag+'：半会（半合）がない '+w); } else if(has('半合',w)) fails.push(tag+'：子午卯酉を含まないのに半合 '+w); } }
    // 三合・方合（2人で持ち寄ってそろう）
    const abr=A.pillars.map((q,x)=>okA(x)?q.branch:null), bbr=B.pillars.map((q,y)=>okB(y)?q.branch:null);
    [[CP_SANGO,'三合'],[FP_HOUGO,'方合']].forEach(([T,kind])=>T.forEach(g=>{ const inA=g.filter(z=>abr.includes(z)), inB=g.filter(z=>bbr.includes(z)), uni=g.filter(z=>abr.includes(z)||bbr.includes(z));
      if(uni.length===3&&inA.length>=1&&inB.length>=1&&inA.length<3&&inB.length<3&&!it.some(x=>x.kind===kind&&x.where.indexOf(g.join(''))>=0)) fails.push(tag+'：'+kind+'（'+g.join('')+'）がない'); }));
    checked++; });
  return {checked,rit,ritMD,han,fails};
},N);
// ── 鑑定者本人の表（写真 2026-10-23）＝正典。アプリ（画面の表）と鑑定書（meishi-sheet.html）の両方を1マスずつ照らし合わせる
const PHOTO={
  NIKKAN:{ 天乙貴人:'丑未 子申 酉亥 酉亥 丑未 子申 丑未 寅午 卯巳 卯巳', 大極貴人:'子午 子午 卯酉 卯酉 丑辰未戌 丑辰未戌 寅亥 寅亥 巳申 巳申', 福星貴人:'子寅 丑亥 子戌 酉 申 未 午 巳 辰 卯',
    文昌貴人:'巳 午 申 酉 申 酉 亥 子 寅 卯', 羊刃:'卯 辰 午 未 午 未 酉 戌 子 丑', 飛刃:'酉 戌 子 丑 子 丑 卯 辰 午 未', 暗禄:'亥 戌 申 未 申 未 巳 辰 寅 丑', 金与禄:'辰 巳 未 申 未 申 戌 亥 丑 寅', 紅艶:'午 申 寅 未 辰 辰 戌 酉 子 申' },
  GETSU:{ 天徳貴人:'巳庚丁申壬辛亥甲癸寅丙乙', 月徳貴人:'壬庚丙甲壬庚丙甲壬庚丙甲', 天徳合:'申乙壬巳丁丙寅己戊亥辛庚', 月徳合:'丁乙辛己丁乙辛己丁乙辛己', 華蓋:'辰丑戌未辰丑戌未辰丑戌未' },
  NICHI:{ 咸池:'酉午卯子酉午卯子酉午卯子', 駅馬:'寅亥申巳寅亥申巳寅亥申巳', 劫殺:'巳寅亥申巳寅亥申巳寅亥申', 亡神:'亥申巳寅亥申巳寅亥申巳寅', 血刃:'戌酉申未午巳辰卯寅丑子亥', 囚獄:'午卯子酉午卯子酉午卯子酉', 隔角:'卯卯午午午酉酉酉子子子卯' },
  KAIGOU:'庚辰 庚戌 壬辰 壬戌 戊戌', ROKUBA:'壬午 癸巳', NICHIJIN:'丙午 戊午 壬子',
  KEI:'卯 未戌 巳申 子 辰 寅申 午 丑戌 寅巳 酉 丑未 亥', CHU:'午未申酉戌亥子丑寅卯辰巳', HA:'酉辰亥午丑申卯戌巳子未寅', GAI:'未午巳辰卯寅丑子亥戌酉申',
  KANGO:'甲己 乙庚 丙辛 丁壬 戊癸', RIKUGO:'子丑 寅亥 卯戌 辰酉 巳申 午未' };
const tableCheck=(T)=>{ const S='甲乙丙丁戊己庚辛壬癸', B='子丑寅卯辰巳午未申酉戌亥', bad=[], srt=x=>[...x].sort().join('');
  try{
    for(const n in PHOTO.NIKKAN){ PHOTO.NIKKAN[n].split(' ').forEach((v,i)=>{ const got=((T.KICHI_NIKKAN[S[i]]||{})[n]||[]).join(''); if(srt(got)!==srt(v)) bad.push(n+'('+S[i]+')='+(got||'なし')+'→'+v); }); }
    for(const n in PHOTO.GETSU){ [...PHOTO.GETSU[n]].forEach((v,i)=>{ const got=(T.KICHI_GETSU[B[i]]||{})[n]; if(got!==v) bad.push(n+'(月支'+B[i]+')='+(got||'なし')+'→'+v); }); }
    for(const n in PHOTO.NICHI){ [...PHOTO.NICHI[n]].forEach((v,i)=>{ const b=B[i]; let got; if(n==='血刃') got=T.BLOOD[b]; else if(n==='隔角') got=T.KAKU[b]; else got=(T.KICHI_NICHI[T.SANGO_KEY[b]]||{})[n]; if(got!==v) bad.push(n+'('+b+')='+(got||'なし')+'→'+v); }); }
    [['KAIGOU','魁罡'],['ROKUBA','禄馬貴人'],['NICHIJIN','日刃']].forEach(([k,nm])=>{ const want=PHOTO[k].split(' '), got=T[k]||[]; if(srt(want.join(''))!==srt(got.join(''))||want.length!==got.length) bad.push(nm+'='+(got.join('・')||'なし')+'→'+want.join('・')); });
  }catch(e){ bad.push('表が読めない '+e.message); }
  return bad; };
// アプリ（画面）の表
const appT=await p.evaluate(()=>{ const set=x=>x instanceof Set?[...x]:Object.keys(x||{}); return { KICHI_NIKKAN, KICHI_GETSU, KICHI_NICHI, SANGO_KEY, BLOOD, KAKU, KAIGOU:set(KAIGOU), ROKUBA:set(ROKUBA), NICHIJIN:(typeof NICHIJIN!=='undefined')?set(NICHIJIN):[],
  KEI:'子丑寅卯辰巳午未申酉戌亥'.split('').map(a=>'子丑寅卯辰巳午未申酉戌亥'.split('').filter(b=>(a!==b&&(isKei2(a,b)||isKei3(a,b)))||(a===b&&JIKEI.has(a))).join('')),
  CHU:'子丑寅卯辰巳午未申酉戌亥'.split('').map(a=>'子丑寅卯辰巳午未申酉戌亥'.split('').find(b=>isChong(a,b))).join(''), HA, GAI, KANGO, RIKUGO }; });
const bad=tableCheck(appT);
{ const B='子丑寅卯辰巳午未申酉戌亥', srt=x=>[...x].sort().join('');
  PHOTO.KEI.split(' ').forEach((v,i)=>{ if(srt(appT.KEI[i])!==srt(v)) bad.push('刑('+B[i]+')='+appT.KEI[i]+'→'+v); });
  [...PHOTO.CHU].forEach((v,i)=>{ if(appT.CHU[i]!==v) bad.push('冲('+B[i]+')='+appT.CHU[i]+'→'+v); });
  [...PHOTO.HA].forEach((v,i)=>{ if(appT.HA[B[i]]!==v) bad.push('破('+B[i]+')='+appT.HA[B[i]]+'→'+v); });
  [...PHOTO.GAI].forEach((v,i)=>{ if(appT.GAI[B[i]]!==v) bad.push('害('+B[i]+')='+appT.GAI[B[i]]+'→'+v); });
  PHOTO.KANGO.split(' ').forEach(x=>{ if(appT.KANGO[x[0]]!==x[1]||appT.KANGO[x[1]]!==x[0]) bad.push('干合 '+x); });
  PHOTO.RIKUGO.split(' ').forEach(x=>{ if(appT.RIKUGO[x[0]]!==x[1]||appT.RIKUGO[x[1]]!==x[0]) bad.push('支合 '+x); }); }
console.log('  '+(bad.length?'NG':'OK')+' 神殺・合冲の表＝鑑定者本人の表（写真）と1マスずつ同じ（アプリ）'+(bad.length?'  … '+bad.slice(0,8).join(' / '):''));
if(bad.length) res.fails.push('アプリの表: '+bad.join(' / '));
// 鑑定書（meishi-sheet.html）の表：ファイルの中の表をそのまま読んで照らし合わせる
{ const src=fs.readFileSync(path.join(ROOT,dir,'meishi-sheet.html'),'utf8'), grab=(name)=>{ const m=new RegExp('var '+name+'=(\\{[\\s\\S]*?\\});').exec(src); if(!m) return null; return Function('return '+m[1])(); };
  const sT={ KICHI_NIKKAN:grab('KICHI_NIKKAN'), KICHI_GETSU:grab('KICHI_GETSU'), KICHI_NICHI:grab('KICHI_NICHI'), SANGO_KEY:grab('SANGO_KEY'), BLOOD:grab('BLOOD'), KAKU:grab('KAKU'), KAIGOU:Object.keys(grab('KAIGOU')||{}), ROKUBA:Object.keys(grab('ROKUBA')||{}), NICHIJIN:Object.keys(grab('NICHIJIN')||{}) };
  const kg2=/var KG2=\{([^}]*)\}/.exec(src); const kgs=kg2?kg2[1].split(',').map(x=>x.split(':')[0].trim()).sort().join(''):'';
  const sb=tableCheck(sT); if(kgs!==PHOTO.KAIGOU.split(' ').sort().join('')) sb.push('命式の特徴の魁罡='+kgs);
  console.log('  '+(sb.length?'NG':'OK')+' 神殺の表＝写真と同じ（鑑定書）'+(sb.length?'  … '+sb.slice(0,8).join(' / '):''));
  if(sb.length) res.fails.push('鑑定書の表: '+sb.join(' / ')); }
// 恋愛相談の4項目（配偶宮の蔵干・パートナーの星が喜神か・出会いの場・縁が動く月）：書いていない文にはツールが書き足す
{ const lv=await p.evaluate(()=>{ if(typeof loveFourLines!=='function'||typeof pkEnsureLove!=='function') return {L:null,t:'',n:''}; const c=baziCompute({year:1981,month:6,day:10,hour:22,minute:28,sex:'female',tu:false},0,'none'); const L=loveFourLines(c); const t=pkEnsureLove('テスト。',c,'この人は遊び人ですか？'), n=pkEnsureLove('テスト。',c,'仕事運は？'), g=pkEnsureLove('2027年3月ごろ（きみずうの月）に出会いが動きます。',c,'彼氏はできますか');
    return { L:L&&L.pro, t, n, g }; });
  const e=[]; const L=lv.L||[];
  if(!/日支「未」/.test(L[0]||'')||!/蔵干（司令）は 丁（偏印）。/.test(L[0]||'')||/乙（偏官）|己（比肩）/.test(L[0]||'')) e.push('配偶宮の蔵干（司令だけ）');   /* 蔵干は司令だけ（鑑定者本人の指示 2026-10-24） */
  if(!/パートナーの星（官星＝五行の「木」）は、あなたの喜神（きしん：あると調子が上がる五行）です/.test(L[1]||'')) e.push('パートナーの星が喜神か');
  if(!/2人の相性とは別の見方/.test(L[1]||'')) e.push('相性とは別の見方の一言');
  if(!/月柱/.test(L[2]||'')||!/仕事/.test(L[2]||'')) e.push('出会いの場');
  if(!/2027年3月ごろ（癸卯の月）/.test(L[3]||'')||/亥の月）＝[^／]*半合/.test(L[3]||'')) e.push('縁が動く月');
  if(!/【恋愛で(必ず見る4つ|大事な4つのこと)】/.test(lv.t)||(lv.t.match(/\n・/g)||[]).length!==4) e.push('書き足し');
  if(lv.n!=='テスト。') e.push('恋愛でない相談に書き足している');
  if(!/2027年3月ごろ（癸卯の月）/.test(lv.g||'')) e.push('月の干支の直し（きみずう→癸卯）');
  if(!/出会いの場：|出会いやすい場所は/.test(lv.g||'')) e.push('「出会い」の言葉だけで出会いの場ありと判定している');
  console.log('  '+(e.length?'NG':'OK')+' 恋愛相談の4項目（1981-06-10 女性で確認）'+(e.length?'  … '+e.join('・'):''));
  if(e.length) res.fails.push('恋愛相談の4項目: '+e.join('・')); }
// 文章を書く側の事実まちがいの直し（十干の陰陽・月支元命の数）
{ const ff=await p.evaluate(()=>typeof pkFactFix==='function'?[pkFactFix('日干は丁（火の陽＝温かさ）'),pkFactFix('月支元命（性格の中心）に「偏印」が3つある'),pkFactFix('正官（せいかん）（行動力と決断力の星）が巡る'),String(pkIsLoveQ('11月にデートに誘われています。好きになる可能性はありますか？'))]:['','','','']);
  const e=[]; if(!/丁（火の陰/.test(ff[0])) e.push('丁＝火の陰'); if(!/月支元命（性格の中心）が「偏印」で、命式全体ではこの星が3つ/.test(ff[1])) e.push('月支元命の数'); if(!/正官（せいかん）（規律・責任・誠実の星）/.test(ff[2])) e.push('正官の説明'); if(ff[3]!=='true') e.push('デートの相談を恋愛と見分ける');
  console.log('  '+(e.length?'NG':'OK')+' 十干の陰陽・月支元命の数の直し'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('事実の直し: '+e.join('・')); }
// 縁が動く月の三合・刑（2008-03-28 14時 女性：11月己亥＝亥卯未の三合〈時支の未〉、12月庚子＝配偶宮卯と刑）
{ const m=await p.evaluate(()=>{ if(typeof loveFourLines!=='function') return ''; const c=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none'); const L=loveFourLines(c); return (L&&L.pro[3]||'')+'|'+pkIsLoveQ('今年の冬に出会う可能性がある男性は？'); });
  const e=[]; if(/己亥の月/.test(m)&&!/己亥の月）＝[^／]*三合（亥卯未/.test(m)) e.push('三合（亥卯未）'); if(/庚子の月/.test(m)&&!/庚子の月）＝配偶宮「卯」と刑/.test(m)) e.push('子卯の刑'); if(!/\|true$/.test(m)) e.push('「出会う」を恋愛相談と見分ける');
  console.log('  '+(e.length?'NG':'OK')+' 縁が動く月の三合・刑'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('縁が動く月: '+e.join('・')); }
{ const mf=await p.evaluate(()=>{ if(typeof pkMonthFactFix!=='function') return ['','']; const c=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none'); return [pkMonthFactFix('12月の星回りには、配偶宮に咸池や正官の気配が重なる。',c),pkMonthFactFix('2027年7月ごろは卯と未で三合になります。',c)]; });
  const e=[]; if(!/12月の星回りには、この月に咸池や偏官/.test(mf[0])) e.push('12月の星（偏官）・配偶宮の取りちがえ'); if(!/卯と未で半合/.test(mf[1])) e.push('三合→半合');
  console.log('  '+(e.length?'NG':'OK')+' 月の話の事実あわせ'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('月の話: '+e.join('・')); }
{ const r=await p.evaluate(()=>{ if(typeof pkEnsureLove!=='function') return ''; const c=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none'); return pkEnsureLove('配偶宮の蔵干は甲と乙。パートナーの星（官星）は忌神です。出会いは地元の紹介から。11月と12月に縁が動きます。',c,'冬に出会う男性は？'); });
  const ok2=/庚子の月）＝配偶宮「卯」と刑|2026年12月ごろ（気持ちがすれ違いやすい月）/.test(r); console.log('  '+(ok2?'OK':'NG')+' 注意の月（刑・冲）が文になければ書き足す'); if(!ok2) res.fails.push('注意の月の書き足し'); }
{ const y=await p.evaluate(()=>{ if(typeof pkYearKichiFix!=='function') return ''; const c=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none'); return pkYearKichiFix('2027年や2028年に天徳貴人（強い守りの星）が巡ります。',c); });
  const ok3=/天徳貴人（強い守りの星）（天徳貴人が巡るのは2028年）/.test(y); console.log('  '+(ok3?'OK':'NG')+' 年の吉凶星の事実あわせ（天徳貴人は2028年だけ）'); if(!ok3) res.fails.push('年の吉凶星'); }
// 3つのツールに同じ直しが入っているか（PRO＝元、易・鑑定書は同じ中身。ビギナーはPROから生成）
{ const grab=(f,name,end)=>{ try{ const t=fs.readFileSync(path.join(ROOT,f),'utf8'); const a=t.indexOf('function '+name+'('); if(a<0) return null; return t.slice(a,t.indexOf(end,a)+end.length); }catch(e){ return null; } };
  const e=[]; [['pkFactFix',"  return t; }catch(e){ return t; } }"],['pkStampYears',"}catch(e){ return String(s).replace(/\\u0003/g,''); } }"]].forEach(([n,end])=>{ const base=grab('pro/app-pro.html',n,end);
    ['eki-pro/app/index.html','pro/meishi-sheet.html','beginner/app-beginner.html'].forEach(f=>{ const g=grab(f,n,end); if(!g||g!==base) e.push(f+' の '+n); }); });
  console.log('  '+(e.length?'NG':'OK')+' 3つのツール（PRO・ビギナー・易）と鑑定書に同じ直しが入っている'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('3つのツールの直し: '+e.join('・')); }
{ const r=await p.evaluate(()=>{ if(typeof pkPillarStarFix!=='function') return ''; const c=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none')); return pkPillarStarFix('日柱に咸池があり、月柱には華蓋（芸術の星）が巡っています。',c); });
  const ok4=/日柱に咸池があり、年柱には華蓋/.test(r); console.log('  '+(ok4?'OK':'NG')+' 柱の星の事実あわせ（華蓋は年柱）'); if(!ok4) res.fails.push('柱の星'); }
// 易：根拠のない星の話（吉凶星・月の星）を外す直し＝PROの柱・月・年の星の事実あわせと同じ目的
{ const src=fs.readFileSync(path.join(ROOT,'eki-pro/app/index.html'),'utf8'); const a=src.indexOf('function ekiStarGuard('); let r='';
  if(a>=0){ const body=src.slice(a,src.indexOf('}catch(e){ return t; } }',a)+'}catch(e){ return t; } }'.length); r=Function(body+'; return ekiStarGuard;')()('来年は良い年です。月柱に華蓋があります。11月は正官が巡ります。パートナーの星はあなたの喜神です。2027年は変化の年です。'); }
  const ok5=r==='来年は良い年です。2027年は変化の年です。';
  { const g=Function(src.slice(a,src.indexOf('}catch(e){ return t; } }',a)+'}catch(e){ return t; } }'.length)+'; return ekiStarGuard;')(); const r2=g('2人は良い縁です。お相手はあなたから見て傷官です。お相手の土はあなたの忌神です。話し合いを大切に。');
    const b2=src.indexOf('function ekiSameSexWord('), ss=Function(src.slice(b2,src.indexOf('}catch(e){ return t; } }',b2)+'}catch(e){ return t; } }'.length)+'; return ekiSameSexWord;')();
    const ok6=r2==='2人は良い縁です。話し合いを大切に。'&&ss('異性として惹かれます','女性同士のカップルです')==='恋愛の相手として惹かれます'&&ss('異性として惹かれます','彼と私')==='異性として惹かれます'&&ss('異性の縁が動きます','男性同士で付き合っています')==='恋愛の縁が動きます';
    console.log('  '+(ok6?'OK':'NG')+' 易：お相手の星・喜神忌神の根拠のない話を外す／同性の相談で男女前提の言い方をしない'); if(!ok6) res.fails.push('易の同性・お相手の星'); } console.log('  '+(ok5?'OK':'NG')+' 易：根拠のない星の話を外す（PROの星の事実あわせと同時に）'); if(!ok5) res.fails.push('易の星の直し'); }
{ const r=await p.evaluate(()=>{ if(typeof pkFactFix!=='function'||typeof pkYearKichiFix!=='function') return ['','']; const c=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none'));
    return [pkFactFix('日干が丁（火の陰・ひのえ）で、日支に卯'), pkYearKichiFix('2027年は紅艶（魅力の星）が巡り、2028年は駅馬（移動の星）が重なります。',c)]; });
  const e=[]; if(!/丁（火の陰・ひのと）/.test(r[0])) e.push('丁の読み'); if(/が巡るのは/.test(r[1])) e.push('正しく書けた年の星に書き添えている');
  console.log('  '+(e.length?'NG':'OK')+' 十干の読みの取りちがえ・年の星の書き添え'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('読み・年の星: '+e.join('・')); }
{ const r=await p.evaluate(()=>typeof pkFactFix==='function'?pkFactFix('木はあなたの喜神です。水は忌神（きじん）（過剰になりやすい五行）です。'):'');
  const ok6=/喜神（きしん：あると調子が上がる五行）/.test(r)&&/忌神（きじん：多いと疲れやすい五行）です/.test(r)&&!/過剰になりやすい/.test(r);
  console.log('  '+(ok6?'OK':'NG')+' 喜神・忌神に読みと意味を添える（3つのツール共通）'); if(!ok6) res.fails.push('喜神・忌神の説明'); }
// 惹かれ合う星（相手の命式に自分の咸池・紅艶・貴人）：彼2006-06-07（時刻不明）×彼女2008-03-28 14時
{ const r=await p.evaluate(()=>{ if(typeof compatBalance!=='function'||typeof crossStars!=='function') return ''; const him=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none')), her=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none');
    return compatBalance(him,her).items.map(x=>x.kind+'|'+x.where).join('\n')+'\n#'+pkEnsureCross('テスト',him,her); });
  const e=[]; if(!/本人の咸池がお相手に\|お相手の年柱「戊子」・月柱「乙卯」・日柱「丁卯」/.test(r)) e.push('咸池（子・卯）'); if(!/本人の紅艶がお相手に\|お相手の時柱「丁未」/.test(r)) e.push('紅艶（未）'); if(!/お相手の月徳貴人が本人に/.test(r)) e.push('月徳貴人');
  if(!/【惹かれ合う星|【2人が惹かれ合うところ】/.test(r)) e.push('鑑定文への書き足し');
  console.log('  '+(e.length?'NG':'OK')+' 相性：惹かれ合う星（相手の命式に自分の咸池・紅艶・貴人）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('惹かれ合う星: '+e.join('・')); }
// 2人の日運を並べて見る（2026-11-03：2人とも駅馬・偏財、彼女=天徳合／彼=月徳貴人、冲・刑なし）
{ const r=await p.evaluate(()=>{ if(typeof compatDaysBody!=='function') return ''; const him=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none')), her=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none');
    return compatDaysBody(her,him,'2026-11-03','さくら','彼'); });
  const e=[]; if(!/11月3日（辛巳の日）/.test(r)) e.push('日の干支'); if(!/日の星：偏財／吉凶星：天徳合・劫殺・駅馬/.test(r)) e.push('彼女の日の星'); if(!/月徳合・亡神・駅馬/.test(r)||/月徳貴人・月徳合・亡神/.test(r)) e.push('彼の日の星')   /* 月徳貴人（丙）は巳の蔵干にあるだけ＝天干だけで見る決まり（2026-10-25）では付かない */; if(!/2人とも駅馬/.test(r)) e.push('2人とも駅馬');
  if(!/class="kd-plain"/.test(r)||/kd-plain[\s\S]*?(偏財|駅馬|天徳|冲|刑)[\s\S]*?<\/div><\/div>$/.test(r.slice(r.indexOf('class="kd-plain"')))) e.push('やさしい言い方に専門用語');
  console.log('  '+(e.length?'NG':'OK')+' 2人の日運を並べて見る'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('2人の日運: '+e.join('・')); }
// 惹かれ方の向き（彼2006-06-07×彼女2008-03-28：彼→彼女＝咸池・紅艶／彼女→彼＝恋愛の星なし）
{ const r=await p.evaluate(()=>{ if(typeof attractionDir!=='function') return ''; const him=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none')), her=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none');
    const ad=attractionDir(her,him,'彼女','彼'); return ad?ad.pro+'|'+pkEnsureCross('テスト',her,him):''; });
  const ok7=/彼女→彼＝恋愛の星なし（助けの星2つ：月徳貴人・大極貴人）／彼→彼女＝恋愛の星2つ（咸池・紅艶）/.test(r)&&/＝彼のほうが異性として惹かれやすい/.test(r)&&/惹かれ方の向き|異性として(?:とても|少し)?惹かれやすい組み合わせ/.test(r.split('|')[1]||'');
  const s7=await p.evaluate(()=>{ const her=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none'); const f=(y,m,d)=>attractionDir(her,markTimeUnknown(baziCompute({year:y,month:m,day:d,hour:12,minute:0,sex:'male',tu:true},0,'none')),'本人','お相手'); return [f(2006,6,7).pro,f(2007,1,17).pro].join('|'); });
  const okS=/お相手のほうが異性として惹かれやすい（強い：咸池と紅艶の両方・日柱にも当たる/.test(s7.split('|')[0])&&/お相手のほうが異性として惹かれやすい（中くらい：咸池だけ・日柱にも当たる/.test(s7.split('|')[1]);
  console.log('  '+(ok7&&okS?'OK':'NG')+' 相性：惹かれ方の向き（強さ：強い／中くらい／弱め）'); if(!(ok7&&okS)) res.fails.push('惹かれ方の向き'); }
// お相手を知るためのチェックポイント（お相手＝2006-06-07 時刻不明：劫財が巡りで多い・配偶宮に咸池・官星なし）
{ const r=await p.evaluate(()=>{ if(typeof checkPoints!=='function') return ''; const him=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none')); const o=checkPoints(him,true); return o.check.map(x=>x.pro).join('\n')+'\n#'+o.check.map(x=>x.plain).join('\n'); });
  const e=[]; if(!/^劫財（/m.test(r)) e.push('劫財'); if(!/配偶宮（日支）に咸池/.test(r)) e.push('配偶宮の咸池'); if(!/官星（正官・偏官）がない/.test(r)) e.push('官星なし');
  if(/(比肩|劫財|食神|傷官|偏財|正財|偏官|正官|偏印|印綬|咸池|配偶宮|官星)/.test(r.split('#')[1]||'')) e.push('やさしい言い方に専門用語');
  console.log('  '+(e.length?'NG':'OK')+' 相性：お相手を知るためのチェックポイント'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('チェックポイント: '+e.join('・')); }
// 縁が動く年（これから3年）：1998-07-10 女性（時刻不明）＝2027年 天乙貴人・配偶宮「午」と支合／2026年 配偶宮と刑
{ const r=await p.evaluate(()=>{ if(typeof loveFourLines!=='function') return ''; const c=markTimeUnknown(baziCompute({year:1998,month:7,day:10,hour:12,minute:0,sex:'female',tu:true},0,'none')); window.chart=c; const L=loveFourLines(c); return L?L.pro[3]:''; });
  const okY=/縁が動く年（これから3年）：2027年（丁未）＝天乙貴人が巡る・配偶宮「午」と支合/.test(r)&&/2026年（丙午）＝配偶宮「午」と刑/.test(r);
  console.log('  '+(okY?'OK':'NG')+' 恋愛相談：縁が動く年（これから3年）'); if(!okY) res.fails.push('縁が動く年'); }
{ const r=await p.evaluate(()=>typeof plainGloss==='function'?plainGloss('惹かれ方は合・律音などで見る'):''); const ok8=/律音（＝干支がまったく同じ組み合わせ）/.test(r)&&!/変化の分岐点/.test(r);
  console.log('  '+(ok8?'OK':'NG')+' 律音の言葉の説明（相性で「変化の分岐点」と出さない）'); if(!ok8) res.fails.push('律音の説明'); }
// 2人の縁が動く月（彼女2008-02-10 10時×彼2008-03-02 時刻不明）：2026年12月＝彼女 半合・彼 支合／2027年7月＝彼の配偶宮 冲・刑
{ const r=await p.evaluate(()=>{ if(typeof compatMonths!=='function') return []; const her=baziCompute({year:2008,month:2,day:10,hour:10,minute:0,sex:'female',tu:false},0,'none'); const him=markTimeUnknown(baziCompute({year:2008,month:3,day:2,hour:12,minute:0,sex:'male',tu:true},0,'none')); return compatMonths(her,him).map(x=>x.y+'-'+x.m+'|'+x.A.g.join('・')+'|'+x.B.g.join('・')+'|'+x.A.w.join('')+'|'+x.B.w.join('')); });
  const f=k=>r.find(x=>x.startsWith(k+'|'))||''; const e=[];
  if(!/配偶宮「辰」と半合\|配偶宮「丑」と支合/.test(f('2026-12'))) e.push('2026年12月');
  if(!/\|\|冲刑$/.test(f('2027-7'))&&!/\|冲刑$/.test(f('2027-7'))) e.push('2027年7月の注意');
  if(!/咸池・配偶宮「辰」と支合\|咸池・紅艶・配偶宮「丑」と半合/.test(f('2027-9'))) e.push('2027年9月');
  console.log('  '+(e.length?'NG':'OK')+' 相性：2人の縁が動く月'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('2人の縁が動く月: '+e.join('・')); }
// 2人の役割と場面（1〜5・鑑定者本人の指示 2026-10-24）：彼女2008-03-28 14時×彼2006-06-07 時刻不明
{ const r=await p.evaluate(()=>{ if(typeof compatRoles!=='function') return null; const her=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none'); const him=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none'));
    const o=compatRoles(her,him); document.getElementById('rel-type').value='work'; const w=compatRoles(her,him); document.getElementById('rel-type').value='love';
    const b70=markTimeUnknown(baziCompute({year:1970,month:5,day:15,hour:12,minute:0,sex:'male',tu:true},0,'none'));
    return {role:o.role.map(x=>x.pro).join('\n'),plain:[...o.role,...o.energy,...o.stars,...o.scene].map(x=>x.plain).join('\n'),energy:o.energy.map(x=>x.pro).join('\n'),scene:o.scene.map(x=>x.pro).join('\n'),work:w.role.map(x=>x.pro).join('\n'),st:compatRoles(her,b70).stars.map(x=>x.pro).join('\n'),an:compatAnalysis(her,him,RELTYPES.love),ens:pkEnsureRoles('x',her,him)}; });
  const e=[]; if(!r) e.push('compatRoles がない'); else {
    if(!/本人から見て、お相手の日干「丁」は比肩＝友だちのように対等な相手/.test(r.role)) e.push('役割（恋人）');
    if(!/比肩＝仲間であり、ライバルでもある相手/.test(r.work)) e.push('役割（仕事）');
    if(!/本人の喜神（きしん：あると調子が上がる五行）をお相手は5つ（木2・火3）、忌神（きじん：多いと疲れやすい五行）を1つ（土1）持つ＝本人はお相手と一緒にいると調子が上がりやすい/.test(r.energy)) e.push('調子（喜神・忌神）');
    if(!/お相手の月柱「辛巳」が本人の駅馬に当たる/.test(r.st)) e.push('駅馬');
    if(!/^日柱どうし＝ふだんの2人の関係：良い（律音）/m.test(r.scene)) e.push('場面（日柱どうしを先に）');
    if(/(比肩|劫財|食神|傷官|偏財|正財|偏官|正官|偏印|印綬|喜神|忌神|駅馬|文昌|律音|支合|冲|日柱|月柱|年柱)/.test(r.plain)) e.push('やさしい言い方に専門用語');
    if(!/【2人の役割と場面＝ツールの判定/.test(r.an)) e.push('鑑定文への渡し');
    if(!/【2人の役割と(場面|、一緒にいるとき)/.test(r.ens)) e.push('書き足し');   /* ビギナーのやさしい画面は【2人の役割と、一緒にいるとき】 */ }
  console.log('  '+(e.length?'NG':'OK')+' 相性：2人の役割と場面（役割・親子・調子・文昌貴人と駅馬・柱どうしの場面）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('2人の役割と場面: '+e.join('・')); }
// 鑑定文に深みを出す（鑑定者本人の承認 2026-10-25「②」）：この2人だけの材料を渡す・読みが無ければ足す・書き足しは箇条書きにせず関係する見出しの中へ
{ const r=await p.evaluate(()=>{ if(typeof compatWeave!=='function'||typeof pkEnsureWeave!=='function') return null; const her=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none'); const him=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none'));
    const t='2人は良い縁です。\n\n【惹かれ合うところ】\nよく似ています。\n\n【ぶつかりやすいところ】\n言い方に注意。\n\n【長続きのコツ】\n話しましょう。';
    return {ln:compatWeaveLines(her,him),w:pkEnsureWeave(t,her,him),w2:pkEnsureWeave('【この2人だけの読み】\nもう書いてある。\n\n【惹かれ合うところ】\nx',her,him),ask:pkEnsureWeave('質問への答えです。',her,him),c:pkEnsureCross(t,her,him),r:pkEnsureRoles(t,her,him)}; });
  const e=[]; if(!r) e.push('関数がない'); else {
    if(!/【この2人だけの材料/.test(r.ln)||!/良い点「律音（日柱どうし）」/.test(r.ln)||!/役割：/.test(r.ln)||!/調子：/.test(r.ln)) e.push('材料');
    if(!/^2人は良い縁です。\n\n【この2人だけの読み】\nまず、/.test(r.w)) e.push('読みの書き足し（1行目のあと）');
    if((r.w2.match(/【この2人だけの読み】/g)||[]).length!==1||r.ask!=='質問への答えです。') e.push('二重・質問への答えに足さない');
    if(!/【惹かれ合うところ】\nよく似ています。\n\n【(?:惹かれ合う星|2人が惹かれ合うところ)[^\n]*\n[^・\n][^\n]*\n\n【ぶつかりやすいところ】/.test(r.c)) e.push('惹かれ合う星を見出しの中へ文章で');
    if(!/【ぶつかりやすいところ】\n言い方に注意。\n\n【2人の役割と(?:場面|、一緒にいるとき)[^\n]*\n[^・\n][^\n]*\n\n【長続きのコツ】/.test(r.r)) e.push('役割と場面を見出しの中へ文章で'); }
  console.log('  '+(e.length?'NG':'OK')+' 相性：鑑定文に深み（この2人だけの材料・読み・書き足しを文章で）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('鑑定文に深み: '+e.join('・')); }
{ const r=await p.evaluate(()=>typeof pkFixAge==='function'&&typeof pkStampYears==='function'?pkStampYears(pkFixAge('2029年（己酉（つちのととり）の年（35歳ごろ））は動きます。',1990,1990),1990,1990):'');
  const ok=/39歳/.test(r)&&!/35歳/.test(r); console.log('  '+(ok?'OK':'NG')+' 重なったかっこの年齢（2029年（己酉（よみ）の年（35歳ごろ））も計算し直す）'); if(!ok) res.fails.push('重なったかっこの年齢: '+r); }
{ const r=await p.evaluate(()=>{ if(typeof formatReading!=='function'||typeof pkFactFix!=='function') return ''; const d=document.createElement('div'); d.innerHTML=formatReading('天干どうしが引き合う**干合**（かんごう：干どうしが結びつく）が成り立ちます。'); return d.textContent+'|'+pkFactFix('ふたの関係が動き、鍋のふたの色。','',''); });
  const ok=/干合（かんごう：干どうしが結びつく）/.test(r)&&!/（＝干どうし/.test(r)&&/ふたりの関係が動き、鍋のふたの色/.test(r); console.log('  '+(ok?'OK':'NG')+' 太字の用語に読みを2つ付けない・「ふたの関係」を「ふたりの関係」に'); if(!ok) res.fails.push('読みの重なり・ふたり: '+r); }
{ const r=await p.evaluate(()=>{ if(typeof pkFixAge!=='function') return ''; window.personNameB='翔'; const o=pkFixAge('2031年（辛亥・本人23歳／お相手26歳）辛亥（かのとい・健太さん20歳／翔さん21歳）の年。2027年1月ごろ（健太さん40歳／翔さん30歳ごろ）。2028年（翔さん40歳・健太さん43歳）。2030年に母が70歳（2030年）。',1985,1988); window.personNameB=''; return o; });
  const ok=/2027年1月ごろ（健太さん42歳／翔さん39歳ごろ）/.test(r)&&/辛亥（かのとい・健太さん46歳／翔さん43歳）/.test(r)&&/翔さん40歳・健太さん43歳/.test(r)&&/母が70歳/.test(r); console.log('  '+(ok?'OK':'NG')+' 月のあと・名前つきの2人の年齢も計算し直す（家族の年齢は変えない）'); if(!ok) res.fails.push('名前つきの2人の年齢: '+r); }
// 2人の支合・半合に年運・大運が加わって三合・方合がそろう時期（鑑定者本人の指示 2026-10-25「必ず出現させてください」）：彼女2008-03-28 14時×彼2006-06-07 時刻不明
{ const r=await p.evaluate(()=>{ if(typeof compatTrioLines!=='function') return null; const her=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none'), him=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none'));
    const L=compatTrioLines(her,him), d=document.createElement('div'); d.innerHTML=compatSummaryHTML(her,him,RELTYPES.love);
    return {pro:L.pro.join('\n'),plain:L.plain.join('\n'),ens:pkEnsureTrio('結論。\n\n【惹かれ合うところ】\nx\n\n【縁が深まる時期】\n2027年。\n\n【長続きのコツ】\ny',her,him,''),ok2:pkEnsureTrio('結論。\n\n【惹かれ合うところ】\nx\n\n【縁が深まる時期】\n2031年と2043年は三合、2045〜の大運も三合（2031年・2045年）、2037年と2049年は方合（2037年）、2034年は寅午戌の三合。\n\n【長続きのコツ】\ny',her,him,''),sum:d.innerHTML,sec:compatTrioHTML(her,him)}; });
  const e=[]; if(!r) e.push('関数がない'); else {
    if(!/本人の時柱「未」×お相手の日柱「卯」の半合[^\n]*?に「亥」が巡ると、亥卯未の三合（木）がそろう[^\n]*年運＝2031年（辛亥・本人23歳／お相手25歳）/.test(r.pro)) e.push('半合＋年運で三合');
    if(!/本人の命式の中の日柱「卯」×時柱「未」の半合/.test(r.pro)||(r.pro.match(/亥卯未の三合/g)||[]).length!==1) e.push('1人の命式の中の半合（同じ三合は1つにまとめる）');
    if(!/お相手の命式の中の年柱「戌」×月柱「午」の半合に「寅」が巡ると、寅午戌の三合（火）[^\n]*2034年（甲寅/.test(r.pro)) e.push('お相手の命式の中の半合＋年運で三合');
    if(!/お相手の大運「己亥」＝2056年（お相手50歳）から10年間/.test(r.pro)||!/本人の大運「辛亥」/.test(r.pro)) e.push('大運で三合');
    if(!/本人の時柱「未」×お相手の月柱「午」の支合に「巳」が巡ると、巳午未の方合（火）がそろう[^\n]*2037年（丁巳/.test(r.pro)) e.push('支合＋年運で方合');
    if(/(三合|方合|半合|支合|大運|柱|亥|巳)/.test(r.plain)) e.push('やさしい言い方に専門用語');
    if(!/【縁が深まる時期】\n2027年。\n\n【(?:2人の合が三合・方合になる時期|2人の結びつきが強まる時期)】\n[^・\n]/.test(r.ens)) e.push('書き足し（時期の見出しの中へ）');
    if(/【(?:2人の合が三合・方合になる時期|2人の結びつきが強まる時期)】/.test(r.ok2)) e.push('書いてあるのに書き足している');
    if(!/三合・方合になる時期<\/b>：2031年/.test(r.sum)||!/id="tr-sec"/.test(r.sec)) e.push('まとめ・欄'); }
  console.log('  '+(e.length?'NG':'OK')+' 相性：2人の支合・半合が年運・大運で三合・方合になる時期'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('三合・方合になる時期: '+e.join('・')); }
// ③ 根拠のチェック表（鑑定者本人の指示 2026-10-25）：事実なら残す・作り話（どこにも成り立たない）だけ外す・同じ文に事実があれば外さない
{ const r=await p.evaluate(()=>{ if(typeof pkEvidence!=='function') return null; const her=baziCompute({year:2008,month:3,day:28,hour:14,minute:0,sex:'female',tu:false},0,'none'), him=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},0,'none'));
    const full=['2人の日柱は律音です。','本人の時柱「未」とお相手の日柱「卯」が半合です。','2031年（辛亥）には亥卯未の三合がそろいます。','2028年には亥卯未の三合がそろいます。','2029年（己酉）は配偶宮に酉が巡り、お相手の日支である卯と冲になります。','未来に向けて、子どもの話もしましょう。','冲はありません。'].join('\n');
    const ev=pkEvidence('2029年（35歳）に動きます。',full,her,him);
    const k=baziCompute({year:2000,month:1,day:11,hour:12,minute:0,sex:'male',tu:false},0,'none');   /* 日柱 戊辰 */
    const e2=pkEvidence('','日柱は'+k.pillars[2].ganzhi+'で魁罡を持ちます。\n日柱は'+k.pillars[2].ganzhi+'で魁罡と禄馬貴人を持ちます。',k,null);
    return {rows:ev.rows.map(x=>x.st+'|'+x.what).join('\n'),text:ev.text,gz:k.pillars[2].ganzhi,r2:e2.rows.map(x=>x.st+'|'+x.what).join('\n'),t2:e2.text,html:pkEvidenceHTML(ev)}; });
  const e=[]; if(!r) e.push('関数がない'); else {
    if(!/^fix\|2029年（35歳）/m.test(r.rows)) e.push('年齢の直しを記録');
    if(!/^ok\|律音/m.test(r.rows)||!/^ok\|半合「未卯」/m.test(r.rows)||!/^ok\|三合（2031年）/m.test(r.rows)||!/^ok\|冲（2029年）/m.test(r.rows)) e.push('事実を計算どおりと判定');
    if(!/^warn\|三合（2028年）/m.test(r.rows)) e.push('年ちがいは確かめてほしい');
    if(/未来|子ども/.test(r.rows)||/冲はありません/.test(r.rows)) e.push('ふつうの言葉・打ち消しを数えている');
    if(r.text.split('\n').length!==7) e.push('事実の文を外している');
    if(r.gz!=='戊辰'||!/^drop\|魁罡/m.test(r.r2)||/魁罡を持ちます。\n/.test(r.t2)) e.push('戊辰の魁罡（作り話）を外す');
    if(!/no-print/.test(r.html)||!/先生の画面だけ/.test(r.html)) e.push('表（先生の画面だけ・印刷しない）'); }
  console.log('  '+(e.length?'NG':'OK')+' ③ 根拠のチェック表（事実は残す・作り話だけ外す）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('根拠のチェック表: '+e.join('・')); }
// 相談の要点（鑑定者本人の指示 2026-10-25「これをきちんとツールで出るようにしてください」）：2008-02-15 15時 女性・留学と母の反対と適職
{ const r=await p.evaluate(()=>{ if(typeof pkConsultFocusText!=='function') return null; const c=baziCompute({year:2008,month:2,day:15,hour:15,minute:0,sex:'female',tu:false},0,'none'); window.chart=c; const w='来年アメリカに留学しようか悩んでいます。母が反対しています。どちらがいいですか。適職も教えて。';
    return {f:pkConsultFocusText(c,w), e:pkEnsureConsult('日本に留まるほうがおすすめです。',c,w), ok:pkEnsureConsult('留学するほうが命式に合っています。2027年は空亡なので準備、2028年から。駅馬があります。印星が母。適職は食神・傷官を生かす仕事。',c,w)}; });
  const e=[]; if(!r) e.push('関数がない'); else {
    if(!/今の大運＝壬子（印綬＝印・水＝忌神）/.test(r.f)) e.push('今の大運と喜忌');
    if(!/2027年（丁未・19歳）＝[^\n]*空亡の年/.test(r.f)) e.push('来年が空亡');
    if(!/命式の駅馬＝月柱「寅」/.test(r.f)||!/2028年（戊申）＝命式の駅馬が冲される/.test(r.f)) e.push('駅馬と冲の年');
    if(!/答えの方向（ツールの判定・1行目はこれに合わせる）：出る（留学・移動する）ほうが命式に合う。2027年は空亡の年なので準備・短期で試す年にし、本格的に動くのは2028年（戊申・20歳）から/.test(r.f)) e.push('答えの方向');
    if(!/母＝印星（印綬・偏印）＝水＝忌神/.test(r.f)||!/今の大運が印星/.test(r.f)) e.push('六親（母＝印星）');
    if(!/適職の手がかり：喜神の星＝食傷（火）/.test(r.f)||!/月柱（仕事・職場・暮らしの環境）と冲・刑/.test(r.f)) e.push('適職・柱の場面');
    if(!/命式からの答えの方向：出る|遠くへ出るほうが合って/.test(r.e)||!/2027年は空亡の年|2027年は、新しく大きく始めることが形になりにくい/.test(r.e)) e.push('書き足し（判定と逆の答え・空亡）');   /* ビギナーのやさしい画面は専門用語なしの言い方 */
    if(/【この相談で大事なこと】/.test(r.e)&&/(空亡|駅馬|印星|大運)/.test(r.e.split('【この相談で大事なこと】')[1])) e.push('やさしい言い方に専門用語');
    if(/【この相談でツールが確かめたこと】/.test(r.ok)) e.push('書いてあるのに書き足している'); }
  { const t=await p.evaluate(()=>{ const c=baziCompute({year:2001,month:2,day:9,hour:16,minute:0,sex:'female',tu:false},0,'none'); return pkConsultFocusText(c,'彼氏がいるけど他に好きな人ができた'); });   /* 中和（喜神・忌神なし）でも空にしない */
    if(/喜神（[^）]*）＝／|忌神（[^）]*）＝$/m.test(t)||!/はっきりした喜神/.test(t)) e.push('中和の喜神・忌神が空'); }
  console.log('  '+(e.length?'NG':'OK')+' 相談の要点（大運・4年の年運・空亡・駅馬・六親・適職・答えの方向）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('相談の要点: '+e.join('・')); }
// 相談文に出てくるお相手の相性（鑑定者本人の指示 2026-10-25「これをツールで出るようにしてください」）：2001-02-09 16時 女性・今の彼 2000-03-20・好きな人 1995-04-04 16時
{ const r=await p.evaluate(()=>{ if(typeof pkConsultPeopleText!=='function') return null; const c=baziCompute({year:2001,month:2,day:9,hour:16,minute:0,sex:'female',tu:false},0,'none'); window.chart=c;
    const q='彼氏がいるけど他に好きな人が出来てしまって悩んでる。彼は２０００年３月２０日、好きな人は１９９５年４月４日16時生まれ男性';
    return {t:pkConsultPeopleText(c,q), e:pkEnsurePeople('どちらも良い人です。',c,q), ok:pkEnsurePeople('くらべると、今の彼とは方合で土台が安定、好きな人とは天地徳合で惹かれ合う。',c,q), n:pkConsultPeopleText(c,'彼氏のことで悩んでいます')}; });
  const e=[]; if(!r) e.push('関数がない'); else {
    if(!/【お相手：今の彼（2000年3月20日（時刻不明）・男性）】判定＝良い点が注意点を上回る組み合わせ（良い点6／注意点2）/.test(r.t)) e.push('今の彼（時刻不明）');
    if(!/【お相手：好きな人（1995年4月4日 16時・男性）】判定＝良い点が注意点を上回る組み合わせ（良い点12.5／注意点5）/.test(r.t)||!/天地徳合（本人の月柱「庚寅」×お相手の年柱「乙亥」）/.test(r.t)) e.push('好きな人（16時）');
    if(!/暮らしの土台（方合・三合・支合など）が強いのは 今の彼／惹かれ合い（恋愛の星）が強いのは 好きな人/.test(r.t)||!/2026年12月・2027年9月は注意の月/.test(r.t)) e.push('くらべた結果・決める時期');
    if(!/【お相手ごとの相性/.test(r.e)||/【お相手ごとの相性/.test(r.ok)) e.push('書き足し');
    if(r.n) e.push('生年月日のない相談に出している');
    const ev=await p.evaluate(()=>{ const c=baziCompute({year:2001,month:2,day:9,hour:16,minute:0,sex:'female',tu:false},0,'none'); const ex=pkConsultPeople(c,'彼氏がいる。彼は2000年3月20日、好きな人は1995年4月4日16時生まれ男性').map(x=>x.c); return pkEvidence('','2027年（丁未）は好きな人との三合の巡りで縁が動きます。',c,null,ex).rows.map(r=>r.st).join(','); });
    if(ev!=='ok') e.push('根拠のチェック表に相談のお相手が入っていない（'+ev+'）'); }
  console.log('  '+(e.length?'NG':'OK')+' 相談文に出てくるお相手の相性（2人をくらべる）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('相談のお相手: '+e.join('・')); }
// 同性カップル（鑑定者本人の指示 2026-10-24）：女性同士 1990-03-03×1990-02-02＝パートナーの星はお相手の性別（女性＝財星）・「異性」と書かない／男女は今までどおり
{ const r=await p.evaluate(()=>{ if(typeof pkSameSexWord!=='function') return null; const mk=(y,m,d,sex)=>markTimeUnknown(baziCompute({year:y,month:m,day:d,hour:12,minute:0,sex,tu:true},0,'none'));
    const A=mk(1990,3,3,'female'), B=mk(1990,2,2,'female'), M=mk(1990,3,3,'male'), F=mk(1981,6,10,'female'), G=mk(1983,5,5,'male'); window.chart=A; window.chartB=B;
    const cm=compatMonths(A,B), an=compatAnalysis(A,B,RELTYPES.love), en=pkSameSexWord(pkEnsureCross('x',A,B),A,B);
    window.chart=F; window.chartB=G; const fg=compatMonths(F,G).map(x=>x.A.g.join('・')).join('|'), hk=pkSameSexWord(attractionDir(F,G,'本人','お相手')?.pro||'異性',F,G);
    return {dec:cm.map(x=>x.y+'-'+x.m+'|'+x.A.g.join('・')+'|'+x.B.g.join('・')).join('\n'),an:an,en:en,fg:fg,hk:hk,mm:compatMonths(M,B).map(x=>x.A.g.join('・')).join('|'),mm2:(()=>{ const X=mk(1985,7,12,'male'), Y=mk(1988,11,5,'male'); window.chart=X; window.chartB=Y; const g=compatMonths(X,Y).map(x=>x.A.g.concat(x.B.g).join('・')).join('|'), an2=compatAnalysis(X,Y,RELTYPES.love), en2=pkSameSexWord(pkEnsureCross('x',X,Y)+(attractionDir(X,Y,'本人','お相手')||{}).pro,X,Y);
      if(/正財|偏財/.test(g)) return 'パートナーの星が財星になった'; if(!/正官|偏官/.test(g)) return 'パートナーの星（官星）が出ない'; if(!/【同性のカップル（男性同士）＝厳守】/.test(an2)) return '鑑定文への決まり'; if(/異性/.test(an2+en2)) return '「異性」と書いている'; return 'ok'; })()}; });
  const e=[]; if(!r) e.push('pkSameSexWord がない'); else {
    if(!/^2026-12\|パートナーの星（正財）・咸池\|月の十二支にパートナーの星（正財）$/m.test(r.dec)) e.push('女性同士のパートナーの星（財星）');
    if(/異性/.test(r.an)||/異性/.test(r.en)) e.push('同性で「異性」と書いている');
    if(!/【同性のカップル（女性同士）＝厳守】/.test(r.an)) e.push('鑑定文への同性の決まり');
    if(/正財|偏財/.test(r.fg)) e.push('男女：女性の本人のパートナーの星が財星になった');
    if(!/正財|偏財/.test(r.mm)) e.push('男性×女性：パートナーの星（財星）');
    if(/異性/.test(r.hk)===false&&/恋愛の相手として/.test(r.hk)) e.push('男女で言い方を変えてしまった');
    if(!/^ok/.test(r.mm2||'')) e.push('男性同士：'+(r.mm2||'')); }
  console.log('  '+(e.length?'NG':'OK')+' 相性：同性カップル（パートナーの星＝お相手の性別・男女前提の言い方をしない）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('同性カップル: '+e.join('・')); }
// 読みの言い直し・「お互いに惹かれ合う」の直し（2026-10-24 同性カップルの鑑定文で見つかったもの）
{ const r=await p.evaluate(()=>{ if(typeof pkFixMutual!=='function') return null; const mk=(y,m,d,sex)=>markTimeUnknown(baziCompute({year:y,month:m,day:d,hour:12,minute:0,sex,tu:true},0,'none'));
    const A=mk(1990,3,3,'female'), B=mk(1990,2,2,'female'); return [window.pkFixYomi('本人が壬（みずのと、ではなく、みずのえ）で'), pkFixMutual('お互いに心から惹かれ合い、支え合える。',A,B)]; });
  const e=[]; if(!r) e.push('pkFixMutual がない'); else { if(r[0]!=='本人が壬（みずのえ）で') e.push('読みの言い直し：'+r[0]); if(r[1]!=='心から引き合い、支え合える。') e.push('お互いに惹かれ合う：'+r[1]); }
  console.log('  '+(e.length?'NG':'OK')+' 読みの言い直し／片方だけ恋愛の星のとき「お互いに惹かれ合う」と書かない'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('読み・お互いに: '+e.join('・')); }
// 惹かれ合う星の点数は1方向の合計1点まで（鑑定者本人の指示 2026-10-24）
{ const r=await p.evaluate(()=>{ let seed=11, over=[], n=0; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
    for(let i=0;i<300;i++){ const mk=()=>baziCompute({year:1960+Math.floor(rnd()*45),month:1+Math.floor(rnd()*12),day:1+Math.floor(rnd()*28),hour:Math.floor(rnd()*24),minute:0,sex:rnd()<0.5?'male':'female',tu:false},0,'none'); const A=mk(), B=mk();
      const it=compatBalance(A,B).items; ['本人の','お相手の'].forEach(pre=>{ const sm=it.filter(x=>x.kind.indexOf(pre)===0&&/が(?:お相手|本人)に$/.test(x.kind)).reduce((t,x)=>t+x.w,0); if(sm>0) n++; if(sm>1.001) over.push(A.birth.clock+'×'+B.birth.clock+' '+pre+sm); }); }
    return {n,over}; });
  const ok9=r.n>50&&r.over.length===0; console.log('  '+(ok9?'OK':'NG')+' 惹かれ合う星の点数は1方向1点まで（'+r.n+'方向を確認）'+(ok9?'':'  … '+r.over.slice(0,3).join(' / '))); if(!ok9) res.fails.push('惹かれ合う星の上限'); }
// 大人×未成年（18歳未満）の恋愛は鑑定しない（鑑定者本人の指示 2026-10-24）：相性の判定と相談文の両方。PROと易で同じ中身
{ const r=await p.evaluate(()=>{ if(typeof pkMinorLoveBlock!=='function'||typeof pkMinorLoveQ!=='function') return null; const mk=(y,m,d,sex)=>markTimeUnknown(baziCompute({year:y,month:m,day:d,hour:12,minute:0,sex,tu:true},0,'none'));
    const M=mk(1980,3,8,'male'), F=mk(2009,4,5,'female'), G=mk(2010,1,1,'male'), A=mk(1990,3,3,'female');
    return {love:!!pkMinorLoveBlock(M,F,RELTYPES.love), married:!!pkMinorLoveBlock(F,M,RELTYPES.married), work:!!pkMinorLoveBlock(M,F,RELTYPES.work), family:!!pkMinorLoveBlock(M,F,RELTYPES.family), teens:!!pkMinorLoveBlock(F,G,RELTYPES.love), adults:!!pkMinorLoveBlock(M,A,RELTYPES.love),
      q1:pkMinorLoveQ('１９８０年３月８日生まれの男性　好きな子がいます　相手の生年月日が２００９年４月５日女性です　告白していいか？',null), q2:pkMinorLoveQ('5歳の子どもが好きな食べ物は？',35), q3:pkMinorLoveQ('高校生のときに付き合った人と再会した',40), dk:dangerKind('17歳の女の子に告白したい')}; });
  const e=[]; if(!r) e.push('仕組みがない'); else { if(!r.love||!r.married) e.push('恋愛の相性を止めていない'); if(r.work||r.family) e.push('仕事・家族まで止めた'); if(r.teens) e.push('未成年どうしを止めた'); if(r.adults) e.push('大人どうしを止めた'); if(!r.q1) e.push('相談文（全角の生年月日）'); if(r.q2||r.q3) e.push('止めなくてよい相談を止めた'); }
  const src=fs.readFileSync(path.join(ROOT,'eki-pro/app/index.html'),'utf8'), mine=fs.readFileSync(path.join(ROOT,dir,page0),'utf8'), cut=t=>{ const a=t.indexOf('var PK_MINOR_MSG='), b=t.indexOf('}catch(e){ return false; } }',a); return a<0||b<0?null:t.slice(a,b); };
  if(!cut(src)||cut(src)!==cut(mine)) e.push('易と同じ中身になっていない');
  if(!/if\(k==='minor'\)/.test(src)||!/pkMinorLoveQ\(q,ekiSelfAge\(\)\)/.test(src)) e.push('易で止めていない');
  console.log('  '+(e.length?'NG':'OK')+' 大人×未成年の恋愛は鑑定しない（相性・相談文・易）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('未成年: '+e.join('・')); }
// 「盗んでしまった」など、してしまったことの相談は運勢で判断しない（鑑定者本人の指示 2026-10-24）。PROと易で同じ中身
{ const r=await p.evaluate(()=>typeof pkConfessQ!=='function'?null:[dangerKind('アルバイト先で窃盗してしまった　どうしたらいいか'),dangerKind('万引きしてしまいました'),dangerKind('財布を盗まれました。犯人は見つかりますか'),dangerKind('会社でお金を横領された')]);
  const e=[]; if(!r) e.push('仕組みがない'); else { if(r[0]!=='confess'||r[1]!=='confess') e.push('してしまった相談を止めていない'); if(r[2]||r[3]) e.push('被害の相談を止めた'); }
  const src=fs.readFileSync(path.join(ROOT,'eki-pro/app/index.html'),'utf8'), mine=fs.readFileSync(path.join(ROOT,dir,page0),'utf8'), cut=t=>{ const a=t.indexOf('var PK_CONFESS_MSG='), b=t.indexOf('}catch(e){ return false; } }',a); return a<0||b<0?null:t.slice(a,b); };
  if(!cut(src)||cut(src)!==cut(mine)) e.push('易と同じ中身になっていない'); if(!/pkConfessQ\(q\)\) return \{block:'confess'\}/.test(src)) e.push('易で止めていない');
  console.log('  '+(e.length?'NG':'OK')+' してしまったことの相談は運勢で判断しない（PRO・ビギナー・易）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('してしまった相談: '+e.join('・')); }
// 蔵干は司令だけ（鑑定者本人の指示 2026-10-24）：恋愛の配偶宮の蔵干・チェックポイントが司令の1つだけを使う
{ const r=await p.evaluate(()=>{ let seed=5, bad=[]; const rnd=()=>{ seed=(seed*1103515245+12345)%2147483648; return seed/2147483648; };
    for(let i=0;i<60;i++){ const c=baziCompute({year:1960+Math.floor(rnd()*45),month:1+Math.floor(rnd()*12),day:1+Math.floor(rnd()*28),hour:Math.floor(rnd()*24),minute:0,sex:rnd()<0.5?'male':'female',tu:false},0,'none'); window.chart=c;
      const L=loveFourLines(c), m=(L&&L.pro[0]||'').match(/蔵干（司令）は ([^。]*)。/), rep=repHidden(c.pillars[2]);
      if(!m||m[1]!==rep.stem+'（'+(rep.tenStar||tenStarOf(c.dayMaster.stem,rep.stem))+'）') bad.push(c.birth.clock+' '+(m?m[1]:'なし')); }
    return bad; });
  const okZ=r.length===0; console.log('  '+(okZ?'OK':'NG')+' 蔵干は司令だけ（恋愛の配偶宮の蔵干・60人）'+(okZ?'':'  … '+r.slice(0,3).join(' / '))); if(!okZ) res.fails.push('蔵干は司令だけ'); }
// かっこの中の年にも干支・年齢を付ける（2026-10-24「（2026年内・2027年）」で見つかったもの）。PRO・易・鑑定書で同じ中身
{ const r=await p.evaluate(()=>typeof pkStampYears!=='function'?'':pkStampYears('関係を育てる時期です（2026年内・2027年）。',1985,0,false));
  const okB=r==='関係を育てる時期です（2026年〔丙午・41歳〕内・2027年〔丁未・42歳〕）。'||r==='関係を育てる時期です（2026年〔41歳〕内・2027年〔42歳〕）。';   /* ビギナーのやさしい表示は干支なし */ console.log('  '+(okB?'OK':'NG')+' かっこの中の年にも干支・年齢を付ける'+(okB?'':'  … '+r)); if(!okB) res.fails.push('かっこの中の年'); }
// 先生が選んだ蔵干は本人だけに使い、お相手は司令のまま（2026-10-24）
{ const r=await p.evaluate(()=>{ const A=baziCompute({year:2007,month:9,day:18,hour:13,minute:30,sex:'female',tu:false},'126.98','full'), B=baziCompute({year:1981,month:6,day:10,hour:22,minute:28,sex:'female',tu:false},0,'none');
    const _c0=chart; chart=A; const a0=repHidden(A.pillars[2]).stem, b0=repHidden(B.pillars[2]).stem; zouOverride['日柱']=0; const a1=repHidden(A.pillars[2]).stem, b1=repHidden(B.pillars[2]).stem; zouOverride={}; chart=_c0; return [a0,a1,b0,b1].join(','); });
  const okO=r==='乙,甲,丁,丁'; console.log('  '+(okO?'OK':'NG')+' 先生が選んだ蔵干は本人だけ・お相手は司令（'+r+'）'); if(!okO) res.fails.push('蔵干の選択'); }
// 先生が選んだ蔵干を鑑定書にも引き継ぐ（2026-10-24）：アプリが zo を渡し、鑑定書（3か所同じ）が読む
{ const app=fs.readFileSync(path.join(ROOT,dir,page0),'utf8'), sh=['pro','beginner','meishiki-original'].map(d=>fs.readFileSync(path.join(ROOT,d,'meishi-sheet.html'),'utf8'));
  const okZ=/q\.set\('zo',_zo\)/.test(app)&&sh.every(t=>/var ZO=\{\}/.test(t)&&/ZO\[p\.label\]/.test(t))&&sh[0]===sh[1]&&sh[0]===sh[2];
  console.log('  '+(okZ?'OK':'NG')+' 先生が選んだ蔵干を鑑定書にも引き継ぐ（鑑定書は3か所同じ）'); if(!okZ) res.fails.push('鑑定書の蔵干'); }
// 天徳・月徳など十干で見る星は天干だけ（2026-10-25）：寅月生まれの天徳貴人＝丁。丁が蔵干にだけある柱には付けない
{ const r=await p.evaluate(()=>{ const kt={天徳貴人:'丁'}; return [matchKichi(kt,'丁','卯',['乙']).join(''),matchKichi(kt,'甲','午',['丙','己','丁']).join('')].join('|'); });
  const okT=r==='天徳貴人|'; console.log('  '+(okT?'OK':'NG')+' 天徳・月徳は天干だけで見る（蔵干は数えない）'); if(!okT) res.fails.push('天徳・月徳は天干だけ'); }
// 惹かれ方のしくみ（2026-10-25）：彼女2008-03-28 14:30×彼2006-06-07 時刻不明
{ const r=await p.evaluate(()=>{ if(typeof attractionDetailLines!=='function') return null; document.getElementById('rel-type').value='love'; const A=baziCompute({year:2008,month:3,day:28,hour:14,minute:30,sex:'female',tu:false},'','none'), B=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},'','none'));
    const L=attractionDetailLines(A,B,'本人','お相手'), P=attractionDetailLines(A,B,'あなた','お相手'); return {pro:L.map(x=>x.pro).join('\n'), plain:P.map(x=>x.plain).join('\n'), html:compatAttractHTML(A,B).length, an:/【惹かれ方のしくみ/.test(compatAnalysis(A,B,RELTYPES.love))}; });
  const e=[]; if(!r) e.push('仕組みがない'); else {
    if(!/本人→お相手の恋愛の星：咸池＝「酉」（年支「子」から）→お相手の命式にない／咸池＝「子」（日支「卯」から）→お相手の命式にない／紅艶＝「未」（日干「丁」から）→お相手の命式にない＝恋愛の星は当たらない/.test(r.pro)) e.push('本人→お相手');
    if(!/お相手→本人の恋愛の星：咸池＝「卯」（年支「戌」から）→本人の月柱・日柱にある／咸池＝「子」（日支「卯」から）→本人の年柱にある／紅艶＝「未」（日干「丁」から）→本人の時柱にある＝恋愛の星が当たる/.test(r.pro)) e.push('お相手→本人');
    if(!/比肩＝パートナーの星（官星）ではない/.test(r.pro)||!/時柱が「酉・子・未」なら本人→お相手にも恋愛の星が当たる/.test(r.pro)) e.push('パートナーの星・時刻不明');
    if(/(咸池|紅艶|比肩|官星|財星|日干|年支|日支|命式)/.test(r.plain)) e.push('やさしい言い方に専門用語');
    if(!r.html||!r.an) e.push('画面・鑑定文への渡し'); }
  console.log('  '+(e.length?'NG':'OK')+' 惹かれ方のしくみ（恋愛の星の十二支・相手にあるか・パートナーの星とのちがい・時刻不明）'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('惹かれ方のしくみ: '+e.join('・')); }
// 相性の結果のまとめ・目次・たためる欄（2026-10-25）
{ const r=await p.evaluate(()=>{ if(typeof compatSummaryHTML!=='function'||typeof pkCvFold!=='function') return null; document.getElementById('rel-type').value='love'; const A=baziCompute({year:2008,month:3,day:28,hour:14,minute:30,sex:'female',tu:false},'','none'), B=markTimeUnknown(baziCompute({year:2006,month:6,day:7,hour:12,minute:0,sex:'male',tu:true},'','none'));
    const h=compatSummaryHTML(A,B,RELTYPES.love), f=pkCvFold('<section>中身</section>','cm-w','見出し',1); return {h, f}; });
  const e=[]; if(!r) e.push('仕組みがない'); else { if(!/相性の判定<\/b>：良い点が注意点を上回る組み合わせ（良い点13\.5／注意点6\.5）/.test(r.h)) e.push('判定'); if(!/お相手のほうが強く惹かれている（強い）/.test(r.h)) e.push('惹かれ方'); if(!/2人とも縁が動く月<\/b>：/.test(r.h)||!/注意の月<\/b>：/.test(r.h)) e.push('月'); if(!/pkCvJump\(&#39;ck-w&#39;\)/.test(r.h)) e.push('目次');
    if(!/class="cv-fold closed" id="cm-w" data-keep="1"/.test(r.f)||!/cv-head/.test(r.f)) e.push('たためる欄'); }
  console.log('  '+(e.length?'NG':'OK')+' 相性の結果のまとめ・目次・たためる欄'+(e.length?'  … '+e.join('・'):'')); if(e.length) res.fails.push('まとめ・目次: '+e.join('・')); }
// お名前の印が残らない（1文字のお名前・2026-10-25）
{ const r=await p.evaluate(()=>{ const pa=personName, pb=personNameB; personName='健太'; personNameB='翔'; const out=_unmaskNames('〔本人〕さんと〔翔〕さん、〔お相手〕さん。2027年〔丁未・42歳〕',[['健太','〔本人〕']]); personName=pa; personNameB=pb; return out; });
  const okN=r==='健太さんと翔さん、翔さん。2027年〔丁未・42歳〕'; console.log('  '+(okN?'OK':'NG')+' お名前の印が残らない（1文字のお名前）'+(okN?'':'  … '+r)); if(!okN) res.fails.push('お名前の印'); }
const ok=res.fails.length===0&&res.rit>=1&&res.ritMD>=1&&calls===0;
console.log(`■ 相性の流派の決まり / ${site}：${res.checked}組を確認（律音 日柱どうし ${res.rit}組・月柱×日柱 ${res.ritMD}組・半会 ${res.han}か所）`);
res.fails.slice(0,10).forEach(f=>console.log('  NG '+f));
console.log(`  → ${ok?'合格':'不合格'}（ちがい ${res.fails.length}件・文章作成の呼び出し ${calls}回）`);
await b.close(); srv.close(); process.exit(ok?0:1);
