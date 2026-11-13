import html,sys
sys.path.insert(0,'.')
import final
FM={(y,m):d for y,m,d in final.MONTHS}
NOV,DEC=FM[(2026,11)],FM[(2026,12)]
JAN,FEB,MAR,APR,MAY,JUN,JUL,AUG,SEP,OCT=[FM[(2027,i)] for i in range(1,11)]
import jpholiday,datetime as dt
W='月火水木金土日'
e=html.escape
def day(y,d,ev,qs):
    m,dd=map(int,d.split('/'));x=dt.date(y,m,dd);wd=W[x.weekday()];hol=jpholiday.is_holiday_name(x)
    if hol and '振替' in hol:hol='振替休日'
    cls='hol' if hol or wd=='日' else ('sat' if wd=='土' else '')
    tags=(f'<span class="hd-hol">{e(hol)}</span>' if hol else '')+(f'<span class="ev">{e(ev)}</span>' if ev and ev!=hol else '')
    out=f'<li class="day {cls}"><div class="dh"><span class="d">{m}月{dd}日</span><span class="wd">{wd}</span>{tags}</div>'
    for i,(q,ops) in enumerate(qs):
        mk=q[:len(q)-len(q.lstrip('*!#♡'))];age='*' in mk;ser='!' in mk;ins='#' in mk;lov='♡' in mk;q=q.lstrip('*!#♡')
        cl=" ser" if ser else (" ins" if ins else (" lov" if lov else ""));chip="<b class=sv>そなえ・安心</b>" if ser else ("<b class=sv>くらしの声</b>" if ins else ("<b class=sv>ふれあい</b>" if lov else ""))
        out+=f'<div class="q{cl}"><span class="no">{i+1}問目{chip}</span><p class="qt">{e(q)}</p><div class="ops">'+''.join(f'<span>{e(o)}</span>' for o in ops.split('/'))+'</div>'+('<small class="age">年代でくらべる1行も付ける</small>' if age else '')+'</div>'
    return out+'</li>'
def month(id,y,mo,data):
    nh=sum(1 for x in data if jpholiday.is_holiday_name(dt.date(y,mo,int(x[0].split('/')[1]))))
    return f'<section class="month" id="{id}"><h2>{y}年{mo}月<small>{len(data)*2}問・祝日{nh}日</small></h2><ol>'+''.join(day(y,*x) for x in data)+'</ol></section>'
def res(title,n,rows,me,age=None):
    r=''.join(f'<li class="{"me" if i==me else ""}"><span class="rk">{i+1}</span><span class="lb">{e(l)}{"<em>こむぎ</em>" if i==me else ""}</span><b>{p}<small>%</small></b></li>' for i,(l,p) in enumerate(rows))
    return f'<div class="res"><p class="rt">{e(title)}<small>{n}匹が答えました</small></p><ol class="rank">{r}</ol>'+(f'<p class="agel">{e(age)}</p>' if age else '')+'</div>'
mail=('<section class="mail" aria-label="メールの見本"><div class="hd"><span>11月2日（月）朝6:00</span><span>44Wansonalities</span></div><h3>こむぎの朝</h3>'
 '<p class="sec">📊 昨日のみんなの答え</p>'
 +res('うちの子の記念日、お祝いしてる？','3,284',[('誕生日もお迎え日も',38),('どちらか1つ',31),('毎日がお祝い',19),('特にしていない',12)],1,'7歳からの子のおうちでは「毎日がお祝い」が27%。年を重ねるほど増えていました。')
 +res('きょうは犬の日。何かする？','3,251',[('写真をたくさん撮る',41),('特別なおやつ',29),('いま知った',18),('いつもどおり',12)],0)
 +'<p class="sec">🎤 今日の2問</p><div class="today"><p class="qt">朝のおさんぽは何時？</p><div class="ops"><span>5時台</span><span>6時台</span><span>7時台</span><span>8時より後</span><span>朝は行かない・行きたがらない</span></div>'
 '<p class="qt">夕方のおさんぽは何時？</p><div class="ops"><span>4時より前</span><span>4時台</span><span>5時台</span><span>6時より後</span><span>夕方は行かない</span></div></div>'
 '<p class="foot">💛 こむぎと出会って1,248日目</p></section>')
