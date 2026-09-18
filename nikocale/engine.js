/*!
 * engine.js — 奇跡の相性診断 / 私だけの運気予報　共通エンジン（正本）
 * ------------------------------------------------------------------
 * 目的：画面（ブラウザ）とサーバ（メール配信バッチ）で “同じ計算” を使うための
 *       DOMに依存しない純ロジック。四柱推命の確定計算＋決定論シードを提供する。
 *
 * 使い方:
 *   ブラウザ:  <script src="engine.js"></script>  →  window.KEngine
 *   Node:      const E = require('./engine.js');
 *
 * 方針（重要）:
 *   - ここには「計算（ロジック）」だけを置く。鑑定文（テキストバンク）や画面描画は含めない。
 *   - 今後ロジックを足す場合は “このファイルに追記” する（＝画面もサーバも一箇所を参照）。
 *   - 乱数は使わない。すべて seed（生年月日＋日付）から決定論的に導く＝食い違い防止。
 *
 * フェーズ:
 *   [フェーズ1・本ファイル] 日柱／干支関係／十神(通変)／十二運／桃花／相性・日運の素点・シード
 *   [フェーズ2・今後統合]   命式 PersonBazi（喜神/忌神・扶抑）／24節気 getSekki／日運文の生成
 *                           （現状は my-tenki-demo.html / mypage.html に実装。ロジック確定後にここへ集約）
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api; // Node
  root.KEngine = api;                                                        // ブラウザ
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /* ===== 基本定数（十干・十二支・五行） ===== */
  var STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  var BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  var STEM_GOGYO = {甲:"木",乙:"木",丙:"火",丁:"火",戊:"土",己:"土",庚:"金",辛:"金",壬:"水",癸:"水"};
  var BRANCH_GOGYO = {子:"水",丑:"土",寅:"木",卯:"木",辰:"土",巳:"火",午:"火",未:"土",申:"金",酉:"金",戌:"土",亥:"水"};
  var SHENG = {木:"火",火:"土",土:"金",金:"水",水:"木"};   // 相生：X が生む五行
  var KOKU  = {木:"土",火:"金",土:"水",金:"木",水:"火"};   // 相剋：X が剋す五行
  var YANG  = {甲:1,丙:1,戊:1,庚:1,壬:1};                  // 陽干（それ以外は陰干）

  /* ===== 干合・支合・三合・冲・刑・害・破・桃花（すべて正統） ===== */
  var KANGOU = {甲:"己",己:"甲",乙:"庚",庚:"乙",丙:"辛",辛:"丙",丁:"壬",壬:"丁",戊:"癸",癸:"戊"};
  var KANGOU_GOGYO = {甲己:"土",乙庚:"金",丙辛:"水",丁壬:"木",戊癸:"火"};
  var SHIGOU = {子:"丑",丑:"子",寅:"亥",亥:"寅",卯:"戌",戌:"卯",辰:"酉",酉:"辰",巳:"申",申:"巳",午:"未",未:"午"};
  var SANGOU = [["申","子","辰"],["亥","卯","未"],["寅","午","戌"],["巳","酉","丑"]];
  var CHONG = {子:"午",午:"子",丑:"未",未:"丑",寅:"申",申:"寅",卯:"酉",酉:"卯",辰:"戌",戌:"辰",巳:"亥",亥:"巳"};
  var HAI = {子:"未",未:"子",丑:"午",午:"丑",寅:"巳",巳:"寅",卯:"辰",辰:"卯",申:"亥",亥:"申",酉:"戌",戌:"酉"};
  var PO = {子:"酉",酉:"子",午:"卯",卯:"午",申:"巳",巳:"申",寅:"亥",亥:"寅",辰:"丑",丑:"辰",戌:"未",未:"戌"};
  var XING = [["子","卯"],["寅","巳"],["巳","申"],["寅","申"],["丑","戌"],["戌","未"],["丑","未"]]; // 三刑（自刑は別扱い）
  var TOUKA = {}; (function(){ var m={"申子辰":"酉","亥卯未":"子","寅午戌":"卯","巳酉丑":"午"};
    SANGOU.forEach(function(g){var k=g.join("");g.forEach(function(b){TOUKA[b]=m[k];});}); })();

  /* ===== 十二運（長生〜養）：長生の起点は各干で正統、陽干順行・陰干逆行 ===== */
  var JUNI_BR = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  var JUNI_ST = ["長生","沐浴","冠帯","臨官","帝旺","衰","病","死","墓","絶","胎","養"];
  var JUNI_START = {甲:"亥",乙:"午",丙:"寅",丁:"酉",戊:"寅",己:"酉",庚:"巳",辛:"子",壬:"申",癸:"卯"};

  /* ===== 素点テーブル（※四柱推命に点数は無い＝当サービス独自指標） ===== */
  // 相性診断（index.html と一致させること）
  var COMPAT_ST_PTS = {干合:30,干相生:19,干比和:12,干相剋:6};
  var COMPAT_BR_PTS = {支合:28,三合:23,同:20,支相生:18,支比和:14,支相剋:8,破:5,害:3,刑:2,沖:0}; // (B)マイルド：破>相剋の逆転是正・凶関係を相剋より低く（index.htmlと一致）
  // 日運（運勢指数）：ぶつかる関係は減点
  var DAILY_ST_PTS = {干合:30,干相生:18,干比和:13,干相剋:8};
  var DAILY_BR_PTS = {支合:30,三合:26,同:22,支相生:18,支比和:14,支相剋:8};
  var DAILY_BR_PEN = {沖:30,刑:20,害:16,破:12};

  /* ===== 暦（ユリウス通日） ===== */
  function jdn(y,m,d){var a=Math.floor((14-m)/12),yy=y+4800-a,mm=m+12*a-3;
    return d+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-Math.floor(yy/100)+Math.floor(yy/400)-32045;}
  function jdnToDate(J){var a=J+32044,b=Math.floor((4*a+3)/146097),c=a-Math.floor(146097*b/4);
    var dd=Math.floor((4*c+3)/1461),e=c-Math.floor(1461*dd/4),mm=Math.floor((5*e+2)/153);
    return {y:100*b+dd-4800+Math.floor(mm/10),m:mm+3-12*Math.floor(mm/10),d:e-Math.floor((153*mm+2)/5)+1};}
  var ANCHOR_JDN = jdn(2000,1,1), ANCHOR_INDEX = 54; // 2000-01-01=戊午（検証:2008-03-28=丁卯 / 1981-06-10=己未）

  /* ===== 日柱（生年月日→十干十二支） ===== */
  function pillarIndex(y,m,d){ return (((ANCHOR_INDEX + (jdn(y,m,d)-ANCHOR_JDN)) % 60) + 60) % 60; }
  function pillar(y,m,d){ var i=pillarIndex(y,m,d); return {stem:STEMS[i%10], branch:BRANCHES[i%12]}; }
  function targetIndex(s,b){ for(var i=0;i<60;i++) if(STEMS[i%10]===s && BRANCHES[i%12]===b) return i; return -1; }

  /* ===== JST（日本時間）で「今日」を確定（UTCずれで干支が1日ズレるのを防ぐ） ===== */
  function todayJST(now){ now = now || new Date();
    var jst = new Date(now.getTime() + (9*60 + now.getTimezoneOffset())*60000);
    return {y:jst.getFullYear(), m:jst.getMonth()+1, d:jst.getDate()}; }

  /* ===== 天地徳合の相手（干合かつ支合）＝60分の1（約1.66%） ===== */
  function partner(stem,branch){ return {stem:KANGOU[stem], branch:SHIGOU[branch],
    gogyo:KANGOU_GOGYO[(STEMS.indexOf(stem)<STEMS.indexOf(KANGOU[stem])?stem+KANGOU[stem]:KANGOU[stem]+stem)]}; }

  /* ===== 関係判定 ===== */
  function stemRel(s1,s2){ if(KANGOU[s1]===s2) return "干合";
    var g1=STEM_GOGYO[s1],g2=STEM_GOGYO[s2];
    if(g1===g2) return "干比和";
    if(SHENG[g1]===g2||SHENG[g2]===g1) return "干相生";
    return "干相剋"; }
  function branchRel(b1,b2){ if(b1===b2) return "同";
    if(SHIGOU[b1]===b2) return "支合";
    for(var i=0;i<SANGOU.length;i++){var g=SANGOU[i]; if(g.indexOf(b1)>=0&&g.indexOf(b2)>=0) return "三合";}
    if(CHONG[b1]===b2) return "沖";
    for(var j=0;j<XING.length;j++){var p=XING[j]; if((p[0]===b1&&p[1]===b2)||(p[0]===b2&&p[1]===b1)) return "刑";}
    if(HAI[b1]===b2) return "害";
    if(PO[b1]===b2) return "破";
    var x1=BRANCH_GOGYO[b1],x2=BRANCH_GOGYO[b2];
    if(x1===x2) return "支比和";
    if(SHENG[x1]===x2||SHENG[x2]===x1) return "支相生";
    return "支相剋"; }

  /* ===== 十神（通変星）：日干 D から見た 相手干 T ===== */
  function juushin(D,T){ var dg=STEM_GOGYO[D],tg=STEM_GOGYO[T];
    var same = (!!YANG[D]) === (!!YANG[T]);
    if(dg===tg) return same?"比肩":"劫財";
    if(SHENG[dg]===tg) return same?"食神":"傷官";
    if(KOKU[dg]===tg) return same?"偏財":"正財";
    if(KOKU[tg]===dg) return same?"偏官":"正官";
    return same?"偏印":"印綬"; }

  /* ===== 十二運（日干 stem × 地支 branch） ===== */
  function juniOf(stem,branch){ var start=JUNI_BR.indexOf(JUNI_START[stem]||"子"),
    dir=YANG[stem]?1:-1, bi=JUNI_BR.indexOf(branch);
    if(start<0||bi<0) return "長生";
    return JUNI_ST[((((bi-start)*dir)%12)+12)%12]; }

  /* ===== 桃花（相手の地支が自分の三合局の桃花か） ===== */
  function isTouka(myBranch, otherBranch){ return TOUKA[myBranch] === otherBranch; }

  /* ===== 天地徳合／律音の判定 ===== */
  function specialPair(A,B){ var sr=stemRel(A.stem,B.stem), br=branchRel(A.branch,B.branch);
    if(A.stem===B.stem && A.branch===B.branch) return "律音";   // 干支が完全に同じ
    if(sr==="干合" && br==="支合") return "天地徳合";            // 干合かつ支合＝1/60
    return null; }

  /* ===== 相性スコア（0-100・独自指標）：index.html の pairPattern と整合させる素点合成 =====
     ※ index.html には特別扱い（天地徳合=100 等）や演出ロジックがあるため、
        “正式スコア”は当面 index.html を正とし、ここでは素点の目安のみ提供。 */
  function compatRaw(A,B){ var sr=stemRel(A.stem,B.stem), br=branchRel(A.branch,B.branch);
    return {stemRel:sr, branchRel:br,
      st:(COMPAT_ST_PTS[sr]||0), br:(COMPAT_BR_PTS[br]||0)}; }

  /* ===== 日運：運勢指数（0-100・独自指標）＝今日の干支と本人日柱の関係 ===== */
  function dailyIndex(you, today){ var sr=stemRel(you.stem,today.stem), br=branchRel(you.branch,today.branch);
    var base=42, add=(DAILY_ST_PTS[sr]||0) + (DAILY_BR_PTS[br]||0), pen=(DAILY_BR_PEN[br]||0);
    var idx = base + add - pen;
    return Math.max(1, Math.min(100, idx)); }

  /* ===== 決定論シード（同一人物・同一日は常に同じ） ===== */
  function daySeed(y,m,d){ return jdn(y,m,d); }
  function personSeed(you, y,m,d){ return daySeed(y,m,d) + you.stem.charCodeAt(0)*7 + you.branch.charCodeAt(0)*13; }

  /* ===== 日運の“確定事実”をまとめて返す（テキスト生成の材料。DOMなし・サーバ可） ===== */
  function dailyFacts(birth /* {y,m,d} */, dateJST /* {y,m,d} 省略時はJST今日 */){
    var t = dateJST || todayJST();
    var you = pillar(birth.y, birth.m, birth.d);
    var today = pillar(t.y, t.m, t.d);
    var mate = partner(you.stem, you.branch);           // 天地徳合の相手（運命の相手）
    return {
      date: t,
      you: you,                                          // 本人の日柱
      today: today,                                      // 今日の干支
      mate: mate,                                        // 運命の相手の干支
      god: juushin(you.stem, today.stem),                // 今日の通変星（十神）
      juni: juniOf(you.stem, today.branch),              // 今日の十二運
      stemRel: stemRel(you.stem, today.stem),
      branchRel: branchRel(you.branch, today.branch),
      touka: isTouka(you.branch, today.branch),          // 桃花（モテ運）
      index: dailyIndex(you, today),                     // 運勢指数（独自指標）
      seed: daySeed(t.y,t.m,t.d),
      pseed: personSeed(you, t.y,t.m,t.d)
      // フェーズ2でここに fe(補う五行)・sekki(節気)・命式喜忌 を追加予定
    };
  }

  return {
    // 定数
    STEMS:STEMS, BRANCHES:BRANCHES, STEM_GOGYO:STEM_GOGYO, BRANCH_GOGYO:BRANCH_GOGYO,
    SHENG:SHENG, KOKU:KOKU, KANGOU:KANGOU, KANGOU_GOGYO:KANGOU_GOGYO, SHIGOU:SHIGOU,
    SANGOU:SANGOU, CHONG:CHONG, HAI:HAI, PO:PO, XING:XING, TOUKA:TOUKA,
    COMPAT_ST_PTS:COMPAT_ST_PTS, COMPAT_BR_PTS:COMPAT_BR_PTS,
    DAILY_ST_PTS:DAILY_ST_PTS, DAILY_BR_PTS:DAILY_BR_PTS, DAILY_BR_PEN:DAILY_BR_PEN,
    // 暦・日柱
    jdn:jdn, jdnToDate:jdnToDate, pillar:pillar, pillarIndex:pillarIndex, targetIndex:targetIndex, todayJST:todayJST,
    // 関係・十神・十二運・桃花・特別縁
    partner:partner, stemRel:stemRel, branchRel:branchRel, juushin:juushin, juniOf:juniOf,
    isTouka:isTouka, specialPair:specialPair,
    // スコア・シード・日運
    compatRaw:compatRaw, dailyIndex:dailyIndex, daySeed:daySeed, personSeed:personSeed, dailyFacts:dailyFacts,
    version:"1.0.0-phase1"
  };
});
