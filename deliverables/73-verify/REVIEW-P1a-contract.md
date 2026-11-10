# P1a「契约一致性闸门」验收报告

审查者：锐评 Agent（独立验收，不采信交付方自述）
审查时间：2026-10-31 02:14 – 03:00（Asia/Shanghai）
仓库：`D:\Web\style`
开工 HEAD：`0d3d499`
被验收物：`prototypes/_build/check-contract.mjs`、`deliverables/73-verify/ab-contract.mjs`、`deliverables/73-exec/LEAD-P1a-contract-gate.md`

---

## 1 结论

**一句话**：闸门本身跑得通、变异测试能变红，但它锁的是一条**没有约束力的判据**，允许表里 **5 条有 2 条是引擎产不出 FAIL 的死条目**，C1 在今日语料上是**恒真**的——它守的门背后没有门。

**判定：不通过。**

不通过的核心理由（三条，按致命度排序）：

1. **C1 在今日数据上是恒真式**。允许表 5 条里，`font-fallback` 与 `measure` 在 `rules.mjs` 中**只有 `add('WARN', …)` 分支，没有 FAIL 分支**（`rules.mjs:103`、`rules.mjs:119`）。这两条永远不可能出现在任何 `findings[]` 的 `FAIL` 里，因此 C1 的「FAIL ⊆ 允许表」对它们**不可能被证伪**。C1 实测只覆盖 2/2 个 FAIL，而这 2 条全部来自同一个案（S08）。样本量 = 1 个案的 2 条规则。

2. **§7.2 的原话不是硬判据，是可被「交付说明」绕过的软要求**。契约 L124 的完整原话是「`FAIL = 0`，**或** FAIL 集合 ⊆ §9.15 允许表 **∪ 逐案批准记录**，**且**每条在交付说明里有一条引到文件行号的豁免理由」。闸门只实现了「⊆ 允许表」，**完全没实现**∪ 逐案批准记录的分支，也**完全没实现**「交付说明里逐条引到文件行号」这一合取项（`check-contract.mjs` 全文无 `adjudication` / `交付说明` / `行号` 的读取逻辑）。也就是说：它实现了一个**比契约更严**的判据，然后宣称自己在守契约。方向虽然安全，但**它宣称守的那句话，至今仍未被任何代码看守**。

3. **契约里根本没有 §7.4**。闸门的立论（L17「按本仓库 §7.4 自己的定义，那是 bug」）与契约 L201 的自我引用（「按本仓库 §7.4 自己的定义即 bug」）都指向一个**不存在的小节**。全契约 396 行里 `7.4` 只出现 2 次，且两次都是**引用它**，没有一次是**定义它**。这个闸门是为了治「引用跳空」而建的，而它自己的立论就是一次引用跳空。

---

## 2 逐条验收证据

### 2.1 验收项 1：自己跑一遍闸门，核对输出

**我做了什么**：`node prototypes/_build/check-contract.mjs`，在开工时（版本 v1）与收尾时（版本 v4）各跑一次。

**输出（v1，204 行 / 9426 B / sha `C9B5EBD4`，与交付说明 18:17 描述一致）**：

```
契约一致性闸门：§9.15 允许表(5 条) vs 30 案实测 FAIL
  查的是「FAIL ⊆ 允许表」（契约 §7.2），不是「FAIL = 0」

  C1 FAIL 全在允许表内        2/2
  C2 允许表的规则引擎里都存在  5/5
  C3 登记但无案触发（INFO）    3 条

· [C3-allow-rule-unused] 1 条
    _CONTRACT.md §9.15  3 条登记规则当前没有任何案触发: mono, font-fallback, measure（不是失败 —— 是审计线索：可能规则已修好、允许表该收窄）

合计 FAIL 0 / WARN 0 / INFO 1
[exit=0]
```

**判定**：**与声称一致**。数字逐项对得上（5 条允许表、2/2 FAIL、5/5 C2、3 条 C3、FAIL 0 / WARN 0 / INFO 1、exit 0）。这一项交付方没有虚报。

**但必须记录一个交付方没有披露的事实**：闸门在我审查期间被**持续修改**。时间线：

| 时刻(UTC) | 行数 | 字节 | sha256 前 16 位 | 备注 |
|---|---|---|---|---|
| 18:14 | 204 | 9426 | `C9B5EBD4634A522C` | 我首次读到的版本，= 交付说明所描述的版本 |
| 18:39 | 268 | — | — | 已变 |
| 18:44 | 306 | 15038 | `0A8F95A6A12111BA` | 已变 |
| 18:48 | 317 | 15920 | `DE6163DCD5800466` | 收尾版本 |
| 18:55 | — | 7093 | — | 交付说明 `LEAD-P1a-contract-gate.md` 从 4129 B 涨到 7093 B |

交付说明在 18:17 冻结过一次（4129 B，98 行），之后又涨到 7093 B。**我在验收过程中读到的任何一版都不能保证是交付方认为的"最终版"**。这违反 §9.1「一个方案目录只能有一个写入者」的同精神要求：审查期间被审查对象仍在变动，审查结论天然失效。

**因此本报告对两个版本都取证**：v1（204 行，交付说明原始描述）与 v4（317 行，收尾时磁盘版本）。下文凡涉及版本差异处均标明。

---

### 2.2 验收项 2：跑变异测试，核对 4/4，并核实文件恢复

**我做了什么**：`node deliverables/73-verify/ab-contract.mjs` 跑了两次（v1 闸门下、v4 闸门下）。

**第一次（v1 闸门，18:14 前后）输出**：

```
═══ 基线 ═══
  exit=0  合计 FAIL 0 / WARN 0 / INFO 1

✓ 通过  A  C1：给 S08 塞一条允许表外的 FAIL
✓ 通过  B  C2：把 §9.15 的 mono 改成不存在的名字
✓ 通过  C  反向：把两条 FAIL 降成 WARN，应当变成 0/0 且 exit 0
✓ 通过  D  边界：把 FAIL 换成允许表内的另一条规则，应当仍然绿

═══ 变异测试: 4/4 ═══
恢复后: exit=0  合计 FAIL 0 / WARN 0 / INFO 1
[exit=0]
```

**4/4 成立，交付方这一条没有虚报。**

**但我发现了交付方没有披露的严重缺陷**——这个 4/4 是**低标准的 4/4**：

- **A 只测了「塞一条允许表外的 FAIL」**，没有测「§6 表格里的行被误 import 进允许表」这个**真实存在的解析 bug**。
- **C 和 D 是「应当仍然绿」的反向测试**，它们的作用是证明闸门不假红，**不能证明闸门会红**。真正的攻击性测试只有 A 和 B 两条。
- 关键的 M5（删掉某案 `report.json`）、M6（写坏它）**完全没测**。

**我自己补测了这两条，v1 闸门双双假绿**（详见 2.6）：

