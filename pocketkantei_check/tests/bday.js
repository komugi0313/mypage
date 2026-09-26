const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const Q=JSON.parse(fs.readFileSync('bigq.json','utf8'));
const MY={ja:'私の誕生日覚えてる？',en:'Do you remember my birthday?',zh:'你记得我的生日吗？',zt:'你記得我的生日嗎？',ko:'제 생일 기억해요?',vi:'Bạn có nhớ sinh nhật của tôi không?',es:'¿Recuerdas mi cumpleaños?',pt:'Você lembra do meu aniversário?',id:'Kamu ingat tanggal lahir saya?',th:'จำวันเกิดของฉันได้ไหม'};
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();const pg=await b.newPage();
 await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await pg.addInitScript(()=>{localStorage.setItem('pk_lang','ja');localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'t',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));});
 await pg.goto(base+'/index.html');await pg.waitForTimeout(1000);
 for(const L of Object.keys(Q)){ const r=await pg.evaluate(([L,a,m])=>{state.lang=L;state.mode='self';return [_localBirthday(a),_localBirthday(m)];},[L,Q[L][11],MY[L]]); console.log(L,'相性の入力→',r[0]===null?'OK(AIへ)':'NG '+r[0],'| 自分の誕生日→',r[1]?r[1].slice(0,40):'NG null'); }
 await b.close();srv.close();});
