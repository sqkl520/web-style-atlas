# 锐评 · P2「`data.js` 的 `fonts` → `fontsSpec`」验收

2026-10-31 · 验收人：锐评 Agent（独立审查，不采信交付方自述）
被验对象：`deliverables/73-exec/LEAD-P2-fonts-rename.md`
验证脚本：`deliverables/73-verify/verify-p2-fonts.mjs`
开工 HEAD：`0d3d499`

---

## 1. 结论

### **有条件通过**

改名本身**做对了**，而且是这个仓库里少见的高质量改动：纯符号搬家、零字节损失、生成器可复现、
`|| r.fonts` 兜底在今天的真实数据上确实只是死代码而非隐患。我尝试从五个角度打它，**四条都没打穿**。

但交付方在**两处注释里写了一个错了 2 倍的数字**，并且把它当成自己的核心论据用了两次。
这个仓库的检查器（`check-docs`）明令「注释里的数字必须当场量出来」，所以这不是小事，
是**本次改动自己在自己最擅长的那件事上犯的错**。

| 判定项 | 结果 |
|---|---|
| 改名是纯替换、无内容损失 | ✅ 通过（逐字节验证） |
| 生成器可复现 | ✅ 通过（两次运行 hash 全同） |
| 搜索未失效 | ✅ 通过（独立用真实代码求值 30/30） |
| 无漏改的消费者 | ✅ 通过（全库 454 个 tracked 文件扫描） |
| 回退兜底是否掩盖缺陷 | ⚠️ 部分（结论与交付方不同，见 §3） |
| 注释里的数字 | ❌ **失败**（775 应为 373，错 2.08 倍） |
| 改动面自述「4 处」 | ❌ **不准确**（实际 9 个 tracked 文件） |

**必修项（2 条）**：

- **M1** — 删掉或改正「约 775 字」。`collect-schemes.mjs:354`、`app.js:236` 两处都写错了。
  实测 30 案 `fontsSpec` 长度 avg **373.1**、min 228、max **514**、sum 11,192（中位 363）。
  **775 超过了本仓库最长的字段长度**，它不是"约"的问题，是错了一个数量级的量级判断。
- **M2** — 交付文档 §2 标题「改动面实测：4 处」与事实不符。`git status` 显示 **9 个 tracked 文件**被改，
  其中 5 个与改名无关（见 §3 F2）。必须写清楚哪些是改名、哪些是重渲染顺带产物。

**建议项（3 条，不阻塞）**：见 §3 的 S1–S3。

---

## 2. 逐条验收证据

### 2.1 自跑交付方验证脚本（6 项）

`node deliverables/73-verify/verify-p2-fonts.mjs` 输出，与声称**逐条吻合**：

| # | 声称 | 我跑出来的 | 一致 |
|---|---|---|---|
| 1 | `app.js` 里 3 处 `r.fonts`，全是回退或注释 | 3 处：`:235` 注释、`:239` 回退、`:1357` 回退 | ✅ |
| 2 | 搜索索引含 `fontsSpec` | `:239` 含 `r.fontsSpec \|\| r.fonts` | ✅ |
| 3 | 字段展示读 `fontsSpec` | `:1357` `field('字体策略', r.fontsSpec \|\| r.fonts)` | ✅ |
| 4 | 字体名反查 30 命中 / 0 未命中 | 命中 30，未命中 0 | ✅ |
| 5 | 字符总数 11,192 / 11,192，差 0 | 11,192 / 11,192，差 0 | ✅ |
| 6 | 逐案内容一致 30/30 | 30/30 | ✅ |

**但脚本本身有两个弱点**（不改结论，改"证据强度"）：

- **弱点 A**：第 4 项自己**重写了一遍** `hay` 字段表（`:38-40`），而不是调用 `app.js` 的真实代码。
  如果 `app.js:239` 的字段表和脚本里的不一致（比如 `app.js` 里漏了 `fontsSpec` 而脚本里有），
  这个测试**照样全绿**。我用真代码重测了（§2.5），结论相同，所以这次是运气好不是方法好。
