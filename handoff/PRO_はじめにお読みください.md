# 四柱推命 自動鑑定 PRO ― 引き渡しメモ（この商品だけ）

最終更新：2026-10-17　／　販売事業者：72k株式会社　／　対応バージョン：`pro/sw.js` の `CACHE = 'shichu-jidou-v522'`

> **この ZIP は「四柱推命 自動鑑定 PRO」だけ**です。ビギナー（今日から占い師）・易 EKI Pro は**別の商品**で、別の ZIP です。混ぜないでください。
> サーバー（会員・決済・詳細鑑定の中継）は全商品で共通の基盤です。依頼の全体と基盤の仕様は「【最終完成版】0_共通サーバー基盤」ZIP の `エンジニアへの実装依頼_3サイト.md` を先に読んでください。この ZIP の `pro/IMPLEMENTATION_SPEC_for_engineer.md` は、その基盤の仕様（会員・決済・API）と同じものです。

## 1. この商品

| 項目 | 内容 |
|---|---|
| 商品名 | 四柱推命 自動鑑定 PRO |
| 対象 | 四柱推命を知っている・鑑定経験のある占い師（toB） |
| フォルダ | `pro/`（ビルド不要の静的PWA） |
| 本番ドメイン | `https://72k.ai/`（OGP・特商法に記載済み） |
| 商品ID（ヘッダ `X-Product`） | `pro` |
| お申し込み番号 | `P-YYYYMMDD-XXXXX-XXXXX` |
| 料金 | 月額 9,800円（税込）のみ・7日間無料（お申し込み日を1日目とする7日間。8日目に初回、以後毎月その日） |
| 利用の上限 | 有料：**回数は数えない・1日の上限なし**（お客様に回数・残りは見せない）。サーバーが1人あたりの実際の費用をご契約の期間ごとに足し、月2,940円（利益65%の線）に届いたら次の更新日までお休み（429 `MONTH_BUDGET`。使い切っても次の更新日までオフラインの詳細鑑定で続けられる）。無料期間中：**1日3回**（相談1件・鑑定書1通＝1回。2回目の `x-pk-part: detail` と作り直しは数えない）。どちらも雛形 `functions/gemini.js` に実装済み。くわしくは共通仕様 §3-3 |
| 顧客カルテ | 端末＋ログイン中はサーバーに同期（`mypage-get`／`mypage-put`） |
| PRO だけの機能 | 今月の運勢をまとめて作る（LINE用の文章）・前回のふり返り（顧客の `next`）・鑑定トーク例。端末内で動き、サーバーの追加作業なし |

## 2. 本番公開の切替（この商品の分）

| # | 内容 | 場所 |
|---|---|---|
| 1 | `var PREVIEW_MODE = true;` → **`false`** | `pro/app-pro.html` 829行 |
| 2 | `STUB: !/(^\|\.)(72k\.ai\|suimei\.jp\|ekipro\.jp)$/i.test(location.hostname)` → **`STUB: false`** | `pro/auth.html` 230行・`pro/mypage-pro.html` 191行・`pro/pricing-pro.html` 379行（`TRIAL_CHECK`）・491行（`FIX`） |
| 3 | 決済ページURL `TELECOM_PAYMENT_URL={ month:'' }`・`TELECOM_PARAM`（`ORDER_PREFIX='P'` はそのまま） | `pro/pricing-pro.html` 349〜351行 |
| 4 | テスト用キー欄 `<details id="gtest-wrap">` をブロックごと削除、`?gtest=1` で表示する1行、テスト用キーを読む1行（`geminiKey='';` に固定でも可） | `pro/app-pro.html` 1089行・8405行・8399行 |
| 5 | `DEMO_MODE` は `false` のまま | `pro/app-pro.html` 826行 |
| 6 | サーバー中継 `pro/functions/gemini.js` の環境変数（`GEMINI_API_KEY`・`MEMBER_CHECK_URL` ほか） | 共通仕様 §5 |
| 7 | 変えたら `pro/sw.js` の `CACHE` を1つ上げる | `pro/sw.js` 6行 |

- 本番ドメイン（72k.ai）では 1・2 を書き忘れても自動で false になりますが、それ以外のドメイン（確認用URL・アプリの中）では効かないので、必ず書きかえてください。

## 3. この商品のファイル（主なもの）
- `index.html`（LP。会員の端末はアプリへ移動。`?lp=1` で LP を表示）・`app-pro.html`（鑑定ツール本体）・`meishi-sheet.html`（鑑定書）
- `pricing-pro.html`（申込・最終確認・決済からの戻り）・`auth.html`（ログイン等）・`mypage-pro.html`（マイページ）
- `terms-pro.html`・`privacy-pro.html`・`tokushoho-pro.html`（規約・プライバシー・特商法）
- `functions/gemini.js`（中継の雛形）・`netlify.toml`・`sw.js`・`manifest-pro.webmanifest`
- `IMPLEMENTATION_SPEC_for_engineer.md`（会員・決済・API の仕様＝共通基盤）

## 4. 触ってはいけないもの
- 計算エンジン（`app-pro.html`・`meishi-sheet.html` に埋め込まれた `window.Bazi.computeChart`、`computeMeishiki`、`pklove.js`）は改変禁止。
- 基準ケース **1981-06-10 22:28 女性** → 月柱 甲午／順行／立運 8年6ヶ月／大運 甲午→乙未→丙申→丁酉（公開前に確認）。
- 画面の文言に「AI」を出さない（日運・月運の詳細鑑定ボタンだけ例外）。鑑定文に `*` を出さない。
- `app-pro.html` などを直すと、ビギナーの画面も PRO から作り直すことになります（生成ツールは共通サーバー基盤の ZIP の `tools/`）。
