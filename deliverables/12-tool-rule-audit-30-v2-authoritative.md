# 12 v2 — 用工具真实规则词汇重做的 30 案规则回灌（权威版）

> **本版是什么**：用 taste-skill 源码里**逐字提取的 52 条 `RULE_IDS`** 与 **impeccable `craft-floor.md` 禁用清单的条目名**这两套真实词汇，对本轮 30 个中文网站设计方案的规则回灌结果重新成文。
> **本版不是什么**：不是 v1 的修订，也不是对 v1 的追认。v1 的三份存档（`12-tool-rule-audit-30.md`、`12-tool-rule-audit-30-FULL.md`、`12-tool-rule-audit-30-retry5.md`）**一字未改**，作为历史记录保留；凡词汇与计数冲突，以本版为准（理由与逐条差异见 §七）。
> **完成度**：30 案中 **11 案产出结果**（S06、S07、S08、S10、S11、S13、S17、S20、S22、S23、S25），**19 案回灌失败**（S01–S05、S09、S12、S14、S15、S16、S18、S19、S21、S24、S26–S30）。失败案在 §四 逐案照列并注明"未产出"，**未代填任何命中、未按 0 命中计入任何分母**。

**三分类口径**（判据仍是 impeccable `craft-floor.md` 第 3 行逐字原文）：

> A pinned brief or the committed visual world overrides anything here; your own habit does not.

| 裁定 | 含义 | 举证要求 |
|---|---|---|
| `earned` | 该视觉世界的物理机制**必然要求**它 | 必须能引方案规格里的机制原文为证 |
| `habit` | 因"这类页面通常这样"而顺手加上的，机制并不要求 | 必须给出**替代机制** |
| `indefensible` | 既无机制支持，又正落在被点名禁用的清单里 | 应直接放弃 |

**两条统计纪律**（贯穿全文）：

1. **§二 只统计 taste-skill 52 条 `RULE_IDS` 内逐字存在的 ID**；impeccable 侧条目另立 §三，两表互不混入。
2. 各案裁定文字里自称"（不属于 taste-skill 52 条）"的现象，**一律进各案的"非规则观察"，永不进入 §二 的 52 条统计**。

**证据基座**：52 条 ID 取自 `tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs` 第 137 行 `RULE_IDS` 数组（逐字）；判据阈值取自同文件 `colourFamily()`（第 8–15 行）与 `judge()`（第 24–135 行）；impeccable 条目名取自 `tools/impeccable/.claude/skills/impeccable/reference/craft-floor.md` 第 25–42 行 Refuse 段的 15 条 bullet（逐字）；三波 tell 原句取自 `tools/taste-skill/skills/taste-skill/references/tells.md` 第 51–63 行（逐字）；各案标题取自 `deliverables/tool-runs/scheme-specs/Sxx.md` 首行。

---

## 一、为什么有 v2：词汇更正说明

### 1.1 v1 的错不是判错，是把**非 ID 的写法当成了 ID**

v1 自己已经写明这件事。`12-tool-rule-audit-30-FULL.md` §1.5 逐字：

> 30 案使用的规则 ID 是两套命名的并集：taste-skill 的 52 条机械规则 ID，加上 impeccable 侧的命名（`cream-palette`、`purple`、`bounce-easing`、`design-tool chrome`、`agency micro-meta`、`serif-premium`、`overused-font`、`performative-label`）。

同文 §二 表尾逐字：

> **合计 32 个规则 ID**（其中 `cream-palette`、`purple`、`bounce-easing`、`design-tool chrome`、`agency micro-meta`、`serif-premium`、`overused-font`、`performative-label` 属 impeccable 侧命名，其余在 taste-skill 的 52 条 `RULE_IDS` 内有同名条目）、207 条命中。

也就是说：**v1 的"32 个规则 ID"里有 8 个不是 taste-skill 的 ID**。补跑附件又引入第 9 个，`12-tool-rule-audit-30-retry5.md` §四 逐字：

> **补跑引入了一个不在主报告命名清单里的写法**：`default-font`。它**不在** taste-skill `rules.mjs` 的 52 条 `RULE_IDS` 内……本文按原文照录，**不代为归并、不代为重判**，只把它作为下一轮需要统一的 ID 口径问题登记在 §四 N4。

由此产生三类可验证的后果：

| # | 后果 | v1 里的实证 |
|---|---|---|
| A | **同一个真 ID 被劈成两种写法** | `cream-palette` ／ `palette-cream` 被写成"同一规则的两个别名"并合并（`-FULL.md:101`；`-retry5.md:213`）；`purple` 与 `palette-purple` 被当作两条 |
| B | **真 ID 的命中被非 ID 名分流** | 字体类判定记在 `overused-font`（2 案）与 `default-font` 名下（`-FULL.md:122`；`-retry5.md:118,141,225`），而真 ID 是 `font-count` ／ `font-fallback` |
| C | **真 ID 一边被写成"0 命中"，一边它的错词版本记着命中** | `-FULL.md:86` 把 `palette-purple` 列入 27 条 0 命中；`-FULL.md:123` 又记 `purple` 命中 2 案（S17、S24） |

### 1.2 v1 错词 → v2 正词 对照表

（"第 N 条"指 §1.3 清单里的位置；行号均为本工作区文件行号。）

| v1 的写法 | v1 的用法与出处 | taste-skill 52 条内的真实 ID | v2 的处置 |
|---|---|---|---|
| `cream-palette` | `-FULL.md:101` 记为"`cream-palette` ／ `palette-cream` … 14 案"；`12-tool-rule-audit-30.md:296,339` 同用 | **`palette-cream`**（第 25 条） | 合并为一个真 ID；本轮 11 案命中 **4**（S06 `habit`、S10 `earned`、S13 `earned`、S25 `earned`） |
| `purple` | `-FULL.md:123` 记 `purple` 2 案（S17、S24）；`12-tool-rule-audit-30.md:90,339` 又把它写进 0 命中清单 | **`palette-purple`**（第 26 条） | 统一为 `palette-purple`；本轮 **0 命中**，且 S07 / S08 / S10 / S17 / S23 有逐字判据排除 |
| `overused-font` | `-FULL.md:122` 记 2 案（S20、S24）；`12-tool-rule-audit-30.md:297` 当 impeccable 名单用 | **无此 ID**；最近的真 ID 是 `font-count`（第 29 条）与 `font-fallback`（第 30 条） | 不再作 ID；S20 的 `Space Grotesk` 归 `font-count`，判 `earned` |
| `default-font` | `-retry5.md:233,321` 自陈"不在 52 条内"，与 `overused-font` 同格、同案两种裁定 | **无此 ID**（同上） | 不再作 ID |
| `serif-premium` | `-FULL.md:111` 记 6 案 | **无此 ID**；tells.md §3 该行 Status 栏逐字就是 `no rule`（`tells.md:59`） | 降级为非规则观察（S13 非规则观察第 6 条即"衬线＝高级"） |
| `performative-label` | `-FULL.md:117` 记 3 案 | **无此 ID**；tells.md §3 该行注 `lint: copy`（`tells.md:62`） | 降级为非规则观察（S10 第 4 条、S13 第 5 条、S17 第 3 条） |
| `agency micro-meta` | `-FULL.md:109` 记 6 案 | **无此 ID**；tells.md §4 同族（`tells.md:78`） | 降级为非规则观察（S10 第 4 条、S17 第 2 条） |
| `design-tool chrome` | `-FULL.md:104` 记 9 案 | **无此 ID**；tells.md §4 明写 `banned via hairline, dashed`（`tells.md:77`） | 降级为非规则观察（S08、S10、S13、S17、S20、S22） |
| `bounce-easing` | `-FULL.md:105` 记 8 案；`12-tool-rule-audit-30.md:77` | **无此 ID**；tells.md §7 属 motion tell | 降级为非规则观察（S22 第 2 条、S23 第 3 条已自陈） |
| `motion-tell` | `12-tool-rule-audit-30.md:108` | **无此 ID** | 降级为非规则观察 |
| `wide-tracking` | `12-tool-rule-audit-30.md:67,209,333` | **不是 taste-skill ID**（impeccable 引擎规则）；最近的真 ID 是 `micro-label`（第 9 条） | 降级为非规则观察；S25 第 2 条已自陈"不是 taste-skill 52 条之一"，52 条侧记 0 命中 |
| `cramped-padding` | `12-tool-rule-audit-30.md:79,299` | **无此 ID**；空屏类真 ID 是 `empty-screens`（第 46 条，本轮 0 命中） | 降级为非规则观察 |
| `low-contrast` | `12-tool-rule-audit-30.md:298` | **`contrast`**（第 28 条） | 统一为 `contrast`；本轮 2 案（S11 `habit`、S25 `earned`） |
| `skipped-heading` ／ `hero-eyebrow-chip` ／ `icon-tile-stack` | `12-tool-rule-audit-30.md:92,312,340` 标为"原型"侧命名 | **无此 ID**；最近的真 ID 是 `eyebrow`（第 6 条）、`icon-cards`（第 20 条）、`no-hero`（第 39 条） | 均不进 §二；本轮三者皆 0 命中 |

**一句话**：v1 的 8 + 1 = 9 个非 ID 写法里，**4 类能由真 ID 承载**（→ `palette-cream`、`palette-purple`、`font-count`／`font-fallback`、`contrast`），**5 类不能**（→ 非规则观察）。

### 1.3 本版逐字采用的 52 条 `RULE_IDS`

取自 `rules.mjs:137`，拼写逐字保留（编号为本版所加，便于 §二 指位）：

1. `headline-lines` 2. `statement-length` 3. `focal-point` 4. `hero-words` 5. `mixed-font-headline` 6. `eyebrow` 7. `mono` 8. `numbering` 9. `micro-label` 10. `emoji` 11. `gradient` 12. `gradient-text` 13. `shadow` 14. `text-shadow` 15. `button-fx` 16. `hairline` 17. `outlined-box` 18. `dashed` 19. `glass` 20. `icon-cards` 21. `card-rows` 22. `pill-nav` 23. `palette-claude` 24. `palette-terracotta` 25. `palette-cream` 26. `palette-purple` 27. `default-link` 28. `contrast` 29. `font-count` 30. `font-fallback` 31. `size-count` 32. `body-size` 33. `measure` 34. `small-text` 35. `all-centred` 36. `ui-wrapper` 37. `overflow` 38. `broken-image` 39. `no-hero` 40. `first-action` 41. `grey-body` 42. `blend-text` 43. `covered-text` 44. `clipped-text` 45. `pinned-over-picture` 46. `empty-screens` 47. `long-pin` 48. `side-scroll` 49. `few-pictures` 50. `no-real-pictures` 51. `no-footage` 52. `still-page`

**共 52 条，与源码逐字核对一致。**

### 1.4 本版与 v1 的关系（声明）

1. **本版是重做，不是修订。** 本版全部裁定文字来自本轮 30 案回灌的输出；v1 的"32 个 ID"、207 / 242 条命中数、27 条 0 命中清单，在本版中**不作为统计基础引用**。
2. **两套词汇，两张表。** taste-skill 52 条进 §二；impeccable Refuse 条目进 §三。v1 里被当作 ID 的非 ID 写法，本版按 §1.2 表处置。
3. **失败案不代填。** 本版 19 个失败案在 §四 只记录失败状态；其"三分计数 / 命中 / tell / 第三波判定"一律记"未产出"，**不引用 v1 的对应结果代填**。
4. **覆盖度不可比。** v1 家族（`-FULL` 25 案 + `-retry5` 5 案）自称覆盖 30 / 30，但用的是混合词汇；本版覆盖 **11 / 30**，用的是纯真 ID 词汇。凡涉及"多少案命中"的比较，本版一律同时标注分母。
5. **可比性恰好成立的一点**：本版 11 个完成案（S06、S07、S08、S10、S11、S13、S17、S20、S22、S23、S25）**全部落在 v1 家族已完成的 30 案之内**（其中 S10、S13 在 `-FULL` 里属失败案，由 `-retry5` 补齐）。§七 的逐条对比据此成立。
6. **v1 的一处内部矛盾已被本版按真 ID 消解**：`12-tool-rule-audit-30.md:61` 把 `font-fallback` 记为"高频命中（渲染级 S13、S08、S17）"，而 `-FULL.md:86` 把同一个真 ID 列入"27 条 0 命中"。本版逐案重判：`font-fallback` 在本轮 11 案中命中 **1 案（S13）**。

---

## 二、规则总表（只统计 taste-skill 52 条里的真实 ID）

**数据来源**：§四 中 11 个完成案的命中表格，按"一案 × 一条 ID"逐行统计；19 个失败案不计入任何分母。**"本轮命中的含义"一列是对本轮证据的概括**（括号内给出 `rules.mjs` 的判据原文或阈值），不是对工具语义的转述。

| 规则 ID（逐字） | 本轮命中的含义（判据见 rules.mjs） | 命中数 | 命中方案编号 | 三分（earned / habit / indefensible） |
|---|---|---|---|---|
| `hairline` | 1px 发丝细线／分隔线（`thin rule(s)/divider line(s)`；1 条 WARN、≥2 条 FAIL；真实表格线与表单域豁免） | **11** | S06, S07, S08, S10, S11, S13, S17, S20, S22, S23, S25 | 8 / 3 / 0 |
| `mono` | 代码之外的等宽字（`Monospace type outside code`） | **10** | S06, S07, S08, S10, S13, S17, S20, S22, S23, S25 | 4 / 5 / 1 |
| `font-count` | 字体族数（>3 FAIL、=3 WARN；`share >= 0.02` 才计） | **9** | S06, S07, S08, S10, S13, S17, S20, S23, S25 | 4 / 5 / 0 |
| `body-size` | 正文字号（<15px FAIL、<16px 桌面 WARN） | **8** | S06, S07, S10, S13, S17, S20, S22, S25 | 0 / 8 / 0 |
| `palette-cream` | 黄奶纸底（`colourFamily`：h 22–62、s≥0.16、l≥0.88） | **4** | S06, S10, S13, S25 | 3 / 1 / 0 |
| `no-footage` | 全页无视频（`No video anywhere on the page`） | **4** | S08, S10, S13, S20 | 0 / 3 / 1 |
| `dashed` | 虚线／点线边框（`dashed/dotted border(s)`） | **3** | S07, S11, S25 | 3 / 0 / 0 |
| `focal-point` | 首屏无主导物（最大字 <4.5vw 且无占屏 1/3 的图） | **3** | S06, S17, S22 | 3 / 0 / 0 |
| `numbering` | 装饰性 `01`／`02`／`03` 索引号 | **3** | S10, S22, S23 | 2 / 1 / 0 |
| `mixed-font-headline` | 标题行内换字体／换斜体（"一个斜体衬线词"那一步） | **3** | S13, S17, S23 | 2 / 1 / 0 |
| `shadow` | 静止元素带投影（resting `box-shadow`） | **3** | S08, S13, S22 | 3 / 0 / 0 |
| `palette-terracotta` | 陶土／铁锈橙强调（`colourFamily`：h 6–30、s 0.38–0.85、l 0.42–0.72） | **2** | S06, S08 | 2 / 0 / 0 |
| `few-pictures` | 图片少于 4 张（≥1100px 时 `pics < 4`；SVG 图不计） | **2** | S10, S20 | 0 / 1 / 1 |
| `still-page` | 动效元素过少（`inspect.mjs` 的 `MOTION_MIN = 8`） | **2** | S10, S20 | 2 / 0 / 0 |
| `contrast` | 文字对比不足（<2.6:1 FAIL、其余 `lowContrast` WARN） | **2** | S11, S25 | 1 / 1 / 0 |
| `headline-lines` | 标题超过两行（`lines > 2`） | **1** | S08 | 0 / 1 / 0 |
| `card-rows` | 同尺寸卡片成排（≥2 排 WARN） | **1** | S06 | 0 / 1 / 0 |
| `overflow` | 页面横向滚动（`horizontalOverflow`） | **1** | S06 | 0 / 1 / 0 |
| `outlined-box` | 1px 描边盒（≥3 个 FAIL、其余 WARN） | **1** | S11 | 0 / 1 / 0 |
| `button-fx` | 按钮带渐变／投影 | **1** | S13 | 1 / 0 / 0 |
| `font-fallback` | 声明未加载、实际渲染回退字体 | **1** | S13 | 0 / 1 / 0 |
| `gradient` | 渐变填充（`gradient fill(s)`） | **1** | S23 | 0 / 1 / 0 |
| `side-scroll` | 内容被切在边缘的横滑行 | **1** | S23 | 0 / 1 / 0 |
| `hero-words` | 首屏主张句过长（hero 词数 >10，画廊中位数 5） | **1** | S25 | 0 / 1 / 0 |
| **合计：24 个真实 ID** | — | **78** | — | **38 / 37 / 3** |

