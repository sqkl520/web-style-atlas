# UX / 可访问性专项（74-recon · ux）

> 范围：`prototypes/_selection/`（选型台 + 向导）与仓库根 `index.html`。
> 标记约定：**[实测]** = Chrome CDP 真实测量；**[静态]** = 只读源码推导。


## 0. 方法与取证口径

- **[实测]**：本机 Chrome + CDP（`tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs`），本地 http 静态服务，
  1440×900 dsf1 与 390×844 dsf1 两档。脚本 `deliverables/74-recon/measure-ux.mjs`，原始输出 `measure-out.json`。
- **[静态]**：只读源码推导（data.js / prompts.js 用 node vm 载入后现算）。
- 环境：Google Chrome 已就绪（`C:\Program Files\Google\Chrome\Application\chrome.exe`），puppeteer/playwright 均未安装，
  因此走仓库已带的轻量 CDP 库。

## 1. 旅程地图（arrive → 理解 → 浏览 30 → 按行业筛 → 打开方案 → 读 12 段 → 复制提示词 → 带走）

| # | 步骤 | 实现位置 | 实测/静态观察 |
|---|---|---|---|
| 0 | 到达仓库根 `index.html` | `index.html:11` `<meta http-equiv="refresh" content="0; url=./prototypes/_selection/">` | **静态**：整页只有一个 0 秒 meta refresh。无 JS 也跳；但有 2 个问题：①刷新式跳转**不进入浏览器历史**，用户按「后退」回不到根页（回到更早一页）；②`<title>` 写「30 个方案」但页面本身没有内容，对屏读器/爬虫是一张空页。跳转前后**焦点、滚动位置、hash 全部丢失**。 |
| 1 | 落到选型台，理解这是什么 | `index.html:37-117` `<header class="mast">` | 页头 1440 档 347px **[实测]**；`<details id="mast-fold" open>` 默认展开（宽档），390 档由 `index.html:343-360` 的内联脚本强制收起（实测 `mast-fold.open=false`）。h1「三十个案，一条渲染口径」— 不告诉用户*这里能拿到什么*（提示词），只讲渲染口径。 |
| 2 | 看到 30 个方案 | `index.html:290` `<ol id="ledger">`；渲染 `app.js:858-891 render()` | 1440 档首卡 top=483px **[实测]**（视口 900），首屏能看到 1.5 张卡。390 档首卡 top=402px **[实测]**，首屏能看到约 1 张卡。整页 14,979px / 900 = **16.6 屏**（1440 档）**[实测]**。 |
| 3 | 按行业筛 | `index.html:162-166` `#flt-scene`；`prompt-copy.js:1261-1345 mountSceneChips()` | 44 个行业词 → 16 个直连芯片**直接可见**，28 个近似芯片 + 29 个「没有」词收进 `.scene-more`（实测 `display:none`）。点击 → `benchSetSceneIdsParkingQuery(ids)`（`app.js:1643`）。 |
| 4 | 打开一个方案 | `<li class="row">` 点击（`app.js:882-888`）→ `open(id)`（`app.js:1236-1250`）→ `renderDetail(r)`（`app.js:1266`） | 1440 档：右侧栏 900px 高；390 档：`position:fixed; inset:0` 全屏层 **[实测]**。焦点自动进 `.detail-head`（实测 `activeEl=detail-head`）。 |
| 5 | 读 12 段字段 | `app.js:1356-1395` `field()×11 + auditFold()×1` | 12 段 **实测**：7 段平铺 / 5 段折叠（4 条长字段 `field-long` + 1 条 `去 AI 味审查点`）。详情容器 scrollHeight 1869px（1440 档，900 视口 = 2.1 屏）**[实测]**。 |
| 6 | 复制提示词 | `prompt-copy.js:982-1010 mountPromptButton()` → `copyPrompt()`（`prompt-copy.js:950`）→ `execCopySync()`（`prompt-copy.js:923`） | 按钮挂在 `#d-body` 顶部（`app.js:1403`），1440 档首字段 top=568px **[实测]**，即按钮在首字段**之前**。 |
| 7 | 带走 | 剪贴板 / `showManual()`（`prompt-copy.js:853`）兜底 textarea | 兜底框 `role=dialog aria-modal=true`，但**没有焦点陷阱**、关闭后不还焦点（见 F-11）。 |

### 1.1 旅程里的断点（一句话版）
1. **到达**：根页是 0 秒跳转 + 空 body，屏读器读到「正在前往选型台…」，一秒后被换页 —— 无 `aria-live`、无「已跳转」提示。
2. **浏览**：30 行 × 3 张截图 = **90 个 `<img>`，全部 eager，其中 60 个被 CSS `display:none` 隐藏**（见 F-01）。首屏实测拉走 **12.6 MB**。
3. **按行业筛**：占位。16 颗可见芯片之外，28 颗近似芯片**完全失去 `.chips button` 样式**（实测 `border: 2px outset`，UA 默认按钮）—— 它们和 16 颗直连芯片看起来不是同一种东西（见 F-05）。
4. **读字段**：12 段里 7 段平铺，中位 **650 字**在任何折叠之前就铺开（见 §2.2）。
5. **复制**：复制成功反馈只改按钮文字 1.8 秒，无 `aria-live`；屏读器不知道复制成功与否（见 F-09）。
6. **带走**：复制走了，但用户手上**没有一个提示词的可见文本**可核对 —— 提示词全文从不显示在页面任何地方（只有 `showManual` 兜底时才出现）。

## 2. 摩擦清单（带数字）

### 2.1 首屏字节（as shipped，不压缩 vs gzip −9）

**[实测]** 页面自身 5 个脚本 + 3 个 CSS 的磁盘体积与 gzip 估算（`node zlib.gzipSync level:9`）：

| 文件 | 原始 | gzip |
|---|---:|---:|
| index.html | 26,681 | 11,734 |
| style.css | 90,231 | 35,116 |
| data.js | **307,091** | **103,014** |
| prompts.js | 62,438 | 19,697 |
| prompt-copy.js | **125,724** | **50,480** |
| app.js | 106,222 | 42,631 |
| self-gate.js | 284 | 281 |
| **小计（选型台，不含字体/图片）** | **718,671** | **262,953** |

再加 3 个字体 CSS 与三族可变字体（`_fonts/css/archivo-vf__wdth-wght.css` 等）。
**实测首屏网络（1440×900，冷载，CDP `performance.getEntriesByType('resource')`）**：

```
resourceCount = 138
byExt: css 4 件 / 208,153 B      js 5 件 / 601,759 B
       woff2 38 件 / 1,991,128 B jpg 90 件 / 9,841,159 B   ico 1 / 2 B
resourceEncodedTotal = 12,642,201 B ≈ 12.06 MiB
DOMContentLoaded = 7,479 ms      load = 25,927 ms
```

> 注意：本地 http 无 gzip、无缓存，所以 601,759 B 的 js 是**原始体积**（与上表 718,671 − index.html 基本吻合）。
> 上线后 js+css 走 gzip 约 **262 kB**，但**图片那 9.84 MB 是实打实的**（jpg 不再压缩）。

### 2.2 每行 3 张图，2 张永远不显示，且都没有 lazy

- **[静态]** `app.js:438-448` `shotFig()` 被 `app.js:573` 连续调用三次（desktop / tablet / mobile），
  每次输出一个 `<figure class="shot"><img …>`。
- `app.js:444-446` 有一行注释明确写「**不加 `loading="lazy"`**」，理由是闸门要统计「真实图片」。
- **[实测]** 1440×900：`document.images.length = 90`；`loading="lazy"` **0 个**；
  `currentSrc 已加载（naturalWidth>0）` **90 / 90**；**宽或高为 0 / `display:none` 的 = 60 个**。
  即 **2/3 的图片（60 张）从不显示，但浏览器全部下载并解码了**。
  每行 `.shot` 的实测：`1440 → display:block 316×202`，`768 → display:none 0×0`，`390 → display:none 0×0`。
- **字节代价**：`.row` 第一张（desktop-fold）30 案实测合计 **4.55 MB**（均 155 KB，min 76 / max 293）。
  被隐藏的 60 张是 tablet-fold + mobile-fold，按同一量级估 ≈ **9 MB 量级**；
  实测总计 jpg 传输 **9.84 MB**，其中**约 2/3（≈ 6.5 MB）从未显示过**。
- **代价换算**：把 30 行缩略图换成 `loading="lazy"` + `srcset` 或 `content-visibility`，
  首屏可省下 9.84 MB 里的大部分；至少给隐藏的两个视口加 `loading="lazy"` 是零风险的（它们本来就不显示）。

### 2.3 12 段字段：7 段平铺 / 5 段折叠；折叠前中位 650 字

**[实测]** 打开 S01 后 `#d-body .fields > .field` = **12**，其中：
- 平铺 **7**：一句话视觉定义 / 美学家族与参考 / 当前有效配色 / 字体策略 / 反 AI 味风险与规避 / 适用场景 / 设计师签名式怪癖
- 折叠 **5**：布局与网格 / 可落地要点 / 关键视觉元素 / 动效与交互（这 4 条是 `field-long`）+ 去 AI 味审查点

