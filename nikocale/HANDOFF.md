# ニコカレ 引き継ぎ仕様書（バックエンド実装依頼）

最終更新: 2026-09-26 ／ 対象リポジトリ: `komugi0313/mypage`（アプリ本体は `nikocale/`）

---

## 0. これは何か（30秒サマリー）

- **ニコカレ**＝四柱推命で「二人の相性（縁）」を **日めくりカレンダー**で見せる Web アプリ。恋人・友達・家族・自分用に対応。
- **フロントエンドは完成済み**。単一の `index.html`（約5,400行）に UI・ロジック・占いエンジンが入った静的サイト。
- **占い計算（四柱推命エンジン）は実装・検証済みで、変更不要**。
- お願いしたいのは **バックエンドの実装（認証・DM・データ保存・メール送信・ホスティング）だけ**。
- フロントは差し替えやすいよう **独立モジュール化済み**。該当箇所を本物のバックエンドに繋げば動きます（コード内コメントに「本番は Firebase に委譲」と明記）。

**この依頼のゴール**: 現状のモック（`localStorage` による端末内の擬似実装）を、実際に動くクラウドバックエンドに置き換える。UI や占いロジックは原則さわらない。

---

## 1. 現在の構成 / ファイル

```
nikocale/
├─ index.html         … アプリ本体（UI＋ロジック＋埋め込みエンジン）
├─ engine.js          … 四柱推命エンジン（スタンドアロン版・検証用）
├─ daily-engine.js    … 日運エンジン（スタンドアロン版・検証用）
├─ tools/sync-engines.js … index.html 内の埋め込みエンジンと上記2ファイルの一致を検査
├─ sw.js              … Service Worker（オフライン対応・PWA）
├─ manifest.json      … PWA マニフェスト
├─ _headers           … Netlify 用ヘッダー（HTML を no-store に）※ホスティングは Netlify 想定
├─ terms.html / legal.html … 利用規約 / プライバシー
├─ icon-192/512.png, ogp*.png, promo*.png … アイコン・OGP・バナー
└─ img/mascot/        … 60干支キャラ画像（webp）
```

- **技術**: 依存ライブラリ・ビルド不要のバニラ JS。CSS はカスタムプロパティでテーマ切替（`data-pal` / `data-theme`）。
- **エンジンの二重管理**: `index.html` 内の埋め込みエンジンと `engine.js`/`daily-engine.js` は同一内容。編集時は `node tools/sync-engines.js --check` で一致を必ず確認（現状パス）。**バックエンド実装ではエンジンを触らないので基本無関係**。
- 占い計算は `window.PersonBazi(...)` / `window.KE` を通じて利用。**サーバー側でも同じ結果を出せる**よう `daily-engine.js` に DOM 非依存の `generateDaily()` を用意済み（メール配信等に流用可）。

---

## 2. 差し替えポイント（重要）— フロントの繋ぎ口

フロントは以下の**独立モジュール**越しにデータへアクセスします。**この内部だけを本物のバックエンドに置き換えればよく、UI 側の呼び出しは変えなくて済む**設計です。

### 2-1. 認証：`Auth` / `window.NicoAuth`（`index.html` 内）
現状は `localStorage`（`dc_auth_users` / `dc_auth_session`）のモック。パスワードは簡易ハッシュのみ＝**本番では必ず実認証に置換**。

| メソッド | 役割 | 本番でやること |
|---|---|---|
| `register(email, password)` | 新規登録 | 実際のアカウント作成＋**確認メール送信** |
| `login(email, password, remember)` | ログイン | 実認証 |
| `logout()` | ログアウト | セッション破棄 |
| `resend()` | 確認メール再送 | 実送信 |
| `changeEmail(newEmail)` | メール変更 | 変更＋再確認メール |
| `markVerified()` | 確認済みにする | **確認リンク経由で**サーバーが実行 |
| `resetPassword(email, password)` | パスワード再設定 | **再設定リンクをメール送信**する方式へ |
| `saveProfile({sex, age})` | プロフィール保存 | サーバー保存 |
| `current()` | 現在ユーザー取得 | セッションから取得 |

