# 对账裁决：CSS 级联分析师 10 条预测 × 跨视口几何实测

> 裁决员：对账 agent（reconciliation）
> 输入：`deliverables/25-critique-cascade-analyst.md`（分析师，只读源码，自建级联求解器）
> 　　　`deliverables/26-critique-geometry-measurer.md`（测量员，禁读源码，CDP 实测 144 点）
> 　　　`_crit3/ledger.json`（机器可读台账 144 × 30）
> 输出：本文件。**只裁决，不修任何原型/模板/脚本/README。**

## §0 方法与判定规则

### 0.1 链路（自建，不依赖任何已被清理的临时目录）

```
node _crit8b/measure.mjs                     # 本裁决的实测链路
  ├─ _crit8b/serve.mjs                       node:http 静态服务器，站点根 = D:\Web\style
  │                                          （file:// 下 mask-image:url() 与 ../_fonts/ 整体失效 → 必须 http）
  ├─ tools/.../lib/cdp.mjs  Browser.launch({width:1440,height:900})
  │    └─ b.newPage({width,height,dsf:1,mobile})  → Emulation.setDeviceMetricsOverride（CDP 真改视口）
  ├─ 断言     每次测量【前】【后】各读一次 window.innerWidth，!== 目标宽 → 该档作废重试（最多 3 次）
  ├─ scrollPass  真实 Input.dispatchMouseEvent(mouseWheel) 滚全页触发 IntersectionObserver，回顶等 1.2s
  │               （不用 --virtual-time-budget；不用 chrome --window-size=390,844）
  └─ 页面内探针 _crit8b/probe-inpage.js  自带结尾 () 的表达式
```

**关键差异（这是本次对账比前两轮更强的地方）**：级联赢家不是我手算的、也不是分析师的自建求解器算的，而是
**在浏览器里用 `el.matches(sel)` + `window.matchMedia(cond).matches` 现算**（`window.__WIN(el, prop)`）：
遍历 `document.styleSheets` 全部规则、逐条拆选择器列表、只用命中的子选择器算特异性、按
`!important > 特异性 > 源序` 排序，返回候选列表（赢家在最前）。这样**不存在"选择器表取错"这一整类推导错误**。

### 0.2 `innerWidth` 断言结果

本裁决的每一个数字所在「案 × 档」都通过了 `window.innerWidth === 目标宽`，且测量前后各断言一次。逐档结果见 §1 每行的"断言"列（全部 通过 / 无作废重试）。档位：390×844（`mobile:true`）、768×1024、1024×768、1440×900，另加 1200×900 用于 S30 的 1024–1199/1200–1439 两段交叉带。

### 0.3 与测量员（26 号）口径的一致性

**完全一致，我没有改任何一条**：

| 口径 | 测量员 §3.2 写死的规则 | 我的实现 | 是否一致 |
| --- | --- | --- | --- |
| 行数 | 只认 `Range.getClientRects()` 圈**单个文本节点**得到的矩形数 | `__LINES(el)`：`TreeWalker` 走文本节点 → 每个节点 `Range.selectNodeContents` → 数 `width>0.5 && height>0.5` 的 rect | 一致 |
| 列数 | 同视觉行分组（`offsetTop` 容差 3px）取同排子项数最大值；**轨道数另列** | 本次不需要列数推断，只报 `grid-template-columns` 解析出的**轨道数**与子项 `offsetWidth`，两者分列 | 一致 |
| 滚动条 | 只认 `window.scrollTo(999999,0)` 之后的 `window.scrollX`；`scrollWidth > clientWidth` 不等于有滚动条 | `__MAXSCROLLX()`：先记 `scrollX` 原值 → `scrollTo(999999,0)` → 读 `scrollX` → 滚回 | 一致 |

补充声明两条我自己的口径：
1. **"档位生效"不看 CSS 源码里的媒体条件文本**，只看该档实测的 computed 值 + `__WIN` 给出的赢家选择器与其媒体条件串（由浏览器解析）。
2. **修复前后对照**用两种方式做：(a) 读该档现测值；(b) 需要证明"修前长什么样"时，用 `git diff` 取修复提交前后的文件版本，或按分析师 §修订快照的 sha256 校验重建，再同一链路重测。

### 0.4 判定用词（四选一，不含糊）

