#!/usr/bin/env python3
"""
恋のかたち診断（koi16）のキャラクター画像の、白い背景（や描きこまれた市松模様）を消して、透明な背景の PNG にする。
キャラクターの太いふちどりの外側の、白・薄いグレーの部分だけを消す（ふちどりの内側の白は残る）。
使い方：
    python3 -I tools/koi16_cutout.py 元の画像 koi16/img/LVTP.png
  そのあと koi16/index.html の CHARA_IMG にタイプの4文字を足す。
"""
import sys
from PIL import Image, ImageFilter
from collections import deque
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()
def bg(c):  # 白・薄いグレーの市松（色みがほとんどなく、明るい）
    r, g, b = c
    return min(r, g, b) >= 228 and max(r, g, b) - min(r, g, b) <= 14
mask = bytearray(W * H)  # 1 = 背景
q = deque()
for x in range(W):
    for y in (0, H - 1):
        if bg(px[x, y]) and not mask[y * W + x]: mask[y * W + x] = 1; q.append((x, y))
for y in range(H):
    for x in (0, W - 1):
        if bg(px[x, y]) and not mask[y * W + x]: mask[y * W + x] = 1; q.append((x, y))
while q:
    x, y = q.popleft()
    for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
        if 0 <= nx < W and 0 <= ny < H and not mask[ny * W + nx] and bg(px[nx, ny]):
            mask[ny * W + nx] = 1; q.append((nx, ny))
alpha = Image.frombytes('L', (W, H), bytes(255 - 255 * m for m in mask))
alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))  # ふちを少しなめらかに
out = im.convert('RGBA'); out.putalpha(alpha)
bbox = alpha.point(lambda a: 255 if a > 20 else 0).getbbox()
out = out.crop(bbox)
s = max(out.size); pad = int(s * 0.06); side = s + pad * 2
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.paste(out, ((side - out.size[0]) // 2, (side - out.size[1]) // 2), out)
sq.resize((512, 512), Image.LANCZOS).save(dst, optimize=True)
print('saved', dst, 'transparent px:', sum(mask))
