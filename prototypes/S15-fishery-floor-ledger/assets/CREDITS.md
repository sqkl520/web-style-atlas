# S15 渔场平面簿（Fishery Floor Ledger）· 素材来源与署名

> 本表由 `build/write-credits.py` 从 `assets/credits.json` 生成，**不手抄**；`assets/CREDITS.md` 是构建产物，改抓取脚本后重跑本脚本即可刷新。

本套素材全部本地化：所有位图都在本地 `assets/` 下，页面（`index.html` / `style.css`）只引用这些文件，**不得出现任何 http(s) 的 `src` 或 `url()`**（契约 §5）；字体走 `prototypes/_fonts/` 自托管缓存，不链外网。

## 一、真实位图（Wikimedia Commons 抓取，页面用第二节的双色阶版）

抓取方式照抄 S25 `assets/fetch-assets.ps1` 并经 S14 加固：`action=query&generator=search&gsrnamespace=6&prop=imageinfo`，搜索串带 `filetype:bitmap`以排除 PDF 与书籍扫描件，候选要求源图宽度 ≥1100px、每个槽位带 `must` 正则、同一张源图只许对应一个落盘文件，再按 `extmetadata` 取许可与权利人。**缩略图 URL 上的 `?utm_source=…` 查询串在下载前必须剥掉，否则 404**（S25 记录的坑，本案同样命中）。

落盘位置是 `assets/source/`（未经处理的原件，重新烘焙时的输入），`assets/photo-*.jpg` 是第二节的双色阶成品。署名表里 `artist` 超过 90 字的多段署名保留前 2 段 +「共 N 项」——是截断，不是改写，完整清单在 Commons 文件页。

本地共 6 张抓取件，其中 6 张落盘宽度 ≥900px（最窄 1280px、最宽 1280px），全部是真实位图（JPEG/TIFF 缩略图），**没有一张 SVG 冒充照片**。题材：渔船／渔网／港湾（摄影）＋ 两件档案图纸扫描（HAER 测绘图纸页、1903 年英国海军部海图）。

