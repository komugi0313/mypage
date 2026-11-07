// 発売前の点検（事実の自動照合）：PRO・ビギナー・易を実際に動かして答えを作り、答えの全文（画面・LINE・チャット用コピー・印刷・鑑定書・日運月運の詳細鑑定）から
// 「日付と曜日・暦の干支（年＝立春・月＝節入り）・年齢・大運/年運/月運/日運の干支・柱の干支/日干/通変星（蔵干は司令）・空亡の年/月/日と〔空亡〕の印・
//  吉凶星が本当に巡るか・合冲刑三合方合の組み合わせ（害・破は使わない）・近い日の質問に何ヶ月先を答えていないか・空亡の月/日に告白など重い動きをすすめていないか・
//  六十干支にない形・天中殺・『彼の月』などのくずれ」を抜き出して、ツールの計算（同じアプリの関数）と照らし合わせる。
// 鑑定者本人の指示（2026-11-07「いつになったらミスが無くなるのか」）：お客様より先に、まちがいを探し切る仕組み。アプリのファイルは変えない（読むだけ）。
//
// 使い方：
//   node tools/release_gate/gate_facts.mjs                    … 速い点検（30件：オンライン20＋通信なし10。今日＝2026-11-07 と 2027-01-20）
//   node tools/release_gate/gate_facts.mjs --size full        … 多い点検（約320件：オンライン210＋通信なし110）
//   オプション：--today 2026-11-07,2027-01-20（今日の日付。日本時間10時で固定）／--mode online|offline|both／--sites pro,beginner,eki
//               --out <dir>（答えと結果を置く場所。既定 /tmp/gate_facts）／--par 6（同時に動かす画面の数。文章作成の呼び出しは同時に4つまで）
//               --check-only（作った答えをもう一度照合だけする）／--fresh（作り直す）／--redo <正規表現>（id が合うものだけ作り直す）／--limit N（先頭N件だけ）
//   環境変数 GEMINI_API_KEY（オンラインのとき。キーは表示・保存しない）
// 結果：<out>/report.json・<out>/report.md。NG（まちがい）が1件でもあれば終了コード1。「要確認」は不合格にしない。
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
import http from 'http'; import fs from 'fs'; import path from 'path'; import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
for (const k of ['URL', 'DEPLOY_PRIME_URL', 'MEMBER_CHECK_URL', 'ALLOWED_ORIGINS']) delete process.env[k];
const _log = console.log; console.log = (...a) => { const t = a.join(' '); if (/AIza|key=|≈¥|pro-cost/.test(t)) return; _log(...a); }; console.error = () => {}; console.warn = () => {};
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const ARG = (() => { const o = {}; const a = process.argv.slice(2); for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2); if (a[i + 1] && !a[i + 1].startsWith('--')) { o[k] = a[i + 1]; i++; } else o[k] = true; } } return o; })();
const SIZE = ARG.size || 'small', OUT = path.resolve(ARG.out || '/tmp/gate_facts'), PAR = +(ARG.par || 6), GEM_MAX = 4;
const TODAYS = String(ARG.today || '2026-11-07,2027-01-20').split(',');
const MODES = ARG.mode === 'online' ? ['online'] : ARG.mode === 'offline' ? ['offline'] : ['online', 'offline'];
const SITES = String(ARG.sites || 'pro,beginner,eki').split(',');
fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });

