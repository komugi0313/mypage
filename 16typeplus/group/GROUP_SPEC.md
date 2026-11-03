# グループの相性：サーバー側の仕様（準備）

画面と計算はできています（`group.js`、見本は `group-demo.html`）。
サーバーは「メンバーのタイプを保存して返す」だけで動くようにしてあります。相性の計算は、すべて画面側（ブラウザ）で行います。

## 流れ

1. **作る人**：結果画面で「グループの相性をつくる」→ グループ名を入れる → 自分が最初のメンバーとして入る → 招待リンクができる。
2. **招待された人**：リンクを開く → 生年月日と16タイプで診断する（すでに結果があればそのまま）→ ニックネームを入れて「このグループに入る」。
3. **全員**：同じリンクを開くと、いま入っているメンバー全員でのグループ結果が見られる。人が増えるたびに結果が変わる。

## 保存するもの

生年月日は送りません。2人の相性（招待リンク）と同じで、タイプとキャラ番号とニックネームだけです。

```
groups/{groupId}
  title       string   1〜20文字（グループ名）
  createdAt   timestamp
  expiresAt   timestamp  作ってから90日（開かれるたびに90日延ばす）
  ownerKey    string   作った人の削除用キー（ハッシュで保存）

groups/{groupId}/members/{memberId}
  name        string   1〜12文字（ニックネーム）
  born        string   ^[EI][SN][TF][JP](-[AT])?$   気質
  now         string   ^[EI][SN][TF][JP](-[AT])?$   性格
  num         int      1〜60   キャラ番号
  lang        string   ja | en | ko
  joinedAt    timestamp
  editKey     string   本人が抜けるためのキー（ハッシュで保存）
```

- `groupId`：推測できない文字列（英数字12文字以上）。リンクを知っている人だけが見られる。
- メンバーは **2〜10人**。11人目は「このグループはいっぱいです」と返す。
- 同じ端末から同じグループに2回入ったときは、上書きする（端末に `editKey` を保存しておく）。

## API

| 用途 | リクエスト | 返すもの |
|---|---|---|
| グループを作る | `POST /api/groups` `{title, member:{name,born,now,num,lang}}` | `{groupId, ownerKey, memberId, editKey}` |
| グループを見る | `GET /api/groups/{groupId}` | `{title, members:[{memberId,name,born,now,num}]}` |
| グループに入る | `POST /api/groups/{groupId}/members` `{name,born,now,num,lang}` | `{memberId, editKey}` |
| 自分の情報を直す | `PUT /api/groups/{groupId}/members/{memberId}` + `editKey` | `{ok}` |
| 抜ける | `DELETE /api/groups/{groupId}/members/{memberId}` + `editKey` | `{ok}` |
| グループを消す | `DELETE /api/groups/{groupId}` + `ownerKey` | `{ok}` |

- `GET` の返事には `editKey`・`ownerKey`・`joinedAt` を入れない。
- 文字の形が合わないもの（上の正規表現）は 400 で断る。ニックネームは前後の空白を取り、HTMLとして扱わない（画面側でもエスケープ済み）。
- 連続投稿の制限：同じ IP から1分に10回まで。IP は制限のためだけに使い、保存しない。

## 画面側のつなぎ方

```js
const res = await fetch("/api/groups/" + id).then(r => r.json());
const G = groupResult(res.members);          // group.js
el.innerHTML = groupHTML(G, res.title);       // 2人未満なら G は null →「あと1人入ると結果が出ます」
```

- リンクの形：`https://16typeplus.jp/?g={groupId}`（言語は `/en/?g=` `/ko/?g=`）
- 計測イベント：`group_create` `group_join` `group_view` `group_leave`

## まだ決めていないこと

- 英語・韓国語の訳（画面の文言は `TR()` で囲んであるので、`i18n/ui.{en,ko}.json` に足せば出る）
- 結果画面のどこにボタンを置くか（いまの「あの人との相性」の下を想定）
- シェア画像を作るかどうか

## 結果の出し方（group.js）

- **このグループは、こんな集まり**：性格の文字で、人数の差が全体の1/3以上ある軸から最大3つ、よくある場面を出す。
- **気質で見ると**：性格と気質で、多い方の文字がはっきり入れかわる軸（両方とも差が1/3以上）を最大2つ。
- **それぞれの役まわり**：性格の文字から1人1つ。なるべく同じ役が重ならないように選ぶ。気質で選んだ役がちがうときは「生まれつきは〜にも向いています」と出す。
- **気が合う2人／すれ違いやすい2人**：同じ文字の数（性格×2＋気質）が一番多い2人と一番少ない2人。3人以上のときだけ「すれ違いやすい2人」を出す。
- **うまくいくコツ**：性格でだれもいない文字があれば、その文字のコツ（最大3つ）。いなければ、一番少ない文字の人の意見を聞くように出す。
