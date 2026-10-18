#!/usr/bin/env python3
"""声で入力（🎤）を3サイトに入れる（tools/voice_input.js を埋め込む）。
使い方: python3 tools/add_voice_input.py
  ・pro/app-pro.html と eki-pro/app/index.html の <!--VOICE-INPUT:start--> 〜 <!--VOICE-INPUT:end--> を作り直す。
  ・ビギナーは PRO から生成されるので、このあと tools/sync_beginner_from_pro.py を回す。
  ・聞き間違い直し表を足すときは tools/voice_input.js の FIX を直してから、これを回す。
"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JS = open(os.path.join(ROOT, 'tools', 'voice_input.js'), encoding='utf-8').read()

# サイトごとの設定：どの欄にボタンを付けるか・ボタンの色（文字と背景のコントラスト比 4.5 以上）
SITES = [
    # PRO（ビギナーは生成時に #A8401F→#A8335A・#C8502E→#C2416B のローズ色に置きかわる）
    ('pro/app-pro.html', "#cs-q, textarea.worry", '#C8502E', '#A8401F', '#3C2A1C', '#5A4636'),
    # 易：相談の欄・続けて質問する欄
    ('eki-pro/app/index.html', "#question, #fuText", '#8E72A8', '#6E5689', '#3E2F52', '#4A463D'),
]

def block(sel, border, accent, ink, msg):
    return ('<!--VOICE-INPUT:start（声で入力（🎤）＝3サイト共通。tools/voice_input.js を tools/add_voice_input.py が埋め込む。直すときは元のファイルを直して再実行）-->\n'
            '<style>\n'
            '  .vmic-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0 4px}\n'
            f'  .vmic-btn{{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:6px 16px;border-radius:999px;border:1.5px solid {border};background:#FFFFFF;color:{ink};font-family:inherit;font-size:14px;font-weight:800;cursor:pointer}}\n'
            f'  .vmic-btn.on{{background:{accent};border-color:{accent};color:#FFFFFF}}\n'
            f'  .vmic-msg{{flex:1 1 100%;font-size:12.5px;font-weight:700;color:{msg};line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}}\n'
            '</style>\n'
            f'<script>window.__VMIC_CFG={{sel:{sel!r}}};</script>\n'
            '<script>\n' + JS.rstrip() + '\n</script>\n'
            '<!--VOICE-INPUT:end-->')

PAT = re.compile(r'<!--VOICE-INPUT:start.*?<!--VOICE-INPUT:end-->', re.S)
n = 0
for rel, sel, border, accent, ink, msg in SITES:
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf-8').read()
    b = block(sel, border, accent, ink, msg)
    if PAT.search(s):
        s2 = PAT.sub(lambda m: b, s, count=1)
    else:
        anchor = '<script id="pk-contrast-guard">'
        if anchor not in s:
            sys.exit(f'NG: {rel} に差し込む場所が見つかりません')
        s2 = s.replace(anchor, b + '\n' + anchor, 1)
    if s2 != s:
        open(p, 'w', encoding='utf-8').write(s2); n += 1
    print('OK:', rel)
print(f'OK: {n} ファイルを更新しました。ビギナーは tools/sync_beginner_from_pro.py で生成し直してください。')