| 判定 | 条件 |
| --- | --- |
| **对** | 分析师 §2.3 里该条的「我预测的值」在本轮实测中**逐项成立**，且它的判定式（"若实测是 X 则我错"）**没有被触发**。 |
| **错** | 预测值与实测**在同一口径下不等**，或它的判定式被触发。必须写明错在推导的哪一步。 |
| **无法判定** | 它给的是区间/趋势/因果，或指的是 4 档之外、交互态、reduced-motion、打印、无障碍树等我没测的量。写明缺什么证据才能定。 |
| **预测对但事后已修** | **修复前**版本严格等于它的预测值，**当前**版本已被后续提交改掉。给出修复时间线与现值。 |

**这类必须先问的问题**：现在测到的值，是不是正是它预测的那个值的**修复后状态**？为此我先做了一次版本考古（见 §2.1）：把 8 个相关 `style.css` 的当前 sha256 与分析师 §修订快照逐一比对，再对不一致的文件用 `git log/diff` 定位修改它的提交与时间。

### 0.5 版本考古（先把"谁在什么时候改了什么"钉死）

分析师快照时间 **2026-10-21 21:49:57**，git HEAD `a844e48`。当前 git HEAD `b2e0ea8`，工作树对相关原型**干净**（`git status --porcelain` 无输出）。

| 文件 | 分析师快照 sha256 前 12 | 当前 sha256 前 12 | 是否有改动 | 改它的提交（时间） |
| --- | --- | --- | --- | --- |
| S13 `style.css` | `169facbe6699` | `5e6dc1cf8dcd` | **有（+24 行，只在文件末尾追加）** | `e935882` 10-21 23:13:30「修选型台四条…+ S13 级联缺陷」 |
| S28 `style.css` | `417e4bef0a9d` | `3e5badd7ff54` | **有（+32 行，`.press__grid/.status__grid` 各两处）** | `b2e0ea8` 10-21 23:32:37「修 AH-02（我引入的回归）」 |
| S08 / S11 / S15 / S18 / S23 / S26 / S30 | `1a4b831f071b` / `2bcfa9b8a5ce` / `48913b152308` / `26aa1d623e9e` / `4026e0acd552` / `a73bf4f08cc6` / `b8af5dd3384f` | 与左列**逐字节相同** | 无 | — |

→ 结论：**只有 S13 与 S28 在分析师交卷后被改过**，其余 7 个文件的实测就是分析师看的那一版（所以那些条目不存在"事后被修"的干扰）。S28 那次改的是 `.press__grid/.status__grid` 的 `display:block`（AH-02），**与 CA-03 的 `.wall .blk__frame` 完全无关**（`git diff a844e48 HEAD` 已核）；S13 那次追加的正是 CA-01 的修复块（见 §2.1）。

## §1 逐条裁决表

判定分布：**对 9 条 ｜ 错 0 条 ｜ 无法判定 0 条 ｜ 预测对但事后已修 1 条（CA-01）**。
每条都断言过 `window.innerWidth === 目标宽`（测量前 + 测量后各一次，全部通过，无档位作废）。

