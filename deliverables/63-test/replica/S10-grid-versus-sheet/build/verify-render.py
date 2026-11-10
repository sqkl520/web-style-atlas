# S10 —— 渲染产物的机械核对（模型看不了图，就用像素统计代替眼睛）
#
# 检查四件事：
#   1 四个色（#F2EFE8 纸 / #17171A 炭黑 / #D32029 正红 / #6E7076 灰）的实际面积占比
#   2 四角套准线是否真的画出来了（纸边 12px 带内是否有黑像素）
#   3 红版相对黑版是否真的错位（栏线位置附近红像素与黑/灰像素的横向关系 + 顶部错位带）
#   4 每一屏的墨水密度，找出「几乎空的一张」
import sys
from pathlib import Path

import numpy as np
from PIL import Image

INS = Path(__file__).resolve().parents[1] / ".inspect"
PAPER = np.array([242, 239, 232])
INK = np.array([23, 23, 26])
RED = np.array([211, 32, 41])
GREY = np.array([110, 112, 118])


def load(name):
    p = INS / name
    if not p.exists():
        return None
    return np.asarray(Image.open(p).convert("RGB"), dtype=np.int16)


def near(a, c, tol=26):
    return (np.abs(a - c).max(axis=2) <= tol)


def report(name):
    a = load(name)
    if a is None:
        print(f"{name}: 缺")
        return
    h, w, _ = a.shape
    tot = h * w
    print(f"\n=== {name}  {w}x{h} ===")
    for label, c in (("paper #F2EFE8", PAPER), ("ink #17171A", INK), ("red #D32029", RED), ("grey #6E7076", GREY)):
        m = near(a, c, 26)
        print(f"  {label:14s} {m.sum() / tot * 100:5.1f}%")
    flat = near(a, PAPER, 56) | near(a, INK, 56) | near(a, RED, 56) | near(a, GREY, 56)
    print(f"  within-4-inks  {flat.sum() / tot * 100:5.1f}%")
    # 每 60px 一条横向色带的非纸比例：找空屏
    bands = []
    for y in range(0, h - 59, 60):
        band = a[y:y + 60]
        paperish = near(band, PAPER, 40).mean()
        bands.append(round(1 - paperish, 3))
    print("  band ink density (60px): " + " ".join(f"{b:.2f}" for b in bands[:24]))
    # 四角套准线：桌面记号 10..54px，移动 8..16px
    b = 58 if w >= 700 else 22
    for tag, sl in (("TL", (slice(6, b), slice(6, b))),
                    ("TR", (slice(6, b), slice(w - b, w - 6))),
                    ("BL", (slice(h - b, h - 6), slice(6, b))),
                    ("BR", (slice(h - b, h - 6), slice(w - b, w - 6)))):
        box = a[sl]
        dark = (~near(box, PAPER, 40)).mean()
        red = near(box, RED, 46).mean()
        print(f"  reg-band {tag} ink {dark * 100:5.1f}%  red {red * 100:5.1f}%")


def column_rules(name, xs):
    a = load(name)
    if a is None:
        return
    print(f"\n--- {name} 栏线横切（找红版错位）---")
    h, w, _ = a.shape
    for x0 in xs:
        col = a[:, max(0, x0 - 3):x0 + 5]
        red = near(col, RED, 40).sum(axis=0)
        ink = near(col, INK, 40).sum(axis=0)
        grey = near(col, GREY, 34).sum(axis=0)
        print(f"  x={x0} 红 {red.tolist()} 黑 {ink.tolist()} 灰 {grey.tolist()}")


if __name__ == "__main__":
    for nm in ("desktop-fold.jpg", "desktop-page-01.jpg", "desktop-page-02.jpg",
               "tablet-fold.jpg", "mobile-fold.jpg", "mobile-page-01.jpg"):
        report(nm)
    # 桌面 1440：外距 56px，正文宽 1328px，栏线在 6/13/22/30 of 35 处
    left, right = 56, 1440 - 56
    span = right - left
    column_rules("desktop-page-01.jpg", [round(left + span * f / 35) for f in (6, 13, 22, 30)])
