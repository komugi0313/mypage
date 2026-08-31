# Pocket本格鑑定 — バックエンド引き継ぎ仕様書（エンジニア向け）

**目的**：フロントエンド（PWA / Capacitorアプリ）は実装済み。本書は、エンジニアが **バックエンド（サーバーレス関数・課金・環境変数・ストア連携）** を引き継いで本番稼働させるための仕様をまとめたものです。

対象読者：Node.js / Netlify Functions / モバイルIAP の基礎知識がある方。
運営：72k株式会社。連絡先：info@72k.ai

---

## 0. まず最初にやること（TL;DR）

1. Netlify に環境変数を設定（§6）— 最低限 `GEMINI_API_KEY`。課金を動かすなら Apple/Google の認証情報も。
2. App Store Connect / Google Play Console で **サブスク商品**を作成し、商品IDを `PK_PRODUCTS`（サーバー）と `index.html` の `PK_PRODUCTS` に一致させる（§5, §7）。
3. Capacitor アプリに **`window.PKIAP`**（購入・復元の橋渡し）を実装（§5.3）。
4. サンドボックスで購入→復元→レート制限をテスト（§11）。
5. **`PK_TRUST_CLIENT_PLAN` は本番では未設定**にする（開発時のみ true）。§4.3 / §10。
6. 過去にチャットへ露出した Gemini APIキーは**無効化・再発行**してから設定。

---

## 1. アーキテクチャ概要

```
[ Capacitor アプリ / PWA (index.html) ]
   |  ①鑑定チャット          → POST /api/gemini            → [Netlify Fn gemini.js]        → Gemini API
   |  ②購入/復元             → POST /api/verify-purchase   → [Netlify Fn verify-purchase] → Apple/Google 検証
   |  ③ローカル通知/ストリーク → 端末内のみ（サーバー不要）
                                        |
                                 [Netlify Blobs] （日次カウンタ・エンタイトルメント・エラー集計）
```

- **鑑定AIはGeminiのみ**。命式（四柱推命）の計算は端末内 `pro-bazi.js`（tyme4tsエンジン）で確定計算し、AIには計算させない（AIは読み解き文の生成のみ）。
- **課金の可否・プランはサーバーが決める**。クライアントの自己申告は信用しない（§4.3）。
- APIキーはサーバー（環境変数）にのみ置き、ブラウザに出さない。

---

## 2. 技術スタック

| 層 | 使用技術 |
|---|---|
| フロント | 静的HTML/JS（フレームワーク非依存）+ PWA(Service Worker) + Capacitor(ネイティブラッパー) |
| サーバー | Netlify Functions（Node.js）|
| 永続化 | Netlify Blobs（KV。ストア名 `pk-usage`）|
| AI | Google Gemini API（`generativelanguage.googleapis.com`）|
| 課金 | App Store / Google Play のアプリ内課金（IAP）|

---

## 3. ファイル構成（バックエンド関連）

```
/functions
  gemini.js           … 鑑定AIの中継＋レート制限＋エンタイトルメント読取（本番稼働中の中核）
  verify-purchase.js  … IAPレシート検証→エンタイトルメント書込（要・認証情報設定）
netlify.toml          … /api/* → /.netlify/functions/* のリダイレクト
/index.html           … フロント本体（PKIAP契約・pkBuy/pkRestore・通知・ストリーク・月/年トグル等）
pkiap-adapter.js      … IAPアダプタの雛形（cordova-plugin-purchase / RevenueCat。Capacitorビルドで読み込む）
SPEC.md               … 本書
```

---

## 4. バックエンド仕様

### 4.1 `functions/gemini.js`（鑑定AI中継）

**エンドポイント**：`POST /api/gemini`（→ `/.netlify/functions/gemini`）

**リクエスト**：Gemini の `generateContent` ボディ（`{systemInstruction, contents, generationConfig}`）をそのまま。加えて以下のヘッダ：

| ヘッダ | 意味 |
|---|---|
| `x-pk-device` | 端末ID（カウントの単位。アプリ版はOS端末ID）|
| `x-pk-deep` | `'1'`＝本格鑑定(DEEPモデル・課金枠を消費) / それ以外＝雑談・理屈(LITE・無料) |
| `x-pk-plan` | クライアントの申告プラン。**本番では無視**（§4.3）。開発時 `PK_TRUST_CLIENT_PLAN=true` の時だけ使用 |
| `x-pk-classify` | `'1'`＝話題分類用の軽量呼び出し。カウントしない |
| `x-pk-logic` | `'1'`＝理屈（なぜ？）。現状サーバーは特別扱いせずLITE（無料）として処理 |
| `x-pk-admin` / `x-pk-refund-*` | 運営用の手動返金（§10.4）|