| 编号 | 档位 | 元素 | 它的预测（§2.3） | 我的实测 | 判定 | 依据（关键赢家 / 关键值） |
| --- | --- | --- | --- | --- | --- | --- |
| CA-01 | 390 & 768 | `div.letterhead__top` | 两轨道 `minmax(0,7fr) minmax(0,9fr)`；`gap:40px`；`align-items:end`；768 ≈297.5/382.5；390 ≈132/170 | **修复前版本**（按它 §修订快照 sha256 `169facbe6699` 重建，同链路重测）：390 `132.125px 169.875px` + gap 40 + end；768 `297.5px 382.5px` + gap 40 + end。**当前版本**：390 单轨道 `342px` + gap 24 + start；768 单轨道 `720px` + gap 24 + start；1440 `563.5px 724.5px`（=7:9）+ gap 40 + end | **预测对但事后已修** | 修复前逐项等于预测；当前档位 390/768 三档无溢出（`maxScrollX=0`）；390 的 `grid-template-columns` 赢家 = `(max-width:1023px)` 末尾追加块 `minmax(0,1fr)`（源序最末），基础 `minmax(0,7fr) minmax(0,9fr)` 退为第 2 候选 |
| CA-02 | 390 & 768 | 4 个 `.hangrail .hang` | computed `left:0px` **且** `right:0px`（过约束 → 右边被丢）；牌在挂轨**左缘**；判定式：若在右缘（390 x≈310–340）则它错 | 390：4 个牌 computed `left:0px` / `right:0px`，`x=30.56` = 挂轨左缘（挂轨 `x=30.56`）；768：同样 `0px/0px`，`x=60.2` = 挂轨左缘。与正文实测重叠：390 与 `figcaption.plate__cap` 重叠比 **1.000**、与 `span.ln` **1.000**；768 与 `span.ln` **0.738** | **对** | `left` 赢家 = `.hangrail .hang` **(0,2,0) @BASE**（压掉同一媒体块里 `.hang` 的窄档声明）；它的 x 量级估计（≈15px）偏小，实际 30.6px（漏算了挂轨包含块自身的左偏 15.59px），但判定式未触发 |
| CA-03 | 390 | 6 个 `.wall .blk__frame` | `min-height:300px`、`aspect-ratio:auto`、`offsetHeight ≥ 300`；判定式：若 ≈220–230 或 min-height:0 则它错 | 390：6 个全部渲染，全部 `min-height:300px` / `aspect-ratio:auto` / `offsetHeight=300`（宽 336–346） | **对** | `min-height` 与 `aspect-ratio` 的赢家都是 `.wall .blk__frame` **(0,2,0) @BASE**；同档对照：`.head__wall .blk__frame`（无 `.wall` 祖先）拿到 `min-height:0` + `aspect-ratio:16/10` —— 作者窄屏意图确实存在、确实只对一半元素生效 |
| CA-04 | 768 | `li.plate-i` 第 1 个 vs 第 6 个 | 第 1 个 `grid-column:span 2`（通栏）；第 6 个半栏；判定式：若第 1 个与第 6 个等宽则它错 | 768：第 1 个 `grid-column: span 2`、`offsetWidth=744`；第 6 个 `auto`、`offsetWidth=360` | **对** | 第 1–3 个赢家 = `.plate-i:nth-child(-n+3)` **(0,2,0) @BASE** `span 2`（压掉 `(max-width:1439px)` 的 `.plate-i` **(0,1,0)** `auto`）；第 6 个两支同为 (0,2,0)、媒体块源序更后 → 拿到 `auto` |
| CA-05 | 390 & 768 | 21 个 `.plate use`（含 `.ink--frame/c1/c2/c3`） | `stroke-width:1.36px`；判定式：若 2 / 1.7 / 1.4px 则它错 | 390 与 768：**21 个全部 1.36px**（`ink--frame` 6、`ink--base` 4、`glyph` 4、`ink--pencil`/`rev`/`smudge`/`c1`/`c2`/`c3`/`text` 各 1）；1024/1440 恢复基础阶梯 1.2 / 1 / 0.8 | **对** | 赢家 = `.plate use` **calc(1.36px) (0,1,1) @(max-width:1023px)**，第 2 候选 = `.ink--frame` `2px` **(0,1,0) 同媒体块**、第 3 = `.ink--c1` `1.4px` **(0,1,0)** → 顺序救不了特异性，与推导逐字一致 |
| CA-06 | 390 / 768 / 1440 | 3 个 `p.foot__t` | 三档 `font-size` 全 = `15px`；判定式：若 390 档 17px 或 1440 档 22px 则它错 | 三档全部 `15px`（3 个元素 × 3 档 = 9 个测量点）；3 个元素的祖先链实测均为 `… < div.foot__grid < footer.foot < div.sheet < body`，`closest('.foot')` 全部为真 | **对** | 赢家 = `.foot p` **(0,1,1) @BASE** `15px`，压掉 `.foot__t` 基础 `22px` **(0,1,0)** 与 `(max-width:1023px)` 的 `17px`；它自报的盲点 3（未打印祖先链）已消除 |
| CA-07 | 390 | `#f8.flake` vs `#f1.flake` | `#f8` = `8px` / `40px`；`#f1` = `16px` / `44px`；判定式：若 `#f8` 也是 16/44 则它错 | 390：`#f8` padding `8px 18px 40px 8px`；`#f1` padding `16px 38px 44px 16px`（`#f8` 已渲染，`display:block`） | **对** | `#f8` 的 `padding-left` 赢家 = `#f8{…}` **(1,0,0) @BASE**（ID 压类），`(max-width:767px)` 的 `.flake` **(0,1,0)** 只能改到没有 ID 的 `#f2`–`#f7` |
| CA-08 | 390 | `.spec tfoot td` | computed `height:40px`；判定式：若随内容自适应 ≠40 则它错 | 390：computed `40px` + `offsetHeight=40` + `display:block`（tbody 同结构为 24px）。**因果隔离**：从 CSSOM 摘掉基础 `.spec tfoot td{height:40px}` → 立刻落到 **34px**（768 档 32px），装回 → 40px | **对** | 赢家 = `.spec tfoot td` **(0,1,2) @BASE** `40px`，压掉 `(max-width:767px)` 的 `.spec td` **(0,1,1)** `auto`；它自评"无可测差异（~30%）"过于保守：实测差 6px / 8px |
| CA-09 | 390 & 768（另测 1024） | `.plate`（6 个） | 载入后 <1.34s：`animation-name:settle`；>1.34s：`none`；判定式：若 0.5s 就已是 none 则它错 | 时间序列（390/768/1024）：属性在时 `anim=["settle"]` + `transform` = `matrix3d(0.707107,0.353553,0.612372,0, …)`（正是 `rotateX(60deg) rotateZ(45deg)`）；记为 `removedAt perfNow=1827.3`（1024）/ `2024.6`（768），之后 `anim=["none"]`、`transform:none` | **对** | **直接级联证据**（不是取值推断）：把 `data-settling="on"` 强加回去后，赢家 = `.iso-plane[data-settling="on"] .plate` **(0,3,0) @BASE** `settle`，第 2 候选 = `.plate` **(0,1,0) @(max-width:1023px)** `none` |
| CA-10 | 390 & 768 | `.plate`（6 个） | computed `position:relative`；判定式：若 `static` 则它错 | 390 与 768：6 个全部 `relative`（1024 档才是 `absolute`，不在本条档位范围） | **对** | 同块内 L286 `.plate{position:relative}` 与 L281 同特异性且源序更后 → L281 的 `position:static` 是死声明，与推导一致；本条它自己就声明"无可测差异"，实测确认 |

