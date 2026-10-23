# 素材来源与署名

> **本目录的真图来源**（本块 2026-10-24 改写；逐主机连通性真值单一来源见 `prototypes/_CONTRACT.md` §10.1，本文不重复网络状态断言）：
> 本方案的实拍素材来自两处：**本会话早先网络正常时为其他方案抓取、按题材复用的 Wikimedia 照片**，以及 **NASA 图像库**。复用的每一张都在下表里注明原本属于哪个方案。
> 2026-10-18 04:15 之后本环境曾进入图源受限窗口（Wikimedia 连接被重置、loc.gov／picryl／pexels／pixabay 返回 403），**2026-10-22 复测已解除**（commons HTTP 200、检索命中、缩略图可下载）。
> 因此下表若有题材与本案主张不对的图，那是历史窗口的遗留、不是“现在拿不到”——补对题素材是产品决定，逐案缺口须写在下表备注里（契约 §10.1 硬要求）。

## 一、真实照片

| 文件 | 标题 | 作者 | 许可 | 来源 |
| --- | --- | --- | --- | --- |
| `reuse-s07-src-1902-page.jpg` | src-1902-page | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s07-src-sample-page.jpg` | src-sample-page | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s11-doc-04-grate.jpg` | File:Bucharest - Casa Paleologu window grate.jpg | Joe Mabel | CC BY-SA 4.0 | [原件页](https://commons.wikimedia.org/wiki/File:Bucharest_-_Casa_Paleologu_window_grate.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s13-src-paraguay.jpg` | src-paraguay | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s13-src-shelving.jpg` | src-shelving | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s13-src-washi.jpg` | src-washi | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-plaster-flake.png` | `flake` | `{"seed":5,"count":11,"alpha":0.9,"color":"#c9c3ae"}` |
| `texture-scrape.png` | `streak` | `{"seed":17,"angle":0.26,"count":150,"alpha":0.11}` |
| `texture-pigment-grain.png` | `grain` | `{"seed":51,"density":0.45,"alpha":0.06}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
