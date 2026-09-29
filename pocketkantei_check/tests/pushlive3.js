// 本物のAIで、月〜日の7日間×10言語の文面を作り、曜日の取り違えがないか確かめる（送信はしない）。鍵は環境変数 GEMINI_KEY
process.env.GEMINI_API_KEY=process.env.GEMINI_KEY;
const L=require('./fx/functions/push-lib.js')._t;
const TZ={ja:'Asia/Tokyo',en:'America/New_York',zh:'Asia/Shanghai',zt:'Asia/Taipei',ko:'Asia/Seoul',vi:'Asia/Ho_Chi_Minh',es:'America/Mexico_City',pt:'America/Sao_Paulo',id:'Asia/Jakarta',th:'Asia/Bangkok'};
const HOURS=[9,12,15,18,20];
let raw=[], caught=0;
const spy=async(u,o)=>{ const r=await fetch(u,o); if(!/generativelanguage/.test(u)) return r; const j=await r.json(); raw.push(j); return {ok:r.ok,json:async()=>j}; };
(async()=>{
  const out=[]; let bad=0, fail=0;
  for(const lang of Object.keys(TZ)){
    const hist=[];
    for(let d=0;d<7;d++){
      const hour=HOURS[(d+lang.length)%HOURS.length];
      const base=Date.parse('2026-10-05T00:00:00Z')+d*864e5;   // 10/5 は月曜
      let t=base; for(let k=0;k<30;k++){ const x=base+k*3600e3; if(L.localParts(TZ[lang],x).hour===hour){t=x;break;} }
      const lp=L.localParts(TZ[lang],t);
      raw=[];
      const g=await L.generate({pk_lang:lang,pk_tmsg:String([5,30,90][d%3]),pk_profile:JSON.stringify({name:'Rie',sex:'female'})},{tz:TZ[lang],lang,hist:hist.slice()},t,spy);
      // 作り直し前の生の文面で、曜日の取り違えがあったか
      raw.forEach(j=>{ const x=L.tidy(((j.candidates||[])[0]||{}).content?j.candidates[0].content.parts.map(p=>p.text||'').join(''):''); if(x&&!L.dayOk(x,lang,lp.weekday)) caught++; });
      if(!g.text){ fail++; out.push(`[${lang}] ${lp.weekday} ${lp.hour}時: (作れず)`); continue; }
      if(!L.dayOk(g.text,lang,lp.weekday)) bad++;
      hist.push(g.text); out.push(`[${lang}] ${lp.weekday.slice(0,3)} ${lp.hour}時: ${g.text}`);
    }
  }
  console.log(out.join('\n'));
  console.log(`\n送る文面の曜日の取り違え: ${bad} / ${out.length}　作り直しで防いだ: ${caught}　作れず: ${fail}`);
})();
