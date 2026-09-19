/*!
 * pklove.js — 恋愛ステータス（❤でひと目）モジュール  v1.0
 * ------------------------------------------------------------------
 * 命式から「恋愛の傾向・配偶者像・魅力タイプ」を読み解くカードを生成する独立モジュール。
 * 追加の四柱推命計算はゼロ。②(app-pro.html)の純正関数・データだけを読む＝命式表と必ず一致する。
 *
 * 依存（すべて app-pro.html が既に持つグローバル関数／データ）：
 *   natalTs10(c)      … 通変星10種の個数 {比肩..印綬}
 *   pillarKichi(c,p)  … 柱ごとの吉凶星(神殺)名の配列（咸池/紅艶/天乙貴人/天徳貴人/月徳貴人/羊刃…）
 *   repHidden(p)      … 代表蔵干 {stem, role, tenStar}（月柱=司令、他柱=本気）
 *   strengthType(c)   … '身強'|'身弱'|'中和'
 *   c.pillars[i]      … {stem,branch,ganzhi,tenStar,terrain,label,hiddenStems:[{stem,role,tenStar,ling}]}
 *   c.dayMaster.stem / c.fiveElements / c.birth.sex('male'|'female') / c.timeUnknown
 *
 * 使い方： renderResult の連結に  + pkLoveCard(c)  を足すだけ。
 * ------------------------------------------------------------------ */
