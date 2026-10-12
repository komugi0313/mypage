#!/usr/bin/env bash
# 3サイトで、実際に Gemini で文章を作らせて結果を out/ に保存する（動作確認専用）。
# キーは環境変数 GEMINI_API_KEY から読むだけ。ファイル・zip・ログには書かない。
set -u
cd "$(dirname "$0")"
if [ -z "${GEMINI_API_KEY:-}" ]; then echo "環境変数 GEMINI_API_KEY が設定されていません"; exit 1; fi
ROOT="$(cd ../.. && pwd)"
start(){ curl -s -o /dev/null "http://127.0.0.1:$2/" || (cd "$ROOT/$1" && nohup python3 -m http.server "$2" >/dev/null 2>&1 &); }
start pro 8771; start beginner 8772; start eki-pro 8773; sleep 1
mkdir -p out
node shichu.mjs pro > out/pro.log 2>&1 &
node shichu.mjs beg > out/beg.log 2>&1 &
node eki.mjs > out/eki.log 2>&1 &
wait
echo "完了：out/pro.json out/beg.json out/eki.json と out/shots/"
