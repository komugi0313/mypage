"""ワンソナを Firebase に公開するための public/ フォルダを作る。
- index.html（診断）と lp.html（紹介ページ）に、ふつうのHTMLの頭（doctype・文字コード・画面幅）を付ける
- LP の「診断する」のリンクを、見本ページ（claude.ai）から本番の「/」に変える
- 画像（img・icon・lp）とフォント（fonts）だけをコピーする（見本のファイルは出さない）
- 文字の形（フォント）は、サイトで使う文字だけの小さいファイル（fonts/。tools/make_fonts.py で作る）を先に使う。
  そこにない文字（お客様が入れた名前の漢字など）だけ Google Fonts から読む（Google Fonts の読みこみは表示を止めない）
"""
import hashlib, pathlib, re, shutil

GF = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=M+PLUS+Rounded+1c:wght@500;800&display=swap">'


def fonts_html():
    css = (pathlib.Path(__file__).resolve().parent.parent / "fonts" / "w44fonts.css").read_text(encoding="utf-8")
    def u(m):
        f = pathlib.Path(__file__).resolve().parent.parent / "fonts" / m.group(1)
        return "url(/fonts/%s?v=%s)" % (m.group(1), hashlib.md5(f.read_bytes()).hexdigest()[:8])
    css = re.sub(r"url\(([\w-]+\.woff2)\)", u, css)
    pre = re.search(r"url\((/fonts/mplus-r-500\.woff2\?v=\w+)\)", css).group(1)
    # Google Fonts は先に置く（あとに書いた小さいフォントが先に使われる）・表示を止めない読み方にする
    return (GF.replace('rel="stylesheet"', 'rel="stylesheet" media="print" onload="this.media=\'all\'"') + "\n"
            + '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>\n' % pre
            + "<style>" + css.split("\n", 1)[1].strip() + "</style>")

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
HEAD = ('<!doctype html>\n<html lang="ja">\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">\n')

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
for d in ["img", "icon", "lp", "fonts"]:
    shutil.copytree(ROOT / d, OUT / d)
for f in ["robots.txt", "sitemap.xml", "favicon.ico"]:
    shutil.copy(ROOT / f, OUT / f)

for name in ["index.html", "lp.html", "privacy.html", "404.html"]:
    s = (ROOT / name).read_text(encoding="utf-8")
    s = re.sub(r'<meta name="claude:[^"]+" content="[^"]*">\n?', "", s)
    s = s.replace("https://claude.ai/artifact/1ATMWRJJ6V7o1zeozsvauu", "/")
    if name == "lp.html":
        s = s.replace("<title>ワンソナ紹介ページ</title>", "<title>44Wansonalities｜うちの子は、何気質？</title>")
    assert "claude.ai/artifact" not in s, name
    assert GF in s, name + " のフォントの読みこみが見つかりません"
    s = s.replace(GF, fonts_html(), 1)
    # 画像の住所に、中身ごとにちがう印（?v=…）を付ける。画像を差しかえたとき、古い画像が残って見えないように
    def ver(m):
        f = ROOT / m.group(2)
        if not f.is_file():
            return m.group(0)
        h = hashlib.md5(f.read_bytes()).hexdigest()[:8]
        return m.group(1) + m.group(2) + "?v=" + h + '"'
    s = re.sub(r'((?:src|href)=")((?:img|icon|lp)/[^"?]+)"', ver, s)
    (OUT / name).write_text(HEAD + s, encoding="utf-8")
print("built", OUT)
