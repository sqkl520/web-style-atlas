# 23 · 视觉审查 · 批次 3（S21–S30）

> 状态：**进行中**（本文件按案增量写入；每查完一个案子立即追加一节）
> 审查对象：`prototypes/S21-*` … `prototypes/S30-*` 共 10 个原型
> 审查员：视觉审查员（只读审查，未修改任何原型文件）
> 写入范围：本文件 + `_audit3/`

---

## §0 方法论与自查

### 0.1 本次使用的链路

（待填：静态服务器 + CDP 直连，三档 390 / 768 / 1440）

### 0.2 三档页高（真实测量值）

| 案 | 目录 | 390 档页高(px) | 768 档页高(px) | 1440 档页高(px) | 截图张数 390/768/1440 |
|----|------|----------------|----------------|-----------------|----------|
| S21 | `S21-interlocking-release-book` | 7304 | 2508 | 2581 | 9 / 3 / 3 |
| S22 | `S22-paper-screen-folded-sheet` | 14682 | 11842 | 9943 | 18 / 12 / 12 |
| S23 | `S23-exposed-plaster-chronology-wall` | 13931 | 12747 | 9626 | 17 / 13 / 11 |
| S24 | `S24-cyanotype-rainforest-path` | 15388 | 14020 | 10533 | 19 / 14 / 12 |
| S25 | `S25-spotcolor-contents-zine` | 10069 | 9022 | 6912 | 12 / 9 / 8 |
| S26 | `S26-geometric-collision-columns` | 17446 | 17097 | 10916 | 21 / 17 / 13 |
| S27 | `S27-hand-painted-bill-dispatch` | 18220 | 17743 | 11197 | 22 / 18 / 13 |
| S28 | `S28-jazz-intaglio-wall` | 20447 | 10981 | 9949 | 25 / 11 / 12 |
| S29 | `S29-wire-bound-safety-manual` | 22877 | 15824 | 12526 | 28 / 16 / 14 |
| S30 | `S30-skate-sticker-split` | 12725 | 11698 | 9841 | 16 / 12 / 11 |

页高 = CDP `document.documentElement.scrollHeight`（static HTTP 链路，字体 `status=loaded`）。

**`innerWidth / scrollWidth / clientWidth` 复核（全 30 档）**：除 **S28 的 390 档 `scrollWidth=424 > clientWidth=390`**（见 §S28-F1）外，其余 29 档全部 `innerWidth === clientWidth === scrollWidth`，即无文档级横向滚动条。CLI `--window-size` 的 500px 假视口在本批次中**完全未使用**，所有数字均出自 `Emulation.setDeviceMetricsOverride`。

### 0.3 CDP 复核的结论清单

（待填）

### 0.4 本次自查出的工具缺陷

（待填）

---

## S21 （interlocking-release-book）

**链路**：HTTP 静态服务 `http://127.0.0.1:8795` + CDP `Emulation.setDeviceMetricsOverride` 三档 + Pillow 像素复核。
**三档实测**：`innerW=scrollW=clientW` = 1440 / 768 / 390（无横向滚动条）。

### 三档页高与截图

| 档 | 视口 | 页高 scrollHeight | 屏数 | 末屏 realY |
|----|------|-------------------|------|------------|
| d | 1440×900 | **2581** | 3 | 1681 |
| t | 768×1024 | **2508** | 3 | 1484 |
| p | 390×844 | **7304** | 9 | 6460 |

### 实际看了哪几张图（逐张用读图能力看过）

`shot/S21-interlocking-release-book-d-01.png`、`-d-02.png`、`-d-03.png`、
`-p-01.png`、`-p-02.png`、`-p-07.png`，
放大裁剪 `z-s21-rail-d.png`（从 `-d-01.png` 裁 (570,575)-(720,900) ×3 放大）。
另用像素普查/几何探针复量了 `-t-*`、`-p-03..06,08,09`、`S21-excl-{d,t,p}.png` 对应区域（见下文数值），但**未逐张目视**。

---

### S21-F1 ｜ 阻断 ｜ 390 档：两张主表的 `caption` 被压成「一字一行」的竖排字柱

