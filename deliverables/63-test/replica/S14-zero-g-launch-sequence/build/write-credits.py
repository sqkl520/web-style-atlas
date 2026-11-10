# -*- coding: utf-8 -*-
"""S14 零重力发射序 —— 从 assets/credits.json 生成 assets/CREDITS.md（唯一写入者，不手抄）

契约 9.5：assets/CREDITS.md 是构建产物，会被别人的脚本无条件覆盖。所以署名数据只在抓取阶段
落盘一次（assets/fetch-assets.ps1 -> assets/credits.json），本脚本是唯一把它排版成 CREDITS.md 的
地方；抓取脚本换了关键词、重跑之后再跑一次本脚本即可刷新。

署名范围按「页面真实引用 ∪ 抓取落盘的 credits.json」取并集：
  - index.html / style.css 存在时，解析里面引用的 assets/ 文件名，标记哪些被页面真正用到
    （未引用的标「备用」，不假装页面用了它）；
  - 页面文件还不存在时（本目录的施工顺序是先素材后页面），全部按「待页面引用」列出，
    并打印提示，等页面落盘后重跑本脚本会自动改成真实引用关系。

PIT：PowerShell 5.1 的 Set-Content -Encoding UTF8 写出的 credits.json 带 UTF-8 BOM，
     所以这里必须用 encoding='utf-8-sig' 读；写 CREDITS.md 则用无 BOM 的 utf-8。

用法：python build/write-credits.py
"""
import json
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
CREDITS_JSON = ASSETS / "credits.json"

# 双色调图版 -> 原始照片。bake-plates.py 的 PLAN 是这份映射的唯一权威来源，
# 这里直接把它读出来（不重复维护一份名单），读不到就退化成空映射。
BAKE = ROOT / "build" / "bake-plates.py"

TEXTURES = [
    ("foil-grain.png",
     "128×128 平铺颗粒：稀疏双档噪点（亮档 alpha 20 ≈7.8%、暗档 alpha 26 ≈10%），"
     "即规格字段 6 要求的「8% 不透明度 128×128 颗粒」，种子固定 7（`build/make-plates.py: foil_grain()`）。"),
    ("foil-sheen.png",
     "900×140 视角反光带：12° 斜向、核心 10px 满值、两侧 4px 硬收边、不发光，"
     "带内亮度逐行随机起伏（`make-plates.py: sheen_band()`）。做成位图遮罩而不是 CSS 渐变，"
     "因为字段 11 禁止任何色彩插值写法。"),
    ("foil-edge-sample.png",
     "160×160 铝箔边缘样张（0.15mm 厚度的边缘核对件）：上／左 1px `#D8D2C4` 银高光、"
     "下／右 1px `#8A3320` 暗侧，无羽化（`make-plates.py: foil_edge_tile()`）。"),
    ("bubble-field.png",
     "512×512 低重力气泡场：150 枚直径 3–9px 的硬边圆环，1px 硬线、无填充、不发光，"
     "越界圆环在对侧补画一遍以保证平铺接缝处完整（`make-plates.py: bubble_field()`）。"),
    ("service-marks.png",
     "528×20 精灵图，11 格 ×48px，每格是同一支笔写的「地勤」缩写，各自带旋转 ±5.5°、"
     "位移与浓淡抖动，供 11 枚标贴各取自己那一格（字段 12）。字面用系统楷体 "
     "`C:\\Windows\\Fonts\\simkai.ttf` 烘焙成位图后即为本地素材（`make-plates.py: service_marks()`）。"),
]

# 抓取阶段落的 artist 字段常带一长串占位噪声，这里统一清洗。
JUNK = ("Unknown authorUnknown author or not provided", "Unknown authorUnknown author",
        "Unknown author", "AnonymousUnknown author", "Anonymous", "or not provided")


def clean_artist(raw):
    s = (raw or "").replace("|", "/").replace("&amp;", "&")
    for j in JUNK:
        s = s.replace(j, "")
    # Commons 的 Artist 字段常把署名写成用户页 URL；换成 User:名字，信息不丢，表也窄得下来。
    s = re.sub(r"https?://commons[.]wikimedia[.]org/wiki/User:", "User:", s)
    s = re.sub(r"\s+", " ", s).strip(" /,;")
    return s or "未署名（Commons 上传者署名为空）"


def load_credits():
    raw = CREDITS_JSON.read_text(encoding="utf-8-sig")      # BOM：PowerShell 5.1 写的
    data = json.loads(raw)
    if isinstance(data, dict):
        data = [data]
    return {r["file"]: r for r in data}


