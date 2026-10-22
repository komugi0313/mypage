window.IDEAS=(()=>{
const SANS='"IBM Plex Sans JP","Hiragino Sans","Noto Sans JP",sans-serif',MONO='"IBM Plex Mono",ui-monospace,monospace';
const GC={NT:"#7A5EA8",NF:"#3F9A72",SJ:"#3E7FA6",SP:"#C29A3A"},grp=t=>t[1]==="N"?"N"+t[2]:"S"+t[3];
const tint=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;};
function setup(H){const W=1080,cv=document.createElement("canvas");cv.width=W;cv.height=H||1350;const c=cv.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,W,cv.height);c.textBaseline="alphabetic";return [cv,c,W,cv.height];}
function cols(b,n){const cb=GC[grp(b)],cn=b===n?cb:(grp(b)===grp(n)?"#1F2733":GC[grp(n)]);return [cb,cn];}
function footer(c,W,H){c.textAlign="center";c.font="600 28px "+MONO;c.fillStyle="#1F2733";c.fillText("16typeplus.jp/",W/2,H-40);c.textAlign="left";}
function fit(c,t,w,fs,wt){c.font=(wt||700)+" "+fs+"px "+SANS;while(c.measureText(t).width>w&&fs>14){fs-=1;c.font=(wt||700)+" "+fs+"px "+SANS;}return fs;}
const L=(t)=>CW[t]||{sweet:[],love:[],mild:[],spicy:[]};
const AXL=["EI","SN","TF","JP"];
/* 案1 ベン図 */
function venn(b,n){const [cv,c,W,H]=setup();const [cb,cn]=cols(b,n),one=b===n;
 c.textAlign="center";c.font="500 26px "+SANS;c.fillStyle="#5E6A7A";c.fillText(one?"気質も性格も同じ。2つの円がひとつに重なる人":"あなたは、2つの性質が重なってできている",W/2,90);
 c.font="700 46px "+SANS;c.fillStyle="#1F2733";c.fillText(one?b:b+"  ＋  "+n,W/2,150);
 const cy=700,R=one?400:330,dx=one?0:210;
 const draw=(x,col)=>{c.beginPath();c.arc(x,cy,R,0,Math.PI*2);c.fillStyle=tint(col,.10);c.fill();c.lineWidth=4;c.strokeStyle=tint(col,.7);c.stroke();};
 draw(W/2-dx,cb);if(!one)draw(W/2+dx,cn);
 const shared=AXL.map((k,i)=>b[i]===n[i]?HN.letter[b[i]]:null).filter(Boolean);
 const put=(arr,x,y0,w,col,fs0)=>{let y=y0;arr.forEach((t,i)=>{const fs=fit(c,t,w,fs0-(i>1?4:0));c.fillStyle=col;c.fillText(t,x,y);y+=fs*1.55;});};
 if(one){c.font="700 30px "+SANS;c.fillStyle=cb;c.fillText("気質 ＝ 性格",W/2,cy-300);
  put([...L(b).sweet.slice(0,4),...L(b).love.slice(0,3),...L(b).mild.slice(0,2),...L(b).spicy.slice(0,2)],W/2,cy-230,560,cb,40);}
 else{c.font="700 30px "+SANS;c.fillStyle=cb;c.fillText("気質（生まれ持った）",W/2-dx-90,cy-R-20);c.fillStyle=cn;c.fillText("性格（経験で育った）",W/2+dx+90,cy-R-20);
  const lw=[...L(b).sweet.slice(0,3),...L(b).love.slice(0,2),...L(b).spicy.slice(0,2)],rw=[...L(n).sweet.slice(0,3),...L(n).love.slice(0,2),...L(n).spicy.slice(0,2)];
  put(lw,W/2-dx-120,cy-200,250,cb,34);put(rw,W/2+dx+120,cy-200,250,cn,34);
  c.font="700 24px "+SANS;c.fillStyle="#C2553F";c.fillText("あなたの芯",W/2,cy-110);put(shared,W/2,cy-50,170,"#1F2733",24);}
 footer(c,W,H);return cv;}
/* 案2 カルテ */
function karte(b,n){const [cv,c,W]=setup(1500);const H=1500;const [cb,cn]=cols(b,n),K=KT[b+">"+n]||{},gk=AXL.map((k,i)=>b[i]!==n[i]?b[i]+n[i]:null).filter(Boolean),G=gk.length?HN.gap[gk[0]]:HN.same;
 c.fillStyle="#C2553F";c.fillRect(0,0,W,14);c.font="700 50px "+SANS;c.fillStyle="#1F2733";c.fillText("性格カルテ",60,100);c.font="600 24px "+MONO;c.fillStyle="#5E6A7A";c.fillText("16TYPE+  No."+b+"-"+n,60,140);
 const box=(x,y,w,h)=>{c.strokeStyle="#C9CFD8";c.lineWidth=2;c.strokeRect(x,y,w,h);};
 let y=180;box(60,y,W-120,110);c.font="500 22px "+SANS;c.fillStyle="#5E6A7A";c.fillText("気質（生まれ持った）",90,y+40);c.fillText("性格（経験で育った）",560,y+40);
 c.font="700 40px "+MONO;c.fillStyle=cb;c.fillText(b,90,y+92);c.fillStyle=cn;c.fillText(n,560,y+92);y+=140;
 const sec=(t,items,col,check)=>{c.font="700 26px "+SANS;c.fillStyle="#C2553F";c.fillText("■ "+t,60,y);y+=20;const h=items.length*48+24;box(60,y,W-120,h);items.forEach((s,i)=>{const yy=y+46+i*48;if(check){c.strokeStyle=col;c.lineWidth=3;c.strokeRect(86,yy-24,24,24);c.beginPath();c.moveTo(90,yy-12);c.lineTo(97,yy-4);c.lineTo(107,yy-20);c.stroke();}fit(c,s,W-220,26,500);c.fillStyle="#1F2733";c.fillText(s,check?126:90,yy);});y+=h+40;};
 sec("所見",[L(b).sweet[0],L(n).sweet[0],L(b).love[0],L(n).love[1]],"#3F9A72",true);
 sec("よく見られる様子",[L(b).mild[0],L(n).mild[0],L(n).spicy[0]],"#3F9A72",true);
 sec("本人の訴え（悩みやすいこと）",[K.worry?K.worry.split("。")[0]+"。":[].concat(G.worry)[0]],"#000",false);
 sec("処方（楽になるヒント）",[(G.key||"").split("。")[0]+"。"],"#000",false);
 c.fillStyle="#FBEDEA";c.fillRect(60,y,W-120,130);c.strokeStyle="#C2553F";c.strokeRect(60,y,W-120,130);c.font="700 22px "+SANS;c.fillStyle="#C2553F";c.fillText("医師のひと言",90,y+40);fit(c,K.karai||"",W-180,30);c.fillStyle="#1F2733";c.fillText(K.karai||"",90,y+92);
 footer(c,W,H);return cv;}
