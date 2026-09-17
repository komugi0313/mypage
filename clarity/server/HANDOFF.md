# エンジニア引き継ぎ書 — Numinous 毎朝の手紙（morning letter）

これを読めばデプロイまで一人で完結できるはずです。設計背景は
`../EMAIL-SYSTEM.md`、運用詳細と Postmark 手順は `README.md` を参照。

## 何が出来ているか（全て検証済み）

- **バックエンド一式**（このディレクトリ・Node 18+・依存3つのみ）
  - 創業者の占術エンジン（`../bazi.js` `../dayfortune.js` `../cycles.js`
    `../geo.js`）を**そのまま require** して1人ずつ手紙を生成
  - `POST /api/subscribe`（double opt-in）→ `GET /confirm` → 毎時バッチ
    `src/send-morning.js`（現地朝5時配信・同日冪等）→ `GET/POST /unsubscribe`
  - CAN-SPAM/Gmail新基準対応: List-Unsubscribe(-Post)・実在住所・苦情前提の
    バウンス処理（Postmark ErrorCode 406 → status=bounced）
- **フロント**: `../app.html` のオンボーディングに申込フォーム実装済み。
  `LETTERS.BASE`（app.html 内の const）にAPIのURLを入れるだけで接続される。
  未設定/障害時は localStorage に保留→次回起動時に自動再送
- **テスト**: `npm run smoke`（依存なしのコア検証）。フォーム→API→DB→配信
  →解除はヘッドレスブラウザで一周検証済み

## デプロイ手順（最短）

1. Node 18+ のホスト（Render / Fly.io / VPS どれでも）に `clarity/` ごと配置
   （サーバーは `../` のエンジンJSと `meishiban_pillars.html` を読むため
   **clarity フォルダ構造を保つこと**）
2. `cd server && npm install && npx playwright install chromium`
   （登録時に完全エンジンをヘッドレス Chromium で回すため必須）
   → `cp .env.example .env` → 値を埋める
   （POSTMARK_TOKEN / BASE_URL / APP_URL / ORG_ADDRESS / CRON_SECRET / DB_PATH）
   → `npm run verify:engine` で命式ロジックの健全性を確認
3. `npm start`（`src/server.js`）を常駐化（systemd / プラットフォームのweb process）
4. **毎時cron**: `0 * * * * node src/send-morning.js`（または
   `POST $BASE_URL/internal/send-due` + `X-Cron-Secret`）
5. DNS: Postmark の DKIM / Return-Path CNAME を追加（README §Postmark）。
   加えて **DMARC** を推奨: `_dmarc TXT "v=DMARC1; p=none; rua=mailto:…"`
6. `../app.html` の `const LETTERS = { BASE: '' }` にAPIのURLを設定して静的サイト再デプロイ
7. 本番前チェック: 自分のメールで subscribe→confirm→`send-morning --hour <今>`
   →受信→unsubscribe の一周

## 注意点・既知の設計判断

- DB は SQLite（`DB_PATH` を**永続ボリューム**に置くこと）。数十万人まで可。
  それ以上は `src/db.js` の差し替えで Postgres 化（SQLは素のまま）
- チャート計算は**登録時に1回だけ**（保存）。毎朝は日運計算のみで軽い
- 送信レートは `SEND_CONCURRENCY`（既定20並列）。Postmark 側のレートに合わせ調整
- `src/ads.js` は将来のスポンサー枠。`ADS_ENABLED=1` にするまで完全に無効
- チャートは既定で**完全エンジン**（`src/engine-full.js` が
  `../meishiban_pillars.html` を Chromium で実行）。強弱・月柱・大運までプロ精度で、
  アプリ表示と一致。エンジンが動かない時は登録が 503 で失敗し、**誤ったチャートは
  保存しない**。`npm run verify:engine` で検証（JDN・日柱の外部アンカー・柱）
- 決済（トライアル/Pro）は**未実装・別系統**。購読状態を持つなら
  `db.setPlan(id, 'pro'|'free'|...)` を IAP/Stripe の Webhook から呼ぶ想定

## Google Cloud へのデプロイ（Chromium あり）

