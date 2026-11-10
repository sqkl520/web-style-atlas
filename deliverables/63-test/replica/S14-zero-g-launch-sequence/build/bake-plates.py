# -*- coding: utf-8 -*-
# S14 零重力发射序 —— 照片双色调烘焙
#
# 规格字段 6 第四条：所有照片走双色调加 12° 高光带处理，铝箔反光处叠加 8% 不透明度的
# 128×128 颗粒，禁止柔光与镜头光晕。字段 11：照片双色调化后输出。
# 所以这里没有 CSS 滤镜、没有渐变——每张图都在位图阶段处理完，页面只 <img> 引用。
# 产出统一 1000px 宽（契约 8.7：位图必须有真实分辨率），竖幅最高 1440px，横幅超过 1.5 宽高比才裁。
#
# 注意：本文件必须用 write/edit 工具或 Python 改动，不能用 PowerShell 5.1 的
# Get-Content/Set-Content 过一遍——它按 GBK 解码 UTF-8，中文会被打乱并吃掉换行。
import math, random
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

# 双色调端点：暗部走舱内暗蓝黑，高光走铝箔涂布橙；银色档走未涂布铝面；压痕档走暗侧棕。
RAMPS = {
    "orange": ((18, 24, 29), (228, 87, 46)),
    "silver": ((18, 24, 29), (216, 210, 196)),
    "shadow": ((18, 24, 29), (138, 51, 32)),
}


def duotone(im, ramp):
    shadow, light = RAMPS[ramp]
    g = ImageOps.autocontrast(im.convert("L"), cutoff=(1, 1))
    lut = []
    for ch in range(3):
        for v in range(256):
            t = (v / 255.0) ** 1.06          # 轻微压暗中间调，避免灰雾
            lut.append(int(round(shadow[ch] + (light[ch] - shadow[ch]) * t)))
    return g.convert("RGB").point(lut)


def highlight_band(im, angle=12.0, alpha=52):
    """12° 斜向高光带：核心窄、两侧硬收边，不发光（无光晕、无径向模糊）。"""
    w, h = im.size
    band = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(band)
    rad = math.radians(angle)
    cx = w * 0.46
    tan = math.tan(rad)
    rng = random.Random(9)
    for y in range(h):
        x = cx - tan * (h / 2) + tan * y
        a = int(round(alpha * rng.uniform(0.72, 1.0)))
        d.line([(x, y), (x + max(4.0, w * 0.014), y)], fill=a, width=1)
    return band.filter(ImageFilter.GaussianBlur(0.6))   # 0.6px 只是硬边抗锯齿


def grain(size, seed=5):
    """128×128 颗粒**按原尺寸平铺**，再压到 8% 不透明度。

    PIT：初版是 tile.resize(size, Image.NEAREST)，把 128×128 的随机噪声硬拉成整幅尺寸，
    于是每个噪声像素变成 ~8×11px 的方块——1000px 成品上肉眼就是一片 8px 色块，
    看着像 JPEG 压缩伪影，而不是胶片颗粒（在 plate-13 的天空和 plate-08 的纸面上最明显）。
    规格要的是「128×128 颗粒」，所以这里平铺，颗粒始终是 1:1 的像素。
    """
    tile = Image.new("L", (128, 128), 0)
    px = tile.load()
    rng = random.Random(seed)
    for y in range(128):
        for x in range(128):
            px[x, y] = rng.randint(0, 255)
    w, h = size
    out = Image.new("L", (w, h), 0)
    for y in range(0, h, 128):
        for x in range(0, w, 128):
            out.paste(tile, (x, y))
    return out.point(lambda v: int(v * 0.08))            # 8% 不透明度


def bake(src, dest, ramp, target_w=1000, max_h=1440, seed=5):
    """产出固定 1000px 宽的真实位图（契约 8.7：位图必须有真实分辨率，别把 300×200 拉满 1440）。
    早先版本缩到 max_side=880，竖幅会被压到 610px 宽——低于本轮「≥900px 宽」的素材下限，
    所以改成按宽度定标：横竖幅一律 1000px 宽，只给极高的竖幅留 1440px 高度上限。"""
    im = Image.open(src)
    im = ImageOps.exif_transpose(im).convert("RGB")
    w, h = im.size
    if w / h > 1.5:                                     # 极坐标场地里长条会把标贴挤开
        new_w = int(h * 1.5)
        im = im.crop(((w - new_w) // 2, 0, (w + new_w) // 2, h))
    duo = duotone(im, ramp)
    band = highlight_band(duo)
    duo = Image.composite(Image.new("RGB", duo.size, (216, 210, 196)), duo,
                          band.point(lambda v: int(v * 0.62)))
    duo = ImageChops.add(duo, grain(duo.size, seed).convert("RGB"))
    w, h = duo.size
    scale = target_w / float(w)
    if scale > 1.5:                                     # 源图过小时只放到 1.5 倍，不硬拉
        scale = 1.5
    if h * scale > max_h:
        scale = max_h / float(h)
    duo = duo.resize((max(1, int(round(w * scale))), max(1, int(round(h * scale)))), Image.LANCZOS)
    duo.save(dest, "JPEG", quality=80, optimize=True, progressive=True)
    return duo.size


PLAN = [
    ("cabin-01-apollo-interior.jpg", "plate-01-lm-flight-controls.jpg", "orange"),
    ("cabin-02-cabin-stowage.jpg", "plate-02-skylab-interior.jpg", "silver"),
    ("cabin-07-mission-control.jpg", "plate-03-mission-control.jpg", "shadow"),
    ("cabin-10-panel-gauges.jpg", "plate-04-airliner-instruments.jpg", "orange"),
    ("cabin-05-cockpit-1960s.jpg", "plate-05-chipmunk-cockpit.jpg", "silver"),
    ("cabin-11-spacecraft-hatch.jpg", "plate-06-dragon-interior.jpg", "orange"),
    ("cabin-06-watch-dial.jpg", "plate-07-speedmaster-dial.jpg", "silver"),
    # 第二批抓进来的 7 张（fetch-assets.ps1 v3）：每张原始照片都要有自己那一片双色调图版，
    # 否则页面若直接用 cabin-*.jpg，就绕过了规格字段 6 要求的双色调 + 12 度高光带。
    ("cabin-03-flight-checklist.jpg", "plate-08-construction-log.jpg", "shadow"),
    ("cabin-04-telemetry-panel.jpg", "plate-09-telemetry-panel.jpg", "orange"),
    ("cabin-08-switch-panel.jpg", "plate-10-switch-panel.jpg", "silver"),
    ("cabin-09-test-console.jpg", "plate-11-test-stand-night.jpg", "orange"),
    ("cabin-12-pilot-watch.jpg", "plate-12-watch-macro.jpg", "silver"),
    ("pad-01-saturn-v-launch.jpg", "plate-13-saturn-launch.jpg", "orange"),
    ("pad-02-umbilical-tower.jpg", "plate-14-umbilical-tower.jpg", "silver"),
]

if __name__ == "__main__":
    for i, (src, dest, ramp) in enumerate(PLAN):
        s = ASSETS / src
        if not s.exists():
            print("MISSING " + src)
            continue
        size = bake(s, ASSETS / dest, ramp, seed=5 + i * 3)
        print(f"{dest}  {size[0]}x{size[1]}  {(ASSETS / dest).stat().st_size} B  ramp={ramp}")
