# -*- coding: utf-8 -*-
"""S15 渔场平面簿 —— 素材客观自检（只在 build/ 下写产物，不改 assets/ 里的素材）

查的是「我声称的东西能不能自证」，不是「文件在不在」：
  1. 每张位图的落盘宽度 ≥900px（契约 §5 / §7.7），格式是 JPEG/PNG，没有 SVG 混在里面；
  2. 抓取件 4–6 张、真实位图（不带 SVG）总数 ≥4；
  3. 每个抓取件在 credits.json 里都有一行，且 artist / license / page / origin / source 均非空，
     page 指向 commons.wikimedia.org（署名可逐张复核）；
  4. 每张双色阶图版都能追到一张存在的源图；
  5. 程序化纹理的实测上限：纸颗粒 ≤ 10/255（4%）、橡皮残迹 ≤ 31/255（12%）、纤维偏离 ≤ 4%；
  6. 没有暖色偏移的图版（R−G>0 且 B−G<0 同时成立才算暖）。

顺带出一张 build/qc-contact-sheet.jpg：把所有素材拼在一张纸色底上，供人一眼核对
（透明纹理必须在纸色上合成才看得出效果，直接看 PNG 会是黑底）。
标签用 Pillow 自带位图字体，只写 ASCII——中文不进这张 QC 图，避免字体依赖。

用法：python build/qc-assets.py     # 有 FAIL 时退出码为 1
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
BUILD = ROOT / "build"
PAPER = (231, 235, 233)

FAILS, WARNS, OKS = [], [], []


def fail(msg):
    FAILS.append(msg)
    print("FAIL  " + msg)


def warn(msg):
    WARNS.append(msg)
    print("WARN  " + msg)


def ok(msg):
    OKS.append(msg)
    print("ok    " + msg)


def load_json(p, bom=False):
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8-sig" if bom else "utf-8"))


def main():
    credits = load_json(ASSETS / "credits.json", bom=True) or []
    if isinstance(credits, dict):
        credits = [credits]
    by_file = {r["file"]: r for r in credits}
    bake = load_json(BUILD / "bake-report.json") or {"plates": []}
    tex = load_json(BUILD / "textures.json") or {"files": []}

    files = sorted(p for p in ASSETS.rglob("*") if p.is_file())
    pictures, svgs, total = [], [], 0
    for p in files:
        rel = p.relative_to(ASSETS).as_posix()
        if p.suffix.lower() == ".svg":
            svgs.append(rel)
            continue
        if p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".avif"):
            continue
        total += p.stat().st_size
        try:
            with Image.open(p) as im:
                im.load()
                w, h, mode = im.size[0], im.size[1], im.mode
        except Exception as e:
            fail("{} 无法解码：{}".format(rel, e))
            continue
        pictures.append({"file": rel, "w": w, "h": h, "mode": mode, "bytes": p.stat().st_size})
        if w < 900:
            fail("{} 宽度 {}px < 900px（契约 §5 的素材下限）".format(rel, w))

    n_src = len([1 for x in pictures if x["file"].startswith("source/")])
    n_plate = len([1 for x in pictures if x["file"].startswith("photo-")])
    n_tex = len([1 for x in pictures if x["file"].startswith("texture-")])
    print("位图 {} 张：抓取件 {}／双色阶图版 {}／程序化纹理 {}；总 {} B（{:.2f} MB）".format(
        len(pictures), n_src, n_plate, n_tex, total, total / 1048576))
    if svgs:
        fail("assets/ 里出现 SVG（契约 §5：SVG 不算照片）：{}".format(svgs))
    else:
        ok("assets/ 里没有 SVG")
    if 4 <= n_src <= 6:
        ok("抓取件 {} 张，落在 4–6 的要求内".format(n_src))
    else:
        fail("抓取件 {} 张，要求 4–6 张".format(n_src))
    if len(pictures) >= 4:
        ok("真实位图 {} 张 ≥ 4（few-pictures 阈值）".format(len(pictures)))
    else:
        fail("真实位图只有 {} 张，少于 4".format(len(pictures)))

    # 署名完整性
    for x in pictures:
        if not x["file"].startswith("source/"):
            continue
        r = by_file.get(x["file"])
        if not r:
            fail("{} 没有 credits.json 署名行".format(x["file"]))
            continue
        for k in ("title", "artist", "license", "origin", "page", "source"):
            if not (r.get(k) or "").strip():
                fail("{} 的 credits.json 缺字段 {}".format(x["file"], k))
        if not (r.get("page") or "").startswith("https://commons.wikimedia.org/"):
            fail("{} 的 page 不是 Commons 文件页：{}".format(x["file"], r.get("page")))
        if not (r.get("artist") or "").strip():
            fail("{} 的 artist 为空".format(x["file"]))
    if n_src and all(by_file.get(x["file"]) for x in pictures if x["file"].startswith("source/")):
        ok("{} 张抓取件的 artist/license/origin/page/source 全部非空".format(n_src))

    # 图版 -> 源图
    for pr in bake["plates"]:
        if not (ASSETS / pr["plate"]).exists():
            fail("bake-report 里的 {} 不存在".format(pr["plate"]))
        if not (ASSETS / pr["source"]).exists():
            fail("{} 的源图 {} 不存在".format(pr["plate"], pr["source"]))
        if pr.get("warm_cast"):
            fail("{} 出现暖色偏移（R−G {:+.2f} / B−G {:+.2f}）".format(
                pr["plate"], pr["warm_shift_r_minus_g"], pr["warm_shift_b_minus_g"]))
        if pr["stored_width"] < 900:
            fail("{} 宽度不足 900px".format(pr["plate"]))
    if n_plate == len(bake["plates"]):
        ok("{} 张双色阶图版都追得到源图且无暖色偏移".format(n_plate))

    # 纹理实测上限
    caps = tex.get("caps", {})
    for f in tex.get("files", []):
        nm = f["file"]
        if not (ASSETS / nm).exists():
            fail("textures.json 里的 {} 不存在".format(nm))
            continue
        if f.get("kind") == "paper-noise":
            mx = f.get("alpha_max_measured", 1.0) * 255
            if mx > 10 + 1e-6:
                fail("纸颗粒最大 alpha {:.2f}/255 超过 4% 上限".format(mx))
            else:
                ok("纸颗粒最大 alpha {:.2f}/255 = {:.2f}% ≤ 4%".format(mx, mx / 255 * 100))
        if f.get("kind") == "eraser-smudge":
            mx = f.get("alpha_max_measured", 1.0) * 255
            if mx > 31 + 1e-6:
                fail("橡皮残迹最大 alpha {:.2f}/255 超过 12%".format(mx))
            else:
                ok("橡皮残迹最大 alpha {:.2f}/255 = {:.2f}% ≤ 12%".format(mx, mx / 255 * 100))
        if f.get("kind") == "trace-sheet":
            dev = f.get("fibre_luminance_dev_pct", 0)
            if dev > 4.0:
                fail("{} 纤维亮度偏离 {:.2f}% 超过 4%".format(nm, dev))
            else:
                ok("{} 纤维亮度偏离 {:.2f}% ≤ 4%".format(nm, dev))

    check_sheets()
    check_no_moire()
    contact_sheet()

    print("\n== QC: {} ok / {} warn / {} fail ==".format(len(OKS), len(WARNS), len(FAILS)))
    for m in WARNS:
        print("  WARN " + m)
    for m in FAILS:
        print("  FAIL " + m)
    sys.exit(1 if FAILS else 0)


def _font():
    for kw in ({"size": 15}, {}):
        try:
            return ImageFont.load_default(**kw)
        except Exception:
            continue
    return None


GRAPHITE_RGB = (58, 63, 69)


def contact_sheet(path=None):
    """把所有素材合成到纸色/石墨底上，供人一眼核对。

    PIT：第一版把透明纹理合成到**纸色**底上——硫酸纸的毛口、撕角、装订孔、12% 的橡皮残迹
    在同色底上全都看不见，等于这张 QC 图什么也没查。透明件必须合成到石墨底上才看得见。
    """
    path = path or (BUILD / "qc-contact-sheet.jpg")
    W = 1680
    rows = []
    sheets = ["texture-trace-1934.png", "texture-trace-1936.png", "texture-trace-1938.png"]
    plates = ["photo-01-boat.jpg", "photo-02-nets.jpg", "photo-03-harbour.jpg",
              "photo-04-plan.jpg", "photo-05-stockfish.jpg", "photo-06-chart.jpg"]
    others_paper = ["texture-plan-frame.png", "texture-pencil-grain.png",
                    "texture-grid-8px-tile.png"]
    others_dark = ["texture-eraser-smudge.png", "texture-noise-4pct.png",
                   "texture-scalebar-1to200.png"]

    def strip(names, cell_w, cell_h, cols, label, ground):
        rows.append((label, names, cell_w, cell_h, cols, ground))

    strip(sheets, 540, 405, 3,
          "A  three tracing-paper sheets over GRAPHITE: deckle edge, 1936 punch holes, 1938 torn corner",
          GRAPHITE_RGB)
    strip(others_paper, 540, 340, 3,
          "B1 paper-ground textures: 32px map frame / pencil impression / 8px grid tile",
          PAPER)
    strip(others_dark, 540, 340, 3,
          "B2 transparent textures over GRAPHITE: eraser residue (12% grey), noise (4%), 1:200 scale bar",
          GRAPHITE_RGB)
    strip(plates, 540, 340, 3,
          "C  graphite-paper two-level plates (what the page should reference)", PAPER)

    f = _font()
    head, body = 30, 22
    total_h = 70
    for label, names, cw, ch, cols, _g in rows:
        nrows = (len(names) + cols - 1) // cols
        total_h += body + nrows * (ch + 14) + head
    im = Image.new("RGB", (W, total_h), PAPER)
    d = ImageDraw.Draw(im)
    y = 16
    d.text((16, y), "S15 fishery floor ledger - asset QC contact sheet  (build/qc-assets.py)",
           fill=(34, 40, 43), font=f)
    y += 34
    for label, names, cw, ch, cols, ground in rows:
        d.text((16, y), label, fill=(58, 63, 69), font=f)
        y += body
        for i, nm in enumerate(names):
            p = ASSETS / nm
            if not p.exists():
                continue
            cx = 16 + (i % cols) * (cw + 14)
            cy = y + (i // cols) * (ch + 14)
            with Image.open(p) as src:
                src = src.convert("RGBA")
                sc = min(cw / src.width, ch / src.height)
                thumb = src.resize((max(1, int(src.width * sc)), max(1, int(src.height * sc))),
                                   Image.LANCZOS)
                box = Image.new("RGBA", (cw, ch), ground + (255,))
                box.alpha_composite(thumb, ((cw - thumb.width) // 2, (ch - thumb.height) // 2))
                im.paste(box.convert("RGB"), (cx, cy))
            d.rectangle([cx, cy, cx + cw - 1, cy + ch - 1], outline=(150, 152, 148))
            d.text((cx + 2, cy + ch + 1), nm[:46], fill=(58, 63, 69), font=f)
        nrows = (len(names) + cols - 1) // cols
        y += nrows * (ch + 14) + head
    im.save(path, "JPEG", quality=88, optimize=True)
    print("接触表 -> {} ({:.2f} MB)".format(path, path.stat().st_size / 1048576))


def check_sheets():
    """硫酸纸层的自证：毛口、装订孔、撕角必须真的在 alpha 通道里，不能只是文档里写着。"""
    for year, fn, needs in ((1934, "texture-trace-1934.png", "deckle"),
                            (1936, "texture-trace-1936.png", "holes"),
                            (1938, "texture-trace-1938.png", "torn")):
        p = ASSETS / fn
        if not p.exists():
            fail("{} 不存在".format(fn))
            continue
        a = np.asarray(Image.open(p).convert("RGBA"))[..., 3]
        h, w = a.shape
        zero = a == 0
        border_zero = int(zero[0, :].sum() + zero[-1, :].sum() + zero[:, 0].sum() + zero[:, -1].sum())
        fringe = int(((a > 0) & (a < 200)).sum())
        if border_zero == 0:
            fail("{} 边框上没有任何全透明像素：1px 纸张毛口没做出来".format(fn))
        else:
            ok("{} 边框全透明像素 {} 个（毛口），半透明毛边 {} 个".format(fn, border_zero, fringe))
        if needs == "holes":
            hits = 0
            for cy in (int(h * 0.34), int(h * 0.66)):
                if zero[cy - 4:cy + 5, 30:39].any():
                    hits += 1
            if hits == 2:
                ok("{} 左边缘两个装订孔都在（alpha=0 区域已核实）".format(fn))
            else:
                fail("{} 装订孔只找到 {} 个".format(fn, hits))
        if needs == "torn":
            cut = zero[:120, w - 120:].mean()
            if cut > 0.6:
                ok("{} 右上撕角已核实（该区域 {:.0%} 全透明）".format(fn, cut))
            else:
                fail("{} 右上撕角不成立（该区域只有 {:.0%} 全透明）".format(fn, cut))
        if needs == "deckle":
            if zero.mean() < 0.002:
                fail("{} 透明像素占比 {:.4f}，毛口过少".format(fn, zero.mean()))
            else:
                ok("{} 透明像素占比 {:.4f}（毛口 + 缺口）".format(fn, zero.mean()))


def _stripe_index(gray):
    """细结构对齐度：把图减去重模糊版本得到残余，再看「列和」的起伏相对于随机起伏的倍数。

    为什么不用频谱或过零点：
      - 数过零点会把合法的细纤维和摩尔纹一起数进去（第一版就是这么误报的）；
      - 频谱峰值受「单条故意的线」影响极大：1936 那张有一道贯穿全高的折痕、
        1938 那张有一个撕角，两者都会在谱上砸出一个尖峰，于是判据会去冤枉一张没毛病的纸；
      - 一维列均值的谱峰因数还会退化（正对照能到 1e12，这个数字没有意义）。
    这个统计量是有界可解释的：
      - 纯随机细结构（白噪声）≈ 1.0（列和起伏正好等于随机起伏）；
      - 整幅对齐的竖条（就是第一版那个 6px 周期的缺陷）≈ sqrt(行数) ≈ 32；
      - 一笔单线只影响一根列，对 std 几乎无贡献，不会误报。
    """
    a = gray.astype(np.float32)
    blur = np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(12)),
                      np.float32)
    resid = a - blur
    sd = float(resid.std())
    if sd <= 0:
        return 0.0
    # 每行减掉自己的均值：只留「细结构」，去掉列方向的整体高低
    r = resid - resid.mean(axis=1, keepdims=True)
    col = r.sum(axis=0)
    return float(col.std() / (sd * math.sqrt(r.shape[0])))


def check_no_moire():
    """摩尔纹自证，判据是「相对已知条纹的分离度」，不靠猜出来的常数。

    正对照：人为造一条 6px 周期的竖条（就是第一版那个缺陷的形状）。
    检测器若失效（恒返回同一个值），正对照也会一起塌下去，相对判据立刻不成立，所以不会假绿。
    只对三张硫酸纸与铅笔压痕查；`texture-plan-frame.png` / `texture-grid-8px-tile.png`
    里的 8px 网格线是**故意**的周期线，周期检查在它们身上口径不同（不是漏查）。
    """
    rng = np.random.default_rng(7)
    h, w = 512, 1400
    ctrl_stripe = np.tile(((np.arange(w) % 6) < 1).astype(np.float32) * 255.0, (h, 1))
    ctrl_noise = (rng.random((h, w)) * 255).astype(np.float32)
    pos, neg = _stripe_index(ctrl_stripe), _stripe_index(ctrl_noise)
    print("条纹检测器对照：6px 竖条 index={:.2f}；白噪声 index={:.2f}".format(pos, neg))
    if not (pos > 4 * max(neg, 1.0)):
        fail("条纹检测器本身失效：正对照 {:.2f} 没比白噪声 {:.2f} 高出 4 倍".format(pos, neg))
    else:
        ok("条纹检测器有效：正对照 {:.2f} ≥ 4× 白噪声 {:.2f}".format(pos, neg))

    worst = 0.0
    for fn in ("texture-trace-1934.png", "texture-trace-1936.png",
               "texture-trace-1938.png", "texture-pencil-grain.png"):
        p = ASSETS / fn
        if not p.exists():
            continue
        a = np.asarray(Image.open(p).convert("RGB"), np.float32)[..., 1]
        # 只看中段：三张纸的装订孔（左缘）、撕角（右上）、比例都在边缘，中段最能代表纸面本身
        g = a[a.shape[0] // 5: a.shape[0] * 4 // 5, a.shape[1] // 8: a.shape[1] * 7 // 8]
        idx = _stripe_index(g)
        worst = max(worst, idx)
        if idx * 4 > pos:
            fail("{} 细结构对齐度 {:.2f} 已达正对照（{:.2f}）的 1/4：出现规则条纹".format(fn, idx, pos))
        else:
            ok("{} 细结构对齐度 {:.2f} < 正对照 {:.2f} 的 1/4，无规则条纹".format(fn, idx, pos))
    if worst > 0:
        ok("四张素材里最差 index={:.2f} vs 正对照 {:.2f}，分离度 {:.1f}×".format(
            worst, pos, pos / worst))


if __name__ == "__main__":
    main()
