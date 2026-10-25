#!/usr/bin/env python3
"""16TYPE+ 本番サイトの組み立て。
src/（head.html・body.html・script.js）と content/・i18n/ のデータから、
site/ に日本語(/)・英語(/en/)・韓国語(/ko/)のページを作る。
使い方: python3 build_site.py   → 16typeplus/site/ ができる（Firebase の public に指定）"""
import json,os,re,shutil,sys
R=os.path.dirname(os.path.abspath(__file__))+'/'
sys.path.insert(0,R+'i18n');from build_preview import lang_data
OUT=R+'site/'
META={
 'ja':('16TYPE+｜生まれ持った気質と、育ってきた性格がわかる無料診断','あなたの中には2つの性質がある。生年月日からわかる「気質」と、16タイプからわかる「性格」。2つを並べて、あなたらしいところと悩みやすいところがわかる無料の性格診断。','日本語','ja_JP'),
 'en':('16TYPE+ | Your temperament and character, side by side','There are two natures inside you: the temperament you were born with, and the character shaped by experience. A free personality test that shows both, and where you tend to struggle.','English','en_US'),
 'ko':('16TYPE+ | 타고난 기질과 자라 온 성격을 알 수 있는 무료 검사','당신 안에는 두 가지 성질이 있어요. 생년월일로 보는 기질과 16타입으로 보는 성격. 둘을 나란히 놓고 나다움과 고민하기 쉬운 지점을 알려 주는 무료 성격 검사.','한국어','ko_KR')}
URL={'ja':'https://16typeplus.jp/','en':'https://16typeplus.jp/en/','ko':'https://16typeplus.jp/ko/'}
GA='G-XLMXSC0LY0'
def rd(p): return open(p,encoding='utf-8').read()
def build():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT+'chars');os.makedirs(OUT+'img')
    for f in os.listdir(R+'characters/web'):
        if f.endswith('.webp'): shutil.copy(R+'characters/web/'+f,OUT+'chars/'+f)
    shutil.copy(R+'kakure-shindan/bazi.js',OUT+'bazi.js')
    shutil.copy(R+'icons/favicon.ico',OUT+'favicon.ico')
    for f in ['favicon-32.png','favicon-48.png','apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-192.png','icon-maskable-512.png']: shutil.copy(R+'icons/'+f,OUT+'img/'+f)
    for l in ['ja','en','ko']: shutil.copy(R+'site_assets/ogp-%s.png'%l,OUT+'img/ogp-%s.png'%l)
    if os.path.exists(R+'kakure-shindan/privacy.html'): shutil.copy(R+'kakure-shindan/privacy.html',OUT+'privacy.html')
    head=rd(R+'src/head.html');js=rd(R+'src/budoux-inline.js')+rd(R+'src/script.js')
    head=re.sub(r'<title>.*?</title>\n?','',head);head=re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\n?','',head)
    head=re.sub(r'<meta charset="utf-8">\n?|<meta name="viewport"[^>]*>\n?','',head)
    for lang in ['ja','en','ko']:
        d=lang_data(lang);body=d.pop('BODY')
        body=body.replace('<p class="note">デザイン見本（実際に診断できます）</p>','')
        body=re.sub(r'\s*<p class="note">[^<]*</p>','',body,count=1)
        links=['/','/en/','/ko/'];names=['日本語','EN','한국어']
        nav='<nav class="lang" aria-label="Language">'+''.join('<a href="%s"%s>%s</a>'%(links[i],' aria-current="true"' if ['ja','en','ko'][i]==lang else '',names[i]) for i in range(3))+'</nav>'
        body=re.sub(r'<nav class="lang".*?</nav>',nav,body,count=1,flags=re.S)
        t,desc,_,loc=META[lang];u=URL[lang];base='/' if lang=='ja' else '../'
        alt=''.join('<link rel="alternate" hreflang="%s" href="%s">\n'%(l,URL[l]) for l in URL)+'<link rel="alternate" hreflang="x-default" href="%s">\n'%URL['ja']
        top=f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{t}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{u}">
{alt}<link rel="icon" href="{base}favicon.ico" sizes="48x48">
<link rel="icon" href="{base}img/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="{base}img/apple-touch-icon.png">
<link rel="manifest" href="{base}{'' if lang=='ja' else lang+'/'}manifest.webmanifest">
<meta name="apple-mobile-web-app-title" content="16TYPE+">
<meta name="application-name" content="16TYPE+">
<meta property="og:type" content="website">
<meta property="og:site_name" content="16TYPE+">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{u}">
<meta property="og:locale" content="{loc}">
<meta property="og:image" content="https://16typeplus.jp/img/ogp-{lang}.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F6F7F9">
<script async src="https://www.googletagmanager.com/gtag/js?id={GA}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA}');</script>
'''
        data='var PAGE_LANG="%s";window.CHAR_BASE="%schars/";\n'%(lang,base)+''.join('var %s=%s;\n'%(k,json.dumps(v,ensure_ascii=False)) for k,v in d.items())
        os.makedirs(OUT+('' if lang=='ja' else lang+'/'),exist_ok=True)
        open(OUT+('' if lang=='ja' else lang+'/')+'data.js','w',encoding='utf-8').write(data)
        page=top+head+'</head>\n<body>\n'+body+'\n<script src="data.js"></script>\n<script src="%sbazi.js"></script>\n<script src="%sapp.js"></script>\n'%(base,base)+('<script>BX.start(document.querySelector(".page"));</script>\n' if lang=='ja' else '')+'</body>\n</html>\n'
        open(OUT+('' if lang=='ja' else lang+'/')+'index.html','w',encoding='utf-8').write(page)
        man={'name':'16TYPE+','short_name':'16TYPE+','description':desc,'lang':lang,'id':'/' if lang=='ja' else '/'+lang+'/',
             'start_url':'/' if lang=='ja' else '/'+lang+'/','scope':'/','display':'standalone','background_color':'#F6F7F9','theme_color':'#F6F7F9',
             'icons':[{'src':'/img/icon-192.png','sizes':'192x192','type':'image/png','purpose':'any'},{'src':'/img/icon-512.png','sizes':'512x512','type':'image/png','purpose':'any'},
                      {'src':'/img/icon-maskable-192.png','sizes':'192x192','type':'image/png','purpose':'maskable'},{'src':'/img/icon-maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}]}
        open(OUT+('' if lang=='ja' else lang+'/')+'manifest.webmanifest','w',encoding='utf-8').write(json.dumps(man,ensure_ascii=False,indent=1))
    open(OUT+'app.js','w',encoding='utf-8').write(js)
    print('built',OUT)
if __name__=='__main__': build()
