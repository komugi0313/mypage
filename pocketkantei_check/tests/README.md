# Pocket鑑定 テスト

どれも公開サイトには置きません。何を確かめるかは、仕様書（`docs/Pocket鑑定_実装仕様書.md`）の「10. テスト」を見てください。

## 準備
1. このフォルダに、`fx/` という名前で `pocketkantei_final_fixed.zip` を展開します（`tests/fx/index.html` になるように）。
2. `npm i playwright` を実行します。
3. `@netlify/blobs` の代わりに、仮の保存領域 `mock/` を使います。`NODE_PATH=mock/node_modules` を付けて実行します。
4. 実際のAIを使うテストは、`GEMINI_KEY=<テスト用のキー>` を付けて実行します。**キーをファイルに保存しないでください。**

## 変更したら必ず流すもの（実際のAIは使いません）
```
node unitguard.js
NODE_PATH=mock/node_modules node e2e.js
NODE_PATH=mock/node_modules node quotatest.js
NODE_PATH=mock/node_modules node budgettest.js
NODE_PATH=mock/node_modules node ui10.js
NODE_PATH=mock/node_modules node pushtest.js
node prefix.js
```

## 一覧

### 命式
| ファイル | 内容 | 実行例 |
|---|---|---|
| `chk1.js` | 大運の一括チェック1万件（第一運＝月柱・期間・10年ごと） | `node chk1.js` |
| `cmp184.js` | v184 のエンジンとの比較2万件。`pro_prototype_v184.zip` の `pro-bazi.js` を `v184_bazi.js` としてこのフォルダに置く | `node cmp184.js` |
| `tzref.py` → `tzapp.js` → `tzcmp.py` | 出生地ごとの時差を、独立した計算（`pip install ephem`）とアプリで出して照合 | `python3 tzref.py 1 40 && node tzapp.js && python3 tzcmp.py` |

### アカウント・課金・回数
| ファイル | 内容 | 実行例 |
|---|---|---|
| `authtest.js` | アカウントAPI（登録〜削除・ロック・偽造トークン・Origin） | `NODE_PATH=mock/node_modules node authtest.js` |
| `e2e.js` | 2台の端末：登録 → 別の端末でログイン → ログアウト → 削除 | `NODE_PATH=mock/node_modules node e2e.js` |
| `e2e_reset.js` | パスワード再設定（Resend は偽物） | `NODE_PATH=mock/node_modules node e2e_reset.js` |
| `lpflow.js` / `eye.js` | 未登録の時のLPへの移動／パスワード表示ボタン | `node lpflow.js` |
| `billtest.js` / `billtest2.js` | RevenueCat の通知とプランの変化／チャットの上限に使うプラン | `NODE_PATH=mock/node_modules node billtest.js` |
| `billui.js` | 料金画面・購入・復元・マイページ（RevenueCat は模擬） | `NODE_PATH=mock/node_modules node billui.js` |
| `webcard.js` / `webcancel.js` | ウェブ版の決済画面への移動／自分で解約 | `NODE_PATH=mock/node_modules node webcard.js` |
| `quotatest.js` | サーバーの回数の上限（無料・本格鑑定・数えない呼び出し・プランの詐称） | `NODE_PATH=mock/node_modules node quotatest.js` |
| `planui2.js` | 本格鑑定の数え方と、使い切った時の画面 | `NODE_PATH=mock/node_modules node planui2.js` |
| `budgettest.js` / `budgetui.js` | 31日間使い続けた時のAI原価と利益率／雑談の割り当てを使い切った時の画面 | `NODE_PATH=mock/node_modules node budgettest.js` |

### 10言語の画面・後処理・キャッシュ
| ファイル | 内容 | 実行例 |
|---|---|---|
| `ui10.js` | 10言語のエラー表示と各画面 | `NODE_PATH=mock/node_modules node ui10.js` |
| `unitguard.js` | AIの返事の後処理（言語違い・専門用語・決まり文句・相談先・〇〇・見分けの正規表現など） | `node unitguard.js` |
| `datep.js` / `bday.js` / `pb.js` | 相手の誕生日の読み取り／自分の誕生日の質問／AI用データの本人・相手の行 | `node datep.js` |
| `hl.js` | 端末の地域ごとの相談窓口 | `node hl.js` |
| `prefix.js` / `blocks.js` | 指示文の先頭の一致率／各部分が毎回変わるか | `node prefix.js` |

### ニコのメッセージ（プッシュ）
| ファイル | 内容 | 実行例 |
|---|---|---|
| `pushtest.js` | 送信の仕組み（時刻・1日1回・似た文面・言語違い・消えた端末・長く開いていない人・夏時間・旅行・夜の「おはよう」・曜日・退会）。AIと Firebase は偽物 | `NODE_PATH=mock/node_modules node pushtest.js` |
| `pushui.js` | 画面（ウェブ版・未ログイン・オン／オフ・受け取り箱からチャットへ・10言語） | `NODE_PATH=mock/node_modules node pushui.js` |
| `pushlive.js` / `pushlive2.js` / `pushlive3.js` | 実際のAIで10言語×距離×時間帯×曜日の文面を作る（送信はしない） | `GEMINI_KEY=… node pushlive3.js` |

### 会話の質（実際のAI）
| ファイル | 内容 | 実行例 |
|---|---|---|
| `convoall.js` | 利用者として、アプリの画面で数往復ずつ話す。国ごとの時刻で動かす。人物は `personas.json`（10言語32人）・`love_personas.json`（恋愛24人）・`crisis_personas.json`（危機） | `GEMINI_KEY=… node convoall.js love_personas.json 結果.json 8` |
| `convocheck.py` | 言語の混入・専門用語・繰り返し・誕生日の聞き直し・相談先を機械的に確かめる | `python3 convocheck.py 結果.json` |
| `fillercheck.py` | お茶・休息などの決まり文句の数 | `python3 fillercheck.py 結果.json` |
| `judge.js` | AIによる採点（具体性・行動・深さ・正直さ・解決・繰り返し・突き放し・決まり文句） | `GEMINI_KEY=… node judge.js 結果.json 採点.json` |
| `stance.js` + `stanceq.json` | ニコの姿勢（無謀な決断・「私悪くないよね？」・自分責めなど） | `GEMINI_KEY=… node stance.js 結果.json` |
| `convo.js` + `convo_*.json` | 1人の利用者として続けて会話する（目で確かめる用） | `GEMINI_KEY=… node convo.js convo_ja.json 結果.json` |
| `bigtest.js` / `finaltest.js` / `finaltest_u.js` → `bigcheck.py` | 10言語の長い会話 | `GEMINI_KEY=… node bigtest.js && python3 bigcheck.py big_all.json` |
| `live.js` → `livecheck.py` | 10言語のランダムな会話 | `GEMINI_KEY=… node live.js && python3 livecheck.py` |

本番の Netlify（実際の Blobs・Resend・Firebase）での確認は、仕様書の「11. 公開前チェック」で行ってください。
