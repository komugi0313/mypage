// 恋のかたち診断（koi16）の「検索から来てもらうページ」を作る（鑑定者本人 2026-11-19「この形でOK、愛着スタイルも使っていいです」。
// 見本 https://claude.ai/artifact/GCacuiLp7Vz9gsxtfrNhGV・https://claude.ai/artifact/KpZaU8pkoDjVuAKsUALySu・https://claude.ai/artifact/RrHMvJiXMSDp2pfcVqfDGa）。
//   koi16/aichaku/ … 愛着スタイル診断（安定型・不安型・回避型・恐れ型）
//   koi16/chara/ … 恋愛キャラ診断（16キャラの一覧。前の /type/ はここへ）
//   koi16/kataomoi/・aisho/・izon/ … 片思い診断・自分に合う人のタイプ診断・恋愛依存体質チェック
//   koi16/type/<code>/index.html … 16タイプそれぞれのページ（文は診断の中の文＝koi16/index.html の T・ARU_T・JAKU をそのまま使う）
//   koi16/seo.css・koi16/seo.js（改行のしくみ＝診断と同じ BudouX の文節の改行）・koi16/sitemap.xml
// 質問の文はのせない（遊ぶ前に読めるとつまらないため）。研究者の名前・研究の型の名前は出さない。
// 使い方：node tools/koi16_seo.js → python3 tools/add_contrast_guard.py （診断の文を直したら回し直す）
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const K = path.join(ROOT, 'koi16');
const SRC = fs.readFileSync(path.join(K, 'index.html'), 'utf8');
const BASE = 'https://koikata.jp/';
const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

// 診断のデータを読む（var 名 = ...; を、かっこの対応で切り出す）
function grab(name) {
  const m = SRC.match(new RegExp('\\nvar ' + name + '\\s*=\\s*'));
  if (!m) throw new Error('見つからない：' + name);
  let i = m.index + m[0].length, d = 0, q = null;
  const st = i;
  for (; i < SRC.length; i++) {
    const c = SRC[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '{' || c === '[') d++;
    else if (c === '}' || c === ']') { d--; if (d === 0) { i++; break; } }
  }
  return 'var ' + name + '=' + SRC.slice(st, i) + ';\n';
}
function grabFn(name) {
  const s = SRC.indexOf('\nfunction ' + name + '(');
  if (s < 0) throw new Error('見つからない：' + name);
  let i = SRC.indexOf('{', s), d = 0;
  for (; i < SRC.length; i++) { if (SRC[i] === '{') d++; else if (SRC[i] === '}') { d--; if (d === 0) { i++; break; } } }
  return SRC.slice(s, i) + '\n';
}
const ctx = {};
vm.createContext(ctx);
vm.runInContext(['AXES', 'T', 'ORDER', 'GROUP', 'GPALE', 'KUSE', 'PAIR', 'ARU_T', 'JAKU', 'CSPLIT', 'POLE', 'MN_ASK'].map(grab).join('') +
  grabFn('pairPart') + grabFn('compat') + 'this.D={AXES,T,ORDER,GROUP,GPALE,KUSE,ARU_T,JAKU,CSPLIT,POLE,MN_ASK,compat};', ctx);
const { AXES, T, ORDER, GROUP, GPALE, KUSE, ARU_T, JAKU, CSPLIT, POLE, MN_ASK, compat } = ctx.D;

// 図鑑と同じ番号（色の仲間 TP→TC→SP→SC の順）
const NO = {}; let n = 0;
['TP', 'TC', 'SP', 'SC'].forEach(k => ORDER.filter(o => o[2] + o[3] === k).forEach(o => { NO[o] = ++n; }));
const esc = s => String(s).replace(/○○(?=[\u3040-\u309f])/g, '○○\u2060').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nw = s => '<span class="nw">' + esc(s) + '</span>';
// 結果の画面と同じ「だれが・だれに」の見出し（キャラの絵＋影。鑑定者本人 2026-11-25）
const wch = (code, label, me) => '<span class="wch' + (me ? ' me' : '') + '">' + (code ? '<span class="wpic" aria-hidden="true"><img src="/img/' + code + '.webp" width="52" height="52" alt=""></span>' : '<span class="wpic sil" aria-hidden="true"><img src="/img/RATP.webp" width="52" height="52" alt=""><i>?</i></span>') + '<span>' + esc(label) + '</span></span>';
const wv = t => '<span class="wv">' + esc(t) + '</span>';
const whoH = inner => '<h2 class="whoh">' + inner + '</h2>';
const cname = c => { const t = T[c].c, k = CSPLIT[c]; return nw(t.slice(0, k)) + nw(t.slice(k)); };
const fname = c => { const f = T[c].f, m = f.match(/^(.*?(?:な|る|い|す))(.+)$/); return m ? nw(m[1]) + nw(m[2]) : esc(f); };
const grp = c => GROUP[c[2] + c[3]];
const lc = c => c.toLowerCase();
const kn = k => KUSE[k].n.replace('|', '');
const kh = k => KUSE[k].n.split('|').map(nw).join('');


// 改行のしくみ（診断と同じ BudouX）を共通のファイルに書き出す
const bxSrc = SRC.match(/\nvar GLUE_SEL=[^\n]*\n/)[0] + SRC.match(/\nvar BX_MODEL=[^\n]*\n/)[0] +
  SRC.slice(SRC.indexOf('\nvar BX=(function(){'), SRC.indexOf('\nfunction glueAll(')) + grabFn('glueAll');
const EXTRA = '.l4t>span,.ty b,.ty>span,.dif .n,.links a>span,.q>b,.q>span,.jk .t,.jk .lb,.tip,.hero .k,.hero .sub,.pair i,.crumb,.cta small,.meta,.kick,.ex div>span,.ex b,.wk span,.kp>span,.dif p,summary span,.rk i';
fs.writeFileSync(path.join(K, 'seo.js'),
  '/* 恋のかたち診断の説明ページ用（tools/koi16_seo.js が koi16/index.html から写して作る。直接直さない）。\n' +
  '   文節で改行する（BudouX・Google・Apache License 2.0 https://github.com/google/budoux の日本語モデル）。 */\n' +
  '(function(){' + bxSrc + 'glueAll(document);var pk=document.querySelector("[data-pick]"),sp=document.getElementById("spick");if(pk&&sp)pk.addEventListener("click",function(e){e.preventDefault();pk.hidden=true;var m=pk.parentNode.querySelector(".meta");if(m)m.hidden=true;sp.hidden=false;});Array.prototype.forEach.call(document.querySelectorAll("' + EXTRA + '"),glue);})();\n');

