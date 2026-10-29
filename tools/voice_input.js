/* 声で入力（🎤）と「✕ 全部消す」＝3サイト共通（PRO・ビギナー・易 EKI Pro）。発注者決定 2026-10-18（2026-10-17 に PRO で試験導入→3サイト共通に）。
   ・ブラウザに入っている音声認識（Web Speech API）を使う＝声の聞き取りは費用0円（声はサーバーに送らない）。
   ・そのあと「占いの言葉の自動直し」（下の smartFix。音声入力オプション月1,000円・おためし10回）で、文字だけをサーバーに送り、
     句読点・改行・言いよどみを整え、占いの言葉を正しい字に直す（2026-10-27 鑑定者本人の指示で整えも追加。1回 約0.1円。サーバーは functions/voice-fix.js＝元は tools/voice_fix_server.js）。
   ・話した言葉は欄に文字で入るだけ（自動では送らない）。送る前に欄の中で直せる。
   ・聞き間違い直し表（下の FIX）：占いの言葉の聞き間違いを、文字になったあとで自動で直す。
     ふだんの言葉（変更・本家・空母・帝王・署名式 など）まで変えてしまわないよう、「占いでしか使わない言葉」だけを入れる。
     3つ目に字を書くと、その字が直前にあるときは直さない（例 ['体運','大運','全身肉']＝全体運・身体運…は直さない）。
     言葉を足すときは FIX に ['聞き間違い','正しい言葉'] を1行足し、python3 tools/add_voice_input.py → 生成スクリプトの順に回す。
     ひらがなで書いた行は、カタカナの書き方も自動で直す。直したことは画面に出さない（黙って直す。うまく入ったときは一言も出さない。発注者指示 2026-10-18）。
     おためし中だけ、自動直しのあとに「✨ 読みやすく整えました」を出す（回数は画面に出さない＝鑑定者本人の指示 2026-10-27。オプションの方には何も出さない）。
   ・このファイルは tools/add_voice_input.py が PRO と易の画面に埋め込む（ビギナーは PRO から生成）。
     直すときはこのファイルを直して再実行する（埋め込まれた側を直接直さない）。 */