// ───────────── 人（生年月日）：魁罡・律音・天戦地冲・空亡の年が来る人・時刻不明・立春前生まれ などを混ぜる ─────────────
// [y,m,d,h,mi,sex,時刻不明, メモ]
const PEOPLE = [
  [1981, 6, 10, 22, 28, 'female', false, '基準の例（甲午・順行・立運8年6ヶ月）'],
  [1963, 8, 17, 7, 39, 'male', false, '魁罡（壬辰）・2026年が解けない空亡'],
  [2001, 4, 17, 1, 52, 'female', false, '魁罡（庚戌）'],
  [1970, 7, 17, 21, 43, 'female', false, '魁罡（戊戌）'],
  [1997, 6, 11, 12, 15, 'male', false, '2026年が解けない空亡'],
  [1985, 2, 14, 8, 9, 'female', false, '2026年が解けない空亡・立春のすぐあと生まれ'],
  [1979, 3, 24, 6, 13, 'male', false, '2027年が解けない空亡'],
  [1969, 3, 14, 9, 47, 'female', false, '2027年が解けない空亡'],
  [2002, 11, 3, 23, 12, 'male', false, '空亡＝申酉（2028・2029年）'],
  [1967, 3, 18, 0, 0, 'female', true, '時刻不明'],
  [1990, 5, 3, 0, 0, 'female', true, '時刻不明'],
  [1988, 12, 25, 4, 0, 'male', false, '冬生まれ'],
  [1975, 1, 5, 0, 0, 'female', true, '立春前生まれ・時刻不明'],
  [1995, 8, 8, 15, 30, 'female', false, '夏生まれ'],
  [2006, 6, 7, 0, 0, 'male', true, '時刻不明（gate_kuu の例）'],
  [2008, 3, 28, 14, 0, 'female', false, '18歳'],
  [1974, 4, 18, 11, 33, 'female', false, '2026年が解けない空亡'],
  [1960, 5, 10, 18, 52, 'male', false, '魁罡（戊戌）'],
];
// 相性：[本人, お相手, メモ]（本人・お相手は PEOPLE の番号か、直接の配列）
const PAIRS = [
  [[1987, 4, 16, 23, 40, 'female', false], [1969, 11, 16, 9, 0, 'male', false], '日柱どうし律音'],
  [[1987, 4, 16, 23, 40, 'female', false], [1999, 10, 16, 20, 44, 'male', false], '日柱どうし天戦地冲'],
  [15, 14, '2008×2006 時刻不明'],
  [0, 6, '基準の例×2027年空亡'],
  [4, 13, '2026年空亡×夏生まれ'],
  [[1985, 2, 14, 8, 9, 'female', false], [2005, 10, 21, 1, 37, 'male', false], '日柱どうし天戦地冲'],
  [10, 16, '女性どうし'],
  [1, 3, '魁罡×魁罡'],
  [[1955, 1, 17, 0, 49, 'male', false], [2005, 10, 21, 1, 37, 'male', false], '男性どうし・日柱律音'],
  [7, 11, '2027年空亡×冬生まれ'],
];
const P_ = x => Array.isArray(x) ? x : PEOPLE[x];
// ───────────── 相談 ─────────────
const QS = [
  ['love', '好きな人に告白するならいつがいいですか'], ['marry', '彼とはいつ結婚できますか'],
  ['work', '転職するならいつがいいですか'], ['indep', '会社を続けるか独立するか迷っています'],
  ['money', '金運が上がるのはいつですか'], ['family', '母との関係に悩んでいます。いつ頃よくなりますか'],
  ['date', '12月24日に彼に告白してもいいですか'], ['date2', '11月21日と22日、面接はどちらの日がいいですか'],
  ['near', '明日彼に連絡してもいいですか'], ['near2', '来週の土曜日にデートに誘いたいです'], ['near3', '明日彼に告白してもいいですか'],
  ['yr', '引越しは今年と来年のどちらがいいですか'], ['ab', 'A社とB社、どちらに転職するのがいいですか'],
  ['all', ''], ['kgday', '最近の運勢を教えてください'], ['kgmon', '今月と来月の仕事運を教えてください'],
  ['people', '今の彼（1990年5月3日生まれ・男性）と結婚してもいいですか'], ['health', '来年の体調で気をつけることはありますか'],
];
const CQS = [
  ['c_kok', 'いつ告白したらいいですか'], ['c_near', '明日連絡してもいい？'], ['c_near3', '明日告白してもいい？'],
  ['c_day', '11月21日と22日、デートはどちらがいい？その日に告白もしたい'], ['c_marry', '結婚の時期はいつですか'],
  ['c_fuku', '復縁できますか'], ['c_myaku', '脈ありですか'], ['c_all', ''], ['c_yr', '今年と来年、どちらに入籍するのがいいですか'],
  ['c_wait', '告白したけど返事がありません。どうしたらいいですか'],
];
const EQS = [
  ['e_work', '1990年5月3日生まれの女性です。転職は今年と来年のどちらがいいですか', [1990, 5, 3]],
  ['e_near', '明日彼に連絡してもいいですか'], ['e_date', '12月24日に告白してもいいですか'],
  ['e_ab', 'A社とB社、どちらに入社するのがいいですか'], ['e_money', '1981年6月10日生まれです。金運はいつ上がりますか', [1981, 6, 10]],
  ['e_love', '好きな人とこの先どうなりますか'], ['e_day2', '11月21日と22日、どちらの日に引越しするのがいいですか'],
  ['e_yr', '2008年3月28日生まれ女性。今年と来年、どちらに留学するのがいいですか', [2008, 3, 28]],
];
// ───────────── 組み合わせ ─────────────
// full：オンライン 210件（今日1 145・今日2 65）＋通信なし 110件（今日1 80・今日2 30）＝320件。small：30件（オンライン20・通信なし10）
const PLAN_FULL = {
  [TODAYS[0]]: { online: { pro: 50, beginner: 25, proC: 30, begC: 15, eki: 25 }, offline: { pro: 30, beginner: 15, proC: 15, begC: 10, eki: 10 } },
  [TODAYS[1] || TODAYS[0]]: { online: { pro: 25, beginner: 10, proC: 15, begC: 5, eki: 10 }, offline: { pro: 15, beginner: 5, proC: 10, begC: 0, eki: 0 } },
};
const PLAN_SMALL = {
  [TODAYS[0]]: { online: { pro: 5, beginner: 3, proC: 4, begC: 1, eki: 3 }, offline: { pro: 3, beginner: 2, proC: 2, begC: 0, eki: 1 } },
  [TODAYS[1] || TODAYS[0]]: { online: { pro: 2, beginner: 0, proC: 2, begC: 0, eki: 0 }, offline: { pro: 1, beginner: 0, proC: 1, begC: 0, eki: 0 } },
};
const PLAN = SIZE === 'full' ? PLAN_FULL : PLAN_SMALL;
const cases = [];
{ let k = 0;
  for (const today of Object.keys(PLAN)) for (const mode of MODES) { const P = PLAN[today][mode] || {}; const ti = TODAYS.indexOf(today);
    for (const [key, site, compat] of [['pro', 'pro', false], ['beginner', 'beginner', false], ['proC', 'pro', true], ['begC', 'beginner', true], ['eki', 'eki', false]]) {
      if (!SITES.includes(site)) continue;
      for (let i = 0; i < (P[key] || 0); i++) { k++;
        const off = (mode === 'offline' ? 7 : 0) + ti * 5 + (site === 'beginner' ? 3 : 0);
        let c;
        if (site === 'eki') { const q = EQS[(i + off) % EQS.length]; c = { site, kind: q[0], q: q[1], eb: q[2] || null, nums: [1 + (i * 7 + off) % 9, 1 + (i * 5 + 3) % 8, 1 + (i * 11 + off) % 6] }; }
        else if (compat) { const q = CQS[(i + off) % CQS.length], pr = PAIRS[(i * 3 + Math.floor(i / CQS.length) + off) % PAIRS.length]; c = { site, compat: true, kind: q[0], q: q[1], A: P_(pr[0]), B: P_(pr[1]), memo: pr[2] }; }
        else { const q = QS[(i + off) % QS.length], A = PEOPLE[(i * 5 + off) % PEOPLE.length]; c = { site, kind: q[0], q: q[1], A, memo: A[7] };
          if (q[0] === 'people') c.B = [1990, 5, 3, 12, 0, 'male', true];
          c.sheet = mode === 'offline' ? (i % 4 === 0) : (i % 5 === 0); }
        c.today = today; c.mode = mode; c.id = `${today}_${mode}_${site}${compat ? 'C' : ''}_${String(i).padStart(3, '0')}_${c.kind}`; cases.push(c); } } } }
