# 方案 13 图像处理：按 6 号字段第 4 条把翻拍件落成「只保留纸色与墨色两个色阶」。
# 灰度 -> 轻度 S 曲线（翻拍的硬拓感）-> 在纸色 #F4E3BE 与印刷墨 #241F17 之间做双色调映射 -> 缩放。
# 不叠加颗粒（该层改用纸纤维噪声），输出 JPEG；投产时同一支脚本换成 AVIF。
from PIL import Image, ImageOps
import numpy as np, os

INK = (36, 31, 23)        # #241F17
PAPER = (244, 227, 190)   # #F4E3BE
SRC = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(SRC, 'assets')

PLAN = [
    ('broadsheet-relating-to-the-virgin-of-guadalupe.jpg', 'plate-letterpress-tan.jpg', 1500, 82),
    ('stamp-seal.jpg',                     'plate-seal-carved.jpg',      1000, 82),
    ('seal-impression.jpg',                'plate-seal-impression.jpg',  1000, 82),
    ('marriage-of-minakshi-and-sundareshvara-equestrian-warrior.jpg',
                                           'plate-laid-paper.jpg',        860, 82),
    ('broadsheet-showing-a-blindfolded-man-being-executed.jpg',
                                           'plate-type-metal.jpg',        860, 82),
]

# 灰度级的 S 曲线：把中间调往两端推，翻拍件才不像一张现代照片
S = np.array([min(255, max(0, round(255 * ((x / 255.0) ** 0.88)))) for x in range(256)], dtype=np.uint8)


def duotone(im):
    g = ImageOps.grayscale(im)
    g = ImageOps.autocontrast(g, cutoff=(1, 2))
    a = S[np.asarray(g, dtype=np.uint8)].astype(np.float32) / 255.0
    ch = [INK[i] + (PAPER[i] - INK[i]) * a for i in range(3)]
    return Image.fromarray(np.stack(ch, axis=-1).astype(np.uint8), 'RGB')


for src_name, out_name, w, q in PLAN:
    p = os.path.join(ASSETS, src_name)
    im = Image.open(p)
    im = duotone(im)
    if im.width > w:
        h = round(im.height * w / im.width)
        im = im.resize((w, h), Image.LANCZOS)
    out = os.path.join(ASSETS, out_name)
    im.save(out, 'JPEG', quality=q, optimize=True, progressive=True)
    print(f'{out_name}  {im.width}x{im.height}  {os.path.getsize(out)/1024:.0f} KB')
    os.remove(p)

print('remaining in assets:', sorted(os.listdir(ASSETS)))
