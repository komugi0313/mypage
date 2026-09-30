# 深い悩みへの「お茶・温まって・早く休んで・深呼吸」などの決まり文句と、同じ性格描写の繰り返しを数える
import json,re,sys
F=re.compile(r'お茶|白湯|温かい(飲み物|お茶|もの|スープ)|あたたかい(飲み物|もの)|温まって|あったまって|体を温め|お風呂|湯船|早(く|め)に?(寝|休|眠)|ゆっくり休んで|休ませて|深呼吸|ぐっすり|好きな音楽|散歩|warm (drink|tea|bath|milk)|cup of tea|hot (tea|drink|bath)|get some (rest|sleep)|go to bed early|deep breath|take a (bath|walk)|喝(杯|点)?(热|熱)|热水澡|熱水澡|早点(睡|休息)|深呼吸|따뜻한 (차|물|음료)|푹 쉬|일찍 자|심호흡|trà ấm|nghỉ ngơi sớm|hít thở sâu|té caliente|infusión|descansa|respira hondo|chá quente|descans|respire fundo|teh hangat|istirahat|tarik napas|ชาอุ่น|พักผ่อน|หายใจลึก',re.I)
NAT=re.compile(r'(あなた|さん)は(本来|もともと|元々|根っこ|生まれ持)|生まれ持った|you are someone who|your (core|born) nature|by nature, you|你(本身|骨子里|天生)|당신은 (원래|본래)|타고난|bản chất|por naturaleza|tu esencia|sua essência|pembawaan|โดยพื้นฐาน',re.I)
tot=0; hit=0; nat=0; heavy=0
for f in sys.argv[1:]:
    for c in json.load(open(f)):
        prevnat=0
        for t in c['turns']:
            txt=' '.join(t['reply'])
            if any(k in txt for k in ['混み合','busy right now','붐비','拥挤','擁擠','đông','saturada','cheia','ramai','แน่น']): continue
            tot+=1
            m=F.findall(txt)
            if m: hit+=1
            if NAT.search(txt):
                if prevnat: nat+=1
                prevnat=1
print('返事',tot,' 休息・お茶などの決まり文句を含む',hit,'(%.0f%%)'%(100*hit/max(1,tot)),' 前の返事に続けてまた性格の描写',nat)
