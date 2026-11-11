# 报告覆盖审计：30 份旧 report.json 与 5 份新 report.json 的字段差异，及其对季度验货的含义

审计日期：2026-11-11
审计对象：`prototypes/S01..S35` 共 35 份 `.inspect/report.json`（另有一份 `_selection/.inspect/report.json` 属产品入口，不在 35 案内）
方法：逐份读取 + 递归键集对比 + 实跑重渲染 2 案（S01、S17）逐键 diff + 补跑第 3 案（S05）验证截图确定性 + 逐闸门读源码定位字段

---

## 0. 一句话结论

**新 5 份（S31–S35）与旧 30 份的差异只有一个字段：`metrics.structure`。** 其余 `metrics` 下的每一个键、每一个值在两代引擎之间**完全一致**——实测重渲染 S01/S17/S05 三案，除 `at` 与新增的 `structure` 外，**报告逐字节相同**（findings、截图二进制也相同）。

但这一个字段恰恰是 Q4「复刻验货」要用的 6 个可度量里的 3 个（栏数／主轴宽／线宽集合）。而这 3 个最该被验的案（S01/S07/S17，以及 plan 里点名的 S03）**都不含 `structure`**——它们后来没被重新渲染过。

**所以「统一字段」在技术上是一个安全操作**（重渲染不改任何其他数值），但**代价**是 30 案 × 约 35–73 秒 ≈ 18–37 分钟串行渲染，且会改动 30 份入库产物（`at` 全部更新 + 新增 `structure`）。见 §4。

---

## 1. 35 份 report.json 的字段覆盖表

引擎代次判据：`probe.mjs` 的 `structure` 字段由 commit `9631426`（2026-11-10 18:40 +0800）引入，该 diff 是对 `probe.mjs` 的**纯增补（+204 / −0 行）**，未改动任何既有采集逻辑（`git diff --stat 6e7f0e4 9631426 -- prototypes/_build/vendor/probe.mjs` 实测 204 insertions, 0 deletions）。故「有 `structure`」⇔「GEN2 引擎」，「无」⇔「GEN1 引擎」。交叉核对：35 案的 `at` 与「at 是否晚于 9631426」对照，**0 矛盾**。

| 案号 | 有 `metrics.structure` | at（渲染时间） | 引擎代次 |
|---|---|---|---|
| S01 | ❌ | 2026-10-30T21:09:07.391Z | GEN1 |
| S02 | ❌ | 2026-10-30T21:04:45.314Z | GEN1 |
| S03 | ❌ | 2026-11-08T22:41:44.444Z | GEN1 |
| S04 | ❌ | 2026-11-08T22:42:16.509Z | GEN1 |
| S05 | ❌ | 2026-10-17T06:08:20.120Z | GEN1 |
| S06 | ❌ | 2026-10-17T02:27:57.720Z | GEN1 |
| S07 | ❌ | 2026-10-29T09:05:42.135Z | GEN1 |
| S08 | ❌ | 2026-10-30T18:26:37.942Z | GEN1 |
| S09 | ❌ | 2026-10-17T12:40:03.397Z | GEN1 |
| S10 | ❌ | 2026-10-17T03:25:36.313Z | GEN1 |
| S11 | ❌ | 2026-10-24T08:53:41.100Z | GEN1 |
| S12 | ❌ | 2026-10-30T20:19:19.814Z | GEN1 |
| S13 | ❌ | 2026-10-29T09:06:14.680Z | GEN1 |
| S14 | ❌ | 2026-10-24T08:29:59.794Z | GEN1 |
| S15 | ❌ | 2026-10-24T08:30:44.549Z | GEN1 |
| S16 | ❌ | 2026-10-19T01:42:03.422Z | GEN1 |
| S17 | ❌ | 2026-11-08T19:39:38.724Z | GEN1 |
| S18 | ❌ | 2026-10-26T16:47:17.147Z | GEN1 |
| S19 | ❌ | 2026-10-24T08:31:32.244Z | GEN1 |
| S20 | ❌ | 2026-10-24T08:32:27.444Z | GEN1 |
| S21 | ❌ | 2026-10-29T09:04:26.011Z | GEN1 |
| S22 | ❌ | 2026-10-24T08:57:36.511Z | GEN1 |
| S23 | ❌ | 2026-10-23T21:11:30.247Z | GEN1 |
| S24 | ❌ | 2026-10-30T21:06:47.398Z | GEN1 |
| S25 | ❌ | 2026-11-08T22:43:14.781Z | GEN1 |
| S26 | ❌ | 2026-11-08T22:44:04.776Z | GEN1 |
| S27 | ❌ | 2026-10-25T03:03:22.350Z | GEN1 |
| S28 | ❌ | 2026-10-25T02:58:06.677Z | GEN1 |
| S29 | ❌ | 2026-10-24T08:37:12.559Z | GEN1 |
| S30 | ❌ | 2026-10-25T00:45:56.624Z | GEN1 |
| S31 | ✅ | 2026-11-10T13:35:37.860Z | GEN2 |
| S32 | ✅ | 2026-11-10T14:26:44.815Z | GEN2 |
| S33 | ✅ | 2026-11-10T14:36:50.169Z | GEN2 |
| S34 | ✅ | 2026-11-10T14:49:43.242Z | GEN2 |
| S35 | ✅ | 2026-11-10T14:57:42.650Z | GEN2 |