### 1.1 需要单独点名的两处「预测内是真、附带判断是假」

这两处不足以把判定翻成"错"（它 §2.3 的判定式都没被触发），但会误导后续修法，所以单列：

| 条目 | 它说的话 | 实测 | 性质 |
| --- | --- | --- | --- |
| CA-01 影响段 | "390 档 h1 所在栏只剩约 132px（约 7–9 个汉字宽），**标题必然折成多行** —— 会连带撞 `_CONTRACT.md` §6 的标题不得超 2 行" | 修复前版本实测：h1 `.doctitle` 宽 **132.13px**、`font-size:30px`、4 个汉字（"盲压公函"）、`Range.getClientRects()` 圈该文本节点 = **1 行**（rect 高 38px = 1×line-height） | 栏宽 132px 属实；"必然折成多行"**被实测否证**（本例标题只有 4 字，30×4=120 ≤ 132.13）。标题是否折行取决于标题字数，不是必然后果 → 严重度"阻断级"的理由链断了一环 |
| CA-04 影响段 | "390 档看不到差异（`.plates` 已变单列，`span 2` 也钳成 1 列）" | 390 档实测同屏三种宽度：第 1–3 个 `362px`、第 4–5 个 `390px`、第 6 个 `334px`（`.plates` computed 轨道 `334px 0px 0px`，gap 28） | **有差异**：`span 2` 项比单轨道宽一个 gap（+28px），`span 3` 项再宽一个 gap。同一列表在 390 档出现三种宽度 → 它漏了同一根因在 390 档的残留（详见 §3.2） |

## §2 逐条展开

复算命令（全部只读原型、只往 `_crit8b/` 与本文写文件）：

```powershell
cd D:\Web\style
D:\Nodejs\node.exe _crit8b\measure.mjs            # 10 条 CA 的全量实测（含 S08 时间序列）→ _crit8b/out/*.json
D:\Nodejs\node.exe _crit8b\summary.mjs            # 压成人读行 → _crit8b/summary.log
D:\Nodejs\node.exe _crit8b\s13prefix.mjs          # CA-01 修复前/后对照（含 h1 行数）
D:\Nodejs\node.exe _crit8b\sweep.mjs              # 独立重扫"媒体意图被基础规则压掉"这一类 → _crit8b/sweep/classes.json
D:\Nodejs\node.exe _crit8b\blindspot2.mjs         # --* 自定义属性盲区复核（全库 161 组）
D:\Nodejs\node.exe _crit8b\newfind.mjs            # 新发现项的渲染后果复核
```

