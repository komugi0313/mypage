# 究極の二択・アイシンクのプライバシーポリシーのページを作る（恋のかたち診断の形にそろえる）
# 鑑定者本人 2026-11-20「プライバシーポリシーは大丈夫か？」「リリースしたい」
# 使い方：python3 tools/free_privacy.py → nitaku/privacy.html・isync/privacy.html
# 送る・残す中身を変えたら、ここも直して回し直す（改定日を上げる）
import html, re

SEIT = '2026年11月20日'  # 制定日
REV = '2026年11月20日'   # 改定日
MAIL = 'info@72k.ai'

def esc(s): return html.escape(s, quote=True)

def table(rows):
    out = '<dl class="xt">'
    for k, v in rows:
        # 文の最後の5文字は一緒に改行する（「…表示する／ため」のように1〜2文字だけ残さない）
        v = re.sub(r'([^<>&;\s]{2,5})$', lambda m: '<span class="nw">' + m.group(1) + '</span>', v)
        out += '<dt>' + esc(k) + '</dt><dd>' + v + '</dd>'
    return out + '</dl>'

SITES = {
  'nitaku': dict(
    name='究極の二択 本音バレ診断', short='究極の二択', url='https://honbare.com/',
    bg='#FFF8E1', card='#FFFFFF', ink='#1E1E2A', sub='#4A4A5A', accent='#C42E62', line='#1E1E2A', soft='#FCE6EE',
    prefix='nitaku_',
    local='名前（ニックネーム）、選んだ設定（編・難しさ・問題の数など）、これまでに出た問題の記録、答えと結果（「前の診断の結果を見る」の10回ぶん）、キャラを決めるためのこれまでの答え（問題の目印と、どちらを選んだかだけ）、遊んだ回の平均、参加中の部屋の番号',
    reset='トップの「記録をリセットする」か、このページのいちばん下のボタンで消せます。',
    sends=[
      ('みんなで遊ぶ部屋', 'Firebase Cloud Firestore（Google LLC）',
       '部屋番号、ニックネーム、それぞれの問題で選んだ答えと答えるまでの秒数、部屋で作った問題、部屋に入った時刻、通信のためのIPアドレス',
       '同じ部屋の人と答えを見せ合うため。部屋の人には、ニックネームと答えが見えます。部屋は作ってから12時間で使えなくなります。'),
      ('みんなの回答％', 'Firebase Cloud Firestore（Google LLC）',
       'それぞれの問題で、どちらの答えが選ばれたかの数（名前・答えた人がだれかは送りません）',
       '「みんなの○%」を出すため'),
      ('遊んだ回数と、％の分布', 'Firebase Cloud Firestore（Google LLC）',
       '遊んだ回数、小悪魔度などの％を5%きざみにした数、前の結果を開いた回数（どれも名前なしの数だけ）',
       '「○人中、あなたより…」を出すためと、問題をよくするため'),
    ],
    extra=[('答え合わせのリンク', '「だれかと答え合わせ」で送るリンクの中には、あなたの名前と答えが入ります。リンクを受け取った人と、その人がさらに送った人が見られます。この診断のサーバーには保存しません。')],
    parts=[('QRコード', 'qrcodejs（MIT ライセンス）', 'https://github.com/davidshimjs/qrcodejs'),
           ('結果を画像にする', 'html2canvas（MIT ライセンス）', 'https://github.com/niklasvh/html2canvas')],
    cdn='QRコードと画像を作る部品（cdnjs＝Cloudflare, Inc.）',
    links='1.66 奇跡の相性診断・恋のかたち診断・アイシンク',
    about='この診断は、心理学の考え方を参考にした遊びです。医療や心理の専門的な検査ではありません。結果は、自分や友だちを知るヒントとしてお使いください。',
  ),
  'isync': dict(
    name='アイシンク（I-Sync）', short='アイシンク', url='https://i-sync.jp/',
    bg='#FBEFEA', card='#FFFFFF', ink='#2A2559', sub='#4E4880', accent='#6E5FA8', line='#BFB6E2', soft='#F1EEFA',
    prefix='kv_',
    local='ニックネーム、選んだ設定（長さ・話題など）、これまでに出た問題の記録、答えた問題の印、結果（「わたしの結果」の10回ぶん）と平均、送った答え合わせの記録（20件まで）、「話した」の印、参加中の部屋の番号',
    reset='このページのいちばん下のボタンで消せます。',
    sends=[
      ('みんなの部屋', 'Firebase Cloud Firestore（Google LLC）',
       '部屋番号、ニックネーム、それぞれの問題の答えと「★ ここはゆずれない」の印、答えるまでの秒数、部屋に入った時刻、通信のためのIPアドレス',
       '同じ部屋の人と答え合わせをするため。「名前を見せる」の部屋では、部屋の人にニックネームと答えが見えます。部屋番号で入れるのは作ってから12時間まで、送ったリンクで入れるのは10日までです。部屋とニックネーム・答えは、作ってから10日で消します。'),
      ('答え合わせが届く', 'Firebase Cloud Firestore（Google LLC）',
       '答え合わせのリンクから答えた人のニックネームと答え、答えた時刻',
       'リンクを送った人のスマホに結果を届けるため。リンクを送った人にだけ見えます。10日をすぎたものは読めなくなり、消します。'),
      ('みんなの答え', 'Firebase Cloud Firestore（Google LLC）',
       'それぞれの問題で、どの答えが選ばれたかの数（名前・答えた人がだれかは送りません）',
       '「みんなの○%」を出すため'),
      ('診断した回数', 'Firebase Cloud Firestore（Google LLC）',
       'ひとりで・部屋・答え合わせごとの診断した回数（名前なしの数だけ）',
       'サイトをよくするため'),
    ],
    extra=[('答え合わせのリンク', '「答え合わせに誘う」で送るリンクの中には、あなたのニックネームと答えが入ります。リンクを受け取った人と、その人がさらに送った人が見られます。')],
    parts=[('QRコード', 'qrcodejs（MIT ライセンス）', 'https://github.com/davidshimjs/qrcodejs')],
    cdn='QRコードを作る部品（cdnjs＝Cloudflare, Inc.）',
    links='1.66 奇跡の相性診断・恋のかたち診断・究極の二択',
    about='この診断は、価値観の重なりを楽しく知るためのものです。医療や心理の専門的な検査ではありません。結果は、おたがいを知るヒントとしてお使いください。',
  ),
}

