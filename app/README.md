# 四柱推命PRO — アプリ化（Capacitor）土台

`pro/`（本番Web）を **そのまま iOS / Android アプリに包む** ための最小構成です。
Web本体（`pro/`）のソースは一切変更しません。同じ1コードを Web・iOS・Android の3面に出せます。

- **Web配信**：これまで通り `pro/` を Netlify にドラッグ&ドロップ（この `app/` は含めない）。
- **アプリ**：この `app/` フォルダで `pro/` をコピー→ネイティブ化。

---

## 1. 前提（あなたのPCに必要なもの）

| 対象 | 必要なもの |
|---|---|
| 共通 | Node.js LTS（18以上）、`npm`、`perl`（macは標準搭載） |
| iOSアプリ | **macOS** ＋ Xcode ＋ CocoaPods（`sudo gem install cocoapods`）／Apple Developer Program（年 $99） |
| Androidアプリ | Android Studio ＋ JDK 17／Google Play Console（初回 $25） |

> iOSのビルドは Mac が必須です（Windows/Linux不可）。Android は各OSで可能。

---

## 2. 初回セットアップ（この順に実行）

```bash
cd app

# (a) アプリIDと表示名を決める（★提出前に必ず変更）
#     capacitor.config.json の "appId" を自分の逆ドメインに:
#       例) "jp.co.あなたの屋号.shichupro"  ← 英数字とドットのみ。後から変えると別アプリ扱いになるので最初に確定。

# (b) 依存をインストール
npm install

# (c) 本番URLを指定して pro/ を www/ に取り込み（★AI・同期が動くために必須）
SITE_URL=https://あなたの本番.netlify.app npm run sync:web

# (d) ネイティブプロジェクトを生成
npm run add:ios       # Macのみ
npm run add:android

# (e) ネイティブへ反映
npx cap sync

# (f) 各IDEで開いて実機/シミュレータへ
npm run open:ios      # Xcode が開く → ▶ で起動
npm run open:android  # Android Studio が開く → ▶ で起動
```

---

## 3. Web を更新したら（アプリへ反映）

`pro/` を直したあとは、`app/` で次を実行するだけ：

```bash
cd app
SITE_URL=https://あなたの本番.netlify.app npm run sync   # = sync:web + cap sync
```

そのあと Xcode / Android Studio で再ビルド。ストアに出す変更なら審査が要ります
（軽微なWeb修正はサーバー側だけ更新すればアプリの表示も追随します＝下の注記）。

> `sync:web` は毎回 `www/` を作り直します。`www/` は自動生成物なので Git 管理外（`.gitignore` 済み）。

---

## 4. ★重要：アプリからバックエンド（AI鑑定・同期）を使うための注意

`pro/functions/gemini.js` には **オリジン許可**（`process.env.URL` と一致しない Origin は403）があり、
かつ CORSヘッダを返しません。アプリのオリジンは `https://localhost` / `capacitor://localhost` なので、
**素のままでは 403 / CORS で AIが動きません**。

本構成はこれを **`capacitor.config.json` の `CapacitorHttp: { enabled: true }`** で解決しています：

- fetch が **ネイティブ通信**になり、WebViewのCORS制約を受けません。
- ネイティブ要求は Origin ヘッダを送らないため、`gemini.js` の
  `if (site && origin && !origin.startsWith(site))` を **素通り**します（origin が空＝許可）。

これで **サーバー（Netlify Functions）は無改修**のままアプリから使えます。

### もし将来 `403 ORIGIN` が出た場合の保険（サーバー側1行追加）
環境によってネイティブがOriginを付けることがあります。その時だけ、
`pro/functions/gemini.js`（および `mypage-get.js` / `mypage-put.js` / `auth-login.js` が同様の判定を持つ場合）の
オリジン判定に、アプリのオリジンを明示許可します：

```js
const site = process.env.URL || '';
const origin = event.headers.origin || event.headers.referer || '';
const APP_OK = /^(https?:\/\/localhost|capacitor:\/\/localhost|ionic:\/\/localhost)/.test(origin);
if (site && origin && !APP_OK && !origin.startsWith(site)) {
  return json(403, { error: { code: 'ORIGIN', message: 'Forbidden' } });
}
```

（Webの挙動は不変。アプリのオリジンだけ追加で通す。適用後 Netlify を再デプロイ。）

---

## 5. アプリアイコン・スプラッシュ

`pro/` に素材があります（`icon-512.png` / `icon-maskable-512.png` / `apple-touch-icon.png` / `logo.png`）。
`@capacitor/assets` で一括生成できます：

```bash
cd app
mkdir -p assets
# 1024×1024 のアイコンを用意（icon-512 を拡大 or ロゴから作成）→ assets/icon.png
# 任意でスプラッシュ 2732×2732 → assets/splash.png
npx @capacitor/assets generate            # ios/android のアイコン・スプラッシュを自動生成
```

---

## 6. ストア提出前チェック

**Apple（App Store）**
- [ ] `appId` を本番の逆ドメインに変更済み
- [ ] Apple Developer 登録（$99/年）・署名（自動署名でOK）
- [ ] 定期購読を **App内課金(IAP)** として作成（サブスク商品・価格 ¥9,800/月）
- [ ] **アカウント削除の導線**（App内から退会できること＝必須要件）
- [ ] 利用規約・プライバシー・特商法のURL（`pro/` のランディングにリンク有り）
- [ ] App Privacy（データ利用申告）／審査用デモアカウント

**Google（Play）**
- [ ] Play Console 登録（$25 初回）・パッケージ名 = `appId`
- [ ] 定期購読商品（¥9,800/月）
- [ ] データセーフティ申告・プライバシーポリシーURL
- [ ] 対象年齢・コンテンツレーティング

---

## 7. 課金（IAP）について

- ストア配信のアプリで **デジタル定期購読を売る場合は、原則 各社のIAPが必須**（手数料15%）。
  アプリ内でテレコムクレジット等の外部決済に直接誘導するのは規約違反になり得ます。
- **Webでの契約は5%手数料**で済むため、アプリには「Webでも登録できます」程度の
  **中立的なWeb登録導線**を置くと、利益率を平準化できます（反ステアリング規約に配慮した表現で）。
- 実装は本土台の次フェーズ（`@revenuecat/purchases-capacitor` などで iOS/Android のIAPを共通化するのが定番）。

---

## 8. データ保存（アプリ側の利点）

WebView の `localStorage` は **ネイティブアプリでは消えません**（iOS Safari/PWAの「7日未使用で削除」に当たらない）。
= 顧客カルテ・鑑定メモが安定して残る、というのがアプリ版の実利です。
将来さらに堅くするなら `@capacitor/preferences`（ネイティブKVS）へ移行も可能（本土台には未搭載）。

---

## 9. ファイル構成

```
app/
├─ capacitor.config.json   … appId/appName/webDir、CapacitorHttp有効化
├─ package.json            … Capacitor依存とスクリプト
├─ scripts/sync-web.sh     … pro/→www/ コピー＋APIベース書換＋SW無効化
├─ README.md               … このファイル
├─ .gitignore              … www/・node_modules/・ネイティブ生成物は管理外
├─ www/                    … 生成物（pro/のアプリ用コピー。コミット不要）
├─ ios/                    … npx cap add ios で生成（Xcodeプロジェクト）
└─ android/                … npx cap add android で生成（Android Studioプロジェクト）
```

> この `app/` は **Netlify のWeb配信には含めません**（Web配信物は `pro/` のみ）。
