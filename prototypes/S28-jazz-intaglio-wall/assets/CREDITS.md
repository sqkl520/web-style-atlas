# 素材来源与署名

> **本目录的真图来源**（本块 2026-10-24 改写；逐主机连通性真值单一来源见 `prototypes/_CONTRACT.md` §10.1，本文不重复网络状态断言）：
> 本方案的实拍素材来自两处：**本会话早先网络正常时为其他方案抓取、按题材复用的 Wikimedia 照片**，以及 **NASA 图像库**。复用的每一张都在下表里注明原本属于哪个方案。
> 2026-10-18 04:15 之后本环境曾进入图源受限窗口（Wikimedia 连接被重置、loc.gov／picryl／pexels／pixabay 返回 403），**2026-10-22 复测已解除**（commons HTTP 200、检索命中、缩略图可下载）。
> 因此下表若有题材与本案主张不对的图，那是历史窗口的遗留、不是“现在拿不到”——补对题素材是产品决定，逐案缺口须写在下表备注里（契约 §10.1 硬要求）。

## 一、真实照片

| 文件 | 标题 | 作者 | 许可 | 来源 |
| --- | --- | --- | --- | --- |
| `reuse-s01-plate-02-type-case.jpg` | File:Lead type case (25598835882).jpg | Thomas Quine | CC BY 2.0 | [原件页](https://commons.wikimedia.org/wiki/Lead_type_case_(25598835882).jpg) · Wikimedia Commons（为本方案抓取） |
| `plate-intaglio-press.jpg` | File:The-intaglio-press.JPG | Halvard (from Norway) | Public domain | [原件页](https://commons.wikimedia.org/wiki/File:The-intaglio-press.JPG) · Wikimedia Commons（原件 1280×960 / 437829 B，API sha1 复核为原图；本案按题材抓取后烘双色调） |
| `reuse-s12-silkscreen-bench.jpg` | File:Screen print hand bench proffesional print bench in Squeegee & Ink studio.jpg | Scrud123 | CC BY-SA 3.0 / Creative Commons Attribution-Share Alike 3.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AScreen_print_hand_bench_proffesional_print_bench_in_Squeegee_%26_Ink_studio.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s16-plate-03-type-case.jpg` | File:Type case with movable types for letterpress printing in the Gutenberg Museum, Mainz, Germany (48988492232).jpg | dronepicr | CC BY 2.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AType%20case%20with%20movable%20types%20for%20letterpress%20printing%20in%20the%20Gutenberg%20Museum%2C%20Mainz%2C%20Germany%20(48988492232).jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s16-plate-04-metal-type.jpg` | File:Metal movable type.jpg | Willi Heidelbach | CC BY 2.5 | [原件页](https://commons.wikimedia.org/wiki/File%3AMetal%20movable%20type.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s25-plate5.jpg` | File:Risograph-herr-und-frau-rio-muc-2020.jpg | Kaethe17 | CC BY-SA 4.0 | — · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-groove.png` | `groove` | `{"period":4,"alpha":0.42,"vertical":true}` |
| `texture-crop-misreg.png` | `misreg` | `{"dx":9,"dy":6,"alpha":0.7,"color":"#af74be","lineWidth":3}` |
| `texture-press-grain.png` | `grain` | `{"seed":91,"density":0.44,"alpha":0.075}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
