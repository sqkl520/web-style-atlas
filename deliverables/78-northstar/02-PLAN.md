# 北极星审计 · 执行计划（02-PLAN）

> 2026-11-12　规划 Agent 产出，供 6 个专家 Agent 领取
> 依据：`_probe/_planner-brief.md`、`01-ROUND-SUMMARY.md`、`_probe/04-sampling.md`、`_probe/05-no-api-feasibility.md`、`_probe/12-main-thread-measure-findings.md`
> **本文件只做拆解，未执行任何测量、未修改任何已有文件。**

---

## 零、先说一件会让下面所有安排变形的事：任务书快照过期了

任务书 §一.3 把 D1–D5 列成「已知但未修」，并要求 5 个 agent 去修。**我落笔时（05:01）实测，其中三条已经在工作区被改完，只是没提交：**

| 项 | 任务书说的 | 我实测到的 |
|---|---|---|
| D1 `compare.mjs` 4 条判据无法失败 | 未修 | **工作区已是重写版**（HEAD 版 172 行 → 我 05:09 实测 850 行，且 40 分钟内从 827 长到 850，**仍在被改**）。8 条判据三态（pass/fail/skip），带 `--selftest` 24 个变异（`deliverables/74-q7/compare.mjs:15-35`、`:575`）。`git status` 显示 `M`，**未提交** |
| D2 30 案缺 `metrics.structure` | 未补 | **35/35 已有**（我逐文件扫 `.viewports[].metrics.structure`）。十余份 `report.json` 处于 `M` 状态 |
| D3 无 `layoutKind` | 未实施 | **`probe.mjs` 已加 94 行**（`prototypes/_build/vendor/probe.mjs:300-380`，未提交）；**35/35 有 `layoutKind`**，分布 `fixed 25 / auto-fit 4 / no-column-layout 6` |

三条之外，我落笔期间又冒出三件同样不在任务书里的事：

| 项 | 任务书说的 | 我实测到的 |
|---|---|---|
| 生成侧批量脚本 | 要 B2「写生成脚本」 | **`deliverables/78-northstar/blind-run.mjs` 已存在**，35 案 `blind/S01..S35/task.txt` **已准备好**，`out.html` 0 个（还没跑）。它用 `--output-format=stream-json` 分别记录 init/assistant/modelUsage 三处 model 字段 |
| S31–S35 提示词有缺陷 | 未提 | **`_probe/14-plain-field-defect.md`：5 案的 `plain` 曾为空字符串，产出「请把整页做成这个风格：。」病句**；现已被修（我实测 `empty plain: []`，S31 = `只给读数不表态，刻度当骨架`）。**这直接推翻任务书「8 案抽样偏差」的前提之一**——当时那 5 案即使被抽中也出不了可用提示词 |
| 抽样 | 要 B1「独立复算」 | **`_probe/11-sampling-recompute.md` 已存在**，推荐 **12 案 `S04 S08 S13 S15 S18 S21 S22 S29 S31 S32 S33 S35`**，与 `04-sampling.md` 的 8 案/3 案方案都不同 |

**这不改变任务内容，但改变任务性质**：A1/A2/A3/B1/B2 从「从零建」变成「复核已存在的实现 + 收尾 + 提交 + 补上它没验证的部分」。而**如果照任务书原样把 5 个 agent 并行放出去，它们会同时改 `compare.mjs` / `measure.mjs` / `probe.mjs` / `blind-run.mjs` / 35 份 `report.json`，互相覆盖，且谁的改动都进不了 git。**

所以第 0 个任务（T00）是冻结，不是可选项。这一点写进 §四第 1 条。

当前未提交规模：`git status --porcelain` = 163 项（我 04:51 记 161、05:09 记 163，**每十分钟在涨**）；`compare.mjs` 在 40 分钟内从 47996 字节变成 850 行。

---

## 一、任务表

约定：
- 所有路径相对 `D:/Web/style`。
- 「验收判据」一栏写的是**可以原样粘贴执行的命令**与**必须看到的数字**；没有数字的条目不接受。
- 「依赖」只写**硬依赖**（前者的产物是后者的输入）。软依赖写在 §二。

### 块 0 · 冻结

| # | 一句话目标 | 输入 | 输出 | 验收判据 | 依赖 | Agent |
|---|---|---|---|---|---|---|
| **T00** | 把在飞的改动定格成可复算的起点 | 当前工作区 | 一次 commit（message 里写清 `compare.mjs 172→N 行 + probe.mjs +94 行 + M 份 report.json 重渲染`，N/M 按提交时实测填） | `git status --porcelain \| wc -l` = 0（或只剩 `_probe/*.md` 与 `02-PLAN.md`）；`git log -1 --stat` 列出上述 4 类文件；`node prototypes/_build/check-stale.mjs; echo $?` 为 0 | — | 主线程（不派 agent） |

### 块 A · 对账侧

