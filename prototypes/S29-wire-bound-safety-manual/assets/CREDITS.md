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
| `nasa-earth-obsersation-taken-by-the-exped-15dax.jpg` | Earth Obsersation taken by the Expedition 11 crew | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/iss011e09680/iss011e09680~medium.jpg) · Wikimedia Commons（为本方案抓取） |
| `nasa-earth-observations-taken-by-the-expe-1m1xc.jpg` | Earth observations taken by the Expedition 12 crew | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/iss012e11654/iss012e11654~medium.jpg) · Wikimedia Commons（为本方案抓取） |
| `nasa-earth-observations-taken-during-sts--vy5ds.jpg` | Earth observations taken during STS-83 mission | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/sts083-747-033/sts083-747-033~medium.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s10-halftone-store-03.png` | File:Warehouse of radiators.jpg | Pavel Ševela | CC BY-SA 3.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AWarehouse_of_radiators.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s10-rail-02-raw.jpg` | File:Intermodal freight car 2001 2rd.jpg | Snow storm in Eastern Asia（英文维基百科） | Public domain | [原件页](https://commons.wikimedia.org/wiki/File%3AIntermodal_freight_car_2001_2rd.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s10-road-04-raw.jpg` | File:Freight transportation by road on open truck.jpg | Sneha G Gupta | CC BY-SA 4.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AFreight_transportation_by_road_on_open_truck.jpg) · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-manual-paper.png` | `fiber` | `{"seed":95,"count":280,"alpha":0.075}` |
| `texture-spec-grid.png` | `grid` | `{"step":16,"alpha":0.13}` |
| `texture-torque-grain.png` | `grain` | `{"seed":97,"density":0.4,"alpha":0.055}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
