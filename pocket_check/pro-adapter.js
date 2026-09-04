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
  比劫:'strong independent will & self-reliance, carves their own path (caution: can turn stubborn / one-man and stop listening; friction with family, friends, colleagues; money flows out fast — watch overspending and money mixed into friendships (loans, going in together); thrives in independent / freelance / specialist work rather than under a boss)',
  食傷:'rich expression, ideas and talent, loves freedom (caution: says too much / chafes inside rigid organisations)',
  財:'warm, considerate, good with people, service-minded, an eye for opportunity (caution when over-abundant / the self is outmatched = 多財身弱: indecisive and easily swayed, can\'t say no / people-pleasing to exhaustion (八方美人), loose with money and pulled around by it — watch gambling & debt, weak on follow-through, affections/opposite-sex can scatter; remedy = a firmer own-axis, boundaries and firm money rules)',
  官殺:'strong responsibility, integrity & self-discipline, holds up under pressure, dignified (caution: feels pressure keenly and nerves over-sensitise, over-responsible and corners the self, high pride / minds others\' eyes, job or environment changes often; for a woman also touches the partner domain — read gently, never predict divorce; needs real release valves and to put some load down)',
  印:'learning, deep thinking, receptivity, warmth & being cared-for (caution: over-thinks and acts slowly, borrows worry from the future, can grow dependent/passive when pampered, gentle outside but stubborn inside; too much even dilutes its own gifts — must pair with real action & output)'
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
      if(h.tenStar&&TS_GROUP[h.tenStar]) g[TS_GROUP[h.tenStar]]+=(h.ling?1.0:0.5);
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

/* 三合局ベースの吉凶星（base=日支）。将星=三合の旺(中神)、華蓋=三合の墓。
   水局申子辰:旺子/墓辰、火局寅午戌:旺午/墓戌、金局巳酉丑:旺酉/墓丑、木局亥卯未:旺卯/墓未。 */
const KICHI_NICHI={水:{咸池:'酉',驛馬:'寅',劫殺:'巳',亡神:'亥',囚獄:'午',将星:'子',華蓋:'辰'},火:{咸池:'卯',驛馬:'申',劫殺:'亥',亡神:'巳',囚獄:'子',将星:'午',華蓋:'戌'},金:{咸池:'午',驛馬:'亥',劫殺:'寅',亡神:'申',囚獄:'卯',将星:'酉',華蓋:'丑'},木:{咸池:'子',驛馬:'巳',劫殺:'申',亡神:'寅',囚獄:'酉',将星:'卯',華蓋:'未'}};

const BLOOD={子:'戌',丑:'酉',寅:'申',卯:'未',辰:'午',巳:'巳',午:'辰',未:'卯',申:'寅',酉:'丑',戌:'子',亥:'亥'};

const KAIGOU=new Set(['庚辰','庚戌','壬辰','戊戌']);

const ROKUBA=new Set(['壬午','癸巳']);

