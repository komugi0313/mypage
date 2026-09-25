# バックエンド実装方針（テレコムクレジット決済・会員・同期）

四柱推命ツール（経験者版 `pro/`）の**フロントは完成済み**で、すべて **STUB=true / PREVIEW_MODE=true** の状態で単体動作します。
バックエンド（Netlify Functions 想定）を用意し、各フラグを本番値に切り替えると会員制・決済・クラウド同期が有効になります。

> 前提：認証はメールアドレス＋パスワード。決済はテレコムクレジット（クレジットカード／**審査通過済み**）。
> 命式・鑑定の計算エンジンには一切触れないでください（表示・データ層のみ）。

---

## 1. 実装するエンドポイント一覧（すべて `POST` / JSON）

ベースパス：`/.netlify/functions`

**認証方式＝メールアドレス＋パスワード**（マジックリンクは廃止）。登録時のみ確認メールでメールアドレスを検証します。

| # | エンドポイント | 入力 | 返り値 | 用途 | 呼び出し元 |
|---|---|---|---|---|---|
| 1 | `/auth-register` | `{email, password}` | `{ok:true}` | 新規登録＋確認メール送信 | `auth.html`（CONFIG.REGISTER） |
| 2 | `/auth-login` | `{email, password}` | `{ok:true, status, email}` ／ 認証失敗は `401` か `{ok:false}` | ログイン（契約状況も一緒に返す） | `app-pro.html`（会員ゲート）／`auth.html`（CONFIG.LOGIN） |
| 3 | `/auth-verify` | `{token}` | `{ok:true, email}` | 確認メールのリンク検証（登録の有効化） | `auth.html`（CONFIG.VERIFY） |
| 4 | `/auth-reset` | `{email}` | `{ok:true}` | パスワード再設定メールの送信 | `auth.html`（CONFIG.RESET） |
| 5 | `/check-subscription` | `{email}` | `{status, plan, cardLast4, nextChargeAt}` | 契約状況の取得（マイページ表示用） | `mypage-pro.html`（CONFIG.STATUS） |
| 6 | `/cancel-subscription` | `{email}` | `{ok:true}` | 解約（次回更新分から停止） | `mypage-pro.html`（CONFIG.CANCEL） |
| 7 | `/mypage-get` | `{email}` | `{data:{...}}` | クラウド保存の読み込み（鑑定者・鑑定・設定） | `app-pro.html`（L4618）／`meishi-sheet.html`（CLOUD.PULL） |
| 8 | `/mypage-put` | `{email, data}` | `{ok:true}` | クラウド保存の書き込み | `app-pro.html`（L4609）／`meishi-sheet.html`（CLOUD.PUSH） |
| 9 | `/gemini` | Gemini 形式のJSON | Gemini応答 | 詳細鑑定（AI本文生成）。**実装済み・鍵はサーバ保持** | `app-pro.html`／`meishi-sheet.html` |
| 10 | `/auth-reset-confirm` | `{token, password}` | `{ok:true}` | パスワード再設定の確定（新パスワード保存）※着地ビューは要追加（§3参照） | `auth.html`（`?view=newpw&token=…`） |
| 11 | `/telecom-webhook` | テレコムクレジットの通知 | `200` | 決済成功／継続課金／失敗・解約 を会員 `status` に反映（§2参照） | テレコムクレジット（サーバ間） |

> パスワードはサーバー側で**必ずハッシュ化**して保存（bcrypt/argon2 等）。`/auth-login` は契約状況（`status`）も返し、`active`/`trialing` のときだけツールを解放します。

`status` の想定値：`active`（課金中）／`trialing`（無料トライアル中）／`past_due`／`canceled`／`unpaid`／`none`。
`plan` の想定キー：`month`（9,800円/月）／`year`（98,000円/年）／`half`（52,800円/半年）。

---

## 2. 決済フロー（テレコムクレジット）※**審査通過済み — 導入可**

```
pricing-pro.html（料金プラン＋メール＋パスワードで登録）
   └─ /auth-register {email,password}（会員仮登録・パスワードはハッシュ保存）
        └─ テレコムクレジットの決済ページへ遷移（プラン別 決済URL＋email等のパラメータ）
             └─ カード決済成功 → テレコムクレジットの Webhook 受信
                  └─ /telecom-webhook（要実装）→ 該当emailの会員を trial 開始で有効化
                       └─ /auth-login {email,password} → status=trialing/active → app-pro.html 解放
```

**テレコムクレジット導入の残タスク（審査通過後にやること）**

