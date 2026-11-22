#!/usr/bin/env python3
"""「相手が答えたら、メールでお知らせ（任意）」の部品を3つの無料サイトに入れる（tools/notify_email.js を埋め込む）。
使い方: python3 tools/add_notify_email.py
  ・isync/index.html・nitaku/index.html・koi16/index.html の </head> の前に
    <!--NOTIFY-MAIL:start--> 〜 <!--NOTIFY-MAIL:end--> を作り直す。
  ・サーバーにつなぐときは下の SITES の endpoint に受け口のアドレスを入れて回し直す
    （くわしくは handoff/メール通知_つなぎ方.md）。None のあいだは、どこにも送らない。
"""
import os, re, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = open(os.path.join(ROOT, 'tools', 'notify_email.js'), encoding='utf-8').read()

# (ファイル, サイト名, プライバシーポリシー, 受け口, 文字, 線, ボタンの地, ボタンの文字, ボタンの線, 札の地, うすい地)
SITES = [
    ('isync/index.html',  'isync',  'privacy.html', None, '#2A2559', '#BFB6E2', '#2A2559', '#FFFFFF', '#2A2559', '#F1EEFA', '#FFFFFF'),
    ('nitaku/index.html', 'nitaku', 'privacy.html', None, '#1E1E2A', '#1E1E2A', '#FF3D7F', '#1E1E2A', '#1E1E2A', '#FFE071', '#FFFFFF'),
    ('koi16/index.html',  'koi16',  '?privacy=1',   None, '#4A362B', '#E3CFC4', '#B01A5A', '#FFFFFF', '#B01A5A', '#FBE4EC', '#FFFCF7'),
]

def css(ink, line, bg, fg, bd, tag, card):
    return f'''<style id="pk-notify-css">
.pkn{{margin:14px 0;padding:16px 16px 12px;border:1.5px solid {line};border-radius:16px;background:{card};color:{ink};text-align:left}}
.pkn-h{{display:flex;align-items:center;flex-wrap:wrap;gap:6px 8px;margin:0 0 6px;font-weight:800;font-size:16px;line-height:1.5}}
.pkn-ic{{flex:none;color:{ink}}}
.pkn-t{{flex:0 1 auto}}
.pkn-tag{{display:inline-block;padding:1px 9px;border-radius:999px;background:{tag};color:{ink};font-size:12.5px;font-weight:800;white-space:nowrap}}
.pkn-soon{{background:#ECECEC;color:#4A4A4A}}
.pkn-d{{margin:0 0 10px;font-size:14px;line-height:1.7}}
.pkn-f{{margin:0}}
.pkn-l{{display:block;margin:0 0 8px;font-size:13px;font-weight:700}}
.pkn-l span{{display:block;margin:0 0 4px}}
.pkn-in{{display:block;box-sizing:border-box;width:100%;min-height:46px;padding:10px 12px;border:2px solid {line};border-radius:12px;background:#FFFFFF;color:{ink};font:inherit;font-size:16px}}
.pkn-c{{display:flex;align-items:flex-start;gap:8px;margin:0 0 10px;min-height:44px;font-size:13.5px;line-height:1.6;cursor:pointer}}
.pkn-c input{{flex:none;width:22px;height:22px;margin:2px 0 0}}
.pkn-c a{{color:{ink};text-decoration:underline}}
.pkn-go{{display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;padding:8px 16px;border:2px solid {bd};border-radius:999px;background:{bg};color:{fg};font:inherit;font-size:15.5px;font-weight:800;cursor:pointer}}
.pkn-go:disabled{{opacity:.6}}
.pkn-m{{margin:8px 0 0;padding:8px 10px;border-radius:10px;font-size:13.5px;line-height:1.6;background:#F3F7EE;color:#2F4A1E}}
.pkn-m.bad{{background:#FDECEC;color:#8A1F1F}}
.pkn-s{{margin:10px 0 0;font-size:12.5px;line-height:1.6;color:{ink};opacity:.85}}
</style>'''

for path, site, priv, ep, ink, line, bg, fg, bd, tag, card in SITES:
    p = os.path.join(ROOT, path)
    s = open(p, encoding='utf-8').read()
    cfg = json.dumps({'site': site, 'endpoint': ep, 'privacy': priv}, ensure_ascii=False)
    blk = ('<!--NOTIFY-MAIL:start（相手が答えたらメールでお知らせ＝3サイト共通。元は tools/notify_email.js、tools/add_notify_email.py が埋め込む。直すときは元を直して再実行）-->\n'
           + css(ink, line, bg, fg, bd, tag, card) + '\n'
           + '<script>window.PK_NOTIFY_CFG=' + cfg + ';\n' + JS + '</script>\n<!--NOTIFY-MAIL:end-->')
    if '<!--NOTIFY-MAIL:start' in s:
        s = re.sub(r'<!--NOTIFY-MAIL:start.*?<!--NOTIFY-MAIL:end-->', lambda m: blk, s, flags=re.S)
    else:
        i = s.index('</head>')
        s = s[:i] + blk + '\n' + s[i:]
    open(p, 'w', encoding='utf-8').write(s)
    print('ok', path)