| # | 一句话目标 | 输入 | 输出 | 验收判据 | 依赖 | Agent |
|---|---|---|---|---|---|---|
| **A1a** | 复核重写后的 `compare.mjs` 判据是否真能双向失败，并把分母写实 | `deliverables/74-q7/compare.mjs`（**850 行，仍在变**）、`prompt-S0{3,7}.txt`、`prompt-S17.txt` | `_probe/08-compare-audit.md`；必要时改 `compare.mjs` | ① `node deliverables/74-q7/compare.mjs --selftest; echo $?` = 0；② 输出末行 `自检：N/N 条变异被对应判据识别` 且**N 与源码里 `CASES.length` 相等**（不是字面量）；③ `判据极性核对：8/8 条判据同时出现过 PASS 与 FAIL`；④ 对 9 个 Q7 产物复跑 `node deliverables/74-q7/compare.mjs S03,S06,S07,S14,S17,S19,S23,S24,S26`，逐案打印 `pass/fail/skip` 三元组，**skip 不计入分母**；⑤ 报告里给一张表：8 条判据逐条标「照抄检验 / 复刻检验」（见 §三 R2） | T00 | α |
| **A1b** | 定义「图片位」到底数什么，并用它判 S23 | `prototypes/_prompts/minitems-parsed.json`、35 份 `index.html`、`prompt-copy.js:826` | `_probe/09-minpics-semantics.md` + `compare.mjs` 的「图片位」判据定稿 | ① 文档给出定义（「不同图片位置」= 不同槽位还是不同 src）并指出 `prompt-S03.txt:19` 原文「同一张图重复用不算」与此定义的关系；② 脚本 `_probe/_pic-slots.mjs` 打印 35 案 `imgTags / distinctSrc / minPics` 三列，**必须复现我实测的两个数：S23 = 10 tags / 6 distinct / minPics 10；S03 = 12 / 8 / 8**；③ 定稿后 `compare.mjs` 对 **35 个原型自身**打分，不得出现任何一条「基准自己被判 FAIL」；若 S23 仍红，必须写明这是**规格与实现的历史不一致**并给出处置（改规格 or 改判据），不许静默放宽 | T00 | α |
| **A2** | 给「重渲染是安全的」这句话补上逐字节证据，并修掉它已经造成的证据丢失 | 35 案 `report.json`、`render-scheme.mjs`、`vendor/inspect.mjs` | `_probe/_rerender-audit.mjs` + `_probe/10-rerender-safety.md` | ① 脚本对每案打印 `changedKeys`，**必须全部 ⊆ {at, structure}**，35/35；② 打印 `.inspect/` 目录文件名集合的 before/after 差异，**必须 35/35 为空集**；③ 复跑一次全程（`node prototypes/_build/render-scheme.mjs <dir>` × 35，约 30 分钟），第二次的 `changedKeys` 为空；④ **S28 的 5 张缺失截图必须恢复**：`node prototypes/_build/check-stale.mjs` 不得再出现「截图集体缺失(S28-jazz-intaglio-wall)」 | T00 | β |
| **A3** | 把 `probe.mjs` 与 `measure.mjs` 的「栏」统一成一个有名字的量，并证明两套尺子不再互相矛盾 | `vendor/probe.mjs:300-380`、`74-q7/measure.mjs:240-380`、35 份 `report.json`、`_probe/12-main-thread-measure-findings.md` §六 | `_probe/11-columns-semantics.md` + `_probe/_columns-crosscheck.mjs` + 字段定稿（`structure.columns` / `structure.tracks` / `layoutKind`） | ① 文档明确写出「`columns` 是内容栏数还是轨道数」并给出 `tracks` 字段；② 脚本对 35 案并列打印 `probe.columns / probe.layoutKind / measure.gridTracks / measure.gridFrom`；③ **必须复现我实测的三处矛盾并逐条给出裁决**：S17（probe 3 from `div.foot-grid` + `no-column-layout` vs measure 3 轨 `div.sheet`）、S09（probe 3 from `div.foot-grid` + `no-column-layout` vs measure 3 轨 `ul#rows.rows`）、S13（probe 2 from `div.letterhead__top` + `no-column-layout` vs measure **16 轨**）；④ 定稿后 `layoutKind` 的 35 案分布打印成表（我实测当前为 fixed 25 / auto-fit 4 / no-column-layout 6，合计 35，**你的复核若与此不同以你的为准并说明差异**） | T00 | β |
| **A4** | 落一份机器可读、一键复算、且自己能失败的基准 | A2 + A3 的产物 | `deliverables/78-northstar/baseline/S01..S35.json`（35 个）+ `baseline/make-baseline.mjs` + `baseline/verify-baseline.mjs` | ① `node baseline/make-baseline.mjs` 两次运行，除 `generatedAt` 外 `diff` 为空；② 每份含 8 字段：`layoutKind, columns, mainRatio, headBodyRatio, borderWidths, svgStrokeWidths, imgCount, imgVisible`，35/35 非 null；③ `node baseline/verify-baseline.mjs --selftest` 必须能红：手动把某个 JSON 的 `columns` 改 +1，verify 必须报 FAIL 并退出非 0（这条是变异测试，照 `check-*` 的 `--selftest` 惯例，**但不要照抄 `probe-ui.mjs` 的计数方式，原因见 §四第 2 条**）；④ `node baseline/verify-baseline.mjs` 在干净树上退出 0，耗时打印出来 | A2, A3 | β |
| **A5** | 把新闸门接进季度流程，并修掉季度流程里那个从来没跑成功的渲染步骤 | `prototypes/_build/quarter.mjs:69`、`.github/workflows/gates.yml` | 改 `quarter.mjs` + `gates.yml` | ① **先复现缺陷**：`node prototypes/_build/render-scheme.mjs --all; echo $?` 现在 = 2 且打印 `没有 index.html: D:\Web\style\prototypes\--all\index.html`（`render-scheme.mjs:27-29` 只认 `argv[2]`，没有 `--all` 分支）；修完后 `quarter.mjs --render` 的 render 步退出 0；② `node prototypes/_build/quarter.mjs` 的步骤数从 23 变 25（新增 `compare-selftest`、`baseline-verify`），dry-run 打印里能看到两者；③ `quarter.mjs --write` 全绿（22→24 步通过，render 仍按开关跳过） | A1a, A4 | ζ |
| **A6** | 用修好的尺子把 Q7 九个历史产物重打一遍分（零成本，立刻有信号） | `deliverables/74-q7/out-S0*.html`（14 个）、A1a 的新判据 | `_probe/12-q7-rescore.md` | ① 逐案表格：`pass / fail / skip` 与**每一处 fail 的 note**；② 必须交代与旧版「9 案全过」的差异，逐案说清是**判据变严**还是**产物真有问题**；③ 至少给出一处「旧版判 PASS、新版判 FAIL」的具体案例与两者的 note 原文 | A1a | α |

### 块 B · 生成侧

