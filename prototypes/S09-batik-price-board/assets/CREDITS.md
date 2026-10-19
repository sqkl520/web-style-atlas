# S09 蜡染价目板 · 素材来源与署名

本页所有素材都在 `assets/` 里，页面里没有任何 `http(s)` 的 `src` 或 `url()`。
本文件由 `build/write-credits.py` 按「`index.html` 真实引用 ∪ `assets/credits.json`」生成，勿手改。

## 1 三色丝网印版（真实照片 → 蓝／黑双色 40 线粗网，套色错位 4px）

印版源片全部取自 Wikimedia Commons，逐张如下。印版本身（`plate-*.png`）
由 `build/make-plates.py` 用 Pillow + numpy 在构建期烘焙：黄版＝招牌底色本身（透明留白），
蓝版错位 +4px／0，黑版错位 0/+3px，人物轮廓外加 3px 手绘描边。

| 印版 | 源片 | 作者 | 许可 | 原始页 |
| --- | --- | --- | --- | --- |
| `plate-01-shoe-repair.png` | `shop-shoe-repair.jpg` | Russell Lee | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AShoemaker_in_his_shop%2C_Kenner%2C_Louisiana_1938.jpg) |
| `plate-02-lasts.png` | `stock-shoe-lasts.jpg` | Johan | CC BY-SA 3.0 | [Commons](https://commons.wikimedia.org/wiki/File%3ALeest.jpg) |
| `plate-03-signboard.png` | `sign-hand-painted.jpg` | Rajani Gairshail | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File%3AHand-painted_village_map_signboard_in_Himachal_Pradesh.jpg) |
| `plate-04-market.png` | `stock-market-stall.jpg` | Johnnybam | CC BY-SA 4.0 | [Commons](https://commons.wikimedia.org/wiki/File%3ABuying_Tomatoes_at_the_Market.jpg) |
| `plate-05-kiosk.png` | `city-kiosk.jpg` | Nick Mutton | CC BY-SA 2.0 | [Commons](https://commons.wikimedia.org/wiki/File%3AOld_fashioned_kiosk_shop_front_on_corner_of_Alexandra_Road_-_geograph.org.uk_-_1938755.jpg) |
| `plate-06-batik.png` | `pattern-batik-cloth.jpg` | Lewis, Gertrude Clayton | No restrictions | [Commons](https://commons.wikimedia.org/wiki/File%3AFirst_lessons_in_batik%3B_a_handbook_in_batik%2C_tie-dyeing_and_all_pattern_dyeing_(1921)_(14591096828).jpg) |

源片原图（未分色）另存于 `assets/raw/`，仅供复核；抓取时落到 `assets/credits.json` 的
`artist` / `license` / `origin` / `page` 四栏逐条转抄如下：

- **shop-shoe-repair.jpg** · File:Shoemaker in his shop, Kenner, Louisiana 1938.jpg · Russell Lee
  - 许可：Public domain　来源：Wikimedia Commons　印版：`plate-01-shoe-repair.png`
  - 原始页：https://commons.wikimedia.org/wiki/File%3AShoemaker_in_his_shop%2C_Kenner%2C_Louisiana_1938.jpg
- **shop-owner-bench.jpg** · File:Albert Ryder, Shoemaker's Bench, c. 1937, NGA 16219.jpg · Albert Ryder
  - 许可：CC0　来源：Wikimedia Commons
  - 原始页：https://commons.wikimedia.org/wiki/File%3AAlbert_Ryder%2C_Shoemaker's_Bench%2C_c._1937%2C_NGA_16219.jpg
- **stock-shoe-lasts.jpg** · File:Leest.jpg · Johan
  - 许可：CC BY-SA 3.0　来源：Wikimedia Commons　印版：`plate-02-lasts.png`
  - 原始页：https://commons.wikimedia.org/wiki/File%3ALeest.jpg
- **sign-hand-painted.jpg** · File:Hand-painted village map signboard in Himachal Pradesh.jpg · Rajani Gairshail
  - 许可：CC BY-SA 4.0　来源：Wikimedia Commons　印版：`plate-03-signboard.png`
  - 原始页：https://commons.wikimedia.org/wiki/File%3AHand-painted_village_map_signboard_in_Himachal_Pradesh.jpg
- **stock-market-stall.jpg** · File:Buying Tomatoes at the Market.jpg · Johnnybam
  - 许可：CC BY-SA 4.0　来源：Wikimedia Commons　印版：`plate-04-market.png`
  - 原始页：https://commons.wikimedia.org/wiki/File%3ABuying_Tomatoes_at_the_Market.jpg
- **pattern-batik-cloth.jpg** · File:First lessons in batik; a handbook in batik, tie-dyeing and all pattern dyeing (1921) (14591096828).jpg · Lewis, Gertrude Clayton
  - 许可：No restrictions　来源：Wikimedia Commons　印版：`plate-06-batik.png`
  - 原始页：https://commons.wikimedia.org/wiki/File%3AFirst_lessons_in_batik%3B_a_handbook_in_batik%2C_tie-dyeing_and_all_pattern_dyeing_(1921)_(14591096828).jpg
- **worker-brush.jpg** · File:A hand-book for young painters (1855) (14577607599).jpg · Internet Archive Book Images
  - 许可：No restrictions　来源：Wikimedia Commons
  - 原始页：https://commons.wikimedia.org/wiki/File%3AA_hand-book_for_young_painters_(1855)_(14577607599).jpg
- **city-kiosk.jpg** · File:Old fashioned kiosk shop front on corner of Alexandra Road - geograph.org.uk - 1938755.jpg · Nick Mutton
  - 许可：CC BY-SA 2.0　来源：Wikimedia Commons　印版：`plate-05-kiosk.png`
  - 原始页：https://commons.wikimedia.org/wiki/File%3AOld_fashioned_kiosk_shop_front_on_corner_of_Alexandra_Road_-_geograph.org.uk_-_1938755.jpg

## 2 程序化生成的纹理（无第三方署名）

| 文件 | 做法 |
| --- | --- |
| `tile-paint-mottle.png` | 调和漆刷了两遍的不匀与竖向拉丝（透明叠加层，平均色不动底色） |
| `tile-wall-iron.png` | 墙面镀锌铁的竖向拉丝与水渍（透明叠加层） |
| `rust-corner-a.png` | 四角锈斑之一，边缘带 1px 漆皮翘起高光 |
| `rust-corner-b.png` | 四角锈斑之二，同一噪声种子旋转 90° 复用 |
| `rust-corner-c.png` | 四角锈斑之三，同 a 旋转 180° |
| `rust-corner-d.png` | 四角锈斑之四，同 b 旋转 270° |
| `lamp-tube.png` | 灯箱灯管位图 1440x64，中段亮度 +18%，表面落灰 |
| `lamp-tube-tight.png` | 灯箱灯管位图 1440x48，平板与窄屏档 |
| `rule-shake-ink.png` | 1.5px 手绘抖线平铺条 512x6，端头方切、左右可拼接 |
| `cursor-brush.png` | 20px 油漆刷光标，3px 方头线宽、向外扩 0.5px 模拟油漆堆积 |

## 3 字体

不链外网。三支字族全部走共享自托管缓存 `../_fonts/css/`（由
`prototypes/_build/fetch-fonts.mjs` 抓 googleapis 的 css2 分片后改写为本地路径）：

| 族 | 许可 | 用途 | 样式表 |
| --- | --- | --- | --- |
| LXGW Marker Gothic 霞鹜漫黑 | OFL 1.1 | 中文主字体、价目大字、分量标注手写层 | `_fonts/css/lxgw-marker-gothic__400.css` |
| Syne | OFL 1.1 | 拉丁店名与英文副标 | `_fonts/css/syne__700.css` |
| JetBrains Mono | OFL 1.1 | 价格列等宽数字，只出现在 `<code>` 里 | `_fonts/css/jetbrains-mono__500.css` |

