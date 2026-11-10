# S05 像素冷库台 —— 署名生成器与资产对账
# 契约：assets/ 里的位图必须有作者、许可、出处；每张图都要在页面里被真正引用（alt 已在 index.html）；
# index.html / style.css 里不得出现 http(s) 的 src 或 url()（字体与位图都必须自托管）。
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
ASSETS = ROOT / "assets"
HTML = ROOT / "index.html"
CSS = ROOT / "style.css"

credits = json.loads((ASSETS / "credits.json").read_text(encoding="utf-8-sig"))
html = HTML.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")

fail = []

# 1) 远程资源检查
for name, text in (("index.html", html), ("style.css", css)):
    for m in re.finditer(r"(?:src|href)\s*=\s*[\"'](https?://[^\"']+)|url\(\s*[\"']?(https?://[^\"')]+)", text):
        fail.append(f"{name} 里有远程资源：{m.group(0)[:80]}")
for m in re.finditer(r"fonts\.(googleapis|gstatic)\.com", html + css):
    fail.append("出现 Google Fonts 域名：" + m.group(0))

# 2) 每张抖动图都要被 index.html 引用，并带 alt
rows = []
for c in credits:
    slot = c["slot"]
    dither = ASSETS / f"{slot}-dither.png"
    if not dither.exists():
        fail.append(f"缺文件：{dither.name}")
        continue
    ref = f"assets/{dither.name}"
    if ref not in html:
        fail.append(f"{dither.name} 没有被 index.html 引用")
    # 找引用该图的 <img>，确认 alt 非空
    tag = re.search(r"<img[^>]*" + re.escape(dither.name) + r"[^>]*>", html)
    alt = re.search(r'alt="([^"]+)"', tag.group(0)) if tag else None
    if not tag:
        fail.append(f"{dither.name} 没有 <img> 标签")
    elif not alt or len(alt.group(1)) < 10:
        fail.append(f"{dither.name} 的 alt 太短或为空")
    from PIL import Image
    w, h = Image.open(dither).size
    rows.append((dither.name, w, h, dither.stat().st_size, alt.group(1) if alt else "", c))

# 3) 纹理要用在 style.css 里
for tex in sorted(ASSETS.glob("plate-*.png")):
    if f"assets/{tex.name}" not in css:
        fail.append(f"{tex.name} 没有被 style.css 引用")

# 4) assets 目录里不允许有既不在页面、也不在样式、也不是存档原图/账本的文件
known = {r[0] for r in rows} | {p.name for p in ASSETS.glob("plate-*.png")} | {"credits.json", "CREDITS.md"}
for p in sorted(ASSETS.iterdir()):
    if p.is_dir():
        continue
    if p.name not in known:
        fail.append(f"assets/{p.name} 既未被引用也不在账本里")

# 5) 生成 CREDITS.md
lines = [
    "# 图片署名 · S05 像素冷库台",
    "",
    "6 张现场／史料照片全部取自 Wikimedia Commons，构建期下载到 `assets/source/`（存档原图，不参与渲染），",
    "再按规格字段 11 的工艺做 Floyd–Steinberg 二值抖动：阈值取每张图直方图 62% 分位，",
    "只保留漆面绿 `#4FA83D` 与铁皮底 `#0E100D` 两色，输出 2 位 PNG-8（调色板 4 色）。",
    "所有文件名、作者、许可与原始页面如下，逐条可与 `assets/credits.json` 对上。",
    "",
    "| 渲染文件 | 尺寸 | 字节 | 原始标题 | 作者 | 许可 | 原始页面 |",
    "| --- | --- | --- | --- | --- | --- | --- |",
]
for fname, w, h, size, alt, c in rows:
    lines.append(f"| `assets/{fname}` | {w}×{h} | {size} | {c['title']} | {c['artist']} | "
                 f"{c['license']} | {c['page']} |")
lines += ["", "## 每张图的 alt 文本（页面里实际使用）", ""]
for fname, w, h, size, alt, c in rows:
    lines.append(f"- `assets/{fname}`：{alt}")
lines += [
    "",
    "## 纹理（程序生成，不是照片）",
    "",
    "由 `build/make-plates.py` 用 Pillow 逐像素生成，无第三方素材、无远程请求：",
    "",
    "| 文件 | 尺寸 | 用途 |",
    "| --- | --- | --- |",
    "| `assets/plate-brushed.png` | 256×256 | 铁皮底拉丝，挂在 `.gauge::before` 与 `.panel--dark::before` |",
    "| `assets/plate-scanline.png` | 8×8 | 扫描线栅格（1px 暗行 ＋ 1px 微亮行），挂在面板／维护栏／图版伪元素 |",
    "| `assets/plate-grain.png` | 192×192 | 漆面颗粒，与扫描线叠加 |",
    "| `assets/plate-wear.png` | 320×320 | 蚀刻磨损，擦掉漆面露出铁皮，挂在铭牌条与浅色面板 |",
    "",
    "## 字体（自托管，不属于图片账）",
    "",
    "- Barlow（OFL 1.1）· Google Fonts 渠道取回，`_build/fetch-fonts.mjs` → `_fonts/css/barlow__500-600.css`",
    "- Glow Sans SC 未来荧黑（OFL 1.1）· `build/fetch-fonts-extra.mjs` 取 OTF 后由 `build/subset-glow.py` 子集化",
    "- Departure Mono（OFL 1.1）· `build/fetch-fonts-extra.mjs` 取上游发布物 woff2",
]
(ASSETS / "CREDITS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

print("CREDITS.md 写出：", (ASSETS / "CREDITS.md").stat().st_size, "字节")
print("对账：", len(rows), "张抖动图，", len(list(ASSETS.glob('plate-*.png'))), "张纹理")
if fail:
    print("\n".join("FAIL " + f for f in fail))
    sys.exit(1)
print("FAIL=0：远程资源 0、未引用资产 0、alt 缺失 0")
