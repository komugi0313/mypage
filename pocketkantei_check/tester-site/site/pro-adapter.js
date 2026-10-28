/* ============================================================
   pro-adapter.js — 四柱推命pro の計算コアを Pocket鑑定 に移植
   出典: 四柱推命pro (app-pro.html) の計算ロジック（解釈文は含まない）
   ・命式/大運/年運/起運/十神/蔵干 … pro-bazi.js (window.Bazi.computeChart)
   ・身強身弱/喜忌/過多/空亡/神殺  … 本ファイル（proから抽出）
   ============================================================ */
const STEMS=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BR=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ATTACK_EL={木:'金',火:'水',土:'木',金:'火',水:'土'};
const STEM_EL={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};

const HONKI={子:'癸',丑:'己',寅:'甲',卯:'乙',辰:'戊',巳:'丙',午:'丁',未:'己',申:'庚',酉:'辛',戌:'戊',亥:'壬'};

const SHENG=['木','火','土','金','水'];

const TENSTAR10=['比肩','劫財','食神','傷官','偏財','正財','偏官','正官','偏印','印綬'];

const TS_GROUP={比肩:'比劫',劫財:'比劫',食神:'食傷',傷官:'食傷',偏財:'財',正財:'財',偏官:'官殺',正官:'官殺',偏印:'印',印綬:'印'};

const GROUP_ORDER=['比劫','食傷','財','官殺','印'];

/* 通変星の偏り（過多・欠落・バランス）を5グループで判定。表の星＝1.0、蔵干は当令(主星)1.0/その他0.5で加重 */
const TG_HEAVY={
  比劫:'strong self & independence, peer/rival drive (caution: ego or competition can crowd others out)',
  食傷:'rich expression, ideas and talent, loves freedom (caution: says too much / chafes inside rigid organisations)',
  財:'practical, busy, wide networks, sharp eye for opportunity (caution: overextends; if the self is weak, money & people pull them around)',
  官殺:'responsibility, discipline, holds up under pressure (caution: over-suppresses the self; needs release valves)',
  印:'learning, thinking, receptivity, support luck (caution: over-thinks or turns passive; must pair with action)'
};
const TG_NONE={
  比劫:'no self/peer group — moves better with others than solo; naturally good at leaning on people',
  食傷:'no expressive group — tends to keep things inside; opens up when given a stage or outlet',
  財:'no wealth group (無財) — driven by meaning & values over money; best to systematise finances',
  官殺:'no authority group — dislikes fixed frames; runs on their own rules, freedom-first',
  印:'no support group — learns hands-on by doing rather than book study; field over theory'
};
function tenGodBias(pro){
  var g={比劫:0,食傷:0,財:0,官殺:0,印:0};
  (pro.pillars||[]).forEach(function(p){
    if(p.tenStar&&p.tenStar!=='日主'&&TS_GROUP[p.tenStar]) g[TS_GROUP[p.tenStar]]+=1.0;
    (p.hiddenStems||[]).forEach(function(h){
      if(h.tenStar&&TS_GROUP[h.tenStar]) g[TS_GROUP[h.tenStar]]+=1.0;   /* 司令だけ */
    });
  });
  var total=GROUP_ORDER.reduce(function(s,k){return s+g[k];},0)||1;
  var avg=total/5;
  var present=GROUP_ORDER.filter(function(k){return g[k]>0;});
  var missing=GROUP_ORDER.filter(function(k){return g[k]===0;});
  var dominant=GROUP_ORDER.filter(function(k){return (g[k]/total)>=0.40;});   /* 過多＝全体の4割以上を占める星 */
  var thin=GROUP_ORDER.filter(function(k){return g[k]>0&&(g[k]/total)<=0.09;});
  var maxShare=Math.max.apply(null,GROUP_ORDER.map(function(k){return g[k]/total;}));
  var type;
  if(dominant.length||missing.length>=2||(missing.length>=1&&maxShare>=0.33)) type='skewed';   /* 偏り型 */
  else if(missing.length===0&&maxShare<0.33) type='balanced';                                   /* バランス型 */
  else type='mild';                                                                             /* ややバランス */
  var counts={}; GROUP_ORDER.forEach(function(k){ counts[k]=Math.round(g[k]*10)/10; });
  return {counts:counts,total:Math.round(total*10)/10,present:present,missing:missing,
          dominant:dominant,thin:thin,maxShare:Math.round(maxShare*100)/100,
          maxGroup:dominant[0]||GROUP_ORDER.reduce(function(a,b){return g[b]>g[a]?b:a;},GROUP_ORDER[0]),
          type:type,order:GROUP_ORDER,heavyHint:TG_HEAVY,noneHint:TG_NONE};
}
window.tenGodBias=tenGodBias;

const UNKI_FAV={
  身強:{食傷:0.86,財:0.92,官殺:0.74,比劫:0.30,印:0.36},
  身弱:{印:0.90,比劫:0.80,食傷:0.42,財:0.30,官殺:0.22},
  中和:{食傷:0.62,財:0.64,官殺:0.58,比劫:0.56,印:0.62}
};

const TOKUREI={甲:['寅','卯','辰'],乙:['寅','卯','辰'],丙:['巳','午','未'],丁:['巳','午','未'],戊:['巳','午','未','辰','戌','丑'],己:['巳','午','未','辰','戌','丑'],庚:['申','酉','戌'],辛:['申','酉','戌'],壬:['亥','子','丑'],癸:['亥','子','丑']};

const TERR_STR={帝旺:3,建禄:2,長生:2,冠帯:1,養:1,沐浴:0,胎:0,衰:-1,病:-2,死:-2,墓:-1,絶:-2};

const GEN={木:'水',火:'木',土:'火',金:'土',水:'金'};

const SANGO_KEY={申:'水',子:'水',辰:'水',寅:'火',午:'火',戌:'火',巳:'金',酉:'金',丑:'金',亥:'木',卯:'木',未:'木'};

const KICHI_NICHI={水:{咸池:'酉',驛馬:'寅',劫殺:'巳',亡神:'亥',囚獄:'午'},火:{咸池:'卯',驛馬:'申',劫殺:'亥',亡神:'巳',囚獄:'子'},金:{咸池:'午',驛馬:'亥',劫殺:'寅',亡神:'申',囚獄:'卯'},木:{咸池:'子',驛馬:'巳',劫殺:'申',亡神:'寅',囚獄:'酉'}};

const BLOOD={子:'戌',丑:'酉',寅:'申',卯:'未',辰:'午',巳:'巳',午:'辰',未:'卯',申:'寅',酉:'丑',戌:'子',亥:'亥'};

const KAKU={子:'卯',丑:'卯',寅:'午',卯:'午',辰:'午',巳:'酉',午:'酉',未:'酉',申:'子',酉:'子',戌:'子',亥:'卯'};

const KAIGOU=new Set(['庚辰','庚戌','壬辰','壬戌','戊戌']);   /* 教室資料に合わせる（前は壬戌が抜けて戊辰が入っていた。2026-10-23） */
const NICHIJIN=new Set(['丙午','戊午','壬子']);   /* 日刃（日柱干支） */
/* 月支から見る吉星（教室資料 ⑤）：天徳貴人・月徳貴人・天徳合・月徳合は命式の天干（天徳貴人の一部は地支）、華蓋は地支 */
const GETSU_STARS={天德貴人:{子:'巳',丑:'庚',寅:'丁',卯:'申',辰:'壬',巳:'辛',午:'亥',未:'甲',申:'癸',酉:'寅',戌:'丙',亥:'乙'},月德貴人:{子:'壬',丑:'庚',寅:'丙',卯:'甲',辰:'壬',巳:'庚',午:'丙',未:'甲',申:'壬',酉:'庚',戌:'丙',亥:'甲'},天德合:{子:'申',丑:'乙',寅:'壬',卯:'巳',辰:'丁',巳:'丙',午:'寅',未:'己',申:'戊',酉:'亥',戌:'辛',亥:'庚'},月德合:{子:'丁',丑:'乙',寅:'辛',卯:'己',辰:'丁',巳:'乙',午:'辛',未:'己',申:'丁',酉:'乙',戌:'辛',亥:'己'},華蓋:{子:'辰',丑:'丑',寅:'戌',卯:'未',辰:'辰',巳:'丑',午:'戌',未:'未',申:'辰',酉:'丑',戌:'戌',亥:'未'}};

const ROKUBA=new Set(['壬午','癸巳']);

const KICHI_NIKKAN={
  甲:{天乙貴人:['丑','未'],文昌貴人:['巳'],金与禄:['辰'],暗禄:['亥'],羊刃:['卯'],飛刃:['酉'],太極貴人:['子','午'],紅艶:['午'],天厨貴人:['巳'],福星貴人:['子','寅'],天官貴人:['未']},
  乙:{羊刃:['辰'],飛刃:['戌'],天乙貴人:['子','申'],文昌貴人:['午'],金与禄:['巳'],暗禄:['戌'],太極貴人:['子','午'],紅艶:['申'],天厨貴人:['午'],福星貴人:['丑','亥'],天官貴人:['辰'],妨害殺:['卯','酉']}, /* 紅艶：乙は申（運営の表に合わせる 2026-10-23。流派により午とする見方もある） */
  丙:{天乙貴人:['亥','酉'],文昌貴人:['申'],金与禄:['未'],暗禄:['申'],羊刃:['午'],飛刃:['子'],太極貴人:['卯','酉'],紅艶:['寅'],天厨貴人:['巳'],福星貴人:['子','戌'],天官貴人:['巳']},
  丁:{羊刃:['未'],飛刃:['丑'],天乙貴人:['亥','酉'],文昌貴人:['酉'],金与禄:['申'],暗禄:['未'],太極貴人:['卯','酉'],紅艶:['未'],天厨貴人:['午'],福星貴人:['酉'],天官貴人:['酉']},
  戊:{天乙貴人:['丑','未'],文昌貴人:['申'],金与禄:['未'],暗禄:['申'],羊刃:['午'],飛刃:['子'],太極貴人:['辰','戌','丑','未'],紅艶:['辰'],天厨貴人:['申'],福星貴人:['申'],天官貴人:['戌'],妨害殺:['子','午']},
  己:{羊刃:['未'],飛刃:['丑'],天乙貴人:['子','申'],文昌貴人:['酉'],金与禄:['申'],暗禄:['未'],太極貴人:['辰','戌','丑','未'],紅艶:['辰'],天厨貴人:['酉'],福星貴人:['未'],天官貴人:['卯'],妨害殺:['卯','酉']},
  庚:{天乙貴人:['丑','未'],文昌貴人:['亥'],金与禄:['戌'],暗禄:['巳'],羊刃:['酉'],飛刃:['卯'],太極貴人:['寅','亥'],紅艶:['戌'],天厨貴人:['亥'],福星貴人:['午'],天官貴人:['亥']},
  辛:{羊刃:['戌'],飛刃:['辰'],天乙貴人:['午','寅'],文昌貴人:['子'],金与禄:['亥'],暗禄:['辰'],太極貴人:['寅','亥'],紅艶:['酉'],天厨貴人:['子'],福星貴人:['巳'],天官貴人:['申'],妨害殺:['酉']},
  壬:{天乙貴人:['卯','巳'],文昌貴人:['寅'],金与禄:['丑'],暗禄:['寅'],羊刃:['子'],飛刃:['午'],太極貴人:['巳','申'],紅艶:['子'],天厨貴人:['寅'],福星貴人:['辰'],天官貴人:['寅'],妨害殺:['子','午']},
  癸:{羊刃:['丑'],飛刃:['未'],天乙貴人:['卯','巳'],文昌貴人:['卯'],金与禄:['寅'],暗禄:['丑'],太極貴人:['巳','申'],紅艶:['申'],天厨貴人:['卯'],福星貴人:['卯'],天官貴人:['午'],妨害殺:['巳']}
};

function fukyuList(counts,th){
  const taika=SHENG.filter(k=>counts[k]>=th), strong=th-1, out=[];
  SHENG.forEach(k=>{const v=counts[k];
    if(v===0){out.push({el:k,why:'0＝完全に欠ける'});return;}
    if(v===1){const a=ATTACK_EL[k],av=counts[a]||0;
      if(av>=strong&&av>v){out.push({el:k,why:`${a}${av}に剋され弱る（攻撃で不及）`});return;}
      if(taika.length){out.push({el:k,why:`1のみで太過(${taika.join('・')})の偏りに押される`});return;}}});
  return out;
}

function gogyoBalance(c){
  const f=c.fiveElements||{}, counts={}; SHENG.forEach(k=>counts[k]=f[k]||0);
  const total=SHENG.reduce((a,k)=>a+counts[k],0)||1;
  const max=Math.max(...SHENG.map(k=>counts[k])), min=Math.min(...SHENG.map(k=>counts[k]));
  const strong=SHENG.filter(k=>counts[k]===max), zero=SHENG.filter(k=>counts[k]===0);
  const weak=SHENG.filter(k=>counts[k]===min);
  const spread=max-min;
  let verdict;
  if(zero.length>=2)verdict='偏り大（複数の五行が欠ける）';
  else if(spread<=1)verdict='バランス良好（五行が比較的そろう）';
  else if(spread===2)verdict='ややバランス型';
  else if(spread<=3)verdict='やや偏り';
  else verdict='偏りが強い';
  // 身強・身弱：得令(月令)を主軸＋月支の十二運の強弱＋カウント(比劫＋印の数)補助
  const dayEl=c.dayMaster.element;
  const support=counts[dayEl]+counts[GEN[dayEl]];
  const stem=c.dayMaster.stem, mb=c.pillars[1]?c.pillars[1].branch:'', mt=c.pillars[1]?c.pillars[1].terrain:'';
  const tokurei=(TOKUREI[stem]||[]).includes(mb);              // 得令○＝身旺の素
  const terrScore=(TERR_STR[mt]!=null?TERR_STR[mt]:0);          // 月支十二運の強弱
  const supScore=support>=5?1:support<=1?-2:support===2?-1:0;   // カウント補助
  const sScore=(tokurei?3:0)+terrScore+supScore;               // 総合スコア
  const strength=sScore>=4?'身強（自我が強くエネルギー旺盛）':sScore>=2?'やや身強':sScore<=-4?'身弱（繊細で消耗しやすい）':sScore<=-2?'やや身弱':'中和に近い';
  return {counts,total,max,min,strong,weak,zero,spread,verdict,dayEl,support,strength,tokurei,monthBranch:mb,monthTerr:mt,terrScore,supScore,sScore};
}

function strengthType(c){const s=gogyoBalance(c).sScore;return s>=2?'身強':s<=-2?'身弱':'中和';}

function gogyoTaika(c){
  const th=c.timeUnknown?3:4;
  const base={}; SHENG.forEach(k=>base[k]=(c.fiveElements&&c.fiveElements[k])||0);
  const now=Object.assign({},base); let du='',ay='';
  if(c.now){
    const dd=curDecade(c);
    const ya=c.annualFortunes&&c.annualFortunes.find(a=>a.year===c.now.year);
    if(dd){[STEM_EL[dd.stem],STEM_EL[HONKI[dd.branch]]].forEach(e=>{if(now[e]!=null)now[e]++;});du=dd.ganzhi;}
    if(ya){[STEM_EL[ya.stem],STEM_EL[HONKI[ya.branch]]].forEach(e=>{if(now[e]!=null)now[e]++;});ay=ya.ganzhi;}
  }
  const taika=o=>SHENG.filter(k=>o[k]>=th);
  const bf=fukyuList(base,th), nf=fukyuList(now,th);
  return {th,base,now,du,ay,
    baseTaika:taika(base), baseFukyu:bf.map(r=>r.el), baseFukyuDetail:bf,
    nowTaika:taika(now), nowFukyu:nf.map(r=>r.el), nowFukyuDetail:nf};
}

function _kkAssess(c){
  const dmEl=c.dayMaster.element, gi=SHENG.indexOf(dmEl);
  const sType=strengthType(c), fav=UNKI_FAV[sType]||UNKI_FAV['中和'];
  const grp=el=>{const d=(SHENG.indexOf(el)-gi+5)%5;return d===0?'比劫':d===1?'食傷':d===2?'財':d===3?'官殺':'印';};
  const taika=(gogyoTaika(c).baseTaika)||[], fe=c.fiveElements||{};
  const favLabel=el=>{const s=fav[grp(el)];return s>=0.66?'喜': (s<=0.45?'忌':'中庸');};
  const excess=el=>taika.includes(el)||(fe[el]||0)>=3;
  const assess=el=>{const ex=excess(el),fl=favLabel(el);const tone=ex?'caution': (fl==='喜'?'good': (fl==='忌'?'caution':'neutral'));return {tone,fav:fl,excess:ex,grp:grp(el)};};
  return {sType,assess};
}

function kubo(c){const ds=STEMS.indexOf(c.dayMaster.stem),db=BR.indexOf(c.pillars[2].branch);const d=((db-ds)%12+12)%12;return [BR[(d+10)%12],BR[(d+11)%12]];}

function kuuboNow(c){
  const voids=kubo(c);
  let duVoid=null, ayVoid=null;
  if(c.now){const dd=curDecade(c);
    const yy=c.annualFortunes&&c.annualFortunes.find(a=>a.year===c.now.year);
    if(dd&&voids.includes(dd.branch))duVoid=dd.ganzhi;
    if(yy&&voids.includes(yy.branch))ayVoid=yy.year+' '+yy.ganzhi;}
  const future=[];
  if(c.now&&c.annualFortunes)c.annualFortunes.filter(a=>a.year>=c.now.year&&a.year<=c.now.year+12).forEach(a=>{if(voids.includes(a.branch))future.push(a.year+'('+a.ganzhi+')');});
  return {voids, duVoid, ayVoid, active:!!ayVoid, future};
}

function kichi4Targets(base){const g=SANGO_KEY[base];const o=g?{...KICHI_NICHI[g]}:{};if(BLOOD[base])o['血刃']=BLOOD[base];return o;}