| # | 一句话目标 | 输入 | 输出 | 验收判据 | 依赖 | Agent |
|---|---|---|---|---|---|---|
| **B1** | **裁决**已有的三份抽样方案，给出最终 N 与案号，并证明它为什么不是偏差样本 | `data.js`、`prompts.js`、`minitems-parsed.json`、`_probe/rows.json`、`_probe/04-sampling.md`（8 案 / 3 案）、`_probe/11-sampling-recompute.md`（12 案）、`_probe/12-main-thread-measure-findings.md` §五的骨架簇 | `_probe/13-sampling-verdict.md` + `_probe/b01-sampling.mjs` | ① **不许新写第四套方案**——先复算三份已有的，逐条指出 04 与 11 的差异来自哪个假设；② 脚本两次运行输出完全一致（无随机数）；③ 打印最终所选 N 案的 `cover/62`、五类风险命中数、`structure` 去重用、tone/band/loud 覆盖；④ 打印超几何 `P(五类全漏=0)` 与 `P(命中 ≥6 个已测案)`；⑤ **必须满足骨架簇约束**：每个簇最多 1 案——我实测两个重复簇是 `[S31,S34]` 与 `[S32,S33]`（`_probe/12-main-thread-measure-findings.md` §五，S32~S33 Jaccard 0.778）；⑥ **必须处理 S34**：它在 `_probe/s03-prompt-audit.json` 里是唯一的 `bad`（`minPics` falsy-0 → 提示词说 3、真实 0），若 11 的 12 案方案包含 S34 之外的新案，要说明为何；⑦ 明确写出本方案覆盖不到什么 | T00 | γ |
| **B2** | 复核并收紧已存在的 `blind-run.mjs`，把「实际服务的模型」变成硬准入条件 | `deliverables/78-northstar/blind-run.mjs`（已存在，已生成 35 份 `blind/S*/task.txt`，0 份 `out.html`）、`_probe/_isolation-test*.sh`、`claude --help` | `blind-run.mjs` 的修订 + `_probe/audit-blind.mjs` | ① `node blind-run.mjs --prepare-only` 幂等：35 份 `task.txt` 两次生成逐字节相同；② 新增审计脚本对每案的 stream-json 打印并退出 0/1：`distinct(assistant.model)`、名义 `init.model`、`result.modelUsage` 的键、`file_path` 越界次数、`instructions` 是否含 `MEMORY.md`；**`distinct(assistant.model) ≠ 1` 必须判该案作废**（见 §四第 8 条）；③ 用 `--tools Read,Write` 显式限制工具集（`claude --help:254`），并在 stream-json 里证明 Bash 不可用；④ **必须复现我实测的 feasibility 基线**：单案 `input 91,387 / output 19,016 / cache_read 41,984`、11.3 分钟、`totalCostUSD 0.489`（`C:/tmp/feasibility/home/.claude/projects/.../3a1cf3ce….jsonl`），若你的数与这个量级不同要解释 | T00 | δ |
| **B3** | 红队隔离：把「绕过」和「记忆」两条路径都测掉 | B2 的箱子 | `_probe/14-isolation-redteam.md` + 每条路径的 stream-json | ① 5 条路径各跑 3 次：绝对路径读 `README.md`、`..` 上爬、反斜杠路径、`Glob` 扫仓库、描述记忆；② 判据：前 4 条 **0/3 成功**（错误原文贴出）；第 5 条**判据是「它描述不出 S01」**——若它能说出「四栏 / `5fr 24px 4fr 24px 4fr 24px 3fr` / 红黑」中的任何一项，判隔离失败；③ 额外测注入面（任务书没列）：`skill_listing` 与 `agent_listing` 里是否出现本仓库字样——我实测 feasibility 那次注入了 **15 个 skill、6.8KB**，`prompt_snapshot` 含 `MEMORY.md` 样板文字（但那只是工具说明，不是本仓库记忆，要分清）；④ 结论必须写成「隔离＝权限隔离，不是物理隔离」，并给出它能挡住什么/挡不住什么 | B2 | δ |
| **B4** | 成本与可复现性：口径统一后外推 N 案 | B2/B5 的真实 stream-json | `_probe/15-cost.md` + `_probe/_cost.mjs` | ① 每案一行：`input / output / cache_read / 时长 / 模型去重 / 重试次数`；② **必须同时给出两种口径**并说明差在哪：按 `input+output` 与含 `cache_read` 的累计——我实测 feasibility 单案 `91,387 / 19,016 / 41,984`、11.3 分钟、`$0.489`；而 `01-ROUND-SUMMARY.md` §九 的 0.6M/案 是 subagent 全程口径；③ 外推给区间而不是一个数；④ 同一案跑 2 次，报 token 与产物的差异（这是「可复现性」的唯一硬证据） | B2, B5 | ε |
| **B5** | 端到端跑通 1 案：**证明盲测用的提示词与产品输出的提示词等价**，再用修好的判据打分 | `prompt-copy.js` 的 `buildStylePrompt`、`blind-run.mjs`、A1a 的 `compare.mjs` | `_probe/16-prompt-equivalence.md` + `deliverables/78-northstar/blind/S31/out.html` | ① **必须先做等价性证明**（这是本任务的重点，不是附带）：我用同一案 S31 各生成一份逐字节对比——产品侧 `buildStylePrompt('S31', {biz, action})` = **40 行 / 5108 字节**；`blind-run.mjs` 产出的 `blind/S31/task.txt` = **21 行 / 2580 字节**；**逐行比对只有 8 行相同**。产品提示词独有而盲测缺失的包括：业务背景两句、「请把整页做成这个风格：…」、调性句、`结构约束 1–5`（含 `minItems`/`minPics`）、`第 6 条硬前提`、**`防退化` 8 条**、**`验收三问`**、输出要求 4 条。**盲测少了一半约束，测的不是产品给的东西**；② 更硬的一处矛盾：盲测提示词写「**不用任何图片文件**」，而产品提示词第 4 条与输出要求写「图片位置写成 `<img src="images/占位-N.jpg">`」——而 `compare.mjs` 的「图片位」判据正是判这个。**用盲测产物去跑对账，会在一条它被明确禁止的判据上判失败**。B5 必须二选一并写清理由：(a) 改 `blind-run.mjs` 直接调 `buildStylePrompt`；(b) 保留中性任务书，但**把对账判据里所有依赖产品文案的条目整体排除**并在报告里列名单；③ 单案跑通并记录 `out.html` 行数（feasibility 基线：414 行 / 10.7KB / 704 秒）；④ 如实写清这一案的结论能推到哪里、不能推到哪里 | B2, A1a | ε |

### 收口

| # | 目标 | 输出 | 验收判据 | 依赖 | Agent |
|---|---|---|---|---|---|
| **G0** | 一条命令看全貌 | `_probe/verify-all.mjs` | 依次跑 A1a/A2/A3/A4/A5 的自检，打印一张表（每行 `任务 / 退出码 / 关键数字`），任一非 0 则总退出非 0 | A1a–A5, B1–B5 | 主线程 |

