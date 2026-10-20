// 干支相性 早見表（pro/beginner の kanshi-aisho.html）を、アプリの相性判定（stemCompat/branchCompat）から生成し直す。
// 使い方: node tools/gen_kanshi_aisho.mjs （Playwright とローカルの Chromium が必要）。生成後に python3 tools/add_textbook_read.py を実行。
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage();
await p.goto('file:///home/user/mypage/pro/app-pro.html');await p.waitForTimeout(500);
const body=await p.evaluate(()=>{
  const ST='甲乙丙丁戊己庚辛壬癸'.split(''), BRS='子丑寅卯辰巳午未申酉戌亥'.split('');
  const BG={'最高':'#CDEBD9','とてもよい':'#DCF1E4','よい':'#EAF6EE','普通':'#F1EFEA','悪い':'#FBEBCB','合わない':'#F6DCA6'};
  const FG={'最高':'#16794A','とてもよい':'#1F8A55','よい':'#3F8F5A','普通':'#6F6A60','悪い':'#9A6A12','合わない':'#8A5A08'};
  const lab=g=>(CGRADE[g]||CGRADE['普通']).lab;
  const elRel=(ea,eb)=>{if(ea===eb)return '比和';const d=((SHENG.indexOf(eb)-SHENG.indexOf(ea))%5+5)%5;return (d===1||d===4)?'相生':'相剋';};
  const sRel=(a,c)=>KANGO[a]===c?'干合':elRel(STEM_EL[a],STEM_EL[c]);
  const bRel=(a,c)=>{if(a===c)return JIKEI.has(a)?'自刑':'同支';if(RIKUGO[a]===c)return '支合';if(isSangoPair(a,c))return '三合';if(isChong(a,c))return '冲';if(isKei2(a,c))return '刑';if(isKei3(a,c))return '三刑';if(GAI[a]===c)return '害';if(HA[a]===c)return '破';return elRel(BR_EL[a],BR_EL[c]);};
  const MK={'最高':'★','とてもよい':'◎','よい':'○','普通':'・','悪い':'△','合わない':'▽'};
  const cell=(rel,g)=>`<td title="${rel}：${lab(g)}" style="background:${BG[g]};color:${FG[g]}"><b>${rel}</b><i>${MK[g]}</i></td>`;
  const tbl=(L,rel,cmp)=>'<div class="tw"><table><tr><th class=corner>＼</th>'+L.map(x=>`<th>${x}</th>`).join('')+'</tr>'+L.map(a=>`<tr><th class=rh>${a}</th>`+L.map(c=>cell(rel(a,c),cmp(a,c))).join('')+'</tr>').join('')+'</table></div>';
  const legend='<div class=legend><b>凡例：</b>'+['最高','とてもよい','よい','普通','悪い','合わない'].map(g=>`<span><i class="sw" style="background:${BG[g]};color:${FG[g]}">${({'最高':'★','とてもよい':'◎','よい':'○','普通':'・','悪い':'△','合わない':'▽'})[g]}</i>${lab(g)}</span>`).join('')+'</div>';
  return {stem:tbl(ST,sRel,stemCompat),branch:tbl(BRS,bRel,branchCompat),legend};
});
for(const [d,back] of [['pro','textbook-pro.html'],['beginner','textbook.html'],['meishiki-original','']]){
  const f=`/home/user/mypage/${d}/kanshi-aisho.html`; let s=fs.readFileSync(f,'utf8');
  const i=s.indexOf('<p class=note>'), j=s.indexOf('<footer');
  if(i<0||j<0) throw new Error('markers '+f);
  const lead=d==='meishiki-original'?'<p class=note>干支どうしの関係（干合・支合・三合・冲・刑・害・破・五行の生剋）から、相性を6段階で色分けした早見表です（日柱どうしの十干・十二支）。':'<p class=note>アプリの相性判定と同じ基準で色分けしています（日柱どうしの十干・十二支）。';
  const mid=lead+'並びは 最高＞とてもよい＞よい＞普通＞かみ合いにくい＞違いが大きめ。各マスの上は2つの干支の関係、下の記号が相性です（★最高・◎とてもよい・○よい・・普通・△かみ合いにくい・▽違いが大きめ）。表は横にスクロールできます。</p>'+
    body.legend+'<h2>日主 × 日主（十干の相性）</h2>'+body.stem+'<p class=note>干合＝最高／相生（生じ合う）＝よい／比和（同じ五行）＝普通／相剋（剋し合う）＝違いが大きめ。</p>'+
    '<h2>日支 × 日支（十二支の相性）</h2>'+body.branch+'<p class=note>支合＝最高／三合（半会）＝とてもよい／相生＝よい／同支・比和・破＝普通／冲・刑（子卯）＝かみ合いにくい／三刑・害・自刑・相剋＝違いが大きめ。</p>'+'';
  s=s.slice(0,i)+mid+s.slice(j);
  // styles: scroll wrapper + cell text
  s=s.replace(/td i\{[^}]*\}(\.tw\{[^}]*\})?/,'td i{font-style:normal;font-size:12px;font-weight:900;display:block;line-height:1.2;margin-top:1px}.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;padding-bottom:4px}.tw table{min-width:max-content}.tw th,.tw td{white-space:nowrap;min-width:36px}.legend .sw{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;font-style:normal;font-weight:900;font-size:12px}');
  fs.writeFileSync(f,s);
}
console.log('ok');
await b.close();
