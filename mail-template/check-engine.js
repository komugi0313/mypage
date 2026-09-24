/* 送ったメールの文章が、ロジック（generateDaily）の出力と同じかを確かめる
   使い方：ENGINE_DIR=<daily-engine.js のあるフォルダ> node check-engine.js 1985-4-1 2026-9-24 married f はなこ [HH:MM] [関心,関心]
   → その会員・その日にロジックが出す文章を一覧で表示する。送ったメールと1項目ずつ見比べる。 */
const path = require('path');
const dir = path.resolve(process.env.ENGINE_DIR || '.');
const D = require(path.join(dir, 'daily-engine.js'));
const { PersonBazi } = require(path.join(dir, 'bazi.js'));
const { renderDailyMail } = require('./render-daily-mail.js');
const [birth, date, rel = 'single', sex = 'f', nick = 'あなた', time = '', interests = ''] = process.argv.slice(2);
if (!birth || !date) { console.log('使い方: node check-engine.js 生年月日(YYYY-M-D) 配信日(YYYY-M-D) rel sex nick [HH:MM] [関心,関心]'); process.exit(1); }
const [by, bm, bd] = birth.split('-').map(Number), [y, m, d] = date.split('-').map(Number);
const [hh, mm] = time ? time.split(':').map(Number) : [null, null];
const r = D.generateDaily({ y: by, m: bm, d: bd }, { y, m, d }, {
  nick, rel, sex, hour: hh, minute: mm, timeUnknown: !time,
  interests: interests ? interests.split(',') : [], personBazi: PersonBazi
});
const s = (v) => String(v == null ? '' : v).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '');
const L = r.lucky, F = r.fortunes;
const rows = [
  ['件名（正）', renderDailyMail(r).subject],
  ['朝のひとこと', r.morning], ['導入文', r.relIntro],
  ['今日の月', r.moon && (r.moon.name + ' 月齢' + r.moon.age)], ['七十二候', r.kou && (r.kou.sekki + '・' + r.kou.third + '「' + r.kou.name + '」')],
  ['天気・指数・ランク', r.weather.name + '／' + r.index + '／' + r.grade.sym + r.grade.label], ['天気の一言', r.weatherMsg],
  ['こよみ', (r.koyomi.items || []).map(i => i.label + '：' + i.text).join(' ／ ')],
  ['今日はこれだけ', r.todayOne], ['開運習慣', r.habit], ['注目テーマ', r.focus && (r.focus.label + '：' + r.focus.text)],
  ['今日のあなた', '「' + r.theme.axis + '」（' + r.theme.mean + '）' + r.theme.line + ' ' + r.theme.message], ['運気の巡り', s(r.juni && r.juni.text)],
  ['縁', '[' + r.en.tag + '] ' + r.en.body], ['恋愛運', r.love], ['恋の一手', r.loveMove],
  ['場所', r.place.direction + '／' + r.place.nature + '／' + r.place.city],
  ['仕事', F.work], ['金運', F.money], ['対人', F.friend], ['学び', F.study], ['健康', F.health],
  ['ラッキー', [L.color, L.food, L.direction, L.number, L.action, L.item, L.spotNature + '／' + L.spotCity, L.act].join('・')],
  ['メニュー', (L.menu || []).join('・')], ['今日の服', L.wear], ['ワンポイント', r.onepoint], ['季節のたより', r.season && r.season.word], ['締め', s(r.closeWord)]
];
rows.forEach(([k, v]) => console.log(('【' + k + '】').padEnd(12, '　') + ' ' + s(v)));
