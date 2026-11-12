# 30 案 `metrics.structure` 补齐 + `layoutKind` 新增

日期：2026-11-12
对象：`prototypes/S01..S35` 共 35 份 `.inspect/report.json`
采集器：`prototypes/_build/vendor/probe.mjs`（本轮有改动，见 §6）
执行方式：单案验证 → 全量重渲染（35 案）→ 逐键复核 → 契约闸门

---

## §1 缺失范围确认

实测（`grep -q '"structure"'` 逐份，一条命令内完成，避免 30 次进程启动）：

```
HAS 5 / MISSING 30
```

补前清单：S01–S30 全缺，S31–S35 已有（Q2 新建，GEN2 引擎产物）。

| 项 | 实测值 |
|---|---|
| 原型目录总数 | 35（`prototypes/S*/.inspect/report.json` 恰 35 份） |
| 补前含 `metrics.structure` | 5（S31 S32 S33 S34 S35） |
| 补前缺失 | 30（S01–S30） |
| `--allow` 非空的老案 | 0 —— S01–S30 的 `allow` 全是 `[]` |
| 补前唯一有 FAIL 的老案 | S08（`palette-terracotta` + `font-count`，2 条，`allow=[]`） |

**关于 `--allow` 的结论**：`prototypes/_CONTRACT.md` §9.15 的允许表是**文档层**的豁免登记，不是渲染参数。30 个老案的 `report.json.allow` 实测全为 `[]`，所以「按它原有的 allow 清单跑」等价于**不加 `--allow`**。唯一带 FAIL 的 S08 也是 `allow=[]`（它的豁免只写在契约表里，没进 `allow` 字段）。因此本轮 35 案**一律裸跑 `render-scheme.mjs <dir>`，未传任何 `--allow`**，gate 记录口径与历史一致。

---

## §2 S01 验证：before/after 逐键 diff

**方法**：渲染前 `cp report.json /tmp/.../report-S01-before.json`（sha256 `791aa01d4a1486b2…`），渲染后按「剥掉 `at` 与 `viewports[].metrics.structure`」再 `JSON.stringify` 比较；若不同则递归展开到叶子键逐个列出。

**结果（决定性证据）**：

```
STRIPPED_EQUAL = true
before at = 2026-10-30T21:09:07.391Z
after  at = 2026-11-11T19:13:58.783Z
structure before = false | after = true
viewports = 3, metrics keys after = viewport,page,hero,h1,headings,headingSummary,
            type,eyebrows,numbered,color,buttons,surfaces,structure,heroMedia,nav,fontsLoaded
```

- **剥掉两个键后逐字节相同** ⇒ 重渲染**只**改了 `at` 与新增的 `structure`，没有第三个键被动过。这条不是"看起来一样"，是字符串相等。
- `structure` 是唯一的新增键（`metrics` 下键序里插在 `surfaces` 与 `heroMedia` 之间）。
- 渲染 exit=0，`FAIL=0 WARN=4`（WARN 均为历史既有：palette-cream / font-count / no-footage / side-scroll）。

S01 之后的**每一次**复渲染（为验证 `layoutKind` 补丁一共重跑了 4 次）都复现了 `STRIPPED_EQUAL = true`，包括采集器改动后的那几次 —— 见 §6 末尾。

---

## §3 S17 验证（无穷动画压力测试）

S17 是已知会抖的案子（`probe.mjs` 注释里就写着它的 `.plates` 是 auto-fit 卡片网格）。

```
STRIPPED_EQUAL = true
TOTAL_DIFF_LEAVES = 0
viewports = 1440,768,390   structure.columns = [3,2,1]
```

**逐键差异 0 处。** 连 `motion` / `filled` 都没变。

注意：`structure` 之外零差异，说明 S17 的无穷动画在**这一轮**没有影响 `report.json`（它影响的是**截图**，见 §4.3 —— 那是另一回事，且与本次改动无关）。

---

## §4 批量结果

### 4.1 计数

