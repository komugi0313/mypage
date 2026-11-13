# 恋のかたち診断を Firebase Hosting で公開する手順

置き場：Firebase プロジェクト **16typeplus**（ID `typeplus-69c66`）の中のサイト **koikata**。
サーバーの処理はなく、`koi16` フォルダの中身をそのまま置くだけです（無料枠で足ります）。
GitHub に保存すると自動で公開されます（`.github/workflows/koi16-deploy.yml`）。コマンドは打たなくて大丈夫です。
この手順書・`firebase.json`・`.firebaserc` は公開されません。

## 1. Firebase にサイト「koikata」を作る（はじめの1回だけ）

1. https://console.firebase.google.com/ → **16typeplus** を開く
2. 左のメニュー「構築」→「Hosting」（はじめてなら「始める」を押して、説明は「次へ」で進めて最後まで）
3. Hosting の画面のいちばん下「別のサイトを追加」→ サイトID に **koikata** と入れて追加
   - 「使われています」と出たら **koikata-jp** にして、そのことを Claude に伝える（設定を合わせます）

## 2. 公開用の鍵を作って GitHub に入れる（はじめの1回だけ）

1. Firebase の左上の ⚙（歯車）→「プロジェクトの設定」→ タブ「サービス アカウント」
2. 「新しい秘密鍵を生成」→「キーを生成」→ JSON のファイルがダウンロードされる
   - **このファイルはだれにも送らない・チャットにも貼らない**（サイトを書きかえられる鍵です）
3. https://github.com/komugi0313/mypage/settings/secrets/actions を開く
4. 「New repository secret」→ Name に **FIREBASE_SERVICE_ACCOUNT_KOIKATA**、Secret に、ダウンロードした JSON ファイルの中身をまるごと貼りつけ →「Add secret」
5. 貼りつけたら、パソコンの JSON ファイルは消してよい（もう一度必要になったら作り直せます）

## 3. 公開する

- https://github.com/komugi0313/mypage/actions →「koi16 deploy (Firebase Hosting)」→「Run workflow」→「Run workflow」
- 数分で緑のチェックになれば完了。`https://koikata.web.app/` で見られます
- これからは、koi16 を直して GitHub に保存するたびに自動で公開されます

## 4. koikata.jp をつなぐ

1. Firebase の Hosting → サイト **koikata** の「カスタムドメインを追加」→ `koikata.jp`
2. 表示された値（A レコード・TXT レコード）を、ドメインを取ったお店の「DNS の設定」に入れる
3. 数分〜最大24時間で `https://koikata.jp/` が開く（安全な通信の証明書も Firebase が自動でつける）

## 5. koinokatachi.jp を koikata.jp へ飛ばす

1. 同じ「カスタムドメインを追加」で `koinokatachi.jp` を入れ、「既存のウェブサイトにリダイレクト」にチェック → 飛ばし先 `koikata.jp`
2. 表示された値をお店の DNS の設定に入れる

## 6. 公開したら確かめること

- `https://koikata.jp/` を iPhone と Android で開く
- LINE に `https://koikata.jp/` を送って、紹介画像（スイーツのキャラクターの画像）が出るか
- 結果の「となりの人にQRを見せる」を、別のスマホのカメラで読んで開けるか
