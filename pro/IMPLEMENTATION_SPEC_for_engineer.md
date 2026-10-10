# 実装仕様書（エンジニア用）— Meishiki 経験者版【最新版】

> **この1枚が唯一の正です。** 過去のやり取り・旧ドキュメントは破棄し、本書の内容だけで実装してください。
> フロント（このリポジトリ `pro/` 一式）は**完成済み**。エンジニアが作るのは **サーバー側API・決済・本番切替の3つだけ** です。
> 対応バージョン: `sw.js` の `CACHE = shichu-jidou-v376` ／ 最終更新: 2026-09-30
> 前提（発注者確認済み）：**Gemini（生成AI）はサーバー内蔵**（キーはサーバー保持・フロントに出さない）／**決済はテレコムクレジット**／**Web先行 → のちに iOS・Android アプリ**。

---

## 0. 全体像（これだけ先に掴む）

- **プロダクト**：四柱推命の自動鑑定ツール（プロ鑑定者向けB2B）。ブランド **Meishiki Inc.**、月額 **9,800円（税込）**。
- **フロント**：ビルド不要の**静的PWA**（HTML/CSS/JSのみ）。`pro/` 配下がそのまま本番フロント。
- **バックエンド**：**あなたが Google 基盤（Cloud Run / Cloud Functions 等）で構築**。下記の **API 9本**（認証3・マイページ同期2・Gemini中継1・契約3） ＋ **決済（テレコムクレジット）** ＋ **本番切替**。
- **売り（最重要）**：利用者が**自分で質問文を打ち込み、その命式に沿った詳細鑑定をその場で受け取る**こと。この鑑定文の生成が Gemini（サーバー内蔵）。

### 構成図
```
[ ブラウザ / PWA / 将来アプリ ]
        │  fetch( /.netlify/functions/<関数名> )   ※下記「API_BASE」参照
        ▼
[ あなたのサーバー（Google） ]  ── サーバーレス関数 9本 ＋ 決済結果の受け口
   ├─ 認証・会員（メール＋パスワード、契約ステータス管理）
   ├─ マイページ同期（鑑定者＝顧客カルテの保存/読込）
   ├─ Gemini 中継（GEMINI_API_KEY をサーバーが保持して呼ぶ＝内蔵）
   └─ 決済（テレコムクレジット）→ 契約ステータスを更新
```

> **API_BASE**：フロントは既定でパス `'/.netlify/functions'` を使用（名前は名残。中身は「あなたのAPIのベースパス」の意味）。Google側で `/.netlify/functions/<関数名>` を各関数へリライトするか、フロントの定数を実URLに書き換えるか、どちらでも可。定数の場所は §3 と §11 に明記。

---

## 1. 絶対に触ってはいけないもの

1. **計算エンジン `pro/pklove.js`（`window.Bazi`/`computeChart`/`computeMeishiki`）は改変禁止。** 命式・大運・立運・通変星・十二運・会局・吉凶星・空亡は全てここが出力。API実装で触る必要は一切ない。
2. **`pro/meishi-sheet.html` は `meishiki-original/meishi-sheet.html` とバイト単位で同一**に保つ運用（今回のAPI実装では触らない）。
3. **`pro/` の配信ファイルを変更したら必ず `pro/sw.js` 先頭の `CACHE = 'shichu-jidou-vNNN'` を1つ上げる**（上げないと利用者端末に更新が届かない）。※このMarkdownだけの変更なら不要。

---

## 2. 本番公開の切替チェックリスト（デプロイ前に必ず）

フロントの変更。実施後は `sw.js` の `CACHE` を1つ上げる。

| # | ファイル | 現在（デモ） | 本番 | 目印 |
|---|---|---|---|---|
| 1 | `app-pro.html` | `var PREVIEW_MODE = true;` | **`false`** | 650行目付近 |
| 2 | `app-pro.html` | `var DEMO_MODE = false;` | `false`（そのまま） | 647行目付近 |
| 3 | `app-pro.html` | テストキー欄 `<details id="gtest-wrap" …>` が存在 | **ブロックごと削除**（コメントに削除指示あり） | 800行目付近 |
| 4 | `auth.html` / `mypage-pro.html` | `CONFIG.STUB = true` | **`false`** | 各ファイルの `var CONFIG` |
| 5 | `pricing-pro.html` | `TELECOM_PAYMENT_URL = { month:'' }` ／ `TELECOM_PARAM` | **審査通過後の決済URL**を設定し、渡す値のパラメータ名を接続仕様書に合わせる | `var TELECOM_PAYMENT_URL` |
| 6 | 連絡先ドメイン | 旧ブランド `72k.ai` が残存 | **Meishiki の実メール/ドメイン**へ一括置換 | §9 |

