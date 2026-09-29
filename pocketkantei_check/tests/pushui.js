// ニコからのメッセージ：画面の動作（ウェブ版・アプリ版（偽のFirebase））。サーバーは auth.js（偽のBlobs）
process.env.AUTH_SECRET='test-secret-0123456789abcdef';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const auth=require('./fx/functions/auth.js').handler; const store=require('@netlify/blobs').getStore('pk-accounts');
const srv=http.createServer((q,r)=>{
  if(q.url.startsWith('/api/auth')){let b='';q.on('data',c=>b+=c);q.on('end',async()=>{const o=await auth({httpMethod:q.method,headers:q.headers,body:b});r.writeHead(o.statusCode,o.headers);r.end(o.body);});return;}
  if(q.url.startsWith('/api/gemini')){ r.writeHead(500); return r.end('{}'); }
  let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});
}).listen(0,async()=>{
  const base='http://127.0.0.1:'+srv.address().port; const b=await chromium.launch(); let ok=0,ng=0;
  const eq=(n,a,e)=>{const r=JSON.stringify(a)===JSON.stringify(e); r?ok++:ng++; console.log(r?'OK ':'NG ',n,r?'':JSON.stringify(a)+' ≠ '+JSON.stringify(e));};
  // アカウントを作っておく
  const reg=JSON.parse((await auth({httpMethod:'POST',headers:{},body:JSON.stringify({action:'register',email:'ui@example.com',password:'sakura2026',data:{}})})).body);
  const tok=reg.token, uid=tok.split('.')[0];
  const mk=async(L,native,logged)=>{const ctx=await b.newContext({viewport:{width:420,height:900}});const pg=await ctx.newPage();pg.errs=[];pg.on('pageerror',e=>pg.errs.push(String(e).slice(0,200)));pg.dialogs=[];pg.on('dialog',d=>{pg.dialogs.push(d.message());d.accept();});
    await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    await pg.addInitScript(([L,native,logged,tok])=>{localStorage.setItem('pk_lang',L);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'t',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));
      if(logged) localStorage.setItem('pk_auth',JSON.stringify({email:'ui@example.com',token:tok}));
      if(!native) return;
      window.__fm={calls:[],ls:{}};
      window.Capacitor={getPlatform:()=>'android',Plugins:{FirebaseMessaging:{
        requestPermissions:async()=>{window.__fm.calls.push('perm');return {receive:window.__fm.deny?'denied':'granted'};},
        getToken:async()=>{window.__fm.calls.push('token');return {token:'fcm-ui-token'};},
        addListener:(n,f)=>{window.__fm.ls[n]=f;return {remove(){}};}
      }}};
    },[L,native,logged,tok]);
    await pg.goto(base+'/index.html'); await pg.waitForTimeout(900); return pg;};
  const openNotify=async pg=>{ await pg.evaluate(()=>pkNotifyOpen()); await pg.waitForTimeout(150); return pg.evaluate(()=>{const o=document.getElementById('pkNotifyOv');return o?{text:o.innerText,onDisabled:o.querySelector('#pkNfOn').disabled,acct:!!o.querySelector('#pkNfAcct'),off:!!o.querySelector('#pkNfOff')}:null;}); };
  // 1) ウェブ版：アプリ版だけの案内・ボタンは押せない
  let pg=await mk('ja',false,true);
  let s=await openNotify(pg);
  eq('メニューの表示名',await pg.evaluate(()=>document.getElementById('miNotifyT').textContent),'ニコからのメッセージ');
  eq('ウェブ版：アプリ版の案内と押せないボタン',[/アプリ版でご利用/.test(s.text),s.onDisabled],[true,true]);
  eq('運勢案内の文言は残っていない',/運勢/.test(s.text),false);
  eq('エラーなし',pg.errs,[]); await pg.context().close();
  // 2) アプリ版・未ログイン：アカウントが必要
  pg=await mk('en',true,false); s=await openNotify(pg);
  eq('未ログイン：アカウントが必要',[/account is needed/.test(s.text),s.onDisabled,s.acct],[true,true,true]); await pg.context().close();
  // 3) アプリ版・ログイン済み：オンにする → サーバーに登録
  pg=await mk('ko',true,true); s=await openNotify(pg);
  eq('アプリ版：押せる',s.onDisabled,false);
  await pg.evaluate(()=>{document.getElementById('pkNfH').value='21';document.getElementById('pkNfOn').click();}); await pg.waitForTimeout(600);
  const ps=await store.get(`ps:${uid}`,{type:'json'});
  eq('サーバーに登録（トークン・時刻・言語・端末）',[ps.on,ps.token,ps.hour,ps.lang,ps.platform],[true,'fcm-ui-token',21,'ko','android']);
  eq('登録のお知らせ（韓国語）',pg.dialogs.slice(-1),['설정했어요🦉 또 말 걸게요']);
  eq('端末にも記録',await pg.evaluate(()=>pkNotifyPref()),{on:true,hour:21});
  // 4) 受け取り箱 → チャットにニコの発言として足す（二度足さない）
  await store.setJSON(`pi:${uid}`,{items:[{id:'n1',text:'오늘 하루 고생 많았어! 저녁은 먹었어? 🦉',ts:Date.now()}]});
  await pg.evaluate(()=>window.__fm.ls.notificationActionPerformed({notification:{data:{kind:'nico',id:'n1'}}})); await pg.waitForTimeout(500);
  await pg.evaluate(()=>nicoInbox()); await pg.waitForTimeout(500);
  const m=await pg.evaluate(()=>state.msgs.filter(x=>x.nico).map(x=>x.text));
  eq('チャットに1回だけ表示',m,['오늘 하루 고생 많았어! 저녁은 먹었어? 🦉']);
  eq('画面にも出ている',await pg.evaluate(()=>/저녁은 먹었어/.test(document.getElementById('scChat').innerText)),true);
  // 5) オフにする
  s=await openNotify(pg); eq('オフのボタンが出る',s.off,true);
  await pg.evaluate(()=>document.getElementById('pkNfOff').click()); await pg.waitForTimeout(500);
  eq('サーバーでもオフ',(await store.get(`ps:${uid}`,{type:'json'})).on,false);
  eq('エラーなし',pg.errs,[]); await pg.context().close();
  // 6) 通知を許可しなかった
  pg=await mk('ja',true,true); await pg.evaluate(()=>{window.__fm.deny=true;}); await openNotify(pg);
  await pg.evaluate(()=>document.getElementById('pkNfOn').click()); await pg.waitForTimeout(500);
  eq('許可されていない時の案内',pg.dialogs.slice(-1),['通知が許可されていません。端末の設定から許可してください。']);
  await pg.context().close();
  // 7) 10言語：メニュー名と説明がその言語で出る
  const names={};
  for(const L of ['ja','en','zh','zt','ko','vi','es','pt','id','th']){ pg=await mk(L,false,false); names[L]=await pg.evaluate(()=>document.getElementById('miNotifyT').textContent+' / '+document.getElementById('miNotifyD').textContent); if(pg.errs.length) console.log('ERR',L,pg.errs); await pg.context().close(); }
  console.log(names); eq('10言語すべて表示',Object.values(names).every(x=>x.length>10&&!/undefined/.test(x)),true);
  console.log(`\n${ok} OK / ${ng} NG`); await b.close(); srv.close();
});
