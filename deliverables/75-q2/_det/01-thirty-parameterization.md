# 「30」的硬编码测绘：Q2 新增 N31–N35 的前置阻塞清单

> 测绘对象：`D:/Web/style`，「方案总数 = 30」这个数字在产品面出现的**每一个**位置。
> 方法：全仓 `grep -rnE` + 逐处原文核对 + **变异实测**（把某个 30 改成 40/35，跑真闸门看它红不红）。
> 本文件只做测绘，不改源码。所有断言都带 `file:line` 与原文照抄。
>
> **规模**（实测计数，正则 `(?<![\d.A-Za-z])30(?![\d.])` + 中文 `三十`）：
>
> | 文件 | 裸 `30` | `三十` | 行数 | 其中与本任务相关 |
> |---|---|---|---|---|
> | `README.md` | 44 | 0 | 34 | 31 行 |
> | `README-EN.md` | 44 | 0 | 33 | 30 行 |
> | `index.html`（仓库根） | 2 | 0 | 2 | **2 行（全中）** |
> | `prototypes/_selection/index.html` | 15 | 3 | 18 | 6 行（其余是注释/尺寸） |
> | `prototypes/_selection/wizard.html` | 4 | 0 | 4 | **4 行（全中）** |
> | `templates/*/README.md` | — | — | 25 | 22 行 |
> | `prototypes/_CONTRACT.md` + `_specs/_CURRENT-VALUES.md` | — | — | 5 | 4 行 |
> | 闸门/生成脚本（`_build/*.mjs`、`_prompts/*.mjs`） | — | — | 30+ | 22 行 |
> | `.github/workflows/gates.yml` | — | — | 2 | 2 行 |

---

## 一句话结论

**新增 5 案前必须先改 15 处；其中 10 处漏改不会报任何红，产品会静默地对用户说错话。**

最短的正确路径是这 8 条（按阻塞强度排序）：

| # | 文件:行 | 漏改的后果 |
|---|---|---|
| 1 | `prototypes/_build/collect-schemes.mjs:338` | 新 5 案**不进 `data.js`**，站点继续显示 30 案，零报错 |
| 2 | `prototypes/_prompts/build-prompts.mjs:243` | 新案提示词变成「请把整页做成这个风格：。」（`plain` 空串兜底） |
| 3 | `prototypes/_build/extract-specs.mjs:14-18,55,62` | 新案规格文件永不生成 |
| 4 | `prototypes/_build/summarize-all.mjs:70` | 缺案检查只覆盖 1..30 |
| 5 | `prototypes/_build/check-docs.mjs:175-177,256,261,266,271,279,283,284` | CI 的 blocking step `--selftest` **exit 2** |
| 6 | `README.md` / `README-EN.md`（30 + 28 行） | 对外数字错误（部分会被 `nums/schemes` 抓，多数不会） |
| 7 | `index.html`（根）`6,7` + `_selection/index.html` `6,7,98,188,197,326` + `wizard.html` `7,21,23,65` | title/meta/UI 继续显示 30；**全部零闸门覆盖** |
| 8 | `.inspect/` 的 272（两份 README 共 14 处 + 2 条锚点） | 页面上的「272 张真截图」与实际不符；**零闸门覆盖** |

真正致命的**不是** README 里的「30 个方案」——那一处漏改会立刻被 `check-docs` 抓红（§4.1 实测 6 个句式全部报红）。
真正致命的是**生成链里三处硬编码循环**——`collect-schemes.mjs:338`、`summarize-all.mjs:70`、`extract-specs.mjs:55,62`——
它们决定了「新的 5 个目录会不会被读进 `data.js`」。

**实测**：往 `prototypes/` 放一个 `S31-probe-test/`（复制 S30 的 index.html + style.css + .inspect），
`collect-schemes.mjs --check` 依然打印「30 案：有页面 30…」，表里 `^S31 ` 命中 **0 次**；
`check-docs` 全绿（13 PASS）；`check-twolines` 全绿（`SCHEMES.length !== 30` 两边都是 30，见 §4.4）；
`check-ui-copy` 全绿。只有 `check-prompts.mjs` 报了 6 条 FAIL——但它报的是「提示词缺」，不是「生成链漏了新案」。

也就是说：**新方案落地后，站点会若无其事地继续显示 30 个方案、272 张截图、18/30 暖浅色带，四道闸门全绿。**

---

## 一、完整清单（按文件分组，组内按行号）

分类记号：**真** = 真总数（必须 = 5 个新案的函数）；**子** = 子集数（分子分母都要重算，**不是简单 +5**）；
**别** = 别的量（不能碰）；**案** = 案号 `S30`；**历** = 历史记录的当时口径（不该改）。

### 1. `README.md`（34 行含裸 `30`；其中 **31 行**与方案相关（含 `:553` 一处 `S30` 案号）。另 3 行是别的量：`:278` `expires 30d;`、`:342` `clamp(30px, …)`、`:548` `deliverables/30-critique-…`。另有 7 处 272）

| 位置 | 当前内容（原文） | 类 | 新增 5 案后 | 修法 |
|---|---|---|---|---|
| `README.md:7` | `> *「30 个能跑的风格，不是 30 张配色图。」*` | 真 ×2 | `35 个`/`35 张` | 改字面量（纯 md，不能动态） |
| `README.md:10` | `[![Schemes: 30](https://img.shields.io/badge/Schemes-30-blue)](#仓库里有什么)` | 真 ×2 | `Schemes-35`/`Schemes: 35` | 改字面量（shields.io 静态 URL，见 §2） |
| `README.md:16` | `**这是一座风格标本库：30 个方案各配一个能直接打开的 HTML 原型，外加 3 个拿来就用的模板。**` | 真 | `35 个方案` | 改字面量。**这句是 `nums/schemes` 的自测锚点，见 §5.1** |
| `README.md:55` | `一屏摊开 30 个案子。每行给出结构类型／认知门槛／调性…` | 真 | `35 个案子` | 改字面量。**「个案子」不在 `nums/schemes` 的 `UNIT` 里 → 闸门看不见，见 §4.2** |
| `README.md:74` | `**30/30 有值**（最短 276 字、最长 444 字、全库合计 10,065 字，中位数 324）` | 真 + 子 ×4 | `35/35`；四个统计量全部重算 | 字面量 + 重算。`panel/fields` 会抓数字，但「30/30」本身抓不到 |
| `README.md:80` | `一份 1827–2159 字的一段话（30 案实测：中位 1993 字）` | 子 | 区间与中位全部重算 | 重算。「30 案实测」是 `--selftest` 的锚点，见 §5.1 |
| `README.md:105` | `**30 案里有 14 案**的按钮旁边会直接标 ⚠` | 真 + 子 | `35 案里有 ? 案`（14 必须重算） | 字面量 + 重算 |
| `README.md:155` | `**30 个设计方案**——它不是配色皮肤…` | 真 | `35 个设计方案` | 改字面量（被 `nums/schemes` 覆盖） |
| `README.md:157` | `这 12 段在选型台上**全部渲染出来**（30/30，不是抽样）` | 真 | `35/35` | 改字面量。**「30/30」不被覆盖，见 §4.2** |
| `README.md:159` | `**30 个可运行原型**——真排版、真文案…` | 真 | `35 个` | 改字面量（「个可运行原型」被覆盖） |
| `README.md:162` | `**F 型 15 / R 型 15**…30 个美学家族**互不重复**` | 子 + 真 | F/R 按 5 个新案重分；`35 个美学家族` | 重算 + 改字面量 |
| `README.md:164` | `**3 个大众化模板**——独立的一层，规则和 30 案不同` | 真 | `35 案` | 改字面量（不覆盖） |
| `README.md:175` | `**提示词内容**的独立对账：30 条提示词里说的配色/线宽/字号` | 真 | `35 条提示词` | 改字面量（不覆盖） |
| `README.md:178` | `实测 31 个 style.css（30 案 + 选型台）全部合规` | 真 + 派生 | `36 个 style.css（35 案 + 选型台）` | 改字面量。**`check-texture.mjs:184` 自己也硬编码了这句文案** |
| `README.md:209` | `**为什么这一层的规则和 30 案不同？**` | 真 | `35 案` | 改字面量（不覆盖） |
| `README.md:210` | `30 案受一份严格的"反 AI 味"规格约束，明令禁止…` | 真 | `35 案` | 改字面量（不覆盖） |
| `README.md:212` | `口径分清：**30 案那层的目标是被记住**` | 真 | `35 案` | 改字面量（不覆盖） |
| `README.md:326` | `选型台不是 30 个案之一，但它是用户唯一的入口` | 真 | `35 个案` | 改字面量（不覆盖） |
| `README.md:393` | `本页正文主体是方案卡的元数据（30 案 × 十几个 13px 字段名与读数）` | 真 | `35 案 ×` | 改字面量（不覆盖） |
| `README.md:425` | `闸门从 26/30 升到 29/30。` | **历** | 不改（2026-10-29 的历史记录） | 加一个显式日期标记即可，**不要改分母** |
| `README.md:429` | `**18 / 30 = 60% 落在"暖浅色带"**` / `实测 **25/30 = 83.3%**` / `⇒ 29/30 = 96.7%` / `12 个案子（40%）` / `换 ΔE76≤5 口径则是 19 案` | 子 ×5 | 全部分子分母重算（见 §6.1） | **重算，不是 +5**。零闸门覆盖（§4.3 实测） |
| `README.md:436` | `全库 30 案里符合"数字开头且不带分隔符"的只有这 3 处` | 真 + 子 | `全库 35 案…`（3 是否变要复测） | 字面量 + 复测 |
| `README.md:437` | `**549 / 640 / 420 字，30 案全部有值**` / `与其他 27 案一样` | 真 + 子 | `35 案`；`27 → 32` | 字面量 + 重算 |
| `README.md:443` | `**13/30 案的 index.html 在 30–48.4 KB**` / `实测 13/30 = 43%` | 子 ×2 + **别** | 分子重算（13 → ?），分母 35 | 重算。⚠️ 同行的 `30–48.4 KB` 是**别的量**，不能跟着改 |
| `README.md:465` | `│   └── S01-… S30-…/            # 30 个原型（index.html + style.css + assets/ + .inspect/）` | 真 + 案 | `S01-… S35-…` + `35 个原型` | 改字面量（「个原型」被覆盖） |
| `README.md:483` | `**一、外部规则集回灌。** 30 案的"反 AI 味"条款不是拍脑袋` | 真 | `35 案` | 改字面量（不覆盖） |
| `README.md:506` | `新的美学家族要能说清它和已有 30 族里最接近的一族差在哪` | 真 | `已有 35 族` | 改字面量（不覆盖） |
| `README.md:572` | `**Web Style Atlas** — 30 website design schemes` | 真 | `35 website design schemes` | 改字面量（不覆盖：「30 website」不匹配 `design\s+schemes?` 前的 NUM） |
| `README.md:574` | `all 30 schemes appear on one page with real renders…（**272 screenshots**）` | 真 + 272 | `35 schemes` + 新数字 | 字面量 |
| `README.md:576` | `29 prototypes pass the mechanical gate with FAIL = 0. What this repository cannot do — 2 remaining gate failures…（18 / 30 = 60%…）` | 子 ×3 | `? prototypes` / `? remaining` / 比例重算 | **重算**。注：本轮测绘期间另一路 Agent 已把它从「26 / 8 remaining」改成「29 / 2」（实测值），该改动已 staged |
| `README.md:585` | `*「30 个能跑的风格，不是 30 张配色图。」*` | 真 ×2 | `35 个`/`35 张` | 改字面量 |

