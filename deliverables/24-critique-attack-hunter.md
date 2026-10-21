# 24 最坏情况缺陷猎人（attack hunter）· 穷举报告

> 口径：**最大化召回，允许误报**。每条带我自己的置信度（0–100%）。所有数字来自本机实跑，
> 没有一处写"应该是"。凭观察而非测量的条目已显式标注"未测量"。
>
> 环境：Chrome 155（headless=new，CDP `Emulation.setDeviceMetricsOverride`，`--disable-lcd-text`）、
> Node v24.14.0、Pillow 12.3.0。390 档一律走 CDP 或 iframe/裁剪，**没有**用 `chrome --window-size=390,844`。
> 全部页面通过 `http://127.0.0.1` 打开（`file://` 的 mask-image 失效坑已规避）。

---

## A. 阻断级

### AH-01｜阻断｜S13 在 390–1023 档「首屏两栏」没有折成单栏，正文被挤进 123px 宽的柱子里
- 现象：390 档下 S13 的抬头（`.letterhead__top`）仍是 `minmax(0,7fr) minmax(0,9fr)` 两栏，左侧函件抬头被压到约 123px 宽，
  每行只能排 6–8 个汉字，右侧 9fr 留给翻拍件，但翻拍件在该区块内不可见 → 首屏上半整片是"窄柱 + 大片空白纸"。
- 位置：`prototypes/S13-blind-debossed-dispatch/style.css` 第 662 行（`@media (max-width:1023px)` 内 `.letterhead__top{grid-template-columns:1fr;gap:24px;align-items:start}`）
  被第 681 行的基础规则 `.letterhead__top{grid-template-columns:minmax(0,7fr) minmax(0,9fr);gap:40px;align-items:end}` 压掉；档位 390 / 768 / 1024–1439 起效区；首屏。
- 证据：
  1. 静态级联分析（`_crit1/css-order.mjs`）：`style.css:662 @media (max-width:1023px) sel .letterhead__top => base L681 :: grid-template-columns: media(1fr) <- base(minmax(0, 7fr) minmax(0, 9fr)) | gap: media(24px) <- base(40px) | align-items: media(start) <- base(end)`（同特异性 (0,1,0)、基础规则源序在后 → 媒体查询内的意图全部失效）。
  2. 像素测量（`_crit1/out/S13-blind-debossed-dispatch-390-fold.png`，390×844）：文字暗像素的最大 x 坐标逐行实测 —— 抬头 kicker `(26,138)`、徽字号线 `(25,78)`、h1 `(26,148)`、副标题 `(25,148)`、正文 `(27,148)`；同图 1440 档 h1/副标题 x 范围 `(49,509)`。页面 390 宽、左右内距 24px → 可用 342px，文字柱只用了 123px。
  3. `_crit1/out/report.json`：S13@390 `pageH=8892`，本次扫描未报横向溢出（不是溢出，是**柱太窄**）。
- 为什么是缺陷（而不是设计意图）：`prototypes/_specs/S13.md` 字段 5 原文写明「断点：…**<1024px 单栏**，函号与日期由横排改为左对齐两行…」。同文件第 737–757 行的注释里，作者自己把这一类（基础规则写在媒体查询之后）定为"**阻断**级缺陷"并已在末尾补修 `.plates__grid` 与两张表——**唯独漏了 `.letterhead__top`**。
- 我的置信度：**92%**
- 建议怎么修：在文件最末尾（与 L760–765 同一个补修块）追加 `@media (max-width:1023px){ .letterhead__top{grid-template-columns:minmax(0,1fr); gap:24px; align-items:start;} }`；或把 L681 的基础规则上移到所有媒体查询之前。改完量 `.letterhead__top` 首个子元素宽度应 ≈342px。

### AH-02｜阻断｜S28 在 390 档「凹版拼贴 / 状态」两栏塌成 0px 宽，正文变成每行一个字的竖柱，高 6448px
- 现象：390 档下 `.press__main` / `.press__side` / `.status__main` / `.status__side` 的宽度实测为 **0px**，内容按每行 1 个汉字向下排，块高 6448 / 4233 / 5686 / 4639px（正常应是几百 px）。
- 位置：`prototypes/S28-jazz-intaglio-wall/style.css` 第 357 行 `.press__grid{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));column-gap:calc(var(--base)*3)}`、第 396 行 `.status__grid` 同款；第 526 行起的 `@media (max-width:767px)` 里只补了 `.press__main,.press__side,.status__main,.status__side{grid-column:auto}`（L531 区域），**没有**把它改回 `display:block`（`display:block` 只在 L499 的 768–1023 档里）。档位 390（≤767）；屏号：`press__main` 起于文档 y≈10414。
- 证据：
  1. CDP 实测（390）：`.press__grid` `display:grid`、`gtc="0px ×16"`、`gap="normal 24px"`、`w=350`；子项 `.press__main:0x6448@20`、`.press__side:0x4233@44`；`.status__grid` 同款（`status__main:0x5686`）。16 条 0px 轨道 + 15×24px 间隙 = 360px，已超过容器 350px，于是所有轨道被压到 0，自动列（`grid-column:auto`）落进 0px 轨道。
  2. 区域截图 `_crit1/crops2/S28-main-_press__main-390.png`（clip x=16,y=10414,w=8,h=4000）：画面就是**一列每行一个字的紫字**，条带宽 8px（= 元素 0px + 两边各 4px 留白）。这是"看不到内容"的直接证据。
- 为什么是缺陷（而不是设计意图）：该案自己的 CSS 注释（L526–535）写着：这一行原本只在 768–1023 存在，"≤767 漏了"，补 `grid-column:auto` 是为了修 34px 横向滚动条（审计批次 3 的 S28-F2）。**补 `auto` 而没补 `display:block`，把"横向溢出"换成了"整段塌成 0 宽"** —— 是修法引入的回归，不是风格。
- 我的置信度：**95%**
- 建议怎么修：在 `@media (max-width:767px)` 内加 `.press__grid,.status__grid{display:block}`（与 L499 的平板档同口径），并给 `.press__main,.press__side` 补 `margin-top`；改后量 `.press__main` 宽度应 ≈350px、高度应从 6448px 降到 <1200px。

---

## B. 明显级