1. **決済URLの設定**：`pricing-pro.html` の `TELECOM_PAYMENT_URL = { month:'', year:'', half:'' }`（**L266付近**）に、発行された**プラン別の決済URL**（加盟店ID・金額・周期などのパラメータ付き）を入れる。3プラン分。
   - フォーム送信時、選択プランの URL があれば `location.href` で決済ページへ遷移する実装は**既に入っています**（L268付近）。URL を入れるだけで導線が有効化。
2. **決済成功 Webhook の実装**：テレコムクレジットの通知（決済成功／継続課金成功／失敗・解約）を受ける `/telecom-webhook` を Netlify Functions で用意し、`status`（`trialing`/`active`/`past_due`/`canceled`/`unpaid`）を会員レコードへ反映。
3. **会員との突き合わせ**：決済時に渡した email（またはテレコム側の取引ID）で会員レコードを特定。`/auth-login` と `/check-subscription` が同じ `status` を返すようにする。
4. **環境変数**：加盟店ID・API/Web hook 署名シークレット等はコードに書かず **Netlify の環境変数**へ（`GEMINI_API_KEY` と同じ運用）。
5. **無料トライアル一週間**：初回は `trialing`。期間中の解約は費用0円（UIは実装済み）。トライアル終了時の初回課金・失敗時の `past_due`/`unpaid` 遷移をWebhookで反映。

- **決済ページ導線**：`pricing-pro.html` に決済ボタン・プラン選択・確認画面は実装済み（現在は公開前プレビュー導線 `#preview-cta`／L125 が併設。本番時に削除）。
- **会員判定**：`app-pro.html` の会員ゲート（L481 `PREVIEW_MODE`／L493 `/auth-login`）が契約状況で解放。`active`/`trialing` で解放、それ以外は料金プランへ誘導。

---

## 3. 認証（メールアドレス＋パスワード）

`auth.html` に画面（ログイン／新規登録／確認メール送信完了／リンク着地検証／パスワード再設定）が実装済み。`app-pro.html` の会員ゲートも email＋password ログインに更新済み。

- **新規登録**：`/auth-register {email,password}` → 確認メール送信。リンクは **`auth.html?token=XXXX`** の形で発行。
  - メールが届かない＝メールアドレスの打ち間違いの可能性。UIは「登録し直し」導線を用意済み（`auth.html` v-sent）。
- **確認リンク着地**：`/auth-verify {token}` → 登録を有効化。以後ログイン可能。
- **ログイン**：`/auth-login {email,password}` → `{ok, status}`。`active`/`trialing` で解放、それ以外は料金プランへ誘導、認証失敗はエラー表示。
- **パスワード再設定（フロントの流れ）**：ログイン画面「パスワードを忘れた方」→ 再設定画面でメール入力 → `/auth-reset {email}` → 「メールのリンクから新しいパスワードを設定してください」と案内（画面・導線は実装済み）。
  - **★要実装の抜け（着地）**：再設定メールのリンクから「新しいパスワードを入力して確定」する着地画面と窓口が未実装です。現状 `auth.html?token=…` は**登録確認 `/auth-verify` に流れる**ため、再設定用は別扱いにしてください。推奨：
    - リンクを `auth.html?view=newpw&token=XXXX` の形で発行。
    - `auth.html` に「新パスワード入力」ビューを追加（`view=newpw` かつ `token` あり で表示）。
    - 窓口 `POST /auth-reset-confirm {token, password}` → `{ok:true}`（トークン検証＋新パスワードをハッシュ保存）。
  - 登録確認トークン（`/auth-verify`）と再設定トークンは**別種**として扱う（用途を取り違えない）。

### 「パスワードをこの端末に保存」
- チェックONで、次回からメール＋パスワードを自動入力（会員ゲートは自動ログインも実施）。
- 現状フロントは `member_email` / `member_pw` / `member_remember` を localStorage に保存。
- **★セキュリティ推奨**：本番は“パスワードそのもの”ではなく、サーバー発行の**長期セッショントークン**（例：`member_token`、HttpOnly Cookie か localStorage）を保存する方式へ差し替えてください。`auth.html` / `app-pro.html` の `rememberSave()` に切替ポイントのコメントあり。

---

## 4. クラウド保存（マルチ端末同期）

いまは端末内（localStorage）のみ。`/mypage-get` `/mypage-put` を実装すると、ログイン中は別端末でも同じデータを呼び出せます。

**同期対象（localStorage キー）**

