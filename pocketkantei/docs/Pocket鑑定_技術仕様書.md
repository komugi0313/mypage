# Pocket鑑定（Pocket Kantei） 技術仕様書

**対象**: 本アプリの保守・拡張を担当するエンジニア
**最終更新**: 2026-08-21
**運営**: 72K株式会社（保津章一）／ info@72k.ai

---

## 1. 概要

四柱推命（BaZi）をベースにした、AIチャット型の占い（鑑定）アプリ。フクロウのキャラクター「Nico」が、ユーザーの生年月日時から算出した命式をもとに、多言語で「人生として言語化された」鑑定を返す。

- **提供形態**: 静的Webアプリ（SPA） → PWA化済み。将来的にCapacitorでネイティブアプリ化も想定。
- **対応言語**: 10言語（ja / en / zh / zt / ko / vi / es / pt / id / th）。
- **鑑定の核**: 四柱推命の計算は**クライアント内で決定論的に確定**（AIには計算させない）。AIは「確定した命式データ」を根拠に文章を生成するのみ。
- **課金**: Web版はテレコムクレジット（決済代行・クレジットカード継続課金）。プラン3段（980 / 1,980 / 2,980円 税込・月額）。

### 設計思想（最重要）
1. **計算はコード / 表現はAI**: 命式・大運・十二運・通変・五行・空亡・節木運などはすべてローカルの計算エンジンで確定。AIプロンプトには「確定データ」だけを渡し、AIには推論・計算をさせない。ハルシネーション（存在しない関係の捏造など）を構造的に防ぐ。
2. **安全は決定論 / 話題はAI（ハイブリッド）**: 自傷・重い相談の検知は正規表現で決定論的に判定。話題（恋愛/家族/仕事など）の意図解釈はAI分類器で補助。
3. **専門用語を出さない（既定）**: 通常の鑑定では干支・十神・五行などの専門用語を一切出さず、平易な言葉のみ。ユーザーが「理屈を知りたい」と明示した時だけ理論モードで専門用語を使う。

---

## 2. 技術スタック

| 層 | 技術 |
|---|---|
| フロント | 素のHTML/CSS/JavaScript（フレームワークなし・ビルドなし）。単一 `index.html` にUI・状態・プロンプト・ガードをすべて内包 |
| 四柱推命エンジン | `pro-bazi.js`（`window.PersonBazi`）＋ `pro-adapter.js`（アダプタ） |
| AI | Google Gemini（`gemini-2.5-flash-lite` / `gemini-3.6-flash`）。REST（`generateContent`） |
| サーバー | Netlify Functions（`functions/gemini.js`）＝ APIキー秘匿＋サーバー側レート制限。状態は Netlify Blobs |
| PWA | `manifest.webmanifest` ＋ `sw.js`（Service Worker） |
| 決済 | テレコムクレジット（Web・継続課金） |
| ホスティング | Netlify（静的＋Functions） |

**ビルド工程なし**: トランスパイル・バンドルなし。`index.html` を直接編集してデプロイ。ES5互換の書き方（`var`、function式）を基本とする。

---

## 3. ファイル構成

```
brand/
├── index.html               メインアプリ（UI・状態・鑑定パイプライン・プロンプト・ガード・全機能）※約886KB
├── pro-bazi.js              四柱推命計算エンジン（window.PersonBazi）
├── pro-adapter.js           エンジンのアダプタ層
├── bazi.js                  旧エンジン（現行 index.html は pro-bazi.js を使用。legacy）
├── lp.html                  ランディングページ（登録導線）
├── legal.html               利用規約・プライバシーポリシー・特定商取引法に基づく表記
├── manifest.webmanifest     PWAマニフェスト
├── sw.js                    PWA Service Worker（オフライン・キャッシュ）
├── owl.png                  Nicoアバター画像（透過PNG）
├── icon-192.png             PWAアイコン 192（any・角丸）
├── icon-512.png             PWAアイコン 512（any・角丸）
├── icon-maskable-512.png    PWAアイコン（maskable・フルブリード）
├── apple-touch-icon.png     iOSホーム画面アイコン（180）
├── favicon-32.png / favicon.ico
├── netlify.toml             Netlify設定（functions ディレクトリ・/api/gemini リダイレクト）
├── package.json             Functions用（@netlify/blobs 依存）
├── _headers                 Netlifyカスタムヘッダ
└── functions/
    └── gemini.js            サーバーレス中継＋レート制限
```