| 项 | 值 |
|---|---|
| 目标案 | 35（S01–S35 全量，因为采集器有改动，必须同代重跑；不是只跑缺失的 30 个） |
| 成功（`structure` 写出且 `at` 已刷新） | **35 / 35** |
| 失败 | 0（1 次瞬时失败已复跑成功，见 4.2） |
| 补后覆盖率 | **35 / 35**（三档视口全有 `structure`） |
| 耗时 | 总 2702s ≈ 45 分钟，中位 71s/案，最快 33s，最慢 136s |

### 4.2 唯一一次失败及其原因（不是产品缺陷）

`S05-pixel-cold-storage-console` 在批量中报 `exit=6`。`render-scheme.mjs` 的 exit 6 判据是「report.json 与渲染前逐字节相同 ⇒ 声称成功但没写报告」。

**根因**：**本仓库当时有另一个 agent 在并发写同一批文件**（详见 §7）。S05 的渲染窗口与对方的写操作重叠。复跑单案立刻成功（`at` 从 `2026-11-11T20:19:58.332Z` 更新为 `2026-11-11T22:23:34.774Z`，`columns=2 / layoutKind=fixed`）。

同一并发源还造成另外两处**必须记录的污染**：
- S08 在 `21:07:24`（不是我的任何一次渲染）被写成 `allow=["palette-terracotta","font-count"]`、`findings` 从 4 条缩成 2 条。我在 `21:32:48` 复渲染，`allow` 回到 `[]`、FAIL 回到 `palette-terracotta|font-count`，**与 HEAD 一致**。
- 仓库根出现 35 个 `S01-*/ … S35-*/` 野目录（只有 `.inspect/report.json`）。**不是我的产物，我没有删除**（见 §7）。

### 4.3 重渲染到底安全不安全 —— 结论要带限定

**分三层说，因为实测发现"报告安全"与"截图安全"不是一回事。**

**（a）`report.json` 的安全性：成立，但有 3 类键例外。**

35 案逐份做「剥 `at` + `structure`」比较。**两个参照系都列出**，因为它们的差异本身是证据：

| 参照系 | 逐字节相同 | 不同的案 |
|---|---|---|
| 对 **HEAD（入库版本）** | **28 / 35** | S07 S14 S22 S32 S33 S34 S35 |
| 对 /tmp 备份（= 本轮渲染前的工作区状态） | 27 / 35 | S07 S08 S14 S15 S22 S33 S34 S35 |

**为什么两个数不一样，这件事本身值得看**：S15 对 HEAD 相同、对备份不同 —— 因为**备份里那个 8789 才是不稳的那一次**，而 HEAD 的 8787 与现状一致：

```
HEAD（入库）      page.height = 8787
工作区渲染前(备份) page.height = 8789   ← 上一轮遗留的抖动值
现状(new probe)   page.height = 8787   ← 与 HEAD 一致，连跑两次都是 8787
headings[].top    现状 === HEAD  true
```

S08 同理反向：它出现过不属于我的渲染（§7），所以对备份比会多出差异。

**差异全部落在 3 类键上，且全部是「同一引擎跑两次也会不同」的抖动：**

```
· motion.elements / motion.css / motion.transitions / motion.scripted  (S32 S33 S34 S35)
· filled[i]（0.36 vs 0.37 这种 1/360 量化误差）                        (S14 S22 S07 的 textColors.share)
· page.height / headings[].top / textColors[].share（联动小抖动）
```

**这不是"改动引入了差异"，而是这些字段本来就不可复现。**证据是**反向实验**：把 `probe.mjs` 换回 `git show HEAD:` 的旧版（`layoutKind` 计数 = 0），在同一案上连跑两次：

```
OLD PROBE S32 两次渲染 motion:  8 -> 12  (@1440)
OLD PROBE S33 两次渲染 motion: 37 -> 38  (@1440)
```

