/* 文字の見えやすさの安全装置（tools/add_contrast_guard.py が3サイトの全ページに埋め込む。直すときはこのファイルを直して再実行）
   文字の色と、その後ろの背景の色を比べて、読みにくい組み合わせ（薄い背景に薄い文字／濃い背景に濃い文字）を見つけたら、
   その文字だけ色を自動で調整する（明るい背景→同じ色みのまま濃く、暗い背景→白く）。計算・鑑定の中身には一切さわらない。
   目安：ふつうの文字はコントラスト比4.5以上、大きい文字（18.66px以上、または14px以上の太字）は3以上（WCAG AA）。 */
(function(){
  if(window.__pkContrast) return; window.__pkContrast=true;
  function P(c){ var m=c&&c.match(/[\d.]+/g); return m?[+m[0],+m[1],+m[2],m.length>3?+m[3]:1]:null; }
  function L(c){ function f(v){ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); } return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]); }
  function CR(a,b){ var x=L(a),y=L(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); }
  function mix(a,b,t){ return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }
  function over(f,b){ var a=f[3]==null?1:f[3]; return [f[0]*a+b[0]*(1-a),f[1]*a+b[1]*(1-a),f[2]*a+b[2]*(1-a)]; }
  // 文字の後ろの背景：背景色のある祖先を上へたどる。グラデーションは色の幅を見る。写真などの画像背景は判定しない
  var BG=null, OP=null;   // 1回の点検の中だけ使う覚え書き（同じ祖先を何度も調べない）
  function bgOf(n){
    if(!n||n.nodeType!==1) return {lo:1,hi:1,rgb:[255,255,255]};
    if(BG&&BG.has(n)) return BG.get(n);
    var cs=getComputedStyle(n), bi=cs.backgroundImage, r;
    // 飾りの層（::before／::after に背景がある）が文字の後ろにあるときは、正しく判定できないので触らない
    var deco=false; ['::before','::after'].forEach(function(ps){ try{ var pc=getComputedStyle(n,ps); if(pc.content&&pc.content!=='none'&&(pc.position==='absolute'||pc.position==='fixed')){ var pb=P(pc.backgroundColor); if((pb&&pb[3]>0.3)||(pc.backgroundImage&&pc.backgroundImage!=='none')) deco=true; } }catch(_e){} });
    if(deco||(bi&&bi!=='none'&&/url\(/.test(bi))) r=null;
    else{
      var parent=bgOf(n.parentElement);
      if(parent===null) r=null;
      else{
        var bc=P(cs.backgroundColor), base=parent.rgb;
        if(bc&&bc[3]>0) base=over(bc,base);
        var cols=(bi&&bi!=='none')?(bi.match(/rgba?\([^)]*\)/g)||[]).map(P).filter(Boolean):[];
        if(cols.length){ var lo=1,hi=0,acc=[0,0,0]; cols.forEach(function(c){ var m=over(c,base), l=L(m); if(l<lo)lo=l; if(l>hi)hi=l; acc[0]+=m[0];acc[1]+=m[1];acc[2]+=m[2]; });
          r={lo:lo,hi:hi,rgb:[acc[0]/cols.length,acc[1]/cols.length,acc[2]/cols.length]}; }
        else if(bc&&bc[3]>0){ var l2=L(base); r={lo:l2,hi:l2,rgb:base}; }
        else r=parent;
      }
    }
    if(BG) BG.set(n,r); return r;
  }
  function opac(n){ if(!n||n.nodeType!==1) return 1; if(OP&&OP.has(n)) return OP.get(n); var o=(+getComputedStyle(n).opacity)*opac(n.parentElement); if(OP) OP.set(n,o); return o; }
  function fix(e){
    var own=''; for(var c=e.firstChild;c;c=c.nextSibling) if(c.nodeType===3) own+=c.nodeValue; if(!own.trim()) return;
    var cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden') return;
    var fill=cs.webkitTextFillColor; if(fill&&/rgba\(0, 0, 0, 0\)|transparent/.test(fill)) return;   // 文字そのものがグラデーションのもの
    var fg=P(cs.color); if(!fg) return;
    var bg=bgOf(e); if(!bg) return;
    if(bg.hi-bg.lo>0.35) return;                       // 明暗が大きく混ざった背景は判定しない
    var fs=parseFloat(cs.fontSize)||14, bold=(+cs.fontWeight||400)>=700;
    var need=(fs>=18.66||(fs>=14&&bold))?3:4.5;
    var a=(fg[3]==null?1:fg[3])*opac(e);
    var base=bg.rgb, seen=over([fg[0],fg[1],fg[2],a],base);
    if(CR(seen,base)>=need) return;
    var light=((bg.lo+bg.hi)/2)>0.4, to=light?[0,0,0]:[255,255,255], c2=null;
    for(var t=0.1;t<=1.0001;t+=0.1){ var cand=mix([fg[0],fg[1],fg[2]],to,t); if(CR(over([cand[0],cand[1],cand[2],a],base),base)>=need){ c2=cand; break; } }
    if(!c2){ c2=to; if(a<1) e.style.setProperty('opacity','1','important'); }
    e.style.setProperty('color','rgb('+Math.round(c2[0])+','+Math.round(c2[1])+','+Math.round(c2[2])+')','important');
  }
  var SKIP='script,style,noscript,svg,canvas,video,option,select,textarea,input,img,.yomi,.ysr,[aria-hidden="true"]';
  function pass(root){ if(!root||root.nodeType!==1) return; BG=new Map(); OP=new Map(); var list=[root].concat([].slice.call(root.querySelectorAll('*')));
    for(var i=0;i<list.length;i++){ var e=list[i]; if(e.matches&&e.matches(SKIP)) continue; try{ fix(e); }catch(_e){} } BG=null; OP=null; }
  var tm=null; function full(){ clearTimeout(tm); tm=setTimeout(function(){ pass(document.body); },350); }
  function start(){
    pass(document.body); setTimeout(function(){ pass(document.body); },1500);
    document.addEventListener('click',full,true); document.addEventListener('toggle',full,true); window.addEventListener('resize',full);
    if(window.MutationObserver){ var q=[],qt=null; new MutationObserver(function(rs){ rs.forEach(function(r){ if(r.type==='childList'){ [].forEach.call(r.addedNodes,function(n){ if(n.nodeType===1) q.push(n); else if(n.parentElement) q.push(n.parentElement); }); } else if(r.target&&r.target.nodeType===1){ q.push(r.target); } });
      if(!qt) qt=setTimeout(function(){ var w=q; q=[]; qt=null; w.forEach(function(n){ if(n.isConnected) pass(n); }); },200); })
      .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','open']}); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
