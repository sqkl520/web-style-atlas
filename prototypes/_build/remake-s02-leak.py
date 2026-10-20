# -*- coding: utf-8 -*-
"""重新生成 S02 的漏金缺口贴片（assets/leak-patch@2x.png）。

为什么必须重做
--------------
原贴片的不透明区是**纯象牙白 #EFE6D0 平涂**（实测占 99.99%），而 S02 的正文颜色**也是**
#EFE6D0（CSS 里 `--ivory: #EFE6D0; /* 象牙纸白＝正文与漏白 */`）。补丁虽然 z-index 低于
文字，但它落到哪里，哪里的正文就变成"象牙白字压象牙白底"——对比度 **1.00:1，完全不可见**。

位置解决不了这个问题：把 7 个落点 × 3 档视口全部量了一遍，**21 组里 20 组压到正文**
（390 档半版只有 599px 高、全是字，根本没有空位）。而且数学上就不可能有解——
象牙白 L≈0.80，要让压在它上面的象牙白正文达到 4.5:1，底色得压到 L≤0.139，那已经是深色。
**所以任何浅色补丁压在正文上都不达标。**

改法
----
贴金工艺里，金箔是贴在**金胶底（bole）**上的，底子本来就是红棕色。金箔掉了，露出的正是
这层暗底。所以把缺口的内部从"象牙白"换成**暗金胶底**，既符合工艺，也让正文在它上面
达到 11.6:1：

    #EFE6D0 正文 压在 #3A2418 bole 上  →  对比度 11.6:1  ✓

同时补上字段 6 承诺、但原贴片根本没画的那道"缺口下缘未压实的金线"。

毛边（alpha）**逐字节保留**——那正是字段 6 里"边缘是卡纸毛边"说的东西，也是这块贴片
唯一不可替代的部分。

这是个确定性脚本：同一个输入永远给出同一个输出，可以逐字节复算。
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ASSET = Path(__file__).resolve().parent.parent / "S02-gilded-symmetry-salon" / "assets" / "leak-patch@2x.png"
BACKUP = ASSET.with_suffix(".ivory-backup.png")

BOLE = (0x3A, 0x24, 0x18)          # 暗金胶底（红棕）——缺口内部的颜色
BOLE_HI = (0x4E, 0x33, 0x22)       # 轻微起伏，免得是一块死平涂
GOLD = (0xB8, 0x86, 0x0B)          # 字段 3 声明的暗金 #B8860B
BOLE_BOTTOM_DEPTH = 10             # 底部往下多少像素是 bole 的最深处（用来定金线位置）


def main() -> int:
    if not ASSET.exists():
        print(f"  找不到 {ASSET}")
        return 1

    src = Image.open(ASSET).convert("RGBA")
    a = np.array(src)
    alpha = a[:, :, 3].copy()
    h, w = alpha.shape
    print(f"  输入 {w}×{h}  alpha: 全透明 {100*np.mean(alpha==0):.1f}%  全不透明 {100*np.mean(alpha==255):.1f}%")

    # 备份一次原件（只备一次，别覆盖已有的备份）
    if not BACKUP.exists():
        src.save(BACKUP)
        print(f"  原件已备份 → {BACKUP.name}")

    rgb = np.zeros((h, w, 3), dtype=np.uint8)

    # ① 主体：暗金胶底，带一点自上而下的明度变化（上浅下深），避免死平涂
    ramp = np.linspace(0.0, 1.0, h)[:, None]
    for c in range(3):
        rgb[:, :, c] = (BOLE[c] * (1 - ramp) + BOLE_HI[c] * ramp * 0.55 + BOLE[c] * ramp * 0.45).astype(np.uint8)

    # ② 缺口下缘那道"未压实的金线"：按 alpha 的底部实心边缘往上数 N 行
    opaque_rows = np.where((alpha == 255).any(axis=1))[0]
    if len(opaque_rows):
        bottom = opaque_rows.max()
        y0 = max(0, bottom - 3)
        y1 = min(h, bottom + 1)
        # 只在"该行本来就不透明"的地方画金线，别把金线画到缺口外面去
        for y in range(y0, y1):
            row = alpha[y] > 200
            rgb[y][row] = GOLD
        print(f"  金线：画在第 {y0}–{y1-1} 行（缺口下缘）")

    out = np.dstack([rgb, alpha])
    Image.fromarray(out, "RGBA").save(ASSET)
    print(f"  已写出 {ASSET.name}")

    # 自查：不透明区的主色应当已经是 bole 而不是象牙白
    chk = np.array(Image.open(ASSET).convert("RGBA"))
    solid = chk[chk[:, :, 3] == 255]
    if len(solid):
        med = np.median(solid[:, :3], axis=0).astype(int)
        print(f"  复核：不透明区中位色 #%02X%02X%02X（原为 #EFE6D0）" % tuple(med))
        # 正文 #EFE6D0 压在这个色上的对比度
        def lum(c):
            s = [v / 255 for v in c]
            s = [(v / 12.92) if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in s]
            return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]
        l1, l2 = lum((0xEF, 0xE6, 0xD0)), lum(tuple(med))
        hi, lo = max(l1, l2), min(l1, l2)
        print(f"  正文 #EFE6D0 压其上 → 对比度 {(hi+0.05)/(lo+0.05):.2f}:1  （原为 1.00:1）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