每条的级联证据都来自页面内的 `window.__WIN(el, prop)`（浏览器自己匹配选择器），返回按
`!important > 特异性 > 源序` 排好的候选列表 —— 所以下面每条都能同时给出**赢家选择器 + 特异性 + 媒体条件 + 源序索引**。

### 2.1 CA-01 ｜ S13 `.letterhead__top` ｜ **预测对但事后已修**

**预测的逐项复核（修复前版本）**：按它 §修订快照的 sha256 `169facbe6699` 重建文件（比对通过：`reconstructed=169facbe6699 match=true bytes=32301/34229`，即当前文件 = 它看的版本 + 末尾追加块），用 `Fetch.fulfillRequest` 在 CDP 里替换该 CSS 重测：

| 档位 | 它预测 | 修复前实测 | 逐项 |
| --- | --- | --- | --- |
| 390 | 两轨道 7:9，`gap:40px`，`align-items:end`，左栏约 **132px** / 右栏约 **170px** | `grid-template-columns: 132.125px 169.875px`、`gap: 40px`、`align-items: end`、第一个子元素宽 **132.13px** | **逐项相等** |
| 768 | 两轨道 **297.5px / 382.5px**，gap 40，end | `grid-template-columns: 297.5px 382.5px`、`gap: 40px`、`align-items: end`、子元素 **297.5px** | **逐项相等** |
| 1440（它说基础规则不能动） | 两轨道（7:9） | 修复前 `563.5px 724.5px` = 7:9 | 相等 |

**修复时间线（这里是"事后被修"的关键）**：

| 时刻 | 事件 | 证据 |
| --- | --- | --- |
| 2026-10-21 21:49:57 | 分析师快照完成，S13 sha256 前 12 = `169facbe6699`，HEAD `a844e48` | 它 §修订快照 |
| 2026-10-21 **22:15:44** | `prototypes/S13-blind-debossed-dispatch/style.css` 被写入（+24 行，**只在文件最末尾追加**） | 文件 mtime；`git diff a844e48 HEAD -- …S13…/style.css` = `24 ++++++++++` |
| 2026-10-21 **23:13:30** | 提交 `e935882`「修选型台四条（其中两条是我自己的 bug）+ **S13 级联缺陷** + S21 素材接线」 | `git log --format='%h %ad %s'` |
| 追加块内容 | 明确写了它扫出的 CA-01：「由 CSS 级联与声明顺序分析师独立扫出（CA-01，阻断级，置信度 95%）」，修法 = **文件末尾同特异性重断言** `@media (max-width:1023px){ .letterhead__top{grid-template-columns:minmax(0,1fr);gap:24px;align-items:start} }` | 文件末尾 24 行原文 |

**现值（当前文件，390/768/1024/1440 全部断言过 `innerWidth`）**：

| 档位 | `grid-template-columns` | `gap` | `align-items` | 子元素宽 | `maxScrollX` |
| --- | --- | --- | --- | --- | --- |
| 390 | **`342px`（单轨道）** | **24px** | **start** | 342 | 0 |
| 768 | **`720px`（单轨道）** | **24px** | **start** | 690 | 0 |
| 1024 | `381.5px 490.5px`（两轨，7:9 语义） | 40px | end | 381.5 | 0 |
| 1440 | `563.5px 724.5px`（=7:9，未动） | 40px | end | 563.5 | 0 |

390 档的 `grid-template-columns` 赢家链（浏览器现算）：①`(max-width:1023px)` 末尾追加块 `minmax(0px,1fr)` **源序最末** → ②基础 `minmax(0px,7fr) minmax(0px,9fr)` idx 149 → ③原 L662 `(max-width:1023px)` `1fr` idx 139。
**除 390/768 外三档无溢出（`maxScrollX=0`），且修复没有改变 1440 档** —— 与它"不要动 L681 基础规则"的建议一致。

**它这一条里唯一被实测否证的话**：「390 档 h1 必然折成多行」。修复前实测 `h1.doctitle` 宽 132.13px、`font-size:30px`、文本仅 4 个汉字（"盲压公函"），`Range.getClientRects()` 圈该文本节点 = **1 行**（rect 高 38px = 1 × line-height）。→ 栏宽窄属实、折行不是必然（30×4=120 ≤ 132.13）。这条影响链的"会撞 `_CONTRACT.md` §6 标题不超 2 行"在本页不成立。

### 2.2 CA-02 ｜ S18 `.hangrail .hang` ｜ **对**

