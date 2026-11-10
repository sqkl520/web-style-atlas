# 74 轮侦察综合报告：这个项目是什么，该往哪走

> 侦察时刻：2026-11-04
> 基线 HEAD：`0432753`　工作区干净（追踪文件零修改）
> 方法：1 个规划 Agent + 6 个专项 Agent + 3 个独立验证 Agent，交叉复核
> 证据源：`deliverables/74-recon/{arch,schemes,toolchain,docs,ux,redteam,verify-ux,verify-plan}.md`
> 口径：**[实测]** 本机命令/浏览器测量　**[源码]** 读文件给 file:line　**[复算]** 脚本现算　**[文档]** 引用仓库自己的报告

---

## 0. 一句话结论

**这不是一个缺功能的项目，是一个「度量层长到了产品层 3.4 倍，而度量对象里恰好不含用户操作」的项目。**

它有 12 个闸门脚本、272 张截图、205 份审计报告、9 万行散文，全部作用于**静态产物**（CSS 文本、JSON、文档数字）。
而用户真正会做的动作 —— 点芯片、按方向键、复制提示词、翻详情 —— **一条自动断言都没有**。
于是「界面在说谎」类缺陷能长期存活，而闸门始终是绿的。

---

## 1. 项目实际是什么（已核实，非 README 自述）

```
L0 入口        index.html（meta 跳转）· README.md 53KB · README-EN.md 60KB
L1 产品面      prototypes/_selection/  index.html 368 / app.js 1654 / style.css 1433
               prompt-copy.js 1816 / wizard.js 285          ← 零构建、零模块、全局脚本
L2 数据        data.js 307KB（window.SCHEMES，30×33 键）     ← collect-schemes.mjs 生成
               prompts.js 62KB（window.STYLE_PROMPTS）        ← build-prompts.mjs 生成
L3 内容源      prototypes/_specs/S01..S30.md（12 字段散文）+ _CURRENT-VALUES.md（权威色值）
               prototypes/_CONTRACT.md 396 行（施工法）
L4 展品        prototypes/S01..S30/  index.html + style.css + assets/ + .inspect/
L5 模板        templates/M01..M03（12 个变量驱动，**无任何机器闸门**）
L6 工具链      prototypes/_build/ 23 个 .mjs + 3 个 .py / prototypes/_prompts/ 4 个 .mjs
L7 外部依赖    tools/taste-skill/…（.gitignore 排除，**clone 者拿不到**）
L8 档案层      deliverables/ 205 份 md / 91,873 行 / 10.5 MB
```

**两条互不相通的数据链**（这是设计，不是 bug）：

```
_specs/*.md ──collect-schemes──► data.js      4 色上限 = 「设计意图」
style.css ──extract-dna──►clean-dna──►prompts.js  4–7 色 = 「施工细节」
```

`71-plan/PLAN-final.md` 记录了上一轮 Agent 三次自我推翻后确认：**两条链都对，描述的是不同层次**。
任何「合并成单一来源」的方案都会抹掉这个区分 —— 这是本项目最容易被误导的架构决策。

---

## 2. 五条核心诊断（按严重度，全部有证据）

### D-1【最高】闸门度量的东西，不包含用户做的事

`_build/` 下 22 个脚本，**没有一个执行 `app.js`**。唯一跑浏览器的 `inspect.mjs` 只做
`goto → 截图 → scrollTo → 量 DOM`，`grep -c "click|dispatchEvent"` = **0**。

所以 `_selection/.inspect/report.json` 记录的永远是「列表页第 0 屏 + 30 张静态卡」。
它测不到详情面板（`#detail hidden`）、测不到任何筛选结果、测不到复制按钮。

**后果**：架构 Agent 列出 10 条「会静默坏掉」的清单，其中第 3 条是会白屏的
（`#d-close`/`#q`/`#sort`/`#reset` 的 `addEventListener` 是无守卫顶层调用，少一个 id 整个 IIFE 抛错）。
其余 9 条改了没人知道。

