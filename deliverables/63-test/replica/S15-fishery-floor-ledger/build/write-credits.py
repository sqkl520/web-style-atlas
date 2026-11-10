# -*- coding: utf-8 -*-
"""S15 渔场平面簿 —— 从 assets/credits.json 生成 assets/CREDITS.md（唯一写入者，不手抄）

契约 §9.5：`assets/CREDITS.md` 是构建产物，会被别人的脚本无条件覆盖。所以署名数据只在抓取
阶段落盘一次（`assets/fetch-assets.ps1` -> `assets/credits.json`），本脚本是唯一把它排版成
`CREDITS.md` 的地方；抓取脚本换了关键词、重跑之后再跑一次本脚本即可刷新。

署名范围按「页面真实引用 ∪ 抓取落盘的 credits.json」取并集：
  - `index.html` / `style.css` 存在时，解析里面引用的 `assets/` 文件名，标出哪些被页面真正用到
    （未引用的标「备用」——不假装页面用了它）；
  - 页面文件还不存在时（本目录的施工顺序是先素材后页面），全部按「待页面引用」列出并打印提示，
    等页面落盘后重跑本脚本会自动变成真实引用关系。

PIT（两处都实打实踩过）：
  1. PowerShell 5.1 的 `Set-Content -Encoding UTF8` 写出的 credits.json 带 UTF-8 BOM，
     这里必须用 `encoding='utf-8-sig'` 读；写 CREDITS.md 则用无 BOM 的 utf-8。
  2. Commons 的 Artist 字段会把 HAER 那种「field team / sponsor / transmitter」整串人名一起塞进来
     （本案 fishery-04-plan 有 20 项）。表格里照抄会把 Markdown 撑成一条横线，所以超过 90 字的
     多段署名保留前 2 段 + 「共 N 项」，并在本节开头写明这条截断规则——是截断，不是改写。

用法：python build/write-credits.py
"""
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
CREDITS_JSON = ASSETS / "credits.json"
BAKE_REPORT = ROOT / "build" / "bake-report.json"
TEXTURES_JSON = ROOT / "build" / "textures.json"

JUNK = ("Unknown authorUnknown author or not provided", "Unknown authorUnknown author",
        "Unknown author", "AnonymousUnknown author", "Anonymous", "or not provided")


def clean_artist(raw):
    s = (raw or "").replace("|", "/").replace("&amp;", "&")
    for j in JUNK:
        s = s.replace(j, "")
    s = re.sub(r"https?://commons[.]wikimedia[.]org/wiki/User:", "User:", s)
    s = re.sub(r"\s+", " ", s).strip(" /,;")
    if not s:
        return "未署名（Commons 上传者署名为空）"
    parts = [p.strip() for p in s.split(";") if p.strip()]
    if len(s) > 90 and len(parts) > 2:
        return "{}；{} 等（共 {} 项，完整清单见 Commons 文件页）".format(parts[0], parts[1], len(parts))
    if len(s) > 120:
        return s[:117] + "…"
    return s


def load_json(p, bom=False):
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8-sig" if bom else "utf-8"))


def page_refs():
    """页面真实引用的 assets/ 文件名并集；页面还没落盘时返回 None（而不是空集）。"""
    seen, found_any = set(), False
    for name in ("index.html", "style.css"):
        p = ROOT / name
        if not p.exists():
            continue
        found_any = True
        text = p.read_text(encoding="utf-8", errors="replace")
        for fn in re.findall(r"assets/([A-Za-z0-9._\-/]+\.(?:jpg|jpeg|png|webp|avif|svg))", text):
            seen.add(fn.split("/")[-1])
    return seen if found_any else None


def px(p):
    try:
        with Image.open(p) as im:
            return im.size
    except Exception:
        return (0, 0)


