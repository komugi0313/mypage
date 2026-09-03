# Pocket本格鑑定 — エンジニア引き継ぎ書（iOS / Android アプリ化）

このドキュメントは、現行のWeb版（PWA）を **iOS / Android のネイティブアプリ**にするための引き継ぎ資料です。
アプリ化の設計・課金検証はすでにコードに組み込まれています。エンジニアの作業は「Capacitorで包む」＋「ストアと環境変数を繋ぐ」の2点です。

---

## 0. いま何があるか（現状）

| 区分 | 実体 | 説明 |
|---|---|---|
| フロント | `pocket_check/index.html`（単一HTML・約1.3MB内にJS/CSS） | チャットUI・四柱推命エンジン・多言語(10言語)・課金UI |
| 占いエンジン | `pro-bazi.js` / `pro-adapter.js` | 命式/大運/年運の計算（クライアント内で完結） |
| LP | `pocket_check/lp.html` | ランディングページ |
| 法務 | `pocket_check/legal.html` | 利用規約・プライバシー・特商法 |
| サーバー | `pocket_check/functions/*.js`（Netlify Functions） | AI中継・レート制限・課金レシート検証 |
| PWA | `sw.js` / `manifest.webmanifest` | オフライン・ホーム追加 |
| IAPブリッジ | `pkiap-adapter.js` | ネイティブのアプリ内課金を `window.PKIAP` に束ねるテンプレ（**要実装差し込み**） |
| 仕様書 | `pocket_check/SPEC.md` | 全体仕様 |

**バックエンドはWeb・アプリ共通**。アプリ版もHTMLを端末にバンドルしつつ、AI・課金検証は同じNetlify FunctionsをHTTPSで叩きます。

---

## 1. 推奨構成：Capacitor でラップ

WebView型（Capacitor）を推奨。理由：単一HTMLのフロントをそのまま同梱でき、IAPブリッジ(`window.PKIAP`)と受信検証(`verify-purchase.js`)が既に対応済みだから。

```bash
# 例（プロジェクト直下で）
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Pocket本格鑑定" ai.72k.pocketkantei --web-dir=pocket_check
npx cap add ios
npx cap add android
npx cap sync
```

- `--web-dir` は Web資産（`index.html` などのあるフォルダ）を指す。`pocket_check/` をそのまま同梱でOK。
- `index.html` は先頭で `window.Capacitor` を見て**ネイティブ時はIAP導線／Web時はWeb決済案内**に自動で切り替わる（index.html 内で実装済み）。

### AI・課金サーバーの向き先
アプリ内の資産は静的だが、`/api/gemini` と `/api/verify-purchase` は **本番NetlifyのURL**（絶対URL）に向ける必要がある。相対パスのままだとネイティブ(`capacitor://`)で解決できないため、**本番URLを埋め込むか、環境で切り替える**こと（下記「作業チェックリスト」参照）。iOSはATS、Androidは `network_security_config` で当該ドメインのHTTPSを許可。

---

## 2. アプリ内課金（IAP）— ここが肝

### 2-1. `window.PKIAP` を実装（`pkiap-adapter.js`）
- `pkiap-adapter.js` は **cordova-plugin-purchase 版（`USE='cdv'`）** と **RevenueCat版（`USE='rc'`）** の2実装テンプレ。**`cdv` 推奨**（既存の `verify-purchase.js` がそのまま活きる）。
- Capacitorビルドに IAPプラグインを入れ、`index.html` の後に `pkiap-adapter.js` を読み込む。
- プラグインのバージョンでレシート/トークンの取り出し方が変わる。ファイル内の **★印コメントの箇所を実機で確認**すること。

### 2-2. ストアに商品を作る（IDは完全一致・厳守）
App Store Connect と Google Play Console の両方に、以下6つの**自動更新サブスク**を作成：

```
pk_standard_monthly   pk_standard_yearly
pk_pro_monthly        pk_pro_yearly
pk_vip_monthly        pk_vip_yearly
```

価格（税込・現地通貨はストア設定）：
- Standard 月 $19.99 / 年 $214.99
- Pro 月 $39.99 / 年 $429.99
- VIP 月 $69.99 / 年 $749.99

> ⚠️ 商品IDは `index.html` / `pkiap-adapter.js` / `functions/verify-purchase.js` の3箇所と一致必須。変える場合は3箇所すべて。

### 2-2b. ★各国価格の下限（利益率60%を全世界で守るための最重要設定）
App Store / Google Play は基準価格から**各国の価格を自動生成**する。新興国やPPP(購買力平価)適用で **USD換算が大幅に安くなる国** が多数出るが、**原価はどの国でも同じ**（本格鑑定の月間プールを消費）ため、安すぎる国は利益率60%を割る（赤字化もあり得る）。

**60%を保てる下限（原価¥4/通・手数料30%・¥150/$想定）：**