**读表要点**：

- 命中数列前三的 `hairline`（11）、`mono`（10）、`font-count`（9）**不是严重度前三**：`hairline` 的 11 条里 8 条判 `earned`，`font-count` 的 9 条里 4 条判 `earned`。批次级硬伤要看 `indefensible`（全批仅 3 条：S06 `mono`、S20 `few-pictures`、S20 `no-footage`）。
- `body-size` 是唯一**全数判 `habit`**的高频规则（8 / 8），即"15–15.5px 正文"在本轮从机制上从未被挣得。

### 2.1 本轮 0 命中的真实 ID（28 条，仍属 §二的 52 条统计）

52 − 24 = **28 条**在本轮 11 案中 0 命中。按"本轮处理方式"分三类列出，以免与"一律判违规"混淆：

| 类别 | 条数 | ID | 本轮依据 |
|---|---|---|---|
| **有逐字判据排除**（裁定文字给出实测值或阈值比对） | 12 | `palette-purple`、`palette-claude`、`measure`、`micro-label`、`all-centred`、`covered-text`、`clipped-text`、`long-pin`、`pinned-over-picture`、`empty-screens`、`first-action`、`grey-body` | 例：S07 明写"62 字符低于 88 字符阈值"（`measure`）、"判据要「≤14px＋全大写＋字距 ≥0.05em」，规格只给期号页码，没有字距"（`micro-label`）、"§5 明写「标题允许跨栏但不允许居中」"（`all-centred`）；S10 复算 `#D32029` h357° 不在陶土带、`#6E7076` s3.5%（`palette-terracotta`／`palette-purple`）；S17 明写 `contrast` 实测 7.73 / 6.45 / 6.1 / 5.09 全 ≥4.5、`empty-screens` / `first-action` 不触发；S22 明写 `covered-text` / `clipped-text` / `long-pin` / `pinned-over-picture` 分别要求字号 ≥24 / ≥40 / ≥32 / ≥32px，本方案最大 17px。 |
| **规格未给、无法机械判定** | 4 | `statement-length`、`size-count`、`small-text`、`no-real-pictures` | 例：S07 "主张句……是 44 字完整句，规格未给字号与行数，无法机械判定"；S23 明确登记 `small-text`（号牌刻字字号未给）、`measure` / `size-count` / `empty-screens`（"需渲染实测"）、`few-pictures` / `no-real-pictures` / `no-footage`（"只给了配方……未承诺图数与是否有片"）。 |
| **本轮 11 案裁定文字未提及** | 12 | `eyebrow`、`emoji`、`gradient-text`、`text-shadow`、`glass`、`icon-cards`、`pill-nav`、`default-link`、`ui-wrapper`、`broken-image`、`no-hero`、`blend-text` | 记为 0 命中，但不声称"已逐条实测"；其中 `eyebrow` 在 v1 里曾命中 S03、S26 —— 这两案正是本轮的失败案，故不进本轮统计。`no-hero` 在 S22 有一处条件性提及（"若标题非 h1，同因判 `no-hero`"），因未判定故不计入。 |

**特别说明（防止混表）**：S06 的 impeccable 条目 "Same-size cards of icon plus heading plus text as the page structure" **不是** taste-skill 的 `icon-cards`（后者要求"每张卡顶部带小图标"）；S06 在 taste-skill 侧命中的是 `card-rows`。两套词汇的边界见 §三 开头。

### 2.2 计数口径与一处原始数据冲突（务必先读）

- **逐行口径 vs 案首口径**：本表按 §四 各案**表格"裁定"列逐行**统计。
- **S11 的冲突**：S11 案首自报"taste-skill 命中 4 条：earned 2 / habit 2"，但其表格 4 行裁定为 **earned 1 / habit 3**；案首自报 impeccable"earned 1 / habit 1"，其表格 2 行裁定为 **earned 2 / habit 0**。两处均为原始数据自带的不一致，本版**照录表格、不改写案首**，并把差异登记在 §七 7.4。
- **好在该冲突不影响批次合计**：两种读法下 S11 的**案子级**合计同为 `earned 3 / habit 3`，因此 §六 的 107 条三分类总计（63 / 41 / 3）在两种口径下完全相同；受影响的只有 §二 里 `hairline`、`contrast` 等**逐规则**归属可能各差 1 条。

---

## 三、impeccable 禁用清单命中总表

**统计对象**：`craft-floor.md` Refuse 段的 **15 条 bullet**（第 25–42 行；分「Page scaffolds」5 条与「Surface habits」10 条两组，已逐条核数）。**这些不是 taste-skill 的 `RULE_ID`**，故不进入 §二 的任何数字；反之 §二 的 78 条也不含本表任何一条。

**来源分层**（用于核对，不影响计数）：本表 9 个条目**全部**来自 Refuse 段（第 25–42 行）；另有一批在本轮以"非规则观察"出现的内容来自 craft-floor 的 **Verify 段**（第 5–17 行，如 Browser surfaces、Type 的 65–75ch、Motion 的 "one authored moment"）或 impeccable 的**引擎规则**（如 `wide-tracking`），本表**均不计入**。

| impeccable 条目名（逐字取自 craft-floor.md Refuse 段） | 命中数 | 命中方案编号 | 三分（earned / habit / indefensible） |
|---|---|---|---|
| Monospace as a costume for "technical" rather than for code, data, or measurement | **8** | S06, S07, S11, S13, S17, S20, S22, S25 | 7 / 1 / 0 |
| Hard offset shadows (`box-shadow: 4px 4px 0`) outside a world that is actually neobrutalist | **5** | S08, S10, S11, S13, S22 | 5 / 0 / 0 |
| Light or dark picked by category. Pick it from the use scene: who, where, under what ambient light | **4** | S06, S13, S17, S20 | 4 / 0 / 0 |
| Section numbers (01 / 02 / 03) unless the sequence itself carries information the reader needs | **3** | S06, S22, S23 | 3 / 0 / 0 |
| A colored `border-left` or `border-right` above 1px on cards, list items, callouts, or alerts | **3** | S08, S22, S25 | 2 / 1 / 0 |
| The hero-metric template: big number, small label, supporting stats, accent | **2** | S17, S20 | 2 / 0 / 0 |
| Sparklines, progress rings, and soft-shadowed rounded rectangles standing in for content | **2** | S06, S20 | 2 / 0 / 0 |
| Same-size cards of icon plus heading plus text as the page structure | **1** | S06 | 0 / 1 / 0 |
| Geometric masks standing in for organic contours | **1** | S23 | 0 / 1 / 0 |
| **合计：9 个条目** | **29** | — | **25 / 4 / 0** |

**本表要点**：

1. **本批 impeccable 侧 29 条里 25 条判 `earned`、4 条 `habit`、0 条 `indefensible`。** 也就是说：impeccable 的 Refuse 段在本批几乎全被"已提交的视觉世界"赎回（Refuse 段开口句第 21 行逐字：`These are the category's defaults, not bans: the brief's own words can earn any of them.`）。
2. **两个工具在同一条上判法相反**（`mono`）：impeccable 明确豁免 code / data / measurement，taste-skill 的 `mono` 只豁免 `<pre>/<code>` 的**字面代码**（`rules.mjs:56` 逐字：`Monospace is for literal code inside <pre>/<code> only.`）。S06 与 S22 是最清楚的两例：同一件"等宽排读数"的装置，impeccable 判 `earned`、taste-skill 判 `habit` 或 `indefensible`。本版**不做合并**，两表各自照录。
3. **本轮 0 命中的 Refuse 条目**（11 案裁定文字未触及）：kicker/eyebrow above a heading、Gradient text、Glass and blur、A system display face、Unicode glyphs or emoji as an icon system、A modal for a task that needs neither interruption nor protected focus。这是"没有一律判违规"的正面证据之一。

---

## 四、逐案结果

**本章规则**：30 个小节一个不缺，按案号排序；11 个完成案保留**三分计数、命中表格、非规则观察、最致命的 1 条 tell 整段照录、第三波判定**五项；19 个失败案照列并注明"回灌失败，未产出结果"，其五项一律不代填。各案标题取自 `tool-runs/scheme-specs/Sxx.md` 首行。

### 4.1 S01｜红黑斜排报（Red Wedge Broadsheet）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.2 S02｜鎏金对称厅（Gilded Symmetry Salon）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

**附注**：不得引用 v1 `-retry5.md` 对 S02 的补跑结果代填（那属于 v1 的混合词汇口径）。

### 4.3 S03｜长曝光观测站（Long-Exposure Observatory）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.4 S04｜芒果拼贴墙（Mango Collage Wall）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.5 S05｜像素冷库台（Pixel Cold-Storage Console）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.6 S06｜昭和喫茶账（Showa Kissaten Ledger）

**三分计数**：taste-skill 命中 **9** 条：`earned` 2 / `habit` 6 / `indefensible` 1。impeccable 禁用清单命中 **5** 条：`earned` 4 / `habit` 1 / `indefensible` 0。**合计 14 条：earned 6 / habit 7 / indefensible 1。**

**命中表格**

| 来源 | 规则 ID / 条目名（taste-skill 必须用 52 条里的逐字 ID） | 证据原文引用（摘规格原文，≤40 字） | 裁定 | 理由（≤60 字） |
|---|---|---|---|---|
| taste-skill | `mono` | 辅助数字＝Martian Mono…排账目与期号 | indefensible | 机制只需数字对位（tabular-nums 即可），等宽正落在被点名禁用项，替代是正文体的表格数字 |
| taste-skill | `font-count` | 标题＝EB Garamond…辅助数字＝Martian Mono | habit | 加 Literata 与朱雀仿宋共 4 族；中英各一族已够，两个拉丁族可由一族兼任标题与正文 |
| taste-skill | `body-size` | 正文 15px／行高 1.9 | habit | 漂移与渍痕机制不决定字号；16px 同样进 228px 栏，15px 未被机制挣得 |
| taste-skill | `focal-point` | 入口由杯渍最深的一张给定 | earned | 规格自述"页面没有起点也没有终点"，首屏主导物被世界明令拒绝，入口即渍痕本身 |
| taste-skill | `hairline` | #C9A87C 渍痕淡褐＝杯渍环与分隔 | habit | 环上 1px 沉积线由油墨机制挣得，但"分隔"的 1px 线多余；污渍已是坐标兼分隔 |
| taste-skill | `card-rows` | 卡片固定跨 3 栏（228px 起） | habit | 卡片作漂移载体是机制所需，等宽不是；宽度随 0.62 递减可让容器自己成为河流 |
| taste-skill | `palette-cream` | #ECDEC6 奶纸＝背景，56% | habit | 第三波点名的黄奶纸底；实测 HSL L85.1%，距 cream 阈值 88% 仅 2.9 点，机制只需旧纸 |
| taste-skill | `palette-terracotta` | #85572A 咖啡褐＝主色与标题，22% | earned | 深墨而非锈色强调，L34.3% 在家族窗口外；双色珂罗版套印机制需要一支深墨 |
| taste-skill | `overflow` | 轨道用单个容器加 rotate(-3deg) | habit | 斜轨与渍痕外溢必须越界，但整页横向滚动非机制所求；overflow: clip 可保住越界 |
| impeccable | Same-size cards of icon plus heading plus text as the page structure | ≥1280px 三轨道并行 | habit | 卡片是漂移载体（机制挣得），但"页面结构即等宽卡片"是容器惰性；宽度可随 0.62 递减 |
| impeccable | Section numbers (01 / 02 / 03) unless the sequence itself carries information the reader needs | 每张卡片挂真实期号、日期与冲泡参数 | earned | 期号是刊物序号，读者靠它定位往期，正落在该条明写的例外里 |
| impeccable | Monospace as a costume for "technical" rather than for code, data, or measurement | 辅助数字＝Martian Mono…排账目与期号 | earned | 等宽在此排账目与冲泡参数的对位数字，属该条 data/measurement 例外（与 taste-skill 的 mono 判定相反） |
| impeccable | Sparklines, progress rings, and soft-shadowed rounded rectangles standing in for content | 卡面上只有杯渍环、没有标题 | earned | 环是"这条河断过流"的记号且规格明说存在理由，不替代内容、不作计分环 |
| impeccable | Light or dark picked by category | 模拟 70 年代菜单纸在钨丝灯下的反射 | earned | 亮暗由使用场景的环境光给出，不是按"喫茶店＝暖"这个品类直接选亮选暗 |

**非规则观察（不属于 taste-skill 52 条）**

1. **同一节里混用 HSV 与 HSL 的饱和度口径**（我起的描述性名，不属于 taste-skill 52 条）：第 3 节把 `#ECDEC6` 的饱和度写成 16.1%，那是 HSV 口径（按 taste-skill 的 HSL 口径实为 50%）；`#85572A` 的 52.5% 却是 HSL 口径（该色 HSV 为 68.4%）。两个数字不能同表比较，也就无法直接对照 `colourFamily` 的 s≥0.16 阈值。
2. **同一份规格里出现两个正文对比度值**（不属于 52 条；contrast 只看 4.5/3 阈值，不查文档一致性）：第 3 节写"正文色 `#241A12` 对底色 12.85:1"，第 35 行"校验"却写"正文对比度 13.33:1"。我按 WCAG 复算为 12.85:1，故第 3 节正确、校验行是旧值。
3. **把构建期错误码写进读者文案**（不属于 52 条；52 条 RULE_IDS 里没有文案规则，copy tells 在 lint.mjs）：错误状态原文"错误码 IMG-12-3"把构建期的内部编号交给读者，恢复路径（先读第 11 期／到店里要纸质菜单）本身是好的。
4. **构建期烘焙的 60 线网点在 HiDPI 下会被重采样**（不属于 52 条）：珂罗版网点"在构建期生成，浏览器端不再处理"并压成"AVIF（质量 78）"，而文字是矢量——在 2x/3x 屏上网点与"油墨溢出"会糊，同一个画面里出现位图柔边与矢量锐边两种物理。

**该案最致命的 1 条 tell**

最致命的不是某个零件，而是整套暖色世界：56% 的 `#ECDEC6` 黄奶纸 + 22% 的 `#85572A` 褐墨 + 老式衬线标题 + "温暖手作／人味"的调性，正是 tells.md 第三波点名的那条组合。规格自己已经写出了这条路的尽头——第 9 节把最大风险写成"复古咖啡店 landing page，暖色滤镜加衬线大字加一句手写标语"，但规避动作只做了三件事：把杯渍参数化、把褐色压到 22%、给卡片挂上期号与冲泡参数；这些让它更像一本账，却没换掉"把它暖起来"的配方。更危险的是它的自证方式：把"色相 29.7° 与饱和 52.5% 全程未动"当成清白证明，只把明度从 35.5% 压到 34.3% 就算完成 AA，而这个"为达 AA 的唯一改动"恰好把主色留在 terracotta 家族的明度窗口（≥42%）之外；纸底 85.1% 也刚好差 2.9 点没进 cream 的 88% 窗口。也就是说，两个调色板规则不是被机制挣回来的，是被阈值让开的：换成同一套珂罗版机制、同一套污渍坐标，纸可以做灰骨、墨可以做铁胆蓝黑，世界毫发无损（tells.md 自己给的出路就是"a low-chroma stone, a deep ink"）。所以我的裁定是：单个零件大多勉强站得住，合起来仍然是那条被禁的第三波。

**是否属于第三波 tell：是。** tells.md §3 原句："The remedy published for the first two waves was \"warm it up and make it editorial\". Models adopted the remedy wholesale and it is now the most recognisable generated look of all."；同节表中原句："Yellow-cream ground + terracotta / rust / clay accent | banned together; terracotta banned alone; cream warned | The dealt palette. Warmth from a low-chroma stone, a deep ink, a photograph, or a full warm field"。

### 4.7 S07｜铅灰油墨目录（Slate-Ink Contents）

