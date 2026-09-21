/* ============================================================================
 * 吉凶星 (神殺 / kichi) module — extracted verbatim from app-pro.html
 * Self-contained: no DOM, no app globals, no external deps.
 *
 * Exposes computeKichi(chart) -> { year:[...], month:[...], day:[...], hour:[...] }
 * where `chart` is the object returned by window.Bazi.computeChart(...).
 * ==========================================================================*/

// ---- Constants (copied verbatim) ----
const STEMS=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BR=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 吉凶星3：月支基準（先生の表）
const KICHI_GETSU={
  子:{天徳貴人:'巳',天徳合:'申',月徳貴人:'壬',月徳合:'丁',華蓋:'辰'},
  丑:{天徳貴人:'庚',天徳合:'乙',月徳貴人:'庚',月徳合:'乙',華蓋:'丑'},
  寅:{天徳貴人:'丁',天徳合:'壬',月徳貴人:'丙',月徳合:'辛',華蓋:'戌'},
  卯:{天徳貴人:'申',天徳合:'巳',月徳貴人:'甲',月徳合:'己',華蓋:'未'},
  辰:{天徳貴人:'壬',天徳合:'丁',月徳貴人:'壬',月徳合:'丁',華蓋:'辰'},
  巳:{天徳貴人:'辛',天徳合:'丙',月徳貴人:'庚',月徳合:'乙',華蓋:'丑'},
  午:{天徳貴人:'亥',天徳合:'寅',月徳貴人:'丙',月徳合:'辛',華蓋:'戌'},
  未:{天徳貴人:'甲',天徳合:'己',月徳貴人:'甲',月徳合:'己',華蓋:'未'},
  申:{天徳貴人:'癸',天徳合:'戊',月徳貴人:'壬',月徳合:'丁',華蓋:'辰'},
  酉:{天徳貴人:'寅',天徳合:'亥',月徳貴人:'庚',月徳合:'乙',華蓋:'丑'},
  戌:{天徳貴人:'丙',天徳合:'辛',月徳貴人:'丙',月徳合:'辛',華蓋:'戌'},
  亥:{天徳貴人:'乙',天徳合:'庚',月徳貴人:'甲',月徳合:'己',華蓋:'未'}
};
const isStem=ch=>STEMS.includes(ch);

// 吉凶星4：年支・日支基準（三合局→支で判定）咸池・駅馬・劫殺・亡神（確定分）
const SANGO_KEY={申:'水',子:'水',辰:'水',寅:'火',午:'火',戌:'火',巳:'金',酉:'金',丑:'金',亥:'木',卯:'木',未:'木'};
const KICHI_NICHI={水:{咸池:'酉',駅馬:'寅',劫殺:'巳',亡神:'亥',囚獄:'午'},火:{咸池:'卯',駅馬:'申',劫殺:'亥',亡神:'巳',囚獄:'子'},金:{咸池:'午',駅馬:'亥',劫殺:'寅',亡神:'申',囚獄:'卯'},木:{咸池:'子',駅馬:'巳',劫殺:'申',亡神:'寅',囚獄:'酉'}};
const BLOOD={子:'戌',丑:'酉',寅:'申',卯:'未',辰:'午',巳:'巳',午:'辰',未:'卯',申:'寅',酉:'丑',戌:'子',亥:'亥'}; // 血刃（年支/日支）
const KAKU={子:'卯',丑:'卯',寅:'午',卯:'午',辰:'午',巳:'酉',午:'酉',未:'酉',申:'子',酉:'子',戌:'子',亥:'卯'}; // 隔角：年支→日支のみ
const KAIGOU=new Set(['庚辰','庚戌','壬辰','戊戌','戊辰']); // 魁罡：日柱で判定（4つ＋流派により戊辰）
const ROKUBA=new Set(['壬午','癸巳']); // 禄馬貴人：日柱で判定（日干＋日支）