- 公開 API（UI が使う入口）: `window.NicoAuth = { current, open, onChange, demo, requireAuth, requireReal }`。**この形は維持**してください。
- ユーザーレコード形: `{ uid, email, emailVerified, profile:{sex, age}, createdAt, ref }`（`ref`＝紹介元。§2-3）。
- `demo@nicocale.app` は「登録せずに試す」デモ用アカウント。**未登録扱い**で、本登録が要る機能はブロックされる（`requireReal`）。この扱いは維持。

### 2-2. DM（チャット）：`ChatBackend` / `window.NicoChat`（`index.html` 内）
現状は `localStorage`（`dc_dm_<roomId>`）のモック。**`onSnapshot` 相当の簡易購読**まで実装済みなので、Firestore 等へそのまま対応づけ可能。

| メソッド | 役割 |
|---|---|
| `roomId(a, b)` | 2 者の一意ルームID（uid をソートして連結） |
| `list(roomId)` | メッセージ配列取得 |
| `send(roomId, msg)` | 送信（`{from, text, ts, kind?, ...}`） |
| `subscribe(roomId, cb)` | 受信購読（返り値は解除関数）→ **リアルタイム化のフック** |
| `markRead(roomId, uid)` / `readMap(roomId)` | 既読管理 |

- 相手（トーク相手）ストア: `dc_partners`。追加した相手だけを保持（見本の自動生成はしない仕様）。
- **自動返信は無効化済み**（デモの偽返信は出さない）。

### 2-3. 紹介アトリビューション：`window.NicoAttribution`（バイラル計測の土台）
| メソッド | 役割 |
|---|---|
| `pending()` | この端末が保持する「誰の招待で来たか」（`dc_ref`） |
| `myReferralLink()` | 自分の固定招待リンク（`?nf=<uid>`） |
| `clear()` | クレジット確定後のクリア用 |

- 招待リンク `?nf=` で来訪→ `dc_ref` に記録→ **登録時にユーザーレコードの `ref` に自動で刻まれる**。
- **本番でやること**: 登録時にこの `ref` をサーバーへ送り、**送り主に紹介クレジットを加算**。集計（誰が何人紹介したか）はサーバー側で実装。

### 2-4. 端末内データ（クラウドへ移すもの / 残すもの）
現状すべて `localStorage`。ログインユーザーに紐づけて**クラウド保存**すべきもの＝機種変で引き継ぎたいもの:

- **クラウドへ移す**: `dc_people`（保存した人）、`dc_partners`（DM相手）、`dc_dm_*`（チャット）、`dc_anniv::*`（記念日）、`dc_appts`（会う約束）、`dc_mychar`（自分のキャラ）、`dc_ref`（紹介元）、ユーザー/プロフィール。
- **端末ローカルのままで良い**: `dc_pal` / `dc_theme`（色・テーマ）、各種 UI 既読フラグ（`dc_cc_seen` / `dc_invite_seen` / `dc_genwelcome_seen` / `dc_hookHidden` 等）。

---

## 3. 実装してほしい機能（スコープ）

### 3-A. MVP（最初のリリースに必須）
1. **本認証**: メール＋パスワードの登録／ログイン／ログアウト、**確認メール送信・検証**、**パスワード再設定メール**、メール変更。
2. **プロフィール保存**（性別・年代）。
3. **DM**: 相手の追加、送受信、**リアルタイム受信**、既読。
4. **データのクラウド保存**（§2-4「移す」一式）＝**別端末・機種変で引き継げる**こと。
5. **公開（ホスティング）**: 独自ドメインで公開。HTML は `no-store`（`_headers` 準拠、Netlify 想定）。
6. **紹介アトリビューションの受け皿**: 登録時の `ref` を保存（数の集計は最小でよい）。