**処理の流れ**：
1. オリジン/入力長チェック（`MAX_BODY=12000`、全体900KB上限）。
2. **プラン解決**：`ent:<device>` を読み、有効な購読があればそのプラン、無ければ `free`（§4.3）。
3. **レート制限**（Blobs）：
   - 本格鑑定(`x-pk-deep=1`)で `dd:<day>:<device> >= lim.deep` → `429 {code:LIMIT, scope:'deep'}`（雑談・理屈は続行可）。
   - 総生成 `d:<day>:<device> >= lim.total` / IP `i:<day>:<ip> >= lim.ip` → `429`（bot・原価上限）。
4. **モデル選択**：`x-pk-deep=1` → `MODEL_DEEP`、それ以外 → `MODEL_LITE`。
5. Gemini 3.x 互換：`thinkingConfig.thinkingBudget:0` を除去し `maxOutputTokens` 確保。
6. **DEEP失敗時はLITEへ1回フォールバック**（ユーザーにエラーを見せない）。
7. **地域ブロック検知**：Geminiが「地域未対応」を返したら `451 {code:REGION}`（クライアントは購入導線を出さない）。
8. **カウント加算は「本文のある返答」が返った時だけ**（`hasAnswerText`）。空・ブロック・エラー・タイムアウトは**カウントしない**（＝ユーザーの回数が減らない）。
9. エラーは Netlify ログに出力＋急増時に Webhook 通知（§10.3）。

**日付基準**：`jstDay()`（JST）で日次カウンタをローテーション。

### 4.2 プラン・上限の設計（§利益率の根拠）

```js
const LIMITS = {
  free:     { deep: 5,  total: 20, ip: 90 },   // 無料お試し（3日で本格鑑定計15）
  standard: { deep: 4,  total: 16, ip: 150 },  // $19.99/月
  pro:      { deep: 8,  total: 32, ip: 250 },  // $39.99/月
  vip:      { deep: 14, total: 56, ip: 350 },  // $69.99/月
};
```
- `deep`＝本格鑑定(DEEPモデル)の1日上限。**原価の主因**。この上限が「手数料30%控除後も利益率≒62%」を守る予算天井。
- `total`＝雑談・理屈込みの1日総生成（LITE中心・bot対策＋原価天井）。
- 雑談・理屈は `deep` を消費しない＝「本格鑑定の枠を使い切っても雑談・理屈は続く」というLPの約束を実現。
- **実コスト前提**（2026年導入価格）：DEEP(gemini-3.6-flash) ≒ ¥1.4〜2.0/通、LITE(gemini-2.5-flash-lite) ≒ ¥0.17/通。
- ⚠️ **2027/1にDEEP値上げ（出力$3.75→$7.5）／2026/10にLITE(2.5-flash-lite)終了**予定。そのタイミングで上限か価格を再調整（§9）。

### 4.3 エンタイトルメント方式（セキュリティの要）

**方針**：プランは「サーバーが検証して書き込んだ購読記録」からのみ決定する。クライアントが `x-pk-plan: vip` と名乗っても無効。

- 保存：`ent:<device>` = `{ plan, exp(ミリ秒), platform, productId, txId, t }`（`verify-purchase.js` が書く）。
- `gemini.js` は毎リクエストでこれを読み、`exp > 現在` なら該当プラン、無ければ `free`。
- **開発用の抜け道**：環境変数 `PK_TRUST_CLIENT_PLAN='true'` のときだけ `x-pk-plan` を信用（実機なしでプラン切替を試すため）。**本番では必ず未設定**。
- 検証済み挙動：「VIPを名乗るだけ＝free(5回で停止)」「本物の`ent`あり＝VIP(14回)」。

### 4.4 `functions/verify-purchase.js`（IAP検証）

**エンドポイント**：`POST /api/verify-purchase`

**リクエスト**（クライアント→サーバー）：
```json
{ "platform": "ios" | "android",
  "productId": "pk_vip_monthly",
  "receipt":  "<iOS: base64レシート>",     // iOSのみ
  "token":    "<Android: purchaseToken>",  // Androidのみ
  "device":   "<x-pk-device と同じ端末ID>" }
```

