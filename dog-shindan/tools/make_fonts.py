"""ワンソナの文字の形（フォント）を、サイトで使っている文字だけの小さいファイルにする。
- 元のフォント（Google Fonts と同じ M PLUS Rounded 1c・Mochiy Pop One。SIL Open Font License）を取ってきて、
  index.html・lp.html・privacy.html・404.html に出てくる文字＋ひらがな・カタカナ・英数字・記号だけを残す。
- できたファイルは fonts/ に置き、build_site.py が公開用のページから読むようにする。
- 文を足して新しい文字が出てきたら、もう一度これを回す（回さなくても、その文字だけ Google Fonts から読むので表示はくずれない）。
使い方：pip install fonttools brotli ／ python3 dog-shindan/tools/make_fonts.py
"""
import pathlib, subprocess, tempfile, urllib.request, sys
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "fonts"
SRC = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
FONTS = [  # (ファイル名, 元, family, weight)
    ("mplus-r-500", "mplusrounded1c/MPLUSRounded1c-Medium.ttf", "M PLUS Rounded 1c", 500),
    ("mplus-r-800", "mplusrounded1c/MPLUSRounded1c-ExtraBold.ttf", "M PLUS Rounded 1c", 800),
    ("mochiy-400", "mochiypopone/MochiyPopOne-Regular.ttf", "Mochiy Pop One", 400),
]
PAGES = ["index.html", "lp.html", "privacy.html", "404.html"]


def chars():
    cs = set()
    for p in PAGES:
        cs |= {c for c in (ROOT / p).read_text(encoding="utf-8") if ord(c) > 0x7F}
    cs |= {chr(c) for c in range(0x20, 0x7F)}            # 英数字・記号
    cs |= {chr(c) for c in range(0x3000, 0x3040)}        # 、。「」など
    cs |= {chr(c) for c in range(0x3041, 0x3097)}        # ひらがな
    cs |= {chr(c) for c in range(0x30A0, 0x3100)}        # カタカナ
    cs |= {chr(c) for c in range(0xFF01, 0xFF5F)}        # 全角の英数字・記号
    cs |= set("ー・♡♥★☆…‥〜～※←→↑↓○●◎△□■◇◆")
    return {c for c in cs if not (0xD800 <= ord(c) <= 0xDFFF) and c not in "​‌‍️︎"}


def ranges(cps):
    cps = sorted(cps); out = []; s = p = cps[0]
    for c in cps[1:]:
        if c == p + 1:
            p = c; continue
        out.append((s, p)); s = p = c
    out.append((s, p))
    return ", ".join("U+%X" % a if a == b else "U+%X-%X" % (a, b) for a, b in out)


def main():
    OUT.mkdir(exist_ok=True)
    text = "".join(sorted(chars()))
    css = ["/* ワンソナで使う文字だけの小さいフォント（tools/make_fonts.py で作る）。SIL Open Font License 1.1 */"]
    with tempfile.TemporaryDirectory() as td:
        for name, src, fam, w in FONTS:
            ttf = pathlib.Path(td) / (name + ".ttf")
            urllib.request.urlretrieve(SRC + src, ttf)
            opt = subset.Options(); opt.flavor = "woff2"; opt.layout_features = ["*"]; opt.name_IDs = ["*"]; opt.name_languages = ["*"]; opt.notdef_outline = True; opt.hinting = False
            f = TTFont(ttf); sub = subset.Subsetter(opt); sub.populate(text=text); sub.subset(f)
            have = set(f.getBestCmap())
            dst = OUT / (name + ".woff2"); subset.save_font(f, dst, opt)
            print(name, dst.stat().st_size // 1024, "KB", len(have), "文字")
            css.append("@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;src:url(%s.woff2) format('woff2');unicode-range:%s}" % (fam, w, name, ranges(have)))
    (OUT / "w44fonts.css").write_text("\n".join(css) + "\n", encoding="utf-8")
    # ライセンス：2つのフォントの著作権表示＋SIL Open Font License 1.1 の本文
    with tempfile.TemporaryDirectory() as td:
        lic = pathlib.Path(td) / "OFL.txt"
        urllib.request.urlretrieve(SRC + "mochiypopone/OFL.txt", lic)
        body = lic.read_text(encoding="utf-8").split("\n", 1)[1]
    (OUT / "OFL.txt").write_text("Copyright 2016 The Rounded M+ Project Authors. (M PLUS Rounded 1c)\n"
        "Copyright 2020 The Mochiypop Project Authors (https://github.com/fontdasu/Mochiypop) (Mochiy Pop One)\n" + body, encoding="utf-8")
    print("ok", len(text), "文字")


if __name__ == "__main__":
    main()
