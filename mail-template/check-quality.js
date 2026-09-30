/* 毎朝メールの「中身の品質」検査（ロジックを変えたら必ず実行する）
   使い方：ENGINE_DIR=<daily-engine.js のあるフォルダ> node check-quality.js [人数=30]
   いろいろな会員（年齢・性別・今の状況）で1年分のメールを作り、次の11項目がすべて0件かを確かめる。
     1. 同じ文章が7日以内に戻ってくる（欄ごと）
     2. 季節外れの料理・食材・アイテム・場所
     3. 男性に女性向けのアイテム・行動・言い回し
     4. 恋人・既婚の人に「気になる人」「出会い」系の行動
     5. 土日に「仕事の段取り」の一言（今日はこれだけ）
     6. 遠出・天気・催し次第の場所（海辺・湖・水族館・雨上がり など）
     7. 同じ場所が7日以内に別の欄（ラッキースポット／ご縁の場所）で出る
     8. メールのHTMLが壊れている（style="…" の中に " が入って、色・大きさの指定が効かなくなる など）
     9. 文章の欠け・混入（undefined／NaN／{C} などの置き換え漏れ、必須の欄が空、メニュー2品が同じ）
    10. ランクと文章の矛盾（△の日に「攻め・勝負・思い切り」、◎💮の日に「休むのが正解」）
    11. 件名が長すぎる（「｜」より前の要点が28字を超え、iPhoneの一覧で切れる）
   1件でも出たら FAIL。すべて0件なら PASS。 */
const path = require('path');
const dir = path.resolve(process.env.ENGINE_DIR || '.');
const D = require(path.join(dir, 'daily-engine.js'));
const { PersonBazi } = require(path.join(dir, 'bazi.js'));
const { renderDailyMail } = require('./render-daily-mail.js');
const N = +process.argv[2] || 30, DAYS = 365, WIN = 7;