- **弱点 B**：第 5 项用 `git show HEAD:...` 起子进程，包在 `import(...).then()` 里，
  **脚本会在 Promise 落地前退出**的可能性存在。实测能打印，说明 Node 的 microtask 顺序救了它，
  但这是个竞态——换 Node 版本或加一行同步代码就会静默截断。建议改成 `await`。

### 2.2 我自己重跑生成器（可复现性）

```
BEFORE 运行 : B344281BD5BB632046D0B03BEF9C7F8FAA11210DD7EF0CBF4A2E801ADCAE2385
AFTER 运行1 : B344281BD5BB632046D0B03BEF9C7F8FAA11210DD7EF0CBF4A2E801ADCAE2385
AFTER 运行2 : B344281BD5BB632046D0B03BEF9C7F8FAA11210DD7EF0CBF4A2E801ADCAE2385
⇒ REPRODUCIBLE: YES
```

**`data.js` 内容不变**：hash 与运行前**逐位相同**。这条比"差 0 字符"硬得多——
那只是长度相同，这是整个文件字节相同。

生成器成功退出（exit 0），末行 `已写 prototypes/_selection/data.js（155.0 KB）`。

**「缺 字体策略」那一行**（必须用 `--check` 才打印，直接跑是写盘模式）：

```
$ node prototypes/_build/collect-schemes.mjs --check
缺 一句话视觉定义：无
缺 美学家族：      无
缺 字体策略：      无          ← 是「无」，不是案号列表 ⇒ :732 那处改名改对了
缺 布局与网格：    无
…
```

我还做了**负控**证明这行不是摆设——把 `:732` 退回 `r.fonts` 再跑：

```
改后（r.fontsSpec）: 缺 字体策略：      无
改前（r.fonts）    : 缺 字体策略：      S01 S02 S03 … S30   ← 30 个案号全列
```

⇒ 这处改名是**真的在起作用**，不是装饰。跑完已还原（`git diff --stat` 仍是 15 insertions / 2 deletions）。

### 2.3 攻击「改名是安全的」：全库消费者扫描

扫了 **454 个 tracked 文件的 `.mjs/.js/.html/.json/.md`**，找所有按字段名读 `fonts` 的地方
（`.fonts`、`['fonts']`、`fonts:`、解构）。

`prototypes/` + `templates/` 内命中 38 条，**逐条归类后没有一条是 data.js 的漏网消费者**：

| 命中位置 | 是什么 | 与 data.js 的关系 |
|---|---|---|
| `S13/_fillmap.mjs:74` | `document.fonts.ready` | 浏览器 API，无关 |
| `_build/shot.mjs`（9 处） | `document.fonts.status` 探针 | 浏览器 API，无关 |
| `_build/backfill-credits.mjs:41` | `o.fonts` 是 **credits.json** 的字段 | 另一份数据，无关 |
| `_prompts/build-prompts.mjs:303` | `fonts: d.fonts`（prompts 链） | 第 2 条链，无关 |
| `_prompts/clean-dna.mjs:1397` | 产出 `dna.fonts` 对象 | 第 2 条链，无关 |
| `_selection/prompt-copy.js:176-226` | `d.fonts` 全是 `dna.fonts` | 第 2 条链，无关 |
| `_selection/app.js:235/239/1357` | 已改（回退 + 注释） | ✅ 已覆盖 |

**专门查了题目点名的三个目录**：

- **`prototypes/_selection/` 下除 `app.js` 还有没有别的消费者**：有 3 个文件碰 `window.SCHEMES` ——
  `index.html:362`（`<script src="data.js">`）、`wizard.html:102`（同）、`wizard.js:13`
  （`(window.SCHEMES||[]).filter(r => r.gate)`，**只读 `gate`，不碰 `fonts`**）、
  `prompt-copy.js`（读 `SCHEMES` 的 `tone` 与全字符串字段，见下）。**没有任何一处读 `r.fonts`**。
- **`templates/`**：三个模板零 JS 数据依赖（自包含、双击即跑），`grep fonts` 只命中 README 散文。**无关**。
- **`scripts/`**：**不存在这个目录**。
- **`tools/`**：`tools/taste-skill/` 是第三方 submodule 性质的字体/技能库，**不读 `data.js`**。

