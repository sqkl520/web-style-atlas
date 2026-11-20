# 北极星审计：本轮实测结论汇总

> 2026-11-12　主线程整理
> ⚠️ 先读 §零：本轮有两条**推翻前提**的发现，它们改变了整个方案的性质

---

## 零、两条推翻前提的发现

### ① 本机所有「Claude 模型名」都被路由到别的模型

`~\.claude\settings.json` 的 `env`：

```
ANTHROPIC_BASE_URL                  = http://127.0.0.1:15721
ANTHROPIC_API_KEY                   = PROXY_MANAGED
ANTHROPIC_DEFAULT_OPUS_MODEL_NAME   = deepseek-ai/deepseek-v4.1-flash
ANTHROPIC_DEFAULT_SONNET_MODEL_NAME = deepseek-ai/deepseek-v4.1-flash
ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME  = deepseek-ai/deepseek-v4.1-flash
ANTHROPIC_DEFAULT_FABLE_MODEL_NAME  = deepseek-ai/deepseek-v4.1-flash
```

实测 transcript（**105 个**子 agent 文件 + 本会话主 transcript）：

| model 值 | 文件数 |
|---|---|
| `SCNet-Max` | 97 |
| `hy4-free` | 36 |
| `deepseek-ai/deepseek-v4.1-flash` | 6 |

**没有一个是 Claude。** 我全程写的 `model: "opus"` 是名义参数，从未生效。

**后果**：我此前所有「这条结论来自 opus 独立复核」都是**无效论证**。
不受影响的是：靠实测数字而非判断力成立的结论（下面 §一–§三全部属于此类）。

### ② 这个工作区里「盲测」不可能成立

逐案完整答案的副本遍布三个地方：

| 源 | 内容 | 规模 |
|---|---|---|
| `.claude/worktrees/` | 4 份完整仓库副本 | 140 套答案 |
| `deliverables/56-scratch/head/` | 每案 `.css`+`.html`+`.json`+`.spec.md` | 30 套答案 |
| `deliverables/` 下另 8 个目录 | 散落片段 | 35 处 |

**决定性证据**（MD5 相同）：

```
deliverables/56-scratch/head/S17.css              ea86645b213c014c
prototypes/S17-revenue-stamp-stub/style.css       ea86645b213c014c
```

Q7 的盲测规则是「禁止读 `prototypes/`」。**按字面被遵守了**，但那些副本都在
`prototypes/` 外面 —— 包括 Q7 要验的那个 `#D6C9AC`，它在 `56-scratch/head/S17.css:16`。

16 个盲测 agent 还全部被注入了 `MEMORY.md`（写着这个仓库是干什么的），
其中 6 个的 `gitStatus` 直接列出了上一轮的 `out-S03-v2.html` 等产物名。

**后果**：「提示词能否让一个**不知道答案**的模型做出这个风格」——
这个问题从未被验证过，且在这个工作区里无法验证。**不是打折，是前提不成立。**

---

## 一、度量层：三个已核实并可修的缺陷

### 1.1 `measure.mjs` 在 S01/S28 上选错了测量对象（已修）

**缺陷**：`deliverables/74-q7/measure.mjs:70-82` 的判据是 `tracks < 2 || tracks > 4` 排除，
再按面积最大选。而 S01 的真版心是 **7 轨**（4 栏 + 3 条 24px 铅条），被直接排除。

**证据**（真浏览器量出 S01 全部 grid 容器）：

```
   7 轨  面积  1047123  DIV.columns   365.5px 24px 292.391px 24px 292.406px 24px 219.312px
   2 轨  面积  3922613  DIV.plate-grid   608.797px 608.812px      ← 旧判据选中这个
```

CSS 真值在 `prototypes/S01-red-wedge-broadsheet/style.css:195`：
`grid-template-columns: 5fr var(--bar) 4fr var(--bar) 4fr var(--bar) 3fr;`

**修复后实测**：

