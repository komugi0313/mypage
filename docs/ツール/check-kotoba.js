/* 言葉の自動チェック（10/12〜）。言い方を変えたら、ここにルールを足して毎回まわす。
   対象：2つのサイトの全ページ（広告動画ページ・見本ページも）の画面の文字・タイトル・説明文・画像の説明、
         1.66 のシェア文、毎朝のメール（件名・本文）。
   使い方：開運予報を 8772、1.66 を 8766 で配信してから  node check-kotoba.js  （見つかったら終了コード1） */
const path=require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SITE=process.env.KAI_SITE;  // daily-engine.js のあるフォルダ
// ── ルール ──（理由はオーナー決定。docs の【ルール表】と同じ）
const ALWAYS=[ // どこにも出さない
 ['無料','料金表記は「料金はかかりません」だけ'],['最強','「最高」にそろえる'],['支配力','「リーダーシップ」'],
 ['60組','「60組に1組」は冷めるので使わない'],['６０組','同上'],['60に、ただ','同上'],['60組に1組','同上'],
 ['晦気','専門用語'],['大殺界','別の占いの言葉'],['特定商取引法に基づく','呼び方は「運営者情報」'],['事業者情報','呼び方は「運営者情報」'],
 ['6時ごろ','「6時」ちょうど'],['6時頃','「6時」ちょうど'],['運気予報','古いサービス名（今は「開運予報」）'],
 ['恋チャンス','今は「恋が動く日」'],['モテ運UP','今は「出会い・モテ運の日」'],['対人運UP','今は「対人運アップ」'],['金運UP','今は「金運アップ」'],
 ['💼 勝負日','今は「💼 勝負運アップ」（「勝負日」という普通の言葉はOK）'],['仕事の気','今は「勝負運アップ」'],['金運の気','今は「金運アップ」'],['対人の気','今は「対人運アップ」'],
 ['ゆらぎ注意','今は「注意の日（注意：ふつう）」'],['空回り注意の日','今は「💡ひとこと」'],['大きく動く日','今は「🐴動き・変化の日」'],
 ['がんばりすぎ注意','出さない（10/11）'],['無理しない日','今は「ひかえめの日」'],['土台を整える日','「整える」は伝わりにくい（10/11）'],['「整える日」','「整える」は伝わりにくい（10/11）'],['ととのえの日','同上'],
 ['絶好調日','今は「特別な日」「とても調子のいい日」'],['空模様：晴れ、絶好調','古いメール見本'],['引き寄せの過ごし方','古いメール見本'],
];
// 決めたうえで残している使い方（ここに当たるものは数えない）
// 印の名前ではなく、ふつうの文として使っているもの（「縁が大きく動く日。」＝運命の人の日の一言、「今日は土台を整える日。」など文の中の言い方、「がんばりすぎ注意。意識して休憩を。」＝体調の一言）
const ALLOW={'6時ごろ':/[0-9]時ごろ\s*6時ごろ\s*7時ごろ/,'大殺界':/「大殺界」は別の占/,'大きく動く日':/縁が大きく動く日。|大きく動く日ではない/,'土台を整える日':/土台を整える日。/,'がんばりすぎ注意':/がんばりすぎ注意。意識して休憩を。/};
const ALLOW_JARGON=/「天地徳合」について知る/;
const PAGE_MARKS=['⚡','🌫️','🌀','🔮']; // カレンダー・ページに出さない古い印
const JARGON=['天干','地支','命式','喜神','忌神','日柱','通変星','十神','律音','干合','支合','天戦地冲']; // ふだんの画面には出さない（タップで開く説明の中はOK）
const KANSHI=/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/;            // 干支の漢字（ふだんの画面には出さない）
const COUPLE=/マンネリ|二人の関係|二人の絆|パートナーがいる|交際中|本命の女性との絆|本命のお相手との|目の前のお相手|お互いの家で|お家デート|生活設計|先回りしたお世話|膠着していた二人|デートの時間を少し短め/; // 恋人がいない人に出さない
const PAGES=['8772/index.html','8772/register.html','8772/login.html','8772/mypage.html','8772/my-tenki-demo.html','8772/mail-preview.html','8772/mail-sample.html','8772/mail-sample-free.html','8772/privacy.html','8772/terms.html','8772/tokushoho.html','8772/unsubscribe.html','8766/index.html','8766/zukan.html','8766/ad-aishou-vertical.html','8766/ad-connected-vertical.html','8766/ad-tenki-vertical.html'];
const out=[];const add=(where,msg)=>out.push(where+'：'+msg);
const ctx14=(t,i,w)=>t.slice(Math.max(0,i-14),i+w.length+12).replace(/\s+/g,' ');
function scan(where,t,{jargon=false,marks=false,kanshi=false}={}){
  t=t.replace(/[​⁠­]/g,'');
  for(const [w,why] of ALWAYS){let i=t.indexOf(w);while(i>=0){const cx=t.slice(Math.max(0,i-20),i+w.length+20);const digitBefore=/^[0-9]/.test(w)&&/[0-9]/.test(t[i-1]||'');if(!digitBefore&&!(ALLOW[w]&&ALLOW[w].test(cx))){add(where,`「${w}」→ ${why}｜…${ctx14(t,i,w)}…`);break;}i=t.indexOf(w,i+1);}}
  if(marks)for(const w of PAGE_MARKS){let i=t.indexOf(w);if(i>=0)add(where,`古い印「${w}」｜…${ctx14(t,i,w)}…`);}
  if(jargon){for(const w of JARGON){let i=t.indexOf(w);if(i>=0)add(where,`専門用語「${w}」（ふだんの画面）｜…${ctx14(t,i,w)}…`);}
    const m=kanshi&&t.match(KANSHI);if(m)add(where,`干支の漢字「${m[0]}」（ふだんの画面）｜…${ctx14(t,m.index,m[0])}…`);
    let i=t.indexOf('天地徳合');while(i>=0){const near=t.slice(Math.max(0,i-30),i+40);if(!near.includes('奇跡の縁')&&!ALLOW_JARGON.test(t.slice(Math.max(0,i-1),i+12)))add(where,`「天地徳合」の近くに「＝奇跡の縁」がない｜…${ctx14(t,i,'天地徳合')}…`);i=t.indexOf('天地徳合',i+1);} }
}
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 for(const prof of [{rel:'single',sex:'f'},{rel:'married',sex:'m'}])for(const u of PAGES){
  if(prof.rel==='married'&&!/mypage|demo/.test(u))continue;
  const c=await b.newContext({viewport:{width:390,height:844}});
  await c.addInitScript(p=>{localStorage.setItem('unkiyoho_session',JSON.stringify({email:'t@x.jp',createdAt:Date.now()}));localStorage.setItem('enbiyori_self_birth',JSON.stringify({nick:'あかり',email:'t@x.jp',rel:p.rel,sex:p.sex,y:1995,m:9,d:12}));localStorage.setItem('enbiyori_register',JSON.stringify([{email:'t@x.jp'}]));},prof);
  const p=await c.newPage();await p.goto('http://localhost:'+u);await p.waitForTimeout(1500);
  if(u.includes('my-tenki-demo')){await p.click('#go').catch(()=>{});await p.waitForTimeout(1200);}
  const variants=u.startsWith('8766/index')?[[1992,4,8,1990,11,3],[1992,4,8,1990,1,5],[1992,4,8,1992,4,8],[1990,1,1,1990,1,1]]:[null];
  for(const v of variants){
   if(v){await p.evaluate(v=>{const s=(id,x)=>{const e=document.getElementById(id);e.value=String(x);e.dispatchEvent(new Event('change'));};s('ay',v[0]);s('am',v[1]);s('ad',v[2]);s('by',v[3]);s('bm',v[4]);s('bd',v[5]);diagnosePair();},v);await p.waitForTimeout(500);
     // 天地徳合の組を探して1つ見る
   }
   const isAd=u.includes('/ad-');
   const r=await p.evaluate(isAd=>{
     const vis=[];if(isAd){document.querySelectorAll('.scene').forEach(s=>vis.push(s.textContent));}else vis.push(document.body.innerText);
     const meta=[document.title,...[...document.querySelectorAll('meta[name=description],meta[property^="og:"],meta[name^="twitter:"]')].map(m=>m.content),...[...document.images].map(i=>i.alt)].join(' ／ ');
     document.querySelectorAll('details').forEach(d=>d.open=true);const all=document.body.innerText+(isAd?[...document.querySelectorAll('.scene')].map(s=>s.textContent).join(' '):'');
     let share='';try{if(typeof shareText==='function')share=shareText()+(typeof shareTags==='function'?shareTags():'');}catch(e){}
     document.querySelectorAll('details').forEach(d=>d.open=false);
     return {vis:vis.join(' \n '),meta,all,share};},isAd);
   const W=u+(v?' '+v.join('-'):'')+(prof.rel!=='single'?' ['+prof.rel+']':'');
   // 干支の漢字：図鑑・1.66の結果のタイプ札（読みがな付き）・マイページの生年月日の表は、キャラの名前として出しているのでOK
   scan(W+' 画面',r.vis,{jargon:!u.includes('privacy')&&!u.includes('terms'),marks:true,kanshi:!/zukan|8766\/index|mypage|login/.test(u)});
   scan(W+' 説明を開いた画面',r.all);scan(W+' タイトル・説明文',r.meta,{jargon:!u.includes('zukan')});if(r.share)scan(W+' シェア文',r.share,{jargon:true});
  }
  await c.close();}
 await b.close();
 // ── ファイルの中身（画面には1日分しか出ない文の一覧も、ここで全部見る）──
 // 文字列（'…' "…"）と、タグの間の文字だけを見る。注釈（// … や /* … */ や <!-- … -->）は数えない
 const fs=require('fs');const DIRS=[SITE,process.env.X166_SITE].filter(Boolean);
 for(const d of DIRS)for(const fn of fs.readdirSync(d).filter(x=>/\.(html|js)$/.test(x)).concat(fs.existsSync(path.join(d,'mail-template'))?['mail-template/render-daily-mail.js']:[])){
   if(/^check-|^build-samples|^_/.test(path.basename(fn)))continue;
   let src=fs.readFileSync(path.join(d,fn),'utf8').replace(/<!--[\s\S]*?-->/g,'').replace(/\/\*[\s\S]*?\*\//g,'').split('\n').map(l=>l.replace(/(^|[^:'"\\])\/\/.*$/,'$1')).join('\n');
   const strs=(src.match(/'[^'\n]*'|"[^"\n]*"|>[^<>]+</g)||[]).join(' \n ');
   scan('ファイル '+path.basename(d)+'/'+fn,strs);
   { const m=src.match(/'[^'。「」\n]{0,8}を整える日'/); if(m) add('ファイル '+path.basename(d)+'/'+fn,`札の名前に「整える」${m[0]}（「整える」は伝わりにくい・10/11）`); }
 }
 // ── 毎朝のメール ──
 if(SITE){const D=require(path.join(SITE,'daily-engine.js'));const {renderDailyMail}=require(path.join(SITE,'mail-template/render-daily-mail.js'));
  let n=0;for(const rel of ['single','crush','partner','married','work'])for(const sex of ['f','m'])for(let k=0;k<12;k++){const bd={y:1972+k*3,m:1+(k*5)%12,d:1+(k*11)%28};
   for(let i=0;i<365;i+=4){const dt=new Date(Date.UTC(2026,10,1+i));const r=D.generateDaily(bd,{y:dt.getUTCFullYear(),m:dt.getUTCMonth()+1,d:dt.getUTCDate()},{nick:'あかり',rel,sex,interests:['恋愛','仕事','金運']});const m=renderDailyMail(r);n++;
    const W=`メール ${rel}/${sex} ${bd.y}-${bd.m}-${bd.d} ${dt.toISOString().slice(0,10)}`;scan(W,m.subject+' \n '+m.text);
    if((rel==='single'||rel==='crush')){const x=m.text.match(COUPLE);if(x)add(W,`恋人がいない人に恋人前提の文「${x[0]}」｜…${ctx14(m.text,x.index,x[0])}…`);}}}
  console.log('メール',n,'通を確認');}
 const uniq=[...new Set(out)];console.log(uniq.length?uniq.slice(0,80).join('\n'):'言葉のチェック：問題なし（0件）');if(uniq.length)console.log('合計',uniq.length,'件');process.exit(uniq.length?1:0);
})();
