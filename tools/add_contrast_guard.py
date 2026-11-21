#!/usr/bin/env python3
"""
文字の見えやすさの安全装置（tools/contrast_guard.js）を、3サイト（pro/・beginner/・eki-pro/）と個人版・究極の二択・アイ・シンクの全HTMLに埋め込む。
すでに埋め込まれていれば最新の中身に入れ替える（何度実行しても同じ結果）。

使い方（リポジトリのルートで）：
    python3 tools/add_contrast_guard.py
※ ビギナーの app-beginner.html などの生成ファイルは、生成元（pro/）に入っていれば生成時に一緒に写る。
   このスクリプトの後に tools/sync_beginner_from_pro.py と tools/eki_pay_from_pro.py eki-pro を実行すること。
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = (ROOT / 'tools' / 'contrast_guard.js').read_text(encoding='utf-8').strip()
BLOCK = '<script id="pk-contrast-guard">\n' + JS + '\n</script>\n'
# 無料サイト（究極の二択・アイ・シンク・恋のかたち診断）で、ページが自分で文節の改行をしているときは、
# 安全装置の「言葉の途中で行が分かれないようにする」を止める（2つが重なって同じ文を二重に区切らないように。2026-11-21）
OWN = re.compile(r'Intl\.Segmenter|jw\.js|BX_MODEL|seo\.js')
BLOCK_OWN = '<script id="pk-contrast-guard">\nwindow.__pkPhrase=true; /* このページは自分で文節の改行をしている */\n' + JS + '\n</script>\n'
PAT = re.compile(r'<script id="pk-contrast-guard">[\s\S]*?</script>\n?')

done = []
for d in ('pro', 'beginner', 'eki-pro', 'meishiki-original', 'nitaku', 'isync', 'koi16'):
    for p in sorted((ROOT / d).rglob('*.html')):
        if 'node_modules' in p.parts:
            continue
        if p.name.endswith('-src.html'):  # アイコン・シェア画像の元（撮るときに色が変わらないよう入れない）
            continue
        s = p.read_text(encoding='utf-8')
        blk = BLOCK_OWN if d in ('nitaku', 'isync', 'koi16') and OWN.search(PAT.sub('', s)) else BLOCK
        if PAT.search(s):
            s2 = PAT.sub(lambda m: blk, s, count=1)
        else:
            i = s.rfind('</body>')
            s2 = (s[:i] + blk + s[i:]) if i >= 0 else (s + '\n' + blk)
        if s2 != s:
            p.write_text(s2, encoding='utf-8')
            done.append(str(p.relative_to(ROOT)))
print(f'OK: {len(done)} ファイルに埋め込み・更新しました。')
for x in done:
    print('  ', x)