```
S01  gridTracks: 4   gridSel: div.columns
     mainRatio: [0.312, 0.25, 0.25, 0.188]   ← 5/16, 4/16, 4/16, 3/16，与 CSS 完全吻合
S28  gridTracks: 16  gridSel: div.press__grid  ← style.css:369 repeat(16, minmax(0,1fr))
```

修复要点（详见 `_probe/01-measure-fix.md`）：
- 括号感知切分（`minmax(0, 1fr)` 内部有空格，`split(/\s+/)` 会切碎）
- 窄轨道**成组出现**才剔（单条留作中缝）—— 照搬 `probe.mjs` 的「剔 <32px」
  会打坏 S17（16px 齿孔线）和 S33（1px 中缝）
- 排除图片网格时**不认 `svg`**（很多案用 SVG 画装饰）
- 按**容器文字量**排序（不是面积）—— S07 的 `header.bar` 4 轨 53 字 vs 正文 2/3 栏 479/730 字

**残留**：S21/S23/S11/S08 仍选中图版组或细栅格。再收紧会打坏已核实的 6 案，
这条线需要先定清「栏数」在产品里的语义。

### 1.2 只有 5/35 份 `report.json` 含 `metrics.structure`

独立复算（`_probe/_known-truth-audit.mjs`）：

```
含 metrics.structure：5/35 —— S31 S32 S33 S34 S35（全是 Q2 新建）
验货候选案里（S03 S07 S17 S01 S09 S14 S19 S24 S26 S28）：★ 一个都没有
```

`metrics.structure` 是「栏数／主轴宽／线宽集合」的唯一来源 ⇒ **验货候选案必须先重渲染**。

**重渲染是安全的**（实测 3 案 S01/S17/S05 逐键 diff）：只有 `at` 和新增的
`structure` 两处变化，`words`/`screens`/`page`/`type`/`color`/`findings` 逐字节相同。
S05 做 `strip(at, structure)` 后整个对象 `JSON.stringify` 相等。代价约 1 分钟/案。

### 1.3 9 案含 `infinite` 动画 ⇒ 截图必抖，不能作对账基准

```
含 infinite 动画：9 案 —— S02 S05 S11 S14 S17 S18 S21 S22 S23
其中落在验货候选里：S17 S14
```

这与 Q2 的确定性测试（`deliverables/75-q2/_det/03-determinism-verify.md:36`）闭合了因果：
S17 的 `tablet-page-01.jpg` 在 7 次渲染里有 4:3 两个离散变体，
而 S17 的 `style.css:218` 正是 `animation: turn 900ms linear infinite;`

**所以对账基准只能用 DOM 测量，不能用截图。**

---

## 二、判据层：`compare.mjs` 7 条里 4 条无法失败

无 API 验证 Agent 逐行查实：

| 位置 | 问题 |
|---|---|
| `compare.mjs:56` | 把 `ok: true` 写死 |
| `compare.mjs:108` | 同上 |
| `compare.mjs:59-77` | 只报不判 |
| `compare.mjs:126` | 只判 `imgVisible > 0`，而 `prompt-S03.txt:19` 要求至少 8 个 |

剩下 3 条里 2 条判的是「提示词里的数字有没有抄进去」（照抄检验），
只有 border 线宽一条在真正判断。

**所以 Q7 报告的「S07 得 7/7」这个结论，其分母不是 7 个独立判据。**

---

## 三、抽样层：规划给的 8 案不能代表全库

独立复算（`_probe/04-sampling.md`，未读规划报告，从 `data.js` 直接算）：

| 漏掉的东西 | 全库 | 8 案 | 随机抽 8 案恰好全漏的概率 |
|---|---|---|---|
| `chroma ≤ 25`（很安静） | 6 | 0 | 18.24% |
| `hard` | 4 | 0 | 33.52% |
| `minPics ≤ 1`（少图） | 4 | 0 | 33.52% |
| Q2 新建 S31–S35 | 5 | 0 | 24.87% |
| `gate.fail > 0` | 6 | 0 | 18.24% |
| **五类并集** | **11** | **0** | **3.12%**（精确超几何） |

更尖锐的一条：**8 案里 6 案（75%）在 Q3–Q7 已经做过单案盲测**，
随机抽 8 案命中 ≥6 个已测案的概率是 **0.12%**。

