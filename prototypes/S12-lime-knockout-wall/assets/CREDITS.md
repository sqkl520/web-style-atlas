# S12 青柠挖空墙 · 素材来源与署名

本页所有位图都是本地文件；`index.html` / `style.css` 里没有任何 `http(s)` 的 `src` 或 `url()`。
字体走 `prototypes/_fonts/` 自托管缓存（Bricolage Grotesque 可变轴 + 本案自子集的未来荧黑 + JetBrains Mono）。

料件照片全部来自 Wikimedia Commons（公有领域 / CC BY / CC BY-SA），经 Commons API
（`action=query&generator=search&gsrnamespace=6&prop=imageinfo&iiurlwidth=1400`）抓取到 `build/raw/`，
再由 `build/bake-plates.py` 转成双色分色图版：青柠版吃亮部（偏 −1px）、墨绿版吃暗部（偏 +1px），
每通道量化到 4 bit，最后用同一套 45° 八边形遮罩冲切并垫 1px 米白翻边。
**照片内容与本案页面无关**，它们是孟菲斯层压板家具、街机丝印面板与层压板样张的公开照片，
仅用于验证规格字段 6④「双色分色 + 斜切遮罩 + 1px 套色错位」的实现方式。

| 产出文件 | 页面引用 | 原件（Commons 文件页，可逐张复核许可） | 权利人 | 许可 | 原始像素 |
| --- | --- | --- | --- | --- | --- |
| `assets/plate-01-carlton-laminate.png` | 是 | [Ettore sottsass per memphis srl., libreria carlton, milano 1981.jpg](https://commons.wikimedia.org/wiki/File%3AEttore_sottsass_per_memphis_srl.%2C_libreria_carlton%2C_milano_1981.jpg) | Sailko | CC BY 3.0 / Creative Commons Attribution 3.0 | 2152x2200 px 原件 / 本地 1400px 长边缩略图 |
| `assets/plate-02-casablanca-laminate.png` | 是 | [Ettore Sottsass per Memphis - Libreria Casablanca - 1981 - laminato plastico - Casablanca bookcase in plastic laminate.JPG](https://commons.wikimedia.org/wiki/File%3AEttore_Sottsass_per_Memphis_-_Libreria_Casablanca_-_1981_-_laminato_plastico_-_Casablanca_bookcase_in_plastic_laminate.JPG) | Stefano Stabile | CC BY-SA 3.0 / Creative Commons Attribution-Share Alike 3.0 | 1536x2048 px 原件 / 本地 1400px 长边缩略图 |
| `assets/plate-03-arcade-panel.png` | 是 | [Marble Madness arcade cabinet.jpg](https://commons.wikimedia.org/wiki/File%3AMarble_Madness_arcade_cabinet.jpg) | Halcyanide | CC BY-SA 4.0 / Creative Commons Attribution-Share Alike 4.0 | 2448x3264 px 原件 / 本地 1400px 长边缩略图 |
| `assets/plate-04-laminate-counter.png` | 是 | [Decorative laminate 07829.jpg](https://commons.wikimedia.org/wiki/File%3ADecorative_laminate_07829.jpg) | Андрей Перцев 1967 | CC0 / Creative Commons Zero, Public Domain Dedication | 4320x3240 px 原件 / 本地 1400px 长边缩略图 |
| `assets/plate-05-formica-counter.png` | 是 | [Formica Laminate for Countertops 04.jpg](https://commons.wikimedia.org/wiki/File%3AFormica_Laminate_for_Countertops_04.jpg) | Stilfehler | CC BY-SA 4.0 / Creative Commons Attribution-Share Alike 4.0 | 1600x1200 px 原件 / 本地 1400px 长边缩略图 |
| `assets/plate-06-silkscreen-bench.png` | 是 | [Screen print hand bench proffesional print bench in Squeegee & Ink studio.jpg](https://commons.wikimedia.org/wiki/File%3AScreen_print_hand_bench_proffesional_print_bench_in_Squeegee_%26_Ink_studio.jpg) | Scrud123 | CC BY-SA 3.0 / Creative Commons Attribution-Share Alike 3.0 | 3786x2772 px 原件 / 本地 1400px 长边缩略图 |

程序化生成的纹理（Pillow，无第三方来源）：

| 产出文件 | 生成方式 |
| --- | --- |
| `assets/laminate-grain.png` | `Image.effect_noise` 256×256 取中心偏差后压到 16%，作为 256px 平铺颗粒挂 `.sheet::before`（`body` 保持纯色） |
| `assets/stripe-45-tile.png` | Pillow 绘制的 16×16 备用印纹（页面正式的斜纹走 CSS `data:image/svg+xml` 的 SVG pattern） |
| `assets/cursor-square.png` | Pillow 绘制的 20×20 方形空心框，2px 方头边框，落在 `body` 上（规格字段 7 的光标） |
| `assets/cursor-square-stripe.png` | 同上，框内转为 45° 斜纹（8px 带 / 8px 空），落在洞口上 |

字体：`Bricolage Grotesque`（OFL 1.1，Google Fonts css2 可变宽度轴 wdth 75–100 / wght 200–800）、
`JetBrains Mono`（OFL 1.1，Google Fonts）、未来荧黑 `Glow Sans SC`（OFL 1.1，lvwzhen/glow-sans，
经 npm `@fontpkg/glow-sans-sc@0.93.2` 取回全字库 OTF 后用 fontTools 按本页实际用字子集化）。
三款均为自托管，`_fonts/css/` 每个族只引一个样式表。