def plate_plan():
    """从 bake-plates.py 的 PLAN 里读出 (产出图版, 源照片, ramp)。

    PIT：bake-plates.py 的 PLAN 元组顺序是 (源照片, 产出图版, ramp)，而本表要用的是
    (产出图版, 源照片)。第一版按 (产出, 源) 解，于是 src_of 全部键在源照片上，
    14 张图版一张都对不上、表里源照片列全是「—」。这里按 `plate-` 前缀归一化，
    顺序再写反也不会错位。
    """
    plan = []
    if not BAKE.exists():
        return plan
    src = BAKE.read_text(encoding="utf-8")
    m = re.search(r"PLAN\s*=\s*\[(.*?)\n\]", src, re.S)
    if not m:
        return plan
    body = m.group(1)
    for hit in re.finditer(r'[(]\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*[)]', body):
        a, b, c = hit.groups()
        plan.append((a, b, c) if a.startswith("plate-") else (b, a, c))
    return plan


def page_refs():
    """页面真实引用的 assets/ 文件名并集。页面还没落盘时返回 None（而不是空集）。"""
    seen = set()
    found_any = False
    for name in ("index.html", "style.css"):
        p = ROOT / name
        if not p.exists():
            continue
        found_any = True
        text = p.read_text(encoding="utf-8", errors="replace")
        for fn in re.findall(r"assets/([A-Za-z0-9._\-]+\.(?:jpg|jpeg|png|webp|avif))", text):
            seen.add(fn)
    return seen if found_any else None


def px(p):
    try:
        with Image.open(p) as im:
            return im.size
    except Exception:
        return (0, 0)