def build(key, s):
    sec = []
    sec.append(('1. 集める情報',
      '<p>' + esc(s['name']) + '（以下「このサイト」）は、本名・メールアドレス・電話番号・住所・生年月日などを集めません。会員登録もありません。ニックネームは本名でなくてかまいません。</p>'))
    sec.append(('2. 端末の中に保存するもの',
      '<p>続きから診断したり、前の結果を見たりできるように、ブラウザの保存場所（ローカルストレージ）に次のものを保存します。この保存は、あなたの端末の中だけです。</p><p class="box">' + esc(s['local']) + '</p><p>このサイト自身はクッキーを使いませんが、アクセス解析（下の4.の Google アナリティクス）がクッキーを使います。' + esc(s['reset']) + '</p>'))
    h = '<p>次の場合に、情報がこのサイトのサーバー（Google LLC の Firebase）に送られます。</p>'
    for t, to, what, why in s['sends']:
        h += '<div class="it"><b>' + esc(t) + '</b>' + table([('送り先', esc(to)), ('送る情報', esc(what)), ('目的', esc(why))]) + '</div>'
    sec.append(('3. サーバーに送る情報', h))
    h = '<p>画面を表示するときなどに、次の情報が外部の会社に送られます。</p>'
    h += '<div class="it"><b>文字の形（Google Fonts）</b>' + table([('送り先', 'Google LLC'), ('送られる情報', 'IPアドレス、ブラウザの種類、表示したページのアドレスなど'), ('目的', '画面の文字をきれいに表示するため')]) + '</div>'
    h += '<div class="it"><b>' + esc(s['cdn']) + '</b>' + table([('送り先', 'Cloudflare, Inc.'), ('送られる情報', 'IPアドレス、ブラウザの種類など'), ('目的', '部品を読みこむため')]) + '</div>'
    h += '<div class="it"><b>サイトを置いているサーバー</b>' + table([('送り先', 'Google LLC（Firebase Hosting）'), ('送られる情報', 'IPアドレス、ブラウザの種類、見た日時など（アクセスの記録）'), ('目的', 'ページを届けるため')]) + '</div>'
    h += '<div class="it"><b>アクセス解析（Google アナリティクス）</b>' + table([('送り先', 'Google LLC'), ('送られる情報', '見たページのアドレス（名前や答えが入る部分は消してから送ります）、どのサイトから来たか、診断が終わったこと（モードの種類だけ）、ブラウザの種類、おおよその地域など。クッキーを使います。'), ('目的', '何人が見て、何回診断されたかを数え、サイトをよくするため')]) + '<p class="mini">止めたいときは、ブラウザでクッキーをブロックするか、Google の「アナリティクス オプトアウト アドオン」（tools.google.com/dlpage/gaoptout）を使ってください。</p></div>'
    h += '<div class="it"><b>LINE・共有のボタン</b><p>押したときだけ、LINE（LINEヤフー株式会社）などのアプリが開き、送る文とリンクがその会社に渡ります。</p></div>'
    h += '<p class="mini">Google のプライバシーポリシー：<a href="https://policies.google.com/privacy?hl=ja" target="_blank" rel="noopener">policies.google.com/privacy</a></p>'
    sec.append(('4. 外部に送られる情報（外部送信）', h))
    for t, body in s['extra']:
        sec.append(('5. ' + t, '<p>' + esc(body) + '</p>'))
    sec.append(('6. 13歳未満の方へ', '<p>ニックネームに本名や学校の名前を入れないでください。わからないことは、おうちの人といっしょに読んでください。</p>'))
    sec.append(('7. ほかのサイトへのリンク', '<p>このサイトには、' + esc(s['links']) + 'など、ほかのサイトへのリンクがあります。リンク先での情報の扱いは、それぞれのサイトの決まりによります。</p>'))
    sec.append(('8. 診断について', '<p>' + esc(s['about']) + '</p>'))
    sec.append(('9. このポリシーの変更', '<p>この内容は、必要に応じて変えることがあります。変えたときは、このページでお知らせします。</p>'))
    sec.append(('10. お問い合わせ', '<p>このポリシーやこのサイトについてのお問い合わせは、次のメールアドレスへお送りください。</p><p class="box mail">' + MAIL + '</p>'))
    h = '<p>このサイトは、次の無料で使える部品を使っています（それぞれのライセンスにしたがって使っています）。</p><ul>'
    for t, n, u in s['parts']:
        h += '<li>' + esc(t) + '：<a href="' + u + '" target="_blank" rel="noopener">' + esc(n) + '</a></li>'
    sec.append(('11. 使っている部品', h + '</ul>'))
    # 見出しの（…）は途中で改行しない（幅320で「外部／送信）」と割れていた）
    body = ''.join('<section><h2>' + re.sub(r'（[^）]*）', lambda m: '<span class="nw">' + m.group(0) + '</span>', esc(t)) + '</h2>' + b + '</section>' for t, b in sec)
    css = f""":root{{--bg:{s['bg']};--card:{s['card']};--ink:{s['ink']};--sub:{s['sub']};--ac:{s['accent']};--line:{s['line']};--soft:{s['soft']}}}
*{{box-sizing:border-box}}
html{{-webkit-text-size-adjust:100%;touch-action:manipulation}}
body{{margin:0;background:var(--bg);color:var(--ink);font:500 15.5px/1.85 system-ui,-apple-system,'Hiragino Sans','Noto Sans JP','Yu Gothic',sans-serif;word-break:auto-phrase;line-break:strict;overflow-wrap:break-word;padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 40px max(16px,env(safe-area-inset-left))}}
main{{max-width:680px;margin:0 auto}}
.bar{{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:8px;padding:8px 0;background:var(--bg)}}
.bar a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:99px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font-weight:700;text-decoration:none}}
h1{{font-size:24px;line-height:1.4;margin:10px 0 4px}}
.date{{color:var(--sub);font-size:13.5px;margin:0 0 14px}}
section{{background:var(--card);border:1.5px solid var(--line);border-radius:16px;padding:14px 16px;margin:12px 0}}
h2{{font-size:17px;margin:0 0 6px;color:var(--ac)}}
.nw{{white-space:nowrap;display:inline-block}}
p{{margin:6px 0}}
.box{{background:var(--soft);border-radius:10px;padding:10px 12px}}
.mail{{font-weight:700;user-select:all}}
.it{{border-top:1px dashed var(--line);padding-top:8px;margin-top:10px}}
.it>b{{display:block;font-size:15.5px}}
.xt{{margin:4px 0 0;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:14.5px}}
.xt dt{{color:var(--sub);font-weight:700;white-space:nowrap}}
.xt dd{{margin:0;min-width:0}}
.mini{{font-size:13.5px;color:var(--sub)}}
a{{color:var(--ac)}}
ul{{margin:6px 0;padding-left:1.3em}}
.wipe{{display:block;width:100%;min-height:48px;margin:18px 0 6px;border-radius:14px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font:700 15px/1.4 inherit;cursor:pointer}}
.wipe.on{{background:var(--soft);border-color:var(--ac);color:var(--ac)}}
#wipe-note{{text-align:center;font-size:14px;color:var(--sub);min-height:1.6em}}
@media (max-width:360px){{.xt{{grid-template-columns:1fr}}}}
"""
    js = f"""(function(){{var b=document.getElementById('wipe'),n=document.getElementById('wipe-note'),armed=0;
b.onclick=function(){{if(!armed){{armed=1;b.classList.add('on');b.textContent='もう一度押すと消します';n.textContent='この端末の答え・結果・名前が全部消えます。';setTimeout(function(){{if(armed){{armed=0;b.classList.remove('on');b.textContent='この端末の答えと結果を消す';n.textContent='';}}}},6000);return;}}
try{{var ks=[];for(var i=0;i<localStorage.length;i++){{var k=localStorage.key(i);if(k&&k.indexOf('{s['prefix']}')===0)ks.push(k);}}ks.forEach(function(k){{localStorage.removeItem(k);}});}}catch(e){{}}
try{{for(var j=sessionStorage.length-1;j>=0;j--){{var k2=sessionStorage.key(j);if(k2&&k2.indexOf('{s['prefix']}')===0)sessionStorage.removeItem(k2);}}}}catch(e){{}}
armed=0;b.classList.remove('on');b.textContent='この端末の答えと結果を消す';n.textContent='消しました。';}};}})();"""
    return f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>プライバシーポリシー｜{esc(s['short'])}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="{s['url']}privacy.html">
<style>{css}</style></head>
<body><main>
<div class="bar"><a href="/">‹ トップへ</a></div>
<h1>プライバシーポリシー</h1>
<p class="date">{esc(s['name'])}　制定日：{SEIT}／改定日：{REV}</p>
{body}
<button class="wipe" id="wipe" type="button">この端末の答えと結果を消す</button>
<p id="wipe-note" role="status"></p>
</main><script>{js}</script></body></html>
"""

for k, s in SITES.items():
    open(k + '/privacy.html', 'w', encoding='utf-8').write(build(k, s))
    print('wrote', k + '/privacy.html')