/* 案3 甘口〜辛口メーター */
function meter(b,n){const [cv,c,W,H]=setup();const [cb,cn]=cols(b,n);
 c.textAlign="center";c.font="700 46px "+SANS;c.fillStyle="#1F2733";c.fillText(b+"  ×  "+n,W/2,100);c.font="500 24px "+SANS;c.fillStyle="#5E6A7A";c.fillText("あなたの言葉を、甘い順に並べました",W/2,145);
 const gx0=120,gx1=W-120,gy=210;const g=c.createLinearGradient(gx0,0,gx1,0);g.addColorStop(0,"#F6C7D2");g.addColorStop(.5,"#F3E2B6");g.addColorStop(1,"#C2553F");c.fillStyle=g;c.beginPath();c.roundRect(gx0,gy,gx1-gx0,22,11);c.fill();
 c.font="700 26px "+SANS;c.textAlign="left";c.fillStyle="#C9607A";c.fillText("甘口",gx0,gy+64);c.textAlign="right";c.fillStyle="#C2553F";c.fillText("辛口 🌶",gx1,gy+64);
 const cats=[["sweet",4],["love",4],["mild",3],["spicy",4]],cw=(W-120)/4;
 const lane=(t,col,y0,label)=>{c.textAlign="left";c.font="700 28px "+SANS;c.fillStyle=col;c.fillText(label,60,y0-20);
  cats.forEach(([k,m],ci)=>{L(t)[k].slice(0,m).forEach((s,i)=>{const x=60+ci*cw+cw/2,y=y0+20+i*72;c.textAlign="center";const lines=s.length>7?[s.slice(0,Math.ceil(s.length/2)),s.slice(Math.ceil(s.length/2))]:[s];c.fillStyle=col;lines.forEach((l,j)=>{fit(c,l,cw-20,24);c.fillText(l,x,y+j*28);});});});};
 lane(b,cb,370,"気質（生まれ持った）");c.strokeStyle="#E2E6EC";c.beginPath();c.moveTo(60,700);c.lineTo(W-60,700);c.stroke();lane(n,cn,790,"性格（経験で育った）");
 footer(c,W,H);return cv;}
/* 案4 年輪 */
function rings(b,n){const [cv,c,W,H]=setup();const [cb,cn]=cols(b,n),one=b===n,cx=W/2,cy=690;
 c.textAlign="center";c.font="500 26px "+SANS;c.fillStyle="#5E6A7A";c.fillText(one?"生まれ持った芯が、そのまま育った人":"生まれ持った芯のまわりに、経験が重なって今のあなたがいる",W/2,90);
 [[470,one?cb:cn,.08],[310,one?cb:cn,.05],[205,cb,.12],[100,cb,.18]].forEach(([r,col,a])=>{c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fillStyle=tint(col,a);c.fill();c.strokeStyle=tint(col,.45);c.lineWidth=2;c.stroke();});
 c.font="700 44px "+MONO;c.fillStyle="#1F2733";c.fillText(b,cx,cy+14);c.font="600 20px "+SANS;c.fillStyle=cb;c.fillText("気質",cx,cy-40);
 const around=(arr,r,col,fs,off)=>{arr.forEach((s,i)=>{const a=-Math.PI/2+off+i*2*Math.PI/arr.length,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;const f=fit(c,s,r<200?200:r<300?230:300,fs);c.fillStyle=col;c.fillText(s,x,y+f/3);});};
 around(L(b).sweet.slice(0,2),158,cb,24,0);
 around([L(b).love[0],L(b).mild[0]],248,cb,24,0);
 const outer=one?[L(b).spicy[0],L(b).love[2],L(b).spicy[1],L(b).mild[1],L(b).love[3],L(b).spicy[2]]:[L(n).sweet[0],L(n).love[0],L(n).spicy[0],L(n).sweet[1],L(n).love[1],L(n).spicy[1]];
 around(outer,390,one?cb:cn,28,0);
 c.font="700 26px "+SANS;c.fillStyle=one?cb:cn;c.fillText(one?"気質＝性格 "+n:"性格（経験で育った） "+n,cx,cy+530);
 footer(c,W,H);return cv;}
return {venn,karte,meter,rings};})();
