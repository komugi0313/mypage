process.env.AUTH_SECRET='test-secret-0123456789abcdef'; process.env.REVENUECAT_WEBHOOK_AUTH='whsec-0123456789abcdefXYZ'; process.env.GEMINI_API_KEY='dummy';
let T0=Date.parse('2026-10-05T03:00:00Z'), offset=0; const realNow=Date.now; Date.now=()=>T0+offset;
global.fetch=async(url,o)=>{ const deep=/3\.6/.test(url); const u=deep?{promptTokenCount:28000,candidatesTokenCount:700,thoughtsTokenCount:1800}:{promptTokenCount:28000,candidatesTokenCount:600};
  return {ok:true,status:200,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:'ok'}]}}],usageMetadata:u})}; };
const auth=require('./fx/functions/auth.js').handler, bill=require('./fx/functions/billing.js').handler, G=require('./fx/functions/gemini.js');
const post=(fn,body,headers={})=>fn({httpMethod:'POST',headers,body:JSON.stringify(body)}).then(o=>JSON.parse(o.body));
const ask=(tok,h)=>G.handler({httpMethod:'POST',headers:Object.assign({'x-pk-device':'d1','x-pk-auth':tok},h),body:'{"contents":[{"role":"user","parts":[{"text":"x"}]}]}'}).then(o=>o.statusCode===200?'ok':JSON.parse(o.body).error.code);
(async()=>{
  for(const plan of ['std','pro','vip']){
    offset=0;
    const r=await post(auth,{action:'register',email:plan+'@b.com',password:'sakura2026',data:{}}); const tok=r.token, uid=tok.split('.')[0];
    await post(bill,{event:{type:'INITIAL_PURCHASE',app_user_id:uid,product_id:'pk_'+plan+'_monthly',purchased_at_ms:Date.now(),expiration_at_ms:Date.now()+31*864e5,event_timestamp_ms:Date.now()}},{authorization:'whsec-0123456789abcdefXYZ'});
    let cost=0, deepOK=0, chatOK=0, whyOK=0, crisisOK=0;
    const tx=G._t, liteC=(28000*0.10+600*0.40)/1e6*150, deepC=(28000*0.5+2500*3)/1e6*150;
    for(let d=0; d<31; d++){ offset=d*864e5;
      for(let i=0;i<8;i++){ if(await ask(tok,{'x-pk-deep':'1'})==='ok'){deepOK++;cost+=deepC;} }             // 本格鑑定を毎日8回（上限まで）
      for(let i=0;i<400;i++){ const a=await ask(tok,{}); if(a==='ok'){chatOK++;cost+=liteC;} else break; }  // 雑談を止まるまで
      for(let i=0;i<120;i++){ const a=await ask(tok,{'x-pk-deep':'1','x-pk-nocount':'1'}); if(a==='ok'){whyOK++;cost+=deepC;} else break; }
      for(let i=0;i<5;i++){ if(await ask(tok,{'x-pk-deep':'1','x-pk-nocount':'1','x-pk-crisis':'1'})==='ok'){crisisOK++;cost+=deepC;} }
      for(let i=0;i<700;i++){ if(await ask(tok,{'x-pk-classify':'1'})==='ok'){cost+=liteC;} }
    }
    const price={std:2900,pro:5900,vip:9800}[plan], net30=price/1.1*0.7, netY=({std:31900,pro:64900,vip:107800}[plan]/12)/1.1*0.7;
    console.log(`${plan}（31日間の月）: 本格鑑定 ${deepOK} / 雑談 ${chatOK} / なぜ？ ${whyOK} / 危機の相談 ${crisisOK} → AI原価 ¥${Math.round(cost)}（上限 ¥${tx.COST_BUDGET[plan]}）｜利益率（アプリ30%・月額）${Math.round((net30-cost)/net30*100)}%・（年額）${Math.round((netY-cost)/netY*100)}%`);
  }
})();

// 無料ユーザーが分類の呼び出しで使い放題にできないか
(async()=>{ await new Promise(r=>setTimeout(r,1)); })();
setTimeout(async()=>{ offset=0; let ok=0; for(let i=0;i<60;i++){ const a=await G.handler({httpMethod:'POST',headers:{'x-pk-device':'free1','x-pk-classify':'1'},body:'{"contents":[{"role":"user","parts":[{"text":"x"}]}]}'}); if(a.statusCode===200) ok++; } console.log('無料・分類の呼び出し60回 → 通った',ok); }, 1);
