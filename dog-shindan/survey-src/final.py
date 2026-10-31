import q,q2,copy,datetime as dt,jpholiday,calendar
from extra import INS,LOV
SRC=[(2026,11,q.NOV),(2026,12,q.DEC)]+[(2027,i+1,getattr(q2,k)) for i,k in enumerate("JAN FEB MAR APR MAY JUN JUL AUG SEP OCT".split())]
MONTHS=[]
def flagged(t):return t[:1] in "*!#♡"
def free(day):  # 行事・祝日・印つきがない日
    y,m,(d,ev,qs)=day
    x=dt.date(y,m,int(d.split('/')[1]))
    return not ev and not jpholiday.is_holiday_name(x) and not any(a[:1] in "!#♡" for a,b in qs)
def put(qs,newq,mark):
    i=1 if not flagged(qs[1][0]) else (0 if not flagged(qs[0][0]) else None)
    assert i is not None
    t,o=newq;age=t.startswith('*');t=t.lstrip('*')
    qs[i]=(mark+('*' if age else '')+t,o)
li=0;log=[]
for y,m,data in SRC:
    data=copy.deepcopy(data);data=[[d,ev,list(qs)] for d,ev,qs in data]
    days=[(y,m,x) for x in data]
    wd=lambda x:dt.date(y,m,int(x[0].split('/')[1])).weekday()
    # 週ごとに 水→木→火→金→月
    weeks={}
    for x in data:
        k=dt.date(y,m,int(x[0].split('/')[1])).isocalendar()[1];weeks.setdefault(k,[]).append(x)
    slots=[]
    for k in sorted(weeks,key=lambda k:dt.date(y,m,int(weeks[k][0][0].split('/')[1]))):
        for w in [2,3,1,4,0]:
            c=[x for x in weeks[k] if wd(x)==w and free((y,m,x))]
            if c:slots.append(c[0]);break
    lst=INS[(y,m)];assert len(slots)>=len(lst),(y,m,len(slots))
    for x,nq in zip(slots,lst):put(x[2],nq,'#');log.append((x[0],'#',nq[0]))
    suns=[x for x in data if wd(x)==6 and free((y,m,x))]
    if len(suns)<2:suns=sorted(suns+[x for x in data if wd(x)==5 and free((y,m,x))],key=lambda x:int(x[0].split('/')[1]))
    pick=[suns[0],suns[2] if len(suns)>2 else suns[-1]]
    assert pick[0] is not pick[1]
    for x in pick:put(x[2],LOV[li],'♡');log.append((x[0],'♡',LOV[li][0]));li+=1
    for x in data:
        if x[0]=="9/22" and not x[1]:x[1]="動物愛護週間"
    MONTHS.append((y,m,[(d,ev,qs) for d,ev,qs in data]))
assert li==24