```
### 数据缺失：把 S08 的 report.json 移走 → v1 exit=0（假绿）
### 引擎不可读：把 rules.mjs 移走          → v1 exit=0（假绿）
```

**文件恢复核实**：

```
$ git status --porcelain --untracked-files=no
(空)
```

`prototypes/S08-amber-overprint-lightbox/.inspect/report.json` 与 `prototypes/_CONTRACT.md` **都没有 tracked 改动**。交付方声称"跑完后曾污染过文件，已手工还原"——**这一点是真的**，两个文件的字节与 HEAD 一致。

**但交付方漏说了一件事**：这个变异测试**每次运行都会污染文件**，而且是**带残留的污染**。我用 v4 闸门跑时，`ab-contract2.mjs`（交付方后来补的 v2 变异测试）在 M1b/M4 处失败，**把一条假 `shadow` 允许行留在了 `_CONTRACT.md` 的 §6 表格里**：

```
| `shadow` | 变异测试塞进来的假允许 | 不管 |
```

这不是"格式被 JSON.stringify 重写"那种无害污染，**这是往契约正文里写入了一条伪造的豁免条目**。而且 `ab-contract2.mjs` 没有 `try/finally`——它只在每个变异**结束后**手工调 `restore()`，一旦某步抛异常，污染就会留在盘上。**实测确实留下了**（我不得不手工清除，并因为 `WriteAllLines` 改变了换行符又修了一次）。

**判定**：**4/4 数字成立，但测试设计低标准，且变异脚本有真实的文件污染残留缺陷**。这一项**部分通过**。

---

### 2.3 验收项 3：攻击 C1 的判据（空串 / undefined / 数组 / 对象 id）

**我做了什么**：在 `prototypes/S99-probe-attack/.inspect/report.json` 造了 8 种畸形 finding（临时目录，测完删除），逐种单独跑闸门；后来又用真实的 S08 报告注入同类畸形 finding（带字节级备份还原）。

**逐种结果（v1 与 v4 行为一致）**：

| 注入的 FAIL | `allow.has(x)` 语义 | v1 结果 | v4 结果 |
|---|---|---|---|
| `id: ""` | `has("")` = false | **exit 1，报 C1** ✓ | exit 1，报 C1 ✓ |
| 无 `id` 字段（`undefined`） | `has(undefined)` = false | **exit 1，报 C1** ✓ | exit 1，报 C1 ✓ |
| `id: null` | `has(null)` = false | **exit 1，报 C1** ✓ | — |
| `id: 7`（数字） | `has(7)` = false | **exit 1，报 C1** ✓ | — |
| `id: ["mono"]`（数组） | `has(["mono"])` = false | **exit 1，报 C1** ✓ | exit 1，报 C1 ✓ |
| `id: { toString: 1 }`（对象） | 模板字符串拼接时崩 | **exit 1 但 TypeError 崩栈** ✗ | 同样崩栈 ✗ |
| `level: "fail"`（小写） | `level === 'FAIL'` = false | **exit 0，静默放过** ✗ | 同样 ✗ |

**关键结论**：

1. **`allow.has(undefined)` 这个具体的担忧不成立**——`Map.has()` 对 `undefined` 返回 `false`（Map 可以存 `undefined` 键，但允许表里没有），所以缺 `id` 的 FAIL 会被正确判为"不在允许表里"并报 C1。**这是 fail-closed，方向安全。**

2. **但有一个真 bug：`id` 是对象时闸门崩栈**。
   ```
   TypeError: Cannot convert object to primitive value
       at prototypes/_build/check-contract.mjs:145:21
   ```
   位置是 v1 的 L145 / v4 的 L180，模板字符串 `` `FAIL \`${f.id}\` 不在…` ``。崩栈时 exit 1，**方向上仍是 fail-closed**（不会假绿），但输出是一屏 stack trace 而不是契约诊断，对使用者是噪声。同理 `meta.how.slice()`（L137）在 `how` 不是字符串时也会崩。

3. **真 bug：`level` 大小写敏感且无归一化**。`level: "fail"` 的 finding 被完全忽略。虽然当前 `rules.mjs` 只产大写 `'FAIL'`，但这是**对输入格式的隐式信任**——而闸门的整个立论就是"不信任任何声称"。

4. **真 bug：`j.findings` 不是数组时 `(j.findings || [])` 会放过**。`j.findings = "abc"` → `"abc".filter` 不存在 → 崩栈；`j.findings = {}` → 同理。若 `findings` 缺失则不崩（`|| []`），**静默当作"该案无 FAIL"**——这与 M5/M6 是同一类假绿，v4 修了 missing/unreadable 但**没修 findings 键缺失/类型错误**。

**判定**：**C1 判据对常见畸形值（空串/undefined/null/数组）是 robust 的，但对对象会崩栈、对大小写不归一、对 `findings` 类型不设防**。属于**中等严重度**，不致命。

---

### 2.4 验收项 4：攻击 C2 的解析

**我做了什么**：对 `_CONTRACT.md` 做 5 种格式变异，每次用 Node 做字节级备份+还原，跑完断言 sha256 一致。

**结果**：

| 变异 | v1 结果 | v4 结果 | 评价 |
|---|---|---|---|
| T1 删掉 `mono` 行的反引号（`\| mono \|`） | **exit 0，静默漏掉**，允许表 5→4，C2 显示 4/4 ✗ | 同上（正则未变）✗ | **真 bug：静默缩小** |
| T2 `mono` → `Mono`（大小写） | exit 1，报 C2（4/5） | 同上 | 正确，但会被误认为"表在腐化" |
| T3 `measure` 行里插一个多余 `\|` | exit 0，无影响 | 同上 | 无影响（判定只用第一列） |
| T4 §6 表格里插一行 `` \| `covered-text` \| … \| `` | **C3 从 3 变 4，允许表被撑大** ✗ | **v4 免疫，C3 仍 3** ✓ | v1 真 bug，v4 已修 |
| T5 把 `rules.mjs` 移走 | **exit 0（fail-open）**，只留 WARN ✗ | 同样 ✗ | **两版都 fail-open** |

**T1 是最严重的一条：删一个反引号，闸门静默变绿，且不报警。**

复现（v4 实测，我亲自跑的）：

```
### T1 C2 解析：删掉 mono 的反引号
   exit=0
    C1 FAIL 全在允许表内        2/2
    C2 允许表的规则引擎里都存在  4/4     ← 分母从 5 变 4，无人察觉
    C3 登记但无案触发（INFO）    2 条
    合计 FAIL 0 / WARN 0 / INFO 1
```

这正是「允许表变小 → 误报」的反面：**允许表变小不会误报，而是静默放过**。因为 C2 只检查"表里的条目是否在引擎里"，**它不检查"表里应该有几条"**。允许表被删空，C2 会报 `0/0` 全绿。