(function (root) {
  'use strict';

  var MBR_EL = { 子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水' };
  var EL_COLOR = { 木:'#1FA463',火:'#E8392B',土:'#D89A2B',金:'#7C828C',水:'#2A6FD0' };
  var RIKUGOU = { 子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午' };
  var GANGOU = { 甲:'己',己:'甲',乙:'庚',庚:'乙',丙:'辛',辛:'丙',丁:'壬',壬:'丁',戊:'癸',癸:'戊' };
  var BR = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  function isChong(a,b){ var i=BR.indexOf(a),j=BR.indexOf(b); return i>=0&&j>=0&&(i+6)%12===j; }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function starCurve(n){ n=Math.round(n); if(n<=1)return 1; if(n<=2)return 2; if(n<=4)return 3; if(n<=5)return 4; return 5; }
  function elB(br){ var e=MBR_EL[br]||''; return '<b style="color:'+(EL_COLOR[e]||'inherit')+'">'+esc(br)+'</b>'; }

  var SPOUSE_BY_TEN = {
    比肩:'自立心があり対等・マイペースな人', 劫財:'行動的で勝負強く、仲間思いな人',
    食神:'おおらかで楽しく、家庭的でやさしい人', 傷官:'感性豊かで才能があるが、繊細でこだわりの強い人',
    偏財:'社交的で商才があり、フットワークの軽い華やかな人', 正財:'誠実で堅実、家庭を大事にする信頼できる人',
    偏官:'度胸と行動力があり頼れるが、激しい一面もある人', 正官:'まじめで責任感が強く、律儀で品のある人',
    偏印:'独自の発想と探究心を持つ、少しミステリアスな人', 印綬:'知的でやさしく、包み込むように支えてくれる人'
  };
  var LOVE_BY_GROUP = {
    比劫:'対等でさっぱりした恋を好みます。束縛を嫌い、友達のような距離感が心地よいタイプ。自分の世界も大事にしたいので、干渉しすぎない相手だと長続きします。',
    食傷:'表現豊かでサービス精神があり、尽くすロマンチスト。好きになると一生懸命に。ただし傷官が強いと理想が高く、相手に完璧を求めて厳しくなりがち。素直に甘えるのが吉。',
    財:'惚れっぽく行動的で、恋を楽しむタイプ。魅力的な人に弱く、追う恋が好き。モテる分、目移りしやすいので、一人に絞る意識を持つと安定します。',
    官殺:'恋愛にまじめで一途。相手に合わせ、尽くしてしまうタイプ。我慢しがちで、押されると弱い一面も。自分の気持ちも言葉にすると、対等で幸せな関係に。',
    印:'尽くされたい・守られたい受け身タイプ。安心できる成熟した相手を選びます。母性/父性で包む優しさも。自分から一歩踏み出すと、縁が動きやすくなります。'
  };
  var ATTRACT_BY = { 官殺:'頼れて律してくれる、しっかり者・年上の相手', 印:'包み込んでくれる成熟した年上・知的な相手', 食傷:'自分がリードできる、素直で才能や愛嬌のある相手', 比劫:'対等で気の合う、友達のような相手', 財:'華やかで社交的、いっしょにいて楽しい相手' };

  function groupSums(sc){ return { 比劫:(sc.比肩||0)+(sc.劫財||0), 食傷:(sc.食神||0)+(sc.傷官||0), 財:(sc.正財||0)+(sc.偏財||0), 官殺:(sc.正官||0)+(sc.偏官||0), 印:(sc.印綬||0)+(sc.偏印||0) }; }
  function topGroup(sc){ var g=groupSums(sc),best='',bv=-1; Object.keys(g).forEach(function(k){ if(g[k]>bv){bv=g[k];best=k;} }); return best; }

  function pkLoveCard(c){
    if(!c || !c.pillars || !c.pillars[2] || !c.dayMaster) return '';
    var hasNatal = (typeof natalTs10==='function'), hasKichi=(typeof pillarKichi==='function'), hasRep=(typeof repHidden==='function');
    var sc = hasNatal ? natalTs10(c) : {};
    // 神殺（吉凶星）を全柱から集約
    var sl = [];
    c.pillars.forEach(function(p){ if(!p||!hasKichi)return; pillarKichi(c,p).forEach(function(k){ if(sl.indexOf(k)<0)sl.push(k); }); });
    var dp = c.pillars[2], db = dp.branch, ter = dp.terrain || '';
    var female = !(c.birth && c.birth.sex === 'male');
    var seiName = female?'正官':'正財', henName = female?'偏官':'偏財';
    var seiCnt = female?(sc.正官||0):(sc.正財||0), henCnt = female?(sc.偏官||0):(sc.偏財||0), spouseCnt = seiCnt+henCnt;
    function toukan(ten){ return c.pillars.some(function(pl,i){ return i!==2 && pl && pl.tenStar===ten; }); }
    var seiTou = toukan(seiName), henTou = toukan(henName);
    var spouseTen = hasRep ? (repHidden(dp)||{}).tenStar : '';
    var tg = topGroup(sc);
    var _five = c.fiveElements || {}, _fire = _five['火'] || 0;
    var sTypeStr = (typeof strengthType==='function') ? strengthType(c) : '';
    var _strong = /強/.test(sTypeStr), _weak = /弱/.test(sTypeStr);
    var _hasKa = sl.indexOf('咸池')>=0, _hasKo = sl.indexOf('紅艶')>=0, _hasTen = sl.indexOf('天乙貴人')>=0, _hasTok = sl.indexOf('天徳貴人')>=0, _boku = (ter==='沐浴');
    var _ss = (sc.食神||0)+(sc.傷官||0), _inx = (sc.印綬||0)+(sc.偏印||0), _hk = (sc.比肩||0)+(sc.劫財||0);
    var _clash = c.pillars.some(function(pl,i){ return i!==2 && pl && isChong(db, pl.branch); });
    var _rk = RIKUGOU[db], _dayHego = c.pillars.some(function(pl,i){ return i!==2 && pl && pl.branch===_rk; });

    var _LB = ['年','月','日','時'];
    function _wp(lbl,p){ return lbl + (p?'〔'+p+'〕':''); }
    function _ssP(name){ var r=[]; c.pillars.forEach(function(pl,i){ if(!pl||!hasKichi)return; if(pillarKichi(c,pl).indexOf(name)>=0)r.push(_LB[i]+'柱'); }); return r.join('・'); }
    function _starP(){ var names=[].slice.call(arguments),r=[]; c.pillars.forEach(function(pl,i){ if(!pl)return; var hit=(names.indexOf(pl.tenStar)>=0)||((pl.hiddenStems||[]).some(function(h){return names.indexOf(h.tenStar)>=0;})); if(hit)r.push(_LB[i]+'柱'); }); return r.join('・'); }
    var _kangoP = (function(){ var g=GANGOU[c.dayMaster.stem],r=[]; c.pillars.forEach(function(pl,i){ if(pl&&pl.ganzhi&&pl.ganzhi[0]===g)r.push(_LB[i]+'柱'); }); return r.join('・'); })();

    /* 各★の素点と「その人で実際に効いた根拠（＋出現する柱）」 */
    var _mote=1,_moteR=[]; if(_hasKa){_mote+=2;_moteR.push(_wp('桃花(咸池)',_ssP('咸池'))+'+2');} if(_hasKo){_mote+=2;_moteR.push(_wp('紅艶',_ssP('紅艶'))+'+2');} if(_boku){_mote+=1;_moteR.push('日柱が沐浴+1');} if(_ss>=2){_mote+=1;_moteR.push(_wp('食傷が2つ以上',_starP('食神','傷官'))+'+1');}
    var _pas=1,_pasR=[]; if(_fire>=3){_pas+=2;_pasR.push('火の五行が多い(+2)');}else if(_fire>=1){_pas+=1;_pasR.push('火の五行あり(+1)');} if(_hasKa){_pas+=1;_pasR.push(_wp('桃花',_ssP('咸池'))+'+1');} if(_boku){_pas+=1;_pasR.push('日柱が沐浴+1');} if(((sc.偏官||0)+(sc.偏財||0))>=1){_pas+=1;_pasR.push(_wp('偏官/偏財あり',_starP('偏官','偏財'))+'+1');}
    var _mar=1,_marR=[]; if(seiTou){_mar+=2;_marR.push(_wp('配偶者星が透干(表に出る)',_starP(seiName))+'+2');}else if(seiCnt>0){_mar+=1;_marR.push(_wp('配偶者星が蔵干(内側)',_starP(seiName))+'+1');}else{_marR.push('配偶者星は命式になし（運で動く）');} if(!_clash){_mar+=1;_marR.push('日支に冲なし+1');}else{_marR.push('日支に冲あり(加点なし)');} if(spouseCnt>=2){_mar+=1;_marR.push('配偶者星が2つ以上+1');}
    var _loy=3,_loyR=['基準+3']; if(((sc.正財||0)+(sc.正官||0)+(sc.印綬||0))>=1){_loy+=1;_loyR.push(_wp('誠実の星(正財/正官/印綬)あり',_starP('正財','正官','印綬'))+'+1');} if((sc.傷官||0)>=2||_boku||_hasKa){_loy-=1;_loyR.push('傷官2つ/沐浴/桃花 −1');} if(_hk>=3){_loy-=1;_loyR.push('比劫が多い −1');}
    var _bore=1,_boreR=[]; if(_hasKa){_bore+=1;_boreR.push(_wp('桃花',_ssP('咸池'))+'+1');} if(_hasKo){_bore+=1;_boreR.push(_wp('紅艶',_ssP('紅艶'))+'+1');} if(_inx>=1){_bore+=1;_boreR.push(_wp('印星(印綬/偏印)あり',_starP('印綬','偏印'))+'+1');} if(_hasTen){_bore+=1;_boreR.push(_wp('天乙貴人',_ssP('天乙貴人'))+'+1');}
    var _kake=1,_kakeR=[]; if((sc.傷官||0)>=1){_kake+=1;_kakeR.push(_wp('傷官あり',_starP('傷官'))+'+1');} if((sc.偏財||0)>=1){_kake+=1;_kakeR.push(_wp('偏財あり',_starP('偏財'))+'+1');} if((sc.偏官||0)>=1){_kake+=1;_kakeR.push(_wp('偏官あり',_starP('偏官'))+'+1');} if(_ss>=2){_kake+=1;_kakeR.push(_wp('食傷が2つ以上',_starP('食神','傷官'))+'+1');}
    var _tsuku=1,_tsukuR=[]; if(seiCnt>0){_tsuku+=1;_tsukuR.push(_wp('配偶者星あり',_starP(seiName))+'+1');} if((sc.印綬||0)>=1){_tsuku+=1;_tsukuR.push(_wp('印綬あり',_starP('印綬'))+'+1');} if(_hasTen||_hasTok){_tsuku+=1;_tsukuR.push(_wp('貴人(天乙/天徳)',(_ssP('天乙貴人')||_ssP('天徳貴人')))+'+1');} if(_dayHego){_tsuku+=1;_tsukuR.push('日支の支合(六合)+1');}
    var _flashy=/帝旺|建禄|冠帯|長生/.test(ter||''), _kango=(!!_kangoP), _getsu=sl.some(function(x){return /月徳/.test(x);});
    var _first=1,_firstR=[]; if(_hasKa){_first+=1;_firstR.push(_wp('桃花',_ssP('咸池'))+'+1');} if(_hasKo){_first+=1;_firstR.push(_wp('紅艶',_ssP('紅艶'))+'+1');} if(_boku){_first+=1;_firstR.push('日柱が沐浴+1');} if((sc.傷官||0)>=1){_first+=1;_firstR.push(_wp('傷官(華・目立つ)',_starP('傷官'))+'+1');} if(_flashy){_first+=1;_firstR.push('日柱が'+esc(ter)+'(華やか)+1');}
    var _fate=1,_fateR=[]; if(_hasTen){_fate+=1;_fateR.push(_wp('天乙貴人',_ssP('天乙貴人'))+'+1');} if(_hasTok||_getsu){_fate+=1;_fateR.push(_wp('天徳/月徳貴人',(_ssP('天徳貴人')||_ssP('月徳合')||_ssP('月徳貴人')))+'+1');} if(_kango){_fate+=1;_fateR.push(_wp('日干と干合する干あり(強い縁)',_kangoP)+'+1');} if(seiCnt>0){_fate+=1;_fateR.push(_wp('配偶者星あり',_starP(seiName))+'+1');} if(_hasKo){_fate+=1;_fateR.push(_wp('紅艶',_ssP('紅艶'))+'+1');}
    var _gap=1,_gapR=[]; if((sc.傷官||0)>=1){_gap+=1;_gapR.push(_wp('傷官(意外性)',_starP('傷官'))+'+1');} if(_inx>=1&&_ss>=1){_gap+=1;_gapR.push('優等生×表現のギャップ+1');} if(_hk>=1&&_ss>=1){_gap+=1;_gapR.push('自我×表現のギャップ+1');} if(_hasKa){_gap+=1;_gapR.push(_wp('桃花(小悪魔)',_ssP('咸池'))+'+1');}
    var _amae=1,_amaeR=[]; if(_inx>=1){_amae+=1;_amaeR.push(_wp('印星(甘え上手)',_starP('印綬','偏印'))+'+1');} if(ter==='養'||ter==='胎'){_amae+=1;_amaeR.push('日柱が'+esc(ter)+'(愛され気質)+1');} if((sc.食神||0)>=1){_amae+=1;_amaeR.push(_wp('食神(愛嬌)',_starP('食神'))+'+1');} if(_hasTen){_amae+=1;_amaeR.push(_wp('天乙貴人(助けられ運)',_ssP('天乙貴人'))+'+1');}
    var _style=(_inx>=3)?'受け・大事にされ型（守られる恋）':((_hk>=3)?'ぐいぐい攻め型（情熱的にアタック）':(_strong?'攻め型（自分から動くと縁が来る）':(_weak?'受け型（誘われ待ち・じっくり派）':'バランス型（状況で攻守を切り替え）')));

    function stars5(n){ n=starCurve(n); return '★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n); }
    function _why(arr){ return '<br><span style="color:#8a6b78;font-size:11px">🔎 あなたの根拠：'+(arr.length?esc(arr.join(' ／ ')):'目立つ加点サインなし（標準）')+'</span>'; }
    var MUTED='#8B7E68';
    function note(t,extra){ return '<span style="color:'+MUTED+';font-size:12px'+(extra||'')+'">'+t+'</span>'; }
    function _lrow(lbl,n,rs,wr){ return '<div style="margin:7px 0"><b>'+lbl+'</b> <span style="color:#c0397a;font-size:16px;letter-spacing:2px">'+stars5(n)+'</span><br>'+note(rs)+_why(wr||[])+'</div>'; }

    var loveStatus = '<div style="background:#FBF3EF;border:1px solid #F0DBD0;border-radius:10px;padding:10px 12px;margin:2px 0 10px"><b style="display:block;color:#c0397a;font-weight:800;margin:0 0 4px">◆ 恋愛ステータス（★でひと目）</b>'
      + (c.timeUnknown ? '<p style="margin:3px 0 4px;color:#b06a2e;font-size:11.5px">※生まれ<b>時間が不明</b>のため、時柱ぶんのサイン（神殺・星）は含めていません。実際の❤は<b>これ以上になることがあります</b>。時間がわかると精度が上がります。</p>' : '')
      + _lrow('💖 モテ度（人気・魅力）',_mote,(_hasKa||_hasKo)?'人を惹きつける“色気・華の星”（桃花・紅艶）持ち。例：黙っていても自然と目に留まるタイプ':'派手さより、知るほど好きになる“じわじわ本命”タイプ',_moteR)
      + _lrow('🔥 情熱・ときめき度',_pas,_fire>=2?'火の気が強く、好きになると一直線。例：気になる人にはすぐ連絡したくなる情熱家':'ゆっくり信頼を育てる、落ち着いた愛し方',_pasR)
      + _lrow('💍 結婚のご縁',_mar,seiTou?'結婚相手を表す星（配偶者星）が“表に出て”強い＝結婚を意識できるご縁':(seiCnt>0?'配偶者星が“内側”にあり、良縁はこれから運が巡る時期に表に出ます':'結婚のご縁は、運が巡る年に動きやすいタイプ'),_marR)
      + '<p style="margin:-2px 0 6px;padding-left:2px;color:'+MUTED+';font-size:12px">💡 結婚の<b>時期</b>は下の〈大運・年運〉で見てください。★が控えめでも、良縁の年が来ればちゃんと結ばれます。</p>'
      + _lrow('🌹 一途さ（尽くす愛）',_loy,_loy>=4?'まじめ・誠実の星が強く、決めた人にまっすぐ尽くすタイプ':(_loy<=2?'好奇心旺盛で、気持ちが移りやすい面も（悪いことではありません）':'相手やタイミングで、一途にも自由にも'),_loyR)
      + _lrow('😍 惚れられ度（愛される力）',_bore,_bore>=4?'愛され・守られの星があり、自然と大切にされる。例：気づけば周りが世話を焼いてくれる':'自分から一歩動くと、ちゃんと愛が返ってくるタイプ',_boreR)
      + _lrow('🎭 恋の駆け引き上手',_kake,_kake>=4?'押し引き・演出が上手。例：さりげなく相手を惹きつける“小悪魔”な一面':'駆け引きは苦手でも、まっすぐ・正直さがいちばんの武器',_kakeR)
      + _lrow('💐 尽くされ度（大切にされる）',_tsuku,_tsuku>=4?'良縁と“守りの星”があり、相手が大切にしてくれる関係になりやすい':'自分が尽くすほど、その分ちゃんと返ってくる関係に',_tsukuR)
      + _lrow('💘 第一印象・ひとめ惚れされ度',_first,_first>=4?'初対面で目を引く“華”があり、第一印象で好かれやすいタイプ':'じっくり知るほど魅力が伝わる、後からじわじわ効くタイプ',_firstR)
      + _lrow('🔮 運命の出会い運',_fate,_fate>=4?'貴人・強い縁の星があり、“運命的な出会い”に恵まれやすい':'出会いは自分から動く年・場に出るほど広がるタイプ',_fateR)
      + _lrow('🌶 ギャップ・小悪魔度',_gap,_gap>=4?'見た目と中身のギャップ・意外性で人を惹きつける小悪魔タイプ':'裏表のない“まっすぐさ”そのものが魅力',_gapR)
      + _lrow('🍯 甘え上手・愛されキャラ度',_amae,_amae>=4?'自然に甘えられ、周りに可愛がられる“愛されキャラ”':'しっかり者で、人に甘えたり頼るのは少し苦手なタイプ',_amaeR)
      + '<div style="margin:6px 0 0"><b>🎯 恋のスタイル：</b>'+_style+'</div>'
      + '<details style="margin:6px 0 0"><summary style="cursor:pointer;font-weight:700;color:'+MUTED+'">🔎 根拠（この★の理由・専門用語／先生の検算用）</summary>'
        + '<p style="margin:4px 0 0;line-height:1.9;color:'+MUTED+';font-size:12px">'
        + '桃花(咸池)<b>'+(_hasKa?'有':'無')+'</b>／紅艶<b>'+(_hasKo?'有':'無')+'</b>／日支の十二運<b>'+esc(ter||'-')+'</b>'
        + '／食傷<b>'+_ss+'</b>（食神'+(sc.食神||0)+'・傷官'+(sc.傷官||0)+'）／火の五行<b>'+_fire+'</b>'
        + '<br>配偶者星＝'+seiName+'：<b>'+(seiTou?'透干':(seiCnt>0?'蔵干のみ':'命中になし'))+'</b>（'+seiName+seiCnt+'・'+henName+'〔恋愛星〕'+henCnt+'）'+((seiTou&&henTou)?'／<b>官殺混雑</b>（'+seiName+'＋'+henName+'が透干）':'')
        + '／日支の支合(六合)<b>'+(_dayHego?'有':'無')+'</b>／身の強さ<b>'+esc(sTypeStr||'中和')+'</b>'
        + '<br><span style="color:#a99">※モテ度＝桃花+2/紅艶+2/沐浴+1/食傷2つ+1、結婚縁＝配偶者星 透干+2(蔵干+1)/日支に冲なし+1/配偶星2つ+1…のように加点。★は素点6以上で5・1以下で1に圧縮。神殺・通変・代表蔵干は②エンジン算出。</span>'
        + '</p></details>'
      + '<p style="margin:6px 0 0;color:'+MUTED+';font-size:12px">※星は命式の“恋の傾向”の目安です。行動しだいでいくらでも伸ばせます。</p></div>';

    /* ガイド＋導入 */
    var H = '<details style="border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin:0 0 10px"><summary style="cursor:pointer;font-weight:700;color:var(--gold)">＋ 読み解きガイド（人に説明する用・タップで開く）</summary><div style="margin-top:8px;line-height:1.6;color:var(--ink2);font-size:13px">'
      + '<p style="margin:0 0 6px">結ばれる相手は<b>配偶者宮（日支）の芯</b>、結婚向きの縁は<b>配偶者星</b>（女性＝正官／男性＝正財）で見ます。<b>透干</b>＝表に出る縁／<b>蔵干のみ</b>＝内に秘める縁。</p>'
      + '<div style="margin:6px 0"><b>モテ度</b><br>桃花（咸池）・紅艶・沐浴・食傷が多いほど魅力・人気が高い</div>'
      + '<p style="margin:8px 0 0"><b>お客様への一言：</b>「“どんな人に惹かれ、どう愛すか”のクセ。無理に変えず、活かすのがいちばんうまくいきます」</p>'
      + '</div></details>'
      + '<p style="margin:0 0 8px;color:var(--ink2);font-size:13.5px">あなたの恋のかたち——どんな人に惹かれ、どう愛し、どんな魅力で人を引き寄せるか。命式から“あなたらしい恋愛のクセ”を、やさしく読み解きます。</p>'
      + loveStatus;

    /* ① 配偶者像 */
    H += '<div><b style="display:block;color:#c0397a;font-weight:800;margin:6px 0 2px">◆ 配偶者像（どんな相手と結ばれるか）</b>';
    H += '<p style="margin:4px 0">配偶者宮（日支 '+elB(db)+'）の芯は<b>'+esc(spouseTen||'—')+'</b>。<b>'+esc(SPOUSE_BY_TEN[spouseTen]||'自分と縁の深いタイプ')+'</b>と結ばれやすいでしょう。</p>';
    if(spouseCnt===0){
      H += '<p style="margin:4px 0">命式に<b>配偶者星（'+seiName+'・'+henName+'）が見当たりません</b>。これは「縁がない」意味ではなく、<b>結婚の縁は大運・年運で'+seiName+'／'+henName+'が巡る時期に動きやすい</b>ということ。焦らずタイミングを待つのが吉です。</p>';
    } else {
      var parts=[];
      if(seiCnt>0){ if(seiTou)parts.push('<b>'+seiName+'</b>（正式な縁の星）が命式に<b>しっかりあり</b>、<b>誠実で堅実な相手・結婚向きの良縁</b>に恵まれやすい'); else parts.push('<b>'+seiName+'</b>（正式な縁の星）が<b>命式の奥（蔵干）に隠れてあり</b>、<b>誠実で堅実な相手との良縁</b>を内に備えている（大運・年運で表に出る時期に動きやすい）'); }
      if(henCnt>0){ if(henTou)parts.push('<b>'+henName+'</b>（刺激の縁の星）が命式に<b>しっかりあり</b>、<b>個性的・情熱的な相手や刺激的な恋</b>に縁がある'); else parts.push('<b>'+henName+'</b>（刺激の縁の星）が<b>命式の奥（蔵干）に隠れてあり</b>、<b>個性的・情熱的な相手</b>への縁を内に秘めている'); }
      H += '<p style="margin:4px 0">'+parts.join('。また')+'。';
      if(female&&seiCnt>0&&henCnt>0){ if(seiTou&&henTou)H+=' ※正官と偏官が<b>ともに天干に出て混在（官殺混雑）</b>＝関わる男性が複数・複雑になりやすいので、<b>誠実な一人を選ぶ意識</b>を。'; else H+=' ※正官・偏官が<b>蔵干で同居（隠れた官殺混雑）</b>＝表には出にくいものの、惹かれる男性のタイプが「誠実型」と「刺激型」に分かれやすい傾向。縁が動く時期は<b>誠実な一人を選ぶ意識</b>を。'; }
      if(!female&&seiCnt>0&&henCnt>0){ if(seiTou&&henTou)H+=' ※正財と偏財が<b>天干で混在</b>＝<b>異性関係が華やか</b>になりやすいので、一人に絞ると安定します。'; else H+=' ※正財・偏財が<b>蔵干で同居</b>＝華やかな異性運を内に秘めるタイプ。表に出る時期は一人に絞ると安定します。'; }
      H += '</p>';
    }
    H += '<p style="margin:4px 0"><b>惹かれやすいタイプ：</b>'+esc(ATTRACT_BY[tg]||'自分にないものを持つ相手')+'。</p></div>';

    /* ② 恋愛傾向 */
    H += '<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><b style="display:block;color:#c0397a;font-weight:800;margin:6px 0 2px">◆ 恋愛傾向（惹かれ方・尽くし方）</b>';
    H += '<p style="margin:4px 0">'+esc(LOVE_BY_GROUP[tg]||'状況に合わせて柔軟に恋を楽しむタイプです。')+'</p>';
    var notes=[];
    if(_hasKa)notes.push('<b>桃花（咸池）</b>持ちで、自然と異性を惹きつけ恋の機会が多い');
    if(_hasKo)notes.push('<b>紅艶</b>持ちで、色気・華があり放っておかれないタイプ');
    if(sl.indexOf('羊刃')>=0||sl.indexOf('飛刃')>=0)notes.push('感情が強く出る星があり、<b>一途だが嫉妬・衝突</b>に注意');
    if(notes.length)H+='<p style="margin:4px 0 0;color:'+MUTED+';font-size:12px">＋ '+notes.join('／')+'。</p>';
    H += '</div>';

    /* ③ モテ度・魅力タイプ */
    var m=1; if(_hasKa)m+=2; if(_hasKo)m+=2; if(_boku)m+=1; if(_ss>=2)m+=1; m=Math.max(1,Math.min(5,m));
    var stars='★★★★★'.slice(0,m)+'☆☆☆☆☆'.slice(0,5-m);
    var typ=[];
    if(_hasKa)typ.push('華やかで人を惹きつける<b>人気者タイプ</b>');
    if(_hasKo)typ.push('色気でドキッとさせる<b>魅惑タイプ</b>');
    if(_boku)typ.push('恋多く色気のある<b>ロマンチスト</b>');
    if(_ss>=2)typ.push('愛嬌・表現力で好かれる<b>チャーミングタイプ</b>');
    if(((sc.正官||0)+(sc.偏官||0))>=2||((sc.正財||0)+(sc.偏財||0))>=2)typ.push('誠実さ・安定感で信頼される<b>本命タイプ</b>');
    if(!typ.length)typ.push('派手さより<b>内面でじわじわ好かれる遅咲き・本命タイプ</b>');
    H += '<div style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px"><b style="display:block;color:#c0397a;font-weight:800;margin:6px 0 2px">◆ モテ度・魅力タイプ</b>';
    H += '<p style="margin:4px 0"><b>モテ度：</b><span style="color:#c0397a;font-size:16px;letter-spacing:2px">'+stars+'</span></p>';
    H += '<p style="margin:4px 0"><b>魅力タイプ：</b>'+typ.join('／')+'。</p></div>';

    return '<section class="card sec" id="love-card"><span class="eyebrow"><b>恋愛</b>❤で見る</span><h2>恋愛ステータス・配偶者像・魅力タイプ</h2>'+H+'</section>';
  }

  root.pkLoveCard = pkLoveCard;
})(typeof window !== 'undefined' ? window : this);
