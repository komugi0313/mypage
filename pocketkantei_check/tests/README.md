# 検証スクリプト（2026-09-25）

Pocket鑑定の修正（大運・立運・節入り、アカウント、パスワード再設定、LP振り分け）の検証に使ったスクリプトです。

## 準備
1. このフォルダに `fx/` という名前で、`pocketkantei_final_fixed.zip` を展開します（`tests/fx/index.html` になるように）。
2. `npm i playwright` を実行し、`npx playwright install chromium` でブラウザを入れます。
3. `@netlify/blobs` の代わりに、メモリ上で動く仮の保存領域（`mock/`）を使います。実行時は `NODE_PATH=mock/node_modules` を付けてください。

## スクリプト
| ファイル | 内容 | 実行例 |
|---|---|---|
| `chk1.js` | 大運の一括チェック1万件（1番目＝月柱・期間／2番目＝月柱±1・立運から／10年ごと） | `node chk1.js` |
| `authtest.js` | アカウントAPIの単体テスト（登録〜削除・ロック・偽造トークン・Origin） | `NODE_PATH=mock/node_modules node authtest.js` |
| `e2e.js` | 画面の通しテスト（2台の端末：登録→別端末ログイン→ログアウト→削除） | `NODE_PATH=mock/node_modules node e2e.js` |
| `e2e_reset.js` | パスワード再設定の通しテスト（Resendへの送信は仮のものに差し替え） | `NODE_PATH=mock/node_modules node e2e_reset.js` |
| `lpflow.js` | 未登録時のLP振り分け | `node lpflow.js` |
| `eye.js` | パスワード表示ボタン | `node eye.js` |

※本番の Netlify（実際の Blobs・Resend）での確認は含みません。デプロイ後に実機で「登録→別端末でログイン」「パスワードを忘れた→メール→再設定」を確認してください。