### AH-03｜明显｜S02 的 6 列台账在 390 档不折行，单元格宽度 68.1px，中文字被切成每行 1.7 个字
- 现象：390 档 `table.ledger` 保持 6 列，`td` 实测 68.1px（4.25em），"银鎏金烟盒"5 字排 3 行、"金箔衬里名片匣"7 字排 4 行；区域截图里还出现 `No.` / `09` 被拆行、`16.3 × 11.0` 与 `cm` 被拆行。
- 位置：`prototypes/S02-gilded-symmetry-salon/index.html` 的 `table.ledger`（16 件器物台账）与"右半相位/位移比/阶梯"那张表；档位 390；屏号：本次实测该表在文档第 1 屏下半至第 2 屏（区域截图 `_crit1/crops2/S02-ledger-_ledger-390.png` 已含）。
- 证据：CDP 实测 `table.ledger @390: w=350, cols=6, 首行单元格宽度=[…]（min 68.1）`；纯文本单元格行盒实测 `perLine=1.67 / 1.75 / 2.0`（`_crit1/q5.js` 输出，已排除 `clip-path` 隐藏容器、只看可见容器）。
- 为什么是缺陷（而不是设计意图）：同库其他案在窄档是**折表**的（S11 `style.css:581` 把 `.spec` 全部改 `display:block` 并给 `td::before` 补字段名；S13 在 L760–802 折了 `.levels__table`/`.annex__table`；S29 L339–359 用 `::before` 折表）。同一作者在同一批原型里口径不一致，且此处结果不可读。规格未要求 390 档保留 6 列。
- 我的置信度：**78%**（"不可读"我确认；"是否算设计意图"我不敢 100% 排除）
- 建议怎么修：照 S29 L339–359 的做法，在 `@media (max-width:640px)` 内让 `thead` 视觉隐藏、`tr/td` 变 `display:grid` 并给 `td::before` 补字段名；或至少给该表 `overflow-x:auto` 的滚动容器 + `min-width`。

### AH-04｜明显｜S15 的 `table.weights` / `table.zones__table` 在 390 档不折，单元格 66.8px，9 个汉字排 6 行
- 现象：390 档单元格实测 66.8px（4.17em），"一次成型，静态全可见"9 字排 6 行、每行 1.5 字；"线宽照旧，去掉过渡"8 字排 5 行。
- 位置：`prototypes/S15-fishery-floor-ledger/index.html` 的两张表；档位 390；`_crit1/q5.js` 实测。
- 证据：CDP 实测 `table.weights @390: w=342, cols=3, 首行单元格=[60,230,52]`、`table.zones__table @390: w=342, cols=7`；行盒实测 `perLine=1.5 / 1.6 / 1.67`。
- 为什么是缺陷（而不是设计意图）：同一案在 1440 档可读，390 档退化到 1.5 字/行；库里同类表（S13/S29/S11）都折了。规格未要求 390 保留多列。
- 我的置信度：**72%**
- 建议怎么修：同 AH-03。

### AH-05｜明显｜S18 的分区标签数字用了 9px 字号，且对底色只有 3.36:1
- 现象：`code.tag__d` 实测 `font-size:9px`、前景 `#c8c4ae` 压在同族底色 `#6e6350` 上，对比度 **3.36:1**（9px 属小字，需要 4.5:1）。
- 位置：`prototypes/S18-phosphor-service-deck/` 挂牌条上的数字；档位 390 与 1440 均命中；`_crit1/out/report.json` 的 `contrastFail`（本次扫描全库 28 条去重命中里的 5 条是它）。
- 证据：CDP 计算样式实测 `fs=9px`、`color=rgb(200,196,174)`、最近不透明祖先底色 `#6e6350` → 比值 3.36（曲率按 WCAG 相对亮度算）。
- 为什么是缺陷（而不是设计意图）：合同 §6 明令"正文不得 <15px"；9px 连极小字号的下限都破了，且对比度不达 AA。若这些数字是"可读的读数"，则必须凑够对比度；若是纯装饰，就不该是文本节点（会把 `U+0030` 当正文统计）。
- 我的置信度：**70%**（字号与比值我确认；"该不该可读"取决于设计意图）
- 建议怎么修：字号提到 ≥12px 并把前景改成 `--ink` 系（对 `#6e6350` 达 4.5:1），或把数字移出文本树（改为 `aria-hidden` 的装饰层并保证不承载信息）。

### AH-06｜明显｜S07 有一个点了没反应的死锚点
- 现象：页面里 `<a class="act" href="#entry-118">翻到第 118 页的分类广告</a>`，而文档里**不存在任何 `id="entry-*"`**：真正存在的锚点是 `#p118`（`<a href="#p118" id="p118">`）。点击该链接什么都不发生。
- 位置：`prototypes/S07-slate-ink-contents/index.html` 第 22 行；三档皆同；首屏。
- 证据：`_crit1/out/report.json` 的 `deadAnchorCount=1 @390/768/1440`，`deadAnchors=[{sel:'a.act', href:'#entry-118'}]`（用 `document.getElementById` 判定）；`grep 'id="'` 全文件只出现 `lede-title / list-head / toc-list / p118 / p44 / …`，无 `entry-*`。
- 为什么是缺陷（而不是设计意图）：链接文案承诺"翻到第 118 页"，目标不存在；这是功能失效，不是排版取舍。
- 我的置信度：**95%**
- 建议怎么修：把 `href="#entry-118"` 改成 `href="#p118"`（或给目录项加 `id="entry-118"`）。

### AH-07｜明显｜S02 的「错误状态」默认 `display:none`，静态截图永远看不到
- 现象：`<p id="slot-error" class="state state-error">` 文本为"这个时段刚被订走：14:20 与 14:40 两格冲突，错误码…"，实测 `display:none`，只有点击预约后由 JS 显形。
- 位置：`prototypes/S02-gilded-symmetry-salon/index.html`（`#slot-error`）；三档皆同；证据来自 `_crit1/q2.js` 的 `hiddenText` 输出：`{"sel":"p#slot-error.state.state-error","why":"disp=none …"}`。
- 证据：CDP 计算样式实测 `display:none`（`_crit1/q2.out.txt`，390 与 1440 两档都命中）。同库 S13 的错误态是可见区块，S29 的错误态在正文里可达。
- 为什么是缺陷（而不是设计意图）：`_CONTRACT.md` §9.12 就是拿 S02 当反面教材写的：「S02 的错误态 `BOOK-409` 在 DOM 里但默认隐藏、点击预约才出现，静态截图永远看不到——而评审找的正是"必须有错误状态"。错误态要在首屏或截图可达的位置有可见入口」。这条至今未修。
- 我的置信度：**85%**
- 建议怎么修：按 §9.12 给出的三条路之一改：首屏可见的"状态"区块、或 `<details>` 展开、或把错误态作为可见列表项列出。

