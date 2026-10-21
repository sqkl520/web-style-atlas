# CSS 级联与声明顺序分析（唯一焦点：媒体查询意图被压掉）

**分析角色**：CSS 级联与声明顺序分析师（只看源码推导，不看渲染结果）
**工作目录**：`D:\Web\style`
**冻结修订**：见本文末 §修订快照（35 个 `style.css` 的 sha256 前 12 位 + mtime；git HEAD `a844e48`，git status 有 41 项未提交改动）

> **重要前提（并发写入）**：`prototypes/S21-interlocking-release-book/style.css` 在本次分析过程中被**其他写入者改过**（mtime 2026-10-21 21:20:19，我的首次读取在其之前）。S21 不在下面任何一条结论的范围内；但我据此把全部结论重跑了一遍（见 §修订快照），并对 5797 条规则做了行号校验（**不匹配 0 条**）。若对账在 21:49 之后进行，请以附录里的 sha256 为准。

---

## 0 一句话结论

在被测的 35 个样式表（6360 条规则 / 18127 条声明 / 1466 条带宽度区间的媒体查询规则）里，**还有 10 处媒体查询意图确实被压掉**，其中 **1 处阻断级**（S13 首屏双栏在 390／768 档不折单栏）。已修复的 S07／S12／S13-图版／S21-caption／S25-caption **本次复核确认已修**，另外我还查出 **S12 的 `.states` 与 `.plates` 是同一处漏改的两个实例，两个都已被 `ul.` 前缀修好**（详见 §3.4）。

---

## 1 逐条缺陷

### CA-01｜阻断｜S13 首屏两栏的窄屏单列意图被"写在所有媒体查询之后"的基础规则整条压掉
- **文件与行号**：`prototypes/S13-blind-debossed-dispatch/style.css` **L662**（在 `@media (max-width:1023px)`，该块起于 L646、止于 L669） **vs L681**（在任何媒体查询之外，且在 L662 与 L671 的 `@media (max-width:640px)` 块**之后**）
- **冲突的选择器对**：
  - A = L662 `.letterhead__top { grid-template-columns: 1fr; gap: 24px; align-items: start; }`，特异性 **(0,1,0)**，条件 `≤1023px`
  - B = L681 `.letterhead__top { display:grid; grid-template-columns: minmax(0,7fr) minmax(0,9fr); gap:40px; align-items:end; }`，特异性 **(0,1,0)**，**无媒体查询**，源序在 A 之后
- **我的推导**：特异性相同 → **源序取胜** → B 赢。A 的三条声明（`grid-template-columns` / `gap` / `align-items`）在 390 与 768 档**全部从未生效**。这是 S13 已修那条（`.plates__grid`）的**同文件同型第二处，未被修**：同文件 L755 的注释写了修法「在文件最末尾用同样的特异性、同样的选择器重新断言一次」，作者只对 `.plates__grid` 做了（L760–765），`.letterhead__top` 漏了。
- **可证伪形态**：若我的推导正确，**390 与 768 档** 唯一那个 `div.letterhead__top` 的 computed `grid-template-columns` 应为**两个轨道**（`minmax(0, 7fr) minmax(0, 9fr)`，即左栏标题、右栏翻拍件**左右并排**），`gap` = `40px`，`align-items` = `end`；768 档两栏宽约 **297.5px / 382.5px**，390 档约 **132px / 170px**（版心 768−48=720、390−48=342，减去 40px 栏沟后按 7:9 分）。**若实测是单列**（`grid-template-columns` 只有一个轨道 / h1 块与右栏图上下堆叠 / `gap` 为 `24px`），则我错了。
- **影响**：390 与 768 两档。390 档 h1 所在栏只剩约 **132px**（约 7–9 个汉字宽），标题必然折成多行 —— 会连带撞 `_CONTRACT.md` §6 的「标题不得超 2 行」；768 档本该单列的抬头区仍是双栏。
- **建议怎么修**：与同文件既有修法一致 —— 在**文件最末尾**追加一次同选择器同特异性的重断言：`@media (max-width:1023px){ .letterhead__top{grid-template-columns:1fr;gap:24px;align-items:start} }`。不要动 L681 的基础规则（1440 档要用它）。
- **我的置信度**：**95 %**（`@media` 块边界、选择器文本、特异性、源序四项都在当前文件里逐行核对过）

---

### CA-02｜明显｜S18 悬挂挂牌的窄屏 `left:auto` 被 `.hangrail .hang` 的特异性压掉 → 牌子贴到挂轨左缘、压在正文上
- **文件与行号**：`prototypes/S18-phosphor-service-deck/style.css` **L122**（基础） **vs L330**（`@media (min-width:768px) and (max-width:1023px)`，块起于 **L316**）与 **L365**（`@media (max-width:767px)`，块起于 **L351**）。挂轨本身的两条在这两块的 **L329**（`inset:0 44px 0 4%`）与 **L364**（`inset:0 52px 0 4%`）
- **冲突的选择器对**：
  - A = L330 `.hang { display:block; width:32px; **left:auto**; right:0; top:calc(var(--at,0)*var(--line) + var(--line) + 4px); }`，特异性 **(0,1,0)**；L365 同形（`width:20px`）
  - B = L122 `.hangrail .hang { position:absolute; **left:0**; top:calc(var(--at,0)*var(--line) + var(--line) + 2px); }`，特异性 **(0,2,0)**，无媒体查询
  - 命中元素：`.hangrail .hang` **4 个**（另有 1 个 `.hang` 在 `.mast__hang` 里，`position:relative`，`left/right` 不参与布局，不受影响）