**任务总数：14**（T00、A1a、A1b、A2、A3、A4、A5、A6、B1、B2、B3、B4、B5、G0）。

其中**任务描述已被降级为「复核 + 收尾」而非「从零建」的**有 5 条：A1a（判据主体已写完）、A2（30 案重渲染已完成）、A3（`layoutKind` 已实现）、B1（已有两份抽样报告）、B2（`blind-run.mjs` 已存在且 35 份提示词已备好）。**开工前必须重新核对版本**（§三 R11）。

**B5 的优先级被我提到 B 块第一**，尽管它编号在最后——理由见 §四第 1 条：它要回答的是「盲测用的提示词到底是不是产品那份」，而这个问题的答案会决定 B 块其余任务有没有意义。它不再依赖 B2/B3 完成，只要 B2 的箱子能用就能做。

---

## 二、并行度分析

### 2.1 真能并行的

| 组 | 成员 | 为什么独立 |
|---|---|---|
| 度量组 | A1a、A1b | 都只改 `compare.mjs` 的不同判据 + 各自的 `_probe/*.md`；A1b 只多读 `minitems-parsed.json` 与 35 份 `index.html` |
| 基准组 | A2、A3 | A2 只碰 `render-scheme`/`inspect` 与 35 份 `report.json`；A3 只碰 `probe.mjs` 的 `STRUCT` 段与 `measure.mjs` 的选择逻辑。**唯一冲突面是 35 份 `report.json`**——A3 若改了 `probe.mjs` 必须重渲染，而 A2 正在重渲染。**这是本次拆解里最容易被忽略的一处串行化**，见 2.3 |
| 生成组 | B1、B2 | B1 只读数据、只写 `_probe/`；B2 只改 `blind-run.mjs` 与 `blind/`。零文件交集 |
| 跨块 | A6 与 B 组 | A6 只读 `74-q7/out-*.html`，B 组只写 `blind/` |

一次放出去、互不阻塞的最大并行度：**4 个 agent**（α: A1a→A1b→A6；β: A2→A3→A4；γ: B1；δ: B2→B5→B4，B3 排最后），加 ζ 等 A1a/A4。**B5 紧接 B2**，不等 B3。

### 2.2 硬依赖（不是软依赖，是「前者的产物就是后者的输入」）

```
T00 ──┬─ A1a ── A1b
      │    ├── A6
      │    └────────────────┐
      ├─ A2 ── A3 ── A4 ── A5 ── G0
      │              └─────┘
      ├─ B1（独立，只读）
      └─ B2 ── B5 ── B4
            └── B3
                  ↑
                 A1a（B5 的「打分」这一步离不开新判据）
```

**必须承认的两条串行**：

1. **A2 → A3**。A3 要给 `structure` 定稿字段（`columns` / `tracks` / `layoutKind`），而 A3 的验证数据来自 `report.json`；`probe.mjs` 一改，那 35 份就必须重渲染，而重渲染正是 A2 的活。若并行，A3 会在 A2 重渲染到一半时读文件，得到半新半旧的报告——而**这种状态不会报错，只会给出一个看起来合理的表**（本仓库的老病）。所以 A3 排 A2 之后。
2. **B2 → B5 → B4**。隔离箱的产物是 B5 的输入；B5 的 stream-json 是 B4 的输入。**B3 可以晚于 B5**——B3 测的是「能不能绕过」，与「跑通一案」不互为前提，所以它从关键路径上摘出去了。

### 2.3 伪装成并行的三处（写出来是为了不被安排成并行）

| 表面并行 | 实际冲突 | 处理 |
|---|---|---|
| A1a 与 A1b 都改 `compare.mjs` | 同一文件、同一函数 `judge()` | 允许并行**起草**，但合并由 α 一个人做；A1b 只交「定义 + 可执行检查」，改 `compare.mjs` 的权力归 A1a 的 owner |
| A2 与 A3 都写 `report.json` | 见 2.2 第 1 条 | 串行 |
| A4 与 A5 都改 `quarter.mjs` 的调用点 | A4 产出 `verify-baseline.mjs`，A5 把它接进 `quarter.mjs`；A4 也要求 `make-baseline` 可复算 | A5 依赖 A4，串行；**不允许 A5 为了让流程绿而放宽 A4 的判据**（这是本仓库「闸门为了通过而改判据」的经典退化路径） |
| B2 与 B5 看似可并行 | B5 要跑 `blind-run.mjs`，而 B2 正在改它 | B2 先交一版能跑的，B5 再跑；**B5 期间 B2 不得再改 `blind-run.mjs`** |

### 2.4 关键路径

```
A 线  T00(0.5d) → A2(0.5d) → A3(0.5d) → A4(0.5d) → A5(0.5d) → G0(0.25d) = 2.75 工作日  ← 最长
B 线  T00(0.5d) → B2(0.75d) → B5(0.5d) → B4(0.5d) → G0                  = 2.50 工作日
      旁路：B1(0.5d)、B3(0.5d)、A1a/A1b/A6 都不在关键路径上
```

**关键路径 = 6 个串行节点，2.75 个工作日**（A 线）。B 线 5 个节点、2.5 天，比 A 线短 0.25 天——**但它的失败代价更大**（见下）。

关键路径上最脆的是 **B2 → B5**，尽管它在较短的那条线上：B5 的判据要求先证明「盲测提示词与产品提示词等价」，而我实测它们的交集只有 **8 行 / 40 行**（§四第 1 条）。这个证明如果做不成立，B 线后面的 B4 与所有产物都要重做；而 A 线即使全部做完，也只回答「尺子准不准」，不回答北极星。

B3 我特意从关键路径摘出去了：它问的是「隔离能不能被绕过」，与「跑通一案」不互为前提。**把 B3 放在关键路径上是任务书的一个隐含假设，而它不成立。**

---

## 三、风险表