历史验证：`deliverables/62/63/66/67/69-*` 下累积了几十个 CDP 探针，
**全部不在 `_build/` 里、没有一条进过任何闸门**。它们是考古证据，不是回归防线。

### D-2【最高】「记录了 ⇒ 不必修」已成制度化反射

README 有 11 条「已知边界」，**0 条有对应的产品改动，全部处理方式是「把它写准」**：

| 限制 | 处置语 | 产品改动 |
|---|---|---|
| S08 两条 FAIL | 写豁免表 | 无 |
| 底色同质 18/30 | 「报数字必须附判据」 | 无 |
| 首屏无导航 83% | 「该指标量不到页内锚点」 | 无 |
| 圆角 96.7% | 报两个口径的数 | 无 |
| 安静档只有 2 案 | 「别把这组数当 tone」 | 无 |
| `file://` 下 S04/S07 空白 | 「比页面本身的任何缺陷都严重」 | **无** |
| 13/30 超字节目标 | 「中文正文压不下去」 | 无 |

最扎心的是 `file://` 那条：README 自己判它「比页面本身的任何缺陷都严重」，然后只是写进 README。

**可证伪的对照**：同一个仓库，对「我混用过三个分母」写了 200 字计量学说明并进正文；
对「提示词有 5 栏/7 栏的错」至今没修，`check-prompts` 判 PASS。
**坦诚是有选择的：对自造的测量极其坦诚，对自造的产品极其宽容。**

### D-3【最高】提示词让 AI 做一个它没被告知怎么做的效果

**30/30 原型都带 `<script>`（共约 2,844 行内联 JS），而提示词的 DNA 里 0/30 提到 "script" 或 "JavaScript"。**

这不是遗漏一个细节，而是自相矛盾：S07 的签名机制「同一段文字在纸背做镜像偏移」
**在纯 CSS 下物理上做不到**——它靠 123 行 `getBoundingClientRect` 逐行量几何 + SVG 文本重排。
提示词把这句话原样交给 AI，却没有任何 JS 指令。AI 要么忽略它，要么用 CSS 糊一个假的。

叠加已知的第二个缺口：`layout`/`visuals`/`motion`/`quirk` 四段里 **789 个带单位数字，只有 269 个（34.1%）进入提示词**；
**13 个人写散文字段被原样引用 0 次**；每条提示词 **37.7% 是共享样板**。

**留下的恰好是「不要做什么」**（圆角 0、无阴影、别用紫蓝渐变 —— 任何 30 案都成立的通用反 AI 条款），
**丢掉的是「这个风格是什么」**（栏宽比、栏数、基线、行长，以及**这个机制需要 JS**）。

且有一条**具体会教坏 AI 的错**：S07 的规格写「跨页版心左 5 栏右 7 栏」，
但 `style.css:74` 的 `grid-template-columns: 5fr 1px 7fr` 是**两页的宽度比**，
真实栏数由 `column-count: 2` / `column-count: 3` 决定 —— 共 5 栏，不是 12 栏。
这个误读一路传进 `_specs` → `04-schemes` → `11-compiled` → `data.js` → `prompts.js` → 用户剪贴板**六层**。
`check-prompts.mjs` 检查色值/线宽/字号/字体/圆角/阴影，**从不检查栏数** ⇒ PASS。

附录还有一条：S07 规格里的网格算式算出来是 **942px，实际 1360px，差 418px** ——
说明那个数字从一开始就不是量出来的。

> 这是全仓唯一一处：一个 `getComputedStyle` 就能证伪「实测抽取」这句话。
> 而仓库其余的一切都是为这句话做的担保。

**补充（第二份红队独立复核）**：机制句 —— 提示词里那句「签名机制」，也是**唯一传给用户的结构描述** ——
**没有任何闸门读它**。`check-*.mjs` 里对 `mechanism` 的引用全部是 `check-docs` 在数
「几个方案有机制」这类计数，**零条校验机制句里的数字**。抽检 162 个 token，11 个在 CSS 里找不到，其中三例是硬的：