### AH-08｜明显｜表单控件的文字掉进浏览器默认字体（Arial 13.33px / 16px），与页面字体不一致
- 现象：`<input>` 的值与 `<button>` 的标签用浏览器的 UA 默认字体渲染（Chrome 计算值 `Arial`）：
  - `templates/M03-bold-creator/index.html` 的 `button.btn.copy-btn` 标签"复制邮箱" → `font-family: Arial`、16px、109×48（模板自称"系统字体栈、任何机器立刻正确显示、不跳字"，但这个按钮与其余部分的 `ui-sans-serif/system-ui` 不是同一族）。
  - `prototypes/S05-pixel-cold-storage-console/` `input#target.lever-input` 值 "-18" → Arial 13.333px。
  - `prototypes/S20-plotter-soundfield/` `input#in-f` "220"、`#in-a` "62"、`#in-s` "1" → Arial 13.333px。
- 位置/证据：全库 CDP 查询（`_crit1/q2.js`，35 页 × 390/1440）：`font-family` 首族为 `Arial` 且有可见文本的元素共 8 个（列于上）。同查询也证明了**CSS 里没有任何禁用字体栈声明**（`grep Arial|Helvetica|Roboto|Inter|system-ui|…` 在 prototypes/*.css 只命中 S03 的一句注释）——所以这是"控件不继承页面字体"的继承缺失，不是声明违规。
- 为什么是缺陷（而不是设计意图）：字号 13.33px（=10pt）与页面正文差一档，肉眼可见"这行字跟别的不一样"；M03 的 README 明确承诺系统栈不跳字。
- 我的置信度：**78%**（M03 按钮 85%；S05/S20 的数字槽 70%）
- 建议怎么修：给表单控件显式继承：`input,button,select,textarea{font:inherit}`（放在各页基础规则里），或逐个控件补 `font-family`。

### AH-09｜明显｜选型台自己写的一条"事实"与它自己的数据相反：页面说"中间明度带一个都没有"，实际有 1 个（S09）
- 现象：`prototypes/_selection/index.html` 第 47 行 rail-hint：`…30 个里有 18 个落在"暖浅色带"，而"中间明度带"一个都没有。` 但同一页用于渲染筛选 chip 的 `data.js` 里，`axes.band === '中间明度带'` 的案子有 **1 个：S09（bg `#F5C842`，h45 l61）**，且 `app.js:100` 就是从该字段生成 chip → 点"中间明度带"会筛出 1 条，与文案直接矛盾。
- 位置：`prototypes/_selection/index.html:47`；`prototypes/_selection/data.js`（`axes.band`）；`prototypes/_selection/app.js:100/114`。
- 证据：`new Function('window',src)` 载入 data.js 后统计：`band {"暖浅色带":18,"冷暗带":5,"暖暗带":3,"中间明度带":1,"中性浅带":2,"冷浅色带":1}`。
- 为什么是缺陷（而不是设计意图）：文案自称"由实测值算出"，而它被自己页面上的数据推翻；用户点 chip 立刻看到 1 条结果。
- 我的置信度：**92%**
- 建议怎么修：改成"'中间明度带'只有 1 个"；或把该句从硬编码改为按 `data.js` 现算（本来就是同一份数据）。

### AH-10｜明显｜README/README-EN 的"暖浅色带 19 个（73%）"与当前数据不符，实际 18 个
- 现象：`README.md:169` 与 `README-EN.md:170` 都写「实测 26 个案子里有 **19 个（73%）** 落在暖浅色带（色相 36–65°、明度 81–93%），近同色对 21 对」；按同一条判据在**当前** 30 案的底值上重算只有 **18 个**。
- 位置：`README.md:169`、`README-EN.md:170`；数据源 `prototypes/_selection/data.js` 的 `axes.{bandHue,bandL}` 与 `bg`。
- 证据：两个独立算法都得 18：(1) 直接用 `data.js` 的 `bandHue∈[36,65] ∧ bandL∈[81,93]` 过滤 → 18；(2) 只看 `axes.band === '暖浅色带'` → 18（逐案列表：S01 S04 S06 S07 S10 S11 S13 S16 S17 S19 S20 S21 S22 S23 S25 S26 S27 S29）。分母与口径（26 还是 30）在两份 README 里也没说清（19/26=73%，18/30=60%）。
- 为什么是缺陷（而不是设计意图）：这是一条可复算的实测数字，用来支撑"选不出风格是真问题"的论证；数字与两份 README、两份不同来源对不上。
- 我的置信度：**88%**
- 建议怎么修：把两份 README 改成 18/30（60%），并写清判据与分母；或把这条改成引用 `data.js` 的现算输出。

### AH-11｜明显｜选型台展示的 S21 闸门结果是 3 天前的旧值（3 个 FAIL、0 张真实图片），当前报告是 1 个 FAIL、6 张图
- 现象：`data.js` 里 S21 的 `gate` 是 `at=2026-10-17T18:57:52Z, fail=3, failIds=[mono,few-pictures,empty-screens], realPictures=0`；而 `prototypes/S21-interlocking-release-book/.inspect/report.json` 当前是 `at=2026-10-21T12:55:45Z, 1 个 FAIL（mono）, realPictures=6`。选型台是按 `data.js` 渲染的 → 访客看到"闸门 3 FAIL / 没有真实图片"。
- 位置：`prototypes/_selection/data.js`（S21 记录）、`prototypes/_selection/app.js:61-64` 的 `f-clean`/`f-shots` 与行内 gate 列；对照 `.inspect/report.json`。
- 证据：`_crit1/gates.mjs` 对 31 个 report.json 与新生成的 data.js 逐案比对，列出 6 处 `at` 不一致（S12/S13/S19/S21/S25/S28），其中 **S21 连 failIds 与 realPictures 都不一致**；其余 5 处只是时间戳。
- 为什么是缺陷（而不是设计意图）：`_CONTRACT.md` §9.6 规定"`report.json` 的 `at` 是这份报告还算不算数的唯一依据"；`data.js` 是 `collect-schemes.mjs` 的生成物，没重跑就把旧结论端给用户。
- 我的置信度：**90%**
- 建议怎么修：重跑 `node prototypes/_build/collect-schemes.mjs` 覆盖 `data.js`；并给它加一条"任一案 `report.json.at` 新于 data.js.at 就报警"的检查。

### AH-12｜明显｜README 的"已知缺口"里 S21 那句已经过期：它现在引用了 6 张真实图片
- 现象：`README.md:168` 写「`S21` 页面还没引用已备好的照片——这两处是**真的内容偏薄**」；当前 S21 的报告 `realPictures=6`（390/768/1440 三档都是 6），`_crit1/out/report.json` 里 S21 有 6 个 `<img>` 全部 `complete=true`、`naturalWidth>0`。
- 位置：`README.md:168`（同段 README-EN）；对照 `prototypes/S21-interlocking-release-book/.inspect/report.json` 与本次 CDP 实测。
- 证据：`_crit1/gates.json`（S21 三档 `realPictures=6`）；`_crit1/out/report.json` S21 `brokenImages=0`。
- 为什么是缺陷（而不是设计意图）：README 把"还不存在的素材引用"当成交付缺口写在外；同时 §9.11 的"闸门 FAIL=0 不代表规格对上了"反过来也成立——这里是**文档比现状更差**，会让人重复补素材。
- 我的置信度：**85%**
- 建议怎么修：把该句改成现状（S21 已引用 6 张），或改为"S21 的 mono FAIL 仍为已知豁免"（当前的 `failIds` 只剩 `mono`）。

### AH-13｜明显｜README 对 S13/S08 的闸门缺口只写了 1/4 与 1/2 的 FAIL 项
- 现象：`README.md:168` 只说 S13 的问题是"有 3 屏近乎空白"、S08 的问题是"琥珀主色"；实测当前 S13 有 **4 条 FAIL**（`mono@1440`、`shadow@1440`、`button-fx@1440`、`empty-screens@1440`），S08 有 **2 条**（`palette-terracotta@1440`、`font-count@1440`）。
- 位置：`README.md:168`；`prototypes/S13-blind-debossed-dispatch/.inspect/report.json`、`prototypes/S08-amber-overprint-lightbox/.inspect/report.json`；`prototypes/_selection/data.js` 里两条记录的 `gate.failIds` 完整列出（说明数据层知道，"已知缺口"那节漏写）。
- 证据：`_crit1/gates.mjs gate` 输出 `S13 FAILn=4 … shadow@1440 button-fx@1440`；`S08 FAILn=2 … font-count@1440`。
- 为什么是缺陷（而不是设计意图）：`_CONTRACT.md` §7.2 要求 WARN 逐条解释、§9.11 要求"每个原型交付时列出自己知道的最弱处"。`shadow` 与 `button-fx` 是 30 案硬约束里的项目（禁圆角浮起卡片/按钮特效），只字未提。
- 我的置信度：**85%**
- 建议怎么修：把 S13 的 4 条、S08 的 2 条 FAIL 逐条写进"已知缺口"并各给豁免理由或排期。

### AH-14｜明显｜S14 的闸门结论所依据的版本比文件本身早 9–11 分钟（报告已过期）
- 现象：S14 的 `.inspect/report.json` `at=2026-10-17T20:01:39Z`，而 `index.html` mtime = `2026-10-17T20:10:24Z`（晚 9 分钟）、`style.css` mtime = `2026-10-17T20:12:36Z`（晚 11 分钟）。README 的"26 个闸门 FAIL=0"于是有 1 个案子建在过期结论上。
- 位置：`prototypes/S14-zero-g-launch-sequence/`（`report.json` vs `index.html`/`style.css` mtime）；`README.md:14`。
- 证据：`_crit1/gates.mjs stale` 逐案比对 `at` 与两份文件 mtime，31 个 report 里**只有 S14 出现正差值**（9 / 11 分钟），其余 30 个的 `at` 都晚于文件。
- 为什么是缺陷（而不是设计意图）：§9.6 把 `at` + 两份文件的 mtime + sha256 定为"我验证的是哪个修订"的唯一依据；这里三者对不上。
- 我的置信度：**70%**（时间差是实测；"是否已被后续全局验收覆盖"我无法判断）
- 建议怎么修：重跑 `node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence`，并把 sha256 写进交付说明。

### AH-15｜明显｜30–45 KB 的 index.html 区间有例外，最大一案 48.4 KB
- 现象：`README.md:174` 写「少数原型的 `index.html` 在 30–45 KB，超过内部施工规范的目标区间」；实测 `prototypes/S29-wire-bound-safety-manual/index.html` = **49512 B（48.4 KB）**，另有 S28 44753 B、S18 41569 B、S15 42439 B 在 41–44 KB。
- 位置：`README.md:174`；`_CONTRACT.md` §2 的目标区间 18–27 KB；`prototypes/S29-…/index.html`。
- 证据：`Get-ChildItem` 逐案字节数（30 案全部列出，见文末"跑过的测量"）。
- 为什么是缺陷（而不是设计意图）：README 自己给了上限却没说破上限的那个案子；数字可复算，属"文档说了但实际不是那样"。
- 我的置信度：**80%**
- 建议怎么修：把区间写成实测区间（如"30–48.4 KB，最大为 S29"）或把 S29 的正文拆到别处。

### AH-16｜明显｜模板层声明的"12 个 CSS 变量"在 M01/M03 与文件一致，但 README 的"46 个样式表"少 2 个
- 现象：`README.md:187` 写 `_fonts/`「46 个样式表 + woff2 分片」；实测 `prototypes/_fonts/css/*.css` 共 **48** 个。
- 位置：`README.md:187`（README-EN:188 同）；`prototypes/_fonts/css/`。
- 证据：`(Get-ChildItem prototypes\_fonts\css -File -Filter *.css).Count = 48`；woff2 分片实测 871 个。
- 为什么是缺陷（而不是设计意图）：同段还负责解释"自托管字体"的规模，数字与实际差 2（`_CONTRACT.md` §9.8 还专门提醒过同族多缓存文件并存，读的人会更依赖这个计数）。
- 我的置信度：**80%**
- 建议怎么修：改成 48，或写成"46–48 个（含同族多字重缓存）"。

### AH-17｜明显｜`_section` 侧 390 档，M02 的两个导航链接被别的东西盖住（点击落点不是它）
- 现象：390 档下 `a`（"菜单与价目"）的命中元素是 `rect`、`a`（"订位与联系"）的命中元素是 `div.hero-band`；也就是这两个可点元素的中心点被别的元素占用。
- 位置：`templates/M02-warm-local/index.html`（导航与主视觉信息带）；档位 390；`_crit1/out/report.json` 的 `occludedInteractive`。
- 证据：CDP `document.elementFromPoint(中心点)` 实测：`M02-warm-local @390 a covered-by rect label="菜单与价目"`、`@390 a covered-by div.hero-band label="订位与联系"`（同一次扫描里 M02@1440 只有 skip-link 命中，属正常）。
- 为什么是缺陷（而不是设计意图）：我**未能**确定被盖住的是不是"桌面导航在窄屏已折叠"的残留（折叠后通常 `display:none`，而这两个仍是可见尺寸）——所以按"宁可多报"报出，但请看下面的置信度。模板层的 README 承诺"改几个变量就能变成你自己的站"，导航点不动是最坏情况。
- 我的置信度：**45%**（很可能是折叠下拉里的链接，我的探针没排除"父级折叠"这一情形）
- 建议怎么修：核对 390 档折叠菜单的 DOM 是否只留触发按钮；若链接仍可见则调 `z-index`/`position`，并把折叠态用 `display:none` 而不是遮挡。

### AH-18｜明显｜S21 的连锁条按钮只有 18×18px，S13 的选钮 13×13px，S21 的选钮 16×16px
- 现象：390 档实测可点元素尺寸：`button.plate` 18×18（标签为 "1"、"6" 等数字）、`input`(radio) 13×13（S13）、`input`(radio) 16×16（S21）。均低于 WCAG 2.5.8 的 24×24 最小目标。
- 位置：`prototypes/S21-interlocking-release-book/index.html`（`.plate` 按钮、slot radio）、`prototypes/S13-blind-debossed-dispatch/index.html`（pressmode radio）；档位 390 与 1440。
- 证据：CDP `getBoundingClientRect` 实测（`_crit1/q2.js` 的 `smallIconTaps`）：`S21 button.plate 18x18 txt=1`、`S21 input 16x16`、`S13 input 13x13`；原生 radio 的 13×13 属 UA 默认，但外层 `<label>` 是否撑大到 24px 未测。
- 为什么是缺陷（而不是设计意图）：这两案都是"用数字当按钮"的设计，18px 的方形按钮在触屏上命中困难。
- 我的置信度：**60%**（尺寸是实测；"是否算阻断"取决于它们的定位，bool；外包 label 可能已给出足够命中区，我没量 label）
- 建议怎么修：给按钮补 `padding` 或用伪元素把命中区扩到 ≥24×24（视觉尺寸不变）。

### AH-19｜明显｜S07 在 768 档把 4 张照片放大到 1.5–1.8 倍，S17 放大 1.58 倍并大幅裁切
- 现象：768 档 S07 的 `assets/plate-column.jpg`（413×800）被画成 728×520（放大 1.76×，同时比例从 0.52 变成 1.40）、`plate-gravure.jpg`（427×800）1.70×、`plate-detail.jpg`（490×700）1.49×、`plate-lower.jpg` 1.70×；S17 的 `assets/heritage-1913-hejaz-revenue.jpg`（388×543）画成 612×260（1.58×，比例 0.71 → 2.35）。
- 位置：`prototypes/S07-slate-ink-contents/assets/*`、`prototypes/S17-revenue-stamp-stub/assets/heritage-1913-hejaz-revenue.jpg`；档位 768。
- 证据：CDP 实测 `naturalWidth/Height` 与 `getBoundingClientRect` 的比值（`_crit1/final.mjs imgs`）：`UP … nat=413x800 disp=728x520 scale=1.76` 等 5 条。
- 为什么是缺陷（而不是设计意图）：`_CONTRACT.md` §8.7 直接点名这类问题（"别把 300×200 的图拉满 1440 宽——会让页面看起来是色块而不是照片"）。`object-fit` 是 `fill`/`cover` 时放大+裁切会同时发生模糊。
- 我的置信度：**75%**
- 建议怎么修：换更高分辨率的源图，或在 768 档限制 `max-width` 到原生宽度（728→413 会让版式改变，故建议换图）；S17 那张建议改用 16:10 原始截图。

### AH-20｜明显｜选型台"截图总数"与磁盘上的截图数差 10 张，README 的 271 也是同一口径
- 现象：`data.js` 引用的截图文件数 = 271（`app.js:45-46` 累加得出 `#f-shots`），README 写"271 张渲染截图"；但 `.inspect/` 里实际有 **281** 个 jpg/png。差值是每档只引用前 2–3 张 `*-page-0N.jpg`，磁盘上更多。
- 位置：`prototypes/_selection/app.js:45`、`prototypes/_selection/data.js`（`shots` 字段）、`README.md:14`；全部 30 个 `.inspect/`。
- 证据：`data.js` 累加 = 271；`Get-ChildItem prototypes -Recurse -Include *.jpg,*.png | Where-Object { $_.FullName -match '\\\.inspect\\' }` = 281；`.inspect` 目录数 31。
- 为什么是缺陷（而不是设计意图）：数字口径没写清（"引用数"还是"磁盘数"），两处都用了绝对口吻。
- 我的置信度：**55%**（差值我确认；是否值得改口径由交付方定）
- 建议怎么修：README 改成"选型台引用 271 张（磁盘共 281 张）"。

---

## C. 轻微 / 存疑（多为"看着不对劲"，已标注未测量部分）

### AH-21｜轻微｜S01 的红色分区里有一处继承来的墨色，对底色只有 2.89:1
- 现象：`p.col-meta` 的文本节点 `·` 用 `#1a1614` 压在 `#c1121f` 上，实测 **2.89:1**（15px 需 4.5:1）。
- 位置：`prototypes/S01-red-wedge-broadsheet/`（含 `--red` 的分区内的 `.col-meta`）；档位 390（768/1440 未命中同一节点）。
- 证据：CDP 计算样式：`color=#1a1614`、最近不透明祖先底色 `#c1121f` → 2.89。**这个数字与 `_CONTRACT.md` §9.2 记录的"红底上继承的墨色 2.9:1"是同一个**——说明该处当时被工具量出过，至今仍在。
- 为什么是缺陷（而不是设计意图）：§9.4 明说"凡是红底／墨底分区，必须在自己的作用域里把后代色重新声明一遍"。命中的只是分隔点号，用户影响小，故列轻微。
- 我的置信度：**55%**（数值确定；"仅一个 `·`"意味着实际危害很小，我也没有确认同一分区里其他文字是否也偏低——探针只报了这一个文本节点）
- 建议怎么修：在该分区作用域内重声明 `color`（如 `--paper`）。

### AH-22｜轻微｜S12「错误码 MASK-05」的强调色对底色 3.91:1（17px 正文线 4.5:1 不足）
- 位置：`prototypes/S12-lime-knockout-wall/` 的错误态 `strong`；档位 390 与 1440。
- 证据：CDP 计算样式 `color=rgb(226,62,87)`、祖先底色 `rgb(24,34,38)` → 3.91（`fs=17px`、`fw=400` → 需 4.5）。
- 为什么是缺陷（而不是设计意图）：错误码是关键信息，`_CURRENT-VALUES.md` 只核过主色对底比值，没覆盖"错误态强调色"。
- 我的置信度：**70%**
- 建议怎么修：把错误态的强调色压深到对 `#182226` 达 4.5:1。

### AH-23｜轻微｜S22 分区标签 4.32:1、S25 静默按钮 4.29:1、S26 空态句 4.29:1 —— 三处都在 AA 正文线下方一点
- 位置/证据：CDP 计算样式实测 —— S22 `p.band__label` `#565b49` on `#cdcbc3` = 4.32（15px）；S25 `button.btn--quiet` `#6b625a` on `#dfdad2` = 4.29（16px）；S26 `p.empty__say` `#485270` on `#c3c1b9` = 4.29（17px）。
- 为什么是缺陷（而不是设计意图）：差值很小（4.29–4.32 vs 4.5），但都是**正文/界面文字**；`_CURRENT-VALUES.md` 只核了主色对底，没核"次级底上的次级字"。
- 我的置信度：**68%**
- 建议怎么修：各自再压深一档（约 6–8% 明度）即达标；或把这三种字提到 18.66px+700 的"大字"档。

### AH-24｜轻微｜根目录 `index.html` 声明的 `Noto Sans SC` 没有加载，实际字体不是它
- 现象：`index.html:18` 写 `font-family:"Noto Sans SC","Archivo",system-ui,sans-serif`，但该页没有任何 `<link>`/`@font-face` 引入 `Noto Sans SC`（字库在 `prototypes/_fonts/`，本页不引用）→ 实际用系统回退；`code` 用 `ui-monospace`。
- 位置：`index.html:18,25`。
- 证据：读该文件全文（35 行）确认无字体引用；`_CONTRACT.md` §9.15 说明 `font-fallback` 规则就是查"声明了却没随包发布"这一类。
- 为什么是缺陷（而不是设计意图）：跳转页只有 3 行字，影响小；但它声明了 30 案里被禁的 `system-ui` 也未被任何文档豁免（模板层的豁免只写在 `templates/*/README.md`）。
- 我的置信度：**60%**
- 建议怎么修：把字体栈换成真实可用的系统字体名（如 `"Microsoft YaHei","PingFang SC",sans-serif`），或引入 `_fonts` 里已有的分片。

### AH-25｜轻微｜S13 的 `forced-colors` 降级被基础规则压掉两条
- 现象：`@media (forced-colors:active)` 内 `.plate__meta/.plate__credit{color:CanvasText}` 被 L705/L706 的 `color:var(--ink)` 覆盖（同特异性、源序在后）→ 强制高对比模式下这两个标签不会变成 `CanvasText`。
- 位置：`prototypes/S13-blind-debossed-dispatch/style.css:621`（媒体）vs `705/706`（基础）。
- 证据：`_crit1/css-order.mjs` 输出：`style.css:621 @media (forced-colors: active) sel .plate__meta => base L705 :: color: media(CanvasText) <- base(var(--ink))`（`.plate__credit` 同）。
- 为什么是缺陷（而不是设计意图）：该案把 `forced-colors` 当作"最该被追问的一处"写进注释，结果两条声明是死的 → 声明与效果不符。
- 我的置信度：**62%**（无浏览器强制高对比环境可实测，仅静态级联证明；`var(--ink)` 与 `CanvasText` 在多数主题下恰好接近，故影响可能为零）
- 建议怎么修：把这两条移到文件末尾的补修块里重声明一次。

### AH-26｜轻微｜S08 的 65–78 个元素在 390/768 档向右溢出 155–322px
- 现象：390 档 `div.plate` / `div.plate-face` / `div.plate-ink` 共 78 个元素右侧越界最多 155px；768 档 65 个越界最多 322.6px；页面根 **没有**横向滚动条（`documentElement.scrollWidth == 390/768`）。
- 位置：`prototypes/S08-amber-overprint-lightbox/style.css`（印版与套印错位层）；档位 390/768。
- 证据：CDP 逐元素 `getBoundingClientRect` 实测（`_crit1/out/report.json` → `hOverflow`/`hOverflowCount`）；根滚动条实测为 `hasHScroll=false`。
- 为什么是缺陷（而不是设计意图）：该案的机制就是"套印错位/出血"，错位本身是意图；我无法判定 155px 是否全部来自意图内的错位量（该案 1440 档的越界元素是 0）。**故仅列为存疑，请以规格为准**。
- 我的置信度：**35%**（未测量：被溢出部分是否被 `overflow:hidden` 的祖先裁掉，以及是否与字段 6 的错位值一致）
- 建议怎么修：若越界量大于字段 6 声明的错位值，收回到声明值内；否则在交付说明里写明这是机制。

### AH-27｜轻微｜S14/S26/S06/S23/S30 在各自档位有 1–52 个元素越界（根滚动条都为 0）
- 现象：S14@1440 `div#field.field` 越界 39.5px；S26@1440 `i` 系元素 39 个各越界 14.4px；S06@390 `span.stain` 系 12 个越界 7.8–18.1px；S23@390 `div.rail__i` 系 16 个越界最多 258px；S30@390/768/1440 `span.cut__lower` 越界 3808/1526/1994px。
- 证据：CDP 实测（同一份报告）。所有档位的 `documentElement.scrollWidth == innerWidth`，即都未产生横向滚动条。
- 为什么是缺陷（而不是设计意图）：S30 的 3808px 明显是被裁掉的装饰带（徽章/色条），S06 的 `stain`（渍斑）也是装饰；这几例**多数应属意图**。列出来只因为"越界量远大于可见范围"是这类 bug 的典型形态，需要逐条对照规格确认。
- 我的置信度：**30%**（未测量：是否被祖先 `overflow:hidden` 裁掉）
- 建议怎么修：不需要改；建议在 `_CONTRACT.md` 里补一条"装饰性越界的允许上限"以便下次审查有判据。

