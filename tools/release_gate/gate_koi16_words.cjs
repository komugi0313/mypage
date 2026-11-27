// 恋のかたち診断：もう使わない言葉が、画面・説明ページに残っていないかを探す（鑑定者本人の指示 2026-11-27「入れてください」）
// 使い方：node tools/release_gate/gate_koi16_words.cjs （公開の前に。1つでも見つかれば止める）
// 決まりを変えて言葉をやめたら、下の RETIRED に [探す言葉, やめた理由] を1行足す。
// プログラムの中のメモ（/* */・// のあと・<!-- -->）は探さない。画面に出る文・説明ページの文だけを見る。
const fs = require('fs'), path = require('path');
const K = path.join(__dirname, '..', '..', 'koi16');

const RETIRED = [
  // 部屋の期限（2026-11-20 から、リンクは10日使える）
  [/部屋は作ってから12時間で使えなくなります/, '部屋のリンクは10日使える（2026-11-20）'],
  [/部屋は12時間のこっています/, '部屋のリンクは10日使える（2026-11-20）'],
  // かんたん版はやめた（2026-11-25）。前の部屋を開くための札（rModeTxt）は残すので、説明の言い方だけを探す
  [/かんたん版は4問ずつ/, 'かんたん版はやめた（2026-11-25）'],
  [/かんたん版で試す/, 'かんたん版はやめた（2026-11-25）'],
  [/かんたん版（4問）からの目安です/, 'かんたん版はやめた（2026-11-25）'],
  [/4分・20問/, 'かんたん版はやめた（2026-11-25）'],
  // 時間は書かない（2026-11-25）
  [/約[89]分/, '時間は書かない（2026-11-25）'],
  // 質問の数（本格版は56問）
  [/[34]8の質問|[34]8問で|[34]8問・/, '本格版は56問（2026-11-25）'],
  // 研究者の名前は出さない（2026-11-12）
  [/リーの|古村|村上・戸田|中尾|加藤|金政|大坊|松井|Bartholomew|Horowitz|Fraley|Chopik/, '研究者の名前は出さない（2026-11-12）'],
  // 名前を変えた・やめた言葉
  [/心地よい距離/, 'ものさしの名前は「頼り方」'],
  [/恋愛心理学を参考にした本格診断|研究を参考にした本格診断/, '左上は「16タイプ×愛着スタイル診断」（2026-11-19）'],
  [/LOVE TYPE/, '「KOI NO KATACHI」に（2026-11-17）'],
  [/16タイプとの相性まで/, '「気になる人との相性まで」に（2026-11-19）'],
  [/MBTIが好きな人へ|MBTI好きな人/, '「性格の16タイプと、恋のタイプ」に（2026-11-22）'],
  [/人に頼れる/, '頼り方の向きは「寄りかかれる」'],
  [/ときめき重視|安心重視/, '恋の原動力は「ときめき優先／安心優先」'],
  [/マンネリ知らず/, '決まり文句（2026-11-26 の見直し）'],
  [/おたがいにないものを補い合える/, '決まり文句（2026-11-26 の見直し）'],
  [/二人/, '「2人」にそろえる（1.66 のバナーの文は別のサイトの文なので除く）'],
  [/やさしめ／ツッコミ|ツッコミ版/, '言い方の名前は「ふつう／おもしろ」（2026-11-18）'],
  [/前回の結果を見る/, '「わたしの結果」に（2026-11-19）'],
];
// 別のサイトの文など、そのまま残すもの（RETIRED に当たっても見のがす）
const KEEP = [/刻まれた、二人の運命/, /\{k:'[^']*'/];  // 参考にした研究の目印（k）は画面に出さない

// プログラムの中のメモを外す（URL の // は残す）
function stripComments(s) {
  return s.replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:\\'"\w])\/\/[^\n]*/g, '$1');
}
function files(dir) {
  const out = [];
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, n.name);
    if (n.isDirectory()) { if (!['img', 'licenses', 'node_modules'].includes(n.name)) out.push(...files(f)); }
    else if (/\.html$/.test(n.name) && !/(_src|og)\.html$/.test(n.name)) out.push(f);
  }
  return out;
}
const problems = [];
for (const f of files(K)) {
  const lines = stripComments(fs.readFileSync(f, 'utf8')).split('\n');
  lines.forEach((l, i) => {
    let t = l; KEEP.forEach(k => { t = t.replace(new RegExp(k.source, 'g'), ''); });
    for (const [re, why] of RETIRED) {
      const m = t.match(re);
      if (m) { const at = t.indexOf(m[0]); problems.push(`${path.relative(K, f)}：「${t.slice(Math.max(0, at - 20), at + m[0].length + 20).replace(/\s+/g, ' ')}」← ${why}`); }
    }
  });
}
if (problems.length) { console.log('NG ' + problems.length + '件\n' + problems.join('\n')); process.exit(1); }
console.log('OK：もう使わない言葉は0件（' + RETIRED.length + '語を確認）');