- **现象**：`#turnout-table` 与 `#signal-table` 的表题在 390 档被挤成 16px 宽、260px 高的竖条，**每行只放 1 个字**，跨屏显示。
- **证据**：
  - 几何（CDP 实测，`s21.json`）：`caption` 盒 = **x=56, y=789, w=16, h=261.9**；`#signal-table` 的 `caption` = **w=16, h=236.3, y=3072**。两者 `display` 仍为 `table-caption`，而 1440/768 档同一个 caption 是 **w=520.4 / w=319, h=31.6**。
  - 目视：`S21-interlocking-release-book-p-02.png`（该屏对应 y=844–1688）顶部可直接看到 **「联 / 锁 / 表 / · / 1 / 至 / 12 / 号」纵向逐字堆叠**，字柱从上一屏 `-p-01.png` 底部的「道 / 岔」接续而来，合计 15 行 1 字。
  - 行盒量测（`probe_b3.json` → `narrow`）：`caption lines=10 widest=16.0 fs=16 cpl=1.00`。
- **定位**：`style.css` L749-755 的 `@media (max-width:767px)` 里把 `.ill-table, .ill-table tbody, .ill-table tr, .ill-table th, .ill-table td` 改成 `display:block`，**漏掉了 `.ill-table caption`**。table 变成 block 后 caption 落进匿名 table 盒，宽度塌到最小内容宽（1 个字）。
- **建议**：在该媒体查询里补 `.ill-table caption{display:block;width:auto}`（或 `caption-side:top; text-align:left`）。

### S21-F2 ｜ 阻断 ｜ 390 档：`.angle-table` 5 列不折叠，列宽 38–74px → 每行 2–3 字、行高 192–243px

- **现象**：「切口角度表」（本页核心规格表，5 列）在 390 档完全不折叠，第 2/3 列只剩 38/39px，单元格内文字拆成 2 字一行；整行高度从桌面的 38.6px 涨到 **192–243px（约 5–6 倍突变）**。
- **证据**：
  - 几何（`s21.json`）：390 档 `.angle-table` 总宽 **278px**，`thead th` 各列宽 = **64.9 / 38.0 / 39.0 / 61.0 / 74.1**；表头行高 **141.5px**；三个数据行高 = **192.7 / 192.2 / 243.3px**。
  - 同表 1440 档：总宽 1328px，行高 **39.1 / 38.6 / 38.6px**；768 档：行高 39.1 / 39.1 / **64.2px**，表头行 64.7px。
  - 目视：`S21-interlocking-release-book-p-07.png`（y=5064–5908）整屏就是这张被压坏的表：表头只剩单个残字「角」「明」，单元格呈「只与同 / 进路相 / 邻的两 / 根杆互 / 斥，切 / 口最 / 缓。」7 行 3 字。
  - 行盒量测（`probe_b3.json` → `narrow`）：`th` lines=3 widest=32.0 cpl=2.00；`td` lines=7 widest=48.0 cpl=3.00。
- **定位**：`style.css` 只有针对 `.ill-table` 的窄屏降级，**没有任何 `.angle-table` 的媒体查询**；表又是 `width:100%` + 5 列 auto，窄屏下必然挤压。属于批次 1 报告 §0 提到的「窄屏布局断裂优先怀疑优先级/未折叠」同一类。
- **建议**：`@media (max-width:767px){ .angle-table thead{display:none} .angle-table tr{display:block;…} .angle-table td::before{content:attr(data-label)} }`（与 `.ill-table` 同款降级），或至少把「切口水平进深/适用说明」两列改成行下注释。

### S21-F3 ｜ 明显 ｜ 1440 档 y=968–1532：整幅宽度 564px 无内容，只有 96px 宽的锁闭条列

- **现象**：1440 档第二屏中，左栏（道岔联锁表）在 y≈966 结束、右栏（信号联锁表）在 y≈824 就已结束，而页面到 y≈1536 才出现「切口角度表」。中间这一大段只有中栏那条 **96px 宽**的释放路径。
- **证据**：
  - 空矩形量测（`emptyrect.py`，对 `shot/S21-interlocking-release-book-d-full.png` 1440×2581 逐像素）：**最大全空白矩形 = x=0, y=968, w=1440, h=564**，即 **整个视口宽度连续 564px（占 900px 视口 63%）无任何非底色像素**。
  - 滚动态对照：`S21-interlocking-release-book-d-02.png`（y=900–1800）目视可见——左栏在屏内 y≈64 结束、右栏整屏为空、中栏只有 x≈594–690 的锁闭条；条列宽占视口 **6.7%**。
  - 分带覆盖（`band.py`，逐屏图按 realY 拼回页面坐标）：1440 档 y=960–1500 三个 120px 带覆盖 = **5.68% / 5.49% 量级**，而这一档的整页均值是 7.34%——即这几带的「墨」几乎全部来自那 96px 的条列。
  - 全页逐屏墨覆盖率：**d-01 9.61% / d-02 5.34% / d-03 7.32%**。d-02 是三屏中最低的。