**一条需要单独说明的**：`prompt-copy.js:441-449` 会 `for (var key in sc)` **遍历 `window.SCHEMES`
该案的全部字符串字段**拼 `blob`（用于"空位机制"检测）。它**不按字段名读**，所以改名对它透明——
但它意味着这个仓库里存在"泛化消费 data.js"的代码。改名不会破坏它，这点交付方没提，我确认安全。

⇒ **静默失效：0 处**。这是我最想打穿的一条，没打穿。

### 2.4 攻击「死代码回退是必要的」

**先确认化石是真的**（交付方的核心论据）：

```
30 案的 dna.fonts 形状分布: {"object":30}
有 .length 属性的案数: 0（数组才为 30）
⇒ prompt-copy.js:180 的数组分支永远走不到（死代码）
```

✅ 化石成立。交付方说"两条链都不产生数组"，实测准确。

**但"这个中间态在真实工作流里存在吗"——交付方的理由站不住：**

- 生成器**不是边写边读**：`collect-schemes.mjs:713-714` 先在进程内拼完整串，
  然后**一次** `writeFileSync` 落盘。没有临时文件 + rename，也没有流式写。
  ⇒ **不存在"写一半被读到"的竞态**。
- 中间态实际是**仓库状态**：生成器与 `data.js` 是两个 tracked 文件，git 不保证同步，
  所以"改了生成器、没重跑 `data.js`"可以被 commit。这个中间态**确实存在**。
- 但交付方把它描述成"打开页面就静默失效"，**夸大了**：`data.js` 是生成物，
  中间态下页面显示的是**旧数据**（有 `fonts`），回退分支让它照常工作——
  也就是说，兜底让"生成器已改名"和"data.js 未重生成"这两件事**无法区分**。

**「会不会掩盖真实空值问题」——我的结论比交付方更硬，且部分反驳他：**

实测三个值：

```
fontsSpec=""        → 表达式得到 undefined
fontsSpec=undefined → 表达式得到 undefined
fontsSpec=null      → 表达式得到 undefined
```

`field()` 在 `app.js:1144` 是 `if (!val) return '';` —— 空串与 `undefined` **走同一个分支，输出完全相同**。
所以在 `:1357` 这处，`|| r.fonts` **在可观测行为上是恒等变换**：加不加，UI 一个字都不差。

⇒ **回答题目第 4 问**：

- 它**不是**"用回退掩盖缺陷"——因为空值和缺失在该处本来就无法区分，兜底没有新增任何掩盖能力。
- 但它**也没有交付方声称的价值**：交付方说它"把静默失效变成仍能工作"。实测在今天的
  `data.js` 上，去掉兜底 `hay` **一个字符都不变**（`去掉兜底后 hay 发生变化的案: 0`）。
  它只在"data.js 退回旧键名"时救场（实测救 30/30），而那个状态**今天不存在、且没有任何闸门会撞上它**。
- **真正的问题不是兜底，是没有闸门**。我做了负向测试（§2.6）：把 `data.js` 的 30 处
  `fontsSpec` 全退回 `fonts`（模拟"改名没做完"），**六个检查器全绿、exit 全 0**。
  也就是说：**这个改名今天完全没有测试保护**。兜底不是保护，是让缺口更难被发现。

### 2.5 验证搜索真的没坏（不重写字段表）

交付方脚本的弱点 A 是"自己重写了一遍 hay"。我改用**从 `app.js` 源码里原样抠出那行表达式**
再 `new Function` 求值，测的是真实代码：

```js
// 从 app.js 抠出的原文（5 行）
var hay = [r.id, r.cn, r.en, r.family, r.fontsSpec || r.fonts, r.def, r.tone, r.structure,
r.errorCode, r.threshold, r.layout, r.visuals, r.quirk,
r.scenesYes,
ax.ground, ax.band, ax.load, ax.loud,
(r.palette || []).join(' ')].join(' ').toLowerCase();
```

结果：

