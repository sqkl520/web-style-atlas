# 北极星审计 · 开工任务书（给规划 Agent）

> 2026-11-12　主线程
> 你负责拆解，不负责执行。产出给下一层的 5 个专家 Agent 用。

---

## 〇、背景（必读，省得你重复查）

这个仓库是 `D:/Web/style` —— 静态「网站设计风格图鉴」。35 个静态样张（`prototypes/S01..S35`），
一个选型台（`prototypes/_selection/`），一套很重的闸门工具链。产品形态：店主挑一个风格 →
复制一段 AI 提示词 → 贴到自己的 AI → 得到自己的站。**提示词就是交付物。**

北极星指标是：**提示词能不能让一个不知道答案的模型做出这个风格。**

上一轮（Q7）声称做了盲测复刻，但本轮已确证两件事推翻前提：

1. **本机所有 Claude 模型名都被路由到别的模型**（`ANTHROPIC_BASE_URL=http://127.0.0.1:15721`，
   所有 `ANTHROPIC_DEFAULT_*_MODEL_NAME` 都是 `deepseek-ai/deepseek-v4.1-flash`）。
   实测 105 个 subagent transcript：`SCNet-Max` 97、`hy4-free` 36、`deepseek-v4.1-flash` 6，
   **零个 Claude**。用户已确认这是他配的，可以继续用。
   含义：所有「我派了 opus 独立复核」的说法无效；靠实测数字成立的结论不受影响。
2. **工作区里到处是答案副本**。用户已批准删除 `deliverables/56-scratch/head/` 与
   `deliverables/50-scratch/head/`（30 套，已删）。但 `.claude/worktrees/` 下还有 4 份完整仓库副本
   （共 764MB，零未提交改动、零未推送 commit），`deliverables/` 下另有多处散落片段。

**用户已定的三个决定：**
- 模型路由是他配的，继续干活。
- 删掉 `head/` 那 30 套（**已执行**）。
- **两侧都做**（对账侧 + 生成侧盲测复刻），成本已不是障碍。

---

## 一、本轮已完成的事（不要重做）

### 1.1 `measure.mjs` 三处静默失败已修并提交（commit 7d87923）

| 缺陷 | 现象 | 修法 |
|---|---|---|
| 静态服务站点根 = HTML 所在目录 | 原型引 `../_fonts/` 全部 404，**字体静默回退成系统字体**，字号/字距量出来全错 | 根改成仓库根，加路径逃逸检查（越出根一律 403） |
| CLI 入口判据 `argv[1].endsWith('measure.mjs')` | 任何以 `measure.mjs` 结尾的脚本 import 本模块时也触发 CLI 分支，多跑一次 measure | 改成比对解析后的绝对路径 |
| favicon 404 | `Page.navigate` 的 errorText 被任何失败子资源触发，`goto()` 见到就抛 | favicon 发 204 不发 404 |

**修后实测**（可用 `node deliverables/78-northstar/_probe/_live-measure.mjs S01 S17 S28` 复现）：

```
S01  4 栏 div.columns   mainRatio [0.312,0.25,0.25,0.188]   ← CSS 是 5fr 24px 4fr 24px 4fr 24px 3fr
S17  3 栏 div.sheet     mainRatio [0.247,0.012,0.741]
S28 16 轨 div.press__grid ← CSS 是 repeat(16, minmax(0,1fr))
```

### 1.2 隔离环境已验证可行（这是生成侧的前提，已实测）

`deliverables/78-northstar/_probe/_isolation-test*.sh` 三个脚本实测结论：

- 干净 `HOME` + 临时工作目录跑 `claude -p` **能通**（需从 `~/.claude/settings.json` 复制 env：
  `ANTHROPIC_API_KEY=PROXY_MANAGED`、`ANTHROPIC_BASE_URL=http://127.0.0.1:15721`）。
- **读本仓库被真实拒绝**，原文错误：
  `Claude requested permissions to read from D:\Web\style\README.md, but you haven't granted it yet.`
- 对照实验：隔离区内自己的 `canary.txt` **能读到** ⇒ 拒绝来自权限而非工具坏掉。
- 隔离环境里**看不到 `MEMORY.md`**（agent 答 NO）。
- `Write` 工具可用（写出的文件内容正确）。
- ⚠️ 该环境里 **shell 不可用**（`pwsh timed out after 5000ms`），agent 只能 Read/Write。
  生成 HTML/CSS 够用，但**不能让它跑构建脚本**。

**注意隔离的边界**：`D:\Web\style` 只是被权限挡住，不是物理不可见。
一个足够执着的 agent 仍可能绕。这一点必须在报告里如实写，不能宣称「绝对盲」。

### 1.3 已知但未修的确证缺陷

