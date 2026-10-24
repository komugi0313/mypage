// 発売前の点検（相性の詳細鑑定）：年の干支・2人の年齢・年なしの年齢・言葉の二重がっこ・＊・呼び出し回数
// 使い方：node tools/release_gate/gate_compat.mjs <pro|beginner>   （文章作成のサーバーにつながる環境で）
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require_=createRequire(import.meta.url);
for (const k of ['URL','DEPLOY_PRIME_URL','MEMBER_CHECK_URL','ALLOWED_ORIGINS']) delete process.env[k];
const _log=console.log; console.log=(...a)=>{const t=a.join(' '); if(/AIza|key=|≈¥|pro-cost/.test(t))return; _log(...a);};
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../..'), site=process.argv[2]||'pro';
const dir=site==='pro'?'pro':'beginner', page0=site==='pro'?'app-pro.html':'app-beginner.html';
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.join(ROOT,dir,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);}).listen(0);
await new Promise(r=>srv.on('listening',r)); const port=srv.address().port;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({serviceWorkers:'block',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
let calls=0; const R=[]; const ok=(name,pass,info='')=>{R.push(pass); _log((pass?'  OK ':'  NG ')+name+(info?'  … '+String(info).slice(0,200):''));};
await ctx.route('**/.netlify/functions/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
await ctx.route('**/.netlify/functions/gemini',async route=>{ calls++; const req=route.request(); const h=require_(path.join(ROOT,dir,'functions','gemini.js')).handler; const r=await h({httpMethod:'POST',headers:req.headers(),body:req.postData()||''}); if(process.env.GATE_RAW){ try{ const j=JSON.parse(r.body); fs.appendFileSync(process.env.GATE_RAW,'\n=====\n'+(j.candidates[0].content.parts||[]).map(x=>x.text).join('')); }catch(e){} } await route.fulfill({status:r.statusCode,headers:Object.assign({'Content-Type':'application/json'},r.headers||{}),body:r.body||''}).catch(()=>{}); });
const p=await ctx.newPage(); p.on('dialog',d=>d.accept());
await p.goto(`http://127.0.0.1:${port}/${page0}`); await p.waitForTimeout(2500);
await p.evaluate(()=>{const x=document.getElementById('pro-intro-x'); if(x) x.click();});
await p.click('button[data-mode=compat]'); await p.waitForTimeout(800);
const SAME=process.argv[3]==='samesex';   // 同性カップル（女性同士 1990-03-03×1990-02-02）で確かめる：node gate_compat.mjs pro samesex
const A=SAME?1990:2008, B=SAME?1990:2006;
if(SAME){ await p.fill('#f-name','花子'); await p.click('#f-quick'); await p.keyboard.type('19900303'); await p.click('#f-sex button[data-v=female]'); await p.check('#f-notime').catch(()=>{});
  await p.fill('#b-name','優子'); await p.click('#b-quick'); await p.keyboard.type('19900202'); await p.click('#b-sex button[data-v=female]'); await p.check('#b-notime').catch(()=>{}); }
else { await p.fill('#f-name','花子'); await p.click('#f-quick'); await p.keyboard.type('20080328 1400'); await p.click('#f-sex button[data-v=female]');
await p.fill('#b-name','太郎'); await p.click('#b-quick'); await p.keyboard.type('20060819'); await p.click('#b-sex button[data-v=male]'); await p.check('#b-notime').catch(()=>{}); }
_log(`■ 相性 / ${site}`);
await p.click('#compatBtn');
for(let i=0;i<90;i++){ await p.waitForTimeout(1000); const st=await p.evaluate(()=>{const s=document.getElementById('compat'); return s?{load:!!s.querySelector('.loading'),bar:!!s.querySelector('.rd-bar')}:null;}); if(st&&st.bar&&!st.load) break; }
await p.waitForTimeout(1500);
const t=(await p.evaluate(()=>(document.getElementById('compat')||{}).innerText||'')).split('🖨')[0];
if(process.env.GATE_DUMP) fs.writeFileSync(process.env.GATE_DUMP,t);
ok('相性の鑑定文が出る', t.length>600, t.length+'字');
if(SAME){ const all=await p.evaluate(()=>(document.getElementById('compat')||{}).innerText||''); const w=[...all.matchAll(/[^。\n]{0,20}(異性|夫の星|妻の星|夫星|彼氏|男役|女役)[^。\n]{0,20}/g)].map(m=>m[0]); ok('同性カップル：男女を前提にした言い方がない（画面全体）', w.length===0, w.slice(0,3).join(' / ')); }
const G='甲乙丙丁戊己庚辛壬癸', Z='子丑寅卯辰巳午未申酉戌亥', gz=y=>G[(y-4)%10]+Z[(y-4)%12];
const bad=[];
for(const m of t.matchAll(/(20\d\d)年（([^）]*)）/g)){ const y=+m[1], c=m[2]; const g=c.match(new RegExp('['+G+']['+Z+']')); if(g&&g[0]!==gz(y)) bad.push(m[0]); for(const a of c.matchAll(/(\d+)歳/g)) if(![y-A,y-B].includes(+a[1])) bad.push(m[0]); }
ok('年の干支と2人の年齢が正しい', bad.length===0, bad.slice(0,3).join(' / '));
const lone=[]; for(const m of t.matchAll(/(\d{1,3})歳/g)){ const ctx2=t.slice(Math.max(0,m.index-40),m.index); if(!/20\d\d年（[^）]*$/.test(ctx2)) lone.push(t.slice(Math.max(0,m.index-12),m.index+6)); }
ok('年のついていない年齢がない', lone.length===0, lone.slice(0,3).join(' / '));
const ys=[...new Set([...t.matchAll(/(20\d\d)年(?![0-9]|\d{1,2}月|度|代|生|[）)」』])/g)].filter(m=>!/[（(「『0-9〜~]$/.test(t.slice(Math.max(0,m.index-1),m.index))).map(m=>m[1]))], un=ys.filter(y=>!new RegExp(y+'年[*＊]*（').test(t));
ok('どの西暦にもツールの干支・年齢が付いている', un.length===0, un.join('・'));
const dup=[...t.matchAll(/([一-龥]{1,8})（\1（/g)].map(m=>m[0]); ok('言葉の二重がっこがない', dup.length===0, dup.join(' '));
{ const re=/(二人|2人|お二人|お互い)の配偶宮(?![^。\n]{0,12}(同士|どうし|の間|の組み合わせ|を比べ|どちらも|が害|には害|は害|が支合|が冲|には冲|が刑|が破))/; ok('配偶宮の持ち主をまちがえない（揺れやすい年は本人の配偶宮）', !re.test(t), (t.match(/.{0,10}(二人|2人|お二人|お互い)の配偶宮.{0,15}/)||[''])[0]); }
ok('相手から見た星（傷官）が本人の星を生むと書かない', !/傷官[^。]{0,40}(育て|生か|生み|生じ)/.test(t), (t.match(/傷官[^。]{0,40}(育て|生か|生み|生じ)/)||[''])[0]);
{ const m=t.match(/喜神[^。]{0,30}?([木火土金水])と([木火土金水])を(?:お)?相手が持/); ok('相手が持っていない五行を「持つ」と書かない（太郎さんは木を持たない）', !(m&&(m[1]==='木'||m[2]==='木')), m?m[0]:''); }
{ const m=t.match(/(あなた|本人)の配偶宮[^。]{0,12}支合|お相手の支とあなたの配偶宮/); ok('年の支合の相手をまちがえない（支合はお相手の日支と）', !m, m?m[0]:''); }
{ const m=t.match(/日干が?(木|土|金|水)（(本人|あなた)）|(あなた|本人)の日干(は|が|である)?(丁)?[（(]?[^）)。]{0,10}(木|土|金|水)の性質|十二運[^。]{0,20}の[ 　]*[子丑寅卯辰巳午未申酉戌亥](?![子丑寅卯辰巳午未申酉戌亥])/); ok('日干の五行・十二支/十二運をまちがえない（花子さん＝丁＝火）', !m, m?m[0]:''); }
{ const t1=t.replace(/\n[（(][ぁ-ん・]{1,16}[）)]\n/g,'').replace(/\n/g,'。'); const m=t1.match(/[^。]*(蔵干|十二運|元命|通変星)[^。]*/)||[...t1.matchAll(/[^。\n]*(比肩|劫財|食神|傷官|偏財|正財|偏官|正官|偏印|印綬)[^。]*/g)].map(x=>x[0]).filter(x=>!/配偶者星|官殺混雑|日干「.」は|から見て|(?:劫財|傷官|偏財|偏官|正官|偏印|印綬)なので、/.test(x))[0]; ok('判定にない細かい星・蔵干・十二運の話を書かない', !m, m?(Array.isArray(m)?m[0]:m):''); }
ok('答えの形がそろっている（結論・お伝え方・どうすればよいか・くわしい読み解き）', /お客様へのお伝え方/.test(t)&&/どうすればよいか/.test(t)&&/くわしい読み解き/.test(t), ['お客様へのお伝え方','どうすればよいか','くわしい読み解き'].filter(k=>!t.includes(k)).join('・')||'');
ok('「足りない五行」と書かない（助け合う五行）', !/(足りない|不足している|不足する)五行/.test(t), '');
ok('＊が出ない', !/[*＊]/.test(t), '');
ok('見出しが正しい（お客様へのお伝え方）', !/(お相手|お二人|あなた)への(お)?伝え方/.test(t), '');
ok('呼び出し回数'+(site==='beginner'?'（2〜4回）':'（2回）'), site==='beginner'?(calls>=2&&calls<=4):calls===2, 'calls='+calls);
const n=R.filter(Boolean).length; _log(`  → ${n===R.length?'合格':'不合格'}（${n}/${R.length}）  呼び出し合計 ${calls}`);
await b.close(); srv.close(); process.exit(n===R.length?0:1);