| 案 | 机制句说的 | 实际 |
|---|---|---|
| S03 | 「右侧 **9 栏**」 | CSS 注释是「12 栏，左 3 栏年代轴，右 9 栏影像带」；`.plates` 实现为 `repeat(2, …)` 两栏一组 |
| S07 | 「正面 **5 栏** 对背面 **7 栏**」 | `5fr 1px 7fr` 是两页宽度比；真实 `column-count: 2` / `3` |
| S17 | 「金额列 **96px** 右对齐」 | `96px` 在 S17 的 `style.css` 与 `index.html` 里**出现 0 次** |

另：S03 机制句说「游标随**焦距比**移动」，实现在 `index.html:302-310` 是 1:1 跟随鼠标，
`grep 焦距` 全案 **0 命中** —— 同一个「用漂亮术语描述朴素实现」的毛病。

### D-4【最高，会丢数据】一个已入库的生成器是破坏性的，且破坏后所有闸门都看不见

`render-scheme.mjs:43` 把 `--out prototypes/<name>/.inspect` 传给外部 `inspect.mjs`。
`inspect.mjs:57-58` 先删截图、`:59` 才 `Browser.launch()`：

```js
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (/^(desktop|tablet|mobile)-(fold|page-\d+)\.jpg$/.test(f)) unlinkSync(...);
const browser = await Browser.launch();   // ← 删完了才启动
```

Chrome 起不来（`cdp.mjs:61` 硬超时 20s，本机冷启动实测 14.1s，余量仅 1.41×）
⇒ **8 张已入库截图被删、report.json 仍是旧的**。两次重试均复现（exit 6 / 52.2s 与 41.4s）。

**比「文件被删」更糟的是删完之后没人知道：**
- `verify-prototype.mjs:134-137` 只检查 `report.json` 里 `images[].fold` 字段**存在**，不 `stat` 文件；
- `check-stale.mjs:90-93` 的截图检查是 `if (jpgs.length) { … }`，**截图被清零时 `jpgs.length === 0`，整段静默跳过**。

⚠️ **一次 Chrome 启动失败 → 30 案截图证据被删 → 两个闸门同时宣称「达标」与「全部新鲜」。**

已跟踪的截图可用 `git checkout -- <案>/.inspect` 复原；**当轮新生成、尚未提交的截图不可复原**。
最小修复：把清图循环移到 `Browser.launch()` 成功后（一行移动），或渲染到 `.inspect.tmp/` 后原子 rename。

### D-5【中高】闸门与文档之间形成「自洽的假绿」闭环

| 缺陷 | 症状 | 性质 |
|---|---|---|
| `verify-prototype.mjs` 规则 4 | **不是死代码，这比死代码更糟**：真违规检出 **0**、误报 **100%** | 历史反事实：S02 最早提交 `caefdd9` 真的把 `background-image` 挂在 `body` 上，规则 4 在那版上**命中 0**。三类盲区实测全部漏报（相邻 `html/body`、注释隔断、`@media` 内 body）；**25/30 案存在「`html{}` 紧接 `body{}`」这个盲区形状**；唯一命中的 S02 抓的是注释 |
| `check-docs.mjs` 版式正则 | 只认自己写死的句式。README:556「26 prototypes pass **the mechanical** gate」因多个词而**不命中、静默放行** | 文件里 29 与 26 并存 8 天，13 个 PASS 全绿 |
| `data.js` ↔ `report.json` 无比对 | `data.js` 的 `gate` 是 report.json 的**快照**，S01 落后 **70 分 32 秒**；`check-docs` 全文不读任何 report.json，拿陈旧快照去核 README | **闭环**：快照陈旧 → 文档按快照写 → 自洽通过 |
| `check-docs.mjs:407` 失败开放 | `!s.gate \|\| !(s.gate.fail > 0)` 把缺失的 gate 算作「FAIL=0」 | 逻辑成立，当前不可达（30/30 非空）；`rm` 一份报告即可达 |
| `collect-schemes.mjs` | 零 `process.exit`/`throw`；数据坏了只 `console.log('⚠')` 并照旧写盘 exit 0 | 「数据质量无失败信号」为真（但抛点存在，`CI 永不红`这个推论为假） |