### AH-28｜轻微｜S17@768 有 3 屏"近乎空白"（工具自己的 filled 指标 0.07/0.07/0.09），S21@390 有 2 屏 0.08
- 现象：按 `.inspect/report.json` 里工具自算的 `filled`（每屏内容占比）：S17@768 最低三屏 0.07/0.07/0.09；S21@390 最低两屏 0.08/0.08；S08@1440 最低屏 0.07；S13@1440 最低三屏 0.14/0.16/0.17（README 已承认 S13"3 屏近乎空白"）。
- 位置：`prototypes/S17-revenue-stamp-stub/.inspect/report.json` 等；档位如上。
- 证据：`_crit1/gates.mjs` 从 31 个 report.json 抽出的 `filled` 数组（S17@768 = 0.07,0.07,0.09,…；S21@390 = 0.08,0.08,0.16,…）。
- 为什么是缺陷（而不是设计意图）：`empty-screens` 只在 S13@1440 上判 FAIL，同性质的 S17@768/S21@390/S08@1440 没被判（阈值可能只在 1440 档跑）。这会让人以为"只有 S13 内容偏薄"。
- 我的置信度：**60%**（数字是工具的；我自己的整页截图对高页面不可靠，未能独立复核这些屏，**未测量**独立像素证据）
- 建议怎么修：把 `empty-screens` 判据跑全三档；把 S17@768 的三屏补内容或注明。

