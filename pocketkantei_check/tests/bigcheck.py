import json,re,sys,collections
f=sys.argv[1] if len(sys.argv)>1 else 'big_all.json'
KANA=re.compile('[぀-ヺー-ヿ]');HANG=re.compile('[가-힯]');CJK=re.compile('[一-鿿]');THAI=re.compile('[฀-๿]')
SPACELESS={'ja','zh','zt','th'}
def sents(t,L):
    return [x.strip() for x in re.split(r'(?<=[。！？!?\.])\s*|\n+',t) if len(x.strip())>=(12 if L in SPACELESS or L=='ko' else 25)]
def norm(x): return re.sub(r'[\W_]+','',x.lower())
def grams(t,L):
    if L in SPACELESS: z=norm(t); return {z[i:i+12] for i in range(len(z)-11)}
    w=re.findall(r'\w+',t.lower()); return {' '.join(w[i:i+6]) for i in range(len(w)-5)}
def tri(x): z=norm(x); return {z[i:i+3] for i in range(len(z)-2)}
tot=collections.Counter()
for r in json.load(open(f,encoding='utf8')):
    L=r['L']; msgs=r['msgs']
    turns=[]; cur=None
    for m in msgs:
        if m['role']=='me': cur={'q':m['text'],'a':[]}; turns.append(cur)
        elif cur: cur['a'].append(m['text'])
    txt='\n'.join(m['text'] for m in msgs if m['role']=='ai')
    iss=[]
    if L!='ja' and KANA.search(txt.replace('・','')): iss.append('かな混入 '+''.join(sorted(set(KANA.findall(txt))))[:20])
    if L!='ko' and HANG.search(txt): iss.append('ハングル混入')
    if L in('en','es','pt','id','vi','th','ko') and CJK.search(txt): iss.append('漢字混入 '+','.join(sorted(set(re.findall('[一-鿿]+',txt))))[:60])
    if L=='th' and not THAI.search(txt): iss.append('タイ文字なし')
    fails=[t for t in txt.split('\n') if re.search(r"didn.t come through|うまく届かなかった|没有送达|沒有送達|전달되지|không đến|no llegó|não chegou|tidak sampai|ส่งไม่ถึง",t)]
    if fails: iss.append(f'通信エラー返事{len(fails)}')
    empty=[t['q'] for t in turns if not ''.join(t['a']).strip()]
    if empty: iss.append('返事なし: '+' / '.join(empty))
    # 文の丸ごと繰り返し（前の返事と同じ・ほぼ同じ文）
    seen=[]; rep=[]
    for i,t in enumerate(turns):
        cur=[]
        for s in sents('\n'.join(t['a']),L):
            n=norm(s); tr=tri(s)
            for (j,ps,pn,ptr) in seen:
                if j==i: continue
                if n==pn or (len(tr)>8 and len(tr&ptr)/max(1,len(tr|ptr))>=0.72): rep.append((i+1,j+1,s[:90])); break
            cur.append((i,s,n,tr))
        seen+=cur
    # 3回以上の返事に出る決まり文句
    gc=collections.Counter()
    for t in turns: gc.update(grams('\n'.join(t['a']),L))
    catch=[g for g,c in gc.items() if c>=3]
    # 同じ書き出し
    heads=collections.Counter(norm(''.join(t['a']))[:10] for t in turns if t['a'])
    sameh=[h for h,c in heads.items() if c>=2 and h]
    print(f"== {L}  質問{len(turns)}  AI吹き出し{sum(len(t['a']) for t in turns)}  画面エラー{len(r['errs'])}")
    print('   問題:', iss if iss else 'なし')
    print(f'   前と同じ/ほぼ同じ文: {len(rep)}件'); [print('     ',x) for x in rep[:8]]
    print(f'   3回以上出る言い回し: {len(catch)}件', catch[:6])
    if sameh: print('   同じ書き出し:', sameh)
    tot['rep']+=len(rep); tot['catch']+=len(catch); tot['iss']+=len(iss)
print('合計',dict(tot))
