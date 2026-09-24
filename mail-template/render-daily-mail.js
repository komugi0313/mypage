/*! render-daily-mail.js — 毎朝の運気予報メール（HTMLメール）テンプレート
 *
 *  見た目・セクションの並びの「正」＝ mail-sample.html。
 *  それを Gmail / iPhoneメール / Outlook でも崩れにくい「テーブルレイアウト＋インラインCSS」に移植したもの。
 *  文章はすべて generateDaily() の返り値をそのまま使う（ここでは文章を作らない）。
 *
 *  使い方（Node）:
 *    const D = require('./daily-engine.js');           // engine.js / bazi.js は同じフォルダ
 *    const { PersonBazi } = require('./bazi.js');
 *    const { renderDailyMail } = require('./render-daily-mail.js');
 *    const r = D.generateDaily(birth, dateJST, { nick, rel, sex, hour, minute, timeUnknown, personBazi: PersonBazi, interests });
 *    const mail = renderDailyMail(r, {
 *      assetBase:      'https://unkiyoho.jp/',                              // 画像の絶対URLの起点
 *      unsubscribeUrl: 'https://unkiyoho.jp/unsubscribe.html?token=XXXX',  // 受信者ごとの解除トークン付き
 *      mypageUrl:      'https://unkiyoho.jp/mypage.html',
 *      aishouUrl:      'https://166unmei.com/',
 *    });
 *    // mail.subject / mail.html / mail.text を送信サービスへ
 */