---

## 统计

**按严重度**
- 阻断：2 条（AH-01、AH-02）
- 明显：18 条（AH-03 … AH-20）
- 轻微/存疑：8 条（AH-21 … AH-28）
- 合计：28 条

**按缺陷类型**
| 类型 | 条目 | 数 |
| --- | --- | --- |
| 列宽被挤到不可读 / 内容塌陷 | AH-01、AH-02、AH-03、AH-04 | 4 |
| 文字与底色撞色 / 低对比 | AH-05、AH-21、AH-22、AH-23 | 4 |
| 页面文案或 README 与实际不符 | AH-09、AH-10、AH-12、AH-13、AH-15、AH-16、AH-20 | 7 |
| 证据/报告过期（`at` 与 mtime 对不上、data.js 未重跑） | AH-11、AH-14 | 2 |
| 点了没反应 / 点不到 | AH-06、AH-17、AH-18 | 3 |
| 文档说必须可见、实际默认隐藏 | AH-07 | 1 |
| 字体错配 / 声明与加载不符 | AH-08、AH-24 | 2 |
| 图片放大失真 / 裁切 | AH-19 | 1 |
| 响应式降级被级联压掉（同 AH-01 类，另一处） | AH-25 | 1 |
| 横向溢出元素（根滚动条为 0，存疑） | AH-26、AH-27 | 2 |
| 空屏 / 近乎空白屏 | AH-28（另 AH-13 已含 S13 的 3 屏） | 1 |

