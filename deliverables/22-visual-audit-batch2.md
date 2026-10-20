# 22 · 视觉审查报告（批次二：S11–S20）

审查员：视觉审查员（独立子代理，重跑） · 工作目录 `D:\Web\style`
本轮取证目录：`_audit2/`（截图 `_audit2/shots/`，裁剪 `_audit2/crop/`，JSON 探针）
本报告只写这一个文件；**未修改任何原型文件**，未动 `_specs` / `_build` / 其它 deliverables。

> **状态：进行中。** 本文件按案追加（每审完一案 append 一节）。若本文件在某案中途停止，
> 该案之前的 `## Sxx` 小节即为已完成内容。

---

## 0. 方法论与自查

（审查完成后回填，先占位。要点：链路、CDP 复核清单、自查出的工具缺陷。）

---

## 1. 三档页高总表（真实运行时数字）

页高口径：CDP `Emulation.setDeviceMetricsOverride` 精确定档后读 `documentElement.scrollHeight`；
视口高取该档标准高（1440×900 / 768×1024 / 390×844）。
判据：`window.innerWidth` 精确等于目标宽**且** `documentElement.scrollWidth === documentElement.clientWidth`。

| 案 | 目录 | 1440×900 页高 | 768×1024 页高 | 390×844 页高 | innerWidth 判据 | 横向溢出 |
|---|---|---|---|---|---|---|
| S11 | S11-samizdat-typewriter | 9435 | 14144 | 13100 | 1440 / 768 / 390 全中 | 无（sw==cw） |
| S12 | S12-lime-knockout-wall | 6267 | 6713 | 7617 | 三档全中 | 无 |
| S13 | S13-blind-debossed-dispatch | 4866 | 5625 | 6626 | 三档全中 | **390：sw=396 > cw=390** |
| S14 | S14-zero-g-launch-sequence | 7569 | 9250 | 12161 | 三档全中 | 无 |
| S15 | S15-fishery-floor-ledger | 8790 | 13354 | 15398 | 三档全中 | 无 |
| S16 | S16-velocity-slant-manifesto | 9506 | 9989 | 9694 | 三档全中 | 无 |
| S17 | S17-revenue-stamp-stub | 2358 | 7447 | 8241 | 三档全中 | 无 |
| S18 | S18-phosphor-service-deck | 10846 | 13347 | 16547 | 三档全中 | 无 |
| S19 | S19-copperplate-herbarium-cabinet | 10681 | 15881 | 16992 | 三档全中 | 无 |
| S20 | S20-plotter-soundfield | 8834 | 11470 | 13806 | 三档全中 | 无 |

数字来源：`_audit2/rt/recon-Sxx.json` → `tiers.<d|t|p>.scan.{innerWidth,scrollHeight,scrollWidth,clientWidth}`，
CDP `Emulation.setDeviceMetricsOverride` 精确定档（`--hide-scrollbars` 已开，无滚动条占宽）。
S13 的 390 档 `scrollWidth 396 / clientWidth 390` 是本次唯一一处横向溢出，已单列（见 §S13）。

---

## S11-samizdat-typewriter

- **实测页高**：1440×900 → **9435**；768×1024 → **14144**；390×844 → **13100**。
- **实际逐张看过的图（8 张）**：`S11-d-s01.png`、`S11-d-s06.png`、`S11-p-s04.png`、`S11-t-s07.png`、
  `S11-p-strip.png`（390 档首屏，`state.mjs` 采），放大裁剪 `crop/z-S11-d-prose.png`（2.4×，批注色对比度）、
  `crop/z-S11-d-carbon.png`（2×，复写三层重叠演示）、`crop/z-S11-d-gap.png`（2.6×，`code` 与标点间距）。
- **1440 档最右 25% 无长空白带**（`void.txt`：`S11-d-full.png` 无 ≥200px 的右带空洞）；390 档同理。

**结论：已逐张看 8 张，未发现确认为缺陷的项。**