- **我的推导**：`left` 上 B **(0,2,0)** > A **(0,1,0)**，**与媒体查询先后无关** → `left:0` 生效，A 的 `left:auto` 从未生效。而 `right:0` 只有 A 声明 → 生效。绝对定位元素同时有 `left:0` 与 `right:0` 且 `width` 非 auto → **过约束**，CSS 2.1 §10.3.7 规定 LTR 下**丢弃 `right`** → 牌子落在挂轨**左缘**（挂轨自身在 L329 `inset:0 44px 0 4%` / L364 `inset:0 52px 0 4%`，即右缘距其包含块右界 44px／52px）。作者在 L320 与 L333–334 写明意图是「按 `--at` 挂在对应回执行的右侧」「挂在对应行尾下方 4px」。`top` 也差 2px（实际用 B 的 `+2px`，意图 `+4px`），可忽略。
- **可证伪形态**：若我的推导正确，**390 与 768 档** 那 4 个 `div.hang` 的 computed `left` = **`0px`**、computed `right` = **`0px`**（两个都非 auto 就足以判定"过约束、右边被丢弃"），且它们的 `getBoundingClientRect().left` ≈ **挂轨左缘 = 挂轨包含块宽度 × 4 %**（粗算：390 档约 15px 量级、牌宽 20px；768 档约 30px 量级、牌宽 32px），也就是**压在正文左栏的字上**；牌子右边缘不应接近"包含块右界 − 52px／− 44px"。**若实测这 4 个牌落在挂轨右缘**（390 档 x≈310–340 量级），则我错了。
- **影响**：390 与 768 两档，4 个回执牌；`pointer-events:none` 不挡交互，但视觉上 4 个牛皮小牌叠在正文左缘。
- **建议怎么修**：把 L330／L365 的选择器改成 `.hangrail .hang`（或写成 `.hangrail .hang` 与 `.hang` 两条），即可同特异性后序取胜；或在文件末尾对 `.hangrail .hang` 重断言 `left:auto;right:0`。
- **我的置信度**：**88 %**

---

### CA-03｜明显｜S28 主墙 `.blk__frame` 的窄屏 `min-height:0` / `aspect-ratio:16 / 10` 被基础规则压掉 → 窄屏每块图框仍钉 300px 高
- **文件与行号**：`prototypes/S28-jazz-intaglio-wall/style.css` **L564**（`@media (max-width:767px)` 内） **vs L236**（基础）
- **冲突的选择器对**：
  - A = L564 `.blk__frame { margin-top: calc(var(--mis) - var(--bleed)); **aspect-ratio: 16 / 10; min-height: 0**; }`，特异性 **(0,1,0)**，`≤767px`
  - B = L236 `.wall .blk__frame { flex:1 1 auto; **aspect-ratio: auto; min-height: 300px**; }`，特异性 **(0,2,0)**，无媒体查询
  - 命中元素：`.wall .blk__frame` **6 个**（全站 `.blk__frame` 共 15 个，另 3 个在 `.head__wall` 下不受这条影响）
- **我的推导**：`aspect-ratio` 与 `min-height` 上 B **(0,2,0)** 胜 → 窄屏档的「16 / 10 比例、不限最低高」两条意图**都死**。窄屏 `.blk` 已改 `display:block`（L562），B 的 `flex:*` 在块容器里失效，但 `min-height:300px` 照旧生效。
- **可证伪形态**：若我的推导正确，**390 档** 6 个 `.wall .blk__frame` 的 computed `min-height` = **`300px`**、computed `aspect-ratio` = **`auto`**，`offsetHeight` ≥ **300px**。**若实测约 220–230px**（= 内容宽约 358px × 10/16）**或 min-height 为 0**，则我错了。
- **影响**：390 档每块图框多约 **70–80px**，6 块合计约 **+450px** 页高（`.head__wall` 下那 3 个不受影响，所以不是 12 处）。
- **建议怎么修**：把 L564 的选择器提到与基础同级特异性即可：`.wall .blk__frame{aspect-ratio:16 / 10;min-height:0}`；或在末尾对 `.wall .blk__frame` 重断言。
- **我的置信度**：**82 %**（`.wall` 与 `.blk__frame` 的祖先关系我用 DOM 树核对过，是 6 个；剩下 18 % 留给"`min-height:300px` 恰好也是作者窄屏想要的"这种可能）

---

### CA-04｜明显｜S23 图版 `grid-column:auto` 在 768 档只对第 6 张生效，1–5 张仍是通栏
- **文件与行号**：`prototypes/S23-exposed-plaster-chronology-wall/style.css` **L427**（`@media (max-width:1439px)` 内，块起于 L417、止于 L429） **vs 基础 L372 / L373**
- **冲突的选择器对**：
  - A = L427 `.plate-i, .plate-i:nth-child(6) { grid-column: auto; }` —— 其中 `.plate-i` 分支特异性 **(0,1,0)**
  - B1 = L372 `.plate-i:nth-child(-n+3) { grid-column: span 2; }`，**(0,2,0)**，无媒体查询
  - B2 = L373 `.plate-i:nth-child(4), .plate-i:nth-child(5) { grid-column: span 3; }`，**(0,2,0)**，无媒体查询
  - （第 6 张在 L427 里的分支是 **(0,2,0)** 且源序更后 → 只有它拿到 `auto`）
  - 同行还有 L426 `.plates { grid-template-columns: 1fr 1fr; }`（`≤1439px`），L476 `.plates{grid-template-columns:1fr}`（`≤767px`）
- **我的推导**：`grid-column` 上 A 的 `.plate-i` 分支 (0,1,0) < B1/B2 的 (0,2,0) → **1–5 张保留 `span 2` / `span 3`**。768 档 `.plates` 是 **2 列**且 L476（`1fr`）不生效（它只在 ≤767），于是 `span 2` 与 `span 3` 都被钳到 2 列 = **通栏**；只有第 6 张是 `auto` = **半栏**。
- **可证伪形态**：若我的推导正确，**768 档** 第 1 个 `li.plate-i` 的 computed `grid-column` 应为 **`span 2 / auto`**（`offsetWidth` ≈ `.plates` 内容宽 ≈ 整版心宽），而第 6 个 `li.plate-i` 的 `offsetWidth` ≈ **版心宽的一半**。**若第 1 张实测约半宽（与第 6 张等宽）**，则我错了。
- **影响**：768 档（以及 768–1439 区间里所有 >767 的宽度，含实测可能用到的 900/1024/1280）。390 档看不到差异（`.plates` 已变单列，`span 2` 也钳成 1 列）。
- **建议怎么修**：L427 改成全覆盖写法，例如 `.plate-i, .plate-i:nth-child(n) { grid-column: auto; }`，或把 B1/B2 也一起列进 L427 的选择器表（`.plate-i:nth-child(-n+3), .plate-i:nth-child(n+4)` …）。
- **我的置信度**：**78 %**

---