**[静态]** data.js 逐案字数（去空白），30 案：

| 字段 | 形态 | 中位字数 | min–max |
|---|---|---:|---|
| 一句话视觉定义 | 平铺 | 92 | 69–110 |
| 美学家族与参考 | 平铺 | 185 | 132–275 |
| 当前有效配色 | 平铺 | ≈37（HEX + 标签） | — |
| 字体策略 | 平铺 | **336** | 213–477 |
| **折叠前合计（4 段）** | | **650** | **507–829** |
| 布局与网格 | 折叠 | 368 | 223–791 |
| 可落地要点 | 折叠 | 429 | 328–502 |
| 关键视觉元素 | 折叠 | 346 | 227–499 |
| 动效与交互 | 折叠 | 327 | 260–441 |
| 去 AI 味审查点 | 折叠 | 297 | 261–399 |
| 反 AI 味风险与规避 | 平铺 | 171 | 124–301 |
| 适用场景 | 平铺 | 129 | 60–170 |
| 设计师签名式怪癖 | 平铺 | 109 | 86–142 |

**结论（带数字）**：任何折叠之前用户要读 **650 中文字**（最坏 829）；而**折叠掉的 4 段正文另有 1,496 字中位**。
更关键的是**顺序**问题：`反 AI 味风险与规避 / 适用场景 / 设计师签名式怪癖` 这三段（合计中位 **409 字**）
排在 5 条折叠条**之后**——它们是平铺的，却要滚过 5 条折叠条才能看到。
`app.js:1364-1369` 的注释解释了为什么不折「字体策略」（avg 427px / 345 字），
但同一段论证没有解释**为什么把三段较短的平铺字段放在 5 条折叠条后面** —— 用户在阅读节奏上被断了三次。

### 2.4 搜索空状态

- **[静态]** `index.html:309` `#empty` 默认 `hidden`；`app.js:862` 在 0 行时取消。
- 文案由 `syncEmptyFacts()`（`app.js:611-660`）+ `syncEmptyNext()`（`app.js:683-856`）现算四个数字（30 / 44 / 16 / 16）与 1–2 个带行数的按钮。
- **[静态]** 缺陷：`#empty` 里三句 `#e-why` 分支全部以「**不是你条件加多了**」收尾，
  其中「有直连」那一支（`app.js:649-651`）说「左边那颗「X」芯片**是实的**」——
  但 1440 档下 rail 可能已滚走、390 档 rail 折叠时芯片**根本不可见**（实测 `rail-fold.open=false`），
  「左边的」是一句指点不到的话。这是空状态唯一的行动指引，它指向一个用户看不见的控件。
- **[实测]** 390 档 `.rail` 折叠后实测高 **48px**，`rail-fold.open=false` —— 空状态出现时，
  用户看到的是一整屏解释 + 顶部一条「筛选 · 11 组 47 颗芯片」，**必须先在 48px 里点开折叠条**才能照做。

### 2.5 复制按钮的位置与可发现性

- **[实测]** 1440 档：`复制 AI 提示词` 按钮存在，`#d-body` 第一个字段 top=568px（面板 900px 高）。
  按钮在首字段**之前**，仍在首屏内（好消息）。
- **[实测]** 390 档：详情为 `position:fixed;inset:0` 全屏层；`#d-body` 的 `scrollHeight = clientHeight = 2308`
  —— 说明**滚动容器不是 `#d-body`，是 `#detail`**（`overflow-y:auto`）。这一层嵌套没坏（实测 `nestedScrollers = []`）。
- **[静态]** 提示词全文**从不渲染到页面**：`copyPrompt()`（`prompt-copy.js:950-979`）只把它写进剪贴板。
  用户复制完无法核对内容，也无法只取其中一段。对一个「拿到提示词去 ChatGPT」的产品，
  **这是最大的可用性缺口**：没有预览、没有「先看一眼再复制」。


## 3. 可访问性审计（bench）

### 3.1 标题层级与地标

**[实测]** `Accessibility.getFullAXTree`：
- 标题：`h1 × 1`（三十个案，一条渲染口径）、`h2 × 12`（rail 的 11 组 + 详情面板的 `#d-cn`）、`h3 × 30`（30 张行卡）。
  跳级：**无**。层级 1 → 2 → 3 干净。
- **但 `h2 × 11` 全部落在 `.rail` 里、且是筛选分组的名字**；正文 `main` 里**一个 h2 都没有**（打开详情后详情面板才贡献第 12 个）。
  对屏读器来说，页面结构读起来是「一个 h1 → 十一个筛选组 → 三十个方案名」，**中间缺少「方案清单」这一层**。
- `h3 × 30` 在 AX 树里**没有被 ignore**（实测 `ignoredCount = 0`），仍在 heading 列表里。
  但它们的父节点是 `role=button` 的 `<li>`（见 F-04），所以它们能出现在 "headings" 快捷导航里，
  却在 "buttons" 里只剩一个 `展开 S01 红黑斜排报` —— **两套导航给出不一致的结构**。
- 地标 **[实测]**：`banner`（header.mast）/ `complementary`（aside.rail，aria-label="筛选"）/
  `main` / `complementary`（aside.detail，aria-label="方案详情"）。**缺 `<nav>`、缺 `contentinfo`**；
  两个 complementary 有 label，合规（`aria-label` 唯一）。`#detail` 常驻 DOM（`hidden` 切换），
  所以「方案详情」这个地标在没有打开任何方案时也存在，屏读器地标列表里会有一个空地标。
- `lang="zh-Hans"` **[实测]**，正确。

### 3.2 自定义控件的 ARIA

| 控件 | 实现 | 实测 ARIA | 判定 |
|---|---|---|---|
| 筛选芯片（9 组） | `app.js:160-176 chips()` 生成 `<button aria-pressed>` | `aria-pressed` ∈ {true,false} | ✅ 可接受；但**芯片组是 `<div role=group aria-label>`**，不是 `role=radiogroup`（多选语义，`group` 也说得通） |
| 行业芯片（16+28） | `prompt-copy.js:1279-1341` | `aria-pressed`，**无 `aria-label`**，名称来自 textContent（如「餐厅M02」） | ⚠️ 读作「餐厅 M 零 二」——模板角标混进了可访问名称（见 F-06） |
| 「还有 28 个」展开器 | `prompt-copy.js:1348-1359` | **`aria-expanded` 缺失**、`aria-controls` 缺失、`.scene-more` **无 id** | ❌ 展开/收起状态对屏读器完全不可知（见 F-07） |
| 视口切换（1440/768/390） | `app.js:1303-1309` | `role=group aria-label="切换视口"` + 三个 `aria-pressed` | ✅ 但**在默认收起的 `<details>` 里**，屏读器要展开才找得到 |
| 详情面板 | `index.html:319` | `<aside aria-label="方案详情">`，**无 `role=dialog`、无 `aria-live`** | ⚠️ 右侧栏形态用 aside 合理；390 档它变成 `position:fixed;inset:0` 的**全屏模态**，此时**仍是 aside、无 `aria-modal`、无焦点陷阱**（见 F-08） |
| 行卡 | `app.js:558` `<li role="button" tabindex="0" aria-label="展开 Sxx 名">` | `aria-current="true"`（打开时）；**无 `aria-expanded`、无 `aria-controls`** | ❌ 见 F-04 / F-10 |
| 复制按钮 | `prompt-copy.js:993-1010` | 纯 `<button>`，无 `aria-live` 成功播报 | ❌ 见 F-09 |
| 向导选项 | `wizard.html:34-80` | 纯 `<button aria-pressed>`，**无 `role=radiogroup`、无 `fieldset/legend`** | ❌ 见 §5 |
| 折叠块（12 处） | 原生 `<details>/<summary>` | 原生语义 | ✅ 全站最稳的一块 |

### 3.3 `aria-live` 盘点（全 `_selection` grep 结果）

**[静态]** 整个目录只有 **1 处** `aria-live`，在 `app.js:350`（暂存搜索词那条 `#q-parked`）。
**[静态]** `index.html:232` 与 `style.css:1333` 的注释都声称 `#count`「是 aria-live 的活口」。
**[实测]** `document.getElementById('count').getAttribute('aria-live')` → **`null`**。
⇒ **注释在说谎**：`#count` 从来没有 `aria-live`。这条注释还被写进 `index.html` 与 `style.css` 两处，
并且 `style.css` 用它当作「计数不折进 details」的**唯一理由**：
> 「计数**不折**：它是 aria-live 的反馈口，筛完要立刻看到「列出 4 / 30」变了没有。」

理由建立在一条不存在的事实上。**筛选后屏读器完全收不到「结果变成几行」的播报**（见 F-03）。

### 3.4 键盘快捷键：**实际键位与原注释不符**

**[静态]** `app.js:1560-1601` 的监听器：

| 键 | 行为 | 守卫 |
|---|---|---|
| `/` | 聚焦 `#q` | — |
| `Escape` | `close()` 关闭详情 | — |
| `j` `J` **`ArrowDown`** | 下一案 + `open()` + `scrollTo()` | — |
| `k` `K` **`ArrowUp`** | 上一案 + `open()` + `scrollTo()` | — |
| `1` `2` `3`（仅 `state.open` 时） | 切视口 | — |

