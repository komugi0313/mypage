# 発売前の点検（3つのツール共通）

「9,800円の商品として、オンラインでもオフラインでも確実に使えるか」だけを確かめる点検です。
文章の言い回しのような細かいところは見ません。次の項目が1つでも「NG」なら、配らない・公開しない。

- 計算：基準の例（1981-06-10 22:28 女性 → 甲午／順行／立運8年6ヶ月／甲午→乙未→丙申→丁酉）
- 質問に答えが返る（空っぽ・止まる・1つの質問に何度も答える、がない）
- 鑑定書・LINEの文・チャット用コピー・カルテが空っぽにならない／「＊」が出ない
- 文章作成のむだな呼び出しがない（開いただけで呼ばない・二度押し三度押しで増えない）
- 電波が悪いとき・圏外のときも、端末の中の答えが出る（続けての質問・鑑定書も）
- 画面のエラー（動かなくなる不具合）が0件

## 実行のしかた

本物の文章作成を使うので、環境変数 `GEMINI_API_KEY` が必要です（キーはファイルに書かない）。

```
node tools/release_gate/gate_pk.mjs pro online      # PRO（オンライン）
node tools/release_gate/gate_pk.mjs pro offline     # PRO（電波が悪くて文章作成につながらない）
node tools/release_gate/gate_pk.mjs pro nonet       # PRO（端末が圏外と判断している）
node tools/release_gate/gate_pk.mjs beginner online # ビギナー（offline / nonet も同じ）
node tools/release_gate/gate_eki.mjs online         # 易（offline / nonet も同じ）
```

最後の行が「→ 合格」なら合格です。1回の点検で文章作成を7回ほど使います（PRO・ビギナー）。
Playwright と Chromium が必要です（このリポジトリの点検の道具と同じ環境）。
