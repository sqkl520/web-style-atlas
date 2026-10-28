# 红队复核 · 「给产品自身补守门员」的七条前提

- 测量时刻：**2026-10-28 23:00 – 23:25 (Asia/Shanghai)**
- 基线 HEAD：`ce4ea78c0c603a1f1357f1282fc8537349a431ac`（main）
- 基线工作区：`git status --porcelain` = **987** 项，全部 `??`；**0 项** 已跟踪文件被改
- 结束复核：HEAD 不变，未跟踪 **989** 项（+2 为我自己在 `deliverables/68-plan/` 下新建的探针文件），**依然 0 项**已跟踪文件被改 → 测量期间无他人改动，数据有效
- 只读声明：`prototypes/` `templates/` `README*` `tools/` 全部未改。**一次越界已还原**（见附录 A）
- node：`D:\Nodejs\node.exe v26.12.1`；Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe` 存在

所有数字均为本轮自测。凡引用 Lead 处均标注「Lead 说 X，我实测 Y」。

---

## 判决表

| # | 前提 | 判决 | 一句话理由 |
|---|---|---|---|
| P1 | 产品自身没有任何守门员 | **不成立**（前提的事实与结论都不成立） | 有 4 个在库的机械检查覆盖产品，其中 `check-docs` 13 项且**专有一项 `panel/fields` 直接解析 `_selection/app.js`**；`verify-prototype.mjs _selection` **能直接跑**并给出真图 30/FAIL 0。真正的缺陷是**陈旧**，不是缺失 |
| P2 | lint 报 29 FAIL ⇒ 产品有 AI 味 | **不成立** | 实测 **30** FAIL 中 **15 条出自真注释**（14 个 emoji + 1 个 numbering）；9 条 hairline 有 6 条落在规则明文允许的「form fields / real tables」；真正站得住的只有 **eyebrow×2 + hairline×3**。且裸扫 `data.js` 一个文件就是 **30 FAIL**，等于整个 `_selection` 的 FAIL 总数 |
| P3 | 逐行豁免是可行机制 | **部分成立，但作为「守卫」不成立** | 机制确实在跑（全库 **42** 处），但 `tools/` **跟踪文件数 = 0**，克隆者拿不到 lint，豁免注释对下游**无意义**；S13 的 19 条注释实测掩盖了 **14 条 FAIL**，其中真实的是 `mono×1 / shadow×12 / hairline×1` |
| P4 | 12 条必须渲染才能测 ⇒ 补 probe 闸门 | **不成立（数字层面就不成立）** | 不是「12 条」：渲染层有 **41** 条静态层测不到（含滚动带 6 条），`judge()` 可发 **46** 个 id（52 个发射点）。且 `focal-point` 与 `few-pictures` 在 30 案语料上 **FAIL=0 / WARN=0**，从未被校准过；单跑 `_selection` **61.3 秒**、单跑模板 M01 **33.3 秒**，仓库里**没有任何 CI 配置** |
| P5 | 产品不守规则 = 虚伪 | **不成立（反向成立）** | `style.css:5` 原文写明「这份页面本身不受那 30 条规则约束，但没必要去踩同一批坑」——这句话**现在仍算数**，且已被执行（L7-11 列了 7 处因工具指出而改的地方）。真正的问题不是「不守」，是**没人验证它还守不守** |
| P6 | 986 个未跟踪文件值得修 | **数字与判断都错** | 实测 `??` = **987**（`-uall` 展开 **5116** 文件 / **369.7 MB**，是已跟踪仓库 182.1 MB 的 **2 倍**）；主体不是报告，而是 `deliverables/63-test/replica/` 一份**8 案的整站副本，71 MB，16/18 个 index.html+style.css 与 prototypes 逐字节相同** |
| P7 | 本轮最该做的是补守门员 | **不成立** | 见 §P7，三件替代事项按「用户可感知后果」排序 |

**统一数字更正**：Lead 说「51 条规则（25 FAIL + 26 WARN）」。实测规则面是**三套不同数字**（`probe-rule-surface-v2.mjs` / `probe-render-only.mjs`，已修正 v1 探针的三元表达式漏检）：

| 实现 | 唯一 id | 发射点 | 结论 |
|---|---|---|---|
| `lint.mjs` 静态 | **22** | 23 条 | 11 条纯 FAIL / 10 条纯 WARN / 1 条两档（numbering） |
| `rules.mjs` `judge()` | **46** | **52** 条 | 19 纯 FAIL / 20 纯 WARN / **7 两档**（micro-label、hairline、outlined-box、contrast、font-count、body-size、small-text） |
| `inspect.mjs` 滚动/动效带 | 6 | 7 条 | covered-text / clipped-text / pinned-over-picture / empty-screens / long-pin / still-page |
| **渲染层合计**（judge ∪ inspect） | **52** | 59 条 | 其中 **30** 条可发 FAIL、**30** 条可发 WARN |
| **并集**（静态 ∪ 渲染） | **63** | — | — |

「51」这个数**在任一实现里都不存在**：`RULE_IDS` 声明 **52** 个，`judge()` 实际发射 **46** 个（52 个发射点），并集是 **63**。

**「25 FAIL + 26 WARN」的真相**：渲染层有 52 个 id，其中 **30 条 FAIL-capable + 30 条 WARN-capable**（8 条两档重复计入）。25/26 既不是 30/30，也不对应 52。Lead 的 `LEAD-recon.md:134` 写「53 条（含 51 唯一 id）」，同样对不上。

**三者的划分**（这才是「必须渲染才能测」的真实规模）：

| 分类 | 条数 | 说明 |
|---|---|---|
| `RENDER_ONLY`（渲染独有） | **41** | 含滚动/动效带的 6 条；**扣掉那 6 条是 35 条**——恰好等于 Lead 自己在 `LEAD-recon.md:142-143` 写的「只在动态里有、静态完全覆盖不到的 35 条」 |
| `IN_BOTH`（两层都有） | 11 | emoji、eyebrow、glass、gradient、gradient-text、hairline、micro-label、mono、numbering、outlined-box、shadow |
| `STATIC_ONLY`（静态独有） | 11 | bounce、claude-palette、copy、cta-copy、default-font、ease-in、h-screen、lorem、purple、scale-zero、transition-all |

**所以我与 Lead 的 recon 在这一项上是一致的（41 − 6 = 35），但 P4 写的「12 条」既不等于 41、也不等于 35、也不等于 6。**

---

## P1「产品自身没有任何守门员」→ **不成立**

### 攻击 1：真的有守门员吗？有 4 个，其中 1 个专为产品而写

Lead 的证据只看了 `check-docs` 与 `collect-schemes` 的**存在**，没有看 `check-docs` 的内容。实测：

```
$ node prototypes/_build/check-docs.mjs
文档一致性：README.md ↔ data.js / prompts.js / prompt-copy.js
  ✓ ids/exist            文档提到的方案编号全部存在（data.js 30 案）
  ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数
  ✓ nums/gate            闸门 FAIL=0 的案数 = 26，与实测一致
  ✓ nums/warn-axes       警告两轴：hard 4 / degrades 13 / 并集 14，文档口径一致
  ✓ nums/prompt-len      提示词长度 = 1639–1998，中位 1829，文档一致
  ✓ nums/scenes          场景词 44 / 直连 16 / 近似 28 / 标为没有 29，文档一致
  ✓ status/fixed-claims  没有把已修项写成未修
  ✓ status/layout-fix    layout 抽取 30/30 有值，S12/S15/S19 = 549/640/420 字
  ✓ panel/fields         12 段字段（field() 11 + auditFold 1），audit 30/30 有值（276–444，中位 324，合计 10065），顺序 audit → risk，S13 = 306 字且无评审工件
  ✓ i18n/facts           中英两版的关键事实一致（方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集）
  ✓ paths/exist          文档里 15 条仓库路径全部存在
  ✓ paths/templates      文档提到的模板编号都存在
  ✓ regression/banned    6 条已腐化原话均未回归