- **`PREVIEW_MODE=true` の意味**：`app-pro.html` 起動時のログインゲートを無条件解除（`if(PREVIEW_MODE){ unlock(); return; }`）。**本番で true のままだと誰でも無料で全機能を使えてしまう**ので必ず `false`。
- `file://` で直接開いた場合のみローカル確認用に自動解除（https配信では発動しない）。

---

## 3. サーバーAPI仕様（作るのはこの9本 ＋ 決済結果の受け口）

- 全て **HTTPS / `POST` / `Content-Type: application/json`**（Gemini中継のみ Google の generateContent 形式を透過）。
- 別オリジン配信なら **CORS** を適切に許可。
- 現状の認証は email＋password をフロントが `localStorage` に保持して都度送る簡易方式。**推奨：ログイン成功時にセッショントークンを発行し以後はトークン認証**（§8）。現行フロントを動かすだけなら下表の契約を満たせば足りる。

### 3-1. 認証・会員（3本）
呼び出し元：`auth.html`（ログイン／パスワード設定／設定メール送信）と `app-pro.html`（起動時ゲート）。
**会員は「お支払い登録の完了（テレコムクレジットの結果通知）」でサーバーが作る**（§4）。画面からの「新規登録」は無い（旧 `auth-register`/`auth-verify` は廃止。`auth.html?view=register` は料金ページへ転送）。

| 関数（パス末尾） | body | 成功レスポンス | 失敗 | 役割 |
|---|---|---|---|---|
| `auth-login` | `{ email, password }` | `{ ok:true, status, email, token? }` | HTTP401 | ログイン。**契約ステータスを必ず返す**。`token` を返せばフロントが `member_token` に保存し、マイページAPIの `Authorization: Bearer` に付ける |
| `auth-setpw` | `{ token, password }` | `{ ok:true, email }` | HTTP400/410（期限切れ・使用済み） | 設定メールのリンク（`auth.html?view=setpw&token=…`）でパスワードを決める。**初回設定と再設定の共通**。トークンは短命・ワンタイム |
| `auth-reset` | `{ email }` | `{ ok:true }` | ― | パスワード設定メールの送信。**登録の有無にかかわらず同じ応答**（登録の有無を外部に漏らさない） |

**`status`（契約ステータス）** — フロントの `statusJa()` が対応済み：

| status | 意味 | アプリ解錠 |
|---|---|---|
| `active` | ご利用中（課金中） | **する** |
| `trialing` | 無料トライアル中 | **する** |
| `past_due` | 支払い遅延 | しない |
| `canceled` | 解約済み | しない |
| `unpaid` | 未払い | しない |
| `none` | 未契約 | しない |

- 解錠判定（`app-pro.html` 679行 / `auth.html` 243行）：`status==='active' || status==='trialing'` のときだけ解錠。それ以外は料金ページへ誘導。
- ログイン情報は `localStorage` に `member_email` / `member_pw` / `member_remember` として保存。起動時に自動再ログインを試行。

### 3-2. マイページ同期（2本）
呼び出し元：`app-pro.html`（顧客カルテ＝鑑定した相手の保存）と `mypage-pro.html`。ログイン中（`member_email` あり）のみサーバー同期。未ログイン/未デプロイ時は端末内 `localStorage` のみで動作（フォールバック済み）。

| 関数 | body | 成功レスポンス | 役割 |
|---|---|---|---|
| `mypage-get` | `{ email }` | `{ data: <ドキュメント> }` | 保存データ取得 |
| `mypage-put` | `{ email, data: <ドキュメント> }` | `{ data: <保存後ドキュメント> }` | 保存（サーバー側マージ推奨） |

**ドキュメント形式（`data`）** — フロント実装準拠：
```json
{ "schema": 1, "updatedAt": 1727600000000,
  "clients": [ { "id": "一意ID", "name": "顧客名", "ts": 1727600000000, "deleted": false /* 他に鑑定メモ・保存命式など任意 */ } ] }
```
- キー：`DKEY='bazi_mypage_v2'`（新）、`CKEY='bazi_clients_v1'`（旧・初回移行用）。
- **マージ規則（フロントの `mpMerge` と一致させる）**：両者の `clients[]` を **`id` 単位で `ts`（更新時刻）が新しい方を採用**して統合。`deleted:true` は墓石として保持（複数端末でも消えない）。`updatedAt` は両者の最大値。

