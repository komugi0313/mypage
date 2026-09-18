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
| `LOGIC.md` | サイトのロジック整理（3層構成・二人相性の突き合わせ式・単一ソース設計） |
| `tools/sync-engines.js` | 画面(index.html) と 外部 .js の単一ソース同期を検証/復元するツール |

外部依存：Google Fonts（Marcellus / Zen 系）、qrcodejs（cdnjs）。

## 単一ソースの同期（重要）

`index.html` は `engine.js` / `daily-engine.js` をインライン埋め込みしており、外部 `.js`（メール配信サーバ用）と
**内容が一致していないと画面とメールが食い違う**。ロジック／文言は `index.html` を編集し、その後かならず同期する。

```bash
node tools/sync-engines.js --check   # 一致を検証（CI 向き。不一致なら exit 1）
node tools/sync-engines.js --write   # index.html を正として外部 .js を再生成
```

詳細は `LOGIC.md` を参照。

## 由来

- `index.html` … アップロードされた最新版 `destinacal_2.html` を「にこカレ」へリブランドしたもの
- `daily-engine.js` / `engine.js` … リポジトリ最新版 `166unmei_latest (4).zip`（2026-08-24 時点）の `site/` から取得

ブランド遍歴：「1.66 / 私だけの運気予報」→「Destina」→ **にこカレ**

## デプロイ

この `nikocale/` ディレクトリを公開ディレクトリとして Netlify にデプロイ（ドラッグ&ドロップ、または publish directory に指定）。
