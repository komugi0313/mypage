# 16TYPE+ 本番サイトの作り方

1. `python3 build_site.py` を実行すると、`site/` に本番用のファイルができます。
   - `site/index.html`（日本語）、`site/en/`（英語）、`site/ko/`（韓国語）
   - 共通：`site/app.js`、`site/bazi.js`、`site/chars/`（キャラの絵）、`site/img/`（アイコン・OGP画像）
2. `firebase deploy --only hosting` で公開します（`firebase.json` の public は `site`）。

元のファイル
- 画面：`src/head.html`・`src/body.html`・`src/script.js`、英韓の本文は `i18n/body.en.html`・`i18n/body.ko.html`
- 文章：`content/`（日本語）、`i18n/`（英語・韓国語）
- OGP画像：`site_assets/ogp-ja.png` など

前のサイト（隠れギャップ診断）は `kakure-shindan/` にそのまま残っています。
