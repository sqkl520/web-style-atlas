# -*- coding: utf-8 -*-
# S14 零重力发射序 —— 位图客观自检（我没有图像输入通道，所以用像素统计代替肉眼）
import json, warnings
from pathlib import Path
from PIL import Image, ImageStat

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

print("== 双色调照片 ==")
for p in sorted(ASSETS.glob("plate-*.jpg")):
    im = Image.open(p).convert("RGB")
    st = ImageStat.Stat(im)
    px = im.resize((64, 64)).getdata()
    dark = sum(1 for c in px if sum(c) < 150) / len(px)
    warm = sum(1 for c in px if c[0] > c[1] + 8 and c[0] > 60) / len(px)
    lum = st.mean[0] * 0.2126 + st.mean[1] * 0.7152 + st.mean[2] * 0.0722
    print(f"{p.name:<36} {im.size[0]}x{im.size[1]}  mean L {lum:5.1f}  sd {st.stddev[0]:5.1f}  "
          f"暗部占比 {dark:4.0%}  暖色占比 {warm:4.0%}  {p.stat().st_size} B")

print("\n== 材料位图 ==")
for name in ("bubble-field.png", "foil-grain.png", "foil-sheen.png", "service-marks.png",
             "foil-edge-sample.png"):
    p = ASSETS / name
    im = Image.open(p)
    a = im.convert("RGBA").getchannel("A")
    st = ImageStat.Stat(a)
    nz = sum(1 for v in a.getdata() if v > 0) / (im.size[0] * im.size[1])
    print(f"{name:<20} {im.size[0]}x{im.size[1]}  alpha max {max(a.getdata()):3d}  非透明 {nz:5.1%}  "
          f"通道 {len(im.getbands())}  {p.stat().st_size} B")

print("\n== 署名数据 ==")
raw = (ASSETS / "credits.json").read_text(encoding="utf-8-sig")
rec = json.loads(raw)
print(f"credits.json {len(rec)} 条，键：{sorted(rec[0].keys())}")
for r in rec:
    print(f"  {r['file']:<32} {r['license']:<22} {r['artist'][:38]:<38} {r['width']}x{r['height']}")
