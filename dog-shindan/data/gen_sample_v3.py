import json,os,html
H=os.path.dirname(os.path.abspath(__file__));e=html.escape
T=json.load(open(os.path.join(H,'traits_v3.json')));R=json.load(open(os.path.join(H,'darwinsark','breed_factors.json')))
JP={}
src=open(os.path.join(H,'..','index.html'),encoding='utf-8').read()
import re
for m in re.finditer(r'\{id:"([a-z]+)",g:"([sml])",n:"([^"]+)"(?:,[^}]*?s:"([^"]+)")?',src):JP[m.group(1)]=(m.group(4) or m.group(3),m.group(2))
K=T['keys'];V=T['values'];IDS=list(V.keys())
NAME={'social':('だれとでも仲よし','家族に一途'),'dogs':('ワン友づくり上手','人が大好き'),'curious':('好奇心いっぱい','おうち大好き'),'energy':('元気いっぱい','おっとり癒やし系'),'clingy':('甘えんぼ','自立したマイペース'),'toys':('おもちゃ大好き','おもちゃより人'),'learn':('覚えるのが得意','自由な発想'),'protect':('家族を守る','だれにでもウェルカム'),'bark':('おしゃべり','もの静か'),'calm':('どっしり大物','気づき名人')}
AX={'social':'人なつっこさ','dogs':'ワン友','curious':'好奇心','energy':'元気','clingy':'甘え','toys':'おもちゃ好き','learn':'指示の通りやすさ','protect':'守る気持ち','bark':'おしゃべり','calm':'物おじしなさ'}
SRC={'social':'研究「人へのなつき方」','dogs':'研究「ほかの犬へのなつき方」','curious':'研究「まわりへの興味」','energy':'研究「興奮しやすさ」','clingy':'研究「そばにいたがるか」','toys':'研究「おもちゃ遊び」（新）','learn':'研究「指示の聞きやすさ」（新）','protect':'AKC「守る気持ち」（新）','bark':'AKC「ほえやすさ」（新）','calm':'AKC「環境への慣れやすさ」'}
G={'s':'小型犬','m':'中型犬','l':'大型犬'}
def rank(i,k,side,grp=None):
    pool=[j for j in IDS if grp is None or JP[j][1]==grp];v=V[i][k]
    return 1+sum(1 for j in pool if (V[j][k]<v if side else V[j][k]>v))
B=[]
for i in IDS:
    best=min(((rank(i,k,s),NAME[k][s]) for k in K for s in (0,1)))
    g=JP[i][1];bg=min(((rank(i,k,s,g),NAME[k][s]) for k in K for s in (0,1)))
    if best[0]==1:t=('44犬種でいちばん「%s」'%best[1],'No.1')
    elif bg[0]==1:t=('%sでいちばん「%s」'%(G[g],bg[1]),'No.1')
    elif best[0]<=3:t=('「%s」44犬種で%d位'%(best[1],best[0]),'%d位'%best[0])
    else:t=('%sで「%s」%d位'%(G[g],bg[1],bg[0]),'%d位'%bg[0])
    n=R['breeds'].get(i,{}).get('n');B.append(dict(id=i,s=JP[i][0],title=t[0],rank=t[1],n=n))
def bars(i):
    h=''
    for k in K:
        a,b=NAME[k];h+=f'<div class="br"><span>{a}</span><div class="tr"><i class="n" style="left:{V[i][k]}%"></i></div><span>{b}</span></div>'
    return h
picks=['pug','shiba','golden','chihuahua','border','kingcharles']
bd={b['id']:b for b in B}
cards=''.join(f'<div class="card"><div class="ch"><img src="img/{i}.webp" alt=""><div><b>{e(bd[i]["s"])}</b><span class="ttl">{"<img class=cr src=icon/crown.png alt=>" if bd[i]["rank"]=="No.1" else ""}{e(bd[i]["title"])}</span><small class="src">{"研究のデータ "+str(bd[i]["n"])+"頭" if bd[i]["n"] else "研究に頭数が足りないため、AKCから推定"}</small></div></div>{bars(i)}</div>' for i in picks)
rows=''.join(f'<li><img src="img/{b["id"]}.webp" alt=""><b>{e(b["s"])}</b><span class="{"gold" if b["rank"]=="No.1" else ""}">{e(b["title"])}</span><small>{str(b["n"])+"頭" if b["n"] else "推定"}</small></li>' for b in sorted(B,key=lambda b:(b['rank']!='No.1',b['rank'])))
axes=''.join(f'<li class="{"new" if "新" in SRC[k] else ""}"><b>{AX[k]}</b><span>{NAME[k][0]} ↔ {NAME[k][1]}</span><small>{SRC[k]}</small></li>' for k in K)
n1=sum(1 for b in B if b['rank']=='No.1')
CSS=open(os.path.join(H,'sample_style.css')).read()
page=f'''<title>新しい性格表 見本</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=M+PLUS+Rounded+1c:wght@500;800&display=swap">
<style>{CSS}</style>
<div class="wrap">
  <h1>新しい性格表 見本</h1>
  <p class="lead">研究の元データ（約1万8千頭の飼い主アンケート、Morrill ほか 2022年）から、犬種ごとの実際の平均を計算して作りました。</p>
  <section class="panel"><h2>10の性格</h2><ul class="axes">{axes}</ul>
  <p class="note">7つは研究の実際の数字、3つ（守る気持ち・おしゃべり・物おじしなさ）は研究にない項目なのでAKCの公式評価です。研究に頭数が足りない5犬種（ペキニーズ・グリフォン・ボルドー・日本スピッツ・キング・チャールズ）は、ほかの39犬種で「AKCの評価と研究の数字の関係」を調べ、そこから推定しました。</p></section>
  <section class="panel"><h2>犬種ごとの見え方（例）</h2><div class="cards">{cards}</div></section>
  <section class="panel"><h2>全犬種の「いちばん」</h2>
  <p class="note">44犬種の中で1位ならそれを、なければ同じ大きさ（小型・中型・大型）の中の1位を、それもなければいちばん高い順位を出します。44犬種のうち{n1}犬種が、どこかで「No.1」です。右はしの数字は、研究に入っていた頭数です。</p>
  <ul class="rank">{rows}</ul></section>
  <section class="panel"><h2>研究からわかる大事なこと</h2><p class="note">この研究では、1頭1頭の性格のちがいのうち、犬種で説明できるのは約1割でした。同じ犬種でも性格はさまざまで、犬種の平均はあくまで「傾向」です。</p></section>
</div>'''
open(os.path.join(H,'..','traits-sample.html'),'w',encoding='utf-8').write(page);print(n1,len(B))