**三分计数**：taste-skill 命中 **5** 条：`earned` 2 / `habit` 3 / `indefensible` 0。impeccable 禁用清单命中 **1** 条：`earned` 0 / `habit` 1 / `indefensible` 0。**合计 6 条：earned 2 / habit 4 / indefensible 0。**

**命中表格**

| 来源 | 规则 ID / 条目名 | 证据原文引用（≤40 字） | 裁定 | 理由（≤60 字） |
|---|---|---|---|---|
| taste-skill | `hairline` | 「栏线为 0.5px 实线」＋「跨页分隔另画 1px 实线」 | habit | 18px 栏沟与 5:7 栏宽比已完成分区；tells.md 处方是 structure from space and tone |
| taste-skill | `mono` | 「辅助数字＝IBM Plex Mono（……排页码、期号与分类编号）」 | habit | 活版数字与正文同字身；页码用正文的 tabular-nums 即可对齐，无需第四个等宽面 |
| taste-skill | `font-count` | 「标题＝Libre Franklin……中文主字体＝文津宋体」 | earned | 中文面是 CJK 覆盖的物理必需，拉丁标题与正文分属哥特/衬线两体系 |
| taste-skill | `body-size` | 「正文 15px／行高 1.85（中文行高放宽）」 | habit | 密度可由 62px 窄栏与 1.85 行高承担，正文回 16px 不必靠缩字号硬挤 |
| taste-skill | `dashed` | 「边缘保留原始裁切标记与手写编号」 | earned | tells.md 把裁切标记归 hairline/dashed，但它是未裁切原件自身的实物痕迹 |
| impeccable | Monospace as a costume for "technical" | 「排页码、期号与分类编号」 | habit | 页码属度量、期号与分类编号属档案编码；正文数字字身足够，不必借等宽发技术腔 |

**判据边界（已核对、未计入命中）**

- `palette-cream` 未命中：底色「色相 60°、饱和 3%、明度 89.2%」，判据要求饱和 ≥0.16，规格自陈「把这一案移出暖米纸簇」。
- `palette-purple` 未命中：`#33505C`「混了黑的冷灰蓝（L 28%）」，色相约 198°、饱和约 0.29，不在 244–295° 的靛紫族。
- `numbering` 未命中：挂的是「1951-07-14 / 第 118 页 / 分类 G-4」这类真实期号页码，判据只抓 `01`／`(003)`／`Step 02`／`Fig. 01` 一类纯装饰序号。
- `micro-label` 未命中：判据要「≤14px＋全大写＋字距 ≥0.05em」，规格只给期号页码，没有字距。
- `measure` 未命中：62 字符低于 88 字符阈值（但与 craft-floor 的 65–75ch 下限冲突，见下节）。
- `all-centred` 未命中：§5 明写「标题允许跨栏但不允许居中」。
- `gradient` 未命中但有实现风险：网点与套印不是 CSS 渐变；若引导点用 repeating-gradient 造点，反而会误触 gradient（§6 未指定实现）。
- `headline-lines` / `statement-length` 待定：主张句「本辑收录 1938 到 1952 年间 46 份地方报纸的分类广告版……」是 44 字完整句，规格未给字号与行数，无法机械判定。

**非规则观察（不属于 taste-skill 52 条）**

1. **栏宽与行长单位互斥**（不属于 taste-skill 52 条）：同一份规格里「栏宽 62px、栏沟 18px」与「拉丁正文行长限到 62 字符」在 15px 字号下不能同时成立——62px 一栏只容 8 到 10 个拉丁字符，62 字符的行必须横跨六到八栏，等于把"栏"这个机制取消。
2. **基线栅格不整除**（不属于 taste-skill 52 条）：「基线 7px」与「正文 15px／行高 1.85」冲突，1.85×15=27.75px 不是 7px 的整数倍，而页码行高 28px 恰是 4×7；正文每行累积 0.25px 漂移，五栏密排下栏线会与基线错位。
3. **透印层未定 z 序，1px 偏移即虚边**（不属于 taste-skill 52 条）：规格只写「位置与正面对齐并整体偏移 1px」，没写它在正面文字之下还是之上；1px 在 15px 字号下约为字身 7%，8%–14% 的镜像贴着正面笔画描边，读起来是重影而不是纸背透墨。若透印层压在正面上，还会直接落进 covered-text 的机械判据。
4. **透印层是同一文本的第二份 DOM 副本**（不属于 taste-skill 52 条）：§11 只限制「不得复制整篇正文文本，只复制可见的目录行」，但这份副本仍进入一切按字符占比计算的检查——等宽占比、字号档数、微标签数、居中占比的分母被同一段内容算两次，46 条目录的镜像会让比例失真。
5. **逐行渗墨时长与自设 LCP 预算互斥**（不属于 taste-skill 52 条）：「每行 70ms，用 `steps(2)` 造出两次落墨」对 46 条目录是约 3.2s 入场，而 §11 自设「LCP ≤2.4s」；规格没给渗墨总时长上限，也没说末行落墨前是否阻断交互。
6. **浏览器自带表面只主题化了光标**（impeccable Verify 项，不属于 taste-skill 52 条）：§7 自绘了排版光标，§8 说可点性「只靠 1px 下划线与透印变化」，但选区色、滚动条、焦点环与下划线偏移都没落进 `#33505C`／油墨黑这套色里；craft-floor 称这一类是「the cheapest signal that a page was built rather than assembled」。
7. **拉丁行长把下限当上限**（impeccable Verify 项，不属于 taste-skill 52 条）：§5 写「拉丁正文行长限到 62 字符」，而 craft-floor 的 Type 检查要求「body measure 65–75ch」，这里 62 字符低于区间下沿。
8. **五处动效缺一个主角**（impeccable Verify 项，不属于 taste-skill 52 条）：§7 并列滚动加深、悬停、逐行渗墨、栏位转场与光标五处效果，craft-floor 要的是「one authored moment, not scattered effects」；规格只声明「主机制＝透印加深」，没说其余四处如何让位。

**该案最致命的 1 条 tell**

最致命的是"报纸编排扮演"（broadsheet cosplay）：0.5px 栏线铺满左 5 右 7 的密栏，加上 §8 自陈的「全站没有圆角容器与柔和投影」，这三件正好是 tells.md 第三波逐字登记的组合。它之所以致命，是因为这套外壳不是从"46 条铅印目录"这个内容推出来的，而是从"把页面做得像出版物"这个补救动作推出来的——§9 自己承认最容易滑向「复古报纸风博客主题」，规避动作却只落在做旧噪点这种表层。规格真正独有的机制只有透印（8%–14%、1px 纸厚偏移、随滚动线性加深），它被"纸很薄"这个物理事实挣得；而栏线密度、等宽页码、密排分栏在拿掉透印之后，仍然是任意一份 2025 年编辑风复古模板的通用外壳。所以处置不是删线，而是让线去做只有这个档案才需要的活（例如按分类 G-4 的字段切分栏），或者按 tells.md 的处方把分隔交给 18px 栏沟与油墨浓淡。判据边界要说清：栏线在"未裁切的新闻纸"这个世界里并非无据，所以它落在 habit，而不是 indefensible。

**是否属于第三波 tell：是。** 依据 tells.md §3 原句：「The remedy published for the first two waves was "warm it up and make it editorial". Models adopted the remedy wholesale and it is now the most recognisable generated look of all.」该节登记的组合原句为：「Broadsheet cosplay: hairline rules everywhere, zero radius, dense columns | banned via hairline | Structure from space and tone」。

### 4.8 S08｜琥珀叠印灯箱（Amber Overprint Lightbox）

**三分计数**：taste-skill 命中 **7** 条：`earned` 5 / `habit` 2 / `indefensible` 0。impeccable 禁用清单命中 **2** 条：`earned` 2 / `habit` 0 / `indefensible` 0。**合计 9 条：earned 7 / habit 2 / indefensible 0。**

**命中表格**

| 来源 | 规则 ID / 条目名 | 证据原文引用（≤40 字） | 裁定 | 理由（≤60 字） |
|---|---|---|---|---|
| taste-skill | `headline-lines` | 主张句“把 6 块琥珀板叠起来，就是这个品牌的主色，透光率 72%” | habit | 规格自备 220px 工艺参数栏，数值本该进栏；机制不要求整句上 display 级并绕三行以上 |
| taste-skill | `mono` | 辅助数字＝IBM Plex Mono（排套准编号、厚度与色号） | earned | 排的是厚度、色号、套准号＝测量数据而非“技术腔”标签；impeccable 明文豁免 code、data、measurement |
| taste-skill | `hairline` | 1.25px 线宽、方头、端点落在 0.5 单位栅格上；边缘保留打样纸的裁切标记 | earned | 套准/裁切标记是读出 1.2mm 错位的测量装置，tells.md 里被归入 hairline 通道的“chrome”在此是本体而非装饰 |
| taste-skill | `shadow` | 投影是按光源方向偏移 3px 的硬阴影而不是柔影 | earned | 规格自建统一光向（12°高光、12%明度差、2px 暗边）；craft-floor 的柔影默认被已提交世界覆盖 |
| taste-skill | `palette-terracotta` | #C46A1F 琥珀＝主色，承担板体与油墨，24% | earned | 主色即材质：琥珀亚克力与 Amber 滤光片；色族只认色相带，无法分辨琥珀与 terracotta |
| taste-skill | `font-count` | 拉丁标题＝Gloock，拉丁正文＝Source Serif 4，中文＝京华老宋体 | earned | 拉丁展示、拉丁正文、测量数字、中文字库四套不可合并；中文必须另立字库，故 4 是此案下限 |
| taste-skill | `no-footage` | 图片：双色套印位图构建期生成 AVIF（质量 80）；全站只有静帧 | habit | 规格自己以“凸版印刷打样机”为参照，一段走同一套双色套印的哑光循环本可放在第六块板之后 |
| impeccable | Hard offset shadows (`box-shadow: 4px 4px 0`) outside a neobrutalist world | 投影是按光源方向偏移 3px 的硬阴影而不是柔影 | earned | 同一条装置与 taste-skill 同判：此案有真实光向作依据，硬边由光源挣来，不是新拟物装束 |
| impeccable | A colored `border-left` or `border-right` above 1px on cards | 侧壁面用伪元素加 6px 到 10px 的 border-bottom 实现 | earned | 这条 border 就是板的物理厚度，原文禁止把玻璃简化成半透明矩形；非装饰色条（原条目为左/右，此处下缘） |

**非规则观察（不属于 taste-skill 52 条）**

- **六块同规格板的阵列化**：六块板规格几乎相同，只靠“第三块故意比其他块宽 48px”打破同一性——这更像卡片行的材质化改写，宽 48px 反而承认了阵列本身。（不属于 taste-skill 52 条）
- **性能预算自相矛盾**：“六块板各自独立合成层且限制为 3 层以内”把 6 与 ≤3 写在同一句里，实现时会得到两种互斥读法。（不属于 taste-skill 52 条）
- **污染层低于可见阈值**：指纹 3%、落灰 2% 的不透明度叠在透光率 72% 的琥珀板上，还要求“清晰边缘、直径 9mm”，机制被写进规格却几乎不可能被看见。（不属于 taste-skill 52 条）
- **“12°”兼指折射角与高光走向**：2:1 等距的板缘方向是 26.57°，规格又两次把高光写成“角度 12°”，两处口径未对齐。（不属于 taste-skill 52 条）
- **十字套准光标无测量功能**：1.2mm 错位是由纸上的套准标记读出的，光标不参与测量，属于装束（tells.md 把 crosshairs 归入 hairline/dashed 通道，但光标不是页面里的一条线，故不计入 52 条）。（不属于 taste-skill 52 条）
- **规格未覆盖 impeccable 的 Verify 项**：浏览器表面（选区、光标、滚动条、焦点环、表格数字应从调色板主题化）与正文行长 65–75ch 上限，全文一字未提；这两项不在 52 条内，也不属 impeccable 的 REFUSE 清单。（不属于 taste-skill 52 条）
- **判据说明（非规格现象）**：`palette-cream` 与 `palette-claude` 均未命中——象牙 #E8DCC8 的 L 为 0.847，比 cream 阈值 0.88 低 0.033；`palette-purple` 未命中，因 #8B5CF6 是规格点名要反的对象而非在用配色；`hero-words` 未命中，因探针用空格分词，无空格中文句只算 1 词；`still-page` 与 `few-pictures` 需实测移动元素数与图片数，规格未给，故不臆测计入。

**该案最致命的 1 条 tell**

规格把反 AI 的火力全部对准了紫青与半透明白卡（原文：“反的是深色底配 #8B5CF6 紫、#22D3EE 青的发光组合，也反 rgba(255,255,255,.6) 那种半透明白卡”），却让主色 24% 的面积停在 #C46A1F——按 rules.mjs 的 colourFamily，它的 HSL（h≈27、s≈0.73、l≈0.45）落在 terracotta 色族里。材质理由（琥珀亚克力、Amber 滤光片）确实挣来了“琥珀”这个色相，但读者看不到材质来源，只看到暖橙重音铺满整块主色面积。再叠上 Gloock 这类极高对比展示衬线、IBM Plex Mono 的技术数字、打样纸的裁切与套准标记，正好凑齐 tells.md 第三波所诊断的那套“warm it up and make it editorial”配方。它能逃过 `palette-claude` 只因为象牙 #E8DCC8 的 L 是 0.847，比 cream 阈值 0.88 低 3.3 个点——这是余量，不是决定。修法：把琥珀收进“透光处”而非板面，板体改用低彩度树脂棕，让颜色由光产生，而不是由色块产生。

**是否属于第三波 tell（是／否）：是。** tells.md 第 3 节原句为证：“Yellow-cream ground + terracotta / rust / clay accent | banned together; terracotta banned alone; cream warned”，S08 正落在“terracotta banned alone”这一句上；同节的总判断“The remedy published for the first two waves was 'warm it up and make it editorial'. Models adopted the remedy wholesale and it is now the most recognisable generated look of all.”也正是本案的读法。

### 4.9 S09｜蜡染价目板（Batik Price Board）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

**附注**：原输入在该案处另有一行编辑批注"分析完成。以下为裁定结果。"，该批注属于流程痕迹而非裁定内容，故不转录为结果、也不代填任何命中。

### 4.10 S10｜刻度对撞页（Grid Versus Sheet）

**三分计数**：taste-skill 命中 **9** 条：`earned` 4 / `habit` 5 / `indefensible` 0。impeccable 禁用清单命中 **1** 条：`earned` 1 / `habit` 0 / `indefensible` 0。**合计 10 条：earned 5 / habit 5 / indefensible 0。**

**命中表格**

| 来源 | 规则 ID / 条目名（taste-skill 必须用 52 条里的逐字 ID） | 证据原文引用（摘规格原文，≤40 字） | 裁定 | 理由（≤60 字） |
| --- | --- | --- | --- | --- |
| taste-skill | `palette-cream` | 「`#F2EFE8` 无光泽纸＝背景，58%」 | earned | 纸底是承印物，错位处露出的正是它；规格自报饱和 4.1% 是 HSV 口径，按 rules.mjs 的 HSL 口径 27.8% 才越过阈值。 |
| taste-skill | `mono` | 「刻度、报价与页码必须等宽对齐」 | earned | 刻度与打样编号是量具读数，等宽是读数能对齐的前提；craft-floor 明写为 code／data／measurement 开口。 |
| taste-skill | `font-count` | 「标题＝Jost…辅助数字＝IBM Plex Mono…中文主字体＝思源黑体」 | habit | 中文＋拉丁的脚本分工只挣来三款；第四款与 §11 已开的 `tabular-nums` 重复，可省一款。 |
| taste-skill | `body-size` | 「基线 8px，正文 15px／行高 1.7」 | habit | 15px × 1.7＝25.5px 行高本就不落在 8px 网格上；16px／24px 既过正文下限又回到网格。 |
| taste-skill | `hairline` | 「线宽 1.25px、方头、位置对齐到 0.5 单位栅格」 | earned | 套准线是读出 1–2px 错位的量具；规则自身豁免真实表格线，这些线承担读数而非分隔。 |
| taste-skill | `numbering` | 「每张表右侧带一列 5 位打样编号，等宽排列」 | habit | 流水号不给读者任何需要的信息（行身份是供应商名与到货周期）；编号应留给整张打样纸一处工序号。 |
| taste-skill | `few-pictures` | 「照片转双色（`#17171A` 与 `#D32029`）150 线网点」 | habit | 规格只给网点参数不给张数；比较页要过 ≥4 张，得拍到纸、网点、印版实拍，不是只写处理流程。 |
| taste-skill | `no-footage` | 「套准回位只用 `transform` 与 `opacity`」 | habit | 套准是这页的中心事件，一段真实走纸／合版的影像比 transform 模拟更诚实，规格未给影像。 |
| taste-skill | `still-page` | 「主机制＝套准回位」 | earned | 世界只有一个物理动作：两版收束到 1.5px；补每节入场或装饰动效会与 impeccable「one authored moment」相冲。 |
| impeccable | Hard offset shadows（`box-shadow: 4px 4px 0`）outside a world that is actually neobrutalist | 「红色的一栏永远压过相邻的黑栏 1px 到 2px」 | earned | 零模糊位移副本就是印版错位本身：量值 1–2px 可测、错位处露纸色、禁用描边——正是条目要求的世界。 |

