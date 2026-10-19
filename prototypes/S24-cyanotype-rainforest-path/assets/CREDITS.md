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
| `nasa-lake-murray-fly-and-strickland-river-nrsh2.jpg` | Lake Murray, Fly and Strickland River Basins, Papua, New Guinea | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/s44-93-022/s44-93-022~medium.jpg) · Wikimedia Commons（为本方案抓取） |
| `nasa-mount-kilimanjaro-tanzania-5wtlw.jpg` | Mount Kilimanjaro, Tanzania | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/sts072-722-004/sts072-722-004~medium.jpg) · Wikimedia Commons（为本方案抓取） |
| `nasa-snow-water-equivalent-for-tuolumne-r-8x5iv.jpg` | Snow Water Equivalent for Tuolumne River Basin | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/PIA17773/PIA17773~medium.jpg) · Wikimedia Commons（为本方案抓取） |
| `nasa-space-radar-image-of-yellowstone-par-1rr4m.jpg` | Space Radar Image of Yellowstone Park, Wyoming | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/PIA01741/PIA01741~small.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s09-plate-06-batik.png` | plate-06-batik | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s19-jean-feltgen-herbarium-sheet-phelipea-ra.jpg` | File:Jean Feltgen herbarium sheet Phelipea ramosa.jpg | Musée national d'histoire naturelle Luxembourg | CC BY 4.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AJean_Feltgen_herbarium_sheet_Phelipea_ramosa.jpg) · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-cyanotype-grain.png` | `grain` | `{"seed":61,"density":0.38,"alpha":0.08,"color":"#123a5c"}` |
| `texture-exposure-blotch.png` | `blotch` | `{"seed":65,"count":6,"rmin":30,"rmax":120,"alpha":0.1,"color":"#1d4e78"}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