旧引擎自己就抖。而这些字段的来源可查：
- `motion.*` 由 `inspect.mjs:80` 的 `MOTION_RECORDER` 在**加载 + 逐屏滚动过程中实时计数**（`animationstart` / `transitionrun` / `MutationObserver`），本质是时间竞态。
- `filled` 由 `probe.mjs:941` 的 24×15 = 360 点采样网格算出，再 `Math.round(x*100)/100`。滚动位置差半个像素就翻一个采样点 ⇒ ±0.0028 的跳变。
- `page.height` 是 `scrollHeight`，字体最终落位/图片解码时序会让它差 1–2px。
- `textColors[].share` 是文字面积占比，同源于布局的亚像素差。

**（b）截图的安全性：不成立，但与本改动无关。**

`S01` 的 7 张截图在多次渲染间**字节完全相同**（sha256 全等）。但 `S03` 连跑两次：`desktop-fold` / `desktop-page-02` / `mobile-fold` / `tablet-fold` 相同，`desktop-page-01` / `mobile-page-01` / `tablet-page-01` **不同**（157644 vs 157704 字节等）。原因同上：页面有入场动画，截到哪一帧取决于时序。

**所以"重渲染安全，只会改 `at` 和 `structure`"这句话，对 `report.json` 的大部分内容成立，对 `motion`/`filled`/`page.height`/`textColors.share` 不成立，对截图不成立。** 这三样都是**渲染固有噪声**，不是本次补丁引入的。上一轮报告 `02-report-coverage.md:11` 说"S01/S17/S05 三案除 `at` 与 `structure` 外逐字节相同"—— 那句话在**它抽到的那三个案**上是对的（我这次 S01、S17 也各自复现了 `STRIPPED_EQUAL = true`），但作为 35 案的普遍结论**过强**：实测 7 案（S07 S14 S22 S32 S33 S34 S35）会出现上述噪声。

**（c）gate 记录的安全性：完全成立。**

这是最要紧的一条。逐案比对「`FAIL` 规则名集合」与 HEAD：

```
FAIL 集合与 HEAD 相同: 35 / 35
```

包括 S08 的 `palette-terracotta|font-count`、S31–S35 的 `mono|hairline|few-pictures`、S15/S17 等的空集。**没有一案因为重渲染多出或丢掉一条 FAIL。**

---

## §5 probe.mjs 与 measure.mjs 的结论是否一致（重点）

两套实现：`prototypes/_build/vendor/probe.mjs`（入库采集器，写 `report.json`）与 `deliverables/74-q7/measure.mjs`（Q7 复刻验货，现量）。**实测四案：**

| 案 | probe.mjs `structure.columns` | measure.mjs `gridTracks` | 选中的容器 | 一致？ |
|---|---|---|---|---|
| **S01** | **4** | **4** | 两套都是 `div.columns` | ✅ 完全一致 |
| **S28** | **16** | **16** | 两套都是 `div.press__grid` | ✅ 完全一致 |
| S11 | 12 | 12 | 两套都是 `div.chapter-grid` | ✅ 一致 |
| S17 | 3 | 3 | probe: `div.foot-grid`(footer) / measure: `div.sheet` | ⚠️ 数相同，**量的元素不同** |
| S33 | 3 | 3 | probe: `footer` / measure: `ul.rows>li`(聚组) | ⚠️ 数相同，元素不同 |
| S09 | 3 | 3 | probe: `div.foot-grid`(footer) / measure: `ul#rows.rows`(column-count) | ⚠️ 数相同，元素不同 |
| **S14** | **3** | **0** | probe: `div.foot-grid`(footer) / measure: 无 | ❌ **结论冲突** |

**要点：**

1. **你点名的两案（S01=4、S28=16）两套实现完全一致**，且都选中同一个元素。这是本轮最需要确认的两条，通过了。

2. **7 案里 6 案的数值相同**，但其中 3 案（S17/S33/S09）**数值相同是巧合**——两套实现选中了**不同的容器**，只是恰好都数出 3。拿这个数当"两套实现互相印证"的证据是错的。

