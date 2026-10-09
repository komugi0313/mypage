// 実行： node docs/tensen-chichu/tensen-chichu.test.js
var T = require('./tensen-chichu.js');
var assert = require('assert');
var S = '甲乙丙丁戊己庚辛壬癸', B = T.BR;
// 五行・陰陽から独立に作った基準（第一原理）
var el = function (i) { return Math.floor(i / 2); };       // 0木 1火 2土 3金 4水
var ctrl = function (x, y) { return (el(x) + 2) % 5 === el(y); };
var GZ = []; for (var i = 0; i < 60; i++) GZ.push(S[i % 10] + B[i % 12]);
var hits = 0;
GZ.forEach(function (g1) { GZ.forEach(function (g2) {
  var s1 = S.indexOf(g1[0]), s2 = S.indexOf(g2[0]);
  var ref = s1 % 2 === s2 % 2 && (ctrl(s1, s2) || ctrl(s2, s1)) && T.isChong(g1[1], g2[1]);
  assert.strictEqual(T.isTensen(g1, g2), ref, '判定 ' + g1 + '×' + g2);
  if (ref) { hits++; assert.strictEqual(T.aControlsB(g1, g2), ctrl(s1, s2), '向き ' + g1 + '×' + g2); }
}); });
assert.strictEqual(hits, 120, '成立は順序付き120通り（=60組）');
// 個別の検算例
assert.ok(T.isTensen('甲子', '庚午') && T.aControlsB('庚午', '甲子'));   // 金剋木：庚が甲を剋す
assert.ok(T.isTensen('戊子', '甲午') && T.aControlsB('甲午', '戊子'));   // 木剋土：土を含む
assert.ok(T.isTensen('戊辰', '壬戌') && T.aControlsB('戊辰', '壬戌'));   // 土剋水
assert.ok(T.isTensen('丙子', '庚午'));                                   // 火剋金
assert.ok(!T.isTensen('甲子', '乙丑') && !T.isTensen('甲子', '戊辰') && !T.isTensen('甲子', '辛未'));
// 命式内：1950-02-06 生（庚寅／戊寅／壬申）→ 月柱の戊が日柱の壬を剋す＝外から自分へ試練
var n1 = T.natal(['庚寅', '戊寅', '壬申', '']);
assert.deepStrictEqual(n1, [{ from: '月柱', to: '日柱', fromGz: '戊寅', toGz: '壬申', type: 'pressured' }]);
// 命式内に2つ：1930-01-13 10:00 生（己巳／丁丑／癸亥／丁巳）
var n2 = T.natal(['己巳', '丁丑', '癸亥', '丁巳']);
assert.strictEqual(n2.length, 2);
assert.deepStrictEqual([n2[0].from, n2[0].to, n2[0].type], ['年柱', '日柱', 'pressured']);
assert.deepStrictEqual([n2[1].from, n2[1].to, n2[1].type], ['日柱', '時柱', 'attack']);
assert.strictEqual(T.natal(['己巳', '丁丑', '癸亥', '']).length, 1);   // 時刻不明なら時柱の組は出ない
// 運気：日柱 甲子 → 庚午は「剋される」、戊午は「剋す」
var t = T.timing('甲子', [{ kind: '年運', label: '2027年', ganzhi: '庚午' }, { kind: '年運', label: '2030年', ganzhi: '戊午' }, { kind: '年運', label: '2031年', ganzhi: '辛未' }]);
assert.deepStrictEqual(t.map(function (x) { return x.label + ':' + x.dir; }), ['2027年:pressured', '2030年:attack']);
// 相性：日柱どうし＋他の柱
var c = T.compat(['戊午', '丙寅', '甲子', '乙亥'], ['庚午', '丙寅', '庚午', '乙亥']);
assert.deepStrictEqual(c.map(function (x) { return x.aPillar + '×' + x.bPillar + (x.isDay ? '(核)' : '') + (x.aControls ? '本人剋す' : '相手剋す'); }),
  ['日柱×年柱相手剋す', '日柱×日柱(核)相手剋す']);
console.log('OK: 3600組の判定・向き一致 / 成立120通り / 検算例すべて合格');
