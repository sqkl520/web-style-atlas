# 素材来源与署名

> 本文件由人工按实际交付状态重写（`prototypes/_build/write-credits.mjs` 只认 `assets/credits.json`
> 里与磁盘文件同名的条目，它在下次运行时会以本目录的 `credits.json` 为准重新生成一份；届时
> 第四节「留存但未引用」的内容需要从 `assets/credits-unused.json` 手工带回，或者改写那个脚本）。
>
> **本目录的真图来源**：2026-10-18 04:15 之后，所有可检索的图源在本环境全部不可用——
> Wikimedia（含 upload / commons / wikidata）连接被重置或 30 秒超时，Internet Archive、Openverse、
> DuckDuckGo 超时，`www.loc.gov` / `tile.loc.gov` / `picryl` / `pexels.com` / `pixabay.com` 返回 403 拦截页。
> 本方案页面实际引用的 6 张图版，是 **2026-10-18 04:16–04:42 图源尚可用的那个窗口里**由
> `assets/fetch-assets.ps1` 按本案题材（机械联锁机 / 扳道杆列 / 闭塞器 / 值班室 / 站场图）检索并落盘到
> `assets/_cand/` 的 28 个候选，再按 `build/pick-and-bake.py` 的挑片表烘焙成两阶图版的。

## 一、页面实际引用的图版（6 张）

全部经 `build/pick-and-bake.py` 处理：**先转灰度、再走 Bayer 4×4 阈值抖动，只保留主色 `#3E3A34`
与纸色 `#E4DCC9` 两阶**（规格字段 6 第 5 条）。每张同时输出 `.webp`（无损）与 `.avif`，
页面用 `<picture>` 优先取 AVIF。`assets/credits.json` 是同一批记录的机器可读版。

| 图版 | 文件 | 原件（Wikimedia Commons） | 作者 | 许可 | 页内位置 |
| --- | --- | --- | --- | --- | --- |
| 1 | `pl-01.webp` / `.avif` | `File:EM55 Hadersdorf am Kamp - Schieberkasten - 2015.jpg` | Haraldmmueller | CC BY-SA 4.0 | 主张句右侧（909×342） |
| 2 | `pl-02.webp` / `.avif` | `File:Stellwerk Reinheim Hebelbank 2.jpg` | Stefan Flöper | CC BY-SA 4.0 | 联锁表之后三栏并排第一栏（431×323） |
| 3 | `pl-03.webp` / `.avif` | `File:Neal's tablet block instrument Bangalore Railway Station (3).jpg` | PJeganathan | CC BY-SA 4.0 | 同上第二栏 |
| 4 | `pl-04.webp` / `.avif` | `File:Leadhills Railway Station -10. Interior of Signal Box.jpg` | Lankyrider | CC BY-SA 4.0 | 同上第三栏 |
| 5 | `pl-05.webp` / `.avif` | `File:Railway track and track work (1908) (14574694610).jpg`（Tratman《Railway Track and Track Work》1908，Fig. 66） | Tratman, E. E. R. | No restrictions | 切口角度表之后两栏并排第一栏（656×370） |
| 6 | `pl-06.webp` / `.avif` | `File:Lever frame in the Sourbrodt train station signal box (DSCF5829).jpg` | Trougnouf (Benoit Brummer) | CC BY 4.0 | 同上第二栏（656×437） |

逐张原件页、直链与检索词见 `assets/credits.json`（字段 `page` / `source` / `query` / `candidate`），
候选池 28 张的完整署名见 `assets/_cand/candidates.json`。

**两档尺寸与两种格式（2026-10-21 实测后的决定）**

| 变体 | 宽度 | 用在哪 | 说明 |
| --- | --- | --- | --- |
| `pl-0N.webp` | 909 / 431 / 656（等于 1440 档排版宽度） | 1440、768 | 无损两阶。1440 档逐像素与资产一致（实测纸色 `(228,220,201)`、主色 `(62,58,52)`，`currentSrc` 命中本档） |
| `pl-0N-p.webp` | 278（等于 390 档排版宽度） | ≤767 | 390 档把 909px 的原版缩到 278px（0.31 倍）会把 4×4 抖动平均成一片灰——实测该处出现占 18% 面积的中间调 `(146,140,128)`，两阶特征消失；换成 278px 的 1:1 变体后，实测只剩 `(228,220,201)` 与 `(62,58,52)` 两色（60.4% / 39.6%） |
| `pl-0N.avif` / `pl-0N-p.avif` | 同上 | **页面不引用** | 规格字段 11 要求"输出 AVIF 与 WebP 两版"，两版都已产出留在本目录；但 1-bit 图版的交付面取无损的那一版：Pillow 的 AVIF 写不了 `lossless=True`（抛 `TypeError`），即使用 `quality=100 + subsampling='4:4:4'` 也仍把纸色 round 到 `(227,220,200)`，1440 档 1:1 渲染实测从 2 色变 244 色；且六张 AVIF 合计 184 KB，是 WebP（57 KB）的 3.2 倍 |

