# 方案 08 琥珀叠印灯箱：构建期资产生成
# 生成 4 个真实资产：套准样张（双色叠印）、污染层（落灰）、指纹层、十字套准光标。
import random
from PIL import Image, ImageDraw, ImageChops

ROOM = (18, 12, 8)
AMBER = (196, 106, 31)
IVORY = (232, 220, 200)
WALL = (107, 74, 34)
DEEP = (58, 39, 18)

random.seed(8)


def bottle(draw, shape_ox, shape_oy, fill=None, outline=None, width=1, scale=1.0):
    """一只香氛瓶的轮廓：底足、瓶身、肩、颈、口。"""
    def P(pts):
        return [((x + shape_ox) * scale, (y + shape_oy) * scale) for (x, y) in pts]
    body = [(120, 200), (380, 200), (368, 380), (132, 380)]
    shoulder = [(120, 200), (380, 200), (330, 140), (170, 140)]
    neck = [(205, 80), (295, 80), (295, 140), (205, 140)]
    cap = [(192, 44), (308, 44), (308, 80), (192, 80)]
    foot = [(132, 380), (368, 380), (356, 398), (144, 398)]
    for pts in (foot, body, shoulder, neck, cap):
        draw.polygon(P(pts), fill=fill, outline=outline)
        if outline and width > 1:
            draw.line(P(pts) + [P(pts)[0]], fill=outline, width=width, joint="curve")


# ---------- 1. 套准样张：双色叠印，第二色偏 1.2mm（按 3.75 倍放大画成 4.5px） ----------
W, H = 1200, 760
paper = Image.new("RGB", (W, H), IVORY)
d = ImageDraw.Draw(paper)
# 纸张本身的纤维与裁切标记
for _ in range(2600):
    x, y = random.randrange(W), random.randrange(H)
    v = random.randrange(-7, 4)
    px = paper.getpixel((x, y))
    paper.putpixel((x, y), tuple(max(0, min(255, c + v)) for c in px))
d = ImageDraw.Draw(paper)
for (cx, cy) in ((58, 58), (W - 58, 58), (58, H - 58), (W - 58, H - 58)):
    d.line([(cx - 16, cy), (cx + 16, cy)], fill=DEEP, width=2)
    d.line([(cx, cy - 16), (cx, cy + 16)], fill=DEEP, width=2)
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], outline=DEEP, width=2)
# 色标条：琥珀 / 暗琥珀 / 象牙 / 深棕
bar_y = H - 74
for i, col in enumerate((AMBER, WALL, IVORY, DEEP)):
    d.rectangle([506 + i * 46, bar_y, 506 + i * 46 + 40, bar_y + 40], fill=col, outline=DEEP, width=2)

