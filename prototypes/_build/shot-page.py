#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
shot-page.py — 截图切片 + 基础像素统计（只依赖 Pillow，无其它第三方库）

它只做三件事，全部围绕"证据"：
  1. 把无头 Chrome 的原始截图按目标视口**裁剪**成真实视口大小（去掉 Chrome 窗口多画的那 16/95 px）；
  2. 把整页长图**按视口高切片**成"第 N 屏"；
  3. 对每一屏算平均亮度、R/G/B 均值、出现最多的 3 个颜色及占比，并识别"整屏空白"这种静默失败。

输入 JSON 一律用 utf-8-sig 读：本机 PowerShell 5.1 的 Out-File/Set-Content -Encoding utf8 会写 BOM，
Node 的 JSON.parse 和 python 的 json.load(encoding='utf-8') 都会被那个 BOM 噎住。输出的 JSON 一律无 BOM。

用法示例：
  python shot-page.py --image raw.png --out .shot --prefix S14-1440 \
      --viewport 1440x900 --page-height 3712 --crop 1440x3712 \
      --full-name S14-1440-full.png --stats S14-1440-stats.json
  python shot-page.py --image rawwide.png --out .shot --prefix S14-1440-fold \
      --viewport 1440x900 --crop 1440x900 --fold-name S14-1440-fold.png --no-slice
  python shot-page.py --image full.png --out .shot --prefix X --viewport 1440x900 --stats-only
