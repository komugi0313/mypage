/*
 * 天戦地冲（てんせんちちゅう／天剋地冲）判定 — 参照実装（依存なし・ES5）
 * 仕様書：docs/tensen-chichu/天戦地冲_ロジックと解釈.md
 *
 * 判定条件（3つすべて）：
 *   ① 天干の陰陽が同じ　② 天干が相剋（木剋土・土剋水・水剋火・火剋金・金剋木。土＝戊己を含む）
 *   ③ 地支が冲（子午・丑未・寅申・卯酉・辰戌・巳亥）
 * 向き：どちらの天干が「剋す側」かを必ず区別する（剋す＝発散・主導／剋される＝試練・内省）。
 * 干支はすべて「甲子」のような2文字の文字列で渡す。命式の計算エンジンには触れない。
 */
var TensenChichu = (function () {
  var BR = '子丑寅卯辰巳午未申酉戌亥';
  // 各天干の [自分が剋す相手, 自分を剋す相手]（同じ陰陽どうしの相剋）
  var MAP = {
    甲: ['戊', '庚'], 乙: ['己', '辛'], 丙: ['庚', '壬'], 丁: ['辛', '癸'], 戊: ['壬', '甲'],
    己: ['癸', '乙'], 庚: ['甲', '丙'], 辛: ['乙', '丁'], 壬: ['丙', '戊'], 癸: ['丁', '己']
  };
  var PILLAR = ['年柱', '月柱', '日柱', '時柱'];

  function valid(gz) { return typeof gz === 'string' && gz.length >= 2; }
  function isChong(a, b) {
    var i = BR.indexOf(a), j = BR.indexOf(b);
    return i >= 0 && j >= 0 && (i + 6) % 12 === j;
  }
  /** 2つの干支が天戦地冲か（順序は問わない） */
  function isTensen(gzA, gzB) {
    if (!valid(gzA) || !valid(gzB)) return false;
    return (MAP[gzA.charAt(0)] || []).indexOf(gzB.charAt(0)) >= 0 && isChong(gzA.charAt(1), gzB.charAt(1));
  }
  /** gzA の天干が gzB の天干を剋すか（isTensen 成立が前提） */
  function aControlsB(gzA, gzB) { return (MAP[gzA.charAt(0)] || [])[0] === gzB.charAt(0); }

  /**
   * 命式内（生まれ持った）
   * @param {string[]} gz  [年柱, 月柱, 日柱, 時柱] の干支。時刻不明なら時柱は '' か省略
   * @return {Array} {from,to,fromGz,toGz,type}
   *   from=剋す側の柱 / to=剋される側の柱
   *   type: 'pressured'（他の柱→日柱：外から自分へ試練） / 'attack'（日柱→他の柱：自分から外へ主導） / 'between'（日柱が絡まない柱どうし）
   */
  function natal(gz) {
    var out = [], n = Math.min(gz.length, 4);
    for (var i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
      var a = gz[i], b = gz[j];
      if (!isTensen(a, b)) continue;
      var ci = aControlsB(a, b) ? i : j, ri = ci === i ? j : i;
      out.push({
        from: PILLAR[ci], to: PILLAR[ri], fromGz: gz[ci], toGz: gz[ri],
        type: ri === 2 ? 'pressured' : (ci === 2 ? 'attack' : 'between')
      });
    }
    return out;
  }

  /**
   * 運気（大運・年運・月運）＝日柱の干支 × 巡る運の干支
   * @param {string} dayGz 日柱の干支
   * @param {Array} runs  {kind:'大運'|'年運'|'月運', label:'2027年（45歳）', ganzhi:'庚午'}
   * @return {Array} 該当した runs に dir を付けたもの。dir: 'attack'（日干が運の干を剋す）/ 'pressured'（運の干が日干を剋す）
   */
  function timing(dayGz, runs) {
    var out = [];
    for (var k = 0; k < runs.length; k++) {
      var r = runs[k];
      if (!isTensen(dayGz, r.ganzhi)) continue;
      out.push({ kind: r.kind, label: r.label, ganzhi: r.ganzhi, dir: aControlsB(dayGz, r.ganzhi) ? 'attack' : 'pressured' });
    }
    return out;
  }

  /**
   * 相性（2人の命式クロス）＝本人4柱 × 相手4柱
   * @param {string[]} a 本人の [年,月,日,時]（時刻不明なら時柱 ''）
   * @param {string[]} b 相手の [年,月,日,時]
   * @return {Array} {aPillar,bPillar,ga,gb,aControls,isDay}（isDay＝日柱どうし＝2人の核）
   */
  function compat(a, b) {
    var out = [];
    for (var i = 0; i < Math.min(a.length, 4); i++) for (var j = 0; j < Math.min(b.length, 4); j++) {
      if (!isTensen(a[i], b[j])) continue;
      out.push({ aPillar: PILLAR[i], bPillar: PILLAR[j], ga: a[i], gb: b[j], aControls: aControlsB(a[i], b[j]), isDay: i === 2 && j === 2 });
    }
    return out;
  }

  return { MAP: MAP, BR: BR, PILLAR: PILLAR, isChong: isChong, isTensen: isTensen, aControlsB: aControlsB, natal: natal, timing: timing, compat: compat };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TensenChichu;
