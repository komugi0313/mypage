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
BEGINNER_UI = r"""<style id="beginner-ui-css">
/* ===== ビギナー専用の見せ方（初心者モード）。tools/sync_beginner_from_pro.py が付与 ===== */
.beginner-pro-collapse{margin-top:18px;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 8px 22px rgba(226,161,43,.22);border:2px solid #E2A12B}
.beginner-pro-collapse>summary{list-style:none;cursor:pointer;padding:15px 18px;background:linear-gradient(135deg,#E2A12B 0%,#E8792B 55%,#E8392B 100%);color:#fff}
.beginner-pro-collapse>summary::-webkit-details-marker{display:none}
.beginner-pro-collapse>summary .bar-main{display:block;font-size:16px;font-weight:900;text-shadow:0 1px 2px rgba(0,0,0,.15)}
.beginner-pro-collapse>summary .bar-arrow{float:right;font-size:12.5px;font-weight:800;opacity:.95}
.beginner-pro-collapse[open]>summary .bar-arrow::after{content:' ▲ 閉じる'}
.beginner-pro-collapse:not([open])>summary .bar-arrow::after{content:' ▼ タップで開く'}
.beginner-pro-collapse>summary .bar-sub{display:block;margin-top:7px;font-size:12px;font-weight:700;color:#FFF6E9;line-height:1.7}
.beginner-pro-collapse>section{margin:10px}
#bg-mode{position:fixed;left:14px;bottom:16px;z-index:9000;padding:9px 14px;border:0;border-radius:999px;background:#3A3226;color:#fff;font-family:inherit;font-weight:800;font-size:12.5px;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}
@media print{#bg-mode{display:none}}
</style>
<script id="beginner-ui">
/* ===== ビギナー専用の見せ方（初心者モード）。tools/sync_beginner_from_pro.py が付与 =====
   初心者モード（既定ON）のときだけ、結果の表示を後から整える：
   ① 五行を、やさしい棒グラフと一言説明で表示（数はPROと同じ命式の五行）
   ② 専門的な表（命式の四つの柱・10の通変星と五行）を「くわしく見る（上級者向け）」に折りたたむ
   ③ 左下に「上級者モード／初心者モード」の切替ボタン
   表示の後処理だけで、計算・判定・鑑定文はPROと同じ。初心者モードOFFでPROと同じ画面になる。 */
(function(){
  "use strict";
  var KEY='bazi_beginner_mode';
  function on(){ try{ return localStorage.getItem(KEY)!=='0'; }catch(e){ return true; } }
  function safe(fn){ try{ return fn(); }catch(e){} }
  var MEAN={
    木:{n:'木（成長・やさしさ）',w:'のびのび伸びる力。やる気・思いやり・人とのご縁。'},
    火:{n:'火（情熱・人気）',w:'明るさと情熱。表現・人前に出る力・行動力。'},
    土:{n:'土（安定・信頼）',w:'どっしり安定。まじめさ・信頼・面倒見のよさ。'},
    金:{n:'金（決断・けじめ）',w:'きっぱり決める力。ルール・技術・けじめ。'},
    水:{n:'水（知恵・ご縁）',w:'やわらかい知恵。考える力・柔軟さ・人脈。'}
  };
  var ORD=['木','火','土','金','水'];
  function col(e){ return (typeof ec==='function')?ec(e):'#666'; }
  function easyGogyo(c){
    var fe=c.fiveElements||{}, dayEl=c.dayMaster&&c.dayMaster.element;
    var max=Math.max.apply(null,ORD.map(function(e){return fe[e]||0;}).concat([1]));
    var sorted=ORD.slice().sort(function(a,b){return (fe[b]||0)-(fe[a]||0);});
    var strong=sorted[0], weak=sorted[sorted.length-1];
    var short=function(e){return MEAN[e].n.split('（')[0];};
    var bars=ORD.map(function(e){var n=fe[e]||0,pct=Math.round(n/max*100),k=col(e),isDay=e===dayEl;
      return '<div style="margin:7px 0"><div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-weight:900;font-size:12.5px;color:'+k+'">'+MEAN[e].n+(isDay?' <span style="font-size:10px;background:'+k+';color:#fff;border-radius:4px;padding:0 5px;vertical-align:1px">あなたの中心</span>':'')+'</span><span style="font-weight:900;font-size:12px;color:var(--muted)">'+n+'</span></div><div style="height:9px;background:#EFEADD;border-radius:6px;overflow:hidden;margin-top:3px"><div style="height:100%;width:'+pct+'%;background:'+k+';border-radius:6px"></div></div><div style="font-size:11.5px;color:var(--ink2);margin-top:3px">'+MEAN[e].w+'</div></div>';}).join('');
    var wn=(fe[weak]||0)===0?'いっぽう<b style="color:'+col(weak)+'">'+short(weak)+'</b>は持っていません。'+MEAN[weak].w.split('。')[0]+'を意識すると、バランスが整います。'
                            :'いちばん少ないのは<b style="color:'+col(weak)+'">'+short(weak)+'</b>。'+MEAN[weak].w.split('。')[0]+'を少し意識すると◎。';
    var summary='あなたは<b style="color:'+col(strong)+'">'+short(strong)+'の力</b>が強めで、'+MEAN[strong].w.split('。')[0]+'が持ち味です。'+wn;
    return '<section class="card" id="bg-gogyo" style="border:1.5px solid var(--line2)">'+
      '<div style="font-weight:900;font-size:15px;margin-bottom:2px">🌿 あなたの五行（木・火・土・金・水）バランス</div>'+
      '<div style="font-size:11.5px;color:var(--muted);font-weight:700;margin-bottom:7px">四柱推命は、5つの自然の力「五行」であなたを読みます。どれが強い・弱いかが、性格や運のクセになります。</div>'+
      bars+'<div style="margin-top:9px;font-size:12.5px;line-height:1.75;background:#FBF6EA;border-radius:10px;padding:9px 11px">'+summary+'</div></section>';
  }
  var TECH=['meishi-sec','gogyo-sec'];
  function apply(){
    if(!on()) return;
    safe(function(){
      var c=(typeof chart!=='undefined')?chart:null; if(!c) return;
      var res=document.getElementById('result'), body=document.getElementById('result-body'); if(!res) return;
      if(!document.getElementById('bg-gogyo')){
        var w=document.createElement('div'); w.innerHTML=easyGogyo(c); var sec=w.firstElementChild;
        var hero=res.querySelector('section.hero');
        if(hero&&hero.nextSibling) res.insertBefore(sec,hero.nextSibling); else res.insertBefore(sec,res.firstChild);
      }
      var secs=TECH.map(function(id){return document.getElementById(id);}).filter(Boolean);
      if(secs.length && !document.querySelector('.beginner-pro-collapse')){
        var det=document.createElement('details'); det.className='beginner-pro-collapse';
        det.innerHTML='<summary><span class="bar-main">🔍 くわしい命式表・通変星を見る（上級者向け）<span class="bar-arrow"></span></span>'+
          '<span class="bar-sub">命式の四つの柱の表や、10の通変星の配置など、専門的な内容です。鑑定の結果は、上の文章と表示で読めます。</span></summary>';
        secs.forEach(function(s){ det.appendChild(s); });
        (body||res).appendChild(det);
      }
    });
  }
  // 折りたたみの中へ移動する操作（上部の項目ナビ・「この命式の特徴」のタップ）は、先に開いてから移動する
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest&&e.target.closest('button[data-t],.feat-link'); if(!t) return;
    if(t.hasAttribute('data-t')){ var el=document.getElementById(t.getAttribute('data-t')); var d=el&&el.closest('.beginner-pro-collapse'); if(d) d.open=true; }
    else { document.querySelectorAll('.beginner-pro-collapse').forEach(function(d){ d.open=true; }); }
  },true);
  addEventListener('beforeprint',function(){ document.querySelectorAll('.beginner-pro-collapse').forEach(function(d){ d.dataset.was=d.open?'1':''; d.open=true; }); });
  addEventListener('afterprint',function(){ document.querySelectorAll('.beginner-pro-collapse').forEach(function(d){ d.open=d.dataset.was==='1'; }); });
  if(typeof window.renderResult==='function' && !window.renderResult._bgui){
    var orig=window.renderResult;
    window.renderResult=function(){ var r=orig.apply(this,arguments); apply(); return r; };
    window.renderResult._bgui=1;
  }
  function label(){ var b=document.getElementById('bg-mode'); if(b) b.textContent=on()?'⚙ 上級者モードに切替':'🔰 初心者モードに切替'; }
  function setMode(v){
    try{ localStorage.setItem(KEY,v?'1':'0'); }catch(e){}
    label();
    safe(function(){ if(typeof chart!=='undefined' && chart) window.renderResult(); });
  }
  function init(){
    if(!document.getElementById('bg-mode')){
      var b=document.createElement('button'); b.id='bg-mode'; b.type='button';
      b.onclick=function(){ setMode(!on()); };
      document.body.appendChild(b);
    }
    label(); apply();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
</script>
"""


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
