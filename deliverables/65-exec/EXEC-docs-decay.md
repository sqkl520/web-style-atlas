# 执行报告：文档与代码背离（4 处）

- **执行时间**：2026-10-27
- **工作目录**：`D:\Web\style`
- **改动文件**：`README.md`、`README-EN.md`、`prototypes/_build/check-anchors.mjs`、`prototypes/_build/check-docs.mjs`（新建）
- **未 commit**（按硬约束）

---

## 0. 一句话结论

三处 README 腐化已按"如实描述"改完（中英双语），第四处 `check-anchors.mjs` 的 `undefined` 已复现并修好，并新增 `check-docs.mjs` 把「文档 vs 代码」这一环接进流程。**两档校验器 FAIL=0、WARN 数未增加**，且新检查器带 `--selftest` 自证能抓出这三处腐化。

| 验收项 | 结果 |
| --- | --- |
| 1. README 校验器 FAIL=0，WARN 不增加 | ✅ 中：0 FAIL / 0 WARN（改前 0/0）；英：0 FAIL / 2 WARN（改前 0/2，同两条） |
| 2. `check-docs.mjs` 对当前状态通过 | ✅ 0 FAIL / 0 WARN / 12 PASS，exit 0 |
| 3. 对人为改坏的 README 报错 | ✅ 5 FAIL / exit 1，`--selftest` 自动断言 |
| 4. `check-anchors.mjs` 不再打印 undefined | ✅ 输出 `S05  href="#dg-' + keys[i] + '"` |
| 5. 三处腐化改前/改后对比 | ✅ 见 §1–§3 |

> **⚠️ 一个必须让 lead 知道的外部变化**：`prototypes/_selection/prompt-copy.js` 在我执行期间被另外的 Agent 连续修改（mtime 从 5:05 到 5:17，文件长了 ~14KB）。**提示词实测长度因此从 1617–1905 漂到 1632–1920**。README 里最终写的是**漂移后**的 1632–1920 / 中位 1822。若那几个 Agent 后续再改，这两个数需要跟着更新——`check-docs.mjs` 会在偏差 >3% 时报 FAIL、≤3% 报 WARN 提醒。

---

## 1. 腐化 1：README 说「已知未修」，实际已修

**判定**：属实。工作区已修（`collect-schemes.mjs` 的 A 正则 `[.．]?` → `(-附|[.．])`，属未提交改动）。

**改法**：不删，改写成"曾经存在 + 根因 + 已修 + 实测值"。这也是仓库自己的风格（把犯过的错留在原地）。

### 改前（README.md L342，原文）

