# S05 像素冷库台 —— 材质版（程序化生成，Pillow）
# 规格字段 1／2／7 要求的介质是"一整块 1980 年代的冷库铁皮"＋"扫描线栅格加像素抖动"，
# 这些纹理没有素材可抓，按同一条工艺链直接生成真实位图：
#   plate-brushed.png  拉丝铁皮：横向各向异性噪声 + 少量划痕（挂 .panel::before）
#   plate-scanline.png 扫描线栅格：8px 单元里 1px 暗行（挂 .panel--dark::after）
#   plate-grain.png    像素抖动颗粒：两级黑白噪声，低透明度（与拉丝叠在同一伪元素上）
#   plate-wear.png     蚀刻磨损：无光泽漆面被擦出的斑块（挂 .nameplate::before）
# 全部只作为伪元素的 background-image 使用 —— 契约 §9.2：纹理不得挂 body／文本祖先，
# 否则 bgBehind() 会跳过整条对比度检查。
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "assets"
OUT.mkdir(parents=True, exist_ok=True)

PLATE = (14, 16, 13)        # #0E100D 铁皮底
HILITE = (42, 46, 40)       # #2A2E28 凹槽上高光
PANEL = (191, 185, 166)     # #BFB9A6 面板灰米
GREEN = (79, 168, 61)       # #4FA83D 漆面绿
BRICK = (140, 47, 31)       # #8C2F1F 告警砖红


def brushed(size=256, seed=5, colors=6):
    """横向拉丝：每一行沿 x 方向做长程相关的明度扰动，再叠少量竖向划痕。
    输出调色板 PNG（6 色）——纹理是低透明度的底子，不需要连续色阶，
    色阶一收，首屏传输就压得下来。"""
    rng = random.Random(seed)
    w = h = size
    rows = [rng.uniform(-1.0, 1.0) for _ in range(h)]
    img = Image.new("RGB", (w, h), PLATE)
    px = img.load()
    # 每行一条一维随机游走，横向平滑 → 拉丝方向严格水平
    for y in range(h):
        v = 0.0
        for x in range(w):
            v = v * 0.86 + rng.uniform(-1.0, 1.0) * 0.32
            amt = v * 5.2 + rows[y] * 3.0
            px[x, y] = (max(0, min(255, int(PLATE[0] + amt))),
                        max(0, min(255, int(PLATE[1] + amt * 1.05))),
                        max(0, min(255, int(PLATE[2] + amt * 0.9))))
    d = ImageDraw.Draw(img)
    # 划痕：少数几条 1px 横向亮线，长度不一
    for _ in range(26):
        x0 = rng.randrange(0, w - 20)
        y0 = rng.randrange(0, h)
        ln = rng.randrange(14, w // 2)
        tone = rng.choice([HILITE, (66, 70, 62), (28, 31, 27)])
        d.line([(x0, y0), (min(w, x0 + ln), y0 + rng.choice([0, 0, 1]))], fill=tone)
    img = img.filter(ImageFilter.GaussianBlur(0.35))
    img.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).save(
        OUT / "plate-brushed.png", optimize=True)
    return img.size


def scanline(pitch=8, dark=118, light=26, seed=11):
    """扫描线栅格：8px 一个单元，单元第 0 行压暗、第 1 行微亮，其余透明。
    做成严格可平铺的 RGBA 小图，不产生任何 CSS 边框／分隔线。"""
    img = Image.new("RGBA", (pitch, pitch), (0, 0, 0, 0))
    px = img.load()
    for x in range(pitch):
        px[x, 0] = (5, 6, 5, dark)
        px[x, 1] = (255, 255, 255, light)
        px[x, 5] = (5, 6, 5, 22)
    img.save(OUT / "plate-scanline.png", optimize=True)
    return img.size


def grain(size=192, seed=23, lo=8, hi=30):
    """像素抖动颗粒：两级（黑／白）噪声，模拟点阵抖动留下的硬边颗粒。
    直接建成 L+A 双通道图：色调只有两级、透明度只有三级，PNG 里几乎全在跑 RLE。"""
    rng = random.Random(seed)
    img = Image.new("LA", (size, size), (0, 0))
    px = img.load()
    for y in range(size):
        for x in range(size):
            r = rng.random()
            if r < 0.09:
                px[x, y] = (5, rng.choice((lo, (lo + hi) // 2, hi)))
            elif r < 0.15:
                px[x, y] = (200, rng.choice((lo, (lo + hi) // 2, hi - 6)))
    img.save(OUT / "plate-grain.png", optimize=True)
    return img.size


def wear(size=320, seed=37, levels=5):
    """蚀刻磨损：低频斑块（值噪声放大后取阈值）在面板灰米上擦出深浅不匀。
    色相只有铁皮暗底一种，所以存成 L+A：明度恒定、透明度分 5 档。"""
    rng = random.Random(seed)
    small = 40
    base = Image.new("L", (small, small))
    bp = base.load()
    for y in range(small):
        for x in range(small):
            bp[x, y] = rng.randrange(0, 256)
    base = base.resize((size, size), Image.BICUBIC).filter(ImageFilter.GaussianBlur(2.4))
    mask = base.point(lambda v: max(0, min(255, int((v - 118) * 1.9))))
    step = max(1, 191 // (levels - 1))
    mask = mask.point(lambda a: 0 if a < 48 else min(190, ((a - 48) // step + 1) * step))
    tone = (PLATE[0] * 299 + PLATE[1] * 587 + PLATE[2] * 114) // 1000
    img = Image.merge("LA", (Image.new("L", (size, size), tone), mask))
    img.save(OUT / "plate-wear.png", optimize=True)
    return img.size


if __name__ == "__main__":
    print("plate-brushed.png ", brushed())
    print("plate-scanline.png", scanline())
    print("plate-grain.png   ", grain())
    print("plate-wear.png    ", wear())
    for p in sorted(OUT.glob("plate-*.png")):
        print(f"  {p.name:22s} {p.stat().st_size/1024:7.1f} KB")
