# 素材来源与署名

> **本目录的真图来源**（本块 2026-10-24 改写；逐主机连通性真值单一来源见 `prototypes/_CONTRACT.md` §10.1，本文不重复网络状态断言）：
> 本方案的实拍素材来自两处：**本会话早先网络正常时为其他方案抓取、按题材复用的 Wikimedia 照片**，以及 **NASA 图像库**。复用的每一张都在下表里注明原本属于哪个方案。
> 2026-10-18 04:15 之后本环境曾进入图源受限窗口（Wikimedia 连接被重置、loc.gov／picryl／pexels／pixabay 返回 403），**2026-10-22 复测已解除**（commons HTTP 200、检索命中、缩略图可下载）。
> 因此下表若有题材与本案主张不对的图，那是历史窗口的遗留、不是“现在拿不到”——补对题素材是产品决定，逐案缺口须写在下表备注里（契约 §10.1 硬要求）。

## 一、真实照片

| 文件 | 标题 | 作者 | 许可 | 来源 |
| --- | --- | --- | --- | --- |
| `reuse-s12-arcade-cabinet.jpg` | File:Marble Madness arcade cabinet.jpg | Halcyanide | CC BY-SA 4.0 / Creative Commons Attribution-Share Alike 4.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AMarble_Madness_arcade_cabinet.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s12-carlton-bookcase.jpg` | File:Ettore sottsass per memphis srl., libreria carlton, milano 1981.jpg | Sailko | CC BY 3.0 / Creative Commons Attribution 3.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AEttore_sottsass_per_memphis_srl.%2C_libreria_carlton%2C_milano_1981.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s12-memphis-collection.jpg` | File:Ettore Sottsass per Memphis - Libreria Casablanca - 1981 - laminato plastico - Casablanca bookcase in plastic laminate.JPG | Stefano Stabile | CC BY-SA 3.0 / Creative Commons Attribution-Share Alike 3.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AEttore_Sottsass_per_Memphis_-_Libreria_Casablanca_-_1981_-_laminato_plastico_-_Casablanca_bookcase_in_plastic_laminate.JPG) · Wikimedia Commons（为本方案抓取） |
| `reuse-s12-silkscreen-bench.jpg` | File:Screen print hand bench proffesional print bench in Squeegee & Ink studio.jpg | Scrud123 | CC BY-SA 3.0 / Creative Commons Attribution-Share Alike 3.0 | [原件页](https://commons.wikimedia.org/wiki/File%3AScreen_print_hand_bench_proffesional_print_bench_in_Squeegee_%26_Ink_studio.jpg) · Wikimedia Commons（为本方案抓取） |
| `reuse-s25-plate1.jpg` | File:Screen printing demonstration at TEDxUTM.jpg | Ahmad Ali Karim | CC0 | — · Wikimedia Commons（为本方案抓取） |
| `reuse-s25-plate5.jpg` | File:Risograph-herr-und-frau-rio-muc-2020.jpg | Kaethe17 | CC BY-SA 4.0 | — · Wikimedia Commons（为本方案抓取） |

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 |
| --- | --- | --- |
| `texture-split-band.png` | `band` | `{"angle":1.0123,"width":96,"alpha":1,"color":"#00e676"}` |
| `texture-grip-grain.png` | `grain` | `{"seed":101,"density":0.72,"alpha":0.14}` |
| `texture-peel-edge.png` | `misreg` | `{"dx":3,"dy":0,"alpha":0.8,"color":"#007b3f","lineWidth":3}` |

这些是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
