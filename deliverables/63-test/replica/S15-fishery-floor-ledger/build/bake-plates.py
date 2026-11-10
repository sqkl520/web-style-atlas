# -*- coding: utf-8 -*-
"""S15 渔场平面簿 —— 照片 -> 「石墨 / 纸色」双色阶图版

规格依据：
  字段 6④「图像处理：所有照片先扫描成灰度，再压到石墨与纸色两个色阶，保留原始铅笔压痕的
           侧向阴影，禁止暖色滤镜与纸张纹理贴图」
  字段 9③「禁止任何纸张纹理贴图与暖色调整层」
  字段 11「扫描图走灰度加双色阶后输出」（原文说 AVIF；本仓的渲染/闸门链只认 JPEG/PNG，
           且 AVIF 在截图链路里没有解码保证，所以按 JPEG 出，双色阶机制一字不改）

两个端点就是字段 3 的两个色：纸色 `#E7EBE9`（硫酸纸透光色）与石墨 `#3A3F45`（主色），
最暗处再压到 `#22282B`（字段 3 的「铅笔重压处」）。三个值都取自 `_CURRENT-VALUES.md`，
不含任何自行发挥的色。

为什么必须烤进位图、不能留给 CSS 的 filter：
  本页的平面图是 SVG 线稿，照片是垫在硫酸纸层下面的「实拍扫描」。如果照片保持彩色、
  靠页面滤镜去灰，① 字段 6④ 说的「压到两个色阶」在 CSS 里做不到（那需要 feComponentTransfer
  或 feColorMatrix 的 SVG 滤镜，属于色彩插值写法，字段 11 明令不引入）；
  ② 一旦某档视口漏了滤镜，页面就会出现彩色照片，等于把规格交给运气。所以在这里做完。

用法：python build/bake-plates.py            # 读 assets/source/，写 assets/photo-*.jpg
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SRC = ASSETS / "source"
BUILD = ROOT / "build"

PAPER = (231, 235, 233)      # #E7EBE9 硫酸纸透光色（唯一纸色）
GRAPHITE = (58, 63, 69)      # #3A3F45 石墨（主色）
PENCIL_DARK = (34, 40, 43)   # #22282B 铅笔重压处
MIN_WIDTH = 900
MAX_WIDTH = 1280


def duotone_lut():
    """256 项 LUT：灰度 0 -> 铅笔重压 `#22282B`，0.5 -> 石墨 `#3A3F45`，1.0 -> 纸色 `#E7EBE9`。

    两段线性 + 0.92 的 gamma（保住中间调，否则 LMS 照片的暗部会糊成一块石墨）。
    """
    lut = np.zeros((256, 3), np.uint8)
    for i in range(256):
        t = (i / 255.0) ** 0.92
        if t < 0.5:
            k = t / 0.5
            c = [PENCIL_DARK[j] + (GRAPHITE[j] - PENCIL_DARK[j]) * k for j in range(3)]
        else:
            k = (t - 0.5) / 0.5
            c = [GRAPHITE[j] + (PAPER[j] - GRAPHITE[j]) * k for j in range(3)]
        lut[i] = [int(round(v)) for v in c]
    return lut


def main():
    lut = duotone_lut()
    files = sorted(SRC.glob("fishery-*.jpg")) if SRC.exists() else []
    if not files:
        print("没有找到 assets/source/fishery-*.jpg —— 先跑 assets/fetch-assets.ps1")
        return
    rows = []
    for p in files:
        stem = p.stem
        plate = ("photo-" + stem[len("fishery-"):]) + ".jpg" if stem.startswith("fishery-") else stem + ".jpg"
        im = Image.open(p)
        im.load()
        im = im.convert("RGB")
        src_w, src_h = im.size
        gray = ImageOps.grayscale(im)
        # 0.4% 的两端截断：Lofoten 的天空和渔网高光很容易让 autocontrast 整体压暗
        gray = ImageOps.autocontrast(gray, cutoff=(0.4, 0.4))
        # 铅笔压痕的侧向阴影靠这一点点锐化读得出来（照片本身的侧光才是主因，这里只是补）
        gray = gray.filter(ImageFilter.UnsharpMask(radius=2, percent=58, threshold=3))
        arr = np.asarray(gray, np.uint8)
        out = lut[arr]
        res = Image.fromarray(out, "RGB")
        w, h = res.size
        if w > MAX_WIDTH:
            res = res.resize((MAX_WIDTH, max(1, round(h * MAX_WIDTH / w))), Image.LANCZOS)
        if res.size[0] < MIN_WIDTH:
            print("警告 {} 落盘宽度 {}px < {}px，违反素材下限".format(plate, res.size[0], MIN_WIDTH))
        dest = ASSETS / plate
        res.save(dest, "JPEG", quality=87, optimize=True, progressive=True)

        a = np.asarray(res, np.float32)
        # PIT: round(np.float32) 回来还是 np.float32，json.dumps 会直接 TypeError。
        # 第一版就是在这里崩的——图已经写完、报告没写成，等于「跑了但没留证据」。
        r, g, b = float(a[..., 0].mean()), float(a[..., 1].mean()), float(a[..., 2].mean())
        # 暖色偏移的客观读数：R-G > 0 且 B-G < 0 才是暖。这里两个数都必须不成立。
        warm_rg = float(r - g)
        warm_bg = float(b - g)
        rows.append({
            "plate": plate, "source": "source/" + p.name,
            "source_width": src_w, "source_height": src_h,
            "stored_width": res.size[0], "stored_height": res.size[1],
            "bytes": dest.stat().st_size,
            "gray_before_min": int(arr.min()), "gray_before_max": int(arr.max()),
            "gray_before_mean": round(float(arr.mean()), 2),
            "rgb_mean": [round(r, 2), round(g, 2), round(b, 2)],
            "warm_shift_r_minus_g": round(warm_rg, 3),
            "warm_shift_b_minus_g": round(warm_bg, 3),
            "warm_cast": bool(warm_rg > 0.5 and warm_bg < -0.5),
            "ramp": {"dark": "#22282B", "mid": "#3A3F45", "light": "#E7EBE9"},
            "sharpen": "UnsharpMask(radius=2, percent=58, threshold=3)",
            "autocontrast_cutoff_pct": 0.4,
            "jpeg_quality": 87,
        })
        print("{:<22} <- {:<28} {}x{} -> {}x{}  {:>8} B  warm(R-G {:+.2f} / B-G {:+.2f})".format(
            plate, p.name, src_w, src_h, res.size[0], res.size[1],
            rows[-1]["bytes"], warm_rg, warm_bg))

    report = {
        "prototype": "S15-fishery-floor-ledger",
        "generator": "build/bake-plates.py",
        "mechanism": "grayscale -> autocontrast(0.4%) -> unsharp(2/58/3) -> 3-stop graphite/paper duotone LUT",
        "min_width": MIN_WIDTH, "max_width": MAX_WIDTH,
        "plates": rows,
    }
    (BUILD / "bake-report.json").write_text(
        json.dumps(report, indent=1, ensure_ascii=False), encoding="utf-8")
    warm = [r["plate"] for r in rows if r["warm_cast"]]
    narrow = [r["plate"] for r in rows if r["stored_width"] < MIN_WIDTH]
    print("--- {} 张图版 -> {} ---".format(len(rows), BUILD / "bake-report.json"))
    print("暖色偏移超标：{}；窄于 900px：{}".format(warm or "无", narrow or "无"))


if __name__ == "__main__":
    main()