const CSS = `/* 恋のかたち診断の説明ページ用（tools/koi16_seo.js が作る。直すときは道具の中を直して作り直す） */
:root{--bg:#FBF6F1;--card:#FFFFFF;--ink:#33241B;--sub:#5E4A3D;--line:#E6D7CA;--rose:#B01A5A;--rose-soft:#FCE8EF;--rose-ink:#8A1246;--navy:#3B2A6B;
--mincho:"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif;color-scheme:light}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"Noto Sans JP",-apple-system,BlinkMacSystemFont,"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic",Meiryo,sans-serif;font-size:16px;line-height:1.8;font-weight:500}
img{max-width:100%}
a{color:var(--rose-ink)}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px;max-width:640px;margin:0 auto;padding:6px max(16px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px))}
.logo{display:flex;align-items:center;gap:8px;text-decoration:none;min-height:48px;line-height:1.25}
.lg-t{display:flex;flex-direction:column;justify-content:center}
.lg-h{width:36px;height:36px;border-radius:10px;flex:0 0 auto;box-shadow:0 1px 3px rgba(90,58,42,.16)}
.ft-mark{display:block;width:44px;height:44px;border-radius:12px;margin:0 auto 10px;box-shadow:0 1px 3px rgba(90,58,42,.16)}
@media (max-width:359px){header.top .lg-h{display:none}}
.logo b{font-family:var(--mincho);font-weight:800;color:var(--rose);font-size:19px}
.logo small{font-size:11.5px;font-weight:700;color:var(--navy);letter-spacing:.03em}
.top a.zk{font-size:13px;font-weight:700;text-decoration:none;color:var(--rose-ink);background:var(--rose-soft);border-radius:999px;padding:0 14px;min-height:44px;display:inline-flex;align-items:center;white-space:nowrap}
main{max-width:640px;margin:0 auto;padding:6px max(16px,env(safe-area-inset-right,0px)) 40px max(16px,env(safe-area-inset-left,0px));display:grid;gap:16px}
.crumb{font-size:13px;color:var(--sub)}
.crumb a{text-decoration:none}
h1{font-family:var(--mincho);font-size:28px;line-height:1.4;margin:0;text-wrap:balance}
h2{font-family:var(--mincho);font-size:20px;line-height:1.5;margin:0 0 8px}
.note{font-size:14px;color:var(--sub)}
.box{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px}
.box p{margin:8px 0}
.box>p:last-child{margin-bottom:0}
.hero{background:linear-gradient(160deg,#FCE3EC 0%,#EDE6FB 100%);border-radius:24px;padding:20px 16px;text-align:center;display:grid;gap:10px}
.kick{justify-self:center;font-size:13px;font-weight:700;color:var(--navy);background:#fff;border-radius:999px;padding:3px 14px}
.hero .sub{display:block;font-family:var(--mincho);font-size:17px;color:var(--rose);margin-top:2px}
.hearts{display:flex;justify-content:center;gap:2px}
.hearts img{width:56px;height:56px}
.trio{display:flex;justify-content:center;gap:4px}.trio img{width:84px;height:84px;object-fit:contain}
.btn{display:block;text-align:center;background:var(--rose);color:#fff;font-weight:900;border-radius:999px;padding:12px 16px;min-height:52px;text-decoration:none;font-size:17px;box-shadow:0 6px 16px rgba(176,26,90,.28)}
.btn2{background:#fff;color:var(--rose);border:2px solid var(--rose);box-shadow:none;font-weight:700}
.meta{font-size:13px;color:var(--sub)}
.cta{display:grid;gap:8px;background:var(--card);border:1.5px solid #F2C2D5;border-radius:18px;padding:16px;text-align:center}
.cta p{margin:0;font-weight:700}
ul.pl{list-style:none;margin:0;padding:0;display:grid;gap:6px}
ul.pl li{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:8px 12px;font-size:15px}
.types{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ty{border-radius:16px;padding:12px 10px;display:grid;gap:2px;align-content:start}
.ty img{width:44px;height:44px}
.ty .k{font-size:12px;font-weight:700}
.ty b{font-size:16px;line-height:1.4}
.ty>span{font-size:13.5px;line-height:1.6}
.t-secure{background:#E3F4EE;color:#1F5F4B}.t-preoc{background:var(--rose-soft);color:var(--rose-ink)}
.t-dismiss{background:#E8EEFB;color:#2C4A86}.t-fear{background:#FFF4D6;color:#6E4A00}
.axis{display:flex;justify-content:space-between;font-size:13px;color:var(--sub);margin-top:6px}
.dif{background:#2F2552;color:#fff;border-radius:18px;padding:16px;text-align:center}
.dif .lb{font-size:13px;color:#E9E3FF}
.dif .n{font-family:var(--mincho);font-size:26px;font-weight:800;color:#FFD6E6;line-height:1.4}
.dif p{margin:6px 0 0;font-size:14px;color:#F1EEFF}
details.fold{background:var(--card);border:1px solid var(--line);border-radius:16px}
details.fold summary{list-style:none;cursor:pointer;padding:12px 16px;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:48px}
details.fold summary::-webkit-details-marker{display:none}
details.fold summary::after{content:"開く ▼";flex:0 0 auto;font-size:12px;color:var(--rose);background:var(--rose-soft);border-radius:999px;padding:2px 10px}
details.fold[open] summary::after{content:"閉じる ▲"}
.refs .ref{border-top:1px solid var(--line);padding:10px 0 2px;display:flex;flex-direction:column;gap:2px}
.refs .ref b{font-size:15px;line-height:1.6}
.refs .ref small{font-size:13px;color:var(--sub)}
.refs .ref a{align-self:flex-start;display:inline-flex;align-items:center;min-height:44px;color:var(--rose);font-weight:700;font-size:14px}
.faq details{border-top:1px solid var(--line)}
.faq summary{list-style:none;cursor:pointer;display:flex;gap:8px;align-items:center;min-height:48px;padding:6px 0;font-weight:700}
.faq summary::-webkit-details-marker{display:none}
.faq summary::before{content:"Q";flex:none;color:var(--rose);font-weight:900}
.faq summary::after{content:"▼";margin-left:auto;flex:none;font-size:11px;color:var(--rose)}
.faq details[open] summary::after{content:"▲"}
.faq details p{margin:0 0 12px;font-size:15px}
[hidden]{display:none!important}
.spick{min-width:0;background:#fff;border-radius:18px;padding:12px 12px 10px;display:grid;gap:7px;text-align:left}
.spick .sq{font-weight:900;font-size:15px;margin:2px 0 4px;text-align:center;line-height:1.6}
.spick .o{display:flex;align-items:center;gap:10px;border:1.5px solid #D9C4B4;border-radius:12px;padding:9px 12px;font-weight:700;font-size:15px;min-height:48px;box-sizing:border-box;background:#fff;color:var(--text);text-decoration:none}
.spick .o:active{border-color:var(--rose)}
.spick .o i{width:16px;height:16px;border:2px solid #C9B6A8;border-radius:50%;flex:none}
.spick .o small{display:block;font-size:12px;font-weight:500;color:var(--sub)}
.spick .n{font-size:12.5px;color:var(--sub);text-align:center;margin:2px 0 0;line-height:1.7}.spick .n b{display:block;color:var(--rose);font-size:13px}
details.fold .in{padding:0 16px 14px;font-size:15px}
details.fold .in h3{font-size:16px;margin:12px 0 2px}
.q{border-left:3px solid var(--rose);padding:2px 0 2px 12px;margin:12px 0}
.q>b{display:block}
.q>span{display:block;color:var(--sub);font-size:15px}
.ex{display:flex;gap:12px;align-items:center;border-top:1px solid var(--line);padding:10px 0}
.ex:first-of-type{border-top:0}
.ex img{width:56px;height:56px;object-fit:contain;flex:0 0 auto}
.ex div{min-width:0}
.ex b{display:block;font-size:14px;color:var(--rose-ink)}
.ex div>span{display:block;font-size:15px}
.wk{display:flex;justify-content:space-between;align-items:baseline;gap:8px;border-top:1px solid var(--line);padding:8px 0;flex-wrap:wrap}
.wk .t{font-family:var(--mincho);font-weight:800;font-size:18px;color:var(--rose)}
.wk span:last-child{font-size:13px;color:var(--sub)}
.rank{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rank a{display:block;background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:10px 6px;text-align:center;text-decoration:none;color:var(--ink)}
.rank img{width:72px;height:72px;object-fit:contain;display:block;margin:0 auto}
.rank b{display:block;font-family:var(--mincho);font-size:15px;line-height:1.4}
.rank small{display:block;font-size:12px;color:var(--sub)}
.rank i{display:block;font-style:normal;color:var(--rose);font-weight:700}
.kp{background:var(--rose-soft);border-radius:14px;padding:12px 14px}
.kp .t{display:block;font-family:var(--mincho);font-weight:800;font-size:19px;color:#A0164F}
.kp>span{display:block;font-size:13px;color:var(--sub)}
.kp p{font-size:15px;margin:6px 0 0}
.help{background:#FFF8E8;border:1px solid #EBD9A8;border-radius:16px;padding:14px 16px}
.help h2{font-size:18px}
.help p{margin:4px 0;font-size:15px}
.telp{font-size:14.5px;color:var(--sub)}
.tel{color:inherit;font-weight:700;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;white-space:nowrap}
.hero2{text-align:center;background:linear-gradient(180deg,var(--gp,#FBE3EC),var(--bg));border-radius:22px;padding:14px 12px 18px}
.hero2 img{width:180px;height:180px;object-fit:contain;display:block;margin:0 auto}
.hero2 .k{font-size:13px;color:var(--gc,var(--rose));font-weight:700}
.hero2 h1{font-size:30px;margin:2px 0;color:var(--gc,var(--ink))}
.hero2 .f{font-family:var(--mincho);font-weight:700;font-size:17px;color:var(--sub)}
.hero2 .c{font-size:13px;color:var(--sub);letter-spacing:.08em;border-top:1px solid var(--line);display:inline-block;margin-top:8px;padding-top:6px}
.hero2 p{margin:10px 0 0}
.jk .lb{font-size:14px;color:var(--sub)}
.jk .t{font-family:var(--mincho);font-size:24px;font-weight:800;color:var(--rose)}
.jk .tip{background:#FFF4D6;color:#6E4A00;border-radius:12px;padding:8px 12px;font-size:15px;margin-top:8px}
.gh{font-weight:700;font-size:14px;margin:14px 0 6px}
.gh:first-child{margin-top:0}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
@media (min-width:560px){.grid{grid-template-columns:repeat(4,1fr)}}
.grid a{display:block;background:linear-gradient(180deg,var(--gp),#fff);border:1px solid var(--line);border-radius:14px;padding:8px 6px 10px;text-align:center;text-decoration:none;color:var(--ink);min-height:44px}
.grid a[aria-current]{outline:2px solid var(--rose)}
.grid img{width:64px;height:64px;object-fit:contain;display:block;margin:0 auto}
.grid b{display:block;font-family:var(--mincho);font-size:15px;line-height:1.4;color:var(--gc)}
.grid small{display:block;font-size:12px;color:var(--sub)}
@media (max-width:359px){.grid b{font-size:13.5px}.grid a{padding:8px 3px 10px}.box{padding:14px 14px}}
.links{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.links a{font-size:14px;font-weight:700;border:1px solid var(--line);background:var(--card);border-radius:14px;padding:8px 12px;min-height:52px;display:flex;align-items:center;text-decoration:none}
footer{text-align:center;font-size:13px;color:var(--sub);padding:0 16px 32px}
footer a{display:inline-flex;align-items:center;min-height:44px}
footer .credit{font-size:11px;color:#A3948A;margin-top:4px}
.nw{display:inline-block}.nb{white-space:nowrap}
.bx{word-break:keep-all;overflow-wrap:break-word;line-break:strict}
:focus-visible{outline:3px solid #F2B8CF;outline-offset:2px}
.cmp{display:grid;gap:8px}
.cmp .cr{border:1px solid var(--line);border-radius:14px;overflow:hidden}
.cmp .cl{background:var(--bg);font-size:13px;font-weight:700;color:var(--sub);padding:4px 12px}
.cmp p{margin:0;padding:6px 12px;font-size:15px;line-height:1.6}
.cmp p small{display:block;font-size:12px;color:var(--sub)}
.cmp p.me{border-top:1px dashed var(--line);font-weight:700}
.cmp p.me small{color:var(--rose)}
.ax4{display:grid;gap:8px}
.ax4 div{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:8px 12px}
.ax4 b{display:block;font-size:13px;color:var(--rose-ink)}
.ax4 span{font-size:15px}
.tm{font-size:12.5px;color:var(--sub);line-height:1.7}
.hy{display:grid;gap:8px}
.hy .r{display:flex;gap:10px;align-items:center;border-top:1px solid var(--line);padding:8px 0}
.hy .r:first-child{border-top:0}
.hy .me{flex:0 0 96px;text-align:center;text-decoration:none;color:var(--ink)}
.hy .me img{width:56px;height:56px;object-fit:contain;display:block;margin:0 auto}
.hy .me b{display:block;font-family:var(--mincho);font-size:13px;line-height:1.4;color:var(--gc)}
.hy .bs{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));gap:6px;flex:1;min-width:0}
.hy .bs a{display:block;text-align:center;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:4px 2px;text-decoration:none;color:var(--ink);min-height:44px}
.hy .bs img{width:40px;height:40px;object-fit:contain;display:block;margin:0 auto}
.hy .bs small{display:block;font-size:11.5px;line-height:1.35}
.hy .bs i{display:block;font-style:normal;color:var(--rose);font-weight:700;font-size:13px}
.l4s{display:grid;gap:8px}
.lead2{font-size:14.5px;color:var(--sub);margin:0 0 8px}
.whoh{display:flex;flex-wrap:wrap;align-items:center;gap:22px 0;font-size:17px;font-weight:800;line-height:1.5;margin:4px 0 14px}
.whoh .wv{white-space:nowrap}.whoh .wv+.wch{margin-left:6px}
.wch{margin:0 6px 0 0;display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 14px 2px 4px;background:#F1E9E3;font-size:15px;font-weight:800;white-space:nowrap}
.wch.me{background:#FBE3EC;color:#9C1449}
.wpic{position:relative;flex:0 0 auto;width:52px;height:52px;margin:-10px 0 -10px -6px;display:grid;place-items:center}
.wpic img{width:52px;height:52px;object-fit:contain}
.wpic.sil img{filter:brightness(0) opacity(.5)}
.wpic.sil i{position:absolute;top:52%;left:50%;transform:translate(-50%,-50%);font-style:normal;font-weight:800;color:#fff;font-size:20px;line-height:1}
.l4{display:flex;gap:12px;align-items:flex-start;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
.l4c{flex:none;width:36px;height:36px;border-radius:50%;background:var(--gc,var(--rose));color:#fff;font-weight:900;font-size:18px;display:grid;place-items:center}
.l4t{min-width:0;flex:1}
.l4t small{display:flex;flex-wrap:wrap;gap:2px 10px;align-items:baseline;font-size:12.5px;font-weight:700;color:var(--sub)}
.l4t small em{font-style:normal;font-weight:700;color:var(--gc,var(--rose));letter-spacing:.02em}
.l4t b{display:block;font-size:16px;line-height:1.5}
.l4t>span{display:block;font-size:14px;color:var(--sub);line-height:1.65;margin-top:2px}
.top10{list-style:none;margin:0;padding:0;display:grid;gap:6px;counter-reset:t}
.top10 li{display:flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:6px 10px;counter-increment:t}
.top10 li::before{content:counter(t);flex:none;width:24px;height:24px;border-radius:50%;background:var(--rose);color:#fff;font-weight:900;font-size:13px;display:grid;place-items:center}
.top10 img{width:40px;height:40px;object-fit:contain;flex:none}
.top10 span{flex:1;min-width:0;font-size:14px;line-height:1.5}
.top10 i{font-style:normal;color:var(--rose);font-weight:900;flex:none}
`;
fs.writeFileSync(path.join(K, 'seo.css'), CSS);

