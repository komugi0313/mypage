"""ワンソナの会員まわりのメールのひな形を作る（エンジニアの方に渡す用。サイトには公開しない）。
python3 dog-shindan/tools/build_mail.py で dog-shindan/mail/ に
  <名前>.html（見た目つき）と <名前>.txt（文字だけ）を作る。
{{...}} の印は、送るときにサーバーが中身に置きかえる（mail/README.md）。
"""
import html, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "mail"
OUT.mkdir(exist_ok=True)
SITE = "https://44wansona.com"
LOGO = SITE + "/icon/favicon-96.png"

# 色は診断の画面と同じ（地＝うす青・文字＝こい灰・ボタン＝青緑）
BG, CARD, INK, MUTED, TEAL, MINT = "#E9F1F4", "#FFFFFF", "#2F3A45", "#4E5A66", "#2F6878", "#CFE7EC"

MAILS = [
  dict(name="verify", subject="メールアドレスの確認",
       pre="ボタンを押すと、ワンソナの登録が終わります。",
       title="ワンソナへようこそ",
       body=["ワンソナに登録してくださり、ありがとうございます。",
             "下のボタンを押して、登録を終わらせてください。"],
       button=("登録を終わらせる", "{{ACTION_URL}}"),
       after=["ボタンは24時間使えます。",
              "登録が終わると、うちの子の記録が機種を変えても見られるようになります。"],
       note="心当たりがないときは、このメールを消してください。登録は終わりません。"),
  dict(name="change-email", subject="新しいメールアドレスの確認",
       pre="ボタンを押すと、このメールアドレスに切りかわります。",
       title="メールアドレスの変更",
       body=["ワンソナで、メールアドレスの変更を受けつけました。",
             "下のボタンを押すと、ログインに使うメールアドレスが、このアドレスに切りかわります。"],
       button=("このメールアドレスにする", "{{ACTION_URL}}"),
       after=["ボタンは24時間使えます。"],
       note="心当たりがないときは、このメールを消してください。メールアドレスは変わりません。"),
  dict(name="reset-password", subject="パスワードを作り直す",
       pre="ボタンから、新しいパスワードを決めてください。",
       title="パスワードの作り直し",
       body=["ワンソナのパスワードを作り直すためのメールです。",
             "下のボタンから、新しいパスワードを決めてください。"],
       button=("新しいパスワードを決める", "{{ACTION_URL}}"),
       after=["ボタンは1時間使えます。"],
       note="心当たりがないときは、このメールを消してください。パスワードは変わりません。"),
  dict(name="email-changed", subject="メールアドレスが変わりました",
       pre="ワンソナに登録しているメールアドレスが変わりました。",
       title="メールアドレスが変わりました",
       body=["ワンソナに登録しているメールアドレスが、次のアドレスに変わりました。",
             "{{NEW_EMAIL}}",
             "このメールは、前のメールアドレスにお送りしています。"],
       button=None,
       after=[],
       note="心当たりがないときは、このメールに返信してください。すぐに確かめます。"),
  dict(name="newsletter", subject="{{SUBJECT}}",
       pre="{{PREHEADER}}",
       title="{{TITLE}}",
       body=["{{BODY}}"],
       button=("{{BUTTON_LABEL}}", "{{BUTTON_URL}}"),
       after=[],
       note="このメールは、登録のときに「ワンソナからのメールを受け取る」を選んだ方にお送りしています。",
       unsub=True),
]


def esc(s):
    return html.escape(s, quote=True)


def para(t, strong=False):
    st = f"margin:0 0 14px;font-size:16px;line-height:1.8;color:{INK};"
    if strong:
        st += "font-weight:700;font-size:17px;"
    return f'<p style="{st}">{esc(t)}</p>'


def build_html(m):
    body = "".join(para(t, strong=(t == "{{NEW_EMAIL}}")) for t in m["body"])
    btn = ""
    if m["button"]:
        label, url = m["button"]
        btn = (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 22px">'
               f'<tr><td align="center" bgcolor="{TEAL}" style="border-radius:999px">'
               f'<a href="{esc(url)}" style="display:inline-block;padding:15px 34px;font-size:17px;font-weight:700;'
               f'color:#FFFFFF;text-decoration:none;border-radius:999px">{esc(label)}</a></td></tr></table>')
    after = "".join(f'<p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:{MUTED}">{esc(t)}</p>' for t in m["after"])
    link = ""
    if m["button"]:
        link = (f'<p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:{MUTED}">ボタンが押せないときは、'
                f'次のアドレスをブラウザに貼りつけてください。<br>'
                f'<a href="{esc(m["button"][1])}" style="color:{TEAL};word-break:break-all">{esc(m["button"][1])}</a></p>')
    note = (f'<p style="margin:16px 0 0;padding:12px 14px;background:{BG};border-radius:12px;font-size:14px;'
            f'line-height:1.7;color:{INK}">{esc(m["note"])}</p>')
    unsub = ""
    if m.get("unsub"):
        unsub = (f'<p style="margin:10px 0 0;font-size:13px;line-height:1.7;color:{MUTED}">'
                 f'<a href="{{{{UNSUBSCRIBE_URL}}}}" style="color:{TEAL}">メールの配信を止める</a>'
                 f'（マイページの「アカウント」からも止められます）</p>')
    return f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>{esc(m["subject"])}</title>
</head>
<body style="margin:0;padding:0;background:{BG};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{esc(m["pre"])}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{BG}">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:'Hiragino Maru Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif">
<tr><td align="center" style="padding:0 0 14px">
<img src="{LOGO}" width="48" height="48" alt="" style="display:block;border:0;border-radius:12px">
<div style="margin-top:6px;font-size:15px;font-weight:700;color:{TEAL}">ワンソナ</div>
</td></tr>
<tr><td bgcolor="{CARD}" style="border:3px solid {MINT};border-radius:22px;padding:26px 22px">
<h1 style="margin:0 0 16px;font-size:21px;line-height:1.5;color:{TEAL}">{esc(m["title"])}</h1>
{body}{btn}{after}{link}{note}{unsub}
</td></tr>
<tr><td align="center" style="padding:18px 8px 0;font-size:12px;line-height:1.8;color:{MUTED}">
ワンソナ（44Wansonalities）　<a href="{SITE}" style="color:{TEAL}">44wansona.com</a><br>
運営：{{{{OPERATOR}}}}　お問い合わせ：{{{{CONTACT}}}}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
"""


def build_txt(m):
    lines = [f"件名：{m['subject']}", "", m["title"], ""]
    lines += m["body"] + [""]
    if m["button"]:
        lines += [f"▼ {m['button'][0]}", m["button"][1], ""]
    lines += m["after"] + ([""] if m["after"] else [])
    lines += [m["note"]]
    if m.get("unsub"):
        lines += ["", "▼ メールの配信を止める", "{{UNSUBSCRIBE_URL}}"]
    lines += ["", "――", "ワンソナ（44Wansonalities）" + " " + SITE,
              "運営：{{OPERATOR}}　お問い合わせ：{{CONTACT}}", ""]
    return "\n".join(lines)


for m in MAILS:
    (OUT / f"{m['name']}.html").write_text(build_html(m), encoding="utf-8")
    (OUT / f"{m['name']}.txt").write_text(build_txt(m), encoding="utf-8")
print("built", len(MAILS), "mails ->", OUT)