守卫（`app.js:1561-1577`）排除 `input / select / textarea / button / isContentEditable`。
**`<a>` 与 `<li role=button tabindex=0>` 都不在排除名单里。**

**[实测]（真 `Input.dispatchKeyEvent`，1440×900）**：
```
起点              y=0   hash=""   详情未开
按 PageDown  →    y=787 hash=""   详情未开      ← 正常滚动 ✅
按 ArrowDown →    y=459 hash="#S01" 详情已开     ← 同时做了两件事
按 ArrowDown →    y=522 hash="#S02"
按 Escape    →    y=50  hash=""   详情已关，焦点回到 LI.row
```

**结论（独立确认，比原 flagged 更严重）**：
- **ArrowDown / ArrowUp 在 body 上会劫持方向键**：用户想滚一屏，结果**打开了详情、页面还往上跳了 328px**（y 787 → 459）。
  实测 `e.preventDefault()` 被调用（`defaultPrevented=true`），所以**浏览器原生滚动被吃掉**。
  更糟的是 `scrollTo(id)` 用的是 `scrollIntoView({block:'nearest'})` —— 它只保证行卡「尽量」可见，
  所以在 y=787 时它把页面**拉回**到 459。
- **焦点在 `<a>` 上同样会触发**：实测焦点在「企业站 M01」链接上按 ArrowDown → hash `#S01` → `#S02`。
  `index.html:211` 的 `kbd` 说明写的是 `J`/`K`，**从未提到方向键**，用户无法预期。
- **焦点在行卡（`tabindex=0`，不进守卫名单）上按 ArrowDown 也会换案**，而此时用户以为自己在操作行卡。
- **`Space` / `End` / `Home` / 左右方向键在 body 上都没有被劫持**（补测，真 `Input.dispatchKeyEvent`）：
  ```
  base               y=0     hash=""      detail=false   active=BODY
  Space    →         y=0     hash=""      detail=false   active=BODY   ✅ 不滚是正常的（body 高 14979，Space 在 body 上不滚是 Chrome 行为）
  End      →         y=7916  hash=""      detail=false   active=BODY   ✅ 正常滚到底
  Home     →         y=0     hash=""      detail=false   active=BODY   ✅
  ArrowRight/Left →  y=0     hash=""      detail=false   active=BODY   ✅ 未被监听
  ```
  静态上也对得上：`app.js:1560-1601` 里只有 `ArrowDown/ArrowUp`（外加 `j/k/J/K`、`/`、`Esc`、`1/2/3`），
  没有 `Space` / `End` / `Home` / 左右方向键的分支。
- **`Space` 在行卡上（`role=button tabindex=0`）会打开详情** —— 实测焦点在 S03 行卡上按 Space →
  `hash=#S03, detail=true, active=DIV.detail-head`。这是 `app.js:885-887` 显式绑的，**符合 `role=button` 的预期**，不是缺陷。

> 修正后的准确表述：**上下方向键是全局快捷键，且不在任何守卫里**（守卫只排 `input/select/textarea/button/isContentEditable`，
> 不含 `a`、不含 `[role=button]`）。这比「ArrowDown 从 body 触发」更严重 —— **它在链接上、行卡上、以及页面任何非表单元素上都会触发。**
> 这比「ArrowDown 从 body 触发」更严重 —— **它在链接上、行卡上、以及页面任何非表单元素上都会触发。**

### 3.5 焦点管理

| 场景 | 实现 | 实测 | 判定 |
|---|---|---|---|
| 打开详情（点击/Enter/Space/J/K） | `app.js:1217-1224 focusIntoDetail()` | `activeEl = DIV.detail-head` ✅ | ✅ 正确（注释里解释了为什么不落在 `#d-close`） |
| 打开详情（冷启动 `#S07`） | `app.js:1621` `open(h, {focus:false})` | `activeEl = BODY` ✅、`scrollY=0` | ✅ 符合其声明 |
| **但冷启动 `#S07` 后没有任何「你已跳到 S07」的提示** | — | 详情已开（`detailHidden=false`）但页面停在 top=0 | ❌ 屏读器不知道右侧已经打开了一个面板；视觉用户也要自己找。且实测 **`scrollY=0`、行卡 `rowTop=3281`** —— 打开的案在 3.6 屏之外 |
| 关闭详情 | `app.js:1263 focusBackToRow(id)` | `activeEl = LI.row` ✅ + `scrollIntoView({block:'nearest'})` | ✅ |
| 复制按钮 → `execCopySync` | `prompt-copy.js:923-940` | **焦点先给临时 textarea，remove 之后焦点掉到 `BODY`**（实测 `activeAfterCopy = BODY#.detail-open`） | ❌ 见 F-02 |
| 视口切换 | `app.js:1405-1411` | 无焦点移动（合理，按钮就地） | ✅ |
| 复制兜底 dialog | `prompt-copy.js:853-908` | `role=dialog aria-modal=true`，`ta.focus()` ✅；**但无焦点陷阱、关闭后不还焦点** | ⚠️ 见 F-11 |
| 向导结果 | `wizard.js:248 out.scrollIntoView()` | 焦点留在 `BODY`（实测 `focus: BODY.wz`） | ❌ 见 §5 |

### 3.6 深链状态恢复

**[实测]** `#S07` 冷载（1440×900）：
```
hash="#S07"  detailHidden=false  dNo="S07"  activeEl=BODY  scrollY=0
docScrollH=14979  行卡 S07 的 rowTop=3281
```
- ✅ **状态恢复正确**：详情面板确实打开了、渲染的是 S07。
- ❌ **视口位置没恢复**：`scrollY=0`，而 S07 那张卡在 3281px 处。用户/屏读器看到的是一屏「三十个案，一条渲染口径」，
  **看不出任何东西已经打开了**。`open()` 里没有 `scrollIntoView`（`app.js:1236-1250` 只写 hash + 渲染 + 焦点）。
- ❌ **根 `index.html` 的跳转丢掉 hash**：**[实测]** 打开 `http://…/index.html#S07` →
  最终 URL 是 `http://…/prototypes/_selection/`（**`#S07` 没了**），页面停在列表顶部。
  根页的 `<meta http-equiv="refresh" content="0; url=./prototypes/_selection/">` **不带 hash 转发**。
  所以「把 `#S07` 加在站点根地址上分享」这条路径是断的 —— 而 `index.html` 的 title 与描述都在鼓励分享单案。
- ✅ `hashchange`（浏览器前进/后退）正确：`app.js:1608-1614`，`/^S\d{2}$/` 白名单，非法 hash 被忽略。

### 3.7 对比度（**[实测]** 计算值，1440×900）

底 `#e7e7e2`（`.rail` 透明，向上取到 body）：

| 选择器 | 字号 | 前景 | 对比度 | WCAG AA (4.5:1) |
|---|---|---|---|---|
| `.rail-hint` | 13px | `#56534b` | **6.19** | ✅ |
| `.row-foot` | 13px | `#56534b` | **6.19** | ✅ |
| `.cap-ok` | 13px | `#56534b` | **6.19** | ✅ |
| `.cap-warn` | 13px | `#7a5a00` / `#fdf6e3` | **5.92** | ✅ |
| `.rail-lead` | 14px | `#43413b` | **8.22** | ✅ |
| `.row-def` | 16px | `#43413b` | **8.22** | ✅ |
| `.row-family` | 16px | `#43413b` | **8.22** | ✅ |
| `.no` / `.tag` | 24 / 13px | `#1c1b18` | **13.88** | ✅ |
| `.empty` | 16px | `#56534b` | **6.19** | ✅ |

**全部通过 WCAG AA。** 这一环是本仓库做得最好的部分，上一轮修掉的 `scene-unsupported` 3.36:1 已确认修好（现有 `.rail-hint` 6.19）。
唯一可议的是 `.cap-warn` 与 `.cap-ok` **只靠颜色+底色区分**（无图标、无文字前缀），
而两者 `title` 的差别也不进可访问名称 —— 色觉障碍用户区分不出「会留空位」与「可增减」。这是 WCAG 1.4.1（Use of Color）。


## 4. 六项高价值复核（逐条独立确认 / 反驳）

### 4a. 28 颗 near 芯片在 `.chips` 之外、`.is-direct`/`.is-near` 无任何 CSS —— **确认，且后果比预想严重**

**[实测]**（1440×900，点开「还有 28 个只有近似的 →」之后）
```
.scene-more 的父节点          = rail-block        （不是 .chips）
.scene-chip.is-near 匹配 '.chips button' = false
.scene-chip.is-direct 匹配 '.chips button' = true

is-near 计算样式：border 2px outset rgb(0,0,0) / padding 1px 6px / font-size 16px / bg rgb(240,240,240) / 48×32
is-direct 计算样式：border 1px solid #a5a49b  / padding 4px 8px / font-size 13px / bg transparent      / 96×27
```
**[静态]** 全仓库 grep `is-direct|is-near`：**只有 3 个文件命中**
- `prototypes/_selection/prompt-copy.js:1286`（唯一的赋值点）
- `prototypes/S14-zero-g-launch-sequence/style.css` / `index.html`（**与选型台无关的同名类，纯属巧合**）
- **`prototypes/_selection/style.css` 里 0 处**；页面运行时 `document.styleSheets` 里匹配 `is-direct|is-near` 的规则数 = **0**（实测）

