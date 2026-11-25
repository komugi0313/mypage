# 1.66 奇跡の相性診断（166unmei.com）に貼る、無料サイトのバナー（恋のかたち診断・究極の二択・アイシンク・ワンソナ）を作る。
# 鑑定者本人 2026-11-20「1.66 の愛情診断にも全てのバナーを貼りたい」。
# 1.66 のファイルはこの作業場所にないので、貼るだけで動く部品を作る（絵は中に入れてあるので、ほかのファイルはいらない）。
# 見た目は3つのサイトの相互リンク（.sis）と同じ。ほかのページの見た目とまざらないよう、名前の頭は sis166。
# 作り直し：python3 -I tools/make_166_banners.py → for-166/
import base64, os, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'for-166')
os.makedirs(OUT, exist_ok=True)

def img(rel):
    with open(os.path.join(ROOT, rel), 'rb') as f:
        return 'data:image/webp;base64,' + base64.b64encode(f.read()).decode()

LATC = img('nitaku/img/sis/koi.webp')  # 恋のかたち診断のバナーの絵＝サイトのアイコン「ハートに恋」（鑑定者本人 2026-11-21）
PANDA = img('isync/img/sis/panda.webp')
AI = img('nitaku/img/sis/ai.webp')
YUU = img('nitaku/img/sis/yuu.webp')
WAN = img('nitaku/img/sis/wansona.webp')
TP16 = img('nitaku/img/sis/16tp.webp')  # 16TYPE+（鑑定者本人 2026-11-25「両方足してください」）

FONT_TEXT = urllib.parse.quote('恋のかたち診断究極の二択I-Sync')
FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One'
         '&family=Shippori+Mincho+B1:wght@800&family=Quicksand:wght@700&text=' + FONT_TEXT + '&display=swap">')