```
fontsSpec 整串进入 hay:            30/30     ← 逐字符全串匹配，不是"第一个字体名"
去掉兜底后 hay 发生变化的案:        0        ← 兜底今天纯死代码
旧键名数据（只有 fonts）仍能索引:   30/30     ← 兜底确实兜住了
同一旧数据、去掉兜底后能索引:       0/30     ← 兜底价值 = 多救 30 案
```

**判据用的是"整串包含"**（比交付方的"第一个字体名"强得多：任何一个字符丢了都会失败）。

我还额外构造了**唯一片段反查**（取 24 字窗口，要求它在该案其他字段里 0 次出现、
在全批其他案 0 次出现，排除"被别的字段兜住"的假阳性）：**唯一片段命中 30/30**。
这比交付方的字体名测试更严——字体名可能出现在 `family` 字段里，
而唯一片段不可能。⇒ **搜索链路确实完好，`fontsSpec` 真的进了索引。**

**顺便：我试图证伪交付方第 4 项，失败了，并如实记录。** 我把 `hay` 里的 `fontsSpec`
换成空串做负控，结果从 30 掉到 **0**——说明那条测试**有区分力**，不是自证。

### 2.6 检查 `data.js` 的 git diff

`git diff --numstat` → **31 insertions / 31 deletions**，与题目预期一致。逐行归类：

```
删除行 31 / 新增行 31
删除行=("fonts":)        30
新增行=("fontsSpec":)    30
新增行=("at":)           1      ← 非改名
删除行中 ("at":)         1      ← 非改名
30 对「去键名后逐字符相同」: 30 / 30
```

**30 对「去掉键名后逐字符完全相同」= 这是最硬的"纯改名"证明**，比"字符总数差 0"强：
总数相同可能是"这里少 1 字、那里多 1 字"互相抵消，逐字符相同不是。

**但有一条不是改名**，交付方**没有报告**：

```
@@ -645 +645 @@      ← S08 案
-   "at": "2026-10-23T19:03:46.082Z",
+   "at": "2026-10-30T18:26:37.942Z",
```

这是 `S08.gate.at`（闸门时间戳）。我追到了源头：

- `data.js` 的 `S08.gate.at` = `2026-10-30T18:26:37.942Z`
- `S08/.inspect/report.json` 的 `at` = **同一个值**
- 而这份 `report.json` **本次也被改了**（`M prototypes/S08-amber-overprint-lightbox/.inspect/report.json`）

⇒ 这是**重渲染 S08 的副作用**，不是改名造成的，但它**混进了 `data.js` 的 diff**。
更麻烦的是同一个 report 里 `motion.elements` 从 `[43,43,42]` 变成了 `[42,42,42]`——
**少了 1 个动效元素**，这是渲染结果的变化，与 P2 毫无关系。

⇒ 交付方说"`data.js` 现在只有 `fontsSpec`，`fonts` 归零"——**这句是真的**（我验了 `'fonts' in r` → 0/30），
但"纯字段名替换"这个说法**不严格**：31/31 行里有 1 对是时间戳。

### 2.7 判断这项工作的价值

**交付方的收益论据有一半是错的。**

他说"读代码的人会以为两条链的 `fonts` 是同一个东西"。这个误读的**真实发生地**是
`prompt-copy.js:176-183`——但它读的是 `dna.fonts`（prompts 链），**跟 `data.js` 一个字节的关系都没有**。
改名**不会让那段死代码消失**（交付方 §5 自己也承认了）。

所以改名的实际收益只剩一条：**下一个读 `data.js` 的人不会把它当对象**。
这是真实的、但**很薄**的收益。

**有没有更小的做法？有，而且更便宜：**

1. **只加注释，不改名**：在 `collect-schemes.mjs:351` 加 3 行说明"这是字符串，与 prompts 的 `dna.fonts`
   对象不同名不同形"。成本 1 处、0 风险、0 兼容性破坏。
2. **删 `prompt-copy.js:180-183` 的死分支**：这才是**唯一真实发生过的误读**的现场。
   5 行代码，收益比改名高——**因为改名治的是"假想的误读"，删分支治的是"已经写错的那段代码"**。

