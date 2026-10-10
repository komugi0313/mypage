#!/usr/bin/env python3
"""教科書ページ（pro/・beginner/・meishiki-original/ の用語解説ページ）に、行末の泣き別れ防止（tools/textbook_read.html）を付ける。
何度実行しても同じ結果（既に付いていれば差し替え）。文言・内容は変えない。"""
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SNIP=(ROOT/'tools'/'textbook_read.html').read_text(encoding='utf-8')
PAGES=['aisho-pattern','boko-kaichu','daiun-tenkanki','daiun-tsuhen','ijokanshi','inyoku','jikkan','juniun','kaigou','kaikyoku',
       'kanshi-aisho','kodoku','kubo','nayin-aisho','nichiza','nichiza-tenchusatsu','ritsuun','setsuboku','tensen-chichu','tsuhensei','zohkan']
HUBS={'pro':'textbook-pro','beginner':'textbook','meishiki-original':None}
n=0
for d in ('pro','beginner','meishiki-original'):
    for name in PAGES+([HUBS[d]] if HUBS[d] else []):
        f=ROOT/d/(name+'.html')
        if not f.exists(): continue
        s=f.read_text(encoding='utf-8')
        s=re.sub(r'<style id="tb-read-css">[\s\S]*?</script>\n?','',s)
        i=s.rfind('</body>')
        if i<0: raise SystemExit(f'</body> がありません: {f}')
        s=s[:i]+SNIP+s[i:]
        f.write_text(s,encoding='utf-8'); n+=1
print('付与:',n,'ページ')
