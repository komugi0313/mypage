import json,random,math,datetime as dt,zoneinfo,ephem,sys
places=json.load(open('places.json',encoding='utf8'))
TZ={'jp':'Asia/Tokyo','kr':'Asia/Seoul','tw':'Asia/Taipei','cn':'Asia/Shanghai','sg':'Asia/Singapore','ph':'Asia/Manila','th':'Asia/Bangkok','vn':'Asia/Ho_Chi_Minh','idn':'Asia/Jakarta','my':'Asia/Kuala_Lumpur','in':'Asia/Kolkata','ae':'Asia/Dubai','ru':'Europe/Moscow','gb':'Europe/London','fr':'Europe/Paris','es':'Europe/Madrid','de':'Europe/Berlin','it':'Europe/Rome','us':'America/New_York','ca':'America/Toronto','mx':'America/Mexico_City','br':'America/Sao_Paulo','ar':'America/Argentina/Buenos_Aires','pe':'America/Lima','au':'Australia/Sydney'}
CITY={'hongkong':'Asia/Hong_Kong','denpasar':'Asia/Makassar','surabaya':'Asia/Jakarta','chicago':'America/Chicago','denver':'America/Denver','la':'America/Los_Angeles','seattle':'America/Los_Angeles','honolulu':'Pacific/Honolulu','vancouver':'America/Vancouver','melbourne':'Australia/Melbourne','brisbane':'Australia/Brisbane','perth':'Australia/Perth','danang':'Asia/Ho_Chi_Minh','hanoi':'Asia/Bangkok'}
G='甲乙丙丁戊己庚辛壬癸';Z='子丑寅卯辰巳午未申酉戌亥'
def sunlon(t):
    s=ephem.Sun(); s.compute(ephem.Date(t),epoch=ephem.Date(t)); return math.degrees(ephem.Ecliptic(s,epoch=ephem.Date(t)).lon)%360
def solar_time(t,lon):
    o=ephem.Observer(); o.lon=str(lon); o.lat='0'; o.date=ephem.Date(t); o.pressure=0
    s=ephem.Sun(); s.compute(o); ha=float(s.ha)*12/math.pi  # hours
    return (ha+12)%24
random.seed(int(sys.argv[1]) if len(sys.argv)>1 else 1)
N=int(sys.argv[2]) if len(sys.argv)>2 else 40
cases=[]
for p in places:
    tzn=CITY.get(p['id'],TZ[p['g']]); tz=zoneinfo.ZoneInfo(tzn)
    k=0
    while k<N:
        y=random.randint(1940,2025); mo=random.randint(1,12); d=random.randint(1,28); hh=random.randint(0,23); mi=random.randint(0,59)
        loc=dt.datetime(y,mo,d,hh,mi,tzinfo=tz)
        # skip nonexistent/ambiguous local times
        rt=loc.astimezone(dt.timezone.utc).astimezone(tz)
        if rt.replace(tzinfo=None)!=loc.replace(tzinfo=None): continue
        if tz.utcoffset(loc)!=tz.utcoffset(loc.replace(fold=1)): continue
        utc=loc.astimezone(dt.timezone.utc).replace(tzinfo=None)
        t=ephem.Date(utc)
        lam=sunlon(t)
        # margin: 30 min from month-term boundary (sun moves ~0.0205 deg / 30min)
        off=((lam-315)%30); 
        if off<0.03 or off>29.97: continue
        mi_=int(((lam-315)%360)//30)  # 0=寅
        Y=utc.year
        if utc.month<=2 and 270<=lam<315: Y-=1
        if utc.month==12 and lam>=315: Y+=1
        ys=(Y-4)%10; yi=(Y-4)%60
        mstem=((ys%5)*2+2+mi_)%10; mbr=(2+mi_)%12
        st=solar_time(t,p['lon'])
        # local apparent solar date
        sol=utc+dt.timedelta(hours=(st-(utc.hour+utc.minute/60)) ) 
        # adjust to nearest: solar datetime = utc + delta where delta in (-14h,+14h)
        delta=(st-(utc.hour+utc.minute/60+utc.second/3600))
        base=p['lon']/15.0
        while delta>base+12: delta-=24
        while delta<base-12: delta+=24
        sol=utc+dt.timedelta(hours=delta)
        hmin=sol.hour*60+sol.minute
        if hmin%120 in range(50,70) or hmin>=23*60-10 or hmin<10: continue   # near hour-branch boundary (odd hours) or around midnight/23h
        if sol.hour==23: continue
        jdn=sol.date().toordinal()+1721425
        di=(jdn+49)%60; dstem=di%10
        hb=((sol.hour+1)%24)//2
        hstem=((dstem%5)*2+hb)%10
        ref=[G[yi%10]+Z[yi%12], G[mstem]+Z[mbr], G[di%10]+Z[di%12], G[hstem]+Z[hb]]
        cases.append(dict(place=p['id'],g=p['g'],tz=tzn,y=y,m=mo,d=d,hh=hh,mi=mi,offset=tz.utcoffset(loc).total_seconds()/3600,ref=ref))
        k+=1
json.dump(cases,open('tzcases.json','w'),ensure_ascii=False)
print(len(cases))