⇒ 两个独立的缺陷叠在一起：
1. **结构**：`prompt-copy.js:1345` `host.parentNode.appendChild(moreHost)` —— `host` 是 `#flt-scene`（`.chips`），
   `host.parentNode` 是 `.rail-block`。所以 `.scene-more` **不是 `.chips` 的子节点**，`.chips button` 一行都选不中它。
2. **钩子**：`is-direct` / `is-near` 这两个类**在全仓库没有任何 CSS 规则**，所以即使结构对了，也没有东西去画「实心 / 虚边」。
   而 `index.html:165` 的提示语明写「**实心＝有直连方案，虚边＝换文案能用但不是为这行做的**」——
   **这句话描述的是一个不存在的样式**。

**[实测] 更严重的一层：near 芯片被按下后，视觉上完全没有变化。**
```
点「茶饮」（is-near）前 → bg rgb(240,240,240) color rgb(28,27,24) border 2px outset 48×32
点「茶饮」后           → bg rgb(240,240,240) color rgb(28,27,24) border 2px outset 48×32   visualChanged = false
同时 aria-pressed 确实变成 "true"，列表也确实筛到 2 行
```
`aria-pressed=true` 是**有效状态**（`#count` 从 30 变 2，实测），但**屏幕上唯一的反馈是列表变了，芯片自己没变**。
`.chips button[aria-pressed="true"] { background: var(--ink); color: var(--card) }`（`style.css:330-332`）选不中它们。
⇒ 用户点了一颗芯片、结果列表从 30 行变 2 行，**却没有任何证据显示是哪颗芯片造成的**。
这是「界面在说谎」的另一种形态：不是说了假话，是**该说话的地方沉默**。

### 4b. `index.html` 的芯片计数与页面实际不符 —— **确认（两个数字都不对）**

**[静态]** `index.html:153` summary 写：「筛选 · **11 组 47 颗**芯片」。
**[实测]**（DOM 计数）：
```
rail-block 数 = 11                        ← 「11 组」✅（但其中最后一组「怎么用」不是筛选组，实际筛选组 10 组）
.chips button 总数（未展开近似）= 45      ← 16 场景 + 2 + 6 + 3 + 3 + 2 + 3 + 7 + 1 + 2
.scene-chip 总数（含隐藏的 28 颗）      = 44
.chips button + .scene-more button 全展开 = 73
```
- 「47 颗」这个数字**在页面上任何状态下都对不上**：未展开 45、全展开 73、不含场景的 9 组 29。
  最接近的解释是「16 直连 + 9 组 29 + 2」= 47 —— 但那把「还有 28 个」那颗 toggle 和 28 颗近似全漏了。
- **正确的说法应该是**：「10 组筛选 · 45 颗芯片（另有 28 颗近似 + 29 个无对应行业，点开可见）」。

**[实测]** 另有一处：`index.html:140` 注释写「20 颗芯片 + 提示 + 『还有 28 个』」—— 实测第一组 `#flt-scene` 里是 **16 颗**，不是 20。

### 4c. `execCopySync` 焦点丢失 + 是否有 clipboard API 优先 —— **前半确认，后半反驳**

**[静态]** `prompt-copy.js:923-940`：
```js
var ta = document.createElement("textarea");
ta.style.cssText = "...1px, opacity:0, pointer-events:none";
document.body.appendChild(ta);
ta.focus(); ta.select(); ta.setSelectionRange(0, ta.value.length);
ok = document.execCommand("copy");
document.body.removeChild(ta);      // ← 没有把焦点还回去
return ok;
```
**[实测]**（把 `navigator.clipboard.writeText` 打桩成 resolve，确保走成功路径）
```
点击前焦点 = prompt-copy 按钮
点击后焦点 = BODY#.detail-open        ← 焦点掉到 body
按钮文字 = 「已复制 ✓」               （视觉反馈正常）
页面内 aria-live 只有 q-parked 一个；无 role=status / role=alert
```
⇒ **确认**：`execCopySync` **确实**把焦点偷走、remove 后不回填，焦点落到 `BODY`。
对一个正在读详情面板的键盘用户，这意味着**按下复制后 Tab 从页面最顶端重新开始** ——
而他刚才读的那张卡在文档第 60+ 个可聚焦元素处。这是 WCAG 2.4.3（Focus Order）的实质违反。

**反驳一半**：原 flagged 说「是否 clipboard API 优先」——
实际顺序是 **exec 先跑（`prompt-copy.js:965`），然后 writeText 跑（`:968-974`）**，
两者**都跑**，exec 只当「尽力而为」，真正的成功判据是 `writeText` 的 Promise。这个设计是对的（注释 `:910-922` 解释了原因）。
所以缺陷不在「顺序」，**只在「exec 的副作用（偷焦点）没有被撤销」**。

### 4d. `<li role="button">` 摧毁列表语义 / 隐藏 `<h3>` —— **确认为「摧毁列表语义」，反驳「隐藏 h3」**

**[实测]**（`Accessibility.getFullAXTree`，1440×900）
```
role 计数（相关项）：list=1  listitem=0  button=77  heading=42  StaticText=561
<ol id="ledger"> 的 AX 节点：role=list, childCount=30
30 个行卡的 AX 节点  ：role=button, name="展开 Sxx 中文名", 子节点 role = paragraph×30 + none×90
```
- **列表语义确实被摧毁**：`<ol>` 还是 `list`，但它**一个 `listitem` 子节点都没有**（`listitem=0`）。
  30 个 `<li>` 因为 `role="button"` 被重写成了 button。屏读器读不出「第 3 项，共 30 项」。
  对照实验（在页面里 `removeAttribute('role')` 后重新取树）：`listitem` 立刻从 **0 → 30**。
- **`<h3>` 并没有被隐藏**：实测 `h3 × 30` 全部在 AX 树里、`ignoredCount = 0`，
  且它们的父链是 `none → none → button(展开 S01 …) → list`。
  所以它们**仍出现在 headings 导航里**。反驳「destroying list semantics and hiding `<h3>` from the heading list」的后半句。
- **但更严重的后果被漏掉了**：行卡里的**正文全部被吞进 button 的名字里不再单独可读**。
  实测 `StaticText` 总数仍是 561（文字还在树里），但**行卡 button 的 `description` 30/30 全为空**，
  且 button 的 accessible name 只有 `展开 S01 红黑斜排报`（`aria-label` 覆盖了内容）。
  也就是说：**屏读器停在行卡上只会读出「展开 S01 红黑斜排报，按钮」，
  不会读出「美学家族」「配色」「FAIL 0 / WARN 4」「桌面 6 屏」这些行卡上的全部信息。**
  用户在 30 张卡之间移动时，听到的是 30 个「展开 Sxx」，**卡片之间的区别只剩编号和中文名** ——
  而要选风格，需要的恰恰是被吞掉的那部分。
  （`app.js:558` 的 `aria-label="展开 S01 红黑斜排报"` 是主动覆盖，这是设计选择，但它没意识到代价。）

### 4e. `#count` 有没有 `aria-live` —— **确认「只有注释声称」**

**[实测]** `#count` 的 `aria-live` / `aria-atomic` / `role` **三项全为 `null`**。
全 `_selection` grep `aria-live` → **1 处真代码**（`app.js:350`，暂存条）+ **2 处注释**
（`index.html:232`、`style.css:1333`）都在说 `#count` 是 live region。
⇒ 注释直接说了假话，而且 `style.css` 用它当作「计数不折进 details」的唯一理由。
见 F-03。

### 4f. `index.html` 的字段数说法 vs `app.js` 渲染数 —— **确认不一致**

**[静态]** `index.html:211`：「点任意一行展开它的**全部字段**与整页截图（**多数案 10 段、个别 9 段**——
缺失原因在 README「做不到与已知边界」里写明）」。
**[实测]** 打开 S01 后 `#d-body .fields > .field` = **12**（12 个 `<div class="field">`，`dlChildren` 全为 DIV）。
**[静态 + 实测]** 30/30 案全部渲染 **12 段**（`fieldCounts` 分布 = `{"12":30}`，`missing` 全为空数组）。
⇒ **「多数案 10 段、个别 9 段」是过期说法**：那个数字来自「11 个 `field()` 调用里有 1 个在 S12/S15/S19 取不到值」的年代，
而 2026-10-27 接通「可落地要点」（`landing`）与「去 AI 味审查点」（`auditFold`）之后已经恒为 12。
`app.js:1139-1147` 的注释明确写了「**11 个 field() + auditFold 1 = 12 段**」这条不变量，
**`index.html` 这一行没有跟着改**。
同一行还提到 README「做不到与已知边界」—— 用户被指向一份文档去读构建脚本的 bug，而这已经不存在了。