**边界核对（不计入命中，均已真读源码复核）**

- `palette-terracotta` / `palette-purple` 不成立：`#D32029` 实测 h357° 落在陶土带 6–30° 之外，`#6E7076` s3.5%；`palette-claude` 需 cream＋terracotta 成组，故也不成立。
- `contrast` / `grey-body` 不成立：正文 `#17171A` 对 `#F2EFE8` 复算 15.58:1（规格写 15.86:1）；灰作文字为 4.31:1，而规格只把灰分给套准线与刻度。
- `numbering` 按 tells.md §4「Index numbering」的装置族计入；注意 rules.mjs 的匹配式是 `^0\d{1,2}$` 一类 0X／0XX 形态，5 位流水号本身不触发该正则。
- `mixed-font-headline` 不成立：中西文由同一 font stack 分工（probe 按声明族计数，单栈只算 1 族），只有行内 span 混排才触发。
- `few-pictures` / `no-footage` 的判据是张数与影像条数，规格只写处理方式，故按「只写流程」判 habit，而非按实测张数判 FAIL。

**非规则观察（不属于 taste-skill 52 条）**

1. **制版量具装饰层**（套准线组、色标条、照片边缘裁切十字、密度计梯形图标、L 形角线光标）——规格 §6 要求它「必须真实可见而不是装饰贴图」。判断：读错位的那几组有机制（1–2px 只有靠规线才读得出），但扩散到照片边缘、图标与光标之后就成了戏服。tells.md §4 正是点名的同一族：「Design-tool chrome as ornament: crosshairs, crop marks, selection handles, dashed guides, rulers | banned via hairline, dashed | Remove」。
2. **每页轮转的 2px 反规范误差**（§12）——规格自认「它不符合任何制版规范，也不影响阅读」。判断：habit。四角永远有一角偏 2px，读者就无法把另外三角的 1–2px 当真读数；签名与量具争抢同一套刻度，量具输。
3. **8px 基线网格与 25.5px 行高互不整除**——规格自称「两个可测量的不对称机制」，但被测量的网格自己不自洽（8 ∤ 25.5；1.25px 线宽也不落在它宣称的 0.5 单位栅格上）。判断：机制只写在文案里，没落在算术上。
4. **设计参数上页**（§9「红版错位量、套准线线宽、标题基线偏移量三个数值必须写在页面上」）——判断：habit。把作者的参数当内容，读者要的是 46 家供应商的到货周期，不是你的错位量；这与 tells.md §4「Agency micro-meta: … version stamps」同族。
5. **清单式规避**（§8 逐条「它故意反 C-1.3 与 C-2.18」「故意反 C-2.15」「故意反 C-2.11 与 P13」）——判断：habit。规格把禁令清单当交付物，自评 9.0 的依据是「每条都有数值」，而不是「每条都被这个世界挣来」，正落在 tells.md §8 的「avoidance aesthetic」：清单反的是观感，参数化不改变观感。

**该案最致命的 1 条 tell**

最致命的是那层制版镀铬：套准线、色标条、裁切十字、密度计梯形加上 L 形角线光标，它同时是这页的签名、结构、图标系统与光标。规格给它的辩护是「必须真实可见」——但「可见」只证明了它被画出来，没有证明它在读数；四角里永远有一角被 §12 故意偏 2px，更是把量具改成签名的收据。这正是 tells.md §4 那句「the first things a generator copies from the gallery, they carry no information」描述的装置：它从一个真机制（套印错位）出发，最后变成可无限复制的观感零件。一处结构性改动即可：只保留红栏压黑栏那道缝上的规线，让「哪一组更重」由 6:7:9:8:5 的栏宽比承担；色标条、角线光标与照片上的裁切十字整层删掉，而不是把它们调细调淡。规格 §9 自己写的风险是「最容易滑向瑞士风作品集」，而它给的三个规避动作（留白由栏宽算、三个数值上页、与方案 26 划清界限）没有一个碰到镀铬层，所以风险没有被规避，只被搬到了参数表里。

**是否属于第三波 tell：否**——第三波的定义是成组补救（tells.md §3：「The remedy published for the first two waves was "warm it up and make it editorial"」），本案 accent `#D32029` 实测 h357° 不在陶土带 6–30°，无衬线几何骨架、无衬线体 premium、无表演性标签；暖纸底命中的只是 §3 表里单列的「cream warned」，且规格取的是该行修正建议本身（低饱和骨白纸，HSV 4.1%）。它真正撞上的是 §4 画廊时尚的制版镀铬，不是第三波的暖色 editorial。

### 4.11 S11｜铁窗打字本（Samizdat Typewriter）

**三分计数**：taste-skill 命中 **4** 条：案首自报 `earned` 2 / `habit` 2 / `indefensible` 0，而表内逐行实为 `earned` 1 / `habit` 3（见下方口径注）。impeccable 禁用清单命中 **2** 条：案首自报 `earned` 1 / `habit` 1，表内逐行实为 `earned` 2 / `habit` 0。**案子级合计两种读法都是 6 条：earned 3 / habit 3 / indefensible 0。**

**命中表格**

| 来源 | 规则 ID / 条目名（taste-skill 必须用 52 条里的逐字 ID） | 证据原文引用（摘规格原文，≤40 字） | 裁定 | 理由（≤60 字） |
|---|---|---|---|---|
| taste-skill | `dashed` | 「相邻章之间空 3 个基线单位（24px）并压一条 1px 断针虚线」 | earned | 世界自述层级只能由印次与编号产生，断针枯墨虚线正是打字机件的印刷事件，不是装饰。 |
| taste-skill | `outlined-box` | 「规格表用 1px 实线框」「点击警示框会压出 1px 内凹槽」 | habit | 规格表与警示框都是真表格/真控件的法定用法，机制只要求编号分区，外框是手册惯性。 |
| taste-skill | `hairline` | 「相邻章之间空 3 个基线单位（24px）并压一条 1px 断针虚线」 | habit | 章间原本已有 24px 留白＋栏外悬挂编号，机制不缺结构线，细线是 1970s 手册的顺手件。 |
| taste-skill | `contrast` | 「批注色 `#6E7A64`（褪色复写批注灰绿，S 8.6%，脏色）5%」 | habit | 按声明值配纸色只到约 3.3:1（头 1.5 行截图、4.5:1 门），规格未给字号，褪色是借口不是机制。 |
| impeccable | Refuse · Surface habits —「Hard offset shadows…The zero-blur block shadow is a costume」 | 「方钢截面 8px、投影单向且硬边无模糊」 | earned | 规格把它归因于"窗外的方向光"，深度来自太阳而非 UI 卡片，符合"committed world 优先"原则。 |
| impeccable | Refuse · Surface habits —「Monospace as a costume for "technical"」 | 「规格表数字与引用编号 = Martian Mono 窄档」 | earned | 窄档直接对应打字机字距（measurement 用途），非把 mono 当作"技术感"外衣。 |

**口径注（原始数据自带冲突，照录不改写）**：案首自报与表内逐行在 taste-skill 侧与 impeccable 侧各差 1 条（案首把 taste-skill 的 1 条 `earned` 计成了 `habit`，把 impeccable 的 1 条 `earned` 计成了 `habit`）。本版 §二／§三 的逐规则计数一律采用**表内逐行**（表格是唯一可指名到具体 ID 的证据）；因两种读法下本案合计同为 `earned 3 / habit 3`，§六 的批次三分类总计不受影响。差异已登记于 §七 7.4。

**非规则观察（不属于 taste-skill 52 条）**

1. **单色复写青墨主色（自命名：复写青墨大色块）** —— `#1B4A4A` 色相 180°，不落入 `palette-purple`（244–295°）也不落入 `palette-terracotta`（6–30°）。但它在采样面达到 44%，是全案唯一大色块，"深青＝档案/机构"与靛蓝默认件同属一类机构色惯性，只是没被 52 条覆盖。**不属于 taste-skill 52 条。**
2. **纸色擦边未触发（自命名：低饱和暖灰纸底擦边）** —— `#DCDDD2` 的 L 84.5%、h 65.5° 都落在 `colourFamily` 的 cream 窗口（22–62°? 否；l≥0.88? 否），只因 S 5% < 16% 才躲过 `palette-cream`。机制上它确实"含木素泛灰绿"而非黄奶油，但离阈值只差饱和度一项。**不属于 taste-skill 52 条。**
3. **两位数字段悬空（自命名：批注字号缺失）** —— 规格给了批注色 5% 面积却没给字号/字重，使 `contrast` 无法机械复核（正文 13.32:1 合格，批注约 3.3:1 悬空）。**不属于 taste-skill 52 条。**
4. **双"印刷谱系"衬线（自命名：时代同源字体对）** —— Redaction（版画衬线）＋霞鹜文楷（楷体）的差异写在超家族上，读起来仍同属"复古印刷"一档；规格自称"性格相反"略高于实际。**不属于 taste-skill 52 条。**
5. **无视频/无大图主视觉被自我声明** —— 规格第 10 节明说"本方案没有动态主视觉"，本应触发 `no-footage` 与照片类规则，但这是规格级声明而非页面实测，故不计数（此处不属 52 条命中）。**不属于 taste-skill 52 条。**

**该案最致命的 1 条 tell**

最致命的是 `hairline`／`outlined-box`／`dashed` 这一组细线：规格第 8 节把"全站只用 `#DCDDD2` 一种底"当作去 AI 味战功，可它换来的结构代价，是靠 1px 虚线、1px 表框与 1px 内凹槽把版面缝起来，于是零圆角＋细线＋密栏三件同时到位——这正是 tells.md 第三波点名的排版套路。它的自辩逻辑是"层级靠印次与编号，不靠颜色与阴影"，这句话本身是成立的；问题是当它失去颜色与阴影后，实际抓的仍是印刷品最方便的那件道具，而不是留白与编号。若把那条断针虚线换成 24px 留白＋悬挂编号的强制对齐，机制毫无损失，视觉反而更接近它自称的"油墨衰减"世界。换句话说：这一组线不是世界挣来的，是"严肃出版通常这么排"顺手加的。

**是否属于第三波 tell（是／否）：是（部分命中）** —— 引 tells.md 原句为证：

> 「Broadsheet cosplay: hairline rules everywhere, zero radius, dense columns」

以及第三波的总判词：

> 「The remedy published for the first two waves was "warm it up and make it editorial". Models adopted the remedy wholesale and it is now the most recognisable generated look of all.」

（须说明：S11 并未落入第三波被禁的调色板行「Yellow-cream ground + terracotta / rust / clay accent」——纸色 S 仅 5% 且主色为复写青墨，规则原文不予命中；它命中的是同一波里"用排版修复换掉 AI 味"的那一层。）

### 4.12 S12｜青柠挖空墙（Lime Knockout Wall）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

**附注**：不得引用 v1 对 S12 的裁定代填。

### 4.13 S13｜盲压公函（Blind-Emboss Dispatch）[高危改造]

**三分计数**：taste-skill 命中 **10** 条：`earned` 5 / `habit` 5 / `indefensible` 0。impeccable 禁用清单命中 **3** 条：`earned` 3 / `habit` 0 / `indefensible` 0。**合计 13 条：earned 8 / habit 5 / indefensible 0。**

**命中表格**

| 来源 | 规则 ID / 条目名（taste-skill 必须用 52 条里的逐字 ID） | 证据原文引用（摘规格原文，≤40 字） | 裁定 | 理由（≤60 字） |
|---|---|---|---|---|
| taste-skill | `shadow` | "凹槽用单向内阴影加单向外接触阴影两条实现" | earned | 无墨、无色差，凹槽只能靠受光/背光两侧明暗被看见；撤掉阴影即撤掉全部层级与可读性。 |
| taste-skill | `button-fx` | "光源反转只改两个阴影色值不做逐帧动画" | earned | 按压反馈不用位移、不用内外阴影切换，而反转同一光源；两个阴影色值就是这世界的按压机制。 |
| taste-skill | `mono` | "函号、日期、编号 = DM Mono" | habit | 公文格式把发文字号、成文日期排在宋体里；替代机制＝文津宋体＋表格数字与字距，日期并不需要等宽。 |
| taste-skill | `hairline` | "并压一条 1px 的压痕线（不是画出来的线，是压出来的槽）" | earned | 无墨就画不出描边，正件/附件分界只能用同一台压印机压出，且全文只此一条；若 16 栏栏线落成可见竖线则退回 habit。 |
| taste-skill | `font-count` | "标题用 EB Garamond…正文用文津宋体…辅助数字与函号用 DM Mono" | habit | 三面里只有第三面（等宽）不为机制所需；去掉它即回到两面，中英混排有字面覆盖的理由。 |
| taste-skill | `body-size` | "条款正文 = 文津宋体 15px / 行高 1.75" | habit | 15px 在桌面低于 16px 下限，也低于它自己引的公文正文级；替代＝16–17px，3% 凹槽也更好辨。 |
| taste-skill | `mixed-font-headline` | "抬头与条款标题 = EB Garamond 加文津宋体宽排（字距 0.06em）" | earned | 汉拉分属两套字面，标题行内换面是字库覆盖所逼，不是塞一个意大利体词；斜体档只作字面属性。 |
| taste-skill | `font-fallback` | "文津宋体按 GB2312 一级字库子集"；文案"2024-徵-017" | habit | 徵 U+5FB5 在 GB2312 属二级（首字节 E1，区位约 65），一级子集不含它，函号必落系统字体；按实际用字取子集即可。 |
| taste-skill | `palette-cream` | "背景色 #F4E3BE（盲压棉纸老龄泛黄…明度 85.1%）56%" | earned | 地面就是纸本身（无墨即无彩色层），黄来自棉纸老龄；金 #7B612C 色相 40.2°／明度 32.7% 在 terracotta 带外、无配对；判据带界 l≥88%，本例 85.1% 贴边。 |
| taste-skill | `no-footage` | "四是图像处理，文件翻拍一律用 45° 侧光拍摄以留下真实阴影" | habit | 它自我要求"首屏工艺证据"，一段哑音循环的压印过程（poster 帧、压成纸/墨双色阶）比静物更贴题；静照是默认选择。 |
| impeccable | Monospace as a costume for "technical" rather than for code, data, or measurement | "字腔偏机械，与公文正文拉开字宽" | earned | 该条自身豁免 data／measurement，函号、日期、编号是公文数据字段；但这与 taste-skill 的 mono 全禁口径相冲突。 |
| impeccable | Hard offset shadows (`box-shadow: 4px 4px 0`) outside a world that is actually neobrutalist | "不得用两枚对称阴影（如 8px 8px #d1d1d1 配 -8px -8px #ffffff）伪造凸起" | earned | 这个世界选的深度系统是单向硬光＋接触阴影，零模糊对称双阴影那套 costume 被规格明文排除，故被机制挣回。 |
| impeccable | Light or dark picked by category. Pick it from the use scene | "单向硬光源方位角常驻 135°（误差 ±10°）" | earned | 无墨凹槽只有单一硬光才有读数方向，且规格声明了适用场景（档案/合同后台）并主动排除低光、强光环境。 |

**非规则观察（不属于 taste-skill 52 条）**