### CA-05｜明显｜S15 窄屏"墨重阶梯"被同块里特异性更高的 `.plate use` 压成一个值 1.36px
- **文件与行号**：`prototypes/S15-fishery-floor-ledger/style.css` **L442 / L443 / L444**（`@media (max-width:1023px)` 内） **vs L441**（同一媒体块，且源序更前）
- **冲突的选择器对**：
  - A（我判为意图）= L442 `.ink--frame, .ink--c3 { stroke-width: 2px; }`、L443 `.ink--c2 { stroke-width: 1.7px; }`、L444 `.ink--c1 { stroke-width: 1.4px; }`，各 **（0,1,0）**，`≤1023px`
  - B = L441 `.plate use { stroke-width: calc(0.8px * 1.7); }`，**（0,1,1）**，同一媒体块
  - 命中元素：`.plate use` 21 个，其中 `.ink--frame` 6、`.ink--c3` 1、`.ink--c2` 1、`.ink--c1` 1 共 **9 个**同时被 A 与 B 命中
- **我的推导**：`stroke-width` 上 B **(0,1,1)** > A **(0,1,0)** → **1.36px** 覆盖全部 9 个；L442/443/444 的三档阶梯（2 / 1.7 / 1.4）**一条都没生效**。作者把类阶梯写在通用规则**之后**，但通用规则特异性更高 —— 顺序救不了特异性。
- **可证伪形态**：若我的推导正确，**390 与 768 档** 任一 `<use class="ink ink--frame">`（或 `.ink--c1/.ink--c2/.ink--c3`）的 computed `stroke-width` 应为 **`1.36px`**（= 0.8 × 1.7）。**若实测 2px / 1.7px / 1.4px（即三条各自生效）**，则我错了。
- **影响**：390 与 768 档，9 个 SVG 线稿元素；窄屏"按墨色分档加铅"的意图整体丢失（`.hot .edge` 的 1.4px 是另一条 L439、特异性 (0,2,0)，不受影响）。
- **建议怎么修**：把 L441 挪到 L444 **之后**，或提高类阶梯的特异性（`.plate use.ink--frame{…}` / `.plate use.ink--c1{…}`）。
- **我的置信度**：**80 %**

---

### CA-06｜明显｜S26 页脚标题永远拿不到 22px（也不拿 17px）：同一条声明在基础档与窄档被 `.foot p` 压两次
- **文件与行号**：`prototypes/S26-geometric-collision-columns/style.css` **L297**（`@media (max-width:1023px)`，块起于 L287） **vs L271**（基础）；**同一处缺陷还包含 L268**（基础 `.foot__t{font-size:22px}`，同样被 L271 压掉）
- **冲突的选择器对**：
  - A = L297 `.err__t, .knock__t, .empty__t, **.foot__t** { font-size: 17px; }`，**(0,1,0)**，`≤1023px`
  - A′ = L268 `.foot__t { font-family: var(--display); font-size: 22px; font-weight: 700; }`，**(0,1,0)**，基础
  - B = L271 `.foot p { font-size: 15px; line-height: 1.8; }`，**(0,1,1)**，基础
  - 命中元素：`p.foot__t` **3 个**（`.foot p` 共命中 7 个，其中 3 个是 `p.foot__t`）
- **我的推导**：`font-size` 上 B **(0,1,1)** 同时吃掉 A′（基础声明）与 A（窄档声明）→ **`p.foot__t` 在 390 / 768 / 1440 三档都是 15px**。也就是说这一组选择器列表里，`.err__t` / `.knock__t` / `.empty__t` 在窄档确实变成 17px，唯独 `.foot__t` 不动 —— 而且它在宽档也没有 22px 的"页脚小节标题"体量。
- **可证伪形态**：若我的推导正确，**390 / 768 / 1440 三档**，3 个 `p.foot__t` 的 computed `font-size` 全部 = **`15px`**（且 `font-family` 仍是 `var(--display)` 解析出的展示字族，只有字号被压）。**若 390 档实测 17px、或 1440 档实测 22px**，则我错了。
- **影响**：390 与 768 档（窄屏意图丢失），以及**全档**（基础意图丢失）—— 页脚三栏小节标题与正文同号，层级只剩字重 700 撑着。
- **建议怎么修**：把 L271 的选择器收窄（例如改成 `.foot :is(p,li,dd):not(.foot__t)`，或直接删掉 `.foot__t` 与 `.foot p` 的重叠），并把 L297 的 `.foot__t` 提成 `.foot p.foot__t`。
- **我的置信度**：**85 %**

---

### CA-07｜轻微｜S23 第 8 处剥落（`#f8`）的窄屏 padding 被 ID 规则压掉，与其余 8 处不一致
- **文件与行号**：`prototypes/S23-exposed-plaster-chronology-wall/style.css` **L466**（`@media (max-width:767px)`，块起于 L463） **vs L257**（基础）
- **冲突的选择器对**：
  - A = L466 `.flake { grid-column:auto; grid-row:auto; width:100%; **padding: 16px calc(var(--pw,16px) + 16px) 44px 16px**; }`，**(0,1,0)**，`≤767px`
  - B = L257 `#f8 { … ; padding: 8px calc(10px + 8px) 40px 8px; … }`，**(1,0,0)**，基础
  - （`#f1`…`#f6` 没有 padding 声明，所以只有 `#f8` 受影响；`#f9` 由同块的 L471 `#f9{padding:12px}` 接管）
- **我的推导**：`padding` 上 B 的 **ID (1,0,0)** 高于 A 的类 **(0,1,0)** → `#f8` 保留 8/18/40/8，而 `#f1`–`#f7` 是 16/…/44/16。
- **可证伪形态**：若我的推导正确，**390 档** `#f8.flake` 的 computed `padding-left` = **`8px`**、`padding-bottom` = **`40px`**，而同屏 `#f1` 是 **`16px` / `44px`**。**若 `#f8` 实测也是 16px/44px**，则我错了。
- **影响**：390 档一处剥落块的留白与其余 8 处不一致（左少 8px、下少 4px）。视觉后果很小。
- **同一条规则里另外两条声明（`grid-column:auto` / `grid-row:auto`）也全被 `#f1`–`#f9` 的 ID 压掉，但 ≤767 档父级 `.wall` 已改为 `display:flex`（L465），grid 定位属性在 flex 容器里不参与布局 → 这部分我判定"**无渲染后果**"，不计为缺陷。**
- **建议怎么修**：把 `#f8`/`#f9` 的留白改成走变量（`--pad-x/--pad-b`），或在 ≤767 块里用 `#f1,#f2,…,#f9` 显式重断言 `padding`。
- **我的置信度**：**85 %**

