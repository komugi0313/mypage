// 会話テストの返事が「本当に相手の助けになっているか」を、別のAIが厳しく採点する。鍵は環境変数 GEMINI_KEY
// 使い方: GEMINI_KEY=… node judge.js 会話結果.json 採点結果.json
const fs=require('fs'); const {execFile}=require('child_process');
const KEY=(process.env.GEMINI_KEY||'').trim(); if(!KEY){ console.error('GEMINI_KEY'); process.exit(1); }
function curlPost(url,body){ return new Promise((res,rej)=>{ const p=execFile('curl',['-s','-m','150','-X','POST','-H','Content-Type: application/json','--data-binary','@-',url],{maxBuffer:50e6},(err,out)=>{ if(err) return rej(err); res(out); }); p.stdin.end(body); }); }
const D=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const OUT=process.argv[3];
const SYS=`You are a strict evaluator of an AI companion ("Nico") in a fortune-telling chat app. Users come mostly with love, work and money worries, often in a fragile state. The ONLY question: did Nico's LATEST reply actually help THIS person, beyond generic encouragement?
Score 1-5 each:
- specific: uses the concrete details THIS user gave (numbers, people, what happened, their exact worry). 1 = could be sent to anyone.
- actionable: gives a concrete, doable next step fitted to their situation (what to say/send/stop/write/whom to contact, when). For pure venting or crisis, a precise, well-aimed listening question counts. 1 = only vague advice ("take care of yourself", "don't rush", "breathe").
- insight: helps them see their situation more clearly (names the real need or pattern, separates facts from fears, reframes accurately). 1 = none.
- honesty: truthful, no false promises, no empty flattery. 1 = flattering/unrealistic.
- resolution: does the conversation so far move toward resolving THEIR problem (their goal → the obstacle → a concrete next step with timing and, where useful, exact words)? 1 = aimless pleasant chat.
- repetition: 1-5, 5 = no repetition; 1 = says the same point several times in other words, or repeats what earlier replies already said (e.g. the same personality description again).
- dismissive: count of dismissive self-care suggestions to a person with a deep worry (tea, warm drink, bath, rest/sleep early, deep breaths) plus sudden fortune pivots they did not ask for.
- platitudes: number of stock phrases with no substance (e.g. "it's proof you're working hard", "everything will be fine", "be gentle with yourself", "have a warm drink / take a bath / deep breaths" as filler, "you are strong", "don't rush").
Also give: worst (the most generic or unhelpful sentence, quoted, or ""), missing (one short phrase: what would have helped more, in English).
Output ONLY JSON: {"specific":n,"actionable":n,"insight":n,"honesty":n,"resolution":n,"repetition":n,"dismissive":n,"platitudes":n,"worst":"...","missing":"..."}`;
(async()=>{
  const out=[]; const jobs=[];
  for(const c of D){ c.turns.forEach((t,i)=>jobs.push({c,i})); }
  let k=0; const worker=async()=>{ while(k<jobs.length){ const {c,i}=jobs[k++];
    const hist=c.turns.slice(0,i).map(t=>`USER: ${t.q}\nNICO: ${t.reply.join(' ')}`).join('\n\n');
    const t=c.turns[i];
    const user=`Language: ${c.lang}. Theme: ${c.theme}.\n[EARLIER]\n${hist||'(none)'}\n\n[LATEST USER MESSAGE]\n${t.q}\n\n[NICO'S LATEST REPLY — evaluate this]\n${t.reply.join('\n')}`;
    const body=JSON.stringify({systemInstruction:{parts:[{text:SYS}]},contents:[{role:'user',parts:[{text:user}]}],generationConfig:{temperature:0,maxOutputTokens:1500,responseMimeType:'application/json'}});
    let j=null; for(let a=0;a<3&&!j;a++){ try{ const r=JSON.parse(await curlPost('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key='+encodeURIComponent(KEY),body)); const tx=r.candidates[0].content.parts.map(p=>p.text||'').join(''); j=JSON.parse(tx.match(/\{[\s\S]*\}/)[0]); }catch(e){} }
    out.push({id:c.id,lang:c.lang,turn:i+1,q:t.q,score:j}); } };
  await Promise.all(Array.from({length:8},worker));
  out.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:a.turn-b.turn);
  fs.writeFileSync(OUT,JSON.stringify(out,null,1));
  const ok=out.filter(x=>x.score); const avg=f=>(ok.reduce((s,x)=>s+(+x.score[f]||0),0)/ok.length).toFixed(2);
  console.log('採点',ok.length,'/',out.length,'  具体性',avg('specific'),' 行動',avg('actionable'),' 気づき',avg('insight'),' 正直',avg('honesty'),' 解決',avg('resolution'),' 繰り返しの少なさ',avg('repetition'),' 突き放し(数)',avg('dismissive'),' 決まり文句(数)',avg('platitudes'));
})();
