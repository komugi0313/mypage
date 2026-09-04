# Pocket本格鑑定 — バックエンド実装仕様書（エンジニア向け・完全版）

> 目的：**APIキーを絶対にフロント（HTML/JS）に出さず**、サーバー側で秘匿したまま Gemini を呼ぶ本番構成を、迷いなく構築・デプロイするための仕様書。
> あわせて、オーナー自身が**自分のキーを打ち込んで試すデモモード**の使い方も定義する。
>
> 対象読者：バックエンド／インフラ担当エンジニア。
> 版：本ドキュメントは v93 時点の実装に対応。

---

## 0. 3行サマリ（これだけは絶対）

1. **本番：APIキーはサーバー（Netlify環境変数 `GEMINI_API_KEY`）にのみ置く。** フロントには一切書かない・埋め込まない・返さない。フロントは常に自サイトの `/api/gemini` を叩き、キーは見えない。
2. **デモ（オーナーが自分で試す）：** アプリの「設定 → 開発者ボックス」に自分のキーを貼るだけ。キーは**その端末の localStorage のみ**に残り、サーバーにもGitにも出ない。
3. **`PK_TRUST_CLIENT_PLAN` は本番で未設定。** 設定するとタダでVIPを名乗れる穴が開く。

---

## 1. 全体アーキテクチャ

```
┌─────────────────────────── 端末（ブラウザ / アプリWebView）───────────────────────────┐
│  index.html（フロント一式・四柱推命エンジンも同梱）                                    │
│    └─ AI呼び出し先を directKey() で分岐：                                              │
│         ・本番   : POST  /api/gemini            （キーはリクエストに含めない）          │
│         ・デモ   : POST  https://generativelanguage.googleapis.com/...?key=<自分のキー> │
└───────────────┬───────────────────────────────────────────────────────────────────────┘
                │  本番パスのみ
                ▼
┌─────────────────────── Netlify（サーバーレス）───────────────────────┐
│  netlify.toml のリダイレクトで /api/gemini → functions/gemini.js       │
│  functions/gemini.js（サーバー中継）                                   │
│    1) オリジン確認・入力サイズ制限                                     │
│    2) 端末ID/IP でレート制限（Netlify Blobs に日次/月次カウント）      │
│    3) プランを ent:<device>（購入検証済み）から解決                    │
│    4) ★ process.env.GEMINI_API_KEY を付けて Gemini へ中継              │
│    5) Geminiの生レスポンスをそのまま返す（+ 使用量/残数ヘッダ）        │
│  functions/verify-purchase.js … Apple/Google レシート検証→ent書込      │
│  functions/verify-telecom.js  … （任意）Web決済                        │
└──────────────────────────────┬────────────────────────────────────────┘
                               │  Authorization: key=GEMINI_API_KEY
                               ▼
                    Google Gemini API（generativelanguage.googleapis.com）
```

**要点：** 本番では、キーを持っているのは Netlify Function だけ。ブラウザの通信を開発者ツールで覗いても `/api/gemini` へのPOSTしか見えず、キーは露出しない。

---

## 2. 2つの動作モードと切替ロジック（フロント）

フロントは `directKey()`（`index.html`）の戻り値で呼び先を決める。**バックエンド担当は「本番＝空」を保証すればよい。**

```js
function directKey(){ try{ return window.PK_DIRECT_KEY || localStorage.getItem('pk_key') || ''; }catch(e){ return window.PK_DIRECT_KEY || ''; } }
```

| モード | 条件 | 呼び先 | キーの場所 | 回数制限 | 用途 |
|---|---|---|---|---|---|
| **本番** | `directKey()` が空 | `/api/gemini`（サーバー中継） | サーバー環境変数のみ | サーバーで強制 | 一般ユーザー配布 |
| **デモ** | `directKey()` が非空 | Geminiへ直接 | その端末の localStorage `pk_key`（or `window.PK_DIRECT_KEY`） | なし（無制限） | オーナーの動作確認 |

- **本番ビルドの絶対条件：** HTML内に `window.PK_DIRECT_KEY='...'` を**書かない**。`localStorage.pk_key` も配布物には含まれない（各端末ローカルのみ）。→ 配布物には鍵が一切無い。
- 現状の配布物（`index.html` 等）に **ハードコードされたキーは無い**ことを確認済み（`grep AIza` でヒット無し）。この状態を維持すること。

---

## 3. デモモードの使い方（オーナーが自分のキーで試す）

コード変更は不要。アプリ上で完結する。

