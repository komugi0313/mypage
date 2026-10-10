#!/usr/bin/env python3
"""易 EKI Pro の「申込・ログイン・マイページ」を、PRO（pro/pricing-pro.html・auth.html・mypage-pro.html）から作る。
申込〜決済（テレコムクレジット）〜パスワード設定〜マイページの流れは PRO・ビギナーと同じ。違いは色・名前・リンク先・説明文のみ。
使い方：python3 tools/eki_pay_from_pro.py <eki-pro フォルダ>
  → <eki-pro>/upgrade.html（お申し込み内容の確認・決済へ）／auth.html（ログイン）／mypage.html（マイページ）を書き出す。"""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
PRO = ROOT / 'pro'
if len(sys.argv) < 2: sys.exit('使い方：python3 tools/eki_pay_from_pro.py <eki-pro フォルダ>')
EKI = Path(sys.argv[1])

def rep(s, old, new, count=None):
    n = s.count(old)
    if n == 0 or (count is not None and n != count):
        sys.exit(f'[止めました] {old[:60]!r} が想定どおり見つかりません（{n}件）')
    return s.replace(old, new)

HEAD = '''<meta name="robots" content="noindex">
<meta name="theme-color" content="#C9B5D4">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon-180.png">
'''

def theme(s):
    # 色：PROの朱色・青 → EKIのラベンダー（エラーの赤はそのまま）
    for a, b in [('--ka:#E8392B', '--ka:#8E72A8'), ('--ka-d:#C0452F', '--ka-d:#6E5689'), ('--sui:#2A6FD0', '--sui:#7A5C98'),
                 ('linear-gradient(135deg,#F0533F 0%,#E8392B 60%,#C0452F 100%)', 'linear-gradient(135deg,#A58BBE 0%,#8E72A8 60%,#6E5689 100%)'),
                 ('linear-gradient(135deg,#F0533F,#E8392B 60%,#C0452F)', 'linear-gradient(135deg,#A58BBE,#8E72A8 60%,#6E5689)'),
                 ('rgba(232,57,43,', 'rgba(142,114,168,'), ('0 4px 0 #b32a20', '0 4px 0 #6E5689'), ('0 2px 0 #b32a20', '0 2px 0 #6E5689'),
                 ('rgba(232,93,158,.22)', 'rgba(142,114,168,.30)'), ('rgba(232,93,158,.16)', 'rgba(142,114,168,.26)'),
                 ('rgba(226,161,43,.18)', 'rgba(224,156,98,.22)'), ('rgba(226,161,43,.16)', 'rgba(224,156,98,.20)'),
                 ('linear-gradient(180deg,#FBF6EA 0%,#F7F1E4 100%)', 'linear-gradient(180deg,#F7F2EA 0%,#F5F1E8 100%)'),
                 ('linear-gradient(180deg,#FBF6EA,#F7F1E4)', 'linear-gradient(180deg,#F7F2EA,#F5F1E8)'),
                 ('linear-gradient(160deg,#F2A03A,#EE5B48,#E8508E)', 'linear-gradient(135deg,#C9B5D4,#8E72A8)'),
                 ('rgba(42,111,208,.15)', 'rgba(142,114,168,.18)')]:
        s = s.replace(a, b)
    s = s.replace('<img src="icon-crystal.png" alt="" style="height:1.2em;width:auto;vertical-align:-0.26em;">',
                  '<span style="color:#fff;font-family:\'Noto Serif JP\',serif;font-weight:700">易</span>')
    return s

def links(s):
    s = s.replace('四柱推命 <span>自動鑑定</span>', '易 <span>EKI Pro</span>')
    s = s.replace('© 四柱推命占い自動鑑定（72k株式会社）', '© 易 EKI Pro（72k株式会社）')
    s = s.replace('app-pro.html', 'app/index.html').replace('mypage-pro.html', 'mypage.html').replace('pricing-pro.html', 'register.html')
    s = s.replace('terms-pro.html', 'terms.html').replace('tokushoho-pro.html', 'tokushoho.html').replace('privacy-pro.html', 'privacy.html')
    return s

def head(s, title):
    i = s.index('<link rel="icon"') if '<link rel="icon"' in s[:2000] else s.index('<title>')
    j = s.index('<style>')
    return s[:i] + f'<title>{title}</title>\n' + HEAD + s[j:]

# ---- upgrade.html（お申し込み内容の確認・決済へ）----
s = (PRO / 'pricing-pro.html').read_text(encoding='utf-8')
s = head(s, 'お申し込み｜易 EKI Pro'); s = theme(links(s))
s = rep(s, '<span class="badge">経験を、もっと速く・深く。</span>', '<span class="badge">勉強いらずで、易の占い師に。</span>', 1)
s = rep(s, '<br>本格鑑定を、はじめる。</h1>', '<br>易の鑑定を、はじめる。</h1>', 1)
s = rep(s, '<span class="desc">いつでも解約できます</span>', '<span class="desc">追加料金なし・いつでも解約OK</span>', 1)
s = rep(s, '※ 本サービスは四柱推命にもとづく自己理解・エンターテインメントを目的としたものです。', '※ 本ツールは占いを目的としたものです。', 1)
s = rep(s, '<a class="tb-login" href="app/index.html">ログインはこちら</a>', '<a class="tb-login" href="auth.html">ログインはこちら</a>', 1)
s = rep(s, "var ORDER_PREFIX='P';", "var ORDER_PREFIX='E';", 1)
s = rep(s, '</body>', '''<script>
/* 登録ページ（register.html）から来たときは、入力済みのメールアドレスで「お申し込み内容の確認」をすぐ表示する */
(function(){
  var q=new URLSearchParams(location.search); if(q.get('result')) return;
  var a=null; try{ a=JSON.parse(localStorage.getItem('eki_apply')||'null'); }catch(e){}
  if(!a||!a.email||Date.now()-(a.ts||0)>3600000) return;
  document.getElementById('email').value=a.email; document.getElementById('email2').value=a.email;
  document.getElementById('agree').checked=true;
  document.getElementById('cf-back').addEventListener('click',function(e){ e.stopImmediatePropagation(); location.href='register.html'; },true);
  document.getElementById('signup').requestSubmit();
})();
</script>
</body>''', 1)
(EKI / 'upgrade.html').write_text(s, encoding='utf-8')

# ---- auth.html（ログイン）----
s = (PRO / 'auth.html').read_text(encoding='utf-8')
s = head(s, 'ログイン｜易 EKI Pro'); s = theme(links(s))
(EKI / 'auth.html').write_text(s, encoding='utf-8')

# ---- mypage.html（マイページ）----
s = (PRO / 'mypage-pro.html').read_text(encoding='utf-8')
s = head(s, 'マイページ｜易 EKI Pro'); s = theme(links(s))
s = rep(s, '<a href="index.html">本格版の紹介</a>', '<a href="index.html">サービス紹介</a>', 1)
s = rep(s, '鑑定結果やお客様の保存・メモは、ツール内の「👥 顧客カルテ」からご利用いただけます。', '鑑定したお客様の記録は、ツール内の「顧客」からご覧いただけます。', 1)
s = rep(s, '<a class="tb-link" href="register.html">料金プラン</a>', '<a class="tb-link" href="index.html#price">料金プラン</a>', 1)
(EKI / 'mypage.html').write_text(s, encoding='utf-8')
print('OK:', EKI / 'upgrade.html', EKI / 'auth.html', EKI / 'mypage.html')
