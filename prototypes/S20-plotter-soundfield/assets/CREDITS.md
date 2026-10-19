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
| `reuse-s14-cabin-04-telemetry-panel.jpg` | File:Control Room at the NACA’s Rocket Engine Test Facility (GRC-1957-C-45021).jpg | NASA Glenn Research Center | Public domain | [原件页](https://commons.wikimedia.org/wiki/File%3AControl_Room_at_the_NACA%E2%80%99s_Rocket_Engine_Test_Facility_(GRC-1957-C-45021).jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s14-cabin-05-cockpit-1960s.jpg` | File:De Havilland-Canada DHC-1A Chipmunk, Pennzoil Special - DPLA - b28ec0d3510427b54bb13c92085d63bb (page 6).jpg | Art Scholl, De Havilland Canada Ltd | CC0 | [原件页](https://commons.wikimedia.org/wiki/File%3ADe_Havilland-Canada_DHC-1A_Chipmunk%2C_Pennzoil_Special_-_DPLA_-_b28ec0d3510427b54bb13c92085d63bb_(page_6).jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s14-cabin-10-panel-gauges.jpg` | File:DFC 5867 Cockpit of a vintage commercial airliner showing flight instruments controls and the pilots seat.jpg | PattayaPatrol | CC BY-SA 4.0 | [原件页](https://commons.wikimedia.org/wiki/File%3ADFC_5867_Cockpit_of_a_vintage_commercial_airliner_showing_flight_instruments_controls_and_the_pilots_seat.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s14-plate-05-chipmunk-cockpit.jpg` | plate-05-chipmunk-cockpit | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s15-photo-06-chart.jpg` | photo-06-chart | （原件未标注作者） | 见来源页 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s18-nasa-kennedy-space-center-fla-during-pow.jpg` | KENNEDY SPACE CENTER, FLA.  -   During power-up of the orbiter Discovery in the Orbiter Processing Facility, a technician turns on a switch.  Discovery has been undergoing Orbiter Major Modifications in the past year, ranging from wiring, control panels and black boxes to gaseous and fluid systems tubing and components.  These systems were deserviced, disassembled, inspected, modified, reassembled, checked out and reserviced, as were most other systems onboard.  The work includes the installation of the Multifunction Electronic Display Subsystem (MEDS) - a state-of-the-art “glass cockpit.” | NASA | 公有领域（NASA 图像使用条款） | [原件页](https://images-assets.nasa.gov/image/KSC-03pd2449/KSC-03pd2449~medium.jpg) · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-coord-paper.png` | `grid` | `{"step":12,"alpha":0.16}` |
| `texture-plotter-line.png` | `streak` | `{"seed":15,"angle":1.5708,"count":220,"alpha":0.09}` |
| `texture-paper-grain.png` | `grain` | `{"seed":33,"density":0.4,"alpha":0.05}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