| 档位 | 4 个牌 computed `left` / `right` | 牌 `x` | 挂轨 `x` | 牌在哪儿 | `maxScrollX` |
| --- | --- | --- | --- | --- | --- |
| 390 | **`0px` / `0px`**（过约束） | **30.56** | 30.56 | 挂轨**左缘** | 0 |
| 768 | **`0px` / `0px`** | **60.2** | 60.2 | 挂轨**左缘** | 0 |

级联链（`left` 上）：
`① .hangrail .hang (0,2,0) @BASE = 0px`（idx 44）→ `② .hang (0,1,0) @(max-width:767px) = auto`（idx 221，就是它引的 L365）→ 在 768 档 ②换成 `.hang (0,1,0) @(min-width:768px) and (max-width:1023px) = auto`（idx 192，即它引的 L330）。
**同一媒体块的 `left:auto` 确实存在**，而且我在同一个页面里找到了作者的"自身对照"：第 5 个 `.hang`（`div.hang.hang--live`，不在 `.hangrail` 内）**没有** `.hangrail` 祖先 → 它拿到 `left:auto`（赢家就是媒体规则，未被压）。所以这不是"故意让牌子靠左"，而是 `.hangrail` 祖先把特异性从 (0,1,0) 抬到 (0,2,0) 造成的不一致。

**它的影响判断也逐项成立**（我另做了重叠测量，找与牌子矩形相交且自身含直接文本的元素）：

| 档位 | 牌 | 最大重叠对象 | 重叠比（相交面积 ÷ 牌面积） |
| --- | --- | --- | --- |
| 390 | 第 1 个 | `figcaption.plate__cap`（"通电检查：一只手停在一排…"） | **1.000** |
| 390 | 第 2 个 | `span.ln`（"14:05:02 摘牌出…"） | **1.000** |
| 390 | 第 3、4 个 | `span.ln.ln--out` | 0.671 |
| 768 | 4 个全部 | `span.ln` | 0.664–0.738 |

**唯一的数值偏差**：它估"390 档约 15px 量级"。实测 30.56px —— 它按"挂轨包含块宽度 × 4%"算，漏了挂轨包含块自身的左偏 15.59px（`rail.computed.left = 14.9688px` 是相对包含块算的）。它的判定式是"若落在挂轨右缘（390 档 x≈310–340）则我错"，未触发。

### 2.3 CA-03 ｜ S28 `.wall .blk__frame` ｜ **对**

390 档（6 个全渲染，无一个被隐藏）：

| # | `min-height` | `aspect-ratio` | `offsetHeight` | 宽 |
| --- | --- | --- | --- | --- |
| 1–6 | **`300px`（全部）** | **`auto`（全部）** | **300（全部）** | 336–346 |

级联链：`min-height` 与 `aspect-ratio` 的赢家都是 **`.wall .blk__frame` (0,2,0) @BASE**（idx 104），失败者是同档 `(max-width:767px)` 的 `.blk__frame` **(0,1,0)**（`min-height:0` / `aspect-ratio:16 / 10`）→ 与它"特异性 (0,2,0) > (0,1,0)，与媒体先后无关"的推导完全一致。

**我补的对照（它没有的）**：同档 `.head__wall .blk__frame`（3 个，没有 `.wall` 祖先）实测 `min-height:0px` + `aspect-ratio:16 / 10`、高 210–216px —— 即**作者在同一个 `@media (max-width:767px)` 块里写的意图，对 3 个 head 图框生效、对 6 个 wall 图框完全无效**。这比它自己的证据更硬：同一档同一条规则的分裂结果不可能是"设计"。

**与 S28 事后改动无关**：S28 在 10-21 23:23:09 被改过（提交 `b2e0ea8`），但 `git diff a844e48 HEAD` 显示只加了 `.press__grid/.status__grid { display:block }` 两处（AH-02），`.wall .blk__frame` 那两行未动 → 本次实测就是它看的那一版。
它的影响估算（每块多 70–80px、6 块合计约 +450px）实测为：每块 300 − (宽 × 10/16 ≈ 210–216) ≈ **84–90px**，6 块 ≈ **+505px**，同量级、略大。

### 2.4 CA-04 ｜ S23 768 档 `li.plate-i` ｜ **对**

