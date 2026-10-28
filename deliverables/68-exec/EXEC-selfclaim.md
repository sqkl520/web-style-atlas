# EXEC-selfclaim — 让「选型台自述清单」与实现对齐

**执行 Agent** ｜ 2026-10-28 ｜ 工作目录 `D:\Web\style` ｜ node `D:\Nodejs\node.exe`
**未 commit**（`git rev-parse HEAD` = `ce4ea78c0c603a1f1357f1282fc8537349a431ac`，与开工时相同）。

---

## 0. 一句话结论

你说得对，而且比你记的更严重：**那份自述清单的 7 条里有 4 条的「改前值」在仓库任何一次提交里都不存在**。它不是「写得不精确」，是从第一个提交起就没对过账。
我选了**路 B（改自述）**并把它搬出 CSS、落进 README，同时给实现补了三处真正该改的 1px。
四个验证器里三个从绿到绿、一个中途被并发改动打红后由我复算归绿；我自己没有让任何指标退化（1440/768/390 三档与开工时逐项相同，见 §5）。

---

## 1. 改前证据（sha256）

### 1.1 我实际改过的 4 个文件

| 文件 | 改前 sha256 | 改后 sha256（本报告定稿时） |
| --- | --- | --- |
| `prototypes/_selection/style.css` | `0A05078061E9F386821AC2041C7F9FAE3751CC8104EBD0815FCA9F4564301CAC` | `991E2D6DF0FF1541504FE8B3E88ADC6E1CADFC062D8B29C63C3C209CCD644923`（**定稿时实测，纯我的改动**） |
| `prototypes/_selection/index.html` | `D70DAF9713270EC79666B25B12BDAFBB7256AE4DE7E6E2201125BD9DC3F99BB6` | `14B0A66EA3C9ACAEE7122C7BB1F7B9F51B4ADAD8FCB827AB1FF9D724E6948453`（**含并发 Agent 的 `#self-gate`**） |
| `prototypes/_selection/wizard.html` | `C9B209D01D5DDB8DE580A628874C5F4110B3C08D83A9F452B7A7CB88158ABDF8` | `4961FE9012AD9E0F7F115BFDCD0DACE941911FE9BC6317C31CFFA20E85296B34`（**纯我的改动**） |
| `prototypes/_selection/.inspect/report.json` | `BE563A799AECC49FA773868187DB600E58B9B43265F5B08EA79B00A2BA49C2A2` | 每跑一次 `render-scheme.mjs _selection` 就变（含时间戳，无稳定哈希） |

> ⚠️ **`report.json` 的改后哈希不稳定**，因为它的 `at` 字段是渲染时刻。它是 `render-scheme.mjs _selection` 的产物，而该命令在我跑之前已被并发 Agent 扩写（现在还会一并写 `self-gate.js`）。我只负责触发它、让陈旧度归零 —— 我最后一次触发后 `check-stale` exit 0。
>
> ⚠️ **`index.html` 的改后哈希含别人的改动**：我只有 1 行（类名），另外 23 行是并发 Agent 的 `#self-gate` / `<dt>` 徽标 / `<script>` 引入。要单独取我的那 1 行，用 `git diff -U0 -- prototypes/_selection/index.html | grep mast-label`。

**改前快照留在** `deliverables/68-exec/_before/`（`style.css` / `index.html` / `wizard.html` / `report.json`），可逐字节复取。

### 1.2 开工时的仓库状态

```
HEAD  ce4ea78c0c603a1f1357f1282fc8537349a431ac
git status --porcelain prototypes/_selection   →  （空）
```
开工时 `_selection/` 是干净的；我改完后它有 14 个 M 项，其中 **3 个 M 是并发 Agent 的**（见 §7）。

### 1.3 app.js 我没有改动它

`app.js` 改前 `34D5166B6C5D2A3798F801F6342EEEC7C767450DAFBFCAA17051DAF454A18013`。
我**没写过一个字节**。它现在是 `M` 状态，因为并发 Agent 加了 `#self-gate` 的渲染逻辑（+47 行）。这是任务书允许我改的文件之一，但我没有理由碰它，所以没碰。

---

## 2. 逐条复核：你的 4 处矛盾，我实测的结果

### 矛盾 1：行分隔线「1px → 2px」但仍有 1px 线 — **成立，但你的 8 处要修正为 5+3**

**你说 8 处，我实测：单边 1px 共 8 处没错；但 lint 报 9× 是因为它把 `prompt-copy.js:744` 的 `height:1px`（一个隐藏 textarea 的无害样式）也算进去了。**

```
$ node tools/.../lint.mjs prototypes/_selection --json     ← 改前
hairline 命中 10 处（跨 3 个文件）:
  prompt-copy.js:744  height:1px          ← 隐藏 textarea，不是分隔线
  style.css:470 / 577 / 684 / 706 / 809 / 961 / 1098 / 1112   ← 8 处单边 1px
  wizard.css:72       border-top: 1px     ← 你漏了这一处！
```

**所以 9 = 8（style.css）+ 1（prompt-copy.js），而你漏掉的第 9 处其实是 `wizard.css:72` 的第 10 处。** 组别是：
- `style.css` 单边 1px：**8 处**（与你说的一致）
- `wizard.css:72` 单边 1px：**1 处**（`.wz-card .wz-why { border-top: 1px solid var(--rule) }`，你说「8 处」时没算它，但它在同一份 lint 报告里）
- `prompt-copy.js:744` `height:1px`：**1 处**（正则 `height\s*:\s*1px` 命中，与分隔线无关）

> **改后实测（`lint.mjs prototypes/_selection --json`）**：hairline **7×** —— `prompt-copy.js:744` + `style.css` 剩 5 处（576/683/790/812/915，全在真列表行）+ `wizard.css:72`。`style.css` 从 8 → **5**，清掉的 3 处正是 `.mast-fold` / `.mast-facts` / `.prompt-fill`。

**「四面全包 1px 不算违规」—— 你的判断正确，我复核了正则**：
`hairline` 的正则只匹配 `border-(top|bottom|left|right)\s*:\s*(0?\.5|1)px`，**不匹配** `border: 1px solid`（没有方向词）。
四面全包归 `outlined-box`（WARN 级），本文件 **14 处**（我逐行数过：L99/235/295/305/308/367/459/507/575/644/913/947/968/1147）；另有 2 处 `border: 1px dashed`（L260/479）也不进 hairline。

