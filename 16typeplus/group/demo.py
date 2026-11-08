import json
js=open('group.js').read()
G=[("大学の友だち",[["りな","INTJ","INFJ"],["けんた","ESTP","ESFP"],["みさき","ENFP","ENFJ"],["ゆう","ISTJ","ESTJ"],["さき","INFP","ISFP"]]),
("うちの家族",[["お父さん","ISTJ","ESTJ"],["お母さん","ISFJ","ESFJ"],["ひなた","ISTP","ESTP"],["そら","INFJ","ESFJ"]]),
("営業2課",[["田中","ENTJ","ESTJ"],["佐藤","ENTP","ENTJ"],["鈴木","ESTJ","ISTJ"],["高橋","INTJ","ESTJ"],["伊藤","ENTJ","ENTP"],["山本","ISTP","INTJ"]])]
data=json.dumps([[t,[dict(name=a,born=b,now=c) for a,b,c in m]] for t,m in G],ensure_ascii=False)
html='''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>グループの相性 見本</title>
<style>
:root{--ink:#1F2733;--muted:#5E6A7A;--rule:#E2E6EC;--bg:#F6F7F9;--surface:#fff;--plus:#C2553F;--soft:#EEF1F5;--ei:#3E7FA6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ink:#E8ECF2;--muted:#A3AEBD;--rule:#2C3542;--bg:#12161C;--surface:#1A2029;--soft:#232B36}}
body{margin:0;background:var(--bg);color:var(--ink);font-family:"Hiragino Sans","Noto Sans JP",sans-serif;line-height:1.7}
.wrap{max-width:480px;margin:0 auto;padding:16px}
.tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}.tabs button{flex:1;padding:8px;border-radius:10px;border:1px solid var(--rule);background:var(--surface);color:var(--ink);font:inherit;font-size:13px;cursor:pointer}.tabs button[aria-pressed=true]{border-color:var(--plus);color:var(--plus);font-weight:700}
.note{font-size:12px;color:var(--muted);margin:0 0 12px}
.gr{background:var(--surface);border:1px solid var(--rule);border-radius:16px;padding:20px 18px}
.gr-eb{margin:0;font-size:13px;color:var(--muted);text-align:center}.gr-t{margin:2px 0 0;text-align:center;font-size:24px}.gr-n{margin:0 0 8px;text-align:center;color:var(--muted);font-size:13px}
.gr h3{font-size:16px;margin:22px 0 8px;padding-left:10px;border-left:4px solid var(--plus)}
.gr ul{margin:0;padding:0;list-style:none}
.gr-f li,.gr-tips li{background:var(--soft);border-radius:12px;padding:10px 12px;margin-bottom:6px;font-size:15px}
.gr-tips li{background:#FBEAE6;color:#1F2733}
.gr-bars{margin-top:10px}.gr-b{display:grid;grid-template-columns:36px 1fr 36px;align-items:center;gap:8px;font-family:ui-monospace,Menlo,monospace;font-size:13px;margin:4px 0}.gr-b .r{text-align:right}
.gr-b .bar{height:10px;border-radius:5px;background:var(--rule);overflow:hidden}.gr-b .bar i{display:block;height:100%;background:var(--ei)}
.gr-cap{margin:2px 0 0;font-size:11px;color:var(--muted);text-align:center}
.gr-flip{margin-top:12px;border:1px dashed var(--rule);border-radius:12px;padding:10px 12px;font-size:14px}.gr-flip b{font-size:13px;color:var(--plus)}.gr-flip p{margin:4px 0 0}
.gr-m li{border:1px solid var(--rule);border-radius:12px;padding:10px 12px;margin-bottom:6px}
.gr-mn{display:flex;justify-content:space-between;gap:8px;align-items:baseline}.gr-mn span{font-size:12px;color:var(--muted);font-family:ui-monospace,Menlo,monospace}
.gr-r{margin:2px 0 0;font-weight:700;color:var(--plus)}.gr-br{margin:0;font-size:13px;color:var(--muted)}
.gr-p{border-radius:12px;padding:12px;font-size:14px}.gr-p p{margin:4px 0 0}.gr-p.good{background:#E8F3EE;color:#1F2733}.gr-p.bad{background:var(--soft)}.gr-pt{color:var(--muted)}
</style></head><body><div class="wrap"><p class="note">見本です。名前とタイプは例です。</p><div class="tabs" id="tabs"></div><div id="out"></div></div>
<script>'''+js+'''
const G='''+data+''';const tabs=document.getElementById("tabs");
function show(i){document.getElementById("out").innerHTML=groupHTML(groupResult(G[i][1]),G[i][0]);[...tabs.children].forEach((b,j)=>b.setAttribute("aria-pressed",j===i));}
G.forEach((g,i)=>{const b=document.createElement("button");b.textContent=g[0]+"（"+g[1].length+"人）";b.onclick=()=>show(i);tabs.appendChild(b);});show(0);
</script></body></html>'''
open('group-demo.html','w').write(html)
