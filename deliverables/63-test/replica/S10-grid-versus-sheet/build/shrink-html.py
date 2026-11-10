# 把每行内联的 <svg class="scale"> 刻度尺换成 40 字节的 <span class="scale" style="--p:…%">，
# 并在同一次改写里把行首缩进折半（只为压体积，不动内容）。
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
HTML = HERE.parent / "index.html"

SCALE = re.compile(
    r'<svg class="scale" viewBox="0 0 90 10" preserveAspectRatio="none" aria-hidden="true">'
    r'<g>.*?<line class="mark" x1="(\d+)".*?</svg>'
)


def repl(m):
    day = int(m.group(1))
    p = round(day / 90 * 100, 1)
    return f'<span class="scale" style="--p:{p:g}%" aria-hidden="true"></span>'


def main():
    src = HTML.read_text(encoding="utf-8")
    # 校验：每条刻度尺上方的天数是否与刻度位置一致
    for m in SCALE.finditer(src):
        day = int(m.group(1))
        head = src[max(0, m.start() - 700):m.start()]
        nums = re.findall(r"<code>(\d+)</code>", head)
        assert nums and int(nums[-1]) == day, f"刻度 {day} 与上方天数 {nums[-3:]} 不一致"
    out, n = SCALE.subn(repl, src)
    print(f"刻度尺替换：{n} 条")
    lines = []
    for line in out.splitlines(keepends=True):
        body = line.lstrip(" ")
        pad = len(line) - len(body)
        lines.append(" " * (pad // 2) + body)
    out = "".join(lines)
    HTML.write_text(out, encoding="utf-8")
    print(f"字节数 {len(src.encode('utf-8'))} -> {len(out.encode('utf-8'))}")


if __name__ == "__main__":
    sys.exit(main())
