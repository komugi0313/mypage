/* 相手が答えたら、メールでお知らせ（任意）＝3つの無料サイト共通の部品（鑑定者本人 2026-11-22）
   いまは画面の形だけ。送り先のサーバーはまだない（あとでエンジニアさんが共通の会員基盤のサーバーにつなぐ）。
   つなぐときは、各サイトの PK_NOTIFY_CFG.endpoint に受け口のアドレスを入れるだけ（くわしくは handoff/メール通知_つなぎ方.md）。
   endpoint が null のあいだは、メールアドレスはどこにも送らず・どこにも残さない（「準備中です」と出すだけ）。
   元はこのファイル。python3 tools/add_notify_email.py が3つのサイトに埋め込む。 */
(function(){
  var CFG = window.PK_NOTIFY_CFG || {};
  var EP = CFG.endpoint || null;
  var REG = {}, seq = 0;
  function on(){ return !!EP; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  // リンクの目印（同じ文字列からは、送った人のスマホでも答えた人のスマホでも同じ目印になる）
  function refOf(s){ s=String(s||''); var h1=0x811c9dc5, h2=0x01000193; for(var i=0;i<s.length;i++){ var c=s.charCodeAt(i); h1=Math.imul(h1^c,16777619)>>>0; h2=Math.imul(h2^c,2246822519)>>>0; } return (h1.toString(36)+h2.toString(36)).slice(0,14); }
  function post(body){
    if(!EP) return Promise.resolve(false);
    body.site = CFG.site || ''; body.at = Date.now();
    try{ return fetch(EP,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).then(function(r){ return r.ok; }).catch(function(){ return false; }); }catch(e){ return Promise.resolve(false); }
  }
  /* 送る人の画面に出すカード。o = { kind:'with'|'room'|'invite', ref:function(){…} か 文字列, days:10, onSubscribed:function(ref){…} } */
  function card(o){
    o=o||{}; var id='pkn'+(++seq); REG[id]=o; 
    return '<section class="pkn" id="'+id+'" data-pkn="'+id+'">'+
      '<p class="pkn-h"><svg class="pkn-ic" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 7l8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'+
      '<span class="pkn-t"><span class="nw">送ったリンクから</span><span class="nw">相手があとで答えたら、</span><span class="nw">メールでお知らせします</span></span><span class="pkn-tag">任意</span></p>'+
      '<p class="pkn-d">リンクを送ってから10日のあいだ</p>'+
      '<form class="pkn-f" novalidate><div class="pkn-row">'+
        '<input type="email" class="pkn-in" inputmode="email" autocomplete="email" maxlength="120" placeholder="メールアドレス" aria-label="メールアドレス">'+
        '<button type="submit" class="pkn-go">登録</button></div>'+
        '<p class="pkn-m" role="status" hidden></p>'+
      '</form>'+
    '</section>';
  }
  function msg(f,t,bad){ var m=f.querySelector('.pkn-m'); m.hidden=false; m.textContent=t; m.className='pkn-m'+(bad?' bad':' ok'); }
  document.addEventListener('submit',function(e){
    var f=e.target; if(!f||!f.classList||!f.classList.contains('pkn-f')) return; e.preventDefault();
    var box=f.closest('[data-pkn]'), o=REG[box&&box.getAttribute('data-pkn')]||{};
    var mail=(f.querySelector('.pkn-in').value||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)){ msg(f,'メールアドレスを正しく入れてください。',true); f.querySelector('.pkn-in').focus(); return; }
    if(!EP){ msg(f,'メールでのお知らせは、ただいま準備中です。始まったら、ここから登録できます（入れたアドレスは、どこにも送っていません）。',false); return; }
    var ref=typeof o.ref==='function'?o.ref():o.ref; if(!ref){ msg(f,'先にリンクを作ってから（ニックネームを入れてから）登録してください。',true); return; }
    var btn=f.querySelector('.pkn-go'); btn.disabled=true; btn.textContent='登録中…';
    post({type:'subscribe',kind:o.kind||'',ref:ref,email:mail,days:o.days||10}).then(function(r){
      btn.disabled=false; btn.textContent='登録';
      if(r){ msg(f,'登録しました。相手が答えたら、'+mail+' にお知らせします。',false); if(o.onSubscribed) try{ o.onSubscribed(ref); }catch(e2){} }
      else msg(f,'うまく登録できませんでした。少し時間をおいて、もう一度お試しください。',true);
    });
  });
  /* 答えた人のスマホから「答えました」を知らせる（つながっていなければ何もしない） */
  function answered(o){ o=o||{}; if(!o.ref) return Promise.resolve(false); return post({type:'answered',kind:o.kind||'',ref:o.ref,name:String(o.name||'').slice(0,10)}); }
  window.PkNotify={ on:on, card:card, answered:answered, refOf:refOf, cfg:CFG };
})();
