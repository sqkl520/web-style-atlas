# 内容下限实测（minItems / degrades / minPics）· 30 案

方法、脚本与逐案证据在本目录；本文件是结论。

## 判定口径

1. **minItems** — HTML 里"同构重复单元"的规模：同一父级下 tag 相同、class 相同（或 class 族
   前缀相同，如 `dw` / `dw--void` / `dw--alt`、`blk--s7 / blk--c7`）的兄弟组，取最大的一组；
   整个页面无重复条目记 `0`。计数同时核对页面自报的条目数（S19"20 个抽屉"、S26"12 栏"、
   S23"九处剥落"），不一致时以 DOM 为准并在"依据"列注明。
2. **degrades** — 单元从 N 砍到 N/3 后版式是否还成立。**只认代码**：
   - `no`：单元靠 grid/flex 自动流排布（`grid-column: span var(--s)`、`flex`、`column-count`、
     `auto-fit`），删条目只是变短；
   - `yes`：位置写死 —— 绝对定位、写死的 `grid-row/column` 坐标、手绘 SVG 绝对坐标、
     写死编号的行标题、JS 里硬编码的索引数组；
   - `unknown`：依赖 JS 动态生成且逻辑复杂，静态读不出（本次 30 案无一例）。
3. **minPics** — 版式里"必须放真图"的槽位数：数 `index.html` 真正引用的照片/扫描件
   （`<img src>`），排除纯纹理层（`texture-*`、`grain`、`vignette`、`scanline`、`cursor`），
   再与 `assets/` 里未被引用的图片对照。

## 表

