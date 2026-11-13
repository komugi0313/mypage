# 恋のかたち診断を Firebase Hosting で公開する手順

ほかのサイト（究極二択診断など）と同じ Firebase で公開します。
サーバーの処理はなく、`koi16` フォルダの中身をそのまま置くだけです（Firebase Hosting の無料枠で足ります）。
`firebase.json` は用意済みです（この手順書と firebase.json 自体は公開されません）。

## 1. Firebase にサイトを1つ足す（コンソール）

1. https://console.firebase.google.com/ で、いつも使っているプロジェクトを開く
2. 左の「Hosting」→「別のサイトを追加」→ サイトID に `koikata` と入れる
   （使われていて入れられないときは `koikata-jp` など。下の 3 の `koikata` の右側をその名前にする）

## 2. パソコンの準備（はじめの1回だけ）

```
npm install -g firebase-tools
firebase login
```

## 3. 公開する

`koi16` フォルダで：

```
firebase use --add            （いつものプロジェクトを選ぶ）
firebase target:apply hosting koikata koikata
firebase deploy --only hosting:koikata
```

終わると `https://koikata.web.app/` で見られます。

## 4. koikata.jp をつなぐ

1. Firebase コンソールの Hosting → サイト `koikata` →「カスタムドメインを追加」→ `koikata.jp`
2. 表示された値（A レコード・TXT レコード）を、ドメインを取ったお店の「DNS の設定」に入れる
3. 数分〜最大24時間で `https://koikata.jp/` が開くようになる（安全な通信の証明書も Firebase が自動でつける）

## 5. koinokatachi.jp を koikata.jp へ飛ばす

1. 同じ「カスタムドメインを追加」で `koinokatachi.jp` を入れ、「既存のウェブサイトにリダイレクト」にチェック → 飛ばし先 `koikata.jp`
2. 表示された値をお店の DNS の設定に入れる

## 6. 公開したら確かめること

- `https://koikata.jp/` を iPhone と Android で開く
- LINE に `https://koikata.jp/` を送って、紹介画像（スイーツのキャラクターの画像）が出るか
- 結果の「となりの人にQRを見せる」を、別のスマホのカメラで読んで開けるか
