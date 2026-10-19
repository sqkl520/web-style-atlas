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
| `reuse-s01-plate-02-type-case.jpg` | File:Lead type case (25598835882).jpg | Thomas Quine | CC BY 2.0 | [原件页](https://commons.wikimedia.org/wiki/Lead_type_case_(25598835882).jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s12-carlton-bookcase.jpg` | File:Ettore sottsass per memphis srl., libreria carlton, milano 1981.jpg | Sailko | CC BY 3.0 / Creative Commons Attribution 3.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AEttore_sottsass_per_memphis_srl.%2C_libreria_carlton%2C_milano_1981.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s12-memphis-collection.jpg` | File:Ettore Sottsass per Memphis - Libreria Casablanca - 1981 - laminato plastico - Casablanca bookcase in plastic laminate.JPG | Stefano Stabile | CC BY-SA 3.0 / Creative Commons Attribution-Share Alike 3.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AEttore_Sottsass_per_Memphis_-_Libreria_Casablanca_-_1981_-_laminato_plastico_-_Casablanca_bookcase_in_plastic_laminate.JPG) · Wikimedia Commons（为本方案抓取） |
| `reuse-s16-plate-04-metal-type.jpg` | File:Metal movable type.jpg | Willi Heidelbach | CC BY 2.5 | [原件页](https://commons.wikimedia.org/wiki/File%3AMetal%20movable%20type.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s16-plate-05-albion-press.jpg` | File:Albion press at the Birkenhead Museum of Printing.jpg | Rodhullandemu | CC BY-SA 4.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AAlbion%20press%20at%20the%20Birkenhead%20Museum%20of%20Printing.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s16-plate-06-composing-stick.jpg` | File:Composing-stick - Winkelhaken (2311727423).jpg | takomabibelot | CC BY 2.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AComposing-stick%20-%20Winkelhaken%20(2311727423).jpg) · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-rule-11deg.png` | `rule` | `{"angle":0.192,"spacing":24,"alpha":0.18}` |
| `texture-misreg.png` | `misreg` | `{"dx":1.5,"dy":1.2,"alpha":0.85,"color":"#c8341f","lineWidth":2}` |
| `texture-ink-grain.png` | `grain` | `{"seed":71,"density":0.42,"alpha":0.06}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