README.md: 0 FAIL / 0 WARN / 13 PASS
exit=0, 657 ms
```

这**不是**「提到产品」，而是**13 项里有 6 项真的读产品源码**：

| 项 | 读什么 | 守的是什么 |
|---|---|---|
| `panel/fields` | `prototypes/_selection/app.js`（`check-docs.mjs:431` 读 `join(SEL,'app.js')`） | 详情面板的**字段数与顺序**，与 README 对照 |
| `nums/gate` | 30 案 `.inspect/report.json` 汇总 | 「达标案数」这个数字不能再写错 |
| `nums/prompt-len` | `data.js` + `prompts.js` + `prompt-copy.js`（`vm` 装真文件） | 提示词长度区间 |
| `nums/scenes` | `data.js` 的 scenes 字段 | 场景词计数 |
| `nums/warn-axes` | 30 案 report 的 WARN 并集 | 警告轴口径 |
| `status/layout-fix` | `data.js` 的 layout 字段 | 抽取回归 |

而且这个检查**自己有自证**：

```
$ node prototypes/_build/check-docs.mjs --selftest
README.md: 5 FAIL / 0 WARN / 8 PASS
  ✓ 自测一（三处已知腐化）：全部被对应断言抓出，退出码 1
  ✓ 改坏 1：三十个可运行的原型 → 三十一个   exit=1 期望=1
  ✓ 改坏 5：README「全部 12 段字段」→「全部 13 段字段」  exit=1  ✗ panel/fields
  ✓ 误报 1：追加「30 个场景词」「1815 字」    exit=0 期望=0（不报）
  ✓ 误报 2：30 个方案 → 三十个方案          exit=0 期望=0（不报）
  ✓ 自测通过：三处已知腐化 + 七个用例全部符合预期
exit=0, 6658 ms
```

**这是全套 18 个 build 脚本里唯一一个有「检查器的检查器」的。** 说「产品没有守门员」直接与这个事实冲突。

### 攻击 2：`verify-prototype.mjs` 不是「排除」产品，只是 `--all` 的正则选不到

Lead 的 recon 已经自己撞到这一点并写进了 `LEAD-recon.md:69-81`，但结论停在「只是正则问题」。我复跑确认：

```
$ node prototypes/_build/verify-prototype.mjs _selection
✗ _se _selection
    html 22K / css 71.6K / FAIL 0 / WARN 2 / 真图 30 / 截图 10
    · 缺 assets/CREDITS.md
    ~ 缺 assets/credits.json（若素材全是程序化生成可接受）
达标 0 / 不达标 1 / 共 1
exit=1, < 0.3 s
```

**当场算的 6 项全部通过**（远程资源 / 禁用字体栈 / Emoji / body 背景图 / 引用缺失 / CREDITS）。唯一的真缺陷是 **缺 `assets/CREDITS.md`**。

模板则相反，`verify-prototype` 对 M01 **会报错，而且是误报**：

```
$ node prototypes/_build/verify-prototype.mjs ..\templates\M01-clean-corporate
    · 缺 assets/CREDITS.md
    · 引用的本地文件缺失：logo.svg hero.jpg
    · 没有 .inspect/report.json（没渲染过）
```

`logo.svg` 是 **HTML 注释里的示例代码**（`index.html:32`：`想换成真图片：把整个 <svg> 换成 <img src="logo.svg" ...>`）；`hero.jpg` 是模板**故意留的占位符**（`index.html:88`，等着用户换成自己的照片）。脚本对 `.html` 只剥 `<!-- -->`（第 20 行 `stripNonRendered` 只在 Emoji 检查里用），**资源引用检查根本不剥注释**。所以对模板跑这个闸门，得到的两条「缺失」都是噪声。

### 攻击 3：我漏掉的脚本——`check-anchors` / `check-stale` 不守产品

```
$ node prototypes/_build/check-anchors.mjs
锚点完整性：扫了 30 案
  动态拼接的（需人工确认，不算死锚点）：1 处
     S05  href="#dg-' + keys[i] + '"
  ✓ 无死锚点
exit=0, 535 ms

$ node prototypes/_build/check-stale.mjs
闸门陈旧度：检查 30 案
  ✓ 全部新鲜