**処理**：
- iOS：`verifyReceipt`（本番→サンドボックス自動フォールバック）で `latest_receipt_info` を検証、最新の `expires_date_ms` を採用。
  - ⚠️ `verifyReceipt` は将来非推奨。安定運用は **App Store Server API（JWS）** への移行を推奨（§13）。
- Android：サービスアカウントJWT→OAuthトークン→`purchases.subscriptions.get` で `expiryTimeMillis` / `paymentState` を検証。
- `PRODUCTS[productId]`（=`PK_PRODUCTS`）で商品ID→プランに変換。
- 有効なら `ent:<device>` を書込（`exp` は取得値＋2日の猶予）。無効/期限切れは `402`。

**レスポンス**：`{ ok:true, plan, exp }` / エラー時 `{ error }`。

⚠️ 現状は**サブスクの新規/更新をクライアント起点で検証**する実装。より堅牢にするなら **App Store Server Notifications V2 / Google RTDN（Pub/Sub）Webhook** を受けてサーバー主導で `ent` を更新する構成に拡張を（解約・返金・失効の即時反映のため）。§13。

### 4.5 Netlify Blobs キー設計（ストア名 `pk-usage`）

| キー | 値 | 用途 |
|---|---|---|
| `dd:<YYYY-MM-DD>:<device>` | `{n,t}` | 本格鑑定(DEEP)の日次カウント（課金枠）|
| `d:<day>:<device>` | `{n,t}` | 総生成の日次カウント |
| `i:<day>:<ip>` | `{n,t}` | IP日次カウント |
| `ent:<device>` | `{plan,exp,...}` | エンタイトルメント（購読状態）|
| `err:<YYYY-MM-DDTHH>` | `{n,t}` | 時間別エラー件数（アラート用）|
| `erralert:<hour>` | `{n,t}` | その時間帯の通知済みフラグ |

※ Blobs は Netlify の通常デプロイで自動有効。ローカル/手動zipではフェイルオープン（カウントせず動作）。

---

## 5. アプリ内課金（IAP）フロー

### 5.1 全体フロー
```
[プラン画面で「このプランにする」]
   → window.PKIAP.purchase(productId)   ← ネイティブのIAPプラグイン（要実装）
   → 受領した receipt/token を POST /api/verify-purchase
   → サーバーが Apple/Google に検証 → ent:<device> 書込
   → 以後 gemini.js が ent を読んでプラン上限を適用（クライアントの申告は不要）
[「購入を復元」]
   → window.PKIAP.restore() → 各購入を verify-purchase で再検証 → 最上位プランを適用
```

### 5.2 商品ID（サーバー `PK_PRODUCTS` とアプリ `PK_PRODUCTS` を一致させる）
```
standard: pk_standard_monthly / pk_standard_yearly
pro:      pk_pro_monthly      / pk_pro_yearly
vip:      pk_vip_monthly      / pk_vip_yearly
```
※ 実際のIDは自由。ストアで作ったIDに両方を合わせること。**月額/年額トグルは実装済み**（料金画面上部で切替、`_pkCycle` が `pkBuy(plan, cycle)` に渡る）。

### 5.3 `window.PKIAP` 契約（★エンジニアが実装）
```ts
window.PKIAP = {
  available(): boolean,                       // 購入可能な環境か
  purchase(productId: string): Promise<{      // 1商品を購入
    platform: 'ios' | 'android',
    productId: string,
    receipt?: string,   // iOS: App Store レシート(base64)
    token?: string,     // Android: purchaseToken
  }>,
  restore(): Promise<Array<{ platform, productId, receipt?, token? }>>, // 復元
};
```
未実装（Web/プラグイン無し）なら `available()===false` で「アプリ版でご利用ください」と案内される。

### 5.4 実装オプション（推奨と例）

★**アダプタのテンプレート `pkiap-adapter.js` を同梱**（cordova-plugin-purchase 版と RevenueCat 版の2実装。冒頭の `USE` を切替、プラグインの後に読み込む）。実機のプラグイン版差（レシートの取り出し方）だけ `★`印の箇所で要確認。

**オプションA（推奨・自前検証と相性が良い）: `cordova-plugin-purchase`（Capacitorで動作）**
```js
// 例（擬似コード）。store初期化後：
window.PKIAP = {
  available: () => true,
  purchase: (pid) => new Promise((res, rej) => {
    const p = CdvPurchase.store.get(pid); if(!p) return rej();
    p.getOffer().order();
    CdvPurchase.store.when().approved(t => {
      const isIos = CdvPurchase.Platform.APPLE_APPSTORE === t.platform;
      res({ platform: isIos?'ios':'android', productId: pid,
            receipt: isIos ? t.parentReceipt.nativeData?.appStoreReceipt : undefined,
            token:   !isIos ? t.transactionId /* purchaseToken */ : undefined });
      t.verify(); t.finish();
    });
  }),
  restore: () => { CdvPurchase.store.restorePurchases(); /* approvedを集めて返す実装に */ return Promise.resolve([]); },
};
```
→ この場合 `verify-purchase.js` がそのまま活きる。