**272 的位置（`README.md`）**

| 位置 | 当前内容（原文） | 类 | 修法 |
|---|---|---|---|
| `README.md:33` | `[看效果](#看效果打开选型台272-张真截图摊在一页)` | 派生（锚点） | **改锚点，与 41 行标题同步** |
| `README.md:41` | `## 看效果：打开选型台，272 张真截图摊在一页` | 派生总量 | 改字面量，**但会连带断 33/157 行两条锚点** |
| `README.md:46` | `git ls-files "prototypes/S*/.inspect/*.jpg" \| wc -l    # 272 张三档真实渲染截图` | 派生 | 改字面量 |
| `README.md:157` | `展开方式见[看效果](#看效果打开选型台272-张真截图摊在一页)` | 派生（锚点） | 同步 |
| `README.md:233` | `截图即取证，`272 张`全部在库里，可 git ls-files 数出来。` | 派生 | 改字面量 |
| `README.md:501` | `git ls-files … \| wc -l     # 文中写 272` | 派生 | 改字面量 |
| `README.md:574` | `（**272 screenshots**, git ls-files …）` | 派生 | 改字面量 |

### 2. `README-EN.md`（33 行含裸 `30`；其中 **30 行**与方案相关（含 `:546` 一处 `S30` 案号）。另 3 行是别的量：`:279` `expires 30d;`、`:346` `clamp(30px, …)`、`:541` `deliverables/30-critique-…`。另有 7 处 272）

| 位置 | 当前内容（原文） | 类 | 新增 5 案后 | 修法 |
|---|---|---|---|---|
| `README-EN.md:7` | `> *"30 runnable styles, not mockups."*` | 真 | `35` | 字面量（不覆盖：`styles` 不在 UNIT 里） |
| `README-EN.md:10` | `[![Schemes: 30](…/badge/Schemes-30-blue)](#what-you-get-30-schemes-30-prototypes-3-templates)` | 真 ×2 + 锚点 ×2 | `Schemes-35`；**锚点也要改** | 字面量。⚠️ 这个锚点指向 `## What you get: 30 schemes, 30 prototypes, 3 templates` |
| `README-EN.md:16` | `**A style specimen library: 30 schemes, each with an HTML prototype…**` | 真 | `35 schemes` | 字面量。**此句被 `OTHER_AXIS`（同小句有 `templates`）整条豁免 → 闸门看不见（§4.2 实测）** |
| `README-EN.md:33` | `[Content](#what-you-get-30-schemes-30-prototypes-3-templates)` / `[See the proof](#see-the-proof-272-real-screenshots-on-one-bench)` | 派生锚点 ×3 | 同步 | 与 10/41/153 行联动 |
| `README-EN.md:55` | `All 30 schemes on one screen.` | 真 | `All 35 schemes` | 字面量（被覆盖） |
| `README-EN.md:74` | `carries it for **30 of 30 schemes**` | 真 | `35 of 35` | 字面量。**「30 of 30」不被覆盖（`of` 不在 UNIT）** |
| `README-EN.md:80` | `1,827–2,159 characters of Chinese prose (30 schemes measured; median 1,993)` | 子 | 重算 | 重算 |
| `README-EN.md:105` | `**14 of the 30 schemes** carry a ⚠` | 真 + 子 | `? of the 35 schemes` | 重算 |
| `README-EN.md:153` | `## What you get: 30 schemes, 30 prototypes, 3 templates` | 真 ×2 + 锚点源 | `35/35` | 字面量。**被 `OTHER_AXIS`（`templates`）整条豁免** |
| `README-EN.md:155` | `**30 design schemes** —— not a colour skin…` | 真 | `35 design schemes` | 字面量（被覆盖） |
| `README-EN.md:157` | `(30 of 30, not a sample)` | 真 | `35 of 35` | 字面量（不覆盖） |
| `README-EN.md:159` | `**30 runnable prototypes**` | 真 | `35` | 字面量（被覆盖） |
| `README-EN.md:162` | `**15 F-type / 15 R-type**…All 30 aesthetic families` | 子 + 真 | 重分 + `35` | 重算 |
| `README-EN.md:175` | `the colours / line widths / type sizes each of the 30 prompts claims` | 真 | `35 prompts` | 字面量（不覆盖） |
| `README-EN.md:178` | `all 31 style.css files (30 schemes + the picker) comply` | 真 + 派生 | `36 个（35 + 选型台）` | 字面量（**被 `OTHER_AXIS` 豁免**） |
| `README-EN.md:210` | `**Why does this layer have different rules from the 30 schemes?**` | 真 | `35` | 字面量（不覆盖） |
| `README-EN.md:211` | `The 30 schemes follow a strict "anti-AI-cliché" specification` | 真 | `35` | 字面量（**被 `OTHER_AXIS`（`shadows`）豁免**） |
| `README-EN.md:213` | `**the 30-scheme layer aims to be remembered**` | 真 | `35-scheme` | 字面量（不覆盖） |
| `README-EN.md:330` | `The bench is not one of the 30 schemes` | 真 | `35` | 字面量（**被 `OTHER_AXIS` 豁免**） |
| `README-EN.md:397` | `scheme-card metadata (30 cards × a dozen 13px field labels…` | 真 | `35 cards` | 字面量（不覆盖） |
| `README-EN.md:432` | `**18 / 30 = 60% sit in a warm pale band**` / `**25/30 = 83.3%**` / `⇒ 29/30 = 96.7%` / `12 schemes (40%)` / `the other 18 schemes` | 子 ×5 | 分子分母全部重算（同 `README.md:429`） | **重算**。零闸门覆盖 |
| `README-EN.md:439` | `Across all 30 schemes only these 3 lines start with a digit` | 真 + 子 | `35`；3 需复测 | 字面量（**被 `OTHER_AXIS`（`mechanism`）豁免**） |
| `README-EN.md:440` | `all 30 schemes now carry a value` / `swallow 10 schemes'…` | 真 + 子 | `35`；`10` 重算 | 字面量（**被豁免**） |
| `README-EN.md:446` | `13/30 prototypes have an index.html of 30–48.4 KB` | 子 ×2 + **别** | 重算；`30–48.4 KB` 不能动 | 重算（**被豁免**） |
| `README-EN.md:468` | `│   └── S01-… S30-…/            # the 30 prototypes` | 真 + 案 | `S35` + `35` | 字面量（**被豁免**） |
| `README-EN.md:509` | `the closest of the existing 30 families` | 真 | `35 families` | 字面量（**被豁免**） |
| `README-EN.md:565` | `**网站设计风格图集** —— 30 个网站设计风格方案` | 真 | `35 个` | 字面量（不覆盖：`个网站`…`方案` 之间有词） |
| `README-EN.md:567` | `30 个案子摊在一页，附 1440／768／390 三档真实渲染截图（**272 张**` | 真 + 272 | `35 个案子` + 新数 | 字面量（「个案子」不覆盖） |
| `README-EN.md:569` | `29 个原型机械闸门 FAIL=0` | 子 | 重算（28/35 或 33/35…） | 重算。⚠️ `nums/gate` 的 `GATE_TAIL` 会豁免它，靠新修的 `GATE_CONTEXT` 才管得到 |
| `README-EN.md:578` | `*"30 runnable styles, not mockups."*` | 真 | `35` | 字面量 |
| `README-EN.md:505` | `node … --all        # this README says 29 schemes at FAIL = 0` | 子 | 重算 | 重算 |
| `README-EN.md:504` | `git ls-files … \| wc -l     # this README says 272` | 派生 | 新数字 | 改字面量 |

