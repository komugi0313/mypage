#!/usr/bin/env python3
"""
共通基盤（1つのサーバーで全商品を扱う）に「どの商品からの呼び出しか」を伝える目印を、各サイトの全HTMLに埋め込む。

・各ページの <head> の先頭に <script id="pk-product"> を入れる。
・このページからサーバーAPI（パスが /.netlify/functions/… または /api/… のもの。アプリ版のように絶対URLで別のホストを呼ぶ場合も含む）を
  呼ぶときだけ、ヘッダ X-Product: <商品ID> を自動で付ける（Google への直接の呼び出しなどには付けない）。
  別のホストのAPIを呼ぶ場合、サーバーは CORS で X-Product ヘッダを許可すること。
・同じサイトの鑑定書（meishi-sheet.html は3か所でバイト同一のため埋め込まない）にも伝わるよう、localStorage['pk_product'] にも書く。
・サーバー側は、X-Product を「目印」として使う（本人確認はトークンで行い、トークンの商品と違えば断る）。

使い方（リポジトリのルートで）：
    python3 tools/add_product_tag.py
※ 生成スクリプト（tools/sync_beginner_from_pro.py・tools/eki_pay_from_pro.py eki-pro）の「あと」に実行する
  （生成すると PRO の目印がそのまま写るため、最後にサイトごとの商品IDへ入れ直す）。何度実行しても同じ結果。
※ 新しい商品を足すときは、下の PRODUCTS に「フォルダ: 商品ID」を1行足す。
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = {          # フォルダ : 商品ID（基盤の商品マスタと同じ値。英小文字・数字・-）
    'pro': 'pro',
    'beginner': 'beginner',
    'eki-pro': 'eki',
}
SKIP = {'meishi-sheet.html'}   # 3か所でバイト同一に保つファイル（鑑定書は localStorage['pk_product'] を読む）

TPL = ('<script id="pk-product">/* 共通基盤に商品を伝える目印（tools/add_product_tag.py が埋め込む。直接編集しない） */'
       '(function(){var P="%s";window.PK_PRODUCT=P;try{localStorage.setItem("pk_product",P);}catch(e){}'
       'if(!window.fetch||window.__pkProd)return;window.__pkProd=1;var f=window.fetch;'
       'window.fetch=function(u,o){try{var s=typeof u==="string"?u:(u&&u.url)||"";'
       'var pa=s;try{pa=new URL(s,location.href).pathname;}catch(e){}'
       'if(/^(\\/\\.netlify\\/functions\\/|\\/api\\/)/.test(pa)){o=Object.assign({},o||{});var h=new Headers(o.headers||{});'
       'if(!h.has("X-Product"))h.set("X-Product",P);o.headers=h;}}catch(e){}return f.call(this,u,o);};})();</script>\n')
PAT = re.compile(r'<script id="pk-product">[\s\S]*?</script>\n?')

done = []
for folder, pid in PRODUCTS.items():
    assert re.fullmatch(r'[a-z0-9-]+', pid), pid
    block = TPL % pid
    for p in sorted((ROOT / folder).rglob('*.html')):
        if p.name in SKIP or 'node_modules' in p.parts:
            continue
        s = p.read_text(encoding='utf-8')
        if PAT.search(s):
            s2 = PAT.sub(lambda m: block, s, count=1)
        else:
            m = re.search(r'<head[^>]*>\n?', s, re.I)
            s2 = (s[:m.end()] + block + s[m.end():]) if m else (block + s)
        if s2 != s:
            p.write_text(s2, encoding='utf-8')
            done.append(str(p.relative_to(ROOT)))
print(f'OK: {len(done)} ファイルに商品の目印を埋め込み・更新しました。')
for x in done:
    print('  ', x)
