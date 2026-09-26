# 四柱推命PRO（経験者版）エンジニア使用書 ／ 実装・引き継ぎ仕様書

**対象**：`pro/`（経験者版・B2B。四柱推命スクール向けに販売）
**この文書の目的**：フロントは完成済み。バックエンド（Netlify Functions）を実装し、フラグを切り替えれば本番稼働します。**間違えやすい点を含め、迷わず実装できるよう**まとめています。
**併読必須**：バックエンドの詳細契約は `pro/BACKEND_HANDOFF.md`。本書はその上位の全体像＋現状＋落とし穴をまとめた総合ガイドです。矛盾したら `BACKEND_HANDOFF.md` の契約表を正とします。

最終更新時点の Service Worker キャッシュ版：**`shichu-jidou-v240`**（`pro/sw.js`）

---

## 0. 最初に読む「絶対に守ること」（違反＝重大バグ）

1. **計算エンジンには一切触れない**。`pklove.js` / `window.Bazi` / `computeChart` / `computeMeishiki` は改変禁止。変更してよいのは**表示・アダプタ層のみ**（鑑定結果の見せ方だけ）。
2. **流派ルールを標準ルールに置き換えない**。大運・立運・会局・空亡・納音などは独自流派。正典は `pro/ritsuun.html`。詳細は本書 §9 と `CLAUDE.md`。
3. **`pro/meishi-sheet.html` は `meishiki-original/meishi-sheet.html` にバイト単位でミラー**。片方だけ変更しない（`cmp` で一致確認）。
4. **変更のたび `pro/sw.js` の `CACHE` バージョンを1つ上げる**（例 `v240`→`v241`）。上げないと利用者の端末に旧版がキャッシュされ、修正が反映されない。
5. **鑑定文にアスタリスク（`*`）を出さない**。表示前に除去する処理あり（`formatReading`）。
6. **サイト内で「AI」という語を使わない**（「詳細鑑定」等に言い換え）。
7. **秘密情報（APIキー・決済シークレット等）をコードに書かない**。必ず Netlify の環境変数へ。

---

## 1. プロダクト概要

四柱推命の自動鑑定ツール。関連プロダクトが複数ありますが、本書の対象は **② 経験者版 `pro/`**。

| 版 | ディレクトリ | 用途 |
|---|---|---|
| ① 個人版 | `meishiki-original/` | 一般向け。`meishi-sheet.html` は pro とバイト共有 |
| ② 経験者版（本書対象） | `pro/` | 鑑定士・スクール向け B2B。会員制・詳細鑑定・顧客カルテ |

**主要3画面（`pro/`）**
- `app-pro.html` … 本体ツール（個人鑑定・相性鑑定・詳細鑑定・顧客カルテ／マイページ）
- `meishi-sheet.html` … A4横の「命式表」印刷シート＋鑑定書（`meishiki-original/` とバイトミラー）
- `index.html` … LP（ランディング）

**技術構成**
- 純粋な静的サイト（フレームワークなし・ビルド不要）。HTML＋インラインJS＋`pklove.js`（計算エンジン）。
- ホスティング：**Netlify**（`pro/netlify.toml`）。サーバー処理は **Netlify Functions**（`pro/functions/`）。
- 現在 `pro/functions/` にあるのは **`gemini.js`（AI中継・実装済み）のみ**。認証・会員・同期の関数は**これから実装**（§5）。
- オフライン対応：Service Worker（`pro/sw.js`）でキャッシュ。圏外でも端末内鑑定が動く。

---

## 2. ファイル構成（`pro/`）と役割

**アプリ本体・シート**
- `app-pro.html` … メインツール（**約6000行**。鑑定ロジックの表示層・UI・会員ゲート・マイページ）
- `meishi-sheet.html` … 命式表＋鑑定書の印刷シート（**`meishiki-original/meishi-sheet.html` とバイト同期**）
- `pklove.js` … **計算エンジン（改変禁止）**。`window.Bazi` を提供
- `setsuboku.js` … 節木運の補助（表示計算の一部）
- `sw.js` … Service Worker（キャッシュ。`CACHE` 版を毎回上げる。`ASSETS` に新規ページを追加）