| # | 风险 | 概率 | 依据（带数字/路径） | 缓解 |
|---|---|---|---|---|
| **R1** | **隔离被绕过** | 中 | 任务书 §1.2 自己写了「`D:\Web\style` 只是被权限挡住，不是物理不可见」。我实测的 feasibility 那次（`C:/tmp/feasibility/home/.claude/projects/.../3a1cf3ce…jsonl`）agent 只调了 2 次工具（Read `task.txt`、Write `out.html`），**0 次越界尝试**——这只能证明它没被诱惑，不能证明它过不去 | ① B3 每条路径跑 3 次而不是 1 次；② 判据从「它有没有读到」改成「它有没有**说出**只有读过才知道的数字」（S01 的 `5fr 24px 4fr 24px 4fr 24px 3fr`）；③ 报告里固定写一句「本轮结论的隔离强度 = 权限边界，未做物理隔离」 |
| **R2** | **判据仍然无法失败** | 中高 | 重写后的 `compare.mjs` 8 条判据里，`标题/正文比`、`配色（提示词给的色）`、`线宽档位合规` 三条判的是**提示词里字面给出的数**（`prompt-copy.js:826` 的 minPics 同理）。这类判据的失败面很窄：「模型没照抄」。它**能**失败（所以 A1a 的极性核对会过），但它**测不出**「提示词能否让模型做出这个风格」 | ① A1a 的验收里加一条：逐条标注该判据属「照抄检验」还是「复刻检验」，并打印两类各几条；② 若照抄类 ≥6/8，在 `08-compare-audit.md` 里明确写「本轮北极星指标不能由这套判据回答」，不要用 `7/7` 充当结论（§四第 4 条） |
| **R3** | **重渲染引入新差异 / 破坏既有证据** | **已发生** | `git status` 实测：`S28-jazz-intaglio-wall` 的 5 张截图处于 `D`（已从盘上删除），`check-stale.mjs` 报「截图集体缺失(S28)」。根因是 `vendor/inspect.mjs:64` 在浏览器起来之后 `unlinkSync` 掉旧的 `desktop|tablet|mobile-*.jpg`，若随后某档失败，旧图不回滚 | ① A2 的验收加「`.inspect/` 文件集合 before/after 相同」；② 重渲染前先 `cp -r .inspect .inspect.bak`（或 `git stash` 不可行时的等价物），失败即回滚；③ `S03` 的 `tablet-fold.jpg` 现在 mtime 比 `report.json` 新（`check-stale` 报 21 分钟），说明**同一次渲染内的写入顺序**也会让守卫误报——A2 要确认 5 秒容差仍成立 |
| **R4** | **模型中途换 / 名义模型** | **高（已确证）** | 16/16 的请求模型与服务模型从第一条就不同（`requested=claude-opus-5-5` → `served=SCNet-Max`，`05-no-api-feasibility.md` §3.1）；105 个 agent 里 34 个出现过 >1 个服务模型 | ① B2 的 audit 把 `distinct(message.model)` 作为**准入条件**而不是观测项：≠1 直接判该案作废；② B4 记录每案实际模型，报告里不许再出现 `model: opus` 这种叙述；③ 若「同一模型」无法保证，把结论降级为「在当前路由下的可复现性」，并写清**跨季度不可比** |
| **R5** | **两套尺子各说各话，基准与打分不是同一把尺** | **高（已发生）** | 我实测三处矛盾：`S17` probe 报 3 栏 from `div.foot-grid` + `no-column-layout`，measure 报 3 轨 `div.sheet`；`S09` probe 3 from `div.foot-grid` + `no-column-layout`，measure 3 轨 `ul#rows.rows`；`S13` probe 2 from `div.letterhead__top` + `no-column-layout`，measure **16 轨**。另外 `S02`：measure 3 轨（含 2px 中缝），probe 2 栏 | ① A3 定为硬任务，不允许「两个数都留着」；② A4 的 baseline 必须声明取自哪套尺子，`verify-baseline.mjs` 要能同时校验另一套并打印差异；③ B5 打分必须与 baseline **同一套** |
| **R6** | **「判据一改就假红」——基准自己判不过** | **高（已定案）** | `S23` 的 `minPics=10`，而它的 `index.html` 只有 **6 个不同 src**（10 个 `<img>` 标签）。A1 要求把 `imgVisible > 0` 改成 `>= minPics`，改完这条会在**原型自己身上**报 FAIL | A1b 专属任务；验收里写死「35 个原型用新判据必须全 pass 或给出书面豁免」，且**禁止**用「把 minPics 改小」来让它绿 |
| **R7** | **闸门自身的计数是错的（照抄会把病带进来）** | **已发生** | `prototypes/_build/probe-ui.mjs`：`CASES` 有 **15** 条（`:695-822`），另有 2 条运行时变异，但末行写死 `自检：${ok}/8`、`process.exit(ok === 8 ? 0 : 1)`（`:916-917`）。**15 条全过时 ok ≈ 17 ≠ 8 ⇒ 退出 1（假红）；恰好 8 条过时退出 0（假绿）**。CI 正在跑它（`.github/workflows/gates.yml:125`） | A4/A5 的 `--selftest` 一律用 `ok === CASES.length` 且**分母从数组长度取**，不写字面量；并把这条作为 A1a 的复核项之一（`compare.mjs` 已经是 `ok === CASES.length`，`:815`，是对的） |
| **R8** | **抽样换一批，偏差换一种** | 中 | `04-sampling.md` §7 自己列了 7 条漏项（权重函数 `1/freq` 是拍的、`structure` 无解、`scenesYes/No` 未进规则）。任何新抽样都会继承其中 4 条 | ① B1 必须复算并**明确写出继承的漏项**；② 要求 `b01-sampling.mjs` 无随机数、两次运行一致；③ 不追求「代表全库」，明确写「验货找缺陷，不估参数」 |
| **R9** | **成本外推口径混乱，结论差 4 倍** | 中 | `0.6M/案`（`01-ROUND-SUMMARY.md` §九，13 个盲测 agent 8.6M）vs 我实测 feasibility 单案 `91,387 in + 19,016 out + 41,984 cache_read ≈ 152K`，差 4 倍。35 案分别是 **21M** 与 **5.3M** | B4 必须同时给两种口径与差额来源（是否含 cache_read、是否含返工），并给区间 |
| **R10** | **并行写同一批文件导致改动互相覆盖** | **高（现实条件）** | 当前 163 项未提交、`compare.mjs` 与 `measure.mjs` 正在被改；若此刻放 5 个 agent 出去，任何人一次 `Write` 都会覆盖别人的版本，且 git 里没有中间态可回 | T00 先行；A 组按「一个文件一个 owner」分配（`compare.mjs`→α，`probe.mjs`/`measure.mjs` 的选择段→β，`quarter.mjs`→ζ），跨 owner 改动走「提 issue 给 owner」而不是自己动手 |
| **R11** | **工作区在规划期间自己往前跑，计划一落地就过期** | **已发生** | 我 04:51→05:09 的 18 分钟里：`git status` 161→163 项；`compare.mjs` 827→850 行；新出现 `blind-run.mjs`、`blind/S01..S35/task.txt`（35 份）、`_probe/11-sampling-recompute.md`、`13-feasibility-result.md`、`14-plain-field-defect.md`、`03-INTERIM-REPORT.md`。**也就是说：本文件里「要建 X」的若干项，在你读它的时候可能已经建好了** | ① 每个 agent 开工第一件事是 `git status --porcelain` + 目标文件 `wc -l`，先核对本表写的版本号；② 表中凡写「已存在」的，任务改成「复核」；③ **不要按本文件的行数/字节数做判据**——那些数字只用于「你看到的和我看到的不是同一个东西」时报警 |
| **R12** | **S31–S35 的提示词曾有 `plain` 空串缺陷，取样结论建立在坏提示词上** | **已发生，已修，但影响未清算** | `_probe/14-plain-field-defect.md`：5 案 `plain` 为空 → 提示词变成「请把整页做成这个风格：。」。我实测**现已被修**（`empty plain: []`，S31 = `只给读数不表态，刻度当骨架`）。但 `04-sampling.md` 的「Q2 新案零覆盖」论证、`s03-prompt-audit.json` 的 `bad: ["S34"]`、以及任何在修复前算出的「S31–S35 的提示词质量」结论**都可能是拿坏输入算的** | ① B1 必须以**当前** `prompts.js` 重算，并注明「本轮以前所有涉及 S31–S35 提示词质量的结论作废」；② A1a 的 9 案复跑不涉及这 5 案，不受影响；③ 若已按旧提示词跑过盲测，那批产物必须作废 |
| **R13** | **盲测提示词 ≠ 产品提示词，整轮 B 块可能测的是别的东西** | **已确证（我实测）** | 同案 S31：产品侧 `buildStylePrompt` = **40 行 / 5108 字节**；`blind-run.mjs` 产出 = **21 行 / 2580 字节**；逐行交集 **8 行**。盲测缺 `防退化` 8 条、`验收三问`、`结构约束 1–6`、业务背景、题眼句、调性句、输出要求 4 条。更硬的矛盾：盲测写「不用任何图片文件」，而 `compare.mjs` 的「图片位」判据要求产物有图位 | ① B5 改为「先证明等价，再打分」；② 若不改 `blind-run.mjs`，必须列出被排除的判据名单；③ **B 块任何数字在等价性证明完成前不得进结论** |