## 5. 向导评估（`wizard.html` 105 行 / `wizard.js` 285 行 / `wizard.css` 95 行）

### 5.1 目的、步数、打分模型、产出

- **目的**（`wizard.html:21-22`）：不问「你喜欢什么风格」，改问 5 个关于**处境**的问题，
  从 30 案里给出 **3 个推荐 + 3 个明确排除**，并逐条写理由。
- **步数**：5 问，**5 个问题全部堆在同一页**，靠 `hidden` 逐条揭示（`wizard.js:87-90 showOnly(i)`）。
  第 1 问答完 → 第 2 问出现；但**已答的问不会被收起** —— 实测答完全部 5 问后 `visibleQ = 5`，
  5 组选项**全部留在页面上**（`showOnly(i)` 的参数是「显示到第 i 个」，`el.hidden = j > i`）。
  真正的「步进」只发生一次：`qs[i+1].scrollIntoView({block:'start'})`（`wizard.js:100`）。
- **打分模型**（`wizard.js:63-113`）：
  - 5 维向量：`load`（正文字数）/ `img`（真实图片数）/ `loud`（调色板最高饱和度）/ `guide`（声明的认知门槛）/ `fear`（`loud×0.6 + 调性档×0.4`）。
  - 归一化：`stretch()` 用全库 min/max 线性拉到 0..2（`wizard.js:56-60`）。
  - 距离：**五维等权欧氏距离**（`W` 全为 1，`wizard.js:107`）。
  - 推荐 = 距离最小的 3 个；排除 = 距离最大的 3 个（`wizard.js:226-228`）。
  - 理由：把连续值 **re-离散化回档位**（`toSlot`，`wizard.js:150-153`），只有**档位完全相同**才说「对上你要的」。
    —— 这一段是上一轮修过的，注释里留着「203 条断言里 128 条事实错误（63.1%）」的记录，现在是对的。
- **产出**：6 张卡（`card()`，`wizard.js:190-223`），每张有 id / 中文名 / 色板 / 英文名 / 96 字定义 / 理由 /
  （FAIL>0 时）闸门警告 / 一条「到选型台看它的三档截图 →」链接。
  另有 `#wz-method` 把用户的 5 个答案与权重口径摊开写，并明说「这套权重未经真人回放测试」。
  **[实测]** 推荐卡上的闸门警告实际不出现（3 张卡 `gate: null`）—— 因为推荐到的是 FAIL=0 的案，逻辑正确。

### 5.2 失败 / 空路径

| 路径 | 实现 | 实测 | 判定 |
|---|---|---|---|
| 读不到 `data.js` | `wizard.js:14-18` 显示「读不到 data.js —— 请通过 HTTP 打开」 | 未触发 | ✅ 有兜底 |
| 只答了一部分 | `wizard.js:101` 只在 5 个答案齐全时 `render()` | ✅ | ✅ |
| **URL 参数只给一部分** `?load=1&img=2` | `wizard.js:275` `ORDER.every(...)` → 不满足就 return | **[实测]** 停在问题 1、`outHidden=true`、`pickCount=0` | ✅ 静默忽略，可接受 |
| **URL 参数非法** `?load=abc&img=1&loud=1&guide=1&fear=1` | `ans[k] = +p.get(k)` → `NaN` | **[实测]** **仍然 `render()`，且 3 张推荐卡正常出**，`#wz-method` 里写「内容量 **undefined**」 | ❌ 见 F-13 |
| **URL 参数越界** `?load=9&img=9&loud=9&guide=9&fear=9` | 同上，无范围校验 | **[实测]** `render()`，method 里 **五项全 `undefined`**，仍给出 3 个推荐 | ❌ 见 F-13 |
| URL 参数全空 `?load=&img=&loud=&guide=&fear=` | `p.get(k) !== ''` 判否 | **[实测]** 停在问题 1 | ✅ |

**F-13 的实质危害**：`+p.get('load')` 对 `abc` 得 `NaN`，`NaN !== undefined`，所以 `ORDER.every(x => ans[x] !== undefined)` **通过**。
`score()` 里 `v[k] - NaN` = `NaN`，`d += NaN * NaN` = `NaN`，于是**所有方案的分数都是 `NaN`**，
`sort((a,b) => NaN - NaN)` 返回 `NaN`（视为 0），**排序退化为原数组顺序**。
实测 `?load=abc&…` 给出的推荐是 **S01 / S02 / S03** —— 就是 data.js 里的前三条，**与用户的答案毫无关系**。
而页面上没有任何一个像素表明这是降级结果。这正是本仓库反复记录的那一类缺陷：**界面在说谎**。

### 5.3 分享链接 / 重放

**[实测]**
```
答完 5 问 → 点「复制这一页的链接」
按钮文字变成 http://127.0.0.1:9765/.../wizard.html?load=1&img=1&loud=1&guide=1&fear=1
location.search 同步更新 ✅
```
- ✅ `history.replaceState` + `URLSearchParams`，回放逻辑（`wizard.js:273-284`）实测有效：
  `?load=1&img=2&loud=2&guide=1&fear=1` → 5 问全展开、4 个 `aria-pressed=true`、3 张推荐卡。
- ❌ **`file://` 下的分享链接是废的**：**[实测]** `file:///D:/…/wizard.html` 下点分享，
  得到 `file:///D:/Web/style/prototypes/_selection/wizard.html?load=0&img=0&loud=0&guide=0&fear=0`。
  这条链接发给别人**必然打不开**（指向本机磁盘路径）。而 `index.html:85` 的模板出口宣传的是
  「自包含、系统字体、**双击即对**」—— 双击打开是本仓库明确支持的用法，向导在这条用法上的分享功能是坏的。
  更糟：**分享按钮的文案仍然是「复制这一页的链接（带上你的答案）」**，没有降级提示。
- ❌ **分享按钮文字被永久改写**：`wizard.js:266` `btn.textContent = '已复制：' + url` —— **没有 set 回去的定时器**。
  `#wz-share` 从「复制这一页的链接（带上你的答案）」变成一整条 URL 后就不再变回。
  **[实测]** 点过分享 → 点「重来」→ 按钮 `hidden=true` 但 `textContent` **仍是那条 URL**；
  再答完 5 问重新出现时，按钮上是一条 80+ 字符的旧 URL（带着上一轮的答案）。
  这是最典型的「状态还在、语义已经变了」。

### 5.4 重置行为

**[实测]** 点「重来」之后：
```
outHidden=true   shareHidden=true   ariaPress=0 (所有选项熄灭)   visibleQ=1   scrollY=0
focus = BODY.wz   focusTop = 0
shareText = "…wizard.html?load=1&img=1&loud=1&guide=1&fear=1"   ← 残留
location.search 仍 = "?load=1&img=1&loud=1&guide=1&fear=1"      ← 残留
```
- ✅ 视觉状态干净（结果收起、选项熄灭、回到第 1 问、滚回顶部）。
- ❌ **URL 没清**：`wizard.js:252-259` 里**没有** `history.replaceState`。
  ⇒ 用户点「重来」后若刷新页面，`replay()` 会**把旧答案全部恢复、直接跳到结果页**。
     「重来」在刷新面前不成立。
- ❌ **焦点没管**：`window.scrollTo({top:0})` 但 `activeElement` 仍是 `BODY`。
  键盘用户点完「重来」后，下一次 Tab 从页首 skip link 重新开始 —— 而这里其实是原地重置，不该丢焦点。

### 5.5 向导的可访问性

**[实测]**（1440×900 与 390×844 两档）
```
fieldset = 0        legend = 0        [role=radiogroup] = 0        input[type=radio] = 0
[aria-live] = 0     [role=status] = 0 [role=alert] = 0
```

| WCAG | 问题 | 证据 |
|---|---|---|
| **1.3.1 / 4.1.2** | 5 个问题各是一组**单选**，但用 `<div class="wz-opts">` + `<button aria-pressed>` 实现，**没有 `fieldset`/`legend`、没有 `role=radiogroup`/`radio`**。屏读器读到的是 3 个互不相关的「切换按钮」，读不出「这是一组、只能选一个」。`aria-pressed` 允许多个同时为 true（虽然代码逻辑会互斥），语义上不如 `radio` 精确。 | `wizard.html:33-37`、`wizard.js:95-103` |
| **2.4.3 焦点顺序** | 选完一题后 `qs[i+1].scrollIntoView()`，**焦点不动**（实测始终 `BODY.wz`）。视图跳到下一题，但键盘/屏读器的位置还在上一题。用户按 Tab 会从**上一题的第 1 个按钮**继续，而不是新出现的那一题。 | `wizard.js:100` |
| **4.1.3 状态消息** | 结果区 `#wz-out` 从 `hidden` 变可见、`scrollIntoView`，**没有 `aria-live`**。屏读器完全不知道「结果出来了」。 | `wizard.js:245-248` |
| **2.4.7 焦点可见** | `.wz-opts button:focus-visible { outline: 3px solid var(--link) }` **[静态]** `wizard.css:37` ✅ | 这一环是对的 |
| **对比度** | `.wz-opts button[aria-pressed=true] span { color: #c9c7bf }` 叠 `background: var(--ink)` `#1c1b18` —— **[静态]** 该组合对比度约 **10:1**，✅。`.wz-why` 13px `--ink-3` 在 `--card` 上约 6.2:1 ✅ | 这一环是对的 |
| **移动端** | **[实测 390×844]** 无横向溢出、`minOptH` 见下、页头 `mastH` 见下 | 见 §6.4 |