**规则 4 的盲区为什么重要**：它守的恰好是仓库自称「**唯一一条一破全假**」的规则
（`check-texture.mjs:1-18`：body 挂背景图会让对比度探针整条静默跳过）。
而它的输出经 `verify-prototype.mjs:167-171` 的 `bad++` 进入 `:178` 汇总行，
成为 README「29 个闸门 FAIL=0」这个被 `check-docs` 复算的断言的一部分。

**同一个坑本仓已踩过并修过一次**：`check-texture.mjs:49-63` 自己写着第一版正则
「相邻规则只能看到每隔一条……S02 的 `body{…}` 正好落在被跳过的一半里，闸门报违规 0」，
于是它被重写成花括号配对状态机。**`verify-prototype.mjs:76` 被留在了那个坑里。**

最刺的旁证：`deliverables/39-critique-toolchain-repro.md:407` 把这条规则评为
「19 条里最干净的一个实现」—— **那个评价正是由这条死规则产出的。**

**注意（经复核修正）**：`verify-prototype --all` 的 exit 1 **不是**缺陷。它问的是「FAIL=0 的案数」（如实答 29/30），
而「FAIL ⊆ 允许表」由**另一个脚本** `check-contract.mjs` 负责（C1，`parseAllowTable`）。
两者是同一件事的两种表述。真实风险只是：若把它直接接进 CI，红灯是永久的（29/30 永远不满）。

---

## 3. 已验证的缺陷账（可直接开工）

### 3.1 让用户看到错东西（UI 撒谎类，7/7 已独立验证）

| # | 缺陷 | 证据 | 成本 |
|---|---|---|---|
| 1 | **28 颗近似芯片完全无样式**，浏览器默认 `outset 2px / 16px`，比 16 颗直连芯片（13px）**更大更粗** —— 与页面图例「实心=直连」**完全相反** | `prompt-copy.js:1345` 挂到 `.rail-block` 外；`.chips button` 选择器不匹配；`is-direct/is-near` 全仓 CSS 引用 **0 处** | ~10 行 |
| 2 | 芯片计数写 47 实际 73，且**同一个错数字有三份副本、从未复算** | `index.html:153`（可见文本）+ `:145`（注释）+ `prompt-copy.js:1245`（注释）。`47 = 16 直连 + 31 筛选`（`d49ed74` 时刻），gate 值域从 4 塌成 2 后变 45 | 3 处 |
| 3 | 字段数写「多数 10 段」实际 12 | `index.html:211`；`field('` 11 处 + `auditFold` 1 处 | 2 字符 |
| 4 | **复制后焦点掉到 `<body>`** | `prompt-copy.js:931` `ta.focus()` → `:938` `removeChild`，无恢复 | ~6 行 |
| 5 | **方向键全局劫持**：在 `<body>`、`<a>`、行卡上按 ↓ 都会打开详情并 `preventDefault` 吃掉滚动 | `app.js:1562,1574` 守卫只排 `input/select/textarea/button`；实测 y 787→459、hash→`#S01` | ~4 行 |
| 6 | `aria-live` 只存在于注释里 | `index.html:232` 声称 `#count` 是活口；实测全文档唯一 `aria-live` 是 `#q-parked`（且 `display:none`） | ~4 行 |
| 7 | 60 张图下载后 `display:none` | `app.js:573` 每行 3 图、`style.css:541` 隐藏 2 张、无 `loading=lazy` | **省 4.84 MB** |
| 8 | **`scenesNo` 字段 30/30 有值、UI 零消费者** —— 每案都写了「不适合的场景」，页面从不显示 | `grep scenesNo app.js prompt-copy.js wizard.js index.html` = **零命中**（只在 data.js 里存在） | 接进详情面板 |