- 有 `structure`：S31 S32 S33 S34 S35（5 份，均 2026-11-10 渲染）
- 无 `structure`：S01–S30（30 份）
- 35 案每份都恰好 3 个视口（1440×900 / 768×1024 / 390×844），无缺档、无多余档

**关键错位**：季度复刻验货用的 3 案——plan 里点名的是 **S03/S07/S17**（`deliverables/74-plan/PROMPT-SYSTEM.md:712`），Q3 纪要里说的是 **S01/S07/S17**——**全部落在 GEN1、全部没有 `structure`**。也就是说，「6 个可度量」里依赖 `structure` 的那 3 个（栏数／主轴宽／线宽集合），在复刻验货真正要用的案子上目前**一个都读不到**。

---

## 2. 字段集逐键差异（新 5 份 vs 旧 30 份）

对每份 `report.json` 递归展开 `viewports[].metrics` 的完整键路径树，取「新 5 份并集」与「旧 30 份并集」对比。

### 2.1 真正的 schema 差异：只有 `structure`

新 5 份里 `structure` 对象有 12 个顶层键（以 S31 实测）：

```
columns, columnSamples[{value,selector,text}], axisWidth, axisChars,
lineWidths[], lineWidthSamples[], sawContentBox, columnsFrom,
columnsAll[], columnDistribution{1..5}, axisSelector, axisFromColumns
```

旧 30 份 **一个都没有**（`001` 到 `030` 全无 `metrics.structure`）。反向：**旧有新没有的字段，零个**。

### 2.2 看起来「新有旧没有」但其实是「数组为空」的路径

递归扫描时出现 6 条「only-old」路径（`heroMedia[].ratio/type`、`surfaces.cardRows[].count/iconTopped/rounded/top`）。逐案核对后确认**不是 schema 差异**：这些是**数组元素才有的子键**，而新 5 份的这些数组恰好为空。证据：

- `heroMedia` 非空的旧案有 20 个（S02/S03/S06/S07/S08/S12/S13/S14/S15/S18/S19/S20/S21/S22/S23/S24/S27/S28/S29/S30），新 5 案 `heroMedia` 全为 `[]`（`node` 实测 S31–S35 均为 0 项）。
- `surfaces.cardRows` 非空的旧案有 5 个（S04/S05/S08/S12/S17），新 5 案全为 `[]`。
- 同理 `color.lowContrast[]` 的 6 条「only-new」子键（bg/fg/need/ratio/size/text）：`lowContrast` 键在**全部 35 份**里都存在（空数组），只是 S32/S33/S35 恰好有低对比度文字使数组非空（分别 3/1/6 条），旧报告全部为 `[]`，才让子键看起来「新有旧没有」。