1. アプリを開く →「設定」画面へ。
2. **「開発者ボックス（devBox）」** を展開（`index.html` の `<details id="devBox">`）。
3. `API key…` 欄に**自分の Gemini APIキー**を貼り、**「有効化」**を押す。
   - 内部で `localStorage.setItem('pk_key', <キー>)` を実行（`index.html` 6115行付近）。
   - 以降このアプリは**直接モード**：`generativelanguage.googleapis.com` を直接叩く。回数無制限。
   - キーは**この端末の localStorage のみ**。サーバー送信なし。診断ダンプ（`_pkDump`）からも `pk_key` は除外済みで漏れない。
4. **テスト用プラン切替**（devBox内の `devPlan`）で free/standard/pro/vip の画面挙動を確認可能（デモ専用。本番のプラン判定には影響しない）。
5. 終わったら**「解除」**でキー削除（`localStorage.removeItem('pk_key')`）。

> デモ用モデルの上書き（任意）：`window.PK_DIRECT_MODEL`（軽量）/ `window.PK_DIRECT_MODEL_DEEP`（本格）。未設定なら既定（lite=`gemini-2.5-flash-lite` / deep=`gemini-3.6-flash`）。
> ⚠️ デモに使ったキーは、テスト後に**必ず再発行（ローテーション）**すること。

---

## 4. `/api/gemini`（本番プロキシ）の契約 — フロントを壊さないための厳守事項

`functions/gemini.js`。**リクエスト/レスポンスの形は変えないこと**（フロントが依存）。

### 4-1. リクエスト
- **メソッド：** `POST`（それ以外は 405）。
- **ルート：** `/api/gemini`（`netlify.toml` で `/.netlify/functions/gemini` へ）。
- **ヘッダ（フロントが送る）：**

| ヘッダ | 意味 | サーバーの扱い |
|---|---|---|
| `Content-Type: application/json` | 必須 | — |
| `x-pk-device` | 端末ID（レート制限のキー） | カウントに使用 |
| `x-pk-deep` | `'1'`＝本格鑑定(DEEP・課金枠を消費) / `'0'`＝雑談・理屈(LITE・無料枠) | モデル選択＋月間枠加算の判定 |
| `x-pk-classify` | `'1'`＝話題分類用の軽量呼び出し | **カウントしない**（課金対象外） |
| `x-pk-logic` | 「なぜ？根拠」表示用（LITE） | 参考 |
| `x-pk-plan` | クライアント自称プラン | **本番では無視**（`PK_TRUST_CLIENT_PLAN` 未設定時）。信用しない |
| `x-pk-admin` ほか | 運営用の手動返金（§8） | `PK_ADMIN_TOKEN` 一致時のみ |

- **ボディ：** Google Gemini `generateContent` の標準JSONをそのまま（`systemInstruction` / `contents` / `generationConfig`）。サーバーは中身を書き換えず中継（Gemini 3.x 用に `thinkingConfig` 除去と `maxOutputTokens` 補正のみ実施）。
- **サイズ上限：** ユーザー発言1つ 12,000字（超過 413）。ボディ全体 900,000バイト（超過 413）。

### 4-2. レスポンス
- **成功：** Gemini の**生レスポンスボディをそのまま**返す（`candidates[].content.parts[].text` を含むJSON）。ステータスは基本200。
- **付与ヘッダ：**
  - `x-pk-remaining` … 今月の本格鑑定の残り回数（DEEP基準）。
  - `x-pk-tok` … `p=入力,cache=キャッシュ,out=出力,yen=概算¥`（原価計測）。
  - `x-pk-ratelimit: degraded` … Blobs不可でレート制限が縮退した時。
- **エラー（JSON `{ error:{ code, message, scope? } }`）：**

| HTTP | code | 意味 | フロントの挙動 |
|---|---|---|---|
| 405 | `METHOD` | POST以外 | — |
| 403 | `ORIGIN` | オリジン不一致 | — |
| 413 | `TOO_LONG` | 入力過大 | — |
| 500 | `NO_KEY` | `GEMINI_API_KEY` 未設定 | サーバー設定不備 |
| 429 | `LIMIT`（`scope:deep/total/ip`） | 上限到達 | deep＝プラン誘導POP／雑談は継続 |
| 451 | `REGION` | 地域未対応 | 「地域未対応」表示・**課金導線を出さない・回数も減らさない** |
| 502 | `UPSTREAM` | Gemini接続失敗 | 「混雑中」→再送導線 |

> **課金カウントの原則：** 「中身のある返答が返った時だけ」加算。200でも空・セーフティブロック・MAX_TOKENSで本文ゼロなら数えない（＝ユーザーの回数を無駄に減らさない）。分類呼び出し（`x-pk-classify:1`）も数えない。

