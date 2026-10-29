# 第 71 轮长任务计划：让「用户看到的」等于「用户拿到的」

> 立项时刻：2026-10-30 03:00
> 基线 HEAD：`dc71c32`　工作区干净　全检查器绿
> 侦察探针：`deliverables/71-plan/RECON-*.mjs`（4 个）

---

## 0. 为什么这是长任务，不是「修一个色块」

侦察发现了**根本模式**：这个仓库里，**同一件事被两条独立的数据链各算一遍**。

```
                    ┌─ 规格文本 _specs/*.md ──→ collect-schemes.mjs ──→ data.js ──→ 选型台 UI
某个设计事实 ───────┤                                                              （用户**看**这个）
（比如"这个案有几种颜色"）│
                    └─ style.css 的 :root ────→ clean-dna.mjs ──→ prompts.js ──→ 提示词
                                                                              （用户**拿**这个）
```

两条链**没有任何共享代码**，各有各的抽取逻辑、各有各的上限。

### 实测到的分歧（`RECON-datachains.mjs`）

| 字段 | 两链不一致 | 语义 |
|---|---|---|
| `palette` | **22/30 案集合不同**，28/30 顺序不同 | 用户看到 3–4 色块，提示词要求 4–7 色 |
| `primary` | **9/30 案** | 一边从规格文本取，一边从 `:root` 取 |
| `fonts` | data.js 存**原始规格文字**，prompts.js 存**结构化对象** | 类型都不同，无法比较 |
| `bg` | 0 ✓ | 因为两边都从同一条正则取 |
| `minItems` | 0 ✓ | 因为只有一条链算 |

### 这个模式的代价已经兑现过三次

| 轮次 | 症状 |
|---|---|
| 69 | `_selection/.inspect/report.json` 冻结 6 天，无守卫 → 闸门谎报 FAIL 0 |
| 70 | `_prompts/dna-raw.json` 落后 3.5 天 → 生成链 2/3 不可复现 |
| 70 | 选型台画 3 个色块，提示词要求 7 色 → **用户按错误的预览选风格** |

前两次都是「补一个守卫」。这一次要治根：**让两条链共用一份事实**。

---

## 1. 目标（可验收）

### 主目标
**对每一个「同一件事有两处描述」的字段，要么合并成单一来源，要么建立自动化对账并纳入闸门。**

### 验收判据（全部可机械验证）

| # | 判据 | 命令 | 目标 |
|---|---|---|---|
| A1 | 两链 `palette` 集合一致 | `node deliverables/71-verify/twolines.mjs` | **30/30** |
| A2 | 两链 `primary` 一致 | 同上 | **30/30** |
| A3 | 两链 `fonts` 语义一致（不是格式一致）| 同上 | **30/30** |
| A4 | 选型台色块数 = 提示词色数 | 同上 | **30/30** |
| A5 | 新增对账闸门，纳入 check-* 家族 | `node prototypes/_build/check-twolines.mjs` | exit 0 |
| A6 | 闸门自查：故意制造分歧必须报 | `node deliverables/71-verify/ab-gate.mjs` | 必须 exit 1 |
| A7 | 现有 5 个检查器全绿 | 见 §5 | 全部 exit 0 |
| A8 | 闸门 29/1/30 不变 | `verify-prototype --all` | 29/1/30 |

---

## 2. 任务分解（6 个工作包，可并行部分已标注）

### WP1 · 事实测绘（**串行前置**，其他都依赖它）

**产出**：`deliverables/71-plan/FACTS-matrix.md`

对 30 案 × 每个共享字段（`palette` / `primary` / `fonts` / `bg` / `minItems` / `radius` / `shadow` / `lineWidths`）：

1. 列出**四层数据**各自的真实值：规格原文 → `data.js` → `dna-clean.json` → `prompts.js`
2. 判断每层**语义是什么**（是"设计意图"？"UI 展示用"？"施工参数"？）
3. 标注**哪个是权威**（有规格原文的以原文为准；没有的以最直接测量的为准）
4. 给出每个字段的**合并方案**：单一来源在哪一层？

**关键判断**：`palette` 的两套语义可能是**都合理的**——
- `data.js` 的 3–4 色 = 推荐卡要展示的"主调"（多于 4 个色块反而看不清）
- `prompts.js` 的 4–7 色 = AI 施工需要的完整色板

如果是这样，**正确修法不是让两者相等，而是让 UI 明说"这是主调，完整色板见提示词"**。
WP1 必须用数据回答这个问题，不能靠猜。

### WP2 · 单一来源重构（依赖 WP1）

**产出**：`prototypes/_build/lib/palette-truth.mjs`（新）+ 改造两个生成器

1. 抽出一个**共享模块**，负责"从 `style.css` 的 `:root` + 规格文本 联合判定该案的权威色板"
2. `collect-schemes.mjs` 和 `clean-dna.mjs` 都 import 它
3. 保留各自的**展示策略**（UI 取前 4 个 / 提示词取全部），但**数据源唯一**