**我的判断**：改名**值**，但**排序错了**。先删死分支（收益更高、成本更低），再改名（锦上添花）。
单独做改名并把 14 行注释 + 2 处兜底当卖点，投入产出比偏薄。
不过既然已经做完且验证为零损失，**不值得回退**——回退的成本（重跑 30 案 + 再验一遍）大于保留。

### 2.8 新风险：外部兼容性

**内部**：无。§2.3 已证明 tracked 代码里零漏网。

**外部**（用户的脚本、文档示例）：checked。

| 文件 | 有没有示例代码读 `r.fonts` |
|---|---|
| `README.md` | ❌ 无。全文 `fonts` 只出现在 `_fonts/` 目录、`fetch-fonts.mjs`、许可表里，**没有 `data.js` 字段示例** |
| `README-EN.md` | ❌ 无。同上 |
| `prototypes/_CONTRACT.md` | ❌ 无。只讲 `document.fonts`、`fonts.googleapis.com`、`_fonts/` |

⇒ **文档零破坏**。`data.js` 虽然挂在 `window.SCHEMES` 上、被 `index.html` 与 `wizard.html` 引入，
但**没有任何公开文档教用户读这个字段**，所以改名不构成对外契约破坏。

**唯一残留风险**：`deliverables/` 下有 6 个历史报告把 `data.js` 的 `fonts` 当字段名写进了正文
（`65-audit/field-matrix.md:223`、`65-plan/PLAN-field-plumbing.md:309`、`71-plan/FACTS-matrix.md:409-410` 等）。
这些是**历史档案**，不该改；但下一个照着它们查 `r.fonts` 的人会查不到。建议交付方在
`71-plan/FACTS-matrix.md:440` 那条"改名决定"旁边补一句"已于 2026-10-31 落地"，把账结掉。

---

## 3. 发现的问题（按严重度）

### M1 — 注释里的核心数字错了 2.08 倍【必修】

| 文件:行 | 现文 | 实测 |
|---|---|---|
| `prototypes/_build/collect-schemes.mjs:354` | "一个**约 775 字**的字符串" | avg **373.1**，min 228，max 514，中位 363 |
| `prototypes/_selection/app.js:236` | "（**约 775 字**的字符串）" | 同上 |

775 甚至**超过本仓库最长的字段读数**（`fontsSpec` max = 514）。它把"约 370 字"夸大成了 775。

**为什么必须修**：这是交付方论证"改名有必要"的**核心量级依据**（"775 字 vs 5 个键的对象"听起来差得很远）。
数字错 2 倍，论据的可信度就跟着打折。而且本仓库有 `check-docs` 专门盯这类问题
（README 里的数字必须等于 `data.js` 实测值），注释里写错数字是同一个病的变种。

**修法**：改成"约 373 字（228–514）"，或干脆删掉数字只留性质描述。

### M2 — "改动面实测：4 处"与实际不符【必修】

`git status --porcelain -uno` 实测在我开工时是 **9 个 tracked 文件**（收尾漂移到 11 个，多出的 2 个
是并发 Agent 的，见 §5）：

```
M prototypes/S08-amber-overprint-lightbox/.inspect/desktop-page-01.jpg
M prototypes/S08-amber-overprint-lightbox/.inspect/desktop-page-02.jpg
M prototypes/S08-amber-overprint-lightbox/.inspect/report.json
M prototypes/_build/collect-schemes.mjs      ← 改名（2 处）
M prototypes/_selection/.inspect/report.json
M prototypes/_selection/.inspect/tablet-page-01.jpg
M prototypes/_selection/app.js               ← 改名（2 处）
M prototypes/_selection/data.js              ← 改名（31/31 行，含 1 行时间戳）
M prototypes/_selection/self-gate.js         ← 重渲染时间戳
```

其中**只有 3 个文件是改名**，另外 6 个是重渲染副作用。交付方表格里的"4 处"数的是
**代码改动点**，但在"改动面"这个标题下会让 reviewer 以为只有 4 个文件受影响。