```markdown
- ❌ **选型台对三个案子抽少了段**：`S12`/`S15`/`S19` 只展开 9 段。**原因不是规格里没有**——这三案的 `_specs/*.md` **L25 都有「5. 布局与网格」**，是 `_build/collect-schemes.mjs:187` 的抽取对它们失效。**这是本项目一个已知未修的抽取缺陷**，不是规格缺陷。
```

### 改后（README.md L352–355）

```markdown
- ❌ **选型台曾对三个案子抽少了段——已修，根因记在这里**：`S12`/`S15`/`S19` 一度只展开 9 段而非 10 段。**原因不是规格里没有**：这三案的 `_specs/*.md` 的 L25 都有「5. 布局与网格」，写的是「8 栏，基线 6px…」「12 栏，基线 8px…」，一个字都不缺。
  病根在 `_build/collect-schemes.mjs` 的 A 惯例字段正则：分隔符 `[.．]` 被写成**可选**，于是这三案"布局与网格"正文的**第一句恰好以数字开头**——`8 栏，基线 6px（对齐街机像素栅格），栏间距 0。不对称方式：`——整行被读成一个叫「8」的字段标题，字段 5 的段落当场被切到长度 0，正文挂到了一个谁都不读的字段名下。全库 30 案里符合"数字开头且不带分隔符"的只有这 3 处，所以恰好是这三案。
  修法是把分隔符改成**必需**：`[.．]?` → `(-附|[.．])`（`-附` 与点号是两种并列的合法分隔符，缺一不可——只要求"必须有点"会把 `1-附（…）：` 那一路挡掉，10 案的机制句会被并进字段 1）。修完后实测这三案的 `layout` 分别是 **549 / 640 / 420 字，30 案全部有值**（`layout` 长度 min 242 / 中位 413 / max 865），三案都恢复成与其他 27 案一样的完整展开。
  **记在这里而不是删掉**，是因为这个仓库的风格就是把犯过的错留在原地：一个"规格里明明有、抽取把它吃了"的缺陷，靠读规格永远看不出来。
```

### 实测佐证

| 数据 | HEAD（未修） | 工作区（已修） |
| --- | --- | --- |
| `layout` 非空案数 | 27 / 30 | **30 / 30** |
| S12 layout 长度 | 0 | **549** |
| S15 layout 长度 | 0 | **640** |
| S19 layout 长度 | 0 | **420** |
| layout 长度 min/中位/max | — | 242 / 413 / 865 |

注：原文还写了 `collect-schemes.mjs:187` 这个行号。改后**刻意不再写行号**（该行现在是 L193，且本项目已明令行号是可腐坏的引用）。这是"不要把新腐化写进去"的处理，不是顺手重写。

---

## 2. 腐化 2：README 说「9 个方案」，实际 UI 是 14 案

**判定**：红队只说了前半。查清后，**UI 上会对 14 个案子显示警告**，因为 `prompt-copy.js` 的判定是 `riskyTopic || riskyCount`，两个轴：

| 轴 | 来源 | 案数 | 名单 |
| --- | --- | --- | --- |
| 题材绑死（`riskyTopic`） | `prompts.js` 的 `hardIds` / `s.hard` | **4** | S15 S18 S21 S29 |
| 数量绑死（`riskyCount`） | `capacity.degrades === "yes"` | **13** | S02 S04 S05 S08 S12 S14 S15 S18 S19 S20 S22 S23 S29 |
| **并集（UI 实际显示 ⚠ 的案数）** | `riskyTopic \|\| riskyCount` | **14** | 上面两个名单合并；两轴只重叠 3 案（S15 S18 S29），S21 只在题材轴，另 10 案只在数量轴 |

- `hardIds` 曾在 `d669ddb` 从 9 缩到 4（旧名单 S03 S05 S10 S14 S15 S18 S20 S21 S29 已用 `git show d669ddb^:prototypes/_selection/prompts.js` 核实）。
- 当前真实警告文案（逐案实测输出）：
  - 题材轴：`机制绑在特定题材上，换普通内容会退化`
  - 数量轴：`单元位置是手工排定的，内容少于 N 条会留洞`（N = 该案 `minItems`）
  - 两条都命中时用「；」连接（S15/S18/S29 就是这个形态）
- **README 若只讲 hard 会漏掉 degrades 那 10 案**，所以改后把两轴都写清楚。

### 改前（README.md L103）

```markdown
**它的边界**：这是**迁移风格**用的，不是接管你的生意。9 个方案的机制绑死在自己的数据结构上（S03 S05 S10 S14 S15 S18 S20 S21 S29），换普通内容会退化——按钮旁边会直接标「⚠ 这案机制绑死在行业数据上，换普通内容会退化」，不让你事后才发现。
```

### 改后（README.md L103–108）

```markdown
**它的边界**：这是**迁移风格**用的，不是接管你的生意。**30 案里有 14 案**的按钮旁边会直接标 `⚠`，因为它们换普通内容会退化——不让你事后才发现。两套口径分得开（`prompt-copy.js` 的 `riskyTopic || riskyCount`）：

- **4 案的机制绑在特定题材上**（`S15` `S18` `S21` `S29`，即 `prompts.js` 的 `hardIds`）：文案写「机制绑在特定题材上，换普通内容会退化」。
- **13 案的单元位置是手工排定的**（`S02` `S04` `S05` `S08` `S12` `S14` `S15` `S18` `S19` `S20` `S22` `S23` `S29`，即 `capacity.degrades === "yes"`）：文案写「单元位置是手工排定的，内容少于 N 条会留洞」，N 是该案的 `minItems`。

两个轴正交，只重叠 3 案（`S15` `S18` `S29`）；`S21` 只落在题材轴，另外 10 案只落在数量轴，**并集 14 案**。同一个案子两条都命中时，警告会把两句用「；」连起来一起显示。
```

---

## 3. 腐化 3：README 说「1100 字左右」，实际中位 1807/1822

**判定**：属实。实测 0/30 落在 1100±10%。

### 改前（README.md L78）

```markdown
选中一个方案，详情面板**顶部**就有「复制 AI 提示词」按钮。按下去得到一份 1100 字左右的一段话，直接粘给……
```

### 改后（README.md L78）

```markdown
选中一个方案，详情面板**顶部**就有「复制 AI 提示词」按钮。按下去得到一份 1632–1920 字的一段话（30 案实测：中位 1822 字），直接粘给……
```

### 实测（`buildStylePrompt(id)` 真跑 30 案，默认参数 = 用户点按钮的实况）

| 时刻 | min | 中位 | max | 1100±110 命中 |
| --- | --- | --- | --- | --- |
| 我第一次测（prompt-copy.js 5:05 之前） | 1617 | 1807 | 1905 | 0 / 30 |
| 最终（该文件被并发改到 5:17 之后） | **1632** | **1822** | **1920** | 0 / 30 |

写进 README 的是**最终值**。这里没有写「左右」，写的是实测区间。

---

## 4. 腐化 4：`check-anchors.mjs` 打印 undefined

**先跑确认（修前，原文输出）**：

```
锚点完整性：扫了 30 案
  动态拼接的（需人工确认，不算死锚点）：1 处
     undefined  href="#dg-' + keys[i] + '"
  ✓ 无死锚点
```

**确认存在**。根因：`dead` 与 `dynamic` 两个数组的元素形状不一致——`dead.push({dir, three, href})` 有 `three`，`dynamic.push({dir, href})` 没有；而打印动态项的那条循环照着死锚点的模板读 `x.three`，于是打出 `undefined`。实际那是 **S05** 的 `href="#dg-' + keys[i] + '"`。

**修法**：让两个 push 形状一致（`dynamic` 也带上 `three`），并在注释里记下这个缺陷。顺带把注释里一处硬编码的 `L44` 改成"下面那条循环"——行号本身就是会漂的引用，写进注释等于埋第二颗雷。

**修后（原文输出）**：

```
锚点完整性：扫了 30 案
  动态拼接的（需人工确认，不算死锚点）：1 处
     S05  href="#dg-' + keys[i] + '"
  ✓ 无死锚点
```

`--quiet` 下正常 exit 0。

---

## 5. 新增 `prototypes/_build/check-docs.mjs`

### 5.1 为什么需要它

`check-stale.mjs` 查"产物比源文件旧"，`check-anchors.mjs` 查"站内锚点有没有对应 id"。**两个都不看 README**。所以 README 里「9 个方案」「1100 字左右」「已知未修」能一路腐化而没有任何闸门会响——它们既不是死链、也不是陈旧产物，它们只是**不再是事实**。

### 5.2 检查项（12 条断言）

| code | 检查什么 | 判据来源 |
| --- | --- | --- |
| `ids/exist` | 文档里每个 `S\d{2}` 都真实存在 | `data.js` 的 30 个 id |
| `nums/schemes` | 方案/原型总数 | `data.js.length` = 30 |
| `nums/gate` | 「26 个闸门 FAIL=0」这类达标数 | `data.js[].gate.fail` 汇总 |
| `nums/warn-axes` | hard / degrades / 并集 三个数与名单 | `prompts.js` 的 `hardIds` 与 `capacity.degrades` |
| `nums/prompt-len` | 提示词字数区间与中位数 | **真跑** `prompt-copy.js` 的 `buildStylePrompt()` 30 案 |
| `nums/scenes` | 场景词 44 / 16 / 28 / 29 | `prompts.js` 的 `sceneIndex` 与 `unsupported` |
| `status/fixed-claims` | 已修的事不许再写「已知未修/known, unfixed」 | 邻行是否在讲 layout/抽取 |
| `status/layout-fix` | 文档称已修，代码是否真修（防回退） | `data.js[].layout` 非空率 |
| `i18n/facts` | 中英两版同一事实是否一致 | 两份 README 对读 |
| `paths/exist` | 文档提到的仓库路径是否存在 | 文件系统 |
| `paths/templates` | `templates/M01` 这类模板编号 | `templates/` 目录 |
| `regression/banned` | 6 条**已经腐化过**的原话不许写回 | 硬编码黑名单 |

### 5.3 设计上的三个关键决定

1. **数据源用 `vm` 真装 `data.js` / `prompts.js`**，和浏览器同一条装载路径；提示词长度**真跑 `buildStylePrompt()`** 而不是读某个现成字段——README 承诺的是「按下去得到」的长度，那只有函数知道。
2. **三档判据而不是逐字相等**：`prompt-copy.js` 是活文件（本轮就被并发改过），所以精确相等 → PASS，偏差 ≤3% → WARN，>3% → FAIL。这不是放水：15 字漂移不该红，差 700 字（1100 vs 1807 是 39%）必须红。
3. **`--root` 只换文档读取位置，数据源永远读真仓库**。所以自测副本是被真实数据判定的，不会因为副本里没有 `data.js` 而变成一片假绿。

### 5.4 自测（写进脚本注释，且是可执行的一条命令）

```bash
node prototypes/_build/check-docs.mjs --selftest
```

它把当前 README 复制到临时目录，**逐条把三处已知腐化改回原位**，再对自己跑一遍，断言恰好是那几条断言红了且 exit=1：

```
自测：把三处已修好的腐化改回原位（23073 → 22161 字节），再跑本脚本

  ✗ nums/warn-axes        ...出现了 hard 旧名单的成分（S03/S05/S10/S14/S20 里至少 3 个）...
  ✗ nums/prompt-len       ...「1100 字左右」是模糊表述（实测 min 1632 / median 1822 / max 1920）
  ✗ status/fixed-claims   已修的事项仍被写成「未修」：342: - ❌ **选型台对三个案子抽少了段**...
  ✗ i18n/facts            ...提示词区间：只有一份写了区间；警告并集：中文没写 14，英文写 14
  ✗ regression/banned     ...「1100 字左右」...「9 个方案的机制」...hard 旧名单（9 案）...「已知未修」...

README.md: 5 FAIL / 0 WARN / 7 PASS

  ✓ 自测通过：三处腐化全部被对应断言抓出，退出码 1
```

**为什么用 `--selftest` 而不是把步骤写在注释里让人手敲**：手敲的自测会腐烂——README 一改，注释里的 grep 就找不着目标了。写成断言后，README 变了它会当场说"自测需要跟着更新"（exit 2），而不是安静地变成永远绿的假测试。这一点在开发中真的触发过一次（我的第一条 `REVERTS` 正则写错了，它就 exit 2 报错，没有假装通过）。

### 5.5 开发中新检查器抓出的、属于我自己的两个 bug（诚实记录）

| 现象 | 根因 | 处理 |
| --- | --- | --- |
| 把 `26 prototypes pass the gate` 判成"总数写错" | `26` 是**达标数**不是总数，同句后缀 `pass` 没排除 | 加 `^\s*(pass|达标)` 前瞻放过 |
| 中位数报了两次，其中一次是 `layout … 中位 413` | 正则 `(?:中位\|median)\s*(\d+)` 没要求跟「字」 | 要求必须跟 `字`/`characters` |
| 英文区间读成 `NaN–NaN` | `Number('1,617')` 是 `NaN`，千分位没剥 | 统一走 `num()` helper |
| `templates/M01`、`_specs/Sxx.md` 被判路径缺失 | 前者是合法缩写，后者是占位符不是路径 | 缩写按目录前缀匹配放过；占位符跳过 |

这四条都是"检查器自己说谎"，比漏报更危险——所以每一条都在代码注释里留了原因。

---

## 6. 接进流程（任务 4）

仓库**没有统一入口**（无 `package.json` / `Makefile` / CI 配置），检查器原先只被文档提及。处理：

1. `README.md` 的「工具链」表加一行，把 `check-docs.mjs` 与 `check-stale.mjs`、`check-anchors.mjs` 并列（三者都是"页面本身看不出问题"的检查，FAIL 时 exit 1）。
2. 「渲染与验收」的命令块加两条：
   ```bash
   node prototypes/_build/check-docs.mjs
   node prototypes/_build/check-docs.mjs --selftest
   ```
3. 英文版同改（`README-EN.md` 表格 + 命令块）。

---

## 7. 两档校验器原文输出

### 7.1 README 校验器（`_readme-skill-fetch/write-attractive-readme-main/scripts/check-readme.mjs`）

**改前基线**：`README.md: 0 FAIL / 0 WARN / 24 PASS`；`README-EN.md: 0 FAIL / 2 WARN / 22 PASS`
**改后**：`README.md: 0 FAIL / 0 WARN / 24 PASS`；`README-EN.md: 0 FAIL / 2 WARN / 22 PASS`

→ **FAIL=0，WARN 数未增加**（英文那 2 条 WARN 改前就存在：`section/机制` 缺节、`voice/not-but` 0 处，本次未触碰）。

**改后 README.md 输出**：

```
PASS hero/centered            <div align="center"> 需在文件前 20 行内
PASS hero/hook-len            钩子 21 字：「30 个能跑的风格，不是 30 张配色图。」
PASS hero/badges              badge 4 个
PASS hero/div-balance         <div> 2 开 / 2 闭
PASS hero/value               ok
PASS hero/nav                 ok
PASS links/anchors            全部 32 个页内锚点可解析
PASS section/效果               ok
PASS section/安装               ok
PASS section/机制               ok
PASS section/License          ok
PASS section/honesty          局限节 + 20 处负面结论
PASS order/effect-first       ok
PASS voice/hollow-adjectives  零空泛形容词
PASS evidence/reproducible    有可复算命令块
PASS evidence/assets          无需外部资产的证据
PASS privacy/paths            无本机路径泄漏
PASS lint/placeholders        无占位残留
PASS voice/dash               破折号补刀 58 处
PASS voice/not-but            「不是 X，是 Y」句式 7 处
PASS voice/bold               独立加粗断言行 30 处
PASS voice/headings           标题无泛化命名
PASS section/english          有 English 节/双语切换行
PASS lint/length              486 行

README.md: 0 FAIL / 0 WARN / 24 PASS
```

**改后 README-EN.md 输出**：

```
WARN section/机制               缺「机制」节。
WARN voice/not-but            「不是 X，是 Y」句式 0 处（22 处 / 10 样本，是定位差异的主力句式）
PASS hero/centered            <div align="center"> 需在文件前 20 行内
PASS hero/hook-len            钩子 34 字："30 runnable styles, not mockups."
PASS hero/badges              badge 4 个
PASS hero/div-balance         <div> 2 开 / 2 闭
PASS hero/value               ok
PASS hero/nav                 ok
PASS links/anchors            全部 35 个页内锚点可解析
PASS section/效果               ok
PASS section/安装               ok
PASS section/License          ok
PASS section/honesty          局限节 + 13 处负面结论
PASS order/effect-first       ok
PASS voice/hollow-adjectives  零空泛形容词
PASS evidence/reproducible    未做需复算的断言
PASS evidence/assets          无需外部资产的证据
PASS privacy/paths            无本机路径泄漏
PASS lint/placeholders        无占位残留
PASS voice/dash               破折号补刀 46 处
PASS voice/bold               独立加粗断言行 32 处
PASS voice/headings           标题无泛化命名
PASS section/english          有 English 节/双语切换行
PASS lint/length              490 行

README-EN.md: 0 FAIL / 2 WARN / 22 PASS
```

### 7.2 `check-docs.mjs`（当前状态，exit 0）

```
文档一致性：README.md ↔ data.js / prompts.js / prompt-copy.js
  ✓ ids/exist            文档提到的方案编号全部存在（data.js 30 案）
  ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数
  ✓ nums/gate            闸门 FAIL=0 的案数 = 26，与实测一致
  ✓ nums/warn-axes       警告两轴：hard 4 / degrades 13 / 并集 14，文档口径一致
  ✓ nums/prompt-len      提示词长度 = 1632–1920，中位 1822，文档一致
  ✓ nums/scenes          场景词 44 / 直连 16 / 近似 28 / 标为没有 29，文档一致
  ✓ status/fixed-claims  没有把已修项写成未修
  ✓ status/layout-fix    layout 抽取 30/30 有值，S12/S15/S19 = 549/640/420 字
  ✓ i18n/facts           中英两版的关键事实一致（方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集）
  ✓ paths/exist          文档里 15 条仓库路径全部存在
  ✓ paths/templates      文档提到的模板编号都存在
  ✓ regression/banned    6 条已腐化原话均未回归

README.md: 0 FAIL / 0 WARN / 12 PASS
```

### 7.3 `check-anchors.mjs`（修后，exit 0）

```
锚点完整性：扫了 30 案
  动态拼接的（需人工确认，不算死锚点）：1 处
     S05  href="#dg-' + keys[i] + '"
  ✓ 无死锚点
```

---

## 8. 我改了 README 的哪几行、没改哪几行

### 改了的（共 6 处，全部围绕三件事实）

| 文件 | 位置 | 改的是什么 |
| --- | --- | --- |
| README.md | L78 | 腐化 3：`1100 字左右` → `1632–1920 字（中位 1822）` |
| README.md | L103–108 | 腐化 2：`9 个方案` → 两轴 4/13/并集 14 |
| README.md | L170 | 工具链表加一行 `check-docs.mjs`（任务 4 要求） |
| README.md | L299–303 | 命令块加 `check-docs.mjs` + `--selftest`（任务 4 要求） |
| README.md | L352–355 | 腐化 1：`已知未修` → 已修 + 根因 + 实测值 |
| README-EN.md | 对应 6 处 | 同改，按英文版语域重写（非直译） |

### 刻意**没**改的

- 没动「9 条实测结论」里的其它 8 条（同质、题材缺口、`#888888`、`measure` 假阳性、`file://`、13/30 KB、不是设计系统等）。
- 没动排版、标题、emoji、破折号密度等风格装置——`voice/dash` 从 54 → 58 是因为新写了两段，不是刻意加。
- 没改任何数字口径的既有附注（如「12 严 / 22 宽」那段的多口径说明）。
- 没动 `deliverables/`、`prototypes/_specs/`、`_CONTRACT.md`。
- **没动 `prototypes/_selection/` 下任何文件**（3 个 Agent 在改，我只读）。
- 没 git commit。

### 英文版的语域处理（避免中文硬译）

- 不写 `Nine schemes have mechanisms bolted…`，改成 `**14 of the 30 schemes** carry a \`⚠\` right next to the button`——沿用英文版已有的 `bold + 数字` 断言句法。
- 两轴用 `The two criteria are kept apart` / `The axes are orthogonal and overlap on only 3 schemes`，与英文版既有的 `⚠️` 提示段语气一致。
- 腐化 1 用英文版已有的 `—— fixed, and the root cause stays documented here` 句式（呼应它别处 `This line used to say…` 的写法），并保留 `Kept rather than deleted, because this repository's style is to leave its mistakes where they happened.`

---

## 9. 遗留 / 给 lead 的提醒

1. **`prompt-copy.js` 正在被并发修改**（本轮实测 5:05 → 5:17 三次变化）。README 里的 1632–1920 / 1822 是**最后一次实测值**。若那几个 Agent 继续改，请重跑 `node prototypes/_build/check-docs.mjs`：
   - 偏差 ≤3% → WARN（提醒更新，不阻塞）
   - 偏差 >3% → FAIL（必须更新）
2. `collect-schemes.mjs` 与 `data.js` 目前仍是**未提交改动**（不是我的改动）。README 腐化 1 描述的是工作区状态，若这两个文件被回退，`status/layout-fix` 会立刻 FAIL——这正是它该做的事。
3. 仓库无统一入口，"接进流程"只落到 README 命令列表。若后续加 `package.json`，建议 scripts 里一行 `"check:docs": "node prototypes/_build/check-docs.mjs"`。
