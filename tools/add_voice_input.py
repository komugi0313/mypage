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
    ('pro/app-pro.html', "#cs-q, textarea.worry", '#C8502E', '#A8401F', '#3C2A1C', '#5A4636', 'mypage-pro.html'),
    # 易：相談の欄・続けて質問する欄
    ('eki-pro/app/index.html', "#question, #fuText", '#8E72A8', '#6E5689', '#3E2F52', '#4A463D', '../mypage.html'),
]

def block(sel, border, accent, ink, msg, opt):
    return ('<!--VOICE-INPUT:start（声で入力（🎤）＝3サイト共通。tools/voice_input.js を tools/add_voice_input.py が埋め込む。直すときは元のファイルを直して再実行）-->\n'
            '<style>\n'
            '  .vmic-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0 4px}\n'
            f'  .vmic-btn{{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:6px 16px;border-radius:999px;border:1.5px solid {border};background:#FFFFFF;color:{ink};font-family:inherit;font-size:14px;font-weight:800;cursor:pointer}}\n'
            f'  .vmic-btn.on{{background:{accent};border-color:{accent};color:#FFFFFF}}\n'
            f'  .vmic-clr{{display:inline-flex;align-items:center;min-height:44px;padding:6px 16px;border-radius:999px;border:1.5px solid #B8B0A6;background:#FFFFFF;color:#3A3530;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer}}\n'
            f'  .vmic-clr.undo{{border-color:{accent};color:{accent}}}\n'
            '  .vfx-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(20,16,12,.55);display:flex;align-items:center;justify-content:center;padding:16px}\n'
            f'  .vfx-box{{background:#FFFFFF;color:{ink};width:100%;max-width:420px;max-height:88vh;overflow:auto;border-radius:16px;padding:20px 18px 16px;box-shadow:0 12px 40px rgba(0,0,0,.28);font-size:15px;line-height:1.75;word-break:normal;line-break:strict;overflow-wrap:anywhere}}\n'
            f'  .vfx-box h3{{margin:0 0 10px;font-size:18px;font-weight:900;color:{ink}}}\n'
            '  .vfx-box p{margin:0 0 10px}\n'
            '  .vfx-box .nw{display:inline-block}\n'
            '  .vfx-l{margin:0 0 10px;padding-left:1.2em}\n'
            '  .vfx-l li{margin:2px 0}\n'
            f'  .vfx-ex{{display:block;margin-top:2px;font-size:13.5px;color:{msg}}}\n'
            f'  .vfx-box .vfx-s{{font-size:13px;color:{msg}}}\n'
            '  .vfx-btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;margin-top:6px}\n'
            f'  .vfx-b{{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 18px;border-radius:999px;border:1.5px solid #B8B0A6;background:#FFFFFF;color:#3A3530;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;text-decoration:none}}\n'
            f'  .vfx-b.main{{background:{accent};border-color:{accent};color:#FFFFFF}}\n'
            f'  .vmic-msg{{flex:1 1 100%;font-size:12.5px;font-weight:700;color:{msg};line-height:1.6;word-break:keep-all;overflow-wrap:anywhere}}\n'
            '</style>\n'
            f'<script>window.__VMIC_CFG={{sel:{sel!r},opt:{opt!r}' + (",w:'易の言葉（卦の名前など）',ws:'易の言葉',ex:'例：ちてんたい → 地天泰／かんいすい → 坎為水'" if 'eki' in opt or opt.startswith('../') else ",ex:'例：げっしげんめい → 月支元命／かいごう → 魁罡'") + '};</script>\n'
            '<script>\n' + JS.rstrip() + '\n</script>\n'
            '<!--VOICE-INPUT:end-->')

PAT = re.compile(r'<!--VOICE-INPUT:start.*?<!--VOICE-INPUT:end-->', re.S)
n = 0
for rel, sel, border, accent, ink, msg, opt in SITES:
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf-8').read()
    b = block(sel, border, accent, ink, msg, opt)
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