1. 「无墨宣言与墨色面积冲突」〔不属于 taste-skill 52 条〕：第 1 节写"全文没有一处墨色差"、Y 清单写"全程无墨"，但配色给正文墨 `#241F17` 27%、主色 9%。若条款标题真只靠 0.4mm 凹槽被读出来，它就与纸同色（≈1:1）——这正是 taste-skill `contrast` 与 craft-floor 4.5:1 底线会显形的地方；规格自检只报正文 12.68:1，绕开了标题。
2. 「『烫金只点一个位置』与 9% 金色面积冲突」〔不属于 taste-skill 52 条〕：借来的机制说"用多了就变成贴纸"，但 M-40 自己把主色面积定为 9%，另有按钮、悬停、转场参与；用面积自证与 2 号方案的差别，等于让机制被数字推翻。
3. 「页面虚拟光与自有翻拍光不一致」〔不属于 taste-skill 52 条〕：UI 硬光常驻 135°，图像却"一律用 45° 侧光拍摄"；同页两套光向，凹槽与翻拍图会在同一屏上互相拆台。
4. 「跟随光标的 6×6px 压痕」〔不属于 taste-skill 52 条〕：机制不要求指针变成压痕，且 craft-floor 把光标、选区、滚动条、焦点环列为必须从调色板主题化的浏览器表面；小方块随鼠标压过正文，缩略图里读作脏点。
5. 「把工艺参数写进用户文案」〔不属于 taste-skill 52 条〕：按钮"按下即签发（注意光源会反转）"、错误"错误码 EMBOSS-13：光源方位角没能在 120ms 内由 135° 翻到 315°"。craft-floor 的 Copy 段要控件命名动作、错误命名问题与恢复；这里命名的是机器的内部参数。
6. 「衬线＝高级」与「宽字距 0.06em」〔均不属于 taste-skill 52 条〕：前者正是 tells.md 第三波登记的 "High-contrast or soft serif display as the shortcut to 'premium' | no rule"，后者在 taste-skill 里只有 eyebrow／micro-label 沾边、标题宽排本身无 ID。
7. 「16 栏『栏线细分』」〔不属于 taste-skill 52 条〕：若这些栏线落成可见竖线，会同时踩 taste-skill `hairline`（≥2 即 FAIL）与 tells.md 第三波 "broadsheet cosplay"；规格没写栏线是否可见，故不计命中，但它是本方案最可能塌陷的实现点。
8. 「末字压深降到 0.25mm ＋ 1.5px 未压满浅槽」〔不属于 taste-skill 52 条〕：签名式怪癖在真实质检与缩略图里会被读成压印失败（缺字），与"让读者知道机器也会累"的意图相反。

**该案最致命的 1 条 tell**

最致命的一条是第三波那套"把解药整体照抄"的表面：泛黄棉纸底＋零圆角直角铅字块＋16 栏细分栅格＋1px 压痕线＋老式衬线抬头，tells.md 第三波恰好把这组命名为 "Broadsheet cosplay: hairline rules everywhere, zero radius, dense columns"。它之所以致命，是因为它的层级不是看出来的，而是算出来的：分区、标题、状态全靠一个 3% 亮度差（M-40 自己写着"盲压区与背景亮度差 3%"），这在任何对比度底线前都约等于 1.06:1，读者能验证的只有烫金块与骑缝章方框——也就是第 6 节第五点专门放的那个"高对比参照物"。于是"工艺"变成一串可打勾的数字（135°／0.4mm／3%／14%／120ms／0.8px），图像证据却只到 45° 侧光静照，连一段压印过程都没有（taste-skill 的 no-footage 正为此而设）。规格自己承认它在低亮度屏与强光下几乎不可辨，却仍把 135° 硬光写成常驻常量。tells.md §8 说"避免美学"本身就是 tell（"A page with every tell removed and nothing put in their place is an empty page with good manners"），而 S13 的替代物是一台只存在于文档里的压印机。

**是否属于第三波 tell：是** —— tells.md §3 原句为证：「The remedy published for the first two waves was "warm it up and make it editorial". Models adopted the remedy wholesale and it is now the most recognisable generated look of all.」同表还列有「Broadsheet cosplay: hairline rules everywhere, zero radius, dense columns | banned via hairline」与「High-contrast or soft serif display as the shortcut to "premium" | no rule」，S13 三条全占。

### 4.14 S14｜零重力发射序（Zero-G Launch Sequence）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

**附注**：不得引用 v1 对 S14 的裁定代填。

### 4.15 S15｜渔场平面簿（Fishery Floor Ledger）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.16 S16｜速度斜排宣言（Velocity Slant Manifesto）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.17 S17｜税票存根联（Revenue Stamp Stub）

**三分计数**：taste-skill 命中 **6** 条：`earned` 5 / `habit` 1 / `indefensible` 0。impeccable 禁用清单命中 **3** 条：`earned` 3 / `habit` 0 / `indefensible` 0。**合计 9 条：earned 8 / habit 1 / indefensible 0。**

**命中表格**

| 来源 | 规则 ID / 条目名 | 证据原文引用 | 裁定 | 理由 |
|---|---|---|---|---|
| taste-skill | `mono` | 金额、税率、编号 = Sometype Mono 并启用表格数字特性 | earned | 小数点对齐是列机制；craft-floor 的 monospace 禁令自留 data/measurement 例外 |
| taste-skill | `hairline` | 明细行之间不留额外间隙（靠 1px 浅色行线分隔） | earned | 行线就是真实账表的行规则；规则原文只许 real tables，探针 formish 亦豁免 |
| taste-skill | `body-size` | 明细行文字 = 文津宋体 14px / 行高 1.6 | habit | 15px×1.6 正好落满 24px 行高，机制不逼出 14px；正文提到 15px 即可 |
| taste-skill | `font-count` | 中文主字体用文津宋体…数字与金额用 Sometype Mono | earned | 汉字刻版、拉丁抬头、等宽数字三套字符集互不覆盖，职责不可互换 |
| taste-skill | `mixed-font-headline` | 单据抬头与条款标题 = Literata 加文津宋体窄排 | earned | 两族按文种分工，不是句中换体强调；西文字面里根本没有汉字 |
| taste-skill | `focal-point` | 齿孔线与合计行固定在视口底部上方 64px，始终可见 | earned | 票据世界无展示级字号；首屏主导物是固定合计行与骑缝章这个色彩事件 |
| impeccable | Monospace as a costume for "technical" rather than for code, data, or measurement | 金额列宽固定 96px 且右对齐 | earned | 用途正是该条自留的 data/measurement，不是"技术感"装饰 |
| impeccable | The hero-metric template: big number, small label, supporting stats, accent | 本期应缴 12,480.00 元，其中 3 笔跨月未销账 | earned | 票据存在的目的就是应缴额，合计行还是骑缝章校验的锚点 |
| impeccable | Light or dark picked by category. Pick it from the use scene | 背景色 #E1D6BD 税票纸（未涂布证券纸…） | earned | 光的取值来自载体本身（证券纸），不是品类默认或情绪默认 |

**判据核对（未命中项，按 [rules.mjs](tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs) 与 [probe.mjs](tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs) 的实现算）**

`palette-cream` / `palette-terracotta` / `palette-purple` / `palette-claude` 均不触发——纸底 #E1D6BD 是 h42 / s0.38 / l0.81，cream 需 l≥0.88，仅差 0.07 落空；印花红 #7A2E2E 是 h0 / s0.45 / l0.33，不在 terracotta 的 h6–30 与 l0.42–0.72 内；紫墨 #5A2A50 是 h312.5 / l0.26，不在 ai-purple 的 h244–295 与 l0.3–0.8 内。`contrast` 不触发：实测 7.73:1（紫墨/纸）、6.45:1（印花红/纸）、6.1:1、5.09:1，全部 ≥4.5；规格自己否掉的 #111111 压紫墨确为 1.69:1。`dashed` 不触发：齿孔是 SVG `<pattern>` 圆孔，且探针注释明写 ≥3px 圆点边算绘制齿孔而非发丝线。`still-page`（≥8 个元素动）、`empty-screens`（纸色块＋齿孔图案＋密行）、`first-action`（存根撕口在首屏且 44px 热区）同样不触发。

**非规则观察（不属于 taste-skill 52 条）**

- **设计工具镀铬式十字光标**：§7「光标：14px 十字加 1px 方框，进入金额列时方框变为票据外框形」。不属于 taste-skill 52 条（52 条没有任何光标规则），但它正落在 [tells.md](tools/taste-skill/skills/taste-skill/references/tells.md) §4「Design-tool chrome as ornament: crosshairs, crop marks, selection handles, dashed guides, rulers」的点名禁用项里，而机制上并不必要：金额列由固定 96px 列宽与小数点对齐已经表达完毕。
- **参数化可信度（用小数代替论证）**：§8「票据的可信度由 0.4px 与 0.8px 两级线宽、2mm 盖章偏移与小数点对齐三个数承担」。不属于 52 条；把可信度押在小数精度上，是"看起来被精确决定过"的痕迹，而不是内容提出的要求。
- **伪造出处的签名式怪癖**：§12「永远多出一枚倒置的 1.2px 齿孔，位置在第 3 孔与第 4 孔之间」，自称来自「连张印刷被裁切机多打一孔的实况」且「不影响撕口对齐」。不属于 52 条；一个自愿声明不承担功能的装饰孔，加一段无法证伪的印刷史小故事，是考据皮而不是信息。
- **自证口径与陈旧校验行**：§3「本方案唯一的背景色是 #E1D6BD，此色不作背景」，同一句却把 #C9BFA6 定为「存根联专用压纸色」占 8%（它必然成块出现）；「饱和 16%」按规格自己引用的同一个 hsl() 公式算出来是 38%；§3 算 7.73:1，校验行写 8.15:1 并注明「07 号实测」；§4 写文津宋体「发布页须复核」，校验行写「字体授权已核」。不属于 52 条（`contrast` 本身未命中，因为所有已声明的配对比值都 ≥4.5）。
- **字号阶梯缺位**：全案唯一被指名的字号是「明细行文字 = 文津宋体 14px」，display / heading / lead / body / small 五级无一给值。不属于 52 条；连带后果是 `covered-text`、`pinned-over-picture`、`long-pin`（[inspect.mjs](tools/taste-skill/skills/taste-skill/scripts/inspect.mjs) 里都以 ≥32px 大字为触发前提）在本方案里连触发条件都不存在。

**该案最致命的 1 条 tell**

它把第三波那副「暖化 + 编辑化」的补救方子整装穿在一张 1900 年代税票上：黄调纸底（#E1D6BD，h 41.7° / 饱和 38% / 明度 81%）＋锈红印色（#7A2E2E）＋衬线体系＋零圆角＋满铺发丝线＋「学术档案 / 严肃出版」的调性。单拆开每条几乎都挣得来——行线是真账表的行规则、印泥红是印章的物理色、等宽是小数点对齐的列机制——但合起来正是 [tells.md](tools/taste-skill/skills/taste-skill/references/tells.md) 第三波点名的整装外观："now the most recognisable generated look of all"。规格的辩护本身就是破绽：§8 第二把「全部容器直角」当成反 AI 味的手段，而「零圆角 + 满铺细线 + 密栏」恰是第三波里要被 hairline 判掉的那一套。更硬的一处是它用「饱和 16%」证明自己「整体偏中性而非褐黄」，而同一个公式算出的是 38%、色相 41.7° 正落在 cream 家族的 22–62° 内，只是明度 0.81 差 0.07 没够到 0.88 的阈值——它用一个算错的数字解释自己为什么不算第三波。与此同时真正该由机制负责的东西全部空缺：字号阶梯只有一个 14px，首屏主导物没有落成尺寸，校验行还留着别的方案的实测值（8.15:1 / 07 号）。

**是否属于第三波 tell：是。** tells.md §3 开篇原句为证——"The remedy published for the first two waves was 'warm it up and make it editorial'. Models adopted the remedy wholesale and it is now the most recognisable generated look of all."；同表命中三行："Yellow-cream ground + terracotta / rust / clay accent | banned together; terracotta banned alone; cream warned"、"Broadsheet cosplay: hairline rules everywhere, zero radius, dense columns | banned via hairline"、"High-contrast or soft serif display as the shortcut to 'premium' | no rule"。

### 4.18 S18｜磷光检修台（Phosphor Service Deck）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.19 S19｜铜版标本柜（Copperplate Herbarium Cabinet）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.20 S20｜针笔声场图（Plotter Soundfield）

**三分计数**：taste-skill 命中 **7** 条：`earned` 4 / `habit` 1 / `indefensible` 2。impeccable 禁用清单命中 **4** 条：`earned` 4 / `habit` 0 / `indefensible` 0。**合计 11 条：earned 8 / habit 1 / indefensible 2。**

**命中表格**

| 来源 | 规则 ID / 条目名 | 证据原文引用（≤40 字） | 裁定 | 理由（≤60 字） |
|---|---|---|---|---|
| taste-skill | `mono` | 坐标、段数、频率 = Martian Mono 窄档 | earned | 读数是必须对齐的测量值，等宽由数据挣来，不是"技术感"装束 |
| taste-skill | `font-count` | 标题与参数标签用 Space Grotesk；…坐标与参数读数用 Martian Mono | earned | 拉丁标题／中文正文／测量读数三类各有任务边界，中文必须另有 CJK 字族 |
| taste-skill | `hairline` | 面板与画布之间靠 1px 线与留白分隔 | earned | 这个世界禁投影、禁填充，绘图规矩线是唯一还能分隔面板的手段 |
| taste-skill | `body-size` | 说明文字 = 思源黑体 Regular 15px / 行高 1.8 | habit | 图纸机制不要求 15px；正文提到 16–17px，层级改由字重与留白承担 |
| taste-skill | `still-page` | 参数变化时用 requestAnimationFrame 每帧只更新路径的 d 属性 | earned | 笔的运动只能是走线几何，transform 式入场不属于绘图仪世界；已有 1400ms 起笔与降级 |
| taste-skill | `few-pictures` | 本方案不引入任何位图纹理与颗粒，所有图形一律矢量化输出 | indefensible | 纸、笔、绘图仪都可实拍；排除位图的理由只是与同批方案区隔，不是物理限制 |
| taste-skill | `no-footage` | 本方案不引入位图，所有图形矢量输出 | indefensible | 针笔走线本身可拍实录，规格却只给"拉开批次距离"作理由，等于没做决定 |
| impeccable | Monospace as a costume for "technical" rather than for code, data, or measurement | 坐标与参数读数用 Martian Mono（可调宽度等宽） | earned | 该条自己豁免 code/data/measurement，这里正是滚动改写的测量读数 |
| impeccable | The hero-metric template: big number, small label, supporting stats, accent | 主张句「当前参数：频率 220Hz，振幅 0.62，走线 1840 段」 | earned | 读数被滚动真实改写，是仪器状态显示，不是营销统计数字的堆叠 |
| impeccable | Sparklines, progress rings, and soft-shadowed rounded rectangles standing in for content | 图的形状完全由输入音频与参数决定 | earned | 图是输入音频的真实输出，不是替代内容的装饰性假图表 |
| impeccable | Light or dark picked by category | 底必须是图纸白且只允许一个值，禁止深色模式切换 | earned | 浅底取自绘图仪纸与挂墙工作场景（谁、在哪、什么环境光），非按品类默认选浅色 |

**非规则观察（不属于 taste-skill 52 条）**

- **滚动劫持／滚动即调参**："滚动量映射为参数值而不是位移，每滚 100px 相当于频率档位走一格"。52 条里没有任何 ID 覆盖滚动语义，键盘、触控板惯性、屏幕阅读器与"页面还能不能正常滚"都无人检查（规格只在 reduced-motion 下退回正常滚动）。
- **设计工具镀铬（十字光标）**："光标：16px 细十字加 0.35px 单圈，与图上的线宽一致"。tells.md 第四节把 crosshairs、crop marks、dashed guides、rulers 列为"画廊时尚，按行规禁用"，但 52 条里没有对应 ID（该条声明用 hairline/dashed 代检，而 16px 光标不会触发任何阈值）。本方案里它由测量仪器机制挣来，属"机制成立、注册表未覆盖"。
- **亚像素级差当图例**："间距 0.6px / 1.2px / 2.4px 三级分别对应三个量级"。1x 屏上 0.6px 的级差不可辨，图例承载的编码会失效；无 RULE_ID。
- **刻意的机械误差当人味签名**："它永远比理论原点向左下偏 0.6px"。回差机制上真实，但 0.6px 不可见，只对作者自己有意义，接近表演性不完美；无 RULE_ID。
- **浏览器原生表面未交代**：选区、caret、滚动条、焦点环、表格数字等（impeccable 的 Verify 段，非 Refuse 段）在整份规格里一次也没出现；不属于 taste-skill 52 条。

