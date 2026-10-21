# 30 — 素材完整性与许可审查

> 审查员：素材完整性与许可审查员（独立重跑）
> 工作目录：`D:\Web\style`
> 焦点：① 备好但没接线的素材；② 许可风险（第三方照片被当成可随仓库转授的资产）
> 状态：骨架已建，逐批追加中

## §0 方法与范围

### 0.1 扫了什么

| 层 | 数量 | 字节 | 是否本次判定对象 |
| --- | --: | --: | --- |
| 30 个原型 × 被引用源文件（`index.html` + `style.css`，另加 S03 的 `check-palette.mjs`/`make-masks.mjs`/`verify.mjs`、S07 的 `app.js`、S13 的 `_fillmap.mjs`） | **65 个** | 1,626,290 | 是（"被引用"的判定语料） |
| 30 个原型 `assets/`（含 `assets/_raw`、`assets/source`、`assets/origin`、`assets/raw`、`assets/fonts`） | 482 个 | 88,681,286 | 是 |
| 其中图像文件（`assets/**` + 案例根目录，排除 `_cand`） | **398 个** | — | 是（逐文件判引用） |
| `assets/_cand/`（仅 S21） | 29 个 | 9,195,257 | 另列（§1.3 候选池判定） |
| `build/` 中间产物（30 案合计） | 244 个 | 60,268,698 | 否（中间层，见 §9.4） |
| `.inspect/` 渲染截图（30 案合计） | 310 个 | 54,886,299 | 否（取证层，见 §9.4） |
| `prototypes/_fonts/css/*.css` | 48 个 | — | 是（§7） |
| `prototypes/_fonts/files/**` 字体分片 | 871 个 | 30,324,228 | 是（§7） |
| `templates/M01..M03`（`index.html`/`style.css`/`README.md`/`TOKENS.md`） | 12 个 | 200,717 | 是（§6） |

覆盖：**30 / 30 案**，398 / 398 张图像逐文件判定，48 / 48 个字体样式表逐文件核头，3 / 3 个模板逐文件核。

### 0.2 判"被引用"的方法（可复现）

脚本：`_crit7b/xref3.mjs`（最终版），语料 = 上表第 1 行的 65 个文件拼接。

**引用记号抽取**（这是最容易误报的一步，所以写全）：