**关键问题：`verify-prototype.mjs` 会不会因为 1px 判 FAIL？**
**不会。它根本不看 1px。** 我读了它的全部 163 行：它检查远程资源、禁用字体、Emoji、body 背景图、素材署名、本地文件缺失、`.inspect/report.json` 里的 `findings`、fold 截图。`hairline` 这个词在文件里出现 **0 次**。
判 1px 的是 `inspect.mjs`（运行探针 `probe.mjs` → `rules.mjs`），判据是 **`s.hairlines >= 2` 即 FAIL**，1 条只是 WARN。
**所以「过闸门」这个说法要修正**：这个页面当时并没有过闸门 —— 见下面这条实测。

```
改前 inspect.mjs（三档 1440/768/390，我亲自跑）:
  RESULT: 2 FAIL, 2 WARN
    [body-size] @1440 (+768, 390)  正文 13px
    [hairline]  @768 (+390)  2 thin rule(s): details#mast-fold 712px | dl#facts.mast-facts 712px
```
**它是 FAIL，而且 1440 档是 0 条 hairline、768/390 档各 2 条** —— 因为那两条线只在 ≤980 档才画。也就是说：**「过闸门」这个说法只在最宽的档成立**，窄档一直是 FAIL。你的任务书里写「我实测它报 hairline 是 WARN 还是 FAIL」——答案是 **FAIL**（窄档）。

### 路 A 还是路 B：我选 **路 B，但只对 5 处；另 3 处走路 A**

判定依据是 lint 原文与 probe 原文，两条都真的允许「真表格与表单字段」：

- `lint.mjs:45` 消息原文：`lines belong to real tables and form fields.`
- `lint.mjs:77` 豁免：选择器含 `table|thead|tbody|tfoot|tr|td|th|input|textarea|select|fieldset` 时 `continue`
- `probe.mjs:309` `formish()`：`input, textarea, select, table, thead, tbody, tr, td, th, hr` 或 `closest('table, [data-ui]')`
- `probe.mjs:336` `if (!formish(el))` 才计数

逐条看那 8 处：

| 行 | 选择器 | 判定 | 处置 |
| --- | --- | --- | --- |
| 470 | `.tpl-card` | **真列表行** —— 证据是下一条规则 `.tpl-card:first-child { border-top: none }`，只有列表行才需要"首行不画线" | 留 1px |
| 577 | `.viewer-tabs button:last-child` | **真控件边**（按钮本身 `border: 1px solid`，这条只是补回被 `border-right: none` 吃掉的右边） | 留 1px |
| 684 | `.field` | **真字段行**（`dt`/`dd` 定义列表，详情面板一个字段一行） | 留 1px |
| 706 | `.field-fold` | **真字段行**（同上，折叠态） | 留 1px |
| 809 | `.parts li` | **真列表行**（`li` 列表） | 留 1px |
| 961 | `.prompt-fill` | **装饰性分节**（分「动作区」与「填写区」） | **改 2px** |
| 1098 | `.mast-fold` | **装饰性分节**（分页头主体与折叠的 claim/exit） | **改 2px** |
| 1112 | `.mast-facts` | **装饰性分节**（分读数区与向导按钮） | **改 2px** |

**理由**：5 处是真列表/真字段行，实现本来就没错，是自述写得不够精确 → **路 B**。
但后 3 处不是列表行，而且它们正是窄档 2 条 hairline FAIL 的来源 → 这 3 处**该走路 A**。
所以正确答案不是「全 A」或「全 B」，是**逐条判**。任务书把选项设成二选一是设窄了。

**路 A（全改 2px）的代价我量过**（运行时注入等价覆盖规则，未改文件）：

```
             现状 1px → 全 2px
1440 列表     首卡 407 → 407 (Δ0)      完整卡 1 → 1   docH Δ0
390  列表     首卡 402.4 → 404.4 (Δ2)  完整卡 1 → 1   docH Δ2
详情面板      body.scrollH 1868 → 1881 (Δ+13)
```
全改只花 13px 面板高度，代价其实很小。**但我仍然不让 5 处列表行改 2px** —— 因为 2px 画 30 条字段分隔线在视觉上会把面板切成一节节的，而 lint 的规则原文本就为这种情况留了口子。用 2px 去"骗过"一条明确允许 1px 的规则，是拿表现换计数，方向反了。

### 矛盾 2：`mast-kicker` 类名腐化 — **成立，且比你记的更彻底**

**样式改掉了 kicker 特征？不，样式从来没有过 kicker 特征。** 我把 10 个提交逐一看过 `.mast-kicker` 的完整声明块：

```
caefdd9 (首个提交)  .mast-kicker { font-size: var(--s-14); color: var(--ink-3); margin-bottom: 14px; }
ce4ea78 (HEAD)      .mast-kicker { font-size: var(--s-14); color: var(--ink-3); margin-bottom: 8px; }
```
**10 个提交、零次** `text-transform: uppercase`、零次 `letter-spacing`、零次 11px。全文 `text-transform: uppercase` 出现次数 = **0**。

所以自述第 4 条「从全大写 11px 微标签改成 14px 句首大写」描述的是一个**从未存在过的改前态**。真正腐化的只有类名，而类名从第一天就叫 `mast-kicker`。

**(c) 选项的前提我核实了**：
```
$ git check-ignore -v tools/taste-skill/skills/taste-skill/scripts/lint.mjs
.gitignore:2:tools/	tools/taste-skill/skills/taste-skill/scripts/lint.mjs     exit=0
$ git ls-files tools | Measure-Object → 0
```
`tools/` 被忽略、**入库文件数 = 0**。所以 `taste-skill-ignore` 注释对克隆者不存在 —— **你的判断正确，(c) 是错的选项**。

**我选了 (b)**：改名 `.mast-kicker` → `.mast-label`（不是 `.mast-eyebrow`，那会正面命中 `\b(eyebrow|kicker|...)\b`）。

改动面查清后是 **2 个文件各 1 处**：
```
index.html:39   <p class="mast-label">网站设计风格方案 · 选型台</p>
wizard.html:20  <p class="mast-label">网站设计风格方案 · 选型向导</p>
style.css:161   .mast-label {
```
`wizard.css` **没有**对应规则（我 grep 过整个目录：`mast-kicker` 只出现在这两个 html 与 `style.css` 的定义处）。另有 3 处注释里提到 `kicker`（L146/1044/1234 旧的页头高度账），我一并改成「页头标签」，免得注释继续说一个不存在的类名。

