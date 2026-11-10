# -*- coding: utf-8 -*-
# S14 零重力发射序 —— 材料位图生成器（程序化，Pillow）
#
# 规格字段 6：
#   一、铝箔标贴本体 0.15mm 厚，边缘 1px #D8D2C4 高光，热压编号凹进 0.3mm，
#       反光带只在 12° 视角区间内出现 —— 反光带做成位图遮罩（字段 11 明确要求，
#       因为不能用任何 CSS 色彩插值写法）；
#   二、低重力气泡纹理，直径 3–9px 的硬边圆环散布在底色上，边缘 1px 硬线、不发光、无填充；
#   三producer、铝箔反光处叠加 8% 不透明度的 128×128 颗粒；
#   四、图像处理禁止柔光与镜头光晕。
# 字段 12：每枚标贴右上角压一枚 0.6mm 高手写缩写「地勤」，共 11 处，每处抖动都不一样，
#          所以做成 11 格精灵图，每枚标贴取自己那一格。
import math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parents[1] / "assets"
OUT.mkdir(parents=True, exist_ok=True)

SILVER = (216, 210, 196)
ORANGE = (228, 87, 46)
DARK = (18, 24, 29)


def bubble_field(size=512, count=150, seed=14):
    """低重力气泡：3–9px 硬边圆环，1px 硬线、无填充、不发光。平铺不出现明显接缝。"""
    rng = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rings = []
    for _ in range(count):
        cx, cy = rng.randrange(size), rng.randrange(size)
        r = rng.uniform(1.5, 4.5)
        a = rng.randint(20, 54)
        rings.append((cx, cy, r, a))
    for (cx, cy, r, a) in rings:
        # 越界的那一份在对面再画一遍，保证平铺接缝处圆环完整
        for ox, oy in ((0, 0), (size, 0), (-size, 0), (0, size), (0, -size),
                       (size, size), (-size, -size), (size, -size), (-size, size)):
            x, y = cx + ox, cy + oy
            if -12 < x < size + 12 and -12 < y < size + 12:
                d.ellipse([x - r, y - r, x + r, y + r], outline=SILVER + (a,), width=1)
    return img


def foil_grain(size=128, seed=7):
    """8% 不透明度的 128×128 颗粒（铝箔非涂布面的反光颗粒），平铺。"""
    rng = random.Random(seed)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(size):
        for x in range(size):
            v = rng.random()
            if v > 0.86:
                px[x, y] = SILVER + (20,)
            elif v < 0.06:
                px[x, y] = (0, 0, 0, 26)
    return img


def sheen_band(w=900, h=140, angle=12.0, seed=3):
    """12° 视角反光带：一条 12° 斜向的窄带，核心 10px、两侧 4px 内硬收边（不发光）。
    带内亮度逐行做小幅随机起伏——真实铝箔的反光带不是一条均匀亮条。"""
    rng = random.Random(seed)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rad = math.radians(angle)
    cx0 = w * 0.52
    tan = math.tan(rad)
    for i in range(-h, h * 2):
        t = i / math.cos(rad)
        dist = abs(t)
        if dist > 34:
            continue
        core = 1.0 if dist <= 5 else max(0.0, 1 - (dist - 5) / 4.0)
        if core <= 0:
            continue
        a = int(round(core * (46 + rng.randint(0, 20))))
        x = cx0 + t - tan * (h / 2)
        d.line([(x, 0), (x + tan * h, h)], fill=SILVER + (a,), width=2)
    return img


def service_marks(slice_w=48, slice_h=20, n=11, seed=21):
    """11 处手写缩写「地勤」：同一支笔、逐张扫描，所以每处抖动都不一样。"""
    rng = random.Random(seed)
    img = Image.new("RGBA", (slice_w * n, slice_h), (0, 0, 0, 0))
    font_path = Path(r"C:\Windows\Fonts\simkai.ttf")
    font = ImageFont.truetype(str(font_path), 13) if font_path.exists() else None
    for i in range(n):
        cell = Image.new("RGBA", (slice_w, slice_h), (0, 0, 0, 0))
        cd = ImageDraw.Draw(cell)
        if font is not None:
            cd.text((3, 1), "地勤", font=font, fill=(17, 17, 17, 214))
        # 每处的抖动：轻微旋转 + 位移 + 行笔压力的浓淡
        cell = cell.rotate(rng.uniform(-5.5, 5.5), resample=Image.BICUBIC, expand=False)
        dx, dy = rng.randint(-2, 2), rng.randint(-1, 1)
        shifted = Image.new("RGBA", (slice_w, slice_h), (0, 0, 0, 0))
        shifted.alpha_composite(cell, (max(0, dx), max(0, dy)))
        a = shifted.getchannel("A").point(lambda v: min(255, int(v * rng.uniform(0.82, 1.0))))
        shifted.putalpha(a)
        img.paste(shifted, (i * slice_w, 0))
    return img


def foil_edge_tile(w=160, h=160):
    """0.15mm 铝箔的边缘样张：上／左 1px 银色高光、下／右 1px 暗侧，供缩放核对。"""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.line([(0, 0), (w - 1, 0)], fill=SILVER + (255,), width=1)
    d.line([(0, 0), (0, h - 1)], fill=SILVER + (168,), width=1)
    d.line([(0, h - 1), (w - 1, h - 1)], fill=(138, 51, 32, 200), width=1)
    d.line([(w - 1, 0), (w - 1, h - 1)], fill=(138, 51, 32, 140), width=1)
    return img


if __name__ == "__main__":
    jobs = {
        "bubble-field.png": bubble_field(),
        "foil-grain.png": foil_grain(),
        "foil-sheen.png": sheen_band(),
        "service-marks.png": service_marks(),
        "foil-edge-sample.png": foil_edge_tile(),
    }
    for name, im in jobs.items():
        p = OUT / name
        im.save(p, optimize=True)
        print(f"{name}  {im.size[0]}x{im.size[1]}  {p.stat().st_size} bytes")