CSS = """<style>
.sis166{display:flex;flex-direction:column;gap:10px;margin:20px auto 8px;max-width:560px;text-align:left;font-family:'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif}
.sis166 .sis-h{margin:0;font-size:14px;font-weight:900;text-align:center;color:inherit}
.sis166 .bn{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;text-decoration:none;min-height:76px;box-sizing:border-box}
.sis166 .bn .pic{flex:none;display:flex;align-items:flex-end}.sis166 .bn .pic img{display:block;height:auto}
.sis166 .bn .tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.sis166 .bn .nm{font-size:18px;line-height:1.25}
.sis166 .bn .ln{font-size:12.5px;line-height:1.5;font-weight:700}
.sis166 .bn .dm{font-size:11.5px;font-weight:700}
.sis166 .bn .go{flex:none;border-radius:99px;padding:8px 12px;font-size:13px;font-weight:900;min-height:44px;box-sizing:border-box;display:flex;align-items:center;white-space:nowrap}
.sis166 .nw{display:inline-block;white-space:nowrap}
.sis166 .bn-ko{background:linear-gradient(180deg,#FCE8EF,#FFFDFB);border:1px solid #EADDD3;box-shadow:0 4px 14px rgba(90,58,42,.12);color:#4A362B}
.sis166 .bn-ko .nm{font-family:'Shippori Mincho B1','Shippori Mincho',serif;font-weight:800;color:#5A3A2A}
.sis166 .bn-ko .dm{color:#6A5244}
.sis166 .bn-ko .go{background:#B01A5A;color:#fff}.sis166 .bn-ko .pic{align-items:center}.sis166 .bn-ko .pic img{border-radius:14px;box-shadow:0 1px 3px rgba(90,58,42,.16)}
.sis166 .bn-nt{background:#FFF8E1 radial-gradient(#F2DFA6 1.2px,transparent 1.3px) 0 0/12px 12px;border:2px solid #1E1E2A;box-shadow:3px 3px 0 #F2C94C;color:#1E1E2A}
.sis166 .bn-nt .nm{font-family:'Mochiy Pop One','Zen Maru Gothic',sans-serif;color:#C42E62;font-weight:400}
.sis166 .bn-nt .dm{color:#4A4A5A}
.sis166 .bn-nt .go{background:#FF3D7F;border:2px solid #1E1E2A;color:#1E1E2A}
.sis166 .bn-is{background:linear-gradient(120deg,#4A4B94,#6E5FA8 55%,#8C5A8C);color:#fff;box-shadow:0 4px 14px rgba(42,37,89,.22)}
.sis166 .bn-is .nm{font-family:'Quicksand',sans-serif;font-weight:700;font-size:21px;letter-spacing:.02em}
.sis166 .bn-is .nm small{font-family:inherit;font-size:11px;font-weight:700;margin-left:5px;letter-spacing:0}
.sis166 .bn-is .go{background:#fff;color:#2A2559}
.sis166 .bn-wa{background:#E8F3F4;border:1.5px solid #A9D3D6;box-shadow:0 4px 14px rgba(40,90,100,.10);color:#244E57}
.sis166 .bn-wa .pic img{border-radius:14px}
.sis166 .bn-wa .nm{font-weight:900;color:#1F4A55}
.sis166 .bn-wa .ln{color:#2F5560}
.sis166 .bn-wa .dm{color:#3E6670}
.sis166 .bn-wa .go{background:#2C6573;color:#fff}
.sis166 .bn-16{background:#FBF8F2;border:1px solid #E2E6EC;box-shadow:0 4px 14px rgba(31,39,51,.10);color:#1F2733}
.sis166 .bn-16 .pic img{border-radius:14px}
.sis166 .bn-16 .nm{font-family:'IBM Plex Mono',ui-monospace,'SFMono-Regular',Menlo,monospace;font-weight:600;font-size:20px;letter-spacing:.02em;color:#1F2733}
.sis166 .bn-16 .nm b{color:#C2553F;font-weight:700}
.sis166 .bn-16 .ln{color:#38414E}
.sis166 .bn-16 .dm{color:#5E6A7A}
.sis166 .bn-16 .go{background:#1F2733;color:#fff}
.sis166 .bn:active{transform:translateY(1px)}
@media (max-width:360px){.sis166 .bn{gap:8px;padding:10px}.sis166 .bn .nm{font-size:16px}.sis166 .bn-is .nm{font-size:18px}.sis166 .bn .go{padding:8px 10px;font-size:12px}.sis166 .bn .pic img{transform:scale(.88);transform-origin:bottom}}
</style>"""