---

## 5. 本番 環境変数（Netlify: Site settings → Environment variables）

| 変数 | 用途 | 必須 | 備考 |
|---|---|---|---|
| `GEMINI_API_KEY` | Gemini APIキー | ✅ | **サーバーのみ。絶対にフロントへ出さない** |
| `GEMINI_MODEL` | LITEモデル差し替え | 任意 | 既定 `gemini-2.5-flash-lite` |
| `GEMINI_MODEL_DEEP` | DEEPモデル差し替え | 任意 | 既定 `gemini-3.6-flash` |
| `PK_TRUST_CLIENT_PLAN` | クライアント自称プランを信用 | **本番は未設定** | `'true'`にすると**タダVIP穴**。IAP実装前の動作確認時のみ一時的に |
| `APPLE_SHARED_SECRET` | Appleサブスク検証 | iOS課金時✅ | verify-purchase.js |
| `GOOGLE_SA_EMAIL` / `GOOGLE_SA_KEY` | Googleサービスアカウント（androidpublisher権限） | Android課金時✅ | 〃 |
| `ANDROID_PACKAGE` | Androidパッケージ名 | Android課金時✅ | 例 `ai.72k.pocketkantei` |
| `PK_ADMIN_TOKEN` | 運営用の手動返金トークン | 任意 | 利用者に出さない |
| `PK_ALERT_WEBHOOK` | エラー急増のSlack/Discord通知先 | 任意 | 未設定なら集計のみ |
| `PK_ALERT_THRESHOLD` | 通知しきい値（件/時） | 任意 | 既定 8 |
| `PK_PRICE_IN`/`PK_PRICE_OUT`/`PK_PRICE_CACHE`/`PK_FX_JPY` | 原価計測の単価上書き | 任意 | USD/1Mトークン、¥/$ |
| `PK_TELECOM_ENABLED` | Web決済(Telecom)を使う場合のみ | 任意 | `'1'` |

- **Netlify Blobs** はGit連携／`netlify deploy` の通常デプロイで自動有効（レート制限・エンタイトルメントの保存先）。手動zip等でBlobs不可の環境ではレート制限は**フェイルオープン**（`x-pk-ratelimit: degraded`）。

---

## 6. レート制限・月間プール（`functions/gemini.js`）

- **本格鑑定(DEEP)＝月間プール：** `dd:<YYYY-MM>:<device>` を月次カウント。プラン上限 `LIMITS[plan].deep` に到達で 429(`scope:deep`)。**1日で使い切ってもよい**（1日単位で止めない）。
- **総生成(1日)：** `d:<YYYY-MM-DD>:<device>`。`LIMITS[plan].total`（bot対策の安全上限）。
- **IP(1日)：** `i:<YYYY-MM-DD>:<ip>`。`LIMITS[plan].ip`。
- **雑談・理屈(LITE)は deep枠を消費しない**（本格鑑定を使い切っても会話は続く＝詐欺感を出さない）。
- 時刻は**JST基準**（`jstDay`/`jstMonth`）。

**現行 `LIMITS`（利益率60%以上を保証する上限。原価が下がれば実測で引き上げ可）：**

| plan | deep(月) | total(日) | ip(日) | 対応価格(USD/月) |
|---|---|---|---|---|
| free | 15 | 60 | 120 | 無料お試し |
| standard | 50 | 400 | 500 | $19.99 |
| pro | 105 | 600 | 700 | $39.99 |
| vip | 175 | 900 | 1000 | $69.99 |

> ★上限は「Gemini原価 ≤ 総額の10%（手数料30%控除後も利益率≥60%）」を満たす値。**数日運用して Functions ログの `[pk-cost] …≈¥N/通` を確認**し、原価が下がっていれば上限を上げてよい。

---

## 7. プラン判定とエンタイトルメント（タダ乗り防止）

- **サーバーは自称プランを信用しない。** プランは購入検証済みの **`ent:<device>`**（Netlify Blobs）から解決。無ければ `free`。
- `functions/verify-purchase.js` が Apple(`verifyReceipt`・sandbox自動フォールバック) / Google(`androidpublisher`) を検証し、**正当なレシートのときだけ** `ent:<device>` に `{plan, exp}` を書く。
- 旧プラン名は後方互換（`light→standard, unlimited→pro, premium→vip`）。
- **`PK_TRUST_CLIENT_PLAN='true'` は開発時のみ**。本番で有効化すると `x-pk-plan` を信用してしまい、誰でもVIPを名乗れる。→ **本番は未設定を厳守**。

---

## 8. 運営用・手動返金（サポート対応、任意）

