# 生成刻度尺底纹：90×10 的 0/30/60/90 刻度条（透明底 + 中性灰刻度），
# 供 .scale 用 background-size:100% 100% 拉伸，替代每行一条内联 SVG。
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
OUT = HERE / "texture-scale.png"
GREY = (110, 112, 118)

im = Image.new("RGBA", (90, 10), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.line([(0, 9), (89, 9)], fill=GREY + (255,), width=1)
for x, top in ((0, 3), (30, 5), (60, 5), (89, 3)):
    d.line([(x, top), (x, 9)], fill=GREY + (255,), width=1)
im.save(OUT, optimize=True)
print(f"{OUT.name} {im.size} {OUT.stat().st_size} B")
