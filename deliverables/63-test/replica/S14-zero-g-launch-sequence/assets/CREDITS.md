# S14 零重力发射序 · 素材来源与署名

> 本表由 `build/write-credits.py` 从 `assets/credits.json` 生成，**不手抄**；`assets/CREDITS.md` 是构建产物，改动抓取脚本后重跑本脚本即可刷新。

本套素材全部本地化：所有位图都在本地 `assets/` 下，页面（`index.html` / `style.css`）只引用这些文件，**不得出现任何 http(s) 的 `src` 或 `url()`**；字体走 `prototypes/_fonts/` 自托管缓存，不链外网。

## 一、真实照片（Wikimedia Commons 抓取）

抓取方式照抄 S25 的 `assets/fetch-assets.ps1`：`action=query&generator=search&gsrnamespace=6&prop=imageinfo`，搜索串带 `filetype:bitmap` 以排除 PDF／书籍扫描件，候选要求源图宽度 ≥900px，再按 `extmetadata` 取许可与权利人。缩略图 URL 上的 `?utm_source=…` 查询串在下载前必须剥掉，否则 404。

文件名前缀：`cabin-*` 是舱内／控制台／仪表与腕表的照片，`pad-*` 是发射场照片。同一张源图只许对应一个文件（抓取脚本会拒掉已被别的槽位用掉的源图——否则控制台槽与试车台槽会各自命中同一张 NACA 照片，同一张图以两个文件名发两遍）。

本地共 14 张原始照片，其中 14 张宽度 ≥900px（最窄 1280px、最宽 1280px），均为真实位图 JPEG，无 SVG 冒充；另有 14 张由它们烘焙的双色调图版（见第二节），也全部 ≥900px 宽。

