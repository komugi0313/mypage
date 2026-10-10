#!/usr/bin/env python3
"""
ビギナー（今日から占い師）を、PRO（四柱推命 自動鑑定）の最新コードから生成する。

方針：計算・判定・画面・詳細鑑定の中身は PRO と 100% 同じ。
      ビギナーで変えるのは「名前・アイコン・説明文・リンク先・マニフェスト・SW版番号の読み取り」と
      「見た目（色・縁取り・ボタン文言）」と「初心者モードの見せ方（五行のやさしい表示・専門的な表の折りたたみ・切替ボタン）」だけ。
      どれも表示の後処理で、計算・判定・鑑定文には影響しない。

使い方（リポジトリのルートで）：
    python3 tools/sync_beginner_from_pro.py
生成・更新するもの：
    beginner/app-beginner.html   … pro/app-pro.html から生成
    beginner/auth.html           … pro/auth.html から生成
    beginner/pklove.js           … pro/pklove.js をコピー
※ beginner/sw.js の CACHE 版数は手で1つ上げること（CLAUDE.md の運用どおり）。
※ PRO 側の該当箇所が見つからないと止まる（黙って崩れたまま出力しない）。
"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRO, BEG = ROOT / 'pro', ROOT / 'beginner'

B_TITLE = '今日から占い師｜一生使える、自分だけの鑑定ツール'
B_NAME = '今日から占い師'
B_DESC = '生年月日を入れるだけで、命式・大運・年運・相性まで自動で読み解く四柱推命ツール。はじめてでも、やさしい言葉で本格鑑定ができます。'
B_URL = 'https://www.suimei.jp/app-beginner.html'
B_OGP = 'https://www.suimei.jp/og-image.png'

# ビギナーの見た目（色・縁取り・ボタン文言）。CSS と文言だけで、計算・判定・鑑定文には一切影響しない。
BEGINNER_SKIN = """<style id="beginner-skin">
/* ===== ビギナーの見た目（tools/sync_beginner_from_pro.py が付与）。色・縁取りのみ。計算・判定・鑑定文には影響しない ===== */
.card.ai-box{background:linear-gradient(0deg,rgba(31,164,99,.15),rgba(31,164,99,.15)),var(--card);border-color:rgba(31,164,99,.6);border-left:5px solid #1FA463}
#compat-card{background:linear-gradient(0deg,rgba(229,51,140,.13),rgba(229,51,140,.13)),var(--card);border-color:rgba(229,51,140,.6);border-left:5px solid #E5338C}
.reading-card{border:2px solid var(--line);border-left:6px solid var(--ka);box-shadow:none}
.reading-card .r-summary{background:var(--ka-w);border-left:4px solid var(--ka);color:inherit}
.brand .sub{display:block;font-weight:800;color:var(--ink2)}
#bg-intro{background:linear-gradient(135deg,#FDF3E2,#FCE9E6);border:2px solid #F2D9A6;border-radius:16px;padding:16px 18px;margin:0 0 14px}
#bg-intro .t{font-weight:900;font-size:16px;color:#B4471F;margin-bottom:8px}
#bg-intro .steps{display:flex;gap:8px;flex-wrap:wrap}
#bg-intro .s{flex:1 1 150px;background:#fff;border:1px solid #F0DFBE;border-radius:12px;padding:10px 12px;font-size:13.5px;font-weight:800;color:#4A4030}
#bg-intro .s b{color:#E8392B}
</style>
"""

# ビギナー専用の見せ方（初心者モード：五行のやさしい棒グラフ・専門的な表の折りたたみ・上級者モード切替）。
# 表示の後処理だけで、計算・判定・鑑定文には影響しない。初心者モードOFFでPROと同じ画面になる。
BEGINNER_UI = (ROOT / 'tools' / 'beginner_ui.html').read_text(encoding='utf-8')


def rep(s, old, new, count=None, label=''):
    n = s.count(old)
    if n == 0 or (count is not None and n != count):
        sys.exit(f'[止めました] {label or old[:60]!r} が想定どおり見つかりません（{n}件）。PRO側の変更を確認してください。')
    return s.replace(old, new)


def beginner_icons(cur):
    """現在のビギナーから、アイコン（静的link と window.__ICON__ スクリプト）を取り出す"""
    link = re.search(r'<link rel="icon" type="image/png" href="data:image/png;base64,[^"]+">', cur)
    icon = re.search(r'<script>window\.__ICON__=[\s\S]*?</script>', cur)
    if not (link and icon):
        sys.exit('[止めました] 現在のビギナーからアイコンを取り出せません。')
    return link.group(0), icon.group(0)


def build_app():
    pro = (PRO / 'app-pro.html').read_text(encoding='utf-8')
    cur = (BEG / 'app-beginner.html').read_text(encoding='utf-8')
    link_icon, icon_script = beginner_icons(cur)
    s = pro

    # ---- head：タイトル・説明・OGP・アイコン・マニフェスト ----
    s = rep(s, '<title>四柱推命占い自動鑑定</title>', f'<title>{B_TITLE}</title>\n{link_icon}', 1)
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{B_DESC}">', s, count=1)
    s = rep(s, '★本番ドメインが72k.ai以外なら', '★本番ドメインがsuimei.jp以外なら', 1)
    s = rep(s, '<meta property="og:site_name" content="Meishiki Inc.">', f'<meta property="og:site_name" content="{B_NAME}">', 1)
    s = rep(s, '<meta property="og:title" content="四柱推命 自動鑑定">', f'<meta property="og:title" content="{B_NAME}">', 1)
    s = rep(s, '<meta name="twitter:title" content="四柱推命 自動鑑定">', f'<meta name="twitter:title" content="{B_NAME}">', 1)
    s = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{B_DESC}">', s, count=1)
    s = re.sub(r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{B_DESC}">', s, count=1)
    s = rep(s, 'https://72k.ai/app-pro.html', B_URL, 1)
    s = rep(s, 'https://72k.ai/ogp.png', B_OGP, 2)
    s = re.sub(r'<script>window\.__ICON__=[\s\S]*?</script>', lambda m: icon_script, s, count=1)
    s = rep(s, '<meta name="apple-mobile-web-app-title" content="四柱推命占い自動鑑定">',
            f'<meta name="apple-mobile-web-app-title" content="{B_NAME}">', 1)
    s = rep(s, 'manifest-pro.webmanifest', 'manifest-beginner.webmanifest', 1)

    # ---- 画面の名前（会員ゲート・ヘッダー） ----
    s = rep(s, 'alt="四柱推命占い自動鑑定"', f'alt="{B_NAME}"', 2)
    s = rep(s, '<h2 class="mg-title">四柱推命占い<span style="color:var(--do)">自動鑑定</span></h2>',
            '<h2 class="mg-title">今日から<span style="color:var(--do)">占い師</span></h2>\n'
            '    <div style="font-size:11.5px;font-weight:800;letter-spacing:.08em;color:var(--muted);margin:-2px 0 4px">一生使える、自分だけの鑑定ツール</div>', 1)
    s = rep(s, '<h1>四柱推命占い<span style="color:var(--do)">自動鑑定</span></h1>',
            '<h1>今日から<span style="color:var(--do)">占い師</span></h1>', 1)
    s = rep(s, '<div class="sub"><span class="nb">命式・運勢・相性・鑑定書、</span> <span class="nb">全てこれ一つで。</span></div>',
            '<div class="sub"><span class="nb">一生使える、</span> <span class="nb">自分だけの鑑定ツール</span></div>', 1)

    # ---- 共有カードの表示名（社名は共通） ----
    s = rep(s, "SHARE_SITE={ label:'四柱推命 自動鑑定',", f"SHARE_SITE={{ label:'{B_NAME}',", 1)

    # ---- リンク先（ビギナーのページへ） ----
    s = rep(s, 'pricing-pro.html', 'pricing.html')
    s = rep(s, 'mypage-pro.html', 'mypage.html')
    s = rep(s, 'textbook-pro.html', 'textbook.html')

    # ---- ビギナーの見た目（色・縁取り）と「占ってみる」ボタン ----
    hi = s.find('</head>')
    if hi < 0 or hi > s.find('<body'):
        sys.exit('[止めました] </head> が見つかりません。')
    s = s[:hi] + BEGINNER_SKIN + s[hi:]
    s = rep(s, '  <section class="card panel">',
            '  <div id="bg-intro"><div class="t">むずかしい知識は、いりません。</div><div class="steps">'
            '<div class="s"><b>①</b> 生年月日を入れる</div><div class="s"><b>②</b> 「占ってみる」を押す</div>'
            '<div class="s"><b>③</b> 出てきた文章を読むだけ</div></div></div>\n  <section class="card panel">', 1)
    s = rep(s, '<button class="go" id="f-go" style="flex:1">この内容で占う</button>',
            '<button class="go" id="f-go" style="flex:1"><img src="icon-crystal.png" alt="" style="height:1.2em;width:auto;vertical-align:-0.26em;"> 占ってみる</button>', 1)

    # ---- ビギナー専用の見せ方（初心者モード）を本体スクリプトの後に付ける ----
    bi = s.rfind('</body>')
    if bi < 0:
        sys.exit('[止めました] </body> が見つかりません。')
    s = s[:bi] + BEGINNER_UI + s[bi:]

    # ---- アプリ内のバージョン表示（SWのキャッシュ名から読む） ----
    s = rep(s, 'match(/shichu-jidou-(v\\d+)/)', 'match(/kyoukara-uranaishi-(v\\d+)/)', 1)

    left = [w for w in ('app-pro.html', '-pro.html', 'manifest-pro', 'shichu-jidou', '72k.ai/app') if w in s]
    if left:
        sys.exit(f'[止めました] PRO固有の参照が残っています：{left}')
    head = ('<!-- このファイルは tools/sync_beginner_from_pro.py が pro/app-pro.html から生成しています。'
            '直接編集せず、PROを直してから生成し直してください。 -->\n')
    s = s.replace('<html lang="ja">', head + '<html lang="ja">', 1)
    (BEG / 'app-beginner.html').write_text(s, encoding='utf-8')
    return s


def build_auth():
    s = (PRO / 'auth.html').read_text(encoding='utf-8')
    s = rep(s, '｜四柱推命占い 自動鑑定</title>', f'｜{B_NAME}</title>', 1)
    s = rep(s, 'mypage-pro.html', 'mypage.html')
    s = rep(s, 'pricing-pro.html', 'pricing.html')
    s = rep(s, "AFTER_LOGIN: 'app-pro.html'", "AFTER_LOGIN: 'app-beginner.html'", 1)
    (BEG / 'auth.html').write_text(s, encoding='utf-8')


if __name__ == '__main__':
    build_app()
    build_auth()
    shutil.copyfile(PRO / 'pklove.js', BEG / 'pklove.js')
    print('OK: beginner/app-beginner.html, beginner/auth.html, beginner/pklove.js を生成しました。'
          ' beginner/sw.js の CACHE を1つ上げてください。')
