const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const srv=http.createServer((q,r)=>{let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();const pg=await b.newPage();
 await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 await pg.addInitScript(()=>{localStorage.setItem('pk_lang','ja');localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify({name:'はな',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}));});
 await pg.goto(base+'/index.html');await pg.waitForTimeout(900);
 const r=await pg.evaluate(()=>{
  const names=['cultureBlock','crisisBlock','aftercareBlock','proBlock','pastBlock','zodiacBlock','monthBlock','romanceBlock','turningBlock','yearFactBlock','nayinBlock','voidReleaseBlock','favLogicBlock','lifeArcBlock','setsubokuBlock','luckyBlock','_todayGate','spotlightBlock','loveMandateBlock'];
  window.__hb=[String(healthBlock(false)).length,String(healthBlock(true)).length,String(healthBlock(false))===String(healthBlock(true))];
  const run=(q)=>{ state.msgs.push({role:'me',text:q}); const o={}; names.forEach(n=>{ try{ o[n]=String(window[n]()||''); }catch(e){ o[n]='ERR '+e.message; } }); try{o.healthBlock=String(healthBlock(false)||'');}catch(e){} try{o.topicFocus=String(topicFocus(q)||'');}catch(e){} state.msgs.pop(); return o; };
  const a=run('今日の運勢は？'), a2=run('今日の運勢は？'), c=run('彼との恋愛どうなる？ 別れたい');
  const res=Object.keys(a).map(k=>[k,a[k].length,a[k]===a2[k]?'同じ':'毎回ちがう',a[k]===c[k]?'質問で不変':'質問で変わる']); res.push(['healthBlock(false/true)'].concat(window.__hb)); return res;
 });
 r.forEach(x=>console.log(x.join('\t'))); await b.close();srv.close();});
