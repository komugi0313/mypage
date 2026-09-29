// ニコからのメッセージ（push-lib.js）の動作テスト：AI・Firebase は偽物に差し替え（鍵は不要）
const crypto=require('crypto');
process.env.AUTH_SECRET='test-secret-0123456789abcdef'; process.env.GEMINI_API_KEY='dummy';
const {privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
process.env.FCM_PROJECT_ID='pk-test'; process.env.FCM_CLIENT_EMAIL='svc@pk-test.iam.gserviceaccount.com';
process.env.FCM_PRIVATE_KEY=privateKey.export({type:'pkcs8',format:'pem'}).replace(/\n/g,'\\n');
const L=require('./fx/functions/push-lib.js'), auth=require('./fx/functions/auth.js').handler;
const store=require('@netlify/blobs').getStore('pk-accounts');
const post=b=>auth({httpMethod:'POST',headers:{},body:JSON.stringify(b)}).then(o=>JSON.parse(o.body));
let ok=0,ng=0; const eq=(n,a,b)=>{ const r=JSON.stringify(a)===JSON.stringify(b); r?ok++:ng++; console.log(r?'OK ':'NG ',n,r?'':`→ ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); };
// 偽の AI と Firebase
let aiQueue=[], sent=[], fcmStatus=200, lastSys='';
const fakeFetch=async(url,opt)=>{
  if(/generativelanguage/.test(url)){ const b=JSON.parse(opt.body); lastSys=b.systemInstruction.parts[0].text+'\n'+b.contents[0].parts[0].text; const t=aiQueue.length?aiQueue.shift():'おはよう☀️ 今日もいってらっしゃい';
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:t}]}}],usageMetadata:{promptTokenCount:1500,candidatesTokenCount:40}})}; }
  if(/oauth2/.test(url)) return {ok:true,json:async()=>({access_token:'at-1',expires_in:3600})};
  if(/fcm.googleapis/.test(url)){ const b=JSON.parse(opt.body); sent.push(b.message); if(fcmStatus!==200) return {ok:false,status:fcmStatus,text:async()=>'{"error":{"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}'}; return {ok:true,status:200}; }
  throw new Error('unexpected '+url);
};
const D={fetch:fakeFetch};
const at=(iso)=>Date.parse(iso);
(async()=>{
  const r=await post({action:'register',email:'nico@example.com',password:'sakura2026',data:{pk_lang:'ja',pk_tmsg:'75',pk_profile:JSON.stringify({name:'りえ',sex:'female'}),pk_mem:'- 来週、転職の面接がある（相手：田中さん）',pk_msgs:JSON.stringify([{role:'me',text:'面接が不安'},{role:'ai',text:'大丈夫だよ'}])}});
  const tok=r.token, uid=tok.split('.')[0];
  // 設定：東京の朝8時 → UTC 23時の区切り
  const s1=await post({action:'push_set',token:tok,pushToken:'fcm-tok-1',on:true,hour:8,tz:'Asia/Tokyo',lang:'ja',platform:'ios'});
  eq('設定できる',s1.push,{on:true,hour:8,tz:'Asia/Tokyo'});
  eq('UTC23時の目印',!!(await store.get(`pb:23:${uid}`)),true);
  eq('認証トークンなしは拒否',(await post({action:'push_set',pushToken:'x',on:true})).code,'BAD_TOKEN');
  // 東京 8:00 に送る
  const t1=at('2026-10-01T23:00:05Z');
  let res=await L.runHour(store,store,23,t1,D);
  eq('送った',res.out,{sent:1});
  eq('Firebaseへ（宛先・題名・本文）',[sent[0].token,sent[0].notification.title,sent[0].notification.body],['fcm-tok-1','Nico 🦉','おはよう☀️ 今日もいってらっしゃい']);
  eq('指示：日本語・親しい段階・朝・ロック画面の配慮',[/Write ONLY in Japanese/.test(lastSys),/CLOSE COMPANION/.test(lastSys),/morning/.test(lastSys),/lock screen/.test(lastSys),/転職の面接/.test(lastSys),/面接が不安/.test(lastSys)],[true,true,true,true,true,true]);
  eq('運勢の案内はしない指示',/Do NOT: tell fortunes/.test(lastSys),true);
  // 受け取り箱
  const ib=await post({action:'push_inbox',token:tok});
  eq('受け取り箱に1件',[ib.items.length,ib.items[0].text,ib.push.on],[1,'おはよう☀️ 今日もいってらっしゃい',true]);
  // 同じ日にもう一度 → 送らない
  res=await L.runHour(store,store,23,t1+600e3,D); eq('同じ日は1回だけ',res.out,{done:1});
  // 翌日：前と同じ文面が来たら作り直す
  aiQueue=['おはよう☀️ 今日もいってらっしゃい','おはよう、りえ。ご飯はちゃんと食べてね🍙'];
  res=await L.runHour(store,store,23,at('2026-10-02T23:00:05Z'),D);
  eq('似た文面は作り直して送る',[res.out,sent[sent.length-1].notification.body],[{sent:1},'おはよう、りえ。ご飯はちゃんと食べてね🍙']);
  eq('前に送った文面を指示に入れる',/RECENT MESSAGES YOU SENT\]\n- おはよう☀️/.test(lastSys),true);
  // 言語違い2回 → 送らない
  aiQueue=['Good morning!','Have a nice day!'];
  res=await L.runHour(store,store,23,at('2026-10-03T23:00:05Z'),D); eq('言語が違えば送らない',res.out,{nogen:1});
  // 長すぎる → 送らない
  aiQueue=['あ'.repeat(200),'い'.repeat(200)];
  res=await L.runHour(store,store,23,at('2026-10-04T23:00:05Z'),D); eq('長すぎれば送らない',res.out,{nogen:1});
  // アプリを消した端末（Firebase 404）→ 以後送らない
  fcmStatus=404; aiQueue=['おつかれさま、ゆっくり休んでね'];
  res=await L.runHour(store,store,23,at('2026-10-05T23:00:05Z'),D); eq('消えた端末は止める',res.out,{unregistered:1});
  eq('目印も消える',[await store.get(`pb:23:${uid}`),(await store.get(`ps:${uid}`,{type:'json'})).on],[null,false]);
  fcmStatus=200;
  // 再設定 → オフ
  await post({action:'push_set',token:tok,pushToken:'fcm-tok-2',on:true,hour:8,tz:'Asia/Tokyo'});
  await post({action:'push_set',token:tok,on:false});
  eq('オフにすると目印が消える',[await store.get(`pb:23:${uid}`),(await store.get(`ps:${uid}`,{type:'json'})).on],[null,false]);
  // 長く開いていない無料の人には送らない
  await post({action:'push_set',token:tok,pushToken:'fcm-tok-3',on:true,hour:8,tz:'Asia/Tokyo'});
  const ps=await store.get(`ps:${uid}`,{type:'json'}); ps.seen=at('2026-10-01T00:00:00Z'); await store.setJSON(`ps:${uid}`,ps);
  res=await L.runHour(store,store,23,at('2026-10-20T23:00:05Z'),D); eq('14日以上開いていない無料の人は送らない',res.out,{inactive:1});
  // 夏時間：ニューヨーク朝8時（夏はUTC12時）→ 冬になると UTC13時へ付け直す
  const r2=await post({action:'register',email:'ny@example.com',password:'sakura2026',data:{pk_lang:'en',pk_tmsg:'3'}});
  const tok2=r2.token, uid2=tok2.split('.')[0];
  const L0=L._t; const b0=L0.utcHourFor('America/New_York',8,at('2026-10-15T00:00:00Z'));
  eq('夏時間のUTC',b0,12);
  const ps2={on:true,token:'fcm-ny',hour:8,tz:'America/New_York',lang:'en',bucket:12,seen:at('2026-11-05T00:00:00Z')}; await store.setJSON(`ps:${uid2}`,ps2); await store.set(`pb:12:${uid2}`,'1');
  res=await L.runHour(store,store,12,at('2026-11-05T12:00:05Z'),D); eq('冬時間になったら付け直す',[res.out,!!(await store.get(`pb:13:${uid2}`)),await store.get(`pb:12:${uid2}`)],[{moved:1},true,null]);
  aiQueue=['Good morning! Did you sleep okay? ☕'];
  res=await L.runHour(store,store,13,at('2026-11-05T13:00:05Z'),D); eq('付け直した時刻に送る',res.out,{sent:1});
  eq('英語・出会ったばかりの段階',[/Write ONLY in English/.test(lastSys),/NEW — you only recently met/.test(lastSys)],[true,true]);
  // 有料の人は原価を1か月の上限に含める
  const rec=await store.get(`u:${uid2}`,{type:'json'}); rec.sub={plan:'std',start:at('2026-11-01T00:00:00Z'),expires:Date.now()+20*864e5,willRenew:true,store:'APP_STORE'}; await store.setJSON(`u:${uid2}`,rec);
  aiQueue=['Hope your day is going well 🌿'];
  const before=[...store._m.keys()].filter(k=>/^c:/.test(k)).length;
  res=await L.runHour(store,store,13,at('2026-11-06T13:00:05Z'),D);
  eq('有料の人の原価を記録',[res.out,[...store._m.keys()].filter(k=>/^c:/.test(k)).length>before],[{sent:1},true]);
  // 退会すると全部消える
  await post({action:'delete',token:tok2,password:'sakura2026'});
  eq('退会で消える',[await store.get(`ps:${uid2}`),await store.get(`pi:${uid2}`),await store.get(`pb:13:${uid2}`)],[null,null,null]);
  // 言語チェック
  const lk=L0.langOk;
  eq('言語チェック',[lk('おはよう','ja'),lk('早安，吃饭了吗？','zh'),lk('早安，ご飯','zh'),lk('좋은 아침','ko'),lk('อรุณสวัสดิ์','th'),lk('Chào buổi sáng','vi'),lk('Buenos días','es'),lk('Good morning','vi')],[true,true,false,true,true,true,true,false]);
  console.log(`\n${ok} OK / ${ng} NG`);
})().catch(e=>{console.error(e);process.exit(1)});
