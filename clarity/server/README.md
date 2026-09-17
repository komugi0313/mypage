# Numinous Letters — 毎朝の手紙 バックエンド

無料の「morning letter」を、**創業者自身の四柱推命エンジン**（`../bazi.js` /
`../dayfortune.js` / `../cycles.js` / `../geo.js` をそのまま `require`）で
1人ずつ生成して届けるサーバー。認知獲得チャネルであり、将来はスポンサー枠で
広告収入化する（§Ads）。

```
signup (double opt-in)          毎時 cron
┌─────────────┐  confirm  ┌──────────────────────────┐
│POST /api/subscribe│──────▶│send-morning.js / send-due │
│ chart を1回計算・保存 │        │ 現地時刻が send_hour の人だけ│
└─────────────┘        │ 保存済みchart×今日→手紙→送信│
                              └──────────────────────────┘
```

## 動かす

```bash
cd clarity/server
npm install
cp .env.example .env   # 値を埋める（最低: ORG_ADDRESS, POSTMARK_TOKEN, CRON_SECRET）
npm run smoke          # 依存なしでコア検証（エンジン→手紙）
npm start              # API 起動
```

ローカル開発は `.env` で `MAIL_PROVIDER=console`（送信せずログに出す）。

## Cron（毎時0分）

タイムゾーン差は「毎時実行＋各人の現地時刻チェック」で吸収する。1本でよい:

```cron
0 * * * * cd /path/to/clarity/server && node src/send-morning.js >> send.log 2>&1
```

または HTTP 派（Render/Fly のスケジューラ等）:
`POST $BASE_URL/internal/send-due` + ヘッダ `X-Cron-Secret: $CRON_SECRET`

同じ日に2回走っても `last_sent_on` で**二重送信しない**（検証済み）。

## API

| Route | 説明 |
|---|---|
| `POST /api/subscribe` | 登録。`{email, consent:true, birthDate, birthTime?, sex?, lon?, off?, dst?, place?, nickname?, gender?, role?, countryOfOrigin?, timezone, sendHour?}`。チャートをこの時点で1回計算して保存し、確認メールを送る |
| `GET /confirm?t=` | double opt-in 確定 → active（翌朝から配信） |
| `GET/POST /unsubscribe?t=` | 1タップ解除（Gmail等のネイティブ one-click にも対応） |
| `GET /data?t=` | 本人が任意プロフィール（ニックネーム・性別・属性・出身国）を確認する画面。全メールのフッターにリンク |
| `POST /data/forget` | 上記の任意プロフィールだけを本人が削除（CPRA「センシティブ情報の利用制限/削除」）。誕生情報は残す＝配信は継続 |
| `POST /internal/send-due` | cron 用（要 `X-Cron-Secret`） |

## 法令（米国 CAN-SPAM）— 実装済みの担保

- 全通に unsubscribe リンク＋ `List-Unsubscribe(-Post)` ヘッダ（1クリック解除）
- 全通に実在住所（`ORG_ADDRESS` — **実住所を必ず設定**。空だと警告文が出る仕様）
- 件名は誠実（ランク連動・釣りなし）、差出人明記
- double opt-in（確認するまで1通も送らない）
- 解除は即時反映（10日以内どころか同リクエスト内）
- **同意ログ**: 登録時に同意の時刻・送信元IP・同意文言のバージョン（`consent_ref`）を
  DBに保存（`subscriber.consent_at/consent_ip/consent_ref`）。GDPR/APPI/CAN-SPAM の
  「同意があった」証明。逆プロキシ下でも実IPを取るため `trust proxy` を有効化済み
- **センシティブ情報の利用制限（CPRA）**: 任意プロフィール（性別・出身国等）は本人が
  `GET /data` → `POST /data/forget` で自己削除できる（全メールのフッターにリンク）

残タスク: プライバシーポリシー（`../privacy.html`）に「収集項目・用途・第三者
提供」の追記、および Postmark のドメイン認証（DKIM/Return-Path）。

## Postmark セットアップ（創業者がやる手順・約30分）

アカウント作成だけは本人しかできません。順にやれば実配信できます:

1. **アカウント作成** — https://postmarkapp.com → Sign up（無料枠 月100通。
   審査で用途を聞かれたら "personalized daily briefing emails our users
   explicitly opt into (double opt-in), with one-click unsubscribe" と書く）
2. **Sender Signature / ドメイン認証** — Settings → Domains で
   送信ドメイン（例 `numinous.app`）を追加 → 表示される **DKIM** と
   **Return-Path** の DNS レコード（CNAME/TXT）をドメインのDNSに追加 → Verify。
   ここが到達率の生命線。認証が緑になるまで実配信しない