**オプションB: RevenueCat（`@revenuecat/purchases-capacitor`）**
- RevenueCat が受領検証とエンタイトルメント管理を代行する。その場合、`verify-purchase.js` の代わりに
  **RevenueCat Webhook → 自前サーバー → `ent:<device>` 更新**、または購入後に
  RevenueCat REST API で entitlement を確認して `ent` を書く構成にする（`device` と RevenueCat の appUserID を一致させる）。
- 手離れは良いが従量課金あり。どちらを採るかはエンジニア判断。

---

## 6. 環境変数一覧（Netlify: Site settings → Environment variables）

| 変数 | 必須 | 用途 |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Gemini APIキー（ブラウザに出さない）|
| `GEMINI_MODEL` | 任意 | LITEモデル差し替え（既定 `gemini-2.5-flash-lite`。2026/10終了予定→要移行）|
| `GEMINI_MODEL_DEEP` | 任意 | DEEPモデル差し替え（既定 `gemini-3.6-flash`）|
| `URL` | 任意 | サイトURL（オリジンチェック・通知本文）※Netlifyが自動設定 |
| `APPLE_SHARED_SECRET` | 課金(iOS) | App内課金の共有シークレット |
| `GOOGLE_SA_EMAIL` / `GOOGLE_SA_KEY` / `ANDROID_PACKAGE` | 課金(Android) | Play Developer API のサービスアカウント |
| `PK_PRODUCTS` | 課金 | 商品ID→プランのJSON（例 `{"pk_standard_monthly":"standard",...}`）|
| `PK_ALERT_WEBHOOK` | 任意 | エラー急増の通知先（Slack/Discord Webhook）|
| `PK_ALERT_THRESHOLD` | 任意 | 通知するエラー件数/時（既定8）|
| `PK_ADMIN_TOKEN` | 任意 | 運営用の手動返金トークン（長いランダム文字列）|
| `PK_TRUST_CLIENT_PLAN` | 開発時のみ | `'true'` で `x-pk-plan` を信用（**本番は未設定**）|

---

## 7. ストア設定手順（概要）

**共通**：サブスクグループを作り、standard/pro/vip × 月/年 の商品を作成。IDを `PK_PRODUCTS` に一致。
**iOS**：App Store Connect → App内課金 → 「App用共有シークレット」を発行 → `APPLE_SHARED_SECRET`。
**Android**：Google Cloud でサービスアカウント作成 → Play Console でそのアカウントに「財務データ/注文の閲覧」権限付与 → 鍵JSONの `client_email`→`GOOGLE_SA_EMAIL`、`private_key`→`GOOGLE_SA_KEY`、パッケージ名→`ANDROID_PACKAGE`。
**規約**：価格・期間・自動更新は `legal.html`（利用規約§4-5・特商法）に記載済み。価格変更時は要更新。

---

## 8. プッシュ通知（クライアント実装済み・ネイティブ設定のみ確認）

- **Capacitor Local Notifications** を使用（`window.Capacitor.Plugins.LocalNotifications`）。サーバー不要。
- 「今日の運勢」を**端末内計算**で毎朝（14日先までスケジュール、開くたびに更新）＋**誕生日の朝**に祝い通知。全10言語。
- **通知設定UIは実装済み**：ユーザーが通知時刻を選択できる時刻ピッカー＋「今日の運勢」プレビュー付き（`pkNotifyOpen`）。選んだ時刻は `pk_notify`（`{on,hh,mm}`）に保存し `pkNotifyApply` が使用。
- エンジニア作業：`@capacitor/local-notifications` を導入し、iOS/Androidの通知権限とアイコン/チャンネルを設定。ID `7001〜7020`（毎日）と `7100`（誕生日）を使用。
- リモートプッシュ（サーバー起点の一斉配信）が必要になったら別途 FCM/APNs 構成を追加（現状は不要）。

---

## 9. Gemini モデル運用・コスト