---

### CA-08｜轻微｜S11 规格表折成块后，tfoot 单元仍被基础规则钉 40px 固定高
- **文件与行号**：`prototypes/S11-samizdat-typewriter/style.css` **L584**（`@media (max-width:767px)` 内） **vs L421**（基础）
- **冲突的选择器对**：
  - A = L584 `.spec td { border:0; **height:auto**; padding:1px 0; }`，**(0,1,1)**，`≤767px`（同块 L581 已把 `.spec, .spec thead, …, .spec td, .spec tfoot` 全改成 `display:block`）
  - B = L421 `.spec tfoot td { border-top:3px solid var(--copy); border-bottom:0; font-weight:700; **height:40px**; }`，**(0,1,2)**，基础
  - 命中元素：`.spec tfoot td` **2 个**
- **我的推导**：`height` 上 B **(0,1,2)** > A **(0,1,1)** → tfoot 的两个单元保留 `height:40px`，而 tbody 的 `td` 拿到 `height:auto`。
- **可证伪形态**：若我的推导正确，**390 档** `.spec tfoot td` 的 computed `height` = **`40px`**、`offsetHeight` = **40px**，而 `.spec tbody td` 的 `height` 为 `auto`。**若 tfoot 单元实测随内容自适应**（≠40px），则我错了。
- **影响**：390 档 2 个单元。**我必须声明：同块 L594 `.spec tfoot td{border-top:0;padding:6px 0}` 把内容高推到 28px，加上上下各 6px padding 恰好 40px —— 所以这里我预测"无可测差异"**，列出来是因为它是同一类级联死角，且一旦 tfoot 文案变长就会立刻表现为高度截断。
- **建议怎么修**：L584 拆成 `.spec td, .spec tfoot td { height:auto; }`，或在 L594 里补 `height:auto`。
- **我的置信度**：**62 %**（对"B 赢、A 死"我有 95 %；对"这会造成可见差异"我只有 ~30 %，所以整体压到 62 %）

---

### CA-09｜轻微｜S08 窄屏 `animation:none` 被状态选择器 `[data-settling="on"]` 压掉（只影响载入后 1.34s 内）
- **文件与行号**：`prototypes/S08-amber-overprint-lightbox/style.css` **L281**（`@media (max-width:1023px)`，块起于 L277） **vs L257**（基础）
- **冲突的选择器对**：
  - A = L281 `.plate { position:static; width:auto; height:54px; margin:0 0 var(--thick); transform:none; **animation:none**; }`，**(0,1,0)**，`≤1023px`
  - B = L257 `.iso-plane[data-settling="on"] .plate { animation: settle 180ms cubic-bezier(.2,.9,.25,1) both; animation-delay: calc((5 - var(--l)) * var(--stagger,180ms)); }`，**(0,3,0)**，无媒体查询
  - 命中元素：6 个 `.plate`（其祖先 `.iso-plane` 满足该属性）
- **我的推导**：`animation` 上 B **(0,3,0)** > A **(0,1,0)** → 窄档的 `animation:none` 死。`index.html` L53 就是 `<div class="iso-plane" data-settling="on" id="plane">`，`index.html` L297 的 `setTimeout(…, 180*6+260)` = **1340 ms** 后才 `removeAttribute('data-settling')`。于是载入后首 1.34 s 内，6 块板在窄档仍播 `settle` 关键帧（含 `rotateX(60deg) rotateZ(45deg)` 的 3D 落位），与 L282/L283 的 `transform:none; animation:none` 意图相反。
- **可证伪形态**：若我的推导正确，**390 或 768 档、页面载入后 1.34 s 之内**，`.plate` 的 computed `animation-name` = **`settle`**、computed `transform` = 含 `rotateX(60deg) rotateZ(45deg)` 的矩阵；**载入后 1.34 s 之后**，`animation-name` = **`none`**（属性已被摘除）。**若在载入后 0.5 s 截图就已经是 `animation-name: none`，则我错了。** 两种时序我都能解释，所以请对账角色明确记下截图时刻。
- **影响**：只在首 1.34 s 内可见；若测量在 load 之后等够了时间再截图，本条对任何测量值都无影响。
- **建议怎么修**：在 ≤1023 块里也写 `.iso-plane[data-settling="on"] .plate{animation:none}`（同特异性、更后序即胜），或把 L257 的特异性用 `:where(.iso-plane[data-settling="on"]) .plate` 降下来。
- **我的置信度**：**55 %**（「L281 的 `animation:none` 被压掉」= 90 %；「这构成可见缺陷」= 55 %，取决于截图时刻）

---

### CA-10｜轻微｜S08 同一媒体块内 `.plate{position:static}` 被 5 行后的 `.plate{position:relative}` 覆盖（死声明）
- **文件与行号**：`prototypes/S08-amber-overprint-lightbox/style.css` **L281 vs L286**，两条都在同一个 `@media (max-width:1023px)` 块（L277–L291）内
- **冲突的选择器对**：两条都是 `.plate`，特异性同为 **(0,1,0)**；L286 `.plate{position:relative}` 源序更后 → 胜
- **我的推导**：`position` 上 L281 的 `static` **从未生效**；实际值是 `relative`。作者需要 `relative` 来给 L285 的 `.plate-face{position:absolute;inset:0}` 当包含块，所以**净结果与意图一致**，只是留下一条死声明。
- **可证伪形态**：若我的推导正确，**390 与 768 档** `.plate` 的 computed `position` = **`relative`**。**若实测 `static`**，则我错了。
- **影响**：我预测**无可测差异**（这正是"同一属性在同一元素上被 2 条规则争夺、前一条是死声明"的最小样本）。
- **建议怎么修**：把 L281 里的 `position:static` 删掉（`relative` 的默认子项关系不变），或在 L286 前合并两条声明。
- **我的置信度**：**90 %**（对"L281 的 `position:static` 是死声明"）

---

## 2 统计

### 2.1 按严重度

| 严重度 | 条数 | 编号 |
| --- | --- | --- |
| 阻断 | **1** | CA-01 |
| 明显 | **5** | CA-02、CA-03、CA-04、CA-05、CA-06 |
| 轻微 | **4** | CA-07、CA-08、CA-09、CA-10 |
| **合计** | **10** | |