| 768 档 | `grid-column` | `offsetWidth` | 赢家 / 失败者 |
| --- | --- | --- | --- |
| 第 1 个 | **`span 2`** | **744**（= 360+24+360，通栏） | 赢家 `.plate-i:nth-child(-n+3)` **(0,2,0) @BASE idx171** ← 失败者 `.plate-i` **(0,1,0) @(max-width:1439px) idx211** `auto` |
| 第 6 个 | `auto` | **360**（半栏） | 赢家 `.plate-i:nth-child(6)` **(0,2,0) @(max-width:1439px) idx211** ← 次选 `.plate-i:nth-child(6)` (0,2,0) @BASE `span 6` |

`.plates` 在 768 档 computed 为 `360px 360px 0px`：赢家是 `(max-width:1439px)` 的 `1fr 1fr`（idx 210）。**第 3 条 `0px` 轨道是隐式轨道** —— 第 4、5 个的 `span 3` 在 2 列显式网格里越界，浏览器补出第 3 条轨道（Chrome 把隐式轨道一并算进 `grid-template-columns` 的解析值）。它没有提这条隐式轨道，但它的两个结论（第 1 个通栏、第 6 个半栏）实测成立。

它的 768 档前提（`>767` 才两列）也成立：`.plates` 的赢家在 768/1024 是 `(max-width:1439px){1fr 1fr}`、在 390 是 `(max-width:767px){1fr}`。

### 2.5 CA-05 ｜ S15 SVG 墨重阶梯 ｜ **对**

390 与 768 档，21 个 `.plate use` **全部 = `1.36px`**（`ink--frame` 6、`ink--base` 4、`glyph` 4、`ink--pencil`/`ink--rev`/`ink--smudge`/`ink--c1`/`ink--c2`/`ink--c3`/`ink--text` 各 1）。级联链（以 `.ink--frame` 为例）：
`① .plate use (0,1,1) @(max-width:1023px) = calc(1.36px)`（idx 229）→ `② .ink--frame (0,1,0) @(max-width:1023px) = 2px`（idx 230）→ `③ .ink--frame (0,1,0) @BASE = var(--ink12)`
对照：1024 / 1440 档（不在 `≤1023` 块内）恢复基础阶梯 —— `ink--frame` 1.2px、`ink--c3` 1.2px、`ink--c2` 1px、`ink--c1` 0.8px、`ink--base`/`ink--pencil`/`ink--rev` 0.8px。所以它引的 L441/L442/L443/L444 与"顺序救不了特异性"的判断逐项成立。

### 2.6 CA-06 ｜ S26 `p.foot__t` ｜ **对**

| 档位 | 3 个 `p.foot__t` 的 `font-size` | 祖先链（实测） | `closest('.foot')` |
| --- | --- | --- | --- |
| 390 | **15px × 3** | `div < div.foot__grid < footer.foot < div.sheet < body < html.js` | true × 3 |
| 768 | **15px × 3** | 同上 | true × 3 |
| 1440 | **15px × 3** | 同上 | true × 3 |

赢家 = **`.foot p` (0,1,1) @BASE `15px`**（idx 156），第 2 候选 = `.foot__t` (0,1,0) @BASE `22px`（idx 153）。→ 它自报的**盲点 3 完全消除**：3 个元素**全部**在 `footer.foot` 内，所以"三个都是 15px"成立，不存在第 3 个是 22px 的情况。

它的影响段说"页脚小节标题与正文同号，层级只剩字重 700"也成立（同档 `.foot p` 正文实测同为 15px）。附带实测（不在它结论内）：1440 档同族标题里 `.knock__t`/`.empty__t` 是 22px、`.err__t` 是 17px —— 一个同族三值的不一致，见 §4。

### 2.7 CA-07 ｜ S23 `#f8.flake` ｜ **对**

390 档：`#f8` computed padding = `8px 18px 40px 8px`（左 8 / 下 40），`#f1` = `16px 38px 44px 16px`（左 16 / 下 44）。
赢家链（`padding-left`）：`① #f8{…} (1,0,0) @BASE`（idx 86）→ 失败者 `(max-width:767px)` 的 `.flake (0,1,0)`（同一条规则在 `#f2`–`#f7` 上**确实生效**：实测 `16px … 44px 16px`）→ 所以"ID 压类"的机制与它一致。

`#f8` 在 390 档确实渲染（`display:block`，宽 358、高 133.69）；在 768/1024 档它是 `display:none`，但那是同文件 `@media (max-width:1439px)` 的 `#f7,#f8,#f9,.note--d{display:none}`（**有意设计**，≤767 块里又用 `display:block` 放回来）—— 与本能条无关，且我因此把"768 档 `#f8` 不渲染"排除出缺陷。

