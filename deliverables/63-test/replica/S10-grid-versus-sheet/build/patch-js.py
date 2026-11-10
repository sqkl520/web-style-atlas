# JS：差额排序列改从「价格序对照」单元里的百分数解析（不再往 15 行里写 data-diff）
import re
from pathlib import Path

HTML = Path(__file__).resolve().parents[1] / "index.html"
src = HTML.read_text(encoding="utf-8")

old = re.compile(
    r"( *)function sortRows\(key\) \{.*?\n\1\}\n",
    re.S,
)
m = old.search(src)
assert m, "没找到 sortRows"
ind = m.group(1)
new = (
    f"{ind}/* 排序键：到货周期/报价读 data-*，差额从「价格序对照」单元里的百分数解析 */\n"
    f"{ind}function keyOf(tr, key) {{\n"
    f"{ind} if (key === 'diff') {{\n"
    f"{ind}  var m = (tr.children[3].textContent || '').match(/([\\d.]+)\\s*%/);\n"
    f"{ind}  return m ? parseFloat(m[1]) : null;\n"
    f"{ind} }}\n"
    f"{ind} var v = tr.getAttribute('data-' + key);\n"
    f"{ind} return v === null ? null : parseFloat(v);\n"
    f"{ind}}}\n\n"
    f"{ind}function sortRows(key) {{\n"
    f"{ind} separate();\n"
    f"{ind} var list = [].slice.call(rows.querySelectorAll('tr'));\n"
    f"{ind} list.sort(function (a, b) {{\n"
    f"{ind}  var av = keyOf(a, key), bv = keyOf(b, key);\n"
    f"{ind}  if (av === null) return 1;\n"
    f"{ind}  if (bv === null) return -1;\n"
    f"{ind}  return av - bv;\n"
    f"{ind} }});\n"
    f"{ind} list.forEach(function (tr, i) {{\n"
    f"{ind}  tr.style.setProperty('--row-index', String(i));\n"
    f"{ind}  rows.appendChild(tr);\n"
    f"{ind} }});\n"
    f"{ind} [].forEach.call(rows.querySelectorAll('tr'), function (tr) {{ tr.classList.add('landed'); }});\n"
    f"{ind}}}\n"
)
src = src[:m.start()] + new + src[m.end():]
HTML.write_text(src, encoding="utf-8")
print(f"sortRows 已改写；index.html 现在 {len(src.encode())} B")