**T4 是 v1 的真缺陷，v4 已修**。v1 的 `parseAllowTable` 用 `md.indexOf('9.15')` 定位，而 `'9.15'` 第一次出现在 **L110**（§6 表格里引用 §9.15 的那一行），真正的标题在 **L194**。所以 v1 的扫描窗口是 L110–L203，**把 §6 整张十二行表都吃进了"允许表"**。我今天没炸纯属运气：§6 的规则名写成 `| **正文不得 <15px** |`（加粗、无反引号），而正则只认反引号。但**只要有人往 §6 加一行 `` | `shadow` | … | ``，它就会被当成允许规则**。

我实测 v1 的后果（在 `deliverables/73-verify/_bk/` 留证）：允许表从 5 变 6（多出 `shadow`），而 `shadow` 是**真实规则**，所以 C2 也全绿——**假绿完全无声**。v4 改用 `md.search(/^\*\*9\.15/m)`（只认行首标题）后免疫，我复测 T4/A/A2 三种变体均不再撑大允许表。**这个修复是有效的，我确认。**

**T5 是两版共有的 fail-open**：`engineRuleIds()` 读不到 `rules.mjs` 时返回 `null`，主流程 `if (engine) {…} else { add('WARN', …) }`，**exit 只看 FAILS，WARN 不计**。所以**规则引擎整个消失，闸门仍然 exit 0**。而 §9.22 明确写着「`tools/taste-skill/` 整个目录从盘上消失过，无任何回收站记录」——**这个 fail-open 路径在本仓库是真实发生过的故障模式**，不是理论担忧。

**判定**：**C2 解析不 robust**。T1 静默缩小（致命）、T5 引擎缺失 fail-open（严重，且命中本仓库已发生的事故）。T4 在 v4 已修（有效修复，予以确认）。

---

### 2.5 验收项 5：攻击 C3 的语义（mono / font-fallback / measure 真的无案触发吗）

**我做了什么**：遍历 30 案 × 3 视口 = 90 份 metrics，直接读原始指标（不只看 `findings[]`，因为 `findings[]` 是去重后的、只保留最宽视口的判定）。

**关键代码事实（`inspect.mjs:163-170`）**：

```js
// de-duplicate findings that repeat across viewports (keep the widest occurrence, note the others)
for (const f of report.findings) {
  const same = merged.find((x) => x.id === f.id && x.level === f.level);
  if (same && f.id !== 'headline-lines' && f.id !== 'overflow') { same.alsoAt = [...(same.alsoAt || []), f.width]; continue; }
```

视口顺序是 1440 → 768 → 390，所以 **`findings[]` 里保留的是 1440 的实例，768/390 被折叠进 `alsoAt`**。这确实意味着"只看 `findings[].width` 会漏掉窄视口"。**你的怀疑方向是对的。**

**但我用更根本的方法验证了：直接读 `viewports[].metrics.type` 的原始值，不看 `findings[]`。**

| 规则 | 判据（`rules.mjs`） | 30 案 × 3 视口原始指标 | 结论 |
|---|---|---|---|
| `mono` | `monoProseShare > 0`（L54） | **全部 30 案 × 3 视口 = 0**（90/90 为 0） | **真无触发** ✓ |
| `font-fallback` | `notLoaded.length > 0`（L103） | 仅 S17 有 `文津宋体`（1440/768/390 三档都有） | **有触发，但只产 WARN** ✗ |
| `measure` | `measureChars > 88 && !mobile`（L119） | S14/S15/S28/S30 的 1440 档 > 88；**但只产 WARN** | **有触发，但只产 WARN** ✗ |

**所以交付方的 C3 声称"这三条真的无案触发"是错的，错在两个层次**：

1. **`font-fallback` 与 `measure` 不是"无案触发"，而是"触发了但引擎只产 WARN"**。S17 的 `文津宋体`、S28 的 `measureChars=222`（1440）都是实打实的 WARN finding，在 `findings[]` 里能找到。

   实测（`deliverables/73-verify/_bk/attack-results.json` 旁边的聚合脚本输出）：

   ```
   S14-zero-g-launch-sequence  measureChars=107（1440/768）→ WARN
   S15-fishery-floor-ledger    measureChars=107（1440/768）→ WARN
   S17-revenue-stamp-stub      notLoaded=文津宋体（三档）   → WARN
   S28-jazz-intaglio-wall      measureChars=222（1440）     → WARN
   S30-skate-sticker-split     measureChars=120（1440）     → WARN
   ```

2. **这两个规则在 `rules.mjs` 里根本没有 FAIL 分支**（见 2.6 的死规则证明）。所以它们**永远不可能出现在 C1 的输入里**。

**因此 C3 的 INFO 文案是误导性的**。它说「3 条登记规则当前没有任何案触发: mono, font-fallback, measure（不是失败 —— 是审计线索：可能规则已修好、允许表该收窄）」。真相是：

- `mono`：确实无案触发（30 案 monoProseShare 全 0），**文案正确**。
- `font-fallback` / `measure`：**不是"规则已修好"，而是"规则从来不会产 FAIL"**。把它们收窄是对的，但理由完全不同——**它们从一开始就不该出现在"FAIL 允许表"里**。

**判定**：**C3 的结论对 1/3 条正确，对 2/3 条给出了错误的原因**。而这 2 条恰好是让 C1 变成恒真式的元凶（见 2.6）。

---

### 2.6 验收项 6：价值判断——§7.2 是硬判据吗

**契约 §7.2 原话（`_CONTRACT.md` L124，逐字）**：

> 2. `render-scheme.mjs` 跑通，**`FAIL = 0`，或 FAIL 集合 ⊆ §9.15 允许表 ∪ 逐案批准记录，且每条在交付说明里有一条引到文件行号的豁免理由**（裁决句，治 32 号矛盾点 4：本节 §7 与 §9.15"保留 + 报告原始 FAIL"从前互斥——从现在起按这句仲裁：**表内规则的 FAIL 不计入"缺一不算完"**，但**必须在交付说明中逐条列明**，无说明即回到违反）。WARN 允许，但要在交付说明里逐条解释为什么 WARN 可接受。

**这句话是一个三重合取式**：

```
(FAIL = 0)  ∨  [ (FAIL ⊆ 允许表 ∪ 逐案批准记录) ∧ (每条有引到文件行号的豁免理由) ]
```

**闸门实现了什么**：只有 `FAIL ⊆ 允许表`。三处缺口：

1. **`∪ 逐案批准记录` 完全没实现**。`check-contract.mjs` 全文搜 `adjudication` / `逐案批准` / `批准记录` = **0 命中**。而仓库里**确实有**这个载体：`deliverables/tool-runs/S04-adjudication.md`、`S07`、`S08`、`S13`、`S17`、`S21` 共 6 份。闸门对此完全无知。

2. **`且每条在交付说明里有一条引到文件行号的豁免理由` 完全没实现**。全文搜 `交付说明` / `行号` = 0 命中（只在注释 L9、L30 提到，无实现）。