| 方案 | minItems | degrades | minPics | 依据（文件·结构·行） |
|---|---|---|---|---|
| S01 红黑斜排报 | 6 | no | 6 | `index.html:180-221` 6×`figure.plate`（`.plate-grid`）；`style.css:358` 只有 `.plate-lead,.plate:last-child{grid-column:1/-1}`，其余自动流。6 张 halftone 全引用，`assets/` 另 3 张（cursor-fold / paper-grain / halftone-07）未引用 |
| S02 烫金对称沙龙 | 16 | yes | 5 | `index.html:37-71` 16×`li.step`（`ol.ladder-left` 6 + `ol.ladder-right` 9 + 1 张 `is-vacant` 空位）；`style.css:214-215` 缩进＝`calc((var(--n)-1-var(--i))*14px)`，`--n`/`--i` 逐条写死在内联 style（`:36` `--n:7`），`:409` 又用 `nth-child(n+8){display:none}` 硬砍；删条目即塌成半条梯 |
| S03 长曝光天文台 | 8 | no | 8 | `index.html:70-102` 8×`figure.band`（`.stream`），每张 `style="--h:28px…84px"` 只是条高；`style.css:145` `.band` 普通块流，`:144` `.stream{position:relative}` 不定位子项。12 个 `<img>` 去重后 8 张（`eclipse-of-the-sun` 等 4 张重复引用） |
| S04 芒果拼贴墙 | 9 | yes | 9 | `index.html:40-147` 3×`div.wall__grid` 各 3×`figure.slip` = 9；`style.css:81` 每张写死 `--span/--lift/--rot/--ar`（`:41` 起 9 组内联），`:202` 窄屏按 `nth-child(3n+1/2/3)` 硬分三档；删到 3 张＝12 栏里只落 3 块、留 9 栏空洞 |
| S05 像素冷库控制台 | 8 | yes | 6 | `index.html:95-208` 8×`article.panel`（`div.console-grid`）；`style.css` 写死 `.panel--main{grid-column:1/6;grid-row:1}`…`.panel--switch{grid-column:5/9;grid-row:3}`，8 块占满 8 栏×3 行，删任意一块留硬洞；`:469-474` 又按 `nth-of-type(1..6)` 写灯序 |
| S06 昭和喫茶店台账 | 13 | no | 7 | `index.html:48-138` `div.river` 内 13×`article.card`（9 常规 + 1 `card--fault` + 3 `card--blank`）；`style.css:155` `.river{column-count:3}` 自动流，`:221-231` 的 `nth-of-type` 只改 `--off/--tilt` 微偏移不占位 |
| S07 铅灰油墨目录 | 46 | no | 7 | `index.html:41-58` 正页 `ol#toc-list` 18 条 + `:64` 纸背 `ol.toc`（`start="19"`）28 条 = 46；`style.css:81-82` `column-count:2/3` 自动流。`minPics` 按 7×`figure.plate`（`:102-127`，`.wide/.tall/.duo/.narrow` 四种跨栏） |
| S08 琥珀叠印灯箱 | 6 | yes | 4 | `index.html:55-124` 6×`div.plate`（`.iso-plane`），层号 `--l:0…5` 内联写死；`style.css:116` `.plate{position:absolute;left:50%;top:46%;transform:translate3d(calc(var(--l)*…))}`，叠印位移与 6→10px 厚度梯度全按层号算，删板留下按层号排出的空档 |
| S09 蜡染价目板 | 10 | no | 6 | `index.html:65-74` 10×`li.row`（`ul#rows`）；`style.css` `.rows{column-count:3}`，`.row` 只有 `min-height:56px` + `--start:4…12px` 手绘起点微偏移；6×`figure.plate`（`:130-153`）为图版区 |
| S10 栅格对开页 | 12 | no | 6 | `index.html:126-225` 报价表 12 行数据（`:234-248` 另 3 行 `.row-gap` 是空档）；`style.css` `.grid-table{table-layout:fixed}` 列宽靠 `col`，行间无写死坐标。`plate-strip` 5 张用 `6fr 7fr 9fr 8fr 5fr` 写死五列，但只是收尾图带 |
| S11 地下出版物打字机 | 12 | no | 8 | `index.html:86-306` 12×`section.chapter`（`main#manual`）；`style.css:264` `.chapter` 只给 padding，`:298-309` 的 `nth-child(1..12){--ch:n}` 只供墨渍逐章偏移 0.4px。8 张 `figure.plate` 分挂各章 `aside` |
| S12 青柠挖空墙 | 7 | yes | 6 | `index.html:47-102` 7×`article.opening`；`style.css` 逐洞写死 `.op-01{grid-column:5/7;grid-row:1;height:214px}`…`.op-07{grid-column:1/2;grid-row:4;height:136px}`，并逐洞写 `--i:0…6`；删洞则 8 栏留硬缺格，45°/135° 的斜边对话也断 |
| S13 盲压凸函件 | 7 | no | 4 | `index.html:67-97` 7×`section.clause`（`article#clauses`）；`style.css` 无定位规则（只有 `.clause:first-of-type` 调间距），纯流排。4 张 `figure.plate`（`:128-163`）走 `.plates__grid{repeat(4,1fr)}` |
| S14 零重力发射序列 | 11 | yes | 10 | `index.html:70-160` 11×`article.tag`（`div#field`），每条内联 `--dx/--dy/--w/--ux/--uy/--ord`；`style.css:53` `.tag{position:absolute;left:44%;top:50%;transform:translate(calc(var(--dx)…))}` —— 极坐标版位逐枚算死。另有 8×`li.plate` 图版 |
| S15 渔业平面台账 | 14 | yes | 6 | `index.html:139-152` `g.zones` 内 14×`a.hot`（文案"热区 14 个"），每区 `<rect class="edge" x="104" y="96" width="288" height="208">` 是**手绘绝对坐标**，按舱室真实面积画；删一区平面图缺一块、与登记表对不上。6×`li.pl`（`:307-345`）图版自动流 |
| S16 速度斜排宣言 | 9 | no | 6 | `index.html:56-161` 9×`section.slab`；`style.css:29` `.slab{width:calc(var(--span,9)*100%/12);margin-left:calc(var(--slot,0)*var(--step))}` 是相对量。JS `:242` `SPANS=[[9,6,7,4,7,9,6,7,4],[9,5,7,9,7,5,9,7,5]]` 按 `slabs[i]` 取值、9 槽写死，但**只改宽度不改位置**，删块只是斜线少几级 |
| S17 税收印花存根 | 27 | no | 5 | `index.html:93` 起 `tbody#ledger-body` 27 行（编号 004417–004443 连号；全表 30 个 `<tr>` 含表头与合计）；表格自动流。5 张税票扫描件（`:138-167`）走 `auto-fit` |
| S18 荧光粉服务纸 | 20 | no | 6 | `index.html:97/121/145` 三段 `pre.lines`，每段 20×`span.ln`（文案"每 20 行压一条折痕"）；`style.css:165` `.blk+.blk{margin-top:var(--line)}` 行流，`:175` `.fold` 是随流走的伪元素压痕，行数变了折痕自己重排。6 张 `figure.plate` 分挂 `mast__col/hangrail` |
| S19 铜版植物标本柜 | 20 | yes | 6 | `index.html:65-114` 5×`div.rowwrap` 各 4×`li.dw` = 20 抽屉；每屉内联 `--s/--row/--n`，`style.css:13` `.dw{grid-column:span var(--s)}`，而行标题 `:67` `第 1 行 · 抽屉 01–04 · 栏宽 4/3/3/2` 是**静态文本**。裁到 5 个后残留 3 条空行标题（审计报告的那一例）。6×`li.plate` 图版另计 |
| S20 绘图仪声场 | 6 | yes | 6 | `index.html:159-179` 6×`li.plate`（`ul.plates`）；`style.css:265` `repeat(4,1fr)`，但 `:267-272` 逐张写死 `nth-child(1){span 2}`…`(6){span 3}`，跨栏量 2+2+1+3+1+3 刚好配平 4 栏，少一张即错列 |
| S21 联锁释放簿 | 14 | no | 6 | `index.html:234-247` `ol#rail` 14×`li.lockbar`（文案"14 枚"）；`style.css` `.path__rail{display:flex;flex-direction:column;gap:1px}` 自动堆，`--i` 只用于 `animation-delay:calc(var(--i)*70ms)` 逐枚扣接，不参与落位。6×`figure.fig` 图版 |
| S22 纸屏折页 | 6 | yes | 6 | `index.html:191-196` 6×`li.plate` 用 `plate--a…f`；`style.css:330-335` 逐张写死 `.plate--a{grid-column:1/span 7}`、`--b{8/span 5}`、`--c{1/span 5}`、`--d{6/span 7}`、`--e{1/span 8}`、`--f{9/span 4}`，正好拼满 12 栏三行；少一张留半行空洞 |
| S23 剥落灰泥年代表 | 9 | yes | 10 | `index.html:95-160` 9×`article.flake`；`style.css:250-258` 逐处写死 `#f1{grid-column:1/span 14;grid-row:1/span 56}`…`#f9{grid-column:32/span 2;grid-row:200/span 14}`，坐标是 36 栏×220 行的绝对位；删一处即露出没有剥落的空墙 |
| S24 蓝晒雨林小径 | 6 | no | 6 | `index.html:79-213` 6×`article.br`，分 4 个 `div.lv`；`style.css:133` `.lv{display:grid;grid-template-columns:5fr 3fr}`，`.br--w{grid-column:1}` / `.br--n{grid-column:2}` 只分左右两支（镜像层对调），删一支另一支仍居中。5 张 `figure.pluck` 图 |
| S25 专色目录帖 | 8 | no | 5 | `index.html:136-192` 8×`li.entry`（`ol.entries`，`entry--l1/l2/l3` 三级缩进）；`.entry` 仅 hover 位移，靠 `ol` 流排。5 张 `figure.plate-figure`（`:64-250`）走 `auto-fit minmax(280px,1fr)` |
| S26 几何对撞栏 | 8 | no | 6 | `index.html:92-374` 8×`section.sec`（同父 `main`，`#p1`–`#p8`）；`style.css:203` `.sec` 只给 `padding-top`，`:207` `.two{display:grid}` 靠 `two--a…h` 的列比自动排，删节只是变短。**但**每节内的三色版 `section.plate--blue/red/black`（`:64-146`）在 `style.css:143` `grid-template-columns:5fr 3fr 4fr` + `:151-152` `--red{height:64%} --black{height:80%}` 写死，把"三块印版"减到 1 块则成套构图散架 —— 这是节内的二级硬编码组 |
| S27 手绘广告片 | 7 | no | 6 | `index.html:90-275` 7×`article.act`（`div.wrap`），`ACT-01…ACT-07`；`style.css:214` `.act+.act{margin-top:calc(var(--base)*12)}` 顺序流，`:230-236` 仅按 `nth-child` 排入场延时。6 张 `li.plate` 图版 |
| S28 爵士凹版墙 | 12 | no | 6 | `index.html:89-238` 4×`div.row` 各 3×`article.blk` = 12（文案"12 块"）；`style.css:175` `.row{grid-template-columns:repeat(16,1fr)}` + `:180` `.blk{grid-column:span var(--span,4)}` 自动流，`blk--cN` 只改 4–14px 错位量不占位；`:194-205` 的 `nth-child` 只挪墨点 |
| S29 钢丝装安全手册 | 23 | yes | 6 | `index.html:209` 起 `svg.diag` 内 23×`g.pt`（零件 07–23），`:247` 起 23 行零件表；`style.css:216-219` 逐点写 `.diag .pt:nth-of-type(8){--i:0}`…`(23)`，每个 `g.pt` 的 `path d` 又是手绘绝对坐标 —— 删一件则图与表错号（本案机制正是"图上 07 必须等于表第 7 行"） |
| S30 滑板贴纸对切 | 10 | yes | 6 | `index.html:74-122` `cut__col--a` 5 + `cut__col--b` 5 = 10×`article.sticker`；`style.css` `.cut__col--a{grid-column:1/7;grid-row:1}` / `--b{6/13;2}` 写死，两列靠 `grid-row` 上下错位才成"对切"，`:225-232` 又逐张写 `--d:0.16s…`；删一半则对切关系消失 |