### 3-B. 後フェーズ（初期費用を抑えるため後回し可）
- 紹介数の**ダッシュボード/集計 UI**。
- **プッシュ通知**（DM 着信・記念日リマインド）。※PWA 土台あり。
- Google カレンダー等の**外部連携の作り込み**（現状はリンク生成のみ）。
- **海外・多言語対応**（韓国語 等）。※別途相談済み。フロントは日本語直書きのため i18n 化が必要。

### 3-C. 今回やらないこと（スコープ外＝見積りに含めない）
- 占いロジック／エンジンの変更。
- UI デザインの作り直し（微修正を除く）。
- ネイティブアプリ化（当面 PWA で運用）。

---

## 4. 推奨スタック（安く・速く・正確に、のための提案）

**Firebase または Supabase を強く推奨**（認証・DB・メール・ホスティングが一つに揃い、無料枠が大きく、サーバー運用が最小）。コード設計も Firebase 前提のコメントを持つ。

| 必要機能 | Firebase | Supabase |
|---|---|---|
| 認証・確認メール・再設定メール | Authentication | Auth |
| DM・データ保存（リアルタイム） | Firestore（`onSnapshot`） | Postgres + Realtime |
| ホスティング | Firebase Hosting | 静的は Netlify/Vercel でも可（`_headers` は Netlify 形式） |

- **`ChatBackend.subscribe` が既に onSnapshot 相当**なので、Firestore が最短。
- ホスティングは現状 `_headers` が **Netlify 形式**。Netlify + Supabase/Firebase の組み合わせでも可。

### データモデル案（Firestore 例）
```
users/{uid}                     … { email, emailVerified, profile:{sex,age}, createdAt, ref, referredCount }
users/{uid}/people/{id}         … 保存した人
users/{uid}/partners/{uid2}     … DM 相手
users/{uid}/annivs/{id}         … 記念日
users/{uid}/appts/{id}          … 会う約束
rooms/{roomId}/messages/{id}    … DM（roomId = 2 者 uid をソート連結）
rooms/{roomId}/read/{uid}       … 既読位置
```

---

## 5. 受け入れテスト（＝「完了」の条件）

以下がすべて通れば完了とみなす。**発注時にこの節を「検収条件」として明記**すると手戻りを防げます。

1. 新規登録すると**確認メールが届き**、リンクで有効化できる。
2. 間違ったメールで登録→**再送・アドレス修正**ができる。
3. ログイン／ログアウト／**パスワード再設定メール**が機能する。
4. 相手を追加し、**DM が双方向にリアルタイムで**届く（既読も反映）。
5. 記念日・約束・保存した人が保存され、**別の端末でログインしても引き継がれる**。
6. 招待リンク（`?nf=`）から登録した人の**紹介元が記録**される。
7. 独自ドメインで公開され、**HTML が常に最新**（キャッシュで古い版が出ない）。
8. `demo@nicocale.app`（登録なしお試し）は従来どおり動き、本登録必須機能はブロックされる。

---

## 6. 非機能・注意点

- **セキュリティ**: パスワードは BaaS の実認証に委譲（現状の簡易ハッシュは廃止）。個人情報保護法（PIPA/日本の個人情報保護法）に沿う。プライバシーポリシーは `terms.html`/`legal.html` にあり。
- **キャッシュ**: HTML は `no-store`（`_headers`）。Service Worker（`sw.js`, `VERSION`）はデプロイ時にバージョンを上げる運用。
- **コスト**: MVP は各 BaaS の無料枠でほぼ収まる規模想定。従量課金は DM/保存量に比例。
- **エンジン**: `tools/sync-engines.js --check` が通る状態を維持（エンジンを触った場合のみ関係）。

---

## 7. 発注のコツ（依頼者向けメモ）

- この仕様書を渡し、**§3 のスコープと §5 の検収条件で「固定金額」見積り**を依頼すると、予算が読みやすく手戻りが減ります。
- まず **§3-A（MVP）だけ**で見積り、§3-B は別フェーズに。これが最も安く早い進め方です。
- 事前に用意しておくと待ち時間が減るもの: **GitHub リポジトリの権限 / Google（Firebase）または Supabase アカウント / 独自ドメイン / ロゴ等の素材**。
