# 16TYPE+ 本番サイトの作り方

1. `python3 build_site.py` を実行すると、`site/` に本番用のファイルができます。
   - `site/index.html`（日本語）、`site/en/`（英語）、`site/ko/`（韓国語）
   - 共通：`site/app.js`、`site/bazi.js`、`site/chars/`（キャラの絵）、`site/img/`（アイコン・OGP画像）
2. `firebase deploy --only hosting` で公開します（`firebase.json` の public は `site`）。

元のファイル
- 画面：`src/head.html`・`src/body.html`・`src/script.js`、英韓の本文は `i18n/body.en.html`・`i18n/body.ko.html`
- 文章：`content/`（日本語）、`i18n/`（英語・韓国語）
- OGP画像：`site_assets/ogp-ja.png` など

## 英語は止めています（2026-11-12 鑑定者本人の決定「英語を止めて、日本語に集中する」）
- 英語のページ（`/en/`）は、2026-11-12 の状態をプログラムごと固めた `frozen/en/`（index.html・data.js・app.js・privacy.html・manifest）をそのまま使います。`build_site.py` は英語を作り直さず、`frozen/en/` を `site/en/` に写すだけです。
- これからの直し・新しい機能は日本語（と韓国語）だけに入れます。`i18n/*.en.*` や `content/*/*.en.json` は直さなくてかまいません（英語のページには反映されません）。
- 英語を再開するときは、`build_site.py` の `for lang in ['ja','ko']` に `'en'` を戻し、`frozen/en/` を写す2行を消してから、英語の訳を今の日本語に合わせ直します。

前のサイト（隠れギャップ診断）は使わなくなったので外しました（2026-11-05）。計算の `bazi.js` は `src/bazi.js` に移しました。

## あとでやること（メモ）
- 開運予報（unkiyoho.jp）側で、16TYPE+ から来た人を別に記録する。
  - 16TYPE+ の案内ボタンは `register.html#y=YYYY&m=MM&d=DD&from=16tp` を開く（utm_source=16typeplus も付く）。
  - 開運予報の register.html にある `if(p.from==="166"){...localStorage.setItem("unkiyoho_from166","1")...}` の横に、`from==="16tp"` 用の行（例：`unkiyoho_from16tp`）を足す。
  - 登録時にその印を送る・数える部分も、1.66 と同じように足す。
- 16TYPE+ の案内ボタンの行き先は、開運予報のLP（`https://unkiyoho.jp/#y=YYYY&m=MM&d=DD&from=16tp`）。
  - 今のLPは「#」のうしろを読まないので、生年月日は引き継がれない。
  - 引き継ぐなら、LP（index.html）にも register.html と同じ「#y=&m=&d= を読んで localStorage の enbiyori_self_birth に入れる」処理を足す。そうすれば、LP→登録ページで生年月日が自動で入る。