エンジンをヘッドレス Chromium で回すので、**Chromium とその依存ライブラリが入った
実行環境**が必要。同梱の `Dockerfile`（公式 Playwright イメージ）を使えば全部入る。

```bash
cd clarity
docker build -f server/Dockerfile -t clarity-letters .
```

**保存先（DB）の注意 — ここだけ設計判断が要る:**
本システムは登録者を SQLite に保存する。Cloud Run のディスクは**揮発性**（インスタンス
が消えると登録者データも消える）ので、次のいずれかを選ぶ:

- **推奨（最短・SQLite のまま）: GCE VM（Compute Engine）+ 永続ディスク**
  - VM に Docker を入れ上記イメージを実行。`DB_PATH` を永続ディスク上に置く。
  - Chromium もそのまま動く。毎時 cron は VM の crontab か Cloud Scheduler→HTTP。
- **Cloud Run を使う場合: DB を外部化**
  - SQLite は使えない → `src/db.js` を **Cloud SQL(PostgreSQL)** に差し替え（SQLは素の
    ままなので置換は限定的）。メモリは**1GB以上**（Chromium 用）、min-instances=0 可。
  - cron は **Cloud Scheduler → `POST /internal/send-due`（X-Cron-Secret）**。

どちらも動く。**ローンチは GCE VM が一番シンプル**（SQLite・Chromium・cron が素直に載る）。
規模が出たら Cloud Run + Cloud SQL へ移行。

（将来のさらなる軽量化: `meishiban_pillars.html` 内の `window.Bazi` は自己完結した
純JS。エンジニアがこれを**逐語的に**Node モジュールへ切り出せば Chromium 不要にできる。
ただし「絶対間違えない」ため、書き換えではなく**そのまま抽出**すること。まずは
Chromium 方式で問題ない。）

## アプリの読み物AIを内蔵する（APIキーを一切表に出さない）

アプリの「診断・チャット」も鍵をサーバー内蔵にできる。プロキシは実装済み
（`server/src/ai-proxy.js` → `POST /api/reading`・`/api/chat`。クライアントは
プロンプトだけ送り、サーバーが自分の鍵で呼んで `{text}` を返す。鍵もモデル名も
UIに出ない）。本番での有効化:

1. サーバーの `.env` に `GEMINI_API_KEY` を設定（メールのAI仕上げと共用）。
2. `app.html` の `const BACKEND` で `USE_PROXY:true` と
   `PROXY_BASE:'https://<APIサーバーのURL>'` を設定。
3. これで**入力画面の「Reading access key」開発用欄は自動で消え**、読み物は
   サーバー経由になる（鍵はクライアントに一切渡らない）。
4. 超過時はサーバーが 429 を返し、アプリは静かな上限メッセージを表示。

※ 現状デモは開発用のローカル鍵入力（BYOK）。UI/LP/規約からは Gemini 等の
   ベンダー名・API名を既に除去済み（表に出るのは「Reading access key（開発用）」
   のみ）。関数名 `callGemini` 等はコード内部のみで画面には出ない。

## 残タスク（コード外）

- [ ] Postmark アカウント＋ドメイン認証（創業者と共同・README手順）
- [ ] `.env` の ORG_ADDRESS に番地まで入れる（現状: Akasaka 8-chome まで）
- [x] `../privacy.html` に収集項目（メール・任意の属性・同意ログ）と用途を追記済み
- [ ] `../terms.html` / `../privacy.html` の連絡先メール（現状 `support@72k.example` の
      プレースホルダ）を実在アドレスに置換。発効日も確認
- [ ] **準拠法の確認**: `terms.html` は現状「日本法」。米国消費者向け販売なので
      弁護士と要相談（消費者保護法は居住地の強行規定が優先される旨は追記済み）
- [ ] Postmark / 言語処理プロバイダ（AI）と **DPA（データ処理契約）** を締結
- [ ] DMARC レコード追加

補足（実装済みの法的担保）:
- 同意ログ（時刻・IP・同意文言バージョン）を登録時に保存（`db.js` の
  `consent_at/consent_ip/consent_ref`。既存DBは起動時に自動マイグレーション）
- センシティブ属性の本人削除導線 `GET /data` → `POST /data/forget`（全メールのフッター）