### 2.2 按冲突类型

| 冲突类型 | 条数 | 编号 |
| --- | --- | --- |
| **特异性压制**（含 ID 压类、后代选择器压单类、状态选择器压媒体规则） | **8** | CA-02、CA-03、CA-04、CA-05、CA-06、CA-07、CA-08、CA-09 |
| **源序压制**（同特异性、后序取胜；含"基础规则写在所有媒体查询之后"与"同块内后一行覆盖前一行"） | **2** | CA-01（媒体查询之前的基础规则在文件末尾重设）、CA-10（同块内后序） |
| 区间空档（641–1023 之类落空） | **0** | 见 §3.2 区间空档条目，逐档探针 0 命中 |
| 同名类命中不该命中的元素 | **0** | 见 §3.2 同名类条目 + §3.4，S12 两处已修 |
| 漏写受影响的子元素（caption/伪元素一类） | **0** | 见 §3.2 漏写条目 + §3.5 的 S21/S25/S14 三行 |
| 边界 1px 空洞（`max-width:767` 与 `min-width:769` 这类不相邻配对） | **0** | 见 §3.2 边界像素洞条目 |
| **合计** | **10** | |

### 2.3 逐条列出的可证伪形态（给对账角色的最小清单）

| 编号 | 档位 | 元素 | 我预测的值 | 若实测是这个值 → 我错 |
| --- | --- | --- | --- | --- |
| CA-01 | 390 & 768 | `div.letterhead__top` | `grid-template-columns` 两轨道 `minmax(0,7fr) minmax(0,9fr)`；`gap:40px`；`align-items:end` | 单轨道 / 上下堆叠 / `gap:24px` |
| CA-02 | 390 & 768 | 4 个 `.hangrail .hang` | computed `left:0px` 且 `right:0px`（过约束 → 右边被丢）；牌在挂轨**左缘**（390 档 x≈15px 量级、牌宽 20px） | 牌在挂轨右缘（390 档 x≈310–340 量级） |
| CA-03 | 390 | 6 个 `.wall .blk__frame` | `min-height:300px`、`aspect-ratio:auto`、`offsetHeight ≥ 300` | `offsetHeight ≈ 220–230` 或 `min-height:0` |
| CA-04 | 768 | `li.plate-i` 第 1 个 vs 第 6 个 | 第 1 个 `grid-column:span 2 / auto`（通栏）；第 6 个半栏 | 第 1 个与第 6 个等宽（都半栏） |
| CA-05 | 390 & 768 | `.plate use.ink--frame`（及 `--c1/--c2/--c3`） | `stroke-width:1.36px` | 2px / 1.7px / 1.4px |
| CA-06 | 390、768、1440 | 3 个 `p.foot__t` | `font-size:15px`（三档都一样） | 390 档 17px，或 1440 档 22px |
| CA-07 | 390 | `#f8.flake` vs `#f1.flake` | `#f8` 为 `8px` / `40px`；`#f1` 为 `16px` / `44px` | `#f8` 也是 16px / 44px |
| CA-08 | 390 | `.spec tfoot td` | computed `height:40px` | 随内容自适应 ≠ 40px |
| CA-09 | 390 & 768 | `.plate` 在载入后 <1.34s / >1.34s | <1.34s `animation-name:settle`；>1.34s `none` | 0.5s 时就已是 `none` |
| CA-10 | 390 & 768 | `.plate` | computed `position:relative` | `static` |

---

## 3 我扫描的方法（可复算）

### 3.1 工具链（全部写在 `_crit2/`，未改动任何原型／模板／脚本／README）

| 文件 | 作用 |
| --- | --- |
| `_crit2/csslib.py` | CSS 块树解析（含注释剥离且**保持行号**）、特异性计算（含 `:is/:where/:not/:has/:nth-*`）、媒体条件 → 宽度区间、`!important` 识别、媒体条件"默认是否成立"判定 |
| `_crit2/dom.py` | 极简 HTML DOM 构建 + 选择器匹配器（后代/子/兄弟组合子、属性选择器、`:nth-child(An+B)`、`:not/:is/:has`、伪元素分箱）。用来回答"这两条规则**能不能命中同一个盒子**" |
| `_crit2/scan.py` | 遍历 35 个样式表，抽出规则 + 媒体链 + 行号 |
| `_crit2/conflict.py` | 成对冲突探测（A/B 两两比对）+ 区间空档 + 同名类 + 漏写子元素 + 3 条以上争夺者 |
| `_crit2/cascade.py` | **精确求解器**：在某个具体视口宽度 W 上，只让媒体区间包含 W 的规则参与，对每个（元素, 伪元素盒子, 属性）三元组按 **`!important` > 对命中该元素的最具体子选择器特异性 > 源序** 解出真正的赢家，再把"在宽度媒体查询里、但不是赢家"的声明记下来 |
| `_crit2/rank4.py` / `report.py` / `stats.py` / `verify_lines.py` / `rev.py` / `probe*.py` | 分组、按机制分层（基础规则在媒体之后 / 基础规则在前 / 同媒体块 / 跨媒体块）、覆盖率与哈希快照 |

### 3.2 数字（冻结修订）