**会員・決済・マイページ**
- `auth.html` … ログイン／新規登録／確認メール／パスワード再設定（`CONFIG.STUB`）
- `mypage-pro.html` … 契約状況・解約（`CONFIG.STUB`）
- `pricing-pro.html` … 料金プラン＋決済導線（`TELECOM_PAYMENT_URL`）
- `terms-pro.html` / `tokushoho-pro.html` / `privacy-pro.html` … 規約類

**サーバーレス**
- `functions/gemini.js` … 詳細鑑定（Gemini）のサーバー中継（**実装済み**。§6）
- `netlify.toml` … 関数ディレクトリ・リダイレクト設定

**教科書（読み物ページ・鑑定の根拠解説）**
- `textbook-pro.html`（目次）と各ページ：`ritsuun.html`（**立運の正典**）, `juniun.html`, `tsuhensei.html`, `jikkan.html`, `zohkan.html`, `kubo.html`, `kaikyoku.html`, `nayin-aisho.html`, `kanshi-aisho.html`, `aisho-pattern.html`, `daiun-tenkanki.html`, `daiun-tsuhen.html`, `setsuboku.html`, `tensen-chichu.html`, `boko-kaichu.html`, `ijokanshi.html`, `nichiza-tenchusatsu.html`, `inyoku.html`, `nichiza.html`, `kodoku.html`

**ドキュメント**
- `BACKEND_HANDOFF.md` … バックエンド実装の詳細契約（**本書と併読**）
- `ENGINEER_GUIDE_JA.md` … 本書

---

## 3. 動かし方

### ローカル（実装確認用）
- ビルド不要。`pro/app-pro.html` を**ブラウザで直接開くだけ**。
- **`file://` で開くと会員ゲートは自動解除**されます（`app-pro.html` の `if(location.protocol==='file:'){ unlock(); return; }`。開発確認用）。
- 詳細鑑定（AI）はローカルでは中継関数が無いため、**自動で「オフライン鑑定（端末内の定型文）」にフォールバック**します（正常動作）。
- ローカルで関数も動かす場合は Netlify CLI（`netlify dev`）を使用。

### 本番（Netlify）
- `pro/` を Netlify にデプロイ。`netlify.toml` の `functions = "functions"` により `functions/*.js` が `/.netlify/functions/<name>` で公開。
- **環境変数を設定**（§7）してから関数をデプロイ／再デプロイ。**環境変数の変更は再デプロイで反映**されます。

---

## 4. 会員ゲートと本番切替（最重要・間違えやすい）

`app-pro.html` の先頭近くにゲート制御があります（`(function(){ ... })()` 内）。

| 変数 | 現在値 | 意味 |
|---|---|---|
| `DEMO_MODE` | `false` | true にするとログイン不要のデモ導線を表示（本番は false のまま） |
| `PREVIEW_MODE` | `true` | **公開前プレビュー**。true の間は**ログイン不要で全開放**＋「公開前プレビュー中」バナー |

**本番公開の切替**：`PREVIEW_MODE = true → false`。すると会員ゲートが有効になり、`/.netlify/functions/auth-login` で `status` が `active`／`trialing` の会員だけ解放されます。

> ⚠️ 注意：`PREVIEW_MODE=false` にすると**ログインが必須**になります。**認証・会員バックエンド（§5）を実装する前に false にすると、誰もログインできず全員が入れなくなります**。順序＝「バックエンド実装 → 環境変数設定 → 動作確認 → `PREVIEW_MODE=false`」。

