# S18 磷光检修台 —— 未来荧黑 Glow Sans SC 子集化器
#
# 为什么需要这一步：Glow Sans 的发布物只有 8.7MB 全字库 OTF（无 woff2、无 unicode-range 切片），
# 而规格字段 11 要求首屏字体预算 ≤380KB，所以用 fontTools 按本页实际用字子集化成 woff2。
#
# 为什么不复用 _fonts/css 里已有的两份：
#   glow-sans-sc__400-500.css      是 S05 按它自己页面的用字切的（cmap 547 码位）
#   glow-sans-sc-s12__400-500.css  是 S12 按它自己页面的用字切的（cmap 515 码位）
# 实测这两份对本页用字各缺 36 / 42 个字（缺「磷、光、台、牌、摘、阀、泵…」），直接引用会掉字；
# 而覆盖写别人的缓存文件会破坏 S05／S12 的交付物，因此本页另起 glow-sans-sc-s18__*，
# 三份并存、页面只链这一份（契约 §9.8）。
#
# OTF ground 只读复用 S12 的 build/ground/（同一发布物，未改动）。
# 重新生成：python _fonts/subset-glow-s18.py
import subprocess, sys, re
from pathlib import Path

HERE = Path(__file__).resolve().parent            # prototypes/_fonts
PAGE = HERE.parent / "S18-phosphor-service-deck" / "index.html"
GROUND = HERE.parent / "S12-lime-knockout-wall" / "build" / "ground"
OUTDIR = HERE / "files" / "glow-sans-sc-s18"
CSSPATH = HERE / "css" / "glow-sans-sc-s18__400-500.css"
TEXT = HERE / "charset-glow-s18.txt"
PY = sys.executable


def charset():
    """页面实际用字：取 index.html 的全部非 ASCII 字符（含 <script> 里的中文串）。
    style.css 不进字表：它的中文全在注释里，还夹着 ─ │ ≤ → 这类制框字符，
    未来荧黑没有这些码位，混进来只会让缺字核对报假警。"""
    src = PAGE.read_text(encoding="utf-8")
    # 注释不渲染：段头那串 ══ 是制框字符，未来荧黑没有这个码位，混进来只会让缺字核对报假警
    body = re.sub(r"<!--.*?-->", " ", src, flags=re.S)
    chars = {ch for ch in body if ord(ch) > 0x7F and not (0x2500 <= ord(ch) <= 0x257F)}
    chars |= set(chr(c) for c in range(0x20, 0x7F))
    chars |= set("℃℉°′″×÷±－—–…·、。，；：？！（）《》〈〉「」『』【】〔〕％‰　")
    return "".join(sorted(chars)), re.sub(r"<!--.*?-->", " ", src, flags=re.S)


def w500_charset(src):
    """字重 500 的实际用字：h1／h2／h3、.claim、.tagband__say、.alert 与全部 <b>。
    Medium 档只切这些字，两份合计才落进字段 11 的首屏 380KB 预算（S05 用的是「三档共用一个
    文件」的省法，本页字重差只有 400／500 两档，按档切比共用一个文件更省，且不做假粗体）。"""
    body = re.sub(r"<script.*?</script>", " ", src, flags=re.S)
    body = re.sub(r"<!--.*?-->", " ", body, flags=re.S)
    pat = re.compile(r"""<(h1|h2|h3|b)\b[^>]*>(.*?)</\1>
                       |<p class="claim"[^>]*>(.*?)</p>
                       |<p class="tagband__say"[^>]*>(.*?)</p>
                       |<p class="alert"[^>]*>(.*?)</p>""", re.S | re.X)
    chars = set()
    for m in pat.finditer(body):
        seg = "".join(g for g in m.groups()[1:] if g)
        seg = re.sub(r"<[^>]+>", "", seg)
        chars |= {ch for ch in seg if ord(ch) > 0x1F}
    chars |= set(chr(c) for c in range(0x20, 0x7F))
    chars |= set("—–…·、。，；：？！（）《》「」【】×≥／％　")
    return "".join(sorted(chars))


TEXT_CONTENT, PAGE_SRC = charset()
TEXT.write_text(TEXT_CONTENT, encoding="utf-8")
print("页面实际用字 %d 个字符（其中非 ASCII %d 个）"
      % (len(TEXT_CONTENT), sum(1 for c in TEXT_CONTENT if ord(c) > 0x7F)))