3. **S14 是真冲突：probe 报 3，measure 报 0。谁对？——measure 对。**
   - S14 的版心：`header.masthead`（1440 下 2 轨，装标题+图）、图片格 `.plates`（写死 `repeat(4,1fr)`，7 张图）、`ol.paths`（`display:grid` 但**没有** `grid-template-columns` 声明）。
   - **正文没有任何多栏容器。** `measure.mjs` 因此给 `gridFrom: "no-column-layout"`、`gridTracks: 0`。
   - `probe.mjs` 报 3，来源是 `div.foot-grid` —— **一个页脚**。它的判据是「承载文字最多的多栏容器」，而页脚文字（263 字）比正文任何单块都多，于是被选中。
   - **这是 `probe.mjs` 的选择缺陷，不是 measure.mjs 的错。** 判据「版心不会长在 footer 里」（measure.mjs 第 5 条）是对的。
   - 我在 `layoutKind` 里**修了这个判断**（只认非 landmark 容器），所以 S14 现在 `layoutKind=no-column-layout`，与 measure.mjs 一致；但 **`columns` 这个数我故意没动**（见 §6 的理由），它仍是 3。

4. **S17/S33/S09 的元素差异也说明同一件事**：`probe.columns` 的 `columnsFrom` 落在 header/footer 的案，1440 实测 **14/35**；其中 `layoutKind` 判为 `no-column-layout` 的（即**真正量错对象**）是 **6 案**：

| 分类 | 实测数量 | 案号 |
|---|---|---|
| `columnsInLandmark` 非空 | **14 / 35** | S09 S10 S13 S14 S16 S17 S19 S20 S23 S25 S26 S33 S34 S35 |
| 其中 `layoutKind=no-column-layout`（版心确实没分栏，`columns` 是页脚/页头的数） | **6** | S09 S13 S14 S16 S17 S34 |
| 其中 `layoutKind=fixed|auto-fit`（`<footer>`/`<header>` **本身**就是版心，合法） | **8** | S10 S19 S20 S23 S25 S26 S33 S35 |

S20/S23 的 `header.masthead`、S33/S35 的 `<footer>` 是**元素自身**就是版心，不是量错；只有上面那 6 案是"拿页脚冒充版心"。

**为此新增了两个字段**，把这件事写进报告而不是留在注释里：
- `structure.columnsInLandmark` —— `columnsFrom` 落在哪个 landmark（null = 不在）。
- `structure.layoutKindNote` —— 一句话说明这个 `columns` 是怎么来的。

例（S14@1440）：
```json
{"columns": 3, "layoutKind": "no-column-layout",
 "columnsInLandmark": "footer",
 "layoutKindNote": "no multi-column body container outside header/footer/nav/aside;
                    the columns value comes from a footer and does not describe the body layout"}
```

---

## §6 `layoutKind` 三案验证

### 6.1 实现位置与口径

改动只在 `prototypes/_build/vendor/probe.mjs`（采集器，页面内执行的那段 `probe()`）。

**核心难点**：Chrome 把 `repeat(auto-fit, minmax(280px,1fr))` 的 **computed** `gridTemplateColumns` 求值成 `337.75px 337.75px 337.75px 337.75px` —— 设计意图在 computed 里已经消失，**事后无法反推**。所以必须扫 `document.styleSheets` 读**声明值**，再用 `el.matches(selectorText)` 判断元素是否命中。

**踩到并修掉的坑（值得记）**：Chrome 支持 CSS 嵌套后，**每一条 `CSSStyleRule` 都带一个 `.cssRules`**（通常是空 CSSRuleList）。第一版先判 `r.cssRules` 再取 `r.style`，于是对每条样式规则都递归进空列表、永远走不到 `gridTemplateColumns` —— 扫描结果恒为空，**S31（四条 auto-fit）被静默判成 `fixed`**。这正是本仓库的老病：采集器读不到数据也不报错，照样输出一个合法值。修法：**先取声明，再决定要不要下钻**。

**第二个坑：层叠。** 只问"有没有命中过 auto-fit"是错的。S31 基础规则是 auto-fit（`style.css:134`），但 `@media (max-width:1023px)` 在 `:552` 又改写成 `1fr 1fr`，`:560` 在 ≤767px 再改成 `1fr`。所以 768/390 下**生效的**是写死的轨道。`_isAutoFit()` 因此改成只看**生效的那条**声明（文档序靠后者胜）。

