const {chromium}=require('/opt/node22/lib/node_modules/playwright');const http=require('http'),fs=require('fs'),path=require('path');
const root=process.argv[2]||'fx';
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':f.endsWith('.html')?'text/html; charset=utf-8':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
 const mk=async(prof,L,tz)=>{ const ctx=await b.newContext({timezoneId:tz||'Asia/Tokyo'}); const pg=await ctx.newPage(); await pg.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await pg.addInitScript(([p,L])=>{localStorage.setItem('pk_lang',L);localStorage.setItem('pk_svd','1');localStorage.setItem('pk_profile',JSON.stringify(p));},[prof,L]);
  await pg.goto(base+'/index.html');await pg.waitForTimeout(900); return pg; };
 const A={name:'はな',y:1990,m:6,d:8,tu:false,hh:12,mi:0,sex:'female',place:'tokyo'}, B={name:'Ken',y:1975,m:2,d:20,tu:false,hh:5,mi:30,sex:'male',place:'osaka'};
 const get=async(pg,q,shift)=>pg.evaluate(([q,shift])=>{ if(shift){ const R=Date; const off=shift; window.Date=class extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off);} static now(){return R.now()+off;} }; }
   state.msgs.push({role:'me',text:q}); const s=buildSystemPrompt(); state.msgs.pop(); return s; },[q,shift]);
 const common=(x,y)=>{let i=0;while(i<x.length&&x[i]===y[i])i++;return i;};
 const pa=await mk(A,'ja'); const s1=await get(pa,'今日の運勢は？',0), s2=await get(pa,'彼との恋愛どうなる？',0), s3=await get(pa,'仕事のこと',3*3600e3);
 const pb=await mk(B,'ja'); const s4=await get(pb,'今日の運勢は？',0);
 const pe=await mk(A,'en'); const s5=await get(pe,'hello',0);
 console.log('全体の長さ',s1.length);
 console.log('同じ人・別の質問 で一致する先頭',common(s1,s2));
 console.log('同じ人・3時間後 で一致する先頭',common(s1,s3));
 console.log('別の人・同じ言語 で一致する先頭',common(s1,s4));
 console.log('同じ人・英語 で一致する先頭',common(s1,s5));
 const i=common(s1,s2); console.log('最初に違う所:',JSON.stringify(s1.slice(Math.max(0,i-80),i+80)));
 const j=common(s1,s4); console.log('別の人で最初に違う所:',JSON.stringify(s1.slice(Math.max(0,j-80),j+60)));
 fs.writeFileSync('prefix_s1.txt',s1);
 await b.close();srv.close();});
