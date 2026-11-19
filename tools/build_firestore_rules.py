#!/usr/bin/env python3
"""Firebase プロジェクト typeplus-69c66 の Firestore の決まりを、3つのサイトの決まりから1つのファイルにまとめる。
元：nitaku/firestore.rules・isync/firestore.rules・koi16/firestore.rules（それぞれの「match /databases/{database}/documents {」の中身）
出力：firestore-rules/firestore.rules（GitHub の main に入ると .github/workflows/firestore-rules.yml が自動で公開する）
このプロジェクトの Firestore を使っているのはこの3つのサイトだけ（2026-11-19 に確かめた）。ほかのサイトが Firestore を使うときは、ここに足す。"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = 'match /databases/{database}/documents {'
SITES = [('nitaku', '究極の二択'), ('isync', 'アイ・シンク'), ('koi16', '恋のかたち診断')]

def body(t):
    i = t.rindex(K) + len(K)
    u = t.rstrip()
    j = u.rfind('}')
    j = u[:j].rstrip().rfind('}')
    lines = u[i:j].strip('\n').split('\n')
    return '\n'.join(l for l in lines if not l.strip().startswith(('// ===== ここから足す', '// ===== ここまで')))

out = ["rules_version = '2';",
       "// このファイルは tools/build_firestore_rules.py が作る。直すときは各サイトの firestore.rules を直して、もう一度作る。",
       "// main に入ると GitHub Actions が Firebase に自動で公開する（Firebase の画面で直接書きかえない。次の公開で消えてしまう）。",
       "service cloud.firestore {", "  " + K]
for d, n in SITES:
    out.append('\n    // ---------- ' + n + '（' + d + '/firestore.rules）----------')
    out.append(body(open(os.path.join(ROOT, d, 'firestore.rules'), encoding='utf-8').read()))
out += ['  }', '}', '']
open(os.path.join(ROOT, 'firestore-rules', 'firestore.rules'), 'w', encoding='utf-8').write('\n'.join(out))
print('ok')