function kakuOn(c){return KAKU[c.pillars[0].branch]===c.pillars[2].branch;}

function kaigouOn(c){return KAIGOU.has(c.pillars[2].ganzhi);}

function rokubaOn(c){return ROKUBA.has(c.pillars[2].ganzhi);}

function markTimeUnknown(c){
  if(!c||!c.pillars||c.pillars.length<4)return c;
  const tp=c.pillars[3];
  const f=Object.assign({},c.fiveElements||{});
  const sEl=STEM_EL[tp.stem];
  const bEl=tp.branchElement||null;   /* 支の五行（蔵干の流派の考えは使わない） */
  if(f[sEl]>0)f[sEl]--; if(bEl&&f[bEl]>0)f[bEl]--;
  c.fiveElements=f; c.hourPillar=tp; c.pillars=c.pillars.slice(0,3); c.timeUnknown=true;
  return c;
}
/* ---- 大運の第一運＝月柱（0歳〜立運）----
   流派ルール：大運は必ず0歳の月柱からスタート。エンジンの decadeFortunes は立運後の大運のみなので、
   その手前（0歳〜立運）を月柱の期間として別オブジェクトで持つ（decadeFortunes の添字は変えない）。 */
function monthDecade(c){
  try{
    var df=c.decadeFortunes||[], d0=df[0], mp=c.pillars[1]; if(!d0||!mp) return null;
    return {isMonth:true,startAge:0,months:0,endAge:d0.startAge,endMonths:d0.months||0,
      startYear:(c.birth&&c.birth.clock)?+c.birth.clock.slice(0,4):null,
      ganzhi:mp.ganzhi,stem:mp.stem,branch:mp.branch,stemElement:mp.stemElement,branchElement:mp.branchElement,
      tenStar:mp.tenStar,terrain:mp.terrain};
  }catch(e){ return null; }
}
/* 大運の暦の期間（西暦・月）。AIが年齢から西暦を自分で計算して間違えないよう、必ずこの文字列を渡す */
function decadeYears(c,d){
  try{
    if(!d) return '';
    if(d.isMonth){ var d0=(c.decadeFortunes||[])[0]; return d.startYear+(d0?('–'+d0.startYear+'/'+d0.startMonth):''); }
    return d.startYear+'/'+d.startMonth+'–'+(d.startYear+10)+'/'+d.startMonth;
  }catch(e){ return ''; }
}
window.decadeYears=decadeYears;
/* 今いる大運：立運前なら第一運（月柱） */
function curDecade(c){
  if(!c||!c.now) return null;
  var di=c.now.daeunIndex;
  if(di>=0) return (c.decadeFortunes||[])[di]||null;
  return c.monthDecade||monthDecade(c);
}
window.monthDecade=monthDecade; window.curDecade=curDecade;
/* ---- 蔵干は司令だけを使う（運営決定 2026-10-24：教室が指定した司令のみ。ほかの流派の考え（余気・中気・本気の割合など）は持ち込まない） ----
   司令＝節入りからの日数（分）で決まる、その支でいま働いている蔵干。表は計算エンジンと同じもの（[蔵干, この分数まで]）。
   大運・年運の支の司令も、同じく出生の節入りからの日数で決める */
var SIREI={"子":[["壬",13980],["癸",42430]],"丑":[["癸",12720],["辛",16980],["己",42460]],"寅":[["戊",10740],["丙",19260],["甲",42850]],"卯":[["甲",14340],["乙",43500]],"辰":[["乙",13260],["癸",17700],["戊",44250]],"巳":[["戊",11220],["庚",20220],["丙",44900]],"午":[["丙",14940],["己",28500],["丁",45260]],"未":[["丁",13560],["乙",18120],["己",45225]],"申":[["戊",11220],["壬",20160],["庚",44805]],"酉":[["庚",14580],["辛",44130]],"戌":[["辛",13020],["丁",17340],["戊",43380]],"亥":[["戊",10680],["甲",19260],["壬",42765]]};
function sireiStem(br,setsuMin){ var r=SIREI[br]; if(!r) return ''; for(var i=0;i<r.length;i++){ if(setsuMin<r[i][1]) return r[i][0]; } return r[r.length-1][0]; }
function _sireiOnly(c){ try{
  var sm=c.birth&&c.birth.setsuMin;
  function only(p){ if(!p||!p.hiddenStems||!p.hiddenStems.length) return; var h=p.hiddenStems.filter(function(x){ return x.ling; })[0];
    if(!h&&sm!=null){ var st=sireiStem(p.branch,sm); h=p.hiddenStems.filter(function(x){ return x.stem===st; })[0]; }
    if(!h) h=p.hiddenStems[p.hiddenStems.length-1];
    p.hiddenStems=[{stem:h.stem,tenStar:h.tenStar,ling:true,reason:h.reason}]; }
  (c.pillars||[]).forEach(only); if(c.hourPillar&&c.hourPillar!==c.pillars[3]) only(c.hourPillar);
  var dm=c.dayMaster&&c.dayMaster.stem;
  function luck(x){ if(!x||!x.branch||sm==null||!window.Bazi) return; var st=sireiStem(x.branch,sm); if(!st) return; x.sirei=st; x.sireiTenStar=_tenStarOf(dm,st); x.hiddenStem=st; x.hiddenTenStar=x.sireiTenStar; }
  (c.decadeFortunes||[]).forEach(luck); (c.annualFortunes||[]).forEach(luck); if(c.monthDecade) luck(c.monthDecade);
}catch(e){} return c; }
function _tenStarOf(dm,st){ var E=['木','火','土','金','水'], Y='甲丙戊庚壬', a=STEM_EL[dm], b=STEM_EL[st]; if(!a||!b) return ''; var d=(E.indexOf(b)-E.indexOf(a)+5)%5, same=(Y.indexOf(dm)>=0)===(Y.indexOf(st)>=0);
  return [same?'比肩':'劫財',same?'食神':'傷官',same?'偏財':'正財',same?'偏官':'正官',same?'偏印':'印綬'][d]; }
window.sireiStem=sireiStem;
/* ---- Pocket鑑定 互換ラッパ ----
   旧 PersonBazi(y,m,d,hour,minute,timeUnknown,sex) と同じ形を返しつつ、
   .pro にフル命式（大運・年運・十神・蔵干・起運ほか）を持たせる */
window.PersonBazi=function(y,m,d,hour,minute,timeUnknown,sex,place){
  try{
    var opt={year:y,month:m,day:d,hour:(timeUnknown?12:(hour==null?12:hour)),minute:(timeUnknown?0:(minute==null?0:minute)),sex:(sex==='male'?'male':'female'),correctionMode:'none'};
    /* 標準子午線は時刻不明でも渡す（節入り判定を出生国の標準時で行うため。未指定=日本標準時135°） */
    if(place&&place.mer!=null) opt.stdMer=place.mer;
    if(place&&place.lon!=null&&!timeUnknown){ opt.longitude=place.lon; opt.correctionMode='full'; }
    var c=window.Bazi.computeChart(opt);
    if(timeUnknown) c=markTimeUnknown(c);
    c.monthDecade=monthDecade(c);
    _sireiOnly(c);
    /* 年運は立春切り替え：今日の年柱（立春基準）で「今年の年運」の年を決める（1/1〜立春前は前年の干支） */
    try{ if(c.now&&c.annualFortunes&&c.annualFortunes.length){
      var _td=new Date(), _gy=_td.getFullYear();
      var _tp=window.Bazi.computeChart({year:_gy,month:_td.getMonth()+1,day:_td.getDate(),hour:_td.getHours(),minute:_td.getMinutes(),sex:'male',correctionMode:'none'}).pillars[0].ganzhi;
      var _std=c.annualFortunes.find(function(a){return a.year===_gy;});
      c.now.calYear=_gy; c.now.year=(_std&&_std.ganzhi!==_tp)?_gy-1:_gy;
    } }catch(_e){}
    var setsuBoundary=null;
    if(timeUnknown){ try{
      var _sa=window.Bazi.computeChart({year:y,month:m,day:d,hour:0,minute:0,sex:(sex==='male'?'male':'female'),correctionMode:'none',stdMer:opt.stdMer});
      var _sb=window.Bazi.computeChart({year:y,month:m,day:d,hour:23,minute:59,sex:(sex==='male'?'male':'female'),correctionMode:'none',stdMer:opt.stdMer});
      var _yc=_sa.pillars[0].ganzhi!==_sb.pillars[0].ganzhi, _mc=_sa.pillars[1].ganzhi!==_sb.pillars[1].ganzhi;
      if(_yc||_mc) setsuBoundary={year:_yc?[_sa.pillars[0].ganzhi,_sb.pillars[0].ganzhi]:null, month:_mc?[_sa.pillars[1].ganzhi,_sb.pillars[1].ganzhi]:null};
    }catch(_e){} }
    var kk=_kkAssess(c);
    var fav={},grpMap={};
    SHENG.forEach(function(el){var a=kk.assess(el);fav[el]=a.fav;grpMap[el]=a.grp;});
    var st=strengthType(c);
    return { ok:true, dayMaster:c.dayMaster,
      pillars:c.pillars.map(function(p){return {stem:p.stem,branch:p.branch,ganzhi:p.ganzhi,terrain:p.terrain,label:p.label,tenStar:p.tenStar,hiddenStems:p.hiddenStems};}),
      hourPillar:c.hourPillar||null,
      five:c.fiveElements, sType:st, fav:fav, grp:grpMap,
      timeUnknown:!!timeUnknown, setsuBoundary:setsuBoundary, pro:c };
  }catch(e){ return {ok:false,error:String(e&&e.message||e)}; }
};

/* ---- 神殺（日干・日支ベースの主要吉凶星）を命式の地支と照合 ---- */
/* 命式の中の天地徳合（日柱との分と、ほかの柱どうしの分）。軽いモデルにも渡す（運営決定 2026-10-23：必ず触れる） */
window.tenchiNote=function(pro){ try{ var L=[];
  var AREA={年:'their family and roots (ja: 家族や生まれ育ち)',月:'their work, social life and parents (ja: 仕事や人付き合い)',日:'themselves and their partner (ja: あなた自身とパートナー)',時:'their future and children (ja: これからの人生や子ども)'};
  dayPillarBonds(pro).forEach(function(r){ if(r.kind==='天地徳合') L.push('THEMSELVES (day pillar) is perfectly united with '+(AREA[r.to]||r.to)+' ('+r.to+'-pillar '+r.gz+')'); });
  natalRelations(pro).forEach(function(r){ if(r.kind==='天地徳合') L.push((AREA[r.pillars[0]]||r.pillars[0])+' is perfectly united with '+(AREA[r.pillars[1]]||r.pillars[1])+' ('+r.branches.join(' × ')+')'); });
  return L.length?('[CHART FACT — PERFECT UNION 天地徳合: '+L.join('; ')+' — stem and branch both unite: a rare, defining bond. When you talk about their nature, love, marriage, partner or family, mention it in plain words by the LIFE AREAS above (e.g. 「あなた自身と、仕事や人付き合いの場が、天と地の両方でぴったり結びつく珍しい形」) — never say 年の柱/月の柱/日の柱/時の柱 or "month pillar", and never the term 天地徳合 in casual chat; in small talk only when it fits.]\n'):''; }catch(e){ return ''; } };
/* 華蓋の位置と数（月支が基準。教室資料⑤）。位置ごとの意味を添えて渡す（運営決定 2026-10-23） */
/* 星の位置：どの柱にあるか＝暮らしのどの場面に出るか（運営決定 2026-10-23。華蓋は資料の意味で別に渡す） */
var PILLAR_AREA=[{k:'年柱',en:'family, roots and childhood',ja:'家族や生まれ育ち・子どものころ'},{k:'月柱',en:'work, society and parents',ja:'仕事や社会・人付き合い・親'},{k:'日柱',en:'themselves and their partner',ja:'自分自身とパートナー'},{k:'時柱',en:'the future, later life and children',ja:'これからの人生・子ども'}];
window.STAR_MEAN_TXT=function(n){ try{ return (STAR_MEAN[n]||'').split(' — ')[0]; }catch(e){ return ''; } };
window.starPlacements=function(pro){ try{ var out=[];
  (window.shinsatsuHits?window.shinsatsuHits(pro):[]).forEach(function(h){
    var m=h.match(/^(.+?)\((.)\)$/), name=m?m[1]:h, tg=m?m[2]:'', at=[];
    if(name==='華蓋') return;
    if(tg){ pro.pillars.forEach(function(p,i){ if(p&&(p.branch===tg||p.stem===tg)&&at.indexOf(i)<0) at.push(i); }); }
    else if(name==='隔角') at=[0,2]; else at=[2];   /* 魁罡・日刃・禄馬は日柱そのもの */
    if(at.length) out.push({name:name,at:at}); });
  return out; }catch(e){ return []; } };
window.starPlacementNote=function(pro){ try{ var sp=starPlacements(pro); if(!sp.length) return '';
  return '[STAR PLACEMENT — where each star sits = the area of life where its quality shows up] '+sp.map(function(x){ return x.name+' → '+x.at.map(function(i){ return PILLAR_AREA[i].k+' ('+PILLAR_AREA[i].en+')'; }).join(' + '); }).join('; ')
    +'. When you mention a star\u2019s quality, always say WHERE in their life it shows up, in plain words (e.g. 「その強さは、仕事や人付き合いの場で出やすい」「子どものころから家族の中で〜」) — never the star or pillar names. A star in the day pillar is about them and their partner most directly.\n'; }catch(e){ return ''; } };
window.kagaiInfo=function(pro){ try{
  var mb=pro.pillars[1]&&pro.pillars[1].branch, tg=mb&&GETSU_STARS['華蓋'][mb]; if(!tg) return null;
  var LAB=['年柱','月柱','日柱','時柱'], at=[];
  pro.pillars.forEach(function(p,i){ if(p&&p.branch===tg) at.push(i); });
  return at.length?{branch:tg,at:at.map(function(i){ return LAB[i]; })}:null; }catch(e){ return null; } };
window.kagaiNote=function(pro){ try{ var k=kagaiInfo(pro); if(!k) return '';
  var M={年柱:'in the YEAR pillar (family and roots): drawn to spiritual or deep things since childhood; the teachings of grandparents and elders, and traditional things, sharpen their sensitivity and form the base of how they think and act',
    月柱:'in the MONTH pillar (work and social life): success in work that uses their drive to go deep — art, research, craftsmanship, any field that asks for real expertise',
    日柱:'in the DAY pillar (themselves and their partner): their inner world grows through the relationship with their partner; when they feel lonely, putting their values and feelings into words and listening closely to the partner deepens the bond — knowing how each sees the world is the key',
    時柱:'in the HOUR pillar (the future and the next generation): what they have devoted themselves to and pursued wholeheartedly will leave a good influence on later generations; acting with the next generation and the future in mind creates unseen connections'};
  var t='[華蓋 — the star of art, spirituality and going deep; '+k.at.length+' in the chart] '+k.at.map(function(a){ return M[a]; }).join(' / ');
  if(k.at.length>=2) t+=' / With '+k.at.length+' of them: the power to master several fields until they are called first-class.';
  return t+'. Use this when you talk about their nature, talents, work, calling, partner or future: say it in plain everyday words with an example from real life (never the term 華蓋 or the pillar names).\n'; }catch(e){ return ''; } };
function yearToka(c){ try{ var g=SANGO_KEY[c.pillars[0].branch]; return (g&&KICHI_NICHI[g]&&KICHI_NICHI[g]['咸池'])||''; }catch(e){ return ''; } }
function shinsatsuHits(c){
  var hits=[];
  try{
    var natal=c.pillars.map(function(p){return p.branch;});
    var tbl=KICHI_NIKKAN[c.dayMaster.stem]||{};
    Object.keys(tbl).forEach(function(name){
      var tg=tbl[name]; (Array.isArray(tg)?tg:[tg]).forEach(function(b){ if(natal.indexOf(b)>=0) hits.push(name+'('+b+')'); });
    });
    var d4=kichi4Targets(c.pillars[2].branch)||{};
    Object.keys(d4).forEach(function(name){ if(natal.indexOf(d4[name])>=0) hits.push(name+'('+d4[name]+')'); });
    /* 年支からも見る（教室資料 ⑥「年支・日支」。咸池・駅馬・劫殺・亡神・血刃・囚獄。運営決定 2026-10-23） */
    var y4=kichi4Targets(c.pillars[0].branch)||{};
    Object.keys(y4).forEach(function(name){ var h=name+'('+y4[name]+')'; if(natal.indexOf(y4[name])>=0&&hits.indexOf(h)<0) hits.push(h); });
    if(NICHIJIN.has(c.pillars[2].ganzhi)) hits.push('日刃');
    if(kakuOn(c)) hits.push('隔角');
    /* 月支から見る星（天徳貴人・月徳貴人・天徳合・月徳合は天干、天徳貴人の地支の分と華蓋は地支） */
    var mb=c.pillars[1]&&c.pillars[1].branch, stems=c.pillars.map(function(p){return p.stem;});
    if(mb) Object.keys(GETSU_STARS).forEach(function(name){ var tg=GETSU_STARS[name][mb]; if(!tg) return; var isBr=/[子丑寅卯辰巳午未申酉戌亥]/.test(tg);
      if(isBr?natal.indexOf(tg)>=0:stems.indexOf(tg)>=0) hits.push(name+'('+tg+')'); });
    if(kaigouOn(c)) hits.push('魁罡');
    if(rokubaOn(c)) hits.push('禄馬');
  }catch(e){}
  return hits;
}