- 扫描文件：**35**（30 个 `prototypes/Sxx-*/style.css` + 3 个 `templates/M0x/style.css` + `_selection/style.css` + `_selection/wizard.css`）
- 规则总数：**6360**；声明总数：**18127**
- 落在 `@media` 里且带媒体条件串的规则：**1480**；其中解析出**宽度区间**的：**1466**
- 互不相同的媒体条件串：**126**
- 出现的宽度断点边（升序，去重）：420 430 480 519 520 560 599 600 620 639 640 641 719 767 768 819 820 880 899 900 980 981 1000 1023 1024 1180 1199 1200 1279 1280 1439 1440
- 被**排除**在"默认屏幕状态"之外的媒体块：`prefers-reduced-motion:reduce` **218 条规则**、`print` **24 条**、`forced-colors:active` **6 条**、`prefers-contrast:more` **3 条**（合计 251 条）。这些不计入任何结论（理由见 §3.6）
- 逐视口求解探针宽度：**19 个**（320 390 480 600 640 641 700 767 768 900 1000 1023 1024 1100 1279 1280 1439 1440 1600）
- 求出的"媒体规则在某个宽度上不是赢家"的记录：**1251 条**（按（文件, 失败规则, 属性, 成功规则, 伪元素）归并后 **263 组**）
- 其中"失败者区间被赢家区间**完全覆盖**、且覆盖到 390/768/1440 中至少一档"的：**96 组**
- 96 组里我判为缺陷的：**31 组 → 合并成 10 条**；其余 **65 组**逐组人工核对后判为「同媒体块内按变体细化」或「已被本文件更后面的重断言覆盖」，不计为缺陷（§4 给了排除理由与代表样本）
- 区间空档：对 35 个文件各用 30 个探针宽度（320…1920）查"该宽度没有任何媒体区间覆盖"，只有如下命中，且**全部是设计使然**：21 个文件只在 1440/1280 以上无查询（顶端档就是 1440）、`M01`（320–540）、`M03`（320–767）为 **mobile-first**（基础档即窄屏）、`M02`（1023–1920）为 desktop-first 且 320–1023 全覆盖、`_selection/wizard.css` 只有 `≤640`。→ **区间空档型缺陷 0 条。**
- 边界像素洞：逐文件比对 `max-width` 与 `min-width` 的取值集合，**没有任何一对差 ≥2px**（全部是 767/768、639/640/641、819/820、899/900、1023/1024、1199/1200、1279/1280、1439/1440、519/520、980/981 这种相邻配对）→ **1px 空洞 0 处。**
- 同名类（一个类名出现在 ≥2 种标签上）：**43** 处；其中同时存在"裸类布局规则"和"带标签同类规则"的只有 **1** 处（`S11 .num` 同时在 `td`/`th` 上，纯工具类，无布局后果）；S12 的 `.plates`/`.states` 现在都用 `ul.` 限定了标签（`probe7.py`：`ul.plates` 1 个、`section.plates` 1 个且无裸 `.plates` 布局规则）→ **同名类型缺陷 0 条。**
- 3 条以上规则争夺同一属性 + 同一类签名 + 同一官方视口：**276 组**。抽查最多的 20 组（`S01` 的 `height`/`margin`/`display` 阶梯等）全是**按档位阶梯重设同一属性**的正常写法；真正产生"死声明"的那 9 组已经全部收进上面 10 条里。
- **行号校验**：对 34 个原型样式表（`S01`…`S30`）的 **5797** 条规则，逐条用"解析出的行号去取原始文件那一行、检查是否含选择器首 token"验证 → **不匹配 0 条**。所有上报行号都是 `grep`／逐行打印核对过的真行号，没有估算。

### 3.3 为了"不误报"我改掉的四个建模错误（这些是本次最容易出错的地方，列出来供复核）

1. **选择器表内取最具体的那一条**：一个规则的选择器列表里，对某个元素生效的特异性应当是**列表中命中该元素的最具体子选择器**，不是列表的最大值、也不是某个子选择器。修正前我误报过 S07 已修的 `.toc`（L176 是 `.toc,.page-recto .toc,.page-verso .toc`，`.toc` 那一支确实被 L157 压住，但同列表中 `.page-recto .toc` 那支以 (0,2,0) 与 L157 打平、靠源序取胜）。
2. **`@media print` 不是屏幕规则**：修正前把 `@media print` 当"无条件生效"，误报过 S06 `.river{column-count:1}`（≤767）被 L426 `@media print{.river{column-count:2}}` 压掉。
3. **`(prefers-reduced-motion:reduce)` / `(forced-colors:active)` / `(prefers-contrast:more)` 在默认截图环境里不成立**：修正前把它们当无条件生效，误报了一批；现在这 251 条规则整体排除。
4. **`!important` 优先于特异性与源序**：修正前误报过 S10 L536 `.grid-table col{width:auto !important}` 与 S16 L475 `.slab{grid-column:1 !important}` 被压掉 —— 这两条其实是**作者用 `!important` 正确保住了媒体查询意图**。另有一条 **INTERACTIVE 伪类过滤**：`:hover/:focus/:active/:focus-visible/:focus-within/:target/:visited` 这类只在交互态成立的选择器不参与"默认渲染"的赢家判定（否则 `.toc li a:hover .d` 会被误判为压掉了 ≤899 的 `.d{background-image:none}`）。

### 3.4 已修复实例的复核结论（本次不重复上报）

| 已知实例 | 当前状态 | 证据 |
| --- | --- | --- |
| S07 ≤899 目录列数被 `.page-recto .toc` (0,2,0) 压掉 | **已修** | L176 已是 `.toc,.page-recto .toc,.page-verso .toc{column-count:1}`（同列表内 (0,2,0) 那支与 L157 打平、源序取胜）。L169–175 保留了事故记录注释 |
| S13 `.plates__grid` 基础规则写在媒体查询之后 | **已修** | L718 基础 `repeat(4,…)` 之后，L760–762 追加 `@media (max-width:640px){.plates__grid{minmax(0,1fr)}}`、L763–765 追加 `@media (min-width:1024px) and (max-width:1439px){repeat(2,…)}`。L677 那条 `1fr` 变成死声明（净结果正确） |
| S12 `<section class="plates">` 与 `<ul class="plates">` 同名类 | **已修，且 `.states` 同样修好了** | `probe7.py`：全文只剩 `ul.plates{display:grid;repeat(auto-fit,minmax(248px,1fr))}`（L345）与 `ul.states{…272px…}`（L352），裸 `.plates`/`.states` 布局规则为 0；DOM 里 `section.plates` 1 个、`ul.plates` 1 个，section 不再被变栅格 |
| S21 `display:block` 漏写 `caption` | **已修** | L872–882 的选择器列表含 `.ill-table caption`（L878），列表末尾注释还写明了事故尺寸 |
| S25 同源漏写 `caption` | **已修** | L306 `.check caption{display:block;width:100%;text-align:start}` |
| S03 阶梯内缩写在所有媒体查询之外 | **已修** | 本次在 S03 上未检出同类残留 |
| **S13 `.letterhead__top`（同文件、同型、未修）** | **未修** | → 见 CA-01 |

### 3.5 我判定为"有意设计／无渲染后果"，因而不上报的代表样本（共 65 组，此处列 12 组）