| キー | 内容 | 保存元 |
|---|---|---|
| `bazi_mypage_v2` | 鑑定者・メモ・保存した鑑定文（アプリ内「保存・メモ」全体JSON） | `app-pro.html` |
| `meishiki_saved_v1` | 鑑定書（命式表つき）の「保存済み」人物リスト | `meishi-sheet.html` |
| `meishiki_output_default_v1` | 「わたしの既定」＝鑑定書の出力設定（紙・版・モチーフ・五行カラー・命式表の型・章） | `meishi-sheet.html` |
| `member_email` | ログイン中のメール（同期キー） | 共通 |
| `member_pw` | 「端末に保存」ON時のパスワード（★本番はトークンへ差し替え推奨） | 共通 |
| `member_remember` | 「端末に保存」ON/OFF（`'1'`） | 共通 |

- `app-pro.html` は `{email, data: <bazi_mypage_v2 全体>}` を PUT / GET（実装済みの呼び出し）。
- `meishi-sheet.html` は `CLOUD` フック（`putSaved` 内で `cloudPush`）を用意済み。`CLOUD.STUB=false` にし、`{email, key:'saved', data:[...records]}` を PUT、起動時に PULL してマージしてください。
- 「わたしの既定」もクラウドに載せる場合は、同じ要領で `key:'output_default'` を追加（キー名は上表のとおり）。

**マージ方針の推奨**：サーバ側を正、ログイン直後に PULL→localに反映、以後は変更のたび PUT（localはオフライン用キャッシュとして残す）。

---

## 5. 詳細鑑定（AI）

- 既存 `/gemini`（Netlify Function）が **`GEMINI_API_KEY` をサーバ保持**して中継。クライアントに鍵は出しません。
- 鑑定書は **既定オンライン（詳細鑑定）**、圏外・接続不可のときだけ自動で定型文（オフライン鑑定書）にフォールバックします（実装済み）。
- 共有リンクの受け手側では自動でAIを呼びません（固定表示）。
- **コスト**：本文生成は軽微。キャッシュ等は **任意**（必須ではありません）。入れるとしても「同一命式は再利用」程度で十分。

### 詳細鑑定の「ゆるい1日上限」（不正利用防止）
- フロントに **1日 50回** の簡易上限を実装済み（`AI_DAILY_CAP=50`／`app-pro.html`・`meishi-sheet.html`）。
  超過するとその日は自動で**定型文（オフライン鑑定）にフォールバック**し、日付が変わるとリセットします。
- カウンタは `localStorage['ai_daily_YYYYMMDD']`（同一ブラウザ内・両ページ共有）。
- **これはあくまで目安**です。localStorage を消せば回避できるため、**実効的な上限はサーバー側**で会員IDごとに集計してください
  （`/auth-login` の会員に紐づけ、`/gemini` の呼び出し回数を日次カウント→上限超過は 429 等を返す。フロントは 429 を受けたら定型文へフォールバック）。
- 数値（50）を変えるときは両ファイルの `AI_DAILY_CAP` を揃えて変更（`meishi-sheet.html` は `meishiki-original/` にもミラー）。

---

## 6. 本番公開チェックリスト（フラグを切り替えるだけ）

| ファイル | 変更点 |
|---|---|
| `app-pro.html` | `PREVIEW_MODE = true → false`（L481）／`DEMO_MODE` は false のまま |
| `pricing-pro.html` | 公開前プレビュー導線 `#preview-cta` ブロックを削除（L125付近）／`TELECOM_PAYMENT_URL`（L266付近）にプラン別決済URLを設定して決済ボタンを有効化 |
| `auth.html` | `CONFIG.STUB = true → false`（L147） |
| `mypage-pro.html` | `CONFIG.STUB = true → false`（L110） |
| `meishi-sheet.html` | `CLOUD.STUB = true → false`（クラウド同期を使う場合）※`pro/` と `meishiki-original/` の**両方**（バイト単位ミラー） |
| Netlify | 上記 1〜6 の Functions を実装・`GEMINI_API_KEY` 等の環境変数を設定 |

> 注意：`pro/meishi-sheet.html` は `meishiki-original/meishi-sheet.html` に**バイト単位でミラー**する規約です（片方だけ変更しない）。

---

## 7. 変更しないもの（重要）

- 計算エンジン（`pklove.js` / `window.Bazi` / `computeChart` / `computeMeishiki`）は改変しない。
- 命式・大運・年運・立運・会局・空亡・納音などの**流派ルール**（`pro/ritsuun.html` が正典）は変えない。
- バックエンド接続は上記の**接続点（CONFIG/CLOUD/フラグ）だけ**で完結するよう作ってあります。