**第 2、3、8 条的共同根因**：`check-docs.mjs` 的 13 条断言**只读 `README.md`**，
`index.html` 是 0 条（它只被列进 `PREFIXES` 做路径存在性检查）。
所以「页面上写的数字」这一类，整套闸门体系一条都管不到。

### 3.2 展品层（30 案）

| # | 缺陷 | 证据 | 严重度 |
|---|---|---|---|
| 8 | **S21 `.lockbar{outline:none}`** 压掉全局焦点样式 → 18 个 `tabindex="0"` 元素零可见指示 | `S21/style.css:545` vs `:148`，同为 (0,1,0) 且后者更靠前 | WCAG 2.4.7 失败 |
| 9 | **4 案 56 个位图无署名**，而 `LICENSE` 自写「不得对外复用」 | S04/S07/S08/S17 的 `CREDITS.md` 首段自认；**三份文档三个数字**：LICENSE 说 56、README 说 46、盘上实测 **51**（LICENSE 漏 S03，README 漏 S03 和 S13） | 法律风险 |
| 10 | **S29 按钮非文本对比度 1.30:1**（页面自证 1.50，错） | `S29/style.css:146` | WCAG 1.4.11 |
| 11 | 22/30 案台上 3–4 个色块、提示词要 4–7 色 | 我独立复算：data `{3:5, 4:25}` / prompts `{4:10,5:3,6:6,7:11}`；上限链三层：`collect-schemes.mjs:526` 硬编码 4 → `clean-dna.mjs:1003` `MAX=7` → `app.js:518` 再 `slice(0,4)` | **定性为「设计而非 bug」，但披露不足** |

### 3.3 文档

**43 条量化断言逐条实测：31 TRUE / 3 STALE / 5 FALSE / 4 UNVERIFIABLE。**
双语结构完全对齐（1 个 H1 + 15 个 H2 + 8 个 H3，**零节缺失**），漂移在内容而非结构，且方向单一：**中文更新，英文滞后**。

| # | 缺陷 | 证据 |
|---|---|---|
| 12 | **README 一文件两个互斥世界**：L160「29 通过/2 失败」 vs L556「26 通过/8 条失败」 | 已 8 天，13 个 PASS 全绿 |
| 13 | README:393 称 `body-size` FAIL「是选的、不是漏的」—— 而 **同一个提交 `9d842c7` 已把它修好**（正文现为 16px，三档一致）。附带：它论证「抬到 16px 会让首屏掉到 0 卡」被同仓实测否掉（`style.css:508-511`：首卡 top `407.0 → 407.0`，Δ0） | 为不存在的缺陷编造可信辩解，且理由本身也被自己的测量推翻 |
| 14 | README:84「配色 4–5 个色值」实为 **20/30 案是 6–7 色** | 把 data.js 口径贴到了 prompts.js 的描述上 |
| 15 | README:86「外投影 0 案」实为 **1 案**（S13，`--press-4: 0 -2px 3px`） | 同文件 L427 自己承认有一处 |
| 16 | README:443「13/30 在 30–48.4KB，最大 S29 是 49,512B」**自相矛盾**：S29 实为 **49,596B**，落在区间内的只有 **12** 案 | 一句话里三个数互斥 |
| 17 | **契约的豁免阈值只存在于被 gitignore 的 `tools/` 里** | 实测 `git check-ignore` = `.gitignore:2:tools/`；`git ls-files tools/` 为空。读者照契约自查会得出与工具**相反**的结论 |

**上机走查在第 6 步就断了**：`render-scheme.mjs` 退出码 **4**（README 从未记录这个码）；
70 行闸门账目里的三条 `lint.mjs` 命令全部 `Cannot find module`；
`shot.mjs` 被称「完全零依赖」而相邻一行说它需要 Pillow。

**`deliverables/` 的裁决**：它**是决策日志，不是剧场** —— 文档 Agent 把三个报告过的缺陷追溯回了真实修复
（S02 的纹理、S13 的阴影、check-texture 闸门）。但它没有整理：编号 12 下有 **5 个互斥版本**，
32 个并行阶段目录。可移植的好东西约 10 份（见 §6）。

---