| 文件 | 尺寸（落盘） | 页面里用在哪 | 原件文件页（可逐张复核许可） | 权利人 | 许可 | 源图像素 | 来源 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `assets/cabin-01-apollo-interior.jpg` | 1280×1280 | 待页面引用（index.html 未落盘） | [AS11-36-5392 - Apollo 11 - Apollo 11 Mission image - Fight controls insid…](https://commons.wikimedia.org/wiki/File%3AAS11-36-5392_-_Apollo_11_-_Apollo_11_Mission_image_-_Fight_controls_inside_the_Lunar_Module_-_NARA_-_16683244.jpg) | 未署名（Commons 上传者署名为空） | Public domain | 4112×4112 | Wikimedia Commons |
| `assets/cabin-02-cabin-stowage.jpg` | 1280×1846 | 待页面引用（index.html 未落盘） | [Skylab (7034688).jpg](https://commons.wikimedia.org/wiki/File%3ASkylab_(7034688).jpg) | NASA Marshall Space Flight Center | Public domain | 2080×3000 | Wikimedia Commons |
| `assets/cabin-03-flight-checklist.jpg` | 1280×780 | 待页面引用（index.html 未落盘） | [How the Eagle Landed — the Grumman Construction Log (7610058658).jpg](https://commons.wikimedia.org/wiki/File%3AHow_the_Eagle_Landed_%E2%80%94_the_Grumman_Construction_Log_(7610058658).jpg) | jurvetson | CC BY 2.0 | 3555×2165 | Wikimedia Commons |
| `assets/cabin-04-telemetry-panel.jpg` | 1280×960 | 待页面引用（index.html 未落盘） | [Control Room at the NACA’s Rocket Engine Test Facility (GRC-1957-C-45021)…](https://commons.wikimedia.org/wiki/File%3AControl_Room_at_the_NACA%E2%80%99s_Rocket_Engine_Test_Facility_(GRC-1957-C-45021).jpg) | NASA Glenn Research Center | Public domain | 2048×1536 | Wikimedia Commons |
| `assets/cabin-05-cockpit-1960s.jpg` | 1280×1574 | 待页面引用（index.html 未落盘） | [De Havilland-Canada DHC-1A Chipmunk, Pennzoil Special - DPLA - b28ec0d351…](https://commons.wikimedia.org/wiki/File%3ADe_Havilland-Canada_DHC-1A_Chipmunk%2C_Pennzoil_Special_-_DPLA_-_b28ec0d3510427b54bb13c92085d63bb_(page_6).jpg) | Art Scholl, De Havilland Canada Ltd | CC0 | 1626×2000 | Wikimedia Commons |
| `assets/cabin-06-watch-dial.jpg` | 1280×857 | 待页面引用（index.html 未落盘） | [Omega Speedmaster Omega Speedmaster Schumacher Edition compo.jpg](https://commons.wikimedia.org/wiki/File%3AOmega_Speedmaster_Omega_Speedmaster_Schumacher_Edition_compo.jpg) | User:Pittigrilli (the above two source files) User:TeKaBe (the present combined file) | CC BY-SA 4.0 | 2695×1804 | Wikimedia Commons |
| `assets/cabin-07-mission-control.jpg` | 1280×833 | 待页面引用（index.html 未落盘） | [View of Mission Control Center celebrating conclusion of Apollo 11 missio…](https://commons.wikimedia.org/wiki/File%3AView_of_Mission_Control_Center_celebrating_conclusion_of_Apollo_11_mission_(s69-40022).jpg) | NASA Johnson Space Center | Public domain | 5752×3743 | Wikimedia Commons |
| `assets/cabin-08-switch-panel.jpg` | 1280×855 | 待页面引用（index.html 未落盘） | [Vintage electronic device control panel with toggle switches and indicato…](https://commons.wikimedia.org/wiki/File%3AVintage_electronic_device_control_panel_with_toggle_switches_and_indicator_light_in_close-up_detail.jpg) | Shixart1985 | CC BY 2.0 | 5340×3565 | Wikimedia Commons |
| `assets/cabin-09-test-console.jpg` | 1280×1024 | 待页面引用（index.html 未落盘） | [A-1 Test Stand Night Firing - GPN-2000-000551.jpg](https://commons.wikimedia.org/wiki/File%3AA-1_Test_Stand_Night_Firing_-_GPN-2000-000551.jpg) | NASA | Public domain | 3000×2400 | Wikimedia Commons |
| `assets/cabin-10-panel-gauges.jpg` | 1280×853 | 待页面引用（index.html 未落盘） | [DFC 5867 Cockpit of a vintage commercial airliner showing flight instrume…](https://commons.wikimedia.org/wiki/File%3ADFC_5867_Cockpit_of_a_vintage_commercial_airliner_showing_flight_instruments_controls_and_the_pilots_seat.jpg) | PattayaPatrol | CC BY-SA 4.0 | 5568×3712 | Wikimedia Commons |
| `assets/cabin-11-spacecraft-hatch.jpg` | 1280×853 | 待页面引用（index.html 未落盘） | [Dragon V2 interior.2.jpg](https://commons.wikimedia.org/wiki/File%3ADragon_V2_interior.2.jpg) | NASA/Dmitri Gerondidakis | Public domain | 3000×2000 | Wikimedia Commons |
| `assets/cabin-12-pilot-watch.jpg` | 1280×1707 | 待页面引用（index.html 未落盘） | [Crown and chronograph pushers of a Montblanc Timewalker wristwatch V1.jpg](https://commons.wikimedia.org/wiki/File%3ACrown_and_chronograph_pushers_of_a_Montblanc_Timewalker_wristwatch_V1.jpg) | Pittigrilli | CC BY 4.0 | 3024×4032 | Wikimedia Commons |
| `assets/pad-01-saturn-v-launch.jpg` | 1280×1861 | 待页面引用（index.html 未落盘） | [Launch of the Saturn V with Apollo 11 (48300001196).jpg](https://commons.wikimedia.org/wiki/File%3ALaunch_of_the_Saturn_V_with_Apollo_11_(48300001196).jpg) | Cygni_18 | Public domain | 2820×4100 | Wikimedia Commons |
| `assets/pad-02-umbilical-tower.jpg` | 1280×1594 | 待页面引用（index.html 未落盘） | [GENERAL VIEW EAST AND NORTH SIDES WITH FIXED UMBILICAL TOWER FAR LEFT; VI…](https://commons.wikimedia.org/wiki/File%3AGENERAL_VIEW_EAST_AND_NORTH_SIDES_WITH_FIXED_UMBILICAL_TOWER_FAR_LEFT%3B_VIEW_TO_SOUTHWEST._-_Cape_Canaveral_Air_Station%2C_Launch_Complex_17%2C_Facility_28416%2C_East_end_of_Lighthouse_HAER_FLA%2C5-CACAN%2C1C-4.tif) | Related names: U.S. Army Corps of Engineers Stupich, Martin, photographer | Public domain | 4014×5000 | Wikimedia Commons |

## 二、双色调图版（由上面的照片烘焙，不是新素材）

规格字段 6 第四条要求「所有照片走双色调加 12° 高光带，铝箔反光处叠加 8% 不透明度的颗粒，禁止柔光与镜头光晕」，字段 11 要求「照片双色调化后输出」。所以每张照片都在位图阶段处理完，页面只 `<img>` 引用成品，CSS 里没有滤镜也没有渐变。烘焙脚本 `build/bake-plates.py`：`ImageOps.autocontrast` → 三端点双色调映射（暗部 `#12181D`，高光 `#E4572E`／`#D8D2C4`／`#8A3320`）→ 12° 硬边高光带 → 8% 颗粒 → 按宽度定标到 **1000px 宽**（真实分辨率，不是把缩略图拉满）。

| 产出图版 | 尺寸（落盘） | 页面里用在哪 | 源照片 | 双色调高光端 | 署名 |
| --- | --- | --- | --- | --- | --- |
| `assets/plate-01-lm-flight-controls.jpg` | 1000×1000 | 待页面引用（index.html 未落盘） | `assets/cabin-01-apollo-interior.jpg` | orange | 同上：未署名（Commons 上传者署名为空） / Public domain |
| `assets/plate-02-skylab-interior.jpg` | 998×1440 | 待页面引用（index.html 未落盘） | `assets/cabin-02-cabin-stowage.jpg` | silver | 同上：NASA Marshall Space Flight Center / Public domain |
| `assets/plate-03-mission-control.jpg` | 1000×667 | 待页面引用（index.html 未落盘） | `assets/cabin-07-mission-control.jpg` | shadow | 同上：NASA Johnson Space Center / Public domain |
| `assets/plate-04-airliner-instruments.jpg` | 1000×667 | 待页面引用（index.html 未落盘） | `assets/cabin-10-panel-gauges.jpg` | orange | 同上：PattayaPatrol / CC BY-SA 4.0 |
| `assets/plate-05-chipmunk-cockpit.jpg` | 1000×1230 | 待页面引用（index.html 未落盘） | `assets/cabin-05-cockpit-1960s.jpg` | silver | 同上：Art Scholl, De Havilland Canada Ltd / CC0 |
| `assets/plate-06-dragon-interior.jpg` | 1000×667 | 待页面引用（index.html 未落盘） | `assets/cabin-11-spacecraft-hatch.jpg` | orange | 同上：NASA/Dmitri Gerondidakis / Public domain |
| `assets/plate-07-speedmaster-dial.jpg` | 1000×670 | 待页面引用（index.html 未落盘） | `assets/cabin-06-watch-dial.jpg` | silver | 同上：User:Pittigrilli (the above two source files) User:TeKaBe (the present combined file) / CC BY-SA 4.0 |
| `assets/plate-08-construction-log.jpg` | 1000×667 | 待页面引用（index.html 未落盘） | `assets/cabin-03-flight-checklist.jpg` | shadow | 同上：jurvetson / CC BY 2.0 |
| `assets/plate-09-telemetry-panel.jpg` | 1000×750 | 待页面引用（index.html 未落盘） | `assets/cabin-04-telemetry-panel.jpg` | orange | 同上：NASA Glenn Research Center / Public domain |
| `assets/plate-10-switch-panel.jpg` | 1000×668 | 待页面引用（index.html 未落盘） | `assets/cabin-08-switch-panel.jpg` | silver | 同上：Shixart1985 / CC BY 2.0 |
| `assets/plate-11-test-stand-night.jpg` | 1000×800 | 待页面引用（index.html 未落盘） | `assets/cabin-09-test-console.jpg` | orange | 同上：NASA / Public domain |
| `assets/plate-12-watch-macro.jpg` | 1000×1334 | 待页面引用（index.html 未落盘） | `assets/cabin-12-pilot-watch.jpg` | silver | 同上：Pittigrilli / CC BY 4.0 |
| `assets/plate-13-saturn-launch.jpg` | 990×1440 | 待页面引用（index.html 未落盘） | `assets/pad-01-saturn-v-launch.jpg` | orange | 同上：Cygni_18 / Public domain |
| `assets/plate-14-umbilical-tower.jpg` | 1000×1245 | 待页面引用（index.html 未落盘） | `assets/pad-02-umbilical-tower.jpg` | silver | 同上：Related names: U.S. Army Corps of Engineers Stupich, Martin, photographer / Public domain |

## 三、程序化生成的纹理与标印（无第三方来源，Pillow 生成）

| 产出文件 | 尺寸 | 生成方式 |
| --- | --- | --- |
| `assets/foil-grain.png` | 128×128 | 128×128 平铺颗粒：稀疏双档噪点（亮档 alpha 20 ≈7.8%、暗档 alpha 26 ≈10%），即规格字段 6 要求的「8% 不透明度 128×128 颗粒」，种子固定 7（`build/make-plates.py: foil_grain()`）。 |
| `assets/foil-sheen.png` | 900×140 | 900×140 视角反光带：12° 斜向、核心 10px 满值、两侧 4px 硬收边、不发光，带内亮度逐行随机起伏（`make-plates.py: sheen_band()`）。做成位图遮罩而不是 CSS 渐变，因为字段 11 禁止任何色彩插值写法。 |
| `assets/foil-edge-sample.png` | 160×160 | 160×160 铝箔边缘样张（0.15mm 厚度的边缘核对件）：上／左 1px `#D8D2C4` 银高光、下／右 1px `#8A3320` 暗侧，无羽化（`make-plates.py: foil_edge_tile()`）。 |
| `assets/bubble-field.png` | 512×512 | 512×512 低重力气泡场：150 枚直径 3–9px 的硬边圆环，1px 硬线、无填充、不发光，越界圆环在对侧补画一遍以保证平铺接缝处完整（`make-plates.py: bubble_field()`）。 |
| `assets/service-marks.png` | 528×20 | 528×20 精灵图，11 格 ×48px，每格是同一支笔写的「地勤」缩写，各自带旋转 ±5.5°、位移与浓淡抖动，供 11 枚标贴各取自己那一格（字段 12）。字面用系统楷体 `C:\Windows\Fonts\simkai.ttf` 烘焙成位图后即为本地素材（`make-plates.py: service_marks()`）。 |

## 四、复算方式

```
assets/fetch-assets.ps1              # Commons 抓取：许可/权利人/原始像素/落盘像素 -> assets/credits.json
build/bake-plates.py                 # 照片 -> assets/plate-*.jpg（双色调 + 12 度高光带 + 8% 颗粒，1000px 宽）
build/make-plates.py                 # 程序化纹理 foil-*/bubble-field/service-marks
build/polar-layout.py                # 11 枚标贴的极坐标站位表 -> build/polar-layout.json
build/write-credits.py               # 本表的唯一写入者：credits.json -> assets/CREDITS.md
build/qc-assets.py                   # 位图客观自检（像素统计 + 署名条目对照）
```

本表的文件名、尺寸、许可、权利人全部读自 `assets/credits.json` 与磁盘上的实际文件，没有任何一项是手抄的；页面文案里的编号（`A-1107` 等）是版面上的排版元素，不是 Commons 原始编号，复核许可以第一节的 Commons 文件页为准。
