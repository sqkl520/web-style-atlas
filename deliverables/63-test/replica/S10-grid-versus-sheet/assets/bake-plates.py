# S10 刻度对撞页（Grid Versus Sheet）—— 印版生成器
#
# 规格字段 6：照片转双色（#17171A 与 #D32029）150 线网点，网屏角度 45°，两版故意不套准 1.5px，
# 边缘保留原片的裁切十字。
#
# 做法：把 Wikimedia Commons 抓来的原片（assets/*-raw.jpg）按同一条工艺链压成"已经印出来的纸"：
#   灰度 → 自动色阶 → 45° 网点分色（红版承担中间调、黑版承担暗调、两版叠印处做乘算）→
#   红版网点中心整体偏移 (+1.5px, +1.5px) 造成真实的不套准 → 印版四角留裁切十字。
# 产物是真实位图（真实分辨率、真实网点），不是 CSS 插值，也不是 SVG 描摹。
#
# 同时生成页面用的可平铺纹理：无光泽胶版纸的漫反射颗粒、45° 网点底纹、以及油墨不匀的白斑。
# 页面上这些纹只挂在伪元素上（契约 §9.2：body 保持纯色，否则对比度检查会整条静默跳过）。
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
RAW = HERE
OUT = HERE
CREDITS = HERE

PAPER = (242, 239, 232)   # #F2EFE8 无光泽胶版纸（背景 58%）
INK = (23, 23, 26)        # #17171A 炭黑（正文与黑版 26%）
RED = (211, 32, 41)       # #D32029 正红（主色与红版 11%）
GREY = (110, 112, 118)    # #6E7076 中性灰（套准线与刻度 5%）

CELL = 4.0        # 4px 网点中心距 ≈ 150 线（在 1x 版面下）
ANGLE = 45.0      # 网屏角度 45°
MISREG = 1.5      # 红版相对黑版的右下错位量（字段 6 / 字段 7）


def halftone(cover, cell, angle, lo, hi, dx=0.0, dy=0.0, grow=1.0):
    """把油墨覆盖率场打成网点。cover: float 0..1（1 = 全墨）。
    lo/hi 定义这一版负责的调子区间；dx/dy 是这一版相对版心的错位。"""
    h, w = cover.shape
    plate = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(plate)
    rad = math.radians(angle)
    ca, sa = math.cos(rad), math.sin(rad)
    n = int(math.hypot(w, h) / cell) + 4
    half = cell * 0.5
    span = max(1e-6, hi - lo)
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            cx = w * 0.5 + (i * cell) * ca - (j * cell) * sa + dx
            cy = h * 0.5 + (i * cell) * sa + (j * cell) * ca + dy
            if cx < -cell or cx > w + cell or cy < -cell or cy > h + cell:
                continue
            sx = int(min(max(cx, 0), w - 1))
            sy = int(min(max(cy, 0), h - 1))
            c = float(cover[sy, sx])
            if c < lo:
                continue
            t = min(1.0, (c - lo) / span)
            r = half * math.sqrt(t) * grow
            if r <= 0.2:
                continue
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    return np.asarray(plate, dtype=np.float32) / 255.0


def multiply(base, mask, colour):
    m = mask[..., None]
    return base * (1.0 - m) + (base * np.array(colour, dtype=np.float32) / 255.0) * m


def crop_marks(img, inset=11, arm=22, gap=5):
    """印版四角的裁切十字：1px 十字 + 不闭合的 L 形裁切角线。"""
    d = ImageDraw.Draw(img)
    w, h = img.size
    for (x, y, sx, sy) in [(inset, inset, 1, 1), (w - inset, inset, -1, 1),
                           (inset, h - inset, 1, -1), (w - inset, h - inset, -1, -1)]:
        x0, y0 = x + sx * gap, y + sy * gap
        d.line([x0, y, x0 + sx * arm, y], fill=INK, width=1)
        d.line([x, y0, x, y0 + sy * arm], fill=INK, width=1)
        d.line([x - 6, y, x + 6, y], fill=INK, width=1)
        d.line([x, y - 6, x, y + 6], fill=INK, width=1)
        d.ellipse([x - 3, y - 3, x + 3, y + 3], outline=INK, width=1)
    return img


def grain(size, seed, amount):
    rng = np.random.default_rng(seed)
    w, h = size
    n = rng.normal(0.0, 1.0, (h, w))
    n = np.asarray(Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8))
                   .filter(ImageFilter.GaussianBlur(1.1)), dtype=np.float32)
    return (n - 128.0) / 128.0 * amount


