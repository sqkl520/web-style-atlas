# 压缩 index.html：删掉可由 CSS/JS 推出的冗余属性与类名（只减字节，不动内容与语义）。
import re
from pathlib import Path

HTML = Path(__file__).resolve().parents[1] / "index.html"
src = HTML.read_text(encoding="utf-8")
n0 = len(src.encode())


def sub(pat, rep, expect=None, flags=0):
    global src
    src, n = re.subn(pat, rep, src, flags=flags)
    if expect is not None:
        assert n == expect, f"{pat!r} 命中 {n} 次，预期 {expect}"
    return n


# 1 刻度尺 span 无文字，不需要 aria-hidden
sub(r'(<span class="scale"[^>]*?) aria-hidden="true"', r"\1", 12)
# 2 空行状态由 .row-gap 类承担
sub(r' data-empty="1"', "", 3)
# 3 差额排序列由「价格序对照」单元里的百分数解析
sub(r' data-diff="[\d.]+"', "", 12)
# 4 数字列对齐交给 CSS 的 nth-child
sub(r'class="num cell-no"', 'class="cell-no"', 15)
sub(r' ?class="num"', "", 19)
# 5 图注副行用结构选择器
sub(r'<span class="ref">', "<span>", 7)

HTML.write_text(src, encoding="utf-8")
print(f"index.html {n0} -> {len(src.encode())}")
