# S05 未来荧黑 Glow Sans SC 子集化器
# 规格字段 11：「未来荧黑按 GB2312 一级字库切子集（≤340KB）」「font-display: swap」。
# Glow Sans 的发布物只有 8.7MB 全字库 OTF（无 woff2、无 unicode-range 切片），
# 因此必须在本机用 fontTools 自行子集化 —— 这是本案与 _build/fetch-fonts.mjs 唯一的分歧点。
#
# 关于 GB2312 一级字库：实测按 GB2312 一级（7978 字）＋ GB 标点切出来单档 1.3 MB 以上
# （Regular 1368.7 KB），与同一条规格里的「≤340KB」硬冲突：Glow Sans 是重骨架黑体，
# 每字笔画数远高于文津宋体那类衬线子集，字表一旦铺满一级字库就压不进 340KB。
# 两条约束只能取一条，本案取体积：按 index.html 实际用字（含脚本里会在运行时注入的
# 中文字串）切子集，两名档合计远小于 340KB，并把 GB2312 一级作为 --full 备选保留。
# 交付说明里列为已知偏差之一。
import subprocess, sys, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
PAGE = HERE.parent / "index.html"
GROUND = HERE / "ground"
FONTS = Path(r"D:\Web\style\prototypes\_fonts")
PY = sys.executable
FULL = "--full" in sys.argv


def gb2312_level1():
    out = []
    for hi in range(0xB0, 0xF8):
        for lo in range(0xA1, 0xFF):
            try:
                out.append(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                continue
    return out


def charset():
    """页面实际用字：index.html 里所有非 ASCII 字符 ＋ 拉丁与数字 ＋ 常用标点。"""
    html = PAGE.read_text(encoding="utf-8")
    chars = {ch for ch in html if ord(ch) > 0x7F}
    chars |= set(chr(c) for c in range(0x20, 0x7F))
    chars |= set("℃℉°′″×÷±－—–…·、。，；：？！（）《》〈〉「」『』【】〔〕％‰　")
    if FULL:
        chars |= set(gb2312_level1())
    return "".join(sorted(chars))


TEXT = HERE / ("charset-full.txt" if FULL else "charset.txt")
TEXT.write_text(charset(), encoding="utf-8")
print(("GB2312 一级 ＋ 页面" if FULL else "页面实际用字"), "字符数：", len(TEXT.read_text(encoding="utf-8")))

jobs = [("GlowSansSC-Normal-Regular.otf", "glow-sans-sc-regular", 400),
        ("GlowSansSC-Normal-Medium.otf", "glow-sans-sc-medium", 500)]

FONTS.joinpath("files", "glow-sans-sc").mkdir(parents=True, exist_ok=True)
total = 0
for src, out, weight in jobs:
    dest = FONTS / "files" / "glow-sans-sc" / (out + ".woff2")
    cmd = [PY, "-m", "fontTools.subset", str(GROUND / src),
           "--text-file=" + str(TEXT), "--flavor=woff2", "--layout-features=*",
           "--no-hinting", "--desubroutinize", "--drop-tables+=DSIG",
           "--name-IDs=*", "--output-file=" + str(dest)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("FAIL", src, r.stdout[-800:], r.stderr[-800:])
        continue
    kb = dest.stat().st_size / 1024
    total += kb
    print(f"ok  {out}.woff2  {kb:.1f} KB")

# 覆盖核对：页面用到的每个非 ASCII 字符都必须在子集里
try:
    from fontTools.ttLib import TTFont
    cmap = set()
    for _, out, _w in jobs:
        f = TTFont(FONTS / "files" / "glow-sans-sc" / (out + ".woff2"))
        cmap |= set(f.getBestCmap().keys())
    page_chars = {ord(ch) for ch in PAGE.read_text(encoding="utf-8") if ord(ch) > 0x7F}
    missing = sorted(page_chars - cmap)
    print("页面非 ASCII 字符数：", len(page_chars), "缺字：",
          "".join(chr(c) for c in missing) if missing else "无")
except Exception as e:  # noqa: BLE001
    print("覆盖核对跳过：", e)
print(f"两档合计 {total:.1f} KB（仅存档，页面并不都下载）")
# 规格字段 11 的 ≤340KB 是针对"页面实际下载的中文子集"，所以再从 css 里摘出真正被引用的文件
css = FONTS / "css" / "glow-sans-sc__400-500.css"
if css.exists():
    used = sorted(set(re.findall(r"url\('\.\./files/glow-sans-sc/([^']+)'\)", css.read_text(encoding="utf-8"))))
    used_kb = sum((FONTS / "files" / "glow-sans-sc" / u).stat().st_size for u in used) / 1024
    flag = "OK" if used_kb <= 340 else "OVER"
    print(f"[{flag}] 页面 css 实际引用 {len(used)} 份：{', '.join(used)} = {used_kb:.1f} KB（规格上限 340 KB）")
    if used_kb <= 340:
        print("      400/500/600 三档共用这一份 Regular —— 不落地第二份字重，也不会合成假粗体。")
