# S10 刻度对撞页 · 图像来源与授权

六张原片来自 Wikimedia Commons 的公开档案（检索时限定 `gsrnamespace=6` 与 `filetype:bitmap`），
由 `assets/fetch-assets*.ps1` 下载原片，再由 `assets/bake-plates.py` 压成双色 45° 网点位图：
黑版取暗调、红版取中间调，红版中心整体右移下移 1.5px（错位是算出来的，不是描边）。
页面里没有任何外部请求，所有图像都是本地文件。

## 位图（随页面发布）

| 页面文件 | 画面 | 原片 | 作者 | 授权 | 原片页面 |
| --- | --- | --- | --- | --- | --- |
| `halftone-lead-ship-06.png`<br>1240x700 | 重吊船靠泊（首屏图版） | `ship-06-raw.jpg` 3000x2113 | PH2 Stephen Grzezdzinski（美国海军） | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3ASoviet_Heavy_lift_ship_Anadyr.jpeg) |
| `halftone-port-01.png`<br>880x620 | 集装箱岸桥 | `port-01-raw.jpg` 3438x2414 | Cullen328 | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File%3AContainer_crane_at_the_Oakland_Seaport.jpg) |
| `halftone-rail-02.png`<br>880x620 | 集装箱平车 | `rail-02-raw.jpg` 1760x1216 | Snow storm in Eastern Asia（英文维基百科） | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AIntermodal_freight_car_2001_2rd.jpg) |
| `halftone-store-03.png`<br>880x620 | 仓库货架 | `store-03-raw.jpg` 3552x2368 | Pavel Ševela | CC BY-SA 3.0 | [Commons](https://commons.wikimedia.org/wiki/File%3AWarehouse_of_radiators.jpg) |
| `halftone-road-04.png`<br>880x620 | 公路货运 | `road-04-raw.jpg` 3467x2389 | Sneha G Gupta | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File%3AFreight_transportation_by_road_on_open_truck.jpg) |
| `halftone-steel-05.png`<br>880x620 | 堆场货车列 | `steel-05-raw.jpg` 4032x3024 | Coral2712 | CC BY 4.0 | [Commons](https://commons.wikimedia.org/wiki/File%3AVeracruztrainsfromport.png) |

## 构建期生成的纹理（非第三方素材）

| 页面文件 | 生成脚本 | 用途 |
| --- | --- | --- |
| `texture-paper.png` | `assets/bake-plates.py` | 无光泽纸的纸纹，384×384 平铺 |
| `texture-screen-tint.png` | `assets/bake-plates.py` | 45° 网点底纹，48×48 平铺 |
| `texture-mottle.png` | `assets/bake-plates.py` | 红版底噪，仅铺在错误态分区内，256×256 平铺 |
| `texture-scale.png` | `assets/bake-scale.py` | 0/30/60/90 刻度条，90×10 拉伸 |

## 改作说明

- 全部原片只做同一套处理：等比缩到 1280px 宽 → 双色分离 → 45° 网点分版 → 红版错位 1.5px → 边缘裁切十字 → 8 色索引 PNG。
- 处理为改作：CC BY-SA 3.0/4.0 的原片改作后仍按同一授权（或更严）发布；公有领域原片改作后不受限。
- CC BY-SA 的署名与授权全文见上方表格与各自 Commons 页面；本项目不改变原作者署名。
- 本文件由 `assets/write-credits.py` 依据 `credits.json` 与页面实际引用生成，共 6 张位图、4 张纹理。