**方向不是"随机偏差"，是"系统性地避开没验过的"。**

替代方案（3 案）：**S08 / S15 / S31** —— `threshold` 三档全中、五类风险一个不漏、
三个都是单例骨架。它的硬上限也如实写了：`structure` 覆盖 3/23，
`tone` 只覆盖 3/7（60% 的调性没进样本）。

---

## 四、被证伪的一条

规划报告说「`cdp.mjs` 的 `close()` 没销毁 `proc.stderr`，每页多挂 22.7 秒，加一行后 20 倍提速」。

**实测不成立。** 我照改后无改善，二分定位发现：
- 纯 node 脚本退出耗时 **1 ms**
- 只 `launch + close`（改后）：`close` 后只多等约 **2 秒**
- 那 16 秒来自我自己的测试脚本（`server.close()` 没等回调、HTTP keep-alive）

且 `close()` 之后 `proc.stderr.destroyed === true`、`proc.signalCode === 'SIGTERM'`，
挂住进程的是 `process.stderr` / `process.stdout`，**跟这个库无关**。

**已 `git checkout` 回退。** 在一个没有泄漏的地方加 destroy + 等 exit + SIGKILL 兜底，
只会让 vendored 代码多出 30 行没人能验证的逻辑。

---

## 五、这一轮的净结论

| 项 | 状态 |
|---|---|
| 度量器选错元素 | **已修**，S01 4 栏 / S28 16 轨 与 CSS 真值吻合 |
| 30 案缺 `metrics.structure` | 已确认安全可补（重渲染只改 `at`） |
| 截图不能作基准 | 已确认，9 案有 infinite 动画 |
| `compare.mjs` 4/7 判据无法失败 | 已确认，**未修** |
| 抽样不代表全库 | 已确认，给了替代方案 |
| `cdp.mjs` 22 秒泄漏 | **证伪**，已回退 |
| 盲测可行性 | **前提不成立**（答案副本遍地 + 模型路由不可控） |

**验货这件事今天仍不具备执行条件。** 差的不是算力，是：
1. 判据要先能失败（`compare.mjs` 那 4 条）；
2. 要有干净环境（移走答案副本）；
3. 要有一个已知且固定的模型（当前路由做不到）。

**能做的**：对账侧 35 案全测（2–5 分钟，纯 DOM 测量，不受上述三条影响）。

---

## 六、新发现：`columns` 对 11 案来说是「视口相关」的，不是设计意图

修好度量器后跑完全库 35 案（零失败），规律浮现：

```
S01 4  S02 3  S03 3  S04 2  S05 2  S06 2  S07 3  S08 4  S09 3  S10 5  S11 12 S12 4
S13 16 S14 0* S15 12 S16 0* S17 3  S18 3  S19 12 S20 3  S21 3  S22 13 S23 2  S24 8
S25 2  S26 2  S27 9  S28 16 S29 2  S30 12 S31 4  S32 4  S33 3  S34 0* S35 2
                                       （* = no-column-layout，规格原文就是「不使用固定栏数」）
```

**11/35 案用了 `repeat(auto-fit, minmax(Npx, 1fr))`**：S02 S08 S12 S17 S21 S25 S31 S32 S33 S34 S35。

对这些案，`columns` 报的是**运行时展开后的列数**：

```
S31  style.css:134  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
     在 1440 宽下 → 4 列
     在 768 宽下  → 2 列
     在 390 宽下  → 1 列
```

### 为什么这是个问题

「这个设计分几栏」与「这个设计在 1440 宽下排成几列」**不是同一件事**：

- S01 的四栏是**设计意图**（CSS 里写死 `5fr 24px 4fr 24px 4fr 24px 3fr`），
  换视口它还是四栏结构，只是窄档折成单栏。
- S31 的「4」是 `auto-fit` 在 1440 宽下**算出来**的 —— 它是「这个宽度能塞几列」，
  不是「这个设计是几栏版式」。