### 3. 选型台与向导（`prototypes/_selection/`）

| 位置 | 当前内容（原文） | 类 | 新增 5 案后 | 修法 |
|---|---|---|---|---|
| `index.html:6` | `<title>选型台 · 30 个网站设计风格方案</title>` | 真 | `35 个` | 字面量（必须静态：SEO/爬虫读原始 HTML） |
| `index.html:7` | `<meta name="description" content="30 个网站设计风格方案的选型台…">` | 真 | `35 个` | 字面量（同上） |
| `index.html:41` | `「30 个网站风格 · 选一个带走提示词」—— 但那与 H1 是同义重复` | 历史注释 | 不改 | 不改（是 2026-11-05 删除记录） |
| `index.html:98` | `不用在这三十张卡里挑——直接去三个大众模板` | 真（中文数字） | `三十五张卡` | 改字面量（零闸门覆盖：`check-ui-copy` 不扫这里） |
| `index.html:101` | `报头那个「闸门 FAIL=0」统计的是 30 个原型（app.js:54 `stats.clean`` | 注释 | 建议改成「`stats.clean` 只 filter `ALL`」去掉数字 | 可选 |
| `index.html:121/122/124` | `302px → 526px` / `minmax(300px, max-content)` / `分数形式「26 / 30」` | **别** | 不改 | 不改（尺寸与历史实测） |
| `index.html:188` | `<b>30 个里有 18 个落在"暖浅色带"</b>，而别的带只剩零头（冷暗带 5、暖暗带 3、中性浅带 2、中间明度带 1、冷浅色带 1）` | 子 ×6 | 全部重算（源：`data.js` 的 `axes.band`） | **能动态**：加 `data-derived`（§2） |
| `index.html:197` | `<b>19 个都属于"就要扎眼"</b>——这一层可选的真没那么多` | 子 | 重算（源：`axes.loud`） | **能动态** |
| `index.html:250` | `「列出 4 / 30」这句话变了没有` | 注释 | 不改 | 不改 |
| `index.html:269/272/273` | `模板层与 30 个案是两条并行的通道` / `0/30 行` / `「列出 N / 30 个方案」里的 30 是 SCHEMES 的长度` | 注释 | 建议改成「`ALL.length`」 | 可选（注释里的旧口径会误导下一个人） |
| `index.html:321` | `· 上面这段讲的是 **30 个案这一层**的供给缺口` | 注释 | 同上 | 可选 |
| `index.html:326` | `<strong>这三十个案不按行业建索引</strong>——<span id="e-total">30</span> 个案没有"行业"这一维；…<span id="e-why">…这 30 个案缺这条数据…</span>…想继续在这三十个案里挑…` | 真 ×4 | 两处 `<span>` **已经动态**（`app.js:632`）；<br>**「这三十个案」「想继续在这三十个案里」是裸文本，不会变**；`#e-why` 的内联兜底值只在不跑 JS 时可见 | **必须改**：裸文本改字面量／搬进受控 span |
| `app.js:139` | `var detail = '报头那个「闸门 FAIL=0 ' + stats.clean + '」只数 30 个原型（'` | 真 | `只数 ' + stats.total + ' 个原型` | **能动态，且同句已有 `stats.total`**（差分一目了然） |
| `app.js:632-635` | `set('e-total', ALL.length); set('e-terms', terms.length); …` | 真 | 已动态 | 不用改 ✅ |
| `app.js:661/666/668/812/875/892/1587` | `'…这 ' + ALL.length + ' 个案里…'` | 真 | 已动态 | 不用改 ✅ |
| `app.js:80-86/532-583/643-758/…` | 大量注释里的 `30 案实测`、`30/30`、`30 行` | 历史实测 | 不改 | 不改（是当时的实测记录） |
| `prompt-copy.js:1800` | `headPre = "「" + term + "」按文字搜不到（搜索框匹配整串，这 30 个案里没有哪一行写着「"` | 真 | 改成 `" 这 " + total + " 个案里…"` | **能动态**——同函数 `:1810`/`:1814` 两个兄弟分支用的正是 `total`，只有这一支写死了 |
| `wizard.html:7` | `<meta name="description" content="…从 30 个设计方案里得到 3 个推荐，以及 3 个明确排除…">` | 真 | `35 个` | 字面量（meta 必须静态） |
| `wizard.html:21` | `<h1>五个问题，把 30 个方案收成 3 个</h1>` | 真 | `35 个方案` | 字面量 |
| `wizard.html:23` | `<a href="./">← 回到选型台（看全部 30 个）</a>` | 真 | `35 个` | 字面量 |
| `wizard.html:65` | `参照：30 案里有 11 个的认知门槛是"低"，12 个"中"，7 个"高"。` | 真 + 子 ×3 | `35 案`；11/12/7 重算（实测今日 `{低:11, 中:12, 高:7}`） | **能动态**（`wizard.js` 里有 `ALL` 与 `r.threshold`），但字面量在静态 HTML 里，需要 JS 填 |
| `wizard.js:239` | `'<br>参与排序的方案 ' + ALL.length + ' 个（有渲染报告的）。'` | 真 | 已动态 | 不用改 ✅ |
| `wizard.js:139` | `可 6 张图在 30 案里高于中位数` | 注释 | 不改 | 不改 |

### 4. 站点入口 `index.html`（仓库根）——**MASTER-PLAN §5.3 完全漏掉**

| 位置 | 当前内容（原文） | 类 | 新增 5 案后 | 修法 |
|---|---|---|---|---|
| `index.html:6` | `<title>网站设计风格图集 · 30 个方案</title>` | 真 | `35 个方案` | 字面量（这是 GitHub Pages 的**入口页 title**） |
| `index.html:7` | `<meta name="description" content="30 个互不相同的网站设计风格方案…">` | 真 | `35 个` | 字面量 |

### 5. 生成链 / 闸门脚本（`prototypes/_build/`、`prototypes/_prompts/`）

