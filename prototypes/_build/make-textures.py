#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""按 JSON 任务单生成程序化纹理。

为什么要有它：建原型的 agent 在"烘纹理"这一步会无休止地自我迭代（实测 S15 的素材 agent
在这一步上转了整整一小时，产出的素材早在 20 分钟时就够用了）。把这一步从 agent 手里拿走，
改成"配置表 + 确定性脚本"，同一份输入永远得到同一份输出，也不可能跑飞。

用法：
    python make-textures.py <job.json>

job.json 形如：
{
  "outDir": "D:/Web/style/prototypes/S18-phosphor-service-deck/assets",
  "jobs": [
    {"name": "scanline", "gen": "scanlines", "w": 8, "h": 8, "args": {"period": 3, "alpha": 0.16}},
    {"name": "grain",    "gen": "grain",     "w": 256, "h": 256, "args": {"density": 0.5, "alpha": 0.05, "seed": 7}}
  ]
}

写出的文件是 <outDir>/texture-<name>.png，并且会打印一份清单。
"""
import json
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageChops


# ---------- 工具 ----------

def new_rgba(w, h, rgba=(0, 0, 0, 0)):
    return Image.new("RGBA", (w, h), rgba)


def save(img, out_dir, name):
    os.makedirs(out_dir, exist_ok=True)
    p = os.path.join(out_dir, "texture-%s.png" % name)
    img.save(p, "PNG", optimize=True)
    return p, os.path.getsize(p)


def parse_color(c, default=(0, 0, 0)):
    if not c:
        return default
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


# ---------- 生成器 ----------
# 每个生成器都接收 (w, h, args) 并返回一张 RGBA 图。

def gen_grain(w, h, a):
    """颗粒/噪点平铺块：所有方案都用得上，做纸面与胶片颗粒。"""
    rnd = random.Random(a.get("seed", 1))
    density = a.get("density", 0.5)
    alpha = a.get("alpha", 0.06)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    px = img.load()
    for y in range(h):
        for x in range(w):
            if rnd.random() < density:
                px[x, y] = (ink[0], ink[1], ink[2], int(255 * alpha * rnd.random()))
    return img


def gen_scanlines(w, h, a):
    """扫描线：磷光屏、终端、绘图仪出图都用。"""
    period = max(1, int(a.get("period", 3)))
    alpha = a.get("alpha", 0.18)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    px = img.load()
    for y in range(h):
        on = (y % period) == 0
        for x in range(w):
            if on:
                px[x, y] = (ink[0], ink[1], ink[2], int(255 * alpha))
    return img


def gen_grid(w, h, a):
    """栅格：坐标纸、栏线、基线单位。"""
    step = max(1, int(a.get("step", 8)))
    alpha = a.get("alpha", 0.14)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=(ink[0], ink[1], ink[2], int(255 * alpha)), width=1)
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=(ink[0], ink[1], ink[2], int(255 * alpha)), width=1)
    return img


def gen_halftone(w, h, a):
    """网点：把任意照片转成 N 线半调位图时当遮罩，或直接当平铺纹理。"""
    cell = max(2, int(a.get("cell", 6)))
    angle = math.radians(a.get("angle", 15))
    alpha = a.get("alpha", 0.5)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    diag = int(math.hypot(w, h))
    ca, sa = math.cos(angle), math.sin(angle)
    n = diag // cell + 2
    for i in range(-n, n):
        for j in range(-n, n):
            cx = w / 2 + (i * cell) * ca - (j * cell) * sa
            cy = h / 2 + (i * cell) * sa + (j * cell) * ca
            if -cell < cx < w + cell and -cell < cy < h + cell:
                r = cell * 0.34
                d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(ink[0], ink[1], ink[2], int(255 * alpha)))
    return img


def gen_streak(w, h, a):
    """拉丝/刮痕：金属、刷痕、笔触方向。"""
    rnd = random.Random(a.get("seed", 3))
    angle = math.radians(a.get("angle", 0))
    count = int(a.get("count", 90))
    alpha = a.get("alpha", 0.10)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        y = rnd.uniform(-h * 0.2, h * 1.2)
        x0 = rnd.uniform(-w * 0.2, w * 0.6)
        ln = rnd.uniform(w * 0.3, w * 1.4)
        lw = rnd.choice([1, 1, 1, 2])
        x1 = x0 + ln * math.cos(angle)
        y1 = y + ln * math.sin(angle)
        al = int(255 * alpha * rnd.uniform(0.35, 1.0))
        d.line([(x0, y), (x1, y1)], fill=(ink[0], ink[1], ink[2], al), width=lw)
    return img.filter(ImageFilter.GaussianBlur(0.4))


def gen_blotch(w, h, a):
    """斑块/霉斑/锈迹/漏金：不规则边缘的实色斑。"""
    rnd = random.Random(a.get("seed", 5))
    n = int(a.get("count", 7))
    rmin = a.get("rmin", 8)
    rmax = a.get("rmax", 40)
    alpha = a.get("alpha", 0.5)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    for _ in range(n):
        cx, cy = rnd.uniform(0, w), rnd.uniform(0, h)
        pts = []
        k = rnd.randint(9, 16)
        for i in range(k):
            ang = 2 * math.pi * i / k
            r = rnd.uniform(rmin, rmax)
            pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
        d.polygon(pts, fill=(ink[0], ink[1], ink[2], int(255 * alpha * rnd.uniform(0.5, 1.0))))
    return img.filter(ImageFilter.GaussianBlur(0.6))


def gen_fiber(w, h, a):
    """纸纤维：手抄纸、和纸、卡纸的短纤维。"""
    rnd = random.Random(a.get("seed", 11))
    count = int(a.get("count", 260))
    alpha = a.get("alpha", 0.09)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    for _ in range(count):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h)
        ang = rnd.uniform(0, 2 * math.pi)
        ln = rnd.uniform(3, 16)
        d.line([(x, y), (x + ln * math.cos(ang), y + ln * math.sin(ang))],
               fill=(ink[0], ink[1], ink[2], int(255 * alpha * rnd.uniform(0.4, 1.0))), width=1)
    return img


def gen_flake(w, h, a):
    """剥落断口：不规则的层片边缘，用于灰泥/漆面剥落。"""
    rnd = random.Random(a.get("seed", 13))
    n = int(a.get("count", 9))
    alpha = a.get("alpha", 0.85)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    for _ in range(n):
        cx, cy = rnd.uniform(0, w), rnd.uniform(0, h)
        rx, ry = rnd.uniform(w * 0.06, w * 0.2), rnd.uniform(h * 0.05, h * 0.18)
        pts = []
        k = rnd.randint(14, 26)
        for i in range(k):
            ang = 2 * math.pi * i / k
            jitter = rnd.uniform(0.62, 1.28)
            pts.append((cx + rx * jitter * math.cos(ang), cy + ry * jitter * math.sin(ang)))
        d.polygon(pts, fill=(ink[0], ink[1], ink[2], int(255 * alpha * rnd.uniform(0.6, 1.0))))
    return img.filter(ImageFilter.GaussianBlur(0.5))


def gen_crease(w, h, a):
    """折痕：一条带高光与暗边的折线（对折册、地图、说明书）。"""
    horizontal = a.get("horizontal", True)
    pos = a.get("pos", 0.5)
    dark = parse_color(a.get("dark"), (0, 0, 0))
    light = parse_color(a.get("light"), (255, 255, 255))
    alpha = a.get("alpha", 0.5)
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    if horizontal:
        y = int(h * pos)
        d.line([(0, y - 1), (w, y - 1)], fill=(light[0], light[1], light[2], int(255 * alpha * 0.5)), width=1)
        d.line([(0, y), (w, y)], fill=(dark[0], dark[1], dark[2], int(255 * alpha)), width=1)
        d.line([(0, y + 1), (w, y + 1)], fill=(dark[0], dark[1], dark[2], int(255 * alpha * 0.45)), width=1)
    else:
        x = int(w * pos)
        d.line([(x - 1, 0), (x - 1, h)], fill=(light[0], light[1], light[2], int(255 * alpha * 0.5)), width=1)
        d.line([(x, 0), (x, h)], fill=(dark[0], dark[1], dark[2], int(255 * alpha)), width=1)
        d.line([(x + 1, 0), (x + 1, h)], fill=(dark[0], dark[1], dark[2], int(255 * alpha * 0.45)), width=1)
    return img


def gen_band(w, h, a):
    """斜色带：对角切分、警示条、套色分区（不做渐变，只做硬边）。"""
    angle = math.radians(a.get("angle", 58))
    width = a.get("width", 96)
    alpha = a.get("alpha", 1.0)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    cx, cy = w / 2, h / 2
    nx, ny = -math.sin(angle), math.cos(angle)
    hw = width / 2
    quad = [
        (cx - nx * hw - math.cos(angle) * h, cy - ny * hw - math.sin(angle) * h),
        (cx - nx * hw + math.cos(angle) * h, cy - ny * hw + math.sin(angle) * h),
        (cx + nx * hw + math.cos(angle) * h, cy + ny * hw + math.sin(angle) * h),
        (cx + nx * hw - math.cos(angle) * h, cy + ny * hw - math.sin(angle) * h),
    ]
    d.polygon(quad, fill=(ink[0], ink[1], ink[2], int(255 * alpha)))
    return img


def gen_misreg(w, h, a):
    """套印错位边：一条实色描边的偏移副本，用来做 1–2px 的套不准。"""
    dx = a.get("dx", 1.5)
    dy = a.get("dy", 1.5)
    alpha = a.get("alpha", 0.9)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    inset = max(2, int(a.get("inset", 4)))
    d.rectangle([inset + dx, inset + dy, w - inset + dx, h - inset + dy],
                outline=(ink[0], ink[1], ink[2], int(255 * alpha)), width=max(1, int(a.get("lineWidth", 2))))
    return img


def gen_rule(w, h, a):
    """斜线规：一组等距平行细线（11°、42° 这类）。"""
    angle = math.radians(a.get("angle", 11))
    spacing = max(2, int(a.get("spacing", 24)))
    alpha = a.get("alpha", 0.2)
    ink = parse_color(a.get("color"), (0, 0, 0))
    img = new_rgba(w, h)
    d = ImageDraw.Draw(img)
    diag = int(math.hypot(w, h)) + spacing
    ca, sa = math.cos(angle), math.sin(angle)
    for k in range(-diag // spacing, diag // spacing + 1):
        ox, oy = -sa * k * spacing, ca * k * spacing
        d.line([(w / 2 + ox - ca * diag, h / 2 + oy - sa * diag),
                (w / 2 + ox + ca * diag, h / 2 + oy + sa * diag)],
               fill=(ink[0], ink[1], ink[2], int(255 * alpha)), width=1)
    return img


def gen_groove(w, h, a):
    """凹版沟槽：一维深浅相间的槽线，带方向性高光。"""
    period = max(2, int(a.get("period", 4)))
    alpha = a.get("alpha", 0.5)
    dark = parse_color(a.get("dark"), (0, 0, 0))
    light = parse_color(a.get("light"), (255, 255, 255))
    vertical = a.get("vertical", True)
    img = new_rgba(w, h)
    px = img.load()
    n = w if vertical else h
    for i in range(n):
        m = i % period
        if m == 0:
            c, al = light, int(255 * alpha * 0.5)
        elif m == 1:
            c, al = dark, int(255 * alpha)
        else:
            c, al = dark, int(255 * alpha * 0.22)
        for j in range(h if vertical else w):
            if vertical:
                px[i, j] = (c[0], c[1], c[2], al)
            else:
                px[j, i] = (c[0], c[1], c[2], al)
    return img


def gen_vignette(w, h, a):
    """四角减光：用位图做，**不写渐变函数**（合约要求不出现 CSS 渐变）。"""
    strength = a.get("strength", 0.28)
    img = new_rgba(w, h)
    px = img.load()
    cx, cy = w / 2.0, h / 2.0
    maxd = math.hypot(cx, cy)
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / maxd
            al = int(255 * strength * (d ** 2.2))
            px[x, y] = (0, 0, 0, min(255, al))
    return img


GENS = {
    "grain": gen_grain,
    "scanlines": gen_scanlines,
    "grid": gen_grid,
    "halftone": gen_halftone,
    "streak": gen_streak,
    "blotch": gen_blotch,
    "fiber": gen_fiber,
    "flake": gen_flake,
    "crease": gen_crease,
    "band": gen_band,
    "misreg": gen_misreg,
    "rule": gen_rule,
    "groove": gen_groove,
    "vignette": gen_vignette,
}


def main():
    if len(sys.argv) < 2:
        print("用法: python make-textures.py <job.json>")
        return 2
    # 用 utf-8-sig 读：PowerShell 的 Set-Content -Encoding utf8 会写出 UTF-8 BOM，
    # 而 Python 的 json.load(encoding="utf-8") 遇到 BOM 会直接抛
    # "Unexpected UTF-8 BOM (decode using utf-8-sig)"。
    # 这正是契约 §9.5 记的那个坑（S06 的 CREDITS 生成器就是这样从来没成功过）。
    # 与其依赖"写文件的人不带 BOM"，不如读的一侧两种都吃。
    with open(sys.argv[1], "r", encoding="utf-8-sig") as f:
        spec = json.load(f)
    out_dir = spec["outDir"]
    made = []
    for j in spec.get("jobs", []):
        gen = j.get("gen")
        fn = GENS.get(gen)
        if not fn:
            print("  跳过未知生成器: %s" % gen)
            continue
        w = int(j.get("w", 256))
        h = int(j.get("h", 256))
        img = fn(w, h, j.get("args") or {})
        p, size = save(img, out_dir, j["name"])
        made.append((j["name"], gen, w, h, size))
        print("  texture-%s.png  %s  %dx%d  %d B" % (j["name"], gen, w, h, size))
    print("共生成 %d 个纹理 -> %s" % (len(made), out_dir))
    return 0


if __name__ == "__main__":
    sys.exit(main())