**修法**：拆成两张表——"改名改动点（4 处）"与"重渲染顺带的 tracked 改动（6 个文件）"。

### S1 — `data.js` 混进了 S08 的时间戳与动效计数变化【建议报告】

`data.js:645` 的 `S08.gate.at` 从 `2026-10-23` 变成 `2026-10-30`，源头是
`S08/.inspect/report.json` 被重渲染（同一份 report 里 `motion.elements` 由 `[43,43,42]` → `[42,42,42]`，
**少了 1 个动效元素**）。这不是 P2 造成的，但它混在 `data.js` 的 diff 里，会让"纯改名"这个说法失守。
**建议**：在交付文档里显式声明这一条，否则下一个 reviewer 会以为是改名弄坏了 S08。

### S2 — 改名零测试保护（我实测六个闸门全绿）【建议补闸门】

负向测试：把 `data.js` 的 30 处 `fontsSpec` 全退回 `fonts`（模拟"改名没做完"），

```
绿 check-prompts.mjs  exit=0
绿 check-twolines.mjs exit=0
绿 check-contract.mjs exit=0
绿 check-docs.mjs     exit=0
绿 check-anchors.mjs  exit=0
绿 check-stale.mjs    exit=0
```

⇒ **六个检查器一个都没红**。如果哪天有人把生成器的 `fontsSpec` 改回 `fonts` 而忘了改 `app.js`
（或反过来），**没有任何闸门会发现**。交付方说的"6 个检查器全绿"是真的，但**它证明不了这次改名是对的**——
那六个检查器根本不看这个字段。

**修法**（`73-plan` 自己也算出过这条，`PLAN-four-tasks.md:552`）：在 `check-twolines.mjs` 里加一条
`S1: data.js 的每个 rec 必须有非空 fontsSpec`（该脚本已在读 `SCHEMES`，`:77`）。约 3 行。

### S3 — 回退兜底的真实定位应当写清【建议】

`:239`/`:1357` 的 `|| r.fonts`：
- 今天的真实作用：**0**（去掉兜底 `hay` 逐字符不变，`field()` 输出不变）。
- 唯一作用：让"生成器已改、`data.js` 未重生成"这个**仓库状态**不表现为功能退步。
- 代价：它让"改名没做完"**永远无法被观测到**（S2 的缺口因此更隐蔽）。

交付方说它"把静默失效变成仍能工作"——**方向上对，但少了一句**：它同时把"改名没做完"
这个事实也一起静音了。建议在注释里补这句，或直接删掉兜底并配 S2 的闸门（二者取一，别只做一半）。

### 附：交付方自述与实测的对照表

| 自述 | 实测 | 判定 |
|---|---|---|
| 字符总数 11,192 / 11,192 | ✅ 11,192 / 11,192 | 真 |
| 逐案一致 30/30 | ✅ 30/30 | 真 |
| 字体名反查 30/0 | ✅ 30/0，且负控 30→0 证明有区分力 | 真 |
| `fonts` 归零 0/30 | ✅ `'fonts' in r` = 0/30 | 真 |
| 6 个检查器全绿 | ✅ 全绿 | 真，但不构成证据（S2） |
| 改动 4 处 | ❌ 4 个代码点 / **9 个 tracked 文件** | 不准确（M2） |
| `fonts` 约 775 字 | ❌ 实测 373 | 错（M1） |
| 生成器可复现 | ✅ 两次 hash 全同 | 真（我加验的） |

---

## 4. 如果要回退或重做

**结论：不需要回退。** 改名是零损失的，回退的成本（重跑生成器 + 重渲染 + 再验一遍 6 项）
大于它带来的风险。按下面顺序**只补必修项**即可：

### 第 1 步：修 M1（2 处，5 分钟）

```js
// prototypes/_build/collect-schemes.mjs:354
-     *   · 这里（data.js）    `fonts` = 规格字段 4 的**原文**，一个约 775 字的字符串
+     *   · 这里（data.js）    `fontsSpec` = 规格字段 4 的**原文**，约 373 字（228–514）的字符串
```