const RUN = ARG.limit ? cases.slice(0, +ARG.limit) : cases;
_log(`■ 事実の自動照合（${SIZE}・${RUN.length}件：オンライン ${RUN.filter(c => c.mode === 'online').length}・通信なし ${RUN.filter(c => c.mode === 'offline').length}・今日 ${TODAYS.join(' / ')}）→ ${OUT}`);

// ───────────── サーバー ─────────────
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
await new Promise(r => srv.on('listening', r)); const port = srv.address().port; const BASE = `http://127.0.0.1:${port}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
let gemActive = 0; const gemQ = []; const gemAcq = () => new Promise(r => { if (gemActive < GEM_MAX) { gemActive++; r(); } else gemQ.push(r); }); const gemRel = () => { const n = gemQ.shift(); if (n) n(); else gemActive--; };
const tISO = d => d + 'T10:00:00+09:00';

async function newCtx(C, dir) {
  const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'Asia/Tokyo' });
  await ctx.clock.install({ time: new Date(tISO(C.today)) });
  const st = { calls: 0 };
  await ctx.route('**/.netlify/functions/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await ctx.route('**/.netlify/functions/gemini', async route => {
    if (C.mode !== 'online') { await route.abort('internetdisconnected').catch(() => {}); return; }
    st.calls++; const req = route.request(); const h = require_(path.join(ROOT, dir, 'functions', 'gemini.js')).handler; let r;
    await gemAcq(); try { r = await h({ httpMethod: 'POST', headers: req.headers(), body: req.postData() || '' }); } catch (e) { r = { statusCode: 500, body: '{}' }; } finally { gemRel(); }
    await route.fulfill({ status: r.statusCode, headers: Object.assign({ 'Content-Type': 'application/json' }, r.headers || {}), body: r.body || '' }).catch(() => {}); });
  await ctx.addInitScript(() => { navigator.share = async d => { window.__shared = d; }; navigator.canShare = () => true; try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => { window.__clip = t; }, readText: async () => '', write: async () => {} }, configurable: true }); } catch (e) {} window.print = () => {}; window.alert = () => {}; });
  return { ctx, st };
}
const fmtB = A => String(A[0]) + String(A[1]).padStart(2, '0') + String(A[2]).padStart(2, '0') + (A[6] ? '' : ' ' + String(A[3]).padStart(2, '0') + String(A[4]).padStart(2, '0'));
const grabOpen = (sel) => { const o = document.querySelector(sel); if (!o) return ''; const op = [...o.querySelectorAll('details:not([open])')].filter(d => !d.classList.contains('ev-box')); op.forEach(d => d.open = true); const t = o.innerText; op.forEach(d => d.open = false); return t; };

async function runPk(C) {
  const dir = C.site === 'pro' ? 'pro' : 'beginner', page0 = C.site === 'pro' ? 'app-pro.html' : 'app-beginner.html';
  const { ctx, st } = await newCtx(C, dir); const p = await ctx.newPage(); p.on('dialog', d => d.accept()); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const rec = { ...C, texts: {} };
  try {
    await p.goto(`${BASE}/${dir}/${page0}`); await p.waitForTimeout(2500);
    await p.evaluate(() => { const x = document.getElementById('pro-intro-x'); if (x) x.click(); });
    if (C.compat) { await p.click('button[data-mode=compat]'); await p.waitForTimeout(800); }
    await p.fill('#f-name', C.compat ? 'さくら' : '花子'); await p.click('#f-quick'); await p.keyboard.type(fmtB(C.A)); await p.click(`#f-sex button[data-v=${C.A[5]}]`);
    if (C.A[6]) await p.evaluate(() => { const x = document.getElementById('f-notime'); if (x && !x.checked) { x.checked = true; x.dispatchEvent(new Event('change', { bubbles: true })); x.dispatchEvent(new Event('input', { bubbles: true })); } });
    let sel;
    if (C.compat) { await p.fill('#b-name', '彼'); await p.click('#b-quick'); await p.keyboard.type(fmtB(C.B)); await p.click(`#b-sex button[data-v=${C.B[5]}]`);
      if (C.B[6]) await p.check('#b-notime').catch(() => {});
      await p.fill('#compat-worry', C.q); await p.click('#compatBtn'); sel = '#compat'; }
    else { await p.fill('#cs-q', C.q); await p.click('#f-go'); sel = C.q ? '#reading' : '#autoReading'; }
    let last = '', stable = 0;
    for (let i = 0; i < 150; i++) { await p.waitForTimeout(1000); const s = await p.evaluate(s => { const o = document.querySelector(s); if (!o) return null; return { load: !!o.querySelector('.loading'), bar: !!o.querySelector('.rd-bar'), len: o.innerText.length }; }, sel); if (s && s.bar && !s.load) break; const k = JSON.stringify(s); if (s && !s.load && s.len > 40 && k === last) stable++; else stable = 0; last = k; if (stable >= 12) break; }
    await p.waitForTimeout(2000);
    rec.texts.screen = await p.evaluate(grabOpen, sel);
    rec.texts.body = await p.evaluate(s => { const L = document.querySelectorAll(s + ' .rd-body'); const it = L[L.length - 1]; if (!it) return ''; const op = [...it.querySelectorAll('details:not([open])')]; op.forEach(d => d.open = true); const t = it.innerText; op.forEach(d => d.open = false); return t; }, sel);
    if (C.mode === 'offline') rec.texts.ui = await p.evaluate(grabOpen, 'main') || await p.evaluate(() => document.body.innerText);
    const hasBar = await p.evaluate(s => !!document.querySelector(s + ' .rd-bar'), sel);
    if (hasBar) {
      await p.evaluate(s => { window.__clip = ''; window.__shared = null; document.querySelectorAll(s + ' .rd-more').forEach(d => d.open = true); }, sel);
      await p.click(sel + ' .rd-chat >> nth=-1', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(800); rec.texts.chat = await p.evaluate(() => window.__clip || '');
      await p.click(sel + ' .rd-share >> nth=-1', { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(800); rec.texts.share = await p.evaluate(() => ((window.__shared || {}).text || ''));
      const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), p.click(sel + ' .rd-print >> nth=-1', { timeout: 5000 }).catch(() => {})]);
      if (pop) { await pop.waitForTimeout(2000); rec.texts.pdf = await pop.evaluate(() => document.body.innerText).catch(() => ''); await pop.close().catch(() => {}); }
      else rec.texts.pdf = await p.evaluate(() => { const ov = document.getElementById('pk-print-ov'); if (!ov) return ''; try { return ov.querySelector('iframe').contentDocument.body.innerText; } catch (e) { return ''; } });
    }
    // 日運・月運の詳細鑑定
    if (!C.compat && (C.kind === 'kgday' || C.kind === 'kgmon')) {
      const mon = C.kind === 'kgmon', out = mon ? '#kg-mon-ai' : '#kg-day-ai';
      await p.evaluate(({ mon, today }) => { const t = new Date(today + 'T12:00:00+09:00'); if (mon) { const b = document.querySelector('#kg-tabs [data-kt=mon]'); if (b) b.click(); const nx = new Date(t.getFullYear(), t.getMonth() + 1, 1); const m = document.getElementById('kg-m'); if (m) { m.value = nx.getFullYear() + '-' + String(nx.getMonth() + 1).padStart(2, '0'); m.dispatchEvent(new Event('change', { bubbles: true })); m.dispatchEvent(new Event('input', { bubbles: true })); } }
        else { const d3 = new Date(t.getTime() + 3 * 86400000); const d = document.getElementById('kg-d'); if (d) { d.value = d3.getFullYear() + '-' + String(d3.getMonth() + 1).padStart(2, '0') + '-' + String(d3.getDate()).padStart(2, '0'); d.dispatchEvent(new Event('change', { bubbles: true })); d.dispatchEvent(new Event('input', { bubbles: true })); } }
        const btn = document.getElementById(mon ? 'kg-mon-ai-btn' : 'kg-day-ai-btn'); if (btn) btn.click(); }, { mon, today: C.today });
      for (let i = 0; i < 90; i++) { await p.waitForTimeout(1000); const ok = await p.evaluate(o => { const x = document.querySelector(o); const tx = x ? (x.innerText || x.textContent || '') : ''; return x && tx.length > 150 && !x.querySelector('.loading') && !/作成しています|読み解いています/.test(tx); }, out); if (ok) break; }
      await p.waitForTimeout(1000); rec.texts.kg = await p.evaluate(o => { const x = document.querySelector(o); if (!x) return ''; x.querySelectorAll('details:not([open])').forEach(d => d.open = true); return x.innerText || x.textContent || ''; }, out);
      rec.kgTarget = await p.evaluate(mon => mon ? (document.getElementById('kg-m') || {}).value : (document.getElementById('kg-d') || {}).value, mon);
    }
    // 鑑定書
    if (C.sheet && !C.compat) {
      const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }).catch(() => null), p.evaluate(() => { const x = document.getElementById('jn-print'); if (x) x.click(); })]);
      if (pop) { await pop.waitForLoadState('load').catch(() => {}); const t = Date.now(); let txt = '';
        while (Date.now() - t < 80000) { txt = await pop.evaluate(() => (document.getElementById('sheetsWrap') || {}).innerText || '').catch(() => ''); const busy = await pop.evaluate(() => /作成しています|作成中|生成中|読み解いています/.test((document.getElementById('sheetsWrap') || {}).innerText || '')).catch(() => true); if (txt.length > 1500 && !busy && Date.now() - t > 4000) break; await pop.waitForTimeout(700); }
        await pop.waitForTimeout(2000); rec.sheetGate = await pop.evaluate(() => ({ drop: (window.__sheetGateRows || []).length, off: /計算と合わないところがあったため、定型文/.test(document.body.innerText) })).catch(() => null); rec.texts.sheet = await pop.evaluate(() => { const o = document.getElementById('sheetsWrap'); if (!o) return ''; o.querySelectorAll('details:not([open])').forEach(d => d.open = true); return o.innerText; }).catch(() => txt); await pop.close().catch(() => {}); }
    }
  } catch (e) { rec.err = String(e.message).slice(0, 200); }
  rec.gate = await p.evaluate(() => window.__pkGateLog || []).catch(() => []);
  rec.calls = st.calls; rec.errs = errs.slice(0, 3); await ctx.close(); return rec;
}
async function runEki(C) {
  const { ctx, st } = await newCtx(C, 'eki-pro'); const p = await ctx.newPage(); p.on('dialog', d => d.accept()); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const rec = { ...C, texts: {} };
  try {
    await p.goto(`${BASE}/eki-pro/app/index.html`); await p.waitForTimeout(2500);
    await p.click('.ct-number'); await p.waitForTimeout(300);
    for (const [i, v] of [['#num1', C.nums[0]], ['#num2', C.nums[1]], ['#num3', C.nums[2]]]) await p.fill(i, String(v));
    await p.fill('#question', C.q); await p.click('#goBtn');
    let last = '', stable = 0;
    for (let i = 0; i < 110; i++) { await p.waitForTimeout(1000);
      const s = await p.evaluate(() => { const m = document.getElementById('nrModal'); if (m && getComputedStyle(m).display !== 'none' && getComputedStyle(m).visibility !== 'hidden') { const k = m.querySelector('[data-k=keep]') || m.querySelector('[data-k=cancel]'); if (k) k.click(); } const w = document.getElementById('fuWait'); const f = document.getElementById('fuSend'); const v = document.getElementById('verdictCard'); const res = document.getElementById('result'); return { done: document.getElementById('shikaBox').textContent.trim().length > 0 && (!w || getComputedStyle(w).display === 'none') && f && !f.disabled && v && v.innerText.length > 20, len: (res && getComputedStyle(res).display !== 'none' ? res.innerText.length : 0) }; });
      if (s.done) break; const k = JSON.stringify(s); if (k === last) stable++; else stable = 0; last = k; if (stable >= 12) break; }
    await p.waitForTimeout(2500);
    rec.texts.screen = await p.evaluate(() => { const o = document.getElementById('result'); if (!o) return ''; const op = [...o.querySelectorAll('details:not([open])')].filter(d => !d.classList.contains('ev-box')); op.forEach(d => d.open = true); const t = o.innerText; op.forEach(d => d.open = false); return t; });
    rec.texts.body = await p.evaluate(() => (document.getElementById('verdictCard') || {}).innerText || '');
    for (const id of ['copyScript', 'copyTalk']) { await p.evaluate(() => { window.__clip = ''; }); await p.click('#' + id, { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(500); rec.texts[id] = await p.evaluate(() => window.__clip || ''); }
    await p.evaluate(() => { const s = document.getElementById('shoContent'); if (s) s.innerHTML = ''; const m = document.getElementById('makeSho'); if (m) m.click(); });
    for (let i = 0; i < 70; i++) { await p.waitForTimeout(1000); const ok = await p.evaluate(() => { const t = (document.getElementById('shoContent') || {}).innerText || ''; return t.length > 200 && !/作成しています/.test(t); }); if (ok) break; }
    await p.waitForTimeout(1500); rec.texts.sheet = await p.evaluate(() => (document.getElementById('shoContent') || {}).innerText || '');
    await p.evaluate(() => { window.__shared = null; try { App.shareSho(); } catch (e) {} }); await p.waitForTimeout(800); rec.texts.share = await p.evaluate(() => ((window.__shared || {}).text || ''));
  } catch (e) { rec.err = String(e.message).slice(0, 200); }
  rec.gate = await p.evaluate(() => window.__pkGateLog || []).catch(() => []);
  rec.calls = st.calls; rec.errs = errs.slice(0, 3); await ctx.close(); return rec;
}

// ───────────── 0. 点検の点検（--selftest：文章作成もアプリの操作もせず、照合だけ確かめる） ─────────────
if (ARG.selftest) { let bad = 0;
  for (const today of TODAYS) { const ctx = await b.newContext({ serviceWorkers: 'block', timezoneId: 'Asia/Tokyo' }); await ctx.clock.install({ time: new Date(tISO(today)) });
    await ctx.route('**/.netlify/functions/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    const p = await ctx.newPage(); await p.goto(`${BASE}/pro/app-pro.html`); await p.waitForTimeout(2500); await p.evaluate(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'gate_facts_lib.js'), 'utf8'));
    const r = await p.evaluate(() => window.__FACTS.selftest());
    _log(`  今日 ${today}：正しい文で出たもの ${r.clean.length}件・まちがえた文 ${r.n}種類のうち見のがし ${r.missed.length}`); r.clean.forEach(x => _log('    ✖ 正しい文で出た：' + x.kind + '｜' + x.snip)); r.missed.forEach(x => _log('    ✖ 見のがし：' + x));
    bad += r.clean.length + r.missed.length; await ctx.close(); }
  _log(bad ? '→ 点検の点検：不合格' : '→ 点検の点検：合格'); await b.close(); srv.close(); process.exit(bad ? 1 : 0); }

// ───────────── 1. 答えを作る ─────────────
if (!ARG['check-only']) {
  const todo = RUN.filter(c => ARG.fresh || (ARG.redo && new RegExp(ARG.redo).test(c.id)) || !fs.existsSync(path.join(OUT, 'raw', c.id + '.json')));
  let done = 0; const t0 = Date.now();
  const worker = async () => { while (todo.length) { const C = todo.shift(); const t1 = Date.now(); let rec;
      try { rec = C.site === 'eki' ? await runEki(C) : await runPk(C); } catch (e) { rec = { ...C, texts: {}, err: String(e.message).slice(0, 200) }; }
      rec.secs = (Date.now() - t1) / 1000; fs.writeFileSync(path.join(OUT, 'raw', C.id + '.json'), JSON.stringify(rec));
      done++; _log(`  [${done}] ${C.id} ${rec.secs}s calls=${rec.calls} body=${(rec.texts.body || '').length}字${rec.err ? ' ERR ' + rec.err : ''}  (経過 ${Math.round((Date.now() - t0) / 1000)}s)`); } };
  await Promise.all(Array.from({ length: Math.min(PAR, todo.length) }, worker));
}

// ───────────── 2. 照らし合わせる（ページの中のツールの計算で） ─────────────
const LIB = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'gate_facts_lib.js'), 'utf8');
const results = [];
for (const today of TODAYS) {
  const recs = RUN.filter(c => c.today === today).map(c => { try { return JSON.parse(fs.readFileSync(path.join(OUT, 'raw', c.id + '.json'), 'utf8')); } catch (e) { return null; } }).filter(Boolean);
  if (!recs.length) continue;
  const ctx = await b.newContext({ serviceWorkers: 'block', timezoneId: 'Asia/Tokyo' }); await ctx.clock.install({ time: new Date(tISO(today)) });
  await ctx.route('**/.netlify/functions/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  const p = await ctx.newPage(); await p.goto(`${BASE}/pro/app-pro.html`); await p.waitForTimeout(2500); await p.evaluate(LIB);
  for (const r of recs) { const f = await p.evaluate(r => { try { return window.__FACTS.check(r); } catch (e) { return [{ kind: '照合の道具のエラー', sev: '要確認', src: '-', snip: String(e && e.stack || e).slice(0, 300) }]; } }, r);
    results.push({ id: r.id, site: r.site, compat: !!r.compat, mode: r.mode, today: r.today, kind: r.kind, q: r.q, A: r.A, B: r.B, calls: r.calls, err: r.err, gate: r.gate || [], sheetGate: r.sheetGate || null, pageErrs: r.errs, len: Object.fromEntries(Object.entries(r.texts || {}).map(([k, v]) => [k, (v || '').length])), findings: f }); }
  await ctx.close();
}
await b.close(); srv.close();

// ───────────── 3. まとめ ─────────────
const TOOL = r => r.site === 'eki' ? '易' : (r.site === 'pro' ? 'PRO' : 'ビギナー') + (r.compat ? '・相性' : '・1人');
const groups = {};
for (const r of results) {
  if (r.err || (!r.len.body && !r.len.screen)) (groups['答えが作れなかった（点検の動かし方か、アプリの不具合）'] ||= []).push({ id: r.id, tool: TOOL(r), mode: r.mode, today: r.today, q: r.q, sev: '要確認', src: '-', snip: r.err || '本文が空', expect: '' });
  for (const f of r.findings) (groups[f.kind] ||= []).push({ id: r.id, tool: TOOL(r), mode: r.mode, today: r.today, q: r.q, ...f });
}
const kinds = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
const summary = kinds.map(k => ({ kind: k, n: groups[k].length, ng: groups[k].filter(x => x.sev === 'NG').length, online: groups[k].filter(x => x.mode === 'online').length, offline: groups[k].filter(x => x.mode === 'offline').length, tools: [...new Set(groups[k].map(x => x.tool))], srcs: [...new Set(groups[k].flatMap(x => String(x.src).split(',')))] }));
const NG = summary.reduce((t, s) => t + s.ng, 0);
const G_ = results.flatMap(r => (r.gate || []).map(g => ({ ...g, r }))); const gateSum = { checks: G_.length, switched: G_.filter(g => g.off).length, switchedCases: results.filter(r => (r.gate || []).some(g => g.off)).length, dropped: G_.reduce((t, g) => t + (g.drop || 0), 0), droppedCases: results.filter(r => (r.gate || []).some(g => g.drop > 0)).length, sheetSwitched: results.filter(r => r.sheetGate && r.sheetGate.off).length, sheetDropped: results.reduce((t, r) => t + (r.sheetGate ? r.sheetGate.drop : 0), 0),
  byTool: Object.fromEntries([...new Set(results.map(TOOL))].map(k => { const L = G_.filter(g => TOOL(g.r) === k); return [k, { checks: L.length, switched: L.filter(g => g.off).length, dropped: L.reduce((t, g) => t + (g.drop || 0), 0) }]; })) };
const report = { gate: gateSum, date: new Date().toISOString(), size: SIZE, todays: TODAYS, cases: results.length, online: results.filter(r => r.mode === 'online').length, offline: results.filter(r => r.mode === 'offline').length, ng: NG, summary, groups, results };
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const md = [`# 事実の自動照合（gate_facts）`, ``, `- 件数：${results.length}（オンライン ${report.online}・通信なし ${report.offline}）／今日：${TODAYS.join('・')}`, `- NG（まちがい）：${NG}件／要確認：${summary.reduce((t, s) => t + s.n - s.ng, 0)}件`, `- 出す前の照らし合わせ（pkFactGate）：照合 ${gateSum.checks}回・通信なしの答えに切りかえ ${gateSum.switched}回（${gateSum.switchedCases}件）・外した文 ${gateSum.dropped}文（${gateSum.droppedCases}件）／鑑定書：定型文に切りかえ ${gateSum.sheetSwitched}件・外した文 ${gateSum.sheetDropped}文`, ...Object.entries(gateSum.byTool).map(([k, v]) => `  - ${k}：照合 ${v.checks}回・切りかえ ${v.switched}回・外した文 ${v.dropped}文`), ``, `| 種類 | 件数 | NG | オンライン | 通信なし | ツール | 出た場所 |`, `|---|---|---|---|---|---|---|`,
  ...summary.map(s => `| ${s.kind} | ${s.n} | ${s.ng} | ${s.online} | ${s.offline} | ${s.tools.join('・')} | ${s.srcs.join('・')} |`), ``];
for (const k of kinds) { md.push(`## ${k}（${groups[k].length}件）`, '');
  for (const x of groups[k].slice(0, 8)) md.push(`- [${x.sev}] ${x.tool}・${x.mode === 'online' ? 'オンライン' : '通信なし'}・今日${x.today}・${x.src}｜相談「${x.q || '（空欄）'}」`, `  - 文：${String(x.snip).replace(/\n/g, '⏎').slice(0, 220)}`, ...(x.expect ? [`  - 正しくは：${x.expect}`] : []), `  - 例の id：${x.id}`);
  if (groups[k].length > 8) md.push(`- ほか ${groups[k].length - 8}件（report.json）`); md.push(''); }
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));
_log(summary.map(s => `  ${s.ng ? 'NG' : '注意'} ${s.kind}：${s.n}件（NG ${s.ng}・オンライン ${s.online}・通信なし ${s.offline}）${s.tools.join('・')}`).join('\n'));
_log(NG ? `→ 不合格（NG ${NG}件）  ${path.join(OUT, 'report.md')}` : `→ 合格（${results.length}件）  ${path.join(OUT, 'report.md')}`);
process.exit(NG ? 1 : 0);