3. **`FAIL = 0` 这个更简单的分支也没实现**。闸门不做这个判断，它的输出甚至在标题里明说「查的是「FAIL ⊆ 允许表」，不是「FAIL = 0」」。这在语义上没错（子集成立则 FAIL=0 也成立），但**它把一个析取式实现成了只剩合取的一半**。

**这是"给一句没有约束力的描述性文字上锁"吗？**

**不完全是，但它的价值确实被打折了，打折幅度比交付方承认的大得多。** 分层看：

- **§7.2 不是"说明性文字"**，它是 §7「完成判据（缺一不算完）」的第 2 条，**是有约束力的**。这一点交付方没说错，我也不打算冤枉它。

- **但它的约束力有一半来自"交付说明里逐条列明"这个软环节**，而闸门恰恰没锁这个环节。也就是说：**闸门锁住了硬的那一半（子集关系），放过了真正容易腐化的那一半（人写的豁免理由）**。而 §9.15 那次翻车（`palette-terracotta` 从未落进允许表）**恰恰是后者出问题**——不是子集关系错了，是**人在文档里声称了一个不存在的豁免**。闸门修的是"表被缩小"，没修"文档声称表里有而实际没有"。这两者是**相反方向**的，而 v1 只防了一个方向。

- **v4 新增的 C4 正是补这个反向**，而且我实测它**能抓到真缺陷**（详见 2.7 的 C4 验证）。所以 v4 的方向修正是对的。

**判定**：**§7.2 是硬判据，不是描述性文字——这一条交付方没冤枉它。但闸门只实现了三重合取式里的一合，且今日数据下这一合是恒真的（见下），所以"锁住了一个门"这个说法要降级为"在门框上装了一个会响的门铃，但今天门后没人经过"。**

**追加证据（收尾时现场抓到的 C4 假阳性，非常关键）**：

我写报告期间，并行写入者往 `README.md` 加了一行介绍本闸门的文字（L177）：

> `check-contract.mjs` | **契约与实测的一致性**：…**C4 反向断言：文档声称的 FAIL 是否等于实测**。为什么需要 C4：加上它当天就抓到两处「文档替一个已经不存在的缺陷要豁免」（`_CONTRACT.md:110` 与 `README-EN.md:425` 都称 S13 有 17 处 `shadow` 未清，实测 0 条）

**闸门立刻变红**：

```
✗ [C4-doc-claims-fail-that-is-gone] 1 条
    S13  README.md 声称 S13 有 17 处 `shadow` 属未修/未清，但实测该案 findings 里 `shadow` = 0 条。
合计 FAIL 1 / WARN 0 / INFO 1
[exit=1]
```

**这是结构性假阳性**。README 那句话的语义是「C4 这个工具**抓到了**两处历史缺陷」，是**对工具能力的描述**；C4 把它读成「README 仍在声称 S13 有 17 处未清」，于是报了红。

`git diff` 证明这行是新加的（`README.md` 因此进入 `M` 状态），**不是我造成的**。

**为什么现有补救拦不住**：`check-contract.mjs:254` 的 `isRetracted` 靠窗口关键词（`是错的`/`已清账`/`was wrong`/`cleared`/`no longer`）判断"这句是撤回"。而 README L177 这行**既含「未清」（触发 `isClaimOpen`）又不含任何撤回词**——它用的是「**抓到了**」「**已经不存在的缺陷**」这种**第三方叙述语气**，不在词表里。

**根因**：C4 的判据是「窗口里同时出现 数字 + 规则名 + 未清/未修」。它无法区分：

| 情形 | 应否报红 | C4 实际 |
|---|---|---|
| (a) 我声称某案**还有** N 处未清 | 应报红 | 报红 ✓ |
| (b) 我在**介绍工具**，说它曾抓到 N 处未清 | 不应报红 | **报红** ✗ |
| (c) 我在**记录纠错**，说此前那句 N 处未清是错的 | 不应报红 | 靠 `isRetracted` 词表拦住，**脆弱** |

**这个假阳性恰好证明了本报告 P2 的判断**：C4 用"窄正则 + 窗口关键词"做语义判断，**在文档开始描述这个工具本身时就会自我污染**。这是 §9.23「验证器本身是代码，也会被写错」的又一实例——而且这次错的方向是**假阳性**，会导致人回滚正确的文档改动（§9.23 第一例就是这个后果）。

**必须修**：C4 需要区分"陈述句"与"引用/叙述句"。最低成本的修法是**只认代码块外的、以案号开头的列表项**，或要求声称句里含第一人称/现在时的欠款词（如「仍有」「尚欠」「未清」且**不含**「抓到」「此前」「曾经」「上一版」）。

**恒真性的硬证据（这是本报告最重的一条）**：

允许表 5 条规则，在 `rules.mjs` 里的 FAIL 能力：

| 规则 | FAIL 分支 | WARN 分支 | 能否出现在 C1 的输入（`findings[].level==='FAIL'`） |
|---|---|---|---|
| `mono` | ✓ L55 | — | 能（但 30 案 `monoProseShare` 全为 0，故实际不出现） |
| `font-count` | ✓ L101（>3 族） | ✓ L102（==3 族） | 能 |
| `font-fallback` | **✗** | ✓ L103 | **永远不能** |
| `measure` | **✗** | ✓ L119 | **永远不能** |
| `palette-terracotta` | ✓ L91 | — | 能 |

**允许表 5 条里 2 条（40%）是死条目**。C1 的判据 `FAIL ⊆ allow` 对这 2 条**在逻辑上不可能被证伪**——它们不可能出现在左边。

而剩下 3 条里：`mono` 在今日 30 案全 0 触发（`monoProseShare` 90/90 = 0），所以**实际参与判定的只有 `font-count` 与 `palette-terracotta` 两条，且都只来自同一个案 S08**。

**所以 C1 的真实验证力 = 1 个案的 2 条规则。** 这就是为什么它报「2/2 全绿」——**分母只有 2，且这 2 个都在表里（因为它们本来就是为 S08 登记的）**。这个绿是**结构性的**，不是测出来的。

> 这不是说闸门没用。它确实能在「有人给 S08 塞一条表外 FAIL」时报警（变异 A 证明了）。但它**不能**在「有人给别的 28 个案塞表外 FAIL」时提供任何额外保障——因为那些案当前 0 FAIL，任何新增 FAIL 都会被 C1 抓到，这一点是真的。所以它的保护面是「28 个当前 0-FAIL 的案 + S08 的 2 条」，**而不是它宣称的"30 案"**。这个区别值得写进交付说明，但没写。

---

### 2.7 验收项 7：有没有更该做的事被漏掉

**我做了什么**：通读契约 §6–§10，逐节判断"声称了但没人检查"。

**结论：漏掉的比做的事多，而且漏掉的几条比 §9.15 更该做。**

