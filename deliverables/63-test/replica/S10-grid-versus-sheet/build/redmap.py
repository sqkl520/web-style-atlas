# 找出图中所有红色像素的行分布，定位「红栏」与「红底错误块」的真实位置与尺寸
import sys
from pathlib import Path

import numpy as np
from PIL import Image

INS = Path(__file__).resolve().parents[1] / ".inspect"
RED = np.array([211, 32, 41])


def redmap(name, minrun=6):
    a = np.asarray(Image.open(INS / name).convert("RGB"), dtype=np.int16)
    m = (np.abs(a - RED).max(axis=2) <= 30)
    rows = m.sum(axis=1)
    print(f"\n### {name} {a.shape[1]}x{a.shape[0]}  红像素 {m.sum()} ({m.mean()*100:.2f}%)")
    y = 0
    h = a.shape[0]
    while y < h:
        if rows[y] >= minrun:
            y0 = y
            while y + 1 < h and rows[y + 1] >= minrun:
                y += 1
            band = m[y0:y + 1]
            xs = np.where(band.any(axis=0))[0]
            print(f"  y {y0:4d}-{y:4d} (高 {y-y0+1:4d})  x {xs.min():4d}-{xs.max():4d} (宽 {xs.max()-xs.min()+1:4d})  峰值行 {band.sum(axis=1).max()}")
        y += 1


if __name__ == "__main__":
    for nm in (sys.argv[1:] or ["desktop-fold.jpg", "desktop-page-01.jpg", "tablet-fold.jpg", "mobile-page-01.jpg"]):
        redmap(nm)