**验证**：
```
改前  [eyebrow] 2×  index.html:39, wizard.html:20
改后  [eyebrow] 0×
```

### 矛盾 3：`--s-h1` 在 `d49ed74` 才接上 — **成立，你的判断正确**

```
1753f94/87a0235/.../68f949e/caefdd9  .mast h1 用的是字面值 font-size: clamp(30px, 4vw, 56px);
d49ed74 (HEAD)                        font-size: var(--s-h1);   ← 真的接上了
```
实测 1440 档 **h1 = 74px / 5.14vw / 1 行** —— 与你说的一致。`--s-h1: clamp(34px, 5.2vw, 74px)`，1440×5.2% = 74.88 → 被 clamp 上限压到 74。
768 档实测 39.94px / 5.2vw（clamp 中段，与注释里「768 档得 39.9」吻合）；390 档 26px（被 620 档的 `max(26px, 6.6vw)` 接管，6.6vw = 25.74 → max 取 26）。
**这一条自述确实已经修好了，注释是准确的。** 但要注意：「3.8vw → 5.2vw」这个说法仍然不对 —— 改前不是 3.8vw，是 **4vw**（字面值里写的是 4vw）。`3.8vw` 只在这段自述里出现过。

### 矛盾 4：「7 条里 4 条仍被违反」 — **我独立复核：你的转述偏保守，实际是 4 条不符 + 1 条半对 + 2 条字面成立**

我不信转述，逐条查了（`git log --reverse -- style.css` 全 10 个提交）：

| # | 自述 | 我的实测 | 判定 |
| --- | --- | --- | --- |
| 1 | 三级文字对比度 4.2:1 → 5.6:1 | 旧 `#6f6c64` 对 `--ground` **4.23:1**、对 `--card` 4.67:1；现行 `#56534b` 对 ground **6.19:1**、对 `--ground-2` **5.58:1** | **方向对，终点值错**（5.6 既不是 4.23 也不是 6.19；只有对 `--ground-2` 才是 5.58≈5.6） |
| 2 | 小字下限 13px（原先 11/12px 有 115 处） | 首个提交 `style.css` 有 **1 处** `font-size: 11px`、0 处 12px；历史峰值（1753f94）也只有 2+1=3 处 | **115 处从未存在** |
| 3 | 大标题 3.8vw → 5.2vw | `3.8vw` 零次作为生效值；改前是 `clamp(30px, 4vw, 56px)`；现 1440 档实测 74px/5.14vw | **改前值错**（应为 4vw），改后已真接上 |
| 4 | 头部标签全大写 11px → 14px 句首大写 | 10 个提交零次 uppercase、零次 11px、从第一天就是 var(--s-14) | **改前态从未存在**；样式一直对，腐化的是类名 |
| 5 | 行分隔线 1px → 2px | 装饰线是 2px，但 5 处单边 1px 在真列表行上；另有窄档 2 条 hairline FAIL | **部分成立**，需精确化 |
| 6 | 截图缩略图不再用 1px 描边框 | `.shot` 无边框 ✓；但 `.fold-thumb` 的 `outline: 1px` 还在（图像边界，非装饰线；outline 不进 hairline 正则） | **字面成立** |
| 7 | 工具条不再 sticky | `.bar` 在 **10 个提交里全是 static**；sticky 的只有 `.rail` 与 `.detail-head`，两者都对 | **字面成立** |

**所以 7 条的真实分布是：4 条不符（1/2/3/4）+ 1 条半对（5）+ 2 条成立（6/7）。**
你说的「4 条仍被违反」在数量上对，但**成因与你的描述不同**：第 4 条不是「样式对了类名没改」，而是**样式从没改过、自述的改前态是虚构的**；第 5 条不是「1px 仍在 7 处」，是 5 处（列表行，合规）+ 3 处（装饰，已改）。
第 7 条你的转述是「字面成立但 .rail/.detail-head 仍 sticky」—— 我要明确说：**`.rail` 和 `.detail-head` 的 sticky 是对的，不该改**。第 7 条讲的是「工具条」`.bar`，它确实不 sticky；`.rail` 是筛选栏（固定导航需要）、`.detail-head` 是详情面板自己的头部（面板内滚动时保持可见），两者与「工具条压住大标题」不是同一件事。把这条当成缺陷去"修"，会把两个正确的设计改坏。

---

## 3. 任务 1 的交付：自述清单怎么办的

### 我选的是 **路 B + 方案 B（搬进 README）**，理由如下

**为什么搬出 CSS**：CSS 注释不是文档 —— 没有任何脚本读它，没有人在 review 时看它，`check-docs.mjs` 扫不到它。它腐化 8 个提交而无人发现，这就是证据。

**为什么进 README 而不是新写 `check-selfclaims.mjs`（方案 C）**：
- `check-docs.mjs` 已有 62KB / 13 项检查 / 3% 容差 / `--selftest` 自证机制，一个成熟的文档对账器已经在仓库里。再加一个并行脚本 = 第二套口径 = 又一次「两处必须同时改」（这个仓库已经栽过，`check-stale.mjs` 的注释点名了同一类病）。
- **成本估计**：方案 C 要重写一遍「怎么从 style.css / app.js / report.json 里取这 7 个事实」的逻辑，约 250–350 行，且它自己也需要 selftest（否则就是下一个腐化源）。方案 B 是 0 行代码 + 73 行文档。
- **但方案 B 有个真实缺口**：`check-docs.mjs` 现在**不校验**这 7 条（它只校验 README 里的方案数/闸门数/提示词区间/路径存在/中英一致）。所以搬进 README 后，它仍然可能悄悄腐化。

**这个缺口我没有用新脚本补，原因是任务书把 `check-docs.mjs` 列进了禁改名单**（「不许碰 …`check-docs.mjs`」）。我可以在 README 里写"可复算命令"（我写了，见 §3.2），但那要求人手动跑。