exit=0, 507 ms
```

两者循环都是 `if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;`（`check-anchors.mjs:26`、`check-stale.mjs:23`）。**产品不在范围内。** 除此之外没有别的根目录 `.mjs`（`Get-ChildItem -Filter *.mjs` 为空），没有 `.github/`，没有 `*.yml/*.yaml` 任何 CI 配置，`.ps1` 只有 3 个被 `_compiler-*.ps1` 忽略的更新脚本和 `deliverables/*-scratch/` 里的探针。

**所以「没有守门员」的正解是：守门员有 4 个，但另外 3 个（`--all` / `check-anchors` / `check-stale`）的循环都用同一个 `/^S\d{2}-/`。** 这是一个**复制了三遍的目录选择器**，不是三次独立的设计决定。

### 攻击 4（更根本）：产品需要被这 51 条守吗？

我的判决是 **「部分需要，但需要的那部分恰好不是 Lead 想补的那部分」**，依据是实测的**失效方向**：

- 静态 lint 的 30 条 FAIL 里，**15 条在真注释里**、**6 条 hairline 落在规则明文允许的形态**——误报率 ≥ 70%（§P2）。
- 渲染闸门在 `_selection` 上只报 2 条 FAIL：`body-size`（测量口径产物，§P2 附录）与 `hairline`（2 条，正好卡在 `>= 2` 的 FAIL 阈值上）。
- 而真正会伤到用户的缺陷——**报告冻结 6 天**（§P1.5）——**两套规则都查不到**。

也就是说：**拿落地页规则去卡工具界面，抓到的多半是规则自己的口径问题，抓不到产品真正的病。**

判据（引用规则原文，不拍脑袋）：

| 规则原文 | 前提假设 | `_selection` 是不是这个形态 |
|---|---|---|
| `few-pictures`: "Only N picture(s) on the page (photographs, footage or raster images)" / fix 里 "Find real pictures of **the subject's world**" | 页面在讲一个**有实体世界的主体** | 不是。产品的主体是 30 个方案的**缩略图**，已经 30 张，`few-pictures` 不响 |
| `focal-point`: "Make one thing lead: the headline at display size, or one large picture" | 首屏是**叙事入口** | 不是。首屏是**检索入口**，主导元素是那个列表本身 |
| `no-footage`: "Look for one honest clip with assets.mjs --video" | 页面有可拍的实体 | 不是。工具界面没有 footage 可拍 |
| `body-size`: "Body copy 16–20px" | 页面主体是**连续散文** | 不是。主体是**数据标签**（§P2 附录实测） |

**但**——`contrast` / `overflow` / `broken-image` / `headline-lines` / `ui-wrapper` / `error` 这类**与界面类型无关**的规则，产品**必须**守，而且实测它们是干净的（`consoleErrors=0`、`horizontalOverflow=0`、`brokenImages=[]`）。

### P1.5 真正的缺陷：报告冻结 6 天，且**现有机制按设计就查不到**

```
prototypes/_selection/.inspect/report.json   at = 2026-10-21T19:51:17.207Z
prototypes/_selection/index.html             mtime = 2026-10-27T17:31:19Z
prototypes/_selection/style.css              mtime = 2026-10-27T18:27:11Z
prototypes/_selection/app.js                 mtime = 2026-10-27T18:33:10Z
```

冻结 **≈6 天**，期间 8 个源文件全部被改。`check-stale.mjs` 报「全部新鲜」——因为它按 `S\d{2}-` 选目录，`_selection` 根本不在候选集里。**同一时刻，`verify-prototype _selection` 会打印 `FAIL 0`，而那个 0 来自 6 天前。**

这是「有守门员」和「没守门员」之外的**第三种状态**，而且是最坏的一种：**它会主动说谎**。

---

## P2「lint 报 29 FAIL ⇒ 产品有 AI 味」→ **不成立**

### 攻击 1：数字本身不对

```
$ node lint.mjs prototypes/_selection/{app,index,style,wizard}.{js,html,css}
RESULT: 30 FAIL, 16 WARN         （exit=1, 1165 ms）
```

**Lead 说 29，我实测 30。** 逐文件（`probe-lint-classify.mjs`）：

| 文件 | FAIL | WARN |
|---|---|---|
| app.js | 9 | 2 |
| index.html | 2 | 0 |
| style.css | 16 | 13 |
| wizard.js | 1 | 0 |
| wizard.html | 1 | 0 |
| wizard.css | 1 | 0 |
| (all files) em-dash | 0 | 1 |
| **合计** | **30** | **16** |

### 攻击 2：29 条里有多少误报？→ 15 条在真注释里，我实测 Lead 的「14 处全在注释行」**方向对但机制错**

Lead 说「emoji 14 处全在注释行」。我写了一个**跨行块注释状态机**（`probe-comment-state.mjs`）复核：

- `lint.mjs:80` 确实对 `copy` / `cta-copy` / `emoji` 有豁免，但判据是 `/^\s*(\/\/|\/\*|\*|import |@import|<!--)/.test(line)` —— **只认「这一行以注释符号开头」**。
- `lint.mjs:73` 的 `taste-skill-ignore` 也是**逐行**判。
- 所以**跨行 `/* ... */` 块注释的第 2 行以后（不以 `*` 开头的那些）完全不被跳过**。

结果：

```
总 finding 46，其中 FAIL 30
FAIL 在真注释里：15   ← 14 emoji（app.js 的 /* */ 块内）+ 1 numbering（// 行）
FAIL 在真代码里：15
```

对照 `app.js:238 / 595 / 599 / 628`——全部是 `/* 挂起条：... */` 块内第 4–10 行，是**中文施工记录**，不是渲染出来的 UI。

**所以「emoji 14 处全在注释」这个观察对，但 Lead 给的机制（「注释不渲染」）在 lint 里并不成立**——lint 之所以没跳过它们，是因为它们不在**行首**。换句话说：**这 14 条误报是 lint 的 bug，不是「注释豁免生效」。**

### 攻击 3：`hairline` 的 9 条，有 6 条恰好是规则明文允许的

规则原文（`lint.mjs:45`）：`'Thin rule / divider line. Separate with space, tone or scale; **lines belong to real tables and form fields**.'`

`lint.mjs:77` 的豁免只认**选择器**匹配 `table|thead|tbody|tfoot|tr|td|th|input|textarea|select|fieldset`。实测 9 条：

| 行 | 选择器 | 规则是否允许 | 判决 |
|---|---|---|---|
| 684 | `.field` | 「form fields」 | **误报**——它就是一个字段行 |
| 706 | `.field-fold` | 「form fields」 | **误报** |
| 809 | `.parts li` | 详情面板的分项列表，逐行字段 | **误报**（同上，语义是 form field） |
| 470 | `.tpl-card` | 卡片分隔 | 边界，暂算真实 |
| 577 | `.viewer-tabs button:last-child` | 标签栏右缘 | 边界，暂算真实 |
| 961 | `.prompt-fill` | 竖向分隔 | **真实**（可改色调） |
| 1098 | `.mast-fold` | 页头折块顶线 | 边界 |
| 1112 | `.mast-facts` | 读数块顶线 | 边界 |
| wizard.css:72 | 向导分隔 | 边界 |

**判据不是我发明的**：规则自己写了「form fields 保留线」。`.field` / `.field-fold` 的类名叫 field、语义是表单字段行——lint 只看**标签名选择器**，看不见**类名语义**，这是静态正则的固有限制。**3 条确定误报，6 条落在「边界」**，真正无可辩解的只有 1 条（`.prompt-fill`）。

而渲染闸门对同一个页面只报 **2** 条 hairline（768/390 档，`details#mast-fold` + `dl#facts.mast-facts` 各 712px）——因为它按**渲染后的盒子尺寸**判（`probe.mjs:338`：宽 ≥240 且有上下边，或高 ≥240 且有左右边），而不是按 CSS 行文本。

### 攻击 4：`shadow` 的 2 处 —— Lead 的辩词**部分成立，但第 2 条辩不掉**

```
style.css:353  .row[aria-current="true"] { background: var(--card); box-shadow: inset 5px 0 0 var(--ink); }
style.css:896  .detail { box-shadow: -18px 0 0 0 rgba(28, 27, 24, .06); }
```

- **L353 成立**：`inset 5px 0 0` 是选中态的左侧标记，不是「浮起」。但要注意——**渲染闸门也不会报它**：`probe.mjs:318` 明确 `outer = sh.split(',').some(part => !/inset/.test(part) ...)`，**纯 inset 不计**。所以这条在静态层误报、在渲染层不误报，是**两层口径不一致**，不是「规则措辞」（"Elements at rest carry none"）的问题。
- **L896 辩不掉**：`-18px 0 0 0` 是 **outer** shadow，一个向左投 18px 的实色块，用来给详情面板做「推出来」的观感。`probe.mjs` 会把它算进 `shadowStatic`——但实测 `shadowStatic = 0`。**为什么？** 因为 `probe.mjs:314` 只遍历 `big`（面积够大的元素），`.detail` 在 1440 档没进 `big` 集合。

→ **这是一个真实的、两层都测不出（或测法不同）的缺陷。** 它恰好证明了相反的事：**再补一层闸门也不会抓到它，因为两层都按「元素够不够大」筛。**

### 攻击 5（数字游戏）：裸扫 `data.js` 一个文件 = **30 FAIL**，等于整个 `_selection` 的总数

```
$ node lint.mjs prototypes/_selection/data.js
  [mono]   27×   （Martian Mono / Departure Mono / JetBrains Mono …）
  [shadow]  3×   （drop-shadow / box-shadow: / shadow）
  [em-dash] 1×   （194 em dashes）
RESULT: 30 FAIL, 1 WARN        exit=1, 649 ms
```

**这是本轮最能说明问题的一个数**：`data.js` 单文件 = 30 FAIL，而 Lead 报的整个 `_selection`（4 个文件）= 29 FAIL。**两个数一样大。**

而且这 30 条**全部在真代码区**（不是注释），因为 `data.js` 是一个 `window.X = {...}` 的 JS 对象字面量——`probe-comment-state.mjs` 判 `inCode: 30, inComment: 0`。看原文：

```
data.js:15   "fonts": "标题＝Archivo Black …（OFL 1.1，宽度轴 62.5–125…）"
data.js:267  "fonts": "…辅助数字＝Martian Mono（OFL 1.1，用于展厅编号与日期）…"
data.js:358  "landing": "CSS 思路——凹槽用两层 box-shadow: inset 加 1px 边框实现…"
data.js:1072 "shadow",
```

**这些是「S0x 这个方案用了什么字体/阴影」的描述文本**，lint 把它们当成「产品自己用了 Martian Mono / 产品自己写了 box-shadow」。产品全程渲染的是 `Archivo + Noto Sans SC`，`monoFamilies` 里只有 `IBM Plex Mono` 且 `monoProseShare = 0`。

**「30 个原型的 data.js 也过不了 lint」——我实测确认**：整个 `_selection` 目录（9 个文件）跑出来是 **115 FAIL / 17 WARN**：

| 文件 | FAIL | WARN | 性质 |
|---|---|---|---|
| prompts.js | 45 | 0 | 提示词文本（描述 30 案） |
| data.js | 30 | 0 | 数据文本（描述 30 案） |
| prompt-copy.js | 10 | 1 | 文案（描述 30 案） |
| **小计（数据）** | **85** | 1 | — |
| style.css | 16 | 13 | 真 CSS |
| app.js | 9 | 2 | 真 JS |
| index.html | 2 | 0 | 真 HTML |
| wizard.html | 1 | 0 | 真 HTML |
| wizard.js | 1 | 0 | 真 |
| wizard.css | 1 | 0 | 真 |
| (all files) em-dash | 0 | 1 | 聚合 |
| **小计（产品 chrome）** | **30** | 16 | — |
| **合计** | **115** | **17** | — |

