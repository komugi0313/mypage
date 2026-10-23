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

## あとでやること（メモ）
- 開運予報（unkiyoho.jp）側で、16TYPE+ から来た人を別に記録する。
  - 16TYPE+ の案内ボタンは `register.html#y=YYYY&m=MM&d=DD&from=16tp` を開く（utm_source=16typeplus も付く）。
  - 開運予報の register.html にある `if(p.from==="166"){...localStorage.setItem("unkiyoho_from166","1")...}` の横に、`from==="16tp"` 用の行（例：`unkiyoho_from16tp`）を足す。
  - 登録時にその印を送る・数える部分も、1.66 と同じように足す。