| プラン | 想定価格 | 60%下限 | 各国の最低ライン推奨（税・変動の余裕込み） |
|---|---|---|---|
| Standard | $19.99 | ≈$17 | **$20** |
| Pro | $39.99 | ≈$35 | **$40** |
| VIP | $69.99 | ≈$59 | **$65** |

**やること：**
- Google Play：**地域別自動割引/PPP提案をそのまま採用しない**。各国価格を上表の最低ライン以上に手動設定。
- App Store：自動生成された各国価格マトリクスをレビューし、安すぎる国を底上げ。
- 現地VAT/源泉税で手取りが減る国があるので**下限に+15%程度の余裕**。
- どうしても下限を割る国は「**その国では配信しない**」か「赤字覚悟で参入」を明示的に選択（60%絶対なら前者）。
- ※これはコードではなく**ストア管理画面の価格設定**。実測原価が下がれば下限も下げられる（本文5章・原価計測ログ参照）。

### 2-3. サーバー検証（実装済み・環境変数だけ）
`functions/verify-purchase.js` が Apple(`verifyReceipt`, sandbox自動フォールバック) と Google(`androidpublisher`) を検証し、**正当なレシートのときだけ**サーバー側エンタイトルメント(`ent:<device>`)を書く。クライアントの自称プランは信用しない設計。必要な環境変数は下表。

> ⚠️ ストア手数料30%は料金設計に織り込み済み（利益率60%以上を維持する上限に調整済み）。**iOS/Androidアプリ内ではクレジットカード/Web決済は使えない**（ストア規約でIAP必須）。Web版のみ Telecom/カード決済が使える。

---

## 3. 本番 環境変数チェックリスト（Netlify）

| 変数 | 用途 | 必須 |
|---|---|---|
| `GEMINI_API_KEY` | Gemini APIキー（**サーバーのみ**・絶対にクライアントへ出さない） | ✅ |
| `APPLE_SHARED_SECRET` | Apple サブスク検証 | iOS課金時 ✅ |
| `GOOGLE_SA_EMAIL` / `GOOGLE_SA_KEY` | Google サービスアカウント（androidpublisher権限） | Android課金時 ✅ |
| `ANDROID_PACKAGE` | Androidパッケージ名（例 `ai.72k.pocketkantei`） | Android課金時 ✅ |
| `PK_TRUST_CLIENT_PLAN` | **本番では未設定のまま**（設定するとタダVIP穴が開く） | ✅ 未設定 |
| `PK_ADMIN_TOKEN` | 手動返金など運営操作用（任意） | 任意 |
| `PK_ALERT_WEBHOOK` | エラー急増のSlack/Discord通知（任意） | 任意 |
| `PK_PRICE_IN/OUT/CACHE` `PK_FX_JPY` | 原価計測の単価上書き（任意） | 任意 |
| `PK_TELECOM_ENABLED` | Web決済(Telecom)を使う場合のみ `1` | 任意 |

`netlify.toml` は `/api/gemini` と `/api/verify-purchase` をルート済み。Web決済を使うなら `/api/verify-telecom` のルート追加が必要。

---

## 4. リリース前チェックリスト（運営＝オーナー側）

- [ ] Gemini APIの**課金を有効化**（無料枠だと「アクセスが集まって」が頻発）
- [ ] 開発で使ったAPIキーを**ローテーション（再発行）**
- [ ] 上記の**本番環境変数を設定**（特に `PK_TRUST_CLIENT_PLAN` は未設定）
- [ ] **実購入を1件テスト**（Sandbox → 本番、Apple/Google 両方）
- [ ] 原価の実測：数日運用し Netlify Functions ログの `[pk-cost] …≈¥N/通` を確認 → 月間上限を最終決定
- [ ] ストア審査提出物（プライバシー、サブスク説明、スクショ、年齢区分）

---

## 5. エンジニアの作業サマリ（これだけ）

1. **Capacitorで包む**（`ios/` `android/` 生成、`pocket_check/` を web-dir に）
2. **IAPプラグイン導入 → `pkiap-adapter.js` を差し込み**（`USE='cdv'`、★箇所を実機確認）
3. **APIの向き先を本番Netlify URLに**（ATS / network_security_config でHTTPS許可）
4. **ストアに6商品を作成**（ID厳守）＋ サーバー環境変数を設定
5. **署名・ビルド・審査提出**（App Store / Google Play）

不明点は `pocket_check/SPEC.md`（全体仕様）と `pkiap-adapter.js` 冒頭コメントを参照。課金の検証ロジックは `functions/verify-purchase.js`。

---

## 6. 触ってはいけない/注意

- **鑑定プロンプト・出力ロジック**（`buildSystemPrompt` ほか）は完成済み。品質に直結するので不用意に変えない。
- **`GEMINI_API_KEY` をクライアント（HTML/JS）へ絶対に書かない**（体験モードの直キーは開発専用）。
- **`PK_TRUST_CLIENT_PLAN` を本番で有効化しない**（サーバー検証を無効化＝タダ乗り穴）。
- 商品IDを変えるときは3ファイル同時に。