const SEASON = [ // [語, 出してよい月]
  [/ゴーヤ/, [6,7,8,9]], [/冷やし|冷奴|冷しゃぶ|冷製|そうめん/, [6,7,8,9]], [/枝豆|とうもろこし|夏野菜/, [6,7,8,9]],
  [/(?<!回)鍋|ちゃんこ|おでん|チゲ|うどんすき|水炊き|湯豆腐|雑炊|粕汁|しゃぶしゃぶ|シチュー/, [10,11,12,1,2,3]],
  [/タケノコ|たけのこ/, [3,4,5]], [/菜の花/, [2,3,4]], [/新玉ねぎ|春キャベツ|春野菜|桜えび/, [3,4,5]], [/新じゃが/, [3,4,5,6]], [/そら豆/, [4,5,6]],
  [/いちご/, [12,1,2,3,4,5]], [/牡蠣|かき鍋/, [10,11,12,1,2,3]], [/さんま|栗/, [9,10,11]], [/秋なす/, [8,9,10,11]], [/ぎんなん/, [9,10,11,12]], [/焼き芋/, [10,11,12,1,2]],
  [/マフラー/, [11,12,1,2,3]], [/桜のある|イルミネーション|新緑の並木|色づく並木/, []]
];
const MALE_NG = /リップ|ピアス|イヤリング|ヘアピン|ヘアクリップ|ヘアゴム|ネックレス|ネイル|コスメ|化粧|メイク|スカート|ワンピース|ブラウス|ヒール/;
const PARTNERED_NG = /気になる人|出会い/;
const WORK_NG = /上司|取引先|面接|商談|会議|プレゼン|報連相|仕事|提出/;
const FAR_NG = /海辺|岬|堤防|湖|陶芸の里|星の見える丘|夜景|水族館|足湯|雨上がり|交流会|イベント会場|イベント広場/;
const FIELDS = {
  件名: r => r.subject, 朝のひとこと: r => r.morning, 今日はこれだけ: r => r.todayOne, 開運習慣: r => r.habit,
  今日のあなた: r => r.theme.message, 縁: r => r.en.body, 恋愛運: r => r.love, 恋の一手: r => r.loveMove,
  仕事: r => r.fortunes.work, 金運: r => r.fortunes.money, 対人: r => r.fortunes.friend, 健康: r => r.fortunes.health, 学び: r => r.fortunes.study,
  運気の巡り: r => r.juni && r.juni.text, ワンポイント: r => r.onepoint, 締め: r => r.closeWord, 注目テーマ: r => r.focus && r.focus.text,
  開運アクション: r => r.lucky.action, おすすめの行動: r => r.lucky.act, アイテム: r => r.lucky.item, 食材: r => r.lucky.food,
  メニュー1: r => r.lucky.menu[0], メニュー2: r => r.lucky.menu[1], 今日の服: r => r.lucky.wear,
  ラッキースポット自然: r => r.lucky.spotNature, ラッキースポット街: r => r.lucky.spotCity, ご縁の場所自然: r => r.place.nature, ご縁の場所街: r => r.place.city
};
const rels = ['single', 'crush', 'partner', 'married', 'work'];
const INTEREST = ['恋愛', '仕事・キャリア', 'お金・家計', '健康・ウェルネス', '友達づくり'];
const fail = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [] };
const TONE_AGG = /攻め|勝負|思い切|最高潮|全力|一気に|即断即決|押すべき|手を挙げ|引っ張って|大チャンス|チャンスをつかみ|波がいちばん高い|エネルギー満タン|パワーがみなぎる|挑む/;
const TONE_REST = /休む|休息|ひと休み|休める|動かず|静かに過ごす|無理に攻めず|がんばりすぎず/;
const TONE_FIELDS = ['件名', '朝のひとこと', '今日はこれだけ', '今日のあなた', '運気の巡り', '仕事', '恋愛運', 'ワンポイント'];
const add = (k, msg) => { if (fail[k].length < 5) fail[k].push(msg); else fail[k].more = (fail[k].more || 0) + 1; };
let rnd = 20260929; const R = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
let mails = 0;
for (let u = 0; u < N; u++) {
  const b = { y: 1950 + Math.floor(R() * 58), m: 1 + Math.floor(R() * 12), d: 1 + Math.floor(R() * 28) };
  const o = { nick: 'テスト', rel: rels[u % 5], sex: u % 2 ? 'm' : 'f', timeUnknown: true, personBazi: PersonBazi, interests: [INTEREST[u % 5]] };
  const hist = [];
  for (let i = 0; i < DAYS; i++) {
    const dt = new Date(Date.UTC(2026, 9, 1) + i * 864e5), M = dt.getUTCMonth() + 1, dow = dt.getUTCDay();
    const ds = dt.toISOString().slice(0, 10);
    const r = D.generateDaily(b, { y: dt.getUTCFullYear(), m: M, d: dt.getUTCDate() }, o); mails++;
    const v = {}; for (const k in FIELDS) v[k] = FIELDS[k](r) || '';
    // 1. 7日以内の再登場（欄ごと）
    for (const k in v) { if (!v[k]) continue; for (let w = 1; w <= WIN && w <= hist.length; w++) if (hist[hist.length - w][k] === v[k]) add(1, `${ds} ${k}「${v[k].slice(0, 20)}」が${w}日前と同じ`); }
    // 2. 季節外れ
    for (const k of ['食材', 'メニュー1', 'メニュー2', 'アイテム', 'ラッキースポット自然', 'ラッキースポット街', 'ご縁の場所自然', 'ご縁の場所街'])
      for (const [re, ms] of SEASON) if (re.test(v[k]) && ms.indexOf(M) < 0) add(2, `${ds}(${M}月) ${k}「${v[k]}」`);
    // 3. 男性に女性向け（色名の「パール」「真珠色」は服の色なので対象外）
    if (o.sex === 'm') for (const k in v) { const t = v[k].replace(/パールベージュ|パール|真珠色/g, ''); if (MALE_NG.test(t)) add(3, `${ds} ${k}「${v[k].slice(0, 30)}」`); }
    // 4. 恋人・既婚に「気になる人」系の行動
    if (o.rel === 'married' || o.rel === 'partner') for (const k of ['開運アクション', 'おすすめの行動']) if (PARTNERED_NG.test(v[k])) add(4, `${ds} ${o.rel} ${k}「${v[k]}」`);
    // 5. 土日の仕事の段取り
    if ((dow === 0 || dow === 6) && WORK_NG.test(v['今日はこれだけ'])) add(5, `${ds}(土日) 「${v['今日はこれだけ'].slice(0, 30)}」`);
    // 6. 遠出の場所
    for (const k of ['ラッキースポット自然', 'ラッキースポット街', 'ご縁の場所自然', 'ご縁の場所街']) if (FAR_NG.test(v[k])) add(6, `${ds} ${k}「${v[k]}」`);
    // 7. 場所が7日以内に別の欄で
    const places = [v['ラッキースポット自然'], v['ラッキースポット街'], v['ご縁の場所自然'], v['ご縁の場所街']];
    if (new Set(places).size < 4) add(7, `${ds} 同じ日に同じ場所が2欄に出ている`);
    for (let w = 1; w <= WIN && w <= hist.length; w++) { const p = hist[hist.length - w]; const pp = [p['ラッキースポット自然'], p['ラッキースポット街'], p['ご縁の場所自然'], p['ご縁の場所街']];
      places.forEach(x => { if (pp.indexOf(x) >= 0) add(7, `${ds} 場所「${x}」が${w}日前にも出ている`); }); }
    // 10. ランクと文章の矛盾（縁の欄は縁の強さで別に決まるので対象外）
    { const g = r.grade.sym; for (const k of TONE_FIELDS) { const t = v[k].replace(/<[^>]+>/g, '');
        if ((g === '△' && TONE_AGG.test(t)) || ((g === '◎' || g === '💮') && TONE_REST.test(t))) add(10, `${ds} ${g}の日 ${k}「${t.slice(0, 40)}」`); } }
    // 11. 件名の要点（｜より前）が28字以内か（【M/D(曜)】を含む。ニックネームは5字で計算）
    { const head = ('【' + M + '/' + dt.getUTCDate() + '(日)】' + r.subject.split('｜')[0]).replace(/テスト/, 'あいうえお');
      if ([...head].length > 28) add(11, `${ds} 件名の前半が${[...head].length}字：${head}`); }
    // 9. 文章の欠け・混入
    { const J = JSON.stringify(r); if (/undefined|NaN|\[object|\{[A-Z]\}/.test(J)) add(9, `${ds} undefined/NaN/置き換え漏れ：${(J.match(/.{0,30}(undefined|NaN|\[object|\{[A-Z]\}).{0,10}/) || [''])[0]}`);
      for (const k of ['subject', 'morning', 'relIntro', 'weatherMsg', 'todayOne', 'habit', 'closeWord', 'onepoint']) if (!r[k]) add(9, `${ds} 必須の欄が空：${k}`);
      if (!r.lucky.menu || r.lucky.menu.length < 2 || r.lucky.menu[0] === r.lucky.menu[1]) add(9, `${ds} メニュー2品が同じ/空：${JSON.stringify(r.lucky.menu)}`); }
    // 8. HTMLの壊れ（属性の " の閉じ忘れ・重複など）…毎月1日と15日ぶんを検査
    if (dt.getUTCDate() === 1 || dt.getUTCDate() === 15) {
      const html = renderDailyMail(r).html;
      const m1 = html.match(/style="[^"]*"[^\s>\/]/); if (m1) add(8, `${ds} style属性が途中で切れている：${m1[0].slice(0, 60)}`);
      const m2 = html.match(/<[a-z]+[^>]*\s[a-z-]+="[^"]*"[^\s>\/][^>]*>/i); if (!m1 && m2) add(8, `${ds} 属性の書き方が壊れている：${m2[0].slice(0, 60)}`);
      const opens = (html.match(/<table\b/g) || []).length, closes = (html.match(/<\/table>/g) || []).length;
      if (opens !== closes) add(8, `${ds} <table> の開き(${opens})と閉じ(${closes})の数が合わない`);
    }
    hist.push(v);
  }
}
const names = { 1: '同じ文章が7日以内に戻る', 2: '季節外れ', 3: '男性に女性向け', 4: '恋人・既婚に「気になる人」系', 5: '土日に仕事の段取り', 6: '遠出が必要な場所', 7: '場所が7日以内に別の欄で出る', 8: 'メールのHTMLが壊れている', 9: '文章の欠け・混入', 10: 'ランクと文章の矛盾', 11: '件名の要点が長すぎる' };
let ok = true;
console.log(`検査：${N}人 × ${DAYS}日 = ${mails}通`);
for (const k in names) { const n = fail[k].length + (fail[k].more || 0); if (n) ok = false;
  console.log(`${n ? '✗' : '✓'} ${k}. ${names[k]}：${n}件`); fail[k].forEach(m => console.log('    例）' + m)); }
console.log(ok ? '\nPASS：すべて0件です' : '\nFAIL：上の項目を直してください');
process.exit(ok ? 0 : 1);
