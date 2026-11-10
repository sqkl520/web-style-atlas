# S14 素材交接（给写 index.html / style.css 的那一位）

素材侧已冻结：`assets/` 33 个位图（14 张原始照片 + 14 张双色调图版 + 5 张程序化纹理）
+ `assets/credits.json` + `assets/CREDITS.md`。
`index.html` / `style.css` **我一个字没动**（本目录的写范围只有 `assets/` 与 `build/`）。

## 该用哪一套

| 用途 | 用哪套 | 理由 |
| --- | --- | --- |
| 页面上的照片 | **`plate-*.jpg`（14 张，1000px 宽，双色调）** | 规格字段 6④ 要求「所有照片走双色调加 12° 高光带、铝箔反光处叠 8% 颗粒」，字段 11 要求「照片双色调化后输出」。这一套已经烘焙好了。 |
| 溯源／许可 | `cabin-*.jpg`（12 张）+ `pad-*.jpg`（2 张），1280px 宽 | 抓取原件。**直接用它们会绕过双色调要求**，所以只在需要原始未处理照片时用，并说明理由。 |
| 铝箔／颗粒／气泡／「地勤」缩写 | `foil-grain.png`、`foil-sheen.png`、`foil-edge-sample.png`、`bubble-field.png`、`service-marks.png` | 程序化生成，无第三方来源。`service-marks.png` 是 11 格 ×48px 精灵图，每枚标贴取自己那一格。 |

全部位图宽度 ≥900px（照片 1280px、图版 1000px），不是放大出来的假分辨率；没有任何远程 URL，字体走 `prototypes/_fonts/`。

## 改素材要跑什么

```
assets/fetch-assets.ps1   # Commons 抓取（幂等：已抓且已署名的槽位会跳过；credits.json 是合并不是覆盖）
build/bake-plates.py      # 照片 -> plate-*.jpg（双色调 + 12° 高光带 + 8% 平铺颗粒，按宽度定标 1000px）
build/make-plates.py      # 程序化纹理
build/write-credits.py    # 唯一生成 assets/CREDITS.md 的地方（credits.json -> 表，不手抄）
build/qc-assets.py        # 位图客观自检
```

`bake-plates.py` 的 `PLAN` 是「图版 ↔ 源照片」的唯一权威映射，`write-credits.py` 直接读它，
所以加照片时先加 `PLAN` 条目，再跑 bake 与 write-credits。

## 两个已修的坑（别再踩）

1. **颗粒不能拉伸**：`grain()` 初版把 128×128 噪声 `resize` 成整幅，噪声像素变成 ~8px 方块，
   1000px 成品上像 JPEG 伪影。现在按 128×128 **平铺**。
2. **一个源图只能发一个文件**：抓取脚本 v3 会拒掉已被别的槽位占用的源图——初版
   `cabin-09` 与 `cabin-04` 曾命中同一张 NACA 控制室照片，同一张图以两个文件名发了两遍（字节完全相同）。