**该案最致命的 1 条 tell**

它把"反 AI 味"本身做成了外观——规格用图纸白 `#FAF3E1` 取代纯白，并自陈"图纸白比纯白低 5 级亮度且偏暖 2 级"，再用 0.2px 网格、零圆角与 Martian Mono 读数把页面收成一册工程图纸。这正是第三波登记的那个补救动作：把页面"暖化并编辑化"，而它现在是最好认的生成外观。代价是页面没有一处非生成的原料：无照片、无录像，连主视觉也是参数实时重绘的矢量线，而排除位图的理由写的是"以此与全批其它方案的颗粒材质拉开距离"——那是批次策略，不是这个世界的物理。附带一句工具口径：palette-cream 要求 s≥16%，图纸白只有 s=10%，所以检查器不会开这一枪，但眼睛读到的仍是奶油纸底。

**是否属于第三波 tell：是。** tells.md 原句："The remedy published for the first two waves was 'warm it up and make it editorial'. Models adopted the remedy wholesale and it is now the most recognisable generated look of all."（同表第三波条目另有 "Yellow-cream ground + terracotta / rust / clay accent | banned together; terracotta banned alone; cream warned"。注：这条 tell 里的等宽"技术声"与细线一半在同一注册表第四节"gallery fashion"，不属第三波。）

### 4.21 S21｜联锁释放簿（Interlocking Release Book）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

**附注**：不得引用 v1 `-retry5.md` 对 S21 的补跑结果代填（那属于 v1 的混合词汇口径，且 `-retry5.md:58` 自陈该案"案首与表内不一致"）。

### 4.22 S22｜糊窗对折册（Paper-Screen Folded Sheet）

**三分计数**：taste-skill 命中 **6** 条：`earned` 4 / `habit` 2 / `indefensible` 0。impeccable 禁用清单命中 **4** 条：`earned` 3 / `habit` 1 / `indefensible` 0。**合计 10 条：earned 7 / habit 3 / indefensible 0。**

**命中表格**

| 来源 | 规则 ID / 条目名（taste-skill 必须用 52 条里的逐字 ID） | 证据原文引用（摘规格原文，≤40 字） | 裁定 | 理由（≤60 字） |
|---|---|---|---|---|
| taste-skill | `mono` | 辅助数字用 `IBM Plex Mono`（页码与字数统计） | habit | 页码列对齐用仿宋或 Petrona 的 tabular-nums 即可；机制不要求第三款等宽字，等宽是"技术感"顺手件。 |
| taste-skill | `body-size` | 承担全部中文标题与正文，15.5px、行高 1.9 | habit | 1.9 行高补了仿宋小字面的可读性，但 16px 地板可满足；17/15.5 的档差是选择，可改由透光差表达。 |
| taste-skill | `focal-point` | 第一眼看到的是"折"这个动作，而不是一句话 | earned | 首屏支配物是结构（88px 折痕带＋18% 透光差）而非字或图；17px＝1.3vw＜4.5vw。若标题非 h1，同因判 no-hero。 |
| taste-skill | `numbering` | 镜像内容收成 4 条摘要并保留页码 | earned | 折页册的页码是"翻到第几折"的真实坐标，有折痕墨点锚点配套，序号本身携带信息，不是装饰索引。 |
| taste-skill | `hairline` | 折痕保持 2px 阴影与 1px 毛口 | earned | 1px 毛口是折痕的纸纤维边缘、取自撕纸扫描件；规格明写"不是分割线"且"折痕不进 DOM 边框"。 |
| taste-skill | `shadow` | 折痕阴影从 2px 加深到 6px | earned | 深度来自写死的左上光源与折的物理加深，页内无浮起元素；滚动加深对应折痕变深，非卡片投影。 |
| impeccable | Hard offset shadows outside a world that is actually neobrutalist | 3px 宽的单向暗带（暗来自左上） | earned | 该世界确实选定了硬边定向暗带并把光源方向写死，属纸的深度系统，不是新粗野主义装束。 |
| impeccable | A colored `border-left` or `border-right` above 1px on cards, list items, callouts, or alerts | 容器只用折痕的单向暗带与纸纤维边 | habit | 中缝只有一道折；把同一条暗带复制给每个容器是"每张卡加一条左条"的习惯，容器可由透光差定义。 |
| impeccable | Monospace as a costume for "technical" rather than for code, data, or measurement | 辅助数字用 `IBM Plex Mono`（页码与字数统计） | earned | 条目原文把 measurement 排除在禁令外：字数统计是量测数据，等宽在此承担数值对齐；与 taste-skill mono 判法分歧。 |
| impeccable | Section numbers (01 / 02 / 03) unless the sequence itself carries information the reader needs | 手写墨点作为页码锚点 | earned | 折痕把文章切成可数的折，页码是读者需要的定位信息，正落在条目原文的例外里。 |

**未命中/未计入说明（不计入上面的命中数，均可回查源码阈值）**

`palette-cream` 未命中——底 `#DDDAD4` 换算 HSL 为 h40 / s11.7% / l84.9%，`colourFamily` 的 cream 门槛是 s≥16% 且 l≥88%，两条都没过（规格自写的"饱和 4.1%、明度 84.9%"也低于门槛），若命中应判 earned（未上浆和纸的反射偏暖）；`font-count` 未命中——三款字体里 `IBM Plex Mono` 只承担页码与字数统计，字符占比低于 `realFams` 的 2% 门槛，实际只算 2 款；`contrast / grey-body` 未命中——`probe` 跳过 `color` alpha<0.99 的文本，且 `bgBehind` 一遇绝对定位层就返回 null，而规格要求"对折用两层绝对定位"，所以 12% 镜像层与 22% 幽灵层都进不了 `lowContrast`；`covered-text / clipped-text / long-pin / pinned-over-picture` 未计入——分别要求字号 ≥24 / ≥40 / ≥32 / ≥32px，本方案最大字号 17px，机制上全部失效；`still-page` 未计入——要求加载＋滚动中 ≥8 个元素动过（`MOTION_MIN = 8`），规格加载只动纸底与上下两张，取决于实现；`few-pictures / no-footage` 未计入——规格只写"图片只收和纸静物与手部劳作特写"，既没图片数量也没视频，成片若少于 4 张图或无视频即 FAIL/WARN。另需注意规格内部数值不一致：配色系统写正文 10.22:1、主色 S 11%，自评写"饱和度 9.7%"，校验写"正文对比度 11.89:1（07 号实测）"。

**非规则观察（不属于 taste-skill 52 条）**

1. **中缝强制停顿（滚动劫持）**——不属于 taste-skill 52 条。规格："滚到中缝时页面停 300ms 并把折痕阴影从 2px 加深到 6px，再继续"：它打断了滚动动量；降级段只写"翻折与折痕加深停止推进"，没有点名这个停顿。替代做法是让加深随滚动连续完成，不插入时间门。
2. **回弹过冲缓动（bounce easing）**——不属于 taste-skill 52 条（tells.md §7 把 bounce easing 登记为 motion tell，但 52 条里没有对应 ID）。规格："缓动性格为纸张回弹 `cubic-bezier(0.34,1.2,0.64,1)`，允许 3% 过冲"：折痕加深是光的深浅变化，光不会过冲；过冲应只留给真正的纸张形变（翻折转场）。
3. **整页替换系统光标，且交互状态只覆盖一部分**——不属于 taste-skill 52 条。规格："整页光标为 24px 自绘折角标记（左上缺角的正方形）"；交互枚举只有滚动、悬停、加载、转场、光标、微交互、降级，没有 disabled、error、focus 三态。光标属于"你没有画、但它仍然承载设计"的那一层（impeccable craft-floor 的 Browser surfaces 段），换成 24px 自绘图形会牺牲指向精度与可预期性。
4. **6×6px 墨点当页码锚点**——不属于 taste-skill 52 条。规格："中缝出现一枚 6×6px 手写墨点作为页码锚点"：作为可寻、可点的锚点，它小于任何可用的命中目标；它也是全页唯一"手写"痕迹，与"纸上的墨"并非同一机制。
5. **把"光"的判读外包给显示器环境**——不属于 taste-skill 52 条。规格："验收环境写明为 sRGB、屏幕亮度 ≥120cd/m²、色准 ΔE ≤3，低于该环境时透光差会退化，需回退到 2px 的实色折痕"：全案唯一的分区手段（18% 透光差）在未校准屏幕上退化成一条实色带，等于把核心机制押在观众的硬件上，而规格只承诺了回退、没承诺回退后仍能分区。

**该案最致命的 1 条 tell**

最致命的一条是把整套字号压在 15.5–17px：规格只给两档——"上半页字号 17px、下半页 15.5px"，档差 1.5px，全页最大字号 17px 在 1280px 上只有 1.3vw，唯一更大的只有镜像层和折痕。在 taste-skill 的实现里，桌面标题从 26px 起（`headingMin = Math.max(26, W * 0.019)`），covered-text / clipped-text / long-pin 分别从 24 / 32 / 40px 起，所以这个方案对整套"标题与滚动"规则是隐形的——不是合规，而是工具找不到可判的对象，首屏也就没有支配物（focal-point，或标题未标 h1 时的 no-hero）。机制上折痕、透光与镜像都不要求把字压小：7px 基线与仿宋字面只锁到 15.5px，17px 是选择而非纸的必然。而这恰是第三波"warm it up and make it editorial"的标记：低对比衬线标题（Petrona 横竖对比仅 1:2.4）＋暖灰纸底＋超大留白，用来冒充 premium；impeccable 的 Verify 段要求的正是"obvious scale and weight steps"，本方案没有给出。规格自己写下了这个风险（"最容易滑向'莫兰迪色加超大留白的侘寂摆拍'"），但规避动作只锁了留白与透光的数值，没有锁字号档差。

**是否属于第三波 tell（是／否）：是。** tells.md 原句："The remedy published for the first two waves was 'warm it up and make it editorial'. Models adopted the remedy wholesale and it is now the most recognisable generated look of all."；其登记表同节亦列 "High-contrast or soft serif display as the shortcut to 'premium' | no rule | The dealt type system, whatever class it is"。

### 4.23 S23｜剥落年代墙（Exposed-Plaster Chronology Wall）

**三分计数**：taste-skill 命中 **7** 条：`earned` 2 / `habit` 5 / `indefensible` 0。impeccable 禁用清单命中 **2** 条：`earned` 1 / `habit` 1 / `indefensible` 0。**合计 9 条：earned 3 / habit 6 / indefensible 0。**

**命中表格**

| 来源 | 规则 ID / 条目名 | 证据原文引用 | 裁定 | 理由 |
|---|---|---|---|---|
| taste-skill | `mono` | 辅助数字用 `JetBrains Mono`（层位号与年代必须等宽对齐） | habit | 机制只要等宽对齐；正文宋体 tabular-nums 即可，等宽是为技术感顺手加的第三款 |
| taste-skill | `font-count` | 标题用 `Alfa Slab One`…辅助数字用 `JetBrains Mono` | habit | 板衬线＋中文宋体是机制所需；去掉只为数字对齐的等宽即回两款 |
| taste-skill | `mixed-font-headline` | 主张句…最早的一层是 1936 年的铅红。 | habit | 句中年份跳脸是装饰性换脸；年份改用正文宋体等宽数字，语句仍成立 |
| taste-skill | `hairline` | 层与层之间是 1px 的白色石灰线 | earned | 1px 石灰线是灰泥层界（材料接缝）而非版式分隔线，无它相邻层无法计数 |
| taste-skill | `numbering` | 读年代靠数"铲掉了几层"；96px 的"层位索引"竖栏 | earned | 层位号是信息本身（年代＝数出的层数），不是 01/02 式装饰序号 |
| taste-skill | `gradient` | 用 1px 的 `linear-gradient` 硬停取色出单色实线 | habit | 墙面物理只要一条 1px 硬线；实色块/border/SVG 线同样成立，渐变函数是手法 |
| taste-skill | `side-scroll` | 层位索引转为主张句下方可横滑的层位条 | habit | 9 个 40×24 号牌折成 5+4 两行即可，纵向层序与深度同向，无须横滑 |
| impeccable | Section numbers (01 / 02 / 03) unless the sequence itself carries information the reader needs. | 层位号牌挂在每处剥落的左下角，牌面用刀刻层位号 | earned | 顺序即读者需要的信息：年代由铲掉几层读出，不是 01/02/03 |
| impeccable | Geometric masks standing in for organic contours. | 剥落断面用 `clip-path: polygon()` 做单层实色 | habit | 平涂面需边界，多边形可留；但吸附 8px 栅格非断口物理，应按 62° 铲痕轨迹生形 |

**非规则观察（不属于 taste-skill 52 条）**

- **断口栅格吸附**（不属于 taste-skill 52 条）：规格写"把剥落边缘对齐到 8px 整数倍""36 栏细栅格"。断口是材料断裂，不落在版面栅格上；这正是上表 impeccable"Geometric masks"那条的现实入口。
- **色彩数值自报与实测不符／家族近失**（不属于 taste-skill 52 条）：#DCDCC8 自报"饱和 9.1%"是 HSV 口径，规则判据用 HSL（实算 22.2%），它离 palette-cream **只差明度一项**（82.4% 对阈值 88%）；#7A6A55 自报"饱和 12.2%"与 HSL 17.9%／HSV 30.3% 都不符，且在色相 34.1°、明度 40.6% 上贴着 palette-terracotta（6–30°、42–72%）的边；校验行的"12.59:1"与字段 3 的"12.07:1"（我实测 12.07）自相矛盾。把底色调亮 6% 或把辅助色调红 5° 就会点亮两个 FAIL。
- **回弹缓动的漂移风险**（不属于 taste-skill 52 条）："点击铲痕会露出下方 1px 的深色底，160ms 后回弹"没给缓动曲线；若用弹性曲线，就是 tells.md 第 7 节点名的 motion tell，但 52 条里没有对应 RULE_ID（bounce-easing 不是 RULE_ID），只能作为非规则观察提出。
- 未定项（规格未给出，故未列入命中）：few-pictures / no-real-pictures / no-footage（只给了"转灰度再按层位做 3 至 4 阶硬边分色"的配方与"力量在层不在图"，未承诺图数与是否有片）；small-text（40×24 号牌刻字字号未给）；measure、size-count、empty-screens 需渲染实测。

**该案最致命的 1 条 tell**

最致命的是**用 `JetBrains Mono` 承载层位号与年代**这一装置，它顺带把字体数推到 3，并让中文句中的"1936"跳脸。它是全页出现频率最高的单个决定：9 块号牌、96px 层位索引竖栏、以及正文里每一个年代都走这套等宽字形。可它并没有被这个世界的机制挣来——机制只要求"层位号与年代必须等宽对齐"，而 `tabular-nums` 配京华老宋体就能给出同样对齐，第三款字体是"考古＝技术感"的服装，taste-skill 的 mono 条与 tells.md 第 4 节"mono as a 'technical' voice"点名的正是它。它还连带触发 font-count 与 mixed-font-headline 两条，删掉这一款字体一次清掉三条命中。这一页其余装置是有机制支撑的（石灰层界、层位序号即信息、锐利断面、62° 铲痕），所以这处等宽数字是全案唯一一处把"墙"穿成"获奖页元数据栏"的地方。

**是否属于第三波 tell：否。** 这条装置落在 tells.md 第 4 节"Gallery fashion, banned as house style"，该节原句为"Monospace micro-labels, mono as a 'technical' voice, mono captions | banned"，与第 3 节第三波（"the 'fix' that became the look"）是两节。第三波的两行都实测被挡住：调色行"Yellow-cream ground + terracotta / rust / clay accent"因底色明度 82.4% 低于 88%、主色色相 326.9° 在 6–30° 之外而未成立；仅"Broadsheet cosplay: hairline rules everywhere, zero radius, dense columns"在整案表面擦边（全部直角＋36 栏细栅格），但那 1px 石灰线是灰泥层界，已按 earned 裁定，故不据此计入第三波。

### 4.24 S24｜蓝晒雨林径（Cyanotype Rainforest Path）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.25 S25｜专色目录帖（Spot-Color Contents Zine）