`PK_ADMIN_TOKEN` を設定した場合のみ。二重課金などの申告時に、該当端末の本格鑑定カウントを戻す：

```bash
curl -X POST "$SITE/api/gemini" \
  -H "x-pk-admin: <PK_ADMIN_TOKEN>" \
  -H "x-pk-refund-device: <対象端末ID>" \
  -H "x-pk-refund-n: 1" -d '{}'
# 複数日は x-pk-refund-day: YYYY-MM-DD / 月は x-pk-refund-month: YYYY-MM
```

トークンは運営のみ保持し、ブラウザには出さない＝利用者からは実行不可。

---

## 9. デプロイ手順（Netlify）

1. リポジトリを Netlify に接続（Git連携推奨。Blobsが自動有効）。
2. **Environment variables** に `GEMINI_API_KEY`（本番キー）を設定。※`PK_TRUST_CLIENT_PLAN` は**設定しない**。
3. `netlify.toml` のリダイレクトを確認：
   - `/api/gemini` → `/.netlify/functions/gemini`
   - `/api/verify-purchase` → `/.netlify/functions/verify-purchase`
   - （Web決済を使うなら `/api/verify-telecom` を追加）
4. デプロイ。公開URLで動作確認（§10）。
5. 課金する場合：`APPLE_SHARED_SECRET` / `GOOGLE_SA_*` / `ANDROID_PACKAGE` を設定。
6. リリース前に **Gemini APIの課金を有効化**（無料枠だと混雑エラー頻発）＋ **開発キーをローテーション**。

---

## 10. 動作確認チェックリスト（curl）

```bash
SITE="https://<あなたのNetlifyサイト>"

# ① キー秘匿の確認：配布物にキーが無いこと（何も出なければOK）
grep -R "AIza" ./pocket_check/index.html ./pocket_check/lp.html ./pocket_check/functions/ || echo "OK: no key in frontend"

# ② 本番プロキシが応答するか（正常系）
curl -s -X POST "$SITE/api/gemini" \
  -H "Content-Type: application/json" -H "x-pk-device: test-dev-1" -H "x-pk-deep: 0" \
  -d '{"contents":[{"role":"user","parts":[{"text":"こんにちは"}]}]}' | head -c 400

# ③ GEMINI_API_KEY 未設定なら 500 NO_KEY が返る（設定漏れ検知）
#    → 環境変数を入れたら 200 + 本文が返ることを確認

# ④ メソッド不正は 405
curl -s -o /dev/null -w "%{http_code}\n" "$SITE/api/gemini"   # → 405

# ⑤ レート制限：x-pk-deep:1 を上限まで送ると 429 LIMIT(scope:deep)
```

**受け入れ基準：** ①キー露出なし ②正常応答 ③未設定検知 ④405 ⑤上限で429。すべて満たせば本番構成OK。

---

## 11. 絶対にやってはいけない（セキュリティ）

- ❌ **`GEMINI_API_KEY` をフロント（HTML/JS）に書く／`window.PK_DIRECT_KEY` を本番ビルドに埋める。** → 誰でもキーを抜ける。
- ❌ **本番で `PK_TRUST_CLIENT_PLAN='true'`。** → タダVIP穴。
- ❌ `/api/gemini` のリクエスト/レスポンスの形を変える。 → フロントが壊れる。
- ❌ 商品IDを一箇所だけ変更（`index.html`/`pkiap-adapter.js`/`functions/verify-purchase.js` の3箇所は必ず同時）。
- ❌ 鑑定プロンプト・出力ロジック（`buildSystemPrompt` ほか）を不用意に変更。品質に直結し、オーナー方針で**文章内容は変更不可**。

---

## 12. 参照ファイル

| ファイル | 役割 |
|---|---|
| `functions/gemini.js` | AI中継・レート制限・原価計測・手動返金 |
| `functions/verify-purchase.js` | Apple/Google レシート検証 → `ent:<device>` |
| `functions/verify-telecom.js` | （任意）Web決済検証 |
| `netlify.toml` | `/api/*` ルーティング |
| `index.html` | フロント（`directKey()` で本番/デモ分岐・devBox・課金UI） |
| `pkiap-adapter.js` | ネイティブ課金ブリッジ（Capacitor用テンプレ・要実装差し込み） |
| `engineer_handoff.md` | iOS/Androidアプリ化（Capacitor）の引き継ぎ |
| `SPEC.md` | 全体仕様 |

---

_この仕様書は配布物と同じリポジトリに含まれます。実装で迷ったら本書 §0（3行サマリ）と §11（禁止事項）を最優先。_