| 文件与行号 | 为什么不算缺陷 |
| --- | --- |
| `S10 L536 .grid-table col` ← L221–225 `.grid-table col.c1~c5` | 失败者带 `!important`，**实际是它赢**（我的求解器已按 `!important` 判定） |
| `S16 L475 .slab{grid-column:1 !important}` ← L452/453 `.slab:nth-of-type(odd/even)` | 同上，`!important` 保住了意图 |
| `S16 L472 .btn{justify-content:flex-start}` ← L473 `.btn-primary{space-between}` | 同块、隔一行、按按钮变体细化，是作者意图（CTA 两端分布、其余左对齐） |
| `S10 L539 .grid-table tbody td, .grid-table tfoot td{display:grid}` ← L545 `.grid-table tfoot td{display:block}` | 同块后序，tfoot 是合计行要 `block`，作者显式覆盖 |
| `S17 L338 .ledger td{padding:1px 12px}` ← L341 `.ledger td.grand-total, .ledger tfoot td{padding:6px 12px}` | 同块后序，专给合计单元加内距 |
| `S21 L872 …{display:block;width:100%}` ← L888 `.ill-table tbody th, .ill-table tbody td[data-label="互斥"]{display:inline-block;width:auto}` | 表格折块后行标签要 `inline-block` 才能与数据同排，同块后序，作者意图 |
| `S25 L309 .check th, .check td{…background:none}` ← L158 `.check thead th{background:var(--spot-a)}` | **无渲染后果**：同档 L301 `.check thead{display:none}`，`thead th` 根本不渲染 |
| `S07 L182 .plate img{max-height:520px}` ← L128 `.plate.narrow img{max-height:320px}` | 320 < 520，两者不冲突：`.plate.narrow` 是"本来就窄的图版"，320px 上限就是设计 |
| `S22 L414/L415/L441/L442` 的 `grid-column` ← `…:nth-child(2n)` / `:nth-child(2)` / `:nth-child(3)` | 同文件按 interleave 变体细化 |
| `S23 L427 .plate-i:nth-child(6)` 分支 | 这一支（(0,2,0) + 更后序）**确实赢了**；死的是同规则里 `.plate-i` 那一支 → 已收进 CA-04 |
| `S14 L341/L342 .field::before/::after` | 改 `display` 的同时把伪元素也重写了（`::before{display:none}`、`::after` 全量重设 6 个属性）→ 不是漏写 |
| `M03 L141 .nav-menu` ← 基础 `.nav-menu.is-open` | L145 `.nav-menu.is-open{flex-direction:row;width:auto;…}` 同块后序补上了，净结果正确 |
| `S04 L196/L216 .anno` ← `.anno--r`、`S06 L400 .today-*` ← `.today-body/.today-note`、`S24 L344 .lv,.lv--mirror` ← `.lv--leaves`、`S30 L464 .tear__glue::before` ← `.tear__glue--thin::before`、`S12 L419/L453` | 全部是**同一媒体块内、隔 1–2 行的变体细化**（`.anno--r` 是右倾批注、`--thin` 是薄胶条、`--leaves` 是叶层），属有意设计 |

### 3.6 为什么我把 print / reduced-motion / forced-colors 块整体排除

对账角色的测量发生在**默认屏幕状态**（无 hover、无 reduced-motion 偏好、非打印、按宽度切视口）。这些媒体块里的规则在该状态下**不参与级联**，把它们算进来会产生纯噪音误报（我的早期版本确实这样误报了 S06）。因此：`print` 24 条、`prefers-reduced-motion:reduce` 218 条、`forced-colors:active` 6 条、`prefers-contrast:more` 3 条，共 251 条规则被排除在外，**没有进入任何一条结论**。若对账角色会在 `prefers-reduced-motion: reduce` 或打印样式下测量，那 251 条需要单独一轮分析 —— 本次没有覆盖。

---

## 4 我知道自己可能推错的地方（诚实清单）

1. **CA-09 的时间性（最不稳的一条）**。`[data-settling="on"]` 只在前 1340 ms 内存在（`index.html` L53 + L297）。如果对账角色在 `load` 之后等待超过 1.34 s 再截图（大多数 `shot.mjs` 一类的工具都会等 `networkidle` + 稳定帧），那么 L281 的 `animation:none` 在**测量时刻是赢家**，我的"被压掉"结论对测量值不成立 —— 级联推导仍然对，但对账会显示"实测一致"，看上去像我推错了。我给这条只有 55 % 置信度就是为了标出这一点。

2. **CA-04 的"档位是否真的走 768–1439 两列"依赖 `.plates` 的 767 边界**。我确认 L476 `.plates{grid-template-columns:1fr}` 在 `@media (max-width:767px)` 里（L463 起），所以只有 **>767** 才看到差异。如果对账角色的"768 档"实际渲染宽度是 **767 或更小**（例如扣掉滚动条、或有 `body` 缩放），那 768 档会退化成单列、我的可证伪形态会自相矛盾（两端都满宽）。请对账角色记下真正的视口内宽。

3. **CA-06 我假设 `p.foot__t` 三个元素都在 `.foot` 内部**。我的求解器是靠"`.foot p` 与 `.foot__t` 命中元素集合的交集非空"推出的（交集 3 个），但我没有逐个打印那 3 个元素在 DOM 里的祖先链去确认它们**都**在 `.foot` 里。若有 1 个在 `.foot` 之外，则只有另外 2 个是 15px，第 3 个可能是 22px —— 那样我的可证伪形态（"三个都是 15px"）会被判错。

4. **CA-08 我预测"无可测差异"**。`height:40px` 与 `padding:6px 0` + 单行 28px 行高恰好凑成 40px，我只有 ~30 % 把握说这真的看不出来。若对账显示 tfoot 单元高度明显不是 40px（例如 `height` 在 `display:block` 上被内容撑开），那说明我对"`height` 在 display:block 的 td 上是否被当作最小值处理"的理解需要修正。

5. **`--` 自定义属性我没有做级联分析**。全部 `--*` 声明在求解器里被跳过（`prop.startswith('--')`）。但本项目大量用自定义属性（`.flake{--pw}`、`.hang{--at}`、`.plate{--thick}`…），**一个被压掉的 `--x` 会通过 `var()` 影响一批下游属性**，而这批下游属性的"赢家"我算的是对的、值却是错的。这是本次覆盖的**已知盲区**：S08 的 `--thick`、S23 的 `--pw`/`--ph`、S15 的 `--trace36` 都在这个盲区里。我没有把它们算成缺陷，因为无法从源码直接推出最终值。