`index.html` 用 `<img srcset="pl-0N-p.webp 278w, pl-0N.webp <W>w" sizes="…">`，三档实测命中情况：
1440 与 390 都是**按需宽度 = 资产宽度**（不重采样）；768 档原版被缩到 0.49–0.74 倍，
网点略细但仍是网点（`pl-05` / `pl-06` 缩得最多，已在交付说明里记为已知余项）。

**这 6 张都不含火车、蒸汽机车与制服**（这一条逐张目视核过）。其中三张里出现钢轨关系图或轨旁设备，
属于规格字段 9 第 (4) 条「把三维关系压成二维表」这类素材，不是风景照：
`pl-05` 是 1908 年的**刻印工程图版**（岔群与交叉的铺枕平面图，横轴里程、纵轴枕木位置）；
`pl-04` 值班室的窗外能看见一小段单线，是窗景的一部分，不是照片主体。

## 二、程序化纹理（生成物，非照片）

| 文件 | 生成器 | 参数 | 页内位置 |
| --- | --- | --- | --- |
| `texture-release-grid.png` | `grid` | `{"step":6,"alpha":0.14}` | `.board::before` —— 值班台面的 6px 方格，格距与页面 6px 基线同一格 |
| `texture-steel-grain.png` | `grain` | `{"seed":111,"density":0.4,"alpha":0.06}` | `.path__rail::before` —— 释放路径托槽的钢料磨痕 |

这两张是代码生成的纹理，**不是照片**，按 `prototypes/_build/make-textures.py` 与
`build/texture-job.json` 可逐字节复算，无第三方权利。
两者都挂在**伪元素**上，没有挂 `body`（契约 §9.2／§9.16：整页纹理挂 `body` 会让对比度检查与空屏判定静默失真）。
按生成参数，两者的最大不透明度分别只有 13.7% 与 5.9%（实测平均落墨 4.3% / 1.1%），
在纸色上是一层很轻的"齿"，不是可见的花纹——这是它们被生成时的参数，没有为了看得见而改。

## 三、字体

页面字体全部自托管在 `prototypes/_fonts/`，来自 Google Fonts 或字体官方 webfont 包，均为 OFL 1.1 或同类可商用许可。
中文主字体文津宋体的子集按 GB2312 一级字库裁切，71 片 woff2、合计 163.3 KB，授权全文随字面交付：
`fonts/LICENSE-WenJinMincho.txt`。

## 四、本目录留存、但页面没有引用的照片（6 张）

这几张是 2026-10-17 至 10-19 之间 `prototypes/_build/assign-assets.mjs` 按题材交叉分配给本案的
（文件名前缀 `reuse-s10-` / `reuse-s14-` / `reuse-s18-` 就是来源）。**逐张目视核过之后本案没有引用它们**，
理由逐条记在 `assets/credits-unused.json` 的 `reason` 字段里，摘要如下：

| 文件 | 画面实际内容（目视核对） | 为什么不引用 |
| --- | --- | --- |
| `reuse-s10-rail-02-raw.jpg` | 停在站台的集装箱与罐式集装箱货车 | 规格字段 9(2) 明禁「火车、铁轨」图案；页脚也自述「本页不含蒸汽机车、钢轨或制服图形」 |
| `reuse-s14-cabin-04-telemetry-panel.jpg` | 1957 年 NACA 火箭试验台控制室，两名值班员、背光指示牌阵列 | 机制相通但年代与行业都在本案世界之外（1974 瑞士联邦铁路） |
| `reuse-s14-cabin-05-cockpit-1960s.jpg` | **不是座舱**：博物馆库房里悬挂的红白蓝条纹特技机（Pennzoil Special, N18Y） | 与本案题材无任何自洽位置；文件名与内容不一致（记此备查） |
| `reuse-s14-cabin-10-panel-gauges.jpg` | 老旧商用客机驾驶舱仪表板 | 同上：另一个行业与年代 |
| `reuse-s14-plate-05-chipmunk-cockpit.jpg` | 上一张 Pennzoil Special 的灰度版 | 题材不符；且本目录 `credits.json` 里**没有可核对的许可与作者**（`page` 为空、`license` 写「见来源页」），按 CC 署名要求不能进页面 |
| `reuse-s18-nasa-kennedy-space-center-fla-during-pow.jpg` | 2003 年发现号检修舱内技师伸手扳动旋钮开关 | 动作同构，但行业与年代在外；画面里的线束与玻璃座舱屏与本案语言相冲 |

**记在案的缺口**：这 6 张里没有一张是「瑞士联邦铁路越障值班室的行车日志（Zugfolgeblatt）」本身，
本案最贴题材的两张（`pl-04` 值班室内景、`pl-05` 1908 年站场图版）分别来自苏格兰 Leadhills 与
美国 Erie 铁路的工程书。**这是题材缺口，不假装对上了。**