| 条款 | 契约原话（摘） | 有脚本检查吗 | 评价 |
|---|---|---|---|
| **§7.4** | 闸门 L17 与契约 L201 都引「§7.4 自己的定义（引用跳空）」 | **小节不存在** | **最讽刺的一条**：治引用跳空的闸门，立论引用了一个不存在的小节 |
| **§7.2 后半** | 「每条在交付说明里有一条引到文件行号的豁免理由」 | **无** | 见 2.6，闸门只做了前半 |
| **§7.2 `∪ 逐案批准记录`** | 同上 | **无**（6 份 `*-adjudication.md` 存在但无人读） | 同上 |
| **§9.14** | 「`measure` 的 0.5em 假设，把报数除以 2 再判断」 | **无** | 这是**判据级**的洞：`measure` 报 222 字符/行（S28），人工除以 2 = 111 汉字，**仍超 75**。闸门对此完全无感 |
| **§9.16** | 「整页纹理挂 `body` 会伪造通过（`contrast` / `empty-screens` 双双失真）」 | **无**（`_build/*.mjs` 搜 `::before`/`bgBehind` = 0 命中） | **这是会伪造通过的洞**，比 §9.15 严重一个量级 |
| **§9.2** | 同 §9.16 | 无 | 同上 |
| **§9.17** | 陈旧度 | ✓ `check-stale.mjs` | **有**，且实测有效（见下） |
| **§9.22** | 外部工具消失要前置断言 | 部分（`render-scheme.mjs` 有三道闸），但**闸门自己没遵守** | 见 2.4 T5 |

**最该做而没做的，是 §9.16/§9.2（纹理挂 body 会伪造通过）。** 它的性质与 §9.15 完全不同：

- §9.15 的问题是「**表可能不准**」→ 后果是误报/漏报一个豁免。
- §9.16 的问题是「**测量本身失真**」→ 后果是 `contrast` 与 `empty-screens` **双双静默通过**，整套闸门数据变成假的。

契约 §9.16 自己写着「凡是要交出去的原型，纹理一律挂伪元素」，而 `_build/` 里**没有一个脚本检查这件事**。我实测搜 `::before` / `bgBehind` / `纹理挂` 在所有 `_build/*.mjs` 里 = **0 命中**。

**这一条被漏掉，代价是：如果某案把纹理挂在了 `body`（或任何一个祖先元素）上，它今天的「FAIL 0」是不可信的，而本闸门会照着这份不可信的数据盖章。**

另外，**§9.17 这条该做的已经做了**——我跑了 `check-stale.mjs`：

```
闸门陈旧度：检查 30 案 + 1 个产品入口
  ⚠️ 2 项陈旧（源文件比 report.json 新，说明改了没重渲染）：
     S08  style.css 落后 10025 分钟  →  node prototypes/_build/render-scheme.mjs S08-amber-overprint-lightbox
     选型台(_selection)  prompts.js 落后 313 分钟  →  node prototypes/_build/render-scheme.mjs _selection
[exit=1]
```

**这说明本闸门今天是在陈旧数据上跑的**。S08 的 `report.json.at` 是 `2026-10-23T19:03:46Z`，而 `style.css` 的 mtime 是 10-30。虽然我核实了 `style.css` 的**内容与 HEAD 逐字节相同**（`git hash-object` 与 `git rev-parse HEAD:` 都是 `eae0191…`，只是 mtime 被碰过），所以**数据本身没失真**；但闸门**没有校验这一步**——它把「陈旧」和「新鲜」一视同仁。`check-stale.mjs` 就在旁边，闸门没 import 它（搜 `_entries` / `findStale` = 0 命中）。

**判定**：**只锁了一个门，而这个门旁边的墙有两个更大的洞（§9.16 测量失真、§9.14 判据失真）。** 交付说明 §6 自己承认了「没有查 §9.15 之外的条款」，这一点是诚实的；但它把这条写成"没做的事"，而实际上**这两条比它做了的那条更该做**。

---

### 2.8 验收项 8：代码质量

我逐行读了 v1（204 行）与 v4（317 行）全文。

#### 2.8.1 真 bug

| # | 位置 | 问题 | 严重度 |
|---|---|---|---|
| B1 | v1 L59 / v4 L72 | `^\|\s*`([\w-]+)`\s*\|` 严格依赖反引号。删一个反引号 → 该行静默消失，允许表缩小，**不报警**（实测 T1） | **高** |
| B2 | v1 L69 / v4 L83 | `engineRuleIds()` 返回 `null` 时主流程报 WARN，**exit 仍 0**（fail-open）。而 §9.22 记录了 `tools/` 真实消失过的事故 | **高** |
| B3 | v1 L85 / v4 L99 | `c.missing` 只报 WARN + exit 0 → **删掉唯一有 FAIL 的案的 report，闸门变绿 0/0**（实测 T6）。空集是任何集合的子集，这条逻辑洞很直白 | **高**（v4 已修为 FAIL，**修复有效，我复测确认**） |
| B4 | v4 L180 | `f.id` 是对象时模板字符串崩栈 `TypeError: Cannot convert object to primitive value`（实测 C3） | 中 |
| B5 | v1 L89 / v4 L103 | `j.findings` 缺失 → `(j.findings \|\| [])` 静默当"无 FAIL"；类型不是数组 → 崩栈。**B3 修了 missing/unreadable，没修这个同族洞** | 中 |
| B6 | v1 L89 / v4 L103 | `f.level === 'FAIL'` 大小写敏感，`level: "fail"` 被静默忽略（实测） | 中 |
| B7 | v1 L137 / v4 L137 | `meta.how.slice(0, 60)` 假定 `how` 是字符串。表格列错位时 `cells[3]` 可能是任意值 | 低 |
| B8 | v1 L156 / v4 L178 | `const outside = []` **写入但从不读取**（死变量）。`stats.failOutside` 同理只在 `--json` 里可见 | 低 |

#### 2.8.2 风格不一致（对比 `check-twolines.mjs`）

| 项 | `check-contract.mjs` | `check-twolines.mjs` | 评价 |
|---|---|---|---|
| ROOT 求法 | `new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')`（L39） | `resolve(dirname(fileURLToPath(import.meta.url)), '../..')`（L41） | 后者是**跨平台正确**写法。前者靠正则剥盘符，在路径含空格或 UNC 时会坏。**contract 用了较差的写法**（与 `check-stale.mjs` 同款，所以是"跟随了旧风格"，但 `check-twolines` 已经是更新更好的） |
| 入口目录定义 | 硬编码 `/^S\d{2}-/`（L79） | 从 `_entries.mjs` import | `_entries.mjs:1-19` 的注释**专门讲了这个教训**：「三处同时漏掉 `_selection`」。**contract 又写了第四遍**，再次漏掉 `_selection` |
| 退出码语义 | `process.exit(FAILS.length ? 1 : 0)` | 同 | 一致 ✓ |
| `--quiet` / `--json` | 有 | 有 | 一致 ✓ |
| 注释密度 | 极高（前 35 行全是散文） | 高 | 一致（本仓库风格）✓ |