**本番公開チェックリスト**（フラグ切替一覧）は `BACKEND_HANDOFF.md` §6 参照：
- `app-pro.html` … `PREVIEW_MODE=false`
- `auth.html` … `CONFIG.STUB=false`
- `mypage-pro.html` … `CONFIG.STUB=false`
- `pricing-pro.html` … `TELECOM_PAYMENT_URL` にプラン別決済URLを設定＋プレビュー導線 `#preview-cta` を削除
- `meishi-sheet.html` … クラウド同期を使うなら `CLOUD.STUB=false`（**`meishiki-original/` にもミラー**）
- Netlify … Functions 実装＋環境変数設定

---

## 5. バックエンド実装（要点。詳細は `BACKEND_HANDOFF.md`）

すべて `POST` / JSON。ベースパス `/.netlify/functions`。**認証＝メール＋パスワード**（パスワードは必ず bcrypt/argon2 等でハッシュ保存）。

| # | エンドポイント | 入力 | 返り値 | 用途 |
|---|---|---|---|---|
| 1 | `/auth-register` | `{email,password}` | `{ok:true}` | 新規登録＋確認メール |
| 2 | `/auth-login` | `{email,password}` | `{ok:true,status,email}` ／失敗401 | ログイン（契約状況も返す） |
| 3 | `/auth-verify` | `{token}` | `{ok:true,email}` | 確認メールのリンク検証 |
| 4 | `/auth-reset` | `{email}` | `{ok:true}` | パスワード再設定メール送信 |
| 5 | `/check-subscription` | `{email}` | `{status,plan,cardLast4,nextChargeAt}` | 契約状況取得 |
| 6 | `/cancel-subscription` | `{email}` | `{ok:true}` | 解約 |
| 7 | `/mypage-get` | `{email}` | `{data:{...}}` | クラウド保存の読み込み |
| 8 | `/mypage-put` | `{email,data}` | `{ok:true}` | クラウド保存の書き込み |
| 9 | `/gemini` | Gemini形式JSON | Gemini応答 | 詳細鑑定（**実装済み**） |
| 10 | `/auth-reset-confirm` | `{token,password}` | `{ok:true}` | パスワード再設定の確定（**着地画面は要追加**・`BACKEND_HANDOFF.md` §3） |
| 11 | `/telecom-webhook` | 決済通知 | `200` | テレコムクレジットの決済結果を `status` に反映 |

`status` の値：`active`／`trialing`／`past_due`／`canceled`／`unpaid`／`none`。`active`・`trialing` のみツール解放。

**最優先＝クラウド保存（`/mypage-get`・`/mypage-put`）**：顧客カルテはプロの資産。現在は端末内（localStorage）のみで、機種変・履歴削除で消える。同期対象キーは `BACKEND_HANDOFF.md` §4 の表を参照（`bazi_mypage_v2` ほか）。

**決済**：テレコムクレジット（審査通過済み）。`pricing-pro.html` の `TELECOM_PAYMENT_URL`（プラン別URL）を入れると導線が有効化。詳細は `BACKEND_HANDOFF.md` §2。

---

## 6. 詳細鑑定（AI中継）`/gemini` の契約 ★実装済み

ファイル：`pro/functions/gemini.js`（Netlify Function）。**APIキーはサーバー保持でブラウザに出しません**。

**必須環境変数**：`GEMINI_API_KEY` のみ。他は任意（既定値あり）。
- `GEMINI_MODEL`（既定 `gemini-2.5-flash`。相談・相性の軽量モデル）
- `GEMINI_MODEL_DEEP`（既定 `gemini-2.5-flash`。自動鑑定レポート用。`x-pk-deep:1` の時のみ使用）
- `PK_OWNER_TOKEN`／`PK_MAX_DEVICE_DAY`（既定400）／`PK_MAX_IP_DAY`（既定800）… ボット対策の安全上限（回数制限ではない）