| # | 缺陷 | 位置 | 影响 |
|---|---|---|---|
| D1 | 7 条判据里 4 条无法失败 | `deliverables/74-q7/compare.mjs:56`（写死 `ok:true`）、`:108`（同）、`:59-77`（只报不判）、`:126`（只判 `>0`，而 prompt-S03 要求 ≥8 张图） | 「S07 得 7/7」的分母不是 7 个独立判据 |
| D2 | 30/35 份 `report.json` 缺 `metrics.structure` | 各案 `.inspect/report.json` | 栏数/主轴宽/线宽集合的唯一来源缺失；实测重渲染安全（只改 `at` 与新增 `structure`），约 1 分钟/案 |
| D3 | 11/35 案用 `repeat(auto-fit, minmax(Npx,1fr))`，`columns` 是运行时展开值不是设计意图 | 见 `01-ROUND-SUMMARY.md` §六 | 这类案的「几栏」随视口变（S31 在 1440/768/390 下是 4/2/1），拿它当验货基准会假通过 |
| D4 | 9 案含 `infinite` 动画 | S02 S05 S11 S14 S17 S18 S21 S22 S23 | 截图必抖（Q2 实测 S17 的图 7 次渲染有 4:3 两个变体），**对账基准只能用 DOM 测量** |
| D5 | 8 案抽样系统性避开难点 | 见 `_probe/04-sampling.md` | 五类风险（chroma≤25 / hard / minPics≤1 / S31–S35 / gate.fail>0）合计 11 案，8 案里 0 个；替代方案 S08/S15/S31 |

---

## 二、要你拆的活

用户要求**两侧都做**。请把下面两大块拆成可并行、相互独立、有明确产出的任务，
交给 5 个以上专家 Agent（允许递归派生）。每个任务要写清：输入、输出路径、验收判据、依赖。

### 块 A · 对账侧（不受模型路由与答案副本影响，纯 DOM 测量）

目标：35 案全部有一份**可复算的、判据真能失败的**对账基准。

必须解决：
- **A1** 修 `compare.mjs` 那 4 条无法失败的判据，并加 `--selftest` 变异测试证明每条真会响
  （本仓库铁律：没做过变异测试的闸门等于没做，见 `prototypes/_build/probe-ui.mjs` 的 `--selftest` 惯例）。
  注意 D1 里第 7 条：`imgVisible > 0` 应改成对 `minPics` 的判定，而 `minPics` 可从
  `prototypes/_prompts/minitems-parsed.json` 读（`check-contract.mjs` 已有先例）。
- **A2** 补齐 30 案的 `metrics.structure`（重渲染）。**必须自己验证重渲染是安全的** ——
  不要相信「只改 at」这句话，要给出 strip 后逐字节比较的证据。
- **A3** 处理 D3：给 `structure` 加 `layoutKind`（`fixed` / `auto-fit` / `no-column-layout`），
  并让对账对 `auto-fit` 案换判据。要证明三类能正确区分：S01(fixed) / S31(auto-fit) / S14(no-column-layout)。
- **A4** 35 案全量测量并落一份机器可读的基准（建议 `deliverables/78-northstar/baseline/*.json`），
  含 `layoutKind`、`columns`、`mainRatio`、`headBodyRatio`、`borderWidths`、`svgStrokeWidths`、`imgCount`。
  要能一键复算。

### 块 B · 生成侧（隔离盲测）

目标：回答「提示词能不能让一个不知道答案的模型做出这个风格」。

必须解决：
- **B1** 选案。已知 8 案抽样有系统性偏差（D5）。给出选择方案并**用概率说明它为什么不是偏差样本**。
  候选至少覆盖：`chroma≤25`、`hard`、`minPics≤1`、S31–S35、`gate.fail>0` 五类。
  已知替代方案 S08/S15/S31，但请独立复算而不是照抄。
- **B2** 生成脚本。用已验证的隔离方式（见 §1.2）批量跑 `claude -p`，每案给：
  提示词全文、干净工作目录、输出 `out-<id>.html`。**要记录实际 served model**（从隔离环境的
  transcript 读），否则又是「名义模型」。
- **B3** 隔离性验证。**不要相信 §1.2 的结论**，自己重跑一遍，并额外测三种绕过路径：
  ① 直接读绝对路径；② 通过 `..` 相对路径；③ 让 agent 描述它「记得」的 S01 长什么样。
  最后一条是检测记忆注入的关键 —— 如果它能在没读文件的情况下描述出 S01 的四栏结构，
  说明隔离失败。**这是本轮最重要的一条验证。**
- **B4** 成本与可复现性。每案记录 token、时长、served model、失败重试次数。
  给出「跑一轮 35 案」的实测外推（上一轮的错误是拿全部季度 agent 工作除以 16，
  真值是 13 个盲测 agent 共 8.6M token、平均 0.6M/案）。

---

## 三、纪律（违反会被打回）

1. **结论必须有实测数字或 `file:line`**。禁止「应该」「大概」「通常」。
2. **闸门必须做变异测试**。写完断言不算完，要把缺陷装回去证明它会响。没响过的断言等于没写。
3. **区分「我没查到」与「不存在」**。查不到就写查不到。
4. **不要重做 §一 已完成的事**。
5. **发现前提错误立刻上报**，不要顺着错误前提往下建。
6. 不要动 `D:\` 盘上不属于本仓库的文件。用户明确说过：「不是你干的不要动」。
7. `.claude/worktrees/` 那 4 份副本**不要删**（用户只批准删 `head/`，那 30 套已删）。

---

## 四、你要交付的东西

写到 `deliverables/78-northstar/02-PLAN.md`：

1. **任务表**：编号 / 一句话目标 / 输入 / 输出路径 / 验收判据 / 依赖 / 给哪个 Agent
2. **并行度分析**：哪些能真并行、哪些有硬依赖、关键路径多长
3. **风险表**：每条风险 + 概率判断 + 缓解办法。至少覆盖
   「隔离被绕过」「判据仍然无法失败」「重渲染引入新差异」「模型中途换」
4. **你认为我漏掉的**：这一节最重要。如果任务书本身有错，直接说。
