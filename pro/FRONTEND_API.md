# フロント → バックエンド 接続仕様（エンジニア引き継ぎ用）

四柱推命PRO（`pro/`）の**フロントエンドが叩いているAPIの一覧**です。
バックエンド（本番＝Google基盤）を実装する際、**同じパス・同じ入出力**の窓口を用意すれば、
フロントは（原則）無改修でつながります。

- 通信はすべて **JSON の `POST`**（`Content-Type: application/json`）。
- フロントが使うベースパスは **`/.netlify/functions`**（開発名残）。
  本番URLに合わせて、**このパスを転送(rewrite)する**か、`/api` 等へ寄せてフロントのベースだけ差し替える——どちらでも可。すり合わせ1点。
- 現状フロントは多くの画面が **`STUB=true`（ネットワークを叩かず画面だけ再現）** です。接続時に `STUB=false` に。
- 会員制ゲートは `app-pro.html` の **`PREVIEW_MODE`** で制御（下記フラグ表）。

---

## エンドポイント一覧

| 用途 | メソッド | パス | 叩く画面 | 現状 |
|---|---|---|---|---|
| AI鑑定（Gemini中継） | POST | `/.netlify/functions/gemini` | app-pro / meishi-sheet | **LIVE**（実装済み） |
| 会員登録 | POST | `/.netlify/functions/auth-register` | auth.html | STUB |
| ログイン | POST | `/.netlify/functions/auth-login` | auth.html / app-pro | STUB / 一部LIVE呼び出し |
| メール確認 | POST | `/.netlify/functions/auth-verify` | auth.html | STUB |
| パスワード再設定 | POST | `/.netlify/functions/auth-reset` | auth.html | STUB |
| 契約状況の取得 | POST | `/.netlify/functions/check-subscription` | mypage-pro | STUB |
| 解約 | POST | `/.netlify/functions/cancel-subscription` | mypage-pro | STUB |
| 顧客カルテ 取得 | POST | `/.netlify/functions/mypage-get` | app-pro | 呼び出し有・要実装 |
| 顧客カルテ 保存 | POST | `/.netlify/functions/mypage-put` | app-pro | 呼び出し有・要実装 |

> **AI鑑定（gemini）のみ実装済み**。ほかはフロントの呼び出し口だけあり、バックエンドは本番側で用意します。

---

## 1. AI鑑定（Gemini中継）　`POST /.netlify/functions/gemini`

サーバーがAPIキーを保持してGoogle Gemini を呼ぶ中継。**キーはブラウザに出しません**（実装済み `pro/functions/gemini.js`）。

**リクエスト**
- ヘッダ：`Content-Type: application/json`／自動鑑定レポート（重い生成）のときのみ `x-pk-deep: 1`
- ボディ（Gemini `generateContent` 形式そのまま）：
```json
{
  "system_instruction": { "parts": [{ "text": "システム指示" }] },
  "contents": [{ "role": "user", "parts": [{ "text": "命式などの入力" }] }],
  "generationConfig": { "maxOutputTokens": 2048, "thinkingConfig": { "thinkingBudget": 0 } }
}
```

**レスポンス（成功＝Geminiの標準形）**
```json
{ "candidates": [ { "content": { "parts": [ { "text": "鑑定の文章" } ] } } ] }
```
フロントは `candidates[0].content.parts[].text` を連結して表示。

**レスポンス（失敗）** … `{"error":{"code":"...","message":"..."}}` や空応答。
フロントは失敗時 **数秒後に自動で1回だけ再試行 → それでも駄目なら端末内「オフライン鑑定」に自動フォールバック**（ユーザーは打ち直し不要）。

**サーバー側の既存挙動（`gemini.js`）**：オリジン許可（`process.env.URL` と不一致は403）、1日上限（端末/IP：`PK_MAX_DEVICE_DAY`/`PK_MAX_IP_DAY`）、入力上限 `MAX_BODY=40000`、原価計測。
環境変数：`GEMINI_API_KEY` / `GEMINI_MODEL`(既定 gemini-2.5-flash) / `GEMINI_MODEL_DEEP` / `PK_PRICE_IN` `PK_PRICE_OUT` `PK_PRICE_CACHE` / `PK_FX_JPY` / `PK_MAX_DEVICE_DAY` `PK_MAX_IP_DAY` / `PK_OWNER_TOKEN` / `URL`（本番はサイトURLを明示設定）。

---

## 2. 認証（auth.html）　ベース `/.netlify/functions`

| パス | リクエスト | レスポンス | 備考 |
|---|---|---|---|
| `/auth-register` | `{email, password}` | `{ok:true}` | 登録＋確認メール送信 |
| `/auth-login` | `{email, password}` | `{ok:true, status, email}` ／ `{ok:false, error}` | ログイン |
| `/auth-verify` | `{token}` | `{ok:true, email}` | 確認メールのリンク検証（登録有効化） |
| `/auth-reset` | `{email}` | `{ok:true}` | パスワード再設定メール |

> セキュリティ推奨：ログイン成功時は**長期セッショントークン（例 `member_token`）**を発行し、フロントはパスワードではなくそれを保持する方式が望ましい。

---

## 3. 会員・契約（mypage-pro.html）　ベース `/.netlify/functions`