W500 = w500_charset(PAGE_SRC)
print("字重 500 实际用字 %d 个字符" % len(W500))
TEXT500 = HERE / "charset-glow-s18-w500.txt"
TEXT500.write_text(W500, encoding="utf-8")

jobs = [("GlowSansSC-Normal-Regular.otf", "glow-sans-sc-s18-regular", TEXT),
        ("GlowSansSC-Normal-Medium.otf", "glow-sans-sc-s18-medium", TEXT500)]

OUTDIR.mkdir(parents=True, exist_ok=True)
total = 0
for src_name, out, textfile in jobs:
    src = GROUND / src_name
    if not src.exists():
        print("FAIL %s 不存在" % src_name)
        sys.exit(1)
    dest = OUTDIR / (out + ".woff2")
    cmd = [PY, "-m", "fontTools.subset", str(src),
           "--text-file=" + str(textfile), "--flavor=woff2", "--layout-features=*",
           "--no-hinting", "--desubroutinize", "--drop-tables+=DSIG",
           "--name-IDs=*", "--output-file=" + str(dest)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("FAIL", src_name, r.stdout[-800:], r.stderr[-800:])
        sys.exit(1)
    kb = dest.stat().st_size / 1024
    total += kb
    print("ok  %s.woff2  %.1f KB" % (out, kb))

from fontTools.ttLib import TTFont  # noqa: E402
cmap = set()
for _, out, _t in jobs:
    stage = TTFont(OUTDIR / (out + ".woff2"))
    cmap |= set(stage.getBestCmap().keys())
    stage.close()
page_chars = {ord(ch) for ch in PAGE_SRC if ord(ch) > 0x7F}
missing = sorted(page_chars - cmap)
print("index.html 非 ASCII 字符数：", len(page_chars), "缺字：",
      "".join(chr(c) for c in missing) if missing else "无")
if missing:
    sys.exit(1)
med = TTFont(OUTDIR / "glow-sans-sc-s18-medium.woff2")
mcmap = set(med.getBestCmap().keys())
med.close()
miss500 = sorted({ord(c) for c in W500 if ord(c) > 0x7F} - mcmap)
print("字重 500 档缺字：", "".join(chr(c) for c in miss500) if miss500 else "无")
if miss500:
    sys.exit(1)

CSSPATH.write_text("""/* S18 磷光检修台 —— 自托管字体（手写，非 _build/fetch-fonts.mjs 生成）
   族：Glow Sans SC ＝未来荧黑（OFL 1.1，硬骨架几何黑体，笔画端头平直，规格局 C5）
   字重：400 指向 Regular 子集，500／600 指向 Medium 子集（标题与强调档，不做假粗体）。
   为什么不与 S05／S12 共用：那两份是按它们各自页面的用字切的（cmap 547 / 515 码位），
   实测对本页各缺 36 / 42 个字（缺「磷、光、台、牌、摘、阀、泵」等），
   而覆盖别人的缓存文件会破坏 S05／S12 的交付物，因此另起 glow-sans-sc-s18__*，
   多份并存、页面只链这一份（契约 §9.8）。
   上游：https://github.com/lvwzhen/glow-sans 的 npm 分发物 @fontpkg/glow-sans-sc（Normal 宽度档），
   由 fontTools 按本页实际用字子集化为 woff2。重跑：python _fonts/subset-glow-s18.py */
@font-face {
  font-family: 'Glow Sans SC';
  src: url('../files/glow-sans-sc-s18/glow-sans-sc-s18-regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Glow Sans SC';
  src: url('../files/glow-sans-sc-s18/glow-sans-sc-s18-medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'Glow Sans SC';
  src: url('../files/glow-sans-sc-s18/glow-sans-sc-s18-medium.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
""", encoding="utf-8")

used = ["glow-sans-sc-s18-regular.woff2", "glow-sans-sc-s18-medium.woff2"]
used_kb = sum((OUTDIR / u).stat().st_size for u in used) / 1024
flag = "OK" if used_kb <= 380 else "OVER"
print("[%s] 页面 css 实际引用 %d 份 = %.1f KB（规格字段 11 首屏字体上限 380 KB）"
      % (flag, len(used), used_kb))
print("两档合计 %.1f KB（仅存档，页面并不都下载）" % total)
