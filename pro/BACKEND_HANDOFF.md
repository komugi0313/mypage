# バックエンド実装方針（テレコムクレジット決済・会員・同期）

四柱推命ツール（経験者版 `pro/`）の**フロントは完成済み**で、すべて **STUB=true / PREVIEW_MODE=true** の状態で単体動作します。
バックエンド（Netlify Functions 想定）を用意し、各フラグを本番値に切り替えると会員制・決済・クラウド同期が有効になります。

> 前提：認証はパスワードレス（メールのマジックリンク）。決済はテレコムクレジット（クレジットカード）。
> 命式・鑑定の計算エンジンには一切触れないでください（表示・データ層のみ）。

---

## 1. 実装するエンドポイント一覧（すべて `POST` / JSON）

ベースパス：`/.netlify/functions`

| # | エンドポイント | 入力 | 返り値 | 用途 | 呼び出し元 |
|---|---|---|---|---|---|
| 1 | `/auth-send-link` | `{email}` | `{ok:true}` | ログイン/登録の確認メール送信（マジックリンク発行） | `auth.html`（CONFIG.SEND_LINK） |
| 2 | `/auth-verify` | `{token}` | `{ok:true, email}` | マジックリンク検証・セッション発行 | `auth.html`（CONFIG.VERIFY） |
| 3 | `/check-subscription` | `{email}` | `{status, plan, cardLast4, nextChargeAt}` | 契約状況の取得 | `app-pro.html`（会員ゲート L486）／`mypage-pro.html`（CONFIG.STATUS） |
| 4 | `/cancel-subscription` | `{email}` | `{ok:true}` | 解約（次回更新分から停止） | `mypage-pro.html`（CONFIG.CANCEL） |
| 5 | `/mypage-get` | `{email}` | `{data:{...}}` | クラウド保存の読み込み（鑑定者・鑑定・設定） | `app-pro.html`（L4618）／`meishi-sheet.html`（CLOUD.PULL） |
| 6 | `/mypage-put` | `{email, data}` | `{ok:true}` | クラウド保存の書き込み | `app-pro.html`（L4609）／`meishi-sheet.html`（CLOUD.PUSH） |
| 7 | `/gemini` | Gemini 形式のJSON | Gemini応答 | 詳細鑑定（AI本文生成）。**実装済み・鍵はサーバ保持** | `app-pro.html`（L4117）／`meishi-sheet.html` |

`status` の想定値：`active`（課金中）／`trialing`（無料トライアル中）／`past_due`／`canceled`／`unpaid`／`none`。
`plan` の想定キー：`month`（9,800円/月）／`year`（98,000円/年）／`half`（52,800円/半年）。

---

## 2. 決済フロー（テレコムクレジット）

```
pricing-pro.html（料金プラン）
   └─ カード決済（テレコムクレジット）
        └─ 決済成功 Webhook → 会員レコード作成（email＋plan＋cardLast4＋trial開始）
             └─ 確認メール（マジックリンク）送信 = /auth-send-link 相当
                  └─ auth.html?token=… → /auth-verify → app-pro.html（ツール解放）
```

- **決済ページ導線**：`pricing-pro.html` に決済ボタンを設置（現在は公開前プレビュー導線が入っています／L125 `#preview-cta` ブロック）。
- **無料トライアル一週間**：`trialing` として扱い、期間中の解約は費用0円（UIは実装済み）。
- **会員判定**：`app-pro.html` の会員ゲート（L485〜）が `/check-subscription` を呼び、`active`/`trialing` で解放。それ以外は料金プランへ誘導。

---

## 3. 認証（パスワードレス／マジックリンク）

`auth.html` に画面（ログイン→送信完了→着地検証）が実装済み。実装するのは 2 関数のみ：

- `/auth-send-link`：メール送信。リンクは **`auth.html?token=XXXX`** の形で発行。
- `/auth-verify`：トークン検証 → `{ok, email}`。セッション/Cookie発行はサーバ側。

成功後、フロントは `localStorage['member_email']` に email を保存し、`app-pro.html` へ遷移（CONFIG.AFTER_LOGIN）。

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

---

## 6. 本番公開チェックリスト（フラグを切り替えるだけ）

| ファイル | 変更点 |
|---|---|
| `app-pro.html` | `PREVIEW_MODE = true → false`（L476）／`DEMO_MODE` は false のまま |
| `pricing-pro.html` | 公開前プレビュー導線 `#preview-cta` ブロックを削除（L125付近）／決済ボタンを有効化 |
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