拿 `columns` 当验货基准时，这两类案的数值含义不同：
- 前者：原型 4、生成物 4 ⇒ 一致，能判。
- 后者：原型 4、生成物 4 ⇒ **也可能只是碰巧都塞得下 4 列**，
  即使生成的页面版式逻辑完全不同。

### 影响范围

11/35（31%）。而且**我 Q2 建的全部 5 个新案**（S31–S35）都在里面 ——
这解释了为什么它们的 `report.json` 里 `columns` 是 4/4/3/0/2 这种数。

### 该怎么改（未实施）

最小改法是给 `structure` 加一个 `layoutKind` 字段，区分：
- `fixed` —— CSS 写死轨道（S01/S07/S17 这些），`columns` 是设计意图
- `auto-fit` —— 自适应当前宽度（S31 等 11 案），`columns` 随视口变
- `no-column-layout` —— 确实没有分栏（S14/S16/S34）

这样验货时对 `auto-fit` 的案改用别的判据（比如「每列最小宽度」），
而不是直接把「1440 下几列」当基准。

**我没有实施**：这需要先定「验货到底要验设计意图还是验渲染结果」，
而那是产品判断，不是技术选择。

---

## 七、红队纠错：我此前给的两个数字是错的

红队 Agent（`_probe/03-redteam-WBS.md`，494 行）复算了我转述的几处，其中**两条我确实传错了**。

### ① 「S31 丢 4 个色」—— 错，S31 一个都没丢

规划报告 `00-WBS.md:23` 声称 S31 丢 4 色。我此前在对话里转述了这个说法。**它是错的。**

那 4 个 hex（`#7A756C` `#1C1B19` `#6E6A63` `#4F4B42`）只出现在
`prototypes/S31-quiet-mid-grey-rulesheet/style.css` 的**注释**里 —— 第 4、12、15、16 行，
全是 `*` 开头的注释块，记录的是「第一次渲染实测后把 #7A756C 改成 #5F5B55」这段历史。

S31 的 `:root` 实际声明 5 个唯一色（`#5F5B55` `#55514B` `#F2F0EC` `#DEDAD3` `#8A857C`），
提示词 palette 列了全部 5 个。**丢 0。**

我独立复算（`_probe/_color-loss.mjs`，只取 `:root` 块且剥注释）：

```
全库总计丢色: 5 个
有丢色的案: 2 个 —— S06 S24
其余 33 案：:root 声明的唯一色与提示词 palette 完全一致
```

所以真实情况是 **2 案 5 色**，不是 3 案 9 色。**如果照错误说法去修，会去修一个不存在的问题。**

### ② 「16 个 agent 里 1 个中途换模型」—— 量级错

我此前转述规划报告的「1/16 中途换模型」。红队实测：**33/105 个 agent 发生过模型切换**，
而且更根本的是 **16/16 从第一条请求起就不在声明的模型上**（`requested=opus` → `served=SCNet-Max`）。

也就是说「固定同一模型」不是「偶尔漂移」，是**从未成立过**。
我上一条消息里说的这条是对的，但「1/16」这个量级是规划报告低估的。

### ③ 红队自己撤回的两条（这一条要写，红队也要被审）

- 它最初以为规划的分层表「用它自己的 C 判据算不出来」——**撤回**。按 `/[0-9]+\s*(栏|列)/`
  重算，8 层成员与规划的表逐案一致。是它把 S29 的「五栏」读错成了 C1。
- 它最初测到「22.7 秒 → 1.3 秒」——**复现不出**。干净的 A/B 是 `52.6s → 37.5s`（1.40×）。
  第一次测到的 `1.3s` 是假的（文件名不匹配导致 CLI 分支空跑）。

这一条与我 §四「证伪 22 秒泄漏」的方向一致，但红队给了更精确的数字：
**是 1.40× 不是 20×**。而 1.40× 的来源仍未定位到 `cdp.mjs`（它说「干净 A/B」，
但没说是哪一段的 A/B）。

### ④ 红队的第四条：K3 在今天的磁盘上不成立

它指出 `00-WBS.md:3` 声称「工作区改动不影响本文结论」，而 `measure.mjs` 在审计期间
被从 230 行改成 476 行，**S01 现在报 4 轨而不是 2 轨** —— 恰好错在核心证据上。