function page({ url, title, desc, body, ld, img }) {
  const full = BASE + url, im = img || BASE + 'og-image.png?v=4';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${full}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="恋のかたち診断">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${full}">
<meta property="og:image" content="${im}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${im}">
<meta name="theme-color" content="#FBF6F1">
<link rel="icon" href="/favicon.ico?v=2" sizes="48x48">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png?v=2">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=2">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=2">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&family=Shippori+Mincho+B1:wght@700;800&display=swap">
<link rel="stylesheet" href="/seo.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="top"><a class="logo" href="/"><img class="lg-h" src="/img/logo-heart.webp?v=1" alt="" width="36" height="36"><span class="lg-t"><b>恋のかたち診断</b><small>16タイプ×愛着スタイル診断</small></span></a><a class="zk" href="/chara/">16キャラ一覧</a></header>
<main>
${body}
</main>
<footer><img class="ft-mark" src="/img/logo-heart.webp?v=1" alt="" width="44" height="44"><a href="/">恋のかたち診断のトップへ</a>　<a href="/?privacy=1">プライバシーポリシー</a><div class="credit" data-nocg>Produced by Mizuki Nico</div></footer>
<script src="/seo.js"></script>
</body>
</html>
`;
}
const crumbLd = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x[0], item: BASE + x[1] })) });
const crumb = (items) => '<div class="crumb"><a href="/">恋のかたち診断</a>' + items.map(x => ' › ' + (x[1] ? `<a href="/${x[1]}">${esc(x[0])}</a>` : esc(x[0]))).join('') + '</div>';
let CUR = '';
const START = (t) => `<a class="btn" href="/${CUR ? '?e=' + CUR : ''}">${(t || '無料で診断する').split(/(?=（)/).map(nw).join('')}</a>`;
const CTA = (lead, btn, note) => `<section class="cta"><p>${esc(lead)}</p>${START(btn)}<small>${esc(note || '登録なし・無料')}</small></section>`;
const card = (c, cur) => `<a href="/type/${lc(c)}/" style="--gp:${GPALE[c[2] + c[3]]};--gc:${grp(c).hex}"${cur ? ' aria-current="page"' : ''}><img src="/img/${c}.webp" alt="" width="64" height="64" loading="lazy"><b>${fname(c)}</b><small>${esc(T[c].c)}</small></a>`;
const allGrid = (cur) => ['TP', 'TC', 'SP', 'SC'].map(k => `<div class="gh" style="color:${GROUP[k].hex}">${esc(GROUP[k].n)}</div><div class="grid">${ORDER.filter(o => o[2] + o[3] === k).map(o => card(o, o === cur)).join('')}</div>`).join('');
const ul = xs => '<ul class="pl">' + xs.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
const HEARTS = '<div class="hearts" aria-hidden="true">' + ['secure', 'preoc', 'dismiss', 'fear'].map(n => `<img src="/img/ico/k-${n}.webp" alt="" width="56" height="56">`).join('') + '</div>';
// 4つの心のくせ＝愛着スタイル（鑑定者本人 2026-11-19「不安型・回避型とかも出していい」）
const KT = {
  secure: { k: '安定型', h: '甘えもひとり時間も平気派' },
  preoc: { k: '不安型', h: '既読がつくと気になる派' },
  dismiss: { k: '回避型', h: '大事なことはひとりで決めたい派' },
  fear: { k: '恐れ型（不安＋回避）', k2: '恐れ型', h: '好きなのに一歩引いちゃう派' },
};
const TY3 = { secure: '相手を信じて、安心して寄りそえる', preoc: KUSE.preoc.one, dismiss: '気持ちは、まず自分の中で整理したい', fear: '近づきたいのに、傷つくのが少しこわい' };
const qq = x => /「/.test(x) ? '『' + x + '』' : '「' + x + '」';
const tyCell = k => `<div class="ty t-${k}"><img src="/img/ico/k-${k}.webp" alt="" width="44" height="44" loading="lazy"><span class="k">${esc(KT[k].k)}</span><b>${esc(KT[k].h)}</b><span>${esc(TY3[k])}</span></div>`;
const LINKS = (skip) => '<section class="box"><h2>ほかの恋愛診断</h2><div class="links">' + [['aichaku/', '愛着スタイル診断'], ['chara/', '恋愛キャラ診断'], ['mbti/', 'MBTIと恋愛の16タイプ'], ['aishohyo/', '16タイプ相性表'], ['kataomoi/', '片思い診断'], ['aisho/', '自分に合う人のタイプ診断'], ['izon/', '恋愛依存体質チェック'], ['myaku/', '脈あり診断'], ['sukinahito/', '好きな人のタイプ診断']].filter(x => x[0] !== skip).map(x => `<a href="/${x[0]}"><span>${esc(x[1])}</span></a>`).join('') + '</div></section>';

const out = [];
function write(rel, html) { const f = path.join(K, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); out.push(rel.replace(/index\.html$/, '')); }

// ===== 16タイプのページ（本格名を先に、お菓子の名前はあと＝鑑定者本人 2026-11-19） =====
CUR = 'chara';
ORDER.forEach(c => {
  const t = T[c], a = ARU_T[c], j = JAKU[c], g = grp(c);
  const best0 = ORDER.filter(x => x !== c).map(x => ({ o: x, s: compat(c, x).score })).sort((p, q) => q.s - p.s);
  const best = best0.filter(b => b.s >= best0[1].s);
  // 4文字の意味（1文字1行）・なりやすい愛着スタイル・よくある質問（鑑定者本人 2026-11-25「見本お願いします」）
  const EX4 = { V: '「楽しかった」「ありがとう」を、その日のうちに言葉で伝える', A: '言葉にするより、会いに行く・手伝うことで気持ちを見せる', T: 'つらいことがあったら、まず恋人に話して聞いてもらう', C: 'ドキドキより、一緒にいてほっとできる時間を大事にする', S: 'つらいことがあっても、まずひとりで整理してから話す' };
  const EN = { L: 'Lead', R: 'Receive', V: 'Verbal', A: 'Action', T: 'Trust', S: 'Self', P: 'Passion', C: 'Comfort' };
  const ax4 = AXES.map((x, i) => { const p = c[i], on = p === x.a ? x.an : x.bn; return `<div class="l4" style="--gc:${g.hex}"><span class="l4c">${p}</span><div class="l4t"><small>${nw(x.title)}<em>${p}＝${EN[p]}</em></small><b>${nw(on)}</b><span>たとえば：${esc(EX4[p] || POLE[p].aru)}</span></div></div>`; }).join('');
  const atK = c[2] === 'T' ? ['secure', 'preoc'] : ['dismiss', 'fear'];
  const atTxt = `頼り方が「${c[2] === 'T' ? '寄りかかれる' : '自分で立つ'}」なので、${KT[atK[0]].k.replace(/（.*/, '')}か${KT[atK[1]].k.replace(/（.*/, '')}の、どちらか1つになります。どちらになるかは、タイプとは別の「心のゆれやすさ」で決まり、診断の結果でわかります。`;
  const bestNames = best.map(b => `${T[b.o].f}（${T[b.o].c}・${b.s}点）`).join('、');
  const FQ = [
    [`${t.f}と相性がいいタイプは？`, `${bestNames}です。相性の点数は、4つのものさしの組み合わせから出した、この診断独自のめやすです。`],
    [`${t.f}の脈ありサインは？`, '好きな人には、' + a.sign.map(qq).join('') + 'といったサインを見せます。'],
    [`${t.f}の恋の弱点は？`, `${qq(j[0])}です。${j[1]}${/(やすい|くたくた)$/.test(j[1]) ? '。' : 'ことがあります。'}克服のコツは、${j[2]}ことです。`],
    [`${t.f}は、どの愛着スタイルになりやすい？`, atTxt],
    [`${t.f}（${c}）の4文字の意味は？`, AXES.map((x, i) => `${c[i]}＝${x.title}が「${c[i] === x.a ? x.an : x.bn}」（${EN[c[i]]}）`).join('、') + '。この4つの組み合わせは、この診断独自のタイプです（MBTIなどとは別のものです）。',
      AXES.map((x, i) => nw(`${c[i]}＝${x.title}が`) + nw(`「${c[i] === x.a ? x.an : x.bn}」（${EN[c[i]]}）`)).join('、<wbr>') + '。<wbr>' + ['この4つの', '組み合わせは、', 'この診断独自の', 'タイプです', '（MBTIなどとは', '別のものです）。'].map(nw).join('<wbr>')],
  ];
  const body = `${crumb([['恋愛キャラ診断', 'chara/'], [t.f, '']])}
<section class="hero2" style="--gp:${GPALE[c[2] + c[3]]};--gc:${g.hex}">
<img src="/img/${c}.webp" alt="${esc(t.c)}のキャラクター" width="180" height="180">
<div class="k"><span class="nw">No.${('0' + NO[c]).slice(-2)}</span>　<span class="nw">${esc(g.n)}</span></div>
<h1>${fname(c)}</h1>
<div class="f">${cname(c)}</div>
<div class="c">${c}</div>
<p>${esc(t.catch)}</p>
</section>
<section class="box"><h2>どんな恋をする人？</h2><p>${esc(t.sum)}</p></section>
<section class="box"><h2>4文字「${c}」の意味</h2><div class="l4s">${ax4}</div><p class="note">4つのものさしの組み合わせは、この診断独自のタイプです（MBTIなどとは別のものです）。</p></section>
<section class="box"><h2>好きになり方</h2><p>${esc(t.fall)}</p></section>
<section class="box">${whoH(wch(c, 'このタイプ', 1) + wv('が、') + wv('好きな人の前で') + wv('やりがちなこと'))}${ul(a.aru)}</section>
<section class="box">${whoH(wch(c, 'このタイプ', 1) + wv('が') + wch('', '好きな人') + wv('に、') + wv('つい見せちゃう'))}<p class="lead2">このタイプの脈ありサインです。</p>${ul(a.sign)}</section>
<section class="box">${whoH(wch(c, 'このタイプ', 1) + wv('が') + wch('', '恋人') + wv('と') + wv('けんかしたとき'))}${ul(a.fight)}</section>
<section class="box jk">${whoH(wch(c, 'このタイプ', 1) + wv('の') + wv('恋の弱点'))}<div class="t">${esc(j[0])}</div><p>${esc(j[1])}。</p><div class="tip">克服のコツ：${esc(j[2])}</div></section>
<section class="box"><h2>恋愛での強み</h2>${ul(t.st)}<h2 style="margin-top:14px">気をつけたいところ</h2>${ul(t.ca)}</section>
<section class="box"><h2>相性がいいタイプ</h2><div class="rank">${best.map(b => `<a href="/type/${lc(b.o)}/"><img src="/img/${b.o}.webp" alt="" width="72" height="72" loading="lazy"><b>${fname(b.o)}</b><small>${esc(T[b.o].c)}</small><i>${b.s}点</i></a>`).join('')}</div><p class="note" style="margin-top:8px">相性の点数は、4つのものさしの組み合わせから出した、この診断独自のめやすです。</p></section>
<section class="box"><h2>なりやすい愛着スタイル</h2><p>${esc(atTxt)}</p><div class="types">${atK.map(tyCell).join('')}</div></section>
${CTA('あなたは、どのタイプ？', '無料で診断する')}
<section class="box faq"><h2>よくある質問</h2>${FQ.map((x, i) => `<details${i ? '' : ' open'}><summary><span>${esc(x[0])}</span></summary><p>${x[2] || esc(x[1])}</p></details>`).join('')}</section>
<section class="box"><h2>このタイプの結果をくわしく見る</h2><p>すれ違いやすい場面・長く続けるコツ・16タイプすべてとの相性は、診断の結果の画面で見られます。</p><a class="btn btn2" href="/?t=${c}"><span class="nw">${esc(t.f)}の</span><span class="nw">結果を見る</span></a></section>
<section class="box"><h2>16の恋愛キャラ</h2>${allGrid(c)}</section>
${LINKS('')}`;
  write(`type/${lc(c)}/index.html`, page({
    url: `type/${lc(c)}/`,
    title: `${t.f}（${t.c}）の恋愛の特徴・脈ありサイン・相性｜恋のかたち診断`,
    desc: `${t.catch}16タイプ×愛着スタイルの恋愛診断「恋のかたち診断」の「${t.f}」タイプの、4文字の意味・好きになり方・脈ありサイン・けんかしたとき・恋の弱点・愛着スタイル・相性のいいタイプ。`,
    img: BASE + 'img/' + c + '.png',
    ld: [crumbLd([['恋のかたち診断', ''], ['恋愛キャラ診断', 'chara/'], [t.f, `type/${lc(c)}/`]]), { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FQ.map(x => ({ '@type': 'Question', name: x[0], acceptedAnswer: { '@type': 'Answer', text: x[1] } })) }],
    body,
  }));
});

// ===== 愛着スタイル診断 =====
// 検索で信用してもらう材料（鑑定者本人 2026-11-19「愛着スタイル診断の公式になりたい」→見本 https://claude.ai/artifact/RT4ttRRhyGPS5CyEKqZsrq の B）：
// もとにした研究（題名・雑誌・年・論文へのリンク。書き手の名前は出さない）・病気の診断ではないこと・よくある質問（Google に FAQPage として渡す）
const AI_REFS = [
  { t: ['アダルト・', 'アタッチメント・', 'スタイル尺度', '（ECR-RS）', '日本語版の', '妥当性評価'], j: '心理学研究・2016年', u: 'https://doi.org/10.4992/jjpsy.87.15208' },
  { t: ['“一般他者”を', '想定した', '愛着スタイル尺度の', '信頼性と', '妥当性の検討'], j: '九州大学心理学研究・2004年', u: 'https://doi.org/10.15017/3567' },
  { t: ['Attachment styles among young adults: a test of a four-category model'], j: 'Journal of Personality and Social Psychology・1991年（4つの型のもとになった研究）', u: 'https://doi.org/10.1037/0022-3514.61.2.226' },
];
// A2「やってみる」は残す（鑑定者本人 2026-11-19 見本 https://claude.ai/artifact/5giML4oncqhs962E9xBmVw で「A2」）：押すとトップへ移らず、カードの中が恋の状況のボタンに変わる。
// 選ぶと /?e=aichaku&go=full&s=状況 で、診断の1問目（恋人がいる人は「付き合ってどれくらい？」）から始まる。JS がないときは今までどおりトップへ
const PICK_ST = [['partner', '恋人・パートナーがいる', '結婚している人もこちら'], ['crush', '片思い中', ''], ['none', 'いまはいない', '前に恋をしたことがある'], ['never', '恋をしたことがない', ''], ['skip', '答えたくない', '']];
const PICK = `<a class="btn" href="/?e=aichaku" data-pick="aichaku"><span class="nw">診断してみる</span></a><div class="spick" id="spick" hidden><p class="sq"><span class="nw">はじめに、</span><wbr><span class="nw">いまの恋の状況を</span><wbr><span class="nw">教えてください</span></p>${PICK_ST.map(x => `<a class="o" href="/?e=aichaku&amp;go=full&amp;s=${x[0]}"><i aria-hidden="true"></i><span>${esc(x[1])}${x[2] ? '<small>' + esc(x[2]) + '</small>' : ''}</span></a>`).join('')}<p class="n"><b>いまの恋の状況は、あなただけの答えです。</b><span class="nw">みんなで診断するときも、</span><wbr><span class="nw">ほかの人には見えません</span><wbr><span class="nw">（みんなに見えるのは、</span><wbr><span class="nw">ニックネームとタイプ・</span><wbr><span class="nw">愛着スタイルの結果だけです）。</span><wbr><span class="nw">結果の説明にだけ使い、</span><wbr><span class="nw">どこにも送りません。</span></p></div>`;
const AI_FAQ = [
  ['愛着障害とのちがいは？', '愛着スタイルは、だれにでもある「大切な人への近づき方のくせ」で、良い・悪いはありません。愛着障害は、子どものころの育ちに関わる医療の言葉で、お医者さんが見立てるものです。この診断では、愛着障害はわかりません。'],
  ['不安型や回避型は、変わりますか？', '変わることがあります。新しい恋人との関係や、年齢を重ねることで、心のゆれやすさや、頼るのを避ける気持ちが少しずつ変わる人が多いとされています。'],
  ['ほかの愛着スタイル診断とのちがいは？', '恋愛の場面の質問に答えて、4つの愛着スタイルと恋愛の16タイプを1回で見られます。好きな人にも診断してもらうと、2人の心のくせの組み合わせもわかります。'],
  ['何問ありますか？', '56問です。遊ぶたびに、質問の文が入れかわります。'],
  ['本当に無料ですか？', '無料で、登録もいりません。答えと結果は、このスマホの中だけに残り、どこにも送りません。'],
];
CUR = 'aichaku';
write('aichaku/index.html', page({
  url: 'aichaku/',
  title: '愛着スタイル診断｜16タイプ×4つの型でわかる、あなたの恋（無料）｜恋のかたち診断',
  desc: '恋愛の16タイプと愛着スタイルが1回でわかる無料の診断。既読がつくと気になる、好きなのに一歩引いてしまう。そんな恋のくせを、安定型・不安型・回避型・恐れ型の4分類で見られます。登録なし。好きな人との相性もわかります。',
  ld: [crumbLd([['恋のかたち診断', ''], ['愛着スタイル診断', 'aichaku/']]), { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: AI_FAQ.map(x => ({ '@type': 'Question', name: x[0], acceptedAnswer: { '@type': 'Answer', text: x[1] } })) }],
  img: BASE + 'img/og-aichaku.png?v=2',
  body: `${crumb([['愛着スタイル診断', '']])}
<section class="hero"><span class="kick">無料・登録なし</span><h1>愛着スタイル診断<span class="sub">あなたは、何型の恋をする？</span></h1>${HEARTS}${PICK}<span class="meta">恋愛の16タイプと、安定型・不安型・回避型・恐れ型の4分類が、1回の診断でわかります</span></section>
<section class="box"><h2>こんなこと、ありませんか？</h2>${ul(['既読がついたのに返事がないと、何度もスマホを見てしまう', '好きな人ができると、なぜかそっけなくしてしまう', '恋人に頼るより、ひとりで片づけたほうが楽', '近づきたいのに、近づくと少し怖くなる'])}<p class="note">1つでも思い当たったら、あなたの「心のくせ」が関わっているかもしれません。</p></section>
<section class="box"><h2>4つの愛着スタイル</h2><div class="types">${tyCell('preoc')}${tyCell('fear')}${tyCell('secure')}${tyCell('dismiss')}</div><div class="axis"><span>← 寄りかかれる</span><span>自分で立つ →</span></div><p class="note">上の段ほど、心がゆれやすい型です。どれが良い・悪いではありません。境目の近くの人は、となりの型の面もあわせ持っています。</p></section>
${START('自分の型を見る（無料）')}
<section class="dif"><div class="lb">ほかの愛着スタイル診断とのちがい</div><div class="n">16タイプ ＋ 愛着スタイル</div><p>恋愛の16タイプと、4つの愛着スタイルを1回の診断で。16タイプは好きになり方や気持ちの伝え方、愛着スタイルは恋をしたときの心のゆれやすさと頼り方を見ます。好きな人との「2人の心のくせ」の相性まで見られます。</p></section>
<details class="fold"><summary><span>愛着スタイルって？</span></summary><div class="in"><p>大切な人に、どのくらい近づきたいか・頼りたいか、という心の向きのことです。「心のゆれやすさ（不安）」と「頼るのを避ける気持ち（回避）」の2つで、4つの型に分けて見るのが一般的です（愛着スタイルの4分類）。</p><p>これまでの人とのかかわりの中で形づくられ、恋人ができたときに強く出やすいと言われています。同じ人でも、相手や時期によって変わります。</p></div></details>
<details class="fold"><summary><span>4つの型のくわしい説明</span></summary><div class="in">${['secure', 'preoc', 'dismiss', 'fear'].map(k => `<h3>${esc(KT[k].k2 || KT[k].k)}（${k === 'fear' ? '不安＋回避／' : ''}${esc(kn(k))}）</h3><p>${esc(KUSE[k].lead)}</p><p class="note">ひとこと：${esc(KUSE[k].tip)}</p>`).join('')}</div></details>
<details class="fold"><summary><span>この診断の考え方</span></summary><div class="in"><p>愛着の研究で使われている考え方を参考に、恋愛の場面の質問をこちらで作りました。研究の質問の文は使っていません。医療や心理の専門的な検査ではありません。</p><p>参考にした研究は「<a href="/?about=1">この診断の考え方</a>」にまとめています。</p></div></details>
<section class="box refs"><h2>この診断のもとにした研究</h2><p class="note">ここに挙げた研究の考え方をもとに、恋愛の場面の質問をこちらで作りました（研究の質問の文は使っていません。題名を押すと論文が開きます）。</p>${AI_REFS.map(r => `<div class="ref"><b>${r.t.length > 1 ? r.t.map(nw).join('') : esc(r.t[0])}</b><small>${esc(r.j)}</small><a href="${r.u}" target="_blank" rel="noopener">論文を見る ›</a></div>`).join('')}</section>
<section class="help"><h2>これは病気の診断ではありません</h2><p>「愛着障害」は、お医者さんが見立てるもので、この診断ではわかりません。この診断は、恋愛での気持ちのくせを知るためのものです。</p><p>つらい気持ちが続くときは、ひとりで抱えずに相談してください。</p><p class="telp">相談先：こころの健康相談統一ダイヤル（<a class="tel" href="tel:0570064556">0570-064-556</a>）</p></section>
<section class="box faq"><h2>よくある質問</h2>${AI_FAQ.map((x, i) => `<details${i ? '' : ' open'}><summary><span>${esc(x[0])}</span></summary><p>${esc(x[1])}</p></details>`).join('')}</section>
${LINKS('aichaku/')}`,
}));

// ===== 恋愛キャラ診断（16キャラの一覧） =====
CUR = 'chara';
write('chara/index.html', page({
  url: 'chara/',
  title: '恋愛キャラ診断｜あなたの恋は16キャラのどれ？（無料・16タイプ×愛着スタイル）｜恋のかたち診断',
  desc: '近づき方・気持ちの伝え方・頼り方・恋の原動力の4つで決まる、16の恋愛キャラ。好きになり方・脈ありサイン・恋の弱点・相性のいいキャラがわかる無料の恋愛診断。登録なし。',
  ld: crumbLd([['恋のかたち診断', ''], ['恋愛キャラ診断', 'chara/']]),
  body: `${crumb([['恋愛キャラ診断', '']])}
<section class="hero"><span class="kick">無料・登録なし</span><h1>恋愛キャラ診断<span class="sub">あなたの恋は、16のうちどのキャラ？</span></h1><div class="trio" aria-hidden="true"><img src="/img/LVTP.webp" alt="" width="84" height="84"><img src="/img/RATP.webp" alt="" width="84" height="84"><img src="/img/RASC.webp" alt="" width="84" height="84"></div>${START('無料で診断する')}<span class="meta">無料・登録なし</span></section>
<section class="box"><h2>キャラでわかること</h2>${ul(['好きになり方と、恋愛での強み', '好きな人の前でやりがちなこと・脈ありサイン', 'あなたの恋の弱点と、克服のコツ', '相性のいいキャラ（16キャラすべてとの相性）', '愛着スタイル（安定型・不安型・回避型・恐れ型）'])}</section>
<section class="box"><h2>16の恋愛キャラ</h2><p class="note">4つのものさし（近づき方・気持ちの伝え方・頼り方・恋の原動力）の組み合わせで決まります。押すと、そのキャラのくわしいページが開きます。</p>${allGrid('')}</section>
${CTA('自分のキャラを見てみる', '無料で診断する')}
${LINKS('chara/')}`,
}));

// ===== 片思い診断 =====
const exT = ['RATP', 'LVTP', 'RASP'], wkT = ['RATP', 'RASC', 'RVTC'];
CUR = 'kataomoi';
write('kataomoi/index.html', page({
  url: 'kataomoi/',
  title: '片思い診断｜あなたの脈ありサインと恋の弱点がわかる（無料）｜恋のかたち診断',
  desc: '好きな人の前でついやってしまうこと、あなたの脈ありサイン、片思いが長引きやすい恋の弱点。16タイプ×愛着スタイルでわかる無料の片思い診断。登録なし。',
  ld: crumbLd([['恋のかたち診断', ''], ['片思い診断', 'kataomoi/']]),
  body: `${crumb([['片思い診断', '']])}
<section class="hero"><span class="kick">片思い中の人へ</span><h1>片思い診断<span class="sub">あなたの脈ありサインと、恋の弱点</span></h1>${START('無料で診断する')}<span class="meta">はじめに「片思い中」を選ぶと、片思いの人向けの説明が出ます</span></section>
<section class="box"><h2>片思い中に、もっと知りたいこと</h2><p class="note">あの人のようすや、いまのあなたの気持ちから見る、無料のチェックです。</p><ul><li><a href="/?mini=myaku">脈ありチェック</a>　最近のあの人のようすから、「目立つサイン」と「静かなサイン」を見ます。</li><li><a href="/?mini=suki">どれくらい好き？診断</a>　あなたの「好き」の大きさと、動けないときのあと一歩。</li><li><a href="/?mini=type">あの人のタイプ当て診断</a>　あの人の恋のタイプを予想します。</li><li><a href="/?mini=jaku">恋の弱点チェック</a>　いまの恋で出ているくせと、克服のコツ。</li></ul></section>
<section class="box"><h2>片思い中に、こんなことありませんか？</h2>${ul(['好きな人のSNSは毎日見るのに、いいねは押せない', '好きな人の前だと、なぜかそっけなくなる', '返事が来るまで、何度もスマホを見てしまう', '「好きかも」と気づいてから、動くまでが長い'])}<p class="note">どれも、あなたの恋のタイプと心のくせから説明できます。</p></section>
<section class="box"><h2>タイプでちがう「脈ありサイン」</h2><p class="note">好きな人の前で、つい見せてしまうしぐさです。</p>${exT.map(c => `<div class="ex"><img src="/img/${c}.webp" alt="" width="56" height="56" loading="lazy"><div><b>${esc(T[c].f)}</b><span>${esc(ARU_T[c].sign[0])}</span></div></div>`).join('')}</section>
<section class="box"><h2>片思いが長引きやすい「恋の弱点」</h2>${wkT.map(c => `<div class="wk"><span class="t">${esc(JAKU[c][0])}</span><span>${esc(T[c].f)}</span></div>`).join('')}<p class="note">診断の結果には、あなたのタイプの克服のコツが出ます。</p></section>
<section class="box"><h2>片思いと愛着スタイル</h2><p>片思いのあいだは、相手の気持ちがわからないぶん、心がゆれやすくなります。とくに不安型（既読がつくと気になる派）の人は、返事の速さで一喜一憂しがち。回避型の人は、好きでも自分から距離をとってしまうことがあります。</p><p><a href="/aichaku/">愛着スタイル診断のくわしい説明を見る</a></p></section>
${CTA('自分の脈ありサインを見てみる', '無料で診断する', '好きな人にもリンクを送ると、2人の相性もわかります')}
${LINKS('kataomoi/')}`,
}));

// ===== 自分に合う人のタイプ診断 =====
const ex = 'RATP', exBest = ORDER.filter(x => x !== ex).map(x => ({ o: x, s: compat(ex, x).score })).sort((p, q) => q.s - p.s).slice(0, 2);
CUR = 'aisho';
write('aisho/index.html', page({
  url: 'aisho/',
  title: '自分に合う人のタイプ診断｜あなたと相性抜群なのはどのタイプ？恋愛・カップル診断（無料）｜恋のかたち診断',
  desc: '恋愛・カップルの相性診断。あなたに合うのはどんな人？16タイプすべてとの相性を100点満点で。好きな人も診断すると、2人の愛着スタイル（安定型・不安型・回避型・恐れ型）の組み合わせもわかる無料の相性診断。',
  ld: crumbLd([['恋のかたち診断', ''], ['自分に合う人のタイプ診断', 'aisho/']]),
  body: `${crumb([['自分に合う人のタイプ診断', '']])}
<section class="hero"><span class="kick">相性診断</span><h1>自分に合う人のタイプ診断<span class="sub">相性のいいタイプと、2人の心のくせ</span></h1>${START('無料で診断する')}<span class="meta">無料・登録なし</span></section>
<section class="box"><h2>あなたに合うのは、どんな人？</h2><p>診断すると、16タイプすべてとの相性が100点満点で出ます。たとえば「${esc(T[ex].f)}」の人なら…</p><div class="rank">${exBest.map(b => `<a href="/type/${lc(b.o)}/"><img src="/img/${b.o}.webp" alt="" width="72" height="72" loading="lazy"><b>${fname(b.o)}</b><small>${esc(T[b.o].c)}</small><i>${b.s}点</i></a>`).join('')}</div></section>
<section class="box"><h2>相性の決め方</h2><p>4つのものさしの組み合わせで計算します。いちばん重く見るのは頼り方です。愛着の研究では、どちらかの「頼るのを避ける気持ち」が強いと、相手への親しさや、この関係を大切に思う気持ちが育ちにくいことがわかっています。</p>${ul(['頼り方：2人とも頼り合える組み合わせがいちばん高い', '恋の原動力：ときめき派どうし・安心派どうしは満足しやすい', '気持ちの伝え方：言葉どうし・行動どうしは伝わりやすい', '近づき方：リードする人と受けとめる人は、かみ合いやすい'])}<p class="note">この診断独自のめやすです。</p></section>
<section class="box"><h2>2人の愛着スタイルの組み合わせ</h2><p>相手も診断すると、2人の心のくせの組み合わせが出ます。</p><div class="kp"><span class="t">追いかける人と、離れる人</span><span>不安型 × 回避型</span><p>不安になると近づきたくなる人と、近づかれるとひとりになりたい人。それぞれのコツも出ます。</p></div></section>
${CTA('診断して、相手にも送る', '無料で診断する', '相手が診断すると、2人の相性がわかります')}
${LINKS('aisho/')}`,
}));

// ===== 恋愛依存体質チェック =====
CUR = 'izon';
write('izon/index.html', page({
  url: 'izon/',
  title: '恋愛依存体質チェック｜どこからが依存？心のゆれやすさを診断（無料）｜恋のかたち診断',
  desc: '返事が来ないと手につかない、恋人に合わせすぎてしまう。恋愛依存とはどんな状態か、愛着スタイル（不安型）との関係、心がゆれたときのコツ。心のゆれやすさがわかる無料の診断つき。',
  ld: crumbLd([['恋のかたち診断', ''], ['恋愛依存体質チェック', 'izon/']]),
  body: `${crumb([['恋愛依存体質チェック', '']])}
<section class="hero"><span class="kick">どこからが依存？</span><h1>恋愛依存体質チェック<span class="sub">「好き」がつらくなるのは、心のくせのせいかも</span></h1>${START('心のくせを診断する')}<span class="meta">登録なし・答えはこの端末の中だけ</span></section>
<section class="box"><h2>こんな恋、していませんか？</h2>${ul(['返事が来ないと、ほかのことが手につかない', '恋人の予定に、自分の予定をぜんぶ合わせてしまう', '嫌われるのがこわくて、言いたいことを飲みこむ', '恋人がいないと、自分には価値がない気がする', '別れたあと、すぐ次の恋人をさがしてしまう'])}<p class="note">いくつ当てはまるかで決めるものではありません。思い当たることがあれば、心のくせを知るきっかけにしてください。</p></section>
<section class="box"><h2>「恋愛依存」と、心のゆれやすさ</h2><p>「恋愛依存」は病名ではなく、恋人のことで頭がいっぱいになり、自分の毎日がまわらなくなる状態をさす言葉です。愛着スタイルでいうと、不安型（心がゆれやすく、相手の気持ちを確かめたくなる）の人に起きやすいと言われています。</p><p>この診断では「心のゆれやすさ」を、おだやか・ふつう・ゆれやすいの3つで見られます。</p></section>
<section class="box"><h2>心がゆれたときのコツ</h2>${ul(['「起きたこと」と「頭の中の想像」を分けて考える', '不安なときは、決めつけずに「どう思ってる？」と聞く', '恋人以外の、自分の好きなことに時間を使う'])}</section>
${CTA('自分の心のゆれやすさを見てみる', '無料で診断する')}
<section class="help"><h2>つらい気持ちが続くときは</h2><p>眠れない・食べられない・自分を責めてしまう気持ちが続くときは、ひとりで抱えずに相談してください。</p><p class="telp">相談先：こころの健康相談統一ダイヤル（<a class="tel" href="tel:0570064556">0570-064-556</a>）</p><p class="note">この診断は、医療や心理の専門的な検査ではありません。</p></section>
${LINKS('izon/')}`,
}));


// ===== MBTIと恋愛の16タイプ（鑑定者本人 2026-11-22「MBTIと16タイプで検索されたい」。MBTI は登録商標なので、説明のためにだけ使い、診断の名前には入れない。対応表も作らない） =====
const MB_FAQ = [
  ['MBTIや16タイプとは、どうちがいますか？', '性格の16タイプは、ふだんの性格を見るもの。恋のかたち診断は、恋愛の場面だけで決める「恋の16タイプ」です。性格のタイプがわかっている人ほど、「恋だとこうなるんだ」と違いを楽しめます。'],
  ['MBTIのタイプと対応していますか？', 'MBTIのタイプ（INFPなど）とは別のものさしです。MBTIはふだんの性格の好みを見るもので、恋のかたち診断は恋愛の場面だけを見ます。同じMBTIのタイプの人でも、恋のタイプはちがうことがよくあります。'],
  ['MBTIの相性表とは、なにがちがいますか？', 'MBTIのもともとの考え方には、タイプどうしの決まった「相性表」はありません。ネットで見る相性表の多くは、それぞれのサイトが作ったものです。恋のかたち診断の相性も、4つのものさしから出した、この診断独自のめやすです。'],
  ['何問ありますか？', '56問です。遊ぶたびに、質問の文が入れかわります。'],
  ['本当に無料ですか？', '無料で、登録もいりません。答えと結果は、このスマホの中だけに残り、どこにも送りません。'],
];
CUR = 'mbti';
write('mbti/index.html', page({
  url: 'mbti/',
  title: '16タイプ×恋愛診断｜MBTI・性格の16タイプの次は、恋のタイプを（無料）｜恋のかたち診断',
  desc: '16タイプ診断が好きな人へ。性格の16タイプではわからない「恋の16タイプ」を、56の質問で診断。好きになり方・脈ありサイン・相性・愛着スタイルまでわかります（無料・登録なし）。',
  ld: [crumbLd([['恋のかたち診断', ''], ['MBTIと恋愛の16タイプ', 'mbti/']]), { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: MB_FAQ.map(x => ({ '@type': 'Question', name: x[0], acceptedAnswer: { '@type': 'Answer', text: x[1] } })) }],
  body: `${crumb([['MBTIと恋愛の16タイプ', '']])}
<section class="hero"><span class="kick">性格の16タイプと、恋のタイプ</span><h1>MBTIで、恋愛はわかる？<span class="sub">恋のための、もうひとつの16タイプ</span></h1><div class="trio" aria-hidden="true"><img src="/img/LVTP.webp" alt="" width="84" height="84"><img src="/img/RATC.webp" alt="" width="84" height="84"><img src="/img/RASP.webp" alt="" width="84" height="84"></div>${START('恋愛の16タイプを診断する（無料）')}<span class="meta">無料・登録なし</span></section>
<section class="box"><h2>MBTIでわかること・わかりにくいこと</h2><p>MBTIや、ネットで人気の性格の16タイプは、ふだんの性格の好み（人と過ごすと元気が出るか、ものごとをどう決めるか など）を見るものです。</p><p>でも恋愛は、好きな人ができたときにだけ出てくる「心のくせ」がたくさんあります。</p>${ul(['好きな人に、自分から近づけるか', '「好き」を言葉で伝えるか、行動で見せるか', '恋人に、弱いところを見せて頼れるか', '既読がつくと気になる・好きなのに一歩引いてしまう'])}<p class="note">ふだんの性格のタイプが同じ人でも、恋をすると、ちがう顔になることがよくあります。</p></section>
<section class="box"><h2>恋のかたち診断の、4つのものさし</h2><p>恋愛の場面の質問だけで、4つのものさしを測ります。組み合わせで16タイプです。</p><div class="ax4">${AXES.map(a => `<div><b>${esc(a.title)}</b><span>${nw(a.an)}／${nw(a.bn)}</span></div>`).join('')}</div><p class="note">頼り方と恋の原動力は、恋愛心理学の研究を参考にしたものさしです。近づき方と気持ちの伝え方は、この診断独自のものさしです。</p></section>
<section class="box"><h2>性格の16タイプと、恋のかたち診断</h2><div class="cmp">${[['見るもの', 'ふだんの性格の好み', '恋愛の場面の、心のくせ'], ['質問', 'ふだんの暮らし・仕事・人づきあい', '好きな人・恋人との場面だけ'], ['愛着スタイル', '見ない', '安定型・不安型・回避型・恐れ型も見る'], ['わかること', '性格の傾向', '好きになり方・脈ありサイン・恋の弱点・相性']].map(r => `<div class="cr"><div class="cl">${esc(r[0])}</div><p><small>性格の16タイプ（MBTIなど）</small>${r[1].split('・').map(nw).join('・<wbr>')}</p><p class="me"><small>恋のかたち診断</small>${r[2].split('・').map(nw).join('・<wbr>')}</p></div>`).join('')}</div></section>
<section class="dif"><div class="lb">恋のかたち診断なら</div><div class="n">恋愛の16タイプ ＋ 愛着スタイル</div><p>好きな人にもリンクを送ると、2人の相性と、心のくせの組み合わせまで見られます。</p></section>
${START('自分の恋のタイプを見る（無料）')}
<section class="box"><h2>恋愛の16タイプ</h2><p class="note">押すと、そのタイプのくわしいページが開きます。<a href="/aishohyo/">16タイプの相性表</a>も見られます。</p>${allGrid('')}</section>
<section class="box faq"><h2>よくある質問</h2>${MB_FAQ.map((x, i) => `<details${i ? '' : ' open'}><summary><span>${esc(x[0])}</span></summary><p>${esc(x[1])}</p></details>`).join('')}</section>
${CTA('MBTIの次は、恋のタイプ', '無料で診断する')}
${LINKS('mbti/')}
<p class="tm">MBTI、Myers-Briggs Type Indicator は、The Myers-Briggs Company の登録商標です。恋のかたち診断は、MBTI・16Personalities とは関係のない、独自の診断です。</p>`,
}));

// ===== 16タイプ相性表（鑑定者本人 2026-11-22「16タイプ 相性」で検索されたい） =====
const SC = {}; ORDER.forEach(a => { SC[a] = ORDER.filter(b => b !== a).map(b => ({ o: b, s: compat(a, b).score })).sort((p, q) => q.s - p.s); });
const PAIRS = []; ORDER.forEach((a, i) => ORDER.slice(i + 1).forEach(b => PAIRS.push({ a, b, s: compat(a, b).score })));
PAIRS.sort((p, q) => q.s - p.s || NO[p.a] - NO[q.a] || NO[p.b] - NO[q.b]);
const SAME = ORDER.map(a => compat(a, a).score);
CUR = 'aisho';
write('aishohyo/index.html', page({
  url: 'aishohyo/',
  title: '16タイプ相性表｜恋愛・カップルの相性診断、いちばん合うのはどのタイプ？（無料）｜恋のかたち診断',
  desc: '恋愛の16タイプどうしの相性を100点満点で。タイプごとの相性のいいタイプ3つと、相性の高い組み合わせランキング。相性の決め方つき。自分のタイプは無料の診断でわかります。',
  ld: crumbLd([['恋のかたち診断', ''], ['16タイプ相性表', 'aishohyo/']]),
  body: `${crumb([['16タイプ相性表', '']])}
<section class="hero"><span class="kick">恋愛の16タイプ</span><h1>16タイプ相性表<span class="sub">いちばん合うのは、どのタイプ？</span></h1>${START('自分のタイプを診断する（無料）')}<span class="meta">無料・登録なし</span></section>
<section class="box"><h2>相性の高い組み合わせ</h2><ol class="top10">${PAIRS.slice(0, 10).map(p => `<li><img src="/img/${p.a}.webp" alt="" width="40" height="40" loading="lazy"><img src="/img/${p.b}.webp" alt="" width="40" height="40" loading="lazy"><span>${cname(p.a)}<wbr>×<wbr>${cname(p.b)}</span><i>${p.s}点</i></li>`).join('')}</ol><p class="note" style="margin-top:8px">同じタイプどうしは ${Math.min(...SAME)}〜${Math.max(...SAME)}点です。</p></section>
<section class="box"><h2>タイプごとの、相性のいいタイプ</h2><p class="note">左のタイプにとって、相性のいいタイプを3つ（同じ点数のタイプがあるときは、その分も）。押すと、そのタイプのページが開きます。</p><div class="hy">${ORDER.slice().sort((a, b) => NO[a] - NO[b]).map(a => `<div class="r"><a class="me" href="/type/${lc(a)}/" style="--gc:${grp(a).hex}"><img src="/img/${a}.webp" alt="" width="56" height="56" loading="lazy"><b>${cname(a)}</b></a><div class="bs" style="--n:${SC[a].filter(b => b.s >= SC[a][2].s).length}">${SC[a].filter(b => b.s >= SC[a][2].s).map(b => `<a href="/type/${lc(b.o)}/"><img src="/img/${b.o}.webp" alt="" width="40" height="40" loading="lazy"><small>${cname(b.o)}</small><i>${b.s}点</i></a>`).join('')}</div></div>`).join('')}</div></section>
<section class="box"><h2>相性の決め方</h2><p>4つのものさしの組み合わせで計算します（100点満点）。いちばん重く見るのは頼り方です。</p>${ul(['頼り方：2人とも頼り合える組み合わせがいちばん高い', '恋の原動力：ときめき派どうし・安心派どうしは満足しやすい', '気持ちの伝え方：言葉どうし・行動どうしは伝わりやすい', '近づき方：リードする人と受けとめる人は、かみ合いやすい'])}<p class="note">この診断独自のめやすです。MBTIなど、ほかの16タイプの相性とは関係ありません。点数が低くても、ちがいから学び合える組み合わせです。</p></section>
${CTA('自分のタイプを知って、相手にも送る', '無料で診断する', '相手が診断すると、2人の相性と心のくせの組み合わせがわかります')}
<section class="box"><h2>MBTIで恋愛はわかる？</h2><p>性格の16タイプと、恋愛の16タイプのちがいは、<a href="/mbti/">MBTIと恋愛の16タイプ</a>のページにまとめています。</p></section>
${LINKS('aishohyo/')}`,
}));

// ===== 脈あり診断・好きな人のタイプ診断（4つのチェックの入口。鑑定者本人 2026-11-25 スマホの Google の候補「脈あり診断」「脈ありサイン 女性／男性」「好きな人のタイプ診断」から→「お願いします」） =====
const MSTART = (k, t) => `<a class="btn" href="/?mini=${k}">${t.split(/(?=（)/).map(nw).join('')}</a>`;
const MCTA = (k, lead, btn, note) => `<section class="cta"><p>${esc(lead)}</p>${MSTART(k, btn)}<small>${esc(note || '登録なし・無料・答えはこの端末の中だけ')}</small></section>`;
const signT = ['LVTP', 'RATP', 'RASC'];
CUR = 'myaku';
write('myaku/index.html', page({
  url: 'myaku/',
  title: '脈あり診断｜好きな人の脈ありサインをチェック（無料）｜恋のかたち診断',
  desc: '好きな人は、あなたのことをどう思っている？最近のあの人のようすから、「目立つサイン」と「静かなサイン」で脈ありをチェック。男性にも女性にも使える無料の脈あり診断。連絡がこまめでない人の、静かなサインも見られます。',
  ld: crumbLd([['恋のかたち診断', ''], ['脈あり診断', 'myaku/']]),
  body: `${crumb([['脈あり診断', '']])}
<section class="hero"><span class="kick">好きな人がいる人へ</span><h1>脈あり診断<span class="sub">好きな人の脈ありサインをチェック</span></h1>${MSTART('myaku', '脈ありチェックをはじめる（無料）')}<span class="meta">最近のあの人のようすを思い出して答えるだけ</span></section>
<section class="box"><h2>脈ありとは？</h2><p>「脈あり」は、好きな人が、あなたに好意を持っていそうなようすのことです。気持ちは本人にしかわかりませんが、好きな人には、ふだんのようすに小さなサインが出やすくなります。</p></section>
<section class="box"><h2>2つの脈ありサイン</h2><p class="note">この診断では、サインを2つに分けて見ます。</p><h3>目立つサイン（あの人から近づいてくる）</h3>${ul(['用事がなくても、あの人から連絡が来る', '会話が続くように、質問を返してくる', '2人で話す時間や、会う時間を作ろうとする'])}<h3>静かなサイン（あの人から近づいてこなくても出るもの）</h3>${ul(['返事は短くても、必ず返ってくる', '前に話したことを覚えている', '2人のときだけ、よく笑う'])}<p class="note">脈ありを見るときの中心は、目立つサインです。静かなサインは、仲がいいだけでも出るので、目立つサインの補いとして見ます。</p></section>
<section class="box"><h2>男性と女性で、脈ありサインはちがう？</h2><p>この診断は、男性にも女性にも同じように使えます。サインの出方を大きく分けるのは、性別よりも、その人の恋のタイプです。自分から動くタイプは連絡や誘いに出やすく、待つタイプは「そばにいる」「覚えている」のような静かなサインに出やすくなります。</p>${signT.map(c => `<div class="ex"><img src="/img/${c}.webp" alt="" width="56" height="56" loading="lazy"><div><b>${esc(T[c].f)}</b><span>${esc(ARU_T[c].sign[0].replace(/その人/g, '好きな人'))}</span></div></div>`).join('')}<p class="note">あの人がどのタイプかは、<a href="/sukinahito/">好きな人のタイプ診断</a>で予想できます。</p></section>
<section class="box"><h2>連絡がこまめでなくても</h2><p>連絡の多さは、気持ちの大きさとはかぎりません。好きだからこそ、何を送ればいいか迷ったり、相手の負担にならないかと考えたり、返事が来なかったらと不安になったりして、連絡をひかえる人もいます。連絡が少ないことだけで、気持ちを決めつけなくて大丈夫です。</p></section>
<section class="box"><h2>あなたの「好き」は、伝わってる？</h2><p>同じサインは、あなたの側にも出ています。あの人から見て、あなたの「好き」は伝わっているでしょうか。診断の結果には、好きな気持ちを伝える「小さな一歩」も出ます。</p><p><a href="/?mini=suki">どれくらい好き？診断</a>もすると、2つを合わせた「2人のいま」と、気持ちを伝えるタイミングがわかります。</p></section>
${MCTA('myaku', 'あの人の脈ありサインを、チェックしてみる', '脈ありチェックをはじめる')}
${LINKS('myaku/')}`,
}));

CUR = 'sukinahito';
const askK = ['LR', 'VA', 'TS', 'PC'];
const axName = { LR: '近づき方', VA: '気持ちの伝え方', TS: '頼り方', PC: '恋の原動力' };
write('sukinahito/index.html', page({
  url: 'sukinahito/',
  title: '好きな人のタイプ診断｜あの人の恋愛タイプを当てる（無料）｜恋のかたち診断',
  desc: '好きな人は、どんな恋をするタイプ？あの人を思い浮かべて答えると、16の恋愛タイプから予想します。タイプ別の脈ありサイン、あの人に聞いてみる質問の例つき。本人が診断すると答え合わせもできる無料診断。',
  ld: crumbLd([['恋のかたち診断', ''], ['好きな人のタイプ診断', 'sukinahito/']]),
  body: `${crumb([['好きな人のタイプ診断', '']])}
<section class="hero"><span class="kick">あの人を想像してみる</span><h1>好きな人のタイプ診断<span class="sub">あの人の恋愛タイプを当ててみる</span></h1>${MSTART('type', 'タイプ当て診断をはじめる（無料）')}<span class="meta">あの人ならこうしそう、と答えるだけ</span></section>
<section class="box"><h2>好きな人のタイプとは？</h2><p>ここでいうタイプは、見た目の好みではなく、その人がどんな恋をするかです。4つのものさしの組み合わせで、16のタイプに分けています。</p>${ul(['近づき方：自分から動く／相手を待つ', '気持ちの伝え方：言葉で伝える／行動で示す', '頼り方：寄りかかれる／自分で立つ', '恋の原動力：ときめき優先／安心優先'])}<p class="note">好きな人のことほど、聞かれると「どっちだろう」と迷うものです。わからないところは「わからない」と答えて大丈夫です。</p></section>
<section class="box"><h2>16タイプの一覧</h2>${allGrid()}</section>
<section class="box"><h2>タイプ別の脈ありサイン（例）</h2>${['LVTP', 'LASC', 'RVTC', 'RASP'].map(c => `<div class="ex"><img src="/img/${c}.webp" alt="" width="56" height="56" loading="lazy"><div><b>${esc(T[c].f)}</b><span>${esc(ARU_T[c].sign[0].replace(/その人/g, '好きな人'))}</span></div></div>`).join('')}<p class="note">診断の結果には、予想したタイプの脈ありサイン・よろこびそうなこと・言わないほうがよさそうな言葉が出ます。</p></section>
<section class="box"><h2>あの人に聞いてみる質問の例</h2>${askK.map(k => `<div class="ex"><div><b>${esc(axName[k])}がわからないとき</b><span>${esc(MN_ASK[k][0])}</span></div></div>`).join('')}<p class="note">何気ない質問の答えから、あの人のタイプが見えてきます。</p></section>
<section class="box"><h2>本人と答え合わせ</h2><p>あなたが思うあの人と、本当のあの人。ちがうところがいちばん面白いところです。結果から、あの人に診断を送ると、本当のタイプと、2人の相性がわかります。</p><p>あの人の気持ちが気になるときは、<a href="/myaku/">脈あり診断</a>もどうぞ。</p></section>
${MCTA('type', 'あの人のタイプを、当ててみる', 'タイプ当て診断をはじめる')}
${LINKS('sukinahito/')}`,
}));

// 前の16タイプの一覧（/type/）は恋愛キャラ診断（/chara/）にまとめた（firebase.json で /type/ → /chara/）
try { fs.unlinkSync(path.join(K, 'type', 'index.html')); } catch (e) {}

// ===== サイトマップ =====
fs.writeFileSync(path.join(K, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ['', ...out].map(u => `  <url><loc>${BASE + u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n') + '\n</urlset>\n');
console.log('作ったページ：' + out.length + '（サイトマップ ' + (out.length + 1) + '件）');