**这就是那个「数字游戏」的答案**：产品 chrome 的 **30** 条 FAIL，恰好等于**数据文件的 30 条**（`data.js` 单文件）。两个数字一样大，纯属巧合，但它解释了为什么 Lead 的「29 FAIL」看起来像产品的问题——**一半的量级是数据在自我描述**。

按规则看这 115 条（`probe-lint-classify.mjs`）：

| 规则 | 条数 | 来自数据文件 | 来自 chrome |
|---|---|---|---|
| `mono` | 45 | **45**（data 27 + prompt-copy 3 + prompts 15） | 0 |
| `shadow` | 38 | **36**（data 3 + prompt-copy 3 + prompts 30） | 2（style.css） |
| `emoji` | 17 | 2（prompt-copy） | 15 |
| `hairline` | 10 | 1（prompt-copy） | 9 |
| `outlined-box`（WARN） | 15 | 1 | 14 |
| `eyebrow` | 2 | 0 | 2 |
| `numbering` | 1 | 0 | 1 |
| `purple` | 1 | **1**（prompt-copy:621 `#6366F1`） | 0 |
| `gradient` | 1 | 0 | 1 |
| `h-screen`（WARN） | 1 | 0 | 1 |

**`mono` 的 45 条 100% 来自数据文件，`shadow` 的 38 条有 36 条来自数据文件。** 这两条正是 README 说「不在 `verify-prototype.mjs` 里、只在仓库外 `rules.mjs` 里判」的那两条——**它们在数据文件上系统性失效**。

### 附录：`body-size 13px` 这条 FAIL 是测量口径产物（P2 之外的实证）

渲染闸门对 `_selection` 报的第一条 FAIL：

> `Body text is 13px (the size most of the running text is set in).`

我用同一个 CDP 探针（`probe-chars-per-size.mjs`，复刻 `probe.mjs:225-229` 的筛选：10–24px、≥60 字、非 code、非 data-ui）重测 1440 档：

| family | size | 字符数 | 块数 | 内容样例 |
|---|---|---|---|---|
| Archivo | **13** | **6958** | 44 | `苏联构成主义印刷。参考对象：El Lissitzky 1919…` ← **方案的描述/元数据** |
| Noto Sans SC | 16 | 524 | 2 | 正文（其中一块还是 IIFE 源码） |
| Noto Sans SC | 13 | 202 | 2 | — |
| Noto Sans SC | 15 | 97 | 1 | — |
| Noto Sans SC | 14 | 63 | 1 | — |

`<p>` 元素的字符预算：14px **251** / 13px **235** / 16px **191** / 15px **97**。`document.body` 的 `font-size` 是 **16px**。

**结论**：`probe.mjs` 把「字数最多的那个 字号桶」定义成 body。在一个列表型工具里，**每行 3 条元数据（13px）自然压倒散文（16px）**，于是 body 被判成 13px。这不是设计缺陷，是「用文本长度投票选 body」这个口径在数据密集界面上失效。

而 `_CONTRACT.md:194-201` 已经登记了同类问题（`measure` 的 0.5em 假设、`mono` 的中文等宽槽、`font-count` 的中文下限）——**说明这个仓库早就有「规则对中文/工具界面结构性不利」的豁免机制，只是 `body-size` 没被登记进去**。

---

## P3「`taste-skill-ignore` 逐行豁免是可行机制」→ **部分成立；作为「守卫」不成立**

### 事实 1：机制确实在跑，而且用了不少

```
$ grep -c taste-skill-ignore  （全库 prototypes/**/*.{html,css,js}）
S13-blind-debossed-dispatch          19
S23-exposed-plaster-chronology-wall   8
S21-interlocking-release-book          6
S03-long-exposure-observatory          4
S07-slate-ink-contents                 3
S04-mango-collage-wall                 2
合计                                   42
```

**42 处，分布在 6 个案、7 个文件里，全部是 `git ls-files` 可见的已跟踪文件。**

### 事实 2：但它守不住任何东西——`tools/` 跟踪文件数 = 0

```
$ git check-ignore -v tools/.../lint.mjs
.gitignore:2:tools/    tools/taste-skill/skills/taste-skill/scripts/lint.mjs
$ git ls-files tools | Measure-Object | Count
0
```

**这是本轮最锋利的一刀**：仓库里躺着 **42 条** `taste-skill-ignore` 注释，它们引用的那个 `lint.mjs` **一行都不在仓库里**。

而且 README 自己承认了这件事（`README.md:223`）：

> ⚠️ 但 `box-shadow`／`mono`／`button-fx` **不在那个脚本里**（脚本内 `shadow` 出现 0 次），它们由**仓库外**的 `tools/taste-skill/…/rules.mjs` 判定，**克隆者须自备 `tools/` 才能复算这几项**

`README.md:295` 再说一遍：

> ⚠️ 本命令还依赖 `prototypes/_build/` 之外的 `tools/taste-skill/…/inspect.mjs` —— **`tools/` 被 .gitignore 排除、不在仓库里。**

而 `README.md` / `README-EN.md` / `prototypes/_CONTRACT.md` 对 `taste-skill-ignore` 这个**标记本身**的说明：**0 处**。

→ **一个克隆者会看到 42 条他无法解释、无法验证、也无法复算的注释。** 那些注释在他的机器上是纯噪声——甚至更糟：它们会让人以为「这些东西检查过」。

### 事实 3：那 42 条注释实际掩盖了多少？

我写了 `probe-ignore-delta.mjs`：把文件复制到探针目录，把 `taste-skill-ignore` 替换成无意义字符串，再 lint 一次，取差。

| 文件 | 注释数 | 有注释时 FAIL | 注释失效后 FAIL | **被掩盖** | 掩盖的规则 |
|---|---|---|---|---|---|
| `S13/style.css` | 19 | 16 | 30 | **14** | `shadow×12`、`mono×1`、`hairline×1` |
| `S23/style.css` | 8 | 0 | 8 | **8** | `gradient×5`、`hairline×3` |
| `S21/style.css` | 6 | 0 | 5 | **5** | `shadow×5` |

**S23 和 S21 的「0 FAIL」是注释买来的。** 把注释撤掉，`S23` 立刻有 5 条 gradient + 3 条 hairline，`S21` 立刻有 5 条 shadow。

而 `S13` 更值得注意：**它带着 19 条注释仍然有 16 条 FAIL**（`shadow×11` + `emoji×5`）。也就是说注释只买到了一半清白。

### 事实 4：如果要把 `_selection` 做到 0 FAIL，需要加多少条？

```
$ node probe-ignore-cost.mjs（跑真 lint，按「行」去重）
FAIL_before:                30
ignore_comments_needed:     30     ← 每一行 FAIL 各需一条
FAIL_from_data_blobs_js:     0     （这次只喂了 4 个 chrome 文件）
FAIL_from_product_chrome:   30
按规则：emoji 15 / hairline 9 / eyebrow 2 / shadow 2 / gradient 1 / numbering 1
```

**30 条注释**换来一个 `0 FAIL`。这 30 条会掩盖：

- 14 条 emoji **在施工注释里**（本该由 lint 修，不该由产品加注释）
- 9 条 hairline 里 **3 条是规则明文允许的 form field**
- 2 条 eyebrow 是**类名腐化**（`.mast-kicker` 早已没有 kicker 的样式特征：14px、无 `text-transform`、无 `letter-spacing`，见 `style.css:123`）
- 1 条 numbering 在注释里
- 1 条 gradient 是**空截图占位**（`.shot.is-empty::before` 的斜纹，`style.css:435-438`）——一个「没有截图」的状态指示
- 2 条 shadow 里 1 条是 inset 选中标记、1 条是**真 outer shadow**

→ 30 条注释里，**真正在掩盖真缺陷的只有 1–2 条**；其余的注释会**把 lint 的 bug 变成产品的水印**。

