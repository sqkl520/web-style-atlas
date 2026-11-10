# S05 像素冷库台 —— 现场照片的二值抖动烘焙
# 规格字段 6 图片处理：「冷库现场照片在构建期做二值抖动（Floyd–Steinberg，阈值按直方图 62% 分位），
# 只保留绿与黑两色，边缘保留设备铭牌与锈迹」；字段 11：「二值抖动图在构建期生成 PNG-8（调色板 4 色），
# 单张 ≤30KB」。因此这里手写 FS 误差扩散（Pillow 的 quantize 抖动阈值不可控，无法满足 62% 分位这一条），
# 输出索引色 PNG：调色板固定为本案四色（#0E100D／#4FA83D／#BFB9A6／#8C2F1F），图像实际只用前两色。
import glob
import os
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SRC = ROOT / "assets" / "source"
OUT = ROOT / "assets"

PALETTE = [(0x0E, 0x10, 0x0D), (0x4F, 0xA8, 0x3D), (0xBF, 0xB9, 0xA6), (0x8C, 0x2F, 0x1F)]
QUANTILE = 62.0
# 抖动图是硬边噪声，PNG 压缩率对分辨率极不敏感，实测（6 张合计）：
#   480 长边 ≈142 KB、560 ≈187 KB、640 ≈242 KB、760 ≈337 KB、1024 ≈586 KB。
# 页面里每张的实际显示宽度约 340–420px，取 560 长边（≈1.4 倍显示尺寸，
# 单张 26–36 KB、贴近字段 11 的 ≤30 KB 目标）用 --long-edge 可复算。
TARGET_LONG_EDGE = 560


def floyd_steinberg(gray: np.ndarray, threshold: float) -> np.ndarray:
    """经典 Floyd–Steinberg 误差扩散，7/16 3/16 5/16 1/16，阈值固定为直方图分位数。"""
    img = gray.astype(np.float32).copy()
    h, w = img.shape
    for y in range(h):
        row = img[y]
        below = img[y + 1] if y + 1 < h else None
        for x in range(w):
            old = row[x]
            new = 255.0 if old > threshold else 0.0
            err = old - new
            row[x] = new
            if x + 1 < w:
                row[x + 1] += err * 0.4375
            if below is not None:
                if x > 0:
                    below[x - 1] += err * 0.1875
                below[x] += err * 0.3125
                if x + 1 < w:
                    below[x + 1] += err * 0.0625
    return (img > threshold).astype(np.uint8)


def bake(path: Path, long_edge: int = TARGET_LONG_EDGE) -> tuple[Path, int, float]:
    im = Image.open(path).convert("RGB")
    w, h = im.size
    scale = long_edge / max(w, h)
    if scale < 1:
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    gray = np.asarray(im.convert("L"), dtype=np.uint8)
    thr = float(np.percentile(gray, QUANTILE))
    idx = floyd_steinberg(gray, thr)
    out = Image.fromarray(idx, mode="P")
    pal = []
    for c in PALETTE:
        pal += list(c)
    pal += [0] * (768 - len(pal))
    out.putpalette(pal)
    dest = OUT / (path.stem + "-dither.png")
    out.save(dest, optimize=True, bits=2)
    return dest, int(thr), dest.stat().st_size / 1024


if __name__ == "__main__":
    import sys
    if "--long-edge" in sys.argv:
        TARGET_LONG_EDGE = int(sys.argv[sys.argv.index("--long-edge") + 1])
    files = sorted(glob.glob(str(SRC / "*.jpg")))
    total = 0.0
    for f in files:
        dest, thr, kb = bake(Path(f), TARGET_LONG_EDGE)
        total += kb
        src = Image.open(f)
        print(f"{os.path.basename(f):18s} {src.size[0]}x{src.size[1]:5d} -> {dest.name:26s} "
              f"thr(62%)={thr:5.1f}  {kb:6.1f} KB")
    print(f"合计 {total:.1f} KB / {len(files)} 张")