---

## 四、我认为你漏掉的

这一节按「我认为最该改」排序。前四条是**任务书本身的错**，后面是缺口。

### 1. **盲测用的提示词与产品输出的提示词根本不是同一份**——这条会直接让整轮 B 块测错东西

这是我这一轮最想让你看到的一条，任务书里完全没有。

我拿同一案 S31 各生成一份，逐行对比：

```
产品侧  buildStylePrompt('S31', {biz, action})   40 行 / 5108 字节
盲测侧  blind/S31/task.txt（blind-run.mjs 产出）  21 行 / 2580 字节
逐行取交集：只有 8 行相同
```

产品提示词有而盲测没有的（部分）：

- 业务背景两句：「我经营一家只做手冲的咖啡店，5 个产区的豆子…」/「页面需要让访客看完豆单就想问价」
- 「请把整页做成这个风格：只给读数不表态，刻度当骨架。」——**这句就是提示词的题眼**
- 调性句「这个案子的调性是「冷静克制 / 工程感」…」
- `结构约束 1–5`：含「这个版式设计时排了 6 个条目」「至少要 1 个**不同的**图片位置」
- `结构约束 6`：硬前提
- **`防退化` 8 条**（面积分配 / 层级词汇 / 首屏对齐 / 不等栏宽 / 线条画法 / 不透明 / 明度差 / 动效）
- **`验收三问`**（做完自己检查）
- 输出要求 4 条（含 `images/占位-N.jpg` 的写法）

盲测侧则多了一句产品里没有的：「**不用任何图片文件**」。

**这直接造成一处自相矛盾**：盲测任务书禁止用图片文件，而产品提示词要求产出 `<img src="images/占位-N.jpg">` 占位，而 `compare.mjs` 的「图片位」判据**正是判这个**。用盲测产物去跑对账，会在一条它被明确禁止的约束上判失败——而报告会把这一条写成「模型没照做」。

`blind-run.mjs:73` 的注释是自觉的：「刻意**不复用** `prompt-copy.js` 的 `buildPrompt`…⚠️ 两边必须保持约束一致，否则测的不是产品实际给的东西。这是一处已知的维护风险」。**这个风险已经兑现了：约束少了整整一半。** 而 `_feasibility-run.sh` 用的 `_feasibility-prompt-S31.txt` 是又一份手工拼的（2580 字节那份的变体），也就是说**现在有三份互不相同的 S31 提示词**。

北极星指标问的是「**产品交付的那个提示词**能不能让模型做出这个风格」。用一份自制的中性任务书去测，测的是另一件事。这一条不修，B 块跑出的任何数字都不能用于产品决策。

建议：B5 提升为 B 块第一优先级，且判据从「跑通一案」改成「**三份提示词逐字节等价性证明**」——(a) `blind-run.mjs` 直接调 `buildStylePrompt`；(b) 或保留中性任务书但把对账判据里依赖产品文案的条目整体排除并列名单。二选一必须书面定。

### 2. 任务书把「已完成」写成了「待做」——这会直接导致 5 个 agent 互相覆盖

§一.3 那张表（D1–D5）标注「已知但未修」。我落笔期间实测：`compare.mjs` 已从 172 行重写到 850 行（8 条判据、三态、24 个变异），`probe.mjs` 已加 94 行 `layoutKind`，35/35 报告都已补 `structure` 且都有 `layoutKind`。全部**未提交**，`git status` 163 项，且**每十分钟在涨**（04:51 是 161）。