### 判决

**机制存在（部分成立），但把它当「守卫」用会失败（不成立）**，三条独立理由：

1. **守卫不在仓库里** → 对任何克隆者，豁免注释不可解释、不可复算。
2. **豁免是逐行全规则静音**（`lint.mjs:73` 在规则循环之前 `return`）→ 一行上加注释会同时关掉这一行的**所有**规则，包括以后新加的。
3. **它已经在掩盖真缺陷**：S13 的 14 条、S21 的 5 条、S23 的 8 条。

---

## P4「12 条规则必须渲染才能测，所以要补 probe 闸门」→ **不成立**

### 攻击 1：不是 12 条，是 41 条（渲染独有）

Lead 的证据是「`lint.mjs` 有 23 条静态规则；`probe.mjs` 是 CDP 真浏览器探针」。我把两层拆开数（`probe-render-only.mjs`）：

```
static_ids:      22   （23 个条目，numbering 占两档）
judge_sites:     52
judge_ids:       46
render_ids:      52   （judge 46 + inspect 滚动带 6）
union:           63
RENDER_ONLY:     41
STATIC_ONLY:     11
IN_BOTH:         11
render_FAIL_capable: 30
render_WARN_capable: 30
```

**「12 条」既不等于 41、也不等于 35、也不等于 6。** 如果指的是「只在渲染层才有的规则」，那是 **41** 条——**扣掉滚动/动效带的 6 条是 35 条**，恰好等于 Lead 自己在 `LEAD-recon.md:142-143` 写的「只在动态里有、静态完全覆盖不到的 **35** 条」。

**所以 P4 的前提数字与 Lead 自己的侦察记录互相矛盾。** 这条我按「必须引用我自己的数」的规则复算了两遍：第一版探针（`probe-rule-surface.mjs`）的正则要求 `add(` 后紧跟 `'FAIL'`/`'WARN'`，漏掉了三元式

```js
// rules.mjs:73
add(s.hairlines >= 2 ? 'FAIL' : 'WARN', 'hairline', ...)
```

于是 `hairline` 被误判为「声明了但从不发射」。**那是我的 bug，不是仓库的。** 修正后（`probe-rule-surface-v2.mjs`）`hairline` 正常计入 46，`judge()` 是 52 个发射点而不是 51。

**修正后仍成立的一点**：`RULE_IDS` 声明 52 个，`judge()` 只发 46 个，差集 6 个全部由 `inspect.mjs` 发射：

```
declared_but_no_judge_site:
  covered-text, clipped-text, pinned-over-picture, empty-screens, long-pin, still-page
```
它们需要**逐屏滚动 + 动效采样**才能判，不单是「渲染」。这也是耗时从 1 s 涨到 61 s 的那一段。

### 攻击 2：`focal-point` 在 30 案语料上从未触发过

`probe-corpus-aggregate.mjs` 汇总 30 个已入库的 `.inspect/report.json`：

```
reports: 30
totalFail: 6    totalWarn: 79
cleanCases: 26

failRuleFrequency:   mono 3 / palette-terracotta 1 / font-count 1 / empty-screens 1
warnRuleFrequency:   no-footage 30 / font-count 27 / palette-cream 6 / measure 4
                     body-size 3 / hairline 3 / card-rows 2 / still-page 2
                     side-scroll 1 / font-fallback 1

renderGateOnCorpus（Lead 想补的那几条，在 30 案上已有的触发次数）：
  focal-point    FAIL 0  WARN 0      ← 从未触发
  few-pictures   FAIL 0  WARN 0      ← 从未触发
  headline-lines FAIL 0  WARN 0      ← 从未触发
  empty-screens  FAIL 1  WARN 0
  hairline       FAIL 0  WARN 3
  still-page     FAIL 0  WARN 2
  measure        FAIL 0  WARN 4
  body-size      FAIL 0  WARN 3
  no-footage     FAIL 0  WARN 30     ← 30 案全部触发（已经不是判据）
```

**`focal-point` 和 `few-pictures` 在 30 个「合规样板」上 FAIL=0 且 WARN=0。** 一条从未在标定语料上响过的规则，它的阈值没有被校准过——它只是一条「从别处抄来的、在中文站上恰好不响」的规则。

然后在**模板 M01** 上，它俩同时 FAIL：

```
M01 findings（inspect.mjs, 14 条）：
  FAIL headline-lines   w=1440  3 行标题
  FAIL eyebrow          w=1440 5 个 kicker
  FAIL numbering        w=1440 "01","02","03","04"
  FAIL shadow           w=1440 3 个 box-shadow
  FAIL hairline         w=1440 12 条
  FAIL outlined-box     w=1440 4 个
  FAIL icon-cards       w=1440 1 排 3 卡
  WARN grey-body        w=1440 6.7:1
  FAIL few-pictures     w=1440 Only 0 picture(s)      ← 模板里 0 张图
  WARN no-footage       w=1440
  FAIL focal-point      w=1440 largest type 44px (3.1vw)
  FAIL still-page       w=1440 Only 0 element(s) moved
  FAIL headline-lines   w=390
  WARN side-scroll      w=390
```

注意 `few-pictures: Only 0 picture(s)` 与 `brokenImages: []` **同时成立**——因为 `hero.jpg` 没有真文件。**探针测不出「占位符是不是真的」。**

### 攻击 3：实测耗时——单跑 `_selection` 61.3 秒，单跑模板 33.3 秒

| 命令 | 实测耗时 | 产出 |
|---|---|---|
| `verify-prototype.mjs --all`（30 案） | **1.9 s** | 只读现成 `report.json`，**不渲染** |
| `check-docs.mjs` | 0.66 s | 13 项 |
| `check-docs.mjs --selftest` | 6.66 s | 10 个用例 |
| `check-anchors.mjs` | 0.54 s | 30 案 |
| `check-stale.mjs` | 0.51 s | 30 案 |
| `lint.mjs`（6 个文件） | 1.17 s | 静态 |
| `lint.mjs prototypes/_selection`（9 文件） | 0.93 s | 静态，115 FAIL |
| **`inspect.mjs prototypes/_selection/index.html`** | **61.3 s** | 3 档渲染 + 10 张截图 |
| **`inspect.mjs templates/M01-clean-corporate/index.html`** | **33.3 s** | 3 档渲染 + 6 张截图 |
| **`render-scheme.mjs S14`** | **52.5 s** | 1 案 3 档 + 写入 `.inspect/` |

**关键对比**：Lead 说的「30 个原型跑一遍 `verify-prototype --all`」只要 **1.9 秒**——因为它**根本不渲染**，只读 6 天前/8 天前的 `report.json`。把 30 案真正重渲染一遍的代价约 `52.5 s × 30 ≈ 26 分钟`。

**「单跑 `_selection` 要 30 秒以上，它会进 CI 吗？」——我的实测答案是「不会，而且不应该」**：

1. 单跑产品 **61.3 s**，比整个 `--all` 慢 **32 倍**。
2. 仓库里**没有任何 CI**：`.github/` 不存在，`*.yml/*.yaml`（排除 node_modules/tools/.git）**0 个**。
3. 它需要 **Chrome**（`cdp.mjs:11-23` 的 `findChrome()`），而 README 承诺「零依赖、无 `npm install`」。**渲染闸门是唯一会打破这个承诺的东西。**
4. README 自己把这条路标成可选：`README.md:295-297`「⚠️ 本命令还依赖…**克隆者须先自行取得该工具**；只想看截图就用下面的 `shot.mjs`（不依赖 tools/）」。

### 攻击 4：12 条里哪些对工具型界面明确不适用——判据 + 规则原文

