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
  if(!/日支「未」/.test(L[0]||'')||!/丁（偏印）・乙（偏官）・己（比肩）/.test(L[0]||'')) e.push('配偶宮の蔵干');
  if(!/パートナーの星（官星＝五行の「木」）は、あなたの喜神です/.test(L[1]||'')) e.push('パートナーの星が喜神か');
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
const ok=res.fails.length===0&&res.rit>=1&&res.ritMD>=1&&calls===0;
console.log(`■ 相性の流派の決まり / ${site}：${res.checked}組を確認（律音 日柱どうし ${res.rit}組・月柱×日柱 ${res.ritMD}組・半会 ${res.han}か所）`);
res.fails.slice(0,10).forEach(f=>console.log('  NG '+f));
console.log(`  → ${ok?'合格':'不合格'}（ちがい ${res.fails.length}件・文章作成の呼び出し ${calls}回）`);
await b.close(); srv.close(); process.exit(ok?0:1);
