#!/usr/bin/env python3
"""
恋のかたち診断（koi16）の答えを確かめる分析。論文（古村ほか 2016・中尾・加藤 2004 など）と同じ考え方で、
「質問がぶれずに測れているか」「16タイプがかたよっていないか」を数字で出す。

使い方：
    python3 tools/koi16_analyze.py koi16_answers.json  > koi16_report.md
  （koi16_answers.json は koi16-export で取り出したもの。質問の並びと向きは koi16/index.html の QS から読む）

見るところ（目安）：
  - 信頼性 α（アルファ）… 0.70 以上なら、そのものさしの質問はまとまっている。0.60 未満は質問の見直しが必要。
  - 質問と残りの相関 … 0.30 未満の質問は、ほかの質問と同じものを測れていない＝言い回しを見直す候補。
  - 型の割合 … 4つのものさしの片方が75％を超えるなら、質問がかたよっている（どちらかに答えやすすぎる）。
  - 不安と頼り方の相関 … 論文では小さい（−.27〜.12）。大きく出たら、2つが混ざっている。
  - 人数 … 200人未満は参考程度。論文は約400〜1,000人で確かめている。
"""
import json, math, re, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / 'koi16' / 'index.html').read_text(encoding='utf-8')
QS = [(m.group(1), int(m.group(2)), m.group(3)) for m in re.finditer(r"\['(\w\w)',\s*(-?1),'([^']*)'\]", HTML.split('var QS = [', 1)[1].split('];', 1)[0])]
assert len(QS) == 40, len(QS)
SCALES = [('LR', '近づき方（L＝自分から）'), ('VA', '気持ちの伝え方（V＝言葉）'), ('TS', '頼り方（T＝寄りかかれる）'), ('PC', '恋の原動力（P＝ときめき優先）'), ('AX', '心のゆれやすさ（高い＝ゆれやすい）')]


def mean(x): return sum(x) / len(x) if x else float('nan')
def sd(x):
    if len(x) < 2: return float('nan')
    m = mean(x); return math.sqrt(sum((v - m) ** 2 for v in x) / (len(x) - 1))