### 2.8 CA-08 ｜ S11 `.spec tfoot td` ｜ **对**

390 档：computed `height = 40px`、`offsetHeight = 40`、`display:block`、`padding: 6px 0`、`line-height: 22px`、`box-sizing: border-box`；同表 `tbody td` 是 `24px`。
赢家 = **`.spec tfoot td` (0,1,2) @BASE `40px`**（idx 104）→ 失败者 = `(max-width:767px)` 的 `.spec td` **(0,1,1) `auto`**（idx 168）。
**因果隔离（我做的、它没做的）**：在页面里从 CSSOM 临时 `removeProperty('height')` 掉那条基础规则 → `tfoot td` 的 `offsetHeight` 立刻从 `[40, 40]` 变 `[34, 34]`（768 档 `[40,40]`→`[32,32]`），装回属性 → 恢复 `[40,40]`。→ 这条级联死角**有 6px（390）/ 8px（768）的可测后果**。
**它自评"无可测差异（~30% 可见）"过于保守、但方向是对的**：`height:40px` 在 `display:block` 的 `td` 上确实被当固定高（内容 34px 也不缩），实测差 6–8px，不是 0。

### 2.9 CA-09 ｜ S08 `.plate` 的 `animation` 时间窗 ｜ **对**（它最不稳的一条，实测两面都验到）

时间序列（`performance.now()` 实测，不是估算；`RECORDER` 用 `MutationObserver` 记录属性被摘除的时刻）：

| 档位 | 属性存在时 | 属性被摘除 | 摘除后 |
| --- | --- | --- | --- |
| 768 | `t=1969.8`：`settling=1`、`animation-name=["settle"]`、`transform=matrix3d(0.707107,0.353553,0.612372,0,…)` | **`removedAt=2024.6`** | `anim=["none"]`、`transform:none`（持续到 `t=4041.6` 及滚动后 `t=6348.9`） |
| 1024 | `t=1584.7`：同上 | **`removedAt=1827.3`** | 同上 |
| 390 | 本次观测起点（`t=1868.8`）属性已被摘除 → 全程 `none` | `null`（观察开始前就摘了） | `anim=["none"]`、`pos=relative` |

**它的判定式两面都没触发**："<1.34s 时 `animation-name:settle`" 实测成立（768/1024 档抓到）；"若 0.5s 就已 `none` 则我错"不成立（我抓到的是 `settle`）。它给的 3D 矩阵预测（"含 `rotateX(60deg) rotateZ(45deg)` 的矩阵"）**逐位相等**：实测 `matrix3d(0.707107, 0.353553, 0.612372, 0, -0.707107, 0.353553, 0.612372, 0, 0, -0.866025, 0.5, 0, 0, 26, 0, 1)` 正是 `rotateX(60deg) rotateZ(45deg)` 的 3×3 部分。

**直接级联证据（比取值推断强）**：把 `data-settling="on"` 手动加回去（不滚动、静置 60ms）→ 6 块板的 `animation-name` 立刻变 `settle`，`window.__WIN` 给出的赢家 = **`.iso-plane[data-settling="on"] .plate` (0,3,0) @BASE `settle`**（idx 105），第 2 候选 = **`.plate` (0,1,0) @(max-width:1023px) `none`**（idx 120）→ 属性在时窄屏 `animation:none` 必输，属性不在时才赢。机制与它一字不差。

**一处口径厘清（不影响结论）**：它写"载入后 1.34 s 内"。实测摘除时刻是 `perfNow 1827.3 / 2024.6`，即 `load` 后约 1.3–1.6s —— 因为 1340ms 的 `setTimeout` 是从内联脚本执行时开始计，而不是从导航开始。窗口存在、结论不变，但"1.34s"这个绝对时刻在不同档位会漂 200–300ms，写报告时别当成硬边界。

### 2.10 CA-10 ｜ S08 `.plate` 的 `position` ｜ **对**

390 与 768 档 6 个 `.plate` 的 computed `position` **全部 = `relative`**（1024 档才是 `absolute`，不在本条档位范围）。→ 它说"L281 的 `position:static` 是死声明、净结果与意图一致、无可见差异"逐项成立；本条它自己声明"预测无可测差异"，实测确认（它列为缺陷的理由只是"同一类级联死角的样本"）。

## §3 漏报复核

（待填）

## §4 这 10 条之外、我实测发现的新缺陷

（待填）

## §5 我对这次对账本身的限制

（待填）
