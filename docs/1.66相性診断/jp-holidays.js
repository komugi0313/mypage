/*! jp-holidays.js — 日本の祝日（「国民の祝日に関する法律」にもとづく自動計算）
 *
 *  JPHoliday.name(y, m, d) → 祝日名（祝日でなければ ''）
 *    例：JPHoliday.name(2026, 11, 3) → '文化の日'
 *  JPHoliday.short(y, m, d) → カレンダーのマス目用の短い名前（例：'勤労感謝'）
 *  対象：2020年以降のルール（2020・2021年の五輪による特例の移動は含まない）。
 *  春分・秋分の日は天文計算の近似式（1980〜2099年で官報の発表と一致）。
 *  ※ 法改正で祝日が変わったときは、このファイルだけを直せばよい（カレンダー・メールの両方に反映される）。
 */
(function (root) {
  'use strict';

  // 第n週の月曜日
  function nthMonday(y, m, n) {
    var first = new Date(y, m - 1, 1).getDay();          // 0=日
    var firstMon = 1 + ((8 - first) % 7);
    return firstMon + (n - 1) * 7;
  }
  function shunbun(y) { return Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4)); }
  function shubun(y)  { return Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4)); }

  // 振替・国民の休日を除いた「国民の祝日」
  function base(y, m, d) {
    switch (m) {
      case 1:  if (d === 1) return '元日'; if (d === nthMonday(y, 1, 2)) return '成人の日'; break;
      case 2:  if (d === 11) return '建国記念の日'; if (d === 23) return '天皇誕生日'; break;
      case 3:  if (d === shunbun(y)) return '春分の日'; break;
      case 4:  if (d === 29) return '昭和の日'; break;
      case 5:  if (d === 3) return '憲法記念日'; if (d === 4) return 'みどりの日'; if (d === 5) return 'こどもの日'; break;
      case 7:  if (d === nthMonday(y, 7, 3)) return '海の日'; break;
      case 8:  if (d === 11) return '山の日'; break;
      case 9:  if (d === nthMonday(y, 9, 3)) return '敬老の日'; if (d === shubun(y)) return '秋分の日'; break;
      case 10: if (d === nthMonday(y, 10, 2)) return 'スポーツの日'; break;
      case 11: if (d === 3) return '文化の日'; if (d === 23) return '勤労感謝の日'; break;
    }
    return '';
  }
  function shift(y, m, d, k) { var t = new Date(y, m - 1, d + k); return [t.getFullYear(), t.getMonth() + 1, t.getDate()]; }

  function name(y, m, d) {
    var b = base(y, m, d);
    if (b) return b;
    var dow = new Date(y, m - 1, d).getDay();
    // 振替休日：祝日が日曜なら、その後の最初の「祝日でない日」が休日
    for (var k = 1; k <= 7; k++) {
      var p = shift(y, m, d, -k);
      if (!base(p[0], p[1], p[2])) break;                 // 連続する祝日の並びが途切れた
      if (new Date(p[0], p[1] - 1, p[2]).getDay() === 0) return '振替休日';
    }
    // 国民の休日：前日と翌日が祝日にはさまれた平日（日曜を除く）
    if (dow !== 0) {
      var a = shift(y, m, d, -1), c = shift(y, m, d, 1);
      if (base(a[0], a[1], a[2]) && base(c[0], c[1], c[2])) return '国民の休日';
    }
    return '';
  }

  // カレンダーのマス目用の短い名前（小さなマスで2行以上に折り返さないように。タップ時・メールは正式名）
  var SHORT = { '建国記念の日': '建国記念', 'スポーツの日': 'スポーツ', '勤労感謝の日': '勤労感謝', '国民の休日': '休日', '憲法記念日': '憲法記念', 'こどもの日': 'こども', 'みどりの日': 'みどり', '天皇誕生日': '天皇誕生' };
  function short(y, m, d) { var n = name(y, m, d); return SHORT[n] || n; }

  var api = { name: name, short: short };
  root.JPHoliday = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
