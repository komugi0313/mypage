"""ワンソナを Firebase に公開するための public/ フォルダを作る。
- index.html（診断）と lp.html（紹介ページ）に、ふつうのHTMLの頭（doctype・文字コード・画面幅）を付ける
- LP の「診断する」のリンクを、見本ページ（claude.ai）から本番の「/」に変える
- 画像（img・icon・lp）だけをコピーする（見本のファイルは出さない）
"""
import pathlib, re, shutil

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
    (OUT / name).write_text(HEAD + s, encoding="utf-8")
print("built", OUT)