**三分计数**：taste-skill 命中 **8** 条：`earned` 4 / `habit` 4 / `indefensible` 0。impeccable 禁用清单命中 **2** 条：`earned` 2 / `habit` 0 / `indefensible` 0。**合计 10 条：earned 6 / habit 4 / indefensible 0。**

**命中表格**

| 来源 | 规则 ID / 条目名（taste-skill 必须用 52 条里的逐字 ID） | 证据原文引用（摘规格原文，≤40 字） | 裁定 | 理由（≤60 字） |
|---|---|---|---|---|
| taste-skill | `palette-cream` | 「背景 `#E8E4DE` 占 48%（未涂布纸，情绪：刚拆封的纸）」 | earned | 底色就是钉死的未涂布纸本身，不是"想暖一点"；规格自称 4.3% 是 HSV，工具按 HSL 得 17.9% 越 16% 线 |
| taste-skill | `mono` | 「辅助数字用 `JetBrains Mono`（页码与印数，必须等宽）」 | habit | 规格只要"等宽"，正文表格数字 `tabular-nums` 即可满足，不必第三个字面 |
| taste-skill | `font-count` | 「三款分属粗衬线、宋体、等宽三个不同超家族」 | habit | 中文正文与拉丁标题两族由语言和专色重量逼出，等宽这第三族非机制必需 |
| taste-skill | `body-size` | 「字距拉到 0.08em，15.5px、行高 1.9」 | habit | 手工排版的空气感来自 1.9 行高与 0.08em 字距，不靠那 0.5px；抬到 16px 机制不变 |
| taste-skill | `hero-words` | 主张句「第 4 期印了 300 本，装订是三个人一个下午穿完的。」 | habit | 整句作首屏大字；机制只需"300 本"的事实，标题约五字、数字归印数槽（工具按空格计词会低计中文） |
| taste-skill | `dashed` | 「页码与标题之间用一排 2px 短点线连接」 | earned | 目录引导线把标题与页码连起来，是目录的功能结构，不是装饰虚线框或裁切标记 |
| taste-skill | `hairline` | 「1.2px 实线穿过孔位并带 3% 的松紧不匀」 | earned | 穿线是装订物件的本体，规格指定用 SVG 路径绘制，不进 CSS 细线计数，也不压字 |
| taste-skill | `contrast` | 「因为双专色叠印区的对比偏低，只能额外提供一个纯文本视图」 | earned | 两版油墨相压必然生出低对比区（`#914A27` 压在 `#181C0D` 上约 2.7:1），是物理结果；规格已备纯文本出口 |
| impeccable | A colored `border-left` or `border-right` above 1px | 「<900px 转单栏纵向，装订线转为贴左的 3px 竖线」 | earned | 3px 竖线是书脊在单栏下的形态，仍带真实穿孔位；拿掉它装订机制就没了 |
| impeccable | Monospace as a costume for "technical" rather than for code, data, or measurement | 「页码与印数，必须等宽」 | earned | 条目正文明示豁免 code/data/measurement；页码与印数是量测数据，不是技术腔 |

**非规则观察（不属于 taste-skill 52 条）**

（本裁定按规格原文与其自报数值、用工具同一算法复算；本轮无渲染产物可测。）

1. **第三色算术对不上"相乘"**（不属于 taste-skill 52 条）：规格说「派生色值 `#232410`，它是两版油墨相乘的结果」。按正片叠底实算 `#914A27 × #2E6B5E` = `#1A1F0E`，把承印纸一起乘 = `#181C0D`，两者都不是 `#232410`。记忆点全押在"叠印自己长出第三色"，而这个数字用它所声明的机制算不出来。
2. **中文正文 0.08em 宽字距**（来自 impeccable 引擎规则 `wide-tracking`，**不是** taste-skill 52 条之一）：汉字本身是等宽网格，正文两行字距拉到 0.08em 会稀释行内密度、把行宽撑开；该条目原文是按拉丁文写的。此装置只有落在目录条目标题一级才站得住。
3. **规格数值自相矛盾**（不属于 taste-skill 52 条）：字段 3 写「正文 `#1E1A16`/背景 = 13.65:1」（复算 13.66:1，正确），文末校验却写「正文对比度 14.33:1（07 号实测）」；同一对前后景不该有两个值。
4. **动效件数偏多**（来自 impeccable `craft-floor.md` 的 Verify 段，不是 Refuse 禁用清单，也不是 52 条）：加载三段 + 24 孔依次穿线 + 1:0.94 跟随滚动 + 转场换页 + 悬停点线 + 微交互 + 自绘光标，共七件；而"装订"这个机制只挣得"穿孔穿线"那一件。

**该案最致命的 1 条 tell**

暖米纸底 + 锈橙专色 + 高对比衬线大标题，这三件正好凑成 tells.md 第三波那套"暖化＋编辑感"的整包，而它比规格自己承认的更像生成物。taste-skill 抓到的只是它的一半：`#E8E4DE` 按 HSL 是 H 36°、S 17.9%、L 89.0%，落进 cream 箱（WARN `palette-cream`）；主色 `#914A27` 的 H 19.8°、S 57.6% 都在陶土带内，只靠 L 36.1% 比下限 42% 低 5.9 点逃出禁区，所以工具不会报 `palette-terracotta`——读感上它仍是第三波的锈橙。规格字段 3 的辩护（"饱和 4.3%…这也是它脱离暖米纸族的原因"）在工具口径下不成立：4.3% 是 HSV，工具用 HSL，同一块底色越过了 16% 门槛。底色我判 earned（未涂布纸是承印物，纸就是底，craft-floor 让 pinned brief 高于默认），但 earned 只解决"这一件装置合不合法"，解决不了"三件凑一起的整包读感"。最低成本的出口是纸色退一档色度（如 `#E6E4E0`，HSL S 10.3%）——但那只是过闸，锈橙与衬线标题这两条腿仍在。

**是否属于第三波 tell：是。** tells.md 原句：「The remedy published for the first two waves was "warm it up and make it editorial". Models adopted the remedy wholesale and it is now the most recognisable generated look of all.」登记行同证：「Yellow-cream ground + terracotta / rust / clay accent | banned together; terracotta banned alone; cream warned」。

### 4.26 S26｜几何对撞栏（Geometric Collision Columns）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.27 S27｜手绘公文幕（Hand-Painted Bill Dispatch）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.28 S28｜爵士凹版墙（Jazz Intaglio Wall）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

### 4.29 S29｜钢丝安全册（Wire-Bound Safety Manual）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

**附注**：不得引用 v1 `-retry5.md` 对 S29 的补跑结果代填。

### 4.30 S30｜滑板贴纸对切（Skate Sticker Split）

**状态**：**回灌失败，未产出结果。**

| 项 | 内容 |
|---|---|
| 三分计数 | 未产出 |
| 命中表格 | 未产出 |
| 非规则观察 | 未产出 |
| 最致命的 1 条 tell | 未产出 |
| 是否属于第三波 tell | **未判定**（不得由 v1 或他案代填） |

**§四 小结**：30 节齐备（S01–S30）；完成 11 节、失败 19 节。失败的 19 节里没有任何一节被代填内容或被按 0 命中处理。

## 五、第三波 tell 专章

### 5.1 判定汇总（11 个完成案）

**判定为"是"的案子共 9 个**（8 个全案 + 1 个部分命中）：S06、S07、S08、S11（部分命中）、S13、S17、S20、S22、S25。**判定为"否"的 2 个**：S10、S23。**19 个失败案未判定**，不计入本章任何比例。

| 案 | 判定 | 该案自陈命中的 tells.md §3 行 | 触发证据（引原文或实测值） |
|---|---|---|---|
| S06 昭和喫茶账 | **是** | 调色行（成组）+ 总判词 | `#ECDEC6` 奶纸 56% + `#85572A` 褐墨 22%；规格自陈"色相 29.7° 与饱和 52.5% 全程未动" |
| S07 铅灰油墨目录 | **是** | broadsheet 行 + 总判词 | 0.5px 栏线铺满左 5 右 7 密栏 + §8 自陈"全站没有圆角容器与柔和投影" |
| S08 琥珀叠印灯箱 | **是** | 调色行（"terracotta banned alone"）+ 总判词 | 主色 `#C46A1F` 24%，HSL h≈27 / s≈0.73 / l≈0.45 落 terracotta 族；逃过 `palette-claude` 只因象牙底 L0.847 < 0.88 |
| S10 刻度对撞页 | **否** | —（撞的是 §4 制版镀铬） | accent `#D32029` 实测 h357°，不在陶土带 6–30°；无衬线几何骨架、无衬线 premium、无表演性标签 |
| S11 铁窗打字本 | **是（部分命中）** | broadsheet 行 + 总判词 | 1px 断针虚线 + 1px 表框 + 1px 内凹槽；因纸色 S 仅 5%、主色为复写青墨，调色行不予命中 |
| S13 盲压公函 | **是** | broadsheet 行 + serif premium 行（原文自陈"三条全占"）+ 总判词 | 泛黄棉纸底 `#F4E3BE` 56% + 零圆角直角铅字块 + 16 栏细分栅格 + 1px 压痕线 + EB Garamond 抬头 |
| S17 税票存根联 | **是** | 调色行 + broadsheet 行 + serif premium 行 | `#E1D6BD` h41.7 / s38% / l81% + `#7A2E2E` 锈红 + 直角满铺发丝线 + 衬线体系 |
| S20 针笔声场图 | **是** | 总判词（"暖化并编辑化"） | 图纸白 `#FAF3E1`（s 10%，故检查器不开枪）+ 0.2px 网格 + 零圆角 + Martian Mono 读数 |
| S22 糊窗对折册 | **是** | serif premium 行 + 总判词 | Petrona 低对比衬线（横竖对比 1:2.4）+ 暖灰纸底 + 超大留白；全页最大字号 17px（1.3vw） |
| S23 剥落年代墙 | **否** | —（撞的是 §4 mono 技术腔） | 调色行被实测挡住：底色明度 82.4% < 88%，主色色相 326.9° 在 6–30° 之外 |
| S25 专色目录帖 | **是** | 调色行 + 总判词 | `#E8E4DE` HSL S 17.9% / L 89.0% 落 cream 箱；`#914A27` h19.8 / s57.6 / l36.1，靠 L 差 5.9 点逃出陶土禁区 |

### 5.2 批次级结论

1. **比例**：11 个完成案里 **9 案判"是"= 82%**（其中 S11 为部分命中）。判"否"的两案并非"干净"，而是**撞上了另一节**——S10 撞 §4 画廊时尚的制版镀铬，S23 撞 §4 的等宽技术腔。**"避开第三波"不等于"避开 tell"。**
2. **落在哪条腿上**（按各案自陈点名的行统计，tells.md `:58–61`）：
   - **总判词行**（"warm it up and make it editorial"）：**9 / 9 案全部引用**——它是共同分母。
   - **调色行**（Yellow-cream ground + terracotta / rust / clay accent）：**4 案**（S06、S08、S17、S25）。
   - **broadsheet 行**（hairline rules everywhere, zero radius, dense columns）：**4 案**（S07、S11、S13、S17）。
   - **serif premium 行**（High-contrast or soft serif display as the shortcut to "premium"）：**3 案**（S13、S17、S22）。
3. **"单件可辩护、整包不可辩护"是本批的核心机制**：`hairline` 11 条里 8 条 `earned`、`shadow` 3 条全 `earned`、`palette-terracotta` 2 条全 `earned`、`palette-cream` 4 条里 3 条 `earned`——**S06 与 S25 的整套调色板装置在单件层面都判了 `earned`，但两案仍然判"是"**。可见第三波不是由某一条违规构成的，而是**由一组各自成立的零件同时到场**构成的。这正是 v1 那句"参数化不改变观感"在真 ID 口径下的复现。
4. **两个"否"的案子给出一条实用界线**：S10 的 accent h357°、S23 的底色 L82.4%，都是**差几个点出界**而非机制性清白（S25 同样差 5.9 点却是"是"）。也就是说：**阈值只能证明"没被抓到"，不能证明"不属于第三波"**；判定必须看组合，不能看单值。
5. **与 v1 的正面冲突（详见 §七 7.1(6)）**：v1 的批次裁决写的是"本批多数'细线'都是被世界挣来的物理边界 → **没有**犯报纸 cosplay"，并把这一条列为"重要的正面结论"。本版在 **S07、S11、S13、S17 四案**上判 broadsheet 行成立或部分成立——**该正面结论被推翻**。

---

## 六、批次级统计与结论

### 6.1 三分总计（分母：11 个完成案；失败案不进入任何分母）

| 证据层 | 命中数 | `earned` | `habit` | `indefensible` | earned 占比 |
|---|---|---|---|---|---|
| taste-skill 52 条真实 ID（§二） | **78** | 38 | 37 | 3 | 48.7% |
| impeccable Refuse 条目（§三） | **29** | 25 | 4 | 0 | 86.2% |
| **合计** | **107** | **63** | **41** | **3** | **58.9%** |

**三条读法**：

1. **`indefensible` 只有 3 条**（S06 `mono`、S20 `few-pictures`、S20 `no-footage`），占 2.8%。规则命中数高**不等于**批次硬伤大。
2. **`earned` 占 58.9%**（taste-skill 侧 48.7%，impeccable 侧 86.2%）：**过半"违规"是被各自世界挣来的**。这既证明"不许一律判违规"这条口径必要，也说明**逐条合规不能代替结果判断**。
3. **impeccable 侧 0 条 `indefensible`**：Refuse 段的开口句（`craft-floor.md:21`）明说这些是"category's defaults, not bans"，本批的已提交世界把其中 25 条赎回了。真正没人能赎回的那 3 条，全部落在 taste-skill 侧。

### 6.2 逐案总表

| 案 | taste-skill（e / h / i） | impeccable（e / h / i） | 合计（e / h / i） | 第三波 |
|---|---|---|---|---|
| S06 | 9（2 / 6 / 1） | 5（4 / 1 / 0） | 14（6 / 7 / 1） | 是 |
| S07 | 5（2 / 3 / 0） | 1（0 / 1 / 0） | 6（2 / 4 / 0） | 是 |
| S08 | 7（5 / 2 / 0） | 2（2 / 0 / 0） | 9（7 / 2 / 0） | 是 |
| S10 | 9（4 / 5 / 0） | 1（1 / 0 / 0） | 10（5 / 5 / 0） | 否 |
| S11 | 4（案首 2 / 2 / 0；表内 1 / 3 / 0） | 2（案首 1 / 1 / 0；表内 2 / 0 / 0） | 6（3 / 3 / 0） | 是（部分） |
| S13 | 10（5 / 5 / 0） | 3（3 / 0 / 0） | 13（8 / 5 / 0） | 是 |
| S17 | 6（5 / 1 / 0） | 3（3 / 0 / 0） | 9（8 / 1 / 0） | 是 |
| S20 | 7（4 / 1 / 2） | 4（4 / 0 / 0） | 11（8 / 1 / 2） | 是 |
| S22 | 6（4 / 2 / 0） | 4（3 / 1 / 0） | 10（7 / 3 / 0） | 是 |
| S23 | 7（2 / 5 / 0） | 2（1 / 1 / 0） | 9（3 / 6 / 0） | 否 |
| S25 | 8（4 / 4 / 0） | 2（2 / 0 / 0） | 10（6 / 4 / 0） | 是 |
| **11 案合计** | **78（38 / 37 / 3）** | **29（25 / 4 / 0）** | **107（63 / 41 / 3）** | 是 9 / 否 2 |

### 6.3 按优先级排列的系统性问题