## 其中 degrades = "yes"（会散架）的 13 案

| 方案 | minItems | 散架机制 |
|---|---|---|
| **S02** 烫金对称沙龙 | 16 | 梯级缩进 `(n-1-i)×14px` 逐条写死，两侧梯子要凑满 6/9 级才对称 |
| **S04** 芒果拼贴墙 | 9 | 每张写死 `--span/--lift/--rot`，删到 3 张＝12 栏留 9 栏空 |
| **S05** 像素冷库控制台 | 8 | 8 块面板写死 `grid-column/grid-row` 占满 8 栏×3 行 |
| **S08** 琥珀叠印灯箱 | 6 | 绝对定位 + 层号 `--l` 决定叠印位移与 6→10px 厚度梯度 |
| **S12** 青柠挖空墙 | 7 | `.op-01…07` 写死 `grid-column/grid-row/height`，7 个洞就是构图 |
| **S14** 零重力发射序列 | 11 | 11 枚标贴的极坐标 `--dx/--dy/--ux/--uy/--ord` 逐枚算死 |
| **S15** 渔业平面台账 | 14 | 14 个热区的 `<rect x/y/width/height>` 按舱室真实面积手绘 |
| **S19** 铜版植物标本柜 | 20 | 抽屉 `--s/--row` 写死 + 行标题"第 3 行 · 抽屉 09–12"是静态文本 |
| **S20** 绘图仪声场 | 6 | 6 张写死 `nth-child(n){span 1..3}`，2+2+1+3+1+3 刚好配平 4 栏 |
| **S22** 纸屏折页 | 6 | `plate--a…f` 六张写死 span 7/5/5/7/8/4，正好拼满 12 栏三行 |
| **S23** 剥落灰泥年代表 | 9 | `#f1…#f9` 写死 36 栏×220 行绝对位 |
| **S29** 钢丝装安全手册 | 23 | 23 个 `g.pt` 手绘绝对坐标 + 逐点 `nth-of-type` 编号，图与表必须同号 |
| **S30** 滑板贴纸对切 | 10 | 两列靠写死 `grid-row:1/2` 上下错位成"对切"，逐张又写 `--d` |

