# 認証API 参考実装（server/）

「私だけの運気予報」のパスワードレス・ログイン（メール確認コード）のサーバー側**参考実装**です。
仕様の正本は `../docs/認証設計_引き継ぎ.md`。この `server/` は「動く仕様書」で、そのまま本番に載せる想定ではありません（Google環境向けに Store/Mailer を差し替えて使ってください）。

## そのまま動かす（動作確認）

```bash
node server/index.js
# → http://localhost:8787 で起動（ストア=インメモリ / メール=コンソール出力）
```

フロント側（別ターミナル）：

```bash
# アプリのルート（register.html などがある場所）で
python3 -m http.server 8000
# → http://localhost:8000/login.html
```

`login.html` / `register.html` / `mypage.html` の設定行を、開発モード（空）から参考サーバーに向けると、実際のAPI経由で動作確認できます：

```html
<script>window.UNKIYOHO_AUTH_API_BASE = "http://localhost:8787";</script>
```

コードはメールの代わりに**サーバーのコンソール**に表示されます。

> 注意：`CORS_ORIGIN` は既定で `http://localhost:8000`。フロントを別ポートで配信する場合は
> `CORS_ORIGIN=http://localhost:xxxx node server/index.js` のように合わせてください。

## エンドポイント

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/auth/request-code` | 確認コードをメール送信 |
| POST | `/auth/verify-code` | 検証してセッション発行（Cookie） |
| POST | `/auth/logout` | セッション破棄 |
| GET | `/auth/session` | ログイン状態 |

詳細な入出力・エラーコードは `../docs/認証設計_引き継ぎ.md` §4。

## 本番（Google環境）への移植ポイント

`index.js` 内の2つのアダプタを差し替えます。

1. **Store**：`memoryStore()` → Firestore 実装へ。
   - `users` / `otp`（TTL自動削除）/ `sessions` / レート制限。
2. **Mailer**：`consoleMailer()` → Resend / SendGrid / Amazon SES へ（`index.js` に Resend 例をコメントで記載）。
   - 送信元 `unkiyoho.jp` の **SPF / DKIM / DMARC** を必ず設定。
3. **実行環境**：Cloud Run（推奨）/ Cloud Functions 等。`PORT` は環境変数から取得済み。
4. **秘密情報**：`OTP_PEPPER` を本番の秘密値に（Secret Manager 等）。`NODE_ENV=production` で Cookie を `Secure` に。
5. **CORS**：`CORS_ORIGIN` を本番フロントのオリジンに（`*` 不可・Cookie利用のため）。同一オリジン配信ならCORS不要。

## セキュリティ（必ず守る）

- マイページの**会員データAPIは、必ず Cookie セッションを検証**してから返す（フロントの判定を信用しない）。
- OTPはハッシュ化保存・10分・5回・使い捨て・再送クールダウン・レート制限。
- Cookie は HttpOnly / Secure / SameSite=Lax。
- メール存在有無を漏らさない（列挙対策）。同意日時・解約記録は消さない。