| 规则 | 规则原文（`rules.mjs`） | 触发的形态假设 | `_selection` 实测 | 判决 |
|---|---|---|---|---|
| `few-pictures` | "Only N picture(s) on the page (${realPictures} photographs, footage or raster images, ${uiPictures} interface fragments). **Drawings in SVG do not count.**" / fix: "Find real pictures of **the subject's world**" | 页面在介绍一个有实体世界的主体 | `realPictures = 30`（三档：30/30/0），`fewPicturesOk = true` | **规则对该页不适用，但该页恰好通过**。注意 390 档 `realPictures = 0` → `fewPicturesOk = false`，但 `judge()` 有 `if (width >= 1100)` 守卫（`rules.mjs:111`），手机档不跑 |
| `focal-point` | "Make one thing lead: the headline at display size, or one large picture. **A grid of many small pictures is not one thing**; in blind tests jurors marked a first screen without a headline down every time." | 首屏是**叙事入口**（一个主导视觉） | `heroVw = 5.1`（≥4.5）→ `focalOk = true`；但**主导元素是 h1，不是列表** | **对列表页不适用**。它的「一个主导元素」与「首屏出完整卡片」直接冲突（Lead 自己的 §根因链 记录了 `--s-h1` 往返） |
| `no-footage` | "Look for one honest clip with scripts/assets.mjs --video (the place, the material, the process)" | 有可拍摄的实体 | `videoCount = 0`，30 案里 **30/30** 全 WARN | **不适用**。30 个样板案 100% 触发 → 它已经不是判据，是背景噪声 |
| `still-page` | "Build the motion layer (SKILL.md step 9): the signature move, an entrance for **the parts of every section**, feedback on every control, and **one moving picture**." | 营销页的分区入场编排 | `motionElements = 30`（1440 档）→ 远超 `MOTION_MIN = 8`，不触发 | **不适用**。工具界面的「动」是交互反馈，不是入场编排 |
| `empty-screens` | "An empty screen is a rest only once per page. Elsewhere it means the section is underbuilt" | 分段叙事，每屏都该有内容 | `emptyScreens = 0`（三档最小填充 0.33/0.34/0.5） | **不适用**。列表页不会「空屏」 |
| `headline-lines` | "A title holds to two lines. A statement … may run longer, but only at statement size" | 标题是**文案**（可删字） | `over2Lines = 0` | **适用**（无害，且已通过） |
| `measure` | "Cap paragraphs at 45–75 characters (max-width: 60ch)" | 拉丁字母 0.5em 假设 | 报 109 字符/行 → 真实约 54 汉字（`_CONTRACT.md:188-191` 已登记） | **对中文不适用**（已登记豁免） |
| `body-size` | "Body copy 16–20px. Map small sizes from blueprints onto your body step." | 主体是连续散文 | body 被判 13px，但 13px 桶 6958 字里 44 块**全是方案元数据**；`<p>` 里 16px 占 191 字、`body` 是 16px | **对数据密集界面口径失效**（本报告 §P2 附录实证） |
| `contrast` / `overflow` / `broken-image` / `ui-wrapper` | 与界面类型无关 | — | `consoleErrors 0`、`horizontalOverflow 0`、`brokenImages []` | **明确适用**，且已通过 |

**净结论**：把 52 条渲染规则里的「工具界面不适用」那批（`few-pictures` / `focal-point` / `no-footage` / `still-page` / `empty-screens` / `measure` / `body-size`）扣掉，剩下对产品**真正有意义**的只有约 6 条（`contrast` / `overflow` / `broken-image` / `headline-lines` / `ui-wrapper` / `error`），而它们**现在全部通过**。

---

## P5「产品在教用户避开 AI 味，自己却不守，这是虚伪」→ **不成立（反向成立）**

### 原文（`prototypes/_selection/style.css:1-11`，完整引用）

```css
/* 选型台
   这是一件**工作台**，不是作品集封面页：信息密度优先，装饰让位于检索。
   底色与强调色刻意选在 30 个案会被判违规的那些窗口之外：
   #E7E7E2 明度 89.6% 但饱和只有 9.4%（palette-cream 要 s≥16%）；三个信号色明度都在 42% 以下（palette-terracotta 要 l≥42%）。
   这份页面本身不受那 30 条规则约束，但没必要去踩同一批坑。

   过闸门时改掉的几处（都是工具指出后就承认的问题，不是绕）：
   1 三级文字对比度 4.2:1 → 5.6:1；2 小字下限收到 13px（原先 11/12px 有 115 处）；
   3 大标题 3.8vw → 5.2vw（首屏要有一个明确的主导元素）；4 头部标签从全大写 11px 微标签
   改成 14px 句首大写；5 行分隔线 1px → 2px（1px 被判为装饰性细线）；
   6 截图缩略图不再用 1px 描边框；7 工具条不再 sticky（sticky 会让大标题在滚动中被压住）。 */
```

### 这句话现在还成立吗？——**逐条复核，成立，而且比 Lead 以为的更成立**

Lead 的「虚伪」论点假设产品**没有**在守。但原文列的 7 处修改都能对上：

| 自述 | 我的实测 | 成立？ |
|---|---|---|
| 「不受那 30 条规则约束，但没必要去踩同一批坑」 | 主动避开了 `palette-cream` 窗口（#E7E7E2 s=9.4% < 16%）与 `palette-terracotta` 窗口（信号色 l<42%）。实测 `palette-cream = 0`、`palette-terracotta = 0` | ✓ |
| 「三级文字对比度 4.2 → 5.6」 | `style.css:19` 注释 `原 #6f6c64 对底只有 4.2:1`，现 `--ink-3: #56534b` | ✓ |
| 「小字下限 13px」 | 实测 `smallText = 0`（三档） | ✓ |
| 「大标题 3.8vw → 5.2vw（首屏要有一个明确的主导元素）」 | 实测 `heroVw = 5.1`（1440）、5.2（768）、6.7（390），`focalOk = true` | ✓ |
| 「头部标签改成 14px 句首大写」 | `style.css:123` `.mast-kicker { font-size: var(--s-14); }` 无 `text-transform` 无 `letter-spacing`。但 `lint` 仍按**类名**报 `eyebrow` FAIL——**这是类名腐化，不是没改** | ✓（改过了） |
| 「行分隔线 1px → 2px」 | **部分不符**：剥注释后 border 宽度分布 `{1:24, 2:14, 3:1, 4:2, 5:3}`，**24 处仍是 1px** | ✗ 这句自述已过期 |
| 「截图缩略图不再用 1px 描边框」 | 实测 `outlinedBoxes = 0`（三档） | ✓ |
| 「工具条不再 sticky」 | 实测 `nav.fixed = false`（三档） | ✓ |

**8 条自述里 7 条经得起实测，1 条（行分隔线）已腐化。** 这不是「虚伪」，这是**一份写了 6 天的自述，有一条过期了，而没有任何机制发现它**。

### 反向论点：中性的工具界面是**功能**，不是**缺陷**

原文第一句就是「这是一件**工作台**，不是作品集封面页：**信息密度优先，装饰让位于检索**」。

这个定位恰好回答了 Lead 的反向问题：**30 个案是 30 种审美主张；产品是那把尺子。尺子上有花纹，量出来的就不准。** 如果 `_selection` 也有强烈的审美主张，用户在比较 S01 的构成主义红黑和 S14 的航天深蓝时，会被选型台自己的调性干扰。

**证据**：`_selection` 的实际审美参数（实测）是**刻意中性**的：

- `border-radius: 0`（`surfaces.boxRadius = 0`，三档）
- 单一中性灰底 `#E7E7E2` + 三个低明度信号色（fail/warn/pass）
- `shadowStatic = 0`、`gradients = 0`、`outlinedBoxes = 0`
- 字体 2 族（`Archivo` 59% + `Noto Sans SC` 41%），等宽只留给 `<code>`

**这是「克制」，不是「偷懒」。** 且 `style.css:26-33` 还专门记录了把 IBM Plex Mono 从数字槽撤掉的决策（「排的是数字不是代码，那条判得对」）。

### 判决

**「产品自己无 AI 味」不是产品的目标，也不该是。** 产品的目标是「让 30 种不同的审美各自说话」。P5 的论点不但不成立，它的**反面**才是真的：**产品已经在守，只是守的理由是「必要」而不是「合规」，而且它守的记录没有被验证。**

