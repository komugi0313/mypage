# 質問ごとに、犬種ごとの「そうだ」の割合を計算する（Darwin's Ark の answers.csv）
# そうだ＝ Agree系の質問は「Strongly Agree / Agree」、頻度の質問は「Often / Always」
import csv,json,os,sys,math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import compute as C
H=os.path.dirname(os.path.abspath(__file__));RAW=os.path.join(H,'raw')
dogs=C.rows("DarwinsArk_20191115_dogs.csv");ques={q['id']:q for q in C.rows("DarwinsArk_20191115_questions.csv")}
lab={}
for d in dogs:
    if not (C.truthy(d.get('cand')) or C.truthy(d.get('conf'))):continue
    b=d.get('regseq_breed');b=b if not C.na(b) else d.get('owner_breed')
    if C.na(b):continue
    lab[d['id']]=C.norm_breed(b)
ourname={}
names=set(lab.values())
for bid,c in C.BREEDS.items():
    n=next((x for x in c if x in names),None)
    if n:ourname[n]=bid
cnt={};yes={};allc={};ally={}
with open(os.path.join(RAW,'DarwinsArk_20191115_answers.csv'),newline='') as f:
    for r in csv.DictReader(f):
        q=r['question'];qq=ques.get(q)
        if not qq or qq.get('style')!='Likert' or C.na(r['answer']):continue
        a=int(r['answer']);opts=qq['options'].split('|')
        y=(a<=1) if opts[0].startswith('Strongly') else (a>=3)
        allc[q]=allc.get(q,0)+1;ally[q]=ally.get(q,0)+y
        b=ourname.get(lab.get(r['dog']))
        if b:
            k=(b,q);cnt[k]=cnt.get(k,0)+1;yes[k]=yes.get(k,0)+y
out={'source':'Darwin\'s Ark answers.csv（Morrill ほか 2022）。純血の犬のみ。「そうだ」＝Strongly Agree/Agree、または Often/Always。','questions':{},'breeds':{}}
for q,qq in ques.items():
    if q in allc:out['questions'][q]={'text':qq['string'],'short':qq.get('abbr_text'),'survey':qq.get('survey.name'),'n':allc[q],'yes':round(ally[q]/allc[q],4)}
for (b,q),n in cnt.items():
    if n<15:continue
    out['breeds'].setdefault(b,{})[q]={'n':n,'yes':round(yes[(b,q)]/n,4)}
json.dump(out,open(os.path.join(H,'breed_questions.json'),'w'),ensure_ascii=False,indent=0)
print(len(out['questions']),'問',len(out['breeds']),'犬種')