**向导最值得肯定的一处**：`#wz-method`（`wizard.js:233-243`）把「你这五个答案是 …」+「五项等权、按欧氏距离排序」+
「这套权重未经真人回放测试——所以别只信推荐，**排除那三条更硬**」原样摊给用户。
这是全仓库对「我知道我的方法有多不可靠」写得最诚实的一段，应当在选型台上也有同等待遇。


## 6. 移动端评估（390×844）

### 6.1 首屏与总长

| 指标 | 闭合态（默认） | 展开筛选栏（最坏） |
|---|---:|---:|
| `mastH`（页头） | 259 | 259 |
| `barH`（工具条） | 84 | 84 |
| `railH`（筛选栏） | **48** | **1351**（实测） |
| 首卡 top | **402** | **1728** |
| 首屏完整卡 | **1 张** ✅ | **0 张** ❌ |
| `docScrollH` | **11,546** = 13.7 屏 | **12,871** = 15.25 屏 |
| 横向溢出 | **0** | **0** |

- ✅ **折叠策略有效**：默认态首卡 402px、视口 844，完整可见 1 张卡 + 下一张的开头。这是这一轮最大的成果。
- ✅ **`nestedScrollers` 实测 = 空数组**：`.rail` 在 ≤980 档是 `overflow:visible; max-height:none`（`style.css:1327-1330`），
  内滚嵌套**确实被消灭了**。390 档全页**只有 `#detail` 一个滚动容器**（`overflow-y:auto`），符合预期。
- ⚠️ **展开筛选栏后首卡掉到 1728px**（2.05 屏）：用户在筛选栏里选完，**必须手动滚 1 屏多**才看到结果。
  代码里为此写了 `collapseRailAfterPick()`（`prompt-copy.js:1249-1259`），只在**点了行业芯片**时收起。
  **[实测]** 点「咖啡店」芯片后：`railOpen=false`、`y=0`、`count=4`、**首卡 top=460、bottom=824、完整在视口内** ✅
  —— 这条路径是对的。但**点 9 组常规筛选芯片（`#flt-ground` 等）不会收起筛选栏**，
  用户在那里筛完仍然在 1728px 处。同一个界面里两种行为，没有可读的理由。

### 6.2 点击目标

**[实测]** 390 档（展开筛选栏后，87 个可交互元素）：

| 元素 | 数量 | 最小高 | 判定（WCAG 2.2 AA 2.5.8 要 24×24） |
|---|---:|---:|---|
| `button.scene-chip`（行业芯片） | 16 | **26** | ✅ 过 24 |
| `button`（9 组筛选芯片） | 29 | **27** | ✅ 过 24 |
| `button.scene-toggle` | 1 | **31** | ✅ |
| `summary.bar-fold-sum`（排序） | 1 | **32** | ✅ |
| `input#q` | 1 | 38 | ✅ |
| `select#sort` | 1 | 40 | ✅ |
| `summary.mast-fold-sum` / `rail-fold-sum` | 2 | **44** | ✅ 舒适 |
| `a`（页头三个模板链 + 向导按钮） | 4 | **24** | ⚠️ 刚好压线（`style.css:1266` 没有覆盖 `<a>`） |
| `li.row` | 30 | 340 | ✅ |
| `button.btn-quiet`（清空筛选） | 1 | 56 | ✅ |

- **低于 24×24 的：0 个** ✅ —— 这一点比大多数产品好。
- **低于 44×44 的：51 / 87（58.6%）**。44 不是 WCAG 要求（是 Apple HIG / Android 的建议值），
  但**筛选芯片 26–27px 高**在这个页面上是高频操作，实际用拇指点会比较吃力。
- ⚠️ **页头 4 条 `<a>` 的最小高恰好 24px**，是**压线通过**。任何一次字体回退或行高微调都会把它推到 24 以下。

### 6.3 390 档详情层

**[实测]** 点开一行后：
```
position: fixed   inset: 0   390×844   overflow-y: auto   zIndex 30
headH = 76        复制 CTA top = 102   ctaVisible = true   复制按钮 top = 102
activeEl = DIV.detail-head   ✅
bodyOverflow = visible
```
- ✅ 全屏层正确、复制按钮在**首屏内（top 102）**、焦点正确落到面板头。
- ❌ **它是模态但不是模态**：没有 `role="dialog"`、没有 `aria-modal="true"`、**没有焦点陷阱**、
  没有 Esc 之外的关闭方式（无遮罩点击关闭）。屏读器用户在面板里 Tab 到底会**跑到背后的清单里**（DOM 里 `#detail` 在 `body` 末尾，之后没有别的内容，所以实际会绕回页首）。
  视觉用户看到的是一整屏面板，**背后页面仍在滚动层级里**（`bodyOverflow: visible` 未被锁）。
  这是 WCAG 2.4.3 / 2.1.2 的边界问题，也是「看起来像模态、行为不像」的典型。

### 6.4 向导 390 档

**[实测]**
```
hOverflow = 0     docScrollH = 863 = 1.02 屏     mastH = 290     q1Top = 312
选项按钮高 = [82, 82, 82]   minOptH = 82   「重来」高 = 35
```
- ✅ 无横向溢出、选项 82px 高（远超 44）、一屏能装下第 1 问的全部 3 个选项 + 页头。
- ⚠️ 「重来」35px（低于 44，过 24）。
- ⚠️ 页头 290px 占 34% 的首屏，而它讲的是「不问你喜欢什么风格」这段方法论 —— 一屏 863px 里
  第 1 问只从 312 开始。这与选型台页头折叠是同一个病，但向导没折。

### 6.5 媒体查询盘点（**[静态]**）

`style.css` 共 11 个 `@media`：`min-width:981` ×3、`max-width:1180` ×1、`max-width:980` ×2、`max-width:620` ×3、`prefers-reduced-motion` ×1。
`wizard.css` 只有 1 个（`max-width:620`）。

- ✅ **`prefers-reduced-motion` 有处理**（`style.css:1064`），行卡入场动效被收敛。
- ⚠️ **断点不一致**：折叠逻辑（`index.html:347` 的 `NARROW=980`）、`collapseRailAfterPick`（`prompt-copy.js:1248` 的 `NARROW_RAIL=980`）、
  `syncParked`（`app.js:338` 的 `NARROW=980`）**三处各写了一遍 980**，注释都互相引用「与 style.css 同一个值」。
  这是三份必须同步的常量，改一处就会静默错位 —— 本仓库已经为「两处必须同时改」栽过（`style.css:1140` 的注释自己都记着）。
- ⚠️ **三档布局（≥1181 / 981–1180 / ≤980）实际只有两条布局规则**：`max-width:1180` 那一段（`style.css:992-997`）
  只做两件事 —— `.mast` 从「左栏 + 右读数」两列变单列、h1 限宽 20ch。
  `.bench` 的两栏（rail + 主区）**在 981–1180 之间保持不变**，到 980 才变单列。
  也就是说 1024 宽的笔记本拿到的是「264px rail + 剩 760px 主区」的两栏，行卡里还要放 316px 的截图列 —— 这一段没有被单独调过。
- ✅ **`max-height:46vh` 那一条已被覆盖**：`style.css:998-1013` 的 `@media (max-width:980px)` 写了 `.rail { max-height:46vh; overflow-y:auto }`，
  但同一断点在 `style.css:1327-1330` 又写了一遍 `.rail { max-height:none; overflow:visible }`，**后者在后、生效**。
  **[实测]** 390 档 `railScrollable = { overflowY: "visible", maxHeight: "none" }` —— 内滚链条确实断了。
  但**两条互相否定的规则留在同一个断点里**，下一个人改 998 那一行会以为它在生效。这是维护性缺陷，不是当前 bug。


## 7. 严重度排序的发现表

**评级口径**：S1 = 让「拿到提示词」这条路断掉或给出错误结果；S2 = 显著增加摩擦/让一类用户无法完成；S3 = 局部体验损伤；S4 = 维护性/文案。