def from_raw(raw_name, out_name, size, seed, ink_lo=0.44, red_lo=0.04, red_hi=0.80, contrast=1.06):
    src = Image.open(RAW / raw_name).convert("RGB")
    tw, th = size
    # 居中裁到目标比例，再落到真实分辨率（不做低分辨率拉伸）
    sw, sh = src.size
    want = tw / th
    if sw / sh > want:
        nw = int(sh * want)
        src = src.crop(((sw - nw) // 2, 0, (sw - nw) // 2 + nw, sh))
    else:
        nh = int(sw / want)
        src = src.crop((0, (sh - nh) // 2, sw, (sh - nh) // 2 + nh))
    src = src.resize((tw, th), Image.LANCZOS)
    g = src.convert("L")
    a = np.asarray(g, dtype=np.float32) / 255.0
    # 自动色阶：把原片的 2%–98% 拉满，暗调压深一点（平印黑的实地感）
    lo, hi = np.percentile(a, 2), np.percentile(a, 98)
    a = np.clip((a - lo) / max(1e-6, hi - lo), 0.0, 1.0)
    a = np.clip(0.5 + (a - 0.5) * contrast, 0.0, 1.0)
    cover = 1.0 - a

    red_plate = halftone(cover, CELL, ANGLE, red_lo, red_hi,
                         dx=MISREG, dy=MISREG, grow=0.92)
    ink_plate = halftone(cover, CELL, ANGLE, ink_lo, 1.02,
                         dx=0.0, dy=0.0, grow=1.02)
    # 油墨挤压：网点边缘外扩一点点（平印的网点扩大）
    ink_plate = np.clip(ink_plate + (ink_plate - np.asarray(
        Image.fromarray((ink_plate * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)),
        dtype=np.float32) / 255.0) * 0.55, 0.0, 1.0)

    base = np.zeros((th, tw, 3), dtype=np.float32) + np.array(PAPER, dtype=np.float32)
    base = multiply(base, red_plate, RED)
    base = multiply(base, ink_plate, INK)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")
    img = crop_marks(img)
    # 双色印版本身就是"纸 + 红 + 黑 + 叠印"四五个色阶，用索引 PNG 存比 JPEG 小一个数量级，
    # 而且不会在网点边缘长出 JPEG 的振铃假边（那会让 150 线网看着像马赛克）。
    ncol = 8
    small = img.quantize(colors=ncol, method=Image.MEDIANCUT, dither=Image.NONE)
    small.save(OUT / out_name, optimize=True)
    return img.size, (OUT / out_name).stat().st_size


def tile_noise(size, seed, strength, blur):
    """可平铺的低频颗粒：用环绕卷积，避免拼接缝。"""
    n = size[0]
    rng = np.random.default_rng(seed)
    a = rng.normal(0, 1, (n, n))
    img = Image.fromarray(((a * 40) + 128).clip(0, 255).astype(np.uint8))
    img = img.filter(ImageFilter.GaussianBlur(blur))
    b = np.asarray(img, dtype=np.float32)
    return ((b - 128.0) / 128.0 * strength)


def paper_tile(n=384, seed=101):
    m = tile_noise((n, n), seed, 1.0, 2.4) + tile_noise((n, n), seed + 7, 0.55, 0.7)
    base = np.zeros((n, n, 3), dtype=np.float32) + np.array(PAPER, dtype=np.float32)
    base *= 1.0 + (m * 0.016)[..., None]
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB")


def screen_tint_tile(n=48, seed=202, strength=11):
    """45° 网点底纹：极淡的一层网，让纸面在放大时看到印版的网线。"""
    d = math.radians(45.0)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    # 用两个正交的正弦叠出 45° 的方格点阵，取平方压成点
    u = (xx * math.cos(d) + yy * math.sin(d)) / 6.0
    v = (-xx * math.sin(d) + yy * math.cos(d)) / 6.0
    dot = (np.cos(2 * math.pi * u) + np.cos(2 * math.pi * v)) * 0.5
    a = np.clip(dot - 0.55, 0.0, 1.0) / 0.45
    rgba = np.zeros((n, n, 4), dtype=np.uint8)
    rgba[..., 0:3] = INK
    rgba[..., 3] = (a * strength).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def mottle_tile(n=256, seed=303, strength=16):
    """油墨不匀：纸上偏白的斑（只在红版分区上叠，方向朝纸色走，不会压低对比度）。"""
    m = tile_noise((n, n), seed, 1.0, 3.0) + tile_noise((n, n), seed + 3, 0.5, 1.0)
    a = np.clip((m - 0.10) * 2.4, 0.0, 1.0)
    rgba = np.zeros((n, n, 4), dtype=np.uint8)
    rgba[..., 0:3] = PAPER
    rgba[..., 3] = (a * strength).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


PLATES = [
    # 主图版：重吊船靠泊（宽幅，用在"原片与网点"一节）
    ("ship-06-raw.jpg", "halftone-lead-ship-06.png", (1240, 700), 11, 0.40, 0.03, 0.78),
    ("port-01-raw.jpg", "halftone-port-01.png", (880, 620), 12, 0.44, 0.04, 0.80),
    ("rail-02-raw.jpg", "halftone-rail-02.png", (880, 620), 13, 0.44, 0.04, 0.80),
    ("store-03-raw.jpg", "halftone-store-03.png", (880, 620), 14, 0.46, 0.05, 0.82),
    ("road-04-raw.jpg", "halftone-road-04.png", (880, 620), 15, 0.44, 0.04, 0.80),
    ("steel-05-raw.jpg", "halftone-steel-05.png", (880, 620), 16, 0.45, 0.05, 0.82),
]

if __name__ == "__main__":
    for raw, out, size, seed, ink_lo, red_lo, red_hi in PLATES:
        if not (RAW / raw).exists():
            print(f"MISSING {raw} — skipped")
            continue
        px, nbytes = from_raw(raw, out, size, seed, ink_lo, red_lo, red_hi)
        print(f"{out}  {px[0]}x{px[1]}  {nbytes} bytes")
    for img, nm in ((paper_tile(), "texture-paper.png"),
                    (screen_tint_tile(), "texture-screen-tint.png"),
                    (mottle_tile(), "texture-mottle.png")):
        img.save(OUT / nm, optimize=True)
        print(f"{nm}  {img.size[0]}x{img.size[1]}  {(OUT / nm).stat().st_size} bytes")