6. **伪类的默认态判断是启发式的**。`dom.py` 把 `:hover/:focus/:active/...` 一律当"可能成立"来匹配（这样"这两条能不能命中同一个盒子"不会漏），然后又用 `INTERACTIVE` 集合把它们从赢家判定里剔除。这个剔除顺序决定了"状态规则能否压掉媒体规则"的答案。若某条规则用的是我没列进 `INTERACTIVE` 的伪类（例如 `:placeholder-shown` 我列了，但 `:autofill`、`:user-valid` 的默认态判断可能有争议），我会漏判或误判。

7. **`!important` 只在同属性同元素上判定，没做 `@layer` 分析**。本项目 35 个样式表里我没有检出 `@layer`（会被当成透明容器直接深入），也没有外部样式表。若实际有 `@layer` 或运行时注入的样式表（`index.html` 里的 `<style>`），那里的声明不参与我的求解。

8. **`S21` 在我分析期间被改写**（21:20:19），我给出的 S21 相关观察（caption 已修、L872/L888 那一对是同块变体细化）基于 21:44 之后的重跑，但 S21 的写者可能还在继续改。**对账时若 S21 行号对不上，请先比对 §修订快照里的 sha256 `21a7d3bc2c63`。**

9. **区间空档结论依赖"探针宽度"的选取**。我用了 19 个探针宽度（最小间隔是 641→700→767、1023→1024），所以理论上存在"宽度 642–699 之间有个 20px 的空洞"这种我看不到的情况。我没有做连续区间代数（把每个文件的所有媒体区间做并集再取补集），只做了逐点采样 —— 这是一个真实的精度上限。

---

## 5 修订快照

```
now       = 2026-10-21 21:49:57 (+08:00)
git HEAD  = a844e48
git dirty = 41 项未提交改动
python    = C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe
```

| 文件 | sha256 前 12 | mtime |
| --- | --- | --- |
| prototypes/S01-red-wedge-broadsheet/style.css | `4afefcea50be` | 2026-10-17 07:13:30 |
| prototypes/S02-gilded-symmetry-salon/style.css | `5346e98ed201` | 2026-10-17 07:19:22 |
| prototypes/S03-long-exposure-observatory/style.css | `dc4dda8d5051` | 2026-10-20 20:15:12 |
| prototypes/S04-mango-collage-wall/style.css | `190980f7c298` | 2026-10-16 00:40:13 |
| prototypes/S05-pixel-cold-storage-console/style.css | `86aa9f65027c` | 2026-10-17 11:39:25 |
| prototypes/S06-showa-kissaten-ledger/style.css | `ba699dc62335` | 2026-10-17 10:04:10 |
| prototypes/S07-slate-ink-contents/style.css | `6106c3014074` | 2026-10-20 19:21:58 |
| prototypes/S08-amber-overprint-lightbox/style.css | `1a4b831f071b` | 2026-10-18 03:43:34 |
| prototypes/S09-batik-price-board/style.css | `7e7345b25060` | 2026-10-17 20:22:25 |
| prototypes/S10-grid-versus-sheet/style.css | `d9127b32c06f` | 2026-10-17 11:24:02 |
| prototypes/S11-samizdat-typewriter/style.css | `2bcfa9b8a5ce` | 2026-10-17 12:43:06 |
| prototypes/S12-lime-knockout-wall/style.css | `01e578d223bf` | 2026-10-21 05:17:32 |
| prototypes/S13-blind-debossed-dispatch/style.css | `169facbe6699` | 2026-10-21 05:35:49 |
| prototypes/S14-zero-g-launch-sequence/style.css | `35c88d4ec9cc` | 2026-10-18 04:12:36 |
| prototypes/S15-fishery-floor-ledger/style.css | `48913b152308` | 2026-10-19 11:40:11 |
| prototypes/S16-velocity-slant-manifesto/style.css | `02cd71e56d7a` | 2026-10-19 09:40:41 |
| prototypes/S17-revenue-stamp-stub/style.css | `00a39a71252f` | 2026-10-16 00:53:22 |
| prototypes/S18-phosphor-service-deck/style.css | `26aa1d623e9e` | 2026-10-19 13:40:28 |
| prototypes/S19-copperplate-herbarium-cabinet/style.css | `ae13d9823736` | 2026-10-21 19:42:35 |
| prototypes/S20-plotter-soundfield/style.css | `f558c4626db1` | 2026-10-19 10:42:57 |
| prototypes/S21-interlocking-release-book/style.css | `21a7d3bc2c63` | **2026-10-21 21:20:19（分析中被改写）** |
| prototypes/S22-paper-screen-folded-sheet/style.css | `3c2ce443f00b` | 2026-10-19 08:48:08 |
| prototypes/S23-exposed-plaster-chronology-wall/style.css | `4026e0acd552` | 2026-10-19 11:55:38 |
| prototypes/S24-cyanotype-rainforest-path/style.css | `9c91f6d9b61a` | 2026-10-19 09:36:04 |
| prototypes/S25-spotcolor-contents-zine/style.css | `3a3173a9309a` | 2026-10-21 06:11:28 |
| prototypes/S26-geometric-collision-columns/style.css | `a73bf4f08cc6` | 2026-10-19 22:10:49 |
| prototypes/S27-hand-painted-bill-dispatch/style.css | `9d15d029ff13` | 2026-10-19 09:02:40 |
| prototypes/S28-jazz-intaglio-wall/style.css | `417e4bef0a9d` | 2026-10-21 06:24:30 |
| prototypes/S29-wire-bound-safety-manual/style.css | `4577b78613e7` | 2026-10-19 15:47:47 |
| prototypes/S30-skate-sticker-split/style.css | `b8af5dd3384f` | 2026-10-19 09:18:55 |
| templates/M01-clean-corporate/style.css | `6f440c52d5f3` | 2026-10-20 03:49:42 |
| templates/M02-warm-local/style.css | `4957ebc0d67c` | 2026-10-20 03:53:53 |
| templates/M03-bold-creator/style.css | `56397e8638a5` | 2026-10-20 04:28:14 |
| prototypes/_selection/style.css | `1a8d6bb5f143` | 2026-10-21 01:35:47 |

**写入范围声明**：本次只写了 `deliverables/25-critique-cascade-analyst.md` 与临时目录 `_crit2/`。没有修改任何原型、模板、脚本或 README。