```js
// prototypes/_selection/app.js:236
-       * （约 775 字的字符串），与 prompts.js 里的 `dna.fonts` 对象同名不同形状。
+       * （约 373 字 / 228–514，30 案合计 11,192 字），与 prompts.js 里的
+       * `dna.fonts` 对象（5 个键）同名不同形状。
```

顺带：`collect-schemes.mjs:735` 的注释还写着「它只查 def / family / **fonts** / layout / copy 五项」，
**这里的 `fonts` 现在是旧名**。这正是本次改名想消灭的东西，却在自己的注释里留了一个。
`73-plan` 也发现了这条（`PLAN-four-tasks.md:495`）但没落地。改成 `fontsSpec`。

### 第 2 步：修 M2（交付文档，10 分钟）

把 §2「改动面实测：4 处」拆成两张表：

```markdown
### 改名的代码改动点（4 处）
| 文件 | 行 | 改什么 |

### 重渲染顺带的 tracked 改动（6 个文件，与改名无关）
| 文件 | 是什么 |
| S08/.inspect/*.jpg, report.json | 重渲染 S08 |
| _selection/.inspect/*.jpg, report.json | 重渲染选型台 |
| _selection/self-gate.js | 重渲染写入的时间戳 |
| _selection/data.js 的 S08.gate.at 一行 | 上面那份 report 的时间戳被抄进 data.js |
```

### 第 3 步（可选但推荐）：补 S2 的闸门

在 `check-twolines.mjs`（已在 `:77` 读 `SCHEMES`）加：

```js
/* S1: data.js 的 fontsSpec 必须 30/30 非空 —— 改名没做完时这里会红。
 * 2026-10-31 实测：把 data.js 退回旧键名 fonts，六个闸门全绿，没有一条看这个字段。 */
const noSpec = SCHEMES.filter((s) => !String(s.fontsSpec || '').trim()).map((s) => s.id);
add(noSpec.length ? 'FAIL' : 'PASS', '*', 'fontsspec-present',
  noSpec.length ? `fontsSpec 缺失 ${noSpec.length} 案: ${noSpec.join(' ')}` : '字体策略字段 30/30 齐全');
```

补完之后，S3 的兜底就**可以安全删掉**了（有闸门兜着，不需要静默兜底）。
**但别只删兜底不加闸门**——那样只是把"静默可用"换成"静默失败"，更差。

### 如果非要回退（不推荐）

```bash
git checkout -- prototypes/_selection/app.js prototypes/_build/collect-schemes.mjs
node prototypes/_build/collect-schemes.mjs                    # 重生成 data.js（恢复 fonts 键）
node prototypes/_build/render-scheme.mjs _selection           # 重渲染选型台
node deliverables/73-verify/verify-p2-fonts.mjs               # 应报 fontsSpec 0 处
```

注意：**不要** `git checkout -- data.js` 就完事——`data.js` 是生成物，手 checkout 会让它
与生成器脱节，`check-stale` 会在下一次重渲染时抓出来。

---

## 5. 验收过程记录（可复算）

我写的独立探针（都在 `deliverables/73-verify/`，均为未跟踪文件，不影响仓库）：

| 脚本 | 验了什么 |
|---|---|
| `_reviewer-probe.mjs` | 键集合对比、非改名键深比较、独立 hay 模拟、唯一片段反查、兜底三种空值、diff 逐行归类 |
| `_reviewer-probe2.mjs` | fontsSpec 长度分布（打穿 775）、写盘方式（证明无进程内竞态）、`field()` 语义 |
| `_reviewer-negtest.mjs` | 负向：data.js 退回旧键名，跑六个闸门（全绿 ⇒ 零测试保护） |
| `_reviewer-diag-probe.mjs` | 负控：`:732` 退回 `r.fonts`，证明「缺 字体策略」那行的改名真在起作用 |
| `_reviewer-consumers.mjs` | 全库 454 个 tracked 文件的 `.fonts` / `['fonts']` / `fonts:` 扫描与归类 |
| `_reviewer-hay.mjs` | 从 app.js 源码抠出真实 hay 表达式，用 Function 求值（不重写字段表） |
| `_reviewer-falsify.mjs` | 试图证伪交付方第 4 项（失败，如实记录：负控 30→0，测试有区分力） |
| `_reviewer-premises.mjs` | 死代码化石核实（dna.fonts 30/30 对象）、S08 时间戳溯源 |