const KICHI_NIKKAN={
  甲:{天乙貴人:['丑','未'],文昌貴人:['巳'],金与禄:['辰'],暗禄:['亥'],羊刃:['卯'],飛刃:['酉'],太極貴人:['子','午'],紅艶:['午'],天厨貴人:['巳'],福星貴人:['子','寅'],天官貴人:['未']},
  乙:{天乙貴人:['子','申'],文昌貴人:['午'],金与禄:['巳'],暗禄:['戌'],羊刃:['辰'],飛刃:['戌'],太極貴人:['子','午'],紅艶:['申'],天厨貴人:['午'],福星貴人:['丑','亥'],天官貴人:['辰'],妨害殺:['卯','酉']},
  丙:{天乙貴人:['亥','酉'],文昌貴人:['申'],金与禄:['未'],暗禄:['申'],羊刃:['午'],飛刃:['子'],太極貴人:['卯','酉'],紅艶:['寅'],天厨貴人:['巳'],福星貴人:['子','戌'],天官貴人:['巳']},
  丁:{天乙貴人:['亥','酉'],文昌貴人:['酉'],金与禄:['申'],暗禄:['未'],羊刃:['未'],飛刃:['丑'],太極貴人:['卯','酉'],紅艶:['未'],天厨貴人:['午'],福星貴人:['酉'],天官貴人:['酉']},
  戊:{天乙貴人:['丑','未'],文昌貴人:['申'],金与禄:['未'],暗禄:['申'],羊刃:['午'],飛刃:['子'],太極貴人:['辰','戌','丑','未'],紅艶:['辰'],天厨貴人:['申'],福星貴人:['申'],天官貴人:['戌'],妨害殺:['子','午']},
  己:{天乙貴人:['子','申'],文昌貴人:['酉'],金与禄:['申'],暗禄:['未'],羊刃:['未'],飛刃:['丑'],太極貴人:['辰','戌','丑','未'],紅艶:['辰'],天厨貴人:['酉'],福星貴人:['未'],天官貴人:['卯'],妨害殺:['卯','酉']},
  庚:{天乙貴人:['丑','未'],文昌貴人:['亥'],金与禄:['戌'],暗禄:['巳'],羊刃:['酉'],飛刃:['卯'],太極貴人:['寅','亥'],紅艶:['戌'],天厨貴人:['亥'],福星貴人:['午'],天官貴人:['亥']},
  辛:{天乙貴人:['午','寅'],文昌貴人:['子'],金与禄:['亥'],暗禄:['辰'],羊刃:['戌'],飛刃:['辰'],太極貴人:['寅','亥'],紅艶:['酉'],天厨貴人:['子'],福星貴人:['巳'],天官貴人:['申'],妨害殺:['酉']},
  壬:{天乙貴人:['卯','巳'],文昌貴人:['寅'],金与禄:['丑'],暗禄:['寅'],羊刃:['子'],飛刃:['午'],太極貴人:['巳','申'],紅艶:['子'],天厨貴人:['寅'],福星貴人:['辰'],天官貴人:['寅'],妨害殺:['子','午']},
  癸:{天乙貴人:['卯','巳'],文昌貴人:['卯'],金与禄:['寅'],暗禄:['丑'],羊刃:['丑'],飛刃:['未'],太極貴人:['巳','申'],紅艶:['申'],天厨貴人:['卯'],福星貴人:['卯'],天官貴人:['午'],妨害殺:['巳']}
};

function fukyuList(counts,th){
  const taika=SHENG.filter(k=>counts[k]>=th), strong=th-1, out=[];
  SHENG.forEach(k=>{const v=counts[k];
    if(v===0){out.push({el:k,why:'0=완전히 결여'});return;}
    if(v===1){const a=ATTACK_EL[k],av=counts[a]||0;
      if(av>=strong&&av>v){out.push({el:k,why:`${a}${av}에 극을 당해 약해짐(공격으로 불급)`});return;}
      if(taika.length){out.push({el:k,why:`1뿐이어서 태과(${taika.join('·')})의 치우침에 눌림`});return;}}});
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
  if(zero.length>=2)verdict='치우침 큼(여러 오행이 결여됨)';
  else if(spread<=1)verdict='균형 양호(오행이 비교적 고루 갖춰짐)';
  else if(spread===2)verdict='다소 균형형';
  else if(spread<=3)verdict='약간 치우침';
  else verdict='치우침이 강함';

  const dayEl=c.dayMaster.element;
  const support=counts[dayEl]+counts[GEN[dayEl]];
  const stem=c.dayMaster.stem, mb=c.pillars[1]?c.pillars[1].branch:'', mt=c.pillars[1]?c.pillars[1].terrain:'';
  const tokurei=(TOKUREI[stem]||[]).includes(mb);
  const terrScore=(TERR_STR[mt]!=null?TERR_STR[mt]:0);
  const supScore=support>=5?1:support<=1?-2:support===2?-1:0;
  const sScore=(tokurei?3:0)+terrScore+supScore;
  const strength=sScore>=4?'신강(자아가 강하고 에너지 왕성)':sScore>=2?'다소 신강':sScore<=-4?'신약(섬세하고 소모되기 쉬움)':sScore<=-2?'다소 신약':'중화에 가까움';
  return {counts,total,max,min,strong,weak,zero,spread,verdict,dayEl,support,strength,tokurei,monthBranch:mb,monthTerr:mt,terrScore,supScore,sScore};
}

function strengthType(c){const s=gogyoBalance(c).sScore;return s>=2?'身強':s<=-2?'身弱':'中和';}