### 3-3. Gemini 中継（1本）＝ 生成AIはここに内蔵
呼び出し元：`app-pro.html` の詳細鑑定・相性鑑定。**APIキーは絶対にフロントに出さず、サーバーが環境変数で保持して呼ぶ**（フロント 5702行に「クライアントにAPIキーは置かない。サーバー中継がキーを保持」と明記）。

| 関数 | 役割 |
|---|---|
| `gemini` | フロントから来た generateContent 形式の body を、サーバー保持の `GEMINI_API_KEY` で Google に中継し、応答をそのまま返す |

**フロントが送る body（そのまま Google `generateContent` に渡せる形）：**
```json
{
  "system_instruction": { "parts": [ { "text": "…システム指示…" } ] },
  "contents": [ { "role": "user", "parts": [ { "text": "…ユーザー入力…" } ] } ],
  "generationConfig": { "maxOutputTokens": 2048, "thinkingConfig": { "thinkingBudget": 0 } }
}
```
- 任意ヘッダ **`x-pk-deep: 1`**：**深め（DEEP）鑑定**の指定（自動鑑定レポート等）。無い時は既定（LITE）。サーバーは受けたら思考量やモデルを上げる分岐に使ってよい（無視しても動作する）。
- **中継先モデル**：既定 **`gemini-2.5-flash`**（例：`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=<GEMINI_API_KEY>`）。
- **タイムアウト/障害時**：フロントは約5秒でサーバー応答が無ければ**端末内オフライン鑑定に自動フォールバック**（＝サーバーが落ちてもアプリは止まらない）。サーバーは通常のJSONを返せば十分。
- レスポンスは Google の generateContent 応答JSONをそのまま返す（フロントが `candidates[].content.parts[].text` を読む）。

> ※動作確認用にキーをフロントに貼る「テスト欄（`gtest-wrap`）」があるが、**本番は §2 #3 で削除**。本番はこの `gemini` 関数（サーバー内蔵）のみを使う。

---

### 3-4. 契約・マイページ（3本）
呼び出し元：`mypage-pro.html`。**必ずログイン中の本人であることを確認してから応答**（`Authorization: Bearer <member_token>`。メールアドレスだけで他人の契約を見たり解約したりできないように）。

| 関数 | body | 成功レスポンス | 役割 |
|---|---|---|---|
| `check-subscription` | `{ email }` | `{ status, plan, orderId, trialEnd, nextChargeAt, periodEnd }`（日付は表示用の文字列 例 `2026年10月17日`） | ご契約状況。未認証は HTTP401（フロントはログイン案内を出す） |
| `card-update-url` | `{ email }` | `{ url }` | テレコムクレジットの**カード情報変更ページのURL**を発行して返す（フロントはそこへ移動）。変更後は無料期間・契約を引き継ぐ |
| `cancel-subscription` | `{ email }` | `{ ok:true, status:'canceled', periodEnd }` | 解約。テレコムクレジットの継続課金を停止。**無料期間中なら初回課金を行わない（0円）**。課金後なら `periodEnd` まで利用可・次回から請求停止 |

## 4. 決済（テレコムクレジット）とお申し込みの流れ

> PRO・ビギナー・易 EKI Pro の3商品とも**同じ流れ・同じAPI**（ビギナーの `pricing.html`/`auth.html`/`mypage.html` は `tools/sync_beginner_from_pro.py`、EKI の `upgrade.html`/`auth.html`/`mypage.html` は `tools/eki_pay_from_pro.py` で PRO から生成）。料金は3商品とも **月額 9,800円（税込）のみ**。

- **プラン（`pricing-pro.html` の `PLAN`、税込）**：

  | キー | プラン | 価格 | 更新 |
  |---|---|---|---|
  | `month` | 月額 | **9,800円** | 1か月ごと自動更新 |