def corr(a, b):
    if len(a) < 3: return float('nan')
    ma, mb = mean(a), mean(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    den = math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
    return num / den if den else float('nan')
def alpha(cols):
    k = len(cols)
    if k < 2 or len(cols[0]) < 3: return float('nan')
    tot = [sum(r) for r in zip(*cols)]
    vt = sd(tot) ** 2
    return (k / (k - 1)) * (1 - sum(sd(c) ** 2 for c in cols) / vt) if vt else float('nan')
def f(x, d=2): return '—' if x != x else f'{x:.{d}f}'


def main(path):
    data = json.loads(Path(path).read_text(encoding='utf-8'))
    full = [r for r in data if r.get('mode') == 'full' and len(r.get('ans', [])) == 40 and None not in r['ans']]
    out = []
    P = out.append
    P('# 恋のかたち診断：答えの確かめ\n')
    P(f'- 集まった答え：{len(data)}件（本格版 {len(full)}件・かんたん版 {sum(1 for r in data if r.get("mode") == "quick")}件）')
    P(f'- 今の恋の状況：' + '・'.join(f'{ {"partner":"恋人がいる","crush":"片思い","none":"いない"}.get(k,k)} {v}' for k, v in Counter(r.get('status') for r in data).items()))
    P(f'- 性別：' + '・'.join(f'{ {"female":"女性","male":"男性","other":"そのほか","":"答えない"}.get(k,k)} {v}' for k, v in Counter(r.get('gender', '') for r in data).items()))
    if len(full) < 200:
        P(f'\n> 本格版がまだ {len(full)}件です。**200件未満の結果は参考程度**にしてください（論文は約400〜1,000人で確かめています）。')

    # 向きをそろえた点数（＋が左の型・ゆれやすい）
    items = defaultdict(list)          # scale -> list of (index, col)
    for i, (k, d, t) in enumerate(QS):
        items[k].append((i, [r['ans'][i] * d for r in full]))
    totals = {k: [sum(c[j] for _, c in items[k]) for j in range(len(full))] for k, _ in SCALES}

    P('\n## 1. ものさしごとのまとまり（信頼性）\n')
    P('| ものさし | α | 平均 | 判定 |\n|---|---|---|---|')
    for k, name in SCALES:
        a = alpha([c for _, c in items[k]])
        judge = '—' if a != a else ('良い' if a >= .70 else ('まあまあ' if a >= .60 else '見直しが必要'))
        P(f'| {name} | {f(a)} | {f(mean(totals[k]))} | {judge} |')

    P('\n## 2. うまく働いていない質問（質問と残りの相関が 0.30 未満）\n')
    weak = []
    for k, name in SCALES:
        for i, col in items[k]:
            rest = [totals[k][j] - col[j] for j in range(len(full))]
            r = corr(col, rest)
            if r == r and r < .30: weak.append((k, i, r))
    if weak:
        P('| ものさし | 質問 | 相関 |\n|---|---|---|')
        for k, i, r in weak: P(f'| {k} | {QS[i][2]}{"（逆向き）" if QS[i][1] < 0 else ""} | {f(r)} |')
    else:
        P('なし（全部の質問が、同じものさしのほかの質問と同じ向きに動いています）')

    P('\n## 3. 4つのものさしの割れ方（片方が75％を超えたら、かたより）\n')
    P('| ものさし | 左の型 | 右の型 |\n|---|---|---|')
    for pos, (k, name) in enumerate(SCALES[:4]):
        c = Counter(r['code'][pos] for r in full)
        n = sum(c.values()) or 1
        a, b = 'LVTP'[pos], 'RASC'[pos]
        flag = ' ⚠' if max(c[a], c[b]) / n > .75 else ''
        P(f'| {name} | {a} {c[a] / n * 100:.0f}% | {b} {c[b] / n * 100:.0f}%{flag} |')

    P('\n## 4. 16タイプの出方（2％未満・15％超は ⚠）\n')
    c = Counter(r['code'] for r in full); n = len(full) or 1
    P('| タイプ | 件数 | 割合 |\n|---|---|---|')
    for code in ['LVTP','LVTC','LATP','LATC','LVSP','LVSC','LASP','LASC','RVTP','RVTC','RATP','RATC','RVSP','RVSC','RASP','RASC']:
        p = c[code] / n * 100
        P(f'| {code} | {c[code]} | {p:.1f}%{" ⚠" if (p < 2 or p > 15) and len(full) >= 50 else ""} |')

    P('\n## 5. ものさしどうしの関係（相関）\n')
    P('論文では「心のゆれやすさ（不安）」と「頼り方（回避）」の相関は小さい（−.27〜.12）。ここで大きく出たら、2つが混ざっています。\n')
    keys = [k for k, _ in SCALES]
    P('| | ' + ' | '.join(keys) + ' |\n|' + '---|' * (len(keys) + 1))
    for a in keys:
        P(f'| {a} | ' + ' | '.join(f(corr(totals[a], totals[b])) if a != b else '—' for b in keys) + ' |')
    avoid = [-t for t in totals['TS']]
    P(f'\n- 不安 × 回避（頼り方を反対向きにしたもの）：**{f(corr(totals["AX"], avoid))}**')

    P('\n## 6. 恋の心のくせ（4つの型）の割合\n')
    P('参考：論文（大学生）では、安心型 約26％・気になりやすい型 約47〜49％・ひとりで立つ型 約5％・少し怖くなる型 約21％。\n')
    def kuse(anx, ts):
        a = (anx + 16) / 32 * 100; v = 100 - (ts + 16) / 32 * 100
        return ('近づきたいのに少し怖くなる' if v >= 50 else '相手の気持ちが気になりやすい') if a >= 50 else ('ひとりで立とうとする' if v >= 50 else '安心して寄りそえる')
    kc = Counter(kuse(totals['AX'][j], totals['TS'][j]) for j in range(len(full)))
    for k, v in kc.most_common(): P(f'- {k}：{v}件（{v / n * 100:.0f}%）')

    P('\n## 7. 男女のちがい（論文では、不安・回避に男女差なし）\n')
    for k, name in [('AX', '心のゆれやすさ'), ('TS', '頼り方'), ('PC', '恋の原動力')]:
        fm = [totals[k][j] for j, r in enumerate(full) if r.get('gender') == 'female']
        ml = [totals[k][j] for j, r in enumerate(full) if r.get('gender') == 'male']
        if len(fm) >= 10 and len(ml) >= 10:
            sp = math.sqrt(((len(fm) - 1) * sd(fm) ** 2 + (len(ml) - 1) * sd(ml) ** 2) / (len(fm) + len(ml) - 2))
            d = (mean(fm) - mean(ml)) / sp if sp else float('nan')
            P(f'- {name}：女性 {f(mean(fm))}（{len(fm)}人）／男性 {f(mean(ml))}（{len(ml)}人）／差の大きさ d＝{f(d)}（0.2未満なら差はほぼない）')
        else:
            P(f'- {name}：男女それぞれ10人以上そろうと出します')

    P('\n## 8. 今の恋の状況による「恋の原動力」（論文では片思いの人ほどときめきが高い）\n')
    for s_, lab in [('partner', '恋人がいる'), ('crush', '片思い'), ('none', 'いない')]:
        v = [totals['PC'][j] for j, r in enumerate(full) if r.get('status') == s_]
        P(f'- {lab}：平均 {f(mean(v))}（{len(v)}人。＋が大きいほど、ときめき優先）')

    print('\n'.join(out))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(1)
    main(sys.argv[1])