---

## 4. 四柱推命エンジン

### 4.1 計算
- `computeChart(profile)` が命式（`chart`）を確定。内部で `window.PersonBazi(...)`（`pro-bazi.js`）を呼ぶ。
- `profile` の形: `{ y, m, d, hh, mi, tu, sex, ... }`（tu = 時刻不明フラグ、sex = 'male'|'female'）。
- 真太陽時補正: 出生地（経度）を選択すると補正。未選択なら補正なし。海外都市も経度データを保持。

### 4.2 `chart` オブジェクト（主要フィールド）
- `chart.pro` … 詳細計算結果
  - `pillars[]` … 年月日時の4柱。各 `{ label, ganzhi, branch, terrain(十二運), tenStar(通変), hiddenStems, ... }`
  - `decadeFortunes[]` … 大運（10年ごと）。各 `{ startAge, endAge, startYear, ganzhi, branch, terrain, tenStar }`
  - `startFortune` … 立運 `{ years, months, forward }`（forward = 順行/逆行）
  - `annualFortunes[]` … 年運
  - `now` … 現在時点 `{ age, year, daeunIndex }`
  - `dayMaster` … 日主 `{ stem, element }`
- `chart.fav` … 用神（喜忌）。五行キー `{ 木:'喜'|'忌'|'中庸', 火:..., ... }`
- `chart.five` … 五行バランス

**重要**: 命式は同じ生年月日なら決定論的に一意。ポケット鑑定とPRO版（別エンジン）でも四柱・十二運・通変・大運・空亡が一致することを検証済み。

---

## 5. アプリ状態と永続化

### 5.1 メモリ状態 `state`
```js
var state = { lang:'ja', theme:'indigo', profile:null, sex:'female', esex:'female',
              chart:null, chartB:null, mode:'self', useCount:0, msgs:[] };
```
- `msgs[]` … 会話履歴。各 `{ role:'me'|'ai', text }`
- `mode` … 'self'（本人鑑定）| 'aisho'（相性）
- `chartB` … 相性相手の命式

### 5.2 localStorage キー
| キー | 用途 |
|---|---|
| `pk_profile` | 生年月日時プロフィール（JSON） |
| `pk_lang` | 選択言語 |
| `pk_theme` | テーマ（indigo/green） |
| `pk_seen_lp` | LP既読フラグ |
| `pk_mem` | Nicoの記憶（会話から抽出したユーザー情報） |
| `pk_tmsg` / `pk_tr0` / `pk_tru` | 会話・利用回数など |
| `pk_notify` | 毎日通知の設定 `{on, hour, minute}` |
| `pk_crisis_cd` | クライシス応答のクールダウン |
| `pk_key` | 体験モードのAPIキー（端末内のみ） |
| `pk_email` / `pk_uid` / `pk_survey` / `pk_svd` / `pk_svq` / `pk_svdraft` | 登録・アンケート |
| `pk_hiday` | 日次あいさつ管理 |

**サーバーDBなし**: 会話・プロフィールは端末内localStorageのみ。退会＝localStorage全削除。

---

## 6. 鑑定パイプライン（`answer(q)`）

ユーザー発話 `q` に対する処理フロー:

```
answer(q)
 ├─ classifyRisk(q)  … 決定論の安全判定（自傷/犯罪/性的/支配など）
 │    → crime/sex/control 等は即・定型の安全応答（AI非経由）
 ├─ _aiClassify(q)   … 軽量AI分類器（人物/関係の話題を判定）※LITEモデル・x-pk-classify（課金対象外）
 │    → window._aiTopicHint に格納（失敗時は正規表現の _classifyTopic にフォールバック）
 └─ _answerCore(q, risk)
      ├─ buildSystemPrompt()  … 命式データ＋ふるまいルールを組み立て（後述）
      ├─ Gemini呼び出し（モデルルーティング：smartフラグでLITE/DEEP）
      └─ ガードパイプライン（AI出力の後処理・浄化）
```