(function (root) {
  'use strict';

  /* ── 月替わりの季節テーマ（mail-sample.html の THEMES と同一。値を変えるときは両方そろえる） ── */
  var THEMES = {
    1:{frame1:"#fff7e6",frame2:"#fbedc9",soft:"#fff9ee",accent:"#dcae4a",ink:"#9a7a2c",label:"正月",deco:["🎍","🌅","⛩️","🎌","🎍"],motif:["🎍","🌅","🎌","✨","🌅","🎍"],bgimg:"bg-shogatsu.jpg",bgcolor:"#fdf3dd"},
    2:{frame1:"#f4ecf5",frame2:"#e7d7ee",soft:"#f8f1f9",accent:"#c76a94",ink:"#a24d74",label:"バレンタイン",deco:["❤️","🍫","💝","🎁","❤️"],motif:["🍫","💝","❤️","🎁","🍫","💝"],bgimg:"bg-valentine.jpg",bgcolor:"#fbe4ee"},
    3:{frame1:"#fff0f4",frame2:"#ffdde7",soft:"#fff4f7",accent:"#f0a1b8",ink:"#b0576f",label:"ひな祭り",deco:["🎎","🌸","🌷","🍡","🌸"],motif:["🌸","🎎","🌷","🍡","🌸","🌷"],bgimg:"bg-hina.jpg",bgcolor:"#f7edf3"},
    4:{frame1:"#ffeaf2",frame2:"#ffd3e3",soft:"#fff2f7",accent:"#f39ab9",ink:"#b25c81",label:"桜",deco:["🌸","🌸","🦋","🌸","🌸"],motif:["🌸","🦋","🌸","🌷","🌸","🦋"]},
    5:{frame1:"#ecf9ec",frame2:"#d2efd2",soft:"#f1faf1",accent:"#7fc98a",ink:"#4f8a55",label:"新緑・こいのぼり",deco:["🎏","🌿","🍃","🌱","🎏"],motif:["🌿","🎏","🍃","🐝","🌱","🌿"]},
    6:{frame1:"#f1ebfa",frame2:"#e0d3f2",soft:"#f5f0fc",accent:"#a98ee0",ink:"#7a5aa0",label:"あじさい",deco:["☔","💜","🐌","🌧️","💜"],motif:["💜","☔","🐌","🌧️","🌷","💜"]},
    7:{frame1:"#e6f5fd",frame2:"#cee9f9",soft:"#eef8fd",accent:"#6fbde6",ink:"#3f83ac",label:"七夕",deco:["🎋","🎐","⭐","💧","🎋"],motif:["🎐","🎋","💧","⭐","🫧","🎐"]},
    8:{frame1:"#201640",frame2:"#3a2866",soft:"#f3eefc",accent:"#f5c542",ink:"#6a4a9a",label:"花火",deco:["🎇","🎆","✨","🎆","🎇"],motif:["🎆","🎇","✨","🏮","🎆","🎇"],big:true,bgimg:"bg-fw.jpg",bgcolor:"#160e2e"},
    9:{frame1:"#e8f0f8",frame2:"#d5e4f2",soft:"#eef4fa",accent:"#84acd6",ink:"#4f6f96",label:"お月見",deco:["🌙","🌾","🍇","🐰","🌾"],motif:["🌙","🌾","🍇","🐰","☁️","🌾"]},
    10:{frame1:"#ffefdf",frame2:"#ffdcc0",soft:"#fff4ea",accent:"#f0912f",ink:"#bb6a2e",label:"ハロウィン",deco:["🎃","👻","🦇","🍬","🕸️"],motif:["🎃","👻","🦇","🍬","🕸️","🎃"]},
    11:{frame1:"#fdeede",frame2:"#f6dabd",soft:"#fdf3e9",accent:"#dd8a48",ink:"#a05e28",label:"紅葉",deco:["🍁","🍂","🌰","🍄","🍁"],motif:["🍁","🍂","🌰","🍄","🍁","🍂"]},
    12:{frame1:"#eef5ec",frame2:"#dcecdc",soft:"#f2f8f1",accent:"#d0574a",ink:"#3f7a4e",label:"クリスマス",deco:["🎄","🎅","⛄","🎁","✨"],motif:["🎄","🎁","⛄","🦌","❄️","🎄"]}
  };

  /* ── 「今日の状況(rel)」で縁の見出しを差し替える（my-tenki-demo.html の run() と同一） ── */
  var REL_HEAD = {
    single:  { en:'運命の人との距離',  place:'出会いやすい場所' },
    crush:   { en:'気になる人との距離', place:'縁が動きやすい場所' },
    partner: { en:'ふたりの縁',       place:'ふたりの時間のヒント' },
    married: { en:'夫婦・家庭の縁',    place:'家庭の時間のヒント' },
    work:    { en:null,               place:'縁が活きる場所' }   // work は恋愛の項目を出さない
  };

  /* ── 鑑定チップ（運命カレンダーの dayMarks と同じ判定。プラス面だけ見せる） ── */
  var MK = {'🌈':'運命の人の日','🌷':'出会い・モテ運の日','🌸':'恋が動く日','🩷':'魅力が輝く','💰':'金運アップ','💼':'勝負運アップ','🌐':'対人運アップ','📚':'学びの日'};
  function chipMarks(r){
    var m = [], g = r.theme && r.theme.god;
    if (r.en && r.en.lv === 3) m.push('🌈'); else if (r.en && r.en.lv === 2) m.push('🌸');
    if (r.touka) m.push('🌷');
    if (g === '食神' || g === '傷官') m.push('🩷');
    if (g === '比肩' || g === '劫財') m.push('🌐');
    if (g === '偏財' || g === '正財') m.push('💰');
    if (g === '正官' || g === '偏官') m.push('💼');
    if (g === '偏印' || g === '印綬') m.push('📚');
    return m;
  }

  var WD = ['日','月','火','水','木','金','土'];
  var SERIF = '"Hiragino Mincho ProN","Yu Mincho","YuMincho",serif';
  var SANS  = '"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic","YuGothic",Meiryo,sans-serif';

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function strip(s){ return String(s == null ? '' : s).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''); }

  /* ── 部品 ── */
  // 左に色帯のあるミニカード（mail-sample の .sec）
  function sec(emoji, title, bodyHtml, a, bg, t){
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;border-collapse:separate;">'
      + '<tr><td style="background:' + bg + ';border:1px solid #efe7e3;border-left:4px solid ' + a + ';border-radius:15px;padding:11px 13px 11px 12px;">'
      + '<div style="font-size:12.5px;font-weight:800;color:' + a + ';margin:0 0 4px;"><span style="font-size:15px;">' + emoji + '</span>&nbsp;' + title + '</div>'
      + '<div style="font-size:12.5px;line-height:1.75;color:#5a4d47;">' + bodyHtml + '</div>'
      + '</td></tr></table>';
  }
  // ジャンル区切り見出し（mail-sample の .genre-h）
  function genre(label, sub, color){
    return '<div style="margin:18px 2px 2px;padding-top:13px;border-top:2px dotted #ecd9c4;font-family:' + SERIF + ';font-weight:800;font-size:14px;color:' + color + ';letter-spacing:.03em;">'
      + label + ' <span style="font-family:' + SANS + ';font-weight:600;font-size:10.5px;color:#9a8d84;">' + sub + '</span></div>';
  }
  // 色つきの囲み（今日はこれだけ／開運習慣 など）
  function box(bg, border, headColor, head, bodyColor, bodyHtml){
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;border-collapse:separate;">'
      + '<tr><td style="background:' + bg + ';border:1.5px solid ' + border + ';border-radius:12px;padding:12px 14px;">'
      + '<div style="font-size:12px;font-weight:800;letter-spacing:.06em;color:' + headColor + ';margin-bottom:4px;">' + head + '</div>'
      + '<div style="font-size:14px;font-weight:700;line-height:1.75;color:' + bodyColor + ';">' + bodyHtml + '</div>'
      + '</td></tr></table>';
  }
  function dot(hex, size){ return '<span style="display:inline-block;width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + hex + ';border:1px solid #d8d0cc;vertical-align:-1px;margin-right:4px;"></span>'; }

  function renderDailyMail(r, opts){
    opts = opts || {};
    var base = opts.assetBase || 'https://unkiyoho.jp/';
    var unsub = opts.unsubscribeUrl || (base + 'unsubscribe.html');
    var mypage = opts.mypageUrl || (base + 'mypage.html');
    var aishou = opts.aishouUrl || 'https://166unmei.com/';
    var T = THEMES[r.date.m] || THEMES[7];
    var rel = (r.user && r.user.rel) || 'single';
    var RH = REL_HEAD[rel] || REL_HEAD.single;
    var nick = esc(r.user.nick);
    var dateLabel = r.date.y + '年 ' + r.date.m + '月' + r.date.d + '日（' + r.date.wd + '）';
    var subject = '【' + r.date.m + '/' + r.date.d + '(' + r.date.wd + ')】' + r.subject;
    var crystal = '<img src="' + base + 'icon-crystal.png" width="15" height="15" alt="" style="width:15px;height:15px;vertical-align:-3px;border:0;">';
    var lk = r.lucky || {}, fo = r.fortunes || {};
    var h = [];

    /* ヘッダー */
    // 背景画像の月（1・2・3・8月）は mail-sample.html と同じく絵文字リボンを出さない
    if (!T.bgimg) h.push('<div style="text-align:center;font-size:' + (T.big ? 26 : 20) + 'px;letter-spacing:4px;line-height:1;padding:6px 0 9px;margin:2px 0 4px;border-bottom:1.5px dotted ' + T.accent + ';">' + T.deco.join(T.big ? ' ' : '&#12288;') + '</div>');
    h.push('<div style="text-align:center;padding-bottom:12px;border-bottom:1.5px dashed ' + T.accent + ';margin-bottom:14px;">'
      + '<div style="font-size:12px;font-weight:800;letter-spacing:.14em;color:' + T.ink + ';"><span style="font-size:15px;">🌤️</span>私だけの運気予報</div>'
      + '<div style="font-family:' + SERIF + ';font-size:13px;color:#6f5f57;margin-top:3px;letter-spacing:.06em;">' + dateLabel + '</div>'
      + '<div style="font-family:' + SERIF + ';font-size:19px;font-weight:800;color:#e0699a;margin-top:9px;line-height:1.45;">' + nick + 'さん、<span style="white-space:nowrap;">おはようございます☀️</span></div>'
      + (r.morning ? '<div style="font-size:12px;font-weight:700;color:#d06d93;margin-top:4px;">' + r.morning + '</div>' : '')
      + '<div style="font-size:12.5px;color:#6a5b53;line-height:1.7;margin-top:8px;">' + r.relIntro + '</div>'
      + '</div>');

    /* 🌙 今日の月／🍃 七十二候 */
    if (r.moon || r.kou){
      h.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 2px;border-collapse:separate;"><tr><td style="background:#f0eefa;background-image:linear-gradient(135deg,#eef1fb,#f4eef9);border:1px solid #c6c2e6;border-radius:12px;padding:11px 14px;">'
        + (r.moon ? '<div style="font-size:12.5px;font-weight:800;color:#6a5fb0;"><span style="font-size:20px;vertical-align:-3px;">' + r.moon.emoji + '</span>&nbsp; 今日の月：' + esc(r.moon.name)
          + (r.moon.text ? '<span style="color:#8a5cf6;"> ― ' + esc(r.moon.text) + '</span>' : '')
          + '<span style="font-weight:600;color:#8f88bd;">&nbsp; 月齢' + r.moon.age + '</span></div>' : '')
        + (r.kou ? '<div style="margin-top:7px;padding-top:7px;border-top:1px dashed #cfcbe8;font-size:12px;color:#463f5e;line-height:1.6;">🍃&nbsp; <b style="color:#6a5fb0;">七十二候</b>　' + esc(r.kou.sekki) + '・' + esc(r.kou.third) + '「' + esc(r.kou.name) + '」<br><span style="color:#8f88bd;font-size:11px;">（' + esc(r.kou.yomi) + '）</span></div>' : '')
        + '</td></tr></table>');
    }

    /* 🔮 今日のあなたの鑑定（運命カレンダーと同じ判定のチップ） */
    var good = r.grade && (r.grade.sym === '💮' || r.grade.sym === '◎');
    var marks = chipMarks(r);
    var kc = good ? (r.grade.sym === '💮' ? '#d6567e' : '#c9862a') : (marks.length ? '#d6567e' : '#8a93a8');
    var kbg = good ? (r.grade.sym === '💮' ? '#fdeef4' : '#fff6e6') : (marks.length ? '#fdeef4' : '#eef2f6');
    var chips = '';
    if (good) chips += '<span style="display:inline-block;font-size:11px;font-weight:800;background:' + kc + ';color:#ffffff;border:1px solid ' + kc + ';border-radius:20px;padding:3px 11px;margin:3px 4px 0 0;">' + r.grade.sym + ' ' + r.grade.label + '</span>';
    marks.forEach(function(x){ chips += '<span style="display:inline-block;font-size:11px;font-weight:800;background:#ffffff;color:' + kc + ';border:1px solid ' + kc + ';border-radius:20px;padding:3px 10px;margin:3px 4px 0 0;">' + x + ' ' + MK[x] + '</span>'; });
    if (!chips) chips = '<span style="font-size:12px;color:#8a7d74;">今日はおだやかに、縁を育てる日 🌱</span>';
    function krow(l, v){
      return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-collapse:separate;"><tr>'
        + '<td style="background:#ffffff;border:1px solid #efe9e6;border-right:0;border-radius:11px 0 0 11px;padding:9px 0 9px 12px;font-size:11px;color:#a08a80;font-weight:800;white-space:nowrap;">' + l + '</td>'
        + '<td align="right" style="background:#ffffff;border:1px solid #efe9e6;border-left:0;border-radius:0 11px 11px 0;padding:9px 12px 9px 8px;font-size:13px;font-weight:800;color:#5a4d47;text-align:right;">' + v + '</td></tr></table>';
    }
    h.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0;border-collapse:separate;"><tr><td style="background:' + kbg + ';background-image:linear-gradient(135deg,' + kbg + ',#ffffff);border:1.5px solid ' + kc + ';border-radius:16px;padding:12px 13px;">'
      + '<div style="font-size:11.5px;font-weight:800;color:' + kc + ';letter-spacing:.03em;">' + crystal + ' 今日のあなたの鑑定</div>'
      + '<div>' + chips + '</div>'
      + krow('🎯 開運アクション', esc(lk.action))
      + krow('🎨 ラッキーカラー', dot(lk.hex, 12) + esc(lk.color))
      + '<div style="font-size:10.5px;color:#8a7d74;line-height:1.55;margin-top:10px;">' + crystal + ' あなたの<b style="color:#d6567e;">命式（生年月日からの四柱推命）</b>をもとに読み解いた、<b style="color:#d6567e;">あなただけの毎日鑑定</b>。<b style="color:#d6567e;">運命カレンダー</b>とそのまま連動しています。</div>'
      + '</td></tr></table>');

    /* ☁️ 天気・運勢指数 */
    var idx = Math.max(0, Math.min(100, +r.index || 0));
    h.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td style="background:' + T.soft + ';border-radius:16px;padding:12px 14px;">'
      + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
      + '<td width="52" valign="middle" style="font-size:38px;line-height:1;">' + r.weather.icon + '</td>'
      + '<td valign="middle">'
      + '<div style="font-family:' + SERIF + ';font-size:17px;font-weight:800;color:' + T.ink + ';">' + esc(r.weather.name) + '</div>'
      + '<div style="font-size:11px;color:#9a8880;margin-top:2px;">運勢指数 <b style="color:' + T.ink + ';">' + idx + '</b> / 100</div>'
      + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;"><tr>'
      + (idx > 0 ? '<td width="' + idx + '%" height="7" style="height:7px;line-height:7px;font-size:0;background:' + T.accent + ';background-image:linear-gradient(90deg,' + T.accent + ',#ffd08a);border-radius:6px 0 0 6px;">&nbsp;</td>' : '')
      + (idx < 100 ? '<td height="7" style="height:7px;line-height:7px;font-size:0;background:#ebe6e3;border-radius:0 6px 6px 0;">&nbsp;</td>' : '')
      + '</tr></table></td></tr></table></td></tr></table>');
    h.push('<div style="font-size:12px;color:#6a5b53;margin:8px 0 0;text-align:center;line-height:1.65;">' + r.weatherMsg + '</div>');

    /* ✅ 今日はこれだけ／🌱 今日の開運習慣 */
    if (r.todayOne) h.push(box('#fff0ec', '#f0b060', '#c9862a', '✅ 今日はこれだけ', '#3a3f4e', r.todayOne).replace('background:#fff0ec;', 'background:#fff0ec;background-image:linear-gradient(135deg,#fff3e8,#ffe9f0);'));
    if (r.habit) h.push(box('#eaf6ed', '#7bbd8a', '#3f9d68', '🌱 今日の開運習慣　<span style="font-weight:600;color:#6a9a78;">コツコツ運気貯金</span>', '#33463a', r.habit).replace('margin-top:12px', 'margin-top:10px').replace('background:#eaf6ed;', 'background:#eaf6ed;background-image:linear-gradient(135deg,#eef8ee,#e6f4ec);'));

    /* 🎯 注目テーマ（関心登録がある人のみ）／🌅 今日のあなた／🔄 運気の巡り */
    if (r.focus) h.push(sec(r.focus.emoji || '🎯', '今日の注目：あなたが大切にしている「' + esc(r.focus.label) + '」', r.focus.text, '#c0392b', '#fff0ee'));
    h.push(sec('🌅', '今日のあなた', '今日のテーマは「' + r.theme.axis + '」（' + r.theme.mean + 'の巡り）。' + (r.theme.line ? r.theme.line + ' ' : '') + r.theme.message, '#c9862a', '#fff6e6'));
    if (r.juni && r.juni.text) h.push(sec('🔄', '今日の運気の巡り', r.juni.text, '#9a6cc4', '#f3eefb'));

    /* 💗 恋愛・ご縁（work は出さない） */
    var placeText = (rel === 'married' || rel === 'partner')
      ? '<b style="color:#9a6cc4;">' + esc(r.place.direction) + '</b> の方角や、<b style="color:#9a6cc4;">' + esc(r.place.nature) + '</b>・<b style="color:#9a6cc4;">' + esc(r.place.city) + '</b> で' + (rel === 'married' ? '家族と' : 'ふたりで') + '過ごすと、温かい流れが生まれやすいかもしれません。'
      : '良いご縁に出会いやすいのは <b style="color:#9a6cc4;">' + esc(r.place.direction) + '</b> の方角。<b style="color:#9a6cc4;">' + esc(r.place.nature) + '</b> や <b style="color:#9a6cc4;">' + esc(r.place.city) + '</b> あたりに、新しい出会いのきっかけがあるかも。';
    if (RH.en){
      h.push(genre('💗 恋愛・ご縁', '片想い／恋人／夫婦', '#d6567e'));
      h.push(sec('💗', RH.en, '<span style="display:inline-block;font-size:10.5px;font-weight:800;color:#ffffff;background:' + T.accent + ';padding:2px 9px;border-radius:20px;margin-right:5px;">' + esc(r.en.tag) + '</span>' + r.en.body, '#d6567e', '#fdeef4'));
      if (r.love && (rel === 'single' || rel === 'crush')) h.push(sec('💕', '今日の恋愛運', r.love, '#e0629a', '#fdeef5'));
      if (r.loveMove) h.push(sec('💌', '今日の恋の一手', r.loveMove, '#e0629a', '#fdeef5'));
      h.push(sec('📍', RH.place, placeText, '#9a6cc4', '#f4eefb'));
    }

    /* 💼 仕事／💰 金運／🌐 対人／📚 学び／🌿 健康 */
    h.push(genre('💼 仕事・チャレンジ', '会社員／営業／起業・面接', '#7a6cc4'));
    h.push(sec('💼', '仕事・勝負運', fo.work, '#7a6cc4', '#f0eefb'));
    h.push(genre('💰 お金・金運', '家計／投資／ビジネス', '#c9a227'));
    h.push(sec('💰', '金運', fo.money, '#c9a227', '#fdf7e3'));
    h.push(genre('🌐 対人・人間関係', '同僚／ママ友／仲間', '#4a90c2'));
    h.push(sec('🌐', '友達・対人運', fo.friend, '#4a90c2', '#eef5fb'));
    if (!RH.en) h.push(sec('📍', RH.place, placeText, '#9a6cc4', '#f4eefb'));
    if (fo.study){ h.push(genre('📚 学び・成長', '自分の学び／子供の学び', '#b5732a')); h.push(sec('📚', '今日の学び', fo.study, '#c08a2e', '#fbf3e3')); }
    h.push(genre('🌿 健康・コンディション', '自分／家族の体調', '#5fae8a'));
    h.push(sec('🌿', '体調・リラックス', fo.health, '#5fae8a', '#eef7f2'));

    /* 🗓 こよみメモ（該当日のみ） */
    var ki = (r.koyomi && r.koyomi.items) || [];
    if (ki.length){
      var TC = {good:'#2f8b56', rest:'#3f7bb8', care:'#cd5b56', turn:'#c07d28'};
      h.push(genre('🏠 暮らし・整え', '家事／お出かけ／転機', '#6a7a8f'));
      h.push(sec('🗓', '今日のこよみメモ', ki.map(function(it){
        return '<div style="margin:5px 0;">' + it.emoji + '&nbsp; <b style="color:' + (TC[it.tone] || '#5a6478') + ';">' + esc(it.label) + '</b>　' + it.text + '</div>';
      }).join(''), '#6a7a8f', '#f2f5f9'));
    }

    /* 🍀 今日のあなたのラッキー（2列） */
    function cell(l, v){ return '<td width="50%" valign="top" style="background:' + T.soft + ';border:1px solid #eee7e2;border-radius:10px;padding:7px 9px;font-size:11px;color:#6a5c55;"><div style="font-size:9.5px;color:#a08a80;font-weight:700;margin-bottom:1px;letter-spacing:.03em;">' + l + '</div>' + v + '</td>'; }
    var cells = [
      ['ラッキーカラー', dot(lk.hex, 11) + esc(lk.color)], ['ラッキー方角', esc(lk.direction)],
      ['ラッキー食材', esc(lk.food)], ['ラッキーナンバー', esc(lk.number)],
      ['開運アクション', esc(lk.action)], ['ラッキーアイテム', esc(lk.item)],
      ['ラッキースポット', esc(lk.spotNature) + '／' + esc(lk.spotCity)], ['おすすめの行動', esc(lk.act)]
    ];
    var grid = '<table role="presentation" width="100%" cellpadding="0" cellspacing="6" border="0" style="margin-top:2px;border-collapse:separate;">';
    for (var i = 0; i < cells.length; i += 2) grid += '<tr>' + cell(cells[i][0], cells[i][1]) + cell(cells[i+1][0], cells[i+1][1]) + '</tr>';
    grid += '</table>';
    var wear = lk.wear || (r.season && r.season.wear) || '';
    h.push(sec('🍀', '今日のあなたのラッキー', grid
      + (lk.menu && lk.menu.length ? '<div style="margin-top:6px;">🍽 おすすめメニュー：<b style="color:#e08637;">' + lk.menu.slice(0, 2).map(esc).join('・') + '</b></div>' : '')
      + (wear ? '<div style="margin-top:3px;">👗 今日の服：' + esc(wear) + '</div>' : ''), '#e08637', '#fff1e4'));

    /* 💡 ワンポイント／🍵 季節のたより */
    if (r.onepoint) h.push(sec('💡', '今日のワンポイント', r.onepoint, '#d38a12', '#fdf2d9'));
    if (r.season) h.push(sec('🍵', '季節のたより', r.season.word + (r.season.note ? '<div style="margin-top:6px;color:#8a7d74;">🌱 ' + r.season.note + '</div>' : ''), '#6fae7a', '#eef7ef'));

    /* 💞 1.66相性診断への導線＋シェア（全メール共通・必須） */
    var shareText = encodeURIComponent('毎朝あなただけの運勢が届く「私だけの運気予報」🌤 ずっと無料。60組に1組【1.66%】の奇跡の相性診断も！');
    var shareUrl = encodeURIComponent(aishou + (aishou.indexOf('?') < 0 ? '?' : '&') + 'ref=mail');
    h.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border-collapse:separate;"><tr><td align="center" style="background:#fdeef4;background-image:linear-gradient(135deg,#fdeef4,#fff3e8);border:1.5px solid #e8a8bd;border-radius:14px;padding:14px;text-align:center;">'
      + '<div style="font-size:13.5px;font-weight:800;color:#c14e77;line-height:1.6;">💞 気になる人との相性、調べてみない？</div>'
      + '<div style="margin-top:4px;font-size:11.5px;color:#8a6f7a;line-height:1.7;">60組に1組の奇跡【1.66%】── 生年月日ふたつで、ふたりの相性がすぐわかります。</div>'
      + '<a href="' + esc(aishou) + '" data-aishou="1" style="display:inline-block;margin-top:9px;background:#d8466a;background-image:linear-gradient(135deg,#e86a94,#d8466a);color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;border-radius:999px;padding:10px 22px;">1.66 相性診断をやってみる（無料）</a>'
      + '<div style="margin-top:12px;padding-top:10px;border-top:1px dashed #e8c8d4;font-size:10.5px;color:#a08a80;">🎁 お友達にもシェアして、いっしょに占ってみてね</div>'
      + '<div style="margin-top:7px;">'
      + '<a href="https://social-plugins.line.me/lineit/share?url=' + shareUrl + '" style="display:inline-block;background:#06c755;color:#ffffff;font-size:11.5px;font-weight:800;text-decoration:none;border-radius:999px;padding:8px 16px;margin:2px;">LINEで送る</a>'
      + '<a href="https://twitter.com/intent/tweet?text=' + shareText + '&url=' + shareUrl + '" style="display:inline-block;background:#1d1f23;color:#ffffff;font-size:11.5px;font-weight:800;text-decoration:none;border-radius:999px;padding:8px 16px;margin:2px;">𝕏 でシェア</a>'
      + '</div></td></tr></table>');

    /* 📖 ことばのメモ */
    h.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border-collapse:separate;"><tr><td style="background:#f3f1f6;border:1px solid #e2dced;border-radius:12px;padding:11px 13px;">'
      + '<div style="font-size:11px;font-weight:800;color:#8a7fb0;letter-spacing:.04em;margin-bottom:6px;">📖 ことばのメモ</div>'
      + '<div style="font-size:11px;color:#6f6880;line-height:1.85;"><b style="color:#6a5fb0;">七十二候（しちじゅうにこう）</b>… 二十四節気をさらに約5日ずつ、72に分けた日本の昔ながらの季節の暦。花や生きもの、気候の移ろいを短い言葉で表しています。<br>'
      + '<b style="color:#6a5fb0;">月齢（げつれい）</b>… 新月から数えた日数のこと。0が新月、約15で満月、約29.5でまた新月にもどります。</div>'
      + '</td></tr></table>');

    /* 締め＋法定フッター */
    h.push('<div style="text-align:center;margin-top:15px;padding-top:13px;border-top:1.5px dashed ' + T.accent + ';">'
      + '<div style="font-family:' + SERIF + ';font-size:12.5px;color:' + T.ink + ';line-height:1.7;">' + (r.closeWord || '— あなたの縁が、また一歩<br>ひらけますように。') + '</div>'
      + '<div style="font-family:' + SERIF + ';font-size:13px;font-weight:800;color:' + T.ink + ';margin-top:6px;letter-spacing:.06em;">🌤️ 私だけの運気予報</div>'
      + '<div style="display:inline-block;margin-top:9px;font-size:10px;color:#b0a09a;border:1px dashed #ccbbbb;border-radius:10px;padding:4px 10px;">毎朝6時ごろ・あなた専用にお届け 💌</div>'
      + '<div style="margin-top:8px;font-size:11px;color:#8a7d75;line-height:1.8;">配信を停止する場合は <a href="' + esc(unsub) + '" style="color:#7a675e;text-decoration:underline;">こちら（ログイン不要で停止）</a>、設定変更は <a href="' + esc(mypage) + '" style="color:#7a675e;text-decoration:underline;">マイページ</a> から<br>送信者：72k株式会社／お問い合わせ：info@72k.ai</div>'
      + '<div style="margin-top:6px;font-size:9px;color:#b8aba3;line-height:1.65;">本鑑定は四柱推命の伝統的な考え方（扶抑を軸とした解釈）にもとづく目安です。運勢指数は当サービス独自の指数で、四柱推命に公式の点数はありません。娯楽・参考としてお楽しみください。</div>'
      + '</div>');

    /* ── 外枠：季節の便箋（背景画像の月は画像＋単色フォールバック、それ以外はグラデーション＋単色フォールバック） ── */
    var mo = T.motif;
    var frameBg = T.bgimg
      ? 'background:' + (T.bgcolor || T.frame1) + ' url(\'' + base + T.bgimg + '\') center/cover;'
      : 'background:' + T.frame1 + ';background-image:linear-gradient(160deg,' + T.frame1 + ',' + T.frame2 + ');';
    var framePad = T.bgimg ? '26px 22px 26px' : '10px 14px 12px';
    var motifRow = function(a, b, top){
      if (T.bgimg) return '';
      return '<tr><td style="padding:' + (top ? '0 4px 6px' : '6px 4px 0') + ';"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
        + '<td align="left" style="font-size:22px;line-height:1;">' + a + '</td><td align="right" style="font-size:22px;line-height:1;">' + b + '</td></tr></table></td></tr>';
    };
    var preheader = strip(r.todayOne || r.weatherMsg || '');
    var html = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>' + esc(subject) + '</title></head>'
      + '<body style="margin:0;padding:0;background:#f6eee9;-webkit-text-size-adjust:100%;">'
      + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' + esc(preheader) + '</div>'
      + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6eee9" style="background:#f6eee9;"><tr><td align="center" style="padding:22px 10px 40px;">'
      + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:440px;width:100%;border-collapse:separate;font-family:' + SANS + ';color:#4a3f3a;">'
      + '<tr><td bgcolor="' + (T.bgcolor || T.frame1) + '" style="' + frameBg + 'border-radius:26px;padding:' + framePad + ';">'
      + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
      + motifRow(mo[0], mo[1], true)
      + '<tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:20px;padding:18px 17px 18px;border:1px solid #ffffff;">'
      + h.join('')
      + '</td></tr>'
      + motifRow(mo[2], mo[3], false)
      + '</table></td></tr></table>'
      + '</td></tr></table></body></html>';

    /* ── テキスト版（HTMLを表示できない環境・迷惑メール判定対策） ── */
    var t = [];
    t.push('私だけの運気予報　' + dateLabel, '', r.user.nick + 'さん、おはようございます', strip(r.relIntro), '');
    t.push('■ 今日の運勢：' + r.weather.name + '（運勢指数 ' + idx + '/100）', strip(r.weatherMsg), '');
    if (r.todayOne) t.push('■ 今日はこれだけ', strip(r.todayOne), '');
    t.push('■ 今日のあなた', strip(r.theme.message), '');
    if (RH.en) t.push('■ ' + RH.en, '[' + r.en.tag + '] ' + strip(r.en.body), '');
    t.push('■ 仕事・勝負運', strip(fo.work), '', '■ 金運', strip(fo.money), '', '■ 友達・対人運', strip(fo.friend), '', '■ 体調・リラックス', strip(fo.health), '');
    t.push('■ ラッキー', 'カラー：' + lk.color + '／方角：' + lk.direction + '／食材：' + lk.food + '／ナンバー：' + lk.number, '');
    t.push('1.66 相性診断（無料）：' + aishou, '', '配信停止（ログイン不要）：' + unsub, '設定変更：' + mypage, '送信者：72k株式会社／お問い合わせ：info@72k.ai');

    return { subject: subject, html: html, text: t.join('\n') };
  }

  var api = { renderDailyMail: renderDailyMail, THEMES: THEMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UnkiMail = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