**结论：除 `structure` 外，两代 `metrics` 的键集与值域完全一致。** 采样误导的根因是「对空数组无法枚举其元素子键」——这不是字段缺失。

### 2.3 值域差异

无。除 `structure` 外没有任何键在两代之间取值域不同。`at` 按定义每份不同（时间戳），不算 schema 差异。

---

## 3. 重渲染实测（3 案逐键 diff）

流程：`git show` 版本已在工作区 = HEAD（先 `git diff HEAD` 确认 `.inspect/` 干净）→ 备份到 `_tmp78/backup/SXX/` → `node prototypes/_build/render-scheme.mjs SXX` → 逐键递归 diff → `git checkout -- prototypes/SXX/.inspect/` 还原（三案均已还原，`git status prototypes/` 实测为空）。

### 3.1 S01（GEN1，2026-10-30 渲染）

- 耗时：**33.3 秒**
- 逐键 diff：**总差异节点 4 个，去重后 2 类**：
  - `$.at`：`2026-10-30T21:09:07.391Z` → `2026-11-11T14:33:07.601Z`（时间戳，预期变）
  - `$.viewports[].metrics.structure`：3 处新增（三档各一个 `structure` 对象）
- **其余 `words`、`screens`、`page.*`、`type.*`、`color.*`、`surfaces.*`、`heroMedia`、`findings` 全部逐字节不变。**
- S01 三档新 `structure`：1440=4 栏 / 768=2 栏 / 390=1 栏（与规格「四栏」相符，1440 档 `columnsFrom=div.columns`）
- findings 前后一致：WARN palette-cream / font-count / no-footage / side-scroll

### 3.2 S17（GEN1，2026-11-08 渲染）

- 耗时：**39.6 秒**
- 逐键 diff：**同样只有 2 类**——`$.at` 更新 + `$.viewports[].metrics.structure` 3 处新增
- **截图二进制 8/8 完全相同**（`cmp` 实测 same）
- findings 前后一致：WARN font-count / font-fallback / no-footage（3 条一字不差）

### 3.3 S05（GEN1 最早一代，2026-10-17 渲染）——追加的第 3 案

- 耗时：**33.9 秒**
- 报告逐键 diff：**同样只有 `at` + `structure` 两类**；`strip(at, structure)` 后整个对象 `JSON.stringify` 相等（实测 `true`）
- **但截图出现一次漂移**：`mobile-page-01.jpg` 在首轮重渲染后与入库版**不同**（450705 → 450747 字节）。连续再跑两次：**run1 与 run3 逐字节相同、run2 不同**——说明这是**渲染时机抖动**，不是内容变化。根因：S05 有 `animation: lamp-flash 1s steps(1,end) infinite`（`style.css:278,462`），渲染恰好在闪烁相位差上截了图。
- 对「统一字段」的含义：**`report.json` 数值稳定，但 `.inspect/*.jpg` 对含无限动画的案不是逐字节可复现的**。全库含 `animation:...infinite` 的案共 **9 个**（S02/S05/S11/S14/S17/S18/S21/S22/S23，`grep` 实测）。这 9 案若重渲染，截图会产生 git diff（且每次重渲染都可能不同）。

### 3.4 实测结论

**「重渲染会改变其他字段的数值」——不成立。** 三次实测、覆盖 GEN1 最早/中/近三代，`words`/`screens`/`page`/`type`/`color` 等全部不变。**唯一会变的入库产物是 `at`（不可避免）和含无限动画案的 `.jpg`（不可复现）。** 这意味着「统一字段」在数据完整性上是安全的，不安全的只是**截图 diff 噪声**。

---

## 4. 重渲染的代价与「只补 structure」方案

### 4.1 全量重渲染代价

