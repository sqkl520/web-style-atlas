# 图片署名 · S05 像素冷库台

6 张现场／史料照片全部取自 Wikimedia Commons，构建期下载到 `assets/source/`（存档原图，不参与渲染），
再按规格字段 11 的工艺做 Floyd–Steinberg 二值抖动：阈值取每张图直方图 62% 分位，
只保留漆面绿 `#4FA83D` 与铁皮底 `#0E100D` 两色，输出 2 位 PNG-8（调色板 4 色）。
所有文件名、作者、许可与原始页面如下，逐条可与 `assets/credits.json` 对上。

| 渲染文件 | 尺寸 | 字节 | 原始标题 | 作者 | 许可 | 原始页面 |
| --- | --- | --- | --- | --- | --- | --- |
| `assets/colddoor-dither.png` | 420×560 | 33013 | Cold Room Door - Sliding Door.jpg | Mesadbal | CC BY 4.0 | https://commons.wikimedia.org/wiki/File:Cold_Room_Door_-_Sliding_Door.jpg |
| `assets/pallets-dither.png` | 560×373 | 30853 | Pennsylvania Food Bank (20241017-USDA-FNS-CDP-1037).jpg | USDAgov | Public domain | https://commons.wikimedia.org/wiki/File:Pennsylvania_Food_Bank_(20241017-USDA-FNS-CDP-1037).jpg |
| `assets/coolingtower-dither.png` | 560×373 | 31731 | Evaporative Cooling Tower.jpg | Saud | CC BY-SA 4.0 | https://commons.wikimedia.org/wiki/File:Evaporative_Cooling_Tower.jpg |
| `assets/hvac-dither.png` | 560×374 | 36780 | Cool under pressure- 386th ECES HVAC technicians in action (9047740).jpg | U.S. Air Force photo by Senior Airman Mark Colmenares | Public domain | https://commons.wikimedia.org/wiki/File:Cool_under_pressure-_386th_ECES_HVAC_technicians_in_action_(9047740).jpg |
| `assets/engineers-dither.png` | 560×400 | 32645 | Stationary Engineers at the Propulsion Systems Laboratory (grc-1957-c-44352).jpg | NACA | Public domain | https://commons.wikimedia.org/wiki/File:Stationary_Engineers_at_the_Propulsion_Systems_Laboratory_(grc-1957-c-44352).jpg |
| `assets/factory1911-dither.png` | 560×351 | 26576 | Asbestos Factory, circa 1911 - Chesterton, Indiana (23419906645).jpg | Steve Shook from Moscow, Idaho, USA | CC BY 2.0 | https://commons.wikimedia.org/wiki/File:Asbestos_Factory,_circa_1911_-_Chesterton,_Indiana_(23419906645).jpg |

## 每张图的 alt 文本（页面里实际使用）

- `assets/colddoor-dither.png`：冷库推拉门：Dooracold 品牌门体、ESAD PANEL 制板，门旁装着 Dixell XLR-170 数字控制器
- `assets/pallets-dither.png`：宾夕法尼亚中部食物银行的冷库库房：成排货架与托盘
- `assets/coolingtower-dither.png`：工业冷水机组的开式蒸发冷却塔，正在向大气排热
- `assets/hvac-dither.png`：暖通制冷技师在调压力表组，检修一台空调机组
- `assets/engineers-dither.png`：1957 年 NACA 推进系统实验室的固定岗操作工程师在台架前值守
- `assets/factory1911-dither.png`：1911 年前后的工厂生产线，明信片翻拍

## 纹理（程序生成，不是照片）

由 `build/make-plates.py` 用 Pillow 逐像素生成，无第三方素材、无远程请求：

| 文件 | 尺寸 | 用途 |
| --- | --- | --- |
| `assets/plate-brushed.png` | 256×256 | 铁皮底拉丝，挂在 `.gauge::before` 与 `.panel--dark::before` |
| `assets/plate-scanline.png` | 8×8 | 扫描线栅格（1px 暗行 ＋ 1px 微亮行），挂在面板／维护栏／图版伪元素 |
| `assets/plate-grain.png` | 192×192 | 漆面颗粒，与扫描线叠加 |
| `assets/plate-wear.png` | 320×320 | 蚀刻磨损，擦掉漆面露出铁皮，挂在铭牌条与浅色面板 |

## 字体（自托管，不属于图片账）

- Barlow（OFL 1.1）· Google Fonts 渠道取回，`_build/fetch-fonts.mjs` → `_fonts/css/barlow__500-600.css`
- Glow Sans SC 未来荧黑（OFL 1.1）· `build/fetch-fonts-extra.mjs` 取 OTF 后由 `build/subset-glow.py` 子集化
- Departure Mono（OFL 1.1）· `build/fetch-fonts-extra.mjs` 取上游发布物 woff2