| 位置 | 当前内容（原文） | 类 | 新增 5 案后 | 修法 |
|---|---|---|---|---|
| `_build/collect-schemes.mjs:338` | `for (let i = 1; i <= 30; i++) {` | **硬上限** | **S31–S35 会被整段丢弃** | **必须改**：`byId` 已经在 `:334-335` 从目录建好了，直接把循环改成 `for (const d of dirs)` |
| `_build/collect-schemes.mjs:678` | ``console.log(`30 案：有页面 …｜FAIL=0 ${clean}`);`` | 真（日志） | `out.length 案` | 改动态（否则日志继续打印 30） |
| `_build/summarize-all.mjs:70` | `const total = 30;` | **硬上限** | 缺目录检查只覆盖 1..30，多出来的目录不可见 | `const total = rows.length` 或 `dirs.length` |
| `_build/extract-specs.mjs:55` | `for (let n = 1; n <= 30; n++) if (!found.has(n)) missing.push(n);` | **硬上限** | S31 的规格缺失不会被报 | 上界改为新总数；且 `SOURCES`（`:14-18`）必须加 `07-schemes-31-35.md` |
| `_build/extract-specs.mjs:62` | `for (let n = 1; n <= 30; n++) {` | **硬上限** | 只切 1..30，S31–S35 规格文件永不生成 | 同上 |
| `_build/check-docs.mjs:542-545` | `const NUM = '(\\d[\\d,]{0,5}\|…)'` + `const UNIT = '(?:个设计方案\|个可运行的原型\|…\|schemes?\|prototypes?)'` | 断言正则 | 断言本身**动态**（读 `F.schemes`），但 `UNIT` 覆盖不全 | **不改正则**（这是 oracle），改为**补测试**（§4.2） |
| `_build/check-docs.mjs:493-494` | `（data.js 只有 S01–S30）`（仅在 FAIL 文案里） | 真（文案） | `S01–S35` | 文案改成 `${F.schemes}` 派生 |
| `_build/check-docs.mjs:175-177` | `['腐化 3（实测区间 → 1100 字左右）', /\d{3,5}[–—\-]\d{3,5} 字的一段话（30 案实测：中位 \d{3,5} 字）/, …]` | **自测锚点** | 正则失配 → `--selftest` exit 2 | **必须与 README:80 同步改**，见 §5.1 |
| `_build/check-docs.mjs:256,261,266,271,283` | `from: '**30 个可运行原型**'`、`from: '**这是一座风格标本库：30 个方案'`（×4） | **自测锚点** | 失配 → `--selftest` exit 2 | 同上 |
| `_build/check-docs.mjs:279,284` | `wantMsg: /nums\/schemes.*方案\/原型总数 = 30/` | **自测断言** | 恒不匹配 → 两个「误报」用例假红 | 改成 `= 35`，**不要改成 `\d+`**（退化成恒真） |
| `_build/check-docs.mjs:706` | `[/\b(4[0-9])\s*(?:个行业词\|个场景词\|trade terms)/, F.sceneTerms, '行业词总数'],` | **硬编码区间 40–49** | 行业词涨到 50+ 后该断言**静默失明** | 改 `(\d{2,3})` |
| `_build/check-twolines.mjs:308` | `if (SCHEMES.length !== 30) add('FAIL', … `data.js 只有 ${SCHEMES.length} 案，应为 30`);` | **硬编码 30** | 会正确报红，但「应为 30」这个修法指引是错的 | 改成关系式：`SCHEMES.length !== caseDirs().length` |
| `_build/check-twolines.mjs:309` | `if (PSP.length !== 30) add('FAIL', … `prompts.js 只有 ${PSP.length} 案，应为 30`);` | 同上 | 同上 | 改成 `PSP.length !== SCHEMES.length` |
| `_build/check-prompts.mjs:69-73` | `const DIRS = readdirSync(PROTOS, …).filter((d) => … /^S\d{2}-/.test(d.name))` | 已动态 ✅ | 会正确报 `coverage` FAIL | 不用改（实测：加 S31 目录后 6 条 FAIL） |
| `_build/check-prompts.mjs:499-502` | `/* A. 30 条提示词必须全部生成成功 */` + `if (lens.length !== DIRS.length)` | 注释 + 动态断言 | 注释里的 30 会过期 | 注释改成「全部生成成功」 |
| `_build/verify-prototype.mjs:197` | `/* … `--all` **保持只扫原型**（S01..S30），不并入产品入口。` | 注释 | 扫描本身是动态的（`:213-214` 用正则），但注释与 `:208` 的「口径固定为 30」会误导 | 注释改成「口径 = 所有 `S\d{2}-` 目录」 |
| `_build/verify-prototype.mjs:201` | `` `达标 26 / 不达标 4 / 共 30`  变成  `达标 26 / 不达标 5 / 共 31` `` | 注释（举例） | 不改 | 不改 |
| `_build/verify-prototype.mjs:208` | ``· `--all`          = 「30 个展品达标了没有」——口径固定为 30，README 的 26/30 对得上`` | **口径说明** | 会变成「口径固定为 35」，且 README 的 29/30 已过期 | 改成指向「`--all` 的输出就是唯一的分子分母」 |
| `_build/verify-prototype.mjs:104/108` | `实测 30 案里 25 案是 html { … } 紧接 body { … }` / `--all 因此长期报 28/30` | 历史实测 | 不改 | 不改 |
| `_build/check-texture.mjs:184` | ``console.log(`纹理载体闸门：${stats.checked} 个 style.css（30 案 + 产品入口）`);`` | 真（日志） | 文案会写错 | 改成 `${stats.checked - 1} 案 + 产品入口` |
| `_build/check-anchors.mjs:29` | `for (const name of allDirs(P))` | 已动态 ✅（`_entries.mjs` 用 `/^S\d{2}-/`） | 实测：加 S31 目录后扫 32 个入口 | 不用改 |
| `_build/_entries.mjs:24,73` | `/** 原型目录（S01..S30）的命名规则 */` / `/** 原型目录名（S01..S30），已排序。 */` | 注释 | 过期 | 改注释为 `S01..Snn` |
| `_build/_entries.mjs:7-9` | `（verify-prototype.mjs:144 也写过第三遍…口径必须固定为 30…）` | 注释 + **行号引用已腐坏**（`:144` 现在是 `const uniqMissing = …`） | — | 顺手修：删掉行号 |
| `_prompts/build-prompts.mjs:243` | `const h = HUMAN[d.id] \|\| { plain: "", scenes: [], minItems: 3, minPics: 3 };` | **静默兜底** | 新案拿到 `plain: ""` → 提示词里出现「请把整页做成这个风格：。」（`prompt-copy.js:465`） | **必须改成抛错**，见 §5.2 |
| `_prompts/build-prompts.mjs:135-165` | `const HUMAN = { S01: { plain: …, scenes: […] }, … S30: {…} };` | **硬编码表** | 新 5 案必须逐条新增 | 手写，但要有覆盖断言 |
| `_prompts/build-prompts.mjs:174-215` | `const SCENE_INDEX = { "咖啡店": { direct: ["S06"], … }, … }`（45 词） | **硬编码映射** | 新案要进索引，否则行业词仍 44 | 手写 + 数量断言 |
| `_prompts/build-prompts.mjs:375` | `console.log("  场景索引：" + Object.keys(SCENE_INDEX).length + " 个行业词…")` | 已动态 ✅ | — | 不用改 |
| `_prompts/build-prompts.mjs:380,401,406` | `"  有机制句的案：30/" + (30 - noMech) + …`、`… + "/30"`、`… + "/30"` | 真（日志分母） | 分母写死 30 | 改 `dna.length` |
| `_prompts/clean-dna.mjs:1494-1495` | `console.log("  有真实字体名的案：" + (30 - noFont.length) + "/30" …)` | 真（日志分母） | 同上 | 改 `out.length` |
| `_prompts/extract-dna.mjs:2,171,174` | `从 30 个原型的 style.css / index.html 里抽取…` / `… + "/30"` | 真（注释 + 日志） | 注释过期；分母写死 | 改 `rows.length` |
| `_prompts/extract-dna.mjs:24` | `const schemes = readdirSync(P).filter((d) => /^S[0-9]{2}-/.test(d)).sort();` | 已动态 ✅ | — | 不用改 |

### 6. CI

| 位置 | 当前内容（原文） | 类 | 修法 |
|---|---|---|---|
| `.github/workflows/gates.yml:132` | `- name: verify-prototype（29/30 是设计上的正常值）` | 子 | 重算后改 |
| `.github/workflows/gates.yml:138` | `echo "::notice::verify-prototype 报 29/30 且 exit 1 是已知状态（S08 的两条 FAIL 在 _CONTRACT.md §9.15 允许表内）。"` | 子 | 重算后改。**这两条是 `continue-on-error: true` 的 advisory job，写错了没人会红** |
| `.github/workflows/gates.yml:60` | `run: node prototypes/_build/check-docs.mjs --selftest` | — | **这是 blocking step**：§5.1 的自测锚点一失配，这个 step 就 exit 2 |

### 7. 随产品一起分发的对外文档（**MASTER-PLAN §5.3 完全漏掉**）