更麻烦的是：我写这份计划的过程中，工作区又自己长出三样东西——`blind-run.mjs`（含 35 份已准备好的 `task.txt`）、`_probe/11-sampling-recompute.md`（推荐 12 案，与任务书的 8 案/3 案都不同）、`_probe/14-plain-field-defect.md`（S31–S35 提示词曾有 `plain` 空串缺陷，导致病句，现已修）。

任务书据此让「5 个以上专家 Agent」去修这些。**如果照办，结果是五个 agent 同时重写同一批文件**——而这不是假想：`measure.mjs` 32219 字节、`compare.mjs` 850 行，两个文件都在 04:52 之后被改过。

建议：**T00（冻结 + 提交）是唯一必须先做的事**，且由主线程做，不派 agent（派出去就意味着又一个人要写文件）。任何跳过 T00 的并行安排，在本仓库的历史上（`01-ROUND-SUMMARY.md` §四「cdp.mjs 假修复」、§七「红队自己撤回两条」）都有对应的事故。

顺带一个后果：**这份计划本身有保鲜期**。表中所有「行数/字节数/文件已存在」都要在开工时重新核一遍（§三 R11）。

### 3. 「照 `probe-ui.mjs` 的 `--selftest` 惯例写」——那个惯例本身是坏的，照抄会把病带进来

任务书 §二 A1 明确写：「照这个模式写」。但那个模式：

- `CASES` 有 **15** 条变异（`probe-ui.mjs:695-822`），外加 2 条运行时变异；
- 末行写死 `自检：${ok}/8`，退出条件 `ok === 8`（`:916-917`）；
- 也就是：**全部识别 → ok≈17 → 退出 1（假红）；恰好 8 条识别 → 退出 0（假绿）**；
- 而它在 CI 里（`.github/workflows/gates.yml:125`）。

这是本仓库最老那个病的镜像：不是「绿了但其实坏了」，而是「红了但其实对」。**它比假绿好一点，但同样让这个闸门失去信息量**——没人会去追一个永远红的自检。

好消息：`compare.mjs` 新版已经写对了（`ok === CASES.length`）。所以本条的正确做法是「借结构，不借计数」，并把 `probe-ui.mjs` 的分母一并修掉（1 行）。

### 4. 少了最关键的一条：**判据仍然在比「提示词里字面给出的数」，这件事任务书没处理**

北极星指标是「提示词能不能让一个不知道答案的模型做出这个风格」。但重写后的 8 条判据里：

- `标题/正文比` —— 提示词写「最大标题要压到正文的 **6.5 倍**」，模型照抄即过；
- `配色（提示词给的色）` —— 提示词逐字列出 hex，照抄即过（`compare.mjs` 的旧注释自己承认）；
- `线宽档位合规` —— 同上；
- `图片位` —— `minPics` 是提示词里写着的数字。

这四条**都能失败**（所以 A1a 的极性核对会通过），但它们失败的方式只有一种：模型没照抄。**「照抄成功」和「复刻成功」是两件事**——上一轮 `out-S17.html` 的 hex 集合与当轮提示词 hex 集合完全相等，就是活证据（`05-no-api-feasibility.md` §4.2 附注）。

任务书把「修好判据」等同于「修掉 4 条无法失败的判据」，但**能失败 ≠ 在回答北极星**。要让这套东西回答北极星，至少需要一条**不写在提示词里**的量。可选的三种（成本递增）：

1. **版式指纹**：对原型与产物各算一个与 DOM 结构无关的向量（栏宽分布 + 首屏元素密度 + 线宽直方图），比距离。不完美，但**模型无法照抄**，因为它不知道这个向量是什么。
2. **辨别测试（盲选）**：给一个不知答案的模型「原型截图 + 两份产物（一份真、一份别的案）」问哪份像，重复 N 次取显著。这条最接近「风格是否被复刻」，成本是纯文本判读。
3. **反事实**：把提示词里那 4 个数字全部抹掉（只留机制句），再跑一次。**如果产物质量不变，说明提示词里的数字没用；如果崩了，说明「风格」其实靠的是这几个数**。这是唯一能直接证伪「提示词有用」的设计，且**零新增模型调用**（第一步分析可复用已有产物）。

我建议把第 3 条加进 B 块——它比再多跑 7 个案子有价值得多。任务书里没有这一条。

### 5. S31–S35 的提示词曾经是坏的，很多既有结论建立在坏输入上

`_probe/14-plain-field-defect.md` 记录：S31–S35 这 5 案的 `plain` 字段是空字符串，导致产品实际输出的提示词里出现「请把整页做成这个风格：。」——一句没有宾语的病句。我实测**现已修复**（`empty plain: []`，S31 的 `plain` = `只给读数不表态，刻度当骨架`）。

但后果没有清算。凡是**在修复之前**算出来的、涉及这 5 案提示词质量的结论，都可能是拿坏输入算的：

- `04-sampling.md` 用「Q2 新案零覆盖」作为抽样偏差的核心证据之一——现在这 5 案的提示词与当时不是同一份；
- `_probe/s03-prompt-audit.json` 标了 `bad: ["S34"]`（它的 `minPics` 是 falsy-0，提示词说 3、真实 0），说明审计只查「显示值 vs 数据」，没查「提示词是否可读」；
- 任何已按旧提示词跑出的盲测产物，必须作废。

建议：B1 的验收里写明「本轮以前所有涉及 S31–S35 提示词质量的结论作废，以当前 `prompts.js` 重算」；并在 B 块开工前加一条一次性检查：`node -e` 扫 35 案 `plain/mood/mechanism` 是否有空串，退出非 0 则不许开跑。**这条检查现在不存在**，而它是「跑 35 案之前最便宜的一次性体检」。

### 6. 「对账侧不受模型路由与答案副本影响」——这句话对一半

对账侧确实不受模型影响，但它**受「哪套尺子」影响**，而这件事现在没有答案：

