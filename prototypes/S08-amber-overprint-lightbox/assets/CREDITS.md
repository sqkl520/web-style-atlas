# 素材来源与署名

> 本文件由 `prototypes/_build/write-credits.mjs` 从本目录及 `build/` 下已有的 `credits.json` 汇总生成，**不是手抄**。
>
> **2026-11-04 更正**：上一版本文件开头写着「素材是在当时网络可用时从 Wikimedia Commons 抓取的」，
> 这句话对本案**是错的**，并因此把 6 个文件挂在「未闭合的署名缺口」下挂了很久。
> 本案全部位图由 `build-assets.py` 生成，没有一张来自网络。
>
> 判据是**静态可证的**：该脚本的 import 只有 `random` 与 `PIL`，
> **不含任何网络库**（无 requests、urllib、http、socket）。一个没有网络能力的脚本不可能抓取素材。
>
> ⚠️ 诚实标注：本轮**没有**在本机重跑验证字节一致 —— 本机 Python 只有 Windows Store 的占位符
> （`python` 退出码 49），Pillow 也不可用。「可复现」是基于源码结构的推断，不是实测。

## 一、程序化生成物（全部位图，0 张外来素材）

| 产物 | 生成脚本 | 种子 |
|---|---|---|
| `overprint.png`、`overprint-offset.png`、`grime.png`、`grime-macro.png`、`print.png`、`detail.png` | `build-assets.py` | `random.seed(8)`，写死在脚本第 12 行 |

生成方式（脚本开头自述）：套准样张（双色叠印）、污染层（落灰）、指纹层、十字套准光标，
全部用 PIL 以固定种子画出，含一只香氛瓶的轮廓（瓶身/肩/颈/口逐点定义）。
`reg-cursor.svg` 是同脚本内联写出的 SVG，同样不是外来素材。

复现（需 Python 3 + Pillow）：

```bash
cd prototypes/S08-amber-overprint-lightbox
python build-assets.py     # 重写 assets/ 下的 png 与 svg
```

## 二、字体

页面字体全部自托管在 `prototypes/_fonts/`，来源为 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
> ⚠️ 本案另有 1 片私有 woff2 在案目录内，搬走时需一并带走。
