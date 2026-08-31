#!/usr/bin/env node
/* ============================================================================
 * Pocket鑑定 自動テスト  —  node tests/run.js
 *
 * 3本立て（すべて決定的・ネットワーク不要）：
 *   A. 構文チェック : index.html の全インラインJSが new Function で通るか
 *   B. i18n構造    : 10言語の翻訳漏れ / 言語スロット取り違え / トークン欠落 / 通貨整合
 *   C. ロジック    : 課金・安全・話題・誤読防止を決める判定関数を実データから抽出して検証
 *
 * これはAIの“会話品質”そのものは測れない（それは実APIの評価が要る）。
 * だが「どの発言をどう振り分けるか」という土台のバグ＝回帰を確実に捕まえる。
 * ==========================================================================*/
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const LANGS = ['ja', 'en', 'zh', 'zt', 'ko', 'vi', 'es', 'pt', 'id', 'th'];

let PASS = 0, FAIL = 0;
const fails = [];
function ok(name, cond, detail) {
  if (cond) { PASS++; }
  else { FAIL++; fails.push(name + (detail ? ('  — ' + detail) : '')); }
}
function section(t) { console.log('\n\x1b[1m' + t + '\x1b[0m'); }

// ---------------------------------------------------------------------------
// A. SYNTAX
// ---------------------------------------------------------------------------
section('A. Syntax (inline scripts)');
{
  for (const file of ['index.html', 'lp.html', 'legal.html']) {
    let h; try { h = fs.readFileSync(path.join(ROOT, file), 'utf8'); } catch (e) { continue; }
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi; let m, n = 0, bad = 0;
    while ((m = re.exec(h))) { if (/\bsrc=/.test(m[1])) continue; n++; try { new Function(m[2]); } catch (e) { bad++; console.log('   ' + file + ' script#' + n + ': ' + e.message); } }
    ok(file + ' inline JS parses (' + n + ' scripts)', bad === 0);
  }
  for (const f of ['functions/verify-purchase.js', 'functions/verify-telecom.js', 'functions/gemini.js', 'pkiap-adapter.js', 'sw.js']) {
    const p = path.join(ROOT, f); if (!fs.existsSync(p)) continue;
    let bad = false; try { new Function(fs.readFileSync(p, 'utf8')); } catch (e) { bad = true; console.log('   ' + f + ': ' + e.message); }
    ok(f + ' parses', !bad);
  }
}

