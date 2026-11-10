# 扫描线游程分析：把一条水平扫描线压成色块序列，用来核对
#   ① 第 5 栏是否整栏走红  ② 红栏左缘是否真有一条纸色缝（1.5px 错位）
#   ③ 灰色栏线与红版影线的先后关系  ④ 图版区是否真有两色网点
import sys
from pathlib import Path

import numpy as np
from PIL import Image

INS = Path(__file__).resolve().parents[1] / ".inspect"
PAL = [("P", (242, 239, 232)), ("K", (23, 23, 26)), ("R", (211, 32, 41)),
       ("G", (110, 112, 118)), ("s", (182, 180, 174))]


def classify(px):
    best, bd = "?", 1 << 30
    for tag, c in PAL:
        d = max(abs(int(px[i]) - c[i]) for i in range(3))
        if d < bd:
            best, bd = tag, d
    return best if bd <= 40 else "."


def runs(name, ys, x0=0, x1=None):
    a = np.asarray(Image.open(INS / name).convert("RGB"), dtype=np.int16)
    h, w, _ = a.shape
    x1 = x1 or w
    print(f"\n### {name} {w}x{h}")
    for y in ys:
        y = min(max(y, 0), h - 1)
        row = "".join(classify(a[y, x]) for x in range(x0, x1))
        out, i = [], 0
        while i < len(row):
            j = i
            while j < len(row) and row[j] == row[i]:
                j += 1
            n = j - i
            if n >= 2 or row[i] != "P":
                out.append(f"{row[i]}{n}")
            i = j
        print(f"  y={y:5d}: " + " ".join(out)[:900])


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    if which in ("all", "table"):
        runs("desktop-page-01.jpg", [560, 620, 700])
        runs("mobile-page-01.jpg", [300, 430, 560])
    if which in ("all", "plates"):
        runs("desktop-page-01.jpg", [900, 950])
    if which in ("all", "fold"):
        runs("desktop-fold.jpg", [40, 300, 640])
        runs("mobile-fold.jpg", [14, 200, 470])