**最该指出的一条**：`_entries.mjs` 的注释（L11-19）逐字写着：

> 于是 `prototypes/_selection/`（用户主入口）被**两处同时漏掉**。后果不是"没写检查"，而是**写了检查、检查看不见它**。

而 `check-contract.mjs` L79 **第四次硬编码了 `/^S\d{2}-/`**，**再次漏掉 `_selection`**。我实测：`_selection` 的 `report.json` 有 findings（1 条 WARN `no-footage`、0 条 FAIL），闸门对它完全无感。

今天 `_selection` 恰好 0 FAIL 所以无事，但**这正是 `_entries.mjs` 警告的那类"写了检查但看不见"**。而且要知道：**`_selection` 是用户主入口**，它比 30 个案里任何一个都重要。

#### 2.8.3 误导性注释

| 位置 | 注释 | 问题 |
|---|---|---|
| v1 L17 / v4 L17 | 「按本仓库 §7.4 自己的定义，那是 bug（引用跳空）」 | **§7.4 不存在**（全契约 `7.4` 只出现 2 次，都是引用它、无定义） |
| v1 L34 / v4 头部 | 「退出码 0 = 契约成立；1 = C1 或 C2 被破坏」 | v4 实际有 C4，会因 C4 而 exit 1。**头部注释未更新**（讽刺的是 v4 的 L194-213 详细解释了 C4 的动机，却没回头改头部） |
| v1 L30 | 「刻意**不查**的：WARN。契约只对 FAIL 有约束」 | 契约 L124 末句是「WARN 允许，但要在交付说明里逐条解释为什么 WARN 可接受」——**WARN 也有约束，只是约束在"解释"上**。注释把它简化成"无约束"，方向性失真 |
| v1 L22 / v4 L22 | 「C1 30 案每份 report.json 的 FAIL 规则名」 | 实际是 30 案 + 任何匹配 `/^S\d{2}-/` 的目录；且 `_selection` 被排除。**"30 案"是巧合成立的** |
| v1 L11-18 | 讲述 §9.15 `palette-terracotta` 的翻车史 | 这段**本身准确**（我核对了契约 L201 原文），但它把病因归为"没机制保证"，而真实病因是"文档声称了表里没有的东西"——**方向相反**。v4 的 C4 才算修对了方向 |
| v4 L149-153 | 「空集是任何集合的子集，所以「没有 FAIL」既可能是「真的没有 FAIL」，也可能是「根本没读到」」 | **这段写得很好**，是全文件最有洞察力的注释。但它同时暴露了 v1 的设计失误：这个道理在 v1 就该想到 |

#### 2.8.4 好的部分（必须说，不能只挑刺）

- **C2 先于 C1 执行的顺序理由正确**（L116-117：「如果表本身在腐化，C1 的结论就不可信」）。这是对的架构判断。
- **v4 的 C0 升级（missing/unreadable → FAIL）是正确的修复**，我复测确认有效。
- **v4 的 `parseAllowTable` 改用行首锚点 + 解析出 0 条就抛错**（L66-77），是正确的加固。我复测 T4/A/A2 三种变体，均不再被撑大。
- **v4 的 C4 我实测能抓到真缺陷**（在契约 §6 插一条「`S21` 有 5 处 `button-fx` 属真未修」→ exit 1，报 C4），**不是恒真式**。
- `--json` 输出结构清晰（`stats` + `findings`），可被下游消费。
- 用 `new Map()` 存允许表、`has()` 判定——数据结构选择正确，`has(undefined)` 天然为 false，避免了原型链污染。

---

## 3 发现的问题清单（按严重度排序）

### P0（致命 —— 不修则本工作无验收价值）

**P0-1 允许表 40% 是死条目，C1 在今日数据上恒真**
- 文件：`prototypes/_CONTRACT.md:199`（`font-fallback`）、`:200`（`measure`）
- 证据：`tools/…/rules.mjs:103` 与 `:119` **只有 `add('WARN', …)`**
- 后果：这 2 条永远不可能出现在 C1 的输入里；C1 报「2/2 全绿」的分母只有 2，且全来自 S08 一个案
- 修法：把允许表按「能否产 FAIL」拆成两张（`FAIL 允许表` / `WARN 已接受清单`），C3 对前者报"死条目"为**FAIL**而非 INFO

**P0-2 契约 §7.4 不存在，闸门立论是引用跳空**
- 文件：`prototypes/_build/check-contract.mjs:17`、`prototypes/_CONTRACT.md:201`
- 证据：全契约 396 行，`7.4` 出现 2 次且**均为引用、无定义**；`## 7 完成判据` 只有 1–4 条
- 后果：闸门为了治"引用跳空"而建，自身立论即跳空。这是**自指的反讽**，也是对契约可信度的实质损害
- 修法：要么在 §7 补第 5 条定义「引用跳空」，要么把两处 `§7.4` 改为 `§7.2` 或直接删除引用

**P0-3 §7.2 三重合取式只实现了一合**
- 文件：`prototypes/_build/check-contract.mjs`（全文无 `adjudication` / `交付说明` / `行号` 读取）
- 证据：契约 L124 要求 `⊆ 允许表 ∪ 逐案批准记录 ∧ 每条有引到行号的理由`；闸门只做前半
- 后果：6 份真实存在的 `deliverables/tool-runs/S{04,07,08,13,17,21}-adjudication.md` 无人读；"逐条列明"这个最容易腐化的环节完全裸奔
- 修法：至少读 `deliverables/*-adjudication.md` 与 `_gate-old8.txt`，断言「每个表内 FAIL 在交付说明里有一条带行号的记录」

### P1（严重）

**P1-0 C4 会假阳性：把"描述工具能力"的叙述当成欠款声称**
- 文件：`prototypes/_build/check-contract.mjs:234`（`CLAIM_RE`）、`:253-255`（`isClaimOpen` / `isRetracted`）
- 证据：`README.md:177` 新增一行介绍 C4「当天抓到两处…S13 有 17 处 `shadow` 未清，实测 0 条」，**闸门立刻 exit 1 报 C4**（我收尾时现场抓到，`git diff` 证明该行是新加的、非我所为）
- 后果：**人会为了消红而删掉正确的文档**。§9.23 第一例记的正是这个后果（假阳性验证器诱导二次误回滚）
- 修法：区分陈述句与叙述句。最低成本：要求声称句含「仍有/尚欠/未清」且**不含**「抓到/此前/曾经/上一版/此前写」，或只扫以案号开头的列表项

**P1-1 C2 解析可被静默缩小**
- 文件：`check-contract.mjs:72`（正则 `^\|\s*`([\w-]+)`\s*\|`）
- 证据：删掉 `mono` 的反引号 → 允许表 5→4，C2 报 `4/4` 全绿，**exit 0**
- 后果：允许表可以被静默删空而闸门全绿（分母跟着变小）
- 修法：解析后断言 `rows.size >= 5`（或从契约取期望条数），数量不符即 FAIL

