# 易 EKI Pro ― 引き渡しメモ（この商品だけ）

最終更新：2026-10-14　／　販売事業者：72k株式会社　／　対応バージョン：`eki-pro/app/sw.js` の `CACHE = 'eki-pro-v74'`

> **この ZIP は「易 EKI Pro」だけ**です。四柱推命 PRO・今日から占い師（ビギナー）は**別の商品**で、別の ZIP です。混ぜないでください。
> サーバー（会員・決済・オンライン鑑定の中継）は全商品で共通の基盤です。依頼の全体は「【最終完成版】0_共通サーバー基盤」ZIP の `エンジニアへの実装依頼_3サイト.md` を先に読んでください。
> この商品の詳しい仕様は `eki-pro/実装仕様_エンジニア向け.md`、会員・決済・API は `eki-pro/実装仕様_会員まわり_共通.md`（基盤と同じもの）です。

## 1. この商品

| 項目 | 内容 |
|---|---|
| 商品名 | 易 EKI Pro |
| 対象 | 易で鑑定する占い師（toB） |
| フォルダ | `eki-pro/`（LP・登録・申込・ログイン・マイページ・規約。アプリは `eki-pro/app/`） |
| 本番ドメイン | `https://ekipro.jp/`（OGP・特商法に記載済み） |
| 商品ID（ヘッダ `X-Product`） | `eki` |
| お申し込み番号 | `E-YYYYMMDD-XXXXX-XXXXX` |
| 料金 | 月額 9,800円（税込）のみ・7日間無料（お申し込み日を1日目とする7日間。8日目に初回、以後毎月その日） |
| 回数上限 | 無料期間中：オンライン鑑定＋深掘り相談の合計 1日3回／有料：1日100回・1か月3,000回・1分15回。鑑定1件＝1回（2回目の `x-eki-kind: detail` と鑑定書 `x-eki-kind: sho` は数えない） |
| 顧客名簿 | 端末内だけ（サーバーに保存しない。規約どおり）。`mypage-get`／`mypage-put` は使わない |
| この商品だけのAPI | `apply-start`（登録画面のプロフィールを控える。会員はまだ作らない） |

## 2. 本番公開の切替（この商品の分）

| # | 内容 | 場所 |
|---|---|---|
| 1 | `var PREVIEW_MODE = true;` → **`false`** | `eki-pro/app/index.html` 548行 |
| 2 | `STUB` の式 → **`STUB: false`** | `eki-pro/auth.html` 232行・`eki-pro/mypage.html` 181行・`eki-pro/upgrade.html` 360行（`TRIAL_CHECK`）・472行（`FIX`）・`eki-pro/register.html` 155行（`CONFIG`） |
| 3 | 決済ページURL `TELECOM_PAYMENT_URL={ month:'' }`・`TELECOM_PARAM`（`ORDER_PREFIX='E'` はそのまま） | `eki-pro/upgrade.html` 330〜332行 |
| 4 | テスト用キー欄 `#demoKeyCard`・`#geminiCard` と、`?gtest=1` で表示する1行を削除（欄を消してもアプリは止まらない作り）。`GEMINI_API_KEY = ""` は空のまま | `eki-pro/app/index.html` 726行・981行・2970行・1174行 |
| 5 | 「▶ 登録せずに、そのまま鑑定を体験する（デモ）」リンク（`#demoLink`）を削除 | `eki-pro/register.html` 137行 |
| 6 | `DEMO_MODE` は `false` のまま | `eki-pro/app/index.html` 558行 |
| 7 | サーバー中継 `eki-pro/functions/gemini.js` の環境変数 | 共通仕様 §5 |
| 8 | 変えたら `eki-pro/app/sw.js` の `CACHE` を1つ上げる | `eki-pro/app/sw.js` 4行 |

- 本番ドメイン（ekipro.jp）では 1・2 を書き忘れても自動で false になりますが、それ以外のドメインでは効かないので必ず書きかえてください。

## 3. ★大事：画面の一部は PRO から自動で作っています
- `upgrade.html`・`auth.html`・`mypage.html` は、四柱推命 PRO の申込・ログイン・マイページから **`tools/eki_pay_from_pro.py eki-pro` で自動生成**しています（流れ・APIは共通で、色・名前・リンク先・説明文が違う）。**直接直さないでください**（作り直すと消えます）。生成ツールは「共通サーバー基盤」ZIP の `tools/` にあります。
- 生成すると PRO の値（`STUB`・決済URL）が写るので、上の切替は**生成のあと**に行ってください。生成のあとは `python3 tools/add_product_tag.py` で商品ID（`eki`）を入れ直します。
- `register.html`・`app/index.html`・LP・規約類は、このフォルダで直接管理しています。

## 4. 触ってはいけないもの
- 易の原文データ `HEXDB` は書きかえない。命式は四柱推命 PRO と同じ計算エンジン（`window.Bazi.computeChart`）を使っており、改変禁止。
- 画面の文言に「AI」を出さない。鑑定文に `*` を出さない。