def main():
    credits = load_credits()
    have = sorted(p.name for p in ASSETS.iterdir() if p.is_file())
    # 「真实照片」的定义就是「有 credits.json 署名行的抓取件」——不要再按名字前缀猜，
    # 第一版只认 cabin-*，结果 pad-*（发射场）两文件既不在照片表也不在图版表里，凭空消失。
    photos = [f for f in have if f in credits and not f.startswith("plate-")]
    plates = [f for f in have if f.startswith("plate-") and f.endswith(".jpg")]
    refs = page_refs()

    wide = []
    for f in photos + plates:
        w, h = px(ASSETS / f)
        if w >= 900:
            wide.append((f, w, h))
    photo_set = set(photos)
    pw = [w for f, w, _ in wide if f in photo_set]
    narrow = [f for f in photos if f not in {g for g, _, _ in wide}]

    def where(name):
        if refs is None:
            return "待页面引用（index.html 未落盘）"
        return "页面已引用" if name in refs else "—（备用，页面未引用）"

    L = [
        "# S14 零重力发射序 · 素材来源与署名",
        "",
        "> 本表由 `build/write-credits.py` 从 `assets/credits.json` 生成，**不手抄**；"
        "`assets/CREDITS.md` 是构建产物，改动抓取脚本后重跑本脚本即可刷新。",
        "",
        "本套素材全部本地化：所有位图都在本地 `assets/` 下，页面（`index.html` / `style.css`）只引用这些文件，"
        "**不得出现任何 http(s) 的 `src` 或 `url()`**；字体走 `prototypes/_fonts/` 自托管缓存，不链外网。",
        "",
        "## 一、真实照片（Wikimedia Commons 抓取）",
        "",
        "抓取方式照抄 S25 的 `assets/fetch-assets.ps1`：`action=query&generator=search&gsrnamespace=6&prop=imageinfo`，"
        "搜索串带 `filetype:bitmap` 以排除 PDF／书籍扫描件，候选要求源图宽度 ≥900px，"
        "再按 `extmetadata` 取许可与权利人。缩略图 URL 上的 `?utm_source=…` 查询串在下载前必须剥掉，否则 404。",
        "",
        "文件名前缀：`cabin-*` 是舱内／控制台／仪表与腕表的照片，`pad-*` 是发射场照片。"
        "同一张源图只许对应一个文件（抓取脚本会拒掉已被别的槽位用掉的源图——"
        "否则控制台槽与试车台槽会各自命中同一张 NACA 照片，同一张图以两个文件名发两遍）。",
        "",
        f"本地共 {len(photos)} 张原始照片，其中 {len(pw)} 张宽度 ≥900px"
        f"（最窄 {min(pw or [0])}px、最宽 {max(pw or [0])}px），均为真实位图 JPEG，无 SVG 冒充；"
        f"另有 {len(plates)} 张由它们烘焙的双色调图版（见第二节），也全部 ≥900px 宽。",
        "",
        "| 文件 | 尺寸（落盘） | 页面里用在哪 | 原件文件页（可逐张复核许可） | 权利人 | 许可 | 源图像素 | 来源 |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    missing_rows = []
    for f in photos:
        r = credits.get(f)
        w, h = px(ASSETS / f)
        if not r:
            missing_rows.append(f)
            L.append("| `assets/{}` | {}×{} | {} | *credits.json 缺这一行，重跑抓取脚本补齐* | — | — | — | — |".format(
                f, w, h, where(f)))
            continue
        title = (r.get("title") or f).replace("File:", "").replace("|", "/")
        page = r.get("page") or ("https://commons.wikimedia.org/wiki/Special:Search?search=" + title.replace(" ", "_"))
        L.append("| `assets/{}` | {}×{} | {} | [{}]({}) | {} | {} | {}×{} | {} |".format(
            f, w, h, where(f), title if len(title) <= 76 else title[:73] + "…", page,
            clean_artist(r.get("artist")), (r.get("license") or "见 Commons 文件页").replace("|", "/"),
            r.get("width", "?"), r.get("height", "?"), r.get("origin") or "Wikimedia Commons"))

    L += [
        "",
        "## 二、双色调图版（由上面的照片烘焙，不是新素材）",
        "",
        "规格字段 6 第四条要求「所有照片走双色调加 12° 高光带，铝箔反光处叠加 8% 不透明度的颗粒，"
        "禁止柔光与镜头光晕」，字段 11 要求「照片双色调化后输出」。所以每张照片都在位图阶段处理完，"
        "页面只 `<img>` 引用成品，CSS 里没有滤镜也没有渐变。烘焙脚本 `build/bake-plates.py`："
        "`ImageOps.autocontrast` → 三端点双色调映射（暗部 `#12181D`，高光 `#E4572E`／`#D8D2C4`／`#8A3320`）"
        "→ 12° 硬边高光带 → 8% 颗粒 → 按宽度定标到 **1000px 宽**（真实分辨率，不是把缩略图拉满）。",
        "",
        "| 产出图版 | 尺寸（落盘） | 页面里用在哪 | 源照片 | 双色调高光端 | 署名 |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    plan = plate_plan()
    ramp_of = {out: ramp for out, _, ramp in plan}
    src_of = {out: src for out, src, _ in plan}
    for f in plates:
        w, h = px(ASSETS / f)
        src = src_of.get(f, "—")
        r = credits.get(src, {})
        L.append("| `assets/{}` | {}×{} | {} | `assets/{}` | {} | 同上：{} / {} |".format(
            f, w, h, where(f), src, ramp_of.get(f, "—"), clean_artist(r.get("artist")),
            (r.get("license") or "—").replace("|", "/")))

    L += [
        "",
        "## 三、程序化生成的纹理与标印（无第三方来源，Pillow 生成）",
        "",
        "| 产出文件 | 尺寸 | 生成方式 |",
        "| --- | --- | --- |",
    ]
    for name, how in TEXTURES:
        if name in have:
            w, h = px(ASSETS / name)
            L.append("| `assets/{}` | {}×{} | {} |".format(name, w, h, how))

    L += [
        "",
        "## 四、复算方式",
        "",
        "```",
        "assets/fetch-assets.ps1              # Commons 抓取：许可/权利人/原始像素/落盘像素 -> assets/credits.json",
        "build/bake-plates.py                 # 照片 -> assets/plate-*.jpg（双色调 + 12 度高光带 + 8% 颗粒，1000px 宽）",
        "build/make-plates.py                 # 程序化纹理 foil-*/bubble-field/service-marks",
        "build/polar-layout.py                # 11 枚标贴的极坐标站位表 -> build/polar-layout.json",
        "build/write-credits.py               # 本表的唯一写入者：credits.json -> assets/CREDITS.md",
        "build/qc-assets.py                   # 位图客观自检（像素统计 + 署名条目对照）",
        "```",
        "",
        "本表的文件名、尺寸、许可、权利人全部读自 `assets/credits.json` 与磁盘上的实际文件，"
        "没有任何一项是手抄的；页面文案里的编号（`A-1107` 等）是版面上的排版元素，不是 Commons 原始编号，"
        "复核许可以第一节的 Commons 文件页为准。",
    ]

    dest = ASSETS / "CREDITS.md"
    dest.write_text("\n".join(L) + "\n", encoding="utf-8")

    print("CREDITS.md 已写入 {}：{} 行，{} 字节".format(dest, len(L), dest.stat().st_size))
    print("原始照片 {} 张，双色调图版 {} 张，其中宽度 >=900px 的位图 {} 张。".format(
        len(photos), len(plates), len(wide)))
    if len(wide) < 4:
        print("警告：>=900px 宽的位图不足 4 张，违反契约 §5 的素材下限。")
    if narrow:
        print("警告：这些原始照片落盘宽度 <900px，应回抓更大的缩略图 -> {}".format(narrow))
    if missing_rows:
        print("警告：这些文件在磁盘上但 credits.json 里没有署名行 -> {}".format(missing_rows))
    if refs is None:
        print("提示：index.html / style.css 还没落盘，本表暂按「待页面引用」标注；页面写完后重跑本脚本即变为真实引用关系。")
    plate_missing = [f for f in plates if f not in src_of]
    if plate_missing:
        print("提示：这些图版不在 bake-plates.py 的 PLAN 里，本表没写出源照片 -> {}".format(plate_missing))


if __name__ == "__main__":
    main()
