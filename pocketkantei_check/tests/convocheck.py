# 会話テストの結果を機械的に確かめる（言語の混入・専門用語の漏れ・繰り返し・長さ・相手の誕生日の聞き直し など）
import json,re,sys
d=json.load(open(sys.argv[1]))
KANA=re.compile(r'[぀-ヿ]'); HAN=re.compile(r'[一-鿿]'); HANGUL=re.compile(r'[가-힯]'); THAI=re.compile(r'[฀-๿]')
VI=re.compile(r'[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]',re.I)
JARGON_JA=re.compile(r'命式|日主|大運|年運|十二運|蔵干|身強|身弱|喜神|忌神|正官|偏官|七殺|正財|偏財|食神|傷官|比肩|劫財|印綬|偏印|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]|日柱|月柱|空亡|半合|支合|三合|冲')
JARGON_ZH=re.compile(r'日主|大运|大運|十神|正官|偏官|七杀|七殺|食神|伤官|傷官|比肩|劫财|劫財|偏印|正印|日柱|空亡|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]')
JARGON_KO=re.compile(r'명식|일간|십신|대운|정관|편관|식신|상관|비견|겁재|편인|정인|일주|공망')
JARGON_EN=re.compile(r'\b(Direct Officer|Seven Killings|Eating God|Hurting Officer|Rob Wealth|Indirect Resource|Day Master|luck pillar|ten gods?|Heavenly Stem|Earthly Branch)\b',re.I)
ASK_BDAY=re.compile(r'生年月日|誕生日|birth ?date|birthday|date of birth|생년월일|생일|出生日期|生日|ngày sinh|fecha de nacimiento|data de nascimento|tanggal lahir|วันเกิด',re.I)
HELP=re.compile(r'いのちの電話|よりそい|#?9110|0120|988|Samaritans|Lifeline|1393|109|자살|12356|400-161|1925|hotline|ligne|línea|CVV|188|1323|helpline|相談窓口|相談先|专线|熱線|热线',re.I)
def grams(s,n=10):
    s=re.sub(r'\s','',s); return {s[i:i+n] for i in range(max(0,len(s)-n+1))}
def wrong(t,L):
    if L=='ja': return bool(HANGUL.search(t) or THAI.search(t) or VI.search(t))
    if L in('zh','zt'): return len(KANA.findall(t))>=2 or bool(HANGUL.search(t) or THAI.search(t))
    if L=='ko': return len(KANA.findall(t))>=2 or bool(HAN.search(t)) or bool(THAI.search(t))
    if L=='th': return bool(KANA.search(t) or HAN.search(t) or HANGUL.search(t))
    if L=='vi': return bool(KANA.search(t) or HAN.search(t) or HANGUL.search(t) or THAI.search(t))
    return bool(KANA.search(t) or HAN.search(t) or HANGUL.search(t) or THAI.search(t) or VI.search(t))
issues=[]; stats=[]
for c in d:
    L=c['lang']; gave_bday=False; prev=set()
    for i,t in enumerate(c['turns']):
        txt='\n'.join(t['reply']); n=len(txt)
        stats.append((c['id'],i+1,n,len(t['reply']),'/'.join(sorted(set(m.replace('gemini-','') for m in t['models'])))))
        if not t['reply']: issues.append((c['id'],i+1,'返事なし'))
        if wrong(txt,L): issues.append((c['id'],i+1,'別の言語の文字'))
        J={'ja':JARGON_JA,'zh':JARGON_ZH,'zt':JARGON_ZH,'ko':JARGON_KO}.get(L,JARGON_EN)
        m=J.search(txt)
        if m: issues.append((c['id'],i+1,'専門用語: '+m.group(0)))
        if re.search(r'\d{4}\s*(年|/|-)\s*\d{1,2}|19\d\d|\b\d{1,2} (tháng|de)\b',t['q']) and ASK_BDAY.search(t['q']+'') : gave_bday=True
        if re.search(r'19\d\d',t['q']): gave_bday=True
        elif gave_bday and ASK_BDAY.search(txt) and re.search(r'教えて|tell me|share|알려|告诉|告訴|cho mình|dime|me diz|kasih tahu|บอก',txt,re.I): issues.append((c['id'],i+1,'誕生日を聞き直した'))
        g=grams(txt)
        if prev and g:
            ov=len(g&prev)/len(g)
            if ov>0.25: issues.append((c['id'],i+1,'前の返事と重複 %.0f%%'%(ov*100)))
        prev|=g
        if re.search(r'生きてる意味|何のために生き|死にたい|消えたい|nobody would want|want to die|살기 싫|不想活|sống để làm gì',t['q'],re.I) and not HELP.search(txt):
            issues.append((c['id'],i+1,'（参考）つらい言葉に相談先なし'))
        if n>900 and L in('ja','zh','zt','ko'): issues.append((c['id'],i+1,'長い %d字'%n))
        if n>1800: issues.append((c['id'],i+1,'長い %d字'%n))
for x in issues: print(*x)
print('--- 件数',len(issues),'/ ターン',len(stats))
