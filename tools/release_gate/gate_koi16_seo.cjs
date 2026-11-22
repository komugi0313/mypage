// 恋のかたち診断の説明ページ（tools/koi16_seo.js が作る aichaku/・type/）の点検。gate_koi16.cjs と同じ数え方で、泣き別れ・言葉の途中の改行・はみ出し・小さいボタン・読めないファイルを数える。
// 使い方：node tools/release_gate/gate_koi16_seo.cjs （KOI_MODE=android / iphone・KOI_NOFONT=1 も同じ）
const { chromium } = require('playwright');
const fs=require('fs');
const http=require('http'), path=require('path');
const ROOT=path.resolve(__dirname,'../../koi16');
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png'};
const srv=http.createServer((q,r)=>{ let f=decodeURIComponent(q.url.split('?')[0]); if(f.endsWith('/')) f+='index.html'; const p=path.join(ROOT,f); if(!p.startsWith(ROOT)||!fs.existsSync(p)){ r.statusCode=404; return r.end(); } r.setHeader('Content-Type',TYPES[path.extname(p)]||'application/octet-stream'); r.end(fs.readFileSync(p)); });
const g=fs.readFileSync(path.join(__dirname,'gate_koi16.cjs'),'utf8');
const scanSrc=g.slice(g.indexOf('function scan()'), g.indexOf('\n(async () =>'));
const scan=new Function(scanSrc+'; return scan();');
const PAGES=['aichaku/','chara/','kataomoi/','aisho/','izon/','mbti/','aishohyo/'].concat(['LVTP','LVTC','LATP','LATC','LVSP','LVSC','LASP','LASC','RVTP','RVTC','RATP','RATC','RVSP','RVSC','RASP','RASC'].map(c=>'type/'+c.toLowerCase()+'/'));
const MODE=process.env.KOI_MODE||'';
const WIDTHS = MODE === 'android' ? [360, 384, 393, 412, 432] : MODE === 'iphone' ? [375, 390, 393, 402, 430, 440] : [320, 360, 375, 390, 414, 430];
(async()=>{ await new Promise(ok=>srv.listen(0,'127.0.0.1',ok)); const PORT=srv.address().port; const b=await chromium.launch(); const probs=[];
 for(const w of WIDTHS){ const ctx=await b.newContext({viewport:{width:w,height:800},isMobile:true,hasTouch:true});
  if (MODE === 'iphone') await ctx.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '*{text-wrap-style:auto!important}'; document.head.appendChild(s); }));
  if (process.env.KOI_NOFONT) await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const p=await ctx.newPage(); p.on('pageerror',e=>probs.push(w+' err '+e.message));
  p.on('response',r=>{ if(r.status()>=400) probs.push(w+' 404 '+r.url()); });
  for(const u of PAGES){ await p.goto('http://127.0.0.1:'+PORT+'/'+u); await p.waitForTimeout(300);
   (await p.evaluate(scan)).forEach(x=>probs.push(w+'px '+u+'：'+x)); }
  await ctx.close(); }
 await b.close(); srv.close(); console.log(probs.length?probs.join('\n'):'OK 0件'); process.exit(probs.length?1:0); })();