---

## 我实际跑过的测量（命令 + 关键数字）

1. **全库运行时测量（35 页 × 3 档 = 105 次）**
   `node _crit1/probe.mjs --targets <30 案 + _selection/index.html + wizard.html + M01..M03> --out _crit1/out --widths 1440,768,390`
   产出 `_crit1/out/report.json`（含 hOverflow/contrast/小字号/窄列/裁切/可点尺寸/遮挡/断图/标题行数/字体/网格/skip 链接/死锚点）。
   关键数字：`horizontalOverflow` 根滚动条 **全部为 0**（30 案 + 3 模板 + 2 选择页）；`brokenImages=0`；`noAlt=0`；HTTP 404 只有 `/favicon.ico`；控制台 error/warning **0**。
   与官方口径对齐验证：S14 `pageH=7569@1440 / 12161@390`，与 `_build/SHOT-README.md` §8 表格里的 7569 / 12161 **逐字节一致** → 说明我的视口与页高口径可信。

2. **级联顺序静态分析**：`node _crit1/css-order.mjs prototypes templates`
   输出 `_crit1/css-order.json`：`cascade=5` 条（同特异性、媒体查询被更后源序基础规则压掉）。其中 **1 条为真**（AH-01 `.letterhead__top`）、2 条已被文件末尾补修块救回（`.plates__grid` L760–765）、2 条是 `forced-colors` 内的 `color`（AH-25）。
   同脚本的**同名类跨标签**检查给出 14 处（S12 `plates`/`states` 仍在 `section` 与 `ul` 上各 1 个、S23 `wrap` 在 `div/section/footer`、S29 `bleed` 在 `section/footer`、M03 `wrap`/`rail`、wizard `wz-list` 在 `ol/ul`）。**这些我都未能在运行时坐实为缺陷**，故不作为条目，只记录。