```js
// 1) 任何位置出现的 url(...) —— 覆盖 CSS background-image、border-image、mask-image、list-style-image、@font-face src
/\burl\(\s*(['"]?)([^'")]+)\1\s*\)/gi
// 2) 属性值 —— 覆盖 <img src>、<source srcset>、<link href>、<img srcset>、<video poster>、meta[content]
/\b(?:src|srcset|data-src|poster|content|href|data-bg|imagesrcset)\s*=\s*(['"])([^'"]*)\1/gi
    → 按 /[,\s]+/ 切成分项，再去掉尾部的 ` 300w` / ` 2x`
// 3) 内联 style="…" 的属性体，再在体内跑一遍 (1) —— 覆盖 style="--torn:url('assets/x.webp')"
/\bstyle\s*=\s*(['"])([^'"]*)\1/gi
// 4) 兜底：再收一遍所有引号字符串
/['"`]([^'"`\n]{2,299})['"`]/g
```

**判定**：某图像文件的相对路径（`assets/xxx.png`，同时接受 `./assets/xxx.png`、`/assets/xxx.png`）出现在记号集合里 → `YES`；仅当该 basename 在本案内唯一时，`xxx.png` 也接受。
未命中则退一步：若存在**同 stem 不同扩展名**的记号 → `SIBLING`，若只存在含 stem 的任意字符串 → `STEMONLY`，否则 `NO`。**只有 `YES` 才算接线**，`SIBLING`/`STEMONLY`/`NO` 全部计入 §1。

**第 2 道独立验证**：对每个 `NO` 的文件，再单独 `Select-String` 全案源码找它的 basename，人工看上下文（见 §1.2 的逐条反例）。

**为什么方法要写这么细**：第一版脚本用"`url(...)` 或引号字符串"单条正则，漏判了 **S04 的 9 处内联 `style="…url('assets/torn-edge-*.webp')"`** 和 **S05 `style.css:238` 的第二个 `url()`**——引号字符串分支会先吃掉 `style="` 到下一个 `"` 的整段，把里面的 `url()` 一起吞掉。这类漏判会直接制造 9 个假"未引用"，所以最终版把内联 style 单独再扫一遍，`SIBLING` 也单独归类而不是直接算未引用。

### 0.3 本次审查的边界

- **不核网上原始出处。** 本环境直连外网基本不通（`prototypes/_CONTRACT.md` §10 记录：`commons.wikimedia.org` / `upload.wikimedia.org` 10 发 0 中；`archive.org`、`openverse`、`duckduckgo` 超时；`loc.gov`/`picryl`/`pexels`/`pixabay` 403）。所以本次**只核仓库内部申报链条是否自洽**：`credits.json` → `CREDITS.md` → 实际引用的磁盘文件，三者能否对上。**不判断某个 Commons 文件页上的许可标注本身是否真实**（那需要联网，且属于另一层问题）。
- 尺寸/字节用 Pillow 实测（`_crit7b/dims.py`），**426 行**图像记录；重复文件用 SHA-1（`_crit7b/dupe.mjs`）。
- 未改动任何原型、模板、脚本、README、既有 deliverables。临时脚本全部落在 `_crit7b/`。

---

## §1 未引用素材全库清单

**总数：111 个文件 / 38,486,266 B（36.7 MiB）**，分布在 **14 / 30 案**。
判据见 §0.2；`NO` = 完全没有任何引用；`STEMONLY` = 源码里只出现过它的名字符串、没有任何路径形态。

**先记两条状态：**

- **S21 已修**（如实记）：它此前真实图片数为 0，现在 `index.html` 用 `<img srcset="…">` 接上了 `assets/_cand/` 里 6 张对题照片（真实图片 **0 → 6**），`CREDITS.md:14-30` 有完整 6 行许可表，`assets/credits-unused.json`（4,651 B）专为 6 张留存未用的照片逐张写了 `reason`。**S21 仍是"未引用 18 个"，但那 18 个全部已在账上**（12 个 AVIF 在 `CREDITS.md:38` 明写"页面不引用"并给出实测理由、6 个 `reuse-*` 在 `credits-unused.json` 有 reason）。详见 §1.2 与 §1.3。
- **S12 的"未引用 1 个"也是已声明的**（`CREDITS.md:27` 写"16×16 **备用**印纹"）。**所以严格意义上，111 个未引用项里，只有 82 个是"未接线且没有任何说明"**（111 − S02 的 17 − S01 的 1 − S06 的 8 − S12 的 1 − S21 的 18 = 66；若把 S05/S09/S10/S13/S15 的"原始池已说明用途"也算上（6+8+6+5+6 = 31），则剩 35 个）。这个口径一并在 §1.5 给清楚。

> 说明：本节**只统计 `assets/**` 与案例根目录下的图像**。`build/` 中间产物（244 个 / 60.3 MB）与 `.inspect/` 截图（310 个 / 54.9 MB）按设计就不是交付层，未计入——但 `assets/_raw/`、`assets/source/`、`assets/origin/`、`assets/raw/` 这四类**位于 assets/ 内部**的原始池计入了，因为它们和被引用的成品混在同一个交付目录里，是对"许可链条"最有杀伤力的一类（见 §3 R-04）。


### 1.1 全库清单（逐文件）

#### S01-red-wedge-broadsheet — 1 个 / 74,288 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/halftone-07-mergenthaler.png` | 74,288 | 1080×1293 | NO（无任何引用） | NO | YES |

#### S02-gilded-symmetry-salon — 17 个 / 5,373,759 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/_raw/garnier-staircase.jpg` | 699,957 | 1920×1532 | STEMONLY（只有同名字符串，非路径） | YES | YES |
| `assets/_raw/gold-tooled-cover.jpg` | 548,482 | 1920×1446 | STEMONLY（只有同名字符串，非路径） | YES | YES |
| `assets/_raw/ormolu-gilt-bronze.jpg` | 1,561,461 | 1920×2756 | STEMONLY（只有同名字符串，非路径） | YES | YES |
| `assets/_raw/paris-1925-expo.jpg` | 1,156,832 | 1920×2939 | STEMONLY（只有同名字符串，非路径） | YES | YES |
| `assets/_raw/silver-gilt-case.jpg` | 326,411 | 1920×1280 | STEMONLY（只有同名字符串，非路径） | YES | YES |
| `assets/card-fiber.png` | 33,430 | 192×192 | NO（无任何引用） | NO | YES |
| `assets/foil-grain.png` | 23,878 | 192×192 | NO（无任何引用） | NO | YES |
| `assets/foil-plate@1x.png` | 30,118 | 900×1260 | NO（无任何引用） | NO | YES |
| `assets/hall-01-garnier.jpg` | 221,526 | 1280×1021 | NO（无任何引用） | NO | YES |
| `assets/hall-02-ormolu.jpg` | 186,759 | 892×1280 | NO（无任何引用） | NO | YES |
| `assets/hall-03-case.jpg` | 99,985 | 1280×853 | NO（无任何引用） | NO | YES |
| `assets/hall-04-expo1925.jpg` | 156,191 | 836×1280 | NO（无任何引用） | NO | YES |
| `assets/hall-05-tools.jpg` | 119,821 | 1280×964 | NO（无任何引用） | NO | YES |
| `assets/leak-gap@2x.png` | 27,613 | 520×360 | NO（无任何引用） | NO | YES |
| `assets/leak-patch@2x.ivory-backup.png` | 26,958 | 520×360 | NO（无任何引用） | NO | NO |
| `assets/salon-plate@1x.png` | 47,899 | 700×1500 | NO（无任何引用） | NO | YES |
| `assets/salon-plate@2x.png` | 106,438 | 1400×3000 | NO（无任何引用） | NO | YES |

#### S04-mango-collage-wall — 13 个 / 1,864,936 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/plate-01.png` | 229,166 | 640×800 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/plate-02.png` | 175,819 | 560×700 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/plate-03.png` | 166,634 | 700×520 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/plate-04.png` | 151,426 | 520×660 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/plate-05.png` | 151,002 | 600×600 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/plate-06.png` | 124,578 | 620×480 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/plate-07.png` | 198,901 | 580×740 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/plate-08.png` | 164,050 | 660×560 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/plate-lead.png` | 376,248 | 820×1000 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/torn-edge-1.png` | 38,331 | 560×700 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/torn-edge-2.png` | 33,230 | 470×620 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/torn-edge-3.png` | 31,621 | 620×470 | STEMONLY（只有同名字符串，非路径） | NO | YES |
| `assets/torn-edge-4.png` | 23,930 | 400×400 | STEMONLY（只有同名字符串，非路径） | NO | YES |

#### S05-pixel-cold-storage-console — 6 个 / 1,586,877 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/source/colddoor.jpg` | 217,532 | 960×1280 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/source/coolingtower.jpg` | 391,179 | 1280×853 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/source/engineers.jpg` | 308,630 | 1280×915 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/source/factory1911.jpg` | 192,296 | 1280×802 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/source/hvac.jpg` | 246,984 | 1280×855 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/source/pallets.jpg` | 230,256 | 1280×853 | STEMONLY（只有同名字符串，非路径） | YES | STEM |

#### S06-showa-kissaten-ledger — 8 个 / 4,427,795 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/cursor-spoon.png` | 1,434 | 40×40 | NO（无任何引用） | NO | YES |
| `assets/origin/beans-roasting.jpg` | 182,876 | 1920×1280 | NO（无任何引用） | YES | YES |
| `assets/origin/cup-and-saucer.jpg` | 396,554 | 1920×1280 | NO（无任何引用） | YES | YES |
| `assets/origin/hand-grinder.jpg` | 644,512 | 1920×1440 | NO（无任何引用） | YES | YES |
| `assets/origin/kissaten-counter.jpg` | 986,757 | 1920×1440 | NO（无任何引用） | YES | YES |
| `assets/origin/ledger-paper.jpg` | 1,102,407 | 1920×1452 | NO（无任何引用） | YES | YES |
| `assets/origin/siphon-coffee.jpg` | 472,178 | 1920×1440 | NO（无任何引用） | YES | YES |
| `assets/origin/vinyl-turntable.jpg` | 641,077 | 1920×2114 | NO（无任何引用） | YES | YES |

#### S07-slate-ink-contents — 2 个 / 2,284,834 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/src-1902-page.jpg` | 1,294,517 | 1966×2800 | NO（无任何引用） | NO | YES |
| `assets/src-sample-page.jpg` | 990,317 | 1943×2800 | NO（无任何引用） | NO | YES |

#### S09-batik-price-board — 8 个 / 7,140,055 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/raw/city-kiosk.jpg` | 541,824 | 1920×1275 | NO（无任何引用） | YES | YES |
| `assets/raw/pattern-batik-cloth.jpg` | 1,240,979 | 1920×2644 | NO（无任何引用） | YES | YES |
| `assets/raw/shop-owner-bench.jpg` | 505,436 | 1920×1441 | NO（无任何引用） | YES | YES |
| `assets/raw/shop-shoe-repair.jpg` | 693,320 | 1920×1582 | NO（无任何引用） | YES | YES |
| `assets/raw/sign-hand-painted.jpg` | 1,717,993 | 1920×2560 | NO（无任何引用） | YES | YES |
| `assets/raw/stock-market-stall.jpg` | 1,498,497 | 1920×2560 | NO（无任何引用） | YES | YES |
| `assets/raw/stock-shoe-lasts.jpg` | 461,745 | 1920×1440 | NO（无任何引用） | YES | YES |
| `assets/raw/worker-brush.jpg` | 480,261 | 1920×1153 | NO（无任何引用） | YES | YES |

#### S10-grid-versus-sheet — 6 个 / 2,906,320 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/port-01-raw.jpg` | 397,870 | 1280×899 | NO（无任何引用） | STEM | YES |
| `assets/rail-02-raw.jpg` | 257,438 | 1280×884 | NO（无任何引用） | STEM | YES |
| `assets/road-04-raw.jpg` | 149,839 | 1280×882 | NO（无任何引用） | STEM | YES |
| `assets/ship-06-raw.jpg` | 333,037 | 1280×902 | NO（无任何引用） | STEM | YES |
| `assets/steel-05-raw.jpg` | 1,460,414 | 1280×960 | NO（无任何引用） | STEM | YES |
| `assets/store-03-raw.jpg` | 307,722 | 1280×853 | NO（无任何引用） | STEM | YES |

#### S12-lime-knockout-wall — 1 个 / 124 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/stripe-45-tile.png` | 124 | 16×16 | NO（无任何引用） | NO | YES |

#### S13-blind-debossed-dispatch — 5 个 / 2,873,877 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/src-embossstamp.jpg` | 330,455 | 1920×1280 | NO（无任何引用） | YES | YES |
| `assets/src-paraguay.jpg` | 1,195,632 | 1920×1440 | NO（无任何引用） | YES | YES |
| `assets/src-shelving.jpg` | 406,988 | 1920×1285 | NO（无任何引用） | YES | YES |
| `assets/src-storagebw.jpg` | 322,665 | 1920×1080 | NO（无任何引用） | YES | YES |
| `assets/src-washi.jpg` | 618,137 | 1920×1440 | NO（无任何引用） | YES | YES |

#### S14-zero-g-launch-sequence — 19 个 / 5,198,945 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/cabin-01-apollo-interior.jpg` | 247,606 | 1280×1280 | NO（无任何引用） | YES | YES |
| `assets/cabin-02-cabin-stowage.jpg` | 716,045 | 1280×1846 | NO（无任何引用） | YES | YES |
| `assets/cabin-03-flight-checklist.jpg` | 314,698 | 1280×780 | NO（无任何引用） | YES | YES |
| `assets/cabin-04-telemetry-panel.jpg` | 252,859 | 1280×960 | NO（无任何引用） | YES | YES |
| `assets/cabin-05-cockpit-1960s.jpg` | 407,990 | 1280×1574 | NO（无任何引用） | YES | YES |
| `assets/cabin-06-watch-dial.jpg` | 266,033 | 1280×857 | NO（无任何引用） | YES | YES |
| `assets/cabin-07-mission-control.jpg` | 316,720 | 1280×833 | NO（无任何引用） | YES | YES |
| `assets/cabin-08-switch-panel.jpg` | 135,895 | 1280×855 | NO（无任何引用） | YES | YES |
| `assets/cabin-09-test-console.jpg` | 161,288 | 1280×1024 | NO（无任何引用） | YES | YES |
| `assets/cabin-10-panel-gauges.jpg` | 251,030 | 1280×853 | NO（无任何引用） | YES | YES |
| `assets/cabin-11-spacecraft-hatch.jpg` | 323,536 | 1280×853 | NO（无任何引用） | YES | YES |
| `assets/cabin-12-pilot-watch.jpg` | 284,145 | 1280×1707 | NO（无任何引用） | YES | YES |
| `assets/foil-edge-sample.png` | 408 | 160×160 | NO（无任何引用） | NO | YES |
| `assets/pad-01-saturn-v-launch.jpg` | 571,339 | 1280×1861 | NO（无任何引用） | YES | YES |
| `assets/pad-02-umbilical-tower.jpg` | 404,365 | 1280×1594 | NO（无任何引用） | YES | YES |
| `assets/plate-04-airliner-instruments.jpg` | 119,567 | 1000×667 | NO（无任何引用） | NO | YES |
| `assets/plate-06-dragon-interior.jpg` | 133,812 | 1000×667 | NO（无任何引用） | NO | YES |
| `assets/plate-08-construction-log.jpg` | 114,565 | 1000×667 | NO（无任何引用） | NO | YES |
| `assets/plate-12-watch-macro.jpg` | 177,044 | 1000×1334 | NO（无任何引用） | NO | YES |

#### S15-fishery-floor-ledger — 6 个 / 2,863,392 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/source/fishery-01-boat.jpg` | 627,773 | 1280×1707 | NO（无任何引用） | YES | YES |
| `assets/source/fishery-02-nets.jpg` | 473,500 | 1280×960 | NO（无任何引用） | YES | YES |
| `assets/source/fishery-03-harbour.jpg` | 345,044 | 1280×720 | NO（无任何引用） | YES | YES |
| `assets/source/fishery-04-plan.jpg` | 174,236 | 1280×983 | NO（无任何引用） | YES | YES |
| `assets/source/fishery-05-stockfish.jpg` | 351,213 | 1280×914 | NO（无任何引用） | YES | YES |
| `assets/source/fishery-06-chart.jpg` | 891,626 | 1280×2177 | NO（无任何引用） | YES | YES |

#### S16-velocity-slant-manifesto — 1 个 / 69,345 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/plate-07-marinetti.png` | 69,345 | 500×729 | NO（无任何引用） | STEM | NO |

#### S21-interlocking-release-book — 18 个 / 1,821,719 B

| 文件 | 字节 | 尺寸 | 引用判定 | credits.json | CREDITS.md |
| --- | --: | --- | --- | --- | --- |
| `assets/pl-01-p.avif` | 4,681 | 278×105 | STEMONLY（只有同名字符串，非路径） | STEM | NO |
| `assets/pl-01.avif` | 37,110 | 909×342 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/pl-02-p.avif` | 9,734 | 278×208 | STEMONLY（只有同名字符串，非路径） | STEM | NO |
| `assets/pl-02.avif` | 22,639 | 431×323 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/pl-03-p.avif` | 8,666 | 278×208 | STEMONLY（只有同名字符串，非路径） | STEM | NO |
| `assets/pl-03.avif` | 20,002 | 431×323 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/pl-04-p.avif` | 9,367 | 278×208 | STEMONLY（只有同名字符串，非路径） | STEM | NO |
| `assets/pl-04.avif` | 20,884 | 431×323 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/pl-05-p.avif` | 9,071 | 278×157 | STEMONLY（只有同名字符串，非路径） | STEM | NO |
| `assets/pl-05.avif` | 43,225 | 656×370 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/pl-06-p.avif` | 9,582 | 278×185 | STEMONLY（只有同名字符串，非路径） | STEM | NO |
| `assets/pl-06.avif` | 46,101 | 656×437 | STEMONLY（只有同名字符串，非路径） | YES | STEM |
| `assets/reuse-s10-rail-02-raw.jpg` | 257,438 | 1280×884 | NO（无任何引用） | YES | YES |
| `assets/reuse-s14-cabin-04-telemetry-panel.jpg` | 252,859 | 1280×960 | NO（无任何引用） | YES | YES |
| `assets/reuse-s14-cabin-05-cockpit-1960s.jpg` | 407,990 | 1280×1574 | NO（无任何引用） | YES | YES |
| `assets/reuse-s14-cabin-10-panel-gauges.jpg` | 251,030 | 1280×853 | NO（无任何引用） | YES | YES |
| `assets/reuse-s14-plate-05-chipmunk-cockpit.jpg` | 205,423 | 1000×1230 | NO（无任何引用） | YES | YES |
| `assets/reuse-s18-nasa-kennedy-space-center-fla-during-pow.jpg` | 205,917 | 1280×834 | NO（无任何引用） | YES | YES |

**S03 / S08 / S11 / S17 / S18 / S19 / S20 / S22 / S23 / S24 / S25 / S26 / S27 / S28 / S29 / S30：未引用 0 个。**
其中 S08 的 `assets/reg-cursor.svg`（199 B）被引用但 `CREDITS.md` 里没有对应行（§2 D-4）；S15 的 `assets/photo-01-boat.jpg`…`photo-06-chart.jpg` 被引用但 `CREDITS.md` 里没有任何一行（§2 D-1）——**这两组是"接线了但链条断"**，不是"没接线"，所以不出现在本表。

### 1.2 逐案判读：这些文件"本该用于什么"

| 案 | 未引用项 | 性质 | 本该用于什么（可核实的判断依据） |
| --- | --- | --- | --- |
| **S01** | `halftone-07-mergenthaler.png` 74,288 B | **已在 CREDITS.md 里如实标为"备用"** | CREDITS.md 第 20 行该行"页面里用在哪"列写的是 `—（备用）`。这是全库唯一一处把未引用项**明确标注**的案例。**不用改。** |
| **S02** | 5 张 `assets/_raw/*.jpg` 共 4,293,143 B + 12 个成品 1,080,616 B | **已如实登记（全库最完整的一处）** | `CREDITS.md:51-65` 有专门一节「3. 并行构建留下的备用位图（本页**未引用**，保留以便比对）」，把这 11 个文件按生成器分两组点名列出（`salon-plate@1x/@2x`、`card-fiber`、`foil-grain`、`leak-gap@2x` 由 `build/make-salon-assets.py`；`hall-01..05` 由 `build/bake-duotone.py` 从同 5 张 Commons 原图另做一套双色调），并写明"许可同第 1 节"。`_raw/` 也在 `:27-35` 用代码块逐条列了 `_raw/xxx.jpg ← Commons 文件名` 的对应。**不用改。**（唯一零碎：`leak-patch@2x.ivory-backup.png` 26,958 B 没进这两节，见 R-10。） |
| **S04** | 9 个 `.png` 共 1,580,038 B + 4 个 `torn-edge-*.png` 共 127,112 B | **`.png` 是无用的回退版** | `index.html` 只写 `src="assets/plate-0N.webp"`、`--torn:url('assets/torn-edge-N.webp')`，**全库没有一处 `<picture>`/`<source>`**，所以同名 `.png`（合计 1.7 MB，是 `.webp` 的 3.2 倍）根本没有加载路径。`plate-0N` 本该是 9 个印版槽位，`.webp` 已经接上，`.png` 是死重。 |
| **S05** | 6 张 `assets/source/*.jpg` 共 1,586,877 B | **已在 CREDITS.md 正文首段写明用途** | `CREDITS.md:3` 原文：「构建期下载到 `assets/source/`（**存档原图，不参与渲染**）」——用途说清了。零碎项：这 6 个文件没有单独成行，所以"页面里用在哪"这个字段级结论仍然缺（S01/S06 有）。 |
| **S06** | 7 张 `assets/origin/*.jpg` 共 4,426,361 B + `cursor-spoon.png` 1,434 B | **原始池留在交付层 + 1 个光标** | CREDITS.md §1 已说明"原稿保存在 `assets/origin/`（未经处理，仅供复核分色是否忠实）"，§2 也明确写了 `cursor-spoon.png` "**当前页面未引用，留在盘上备查**"。**这是全库第二处如实标注的未引用项。** `origin/` 的用途是复核分色忠实度，属有意保留。 |
| **S07** | `src-1902-page.jpg` 1,294,517 B + `src-sample-page.jpg` 990,317 B | **原始扫描件留在交付层** | 页面引用的是 7 张 `plate-*.jpg`（100 线网点转印版），`src-*` 是它们的源扫描。命名前缀 `src-` 与 S13 一致。 |
| **S09** | 8 张 `assets/raw/*.jpg` 共 7,140,055 B | **原始池留在交付层** | 页面引用 `plate-0N-*.png` 成品；`raw/` 是 1920px 原图。 |
| **S10** | 6 张 `*-raw.jpg` 共 2,906,320 B | **原始池留在交付层** | 页面引用 6 张 `halftone-*.png`；`credits.json` 用 `file`（成品）+ `raw`（原图）双字段登记，链条完整；`CREDITS.md` 首节标题即「位图（随页面发布）」。**不用改。** |
| **S12** | `stripe-45-tile.png` 124 B | **已在 CREDITS.md 里标成"备用"** | `CREDITS.md:27` 原文（内部竖线已转义）：「\`assets/stripe-45-tile.png\` \| Pillow 绘制的 16×16 **备用**印纹（页面正式的斜纹走 CSS `data:image/svg+xml` 的 SVG pattern）」。16×16 的 45° 条纹平铺块，被 CSS 内联 SVG pattern 取代。**不用改。** |
| **S13** | 5 张 `src-*.jpg` 共 2,873,877 B | **原始池留在交付层** | 页面引用 5 张 `plate-*.jpg` 成品（`plate-laid-paper.jpg` 等），每张都在 `index.html` 里有 `<span class="plate__credit">` 逐张署名。`src-*` 是成品之前的一步。 |
| **S14** | 12 张 `cabin-*.jpg` 共 3,604,806 B + `pad-01/02` 975,704 B + 4 张 `plate-04/06/08/12` 544,988 B + `foil-edge-sample.png` 408 B = 19 个 / 5,125,906 B | **已登记许可，但状态字段是"待页面引用（index.html 未落盘）"的陈旧占位** | `CREDITS.md` 里 **28 处**写着「待页面引用（index.html 未落盘）」：§一 14 行（`cabin-01..12` + `pad-01/02`，每行都有原件文件页/权利人/许可/源图像素）＋ §二 14 行（`plate-01`…`plate-14` ↔ `cabin-*` 的映射表，每行都有署名）。**即：许可账是全的，"未引用"这个状态只是没被刷新**——不再刷新就无法区分"页面在用的"和"留档的"（§3 R-17，与 S15 同款缺陷）。`foil-edge-sample.png`（408 B）在 §三 有行（`make-plates.py: foil_edge_sample()`）。 |
| **S15** | 6 张 `assets/source/*.jpg` 共 2,863,392 B | **原始池留在交付层** | 页面引用 `photo-0N-*.jpg`（双色阶成品）；`source/` 是抓取件。 |
| **S16** | `plate-07-marinetti.png` 69,345 B | **第 7 张图版未接线** | CREDITS.md 第 8 行明写"本页实际引用 6 张"并列出 6 个文件名，第 7 张不入表——**如实声明了，但文件还在 `assets/` 里**，且 `build/raw/plate-07-marinetti.jpg`（37,187 B）也在。 |
| **S21** | 12 个 `.avif` 共 203,930 B + 6 张 `reuse-*` 共 1,580,657 B | **已如实登记** | `.avif`：CREDITS.md 第 38 行明确写"**页面不引用**"，并给出技术理由（Pillow 的 AVIF 写不了 `lossless=True`，1440 档 1:1 渲染从 2 色变 244 色；6 张 AVIF 合计 184 KB 是 WebP 57 KB 的 3.2 倍）。这 12 个文件是"规格要求产出、页面按质量否决"的结果，**属已决策而非遗漏**。`reuse-*` 6 张：由专门的 `assets/credits-unused.json` 登记，`reason` 字段逐张写了不引用的理由。**这是全库登记最完整的一处。** |

### 1.3 S21 的 `assets/_cand/` 28 张：候选池，不是未引用项 —— 判据

**我的判定标准（三条同时满足才算"候选池"，否则算"未引用"）：**

1. **目录被显式命名为池子**且与交付层分离（`_cand` 前缀下划线，同 S21 的 `assets/credits-unused.json` 里也复用它）；
2. **有一份机器可读的池子清单**，逐张记 `file / title / artist / license / page`（即许可可核对）；
3. **交付层不引用它，且引用它的成品有可追溯映射**（本案是 `credits.json` 每行的 `candidate` 字段）。

**核对结果：**

- `assets/_cand/` = 28 个 `.jpg` / 9,174,533 B + `candidates.json` 20,724 B + `_fetch.log` 2,122 B。
- `candidates.json` 覆盖 **27 / 28** 张（`sheet.jpg` 176,495 B 未登记，**1 处漏记**）。
- **6 张被采用的照片（`interlock-2.jpg`、`hebelbank-2.jpg`、`blockinstr-1.jpg`、`relay-3.jpg`、`plate-1.jpg`、`stellwerk-2.jpg`）全部在 `candidates.json` 里，且 `credits.json` 每行都带 `candidate` 字段指回池子**（例：`pl-01.webp` → `"candidate": "interlock-2.jpg"`）。映射双向可查。
- 补充：**这个池子是本环境图源断供前（2026-10-18 04:16–04:42）唯一一批对题的真图**，CREDITS.md 顶部把这个窗口和 `assets/fetch-assets.ps1` 写清楚了。

**结论：判为候选池，不计入 §1 的"未引用"，但记 1 处缺陷**（`sheet.jpg` 176,495 B 无许可记录）。**同时它暴露一个真问题**：这批 28 张里只有 6 张进了页面，剩下 22 张（约 7.0 MB）带可核对许可的对题素材被搁置——CREDITS.md 只解释了"哪 6 张进"，没解释"为什么另外 22 张不进"。若图源断供还会持续，**这个池子是全库最有价值的存量，应在 CREDITS.md 里加一句"其余 22 张为何弃用"**（S21 已经为 6 张 `reuse-*` 写了 reason，标准不一样）。

### 1.4 按案分布汇总

| 案 | 未引用个数 | 未引用字节 | 占比 |
| --- | --: | --: | --: |
| S01 | 1 | 74,288 | 0.19% |
| S02 | 17 | 5,373,759 | 13.96% |
| S04 | 13 | 1,864,936 | 4.85% |
| S05 | 6 | 1,586,877 | 4.12% |
| S06 | 8 | 4,427,795 | 11.50% |
| S07 | 2 | 2,284,834 | 5.94% |
| S09 | 8 | 7,140,055 | 18.55% |
| S10 | 6 | 2,906,320 | 7.55% |
| S12 | 1 | 124 | 0.00% |
| S13 | 5 | 2,873,877 | 7.47% |
| S14 | 19 | 5,198,945 | 13.51% |
| S15 | 6 | 2,863,392 | 7.44% |
| S16 | 1 | 69,345 | 0.18% |
| S21 | 18 | 1,821,719 | 4.73% |
| **合计** | **111** | **38,486,266** | 100% |

**结构读法**（这三条是本节真正的结论，不是"数字罗列"）：

1. **38.5 MB 里约 28.4 MB 是"原始池"，性质是设计选择而非遗漏。** S02 `_raw/`（4,293,143 B）、S05 `source/`（1,586,877 B）、S06 `origin/`（4,426,361 B）、S07 `src-*`（2,284,834 B）、S09 `raw/`（7,140,055 B）、S10 `*-raw`（2,906,320 B）、S13 `src-*`（2,873,877 B）、S15 `source/`（2,863,392 B）= **28,374,859 B（占全部未引用的 73.7%）**。它们的问题是**位置**，不是**存在**：它们在 `assets/` 内部，所以任何"把 assets/ 当交付物"的下游都会把 1920px 的第三方原图和成品一起搬走。**这是 §3 的 R-04。**
2. **真正的"做成两套、只用一套"只有 S04（1,707,150 B 无用 `.png` 回退版）和 S21（203,930 B 被否决的 `.avif`）。** 这两处都不是"没做完"，但 S04 的 `.png` 是纯粹的体积浪费——**全库没有任何 `<source type="image/png">`**。
3. **整批"备了没接"最大的一处是 S14：12 张 `cabin-*` + 2 张 `pad-*` + 4 张跳号 `plate-*` + 1 张 `foil-edge-sample.png` = 19 张 / 5,125,906 B。** 但它的**许可账是全的**（§一 14 行 + §二 14 行映射），且其派生件 `reuse-s14-cabin-04/05/10` + `reuse-s14-plate-05` 还出现在 S20/S21 的 `credits.json` 里且带完整许可——**说明这批是"给全库复用的公共池"误放在了 S14 的交付目录里**，不是 S14 没做完。这个判断可以反证：S21 的 `credits-unused.json` 明确写了 `reuse-s14-plate-05-chipmunk-cockpit.jpg` 的画面对不上题材（"不是座舱：博物馆库房里悬挂的红白蓝条纹特技机 Pennzoil Special, N18Y"）——**放着不用是有理由的，而且理由已被写下。**


### 1.5 三级口径（把"未接线"和"没交代"分开）

对抗"没接线不等于没做完"的正确做法不是否认 111 这个数，而是**把它拆成三档**，因为这三档要改的东西完全不同：

| 档 | 定义 | 个数 | 字节 | 要改什么 |
| --- | --- | --: | --: | --- |
| **A. 未接线且账上无"备用/留档"字样** | 引用判定 ≠ YES，且 `CREDITS.md` 里**没有**"备用/未引用/不参与渲染/留档/仅供复核"之类的字样 | **14** | 1,891,894 左右 | 要么接线，要么在 `CREDITS.md` 里加一行状态。 |
| **B. 未接线但已声明用途** | 原始池（`_raw`/`source`/`origin`/`src-*`/`*-raw`）——用途写在 CREDITS.md 的章节标题或正文里 | **45** | 28,374,859 | 只需考虑搬出 `assets/`（R-04）。**账目是对的。** |
| **C. 未接线且已声明为备用/否决，或许可已登记但状态字段陈旧** | S01 `halftone-07`（"（备用）"）、S02 的 11 个（`## 3. …本页未引用…`）、S06 `cursor-spoon.png`（"当前页面未引用，留在盘上备查"）、S12 `stripe-45-tile.png`（"16×16 备用印纹"）、S21 的 12 个 AVIF（"页面不引用"+实测理由）与 6 个 `reuse-*`（`credits-unused.json` 逐张 reason）、**S14 的 19 个（许可与映射齐全，状态字段写"待页面引用（index.html 未落盘）"）** | **52** | 8,219,513 | **不用改素材**；S14 那 19 个只需把状态字段刷新成"备用/未引用"（R-17）。 |

A 档的 14 个构成：S04 的 13 个（全部——该案 `CREDITS.md` 把生成物错列在"真实照片"下，没有任何"备用"字样；`.png` 与 `.webp` 各 9+4，加载的是 `.webp`）、S16 的 1 个（`plate-07-marinetti.png`，CREDITS.md 只说"本页实际引用 6 张"、没对这一张写状态）。加 S02 的 `leak-patch@2x.ivory-backup.png` 与 S09 的 2 个（有许可记录但无"未引用"字样）则到 17。

**所以对"成品完成度辩护员"的回应是：111 里 97 个（B+C）我承认是设计选择或已登记的留档，14 个（A）是真正需要处理的**；而这 14 个里 13 个是 S04 一处（且 S04 是全库唯一把生成物说成照片的案子，属"说错了"而不是"没做完"）。**素材完整性这一侧因此没有致命项——致命项全在许可那一侧（§2、§3）。**

---

## §2 许可链条核对表

判定语料：`assets/credits*.json`（机器可读，BOM 容忍读法见 §9.5）→ `assets/CREDITS.md`（人可读）→ §1/§0.2 判定的**实际被引用文件**。
三方对上 = `OK`；任一方缺失或指向不存在的文件 = `BREAK`。

### 2.1 逐案链条状态

| 案 | `assets/credits.json` | 大小 | 机器可读行数 | `assets/CREDITS.md` | 大小 | 被引用位图 | 链条 | 对不上的具体文件 |
| --- | --- | --: | --: | --- | --: | --: | --- | --- |
| S01 | **无**（只有 `build/raw/credits.json` 4,739 B / `build/raw-s01/credits.json` 495 B） | — | 7+1 | 有逐张表（8 行，含 原件页/权利人/许可/原始像素） | 4,868 | 9 | **OK（MD 层）** | 机器可读层不在 `assets/`，产出件↔原件映射只存在于 MD |
| S02 | `credits.json` | 2,206 | 5 | 有 | 6,913 | 9 | OK | — |
| S03 | `credits.json` | 7,075 | 8 | 有 | 2,425 | 10 | OK | `file` 用仓库相对路径 `prototypes/S03-…/assets/the-moon.jpg`，与全库其余用 basename 的约定不一致 |
| **S04** | **无** | — | 0 | **自述"未闭合的缺口"** | 1,824 | 13 | **BREAK** | 全部 13 个被引用文件（`plate-01.webp`…`plate-08.webp`、`plate-lead.webp`、`torn-edge-1..4.webp`）无作者、无许可、无来源 |
| S05 | `credits.json` | 25,412 | 6 | 有 | 3,839 | 10 | OK | `credits.json` 的 `file` 是 `colddoor.jpg`（裸名），磁盘上是 `assets/source/colddoor.jpg` + 成品 `assets/colddoor-dither.png`；桥只靠 MD |
| S06 | `credits.json` | 5,116 | 7 | 有完整 7 行表（成品↔原稿↔作者↔授权↔来源页↔原始文件直链） | 7,453 | 13 | OK | — |
| **S07** | **无** | — | 0 | **自述"未闭合的缺口"** | 1,320 | 9 | **BREAK** | 7 张被引用的 `plate-*.jpg`（`plate-masthead` 56,730 / `plate-column` 62,384 / `plate-detail` 98,027 / `plate-gravure` 68,942 / `plate-lower` 67,761 / `plate-ads` 77,302 / `plate-edge` 19,396）无作者、无许可、无来源 |
| **S08** | **无** | — | 0 | **自述"未闭合的缺口"，且分类错误** | 1,194 | 7 | **BREAK** | 6 个被引用 PNG（`overprint.png` 17,992 / `overprint-offset.png` 18,271 / `detail.png` 2,391 / `grime-macro.png` 36,232 / `grime.png` 9,023 / `print.png` 1,581）+ `reg-cursor.svg` 199 |
| S09 | `credits.json` | 8,998 | 8 | 有 | 6,192 | 16 | OK | — |
| S10 | `credits.json` 3,855 + `credits-extra.ndjson` 1,108 | — | 6 | 有 | 3,032 | 10 | OK | `credits-extra.ndjson` 是**未在任何文档里出现的第二份记录**（1,108 B） |
| S11 | `credits.json` **schema 不同** | 15,364 | 1（`images[]`/`textures[]`/`fonts[]` 三数组） | 有 | 15,843 | 11 | OK（MD 层） | `assets/credits.json` 不是行列表；真正的 7 行在 `build/raw/credits.json` 5,860 B |
| S12 | `credits.json` 4,684 + `build/raw/credits.json` 3,587 | — | 6+6 | 有 | 4,348 | 9 | OK | 两份 json 内容重复 |
| **S13** | `credits.json` 10,027（`value`/`Count` 聚合壳 + 2 行）+ **`credits.fetch.json` 6,359（5 行完整）** | — | 2+5 | **自述"未闭合的缺口"——但记录其实存在** | 1,391 | 10 | **BREAK（申报过度）** | 5 张 `plate-*.jpg` 的许可在 `index.html` 里逐张写着（Met Museum CC0），在 `credits.fetch.json` 里有 5 行；`src-*` 5 张则在 `credits.json` 的聚合壳里。**"缺口"是 `write-credits.mjs` 没识别 `credits.fetch.json` 造成的假缺口** |
| S14 | `credits.json` | 11,134 | 14 | 有 | 13,116 | 14 | OK | — |
| **S15** | `credits.json` | 5,889 | 6 | 有，但 **§二表头下 0 行数据**；§一 6 行"页面里用在哪"全写**"待页面引用（index.html 未落盘）"** | 8,944 | 12 | **BREAK** | 6 张**实际被引用**的成品 `assets/photo-01-boat.jpg` 545,496 / `photo-02-nets.jpg` 453,548 / `photo-03-harbour.jpg` 292,352 / `photo-04-plan.jpg` 195,291 / `photo-05-stockfish.jpg` 284,615 / `photo-06-chart.jpg` 944,846 —— **在 `CREDITS.md` 里完全没有对应行** |
| S16 | `credits.json` | 5,965 | 7 | 有（正确的 `.png` 表） | 3,636 | 8 | **BREAK（json 层）** | `credits.json` 的 `file` 写 `plate-0N-*.jpg`，磁盘上是 `plate-0N-*.png`（`.jpg` 只存在于 `build/raw/`）——**机器可读层指向不存在的文件** |
| **S17** | **无** | — | 0 | **自述"未闭合的缺口"** | 1,271 | 5 | **BREAK** | 5 张 `heritage-*.jpg`（63,709 / 66,865 / 319,203 / 401,125 / 54,387）。`index.html` 每张的 `<figcaption>` 写了 `Wikimedia Commons · 公有领域`，但**作者与原件链接两个字段在仓库内不存在** |
| S18 | `credits.json` | 4,264 | 6 | 有 | 4,446 | 9 | OK | — |
| S19 | `credits.json` | 3,695 | 6 | 有 | 3,871 | 9 | OK | `reuse-s24-reuse-s19-jean-feltgen-herbarium-sheet-p.jpg` 508,033 B 与同目录 `jean-feltgen-herbarium-sheet-phelipea-ramosa.jpg` 508,033 B **SHA-1 相同**（§3 R-12） |
| **S20** | `credits.json` | 3,355 | 6 | 有 | 3,868 | 9 | **BREAK** | `reuse-s14-plate-05-chipmunk-cockpit.jpg` 205,423、`reuse-s15-photo-06-chart.jpg` 944,846 —— 两行 `license` = `见来源页`、`artist` = `（原件未标注作者）`、`page` 为空 |
| S21 | `credits.json` 4,498 + `credits-unused.json` 4,651 | — | 6+6 | 有人工重写的完整表；**0 个外链**（明文说明"逐张原件页见 `assets/credits.json`"） | 8,269 | 14 | OK | `credits-unused.json` 里 `reuse-s14-plate-05-chipmunk-cockpit.jpg` 同样 `见来源页`/无 URL（该文件未被引用，故未进页面） |
| **S22** | `credits.json` | 2,717 | 6 | 有 | 3,337 | 9 | **BREAK** | 4 行缺来源：`reuse-s13-src-shelving.jpg` 406,988（见来源页）、`reuse-s13-src-washi.jpg` 618,137（见来源页）、`reuse-s25-plate2.jpg` 542,424（No restrictions）、`reuse-s25-plate4.jpg` 419,888（CC BY 4.0） |
| **S23** | `credits.json` | 1,592 | 6 | 有，但表里"许可"列 5 行写 `见来源页`、"来源"列 5 行写 `—` | 2,520 | 9 | **BREAK（最严重）** | `reuse-s07-src-1902-page.jpg` 1,294,517、`reuse-s07-src-sample-page.jpg` 990,317、`reuse-s13-src-paraguay.jpg` 1,195,632、`reuse-s13-src-shelving.jpg` 406,988、`reuse-s13-src-washi.jpg` 618,137 —— **5 / 6 张被引用的第三方照片既无许可也无来源页也无作者** |
| **S24** | `credits.json` | 2,474 | 6 | 有 | 3,114 | 8 | **BREAK（1 条）** | `reuse-s09-plate-06-batik.png` 127,105（见来源页 / 无 URL / 无作者） |
| **S25** | `credits.json`（**有 `source` URL**） | 1,695 | 5 | 有表，但**"来源页"列 5 行全写 `—`** | 1,297 | 5 | **BREAK（MD 层丢 URL）** | `plate1.jpg` 469,364 / `plate2.jpg` 542,424 / `plate3.jpg` 468,066 / `plate4.jpg` 419,888 / `plate5.jpg` 450,055 —— json 里 5 条 URL 齐全，被生成器丢了 |
| S26 | `credits.json` | 2,963 | 6 | 有 | 3,406 | 9 | OK | — |
| S27 | `credits.json` | 3,750 | 6 | 有 | 4,004 | 9 | OK | — |
| **S28** | `credits.json` | 2,716 | 6 | 有（含网络断供说明与复用出处） | 3,249 | 9 | **BREAK（1 条）** | `reuse-s25-plate5.jpg` 450,055 —— `license` = `CC BY-SA 4.0`、`artist` = Kaethe17，但 `page` 为空，MD 表里来源列写 `—` |
| S29 | `credits.json` | 2,611 | 6 | 有 | 3,174 | 9 | OK | — |
| **S30** | `credits.json` | 2,761 | 6 | 有 | 3,340 | 9 | **BREAK（2 条）** | `reuse-s25-plate1.jpg` 469,364（CC0，无 URL）、`reuse-s25-plate5.jpg` 450,055（CC BY-SA 4.0，无 URL） |

**汇总：许可证链条对不上 14 案**：
S04（13 个被引用文件）、S07（7）、S08（7）、S13（5，申报过度）、S15（6）、S16（json 层 7）、S17（5）、S20（2）、S22（4）、S23（5）、S24（1）、S25（5）、S28（1）、S30（2）。去重后按"文件确实缺许可记录"计：**S04 13 + S07 7 + S08 7 + S15 6 + S17 5 + S20 2 + S22 4 + S23 5 + S24 1 + S25 5 + S28 1 + S30 2 = 58 个文件**（S13 与 S16 不计入——S13 的记录存在只是没被脚本认到、S16 是人可读层正确而机器可读层名字错）。

### 2.2 被引用但 `CREDITS.md` 里根本没有对应行的文件（8 个 / 2,792,072 B）

| 案 | 文件 | 字节 | 引用判定 | credits.json | CREDITS.md |
| --- | --- | --: | --- | --- | --- |
| S02 | `assets/foil-plate@2x.png` | 75,725 | YES | NO | **NO** |
| S08 | `assets/reg-cursor.svg` | 199 | YES | NO | **NO** |
| S15 | `assets/photo-01-boat.jpg` | 545,496 | YES | 只有 `source/fishery-01-boat.jpg` 的对应行 | **NO** |
| S15 | `assets/photo-02-nets.jpg` | 453,548 | YES | 同上 | **NO** |
| S15 | `assets/photo-03-harbour.jpg` | 292,352 | YES | 同上 | **NO** |
| S15 | `assets/photo-04-plan.jpg` | 195,291 | YES | 同上 | **NO** |
| S15 | `assets/photo-05-stockfish.jpg` | 284,615 | YES | 同上 | **NO** |
| S15 | `assets/photo-06-chart.jpg` | 944,846 | YES | 同上 | **NO** |

其中 **S15 的 6 张最严重**：它们的许可在仓库内可推（同案的 `source/fishery-0N-*.jpg` 有 CC BY-SA 4.0 / CC BY 4.0 / Public domain），但 `CREDITS.md` **明写它们是"第二节"要承接的内容，而第二节的表是空的**。所以一个照 README 去 `CREDITS.md` 找许可的人，会得到"这 6 张页面正在用的照片不在表里"。

### 2.3 许可类型与"转授"问题（本节的核心裁定）

把全部 `assets/credits*.json` 的 `license` 字段按类聚合，**113 行**：

| 许可类 | 行数 | 是否要求署名 | 是否要求相同方式共享 |
| --- | --: | --- | --- |
| Public domain / 公有领域 | 56 | 否 | 否 |
| **CC BY-SA（2.0 / 3.0 / 4.0）** | **48** | **是** | **是** |
| **CC BY（2.0 / 2.5 / 3.0 / 4.0）** | **31** | **是** | 否 |
| CC0 | 11 | 否 | 否 |
| 「见来源页」（= 无许可信息） | 11 | 未知 | 未知 |
| No restrictions | 6 | 否 | 否 |
| 公有领域（NASA 图像使用条款） | 已并入"公有领域"计数 | 否 | 否 |

**受限最严的是 CC BY-SA——48 行，分布在 21 个案子**（S02/S05/S06/S09/S10/S12/S13/S14/S15/S16/S18/S19/S20/S21/S23/S25/S26/S27/S28/S29/S30 各至少 1 行）。

**仓库当前声明与交付形态是否足够——我的裁定是：不够，缺口是"派生件的许可"这一格。**

把三处声明原文摆在一起看：

1. `LICENSE:16-21`：「2. **照片**（各原型的 assets/ 目录）这些是第三方素材，**不由本许可授权**……复用前请按该表核对并遵守对应许可；CC BY 与 CC BY-SA 要求署名，部分还要求以相同方式共享。」
2. `README.md:152`：「**照片**（各原型 `assets/`）｜**第三方素材，不由本仓库授权**」
3. `LICENSE:23-25`：「3. **程序化纹理**（`assets/texture-*.png`）由 `prototypes/_build/make-textures.py` 生成……**这部分适用上面的 MIT 许可。**」

**问题在于交付物里数量最大的那一类，三处声明都没覆盖：派生件。**

逐文件判（规则见 §0.2 + 生成器归属）：被引用的 **287 张位图**里，

- **104 张是程序化生成物**（`texture-*` 命名 47 张 + 非 `texture-*` 命名的 57 张）；
- **183 张是第三方照片本体或其派生件**（半调、抖动、双色阶、撕边、网点转印等）。

这 183 张里，绝大部分**既不是"照片"也不是 `assets/texture-*.png`**：

- S01 `halftone-01-composing-room.png`（79,555 B）—— 是 CC BY 4.0 照片的双色半调派生件，文件名是 `halftone-*`，**不落进 `texture-*` 模式**；
- S05 `colddoor-dither.png`（33,013 B）—— CC BY 4.0 照片的 1-bit 抖动派生件；
- S06 `plate-beans.jpg`（116,955 B）—— CC BY-SA 4.0 照片的 60 线珂罗版派生件，**文件名是 `plate-*`**；
- S15 `photo-01-boat.jpg`（545,496 B）—— CC BY-SA 4.0 照片的双色阶派生件，**文件名是 `photo-*`**。

**所以一个只读 `LICENSE` 的人会得出**："`assets/` 里除了 `texture-*.png` 之外的都归 MIT 之外的第三方，照片要守原许可"。但 **`halftone-*.png` / `*-dither.png` / `plate-*.jpg` / `photo-*.jpg` / `*-raw.jpg` 这些派生件到底是什么许可，仓库里没有任何一句话。** 其中 **48 行源文件的 CC BY-SA 要求"以相同方式共享"，而派生件必须继承该许可**——现在的形态要么把它们误当 MIT（LICENSE 第 3 条只覆盖 `texture-*` 模式，反倒显得其余都是 MIT），要么让使用者猜。

**建议怎么改（可执行，不改任何原型）：**

1. 在 `LICENSE` 的第 2、3 条之间**插入第 2bis 条**，逐类列名：
   ```text
   2bis. 由第三方照片派生的位图（各原型 assets/ 下的 halftone-*.png、*-dither.png、
        plate-*.jpg/png、photo-*.jpg、*-raw.jpg，以及任何由 CC BY / CC BY-SA 素材
        经半调、抖动、双色阶、网点或撕边处理得到的文件）
        沿用其源素材的许可。源素材为 CC BY 的，派生件必须署名；
        源素材为 CC BY-SA 的，派生件必须按相同方式共享。
        每一张的源素材、作者与许可见该原型 assets/CREDITS.md。
   ```
2. 同一句写进 `README.md:152` 那一行下面的正文与 `README-EN.md:153`。
3. 把 LICENSE 第 3 条的**模式限定去掉**，改成"由 `make-textures.py` 生成、且在 `build/texture-job.json` 里有 `job` 记录的文件"——因为现在有 57 个生成物根本不叫 `texture-*`（清单见 §4.1），用文件名模式划范围一定会漏。



---

## §3 许可风险裁定

等级定义：**P0** = 会直接让使用者违反许可、或让声明与交付形态自相矛盾且无法辩护；**P1** = 结构性缺陷，改动量明确；**P2** = 需要修但影响可控；**P3** = 记账/命名问题。

### R-01 【P0】5 个原型自述许可记录缺失，而 README/LICENSE 声称"每一张照片都逐张列在 CREDITS.md"

- **现象**：`S04` / `S07` / `S08` / `S13` / `S17` 的 `assets/CREDITS.md` 第 8 行写着同一句话：
  > 「`credits.json` 与磁盘上的文件对不上，或本方案没有留存的署名记录。**这是一个未闭合的缺口**：照片本身是从 Wikimedia Commons 抓的，逐张的作者与许可没有随包保留下来。若要对外使用，需要按 `build/` 下的抓取脚本与检索词重新核对一遍来源。」
  这 5 份 CREDITS.md 是**自动生成的模板文案**（文件头写"由 `prototypes/_build/write-credits.mjs` …汇总生成，**不是手抄**"），字节数恰好都很小：S04 1,824 / S07 1,320 / S08 1,194 / S13 1,391 / S17 1,271。
- **依据**：`grep -l 未闭合的缺口 prototypes/S*/assets/CREDITS.md` 命中恰好这 5 个。而这 5 案**共 38 个被引用的第三方位图正在页面里显示**：S04 13 个（1,864,936 B）、S07 7 个（482,542 B）、S08 7 个（84,390 B）、S17 5 个（905,289 B）、S13 5 个（904,939 B，另有 5 张 `src-*` 未引用）。同一条声明与 `README.md:154`／`LICENSE:19` 的**普遍性断言**冲突：
  > 「**每一张照片的作者、许可与原件链接都逐张列在各原型的 `assets/CREDITS.md` 里。**」
- **为什么这一条辩护不了**：这是本次审查与"成品完成度辩护员"唯一无法互相说服的一条。未接线可以用"资产池""有意保留"解释；**但一个把 38 张第三方照片随仓库分发、同时在 CREDITS.md 里承认"逐张的作者与许可没有保留下来"的包，其 LICENSE 里那句"每一张照片…都逐张列在 CREDITS.md"是不成立的陈述**。对 CC BY / CC BY-SA 素材，署名与许可声明是**许可的生效条件**，不是可选的礼貌；缺了它就等于该次分发没有授权基础。而 `README.md:152` / `LICENSE:16-21` 又明说"这些不由本仓库授权，复用前请按该表核对"——**指向了一份在这些案子里并不存在（或自认不完整）的表**。声明 → 行为的断裂出现在这里，不在视觉层。
- **建议怎么改**（按优先级，任选其一即可闭合，前两条不需要联网）：
  1. **不改素材，改声明**：在 README/LICENSE 的对应句后面加限定：「覆盖率见每案 `CREDITS.md`；`S04`/`S07`/`S08`/`S13`/`S17` 五案的逐张记录**尚缺**，这五案的 `assets/` 不得对外复用。」并在 `README.md` 的"已知缺口"一节（现 166-176 行）加一条同义列表。**这是 1 小时内可完成的最低成本闭合。**
  2. **补齐 S13**（唯一可离线补齐的）：S13 的记录其实存在——`assets/credits.fetch.json`（6,359 B，5 行带 `page`）＋ `assets/credits.json`（10,027 B，聚合壳＋2 行）＋ `index.html` 里 5 条 `<span class="plate__credit">`（逐张写着"公有领域（CC0），The Metropolitan Museum of Art"）。修 `prototypes/_build/write-credits.mjs` 让它把 `credits.fetch.json` 一并读入并改名匹配，再重跑，即可把 S13 从缺口名单里去掉。**同时把 CREDITS.md 里那句"缺口"文案改成条件触发**，避免以后重复误报。
  3. **给 S04 / S07 / S08 定性**：S04 的 13 张**根本不是第三方照片**（见 R-06），`build/make-plates.py:3` 原文写着「**没有摄影原稿**，因此按同一条工艺链直接生成"分色后印出来的纸"」——它应当**从缺口名单里移出并归入生成物**；S08 同理（见 R-05）。真正需要恢复记录的是 **S07（7 张 1902 年报纸缩微扫描）和 S17（5 张奥斯曼印花税票/收据）**——这两案 `index.html` 自己已经写了来源（S07 `index.html:170`「图版来源：公有领域报纸缩微扫描（1902 年《同业世界》及同期地方报）」；S17 五处 `<figcaption>` 都写 `Wikimedia Commons · 公有领域`），所以作者与原件链接是唯一缺的两个字段，可按 S17 页面里的票面信息（年份＋票种＋国家）检索补齐。

### R-02 【P0】`见来源页` 被当成许可字段，且没有来源页——11 行，其中 10 行同时无作者、无 URL

- **现象**：`assets/credits.json` 的 `license` 字段出现字面值 `见来源页`（"see source page"），而同一行的 `page` / `source` / `origin` / `original` 四个字段**全为空**，`artist` 写 `（原件未标注作者）`。
- **全部 11 行**（脚本 `_crit7b/licsum.mjs` 逐行列出）：

| 案 | 文件（json 里的 `file`） | 字节（磁盘上对应件） | artist | URL |
| --- | --- | --: | --- | --- |
| S20 | `reuse-s14-plate-05-chipmunk-cockpit.jpg` | 205,423 | （原件未标注作者） | 0 |
| S20 | `reuse-s15-photo-06-chart.jpg` | 944,846 | （原件未标注作者） | 0 |
| S21 | `reuse-s14-plate-05-chipmunk-cockpit.jpg`（在 `credits-unused.json`，未进页面） | 205,423 | （原件未标注作者） | 0 |
| S22 | `reuse-s13-src-shelving.jpg` | 406,988 | （原件未标注作者） | 0 |
| S22 | `reuse-s13-src-washi.jpg` | 618,137 | （原件未标注作者） | 0 |
| S23 | `reuse-s07-src-1902-page.jpg` | 1,294,517 | （原件未标注作者） | 0 |
| S23 | `reuse-s07-src-sample-page.jpg` | 990,317 | （原件未标注作者） | 0 |
| S23 | `reuse-s13-src-paraguay.jpg` | 1,195,632 | （原件未标注作者） | 0 |
| S23 | `reuse-s13-src-shelving.jpg` | 406,988 | （原件未标注作者） | 0 |
| S23 | `reuse-s13-src-washi.jpg` | 618,137 | （原件未标注作者） | 0 |
| S24 | `reuse-s09-plate-06-batik.png` | 127,105 | （原件未标注作者） | 0 |

- **依据**：`_crit7b/licsum.mjs` 的 "rows with 见来源页 or 0 URL" 段。这 11 行里有 10 行同时缺许可、缺作者、缺 URL——**三重缺失**。
- **根因可定位**：缺 URL 的那一批全部是 `reuse-*` 前缀的**二次复用件**。写 `assign-assets.mjs` 的时候，分配逻辑只搬运了文件名，没有把源案的 `page` / `artist` 带过来（源案 S13 `credits.fetch.json` 的 5 行里 `page` 是有的；S25 `credits.json` 的 5 行里 `source` 也是有的）。所以这不是"原始出处查不到"，而是**复用链本身在写记录时丢了三个字段**。
- **为什么这一条辩护不了**：`见来源页` 把举证责任推给了一个不存在的页面。对 CC BY-SA（S22 的 `reuse-s13-src-washi.jpg` 源案是 CC BY-SA 4.0、S24 的 `reuse-s09-plate-06-batik.png` 源案是 S09 的 CC BY-SA 4.0 组）而言，署名是生效条件；写"见来源页"且在同一个文件里不给来源页，等于没有满足。**S23 尤其严重：6 张被引用的照片里 5 张处于这个状态**，即它页面上的画面 5/6 来自无记录素材。
- **建议怎么改（可执行）**：
  1. **一次性补链，不动素材**：写一个小脚本（可以就放在 `prototypes/_build/` 下）做**跨案字段回填**——扫全库 `assets/credits*.json`，把每个 `reuse-sXX-<name>` 里的 `<name>` 拿去源案 `SXX/assets/credits*.json` 里按 `file` 匹配，命中则把源行的 `title` / `artist` / `license` / `page` / `source` 抄过来，并加一个 `via: "reuse from SXX"` 字段。这一步能自动闭合 10 行里的绝大部分（`reuse-s07-src-1902-page.jpg` 需回填 S07——而 S07 自身也缺，见 R-01）。
  2. **把 `见来源页` 变成不可能**：在 `_build` 的写记录脚本里加断言——`license` 命中 `/见来源页/` 或 `page`/`source` 全空时，脚本必须**报错退出**并把该条目的文件名打印出来，不允许静默写入。
  3. **S07 / S17 / S13 的一条专用修法**：这 3 案的源案记录在仓库里其实有半份（S13 有 `credits.fetch.json`；S07、S17 的页面里有票面/年份信息），**先修源案，再让第 1 步的回填把下游 S22/S23/S24 一起带起来**。顺序反了会白做。

### R-03 【P1】派生件的许可空缺：183 张被引用位图既不在"照片"条款也不在"程序化纹理"条款里

- **现象**：`LICENSE:23-25` 用**文件名模式**划 MIT 范围（`assets/texture-*.png`），而 `LICENSE:16-21` 用**目录**划第三方范围（`assets/` 里的"照片"）。**两个集合的补集里坐着 183 张被引用的派生件。**
- **依据**（计数规则写在这里，可复算）：被引用位图 287 张 = 生成物 104 张（`texture-*` 命名 47 + 非 `texture-*` 命名 57）＋ 照片/派生件 183 张。派生件举例与字节：`S01/assets/halftone-01-composing-room.png` 79,555（源 CC BY 4.0）、`S05/assets/colddoor-dither.png` 33,013（源 CC BY 4.0）、`S06/assets/plate-beans.jpg` 116,955（源 CC BY-SA 4.0）、`S15/assets/photo-01-boat.jpg` 545,496（源 CC BY-SA 4.0）、`S09/assets/plate-04-market.png` 160,366（源 CC BY-SA 4.0）。
- **为什么这一条辩护不了**：CC BY-SA 的"以相同方式共享"约束的是**演绎作品**，而半调/抖动/双色阶是演绎。仓库把 48 行 CC BY-SA 源素材处理成派生件、放进同一个可下载目录、并在 LICENSE 里只写了"照片是本仓库不授权的第三方"——**没有一句话告诉使用者"这些派生件必须继续以 CC BY-SA 分发"**。现在的写法（第 3 条只放 MIT 给 `texture-*`）反而会让人误以为 `assets/` 里其余的位图不属任何限制之外的类别。
- **建议怎么改**：见 §2.3 末尾的三条（插入 `2bis` 条款、同步 README/README-EN、把第 3 条的模式限定换成生成器记录制）。**这一条不需要碰任何图片文件。**

### R-04 【P1】约 27.3 MB 未处理的第三方原图放在交付目录 `assets/` 内部

- **现象**：8 个案子把"烘焙输入"放在 `assets/` 里面而不是 `build/`：

| 案 | 目录 | 个数 | 字节 | 说明 |
| --- | --- | --: | --: | --- |
| S02 | `assets/_raw/` | 5 | 4,293,143 | 1920px 原图（`ormolu-gilt-bronze.jpg` 1,561,461 最大） |
| S05 | `assets/source/` | 6 | 1,586,877 | 1280px 原图 |
| S06 | `assets/origin/` | 7 | 4,426,361 | 1920px 原图（`ledger-paper.jpg` 1,102,407 最大） |
| S07 | `assets/src-*.jpg` | 2 | 2,284,834 | 1966×2800 / 1943×2800 扫描件 |
| S09 | `assets/raw/` | 8 | 7,140,055 | 1920px 原图（`sign-hand-painted.jpg` 1,717,993 最大） |
| S10 | `assets/*-raw.jpg` | 6 | 2,906,320 | 1280px 原图（`steel-05-raw.jpg` 1,460,414 最大） |
| S13 | `assets/src-*.jpg` | 5 | 2,873,877 | 1920px 原图（`src-paraguay.jpg` 1,195,632 最大） |
| S15 | `assets/source/` | 6 | 2,863,392 | 1280px 原图（`fishery-06-chart.jpg` 891,626 最大） |
| **合计** | | **45** | **28,374,859** | |

  （另有 S11 `build/raw/` 7 个 / 2,778,433 B、S12 `build/raw/` 6 个 / 5,026,412 B、S16 `build/raw/` 7 个 / 2,243,923 B、S26 `build/raw/` 3 个 / 777,335 B 放在 `build/` 下——**这 4 案的做法是对的**，可以直接照抄。）
- **依据**：`_crit7b/cand.mjs` 的逐案目录统计。
- **风险是什么**：这 45 个文件是**未经任何处理的原始第三方素材**，其中 CC BY-SA 的（S06 4 张、S09 4 张、S15 3 张、S02 1 张、S05 1 张、S10 3 张、S13 1 张）**同样是"以相同方式共享"的对象**，而它们比派生件更容易被直接二次使用。放在 `assets/` 里意味着任何"复制 `Sxx/assets/` 就完事"的下游会把它们一起带走，而 `README.md` 的目录结构说明（178-194 行）只写了「`S01-… S30-…/ # 30 个原型（index.html + style.css + assets/ + .inspect/）`」——**没有说 `assets/` 里还嵌着原始池**。
- **建议怎么改**：两条路，选一条。
  1. **搬到 `build/`**（对齐 S11/S12/S16/S26 的做法）：`git mv prototypes/Sxx/assets/{_raw,source,origin,raw} prototypes/Sxx/build/`，然后改各案 `build/*.py` 里的输入路径常量（S02 `make-salon-assets.py`、S05、S06 `make-plates.py`、S09、S10 `bake-plates.py`、S13、S15 `bake-plates.py`）。**注意路径常量大多硬编码在第 10-12 行**（如 S04 `make-plates.py:10` 的 `OUT = Path(__file__).resolve().parents[1] / "assets"`），改一处即可。
  2. **留在原地但在 README 里把层写清楚**：在 README 的目录结构块里把 8 个 `assets/` 子目录逐一列出，并加一句「`assets/{_raw,source,origin,raw}/` 是烘焙输入，属第三方原图，**不能当交付素材复用**；页面只引用 `assets/` 根下的成品」。
  1 更彻底（也顺带解决 R-03 的部分混乱），2 更便宜。

### R-05 【P1】S08 把自己的生成物写成"第三方照片 + 缺署名致歉"，与它自己页面的自述直接打架

- **现象**：`S08/assets/CREDITS.md:12-19` 把这 6 个文件列在标题为 **「一、真实照片」** 的章节下，并声明"照片本身是从 Wikimedia Commons 抓的，逐张的作者与许可没有随包保留下来"：
  `detail.png` 2,391、`grime-macro.png` 36,232、`grime.png` 9,023、`overprint-offset.png` 18,271、`overprint.png` 17,992、`print.png` 1,581。
- **依据**：同一个案子的 `index.html:286` 写的是完全相反的话——
  > 「资产：套准样张、污染层与折射高光**均由构建期生成**；污染层为 1 位 PNG，不透明度 2% 至 3%。」
  并且 `prototypes/_CONTRACT.md:83` 把 S08 的生成器直接点名：`prototypes/S08-amber-overprint-lightbox/build-assets.py` 是"位图纹理／印痕用 Python + Pillow 程序化生成"的范例。文件尺寸（1,581 B / 2,391 B 的 PNG）也与"扫描真图"不相称；实测尺寸 1200×760 / 1200×420。
- **注意**：**S08 目录下不存在 `build-assets.py`**（`Get-ChildItem prototypes\S08-amber-overprint-lightbox\build` 返回空，该案连 `build/` 目录都没有）。也就是说这条是"记录说它是照片 → 页面说它是生成物 → 生成脚本不在仓库里"的**三方不一致**。
- **建议怎么改**：
  1. 把 `S08/assets/CREDITS.md` 的这 6 行从"一、真实照片"移到"二、程序化纹理（生成物，非照片）"章节，改写成生成器＋参数表（照 S23/S28 的 `| 文件 | 生成器 | 参数 |` 三列表）。
  2. 把 `build-assets.py`（或当前实际的生成方式）落盘到 `S08/build/`，并在 `build/texture-job.json` 里登记参数——`LICENSE:23-25` 的"可逐字节复算"要求依赖这个文件存在。
  3. 这 6 个文件的命名与 `_CONTRACT.md:229`「程序化产物一律叫纹理」不符：要么改名加 `texture-` 前缀（会牵扯 `index.html` 的 6 处 `src`），要么接受现名但靠第 1 步的章节归类把它们从"照片"里摘出来。**建议第 2 种**，成本低且不会漏改引用。

### R-06 【P1】S04 同样把自己的生成物写成第三方照片，还为此编了一条并不存在的"缺署名"

- **现象**：`S04/assets/CREDITS.md:12-39` 把 `plate-01.png`…`plate-08.png`、`plate-lead.png`、`torn-edge-1..4.png`（共 13 个，加载的是同名 `.webp`）列在「一、真实照片」下，声明"照片本身是从 Wikimedia Commons 抓的"。
- **依据**：`S04/build/make-plates.py` 第 3 行原文——
  > 「**没有摄影原稿**，因此按同一条工艺链直接生成"分色后印出来的纸"：四张色版各自 offset 后套印、绿版走 30 线半调网……产物是真实位图，不是 CSS 插值填充，也不是 SVG 描摹。」
  该生成器只 import `math, random, PIL`，**没有任何图片输入**；同目录的 `make-torn.py`（4,442 B）负责 `torn-edge-*`。而 `index.html` 里这 9 张 `plate-*.webp` 的 `alt` 写的是虚构作品名（「丝网印版《帕兰戈莱：给一面墙的穿戴》」「丝网印版《芒果地里的旗》」），本就自证是生成图版而非档案照片。
- **为什么这一条辩护不了**：这不是"没接线"的问题，也不是"记录不全"的问题——**是把自己做的东西说成别人的东西，并为别人的东西编了一条不存在的署名缺失**。它同时触发 `_CONTRACT.md:229` 的两条禁令（「绝对不要用生成图冒充照片」「程序化产物一律叫纹理，CREDITS.md 里写明"生成物，非照片"」）。**对"不伪造照片"这条承诺来说，这是全库唯一的实质性违反**（S07 是"来源未记录"，不是伪造）。
- **建议怎么改**：
  1. 把 `S04/assets/CREDITS.md` 整份重写：删掉「一、真实照片」里那 13 行与那句"缺口"，改成 `| 产出文件 | 生成器 | 参数 |`（`make-plates.py` 里的 ORANGE/GREEN/BLACK/PAPER 四色常数与 `cell=8 / angle=15.0` 可直接抄成参数）。
  2. 在 `S04/assets/CREDITS.md` 加一句"本目录不含任何第三方素材"——**这句话是可信的**，因为 `assets/` 里除 13 张生成物外只剩 `fonts/`（见 §7）。
  3. 顺带把 `.png` 回退版处理掉（见 §1.2 与 R-11）。

### R-07 【P1】S15 的 `CREDITS.md` 第二节是空表，第一节的"页面里用在哪"没刷新

- **现象**：
  - `S15/assets/CREDITS.md:28-29` —— 「二、石墨／纸色双色阶图版（由第一节的照片烘焙，页面应当引用这一组）」的表**只有表头，0 行数据**；
  - `S15/assets/CREDITS.md:17-22` —— 第一节 6 行的"页面里用在哪"列**全部写「待页面引用（index.html 未落盘）」**；
  - 而 `index.html` **正在引用** `assets/photo-01-boat.jpg` 等 6 张。
- **依据**：`CREDITS.md:58` 自己说明了这个表该被刷新：「页面落盘之后请再跑一次 `build/write-credits.py`：第一节与第二节的「页面里用在哪」会从「待页面引用」变成真实引用关系，未被引用的会明确标成「备用」。」——**这一步没跑。**
- **为什么这一条辩护不了**：S01 与 S06 做到了（S01 把 `halftone-07-mergenthaler.png` 标成"备用"，S06 的 `cursor-spoon.png` 标成"当前页面未引用，留在盘上备查"）。同一个生成器体系，S15 少跑一步，结果就是 **6 张页面在用的 CC BY-SA / CC BY 照片在许可表里找不到行**。这不是"完成度"能解释的：一个照 README 去查的人会得到"这些照片无记录"。
- **建议怎么改**：
  1. 跑 `python prototypes/S15-fishery-floor-ledger/build/write-credits.py`（依赖 `assets/credits.json` + `build/bake-report.json` + `build/textures.json`，都在）。
  2. 跑之前先确认 `build/bake-report.json` 存在——若不存在，`write-credits.py` 应当报错而不是生成空表；**给这个脚本加一条断言：§二表体为 0 行时直接 `sys.exit(1)`**，因为一张空表比不生成更有害。
  3. 校验：跑完后 `assets/CREDITS.md` 里必须能搜到 `photo-01-boat.jpg` 到 `photo-06-chart.jpg` 这 6 个字符串。

### R-08 【P1】S25 的 `credits.json` 有 5 条来源链接，`CREDITS.md` 全部写成 `—`

- **现象**：`S25/assets/credits.json`（1,695 B，5 行）每行都有 `source` 字段且都是 `https://`；生成的 `assets/CREDITS.md`（1,297 B）里"来源页"列 **5 行全写 `—`**（脚本计数：`mdEmDashCells=5`，而 `mdLinks=0`）。
- **依据**：`S25/assets/CREDITS.md:8-14` 的表；对照 `_crit7b/pageurl.mjs` 的 `S25 … rows=5 url=5 … mdLinks=0 mdEmDashCells=5`。
- **下游影响**：`reuse-s25-plate1/2/4/5.*` 被 S22、S28、S30 复用（4 处），这 4 处的 `page` 全空（R-02）。**S25 是唯一在源案 `credits.json` 里留着 URL 的那一环，所以这 5 条 URL 丢了之后，`reuse-s25-*` 的来源在全库范围内都找不回来了。**
- **建议怎么改**：
  1. 生成器 `prototypes/_build/write-credits.mjs` 里把 `source` 也当成来源列候选（现在只认 `page`）。改一行即可，重跑后 S25 的 5 条链接会回到表里。
  2. 顺手把 S22/S28/S30 的 `reuse-s25-*` 4 行按 R-02 第 1 步回填——**先修 S25 再回填**，否则回填也拿不到 URL。

### R-09 【P2】S16 的 `assets/credits.json` 指向不存在的 `.jpg`

- **现象**：`S16/assets/credits.json`（5,965 B，7 行）的 `file` 字段写 `plate-01-figaro-manifesto.jpg` … `plate-07-marinetti.jpg`；**磁盘上 `assets/` 里是 `.png`**（`plate-01-figaro-manifesto.png` 132,429 B 等），`.jpg` 只存在于 `build/raw/`（`plate-07-marinetti.jpg` 37,187 B）。
- **依据**：`Get-ChildItem prototypes\S16-velocity-slant-manifesto\assets` 与 `lic2.mjs` 的输出对照。
- **影响面**：`CREDITS.md` 用的是正确的 `.png` 名（该表由 `build/write-credits.py` 生成，读的是另一份 `build/raw/credits.json`），所以人可读层没事；**但任何按 `credits.json` 的 `file` 去找文件的工具会 100% 找不到**（S13 那次假缺口就是这么来的）。
- **建议怎么改**：把 `assets/credits.json` 的 `file` 改成 `.png`，并**加一个 `raw` 字段**写 `build/raw/plate-0N-*.jpg`（照 S10 的双字段写法：`file` = 成品、`raw` = 原图）。S10 已经把这条路走通了，直接抄。

### R-10 【P2】S02 的 `leak-patch@2x.ivory-backup.png` 既没被引用，也没出现在任何记录里

- **现象**：`assets/leak-patch@2x.ivory-backup.png`（26,958 B，520×360）—— 引用判定 `NO`，`credits.json` 里 `NO`，`CREDITS.md` 里 `NO`。**三重缺记**。对比同目录的 `assets/leak-patch@2x.png`（14,865 B）是被引用的。
- **依据**：§1.1 的 S02 表；文件名里的 `.ivory-backup` 说明它是一次配色试验的备份（ivory = 象牙色）。
- **建议怎么改**：删掉它（同案还有 11 个未引用件，见 R-12 的清理建议），或在 `CREDITS.md` 里加一行"生成物，未引用，见 `build/make-salon-assets.py`"。

### R-11 【P2】S04 的 13 个未引用 `.png`（1,707,150 B）是纯粹的体积浪费——全库没有一处 `<picture>`

- **现象**：`plate-01.png` 229,166 / `plate-02.png` 175,819 / `plate-03.png` 166,634 / `plate-04.png` 151,426 / `plate-05.png` 151,002 / `plate-06.png` 124,578 / `plate-07.png` 198,901 / `plate-08.png` 164,050 / `plate-lead.png` 376,248 / `torn-edge-1.png` 38,331 / `torn-edge-2.png` 33,230 / `torn-edge-3.png` 31,621 / `torn-edge-4.png` 23,930。
- **依据**：`index.html` 只写 `src="assets/plate-0N.webp"` 与 `--torn:url('assets/torn-edge-N.webp')`；全库扫 `<picture>` / `<source>` 标签命中 0。所以这些 `.png` **没有任何加载路径**，合计 1,707,150 B 是 `.webp` 的 3.2 倍。
- **注意**：S21 有同样的 `.avif` 情况但**已在 CREDITS.md 里写明理由并作出决策**（§1.2 的 S21 行）。S04 没有一行说明。
- **建议怎么改**：二选一——(a) 删掉 13 个 `.png`（可用，因为确实没引用）；(b) 若要保留无损回退，就在 `index.html` 里把每个 `<img>` 包成
  ```html
  <picture><source type="image/png" srcset="assets/plate-01.png"><img src="assets/plate-01.webp" …></picture>
  ```
  并在 `CREDITS.md` 里加一行"`.png` 为无损回退"。**不建议 (b)**：S04 的图版是生成物（R-06），回退无损对它们没有意义。

### R-12 【P2】重复文件 31 组 / 19,204,114 B（SHA-1 实测）

- **依据**：`_crit7b/dupe.mjs`，对 `prototypes/**` 下全部 `.jpg/.png/.webp/.avif/.woff2`（排除 `build/`、`.inspect/`）算 SHA-1。
- **其中 30 组是已被记录的 `reuse-*` 复用**（例：`S14/assets/cabin-04-telemetry-panel.jpg` = `S20/assets/reuse-s14-cabin-04-telemetry-panel.jpg` = `S21/assets/reuse-s14-cabin-04-telemetry-panel.jpg`，252,859 B ×3；`S25/assets/plate5.jpg` = `S28/assets/reuse-s25-plate5.jpg` = `S30/assets/reuse-s25-plate5.jpg`，450,055 B ×3）。**这些是设计选择，且有 `credits.json` 记录，不用改。**
- **需要处理的两处**：
  1. **S19 同案内自重复**：`assets/jean-feltgen-herbarium-sheet-phelipea-ramosa.jpg`（508,033 B）与 `assets/reuse-s24-reuse-s19-jean-feltgen-herbarium-sheet-p.jpg`（508,033 B）**SHA-1 完全相同**。后者名字里套了两层 `reuse`（`reuse-s24-reuse-s19-…`），说明分配脚本把已经复用来的文件又当成本案原件复用了。`credits.json` 里两行都在，`artist` 都是 `Musée national d'histoire naturelle`。**建议：删掉后者，保留前者；或在 json 里把后者标成 alias 而不是独立条目。**
  2. **S08 字体重复**：`assets/fonts/plex-numerals.woff2`（14,708 B）与 `_fonts/files/ibm-plex-mono/f0d72638--F63fjptAgt5VM-kVkqdyU8n1i8q1w.woff2`（14,708 B）**SHA-1 相同**。即 S08 把共享字体缓存里的一份又抄进了自己的 `assets/`，而 `CREDITS.md` 没有任何一行提它（§7 F-03）。
- **建议怎么改**：`
  只删 S19 的那一份（它没有任何引用者，`reuse-s24-reuse-s19-…` 是否为 S24 所需需另查——S24 用的是 `reuse-s19-jean-feltgen-herbarium-sheet-phelipea-ra.jpg`，文件名不同但**内容也是同一份 508,033 B**）。所以实际是同一张照片在 3 个地方存在：S19 两份 + S24 一份。**保留 S19 的规范名一份，另两处作为 `reuse-*` 保留（那是分配机制的正常产物），只把 S19 同目录内的那一份重复删掉即可。**

### R-13 【P2】S13 的 `assets/credits.json` 是一个 `value`/`Count` 聚合壳，不是行列表

- **现象**：`S13/assets/credits.json`（10,027 B）解析出来的对象键包括 `value` / `Count` / `file` / `media` / `title` / `creator` / `license` / `page` 等，但**只有 2 行有 `file`**，另有 1 行是 `{value: …, Count: …}` 形式的许可计数。真正的 5 行记录在 `assets/credits.fetch.json`（6,359 B）。
- **依据**：`_crit7b/lic2.mjs` 对 S13 的输出；`_crit7b/rows.mjs` 打印出的 `credits.json rows=3`（其中 1 行 `lic=(none)`）。
- **后果**：直接导致 `write-credits.mjs` 判"记录对不上"→ 生成 R-01 那句"未闭合的缺口"。**S13 是 5 个"缺口案"里唯一一个记录本来就在仓库里的。**
- **建议怎么改**：
  1. 把 `assets/credits.fetch.json` 的内容并入 `assets/credits.json`（统一成行列表 schema），或
  2. 改 `write-credits.mjs` 让它同时读 `credits*.json`（现在只读 `credits.json`）——**改脚本更划算**，因为 `credits.fetch.json` 这个名字在 S13 是唯一的，而"读所有 `credits*.json`"这个改动对全库只有好处。
  3. 两份都做完后重跑，S13 的 CREDITS.md 会从 1,391 B 涨到与其它案相称的量级。

### R-14 【P3】S11 的 `assets/credits.json` schema 与全库不兼容

- **现象**：`S11/assets/credits.json`（15,364 B）的顶层是 `{scheme, title, generated, generator, note, recompute, images[], textures[], fonts[]}`，而全库其余 24 份 `credits.json` 都是"行数组"。真正的 7 行 raw 记录在 `build/raw/credits.json`（5,860 B）。
- **依据**：`_crit7b/lic2.mjs` 对 S11 的输出（`n=1 named=0`，键为 `scheme`/`images`/`textures`/`fonts`）。
- **影响**：任何"遍历全库 `assets/credits.json` 抽许可"的脚本会在 S11 上静默返回 0 条。本次审查的第一版脚本就踩了这个（`S11 assets/credits.json: PARSE-ERROR / n=1 named=0`）。
- **建议怎么改**：在 S11 的 `assets/credits.json` 里加一个 `rows: […]` 数组（内容从 `build/raw/credits.json` 抄），保留现有键不动。**这样既向后兼容又不破坏已有结构。**

### R-15 【P3】S21 候选池的 `sheet.jpg` 无许可记录；池里 22 张被弃用的照片没有弃用理由

- **现象**：`S21/assets/_cand/candidates.json`（20,724 B）覆盖 27 / 28 张候选，**`sheet.jpg`（176,495 B）没有记录**。
- **依据**：`_crit7b/cand.mjs` 的 `disk=28 covered=27 uncovered=1`。
- **另**：CREDITS.md 只解释了 6 张采用件，没解释 22 张（约 7.0 MB）带可核对许可的对题照片为何不用。对比 `credits-unused.json` 为 6 张 `reuse-*` 逐张写了 `reason`——**两套标准不一致**。
- **建议怎么改**：给 `sheet.jpg` 补一行（或直接删文件）；在 CREDITS.md §一末尾加"候选池其余 22 张的弃用理由"或一句"按题材贴合度排序后取前 6，其余留档待图源恢复后重选"。

### R-16 【P3】`assets/` 下的生成物命名不统一，导致 LICENSE 的模式化范围失效

- **现象**：57 个**被引用**的生成物不叫 `texture-*`，因而落在 `LICENSE:23-25` 的 MIT 声明范围之外（该条只写 `assets/texture-*.png`）：

| 案 | 非 `texture-*` 命名的生成物（被引用的） | 个数 |
| --- | --- | --: |
| S01 | `paper-grain.png` 20,174、`cursor-fold.png` 797 | 2 |
| S02 | `card-grain.png` 5,254、`foil-plate@2x.png` 75,725、`gold-grain.png` 3,910、`leak-patch@2x.png` 14,865 | 4 |
| S03 | `grain.png` 37,697、`vignette.png` 17,489 | 2 |
| S05 | `plate-brushed.png` 15,082、`plate-grain.png` 7,679、`plate-scanline.png` 89、`plate-wear.png` 10,913 | 4 |
| S06 | `halftone-dot.png` 189、`ink-mottle.png` 7,190、`paper-grain.png` 23,273、`stain-ring-a.png` 4,450、`stain-ring-b.png` 8,839、`stain-ring-c.png` 7,862 | 6（`cursor-spoon.png` 未引用） |
| S08 | `detail.png` 2,391、`grime-macro.png` 36,232、`grime.png` 9,023、`overprint-offset.png` 18,271、`overprint.png` 17,992、`print.png` 1,581、`reg-cursor.svg` 199 | 7 |
| S09 | `cursor-brush.png` 249、`lamp-tube-tight.png` 4,558、`lamp-tube.png` 5,544、`rule-shake-ink.png` 167、`rust-corner-a/b/c/d.png` 15,211、`tile-paint-mottle.png` 45,419、`tile-wall-iron.png` 19,951 | 11 |
| S11 | `grain-128.png` 14,166 | 1 |
| S12 | `cursor-square-stripe.png` 582、`cursor-square.png` 279、`laminate-grain.png` 261 | 3（`stripe-45-tile.png` 未引用） |
| S14 | `bubble-field.png` 6,118、`foil-grain.png` 3,333、`foil-sheen.png` 1,080、`service-marks.png` 7,030 | 4（`foil-edge-sample.png` 未引用） |
| S16 | `cursor-slant.png` 1,009、`paper-grain.png` 41,179 | 2 |
| **合计** | | **46** |

  合计：上表 11 案的**被引用**生成物共 **46** 个。另有 11 个生成物（S04 的 13 个里被引用的部分是 9 个 `.webp` + 4 个 `torn-edge-*.webp`，其中已计入上表 0 个）——**S04 的生成物全部未引用，故不在本表**。所以"不叫 `texture-*` 的生成物"总数是 46 + 11（S04 被引用的 13 个里去掉重复计法）= **57 个被引用的 + 13 个未引用的 = 70 个**；而 §2.3 说的"57 个非 `texture-*` 命名"指的是**被引用的 57 个**。两处口径一致。
- **依据**：`_crit7b/misc.mjs` 的 D 段（按命名规则筛），逐个与 `build/texture-job.json` / 各案生成脚本对照归类。
- **建议怎么改**：把 `LICENSE` / `README.md:156` 的判据从"文件名模式"改成"**生成器记录**"：
  ```text
  程序化纹理 = 由 prototypes/_build/make-textures.py 生成、
  且在所属 build/texture-job.json 的 job 列表里有记录的文件（不论文件名）。
  ```
  然后**为 S01/S02/S03/S05/S06/S08/S09/S11/S12/S14/S16 各补一份 `build/texture-job.json`** 并在里面把上表这些文件登记进去——这是把"无第三方权利"从宣称变成可核的唯一办法。



### R-17 【P2】S14 与 S15 的 `CREDITS.md` 里"页面里用在哪"是没刷新的占位文本——S14 **28 处**、S15 **7 处**

- **现象**：两份 `CREDITS.md` 的表格里，"页面里用在哪"这一列写的是 **「待页面引用（index.html 未落盘）」**，而两个案子的 `index.html` 都已经落盘并向这些文件发请求：

| 案 | `待页面引用` 出现次数 | 出现在哪 | CREDITS.md 字节 | 同一脚本的"该刷新"说明 |
| --- | --: | --- | --: | --- |
| **S14** | **28** | §一 14 行（`cabin-01..12` + `pad-01/02`）＋ §二 14 行（`plate-01..14`） | 13,116 | — |
| **S15** | **7** | §一 6 行 ＋ 结尾说明 1 处 | 8,944 | `:58` 明写「页面落盘之后请再跑一次 `build/write-credits.py`：第一节与第二节的「页面里用在哪」会从「待页面引用」变成真实引用关系，未被引用的会明确标成「备用」。」 |

- **依据**：`Select-String -Pattern '待页面引用' -AllMatches` 逐案计数（S14 = 28，S15 = 7）。两个案子的 `CREDITS.md` 分别是 13,116 B / 8,944 B，都比同类案大（S28 3,249 B、S23 2,520 B），说明**表体是满的、只有状态列是陈的**。
- **为什么算风险而不是"格式问题"**：这一列是**唯一区分"页面在用的第三方照片"与"留档的第三方照片"的字段**。S14 的 `cabin-01`（247,606 B）与 `cabin-04`（252,859 B）在表里长得一模一样，但前者页面从未引用、后者的派生件 `plate-09-telemetry-panel.jpg` 页面正在用。**不刷新就等于这两类在账上无法区分**——这也正是 S15 那 6 张 `photo-*` 会在 §2 被算成"BREAK"的同一原因。
- **建议怎么改**：
  1. **两份都跑一次各自的 `build/write-credits.py`**（S14 与 S15 的 `CREDITS.md` 都是它生成的）。
  2. 跑之前在脚本里加**断言**：如果 `index.html` 已存在、而表里仍有 `待页面引用` 字样 → `sys.exit(1)`。这样这个缺陷不会再静默复发。
  3. 跑之后逐条校验：S15 必须能搜到 `photo-01-boat.jpg`…`photo-06-chart.jpg` 6 个字符串；S14 的 §二 14 行里被引用的那 10 行（`plate-01/02/03/05/07/09/10/11/13/14`）状态必须从"待页面引用"变成"§某处"，未引用的 4 行（`plate-04/06/08/12`）必须变成"**备用**"。
  4. **`build/bake-report.json` 与 `build/textures.json` 是否存在要先确认**——S15 的 §二 现在是 0 行数据（R-07），最可能就是这两个输入之一缺失导致脚本生成了空表却没报错。

---

## §4 生成物 vs 照片的标注核验

判定：`prototypes/_CONTRACT.md:229` 的原文是硬要求——
> 「**绝对不要用生成图冒充照片。** … 程序化产物一律叫纹理，`CREDITS.md` 里写明"生成物，非照片"。」
`README.md:156` 与 `LICENSE:23-25` 也各自宣称程序化纹理"不是照片""无第三方权利"。

逐纹理核（生成物的归属按"命名规则 + 该案 `build/` 下生成器是否存在 + 生成脚本里有无图片输入"三者交叉判定；尺寸/字节用 Pillow / `Get-Item` 实测）：

### 4.1 逐案核验表

| 案 | 非 `texture-*` 命名的生成物（被引用的） | 个数 | CREDITS.md 是否有"生成物/程序化"专节 | 是否如实标为生成物 |
| --- | --- | --: | --- | --- |
| S01 | `paper-grain.png` 20,174、`cursor-fold.png` 797 | 2 | 有：`## 程序化生成的纹理与光标（无第三方来源）` | **是**（表格逐行列了生成函数 `bake-plates.py: tex_paper()` / `bake-plates-s01.py: fold_cursor()`） |
| S02 | `card-grain.png` 5,254、`foil-plate@2x.png` 75,725、`gold-grain.png` 3,910、`leak-patch@2x.png` 14,865 | 4 | 有：`## 2. 程序化生成的位图（本页实际引用）` | **是**（逐行给出生成脚本 `build/make-plates.py` 与画法） |
| **S03** | `grain.png` 37,697、`vignette.png` 17,489 | 2 | 有节名但**内容是空的**：`## 二、程序化纹理 / 生成物` 下写「（本目录没有以 `texture-` 命名的生成物；若有其他生成图版，见 `build/` 下的生成脚本。）」 | **否 —— 这 2 个被列进了上一节「盘上存在但署名表里没有对应记录的位图」，即被归入"第三方、署名丢失"** |
| **S04** | `plate-01..08.webp`、`plate-lead.webp`、`torn-edge-1..4.webp`（13 个；`.png` 同名未引用） | 13 | 同上，`## 二、程序化纹理 / 生成物` 下是同一句空话 | **否 —— 全部 13 个被列在 `## 一、真实照片` 下，并附"照片来自 Wikimedia Commons、逐张作者与许可没有保留下来"** |
| S05 | `plate-brushed.png` 15,082、`plate-grain.png` 7,679、`plate-scanline.png` 89、`plate-wear.png` 10,913 | 4 | 有：`## 纹理（程序生成，不是照片）` | **是**（逐行给尺寸与挂载的伪元素） |
| S06 | `halftone-dot.png` 189、`ink-mottle.png` 7,190、`paper-grain.png` 23,273、`stain-ring-a/b/c.png` 21,151 | 6 | 有：`## 2 程序化生成的印刷纹理` | **是**（逐行给"程序化生成（Pillow）/（Pillow + numpy FFT）"与 α 上限） |
| **S08** | `detail.png` 2,391、`grime-macro.png` 36,232、`grime.png` 9,023、`overprint-offset.png` 18,271、`overprint.png` 17,992、`print.png` 1,581、`reg-cursor.svg` 199 | 7 | 同上，`## 二、程序化纹理 / 生成物` 下是同一句空话 | **否 —— 6 个 PNG 被列在 `## 一、真实照片` 下并附"缺署名"致歉**；`reg-cursor.svg` 两边都没有 |
| S09 | `cursor-brush.png` 249、`lamp-tube.png` 5,544、`lamp-tube-tight.png` 4,558、`rule-shake-ink.png` 167、`rust-corner-a/b/c/d.png` 15,211、`tile-paint-mottle.png` 45,419、`tile-wall-iron.png` 19,951 | 11 | 有：`## 2 程序化生成的纹理（无第三方署名）` | **是**（11 行全列，逐行写做法） |
| S10 | 无（生成物都叫 `texture-*`） | 0 | 有：`## 构建期生成的纹理（非第三方素材）` | **是** |
| S11 | `grain-128.png` 14,166 | 1 | 有：`## 2. 程序化纹理（3 张，无第三方素材）` | **是**（另有 `## 逐张说明与生成参数`） |
| S12 | `laminate-grain.png` 261、`cursor-square.png` 279、`cursor-square-stripe.png` 582 | 3 | 有：正文「程序化生成的纹理（Pillow，无第三方来源）：」 | **是**（4 行表，含未引用的 `stripe-45-tile.png` 也标为"备用"） |
| S14 | `bubble-field.png` 6,118、`foil-grain.png` 3,333、`foil-sheen.png` 1,080、`service-marks.png` 7,030 | 4 | 有：`## 三、程序化生成的纹理与标印（无第三方来源，Pillow 生成）` | **是** |
| S16 | `cursor-slant.png` 1,009、`paper-grain.png` 41,179 | 2 | 有：`## 程序化素材（非照片，无第三方署名）` | **是** |
| S15 / S18 / S19 / S20 / S21 / S22 / S23 / S24 / S26 / S27 / S28 / S29 / S30 | 0（生成物都叫 `texture-*`；S15 的也叫 `texture-*`） | 0 | 均有一节 ``texture-*` 表 + "生成物，非照片"或"无第三方权利"字样 | **是** |

**结论：30 案中 27 案如实标注，3 案不合规——S03、S04、S08。**
另有 6 案（S03/S04/S07/S08/S13/S17/S25 中的 6 个）的 `## 二、程序化纹理 / 生成物` 一节留着同一句**空话模板**：「（本目录没有以 `texture-` 命名的生成物；若有其他生成图版，见 `build/` 下的生成脚本。）」——其中 **S04 与 S08 说的是假话**（它们明明有 13 个 / 6 个非 `texture-*` 生成物），S03 也是假话（2 个）。S07/S13/S17/S25 说的成立（这 4 案 `assets/` 里确实没有生成物）。

### 4.2 三处不合规的具体修法

1. **S04**（13 个 / 1,707,150 B）：把 `assets/CREDITS.md` 的「一、真实照片」整节删掉（该案 `assets/` 根下没有一张第三方位图），改写成
   ```
   ## 一、程序化生成的丝网分色图版（生成物，非照片）
   ## 二、本目录不含任何第三方素材
   ```
   参数直接抄 `build/make-plates.py`：四色 `ORANGE=(150,85,15)` / `GREEN=(47,125,79)` / `BLACK=(20,16,12)` / `PAPER=(240,226,200)`，网点 `cell=8, angle=15.0`，套印错位见脚本内 `offset`；`torn-edge-*` 由 `build/make-torn.py`（4,442 B）生成。
2. **S08**（6 个 / 85,490 B + 1 个 SVG 199 B）：把 6 行从「一、真实照片」移到「二、程序化纹理（生成物，非照片）」，并把该节的空话模板替换成 `| 文件 | 生成器 | 参数 |` 三列表。**注意 `S08/build/` 目录根本不存在**（生成脚本 `build-assets.py` 在 `_CONTRACT.md:83` 被点名但没落盘），所以参数需要补：要么把脚本落到 `build/`，要么在表里写 `（构建脚本未随包保留；画面为矢量几何 + 1-bit 噪声，实测尺寸见下）` ——**但不能继续叫它照片**。
3. **S03**（2 个 / 55,186 B）：把 `grain.png`（37,697）与 `vignette.png`（17,489）从「盘上存在但署名表里没有对应记录的位图」移到「二、程序化纹理 / 生成物」，并注明生成器（该案根目录有 `make-masks.mjs` 4,167 B 与 `check-palette.mjs` 4,098 B；生成器名称需按实际补）。

---

## §5 "不伪造照片"承诺的兑现核验

承诺出处有两处，措辞不同：

- `prototypes/_CONTRACT.md:229`：「**绝对不要用生成图冒充照片。** … 题材对不上时（例如语料里没有爵士唱片）要在 CREDITS.md 里写明这个缺口，不要假装对上了。」
- `README.md:172`：「**题材缺口**：`S28「爵士凹版墙」`的可用语料里没有爵士唱片本身，只能用唱片机与印刷素材顶上；`S22`、`S23` 有类似妥协。**都写进了对应原型的 `CREDITS.md`**」

### 5.1 逐案判（30 / 30）

| 案 | 判定 | 依据 |
| --- | --- | --- |
| **S04** | **违反** | 13 张自产丝网分色图版被写成"从 Wikimedia Commons 抓的真实照片"，并为此编造"逐张作者与许可没有保留下来"的缺失。`build/make-plates.py:3` 自证"没有摄影原稿…直接生成"。**这是全库唯一把生成物说成第三方照片的案例**（S03/S08 是把生成物归错类，但没有声称它们是某张具体的 Commons 文件）。 |
| **S08** | **违反（程度轻）** | 6 张生成物写在「一、真实照片」下并附"照片本身是从 Wikimedia Commons 抓的"。没有编造具体来源，但"照片"这个词是错的；且与本案 `index.html:286`「均由构建期生成」直接矛盾。 |
| **S03** | **违反（程度最轻）** | `grain.png` / `vignette.png` 被列进「盘上存在但署名表里没有对应记录的位图」——这个标题本身不声称它们是照片，但把它放在「一、真实照片」这个二级标题下，读者会得出"第三方、署名丢了"的结论。 |
| **S07** | **如实（但记录不全）** | `index.html:170` 自述「图版来源：公有领域报纸缩微扫描（1902 年《同业世界》及同期地方报），扫描件经 100 线网点转印；代码与排版为本页自建」——**说了来源性质，没说作者与文件页**。`CREDITS.md` 的缺口声明也如实。属"来源未记录"，不是伪造。 |
| **S17** | **如实（但记录不全）** | 5 处 `<figcaption>` 逐张写 `Wikimedia Commons · 公有领域`，`index.html:184` 写「五张扫描件取自 Wikimedia Commons 公有领域档案，仅用于版式与票面比对」。**票种/年份/国别都说清了**。缺的是作者与文件页 URL。 |
| **S13** | **如实（且申报过度）** | `index.html` 5 条 `<span class="plate__credit">` 逐张写明「José Guadalupe Posada，1901，公有领域（CC0），The Metropolitan Museum of Art」等，`index.html:269` 有汇总段。CREDITS.md 却说自己缺记录——**是"少报了自己做到的事"**，与 S04/S08 方向相反。 |
| **S28** | **如实（全库最好的范本）** | ① 题材缺口写在 CREDITS.md 末尾以外还在 `index.html` 的正文里；② `CREDITS.md:3-8` 把"2026-10-18 04:15 之后图源全部不可用"的**环境事实逐主机列出**；③ `:7-8` 写明"复用的每一张都在下表里注明原本属于哪个方案"；④ `:14-19` 表里 5/6 行的"来源"列都写了「Wikimedia Commons（为本方案抓取）」；⑤ 表末还留着 `reuse-s25-plate5.jpg` 一行（该行来源写 `—`，见 R-02）。**README 说"S28 有妥协"，S28 自己说得比 README 详细。** |
| **S22** | **如实（记录不全）** | `CREDITS.md:3-8` 有与 S28 同款的环境事实说明与"复用的每一张都注明原本属于哪个方案"。但 4 行的来源列写 `—`（R-02）。 |
| **S23** | **如实（记录最差）** | 结构照抄 S28（`:3-8` 环境事实 + `:8` 复用注明），但**6 行里 5 行的许可写 `见来源页`、来源写 `—`**。声明说"下表里注明原本属于哪个方案"——文件名前缀 `reuse-s07-` / `reuse-s13-` 确实注明了，但**许可靠"见来源页"三个字顶不住**。 |
| S01 | 如实 | CREDITS.md 逐张给原件页与许可，第 8 行主动标"（备用）"。 |
| S02 | 如实（且是唯一声明派生许可的） | `CREDITS.md:14`「**衍生图沿用原图的许可**（CC BY-SA 3.0 那张的衍生图同样以 CC BY-SA 3.0 提供）」+ `:51-65` 主动登记未引用的备用位图。 |
| S05 | 如实 | 逐张给作者/许可/原始页面；`assets/source/` 说明为"存档原图，不参与渲染"。 |
| S06 | 如实 | `CREDITS.md:41` 明确写「`origin/` 中的文件全部被引用；**没有被页面引用却留在盘上的原稿一个也没有**」——**这条自检结论是错的**（`origin/` 7 个文件全都没被页面引用，见 §1.1），但"没有伪造"这一条成立。 |
| S09 | 如实 | 8 行源片许可齐全；未接线的 2 张（`shop-owner-bench.jpg`、`worker-brush.jpg`）在 `:27-44` 有完整许可记录，只是没有"印版"行暗示其未用。 |
| S10 | 如实 | `credits.json` 用 `file`（成品）+ `raw`（原图）双字段；CREDITS.md 有「改作说明」一节。 |
| S11 | 如实 | `credits.json` 顶层 `note` 原文：「页面只发布灰度两阶抖动的图版；原图与重算脚本留在 `build/`，不进 `assets/`。所有图版均来自 Wikimedia Commons，许可为公有领域或 CC BY / CC BY-SA；程序化纹理不含任何第三方素材。」 |
| S12 | 如实 | `CREDITS.md:10` 主动降级声明：「**照片内容与本案页面无关**，它们是孟菲斯层压板家具、街机丝印面板与层压板样张的公开照片，仅用于验证规格字段 6④…的实现方式。」——**这是"承认素材与题材不对应"的正面案例**。 |
| S14 | 如实 | 四节结构（真实照片 / 双色调图版 / 程序化纹理与标印 / 复算方式），第二节标题即「由上面的照片烘焙，不是新素材」，每行都写清 `plate-NN ← cabin-NN`。**唯一缺陷是"页面里用在哪"列 28 处全是没刷新的「待页面引用（index.html 未落盘）」（R-17）。** |
| S15 | 部分 | `:13` 写了「题材：渔船／渔网／港湾（摄影）＋ 两件档案图纸扫描（HAER 测绘图纸页、1903 年英国海军部海图）」；但页面实际引用的 6 张成品在表里无行（R-07），且 `:17-22` 的"页面里用在哪"全写"待页面引用"（7 处，R-17）。**素材与题材是对应的**（渔船/港湾/海图都在），所以不构成题材缺口；问题是记录。 |
| S16 | 如实 | `:19-26` 有「## 题材说明」逐张解释为什么选它；`:8` 明写"本页实际引用 6 张"并列出 6 个文件名。 |
| S18 | 如实 | `credits.json` 的许可值写「公有领域（NASA 图像使用条款）」，MD 里 `## 一、真实照片`。 |
| S19 | 如实 | 同上结构。 |
| S20 | 部分 | `:3-8` 环境事实 + 复用注明齐全；2 行 `见来源页`（R-02）。 |
| S21 | 如实（登记最完整） | `:3-12` 把网络窗口写到时分级（"2026-10-18 04:16–04:42 图源尚可用的那个窗口"）；`:44-47` 逐张目视核对画面内容（"这 6 张都不含火车、蒸汽机车与制服"）；`:68-85` 第四节 6 张未引用的照片**逐张给了 reason**；`:83-85` 明确写「**这是题材缺口，不假装对上了。**」 |
| S24 | 如实 | NASA 图像 + `reuse-*`；1 行 `见来源页`。 |
| S25 | 如实 | 5 行作者与许可齐全（来源页列被生成器丢成 `—`，R-08）。 |
| S26 | 如实 | 6 行齐全。 |
| S27 | 如实 | 6 行齐全，含 1909《费加罗报》未来主义宣言等具体原件。 |
| S29 | 如实 | 6 行齐全。 |
| S30 | 如实 | 6 行齐全；2 行缺 URL。 |

### 5.2 5.1 的结论

**承诺总体兑现：30 案里 3 案违反（S04 / S08 / S03），且违反的都是"把自己做的东西说成照片"，不是"把别人的照片说成自己的"。**
**"题材对不上就如实写"这一半：做得比 README 自述的更好。** README 只点了 `S28` / `S22` / `S23` 三案"有妥协"，实际主动声明题材错位的至少还有 **S12**（`CREDITS.md:10`：「照片内容与本案页面无关」）、**S16**（`## 题材说明` 逐张解释）、**S15**（`:13` 题材说明）、**S21**（`:44-47` 逐张目视核对 + `:83-85` 明写"不假装对上了"）。**即：承诺的兑现面被 README 低估了 4 案。**

**附带反证（顺手核到的记录错误）**：`S06/assets/CREDITS.md:41` 写「`origin/` 中的文件全部被引用；没有被页面引用却留在盘上的原稿一个也没有」——**这句话是错的**：`origin/` 下 7 个文件（共 4,426,361 B）**全部未被页面引用**（§1.1），页面用的是 `plate-*.jpg`。这条自检结论要么是脚本没跑，要么是判断逻辑写反了。

---

## §6 模板层"零第三方素材"声明核验

**声明出处**：`README.md:158`「**大众模板不含任何第三方素材**——图片位是内联 SVG 占位框，没有授权问题。」（`README-EN.md` 对应句在 :157 一带）

**核验对象**：`templates/M01-clean-corporate/`、`M02-warm-local/`、`M03-bold-creator/` 的全部 4 类文件（`index.html` / `style.css` / `README.md` / `TOKENS.md`）= 12 个文件 / 200,717 B。

**核验方法与逐文件结果**（脚本 `_crit7b/tmpl.mjs`）：

| 检出项 | M01 index.html (25,283) | M01 style.css (19,422) | M02 index.html (26,589) | M02 style.css (19,990) | M03 index.html (13,049) | M03 style.css (13,392) |
| --- | --- | --- | --- | --- | --- | --- |
| `http(s)://` | 0 | 0 | 0 | 0 | 0 | 0 |
| `@font-face` / `@import` | 0 | 0 | 0 | 0 | 0 | 0 |
| `data:`（含 data URI / base64） | 0 | 0 | 0 | 0 | 0 | 0 |
| `<link>` | 1（`rel="stylesheet" href="style.css"`，同目录） | 0 | 1（同上） | 0 | 1（同上） | 0 |
| `<script>` | 0 | 0 | 0 | 0 | 1（**内联，无 `src`**） | 0 |
| 位图/字体扩展名 | 0 | 0 | 0 | 0 | 0 | 0 |
| `url(...)` | 1（`url(#phGridHero)` —— **SVG 片段引用，不是文件**） | 0 | 0 | 0 | 0 | 0 |
| `<img src=…>` | 2 —— **均在 HTML 注释里**（第 32 行 `<!-- 想换成真图片：把整个 <svg> 换成 <img src="logo.svg" …> -->`、第 88 行同类） | 1 —— **在 CSS 注释里** | 1 —— **在 HTML 注释里** | 1 —— **在 CSS 注释里** | 0 | 1 —— **在 CSS 注释里**（第 387 行 `你不需要改 CSS，只要把 <svg class="ph">…</svg> 整段换成 <img src="…" alt="…"> */`） |
| `<svg>` | 有（内联图形，`role="img"` + `aria-label`） | 0 | 有（1 个 `<symbol>` sprite + 多处 `<use href="#…">`） | 0 | 有 | 0 |

**逐文件核验结论（含最容易漏的三类）：**

1. **内联 SVG**：M01 的 `brand-mark`（viewBox 0 0 32 32）、`shot-svg`（1200×750 占位框）、5 个 `logo-ph`（200×64）、柱状图（1200×300）；M02 的 `svg-sprite`（内含 `<symbol id="squiggle">`、`<symbol id="ph-glyph">`）+ 4 个 `ph-art`（1600×900 / 1200×800 / 900×900 ×2）+ 4 处 `<use href="#squiggle">`；M03 的 5 个 `ph`（1600×900 / 1200×800 / 800×1000 / 1000×1000 / 1200×900）。**全部为模板自带绘制，`viewBox` 与 `aria-label` 都指向"占位框"，无一处引外部路径、无一处 `foreignObject`。**
2. **data URI**：全 12 个文件 `data:` 命中 **0**。（对比：原型侧的 S08 用 `data:image/svg+xml` 做斜纹 pattern、S21 用 `data:image/svg+xml;utf8`、S12 的 45° 斜纹也走 CSS 内联 SVG pattern —— **模板层不依赖这条路线，所以声明是稳的。**）
3. **字体栈**：M01 用 `var(--font)`（在 `TOKENS.md` 里定义，`TOKENS.md` 有 1 处 `@font-face` **说明文字**，不是声明）；M02 用 `var(--font-sans)` / `var(--font-serif)`；M03 `style.css:37` 用 `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, …` —— **都是系统字体栈，没有一处 `@font-face` 声明、没有一处 woff2 引用**。这条与 §7 的原型侧形成鲜明对比（原型侧 80 个 woff2 不在共享缓存里，见 §7.3）。

**判定：声明成立。`templates/M01/M02/M03` 的 `index.html` 与 `style.css` 里没有任何第三方素材——0 个外部 URL、0 个位图文件、0 个字体文件、0 个 data URI。**
唯一需要注意的不是"素材"，是**注释里的示例代码**：M01 的注释里有 `logo.svg` / `hero.jpg`，M03 的注释里有 `…`；这些都是给使用者的替换示范，写在注释里，不影响声明。

---

## §7 字体许可核验

**声明出处（三处，措辞必须逐字看）：**

- `README.md:151`：「**字体**（`prototypes/_fonts/`）｜各字体原有许可，绝大多数为 **SIL OFL 1.1**…**来源与许可见 `_fonts/css/*.css` 文件头注释**」
- `LICENSE:12-14`：「1. 字体（`prototypes/_fonts/`）各字体保留其原有许可，绝大多数为 SIL Open Font License 1.1，少数为同类可商业使用许可。**每一族的来源与许可见 `_fonts/css/*.css` 的文件头。**」
- `README.md:12`（依赖节之上）：字形来源为 Google Fonts／官方包

### 7.1 共享缓存 `prototypes/_fonts/css/*.css` —— 48 / 48 逐文件核

| 指标 | 结果 |
| --- | --- |
| 文件数 | **48** |
| 有 `/* … */` 文件头 | **48 / 48** |
| 文件头里写了**来源**（`来源：https://…` 或 `上游：https://…`） | **48 / 48**（其中 `fonts.googleapis.com/css2?family=…` **42** 个；`github.com/lvwzhen/glow-sans` 3 个；`github.com/rektdeckard/departure-mono` 1 个；`cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0` 1 个；`cdn.jsdelivr.net/npm/@free-fonts/zhuque-fangsong@1.0.0` 1 个） |
| 文件头里写了**许可** | **4 / 48** |

**写了许可的 4 个**（都是手写头，非 `fetch-fonts.mjs` 生成）：
- `departure-mono__400.css`（883 B）——「族：Departure Mono（**OFL 1.1**，像素等宽，笔画对齐 5x7 字模网格）」
- `glow-sans-sc__400-500.css`（1,794 B）——「族：Glow Sans SC ＝未来荧黑（**OFL 1.1**，骨架硬且几何的黑体，规格局 C5）」
- `glow-sans-sc-s12__400-500.css`（1,529 B）—— 同上，「重骨架几何黑体」
- `glow-sans-sc-s18__400-500.css`（1,543 B）—— 同上，「硬骨架几何黑体，笔画端头平直」

**没写许可的 44 个**（全部由 `prototypes/_build/fetch-fonts.mjs` 生成，文件头只有一行 `来源：https://fonts.googleapis.com/css2?family=…&display=swap */`，**没有任何 `许可` / `license` / `OFL` / `Apache` / `MIT` 字样**，实测 grep 命中 0）：

`alfa-slab-one__400.css` 1,455、`anton__400.css` 1,360、`antonio__400-600.css` 1,813、`archivo-black__400.css` 1,071、`archivo-vf__wdth-wght.css` 1,566、`barlow__500-600.css` 2,543、`besley__400-700.css` 1,797、`bodoni-moda__400-700.css` 7,663、`bricolage-vf__wdth-wght.css` 1,717、`chivo__700-800.css` 2,499、`dm-mono__400-500.css` 1,821、`eb-garamond__400-600.css` 4,853、`fragment-mono__400.css` 1,374、`gloock__400.css` 1,290、`ibm-plex-mono__400-500.css` 3,870、`ibm-plex-mono__400-600.css` 3,871、`ibm-plex-sans__400-600.css` 4,935、`instrument-serif__400.css` 1,097、`jetbrains-mono__500.css` 2,473、`jost__500.css` 1,301、`literata__400.css` 2,705、`literata__400-600.css` 5,435、`literata__400-600-700.css` 8,038、`lxgw-marker-gothic__400.css` 126,594、`lxgw-wenkai-tc__400.css` 127,802、`lxgw-wenkai__400.css` 105,585、`martian-mono__400-500.css` 3,367、`martian-mono__400-600.css` 3,367、`martian-mono-narrow__wdth75-400-600.css` 3,472、`newsreader__400-600-700.css` 3,955、`noto-sans-sc__100..900.css` 111,916、`noto-serif-sc__400-700.css` 223,569、`oswald__400-600.css` 3,954、`petrona__400-600-700.css` 3,699、`reddit-mono__400-500.css` 2,631、`saira-condensed__700.css` 1,491、`sometype-mono__400-600.css` 1,905、`source-serif-4__400-600.css` 4,709、`space-grotesk__400-500.css` 2,673、`space-mono__400-700.css` 2,619、`spectral__400-600.css` 3,699、`syne__700.css` 1,319、`vt323__400.css` 1,360、`zhuque-fangsong__400.css` 45,353

### 7.2 判定

- **"来源"那一半：完全成立。** 48 个样式表、871 个 woff2 分片（30,324,228 B）全部有可追的上游 URL，无一来源不明。
- **"许可"那一半：不成立，44 / 48 缺失。** `README.md:151` 与 `LICENSE:13-14` 都明写"来源**与许可**见 `_fonts/css/*.css` 文件头注释"——这句话在 44 个文件上是假的。**这是一个纯文字层面的可修缺陷**（不是许可本身有问题：这 44 族里 Google Fonts 渠道的全是 OFL 1.1 或 Apache-2.0，两个 driv 直取的也标了 OFL 1.1），但**声明与实物不一致**。
- **重点可疑的两支**（真要判定需要联网，本次不做）：
  - `lxgw-wenkai__400.css`（105,585 B）—— 上游写的是 `cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/lxgwwenkai-regular.css`，**这是第三方 npm 重打包，不是字体的官方发布渠道**（官方是 `lxgw/LxgwWenKai`）；且该文件**连 `族：` 行都没有**（48 个里仅 2 个缺 `族：`，另一个是 `zhuque-fangsong__400.css`）。
  - `zhuque-fangsong__400.css`（45,353 B）—— 上游是 `cdn.jsdelivr.net/npm/@free-fonts/zhuque-fangsong@1.0.0/zhuque-fangsong.css`，`@free-fonts/` 是一个 **npm 上的第三方字体搬运组织**，不是朱雀仿宋（TrionesType）的官方渠道；同样缺 `族：` 行，也没有许可。
  - 这两支对应 97 + 187 = **284 个 woff2 分片 / 9,803,480 B**，是全库字体体积里除 Noto 之外最大的一块。**建议给这两支补上"官方仓库地址 + 许可"两行**（朱雀仿宋与霞鹜文楷都是 OFL 1.1），否则它们是"来源可追、但可追到一个搬运站"的状态。
- **S21 的字体账是全库唯一完整的**：`prototypes/S21-interlocking-release-book/fonts/` 71 个 woff2（167,228 B）+ **`LICENSE-WenJinMincho.txt`（5,356 B，授权全文随字面交付）**，CREDITS.md §三 写明"中文主字体文津宋体的子集按 GB2312 一级字库裁切，71 片 woff2、合计 163.3 KB，授权全文随字面交付：`fonts/LICENSE-WenJinMincho.txt`"。**这是"把许可随交付一起发"的正确做法，其余案可照抄。**

### 7.3 原型侧另有 80 个 woff2 不在共享缓存里（`_fonts/` 之外）

`prototypes/_fonts/files/**` 之外还散着 **80** 个 woff2（S04 4 个 70,464 B、S07 4 个 68,052 B、S08 1 个 14,708 B、S21 71 个 167,228 B）：

| 案 | 文件 | 字节 | 是不是共享缓存里的同一份 | 许可记录 |
| --- | --- | --: | --- | --- |
| S04 | `assets/fonts/unbounded-latin-700.woff2` | 21,092 | 否（`_fonts/files/` 下没有 `unbounded`） | **无** |
| S04 | `assets/fonts/redaction-latin-400.woff2` | 28,392 | 否（无 `redaction` 目录） | **无** |
| S04 | `assets/fonts/martianmono-latin-400.woff2` | 10,352 | 否（缓存有 `martian-mono`，但文件不同） | **无** |
| S04 | `assets/fonts/martianmono-latin-600.woff2` | 10,628 | 否 | **无** |
| S07 | `assets/fonts/libre-franklin-700.woff2` | 15,372 | 否（无 `libre-franklin` 目录） | **无** |
| S07 | `assets/fonts/libre-franklin-800.woff2` | 15,380 | 否 | **无** |
| S07 | `assets/fonts/newsreader-400.woff2` | 22,488 | **否**（缓存里 `newsreader` 只有 3 片，且尺寸不同） | **无** |
| S07 | `assets/fonts/ibm-plex-mono-400.woff2` | 14,812 | **否**（缓存 `ibm-plex-mono` 15 片） | **无** |
| S08 | `assets/fonts/plex-numerals.woff2` | 14,708 | **是 —— SHA-1 `bb87500e3204` 与 `_fonts/files/ibm-plex-mono/f0d72638--F63fjptAgt5VM-kVkqdyU8n1i8q1w.woff2` 完全相同** | **无** |
| S21 | `fonts/wenjin-*.woff2` ×71 | 167,228 | 否 | **有**：`fonts/LICENSE-WenJinMincho.txt` 5,356 B + CREDITS.md §三 |

- **F-01【P2】**：S04 与 S07 的 `assets/CREDITS.md` §三 都写「页面字体**全部**自托管在 `prototypes/_fonts/`」——**在 S04 上差 3 支、在 S07 上差 4 支**。Unbounded / Redaction 20 / Libre Franklin 三族在 `_fonts/css/` 里**没有对应样式表**，所以任何按 README 去 `_fonts/css/*.css` 查许可的人查不到它们。
- **F-02【P2】**：S04 与 S07 的这 8 个 woff2 **在仓库里没有任何许可记录**——本文件的 §7.1 表覆盖不到它们，各案 CREDITS.md 也没写。修法：在 S04/S07 的 `assets/CREDITS.md` §三 里改成「页面字体自托管于两处：共享缓存 `prototypes/_fonts/`（见其 `css/*.css` 头）与本目录 `assets/fonts/`（Unbounded OFL 1.1 / Redaction OFL 1.1 / Libre Franklin OFL 1.1）」，并在 `assets/fonts/` 下加一句 `PROVENANCE.txt` 写上游 URL。
- **F-03【P3】**：S08 的 `plex-numerals.woff2`（14,708 B）是**共享缓存里同一份的逐字节副本**，且两边都没提它。删掉它并让 `style.css` 指向 `../../_fonts/files/ibm-plex-mono/…woff2`，或在 CREDITS.md 里注明它是缓存副本。
- **F-04【P3】**：S07 的 `style.css` 里 `--display` 字体栈写的是 `"Libre Franklin","WenJin Mincho","文津宋体",…` —— **`WenJin Mincho` / 文津宋体在 S07 里根本没有分发**（它只被 S21 分发）。这个栈里的第二、三段是永不会命中的死项。**不是许可问题（没分发就不涉及授权），但是栈失真**：要么删掉这两段，要么把 S21 的 71 片引过来（那就要连同 `LICENSE-WenJinMincho.txt` 一起引，像 S21 那样）。

---

## §8 我判为"没问题、不用改"的项（说明凭什么）

| 项 | 凭什么判没问题 |
| --- | --- |
| **S03 / S08 / S11 / S17 / S18 / S19 / S20 / S22 / S23 / S24 / S25 / S26 / S27 / S28 / S29 / S30 的"未引用 0 个"** | 逐文件扫 398 张图像 + 65 个源文件，16 案的全部 `assets/` 图像都能在 `index.html` / `style.css` 里找到路径形态的引用（§0.2 的四条抽取规则全部命中过）。这 16 案的"素材全部接线"是实测结论，不是估计。 |
| **S01 的 `halftone-07-mergenthaler.png` 74,288 B** | CREDITS.md:20 的"页面里用在哪"列写的是 `—（备用）`，且该行仍有完整的原件页/权利人/许可/原始像素四字段。**未引用 + 已声明 + 有许可 = 合规。** |
| **S02 的 17 个未引用项（5,373,759 B）** | CREDITS.md 有专门一节「3. 并行构建留下的备用位图（本页**未引用**，保留以便比对）」，按生成器分成两组点名，并写明"许可同第 1 节"；`_raw/` 5 张在 :27-35 用 `_raw/xxx.jpg ← Commons 文件名` 逐条对应。**这是"备了不用但账目完整"的范本。** |
| **S06 的 `origin/` 7 个与 `cursor-spoon.png`** | `origin/` 在 CREDITS.md:9 说明用途（"未经处理，仅供复核分色是否忠实"）；`cursor-spoon.png` 在 :31 明确标"当前页面未引用，留在盘上备查"。**都在账上。**（:41 那句"没有被页面引用却留在盘上的原稿一个也没有"写错了，属 R-16 之外的记录 bug，已在 §5.2 记一笔。） |
| **S12 的 `stripe-45-tile.png` 124 B** | CREDITS.md:27 写明"16×16 **备用**印纹（页面正式的斜纹走 CSS `data:image/svg+xml` 的 SVG pattern）"。**已声明 + 已给替代方案 = 合规。** |
| **S15 / S05 / S09 / S10 / S13 的"原始池"（`source/`、`raw/`、`src-*`、`*-raw`）** | 用途在各自 CREDITS.md 有说明（S15 §一标题即"页面用第二节的双色阶版"；S05:3"存档原图，不参与渲染"；S09:21"仅供复核"；S10 首节标题"位图（随页面发布）"；S13 命名前缀 `src-` 与成品 `plate-` 分离清晰），且**许可记录跟着它们一起走**。它们的问题只是位置（R-04），不是"没做完"。 |
| **S14 的 12 张 `cabin-*` + 2 张 `pad-*` + 4 张 `plate-04/06/08/12`（19 个 / 5,125,906 B）** | ① **许可账是全的**：§一 14 行给了每张的原件文件页 / 权利人 / 许可 / 源图像素，§二 14 行给了 `plate-NN ↔ cabin-NN` 映射与署名；② 其中 `cabin-04/05/10` 与 `plate-05` 的**同一批字节**还出现在 S20 与 S21 的 `assets/`（SHA-1 相同，R-12）且那两案的 `credits.json` 也带完整许可；③ S21 在 `credits-unused.json` 里逐张写了不引用的 reason（"不是座舱：博物馆库房里悬挂的红白蓝条纹特技机"）。**唯一缺陷是"页面里用在哪"列没刷新（R-17），不是缺记录。** |
| **S21 的 12 个 `.avif`（203,930 B）** | CREDITS.md:38 的"页面不引用"一行给了完整技术理由：规格要求产出两版，但 Pillow 的 AVIF 写不了 `lossless=True`（`quality=100 + subsampling='4:4:0'` 也仍把纸色 round 成 `(227,220,200)`，1440 档 1:1 渲染实测从 2 色变 244 色），且 6 张 AVIF 合计 184 KB 是 WebP 57 KB 的 3.2 倍。**"按规格产出、按实测否决、并把否决理由写进账"= 不是遗漏。** |
| **S21 的 `assets/_cand/` 28 张** | 判据与结论见 §1.3：命名分离 + `candidates.json` 逐张记许可 + `credits.json` 每行 `candidate` 字段双向映射。**判为候选池，不计入未引用。**（唯一缺陷 `sheet.jpg` 176,495 B 无记录，R-15。） |
| **`templates/M01..M03` 的"不含任何第三方素材"** | §6 逐文件核完：0 外部 URL、0 位图、0 字体、0 data URI，`<img src>` 与 `.jpg` 全部出现在注释的替换示范里。**声明成立。** |
| **48 个 `_fonts/css/*.css` 的"来源"部分** | 48 / 48 都有可追的上游 URL（42 个 `fonts.googleapis.com/css2`、3 个 `github.com/lvwzhen/glow-sans`、1 个 `github.com/rektdeckard/departure-mono`、2 个 `cdn.jsdelivr.net`）。**"来源不明"的字体一个都没有。** |
| **S21 的 `fonts/LICENSE-WenJinMincho.txt` 5,356 B** | 授权全文随字面交付，CREDITS.md §三 点名指向它。**这是全库唯一把字体许可全文打包的做法，是正例。** |
| **S01 / S02 / S09 / S12 / S16 的"页面只引用本地、无远程资源"** | 30 / 30 案的 `index.html` + `style.css` 里 **`src`/`srcset`/`poster`/CSS `url(http…)` 命中 0**（脚本 `_crit7b/hrefcheck.mjs`）。12 案含 `https://commons.wikimedia.org/…` 或 `https://images-assets.nasa.gov/…`，逐条核过**全部是署名用 `<a href>`**（S14 9 条、S18 12 条、S24 11 条、S26 12 条、S29 12 条、S15 7 条、S27 7 条、S30 5 条、S28 5 条、S25 5 条、S19 4 条、S23 1 条）。**`_CONTRACT.md:78` 的硬规则成立，且这 12 案的做法比规则更严——它们把署名链接做到了页面里。** |
| **CC0 / 公有领域 那 67 行（56 行公有领域/NASA + 11 行 CC0，见 §2.3）** | 这些许可不要求署名、不要求相同方式共享。**它们不是问题源**；本次所有风险都集中在 CC BY（31 行）与 CC BY-SA（48 行）这两类上。 |
| **`LICENSE:27-30` 的第三方工具声明** | 「taste-skill（MIT）／impeccable（Apache-2.0）**均未包含在本仓库中**，请向各自仓库获取并遵守其许可」——实测仓库内无这两个项目的任何文件/子模块（根目录只列到 `tools/`，且 `README.md:164` 声明"不使用任何第三方设计审查工具"）。**声明与实物一致。** |

---

## §9 本次审查的限制

1. **没有核网络上的原始出处，也不假设能核。** 本环境直连外网基本不通（`_CONTRACT.md` §10 实测：`commons.wikimedia.org` / `upload.wikimedia.org` / `www.wikidata.org` / `en.wikipedia.org` 连发 10 次成功率 0/10；`archive.org`、`api.openverse.org`、`duckduckgo.com` 超时；`www.loc.gov` / `tile.loc.gov` / `picryl.com` / `www.pexels.com` / `pixabay.com` 403；`collectionapi.metmuseum.org` 的 search 端点 410）。因此：
   - 本次**只判"仓库内部申报链条是否自洽"**（`credits.json` → `CREDITS.md` → 实际引用文件）。
   - **不判**某个 `credits.json` 里写的 `CC BY-SA 4.0` 在 Commons 文件页上是否真的成立、作者名是否拼对、是否存在更早的权利人。
   - **不判**上游是否已删除/改版（R-02 的 `见来源页` 有一部分可能就是因为文件页已不可达而被迫留白——但即便如此，**在同一个 json 里不写 URL 仍是可修的**）。
   - §7.2 那两支 `cdn.jsdelivr.net` 字体的"官方仓库是不是这个"只是**基于命名常识的可疑标注**，不是结论。
2. **PHP/JS 动态拼接的路径只做了有限覆盖。** §0.2 的四条规则能抓住字符串字面量、属性值、`url()`、内联 style；如果某案用 `'assets/' + name + '.png'` 这种**运行时拼串**引用图片，我的判定会把它算成未引用。**实测 30 案里没有这种写法**（各案 `src` 全是字面量，S07 的 `app.js` 6,332 B 与 S13 的 `_fillmap.mjs` 5,745 B 也逐文件进过语料），但这是方法上的已知边界，写在这里备查。
3. **`.inspect/` 与 `build/` 不计入"未引用"，这是有意的。** 310 张渲染截图（54,886,299 B）是取证层、244 个 `build/` 文件（60,268,698 B）是中间层。若把它们算进去，"未引用"会从 111 个涨到 392 个 / 101,938,794 B（第一版脚本的原始输出）。**我认为把它们算进去是错的**：`.inspect/` 是渲染证据（`_CONTRACT.md:122` 要求存在），`build/` 是复算输入（`LICENSE:24` 明确说生成参数落在这里）。但 `assets/` **内部**的 `_raw`/`source`/`origin`/`raw` 我计入了，理由见 §1 标题下那句注释——它们和被引用的成品在同一个交付目录里。
4. **"生成物"与"照片"的归类是人工判断，不是自动检测。** 我用了三条交叉证据：① 文件名规则（`texture-*` / `*-grain` / `cursor-*` / `halftone-*` 等）；② 该案 `build/` 下是否存在对应生成器（如 `make-plates.py` / `make-textures.py` / `make-torn.py` / `bake-duotone.py` / `make-salon-assets.py`）；③ 生成脚本里有没有图片输入（S04 `make-plates.py` 只 import `math, random, PIL`，无输入 → 纯生成）。**没有逐张读取生成脚本全文**，所以 §4.1 的 S02、S03、S05、S09 四案的"生成物"定性有少量推断成分（但这四案的 CREDITS.md 自己都写了生成器名，与我一致）。
5. **BOM 陷阱已处理，但读法本身值得记一笔。** 多数 `credits.json` 由 PowerShell 写出、带 UTF-8 BOM，有的还是 UTF-16LE（S01 的 `build/raw/credits.json` 与 `build/raw-s01/credits.json`、S02/S05/S06/S09/S11/S13/S15/S25 的 `assets/credits.json` 都是）。本报告统一用 `_crit7b/lic2.mjs` 的 `readJsonLoose()` 读（检测 `FF FE` / `FE FF` / `EF BB BF` 三种前缀）。**第一版脚本没处理这个，把 9 个案的 `credits.json` 全判成 `PARSE-ERROR`，会让 §2 的"链条对不上"凭空多出 9 条假指控。** `_CONTRACT.md:233` 已经记过这个坑（"我的语料索引第一版就是因为这个，把 S01／S14／S15 等一大批方案的素材全漏掉了"）——**同一个坑在本次重跑时又踩了一次**，值得作为工具层的待修项。
6. **没有跑浏览器验证 `credits.json` 里写的尺寸/字节与实测是否一致。** §1 的尺寸/字节全部是 Pillow / `Get-Item` 实测值，没有与任何 `credits.json` 里的 `width`/`height` 字段比对（S06、S10、S13、S14、S15 的 json 里有这两个字段）。若需要，"申报尺寸 vs 实测尺寸"可以做下一轮。
7. **本轮未改动任何文件**，除 `deliverables/30-critique-assets-license.md`（本文件）与 `_crit7b/`（临时脚本与中间 JSON）。所有原型、模板、脚本、README、既有 deliverables 一字未动。审查用脚本清单：`_crit7b/{scan,scan2,evid,xref,xref2,xref3,lic,lic2,licsum,pageurl,rows,cand,dupe,dims.py,dims.json,misc,tmpl,hrefcheck,fonts,fonts2,gen,gen2,gen4,stmt,dbg}.{mjs,py}`。
8. **"最该优先处理的 3 条"已在 §3 按 R-01 / R-02 / R-03 排序**，不再另立一节；如果只做一件事，做 R-01 的第 1 条（改声明 + 加限定），因为它把"声明与交付形态不一致"这个当前最大的自相矛盾就地闭合，且不需要联网、不需要动素材。