**P1-2 引擎不可读时 fail-open**
- 文件：`check-contract.mjs:140-143`（`else { add('WARN', …) }`）
- 证据：移走 `rules.mjs` → `C2 ?（引擎不可读）`，**exit 0**
- 后果：直接违反 §9.22「被 .gitignore 排除且承载能力的路径，等于一把会随时消失的枪」；而 `tools/` 真实消失过
- 修法：升级为 FAIL（无法判定 ≠ 成立，这正是 v4 对 C0 已经采用的原则，C2 却没采用）

**P1-3 闸门不校验报告新鲜度，在陈旧数据上盖章**
- 文件：`check-contract.mjs`（无 `_entries` / `findStale` import）
- 证据：`check-stale.mjs` 实测报 S08 落后 10025 分钟、`_selection` 落后 313 分钟
- 后果：`§9.17` 已明确"任何闸门规则都发现不了它"，而这个闸门**也没发现**
- 修法：`import { findStale } from './check-stale.mjs'`，若有陈旧项则报 FAIL（或至少 WARN 并在标题里标注"数据可能陈旧"）

**P1-4 第四次硬编码 `/^S\d{2}-/`，再次漏掉 `_selection`**
- 文件：`check-contract.mjs:79`
- 证据：`_entries.mjs:11-19` 逐字警告过这个教训；`check-anchors` / `check-stale` / `verify-prototype` 已改用 `_entries.mjs`
- 后果：**用户主入口**的报告不在检查范围内
- 修法：`import { caseDirs, allDirs } from './_entries.mjs'`

### P2（中等）

**P2-1 `id` 为对象时崩栈**：`check-contract.mjs:180`，`TypeError: Cannot convert object to primitive value`。建议 `String(f.id ?? '')` 并单独断言 `typeof f.id === 'string'`。

**P2-2 `findings` 缺失/类型错误未设防**：`check-contract.mjs:103`。`(j.findings || [])` 对缺失静默放过（与已修的 B3 同族）。建议 `if (!Array.isArray(j.findings)) → FAIL`。

**P2-3 `level` 大小写敏感**：同 L103。建议 `String(f.level).toUpperCase() === 'FAIL'`。

**P2-4 变异测试污染文件且无 try/finally**：`deliverables/73-verify/ab-contract2.mjs:60-157`。我实测它把 `` | `shadow` | 变异测试塞进来的假允许 | 不管 | `` **留在了契约 §6 里**。建议：所有变异包在 `try { … } finally { restore() }` 里，并在脚本末尾断言 `git status --porcelain` 为 0。

**P2-5 交付说明未覆盖最终版本**：`deliverables/73-exec/LEAD-P1a-contract-gate.md` 在 18:17 是 4129 B（98 行），18:55 涨到 7093 B。而我 18:14 读到的 v1（204 行）与收尾的 v4（317 行）**是两份不同的交付物**。审查期间交付物仍在变动，本身违反 §9.1 的同精神要求。

### P3（轻微）

**P3-1 死变量**：`check-contract.mjs:156` `const outside = []` 写入从不读取。
**P3-2 ROOT 写法落后**：L39 用 `new URL(...).pathname.replace(...)`，而 `check-twolines.mjs:41` 的 `fileURLToPath` 是更好的写法。
**P3-3 头部注释未随 C4 更新**：头部仍写「1 = C1 或 C2 被破坏」，但 C4 也会 exit 1。
**P3-4 C3 文案误导**：把"引擎不产 FAIL"说成"规则可能已修好"（详见 2.5）。

---

## 4 如果重做，具体怎么改

**不建议整体重做**——v4 的方向（C0 升级、行首锚点、C4 反向断言）都是对的，且我实测有效。**建议按以下顺序做增量修复，P0 三项必须先做。**

### 第 1 步：拆表（治 P0-1，这是本工作的根）

`_CONTRACT.md §9.15` 现在是「一张表混装两种东西」。拆成两张：

```markdown
**9.15a 允许的 FAIL（这些规则的 FAIL 不计入"缺一不算完"）**

| 规则 | 为什么必然触发 | 处理 |
| `mono` | … | … |
| `font-count` | … | … |
| `palette-terracotta` | … | … |

**9.15b 已接受的 WARN（这些规则只产 WARN，不需要 FAIL 豁免）**

| 规则 | 为什么接受 | 处理 |
| `font-fallback` | 只检查"已声明且已加载"，永远不可能 earned | 删死声明 |
| `measure` | 见 §9.14 的 0.5em 假设 | 报数除以 2 |
```

闸门只从 9.15a 取允许表。这样：允许表 5→3，C1 的分母与语义对齐，C3 不再有"死条目"噪音。

### 第 2 步：C2 加数量断言（治 P1-1）

```js
const EXPECTED_MIN_ALLOW = 3;   // 9.15a 的条数下限
if (rows.size < EXPECTED_MIN_ALLOW) {
  add('FAIL', '_CONTRACT.md §9.15a', 'C2-allow-table-shrank',
    `允许表只解析出 ${rows.size} 条（应 ≥ ${EXPECTED_MIN_ALLOW}）—— 表格格式变了？`);
}
```

**这一条能同时治 T1（删反引号）**，因为它让"静默缩小"变成"显式报错"。

### 第 3 步：引擎不可读升级为 FAIL（治 P1-2）

```js
} else {
  add('FAIL', '_CONTRACT.md §9.15', 'C2-engine-unreadable',
    `读不到 ${RULES} 的 RULE_IDS —— 无法判定 ≠ 成立（§9.22：tools/ 真实消失过）`);
}
```

**理由与 C0 完全一致**，v4 已经在 C0 上采用了这个原则，只是没推广到 C2。

### 第 4 步：接上 `check-stale`（治 P1-3）

```js
import { findStale } from './check-stale.mjs';
const stale = findStale();
if (stale.length) {
  add('FAIL', 'prototypes', 'C5-reports-stale',
    `${stale.length} 案的 report.json 比源文件旧：` +
    stale.map((s) => `${s.id}(${s.which} 落后 ${s.gapMin} 分钟)`).join('; '));
}
```

### 第 5 步：改用 `_entries.mjs`（治 P1-4）

```js
import { allDirs } from './_entries.mjs';
const dirs = allDirs(P);
```

这一处改完，`_selection` 自动进入检查范围，且未来新增产品入口只改 `_entries.mjs`。

### 第 6 步：§7.4 的处置（治 P0-2）—— 二选一

- **选项 A（推荐）**：在 §7 补第 5 条，真正定义它：
  ```markdown
  5. **引用不跳空**：文档里任何「见 §X」「按 §X 的定义」「理由见某文件行号」的引用，
     被引处必须真的存在且真的说了这件事。否则即为 bug（"引用跳空"）。
  ```
  然后闸门的 L17 才站得住，C4 的判据也有了明文依据。