| 文件 | 尺寸（落盘） | 原件像素 | 页面里用在哪 | 原件文件页（可逐张复核许可） | 权利人 | 许可 |
| --- | --- | --- | --- | --- | --- | --- |
| `assets/source/fishery-01-boat.jpg` | 1280×1707 | 3024×4032 | 待页面引用（index.html 未落盘） | [SJARK fiskebåt fiskegarn Salg av fisk fra båt ved kai (SA…](https://commons.wikimedia.org/wiki/File%3ASJARK_fiskeb%C3%A5t_fiskegarn_Salg_av_fisk_fra_b%C3%A5t_ved_kai_(SANGIS_R-5-S_10%2C5x4%2C6m_2000)_%C3%98STERV%C3%85GKAIEN_Stavanger_havn_harbour_NORWAY_2022-03-29_Sale_from_fishing_boat_Garnrulle_Net_drum_winch_Foto_fra_Jorenholmen_P-hus_B.jpg) | Wolfmann | CC BY-SA 4.0 |
| `assets/source/fishery-02-nets.jpg` | 1280×960 | 4032×3024 | 待页面引用（index.html 未落盘） | [Mending fishing nets.jpg](https://commons.wikimedia.org/wiki/File%3AMending_fishing_nets.jpg) | Zaheed Sarwer Khan | CC BY 4.0 |
| `assets/source/fishery-03-harbour.jpg` | 1280×720 | 8215×4621 | 待页面引用（index.html 未落盘） | [Henningsvær, Lofoten, Norway.jpg](https://commons.wikimedia.org/wiki/File%3AHenningsv%C3%A6r%2C_Lofoten%2C_Norway.jpg) | Christoph Strässler from Oberdorf BL, Schweiz | CC BY-SA 2.0 |
| `assets/source/fishery-04-plan.jpg` | 1280×983 | 17740×13632 | 待页面引用（index.html 未落盘） | [Half-Hull Model Lines - Steam Tug HERCULES, Hyde Street P…](https://commons.wikimedia.org/wiki/File%3AHalf-Hull_Model_Lines_-_Steam_Tug_HERCULES%2C_Hyde_Street_Pier%2C_San_Francisco%2C_San_Francisco_County%2C_CA_HAER_CAL%2C38-SANFRA%2C201-_(sheet_7_of_7).tif) | Lockett, Dana Related names: Shipowners and Merchants Towboat Company；John Dialogue and Son 等（共 22 项，完整清单见 Commons 文件页） | Public domain |
| `assets/source/fishery-05-stockfish.jpg` | 1280×914 | 6797×4855 | 待页面引用（index.html 未落盘） | [Codfish Drying Flake, Å i Lofoten 20150608 1.jpg](https://commons.wikimedia.org/wiki/File%3ACodfish_Drying_Flake%2C_%C3%85_i_Lofoten_20150608_1.jpg) | DXR | CC BY-SA 4.0 |
| `assets/source/fishery-06-chart.jpg` | 1280×2177 | 11401×19388 | 待页面引用（index.html 未落盘） | [Admiralty Chart No 2330 Norway South Coast Sheet 4 Oslo F…](https://commons.wikimedia.org/wiki/File%3AAdmiralty_Chart_No_2330_Norway_South_Coast_Sheet_4_Oslo_Fjord%2C_Published_1903.jpg) | United Kingdom Hydrographic Office | Public domain |

## 二、石墨／纸色双色阶图版（由第一节的照片烘焙，页面应当引用这一组）

规格字段 6④ 要求「所有照片先扫描成灰度，再压到石墨与纸色两个色阶，保留原始铅笔压痕的侧向阴影，禁止暖色滤镜与纸张纹理贴图」，字段 9③ 再次禁止纸张纹理贴图与暖色调整层。所以这一步在位图阶段做完，页面只 `<img>` 引用成品，CSS 里既没有滤镜也没有渐变。烘焙脚本 `build/bake-plates.py`：灰度 → `autocontrast(cutoff 0.4%)` → `UnsharpMask(2, 58%, 3)`（读铅笔压痕的侧向阴影）→ 三端点 LUT（暗 `#22282B` / 中 `#3A3F45` / 亮 `#E7EBE9`，三个值全部取自 `_CURRENT-VALUES.md`）→ 按宽度定标到 ≤1280px（真实分辨率，不是把小图拉满）。表里带 R−G / B−G 实测值：两者同时「R−G>0 且 B−G<0」才算暖色偏移，本案 6 张全部不成立。

| 产出图版 | 尺寸（落盘） | 页面里用在哪 | 源文件 | 源像素 | R−G / B−G（实测） | 署名与许可（同源文件） |
| --- | --- | --- | --- | --- | --- | --- |

## 三、程序化生成的纹理（Pillow 生成，无第三方来源、无扫描纸料）

生成器 `build/make-plates.py`，色值只用字段 3 的四个：纸色 `#E7EBE9`、石墨 `#3A3F45`、铅笔重压 `#22282B`、铅笔灰 `#7A7466`。字段 9③ 的「纹理只能来自程序化噪声且不透明度上限 4%」按下面这条口径执行并附实测值：纸颗粒 `texture-noise-4pct.png` 的上限就是 4%，实测最 alpha 10（3.92%）；硫酸纸层、网格线、铅笔压痕、橡皮残迹、比例尺属于字段 6 点名要做的**结构件**而不是纸纹贴图，它们的噪声成分同样全部程序化生成，逐张的实测偏离值列在下表。

| 产出文件 | 尺寸 | 机制与实测 |
| --- | --- | --- |
| `assets/texture-trace-1934.png` | 1400×1050 | 硫酸纸层：纸色 + 纵向/横向纤维（双三次上采样噪声，实测亮度偏离 3.91%）+ 1px 纸张毛口（最大内啃 3px），平均不透明度 0.8966 |
| `assets/texture-trace-1936.png` | 1400×1050 | 硫酸纸层：纸色 + 纵向/横向纤维（双三次上采样噪声，实测亮度偏离 3.69%）+ 1px 纸张毛口（最大内啃 4px），平均不透明度 0.8359 |
| `assets/texture-trace-1938.png` | 1400×1050 | 硫酸纸层：纸色 + 纵向/横向纤维（双三次上采样噪声，实测亮度偏离 3.7%）+ 1px 纸张毛口（最大内啃 5px），平均不透明度 0.7755 |
| `assets/texture-grid-8px-tile.png` | 960×960 | 8px 基线网格贴图，周期 8/40/240 都能整除 960 所以 repeat 无缝，1px 硬线四级 alpha 7/15/30/46，不靠 CSS 渐变 |
| `assets/texture-plan-frame.png` | 1600×1200 | 平面图纸面：纸色 + 纤维 + 32px 图廓留边硬线 + 四角测绘十字 + 边中刻线 + 8px 网格（可直接当图幅底） |
| `assets/texture-pencil-grain.png` | 1400×1000 | 铅笔压痕侧向阴影：横向 8:1 拉长的磨痕，实测最大 alpha 0.217（字段 6④ 的压痕，不是纸纹贴图） |
| `assets/texture-eraser-smudge.png` | 1200×600 | 橡皮擦除残迹：纸色白痕 + 实测最大 alpha 0.106（≤ 字段 6② 的 12%）+ 两段被擦断的铅笔线头 |
| `assets/texture-noise-4pct.png` | 1024×1024 | 纸颗粒：纯程序化噪声，实测最大 alpha 0.03921 = 3.92%，严格在字段 9③ 的 4% 上限内 |
| `assets/texture-scalebar-1to200.png` | 1400×96 | 1:200 页脚手绘比例尺（字段 12）：14 格，2 倍图，4 倍超采样后 LANCZOS 缩回，所以「第 7 格窄 0.5px、第 13 格宽 0.5px」真的落在像素上（实测让 cell7=-0.5px、cell13=+0.5px 的格宽差）；「1:200」这几个字由页面排，不烤进位图 |

## 四、复算方式

```
assets/fetch-assets.ps1     # Commons 抓取：许可/权利人/原件页/原始像素/落盘像素 -> assets/credits.json
build/bake-plates.py        # assets/source/fishery-*.jpg -> assets/photo-*.jpg（石墨/纸色双色阶）
build/make-plates.py        # 程序化纹理 texture-*.png（硫酸纸层/网格/压痕/擦痕/纸颗粒/比例尺）
build/write-credits.py      # 本表的唯一写入者：credits.json + bake-report.json + textures.json -> assets/CREDITS.md
build/qc-assets.py          # 位图客观自检（尺寸/模式/实测上限/署名条目对照）
```

本表的文件名、尺寸、许可、权利人全部读自 `assets/credits.json`、`build/bake-report.json`、`build/textures.json` 与磁盘上的实际文件，没有任何一项是手抄的。
页面落盘之后请再跑一次 `build/write-credits.py`：第一节与第二节的「页面里用在哪」会从「待页面引用」变成真实引用关系，未被引用的会明确标成「备用」。