排查记录（把自动化探针报出来的三处逐条排掉）：
1. **`#6E7A64` 批注色 4 处对比度 3.31:1（三档各 4 处）**——`recon-S11.json` 实测这 4 处全部是
   `font-size:19px; font-weight:700`（`div.prose > .note`），19px 粗体 ≥ WCAG 大文本阈值 14pt=18.67px，
   大文本 AA 门槛是 3:1 → **3.31:1 通过**。`z-S11-d-prose.png` 目视确认可读。
   （`style.css:16` 自述「对底 3.73:1」，实测对 `#DCDDD2` 为 **3.31:1**；自述口径偏乐观，但仍在大文本门槛之上。）
2. **`occ3` 报 2 处遮挡：`p.carbon-line.l3` 被 `.l5` 盖 67%、`.l5` 被 `.l7` 盖 67%（三档同）**——
   `z-S11-d-carbon.png` 目视：这是**同一句「色带在同一个字位被击打三次；纸背的字迹比正面浅。」被印三遍、逐层下移 12px 的演示**，
   最上层（`--ink` 正常墨色）完整可读，下两层是对比很低的副本。**设计意图，不计为缺陷。**
3. **`clipped=11`（仅 390 档，全部落在 `nav.chapter-strip > ul > li`）**——实测该 `ul`
   `overflow-x:auto; scroll-snap-type:x mandatory`，`scrollWidth 3756 > clientWidth 358`，12 个条目可横向滑动；
   越界项是滚动容器的正常表现（`style.css:577-579` 明写 `flex:0 0 83.33%` + 横向吸附）。
   **导航在 390 档可用**，不计为缺陷。
4. 390 档 12 处孤字、1440/768 档 15 处孤字——`recon-S11.json` 的 `orphan` 里绝大多数末行是「。」（中文句末标点，
   按中文断行规则必须落在行尾，不是缺陷）；去重后仅 `#carbon-proof .carbon-key` 的「第 ／ 联」三处为真孤字，
   但该元素是复写层色标说明（`ul.carbon-key`），实际渲染为两行短标签，目视（`S11-d-s01.png` 复写演示区）可读，不单列。
5. 未发现断图：`imgs=13/13/11`，`brokenOrNoNatural=0`。

---


## S12-lime-knockout-wall

- **实测页高**：1440×900 → **6267**；768×1024 → **6713**；390×844 → **7617**。
- **实际逐张看过的图（6 张）**：`S12-d-s02.png`、`S12-d-s04.png`、`S12-d-s05.png`、`S12-d-states.png`（`state.mjs` 在 scrollY=5100 采）、
  放大裁剪 `crop/z-S12-d-opnote.png`（3.2×）、`crop/z-S12-d-logerr.png`（2.2×）。

**【S12-F1｜明显｜`section.plates` 与 `section.states` 被自己的子元素同名类压成三列网格 → 1440 档 2/3 视口连续 ~2540px 空屏】**
- 现象：`S12-d-s04.png` / `S12-d-s05.png` 里整个左半屏（x 0–956）是纯底色，只有右起 956–1384 一条 428px 的列里有图版卡片；
  `S12-d-states.png` 更明显：左起 940px 整片空，四条状态（斜纹取片 / 未开的那一格 / 错误码 / 减少动态效果）被挤在右边一条 443px 的竖列里，
  而「四类状态都在这一屏里可见，不需要点击才出现。」这句说明落在中间那列（x 499–942）的顶端。
