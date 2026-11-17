# ワンソナ 会員まわりのメール（エンジニアの方へ）

会員登録・ログインで送るメールのひな形です。サイトには公開しません。
どのメールにも、見た目つき（`.html`）と文字だけ（`.txt`）の2つがあります。両方を1通に入れて送ってください（multipart/alternative）。

| ファイル | 件名 | いつ送るか | ボタンのURL |
|---|---|---|---|
| `verify` | メールアドレスの確認 | 会員登録したとき・「もう一度送る」 | `https://44wansona.com/?acct=verify&code=XXXX`（24時間） |
| `change-email` | 新しいメールアドレスの確認 | メールアドレスを変えるとき（新しいアドレスへ） | `https://44wansona.com/?acct=verify&code=XXXX`（24時間） |
| `reset-password` | パスワードを作り直す | 「パスワードを忘れた方」 | `https://44wansona.com/?acct=reset&code=XXXX`（1時間） |
| `email-changed` | メールアドレスが変わりました | メールアドレスが切りかわったとき（前のアドレスへ） | なし |
| `newsletter` | （配信ごとに決める） | お知らせメール（受け取ると選んだ人だけ） | 配信ごとに決める |

## 置きかえる印

| 印 | 中身 |
|---|---|
| `{{ACTION_URL}}` | 上の表のボタンのURL（code は1回だけ使えるもの） |
| `{{NEW_EMAIL}}` | 新しいメールアドレス（`email-changed` だけ） |
| `{{OPERATOR}}` | 運営者の名前（プライバシーポリシーと同じもの） |
| `{{CONTACT}}` | 問い合わせ先のメールアドレス |
| `{{UNSUBSCRIBE_URL}}` | 配信を止めるリンク（`newsletter` だけ。押すだけで止まるもの） |
| `{{SUBJECT}}`・`{{PREHEADER}}`・`{{TITLE}}`・`{{BODY}}`・`{{BUTTON_LABEL}}`・`{{BUTTON_URL}}` | お知らせメールの中身（`newsletter` だけ） |

印の中身を入れるときは、HTML の特殊な文字（`<` `>` `&` `"`）を必ずエスケープしてください。

## 送り方の決まり

- 差出人の名前は「ワンソナ」。
- 迷惑メールに入らないよう、送るドメインの SPF・DKIM・DMARC を設定してください。
- `email-changed` は「このメールに返信してください」と書いてあるので、返信を受け取れる差出人にしてください。
- お知らせメール（`newsletter`）は、受け取ると選んだ人だけに送り、配信を止めるリンクを必ず入れてください（特定電子メール法）。運営者の名前と問い合わせ先も必ず入れます。
- ロゴは `https://44wansona.com/icon/favicon-96.png` を読んでいます（サイトに公開ずみ）。

## 文を直すとき

`dog-shindan/tools/build_mail.py` の中の文を直して、`python3 dog-shindan/tools/build_mail.py` を実行すると、このフォルダのファイルが作り直されます。