| パス | リクエスト | レスポンス |
|---|---|---|
| `/check-subscription` | `{email}` | `{status, plan, cardLast4, nextChargeAt}` |
| `/cancel-subscription` | `{email}` | `{ok:true}`（次回更新分から停止） |

- `status`：`active` / `trialing` / `past_due` / `canceled` / `unpaid` / `none`
- `plan`：`month`（月額9,800円）/ `year`（年間98,000円）/ `half`（半年52,800円）
- `cardLast4`：カード下4桁（表示用）／`nextChargeAt`：次回課金日（表示用文字列）

---

## 4. 顧客カルテ 同期（app-pro.html）　ベース `/.netlify/functions`

鑑定者ごとに顧客カルテ（`clients[]`）をクラウド保存。**ログイン中（`member_email`あり）のみ**同期し、未ログイン/失敗時は端末内保存にフォールバック。

**保存 `/mypage-put`**
- リクエスト：`{email, data}` … `data` は下記ドキュメント
- レスポンス：`{data}`（サーバー側マージ後の最新を返すとフロントが取り込む）

**取得 `/mypage-get`**
- リクエスト：`{email}`
- レスポンス：`{data}` … 下記ドキュメント（フロントはローカルとマージ）

**data（顧客カルテ ドキュメント）**
```json
{
  "schema": 1,
  "updatedAt": 0,
  "clients": [
    { "id": "…", "name": "…", "date": "YYYY-MM-DD", "time": "HH:MM",
      "sex": "female|male", "memo": "…", "readings": [],
      "ts": 1690000000000, "deleted": false }
  ]
}
```
> マージ規約：`clients[].id` をキーに、`ts`（更新時刻）が新しい方を採用。`deleted:true` は論理削除。

---

## 5. 決済（テレコムクレジット）　pricing-pro.html

- 申込フォームで **`member_email` と `selected_plan`（month/year/half）を localStorage に保存** → **`TELECOM_PAYMENT_URL[plan]`（決済ページ）へ遷移**。
- `pro/pricing-pro.html` の `var TELECOM_PAYMENT_URL={month:'',year:'',half:''}` に、**審査後に発行される各プランの決済URL**を設定（未設定時は「準備中」表示で有料へ進ませない安全設計）。
- 決済成功後の流れ（バックエンド）：**決済代行のWebhook等で会員を有効化** → 以後 `/check-subscription` が `active`（無料期間中は `trialing`）を返す。返金/解約ポリシーは pricing に明記済み。

### 5-2. 無料トライアル（1週間）ライフサイクル ★確定仕様

商品・文言・画面遷移は確定済み。バックエンドは以下の状態遷移を実装する。

- **期間**：登録（＝カード登録完了）から**7日間 無料**。カード登録は**申込時に必須**（登録後すぐ利用開始）。
- **状態**：作成時 `trialing` → 7日経過後の初回課金成功で `active`（失敗で `past_due`/`unpaid`）。
- **無料期間中の解約**：即 `canceled`・**課金0円**（日割り/返金なし）。
- **通知**：無料期間**終了の前日にメール**でお知らせ（初回課金の事前告知）。
- **課金**：終了後にプラン周期（`month`/`year`/`half`）で初回課金 → 以後自動更新。
- **返金**：決済済み期間の途中解約は返金・日割り**不可**（無料期間中を除く）。
- **利用範囲**：トライアル中も鑑定**回数無制限**（`active` と同等の解錠）。

**動線**：`index.html` →「一週間無料ではじめる」→ `pricing-pro.html`（プラン＋メール→ `member_email`/`selected_plan` 保存→ テレコムクレジット決済ページ）→ 決済/カード登録完了で会員を `trialing` 有効化 → `app-pro.html` の会員ゲートが `/check-subscription` の `trialing`/`active` を見て解錠。解約・状況確認は `mypage-pro.html`。

> フロントは `trialing` と `active` を**同じ「解錠」扱い**にします（`app-pro.html` / `auth.html`）。
> バックエンドは「trial終了日」を保持し、前日メール・初回課金・失敗時の状態変化を担当。

---

## 6. 本番切替フラグ（フロント側／エンジニアが false 等へ）

| 場所 | フラグ | 現状 | 本番 |
|---|---|---|---|
| `app-pro.html` | `PREVIEW_MODE` | `true`（ログイン不要で全開放） | `false`（会員ゲート有効） |
| `auth.html` | `CONFIG.STUB` | `true` | `false` |
| `mypage-pro.html` | `CONFIG.STUB` | `true` | `false` |
| `meishi-sheet.html` | `CLOUD.STUB` | `true` | `false`（app の mypage-get/put と揃える） |

**フロントが使う localStorage キー**：`member_email`／（推奨）`member_token`／`selected_plan`／`card_last4`。

---

## 7. 補足（開発ルール：フロント側の不変条件）

- 計算エンジン（`pklove.js`／`window.Bazi`／`computeChart`／`computeMeishiki`）は**改変しない**（表示・アダプタ層のみ）。
- `pro/meishi-sheet.html` は `meishiki-original/meishi-sheet.html` に**バイト単位でミラー**。
- フロント変更のたびに `pro/sw.js` の `CACHE` バージョンを +1。
- 鑑定文にアスタリスクを出さない／サイト内で「AI」の語を使わない（例外＝日運・月運の詳細鑑定ボタンのみ）。

> この資料は `pro/` のコードから抽出した現状の呼び出し仕様です。実装が変われば追随して更新してください。