(function(){
  if(window.__pkVmic) return; window.__pkVmic=true;
  var CFG=window.__VMIC_CFG||{}; var SEL=CFG.sel||'textarea';
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;

  /* ===== 聞き間違い直し表 ===== */
  var FIX=[
    // 四柱推命
    ['しちゅうすいめい','四柱推命'],['支柱推命','四柱推命'],['四柱推名','四柱推命'],['4柱推命','四柱推命'],['四中推命','四柱推命'],
    ['めいしき','命式'],
    ['たいうん','大運'],['だいうん','大運'],['体運','大運','全身肉'],['大雲','大運'],
    ['りつうん','立運'],['立雲','立運'],
    ['ねんうん','年運'],['年雲','年運'],['げつうん','月運'],['にちうん','日運'],
    ['つうへんせい','通変星'],['通変性','通変星'],['通辺星','通変星'],['通変製','通変星'],
    ['じゅうにうんせい','十二運星'],['12運星','十二運星'],['じゅうにうん','十二運'],['12運','十二運'],['十二雲','十二運'],
    ['くうぼう','空亡'],['てんちゅうさつ','天中殺'],['てんちゅう殺','天中殺'],
    ['にっしゅ','日主'],['みきょう','身強'],['みじゃく','身弱'],
    ['へんざい','偏財'],['せいざい','正財'],['ごうざい','劫財'],['ひけん','比肩'],['日県','比肩'],['比県','比肩'],['非件','比肩'],['秘剣','比肩'],['しょくじん','食神'],['へんいん','偏印'],['いんじゅ','印綬'],
    ['かいきょく','会局'],['りっちん','律音'],['せつぼくうん','節木運'],
    // 易
    ['えききょう','易経'],['駅経','易経'],['益経','易経'],['えきけい','易経']
  ];
  // 易の64卦の名前（読み仮名→漢字。短くてふだんの言葉と同じになる読みは除く）
  'けんいてん:乾為天,こんいち:坤為地,すいらいちゅん:水雷屯,さんすいもう:山水蒙,すいてんじゅ:水天需,てんすいしょう:天水訟,ちすいし:地水師,すいちひ:水地比,ふうてんしょうちく:風天小畜,てんたくり:天沢履,ちてんたい:地天泰,てんちひ:天地否,てんかどうじん:天火同人,かてんたいゆう:火天大有,ちざんけん:地山謙,らいちよ:雷地豫,たくらいずい:沢雷随,さんぷうこ:山風蠱,ちたくりん:地沢臨,ふうちかん:風地観,からいぜいこう:火雷噬嗑,さんかひ:山火賁,さんちはく:山地剥,ちらいふく:地雷復,てんらいむぼう:天雷无妄,さんてんたいちく:山天大畜,さんらいい:山雷頤,たくふうたいか:沢風大過,かんいすい:坎為水,たくざんかん:沢山咸,らいふうこう:雷風恒,てんざんとん:天山遯,らいてんたいそう:雷天大壮,かちしん:火地晋,ちかめいい:地火明夷,ふうかかじん:風火家人,かたくけい:火沢睽,すいざんけん:水山蹇,らいすいかい:雷水解,さんたくそん:山沢損,ふうらいえき:風雷益,たくてんかい:沢天夬,てんぷうこう:天風姤,たくちすい:沢地萃,ちふうしょう:地風升,たくすいこん:沢水困,すいふうせい:水風井,たくかかく:沢火革,かふうてい:火風鼎,しんいらい:震為雷,ごんいざん:艮為山,ふうざんぜん:風山漸,らいたくきまい:雷沢帰妹,らいかほう:雷火豊,かざんりょ:火山旅,そんいふう:巽為風,だいたく:兌為沢,ふうすいかん:風水渙,すいたくせつ:水沢節,ふうたくちゅうふ:風沢中孚,らいざんしょうか:雷山小過,すいかきせい:水火既済,かすいびせい:火水未済'.split(',').forEach(function(p){ var a=p.split(':'); if(a[0]&&a[1]) FIX.push([a[0],a[1]]); });
  // 直し方：ひらがな・カタカナの言葉は、前後が同じ種類の文字でないときだけ直す（「だいたいうんざり」の中の「たいうん」は直さない）。
  //   ひらがなの前後は、助詞（は・が・の など）なら続いていてもよい。漢字の言葉は、3つ目に書いた字が直前にあるときは直さない（全体運→直さない）。
  function kata(s){ return s.replace(/[\u3041-\u3096]/g,function(c){ return String.fromCharCode(c.charCodeAt(0)+0x60); }); }
  var HIRA='\\u3041-\\u309F', KATA='\\u30A0-\\u30FF';
  var PART='(?:は|が|の|を|に|で|と|も|へ|や|って|から|まで|より|です|でした|だ|について)';
  function esc(x){ return x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  (function(){ var add=[]; FIX.forEach(function(f){ if(/^[\u3041-\u309F]+$/.test(f[0])) add.push([kata(f[0]),f[1]]); }); FIX=FIX.concat(add);
    FIX.sort(function(a,b){ return b[0].length-a[0].length; });
    FIX.forEach(function(f){ var k=esc(f[0]);
      if(/^[\u3041-\u309F]+$/.test(f[0])) f.re=new RegExp('(^|[^'+HIRA+']|[のはがをにでともへや])'+k+'(?=$|[^'+HIRA+']|'+PART+')','g');
      else if(/^[\u30A0-\u30FF]+$/.test(f[0])) f.re=new RegExp('(^|[^'+KATA+'])'+k+'(?=$|[^'+KATA+'])','g');
      else if(f[2]) f.re=new RegExp('(^|[^'+esc(f[2])+'])'+k,'g');
      else f.re=new RegExp('()'+k,'g'); }); })();
  function fixText(t,log){
    t=String(t||''); if(!t) return t;
    var hit=false;   // 直した場所を印にして、二重に直さない
    FIX.forEach(function(f,i){ f.re.lastIndex=0; if(!f.re.test(t)) return; f.re.lastIndex=0; hit=true; t=t.replace(f.re,function(_,pre){ return pre+'\u0000'+i+'\u0001'; }); });
    if(!hit) return t;
    return t.replace(/\u0000(\d+)\u0001/g,function(_,i){ var f=FIX[+i]; if(log&&log.indexOf(f[0]+'→'+f[1])<0) log.push(f[0]+'→'+f[1]); return f[1]; });
  }
  window.__pkVoiceFix=fixText;   // 点検用

  /* ===== 占いの言葉の自動直し（音声入力オプション・鑑定者本人の決定 2026-10-27）=====
     ・声で入力した文字（オプションの方はキーボードで打った文字も）を、サーバー（functions/voice-fix.js）で
       占いの言葉だけ正しい字に直す。声はサーバーに送らない（ブラウザの聞き取りで文字になったものだけを送る）。
     ・オプション（月1,000円）でない方は、おためし10回まで（回数はサーバーが会員ごとに数える）。使い切ったら案内を1回出し、
       そのあとも声の入力は無料のまま（聞き間違い直し表だけで直す）。おためし終了の案内は1回だけ。
       そのあと無料の声の入力を20回使った方にだけ、もう1回だけ案内する（全部で2回まで。鑑定者本人の指示 2026-10-27「何回も出すとうるさい」）。
     ・はじめて🎤を押したときに、たくさん話してほしいこと・おためしのことを1回だけ案内する。
     ・サーバーにつながらないとき（通信なし・確認環境）は、何も出さずに今までどおり。 */
  var FN=CFG.fn||'/.netlify/functions/voice-fix', OPT=CFG.opt||'';
  var W=CFG.w||'占いの言葉（星の名前など）', WS=CFG.ws||'占いの言葉';
  var EX=CFG.ex||'';   // はじめの案内に出す例（PRO＝月支元命・魁罡／ビギナー＝専門用語を出さない決まりなので甲子（甲子園）／易＝卦の名前。鑑定者本人の指示 2026-10-27）   // 易は「易の言葉（卦の名前など）」（鑑定者本人の指示 2026-10-27）
  var VS={option:null,left:null,trial:10,off:false};
  try{ var _v=JSON.parse(sessionStorage.getItem('pk_vfx')||'null'); if(_v) VS=Object.assign(VS,_v); }catch(_){}
  function vsSave(){ try{ sessionStorage.setItem('pk_vfx',JSON.stringify({option:VS.option,left:VS.left,trial:VS.trial})); }catch(_){} }
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(_){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(_){} }
  function devId(){ var d=lsGet('pk_vdev'); if(!d){ d='v'+Math.random().toString(36).slice(2)+Date.now().toString(36); lsSet('pk_vdev',d); } return d; }
  function vfxCall(body,done){
    if(VS.off||!window.fetch||location.protocol==='file:'){ done(null); return; }
    var h={'Content-Type':'application/json','x-pk-device':devId()};
    try{ var tk=localStorage.getItem('member_token')||sessionStorage.getItem('member_token'); if(tk) h['Authorization']='Bearer '+tk; }catch(_){}
    var ctl=window.AbortController?new AbortController():null, tm=setTimeout(function(){ try{ ctl&&ctl.abort(); }catch(_){} },20000);   // 長く話したときも直しが間に合うように（9秒→20秒）
    fetch(FN,{method:'POST',headers:h,body:JSON.stringify(body),signal:ctl?ctl.signal:undefined}).then(function(r){
      clearTimeout(tm);
      if(r.status===404||r.status===405){ VS.off=true; done(null); return; }
      return r.json().catch(function(){ return null; }).then(function(j){
        if(j&&typeof j.option==='boolean'){ VS.option=j.option; VS.left=(typeof j.left==='number')?j.left:null; if(typeof j.trial==='number') VS.trial=j.trial; vsSave(); }
        if(r.status===402){ VS.option=false; VS.left=0; vsSave(); done(null,'end'); return; }
        done(r.ok&&j?j:null);
      });
    }).catch(function(){ clearTimeout(tm); done(null); });
  }
  window.__pkVfx={st:VS,intro:introPop,end:endPop,free:function(){ freeUse(); }};   // 点検用
  // ページを開いたら1回、サーバーに今の状態（オプションの有無・残り）を聞く（同じタブでオプションを申し込んだ直後も正しく使えるように）
  try{ setTimeout(function(){ if(!VS.asked&&VS.option!==true){ VS.asked=true; vfxCall({mode:'status'},function(){}); } },1500); }catch(_){}
  var canFix=function(){ return !VS.off&&(VS.option===true||VS.left===null||VS.left>0); };
  // 「オプションを見る」でマイページへ移る前に、相談の欄の文を取っておき、戻ったら元に戻す（話した文が消えないように）
  function saveDraft(){ try{ var d={}; document.querySelectorAll(SEL).forEach(function(t){ if(t.id&&String(t.value||'').trim()) d[t.id]=t.value; }); sessionStorage.setItem('pk_vfx_draft',JSON.stringify({u:location.pathname,d:d,t:Date.now()})); }catch(_){} }
  function restoreDraft(ta){ try{ var x=JSON.parse(sessionStorage.getItem('pk_vfx_draft')||'null'); if(!x||x.u!==location.pathname||Date.now()-x.t>3*36e5||!ta.id||!x.d[ta.id]) return; if(!String(ta.value||'').trim()){ ta.value=x.d[ta.id]; fire(ta); } delete x.d[ta.id]; if(Object.keys(x.d).length) sessionStorage.setItem('pk_vfx_draft',JSON.stringify(x)); else sessionStorage.removeItem('pk_vfx_draft'); }catch(_){} }
  function pop(html,btns){
    var old=document.querySelector('.vfx-ov'); if(old) old.remove();
    var ov=document.createElement('div'); ov.className='vfx-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
    var box=document.createElement('div'); box.className='vfx-box'; box.innerHTML=html;
    var row=document.createElement('div'); row.className='vfx-btns';
    btns.forEach(function(x){ var e=document.createElement(x.href?'a':'button'); e.className='vfx-b'+(x.main?' main':''); e.textContent=x.t;
      if(x.href){ e.href=x.href; e.addEventListener('click',saveDraft); } else { e.type='button'; }
      e.addEventListener('click',function(){ ov.remove(); if(x.fn) x.fn(); }); row.appendChild(e); });
    box.appendChild(row); ov.appendChild(box);
    ov.addEventListener('click',function(ev){ if(ev.target===ov) ov.remove(); });
    document.body.appendChild(ov); try{ row.querySelector('.vfx-b').focus(); }catch(_){}
  }
  function introPop(go){
    lsSet('pk_vfx_intro','1');
    var trial=VS.option===true?'':'<p><b>まずは無料で</b><span class="nw">おためしいただけます。</span></p>';
    pop('<h3>🎤 <span class="nw">声で入力して</span><span class="nw">みましょう</span></h3>'+
        '<p>お客様のことや相談の内容を、<span class="nw">思いつくまま、</span><b class="nw">たっぷり話してください。</b><span class="nw">たくさん話すほど、</span><span class="nw">鑑定がくわしくなります。</span></p>'+
        '<ul class="vfx-l"><li>句読点と改行が入って、<span class="nw">読みやすく整います</span></li><li>「えー」「あのー」が消えます</li><li>'+(EX?'<span class="nw">'+WS+'が</span>':W+'が')+'<span class="nw">正しい字に直ります</span>'+(EX?'<br><span class="vfx-ex">例：'+EX.replace(/^例：/,'').split('／').map(function(x){ return '<span class="nw">'+x+'</span>'; }).join('　')+'</span>':'')+'</li></ul>'+trial+
        '<p class="vfx-s">声は端末の中で文字になります。<span class="nw">送るのは文字だけです。</span></p>',
        [{t:'🎤 話してみる',main:true,fn:go},{t:'閉じる'}]);
  }
  function endPop(){
    if(lsGet('pk_vfx_end')) return; lsSet('pk_vfx_end',String(Date.now()));   // おためし終了の案内は1回だけ
    var b=[{t:'あとで'}]; if(OPT) b.unshift({t:'オプションを見る',main:true,href:OPT});
    pop('<h3>🎤 <span class="nw">無料のおためしが</span><span class="nw">終わりました</span></h3>'+
        '<p>🎤 声で入力は、<span class="nw">これからも<b>無料</b>で</span><span class="nw">そのままお使いいただけます。</span></p>'+
        '<p><b class="nw">月1,000円のオプション</b>をつけると、<span class="nw">話した言葉を読みやすく整えて、</span><span class="nw">'+WS+'も正しい字に直します。</span><span class="nw">キーボードで打った文字も直ります。</span></p>'+
        '<p class="vfx-s">話した言葉は相談の欄に入り、<span class="nw">鑑定するとそのままカルテに残ります。</span></p>',b);
  }
  // おためしが終わったあと、無料の声の入力を20回使った方にだけ、もう1回だけ案内する（これで最後。何度も出さない）
  var FOLLOW_N=20;
  function freeUse(){
    if(VS.option!==false||VS.left!==0||lsGet('pk_vfx_follow')) return;
    if(!lsGet('pk_vfx_end')){ setTimeout(endPop,600); return; }   // おためし終了の案内をこの端末でまだ見ていなければ、先にそれを1回
    var n=(+(lsGet('pk_vfx_free')||0))+1; lsSet('pk_vfx_free',String(n));
    if(n<FOLLOW_N) return; lsSet('pk_vfx_follow','1');
    var b=[{t:'閉じる'}]; if(OPT) b.unshift({t:'オプションを見る',main:true,href:OPT});
    setTimeout(function(){ pop('<h3>🎤 <span class="nw">声の入力、</span><span class="nw">よく使っていただいています</span></h3>'+
        '<p><b class="nw">月1,000円のオプション</b>をつけると、<span class="nw">話した言葉を読みやすく整えて、</span><span class="nw">'+WS+'も正しい字に直します。</span><span class="nw">キーボードで打った文字も直ります。</span></p>'+
        '<p>おためしで便利だと感じていただけたら、<span class="nw">ぜひどうぞ。</span></p>'+
        '<p class="vfx-s">このご案内は、これで最後です。</p>',b); },800);
  }
  // 声で入れた文字（または打った文字）を直す。欄の文字がそのあいだに変わっていなければ入れかえる
  function smartFix(ta,m,base,part,quiet){
    if(!canFix()||!String(part||'').trim()) return;
    var snap=ta.value; if(!quiet) say(m,'✨ 読みやすく整えています…');
    vfxCall({text:part},function(j,why){
      if(why==='end'){ say(m,''); endPop(); return; }
      if(!j||typeof j.text!=='string'){ if(!quiet) say(m,''); return; }
      if(j.changed){
        if(ta.value===snap){ ta.value=base===null?j.text:joinText(base,j.text); fire(ta); ta.__vfxLast=ta.value; }
        else { var at=ta.value.lastIndexOf(part); if(at>=0){ ta.value=ta.value.slice(0,at)+j.text+ta.value.slice(at+part.length); fire(ta); ta.__vfxLast=ta.value; } }   // 直しが届くまでに続きを話した・打ったときも、その部分だけ入れかえる（直しを捨てない。2026-10-29）
      }
      say(m,(j.changed&&!j.option)?'✨ 読みやすく整えました':'');   // 回数は画面に出さない（鑑定者本人の指示 2026-10-27）
      if(!j.option&&j.left===0) setTimeout(endPop,1200);
    });
  }

  var cur=null;
  var IDLE='🎤 声で入力', ON='■ 止める';
  var NOSR='この画面では声の入力が使えません。キーボードのマイクボタンからお話しください。';
  function joinText(base,add){ add=String(add||'').trim(); if(!add) return base; if(!base) return add; return base+(/[\s。、！？!?]$/.test(base)?'':'　')+add; }
  function say(m,t){ m.textContent=t||''; }
  function fire(ta){ try{ ta.dispatchEvent(new Event('input',{bubbles:true})); }catch(_){} }
  function start(ta,b,m){
    if(cur){ cur.__user=true; try{ cur.stop(); }catch(e){} return; }
    if(!SR){ say(m,NOSR); return; }
    /* iPhone などは、少し間があくと聞き取りが自動で終わる。■ 止める を押すまで（または しばらく黙るまで）、自動でつなげて聞き続ける。
       話し終わってから、話した全部をまとめて1回で直す（前後の言葉があるほど占いの言葉が正しく直る）。鑑定者本人の指摘 2026-10-29 */
    var base=ta.value, done='', shown='', got=false, err='', t0=Date.now(), lastHeard=Date.now(), tries=0, SILENT=7000;
    function mk(){
      var r; try{ r=new SR(); }catch(e){ return null; }
      r.lang='ja-JP'; r.interimResults=true; r.continuous=true; r.maxAlternatives=1;
      var fin='', now='';
      r.onresult=function(e){
        var interim=''; for(var i=e.resultIndex;i<e.results.length;i++){ var t=e.results[i][0].transcript; if(e.results[i].isFinal) fin+=t; else interim+=t; }
        now=fin+interim; shown=done+now; got=got||!!shown.trim(); lastHeard=Date.now();
        ta.value=joinText(base,fixText(shown)); fire(ta);
      };
      r.onerror=function(e){ err=(e&&e.error)||''; };
      r.onend=function(){
        if(r.__ended) return; r.__ended=true;   // 終わりの知らせが2回来ても1回だけ
        if(cur!==r&&cur) return;
        done=done+now; now=''; fin='';
        var hard=/not-allowed|service-not-allowed|audio-capture|network/.test(err);
        if(!r.__user&&!hard&&Date.now()-lastHeard<SILENT&&Date.now()-t0<180000&&tries<60){ tries++; err=''; var n=mk(); if(n){ cur=n; try{ n.start(); return; }catch(e){} } }
        finish();
      };
      return r;
    }
    function finish(){
      cur=null; b.classList.remove('on'); b.textContent=IDLE;
      if(got){ var part=fixText(done||shown); ta.value=joinText(base,part); fire(ta);
        try{ ta.focus(); var n=ta.value.length; ta.setSelectionRange(n,n); }catch(_){}
        say(m,''); ta.__vfxLast=ta.value;   // 欄から離れたときの直し（キーボードの文字）と二重に直さない
        if(canFix()) smartFix(ta,m,base,part,false); else freeUse(); return; }   // うまく入ったときは何も出さない（毎回の一言は不要。発注者指示 2026-10-18）
      if(err==='not-allowed'||err==='service-not-allowed') say(m,'マイクが許可されていません。端末の設定でマイクを許可するか、キーボードのマイクボタンからお話しください。');
      else if(err==='network') say(m,'通信できないため、声の入力が使えませんでした。キーボードのマイクボタンからお話しください。');
      else if(err==='audio-capture') say(m,'マイクが見つかりませんでした。');
      else say(m,'声が聞き取れませんでした。もう一度、🎤を押してお話しください。');
    }
    var r=mk(); if(!r){ say(m,NOSR); return; }
    b.classList.add('on'); b.textContent=ON; say(m,'お話しください…（話し終わったら「■ 止める」を押してください。しばらく黙っても止まります）');
    cur=r; try{ r.start(); }catch(e){ cur=null; b.classList.remove('on'); b.textContent=IDLE; say(m,'声の入力を始められませんでした。もう一度お試しください。'); }
  }
  // 「✕ 全部消す」：欄の文字を1回で全部消す（1文字ずつ消すのは大変なため。発注者指示 2026-10-18）。
  //   押しまちがえても戻せるように、消したあと8秒間は「↩ 元に戻す」に変わる。欄が空のときは出さない。
  var CLR='✕ 全部消す', UNDO='↩ 元に戻す';
  function attach(ta){
    if(!ta||ta.dataset.vmic) return; ta.dataset.vmic='1';
    setTimeout(function(){ restoreDraft(ta); },300);
    var row=document.createElement('div'); row.className='vmic-row';
    var b=document.createElement('button'); b.type='button'; b.className='vmic-btn'; b.textContent=IDLE; b.setAttribute('aria-label','声で入力する');
    var c=document.createElement('button'); c.type='button'; c.className='vmic-clr'; c.textContent=CLR; c.setAttribute('aria-label','入力した文字を全部消す');
    var m=document.createElement('span'); m.className='vmic-msg'; m.setAttribute('aria-live','polite');
    row.appendChild(b); row.appendChild(c); row.appendChild(m); ta.insertAdjacentElement('afterend',row);
    b.addEventListener('click',function(){ if(!cur&&!lsGet('pk_vfx_intro')){ introPop(function(){ start(ta,b,m); }); return; } start(ta,b,m); });
    // オプションの方は、キーボードで打った文字も、欄から離れたときに占いの言葉を直す（おためし中は声の入力だけ）
    ta.addEventListener('focus',function(){ if(VS.option!==true&&!VS.off&&!VS.asked){ VS.asked=true; vfxCall({mode:'status'},function(){}); } });
    ta.addEventListener('blur',function(){ var v=String(ta.value||''); if(cur||VS.option!==true||v.trim().length<4||v===ta.__vfxLast) return; ta.__vfxLast=v; smartFix(ta,m,null,v,true); });
    var saved=null, timer=0;
    function sync(){ c.style.display=(saved!==null||String(ta.value||'').length)?'':'none'; }
    function endUndo(){ saved=null; clearTimeout(timer); c.textContent=CLR; c.classList.remove('undo'); sync(); }
    c.addEventListener('click',function(){
      if(cur){ cur.__user=true; try{ cur.stop(); }catch(e){} }
      if(saved!==null){ ta.value=saved; fire(ta); endUndo(); try{ ta.focus(); }catch(_){} return; }
      if(!String(ta.value||'').length) return;
      saved=ta.value; ta.value=''; fire(ta); say(m,'');
      c.textContent=UNDO; c.classList.add('undo'); clearTimeout(timer); timer=setTimeout(endUndo,8000);
    });
    ta.addEventListener('input',function(){ if(saved!==null&&ta.value.length) endUndo(); else sync(); });
    setInterval(sync,700); sync();   // 例文ボタンなどで欄に文字が入ったときも出す
  }
  function scan(root){ try{ (root||document).querySelectorAll(SEL).forEach(attach); }catch(e){} }
  function wire(){
    scan(document);
    try{ new MutationObserver(function(ms){ ms.forEach(function(x){ x.addedNodes&&x.addedNodes.forEach(function(n){ if(n.nodeType===1){ if(n.matches&&n.matches(SEL)) attach(n); else scan(n); } }); }); }).observe(document.body,{childList:true,subtree:true}); }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wire); else wire();
})();
