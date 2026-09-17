#!/usr/bin/env bash
# Assemble the Capacitor webDir (www/) from the clarity web app.
# The mobile entry point is app.html (NOT the landing page) — Capacitor serves
# index.html, so app.html is copied to www/index.html. The founder's engine
# page and its JS ship alongside so the chart computes ON DEVICE, same-origin,
# exactly as on the web (no server needed for the chart).
set -euo pipefail
cd "$(dirname "$0")"
SRC=".."
rm -rf www && mkdir -p www

cp "$SRC/app.html"                www/index.html
cp "$SRC/meishiban_pillars.html"  www/
cp "$SRC"/bazi.js "$SRC"/bazi-bridge.js "$SRC"/geo.js "$SRC"/dayfortune.js "$SRC"/cycles.js www/ 2>/dev/null || true
# any other engine-support JS that exists
for f in "$SRC"/*.js; do b="$(basename "$f")"; [ -f "www/$b" ] || cp "$f" www/; done
# legal pages open in-app from the paywall footer
cp "$SRC/terms.html" "$SRC/privacy.html" www/
# images referenced by the app/about (ignore if absent)
cp "$SRC"/*.png www/ 2>/dev/null || true

echo "www/ assembled:"
ls www
echo
echo "REMINDER (store builds): in www/index.html set BACKEND.USE_PROXY=true and"
echo "PROXY_BASE to the deployed API — the BYOK key field must NOT ship to review."
