import json
c=json.load(open('tzresult.json',encoding='utf8'))
bad=[x for x in c if x.get('app')!=x.get('ref')]
print('全体',len(c),'不一致',len(bad))
for x in bad[:10]: print(x)
