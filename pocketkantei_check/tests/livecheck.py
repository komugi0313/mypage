import json,re,sys
f=sys.argv[1] if len(sys.argv)>1 else 'live_all.json'
KANA=re.compile('[぀-ヺー-ヿ]'); HANG=re.compile('[가-힯]'); CJK=re.compile('[一-鿿]'); THAI=re.compile('[฀-๿]')
SIMP=set('这们说时运国发对会过还个为来实现将经历让开关动业电东车长门问间头见觉学习岁转换')
TRAD=set('這們說時運國發對會過還個為來實現將經歷讓開關動業電東車長門問間頭見覺學習歲轉換')
for r in json.load(open(f,encoding='utf8')):
    L=r['L']; ai=[m['text'] for m in r['msgs'] if m['role']=='ai']; txt='\n'.join(ai)
    issues=[]
    if L!='ja' and KANA.search(txt.replace('・','')): issues.append('かな混入: '+', '.join(sorted(set(re.findall('[぀-ヺー-ヿ]+',txt.replace('・',''))))[:8]))
    if L!='ko' and HANG.search(txt): issues.append('ハングル混入')
    if L in ('en','es','pt','id','vi','th') and CJK.search(txt): issues.append('漢字混入: '+', '.join(sorted(set(re.findall('[一-鿿]+',txt))))[:120])
    if L=='zh':
        t=[c for c in txt if c in TRAD]; 
        if t: issues.append('繁体字が混在: '+''.join(sorted(set(t))))
    if L=='zt':
        t=[c for c in txt if c in SIMP]
        if t: issues.append('簡体字が混在: '+''.join(sorted(set(t))))
    if L=='th' and not THAI.search(txt): issues.append('タイ文字なし')
    if 'CHIPS' in txt or '[' in txt and 'CHIPS' in txt: issues.append('CHIPS漏れ')
    if re.search(r'<=NOW|daeunIndex|SETSUBOKU|\[COMPUTED|use THESE years',txt): issues.append('内部データ漏れ')
    if re.search(r'(?<!\d)25[4-8]\d(?!\d)',txt): issues.append('仏暦の年')
    if re.search(r'[,，]\s*[,，]',txt): issues.append('連続読点')
    if L=='ko' and re.search(r'(^|\n)님',txt): issues.append('名前なし님')
    if L in('zh','zt') and re.search(r'[“「"][子丑寅卯辰巳午未申酉戌亥甲乙丙丁戊己庚辛壬癸害刑冲沖破][”」"]',txt): issues.append('一字専門語')
    if re.search(r'["“「][^"”」]{2,60}["”」]\s*[/／\n]\s*["“「]',txt): issues.append('チップ漏れ')
    if re.search(r'(星座|zodiac|ราศี|signo|zodíaco|cung hoàng đạo|별자리|zodiak)',txt,re.I): issues.append('西洋星座')
    fails=[t for t in ai if re.search(r"didn.t come through|うまく届かなかった|没有送达|沒有送達|전달되지|không đến|no llegó|não chegou|tidak sampai|ส่งไม่ถึง",t)]
    if fails: issues.append(f'通信エラーの返事 {len(fails)}件')
    years=sorted(set(re.findall(r'(?<!\d)(19\d\d|20\d\d)(?!\d)',txt)))
    print(f"== {L} {r['place']} 生年{r['prof']['y']}/{r['prof']['m']}/{r['prof']['d']} {r['prof']['hh']}:{r['prof']['mi']:02d} {r['prof']['sex']} | 吹き出し{len(ai)} | 画面エラー{len(r['errs'])}")
    print('   事実:',r['facts']['cur'],'→ 次',r['facts']['next'],'| 節木運',r['facts']['setsuboku'],'| 今年',r['facts']['year'])
    print('   返事に出た西暦:',years)
    print('   問題:', issues if issues else 'なし')
