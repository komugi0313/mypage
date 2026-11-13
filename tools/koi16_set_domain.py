"""恋のかたち診断（koi16）の公開URLを入れる。
使い方：python3 tools/koi16_set_domain.py https://example.com/
  ・SNS の紹介画像（og:image）は、ドメインつきの絶対URLでないと LINE・X に出ないので、ここで書きかえる。
  ・og:url・canonical・twitter:image も同じURLで入れる。何度回してもよい（前の値は置きかえる）。
"""
import re, sys
if len(sys.argv) != 2 or not re.match(r'^https://[^\s/]+(/[^\s]*)?$', sys.argv[1]):
    sys.exit('使い方：python3 tools/koi16_set_domain.py https://（ドメイン）/')
base = sys.argv[1] if sys.argv[1].endswith('/') else sys.argv[1] + '/'
p = 'koi16/index.html'
s = open(p, encoding='utf-8').read()
block = ('<!--SITE-URL:start-->\n'
         f'<link rel="canonical" href="{base}">\n'
         f'<meta property="og:url" content="{base}">\n'
         f'<meta name="twitter:image" content="{base}og-image.png">\n'
         '<!--SITE-URL:end-->')
s, n = re.subn(r'<!--SITE-URL:start-->.*?<!--SITE-URL:end-->', block, s, flags=re.S)
assert n == 1, 'SITE-URL の印が見つかりません'
s, m = re.subn(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{base}og-image.png">', s)
assert m == 1, 'og:image が見つかりません'
open(p, 'w', encoding='utf-8').write(s)
print('入れました：', base)
