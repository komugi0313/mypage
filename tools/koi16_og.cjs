// 恋のかたち診断のシェア画像を作る：node tools/koi16_og.cjs
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
await p.goto('file://'+path.resolve(__dirname,'koi16_og.html'));await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:path.resolve(__dirname,'../koi16/og-image.png')});await b.close();})();
