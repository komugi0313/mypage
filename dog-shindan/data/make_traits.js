const fs=require('fs');const s=fs.readFileSync('/home/user/mypage/dog-shindan/index.html','utf8');eval(s.slice(s.indexOf('var BR=['),s.indexOf('var GROUPS')).replace('var BR','global.BR'));BR.forEach(b=>b.s=b.s||b.n);
const A=JSON.parse(fs.readFileSync('/home/user/mypage/dog-shindan/data/akc_traits.json')).breeds;
const k=id=>A[id].traits, z=a=>{const m=a.reduce((p,q)=>p+q)/a.length,sd=Math.sqrt(a.reduce((p,q)=>p+(q-m)**2,0)/a.length)||1;return a.map(x=>(x-m)/sd)};
const cur=[0,1,2,3,4,5].map(a=>BR.map(b=>b.v[a]));const sdc=cur.map(c=>{const z0=c.reduce((p,q)=>p+q)/c.length;return Math.sqrt(c.reduce((p,q)=>p+(q-z0)**2,0)/c.length)});
const SD=13;
const src=[['strangers'],['otherDogs'],['mental','playfulness'],['energy','playfulness'],['affectionate'],['adaptability']];
const ax=[];
for(let a=0;a<6;a++){const zc=z(cur[a]),za=z(BR.map(b=>src[a].reduce((p,t)=>p+k(b.id)[t],0)));ax.push(zc.map((v,i)=>0.6*v+0.4*za[i]))}
const zp=z(BR.map(b=>k(b.id).protective)),zs=z(BR.map(b=>k(b.id).strangers)),zt=z(BR.map(b=>k(b.id).trainability)),zm=z(BR.map(b=>k(b.id).mental)),zbk=z(BR.map(b=>k(b.id).barking)),zc3=z(cur[3]),zc0=z(cur[0]);
ax.push(zp.map((v,i)=>v-0.25*zc0[i]));          // 守る（知らない人に慎重な子ほど少し上）
ax.push(zt.map((v,i)=>v+0.25*zm[i]));            // 覚える
ax.push(zbk.map((v,i)=>v+0.2*zc3[i]));           // おしゃべり
const V=BR.map((b,i)=>ax.map(a=>Math.round(Math.max(5,Math.min(95,50+SD*z(a)[i])))));
fs.writeFileSync('/tmp/claude-0/-home-user-mypage/878a21f3-bc59-55cd-974f-96e390741dc6/scratchpad/qa/newv.json',JSON.stringify(Object.fromEntries(BR.map((b,i)=>[b.id,V[i]]))));
const NAMES=[['だれとでも仲よし','家族に一途'],['ワン友づくり上手','人が大好き'],['好奇心いっぱい','おうち大好き'],['元気いっぱい','おっとり癒やし系'],['甘えんぼ','自立したマイペース'],['どっしり大物','気づき名人'],['家族を守る','だれにでもウェルカム'],['覚えるのが得意','自由な発想'],['おしゃべり','もの静か']];
// 順位（同点は同順位）
const best={};const no1={};
for(let a=0;a<9;a++)for(const side of [0,1]){const vals=BR.map((b,i)=>V[i][a]);BR.forEach((b,i)=>{const v=vals[i];const r=1+vals.filter(x=>side?x<v:x>v).length;if(!best[b.id]||r<best[b.id][0])best[b.id]=[r,NAMES[a][side]];if(r===1)(no1[NAMES[a][side]]=no1[NAMES[a][side]]||[]).push(b.s)})}
const dist={};Object.values(best).forEach(([r])=>dist[r]=(dist[r]||0)+1);console.log('最高順位の分布',dist);
console.log(Object.entries(best).filter(([id,[r]])=>r>3).map(([id,x])=>BR.find(b=>b.id===id).s+':'+x.join('')).join(' '));
console.log(no1);
// 大きさのグループの中での順位
const G={s:'小型犬',m:'中型犬',l:'大型犬'};const bestG={};
for(let a=0;a<9;a++)for(const side of [0,1]){BR.forEach((b,i)=>{const grp=BR.map((x,j)=>[x,V[j][a]]).filter(([x])=>x.g===b.g);const v=V[i][a];const r=1+grp.filter(([,x])=>side?x<v:x>v).length;
 const cand=[r,G[b.g]+'でいちばん'+NAMES[a][side]];if(!bestG[b.id]||r<bestG[b.id][0])bestG[b.id]=cand})}
const d2={};Object.values(bestG).forEach(([r])=>d2[r]=(d2[r]||0)+1);console.log('グループ内',d2,BR.reduce((m,b)=>(m[b.g]=(m[b.g]||0)+1,m),{}));
console.log(Object.entries(bestG).filter(([id,[r]])=>r>1).map(([id,x])=>BR.find(b=>b.id===id).s+':'+x.join('')).join(' '));
const OUT=BR.map((b,i)=>{const o=best[b.id],g=bestG[b.id];let title;
 if(o[0]===1)title=['44犬種でいちばん「'+o[1]+'」','No.1'];else if(g[0]===1)title=[g[1].replace('でいちばん','でいちばん「')+'」','No.1'];else if(o[0]<=3)title=['「'+o[1]+'」44犬種で'+o[0]+'位',o[0]+'位'];else title=[g[1].replace('でいちばん','で「')+'」'+g[0]+'位',g[0]+'位'];
 return {id:b.id,s:b.s,g:b.g,old:b.v,v:V[i],title:title[0],rank:title[1]}});
fs.writeFileSync('qa/newout.json',JSON.stringify({names:NAMES,no1,breeds:OUT}));