| 位置 | 当前内容（原文） | 类 | 修法 |
|---|---|---|---|
| `templates/M01-clean-corporate/README.md:150` | `` `prototypes/_CONTRACT.md` 是给 **`prototypes/S01–S30` 那 30 个方案**定的。`` | 真 + 案 | `S01–S35` / `35 个方案` |
| `templates/M01…/README.md:151` | `那 30 个方案的目标是**被记住**（30 个必须彼此不撞…）` | 真 ×2 | `35` |
| `templates/M01…/README.md:164` | `30 个方案是**设计稿**：占位符意味着设计师没想过内容` | 真 | `35 个` |
| `templates/M01…/README.md:186` | `或者反过来把 M 层这些做法带回 30 案**——后者才是真的破坏那 30 个方案。` | 真 ×2 | `35 案` |
| `templates/M01…/README.md:235` | `` `prototypes/`、`deliverables/`、仓库根 `README.md` 属于那 30 个方案与它们的法典`` | 真 | `35` |
| `templates/M01…/README.md:239` | `prototypes/S01-… S30-…   30 个个性化设计方案（目标：被记住）` | 真 + 案 | `S35` + `35` |
| `templates/M01…/README.md:243` | `想让 30 案的做法回流到这一层…` | 真 | `35 案` |
| `templates/M02-warm-local/README.md:39` | `` 这一条和仓库里 `prototypes/` 那 30 个原型不一样`` | 真 | `35 个` |
| `templates/M02…/README.md:68` | `` 仓库里 `prototypes/` 那 30 个原型相反`` | 真 | `35 个` |
| `templates/M02…/README.md:161` | `` | | `prototypes/S01–S30`（30 个个案） | `` | 真 + 案 | `S35（35 个个案）` |
| `templates/M02…/README.md:167` | `反 AI 味闸门 FAIL=0，30 案之间必须互不相同` | 真 | `35 案` |
| `templates/M02…/README.md:169` | `把本模板拿去跑 30 案那把闸门` | 真 | `35 案` |
| `templates/M02…/README.md:173` | `| 被豁免的条款（30 案口径） |` | 真 | `35 案口径` |
| `templates/M02…/README.md:179` | `30 案之间必须互斥` | 真 | `35 案` |
| `templates/M02…/README.md:196` | `30 个案里 **18 个（60%）**的底色挤在同一条带` | 真 + 子 | `35 个案里 ? 个（?%）` — **重算** |
| `templates/M02…/README.md:273` | `### 8.4 拿 30 案的闸门顺手跑了一遍` | 真 | `35 案` |
| `templates/M02…/README.md:279` | `全部来自 30 案那一层的口径` | 真 | `35 案` |
| `templates/M03-bold-creator/README.md:133` | `## 六、为什么这套样式和 30 个原型方案不一样` | 真 | `35 个` |
| `templates/M03…/README.md:135` | `～ `S30-…` 共 30 个**高度个性化**的设计原型` | 真 + 案 | `S35` + `35` |
| `templates/M03…/README.md:147` | `| | 30 个原型（S01–S30） | 这一层（大众模板 M03） |` | 真 + 案 | `35 个（S01–S35）` |
| `templates/M03…/README.md:164` | `本层故意反掉 30 案"禁止占位文案"的规定…30 个原型是**成品**` | 真 ×2 | `35` |
| `templates/M03…/README.md:166` | `**30 案那层的目标是被记住**` | 真 | `35 案` |

### 8. 规范与数据说明（**MASTER-PLAN §5.3 完全漏掉**）

| 位置 | 当前内容（原文） | 类 | 修法 |
|---|---|---|---|
| `prototypes/_CONTRACT.md:197` | `| mono | 30 案的字段 4 都规定了"辅助数字用等宽字族"…` | 真 | `35 案` |
| `prototypes/_CONTRACT.md:347` | `磁盘上**只有 12/30 案**有该文件` | 子 | 重算（12/35） |
| `prototypes/_CONTRACT.md:286` | `| README 的暖浅色带百分比 | 对 | 用了**另一个分母**（19/26 而非 18/30） |` | 历 | 不改（是历史上的错误记录） |
| `prototypes/_specs/_CURRENT-VALUES.md:3` | `> **这份文件是 30 个方案"现在到底什么颜色、什么字体"的唯一权威来源。**` | 真 | `35 个方案` |
| `prototypes/_specs/_CURRENT-VALUES.md:13` | `## 0 全局硬规则（30 案通用）` | 真 | `35 案通用` |
| `prototypes/_specs/_CURRENT-VALUES.md:61` | `S20 的 #FAF3E1 是 30 案里唯一触发 palette-cream 的纸底` | 真 | `35 案里` |

---

## 二、「能动态 / 不能动态」——逐处判断依据

判断原则只有一条：**这个位置的读者是「人」还是「渲染后的浏览器」。**
只有浏览器读的，才能从 `window.SCHEMES.length` 现算；人读的（markdown、meta、徽章）必须改字面量，
然后**用一个独立断言去核它**——这正是 `check-docs.mjs` 存在的意义。

### 能改成动态（6 处）

| 位置 | 依据 |
|---|---|
| `_selection/index.html:188`（18/30 暖浅色带） | `data.js` 每案都有 `axes.band`（实测分布 `{暖浅色带:18, 冷暗带:5, 暖暗带:3, 中间明度带:1, 中性浅带:2, 冷浅色带:1}`）。`fillDerived()` 已在做同类事（`chip-groups`/`chip-count`/`field-count`），加 `band-warm`/`band-breakdown` 两个 key 即可。 |
| `_selection/index.html:197`（19 个"就要扎眼"） | 同上，源是 `axes.loud`（实测 `{就要扎眼:19, 有态度不吵:9, 很安静:2}`）。 |
| `_selection/index.html:326` 裸文本「三十个案」 | `app.js:632` 已在填 `#e-total`，只是**句子本身不是 span**。把两处「三十个案」换成受控 span 即可。 |
| `app.js:139`（「只数 30 个原型」） | 同一条字符串表达式里紧跟着就是 `stats.total`（下一行）。纯打字错误级修复。 |
| `prompt-copy.js:1800`（「这 30 个案里」） | 同一函数内 `total` 变量在 `:1810`/`:1814` 两个兄弟分支已被使用，且 `total` 由 `ctx.total` = `ALL.length` 传入（`app.js:892`）。 |
| `wizard.html:65`（11/12/7 门槛分布） | `wizard.js` 的 `ALL` 里每案有 `.threshold`，且 `wizard.js` 已经在做动态统计。需要在 `DOMContentLoaded` 时回填这段文字。 |

**一个必须知道的坑**：`app.js:1766` 是 `if (vals[k] === undefined || !vals[k]) continue;` ——
**值为 0 会被当成「没算出来」而跳过**，保留 HTML 兜底值。新增的 `data-derived` key 若可能为 0，
这个守卫会静默保留旧字面量。这不是新 bug，但它会让「已改成动态」在边界条件下退化。

### 不能改成动态（必须改字面量）

| 位置 | 依据 |
|---|---|
| `README.md` / `README-EN.md` 全部 | 纯 markdown，无构建步骤（产品承诺「Pure static: no build step, no backend, no dependency install」，`README.md:574`）。所以只能改字面量 + **加断言**。 |
| `README.md:10` / `README-EN.md:10` 徽章 | `img.shields.io/badge/Schemes-30-blue` 是 shields.io 的**静态 URL 编码**——数字是路径的一部分，不可能是变量。shields 的 dynamic/json 版本需要一个外部端点，与「零后端」冲突。 |
| `README.md:33/41/157`、`README-EN.md:10/33/41/153` 锚点 | GitHub 从**标题文本**生成锚点。改标题里的数字，所有引用它的 `#…` 链接静默失效（README 内部锚点**没有任何闸门覆盖**：`check-anchors.mjs:29` 只扫 `prototypes/` 下的 `index.html`）。要么同步改，要么把数字从标题里拿掉。 |
| 根 `index.html:6,7`、`_selection/index.html:6,7`、`wizard.html:7,21,23` 的 title/meta/h1 | `<title>` 与 `<meta name="description">` 必须静态——爬虫、社交卡片抓取、`file://` 直接打开时都不会跑 JS。 |
| `check-docs.mjs` 的 `nums/schemes` 断言本身 | **它不能自己也变成动态的**。它读 `F.schemes = SCHEMES.length`（动态），但**必须拿这个动态值去和文档里的字面量比对**——这就是它全部的价值。如果改成「文档没写数字也放过」，断言就恒真了。 |
| `check-docs.mjs` 的 `--selftest` 锚点 | 同理，而且更硬：自测的输入必须是**字面量**（`from: '**这是一座风格标本库：30 个方案'`），否则「改坏它」这个动作无从定义。 |
| `collect-schemes.mjs:338` / `summarize-all.mjs:70` / `extract-specs.mjs:55,62` | 这些是**数据规模**本身，不是「总数的展示」。不能「从 `SCHEMES.length` 现算」——它们正是决定 `SCHEMES` 有多少个的那段代码。它们的正确形态是**从目录枚举**（`readdirSync` + `/^S\d{2}-/`），而不是另一个数字。 |
| `.inspect/` 的 272 | 见 §6.2：这是一个**必须实测才能知道**的量（每案 6–10 张，不是 30×3）。不能算，只能数。 |

---

## 三、`.inspect/` 截图总数：272 的实测核对

```
$ git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l
272
```

**README 写的 272 是对的。** 逐案核对（读 30 份 `.inspect/report.json`）：

- 总共 90 张 fold（30 案 × 3 档，**每案恰好 3 张**）+ 182 张 `page-*`（每档除 fold 外还有 0–4 张续页）
- 每案合计 **6–10 张**，分布：`{6 张: 1 案, 7 张: 2 案, 8 张: 7 案, 9 张: 4 案, 10 张: 16 案}`
- `data.js` 里 `shots.desktop/tablet/mobile` 三个数组长度相加 = **272**（与 `app.js:55-57` 的 `stats.shots` 一致，页面上 `#f-shots` 显示的就是这个现算值）

**所以 MASTER-PLAN §5.3 的公式「272 张（30 × 三档 + 折页）」是错的：** 30 × 3 = 90，不是 272。
差额 182 张来自**每档的续页**（页面多长就有多少张 `page-*`），不是「折页」。