| 优先级 | 系统性问题 | 规模 | 为什么系统性 | 修复动作 |
|---|---|---|---|---|
| **P0** | **第三波"暖化 + 编辑化"整包** | **9 / 11 案（82%）**；调色行 4 案、broadsheet 行 4 案、衬线 premium 行 3 案 | 单件多数 `earned`（hairline 8/11、terracotta 2/2、cream 3/4 全 `earned`），**合起来仍成立**——逐条打勾无法发现它；批内两案（S06、S25）正是"每件都合法、整包仍违规"的样本 | 按 tells.md §3 的 "Do instead" 列执行：暖度改由 **a low-chroma stone / a deep ink / a photograph / a full warm field**；分隔改由 **space and tone**；字体按 **the dealt type system**，不用高对比衬线当 premium 捷径。**组合层整改，不是零件层调参。** |
| **P0** | **等宽当"技术腔" + 第三款字体** | `mono` **10 / 11 案**（4 / 5 / 1）；`font-count` **9 / 11 案**（4 / 5 / 0） | 两规则**同根**：几乎每案的第三款字体都是"数字用等宽"。S23 删掉 `JetBrains Mono` 一款，一次清掉 `mono`、`font-count`、`mixed-font-headline` **三条命中** | 等宽收缩到测量／数据槽，其余一律正文体 + `tabular-nums`。**并把两工具的口径分歧显式写成例外表**：taste-skill 只豁免 `<pre>/<code>` 字面代码（`rules.mjs:56`），impeccable 豁免 code / data / measurement —— S06、S22、S25 都出现"同案两极"，不写清例外就会反复重判 |
| **P1** | **正文 15–15.5px 成为批次默认** | `body-size` **8 / 11 案，全部 `habit`**（唯一全 `habit` 的高频规则） | 每一案的替代机制都成立（密度由栏宽／行高／字重承担），**没有一案的机制要求缩到 15px**；且多数案自设网格也接不住 15px（S07 的 27.75px ÷ 7px、S10 的 25.5px ÷ 8px 都不整除） | 正文地板 **16px**；需要密度时改栏宽、行高、字重，不改字号 |
| **P1** | **第三波 broadsheet 腿由细线承载** | `hairline` **11 / 11 案**（8 `earned` / 3 `habit`）；相关 broadsheet 判定 4 案 | 这条腿**不能一刀切删线**：11 案里 8 案是真实表格线／材料接缝／物理边界（真账表行线、灰泥层界、折痕毛口、压痕槽）。删线的代价是把机制一起删掉 | 只对"纯版式分隔"动手：把分隔交给 space / tone（tells.md 原句 "Structure from space and tone"）；保留有读数的量具线与真实表格线。**判定要能引用机制原文，不是按线数** |
| **P2** | **无影像：排除影像的理由是批次策略而非物理** | 无影像类共 **6 条命中**：`no-footage` 4 案（3 `habit` / 1 `indefensible`）、`few-pictures` 2 案（1 `habit` / 1 `indefensible`） | 全批**仅有 2 条 `indefensible` 之一**（S20 `few-pictures`）与另一条（S20 `no-footage`）同源：规格明写排除位图的理由是"以此与全批其它方案的颗粒材质拉开距离"——**不是这个世界的物理** | 每案找一条真实的"地方／材料／过程"影像（tells.md 与 `rules.mjs:115` 的原话都是 muted loop + poster frame）；确有世界不能拍时，须写出物理理由而不是批次理由 |
| **P2** | **设计工具镀铬与自绘光标**（非规则层，不进 §二／§三 统计） | **6 案**：S08、S10、S13、S17、S20、S22 | 52 条里**没有**光标／镀铬 ID（tells.md §4 明写该项 `banned via hairline, dashed`，即由细线规则代检），所以它永远不出现在规则总表里，却反复出现 | 只保留"参与读数"的量具（套准线、规线、密度计）；十字光标、色标条、裁切十字、L 形角线整层删除。浏览器原生表面（选区、caret、滚动条、焦点环）按 craft-floor Verify 段从调色板主题化 |
| **P2** | **规格内部数值自相矛盾**（非规则层） | **8 / 11 案**：S06、S07、S10、S13、S17、S22、S23、S25 | 三类重复故障：①同一对前后景两个对比度值（S06 12.85/13.33、S17 7.73/8.15、S22 10.22/11.89、S23 12.07/12.59、S25 13.65/14.33）；②饱和度口径混用 HSV 与 HSL（S06、S11、S17、S23、S25 均因口径不同得出相反结论）；③自设栅格接不住自设字号／行高（S07、S10） | 交付前做一次"单一口径自检"：饱和度只报 HSL、对比度只留一次实测值、网格必须整除正文行高；**并删掉"07 号实测"这类跨案残留校验行**（S17、S22、S25 均有） |
| **P3** | **滚动语义劫持与过冲缓动**（非规则层；52 条不含滚动语义，`bounce-easing` 不在 52 条内） | 2 案（S20、S22）滚动被改为调参／强制停顿；2 案（S22、S23）出现过冲或弹性回弹 | 键盘、触控惯性、屏幕阅读器与"页面能否正常滚"无人检查；过冲在"光的深浅变化"上没有物理依据 | 滚动量不要映射为语义状态（或必须提供无劫持通路）；过冲只留给真正的材料形变 |

### 6.4 一句话结论

**11 个完成案里，规则层面 58.9% 的命中是被各自世界挣来的，只有 3 条无从辩护；但 82% 的案子仍然属于第三波。** 差别不在零件是否合规，而在**同一组零件是否同时到场**。真正的修复顺序因此是：先拆组合（P0），再清根因（第三款等宽字，P0），再修可零成本纠正的默认值（16px 地板、无影像理由，P1–P2）——而不是继续把参数调得更精确。

---

## 七、与 v1 的差异

（v1 = `12-tool-rule-audit-30.md`（主报告，3 案逐字 + 8 案渲染）／`12-tool-rule-audit-30-FULL.md`（25 案主报告）／`12-tool-rule-audit-30-retry5.md`（5 案补跑）。本版 11 个完成案全部落在 v1 家族的 30 案之内，故逐条对比成立。）

### 7.1 被词汇更正**改变**的结论

| # | 结论 | v1 的说法 | v2 的说法 | 变化性质 |
|---|---|---|---|---|
| 1 | 暖米／奶油底这条规则的**计数形态** | `-FULL.md:101` 记为一个"ID"下的两种写法"`cream-palette` ／ `palette-cream`"，14 案，并在补跑里"合并为一行"（`-retry5.md:213`） | 只有一个真 ID `palette-cream`：本轮 **4 案**（S06 `habit`、S10 `earned`、S13 `earned`、S25 `earned`） | **计数形态改变**（分母也不同：v1 25 案 vs v2 11 案）；规则结论不变 |
| 2 | "紫／靛蓝当主色"是否成立 | `-FULL.md:123` 记 `purple` **2 案命中**（S17、S24） | 真 ID `palette-purple` 本轮 **0 命中**：S17 紫墨 `#5A2A50` h312.5 / l0.26 不在 244–295°；S23 主色 h326.9°；S10 `#6E7076` s3.5% | **结论反转**（v1 的 2 条命中在真 ID 语义下不成立） |
| 3 | S20 的 `Space Grotesk` 怎么算 | `-FULL.md:122` 记 `overused-font`，S20、S24 共 2 案 | S20 同一现象记在真 ID `font-count` 下，**判 `earned`**（拉丁标题／中文正文／测量读数三类各有任务边界） | **结论翻转**（同一个现象因 ID 归属改变而由"违规"变"挣来"） |
| 4 | 5 类非 ID 名的归属 | `-FULL.md:104,105,109,111,117` 共记 `design-tool chrome` 9 + `bounce-easing` 8 + `agency micro-meta` 6 + `serif-premium` 6 + `performative-label` 3 = **32 条命中行** | 这 5 类全部**移入各案"非规则观察"**，不进 §二／§三 任何数字（在 v2 里分别出现在 S08/S10/S13/S17/S20/S22 的镀铬观察、S22/S23 的过冲观察、S10/S17 的参数上页、S13 的"衬线＝高级"、S10/S13/S17 的表演性自证） | **统计归属改变**：32 条命中行从"规则统计"降级为"观察" |
| 5 | "等宽与微型宽字距越界"这条 P1 | `12-tool-rule-audit-30.md:333` 把 S25 的 `wide-tracking` **×33** 与 `mono` 并列为 P1 | `wide-tracking` **不是** 52 条 ID；最近的真 ID 是 `micro-label`，本轮 **0 命中**。S25 的 0.08em 字距在 v2 里以"来自 impeccable 引擎规则"的身份留在非规则观察（且被限定为"只有落在目录条目标题一级才站得住"） | **优先级项被减半**：该 P1 的一半不在 52 条内 |
| 6 | "本批是否犯了报纸 cosplay" | `12-tool-rule-audit-30.md:237` 逐字："**裁定：本批没有犯 taste-skill 点名的"报纸 cosplay（到处发丝细线、零圆角、密栏）"——这一点是重要的正面结论。**" | v2 在 **S07、S11、S13、S17 四案**判 broadsheet 行成立或部分成立（§五 5.1） | **正面结论被推翻**。这一条**主要不是错词造成**，而是逐案判定细化造成的：v1 的"细线多数 earned"读法在个别装置上成立，但没有检查"零圆角 + 满铺细线 + 密栏"是否**同时**出现 |

### 7.2 词汇更正后**不变**的结论

| # | 结论 | v1 | v2 | 是否同向 |
|---|---|---|---|---|
| 1 | 暖化配色是批次主症 | "本批避开了第三波的造型，却没有避开第三波的配色"；批次级 `habit`、个别案 `indefensible` | §五 5.2：9 / 11 案判"是"，调色行 4 案自陈；`palette-terracotta` 2 案、`palette-cream` 4 案 | **同向**（范围从"配色一条"扩到"配色 + broadsheet + 衬线"三条腿） |
| 2 | 等宽是命中数最高、且多数可辩护 | `mono` 18 / 25 案，`earned` 17 / `habit` 1 | `mono` 10 / 11 案，`earned` 4 / `habit` 5 / `indefensible` 1 | **同向**（"不是禁用等宽，而是把它收缩到数据与测量槽"这条处置不变） |
| 3 | 细线多数是被世界挣来的边界 | `hairline` 16 / 25 案，`earned` 15 / `habit` 1 | `hairline` 11 / 11 案，`earned` 8 / `habit` 3 | **同向**（但 `habit` 比例由 1/16 升到 3/11，即"细线"在 v2 里更要按机制分案判） |
| 4 | 字体数与正文字号是批次性问题 | `font-count` 20 / 25；`body-size` 16 / 25 | `font-count` 9 / 11；`body-size` 8 / 11（全 `habit`） | **同向** |
| 5 | 编号多数被世界挣来 | `numbering` 14 / 25，"多判 `earned`" | `numbering` 3 案，`earned` 2 / `habit` 1 | **同向** |
| 6 | 不许"一律判违规" | `earned` 占 **52%**（3 案 42 条里 22 条） | `earned` 占 **58.9%**（107 条里 63 条；taste-skill 侧 48.7%） | **同向且更强** |
| 7 | 一批维度是干净的 | 0 命中：`purple`、`palette-purple`、`gradient`、`gradient-text`、`emoji`、`glass`、`dashed`、`pill-nav`、`default-link`、圆角 0、控制台错误 0 等 | §2.1 的 28 条 0 命中里包含 `palette-purple`、`palette-claude`、`glass`、`pill-nav`、`emoji`、`gradient-text`、`default-link`、`all-centred`、`measure` 等 | **同向**（注意 `dashed` 在 v2 由 0 命中变为 3 案 `earned`，属证据流差别：v1 的 0 命中来自 3 案逐字 + 8 案渲染，v2 覆盖 11 案） |

### 7.3 v1 有没有**因为错词而漏掉的真规则**——**有，且可逐条复算**

**(a) 一个真 ID 被劈成"命中"与"0 命中"两份。** `palette-purple` 在 `-FULL.md:86` 被列入"25 个完成案里从未命中"的 27 条清单，而同一份报告 `-FULL.md:123` 用错词 `purple` 记了 2 案命中（S17、S24）。结果是：**这个真 ID 的命中在 52 条统计里既存在又不可见**。本版按真 ID 重判为 **0 命中**——即 v1 既漏计、也可能多计。

**(b) 真 ID `font-count` 的批次严重度被分流。** 字体类判定有 2–4 条记在 `overused-font` / `default-font` 名下（`-FULL.md:122`；`-retry5.md:118,141,225`），而这两者都不是 ID。本版把它们归入 `font-count`（9 / 11 案）与 `font-fallback`（1 案）。按 v1 口径，`font-count` 的真实规模被低估。

**(c) v1 的"27 条真 ID 0 命中"清单里，有 9 条在本版同一批案子上实际命中**——且这 9 条全部落在 `-FULL` **自己的 25 个完成案**之内，因此不是分母差异造成的：

| v1 宣称 0 命中的真 ID（`-FULL.md:86`） | v2 实际命中于 | v2 裁定 |
|---|---|---|
| `focal-point` | S06、S17、S22 | 全 `earned` |
| `headline-lines` | S08 | `habit` |
| `hero-words` | S25 | `habit` |
| `mixed-font-headline` | S17、S23 | 2 `earned` / 1 `habit` |
| `gradient` | S23 | `habit` |
| `overflow` | S06 | `habit` |
| `side-scroll` | S23 | `habit` |
| `few-pictures` | S20 | `indefensible` |
| `still-page` | S20 | `earned` |

**(d) 第 10 条暴露 v1 家族内部互斥。** `font-fallback` 在 `-FULL.md:86` 属"0 命中"，而 `12-tool-rule-audit-30.md:61` 把它记为"高频命中（文字级 S14、S12；渲染级 S13、S08、S17）"。本版按真 ID 逐案重判：**命中 1 案（S13，`habit`）**——即两级报告都不完全对。

**(e) 反方向也要记：错词同样会多计。** v1 的 `purple` 2 案（S17、S24）在 v2 的真 ID 下 0 命中；v1 的 `overused-font` S20 `indefensible` 在 v2 变成 `font-count` 的 `earned`。

**结论**：词汇更正不是"换个名字"——它改变了 **1 条结论的方向**（`palette-purple`）、**1 条裁定的性质**（S20 的 `Space Grotesk`）、**32 条命中行的归属**（5 类非 ID 名降级为观察），并把 v1 的 9 条"0 命中"翻成真命中。

### 7.4 本版登记、但尚未统一的剩余口径问题

| # | 问题 | 现状与影响 |
|---|---|---|
| N1 | **S11 案首自报与表内逐行不一致** | taste-skill 侧 2/2/0 vs 1/3/0；impeccable 侧 1/1/0 vs 2/0/0。本版一律采用表内逐行（唯一可指名到 ID 的证据）。**批次合计不受影响**（两种读法下 S11 案子级都是 3 `earned` / 3 `habit`，107 条总计都是 63/41/3）；受影响的只有 `hairline`、`contrast` 等逐规则归属可能各差 1 条 |
| N2 | **非规则观察的来源层需始终标注** | 本版已把 9 类非 ID 词降级，但它们引用时来自四个不同层：tells.md §3/§4/§7、craft-floor Refuse 段、craft-floor Verify 段、impeccable 引擎规则（如 `wide-tracking`）。§四 已逐条标注来源，后续引用不得再混入 §二 |
| N3 | **v2 完成度 11 / 30** | 19 个失败案（S01–S05、S09、S12、S14–S16、S18、S19、S21、S24、S26–S30）需重跑才能进入 52 条统计。**失败 ≠ 0 命中**，本版未把它们计入任何分母 |
| N4 | **v1 的 27 条"0 命中"清单应作废或加注** | 该清单基于混合词汇口径，且与 v2 有 9 条冲突（§7.3(c)）。若继续引用，须同时标注"混合词汇口径"与冲突条目 |
| N5 | **证据流差别需与词汇差别分开记账** | 例：`empty-screens` 在 v1 是渲染级实测（S13 3/6 屏、S08 3/8 屏，`12-tool-rule-audit-30.md:68`），在 v2 是按规格文字回灌、11 案 0 命中。两版数字不可直接对照，也不属词汇问题 |
| N6 | **两工具在同一条规则上的判法分歧需固化为例外表** | `mono` 上 taste-skill 只豁免 `<pre>/<code>` 字面代码，impeccable 豁免 code / data / measurement。S06、S22、S25 均出现"同案两极"，若不固化，每轮回灌都会重判一次 |
| N7 | **impeccable Refuse 段的条目数口径** | v1（`12-tool-rule-audit-30.md:15`）把 Refuse 段记为"**16** 项默认禁用"；本版按源码逐条核数为 **15 条 bullet**（第 25–29 行 5 条 + 第 33–42 行 10 条）。本版 §三 用 15 条为分母、9 条为命中，引用 v1 的"16 项"时须改注 |

---

**交付声明**：本报告 30 个小节齐备（S01–S30），失败案照列并注明、未代填；§二 的数字只来自 taste-skill 52 条内逐字存在的 ID（24 个命中 ID + 28 个 0 命中 ID = 52）；impeccable 侧 29 条命中另立 §三，两表互不混入；各案"非规则观察"一律未进入任何规则统计。

