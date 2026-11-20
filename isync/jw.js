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
  var AFTP=/^(を|が|に|で|と|は|も|へ|の|から|まで|より|って)$/;
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
      else if(HIRA.test(w)) brk=(AFTP.test(prev)&&len(cur)>=3&&w.length>=2&&!PART.test(w));   // や・か・な・よ・ね のあとでは切らない（「見えや／すく」と切れていた。2026-11-20）
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
  // 1つだけのまとまり・12文字より長いまとまりは、言葉の切れ目で3文字以上の小さなまとまりに分ける
  // （前は手つかずで、せまい枠では「ちょっといいお／店へ」「将来・／家族」のように言葉の途中で切れていた。2026-11-20）
  var SMALL=/^[ぁぃぅぇぉっゃゅょゎー]/;
  function sub(p){
    var ws=[],it=seg.segment(p)[Symbol.iterator](),r; while(!(r=it.next()).done) ws.push(r.value.segment);
    var out=[],cur='';
    for(var i=0;i<ws.length;i++){ cur+=ws[i]; var nx=ws[i+1]; if(nx===undefined) break;
      var rest=ws.slice(i+1).join('');
      // 切ってよいのは「助詞のあと（3文字以上の言葉の前）」か「漢字・カタカナの言葉の前」だけ。数字のすぐあと（1｜回）では切らない
      var AFT=/^(を|が|に|で|と|は|も|へ|の|から|まで|より|では|には|とは|だから|ので|のに|けど|ても|でも)$/;   // 「では」「だから」などのあとも切ってよい（「ではあ／りません」と割れていた。2026-11-21）
      var good=((!HIRA.test(nx)&&!/^ー/.test(nx))||AFT.test(ws[i]))&&!(HIRA.test(ws[i])&&ws[i].length===1&&!AFT.test(ws[i]));
      var ok=good&&len(cur)>=3&&len(rest)>=3&&!PUN.test(nx)&&!SMALL.test(nx)&&!OPEN.test(ws[i])&&!/[0-9０-９]$/.test(cur);
      if(ok){ out.push(cur); cur=''; } }
    if(cur) out.push(cur);
    return out;
  }
  var SKIP={SCRIPT:1,STYLE:1,TEXTAREA:1,OPTION:1,TITLE:1,NOSCRIPT:1};
  function run(root){
    var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),ns=[],n;
    while((n=w.nextNode())){ var pe=n.parentNode; if(!pe||SKIP[pe.nodeName]||pe.isContentEditable) continue; if(pe.nodeName==='J-P') continue; if(pe.closest&&pe.closest('[data-nojw]')) continue; if(n.nodeValue.length>=5&&JP.test(n.nodeValue)) ns.push(n); }
    ns.forEach(function(n){
      // 「くん」「ちゃん」「さん」で終わる名前に「さん」を重ねない（けんたろうくんさん → けんたろうくん）
      if(/(くん|ちゃん|さん)さん/.test(n.nodeValue)) n.nodeValue=n.nodeValue.replace(/(くん|ちゃん|さん)さん/g,'$1');
      var ps=phrases(n.nodeValue),xs=[];
      ps.forEach(function(p){ if(ps.length<2&&len(p)<=8) xs.push(p); else if(len(p)>12||(ps.length<2&&len(p)>=9)) sub(p).forEach(function(q){ xs.push(q); }); else xs.push(p); });
      ps=xs;
      if(ps.length<2){ if(!(len(ps[0]||'')<=12&&/^[^\s]+$/.test(ps[0]||''))) return; }
      var f=document.createDocumentFragment();
      ps.forEach(function(p,i){ if(i) f.appendChild(document.createElement('wbr')); var s=document.createElement('j-p'); if(len(p)<=12) s.style.whiteSpace='nowrap'; s.textContent=p; f.appendChild(s); });
      // 親が横・縦に並べる箱（flex・grid）だと、部品が1つずつ別の段に並んでしまうので、ひとまとめにして入れる
      var pd=getComputedStyle(n.parentNode).display;
      if(/flex|grid/.test(pd)){ var box=document.createElement('span'); box.appendChild(f); n.parentNode.replaceChild(box,n); }
      else n.parentNode.replaceChild(f,n);
    });
  }
  // 枠より広い1つのまとまり（せまい枠の「かっこいい・かわいい姿」など）は、枠からはみ出さないよう、言葉の切れ目で分ける（2026-11-21）
  function cw(a){ var cs=getComputedStyle(a); return a.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight); }
  function boxW(e){ var a=e.parentNode; while(a&&a.nodeType===1){ var cs=getComputedStyle(a); if(!/^(inline|contents)$/.test(cs.display)){
      // 横に並ぶ箱（flex）の中の部品は、中身に合わせてのびるので、親の箱の幅からとなりの部品の幅とすき間を引いて測る
      var pa=a.parentNode,ps=pa&&pa.nodeType===1?getComputedStyle(pa):null;
      if(ps&&/flex/.test(ps.display)&&!/column/.test(ps.flexDirection)&&ps.flexWrap==='nowrap'){ var w=cw(pa),n=0; [].forEach.call(pa.children,function(c){ if(c!==a&&getComputedStyle(c).position!=='absolute'){ var r=c.getBoundingClientRect(); if(r.width){ w-=r.width; n++; } } }); w-=n*(parseFloat(ps.columnGap)||0); return Math.min(cw(a),w-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-parseFloat(cs.marginLeft||0)-parseFloat(cs.marginRight||0)); }
      return cw(a); } a=a.parentNode; } return 0; }
  function fit(root){
    var js=(root||document.body).querySelectorAll('j-p'); var big=[],ch=0;
    for(var i=0;i<js.length;i++){ var j=js[i]; if(j.style.whiteSpace!=='nowrap'||j.dataset.fit) continue; var w=j.getBoundingClientRect().width; if(!w) continue; var bw=boxW(j); if(bw>0&&w>bw+1) big.push(j); }
    big.forEach(function(j){ var t=j.textContent,pc=t.replace(/・/g,'・\u0001').split('\u0001').filter(Boolean),xs=[]; pc.forEach(function(q){ sub(q).forEach(function(r){ xs.push(r); }); });
      if(xs.length<2){ j.dataset.fit=1; return; } ch++;
      var f=document.createDocumentFragment(); xs.forEach(function(q,i){ if(i) f.appendChild(document.createElement('wbr')); var s=document.createElement('j-p'); s.style.whiteSpace='nowrap'; s.textContent=q; f.appendChild(s); });
      j.parentNode.replaceChild(f,j); });
    if(ch) fit(root);
  }
  var fq=null; function fitSoon(){ if(fq) return; fq=requestAnimationFrame(function(){ fq=null; fit(document.body); }); }
  window.addEventListener('resize',fitSoon);
  window.jwRun=run;
  function start(){ run(document.body); fitSoon(); var t=null,q=[]; new MutationObserver(function(rs){ rs.forEach(function(r){ [].forEach.call(r.addedNodes,function(x){ if(x.nodeType===3){ if(x.parentNode&&x.parentNode.nodeName!=='J-P') q.push(x.parentNode); } else if(x.nodeType===1&&x.nodeName!=='J-P'&&x.nodeName!=='WBR') q.push(x); }); if(r.type==='characterData'&&r.target.parentNode&&r.target.parentNode.nodeName!=='J-P') q.push(r.target.parentNode); }); if(!t) t=setTimeout(function(){ t=null; var a=q; q=[]; a.forEach(function(e){ if(e.isConnected) run(e); }); fitSoon(); },0); }).observe(document.body,{childList:true,subtree:true,characterData:true}); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
