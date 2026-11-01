# 研究（Darwin's Ark, Morrill ほか 2022）の犬種平均を土台に、10の性格の表を作る
# 研究に頭数が足りない犬種は、AKCの評価から研究の値を推定して補う（推定であることを記録する）
import json,math,os
H=os.path.dirname(os.path.abspath(__file__))
R=json.load(open(os.path.join(H,'darwinsark','breed_factors.json')))
A=json.load(open(os.path.join(H,'akc_traits.json')))['breeds']
IDS=list(A.keys())
AK=['affectionate','children','otherDogs','strangers','playfulness','protective','adaptability','trainability','energy','barking','mental']
# 研究の因子 → このサイトの性格（向きをそろえる：大きいほど左の言葉）
RES={'social':('F1',1),'dogs':('F6',1),'curious':('F7',-1),'energy':('F2',-1),'clingy':('F8',-1),'toys':('F3',-1),'learn':('F4',-1)}
def lstsq(X,y):
    # 正規方程式（小さいので手で解く）＋少しのリッジ
    n=len(X[0]);XtX=[[sum(r[i]*r[j] for r in X)+(0.5 if i==j and i>0 else 0) for j in range(n)] for i in range(n)];Xty=[sum(r[i]*t for r,t in zip(X,y)) for i in range(n)]
    M=[row+[v] for row,v in zip(XtX,Xty)]
    for c in range(n):
        p=max(range(c,n),key=lambda r:abs(M[r][c]));M[c],M[p]=M[p],M[c]
        for r in range(n):
            if r!=c:
                f=M[r][c]/M[c][c];M[r]=[a-f*b for a,b in zip(M[r],M[c])]
    return [M[i][n]/M[i][i] for i in range(n)]
have=[i for i in IDS if i in R['breeds']];miss=[i for i in IDS if i not in R['breeds']]
raw={i:{} for i in IDS};how={i:{} for i in IDS}
for key,(f,sgn) in RES.items():
    X=[[1]+[A[i]['traits'][k] for k in AK] for i in have];y=[R['breeds'][i]['factors'][f]['mean']*sgn for i in have]
    w=lstsq(X,y)
    for i in IDS:
        if i in R['breeds']:raw[i][key]=R['breeds'][i]['factors'][f]['mean']*sgn;how[i][key]='研究'
        else:raw[i][key]=sum(a*b for a,b in zip(w,[1]+[A[i]['traits'][k] for k in AK]));how[i][key]='研究にないためAKCから推定'
# 物おじしなさ：研究のアンケートの「こわがり・自信」の質問8つ（犬種ごとの「はい」の割合）から出す
# （前はAKCの「環境への適応力」を使っていたが、これは暑さ・暮らしの変化への強さで、こわがりかどうかとは別のもの）
QB=json.load(open(os.path.join(H,'darwinsark','breed_questions.json')))['breeds']
CALM_Q={'102':1,'81':1,'86':-1,'90':-1,'104':-1,'84':-1,'83':-1,'88':-1}  # 自信がある・新しい場所にすぐなじむ／音に敏感・雷がこわい・不安がり・新しい場面が苦手・お手入れでこわがる・病院でこわがる
cst={}
for k in CALM_Q:
    xs=[QB[b][k]['yes'] for b in QB if k in QB[b] and QB[b][k]['n']>=15];m=sum(xs)/len(xs);cst[k]=(m,math.sqrt(sum((x-m)**2 for x in xs)/len(xs)))
cres={}
for b in IDS:
    ks=[k for k in CALM_Q if b in QB and k in QB[b] and QB[b][k]['n']>=15]
    if len(ks)>=4:cres[b]=sum(CALM_Q[k]*(QB[b][k]['yes']-cst[k][0])/cst[k][1] for k in ks)/len(ks)
hc=[i for i in IDS if i in cres]
wc=lstsq([[1]+[A[i]['traits'][k] for k in AK] for i in hc],[cres[i] for i in hc])
for i in IDS:
    if i in cres:raw[i]['calm']=cres[i];how[i]['calm']='研究（こわがり・自信の質問8つ）'
    else:raw[i]['calm']=sum(a*b for a,b in zip(wc,[1]+[A[i]['traits'][k] for k in AK]));how[i]['calm']='研究にないためAKCから推定'
def zs(d):
    xs=list(d.values());m=sum(xs)/len(xs);sd=math.sqrt(sum((x-m)**2 for x in xs)/len(xs)) or 1
    return {k:(v-m)/sd for k,v in d.items()}
zE=zs({i:raw[i]['energy'] for i in IDS});zS=zs({i:raw[i]['social'] for i in IDS})
zP=zs({i:A[i]['traits']['protective'] for i in IDS});zB=zs({i:A[i]['traits']['barking'] for i in IDS})
for i in IDS:
    # AKCは1〜5の5段階で同点が多いので、研究の数字で差をつける
    raw[i]['protect']=zP[i]-0.35*zS[i];how[i]['protect']='AKC（同点は研究の「人へのなつき方」で調整）'
    raw[i]['bark']=zB[i]+0.35*zE[i];how[i]['bark']='AKC（同点は研究の「興奮しやすさ」で調整）'
KEYS=['social','dogs','curious','energy','clingy','toys','learn','protect','bark','calm']
V={i:{} for i in IDS}
for k in KEYS:
    xs=[raw[i][k] for i in IDS];m=sum(xs)/len(xs);sd=math.sqrt(sum((x-m)**2 for x in xs)/len(xs)) or 1
    for i in IDS:V[i][k]=round(max(5,min(95,50+13*(raw[i][k]-m)/sd)))
json.dump({'keys':KEYS,'values':V,'how':how,'research_breeds':have,'estimated_breeds':miss},open(os.path.join(H,'traits_v3.json'),'w'),ensure_ascii=False,indent=1)
print('研究',len(have),'推定',miss)