css=open('../../../../../../home/user/mypage/dog-shindan/survey-nov.html',encoding='utf-8').read() if False else None
page=f'''<title>ワンアンケート1年分</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=M+PLUS+Rounded+1c:wght@500;800&display=swap">
<style>
/* 上に1通の見本（順位と大きな％だけ）、下に月ごとの日付カード（1日2問） */
:root{{--bg:#F3F8F9;--paper:#FFFFFF;--ink:#2F3A45;--mute:#5E6B76;--teal:#357385;--sky:#E4F1F4;--line:#D9E6EA;--yellow:#F2C21B;--cream:#FFF8D6;--ev:#9A4A0C;--evbg:#FDE8DA;--hol:#C0392B;--holbg:#FCE4E1;--sat:#2563A8;--satbg:#E1ECF8;--holtx:#FFFFFF;--ser:#1E6B47;--serbg:#E4F4EA;--ins:#3B4FA0;--insbg:#E8ECFA;--lov:#A3305A;--lovbg:#FCE8EF;
--f-disp:"Mochiy Pop One","M PLUS Rounded 1c",sans-serif;--f-body:"M PLUS Rounded 1c","Hiragino Maru Gothic ProN",sans-serif}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--bg:#15202A;--paper:#1E2B36;--ink:#EEF3F5;--mute:#B4C1CA;--teal:#8CCFDF;--sky:#223441;--line:#33475A;--cream:#3A3420;--ev:#F7B48A;--evbg:#40291C;--hol:#FF9A8F;--holbg:#43221F;--sat:#8FC0F5;--satbg:#1D3048;--holtx:#2A0F0C;--ser:#8FDDB2;--serbg:#1C3528;--ins:#AFC0FF;--insbg:#232C4A;--lov:#F5A3C0;--lovbg:#42222F;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#15202A;--paper:#1E2B36;--ink:#EEF3F5;--mute:#B4C1CA;--teal:#8CCFDF;--sky:#223441;--line:#33475A;--cream:#3A3420;--ev:#F7B48A;--evbg:#40291C;--hol:#FF9A8F;--holbg:#43221F;--sat:#8FC0F5;--satbg:#1D3048;--holtx:#2A0F0C;--ser:#8FDDB2;--serbg:#1C3528;--ins:#AFC0FF;--insbg:#232C4A;--lov:#F5A3C0;--lovbg:#42222F;color-scheme:dark}}
body{{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-weight:500;line-height:1.7}}
.wrap{{max-width:640px;margin:0 auto;padding-block:20px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:20px}}
h1,h2,h3{{font-family:var(--f-disp);font-weight:400;margin:0;text-wrap:balance}}
h1{{font-size:1.6rem}} h2{{font-size:1.15rem;color:var(--teal)}} h3{{font-size:1.25rem}}
.lead{{margin:0;color:var(--mute);font-weight:800;font-size:.9rem}}
nav{{display:flex;gap:8px;flex-wrap:wrap}}
nav a{{min-height:44px;display:inline-flex;align-items:center;padding:0 18px;border-radius:999px;background:var(--paper);border:2px solid var(--line);color:var(--teal);font-weight:800;text-decoration:none}}
.mail{{background:var(--paper);border-radius:22px;box-shadow:0 2px 0 var(--line);padding:20px;display:flex;flex-direction:column;gap:12px}}
.mail .hd{{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-weight:800;color:var(--mute);font-size:.8rem}}
.sec{{margin:6px 0 0;font-weight:800;color:var(--teal)}}
.res{{background:var(--sky);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:8px}}
.rt{{margin:0;font-weight:800;font-size:1rem;display:flex;flex-direction:column}}
.rt small{{color:var(--mute);font-size:.78rem}}
.rank{{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}}
.rank li{{display:grid;grid-template-columns:2em minmax(0,1fr) auto;align-items:center;gap:8px;background:var(--paper);border-radius:12px;padding:8px 12px}}
.rank li.me{{background:var(--cream);box-shadow:0 0 0 2px var(--yellow)}}
.rk{{font-family:var(--f-disp);color:var(--mute);text-align:center}}
.rank li:first-child .rk{{color:var(--teal)}}
.lb{{font-weight:800;font-size:.95rem;display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}}
.lb em{{font-style:normal;font-size:.72rem;background:var(--yellow);color:#2F3A45;border-radius:999px;padding:1px 8px}}
.rank b{{font-family:var(--f-disp);font-weight:400;font-size:1.5rem;color:var(--teal);font-variant-numeric:tabular-nums}}
.rank b small{{font-size:.8rem;margin-left:2px}}
.agel{{margin:0;background:var(--cream);border-radius:12px;padding:8px 12px;font-weight:800;font-size:.88rem}}
.today{{border:2px dashed var(--line);border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}}
.foot{{margin:0;font-weight:800}}
.month{{display:flex;flex-direction:column;gap:12px;scroll-margin-top:12px}}
.month>ol{{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}}
.day{{background:var(--paper);border-radius:18px;box-shadow:0 2px 0 var(--line);padding:14px;display:flex;flex-direction:column;gap:12px;min-width:0}}
.dh{{display:flex;gap:8px;align-items:center}}
.d{{font-family:var(--f-disp);color:var(--teal);font-size:1.1rem;font-variant-numeric:tabular-nums}}
h2 small{{font-family:var(--f-body);font-weight:800;font-size:.8rem;color:var(--mute);margin-left:10px}}
.wd{{font-weight:800;font-size:.8rem;min-width:1.9em;height:1.9em;display:inline-grid;place-items:center;border-radius:50%;background:var(--sky);color:var(--mute)}}
.day.sat .wd{{background:var(--satbg);color:var(--sat)}}
.day.hol .wd{{background:var(--holbg);color:var(--hol)}}
.day.sat .d{{color:var(--sat)}} .day.hol .d{{color:var(--hol)}}
.day.hol{{box-shadow:0 0 0 2px var(--holbg),0 2px 0 var(--line)}}
.hd-hol{{font-weight:800;font-size:.74rem;border-radius:999px;padding:2px 10px;color:var(--holtx);background:var(--hol)}}
.dh{{flex-wrap:wrap}}
.key{{display:flex;gap:8px;flex-wrap:wrap;font-weight:800;font-size:.78rem}}
.key span{{border-radius:999px;padding:2px 10px}}
.k-hol{{color:var(--hol);background:var(--holbg)}} .k-sat{{color:var(--sat);background:var(--satbg)}} .k-ev{{color:var(--ev);background:var(--evbg)}}
nav a{{min-width:3.4em;justify-content:center}}
.q.ins{{background:var(--insbg);border-radius:14px;padding:10px 12px;border-top:none;--ser:var(--ins)}}
.q.lov{{background:var(--lovbg);border-radius:14px;padding:10px 12px;border-top:none;--ser:var(--lov)}}
.q.ins+.q,.q+.q.ins,.q.lov+.q,.q+.q.lov{{border-top:none}}
.k-ins{{color:var(--ins);background:var(--insbg)}} .k-lov{{color:var(--lov);background:var(--lovbg)}}
.q.ser{{background:var(--serbg);border-radius:14px;padding:10px 12px;border-top:none}}
.q.ser+.q,.q+.q.ser{{border-top:none}}
.sv{{margin-left:8px;font-size:.72rem;color:var(--ser);background:var(--paper);border:1.5px solid var(--ser);border-radius:999px;padding:1px 8px}}
.k-ser{{color:var(--ser);background:var(--serbg)}}
.ev{{font-weight:800;font-size:.74rem;border-radius:999px;padding:2px 10px;color:var(--ev);background:var(--evbg)}}
.q{{display:flex;flex-direction:column;gap:6px}}
.q+.q{{border-top:2px dotted var(--line);padding-top:10px}}
.no{{font-weight:800;font-size:.72rem;color:var(--mute)}}
.qt{{margin:0;font-weight:800;font-size:1rem;line-height:1.5}}
.ops{{display:flex;flex-wrap:wrap;gap:6px}}
.ops span{{font-size:.8rem;font-weight:800;border:1.5px solid var(--line);border-radius:999px;padding:3px 10px;background:var(--sky)}}
.age{{color:var(--teal);font-weight:800;font-size:.72rem}}
.rules{{border:2px dashed var(--line);border-radius:18px;padding:16px;font-size:.88rem}}
.rules ul{{margin:6px 0 0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px}}
</style>
<div class="wrap">
  <h1>ワンアンケート 1年分</h1>
  <p class="lead">2026年11月〜2027年10月。毎朝2問、次の朝にみんなの答えが届きます（メールの数字は例です）</p>\n  <div class="key"><span class="k-hol">日曜・祝日</span><span class="k-sat">土曜</span><span class="k-ev">季節の行事</span><span class="k-ser">そなえ・安心（毎月）</span><span class="k-ins">くらしの声（週1回）</span><span class="k-lov">ふれあい（月2回）</span></div>
  <nav><a href="#nov">11月</a><a href="#dec">12月</a><a href="#jan">1月</a><a href="#feb">2月</a><a href="#mar">3月</a><a href="#apr">4月</a><a href="#may">5月</a><a href="#jun">6月</a><a href="#jul">7月</a><a href="#aug">8月</a><a href="#sep">9月</a><a href="#oct">10月</a></nav>
  {mail}
  {month("nov",2026,11,NOV)}
  {month("dec",2026,12,DEC)}
  {month("jan",2027,1,JAN)}
  {month("feb",2027,2,FEB)}
  {month("mar",2027,3,MAR)}
  {month("apr",2027,4,APR)}
  {month("may",2027,5,MAY)}
  {month("jun",2027,6,JUN)}
  {month("jul",2027,7,JUL)}
  {month("aug",2027,8,AUG)}
  {month("sep",2027,9,SEP)}
  {month("oct",2027,10,OCT)}
  <section class="rules"><h2>作るときの決まり</h2><ul>
    <li>くらべるのは、全部のワンちゃん。年代でちがいが大きい質問だけ、「7歳からの子では…」を1行足す（カードに印）。</li>
    <li>毎月かならず1問以上、災害へのそなえや、うちの子が安心して暮らせるための真面目な質問を入れる（緑の印）。その日はふざけた選択肢を入れない。</li>\n    <li>週に1回「くらしの声」（困りごと・ほしいもの・暮らし方）。答えはサービスづくりのために集計して残す（青の印）。</li>\n    <li>月に2回「ふれあい」（名前を呼んでる？抱きしめてる？など）。責める言い方にせず、「きょうからやってみる」の選択肢を必ず入れる（ピンクの印）。</li>\n    <li>体・病気・薬の質問はしない。</li>
    <li>答えが100匹に届かないときは％を出さない。</li>
    <li>答えない日があってもよい。答えていない方にも結果は届く。</li>
  </ul></section>
</div>
'''
open('/home/user/mypage/dog-shindan/survey-nov.html','w',encoding='utf-8').write(page)
print(len(NOV),len(DEC))