**第三个坑：单轨 ≠ 没分栏。**
- S01@390 有 `.columns { grid-template-columns: 1fr }`（`style.css:455`）—— 那是**写死的单栏**，应报 `fixed`。
- S14 的 `ol.paths` 是 `display:grid; gap:26px` 而**没有** `grid-template-columns` 声明 —— computed 会给出单条隐式轨道，那是「没分栏」，应报 `no-column-layout`。
- 区别只能靠「**有没有显式声明**」，不能看 computed 是几条轨道。第一版只看 computed，把 S14 从 `no-column-layout` 误判成 `fixed`（实测踩到）。
- 还要叠加画廊判据：S14 的 `.plates` 在 390 有显式 `1fr`（`style.css:382`），但它装 7 张图，是画廊，不算版式。

### 6.2 三案实测输出（required cases）

**S01 → `fixed`** ✅
```
@1440  columns=4  layoutKind=fixed  selector=div.columns
       layoutKindFrom="5fr var(--bar) 4fr var(--bar) 4fr var(--bar) 3fr"
@768   columns=2  layoutKind=fixed  layoutKindFrom="5fr var(--bar) 4fr"
@390   columns=1  layoutKind=fixed  layoutKindFrom="1fr"
```
`columnsInLandmark=null`，`autoFitContentBoxes=0`。三个视口都是 `fixed`，且 1440 的声明原文与 CSS 真值逐字相同。

**S31 → `auto-fit`** ✅
```
@1440  columns=4  layoutKind=auto-fit  selector=div#blocks.blocks
       layoutKindFrom="repeat(auto-fit, minmax(280px, 1fr))"   autoFitContentBoxes=4
@768   columns=2  layoutKind=fixed     layoutKindFrom="1fr 1fr"          （@media 覆盖）
@390   columns=1  layoutKind=fixed     layoutKindFrom="1fr"              （@media 覆盖）
```
1440 正确报 `auto-fit`，并且**如实报出 768/390 已被 @media 改成写死轨道**。这不是"分类失败"，是**这个案的真实行为**：只有宽屏是流式，窄屏是写死的 1–2 栏。若只报一个 `auto-fit` 而不管断点，反而是错的。

**S14 → `no-column-layout`** ✅
```
@1440  columns=3  layoutKind=no-column-layout  columnsInLandmark="footer"   selector=null
@768   columns=1  layoutKind=no-column-layout  columnsInLandmark=null
@390   columns=1  layoutKind=no-column-layout
```

三案三类，全部区分正确。

### 6.3 补丁对既有字段的影响（S01 复核）

改完 `layoutKind` 后重渲 S01，再做一次「剥 `at` + `structure`」比较：

```
S01 stripped-equal (原报告 vs 新引擎): true
```

**`layoutKind` 的补丁没有污染任何既有字段**——`structure` 之外仍然逐字节相同。

### 6.4 新增字段清单（`structure` 内）

| 字段 | 含义 |
|---|---|
| `layoutKind` | `fixed` / `auto-fit` / `no-column-layout` |
| `layoutKindSelector` | 用来判定的版心容器（null = 没找到） |
| `layoutKindFrom` | 该容器**本视口生效**的 `grid-template-columns` 声明原文 |
| `layoutKindNote` | 一句话说明为什么是这个 kind（只在需要时出现） |
| `columnsInLandmark` | `columnsFrom` 落在哪个 landmark（null = 不在） |
| `autoFitContentBoxes` | 全页有几个承载正文的 auto-fit 容器（区分"版心写死但页脚流式"） |

全部 35 案 × 3 视口都有 `layoutKind`（实测 `35/35`）。

---

## §7 ⚠️ 必须报告：本仓库当时有另一个 agent 并发写同一批文件

这不是我的判断，是实测证据：