### 纪律自查

- 临时改动全部已恢复：
  - `data.js` 被负向测试改坏过一次（PowerShell `Set-Content` 的编码坑），
    已从备份恢复，hash **逐位回到** `B344281B…2385`，并再跑一次生成器确认。
  - `collect-schemes.mjs:732` 负控改动已还原（`git diff --stat` 回到 15 insertions / 2 deletions）。
- **我未额外制造任何 tracked 改动**：`git status --porcelain -uno` 的清单与我开工时**完全一致**（见下）。
- 我的所有临时脚本都是 `??` 未跟踪状态，位于 `deliverables/73-verify/`。

### 当前 tracked 改动清单（收尾实测，11 个）

**P2 改名相关（3 个文件 / 4 个代码点）**：

```
M prototypes/_build/collect-schemes.mjs         ← :364 fontsSpec、:732 诊断
M prototypes/_selection/app.js                  ← :239 搜索索引、:1357 字段展示
M prototypes/_selection/data.js                 ← 31/31 行（30 对改名 + 1 对 S08 时间戳）
```

**重渲染顺带（6 个文件，与改名无关）**：

```
M prototypes/S08-amber-overprint-lightbox/.inspect/desktop-page-01.jpg
M prototypes/S08-amber-overprint-lightbox/.inspect/desktop-page-02.jpg
M prototypes/S08-amber-overprint-lightbox/.inspect/report.json
M prototypes/_selection/.inspect/report.json
M prototypes/_selection/.inspect/tablet-page-01.jpg
M prototypes/_selection/self-gate.js            ← 只差一个 "at" 时间戳
```

**并发 Agent 的、与 P2 完全无关的（2 个文件）**：

```
M README-EN.md            ← 改 S13 shadow 那一段（"已清账"叙述），mtime 02:47:23
M prototypes/_CONTRACT.md ← §6 表格 box-shadow 行追加"已清账"说明，mtime 02:47:56
```

> ⚠️ **工作区在验收期间发生过漂移，Lead 提交前必须重新确认清单。**
>
> 开工时（`02:32`）实测是 **9 个** tracked 改动；收尾时（`02:48`）是 **11 个**。
> 多出来的 `README-EN.md`（mtime `02:47:23`）与 `prototypes/_CONTRACT.md`（mtime `02:47:56`）
> **不是我改的**——我全程没有写过这两个文件，且它们的改动内容是 S13 `shadow` 的"已清账"叙述，
> 与 P2 无关。`_CONTRACT.md` 更是一度出现又消失、再出现，说明**至少还有一个并发 Agent
> 在与本次验收重叠的时间窗内改写 shared 工作区**。
>
> 这直接影响我这份验收的**可复算性**：`self-gate.js` 的 `at` 我刚测是 `18:31:04.713Z`，
> 若并发 Agent 再触发一次重渲染，这个值会变；`data.js` 的 hash 也会跟着变。
> **建议 Lead**：① 提交前重新跑一次 `git status --porcelain -uno` 并确认清单；
> ② 若 `data.js` 的 hash 不再是 `B344281B…2385`，说明它被重写过，需重跑
> `node deliverables/73-verify/verify-p2-fonts.mjs` 复核 6 项；
> ③ 把 `README-EN.md` / `_CONTRACT.md` 的改动**单独成一个 commit**，别混进 P2 的改名提交里——
> 否则 diff 里会同时出现字段改名和 S13 清算两件不相干的事。

---

## 6. 一句话总结

**改名做得对、验证做得实、但把"约 373 字"写成了"约 775 字"，还在交付文档里把 9 个文件的改动说成 4 处。**
补这两处即可通过；顺带建议补一条 `fontsSpec` 非空断言——因为我实测把改名整个弄坏，**六个闸门一个都没红**。
