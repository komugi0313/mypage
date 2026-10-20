# Numinous — モバイル化（App Store / Google Play）手順書

現行の Web アプリ（`../app.html` 一式）を **Capacitor** でラップして両ストアに出す。
フル書き直しは不要。命式エンジン（`meishiban_pillars.html`）はアプリ内に同梱され
**端末内で**動く（チャート計算にサーバー不要・オフライン可）。

## 0. 前提

- Node 18+ / Xcode（iOS）/ Android Studio（Android）
- Apple Developer Program（法人・D-U-N-S 必要）と Google Play Console のアカウント（創業者が取得）
- 手紙 API ＋ AI プロキシがデプロイ済みであること（`../server/HANDOFF.md`）。
  **ストア版は BYOK（キー入力欄）のまま提出してはいけない** — 審査で確実に問題になる。

## 1. 初回セットアップ

```bash
cd clarity/mobile
npm install
npm run www                 # ../ から www/ を組み立て（app.html → index.html）
npx cap add ios
npx cap add android
```

`www/index.html`（= app.html のコピー）の `const BACKEND` を本番向けに:

```js
USE_PROXY: true,
PROXY_BASE: 'https://<デプロイしたAPIのURL>',
```

`const LETTERS = { BASE: 'https://<同上>' }` も設定（朝の手紙の申込先）。

以後の反映は `npm run sync`、IDE を開くのは `npm run ios` / `npm run android`。

## 2. アプリID・表示名

- appId: `app.numinous.mobile`（`capacitor.config.json`。Android は各セグメントが
  英字始まりである必要があるため `72k` を含む ID は不可）
- 表示名: Numinous

## 3. サブスクリプション（RevenueCat 推奨）

商品（両ストアに同一 SKU 名で作成）:

| SKU | 内容 |
|---|---|
| `numinous_pro_yearly` | $99.99/年・**3日間無料トライアル**（導入オファー・4日目から自動課金） |
| `numinous_pro_monthly` | $14.99/月・**3日間無料トライアル**（同上） |

ファネル（`app.html` の `gateReading()` 一式が実装済み・デモは localStorage 制御）:
1. 鑑定2回まで完全無料（メアド・カード不要）
2. ゲートPOP: メアド＋簡単アンケート → **毎朝6時の手紙**開始（無料・永続）
3. 続けてpaywall → **ストアでカード登録＝3日間無料トライアル開始**
4. 4日目からストアが自動課金（トライアル中の解約は請求ゼロ）
5. 解約してもアプリが止まるだけ。**手紙は配信継続**（停止は手紙内の1タップ解除）

ストア版はデモの localStorage 制御を**実レシート検証**に置き換えること
（`startTrial()`/`isPro()`/`trialActive()` が差し替えポイント）。

**鑑定回数の上限（創業者決定）**: トライアル中 **5回/日**・課金後 **30回/日**
（四柱推命＋易＋アドバイザーチャット合算）。サーバー側
`server/src/ai-proxy.js` に実装済み（env: `READING_DAILY_CAP_TRIAL` /
`READING_DAILY_CAP_PRO`）。**`resolvePlan()` をレシート／エンタイトルメント
照会に接続するまでは全員トライアル上限**になる設計（クライアント申告では
上限が上がらない＝安全側）。RevenueCat Webhook → `db.setPlan` と合わせて
セッショントークン→プラン解決を実装すること。

実装ポイント（`www/index.html` 内の既存フックに接続）:

- `startTrial()` — 現在は Web プレビュー用の `alert()`。ここを
  `Purchases.purchasePackage(...)` に差し替える
- `restorePurchases()` — `Purchases.restorePurchases()` に差し替え
- 購入状態 → `localStorage.setItem('clarity_session', …)` 等でアプリ側の Pro 判定に反映し、
  **RevenueCat の Webhook → 手紙サーバー `db.setPlan(id,'pro')`** で購読者側も同期
  （エンドポイントは `server/src/server.js` に追加。設計は HANDOFF 済み）

Apple 側: App Store Connect で自動更新サブスク＋3日無料トライアル（導入オファー）を作成し
Small Business Program（手数料 15%）を申請。Google 側: Play Console で定期購入＋
無料試用を作成。

## 4. ストア提出物

- 掲載文・キーワード・審査ノート: `../store/listing.md`
- App Privacy / データセーフティの回答: `../store/privacy-answers.md`
- アイコン・スクリーンショット・フィーチャーグラフィック: `../store/assets/`
- 年齢レーティング: 17+（Apple）/ それに相当（Play のアンケートで成人向け設定）
- サポート URL・プライバシー URL は公開サイト（numinous.app 配下）に必ず用意

## 5. 提出前チェックリスト

- [ ] `USE_PROXY: true`・`PROXY_BASE` 設定済み（キー入力欄が出ないこと）
- [ ] `LETTERS.BASE` 設定済み（手紙申込が実 API に届くこと）
- [ ] 課金: トライアル→課金→復元→解約の一周を TestFlight / 内部テストで確認
- [ ] terms/privacy の連絡先が実アドレス（`support@72k.example` のままは不可）
- [ ] チャート検証: 端末で誕生日を入れ、Web 版と同じ柱・強弱になること
- [ ] オフライン起動: チャートとカレンダーが表示されること（鑑定文はネット必要で OK）

## 6. 審査での立ち位置（重要）

Apple ガイドライン **4.3(b)** は「占い（fortune telling）アプリ」を飽和カテゴリに
指定しており、独自性がないと却下され得る。Numinous は
**「認定実践者の計算手法に基づく意思決定支援・自己省察ツール」**として提出する
（`../store/listing.md` の審査ノートに記載済み）。説明文・メタデータで
“fortune teller / psychic / horoscope” を名乗らないこと。