**修法建议（三选一，推荐第 2 个）：**

1. ~~写死新数字~~：5 个新案各渲染一次后才知道，且下次增删又要重走一遍。**不推荐作为唯一手段。**
2. **「一个数字 + 一条命令」的写法保留，但把数字变成闸门的断言对象**：现在 `272` 在 README 里出现 7 次，
   **全域零闸门覆盖**（`grep 272 prototypes/_build/*.mjs` = 0 命中）。给 `check-docs.mjs` 加一条
   `nums/shots`：从 README 抽 `272 张`/`272 screenshots`，与 `git ls-files` 数出来的真实值比对。
   **这是唯一能把「写死的数字」变成「不会说谎的数字」的办法**——README 可以写死，但写错了必须红。
3. ~~改成「约 N 张」~~：会失去「可 `git ls-files` 复算」这个卖点（`README.md:233`「截图即取证…可 `git ls-files` 数出来」）。

**同时提醒一个耦合**：`README.md:41` 的标题「…272 张真截图摊在一页」是 `:33` 与 `:157` 两条锚点的来源。
改这个数字必须同时改这两条链接，否则读者点「看效果」会跳到页面顶部而不是目标小节——而这**没有任何闸门会发现**。

---

## 四、已埋着的静默失效点（风险最高的一节）

这一节每一条都经过**变异实测**。方法是：把某处改成别的数字/插入一个新目录，跑真闸门，看它红不红。

### 4.1 会正确报红的（这几处是健康的，别「修」坏它）

| 点 | 实测 |
|---|---|
| `check-docs.mjs` `nums/schemes` 对 `README.md:16`「30 个方案」 | 改成 35 → `✗ 方案/原型总数与实测 30 不符：35（原句：35 个方案）`，exit 1 ✅ |
| 同上对「30 个设计方案」「30 个可运行原型」「30 个原型」「30 个案」「30 schemes appear」 | 逐个实测，**5 个全部报红** ✅ |
| `nums/gate` 对 `README.md:160`「29 个闸门 FAIL=0」 | 改成 26 → 红，并同时带出 `i18n/facts` ✅ |
| `check-prompts.mjs` | 放一个 `S31-probe-test` 目录进去 → `mech-empty`/`coverage`/`prompt-missing`/`template-marker` **共 6 FAIL** ✅（红是红了，但报的是「提示词缺」，不是「你新增了方案却没改生成链」，修法指引不直接） |
| `check-twolines.mjs:308,309` | 若 `data.js` 仍是 30 而目录是 31 → **不会红**（它比的是 `SCHEMES.length` 与字面量 30，两边都是 30）。它只在 `data.js` 真变成 35 时才报「应为 30」——**方向反了**，见 4.4 |
| `check-anchors.mjs` / `check-stale.mjs` / `_entries.mjs` | 全部来自 `allDirs()`（`/^S\d{2}-/` 正则），加 S31 目录后自动覆盖（实测扫 32 个入口）✅ |

### 4.2 `nums/schemes` 的**正则盲区**：一批「真总数」它根本看不见

不是「skip 规则放过了」，而是 **`UNIT` 里压根没有这些量词**，所以连候选都不是。逐条实测（改 30→40/35 后跑 `check-docs`）：

| 位置 | 原文 | 变异 | 结果 |
|---|---|---|---|
| `README.md:10` | `Schemes: 30`（徽章 alt） | → `Schemes: 40` | **GREEN（瞎）** |
| `README.md:55` | `一屏摊开 30 个案子` | → `40 个案子` | **GREEN（瞎）**：`UNIT` 无「个案子」 |
| `README.md:74` | `**30/30 有值**` | → `40/40` | **GREEN（瞎）**：`/` 不在 `UNIT` |
| `README.md:80` | `30 案实测：中位 1993` | → `40 案实测` | **GREEN（瞎）**：`UNIT` 无裸「案」 |
| `README.md:105` | `30 案里有 14 案` | → `40 案里有 14 案` | **GREEN（瞎）** |
| `README.md:157` | `（30/30，不是抽样）` | → `40/40` | **GREEN（瞎）** |
| `README.md:162` | `30 个美学家族` | → `40 个美学家族` | **GREEN（瞎）** |
| `README.md:164` | `规则和 30 案不同` | → `40 案` | **GREEN（瞎）** |
| `README.md:175` | `30 条提示词里说的配色` | → `40 条提示词` | **GREEN（瞎）** |
| `README.md:178` | `31 个 style.css（30 案 + 选型台）` | → `41 个（40 案…）` | **GREEN（瞎）** |
| `README.md:209/210/212` | `和 30 案不同？` / `30 案受一份严格` / `30 案那层` | → `40 案` | **GREEN（瞎）** |
| `README.md:326` | `不是 30 个案之一` | → `40 个案` | **GREEN（瞎）** |
| `README.md:393` | `（30 案 × 十几个 13px…）` | → `40 案 ×` | **GREEN（瞎）** |
| `README.md:436/437` | `全库 30 案里` / `30 案全部有值` | → `40 案` | **GREEN（瞎）** |
| `README.md:483` | `30 案的"反 AI 味"条款` | → `40 案` | **GREEN（瞎）** |
| `README.md:506` | `已有 30 族里` | → `40 族` | **GREEN（瞎）** |
| `README.md:572` | `— 30 website design schemes` | → `40` | **GREEN（瞎）** |
| `README.md:7/585` | `30 个能跑的风格，不是 30 张配色图` | → `35 个…35 张` | **GREEN（瞎）**：「个能跑的风格」不在 `UNIT` |
| `README-EN.md:16` | `30 schemes, … plus 3 templates` | → `40 schemes` | **GREEN（瞎）**：`OTHER_AXIS` 命中同小句的 `templates` |
| `README-EN.md:153` | `30 schemes, 30 prototypes, 3 templates` | → `40/40` | **GREEN（瞎）**：同理 |
| `README-EN.md:178` | `all 31 style.css files (30 schemes + the picker)` | → `41（40…）` | **GREEN（瞎）** |
| `README-EN.md:211` | `The 30 schemes follow a strict…` | → `40` | **GREEN（瞎）**：同句有 `shadows` |
| `README-EN.md:330` | `The bench is not one of the 30 schemes` | → `40` | **GREEN（瞎）** |
| `README-EN.md:439/440` | `Across all 30 schemes…` / `all 30 schemes now carry a value` | → `40` | **GREEN（瞎）**：同句有 `mechanism` |
| `README-EN.md:446` | `13/30 prototypes…` | → `13/40` | **GREEN（瞎）** |
| `README-EN.md:468` | `# the 30 prototypes` | → `40` | **GREEN（瞎）** |
| `README-EN.md:509` | `the existing 30 families` | → `40` | **GREEN（瞎）** |
| `README-EN.md:7/578` | `30 runnable styles, not mockups` | → `35` | **GREEN（瞎）** |
| `README-EN.md:74` | `30 of 30 schemes` | → `35 of 35` | **GREEN（瞎）** |
| `README-EN.md:565/567` | `30 个网站设计风格方案` / `30 个案子摊在一页` | → `35` | **GREEN（瞎）** |

**这是本任务最重要的一条发现**：`nums/schemes` 的名字听起来像「守卫方案总数」，实际它守的是
**「约 6 个特定句式里的那个数字」**。README 里 31 行含与方案相关的裸 `30`，它只看得到其中 6 行。

**一次性批量实测**：把两份 README 里所有独立出现的 `30`/`三十` 全部换成 `35`/`三十五`，
`check-docs` 只报 **6 个数字**（`35 个方案`、`35 个设计方案`、`35 个可运行原型`、`35 个案`、`35 个原型`、`35 schemes`，
全部来自 README.md），再加一条 `i18n/facts`（中 35 vs 英 35 与英 30 不一致）。
其余数十处一声不吭（唯一附带命中的 `paths/exist` 是批量脚本把 `deliverables/30-critique-…md` 这个**文件名**也改了，
属脚本副作用，不是方案数）。

### 4.3 子集数：全域零覆盖，改了不会被发现

| 位置 | 原文 | 变异实测 |
|---|---|---|
| `README.md:429` | `**18 / 30 = 60% 落在"暖浅色带"**` | → `23 / 30 = 77%` → **GREEN** ✅？（应为红） |
| `README.md:429` | `实测 **25/30 = 83.3%**` | → `29/30 = 96.7%` → **GREEN** |
| `README.md:443` | `**13/30 案的 index.html 在 30–48.4 KB**` | → `18/30 案` → **GREEN** |
| `README.md:425` | `从 26/30 升到 29/30` | → `升到 24/30` → **GREEN** |
| `README.md:162` | `**F 型 15 / R 型 15**` | → `F 型 18 / R 型 17` → **GREEN**（实测真值确实是 `{F:15, R:15}`） |
| `README.md:105` | `**30 案里有 14 案**` | → `30 案里有 9 案` → **GREEN**（`nums/warn-axes` 只核有 S 编号名单的那句） |

