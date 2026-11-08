# 16TYPE+ 見本のソース

- `head.html`（見た目）・`body.html`（日本語の画面）・`script.js`（動き）・`budoux-inline.js`（日本語の文節改行）
- `data.json`・`quiz.json`（60問）は日本語の元データ。文章は `../content/`、翻訳は `../i18n/`。
- 組み立て：`../i18n/build_preview.py` を、このフォルダの中身と一緒に置いて実行すると、3言語入りの見本（`kakure-redesign.html`）ができる。見本では URL の最後に `#en` `#ko` を付けると英語・韓国語になる。
- 多言語のしくみ：画面の日本語は `TR("日本語")` で書いてあり、`../i18n/ui.en.json` などの辞書で置き換わる。