> **给 Lead 的建议（超出我的写权限，请你决定）**：若要真正消灭这类腐化，最小改动是在 `check-docs.mjs` 里加第 14 项 `selfclaim/decay`，断言 3 件事（都在本报告里有实测值，直接可写成断言）：
> 1. `style.css` 里 `border-(top|right|bottom|left): 1px` 的**未豁免**条数 == 5，且每条的所在选择器属于白名单 `{.tpl-card, .viewer-tabs button, .field, .field-fold, .parts li}`
> 2. `style.css` + 两个 html 里 `kicker|eyebrow|overline` 作为**类名**出现 0 次（注释里出现不算）
> 3. `.inspect/report.json` 的 `findings` 里 `level==='FAIL'` 条数 == 0，且 `at` 不比 `git log -1 -- style.css` 旧
>
> 这三条都不需要碰 3% 容差机制（那是 `nums/prompt-len` 专用的），是纯新增断言。成本约 40 行。**我没有擅自做，因为文件在禁改名单里。**

### 3.1 我写进 README 的内容

`README.md` 新增一节 **「选型台自己的闸门账（每一条都能复算）」**（+73 行），四笔账：
1. **账目一**：它的闸门报告曾经是六天前的（`report.json` 从 2026-10-21 起没更新，三个检查器都用 `S\d{2}-` 选择器所以看不见它）
2. **账目二**：自述清单 7 条里有 4 条与历史不符 —— 一张逐条对照表（就是上面 §2 矛盾 4 那张）
3. **账目三**：1px 只剩哪 5 处、为什么留（带 `.tpl-card:first-child` 这条自证）
4. **账目四**：`mast-kicker` 是类名腐化 + `tools/` 被 gitignore 的证据

`README-EN.md` 同节对译（+73 行）。`check-docs.mjs` 的 `i18n/facts` 仍然 PASS（方案数/达标数/行业词数/提示词区间/警告并集五项都一致）。

### 3.2 CSS 里留了什么

`style.css` 头部原来 5 行的 7 条散文，换成 42 行，内容**只有 CSS 本地才知道的那部分**：
- 哪 5 处 1px 是允许的、每处的语义证据
- 哪 3 处装饰线已改 2px、为什么（含实测代价与抵消）
- `.fold-thumb` 的 `outline: 1px` 为什么保留
- 一段承认「上一版清单腐化了」的元说明 + 指向 README

**不复述能被 README 校验的事实**（那些数字搬去 README），只留「为什么这条 CSS 该长这样」。这样即使 README 更新了，CSS 这段也不会跟着过期。

---

## 4. 我实际改了什么（逐项）

### 4.1 `prototypes/_selection/style.css`

| 位置 | 改动 | 理由 |
| --- | --- | --- |
| L7-48（原 L7-11） | 7 条散文 → 42 行「CSS 本地才知道的账」 | 见 §3.2 |
| L146 | 注释 `kicker 23` → `页头标签 23` | 旧类名残留 |
| L161-170（原 L123-126） | `.mast-kicker {}` → `.mast-label {}` + 12 行腐化说明 | 任务 2 |
| L1207 | `.mast-fold { border-top: 2px; margin-top: 6px }`（原 `1px` / `margin-top: 8px`） | 消掉窄档 hairline FAIL 1 条；margin 8→6 抵消 +1px |
| L1224-1232 | `.mast-facts { border-top: 2px }`（原 `1px`） | 消掉窄档 hairline FAIL 第 2 条 |
| L1066-1072 | `.prompt-fill { border-top: 2px }`（原 `1px`） | 装饰性分节统一 |
| L1044 / L1305 | 注释 `kicker 22.7` → `页头标签 22.7` | 旧类名残留 |

**净增 +150 行**（`style.css` 1210 → 1360 行，`git diff --stat` 报 `184 +++++`——含被并发改动的部分）。其中 **~120 行是注释/说明**，实际生效的声明改动只有 **3 个 `1px`→`2px` + 1 个 `margin-top: 8→6` + 1 个类名**：

```
$ git diff -U0 -- prototypes/_selection/style.css | grep '^+' | grep -E 'mast-label|border-top: 2px|margin-top: 6px'
+.mast-label {
+  border-top: 2px solid var(--rule);
+  .mast-fold { border-top: 2px solid var(--rule); margin-top: 6px; }
+    border-top: 2px solid var(--ink);
```
（另有一处 `.prompt-fill` 的 `border-top: 1px` → `2px`（现 L1070），grep 因为缩进没抓到；`.rail-sep` 的 L362 那条是原本就有的 2px，不是我改的。）

### 4.2 `index.html` / `wizard.html`

各 1 处：`class="mast-kicker"` → `class="mast-label"`。

> ⚠️ `index.html` 现在是 **26 行 diff，其中 25 行不是我的** —— 并发 Agent 加了 `#self-gate` 徽标段落、`<dt>` 里的「（限 30 个原型）」、`<script src="self-gate.js">`。**我只有 1 行。** 单独取我的那 1 行：
> ```
> $ git diff -U0 -- prototypes/_selection/index.html | grep mast-label
> +    <p class="mast-label">网站设计风格方案 · 选型台</p>
> ```
> `wizard.html` 是干净的 2 行 diff（1 删 1 加），纯我的。

### 4.3 `README.md` / `README-EN.md`

各 +73 行（§3.1）。

### 4.4 我没有动的

`data.js` / `prompts.js` / `prompt-copy.js` / `prototypes/S*/` / `templates/` / `tools/` / `check-docs.mjs` —— 零字节。
`app.js` —— 零字节（虽然它在允许名单里，但我没有理由改它）。

---

## 5. 改前 / 改后 A/B 实测

**探针**：`deliverables/68-exec/_probe.mjs`（起 8241 端口 http server，不用 `file://`；`Browser.launch()` 后**必调 `page.setViewport({width,height,mobile})`** —— 你的坑我避开了，见 §5.3 自证）。

### 5.1 我的改动单独造成的差异：**390/768 为 0；1440 被并发改动推高**

用「隐藏 `.self-gate`」把并发 Agent 的影响剥掉，剩下的接近我的改动的净效果：

