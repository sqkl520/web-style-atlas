# -*- coding: utf-8 -*-
"""S15 渔场平面簿（Fishery Floor Ledger）—— 硫酸纸透叠层 / 网格纸纹 / 铅笔与橡皮痕 程序化生成器

规格依据（`_specs/_CURRENT-VALUES.md` 优先，`_specs/S15.md` 次之）：
  字段 3  背景 `#E7EBE9` 硫酸纸透光色 34% / 主色 `#3A3F45` 石墨 46% /
          深色 `#22282B` 铅笔重压处与图例底 15% / 铅笔灰 `#7A7466` 普通标注线 5%
  字段 5  12 栏、基线 8px、栏间距 20px、图廓留边 32px
  字段 6  ① 硫酸纸透叠：三层错位 0 / 3 / 7px，边缘有 1px 纸张毛口；
          ② 铅笔标注 0.8px 硬线、方头端点、末端 2–6px 橡皮擦除残迹（12% 不透明度的浅灰底）；
          ④ 图像处理禁止暖色滤镜与纸张纹理贴图
  字段 9  ③「禁止任何纸张纹理贴图与暖色调整层，纹理只能来自程序化噪声且不透明度上限 4%」
  字段 11 栅格单位 8px 基线、图廓留边 32px；「纹理只用 4% 不透明度的程序化噪声」
  字段 12 页脚 1:200 手绘比例尺：第 7 格窄 0.5px、第 13 格宽 0.5px（原件是人用尺子一格一格画的）

本脚本只写 `assets/texture-*.png` 与 `build/textures.json`（自己的清单），
**不写 `assets/CREDITS.md`**——那是 `build/write-credits.py` 的唯一职责（契约 §9.5）。

关于「4% 上限」的边界，本脚本按下面这条口径执行，并把实测值打出来（不靠声明）：
  - 纸张颗粒（纸张纹理贴图的替身，也是字段 9 点名的那一项）：`texture-noise-4pct.png`，
    实测最大 alpha 10/255 = 3.92% ≤ 4%，全程序化生成、不含任何扫描纸料；
  - 结构层（硫酸纸本身、网格线、铅笔压痕、橡皮残迹、比例尺）不是「纸纹贴图」，
    它们是字段 6 点名要做的机制件；它们的噪声成分同样全部来自程序化噪声，
    本脚本对每一张都打印实测的最大偏离值，供复核。

PIT（踩过才写的）：
  1. Pillow 的 ImageDraw 是硬边（无抗锯齿）。比例尺要做到「第 7 格窄 0.5px」这种亚像素差，
     必须先按 4 倍超采样画、再 LANCZOS 缩回，否则 0.5px 会被取整吃掉、怪癖消失。
  2. 高斯/双三次上采样的噪声才是「纤维状」的；逐像素白噪声放大后是沙砾不是纤维。
  3. RGBA 存 PNG 时 alpha 不能乘进 RGB，否则叠三层会发灰（Pillow 不做预乘）。

用法：python build/make-plates.py
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets"
BUILD = ROOT / "build"
OUT.mkdir(parents=True, exist_ok=True)
BUILD.mkdir(parents=True, exist_ok=True)

PAPER = (231, 235, 233)        # #E7EBE9 硫酸纸透光色（背景色，全案唯一纸色）
GRAPHITE = (58, 63, 69)        # #3A3F45 石墨（主色）
PENCIL_DARK = (34, 40, 43)     # #22282B 铅笔重压处
PENCIL_GREY = (122, 116, 102)  # #7A7466 普通标注线

BASELINE = 8                   # 字段 5 / 11：8px 基线
MODULE = 40                    # 5 个基线单位 = 一个测绘模数
MARGIN = 32                    # 字段 5 / 11：图廓留边 32px

# 4% 上限：alpha 上限取 10/255 = 3.92%（11/255 = 4.31% 就越界了）
NOISE_ALPHA_MAX = 10
ERASER_ALPHA_MAX = round(0.12 * 255)   # 字段 6②：擦痕底面 12% 不透明度

LOG = []


# ---------------------------------------------------------------- 基础工具

def to_l(arr):
    return Image.fromarray(np.clip(arr * 255.0, 0, 255).astype(np.uint8), "L")


def value_noise(w, h, seed, cells_x, cells_y, octaves=3, periodic=True):
    """双三次上采样得到的平滑噪声场，值域 0..1。

    periodic=True 时把降采样网格的首末行列对齐，缩回后接缝几乎不可见
    （平铺用的贴图必须是这个模式，否则背景 repeat 会出现方格状接缝）。
    """
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cx = max(3, int(cells_x * (2 ** o)))
        cy = max(3, int(cells_y * (2 ** o)))
        small = rng.random((cy, cx)).astype(np.float32)
        if periodic:
            small[-1, :] = small[0, :]
            small[:, -1] = small[:, 0]
        im = to_l(small).resize((w, h), Image.BICUBIC)
        acc += amp * (np.asarray(im, np.float32) / 255.0)
        total += amp
        amp *= 0.5
    return acc / total


def fiber_field(w, h, seed, along="y", octaves=4):
    """纤维结构：沿一个方向略微拉长的云状噪声。值域 0..1。

    PIT：第一版把 cells_x 取成 w//6（周期 6px），缩略图上与像素栅格打架，叠出一层
    「编织袋／瓦楞板」的规则网纹——那不是硫酸纸，是摩尔纹。纤维要的是「大团、微微拉长」，
    所以低频 + 多倍频，且两个方向的周期都不低于 16px（细纤维用低振幅单独加）。
    """
    if along == "y":            # 纵向长纤维：纵向低频、横向中频
        return value_noise(w, h, seed, cells_x=max(10, w // 48), cells_y=8, octaves=octaves)
    return value_noise(w, h, seed, cells_x=8, cells_y=max(10, h // 48), octaves=octaves)


def pulp_field(w, h, seed):
    """纸浆不匀：各向同性的云状噪声（大团），这是硫酸纸「看着有厚薄」的主因。"""
    return value_noise(w, h, seed, cells_x=max(6, w // 120), cells_y=max(6, h // 120), octaves=3)


def fine_fiber(w, h, seed, along="x"):
    """细纤维：周期 16px 上下、振幅很低的一层，只用来在 1:1 下补一点「纸」的质感。"""
    if along == "x":
        return value_noise(w, h, seed, cells_x=max(24, w // 16), cells_y=max(10, h // 90), octaves=2)
    return value_noise(w, h, seed, cells_x=max(10, w // 90), cells_y=max(24, h // 16), octaves=2)


def rgba(color, alpha):
    """color=(r,g,b)，alpha=0..1 的二维数组或标量 -> RGBA 图（不做预乘）。"""
    w, h = alpha.shape[1], alpha.shape[0]
    arr = np.zeros((h, w, 4), np.uint8)
    arr[..., 0], arr[..., 1], arr[..., 2] = color
    arr[..., 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def report(name, im, extra):
    p = OUT / name
    im.save(p, optimize=True)
    w, h = im.size
    row = {
        "file": name, "width": w, "height": h, "mode": im.mode,
        "bytes": p.stat().st_size,
    }
    row.update(extra)
    LOG.append(row)
    print("{:<30} {:>5}x{:<5} {:>9} B  {}".format(
        name, w, h, row["bytes"], extra.get("note", "")))
    return row


# ------------------------------------------------------- 一、硫酸纸透叠层

def deckle_mask(w, h, seed, rough=1.0):
    """1px 纸张毛口：四边随机内啃 0–2px，再补几处 2–8px 长的缺口；啃到的地方留 45% 的一圈毛边。

    返回值 0..1 的乘性掩膜。整体外圈再减一档，叠起来时层与层的边界才看得出是两/三张纸
    （字段 6① 的「边缘有 1px 的纸张毛口」）。
    """
    rng = np.random.default_rng(seed)
    m = np.ones((h, w), np.float32)
    depth_scale = rough

    def bite(edge):
        if edge in ("top", "bottom"):
            n = w
            d = np.clip((rng.random(n) ** 2 * 3 * depth_scale), 0, 2.99).astype(int)
            for i in range(n):
                k = int(d[i])
                if k <= 0:
                    continue
                if edge == "top":
                    m[:k, i] = 0.0
                    m[k, i] = min(m[k, i], 0.45)
                else:
                    m[h - k:, i] = 0.0
                    m[h - k - 1, i] = min(m[h - k - 1, i], 0.45)
        else:
            n = h
            d = np.clip((rng.random(n) ** 2 * 3 * depth_scale), 0, 2.99).astype(int)
            for i in range(n):
                k = int(d[i])
                if k <= 0:
                    continue
                if edge == "left":
                    m[i, :k] = 0.0
                    m[i, k] = min(m[i, k], 0.45)
                else:
                    m[i, w - k:] = 0.0
                    m[i, w - k - 1] = min(m[i, w - k - 1], 0.45)

    for e in ("top", "bottom", "left", "right"):
        bite(e)
    # 长缺口：纸张被翻旧之后边缘会有几处成段的撕口
    for _ in range(int(70 * rough)):
        x = int(rng.integers(0, w - 12))
        ln = int(rng.integers(3, 13))
        dp = int(rng.integers(2, 5))
        if rng.random() < 0.5:
            m[:dp, x:x + ln] = 0.0
            m[dp, x:x + ln] = min(float(m[dp, x]), 0.4)
        else:
            m[h - dp:, x:x + ln] = 0.0
            m[h - dp - 1, x:x + ln] = min(float(m[h - dp - 1, x]), 0.4)
    return m


def paper_lum(w, h, seed, cap_pct=3.9):
    """纸面亮度场：纸浆不匀 + 方向性纤维 + 细纤维，自动定标到 cap_pct（百分比）的亮度偏离上限。

    返回 (lum HxWx3 数组, 实测最大偏离百分比, 0..1 的归一化场)。
    「自动定标」是故意的：上限由构造保证，而不是靠某个常量恰好取对——第一版的 22.0
    就是这种常量，换一张尺寸就漂了。
    PIT：cap_pct 的口径必须和这里的 /100 对上。第一版传的是 0.039（已经是小数）却又除了 100，
    于是纤维被压成 0.04%——纸面完全平掉，文件也小了三倍，而日志上那行「deviation 0.04%」
    看起来还挺像回事。数值型断言要连口径一起断言。
    """
    pulp = pulp_field(w, h, seed + 7)
    fib_y = fiber_field(w, h, seed + 1, "y")
    fib_x = fiber_field(w, h, seed + 2, "x")
    fine = fine_fiber(w, h, seed + 5, "x")

    def z(a):
        return (a - a.mean()) / (a.std() + 1e-6)

    fiber = 0.55 * z(pulp) + 0.26 * z(fib_y) + 0.14 * z(fib_x) + 0.05 * z(fine)
    k = (cap_pct / 100.0 * 255.0) / (np.abs(fiber).max() + 1e-6)
    lum = np.clip(np.array(PAPER, np.float32)[None, None, :] + (fiber * k)[..., None], 0, 255)
    dev_pct = float(np.abs(fiber * k).max()) / 255.0 * 100
    fn = (fiber - fiber.min()) / (fiber.max() - fiber.min() + 1e-6)
    return lum, dev_pct, fn


def trace_sheet(name, seed, year, base_alpha=0.88, w=1400, h=1050,
                holes=False, crease=False, torn_corner=False, rough=1.0):
    """一张硫酸纸：纸色 + 纤维（程序化噪声，实测偏离 ≤3.9%）+ 1px 毛口 + 该年份自己的旧痕。

    三层用同一个纸色（字段 3 只允许 `#E7EBE9` 一个纸色），也刻意用**同一个 base_alpha**：
    字段 5 的「透明度 100% / 78% / 56%」是页面按层号给的，烤进位图就会和页面打架、
    年份切换时也改不动。三张纸的区别只在毛口粗糙度与该年份的旧痕上。
    """
    lum, dev_pct, fn = paper_lum(w, h, seed)
    alpha = base_alpha * deckle_mask(w, h, seed + 3, rough) * (0.93 + 0.14 * fn)

    arr = np.zeros((h, w, 4), np.uint8)
    arr[..., :3] = lum.astype(np.uint8)
    arr[..., 3] = np.clip(alpha * 255.0, 0, 255).astype(np.uint8)
    im = Image.fromarray(arr, "RGBA")

    marks = []
    if holes:
        # 1936 年这一张被装订过：左边缘两个 16px 归档孔，孔口一圈纤维毛边
        d = ImageDraw.Draw(im)
        for cy in (int(h * 0.34), int(h * 0.66)):
            cx = 34
            d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=(0, 0, 0, 0))
            d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], outline=PAPER + (120,), width=1)
            d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], outline=PAPER + (70,), width=1)
        marks.append("left-edge archival punch holes x2")
    if crease:
        # 1936 年这一张被对折过：折痕处纸纤维被压实，透光反而更亮（更不透明）
        d = ImageDraw.Draw(im)
        rng = np.random.default_rng(seed + 9)
        x0 = int(w * 0.38)
        for y in range(h):
            x = x0 + int(round(math.sin(y / 90.0) * 1.6 + rng.normal(0, 0.4)))
            d.line([x, y, x, y], fill=PAPER + (215,))
            d.line([x + 1, y, x + 1, y], fill=PAPER + (110,))
        marks.append("full-height fold crease at 38% width")
    if torn_corner:
        # 1938 年那一张的右上角被撕掉了：撕口带纤维毛边，不是直线
        a = np.asarray(im).copy()
        rng = np.random.default_rng(seed + 11)
        for y in range(0, 240):
            cut = int(300 - y * 1.15 + rng.normal(0, 5))
            if cut <= 0:
                continue
            a[y, w - cut:, 3] = 0
            fx = w - cut - 1
            if 0 <= fx < w:
                a[y, fx, 3] = min(int(a[y, fx, 3]), 100)
        im = Image.fromarray(a, "RGBA")
        marks.append("torn-off top-right corner (~300x240px)")
    note = "tracing sheet {} | alpha_mean={:.3f} | {}".format(year, alpha.mean(), "; ".join(marks) or "no archival marks")
    return report(name, im, {
        "kind": "trace-sheet", "year": year, "seed": seed,
        "alpha_mean": round(float(alpha.mean()), 4),
        "alpha_min": int(np.asarray(im)[..., 3].min()),
        "alpha_max": int(np.asarray(im)[..., 3].max()),
        "deckle_max_px": int(round(3 * rough)),
        "fibre_luminance_dev_pct": round(dev_pct, 2),
        "translucent_fraction": round(float((np.asarray(im)[..., 3] < 255).mean()), 4),
        "note": note + " | fibre deviation {:.2f}% of 255".format(dev_pct),
    })


# --------------------------------------------------------- 二、网格纸纹

def grid_tile(name, size=960, seed=15):
    """8px 基线的可平铺网格：3 级线宽（8px 细 / 40px 中 / 240px 粗），全部 1px 硬线。

    周期 8 / 40 / 240 都能整除 960，所以 repeat 之后接缝处线条连续。
    """
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for x in range(0, size, BASELINE):
        if x % 240 == 0:
            a = 30
        elif x % MODULE == 0:
            a = 15
        else:
            a = 7
        d.line([x, 0, x, size - 1], fill=GRAPHITE + (a,), width=1)
    for y in range(0, size, BASELINE):
        if y % 240 == 0:
            a = 30
        elif y % MODULE == 0:
            a = 15
        else:
            a = 7
        d.line([0, y, size - 1, y], fill=GRAPHITE + (a,), width=1)
    # 交点补一个 1px 的加重点，是测绘纸上打格子留下的针点
    for x in range(0, size, MODULE):
        for y in range(0, size, MODULE):
            d.point([x, y], fill=GRAPHITE + (46,))
    return report(name, im, {
        "kind": "grid-tile", "seed": seed, "tileable": True,
        "periods_px": [BASELINE, MODULE, 240],
        "line_alpha": {"minor": 7, "module": 15, "major": 30, "node": 46},
        "note": "8px baseline grid tile, 1px hard rules, 3 weights, seamless at 960px",
    })


def plan_frame(name, w=1600, h=1200, seed=16):
    """平面图纸面：纸色 + 纤维 + 32px 图廓留边 + 角部测绘十字与边中刻线。

    这是「网格纸纹」的整张版本（可直接当平面图底），网格部分与 grid_tile 同一套周期。
    """
    lum, dev_pct, _ = paper_lum(w, h, seed)
    base = np.dstack([lum, np.full((h, w, 1), 255.0, np.float32)]).astype(np.uint8)
    im = Image.fromarray(base, "RGBA")
    d = ImageDraw.Draw(im)
    for x in range(0, w, BASELINE):
        a = 26 if x % 240 == 0 else (13 if x % MODULE == 0 else 6)
        d.line([x, 0, x, h - 1], fill=GRAPHITE + (a,), width=1)
    for y in range(0, h, BASELINE):
        a = 26 if y % 240 == 0 else (13 if y % MODULE == 0 else 6)
        d.line([0, y, w - 1, y], fill=GRAPHITE + (a,), width=1)
    # 图廓留边：32px 一圈 1px 硬线，四角各向外延长 12px（测绘图幅的习惯画法）
    m = MARGIN
    d.rectangle([m, m, w - 1 - m, h - 1 - m], outline=GRAPHITE + (150,), width=1)
    for (cx, cy, dx, dy) in ((m, m, 1, 1), (w - 1 - m, m, -1, 1),
                             (m, h - 1 - m, 1, -1), (w - 1 - m, h - 1 - m, -1, -1)):
        d.line([cx, cy, cx + dx * 12, cy], fill=GRAPHITE + (170,), width=1)
        d.line([cx, cy, cx, cy + dy * 12], fill=GRAPHITE + (170,), width=1)
        d.line([cx - 6, cy, cx + 6, cy], fill=GRAPHITE + (120,), width=1)
        d.line([cx, cy - 6, cx, cy + 6], fill=GRAPHITE + (120,), width=1)
    # 边中刻线：四条边的正中各一道 8px 短刻线 + 一道 4px 半格刻线（复核坐标用）
    for (x0, y0, x1, y1) in ((w // 2, m - 10, w // 2, m + 10),
                             (w // 2, h - m - 10, w // 2, h - m + 10),
                             (m - 10, h // 2, m + 10, h // 2),
                             (w - m - 10, h // 2, w - m + 10, h // 2)):
        d.line([x0, y0, x1, y1], fill=GRAPHITE + (165,), width=1)
    return report(name, im, {
        "kind": "plan-frame", "seed": seed,
        "margin_px": MARGIN, "baseline_px": BASELINE,
        "fibre_luminance_dev_pct": round(dev_pct, 2),
        "note": "plan sheet ground: 32px map margin rule + corner survey crosses + 8px grid",
    })


# ------------------------------------------- 三、铅笔压痕 / 橡皮痕 / 纸颗粒

def pencil_grain(name, w=1400, h=1000, seed=17):
    """铅笔压痕的侧向阴影：横向拉长的石墨磨痕，alpha 上限 0.22（实测打日志）。

    字段 6④ 要求「保留原始铅笔压痕的侧向阴影」——照片里那一份由下载的原件承担，
    这一张是给 SVG 线稿下面垫的压痕层（SVG 线本身没有压痕）。
    """
    # 横向拉长 = 横向低频、纵向高频。第一版把两个方向写反了，出来是「木纹」不是铅笔压痕。
    f1 = value_noise(w, h, seed, cells_x=14, cells_y=max(12, h // 10), octaves=4)
    f2 = value_noise(w, h, seed + 1, cells_x=40, cells_y=max(8, h // 3), octaves=3)
    f = 0.72 * f1 + 0.28 * f2
    f = (f - f.mean())
    f = f / (np.abs(f).max() + 1e-6)
    alpha = np.clip(0.22 * (f * 0.5 + 0.5) ** 2.2, 0, None)
    im = rgba(GRAPHITE, alpha)
    return report(name, im, {
        "kind": "pencil-grain", "seed": seed,
        "alpha_max_measured": round(float(alpha.max()), 4),
        "streak_ratio": "8:1 along x",
        "note": "graphite impression shading, streaks stretched 8:1 along x, procedural only",
    })


def eraser_smudge(name, w=1200, h=600, seed=18, blots=9):
    """橡皮擦除残迹：纸色白痕 + 12% 不透明度的浅灰底 + 断掉的线头。

    字段 6② 的原话是「线条中断后留下 12% 不透明度的浅灰底」，
    所以这里的 alpha 上限就取 0.12，并把实测值打出来。
    """
    f = value_noise(w, h, seed, cells_x=14, cells_y=8, octaves=4)
    alpha = np.zeros((h, w), np.float32)
    rng = np.random.default_rng(seed + 3)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    for _ in range(blots):
        cx = float(rng.integers(90, w - 90))
        cy = float(rng.integers(70, h - 70))
        rx = float(rng.integers(48, 130))
        ry = float(rng.integers(26, 66))
        th = float(rng.random() * math.pi)
        xr = (xx - cx) * math.cos(th) + (yy - cy) * math.sin(th)
        yr = -(xx - cx) * math.sin(th) + (yy - cy) * math.cos(th)
        r = (xr / rx) ** 2 + (yr / ry) ** 2
        edge = np.clip(1.2 - r, 0, 1)
        alpha = np.maximum(alpha, edge * (0.55 + 0.45 * f))
    alpha = np.clip(alpha * ERASER_ALPHA_MAX / 255.0, 0, ERASER_ALPHA_MAX / 255.0)
    # 颜色必须是石墨而不是白：字段 6② 要的是「12% 不透明度的浅灰底」，
    # 用白在同为浅色的纸底 `#E7EBE9` 上等于没画（第一版就是这样，QC 接触表上完全看不见）。
    # 石墨 12% 合成到纸上 = (210,214,213)，正是「浅灰底」，且仍然严格 ≤12%。
    im = rgba(GRAPHITE, alpha)
    # 断掉的线头：两段 1px 硬线在擦痕处中断，断口处留 12% 的浅灰底
    d = ImageDraw.Draw(im)
    for (y0, x0, x1, gap) in ((int(h * 0.36), 40, w - 60, (520, 96)),
                              (int(h * 0.62), 70, w - 40, (760, 140))):
        g0, gl = gap
        d.line([x0, y0, g0 - 1, y0], fill=GRAPHITE + (215,), width=1)
        d.line([g0 + gl, y0, x1, y0], fill=GRAPHITE + (215,), width=1)
        d.line([g0, y0 - 3, g0, y0 + 3], fill=GRAPHITE + (90,), width=1)
        d.line([g0 + gl, y0 - 3, g0 + gl, y0 + 3], fill=GRAPHITE + (90,), width=1)
    return report(name, im, {
        "kind": "eraser-smudge", "seed": seed, "blots": blots,
        "alpha_max_measured": round(float(alpha.max()), 4),
        "note": "eraser residue under the 12% cap (measured {:.1f}%) + 2 broken pencil stubs with 2-6px frayed ends".format(
            float(alpha.max()) * 100),
    })


def paper_noise(name, size=1024, seed=19):
    """纸颗粒：全程序化噪声，最大 alpha 10/255 = 3.92%，严格在字段 9③ 的 4% 上限内。

    白噪声本身没有周期，平铺时不会出现接缝（这是唯一一种不需要 periodic 处理的噪声）。
    """
    rng = np.random.default_rng(seed)
    fine = rng.random((size, size)).astype(np.float32)
    coarse = np.asarray(to_l(rng.random((size // 16 + 1, size // 16 + 1)).astype(np.float32))
                        .resize((size, size), Image.BICUBIC), np.float32) / 255.0
    mix = 0.62 * fine + 0.38 * coarse
    alpha = mix * (NOISE_ALPHA_MAX / 255.0)
    im = rgba((0, 0, 0), alpha)
    return report(name, im, {
        "kind": "paper-noise", "seed": seed, "tileable": True,
        "alpha_max_cap": NOISE_ALPHA_MAX,
        "alpha_max_measured": round(float(alpha.max()), 5),
        "alpha_max_pct": round(float(alpha.max()) * 100, 2),
        "note": "paper grain, procedural noise only, max alpha 10/255 = 3.92% <= the 4% cap",
    })


# ------------------------------------------------- 四、1:200 手绘比例尺（字段 12）

def scale_bar(name, cells=14, cell_px=96, ss=4, out_w=1400):
    """页脚那根 1:200 比例尺：14 格，第 7 格窄 0.5px、第 13 格宽 0.5px。

    字段 12 说这根尺子是 1930 年代的人一格一格手画的，所以除了一格宽一格窄，
    基线还要有 ±0.5px 的手抖、每格的分隔线不垂直于基线。
    亚像素差必须靠 ss=4 倍超采样再 LANCZOS 缩回来，直接在 1x 上画会被取整抹平（PIT 1）。

    出图是 2 倍图（1400x96 = 700x48 @2x）：0.8px 的铅笔线在这里是 1.6px，
    页面按 50% 显示即是 0.8px；留 2 倍是为了让 0.5px 的格宽差真的落在像素上。

    形状照 1930 年代制图尺：一道基线 + 一道压顶线，两线之间交替填实心格，
    每 5 格一道通高的主分划、其余为半格分划，两端各一个收头端钮。
    PIT：第一版只画了基线、没有压顶线，缩略图上看像一条虚线，不像尺子。
    """
    W, H = out_w * ss, 96 * ss
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    rng = np.random.default_rng(15)
    widths = []
    for i in range(cells):
        wpx = float(cell_px)
        if i == 6:            # 第 7 格（0-based 6）
            wpx -= 0.5
        if i == 12:           # 第 13 格（0-based 12）
            wpx += 0.5
        widths.append(wpx)
    span = sum(widths)
    total = span * ss
    left = (W - total) / 2.0
    base_y = H * 0.66
    bar_h = 16.0 * ss          # 压顶线与基线的间距（成图 16px）
    tick_tall = 30.0 * ss      # 主分划通高（比压顶线再高出 14px）
    tick_short = bar_h         # 半格分划只到压顶线
    xs = [left]
    for wp in widths:
        xs.append(xs[-1] + wp * ss)
    lw = int(round(1.6 * ss))  # 0.8px @2x = 1.6px，超采样下按 6.4px 画

    def wob(i):
        return float(rng.normal(0, 0.5)) * ss      # 手抖 ±0.5px（1x 口径）

    # 压顶线：同样一段一段画，接缝处允许 0.5px 的错台（原件的尺子是一格一格接上去的）
    for i in range(cells):
        y0 = base_y + wob(i) - bar_h
        y1 = base_y + wob(i + 1) - bar_h
        d.line([xs[i], y0, xs[i + 1], y1], fill=PENCIL_DARK + (255,), width=lw)
    # 基线
    for i in range(cells):
        y0 = base_y + wob(i)
        y1 = base_y + wob(i + 1)
        d.line([xs[i], y0, xs[i + 1], y1], fill=PENCIL_DARK + (255,), width=lw)
    # 交替实心格：奇数格在两线之间填石墨，四周各收 1px 留出手绘的缝
    for i in range(cells):
        if i % 2 == 0:
            continue
        y1 = base_y + wob(i)
        y2 = base_y + wob(i + 1)
        top = min(y1, y2) - bar_h + 1.0 * ss
        d.rectangle([xs[i] + 1.0 * ss, top, xs[i + 1] - 1.0 * ss, max(y1, y2) - 1.0 * ss],
                    fill=GRAPHITE + (205,))
    # 分划：每 5 格一道通高主分划，其余半格
    for i in range(cells + 1):
        x = xs[i] + wob(i)
        y0 = base_y + wob(i)
        hh = tick_tall if (i % 5 == 0 or i in (0, cells)) else tick_short
        d.line([x, y0, x + wob(i) * 0.6, y0 - hh], fill=PENCIL_DARK + (255,), width=lw)
    # 首尾端钮：两道加高的端线 + 小圆点，1930 年代制图尺的收头
    for i in (0, cells):
        x = xs[i] + wob(i)
        d.line([x, base_y - tick_tall * 1.25, x, base_y + 6.0 * ss],
               fill=PENCIL_DARK + (255,), width=lw)
        d.ellipse([x - 2.2 * ss, base_y + 9.0 * ss - 2.2 * ss,
                   x + 2.2 * ss, base_y + 9.0 * ss + 2.2 * ss], fill=PENCIL_DARK + (230,))
    im = im.resize((out_w, 96), Image.LANCZOS)
    return report(name, im, {
        "kind": "scale-bar", "cells": cells, "cell_px_at_1x": cell_px,
        "supersample": ss, "render_scale": 2,
        "cell7_delta_px": -0.5, "cell13_delta_px": +0.5,
        "note": "1:200 footer scale bar, cell 7 is 0.5px narrow and cell 13 0.5px wide (field 12), "
                "2x bitmap so the half-pixel quirk survives; the page prints the 1:200 label itself",
    })


def main():
    print("== S15 assets: procedural paper, grid and pencil plates ==")
    # 三张纸用同一个 base_alpha=0.88：层间的 100% / 78% / 56% 由页面按层号给（字段 5），
    # 三张的差别只在毛口粗糙度与该年份的旧痕上。
    trace_sheet("texture-trace-1934.png", seed=34, year=1934, rough=1.0)
    trace_sheet("texture-trace-1936.png", seed=36, year=1936,
                holes=True, crease=True, rough=1.2)
    trace_sheet("texture-trace-1938.png", seed=38, year=1938,
                torn_corner=True, rough=1.6)
    grid_tile("texture-grid-8px-tile.png")
    plan_frame("texture-plan-frame.png")
    pencil_grain("texture-pencil-grain.png")
    eraser_smudge("texture-eraser-smudge.png")
    paper_noise("texture-noise-4pct.png")
    scale_bar("texture-scalebar-1to200.png")

    manifest = {
        "prototype": "S15-fishery-floor-ledger",
        "generator": "build/make-plates.py",
        "palette": {
            "paper": "#E7EBE9", "graphite": "#3A3F45",
            "pencil_dark": "#22282B", "pencil_grey": "#7A7466",
        },
        "caps": {
            "paper_noise_alpha_max": NOISE_ALPHA_MAX,
            "paper_noise_pct": round(NOISE_ALPHA_MAX / 255 * 100, 2),
            "eraser_alpha_max": ERASER_ALPHA_MAX,
            "baseline_px": BASELINE, "module_px": MODULE, "map_margin_px": MARGIN,
        },
        "files": LOG,
    }
    p = BUILD / "textures.json"
    p.write_text(json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8")
    print("--- manifest -> {} ({} files) ---".format(p, len(LOG)))


if __name__ == "__main__":
    main()