3. **Message Stream** — デフォルトで `broadcasts`（一斉送信用）がある。
   Streams → Broadcast の **ID**（通常 `broadcast`）を控える。
   確認メール等のトランザクションは `outbound` のままでよい
4. **Server API Token** — Servers → (your server) → API Tokens をコピー
5. `.env` に設定:
   ```
   POSTMARK_TOKEN=（4のトークン）
   POSTMARK_STREAM=broadcast
   FROM_EMAIL=letters@（2で認証したドメイン）
   ORG_ADDRESS=72k Inc., Akasaka 8-chome, Minato-ku, Tokyo, Japan  ← 番地まで追記推奨
   CRON_SECRET=（ランダム文字列: openssl rand -hex 24）
   ```
6. **テスト** — `MAIL_PROVIDER=console` を外し、自分のメールで
   subscribe → confirm → `node src/send-morning.js --hour <今の時刻>` で
   1通目が届くこと・unsubscribe が効くことを確認

## Ads（50万人構想の収益化）

`src/ads.js` がスポンサー枠。`ADS_ENABLED=1` にして CAMPAIGNS を入れるまで
**一切表示されない**。表示は1通につき1枠・控えめ固定。リストが育つまでは
オフのまま（到達率と信頼が資産）。

## スケール目安

- SQLite + 毎時バッチで **数十万人まで**現実的（送信ボトルネックはESP側のレート）。
  50万人規模になったら: DB を Postgres に（`src/db.js` の差し替えのみ）、送信を
  キュー化（ESPのバッチAPI）、`SEND_CONCURRENCY` 調整。
- チャートは**登録時に1回だけ**計算して保存 → 毎朝は軽い日運計算のみ（1人 <1ms）。

## 命式エンジン（既定 = 完全エンジン・full）

登録時のチャートは **創業者の実エンジン `../meishiban_pillars.html` をヘッドレス
Chromium（Playwright）で実行**して算出する（`CHART_ENGINE=full` 既定）。強弱
（身強/身弱/中和）・月柱の節入り・大運まで**プロ精度**。用神は正確な強弱から導出
（アプリと同一方式）。`bazi.js` の簡易ロジックは使わない。

- **本番要件**: サーバーに Chromium が必要。`npm install` 後、Playwright のブラウザを
  入れる（`npx playwright install chromium`）。この環境のように既に Chromium がある
  場合は `PLAYWRIGHT_CHROMIUM=<実行ファイルのパス>` を指定してもよい。
- **絶対に間違えない設計**: エンジンが動かない時は `/api/subscribe` が 503 を返し、
  **ヒューリスティックなチャートは保存しない**（ユーザーは少し後に再試行）。
- **負荷**: エンジンは**登録時に1回だけ**（約1.5秒）。毎朝の配信はキャッシュ済み
  チャートを使うのでブラウザは不要。
- **検証**: `npm run verify:engine`（JDN・日柱の外部アンカー＋6000件連続性・
  完全エンジンの柱を照合）。`CHART_ENGINE=heuristic` で完全オフにもできる（非推奨）。

## 精度メモ

チャートは `bazi.js`（app.html のエンジン・フォールバックと同じ経路）で計算。
（上記のとおり既定で完全エンジンを使用。`src/engine-full.js` が実装。）

## AI coach polish (optional · off by default)

`LETTER_AI=1` + `GEMINI_API_KEY` turns on an LLM pass that rephrases the
engine's computed facts into warmer, more varied coaching prose. It stays
faithful by design: the model is given ONLY the values DayFortune computed
and is forbidden to add facts; the legal footer, links, color and food are
never sent to the model and are appended by letter code, so compliance can't
be broken. Any error/timeout → automatic fallback to the deterministic letter,
so a Gemini outage never stops the morning send.

- Model: `GEMINI_MODEL` (default `gemini-2.5-flash`; thinking disabled so the
  JSON isn't truncated).
- Cost control: output is cached by *situation* (rank, theme, element, energy,
  flags, color, food, day-master, date) — not by person. Thousands of readers
  who share today's situation cost ONE generation, so the bill stays sublinear
  as the list grows. Swap the in-process cache in `src/coach-ai.js` for Redis
  when you run more than one instance.
- Recommendation: launch on the deterministic letter (free, reliable, already
  365-day unique). A/B the AI polish later if you want richer language.

SECURITY: never commit a real key. Put it in `.env` (gitignored). If a key is
ever pasted into a chat/log/PR, rotate it and add HTTP-referrer/API
restrictions in Google Cloud console.