> **13 案**：S02、S04、S05、S08、S12、S14、S15、S19、S20、S22、S23、S29、S30。
> 共同点：**单元位置不是由内容算出来，是作者数出来的** —— 写死的 grid 坐标、写死的层号/角度、
> 手绘 SVG 路径、写死的行标题。用户只有 3 条内容时，它们不会变短，会留洞、留空标题、
> 留断掉的编号序列。
>
> S26 单列为**边界案**：它的一级重复单元（8 个 `section.sec`）是自动流、删节不散架，判 `no`；
> 但每节内那套「蓝/红/黑三色版」`section.plate`（`style.css:143` `5fr 3fr 4fr` +
> `--red{height:64%} --black{height:80%}`）是写死的成套构图，减到 1–2 块那一节就散。
> 若用户的内容形态是"每节三条并置读数"，这案应按 `yes` 对待。

### 对照"我只有 3 个产品"

- **可放心用（degrades=no，删到 3 条只是变短）**：S01(6)、S03(8)、S06(13)、S07(46)、S09(10)、
  S10(12)、S11(12)、S13(7)、S16(9)、S17(27)、S18(20)、S21(14)、S24(6)、S25(8)、S26(8)、S27(7)、S28(12)。
  标出的数字是它"设计时"的条目规模，不是"至少要这么多"。
