from PIL import Image, ImageFilter
import numpy as np, json, os
SP='/tmp/claude-0/-home-user-mypage/6d7c9e6b-4df5-5bde-9a97-97fb52bff77a/scratchpad/'
C='/home/user/mypage/16typeplus/characters/'
OUT=C+'web/'; os.makedirs(OUT,exist_ok=True)
FACE=dict(INTJ=280,INTP=280,ENTJ=275,ENTP=420,INFJ=300,INFP=285,ENFJ=378,ENFP=290,ISTJ=347,ISFJ=280,ESTJ=316,ESFJ=383,ISTP=378,ISFP=270,ESTP=373,ESFP=362)
m=json.load(open(SP+'chars/meta.json'))
CW,CH=800,800; F=float(os.environ.get('F','128')); PAPER=np.array([248,243,234],float)
BASE=CH-28
for t,fw in FACE.items():
    a=np.array(Image.open(C+t+('.png' if t=='INTP' else '.webp')).convert('RGB')).astype(float)
    bg=np.median(np.concatenate([a[:40].reshape(-1,3),a[:,:40].reshape(-1,3),a[:,-40:].reshape(-1,3)]),0)
    a=np.clip(a*(PAPER/bg),0,255)
    # flatten paper: blend near-paper pixels to flat
    d=np.abs(a-PAPER).sum(2)
    w=np.clip((d-14)/22,0,1)[...,None]
    a=a*w+PAPER*(1-w)
    im=Image.fromarray(a.astype('uint8'))
    ptop,bot=m[t]['ptop'],m[t]['bot']
    xs=np.where((d>70).sum(0)>25)[0]; x0,x1=xs.min(),xs.max()
    PH=640; HEAD=132
    s=PH/(bot-ptop)*dict(ENTP=0.9,ENFJ=0.93,ENFP=0.95).get(t,1)
    im=im.resize((round(2000*s),round(2000*s)),Image.LANCZOS)
    # 人物の中心（顔はほぼ x=1000）を真ん中に。はみ出す場合は、収まる範囲で横にずらす
    ox=CW/2-1000*s; L=x0*s+ox; Rr=x1*s+ox
    if Rr-L<=CW-24:
        if L<12: ox+=12-L
        elif Rr>CW-12: ox-=Rr-(CW-12)
    canvas=Image.new('RGB',(CW,CH),tuple(PAPER.astype(int)))
    canvas.paste(im,(round(ox),round(HEAD+640-bot*s)))
    canvas.save(OUT+t+'.webp',quality=82,method=6)
    canvas.resize((240,240),Image.LANCZOS).save(OUT+t+'_s.webp',quality=80,method=6)
    print(t,round(s,3),os.path.getsize(OUT+t+'.webp')//1024,'KB')
