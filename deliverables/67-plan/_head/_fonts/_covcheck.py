# -*- coding: utf-8 -*-
import re, io
p = r"D:\Web\style\prototypes\_fonts\css\lxgw-wenkai-tc__400.css"
css = io.open(p, encoding="utf-8").read()
ranges = []
for m in re.finditer(r"unicode-range:\s*([^;]+);", css):
    for part in m.group(1).split(","):
        part = part.strip()
        mm = re.match(r"U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$", part)
        if mm:
            a = int(mm.group(1), 16)
            b = int(mm.group(2), 16) if mm.group(2) else a
            ranges.append((a, b))
print("faces:", css.count("@font-face"), "ranges:", len(ranges))
def cov(ch):
    return any(a <= ord(ch) <= b for a, b in ranges)
test = "铁窗打字本复写纸联色带更换损坏扫描件错误码章节条器检修手册第印数打在封底这只有份编号配电盘走机构张力刻度表零点校准故障排除炭黑粉墨辊轴承锁扣扳手卡口断针三角三位警示批注译备注索引影印稿档案禁书目录"
miss = [c for c in test if not cov(c)]
print("test chars:", len(test), "missing:", "".join(miss))
# coverage of the whole CJK block
tot = 0; hit = 0
for cp in range(0x4E00, 0xA000):
    tot += 1
    if any(a <= cp <= b for a, b in ranges): hit += 1
print("CJK U+4E00-U+9FFF coverage: %d/%d = %.1f%%" % (hit, tot, 100.0*hit/tot))
for ch in "说东还门问题后写":
    print(ch, hex(ord(ch)), cov(ch))