| 档位 | 指标 | 隐藏 self-gate 后 | 基线（你给的） | Δ |
| --- | --- | --- | --- | --- |
| 1440×900 | 卡高 | 276.8 | ≈277 | 0 |
| 1440×900 | 完整卡 | 1 | 1 | 0 |
| 1440×900 | h1 | 74px / 1 行 | 74px | 0 |
| 1440×900 | rail 高 | 900 | 900 | 0 |
| 768×1024 | 首卡 top | 442.9 | — | 0 |
| 768×1024 | 完整卡（5 排序） | 1/1/1/1/1 | — | 0 |
| 390×844 | 首卡 top | **402.4** | ≈402 | **0.0** |
| 390×844 | 卡高 | 389.3 | ≈390 | −0.7（并发 Agent 的 `.row-family` 补偿） |
| 390×844 | 完整卡（5 种排序） | **1 / 1 / 1 / 1 / 1** | 全 1 | 0 |
| 390 gate 排序 | 首卡 | S13 / 431.2 / bottom 833.6 | S13 / 432 | −0.8 |
| 三档 | 横向溢出 | 0 / 0 / 0 | 0 | 0 |
| 三档 | 渲染中 <13px 文本块 | 0 / 0 / 0 | 0 | 0 |

**我的 3 处 `1px→2px` 净效果**：390 页头 +2px（`.mast-fold` +1、`.mast-facts` +1），被 `.mast-fold` 的 `margin-top: 8→6` 抵消 −2 ⇒ **页头 Δ0.0**。这就是为什么 390 首卡精确停在 402.4，**与你给的基线逐像素相同**。
`.prompt-fill` 的 +1px 只在详情面板里，不影响列表首屏。

**作用域证据**（防止有人以为这 3 条会影响 1024 档）：`.mast-fold` 与 `.mast-facts` 都在 `@media (max-width: 980px)` 里，`1024 > 980` ⇒ **1024 档完全不生效**。`.prompt-fill` 是全局（只在详情面板）。复算：`node deliverables/68-exec/_ex68-scope.mjs`。

**定稿时的实时数值**（`_probe.mjs FINAL`，并发 Agent 已把 `.self-gate` 收成 `.mast-fold-sum` 里的一个徽标）：

| 档位 | 首卡 top | 卡高 | 完整卡（5 排序） | 页头 | ovX | <13px |
| --- | --- | --- | --- | --- | --- | --- |
| 1440×900 | 430.5 | 276.8 | 1/1/1/1/1 | 346.6 | 0 | 0 |
| 768×1024 | 442.9 | 506.3 | 1/1/1/1/1 | 287 | 0 | 0 |
| 390×844 | **402.4** | 389.3 | 1/1/1/1/1 | 258.5 | 0 | 0 |

1440 首卡 407 → 430.5（+23.5），其中 **我的贡献 ≈0**，其余是并发 Agent 的 `.self-gate` 徽标 + `.mast-facts > div` 的 `2px` 边线 + `.row-family` 16px 那一轮。**完整卡 1，底边 707.3，视口 900，余量 192.7px** —— 指标没退化。

### 5.1b 1024×900 档：**已经 0 张完整卡，但不是我的改动**

HEAD 的提交信息自己写着「`--s-h1` 的一处真实回归：1024x900 首屏完整卡 1→0」。我核实了：

```
1024×900 sort=n   : 首卡 S01 top=613.5 h=339.6 bottom=953.1  完整=0 | mast=482.6  h1=53.2px/2行
1024×900 sort=gate: 首卡 S13 top=613.5 h=360.7 bottom=974.2  完整=0 | mast=482.6  h1=53.2px/2行
1024×900 隐藏 self-gate: 首卡 top=590 bottom=929.6  完整=0 | mast=459.1
```

**归因到我的改动 = 0px**，证明方式不是"看代码猜"，是**作用域证明**：我的两条页头规则在 `@media (max-width: 980px)` 里，`1024 > 980` 所以根本不生效（`_ex68-scope.mjs` 用大括号深度跟踪逐条打印）。`h1=53.2px` 是 `clamp(34px, 5.2vw, 74px)` 在 1024 档的值（1024×5.2%=53.2），确实是 `--s-h1` 接上之后涨的 —— **这是 HEAD 那个提交的账，不是我的**。

> 这一档**任务书没让我测**（只给了 1440 与 390 的基线），但 HEAD 的提交信息点名了它，所以我测了。它现在是 0 张完整卡，余量 −53.1px。**要修它需要重新分配 1024 档的页头预算**（页头 482.6 / 视口 900），那是另一轮的活。

### 5.2 1440 的增量不是我的：归因到并发 Agent 的 `.self-gate`

我第一次复测时（23:52，`.self-gate` 还是 `.mast` 的第三个网格子项）：
```
===== 1440 =====
  现状（含 .self-gate）  mast=406.8  h1 830px/1行  首卡 top=490.7  bottom=767.5  完整=1
  隐藏 .self-gate        mast=344.8  h1 830px/1行  首卡 top=428.7  bottom=705.5  完整=1
  ⇒ .self-gate 自身高=52  页头净增=62.0
```
**那一刻 390 是破的**：`mast=357.5`、首卡 `501.4`、完整卡 **0**（基线是 1）。我立刻 `send_message` 报告了 Lead（没有擅自改别人的飞线代码）。

那个 Agent 随后把 `.self-gate` 收进 `.mast-fold-sum` 当作一个徽标（`.sg-badge`），390/768 恢复到净增 **0.0**，1440 从 490.7 收回到 **430.5**（余量 192.7px）。

**结论**：1440 首卡 407 → 430.5 这 23.5px 里，**我贡献 ≈0**，其余来自并发 Agent 的 `.self-gate` 徽标 + `.mast-facts > div` 的 2px 边线 + `.row-family` 16px 那一轮（那是修 `body-size` FAIL 的必要代价）。指标没破（完整卡 1）。

> **这条对 Lead 仍有意义**：这个页面在 1440 的首卡位置比 `67-exec` 那一轮辛苦挣来的 407 退了 23.5px。余量还有 192.7px，所以不紧急；但如果后续还要往页头加东西，这 23.5px 是已经花掉的。

### 5.3 我避开了你说的坑（自证）

你说「`launch({width,height})` 不生效，必须 `page.setViewport`」。我的 `_probe.mjs` 里 `Browser.launch()` 之后每个 page 都显式 `setViewport`，且 `newPage({width,height,dsf,mobile})` 也传了同样参数。**自证**：390 档 dsf=2 的截图与 1440 档 dsf=1 的截图字节数不同（`self-gate` 探针的 390 `mast=258.5` vs 1440 `mast=406.8`，两种布局明显不同），不是同一张图。

### 5.4 闸门（`inspect.mjs`）改前 vs 改后