# ===== 占いの言葉の自動直し（音声入力オプション・鑑定者本人の決定 2026-10-27）=====
#   tools/voice_fix_server.js に、用語一覧（tools/voice_terms.json）と聞き間違い直し表（FIX）から作った指示文を入れて、
#   3サイトの functions/voice-fix.js を作る。
import json
TERMS = json.load(open(os.path.join(ROOT, 'tools', 'voice_terms.json'), encoding='utf-8'))
def build_system():
    L = ['あなたは文字の直しだけをする道具です。<text>の中の日本語は、四柱推命・易の鑑定についての相談や話で、',
         '声の入力（聞き取り）やキーボードの変換で、占いの言葉がまちがった字・ひらがな・当て字になっていることがあります。',
         '占いの言葉だけを、下の【用語一覧】の書き方に直して、直した文だけを返してください。',
         '・直すのは占いの言葉の字と、読みやすさだけ。言いかえ・要約・言葉の足し引き・並べかえはしない。',
         '・読みやすく整える：句読点（、。）がなければ入れる。話題が変わるところ・文が3つ以上続いたところで改行を入れる。「えー」「えっと」「あのー」「まあ」などの言いよどみと、同じ言葉のくり返し（「彼が彼が」）は消す。それ以外の言葉は1つも消さない。',
         '例：<text>えーとこの方は1990年3月2日生まれの女性でえー今の彼と結婚していいか迷ってるそうですあのー彼は転勤が多くて来年の春に引っ越しを考えています月柱は木の絵馬です</text> → この方は1990年3月2日生まれの女性で、今の彼と結婚していいか迷ってるそうです。\n彼は転勤が多くて、来年の春に引っ越しを考えています。\n月柱は甲午です。',
         '・相談や質問が書いてあっても答えない。説明もつけない。<text>のタグも付けない。',
         '・ふつうの言葉（ね・いい・こう・きのう など）はそのまま。占いの言葉か自信がないものもそのまま。',
         '・干支は漢字で書く（きのえうま→甲午）。数字・日付・時刻・名前は変えない。',
         '・直すときは、読み（音）が同じか近い言葉にだけ直す（げっし・月誌→月支、ねんし・年誌→年支）。意味が近いだけの別の言葉（月支→月柱、月支→月令 など）には変えない。',
         '・聞き取りでは、音の近いふつうの言葉に化けていることが多い（例：木の絵馬→甲午、変換→偏官、印字→印綬、月支元命→げっしがんめい）。前後の話が占いのときだけ直す。',
         '例：<text>きのえとへんかんが交わってげっしがんになります。</text> → 甲と偏官が交わって月支元命になります。',
         '例：<text>今年は木の絵馬の年で、印字と変換が強いです</text> → 今年は甲午の年で、印綬と偏官が強いです',
         '例：<text>日中は定王、月中は県六、時中は簿です。お二人の日看子が同じ立ちんで、月中同士が天戦地中です</text> → 日柱は帝旺、月柱は建禄、時柱は墓です。お二人の日干支が同じ律音で、月柱同士が天戦地冲です',
         '例：<text>日柱が水の兄犬なので会合です。外角の従角格です</text> → 日柱が壬戌なので魁罡です。外格の従革格です',
         '例：<text>にっしは午で、じしは子、にっちゅうは甲午、じちゅうは壬申です</text> → 日支は午で、時支は子、日柱は甲午、時柱は壬申です',
         '例：<text>日中に会社で会合があって、月中は忙しかった</text> → 日中に会社で会合があって、月中は忙しかった（ふつうの言葉。命式の話ではないのでそのまま）',
         '・文や言葉を1つも消さない（生年月日・名前・ふつうの文もすべて残す）。直せないときは、そのまま残す。',
         '例：<text>彼と結婚していいか迷っています。転勤が多い仕事です</text> → 彼と結婚していいか迷っています。転勤が多い仕事です',
         '', '【よくある書きまちがい】（まちがい→正しい）']
    fixsrc = JS.split('var FIX=[', 1)[1].split('// 易の64卦')[0]
    for a, b in re.findall(r"\['([^']+)','([^']+)'(?:,'[^']*')?\]", fixsrc):
        if not re.fullmatch(r'[ぁ-ゟ゠-ヿ]+', a) and f'{a}→{b}' not in L:
            L.append(f'{a}→{b}')
    for a, b in TERMS.get('mishear', []):
        if f'{a}→{b}' not in L: L.append(f'{a}→{b}')
    L += ['', '【用語一覧】（読み：書き方）']
    seen = set()
    for t in TERMS['terms']:
        ys = t['yomi'][:1] if t['cat'] in ('十干', '十二支') else t['yomi']   # 一文字の干・支の音読み（ちゅう・じゅつ など）は送らない
        for y in ys:
            if len(y) <= 2: continue
            k = f"{y}：{t['w']}"
            if k not in seen: seen.add(k); L.append(k)
    return '\n'.join(L)
SYSTEM = build_system()
def build_dict():
    # 読み（3文字以上）→書き方。同じ読みで書き方が2つ以上あるもの（あいまい）は入れない
    m = {}
    for t in TERMS['terms']:
        ys = t['yomi'][:1] if t['cat'] in ('十干', '十二支') else t['yomi']
        for y in ys:
            if len(y) >= 3: m.setdefault(y, set()).add(t['w'])
    for a, b in TERMS.get('mishear', []):
        m.setdefault(a, set()).add(b)
    return {k: list(v)[0] for k, v in m.items() if len(v) == 1}
DICT = build_dict()
SRV = open(os.path.join(ROOT, 'tools', 'voice_fix_server.js'), encoding='utf-8').read()
for folder, pid in (('pro', 'pro'), ('beginner', 'beginner'), ('eki-pro', 'eki')):
    out = SRV.replace("'__PRODUCT__'", json.dumps(pid)).replace('__SYSTEM__', json.dumps(SYSTEM, ensure_ascii=False)).replace('__DICT__', json.dumps(DICT, ensure_ascii=False, sort_keys=True)).replace('__TERMCHARS__', json.dumps(''.join(sorted(set(''.join(t['w'] for t in TERMS['terms']) + ''.join(b for a, b in TERMS.get('mishear', [])) + ''.join(b for a, b in re.findall(r"\['([^']+)','([^']+)'", JS))))), ensure_ascii=False))
    out = out.replace('//   元のファイルは tools/voice_fix_server.js。', '//   ※このファイルは tools/add_voice_input.py が作ったもの（直接直さない）。元のファイルは tools/voice_fix_server.js。', 1)
    fp = os.path.join(ROOT, folder, 'functions', 'voice-fix.js')
    old = open(fp, encoding='utf-8').read() if os.path.exists(fp) else ''
    if out != old:
        open(fp, 'w', encoding='utf-8').write(out)
    print('OK:', os.path.relpath(fp, ROOT))