---

## P6「P2 卫生债（986 个未跟踪文件）值得修」→ **数字与判断都错**

### 攻击 1：不是 986，是 987（且 `-uall` 展开是 5116 文件 / 369.7 MB）

```
$ git status --porcelain | Measure-Object | Count
987     ← 开工基线
989     ← 本轮收尾（+2 是我自己新建的探针）
```

**Lead 说 986，我实测 987（开工基线）/ 989（收尾）。** 无论取哪个，都不等于 986。

用 `-uall` 展开目录：

```
total untracked (uall): 5116
  按扩展名： .woff2 1813 / .mjs 744 / .jpg 691 / .txt 505 / .png 448 / .json 386 / .css 131 / .js 94 / .html 56 / .py 30 / .md 19 / .webp 12
  按目录： 65-exec 168 / 66-plan 122 / 66-audit 121 / 67-plan 92 / 67-exec 85 / 66-exec 80 / 67-audit 66 / 65-plan 66 / 65-audit 60 / 62-verify 38 …
```

**总体积 369.7 MB —— 已跟踪仓库是 2162 文件 / 182.1 MB。未跟踪的是已跟踪的 2 倍。**

### 攻击 2：`--ignored` 实测——81 条已被忽略，但**大头没被忽略**

```
$ git status --porcelain --ignored=matching | 筛选 '^!!'
ignored entries: 81
  .taste-skill/ .tmp_s19c_pixels.py _audit2/ _audit3/ _audit4/ _audit_s08/
  _compiler-insert-annotations.ps1 _compiler-update-11f7.ps1 _compiler-update-docs.ps1
  _readme-skill-fetch/ _tmp_gate_final.txt
  deliverables/37-scratch/ … deliverables/51-scratch/（22 个 scratch 目录）
```

`.gitignore` 第 62 行已经有 `deliverables/*-scratch/`。**但 `63-test` 到 `67-*` 这些目录不叫 `*-scratch`，所以一条都没被忽略。**

### 攻击 3：主体不是报告，是一份**整站副本**

```
按目录体积（前 3）：
  deliverables/63-test    1685 文件  115.0 MB   ← 最大
  deliverables/66-exec     472 文件   80.0 MB
  deliverables/67-exec     250 文件   40.1 MB

63-test 内部构成： .jpg 407 (60.5 MB) / .woff2 942 (29.1 MB) / .otf 2 (17.4 MB) / .png 48 / …
63-test/replica/ 下有 9 个 `S*` 目录 + `_fonts`，对应 prototypes 里的同名方案
```

我逐字节比对了 9 个 replica 的 `index.html` + `style.css`（9 × 2 = 18 对）：

```
identical = 16    different = 2   （仅 S18 的 index.html 与 style.css 不同）
replica 总计：1421 文件 / 100.8 MB
  其中 9 个 S* 目录：71.0 MB（_fonts 占其余 ~29.8 MB，与 prototypes/_fonts 同源）
S03: prototypes 28 文件 1.87 MB  vs  replica 31 文件 1.93 MB
```

**这是「把 9 个原型整站复制一份，改了一个案」的复现实验目录。** 它的价值是「S18 的改造实验」，代价是 **100.8 MB 中约 70 MB 是重复字节**（16/18 对文件逐字节相同）。

**而 `deliverables/63-test` 在已跟踪文件里 0 引用**：

```
$ git grep -c "63-test" -- README.md README-EN.md
（无输出）
```

### 攻击 4：报告引用探针脚本的频率——19 份未跟踪 md，几乎不引用

```
$ git status --porcelain -uall | 筛 '*.md'  → 19 个
逐个抽 .mjs/.ps1/.py 引用：
  deliverables/63-test/data/final-rows.md                        0 refs
  deliverables/63-test/replica/S03.../CREDITS.md                 1 refs (write-credits.mjs)
  deliverables/63-test/replica/S14.../CREDITS.md                 6 refs (bake-plates.py, fetch-assets.ps1 …)
  deliverables/63-test/replica/S14.../build/ASSETS-NOTES.md      5 refs
  deliverables/65-audit/lab/tables.md                            0 refs
  deliverables/65-exec/_cut/EXEC-data-cut.tpl.md                15 refs
  deliverables/65-exec/_cut/for-doc.md                           0 refs
  deliverables/65-exec/_cut/scan-before-after.md                 0 refs
  deliverables/65-verify/tmp/en-head/README-EN.md               14 refs
  deliverables/66-audit/tables2.md                               0 refs
  deliverables/66-audit/tpl-audit/matrix.md                      0 refs
  deliverables/68-plan/LEAD-recon.md                             4 refs (check-stale, lint, rules, verify-prototype)
```

**19 份里 8 份（42%）零引用；被引用的脚本绝大多数是 `prototypes/_build/` 里的已跟踪脚本，不是同目录的探针。**

**「如果删了报告就不可复现」——实测不成立**：报告引用的 `write-credits.mjs` / `collect-schemes.mjs` / `make-textures.py` / `inspect.mjs` **全部在 `prototypes/_build/` 里且已跟踪**（`git ls-files prototypes` = 1974 个文件）。真正会丢的只有 `fetch-assets.ps1` 这类一次性抓取脚本。

### 攻击 5：删 vs 加 gitignore vs 提交——三条路的代价

| 路径 | 代价 | 收益 | 风险 |
|---|---|---|---|
| **删** | 一次性 369.7 MB 不可恢复（除非先归档）；`63-test/replica` 的 S18 实验会丢 | 仓库瘦身 | **会毁掉 19 份报告里的 11 份的复现链**（那 11 份引用了同目录或已跟踪脚本）；`deliverables/65-exec/_cut/EXEC-data-cut.tpl.md` 引用 15 个脚本，其中 `accept.mjs`/`build-prompts.mjs` 等可能只在 `_cut/` 里 |
| **加 gitignore** | 改 `.gitignore` 1 行（`deliverables/6[3-8]-*/`）；**但会让这些目录对 `git status` 永久隐形** | 立刻消除 987 项噪声 | 与现有 `deliverables/*-scratch/` 语义冲突（这些不是 scratch）；且 `.gitignore` 第 51 行的教训（「漏掉这一条我曾把 2833 个文件误提交进去过」）说明这层过滤是必要的，但**不该把 `63-test/replica` 这种有实验价值的目录一起埋掉** |
| **提交** | 987 项 / 5116 文件 / **369.7 MB**，GitHub 单仓库软限 1 GB、单文件 100 MB | 复现链完整 | **71 MB 是逐字节重复**；`63-test` 1681 文件里 942 个 `.woff2` + 407 个 `.jpg` 是素材副本，**会把 Pages 部署体积翻倍**（README 承诺「零依赖、页面自托管」） |

**我的判断**：三条路都不该走。**真正的第一步是「分类」**——把 5116 个文件按「被引用 / 未被引用」「重复 / 唯一」「脚本 / 产物」打标，再决定。而这件事的**用户可感知后果是 0**，所以它在 P7 里排不进前三。

---

## P7「本轮最该做的事是补守门员」→ **不成立**

### 为什么不是「补守门员」

上面六条的攻击汇总成一句话：**补守门员这件事，补的那一层恰好是已经失效的那一层。**

- 静态 lint 在真注释上误报 15/30，在 form field 上误报 3/9，在数据文件上误报 85 条（§P2）
- 渲染闸门在 30 案上把 `focal-point`/`few-pictures`/`headline-lines` 全部判 0 次（§P4）
- 补上之后，`_selection` 会从「1 条真缺陷（缺 CREDITS）」变成「30 条 FAIL」，而其中 28 条需要注释掩盖（§P3）
- 而产品真正的病——**报告冻结 6 天**——两套规则都查不到（§P1.5）

### 我认为最该做的三件事（按用户实际能感知的后果排序）

**第 1 件：让 `_selection` 的冻结报告变成会说话的东西（而不是再造一层闸门）**