### 4-1. 流れ（お客様の画面）
1. **料金ページ**（`pricing-pro.html`）：メールアドレスを**2回入力**（打ち間違い防止・不一致はエラー）＋規約・特商法・プライバシー・自動更新への同意 → **最終確認画面**（改正特商法：メール・プラン・料金・無料期間・初回課金・自動更新・解約返金を一覧表示し、メールの再確認を促す）。
2. 「この内容で申し込む」→ フロントが**お申し込み番号**（例 `P-20261010-7K3QXA`／ビギナーは `B-`、EKI は `E-`）を発行し、`TELECOM_PAYMENT_URL` に **お申し込み番号とメールアドレス** を付けてテレコムクレジットの決済ページへ移動（パラメータ名は `TELECOM_PARAM` で指定。**接続仕様書の名前に合わせて書き換える**）。
3. お客様が決済ページでカードを登録（無料期間付きの継続決済）。
4. **テレコムクレジット → サーバーへ決済結果の通知**（サーバー間）。サーバーは通知を検証し（送信元の確認など、テレコムクレジットの仕様に従う）、お申し込み番号・メールで**会員を作成（`status=trialing`）**し、**「ログイン用パスワードの設定」メール**（リンク `auth.html?view=setpw&token=…`）を送る。
5. 決済ページの**戻り先**：完了 → `pricing-pro.html?result=ok`（完了画面：送り先メール・お申し込み番号・届かないときの案内）／中断・失敗 → `?result=ng`（「お申し込みは成立していません・料金は発生していません」＋よくある原因＋やり直し）。**戻り先URLの表示だけで会員を作らない**（URLは誰でも打てるため。確定は必ず4の通知で）。
6. お客様がメールのリンクでパスワードを決める → ログイン → 鑑定ツール。
7. 無料期間（7日）終了で自動の初回課金 → `active`。以後毎月の継続課金。課金失敗 → `past_due`（フロントはログイン時・マイページで「カード情報を更新してください」を表示し、カード変更へ誘導）。

### 4-2. 間違い・トラブルへの備え（フロント実装済み／サーバー側で必要なこと）
| 起きること | 画面での案内（実装済み） | サーバー・運営で必要なこと |
|---|---|---|
| メールアドレスの打ち間違い | 2回入力・最終確認で強調・完了画面に送り先とお申し込み番号を表示・「間違えたら再申込せず問い合わせ」 | お申し込み番号・申込日・カード名義で照合し、**管理画面からメールを訂正して設定メールを再送**できるようにする |
| 設定メールが届かない | 迷惑メール・受信設定の案内、`auth.html?view=reset` で再送 | `auth-reset` は会員の有無にかかわらず同じ応答。送信元は `info@72k.ai`（ドメインのSPF/DKIM設定） |
| 決済できない・途中で閉じた | `?result=ng` 画面、よくある原因、やり直し | 申込は成立させない（通知が来ない限り会員を作らない） |
| 二重申込 | **お客様の自己責任**（返金なし）。注意喚起：最終確認画面「ボタンは1回だけ」、決済ボタンの二度押し防止、ログイン済み端末には「もう一度お申し込みしないでください」、二重の場合はお客様自身が一方を解約（無料期間中なら0円） | 返金・取り消しの個別対応はしない。**防止策（推奨）**：同じメールで有効な契約（trialing/active）があれば2件目の申込を受け付けない。無料お試しはお一人様1回（同一カード・同一メールで再取得させない） |
| カードの期限切れ・変更 | マイページ「お支払いカードを変更する」 | `card-update-url` でテレコムクレジットのカード変更ページへ |
| 解約 | マイページ「解約する」（無料期間中は0円、課金後は期間末まで利用可） | `cancel-subscription`。**マイページで解約できない場合はメールでも受け付ける**（特商法ページに明記済み） |
| 見覚えのない請求の問い合わせ | マイページ「困ったとき」 | お申し込み番号・請求日・金額で照合できるよう、決済通知を保存しておく |

- **不正トライアル対策（推奨）**：同一カード・同一端末での無料再取得をサーバーで弾く（カード登録必須が前提）。
- **無料期間・継続課金・カード変更・解約の具体的なやり方**（APIか管理画面か、無料期間を決済ページ側で設定できるか、結果通知の形式・検証方法、カード変更ページのURLの作り方）は、**テレコムクレジットの接続仕様書で確認**して実装すること。
- 特商法・規約は同梱：`tokushoho-pro.html`（販売事業者/所在地/電話/価格/支払方法〈決済代行：テレコムクレジット株式会社〉/解約）、`terms-pro.html`、`privacy-pro.html`。**事業者情報・ドメインは実データへ差し替え**。

---

## 5. 環境変数（サーバー側）

| 変数 | 用途 | 必須 |
|---|---|---|
| `GEMINI_API_KEY` | `gemini` 中継関数が Google 生成AIを呼ぶキー。**フロントに出さない** | 必須 |
| （DB接続情報 / JWT等の秘密鍵 / メール送信SMTP・APIキー / テレコムクレジット各種キー） | 各関数の実装に応じて | 実装依存 |

