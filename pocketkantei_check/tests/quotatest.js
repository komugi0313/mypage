process.env.AUTH_SECRET='test-secret-0123456789abcdef'; process.env.REVENUECAT_WEBHOOK_AUTH='whsec-0123456789abcdefXYZ'; process.env.GEMINI_API_KEY='dummy';
let calls=[]; global.fetch=async(url,o)=>{ calls.push(url.match(/models\/([^:]+)/)[1]); return {ok:true,status:200,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:'ok'}]}}]})}; };
const auth=require('./fx/functions/auth.js').handler, bill=require('./fx/functions/billing.js').handler, gem=require('./fx/functions/gemini.js').handler;
const post=(fn,body,headers={})=>fn({httpMethod:'POST',headers,body:JSON.stringify(body)}).then(o=>({s:o.statusCode,b:o.body}));
const ask=(tok,h={})=>gem({httpMethod:'POST',headers:Object.assign({'x-pk-device':'dev1','x-pk-auth':tok||''},h),body:JSON.stringify({contents:[{role:'user',parts:[{text:'hi'}]}]})}).then(o=>o.statusCode+(o.statusCode!==200?(' '+JSON.parse(o.body).error.code):''));
(async()=>{ const now=Date.now();
  const reg=async(e,plan)=>{ const r=JSON.parse((await post(auth,{action:'register',email:e,password:'sakura2026',data:{}})).b); const uid=r.token.split('.')[0];
    if(plan) await post(bill,{event:{type:'INITIAL_PURCHASE',app_user_id:uid,product_id:'pk_'+plan+'_monthly',expiration_at_ms:now+30*864e5,event_timestamp_ms:now}},{authorization:'whsec-0123456789abcdefXYZ'}); return r.token; };
  // 無料
  const f=await reg('free@x.com'); const fr=[]; for(let i=0;i<6;i++) fr.push(await ask(f)); console.log('無料 6回:',fr.join(', '));
  // Standard
  const s=await reg('std@x.com','std'); let ok=0,last='';
  for(let i=0;i<51;i++){ const r=await ask(s,{'x-pk-deep':'1','x-pk-device':'devS'}); if(r==='200') ok++; else last=r; }
  console.log('Standard 本格鑑定51回: 通った',ok,'/ 51回目',last);
  console.log('  上限後の雑談:',await ask(s,{'x-pk-device':'devS'}),'| なぜ？(nocount):',await ask(s,{'x-pk-deep':'1','x-pk-nocount':'1','x-pk-device':'devS'}),'| 作り直し:',await ask(s,{'x-pk-deep':'1','x-pk-retry':'1','x-pk-device':'devS'}));
  let lite=0; for(let i=0;i<60;i++){ if(await ask(s,{'x-pk-device':'devS'})==='200') lite++; } console.log('  雑談60回 通った:',lite);
  // Pro / VIP
  for(const [p,n] of [['pro',100],['vip',175]]){ const t=await reg(p+'@x.com',p); let c=0; for(let i=0;i<n+1;i++){ if(await ask(t,{'x-pk-deep':'1','x-pk-device':'d'+p})==='200') c++; } console.log(p.toUpperCase()+' 本格鑑定'+(n+1)+'回: 通った',c); }
  // 改ざん：プラン名を名乗っても無料扱い
  console.log('プラン名の詐称(x-pk-plan:vip, トークンなし) 6回:', (await Promise.all([0,1,2,3,4,5].map(()=>0))).length && (await (async()=>{ const r=[]; for(let i=0;i<6;i++) r.push(await ask('',{'x-pk-plan':'vip','x-pk-device':'devX'})); return r.join(', '); })()));
  console.log('モデル: 本格鑑定→',calls.find(x=>/3/.test(x)),' 雑談→',calls.find(x=>/lite/.test(x)));
})();
