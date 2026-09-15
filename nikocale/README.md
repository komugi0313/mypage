# にこカレ — 相性ごよみ

「二人の運命が、動く日。」相性診断・運気予報サイト **にこカレ**（旧名 Destina）のデプロイ用一式。

Netlify: https://animated-dolphin-24857d.netlify.app/

## 構成

| ファイル | 説明 |
|---|---|
| `index.html` | 本体（相性ごよみカレンダー）。アイコン・PWAマニフェストは data URI として埋め込み済み |
| `daily-engine.js` | 日次の運気グレード算出エンジン（`generateDaily` / `dailyGrade` / `koyomiOf` / `window.KDaily` / `window.PersonBazi`） |
| `engine.js` | 四柱推命コアエンジン（`window.KEngine` ほか） |
| `_headers` | Netlify 配信ヘッダー設定 |
| `仕様書_相性ごよみロジック.md` | カレンダーの「良い日／避けたい日」判定ロジックの正本（監査・調整履歴込み） |

外部依存：Google Fonts（Marcellus / Zen 系）、qrcodejs（cdnjs）。

## 由来

- `index.html` … アップロードされた最新版 `destinacal_2.html` を「にこカレ」へリブランドしたもの
- `daily-engine.js` / `engine.js` … リポジトリ最新版 `166unmei_latest (4).zip`（2026-08-24 時点）の `site/` から取得

ブランド遍歴：「1.66 / 私だけの運気予報」→「Destina」→ **にこカレ**

## デプロイ

この `nikocale/` ディレクトリを公開ディレクトリとして Netlify にデプロイ（ドラッグ&ドロップ、または publish directory に指定）。