- **定位**：`.board__grid` 是三栏网格（`.board__col--turnout` 520.4px / `.path` 251.2px / `.board__col--signal` 520.4px），三栏内容高度 547.5 / 516.5 / 405.1px 相差悬殊，`.path` 又 `position:sticky;bottom:48px`；网格行高（1091px，y=410→1501）由最高列决定，短列下方直接留白。
- **建议**：把 `.path` 从 sticky 中栏改为跨列通栏横排（768 档已经这么做：`grid-column:1/-1`），或让三栏各自 `align-self:start` 并把角度表/互斥清单上提填充。

### S21-F4 ｜ 明显 ｜ 390 档 y≈840–4800 连续稀疏：约 4000px 的移动端联锁表，平均墨覆盖仅 ~2.2%

- **现象**：`@media (max-width:767px)` 把两张联锁表改成 block 逐行式后，每行占 ~190px 但只写 4 短行文字，形成 4.7 屏长的稀薄列表，右半屏基本空白。
- **证据**：
  - 空矩形量测（390×7304 整页）：**最大全空白矩形 = x=172, y=2180, w=216, h=2696**——在正文区（x=56–334）内即**右侧约 58% 的宽度、连续 2696px 完全空白**。
  - 分带覆盖（`band.py`）：390 档在 y=840→4800 之间有 **33 个 120px 带覆盖 < 3.0%**（最低 y=840–960 = **1.01%**、y=3120–3240 = **1.01%**）。
  - 逐屏墨覆盖率：**p-01 11.89% / p-02 2.26% / p-03 8.67% / p-04 2.20% / p-05 2.92% / p-06 5.62% / p-07 6.74% / p-08 12.57% / p-09 10.52%**。**最低的 p-02 (2.26%)、p-04 (2.20%)、p-05 (2.92%) 就是这段稀薄列表。**
    （参照：同一档 p-01/p-08 有 11.89%/12.57%，故 2.2% 不是该配色下的正常密度。）
  - 目视：`S21-interlocking-release-book-p-02.png` 一屏内只排了「1/2/3/4」四条记录，每条 5 行文字、行距很大，右侧全空。
- **定位**：`.ill-table tr{margin-bottom:calc(var(--baseline)*2)}` + `th,td{padding:calc(var(--baseline)*.5) 0}` 在 16px/1.6 行高下把 12 行撑到 2253.6px（`s21.json`: `#turnout-table` h=**2253.6**，`#signal-table` h=**1727.1**）。
- **建议**：窄屏把每行改成 2 列键值网格（如 `grid-template-columns:auto 1fr; grid-auto-flow:column`），或收紧 `margin-bottom` 到 1 个 baseline、`line-height:1.35`。

### S21-F5 ｜ 轻微 ｜ 全档：`.ill-table` 首列表头「道岔号」在 35px 宽列里竖排 3 行

- **证据**：`s21.json`，三档同样：`thead th` 第 1 格 = **w=35.0, h=87.3**（其余三格 h 同为 87.3，但宽 176.9/130.5/177.0）；`.ill-table thead th` 无 `white-space` 约束，16px 字号下 35px 扣掉左右 padding 18px 只剩 17px → 1 字/行，故「道岔号」= 3 行；表头整行被撑到 87.3px（vs `.angle-table` 表头 39.1px）。
- **注意**：该列内容只有 1–2 个字符（`1`…`12`），窄列是**合理的**；把表头写成 3 字才是撑高原因。**不确定是否属于设计意图**（见 §6）。
- **建议**（若判为问题）：把表头改成「号」或给 `thead th{white-space:nowrap}`。

### S21 已看未发现

- **同色不可见**：脚本报 `.lockbar__no` 共 15 处 `cr=1.00`（fg `#e4dcc9` on bg `#e4dcc9`），**经像素复核为我的工具假阳性**（详见 §5），实际是 `#e4dcc9` 写在 `.lockbar__body` 的 `#3e3a34` 上。
  - 像素普查（`px.py`，`shot/S21-interlocking-release-book-d-01.png` rect (585,580)-(680,700)，11400px）：`#3e3a34` **77.94%**、`#e4dcc9` **16.54%**、其余为数字抗锯齿边（`#a9a39c` 2.51% 等）。放大图 `z-s21-rail-d.png` 目视 1–13 号数字清晰。