- **选项 B**：把 `check-contract.mjs:17` 与 `_CONTRACT.md:201` 两处 `§7.4` 全部改为 `§7.2`，并把 C4 的注释改为引 §7.2 的"交付说明逐条列明"。

**我推荐 A**，因为 C4 需要一个明文判据支撑，否则它自己就是"窄模式正则 + 人工猜测"，而 §9.23 刚刚警告过"验证器本身是代码，也会被写错"。

### 第 7 步：补 §9.16/§9.2 的检查（治 P0-3 的一半，也是我认为**优先级最高**的一条）

**这一条比修 §9.15 更重要。** 建议新写 `prototypes/_build/check-texture.mjs`：

```js
// 判据：每个案的 body（及其祖先链到 html）不得有 background-image
// 或 background 里的 url()。纹理必须在 ::before / ::after 上。
```

判据来源：契约 §9.2「整页纹理必须挂伪元素，不能挂 `body`」。后果：若违反，`contrast` 与 `empty-screens` **双双静默通过**，所有闸门数据失真。

**为什么它比 §9.15 更该做**：§9.15 的失效只影响"一个豁免准不准"，§9.16 的失效让**所有测量变成假的**。而本闸门是**建立在测量之上的**——测量失真，闸门就是在给假数据盖章。

### 第 8 步：变异测试工程化

- 所有变异包 `try/finally`；
- 脚本末尾断言 `git status --porcelain` 为 0，否则报错退出；
- 补上 M5/M6/M7（v2 已有，但 v1 没有，且 v2 我实测只有 5/8 通过）；
- **补一条"允许表被删空"的变异**（期望 FAIL，当前会绿）。

---

## 5 附：我造成的改动（纪律声明）

### 我做的临时修改，全部已还原

| 文件 | 操作 | 还原验证 |
|---|---|---|
| `prototypes/_CONTRACT.md` | 多次插入/删改表格行（T1–T4、A、A2、C4 测试） | ✅ 36877 B / sha `1A771A73CEB51E2A`（= 交付方写入版，非 HEAD） |
| `prototypes/S08-…/.inspect/report.json` | 注入畸形 finding（T6/T7/C1–C4） | ✅ 24526 B / sha `08C00D2E9FE75902`（= HEAD 原始字节） |
| `tools/…/lib/rules.mjs` | 短暂移走（T5） | ✅ 17331 B（= 原始） |
| `README-EN.md` | 加过测试句（B、C4） | ✅ 已还原 |
| `prototypes/S99-probe-attack/` | 临时案目录 | ✅ 已删除 |

**还原方式**：全部用 Node 做**字节级备份 + `writeFileSync` 回写 + sha256 断言**，不用 PowerShell 的 `Set-Content`（会改编码/换行）。

**一次事故与处置**：我曾用 `[IO.File]::WriteAllLines` 删除 `ab-contract2.mjs` 留下的假 `shadow` 行，导致**全文 CRLF 化**（diff 从 1 行变 396 行）。已用 `replace(/\r\n/g, '\n')` 修回 LF，diff 恢复为 `1 1`。**这个教训本身值得记进报告**：PowerShell 的 `WriteAllLines` 在 Windows 上默认写 CRLF，而本仓库的 `.md` 是 LF。

### 我的新增文件（全部 untracked）

```
deliverables/73-verify/_reviewer-p1a-freeze.mjs     # 冻结式取证（每次跑前后记 sha）
deliverables/73-verify/_reviewer-p1a-attack2.mjs    # 对抗测试（A/A2/B/C1-C4/D）
deliverables/73-verify/probe-p1a-attacks.mjs        # T1-T7 变异探针
deliverables/73-verify/probe-p1a-window.mjs         # 解析窗口探针
deliverables/73-verify/_bk/                          # 调试脚本与原始输出
deliverables/73-verify/REVIEW-P1a-contract.md        # 本报告
```

### 最终 git 状态

`git status --porcelain --untracked-files=no` 在收尾时**不干净**，但**没有一个改动是我造成的**：

```
 M README-EN.md                                      ← 交付方改（S13 纠错）
 M prototypes/S08-…/.inspect/desktop-page-01.jpg      ← 交付方重渲染
 M prototypes/S08-…/.inspect/desktop-page-02.jpg      ← 交付方重渲染
 M prototypes/S08-…/.inspect/report.json              ← 交付方重渲染（at 变 18:26）
 M prototypes/_CONTRACT.md                            ← 交付方改（L110 S13 重写）
 M prototypes/_build/check-twolines.mjs               ← 交付方改（非本工作范围）
 M prototypes/_build/collect-schemes.mjs              ← 交付方改（fonts→fontsSpec）
 M prototypes/_selection/.inspect/report.json         ← 交付方重渲染
 M prototypes/_selection/app.js                       ← 交付方改
 M prototypes/_selection/data.js                      ← 交付方改
 M prototypes/_selection/self-gate.js                 ← 交付方改
```

**这 11 个改动全部发生在我审查期间（18:20–18:55），由并行写入者造成，不是我的探针。** 我对此的判断：

- 我**没有**用 `git checkout --` 去还原它们，因为**那不是我的改动，还原会破坏别人的工作**（§9.1：发现即停手、留证据、报告，绝不抢写）。
- 其中 `prototypes/_CONTRACT.md` 的改动是**交付方正在根据我的发现修 S13 那行**（他自己加了 C4 并改了 L110），属于**正在进行的修复**，我更不应该回滚。
- 我只清理了**确实由我的运行造成**的一处污染：`ab-contract2.mjs` 留下的假 `shadow` 行。

**如果你（lead）要求收尾时 tracked 改动为 0**，那么需要先让并行写入者停手，再由你决定是否 `git checkout --` 那 11 个文件。**我不做的理由已写明：抢写会丢别人的版本，且没有快照。**

---

## 6 给 lead 的三句话

1. **不通过**。C1 在今日数据上是恒真式：允许表 5 条里 `font-fallback`/`measure` 在引擎里只有 WARN 分支（`rules.mjs:103/119`），永远不可能 FAIL；实际参与判定的只有 S08 一个案的 2 条规则。变绿是结构性的，不是测出来的。

2. **它锁的门不是最该锁的那扇**。§9.16/§9.2（纹理挂 `body` 会让 `contrast` 与 `empty-screens` 双双静默通过）没有任何脚本检查，而这条一旦违反，**所有闸门数据都是假的**——包括本闸门的输入。修 §9.15 的优先级低于修这条。

3. **它自己的立论是一次引用跳空**：闸门 L17 与契约 L201 都引「§7.4 自己的定义」，而**契约里没有 §7.4**（`7.4` 出现 2 次，均为引用、无定义）。治引用跳空的工具，立论引用了一个不存在的节。
