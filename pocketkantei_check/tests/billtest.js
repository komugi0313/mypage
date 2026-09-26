process.env.AUTH_SECRET='test-secret-0123456789abcdef'; process.env.REVENUECAT_WEBHOOK_AUTH='whsec-0123456789abcdefXYZ';
const auth=require('./fx/functions/auth.js').handler, bill=require('./fx/functions/billing.js').handler;
const A=require('./fx/functions/auth.js')._t;
const post=(fn,body,headers={})=>fn({httpMethod:'POST',headers,body:JSON.stringify(body)}).then(o=>({s:o.statusCode,j:JSON.parse(o.body)}));
const WH={authorization:'Bearer whsec-0123456789abcdefXYZ'};
(async()=>{
  const r=await post(auth,{action:'register',email:'buy@example.com',password:'sakura2026',data:{}});
  const tok=r.j.token, uid=tok.split('.')[0]; const now=Date.now();
  console.log('登録直後のプラン', r.j.plan);
  console.log('合言葉なし', (await post(bill,{event:{type:'INITIAL_PURCHASE'}})).s);
  console.log('合言葉違い', (await post(bill,{event:{type:'INITIAL_PURCHASE'}},{authorization:'Bearer nope'})).s);
  console.log('TEST', (await post(bill,{event:{type:'TEST'}},WH)).j);
  console.log('匿名IDの購入', (await post(bill,{event:{type:'INITIAL_PURCHASE',app_user_id:'$RCAnonymousID:abc',product_id:'pk_std_monthly',expiration_at_ms:now+30*864e5,event_timestamp_ms:now}},WH)).j);
  console.log('購入(std)', (await post(bill,{event:{type:'INITIAL_PURCHASE',app_user_id:uid,product_id:'pk_std_monthly',expiration_at_ms:now+30*864e5,event_timestamp_ms:now,store:'APP_STORE',environment:'SANDBOX'}},WH)).j);
  console.log('status', (await post(auth,{action:'status',token:tok})).j.plan);
  // gemini 側の判定
  const g=require('./fx/functions/gemini.js');
  console.log('gemini判定(本人のトークン)', await eval('(async()=>{ const m=require("./fx/functions/gemini.js"); return null; })()'));
  console.log('古い通知(期限切れ)は無視', (await post(bill,{event:{type:'EXPIRATION',app_user_id:uid,product_id:'pk_std_monthly',expiration_at_ms:now-1000,event_timestamp_ms:now-5000}},WH)).j, (await post(auth,{action:'status',token:tok})).j.plan.plan);
  console.log('プラン変更(vip年額)', (await post(bill,{event:{type:'PRODUCT_CHANGE',app_user_id:uid,product_id:'pk_std_monthly',new_product_id:'pk_vip_annual',expiration_at_ms:now+30*864e5,event_timestamp_ms:now+1000}},WH)).j, (await post(auth,{action:'status',token:tok})).j.plan);
  console.log('解約(期限まで有効)', (await post(bill,{event:{type:'CANCELLATION',app_user_id:uid,product_id:'pk_vip_annual',expiration_at_ms:now+30*864e5,event_timestamp_ms:now+2000}},WH)).j, (await post(auth,{action:'status',token:tok})).j.plan);
  console.log('期限切れ', (await post(bill,{event:{type:'EXPIRATION',app_user_id:uid,product_id:'pk_vip_annual',expiration_at_ms:now-1,event_timestamp_ms:now+3000}},WH)).j, (await post(auth,{action:'status',token:tok})).j.plan);
  console.log('Google形式の商品ID(std:monthly)', (await post(bill,{event:{type:'RENEWAL',app_user_id:uid,product_id:'pk_std:monthly',expiration_at_ms:now+30*864e5,event_timestamp_ms:now+4000}},WH)).j, (await post(auth,{action:'status',token:tok})).j.plan.plan);
  console.log('不明な商品', (await post(bill,{event:{type:'RENEWAL',app_user_id:uid,product_id:'something',expiration_at_ms:now+30*864e5,event_timestamp_ms:now+5000}},WH)).j);
  const r2=await post(auth,{action:'register',email:'buy2@example.com',password:'sakura2026',data:{}}); const uid2=r2.j.token.split('.')[0];
  console.log('引き継ぎ', (await post(bill,{event:{type:'TRANSFER',transferred_from:[uid],transferred_to:[uid2],event_timestamp_ms:now+6000}},WH)).j, (await post(auth,{action:'status',token:tok})).j.plan.plan,'→',(await post(auth,{action:'status',token:r2.j.token})).j.plan.plan);
  console.log('ログインでもプランが返る', (await post(auth,{action:'login',email:'buy2@example.com',password:'sakura2026'})).j.plan.plan);
})();
