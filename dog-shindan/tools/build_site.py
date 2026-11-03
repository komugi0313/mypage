"""ワンソナを Firebase に公開するための public/ フォルダを作る。
- index.html（診断）と lp.html（紹介ページ）に、ふつうのHTMLの頭（doctype・文字コード・画面幅）を付ける
- LP の「診断する」のリンクを、見本ページ（claude.ai）から本番の「/」に変える
- 画像（img・icon・lp）だけをコピーする（見本のファイルは出さない）
"""
import hashlib, pathlib, re, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
HEAD = ('<!doctype html>\n<html lang="ja">\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n')

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
for d in ["img", "icon", "lp"]:
    shutil.copytree(ROOT / d, OUT / d)

for name in ["index.html", "lp.html"]:
    s = (ROOT / name).read_text(encoding="utf-8")
    s = re.sub(r'<meta name="claude:[^"]+" content="[^"]*">\n?', "", s)
    s = s.replace("https://claude.ai/artifact/1ATMWRJJ6V7o1zeozsvauu", "/")
    if name == "lp.html":
        s = s.replace("<title>ワンソナ紹介ページ</title>", "<title>44Wansonalities｜うちの子は、何気質？</title>")
    assert "claude.ai/artifact" not in s, name
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