- 证据（CDP 逐元素实测，1440 档）：

  | 元素 | computed display | grid-template-columns | 子元素位置 |
  |---|---|---|---|
  | `section.plates` | **grid** | `428px 428px 428px 0px 0px` | `H2` @x56/w428 · `P.sec-note` @x506/w428 · `UL.plates` @x956/w428 |
  | `section.states` | **grid** | `442.656px 442.672px 442.656px 0px` | `H2` @x56/w443 · `P.sec-note` @x499/w443 · `UL.states` @x941/w443 |
  | `section.wall-stage`（对照） | block | none | `H2` @x56/**w1328** · `P.sec-note` @x56/w680 … |

  并且三个子元素**被拉伸到整行高度**：`H2.图版` rect 高 **2577px**、`P.sec-note` 高 **2565px**、`UL.plates` 高 2553px。
  像素侧：`void.txt` 实测 `S12-d-full.png`（1440×6267）中带 30–70% 的最长空白带 **y 2574–5100（高 2526）**；
  768 档 `S12-t-full.png` 右 45% 空白带 **y 2645–5253（高 2608）**、y 5270–6186（高 916）。
- 定位（样式根因）：`prototypes/S12-lime-knockout-wall/style.css:339`
  `.plates { display:grid; grid-template-columns: repeat(auto-fit, minmax(248px,1fr)); gap:26px 22px; … }`
  ——这条规则本意是给 `ul.plates` 用的，但 `index.html` 里 `<section class="plates"><h2>…</h2><p class="sec-note">…</p><ul class="plates">…</ul></section>`
  的 **section 也带 `plates` 类**，于是 section 自己变成 grid：三个子元素被放进三条 428px 轨道。
  `:346` 的 `.states` 同理（`<section class="states">` 与 `<ul class="states">` 同名）。
- 修法：把 section 的类名改掉（如 `section id="plates"`），或把规则收窄成 `ul.plates` / `ul.states`。
  改完 section 会回到 block，`H2`/`P.sec-note` 恢复 1328px 满宽，`UL.plates` 的 auto-fit 会在 1328px 里排 4 列。

**【S12-F2｜明显｜1440 档 `p.op-note` 末行被 `div.wall-log` 的不透明底色盖掉】**
- 现象：`z-S12-d-opnote.png` 里「留空的角」面板的说明文字停在「**这一格还没开。凑齐三条**」，**末行「斜线就凿得动。」整行不可见**，
  紧接着就是 `div.wall-log` 的深色横带（带内是自己的另一段日志文字）。
- 证据（两路独立命中）：
  1. 遮挡采样（`occ3`）——`p.op-note` rect `{x:127,y:507,w:109,h:102}`，被 `div.wall-log`（`pos:static`，`background:rgb(24,34,38)` 不透明）
     rect `{x:56,y:580,w:1328,h:313}` 覆盖，命中 17%（scrollY=900）；
  2. 祖先裁剪检测（`recon-S12.json` → `tiers.d.clipped`）——`axis=y`，容器 `section#wall > div.wall-log`，
     文本行 `lineTop 1407 / lineBottom 1508`，容器 `boxTop 498 / boxBottom 1454`（文档坐标）→ **末行 54px 落在容器之下**。
- 定位：1440 档「留空的角（07）」洞口面板说明；390/768 档不出现（`recon-S12` 的 `clipped` 在这两档为 0）。
- 修法：给 `.wall-log` 让出上边距（或把 `op-note` 的 `bottom` 改成相对面板内边距），使两者不重叠。

**【S12-F3｜轻微｜日志里的错误态红字对比度 3.91:1（17px / 600）】**
- 现象：`z-S12-d-logerr.png` 里「错误码 **MASK-05**」是 `#e23e57` 压在 `#182226` 上，目视能读但明显偏暗。
- 证据：`recon-S12.json` 三档同报 `section#wall > div.wall-log > p.log-line.is-error` → `fg=#e23e57 bg=#182226 cr=3.91`，
  `font-size:17px; font-weight:600`。17px/600 未达 WCAG 大文本阈值（粗体 14pt = 18.67px）→ 该尺寸要求 4.5:1，**差 0.59**。
  同页 `li.state-error > h3`（黑字压红底）实测 4.55:1，是过的——即同一语义两种配色，只有日志这条偏。
- 修法：把日志里的错误红提到 `#ff5c73` 一级，或给这行加一条纸色描边。
- 备注：这一处**不是 1:1 隐形字**，只是阈值差一点点，故定轻微。

**已排查、不计为缺陷的项**
1. `occ3` 在 768/390 档 0 命中、1440 档仅 F2 那 1 条——`div.wall-log` 之外的命中全部来自 `pos:fixed` 顶部条，已按 §3 规则剔除。
2. `recon-S12.json` 的 9 条 "contrastLow" 里 8 条是 `cr=4.55`（`fg=#111111 / bg=#e23e57`）——4.55 ≥ 4.5，**通过**，只是被我的 4.6 阈值捞进来了。
3. 洞口形状造成的「大块荧光绿空面」（`S12-d-s02.png` 中 x 700–1376 / y 0–550）是"墙"本体（挖空墙的实体部分），**设计意图**。
4. 三档 `imgs brokenOrNoNatural=0`；390 档无横向溢出（`sw==cw==390`）。
5. 390 档 6 处孤字、1440/768 档 3/2 处——末行均为「。」（中文行尾标点，非缺陷）；去重后无真孤字。

---


## S13-blind-debossed-dispatch

- **实测页高**：1440×900 → **4866**；768×1024 → **5625**；390×844 → **6626**。
- **实际逐张看过的图（12 张）**：`S13-d-s01.png`、`S13-d-s02.png`、`S13-d-s03.png`、`S13-d-s04.png`、`S13-d-s05.png`、`S13-d-s06.png`、`S13-t-s03.png`、`S13-t-s06.png`、`S13-p-s05.png`、`S13-p-s08.png`，放大裁剪 `crop/z-S13-p-plates.png`（390 档图版题注，2.6×）、`crop/z-S13-d-levels.png`（1440 档层级表，3×）。
- **1440 档逐屏填充率（ink16 = 与全屏众数色差 >16 的像素占比，`_audit2/rt/pixstats2.json`）**：

  | 屏 | s01 | s02 | s03 | s04 | s05 | s06 |
  |---|---|---|---|---|---|---|
  | ink16 % | 47.46 | 19.60 | 6.42 | 11.24 | 5.30 | 4.74 |
  | 右 1/3 ink % | 42.57 | 15.60 | 2.34 | **0.001** | **1.00** | **1.00** |

  **结论（针对任务书"S13 疑似 3 屏近乎空白"的复核）**：**在本轮链路下不成立——1440 档 6 屏没有一屏是空屏**，
  最低的 s06 仍有 4.74% 墨迹（两段正文＋页脚署名，见 `S13-d-s06.png` 下半）。
  但**右侧 480px 确实存在长段空洞**：`_audit2/rt/void.txt` 实测 x≥1080（右 25%）的空白带 **y 2020–4476（高 2456）**，
  x≥864（右 40%）的空白带 y 3498–4476（高 978）与 y 2391–3004（高 613）。
  即：**不是"空屏"，是"右 40% 连续 2400+px 没有内容"**——主内容列宽 897px（`section#plates` 实测 w=897），右轨（签发栏）在第 2 屏就结束。

**【S13-F1｜阻断｜390 档"工艺参照件"图版网格仍是 4 列，题注被压到每行 4.5 字，四张图版的题注互相串行】**
- 现象：`z-S13-p-plates.png`（2.6×）里四张图版的题注挤成四列各约 4.5 字宽，
  「参照二 · 帘纹与水印」渲染成「参照二 · 帘纹」/「与水印」，「J. Whatman 纸，水印 1798 · 墨绘」渲染成「J. Whatman」/「纸，水印 1798 ·」/「墨绘」，
  「Unidentified，约 1800」「Hittite maker，约前 17 至前 16 世纪」「约前 1328 至前 1318 年」四段英文/中文在视觉上**互相串行**，
  最后一列「Broadsheet showing a blindfolded man being executed」在右边界被切断（只到「Broadshee」）。
- 证据（CDP 实测，`_audit2/rt/recon-S13.json` 与 `state.mjs` 强制量测）：
  - 390 档 `getComputedStyle(document.querySelector('.plates__grid')).gridTemplateColumns` = **`67.5px 67.5px 67.5px 67.5px`**（容器宽 342px、4 个子项）；
  - 对应 `span.plate__cap` 实测 `w=97.2px`，右边界 **x=395.7 > 390**（`ovf.mjs S13 p`，y=3671）；
  - 768 档同元素 computed = `162px 162px 162px 162px`（容器 720px）。
- **定位（样式根因，可复核）**：`prototypes/S13-blind-debossed-dispatch/style.css`
  - `:671 @media (max-width:640px) { … :677 .plates__grid { grid-template-columns: 1fr; } … }`
  - `:637 @media (min-width:1024px) and (max-width:1439px) { … :642 .plates__grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }`
  - **`:718-722 .plates__grid { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:40px 24px; }`（无条件、写在两段媒体查询之后）**
  - 同特异性（0,1,0）、媒体查询不增加特异性 → **后面的无条件规则把前面两条媒体查询都压掉了**。这是批次一在 S07 `.toc`
    上抓到的同一类陷阱（§0.2 之外的第二类：**不是特异性而是源序**）。
- 修法：把 `.plates__grid` 的基础规则移到媒体查询之前，或给媒体查询里的规则提高特异性
  （如 `@media (max-width:640px){ .plates .plates__grid{ grid-template-columns:1fr } }`）。**不要只改媒体查询里的值**——它现在根本没生效。

**【S13-F2｜明显｜390 档唯一一处横向溢出：`scrollWidth 396 / clientWidth 390`】**
- 证据（`ovf.mjs S13 p`）：`iw=390, sw=396, cw=390, bodyW=396`；越界元素只有 3 个同族元素
  `span.plate__cap / span.plate__meta / span.plate__credit`：`left=298.5, right=395.7, w=97.2, ovf=+5.7`（pos=static，`overflow-x:visible`）。
  它们位于 `.plates__grid` 第 4 列（`grid-template-columns` 第 4 列 = 67.5px），
  但 `figcaption{display:grid}` 下题注 span 的 min-content（最长不可断 token「Broadsheet」）撑到 97.2px。
- 定性与定位：这是 **S13-F1 的下游症状**（列宽 67.5px 装不下最长 token），修 F1 后自然消失。单列 342px 时 min-content 远小于列宽。
- 影响：390 档整页出现 6px 横向可滚动区，最后一列题注最右 5.7px 需要横向滚动才能看到。

**【S13-F3｜明显｜390 档 `.levels__table` 不折叠，前两列塌到每行 1 个汉字】**
- 现象：`S13-p-s08.png` 里「二级 · 凸」渲染成竖排 **「二」/「级」/「·」/「凸」**（每行 1 字），
  第二列「编号旁烫金击凸」渲染成 **「编」/「号」/「旁」/「烫」/「金」/「击」/「凸」**（每行 1 字，7 行）。
  同屏「三级 · 微」→「三」/「级」/「·」/「微」，「纸纤维起伏」→「纸」/「纤」/「维」/「起」/「伏」。
- 证据：`recon-S13.json` → `tiers.p.orphan` 含 `td「纸纤维起伏」`（末行 1 字）、`td「条款标题盲压凹槽」`（末行 1 字、lineW=28）；
  `pixstats2.json` → `S13-p-full.png` 396×6626；`S13-p-s08.png` 目视。
  表结构为 5 列（`index.html:236-239`：层级/工艺/压深/亮度差/无投影时的读出方式），CSS `:675` 在 ≤640 档只把字号降到 13px、`:676` 只减了 inline padding，**没有做任何列折叠**。
- 定位：390 档「压印层级记录」表，3 行正文单元格。
- 修法：≤640 档把 `.levels__table` 改成键值式堆叠（批次一已确认 S10 的 `.grid-table` 做法有效），或给第 1、2 列 `white-space:nowrap` + 允许横向滚动。

**【S13-F4｜轻微｜1440 档也在挤：「层级」列内容盒只有 27px（< 2 个汉字）】**
- 证据（CDP 实测 `.levels__table`，1440 档）：表格总宽 **560px**（`max-width:40em` @14px），`table-layout:auto`；
  列宽依次 **39 / 58 / 63 / 63 / 336**；减去 `padding:8px 12px 8px 0` 的 12px 右内距后，
  第 1 列内容盒 **27px**、第 2 列 **46px**。
  `z-S13-d-levels.png`（3×）显示：「层级」表头 →「层」/「级」；「一级 · 凹」→「一」/「级 ·」/「凹」；「条款标题盲压凹槽」→「条款标」/「题盲压」/「凹槽」。
- **是不是刻意竖排？** `index.html:243` 写的是整串 `<th scope="row">一级 · 凹</th>`，没有 `<br>`，也没有 `white-space` 声明，
  所以换行是自动表格算法挤出来的，不是作者写死的。但视觉上「一/级·/凹」确实读得出竖排标签的味道——**判不清，已并入 §4「最不确定」**。
- 修法：给前 4 列 `white-space:nowrap`（表格总宽 560px 完全放得下），或把最后一列移到表格下方作为注释。

**【S13-F5｜轻微｜390 档题注孤字与行尾悬挂 `·`（多处，同源于 F1）】**
- `recon-S13.json` → `tiers.p`：`span.plate__cap「J. Whatman 纸，水印 1798 · 墨绘」` 末行 1 字「绘」（lineW=30）；
  `span.plate__cap「参照四 · 压印留痕」` 末行 1 字「痕」；`span.plate__cap「参照五 · 铅字压印」` 末行 1 字「印」；
  `table.levels__table th` 三处行尾悬挂 `·`（「一级 ·」「二级 ·」「三级 ·」，lineW=13）。
- 全部是 F1/F3 的直接后果，修 F1/F3 后应同步消失，故不另计数量。

**已排查、不计为缺陷的项**
1. **S13-t / S13-p 的 `aside#signature.is-pinned` 覆盖页脚文字**（`occ3.mjs` 命中：t 档 `p.colophon__credits` 17%、`p#quirk.colophon__quirk` 58%）。
   该元素 computed `position:fixed; z-index:30; background:rgb(244,227,190)`（不透明），rect y=699 h=325（t 档）。
   它是**贴在视口底部的固定签发栏**（`style.css:351` 注释「滚过 80% 后固定到视口底部」），滚到页尾时页脚文字位于其上方视口 y −5…199，**并非永久被盖**。
   → 判定为固定面板的正常滚动覆盖，**不计为缺陷**。（这批命中里绝大多数属于这一类。）
2. **1440 档 `p.colophon__credits` 等 4 处 r=3.31 的 `#6E7A64` 文字**：实测 `font-size:19px; font-weight:700`，
   19px 粗体已越过 WCAG「大文本」阈值 14pt=18.67px，大文本 AA 要求 3:1 → **3.31:1 通过**。
   （附带记录：`style.css:16` 自述「对底 3.73:1」，实测对 `#DCDDD2` 只有 **3.31:1**，自述值与实测值差 0.42，但仍在阈值之上，不构成缺陷。）
3. `recon-S13.json` 报的 4 处孤字（s01–s03 档：`层级表 td` 2 处、`footer #quirk` 1 处）——均已并入 F3/F4。

---


## S14-zero-g-launch-sequence

（待审）

---

## S15-fishery-floor-ledger

（待审）

---

## S16-velocity-slant-manifesto

（待审）

---

## S17-revenue-stamp-stub

（待审）

---

## S18-phosphor-service-deck

（待审）

---

## S19-copperplate-herbarium-cabinet

（待审）

---

## S20-plotter-soundfield

（待审）

---

## 2. 跨案统计

（待回填）

---

## 3. 确认属于"工具/链路缺陷而非页面缺陷"的项

（待回填）

---

## 4. 我最不确定的 3 条

（待回填）

---

## 5. 本次审查的限制

（待回填）