/* ---- Gemini 用グラウンディング（プロ仕様の根拠データを文字列化） ---- */
function proGrounding(c){
  try{
    var L=[];
    if(c.genmei) L.push('Genmei(元命/core star): '+c.genmei.tenStar);
    L.push('Pillars: '+c.pillars.map(function(p){
      var hs=(p.hiddenStems||[]).map(function(h){return h.stem+(h.tenStar?('='+h.tenStar):'');}).join(',');
      return p.label+' '+p.ganzhi+'['+(p.tenStar||'-')+'/'+(p.terrain||'-')+(hs?('/hidden:'+hs):'')+']';
    }).join(' / '));
    var gb=gogyoBalance(c);
    L.push('Strength score: '+gb.sScore+' => '+strengthType(c)+' (得令:'+(gb.tokurei?'yes':'no')+', 月支十二運:'+gb.monthTerr+')');
    var kk=_kkAssess(c), favEls=[],imEls=[];
    SHENG.forEach(function(el){var a=kk.assess(el); if(a.fav==='喜')favEls.push(el); if(a.fav==='忌')imEls.push(el);});
    L.push('Favorable elements(喜): '+(favEls.join(',')||'-')+' / Unfavorable(忌): '+(imEls.join(',')||'-'));
    var tk=gogyoTaika(c); if(tk&&tk.baseTaika&&tk.baseTaika.length) L.push('Excess elements(過多): '+tk.baseTaika.join(','));
    if(c.startFortune) L.push('Decade luck: age 0 to '+c.startFortune.years+'y'+c.startFortune.months+'m = month pillar '+(c.pillars[1]?c.pillars[1].ganzhi:'')+' (first period); from '+c.startFortune.years+'y'+c.startFortune.months+'m the 10-year decades change, direction:'+(c.startFortune.forward?'forward':'reverse'));
    if(c.now&&c.decadeFortunes){
      if(c.now.daeunIndex>=0){
        var dd=c.decadeFortunes[c.now.daeunIndex];
        if(dd) L.push('Current decade luck(大運): '+dd.ganzhi+' ['+dd.tenStar+'/'+dd.terrain+'] age '+dd.startAge+'y'+(dd.months||0)+'m to '+dd.endAge+'y'+(dd.months||0)+'m = calendar '+decadeYears(c,dd)+' (use THESE years; never compute them yourself)');
        var next=c.decadeFortunes[c.now.daeunIndex+1];
        if(next) L.push('Next decade luck: '+next.ganzhi+' ['+next.tenStar+'] from age '+next.startAge+'y'+(next.months||0)+'m = from '+next.startYear+'/'+next.startMonth);
      } else {
        var md=c.monthDecade||monthDecade(c), d0=c.decadeFortunes[0];
        if(md) L.push('Current decade luck(大運): FIRST period = the month pillar '+md.ganzhi+' ['+md.tenStar+'/'+md.terrain+'] age 0 to '+md.endAge+'y'+(md.endMonths||0)+'m = calendar '+decadeYears(c,md)+' (大運 always starts at age 0 from the month pillar)');
        if(d0) L.push('Next decade luck: '+d0.ganzhi+' ['+d0.tenStar+'] from age '+d0.startAge+'y'+(d0.months||0)+'m = from '+d0.startYear+'/'+d0.startMonth);
      }
    }
    if(c.now&&c.annualFortunes){
      var thisY=c.annualFortunes.find(function(a){return a.year===c.now.year;});
      var nextY=c.annualFortunes.find(function(a){return a.year===c.now.year+1;});
      if(thisY) L.push('This year('+thisY.year+'): '+thisY.ganzhi+' ['+thisY.tenStar+'/'+thisY.terrain+']'+((c.now.calYear&&c.now.calYear!==c.now.year)?(' — NOTE: today is before 立春 (Risshun, ~Feb 4), so the annual luck is STILL '+thisY.year+'\'s '+thisY.ganzhi+'; '+c.now.calYear+'\'s annual luck starts at 立春'):''));
      if(nextY) L.push('Next year('+nextY.year+'): '+nextY.ganzhi+' ['+nextY.tenStar+'/'+nextY.terrain+']');
    }
    var ku=kubo(c); L.push('Void branches(空亡): '+ku.join(','));
    var kn=kuuboNow(c); if(kn){ if(kn.duVoid) L.push('NOTE: current decade luck is void(空亡): '+kn.duVoid); if(kn.ayVoid) L.push('NOTE: this year is void(空亡): '+kn.ayVoid); }
    var ss=shinsatsuHits(c); if(ss.length) L.push('Special stars(神殺): '+ss.join(', '));
    return L.join('\n');
  }catch(e){ return ''; }
}
window.proGrounding=proGrounding;
window.shinsatsuHits=shinsatsuHits;

/* ============================================================
   相性（compat）— 四柱推命pro の干支60×60ロジックを移植
   干合/支合(六合)/三合/冲/刑/破/害 と 十神 を構造データで返す。
   文言は index.html 側で多言語化。
   ============================================================ */