### 6.1 安全判定 `classifyRisk(q)`
- `RE_SELFHARM`（自傷念慮）、`RE_CRIME`、`RE_SEX`、`RE_CONTROL` 等の正規表現。
- 死別・自殺（他者）・過去の自殺未遂（生存）は `RE_BEREAVE_OTHER` / `RE_OWN_PAST_ATTEMPT` で「自傷」から除外（現在念慮 `RE_CUR_IDEATION` がある場合のみ selfharm 扱い）。
- 「十二運の死」「時柱が死」等は非自傷（占い用語）と判定。

### 6.2 話題分類（ハイブリッド）
- `_needsAiClassify(q)` が人物・関係語を含むと判定 → `_aiClassify(q)`（LITE・temperature:0・maxOutputTokens:300・4.5s timeout）。
- `_mapAiTopic(o,q)` が結果を topic にマップ。**決定論のサニティネット**あり（例: 夫/妻/彼＝本人の恋愛で家族ではない、を強制）。
- `_effectiveTopic(q)` … AIヒント優先、なければ正規表現＋継続性。

### 6.3 システムプロンプト `buildSystemPrompt()`
命式データを英語のデータブロック群＋ふるまいルールとして連結。主要ブロック:
`lifeArcBlock`（人生の弧＝十二運の生涯リズム）/ `setsubokuBlock`（節木運）/ `romanceBlock` / `loveMandateBlock` / `healthBlock`（五臓六腑・養生）/ `luckyBlock`（ラッキー色/食/装い/行動/石）/ `todayBlock`（今日の運勢）/ `topicFocus` / `_heavyRule`（重い相談）/ `crisisBlock`（クライシス）/ 文体・言語・専門用語禁止ルール ほか多数。

### 6.4 出力ガードパイプライン（順に適用）
AIの生出力から「思考漏れ・専門用語・内部ラベル・足場」などを除去:
```
_stripThinkLeak → _extractChips → _softenJargon(含 _softenTwelveStage) →
_stripInternalLabels → _stripScaffold → _stripLeadThink → _stripHan →
_stripPreamble → _stripFufu
```
- `_softenTwelveStage`: 十二運の「死・病・墓・絶・胎・衰」等の怖い文字を、意味を保ったまま安全な表現へ。
- `JARGON_WRAP`: 多言語の専門用語リスト（漏れ検知・浄化用）。
- チップ（サジェスト）は本文と分離して抽出。

---

## 7. AIモデル運用（ハイブリッド）

### 7.1 モデル
| 役割 | モデル | 用途 |
|---|---|---|
| LITE | `gemini-2.5-flash-lite` | 通常のカジュアル会話・分類器（安価・高速） |
| DEEP | `gemini-3.6-flash` | 恋愛・重い相談・決断・人生・韓国語など「品質が要る」質問 |
| （上位） | `gemini-3.1-pro-preview` | 最高品質・低速高コスト（任意） |

- クライアントは `x-pk-deep: '1'` を付けた時だけ DEEP を使う（`smart` フラグで判定：deep/back/offscope/恋愛/韓国語/決断/重い/自傷/Nico自身/人生 等）。
- **Gemini 3.x 注意**: `thinkingConfig.thinkingBudget:0` は 3.x で 400 エラー。3.x では送らない（サーバー側でも除去）。思考でトークンを消費するため `maxOutputTokens` を大きめ（3200〜4200）に確保。
- 分類器呼び出しは `x-pk-classify: '1'`（日次カウント対象外・常にLITE）。

### 7.2 クライアント直接接続（体験/デモ）
- `window.PK_DIRECT_KEY` があれば `generativelanguage.googleapis.com` に直接（開発・体験モード）。
- 本番は Netlify Function 経由（`/api/gemini` → `/.netlify/functions/gemini`）でキーを秘匿。

