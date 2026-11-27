// 犬種の出やすさの調整（index.html の ADJ）を作り直す：node dog-shindan/tools/calibrate_adj.js → 出た ADJ を index.html に貼る
const fs=require('fs');const s=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const L=s.split('\n');const a0=L.findIndex(l=>l.startsWith('var QB=['));const b0=L.findIndex((l,i)=>i>a0&&l.startsWith('];'));const QB=eval('['+L.slice(a0+1,b0).join('\n')+']');
const i=s.indexOf('var BR=[');const j=s.indexOf('\n];',i);const BR=eval(s.slice(i+7,j+2));
let ADJ=eval(s.match(/var ADJ=(\[[^\]]*\])/)[1]);const OLD=ADJ.slice();
const SP=1.3,spread=p=>p.map(v=>Math.max(0,Math.min(100,50+(v-50)*SP)));
const dist=(a,b)=>{let x=0;for(let k=0;k<a.length;k++)x+=(a[k]-b[k])**2;return Math.sqrt(x*6/a.length)};
let seed=11;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;const g=()=>{let u=0;for(let k=0;k<6;k++)u+=rnd();return u-3};
// 答えた人の点（pct）を作る：各性格3問・5択。半分は性格がはっきりした子（一様）、半分はまん中寄りの子
function user(){const centered=rnd()<.5;const p=[];for(let ax=0;ax<10;ax++){const t=centered?50+g()*28:rnd()*100;let sm=0;for(let r=0;r<3;r++){let pts=Math.round((t+g()*12)/25);sm+=Math.max(0,Math.min(4,pts))}p.push(Math.round(sm/12*100))}return spread(p)}
const N=40000;const U=[];for(let k=0;k<N;k++)U.push(user());
const top=adj=>{const c=new Array(BR.length).fill(0);U.forEach(q=>{let bi=0,bd=1e9;BR.forEach((b,k)=>{const d=Math.max(0,dist(q,b.v)+adj[k]);if(d<bd){bd=d;bi=k}});c[bi]++});return c};
const show=(c,tag)=>{const sh=c.map(x=>x/N*100);console.log(tag,'max',Math.max(...sh).toFixed(1)+'%('+BR[sh.indexOf(Math.max(...sh))].id+')','min',Math.min(...sh).toFixed(1)+'%('+BR[sh.indexOf(Math.min(...sh))].id+')')};
show(top(ADJ),'old');
for(let it=0;it<60;it++){const c=top(ADJ);ADJ=ADJ.map((a,k)=>a+0.8*Math.log(Math.max(c[k],1)/(N/BR.length)))}
const c=top(ADJ);show(c,'new');
ADJ=ADJ.map(x=>Math.round(x*10)/10);show(top(ADJ),'rounded');
console.log('ADJ =',JSON.stringify(ADJ));
console.log('schnauzer',OLD[BR.findIndex(b=>b.id==='schnauzer')],'->',ADJ[BR.findIndex(b=>b.id==='schnauzer')]);
