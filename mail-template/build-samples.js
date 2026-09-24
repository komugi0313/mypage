/* 見本メールを生成する： ENGINE_DIR=<daily-engine.js等のフォルダ> node build-samples.js
   → samples/*.html（そのままブラウザで開ける／テスト送信の本文に使える） */
const path = require('path'), fs = require('fs');
const dir = path.resolve(process.env.ENGINE_DIR || '.');
const D = require(path.join(dir, 'daily-engine.js'));
const { PersonBazi } = require(path.join(dir, 'bazi.js'));
const { renderDailyMail } = require('./render-daily-mail.js');
const assetBase = process.env.ASSET_BASE || 'https://unkiyoho.jp/';
const people = [
  // テスト会員（架空）：9/24 に届いたメールと同じ条件（結婚している・女性・時刻なし・9/24）
  { file: 'sample-0924-test-married', birth: { y: 1985, m: 4, d: 1 }, date: { y: 2026, m: 9, d: 24 }, o: { nick: 'はなこ', rel: 'married', sex: 'f', timeUnknown: true } },
  { file: 'sample-0924-crush',   birth: { y: 1995, m: 9, d: 12 }, date: { y: 2026, m: 9, d: 24 }, o: { nick: 'あかり', rel: 'crush', sex: 'f', timeUnknown: true, interests: ['恋愛', '仕事・キャリア'] } },
  { file: 'sample-0808-single',  birth: { y: 1998, m: 3, d: 3 },  date: { y: 2026, m: 8, d: 8 },  o: { nick: 'けいた', rel: 'single', sex: 'm', hour: 7, minute: 30, timeUnknown: false } },
];
fs.mkdirSync(path.join(__dirname, 'samples'), { recursive: true });
for (const p of people) {
  const r = D.generateDaily(p.birth, p.date, Object.assign({ personBazi: PersonBazi }, p.o));
  const m = renderDailyMail(r, { assetBase, unsubscribeUrl: assetBase + 'unsubscribe.html?token=SAMPLE', mypageUrl: assetBase + 'mypage.html' });
  fs.writeFileSync(path.join(__dirname, 'samples', p.file + '.html'), m.html);
  fs.writeFileSync(path.join(__dirname, 'samples', p.file + '.txt'), '件名: ' + m.subject + '\n\n' + m.text);
  console.log(p.file, '|', m.subject, '|', Math.round(m.html.length / 1024) + 'KB');
}
