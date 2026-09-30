# 毎朝の運気予報メール テンプレート（これが「メールの正」）

配信メールの見た目・並び・件名の**正**です。オーナーのメール見本の見た目と並びを、**メールでそのまま表示できる形（テーブルレイアウト＋インラインCSS）**にしたものです。

> 仕様の全体は、ZIPの一番上の **`【最初に読む】エンジニア実装仕様書（最終版）.md`** を先に読んでください。

| ファイル | 内容 |
|---|---|
| `mail-bg/` | 12か月分の**動く季節バナー**（`banner-01.gif`〜`banner-12.gif`・各27〜70KB）と小さなアイコン `crystal-30.png`。**`assetBase` の下へアップロードする**（`https://unkiyoho.jp/mail-bg/…`） |
| `jp-holidays.js` | 日本の祝日の自動計算。`render-daily-mail.js` が同じフォルダから読み、祝日の朝は日付の下に「🎌 今日は◯◯」を出す。サイトのルートにも同じものを置く（カレンダー用） |
| `render-daily-mail.js` | `renderDailyMail(r, opts)` → `{ subject, html, text }`。`r` は `generateDaily()` の返り値そのまま |
| `build-samples.js` | 見本メールを3通生成（`samples/`）。`sample-0924-test-married` はテスト会員（はなこ・1985/4/1・結婚している・女性・時刻なし・架空）の 9/24 のメール |
| `check-engine.js` | ある会員・ある日にロジックが出す文章を一覧表示（送ったメールとの照合用）。例：`ENGINE_DIR=.. node check-engine.js 1985-4-1 2026-9-24 married f はなこ` |
| `check-quality.js` | メールの品質検査（7日以内の繰り返し・季節外れ・性別・今の状況・土日・遠出・場所の重複・HTMLの壊れ・文章の欠け・ランクと文章の矛盾・件名の長さ の11項目）。**ロジックを変えたら必ず実行し、PASS を確認する**：`ENGINE_DIR=.. node check-quality.js` |
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
  { nick, rel, sex, hour, minute, timeUnknown, interests, personBazi: PersonBazi } // sex は 'f'/'m'（登録の「女性」「男性」を変換）。personBazi は必ず渡す
);
const mail = renderDailyMail(r, {
  assetBase:      'https://unkiyoho.jp/',                                // 画像（mail-bg/banner-MM.gif / mail-bg/crystal-30.png）の置き場所
  unsubscribeUrl: 'https://unkiyoho.jp/unsubscribe.html?token=' + token, // 受信者ごとの解除トークン
  mypageUrl:      'https://unkiyoho.jp/mypage.html',
  aishouUrl:      'https://166unmei.com/',
  operatorUrl:    'https://unkiyoho.jp/tokushoho.html',                  // 運営者情報
  refCode:        member.ref_code,                                       // 会員の紹介コード（シェアのリンクに ?ref= で付く）
});
send({ to, subject: mail.subject, html: mail.html, text: mail.text });  // text は multipart/alternative の text/plain に
```

見本の再生成：`ENGINE_DIR=<daily-engine.js のあるフォルダ> node build-samples.js`

## 決定事項（オーナー確認済み）

1. **件名**＝`【M/D(曜)】` ＋ `generateDaily().subject`
   例：`【11/8(日)】はなこさん🍁充電の日｜今日の月は🌘有明の月`（前半＝名前＋季節の絵文字＋ランクと縁で決まる今日の一言。iPhoneの一覧で見える約28字に収まる）
2. **正は1つ**＝このテンプレート。`my-tenki-demo.html` はアプリ画面のデモで、メールの見た目・並びの参考にはしない。
3. **季節のデザイン＝動く季節バナー＋月ごとの色**（写真の便箋は使わない。読み手の負担を優先）。月（JST）で `THEMES` から選ぶ。
   - 一番上に、その月の動く季節バナー（`mail-bg/banner-MM.gif`）を `<img>` で1枚。約2秒の動きを3回くり返して止まる。Windows版Outlookは1コマ目（完成した絵）が出る。
   - 枠は月ごとの単色（`bgcolor`）、一番下は季節の絵文字のリボン（文字なので画像なし）。1通の画像は合計約30〜70KB。
   - バナーの絵を変えるときは、必ずオーナーに確認する。
4. **カレンダーの記号・絵文字（💮◎〇△・分野マーク）は変えない**（ほかの商品と連動）。
   - 一覧：`client-check/months-12.jpg`

## セクションの並び（上から）

動く季節バナー → ヘッダー（日付・祝日の朝は「🎌 今日は◯◯」・あいさつ・朝のひとこと・導入文）
→ 🌙今日の月／🍃七十二候 → 🔮今日のあなたの鑑定（カレンダーと同じ判定のチップ）→ ☁️天気・運勢指数
→ ✅今日はこれだけ → 🌱今日の開運習慣 → 🎯注目テーマ（関心登録者のみ）→ 🌅今日のあなた → 🔄運気の巡り
→ 💗恋愛・ご縁（見出しは「今の状況」で変わる／work は非表示）→ 💼仕事 → 💰金運 → 🌐対人 → 📚学び → 🌿健康
→ 🗓こよみメモ（該当日のみ）→ 🍀ラッキー（2列）→ 💡ワンポイント → 🍵季節のたより
→ 💞1.66相性診断＋運気予報のシェア（→ `https://unkiyoho.jp/?ref=紹介コード`。下にパソコン向けに同じURL）→ 📖ことばのメモ → 締め・フッター → 季節の絵文字のリボン

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
- 文字が乗る部分にグラデーションは使っていない（ダークモード対策）。写真の背景は使っていない。
- HTMLは約25KB（Gmail が「メッセージの一部が表示されていません」で切る 102KB を十分下回る）。
- 本番前に **Gmail（Web/アプリ）・iPhoneメール・Outlook** へ実際にテスト送信して確認すること。
- ニックネームはHTMLエスケープ済み。エンジンの文章（`<br>` や `<b>` を含む）はそのまま差し込む。

