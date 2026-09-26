process.env.AUTH_SECRET='test-secret-0123456789abcdef';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const auth=require('./fx/functions/auth.js').handler;
let geminiMode='500';
const srv=http.createServer((q,r)=>{
  if(q.url.startsWith('/api/auth')){let b='';q.on('data',c=>b+=c);q.on('end',async()=>{const o=await auth({httpMethod:q.method,headers:q.headers,body:b});r.writeHead(o.statusCode,o.headers);r.end(o.body);});return;}
  if(q.url.startsWith('/api/gemini')){ if(geminiMode==='429'){r.writeHead(429,{'content-type':'application/json'});return r.end('{"error":{"code":"LIMIT"}}');} r.writeHead(500);return r.end('{}');}
  if(q.url.startsWith('/api/')){r.writeHead(500);return r.end('{}');}
  let f=path.join('fx',decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'application/javascript':'application/octet-stream'});r.end(d);});
}).listen(0,async()=>{
  const base='http://127.0.0.1:'+srv.address().port;
  const b=await chromium.launch(); const out={};
  const LANGS=['ja','en','zh','zt','ko','vi','es','pt','id','th'];
  for(const L of LANGS){
    const R=out[L]={errs:[],txt:{}};
    const mk=async(block)=>{const ctx=await b.newContext({viewport:{width:420,height:900}});const pg=await ctx.newPage();pg.on('pageerror',e=>R.errs.push(String(e).slice(0,160)));pg.on('dialog',d=>{R.txt['dialog_'+Object.keys(R.txt).length]=d.message();d.accept();});
      await pg.route('**/*',r=>{const u=r.request().url();if(block&&u.includes('/api/auth'))return r.abort();if(u.startsWith(base))return r.continue();return r.abort();});
      await pg.addInitScript((L)=>{try{localStorage.setItem('pk_lang',L);localStorage.setItem('pk_svd','1');}catch(e){}},L);return pg;};
    const err=async(pg,id)=>((await pg.textContent(id))||'').trim();
    const email=`u_${L}@example.com`;
    // 1) validation
    let A=await mk(false); await A.goto(base+'/index.html?start=1'); await A.waitForTimeout(700);
    R.txt.onboard=await A.evaluate(()=>document.getElementById('scOnboard').innerText);
    await A.click('#regBtn'); await A.waitForTimeout(250); R.txt.e_empty=await err(A,'#acErr');
    await A.fill('#iname','Test'); await A.fill('#acEmail','abc'); await A.fill('#acPw','sakura2026'); await A.fill('#acPw2','sakura2026'); await A.click('#regBtn'); await A.waitForTimeout(250); R.txt.e_email=await err(A,'#acErr');
    await A.fill('#acEmail',email); await A.fill('#acPw','short'); await A.fill('#acPw2','short'); await A.click('#regBtn'); await A.waitForTimeout(250); R.txt.e_short=await err(A,'#acErr');
    await A.fill('#acPw','sakura2026'); await A.fill('#acPw2','sakura2020'); await A.click('#regBtn'); await A.waitForTimeout(250); R.txt.e_mismatch=await err(A,'#acErr');
    // 2) network down
    const N=await mk(true); await N.goto(base+'/index.html?start=1'); await N.waitForTimeout(700);
    await N.fill('#iname','Test'); await N.fill('#acEmail','n_'+email); await N.fill('#acPw','sakura2026'); await N.fill('#acPw2','sakura2026'); await N.click('#regBtn'); await N.waitForTimeout(1500); R.txt.e_network=await err(N,'#acErr'); R.txt.network_screen=await N.evaluate(()=>[...document.querySelectorAll('.screen.on')].map(s=>s.id).join());
    // 3) success
    await A.fill('#acPw2','sakura2026'); await A.click('#regBtn'); await A.waitForTimeout(2000);
    R.txt.after_reg=await A.evaluate(()=>[...document.querySelectorAll('.screen.on')].map(s=>s.id).join());
    // 4) duplicate
    const D=await mk(false); await D.goto(base+'/index.html?start=1'); await D.waitForTimeout(700);
    await D.fill('#iname','Test'); await D.fill('#acEmail',email); await D.fill('#acPw','sakura2026'); await D.fill('#acPw2','sakura2026'); await D.click('#regBtn'); await D.waitForTimeout(1500); R.txt.e_exists=await err(D,'#acErr');
    // 5) login wrong / forgot
    await D.goto(base+'/index.html#login'); await D.waitForTimeout(700); R.txt.login=await D.evaluate(()=>document.getElementById('scLogin').innerText);
    await D.fill('#lgEmail',email); await D.fill('#lgPw','wrongpass1'); await D.click('#lgBtn'); await D.waitForTimeout(1000); R.txt.e_login=await err(D,'#lgErr');
    try{ await D.evaluate(()=>showForgot()); await D.waitForTimeout(300); R.txt.forgot=await D.evaluate(()=>document.getElementById('scForgot').innerText);}catch(e){R.txt.forgot='ERR '+e.message.slice(0,80);}
    // 6) sheets
    for(const sh of ['shMenu','shMyPage','shBackup','shPlan','shContact','shAbout','shMeishiki','shEdit','shAisho']){
      try{ R.txt[sh]=await A.evaluate((sh)=>{closeSheets(); const m={shMyPage:'mypage',shContact:'contact',shAbout:'about',shMeishiki:'meishiki',shEdit:'edit',shAisho:'aisho',shPlan:'plan'}[sh];
        if(m){ const btn=document.querySelector('#shMenu .menu-item[data-act="'+m+'"]'); if(btn) btn.click(); } else if(sh==='shBackup'){ renderBackup(); openSheet('shBackup'); } else openSheet(sh);
        return new Promise(res=>setTimeout(()=>{const el=document.getElementById(sh); res(el.classList.contains('on')?el.innerText:'(開かない) '+el.innerText.slice(0,100));},400));},sh); }catch(e){R.txt[sh]='ERR '+e.message.slice(0,100);}
    }
    // 7) chat errors
    await A.evaluate(()=>closeSheets());
    for(const mode of ['500','429']){ geminiMode=mode; const n=await A.evaluate(()=>state.msgs.length); await A.fill('#askIn','test?'); await A.click('#askBtn'); await A.waitForTimeout(6000);
      R.txt['chat_'+mode]=await A.evaluate((n)=>state.msgs.slice(n).map(m=>m.role+': '+m.text).join(' | '),n); }
    R.txt.chat_screen=await A.evaluate(()=>document.getElementById('scChat').innerText.slice(0,1500));
    for(const c of b.contexts()){ try{await c.close();}catch(e){} }
    fs.writeFileSync('ui10.json',JSON.stringify(out,null,1));
    console.log('done',L,R.errs.length);
  }
  fs.writeFileSync('ui10.json',JSON.stringify(out,null,1));
  await b.close();srv.close();
});