结论：**子集数（18/30、12 个（40%）、19 案、13/30、25/30、29/30、11/12/7、15/15）目前全部是「自述真理」，没有任何闸门在看。**
Q2 之后它们会集体变错，而站点会照常全绿。这是本项目「测量层 3.4× 于产品」这个老病的又一个实例。

### 4.4 反向失效：`check-twolines.mjs:308,309` 的守卫方向是错的

```js
if (SCHEMES.length !== 30) add('FAIL', '*', 'coverage', `data.js 只有 ${SCHEMES.length} 案，应为 30`);
if (PSP.length !== 30)   add('FAIL', '*', 'coverage', `prompts.js 只有 ${PSP.length} 案，应为 30`);
```

实测：放一个 `S31` 目录进去、`data.js` 保持不变（30）→ **两条都不报**（30 === 30）。
它的作用其实只是「防止 `data.js` 的数量漂移」，而不是「防止实际目录与 `data.js` 不一致」。
**新增 5 案后如果忘了重跑 `collect-schemes`，`data.js` 仍是 30、目录是 35，这条闸门一声不吭。**

### 4.5 `check-docs.mjs` 的 `--selftest` 会因为 README 改数字而**直接退出 2**

三个独立的硬编码锚点：

1. `check-docs.mjs:176` 的 `REVERTS` 正则：
   `/\d{3,5}[–—\-]\d{3,5} 字的一段话（30 案实测：中位 \d{3,5} 字）/`
2. `check-docs.mjs:256,261,266,271,283` 的 `from:` 字面量：
   `'**30 个可运行原型**'`、`'**这是一座风格标本库：30 个方案'`（×4）
3. `check-docs.mjs:279,284` 的 `wantMsg: /nums\/schemes.*方案\/原型总数 = 30/`

**实测（各改一处，只改一处）**：

- `README.md:80` 的「30 案实测」→「35 案实测」：
  `✗ 自测无法布置「腐化 3（实测区间 → 1100 字左右）」：README.md 里找不到目标句式。` → **exit 2**
- `README.md:16` 的「30 个方案」→「35 个方案」：
  `✗ 自测无法布置「改坏 2/3/4/误报 2」…`（四条同时失配）→ **exit 2**

而 `.github/workflows/gates.yml:60` 是 **blocking step**：
`- name: 闸门自检（selftest，证明闸门不是恒真）` / `run: node prototypes/_build/check-docs.mjs --selftest`。
**也就是说：Q2 改完 README，CI 会红在一个看起来与「新方案」毫无关系的地方。**

**最危险的「修法」**：把这四个锚点改成 `\d+` / `三十?五?` 之类，让它「什么数字都匹配」——
那就把自测变成了恒真。这时自测仍然打印「✓ 自测通过」，但它已经不再证明任何事。
本仓库自己已经记过这个教训（`check-docs.mjs:322` 原话：
「这条 README 又变了，自测需要跟着更新（否则它会变成永远绿的假测试）」）。**改锚点时必须改成一个新的具体值，不能放宽。**

### 4.6 `nums/scenes` 的 `4[0-9]`：行业词数涨到 50 就静默失明

```js
[/\b(4[0-9])\s*(?:个行业词|个场景词|trade terms)/, F.sceneTerms, '行业词总数'],
```

**实测**：`README.md:78` 的「44 个行业词」→「54 个行业词」，
`nums/scenes` **报绿**（只有 `i18n/facts` 抓到「中 54 vs 英 44」）。改成「47 个行业词」→ 报红。

Q2 的 N31/N32/N34/N35 都要往 `SCENE_INDEX` 里补行业词（OFFERING §N31–N35 列的：花店/美甲/甜品/家教/培训/农产品/家居/儿童）。
只要总数越过 49，这条断言就再也看不见 README 写的是什么。**这是「恰好够用的魔数」的教科书案例**——
与 `check-docs.mjs:506-511` 自己批评「上界 30」时说的那句一模一样：
「一刀切的问题不是它漏了 31，而是它把『判断』换成了一个恰好够用的魔数」。

### 4.7 选型台 UI 里的硬编码：`check-ui-copy.mjs` 只守住 2 个位置

`check-ui-copy.mjs` 的 `HARDCODED_GUARDS` 只有两条（`chip-groups`/`chip-count`、`field-count`）。
**实测**：改 `index.html:6` 的 title（30→40）、`:188` 的「30 个里有 18 个」（→「35 个里有 23 个」）、
`:326` 的「这三十个案」（→「这三十五个案」），然后跑
`check-ui-copy`（0 FAIL）、`check-docs`（13 PASS）、`check-anchors`（无死锚点）——**三道闸门全绿**。

`wizard.html` 更是**零覆盖**：`check-ui-copy.mjs` 只读 `index.html`/`style.css`/`app.js`
（`const HTML = join(SEL, 'index.html')`），`wizard.html` 的 4 处 30 一个字都没被检查过。

### 4.8 `build-prompts.mjs` 的静默兜底：会让新案的提示词变成残句

```js
const h = HUMAN[d.id] || { plain: "", scenes: [], minItems: 3, minPics: 3 };
```

`HUMAN` 是硬编码的 `S01..S30` 字典。新增的 5 案**不会报错**，会拿到 `plain: ""`，
然后 `prompt-copy.js:465` 无条件拼接：

```js
"请把整页做成这个风格：" + s.plain + "。",
```

→ 用户复制到的提示词里出现 **「请把整页做成这个风格：。」**。
并且 `prompt-copy.js:316` 的兜底分支会拼出「这个风格的签名动作：。具体到实现：…」。

**实测**：`grep -n "plain" check-prompts.mjs check-twolines.mjs check-docs.mjs` = **0 命中**。
也就是说这条链路上没有任何一条断言检查 `plain` 非空。这是「新增 5 案」会直接产出的**用户可见缺陷**，
且它不报错、不报警、不影响任何门槛。

### 4.9 汇总：静默失效点清单（按严重度）

| # | 点 | 漏改的后果 | 有无闸门 | 实测证据 |
|---|---|---|---|---|
| 1 | `collect-schemes.mjs:338` `i <= 30` | **新 5 案不进 `data.js`** → 站点仍显示 30 案 | **无** | 加 S31 目录 → 输出仍「30 案」，S31 出现 0 次 |
| 2 | `build-prompts.mjs:243` `HUMAN[id] \|\| {plain:""}` | 新案提示词出现「…这个风格：。」 | **无** | `plain` 在三个闸门里 0 命中 |
| 3 | `check-docs.mjs` `--selftest` 四处锚点 | CI 红在一个与 Q2 无关的地方；最省事的修法会把它变恒真 | 有（但会红在错的地方） | 改 README:16 或 :80 → exit 2 |
| 4 | `README.md:429/443/425/162/105` 的子集数 | 页面与 README 一起说谎 | **无** | 4 条变异全部 GREEN |
| 5 | `index.html:188/197/326`、`wizard.html:65` | 选型台/向导继续显示旧分布 | **无** | 变异后三闸门全绿 |
| 6 | `nums/schemes` 的 27 个盲区 | README 写错 27 处也不红 | 有（但只覆盖 6/33） | 见 §4.2 |
| 7 | `summarize-all.mjs:70` / `extract-specs.mjs:55,62` | 缺案检查只覆盖 1..30 | **无** | 静态阅读（`missing` 只 push 1..30） |
| 8 | `nums/scenes` 的 `4[0-9]` | 行业词 50+ 后失明 | 有（退化） | 44→54 GREEN，44→47 RED |
| 9 | `check-twolines.mjs:308,309` 方向反 | 目录与 `data.js` 不一致时不管 | 有（方向错） | 加目录不改 data.js → 不报 |
| 10 | `README.md:41` 标题锚点 ↔ `:33`/`:157` | 改 272 断 2 条内链 | **无**（`check-anchors` 不扫 md） | `check-anchors.mjs:29` 只遍历 `allDirs` |
| 11 | `gates.yml:132,138` 的 29/30 | advisory job，写错没人管 | 无（`continue-on-error`） | 文件自述 |

---

## 五、建议的修复顺序

### 阶段 A —— **必须在新方案目录落地之前改完**（否则新案会静默消失）

1. `_build/collect-schemes.mjs:338` → 把 `for (let i = 1; i <= 30; i++)` 改成遍历 `dirs`
   （`byId` 已在 `:334` 从目录建好，改动 3 行）。**改完用「加一个空目录」验证：`--check` 的输出里必须多一行。**
2. `_build/summarize-all.mjs:70` → `const total = 30` 改 `rows.length`。
3. `_build/extract-specs.mjs:14-18` 的 `SOURCES` 加 `07-schemes-31-35.md`；`:55`/`:62` 的上界改由 `found.size` 派生。
   ⚠️ 这一条依赖 `deliverables/07-*.md` 先存在——**它是一个真实的前置任务，不是数字替换。**