3. **区域截图（真实视口内、文档坐标裁剪）**：`node _crit1/clip.mjs --target <页> --width 390 --sel "<选择器>" --out _crit1/crops2/…`
   - `S28-main-_press__main-390.png`：clip `x=16,y=10414,w=8,h=4000` → 8px 宽竖排单字条（AH-02 的直接证据）
   - `S02-ledger-_ledger-390.png`：`374×1751`，含 6 列表格的拆行现象（AH-03）
   - `S15-_zones__table-390.png`：`366×1056`（该选择器在该档命中区域，未复现窄柱；AH-04 依据的是 DOM 行盒实测而非此图）

4. **文字行盒实测（排除隐藏容器）**：`node _crit1/ask.mjs --targets <35 页> --widths 390,1440 --expr-file _crit1/q5.js`
   关键数字：S02 `td w=68.1 fs=16 perLine=1.67–2.0`；S15 `td/th w=66.8 perLine=1.5–1.67`；S11/S10 此前命中的 20px `th` 经"祖先 `clip-path:inset(50%)`"过滤后**全部消失**（确认是假阳性）。
   第一行单元格宽度：S11 `table.spec @390 cells=[20,20,20,20]`（该表在 ≤767 已折为 block，`th` 属隐藏 `thead`）；S02 `table.ledger cols=6`；S15 `table.weights cells=[60,230,52]`。

5. **表单字体实测**：`node _crit1/ask.mjs --targets <35 页> --widths 390,1440 --expr-file _crit1/q2.js`
   关键数字：`font-family` 首族为 `Arial` 且有可见文本的控件 8 个（S05 1、S13 2、S20 3、S21 2，另 M03 `button.btn.copy-btn` 16px/109×48）；`grep` 全库 CSS 的禁用字体栈声明命中 **0 处**（仅 S03 一句注释）。

6. **闸门与陈旧度**：`node _crit1/gates.mjs gate|stale|ovf|tiers`
   关键数字：31 份 `report.json`；FAIL>0 的只有 4 案（S07 1、S08 2、S13 4、S21 1）→ README 的"26 个 FAIL=0"成立；`at` 早于 `index.html` mtime 的**只有 S14**（+9 分钟 / style.css +11 分钟）；`horizontalOverflow` 在全部报告里为 0；S17@768 `filled` 最低 0.07、S21@390 0.08、S08@1440 0.07。