// 吉凶星1：生日十干（日干）基準（支で判定）。羊刃・飛刃は陽干のみ。福星貴人・天厨貴人は値未確定のため後日。
const KICHI_NIKKAN={
  甲:{天乙貴人:['丑','未'],文昌貴人:['巳'],金与禄:['辰'],暗禄:['亥'],羊刃:['卯'],飛刃:['酉'],大極貴人:['子','午'],紅艶:['午'],天厨貴人:['巳'],福星貴人:['寅'],天官貴人:['未']},
  乙:{天乙貴人:['子','申'],文昌貴人:['午'],金与禄:['巳'],暗禄:['戌'],大極貴人:['子','午'],紅艶:['午'],天厨貴人:['午'],福星貴人:['丑','亥'],天官貴人:['辰'],妨害殺:['卯','酉']},
  丙:{天乙貴人:['亥','酉'],文昌貴人:['申'],金与禄:['未'],暗禄:['申'],羊刃:['午'],飛刃:['子'],大極貴人:['卯','酉'],紅艶:['寅'],天厨貴人:['巳'],福星貴人:['子','戌'],天官貴人:['巳']},
  丁:{天乙貴人:['亥','酉'],文昌貴人:['酉'],金与禄:['申'],暗禄:['未'],大極貴人:['卯','酉'],紅艶:['未'],天厨貴人:['午'],福星貴人:['酉'],天官貴人:['酉']},
  戊:{天乙貴人:['丑','未'],文昌貴人:['申'],金与禄:['未'],暗禄:['申'],羊刃:['午'],飛刃:['子'],大極貴人:['辰','戌','丑','未'],紅艶:['辰'],天厨貴人:['申'],福星貴人:['申'],天官貴人:['戌'],妨害殺:['子','午']},
  己:{天乙貴人:['子','申'],文昌貴人:['酉'],金与禄:['申'],暗禄:['未'],大極貴人:['辰','戌','丑','未'],紅艶:['辰'],天厨貴人:['酉'],福星貴人:['未'],天官貴人:['卯'],妨害殺:['卯','酉']},
  庚:{天乙貴人:['丑','未'],文昌貴人:['亥'],金与禄:['戌'],暗禄:['巳'],羊刃:['酉'],飛刃:['卯'],大極貴人:['寅','亥'],紅艶:['戌'],天厨貴人:['亥'],福星貴人:['午'],天官貴人:['亥']},
  辛:{天乙貴人:['午','寅'],文昌貴人:['子'],金与禄:['亥'],暗禄:['辰'],大極貴人:['寅','亥'],紅艶:['酉'],天厨貴人:['子'],福星貴人:['巳'],天官貴人:['申'],妨害殺:['酉']},
  壬:{天乙貴人:['卯','巳'],文昌貴人:['寅'],金与禄:['丑'],暗禄:['寅'],羊刃:['子'],飛刃:['午'],大極貴人:['巳','申'],紅艶:['子'],天厨貴人:['寅'],福星貴人:['辰'],天官貴人:['寅'],妨害殺:['子','午']},
  癸:{天乙貴人:['卯','巳'],文昌貴人:['卯'],金与禄:['寅'],暗禄:['丑'],大極貴人:['巳','申'],紅艶:['申'],天厨貴人:['卯'],福星貴人:['卯'],天官貴人:['午'],妨害殺:['巳']}
};

// ---- Functions (copied verbatim) ----
function kubo(c){const ds=STEMS.indexOf(c.dayMaster.stem),db=BR.indexOf(c.pillars[2].branch);const d=((db-ds)%12+12)%12;return [BR[(d+10)%12],BR[(d+11)%12]];}
function kichiTargets(c){return KICHI_GETSU[c.pillars[1].branch]||{};}
function kakuOn(c){return KAKU[c.pillars[0].branch]===c.pillars[2].branch;}
function kaigouOn(c){return KAIGOU.has(c.pillars[2].ganzhi);}
function rokubaOn(c){return ROKUBA.has(c.pillars[2].ganzhi);}
function kichi4Targets(base){const g=SANGO_KEY[base];const o=g?{...KICHI_NICHI[g]}:{};if(BLOOD[base])o['血刃']=BLOOD[base];return o;}
function matchKichi1(c,branch){const t=KICHI_NIKKAN[c.dayMaster.stem]||{};const out=[];for(const n in t){if(t[n].includes(branch))out.push(n);}return out;}
function matchKichi4(c,branch){const out=[];[c.pillars[0].branch,c.pillars[2].branch].forEach(b=>{const t=kichi4Targets(b);for(const n in t){if(t[n]===branch&&!out.includes(n))out.push(n);}});return out;}
// 該当した柱に出す星名（干→天干/蔵干、支→地支。蔵干も含む）
function matchKichi(targets,stem,branch,zou){const out=[];
  for(const name in targets){const t=targets[name];
    if(isStem(t)){if(stem===t||(zou&&zou.includes(t)))out.push(name);}
    else if(branch===t)out.push(name);}
  return out;}

function pillarKichi(c,p){const ku=kubo(c),kt=kichiTargets(c),k=[];if(ku.includes(p.branch))k.push('空亡');
  matchKichi(kt,p.stem,p.branch,p.hiddenStems.map(h=>h.stem)).forEach(s=>k.push(s));
  matchKichi4(c,p.branch).forEach(s=>{if(!k.includes(s))k.push(s);});
  matchKichi1(c,p.branch).forEach(s=>{if(!k.includes(s))k.push(s);});
  if(p.label==='日柱'&&kakuOn(c))k.push('隔角');
  if(p.label==='日柱'&&kaigouOn(c))k.push('魁罡');
  if(p.label==='日柱'&&rokubaOn(c))k.push('禄馬貴人');return k;}

// ---- Public API ----
export function computeKichi(chart){
  const labelKey={年柱:'year',月柱:'month',日柱:'day',時柱:'hour'};
  const out={year:[],month:[],day:[],hour:[]};
  (chart.pillars||[]).forEach(p=>{
    const key=labelKey[p.label];
    if(key)out[key]=pillarKichi(chart,p);
  });
  return out;
}

if(typeof window!=='undefined')window.computeKichi=computeKichi;