4. `_prompts/build-prompts.mjs:243` → 缺 `HUMAN[id]` 时 **throw**，不要 `{ plain: "" }`。
   同时在 `check-prompts.mjs` 加一条 `plain-empty` 断言。
5. `_build/check-twolines.mjs:308,309` → 改成 `SCHEMES.length !== caseDirs().length` / `PSP.length !== SCHEMES.length`。
6. `_selection/index.html:188/197/326` + `wizard.html:65` → 改成 `data-derived` / JS 回填。
   （同时给 `check-ui-copy.mjs` 的 `HARDCODED_GUARDS` 加两条锚点，把这几处钉住。）
7. `_selection/app.js:139`、`prompt-copy.js:1800` → 改用已有的 `stats.total` / `total`。
8. `check-docs.mjs:706` 的 `4[0-9]` → `(\d{2,3})`。

### 阶段 B —— 与新方案同一次提交（对外数字）

9. 根 `index.html:6,7`、`_selection/index.html:6,7`、`wizard.html:7,21,23` —— 6 处 title/meta/h1。
10. `README.md` / `README-EN.md` 的 28/27 处真总数 + 两枚徽章。
11. `README.md:41` / `README-EN.md:41` 的 272（渲染完 5 个新案后再数），**并同步 `:33`/`:157`（中）与 `:33`/`:157`（英）的锚点**；
    顺便给 `check-docs.mjs` 加 `nums/shots` 断言（当前 272 全域零覆盖）。
12. `check-docs.mjs` 的 `--selftest` 四处锚点（`REVERTS` + 5 个 `from:` + 2 个 `wantMsg`）——
    **必须改成新的具体值，不许放宽成正则通配**。改完立刻跑 `--selftest`，必须看到「七个用例」全绿。
13. 立刻跑全闸门，接受下面这些「正确地红」：`check-prompts`（coverage/mech-empty 等）、
    `check-twolines`（若 data.js 已 35）、`check-docs`（`nums/gate`/`nums/scenes`/`panel/fields`/`i18n`）。

### 阶段 C —— 落地后补（不会误导用户）

14. 子集数全部重算：`README:429`（18/30、12/40%、25/30、29/30、19 案）、`README:443`（13/30=43%）、
    `README:162`（F/R 15/15）、`README:105`（14 案）、`README:80`（提示词字数区间）、
    `README-EN.md:432/446/105/80` 对应句、`templates/M02:196`、`_CONTRACT.md:347`。
15. `gates.yml:132,138` 的 `29/30`。
16. 注释与日志里的分母：`collect-schemes:678`、`check-texture:184`、`build-prompts:380/401/406`、
    `clean-dna:1494-1495`、`extract-dna:2/171/174`。
17. `_CONTRACT.md:197`、`_specs/_CURRENT-VALUES.md:3,13,61`、三个 `templates/*/README.md` 的 22 处。

---

## 六、MASTER-PLAN §5.3 的 7 处清单：错 2 处、漏 6 类

原文（`deliverables/74-plan/00-MASTER-PLAN.md:209-220`）：

| # | MASTER-PLAN 的说法 | 核实结论 |
|---|---|---|
| 1 | `README.md` / `README-EN.md`：标题、副标题、徽章 `Schemes: 30`、正文多处「30 个」 | **对，但严重低估**：实际是 **31 行（中）+ 30 行（英）** 含与方案相关的裸 `30`（含一处 `S30` 案号），而 `nums/schemes` 只覆盖其中 6 行（§4.2）。「正文多处」这个说法会让人以为改 3–5 处就够。 |
| 2 | `prototypes/_selection/index.html`：标题、meta description、报头 | **半错**。「标题/meta」对；**「报头」是错的**——`#f-total`/`#f-built`/`#f-clean`/`#f-shots` 全部由 `app.js:71-157` 现算，页头四个数字**不需要改**。真正需要改的是 `:98`（三十张卡）、`:188`、`:197`、`:326`，而这三处清单没提。 |
| 3 | `check-docs.mjs`：`nums/schemes` 断言 | **对**，且方向正确（断言本身不许动态化）。**未提**：`--selftest` 的四处硬编码锚点会 exit 2（§4.5），而这是 CI 的 blocking step。 |
| 4 | `_build/_entries.mjs`：30 个方案目录的枚举 | **错**。`_entries.mjs` **没有任何代码级 30**：`CASE_DIR_RE = /^S\d{2}-/`（`:25`）、`caseDirs()` 用 `readdirSync`（`:74-79`）。实测：加 `S31` 目录后 `allDirs()` 返回 32，`check-anchors` 扫 32 个入口。这个文件**不用改**，只有 `:24`/`:73` 两行注释要改。真正该写进清单的是 `collect-schemes.mjs:338` 的 `i <= 30`——**漏改它新案就不进 `data.js`**。 |
| 5 | `.inspect/` 截图总数：272 张（30 × 三档 + 折页） | **数字对，公式错**。实测 272 = **90 张 fold（30×3）+ 182 张续页**。30×3 是 90 不是 272。另外**全域零闸门在看这个数**（`grep 272 prototypes/_build/*.mjs` = 0）。 |
| 6 | 向导文案：「30 个方案里」 | **对，但只列了 1 处**。实际 4 处：`wizard.html:7/21/23/65`。其中 `:65` 的「11 低 / 12 中 / 7 高」是**子集分布**，必须重算而不是 +5。 |
| 7 | `prompts.js`：`schemes` 数组长度 | **表述错位**。`prompts.js` 是**产物**，长度由 `build-prompts.mjs` 从 `dna-clean.json` 生成——它会自己变。真正需要手改的是 `build-prompts.mjs:135-165` 的 `HUMAN` 字典与 `:174-215` 的 `SCENE_INDEX`；**而 `HUMAN` 缺项时会静默兜底成空串**（§4.8），产出的提示词是残句。清单写「prompts.js 数组长度」会让人去改产物、而不是改源。 |

**清单漏掉的 6 类：**

1. **仓库根 `index.html:6,7`** —— GitHub Pages 的入口页 title/meta。这是用户分享链接时看到的第一句话。
2. **`wizard.html`** —— 向导页的 title/meta/h1/back-link/门槛分布，共 4 处（清单只写「向导文案」一句，没落到文件）。
3. **`templates/*/README.md`** —— 22 处，随产品一起分发、对外可见。
4. **`prototypes/_CONTRACT.md` / `_specs/_CURRENT-VALUES.md`** —— 4 处（规范与「当前有效值」权威来源）。
5. **`.github/workflows/gates.yml:132,138`** —— `29/30` 两处，且所在 job 是 `continue-on-error`。
6. **数据规模三处循环**：`collect-schemes.mjs:338`、`summarize-all.mjs:70`、`extract-specs.mjs:55,62`。

**还有一条原则需要修正**：§5.3 结尾写

> **原则**：把「30」换成一个从 `window.SCHEMES.length` 现算的占位符，而不是换成一个新字面量。

这条**只对一半**。`window.SCHEMES` 只在浏览器里存在，而 33 个出现点里有 **26 个在浏览器之外**
（markdown、CI、`.mjs` 脚本、模板 README、meta 标签、shields.io URL）。
更准确的表述是：

> **原则（修正版）**：能被浏览器渲染的，改成从 `window.SCHEMES.length` 现算；
> 不能的（md / meta / 徽章 / CI / 脚本），保留字面量，但**每一条都必须有一个独立断言去核它**。
> 「没有断言的写死数字」和「恒真的动态断言」是同一个病的两种形态。

---

## 附：本次测绘的复现命令

```bash
# 272 的真实值
git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l          # 272

# 272 的构成（90 fold + 182 续页）
node -e "const fs=require('fs');let f=0,p=0;for(const d of fs.readdirSync('prototypes').filter(x=>/^S\d{2}-/.test(x))){const j=JSON.parse(fs.readFileSync('prototypes/'+d+'/.inspect/report.json','utf8'));(j.images||[]).forEach(i=>{f++;p+=(i.pages||[]).length})}console.log({folds:f,pages:p,total:f+p})"

# 新增 5 案之后 data.js 会不会跟着变（现在不会）
mkdir prototypes/S31-probe-test && cp prototypes/S30-skate-sticker-split/index.html prototypes/S31-probe-test/
node prototypes/_build/collect-schemes.mjs --check | grep -c '^S31 '   # 0 —— 静默丢弃
rm -rf prototypes/S31-probe-test

# 子集数是否被任何闸门看守（不是）
# 逐个把 README 里的 30 改成 40，再跑：
node prototypes/_build/check-docs.mjs
```

---

*测绘完成日期：2026-11-10。所有变异实测均在 `/tmp` 或临时目录里做，`README.md` / `README-EN.md` /
`index.html` / `check-docs.mjs` 均已逐字节还原（`stat -c %s` 校验：54546 / 62352 / 1569 / 原大小）。*