- 单案实测：S01=33.3s、S17=39.6s、S05=33.9s、S34=73.4s（S34 内容更多）。取 35–73 秒区间。
- **30 案串行 ≈ 18–37 分钟**（30 × 35s 至 30 × 73s）。`quarter.mjs:69` 的渲染步骤注明「35 案 × 3 档 ≈ 10–20 分钟」，与实测同量级。
- 会产生：30 份 `report.json` 的 `at` 全变 + 30 份各增约 1.7KB 的 `structure`（S31 三档 structure 合计 JSON ≈ 1782 字节）；另有 9 案截图可能抖动。

### 4.2 「只补 structure」轻量脚本——实测可行但需小心

我实测了一个只跑 `probe()` 的 STRUCT 子集、不截图/不走屏/不判规则的脚本（`_tmp78/structure-only.mjs`，逐字照抄 `probe.mjs:87-199` 的采集口径）：

- **耗时：单案 46.3s / 46.8s（两次），对比全量渲染 73.4s → 省约 37%**。但注意：省的主要是「不截图、不走屏」，Chrome 三档加载 + `sleep(1400)` 的固定开销（约 3×(加载+1.4s) ≈ 15–20s）省不掉。
- **忠实度**：在 S31 上对照真实 `structure`——
  - `columns` / `columnsAll` / `columnDistribution` / `lineWidths` / `axisWidth`(1440,768) / `axisChars` **全部命中**；
  - **`sawContentBox` 偏差 2**（86 vs 88）；
  - **390 档 `axisWidth` 我的简化版拿不到**（`null` vs 真实 354）——因为真实 `probe.mjs` 有一套「正文盒子回退」逻辑（`probe.mjs` 里 `big` / `leafCands` 那段），我的轻量版没抄全。

**所以：轻量脚本能补 `columns`/`lineWidths`（复刻验货最关心的两个），但 `axisWidth` 与 `sawContentBox` 会有偏差——除非把 `probe.mjs` 的整段 STRUCT 逻辑原样搬过来（那它就不轻了，且与引擎双份维护、必然漂移）。**

### 4.3 建议

**推荐：不做全量重渲染，只在「季度复刻验货」真正要用的那 3 案上，用真引擎重渲染。** 理由：

1. 只有复刻验货读 `structure`（见 §5：所有闸门都不读它）。而在用的 3 案是 S03/S07/S17（或 S01/S07/S17）——**只需重渲染这 3 案**，约 3 × 40s ≈ 2 分钟，而不是 30 案 18–37 分钟。
2. 重渲染是**安全操作**（§3 实测：除 `at`+`structure` 外零变化），不会污染既有数值。
3. 若要「全库统一」，接受 `at` 全变 + 9 案截图抖动即可；**不要**为了省时间写双份测量逻辑的轻量脚本——那正是本仓库反复出现的「两套判据必然漂移」的坑（`structure` 的 `sawContentBox` 已经在轻量版上偏了 2）。
4. 若担心截图抖动进 git：重渲染后**只提交 `report.json`，截图保持 `git checkout` 还原**——因为报告数值稳定、截图只是相位噪声。但需确认 `check-stale.mjs` 的 jpg/report 同步判据不会因此报红（它比 `jpg.mtime > report.mtime`，只提交 report 会让 jpg 显得旧——见 §5.3 的风险提示）。

---

## 5. 闸门影响：有没有静默跳过？

**先给结论：没有任何闸门读 `metrics.structure`，所以「30 份没有 structure」不会让任何闸门静默跳过——它们根本不查这个字段。** 逐闸门核实：

### 5.1 `check-distribution.mjs`

- **不读 `report.json`**：全文 `readFileSync` 只读 `data.js` / `prompts.js`（`check-distribution.mjs:193-198`），`report.json` 出现次数 **0**（`grep -c` 实测）。
- 它里面的 `structure`（`:218` `structure: s.structure`、`:369` `if (!r.structure)`）读的是 **`data.js` 的 `s.structure`**——那是**设计标签**（`NEWS-FRONT`/`SPLIT`/`CHRONO`…，来自 `_specs/*.md` 括号里的骨架名，`collect-schemes.mjs:210`），**与 `metrics.structure`（渲染测出的栏数/线宽）完全是两回事**。
- 因此：`check-distribution` 与本次字段差异**无关**，不构成静默跳过，也**不会被「补 structure」影响**。
- 附注（非静默跳过、但值得知道）：`:369` 的 `if (!r.structure)` 对设计标签缺失会报 `dist-value-missing` FAIL——但它查的是 data.js，不是 report.json。