def specimen(second_offset, path):
    """双色套印样张。second_offset 为第二色（深棕轮廓版）的偏移：0 为套准，4.5px 为 1.2mm 未套准。"""
    paper = Image.new("RGB", (W, H), IVORY)
    d = ImageDraw.Draw(paper)
    for _ in range(2600):
        x, y = random.randrange(W), random.randrange(H)
        v = random.randrange(-7, 4)
        px = paper.getpixel((x, y))
        paper.putpixel((x, y), tuple(max(0, min(255, c + v)) for c in px))
    d = ImageDraw.Draw(paper)
    for (cx, cy) in ((58, 58), (W - 58, 58), (58, H - 58), (W - 58, H - 58)):
        d.line([(cx - 16, cy), (cx + 16, cy)], fill=DEEP, width=2)
        d.line([(cx, cy - 16), (cx, cy + 16)], fill=DEEP, width=2)
        d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], outline=DEEP, width=2)
    bar_y = H - 74
    for i, col in enumerate((AMBER, WALL, IVORY, DEEP)):
        d.rectangle([506 + i * 46, bar_y, 506 + i * 46 + 40, bar_y + 40], fill=col, outline=DEEP, width=2)

    layer_a = Image.new("RGB", (W, H), (255, 255, 255))
    da = ImageDraw.Draw(layer_a)
    bottle(da, 300, 180, fill=AMBER)
    da.rectangle([455, 470, 745, 590], fill=AMBER)
    layer_b = Image.new("RGB", (W, H), (255, 255, 255))
    db = ImageDraw.Draw(layer_b)
    bottle(db, 300 + second_offset, 180 + second_offset, fill=(255, 255, 255), outline=DEEP, width=5)
    db.rectangle([455 + second_offset, 470 + second_offset, 745 + second_offset, 590 + second_offset], outline=DEEP, width=5)

    out = ImageChops.multiply(ImageChops.multiply(paper, layer_a), layer_b)
    dm = ImageDraw.Draw(out)
    for (cx, cy) in ((W // 2, 120), (W // 2, H - 120)):
        dm.line([(cx - 22, cy), (cx + 22, cy)], fill=DEEP, width=2)
        dm.line([(cx, cy - 22), (cx, cy + 22)], fill=DEEP, width=2)
    out.save(path, optimize=True)


# 一张套准、一张未套准：两张都是可见的正片，不存在藏起来的位图
specimen(0.0, "assets/overprint.png")
specimen(4.5, "assets/overprint-offset.png")

# ---------- 2. 污染层：落灰，不透明度 2%，右下更密 ----------
gw, gh = 440, 300
grime = Image.new("RGBA", (gw, gh), (0, 0, 0, 0))
gd = ImageDraw.Draw(grime)
for _ in range(5200):
    x, y = random.randrange(gw), random.randrange(gh)
    w = (x / gw) * (y / gh)
    if random.random() > (0.18 + 0.82 * w):
        continue
    r = 1 if random.random() < 0.86 else 2
    gd.ellipse([x, y, x + r, y + r], fill=(58, 39, 18, 5))
grime.save("assets/grime.png", optimize=True)

# ---------- 3. 指纹层：三枚 9mm 指纹 + 设计者右手拇指实扫件，不透明度 3% ----------
pw, ph = 488, 300
prints = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
pd = ImageDraw.Draw(prints)


def fingerprint(cx, cy, size, alpha, ridge_w, squash=1.28):
    """同心脊线画出的指纹：椭圆弧，间距不均，边缘更清晰。"""
    step = size / 9.0
    r = step
    while r < size / 2.0:
        box = [cx - r, cy - r * squash, cx + r, cy + r * squash]
        start = random.randrange(180, 260)
        end = start + random.randrange(210, 300)
        pd.arc(box, start=start, end=end, fill=(58, 39, 18, alpha), width=ridge_w)
        r += step * random.uniform(0.82, 1.24)


# 三枚指纹落在第三块板右下（9mm 按 3.75 倍放大画成 34px）
fingerprint(360, 214, 34, 8, 1)
fingerprint(404, 246, 34, 8, 1)
fingerprint(330, 258, 34, 8, 1)
# 签名怪癖：设计者本人右手拇指，多一圈残缺的脊线，其他五块板干净
fingerprint(420, 196, 34, 8, 1, squash=1.42)
prints.save("assets/print.png", optimize=True)

# ---------- 4. 十字套准光标：1px 线宽，中心留 2px 空 ----------
with open("assets/reg-cursor.svg", "w", encoding="utf-8") as f:
    f.write(
        '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17">'
        '<g stroke="#E8DCC8" stroke-width="1" shape-rendering="crispEdges">'
        '<path d="M8 0V6M8 11V17M0 8H6M11 8H17"/></g></svg>'
    )

# ---------- 4. 倒角与折射高光微距：2mm 倒角、2px 边缘暗边、12° 楔形高光 ----------
dw, dh = 1200, 420
detail = Image.new("RGB", (dw, dh), ROOM)
dd = ImageDraw.Draw(detail)
# 琥珀板面，右下留出侧壁
plate_box = (60, 56, 1140, 300)
dd.rectangle(plate_box, fill=AMBER)
# 2mm 倒角：板面四角切掉一块等腰三角，露出的斜切面带被照亮的棱
for (cx, cy, sx, sy) in ((60, 56, 1, 1), (1140, 56, -1, 1), (60, 300, 1, -1), (1140, 300, -1, -1)):
    dd.polygon([(cx, cy), (cx + 26 * sx, cy), (cx, cy + 26 * sy)], fill=(214, 150, 78))
# 12° 楔形高光：顶边与左边各一条 2px 亮线，沿边收细
for i in range(230):
    x = 60 + i * 4.7
    dd.line([(x, 56), (x + 24, 56)], fill=(255, 244, 214), width=2)
for i in range(46):
    y = 56 + i * 5.2
    dd.line([(60, y), (60, y + 22)], fill=(255, 244, 214), width=2)
# 侧壁：6px 到 10px 的厚度，右缘更深一档
dd.rectangle((60, 300, 1140, 310), fill=WALL)
dd.rectangle((60, 310, 1140, 316), fill=DEEP)
dd.line([(60, 316), (1140, 316)], fill=(255, 244, 214), width=1)
detail.save("assets/detail.png", optimize=True)

# ---------- 5. 污染层微距：落灰密度与三枚指纹 + 签名拇指，10 倍 ----------
mw, mh = 1200, 420
macro = Image.new("RGB", (mw, mh), AMBER)
md = ImageDraw.Draw(macro)
for _ in range(26000):
    x, y = random.randrange(mw), random.randrange(mh)
    w = (x / mw) * (y / mh)
    if random.random() > (0.12 + 0.88 * w):
        continue
    md.point((x, y), fill=(150, 78, 20))
macro_p = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
mpd = ImageDraw.Draw(macro_p)


def fp(cx, cy, size, alpha):
    step = size / 11.0
    r = step
    while r < size / 2.0:
        box = [cx - r, cy - r * 1.3, cx + r, cy + r * 1.3]
        start = random.randrange(180, 260)
        mpd.arc(box, start=start, end=start + random.randrange(200, 300), fill=(58, 39, 18, alpha), width=3)
        r += step * random.uniform(0.82, 1.24)


# 三枚 9mm 指纹按 10 倍画成 340px，签名拇指压在最右，脊线更残
fp(300, 200, 340, 46)
fp(640, 250, 340, 46)
fp(950, 170, 340, 46)
macro = Image.alpha_composite(macro.convert("RGBA"), macro_p).convert("RGB")
macro.save("assets/grime-macro.png", optimize=True)

print("overprint.png", Image.open("assets/overprint.png").size)
print("overprint-offset.png", Image.open("assets/overprint-offset.png").size)
print("grime.png", Image.open("assets/grime.png").size)
print("print.png", Image.open("assets/print.png").size)
print("detail.png", Image.open("assets/detail.png").size)
print("grime-macro.png", Image.open("assets/grime-macro.png").size)