| # | Sev | 发现 | WCAG | 证据（file:line） | 实测/静态 |
|---|---|---|---|---|---|
| F-01 | **S1** | **90 个 `<img>` 全部 eager，其中 60 个被 CSS `display:none`**；首屏传输 **12.6 MB**，其中 jpg **9.84 MB**，约 6.5 MB 从未显示 | 1.4.2 之外，主要是性能/成本（非 WCAG，但直接决定首屏可用性） | `app.js:438-448`（`shotFig` 无 lazy）、`app.js:573`（每行发 3 张）、`style.css:541`（`2/3 被 display:none`） | **实测**：`document.images=90`、`loading=lazy` 0 个、`hidden=60`、jpg 9,841,159 B |
| F-02 | **S1** | **复制后焦点被丢到 `body`**：`execCopySync` focus 临时 textarea → `removeChild` 不回填 | **2.4.3 Focus Order** | `prompt-copy.js:923-940`（931-938） | **实测**：点复制前焦点在按钮，点后 `activeEl = BODY.detail-open` |
| F-03 | **S1** | **`#count` 没有 `aria-live`，但两处注释声称有**；筛选结果变化对屏读器完全静默。且 `style.css` 用这条不存在的属性当作「计数不折」的唯一理由 | **4.1.3 Status Messages** | `index.html:232`、`style.css:1333`（注释）、`app.js:863`（只写 textContent） | **实测**：`#count[aria-live] = null`；全目录真 `aria-live` 只有 1 处（`app.js:350`） |
| F-04 | **S1** | **行卡 `role="button"` + `aria-label` 覆盖内容**：30 个卡在屏读器里只剩「展开 Sxx 名」，美学家族/配色/闸门结果/屏数**全部不可达**；`<ol>` 的 `listitem` 数实测为 **0** | **1.3.1 Info & Relationships**、4.1.2 | `app.js:558`、`app.js:561-574`（卡内全部内容） | **实测**：AX 树 `listitem=0`、30 个 button 的 `description` 全空；去掉 `role` 后 `listitem` 变 30 |
| F-05 | **S1** | **28 颗 near 芯片既无样式、按下也无视觉反馈**：它们不在 `.chips` 里（`parent = rail-block`），且 `is-direct`/`is-near` **全仓库 0 条 CSS 规则**。`index.html:165` 却宣传「实心/虚边」 | **1.4.1 Use of Color** + 1.3.1 | `prompt-copy.js:1286`（唯一的类赋值）、`prompt-copy.js:1345`（挂到 `.chips` 外）、`style.css:322`（选不中） | **实测**：`is-near.matches('.chips button') = false`；计算样式 `2px outset` / 16px；按下前后 **完全一致** |
| F-06 | **S1** | **向导非法/越界 URL 参数导致排序退化但静默出结果**：`?load=abc&…` → 全部 `NaN` → `sort` 返回 0 → 按原数组顺序，实测推荐 **S01/S02/S03**（与答案无关），页面上却写「内容量 undefined」 | **4.1.3** + 「不说谎」原则 | `wizard.js:275`（`p.has()` 不校验）、`wizard.js:278`（`+p.get(k)` 无范围）、`wizard.js:111`（`d += NaN`） | **实测**：`?load=abc&img=1&loud=1&guide=1&fear=1` → 3 张卡 = S01/S02/S03；`?load=9&…` 五项全 `undefined` 仍出 3 卡 |
| F-07 | **S2** | **「还有 28 个」展开器没有 `aria-expanded` / `aria-controls`，`.scene-more` 无 id**：展开状态对屏读器不可知 | **4.1.2 Name, Role, Value** | `prompt-copy.js:1348-1359` | **实测**：`aria-expanded` 属性不存在、`aria-controls` 不存在、`.scene-more.id = ""` |
| F-08 | **S2** | **390 档详情是全屏层但不是模态**：无 `role=dialog`、无 `aria-modal`、无焦点陷阱、不锁背景滚动 | **2.4.3 / 2.1.2** | `index.html:319`（`<aside>`）、`style.css` 的 `@media (max-width:980)` `.detail{width:100vw}` | **实测**：`position:fixed;inset:0;390×844`；`role=null`、`bodyOverflow=visible` |
| F-09 | **S2** | **复制成功没有可播报的反馈**：只把按钮文字改 1.8 秒，无 `aria-live`、无 `role=status` | **4.1.3** | `prompt-copy.js:954-962` | **实测**：页面内 `[role=status]`/`[role=alert]` = 0 |
| F-10 | **S2** | **上下方向键是全局快捷键且守卫不排 `<a>` 与 `[role=button]`**：用户滚页面时会打开详情并把页面拉回去 | **2.1.4 Character Key Shortcuts**（单键快捷键应可关或需修饰键） | `app.js:1582-1593`（`ArrowDown`/`ArrowUp`）、`app.js:1561-1577`（守卫） | **实测**：焦点在「企业站 M01」链接上按 ArrowDown → hash `#S01`→`#S02`；在 body 上 PageDown 到 y=787 后按 ArrowDown → **y 回退到 459** 且详情打开 |
| F-11 | **S2** | **`showManual` 兜底对话框无焦点陷阱、关闭后不还焦点**（`role=dialog aria-modal=true` 却行为不符） | **2.4.3** | `prompt-copy.js:853-908`（903 `closeBox` 只 `box.remove()`） | 静态（实测路径需强制造失败，未做） |
| F-12 | **S2** | **`index.html` 的字段数与芯片数两处都对不上**：「多数案 10 段、个别 9 段」→ 实测 **30/30 都 12 段**；「11 组 47 颗芯片」→ 实测 **45（未展开）/ 73（全展开）** | 3.3.2 之外，属「界面陈述与事实不符」 | `index.html:211`（10/9 段）、`index.html:153`（47 颗）、`app.js:1139-1147`（注释明写 11+1=12） | **实测**：`fieldCounts` 分布 `{"12":30}`；`chipsTotal=45`、全展开 73 |
| F-13 | **S2** | **深链 `#S07` 冷载后 `scrollY=0`，而 S07 的卡在 3281px（3.6 屏之外）**：状态恢复了但位置没恢复，用户看不到任何已经打开的东西 | **2.4.3 的相邻问题**（2.2.2 之外） | `app.js:1236-1250`（`open()` 无 scroll）、`app.js:1621` | **实测**：`scrollY=0`、`rowTop=3281`、`detailHidden=false` |
| F-14 | **S2** | **根 `index.html` 的 0 秒 meta refresh 不转发 hash**：分享 `…/index.html#S07` 会落到 `…/_selection/`（hash 丢失、列表顶部） | — | `index.html:11` | **实测**：最终 URL 无 hash |
| F-15 | **S2** | **向导「重来」不清 URL**：刷新后 `replay()` 恢复旧答案并直接跳结果页 | **3.2.5 之外**（状态可预期性） | `wizard.js:252-259`（无 `replaceState`）、`wizard.js:273-284` | **实测**：重置后 `location.search` 仍是 `?load=1&img=1&…` |
| F-16 | **S2** | **向导分享按钮文字被永久改写**：点过一次后 `textContent` 变成整条 URL，不再恢复；重置后重新出现时仍带着旧 URL | **4.1.2 / 3.2.4** | `wizard.js:266`（`btn.textContent = '已复制：' + url`，无还原） | **实测**：重置后 `shareText` 仍是 `…?load=1&img=1&loud=1&guide=1&fear=1` |
| F-17 | **S2** | **`file://` 下向导分享链接是废的**：产出 `file:///D:/…/wizard.html?load=0&…`，发给别人必然打不开，且无降级提示。而 `index.html:85` 宣传「双击即对」 | — | `wizard.js:263`（`location.origin + location.pathname`） | **实测**：`file://` 下 `origin="file://"`、分享文本是本地路径 |
| F-18 | **S3** | **向导 5 个问题无 `fieldset`/`legend`、无 `role=radiogroup`/`radio`**：屏读器读不出「一组单选」 | **1.3.1 / 4.1.2** | `wizard.html:33-37` 等 5 处、`wizard.js:95-103` | **实测**：`fieldset=0, legend=0, [role=radiogroup]=0, input[type=radio]=0` |
| F-19 | **S3** | **向导选完一题后焦点不动**（只 `scrollIntoView`），Tab 会从上一题的按钮继续 | **2.4.3** | `wizard.js:100` | **实测**：5 步全程 `focus = BODY.wz` |
| F-20 | **S3** | **向导结果区无 `aria-live`**：结果出现完全静默 | **4.1.3** | `wizard.js:245-248` | **实测**：`[aria-live]=0`、`[role=status]=0` |
| F-21 | **S3** | **点 9 组常规筛选芯片不会收起 390 档筛选栏**（只有行业芯片会）：筛完仍在 1728px 处 | — | `prompt-copy.js:1249-1259`（只在 `makeChip` 的 click 里调） | **实测**：390 展开后首卡 top=1728；点行业芯片后 460（完整在视口内） |
| F-22 | **S3** | **`#detail` 常驻 DOM，未打开时也占一个 complementary 地标**；无 `role=dialog` 时它与 `role=complementary` 的语义在两档间不一致 | 1.3.1 | `index.html:319` | **实测**：地标列表里有「方案详情」且无方案打开 |
| F-23 | **S4** | **`.cap-warn` / `.cap-ok` 的文字前缀本来就不同**（「内容少于 N 条会留空位」vs「条目可增减」）—— 1.4.1 不成立；**已降级并排除** | — | `app.js:510-514` | **实测** 两个 span 的 textContent 不同 |
| F-24 | **S3** | **`is-direct`/`is-near` 的语义只在 `title` 里**（"直接匹配：S06…" / "只有近似：S09 S19"）；键盘用户与触屏用户拿不到 | **1.4.13 / 2.1.1** 相邻 | `prompt-copy.js:1299-1304` | **实测**：`title` 有内容、`aria-label` 为 null |
| F-25 | **S3** | **芯片名称里混进模板角标**：「餐厅**M02**」会被读成「餐厅 M 零二」 | 1.3.1 相邻 | `prompt-copy.js:1295-1298` | **实测**：AX 名称取自 textContent |
| F-26 | **S3** | **详情面板前 4 段平铺共中位 650 字**，且 `反AI味风险/适用场景/签名式怪癖`（中位 409 字，平铺）排在 5 条折叠条**之后** | — | `app.js:1356-1395` | **静态**（data.js 逐案字数） |
| F-27 | **S3** | **提示词全文从不渲染到页面**：复制走了就没有任何可见文本，用户无法核对、无法只取一段 | **1.1.1 之外**（信息可得性） | `prompt-copy.js:950-979`（只写剪贴板） | **实测**：`#d-body` 中无提示词正文，只有 CTA「约 1944 字」 |
| F-28 | **S4** | **三处 `NARROW = 980` 各写一遍**（`index.html:347`、`app.js:338`、`prompt-copy.js:1248`），必须手工同步 | — | 同左 | **静态** |
| F-29 | **S4** | **`style.css` 980 档里两条互相否定的 `.rail` 规则**（`46vh+overflow-y` 与 `none+visible` 并存） | — | `style.css:1004-1007` vs `style.css:1327-1330` | **静态 + 实测**（后者生效） |
| F-30 | **S4** | **`index.html:211` 把用户指向 README 的「做不到与已知边界」去读一个已修好的构建 bug** | — | `index.html:211` | **静态** |
| F-31 | **S4** | **`a` 的最小高恰好 24px（压线过 WCAG 2.5.8）** | 2.5.8 | `style.css:1266` 只覆盖了 3 条 summary，未覆盖 `<a>` | **实测**：4 条 `a` 的 `minH=24` |

