/*!
 * setsuboku.js — 節木運（せつぼくうん）モジュール  v1.1
 * ------------------------------------------------------------------
 * 四柱推命の「30年周期の大きな節目（節木運）」を、既存の大運データから読み解く独立モジュール。
 * エンジン非依存・追加の四柱推命計算ゼロ。どのPRO版にもそのまま載せられます。
 *
 * 【理論・4層】
 *   1. 構造   … 大運を方合(亥子丑=冬 / 寅卯辰=春 / 巳午未=夏 / 申酉戌=秋)で30年の季節に束ねる
 *   2. 転換点 … 土の支(丑辰未戌)＝季節の継ぎ目＝節木運(人生の曲がり角)。約30年に一度
 *   3. 判定   … その季節が命式の喜神なら発展の30年、忌神なら備えの30年
 *   4. 強度   … 十二運(墓絶胎)・空亡が重なると影響が強く出る
 *
 * 【入力に必要なもの（すべて既存の computeChart 出力）】
 *   decadeFortunes : [{ startAge, endAge, ganzhi, branch, terrain? }, ...]  ← 必須
 *   birthYear      : 生年(西暦)   ← 年の算出に使用（省略可・省略時は年を出さない）
 *   nowAge         : 現在年齢     ← 「今どこか」判定（省略可）
 *   fav            : { 木:'喜', 火:'忌', ... }  ← 喜忌判定（省略可・省略時は季節のみ）
 *   voids          : ['寅','卯']  空亡の支（省略可・強度判定に使用）
 *
 * 【使い方（最小）】
 *   var a = Setsuboku.analyze({ decadeFortunes: pro.decadeFortunes,
 *                               birthYear: profile.y, nowAge: pro.now.age,
 *                               fav: chart.fav, voids: kuuboNow(pro).voids });
 *   el.innerHTML += Setsuboku.bandHtml(a, 'ja');     // 命式画面の季節帯
 *   styleEl.textContent += Setsuboku.css;            // 帯のCSS（1回だけ）
 *   systemPrompt += Setsuboku.promptBlock(a, 'ja');  // AI鑑定に渡す1ブロック
 * ------------------------------------------------------------------ */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  if (root) root.Setsuboku = mod;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /* 方合：十二支 → 季節・五行 */
  var SEASON = {
    亥:{s:'winter',el:'水'}, 子:{s:'winter',el:'水'}, 丑:{s:'winter',el:'水'},
    寅:{s:'spring',el:'木'}, 卯:{s:'spring',el:'木'}, 辰:{s:'spring',el:'木'},
    巳:{s:'summer',el:'火'}, 午:{s:'summer',el:'火'}, 未:{s:'summer',el:'火'},
    申:{s:'autumn',el:'金'}, 酉:{s:'autumn',el:'金'}, 戌:{s:'autumn',el:'金'}
  };
  /* 土の支＝季節の継ぎ目＝節木運の本体 */
  var TU = { 丑:1, 辰:1, 未:1, 戌:1 };
  /* 影響を強める十二運（新字体・旧字体どちらも許容） */
  var AMP_TERRAIN = { 墓:1, 絶:1, 絕:1, 胎:1 };
  /* 十二支の並び（順行/逆行の判定用） */
  var ORD = { 子:0, 丑:1, 寅:2, 卯:3, 辰:4, 巳:5, 午:6, 未:7, 申:8, 酉:9, 戌:10, 亥:11 };
  /* プロンプト表記用の季節名 */
  var SEA_NAME = { winter:'winter/water', spring:'spring/wood', summer:'summer/fire', autumn:'autumn/metal' };
  /* 暦順で次の季節／季節→五行（順行で次の大運が無い＝季節の締めの補完に使用） */
  var SEASON_NEXT = { spring:'summer', summer:'autumn', autumn:'winter', winter:'spring' };
  var SEASON_EL = { winter:'水', spring:'木', summer:'火', autumn:'金' };
  function brOf(d) { return d.branch || (d.ganzhi ? d.ganzhi.charAt(1) : ''); }
  /* 大運の進行方向：支が十二支順に増える＝順行(forward)、減る＝逆行(reverse)。
     隣り合う大運支の増減を数え、多数決で決める（判定不能なら順行扱い）。 */
  function isForward(decs) {
    var fwd = 0, rev = 0;
    for (var i = 0; i + 1 < decs.length; i++) {
      var a = ORD[brOf(decs[i])], b = ORD[brOf(decs[i + 1])];
      if (a == null || b == null) continue;
      var step = ((b - a) % 12 + 12) % 12;
      if (step === 1) fwd++; else if (step === 11) rev++;
    }
    return rev > fwd ? false : true;
  }

  /* ---- 中核：分析 ---- */
  function analyze(opt) {
    opt = opt || {};
    var decs = opt.decadeFortunes || [];
    if (!decs.length) return null;
    var fav = opt.fav || {};
    var voids = opt.voids || [];
    var birthY = (opt.birthYear != null) ? +opt.birthYear : null;
    var nowAge = (opt.nowAge != null) ? +opt.nowAge : null;
    /* ③ 順行/逆行。明示指定(opt.forward = startFortune.forward)があれば優先、無ければ支の並びから推定 */
    var forward = (opt.forward != null) ? !!opt.forward : isForward(decs);

    var blocks = decs.map(function (d) {
      var br = brOf(d);
      var se = SEASON[br] || null;
      var el = se ? se.el : '';
      var mark = fav[el] || '';                       /* 喜 / 忌 / '' */
      var isSetsu = !!TU[br];                          /* 節木運＝土の支 */
      var amp = (!!AMP_TERRAIN[d.terrain]) || (voids.indexOf(br) >= 0);
      /* ② 西暦：エンジンが startYear を持っていればそれを正とする（立運の端数月ぶんの1年ズレを避ける）。
         無ければ従来どおり 生年+年齢 で近似する。 */
      var startY = (d.startYear != null) ? +d.startYear
                 : (birthY != null) ? birthY + d.startAge : null;
      var current = (nowAge != null) && (nowAge >= d.startAge) && (nowAge <= d.endAge);
      return {
        startAge: d.startAge, endAge: d.endAge, ganzhi: d.ganzhi || '', branch: br,
        terrain: d.terrain || '', season: se ? se.s : '', seasonEl: el, mark: mark,
        isSetsu: isSetsu, intense: isSetsu && amp,
        enterSeason: '', enterEl: '', enterMark: '',   /* ③ 節目で“これから入る季節” */
        startYear: startY, swayFrom: startY != null ? startY - 2 : null,
        swayTo: startY != null ? startY + 2 : null, current: current
      };
    });

    /* ③ 方向補正：土の支は【逆行＝新しい季節の先頭 / 順行＝今の季節の締めくくり】。
       ゆえに節目で“これから入る30年の季節”は、逆行＝その支自身の季節、順行＝次の大運の季節。
       喜忌もその「入る季節」の五行で読む（＝発展/備えの向きを反転させない）。
       判定は隣接ブロックから行う（大運支は連続するので、順行の土の支は必ず次が別季＝締め、
       逆行の土の支は次が同季＝先頭になる）。末尾の節目だけ前ブロックで締め/先頭を見分ける。 */
    for (var k = 0; k < blocks.length; k++) {
      if (!blocks[k].isSetsu) continue;
      var b = blocks[k], nx = blocks[k + 1], pv = blocks[k - 1], se;
      if (nx && nx.season) se = (nx.season !== b.season) ? nx.season : b.season;      /* 中間：次が別季→次の季節(順行の締め) / 同季→自季(逆行の先頭) */
      else if (pv && pv.season === b.season) se = SEASON_NEXT[b.season] || b.season;   /* 末尾＝季節の締め(順行)→暦順で次の季節へ */
      else se = b.season;                                                             /* 末尾＝季節の先頭(逆行)→自季 */
      b.enterSeason = se;
      b.enterEl = SEASON_EL[se] || b.seasonEl;
      b.enterMark = fav[b.enterEl] || '';
    }

    /* 今から見て現在進行中/次の節木運 */
    var next = null;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].isSetsu && nowAge != null && blocks[i].endAge >= nowAge) { next = blocks[i]; break; }
    }
    /* 自発的に触れてよいか＝節木運の開始が現在±2年 */
    var proactive = false;
    if (next && nowAge != null) proactive = (next.startAge - 2 <= nowAge) && (nowAge <= next.startAge + 2);

    return { blocks: blocks, next: next, nowAge: nowAge, proactive: proactive, forward: forward };
  }

  /* ---- AI鑑定に渡す1ブロック（挙動ルールつき） ---- */
  function promptBlock(a) {
    if (!a || !a.blocks || !a.blocks.length) return '';
    var mkEnter = function (b) {   /* ③ 節目で“これから入る季節”＋その喜忌（方向補正済み） */
      if (!b.isSetsu) return '';
      var s = ' → entering ' + (SEA_NAME[b.enterSeason] || '?') +
        (b.enterMark === '喜' ? ' (FAVORABLE 30-yr season ahead = 発展)'
          : (b.enterMark === '忌' ? ' (challenging 30-yr season ahead = 備え)' : ''));
      return s;
    };
    var seq = a.blocks.map(function (b) {
      return 'age ' + b.startAge + '-' + b.endAge + ':' + (b.ganzhi || '') + ' ' + (SEA_NAME[b.season] || '?') +
        (b.mark === '喜' ? '(favorable)' : (b.mark === '忌' ? '(challenging)' : '')) +
        (b.isSetsu ? ' <<SETSUBOKU turning-point' + (b.intense ? ', intensified' : '') + mkEnter(b) + '>>' : '') +
        (b.current ? ' [NOW]' : '');
    }).join(' | ');
    var nx = a.next;
    var nxt = nx
      ? ('The next/current life turning-point (節木運): around age ' + nx.startAge +
         (nx.startYear ? (' (~year ' + nx.startYear + ')') : '') + ', when the 大運 enters ' + nx.ganzhi +
         ' — the "replanting" hinge into a new 30-year season' +
         (nx.enterSeason ? (': turning toward ' + (SEA_NAME[nx.enterSeason] || '') +
           (nx.enterMark === '喜' ? ', a FAVORABLE season for them (発展の30年)'
             : (nx.enterMark === '忌' ? ', a challenging season for them (備えの30年)' : ''))) : '') +
         '; the ~2 years around it (' + (nx.swayFrom || '') + '-' + (nx.swayTo || '') + ') tend to feel unsettled.')
      : 'No major turning-point is near right now.';
    var t = '';
    t += '[SETSUBOKU-UN (節木運) — 30-YEAR LIFE SEASONS] The 大運 decades group by 方合 into ~30-year seasons. Luck runs ' +
      (a.forward ? '順行/FORWARD: the earth branch 丑辰未戌 CLOSES its season, so the NEW 30-year season opens at the NEXT 大運'
                 : '逆行/REVERSE: the earth branch 丑辰未戌 LEADS its season, so it opens the NEW 30-year season') +
      '. The hinge branches 丑辰未戌 (amplified by the 十二運 stages 墓/絶/胎 or 空亡) are "replanting" turning-points = 人生の曲がり角. Each turning-point below is annotated with the season it turns INTO (already direction-corrected — read the coming 30 years from "entering …", NOT from the hinge branch\'s own season). Sequence: ' + seq + '. ' + nxt + '\n';
    t += '[SETSUBOKU — HOW TO SPEAK OF IT] ' + (a.proactive
      ? 'A turning-point is within ~2 years, so you MAY raise it warmly on your own when relevant. '
      : 'Only discuss this if the user asks about life turning-points / their future direction; do NOT bring it up unprompted. ') +
      'RULES: (1) NEVER say a season is "30 years of bad luck" or doom — a challenging season is a backdrop, and daily action shapes the lived experience; (2) frame a turning-point as 人生の曲がり角/植え替えの時期 — unsettled for ~2 years but a doorway to a new flow once crossed; encourage small steps, a forward-looking mindset, and firming up footing before big decisions; (3) speak in FELT, concrete everyday terms (what tends to shift — work, home, the people around them — and how to steady it), never the bare label "慎重な時期"; (4) HEALTH stays gentle self-care only — NEVER predict illness or diagnose; (5) NEVER use 九星/本命星/方位学/風水 — any lucky direction or colour must come only from the Four-Pillars 喜神; (6) a favourable season early in life = 早咲き, late = 大器晩成 — say it kindly.\n';
    return t;
  }

  /* ---- 命式画面の季節帯HTML ---- */
  function bandHtml(a, lang) {
    if (!a || !a.blocks || !a.blocks.length) return '';
    lang = lang || 'ja';
    var t = function (o) { return (o[lang] != null) ? o[lang] : o.en; };
    var segs = a.blocks.map(function (b) {
      var star = b.isSetsu ? ('<span class="sb-star" data-t="節木運">★</span>') : '';
      var now = b.current ? ('<span class="sb-now">' + esc(t(I18N.now)) + '</span>') : '';
      return '<div class="sb-seg sb-' + (b.season || '') + (b.current ? ' cur' : '') + '" title="' +
        b.startAge + '-' + b.endAge + '"><div class="sb-age">' + b.startAge +
        '</div><div class="sb-cell">' + now + star + '</div></div>';
    }).join('');
    var lg = ['spring','summer','autumn','winter'].map(function (s) {
      return '<span class="sb-lg sb-' + s + '"><i></i>' + esc(t(I18N[s])) + '</span>';
    }).join('');
    return '<div class="sb-title">' + esc(t(I18N.title)) + '</div>' +
      '<div class="sb-band">' + segs + '</div>' +
      '<div class="sb-legend">' + lg + '</div>' +
      '<div class="sb-hint">' + esc(t(I18N.hint)) + '</div>';
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ---- 帯のCSS（1回だけ挿入） ---- */
  var CSS =
    '.sb-title{font-size:12px;font-weight:700;letter-spacing:.02em;opacity:.72;margin:14px 0 6px}' +
    '.sb-band{display:flex;gap:3px;margin:8px 0 4px;overflow-x:auto;padding-bottom:2px}' +
    '.sb-seg{flex:1 0 34px;min-width:34px;text-align:center}' +
    '.sb-age{font-size:10px;opacity:.6;font-variant-numeric:tabular-nums;margin-bottom:3px}' +
    '.sb-cell{height:34px;border-radius:8px;position:relative;display:flex;align-items:center;justify-content:center;border:1px solid rgba(0,0,0,.06)}' +
    '.sb-spring .sb-cell{background:#E3EFDD}.sb-summer .sb-cell{background:#F6E2DB}.sb-autumn .sb-cell{background:#F2E9D2}.sb-winter .sb-cell{background:#E0E8F1}' +
    '.sb-seg.cur .sb-cell{outline:2px solid #3C7A5B;outline-offset:1px}' +
    '.sb-star{color:#B5623A;font-size:15px;line-height:1;cursor:pointer}' +
    '.sb-now{position:absolute;top:-7px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:700;color:#fff;background:#3C7A5B;border-radius:6px;padding:1px 5px;white-space:nowrap}' +
    '.sb-legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin:8px 0 2px}' +
    '.sb-lg{font-size:11px;opacity:.7;display:inline-flex;align-items:center;gap:5px}' +
    '.sb-lg i{width:11px;height:11px;border-radius:3px;display:inline-block}' +
    '.sb-lg.sb-spring i{background:#9CC28E}.sb-lg.sb-summer i{background:#D89A86}.sb-lg.sb-autumn i{background:#CBB474}.sb-lg.sb-winter i{background:#95AECB}' +
    '.sb-hint{font-size:11px;opacity:.62;margin-top:6px}' +
    '@media(prefers-color-scheme:dark){.sb-spring .sb-cell{background:#2a3a26}.sb-summer .sb-cell{background:#3a2620}.sb-autumn .sb-cell{background:#352d18}.sb-winter .sb-cell{background:#212d3b}.sb-cell{border-color:rgba(255,255,255,.08)}}';

  /* ---- 帯のUIラベル（10言語） ---- */
  var I18N = {
    title:{ja:'人生の季節と節目（節木運）',en:'Life seasons & turning points',zh:'人生的季节与节点（节木运）',zt:'人生的季節與節點（節木運）',ko:'인생의 계절과 전환점 (절목운)',vi:'Các mùa & bước ngoặt cuộc đời',es:'Estaciones y giros de la vida',pt:'Estações e viradas da vida',id:'Musim & titik balik hidup',th:'ฤดูกาลและจุดเปลี่ยนของชีวิต'},
    spring:{ja:'春',en:'Spring',zh:'春',zt:'春',ko:'봄',vi:'Xuân',es:'Primavera',pt:'Primavera',id:'Semi',th:'ใบไม้ผลิ'},
    summer:{ja:'夏',en:'Summer',zh:'夏',zt:'夏',ko:'여름',vi:'Hạ',es:'Verano',pt:'Verão',id:'Panas',th:'ร้อน'},
    autumn:{ja:'秋',en:'Autumn',zh:'秋',zt:'秋',ko:'가을',vi:'Thu',es:'Otoño',pt:'Outono',id:'Gugur',th:'ใบไม้ร่วง'},
    winter:{ja:'冬',en:'Winter',zh:'冬',zt:'冬',ko:'겨울',vi:'Đông',es:'Invierno',pt:'Inverno',id:'Dingin',th:'หนาว'},
    now:{ja:'今',en:'Now',zh:'现在',zt:'現在',ko:'지금',vi:'Nay',es:'Hoy',pt:'Hoje',id:'Kini',th:'ตอนนี้'},
    hint:{ja:'★は節木運（人生の曲がり角）。タップで説明',en:'★ = turning point (節木運). Tap to learn',zh:'★为节木运（人生转折）。点按查看',zt:'★為節木運（人生轉折）。點按查看',ko:'★는 절목운(인생 전환점). 탭하면 설명',vi:'★ = bước ngoặt (節木運). Chạm để xem',es:'★ = giro vital (節木運). Toca para saber',pt:'★ = virada de vida (節木運). Toque para ver',id:'★ = titik balik (節木運). Ketuk untuk info',th:'★ = จุดเปลี่ยนชีวิต (節木運) แตะเพื่อดู'}
  };

  /* ---- 用語解説（10言語）: タップ辞書やツールチップに ---- */
  var TERMS = {
    '節木運':{yomi:'せつぼくうん · setsuboku-un', b:{ja:'大運がおよそ30年ごとに迎える大きな節目。人生の「植え替え」＝曲がり角で、前後2年は環境が動きやすいけれど、越えれば新しい運気が進みます。',en:'A major life turning-point that arrives roughly every 30 years — a "replanting" hinge. The ~2 years around it feel unsettled, but a new flow opens once you cross it.',zh:'大运约每30年迎来的大节点，人生的“移植期”＝转折点。前后约2年环境易动，但越过后新的运势就会展开。',zt:'大運約每30年迎來的大節點，人生的「移植期」＝轉折點。前後約2年環境易動，但越過後新的運勢就會展開。',ko:'대운이 약 30년마다 맞는 큰 전환점. 인생의 “옮겨심기”＝갈림길로, 전후 2년은 환경이 흔들리지만 넘어서면 새로운 운이 열려요.',vi:'Bước ngoặt lớn của đời, đến khoảng mỗi 30 năm — thời kỳ "sang chậu". Khoảng 2 năm quanh đó dễ chao đảo, nhưng vượt qua sẽ mở ra dòng vận mới.',es:'Un gran giro vital que llega cada ~30 años, un "trasplante". Los ~2 años alrededor se sienten inestables, pero al cruzarlo se abre un nuevo flujo.',pt:'Uma grande virada que chega a cada ~30 anos, um "replantio". Os ~2 anos ao redor parecem instáveis, mas ao atravessar abre-se um novo fluxo.',id:'Titik balik besar yang datang tiap ~30 tahun — masa "pindah tanam". Sekitar 2 tahun terasa goyah, tapi setelah dilewati alur baru terbuka.',th:'จุดเปลี่ยนใหญ่ของชีวิตที่มาราวทุก 30 ปี เปรียบเหมือน "การย้ายกระถาง" ราว 2 ปีรอบๆ จะรู้สึกไม่นิ่ง แต่เมื่อผ่านไปกระแสใหม่จะเปิดออก'}},
    '植え替え':{yomi:'うえかえ · replanting', b:{ja:'節木運を植物にたとえた言い方。根を張り替える時期＝一時的に不安定でも、次の成長のための大切な移し替えです。',en:'The plant metaphor for a turning-point: repotting. Unsettled for a while, but a vital move that sets up the next growth.',zh:'把节木运比作植物的说法——移盆。虽一时不稳，却是为下一次成长而重要的移植。',zt:'把節木運比作植物的說法——移盆。雖一時不穩，卻是為下一次成長而重要的移植。',ko:'절목운을 식물에 빗댄 표현＝화분 옮겨심기. 잠시 불안정해도 다음 성장을 위한 소중한 옮김이에요.',vi:'Ẩn dụ cây cối cho bước ngoặt: sang chậu. Chông chênh một thời gian, nhưng là bước quan trọng cho lần lớn lên kế tiếp.',es:'La metáfora vegetal del giro: trasplante. Inestable un tiempo, pero un paso vital para el próximo crecimiento.',pt:'A metáfora vegetal da virada: transplante. Instável por um tempo, mas um passo vital para o próximo crescimento.',id:'Kiasan tanaman untuk titik balik: pindah pot. Sempat goyah, tapi langkah penting untuk pertumbuhan berikutnya.',th:'คำเปรียบจุดเปลี่ยนกับต้นไม้ คือการย้ายกระถาง ไม่นิ่งอยู่พักหนึ่ง แต่เป็นก้าวสำคัญสู่การเติบโตครั้งใหม่'}}
  };

  return {
    version: '1.1',
    analyze: analyze,
    isForward: isForward,
    promptBlock: promptBlock,
    bandHtml: bandHtml,
    css: CSS,
    i18n: I18N,
    terms: TERMS,
    SEASON: SEASON,
    TU: TU
  };
});
