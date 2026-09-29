// 本物のAIで「ニコからのメッセージ」の文面を10言語で作って確かめる（送信はしない）。鍵は環境変数 GEMINI_KEY
process.env.GEMINI_API_KEY=process.env.GEMINI_KEY;
const L=require('./fx/functions/push-lib.js')._t;
const MEM={ja:'- 来週、転職の面接がある（相手：田中さん）\n- 母の体調が心配',en:'- Job interview next week with Mr. Brown\n- Worried about her mother\'s health',zh:'- 下周有跳槽面试（对方：王先生）\n- 担心妈妈的身体',zt:'- 下週有轉職面試（對方：王先生）\n- 擔心媽媽的身體',ko:'- 다음 주 이직 면접 (상대: 김 부장)\n- 어머니 건강이 걱정',vi:'- Tuần sau phỏng vấn đổi việc (anh Minh)\n- Lo cho sức khỏe mẹ',es:'- Entrevista de trabajo la próxima semana (con el Sr. García)\n- Preocupada por la salud de su madre',pt:'- Entrevista de emprego semana que vem (com o Sr. Silva)\n- Preocupada com a saúde da mãe',id:'- Wawancara kerja minggu depan (dengan Pak Budi)\n- Khawatir kesehatan ibunya',th:'- สัปดาห์หน้ามีสัมภาษณ์งานใหม่ (คุณสมชาย)\n- เป็นห่วงสุขภาพแม่'};
const TZ={ja:'Asia/Tokyo',en:'America/New_York',zh:'Asia/Shanghai',zt:'Asia/Taipei',ko:'Asia/Seoul',vi:'Asia/Ho_Chi_Minh',es:'America/Mexico_City',pt:'America/Sao_Paulo',id:'Asia/Jakarta',th:'Asia/Bangkok'};
const cases=[{tmsg:5,hour:9},{tmsg:30,hour:15},{tmsg:90,hour:18},{tmsg:40,hour:21}];
(async()=>{
  const out=[]; let bad=0, yen=0;
  for(const lang of Object.keys(MEM)){
    for(const c of cases){
      const hist=[];
      for(let d=0;d<1;d++){
        const now=Date.parse('2026-10-0'+(1+d)+'T00:00:00Z'); // 時刻は下で合わせる
        const ps={tz:TZ[lang],hour:c.hour,lang,hist:hist.slice()};
        // その地域で c.hour 時になる瞬間
        let t=now; for(let k=0;k<24;k++){ const x=now+k*3600e3; if(L.localParts(TZ[lang],x).hour===c.hour){t=x;break;} }
        const data={pk_lang:lang,pk_tmsg:String(c.tmsg),pk_mem:MEM[lang],pk_profile:JSON.stringify({name:lang==='ja'?'りえ':'Rie',sex:'female'})};
        const g=await L.generate(data,ps,t,fetch);
        yen+=g.yen||0;
        if(!g.text){bad++; out.push({lang,...c,day:d,text:'(作れず:'+g.why+')'}); continue;}
        hist.push(g.text); out.push({lang,...c,day:d,text:g.text});
      }
    }
  }
  out.forEach(o=>console.log(`[${o.lang}] 段階${o.tmsg}通 ${o.hour}時 ${o.day+1}日目: ${o.text}`));
  require('fs').writeFileSync('pushlive.json',JSON.stringify(out,null,1));
  console.log('作れなかった',bad,'/',out.length,' 原価合計 ¥'+yen.toFixed(2),' 1通あたり ¥'+(yen/out.length).toFixed(3));
})();
