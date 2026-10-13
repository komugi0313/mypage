#!/usr/bin/env python3
"""
文字の見えやすさの安全装置（tools/contrast_guard.js）を、3サイト（pro/・beginner/・eki-pro/）と個人版の全HTMLに埋め込む。
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
PAT = re.compile(r'<script id="pk-contrast-guard">[\s\S]*?</script>\n?')

done = []
for d in ('pro', 'beginner', 'eki-pro', 'meishiki-original'):
    for p in sorted((ROOT / d).rglob('*.html')):
        if 'node_modules' in p.parts:
            continue
        s = p.read_text(encoding='utf-8')
        if PAT.search(s):
            s2 = PAT.sub(lambda m: BLOCK, s, count=1)
        else:
            i = s.rfind('</body>')
            s2 = (s[:i] + BLOCK + s[i:]) if i >= 0 else (s + '\n' + BLOCK)
        if s2 != s:
            p.write_text(s2, encoding='utf-8')
            done.append(str(p.relative_to(ROOT)))
print(f'OK: {len(done)} ファイルに埋め込み・更新しました。')
for x in done:
    print('  ', x)