- 現行：LITE=`gemini-2.5-flash-lite`（$0.10/$0.40 per1M）、DEEP=`gemini-3.6-flash`（$0.75/$3.75 per1M・2026年導入価格）。
- **暗黙キャッシュ**（同一システムプロンプト接頭辞）でDEEP入力コストが下がる前提で利益率≒62%（上限まで使い切っても）。
- **要対応スケジュール**：
  - 2026/10/16：`gemini-2.5-flash-lite` 終了 → 後継（例 3.1-flash-lite $0.25/$1.50）へ `GEMINI_MODEL` を切替。casualコストが上がるので上限/価格を再点検。
  - 2027/1/1：DEEP系が約2倍 → `LIMITS.deep` を下げるか価格改定で利益率維持。
- 障害時：`GEMINI_MODEL_DEEP` を安定モデルに差し替えて再デプロイで全世界に即時反映。

---

## 10. セキュリティ・運用

1. **APIキー**：`GEMINI_API_KEY` は環境変数のみ。過去にチャットへ露出したキーは無効化・再発行。
2. **エンタイトルメント**：`PK_TRUST_CLIENT_PLAN` は本番未設定（§4.3）。
3. **エラー監視**：`PK_ALERT_WEBHOOK` を設定すると、エラー急増（既定8件/時）でSlack/Discordに1回通知。Netlify Functions ログにも `[pk]` プレフィックスで出力。
4. **手動返金**（サポート対応。運営のみ）：
   ```
   curl -X POST "$SITE/api/gemini" -H "x-pk-admin: <PK_ADMIN_TOKEN>" \
        -H "x-pk-refund-device: <端末ID>" -H "x-pk-refund-n: 1" -d '{}'
   ```
   → 該当端末の本格鑑定カウントを当日ぶん戻す（`x-pk-refund-day: YYYY-MM-DD` で日指定可）。トークンは運営のみ保持＝利用者は悪用不可。
5. **誤課金の予防**：空応答・地域ブロック・エラー・タイムアウトは**カウントしない**実装済み（§4.1-8）。

---

## 11. テストチェックリスト（引き継ぎ後）

- [ ] `GEMINI_API_KEY` 設定 → チャットで鑑定が返る（10言語で日本語混入なし）。
- [ ] レート制限：free で本格鑑定5回→6回目 429、雑談・理屈は継続。
- [ ] エンタイトルメント：`ent` 無しで `x-pk-plan:vip` を送っても free 扱い。
- [ ] サンドボックス購入（iOS/Android）→ `verify-purchase` が `ent` を書く → 上限が上がる。
- [ ] 「購入を復元」で `ent` が復活。
- [ ] 解約/失効後、`exp` 経過で free に戻る。
- [ ] 地域制限国で 451/REGION が返り、購入導線が出ない。
- [ ] エラー急増時に Webhook 通知が来る。
- [ ] 端末IDのリセット悪用：アプリでlocalStorageを消しても無料枠が復活しない（OS端末ID使用）。

---

## 12. フロントエンド側で実装済み（参考・エンジニア作業不要）

- 四柱推命エンジン（tyme4ts, `pro-bazi.js`）による端末内・確定計算。
- 10言語UI・鑑定・ピル・つぶやき・エラー時の「回数は減りません」表示。
- 連続記録（ストリーク）＋通知（今日の運勢・誕生日）＝すべて端末内。通知設定UI（時刻ピッカー＋プレビュー）。
- 購入/復元UI（`pkBuy`/`pkRestore`）＋ `window.PKIAP` 契約＋**月/年トグル**。IAPアダプタ雛形 `pkiap-adapter.js`。
- 端末IDの堅牢化（`pkInitDeviceId`／OSの端末ID優先）。

---

## 13. 既知のTODO・拡張候補

- **ストアWebhook**（App Store Server Notifications V2 / Google RTDN）でサーバー主導の`ent`更新（解約・返金の即時反映）。現状はクライアント起点検証。
- iOS：`verifyReceipt` → **App Store Server API（JWS）** へ移行（将来非推奨対策）。
- **データの端末内保存のみ**：会話・記憶・（購入前の）状態は localStorage。機種変・再インストールで会話は失われる（購読はストア「復元」で回復可）。必要なら任意クラウド同期を検討。
- スケール時：Netlify Blobs から本格DB（Upstash Redis 等）への移行検討。
- 四柱推命の格局・調候（用神）は簡略（五行バランス＋喜神で代替）。精度をさらに上げる場合の拡張余地。

---

*本仕様書は現行コード（gemini.js / verify-purchase.js / index.html）に基づく。コード内コメントも併せて参照のこと。*
