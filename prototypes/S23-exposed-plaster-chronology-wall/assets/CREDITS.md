# 素材来源与署名

> **本目录的真图来源**：2026-10-18 04:15 之后，所有可检索的图源在本环境全部不可用——
> Wikimedia（含 upload / commons / wikidata）连接被重置或 30 秒超时，Internet Archive、Openverse、
> DuckDuckGo 超时，`www.loc.gov` / `tile.loc.gov` / `picryl` / `pexels.com` / `pixabay.com` 返回 403 拦截页。
> 仍然可用的只有 `images-api.nasa.gov`（可检索可下载）与几个只认直链的图片 CDN。
> 因此本方案的真人实拍素材来自两处：**本会话早先网络正常时为其他方案抓取、按题材复用的 Wikimedia 照片**，
> 以及 **NASA 图像库**。复用的每一张都在下表里注明原本属于哪个方案。

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