---

## 6. ファイル構成（フロント＝ `pro/`）

| ファイル | 役割 |
|---|---|
| `index.html` | **入口＝LP**。PWAの `start_url` もここ。軽量化と会員リダイレクトあり（§7） |
| `app-pro.html` | 鑑定ツール本体（命式計算・詳細鑑定・相性・顧客カルテ）。巨大・**ミラー対象外** |
| `meishi-sheet.html` | 鑑定書（印刷用）。`localStorage['bazi_sheet_featbook']` で本体から受け渡し。**`meishiki-original/` とバイト同一維持** |
| `auth.html` | ログイン／パスワードの設定（初回・再設定）／設定メール送信／ログインできないとき |
| `mypage-pro.html` | マイページ（契約状況・カード変更・解約・困ったとき） |
| `pricing-pro.html` | お申し込み（メール2回入力・最終確認）→ テレコムクレジットの決済ページ／戻り（`?result=ok`・`?result=ng`）の画面／困ったとき |
| `terms-pro.html` / `privacy-pro.html` / `tokushoho-pro.html` | 規約・プライバシー・特商法 |
| `textbook-pro.html` ほか各 `*.html` | 60干支・各種星の教科書ページ（`kaigou.html` 等） |
| `pklove.js` | **計算エンジン（改変禁止）** |
| `sw.js` | Service Worker（PWA。`CACHE`＋`ASSETS`管理） |
| `manifest-pro.webmanifest` | PWAマニフェスト（`start_url: index.html`） |
| `demo.webm` / `demo-poster.png` | LPのデモ動画とポスター。**SWの `ASSETS`（事前キャッシュ）には入れない**（軽量化のため） |

- **PWA**：`sw.js` は stale-while-revalidate。同一オリジン以外（Gemini等の外部通信）は素通し。オフライン時のGETフォールバックは `index.html`。新規/変更ファイルを増やしたら `ASSETS[]` に追加し `CACHE` を上げる（**動画・ポスターは除外のまま**）。
- **静的配信**：ビルド無し。`pro/` をそのまま静的ホスティングに載せる。APIはリライトで振り分けるか、フロントのベースパス定数を実URLへ。

---

## 7. LP（index.html）の挙動＝軽量化と会員リダイレクト

- **会員は即アプリへ**：LP先頭で `localStorage.getItem('member_email')` があれば `location.replace('app-pro.html')`。**登録/ログイン済み端末はLP（重いデモ動画）を開かず**アプリへ直行。新規訪問者だけがLPを見る。
- **デモ動画は軽量**：`<video preload="none">` ＋ **ポスター画像＋タップで再生**（自動再生・先読みなし）。LPはポスターだけで軽く開き、動画は見たい人がタップした時にだけ読み込む。
- ログアウト時に `member_email` を消せば、その端末は再びLPを表示する。

---

## 8. セキュリティ必須事項

1. **`GEMINI_API_KEY` はサーバーのみ**。本番でテストキー欄（`gtest-wrap`）を削除（§2 #3）。
2. 全通信 **HTTPS**。パスワードは **ハッシュ保存**（bcrypt/argon2 等）。
3. **推奨：セッショントークン化**。現行は email＋password を都度送る簡易方式。ログイン時に短命トークンを発行し `mypage-*` 等はトークン認可へ。移行時はフロントの `member_pw` 保存箇所（`app-pro.html` ゲート／`auth.html` CONFIG）も更新。
4. `auth-*` はレート制限・総当たり対策。`auth-setpw` のトークン（設定メールのリンク）は短命・ワンタイム。
5. 決済結果の通知（テレコムクレジット → サーバー）は、**テレコムクレジットの仕様どおりに検証**（送信元IPの確認など）してから `status` 更新。戻り先URL（`?result=ok`）では会員を作らない。
6. `check-subscription`／`card-update-url`／`cancel-subscription` は**ログイン中の本人確認が必須**（トークン認可）。

---

## 9. ブランド・連絡先の差し替え

- 旧ブランドのメール/ドメイン **`72k.ai`**（`index.html` の `info@72k.ai` 等・複数ファイル）を **Meishiki Inc. の実メール/ドメイン**に一括置換。置換後は該当ファイルを変更したことになるので `sw.js` の `CACHE` を上げる。
- 特商法（`tokushoho-pro.html`）の販売事業者名・所在地・電話番号・問い合わせ先も実データへ。

---

## 10. Web の次：iOS / Android アプリ