---

## 8. サーバーレス関数 `functions/gemini.js`

役割: **APIキー秘匿 ＋ サーバー側レート制限 ＋ モデルルーティング**。

- **モデル**: `MODEL_LITE`（env `GEMINI_MODEL` 既定 `gemini-2.5-flash-lite`）/ `MODEL_DEEP`（env `GEMINI_MODEL_DEEP` 既定 `gemini-3.6-flash`）。`x-pk-deep==='1'` で DEEP。
- **レート制限**: `x-pk-device`（端末ID）＋ IP を Netlify Blobs（`getStore('pk-usage')`）に日次カウント。上限超過で 429（Geminiを呼ばずAPI浪費防止）。`x-pk-classify==='1'` はカウント対象外。
  - 上限（`LIMITS`）: free = device5/ip40、light = 50/200、unlimited = 150/400（`x-pk-plan` で切替）。
- **413ガード**: リクエストのうち「最後のユーザー発話」が `MAX_BODY(12000)` 超で 413。全体 900,000 超でも 413。※システムプロンプトは正規に大きいので本文長で判定。
- **3.x互換**: `gemini-3` 系は `thinkingConfig` を除去し `maxOutputTokens` を確保。
- **DEEPフォールバック**: DEEP が失敗（課金枯渇429・5xx等）したら LITE に一度だけフォールバックし、必ず返答を返す（ユーザーにエラーを見せない）。
- **オリジンチェック**: `process.env.URL` と origin/referer を照合。

### 環境変数
| 変数 | 用途 |
|---|---|
| `GEMINI_API_KEY` | Gemini APIキー（**必須**・秘匿） |
| `GEMINI_MODEL` | LITEモデル上書き（任意） |
| `GEMINI_MODEL_DEEP` | DEEPモデル上書き（任意） |
| `URL` | サイトURL（Netlify自動・オリジンチェック用） |

---

## 9. 主要機能