7. **data.js 与报告比对**：`node _crit1/gates.mjs json` + 在 Node 里 `new Function('window', src)` 载入 `data.js`
   关键数字：`data.js` 30 条；`F=15 / R=15`；`threshold 低11/中12/高7`（与向导文案一致）；`loud 就要扎眼19`（与选型台文案一致）；`band 暖浅色带18 / 中间明度带1(S09) / 冷暗带5 / 暖暗带3 / 中性浅带2 / 冷浅色带1`；引用的截图数 271；`at` 与当前报告不一致 6 处（S12/S13/S19/S21/S25/S28），其中 S21 连 failIds 与 realPictures 都不一致。

8. **像素与切片**：`python _crit1/screens.py`（105 张整页 PNG 逐屏统计，输出 `_crit1/out/screens.json`）
   关键数字：整页 `captureBeyondViewport` 在**长页面**上会出现大段空白纸（S29@1440 y=900–6300 多屏 100% `#d9d3c4`），而同案官方 `.inspect` 报告的最低 filled 是 0.29 → **我判定这是我这条采集链路的工件，不是页面缺陷**，故未据此报条目（`_CONTRACT.md` §7 与 `SHOT-README.md` §7.3 也记了同类限制：长窗口/懒加载只能命中视口与预载边距内的内容）。
   另：`_crit1/scan.py`/`scan3.py`（裁剪首屏框内像素测"渲染后对比度"）在 S21 `span.lockbar__no.face-data` 上给出 1.00:1，但经核对，该数字的底色来自**兄弟节点** `.lockbar__body`（`background:var(--ink)`）——我的祖先链求解器看不见兄弟绘制的背景。**故判为假阳性，未列为条目**（详见下节）。

9. **文档核对**：`README.md` / `README-EN.md` / `_CONTRACT.md` / `_CURRENT-VALUES.md` 全文读；`_specs/S13.md` 字段 5 原文（"<1024px 单栏"）用于判定 AH-01 不是意图。
   仓库体量实测：`git ls-files` 追踪文件 175.2 MB（README 的"约 180 MB"**成立**）；工作区含未跟踪目录（`_audit2/_audit3/_s19f/_s21w` 合计 1116.6 MB、`.git` 160.4 MB）→ 本机工作区 1.45 GB，但浅克隆只拿到 175 MB，**不据此报 README 缺陷**。
   模板核对：M01/M02/M03 各 4 个文件（`index.html`/`style.css`/`README.md`/`TOKENS.md`）✓；M02 `:root` 恰好 12 个自定义属性 ✓；30 案 `assets/CREDITS.md` 齐备 30/30 ✓。

---

## 我实际看过的截图（文件名）

- `_crit1/out/S13-blind-debossed-dispatch-390-fold.png`（AH-01：抬头窄柱）
- `_crit1/out/M02-warm-local-390-fold.png`（AH-17：导航与主视觉带）
- `_crit1/crops2/S28-main-_press__main-390.png`（AH-02：8px 竖排单字条）
- `_crit1/crops2/S02-ledger-_ledger-390.png`（AH-03：6 列表格拆行）
- `_crit1/crops2/S15-_zones__table-390.png`（AH-04 的对照；未复现窄柱）
- 另：`_crit1/out/` 下 105 张整页 PNG 与 105 张首屏 PNG 已生成（`S01…S30`、`_selection`、`_selection_wizard`、`M01…M03` × 1440/768/390），未逐张目视，主要用于像素统计。

---

## 我知道自己可能误报的地方（帮驳回者省力，按被驳回概率排序）

1. **AH-26 / AH-27（横向溢出元素）**：根滚动条全为 0，越界几乎肯定来自该案自己的"错位/出血/渍斑"机制，且我没有量被祖先 `overflow:hidden` 裁掉的比例。**最可能被驳。**
2. **AH-17（M02 导航被遮挡）**：`elementFromPoint` 命中的 `rect`/`div.hero-band` 很可能只是"折叠菜单里的链接仍占位"或 `pointer-events` 差异；我没验证这两个 `<a>` 在 390 档是否真的可点。置信度 45%。
3. **AH-04（S15 表单元格 1.5 字/行）**：`perLine` 是"CJK 字符数 ÷ 行盒数"，若单元格里混了大量拉丁/数字（如 "4.23 mm"），这个比值会被拉低；我核过 S15 的两条样例（"一次成型，静态全可见"、"线宽照旧，去掉过渡"）确实是纯中文，但整表未逐格核。
4. **AH-18（18×18 按钮）**：我只量了 `button` 本身，没量外层 `<label>` 的命中区；原生 radio 的 13×13 是 UA 默认，通常由 label 承担命中。
5. **AH-25（forced-colors 被压）**：只用静态级联证明，没有真机强制高对比环境；`var(--ink)` 与 `CanvasText` 在很多主题下数值接近，实际可能无可见差异。
6. **AH-28（近乎空白屏）**：数字全部来自工具自算 `filled`；我自己的整页截图对高页面不可靠（见上节第 8 点），**没有独立像素证据**。
7. **AH-20（271 vs 281）**：差的 10 张可能只是我数了不该数的 `report.json` 同目录附属图；口径问题多于事实问题。
8. **AH-24（根 index.html 的 system-ui）**：文档从未规定根跳转页也要守 30 案的禁用字体规则，可能是我把口径用错了层。
9. **已自查并**主动撤下**的两条假阳性**（本来会进条目，写出以免重复劳动）：
   - S21 `span.lockbar__no.face-data` 的"1.00:1 不可见"：底色其实由**兄弟节点** `.lockbar__body{background:var(--ink)}` 提供，实际是纸色字压墨条，肉眼可读。
   - S11 / S10 的"20px `th` 每行 1 字"：那些 `th` 在 `@media (max-width:767px)` 里随 `thead` 一起被 `clip-path:inset(50%)` 隐藏（S11 `style.css:582`），字段名改由 `td::before` 给出，属正常折表。
10. **我未能覆盖的地方**（明确承认的能力缺口）：交互后状态（除已报的链路外）没有逐个点；`prefers-reduced-motion:reduce` 与 `forced-colors` 未在真实环境下逐案实拍；中英混排的标点/孤字（类型 7）只做了行盒与断行统计，**没有逐字核标点**；S09/S10/S12/S16/S19… 等"其他案"的 1440 档我只有统计量，没有逐屏目视。
