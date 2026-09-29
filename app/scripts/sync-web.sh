#!/usr/bin/env bash
#
# pro/（本番Web）を Capacitor の webDir（app/www）にコピーし、アプリとして動くよう
# 最小限だけ書き換える。pro/ のソースには一切手を加えない（Web配信はそのまま）。
#
#   1) 相対パス '/.netlify/functions' → 本番の絶対URL
#      （アプリは端末内にサーバーを持たないため、相対のままだと AI鑑定・同期が動かない）
#   2) Service Worker の登録を無効化
#      （アプリはローカル配信でSW不要。古いキャッシュを掴む事故も防ぐ）
#
# 使い方:
#   SITE_URL=https://あなたの本番.netlify.app npm run sync:web
#
set -euo pipefail

# ---- 要設定：本番 Netlify サイトのURL（末尾スラッシュなし）。env で上書き可 ----
: "${SITE_URL:=https://YOUR-SITE.netlify.app}"

HERE="$(cd "$(dirname "$0")/.." && pwd)"      # app/
SRC="$(cd "$HERE/.." && pwd)/pro"             # ../pro
DST="$HERE/www"

[ -d "$SRC" ] || { echo "ERROR: $SRC が見つかりません"; exit 1; }
if [ "$SITE_URL" = "https://YOUR-SITE.netlify.app" ]; then
  echo "⚠ SITE_URL が既定のままです。本番URLを設定してください:"
  echo "    SITE_URL=https://あなたの本番.netlify.app npm run sync:web"
fi

echo "1/3 copy : pro/ -> app/www/"
rm -rf "$DST"; mkdir -p "$DST"
cp -R "$SRC/." "$DST/"

echo "2/3 rewrite backend base -> $SITE_URL"
export SITE_URL
find "$DST" -name '*.html' -type f -print0 | while IFS= read -r -d '' f; do
  perl -pi -e 's{/\.netlify/functions}{$ENV{SITE_URL}/.netlify/functions}g' "$f"
done

echo "3/3 disable service-worker registration"
find "$DST" -name '*.html' -type f -print0 | while IFS= read -r -d '' f; do
  perl -pi -e 's{if\(.serviceWorker. in navigator\)}{if(false)}g' "$f"
done

echo "OK  -> $DST   (API base = $SITE_URL)"
echo "次: npx cap sync   →   npm run open:ios / npm run open:android"