## 4. 已被证伪 / 被高估的说法（不要写进结论）

| 说法 | 裁决 | 依据 |
|---|---|---|
| 「`verify-prototype` 在修复前是通过的，被注释打红」 | **错** | 修复前同正则就 0 命中，它从未抓到过那个真违规 |
| 「复制功能坏了」 | **高估** | `navigator.clipboard.writeText` 是首选路径且实测成功；真缺陷只是焦点重置 |
| 「`<li role=button>` 隐藏了 `<h3>`」 | **部分错** | 摧毁列表语义为真；但 h3 仍在无障碍树中（`aria-label` 覆盖的是可读内容） |
| 「M01/M02 README 与根 README 现在矛盾」 | **错** | 今天是双方互相记录的豁免，计数一致；矛盾早于 `d27497d5` 并被 tombstone 记录 |
| 「模板层 box-shadow 声明是假的」 | **错** | M02 实测 0 处，声明成立 |
| 「`#id` 选择器在 S15/S29 大量泛滥」 | **错** | 首版正则把 `url(#p-frame)` 当 id 选择器；重扫后 29 案为 0，仅 S29 有 20 处 |
| 「两条数据链应合并」 | **不成立** | 上一轮三次自我推翻后确认：两条链描述不同层次，都对。抬到 7 会毁掉 `check-twolines` 的 R1/R6 与「24/30 与规格精确一致」；压到 4 会丢 52 个必需派生色 |
| 「22/30 色块不一致是 bug」 | **定性错，披露不足** | 是「设计意图 vs 施工细节」的有意分层。`README.md:176` 已如实写了分工；真问题只在 `PLAN-final.md:81` 拒绝披露时**只论证了「底色/主色都在」，没论证「次要色缺了几成」** |
| 「`body-size` 那条从来不是真的」 | **部分错** | 入库版确实从未有过（`git log -S` 零输出），但 2026-10-28 有一次**未入库**重跑确实含 `body-size`，`README.md:331` 与 `68-plan/REDTEAM-guards.md:157` 有记录 |

---

## 5. 六个候选开发方向

| 方向 | 交付什么 | 成本 | 风险 | 服务谁 |
|---|---|---|---|---|
| **A. 补运行时回归** | 把 `deliverables/` 下散落的 CDP 探针收成 `_build/probe-ui.mjs`，接进闸门：点芯片、按键、开详情、复制。另加 `run-gates.mjs` 聚合 8 个闸门 | 3–5 天 | 低 | 维护者；且**立刻**能抓到 §3.1 的 7 条 | 
| **B. 修 UI 撒谎 + 提示词正确性** | §3.1 全部 8 条 + **S03/S07/S17 机制句校正** + **给 `check-prompts` 加机制句数字断言（~60 行，会让这三案转红）** + S21 outline + S29 对比度 | 2–3 天 | 低 | 终端用户，**感知最强** |
| **C. 机器可读导出** | 从现有生成器额外吐 `schemes.json` + `prompts.json` + JSON Schema | 2–3 天 | 低（生成器已确定性验证） | agent 工作流搭建者 |
| **D. 收口文档** | README 双文件矛盾、`body-size` 谎、43 条断言全表校正；`deliverables/` 分 `docs/`（保留 ~10 份）+ 归档 | 2–3 天 | 低 | 所有新读者 |
| **E. 修生成器破坏性** | `inspect.mjs` 改「渲染到临时目录 → 成功才换」，`cdp.mjs` 超时 20s→60s | 0.5 天 | 低 | 所有维护者（防数据丢失） |
| **F. 提升展品差异化** | 攻击 18/30 暖浅底、96.7% 无圆角、L 20–60 全空 | 15–25 天 | **最高**（重渲染 272 张、全部 README 数字同时失效） | 「这算不算好设计」这个问题；但仓库自己的 `58-critique` 停线判据反对启动 |

**推荐顺序：E → B → A → D → C。** 不启动 F。

