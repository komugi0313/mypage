#!/usr/bin/env python3
"""申込・ログイン・マイページ（pro/）に、行末の泣き別れ防止（tools/pay_read.html）を付ける。
何度実行しても同じ結果（既に付いていれば差し替え）。文言・内容は変えない。
※ beginner/ の pricing.html・auth.html・mypage.html は sync_beginner_from_pro.py が pro から生成するので、pro 側に付ければよい。
※ 引数でファイルを渡すと、そのファイルにも付ける（例：易 EKI Pro の各ページ）。"""
import re, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
SNIP=(ROOT/'tools'/'pay_read.html').read_text(encoding='utf-8')
FILES=[ROOT/'pro'/'pricing-pro.html',ROOT/'pro'/'auth.html',ROOT/'pro'/'mypage-pro.html']+[Path(a) for a in sys.argv[1:]]
for f in FILES:
    s=f.read_text(encoding='utf-8')
    s=re.sub(r'<style id="pay-read-css">[\s\S]*?</script>\n?','',s)
    i=s.rfind('</body>')
    if i<0: raise SystemExit(f'</body> がありません: {f}')
    s=s[:i]+SNIP+s[i:]
    f.write_text(s,encoding='utf-8')
    print('付与:',f)
