// 恋のかたち診断のシェア画像を作る：node tools/koi16_og.cjs
//   tools/koi16_og.html → koi16/og-image.png（トップ）
//   tools/koi16_og_aichaku.html → koi16/img/og-aichaku.png（愛着スタイル診断のページ。2026-11-19）
// 作り直したら、tools/koi16_seo.js の画像のアドレスの ?v= の数字を1つ上げる（LINE・X が前の画像を覚えているため）
const {chromium}=require('playwright');const path=require('path');
const JOBS=[['koi16_og.html','../koi16/og-image.png'],['koi16_og_aichaku.html','../koi16/img/og-aichaku.png']];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
for(const [src,dst] of JOBS){await p.goto('file://'+path.resolve(__dirname,src));await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:path.resolve(__dirname,dst)});}
await b.close();})();