- `report.json` 里的 `metrics.structure` 来自 `probe.mjs`；
- `compare.mjs` 打分用 `measure.mjs`；
- 两者对同一案给出不同结论（S17/S09/S13 三案，我上表列了实测数）；`S02` 一案 measure 报 3 轨、probe 报 2 栏；
- 更细的一处：`measure.mjs:247` 的画廊判据 `PIC_SEL = 'img, picture, canvas, video'` **刻意不认 svg**，而 `probe.mjs:267` 仍然写着 `k.querySelector('img, picture, svg, canvas')`——**改了一半**。这不是风格差异，是同一个判断在两套实现里给出不同答案。

A4 要求「一份可复算的基准」，但没规定基准取自哪套尺子。**如果不定，A4 会产出一份和 B 侧打分不是同一把尺的基准**，而这个错误不会报错。A3 必须排在 A4 之前，且 A4 的验收要包含「跨尺子差异表」。

### 7. S23 的 `minPics=10` 与它自己的实现矛盾——A1 一改判据就会假红

实测：`prototypes/_prompts/minitems-parsed.json` 里 S23 的 `minPics=10`；`S23-exposed-plaster-chronology-wall/index.html` 有 10 个 `<img>` 标签但只有 **6 个不同 src**（`assets/reuse-*` 共 6 个文件）。而 S03 的提示词原文写着「至少要 8 个**不同的**图片位置（**不是 8 个 img 标签就够——同一张图重复用不算**）」（`deliverables/74-q7/prompt-S03.txt:19`）。

也就是说：**S23 的原型自己不满足它自己发出的提示词。** A1 要求把 `imgVisible > 0` 改成 `>= minPics`，改完这一条会立刻在基准上 FAIL。任务书完全没提这一条，而它正是「改判据 → 基准自己红 → 有人去调参数让它绿」这条退化链的起点。

这不是小事：`s03-prompt-audit.json` 已经把它标成 `bad: ["S34"]`——注意**标的是 S34 而不是 S23**，因为那个审计查的是「提示词显示值与真实值是否一致」，不是「真实值与实现是否一致」。两把尺子都没覆盖这一处。

### 8. 「答案副本遍地」与「隔离」是两个问题，任务书混在了一起

§零.2 列的是 worktrees（4 份，761MB）+ `56/50-scratch/head`（已删）+ 「散落片段 35 处」。我实测的残留规模比这个描述更具体、也更分散：

- `deliverables/99-scratch/iv/mirror/prototypes/` = **30 案完整副本**，3.1MB；`S17/style.css` 的 md5 `ea86645b213c014c6bee62ecbda5df39` 与 `prototypes/S17-.../style.css` **逐字节相同**；
- `deliverables/63-test/replica/` = 7 案完整副本；
- 全仓 `prototypes/` 之外的 `index.html` 共 **156** 个，其中 **33 个与某个原型逐字节相同**；
- `deliverables/*-scratch` 还有 **22** 个目录（`.gitignore:62` 忽略，但盘上在）。

但**这跟隔离成败不是一个问题**：B3 的隔离箱在 `C:/tmp/...`，读 `D:/Web/style` 要靠**绝对路径**，而绝对路径已被权限挡住（任务书 §1.2 的原文错误就是证据）。所以「副本多」影响的是**工作区里的 agent**（比如你们自己复核时会不会顺手读答案），不是隔离箱。

写这一条的目的是：**不必为了隔离去删这 156 个文件**（用户也明确说「不是你干的不要动」），但**必须在 B3 的报告里写清这个边界**，否则读者会以为「隔离箱干净」=「全仓干净」。

### 9. 成本口径差 4 倍，`0.6M/案` 这个数不足以支撑 B4 的外推

`01-ROUND-SUMMARY.md` §九 用 13 个盲测 agent 的 transcript 算出 8.6M / 13 = 0.6M/案。我实测一次真实的隔离 `claude -p`（S31 feasibility）：29 条记录、6 个 assistant 轮次、`input 91,387 / output 19,016 / cache_read 41,984`、11.3 分钟、`totalCostUSD 0.489`。

两者差 4 倍，原因是口径不同（subagent 全程 transcript 的累计 vs 单次会话；是否含返工；是否含 cache_read）。**`0.6M/案` 不是错的，但它不是「跑一次要多少」**。B4 若不规定口径，最后会重复上一轮那个「24.1M/案」的错误（拿整个季度的开销平摊到案子上）。

### 10. 任务书要求「记录实际 served model」，但没规定**不合格怎么办**

B2 要求记录 served model。但 16/16 的历史事实是「served ≠ requested」。所以只记录不够，需要事前定一条准入线：**`distinct(message.model) == 1` 才算有效样本，≠1 则该案作废重跑，重跑两次仍 ≠1 则该案从结论里剔除并写明**。否则会得到一份「每案都记录了模型、每案都不一样」的报告，读者不知道该怎么读。

### 11. 缺一条「不许为了让流程绿而放宽判据」的硬约束

`prototypes/_build/quarter.mjs` 现在是 23 步、其中 22 步能过（`--write` 时 render 被跳过）。A5 要把它变成 25 步。本仓库有过「闸门为了通过而改判据」的先例（`01-ROUND-SUMMARY.md` §七 ③ 红队自己撤回；`00-Q4-REPORT.md` ② `check-scenes` 的恒真式）。建议在 A5 的验收里加一句：**新增两步之后，若全绿，必须再跑一次「装回一个已知缺陷」的变异，证明它仍会红**——否则 25 步全绿和 22 步全绿一样，不提供新信息。

### 12. 最后一个操作提醒：`render-scheme.mjs --all` 从来不存在

`quarter.mjs:69` 给渲染步传 `args: ['--all']`，而 `render-scheme.mjs:27-29` 只读 `argv[2]` 并把它当目录名。我实测：

```
$ node prototypes/_build/render-scheme.mjs --all; echo $?
没有 index.html: D:\Web\style\prototypes\--all\index.html
2
```

也就是说 **`quarter.mjs --render` 的渲染步必然失败**，而 Q4 报告说的「22 步全过」是 `--write` 模式（渲染被跳过）下的数字。这不影响任何已有结论，但它意味着：**任何以「跑一下季度脚本就会重渲染」为前提的计划都不成立**——包括 A2 的 30 案重渲染，只能逐案调 `render-scheme.mjs <dir>`。这一条我列进 A5 的验收，但任务书里没有。
