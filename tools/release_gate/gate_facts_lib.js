// gate_facts.mjs の照合の中身（PRO のページの中で動かす。アプリの計算関数をそのまま使い、計算エンジンには触れない）
// window.__FACTS.check(rec) → [{kind, sev:'NG'|'要確認', src, snip, expect}]
window.__FACTS = (function () {
  const G = '甲乙丙丁戊己庚辛壬癸', Z = '子丑寅卯辰巳午未申酉戌亥', GZ = '[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]';
  const EL = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const TS = '比肩|劫財|食神|傷官|偏財|正財|偏官|正官|偏印|印綬';
  const WD = '日月火水木金土';
  const gzY = y => { const i = ((y - 4) % 60 + 60) % 60; return G[i % 10] + Z[i % 12]; };
  const valid60 = s => s && s.length === 2 && G.indexOf(s[0]) >= 0 && Z.indexOf(s[1]) >= 0 && (G.indexOf(s[0]) % 2) === (Z.indexOf(s[1]) % 2);
  const tr = (y, m, d, h, mi) => _pkTransit(y, m, d, h == null ? 12 : h, mi == null ? 0 : mi).pillars;
  const dayGz = (y, m, d) => tr(y, m, d, 12, 0)[2].ganzhi;
  const monGzOfDay = (y, m, d) => tr(y, m, d, 23, 59)[1].ganzhi;      // 節入りの日は新しい月（pkSmBr と同じ）
  const yearGzOfDay = (y, m, d) => tr(y, m, d, 23, 59)[0].ganzhi;     // 立春で切りかわる年
  const wd = (y, m, d) => WD[new Date(y, m - 1, d, 12).getDay()];
  const mk = (s) => { const run = () => baziCompute({ year: s[0], month: s[1], day: s[2], hour: s[6] ? 12 : s[3], minute: s[6] ? 0 : s[4], sex: s[5], tu: !!s[6] }, '', 'none'); const c = (typeof pkWithOpts === 'function' && typeof pkOptsOf === 'function') ? pkWithOpts(pkOptsOf({}), run) : run(); return s[6] ? markTimeUnknown(c) : c; };
  const RIKUGO = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
  const KEI = { 子: '卯', 丑: '未戌', 寅: '巳申', 卯: '子', 辰: '辰', 巳: '寅申', 午: '午', 未: '丑戌', 申: '寅巳', 酉: '酉', 戌: '丑未', 亥: '亥' };
  const SANGO = ['申子辰', '亥卯未', '寅午戌', '巳酉丑'], HOGO = ['亥子丑', '寅卯辰', '巳午未', '申酉戌'];
  const KANGO = ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'];
  const chong = (a, b) => Math.abs(Z.indexOf(a) - Z.indexOf(b)) === 6;
  const kanChong = (a, b) => { const i = G.indexOf(a), j = G.indexOf(b); return (i - j + 10) % 10 === 6 || (j - i + 10) % 10 === 6; };   // 天干の剋（7つ目）＝天戦
  const sameSet = (s, t) => s.length === t.length && [...s].every(ch => t.indexOf(ch) >= 0);
  let STARS = []; try { STARS = Object.keys(KICHI_DESC).filter(k => !/空亡/.test(k)); } catch (e) {}
  STARS = [...new Set(STARS.concat(['天乙貴人', '大極貴人', '福星貴人', '文昌貴人', '羊刃', '飛刃', '暗禄', '金与禄', '紅艶', '天徳貴人', '月徳貴人', '天徳合', '月徳合', '華蓋', '咸池', '駅馬', '劫殺', '亡神', '血刃', '囚獄', '隔角', '妨害殺', '日刃', '禄馬貴人']))].filter(s => s.length >= 2).sort((a, b) => b.length - a.length);
  const STAR_RE = new RegExp('(' + STARS.join('|') + ')', 'g');

  // 本人・お相手の計算
  function person(s, today) {
    const c = mk(s); const T = today; const ML = monthFortuneList(c, 15).filter(e => e && e.calYear);
    const df = c.decadeFortunes || []; const du0 = { ganzhi: c.pillars[1].ganzhi, stem: c.pillars[1].stem, branch: c.pillars[1].branch };
    let cur = null; try { cur = pkDuAtDate(c, T); } catch (e) {}
    const curGz = cur && cur.ganzhi ? cur.ganzhi : du0.ganzhi;
    const pills = c.pillars.filter((p, i) => !(s[6] && i === 3));
    const ling = p => { const h = (p.hiddenStems || []).find(x => x.ling) || (p.hiddenStems || [])[0]; return h || null; };
    const natalStars = new Set(); pills.forEach(p => { try { pillarKichi(c, p).forEach(x => natalStars.add(x)); } catch (e) {} });
    try { if (kaigouOn(c)) natalStars.add('魁罡'); } catch (e) {}
    if (['丙午', '戊午', '壬子'].includes(c.pillars[2].ganzhi)) natalStars.add('日刃');
    if (['壬午', '癸巳'].includes(c.pillars[2].ganzhi)) natalStars.add('禄馬貴人');
    return { s, c, ML, by: s[0], du: [du0].concat(df), duSet: new Set([du0.ganzhi].concat(df.map(x => x.ganzhi))), curGz, ku: kubo(c), pills, ling, natalStars, tu: !!s[6] };
  }
  const starsAt = (P, pl) => { const o = new Set(); try { meguriKichi(P.c, pl.stem, pl.branch).forEach(x => o.add(x)); } catch (e) {} try { (kingunEval(P.c, pl).stars || []).forEach(x => o.add(x)); } catch (e) {} return o; };

  // 文の前処理：読み仮名のかっこを外す
  const prep = t => String(t || '').split('\n').filter(l => !/\t/.test(l) && !/根拠チェック|ツールが計算どおりに直しました|ツールが直した|計算どおり\s*$/.test(l)).join('\n').replace(/[（(]\d{4}年\d{1,2}月\d{1,2}日の立春まで[）)]/g, '').replace(/[（(][ぁ-んー・、\s]{1,24}[）)]/g, '').replace(/\r/g, '');
  const sentences = t => t.split(/(?<=[。！？!?])|\n/).map(x => x.trim()).filter(Boolean);

  function check(rec) {
    const out = []; const seen = new Set();
    const J = jstNow(); const T = new Date(J.y, J.m - 1, J.d, 12);
    const NY = (() => { try { return pkNenInfo().Y; } catch (e) { return J.y; } })();
    const plain = rec.site === 'beginner';
    const A = rec.A ? person(rec.A, T) : (rec.eb ? person([rec.eb[0], rec.eb[1], rec.eb[2], 12, 0, 'female', true], T) : null);
    const B = rec.B ? person(rec.B, T) : null;
    const two = !!rec.compat; const PS = [A, B].filter(Boolean);
    const add = (kind, sev, src, snip, expect) => { const k = kind + '|' + snip + '|' + expect; if (seen.has(k)) { const f = out.find(x => x.kind + '|' + x.snip + '|' + x.expect === k); if (f && f.src.split(',').indexOf(src) < 0) f.src += ',' + src; return; } seen.add(k); out.push({ kind, sev, src, snip: String(snip).slice(0, 260), expect: expect || '' }); };
    // 年のない「M月D日」「M月」の年を決める：同じ文の前に西暦があればそれ、なければ今日から見て -45日〜+320日に入る年
    const resolveY = (m, d, ctxY) => { if (ctxY) return ctxY; let best = null; const lo = d ? -3 : -20; for (const y of [J.y - 1, J.y, J.y + 1, J.y + 2]) { const dt = new Date(y, m - 1, d || 20, 12); const k = (dt - T) / 86400000; if (k >= lo && k <= 400) { if (!best || dt < best) best = dt; } } return best ? best.getFullYear() : J.y; };
    const ycands = (m, d, ctxY) => [...new Set([resolveY(m, d, null), ctxY].filter(Boolean))];
    const yearCtxBefore = (s, idx) => { const pre = s.slice(Math.max(0, idx - 40), idx); const m = [...pre.matchAll(/((?:19|20)\d\d)年(?!\d)/g)]; return m.length ? +m[m.length - 1][1] : null; };
    const mlEntry = (P, y, m) => P.ML.find(e => e.calYear === y && e.calMonth === m) || null;
    const isKuuMonth = (P, y, m) => { const e = mlEntry(P, y, m); if (e) return pkKuuBadMonth(P.c, e.branch, e); const gz = tr(y, m, 20)[1]; return pkKuuBadMonth(P.c, gz.branch, { calYear: y, calMonth: m }); };
    const isKuuMonthOfDate = (P, dt) => { const gz = monGzOfDay(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()); const e = P.ML.find(x => x.ganzhi === gz && Math.abs(new Date(x.calYear, x.calMonth - 1, 20) - dt) < 40 * 86400000); if (e) return pkKuuBadMonth(P.c, e.branch, e); return pkKuuBadMonth(P.c, gz[1], dt); };
    const kuuDay = (P, dt) => pkKuuDay(P.c, dayGz(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())[1]);

    const SRC = Object.entries(rec.texts || {}).filter(([k, v]) => v && v.length > 0);
    const AI_SRC = new Set(['body', 'screen', 'chat', 'share', 'pdf', 'sheet', 'kg', 'copyScript', 'copyTalk']);
    for (const [src, raw] of SRC) {
      const t = prep(raw);
      // ── 1. 日付と曜日・日付の干支 ──
      for (const m of t.matchAll(/(?:((?:19|20)\d\d)年)?(\d{1,2})月(\d{1,2})日[）)]?(?:\s*[（(]([^（）()\n]{1,24})[）)]|(?:は|の|、)?([日月火水木金土])曜)/g)) {
        const mo = +m[2], d = +m[3]; if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;
        const Ys = m[1] ? [+m[1]] : ycands(mo, d, yearCtxBefore(t, m.index)); const y = Ys[0]; const dt = new Date(y, mo - 1, d, 12); if (dt.getMonth() !== mo - 1) { add('ありえない日付', 'NG', src, m[0], ''); continue; }
        const toks = m[4] ? m[4].split(/[・、,／/\s]+/) : [m[5] + '曜'];
        for (const tk of toks) {
          let w = tk.match(/^([日月火水木金土])(?:曜日?)?$/) || tk.match(/^([日月火水木金土])曜日?/);
          if (w && (tk.length === 1 || /曜/.test(tk))) { const ok = wd(y, mo, d); if (!Ys.some(yy => wd(yy, mo, d) === w[1])) add('日付と曜日のまちがい', 'NG', src, m[0], `${y}年${mo}月${d}日は${ok}曜日`); }
          const g = tk.match(new RegExp('^(' + GZ + ')(の日|日|の月|月|の年|年)?$'));
          if (g && valid60(g[1])) { const kind = /月/.test(g[2] || '') ? 'm' : /年/.test(g[2] || '') ? 'y' : 'd';
            const f = yy => kind === 'd' ? dayGz(yy, mo, d) : kind === 'm' ? monGzOfDay(yy, mo, d) : yearGzOfDay(yy, mo, d); const ok = f(y);
            if (!Ys.some(yy => f(yy) === g[1])) add(kind === 'd' ? '日の干支のまちがい' : kind === 'm' ? '月の干支のまちがい' : '年の干支のまちがい', 'NG', src, m[0], `${y}年${mo}月${d}日の${kind === 'd' ? '日' : kind === 'm' ? '月' : '年'}の干支は${ok}`); }
        }
      }
      for (const m of t.matchAll(new RegExp('(?:((?:19|20)\\d\\d)年)?(\\d{1,2})月(\\d{1,2})日(?:[（(][^）)]*[）)])?は(' + GZ + ')の日', 'g'))) { const mo = +m[2], d = +m[3]; const Ys = m[1] ? [+m[1]] : ycands(mo, d, yearCtxBefore(t, m.index)); const y = Ys[0]; const ok = dayGz(y, mo, d); if (!Ys.some(yy => dayGz(yy, mo, d) === m[4])) add('日の干支のまちがい', 'NG', src, m[0], `${y}年${mo}月${d}日は${ok}の日`); }
      // ── 2. 年の干支・月の干支 ──
      for (const m of t.matchAll(new RegExp('((?:19|20)\\d\\d)年(?!\\d{1,2}月)[（(のは：:]?(' + GZ + ')(?![^\\n]{0,3}(?:大運|月|日|時|柱))', 'g'))) { if (!valid60(m[2])) continue; const ok = gzY(+m[1]); if (m[2] !== ok) add('年の干支のまちがい', 'NG', src, m[0], `${m[1]}年は${ok}`); }
      for (const m of t.matchAll(new RegExp('(' + GZ + ')年[（(]((?:19|20)\\d\\d)年?[）)]', 'g'))) { if (!valid60(m[1])) continue; const ok = gzY(+m[2]); if (m[1] !== ok) add('年の干支のまちがい', 'NG', src, m[0], `${m[2]}年は${ok}`); }
      for (const m of t.matchAll(new RegExp('(?:((?:19|20)\\d\\d)年)?(\\d{1,2})月(?!\\d{0,2}日)(?:〜(?:翌)?\\d{1,2}月上旬)?[（(](' + GZ + ')(?:の月|月)?[）)・〔]', 'g'))) {
        const mo = +m[2]; if (mo < 1 || mo > 12 || !valid60(m[3])) continue; const Ys = m[1] ? [+m[1]] : ycands(mo, 0, yearCtxBefore(t, m.index)); const y = Ys[0];
        const ok20 = tr(y, mo, 20)[1].ganzhi, ok1 = tr(y, mo, 1)[1].ganzhi; if (!Ys.some(yy => tr(yy, mo, 20)[1].ganzhi === m[3] || tr(yy, mo, 1)[1].ganzhi === m[3])) add('月の干支のまちがい', 'NG', src, m[0], `${y}年${mo}月の月の干支は${ok20}（節入りまでは${ok1}）`); }
      // ── 3. 年齢 ──
      if (PS.length) {
        const ages = (Y) => PS.map(P => Y - P.by);
        const ageChk = (Y, a, snip) => { if (Y < 1900 || Y > 2100) return; const ok = ages(Y); if (ok.indexOf(a) < 0) { const near = ok.some(x => Math.abs(x - a) <= 1); add('年齢のまちがい', near || two || B ? 'NG' : 'NG', src, snip, `${Y}年は ${PS.map(P => (P === A ? (two ? '本人' : '') : 'お相手') + (Y - P.by) + '歳').join('・')}`); } };
        for (const m of t.matchAll(/((?:19|20)\d\d)年[（(][^）)\n]{0,12}?(\d{1,3})歳/g)) ageChk(+m[1], +m[2], m[0]);
        for (const m of t.matchAll(/((?:19|20)\d\d)年(?:の|に|には|で|、)(\d{1,3})歳/g)) ageChk(+m[1], +m[2], m[0]);
        for (const m of t.matchAll(/(\d{1,3})歳[（(]((?:19|20)\d\d)年/g)) ageChk(+m[2], +m[1], m[0]);
      }
      // ── 4. 今年・来年 ──
      { const REL = { 今年: 0, 来年: 1, 再来年: 2, 昨年: -1, 去年: -1 }; for (const m of t.matchAll(/(再来年|今年|来年|昨年|去年)[（(の]((?:19|20)\d\d)/g)) { const ok = NY + REL[m[1]]; if (+m[2] !== ok) add('今年・来年の西暦のまちがい', 'NG', src, m[0], `${m[1]}＝${ok}年（年運の年・立春で切りかわる）`); }
        for (const m of t.matchAll(/((?:19|20)\d\d)年[（(](今年|来年|再来年)[）)]/g)) { const ok = NY + REL[m[2]]; if (+m[1] !== ok) add('今年・来年の西暦のまちがい', 'NG', src, m[0], `${m[2]}＝${ok}年`); } }
      // ── 5. 六十干支にない形・天中殺・くずれ ──
      for (const m of t.matchAll(/([甲丙戊庚壬][丑卯巳未酉亥]|[乙丁己辛癸][子寅辰午申戌])/g)) { if (m[1] === '丁子') continue; const ctx = t.slice(Math.max(0, m.index - 12), m.index + 14); add('六十干支にない形', 'NG', src, ctx, '六十干支にない（十干と十二支の陰陽が合わない）'); }
      for (const m of t.matchAll(/天中殺/g)) add('「天中殺」と書いた', src === 'ui' ? '要確認' : 'NG', src, t.slice(Math.max(0, m.index - 15), m.index + 15), '空亡（ビギナーはひと休みの時期）');
      for (const m of t.matchAll(/(彼|彼女|お相手さん)の(月|日)(?:なので|は避け|〕)/g)) add('空亡の印が名前に戻った（「彼の月」）', 'NG', src, t.slice(Math.max(0, m.index - 20), m.index + 15), '〔お相手は空亡〕の月');
      for (const m of t.matchAll(/〔([^〕\n]{0,20})〕/g)) { if (/(さん|彼|彼女|花子|さくら)/.test(m[1]) && /(空亡|ひと休み)/.test(m[1])) add('空亡の印が名前に戻った（「彼の月」）', 'NG', src, m[0], '〔お相手は空亡〕'); }
      for (const m of t.matchAll(/〔[^〕\n]{0,30}(?=\n|$)/g)) if (!/〕/.test(t.slice(m.index, m.index + 40))) add('くずれた〔〕（閉じていない）', 'NG', src, t.slice(Math.max(0, m.index - 10), m.index + 30), '');
      if (/[\*＊]/.test(raw)) { const i = raw.search(/[\*＊]/); add('アスタリスク（＊）が出ている', 'NG', src, raw.slice(Math.max(0, i - 20), i + 20), ''); }
      // ── 6. 十干の陰陽・五行 ──
      for (const m of t.matchAll(/([甲乙丙丁戊己庚辛壬癸])(?![子丑寅卯辰巳午未申酉戌亥])[（(]?(?:は|＝|=|：)?(陽|陰)の(木|火|土|金|水)/g)) { const i = G.indexOf(m[1]); const ok = (i % 2 ? '陰' : '陽') + 'の' + EL[m[1]]; if (m[2] + 'の' + m[3] !== ok) add('十干の陰陽・五行のまちがい', 'NG', src, m[0], m[1] + '＝' + ok); }
      // ── 7. 合・冲・刑・三合・方合（表どおりか）／害・破 ──
      for (const m of t.matchAll(/([子丑寅卯辰巳午未申酉戌亥])(?:と|・|×|-)?([子丑寅卯辰巳午未申酉戌亥])(?:の|が|で|は)?「?(支合|六合|冲|七冲|対冲|刑|半会|半合)/g)) {
        const a = m[1], c2 = m[2], r = m[3]; let ok = true, exp = '';
        if (/支合|六合/.test(r)) { ok = RIKUGO[a] === c2; exp = a + 'の支合は' + RIKUGO[a]; }
        else if (/冲/.test(r)) { ok = chong(a, c2); exp = a + 'の冲は' + Z[(Z.indexOf(a) + 6) % 12]; }
        else if (r === '刑') { ok = KEI[a].indexOf(c2) >= 0 || KEI[c2].indexOf(a) >= 0; exp = a + 'の刑は' + KEI[a]; if (a === c2 && /^(亥|午|辰|酉)$/.test(a) && two) { ok = false; exp = '2人のあいだの同じ十二支どうし（自刑）は刑に数えない'; } }
        else { ok = SANGO.some(s => s.indexOf(a) >= 0 && s.indexOf(c2) >= 0 && a !== c2) && /[子午卯酉]/.test(a + c2); exp = '半会は三合のうち子・午・卯・酉を含む2支だけ'; }
        if (!ok) add('合冲刑の組み合わせが表とちがう', 'NG', src, t.slice(Math.max(0, m.index - 6), m.index + m[0].length + 4), exp); }
      for (const m of t.matchAll(/([子丑寅卯辰巳午未申酉戌亥])・?([子丑寅卯辰巳午未申酉戌亥])・?([子丑寅卯辰巳午未申酉戌亥])の?(?:「)?(三合|方合)/g)) { const s3 = m[1] + m[2] + m[3]; const ok = (m[4] === '三合' ? SANGO : HOGO).some(x => sameSet(x, s3)); if (!ok) add('合冲刑の組み合わせが表とちがう', 'NG', src, m[0], m[4] + '＝' + (m[4] === '三合' ? SANGO : HOGO).join('・')); }
      for (const m of t.matchAll(/([甲乙丙丁戊己庚辛壬癸])(?:と|・|×)?([甲乙丙丁戊己庚辛壬癸])の?(?:「)?干合/g)) { if (!KANGO.some(k => sameSet(k, m[1] + m[2]))) add('合冲刑の組み合わせが表とちがう', 'NG', src, m[0], '干合＝' + KANGO.join('・')); }
      if (AI_SRC.has(src) && src !== 'screen') for (const m of t.matchAll(/([子丑寅卯辰巳午未申酉戌亥])(?:と|・|×)?([子丑寅卯辰巳午未申酉戌亥])の?(六害|支破|害|破)(?![談産綻損棄壊])/g)) add('害・破を使った（使わない決まり）', 'NG', src, t.slice(Math.max(0, m.index - 6), m.index + 16), '害・破は鑑定文に書かない');
      // ── 8. 柱の干支・日干・通変星（命式）／大運・年運・月運・日運の干支 ──
      if (PS.length) {
        const LBL = { 年柱: 0, 月柱: 1, 日柱: 2, 時柱: 3 };
        const whoOf = (s, idx) => { const pre = s.slice(Math.max(0, idx - 14), idx); if (two || B) { if (/(お相手|彼|彼女|相手)(さん)?の?$|(お相手|彼|彼女)(さん)?[はがの][^。]{0,6}$/.test(pre)) return [B]; if (/(本人|あなた|さくら|花子)(さん)?の?$/.test(pre)) return [A]; return PS; } return [A]; };
        for (const m of t.matchAll(new RegExp('(年柱|月柱|日柱|時柱)(?:の干支)?(?:は|が|の|：|:|＝|「|『|（|\\()*(' + GZ + ')(?![^。\\n]{0,2}(?:の年|年|の月|大運|の日))', 'g'))) {
          const i = LBL[m[1]]; const Ps = whoOf(t, m.index).filter(P => !(P.tu && i === 3)); if (!Ps.length) continue;
          if (/(の日|の月|の年|その日|この日|当日)の?$/.test(t.slice(Math.max(0, m.index - 6), m.index))) continue;   // 「その日の日柱」＝その日の干支の話
          if (!Ps.some(P => P.c.pillars[i].ganzhi === m[2])) add('柱の干支のまちがい', 'NG', src, t.slice(Math.max(0, m.index - 8), m.index + m[0].length + 4), Ps.map(P => (P === A ? '本人' : 'お相手') + 'の' + m[1] + '＝' + P.c.pillars[i].ganzhi).join('・')); }
        for (const m of t.matchAll(/日干(?:は|が|の|：|:|＝|「|『)*([甲乙丙丁戊己庚辛壬癸])(?![子丑寅卯辰巳午未申酉戌亥])/g)) { const Ps = whoOf(t, m.index); if (!Ps.some(P => P.c.dayMaster && (P.c.dayMaster.stem || P.c.pillars[2].stem) === m[1])) add('日干のまちがい', 'NG', src, t.slice(Math.max(0, m.index - 8), m.index + 12), Ps.map(P => (P === A ? '本人' : 'お相手') + '＝' + P.c.pillars[2].stem).join('・')); }
        for (const m of t.matchAll(new RegExp('(年柱|月柱|日柱|時柱)の(天干|地支|蔵干|干|支)(?:の(?:星|通変星))?(?:は|が|に|：|:|「|（|\\()*(' + TS + ')', 'g'))) {
          const i = LBL[m[1]]; const Ps = whoOf(t, m.index).filter(P => !(P.tu && i === 3)); if (!Ps.length) continue; if (i === 2 && /天干|干/.test(m[2])) continue;
          const exp = P => /天干|^干$/.test(m[2]) ? P.c.pillars[i].tenStar : (P.ling(P.c.pillars[i]) || {}).tenStar;
          if (!Ps.some(P => exp(P) === m[3])) add('柱の通変星のまちがい（蔵干は司令）', 'NG', src, t.slice(Math.max(0, m.index - 8), m.index + m[0].length + 2), Ps.map(P => (P === A ? '本人' : 'お相手') + 'の' + m[1] + 'の' + m[2] + '＝' + exp(P)).join('・')); }
        for (const m of t.matchAll(new RegExp('月支元命(?:は|が|の|：|:|「|（|\\()*(' + TS + ')', 'g'))) { const Ps = whoOf(t, m.index); const exp = P => { try { return naikakuPick(P.c) && (P.ling(P.c.pillars[1]) || {}).tenStar; } catch (e) { return (P.ling(P.c.pillars[1]) || {}).tenStar; } };
          if (!Ps.some(P => exp(P) === m[1])) add('柱の通変星のまちがい（蔵干は司令）', 'NG', src, m[0], '月支元命（司令）＝' + Ps.map(P => exp(P)).join('・')); }
        // 大運
        for (const m of t.matchAll(new RegExp('(今の|いまの|現在の|次の)?大運(?:は|が|の|：|:|＝|「|『|（|\\()*(' + GZ + ')|(' + GZ + ')(?:の)?大運', 'g'))) {
          const gz = m[2] || m[3]; if (!valid60(gz)) continue; const Ps = whoOf(t, m.index);
          if (!Ps.some(P => P.duSet.has(gz))) { add('大運の干支のまちがい（その人の大運にない）', 'NG', src, t.slice(Math.max(0, m.index - 8), m.index + m[0].length + 4), Ps.map(P => (P === A ? '本人' : 'お相手') + '：' + P.du.slice(0, 9).map(x => x.ganzhi).join('→')).join('／')); continue; }
          if (m[1] && /今|いま|現在/.test(m[1]) && !Ps.some(P => P.curGz === gz)) add('「今の大運」の干支のまちがい', 'NG', src, m[0], Ps.map(P => (P === A ? '本人' : 'お相手') + 'の今の大運＝' + P.curGz).join('・')); }
        // 年運・月運・日運（文の中に年・月・日があるときだけ）
        for (const s of sentences(t)) {
          for (const m of s.matchAll(new RegExp('(' + GZ + ')の(年運|月運|日運)|(年運|月運|日運)(?:は|が|の|：|:|「|（|\\()*(' + GZ + ')', 'g'))) {
            const gz = m[1] || m[4], kind = m[2] || m[3]; if (!valid60(gz)) continue;
            if (kind === '年運') { const ys = [...s.matchAll(/((?:19|20)\d\d)年(?!\d{1,2}月)/g)].map(x => +x[1]); if (ys.length && !ys.some(y => gzY(y) === gz)) add('年運の干支のまちがい', 'NG', src, s.slice(0, 160), ys.map(y => y + '年＝' + gzY(y)).join('・')); }
            if (kind === '月運') { const ms = [...s.matchAll(/(?:((?:19|20)\d\d)年)?(\d{1,2})月(?!\d{0,2}日)/g)]; if (ms.length) { const oks = ms.flatMap(x => { const mo = +x[2]; if (mo < 1 || mo > 12) return []; const y = x[1] ? +x[1] : resolveY(mo, 0, null); return [tr(y, mo, 20)[1].ganzhi, tr(y, mo, 1)[1].ganzhi]; }); if (oks.length && oks.indexOf(gz) < 0) add('月運の干支のまちがい', 'NG', src, s.slice(0, 160), '文中の月の干支＝' + [...new Set(oks)].join('・')); } }
            if (kind === '日運') { const ds = [...s.matchAll(/(?:((?:19|20)\d\d)年)?(\d{1,2})月(\d{1,2})日/g)]; if (ds.length) { const oks = ds.map(x => { const y = x[1] ? +x[1] : resolveY(+x[2], +x[3], null); return dayGz(y, +x[2], +x[3]); }); if (oks.indexOf(gz) < 0) add('日運の干支のまちがい', 'NG', src, s.slice(0, 160), '文中の日の干支＝' + oks.join('・')); } }
          } }
      }
      // ── 9. 空亡の印・空亡の年 ──
      if (PS.length) {
        const ptn = /〔([^〕\n]{0,24}(?:空亡|ひと休み)[^〕\n]{0,12})〕(の月|の日|の年)?/g;
        for (const m of t.matchAll(ptn)) {
          const tag = m[1]; if (/解空|解け|弱ま/.test(tag)) continue; if (/^の?印/.test(t.slice(m.index + m[0].length - (m[2] || '').length + (m[2] ? m[2].length : 0)).replace(/^(の年|の月|の日)/, ''))) continue;
          const pre = t.slice(Math.max(0, m.index - 80), m.index).replace(/^\d+/, ''); const line = pre.split(/[\n。]/).pop();
          // いちばん近い時の言葉
          const cand = [...line.matchAll(/(?:((?:19|20)\d\d)年)?(?:(\d{1,2})月(?:(\d{1,2})日)?)?/g)].filter(x => x[0] && (x[1] || x[2]));
          if (!cand.length && !/いま/.test(line)) continue; const x = cand.length ? cand[cand.length - 1] : null;
          const gran = /日〕|の日/.test(tag + (m[2] || '')) ? 'd' : /の月|月〕/.test(tag + (m[2] || '')) ? 'm' : (x && x[3] ? 'd' : x && x[2] ? 'm' : 'y');
          const who = /2人|ふたり/.test(tag) ? 'both' : /お相手/.test(tag) ? 'B' : /本人|あなた/.test(tag) ? 'A' : (two ? 'any' : 'A');
          const Ps = who === 'both' ? [A, B] : who === 'B' ? [B] : who === 'A' ? [A] : PS; if (Ps.some(P => !P)) continue;
          let res = null, what = '';
          // 「A〜Bは〔…〕の月」：範囲の始まりの日の月で見る
          const rg = line.match(/(?:((?:19|20)\d\d)年)?(\d{1,2})月(\d{1,2})日〜(?:(?:19|20)\d\d年)?\d{1,2}月\d{1,2}日は$/);
          const yr = /〔(\d{4})年は/.exec(m[0]);
          const lab = line.match(/(?:((?:19|20)\d\d)年)?(\d{1,2})月〜(?:翌)?\d{1,2}月上旬(?:（[^）]*）)?$/), labNow = /いま〜(?:翌)?\d{1,2}月上旬(?:（[^）]*）)?$/.test(line);
          if (labNow && gran !== 'd' && !yr) { const e = A.ML[0]; res = Ps.map(P => { const e2 = P.ML[0]; return pkKuuBadMonth(P.c, e2.branch, e2); }); what = 'いまの月（' + (e && e.ganzhi) + '）'; }
          else if (lab && gran !== 'd' && !yr) { const mo = +lab[2]; const Ys = lab[1] ? [+lab[1]] : ycands(mo, 0, yearCtxBefore(t, m.index - 48)); res = Ps.map(P => Ys.some(y => isKuuMonth(P, y, mo))); what = `${Ys[0]}年${mo}月（${tr(Ys[0], mo, 20)[1].ganzhi}の月）`; }
          else if (yr) { const Y = +yr[1]; res = Ps.map(P => pkKuuBad(P.c, Y)); what = Y + '年'; }
          else if (rg && gran !== 'd') { const mo = +rg[2], d = +rg[3]; const y = rg[1] ? +rg[1] : resolveY(mo, d, null); const dt = new Date(y, mo - 1, d, 12); res = Ps.map(P => isKuuMonthOfDate(P, dt)); what = `${y}年${mo}月${d}日からの月（${monGzOfDay(y, mo, d)}）`; }
          else if (!x) continue;
          else if (gran === 'd' && x[3]) { const mo = +x[2], d = +x[3]; const Ys = x[1] ? [+x[1]] : ycands(mo, d, yearCtxBefore(t, m.index - 48)); const y = Ys[0]; res = Ps.map(P => Ys.some(yy => kuuDay(P, new Date(yy, mo - 1, d, 12)))); what = `${y}年${mo}月${d}日（${dayGz(y, mo, d)}の日）`; }
          else if (gran === 'm' && x[2]) { const mo = +x[2]; const Ys = x[1] ? [+x[1]] : ycands(mo, 0, yearCtxBefore(t, m.index - 48)); const y = Ys[0]; if (x[3]) { res = Ps.map(P => Ys.some(yy => isKuuMonthOfDate(P, new Date(yy, mo - 1, +x[3], 12)))); what = `${y}年${mo}月${x[3]}日の月`; } else { res = Ps.map(P => Ys.some(yy => isKuuMonth(P, yy, mo))); what = `${y}年${mo}月（${tr(y, mo, 20)[1].ganzhi}の月）`; } }
          else if (gran === 'y' && x[1] && !x[2]) { const Y = +x[1]; res = Ps.map(P => pkKuuBad(P.c, Y)); what = Y + '年'; }
          else continue;
          const okNow = who === 'any' ? res.some(Boolean) : res.every(Boolean);
          if (!okNow) add('〔空亡〕の印のまちがい（計算では解けない空亡ではない）', 'NG', src, (line.slice(-40) + m[0]).replace(/\n/g, '⏎'), what + '：' + Ps.map((P, i) => (P === A ? '本人' : 'お相手') + (res[i] ? 'は解けない空亡' : 'は空亡でない（または解空）')).join('・'));
        }
        // 「YYYY年は空亡」：その年の十二支が空亡に入っているか（解空かどうかは問わない）
        for (const s of sentences(t)) {
          const ms = [...s.matchAll(/((?:19|20)\d\d)年(?!\d{1,2}月)(?:[（(][^）)]{0,14}[）)])?(?:は|が)?、?(?:[^。、]{0,6})?(空亡|ひと休み)の年/g)];
          for (const m of ms) { if (/〔/.test(m[0]) || /^の?印/.test(s.slice(m.index + m[0].length))) continue; const Y = +m[1]; const br = gzY(Y)[1]; const Ps = (two || B) ? (/(お相手|彼)/.test(s) && !/本人|あなた/.test(s) ? [B] : /本人|あなた/.test(s) && !/お相手|彼/.test(s) ? [A] : PS) : [A];
            if (!Ps.some(P => P.ku.indexOf(br) >= 0)) add('空亡でない年を空亡と書いた', 'NG', src, s.slice(0, 160), Y + '年（' + gzY(Y) + '）：' + Ps.map(P => (P === A ? '本人' : 'お相手') + 'の空亡＝' + P.ku.join('')).join('・')); }
        }
      }
      // ── 10. 吉凶星：その時・命式に本当にあるか ──
      if (PS.length && AI_SRC.has(src)) {
        for (const s of sentences(t)) {
          const hits = [...s.matchAll(STAR_RE)].map(x => x[1]); if (!hits.length) continue;
          if (/ない|なし|ありません|入らない|当たらない|ではない|がなく|一般に|とは|という星|の意味|とは、|例えば|たとえば|もし/.test(s)) continue;
          const ys = [...s.matchAll(/((?:19|20)\d\d)年(?!\d{1,2}月)/g)].map(x => +x[1]);
          const ms = [...s.matchAll(/(?:((?:19|20)\d\d)年)?(\d{1,2})月(?!\d{0,2}日)/g)].filter(x => +x[2] >= 1 && +x[2] <= 12).map(x => { const mo = +x[2]; return [x[1] ? +x[1] : resolveY(mo, 0, null), mo]; });
          const ds = [...s.matchAll(/(?:((?:19|20)\d\d)年)?(\d{1,2})月(\d{1,2})日/g)].filter(x => +x[2] >= 1 && +x[2] <= 12).map(x => { const mo = +x[2], d = +x[3]; return [x[1] ? +x[1] : resolveY(mo, d, null), mo, d]; });
          const natalCue = /命式|生まれ持|持って生まれ|生まれつき|年柱|月柱|日柱|時柱|配偶宮/.test(s);
          const transitCue = /巡|めぐ|やって|訪れ|来る|来ます|重な|入る|入ります|運気|年運|月運|日運|大運/.test(s);
          if (!ys.length && !ms.length && !ds.length && !natalCue) continue;
          const Ps = PS; const allow = new Set();
          Ps.forEach(P => { P.natalStars.forEach(x => allow.add(x));
            const addP = pl => starsAt(P, pl).forEach(x => allow.add(x));
            ys.forEach(Y => addP(tr(Y, 8, 6)[0])); ms.forEach(([y, mo]) => { addP(tr(y, mo, 20)[1]); addP(tr(y, mo, 1)[1]); }); ds.forEach(([y, mo, d]) => addP(tr(y, mo, d)[2]));
            if (transitCue || /大運|10年/.test(s)) P.du.forEach(du => addP(du));
            if (transitCue && !ys.length && !ms.length && !ds.length) { for (let k = 0; k < 4; k++) addP(tr(NY + k, 8, 6)[0]); P.ML.forEach(e => addP(e)); }
            if (ms.length || ds.length) { ys.forEach(Y => addP(tr(Y, 8, 6)[0])); }
          });
          if (/リーダー星/.test(s)) allow.add('魁罡');
          if (A && B) [[A, B], [B, A]].forEach(([P, Q]) => Q.pills.forEach(pl => starsAt(P, pl).forEach(x => allow.add(x))));
          for (const h of new Set(hits)) if (!allow.has(h)) add('吉凶星がその時・命式に巡らない', new RegExp(h + '）?／沐浴').test(s) ? '要確認' : 'NG', src, s.slice(0, 180), h + '：' + (ys.length || ms.length || ds.length ? '文中の時（' + [...ys.map(y => y + '年'), ...ms.map(x => x[0] + '年' + x[1] + '月'), ...ds.map(x => x[1] + '月' + x[2] + '日')].join('・') + '）にも' : '') + '命式にもない');
        }
      }
      // 魁罡（リーダー星）・律音・天戦地冲の言いすぎ
      if (PS.length) {
        for (const m of t.matchAll(/魁罡|リーダー星/g)) { const ctx = t.slice(Math.max(0, m.index - 30), m.index + 30); if (/ない|なし|入らない|ではない|一般に|とは|もし|魁罡日の人は|ほかの|を表示|表示（|リーダー星」とは/.test(ctx)) continue;
          const okk = PS.filter(P => P.natalStars.has('魁罡')); if (!okk.length) add('魁罡でない人に魁罡と書いた', 'NG', src, ctx.replace(/\n/g, '⏎'), '日柱＝' + PS.map(P => P.c.pillars[2].ganzhi).join('・') + '（魁罡は庚辰・庚戌・壬辰・壬戌・戊戌だけ）'); }
        if (two && A && B) {
          const pa = A.pills.map(p => p.ganzhi), pb = B.pills.map(p => p.ganzhi);
          const rit = pa.some(x => pb.indexOf(x) >= 0);
          if (!rit) for (const m of t.matchAll(/律音|合わせ鏡/g)) { const ctx = t.slice(Math.max(0, m.index - 30), m.index + 30); if (/ない|なし|ではない|もし|とは/.test(ctx)) continue; add('律音でない2人に律音と書いた', 'NG', src, ctx.replace(/\n/g, '⏎'), '本人 ' + pa.join('・') + '／お相手 ' + pb.join('・')); }
          const ts = A.pills.some(p => B.pills.some(q => kanChong(p.stem, q.stem) && chong(p.branch, q.branch)));
          if (!ts) for (const m of t.matchAll(/天戦地冲/g)) { const ctx = t.slice(Math.max(0, m.index - 40), m.index + 30); if (/ない|なし|ではない|もし|とは|年|大運|月/.test(ctx)) continue; add('天戦地冲でない2人に天戦地冲と書いた（要確認）', '要確認', src, ctx.replace(/\n/g, '⏎'), '2人の柱どうしに天戦地冲はない（年運・大運の話なら問題なし）'); }
        }
      }
      // ── 11. 空亡の月・日・年に重い動きをすすめていないか ──
      if (PS.length && AI_SRC.has(src) && src !== 'screen') {
        for (const s of sentences(t)) {
          if (!/(告白|プロポーズ|入籍|結婚|籍を入れ|復縁|転職|独立|起業|契約)/.test(s)) continue;
          if (!/(おすすめ|お勧め|向いて|チャンス|ベスト|最適|狙い目|好機|吉日|がよい|が良い|がいい|しましょう|してみて|動くなら|伝えるなら|タイミング|適して)/.test(s)) continue;
          if (/(避け|控え|ない|せず|ではなく|より|待|延ば|見送|注意|ひと休み|空亡|準備|以降|まで|ほうが|方が|まだ|早すぎ|外|過ぎ|でした|ました)/.test(s)) continue;
          const ds = [...s.matchAll(/(?:((?:19|20)\d\d)年)?(\d{1,2})月(\d{1,2})日/g)].filter(x => +x[2] >= 1 && +x[2] <= 12);
          const ms = [...s.replace(/(\d{1,2})月(\d{1,2})日/g, '').matchAll(/(?:((?:19|20)\d\d)年)?(\d{1,2})月/g)].filter(x => +x[2] >= 1 && +x[2] <= 12);
          const ys = [...s.matchAll(/((?:19|20)\d\d)年(?!\d{1,2}月)/g)];
          const n = ds.length + ms.length + (ds.length || ms.length ? 0 : ys.length); if (n !== 1) continue;
          const Ps = PS; let bad = [], what = '';
          if (ds.length) { const x = ds[0]; const mo = +x[2], d = +x[3]; const y = x[1] ? +x[1] : resolveY(mo, d, null); const dt = new Date(y, mo - 1, d, 12); if (dt - T > 400 * 86400000 || dt < T) continue;
            Ps.forEach(P => { if (kuuDay(P, dt)) bad.push((P === A ? '本人' : 'お相手') + 'の空亡の日'); else if (/(告白|プロポーズ|入籍|結婚|籍を入れ|復縁|転職|独立|起業|契約)/.test(s) && isKuuMonthOfDate(P, dt)) bad.push((P === A ? '本人' : 'お相手') + 'の解けない空亡の月'); }); what = `${y}年${mo}月${d}日`; }
          else if (ms.length) { const x = ms[0]; const mo = +x[2]; const y = x[1] ? +x[1] : resolveY(mo, 0, null); const dt = new Date(y, mo - 1, 20, 12); if (dt - T > 380 * 86400000 || dt < new Date(T - 20 * 86400000)) continue; Ps.forEach(P => { if (isKuuMonth(P, y, mo)) bad.push((P === A ? '本人' : 'お相手') + 'の解けない空亡の月'); }); what = `${y}年${mo}月`; }
          else { const Y = +ys[0][1]; if (!/(入籍|結婚|籍を入れ|独立|起業)/.test(s)) continue; Ps.forEach(P => { if (pkKuuBad(P.c, Y)) bad.push((P === A ? '本人' : 'お相手') + 'の解けない空亡の年'); }); what = Y + '年'; }
          if (bad.length) add('空亡の時期に重い動き（告白・結婚・転職など）をすすめた', 'NG', src, s.slice(0, 200), what + 'は' + bad.join('・') + '（避ける言い方に）');
        }
      }
    }
    // ── 12. 近い日の質問に何ヶ月先を答えていないか（本文の1行目） ──
    if (rec.q && /(明日|今日|明後日|あさって|今夜|今晩|今週|来週)/.test(rec.q) && rec.texts && (rec.texts.body || rec.texts.screen)) {
      const BODY = rec.texts.body || rec.texts.screen; const lines = BODY.split('\n').map(s => s.trim()).filter(s => s.length > 8 && !/^(コピー|言葉の意味|ご相談|▲|オンライン鑑定|オフライン鑑定|📵|⏩|🔄|端末の中で作った|🌟|【|木＝成長|📝)/.test(s) && s !== rec.q);
      const first = (lines[0] || '').split(/(?<=[。！？])/)[0] || '';
      let far = false; for (const m of first.matchAll(/(?:((?:19|20)\d\d)年)?(\d{1,2})月(?!\d{0,2}日)/g)) { const mo = +m[2]; if (mo < 1 || mo > 12) continue; const y = m[1] ? +m[1] : resolveY(mo, 0, null); if (new Date(y, mo - 1, 1) - T > 60 * 86400000) far = true; }
      const near = /今日|明日|明後日|あさって|今夜|今晩|今週|来週|数日|この1ヶ月|この一ヶ月|\d{1,2}日/.test(first);
      if (!first) add('近い日の質問：1行目が見つからない', '要確認', 'body', BODY.slice(0, 120), '');
      else if (!near) add('近い日の質問に、1行目で聞かれた日に答えていない', far ? 'NG' : '要確認', 'body', first.slice(0, 200), '1行目でまずその日（明日・来週など）がどうかに答える');
    }
    return out;
  }
  // 点検の点検：正しい文（ツールの計算から作る）では何も出ず、まちがえた文ではそれぞれの種類が出るか
  function selftest() {
    const J = jstNow(); const T = new Date(J.y, J.m - 1, J.d, 12); const NY = pkNenInfo().Y;
    const S = [1981, 6, 10, 22, 28, 'female', false]; const P = person(S, T); const c = P.c;
    const d1 = new Date(T.getTime() + 10 * 86400000); const y1 = d1.getFullYear(), m1 = d1.getMonth() + 1, dd1 = d1.getDate();
    const kuY = [NY, NY + 1, NY + 2, NY + 3, NY + 4, NY + 5, NY + 6, NY + 7, NY + 8, NY + 9, NY + 10, NY + 11].find(y => !P.ku.includes(gzY(y)[1]));
    const okLines = [
      `${m1}月${dd1}日（${wd(y1, m1, dd1)}・${dayGz(y1, m1, dd1)}）は落ち着いた日です。`,
      `${NY + 1}年（${gzY(NY + 1)}・${NY + 1 - 1981}歳）は動きやすい年です。`,
      `日柱は${c.pillars[2].ganzhi}、月柱は${c.pillars[1].ganzhi}です。今の大運は${P.curGz}です。`,
      `今年（${NY}年）の流れ。子と丑の支合、申子辰の三合。`,
    ];
    const bad = {
      '日付と曜日のまちがい': `${m1}月${dd1}日（${WD[(WD.indexOf(wd(y1, m1, dd1)) + 1) % 7]}）は落ち着いた日です。`,
      '日の干支のまちがい': `${m1}月${dd1}日（${dayGz(y1, m1, dd1 === 28 ? 1 : dd1 + 1)}）は落ち着いた日です。`,
      '年の干支のまちがい': `${NY + 1}年（${gzY(NY + 2)}）は動きやすい年です。`,
      '年齢のまちがい': `${NY + 1}年（${NY + 1 - 1981 + 3}歳）は動きやすい年です。`,
      '柱の干支のまちがい': `日柱は${c.pillars[0].ganzhi === c.pillars[2].ganzhi ? '甲子' : c.pillars[0].ganzhi}です。`,
      '大運の干支のまちがい（その人の大運にない）': `今の大運は${['甲子', '丙寅', '戊辰', '庚午', '壬申'].find(g => !P.duSet.has(g))}です。`,
      '今年・来年の西暦のまちがい': `今年（${NY + 1}年）の流れ。`,
      '六十干支にない形': `${NY}年は甲丑の年です。`,
      '「天中殺」と書いた': `天中殺の時期です。`,
      '空亡の印が名前に戻った（「彼の月」）': `12月7日〜1月5日は彼の月なので避けましょう。`,
      '合冲刑の組み合わせが表とちがう': `子と寅の支合があります。`,
      '害・破を使った（使わない決まり）': `子と未の害があります。`,
      '〔空亡〕の印のまちがい（計算では解けない空亡ではない）': `${kuY}年〔空亡〕は準備の年です。`,
      '空亡でない年を空亡と書いた': `${kuY}年は空亡の年です。`,
      '魁罡でない人に魁罡と書いた': kaigouOn(c) ? '' : `あなたは魁罡の生まれです。`,
    };
    const base = { id: 'selftest', site: 'pro', A: S, q: '', texts: { body: okLines.join('\n') } };
    const clean = check(base);
    const missed = [];
    for (const k in bad) { if (!bad[k]) continue; const f = check({ ...base, texts: { body: okLines.join('\n') + '\n' + bad[k] } }); if (!f.some(x => x.kind === k)) missed.push(k + '｜' + bad[k] + '｜出たもの：' + f.map(x => x.kind).join('・')); }
    return { clean, missed, n: Object.keys(bad).length };
  }
  return { check, selftest };
})();