### 5.2 `check-contract.mjs`

- 只读 `report.json` 的 **`findings`** 和 **`at`**：`check-contract.mjs:144` `filter((f) => f.level === 'FAIL')`、`:145` `at: j.at`。
- **不读 `metrics` 任何字段**，不读 `structure`。
- 缺失/损坏 `report.json` 会升级为 `C0-report-missing`/`C0-report-unreadable` FAIL（`:202-210`），不会静默跳过。
- 因此：无结构字段不影响本闸门。实测当前 `FAIL 0 / WARN 1 / INFO 2` 全绿。

### 5.3 `check-stale-git.mjs`

- 只按 **git commit 序号**比较「源文件最后一次 commit」与「`report.json` 最后一次 commit」：`check-stale-git.mjs:139` 取报告路径、`:141` `lastTouch.get(rep)`、`:150` `lastTouch.get(f)`。**完全不读报告内容**（连 `at` 都不读，读的是 git 历史）。
- 因此：无结构字段不影响。实测检查 **36 个入口 / 121 个 commit，全部新鲜，exit 0**。
- **风险提示（与 §4.3 建议 4 相关）**：若重渲染后「只提交 `report.json`、还原截图」，本闸门会比「截图与报告各自的最后 commit」——只提交报告不会让本闸门报红（它只看 commit 序）；但 `check-stale.mjs`（mtime 判据）会因 jpg 比 report 旧而可能报红。

### 5.4 其它会读 `report.json` 的脚本（一并核查，均不读 structure）

| 脚本 | 读到 report.json 的哪些字段 | 读 structure？ | 备注 |
|---|---|---|---|
| `check-stale.mjs` | `at`（`:46`,`:140`）、`images[].fold/pages`（`:100-101`） | 否 | mtime 判据；at 缺失会报出（`:52-58`），不静默 |
| `collect-schemes.mjs` | `findings`（`:581-582`）、`viewports[1440].screens/realPictures/horizontalOverflow/words`（`:583,589-592`）、`images`（`:594-597`） | 否 | 只取 page 层 3 个数 |
| `summarize-all.mjs` | `page/type/headingSummary/hero`（`:47-57`） | 否（`grep -c structure` = 0） | 汇总用 |
| `verify-prototype.mjs` | `findings`、`at`、`page/headingSummary/consoleErrors/screens/images`（`:151-165`） | 否 | 逐案达标记号 |
| `check-texture.mjs` / `check-twolines.mjs` | 仅在注释里提到 report.json，不读取 | 否 | `grep` 实测 refs=1 且是注释 |
| `quarter.mjs` | 不直接读；经 data.js/prompts.js 间接取数 | 否 | — |
| `deliverables/74-q7/measure.mjs`（Q7 复刻验货度量器） | **完全不读 report.json**（`grep -c report.json` = 0），直接对 HTML 跑实时 DOM 测量 | 否 | 见 §5.5 |

### 5.5 复刻验货度量器不消费入库的 structure

`deliverables/74-q7/measure.mjs:27` `measure(file)` 是对一个 HTML **实时起 Chrome、直接量 6 个可判定量**，`report.json` 出现 0 次。也就是说：Q7 复刻验货的设计**本来就不依赖入库的 `metrics.structure`**——它每次都现量。

这带来一个重要的判断修正：**「30 案没有 `structure`」对当前的 Q7 流程不构成阻塞**，因为 Q7 现量 HTML、不读旧报告。真正的隐患是：若哪天有人想「从 report.json 快速取 3 案的基准值去对账」（比现量省一次渲染），就会撞上「S01/S07/S17 没有 structure」——那时才需要补。**所以「补 structure」不是为现在的 Q7 补，是为「离线对账/纵向季度对比」这个未来用法补。**

