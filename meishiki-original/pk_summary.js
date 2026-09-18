/* ===== 鑑定師サマリー（表示専用・エンジン非改変） ===== */
/* 吉凶ラベルの記号（白黒印刷でも区別できるよう色＋記号併記） */
window.__pkSym={追い風:'◎',良:'○',仕込み:'◇',穏やか:'・','小さな注意':'△',要注意:'▲'};
window.__pkSy=function(lab){var s=(window.__pkSym&&window.__pkSym[lab])||'';return s?s+' '+lab:lab;};
/* 結婚・恋愛のめぐり（大運・年運・月運の通変星で判定）
   男性：正財＝正妻＝💍／偏財＝恋愛・出会い＝💕　女性：正官＝正夫＝💍／偏官＝恋愛・出会い＝💕　偏印＝学び・占い＝📖 */
window.__pkMarry=function(ts,sex){
  if(sex==='male'){ if(ts==='正財')return '💍'; if(ts==='偏財')return '💕'; }
  else if(sex==='female'){ if(ts==='正官')return '💍'; if(ts==='偏官')return '💕'; }
  if(ts==='偏印')return '📖';
  return '';
};
/* 通変星の出方（御社の相性表準拠：使いこなせているとき／振り回されているとき） */
window.__pkTenStar={
  比肩:{th:'自立・対等',g:'飾らない自分で対等な関係を築ける',b:'負けず嫌いが強く出て意固地になる'},
  劫財:{th:'情熱・向上',g:'夢の実現に向けて高めあえる',b:'溢れる情熱で相手を圧倒してしまう'},
  食神:{th:'楽しみ・表現',g:'一緒に楽しい経験をたくさんできる',b:'優しさに甘えてわがままが増える'},
  傷官:{th:'感性・ロマン',g:'ロマンチックな恋を楽しめる',b:'寂しさから束縛したり天邪鬼な態度を取る'},
  正財:{th:'堅実・誠実',g:'堅実に将来に向け関係を深める',b:'要求水準が上がり、相手を追い詰める'},
  偏財:{th:'気遣い・社交',g:'気遣いと人当たりの良さで夢中にさせる',b:'八方美人になって相手が寂しさを感じる'},
  正官:{th:'誠実・一途',g:'誠実で一途に相手を大切にする',b:'責任感の強さゆえに消極的になる'},
  偏官:{th:'情熱・面倒見',g:'情熱的に豊かな愛情を注ぐ',b:'面倒見の良さがいきすぎて相手の力を奪う'},
  印綬:{th:'思いやり・知性',g:'思慮深さと思いやりで相手を包む',b:'心配性が増し、あれこれ思い悩む'},
  偏印:{th:'好奇心・独創',g:'旺盛な好奇心で互いの世界を広げる',b:'興味が移ろいやすく、相手に飽きてしまう'}
};
/* 通変星の「自分・仕事」での出方（月柱基準・仕事文脈） */
window.__pkTenStarWork={
  比肩:{th:'自立・マイペース',g:'自分の軸で動き、マイペースに実力を発揮できる',b:'協調を欠き、我を通して孤立・衝突しやすい'},
  劫財:{th:'情熱・勝負',g:'目標に向け情熱的に押し進む。勝負強い',b:'無理な拡大・浪費・仲間との衝突を招く'},
  食神:{th:'表現・生み出す',g:'楽しみながら生み出す。表現・企画・衣食の才',b:'のんびりしすぎ・詰めの甘さで成果を逃す'},
  傷官:{th:'才能・技術',g:'才能・技術・感性で光る。鋭いアイデアを形にする',b:'批判的・完璧主義が過ぎて人とぶつかる'},
  正財:{th:'堅実・信用',g:'堅実にコツコツ、地道に信用と収入を積む',b:'細かく守りに入りすぎ、チャンスを逃す'},
  偏財:{th:'商才・人脈',g:'商才と人脈で機会をつかむ。回転が良い',b:'手を広げすぎ・浪費・八方美人で散漫に'},
  正官:{th:'責任・信頼',g:'真面目に責任を果たす。信頼され地位を得る',b:'規則・体裁に縛られ、消極的・堅すぎに'},
  偏官:{th:'行動・統率',g:'行動力と度胸で難局を突破する。統率力がある',b:'無理・強引・自他への厳しさで消耗・対立'},
  印綬:{th:'学び・知性',g:'学びと知性で支える。資格・専門・教える力',b:'考えすぎ・腰が重く、行動が後回しに'},
  偏印:{th:'独創・専門',g:'独創とひらめきで専門を極める。副業・企画にも強い',b:'飽きやすく気が散り、関心が続かない'}
};
(function(){
var STEM_EL={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
var BR_EL={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
var CHONG={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
var HAI={子:'未',未:'子',丑:'午',午:'丑',寅:'巳',巳:'寅',卯:'辰',辰:'卯',申:'亥',亥:'申',酉:'戌',戌:'酉'};
var HA={子:'酉',酉:'子',丑:'辰',辰:'丑',寅:'亥',亥:'寅',卯:'午',午:'卯',巳:'申',申:'巳',戌:'未',未:'戌'};
var RIKUGO={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
var KEI3={寅:['巳','申'],巳:['寅','申'],申:['寅','巳'],丑:['戌','未'],戌:['丑','未'],未:['丑','戌'],子:['卯'],卯:['子']};
var JIKEI={辰:1,午:1,酉:1,亥:1};
var SANGO={火:['寅','午','戌'],水:['申','子','辰'],木:['亥','卯','未'],金:['巳','酉','丑']};
var HOUGO={木:['寅','卯','辰'],火:['巳','午','未'],金:['申','酉','戌'],水:['亥','子','丑']}; /* 方合（方局）＝季節の3支 */
function favOf(fav,el){return fav&&fav[el]==='喜'?1:(fav&&fav[el]==='忌'?-1:0);}
function kuubo(dayGZ){var S='甲乙丙丁戊己庚辛壬癸',B='子丑寅卯辰巳午未申酉戌亥';var s=S.indexOf(dayGZ[0]),b=B.indexOf(dayGZ[1]);var d=((b-s)%12+12)%12;return [B[(d+10)%12],B[(d+11)%12]];}

var WANG={火:'午',水:'子',木:'卯',金:'酉'}; /* 三合の旺神（中神） */
function assess(stem,branch,fav,natal,daeun,kb){
  var se=STEM_EL[stem],be=BR_EL[branch],rs=[];
  var s=favOf(fav,se)*0.8+favOf(fav,be)*1.2;
  /* 大運は「五行トーン」に加え、支そのものを合冲刑の照合対象に参加させる（年運×命式＋年運×大運） */
  var others=natal.slice();
  if(daeun){var de=STEM_EL[daeun[0]],dbe=BR_EL[daeun[1]];s+=favOf(fav,de)*0.4+favOf(fav,dbe)*0.8;
    others=others.concat([{b:daeun[1],pos:'運'}]);}
  var hai=false,ha=false,rk=false,keiHit=false;
  others.forEach(function(n){
    var nf=favOf(fav,BR_EL[n.b]); /* その支の喜忌（疑い2の修正：実際の喜忌で判定） */
    if(CHONG[branch]===n.b){
      /* 冲は常にマイナス。位置の重み（日＞月＞年/時・大運）×喜忌（喜支を冲＝より痛手／忌支を冲＝痛みは軽いが凶は凶） */
      var basev=(n.pos==='日'?2.0:n.pos==='月'?1.3:1.0);
      var mod=(nf>0?1.2:nf<0?0.7:1.0);
      s-=basev*mod;
      rs.push('⚡冲→'+n.pos+'支'+(n.pos==='日'?'（最重）':nf>0?'(喜支)':nf<0?'(忌支)':''));
    }
    if((KEI3[branch]&&KEI3[branch].indexOf(n.b)>=0)||(branch===n.b&&JIKEI[branch])){ s-=(n.pos==='日'?0.8:0.4); keiHit=true; }
    if(HAI[branch]===n.b)hai=true; if(HA[branch]===n.b)ha=true; if(RIKUGO[branch]===n.b)rk=true;
  });
  if(keiHit)rs.push('刑');
  if(hai){s-=0.3;rs.push('害');}
  if(ha){s-=0.2;rs.push('破');}
  if(rk){s+=0.4;rs.push('六合');}
  /* 三合・半会（疑い1：全五行を喜忌で吉凶／疑い3：半会は旺神を含む2支のみ・旺神を欠く2支は成立なし／疑い4：大運支も参加） */
  var poolB=others.map(function(n){return n.b;}),san=null;
  /* 方合（方局）＝季節の3支がそろえば成立。三合より強い"一極集中"。branch＋他2支が命式/大運にそろう時 */
  for(var hel in HOUGO){var hg=HOUGO[hel];if(hg.indexOf(branch)>=0){
    if(hg.filter(function(x){return x!==branch;}).every(function(x){return poolB.indexOf(x)>=0;}))san={el:hel,kind:'方合'};
    break;
  }}
  if(!san)for(var el in SANGO){var g=SANGO[el];if(g.indexOf(branch)>=0){
    var have=g.filter(function(x){return x!==branch&&poolB.indexOf(x)>=0;});
    if(have.length>=2)san={el:el,kind:'三合'};
    else if(have.length===1&&[branch,have[0]].indexOf(WANG[el])>=0)san={el:el,kind:'半会'}; /* 半会＝旺神を含む2支のみ。旺神を欠く2支は成立なし（拱は使わない） */
    break;
  }}
  if(san){var fv=favOf(fav,san.el),base=(san.kind==='方合'?1.4:san.kind==='三合'?1.2:0.8);
    if(fv>0){s+=base;rs.push('◎'+san.kind+'(喜:'+san.el+')');}
    else if(fv<0){s-=base;rs.push('⚠'+san.kind+'(忌:'+san.el+')');}
    else rs.push('○'+san.kind+'('+san.el+')');
  }
  var kuu=kb&&kb.indexOf(branch)>=0;
  var label,color;
  if(kuu&&(favOf(fav,se)>0||favOf(fav,be)>0)&&s>-0.8){label='仕込み';color='#C8952B';}
  else if(s>=1.8){label='追い風';color='#2E9E5B';}
  else if(s>=0.6){label='良';color='#69B486';}
  else if(s>-0.9){label='穏やか';color='#B9A98C';}
  else if(s>-2.3){label='小さな注意';color='#E0954A';}
  else {label='要注意';color='#D5493C';}
  return {stem:stem,branch:branch,score:Math.round(s*10)/10,label:label,color:color,kuu:kuu,rs:rs};
}
function natalOf(c){
  var P=c.pillars;
  return [{b:P[0].branch,pos:'年',fav:0},{b:P[1].branch,pos:'月',fav:0},{b:P[2].branch,pos:'日',fav:0},{b:(P[3]?P[3].branch:P[1].branch),pos:'時',fav:0}];
}
window.__pkAssess=assess; window.__pkNatal=natalOf; window.__pkKuubo=kuubo; window.__pkFavOf=favOf; window.__pkBR_EL=BR_EL; window.__pkSTEM_EL=STEM_EL;
})();
/* ===== 具体の言葉の鑑定文（ルールベース・オフライン） ===== */
(function(){
function grp(ten){ if(/比肩|劫財/.test(ten))return'比劫'; if(/食神|傷官/.test(ten))return'食傷'; if(/正財|偏財/.test(ten))return'財'; if(/正官|偏官|七殺/.test(ten))return'官殺'; if(/印綬|偏印|正印/.test(ten))return'印'; return''; }
function tally(c){ var g={比劫:0,食傷:0,財:0,官殺:0,印:0}; c.pillars.forEach(function(p,i){ if(i!==2&&p.tenStar){var k=grp(p.tenStar);if(k)g[k]+=2;} (p.hiddenStems||[]).forEach(function(h){var k=grp(h.tenStar);if(k)g[k]+=(h.ling?1.5:0.6);}); }); return g; }
var ELNAT={木:'まっすぐで成長意欲が強く、面倒見がいい',火:'明るく情熱的で、人を惹きつける',土:'面倒見がよく安定志向で、我慢強い',金:'筋を通し、けじめを大事にする',水:'頭の回転が速く柔軟で、機転がきく'};
var STR={比劫:'独立心と行動力。仲間と動き、負けん気が強い',食傷:'人を楽しませ場を和ませるセンス、または感性の鋭さ・オリジナルを生む才能',財:'現実的で商才があり、お金や人付き合いを回すのが上手い',官殺:'責任感と統率力。任されると力を発揮し、いざという時に強い',印:'学ぶ力と受け止める優しさ。知識欲があり、人を育てられる'};
/* 通変星ごと（具体の強み）— 食神/傷官・比肩/劫財・正官/偏官などを潰さず出し分け */
var STR10={
  比肩:'自分の軸で動ける自立心と、ブレない芯の強さ',
  劫財:'勝負強さと仲間を巻き込む力。ここぞで押し切れる',
  食神:'人を楽しませ場を和ませるセンス。衣食・表現に恵まれる',
  傷官:'感性と技術が鋭く、オリジナルを生み出す才能',
  正財:'堅実にコツコツ積み、信用とお金を守り育てる力',
  偏財:'商才と人脈。人とお金を回すのが上手い',
  正官:'真面目さと責任感。任されると信頼され、地位を得る',
  偏官:'行動力と度胸。困難をこじ開ける統率力',
  印綬:'学ぶ力と受け止める優しさ。人を育て、教えられる',
  偏印:'独創とひらめき。専門を深掘りする直感力'
};
var TYP={比劫:'根は"自分の道を行く"一匹狼タイプ',食傷:'根は表現とアイデアの人',財:'根は現実的な実務家・商売人',官殺:'根は責任を担うリーダー型',印:'根は学びと支えの人'};
function stars10(c){var s={比肩:0,劫財:0,食神:0,傷官:0,正財:0,偏財:0,正官:0,偏官:0,印綬:0,偏印:0};
  c.pillars.forEach(function(p,i){ if(i!==2&&p.tenStar&&s[p.tenStar]!=null)s[p.tenStar]+=2; (p.hiddenStems||[]).forEach(function(h){if(s[h.tenStar]!=null)s[h.tenStar]+=(h.ling?1.5:0.6);}); });
  return s;}
function reading(p){
  var c=p.pro,fav=p.fav||{},dEl=c.dayMaster.element,sType=(p.sType||''),weak=/弱/.test(sType),strong=/強/.test(sType);
  var g=tally(c),five=p.five||{},s10=stars10(c);
  var top=Object.keys(g).sort(function(a,b){return g[b]-g[a];});
  // 強み — 具体の通変星から（食神/傷官などを潰さず）
  var strengths=[];
  Object.keys(s10).sort(function(a,b){return s10[b]-s10[a];}).forEach(function(k){ if(strengths.length<2&&s10[k]>=2&&STR10[k]) strengths.push(STR10[k]); });
  if(!strengths.length){ top.slice(0,2).forEach(function(k){ if(g[k]>=2&&STR[k]&&strengths.length<2) strengths.push(STR[k]); }); }
  if(!strengths.length) strengths.push(STR[top[0]]||ELNAT[dEl]);
  // cautions（辛口）— 命式の偏りで出し分け（specific → general の順で上位が変わる）
  var ca=[], dayTerr=c.pillars[2].terrain||'';
  if(s10.正官>=1&&s10.偏官>=1) ca.push('責任や役割が二重にのしかかりやすく、真面目さゆえに抱えて消耗しやすい');
  if(s10.傷官>=1&&s10.正官>=1) ca.push('こだわりや正論が強く出て、上司・目上とぶつかりやすい');
  if(g.官殺>=3.5&&weak) ca.push('プレッシャーや人の目を人の倍気にして、不安を溜め込みやすい');
  if(g.食傷>=3.5) ca.push('思ったことが口や態度に出やすく、正論で人を追い詰めたり、やりすぎて疲れることがある');
  if(g.比劫>=4||s10.劫財>=2) ca.push('我や勝ち負けが出て、人と衝突したり、お金や取り分で揉めやすい');
  if(weak) ca.push('頼まれると断れず全部抱え込み、自分を後回しにして一人で潰れそうになる');
  if(g.財>=4&&weak) ca.push('あれこれ手を広げて消耗し、お金や欲に振り回されやすい');
  if((five['金']===0&&dEl==='火')||g.財<1) ca.push('お金や数字の詰めが甘く、いいものを作れても値付け・請求が苦手でタダ働き・損をしがち');
  if(g.印<1&&weak) ca.push('頼れる支えや逃げ場が少なく、無理を独りで抱え込みやすい');
  if(g.印>=4) ca.push('考えすぎて動けない、人に甘え・依存が出やすい');
  if(s10.偏印>=2) ca.push('興味が移りやすく、あと一歩で飽きて形になりきらないことがある');
  if(/墓|絶/.test(dayTerr)) ca.push('本当は実力があるのに「自分なんて」と、認められる前に自分から引いてしまう');
  if(strong&&g.官殺<1) ca.push('我が強く人の言うことを聞きにくい。自分ルールで突っ走りやすい');
  if(!ca.length) ca.push('バランスは良いが、良い時に気を抜いて詰めが甘くなりやすい');
  var seenC={}; ca=ca.filter(function(x){if(seenC[x])return false;seenC[x]=1;return true;}).slice(0,4);
  // core 一言
  var caShort={ '頼まれると断れず全部抱え込み、自分を後回しにして一人で潰れそうになる':'本音を溜め込んで一人で抱えがち',
    '責任や役割が二重にのしかかりやすく、真面目さゆえに抱えて消耗しやすい':'責任を抱え込みやすい',
    'こだわりや正論が強く出て、上司・目上とぶつかりやすい':'正論で目上とぶつかりやすい',
    'プレッシャーや人の目を人の倍気にして、不安を溜め込みやすい':'人の目を気にして不安を溜めがち',
    '思ったことが口や態度に出やすく、正論で人を追い詰めたり、やりすぎて疲れることがある':'思ったことが出やすく強くなりがち',
    '我や勝ち負けが出て、人と衝突したり、お金や取り分で揉めやすい':'勝ち負けで衝突しやすい',
    'お金や数字の詰めが甘く、いいものを作れても値付け・請求が苦手でタダ働き・損をしがち':'お金の詰めが甘い所がある',
    '頼れる支えや逃げ場が少なく、無理を独りで抱え込みやすい':'頼れず独りで抱え込みがち',
    '興味が移りやすく、あと一歩で飽きて形になりきらないことがある':'飽きやすく形になりにくい所がある',
    '本当は実力があるのに「自分なんて」と、認められる前に自分から引いてしまう':'自己評価が低く一歩引きがち' };
  var domG=top[0], typ=(g[domG]>=3.5?TYP[domG]:'');
  var core=(ELNAT[dEl]||'')+'。'+(typ?typ+'。':'')+'ただ、'+(caShort[ca[0]]||(ca[0].slice(0,22)+'ところがある'))+'。';
  // 喜神の色/行動
  var favEls=Object.keys(fav).filter(function(e){return fav[e]==='喜';});
  var luckAct={木:'自然や緑・木のもの、学びに触れる',火:'人と会う・明るい色・体を動かす',土:'地に足のつく習慣・安定した環境',金:'整理整頓・けじめ・金属や白の小物',水:'水辺・休息・柔軟に流れる'};
  var luck='開運のコツは'+(weak?'"抱え込まないこと"。「断る」「人に頼る」を覚えるだけで運が一気に軽くなる':'"詰めまでやりきること"。良い時ほど最後の一手を丁寧に')+'。'+((five['金']===0&&dEl==='火')||g.財<1?'そして、いいものを作ったら"ちゃんとお金をもらう"。':'')+(favEls.length?'普段は'+favEls.map(function(e){return luckAct[e];}).filter(Boolean).slice(0,2).join('・')+'と調子が上がる。':'');
  return {core:core, strengths:strengths, cautions:ca, luck:luck, dEl:dEl, weak:weak, tally:g};
}
window.__pkReading=reading;
})();
/* ===== パネルHTML（最上部・要点表示） ===== */
(function(){
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function favListStr(fav,kind){return ['木','火','土','金','水'].filter(function(e){return fav&&fav[e]===kind;}).join('・')||'—';}
function nowPhrase(lab){return {追い風:'今は運の<b>追い風</b>の時期。やりたいことに素直に動いていい。自分を大事にしながら前へ。',良:'今は穏やかに前進できる時期。コツコツ積めば報われる。',仕込み:'今は勢いはあるが<b>"種まきの時期"</b>。大きな確定（転職・独立・引越し等）を急がず、人脈と準備を広げて次に効かせる。',穏やか:'今は大きな波のない<b>安定期</b>。足元を固める時。','小さな注意':'今は少し<b>守りの時期</b>。無理な勝負は控えめに、土台を整えて。',要注意:'今は<b>踏ん張りどき</b>。大きな決断や勝負は避け、守りを固める時期。'}[lab]||'';}
function cell(a,sub,seasonTop,di){var isDec=(di!=null);
  return '<div '+(isDec?'class="pk-dec" data-di="'+di+'" ':'')+'style="background:'+a.color+'14;border-left:4px solid '+a.color+';border-radius:9px;padding:7px 9px;min-width:0'+(isDec?';cursor:pointer':'')+'">'+(seasonTop||'')
  +'<div style="font-size:12px;font-weight:800;color:#333">'+esc(sub)+' <b style="font-size:14px">'+esc(a.stem+a.branch)+'</b></div>'
  +'<div style="display:inline-block;background:'+a.color+';color:#fff;font-weight:800;font-size:10.5px;border-radius:5px;padding:1px 7px;margin-top:2px">'+esc(window.__pkSy(a.label))+'</div>'
  +(a.rs&&a.rs.length&&a.rs.join('').match(/[⚡◎⚠]/)?'<div style="font-size:9.5px;color:#7a6f5c;margin-top:2px">'+esc(a.rs.filter(function(x){return /⚡|◎|⚠/.test(x);}).join(' '))+'</div>':'')
  +(isDec?'<div style="font-size:9px;color:#4E8060;font-weight:700;margin-top:3px">▼ タップで10年</div>':'')
  +'</div>';}
window.pkProSummaryHTML=function(p,inp){
  var c=p.pro,fav=p.fav||{},r=window.__pkReading(p),natal=window.__pkNatal(c),kb=window.__pkKuubo(c.pillars[2].ganzhi);
  var kbStr=(window.kuboX?window.kuboX(c):kb).join('・');
  // daeun cells
  var ds=c.decadeFortunes||[], nowI=(c.now&&c.now.daeunIndex)||0;
  var BRS={寅:'木',卯:'木',辰:'木',巳:'火',午:'火',未:'火',申:'金',酉:'金',戌:'金',亥:'水',子:'水',丑:'水'};
  var SJP={木:'春',火:'夏',金:'秋',水:'冬'};
  var seasons=ds.map(function(d){return BRS[d.ganzhi[1]];});
  try{ window.__pkCtx={ds:ds,af:(c.annualFortunes||[]),fav:fav,natal:natal,kb:kb,assess:window.__pkAssess,sex:(inp&&inp.sex)||''}; }catch(e){}
  var prevS=null;
  var decCells=ds.map(function(d,i){
    var a=window.__pkAssess(d.ganzhi[0],d.ganzhi[1],fav,natal,null,kb);
    var seas=seasons[i], trans=(prevS&&seas&&prevS!==seas);
    var badge=(trans?'<div style="font-size:10px;font-weight:900;color:#7A5A16;background:#FBEFD3;border:1px solid #E7CE93;border-radius:5px;padding:1px 6px;margin-bottom:3px;display:inline-block">🍃 '+SJP[prevS]+'→'+SJP[seas]+' 切替</div>':'');
    var seasTag='<div style="font-size:9.5px;color:#8a7f6b;font-weight:700;margin-bottom:1px">'+(SJP[seas]||'')+'（'+(seas||'')+'）</div>';
    var seasTop=badge+seasTag;
    prevS=seas;
    var dmk=window.__pkMarry(d.tenStar,(inp&&inp.sex)||'');
    return cell(a,(d.age!=null?d.age:d.startAge)+'歳〜'+(i===nowI?' ★今':'')+(dmk?' '+dmk:''),seasTop,i);
  }).join('');
  /* 節木運：今の季節と次の切替 */
  var bornY=(inp&&parseInt(inp.y,10))||null, curS=seasons[nowI];
  var bandStart=nowI; while(bandStart>0&&seasons[bandStart-1]===curS)bandStart--;
  var nextI=nowI; while(nextI<ds.length&&seasons[nextI]===curS)nextI++;
  var curStartAge=(ds[bandStart].age!=null?ds[bandStart].age:ds[bandStart].startAge);
  var toneS={'喜':'追い風','忌':'整え・地固め'}[fav[curS]]||'穏やか';
  var CHG={
    '木':{ev:'新しいことを始めたくなり、転職・独立・引っ越し・進学など"環境をリセット"する動きが出やすい。興味や人付き合いがぐっと広がる。',
      ki:{say:'この"始動"はそのまま伸びる。新しい挑戦や人脈がちゃんと実になりやすい。',ad:'迷わず動いてOK。種まきの数を増やす。'},
      ima:{say:'動きたい衝動は出るが、広げすぎ・手を出しすぎで空回りしやすい。',ad:'新規を増やすより一つに絞り、"今あるもの"を育てる。'},
      neu:{say:'始動のチャンスと空回りが半々。動いた分の手応えはその都度確かめて。',ad:'小さく試し、伸びたものだけ残す。'}},
    '火':{ev:'表舞台に立つ・注目される機会が増え、評価や人気が上がる。発信や人前の仕事が増える。',
      ki:{say:'注目・評価がそのまま実力の追い風に。出るほど良い時期。',ad:'出し惜しみせず前へ。体調管理だけはセットに。'},
      ima:{say:'同じ注目が重圧・露出過多・燃え尽きに変わりやすい。感情も高ぶりやすい。',ad:'目立つより質を絞る。頑張りすぎず、休息を意識する。'},
      neu:{say:'注目は増えるが良し悪し半々。乗る場面と引く場面を選ぶと安定。',ad:'出る所は出て、無理な露出は避ける。'}},
    '金':{ev:'これまでの積み重ねが成果・収穫として形になる一方、"整理・手放し"（人間関係や役割・住む場所の見直し、卒業や別れ）も起きやすい。',
      ki:{say:'積み重ねがしっかり形（成果・収入・評価）になり、決断も良い方向へ運ぶ。',ad:'刈り取り時。惜しまず仕上げて、受け取るものは受け取る。'},
      ima:{say:'"手放し"の側が強く出やすく、別れ・役割の終わり・切られる痛みを伴いやすい。',ad:'執着を手放し守りを固める。無理な勝負はしない。'},
      neu:{say:'得るものと手放すものが同時に来やすい。両方あって普通と捉える。',ad:'残すものと畳むものを早めに仕分ける。'}},
    '水':{ev:'表の活動が一段落し、内省・充電のフェーズへ。学び直し・方向転換・水面下の準備が進む。',
      ki:{say:'静かな時間が"次の跳躍の仕込み"になる。学びや準備が後でちゃんと効く。',ad:'焦らず蓄える。学び・資格・下準備に投資する。'},
      ima:{say:'停滞感・孤独・気力ダウンが出やすく、動いても手応えが薄い時期。',ad:'大きな勝負は避け、守りと健康管理に徹する。嵐が過ぎるのを待つ。'},
      neu:{say:'充電向きの季節。表で無理に成果を急がなければ穏やかに進む。',ad:'守りを基本に、次の準備を静かに進める。'}}
  };
  var setsuLine='<div style="background:#F1F8F0;border:1px solid #CFE6D6;border-radius:10px;padding:9px 11px;font-size:13px;line-height:1.7;margin:4px 0 10px">🍃 <b>人生の季節（節木運）</b>：今は【<b>'+SJP[curS]+'（'+curS+'）</b>】の30年（約'+curStartAge+'〜'+((nextI<ds.length?(ds[nextI].age!=null?ds[nextI].age:ds[nextI].startAge):curStartAge+30)-1)+'歳・<b>'+toneS+'</b>の季節）。';
  if(nextI<ds.length){var na=(ds[nextI].age!=null?ds[nextI].age:ds[nextI].startAge),ns=seasons[nextI];setsuLine+='<br><b style="color:#B0483F">次の切替は約'+na+'歳'+(bornY?'（'+(bornY+na)+'年ごろ）':'')+'＝【'+SJP[ns]+'（'+ns+'）】へ。</b>その<b>切替の前後1年半（約'+(na-1.5)+'〜'+(na+1.5)+'歳ごろ）が"節木運"</b>＝価値観や環境がガラッと変わる、揺れやすい踏ん張りどき。';
    var chg=CHG[ns]||CHG['木'];
    var fn=fav[ns], lens=(fn==='喜'?chg.ki:fn==='忌'?chg.ima:chg.neu),
        lensTtl=(fn==='喜'?'あなたにとって'+ns+'は【喜神】＝追い風':fn==='忌'?'あなたにとって'+ns+'は【忌神】＝試練・負荷':'あなたにとって'+ns+'は中立'),
        lensCol=(fn==='喜'?'#2E7D50':fn==='忌'?'#B0483F':'#8a7f6b');
    setsuLine+='<div style="background:#fff;border-radius:8px;padding:7px 9px;margin-top:7px;font-size:12.5px;line-height:1.65">'
      +'<div style="font-weight:800;color:#7A5A16">◇ 切替のとき（'+SJP[curS]+'→'+SJP[ns]+'）に起こりえること</div>'+chg.ev
      +'<div style="font-weight:800;color:'+lensCol+';margin-top:5px">◆ '+lensTtl+'</div>'+lens.say
      +'<div style="font-weight:800;color:#2E7D50;margin-top:4px">◇ この季節の過ごし方</div>'+lens.ad
      +'</div>';}
  else{setsuLine+='<br>この先しばらく季節の切替はありません（今の季節が続きます）。';}
  setsuLine+='</div>';
  // 月柱＝自分・仕事の通変星（月支蔵干の本氣）
  var TSW=window.__pkTenStarWork||{};
  function branchMain(pc,idx){var hs=(pc.pillars[idx]&&pc.pillars[idx].hiddenStems)||[];if(!hs.length)return '';var m=hs.filter(function(x){return x.role==='本氣';})[0]||hs.slice().sort(function(a,b){return (b.pct||0)-(a.pct||0);})[0]||hs[0];return (m&&m.tenStar)||'';}
  var mbTs=branchMain(c,1), wv=TSW[mbTs];
  /* 命式内に最初から成立している会局（三合・方合・半会）＝生まれつき強い五行 */
  var natRels=(window.natalRelationsX?window.natalRelationsX(c):[]);
  var KEx={木:'土',土:'水',水:'火',火:'金',金:'木'},SHx={木:'火',火:'土',土:'金',金:'水',水:'木'},dME=c.dayMaster.element;
  function tenGrpEl(L){ if(L===dME)return '比劫'; if(SHx[dME]===L)return '食傷'; if(KEx[dME]===L)return '財'; if(KEx[L]===dME)return '官殺'; if(SHx[L]===dME)return '印'; return ''; }
  var KGD={比劫:'自我・自立・仲間の力',食傷:'表現・発信・才能',財:'お金・現実・人脈・商売',官殺:'責任・地位・プレッシャー・規律',印:'学び・知性・受容・母性'};
  var kyoku=natRels.filter(function(r){return /三合|方合|半会|大半会/.test(r.kind);})
    .filter(function(r){ if(/半会|大半会/.test(r.kind)) return (r.branches||[]).some(function(bb){return '子午卯酉'.indexOf(bb)>=0;}); return true; }) /* 半会は旺神を含む2支のみ（拱は使わない方針と統一） */
    .filter((function(){var sn={};return function(r){var k=r.kind+r.el;if(sn[k])return false;sn[k]=1;return true;};})()) /* 重複除去 */
    .sort(function(a,b){var o={方合:0,三合:1,大半会:2,半会:3};return (o[a.kind]==null?9:o[a.kind])-(o[b.kind]==null?9:o[b.kind]);})
    .map(function(r){var el=r.el,fv=(fav[el]==='喜'?1:fav[el]==='忌'?-1:0),grp=tenGrpEl(el);return {kind:r.kind,el:el,brs:(r.branches||[]).join(''),fv:fv,grp:grp};});
  var kyokuHTML=kyoku.length?('<div style="background:#EEF3FA;border:1px solid #C6D6EA;border-radius:10px;padding:10px;margin-bottom:10px">'
    +'<div style="font-weight:800;color:#2f5b8f;font-size:13.5px">🔷 命式にある会局（生まれつき強い五行）</div>'
    +'<div style="font-size:10.5px;color:#6b83a3;margin:1px 0 5px">会局＝十二支が集まって一つの五行が一気に強まること。人生の"太い柱"になります。</div>'
    +kyoku.map(function(k){var col=(k.fv>0?'#2E7D50':k.fv<0?'#B0483F':'#7a6f5c');
      var kindTxt=(k.kind==='方合'?'方合（'+k.el+'方）':k.kind==='三合'?'三合会局（'+k.el+'局）':k.kind==='大半会'?'大半会（'+k.el+'）':'半会（'+k.el+'）');
      var strength=(k.kind==='方合'?'季節の勢いが集中し、':k.kind==='三合'?'一つの大きな流れになり、':'その方向へ進む勢いがあり、');
      var favTxt=(k.fv>0?'<b style="color:#2E7D50">これは喜神＝大きな武器・強運の柱</b>。伸ばすほど人生が開けます。':k.fv<0?'<b style="color:#B0483F">これは忌神＝強すぎて振り回されやすいテーマ</b>。抑える・活かし方を工夫するのが課題です。':'吉凶は中立。使い方次第です。');
      return '<div style="border-left:4px solid '+col+';background:'+col+'12;border-radius:8px;padding:6px 9px;margin-bottom:5px;font-size:12.5px;line-height:1.6"><b style="color:'+col+'">'+esc(kindTxt)+'</b> <span style="color:#888;font-size:11px">'+esc(k.brs)+'</span><br>'+strength+'<b>'+esc(k.el)+'</b>（日主から見て<b>'+esc(k.grp||'—')+'</b>＝'+esc(KGD[k.grp]||'')+'）が生まれつき強い。<br>'+favTxt+'</div>';
    }).join('')
    +'</div>'):'';
  /* 命式内の冲・刑・害・破（生まれ持った緊張）＝年運・大運で同じ関係が重なると動きやすい */
  var dBr=c.pillars[2].branch, TJP={冲:'衝突・変化の軸',刑:'摩擦・調整',害:'見えないすれ違い',破:'小さなほころび'};
  var seenT={}; var natTen=natRels.filter(function(r){return /冲|刑|害|破/.test(r.kind);}).filter(function(r){var k=r.kind+(r.branches||[]).slice().sort().join('');if(seenT[k])return false;seenT[k]=1;return true;});
  var tensionHTML=natTen.length?('<div style="background:#FCEEE9;border:1px solid #EAD2CC;border-radius:10px;padding:9px 10px;margin-bottom:10px">'
    +'<div style="font-weight:800;color:#B0483F;font-size:12.5px">⚡ 命式内の緊張（生まれ持った冲・刑・害・破）</div>'
    +natTen.map(function(r){var bs=(r.branches||[]),hasDay=bs.indexOf(dBr)>=0;return '<div style="font-size:12px;line-height:1.6;margin-top:2px"><b>'+esc(r.kind)+'</b> '+esc(bs.join('⇄'))+'（'+esc(TJP[r.kind]||'')+'）'+(hasDay&&r.kind==='冲'?'<b style="color:#B0483F">※日支を含む＝配偶者・住居・自分の土台が動きやすい</b>':'')+'</div>';}).join('')
    +'<div class="note" style="font-size:10.5px;margin-top:3px">生まれ持った揺れ。<b>大運・年運で同じ支が巡ると、そのテーマが実際に動きやすい</b>年になります。</div></div>'):'';
  var workHTML=wv?('<div style="background:#EFF3F7;border:1px solid #CCD9E6;border-radius:10px;padding:10px;margin-bottom:10px"><div style="font-weight:800;color:#3a5a8a;font-size:13.5px">🧑‍💼 仕事・自分の出方（月柱の通変星：'+esc(mbTs)+'／'+esc(wv.th)+'）</div><div style="font-size:10.5px;color:#7d8aa0;margin:1px 0 3px">＝<b>生まれ持った星</b>（一生変わらない仕事・自分の土台）</div><div style="font-size:13px;line-height:1.6"><b style="color:#2E7D50">◎ 活きているとき</b> '+esc(wv.g)+'<br><b style="color:#B0483F">△ 出すぎると</b> '+esc(wv.b)+'</div></div>'):'';
  // near-term annual: now..+8
  var cy=(c.now&&c.now.year)||new Date().getFullYear();
  function daeunFor(y){for(var i=ds.length-1;i>=0;i--){var sy=ds[i].year||ds[i].startYear;if(y>=sy)return ds[i].ganzhi;}return ds[0].ganzhi;}
  var af=(c.annualFortunes||[]).filter(function(a){return a.year>=cy&&a.year<=cy+8;});
  var sexS=(inp&&inp.sex)||'';
  var markS=function(ts){var m=window.__pkMarry(ts,sexS);return m?' '+m:'';};
  var yrCells=af.map(function(y){var a=window.__pkAssess(y.ganzhi[0],y.ganzhi[1],fav,natal,daeunFor(y.year),kb);return cell(a,y.year+markS(y.tenStar));}).join('');
  var anyMarS=af.some(function(y){return !!markS(y.tenStar);})||ds.some(function(d){return !!markS(d.tenStar);});
  var marLegendS=anyMarS?('<p class="note" style="margin:6px 0 0;color:#b06a2e;font-size:11.5px">💍＝'+(sexS==='male'?'正財＝正妻':sexS==='female'?'正官＝正夫':'配偶者星')+'（結婚の星）／💕＝'+(sexS==='male'?'偏財':sexS==='female'?'偏官':'—')+'（恋愛・出会い）／📖＝偏印（学び・占いと縁）が<b>大運・年運</b>に巡る時。</p>'):'';
  var curD=window.__pkAssess(ds[nowI].ganzhi[0],ds[nowI].ganzhi[1],fav,natal,null,kb);
  var curY=af.length?window.__pkAssess(af[0].ganzhi[0],af[0].ganzhi[1],fav,natal,daeunFor(af[0].year),kb):null;
  var thisYearTxt=curY?('<b>今年('+af[0].year+')</b>は<b style="color:'+curY.color+'">'+curY.label+'</b>。'+({追い風:'素直に動いて良い年。',良:'堅実に前進できる年。',仕込み:'種まきの年。焦って確定を急がない。',穏やか:'穏やかな年。土台固めを。','小さな注意':'少し守りの年。',要注意:'守りの年。大きな勝負は避ける。'}[curY.label]||'')):'';
  /* 「今ここ」一行サマリー */
  var nowAge=(c.now&&c.now.age!=null)?c.now.age:null, dN=ds[nowI], nowSeas=BRS[dN.ganzhi[1]];
  var nowBar='<div style="background:linear-gradient(90deg,#EAF4EE,#F7F4EC);border:1px solid #CFE0D4;border-radius:10px;padding:8px 11px;margin-bottom:10px;font-size:13px;line-height:1.6">'
    +'<b style="color:#2E6B49">📍 今このタイミング</b><br>'
    +(nowAge!=null?'<b>'+nowAge+'歳</b>・':'')+'大運【<b>'+esc(dN.ganzhi)+'</b>／'+(SJP[nowSeas]||'')+'('+nowSeas+')・'+esc(dN.terrain)+'・'+esc(dN.tenStar)+'】'
    +'<span style="display:inline-block;background:'+curD.color+';color:#fff;font-weight:800;border-radius:5px;padding:0 7px;margin-left:3px;font-size:11.5px">'+esc(window.__pkSy(curD.label))+'</span>'
    +(curY?' ／ 今年'+af[0].year+' <span style="display:inline-block;background:'+curY.color+';color:#fff;font-weight:800;border-radius:5px;padding:0 7px;font-size:11.5px">'+esc(window.__pkSy(curY.label))+'</span>':'')
    +'</div>';
  var H='<div class="card" style="border:2px solid var(--accent,#4E8060)">'
    +'<h2 style="margin-top:0">🧭 鑑定師サマリー（要点）</h2>'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">'
    +'<span class="pill">日主 '+esc(c.dayMaster.stem)+'（'+esc(c.dayMaster.element)+'）</span><span class="pill">'+esc(p.sType)+'</span>'
    +'<span class="pill">喜神 '+favListStr(fav,'喜')+'</span><span class="pill">忌神 '+favListStr(fav,'忌')+'</span>'
    +'<span class="pill">空亡 '+esc(kbStr)+'</span><span class="pill">日支 '+esc(c.pillars[2].branch)+'</span></div>'
    +nowBar
    +'<p style="font-size:16px;font-weight:800;line-height:1.5;margin:0 0 10px">'+esc(r.core)+'</p>'
    +'<p class="note" style="margin:-4px 0 8px">※下の<b>強み・辛口</b>は、生まれ持った<b>一生の性質（命式）</b>です。特定の時期（大運・年運）の話ではありません。</p>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    +'<div style="background:#EAF4EE;border-radius:10px;padding:10px"><div style="font-weight:800;color:#2E7D50;margin-bottom:4px">◎ 強み</div><ul style="margin:0;padding-left:1.1em;line-height:1.6;font-size:13.5px">'+r.strengths.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div>'
    +'<div style="background:#FCEEE9;border-radius:10px;padding:10px"><div style="font-weight:800;color:#B0483F;margin-bottom:4px">⚠ 辛口（必ず伝える）</div><ul style="margin:0;padding-left:1.1em;line-height:1.6;font-size:13.5px">'+r.cautions.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul></div></div>'
    +'<div style="background:#FFF7E9;border:1px solid #EBD9B8;border-radius:10px;padding:10px;font-size:13.5px;line-height:1.7;margin-bottom:10px"><b>● 今どうすべきか</b><br>'+nowPhrase(curD.label)+' '+thisYearTxt+'<br><b>● 開運のコツ</b><br>'+esc(r.luck)+'</div>'
    +kyokuHTML
    +tensionHTML
    +workHTML
    +'<details open style="margin-bottom:6px"><summary style="font-weight:800;font-size:13px;cursor:pointer;padding:5px 0;color:#333">大運（10年ごと）— 五行の底流で／節木運</summary>'
    +'<div class="note" style="margin:2px 0 6px;font-size:11.5px;color:#4E8060">▼ 各10年を<b>タップ</b>すると、その中の<b>1年ずつの吉凶</b>（特に注意の年・狙い目の年）が開きます。</div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">'+decCells+'</div>'
    +'<div id="pkDecDetail"></div>'+setsuLine
    +'</details>'
    +'<details style="margin-bottom:2px"><summary style="font-weight:800;font-size:13px;cursor:pointer;padding:5px 0;color:#333">これから約9年（年運）— タップで開く</summary>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:4px">'+yrCells+'</div>'
    +marLegendS
    +'<p class="note" style="margin:8px 0 0">記号と色：<b style="color:#2E9E5B">◎追い風</b>／<b style="color:#69B486">○良</b>／<b style="color:#C8952B">◇仕込み(空亡)</b>／<b style="color:#B9A98C">・穏やか</b>／<b style="color:#E0954A">△小さな注意</b>／<b style="color:#D5493C">▲要注意</b>。詳しい根拠は下の各カードで確認できます。</p>'
    +'</details></div>';
  return H;
};
/* ===== 大運タップ → 中の10年（1年ずつ）の吉凶ドリルダウン ===== */
window.__pkDecadeDetailHTML=function(di){
  var C=window.__pkCtx; if(!C||!C.ds)return '';
  var ds=C.ds,d=ds[di]; if(!d)return '';
  var sy=d.year||d.startYear, sAge=(d.age!=null?d.age:d.startAge);
  var ey=(di+1<ds.length?((ds[di+1].year||ds[di+1].startYear)-1):sy+9);
  var years=(C.af||[]).filter(function(y){return y.year>=sy&&y.year<=ey;});
  if(!years.length)return '<div style="background:#FBFAF6;border:1px dashed #CDBF9E;border-radius:10px;padding:9px 10px;margin:2px 0 10px;font-size:12px;color:#888">この10年の年運データがありません。</div>';
  var SC={追い風:5,良:4,仕込み:3,穏やか:2,'小さな注意':1,要注意:0};
  var rows=years.map(function(y){var a=C.assess(y.ganzhi[0],y.ganzhi[1],C.fav,C.natal,d.ganzhi,C.kb);return {y:y.year,age:sAge+(y.year-sy),gz:y.ganzhi,ts:y.tenStar,a:a,sc:(SC[a.label]!=null?SC[a.label]:2)};});
  var mn=Math.min.apply(null,rows.map(function(r){return r.sc;})),mx=Math.max.apply(null,rows.map(function(r){return r.sc;}));
  var mark=function(ts){return window.__pkMarry(ts,C.sex);};
  var anyMar=rows.some(function(r){return !!mark(r.ts);})||!!mark(d.tenStar);
  var reasons=function(a){return (a.rs&&a.rs.length&&a.rs.join('').match(/[⚡◎⚠]/))?'<div style="font-size:8.5px;color:#7a6f5c;margin-top:1px;line-height:1.35">'+esc(a.rs.filter(function(x){return /⚡|◎|⚠/.test(x);}).join(' '))+'</div>':'';};
  var yc=rows.map(function(r){var isMin=(r.sc===mn&&mn<mx),isMax=(r.sc===mx&&mx>mn);var mk=mark(r.ts);
    var ring=isMax?'2px solid #2E9E5B':isMin?'2px solid #D5493C':'1px solid '+r.a.color+'55';
    return '<div style="background:'+r.a.color+'1c;border:'+ring+';border-radius:7px;padding:4px 5px;min-width:0">'
      +'<div style="font-weight:800;font-size:11px">'+r.y+(mk?' '+mk:'')+'<span style="font-weight:600;color:#777;font-size:9px"> ・'+r.age+'歳</span></div>'
      +'<div style="font-size:9.5px;color:#555">'+esc(r.gz)+'<span style="color:#8a7f6b"> '+esc(r.ts||'')+'</span></div>'
      +'<div style="display:inline-block;background:'+r.a.color+';color:#fff;border-radius:4px;padding:0 5px;font-size:9px;font-weight:800;margin-top:1px">'+esc(window.__pkSy(r.a.label))+'</div>'
      +reasons(r.a)+'</div>';}).join('');
  var listYrs=function(sel){return rows.filter(sel).map(function(r){return r.y+'年('+r.age+'歳)';}).join('・');};
  /* 十二運＝この10年のテーマ（大運の文脈で・キーワード＋総合運＋仕事運） */
  var J12={
    長生:{r:'ちょうせい',t:'成長・スキル習得',k:['すごい勢いで成長','素直になる','合理的になる','フラットな恋愛感','スキルが増える','目上に可愛がられる','コスパ重視','プレッシャーに弱い'],
      sou:'仕事や勉強がすごい勢いで伸びる成長期。素直で合理的になり、たくさんのスキルを吸収できる10年。目上の人に可愛がられ、引き上げられやすい。恋愛はフラットであっさりめ。',
      job:'成長・スキル習得・問題解決に強い時期。合理的に動け、コストパフォーマンスを重視した堅実な選択ができる。伸びしろは大きいが、プレッシャーには弱くなりがち——重圧の強すぎる場は避け、育ててくれる環境を選ぶと吉。'},
    沐浴:{r:'もくよく',t:'論理・成長',k:['論理的思考が高まる','すごい勢いで成長','正義感が強まる','恋愛意欲UP','目的意識が強い','イライラに注意'],
      sou:'論理的思考が冴え、仕事や勉強がすごい勢いで伸びる10年。目的意識と正義感が強まり、筋を通して動ける。恋愛への意欲も高まる。ただし正しさを求めるあまり、イライラ・衝突が出やすい。',
      job:'目的を定め、理屈と方法論で着実に前進できる時期。一を聞いて十を知る理解力と予測力で成果を出す。曖昧・感覚的な進め方や、筋の通らない相手にイライラしやすいので、感情の出し方に注意。'},
    冠帯:{r:'かんたい',t:'社交・コミュニケーション',k:['コミュ力UP','活動力・好奇心','コネクションが増える','協働がカギ','見られ方を気にする','八方美人に注意','華やかな恋愛','出費増'],
      sou:'コミュニケーション能力と活動力・好奇心が高まり、人脈（コネクション）が一気に広がる10年。華やかで恋愛運も良いが、周囲の目・見られ方を気にして八方美人になりやすい。交際費など出費も増えがち。家庭より外に目が向く時期。',
      job:'人との協働・社交・発信が成果に直結する時期。コミュ力とコネクションで道が開け、営業・広報・渉外・マネジメントで力を発揮する。八方美人になりすぎ・見栄での出費に注意し、本当に組む相手を選ぶこと。'},
    建禄:{r:'けんろく',t:'仕事・ストイック',k:['仕事熱心になる','エネルギー強まる','ストイックになる','自他に厳しい','リーダーシップUP','プライド高い','恋愛は後回し'],
      sou:'仕事熱心でエネルギッシュ、ストイックに打ち込む10年。リーダーシップが上がり責任ある立場を担うが、自分にも他人にも厳しくなりプライドも高くなる。仕事優先で恋愛の優先順位は下がりがち。',
      job:'キャリアの主戦場。完璧主義とストイックさで成果を出し、地位・専門性・リーダーの座が固まる。自他に厳しすぎると衝突や孤立を招くので注意。働きすぎの消耗にも気をつけ、たまには緩めること。'},
    帝旺:{r:'ていおう',t:'自由・マイペース',k:['エネルギー最高潮','自由に生きたい','マイペース','安定した自信','大役を任される','面倒くさがりに注意','強引さに注意'],
      sou:'エネルギーが最高潮で、揺るがない自信を持つ10年。自由に・マイペースに生きたくなり、ゆったり構える一方、プレッシャーのかかる大役を任されやすい。強引さや面倒くさがりが出て、周囲とぶつかることも。',
      job:'実力と自信で大きな役割・主導権を任される絶好調期。マイペースに進めて成果を出せるが、強引・放任・面倒くさがりが失点に。要所は人任せにせず締め、周りを立てるほど長く続く。'},
    衰:{r:'すい',t:'堅実・技術',k:['技術力を磨く','地道な努力','資格取得','我慢強くなる','堅実・慎重','恋愛は保守的','不器用に注意'],
      sou:'ひたすら技術力を磨き、地道な努力を重ねる10年。我慢強く堅実で、資格取得やスキルの積み上げに向く。恋愛は保守的で安定志向。派手さや器用さより、コツコツ積む力が光る。少し不器用で慎重になりすぎる面も。',
      job:'技術・専門スキルの向上、資格取得、堅実な積み上げが実を結ぶ時期。我慢強さと丁寧さで信頼を得る。器用に立ち回るより一つを磨くのが吉。慎重すぎ・不器用さでチャンスを逃さないよう、時に思い切りも。'},
    病:{r:'びょう',t:'繊細・感性',k:['繊細になる','センスが良くなる','独りの時間を求める','健康意識UP','神経質に注意','深い愛情を求める','ネガティブに注意'],
      sou:'感受性が豊かになり、センス・美的感覚が冴える10年。独りの時間を大切にし、健康への意識も高まる。恋愛では"裏切られない深い愛情"を求める。一方で神経質・ネガティブになりやすく、気疲れしやすい時期。',
      job:'感性・センス・きめ細やかさが活きる時期。デザイン・企画・ケア・専門サポートなど、繊細さが武器になる仕事で力を発揮する。抱えすぎ・考えすぎで消耗しやすいので、独りで整える時間と健康管理を大切に。'},
    死:{r:'し',t:'勤勉・専門探究',k:['生真面目になる','勤勉になる','スキル習得','勉強熱心','使命を考える','真面目な恋愛','せっかち・批評に注意'],
      sou:'生真面目で勤勉になり、勉強熱心にスキルを習得していく10年。「自分は何のために生きるのか」と人生の使命を深く考えるようになる。恋愛も真面目。ただしせっかち・批評的になりやすく、人にも自分にも厳しく当たりがち。',
      job:'勉強・専門スキル・研究・分析で力を伸ばす時期。真面目さと探究心で一つを深く極められる。ただし批評的・せっかちが出ると人間関係で角が立つので、指摘は言い方に注意。資格取得や学び直しにも向く。'},
    墓:{r:'ぼ',t:'研究・収集',k:['研究心が強まる','マニアックになる','情報収集力UP','チームワーク力UP','傾聴力が上がる','恋愛は奥手','我慢しがち'],
      sou:'研究心が強まり、一つのことをマニアックに深掘りする10年。情報収集力・傾聴力が高まり、チームワークでも力を発揮する。恋愛は奥手になりがちで、我慢して溜め込みやすい面も。',
      job:'研究・情報収集・分析・専門の深掘りが武器になる時期。人の話をよく聴けてチームを支える。コツコツ蓄積・データや知識の管理に強い。我慢して溜め込みすぎず、要所で発信・主張することも大事。'},
    絶:{r:'ぜつ',t:'変化・直感・表現',k:['変化が多い','飽きっぽくなる','直感が冴える','表現力が高まる','自由に生きたい','寂しがりに注意','スタミナ切れ注意'],
      sou:'変化が多く、直感と表現力が冴える10年。自由に生きたくなり、ひらめきやクリエイティブが光る。一方で飽きっぽく、寂しがり屋になりやすい。スタミナ切れしやすいので、動きと休みのバランスが大事。',
      job:'ひらめき・表現・企画・クリエイティブで力を発揮する時期。直感を活かして0→1やユニークな仕事に強い。ただし飽きっぽさ・スタミナ切れで中断しやすいので、変化を取り入れつつ完遂する仕組みを。'},
    胎:{r:'たい',t:'新たな流れ・発想',k:['新たな流れが始まる','思考力・発想力UP','企画運','自由に生きたい','独りの時間を好む','古い自分を捨てる','実行力不足に注意','臆病に注意'],
      sou:'新たな流れが始まり、思考力・自由な発想が高まる10年。企画運が良く、古い自分を脱ぎ捨てて新しいルーティンへ切り替わる。独りの時間を好み、恋愛は適度な距離を保つ。ただし妄想（現実性が薄い）・実行力不足・臆病さが出やすい。',
      job:'企画・アイデア・構想・学びの仕込みに強い時期。自由な発想で新しい流れを作れるが、実行力が伴いにくく妄想止まりになりがち。小さく形にする・人と組んで実行を補うと、次の運で花開く。'},
    養:{r:'よう',t:'育み・ご縁',k:['育み・ご縁','守られる','愛情・育成'],
      sou:'愛情が深まり母性・育成力が上がる10年。人だけでなく動植物・会社など"育てるもの"に喜びを感じ、家庭を築きたい願望にもつながる。ご縁に恵まれ守られやすいが、心配性・甘え・臆病さも出やすい。',
      job:'地道な努力と安定志向が強まり、石橋を叩いて堅実に前進する。長期目線でコツコツ積め、部下や事業を育てる力も上がる。細かくなりすぎ・慎重すぎでチャンスを逃さないよう注意。'}
  };
  var OCC={
    長生:'教育・企画・新規事業・接客・広報など"育てる・伸ばす・立ち上げる"仕事。若手や成長分野に関わると吉。',
    沐浴:'企画・デザイン・美容・接客・営業など、変化と人との接点が多い仕事。異動・転職・副業で幅を広げるのも合う。',
    冠帯:'営業・広報・接客・イベント・マネジメント・渉外など、人と繋がり協働する仕事。社交性とコネクションが武器になる分野。',
    建禄:'管理職・専門職・士業・経営・技術など、実力と責任で評価される仕事。リーダー・一本立ちのポジションが活きる分野。',
    帝旺:'経営・独立・リーダー・専門職・裁量の大きい仕事。自分のペースで主導権を握れるポジションが活きる分野。',
    衰:'技術職・専門職・士業・研究・職人・管理など、地道な技術力と堅実さが活きる仕事。資格・スキルが武器になる分野。',
    病:'デザイン・クリエイティブ・医療・介護・カウンセリング・専門サポートなど、繊細な感性ときめ細やかさが活きる仕事。',
    死:'研究・専門職・技術・分析・士業・教育など、勤勉さと専門性が活きる仕事。学び・スキル習得を武器にする分野。',
    墓:'研究・分析・専門職・情報管理・アーカイブ・裏方サポートなど、深掘りと情報収集・傾聴が活きる仕事。',
    絶:'クリエイティブ・表現・企画・デザイン・芸術・フリーランスなど、直感と表現力が活きる仕事。変化のある環境が合う分野。',
    胎:'企画・研究・クリエイティブ・学び直し・準備段階の仕事。アイデアと構想力が活きる分野。実行は人と組むと吉。',
    養:'教育・保育・福祉、公務員・大企業・インフラ系など、安定した組織や"人・物を育てる"仕事が活きる。'
  };
  var SUM={
    長生:'素直さと合理性で、すごい勢いでスキルと実力を伸ばせる成長の10年。',
    沐浴:'論理と目的意識を武器に大きく伸びる10年。感情の波だけ整えれば無敵。',
    冠帯:'コミュ力と人脈で華やかに広がる10年。見栄と八方美人だけ抑えれば大きく飛べる。',
    建禄:'仕事に打ち込み地位を固める10年。厳しさを少し緩めれば人望まで手に入る。',
    帝旺:'最高潮の力と自信で大役をこなす10年。強引さとマイペースの出しすぎだけ注意。',
    衰:'技術と資格を地道に積み上げる10年。慎重さを味方に、着実に力を固められる。',
    病:'感性とセンスが冴える10年。神経質とネガティブを緩め、健康と一人時間を大切に。',
    死:'勤勉に学び、人生の使命を見つめ直す10年。批評とせっかちだけ抑えれば実り多い。',
    墓:'研究心と情報力で深く極める10年。溜め込みすぎず、時に外へ出す勇気を。',
    絶:'直感と表現力が冴える変化の10年。飽きとスタミナ切れだけ工夫すれば才能が開く。',
    胎:'新しい流れと発想が芽吹く仕込みの10年。妄想を"小さな実行"に変えれば大きく育つ。',
    養:'慎重さと勇気・細やかさと大局観のバランスで、深い愛情と忍耐で着実に土台を築ける10年。'
  };
  var CLASSIC={
    長生:{st:'誕生',me:'生まれたての清新なエネルギー。素直で発展性があり、可愛がられる。'},
    沐浴:{st:'産湯につかる',me:'揺れやすく多感。感受性・色気があるが不安定さも。変化を好む。'},
    冠帯:{st:'元服・成人',me:'自我が確立し独立心が強い、プライドと行動力あるしっかり者。'},
    建禄:{st:'就職・独立',me:'自立して脂の乗った働き盛りの気。まじめで責任感が強い。'},
    帝旺:{st:'人生の最盛期',me:'最高潮の強い気。エネルギッシュでリーダー気質、強引さも。'},
    衰:{st:'盛りを過ぎる',me:'ピークを過ぎ落ち着いた気。控えめで思慮深く堅実。'},
    病:{st:'老いて病む',me:'繊細で感受性豊か。人の心に寄り添うが気疲れしやすい。'},
    死:{st:'死を迎える',me:'静かで内省的。専門性・研究気質で、一つを深く突き詰める。'},
    墓:{st:'墓に納まる',me:'収め蓄える気。倹約・収集・研究熱心で粘り強い。'},
    絶:{st:'形が絶え魂だけに',me:'ゼロからの気。発想が独特で0→1に強いが浮き沈みも。'},
    胎:{st:'母胎に受胎',me:'これから育つ可能性の気。好奇心旺盛でマイペース、依存も。'},
    養:{st:'胎児が養われる',me:'育まれ守られる気。おっとり穏やかで人に恵まれ甘え上手。'}
  };
  var jn=d.terrain, j=J12[jn];
  var blk=function(ttl,txt){return '<div style="margin-top:5px"><b style="color:#2E6B49;font-size:11.5px">'+ttl+'</b><div style="font-size:12px;line-height:1.65">'+esc(txt)+'</div></div>';};
  var cl=CLASSIC[jn];
  var classicHTML=cl?('<div style="background:#F7F5EE;border:1px solid #E6DEC8;border-radius:7px;padding:6px 9px;margin-top:5px;font-size:11.5px;line-height:1.6"><b style="color:#8a6d2f">📜 古典の意味（十二運の本来）</b>／人生でいう「'+esc(cl.st)+'」の時期<br><span style="color:#5a4f3c">'+esc(cl.me)+'</span></div>'):'';
  var juniHTML=j?('<div style="background:#EEF5F0;border:1px solid #CFE6D6;border-radius:9px;padding:8px 10px;margin-bottom:8px">'
    +'<div style="font-weight:800;font-size:12.5px;color:#2E6B49">🌱 十二運＝【'+esc(jn)+'（'+j.r+'）】<span style="color:#6b8a77;font-weight:700">／'+j.t+'</span></div>'
    +classicHTML
    +'<div style="font-weight:800;font-size:11px;color:#2E6B49;margin-top:8px">▼ この星が大運（10年）に巡ると</div>'
    +'<div style="margin-top:3px">'+j.k.map(function(w){return '<span style="display:inline-block;background:#fff;border:1px solid #CFE6D6;border-radius:999px;padding:1px 9px;font-size:10.5px;font-weight:700;color:#3a6b4f;margin:2px 3px 0 0">'+esc(w)+'</span>';}).join('')+'</div>'
    +blk('総合運',j.sou)+blk('仕事運',j.job)+blk('向く仕事・分野',OCC[jn]||'')
    +'<div style="margin-top:6px;padding-top:6px;border-top:1px dashed #CFE6D6"><b style="color:#2E6B49;font-size:11.5px">まとめ</b><div style="font-size:12px;line-height:1.65;font-weight:700;color:#2b4d3a">'+esc(SUM[jn]||'')+'</div></div>'
    +'</div>'):'';
  /* 通変星（この10年の才能・仕事の出方＝仕事/一般の言葉で） */
  var dts=d.tenStar, dtsv=window.__pkTenStarWork&&window.__pkTenStarWork[dts];
  var tsHTML=dtsv?('<div style="background:#EEF2F8;border:1px solid #CBD8E8;border-radius:9px;padding:8px 10px;margin-bottom:8px">'
    +'<div style="font-weight:800;font-size:12.5px;color:#3a5a8a">⭐ この10年の通変星＝【'+esc(dts)+'】<span style="color:#7d8aa0;font-weight:700">／'+esc(dtsv.th)+'</span></div>'
    +'<div style="font-size:10.5px;color:#7d8aa0;margin:1px 0 2px">＝<b>今この10年だけ巡ってくる星</b>（生まれ持った星とは別）</div>'
    +'<div style="font-size:12px;line-height:1.6;margin-top:2px"><b style="color:#2E7D50">◎ 使いこなせているとき</b><br>'+esc(dtsv.g)+'</div>'
    +'<div style="font-size:12px;line-height:1.6;margin-top:3px"><b style="color:#B0483F">△ 振り回されているとき</b><br>'+esc(dtsv.b)+'</div>'
    +((window.__pkMarry(dts,C.sex)==='💍')?'<div style="margin-top:5px;font-size:11.5px;color:#b06a2e;font-weight:800">💍 この10年は'+(C.sex==='male'?'正財＝正妻':'正官＝正夫')+'の星が巡る大運＝結婚・家庭を築きやすい時期</div>':(window.__pkMarry(dts,C.sex)==='💕')?'<div style="margin-top:5px;font-size:11.5px;color:#b06a2e;font-weight:800">💕 この10年は'+(C.sex==='male'?'偏財':'偏官')+'の星が巡る大運＝恋愛・出会いが動きやすい時期</div>':'')
    +'</div>'):'';
  var marLegend=anyMar?('<div class="note" style="font-size:10.5px;margin:5px 0 0;color:#b06a2e">💍＝'+(C.sex==='male'?'正財（正妻）':C.sex==='female'?'正官（正夫）':'配偶者星')+'＝結婚の星／💕＝'+(C.sex==='male'?'偏財':C.sex==='female'?'偏官':'—')+'＝恋愛・出会い／📖＝偏印＝学び・占いと縁。大運（上）・年運（各年）に巡る時に表示。</div>'):'';
  var line;
  if(mn===mx){line='<div style="font-size:12px;margin-top:8px;line-height:1.7">この10年は大きな凹凸は少なめ（<b>'+esc(rows[0].a.label)+'</b>が中心）。'+(mx>=3?'流れは悪くありません、動きやすい期間。':'焦らず土台を固める期間。')+'</div>';}
  else{line='<div style="font-size:12px;margin-top:8px;line-height:1.75">'
      +'<b style="color:#D5493C">⚠ 特に注意（この10年で一番きつい年）：</b>'+esc(listYrs(function(r){return r.sc===mn;}))+'<br>'
      +'<b style="color:#2E9E5B">◎ 狙い目（この10年で動くならここ）：</b>'+esc(listYrs(function(r){return r.sc===mx;}))
      +'</div>';}
  /* 命式と冲になる年（変化・衝突・環境の揺れが起きやすい年）を明示 */
  var chList=rows.map(function(r){var c=(r.a.rs||[]).filter(function(x){return /冲/.test(x);})[0];if(!c)return null;var m=c.match(/冲→(.支)/);return r.y+'年('+r.age+'歳・'+(m?m[1]:'命式')+')';}).filter(Boolean);
  var chLine=chList.length?('<div style="font-size:12px;margin-top:6px;line-height:1.7;color:#B0483F"><b>⚡ 命式と"冲"になる年（変化・衝突・環境の揺れ）：</b>'+esc(chList.join('・'))+'<br><span style="color:#7a6f5c;font-size:11px">冲は基本マイナス。特に日支の冲は最重（配偶者・住居・自分の土台が動きやすい）。</span></div>'):'';
  return '<div style="background:#FBFAF6;border:1px dashed #CDBF9E;border-radius:10px;padding:9px 10px;margin:2px 0 10px">'
    +'<div style="font-weight:800;font-size:12.5px;margin-bottom:6px">🔍 '+sAge+'〜'+(sAge+(ey-sy))+'歳（'+esc(d.ganzhi)+'大運）の中身</div>'
    +juniHTML
    +tsHTML
    +'<div style="font-weight:800;font-size:11.5px;margin:2px 0 4px;color:#555">▼ この10年を1年ずつ（吉凶）</div>'
    +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px">'+yc+'</div>'
    +line
    +chLine
    +marLegend
    +'<div class="note" style="font-size:10px;margin:6px 0 0">赤枠＝この10年で最もきつい年／緑枠＝最も動きやすい年。もう一度タップで閉じます。</div>'
    +'</div>';
};
(function(){ if(window.__pkDecWired)return; window.__pkDecWired=1;
  function markSel(sel){try{var all=document.querySelectorAll('.pk-dec');for(var i=0;i<all.length;i++){all[i].style.outline='';all[i].style.outlineOffset='';}if(sel){sel.style.outline='3px solid var(--accent,#4E8060)';sel.style.outlineOffset='1px';}}catch(e){}}
  document.addEventListener('click',function(e){
    var t=(e.target&&e.target.closest)?e.target.closest('.pk-dec'):null; if(!t)return;
    var host=document.getElementById('pkDecDetail'); if(!host)return;
    var di=t.getAttribute('data-di'); if(di==null)return;
    if(host.getAttribute('data-open')===String(di)){host.innerHTML='';host.removeAttribute('data-open');markSel(null);return;}
    host.setAttribute('data-open',di);
    try{host.innerHTML=window.__pkDecadeDetailHTML(parseInt(di,10));}catch(err){host.innerHTML='';}
    markSel(t);
    try{host.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e2){}
  });
})();
})();
/* ===== 相性サマリー（◎◯△×） ===== */
(function(){
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
var SHENG={木:'火',火:'土',土:'金',金:'水',水:'木'};
function daeunLabel(p){var c=p.pro,fav=p.fav||{},natal=window.__pkNatal(c),kb=window.__pkKuubo(c.pillars[2].ganzhi),ds=c.decadeFortunes||[],i=(c.now&&c.now.daeunIndex)||0;var a=window.__pkAssess(ds[i].ganzhi[0],ds[i].ganzhi[1],fav,natal,null,kb);return a.label;}
window.pkCompatSummaryHTML=function(pa,pb,la,lb){
  var ca=pa.pro,cb=pb.pro,elA=ca.dayMaster.element,elB=cb.dayMaster.element;
  var good=[],care=[],score=0,type='';
  // 日主関係
  if(elA===elB){score+=1;type='同志・戦友タイプ';good.push('二人とも日主が'+esc(elA)+'＝<b>価値観・テンポ・「好き／イヤ」がそっくり</b>。一緒にいて気をつかわない');care.push('似すぎているので<b>刺激やドキドキは少なめ</b>。恋人というより"相棒"の安心感で続くタイプ');}
  else if(SHENG[elA]===elB||SHENG[elB]===elA){score+=1.6;type='支え合いタイプ';good.push('日主が<b>生し合う関係</b>（'+esc(elA)+'と'+esc(elB)+'）＝<b>自然に片方が片方を育て、支え合える</b>');}
  else {score-=0.6;type='刺激・成長タイプ';care.push('日主が'+esc(elA)+'と'+esc(elB)+'で<b>タイプが違う</b>＝新鮮だが、主導権やペースでぶつかりやすい。違いを"面白がる"のがコツ');}
  // 日支（配偶者宮）
  var RIKUGO={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
  var CHONG={子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
  var da=ca.pillars[2].branch,db=cb.pillars[2].branch,dsHarmony=false;
  if(RIKUGO[da]===db){score+=2;dsHarmony=true;good.push('お互いの<b>配偶者の場所（日支）が"六合"で結ばれている</b>＝夫婦の縁が深く、居場所として安心できる');}
  else if(da===db){score+=1;good.push('配偶者の場所が同じ'+esc(da)+'＝<b>家庭観・落ち着き方が似ている</b>');}
  else if(CHONG[da]===db){score-=2;care.push('配偶者の場所が"冲"＝<b>一緒にいるとぶつかり・すれ違いが起きやすい</b>。適度な距離と、言葉にする習慣が吉');}
  // 喜忌（同質 or 補完）
  var els=['木','火','土','金','水'],shared=els.filter(function(e){return pa.fav&&pb.fav&&pa.fav[e]==='喜'&&pb.fav[e]==='喜';}).length;
  var comp=els.filter(function(e){return pa.fav&&pb.fav&&((pa.fav[e]==='忌'&&pb.fav[e]==='喜')||(pa.fav[e]==='喜'&&pb.fav[e]==='忌'));}).length;
  if(shared>=2){score+=0.5;good.push('好きなもの・落ち着くものが同じ＝<b>一緒にいて居心地がいい</b>');
    if(/弱/.test(pa.sType||'')&&/弱/.test(pb.sType||'')) care.push('<b>二人とも同じ弱点（身弱）</b>＝しんどい時期が重なると<b>二人同時に落ちて共倒れしやすい</b>。どちらかが支える意識を');}
  else if(comp>=2){score+=1.2;good.push('<b>足りない気をお互いが埋め合う</b>バランス型＝二人でいると調子が整う');}
  // 大運の温度差
  var laD=daeunLabel(pa),lbD=daeunLabel(pb),warm={追い風:2,良:1,仕込み:0,穏やか:0,'小さな注意':-1,要注意:-2};
  var adv='';
  if((warm[laD]||0)-(warm[lbD]||0)>=2) adv='今は<b>'+esc(la||'お一人目')+'が追い風、'+esc(lb||'お二人目')+'がしんどい時期</b>。<b>今は'+esc(la||'お一人目')+'が支える側</b>に回ると関係が安定します。';
  else if((warm[lbD]||0)-(warm[laD]||0)>=2) adv='今は<b>'+esc(lb||'お二人目')+'が追い風、'+esc(la||'お一人目')+'がしんどい時期</b>。<b>今は'+esc(lb||'お二人目')+'が支える側</b>に回ると関係が安定します。';
  // verdict — 本体の総合点（compatData().score・0〜100）に連動させて矛盾を無くす
  var cd=(window.compatData?window.compatData(pa.pro,pb.pro):null);
  var sc100=(cd&&typeof cd.score==='number')?cd.score:null;
  var verdict,vcolor,vword;
  if(sc100!=null){
    if(sc100>=80){verdict='◎';vword='とても良い';vcolor='#2E9E5B';}
    else if(sc100>=65){verdict='◯';vword='良い';vcolor='#69B486';}
    else if(sc100>=50){verdict='◯〜△';vword='まずまず';vcolor='#C8952B';}
    else if(sc100>=35){verdict='△';vword='工夫が要る';vcolor='#E0954A';}
    else {verdict='×';vword='難しめ（努力で補う）';vcolor='#D5493C';}
  } else {
    if(score>=3.5&&dsHarmony){verdict='◎';vword='とても良い';vcolor='#2E9E5B';}
    else if(score>=1.5){verdict='◯';vword='良い';vcolor='#69B486';}
    else if(score>=-0.5){verdict='◯〜△';vword='まずまず';vcolor='#C8952B';}
    else if(score>=-2){verdict='△';vword='工夫が要る';vcolor='#E0954A';}
    else {verdict='×';vword='難しめ（努力で補う）';vcolor='#D5493C';}
  }
  if(!adv&&care.length) adv='お互いの'+(care.length?'注意点を分かった上で、良い所を口に出して伝え合う':'')+'と長続きします。';
  /* 恋愛の出方（各人の日支の通変星＝日支蔵干の本氣） */
  var TS=window.__pkTenStar||{};
  function dayBranchTenStar(c){var hs=(c.pillars[2]&&c.pillars[2].hiddenStems)||[];if(!hs.length)return '';
    var main=hs.filter(function(x){return x.role==='本氣';})[0]||hs.slice().sort(function(a,b){return (b.pct||0)-(a.pct||0);})[0]||hs[0];
    return (main&&main.tenStar)||'';}
  var tsA=dayBranchTenStar(ca),tsB=dayBranchTenStar(cb);
  function loveBox(name,ts){var v=TS[ts];if(!v)return '';return '<div style="background:#fff;border:1px solid #F0D9DE;border-radius:9px;padding:7px 10px;margin-bottom:6px"><div style="font-weight:800;font-size:13px;color:#b5477a">'+esc(name)+'　<span style="color:#8a6b78;font-size:11.5px">日支の通変星：'+esc(ts)+'</span></div><div style="font-size:12.5px;line-height:1.6;margin-top:2px"><b style="color:#2E7D50">◎ 良い面</b> '+esc(v.g)+'<br><b style="color:#B0483F">△ 注意</b> '+esc(v.b)+'</div></div>';}
  var loveHTML=(TS[tsA]||TS[tsB])?('<div style="background:#FCEFF4;border:1px solid #F0D9DE;border-radius:10px;padding:10px;margin-bottom:8px"><div style="font-weight:800;color:#b5477a;margin-bottom:6px">💕 恋愛の出方（日支の通変星から）</div>'+loveBox(la||'お一人目',tsA)+loveBox(lb||'お二人目',tsB)+'</div>'):'';
  /* 二人の命式を突き合わせて成立する会局（三合会局・方合会局・半会）＝強い縁。複数成立も全て表示 */
  var seir=(cd&&cd.seiritsu)||[];
  var hank=((cd&&cd.hankai)||[]).filter(function(h){return (h.pair||(h.inA||[]).concat(h.inB||[])).some(function(bb){return '子午卯酉'.indexOf(bb)>=0;});}); /* 半会は旺神を含む2支のみ（拱は不採用） */
  var pairKyokuHTML='';
  if(seir.length||hank.length){
    pairKyokuHTML='<div style="background:#EAF4F0;border:1px solid #BFE0D4;border-radius:10px;padding:10px;margin-bottom:8px"><div style="font-weight:800;color:#2E7D50;font-size:13.5px">🔷 二人で成立する会局（強い縁の印）</div>'
      +((seir.length+hank.length)>=2?'<div style="font-size:10.5px;color:#6b8a77;margin:1px 0 3px">会局が複数重なる＝非常に濃い縁です。</div>':'')
      +seir.map(function(s){var kind=(s.kind==='三合成立'?'三合会局（'+s.el+'局）':'方合（'+s.el+'方）');
        return '<div style="border-left:4px solid #2E9E5B;background:#2E9E5B12;border-radius:8px;padding:6px 9px;margin-top:4px;font-size:12.5px;line-height:1.6"><b style="color:#2E7D50">◎ '+esc(kind)+' 完成</b><br>二人の支を持ち寄って<b>'+esc(s.el)+'</b>が満ちる縁。'+esc(la||'お一人目')+'が【'+esc((s.inA||[]).join(''))+'】、'+esc(lb||'お二人目')+'が【'+esc((s.inB||[]).join(''))+'】を出し合い、'+(s.kind==='三合成立'?'片方だけでは持てない大きな流れを一緒に作れる<b>最強クラスの結婚・縁の印</b>':'季節の勢いがそろう<b>一体感の強い縁</b>')+'。</div>';}).join('')
      +hank.map(function(h){return '<div style="border-left:4px solid #69B486;background:#69B48612;border-radius:8px;padding:6px 9px;margin-top:4px;font-size:12.5px;line-height:1.6"><b style="color:#2E7D50">○ 半会（'+esc(h.el)+'）</b><br>二人で<b>'+esc(h.el)+'</b>へ向かう前進の勢い（'+esc(la||'お一人目')+'の【'+esc((h.inA||[]).join(''))+'】＋'+esc(lb||'お二人目')+'の【'+esc((h.inB||[]).join(''))+'】）。</div>';}).join('')
      +'</div>';
  }
  var H='<div class="card" style="border:2px solid var(--accent,#4E8060)">'
   +'<h2 style="margin-top:0">🧭 相性サマリー（要点）</h2>'
   +'<div style="text-align:center;margin:4px 0 12px"><span style="font-size:40px;font-weight:900;color:'+vcolor+'">'+verdict+'</span>'+(sc100!=null?'<span style="font-size:22px;font-weight:800;color:#7a6f5c;margin-left:8px">'+sc100+'点</span>':'')
   +'<div style="font-weight:800;font-size:16px;color:'+vcolor+'">'+esc(vword)+'相性　<span style="color:#7a6f5c;font-size:13px">（'+esc(type)+'）</span></div></div>'
   +pairKyokuHTML
   +'<div style="background:#EAF4EE;border-radius:10px;padding:10px;margin-bottom:8px"><div style="font-weight:800;color:#2E7D50;margin-bottom:4px">◎ 良い点</div><ul style="margin:0;padding-left:1.1em;line-height:1.65;font-size:13.5px">'+good.map(function(x){return '<li>'+x+'</li>';}).join('')+'</ul></div>'
   +'<div style="background:#FCEEE9;border-radius:10px;padding:10px;margin-bottom:8px"><div style="font-weight:800;color:#B0483F;margin-bottom:4px">⚠ 注意点（必ず伝える）</div><ul style="margin:0;padding-left:1.1em;line-height:1.65;font-size:13.5px">'+(care.length?care.map(function(x){return '<li>'+x+'</li>';}).join(''):'<li>大きな問題は出にくい相性です</li>')+'</ul></div>'
   +loveHTML
   +'<div style="background:#FFF7E9;border:1px solid #EBD9B8;border-radius:10px;padding:10px;font-size:13.5px;line-height:1.7"><b>● どうすべきか</b><br>'+adv+'</div>'
   +'</div>';
  return H;
};
/* ===== 3人グループ相性サマリー（◎◯△×・本体の点数連動） ===== */
window.pkTrioSummaryHTML=function(persons){
  if(!persons||persons.length<3||!window.compatData)return '';
  var V=function(s){ if(s>=80)return{v:'◎',w:'とても良い',c:'#2E9E5B'}; if(s>=65)return{v:'○',w:'良い',c:'#69B486'}; if(s>=50)return{v:'○〜△',w:'まずまず',c:'#C8952B'}; if(s>=35)return{v:'△',w:'工夫が要る',c:'#E0954A'}; return{v:'×',w:'難しめ',c:'#D5493C'}; };
  var pairs;
  try{ pairs=[[0,1],[0,2],[1,2]].map(function(pr){var cd=window.compatData(persons[pr[0]].pro,persons[pr[1]].pro);var s=(cd&&typeof cd.score==='number')?cd.score:50;return {a:persons[pr[0]].name,b:persons[pr[1]].name,s:s,vv:V(s)};}); }catch(e){ return ''; }
  var avg=Math.round(pairs.reduce(function(t,x){return t+x.s;},0)/pairs.length), gv=V(avg);
  var best=pairs.slice().sort(function(a,b){return b.s-a.s;})[0], worst=pairs.slice().sort(function(a,b){return a.s-b.s;})[0];
  var H='<div class="card" style="border:2px solid var(--accent,#4E8060)">'
   +'<h2 style="margin-top:0">🧭 グループ相性サマリー（要点）</h2>'
   +'<div style="text-align:center;margin:4px 0 12px"><span style="font-size:38px;font-weight:900;color:'+gv.c+'">'+gv.v+'</span><span style="font-size:20px;font-weight:800;color:#7a6f5c;margin-left:8px">平均'+avg+'点</span><div style="font-weight:800;font-size:15px;color:'+gv.c+'">グループ全体は'+esc(gv.w)+'</div></div>'
   +'<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px">'
   +pairs.map(function(x){return '<div style="display:flex;align-items:center;gap:8px;background:'+x.vv.c+'14;border-left:4px solid '+x.vv.c+';border-radius:8px;padding:6px 9px"><span style="font-weight:900;color:'+x.vv.c+';font-size:18px;min-width:30px;text-align:center">'+x.vv.v+'</span><span style="font-weight:800;font-size:13.5px;flex:1">'+esc(x.a)+' × '+esc(x.b)+'</span><span style="font-weight:800;color:'+x.vv.c+'">'+x.s+'点</span></div>';}).join('')
   +'</div>'
   +'<div style="background:#FFF7E9;border:1px solid #EBD9B8;border-radius:10px;padding:10px;font-size:13px;line-height:1.75"><b>● ポイント</b><br>'
   +'一番かみ合うのは<b>'+esc(best.a)+'×'+esc(best.b)+'</b>（'+best.s+'点）。'
   +(worst.s<50?'<br>気をつけたいのは<b>'+esc(worst.a)+'×'+esc(worst.b)+'</b>（'+worst.s+'点＝'+esc(worst.vv.w)+'）。この二人だけの時は、間に入る人がクッションになると安定します。':'<br>大きく崩れるペアはなく、全体として付き合いやすいグループです。')
   +'</div></div>';
  return H;
};
})();

/* ===== 会局サマリー（三合・方合・半会の"成立"を上部に集約表示）— 表示専用・エンジン非改変 =====
   ヘルパーはラッパー内スコープのため、公開済みの window.__pk* 経由で参照する。 */
window.pkKaikyokuSummaryHTML=function(p,inp){
  try{
    var c=p&&p.pro, fav=(p&&p.fav)||{};
    if(!c||!c.pillars||!c.pillars.length) return '';
    var natalOf=window.__pkNatal, assess=window.__pkAssess, kuubo=window.__pkKuubo;
    if(typeof natalOf!=='function'||typeof assess!=='function') return '';
    var SANGO={火:['寅','午','戌'],水:['申','子','辰'],木:['亥','卯','未'],金:['巳','酉','丑']};
    var HOUGO={木:['寅','卯','辰'],火:['巳','午','未'],金:['申','酉','戌'],水:['亥','子','丑']};
    var SEA={木:'春（木）',火:'夏（火）',金:'秋（金）',水:'冬（水）'};
    var E=function(x){return String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
    var natal=natalOf(c), natalB=natal.map(function(n){return n.b;});
    var kb=(typeof kuubo==='function')?kuubo(c.pillars[2].ganzhi):[];
    var ds=c.decadeFortunes||[], af=c.annualFortunes||[];
    var isKai=function(t){return /方合|三合|半会/.test(t);};
    var col=function(t){return /^◎/.test(t)?'var(--good,#2E9E5B)':(/^⚠/.test(t)?'var(--warn,#D5493C)':'var(--muted,#8a8a8a)');};
    var tagH=function(t){return '<b style="color:'+col(t)+'">'+E(t)+'</b>';};
    var inner=[],el;
    for(el in SANGO){ if(SANGO[el].every(function(x){return natalB.indexOf(x)>=0;})) inner.push('<b style="color:var(--good)">三合会局（'+E(SEA[el]||el)+'）</b>'); }
    for(el in HOUGO){ if(HOUGO[el].every(function(x){return natalB.indexOf(x)>=0;})) inner.push('<b style="color:var(--good)">方合成立（'+E(SEA[el]||el)+'）</b>'); }
    var deR=[];
    ds.forEach(function(d){ if(!d||!d.ganzhi) return; var a=assess(d.ganzhi[0],d.ganzhi[1],fav,natal,null,kb);
      (a&&a.rs||[]).forEach(function(t){ if(isKai(t)) deR.push(E(d.startAge)+'歳 '+E(d.ganzhi)+' '+tagH(t)); }); });
    var cy=(c.now&&c.now.year)||(af[0]&&af[0].year)||null;
    var daeGZ=function(y){for(var i=ds.length-1;i>=0;i--){var sy=ds[i].year||ds[i].startYear;if(sy!=null&&y>=sy)return ds[i].ganzhi;}return ds[0]&&ds[0].ganzhi;};
    var yrR=[];
    af.forEach(function(y){ if(!y||!y.ganzhi) return; if(cy!=null&&y.year<cy) return; if(yrR.length>=12) return;
      var a=assess(y.ganzhi[0],y.ganzhi[1],fav,natal,daeGZ(y.year),kb);
      (a&&a.rs||[]).forEach(function(t){ if(isKai(t)) yrR.push(E(y.year)+' '+tagH(t)); }); });
    /* 4) 三者持ち寄り（命式＋大運＋年運）で会局が完成する年 */
    var fm=function(el){var v=(window.__pkFavOf?window.__pkFavOf(fav,el):0);return v>0?' <b style="color:var(--good)">◎喜</b>':(v<0?' <b style="color:var(--warn)">⚠忌</b>':'');};
    var comboR=[];
    if(typeof window.comboRels==='function'){
      af.forEach(function(y){ if(!y||!y.ganzhi) return; if(cy!=null&&y.year<cy) return; if(comboR.length>=12) return;
        var dg=daeGZ(y.year); if(!dg) return; var cr=[]; try{ cr=window.comboRels(c,dg.charAt(1),y.ganzhi.charAt(1))||[]; }catch(e){}
        cr.forEach(function(x){ comboR.push(E(y.year)+'年：命式'+E(x.natal)+'＋大運'+E(x.daiun)+'＋年運'+E(x.year)+' → <b style="color:var(--good)">'+(x.kind==='三合成立'?'三合会局':'方合')+'('+E(x.el)+')</b>完成'+fm(x.el)); }); });
    }
    var H='<section class="card"><h2>🔗 会局サマリー（三合・方合・半会の成立）</h2>'
      +'<p class="note" style="margin:0 0 8px">支がそろって<b>三合・方合が完成</b>／<b>半会</b>が成立する所です。<b style="color:var(--good)">◎＝喜（開運・狙い目）</b>／<b style="color:var(--warn)">⚠＝忌（注意）</b>／○＝中立。命式・大運・年運を通しで拾っています。</p>';
    H+='<div style="margin:5px 0"><b>命式内：</b>'+(inner.length?inner.join('、'):'<span class="note">完成した三合・方合はなし（単独支＋巡りで狙う形）</span>')+'</div>';
    H+='<div style="margin:5px 0"><b>大運で成立：</b>'+(deR.length?deR.join(' ／ '):'<span class="note">なし</span>')+'</div>';
    H+='<div style="margin:5px 0"><b>これからの年で成立：</b>'+(yrR.length?yrR.join(' ／ '):'<span class="note">算出範囲では成立年なし</span>')+'</div>';
    H+='<div style="margin:5px 0"><b>三者持ち寄り（命式＋大運＋年運）完成：</b>'+(comboR.length?comboR.join('<br>'):'<span class="note">算出範囲では三者がそろう完成年なし</span>')+'</div>';
    H+='</section>';
    return H;
  }catch(e){ return ''; }
};