理由：E 是 0.5 天的止血（防止有人再丢文件，且修完前不应批量渲染）。B 是唯一能让终端用户当场感知到变好的方向。A 是把「一次性探针」变成「回归防线」，从此这类缺陷不再复发 —— 没有 A，B 修完还会再长。D 与 C 是让别人能进来，但排在后，因为在 B/A 之前它们只是把错误包装得更整洁。

**E 现在应该做的最小动作**（三处，都不超过一行）：
1. `inspect.mjs:57-58` 的清图循环移到 `Browser.launch()` 成功之后；
2. `cdp.mjs:61` 超时 20000 → 60000（本机冷启动已占 70%）；
3. `check-stale.mjs:93` 的 `if (jpgs.length)` 增加分支：report 声明有图但盘上为 0 时报缺陷（否则删图后仍报「全部新鲜」）。

---

## 6. 这个项目最值钱的三样东西（别在重构中弄丢）

红队给了一个分层评分，我认为公允：**产品 3/10，语料 7/10，它对「agent 治理能走多远」的记录 9/10**
—— 而 90% 的力气花在为那个 3/10 的部分写 QC 报告。

1. **`_CONTRACT.md` §9.17–§9.23 + `02-anti-ai-rules.md`（92KB 的禁用词表与判别规则）**
   两个文件、几十页，是「用 LLM 做设计时会踩什么坑」的可移植经验。目前被埋在 8.5MB 审计叙事里，读者找不到。
2. **30 条带逐行 CSS 出处的机制句**
   红队独立复算：机制句里的数字 **29/30 能在该案 CSS/HTML 里逐字找到**。
   这是全仓唯一「未付费替代品没有」的资产 —— 它讲**「为什么这样读起来是这样」**，
   而 Minick、HTML5 UP、ThemeForest、Awwwards、Coolors、Fontjoy 全部只讲**「看起来是什么样」**。
3. **`UNVERIFIABLE.md` 的那条自省**
   「1011 条去重约束里 35.8% 无对错之分，且**机械可验类 30.8% 不可验、软性类反而 43.3%** —— 精确感与可判定性负相关。」
   这一句本身比这个项目的大部分产出更有价值。

---

## 7. 六条工具链结论的独立复核裁决（第二轮已全部完成）

| # | 主张 | 裁决 | 关键更正 |
|---|---|---|---|
| T1 | `render-scheme` 失败即销毁截图 | **PARTLY TRUE** | 危害成立且**更严重**（删后两闸门都盲）；但「清空整个目录」过强 —— 只删 jpg 白名单，`report.json` 不删；也不是「静默」——`render-scheme` 会 exit 6 报出 |
| T2 | `verify-prototype` 不查允许表 ⇒ 永久 exit 1 | **PARTLY TRUE** | 事实全对，**定性错**：允许表由 `check-contract.mjs` C1 负责；`verify-prototype` 的 29/30 与 README 同义。**不是缺陷** |
| T3 | `_entries.mjs` 把 `prompts.js` 当源 | **CONFIRMED** | 同段注释以「产物不是源」排除了 data.js 与 self-gate.js，唯独漏了 prompts.js。只制造噪声（跑一次 build-prompts 报一次假陈旧），不制造假绿 |
| T4 | `collect-schemes` 零 exit ⇒ CI 永不红 | **PARTLY TRUE** | 字面真，**推论假**（未捕获异常即 exit 1）；实质「数据坏了也不红」为真 |
| T5 | `check-docs:407` 失败开放 | **CONFIRMED（当前不可达）** | 代码路径存在（`gate: null`），但 30/30 非空；`rm` 一份报告即可达。比原主张更直白：`!s.gate \|\|` 显式短路 |
| T6 | `data.js` 入库陈旧、无闸门比对 | **CONFIRMED** | S01 落后 **70 分 32 秒**（HEAD 同值）；`check-docs` 全文 grep `report.json` **零命中** |

**应优先阻断后续工作的是 T1**：其余五条代价是「判断不精确」，可事后纠正；
T1 让**常规执行**删掉已跟踪证据，且删除后的状态恰好是两个检查器的盲区。