**已确认无问题（明确排除）**：
- 对比度：16 个采样点**全部 ≥ 5.92:1**（AA 要求 4.5）✅
- 字号：390 档 `< 13px` 的正文元素 **0 个** ✅
- `prefers-reduced-motion` 有处理 ✅
- 标题层级不跳级 ✅
- 焦点环：所有自定义控件都有 `:focus-visible` 规则（`style.css` 里 10 处）✅
- 内滚嵌套：`nestedScrollers = []` ✅
- 横向溢出：390 / 768 / 1440 三档**全为 0** ✅
- 点此目标 < 24×24：**0 个** ✅
- 向导「对上你要的」断言：已修（档位比较而非浮点距离）✅
- 向导排除卡的闸门如实标注 ✅


## 8. 测量限制（诚实声明）

- 所有 **[实测]** 数字来自本机 Chrome（`--headless=new`）+ CDP，静态服务为本地 http（无 gzip、无缓存），
  桌面档 1440×900 dsf1、平板 768×1024 dsf1、手机 390×844 dsf1（`isMobile`）。脚本与原始输出见
  `deliverables/74-recon/measure-ux*.mjs` / `measure-out*.json`。
- **首屏 12.6 MB 是本机无 gzip 的数字**。上线后 js+css 走 gzip 会降到约 262 kB，
  但**图片那 9.84 MB 不变**。生产环境的真实首屏应在 **10 MB 量级**，不是 12.6 MB。
- 用 `--hide-scrollbars` 启动，**滚动条宽度相关的一两个 px 未计入**（不影响任何结论）。
- 未做的测量：真实屏读器（NVDA/VoiceOver）逐条播报；强制造 `showManual` 失败路径（F-11 标为静态）；
  1024×768 档；`prefers-reduced-motion: reduce` 下的实测（只做了静态确认）。
- Chrome 在测量后期出现数次「20s 内未启动」（并行 launch 过多导致），
  受影响的行已在文中改为重测结果或用静态分析标注。

## 9. Top-10 修复清单（按「用户影响 ÷ 工作量」排序）

| 序 | 修什么 | 影响 | 工作量 | 证据 |
|---|---|---|---|---|
| **1** | **给 `#count` 加 `aria-live="polite" aria-atomic="true"`**，并把 `index.html:232` / `style.css:1333` 那两句注释改成真的 | 屏读器用户从「筛完什么都不知道」变成「每次都听到列出 N / 30」。这是全页最高频的操作反馈 | **1 个属性 + 2 行注释**（< 5 分钟） | F-03，`app.js:863` |
| **2** | **`execCopySync` 里记住 `document.activeElement`，`removeChild` 后 `focus()` 还回去**；并给复制按钮加一个 `role=status` 的隐藏播报节点 | 键盘用户按完复制不会被打回页首（30+ 个 Tab 的距离） | **3 行**（`prompt-copy.js:923-940`） | F-02 / F-09 |
| **3** | **给被 `display:none` 的 2/3 图加 `loading="lazy"`**（或直接不输出它们，改在详情里给） | 首屏少下 **6.5 MB** 量级。`app.js:444-446` 的注释担心的「闸门数不到真实图片」针对的是**原型页**，不是选型台的卡片缩略图 —— `style.css:530-537` 自己已经写明「这不影响闸门」 | **1 行**（`app.js:573` 的后两个 `shotFig` 调用加参数）或 **CSS 不动、JS 少发 2 个 figure** | F-01 |
| **4** | **把 `.chips button` 选择器改成 `.chips button, .scene-more button`**（或把 `.scene-more` 挪进 `#flt-scene`） | 28 颗 near 芯片恢复与其余芯片一致的外观、恢复 `aria-pressed` 的视觉反馈。`index.html:165` 那句「实心/虚边」才成立 | **1 个选择器**（`style.css:322`）+ 1 个 `appendChild` 目标（`prompt-copy.js:1345`） | F-05 |
| **5** | **行卡：`role="button"` 换成 `<li>` 内套一个可聚焦的 `<button>`（或用 `role=listitem` + 卡内一个「展开」按钮）**；把 `aria-label` 换成 `aria-describedby` 指向卡内摘要 | 屏读器用户能从 30 张卡里**听出区别**（美学家族/闸门/屏数），并恢复 `listitem` 计数 | **中等**（`app.js:558-575` + `app.js:882-888` 的事件绑定 + `style.css` 的 `.row` 点击区） | F-04 |
| **6** | **把 `ArrowDown`/`ArrowUp` 从全局快捷键里去掉**，只保留 `J`/`K`；或加 `e.altKey` 之类的修饰键要求 | 用户不再在滚页面时被强行打开详情 + 页面回跳。`index.html:211` 本来也只宣传 `J`/`K` | **2 行**（`app.js:1582` / `:1588` 删两个条件） | F-10 |
| **7** | **改 `index.html` 那两处数字**：「47 颗」→ 45（未展开）/ 73（全展开），「多数案 10 段」→「每案 12 段」 | 界面不再陈述与事实不符的数字。这两个数字用户可以直接数出来 | **2 个字符串** | F-12 |
| **8** | **向导 URL 参数校验**：`p.get(k)` 必须是 `0..NQ[k]-1` 的整数，否则**不 render**（退回问题 1 并提示） | 杜绝「推荐 S01/S02/S03 且页面写 undefined」这种静默降级 | **5 行**（`wizard.js:275-281`） | F-06 |
| **9** | **向导「重来」里补 `history.replaceState(null,'',location.pathname)` + 还原分享按钮文字 + 把焦点放回第 1 问** | 「重来」真正回到初始状态（刷新也不会复活旧答案），分享按钮不再永久显示旧 URL | **4 行**（`wizard.js:252-259` + `:266`） | F-15 / F-16 |
| **10** | **`.scene-toggle` 加 `aria-expanded` + `aria-controls`，`.scene-more` 加 id**；顺手给 `#detail` 在 ≤980 档加 `role="dialog" aria-modal="true"` + 焦点陷阱 | 展开器状态可播报；390 档全屏层从「看起来像模态」变成真的是模态 | **小**（3 个属性 + 一个 `focusin` 陷阱） | F-07 / F-08 |

**不进 Top-10 但值得单独做的一件事（成本最低、收益最高）**：
**[实测]** 提示词约 **1944 字**，而它在页面上**一个字都不显示**（`#d-body` 里只有「复制 AI 提示词 / 粘给 ChatGPT / 约 1944 字」）。
一个「先展开看一眼」的 `<details>` 把 `buildPrompt()` 的结果原样放进去，就等于同时解决了：
可核对、可只取一段、可调、以及「复制失败时不用等兜底弹窗」。这是**整个产品最后一步**里唯一的黑箱。

## 10. 一句话结论

选型台在**视觉、对比度、点击目标、折叠策略、内滚嵌套**这几件事上做到了同类产品里少见的水平（数据都在 §3.7 / §6 / §7 的「已确认无问题」里）；
它真正的问题集中在**「界面对辅助技术沉默」**：`#count` 不播报、复制不播报、30 张卡在屏读器里只剩编号、
28 颗芯片按下不变色 —— 这些都不影响视觉用户「把提示词拿出来」，
但让依赖屏读器或键盘的用户在这条路上反复失去位置。
而 S1 里最贵的一条（F-01，6.5 MB 白下载）反而是**最好修的**：一行属性。