- 方針：**Web先行（テレコムクレジット）→ のちにネイティブアプリ**。
- `app/` に **Capacitor スキャフォールド** あり（`pro/` の Web をそのままラップ）。
- **重要（審査）**：iOS/Android アプリ内でデジタル課金する場合、Apple/Google は原則**ストア内課金（IAP）**を要求。アプリ版は課金経路をIAPへ切替 or ガイドライン準拠の導線設計が必要。**Web=テレコムクレジット／アプリ=IAP と決済が分岐**する点を初期設計に織り込む（`status` 管理はサーバー共通、決済プロバイダだけ分岐）。

---

## 11. フロントの主要定数（書き換え箇所の早見）

| 定数 | ファイル:目安行 | 現在値 | 本番 |
|---|---|---|---|
| `API` | app-pro.html:651 | `'/.netlify/functions'` | 実APIベースパス（リライトなら据置） |
| `MP_API` | app-pro.html:6460 | `'/.netlify/functions'` | 同上 |
| `PREVIEW_MODE` | app-pro.html:650 | `true` | `false` |
| `CONFIG.API` / `CONFIG.STUB` | auth.html・mypage-pro.html の `var CONFIG` | `'/.netlify/functions'` / `true` | 実ベースパス / `false` |
| `TELECOM_PAYMENT_URL` / `TELECOM_PARAM` | pricing-pro.html | 空 / 仮の名前（`sendid`・`email`） | 月額プランの決済URL / 接続仕様書のパラメータ名 |
| `geminiModel` | app-pro.html:2478 | `'gemini-2.5-flash'` | 必要なら変更（サーバー側でも可） |

**localStorage キー**：`member_email` / `member_pw` / `member_remember` / `member_status` / `member_token`（会員）、`pending_order`（お申し込み番号・メールの控え）、`selected_plan`、`bazi_mypage_v2`（同期・DKEY）、`bazi_clients_v1`（旧）、`bazi_sheet_featbook`（鑑定書受け渡し）、`bazi_gkey`/`bazi_gmodel`（テスト専用・本番は欄ごと削除）。

---

## 12. 受け入れ確認（サーバー実装後）

- [ ] 料金ページ→決済→**結果通知で会員作成（trialing）**→設定メール到達→`auth.html?view=setpw` でパスワード設定→ログイン、が通る。
- [ ] 決済を中断・失敗すると `?result=ng` 画面になり、会員は作られない。`?result=ok` を手で打っても会員は作られない。
- [ ] 同じメールで2回申し込んでも二重に契約・請求されない。
- [ ] `auth-login`：正しい資格情報で `{ok:true,status,email}`、誤りで 401/`{ok:false}`。
- [ ] `status=active`/`trialing` で `app-pro.html` 解錠、`canceled` 等で非解錠（`PREVIEW_MODE=false` で確認）。
- [ ] `auth-setpw`（期限切れ・使用済みは400/410）／`auth-reset`（会員の有無で応答を変えない）が動作。
- [ ] マイページ：状態ごとの表示（無料お試し中／ご利用中／お支払いが確認できません／解約済み）、カード変更ページへの移動、解約（無料期間中は0円）が動作。他人のメールアドレスを送っても他人の契約は見えない・解約できない。
- [ ] `mypage-get`/`put`：2端末編集でも `id`+`ts` マージで消えない。`deleted` が同期される。
- [ ] `gemini` 中継：詳細鑑定・相性の鑑定文が返る。5秒超/障害時はフロントがオフライン鑑定へ自動フォールバック。
- [ ] 決済完了でサーバーの `status` が更新され、再ログインで解錠。
- [ ] `TELECOM_PAYMENT_URL` 設定後、料金ページから決済へ遷移。
- [ ] §2 の本番切替を全実施。`72k.ai` 残存ゼロ。`sw.js` の `CACHE` を上げた。
- [ ] 会員（`member_email`あり）でLPを開くと即アプリへ遷移。新規訪問はLP表示。
- [ ] 計算エンジン `pklove.js` は無改変。基準ケース `1981-06-10 22:28 女性` で 月柱=甲午／順行／立運8年6ヶ月／大運 甲午→乙未→丙申→丁酉 が不変。

---

### 補足（発注者メモ）
- 発注者の Netlify Drop は私的な動作確認用で本番には関与しない。**本番はエンジニアが Google 基盤で構築**。デモ段階は一切公開しない。
- ユーザー情報・マイページの保管/運用はエンジニアに一任。個人情報の扱いは `privacy-pro.html` と整合させること。