**约束**：
- 必须保持 `data.js` 兼容（它是 `window.SCHEMES`，前端直接用）
- 必须保持 `prompts.js` 的字段形状
- 改动前后跑 grade-A 对账

### WP3 · 对账闸门 `check-twolines.mjs`（可与 WP2 并行，但需在 WP1 之后）

**产出**：`prototypes/_build/check-twolines.mjs`

仿照 `check-prompts.mjs` 的设计（纯文本、秒级、独立来源对账），但它对的是**两条链之间**的一致性：

1. 读 `data.js`（沙箱求值）与 `prompts.js`（沙箱求值）
2. 逐案逐字段比对
3. 对**允许不同**的字段（如 palette 展示策略），校验「展示的是全集的子集」而不是「完全相等」
4. FAIL/WARN 分级，exit code 语义与家族一致

### WP4 · UI 诚实性（依赖 WP3 的结论）

**产出**：`prototypes/_selection/app.js` + `style.css` 小改

如果 WP1 结论是「两套语义都合理」，那么：
1. 色块区加一行说明：「主调 4 色；完整色板（N 色）见复制出的提示词」
2. 或者：色块区可展开看到全部色

**验收**：截图对比 + 首屏完整卡数不变（1440/768/390 三档）

### WP5 · 借机补齐两处已知缺口（低风险，可并行）

1. **README 加 `check-prompts.mjs`**（上一轮漏的，5 个检查器里唯一没记录的）
2. **`_specs/Sxx.md` 是唯一无守卫的生成物** → 纳入 `check-stale` 链③

### WP6 · 全量验证 + 文档（收尾）

1. 跑全部 7 个检查器
2. 三档截图对比（确认 UI 改动无回归）
3. 更新 README 的检查器清单与数字
4. 写最终报告

---

## 3. Agent 分工（5 个，两波）

### 第一波（并行，WP1 是关键路径）

| Agent | 工作包 | 写入范围 |
|---|---|---|
| **测量 Agent** | WP1 事实测绘 | `deliverables/71-plan/FACTS-*` |
| **红队 Agent** | 攻击「合并两条链」这个方案本身 | `deliverables/71-plan/REDTEAM-*` |
| **批判 Agent** | 质疑「两套语义都合理」是不是自我安慰 | `deliverables/71-plan/CRITIQUE-*` |

### 第二波（WP1 结论出来后）

| Agent | 工作包 | 写入范围 |
|---|---|---|
| **执行 Agent A** | WP2 单一来源重构 | `_build/lib/` + `collect-schemes.mjs` + `clean-dna.mjs` |
| **执行 Agent B** | WP3 闸门 + WP5 补缺口 | `check-twolines.mjs` + `check-stale.mjs` + README |

**WP4（UI）由我做**，因为它需要同时看 WP1 的语义结论和 WP3 的闸门结果。

---

## 4. 风险与既知障碍

| 风险 | 缓解 |
|---|---|
| **改 `collect-schemes.mjs` 会动 `data.js`，而 `data.js` 喂给整个选型台** | 先跑基线快照（30 案的 palette/primary/fonts 全量 JSON），改后逐字节对比 |
| **两链语义可能真的不同，强合并会丢信息** | WP1 必须先答，红队 + 批判 Agent 交叉质疑 |
| **上一轮刚开始就出现过两个 Agent 并发改同一文件** | 本计划明确划分写入范围，Agent 之间零重叠 |
| **`data.js` 是 `check-docs` 的输入** | 改完必须跑 `check-docs`，`nums/*` 断言可能红 |
| **选型台首屏指标（完整卡数）历史上多次被改坏** | WP4 强制三档截图 + 完整卡数对比 |

---

## 5. 验证命令清单

```bash
# 新增
node prototypes/_build/check-twolines.mjs
node deliverables/71-verify/twolines.mjs
node deliverables/71-verify/ab-gate.mjs

# 既有（全部必须绿）
node prototypes/_build/check-prompts.mjs
node prototypes/_build/check-docs.mjs
node prototypes/_build/check-stale.mjs
node prototypes/_build/check-anchors.mjs
node prototypes/_build/verify-prototype.mjs --all

# 生成链可复现
node deliverables/70-plan/LEAD-repro-test.mjs
```

---

## 6. 时间与阶段

| 阶段 | 内容 | 预计 |
|---|---|---|
| 阶段 1 | 三个 Agent 并行（测绘/红队/批判） | 一轮 |
| 阶段 2 | 我做裁决 + 定方案 | 一轮 |
| 阶段 3 | 两个执行 Agent 并行（重构/闸门） | 一轮 |
| 阶段 4 | 我做 UI + 全量验证 + 提交 | 一轮 |

---

## 7. 现在开始

先派第一波三个 Agent。