**这条说的是真的，但结论要反过来看**：`measure.mjs` 的那个改动**就是本轮修好的那个缺陷**。
所以现在报 4 轨是**对的**，不是「证据失效」。规划报告的 K3 用的是修复前的数字。

---

## 八、红队给出的其他实测数字

这些我没有独立复核（标注出来，别当成已验证）：

| 项 | 红队给的数 |
|---|---|
| 35 案全量对账耗时 | **401 秒 / 6.7 分钟**（median 8.6s/页） |
| 16 个生成 agent 合计 token | **385.6M**（24.1M/agent 这个数对，但含 2 处返工） |
| 单案 token spread | **6.7×** |
| 8 案 bootstrap 95% 区间 | **148–241M** |
| 全库真正丢色 | **2 案 5 色**（S06 丢 1、S24 丢 4）← 我已独立复算，正确 |

---

## 九、成本数字：24.1M/案 是错的，真实是 0.6M/案

这是我独立复算出来的，**推翻了规划报告的可行性结论**。

### 入口

`~/.claude/projects/D--Web-style/<session>/subagents/` 下有 **105 个** `agent-*.meta.json`，
每个都有 `description` 与 `model`，对应一个 `.jsonl` transcript，里面每个 assistant 轮次都带 `usage` 字段。

### 按 description 精确分类，只算真正的盲测 agent

```
判据：description 匹配 /^(blind test|replicate|build .* from prompt|build s\d\d|rerun .*blind)/
命中 13 个：

  1.3M  [opus]  Blind test S23（最大的一个）
  0.8M  [opus]  Rerun S17 blind test 9-color
  0.7M  [opus]  Blind test S17 with 9 colors
  0.6M  [opus]  Build S17 page from prompt
  0.6M  [opus]  Rerun S03 blind test 9-color
  0.6M  [opus]  Blind test S23
  0.5M  [opus]  Replicate S03 from prompt
  0.5M  [opus]  Build S17 v2 page
  0.5M  [opus]  Blind test S06
  0.5M  [opus]  Blind test S14
  0.4M  [opus]  Replicate S07 from prompt
  0.4M  [opus]  Blind test S24
  0.4M  [opus]  Blind test S26
  0.4M  [opus]  Blind test S19

  合计 8.6M   平均 0.6M/案
```

### 三个数字的关系

| 来源 | 数字 | 口径 |
|---|---|---|
| 规划报告 | **24.1M / 案** | 105 个 agent 总量 ÷ 16 —— **把检索/审查/修复 agent 也算成"每案成本"** |
| 红队 | **385.6M** | 全部 agent 的总量（用 `cache_read` 算的另一个口径我复现不出，按 `input+output` 是 199.7M） |
| **我实算** | **0.6M / 案** | 只算 13 个真正的盲测 agent |

### 为什么差 40 倍

24.1M/案 这个数是「**把整个季度所有 agent 的开销平摊到案子上**」，
而不是「跑一次盲测要多少」。前者是项目管理口径，后者才是「再做一次验货要多少」。

### 对可行性的影响

规划报告基于 24.1M/案 得出：
- 3 案 72M、8 案 193M、35 案 842M
- 因此「35 案全测不可行，必须抽样」

**按真实数字 0.6M/案 重算**：
- 3 案 ≈ **1.8M**
- 8 案 ≈ **4.8M**
- 35 案 ≈ **21M**

**35 案全测的成本是 21M，不是 842M。** 那个「必须抽样」的结论建立在一个 40 倍高估的数字上。

同时红队实测「35 案全量对账 401 秒 / 6.7 分钟」—— **对账侧全测本来就可行**。

### 但注意：成本不再是障碍，不代表验货可以做了

成本降低不解决 §零 的两条前提问题：
1. 盲测 agent 仍跑在 `SCNet-Max` 上（`meta.json` 写 `opus`，实际不是）
2. 答案副本仍散布在工作区

**成本只是从"做不起"变成"做得起，但做出来的结论不可信"。**
