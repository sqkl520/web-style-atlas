# 素材来源与署名

> 本文件由 `prototypes/_build/write-credits.mjs` 从本目录及 `build/` 下已有的 `credits.json` 汇总生成，**不是手抄**。
>
> **2026-11-04 更正**：上一版本文件开头写着「素材是在当时网络可用时从 Wikimedia Commons 抓取的」，
> 这句话对本案**是错的**，并因此把 26 个文件挂在「未闭合的署名缺口」下挂了很久。
> 本案全部位图由 `build/` 下的脚本生成，没有一张来自网络。
>
> 判据是**静态可证的**：`make-plates.py` 与 `make-torn.py` 的 import 只有
> `math / random / pathlib / sys / PIL`，**不含任何网络库**（无 requests、urllib、http、socket）。
> 一个没有网络能力的脚本不可能抓取素材。产物由固定种子决定，可重跑复现。
>
> ⚠️ 诚实标注：本轮**没有**在本机重跑这两个脚本验证字节一致 —— 本机 Python 只有
> Windows Store 的占位符（`python` 退出码 49），PIL 也不可用。
> 所以「可复现」这条是基于源码结构的推断，不是实测。要做实测需先装 Python 3 + Pillow。

## 一、程序化生成物（全部位图，0 张外来素材）

生成器与种子。**种子写死在脚本里**，所以产物是确定的。

| 产物 | 生成脚本 | 种子 |
|---|---|---|
| `plate-01..08.png`、`plate-lead.png` | `build/make-plates.py` | 每张一个整数种子，见脚本 `WORKS` 字典（如 `plate-lead.png` 用 11） |
| `torn-edge-1..4.png` | `build/make-torn.py` | 同上，脚本内固定 |
| 全部 `.webp` | 由对应 `.png` 转码 | — |

生成方式（`make-plates.py` 开头自述）：没有摄影原稿，按同一条丝网分色工艺链直接生成
「分色后印出来的纸」—— 四张色版各自 offset 套印、绿版走 30 线半调网、套准偏差处留油墨挤压痕、
上下留胶片齿孔，最后用撕裂边遮罩裁切。**产物是真实位图，不是 CSS 插值，也不是 SVG 描摹。**

复现（需 Python 3 + Pillow）：

```bash
cd prototypes/S04-mango-collage-wall/build
python make-plates.py      # 重写 assets/plate-*.png
python make-torn.py        # 重写 assets/torn-edge-*.png
```

## 二、字体

页面字体全部自托管在 `prototypes/_fonts/`，来源为 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
> ⚠️ 本案另有 4 片私有 woff2 在案目录内（style.css 直接引用），搬走时需一并带走。

