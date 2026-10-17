// 毎朝のメールの「組み合わせ」点検（10/17）。1通の中で、休む日なのに忙しい文が出ていないか、同じ言葉が3つ以上の欄に出ていないか、
// お金の注意が3つ以上の欄に出ていないか、恋人がいる人・既婚・片思い・ひとりの人に合わない言い方が出ていないかを数える。
// 使い方： node check-kumiawase.js <サイトのフォルダ> [日数=365]   （6人×4つの状況×男女×日数の通数を作って調べる）
// 1通の中の組み合わせ点検：休む×忙しい、同じ言葉のくり返し、お金の注意の回数、状況ちがい
const path=require('path');const dir=process.argv[2];const N=+process.argv[3]||365;
const D=require(path.join(dir,'daily-engine.js'));const {PersonBazi}=require(path.join(dir,'bazi.js'));
const births=[[1990,3,14],[1985,7,2],[1995,11,23],[1978,1,9],[2000,5,30],[1988,9,18]];
const rels=['single','crush','partner','married'],sexes=['f','m'];
const SEC=r=>[['top',r.todayOne],['weather',r.weatherMsg],['theme',(r.theme&&((r.theme.line||'')+(r.theme.message||'')))],['juni',r.juni&&r.juni.text],['en',r.en&&r.en.body],['love',r.love],['loveMove',r.loveMove],['work',r.fortunes.work],['money',r.fortunes.money],['friend',r.fortunes.friend],['health',r.fortunes.health],['onepoint',r.onepoint]].filter(x=>x[1]).map(([k,v])=>[k,v.replace(/<[^>]+>/g,'')]);
const REST=/のんびりが正解|ひと休みの日|ゆっくりの日|お休み|スローペース|休息の日|がんばりを、少し/;
const BUSY=/プレッシャー|多忙|追われ|刺激的な展開|立てこみ|やることが重なり|全力で|大きく動ける/;
const KW=['自然体','アイデア','美味しい','おいしい','約束','責任','感受性','洗練','財布のひも','貸し借り','見栄','きちんと','信頼','個性的','ひらめき','温かい'];
const MONEY=/財布|出費|予算|節約|浪費|貸し借り|立て替え|おごり|散財|衝動買い|セール|交際費/;
const PAIRED_BAD=/交際中のお相手がいるなら|交際中の人は|本命のお相手|本命の女性/;
const MARRIED_BAD=/関係の兆し|長続きさせる|関係が静かにスタート|ご縁が繋がる兆し|ご縁が静かに繋がる兆し|一人の時間を満喫/;
const CRUSH_BAD=/新しい出会い|新しい関係がスタート|アプリ/;
const SINGLE_BAD=/変わらずそばにある/;
const KWC={},SC={},EXS={};const cnt={mails:0,restBusy:0,kwRepeat3:0,kw2:0,money3:0,paired:0,married:0,crush:0,single:0};const ex={};
const add=(k,s)=>{cnt[k]++; if(!ex[k]) ex[k]=s;};
for(let day=0;day<N;day++){const d=new Date(2026,9,1+day);
 for(const b of births) for(const rel of rels) for(const sex of sexes){
  const r=D.generateDaily({y:b[0],m:b[1],d:b[2]},{y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate()},{nick:'〇〇',rel,sex,timeUnknown:true,personBazi:PersonBazi});
  const S=SEC(r);cnt.mails++;const all=S.map(x=>x[1]).join('｜');
  const top=(r.todayOne||'')+(r.weatherMsg||'');
  if(REST.test(top)&&S.some(([k,v])=>k!=='top'&&k!=='weather'&&BUSY.test(v))) add('restBusy',top+' ⇔ '+S.find(([k,v])=>BUSY.test(v))[1]);
  let rep3=false,rep2=false;for(const w of KW){const n=S.filter(([k,v])=>v.includes(w)).length; if(n>=3) rep3=w; else if(n>=2) rep2=w;}
  if(rep3){ add("kwRepeat3",rep3); KWC[rep3]=(KWC[rep3]||0)+1; const secs=S.filter(([k,v])=>v.includes(rep3)).map(x=>x[0]).join(","); SC[secs]=(SC[secs]||0)+1; if(!EXS[rep3]) EXS[rep3]=S.filter(([k,v])=>v.includes(rep3)).map(x=>x[0]+":"+x[1].slice(0,60)).join(" ｜ "); } if(rep2) add('kw2',rep2);
  if(S.filter(([k,v])=>MONEY.test(v)).length>=3) add('money3',S.filter(([k,v])=>MONEY.test(v)).map(x=>x[0]).join(','));
  if((rel==='partner'||rel==='married')&&PAIRED_BAD.test(all)) add('paired',all.match(PAIRED_BAD)[0]);
  if(rel==='married'&&MARRIED_BAD.test(all)) add('married',all.match(MARRIED_BAD)[0]);
  if(rel==='crush'&&CRUSH_BAD.test(all)) add('crush',all.match(CRUSH_BAD)[0]);
  if(rel==='single'&&SINGLE_BAD.test(all)) add('single',all.match(SINGLE_BAD)[0]);
 }}
console.log(JSON.stringify(cnt));console.log(KWC);console.log(Object.entries(SC).sort((a,b)=>b[1]-a[1]).slice(0,8));console.log(EXS);console.log(JSON.stringify(ex,null,0).slice(0,1500));