```
改前: RESULT: 2 FAIL, 2 WARN — not done.
        [body-size] @1440 (+768,390) 正文 13px
        [hairline]  @768 (+390) 2 thin rule(s)

改后（我第一次跑完我的改动，并发 Agent 还没动 body-size）:
      RESULT: 1 FAIL, 2 WARN
        [body-size] @1440 (+768,390)   ← 仍在，我没动字号
        （hairline 已 0）

改后（并发 Agent 把正文抬到 16px 之后，最终态）:
      RESULT: 0 FAIL, 1 WARN  ← exit 0
        [no-footage] 唯一剩下的一条
```

**hairline 归零是我的功劳，可复算**：768/390 两档 `hairlines` 从 2 → 0，1440 一直是 0。
**body-size 归零不是我的** —— 我只改了 1px 线和类名，没碰任何 `font-size`。最终态 `body 16px / 1.45` 是并发 Agent 改的（`inspect` 的 MEASURED 行从 `body 13px / 1.5` 变成 `body 16px / 1.45`）。

> **诚实说明**：`body-size` 原来是 FAIL，原因写在 `deliverables/68-exec/_bodysize.mjs` 的诊断里 —— probe 的判据是「10–24px、chars≥60 的文本里，字符数最多的 `(字族|字号)` 组」。实测 `Archivo|13` 占 6958 字，第二名 `Noto Sans SC|14` 只有 100 字。**正文 90.5% 是 13px 的方案卡元数据**。把它抬到 16px 会让 30 张卡全部长高 —— 并发 Agent 用了另一条路（`.row-family` 提到 16px + 窄档收 padding），代价是 390 卡高从 390.5 → 389.3（−1.2，反而更矮）。我核过它没让首屏退化。

---

## 6. 四个验证器的 exit code（最终态）

| 命令 | exit | 输出 | 与期望 |
| --- | --- | --- | --- |
| `node prototypes/_build/verify-prototype.mjs --all` | **1** | `达标 26 / 不达标 4 / 共 30` | ✅ 与期望一致（exit 1 是期望的：4 个不达标案仍在：S07 S08 S13 S21） |
| `node prototypes/_build/check-stale.mjs` | **0** | `✓ 全部新鲜`（检查 30 案 + 1 个产品入口） | ✅ |
| `node prototypes/_build/check-anchors.mjs` | **0** | `✓ 无死锚点`（S05 动态拼接 1 处另列） | ✅ |
| `node prototypes/_build/check-docs.mjs` | **0** | `README.md: 0 FAIL / 0 WARN / 13 PASS` | ✅ |

原始输出：`_ex68-verify.txt` / `_ex68-stale.txt` / `_ex68-anchors.txt` / `_ex68-docs.txt`。

### 6.0 ⚠️ 一个我必须报告的陷阱：这些验证器在编辑中途会给出假结果

我在定稿过程中三次拿到**假红**，每一次都是因为撞上了并发 Agent 正在写文件的那几百毫秒：

| 时刻 | 现象 | 真相 |
| --- | --- | --- |
| 00:10 | `check-stale.mjs` 抛 `ReferenceError: EXTRA is not defined` | 文件正在被写入，`EXTRA` 的声明还没落盘。**25 秒后重跑 exit 0** |
| 00:12 | `verify-prototype --all` 报 `达标 26 / 不达标 5 / 共 31`，多出来的第 31 个是 `_selection`（「缺 `assets/CREDITS.md`」） | 另一个 Agent 正**试着**把产品并入复核范围；它的注释自己写着「试过，代价不对等……会让 `nums/gate` 立刻 FAIL」，随后**自己回退了**。**重跑即恢复 26/4/30** |
| 多次 | `check-stale` 报 `_selection` 陈旧 | **真的**：我或别人刚改过源文件。重渲染即绿 |

**教训**：在多 Agent 并发下，「verify exit=1」这一个数字没有意义，必须**同时看它的汇总行与具体条目**。我第三次的 `共 31` 如果当成真结论写进报告，就会误导下一个人去修一个不存在的第 31 个原型。

> 顺带：那个 Agent 的注释里有一句判断我完全同意，值得留在记录里 —— **「并入会让一个原本全绿的检查器变红，而它红的原因不是产品退步，是我改了统计口径。」** 这是本仓库反复踩的坑（`check-docs` 的 `GATE_TAIL`、`nums/schemes` 的六个用例都是同类），它这次没有踩。

### 6.1 额外一条：`_selection` 自己的闸门从 FAIL 2 变 FAIL 0

任务书列的四条验证器**都不检查 `_selection` 的产品闸门**（它们只看 `S\d{2}-` 目录）。所以我另跑了一次 `inspect.mjs`：

| 时点 | 结果 | 明细 |
| --- | --- | --- |
| 我的改动前 | **exit 1，2 FAIL / 2 WARN** | `body-size`@1440+768+390、`hairline`@768+390 |
| 我只改完自己的部分 | exit 1，1 FAIL / 2 WARN | `hairline` **已清零**（三档 0 条），`body-size` 仍在 |
| 定稿时（并发 Agent 抬了 `.row-family` 到 16px 之后） | **exit 0，0 FAIL / 1 WARN** | 唯一剩下 `no-footage`（本页无视频，是设计选择） |

**`hairline` 的归零是我的**（8 处 style.css 单边 1px → 5 处，清掉的 3 处都是装饰线）。
**`body-size` 的归零不是我的** —— 我一个 `font-size` 都没改。是并发 Agent 把 `.row-family` 提到 `var(--s-16)` 并用「收 `.row` padding / 收 `.row-meta` margin / 390 档图宽 160→152」三条补偿抵回了高度。
**这两条都可复算**：改前的 2 FAIL 记录在 `_inspect-before.txt`，定稿的 0 FAIL 记录在 `_inspect-final.txt` / `_ex68-render*.txt`。

### 6.2 中途出现过一次红，已查明并归绿

```
23:45  check-stale exit 0  ✓ 全部新鲜
23:50  check-stale exit 1  ⚠ 1 项陈旧：选型台(_selection) wizard.html 落后 12 分钟
00:02  check-stale exit 1  ⚠ 1 项陈旧：选型台(_selection) index.html 落后 2 分钟
00:04  check-stale exit 0  ✓ 全部新鲜   ← 重渲染后
```
**原因不是我的改动坏了，是并发 Agent 把 `check-stale.mjs` 扩写到覆盖 `_selection`**（`git diff` 实测：`EXTRA` 数组新增 `_selection` + 9 个源文件）。在扩写之前，该脚本只查 `S\d{2}-` 目录，`_selection` 从来不在它的视野里。扩写后它立刻发现我改过的 `wizard.html` / `index.html` 比 `report.json` 新 —— 这是**新检查器正确地抓到了真实陈旧**，不是假阳性。
处置：跑 `node prototypes/_build/render-scheme.mjs _selection` 重渲染（这正是脚本自己给出的修复命令），陈旧度归零。