| 機能 | 実装（主関数） | 概要 |
|---|---|---|
| チャット鑑定 | `answer` / `renderChat` | 本人の命式に基づく対話型鑑定 |
| 相性診断 | `doCompat` / `compatAnalysis` / `localCompat` / `compatGoodYears` | 二人の命式（干合/三合/方合/日支の合冲/五行補完/大運の重なり）で相性＋良い年を算出。オフライン鑑定あり |
| タイミング | プロンプト内（良い日/デート/告白/注意日） | 大運・年運・月運・日運から吉凶日を算出し誘導 |
| ラッキー要素 | `luckyBlock` / `todayBlock` | 喜神＋今日の五行から色/食/装い/行動/**石（パワーストーン）**を提案（毎日ローテ・文化ローカライズ） |
| 健康・養生 | `healthBlock` | 五行→五臓（肝心脾肺腎）→季節の養生。診断ではなくセルフケア |
| 節木運（人生の季節） | `setsubokuAnalysis` / `setsubokuBlock` | 大運を方合で30年の季節に束ね、季節（方合）が切り替わる大運＝人生の曲がり角（順行/逆行どちらも正しい）、喜神なら発展/忌神なら備え |
| 性格タイプ（シェアカード） | `pkShareCard` | 日主10種の性格タイプ名＋ほめ言葉。鑑定文を画像カード化してSNS共有 |
| 毎日の運勢通知 | `pkNotifyApply` / `pkNotifyOpen` | Capacitor Local Notifications（Webではグレースフル無効） |

### 9.1 性格タイプ（`STEM_TYPE_L10N`）
日主（十干）→ 10タイプ（🌳甲/🌿乙/☀️丙/🌟丁/⛰️戊/🌾己/🚀庚/💎辛/🌊壬/🌙癸）。専門用語を出さず、誰でも分かる「タイプ名＋一言」を10言語で表示。画像シェアカードのフッターに使用。

### 9.2 画像シェアカード（`pkShareCard`）
Canvasで生成（1080px幅）。ヘッダに Nico画像（`owl.png`）＋ブランド、本文に鑑定抜粋、フッターに性格タイプ。`navigator.share({files})`（Web Share Level 2）で共有、非対応時はダウンロードにフォールバック。AI通信の外で完結。

---

## 10. 多言語対応（i18n）

- UI辞書 `I18N`（`T()` / `pick()` で現在言語を取得）。10言語。
- AIプロンプト末尾に「Reply in {language}」を付与。プロンプト内のルールは英語＋各言語の例。出力は選択言語のみ（他言語の混入を禁止するルールあり）。
- 言語は起動時に `navigator.language` から自動判定 → `pk_lang`。
- 用語辞書・危機相談先・ラッキー要素・性格タイプ・干支動物などすべて10言語ローカライズ。

---

## 11. 安全設計（クライシス）

- **自傷検知**: `RE_SELFHARM` 該当時、`crisisBlock()` が最優先の応答指示をプロンプトに注入（傾聴優先・助言や占いをしない・各言語のヘルプライン提示）。
- **ヘルプライン `HELPLINE`**: 10言語×各国の実在窓口（日本 いのちの電話 / 米988 / 中国 / 台湾 / 韓国 / ベトナム / スペイン / ブラジル / インドネシア / タイ）。
- **重い相談 `_heavyRule`**: 死別・自殺（家族/友人）・過去の自殺未遂・虐待・望まない妊娠・不倫略奪等に、専用のふるまいルール（第三者の事情を捏造しない・断定しない・責めない）。
- **フォールバック `safeReply`**: AIが使えない時も安全に応答。

---

## 12. PWA

### 12.1 manifest.webmanifest
- `display: standalone`、`orientation: portrait`、`theme_color`/`background_color: #4E8060`、`start_url: ./index.html?src=pwa`、`scope: ./`。
- icons: `icon-192.png`(any) / `icon-512.png`(any) / `icon-maskable-512.png`(maskable)。

### 12.2 sw.js（Service Worker）
- `CACHE = 'pocket-kantei-v1'`。アプリシェル（index.html・エンジンJS・アイコン・manifest・legal）を precache。
- **キャッシュ戦略**:
  - HTML/ナビゲーション = **network-first**（再デプロイ後すぐ最新・圏外はキャッシュ）。
  - その他同一オリジン資産 = **stale-while-revalidate**。
  - **AI通信（`/functions/`・`/.netlify/`・`generativelanguage`）・外部オリジンは SW を通さない**（常にネットワーク）。
- **更新時**: アプリ更新後は `CACHE` の版番号を上げる（v1→v2）と確実に配信。
- 登録は `index.html` の起動末尾（`location.protocol` が http(s) の時のみ）。

---

## 13. 決済・法務

### 13.1 決済（Web版）
- **テレコムクレジット**（決済代行・クレジットカード継続課金）。
- プラン: おてがる 980円 / スタンダード 1,980円 / 使い放題 2,980円（すべて税込・月額）。
- 解約: マイページ or info@72k.ai（次回更新日の前日まで）。
- **未実装（審査通過後に必要）**: 申込フォーム＋「月額◯円が毎月自動課金される旨の同意画面」。テレコムクレジットは審査通過後に決済フォームを発行するのが通常。

### 13.2 法務（`legal.html`）
- 利用規約 / プライバシーポリシー / 特定商取引法に基づく表記（クレジットカード決済・継続課金・解約方法・事業者情報を記載済み）。
- アプリからの導線: `legal.html#terms` / `#privacy` / `#tokushoho`（メニューの「about」経由）。

---

## 14. データ・プライバシー

- 会話・プロフィールは**端末内localStorageのみ**。サーバーに個人プロフィールは保存しない。
- サーバーが保持するのは、レート制限用の「端末ID＋IP＋日次カウント」を短期間のみ（個人特定用途ではない）。
- App Privacy / Data Safety 申告時は、収集項目として「生年月日時（機能上必須）・端末ID・IP」を正確に記載すること。

---

## 15. ビルド・デプロイ

- **ビルド不要**。`brand/` をそのまま Netlify にデプロイ（静的＋`functions/`）。
- Netlify 側で `GEMINI_API_KEY`（本番キー）を環境変数に設定。**Geminiプロジェクトは前払い残高（課金）を有効化**しておくこと（3.6-flash利用時。残高枯渇で429）。
- `netlify.toml`: `/api/gemini` → `/.netlify/functions/gemini` にリダイレクト。
- Blobs は Netlify の通常デプロイで自動有効。

---

## 16. テスト（standing scripts）

`scratchpad/*.js`（Playwright + ローカルHTTPサーバ `srv.js` / PORT=8320）:
| スクリプト | 内容 |
|---|---|
| `boot_check.js` | 起動時のJSエラー・関数存在チェック |
| `qa.js` | セクションA〜H（計算・命式・十二運・節木運・用語10言語・カレンダー等）総合 |
| `cls_check.js` | 安全/話題分類の回帰（「死にたい」=自傷、「十二運の死」=非自傷 等） |
| 各種 live系 | 実APIでの鑑定・相性・タイミング・ラッキー要素の検証 |

新機能・改修後は最低 `boot_check` / `qa` / `cls_check` を通すこと。

---

## 17. 既知の注意点・運用TODO

1. **APIキー再発行**: 開発中にチャット等へ露出したキーは漏洩扱い。本番前に Gemini キーを再発行し、Netlify 環境変数にのみ設定（チャットに貼らない）。
2. **Gemini 3.6-flash の課金**: 本番プロジェクトで前払い残高（課金）を有効化。残高枯渇時は自動で LITE にフォールバックするが、DEEP品質は落ちる。
3. **決済の申込・同意フロー**: テレコムクレジット審査通過後に、申込フォーム＋継続課金の同意画面の実装が必要。
4. **PWA更新**: アプリ更新時は `sw.js` の `CACHE` 版番号を上げる。
5. **Gemini 3.x**: `thinkingBudget:0` を送らない（400）。`maxOutputTokens` を十分確保。
6. **ES5互換**: `index.html` はビルドなし。`const`/アロー関数は一部使用しているが、広い互換のため新規追加は `var`/function式を推奨（既存コードのスタイルに合わせる）。
7. **owl.png は透過PNG**: シェアカード・アイコン生成で背景に重ねる前提。
8. **エンジンの二重管理注意**: `bazi.js`（legacy）と `pro-bazi.js`（現行）が併存。現行 index.html は `pro-bazi.js` を読み込む。

---

## 付録A. 主要グローバル関数（index.html）

`computeChart` / `answer` / `_answerCore` / `buildSystemPrompt` / `classifyRisk` / `_aiClassify` / `_mapAiTopic` / `_effectiveTopic` / `_classifyTopic` / `renderChat` / `luckyBlock` / `todayBlock` / `healthBlock` / `setsubokuAnalysis` / `setsubokuBlock` / `lifeArcBlock` / `romanceBlock` / `loveMandateBlock` / `crisisBlock` / `safeReply` / `doCompat` / `compatAnalysis` / `localCompat` / `compatGoodYears` / `pkShareCard` / `pkNotifyApply` / `pkNotifyOpen` / `pkShare` / `T` / `pick`

## 付録B. APIヘッダ一覧（クライアント → Function）

| ヘッダ | 値 | 意味 |
|---|---|---|
| `x-pk-deep` | '1' | DEEPモデルを使う |
| `x-pk-classify` | '1' | 分類器呼び出し（日次カウント外・LITE固定） |
| `x-pk-device` | 端末ID | レート制限キー |
| `x-pk-plan` | free/light/unlimited | プラン別上限 |
| `x-pk-remaining` | （レスポンス） | 残り回数 |
| `x-pk-ratelimit` | degraded（レスポンス） | Blobs不可時の警告 |

---

*本仕様書は現行実装（2026-08）に基づく。実装変更時は本書も更新すること。*