- **绝不能用（degrades=yes）**：S02、S04、S05、S08、S12、S14、S15、S19、S20、S22、S23、S29、S30
  （+ S26 的节内三色版）。

## 与旧审计口径的差异（重要）

旧审计的"≥10 条才能撑住的有 8 案（S04 14、S09 10、S11 12、S13 11、S15 14、S18 17、S21 13、S29 23）"
用的是**「同一 class 出现 ≥5 次」**的粗计数，把三类东西混了进去：

- **正文行/行内文本**：S18 的 17 是 `pre.lines` 里 `span.ln` 的行数（正文行，不是条目）、
  S13 的 11 是 `p.levels__note` 里的 `span.mono`、S15 的 14 命中表里 `code`；
- **同一张图的多次引用**：S03 的 12 个 `<img>` 去重后只有 8 张；
- **几何/装饰重复**：S29 的 23 同时命中 `g.pt` 与 `tr`（这一项恰是同一批零件，判对了）。

按本表口径（同父级同 tag+class 的**版面单元**，排除正文行/表格单元格/装饰）：

- 旧口径把 **S09(10)、S11(12)、S13(7)、S18(20)、S21(14)** 判成"需 ≥10 才成立"，但它们的
  重复单元是 `column-count` / 普通块流 / `flex` 堆叠，**degrades=no**，属旧口径误伤；
- 反过来，旧口径**漏掉**了 S05(8)、S08(6)、S12(7)、S15(14)、S20(6)、S22(6)、S23(9)、
  S30(10) 这几案的"写死坐标"问题 —— 它们条目数不大，但**删了就散**，才是"内容少时不能选"的那批。

## 复现

```
deliverables/99-scratch/minitems/
  parse.mjs      极简 HTML 解析器（无依赖）
  fams.mjs       按首 class 统计族规模 / 父级数 / 是否含图
  cands.mjs      同父级同 tag+class 兄弟组候选（排除表格单元格 / 行内元素 / SVG）
  evidence.mjs   每组 + 其 CSS 定位规则对照
  units.mjs      逐案指定主单元，打印定位证据（grid-row / absolute / nth-child）
  imgs.mjs       <img> 引用 vs assets/ 目录未引用清单
  hardcoded.mjs  absolute / nth-child / 写死 grid-row / 内联 --i 索引 / 固定行标题
  verify.mjs     逐案正则复核条目数
```

`node <script>.mjs` 只读 `prototypes/`，不写仓库；**未修改任何原型文件**。
