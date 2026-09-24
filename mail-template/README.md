# 毎朝の運気予報メール テンプレート（これが「メールの正」）

`mail-sample.html`（オーナーが作ったメール見本）の見た目とセクションの並びを、**そのままメールで表示できる形（テーブルレイアウト＋インラインCSS）**に移植したものです。
今後、配信メールの見た目・並び・件名はこのテンプレートを正とします。

| ファイル | 内容 |
|---|---|
| `render-daily-mail.js` | `renderDailyMail(r, opts)` → `{ subject, html, text }`。`r` は `generateDaily()` の返り値そのまま |
| `build-samples.js` | 見本メールを3通生成（`samples/`） |
| `samples/*.html` | 生成された本物のメールHTML（テスト送信の本文にそのまま使える） |
| `samples/*.txt` | 件名＋テキスト版 |
| `samples/*.jpg` | スマホ幅（390px）での表示イメージ |

## 使い方（毎朝バッチに組み込む）

```js
const D = require('./daily-engine.js');            // engine.js / bazi.js と同じフォルダ
const { PersonBazi } = require('./bazi.js');
const { renderDailyMail } = require('./render-daily-mail.js');

const r = D.generateDaily(
  { y: 1990, m: 5, d: 20 },                          // 生年月日
  { y: 2026, m: 9, d: 24 },                          // 配信日（JST）
  { nick, rel, sex, hour, minute, timeUnknown, interests, personBazi: PersonBazi } // personBazi は必ず渡す
);
const mail = renderDailyMail(r, {
  assetBase:      'https://unkiyoho.jp/',                                // 画像（icon-crystal.png / bg-*.jpg）の置き場所
  unsubscribeUrl: 'https://unkiyoho.jp/unsubscribe.html?token=' + token, // 受信者ごとの解除トークン
  mypageUrl:      'https://unkiyoho.jp/mypage.html',
  aishouUrl:      'https://166unmei.com/',
});
send({ to, subject: mail.subject, html: mail.html, text: mail.text });  // text は multipart/alternative の text/plain に
```

見本の再生成：`ENGINE_DIR=<daily-engine.js のあるフォルダ> node build-samples.js`

## 決定事項（オーナー確認済み）

1. **件名**＝`【M/D(曜)】` ＋ `generateDaily().subject`（毎日変わる文面）
   例：`【9/24(木)】あかりさん、今日の運気予報｜今日は「ととのえの日」`
2. **正は1つ**＝このテンプレート（元は `mail-sample.html`）。`my-tenki-demo.html` はアプリ画面のデモで、メールの見た目・並びの参考にはしない。
3. **季節の便箋は `mail-sample.html` のとおり**。月（JST）で `THEMES` から色・絵文字を選ぶ。1・2・3・8月は背景画像（`bg-*.jpg`）＋単色フォールバック。

## セクションの並び（上から）

ヘッダー（季節の絵文字リボン・日付・あいさつ・朝のひとこと・導入文）
→ 🌙今日の月／🍃七十二候 → 🔮今日のあなたの鑑定（カレンダーと同じ判定のチップ）→ ☁️天気・運勢指数
→ ✅今日はこれだけ → 🌱今日の開運習慣 → 🎯注目テーマ（関心登録者のみ）→ 🌅今日のあなた → 🔄運気の巡り
→ 💗恋愛・ご縁（見出しは「今の状況」で変わる／work は非表示）→ 💼仕事 → 💰金運 → 🌐対人 → 📚学び → 🌿健康
→ 🗓こよみメモ（該当日のみ）→ 🍀ラッキー（2列）→ 💡ワンポイント → 🍵季節のたより
→ 💞1.66相性診断＋シェア → 📖ことばのメモ → 締め・法定フッター

「今の状況(rel)」ごとの縁の見出し：

| rel | 縁 | 場所 | 恋愛運 |
|---|---|---|---|
| single | 運命の人との距離 | 出会いやすい場所 | 出す |
| crush | 気になる人との距離 | 縁が動きやすい場所 | 出す |
| partner | ふたりの縁 | ふたりの時間のヒント | 出さない |
| married | 夫婦・家庭の縁 | 家庭の時間のヒント | 出さない |
| work | （恋愛・ご縁ブロックごと出さない） | 縁が活きる場所（対人の後） | 出さない |

## メールとしての注意

- `<style>` を使わず全部インライン。Flex/Grid なし（Gmail が削るため）。
- グラデーション・背景画像は、対応していないメールソフトでも単色で表示されるよう、先に単色を指定している。
- HTMLは約25KB（Gmail が「メッセージの一部が表示されていません」で切る 102KB を十分下回る）。
- 本番前に **Gmail（Web/アプリ）・iPhoneメール・Outlook** へ実際にテスト送信して確認すること。
- ニックネームはHTMLエスケープ済み。エンジンの文章（`<br>` や `<b>` を含む）はそのまま差し込む。

## メールソフトごとの見え方（2026-09-24 確認）

`client-check/compare-top.jpg` / `compare-bottom.jpg`：3列の比較。いずれも**ブラウザ上での再現**で、実機ではない。

| メールソフト | 色 | 形 | 備考 |
|---|---|---|---|
| iPhone標準メール | 同じ | 同じ | `color-scheme: light` を指定しているので、ダークモードでも自動で色が変わりにくい |
| Gmail（Web・iPhoneアプリ・Androidアプリ） | 同じ（ライト表示時） | 同じ | 使っているCSSはすべてGmailが対応しているもの。25KB前後なので途中で切られない |
| Android（Gmailアプリ・Samsungメール） | 同じ（ライト表示時） | 同じ | 絵文字の絵柄と明朝体の書体は端末のものになる |
| Outlook（Web・iPhone/Androidアプリ・Mac） | 同じ（ライト表示時） | 同じ | |
| **Outlook（Windowsの旧デスクトップ版）** | ほぼ同じ（グラデーションは単色に） | **角が四角になる** | 幅は440pxに固定済み。ボタンの色と大きさ、色の丸（●）は残る |
| **ダークモードにしている人（Gmailアプリ・Outlookアプリ）** | **暗い色に変わる**（読める） | 同じ | メールソフトが自動で色を反転する（送る側では止められない）。文字が乗る箱はすべて単色背景にしてあるので、反転しても「明るい背景に明るい文字」にならず読める |

変えられないもの：
- 絵文字の絵柄（Apple／Google／Microsoft でデザインが違う）
- 書体（明朝体がない端末ではゴシック体になる）
- ダークモードでの自動の色反転（Gmail・Outlookのアプリ）

**本番前に必ず実機へテスト送信すること**：Gmail（iPhone・Android）／iPhone標準メール（iCloud）／Outlook.com・Outlookアプリ／Windows版Outlook。Litmus や Email on Acid を使えば1回で各メールソフトの画面を撮れる。

### ダークモード対策（重要・変更しないこと）
- 文字が乗る箱・外枠・ボタンに **グラデーション（background-image）を使わない**。Gmail等は背景色と文字色は反転するが background-image は反転しないため、グラデーションの箱では「明るい背景に明るい文字」になり読めなくなる。
- 背景は必ず `background-color`（単色）＋`bgcolor` 属性で指定する。
