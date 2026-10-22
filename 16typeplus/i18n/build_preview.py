#!/usr/bin/env python3
# 16TYPE+ 見本の組み立て（日本語・英語・韓国語）
import json,glob,re,os,sys
S=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/src/'
C='/home/user/mypage/16typeplus/content/'
I='/home/user/mypage/16typeplus/i18n/'
IB=os.path.dirname(os.path.abspath(__file__))+'/'
def rd(p): return open(p,encoding='utf-8').read()
def js(p): return json.load(open(p,encoding='utf-8'))
def lang_data(lang):
    combos={}
    for f in sorted(glob.glob(C+'combos_*.json')): combos.update(js(f))
    d=js(S+'data.json'); quiz=js(S+'quiz.json'); hints=js(C+'hints.json'); today=js(C+'today.json')
    persona={}
    for f in sorted(glob.glob(C+'persona2/*.json')): persona.update(js(f))
    body=rd(S+'body.html'); ui={}
    if lang!='ja':
        def opt(name,cur):
            p=I+name.format(lang)
            return js(p) if os.path.exists(p) else cur
        sub=opt('data.{}.json',None)
        if sub: d.update(sub)
        quiz=opt('quiz.{}.json',quiz); hints=opt('hints.{}.json',hints); today=opt('today.{}.json',today); persona=opt('persona.{}.json',persona)
        k=opt('karai.{}.json',None)
        if k: combos={key:{'karai':v} for key,v in k.items()}
        cm=opt('combo.{}.json',{})
        for key in combos: combos[key].update(cm.get(key,{}))
        ui=opt('ui.{}.json',{})
        if os.path.exists(IB+'body.{}.html'.format(lang)): body=rd(IB+'body.{}.html'.format(lang))
    else:
        combos={k:{'karai':v['karai'],'name':v.get('name',''),'atari':v.get('atari',[])} for k,v in combos.items()}
    lvq=js('/home/user/mypage/16typeplus/love/love.json')['questions']
    lvt_p='/home/user/mypage/16typeplus/love/love_types.ja.json'
    lvt=js(lvt_p) if os.path.exists(lvt_p) else {t['t']:t for t in js('/home/user/mypage/16typeplus/love/love.json')['types']}
    if lang!='ja':
        p=I+'love.{}.json'.format(lang)
        if os.path.exists(p):
            x=js(p); lvq=x.get('questions',lvq); lvt=x.get('types',lvt)
    LVd={'questions':lvq,'types':lvt}
    KT={}
    kd='/home/user/mypage/16typeplus/content/kantei/' if lang=='ja' else I+'kantei.{}/'.format(lang)
    for f in sorted(glob.glob(kd+'*.json')): KT.update(js(f))
    CW={}
    cd='/home/user/mypage/16typeplus/content/cloud/' if lang=='ja' else I+'cloud.{}/'.format(lang)
    for f in sorted(glob.glob(cd+'*.json')): CW.update(js(f))
    return {'CW':CW,'KT':KT,'LV':LVd,'BODY':body,'D':d,'QZ':quiz,'COMBO':combos,'PS':persona,'HN':hints,'TD':today,'I18N':ui}
def preview():
    langs={l:lang_data(l) for l in ['ja','en','ko']}
    head=rd(S+'head.html')
    boot='''<div id="app"></div>
<script>
var LD=__LD__;
var PAGE_LANG=/^#(en|ko)\\b/.test(location.hash)?location.hash.slice(1,3):"ja";
var _L=LD[PAGE_LANG];var CW=_L.CW||{},KT=_L.KT||{},LV=_L.LV,D=_L.D,QZ=_L.QZ,COMBO=_L.COMBO,PS=_L.PS,HN=_L.HN,TD=_L.TD,I18N=_L.I18N;
document.getElementById("app").outerHTML=_L.BODY;document.documentElement.lang=PAGE_LANG;
document.querySelectorAll("nav.lang a").forEach(function(a,i){var l=["ja","en","ko"][i];a.href="#"+l;a.onclick=function(e){e.preventDefault();location.hash=l;location.reload();};});
</script>
<script src="bazi.js"></script>
<script>
'''.replace('__LD__',json.dumps(langs,ensure_ascii=False))
    tail=rd(S+'budoux-inline.js')+rd(S+'script.js')+'\nif(PAGE_LANG==="ja")BX.start(document.querySelector(".page"));\n</script>\n'
    open(S+'kakure-redesign.html','w',encoding='utf-8').write(head+boot+tail)
    print('preview built', {l:{k:(len(v) if hasattr(v,'__len__') else 0) for k,v in d.items() if k!='BODY'} for l,d in langs.items()})
if __name__=='__main__': preview()