**リクエスト**（クライアント → `/.netlify/functions/gemini`、`POST`）：
```json
{ "system_instruction": {"parts":[{"text":"..."}]},
  "contents": [{"role":"user","parts":[{"text":"..."}]}],
  "generationConfig": {"maxOutputTokens":2048} }
```
- ヘッダ `x-pk-deep: 1` を付けると DEEP モデルを使用（自動鑑定レポート）。
- サーバーが Google の `generateContent` へ中継し、**Geminiの生レスポンスをそのまま返す**（クライアントの既存パース `data.candidates` / `data.error` を変えない）。
- オリジン判定あり：`Origin`/`Referer` がサイトと不一致なら 403。

**フォールバック（実装済み）**：詳細鑑定は既定オンライン。圏外・接続不可・1日上限超過（`AI_DAILY_CAP=50`）時は**自動で端末内のオフライン鑑定（定型文）に切替**。共有リンクの受け手側では自動でAIを呼ばない。

> 実効的な回数上限はサーバー側で会員IDごとに集計してください（フロントの `localStorage` 上限は消せば回避可能）。

---

## 7. Netlify 環境変数一覧

| 変数 | 必須 | 用途 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | 詳細鑑定（Gemini）。**シークレット扱い** |
| `GEMINI_MODEL` | 任意 | 相談・相性の軽量モデル（既定 `gemini-2.5-flash`） |
| `GEMINI_MODEL_DEEP` | 任意 | 自動鑑定レポート用モデル |
| `PK_OWNER_TOKEN` / `PK_MAX_DEVICE_DAY` / `PK_MAX_IP_DAY` | 任意 | AI中継の安全上限 |
| 決済（テレコム）加盟店ID・Webhook署名シークレット等 | ✅（決済実装時） | `/telecom-webhook`。コードに書かず環境変数へ |
| メール送信（Postmark 等）トークン | ✅（認証メール実装時） | 登録確認・再設定メール |

設定場所：Netlify → 対象サイト → **Site configuration → Environment variables**。**変更後は再デプロイで反映**。

---

## 8. ミラー規約・キャッシュ運用（間違えやすい）

- **ミラー**：`pro/meishi-sheet.html` を変更したら、**必ず** `meishiki-original/meishi-sheet.html` に**バイト単位でコピー**して一致させる。
  ```bash
  cp pro/meishi-sheet.html meishiki-original/meishi-sheet.html
  cmp pro/meishi-sheet.html meishiki-original/meishi-sheet.html   # 差分なし＝OK
  ```
- **キャッシュ**：`pro/*` を変更したら **`pro/sw.js` の `CACHE` を必ず1つ上げる**（例 `shichu-jidou-v240`→`v241`）。新規ページを足したら `ASSETS` 配列にも追加。
- `AI_DAILY_CAP` などフロント定数を変えるときは、`app-pro.html` と `meishi-sheet.html` の**両方**を揃える（後者はミラーも）。

---

## 9. 計算・表現の絶対ルール（`CLAUDE.md` 準拠）

**触ってはいけない（計算エンジン）**：`pklove.js` / `window.Bazi` / `computeChart` / `computeMeishiki`。

**流派ルール（既定・変更禁止／正典 `pro/ritsuun.html`）**
- **第一運＝月柱**：0歳〜立運までは月柱の干支がそのまま最初の運。大運は必ず0歳＝月柱スタート。
- **順逆**：陽年生まれ男性／陰年生まれ女性＝順行。陰年男性／陽年女性＝逆行。
- **立運**：生まれてから節入りまでの日数を、**その月の実際の節間で比例配分**（固定「3日＝1年」ではない）。使用日数 ÷ 節間 × 120ヶ月（10年）、四捨五入。
- **検算基準例**：1981-06-10 22:28 女性 → 月柱 **甲午**／**順行**／立運 **8歳6ヶ月**／大運 甲午→乙未→丙申→丁酉。この結果に一致しない実装は誤り。
- 会局の吉凶は身強弱（扶抑）で判定。自動判定を初期表示＋鑑定者が上書き可。中和は色なし。

**表現**
- 鑑定文にアスタリスク（`*`）を出さない。
- サイト内で「AI」という語を使わない（「詳細鑑定」等）。

---

