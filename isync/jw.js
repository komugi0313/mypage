/* アイ・シンク：究極の二択（nitaku/index.html のいちばん下）と同じしくみ。
   日本語を言葉のまとまり（文節）で区切り、1〜2文字だけの行や言葉の途中の改行を作らない（iPhone の Safari・Android の Chrome とも） */
/* 文節で改行する（「い／まだに」のような途中の改行・1〜2文字だけの行を作らない。iPhoneでも同じ） */
(function(){
  if(!(window.Intl&&Intl.Segmenter)) return;
  var seg=new Intl.Segmenter('ja',{granularity:'word'});
  document.documentElement.classList.add('jw');
  var HIRA=/^[ぁ-ゟー]+$/, PUN=/^[、。！？!?…・）」』】〕）\)\s～〜ー]+$/, OPEN=/[（「『【〔\(]$/, END=/[、。！？!?…）」』】〕\)]$/;
  var PART=/^(を|が|に|で|と|は|も|へ|の|から|まで|より|って|や|か|ね|よ|な)$/;
  var JP=/[぀-ヿ一-鿿]/;
  function len(t){ return t.replace(/[、。！？!?…・（）「」『』\s]/g,'').length; }
  function phrases(t){
    var out=[],cur='',prev='';
    var it=seg.segment(t)[Symbol.iterator](),r;
    while(!(r=it.next()).done){
      var w=r.value.segment;
      if(cur===''){ cur=w; prev=w; continue; }
      var brk=false;
      if(PUN.test(w)) brk=false;
      else if(END.test(cur)) brk=true;
      else if(OPEN.test(w)) brk=true;
      else if(OPEN.test(cur)) brk=false;
      else if(HIRA.test(w)) brk=(PART.test(prev)&&len(cur)>=3&&w.length>=2&&!PART.test(w));
      else brk=HIRA.test(prev);
      if(brk){ out.push(cur); cur=w; } else cur+=w;
      prev=w;
    }
    if(cur) out.push(cur);
    // 「でも」「けど」のような短いつなぎの言葉は、次の言葉と同じ行へ
    for(var i=out.length-2;i>=0;i--){ if(HIRA.test(out[i])&&out[i].length<=3){ out[i]+=out[i+1]; out.splice(i+1,1); } }
    // 最後の行が1〜2文字だけにならないよう、短い最後のまとまりは前とくっつける
    while(out.length>1&&len(out[out.length-1])<=2){ var l=out.pop(); out[out.length-1]+=l; }
    // 最初の1〜2文字だけのまとまりも次とくっつける
    if(out.length>1&&len(out[0])<=1){ out[1]=out[0]+out[1]; out.shift(); }
    return out;
  }
  var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,OPTION:1,TITLE:1,NOSCRIPT:1};
  function run(root){
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),ns=[],n;
    while((n=w.nextNode())){ var pe=n.parentNode; if(!pe||SKIP[pe.nodeName]||pe.isContentEditable) continue; if(pe.nodeName==='J-P') continue; if(n.nodeValue.length>=5&&JP.test(n.nodeValue)) ns.push(n); }
    ns.forEach(function(n){
      var ps=phrases(n.nodeValue); if(ps.length<2) return;
      var f=document.createDocumentFragment();
      ps.forEach(function(p,i){ if(i) f.appendChild(document.createElement('wbr')); var s=document.createElement('j-p'); if(len(p)<=12) s.style.whiteSpace='nowrap'; s.textContent=p; f.appendChild(s); });
      // 親が横・縦に並べる箱（flex・grid）だと、部品が1つずつ別の段に並んでしまうので、ひとまとめにして入れる
      var pd=getComputedStyle(n.parentNode).display;
      if(/flex|grid/.test(pd)){ var box=document.createElement('span'); box.appendChild(f); n.parentNode.replaceChild(box,n); }
      else n.parentNode.replaceChild(f,n);
    });
  }
  window.jwRun=run;
  function start(){ run(document.body); var t=null,q=[]; new MutationObserver(function(rs){ rs.forEach(function(r){ [].forEach.call(r.addedNodes,function(x){ if(x.nodeType===3){ if(x.parentNode&&x.parentNode.nodeName!=='J-P') q.push(x.parentNode); } else if(x.nodeType===1&&x.nodeName!=='J-P') q.push(x); }); if(r.type==='characterData'&&r.target.parentNode&&r.target.parentNode.nodeName!=='J-P') q.push(r.target.parentNode); }); if(!t) t=setTimeout(function(){ t=null; var a=q; q=[]; a.forEach(function(e){ if(e.isConnected) run(e); }); },0); }).observe(document.body,{childList:true,subtree:true,characterData:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