## メールソフトごとの見え方

| メールソフト | 色 | 形 | 備考 |
|---|---|---|---|
| iPhone標準メール | 同じ | 同じ | `color-scheme: light` を指定しているので、ダークモードでも自動で色が変わりにくい |
| Gmail（Web・iPhoneアプリ・Androidアプリ） | 同じ（ライト表示時） | 同じ | 使っているCSSはすべてGmailが対応しているもの。25KB前後なので途中で切られない |
| Android（Gmailアプリ・Samsungメール） | 同じ（ライト表示時） | 同じ | 絵文字の絵柄と明朝体の書体は端末のものになる |
| Outlook（Web・iPhone/Androidアプリ・Mac） | 同じ（ライト表示時） | 同じ | |
| **Outlook（Windowsの旧デスクトップ版）** | ほぼ同じ | **角が四角になる**・バナーは動かない（1コマ目） | 幅は440pxに固定済み。バナー、ボタンの色と大きさ、色の丸（●）は残る |
| **ダークモードにしている人（Gmailアプリ・Outlookアプリ）** | **暗い色に変わる**（読める） | 同じ | メールソフトが自動で色を反転する（送る側では止められない）。文字が乗る箱はすべて単色背景にしてあるので、反転しても「明るい背景に明るい文字」にならず読める |

変えられないもの：
- 絵文字の絵柄（Apple／Google／Microsoft でデザインが違う）
- 書体（明朝体がない端末ではゴシック体になる）
- ダークモードでの自動の色反転（Gmail・Outlookのアプリ）

**本番前に必ず実機へテスト送信すること**：Gmail（iPhone・Android）／iPhone標準メール（iCloud）／Outlook.com・Outlookアプリ／Windows版Outlook。Litmus や Email on Acid を使えば1回で各メールソフトの画面を撮れる。

### ダークモード対策（重要・変更しないこと）
- 文字が乗る箱・外枠・ボタンに **グラデーション（background-image）を使わない**。Gmail等は背景色と文字色は反転するが background-image は反転しないため、グラデーションの箱では「明るい背景に明るい文字」になり読めなくなる。
- 背景は必ず `background-color`（単色）＋`bgcolor` 属性で指定する。

## 特定電子メール法の表示（オーナー決定：A案）

1.66相性診断（自社の姉妹サービス）への案内を載せるため、広告宣伝メールとして扱い、次のように表示する。
- **メール本文**：送信者の名称「運営：72k株式会社」、配信停止リンク（ログイン不要）、設定変更リンク
- **リンク先（`operatorUrl`＝`tokushoho.html`）**：事業者名、問い合わせ先メールアドレス
  - **住所は載せない**（オーナー決定：無料サービスのため）。会社名（72k株式会社）と問い合わせ先メールアドレス（info@72k.ai）を載せる。`tokushoho.html` は現状のままでよい。
- 「運営：72k株式会社｜運営者情報」の行はオーナー指定で小さく薄い文字（9px・#c4b8b0）。
