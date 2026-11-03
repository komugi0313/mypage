# data/quiz/q_part1.json, q_part2.json → index.html の QB を作りなおす
import json,os,re,random
H=os.path.dirname(os.path.abspath(__file__));IDX=os.path.join(H,'..','..','index.html')
ORDER=['social','dogs','curious','energy','clingy','calm','toys','learn','protect','bark']
qs=[]
for f in ['q_part1.json','q_part2.json']:qs+=json.load(open(os.path.join(H,f),encoding='utf-8'))
s=open(IDX,encoding='utf-8').read()
BR=json.load(open(os.path.join(H,'..','traits_v3.json')))['values']
# 質問のそばに出す犬の絵：その性格がはっきりした犬種から、順番に選ぶ
key2v={k:i for i,k in enumerate(ORDER)};imgs={}
for k in ORDER:
    top=sorted(BR,key=lambda b:-abs(BR[b][k]-50))[:12];imgs[k]=top
cnt={k:0 for k in ORDER};lines=[]
for q in qs:
    k=q['ax'];assert k in key2v and len(q['o'])==5,q
    im=imgs[k][cnt[k]%len(imgs[k])];cnt[k]+=1
    lines.append(' ['+str(key2v[k])+', '+json.dumps(q['q'],ensure_ascii=False)+', '+json.dumps(q['o'],ensure_ascii=False)+', "'+im+'"]')
i=s.index('var QB=[');j=s.index('\n];',i)+3
s=s[:i]+'var QB=[\n'+',\n'.join(lines)+'\n];'+s[j:]
open(IDX,'w',encoding='utf-8').write(s);print(len(lines),cnt)