var CP_KANGO={甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊'};
var CP_RIKUGO={子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
var CP_SANGO=[['申','子','辰','水'],['亥','卯','未','木'],['寅','午','戌','火'],['巳','酉','丑','金']];
var CP_GAI={子:'未',未:'子',丑:'午',午:'丑',寅:'巳',巳:'寅',卯:'辰',辰:'卯',申:'亥',亥:'申',酉:'戌',戌:'酉'};
var CP_HA={子:'酉',酉:'子',丑:'辰',辰:'丑',寅:'亥',亥:'寅',卯:'午',午:'卯',巳:'申',申:'巳',未:'戌',戌:'未'};
var CP_BR_EL={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
var CP_KEI2={子:'卯',卯:'子'};
var CP_KEI3=[['寅','巳','申'],['丑','戌','未']];
var CP_JIKEI={辰:1,午:1,酉:1,亥:1};
var CP_YANG={甲:1,丙:1,戊:1,庚:1,壬:1};
function cpBi(b){ return BR.indexOf(b); }
function cpChong(a,b){ return (cpBi(a)+6)%12===cpBi(b); }
function cpSango(a,b){ if(a===b)return false; return CP_SANGO.some(function(g){return g.slice(0,3).indexOf(a)>=0&&g.slice(0,3).indexOf(b)>=0;}); }
function cpKei(a,b){ if(CP_KEI2[a]===b)return true; if(a===b&&CP_JIKEI[a])return true; return CP_KEI3.some(function(g){return a!==b&&g.indexOf(a)>=0&&g.indexOf(b)>=0;}); }
var CP_SHENG=['木','火','土','金','水'];
function cpStemEl(s){ return STEM_EL[s]||'木'; }
function cpTenStar(dayStem,target){
  var di=CP_SHENG.indexOf(cpStemEl(dayStem)), ti=CP_SHENG.indexOf(cpStemEl(target));
  var diff=((ti-di)%5+5)%5, same=(!!CP_YANG[dayStem])===(!!CP_YANG[target]);
  return [['比肩','劫財'],['食神','傷官'],['偏財','正財'],['偏官','正官'],['偏印','印綬']][diff][same?0:1];
}
window.compatData=function(cA,cB){
  var aS=(cA.dayMaster&&cA.dayMaster.stem)||'甲', bS=(cB.dayMaster&&cB.dayMaster.stem)||'甲';
  var aB=(cA.pillars[2]||{}).branch, bB=(cB.pillars[2]||{}).branch;
  var aEl=cpStemEl(aS), bEl=cpStemEl(bS);
  var kangou=(CP_KANGO[aS]===bS);
  var stemRel; if(aEl===bEl) stemRel='same';
  else { var d=((CP_SHENG.indexOf(bEl)-CP_SHENG.indexOf(aEl))%5+5)%5;
    stemRel=(d===1)?'aGenB':(d===4)?'bGenA':(d===2)?'aKeB':'bKeA'; }
  var rikugou=(CP_RIKUGO[aB]===bB), sango=cpSango(aB,bB), chong=cpChong(aB,bB),
      kei=cpKei(aB,bB), ha=(CP_HA[aB]===bB), gai=(CP_GAI[aB]===bB);
  /* 二人の命式の支を持ち寄って三合/方合が完成＝相性吉（片方の命式内だけで完結するものは除く） */
  var abr=(cA.pillars||[]).map(function(p){return p.branch;}), bbr=(cB.pillars||[]).map(function(p){return p.branch;});
  var seiritsu=[];
  [[CP_SANGO,'三合成立'],[FP_HOUGO,'方合成立']].forEach(function(pair){
    pair[0].forEach(function(g){ var need=g.slice(0,3);
      var inA=need.filter(function(x){return abr.indexOf(x)>=0;}), inB=need.filter(function(x){return bbr.indexOf(x)>=0;});
      var union=need.filter(function(x){return abr.indexOf(x)>=0||bbr.indexOf(x)>=0;});
      if(union.length===3&&inA.length>=1&&inB.length>=1&&inA.length<3&&inB.length<3)
        seiritsu.push({kind:pair[1],el:g[3],inA:inA,inB:inB});
    });
  });
  var score=60;
  if(kangou)score+=18; if(rikugou)score+=14; if(sango)score+=12;
  seiritsu.forEach(function(s){ score+=(s.kind==='三合成立'?14:12); });
  if(stemRel==='same')score+=6; else if(stemRel==='aGenB'||stemRel==='bGenA')score+=10; else score-=6;
  if(chong)score-=14; if(kei)score-=10; if(ha)score-=4; if(gai)score-=6;
  score=Math.max(24,Math.min(98,score));
  // 主要な関係キー（強い順）
  var head; if(kangou)head='kangou'; else if(seiritsu.length)head='sango'; else if(rikugou)head='rikugou'; else if(sango)head='sango';
    else if(chong)head='chong'; else if(kei)head='kei'; else head=stemRel;
  return { aS:aS,bS:bS,aEl:aEl,bEl:bEl, kangou:kangou, stemRel:stemRel, rikugou:rikugou,
    sango:sango, seiritsu:seiritsu, chong:chong, kei:kei, ha:ha, gai:gai,
    tenAtoB:cpTenStar(aS,bS), tenBtoA:cpTenStar(bS,aS), score:score, head:head,
    good:(score>=60) };
};
/* ============================================================
   相性（くわしく）— 2人の命式の「すべての柱どうし」を突き合わせる（運営決定 2026-10-22）
   ・柱どうし：干合・律音・支合・半会（三合の2つ）・冲・天戦地冲・刑（相刑・三刑・自刑）・破・害
   ・2人で完成する三合・方合
   ・強さ：日柱どうし＝強／片方が日柱＝中／それ以外＝弱（関係そのものに近い柱ほど強く出る）
   ・日干の関係（相生＝良い点、相剋＝注意点）と、相手が自分の喜神（助けになる五行）を持っているか
   ・良い点／注意点の合計（重み：強3・中2・弱1。2人で完成する三合・方合は 強4・中3・弱2）
   ・柱の場面：年柱＝家族・実家・目上／月柱＝仕事・社会・親／日柱＝自分そのもの・パートナー／時柱＝将来・子ども・目下
   ============================================================ */
var CP_KE={木:'土',土:'水',水:'火',火:'金',金:'木'};
var CP_PL=['年柱','月柱','日柱','時柱'];
var CP_PL_EN=['year pillar (family, home & elders)','month pillar (work, society & parents)','day pillar (the person themselves & partner)','hour pillar (future, children & juniors)'];
function cpStemClash(a,b){ var ea=cpStemEl(a), eb=cpStemEl(b); return (!!CP_YANG[a])===(!!CP_YANG[b]) && (CP_KE[ea]===eb||CP_KE[eb]===ea); }
function cpHalf(a,b){ if(a===b) return ''; var g=CP_SANGO.find(function(t){ return t.slice(0,3).indexOf(a)>=0&&t.slice(0,3).indexOf(b)>=0; }); return g?g[3]:''; }
function cpKeiKind(a,b){ if(CP_KEI2[a]===b) return '相刑'; if(a===b&&CP_JIKEI[a]) return '自刑'; if(CP_KEI3.some(function(g){return a!==b&&g.indexOf(a)>=0&&g.indexOf(b)>=0;})) return '三刑'; return ''; }
/* ===== PRO の相性の決まりを、そのまま Pocket 鑑定にも入れる（運営指示 2026-10-24「ロジックをフルで使って」） =====
   基準＝PRO（pro/app-pro.html の compatBalance・crossStars・attractionDir・compatRoles・checkPoints）と鑑定者本人の表。星の表は Pocket の表（教室資料と303項目一致）を使う。
   ・律音は3つだけ：日柱どうし（合わせ鏡の縁・×1.5）／本人の月柱×相手の日柱（本人の社会運・仕事運アップ）／本人の日柱×相手の月柱（相手の社会運・仕事運アップ）
   ・天地徳合＝×1.5（干合・支合は別に数えない）／天戦地冲＝×1.5（冲は別に数えない）／害・破・半合＝×0.5／半合は子午卯酉を含む2支だけ
   ・2人で完成する三合・方合＝重み＋1／惹かれ合う星（両方向・1方向の合計は1点まで）／五行の補い合い（喜神だけ。中和の人は喜神なし）／日干の相生・相剋 */
function pkRelKindNow(){ try{ return (window.pkRelKindPocket&&window.pkRelKindPocket())||'love'; }catch(e){ return 'love'; } }
var PK_CROSS={咸池:['異性として強く惹かれる相手（桃花）','恋愛の相手として強く惹かれやすい相手'],紅艶:['色気・華やかさに惹かれる相手','つい目で追ってしまう魅力を感じる相手'],天乙貴人:['困ったときに助けてくれる存在','助けてくれる存在'],天徳貴人:['守ってくれる存在','守ってくれる存在'],月徳貴人:['守ってくれる存在','守ってくれる存在'],大極貴人:['支えになる・ありがたい存在','支えになるありがたい存在'],福星貴人:['幸せを運んでくれる存在','幸せを運んでくれる存在']};
/* x（見る人）の星が、相手の柱 p に当たるか。日干の表・年支と日支の表・月支の表（天徳貴人・月徳貴人は天干・地支・司令の蔵干） */
function pkStarsOn(x,p){ var out=[]; try{ var t=KICHI_NIKKAN[x.dayMaster.stem]||{};
  [['天乙貴人','天乙貴人'],['太極貴人','大極貴人'],['福星貴人','福星貴人'],['紅艶','紅艶'],['文昌貴人','文昌貴人']].forEach(function(q){ if((t[q[0]]||[]).indexOf(p.branch)>=0) out.push(q[1]); });
  [x.pillars[0],x.pillars[2]].forEach(function(bp){ if(!bp) return; var k4=kichi4Targets(bp.branch)||{}; if(k4['咸池']===p.branch&&out.indexOf('咸池')<0) out.push('咸池'); if(k4['驛馬']===p.branch&&out.indexOf('駅馬')<0) out.push('駅馬'); });
  var mb=x.pillars[1]&&x.pillars[1].branch, hs=(p.hiddenStems||[]).map(function(h){ return h.stem; });
  [['天德貴人','天徳貴人'],['月德貴人','月徳貴人']].forEach(function(q){ var tg=mb&&GETSU_STARS[q[0]]&&GETSU_STARS[q[0]][mb]; if(tg&&(tg===p.stem||tg===p.branch||hs.indexOf(tg)>=0)) out.push(q[1]); });
}catch(e){} return out; }
function pkCrossStars(x,y,love){ var by={}; (y.pillars||[]).forEach(function(p,j){ if(!p||!p.stem) return; pkStarsOn(x,p).forEach(function(k){ if(!PK_CROSS[k]) return; if(!love&&(k==='咸池'||k==='紅艶')) return; (by[k]=by[k]||[]).push({j:j,label:CP_PL[j],gz:p.ganzhi}); }); });
  return Object.keys(by).map(function(k){ return {star:k,at:by[k],day:by[k].some(function(q){ return q.j===2; }),mean:PK_CROSS[k][0],plain:PK_CROSS[k][1]}; }); }
window.pkCrossStars=pkCrossStars;
/* 惹かれ方の向き（恋愛の星＝咸池・紅艶がどちら向きに当たるか・強さ） */
function pkAttractionDir(a,b,sameSex){ try{ var LOVE=['咸池','紅艶'], ab=pkCrossStars(a,b,true), ba=pkCrossStars(b,a,true), W=sameSex?'恋愛の相手として':'異性として';
  function sp(L){ return {love:L.filter(function(c){ return LOVE.indexOf(c.star)>=0; }).map(function(c){ return c.star; }),help:L.filter(function(c){ return LOVE.indexOf(c.star)<0; }).map(function(c){ return c.star; })}; }
  function pow(L){ var lv=L.filter(function(c){ return LOVE.indexOf(c.star)>=0; }); if(!lv.length) return null; var day=lv.some(function(c){ return c.day; }), pt=lv.length+(day?1:0);
    return {lab:pt>=3?'強い':(pt===2?'中くらい':'弱め'),plain:pt>=3?'とても':(pt===2?'':'少し'),why:lv.map(function(c){ return c.star; }).join('と')+(lv.length>1?'の両方':'だけ')+'・'+(day?'日柱にも当たる':'日柱には当たらない')}; }
  var x=sp(ab), y=sp(ba), px=pow(ab), py=pow(ba), v;
  if(x.love.length&&y.love.length) v='2人とも、お互いに'+W+'惹かれやすい（本人：'+px.lab+'＝'+px.why+'／お相手：'+py.lab+'＝'+py.why+'）';
  else if(x.love.length) v='本人のほうが、お相手に'+W+px.plain+'惹かれやすい（'+px.lab+'＝'+px.why+'）'+(y.help.length?'。お相手は本人に、ときめきより安心・支えを感じやすい':'');
  else if(y.love.length) v='お相手のほうが、本人に'+W+py.plain+'惹かれやすい（'+py.lab+'＝'+py.why+'）'+(x.help.length?'。本人はお相手に、ときめきより安心・支えを感じやすい':'');
  else v='恋愛の星はどちら向きにも当たらない（惹かれ方は合・律音などで見る）。「お互いに惹かれ合う」とは言わない';
  return {line:v,x:x,y:y,mutual:!!(x.love.length&&y.love.length)}; }catch(e){ return null; } }
window.pkAttractionDir=pkAttractionDir;
window.compatDeep=function(pA,pB,favA,favB){
  var items=[], kind=pkRelKindNow(), love=(kind==='love');
  function W(i,j){ return (i===2&&j===2)?3:((i===2||j===2)?2:1); }
  function G(w){ return w>=3?'強':(w>=2?'中':'弱'); }
  function add(k,good,i,j,w,detail,desc,g){ items.push({k:k,good:good,g:g||G(W(i,j)),w:w,ai:i,bj:j,detail:detail||'',desc:desc||''}); }   /* 強・中・弱は柱で決める（重みの0.5倍・1.5倍では変えない） */
  (pA.pillars||[]).forEach(function(a,i){ if(!a||!a.stem) return; (pB.pillars||[]).forEach(function(b,j){ if(!b||!b.stem) return;
    var w=W(i,j), ba=a.branch, bb=b.branch, kan=CP_KANGO[a.stem]===b.stem, shi=CP_RIKUGO[ba]===bb, ch=cpChong(ba,bb), ts=ch&&cpStemClash(a.stem,b.stem);
    if(a.ganzhi===b.ganzhi&&((i===2&&j===2)||(i===1&&j===2)||(i===2&&j===1))){
      if(i===2&&j===2) add('律音（日柱どうし）',1,i,j,w*1.5,a.ganzhi,'日柱の干支がまったく同じ＝合わせ鏡の縁。相手の中にもう一人の自分を見るように強くわかり合え、心強い理解者になる（ただし別の人間だと忘れず、相手をコントロールしない・「わかってくれるはず」と甘えない）','強');
      else if(i===1) add('律音（本人の月柱×お相手の日柱）',1,i,j,w,a.ganzhi,'本人の社会運・仕事運がアップする縁。本人のビジョンや目標を、お相手が心から応援し支えてくれる');
      else add('律音（本人の日柱×お相手の月柱）',1,i,j,w,a.ganzhi,'お相手の社会運・仕事運がアップする縁。本人が自分らしいやり方で、お相手の縁の下の力持ちになれる'); }
    if(kan&&shi){ add('天地徳合',1,i,j,w*1.5,a.ganzhi+'×'+b.ganzhi,'天干が干合し、地支も支合する。強く結びつく良い縁'); return; }
    if(ts){ add('天戦地冲',0,i,j,w*1.5,a.ganzhi+'×'+b.ganzhi,'天干どうしが同じ陰陽で剋し合い、地支も冲。いちばん強いぶつかり'); return; }
    if(kan) add('干合',1,i,j,w,a.stem+b.stem,'天干どうしが引き合う（心が引かれ合う）');
    if(shi) add('支合',1,i,j,w,ba+bb,'地支どうしが結びつく（一緒にいて落ち着く）');
    if(ch) add('冲',0,i,j,w,ba+bb,'地支どうしが真向かいでぶつかる（すれ違い・急な変化）');
    var kk=ch?'':cpKeiKind(ba,bb); if(kk) add('刑',0,i,j,w,kk+' '+ba+bb,'地支どうしがこじれやすい（摩擦）');
    if(CP_GAI[ba]===bb) add('害',0,i,j,w*0.5,ba+bb,'見えないすれ違い（軽め）');
    if(CP_HA[ba]===bb) add('破',0,i,j,w*0.5,ba+bb,'小さなほころび（軽め）');
    if(ba!==bb&&(FP_CARDINAL[ba]||FP_CARDINAL[bb])&&CP_SANGO.some(function(g){ return g.slice(0,3).indexOf(ba)>=0&&g.slice(0,3).indexOf(bb)>=0; })){ var hf=CP_SANGO.filter(function(g){ return g.slice(0,3).indexOf(ba)>=0&&g.slice(0,3).indexOf(bb)>=0; })[0][3]; add('半会',1,i,j,w*0.5,ba+bb+'→'+hf,'三合の3つのうち2つがそろう＝半会（協力し合える）'); }
  }); });
  /* 2人で完成する三合・方合（どちらか1人だけでは揃わない） */
  [[CP_SANGO,'三合'],[FP_HOUGO,'方合']].forEach(function(pair){ pair[0].forEach(function(t){ var need=t.slice(0,3), ai=[], bj=[];
    (pA.pillars||[]).forEach(function(p,i){ if(p&&need.indexOf(p.branch)>=0) ai.push(i); }); (pB.pillars||[]).forEach(function(p,j){ if(p&&need.indexOf(p.branch)>=0) bj.push(j); });
    var inA=need.filter(function(x){ return (pA.pillars||[]).some(function(p){ return p&&p.branch===x; }); }), inB=need.filter(function(x){ return (pB.pillars||[]).some(function(p){ return p&&p.branch===x; }); });
    var union=need.filter(function(x){ return inA.indexOf(x)>=0||inB.indexOf(x)>=0; });
    if(union.length===3&&inA.length&&inB.length&&inA.length<3&&inB.length<3){ var dA=ai.indexOf(2)>=0, dB=bj.indexOf(2)>=0, w=(dA&&dB)?3:((dA||dB)?2:1);
      items.push({k:pair[1],good:1,g:G(w),w:w+1,aiList:ai,bjList:bj,detail:need.join('')+'('+t[3]+')',desc:'2人の地支を合わせると'+need.join('')+'がそろい、'+t[3]+'の力がまとまる（2人で協力し合える強い縁）'}); } }); });
  /* 惹かれ合う星（両方向・1方向の合計は1点まで） */
  try{ [[pA,pB,'本人','お相手'],[pB,pA,'お相手','本人']].forEach(function(q){ var L=pkCrossStars(q[0],q[1],love), sum=L.reduce(function(t,c){ return t+(c.day?2:1)*0.5; },0), k=sum>1?1/sum:1;
    L.forEach(function(c){ items.push({k:q[2]+'の'+c.star+'が'+q[3]+'に',good:1,g:c.day?'中':'弱',w:Math.floor((c.day?2:1)*0.5*k*100+1e-9)/100,cross:true,detail:q[3]+'の'+c.at.map(function(z){ return z.label+'「'+z.gz+'」'; }).join('・'),desc:q[2]+'から見て、'+q[3]+'は'+c.mean}); }); }); }catch(e){}
  /* 五行の補い合い（喜神だけ） */
  var E=['木','火','土','金','水'], fa=E.filter(function(e){ return favA&&favA[e]==='喜'; }), fb=E.filter(function(e){ return favB&&favB[e]==='喜'; });
  var helpA=fa.filter(function(e){ return ((pB.fiveElements||{})[e]||0)>=1; }), helpB=fb.filter(function(e){ return ((pA.fiveElements||{})[e]||0)>=1; });
  if(helpA.length&&helpB.length) items.push({k:'五行の補い合い',good:1,g:'中',w:2,detail:'相手→本人:'+helpA.join('')+' / 本人→相手:'+helpB.join(''),desc:'お互いが、相手を助ける五行（喜神）を持っている'});
  else if(helpA.length||helpB.length) items.push({k:'五行の補い合い（片方だけ）',good:1,g:'弱',w:1,detail:helpA.length?('相手→本人:'+helpA.join('')):('本人→相手:'+helpB.join('')),desc:'片方が、相手を助ける五行（喜神）を持っている'});
  /* 日干の関係（干合は上で数える） */
  var aS=pA.dayMaster.stem, bS=pB.dayMaster.stem, ea=cpStemEl(aS), eb=cpStemEl(bS), dayRel;
  if(CP_KANGO[aS]===bS) dayRel='干合';
  else if(ea===eb) dayRel='同じ五行';
  else if(CP_SHENG[(CP_SHENG.indexOf(ea)+1)%5]===eb) dayRel='相生(本人→相手)';
  else if(CP_SHENG[(CP_SHENG.indexOf(eb)+1)%5]===ea) dayRel='相生(相手→本人)';
  else dayRel=(CP_KE[ea]===eb)?'相剋(本人が相手を剋す)':'相剋(相手が本人を剋す)';
  if(/^相剋/.test(dayRel)) items.push({k:'日干の相剋',good:0,g:'弱',w:1,detail:aS+'×'+bS,desc:'考え方の違いで刺激し合う'});
  if(/^相生/.test(dayRel)) items.push({k:'日干の相生',good:1,g:'弱',w:1,detail:aS+'×'+bS,desc:'自然に助け合える'});
  var good=0, caution=0; items.forEach(function(it){ if(it.good) good+=it.w; else caution+=it.w; }); good=+good.toFixed(1); caution=+caution.toFixed(1);
  var net=+(good-caution).toFixed(1), verdict;
  if(good===0&&caution===0) verdict='目立った良い点も注意点もない、ふつうの組み合わせ';
  else if(net>=3&&good>=caution*1.5) verdict='良い点が注意点を上回る組み合わせ';
  else if(net<=-3&&caution>=good*1.5) verdict='注意点が良い点を上回る組み合わせ';
  else verdict='良い点と注意点が同じくらいで、打ち消し合う組み合わせ';
  var order={強:0,中:1,弱:2}; items.sort(function(x,y){ return (y.good-x.good)||(order[x.g]-order[y.g])||(y.w-x.w); });
  return {items:items, good:good, caution:caution, diff:net, verdict:verdict, dayRel:dayRel, helpA:helpA, helpB:helpB, bHasHour:!!(pB.pillars||[])[3], kind:kind, _a:pA, _b:pB, _fa:favA, _fb:favB};
};
/* ===== 2人の役割と場面（PRO の compatRoles ①〜⑤）・お相手を知るためのチェックポイント（PRO の checkPoints） ===== */
var PK_ROLE_TS={
  比劫:{love:'友だちのように対等な相手。気が合うぶん、張り合いやすい',work:'仲間であり、ライバルでもある相手。役割と取り分を先に決めておくとうまくいく',friend:'対等な仲間。張り合わずに認め合うと長く続く',family:'きょうだいや友だちのように対等な関係。張り合いやすい'},
  食傷:{love:'一緒にいると気持ちを表に出せて楽しい相手。自分が世話をしたり楽しませたりする側になりやすい',work:'自分が力を出してあげる相手（部下・生徒・お客様）。教える・任せると伸びる',friend:'一緒にいると楽しく、自分が話を引き出す側になりやすい',family:'自分が世話を焼き、育てる側になりやすい関係（親から子を見たときの典型）'},
  財:{love:'自分が大切にしたい、手に入れたいと思いやすい相手',work:'お金やチャンスを運んでくれやすい相手（お客様・取引先）',friend:'一緒に動くと実りがある相手',family:'自分が面倒を見て、管理したくなる関係（口を出しすぎに注意）'},
  官殺:{love:'自分をきちんとさせ、引き上げてくれる相手',work:'自分を引き上げ、責任をくれる相手（上司・責任者）',friend:'自分を引きしめてくれる、少し背すじが伸びる相手',family:'相手に引きしめられ、導かれる関係（子から親を見たときに多い形。親から子を見てこの形なら、子に意見されやすい）'},
  印:{love:'自分を守り、受けとめてくれる相手',work:'教えてくれる・守ってくれる相手（先生・師匠・後ろ盾）',friend:'相談にのってくれる、安心できる相手',family:'相手に守られ、受けとめてもらう関係（子から母を見たときの典型。親から子を見てこの形なら、子に支えられる）'}};
var PK_ROLE_SUB={劫財:'お金の貸し借りや共同出資は慎重に',傷官:'言い方がきつくならないように',偏財:'楽しく動けるが、お金の使い方は決めておく',偏官:'厳しく鍛える形になりやすい',正官:'筋を通す・約束を守ることが大事',偏印:'考え方は個性的。干渉しすぎない',印綬:'頼りすぎないことが大事'};
var PK_SCENE={年柱:'家・親族・地元',月柱:'仕事・職場・暮らしの環境',日柱:'ふだんの2人の関係',時柱:'子ども・将来・趣味'};
function pkCompatRoles(cd){ var R={role:[],energy:[],stars:[],scene:[]}; try{ var a=cd._a, b=cd._b, kind=cd.kind||'love';
  [[a,b,'本人','お相手'],[b,a,'お相手','本人']].forEach(function(q){ var st=_tenStarOf(q[0].dayMaster.stem,q[1].dayMaster.stem), g=TS_GROUP[st], t=(PK_ROLE_TS[g]||{})[kind]; if(!t) return;
    R.role.push(q[2]+'から見て、'+q[3]+'の日干「'+q[1].dayMaster.stem+'」は'+st+'＝'+t+(PK_ROLE_SUB[st]?'（'+PK_ROLE_SUB[st]+'）':'')); });
  [[a,b,cd._fa,'本人','お相手'],[b,a,cd._fb,'お相手','本人']].forEach(function(q){ var fav=q[2]||{}, fe=q[1].fiveElements||{}, ki=0, im=0, kL=[], iL=[];
    ['木','火','土','金','水'].forEach(function(el){ var n=fe[el]||0; if(!n) return; if(fav[el]==='喜'){ ki+=n; kL.push(el+n); } else if(fav[el]==='忌'){ im+=n; iL.push(el+n); } });
    if(!ki&&!im){ R.energy.push(q[3]+'には喜神・忌神がない（中和）、または'+q[4]+'の五行が当たらない＝一緒にいて調子が大きく変わる組み合わせではない'); return; }
    var v=ki>im?q[3]+'は'+q[4]+'と一緒にいると調子が上がりやすい':(im>ki?q[3]+'は'+q[4]+'と長く一緒にいると疲れやすいことがある（'+q[4]+'が悪いのではない。ひとりの時間をとるとよい）':'調子が上がる面と疲れる面が同じくらい');
    R.energy.push(q[3]+'の喜神を'+q[4]+'は'+ki+'つ'+(kL.length?'（'+kL.join('・')+'）':'')+'、忌神を'+im+'つ'+(iL.length?'（'+iL.join('・')+'）':'')+'持つ＝'+v); });
  var SX={文昌貴人:'一緒に学ぶと身につきやすい相手（勉強仲間・先生に向く）',駅馬:'一緒にいると動きが出る相手（旅行・引っ越し・新しいことを一緒に始める）'};
  [[a,b,'本人','お相手'],[b,a,'お相手','本人']].forEach(function(q){ var hit={}; (q[1].pillars||[]).forEach(function(p,j){ if(!p||!p.stem) return; pkStarsOn(q[0],p).forEach(function(n){ if(SX[n]) (hit[n]=hit[n]||[]).push(CP_PL[j]+'「'+p.ganzhi+'」'); }); });
    Object.keys(hit).forEach(function(n){ R.stars.push(q[2]+'から見て、'+q[3]+'の'+hit[n].join('・')+'が'+q[2]+'の'+n+'に当たる＝'+q[3]+'は'+SX[n]+'（参考）'); }); });
  var grp={}; (cd.items||[]).forEach(function(x){ if(x.ai==null||x.bj==null||x.cross) return; var A=CP_PL[x.ai], B=CP_PL[x.bj], key=A+'×'+B; (grp[key]=grp[key]||{a:A,b:B,i:x.ai*4+x.bj,g:[],w:[]})[x.good?'g':'w'].push(x.k.replace(/（.*$/,'')); });
  function rank(o){ return (o.a==='日柱'?4:0)+(o.b==='日柱'?4:0)+(o.a===o.b?2:0)+((o.a==='月柱'||o.b==='月柱')?1:0); }
  Object.keys(grp).map(function(k){ return grp[k]; }).sort(function(x,y){ return rank(y)-rank(x)||x.i-y.i; }).slice(0,6).forEach(function(o){ var u=function(L){ return L.filter(function(x,i){ return L.indexOf(x)===i; }); };
    var sc=o.a===o.b?(o.a==='日柱'?'ふだんの2人の関係':PK_SCENE[o.a]+'が関わる場面'):(o.a==='日柱'?'本人自身':'本人の'+PK_SCENE[o.a])+'と、'+(o.b==='日柱'?'お相手自身':'お相手の'+PK_SCENE[o.b])+'が関わる場面';
    R.scene.push(sc+'：'+[o.g.length?'うまくいく（'+u(o.g).join('・')+'）':'',o.w.length?'ぶつかりやすい（'+u(o.w).join('・')+'）':''].filter(Boolean).join('／')); });
}catch(e){} return R; }
var PK_CHECK_TS={比肩:{g:'自分の考えを持ち、流されない',c:'頑固すぎないか、こちらの意見も聞いてくれるか'},劫財:{g:'行動力・勝負強さがあり、仲間を大事にする',c:'張り合いすぎないか、勝ち負けや損得にこだわりすぎないか、こちらの気持ちを尊重してくれるか'},食神:{g:'一緒にいて楽しく、人を和ませる',c:'約束や計画を守るか、のんびりしすぎないか'},傷官:{g:'感性・センス・こだわりがある',c:'言葉がきつくならないか、人の批判のしかた'},偏財:{g:'社交的で、人とのつながりが広い',c:'誰にでもいい顔をしすぎないか、お金の使いすぎ、異性との距離'},正財:{g:'まじめで堅実、誠実',c:'お金に細かすぎないか、融通がきくか'},偏官:{g:'行動力と度胸があり、いざというとき頼れる',c:'短気になりやすくないか、思いどおりにならないときの態度'},正官:{g:'責任感があり、約束や時間を守る',c:'世間体やルールにしばられすぎないか'},偏印:{g:'独自の感性とひらめきがある',c:'気持ちを言葉にするか、連絡が急に途切れないか、飽きっぽくないか'},印綬:{g:'学ぶ姿勢・考えの深さ・面倒見のよさがある',c:'考えすぎて動けなくないか、甘えすぎないか、親との距離'}};
function pkCheckPoints(c,fav,love){ var C=[], G=[]; try{ var ds=c.dayMaster.stem, nat={}, now={};
  (c.pillars||[]).forEach(function(p,i){ if(!p) return; if(i!==2&&p.tenStar&&PK_CHECK_TS[p.tenStar]) nat[p.tenStar]=(nat[p.tenStar]||0)+1; (p.hiddenStems||[]).forEach(function(h){ if(PK_CHECK_TS[h.tenStar]) nat[h.tenStar]=(nat[h.tenStar]||0)+1; }); });
  var du=(c.now&&c.decadeFortunes)?c.decadeFortunes[c.now.daeunIndex]:null, yy=(c.now&&c.annualFortunes)?c.annualFortunes.filter(function(a){ return a.year===c.now.year; })[0]:null;
  Object.keys(nat).forEach(function(st){ var n=nat[st]+((du&&du.tenStar===st)?1:0)+((yy&&yy.tenStar===st)?1:0); if(nat[st]<3&&n>=3) now[st]=n; });
  var elOf=function(st){ var S='甲乙丙丁戊己庚辛壬癸'; for(var i=0;i<10;i++){ if(_tenStarOf(ds,S[i])===st) return STEM_EL[S[i]]; } return ''; };
  var dayStar=((c.pillars[2].hiddenStems||[])[0]||{}).tenStar||'', gen=((c.pillars[1].hiddenStems||[])[0]||{}).tenStar||'';
  Object.keys(PK_CHECK_TS).forEach(function(st){ var n=nat[st]||0; if(!n) return; var many=n>=3||!!now[st], ki=fav&&fav[elOf(st)]==='忌', pri=(dayStar===st?2:0)+(gen===st?2:0)+(many?2:0)+(ki?1:0);
    if(many||ki) C.push({pri:pri,t:st+'（'+[n>=3?n+'つ（多い）':(now[st]?'いまの巡りで'+now[st]+'つ':''),ki?'忌神に当たる':''].filter(Boolean).join('・')+'）：'+PK_CHECK_TS[st].c});
    else G.push({pri:pri,t:st+'がある：'+PK_CHECK_TS[st].g}); });
  var has=function(a){ return a.some(function(x){ return (nat[x]||0)>0; }); };
  if(!has(['正官','偏官'])) C.push({pri:1,t:'官星（正官・偏官）がない：自分から計画・決断してくれるか'});
  if(!has(['正財','偏財'])) C.push({pri:1,t:'財星（正財・偏財）がない：お金の使い方に計画性があるか'});
  if(!has(['食神','傷官'])) C.push({pri:1,t:'食傷（食神・傷官）がない：気持ちや楽しさを表に出してくれるか'});
  var hits=shinsatsuHits(c), on=function(k,i){ var p=c.pillars[i]; return p&&hits.some(function(h){ return h.indexOf(k)===0&&h.indexOf('('+p.branch+')')>0; }); }, any=function(k){ return hits.some(function(h){ return h.indexOf(k)===0; }); };
  if(love&&on('咸池',2)){ C.push({pri:3,t:'配偶宮（日支）に咸池：距離感、ほかの人との距離'}); G.push({pri:2,t:'配偶宮に咸池：恋愛の相手としての魅力がある'}); }
  if(love&&any('紅艶')){ C.push({pri:1,t:'紅艶がある：ほかの人との関わり方'}); G.push({pri:1,t:'紅艶がある：華やかで人を惹きつける'}); }
  if(any('羊刃')||any('日刃')||any('魁罡')){ C.push({pri:2,t:'羊刃・日刃・魁罡がある：意見がぶつかったとき引けるか'}); G.push({pri:1,t:'羊刃・日刃・魁罡がある：意志が強く頼もしい'}); }
  if(any('華蓋')){ C.push({pri:1,t:'華蓋がある：一人の時間や、表に出さない世界（ネットなど）の持ち方'}); G.push({pri:1,t:'華蓋がある：自分の世界・専門を深める'}); }
  var db=c.pillars[2].branch; if(c.pillars.some(function(p,i){ return i!==2&&p&&cpChong(p.branch,db); })){ C.push({pri:2,t:'配偶宮が命式の中で冲：住まい・仕事・生活が変わりやすいか'}); G.push({pri:0,t:'配偶宮が冲：変化に強い'}); }
  if(kubo(c).indexOf(c.pillars[0].branch)>=0){ C.push({pri:1,t:'年柱に空亡：家族の話は、相手から話すまで無理に聞かない'}); G.push({pri:0,t:'年柱に空亡：自立している'}); }
  if(any('天乙貴人')||any('天德貴人')||any('月德貴人')) G.push({pri:2,t:'天乙・天徳・月徳貴人がある：周りから助けられ、評判がよい'});
  var stt=strengthType(c); if(stt==='身強'){ C.push({pri:1,t:'身旺：自分のペースを押し通さないか'}); G.push({pri:0,t:'身旺：頼もしい'}); } else if(stt==='身弱'){ C.push({pri:1,t:'身弱：無理をしていないか、疲れやすくないか'}); G.push({pri:0,t:'身弱：やさしく協調的'}); }
}catch(e){} var top=function(L,n){ return L.map(function(x,i){ x.i=i; return x; }).sort(function(a,b){ return b.pri-a.pri||a.i-b.i; }).slice(0,n).map(function(x){ return x.t; }); };
  return {check:top(C,5),good:top(G,3)}; }
window.pkCompatRoles=pkCompatRoles; window.pkCheckPoints=pkCheckPoints;
/* 相性の材料（PRO の決まり全部）。鑑定文で使い、最後に全部使ったか確かめる */
window.pkCompatLogicBlock=function(cd,sameSex){ try{ if(!cd||!cd._a) return ''; var love=(cd.kind||'love')==='love', L=[];
  L.push('[COMPATIBILITY — THE SCHOOL\'S FULL LOGIC (computed; the same rules as the professional tool). Use EVERY part below in a full compatibility reading — say each in plain everyday words, never the technical names]');
  L.push('VERDICT (overall balance): '+cd.verdict+'.');
  if(sameSex) L.push('SAME-SEX COUPLE: never use any word that means "the opposite sex" in any language (異性・이성・異性・the opposite sex) — say "as a romantic partner" (恋愛の相手として・연인으로서・作為戀愛對象). Never treat being the same sex as unusual or as a caution point.');
  var ad=love?pkAttractionDir(cd._a,cd._b,sameSex):null; if(ad) L.push('WHO IS DRAWN TO WHOM (attraction direction — must be stated in one sentence; say "drawn to each other" ONLY if both sides have love stars): '+ad.line+'.');
  var cs=[]; [[cd._a,cd._b,'本人','お相手'],[cd._b,cd._a,'お相手','本人']].forEach(function(q){ pkCrossStars(q[0],q[1],love).forEach(function(c){ cs.push(q[2]+'から見て'+q[3]+'は「'+c.plain+'」（'+q[3]+'の'+c.at.map(function(z){ return z.label; }).join('・')+'が'+q[2]+'の'+c.star+'に当たる）'); }); });
  L.push('WHAT EACH ONE IS TO THE OTHER (stars in the partner\'s chart): '+(cs.length?cs.join(' / '):'none')+'.');
  var R=pkCompatRoles(cd); if(R.role.length) L.push('ROLES (the partner\'s day stem seen from each side): '+R.role.join(' / ')+'.');
  if(R.energy.length) L.push('ENERGY TOGETHER (喜神・忌神 — never blame the other person): '+R.energy.join(' / ')+'.');
  if(R.stars.length) L.push('ALSO (reference only): '+R.stars.join(' / ')+'.');
  if(R.scene.length) L.push('WHERE IT SHOWS UP (which life scene each bond or clash belongs to — day-pillar ones first): '+R.scene.join(' / ')+'.');
  var meaning=cd.items.filter(function(x){ return /^律音/.test(x.k); }); if(meaning.length) L.push('RITSUON (same pillar — a deep bond; explain its meaning exactly): '+meaning.map(function(x){ return x.k+'＝'+x.desc; }).join(' / ')+'.');
  var ckB=pkCheckPoints(cd._b,cd._fb,love), ckA=pkCheckPoints(cd._a,cd._fa,love);
  L.push('GETTING TO KNOW THE PARTNER — things to check as you spend time together (not "a bad person"; mention the top 2-3): '+ckB.check.join(' / ')+(ckB.good.length?' | GOOD SIDES to see in them: '+ckB.good.join(' / '):'')+'.');
  L.push('HOW THE USER LOOKS FROM THE PARTNER\'S SIDE (use 1 point in the advice): '+ckA.check.slice(0,2).join(' / ')+'.');
  return L.join('\n'); }catch(e){ return ''; } };
window.compatDeepGrounding=function(cd){
  if(!cd) return '';
  var L=['[COMPATIBILITY — FULL PILLAR-BY-PILLAR (computed). Strength: 強 = between the two DAY pillars (the relationship itself) / 中 = one side is a day pillar / 弱 = other pillars (shows up only in that pillar’s area of life). Points: 強3・中2・弱1; a 三合/方合 completed by the two charts together: 強4・中3・弱2.]'];
  L.push('TOTALS: good points '+cd.good+' / caution points '+cd.caution+' (difference '+(cd.diff>=0?'+':'')+cd.diff+'). Day masters: '+cd.dayRel+'.');
  function where(it){ if(it.aiList) return 'user '+it.aiList.map(function(i){return CP_PL[i];}).join('・')+' + partner '+it.bjList.map(function(j){return CP_PL[j];}).join('・');
    if(it.ai==null) return ''; return 'user '+CP_PL[it.ai]+' × partner '+CP_PL[it.bj]; }
  var G=cd.items.filter(function(it){return it.good;}), C=cd.items.filter(function(it){return !it.good;});
  L.push('GOOD POINTS (strongest first):'); G.forEach(function(it){ L.push('- '+it.k+'・'+it.g+' ('+it.detail+(where(it)?'; '+where(it):'')+')'); });
  L.push('CAUTION POINTS (strongest first):'); if(!C.length) L.push('- none'); C.forEach(function(it){ L.push('- '+it.k+'・'+it.g+' ('+it.detail+(where(it)?'; '+where(it):'')+')'); });
  L.push('PILLAR AREAS (use these to say WHERE a relation shows up): '+CP_PL.map(function(p,i){return p+' = '+CP_PL_EN[i];}).join(' / ')+'. A 弱 point that does not touch either day pillar shows up only in those areas of life, not in the relationship itself.');
  if(!cd.bHasHour) L.push('The partner’s birth time is unknown: their hour pillar is not included — say so briefly if they ask for details.');
  L.push('FULL READING (overrides the usual length rule for THIS reply only): when the user asks for a detailed or full compatibility reading (くわしく・詳しく・全部・良いところと気をつけるところ・in detail・자세히・詳細) (the FIRST compatibility reply for a partner is a short FIRST LOOK instead — see the [FIRST LOOK] note; operator decision 2026-10-26) — NOT when they ask for advice or a specific thing (what to do, when, will he propose, how to handle X): then answer that question in 4-5 short paragraphs using only the most relevant points and timing — give a complete reading in natural spoken paragraphs (about 600-1100 Japanese characters is fine; no headings, no bullet symbols, no point numbers): (1) the 2-3 strongest GOOD points, strongest first, each with what it means in daily life and which part of life it lives in; (2) EVERY 強 and 中 CAUTION point by name in plain words with a concrete tip, then one sentence that sums up the 弱 cautions and the areas they are limited to; (3) one sentence on the overall balance (good points clearly outweigh / roughly even / cautions weigh more) — never say the strength labels (強・中・弱, 中程度, 強い/弱い注意点) or point counts, never state a numeric score, percentage or point totals; (4) the unsettled years: list EVERY year in CAUTION YEARS where the USER\u2019s spouse palace is hit (あなたの配偶宮), all of them in order, then the partner-side years separately, and EVERY year in GOOD YEARS in order (the nearest first — never skip the nearest one to name only a later one); (5) the 10-year flow from DECADES in COUPLE TIMING: one or two sentences on what the current and next 10-year period brings to the two of them (a completed bond = a period that ties them together; a hit on someone\u2019s spouse palace = a period to take extra care of the relationship; 落ち着いた10年 = a steady period), with EXACTLY the years and label written there for each person — copy them, never shift the years, never merge the two people, never upgrade 落ち着いた10年 into a deepening/bond period; (6) one sentence on the coming months: name EVERY month in GOOD MONTHS first (nearest first), then the SOFTER ones if you like, and the CAUTION MONTHS to go gently. BEFORE YOU FINISH, CHECK that this reply names: every GOOD YEAR; every CAUTION YEAR for the user and, separately, for the partner; both 10-year periods for each person; every GOOD MONTH — add any that are missing (keep each to a short phrase). Do not invent anything not in the data. End with at most one short question.');
  L.push('HOW TO READ (Nico): weigh the whole picture, not one item. Lead with the strongest GOOD point (強 first) and what it feels like day to day; then name the CAUTION points honestly but calmly, saying where they show up (by pillar area) and how strong they are; a 強 caution between the day pillars is the one to take seriously and give a concrete tip for. If the user asks for detail or the reasons, you may list the points with their strength (強・中・弱) and the totals. Never call a pairing doomed; the difference between good and caution points is the overall tone. 律音 (identical day pillars) = deep mutual understanding, but warn gently against assuming the other "should just understand" or trying to control them. 天戦地冲 = the strongest friction pattern, but limited to the pillar areas involved.');
  return L.join('\n');
};
/* Gemini用：相性の根拠を英語で列挙 */
window.compatGrounding=function(cd){
  var L=[];
  L.push('Day masters: you '+cd.aS+'('+cd.aEl+') / partner '+cd.bS+'('+cd.bEl+')');
  if(cd.kangou) L.push('Heavenly-stem union 干合 between day masters — strong natural attraction.');
  L.push('Five-element relation: '+({same:'same element (similar values)',aGenB:'you nourish them (you give/nurture)',bGenA:'they nourish you (you feel supported)',aKeB:'you restrain them (you lead/stimulate)',bKeA:'they restrain you (tension/learning)'}[cd.stemRel]));
  if(cd.rikugou) L.push('Branch union 支合 between day branches — a drawn-together bond.');
  if(cd.sango) L.push('Branch trine 三合 — smooth cooperation.');
  if(cd.seiritsu&&cd.seiritsu.length) cd.seiritsu.forEach(function(s){
    L.push('COMPLETED '+(s.kind==='三合成立'?'trine 三合':'directional 方合')+'('+s.el+') ACROSS the two charts — you bring '+s.inA.join('')+', partner brings '+s.inB.join('')+'. Classic marker of strong compatibility: together you complete a current neither has alone; that element ('+s.el+') is the couple\'s shared engine. Lead with this when they ask about the relationship.');
  });
  if(cd.chong) L.push('Branch clash 冲 — friction / push-pull, watch for collisions.');
  if(cd.kei) L.push('Branch punishment 刑 — snags / friction to be careful of.');
  if(cd.ha) L.push('Branch break 破 — small disruptions.');
  if(cd.gai) L.push('Branch harm 害 — hidden misunderstandings.');
  L.push('Ten god — partner appears to you as: '+cd.tenAtoB+'; you appear to them as: '+cd.tenBtoA);
  return L.join('\n');
};

/* ============================================================
   フル命式プロファイル: 命式の全次元を抽出し、平易な意味づけと共に
   Geminiへ渡す（日柱・元命・十二運・吉凶星・三合方合六合・冲刑破害…）。
   これにより人ごと・質問ごとに解釈の組み合わせが変わり、回答が多様化する。
   ============================================================ */
var FP_HOUGO=[['寅','卯','辰','木'],['巳','午','未','火'],['申','酉','戌','金'],['亥','子','丑','水']];
var FP_CARDINAL={子:1,午:1,卯:1,酉:1};
var TENGOD_MEAN={
 比肩:'independence, self-reliance, standing on their own, peers & fair competition',
 劫財:'drive & ambition, sociable but competitive, risk-taking, rallying people',
 食神:'easygoing talent, enjoyment of life, warm self-expression, nurturing output',
 傷官:'sharp creativity & sensitivity, rebellious brilliance, a critical discerning eye',
 偏財:'flexible money & opportunity, generosity, wide social networks, an eye for chances',
 正財:'steady income & diligence, loyalty, careful responsible handling of resources',
 偏官:'courage & drive under pressure, protectiveness, intensity, thrives on challenge',
 正官:'order, duty & reputation, self-discipline, principled leadership',
 偏印:'unconventional insight & intuition, niche expertise, a slightly detached observer',
 印綬:'learning & wisdom, receiving support/nurture, qualifications and good name'
};
var STAGE_MEAN={
 長生:'fresh, growing, curious energy', 沐浴:'sensitive, changeable, emotionally responsive',
 冠帯:'ambitious, image-conscious, coming-into-power energy', 建禄:'self-made, independent, capable worker',
 帝旺:'peak strength, strong will, natural leader (can be domineering)', 衰:'mellow, mature, steady',
 病:'reflective, empathetic, delicate, caring', 死:'focused specialist, quiet depth, analytical',
 墓:'collecting & saving, careful, holds things in', 絶:'reset-and-rebirth, inspired, unbound, restless',
 胎:'budding potential, imaginative, gentle', 養:'cherished, adaptable, easygoing, well-supported'
};
var STAR_MEAN={
 天乙貴人:'a strong "noble helper" luck — people rescue/support them in a pinch',
 天德貴人:'protection & kindness rewarded', 月德貴人:'quiet protection & goodwill',
 文昌貴人:'academic/intellectual gift — study, writing, exams', 太極貴人:'draw to philosophy, mystery, research',
 福星貴人:'ease & comfort in life', 天厨貴人:'never wants for food/pleasure', 天官貴人:'favor in status/officialdom',
 金与禄:'comfort & marriage/vehicle luck', 暗禄:'unseen support / hidden income',
 咸池:'peach-blossom charm — magnetism, popularity, romantic attention', 紅艶:'strong romantic/sensual magnetism',
 驛馬:'the travel star — movement, travel, change, restlessness', 羊刃:'a sharp blade of force — intensity & drive, can be extreme',
 飛刃:'a hidden sharp edge', 魁罡:'bold, decisive, all-or-nothing willpower', 禄馬:'capability paired with mobility',
 妨害殺:'obstruction — watch for interference', 囚獄:'restriction — feeling boxed in at times',
 劫殺:'sudden loss/robbery caution', 亡神:'loss/absent-mindedness caution', 血刃:'injury caution — care with the body',
 天德合:'gentle protection that eases troubles', 月德合:'calm protection and good fortune through people', 華蓋:'artistic, spiritual, solitary sensitivity — a unique inner world', 日刃:'fierce drive in the self — strong will, can be extreme', 隔角:'a separating wall — distance or friction with family/close people'
};
var EL_MEAN={木:'growth, planning, kindness, assertiveness',火:'passion, visibility, joy, expression',土:'stability, trust, care, practicality',金:'decisiveness, structure, justice, refinement',水:'wisdom, adaptability, intuition, communication'};
var REL_MEAN={
 三合:'a powerful harmonious current strengthening that theme in their life',
 半合:'a partial pull toward that theme',
 方合:'a very strong concentration — a dominant life theme',
 六合:'a bonding, attracting force — smooth ties and pairing',
 冲:'an axis of push-pull & change — restlessness and major turning points',
 刑:'friction & adjustment — lessons, and care with legal/health matters',
 破:'small disruptions / minor breaks', 害:'hidden misunderstanding or subtle harm',
 干合:'a magnetic binding between two pillars — strong attraction and a deep tie in those areas',
 天地徳合:'PERFECT UNION — stem and branch both unite between two pillars; a rare, defining bond in those areas (MUST be mentioned in plain words in readings of their nature, love, marriage or family)'
};
function fpBranches(pro){ return (pro.pillars||[]).map(function(p){return p.branch;}); }
function natalRelations(pro){
  var br=fpBranches(pro), labels=(pro.pillars||[]).map(function(p){return p.label;}), out=[];
  // 方合 (directional, needs all 3)
  FP_HOUGO.forEach(function(g){ var need=g.slice(0,3), hit=need.filter(function(x){return br.indexOf(x)>=0;}); if(hit.length===3) out.push({kind:'方合',el:g[3],branches:need.slice()}); });
  // 三合 / 半合
  CP_SANGO.forEach(function(g){ var need=g.slice(0,3), hit=need.filter(function(x){return br.indexOf(x)>=0;});
    if(hit.length>=3) out.push({kind:'三合',el:g[3],branches:hit});
    else if(hit.length===2 && hit.some(function(x){return FP_CARDINAL[x];})) out.push({kind:'半合',el:g[3],branches:hit}); });
  // 干合（天干どうし。日柱がからむものは dayPillarBonds で扱うので、ここでは日柱以外の柱どうし）
  var ps=pro.pillars||[];
  for(var si=0;si<ps.length;si++)for(var sj=si+1;sj<ps.length;sj++){ if(si===2||sj===2) continue; var sa=ps[si]&&ps[si].stem, sb=ps[sj]&&ps[sj].stem;
    if(sa&&sb&&CP_KANGO[sa]===sb){ var _pl=[(ps[si].label||'').charAt(0),(ps[sj].label||'').charAt(0)];
      if(CP_RIKUGO[ps[si].branch]===ps[sj].branch) out.push({kind:'天地徳合',branches:[ps[si].ganzhi,ps[sj].ganzhi],stems:true,pillars:_pl});   /* 干合＋支合が同じ2つの柱で重なる */
      else out.push({kind:'干合',el:KANGO_EL[sa+sb]||KANGO_EL[sb+sa],branches:[sa,sb],stems:true,pillars:_pl}); } }
  // pairwise 六合 / 冲 / 破 / 害（刑は使わない）
  for(var i=0;i<br.length;i++)for(var j=i+1;j<br.length;j++){ var a=br[i],b=br[j];
    if(CP_RIKUGO[a]===b) out.push({kind:'六合',branches:[a,b]});
    if(cpChong(a,b)) out.push({kind:'冲',branches:[a,b]});
    /* 命式の中の刑・自刑は使わない（当流派の決まり。運営確認 2026-10-24）。刑は運と命式・2人の相性でだけ使う */
    if(CP_HA[a]===b) out.push({kind:'破',branches:[a,b]});
    if(CP_GAI[a]===b) out.push({kind:'害',branches:[a,b]});
  }
  return out;
}
/* 大運・年運の支が命式の支と組む関係。三合・方合の「成立」（運が局を完成させる）を最優先で拾う */
function transitRels(pro,branch){
  if(!branch) return [];
  var br=fpBranches(pro), out=[];
  CP_SANGO.forEach(function(g){ var need=g.slice(0,3);
    if(need.indexOf(branch)>=0){
      var others=need.filter(function(x){return x!==branch;});
      var present=others.filter(function(x){return br.indexOf(x)>=0;});
      if(present.length===2) out.push({kind:'三合成立',el:g[3],w:branch,withs:present});
      else if(present.length===1&&(FP_CARDINAL[branch]||FP_CARDINAL[present[0]])) out.push({kind:'半合',el:g[3],w:branch,withs:present});
    }});
  FP_HOUGO.forEach(function(g){ var need=g.slice(0,3);
    if(need.indexOf(branch)>=0){
      var others=need.filter(function(x){return x!==branch;});
      if(others.every(function(x){return br.indexOf(x)>=0;})) out.push({kind:'方合成立',el:g[3],w:branch,withs:others});
    }});
  (pro.pillars||[]).forEach(function(p){ var b=p.branch, lab=(p.label||'').charAt(0);
    if(CP_RIKUGO[branch]===b) out.push({kind:'六合',to:lab+b});
    if(cpChong(branch,b)) out.push({kind:'冲',to:lab+b});
    if(cpKei(branch,b)) out.push({kind:'刑',to:lab+b});
    if(CP_HA[branch]===b) out.push({kind:'破',to:lab+b});
    if(CP_GAI[branch]===b) out.push({kind:'害',to:lab+b});
  });
  return out;
}
window.transitRels=transitRels;
/* 三者持ち寄りの成立：命式1支＋大運1支＋年運1支で三合/方合が完成するケース */
function comboRels(pro,db,yb){
  if(!db||!yb||db===yb) return [];
  var br=fpBranches(pro), out=[];
  function chk(groups,kindName){
    groups.forEach(function(g){ var need=g.slice(0,3);
      if(need.indexOf(db)>=0&&need.indexOf(yb)>=0){
        var third=need.filter(function(x){return x!==db&&x!==yb;})[0];
        if(third&&br.indexOf(third)>=0) out.push({kind:kindName,el:g[3],natal:third,daiun:db,year:yb});
      }});
  }
  chk(CP_SANGO,'三合成立'); chk(FP_HOUGO,'方合成立');
  return out;
}
window.comboRels=comboRels;
/* 日柱と他柱の関係：干合・支合・冲・天地徳合（干合＋支合が同時成立＝大吉の縁） */
var KANGO_EL={'甲己':'土','乙庚':'金','丙辛':'水','丁壬':'木','戊癸':'火'};
function dayPillarBonds(pro){
  var p=pro.pillars||[], day=p[2]; if(!day) return [];
  var out=[];
  p.forEach(function(o,i){
    if(i===2||!o.stem) return;
    var lab=(o.label||'').charAt(0);
    var kg=(CP_KANGO[day.stem]===o.stem), sg=(CP_RIKUGO[day.branch]===o.branch);
    if(kg&&sg) out.push({kind:'天地徳合',to:lab,gz:o.ganzhi});
    else if(kg) out.push({kind:'干合',to:lab,gz:o.ganzhi,el:KANGO_EL[day.stem+o.stem]||KANGO_EL[o.stem+day.stem]});
    else if(sg) out.push({kind:'支合',to:lab,gz:o.ganzhi});
    if(cpChong(day.branch,o.branch)) out.push({kind:'日支冲',to:lab,gz:o.ganzhi});
  });
  return out;
}
window.dayPillarBonds=dayPillarBonds;
/* 大運・年運の支が発動させる吉凶星（神殺）：日干テーブル＋日支テーブルを運の支に当てる */
function transitStars(pro,branch){
  var out=[];
  try{
    var tbl=KICHI_NIKKAN[pro.dayMaster.stem]||{};
    Object.keys(tbl).forEach(function(name){ var tg=tbl[name]; if((Array.isArray(tg)?tg:[tg]).indexOf(branch)>=0) out.push(name); });
    var d4=kichi4Targets(pro.pillars[2].branch)||{};
    Object.keys(d4).forEach(function(name){ if(d4[name]===branch) out.push(name); });
    var y4=kichi4Targets(pro.pillars[0].branch)||{}; Object.keys(y4).forEach(function(name){ if(y4[name]===branch&&out.indexOf(name)<0) out.push(name); });
  }catch(e){}
  return out;
}
window.transitStars=transitStars;
window.fullProfile=function(pro){
  if(!pro) return null;
  var p=pro.pillars||[];
  var day=p[2]||{};
  var rels=natalRelations(pro);
  var five=pro.fiveElements||{}, min=99,max=-1;
  CP_SHENG.forEach(function(e){var v=five[e]||0;if(v<min)min=v;if(v>max)max=v;});
  var weak=CP_SHENG.filter(function(e){return (five[e]||0)===min;}), strong=CP_SHENG.filter(function(e){return (five[e]||0)===max;}), zero=CP_SHENG.filter(function(e){return (five[e]||0)===0;});
  var stars=(window.shinsatsuHits?window.shinsatsuHits(pro):[]).map(function(s){return s.split('(')[0];});
  var uniqStars=stars.filter(function(v,i){return stars.indexOf(v)===i;});
  var cur=null,next=null;
  if(pro.now&&pro.decadeFortunes){ var di=pro.now.daeunIndex; if(di>=0){ cur=pro.decadeFortunes[di]; next=pro.decadeFortunes[di+1]; } else { cur=curDecade(pro); next=pro.decadeFortunes[0]; } }
  var ty=null,ny=null;
  if(pro.now&&pro.annualFortunes){ ty=pro.annualFortunes.find(function(a){return a.year===pro.now.year;}); ny=pro.annualFortunes.find(function(a){return a.year===pro.now.year+1;}); }
  return { dayGanzhi:day.ganzhi, dayStem:day.stem, dayBranch:day.branch, dayStage:day.terrain,
    genmei:(pro.genmei&&pro.genmei.tenStar)||'', pillars:p, rels:rels,
    five:five, weak:weak, strong:strong, zero:zero, stars:uniqStars,
    voids:(typeof kubo==='function'?kubo(pro):[]), cur:cur, next:next, ty:ty, ny:ny };
};
/* 六十干支（日柱）の特性：古典的イメージ＋核となる性格。デッキ経由でNicoが各言語に翻訳して使う */
var GZ60={
 甲子:"CLASSIC: a great tree fed by a hidden winter spring — sharp intellect nourished quietly from below. MODERN: excellent analytical mind and memory; a hard worker whose head is always running, with a strong drive to improve; keenly sensitive, refined taste — often the stylish one; a pure romantic at heart, cautious in method yet optimistic in outlook. EVERYDAY: remembers what you said months ago word for word; researches everything before deciding, then feels sure it will work out; their outfit always looks quietly put-together; sincere praise fuels them for weeks. MALE: hates anything crooked or unfair; trusted and quietly popular; refined dresser and sensibly frugal; an idealist and a skilled conversationalist; naturally attractive to women; his next move is hard to predict. FEMALE: meticulous and earnest; carries high pride and strong self-respect; moves at her own pace and makes sure of each step; quick-minded, deeply sensitive, sharply insightful.",
 甲寅:"CLASSIC: a tall tree standing on its home soil — upright and principled. MODERN: brimming with confidence, always running at the front as a leader; a strong fortune that dislikes taking orders. EVERYDAY: keeps their own routines no matter the trend; defends a colleague to the boss's face; won't apologize while convinced they're right. MALE: a kingly bearing who pushes his own path — an independent-minded top-runner. FEMALE: a strong woman who lives by her own will; positive, and meets men as an equal.",
 甲辰:"CLASSIC: a tree in rich wet earth — ambition with staying power. MODERN: large in scale, achieving unconventional success; realistic, with strong execution. EVERYDAY: has a quiet five-year plan; saves patiently then bets decisively; setbacks only deepen the roots. MALE: holds his own vision and the power to build a fortune in one generation; overflowing vitality. FEMALE: strong-willed and independent; she wants to steer her own life by her own hand.",
 甲午:"CLASSIC: a tree ablaze with summer flowers — expressive and generous. MODERN: strong intellectual curiosity and a knack for reading what comes next; light on their feet. EVERYDAY: energizes any room, says yes too often, secretly needs a full recharge day after big events. MALE: has foresight, an idea man; performs beyond his ability when he is flattered and cheered on. FEMALE: action-driven, always busy and moving; impatient, but with an endearing charm.",
 甲申:"CLASSIC: a tree rooted on a rocky cliff — resilience under the blade. MODERN: a talent for reading what the times will do next; strong intellectual curiosity and a mover who acts. EVERYDAY: the MacGyver of broken plans; one harsh word from a boss echoes for days though they never show it. MALE: dexterous and efficient, handling any job quickly; a challenger unafraid of change who dives into new environments, multi-talented though a little quick to bore. FEMALE: refreshingly frank with light footwork; action and decisiveness, and the business sense to meet men as an equal; a sharp eye for catching trends.",
 甲戌:"CLASSIC: a lone tree on an autumn hill — loyal guardian. MODERN: a perfectionist who chases their ideals; very high pride, many hobbies and talents and a wide circle of acquaintances; quiet and reserved, yet compassionate and good at looking after people; has business sense, but is best suited to work where their pride can show — roles that come with a clear title or standing. EVERYDAY: remembers birthdays and small debts of kindness; slow to open up, but once you're in, it's for life; won't settle for a half-finished job. MALE: a steady, bit-by-bit worker; meticulous and dutiful, a rationalist with strong pursuit of what he's after; strongly upward-aiming, keeps his promises, hates half-measures; knows himself well and gives fine-grained care and help — though he can seem hard to approach at first, and is prone to a wandering eye. FEMALE: often a beauty; earnest and honest; strong likes and dislikes; looks after others; proud and goes at her own pace; solid and tenacious, with an old-fashioned streak; thinks things over deeply — sometimes too much — self-focused at times, and highly guarded with new people.",
 乙丑:"CLASSIC: a flower budding in frozen ground — patient endurance. MODERN: a patient, persistent hard worker; gentle and mild-mannered yet strong-willed underneath; taps the stone bridge before crossing — careful, and slow to settle into new environments; the type who can give their all for someone else's sake. EVERYDAY: still attending the class everyone else quit; takes time to fit into a new job or group, then becomes its most trusted member; works hardest when it is for a person they care about; wins by not stopping. MALE: patient with stability-first thinking; humble and easy to approach; insightful and free of preconceptions; earnest and astute; mild and modest — yet surprisingly stubborn once he digs in. FEMALE: clear likes and dislikes; a true hard worker; deeply sensitive and maternal; shy with strangers but keenly attuned to others' feelings; when she loves a person, a comfort, or a habit she can lean on it too deeply — gentle reminders to keep her own anchor help her.",
 乙卯:"CLASSIC: a vine spreading across its home meadow — soft persistence. MODERN: loved by all with an easygoing, gentle air, hiding a strong flexibility underneath. EVERYDAY: gets things done through relationships; seems easygoing, yet somehow never drops the goal. MALE: soft-mannered and makes no enemies, yet inwardly holds firmly to his own rules. FEMALE: an eternal-girlish charm; a blessed, fortunate type who easily receives support and help from those around her.",
 乙巳:"CLASSIC: a flower beside a warm hearth — clever charm. MODERN: richly expressive with a certain allure; pleasant company and skilled at negotiation. EVERYDAY: wins over the difficult client with perfectly-timed humor; adjusts words and outfit to the audience without thinking. MALE: a skilled talker who opens people's hearts, with a talent for the arts and entertainment. FEMALE: glamorous, with a natural charm that draws the opposite sex; can be a little jealous.",
 乙未:"CLASSIC: an herb enduring dry summer soil — gentle tenacity. MODERN: looks calm on the surface, but top-class tenacity; overcomes hardship slowly, over time. EVERYDAY: puts a family errand before their own deadline; will not abandon anyone, ever. MALE: quiet and modest, yet once he decides on something he sees it through, however many years it takes. FEMALE: a very strong core; a weed-like toughness that rises again no matter how often she is trampled.",
 乙酉:"CLASSIC: a flower trained on a metal lattice — refinement under discipline. MODERN: sociable and stylish, superb with people; a refined aesthetic sense and a knack for drawing others' support. EVERYDAY: instantly notices the misaligned logo or off-color; home is few things, all chosen. MALE: sociable and stylish, a smart gentleman excellent with people, whose aesthetic sense stands out. FEMALE: glamorous and lovely, a lucky sort who easily receives others' backing; sensitive to trends and never neglecting self-improvement.",
 乙亥:"CLASSIC: a water plant riding the current — floating intuition. MODERN: clever, with strong focus and quick wits — which also makes them prone to worrying ahead of time over nothing; good taste that often draws attention, yet they get knocked down or brood over small things; combines real patience with a fast-turning mind, and tends to become outstanding at one particular thing; their weak point is strong likes and dislikes — they don't show it on their face, but they can quietly turn immovable. EVERYDAY: absorbs the room's mood like weather; ideas arrive at night; brilliant and calm on the outside while replaying a tiny remark inside. MALE: an artist's soul; clever and proud; loves taking on new challenges; a strong core, unpretentious, gives everything his all; tends to put up walls; a bit of a spotlight-seeker and a philosopher at heart — and can struggle to keep a marriage steady. FEMALE: clever, with strong focus and firm particular tastes; refreshingly frank; hates being interfered with; has real nerve and guts; looks after others; a handsome, striking kind of beauty; no front and no back — exactly what she seems.",
 丙子:"CLASSIC: the sun over a midnight sea — radiance above depth. MODERN: glamorous charm paired with sharp intuition — a very popular pillar. EVERYDAY: the life of the party who goes home and journals; almost no one knows their real worries. MALE: sociable and very popular, but lonely at heart; a romantic who moves on intuition. FEMALE: a distinctive aura that attracts the opposite sex, but moody, and apt to keep a partner guessing.",
 丙寅:"CLASSIC: sunrise breaking over the forest — the igniter. MODERN: bright and forward-looking like the sun, with the power to brighten everyone around them; gets along with anyone thanks to that warmth and looks after people well, so they are naturally popular; above-average ability that produces results in any field; soft on the surface, but in fact carries very high pride. EVERYDAY: proposes the plan while others are still hesitating; the one who lifts the mood of a whole room; strongest before noon. MALE: earnest, even highly-strung; a meticulous social type who genuinely loves his work; enjoys passionate romance and is skilled at the give-and-take of it; an ambitious dreamer full of drive — active, dexterous, always up for a challenge; runs more on passion than intuition, and can be endearingly scatterbrained. FEMALE: positive and sociable; looks after others and is the big-sister type everyone leans on; loved and popular, does well in romance; loves fun and loves her work; skilled at reading the right distance with people and attentive to their needs.",
 丙辰:"CLASSIC: spring sun over broad fields — the warm provider. MODERN: cheerful and overflowing with energy, pulling everyone in — a dynamic life. EVERYDAY: treats the juniors, organizes the trip, waves off small change — then plans something bigger. MALE: self-assured with great vitality; shines at festivals, events and any lively place. FEMALE: bright and dignified, standing out anywhere; good at self-expression, suited to performing and art.",
 丙午:"CLASSIC: the sun at high noon — nothing brighter. MODERN: very strong energy and fearless charisma, charging straight ahead. EVERYDAY: either trains every single day or not at all; crowds charge them, empty rooms drain them. MALE: confident and full of vitality; grows well as an entrepreneur or leader. FEMALE: an overwhelming presence and strong luck, though her strength can overpower a partner.",
 丙申:"CLASSIC: sunset gilding metal — brilliance in motion. MODERN: flashy and sociable, a talkative entertainer. EVERYDAY: three side projects running; dazzling first drafts, happily delegates the polishing. MALE: humorous and worldly-wise, with a talent for catching trends and turning them into business. FEMALE: always smiling with many friends; a bright, popular figure, though a bit quick to get bored.",
 丙戌:"CLASSIC: evening sun resting on the hill — warm dignity. MODERN: brightness paired with a strong sense of justice; a boss-figure who can't leave anyone in trouble and earns deep trust. EVERYDAY: same café, same seat; the junior colleagues' secret consultant; slow to anger, long to remember. MALE: brightness and strong justice together, a boss-type who can't ignore someone in need and wins deep trust within a group. FEMALE: warm-hearted and, once she opens up, devoted to the very end; frank and without pretense.",
 丁丑:"CLASSIC: a candle in a winter shrine — devotion. MODERN: quiet and modest, but first-rate powers of observation; reaches goals gradually on hidden passion. EVERYDAY: remembers exactly how you take your coffee; stays late for one person, not for show. MALE: looks modest but is actually ambitious; reads the data and the room and steadily seizes his chances. FEMALE: a warm, gentle mother-type — but once angered she never forgives, a hidden fierceness.",
 丁卯:"CLASSIC: a lamp glowing among spring flowers — romantic light. MODERN: a cooperative, sociable person with a wide network; delicate and kind, yet with a surprisingly bold side; often strikingly good-looking with a certain allure; deeply curious and quick to get hooked on things, though just as quick to lose interest. EVERYDAY: cries at films without shame; the hub who knows everyone; dives headlong into a new hobby, then drifts to the next. MALE: humble and easy-going on the surface, but secretly hates to lose; a particular, gifted mind that runs fast and can feel a touch solitary; passionate but quick to cool; not great at making the first move himself; calculating and strategic, with more going on beneath than he shows; capricious yet friendly. FEMALE: beautiful and pleasant, with a mysterious air; sharp intuition; thrifty and caring; curious and restless, sometimes a bit scatterbrained; a good and wise partner at heart who brightens everyone around her; delicate and clever.",
 丁巳:"CLASSIC: twin flames burning as one — hidden intensity. MODERN: looks cool, but a fierce passion burns inside; top-class persistence. EVERYDAY: mild in the meeting, immovable on values; hobbies quietly pursued to mastery. MALE: cool on the outside, deeply passionate within; never gives up a goal once he has set it. FEMALE: a mysterious charm, a swamp you cannot climb out of once caught; a touch possessive.",
 丁未:"CLASSIC: incense drifting at dusk — subtle influence. MODERN: usually calm, but the pride within is Everest-tall; a strongly craftsman-like pillar. EVERYDAY: people leave their tea table calmer; wins arguments no one noticed happening. MALE: quiet, yet holds absolute confidence in his own field of expertise. FEMALE: warm and a good listener, but resists fiercely the moment her territory is invaded.",
 丁酉:"CLASSIC: lantern light on gold — precision glow. MODERN: a refined sense and stylish air; a genius at reading how others feel. EVERYDAY: re-edits the email three times; tools and stationery lovingly over-researched. MALE: smart and elegant; pleasant company who makes no enemies. FEMALE: neat and refined, the kind you want to protect — though her money sense is quite realistic.",
 丁亥:"CLASSIC: a lighthouse over the night sea — the guide. MODERN: rich cultivation and a warm nature; looked to as a mentor or counselor, with a strong inner core. EVERYDAY: the friend people call at midnight; rarely says who THEY call. MALE: rich learning and a warm character, loved as a spiritual mentor and adviser, with a strong inner core. FEMALE: a compassionate, gentle air together with a firm core; the sun that warms the home.",
 戊子:"CLASSIC: a mountain concealing a spring — still waters in stone. MODERN: a gift for building wide networks; big results in business or sales, and good at looking after people. EVERYDAY: colleagues discover a year later that they invest well or speak three languages. MALE: a talent for building a wide network, producing big results in business or sales, and caring toward others. FEMALE: calm and approachable, a much-loved mood-maker with a firm, realistic sense for money.",
 戊寅:"CLASSIC: a mountain wearing a young forest — the bold builder. MODERN: solid, weighty dignity and strong vitality to face down difficulty. EVERYDAY: first to volunteer to lead; publicly backs the junior who made the mistake. MALE: boss-like and dependable, with an entrepreneur's spirit unafraid of risk. FEMALE: strongly independent, not the type to walk behind a man; a career-loving big sister.",
 戊辰:"CLASSIC: a great dam holding spring floods — power under control. MODERN: strong-spirited and sturdy; stubborn and a natural boss-figure with real driving force, able to pull a group forward; can be hard on others, but is never soft on themselves, so people rely on them; often carries a magnetic allure and is popular with the opposite sex. EVERYDAY: steadiest voice during the outage; the one who ends up leading the group without being asked; visibly bored by easy work. MALE: charismatic; clear likes and dislikes; hates to lose; solid and dependable, sincere in character; not great at reading the room, mild yet stubborn; approachable, looks after people, a soft touch for those in need; a hard worker with a strong sense of justice and a self-sacrificing streak; can't stand things that don't add up. FEMALE: sociable with a strong will and a deep sense of responsibility; stubborn and headstrong, uncompromising and sometimes inflexible; a romantic who is bright and big-hearted; bold and sexy; looks after others, brimming with vitality; the big-sister type who moves at her own pace.",
 戊午:"CLASSIC: a volcano at noon — commanding heat. MODERN: overwhelming power, a great vessel; shows full ability by standing above others. EVERYDAY: the gym, the mountain, the heated debate — pick one daily or the pressure builds. MALE: a commanding presence and boss-figure; hates being ordered around most, a one-man type. FEMALE: very strong and tough; more often a career woman thriving on the front lines than one who stays home.",
 戊申:"CLASSIC: a mountain veined with ore — hidden riches worked into value. MODERN: solidly grounded yet quick-witted — an idea person, often multi-talented. EVERYDAY: fixed the broken workflow nobody owned; probably has a side income or two. MALE: dexterous and can do anything; business sense that seizes success efficiently. FEMALE: caring and frank; capable at work and relied upon by those around her.",
 戊戌:"CLASSIC: an ancient fortress hill — the guardian. MODERN: a stubborn craftsman's spirit (one of the 魁罡 pillars); never bends his beliefs and rises to the top of his own field. EVERYDAY: the one who tells the boss 'that's not right'; keeps friendships for decades. MALE: uncompromising, a silent-execution type; masters one craft to succeed. FEMALE: a cool, tough big-sister type; poor at flattery, lives by her true feelings, a capable realist.",
 己丑:"CLASSIC: a winter field resting under snow — patient cultivation. MODERN: sincerity itself; does a given role quietly and perfectly, with fortune rising steadily toward the later years. EVERYDAY: ten years honing one craft; hobbies like gardening or fermenting suit their soul. MALE: a picture of sincerity who does his role silently and perfectly; his fortune climbs steadily toward his later years. FEMALE: patient, building savings and a household foundation bit by bit — a fine supporter with a grounded, steady life.",
 己卯:"CLASSIC: garden soil gripped by living roots — giving under pressure. MODERN: charming and liked by all, worldly-wise; light-footed and highly sociable. EVERYDAY: the team's unofficial therapist; needs scheduled alone-time to empty what they've absorbed. MALE: pleasant and well-connected; a loved character who easily draws help from others. FEMALE: down-to-earth and approachable; a lover of conversation who becomes the heart of a community.",
 己巳:"CLASSIC: a warm terraced field — practical sunshine. MODERN: calm on the surface but holds an ego that will absolutely not yield underneath; high pride and hates to lose, with real power that grows stronger under adversity; hides many talents, capable of single-minded effort and of looking after others; their fortune opens when they put their own feelings honestly into words — that is when both people and luck come toward them. EVERYDAY: meal-preps the week; answers a friend's dream with a concrete first step, not just cheers; looks easy-going, but never actually backs down on what matters. MALE: honest and earnest; the dependable big-brother type who likes to take the lead; mild and warm on the outside with a gap between that surface and a strong, unbending core; has momentum and drive but can overrate his own ability; high self-respect, sincere, looks after people — and a short fuse when pushed. FEMALE: proud and hates to lose, doesn't know how to back down; thick-skinned and unfazed, strong against adversity; kind and helpful, bright and lively, spirited and bold; pleasant and cheerful, attentive and caring; stubborn, looks after others, with a down-to-earth approachability; poor at bowing her head to people; conservative when it comes to romance.",
 己未:"CLASSIC: an orchard in late summer — the nurturer's harvest. MODERN: a hard worker who advances step by step; a gentle mediator who listens well. EVERYDAY: the table always has one extra seat; career decisions quietly run through 'what's best for my people?'. MALE: sincere and earnest; no flash, but trusted by everyone, a quietly capable type. FEMALE: treasures family and friends and makes a homey space; caring, everyone's organizer, a good-wife-wise-mother type.",
 己酉:"CLASSIC: a harvested field hiding gems — modest excellence. MODERN: approachable and friends with anyone; a realist who values practical gains. EVERYDAY: their portfolio outshines their self-introduction; colleagues quietly reuse their checklists. MALE: sociable and well-informed; sharp on cost and benefit, never wastes effort. FEMALE: domestic and good at cooking and childcare; loves to chat and softens the room.",
 己亥:"CLASSIC: delta soil where the river meets land — absorbing depth. MODERN: peace-loving and kind, yet with a unique worldview — a mysterious air. EVERYDAY: newcomers orient by them; agrees amiably — and remembers everything. MALE: looks calm but can suddenly act boldly; carries a distinctive sensibility. FEMALE: sharp intuition that sees through a lie at once; looks gentle but makes quite realistic choices.",
 庚子:"CLASSIC: a sword resting in winter water — cool blade, warm depths. MODERN: a sharp mind and quick action; logical, and strong in debate and negotiation. EVERYDAY: wins the debate with precision, then keeps the old letters and the sad playlists. MALE: eloquent and very smart; hates waste and moves efficiently. FEMALE: sharp-tongued but a playful tsundere; can't rest until things are clearly black or white.",
 庚寅:"CLASSIC: an axe ringing in a spring forest — decisive renewal. MODERN: a fierce temperament with overwhelming drive and breakthrough power; independent and self-reliant. EVERYDAY: declutters closets and org charts with equal joy; steps in instantly when someone's wronged. MALE: a very fierce temperament, with overwhelming action and breakthrough power that cuts the path open — an independent, single-handed spirit. FEMALE: hates to lose and throws herself fully at everything with guts; a mannish dependability alongside a hidden feminine passion.",
 庚辰:"CLASSIC: a great blade in the forge — heroic capacity. MODERN: strong will and overwhelming drive (one of the 魁罡 pillars); a turbulent life, but the vessel for great success. EVERYDAY: does their finest work at the edge of a deadline; raises a hand for the 'impossible' project. MALE: overwhelming charisma and decisiveness, with the power to bounce back from any adversity. FEMALE: very strong-willed, a queen-like nature that allows no compromise; often a beauty who carves her own path.",
 庚午:"CLASSIC: steel glowing in the furnace — strength through fire. MODERN: forthright, even combative, and refreshingly straight; bright and clear-cut, thinks in simple, direct lines; carries an unwavering strength, hates to lose and holds high pride; strongly curious and prone to hesitation, but once they get absorbed in something it tends to turn into results. EVERYDAY: career leaps right after hardships; says the honest thing plainly; hates being pitied more than being hurt. MALE: self-assured and rational; honest and stubborn; not smooth at romance; secretly unsettled and lonely-hearted under the confidence; hates to lose, likes things in clear black-and-white; unafraid of change and unable to hide his own feelings; an individual, original way of thinking; deeply curious. FEMALE: boyish and bright, refreshingly no-nonsense; a hard worker with a strong will to win; a little devilish and charming, with a childlike side too; highly-strung and tires easily, with big mood swings; a strong sense of justice and a short fuse; emotionally rich and overflowing with vitality.",
 庚申:"CLASSIC: a sword on its own whetstone — the sharpest edge. MODERN: top-class speed and offensive drive; a challenger who burns hotter the harder things get. EVERYDAY: finishes what others avoid; feedback blunt but fair; a ranking or rival doubles their output. MALE: a fearless man of action, a mass of vitality always fighting at the front. FEMALE: refreshingly frank and never complains; action power beyond most men.",
 庚戌:"CLASSIC: a sword laid upon the altar — consecrated steel. MODERN: a strong sense of justice that hates anything crooked (one of the 魁罡 pillars); once decided, he sees it through as if his life depended on it. EVERYDAY: reports what others pretend not to see; treats a promise as physically binding. MALE: deeply loyal and warm-hearted, willing to put himself on the line for his comrades — a man of conviction. FEMALE: a dignified beauty and strength; lives by her own power without leaning on any man.",
 辛丑:"CLASSIC: a gem sleeping in frozen ground — worth revealed slowly. MODERN: deeply introspective; steady effort brings great success from middle age onward. EVERYDAY: underestimated at first meeting, indispensable within the year. MALE: few words but a strong passion hidden inside — a late bloomer. FEMALE: modest and patient, with a diamond-hard will within.",
 辛卯:"CLASSIC: a jewel among thorns — delicate, unbreakable. MODERN: a delicate aesthetic and intellect; shows talent in art and creative fields, with a soft manner toward people. EVERYDAY: soft-spoken until a principle is touched; somehow elegant even mid-crisis. MALE: a delicate aesthetic sense and intellect, gifted in art and creative fields, gentle and soft in manner. FEMALE: loveliness and nobility at once — a popular type who nonetheless holds firmly to her own policy.",
 辛巳:"CLASSIC: gold flashing in flame — glamour and nerve. MODERN: gifted with intuition and a sixth sense; a unique elegance and a mysterious air. EVERYDAY: best-dressed in the meeting; a live audience turns their 80% into 120%. MALE: a high aesthetic sense and singular taste; mysterious and inclined to secrecy. FEMALE: a genius at seeing through things by intuition; proud, and won't settle for a compromised love.",
 辛未:"CLASSIC: jade resting in warm dust — gentle pride. MODERN: reserved and quiet, understated and slow to assert themselves, yet with genuinely sharp judgment; warm-hearted and eager to do things for others, gentle in nature, with a stubborn streak that keeps hold of its own will; capable of producing treasure-like gold when things go well, but just as capable of letting talent stay buried — they need to act and put themselves forward deliberately. EVERYDAY: one sincere 'thank you' powers them for weeks; the quiet one whose read on a situation turns out to be right; holds back until nudged to step up. MALE: stylish with a cool image, yet frank and friendly; quiet and modest; clear likes and dislikes; the power-behind-the-scenes type; an earnest, steady worker who builds up bit by bit; peace-loving and conflict-averse; quick-witted, with one straight, unwavering conviction. FEMALE: gentle and unassuming; a patient, persevering hard worker; noble-minded with a strong volunteering spirit; a strong core and stubborn, in truth a bit self-willed; tends to undervalue herself; delicate and cautious, and weak to a firm push.",
 辛酉:"CLASSIC: pure crystal — clarity without compromise. MODERN: a razor-sharp intellect and high aesthetics — a perfectionist with uncompromising professional pride. EVERYDAY: cannot ship sloppy work even exhausted; mentally edits typos in other people's slides. MALE: a perfectionist so exacting he can seem cold; holds absolute pride in his work. FEMALE: a dignified, noble beauty; proud, and takes her time before revealing her true heart.",
 辛亥:"CLASSIC: a pearl in deep water — hidden luster. MODERN: a delicate sensibility and a romantic heart; his own aesthetic, and a dislike of compromise. EVERYDAY: rich private hobbies; the few allowed close keep discovering rooms in them. MALE: highly sensitive, with real talent in the arts; a little nervous and high-strung. FEMALE: a sharp intellect paired with a fragility you can't leave alone — a mysteriously charming person.",
 壬子:"CLASSIC: the ocean at midnight — vast tide of feeling. MODERN: an ocean-vast energy; a turbulent life, but very strong when the stakes are highest. EVERYDAY: moods like tides, midnight creative surges; strangers confess their secrets to them. MALE: overwhelming vitality; leads large organizations or founds great ventures. FEMALE: cool and intellectual, never breaking her own pace; cools in an instant if restrained.",
 壬寅:"CLASSIC: a river running through a spring forest — the current that gives life. MODERN: large in scale and loves adventure; optimistic, and tough enough to live anywhere. EVERYDAY: shares contacts freely; happiest watching someone they helped bloom. MALE: prefers a bright, dynamic life; big-hearted enough to laugh off hardship. FEMALE: intelligent, bright and free-spirited; her talent blooms in open, unconstrained settings.",
 壬辰:"CLASSIC: a dragon commanding the flood — vast contained ambition. MODERN: rich imagination and the power to voice — and realize — a grand dream; a big-vessel type, turbulent yet glamorous. EVERYDAY: plans in years, on maps; a strong rival or grand target snaps everything into focus. MALE: rich imagination, a big-league figure who speaks a grand dream and has the power to make it real; turbulent but glamorous. FEMALE: very strongly independent; prefers to spread her wings in the world rather than settle into home, carrying a splendid aura.",
 壬午:"CLASSIC: the sea mirroring the noon sun — water in love with fire. MODERN: large in scale and hates being tied down most of all — a traveler who rides life's waves on intuition. EVERYDAY: analytical job, romantic soul; irresistibly drawn to their own opposite. MALE: intellectual yet full of action; loves a free life that won't fit inside any frame. FEMALE: clever and decisive; states her opinion plainly, refreshingly frank.",
 壬申:"CLASSIC: a spring bursting from rock — inexhaustible source. MODERN: a strong appetite for learning and knowledge — gathering all kinds of knowing is a genuine joy for them; rich in knowledge but poor at organizing it, so it doesn't always convert into results; values not just study but lived experience, so their life stacks up many events and adventures; sharp insight, a mood-maker who lifts the group, and a bit of a show-off who grows when praised. EVERYDAY: a notebook of a hundred ideas; thinks best while walking, riding, moving; the one who reads the room and warms it up. MALE: mild-natured and clever; quick to anger yet indecisive; smart and dexterous, easy to get along with, popular with women; strong drive to improve, an earnest and diligent worker; hungry for knowledge, friendly and talkative, a cheerful show-off with quick feet; research-minded but also highly-strung and a worrier, shy, and can be a little insensitive to others' feelings. FEMALE: an intelligent beauty with a mysterious, cool air; serious and dutiful; a mood-maker who draws people in; blessed with good fortune; proud, spirited and hates to lose; realistic and steady; friendly and sociable, yet carrying a delicate sensitivity; deeply curious; brightens everyone around her — but is prone to loneliness and feels stress easily.",
 壬戌:"CLASSIC: a deep lake held by hills — reserve and release. MODERN: foresight and strategy; loves freedom and hates restraint — a person of large scale. EVERYDAY: quiet through the brainstorm, then the single proposal that ends it; trust built over years. MALE: a genius at reading the flow of the world; overcomes any trouble with his strategy. FEMALE: quick-minded and frank; adaptable, and survives in any environment.",
 癸丑:"CLASSIC: snow blanketing a winter field — warmth kept under cold. MODERN: few words but excellent execution; a reliable person who quietly piles up effort. EVERYDAY: the one who stays when everyone leaves; remembers a kindness for twenty years. MALE: patient and silent in execution; highly trusted, becomes a pillar of the organization. FEMALE: patient, with the grit to overcome any hardship with a smile; loves single-heartedly.",
 癸卯:"CLASSIC: morning dew on spring flowers — purity that heals. MODERN: a pure, well-bred feel; kind to everyone and highly likable. EVERYDAY: plants, pets and tired friends revive around them; their few words land exactly where it hurts less. MALE: sincere and gentle, a well-bred young-master type naturally supported by those around him. FEMALE: an angelic, healing presence; honest and lovable, greatly doted on by elders and superiors.",
 癸巳:"CLASSIC: rain falling on warm land — quick nourishment. MODERN: sharp intuition and a mysteriously strong luck that turns a pinch into a chance. EVERYDAY: introduces exactly the right two people; learns a new city, tool or crowd in days. MALE: keen intuition and a good read on the times; secretive, and won't show his hand. FEMALE: an almost psychic, mysterious charm; attentive and much loved by the opposite sex.",
 癸未:"CLASSIC: mist settling over an orchard — soft permeation. MODERN: warm and kind, devoted to others; deeply trusted by those around. EVERYDAY: somehow the final plan is theirs, and no one remembers them raising their voice. MALE: peace-loving and conflict-averse; kind to all, prized as the team's coordinator. FEMALE: modest and gentle, brimming with maternal instinct; skilled at keeping the balance around her.",
 癸酉:"CLASSIC: a clear stream over white stones — transparency. MODERN: calm on the surface, yet a many-talented, keenly sensitive strategist; skilled at navigating the world, with real drive and a very strong will to see a purpose through to the end; kind and caring, and often a beauty with a delicate allure; has a moody side, but excellent balance and flexibility let them move through life smoothly. EVERYDAY: spots the flaw and says it kindly; keeps promises to the minute; reads the currents and rides them without forcing. MALE: kind and looks after people; sharp intuition; quick-witted and dexterous; hates to lose, proud and strong-willed; decisive and action-taking; honest, says what he'll do and does it; self-assured with a strong independent streak; can be emotional and self-centered, which sometimes makes enemies. FEMALE: kind and caring; refreshingly frank; refined and delicate; active and can't lie to herself; values doing what she says; strong-willed and proud; a delicate, elegant beauty; the caring big-sister type; a touch mannish and highly action-oriented, with a short fuse; genuinely strong management ability.",
 癸亥:"CLASSIC: the great river meeting the sea — boundless flow. MODERN: the very last of the sixty pillars — a late-blooming great vessel that embraces everything. EVERYDAY: strangers tell them life stories; vivid dreams; burns out without regular solitude. MALE: looks cool but is deeply passionate within; suited to specialist work he masters in his own way. FEMALE: patient, with astonishing reserves to overcome any hardship; single-hearted, with a deep love."
};
/* Geminiへ渡す“フル解釈デッキ”（高密度圧縮版・全次元を短句で保持）
   mini=true で相手用の縮約版（相性時のコスト削減） */
window.richGrounding=function(pro,mini){
  var f=window.fullProfile(pro); if(!f) return '';
  function tg(x){ return (TENGOD_MEAN[x]||'').split(',')[0]; }
  function st(x){ return (STAGE_MEAN[x]||'').split(',')[0]; }
  function el(x){ return (EL_MEAN[x]||'').split(',')[0]; }
  var L=[];
  L.push('== CHART DECK (weave several; never lean on one) ==');
  /* 時刻不明＝三柱鑑定：時柱に依存する話題は断定しない */
  var hasHour=(f.pillars||[]).some(function(p){return /時|时/.test(p.label||'');});
  if(!hasHour) L.push('NOTE: birth time unknown -> 3-pillar reading. Never assert hour-pillar topics (late-life detail, children specifics). If such a topic comes up, answer from the 3 pillars and gently mention that adding the birth time later would sharpen it.');
  var core='CORE: day '+f.dayGanzhi+' '+(f.dayStage||'')+'('+st(f.dayStage)+')';
  if(f.genmei) core+=' | LIFE-CORE '+f.genmei+'('+tg(f.genmei)+') = strongest engine';
  L.push(core);
  /* 六十干支の日柱特性：性格の土台として常に参照させる */
  if(GZ60[f.dayGanzhi]) L.push('DAY-PILLAR NATURE (60干支 '+f.dayGanzhi+'): '+GZ60[f.dayGanzhi]+' >> This is the base color of their personality. Translate CLASSIC imagery poetically into the user\'s language, use MODERN as the type reading, and adapt the EVERYDAY examples into concrete relatable scenes — those examples are what make them say このアプリ、私のこと分かってる. Some pillars carry MALE:/FEMALE: sections — '+(mini?'THIS IS A PARTNER whose sex is not given here, so IGNORE the MALE:/FEMALE: lists entirely and read only from CLASSIC/MODERN/EVERYDAY (never apply the client\'s own sex to this person).':'use ONLY the one matching this person\'s sex (see the [Client ...] line at the top).'));
  /* 魁罡日生まれは人格の定義級の特徴 — 必ず織り込ませる */
  if(f.stars.indexOf('魁罡')>=0) L.push('KAIGOU(魁罡) DAY — DEFINING TRAIT, ALWAYS weave into any reading about who they are: born on one of the five strongest day pillars ('+f.dayGanzhi+'). Iron will, decisive black-or-white nature, natural leadership and striking presence; thrives on mastery and a clear mission; hates half-measures and being controlled; fortune swings big — soaring when focused, brittle when scattered. A personality reading that ignores this will feel wrong to them.');
  L.push('PILLARS: '+f.pillars.map(function(p){
    var s=(p.tenStar&&p.tenStar!=='日主')?(p.tenStar+'('+tg(p.tenStar)+')'):'self';
    return p.label.charAt(0)+' '+p.ganzhi+'='+s+'/'+(p.terrain||'')+'('+st(p.terrain)+')';
  }).join('; '));
  var surface={}; f.pillars.forEach(function(p){ if(p.tenStar&&p.tenStar!=='日主')surface[p.tenStar]=1; });
  var hidden={}; f.pillars.forEach(function(p){ (p.hiddenStems||[]).forEach(function(h){ if(h.tenStar&&!surface[h.tenStar])hidden[h.tenStar]=1; }); });
  var hk=Object.keys(hidden);
  if(hk.length&&!mini) L.push('HIDDEN DRIVES: '+hk.map(function(t){return t+'('+tg(t)+')';}).join(', '));
  if(!mini){ try{ var bz=tenGodBias(pro);
    var shape=bz.order.map(function(k){return k+bz.counts[k];}).join(' ');
    var parts=[];
    bz.dominant.forEach(function(k){ parts.push('HEAVY '+k+' → '+bz.heavyHint[k]); });
    bz.missing.forEach(function(k){ parts.push('MISSING '+k+' → '+bz.noneHint[k]); });
    var typeTxt=bz.type==='balanced'?'BALANCED — evenly spread across the five groups: versatile, no single obsession, adapts to many roles':(bz.type==='mild'?'MILD LEAN — a gentle emphasis but no extreme; mostly rounded':'SKEWED — a real concentration/gap that shapes them');
    L.push('TEN-GOD BALANCE(通変星の偏り '+shape+'; '+typeTxt+') — '+(parts.length?parts.join(' | '):'no group dominates and none is missing; treat as a balanced, adaptable set')+'. This is a CORE personality signal: read any heavy group as their defining gift AND its caution, and any missing group as a life theme they route around; if balanced, emphasise versatility. Plain everyday words only; name the group (比劫/食傷/財/官殺/印) ONLY in theory mode.');
  }catch(e){} }
  L.push('ELEMENTS: strong '+f.strong.join('')+'('+f.strong.map(el).join('/')+') weak '+f.weak.join('')+'('+f.weak.map(el).join('/')+')'+(f.zero.length?(' missing '+f.zero.join('')):''));
  if(f.rels.length) L.push('DYNAMICS: '+f.rels.map(function(r){return r.kind+(r.el?('('+r.el+')'):'')+' '+r.branches.join('')+(r.pillars?('['+r.pillars.join('×')+'柱]'):'')+'='+((REL_MEAN[r.kind]||'').split(' — ')[0]);}).join('; '));
  else L.push('DYNAMICS: none — even, self-contained chart');
  /* 日柱と他柱の縁：干合・支合・天地徳合・日支冲（人生の土台に直結する重要シグナル） */
  var dpb=dayPillarBonds(pro);
  if(dpb.some(function(r){ return r.kind==='天地徳合'; })) L.push('⭐ MUST MENTION — their chart holds a PERFECT UNION (天地徳合) with their day pillar (see DAY-PILLAR BONDS). Whenever you read their nature, love, marriage, partner, family or life foundation, name it in plain words by the LIFE AREAS it joins (e.g. 「あなた自身と、'+({年:'家族や生まれ育ち',月:'仕事や人付き合いの場',時:'これからの人生や子ども'}[dpb.filter(function(r){ return r.kind==='天地徳合'; })[0].to]||'')+'が、天と地の両方でぴったり結びつく珍しい形」) and say what it means for that topic — never 年の柱/月の柱/日の柱/時の柱 or "pillar". Never skip it in those readings.');
  if(dpb.length) L.push('DAY-PILLAR BONDS: '+dpb.map(function(r){
    if(r.kind==='天地徳合') return 'PERFECT UNION(天地徳合) w/ '+r.to+'-pillar '+r.gz+' — rare stem+branch double harmony; a defining bond (family/partner/foundation)';
    if(r.kind==='干合') return 'stem-union(干合'+(r.el?('->'+r.el):'')+') w/ '+r.to+'-pillar '+r.gz+' — magnetic binding theme';
    if(r.kind==='支合') return 'branch-bond(支合) w/ '+r.to+'-pillar '+r.gz+' — quiet steady tie';
    return 'day-branch CLASH(冲) w/ '+r.to+'-pillar '+r.gz+' — recurring shakeups at life core';
  }).join('; '));
  try{ var _kgn=window.kagaiNote?window.kagaiNote(pro):''; if(_kgn) L.push(_kgn.trim()); var _spn=window.starPlacementNote?window.starPlacementNote(pro):''; if(_spn) L.push(_spn.trim()); }catch(e){}
  if(f.stars.length) L.push('STARS: '+f.stars.map(function(s){return s+'('+((STAR_MEAN[s]||'').split(' — ')[0].split(',')[0])+')';}).join(', ')+' — USE these: weave 1-2 stars whenever the topic touches them (love/charm→咸池·紅艶, study·exams·writing→文昌, travel·moves→驛馬, hidden support·money→暗禄·金与禄, protection→天乙·天德·福星, career→天官, obstacles→妨害殺·劫殺·囚獄). Prime personalization material.');
  if(!mini&&f.voids&&f.voids.length) L.push('VOID: '+f.voids.join('')+' (effort spins wheels there until matured)');
  if(!mini){
    var lk=[];
    /* 運の支×命式：三合/方合の成立・冲刑合を短句で添える（見逃し厳禁の judgement 材料） */
    function trTag(gz){
      if(!gz||gz.length<2) return '';
      var parts=transitRels(pro,gz.charAt(1)).map(function(r){
        if(r.kind==='三合成立') return 'COMPLETES trine('+r.el+') w/ natal '+r.withs.join('')+' -> that element floods in';
        if(r.kind==='方合成立') return 'COMPLETES directional('+r.el+') w/ natal '+r.withs.join('')+' -> season of '+r.el;
        if(r.kind==='半合') return 'half-trine('+r.el+') w/ '+r.withs.join('');
        var mean={六合:'bond',冲:'CLASH-shakeup',刑:'friction',破:'crack',害:'hidden strain'}[r.kind]||r.kind;
        return r.kind+'('+mean+') vs natal '+r.to;
      });
      /* 運の干が日干と干合＝その期間の強い縁・引力 */
      if(CP_KANGO[pro.dayMaster.stem]===gz.charAt(0)) parts.push('stem-union(干合) with day master -> strong pull/bond period');
      /* 運の支が神殺を発動（咸池=モテ期、驛馬=移動運など） */
      var st2=transitStars(pro,gz.charAt(1));
      if(st2.length) parts.push('activates '+st2.map(function(n){return n+'('+((STAR_MEAN[n]||'').split(' — ')[0].split(',')[0])+')';}).join(', '));
      return parts.length?(' <'+parts.join('; ')+'>'):'';
    }
    if(f.cur) lk.push('now '+f.cur.ganzhi+' '+f.cur.tenStar+'('+tg(f.cur.tenStar)+') age'+(f.cur.isMonth?('0-'+f.cur.endAge+'y'+(f.cur.endMonths||0)+'m(1st=month pillar)'):(f.cur.startAge+'y'+(f.cur.months||0)+'m-'+f.cur.endAge+'y'+(f.cur.months||0)+'m'))+' ['+decadeYears(pro,f.cur)+']'+trTag(f.cur.ganzhi));
    if(f.next) lk.push('next '+f.next.ganzhi+' '+f.next.tenStar+' from'+f.next.startAge+'y'+(f.next.months||0)+'m ['+f.next.startYear+'/'+f.next.startMonth+']');
    if(f.ty) lk.push(f.ty.year+' '+f.ty.ganzhi+' '+f.ty.tenStar+'('+tg(f.ty.tenStar)+')'+trTag(f.ty.ganzhi));
    if(f.ny) lk.push(f.ny.year+' '+f.ny.ganzhi+' '+f.ny.tenStar+'('+tg(f.ny.tenStar)+')'+trTag(f.ny.ganzhi));
    if(lk.length) L.push('LUCK: '+lk.join('; '));
    /* 三者成立（命式＋大運＋年運）は年の最重要テーマとして別行で強調 */
    var db=f.cur&&f.cur.ganzhi?f.cur.ganzhi.charAt(1):null;
    var trip=[];
    if(db&&f.ty&&f.ty.ganzhi) comboRels(pro,db,f.ty.ganzhi.charAt(1)).forEach(function(c){ trip.push('THIS YEAR: natal '+c.natal+' + decade '+c.daiun+' + year '+c.year+' COMPLETE '+(c.kind==='三合成立'?'trine':'directional')+'('+c.el+') — that element floods in; a defining theme of this year'); });
    if(db&&f.ny&&f.ny.ganzhi) comboRels(pro,db,f.ny.ganzhi.charAt(1)).forEach(function(c){ trip.push('NEXT YEAR('+f.ny.year+'): natal '+c.natal+' + decade '+c.daiun+' + year '+c.year+' COMPLETE '+(c.kind==='三合成立'?'trine':'directional')+'('+c.el+')'); });
    if(trip.length) L.push('TRIPLE ALIGNMENT: '+trip.join(' | '));
  }
  return L.join('\n');
};

/* 照合ページ(verify.html)用の追加公開。アプリ本体の動作には影響しない */
window.gogyoBalance=gogyoBalance;
window.natalRelationsX=natalRelations;
window.kuboX=kubo;
window.kuuboNow=kuuboNow;