1. 批量渲染期间，`prototypes/S08/.inspect/report.json` 出现了一个**不属于我的任何一次渲染**的 `at`（`2026-11-11T21:07:24.810Z`；我的日志里最近的是 `21:06:26.248Z`）。该版本 `allow=["palette-terracotta","font-count"]`、`findings` 只有 2 条；而仓库里**不存在** `direction.json`（`inspect.mjs:28` 的自动 allow 来源，全仓仅 `prototypes/S03/.taste-skill/direction.json` 一份，内容是 `mono`），也没有任何 `--allow` 传参。我复渲染后回到 `allow=[]` + 原 FAIL。
2. 仓库根出现 35 个野目录 `S01-*/ … S35-*/`，每个只含 `.inspect/report.json`，ctime `2026-11-12 05:23:49`（我的驱动脚本从不往仓根写）。
3. `git status` 同时显示 `deliverables/78-northstar/` 下多个**不是我写的**新文件（`02-PLAN.md`、`03-INTERIM-REPORT.md`、`_probe/09-compare-fix.md` 等）。
4. `S05` 的 `exit=6`（报告字节未变）与后续多次渲染耗时从 40s 涨到 90–136s，与并发抢 CPU 一致。

**我没有删除那 35 个野目录**（不在我的任务范围，且可能是另一个 agent 的在途产物）。**建议**：确认那个 agent 收工后清理 `D:/Web/style/S*/`（它们不该在仓根）。契约 §9.1「一个方案目录只能有一个写入者」在这里是被违反的，值得记账。

**与本轮交付的关系**：所有 35 案的 `report.json` 在那次污染后**都已由我复渲覆盖并逐项复核**（`FAIL` 集合 35/35 与 HEAD 相同、`structure` 35/35 齐全）。污染没有留下残留，但**"谁在并发写"这件事本身需要上级去查**。

---

## §8 验证汇总（可复跑的判据）

| 判据 | 命令 | 实测结果 |
|---|---|---|
| 覆盖率 | 遍历 35 份 `report.json` 读 `viewports[*].metrics.structure` | **35 / 35**（三档全有） |
| S01 真值 | `structure.columns` @1440 | **4**（CSS `5fr var(--bar) 4fr var(--bar) 4fr var(--bar) 3fr` = 4 栏 + 3 条 24px 铅条） |
| S28 真值 | 同上 | **16**（CSS `repeat(16, minmax(0,1fr))`） |
| `layoutKind` 三案 | S01 / S31 / S14 | **fixed / auto-fit / no-column-layout** 全对 |
| gate 记录不变 | 逐案 `FAIL` 规则名集合 vs `git show HEAD:` | **35 / 35 相同** |
| 报告（剥 2 键）逐字节 vs **HEAD** | `git show HEAD:` 逐案比对 | **28 / 35**；7 案差异全在 `motion`/`filled`/`page.height`/`textColors.share`（已证为引擎固有抖动） |
| 报告（剥 2 键）逐字节 vs 渲染前备份 | 逐案比对 /tmp 备份 | **27 / 35**（多出的 S15/S08 是备份本身含旧抖动值，见 §4.3a） |
| 契约闸门 | `node prototypes/_build/check-contract.mjs` | **FAIL 0**（WARN 1 / INFO 2，均为既有审计线索） |
| 陈旧度闸门 | `node prototypes/_build/check-stale.mjs` | **35 案 + 1 入口全部新鲜** |

---

## §9 一句话总结

**补齐了 35/35（不是 30，因为采集器有改动必须同代重跑）。重渲染对 `report.json` 是安全的——`FAIL` 记录 35/35 一字未变，S01/S17 剥掉 `at`+`structure` 后逐字节相同；但"只改两处"的说法对 7 案不成立，差异全在 `motion`/`filled`/`page.height`/`textColors.share` 这几个渲染抖动字段，用旧引擎连跑两次同样会抖，不是本次改动引入。S01 的 `columns` 在 probe.mjs 里是 4，与 measure.mjs 的 4 一致；两套实现唯一实质冲突是 S14（probe 3 / measure 0），measure 对——probe 选了一个页脚当版心，这个选择缺陷我已用 `columnsInLandmark` 暴露、并在 `layoutKind` 里绕开，但刻意没改 `columns` 本身（改了会让 30 份历史报告不可比）。**
