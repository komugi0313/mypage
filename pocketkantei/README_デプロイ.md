# Pocket本格鑑定 — Netlify デプロイ手順

この zip の中身が **サイトのルート**です。フォルダごと Netlify にドラッグ&ドロップ（または Git 連携）で公開できます。

## 1. デプロイ
- Netlify の対象サイト → **Deploys** → この zip を展開したフォルダをドラッグ&ドロップ
- `netlify.toml` が `functions = "functions"` と `/api/gemini → /.netlify/functions/gemini` のリダイレクトを自動設定します
- 関数の依存（`@netlify/blobs`）は `package.json` に記載済み。Git 連携なら自動で `npm install` されます

## 2. 環境変数（必須・最重要）
- Netlify → **Site settings → Environment variables** に **`GEMINI_API_KEY`** を登録
- **キーは必ず Netlify の環境変数にのみ設定**。HTML/JS やチャットに貼り付けない
- 以前チャット等に露出したキーは無効化し、**新しいキーを再発行**してから登録してください
- Gemini 3.x（DEEP）を使うには、対象 Google Cloud プロジェクトで **前払い（プリペイド）課金/クレジット**を有効化（未設定だと 429 で枯渇）

## 3. 動作チェック
- `/` … 本体（PWA・多言語・鑑定チャット）
- `/lp.html` … ランディング
- `/legal.html` … 特商法・利用規約・プライバシー（テレコムクレジット決済に対応済み）
- `/manifest.webmanifest`, `/sw.js` … PWA（ホーム追加・オフライン起動）
- 更新を確実に配信したいときは `sw.js` の `CACHE` 版番号（`pocket-kantei-v1`）を上げる

## 4. ファイル構成
| ファイル | 役割 |
|---|---|
| `index.html` | アプリ本体（UI・状態・プロンプト・ガード） |
| `pro-bazi.js` / `pro-adapter.js` | 四柱推命エンジン（命式・大運・節木運） |
| `bazi.js` | 補助ロジック |
| `functions/gemini.js` | サーバーレス中継（キー秘匿・レート制限・DEEP→LITEフォールバック） |
| `manifest.webmanifest` / `sw.js` | PWA |
| `icon-*.png` / `apple-touch-icon.png` / `favicon*` | アイコン各種 |
| `owl.png` | Nico（ふくろう）画像 |
| `legal.html` | 法務ページ |
| `netlify.toml` / `_headers` / `package.json` | Netlify 設定 |
| `docs/` | エンジニア向け技術仕様書（サイトには未リンク・参照用） |

## 5. 審査後に実装予定
- テレコムクレジットの **申込フォーム＋継続課金同意画面**（審査通過後に組み込み）