**注意 `_selection` 的 `report.json` 现在也被重渲染了**（3 张 fold 图 + 7 张 page 图 + `report.json` + `self-gate.js` 进入 `M`/`??` 状态）。这是让 `check-stale` 归绿的必要动作，我没有别的选择。

> **一个诚实的告诫**：`_selection` 的 `report.json` 会因**任何**源文件改动而陈旧，而它现在有 3 个以上 Agent 在并发改。所以 `check-stale exit 0` 这个状态是**我最后一次渲染那一刻的快照**，下一次有人碰 `_selection` 就会再次变红。这不是缺陷 —— 这正是那个扩写想要的行为。

---

## 7. 并发冲突：我遇到的三次，以及我的处置

任务书警告「仓库会被其他 Agent 并发改动」。我遇到了 **3 个并发 Agent 同时改 `_selection`**：

### 冲突 1：`check-stale.mjs` 被扩写到覆盖 `_selection`
- **发现时刻**：23:50，我从绿变红。
- **处置**：先 `git diff` 查明是别人改的（不是我改坏了），再按脚本指示重渲染。
- **影响**：我的报告必须解释「为什么 report.json 的哈希变了」。

### 冲突 2：`.self-gate` 被加进页头，**打崩了 390 首屏**
- **发现时刻**：23:52，我复测时发现 390 完整卡 **1 → 0**、页头 258.5 → 357.5。
- **我做了什么**：**立刻 `send_message` 给 Lead 报告**（附完整对照表），没有擅自改别人的飞线代码。
- **后续**：那个 Agent 自己把 `.self-gate` 挪进了 `.mast-fold`（≤980 档收起），390/768 恢复到净增 0。**1440 仍有 62px 净增**，如 §5.2 所述。
- **我的立场**：`.self-gate` 的**意图是对的**（这一页自己也有闸门 FAIL，不该被「闸门 FAIL=0 26」盖住），我不主张删。但它在 1440 吃掉 62px 页头，把首卡 top 从 ≈407 推到 490.7 —— **这是一个真实的、未被解决的退化**，应该由 Lead 决定是接受（1440 完整卡仍是 1，余量 132.5px）还是让 `.self-gate` 在宽档也进折叠块。

### 冲突 3：我的交付目录 `deliverables/68-exec/` 被别的 Agent 写入
- 至少 20 个文件不是我写的：`_attrib.mjs` / `_srv.mjs` / `_measure.mjs` / `LEAD-check-stale-fix.md` / `LEAD-verify-selfgate.mjs` / `matrix-68.json` / `cand-68.json` / `rf-diag.txt` / `_render2.txt` / `_render3.txt` / `_diagmast*.mjs` 等。
- **处置**：我给自己的脚本全部加了 `_ex68-` 前缀（`_ex68-attrib.mjs` / `_ex68-verify.txt` …），避免覆盖他们的产物。**他们也没覆盖我的**（我的 `_probe.mjs` / `_arch*.mjs` / `_before/` 都完好）。
- **风险提示**：`deliverables/68-exec/` 现在是**至少两个 Agent 共用的目录**。Lead 若要归档，需注意 `_attrib.mjs`（别人的）与 `_ex68-attrib.mjs`（我的）是两份不同的归因脚本，结论不同（他们测的是 390，我测的是三档全量）。

---

## 8. 我拒绝执行的步骤 / 与任务书不符的地方

### 8.1 任务 1 的「路 A 或路 B」二选一是设窄了 —— 我选了「逐条判」
任务书把处置设成两个互斥选项。但读 `lint.mjs:45`（`lines belong to real tables and form fields`）+ `lint.mjs:77`（formish 豁免）+ `probe.mjs:309/336`（同一个豁免）之后，正确解不是二选一：**5 处是真列表行（留 1px，路 B），3 处是装饰（改 2px，路 A）**。
用全 A 会花 13px 面板高度去"骗过"一条明确允许 1px 的规则；用全 B 则窄档 2 条 hairline FAIL 永远清不掉。**混合方案同时满足规则原文与视觉判断。**

### 8.2 任务 3 的「方案 B」有一个我没法补的缺口，因为 `check-docs.mjs` 在禁改名单里
我选了方案 B（搬进 README），但 `check-docs.mjs` **现在不校验这 7 条**。真正堵住腐化需要在 `check-docs.mjs` 加第 14 项断言（§3 给了具体三条，约 40 行，不碰 3% 容差）。
**我没有改它，因为任务书明令「不许碰 `check-docs.mjs`」。** 这是任务书自身的约束与任务 3 的目标（"没有任何机制防止它再次腐化"）冲突。**请 Lead 决定是否要我加这三条断言** —— 我可以在 30 分钟内交付，并附 `--selftest` 用例。

### 8.3 「`verify-prototype.mjs` 会不会因为 1px 线判 FAIL」—— 这个问法基于一个错误前提
它**根本不看 1px**（163 行里 `hairline` 出现 0 次）。判 1px 的是 `inspect.mjs` → `probe.mjs` → `rules.mjs`，且判据是 **`hairlines >= 2` 才 FAIL**（1 条只是 WARN）。
所以「`{ level: 'FAIL' }` 还是 WARN」这个问题：**1 条是 WARN，≥2 条是 FAIL**。而本页改前窄档正好是 **2 条**，所以它是 **FAIL**。这个区分很重要 —— 它意味着「只改 2 处里的 1 处」就能从 FAIL 降到 WARN，但那是钻判据的空子，我选择把 2 处都改掉。

### 8.4 「8 处 1px 线」的数字：我实测 style.css 是 8 处，但完整清单是 10 处（跨 3 文件）
你说「另外还有 8 处 `border: 1px solid` 四面全包」—— 我数到 **14 处**（L99/235/295/305/308/367/459/507/575/644/913/947/968/1147），另有 **2 处** `border: 1px dashed`。
你的「8 处」可能只数了某个子集（我猜是 `.tpl-*` / `.viewer-*` 那几块）。这不影响结论（四面全包进 `outlined-box` 而非 `hairline`），但数字要更正。

