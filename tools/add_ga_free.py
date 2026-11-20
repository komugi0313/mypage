# -*- coding: utf-8 -*-
# 3つの無料サイト（究極の二択・恋のかたち診断・アイ・シンク）に Google アナリティクスを入れる。
# 鑑定者本人 2026-11-20「他のサイトも登録できる？数えたい　何回遊ばれたか」→「B」（Googleアナリティクス）。
# ・本番のアドレスで開いたときだけ数える（確認用ページ・練習の画面は数えない）。
# ・名前・答えは送らない：アドレスの「?」のあとは ref と e だけ残し、「#」のあと（部屋・答え合わせのリンク）は送らない。
#   どこから来たか（page_referrer）も「?」「#」から先を消して送る。
# ・拡張計測機能は Google アナリティクスの画面でオフにしてある（離脱クリックで LINE の文が送られないように）。
# ・遊ばれた回数は、結果が出たときに各サイトが window.gaEv('play_done', {...}) を呼んで送る（種類だけ）。
# 生成スクリプト（tools/nitaku_matome.js・tools/isync_matome.js・tools/koi16_seo.js・tools/free_privacy.py）で
# ページを作り直したら、このスクリプトをもう一度回す（何度回しても同じ結果になる）。
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITES = {
    'nitaku': ('honbare.com', 'G-J3RFBEEHRJ'),
    'koi16':  ('koikata.jp',  'G-241Z24D0LD'),
    'isync':  ('i-sync.jp',   'G-90CS5P2204'),
}
SKIP = {'stats.html', 'icon-src.html', 'og-image-src.html'}   # 運営者が見るページ・画像の元は数えない

def snippet(host, gid):
    return ('<!--GA:start-->\n<script>/* アクセス解析（Google アナリティクス）。' + host +
            ' で開いたときだけ動く。名前・答えが入るアドレスの部分は送らない（tools/add_ga_free.py） */\n'
            '(function(){window.gaEv=function(n,p){try{if(window.gtag)gtag("event",n,p||{})}catch(e){}};'
            'var h=location.hostname.replace(/^www\\./,"");if(h!=="' + host + '")return;'
            'var q=new URLSearchParams(location.search),k=new URLSearchParams();'
            '["ref","e"].forEach(function(n){var v=q.get(n);if(v&&/^[A-Za-z0-9_-]{1,24}$/.test(v))k.set(n,v)});'
            'var ks=k.toString(),loc=location.origin+location.pathname+(ks?"?"+ks:""),rf="";'
            'try{if(document.referrer){var u=new URL(document.referrer);rf=u.origin+u.pathname}}catch(e){}'
            'window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());'
            'gtag("config","' + gid + '",{page_location:loc,page_referrer:rf});'
            'var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id=' + gid + '";'
            'document.head.appendChild(s)})();\n</script>\n<!--GA:end-->')

PAT = re.compile(r'<!--GA:start-->.*?<!--GA:end-->\n?', re.S)
n = 0
for site, (host, gid) in SITES.items():
    for p in sorted((ROOT / site).rglob('*.html')):
        if p.name in SKIP or 'functions' in p.parts or 'licenses' in p.parts:
            continue
        s = p.read_text(encoding='utf-8')
        s2 = PAT.sub('', s)
        m = re.search(r'<meta charset="utf-8">\n?', s2, re.I)
        if not m:
            print('skip (no charset):', p.relative_to(ROOT)); continue
        s2 = s2[:m.end()] + ('' if s2[m.end()-1] == '\n' else '\n') + snippet(host, gid) + '\n' + s2[m.end():]
        if s2 != s:
            p.write_text(s2, encoding='utf-8'); n += 1
print('updated', n, 'files')