HTML = ('<section class="sis166"><p class="sis-h">あなたのこと、もっと知りたくない？</p>'
 '<a class="bn bn-ko" data-nocg href="https://koikata.jp/aichaku/?ref=166" target="_blank" rel="noopener" aria-label="恋のかたち診断（別のサイト koikata.jp が開きます）"><span class="pic" aria-hidden="true"><img src="' + LATC + '" alt="" width="58" height="58" decoding="async"></span><span class="tx"><span class="nm">恋のかたち診断</span><span class="ln"><span class="nw">16の恋愛タイプ×</span><span class="nw">愛着スタイル</span></span><span class="dm"><span class="nw">koikata.jp・</span><span class="nw">無料4分</span></span></span><span class="go">診断 ↗</span></a>'
 '<a class="bn bn-nt" data-nocg href="https://honbare.com/?ref=166" target="_blank" rel="noopener" aria-label="究極の二択（別のサイト honbare.com が開きます）"><span class="pic" aria-hidden="true"><img src="' + PANDA + '" alt="" width="56" height="56" decoding="async"></span><span class="tx"><span class="nm">究極の二択</span><span class="ln"><span class="nw">恋もあるあるも、</span><span class="nw">本音がバレる2択</span></span><span class="dm"><span class="nw">honbare.com・</span><span class="nw">無料5分</span></span></span><span class="go">あそぶ ↗</span></a>'
 '<a class="bn bn-is" data-nocg href="https://i-sync.jp/?ref=166" target="_blank" rel="noopener" aria-label="アイシンク（別のサイト i-sync.jp が開きます）"><span class="pic" aria-hidden="true"><img src="' + AI + '" alt="" width="34" height="30" decoding="async"><img src="' + YUU + '" alt="" width="34" height="30" decoding="async"></span><span class="tx"><span class="nm">I-Sync<small>アイシンク</small></span><span class="ln"><span class="nw">2人の答えを重ねて、</span><span class="nw">シンクロ率がわかる</span></span><span class="dm"><span class="nw">i-sync.jp・</span><span class="nw">無料</span></span></span><span class="go">診断 ↗</span></a>'
 '<a class="bn bn-wa" data-nocg href="https://44wansona.com/?ref=166" target="_blank" rel="noopener" aria-label="ワンソナ（別のサイト 44wansona.com が開きます）"><span class="pic" aria-hidden="true"><img src="' + WAN + '" alt="" width="56" height="56" decoding="async"></span><span class="tx"><span class="nm">ワンソナ</span><span class="ln"><span class="nw">うちの子の性格を、</span><span class="nw">44犬種の</span><span class="nw">タイプで診断</span></span><span class="dm"><span class="nw">44wansona.com・</span><span class="nw">無料</span></span></span><span class="go">診断 ↗</span></a>'
'<a class="bn bn-16" data-nocg href="https://16typeplus.jp/?ref=166" target="_blank" rel="noopener" aria-label="16TYPE+（別のサイト 16typeplus.jp が開きます）"><span class="pic" aria-hidden="true"><img src="' + TP16 + '" alt="" width="54" height="54" loading="lazy" decoding="async"></span><span class="tx"><span class="nm">16TYPE<b>+</b></span><span class="ln"><span class="nw">生まれ持った気質と、</span><span class="nw">育ってきた性格がわかる</span></span><span class="dm"><span class="nw">16typeplus.jp・</span><span class="nw">無料</span></span></span><span class="go">診断 ↗</span></a>'
 '</section>')

SNIPPET = ('<!-- 3つの無料サイトのバナー（恋のかたち診断・究極の二択・アイシンク）ここから。\n'
           '     置きたい場所（トップのいちばん下・結果の下など）に、このかたまりをそのまま貼ってください。 -->\n'
           + FONTS + '\n' + CSS + '\n' + HTML + '\n<!-- 3つの無料サイトのバナー ここまで -->\n')

with open(os.path.join(OUT, '3サイトのバナー_貼る部品.html'), 'w', encoding='utf-8') as f:
    f.write(SNIPPET)

PREVIEW = ('<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
           '<title>3サイトのバナー（見本）</title><style>body{margin:0;padding:16px;background:#FBF3F1;color:#3A2A30}</style></head><body>'
           + SNIPPET + '</body></html>')
with open(os.path.join(OUT, '見本.html'), 'w', encoding='utf-8') as f:
    f.write(PREVIEW)

README = """# 1.66 奇跡の相性診断に貼る、3つの無料サイトのバナー

- `3サイトのバナー_貼る部品.html` … （2026-11-20 にワンソナ、2026-11-25 に 16TYPE+ も足して5枚） このかたまりを、1.66 のページの置きたい場所にそのまま貼ります（トップのいちばん下・結果の下など）。
  - 絵は中に入っているので、ほかのファイルをアップロードする必要はありません。
  - 押すと別のタブで、恋のかたち診断（koikata.jp/aichaku/）・究極の二択（honbare.com）・アイシンク（i-sync.jp）・ワンソナ（44wansona.com）・16TYPE+（16typeplus.jp）が開きます。
  - アドレスの後ろに `?ref=166` が付いているので、1.66 から来た人だとわかります。
  - 見た目は、3つのサイトどうしの相互リンクと同じです。
- `見本.html` … ブラウザで開くと、貼ったときの見え方を確かめられます。

作り直すとき：`python3 -I tools/make_166_banners.py`
"""
with open(os.path.join(OUT, 'はじめにお読みください.md'), 'w', encoding='utf-8') as f:
    f.write(README)
print('ok', len(SNIPPET))