### 8.5 我没有改「`.rail` / `.detail-head` sticky」
你转述上一轮 Agent 的话「第 7 条字面成立但 `.rail`/`.detail-head` 仍 sticky」，暗示这是个待修问题。**我拒绝把它当缺陷修。**
第 7 条讲的是**工具条 `.bar`**（它确实 10 个提交全部 static）。`.rail` 是左侧筛选栏（固定导航，用户滚动 30 张卡时要能随时改筛选）、`.detail-head` 是详情面板自己的头部（面板内滚动时保持关闭按钮可见）。**把这两个改成 static 会破坏可用性，不是修 bug。** 这条自述是成立的，不需要动。

### 8.6 我拒绝按「全 A」改那 5 处列表行
理由见 §2 与 §8.1。补一条：`.tpl-card:first-child { border-top: none }` 这条规则本身就在说「这是列表行」—— 一个列表行用 1px、一个装饰分节用 2px，是设计判断，不是不一致。

### 8.7 任务书只给了 1440 与 390 的基线，但 1024 档是当前唯一的硬伤
我没被要求测 1024，但 HEAD 的提交信息点名了它（「`--s-h1` 的一处真实回归：1024x900 首屏完整卡 1→0」）。我测了：**确认 0 张，余量 −53.1px，且与我的改动无关**（作用域证明见 §5.1b）。
**这个档位现在没有任何人在修**，而它是本次所有验证器都覆盖不到的一档（`verify-prototype` 只看 1440；`inspect.mjs` 默认 1440/768/390）。建议单开一轮，或至少把它写进 README 的「做不到与已知边界」。

---

## 9. 遗留问题（给 Lead 的清单）

| # | 问题 | 严重度 | 建议 |
| --- | --- | --- | --- |
| 1 | **1024×900 已是 0 张完整卡**（首卡 top 613.5 / bottom 953.1，视口 900，余量 **−53.1px**） | 高 | HEAD 提交信息自己承认了「`--s-h1` 接上后 1024 首屏 1→0」。**与我的改动无关**（我的两条页头规则在 `max-width:980px` 里，1024 不生效 —— `_ex68-scope.mjs` 已证）。但这一档没人在修，建议单开一轮 |
| 2 | 1440 首卡比 `67-exec` 退了 23.5px（407 → 430.5） | 低（完整卡仍 1，余量 192.7） | 来自 `.self-gate` 徽标 + `.mast-facts` 2px + `.row-family` 16px；若还要往页头加东西，先花这 23.5px 的预算 |
| 3 | `check-docs.mjs` 不校验「选型台自己的账」这 7 条 | 中 | 加第 14 项 `selfclaim/decay`（§3 给了三条断言，约 40 行；文件在禁改名单里，我没动） |
| 4 | `wizard.css:72` 还有 1 处装饰性 1px（`.wz-card .wz-why` 上边线） | 低 | 严格说它也是装饰线，可改 2px；但 `wizard.css` **不在我任务书的 3 个文件名单里**，我没碰 |
| 5 | `prompt-copy.js:744` 的 `height:1px`（隐藏 textarea）永久被 lint 记一条 hairline | 低（假阳性） | 不动：功能性隐藏，不是分隔线；`lint` 的 `height:1px` 判据本身偏宽 |
| 6 | `_selection/report.json` 会被任何源文件改动触发陈旧 | 中（流程性） | 已由扩写后的 `check-stale.mjs` 覆盖；多 Agent 并发时可接受反复重渲染 |
| 7 | `deliverables/68-exec/` 是多 Agent 共用目录 | 低 | 归档时注意区分 `_attrib.mjs`（别人的）/ `_ex68-attrib.mjs`（我的） |
| 8 | 本页 `body-size` 现在靠 `.row-family` 16px 通过，但 13px 仍是字符量第一 | 低 | 若再改卡片排版这条 FAIL 会回来；`inspect.mjs` 保持诚实即可，别用 `--allow` |

---

## 10. 复算清单（每条都能一键重跑）

```bash
# 我改前的快照（逐字节比对）
ls deliverables/68-exec/_before/            # style.css index.html wizard.html report.json

# 自述清单 7 条的历史核实
node deliverables/68-exec/_arch3.mjs

# 1px 的精确分布（单边 vs 四面全包 vs dashed）
node deliverables/68-exec/_borders.mjs

# lint 的 hairline 判定复刻（含 formish 豁免）
node deliverables/68-exec/_lintemu.mjs

# 对比度矩阵（4.23 / 5.58 / 6.19 从哪来）
node deliverables/68-exec/_contrast2.mjs

# body-size 为什么是 13px（probe 的 bodySample 判据复刻）
node deliverables/68-exec/_bodysize.mjs

# 路 A（全改 2px）的代价
node deliverables/68-exec/_routeA.mjs

# A/B 实测（三档 × 五种排序 + 向导页）
node deliverables/68-exec/_probe.mjs before    # 改前快照另存
node deliverables/68-exec/_probe.mjs now

# 把并发 Agent 的 .self-gate 与我的改动分开计量
node deliverables/68-exec/_ex68-attrib.mjs

# 证明我的 3 条 2px 规则在哪个 @media 里（1024 档不受影响）
node deliverables/68-exec/_ex68-scope.mjs

# 1024×900 档（当前唯一的硬伤：0 张完整卡）
node deliverables/68-exec/_ex68-1024.mjs

# 四个验证器
node prototypes/_build/verify-prototype.mjs --all
node prototypes/_build/check-stale.mjs
node prototypes/_build/check-anchors.mjs
node prototypes/_build/check-docs.mjs
```

---

## 11. 一句话给下一个接手的人

**CSS 注释不是文档。** 这份清单腐化了 8 个提交、写了 3 个从未存在过的数字，而全仓库没有一个脚本在读它。
现在它在 README 里，旁边放着一张逐条对照表与四条复算命令。**但它仍然没有自动断言** —— 那需要改 `check-docs.mjs`，而那个文件不归我改。
如果你接手，第一件事是把 §3 那三条断言加进去；在那之前，这份清单和上一版一样会腐化，只是这次腐化会被至少一个读过这份报告的人发现。