function gogyoTaika(c){
  const th=c.timeUnknown?3:4;
  const base={}; SHENG.forEach(k=>base[k]=(c.fiveElements&&c.fiveElements[k])||0);
  const now=Object.assign({},base); let du='',ay='';
  if(c.now){
    const di=c.now.daeunIndex, dd=di>=0?c.decadeFortunes[di]:null;
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
  if(c.now){const di=c.now.daeunIndex, dd=di>=0?c.decadeFortunes[di]:null;
    const yy=c.annualFortunes&&c.annualFortunes.find(a=>a.year===c.now.year);
    if(dd&&voids.includes(dd.branch))duVoid=dd.ganzhi;
    if(yy&&voids.includes(yy.branch))ayVoid=yy.year+' '+yy.ganzhi;}
  const future=[];
  if(c.now&&c.annualFortunes)c.annualFortunes.filter(a=>a.year>=c.now.year&&a.year<=c.now.year+12).forEach(a=>{if(voids.includes(a.branch))future.push(a.year+'('+a.ganzhi+')');});
  return {voids, duVoid, ayVoid, active:!!ayVoid, future};
}

function kichi4Targets(base){const g=SANGO_KEY[base];const o=g?{...KICHI_NICHI[g]}:{};if(BLOOD[base])o['血刃']=BLOOD[base];return o;}

function kaigouOn(c){return KAIGOU.has(c.pillars[2].ganzhi);}

function rokubaOn(c){return ROKUBA.has(c.pillars[2].ganzhi);}

function markTimeUnknown(c){
  if(!c||!c.pillars||c.pillars.length<4)return c;
  const tp=c.pillars[3];
  const f=Object.assign({},c.fiveElements||{});
  const sEl=STEM_EL[tp.stem];
  const hk=tp.hiddenStems.find(h=>h.role==='本氣')||tp.hiddenStems[tp.hiddenStems.length-1];
  const bEl=hk?STEM_EL[hk.stem]:null;
  if(f[sEl]>0)f[sEl]--; if(bEl&&f[bEl]>0)f[bEl]--;
  c.fiveElements=f; c.hourPillar=tp; c.pillars=c.pillars.slice(0,3); c.timeUnknown=true;
  return c;
}
/* ---- Pocket鑑定 互換ラッパ ----
   旧 PersonBazi(y,m,d,hour,minute,timeUnknown,sex) と同じ形を返しつつ、
   .pro にフル命式（大運・年運・十神・蔵干・起運ほか）を持たせる */
window.PersonBazi=function(y,m,d,hour,minute,timeUnknown,sex,place){
  try{
    var opt={year:y,month:m,day:d,hour:(timeUnknown?12:(hour==null?12:hour)),minute:(timeUnknown?0:(minute==null?0:minute)),sex:(sex==='male'?'male':'female'),correctionMode:'none'};
    if(place&&place.lon!=null&&!timeUnknown){ opt.longitude=place.lon; opt.stdMer=place.mer; opt.correctionMode='full'; }
    var c=window.Bazi.computeChart(opt);
    if(timeUnknown) c=markTimeUnknown(c);
    /* ★年運は「立春」で切り替わる（暦年ではない）。tyme4tsは立春を正しく扱うので、今日の年柱(干支)を求め、
       annualFortunes の一致する年ラベルを現在年(now.year)に補正する＝1/1〜立春前に年運が1年先取りされる不具合を解消。 */
    try{
      if(c&&c.now&&c.annualFortunes&&c.annualFortunes.length){
        var _td=new Date(), _cy=_td.getFullYear();
        var _tc=window.Bazi.computeChart({year:_cy,month:_td.getMonth()+1,day:_td.getDate(),hour:12,minute:0,sex:'male',correctionMode:'none'});
        var _yp=_tc&&_tc.pillars&&_tc.pillars[0]&&_tc.pillars[0].ganzhi;
        if(_yp){
          var _cand=c.annualFortunes.filter(function(a){return a.ganzhi===_yp;});
          if(_cand.length){ _cand.sort(function(a,b){return Math.abs(a.year-_cy)-Math.abs(b.year-_cy);}); c.now.year=_cand[0].year; }
        }
      }
    }catch(e){}
    var kk=_kkAssess(c);
    var fav={},grpMap={};
    SHENG.forEach(function(el){var a=kk.assess(el);fav[el]=a.fav;grpMap[el]=a.grp;});
    var st=strengthType(c);
    return { ok:true, dayMaster:c.dayMaster,
      pillars:c.pillars.map(function(p){return {stem:p.stem,branch:p.branch,ganzhi:p.ganzhi,terrain:p.terrain,label:p.label,tenStar:p.tenStar,hiddenStems:p.hiddenStems};}),
      hourPillar:c.hourPillar||null,
      five:c.fiveElements, sType:st, fav:fav, grp:grpMap,
      timeUnknown:!!timeUnknown, pro:c };
  }catch(e){ return {ok:false,error:String(e&&e.message||e)}; }
};

/* ---- 神殺（日干・日支ベースの主要吉凶星）を命式の地支と照合 ---- */
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
    if(c.startFortune) L.push('Luck starts at age '+c.startFortune.years+'y'+c.startFortune.months+'m, direction:'+(c.startFortune.forward?'forward':'reverse'));
    if(c.now&&c.decadeFortunes){
      if(c.now.daeunIndex>=0){
        var dd=c.decadeFortunes[c.now.daeunIndex];
        if(dd) L.push('Current decade luck(大運): '+dd.ganzhi+' ['+dd.tenStar+'/'+dd.terrain+'] age '+dd.startAge+'-'+dd.endAge);
        var next=c.decadeFortunes[c.now.daeunIndex+1];
        if(next) L.push('Next decade luck: '+next.ganzhi+' ['+next.tenStar+'] from age '+next.startAge);
      } else {
        var d0=c.decadeFortunes[0];
        if(d0) L.push('Decade luck(大運) has NOT started yet (starts at age '+d0.startAge+'). First decade will be: '+d0.ganzhi+' ['+d0.tenStar+'] — speak of it as upcoming, never as the current decade.');
      }
    }
    if(c.now&&c.annualFortunes){
      var thisY=c.annualFortunes.find(function(a){return a.year===c.now.year;});
      var nextY=c.annualFortunes.find(function(a){return a.year===c.now.year+1;});
      if(thisY) L.push('This year('+thisY.year+'): '+thisY.ganzhi+' ['+thisY.tenStar+'/'+thisY.terrain+']');
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
  var seiritsu=[], hankai=[];
  [[CP_SANGO,'三合成立'],[FP_HOUGO,'方合成立']].forEach(function(pair){
    pair[0].forEach(function(g){ var need=g.slice(0,3);
      var inA=need.filter(function(x){return abr.indexOf(x)>=0;}), inB=need.filter(function(x){return bbr.indexOf(x)>=0;});
      var union=need.filter(function(x){return abr.indexOf(x)>=0||bbr.indexOf(x)>=0;});
      if(union.length===3&&inA.length>=1&&inB.length>=1&&inA.length<3&&inB.length<3)
        seiritsu.push({kind:pair[1],el:g[3],inA:inA,inB:inB});
      /* 半会（準三合＝三合の3支のうち2支）：二人で持ち寄って2支そろう（各自1支以上・全柱で照合）。※資料に合わせ三合ベースのみ（方合は対象外） */
      else if(pair[1]==='三合成立'&&union.length===2&&inA.length>=1&&inB.length>=1)
        hankai.push({kind:'半会',el:g[3],inA:inA,inB:inB,pair:union});
    });
  });
  /* 支合（六合）を日柱だけでなく全柱の支ペアで照合（重複除去） */
  var rikugouAll=[], _rgSeen={};
  abr.forEach(function(x){ bbr.forEach(function(y){ if(CP_RIKUGO[x]===y){ var k=x+y; if(!_rgSeen[k]){ _rgSeen[k]=1; rikugouAll.push([x,y]); } } }); });
  var score=60;
  if(kangou)score+=18; if(rikugou)score+=14; if(sango)score+=12;
  seiritsu.forEach(function(s){ score+=(s.kind==='三合成立'?14:12); });
  hankai.forEach(function(h){ score+=(h.kind==='半会'?9:8); });
  if(rikugouAll.length&&!rikugou) score+=8; /* 日柱以外の支合も加点 */
  if(stemRel==='same')score+=6; else if(stemRel==='aGenB'||stemRel==='bGenA')score+=10; else score-=6;
  if(chong)score-=14; if(kei)score-=10; if(ha)score-=4; if(gai)score-=6;
  score=Math.max(24,Math.min(98,score));
  // 主要な関係キー（強い順）
  var head; if(kangou)head='kangou'; else if(seiritsu.length)head='sango'; else if(hankai.length)head='hankai'; else if(rikugou||rikugouAll.length)head='rikugou'; else if(sango)head='sango';
    else if(chong)head='chong'; else if(kei)head='kei'; else head=stemRel;
  var ritchin=(aS===bS && aB===bB && !!aB); /* 日柱の干支が完全一致＝律音（日支が実在する時のみ） */
  return { aS:aS,bS:bS,aB:aB,bB:bB,aEl:aEl,bEl:bEl, ritchin:ritchin, kangou:kangou, stemRel:stemRel, rikugou:rikugou,
    sango:sango, seiritsu:seiritsu, hankai:hankai, rikugouAll:rikugouAll, chong:chong, kei:kei, ha:ha, gai:gai,
    tenAtoB:cpTenStar(aS,bS), tenBtoA:cpTenStar(bS,aS), score:score, head:head,
    good:(score>=60) };
};
/* Gemini用：相性の根拠を英語で列挙 */
window.compatGrounding=function(cd){
  var L=[];
  var ritchin=!!cd.ritchin; /* 二人の日柱の干支が完全一致＝律音（りっちん・compatDataで判定済み） */
  if(ritchin){ L.push('⚑ 律音 (RICCHIN) — the two share the EXACT SAME day 干支 ('+cd.aS+(cd.aB||'')+'). This is a rare "mirror" pairing: kindred spirits, almost one-heart (一心同体), values and rhythms align unusually closely. It is a MARK OF VERY HIGH, harmonious compatibility — like two people who just get each other. LEAD the whole reading with this as a strong, warm positive. Do NOT frame identical charts as a problem.'); }
  L.push('Day masters: you '+cd.aS+'('+cd.aEl+') / partner '+cd.bS+'('+cd.bEl+')');
  if(cd.kangou) L.push('Heavenly-stem union 干合 between day masters — strong natural attraction.');
  L.push('Five-element relation: '+({same:'same element (similar values)',aGenB:'you nourish them (you give/nurture)',bGenA:'they nourish you (you feel supported)',aKeB:'you restrain them (you lead/stimulate)',bKeA:'they restrain you (tension/learning)'}[cd.stemRel]));
  if(cd.rikugouAll&&cd.rikugouAll.length){
    L.push('⚑ BRANCH UNION 支合 (six-union) between the two charts'+(cd.rikugou?' (including the DAY branches — the closest, most personal spot)':'')+' — pairs: '+cd.rikugouAll.map(function(p){return p[0]+'+'+p[1];}).join(', ')+'. This is a "same-dimension" natural fusion: the two of you fit together smoothly and effortlessly, drawn to each other and able to become one without forcing it — like a current that flows without resistance. One of the THREE most important marriage-compatibility marks. Lead with it warmly.');
  } else if(cd.rikugou) L.push('Branch union 支合 between day branches — a drawn-together bond.');
  if(cd.seiritsu&&cd.seiritsu.length) cd.seiritsu.forEach(function(s){
    L.push('⚑⚑ COMPLETED '+(s.kind==='三合成立'?'FULL TRINE 三合会局':'directional 方合')+'('+s.el+') ACROSS the two charts — you bring '+s.inA.join('')+', partner brings '+s.inB.join('')+'. THE STRONGEST bond marker: together you complete a whole current neither has alone; that element ('+s.el+') becomes the couple\'s shared engine — a powerful "different-dimension" fusion. This is one of the three key marriage marks and the strongest of them. Lead the whole reading with this.');
  });
  if(cd.hankai&&cd.hankai.length) cd.hankai.forEach(function(h){
    L.push('⚑ HALF-TRINE 半会 (near-trine '+(h.el?'toward '+h.el:'')+') ACROSS the two charts — you bring '+h.inA.join('')+', partner brings '+h.inB.join('')+' (two of the three that would form a full '+h.el+' trine). A strong AND well-balanced fusion — "one step short of the full trine," but that is a plus: it climbs the stairs two at a time yet keeps its brakes and handles reality steadily. A genuinely strong marriage-compatibility mark (the second of the three key marks). Frame it as a real, warm positive.');
  });
  /* 三大マーク（三合会局・半会・支合）が一つも無い場合の扱い：諦めろとは絶対に言わない */
  if(!(cd.seiritsu&&cd.seiritsu.length)&&!(cd.hankai&&cd.hankai.length)&&!(cd.rikugouAll&&cd.rikugouAll.length)){
    L.push('[NOTE — the three special branch-bond marks (full trine 三合会局 / half-trine 半会 / union 支合) do not appear between these two charts. Do NOT treat this as "no good / give up on this relationship" and NEVER tell them to give up — those marks are ONE lens among many. Read the relationship warmly from everything else (day masters, stem union 干合, five-element flow, ten-god view). Absence of these marks is not a verdict; plenty of happy pairs do not have them.]');
  }
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
 劫殺:'sudden loss/robbery caution', 亡神:'loss/absent-mindedness caution', 血刃:'injury caution — care with the body'
};
var EL_MEAN={木:'growth, planning, kindness, assertiveness',火:'passion, visibility, joy, expression',土:'stability, trust, care, practicality',金:'decisiveness, structure, justice, refinement',水:'wisdom, adaptability, intuition, communication'};
var REL_MEAN={
 三合:'a powerful harmonious current strengthening that theme in their life',
 半合:'a partial pull toward that theme',
 半会:'a STRONG luck of forward momentum & growth — two-stairs-at-a-time drive, opens new paths through people',
 大半会:'a VERY STRONG forward drive — almost limitless momentum, bold and far-reaching (watch not to over-push)',
 方合:'a very strong concentration — a dominant life theme',
 六合:'a bonding, attracting force — smooth ties and pairing',
 冲:'an axis of push-pull & change — restlessness and major turning points',
 刑:'friction & adjustment — lessons, and care with legal/health matters',
 破:'small disruptions / minor breaks', 害:'hidden misunderstanding or subtle harm'
};
function fpBranches(pro){ return (pro.pillars||[]).map(function(p){return p.branch;}); }
function natalRelations(pro){
  var br=fpBranches(pro), labels=(pro.pillars||[]).map(function(p){return p.label;}), out=[];
  // 方合 (directional, needs all 3)
  FP_HOUGO.forEach(function(g){ var need=g.slice(0,3), hit=need.filter(function(x){return br.indexOf(x)>=0;}); if(hit.length===3) out.push({kind:'方合',el:g[3],branches:need.slice()}); });
  // 三合会局 / 宿命半会（12種類：三合の3支のうち2支。旺支必須の制限は外す）／大半会（半会の2支を持つ柱の干が同じ）
  CP_SANGO.forEach(function(g){ var need=g.slice(0,3), hit=need.filter(function(x){return br.indexOf(x)>=0;});
    if(hit.length>=3){ out.push({kind:'三合',el:g[3],branches:hit}); return; }
    if(hit.length===2){
      var b1=hit[0], b2=hit[1], s1={}, s2={};
      (pro.pillars||[]).forEach(function(p){ if(p.branch===b1&&p.stem)s1[p.stem]=1; if(p.branch===b2&&p.stem)s2[p.stem]=1; });
      var shared=Object.keys(s1).filter(function(s){return s2[s];});
      var dai=shared.length>0;
      out.push({kind:dai?'大半会':'半会',el:g[3],branches:hit,dai:dai,stem:dai?shared[0]:''});
    } });
  // pairwise 六合 / 冲 / 刑 / 破 / 害
  for(var i=0;i<br.length;i++)for(var j=i+1;j<br.length;j++){ var a=br[i],b=br[j];
    if(CP_RIKUGO[a]===b) out.push({kind:'六合',branches:[a,b]});
    if(cpChong(a,b)) out.push({kind:'冲',branches:[a,b]});
    if(cpKei(a,b)) out.push({kind:'刑',branches:[a,b]});
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
      else if(present.length===1) out.push({kind:'半会成立',el:g[3],w:branch,withs:present});
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
  if(pro.now&&pro.decadeFortunes){ var di=pro.now.daeunIndex; if(di>=0){ cur=pro.decadeFortunes[di]; next=pro.decadeFortunes[di+1]; } else { cur=null; next=pro.decadeFortunes[0]; } }
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
window.richGrounding=function(pro,mini,sex){
  var f=window.fullProfile(pro); if(!f) return '';
  var _sexLbl=(sex==='male')?'MALE':(sex==='female'?'FEMALE':'');
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
  if(GZ60[f.dayGanzhi]) L.push('DAY-PILLAR NATURE (60干支 '+f.dayGanzhi+'): '+GZ60[f.dayGanzhi]+' >> This is the base color of their personality. Translate CLASSIC imagery poetically into the user\'s language, use MODERN as the type reading, and adapt the EVERYDAY examples into concrete relatable scenes — those examples are what make them say このアプリ、私のこと分かってる. Some pillars carry MALE:/FEMALE: sections — '+(_sexLbl?('this person is '+(sex)+', so use ONLY the '+_sexLbl+': section and IGNORE the other (never apply the client\'s own sex to this person).'):(mini?'THIS IS A PARTNER whose sex is not given here, so IGNORE the MALE:/FEMALE: lists entirely and read only from CLASSIC/MODERN/EVERYDAY (never apply the client\'s own sex to this person).':'use ONLY the one matching this person\'s sex (see the [Client ...] line at the top).')));
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
    /* 官殺混雑：正官と偏官(七殺)が両方そろう＝正官の潔癖さが濁り、偏官の強い圧が出やすい。印があれば偏官の気が印に流れて緩和（吉に転じる） */
    var _hasSei=surface['正官']||hidden['正官'], _hasHen=surface['偏官']||hidden['偏官']||surface['七殺']||hidden['七殺'];
    if(_hasSei&&_hasHen){
      var _hasIn=surface['印綬']||hidden['印綬']||surface['正印']||hidden['正印']||surface['偏印']||hidden['偏印'];
      L.push('官殺混雑 (BOTH 正官 AND 偏官/七殺 present) — the orderly, upright "duty" star is mixed with the sharp "pressure" star, so the clean 正官 poise gets muddied and the tougher 偏官 edge shows through: pressure, high standards and inner strictness run stronger, and they especially need to steady and govern themselves. '+(_hasIn?'MITIGATED HERE: the chart also carries the resource/印 star, so that sharp pressure has somewhere to FLOW — it feeds their learning and growth instead of only bearing down; read it as pressure that can be turned into real development, a genuine plus, not just a weight.':'The remedy is deliberate self-discipline PLUS real release valves — the pressure needs an outlet.')+' For a WOMAN this cluster also touches the partner/husband domain — read it GENTLY as a relationship theme to tend with honest communication, NEVER as a prediction of conflict, a breakup or divorce.');
    }
  }catch(e){} }
  L.push('ELEMENTS: strong '+f.strong.join('')+'('+f.strong.map(el).join('/')+') weak '+f.weak.join('')+'('+f.weak.map(el).join('/')+')'+(f.zero.length?(' missing '+f.zero.join('')):''));
  if(f.rels.length) L.push('DYNAMICS: '+f.rels.map(function(r){return r.kind+(r.el?('('+r.el+')'):'')+' '+r.branches.join('')+'='+((REL_MEAN[r.kind]||'').split(' — ')[0]);}).join('; '));
  else L.push('DYNAMICS: none — even, self-contained chart');
  /* 宿命の三合会局／半会／大半会＝強運（発展運）として明示。前向きに読む */
  try{
    var _sango=f.rels.filter(function(r){return r.kind==='三合';});
    var _han=f.rels.filter(function(r){return r.kind==='半会'||r.kind==='大半会';});
    if(_sango.length) L.push('⚑ INBORN FULL TRINE 三合会局 ('+_sango.map(function(r){return r.el;}).join('/')+') in their own chart — a rare, powerful "good-luck engine": they carry a whole harmonious current of that energy, active across seasons; great reach, strong momentum, a year-round-active kind of fortune. Read it as a real strength.');
    if(_han.length){ var _hasDai=_han.some(function(r){return r.kind==='大半会';});
      L.push('⚑ INBORN 半会 (near-trine, '+_han.map(function(r){return (r.kind==='大半会'?'大半会':'半会')+r.el;}).join('/')+') in their OWN chart — treat this as STRONG luck, NOT a weak/partial thing. Meaning: a powerful FORWARD-MOVING, expanding fortune — they climb the stairs two at a time; ACTION is the key that raises their luck; new environments, widening circles of people and fresh challenges bring the turning points that open their life; unafraid of change, flexible-minded, they carve out their own future. Frame it warmly as real good fortune and encourage bold, people-connected action.'
        +(_hasDai?' ★ AND it is 大半会 (grand half-trine — the two share the same heavenly stem): an EVEN STRONGER forward drive, like charging toward almost limitless possibility, connecting with many people even across boundaries. ONE gentle caution (say it kindly, not as doom): the brakes can be hard to apply, so watch for over-confidence or pushing too far — ride the momentum, but not recklessly.':''));
    }
  }catch(e){}
  /* 日柱と他柱の縁：干合・支合・天地徳合・日支冲（人生の土台に直結する重要シグナル） */
  var dpb=dayPillarBonds(pro);
  if(dpb.length) L.push('DAY-PILLAR BONDS: '+dpb.map(function(r){
    if(r.kind==='天地徳合') return 'PERFECT UNION(天地徳合) w/ '+r.to+'-pillar '+r.gz+' — rare stem+branch double harmony; a defining bond (family/partner/foundation)';
    if(r.kind==='干合') return 'stem-union(干合'+(r.el?('->'+r.el):'')+') w/ '+r.to+'-pillar '+r.gz+' — magnetic binding theme';
    if(r.kind==='支合') return 'branch-bond(支合) w/ '+r.to+'-pillar '+r.gz+' — quiet steady tie';
    return 'day-branch CLASH(冲) w/ '+r.to+'-pillar '+r.gz+' — recurring shakeups at life core';
  }).join('; '));
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
        if(r.kind==='半会成立') return 'FORMS 半会 half-trine('+r.el+') w/ natal '+r.withs.join('')+' — a TURNING-POINT period (後天的半会): a season of big change, new chances and a real life-pivot; movement, new people and new environments are what open the door, so ENCOURAGE stepping forward here (not a warning)';
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
    if(f.cur) lk.push('now '+f.cur.ganzhi+' '+f.cur.tenStar+'('+tg(f.cur.tenStar)+') age'+f.cur.startAge+'-'+f.cur.endAge+trTag(f.cur.ganzhi));
    if(f.next) lk.push('next '+f.next.ganzhi+' '+f.next.tenStar+' from'+f.next.startAge);
    if(f.ty) lk.push(f.ty.year+' '+f.ty.ganzhi+' '+f.ty.tenStar+'('+tg(f.ty.tenStar)+')'+trTag(f.ty.ganzhi));
    if(f.ny) lk.push(f.ny.year+' '+f.ny.ganzhi+' '+f.ny.tenStar+'('+tg(f.ny.tenStar)+')'+trTag(f.ny.ganzhi));
    if(lk.length) L.push('LUCK: '+lk.join('; '));
    /* 過去も読めるように：大運の梯子（人生全体）と直近〜近未来の年運を渡す。
       エンジンは過去の年運・大運を全て計算済みだが、既定の grounding は現在＋次しか出していなかったため補う。 */
    try{
      var _df=pro.decadeFortunes||[], _af=pro.annualFortunes||[], _nowY=(pro.now&&pro.now.year)||null, _curIdx=(pro.now&&pro.now.daeunIndex);
      if(_df.length){
        var ladder=_df.map(function(d,i){
          var y0=d.startYear, y1=(_df[i+1]?_df[i+1].startYear:(y0+10));
          return ((i===_curIdx)?'★NOW ':'')+y0+'-'+y1+' '+d.tenStar+'('+tg(d.tenStar)+')';
        }).join(' | ');
        L.push('LIFE DECADES (大運 ladder — the 10-year climate of EVERY era of their whole life, from birth to old age, past AND future; ★NOW = the decade they are in): '+ladder+'. Read the theme of ANY decade the user asks about — a past era OR a future one (their 50s, their 60s, "after I retire"): a 官/官殺 decade = pressure, duty, being tested, big commitments; a 財 decade = money & relationships active; an 印 decade = study, retreat, support, healing; a 食傷 decade = self-expression, output, leaving/creating; a 比劫 decade = independence, self, rivalry. For a PAST era you may state the CLIMATE plainly but do NOT invent the literal events — invite them to share, then interpret WHY it unfolded so. For a FUTURE era, give it as a real, committed outlook. Use this ladder for ANY year that falls OUTSIDE the year-by-year list below (further past or further ahead): read that year from the decade it sits in.');
      }
      if(_af.length&&_nowY){
        var _lo=Math.max((_af[0].year+8),_nowY-30), _hi=_nowY+18;
        var yrs=_af.filter(function(a){return a.year>=_lo&&a.year<=_hi;}).map(function(a){
          return ((a.year===_nowY)?'★':(a.year===_nowY+1?'▷':''))+a.year+':'+a.tenStar;
        }).join(' ');
        if(yrs) L.push('YEAR-BY-YEAR THEMES (年運 — a WIDE span, roughly 30 years of past through ~18 years ahead; ★=this year ▷=next year): '+yrs+'. This is here so you can answer ANY specific year the user names — last year, five years ago, the year they married, OR two years out, three years out, ten years out, "when I am 50" — always grounded in THAT year\'s actual star, never a vague guess and never a dodge. Each year takes the flavour of its ten-god star: 官・官殺=commitment, responsibility, being tested, marriage/career turning points, big decisions; 財=money moves & relationships/attraction; 印=support, study, rest, sometimes a pause or reset; 食傷=self-expression, creating, children, leaving/ending something; 比劫=self, independence, rivalry, going it alone, spending. FOR A PAST YEAR: read its star but NEVER assert a specific life event actually happened — ASK what happened, then interpret it through the year\'s climate. FOR A FUTURE YEAR (any distance out): give a real, committed forecast — the climate of that year, the best windows within it to act, what to prepare — hopeful and concrete, never hedged, never "the future is unknowable". For a year beyond this list, use the decade ladder above.');
      }
    }catch(e){}
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