"""

import argparse
import json
import math
import os
import sys

try:
    from PIL import Image, ImageStat
except Exception as exc:  # 明确的原文报错，不吞
    sys.stderr.write("[shot-page] 无法导入 Pillow：%r\n" % (exc,))
    sys.stderr.write("[shot-page] python=%s\n" % sys.executable)
    raise

# Windows 上 Python 的 stdout 默认按本地代码页编码，中文经管道（Node/spawn）读出来是乱码。
# 强制 UTF-8，谁读都不会花。
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


# ----------------------------------------------------------------------------- 工具

def read_json_bom_tolerant(path):
    """读 JSON，容忍 BOM（PowerShell 写的 json 带 BOM，这是踩过的坑）。"""
    with open(path, "r", encoding="utf-8-sig") as fh:
        return json.load(fh)


def write_json_no_bom(path, obj):
    """写 JSON，绝不带 BOM（否则 Node 的 JSON.parse 会失败）。"""
    d = os.path.dirname(os.path.abspath(path))
    if d:
        os.makedirs(d, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=2, sort_keys=False)
        fh.write("\n")
    return path


def parse_wh(text, what):
    if text is None:
        return None
    t = str(text).strip().lower().replace("*", "x").replace(",", "x")
    for sep in ("x", "X"):
        if sep in t:
            a, _, b = t.partition(sep)
            try:
                return (int(float(a)), int(float(b)))
            except ValueError:
                pass
    raise SystemExit("[shot-page] --%s 需要 WxH 形式，收到 %r" % (what, text))


def hexof(rgb):
    return "#%02x%02x%02x" % (rgb[0], rgb[1], rgb[2])


# ----------------------------------------------------------------------------- 统计

def luminance_stats(rgb):
    """全图精确亮度统计（靠 PIL 的 C 级直方图，不做抽样）。"""
    hist = rgb.convert("L").histogram()
    total = sum(hist) or 1
    mean = sum(i * c for i, c in enumerate(hist)) / float(total)
    var = sum(((i - mean) ** 2) * c for i, c in enumerate(hist)) / float(total)
    near_white = sum(hist[248:]) / float(total)      # >=248 视为"近白"
    near_black = sum(hist[:6]) / float(total)
    return {
        "luminanceMean": round(mean, 3),
        "luminanceStdev": round(math.sqrt(var), 3),
        "nearWhiteShare": round(near_white, 6),
        "nearBlackShare": round(near_black, 6),
    }


def color_stats(rgb, max_samples=250000, min_step=1):
    """出现最多的 3 个颜色及占比。

    做法：先用 NEAREST 抽样（不会插值出原图没有的颜色），再精确计数。
    NEAREST 抽样对"主色占比"是无偏的；直接在全图上 getcolors 会吃掉几百 MB。
    """
    w, h = rgb.size
    px = max(1, w * h)
    step = max(min_step, int(math.ceil(math.sqrt(px / float(max_samples)))))
    sw, sh = max(1, w // step), max(1, h // step)
    small = rgb.resize((sw, sh), Image.Resampling.NEAREST)
    cols = small.getcolors(maxcolors=sw * sh) or []
    total = float(sw * sh) or 1.0
    cols.sort(key=lambda t: t[0], reverse=True)
    top = [{"rgb": [c[1][0], c[1][1], c[1][2]], "hex": hexof(c[1]),
            "count": c[0], "share": round(c[0] / total, 6)} for c in cols[:3]]
    return top, {"sampleStep": step, "sampledPixels": sw * sh, "uniqueSampled": len(cols)}


def stat_image(rgb, max_samples=250000, min_step=1):
    st = ImageStat.Stat(rgb)
    out = {
        "width": rgb.size[0],
        "height": rgb.size[1],
        "meanRgb": [round(v, 2) for v in st.mean[:3]],
        "rgbStdev": [round(v, 2) for v in st.stddev[:3]],
    }
    out.update(luminance_stats(rgb))
    top, meta = color_stats(rgb, max_samples=max_samples, min_step=min_step)
    out["top3"] = top
    out["dominant"] = top[0] if top else None
    out["sampling"] = meta
    # "整屏空白" = 亮度几乎无变化且几乎全白/全黑 —— 无头截图的典型静默失败
    out["blank"] = bool(out["luminanceStdev"] < 1.0 and
                        (out["nearWhiteShare"] > 0.995 or out["nearBlackShare"] > 0.995))
    out["uniform"] = bool(out["luminanceStdev"] < 1.0)
    return out


def file_bytes(path):
    try:
        return os.path.getsize(path)
    except OSError:
        return None


# ----------------------------------------------------------------------------- 主流程

def main(argv=None):
    ap = argparse.ArgumentParser(description="截图裁剪/切片 + 像素统计（Pillow）")
    ap.add_argument("--image", required=True, help="原始截图（Chrome 产出的窗口大小 PNG）")
    ap.add_argument("--out", default=".", help="输出目录")
    ap.add_argument("--prefix", default="shot", help="输出文件名前缀")
    ap.add_argument("--viewport", required=False, default=None, help="目标视口 WxH，例如 1440x900")
    ap.add_argument("--crop", default=None, help="裁剪框 WxH（从左上角起）；默认不裁")
    ap.add_argument("--page-height", type=int, default=None, help="整页高（像素）；优先级最高")
    ap.add_argument("--measure", default=None, help="含 pageHeight 的 JSON（utf-8-sig 读，容忍 BOM）")
    ap.add_argument("--trim-tail", action="store_true", help="无 page-height 时，用尾部同色裁剪估页高")
    ap.add_argument("--no-slice", action="store_true", help="只裁剪，不切片（用于首屏图）")
    ap.add_argument("--slice-only", action="store_true", help="只切片，不另存整页图")
    ap.add_argument("--stats-only", action="store_true", help="只统计，不产出任何图")
    ap.add_argument("--fold-name", default=None, help="裁剪后首屏图的文件名（默认 <prefix>.png）")
    ap.add_argument("--full-name", default=None, help="裁剪后整页图的文件名")
    ap.add_argument("--slice-pattern", default="%s-screen-%02d.%s", help="切片命名模板")
    ap.add_argument("--format", default="png", choices=["png", "jpg"], help="输出图片格式（默认 png）")
    ap.add_argument("--quality", type=int, default=92, help="jpg 质量（--format jpg 时）")
    ap.add_argument("--extra", action="append", default=[], help="额外只统计的图，形如 路径:标签")
    ap.add_argument("--max-samples", type=int, default=250000, help="颜色抽样上限像素数")
    ap.add_argument("--min-step", type=int, default=1, help="颜色抽样最小步长")
    ap.add_argument("--stats", default=None, help="统计 JSON 输出路径")
    ap.add_argument("--label", default=None, help="写进统计 JSON 的标签")
    args = ap.parse_args(argv)

    warnings = []
    if not os.path.exists(args.image):
        # 原文报错，不吞
        raise SystemExit("[shot-page] 找不到输入图：%s" % args.image)

    viewport = parse_wh(args.viewport, "viewport") or None
    crop = parse_wh(args.crop, "crop") or None

    src = Image.open(args.image)
    src.load()
    rgb = src.convert("RGB")
    src_size = rgb.size

    measure = None
    if args.measure:
        try:
            measure = read_json_bom_tolerant(args.measure)     # <- utf-8-sig
        except Exception as exc:
            raise SystemExit("[shot-page] 读 --measure 失败 %s：%r" % (args.measure, exc))

    # 页高来源优先级：--page-height > --measure.pageHeight > 图像高
    page_h = args.page_height
    page_src = "arg" if page_h else None
    if page_h is None and measure:
        for key in ("pageHeight", "page_height", "h", "height"):
            if isinstance(measure.get(key), (int, float)):
                page_h = int(measure[key])
                page_src = "measure:" + key
                break
    if page_h is None:
        page_h = src_size[1]
        page_src = "image"

    # 裁剪框
    cw = crop[0] if crop else src_size[0]
    ch = crop[1] if crop else min(page_h, src_size[1])
    cw = min(cw, src_size[0])
    ch = min(ch, src_size[1])
    if crop and (cw, ch) != (crop[0], crop[1]):
        warnings.append("crop 被图像尺寸夹紧：请求 %dx%d，实际 %dx%d（原图 %dx%d）"
                        % (crop[0], crop[1], cw, ch, src_size[0], src_size[1]))
    if page_h > src_size[1]:
        warnings.append("pageHeight(%d) 大于原图高(%d)，已按原图高处理" % (page_h, src_size[1]))

    page_h = min(page_h, src_size[1])

    if args.trim_tail and page_src == "image":
        # 从底部往上找第一行"与上一行不同"的位置：尾部同色区视为窗口填充
        small = rgb.reduce(4) if min(rgb.size) > 200 else rgb
        w, h = small.size
        last = small.getpixel((0, h - 1))
        cut = h - 1
        while cut > 0:
            row = [small.getpixel((x, cut)) for x in (0, w // 2, w - 1)]
            if any(abs(p[0] - last[0]) + abs(p[1] - last[1]) + abs(p[2] - last[2]) > 12 for p in row):
                break
            cut -= 1
        cut = min(h - 1, cut + 2) * 4
        if 0 < cut < page_h - 8:
            warnings.append("trim-tail：尾部 %d 行同色，页高由 %d 调整为 %d" % (page_h - cut, page_h, cut))
            page_h = cut
            page_src = "trim-tail"
        ch = min(ch, page_h)

    result = {
        "script": "shot-page.py",
        "label": args.label,
        "input": {"file": os.path.abspath(args.image), "width": src_size[0], "height": src_size[1],
                  "bytes": file_bytes(args.image), "mode": src.mode},
        "viewport": {"width": viewport[0], "height": viewport[1]} if viewport else None,
        "crop": {"x": 0, "y": 0, "width": cw, "height": ch},
        "pageHeight": page_h,
        "pageHeightSource": page_src,
        "measure": measure,
        "outputs": {},
        "slices": [],
        "screens": 0,
        "extras": [],
        "warnings": warnings,
    }

    os.makedirs(args.out, exist_ok=True)
    ext = "png" if args.format == "png" else "jpg"
    save_kw = {"optimize": False} if ext == "png" else {"quality": args.quality}

    def save(img, name):
        p = os.path.join(args.out, name)
        img.save(p, **save_kw)
        return {"file": name, "path": os.path.abspath(p), "width": img.size[0], "height": img.size[1],
                "bytes": file_bytes(p)}

    full = rgb.crop((0, 0, cw, ch))
    full_meta = None

    if not args.stats_only:
        if args.no_slice:
            name = args.fold_name or args.full_name
            if name:
                full_meta = save(full, name)
                # 用 --fold-name 调用时这是首屏；用 --full-name 调用时它仍是整页，
                # 别把键名写死成 fold（否则调用方读 outputs.full 会拿到 undefined）。
                result["outputs"]["fold" if args.fold_name else "full"] = full_meta
        else:
            name = args.full_name or (args.prefix + "-full." + ext)
            full_meta = save(full, name)
            result["outputs"]["full"] = full_meta

        if not args.no_slice:
            if not viewport:
                raise SystemExit("[shot-page] 需要 --viewport WxH 才能切片")
            vh = viewport[1]
            screens = int(math.ceil(ch / float(vh))) if ch > 0 else 0
            result["screens"] = screens
            if screens * vh - ch > 0:
                warnings.append("最后一屏只有 %d 像素高（%d - %d*%d）" % (ch - (screens - 1) * vh, ch, screens - 1, vh))
            for i in range(screens):
                y0, y1 = i * vh, min((i + 1) * vh, ch)
                piece = full.crop((0, y0, cw, y1))
                name = args.slice_pattern % (args.prefix, i + 1, ext)
                meta = save(piece, name)
                meta["y0"], meta["y1"] = y0, y1
                meta.update(stat_image(piece, args.max_samples, args.min_step))
                meta["index"] = i + 1
                meta["size"] = [meta["width"], meta["height"]]
                result["slices"].append(meta)
                if meta["blank"]:
                    warnings.append("第 %d 屏疑似整屏空白（亮度 σ=%.2f，近白 %.4f）——无头截图静默失败的典型形态"
                                    % (i + 1, meta["luminanceStdev"], meta["nearWhiteShare"]))

    # 整页/裁剪图的整体统计
    total = stat_image(full, args.max_samples, args.min_step)
    total["file"] = (full_meta or {}).get("file")
    total["bytes"] = (full_meta or {}).get("bytes")
    result["total"] = total

    for item in args.extra:
        path, _, label = item.partition(":")
        if not os.path.exists(path):
            warnings.append("--extra 找不到文件：%s" % path)
            continue
        im = Image.open(path)
        im.load()
        st = stat_image(im.convert("RGB"), args.max_samples, args.min_step)
        st["label"] = label or os.path.basename(path)
        st["file"] = os.path.abspath(path)
        st["bytes"] = file_bytes(path)
        result["extras"].append(st)
        if st["blank"]:
            warnings.append("--extra %s 疑似整屏空白" % st["label"])

    result["warnings"] = warnings
    stats_path = args.stats or os.path.join(args.out, args.prefix + "-stats.json")
    write_json_no_bom(stats_path, result)

    # 人看的摘要（Node 也会读 JSON，这里只为了单独跑时也能看懂）
    print("[shot-page] %s -> %dx%d 裁剪 -> 页高 %d (%s) 屏数 %d"
          % (os.path.basename(args.image), cw, ch, page_h, page_src, result["screens"]))
    for s in result["slices"]:
        print("  screen-%02d  %dx%d  %8d B  亮度 %6.2f (σ %5.2f)  RGB %s  主色 %s %.1f%%%s"
              % (s["index"], s["width"], s["height"], s["bytes"] or 0, s["luminanceMean"],
                 s["luminanceStdev"], s["meanRgb"], s["dominant"]["hex"] if s["dominant"] else "-",
                 100.0 * (s["dominant"]["share"] if s["dominant"] else 0), "  [BLANK?]" if s["blank"] else ""))
    if full_meta:
        print("  full/%s  %dx%d  %8d B  亮度 %6.2f  主色 %s %.1f%%"
              % ("fold" if args.no_slice else "full", full_meta["width"], full_meta["height"],
                 full_meta["bytes"] or 0, total["luminanceMean"],
                 total["dominant"]["hex"] if total["dominant"] else "-",
                 100.0 * (total["dominant"]["share"] if total["dominant"] else 0)))
    for w in warnings:
        print("  ! " + w)
    print("[shot-page] stats -> %s" % os.path.abspath(stats_path))
    return 0


if __name__ == "__main__":
    sys.exit(main())