### 5.6 静默跳过的总账

- 三个被点名的闸门（distribution / contract / stale-git）**无一读取 `metrics.structure`**，故「旧 30 案缺 structure」**不造成三者任何静默跳过**。
- 真正存在的「静默跳过」是另一个：`check-contract.mjs` 的 C5 报告有 **2/7 条登记规则（`font-fallback`、`measure`）在规则引擎里只有 WARN 分支、永远不会 FAIL**（实测输出「这些豁免在逻辑上是空转的」）。这与 `structure` 无关，但同属「闸门看似覆盖、实则空转」这一类，一并记下。

---

## 6. 建议（三选一，带代价）

| 方案 | 做法 | 代价 | 风险 | 推荐度 |
|---|---|---|---|---|
| **A. 不动** | 30 案维持无 `structure` | 0 | Q7 现量 HTML 不受影响；但「离线取基准值对账/季度纵向对比」用不了 S01–S30 | ★★★ 若 Q7 只现量 |
| **B. 只补 3 案（推荐）** | 只重渲染复刻验货在用的 S03/S07/S17（或 S01/S07/S17），得 GEN2 报告 | ≈ 3 × 40s ≈ **2 分钟** | 除 `at`+`structure` 外零变化（§3 实测）；若含无限动画案截图会抖（S17 实测 8/8 未抖，风险低） | ★★★★ |
| **C. 全量统一 30 案** | 重渲染 S01–S30 | **18–37 分钟**串行；30 份 `at` 全变 + 各增 ~1.7KB；9 案截图可能抖 | 数据安全（仅 at+structure 变），但 git diff 噪声大；若「只提交 report、还原截图」又与 `check-stale.mjs` mtime 判据冲突 | ★★ 仅当确需全库统一 |
| ~~D. 轻量脚本只补 structure~~ | 写只量 structure 的脚本 | 46s/案（省 37%） | **不推荐**：`axisWidth`(390) 与 `sawContentBox` 与真引擎偏差（实测 354→null、86→88），等于第二套判据，必然漂移 | ✗ |

**我的建议：选 B。** 依据：
1. §5.5 证明当前 Q7 复刻验货现量 HTML、不读 `structure`，所以全量补是为一个**尚未存在**的离线对账用法付 18–37 分钟 + 30 份 diff。
2. 若确实要为「季度纵向对比」建基线，只需给**每季抽的 3 案**补 `structure`，2 分钟即可，且实测安全。
3. 无论选哪个，**不要**写轻量重复测量脚本（方案 D）——`sawContentBox` 偏 2、`axisWidth` 390 档取不到，已经是「两套判据漂移」的实证。

**若将来决定全量统一（C）**，正确流程：先确认 `check-stale.mjs` 的 mtime 判据不会因「只提交 report、还原 jpg」报红（或接受 9 案截图抖动一并提交），再一次性重渲染 + 一并提交，避免半提交状态。

---

## 附：本次审计的方法与可复现命令

- 键集递归对比：`_tmp78/scan-reports.mjs`、`_tmp78/fullkeys.mjs`
- 逐键 diff：`_tmp78/diff-report.mjs`（容差 0.05 标记 float-round，本次实际 0 处 float 差异）
- 覆盖表：`_tmp78/coverage-table.mjs`（含 at-对-引擎 commit 的交叉核对，0 矛盾）
- 轻量 structure 探针：`_tmp78/structure-only.mjs`
- 重渲染：`node prototypes/_build/render-scheme.mjs S01-…` / `S17-…` / `S05-…`，diff 后 `git checkout -- prototypes/SXX/.inspect/`（三案均已还原，`git status prototypes/` 实测为空）
- 引擎 diff：`git diff --stat 6e7f0e4 9631426 -- prototypes/_build/vendor/probe.mjs` → 204 insertions, 0 deletions（`structure` 加入 commit `9631426`）

**未改动 `prototypes/` 下任何文件**（三案重渲染后均已 `git checkout` 还原，最终 `git status prototypes/` 为空）。
