# App Privacy (Apple) / Data safety (Google Play) — 回答表

privacy.html と完全に一致させた回答。フォーム入力時はこの表の通りに答える。
前提: アプリ本体はアカウント不要・誕生データは端末内保存。サーバーに渡るのは
(a) 鑑定生成時のチャート事実＋質問（一時的・保存しない）、(b) 任意の朝の手紙
申込（メール＋誕生データ＋任意プロフィール＋同意記録）、(c) 課金はストア側。
広告なし・トラッキングなし・データ販売なし。

---

## Apple「App Privacy」

**Do you or your third-party partners collect data from this app?** → **Yes**（手紙申込とAI鑑定のため）

| Data type | Collected? | Linked to identity? | Used for tracking? | Purposes |
|---|---|---|---|---|
| Contact Info → Email Address | **Yes**（朝の手紙に任意登録した場合のみ） | **Yes**（メール配信のため本人に紐づく） | No | App Functionality |
| User Content → Other User Content（誕生日時・出生地・質問文・任意プロフィール） | **Yes**（鑑定リクエスト時は一時送信・保存なし／手紙申込時はサーバー保存） | 手紙申込分のみ **Yes** | No | App Functionality |
| Identifiers | No（アカウントなし・広告IDなし） | — | — | — |
| Purchases | ストア（Apple）が処理。アプリ側での収集は **No**（RevenueCat導入時は Purchases → Yes / Linked / App Functionality に更新） | — | No | — |
| Location | No（出生地は住所検索でなく都市名の手入力。現在地は使わない） | — | — | — |
| Health & Fitness / Financial Info / Browsing / Search History / Contacts / Photos | No | — | — | — |
| Diagnostics | No（クラッシュ収集を入れる場合のみ Yes / Not linked / App Functionality） | — | — | — |

**Privacy Policy URL**: https://numinous.app/privacy.html

※「Sensitive Info」について: 出生性別（大運計算用）と任意の性自認・出身国は
ユーザーが自発的に入力する App Functionality 目的のデータ。Apple 分類では
Other User Content として申告し、privacy.html §6（利用制限・自己削除導線）を
根拠に説明できるようにしておく。

---

## Google Play「データセーフティ」

**データを収集または共有しますか？** → **収集: はい／第三者への共有: いいえ**
（AI言語プロバイダ・メール配信業者は「サービスプロバイダ」としての処理＝Play定義では共有に当たらない）

| 質問 | 回答 |
|---|---|
| 転送中の暗号化 | はい（すべて HTTPS/TLS） |
| 削除リクエスト手段 | はい（アプリ内データは端末削除で消去。手紙は各メールの「manage your data」リンクで任意プロフィール自己削除・unsubscribe で配信停止。メール窓口でも削除対応） |
| データ収集は任意か | メール・任意プロフィール: **任意**（手紙に登録した場合のみ）。誕生データ: 機能上必要（端末内）。 |

**収集データの内訳**

| カテゴリ | 種別 | 目的 | 共有 |
|---|---|---|---|
| 個人情報 → メールアドレス | 任意（手紙申込時のみ） | アプリの機能（毎朝の手紙配信） | なし |
| 個人情報 → その他（誕生日時・出生地・出生性別・任意の性自認/属性/出身国） | 手紙申込時のみサーバー保存／鑑定時は一時処理 | アプリの機能（チャート計算・手紙の宛名/文面） | なし |
| メッセージ → その他のアプリ内メッセージ（質問文） | 一時処理・保存なし | アプリの機能（鑑定文の生成） | なし |
| 財務情報 | 収集しない（Google Play 課金が処理） | — | — |
| 位置情報・連絡先・写真・健康情報・閲覧履歴・端末ID | 収集しない | — | — |

**広告**: なし ／ **広告ID**: 使用しない ／ **トラッキング**: なし ／ **データ販売**: なし

---

## 両ストア共通の注意

1. **回答と privacy.html を常に一致させる**。実装を変えたら両方更新（例:
   クラッシュ収集 SDK や RevenueCat を入れた時点で該当欄を Yes に変える）。
2. 手紙の同意記録（時刻・IP・同意文言バージョン）はサーバー保存している —
   Apple では App Functionality の範囲、Play では「その他」に含めて申告済み。
3. 18+（Apple 17+ レーティング）。子ども向けカテゴリには出さない。