// ---------------------------------------------------------------------------
// B. i18n STRUCTURE
// ---------------------------------------------------------------------------
section('B. i18n structure (10 languages)');
{
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // B1. completeness: every i18n object (has ja: en: th:) carries all 10 langs
  function scanObjs(s) {
    const r = [], st = []; let i = 0, q = null, e = false;
    while (i < s.length) { const c = s[i];
      if (q) { if (e) e = false; else if (c === '\\') e = true; else if (c === q) q = null; }
      else { if (c === "'" || c === '"' || c === '`') q = c; else if (c === '{') st.push(i); else if (c === '}') { const a = st.pop(); if (a != null) r.push([a, i]); } }
      i++; }
    return r;
  }
  const objs = scanObjs(idx);
  let missing = 0, checked = 0;
  const seen = new Set();
  for (const [a, b] of objs) {
    if (b - a > 4000) continue;
    const t = idx.slice(a, b + 1);
    if (!/[{,\s]ja\s*:/.test(t) || !/[{,\s]en\s*:/.test(t) || !/[{,\s]th\s*:/.test(t)) continue;
    if (/\bja\s*:\s*[01]\b/.test(t)) continue;          // skip config maps like {ja:1,...}
    const key = a + ':' + b; if (seen.has(key)) continue; seen.add(key);
    checked++;
    const miss = LANGS.filter(L => !(new RegExp('[{,\\s]' + L + '\\s*:').test(t)));
    if (miss.length) { missing++; if (missing <= 8) console.log('   missing ' + miss.join(',') + ' near: ' + t.slice(0, 55).replace(/\n/g, ' ')); }
  }
  ok('all i18n objects have 10 langs (' + checked + ' checked)', missing === 0, missing + ' incomplete');

  // B2. no dominant-script mismatch (language-slot swaps)
  function counts(s) { let hangul = 0, thai = 0, kana = 0, han = 0, latin = 0; for (const ch of s) { const c = ch.codePointAt(0);
    if (c >= 0xAC00 && c <= 0xD7A3) hangul++; else if (c >= 0x0E00 && c <= 0x0E7F) thai++;
    else if ((c >= 0x3040 && c <= 0x30FA) || (c >= 0x30FD && c <= 0x30FF)) kana++;   // exclude ・(30FB)
    else if (c >= 0x4E00 && c <= 0x9FFF) han++; else if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) latin++; } return { hangul, thai, kana, han, latin }; }
  let swaps = 0, tokBad = 0, scanned = 0;
  for (const L of LANGS) for (const q of ["'", '"']) {
    const re = new RegExp('[{,\\s]' + L + '\\s*:\\s*' + q + '((?:[^' + q + '\\\\]|\\\\.)*)' + q, 'g'); let m;
    while ((m = re.exec(idx))) { const v = m[1]; if (v.replace(/[^\p{L}]/gu, '').length < 4) continue; scanned++;
      const c = counts(v); let bad = false;
      if (L === 'ko' && c.hangul === 0 && (c.han + c.thai + c.kana) >= 3) bad = true;
      else if (L === 'ko' && c.thai >= 2) bad = true;
      else if (L === 'th' && c.thai === 0 && (c.hangul + c.han + c.kana) >= 3) bad = true;
      else if (L === 'th' && c.hangul >= 2) bad = true;
      else if (L === 'ja' && (c.hangul >= 2 || c.thai >= 2)) bad = true;
      else if ((L === 'zh' || L === 'zt') && (c.hangul >= 2 || c.thai >= 2 || c.kana >= 2)) bad = true;
      else if (['en', 'es', 'pt', 'vi', 'id'].includes(L) && (c.hangul + c.thai + c.kana + c.han) > c.latin && (c.hangul + c.thai + c.kana + c.han) >= 4) bad = true;
      if (bad) { swaps++; if (swaps <= 8) console.log('   slot-swap [' + L + ']: ' + v.slice(0, 50).replace(/\n/g, ' ')); }
    }
  }
  ok('no language-slot swaps (' + scanned + ' values)', swaps === 0, swaps + ' swaps');

  // B3. real mojibake
  let fffd = 0; for (const ch of idx) if (ch.codePointAt(0) === 0xFFFD) fffd++;
  ok('no U+FFFD mojibake', fffd === 0, fffd + ' found');

  // B4. currency: JA uses ¥, all other langs use $, in the plan-sheet price keys
  const planKeys = ['plan1p', 'plan15p', 'plan2p'];
  let curBad = 0;
  const jaBlock = idx.match(/plan1p:'[^']*'/g) || [];
  const jaYen = jaBlock.some(s => s.includes('¥'));
  ok('JA plan price uses ¥', jaYen, 'no ¥ found in plan1p');
  const anyUsd = (idx.match(/plan1p:'\$[0-9]/g) || []).length;
  ok('non-JA plan price uses $ (USD tiers present)', anyUsd >= 1, 'no $ plan price');
}

// ---------------------------------------------------------------------------
// C. ROUTING / DETECTION LOGIC (extracted from index.html, run with stubs)
// ---------------------------------------------------------------------------
section('C. Routing & detection logic');
{
  const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // grab all single-line  var RE_XXX = /.../flags;
  let src = '';
  idx.split('\n').forEach(line => { const t = line.trim(); if (/^var RE_[A-Z0-9_]+\s*=\s*\/.*\/[a-z]*;\s*$/.test(t)) src += t + '\n'; });
  // grab a few needed consts
  const cst = idx.match(/var FREE_CORR_MAX\s*=\s*\d+;/); if (cst) src += cst[0] + '\n';

  // brace-match extractor for named functions
  function grabFn(name) {
    const idxAt = idx.indexOf('function ' + name + '('); if (idxAt < 0) return '';
    let i = idx.indexOf('{', idxAt), d = 0, j = i;
    for (; j < idx.length; j++) { if (idx[j] === '{') d++; else if (idx[j] === '}') { d--; if (d === 0) { j++; break; } } }
    return idx.slice(idxAt, j) + '\n';
  }
  ['classifyRisk', '_classifyTopic', '_effectiveTopic', '_isBackchannel', '_isOffScope',
   '_isSmalltalk', '_isDeepQ', '_isCorrection', '_hasConcreteAnchor', '_isVagueReply',
   '_isAmbiguousInput', '_isBillableDeep', '_ymd', '_corrKey', '_corrDayCount', '_freeCorrOK'
  ].forEach(n => { src += grabFn(n); });

  // stubs
  const sandbox = { state: { msgs: [], lang: 'ja', mode: 'self', profile: { sex: 'female' } },
    window: {}, localStorage: (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = '' + v; }, removeItem: k => { delete m[k]; } }; })() };
  let api;
  try {
    const factory = new Function('state', 'window', 'localStorage',
      src + '\n;return {classifyRisk,_effectiveTopic,_isBillableDeep,_isAmbiguousInput,_isCorrection,_isBackchannel,_isSmalltalk,_isOffScope,_classifyTopic};');
    api = factory(sandbox.state, sandbox.window, sandbox.localStorage);
  } catch (e) { ok('extract+eval detection functions', false, e.message); }

  if (api) {
    ok('extract+eval detection functions', true);
    const S = sandbox.state;
    const reset = () => { S.msgs = []; S.mode = 'self'; sandbox.window._aiTopicHint = null; };

    // -- classifyRisk --
    const risk = [
      ['死にたい', 'selfharm'], ['消えてしまいたい、もう限界', 'selfharm'],
      ['親が亡くなってつらい', null], ['弟が自殺未遂した', null],
      ['今日は疲れた', null], ['恋愛の相性見て', null],
    ];
    reset(); risk.forEach(([q, exp]) => ok('classifyRisk("' + q + '")=' + exp, api.classifyRisk(q) === exp, 'got ' + api.classifyRisk(q)));

    // -- topic --
    const topic = [
      ['彼氏と別れそう', 'love'], ['転職すべきか', 'work'], ['お金が貯まらない', 'money'],
      ['親が不倫してる', 'human'], ['結婚できる？', 'marriage'], ['私ってどんな人間？', 'self'],
    ];
    reset(); topic.forEach(([q, exp]) => ok('topic("' + q + '")=' + exp, api._effectiveTopic(q) === exp, 'got ' + api._effectiveTopic(q)));

    // -- billable (deep reading counts) vs casual (free) --
    reset();
    const billT = [
      ['恋愛の相性を詳しく見て', true], ['転職すべきか迷ってる', true], ['金運はいつ上がる？', true],
      ['うんうん', false], ['ありがとう！', false], ['今日はここまで、またね', false],
      ['なんで？理屈を教えて', false],
    ];
    billT.forEach(([q, exp]) => ok('billable("' + q + '")=' + exp, api._isBillableDeep(q) === exp, 'got ' + api._isBillableDeep(q)));

    // -- ambiguous (confirm-first, non-billing) --
    reset();
    const ambT = [
      ['はぁ…', true], ['もやもや', true], ['んー', true],
      ['恋愛について相談したい', false], ['彼から3日連絡が来ない', false],
      ['なんかもう無理', false /* heavy → care, not confirm */],
    ];
    ambT.forEach(([q, exp]) => ok('ambiguous("' + q + '")=' + exp, api._isAmbiguousInput(q) === exp, 'got ' + api._isAmbiguousInput(q)));
    // ambiguous must never bill
    reset(); ok('ambiguous never bills', !api._isBillableDeep('はぁ…') && !api._isBillableDeep('もやもや'));

    // -- correction is free only right after an AI reading (the correction is the last msg;
    //    _isCorrection checks the message BEFORE it must be the AI reply) --
    reset(); S.msgs = [{ role: 'ai', text: 'reading' }, { role: 'me', text: 'そうじゃなくて、違う意味' }];
    ok('correction after AI reply detected', api._isCorrection('そうじゃなくて、違う意味'));
    reset(); S.msgs = [{ role: 'me', text: 'x' }, { role: 'me', text: 'そうじゃなくて' }];
    ok('correction NOT flagged without prior AI reply', !api._isCorrection('そうじゃなくて'));
  }
}

// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(48));
if (FAIL === 0) { console.log('\x1b[32m✓ ALL PASS — ' + PASS + ' checks\x1b[0m'); process.exit(0); }
else { console.log('\x1b[31m✗ ' + FAIL + ' FAILED, ' + PASS + ' passed\x1b[0m'); fails.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