## 10. 現在の実装状態・最近の主な改修（表示層のみ）

エンジニアが「なぜこの実装か」を取り違えないための現状メモ。すべて**表示・アダプタ層**の変更で、エンジンは不変です。

- **印刷ボタンを結果画面に直接追加**（`attachReadingTools`）。オレンジの目立つ `🖨 印刷 / PDF保存`。
  - **相性の印刷**＝両者の名前＋**相性鑑定書のみ**（お互いの命式表は付けない）。
  - **個人の印刷**＝本人名＋**個人鑑定書**。
  - 実装は既存 `printHTML`（専用ウィンドウに整形して `window.print()`）。
- **「すべてリセット」ボタン**（`resetMain`）：本人＋相性のお相手＋全鑑定結果をワンタップで全消去（**保存済みの鑑定者リストは消さない**＝顧客データは保持）。
- **鑑定文の用語をやさしく併記**：AIの書き方ルール（`YOMI_RULE`）＋表示側の安全網（`plainGloss`）で、専門用語の初出に一度だけ「（＝ふつうの言葉）」を自動付与。五行の「金」＝お金ではない旨の凡例（`formatReading`）。
- **命式表（印刷）の罫線を太く**（`meishi-sheet.html` の `.yk-tbl`）＋印刷時に一番下の線が切れない下余白確保。

---

## 11. 検証方法（推奨）

- **UI・ロジック**：ヘッドレス Chromium（Playwright）で `app-pro.html` を開き、`window.Bazi.computeChart(...)` や表示関数（`chartHighlights` 等）を直接呼んで JS エラー0を確認。基準ケース（1981-06-10 己未／甲午・順行・立運8歳6ヶ月）で流派ルールの一致を確認。
- **印刷（命式表）**：`page.pdf({preferCSSPageSize:true, printBackground:true})` で実際の印刷を再現し、`pdftoppm` 等で画像化して目視（下端の線・レイアウトの崩れ）。
- **URL連携での描画**：`meishi-sheet.html?d=YYYY-MM-DD&t=HH:MM&sex=female&name=…` で自動計算・描画される。

---

## 12. セキュリティ（必ず対応）

- **露出したGemini APIキーは無効化（ローテーション）**：セットアップ中にキーがチャット等へ露出した場合は、**Google Cloud Console / AI Studio で失効させ新しいキーを再発行**し、Netlify の `GEMINI_API_KEY` を新キーに更新 → 再デプロイ → 旧キー削除、の順で。
- 秘密情報はコードに書かない（環境変数へ）。リポジトリにAPIキー直書きが無いことを確認済み。
- パスワードは平文保存しない（ハッシュ）。「端末に保存」は本番でセッショントークン方式に差し替え推奨（`BACKEND_HANDOFF.md` §3）。

---

## 13. よくある落とし穴（取り違え注意）

1. **`PREVIEW_MODE=false` を先に切ってしまう** → 認証未実装だと全員ログイン不可。バックエンド完成後に切替。
2. **`sw.js` の `CACHE` を上げ忘れる** → 利用者端末に旧版が残り「直したのに反映されない」。
3. **`meishi-sheet.html` を pro 側だけ変更** → ミラー崩れ。必ず `meishiki-original/` にコピー＋`cmp`。
4. **計算エンジンを触る** → 流派ルールが壊れる。表示層だけで完結させる。
5. **登録確認トークンと再設定トークンを同一扱い** → `/auth-verify` と `/auth-reset-confirm` は別窓口・別トークン。
6. **環境変数を設定したのに反映されない** → 関数は再デプロイで環境変数を取り込む。再デプロイする。
7. **鑑定文にアスタリスクや「AI」の語** → 表示前に除去／言い換えする規約。

---

### 連絡先・参照
- バックエンド詳細契約：`pro/BACKEND_HANDOFF.md`
- 流派の正典：`pro/ritsuun.html`
- 全体の絶対ルール：リポジトリ直下 `CLAUDE.md`
