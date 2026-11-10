# 生成 assets/CREDITS.md：以 credits.json（真实照片）为准，
# 再扫 index.html / style.css 里实际引用的每个 assets/*，核对「引用了但没有署名」和「署名了但没引用」。
# 用法：python assets/write-credits.py
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CREDITS = HERE / "credits.json"
OUT = HERE / "CREDITS.md"

# 构建期用 Python + Pillow 生成的纹理／底纹，不属于第三方素材
TEXTURES = {
    "texture-paper.png": ("assets/bake-plates.py", "无光泽纸的纸纹，384×384 平铺"),
    "texture-screen-tint.png": ("assets/bake-plates.py", "45° 网点底纹，48×48 平铺"),
    "texture-mottle.png": ("assets/bake-plates.py", "红版底噪，仅铺在错误态分区内，256×256 平铺"),
    "texture-scale.png": ("assets/bake-scale.py", "0/30/60/90 刻度条，90×10 拉伸"),
}


def referenced():
    """index.html + style.css 里真正被请求的 assets/xxx（src/href 与 url()，不含文档正文）"""
    found = set()
    for f in (ROOT / "index.html", ROOT / "style.css"):
        text = f.read_text(encoding="utf-8")
        found.update(re.findall(r'(?:src|href)="assets/([A-Za-z0-9_.\-]+)"', text))
        found.update(re.findall(r'url\(["\']?assets/([A-Za-z0-9_.\-]+)["\']?\)', text))
    return found


def main():
    photos = json.loads(CREDITS.read_text(encoding="utf-8"))
    used = referenced()
    known = {p["file"] for p in photos} | set(TEXTURES)
    raw = {p["raw"] for p in photos}

    missing = sorted(f for f in used if f not in known and f not in raw)
    unused = sorted(f for f in known if f not in used)
    if missing:
        print("引用了但没有署名的素材：" + ", ".join(missing), file=sys.stderr)
        return 1
    if unused:
        print("署名了但没有引用的素材（保留在目录里）：" + ", ".join(unused), file=sys.stderr)

    lines = [
        "# S10 刻度对撞页 · 图像来源与授权",
        "",
        "六张原片来自 Wikimedia Commons 的公开档案（检索时限定 `gsrnamespace=6` 与 `filetype:bitmap`），",
        "由 `assets/fetch-assets*.ps1` 下载原片，再由 `assets/bake-plates.py` 压成双色 45° 网点位图：",
        "黑版取暗调、红版取中间调，红版中心整体右移下移 1.5px（错位是算出来的，不是描边）。",
        "页面里没有任何外部请求，所有图像都是本地文件。",
        "",
        "## 位图（随页面发布）",
        "",
        "| 页面文件 | 画面 | 原片 | 作者 | 授权 | 原片页面 |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for p in photos:
        lines.append(
            f"| `{p['file']}`<br>{p['baked']} | {p['figure']} | `{p['raw']}` {p['pixels']} | "
            f"{p['artist']} | {p['license']} | [Commons]({p['page']}) |"
        )
    lines += [
        "",
        "## 构建期生成的纹理（非第三方素材）",
        "",
        "| 页面文件 | 生成脚本 | 用途 |",
        "| --- | --- | --- |",
    ]
    for name, (script, use) in TEXTURES.items():
        lines.append(f"| `{name}` | `{script}` | {use} |")
    lines += [
        "",
        "## 改作说明",
        "",
        "- 全部原片只做同一套处理：等比缩到 1280px 宽 → 双色分离 → 45° 网点分版 → 红版错位 1.5px → 边缘裁切十字 → 8 色索引 PNG。",
        "- 处理为改作：CC BY-SA 3.0/4.0 的原片改作后仍按同一授权（或更严）发布；公有领域原片改作后不受限。",
        "- CC BY-SA 的署名与授权全文见上方表格与各自 Commons 页面；本项目不改变原作者署名。",
        f"- 本文件由 `assets/write-credits.py` 依据 `credits.json` 与页面实际引用生成，共 {len(photos)} 张位图、{len(TEXTURES)} 张纹理。",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"CREDITS.md 已写出：{len(photos)} 张位图 + {len(TEXTURES)} 张纹理，引用核对通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