用户可感知的后果：**选型台现在展示的「FAIL 0 / WARN 2 / 30 张截图」是 6 天前的**。这 6 天里 `style.css` 改了 +842 行、`app.js` +1118 行。**用户看到的是旧修订的闸门结论。**

最小修法（代价 < 1 小时）：把 `check-stale.mjs` 的目录选择器从 `/^S\d{2}-/` 提到参数：
```js
// 现状：if (!/^S\d{2}-/.test(d.name)) continue;
// 最小改动：加一个白名单
const EXTRA = ['_selection'];
if (!/^S\d{2}-/.test(d.name) && !EXTRA.includes(d.name)) continue;
```
然后**重渲染一次** `_selection`（61.3 s），把 `report.json` 的 `at` 更新到今天。

这条修完，`check-docs` 的 `nums/gate` 会立刻发现「26 案达标」这个数字是否需要改（实测当前仍是 26，4 案不达标 —— 巧合一致）。

**第 2 件：修 `lint.mjs` 的两个真 bug，而不是给产品加 30 条注释**

用户可感知的后果：**S13 现在带着 19 条 `taste-skill-ignore` 仍有 16 条 FAIL**，其中 11 条是真 `shadow`。这些不是产品的问题，是 lint 的：

1. **跨行块注释不被跳过**（`lint.mjs:73,80` 只看行首）。修法：像我这轮的 `probe-comment-state.mjs` 一样维护 `inBlock` 状态。**修完这 14 条 emoji 误报直接消失**。
2. **`hairline`/`outlined-box` 的 form-field 豁免只认标签名**（`lint.mjs:77`）。修法：把 `.field` / `.field-fold` / 表单语义类名加进判据。**修完 `_selection` 的 3 条 hairline 误报消失**。
3. 顺带：`data.js`/`prompts.js`/`prompt-copy.js` 这类**纯数据文件**应该被 lint 跳过（`SKIP` 集合加一个 `*.data.js` 约定，或按「文件里 >80% 是字符串字面量」判）。**修完 85 条数据误报消失**。

**这三个修法没有一条需要碰产品。** 而它们的收益是：`S13` 的 19 条注释可以撤掉 14 条、`S21` 的 5 条、`S23` 的 8 条 —— **全库 42 条注释里至少 27 条可以撤**。

**第 3 件：把 `tools/` 的不可复算性写进 README（或者把 lint 收进库）**

用户可感知的后果：**克隆者会看到 42 条他无法解释的 `taste-skill-ignore`**，以及 README 里 3 处「须自备 tools/」的警告，但**没有任何一处解释这个标记是什么**（`README.md`/`README-EN.md`/`_CONTRACT.md` 合计 0 处提及）。

两条路，二选一：

- **A（推荐，代价 10 分钟）**：在 `README.md` 的「做不到与已知边界」加一条：`taste-skill-ignore` 是什么、由谁读、为什么下游读不到、以及「看到这些注释不代表检查过」。
- **B（代价 2 小时）**：把 `lint.mjs` + `lib/rules.mjs`（~28 KB，MIT）作为 `prototypes/_build/vendor/` 收进库——`tools/` 是 vendor 目录，但 `rules.mjs` 的**规则文本**是这个仓库的立论依据，一直不在库里本身就是个矛盾。

**而 `_selection` 补闸门、M01-M03 补渲染、986 个文件清理——这三件都不在前三。**

理由：它们要么**用户看不见**（文件清理），要么**会让现状变差**（补 lint 扫描 = 30 条误报进仓库），要么**收益已被证明是 0**（`focal-point`/`few-pictures` 在 30 案上 0 次触发，在 M01 上触发但那是占位符模板，不该被当作品牌页判）。

---

## 附录 A：一次只读越界，已完整还原

`render-scheme.mjs S14` 会写入 `prototypes/S14-.../.inspect/`（10 个已跟踪文件）。我在测耗时时跑了它，导致：

```
$ git status --porcelain | grep -v '^??'
 M prototypes/S14-zero-g-launch-sequence/.inspect/desktop-fold.jpg
 M prototypes/S14-zero-g-launch-sequence/.inspect/desktop-page-01.jpg
 … 共 10 项
```

**已用 `git checkout -- prototypes/S14-zero-g-launch-sequence/.inspect` 还原**，复核：

```
$ git status --porcelain | grep -v '^??'      → 空（无已跟踪文件被改）
$ git rev-parse HEAD                            → ce4ea78…
$ node prototypes/_build/check-stale.mjs        → ✓ 全部新鲜
```

`check-stale` 复核通过说明 mtime 也回到了 `report.at` 之后的一致状态。

**其余所有探针只写 `deliverables/68-plan/probes/`**，对 `prototypes/` `templates/` `README*` `tools/` 零写入。

---

## 附录 B：探针清单（全部在本目录，可直接复跑）

| 探针 | 作用 | 关键产出 |
|---|---|---|
| `probe-lint-classify.mjs` | 按规则/文件/注释行分类 lint --json | §P2 的 30 FAIL 拆分 |
| `probe-comment-state.mjs` | **跨行块注释状态机**，判 finding 在真注释还是真代码 | §P2 的「15 条在真注释里」 |
| `probe-rule-surface.mjs` | 数三套实现的规则面与差集 | ⚠️ **v1 有 bug**（漏三元式 `add()`），`hairline` 判错；结果已被 v2 取代 |
| `probe-rule-surface-v2.mjs` | 修正版：解析 `add(...)` 到配对右括号，收全部引号 id 与 `'FAIL'/'WARN'` 字面量 | judge 46 id / 52 发射点 |
| `probe-render-only.mjs` | 精确算 `RENDER_ONLY / STATIC_ONLY / IN_BOTH` | 41 / 11 / 11，并集 63 |
| `probe-rule-levels.mjs` | 每条规则的 FAIL/WARN 档位 | ⚠️ 同 v1 缺陷，仅作参考 |
| `probe-ignore-cost.mjs` | 达到 0 FAIL 需要多少条 ignore | §P3 的「30 条」 |
| `probe-ignore-delta.mjs` | **撤掉注释后 FAIL 的增量** | §P3 的 S13=14 / S23=8 / S21=5 |
| `probe-corpus-aggregate.mjs` | 汇总 30 案 report 的规则触发频次 | §P4 的 `focal-point 0/0`、`few-pictures 0/0` |
| `probe-metrics.mjs` | 从单份 report 抽关键指标 | §P4 的 focal/few 判据 |
| `probe-chars-per-size.mjs` | **CDP 复测「每字号字符预算」** | §P2 附录的 body-size 口径证据 |
| `verify-all.txt` / `verify-all.time.txt` | 30 案闸门耗时 | 1.9 s |
| `inspect-selection.txt` / `.time.txt` | 产品渲染耗时 | 61.3 s |
| `lint-selection-4files.json` | Lead 的 4 文件口径 | 30 FAIL / 16 WARN |
| `lint-selection-DIR.json` | 整个 `_selection` 目录 | 115 FAIL（数据 85 / chrome 30） |
| `lint-datajs.json` | `data.js` 单文件 | 30 FAIL |
| `lint-templates.json` | 3 个模板 | 60 FAIL / 12 WARN |

---

## 附录 C：给 Lead 的三条「不要再做」建议

1. **不要再用「29 FAIL」这个数**。它是 4 个文件的、未分类的、把 lint 自身 bug 算进产品的计数。用 §P2 的拆分表：**真缺陷 5–6 条，误报 24–25 条**。
2. **不要再把 `_selection` 的「FAIL 0」当作通过**。它是 6 天前的。要么重渲染，要么在报告旁边写「stale since 2026-10-21」。
3. **不要给 `_selection` 加 `taste-skill-ignore`**。全库 42 条已经证明了这条路会把 lint 的 bug 变成产品的水印；而 S23/S21 的「0 FAIL」就是这条路的成品——**注释撤掉，它们立刻有 13 条 FAIL**。
