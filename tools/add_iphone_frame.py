#!/usr/bin/env python3
"""
iPhone 17 風のスマホの枠（tools/iphone_frame.css）を、3サイトの紹介ページ
（pro/index.html・beginner/index.html・eki-pro/index.html）の <head> に埋め込む。
すでに埋め込まれていれば最新の中身に入れ替える（何度実行しても同じ結果）。

使い方（リポジトリのルートで）：
    python3 tools/add_iphone_frame.py
枠の色：PRO＝ip-sage（セージ）／ビギナー＝ip-mist（ミストブルー）／易＝ip-lav（ラベンダー）。ブラックは使わない。
※ Apple 配布の枠画像（Apple Design Resources）は、利用規約で Web サイトへの使用が認められていないため使わない。
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = (ROOT / 'tools' / 'iphone_frame.css').read_text(encoding='utf-8').strip()
BLOCK = '<style id="pk-iphone-frame">\n' + CSS + '\n</style>\n'
PAT = re.compile(r'<style id="pk-iphone-frame">[\s\S]*?</style>\n?')

done = []
for d in ('pro', 'beginner', 'eki-pro'):
    p = ROOT / d / 'index.html'
    s = p.read_text(encoding='utf-8')
    if PAT.search(s):
        s2 = PAT.sub(lambda m: BLOCK, s, count=1)
    else:
        i = s.find('</head>')
        s2 = s[:i] + BLOCK + s[i:]
    if s2 != s:
        p.write_text(s2, encoding='utf-8')
        done.append(str(p.relative_to(ROOT)))
print(f'OK: {len(done)} ファイルに埋め込み・更新しました。')
for x in done:
    print('  ', x)