- **锁闭条横向溢出**：`probe` 在 768 报 33 处、390 报 58 处元素超出视口右缘，全部落在 `.path__rail` 内。实测 `.path__rail` 在 768/390 是 `overflow-x:auto` 容器（`scrollWidth/clientWidth` = **1359/656**、**1625/278**），`lockbar` 宽 96px(d)/115px(p)，278÷115 = **2.4** —— 与规格「一次露出约 2.4 枚以暗示还能滑」一致。**判为设计意图，不计缺陷。**
- **`button.plate--off`（停用处号牌）cr=2.02**（fg `#e4dcc9` on bg `#a29b8d`）：`d-03.png` 目视确实很淡，但它是 `disabled` + 「号牌压成凹面」的样式本体，且有 `aria-label`。**判为设计意图，不计缺陷。**
- **互斥清单展开态**（点击 `#excl-btn` 后实测，`s21_excl.json` + `S21-excl-{d,t,p}.png`）：390 档 `li` 三列宽 = **32 / 64 / 146px**，说明文字 2–3 行、最宽 144.5px，可读；1440/768 档 1 行。**未发现缺陷。**
- **无断图**：三档 `.ill-table`/`.angle-table` 边框、`clip-path` 切口、`warn` SVG 三角均正常绘制；无 `mask-image` 使用。

---

### S21 专项：assets 引用核对（逐个文件名）

`prototypes/S21-interlocking-release-book/assets/` 下的**图片文件共 8 个**，逐一核对页面是否引用：

| # | 文件 | 尺寸/字节 | 页面是否引用 |
|---|------|-----------|--------------|
| 1 | `reuse-s10-rail-02-raw.jpg` | 257,438 B | **未引用** |
| 2 | `reuse-s14-cabin-04-telemetry-panel.jpg` | 252,859 B | **未引用** |
| 3 | `reuse-s14-cabin-05-cockpit-1960s.jpg` | 407,990 B | **未引用** |
| 4 | `reuse-s14-cabin-10-panel-gauges.jpg` | 251,030 B | **未引用** |
| 5 | `reuse-s14-plate-05-chipmunk-cockpit.jpg` | 205,423 B | **未引用** |
| 6 | `reuse-s18-nasa-kennedy-space-center-fla-during-pow.jpg` | 205,917 B | **未引用** |
| 7 | `texture-release-grid.png` | 128×128 RGBA, 349 B | **未引用** |
| 8 | `texture-steel-grain.png` | 256×256 RGBA, 30,418 B | **未引用** |

**核对方法（三重，互相独立）**：
1. `Select-String -Pattern 'reuse-s14|reuse-s10-rail|reuse-s18|texture-release|texture-steel|\.jpg|\.png'` 扫 `index.html` + `style.css` → **零命中**（`style.css` 里唯一的 `url()` 是 `@font-face` 的 `fonts/wenjin-*.woff2` 和一条 `cursor:` 的内联 SVG data URI，共 72 处 `url(` 无一是图片资产）。
2. 运行期实测（`measure.mjs` PROBE）：三档 **`imgs=0`、`bgImgCount=0`**。
3. `index.html` 全文 467 行通读：无 `<img>`、无 `<picture>`、无 `srcset`；`<script>` 段（L352-465）只操作 class 与 `textContent`，不注入任何图片。

**结论**：**S21 页面在运行期引用的 assets 图片数量 = 0/8。** 6 张照片（含被 `credits.json` / `CREDITS.md` 正式登记、许可见 `assets/credits.json`）与 2 张纹理**全部躺在目录里未被接线**。此前记录的「给它配了 6 张照片但页面是否真的引用没人复核过」——经本次复核，**答案是「没有引用」**。另 `assets/_cand/` 下还有 29 个候选文件（25 张 jpg + `candidates.json` 等），同样未引用。
顺带：`index.html` L349 自述「本页不含蒸汽机车、钢轨或制服图形」，与实际零图片的状态一致；但 `credits.json` 把 `reuse-s10-rail-02-raw.jpg`（敞车照片）列为本方案资产，**存在「已登记却未使用」的记录不一致**（不是视觉缺陷，登记在案）。

---

---

## S22 （paper-screen-folded-sheet）

（待查）

---

## S23 （exposed-plaster-chronology-wall）

（待查）

---

## S24 （cyanotype-rainforest-path）

（待查）

---

## S25 （spotcolor-contents-zine）

（待查）

---

## S26 （geometric-collision-columns）

（待查）

---

## S27 （hand-painted-bill-dispatch）

（待查）

---

## S28 （jazz-intaglio-wall）

（待查）

---

## S29 （wire-bound-safety-manual）

（待查）

---

## S30 （skate-sticker-split）

（待查）

---

## §3 S21 专项：逐屏填充率 + assets 引用核对

（待填）

---

## §4 跨案统计

（待填）

---

## §5 确认属于"工具/链路缺陷而非页面缺陷"的项

（待填）

---

## §6 我最不确定的 3 条

（待填）

---

## §7 本次审查的限制

（待填）