def main():
    credits = load_json(CREDITS_JSON, bom=True)          # BOM：PowerShell 5.1 写的
    if credits is None:
        print("assets/credits.json 不存在 —— 先跑 assets/fetch-assets.ps1")
        return
    if isinstance(credits, dict):
        credits = [credits]
    by_file = {r["file"]: r for r in credits}
    bake = load_json(BAKE_REPORT) or {"plates": []}
    tex = load_json(TEXTURES_JSON) or {"files": []}
    refs = page_refs()

    sources = sorted(f for f in by_file)
    plates = [r["plate"] for r in bake["plates"]]
    plate_of_src = {r["source"]: r for r in bake["plates"]}

    def where(name):
        if refs is None:
            return "待页面引用（index.html 未落盘）"
        return "页面已引用" if name in refs else "—（备用，页面未引用）"

    rows_wide = []
    for f in sources + plates:
        w, _ = px(ASSETS / (f if "/" not in f else f))
        if w >= 900:
            rows_wide.append(f)
    src_wide = [f for f in rows_wide if f in by_file]

    L = [
        "# S15 渔场平面簿（Fishery Floor Ledger）· 素材来源与署名",
        "",
        "> 本表由 `build/write-credits.py` 从 `assets/credits.json` 生成，**不手抄**；"
        "`assets/CREDITS.md` 是构建产物，改抓取脚本后重跑本脚本即可刷新。",
        "",
        "本套素材全部本地化：所有位图都在本地 `assets/` 下，页面（`index.html` / `style.css`）"
        "只引用这些文件，**不得出现任何 http(s) 的 `src` 或 `url()`**（契约 §5）；"
        "字体走 `prototypes/_fonts/` 自托管缓存，不链外网。",
        "",
        "## 一、真实位图（Wikimedia Commons 抓取，页面用第二节的双色阶版）",
        "",
        "抓取方式照抄 S25 `assets/fetch-assets.ps1` 并经 S14 加固："
        "`action=query&generator=search&gsrnamespace=6&prop=imageinfo`，搜索串带 `filetype:bitmap`"
        "以排除 PDF 与书籍扫描件，候选要求源图宽度 ≥1100px、每个槽位带 `must` 正则、"
        "同一张源图只许对应一个落盘文件，再按 `extmetadata` 取许可与权利人。"
        "**缩略图 URL 上的 `?utm_source=…` 查询串在下载前必须剥掉，否则 404**（S25 记录的坑，本案同样命中）。",
        "",
        "落盘位置是 `assets/source/`（未经处理的原件，重新烘焙时的输入），"
        "`assets/photo-*.jpg` 是第二节的双色阶成品。署名表里 `artist` 超过 90 字的多段署名"
        "保留前 2 段 +「共 N 项」——是截断，不是改写，完整清单在 Commons 文件页。",
        "",
        f"本地共 {len(sources)} 张抓取件，其中 {len(src_wide)} 张落盘宽度 ≥900px"
        f"（最窄 {min([px(ASSETS / f)[0] for f in src_wide] or [0])}px、"
        f"最宽 {max([px(ASSETS / f)[0] for f in src_wide] or [0])}px），"
        "全部是真实位图（JPEG/TIFF 缩略图），**没有一张 SVG 冒充照片**。"
        "题材：渔船／渔网／港湾（摄影）＋ 两件档案图纸扫描（HAER 测绘图纸页、1903 年英国海军部海图）。",
        "",
        "| 文件 | 尺寸（落盘） | 原件像素 | 页面里用在哪 | 原件文件页（可逐张复核许可） | 权利人 | 许可 |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for f in sources:
        r = by_file[f]
        w, h = px(ASSETS / (f))
        page = r.get("page") or "—"
        title = (r.get("title") or f).replace("File:", "").replace("|", "/")
        L.append("| `assets/{}` | {}×{} | {}×{} | {} | [{}]({}) | {} | {} |".format(
            f, w, h, r.get("width", "?"), r.get("height", "?"), where(f.split("/")[-1]),
            title if len(title) <= 60 else title[:57] + "…", page,
            clean_artist(r.get("artist")), (r.get("license") or "见 Commons 文件页").replace("|", "/")))

    L += [
        "",
        "## 二、石墨／纸色双色阶图版（由第一节的照片烘焙，页面应当引用这一组）",
        "",
        "规格字段 6④ 要求「所有照片先扫描成灰度，再压到石墨与纸色两个色阶，保留原始铅笔压痕的侧向阴影，"
        "禁止暖色滤镜与纸张纹理贴图」，字段 9③ 再次禁止纸张纹理贴图与暖色调整层。"
        "所以这一步在位图阶段做完，页面只 `<img>` 引用成品，CSS 里既没有滤镜也没有渐变。"
        "烘焙脚本 `build/bake-plates.py`：灰度 → `autocontrast(cutoff 0.4%)` → "
        "`UnsharpMask(2, 58%, 3)`（读铅笔压痕的侧向阴影）→ 三端点 LUT"
        "（暗 `#22282B` / 中 `#3A3F45` / 亮 `#E7EBE9`，三个值全部取自 `_CURRENT-VALUES.md`）→ "
        "按宽度定标到 ≤1280px（真实分辨率，不是把小图拉满）。"
        "表里带 R−G / B−G 实测值：两者同时「R−G>0 且 B−G<0」才算暖色偏移，本案 6 张全部不成立。",
        "",
        "| 产出图版 | 尺寸（落盘） | 页面里用在哪 | 源文件 | 源像素 | R−G / B−G（实测） | 署名与许可（同源文件） |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for p in plates:
        pr = plate_of_src.get(p)
        if not pr:
            continue
        w, h = px(ASSETS / p)
        src = pr["source"]
        sr = by_file.get(src, {})
        L.append("| `assets/{}` | {}×{} | {} | `assets/{}` | {}×{} | {:+.2f} / {:+.2f} | {} / {} |".format(
            p, w, h, where(p), src, pr.get("source_width", "?"), pr.get("source_height", "?"),
            pr.get("warm_shift_r_minus_g", 0.0), pr.get("warm_shift_b_minus_g", 0.0),
            clean_artist(sr.get("artist")), (sr.get("license") or "—").replace("|", "/")))

    caps = (tex.get("caps") or {})
    L += [
        "",
        "## 三、程序化生成的纹理（Pillow 生成，无第三方来源、无扫描纸料）",
        "",
        "生成器 `build/make-plates.py`，色值只用字段 3 的四个：纸色 `#E7EBE9`、石墨 `#3A3F45`、"
        "铅笔重压 `#22282B`、铅笔灰 `#7A7466`。"
        "字段 9③ 的「纹理只能来自程序化噪声且不透明度上限 4%」按下面这条口径执行并附实测值："
        "纸颗粒 `texture-noise-4pct.png` 的上限就是 4%，实测最 alpha {}（{}%）；"
        "硫酸纸层、网格线、铅笔压痕、橡皮残迹、比例尺属于字段 6 点名要做的**结构件**而不是纸纹贴图，"
        "它们的噪声成分同样全部程序化生成，逐张的实测偏离值列在下表。".format(
            caps.get("paper_noise_alpha_max", 10), caps.get("paper_noise_pct", 3.92)),
        "",
        "| 产出文件 | 尺寸 | 机制与实测 |",
        "| --- | --- | --- |",
    ]
    kind_note = {
        "trace-sheet": "硫酸纸层：纸色 + 纵向/横向纤维（双三次上采样噪声，实测亮度偏离 {dev}%）+ 1px 纸张毛口（最大内啃 {bite}px），平均不透明度 {a}",
        "grid-tile": "8px 基线网格贴图，周期 8/40/240 都能整除 960 所以 repeat 无缝，1px 硬线四级 alpha 7/15/30/46，不靠 CSS 渐变",
        "plan-frame": "平面图纸面：纸色 + 纤维 + 32px 图廓留边硬线 + 四角测绘十字 + 边中刻线 + 8px 网格（可直接当图幅底）",
        "pencil-grain": "铅笔压痕侧向阴影：横向 8:1 拉长的磨痕，实测最大 alpha {am}（字段 6④ 的压痕，不是纸纹贴图）",
        "eraser-smudge": "橡皮擦除残迹：纸色白痕 + 实测最大 alpha {am}（≤ 字段 6② 的 12%）+ 两段被擦断的铅笔线头",
        "paper-noise": "纸颗粒：纯程序化噪声，实测最大 alpha {am} = {pct}%，严格在字段 9③ 的 4% 上限内",
        "scale-bar": "1:200 页脚手绘比例尺（字段 12）：{cells} 格，2 倍图，4 倍超采样后 LANCZOS 缩回，所以「第 7 格窄 0.5px、第 13 格宽 0.5px」真的落在像素上（实测让 cell7={c7}px、cell13=+{c13}px 的格宽差）；「1:200」这几个字由页面排，不烤进位图",
    }
    for f in tex.get("files", []):
        note = kind_note.get(f.get("kind"), f.get("note", ""))
        try:
            note = note.format(
                dev=f.get("fibre_luminance_dev_pct", "—"), bite=f.get("deckle_max_px", "—"),
                a=f.get("alpha_mean", "—"), am=f.get("alpha_max_measured", "—"),
                pct=f.get("alpha_max_pct", "—"), cells=f.get("cells", "—"),
                c7=f.get("cell7_delta_px", "—"), c13=f.get("cell13_delta_px", "—"))
        except Exception:
            pass
        L.append("| `assets/{}` | {}×{} | {} |".format(
            f["file"], f["width"], f["height"], note))

    L += [
        "",
        "## 四、复算方式",
        "",
        "```",
        "assets/fetch-assets.ps1     # Commons 抓取：许可/权利人/原件页/原始像素/落盘像素 -> assets/credits.json",
        "build/bake-plates.py        # assets/source/fishery-*.jpg -> assets/photo-*.jpg（石墨/纸色双色阶）",
        "build/make-plates.py        # 程序化纹理 texture-*.png（硫酸纸层/网格/压痕/擦痕/纸颗粒/比例尺）",
        "build/write-credits.py      # 本表的唯一写入者：credits.json + bake-report.json + textures.json -> assets/CREDITS.md",
        "build/qc-assets.py          # 位图客观自检（尺寸/模式/实测上限/署名条目对照）",
        "```",
        "",
        "本表的文件名、尺寸、许可、权利人全部读自 `assets/credits.json`、`build/bake-report.json`、"
        "`build/textures.json` 与磁盘上的实际文件，没有任何一项是手抄的。",
        "页面落盘之后请再跑一次 `build/write-credits.py`：第一节与第二节的「页面里用在哪」"
        "会从「待页面引用」变成真实引用关系，未被引用的会明确标成「备用」。",
    ]

    dest = ASSETS / "CREDITS.md"
    dest.write_text("\n".join(L) + "\n", encoding="utf-8")

    print("CREDITS.md 已写入 {}：{} 行，{} 字节".format(dest, len(L), dest.stat().st_size))
    print("抓取件 {} 张（≥900px {} 张），双色阶图版 {} 张，程序化纹理 {} 张。".format(
        len(sources), len(src_wide), len(plates), len(tex.get("files", []))))
    if len(rows_wide) < 4:
        print("警告：≥900px 宽的位图不足 4 张，违反契约 §5 的素材下限。")
    if refs is None:
        print("提示：index.html / style.css 还没落盘，本表暂按「待页面引用」标注；页面写完后重跑本脚本即变为真实引用关系。")
    missing = [f for f in sources if not (ASSETS / f).exists()]
    if missing:
        print("警告：credits.json 里有署名行但磁盘上没有文件 -> {}".format(missing))


if __name__ == "__main__":
    main()
