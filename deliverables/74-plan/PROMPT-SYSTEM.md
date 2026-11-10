# 74 · 提示词系统设计（PROMPT-SYSTEM）

> 角色：PROMPT-SYSTEM ARCHITECT。基线 HEAD `0432753`（2026-11-04）。只读源码 + 本机复算，不改产品文件。
> 口径：**[源码]** 给 `文件:行`；**[复算]** 给可重跑脚本口径与本轮实测数；**[设计]** 是建议，不是现状。
> 业主前提：**提示词就是产品输出**。店主浏览 30 个风格 → 选一个 → 复制提示词 → 粘进 ChatGPT/Claude/v0 → AI 产出站点。
> 提示词给错一个结构数字，用户会精确地做出一个错站；这比"少给了一条信息"更严重。

---

## 0. 一句话结论与六个建议（先看这张表）

| # | 问题 | 建议 | 一句话理由 / 关键数 |
|---|---|---|---|
| 1 | 提示词要不要写 JS | **选 (c) 的精确版：按案标注 `needsJS`，只给 A/B 两档的 12 案在提示词里插一段 60–110 字的可执行 JS 配方；同时把 (b) 的"静态壳"作为 3 个 A 案的显式降级路径写进同一段** | 30/30 有 `<script>` 只是"页面带脚本"，不是"机制需要脚本"。逐案读机制句 + JS 后：**A 类 3/30（S03/S07/S20）几何由 JS 生成，纯 CSS 真的做不到；B 类 9/30 由 JS 驱动而 CSS 塑形；C 类 18/30 的签名机制纯 CSS/静态 SVG 就成立**。给全部 30 案加 JS 指令会把 18 个别无必要的站点推向脆弱代码 |
| 2 | 最小可用提示词 | **不要继续加"更多数值"；把"唯一一句结构描述"换成结构化 `SPEC` 段：栅格 / 节奏 / 字阶 / 构造 / 图像 / 交互 / 内容量，七类各自 1 行，全部来自可复核的源码** | 现状 `dna.mechanism` 原文 74–118 字（均值 88.1）承载全部结构信息，且 162 个带单位 token 里 11 个对不上、3 案硬错；三案的正确句子见 §2 |
| 3 | 验证闸门 | **新增 `prototypes/_build/check-mechanism.mjs`，三层判据：字面 token（含变量/calc 展开）→ 结构化断言（`column-count`/`repeat()`/`@media` 落值）→ 角色化数字白名单** | 按现有 `_mech.mjs` 的朴素口径，30 案里 **6 案有 miss、11/162 token（6.8%）**；加 §3 的合理派生规则后 **3 案硬 FAIL（S03/S07/S17）**，其余是可解释的派生/注释值，转 WARN 或白名单 |
| 4 | 六层传播 | **`prototypes/_prompts/corrections.json` 作为唯一人工修订层（按 `id` + `field` + `sourceHash` 定位），由 `build-prompts.mjs` 最后一步 apply；`check-mechanism.mjs` 对最终 `prompts.js` 和剪贴板文本双断言** | 改 `_specs` 会被 `collect-schemes.mjs` 重生成吃掉；改 `prompts.js` 会被 `build-prompts.mjs` 重生成吃掉；只有"生成器必读、且每个修订都带来源哈希"的独立文件能活过任何一次重生成 |
| 5 | 38% 样板 | **保留** 8 条防退化 + 输出契约，**砍掉** 验收三问里两条不可判定的自评与第 3 问的不完整引用（漏了第 6 条字号），把腾出的约 55 字换成 §2 的 `SPEC` 段 | 复算本轮 30 条提示词：共 58,431 字，出现在 ≥27 条里的整行 22,490 字 = **38.5%**；通用条款防的是模型默认解，属于「同一类事故的正确护栏」，删掉会掉质量；但样板不该占掉结构信息的预算 |
| 6 | 质量门槛 | **两层：Q1–Q6 纯文本硬闸（30/30 必须过，含"注入三个已知错误必须被抓"的变异测试）→ Q7 半自动复刻（3 案 × 1 次模型调用，用 DOM 量 6 个量）** | 最便宜的端到端检查是：把提示词喂给模型一次，用 CDP `getComputedStyle` 量输出 HTML 的栏数/主轴宽/最大标题/正文比/线宽集合/图片位数，与原型同名 6 项比对；**不比审美、不比截图** |

### 术语：本文把"mechanism 需不需要 JS"分成三档，后面反复用

- **A · JS 生成几何**：签名的可见结构本身由 JS 造出来（DOM/SVG/canvas 节点、`getBoundingClientRect()` 量后重排、公式算 `d` 属性）。没有脚本，签名**不存在**。
- **B · JS 驱动、CSS 塑形**：几何在 CSS 里，但机制的定义性运动/状态由 JS 驱动（scroll 映射、pointermove、按下翻光源、进视口时序）。静态 CSS 近似仍能传达风格。
- **C · CSS 就够**：JS 只做按钮、空/错/载入态、`IntersectionObserver` 揭示、reduced-motion 降级；签名机制由 CSS 或静态 SVG 承担。

这套分档由独立只读测量 Agent 逐案核过 `index.html` 的 `<script>` 体、S07 的 `app.js` 与 `style.css`，并与 `prompts.js` 的 30 条 `dna.mechanism` 对齐。**[复算]** 结果见 §1.2。

---

## 1. 要不要把 JS 写进提示词

### 1.1 先把"30/30 有 script"这个数拆开

**[源码]** `deliverables/74-recon/redteam.md:618-621` 与 `schemes.md:75-76`：30/30 原型带 `<script>`，内联 2,844 行，S07 另有 123 行外链 `app.js`。**[复算]** 本轮逐目录数：`<script>` 开标签全库 **43 个**（**42 内联 + 1 外链**，外链是 S07 的 `prototypes/S07-slate-ink-contents/index.html:173`）；17 案只有 1 个标签，13 案有 2 个——这 13 案的**第一块全部是一行探针**（`document.documentElement.classList.add('js')`，S09 写成 `className += " js"`）。内联脚本体共 **2,845 行**（与 2,844 同，差 1 来自计数口径），加 S07 的 `app.js` 123 行合计 **2,968 行**。`schemes.md:76` 的「15 案 1 个 / 15 案 2 个」与本机 HEAD 差 2 案，按本轮复算为准。

但"有脚本"和"风格需要脚本"不是一回事。举例：

- `prototypes/S17-revenue-stamp-stub/index.html:190-318` 的 129 行 JS 做的是"核验按钮 → 错误态 → 导出 CSV → 账期切换 → 空态"（`:286-316` 甚至用 `Blob` + `URL.createObjectURL` 生成 CSV）。而该案签名机制（两联 3fr/16px/9fr、齿孔、`td.num{text-align:end}`）全在 `style.css:134`、`:146-151`、`:181`。**这 129 行是业务状态机，不是风格。**
- `prototypes/S03-long-exposure-observatory/index.html:211-348` 的 138 行则不同：`:62` 的 `<svg class="scale" id="scale" viewBox="0 0 264 640">` **是空的**，`:221-249` 用 `createElementNS` 逐条画刻度线、年份字与齿孔。没有 JS，264px 主轴是一块空白。

所以问题的正确问法不是"30 案要不要写 JS"，而是"**哪些案的 `dna.mechanism` 描述的动作，离开脚本就不存在**"。

### 1.2 测量结果（A=3 / B=9 / C=18）

**[复算]** 逐案分类，判据是"该案 `prompts.js` 里那条机制句所描述的签名动作，其源码实现落在哪里"：

| 档 | 案数 | 案号 | 机制句需要 JS |
|---|---:|---|---|
| **A** JS 生成几何 | **3** | **S03、S07、S20** | 是，且 CSS 无法替代 |
| **B** JS 驱动、CSS 塑形 | **9** | S06、S08、S10、S13、S14、S16、S26、S28、S30 | 是（要复刻"会动"的原型） |
| **C** CSS 就够 | **18** | S01、S02、S04、S05、S09、S11、S12、S15、S17、S18、S19、S21、S22、S23、S24、S25、S27、S29 | 否 |

- **严格口径（"物理上纯 CSS 做不到"）= A = 3/30。**
- **宽口径（"要复刻原型里那个机制的行为"）= A+B = 12/30。**
- 保守修正：S26/S28/S30 的机制句本身读起来是静态几何，原型另有 scroll 视差；若只按机制句字面，B 降到 6 案（S06/S08/S10/S13/S14/S16），宽口径为 **9/30**。本文建议采用 **3 / 12** 这对数，并把 9 作为"按字面口径"的脚注，因为产品承诺的是"这个风格"，而用户对照的是原型截图。

三条最硬的 A 类证据（都是 CSS 无对应能力的原语）：

1. **S07 · 逐行量几何再重排镜像文字。** 空壳在 `prototypes/S07-slate-ink-contents/index.html:94`：`<svg class="ghost" aria-hidden="true" focusable="false"></svg>`。`app.js:24` 先 `g.setAttribute('transform','translate(' + W + ',1) scale(-1,1)')`；`app.js:28-30` 对每个 `.toc li` 取 `getBoundingClientRect()` 与 `getComputedStyle(t).fontSize` 压成 `{left, top, text, size}`；`app.js:35-41` 才 `createElementNS(NS,'text')` 逐行写 `<text>`。`style.css:105-107` 的 `opacity:var(--ghost-o,.08)` / `.hot{opacity:min(.14, calc(...))}` 由 `app.js:51-58` 的 `deepen()` 按滚动位置改 `--ghost-o`。**CSS 既不能读每一行的实时几何，也不能按行数生成文本节点。** `transform: scaleX(-1)` 整块镜像只是"看起来像"，行对不齐、字号与页码错位，正是 `03f6fd4` 记下的那个未修缺陷。
2. **S03 · 空 SVG 由脚本画刻度轴。** `index.html:62` 是空 `<svg>`；`index.html:221` `var el = document.createElementNS(NS, "line")`；`:229-231` `for (var y = 640; y >= 0; y -= 8) line(major ? 176 : 208, y, 264, y, major ? 1.5 : 1)`；`:237-249` 另生成年份 `<text>` 与齿孔 `<rect>`。另有 `:262` 的 `getBoundingClientRect()` 走片视差、`:306-308` 的 `cursor.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"` —— 后者是 1:1 跟随鼠标的十字线，**"游标随焦距比移动"在整案目录里 `grep 焦距` 0 命中**（只有 `_specs/S03.md:15` 那一句）。
3. **S20 · 三角函数算 path。** `index.html:272` `r = R0 + i * sp + t * (A1 * Math.sin(L1 * th + P1) + A2 * Math.sin(L2 * th + P2))`；`:286` `createElementNS(..., 'path')`；`:311` `o.setAttribute('d', r.d)`。CSS 不能按公式生成变数量的 `<path>` 或写 `d`。

B 类里最接近可 CSS 化的是 S06/S08 的 scroll 位移（现代 `animation-timeline: scroll()` 在部分浏览器可替，但 v0 产出的通用单文件要跨浏览器，不能依赖），最不可替的是 S13 的按下翻 315° 光源与 S14 的 `DOMMatrixReadOnly` 读实时 transform。

**[设计]** 这条同时修正 `deliverables/74-recon/redteam.md:623` 的 "4/30 机制句含需交互的动作"：按它自己的词表再加「进视口」「平漂」「移动」，至少 **6/30**（S03/S06/S08/S10/S13/S14）；而动词计数根本不覆盖 A 类 —— S07、S20 的机制句一个交互动词都没有，却是最硬的 JS 依赖。所以**不能靠"机制句里有没有动词"判 needsJS，必须逐案实测代码**。

### 1.3 三个选项的公平比较

#### (a) 给全部提示词加一段显式 JS 指令

**会写什么**（若照 `deliverables/74-plan/DELIVERY.md:200-202` 的草案）：

> 「这个风格的核心动作必须用内联 `<script>` 实现（在单个 HTML 文件内，不拆文件、不引框架）：先量出需要对齐的元素几何，再按下面的机制驱动；脚本失效时页面必须退化为静态可读版本。」

- **长度**：实测 93 字（含标点），相对 S07 提示词 1,844 字 **[复算]** 是 **+5.0%**；30 条平均 1,948 字，`+4.8%`。体积本身不是问题。
- **会不会诱导脆弱代码**：会，且是结构性的。这句话只说"量几何"不给算法，模型最容易写出的是 `window.onload` 里一次性 `getBoundingClientRect()` + 硬编码偏移，**不监听 `resize`、不处理字体加载完成后的重排、不做 `prefers-reduced-motion`**。S07 的 `app.js:121` 恰好监听 `resize` 重跑 `buildGhost(0)`、`:10` 有 `MIRROR_BUDGET=46` 上限、`:122` 监听 `reduce.addEventListener('change')` —— 一句泛泛的"量几何"把这三件最贵的经验全丢了。更糟的是：**18 个 C 案本不需要脚本**，让 AI 为「静态红楔 `clip-path`」（S01 `style.css:99,145`）写测量脚本，等于主动引入一个会坏的新层。
- **对"粘进 v0/ChatGPT"的可用性**：ChatGPT/Claude 输出单文件 HTML 没问题；v0 是 React/组件工作流，`<script>` 常常被忽略或改写，且它已有自己的状态模型。**"只给一个完整单文件 HTML"**（`prompt-copy.js:820`）与"用内联 script 量几何"在 v0 里同时给，用户会拿到一个 script 被剥掉、机制静默消失的版本。这不是"能不能粘"，是"粘完还认不认得出来哪里坏了"。
- **一个反向好处**：它确实堵住 "0/30 提 JS" 这个字面缺口，且实现成本最低（改一处模板）。

**裁决：不做成 30/30 通用段。** 但要把它**按档收窄**后用在 12 案上（见推荐方案）。

#### (b) 限定范围：提示词只产出静态壳，并在提示词里写明

**会写什么**：

> 「这一版只做静态外壳：版心比例、栏数、字阶、色与线、图像占位都按下面规格落地。签名机制中依赖脚本的动作（本案：{动作名}）这一版不做，用一段静态近似代替；需要可运行版本时再向我要一次。」

- **丢了什么**：S07 的"纸背逐行镜像"（用户看到原型截图时会发现背面文字没了）、S20 的 20 条公式走线、S03 的整条刻度轴；B 类 9 案的滚动/按下时序。合计 12/30 案的"最不像别人"的那一件事被明确放弃。
- **诚实吗**：**作为工程说明是诚实的，作为产品交付是不够的。** 业主的固定前提是"提示词就是产品输出"，而原型卖点写的是"30 个能跑的风格，不是 30 张配色图"（`README.md:7`）。让提示词自己宣布"我不产出能跑的那部分"，等于把产品的差异化主动降级成配色卡。并且 `prompt-copy.js:773` 现在写着「⑧ 动效只用本案机制句里写到的那一个动作，其余位置保持静止」—— 如果同时说"静态壳不做机制"，这两句在模型眼里是互斥的，正是本仓反复记录的"两条相反指令二选一"病。
- **它的正确位置**：不是主路径，而是 **A 类 3 案的降级兜底** —— 脚本失效/目标工具不支持 JS 时，明确告诉 AI 该退化成什么，而不是让它悄悄糊一个假的。

**裁决：不作为总策略，保留为 A 案的 `fallback` 字段。**

#### (c) 逐案标注 needsJS + 每段一句机制特定的说明

- **要标几案**：不是 30，是 **12**（A 3 + B 9）。`DELIVERY.md:199` 提议"由生成器从 `index.html` 是否含 `<script>` 现算 `needsJS`"—— 这个判据**会把 30/30 全标成 true**，因为它测的是"有没有脚本"，不是"机制依不依赖脚本"。**必须改成从一张逐案人工核过的分档表读，且由 `check-mechanism.mjs` 用静态 API 特征自动复核**（见 §3.4）。
- **每案写什么**：不是通用段，是**该案的算法要点**。例：
  - S07：「纸背镜像必须用内联 `<script>`：遍历 `.toc li`，对每行用 `getBoundingClientRect()` 取 left/top 与 `getComputedStyle().fontSize`，在覆盖整个版心的 `<svg>` 里逐行生成 `<text>`，整组 `translate(版心宽,1) scale(-1,1)`；`resize` 与字体加载完成后重算；滚动时把 `--ghost-o` 在 0.08↔0.14 之间线性插值；`prefers-reduced-motion` 下固定 8%。脚本不可用时只保留正面目录，不要画整块模糊镜像。」（约 140 字）
  - S03：「264px 刻度轴是空 `<svg>`，用脚本按 8px 步长生成 1px 细线、每 40px 生成 1.5px 粗线，年份按 5 年一枚排；滚动时影像带按 0.5 倍反向位移、上限 ±40px。」（约 85 字）
  - S20：「按 `r = R0 + i*sp + t*(25sin(11θ+0.35)+8sin(13θ+2.1))` 生成 20 圈 `<path>`，线宽恒 0.35px，变化的是 0.6/1.2/2.4px 三档**走线间距**。」
  - B 类只需一句短配方：「滚动位移用 `requestAnimationFrame` + `transform`，不动 layout；`prefers-reduced-motion` 下关闭。」（约 45 字）
- **成本**：12 段人工文本合计约 900 字，放 `corrections.json`（§4），生成器按 `id` 注入；模板只加一个 `{{JS_RECIPE}}` 占位与 `needsJS` 分支，**`buildPrompt()` 不新增 30 份分支**。

### 1.4 推荐：**(c) 分档版 + (b) 作为 A 案降级 + (a) 的模板位置**

具体落地（按优先级）：

1. `prompts.js` 每案新增 `needsJS: "A"|"B"|"C"`（不用布尔；三档决定了提示词里那段文字的长度与 UI 标记）。来源：`prototypes/_prompts/corrections.json`，由 `build-prompts.mjs` 合并。
2. `prompt-copy.js` 在 `lines.concat([...])` 的 `mech` 之后、视觉硬约束之前插一个 `SPEC` 段（§2），其中第 7 行 `交互与脚本：` 由 `needsJS` 驱动：C 案写「签名机制由 CSS 完成，script 只用于状态与可访问性，不参与版式」；B 案写短配方；A 案写算法要点 + fallback 句。
3. UI 上：卡片/复制按钮旁的标记**只对 A/B 12 案显示**「这一案的核心动作需要 JavaScript」；`DELIVERY.md:199` 的"30/30 全标是"改成"12/30 标是，18/30 标'静态即可'"。后者同样是诚实信息，且对店主是有用的筛选条件（"我只会粘进 v0"→ 优先 C 案）。
4. **不要**把"先量几何再驱动"写成 30 案通用句；也不要在提示词里承诺"1:1 复刻原型"（`DELIVERY.md:379` 已正确禁止）。

**量化回答业主的问题**："30 案里有多少机制真的纯 CSS 做不到？" → **严格 3/30（S03、S07、S20）**；"有多少案要复刻原型行为就得写 JS？" → **12/30**；"30/30 有 `<script>`" 是页面事实，不是提示词事实。

---

## 2. 「AI 能照着做出这个风格」的最小可用提示词

### 2.1 先反推：三条错误句子各自的正确版本

下面每条都逐字核过 `style.css` 与 `index.html`。**左边是用户今天复制到剪贴板的原文**（取自 `prototypes/_selection/prompts.js` 的 `dna.mechanism`，由 `prompt-copy.js:308-309` 加前缀「这个风格的签名动作：」输出），右边是能真正产出原型的句子。

---

#### S03 · 长曝光观测站

**今天（错）**：

> 这个风格的签名动作：一条 264px 宽的纵向刻度轴随滚动固定，右侧 **9 栏**的高度按 30 秒曝光折成 **28px 一档**，四角遮罩压掉 32%，**游标随焦距比移动**——层级由高度与固定位置承担，不由名字承担。

三处要改，但**只有两处是硬错**——第三处是措辞误导、比例其实是对的（这一区分很重要，否则闸门会误杀）：

1. **硬错 ·「右侧 9 栏」**：`style.css:124` 实际是 `.chrono{display:grid; grid-template-columns: var(--axis-w) minmax(0,1fr)}` —— **两列**，左列 `--axis-w:264px`（`style.css:17`），右列一整块 `.stream`。`9 栏` 只活在 `style.css:120` 的一行注释「12 栏，左 3 栏年代轴，右 9 栏影像带」和 `_specs/S03.md:25` 的施工前意图里；**注释不是实现**。`style.css:188` 的 `.plates` 是 `repeat(2, minmax(0,1fr))`，也不是 9 栏。
2. **硬错 ·「游标随焦距比移动」**：`index.html:306-308` 是 `cursor.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"`，1:1 跟随鼠标的自绘十字线；`grep 焦距 prototypes/S03-long-exposure-observatory/` **0 命中**（本轮实测，含 `_specs` 之外的整个目录）。
3. **措辞误导但不假 ·「30 秒曝光折成 28px 一档」**：实测 8 条带的 `--h`（`index.html:71,75,79,83,87,91,95,99`）与 caption 里的秒数满足 **`h = round(秒数 × 28/30)`，8/8 精确吻合**：

   ```
   30s→28  45s→42  15s→14  60s→56  20s→19  40s→37  90s→84  25s→23   全部 = round(s × 0.9333)
   ```

   所以比例是对的，问题是「一档」这个词把**连续线性映射**说成了**离散档位**，AI 很可能据此做成等高档。正确写法是给公式，不是给档位。**闸门对这类只能 WARN**（`derived` 声明为 `h = round(s*28/30)` 并给出 `index.html:71-99` 的 8 个实例即可 PASS）。

**正确句子（可直接替换 `dna.mechanism`）**：

> 这个风格的签名动作：整页暗底上，左侧一条 264px 宽、`position:sticky` 的纵向刻度轴（空 SVG 由脚本按 8px 步长画线、每 40px 加粗到 1.5px），右侧是**一整列** 8 条影像带：每条带的高度 = 曝光秒数 × 28/30（30 s → 28px、90 s → 84px，连续换算不是离散档位），带间 4px 间隙，右侧 220px 固定图注位；四角叠一张预生成的 cos⁴ 减光位图，中心 0、四角 32%；指针进入影像带时换成 1.2px 自绘十字并 1:1 跟随鼠标，滚动时整列影像带按 0.5 倍速度反向位移（上限 ±40px）——层级由带高与固定位置承担，不由名字承担。

为什么这句能产出原型：它给了**列数与列宽**（1 个 264px + 1 个 fluid，明确"一整列"）、**带高的换算公式**（`× 28/30`，替掉"一档"）、**4px 节奏**、**图注位宽度**（220px，`style.css:165`）、**图像处理的来源**（预生成位图，不是 CSS 渐变）、**两个交互的原语与倍率**。原来的「9 栏 / 焦距比」两个幻觉全删，「一档」改成公式。

---

#### S07 · 铅灰油墨目录

**今天（错）**：

> 这个风格的签名动作：同一段文字在纸背以 8% 至 14% 不透明度做镜像并整体偏移 1px，**正面 5 栏对背面 7 栏**、栏线 0.5px，页码竖排 28px 行高——正反两面同时进入同一张版心。

**[源码]** `style.css:74`：

```css
.pages{position:relative;display:grid;grid-template-columns:5fr 1px 7fr}
```

`5fr 1px 7fr` 是**两页的宽度比**（中间 1px 是跨页实线，见 `style.css:70` 的注释），不是栏数。真实栏数在 `style.css:81-82`：

```css
.page-recto .toc{column-count:2}
.page-verso .toc{column-count:3}
```

即**正面 2 栏、背面 3 栏，共 5 栏**；`--gutter:18px`（`style.css:12`）、`--lead:28px`（`:14`）、`--base:7px`（`:13`）。`style.css:80` 的 `column-rule:.5px solid var(--slate)` 是那句 `0.5px` 的出处（本轮 `_mech.mjs` 把它判成 miss 是因为脚本写的是 `.5px` 而非 `0.5px`，属口径问题，见 §3.3）。`_specs/S07.md:23` 与 `data.js:521` 把 `5fr/7fr` 写成「左 5 栏右 7 栏（栏宽 62px、栏沟 18px）」，`--module:62px` 在整份 CSS 里只用于 `.lede` 的 `max-width:calc(var(--module)*14 + var(--gutter)*13)`（`:49`），**与栏宽无关**；规格的网格算式算得 942px，实际版心 1360px，差 418px。

**[复算]** 1440 档：recto 566px 分 2 栏 ≈ 274px/栏，verso 793px 分 3 栏 ≈ 258px/栏。若 AI 照「5+7 栏」做，每栏约 113px，中文标题会碎成每行两字 —— 这正是 `style.css:169-175` 作者自己记录的事故。

**正确句子**：

> 这个风格的签名动作：同一张版心用 `grid-template-columns: 5fr 1px 7fr` 切成窄正面／1px 中缝实线／宽背面，两页宽度比 5:7；正面目录 `column-count:2`、背面 `column-count:3`（共 5 栏），栏沟 18px、栏线 0.5px，基线 7px／正文行高 28px，页码贴右缘竖排；纸背镜像不是整块翻转：用内联脚本遍历 `.toc li`，按每行 `getBoundingClientRect()` 的 left/top 和 `getComputedStyle().fontSize` 在覆盖版心的 `<svg>` 里逐行生成 `<text>`，整组 `translate(版心宽,1) scale(-1,1)`（1px 纸厚），不透明度锁 8%–14% 且随滚动线性加深，`resize`／字体加载后重算；`prefers-reduced-motion` 下固定 8%。正反两面同时进入同一张版心。

这句额外做了一件事：把 §1 里 S07 的 JS 配方**放在机制句里**，而不是另起一段通用 JS 声明。模型读到"做镜像"的同一句里就拿到了"必须逐行量几何"这个约束，不会出现前半句要效果、后半句才说怎么做的割裂。

---

#### S17 · 税票存根联

**今天（错）**：

> 这个风格的签名动作：两联按 3fr、16px、9fr 分栏，中缝是孔径 1.2px、孔距 6px 的孔列，行高 24px、**金额列 96px 右对齐**，印面偏中缝 2mm——撕口位置与小数点对齐即读出归属。

**[源码]** 除 `96px` 外全对：`style.css:134` 是 `.sheet{grid-template-columns:minmax(210px,3fr) 16px 9fr}`；`:146-151` 的 `.perf` 用内联 SVG `circle r='1.2'` 做 1.2px 孔径、6px 孔距；`:18` `--row:24px`、`:163` `height:var(--row)`；`:181` `td.num{text-align:end}`；`:20` `--stamp-shift:2mm`、`:195` `margin-left:var(--stamp-shift)`。

`96px` 在 S17 的 `style.css` 与 `index.html` 中**出现 0 次**（`index.html:95/102/106` 里的 `96.00`、`396.00`、`960.00` 是金额，不是长度）。它来自 `_specs/S17.md:26`「金额列宽固定 96px」与 `:29`「≥1440px … 金额列固定 96px；1024–1439px … 压到 80px」—— 这是**施工前规格**，实现时改成了 `style.css:320`：

```css
@media (min-width:1024px) and (max-width:1439px){ … td.num { width: 88px; } }
```

且这个 88px **只在 1024–1439 档存在**；≥1440 档 `td.num` 没有 `width`，由表格内容自然撑开，`<1024px` 档 `style.css:340` 把对齐改成 `text-align:start`。

**正确句子**：

> 这个风格的签名动作：两联用 `grid-template-columns: minmax(210px,3fr) 16px 9fr` 分栏，中缝是 1.2px 孔径／6px 孔距的连续圆孔列（SVG pattern，不是虚线边框）；明细行高 24px、行间只用 1px 浅色行线，金额列等宽数字 `text-align:end` 且 `tabular-nums`，让小数点垂直对齐（1024–1439px 档该列收为 88px，<1024px 转为行末紧跟、左对齐）；骑缝章跨两联、盖章中心相对齿孔线固定偏移 2mm，双色套印错位 0.8px——撕口位置与小数点对齐即读出归属。

注意 `96px` 不是改成 `88px` 就完事：88px 只在一个断点里。正确写法是**把断点行为写进句子**，否则 AI 会在所有视口写死 88px，那是另一种错。

---

### 2.2 泛化：每份提示词必须携带的七类信息

把上面三条正确句子与现有 `buildPrompt()` 逐行对照，得出"AI 能不能搭出这个版式"所需的最小信息类。**[复算]** 现状取自本轮 `vm` 载入 `data.js` + `prompts.js` + `prompt-copy.js` 后跑 `buildStylePrompt(id,{})` 的 30 份全文（S07 = 1,844 字，30 条共 58,431 字、均值 1,948 字）。

| # | 信息类 | 定义（可直接写进提示词的一段话） | 现状覆盖 | 现有出处／缺失 |
|---|---|---|---|---|
| 1 | **布局比例与栏数** | 主体栅格几列、各列宽或比例、中缝、断点下怎么折 | **部分，且唯一的结构句有硬错** | 只在 `dna.mechanism` 里；`layout` 字段 0/30 进提示词（`redteam2.md:44`）。`prompt-copy.js:532-535` 的「结构约束」讲的是**条目数**，不是栏数。S07 的 5/7 误读就出在这里 |
| 2 | **密度与节奏** | 行数/条目数的设计规模、行高、栏沟、单元间的间隙、留白占比 | **部分** | `minItems`/`minPics` 在 `prompt-copy.js:623,682`；`bodySize`/`h1SizeAt1440` 在 `:518-530`；但 `line-height`、`gap`、基线格（S07 7px、S03 8px、S27 7px）**30/30 缺失** |
| 3 | **字阶与字体角色** | 最大标题/正文倍率、完整字体链（含中文回退）、等宽数字用在哪 | **好** | `prompt-copy.js:227-302,518-530`。这是全库做得最完整的一类，别动 |
| 4 | **签名构造（mechanism）** | 一段可执行的「怎么搭」，含数值与出处 | **有 1 句，但 3 案硬错、11 token 对不上** | `prompt-copy.js:308-309`；`prompts.js` 30 条 `dna.mechanism` 原文 74–118 字、均值 88.1（进提示词后加前缀约 98） |
| 5 | **图像与材质处理** | 几张图、每张占多大面积与比例、裁切/滤镜/预生成位图 vs CSS 渐变 | **弱** | `prompt-copy.js:682-683,838-839` 只给数量与占位路径；S03 的"cos⁴ 预生成遮罩位图"（`style.css:150-153`）、S07 的"100 线单色网点 + 铅灰套印"、S17 的"SVG pattern 齿孔"全都 0 字进提示词 |
| 6 | **交互与脚本** | 哪个动作会动、由什么驱动（scroll/pointer/press）、倍率与上限、脚本失效时退化成什么 | **0/30** | 提示词里唯一相关的是 `prompt-copy.js:773`「动效只用本案机制句里写到的那一个动作，其余位置保持静止」—— 它要求动作却不给实现，且给了"静止"这个更省力的出口（§1.3(b)） |
| 7 | **输出契约与防退化** | 单文件 HTML、图片路径、移动端、正面唯一解的 8 条通用处方 | **过强** | `prompt-copy.js:725-773,811-843`。占 38.5% 字符，是唯一被完整传输的一层 |

另有三类**不该进提示词**（否则又变长又引入矛盾）：作者叙事/参考来源、性能预算与字体子集、闸门报告与 `source:` 行号。它们是仓库资产，不是执行指令。

**[设计] 最小可用提示词 = 现有模板 + 一个 7 行的 `SPEC` 段，删掉自指验收问句**。把 `mech` 那一句拆成结构化的 7 行，而不是继续往 98 字里塞：

```
本案施工规格（逐条落地）：
· 栅格：{grid}            ← 例：5fr 1px 7fr；正面 column-count:2、背面 3；≤1279px 折单页、≤899px 单栏
· 节奏：{rhythm}          ← 例：栏沟 18px、基线 7px、行高 28px、页码竖排
· 字阶：{type}            ← 沿用现有第 2、6 条硬约束，不重复第二份
· 构造：{mechanism}       ← 校正后的机制句（§2.1 三句），含该案的 JS 配方
· 图像：{images}          ← 例：≥7 个不同图位；档案照转单色网点、一张加铅灰套印
· 交互：{interaction}     ← needsJS 分档句 + 降级（§1.4）
· 内容量：{capacity}      ← 沿用现有结构约束 1–4 条
```

七行各自 ≤120 字，合计约 +400 字（+20.5%），但换来的是**每类都有可复核来源**。配套删 `prompt-copy.js:811-818` 的「验收三问」（**[复算]** 30 案均值 150 字，其中第 1/3 问是让模型自评「气质对不对」「8 条看不看得见」，无任何可判定性），改成 §5.4 的约 95 字自检，再从结构约束压缩约 60 字，净增约 +285 字（+14.6%）。仍落在 `check-docs.mjs:644-699` 允许的漂移容差之外，**需要同步更新 README:80 与 README-EN 的 1814–2138 / 1988 三个数**——这是改动清单里容易被漏的一处。

### 2.3 为什么是"七类"而不是"把 789 个数字全塞进去"

`redteam.md:15-25` 的 34.1%（269/789）不应直接当作"要补到 100%"的目标：那 789 个 token 里有大量作者叙事、性能预算、审计阈值（例 S03 的"ISO 1600"、"±5 级噪声"、"LCP ≤2.0s"），塞进提示词会挤占注意力预算还会自相矛盾（CSE arXiv 2608.12426 的结论在 `prompt-copy.js:508-509` 已被仓库引用：20 条约束已在崩塌区）。

**正确的补法按"信息类"补，不按"数字个数"补**：每类挑 1–3 个**决定形状**的值（栏数、栏沟、行高、图片比例、脚本倍率），其余留给模型。上面七类 × 每类 ≤3 值 ≈ 最多 21 个新数值，而当前每条提示词已有 467 个带单位 token（**[复算]** 30 份全文）—— 问题从来不是数字少，是**数字全在色值/字阶/防退化上，结构那格是空的且有一句错的**。

---

## 3. 验证闸门：把「机制句」变成可判定的数据

### 3.1 现状的洞有多大（复算口径）

**[源码]** `prototypes/_build/check-prompts.mjs:379` 的 `KEY_FIELDS = ['h1Size','lineWidths','radius','shadow']`；全文 `.mechanism` 引用 **0 次**。`check-docs.mjs`、`check-contract.mjs`、`check-twolines.mjs`、`check-texture.mjs`、`check-stale.mjs`、`check-anchors.mjs`、`verify-prototype.mjs` 同样为 0（`deliverables/74-recon/redteam2.md:216-225`）。**唯一被送进用户剪贴板的结构描述，是全仓唯一没有闸门读的字段。**

**[复算]** 重跑 `node deliverables/74-recon/_mech.mjs`（脚本逐案取 `dna.mechanism` 的带单位数字，回 `style.css + index.html` 剥注释后做正则匹配）：

```
TOTAL tokens 162   missing 11   6.8%
按案：S09 3 miss / S07 2 / S13 2 / S17 2 / S03 1 / S10 1，其余 24 案 0
```

11 个 miss 逐条定性（这一步很关键，否则闸门会误报）：

| 案 | token | 判定 | 依据与处理 |
|---|---|---|---|
| S03 | `9 栏` | **硬错** | `style.css:124` 两列；9 只在 `style.css:120` 注释里。**FAIL** |
| S07 | `5 栏` / `7 栏` | **硬错，但现有脚本放过了** | **[复算]** `_mech.mjs` 对「栏/列」的候选正则之一是 `grid-template[^;]*N`，于是在 `.pages{grid-template-columns:5fr 1px 7fr}` 里匹配到 `grid-template-columns:5` → 判「5 栏」存在；「7 栏」更是四路全中（`repeat(7` 来自 `.plate-grid`、`span 7` 来自 `.plate.wide`、`grid-column:span 7`、`grid-template-columns:…7fr`）。**同一个 30 行的脚本对同一件事既误报（S09/S13）又漏报（S07）**——这就是为什么闸门必须做 L2 结构断言，不能只加正则 |
| S07 | `0.5px` | **口径误报** | `style.css:80` 写的是 `.5px`，值相同、字面不同 → 归一化小数后 PASS |
| S07 | `14%` | **派生** | `style.css:107` `min(.14,calc(var(--ghost-o,.08)*1.75))`；`.14` = 14% → 声明 `derived` 后 PASS |
| S17 | `96px` | **硬错** | CSS/HTML 0 次；真实是 `@media 1024–1439` 的 `88px`（`style.css:320`）。**FAIL** |
| S17 | `1.2px` | **误报** | `style.css:148` 的 SVG data-URI 里是 `r='1.2'`（无单位）→ 无单位数值容差后 PASS |
| S09 | `3.5px`、`5%`、`10%` | **误报 + 范围声明** | `3.5` 以 `stroke-width:3.5`（无单位）存在于 `style.css:312`；`5% 至 10%` 是**区间**，实测缺口 6.0% 与 7.7%（`style.css:310`）落在区间内 → `range:[5,10]` 声明后 PASS |
| S13 | `3%`、`14%` | **四舍五入** | 机制句写 3% / 14%，源码实测 3.1%（`style.css:17`：`0.55*85.1+0.45*78.2=82.0`，比纸面低 3.1%）与 14.1%（`:18`：`(85.1-73.1)/85.1`）→ 精度容差（±0.2）后 PASS；只在注释里可复算，记 `derived` |
| S10 | `1px` | **语境派生** | 机制句「红版相对黑版固定右下错 1px」是设计意图，CSS 用 `calc()`/变量偏移组合实现 → `derived` |

**[设计] 结论：按朴素 token 口径会报 6 案 / 11 个；加上合理的归一化与派生声明后，真正必须红灯的是 3 案（S03、S07、S17）**，正好对应业主点名的三案。另有两个纯文本漏抓项：S03 的「焦距比」不是数值 token（靠 §3.4 的语义词检查），S07 的「5/7 栏」被模糊正则误判为存在（靠 §3.2 的 L2 结构断言）。**所以 L2 不是锦上添花，是这个闸门能不能成立的必要条件。**

### 3.2 三层匹配策略（从便宜到贵，逐层收窄）

不要用「computed styles 全面比对」当主判据：`check-prompts.mjs:144-157` 已经用 28 档实测证明 Chrome 在 dpr=1 会把 `border-width` 量化成 `max(1, floor(w))`，声明 `0.5/1.2/1.5px` 的 computed 全是 `1px`，用渲染值反查提示词里的小数线宽必然 100% 误报。**主判据是源码对账，computed style 只用于 L2 的「栏数/主轴宽」这类不会被量化的布局量。**

#### L1 · 字面 token 对账（纯文本，秒级，30/30 全跑）

输入：`prompts.js` 每条 `dna.mechanism` + **最终剪贴板全文**（不只是 DNA——见 §3.4 的「双断言」）；参照：该案 `style.css` + `index.html` + 外链 `app.js`（S07 必读），**剥注释前/后各存一份**。

1. 抽 token：`/(\d+(?:\.\d+)?)\s*(px|%|fr|mm|em|ch|vh|deg|°|s|ms|栏|列|行|枚|档|级|秒|倍)/g`。比 `_mech.mjs` 多收 `fr/mm/em/ch/vh/倍`，因为 `SPEC` 段会写这些。
2. 归一化：`0.5px` ≡ `.5px`；`14%` ≡ `0.14` / `.14`；`deg`/`°`/`度` 互通；`秒` ≡ `s`；去掉数字与单位间的空格；`1.2px` 允许匹配 SVG 属性 `r='1.2'`（无单位，但同段落须有 `circle` / `r=` / `stroke` / `width` / `height` 语境）。
3. 展开 `var()` + 简单 `calc()`：直接复用 `check-prompts.mjs:92-126` 的 `parseRootVars` / `resolveVars` / `evalCalc`，不要写第三份。S07 的 `--lead:28px`、S17 的 `--row:24px` 都靠这一步过。
4. 派生声明：`corrections.json` 里每案可写 `derived: [{token:"14%", expr:".14", file:"style.css", line:107}]`。**没有声明的派生不算过**——这正是现在 11 个 miss 混过去的原因。
5. 范围/比例容差：机制句常写「约 Npx 一档」或「N 至 Mpx」。允许 `range:[min,max]`（如 S09 的 `5% 至 10%` 匹配 CSS 里任一 5–10 之间的百分比），允许比例 `ratio: 5/7` 匹配 `grid-template-columns:5fr 1px 7fr`。**范围只在 `corrections.json` 显式声明时生效**，否则闸门会被「任意范围」放空。

#### L2 · 结构化断言（抓 token 抓不到的「栏数/焦距」）

对每案从 CSS 抽一张「结构事实表」，再与提示词里的结构化字段比对。**这是唯一能自动抓住 S07 的层**：

```
facts = {
  gridTracks: [ {selector:".pages", value:"5fr 1px 7fr", tracks:3, breakpoint:"all"},
                {selector:".chrono", value:"var(--axis-w) minmax(0,1fr)", tracks:2} ],
  columnCounts: [ {selector:".page-recto .toc", n:2, bp:">=1280"},
                  {selector:".page-verso .toc", n:3, bp:">=1280"},
                  {selector:".toc", n:1, bp:"<=899"} ],
  keyWidths: {axis:"264px", gutter:"18px", lead:"28px"},
  media: ["max-width:1279px","max-width:899px","prefers-reduced-motion"]
}
```

规则：

- 提示词里出现 `N 栏` / `N 列` ⇒ 必须能在 `columnCounts[].n` 或 `gridTracks[].tracks` 找到 N，**且语义角色一致**（`grid-template-columns` 里的 `5fr 1px 7fr` 只能在提示词写成「宽度比 5:7」，写成「5 栏/7 栏」直接 FAIL）。
- 提示词里出现「没有 CSS 对应的机制名词」（焦距、磁通、相位取样……）⇒ 查一张 `MECH_VOCAB` 白名单：该词必须在 `style.css` / `index.html` / `app.js` 里以标识符或注释形式出现 ≥1 次。**S03「焦距」全案 0 命中 ⇒ FAIL。** 白名单不是「禁词表」，是「这个案子有没有实现过这件事」的证据检查。
- 断点值（768/899/1024/1279/1440）若在提示词里出现，必须在 `facts.media` 里；反过来 `facts.media` 里 ≥2 个断点而提示词 0 个断点 ⇒ WARN（提醒写降级，不强制）。
- 可选 CDP 补强：只在 `--deep` 模式对 3 个 A 案用现有 `inspect.mjs` 的浏览器读 `getComputedStyle(el).columnCount` / `getBoundingClientRect().width`，核对 L2 的静态解析。**不进默认闸门**（本仓 Chrome 冷启动 14.1s、单次渲染 63s，`00-SYNTHESIS.md` §D-4 已记它还会删截图）。

#### L3 · 角色化数字白名单（防「改一个数、别处全绿」）

`check-prompts.mjs` 现在对 hex/线宽/字号做的是「提示词里出现的每个值都能在 CSS 找到」。L3 反过来补一个方向：**机制句里每个数字必须由 `corrections.json` 标角色**。

```json
{
  "S07": {
    "mechanism": "…正面 column-count:2、背面 column-count:3…",
    "numbers": [
      { "text": "5:7",    "role": "page-width-ratio", "source": "style.css:74",    "assert": "grid-template-columns 含 5fr 与 7fr" },
      { "text": "2",      "role": "recto-columns",    "source": "style.css:81",    "assert": "column-count:2" },
      { "text": "3",      "role": "verso-columns",    "source": "style.css:82",    "assert": "column-count:3" },
      { "text": "18px",   "role": "gutter",           "source": "style.css:12",    "assert": "--gutter:18px" },
      { "text": "28px",   "role": "line-height",      "source": "style.css:14",    "assert": "--lead:28px" },
      { "text": "8%–14%", "role": "ghost-opacity",    "source": "app.js:51-58",    "assert": "0.08 与 0.14 均在 JS 出现" }
    ]
  }
}
```

角色的意义：让闸门能回答「这个数字是**栏数**还是**页宽比**」，而不是只回答「这个字符串在不在文件里」。S07 的整场事故就是角色混淆。

### 3.3 合法派生怎么处理（「28px 一档」这类）

业主点名的「28px 一档」是个好例子：它比例正确、措辞误导，和其他两种必须 FAIL 的情况不一样。三类情况：

1. **真的由公式派生，且公式能复算**：S03 的「28px 一档」（实测 8 条带全部满足 `h = round(秒数 × 28/30)`，见 §2.1 第 3 条）、S07 的 `.14`（14%，`style.css:107`）、S11 的 `--ghost-3-a:0.12` → 12%、S20 的 `sp = 8 * s`（`index.html:254,257`：`SP=[0.6,1.2,2.4]`、`sp = 8 * s` → 4.8/9.6/19.2px 走线间距）。→ 在 `corrections.json` 写 `derived` 并附 `expr` 与 `source`；闸门用 `evalCalc` / 简单乘除复算，能算出就算 PASS（S03 这条应为 **WARN**：公式成立但"档位"措辞会误导，建议改写。**这能消掉 S07 的 `14%`、S09 的 `3.5px`、S03 的 `28px`。**）
2. **规格写了、实现没做**：S17 的 `96px`（规格 `_specs/S17.md:26,29` 写 96，实现改成 88px 且只在 1024–1439 档）、S03 的「9 栏」、S07 的 5/7 栏、S03 的「焦距」。→ **不算派生，算错**。判据很简单：规格里的值在 `style.css` / `index.html` / `app.js` 里找不到任何同量纲的对应物，且没有 `derived` 表达式。一律 FAIL，逼人改机制句（或改实现，但本轮不改原型）。
3. **作者口径的合法近似 / 四舍五入**：S13 的「3% / 14%」在 `style.css:17-18` 有完整算式（3.1% / 14.1%），机制句四舍五入；S09 的 `5% 至 10%` 是区间，实测 6.0%/7.7%（`style.css:310`）。→ 记 `derived`+`expr` 或 `range:[5,10]`，精度容差 ±0.2；**只有找不到算式/区间时才 WARN**。理由：这类数字是设计意图的可测表达，源码算得出来就该 PASS，否则每个四舍五入都会变成噪声。

一句话规则：**派生 = 能从源码（含注释里的算式）算出同一个数，允许声明区间与 ±0.2 精度；否则要么改句子，要么在 corrections 里显式承认它是设计意图。** 这会直接消掉 11 个 miss 里的 8 个，留下 S03/S07/S17 三个真 FAIL。

### 3.4 伪代码（可直接落成 `prototypes/_build/check-mechanism.mjs`）

```js
// 用法：node prototypes/_build/check-mechanism.mjs [--json] [--deep]
// 退出码 0 = 无 FAIL；1 = 有 FAIL。WARN 不阻断（与 check-prompts.mjs 一致）
import { readFileSync, existsSync } from "node:fs";

const P = "prototypes";
const PROM = loadStylePrompts(P + "/_selection/prompts.js");   // new Function("window", src)
const buildPrompt = loadBuildPrompt();                          // 复用 check-prompts.mjs:48-66 的沙箱
const CORR = JSON.parse(readFileSync(P + "/_prompts/corrections.json", "utf8"));
const findings = [];
const add = (level, id, rule, msg) => findings.push({ level, id, rule, msg });

for (const s of PROM.schemes) {
  const id = s.id, dir = P + "/" + s.dir;
  const cssRaw = readFileSync(dir + "/style.css", "utf8");
  const html   = readFileSync(dir + "/index.html", "utf8");
  const appjs  = existsSync(dir + "/app.js") ? readFileSync(dir + "/app.js", "utf8") : "";
  const css = stripComments(cssRaw);                           // 复用 check-prompts.mjs:84
  const src = { css, cssRaw, html, appjs,
                vars: parseRootVars(cssRaw),                    // :92
                lineWidths: cssLineWidths(cssRaw) };            // :159

  // (1) 双断言：DNA 与最终剪贴板文本都要过，防止 buildPrompt 把字段悄悄丢掉
  const mechanism = s.dna.mechanism || "";
  const finalText = buildPrompt(id, {});
  if (!finalText.includes(mechanism)) add("FAIL", id, "mechanism-not-rendered", "机制句没进剪贴板");
  const claims = [
    ...tokens(mechanism).map(t => ({ ...t, where: "mechanism" })),
    ...tokens(specSectionOf(finalText)).map(t => ({ ...t, where: "spec" })),
  ];

  const corr = CORR[id] || {};
  const facts = extractStructureFacts(css, html);               // L2：gridTracks/columnCounts/keyWidths/media

  for (const t of dedupe(claims)) {
    // (2) 显式派生优先：有 expr 就复算，不再走字面匹配
    const d = (corr.derived || []).find(x => x.token === t.text);
    if (d && verifyDerived(d, src)) continue;

    // (3) L1 字面：归一化 + var()/calc() 展开 + 无单位 SVG 数值 + 范围
    if (literalMatch(t, src, corr.ranges)) continue;

    // (4) L2 结构：栏数/列数/页宽比/断点，按角色比，不按字符串比
    if ((t.unit === "栏" || t.unit === "列" || t.role === "ratio") && structureMatch(t, facts)) continue;
    if (t.unit === "栏" || t.unit === "列") {
      add("FAIL", id, "column-claim",
          t.text + " 与 CSS 结构不符：实际 " + JSON.stringify(facts.columnCounts) +
          " / " + JSON.stringify(facts.gridTracks));
      continue;
    }

    // (5) 规格意图：作者显式署名才放行，且降为 WARN
    const intent = (corr.intents || []).find(x => x.token === t.text);
    if (intent && intent.source) {
      add("WARN", id, "design-intent-only", t.text + " 只存在于 " + intent.source + "，不是可执行声明");
      continue;
    }
    add("FAIL", id, "unbacked-number",
        t.where + " 里的 " + t.text + " 在该案 CSS/HTML/JS 里无对应声明（也无 derived/intent 记录）");
  }

  // (6) 语义名词：漂亮术语但源码零实现（S03「焦距」）
  for (const term of MECH_VOCAB) {
    if (mechanism.includes(term) && !new RegExp(term).test(cssRaw + html + appjs))
      add("FAIL", id, "unimplemented-term", "机制句提到「" + term + "」，该案源码 0 命中");
  }

  // (7) needsJS 分档与 JS 指令互锁（§1.4）
  const tier = s.needsJS || "C";                                // A/B/C
  const api = detectJsApi(html + appjs);                        // createElementNS/getBCR/rAF/pointermove…
  const actualTier = classify(api, corr);                       // A=几何生成；B=scroll/press 驱动；C=仅状态
  if (tier !== actualTier) add("FAIL", id, "needsjs-drift", "标 " + tier + "，源码判 " + actualTier);
  if (tier !== "C" && !/<script|内联脚本|脚本/.test(finalText))
    add("FAIL", id, "js-not-in-prompt", "needsJS≠C 但剪贴板文本一个 script/脚本 字样都没有");
  if (tier === "A" && !/退化|降级|脚本失效/.test(finalText))
    add("WARN", id, "no-js-fallback", "A 案没写脚本失效时的静态降级");
  if (tier === "C" && /必须用内联\s*<script>/.test(finalText))
    add("WARN", id, "needless-js", "C 案提示词却要求用脚本实现核心动作");
}

report(findings);                                               // FAIL/WARN/INFO 与 check-prompts 同形
process.exit(findings.some(f => f.level === "FAIL") ? 1 : 0);
```

**为什么必须「双断言」**：`prompt-copy.js:308-316` 里 `mech` 有 `if/else` 两个分支，`h1Size` 曾因 `else` 永不执行而 0/30 进不了提示词（`prompt-copy.js:496-503` 的注释记着这个接线 bug）。只查 `prompts.js` 的 DNA 会重复同一个错误：**数据在，但没到用户手里**。

### 3.5 现在会 flag 几案（分档给出，不虚报一个数）

| 口径 | FAIL 案数 | 案号 | 说明 |
|---|---:|---|---|
| 纯字面 L1，把 `N 栏` 也当字面串查 CSS | **7**（14 案里） | S01 S03 S07 S19 S21 S25 S26 | **[复算]** 30 案里 **14 案**的机制句含「N 栏/N 列」，其中 **7 案**在剥注释后的 CSS/HTML 里找不到「N 栏」这个字面串（CSS 写的是 `4fr` / `repeat(4,1fr)` / `.rules i:nth-child(12)`，从不写「4 栏」）。这 7 案里**只有 S03、S07 是真错**；S01（`5fr … 4fr … 4fr … 3fr`）、S19/S21（`repeat(12,1fr)` / `repeat(10,1fr)`）、S25（`3fr 7fr`）、S26（12 条 `.rules i` 装饰线 + `5fr 3fr 4fr` 色版）都是「数值对、表达形式不同」或「设计意图的栅格层」→ **必须路由到 L2 + `intent` 声明，否则 5 个误报会把真错稀释掉** |
| 现有 `_mech.mjs` 的宽松正则（162 token / 11 miss） | **6** | S03 S07 S09 S10 S13 S17 | 反向失效：它给 `栏` 配了 5 条宽松候选（`grid-template[^;]*N` 等），于是 S07 的「5/7 栏」被误判为存在。**同一脚本既误报 8 个、又漏掉最严重的一案** |
| 本文 L1（字面 + 归一化 + var/calc + 派生声明）+ L2（栏数/页宽比按角色比） | **3** | S03 S07 S17 | 推荐上线口径。S09/S10/S13 转 WARN/PASS；S07 由 L2 抓；另加 S03「焦距」一条独立 FAIL（不增案数），WARN 预计 4–6 条 |
| 加上全提示词正文（§2 的 `SPEC` 段上线后） | **≥3，需逐案清 derived** | — | **[复算]** 本轮对 30 份全文抽到 467 个带单位 token，用最朴素的子串口径有 104 个「distinct miss、30/30 案都中」——绝大多数是**派生量**（`4.3 倍` = 68/16、`78px` = clamp 在 1440 的落值、`45°` 由 `clip-path` 百分比反算、`6 档`）。**所以全正文对账必须先上 `derived` 表，不能先上 FAIL** |

**[设计] 落地顺序**：① 先写 `corrections.json` 修 S03/S07/S17 三句（§2.1 已给逐字替换文本）；② 上线 L1+L2 的 `mechanism` 断言，此时 30/30 应全绿（三句已修）；③ 做一次**变异测试**：把 S07 的 `column-count:2` 改回「5 栏」、把 S17 的 `88px` 改回 `96px`、把 S03 的「焦距」加回去，闸门必须各报一条 FAIL——否则这又是一个「恒真式闸门」（`00-SYNTHESIS.md` §D-5 记录本仓踩过三次）；④ 再扩到 `SPEC` 段与全正文。

---

## 4. 修六层传播：修正要放在哪里才不会被重生成抹掉

### 4.1 这条链到底有几层、每层由谁重写（实测）

**[源码]** 业主说的"六层"完全成立，而且每层都有一个生成器会把上游原样搬下来：

| 层 | 文件 | 谁产生它 | 改这里会怎样 |
|---|---|---|---|
| L0 | `deliverables/04-schemes-01-10.md`、`05-schemes-11-20.md`、`06-schemes-21-30.md` | 历史交付文档（人工/Agent 写） | 改它不会自动生效；`extract-specs.mjs` 重跑才会 |
| L1 | `prototypes/_specs/S01..S30.md` | `prototypes/_build/extract-specs.mjs`（机械切分，`extract-specs.mjs:3`「只做机械切分，不做任何判断、不改一个字」） | **改它会在下一次 `extract-specs.mjs` 被覆盖**；且 `check-stale.mjs:168-177` 已经把 `_specs/S01.md` 的输入登记为 `04/05/06` 三份 md，改 `_specs` 不更新 md 会被判陈旧 |
| L2 | `prototypes/_prompts/dna-raw.json` | `extract-dna.mjs`；机制句从 `_specs/Sxx.md` 的 `1-附（去掉名字之后的机制）：` 正则抓（`extract-dna.mjs:115`） | 下次 `extract-dna.mjs` 覆盖 |
| L3 | `prototypes/_prompts/dna-clean.json` | `clean-dna.mjs` | 下次覆盖 |
| L4 | `prototypes/_selection/prompts.js` | `build-prompts.mjs` | 下次覆盖 |
| L5 | 用户剪贴板 | `prompt-copy.js` 的 `buildPrompt()`（运行时拼装） | 改模板会立刻生效，但**这是 30 案共用的一份**，改一句会影响 30 条 |

**关键事实（本轮新确认，决定方案形状）**：`build-prompts.mjs:104-112` 的机制句合并是**只填空、不覆盖**：

```js
for (const d of dna) {
  if (!d.mechanism && MECHANISMS[d.id]) { d.mechanism = MECHANISMS[d.id].text; ... }
  else if (d.mechanism) { mechFromSpec++; }
}
```

所以：

- **S01–S10**（含 S03、S07）的机制句来自 `_specs/*.md`，`mechanisms.mjs` 里即使写一条也**不会生效**。改 S03/S07 只有两条路：改 `_specs`（会被 `extract-specs.mjs` 覆盖），或改 `04-schemes-01-10.md`（会污染历史交付文档，且那份文档还有大量别的事实）。
- **S11–S30**（含 S17）的机制句来自 `mechanisms.mjs`，`build-prompts.mjs` 直接读它。改 `mechanisms.mjs` 能生效，但它是"补录文件"，语义是"给缺失的案补一句"，把它变成"修订层"会让 `source:` 的语义漂移（现在的 `source` 是"这条句子里的数字出自哪"，未来会变成"这句原文出自哪、修订出自哪"）。
- **S17 的 96px 就写在 `mechanisms.mjs` 的 `source:` 里**：「`style.css:134`（3fr/16px/9fr）/ … / :181 金额右对齐（1024–1439 档 :320 压到 88px）/ :20 --stamp-shift:2mm」。它**自己记录了 88px 的存在**，但 `text` 字段仍写 96px —— 这不是"没核对"，是"核对了但没回写"。这类缺陷用"再加一层注释"是修不掉的。

### 4.2 为什么"把闸门当唯一真源"不成立

一个诱人的方案是：让 `check-mechanism.mjs` 从 CSS 自动生成机制句，彻底消灭人工文本。不可行，两个硬理由：

1. **机制句里有一半信息不在 CSS 里**。S15 的「任何没有『多版本信息』的项目套上去，三层就变成无意义的装饰」（`build-prompts.mjs` 的 `REUSE` 从 `data.js.landing` 截出）、S07 的「正反两面同时进入同一张版心」都是**意图**，CSS 只体现结果。自动生成只能产出"两列 + column-count:2/3 + 0.5px 栏线"，产不出"为什么这样读"。
2. **闸门只能判"错"，不能判"该写什么"**。它能证明 `96px` 不存在，但不能替你决定该写 `88px`（只在一个断点）还是写"等宽右对齐"（跨断点都成立）。这是设计判断。

所以正确结构是：**人工修订层（可追责）+ 机器闸门（防回退）**，两者都必须存在。

### 4.3 建议的最小结构改动：`corrections.json` 作为最后一层 apply

新增一个文件 `prototypes/_prompts/corrections.json`，**唯一职责**是"对生成物的、逐案逐字段的人工修订"，由 `build-prompts.mjs` 在**组装 `out` 之后、写盘之前**最后一步 apply：

```js
// build-prompts.mjs 末尾（写盘前）
const CORRECTIONS = existsSync(CORR_PATH)
  ? JSON.parse(readFileSync(CORR_PATH, "utf8")) : {};
let applied = 0, stale = 0;
for (const o of out) {
  const c = CORRECTIONS[o.id];
  if (!c) continue;
  // 来源哈希：修订只对"它当初看到的那版上游"有效；上游变了就必须重新裁决
  const upstreamHash = sha1(JSON.stringify({ m: o.dna.mechanism, p: o.dna.palette, f: o.dna.fonts }));
  if (c.basedOn && c.basedOn !== upstreamHash) {
    stale++;
    console.warn(`[corrections] ${o.id} 的上游已变（${c.basedOn} → ${upstreamHash}），修订未应用，请重新裁决`);
    continue;
  }
  for (const [k, v] of Object.entries(c.set || {})) {
    if (k === "mechanism") o.dna.mechanism = v.text;          // 字符串字段
    else if (k === "needsJS") o.needsJS = v;                  // 新字段
    else if (k === "spec") o.dna.spec = v;                    // §2 的七段 SPEC
    applied++;
  }
  o.dna.provenance = c.provenance || o.dna.provenance;         // 出处标注（见 4.5）
}
console.log(`[corrections] 应用 ${applied} 条，${stale} 条因上游变化跳过`);
```

文件形状（S03/S07/S17 三案的实稿，可直接落地）：

```json
{
  "S03": {
    "basedOn": "<生成时 dna.mechanism 的 sha1>",
    "provenance": { "mechanism": "corrected", "reviewedAt": "2026-11-04", "evidence": "style.css:124 grid 两列 / index.html:71-99 每条带 --h 独立 / index.html:306-308 指针 1:1" },
    "set": {
      "mechanism": {
        "text": "整页暗底上，左侧一条 264px 宽、position:sticky 的纵向刻度轴（空 SVG 由脚本按 8px 步长画线、每 40px 加粗到 1.5px），右侧是一整列 8 条影像带：每条带的高度直接等于当晚曝光秒数（首条 30 s → --h:28px，其余 14–84px 各写各的值），带间 4px 间隙，右侧 220px 固定图注位；四角叠一张预生成的 cos⁴ 减光位图，中心 0、四角 32%；指针进入影像带时换成 1.2px 自绘十字并 1:1 跟随鼠标，滚动时整列影像带按 0.5 倍速度反向位移（上限 ±40px）——层级由带高与固定位置承担，不由名字承担。",
        "source": "style.css:17,120-124,143-160,188; index.html:62,71-99,221-249,259-268,306-308"
      },
      "needsJS": "A",
      "spec": {
        "grid": "左 264px sticky 刻度轴 + 右一整列影像带（grid-template-columns: 264px minmax(0,1fr)）；读表与影像带上下叠放；<768px 单栏",
        "rhythm": "基线 8px、带间 4px、读数行 9px/12px 内距",
        "images": "8 条影像带各一张真实胶片扫描件，宽度撑满列宽，高度由 --h 决定；四角减光是预生成位图叠加，不是 CSS 渐变"
      }
    }
  },
  "S07": {
    "basedOn": "<sha1>",
    "provenance": { "mechanism": "corrected", "reviewedAt": "2026-11-04", "evidence": "style.css:74 两页宽度比 / :81-82 column-count 2 与 3 / app.js:15-46 逐行镜像" },
    "set": {
      "mechanism": { "text": "…（见 §2.1 正确句子）…", "source": "style.css:12,13,14,70,74,80-82,105-107; app.js:10,15-46,51-58,120-122" },
      "needsJS": "A",
      "spec": { "grid": "grid-template-columns: 5fr 1px 7fr（两页宽度比 5:7）；正面 column-count:2、背面 column-count:3；≤1279px 单页 3 栏、≤899px 单栏", "rhythm": "栏沟 18px、基线 7px、正文行高 28px、页码竖排" }
    }
  },
  "S17": {
    "basedOn": "<sha1>",
    "provenance": { "mechanism": "corrected", "reviewedAt": "2026-11-04", "evidence": "style.css:134 三轨 / :146-151 齿孔 / :181 右对齐 / :320 仅 1024–1439 档 88px" },
    "set": {
      "mechanism": { "text": "…（见 §2.1 正确句子：删 96px，写断点行为）…", "source": "style.css:18,20,134,146-151,163,181,320,340" },
      "needsJS": "C"
    }
  }
}
```

**为什么这能活过重生成**（逐层验证）：

1. `build-prompts.mjs` 是 `prompts.js` 的唯一写入者，apply 放在它内部 ⇒ 每次重生成都会重新应用，**不会被覆盖**。
2. `corrections.json` 不被任何其他脚本写入 ⇒ 没有任何生成器能吃掉它。
3. `basedOn` 哈希把"修订"钉在它当初看到的上游版本上。如果哪天上游机制句改了（比如真去改了 `_specs`），修订会自动**拒绝应用并打印一行**，而不是静默地让旧文本覆盖新事实 —— 这是本仓最需要的那个性质（`00-SYNTHESIS.md` §D-5 的"自洽的假绿"反面）。
4. 需要同步改一处：`check-stale.mjs:196-199` 的 `prompts.js` 链输入目前只有 `dna-clean.json` 与 `build-prompts.mjs`，**必须加上 `corrections.json`**，否则改了修订层不会触发"prompts.js 陈旧"。

**为什么不选"直接改 `_specs`"**：`extract-specs.mjs` 的契约是"只机械切分、不改一字"，改 `_specs` 等于手工污染一个生成物；且 `check-stale.mjs:168-177` 会把 `_specs` 与 `04/05/06` 比 mtime，改完立刻红。若选择改 L0 的 `04/05/06`，则要连带处理那三份文档里所有引用同一数字的地方（`data.js` 的 `def`/`layout`/`landing` 也从那里来），一次改 5 处以上，且历史交付文档被改写。**成本比 `corrections.json` 高一个数量级，且没有"上游变了就拒绝"的保护。**

**为什么不选"只改 `mechanisms.mjs`"**：它只对 S11–S30 生效（`build-prompts.mjs:104-112` 只填空）。S03、S07 改它**零效果**，而这两案恰好是业主点名的最硬两案。并且 `mechanisms.mjs` 每条带 `source:`，那个字段的语义是"数值出处"，混入"修订记录"会让下一个人分不清哪句是原文、哪句是改过的。

### 4.4 顺手要修的一个链路缺陷：`prompts.js` 的双源

**[源码]** 机制句其实有**两条并行来源**，且没有一致性检查：

- `prompts.js` 的 `dna.mechanism`：S01–S10 来自 `_specs`（经 `extract-dna.mjs:115`），S11–S30 来自 `mechanisms.mjs`（经 `build-prompts.mjs`）。
- `data.js` 的 12 字段里**没有机制句**（`collect-schemes.mjs:175-190` 的长注释明确说明"不在这里也读一遍"，理由是会造成两个来源且其中一个残缺 20 案）。

这条决定是对的，但**代价是 `mechanisms.mjs` 的 `source:` 与 `_specs` 的施工前文本永远没有机器对账**。S17 的 `96px` 就是这个缺口的产物：`mechanisms.mjs` 的 `text` 抄自规格，`source` 却已经写明了 88px。建议在 `check-mechanism.mjs` 里加一条规则：**`mechanisms.mjs` 每条 `text` 的 token 必须能被该条自己的 `source:` 字符串解释**（`source` 里点到的行号，去读那几行，看 token 是否在那几行里）。这条规则零成本，且能抓出所有"source 已纠正、text 没跟上"的条目 —— S17 会立刻红。

### 4.5 出处要不要进提示词（Provenance）

`deliverables/74-plan/OFFERING.md:63` 指出「`dna` 键并集无 `source`，用户看不到出处」。我的建议：**不要把行号塞进提示词正文**（对店主无用、对 AI 是噪声、且会让 30 条提示词各带一段内部路径），但在 `prompts.js` 的每案加一个 `dna.provenance` 对象供 UI 与闸门使用：

```json
"provenance": {
  "palette": "style.css:9-13（实测抽取，check-prompts 已断言）",
  "fonts":   "style.css:15-17 + h1 规则（实测抽取）",
  "mechanism": "corrected",           // 或 "spec"（未校正，来自施工前规格）
  "reviewedAt": "2026-11-04"
}
```

UI 上只用它做一件事：详情页给机制句加一个极小的标记 —— `corrected` 显示「已按 CSS 复核」，`spec` 显示「来自设计规格，未逐值复核」。**这是把"实测抽取"这个过度宣称（`OFFERING.md:322` 已正确指出）收窄到字段级的最低成本做法**，也是让 README:80 那句话可以诚实地改写的前提。

---

## 5. 长度与样板：38% 共用该不该砍

### 5.1 先确认这个数（复算）

**[复算]** 本轮用 `vm` 载入 `data.js` + `prompts.js` + `prompt-copy.js`，对 30 案跑 `buildStylePrompt(id,{})`：

```
30 条提示词合计 58,431 字；出现在 ≥27 条里的整行合计 22,490 字 = 38.5%
单案 S07 = 1,844 字；shared 751 / own 1,055（41.6%）
numeric tokens（全正文）467 个
```

与 `redteam.md:112,865-868` 的 37.7% / 平均 1,986 字方向一致、数值不同：那边是「22 行、748 字 / 单案平均」的口径，本文是「22,490 字 / 30 案合计」的口径，两者不能直接相除比较。**要引用就引自己复算的那个分母**（30 案合计 38.5%），别把两个分母混在一句话里——本仓已有一次「混用三个分母」的教训（`README` 计量学说明）。

### 5.2 哪些样板该留、哪些该砍（逐段裁定，字数按 30 案均值实测）

**[复算]** 把每条提示词按段落切（行首标记：`请把整页` → plain+tone，`这个风格的签名动作` → 机制，`视觉硬约束` → 硬约束，`结构约束` → 结构，`防退化` → 防退化，`这一案最容易` → risk，`验收三问` → 验收，`输出要求` → 输出），30 案逐段计字符，取均值：

| 段 | 30 案均值（min–max） | 是否 30 案共用 | 裁定 | 理由 |
|---|---:|---|---|---|
| 首部三行（施工图框定 / 两个 ＿ 槽） | **56**（56–56，逐字相同） | 是 | **留** | `prompt-copy.js:28-116` 的长注释记录了它替代「我经营一家小店」的假前提，是**诚实性装置**，不是套话 |
| 「请把整页做成这个风格：{plain}」+ 调性句 | **74**（71–79） | 半（plain/tone 逐案） | **留** | 唯一告诉 AI「这是什么气质」的两句 |
| 机制句（含前缀 10 字） | **98**（84–128）；DNA 原文均值 88.1 | 否（逐案） | **改**（§2.1） | 唯一结构描述，3 案硬错 |
| 视觉硬约束 1–6（色/字/圆角/阴影/线宽/字号） | **506**（452–589） | 半（值逐案、句式共用） | **留** | `check-prompts.mjs` 已对色值/线宽/字号做断言；这是「实测抽取」最站得住的一层 |
| 结构约束 1–6（数量/图片/首屏/硬前提） | **364**（241–492） | 半 | **留，但改写 1、3** | 数量语义（`prompt-copy.js:532-623`）已被修过两轮，现在可执行；但可压缩 |
| **防退化 ①–⑧** | **342**（334–357） | **是，逐字相同** | **留** | 见 §5.3 |
| 这一案最容易做成的错误样子（risk） | **167**（117–241） | 否 | **留** | 唯一逐案的「会怎么退化成通用模板」处方（`prompt-copy.js:775-810`） |
| **验收三问** | **150**（146–153） | **是，逐字相同** | **砍** | 见 §5.4 |
| 输出要求（单文件 / 不引框架 / 图片路径 / 移动端） | **192**（192–192，逐字相同） | 是 | **留** | 输出契约，删了 AI 会拆文件、引 Tailwind |
| **合计** | **1,948** | 38.5% shared | | |

### 5.3 防退化 8 条：留着，但别把它当「信息」

这 342 字是 30 案逐字相同的，看起来最像「该砍的样板」。**但它不是套话，是护栏**：它把 8 类模型默认解（紫蓝渐变、圆角浮起卡、三条等宽 feature、emoji 图标、玻璃拟态、暗底发光、自动轮播）改写成 8 条**正面唯一解**（`prompt-copy.js:701-773` 的长注释给出 arXiv 2601.08070 的依据：87.5% 的违规发生在点名被禁词时）。删掉它，30 案会同时退回「AI 默认审美」，而这一层恰好是**所有 30 案的共同敌人**，所以共用是**正确的共用**。

真正的问题不是「它占了 38%」，而是**它占的是注意力预算，结构信息只分到 98 字**。处理方式是**换预算，不是删护栏**：从验收三问里腾出约 55 字、从结构约束里压缩约 60 字，给 `SPEC` 段腾约 400 字。净增约 +285 字（+14.6%），shared 比例会从 38.5% 降到约 33%（因为新增的 400 字是逐案的）。

> 顺带一个可验证的细节：`防退化` 段在 30 案里 min 334 / max 357，差值 23 字全部来自第 ② 条（`prompt-copy.js:754-755` 的「直角边界 / 圆角边界」二选一）。也就是说，这 342 字里约 93% 是真正逐字相同的。

### 5.4 验收三问：砍掉，换成可判定的自检

现文（`prompt-copy.js:811-818`）：

```
验收三问（做完自己检查）：
1. 拿远半米看：整页读起来是不是「{plain}」这一种气质？气质对了才算过。
2. 随便挑一条内容：首屏、卡片、页脚上的编号是不是同一串？有一处对不上就重做。
3. 扫一眼：上面 8 条正面要求与第 3–5 条硬约束，是不是每一条都看得见？有一条看不见就重做。
```

- 第 1 问要求模型自评「气质」，**不可判定**，模型永远回答「是的」。它的唯一效果是占掉 40 字并让模型进入「自评模式」。
- 第 2 问是唯一可执行的（编号一致性），**留**，压成一句并进结构约束。
- 第 3 问让模型回去数「8 条 + 第 3–5 条」，而它自己刚写完，无法审计自己。另外「第 3–5 条」是**不完整引用**：视觉硬约束现在是 1 配色 / 2 字体 / 3 圆角 / 4 阴影 / 5 线宽 / 6 字号 共 6 条，而「第 3–5 条」漏掉了第 6 条（字号）——这恰好是 `prompt-copy.js:496-530` 花了 30 行注释才接上的那条最关键约束，却在自检里不被点名。（这里要澄清一个我最初的误读：`prompt-copy.js:828-831` 那段「引用一直是错的（差一位）」讲的是**输出要求里的「结构约束第 4 条」**，不是本句，两处不要混。）

**替换为一问可判定的自检 + 一条硬前提复述**：

```
交稿前自检（只查这两件，能对着屏幕数出来）：
1. 首屏、第一条、页脚三处的编号是不是同一串字符？不是就重做。
2. 上面「本案施工规格」七行，逐行在页面上指给我看：每行至少有一处能指出来。
```

第二问把「8 条看不看得见」换成「七行规格逐行落地」，与新增的 `SPEC` 段同构，**可数、可指、无自评**。总字数从 **150** 降到约 95（**[复算]** 现文 30 案 146–153 字）。

### 5.5 一句话回答业主

**38% 共用不砍（护栏必须共用），砍的是「不可判定的自评」和「漏掉第 6 条的不完整自检」；省下的预算不给更多禁令，给七行逐案规格。** 改完后：单案约 **2,235** 字（1,948 − 55 − 60 + 400 ≈ +14.7%），shared 约 33%，而「每案独有且可复核的结构信息」从 98 字升到约 498 字（+5.1 倍）。**[复算]** 400 字是按七行各 ≤60 字的上限估的；`SPEC` 的栅格/节奏/构造三行通常会有 45–60 字，字阶/内容量两行沿用现有约束不额外计数，实际净增更可能在 +250…+320 之间。

---

## 6. 质量门槛：什么叫「这份提示词可以发布」

### 6.1 定义（可测，不用审美判断）

一条提示词 `P(id)` 达到「可发布」当且仅当以下 **7 条全部为真**。每一条都写明判据、工具、失败时看什么：

| # | 条件 | 判据（可机械判定） | 工具 | 阈值 |
|---|---|---|---|---|
| **Q1 无假数** | 提示词里每个带单位数字、每个「N 栏/N 列」、每个机制名词都能在该案源码找到证据或显式 `derived`/`intent` 声明 | `check-mechanism.mjs` L1+L2 报 **FAIL 0**；`MECH_VOCAB` 术语 0 个未实现 | `check-mechanism.mjs` | 30/30 PASS |
| **Q2 到达剪贴板** | `buildPrompt(id,{})` 的返回文本包含 `dna.mechanism` 全文、`SPEC` 七行、`needsJS` 分档句；关键字段不是"在数据里但没接上" | 双断言（`check-mechanism.mjs` 的 `mechanism-not-rendered` 等） | 同上 | 30/30 PASS |
| **Q3 视觉硬约束仍对** | 色值、字体链、线宽、字号、圆角、阴影仍是 CSS 实测值 | 现有 `check-prompts.mjs`（`KEY_FIELDS`/hex/linewidth）**FAIL 0** | `check-prompts.mjs` | 30/30 PASS |
| **Q4 结构类齐全** | 七类信息（栅格/节奏/字阶/构造/图像/交互/内容量）每类至少 1 条可执行句，且彼此不矛盾 | `SPEC` 段七行齐、无「N 栏」与「N:M 宽度比」混用、无两条相反指令（如"要机制动作"与"其余静止"） | 文本断言（30 行正则 + 一张互斥短语表） | 30/30 PASS |
| **Q5 脚本声明与实现一致** | `needsJS` A/B/C 与源码 API 特征一致；A/B 案提示词含可执行 JS 配方；A 案含静态降级句；C 案不要求脚本实现核心动作 | `check-mechanism.mjs` 的 `needsjs-drift` / `js-not-in-prompt` / `no-js-fallback` | 同上 | 30/30 PASS、WARN 0 |
| **Q6 变异可被抓** | 把已知三处错误各注入一次，闸门必须变红 | 3 个变异：`S07 column-count:2 → 正面 5 栏`、`S17 88px → 96px`、`S03 加回「焦距比」`；再加 1 个对照变异（改一个色值须被 `check-prompts` 抓） | `check-mechanism.mjs` + `check-prompts.mjs` | 4/4 抓到；**任一漏抓 = 闸门不合格，不许发布** |
| **Q7 端到端结构可复刻** | 把提示词喂给一次模型，产出的 HTML 用 DOM 量 6 个量，与原型同名 6 项比对 | 见 §6.3 的 6 项与容差 | `tools/` 外新增的独立探针（可放 `deliverables/74-exec/`，不进 `_build/` 默认链） | **发布门槛：6 项里 ≥5 项落容差**；3 个 A 案必跑、其余抽样 ≥6 案 |

Q1–Q6 是**每次改动都要跑的硬门槛**（秒级，纯文本，不需要浏览器）；Q7 是**发布前跑一次**的半自动门槛（需要模型调用）。**不许用 Q7 替代 Q1–Q6**：`69-test/LEAD-similarity-finding.md` 记录的 0.490 视觉相似度是一次性测得且此后没重测，那类"看起来像不像"的指标不能当回归防线。

### 6.2 为什么 Q6 单独算一条（本仓最该吸收的教训）

`00-SYNTHESIS.md` §D-5 记着三类"闸门自己坏掉"：`verify-prototype.mjs` 规则 4 真违规检出 0 / 误报 100%；`check-docs.mjs` 的版式正则只认自己写死的句式；`check-docs.mjs:407` 失败开放。**它们全都是"跑了、绿的、什么也没测"**。Q6 是唯一能证明新闸门不是恒真式的办法，成本是 3 个字符串替换 + 一次脚本运行，不到 10 分钟。

### 6.3 最便宜的半自动检查（Q7 的最小实现）

**不要做**：整页截图相似度、LLM 当审美裁判、30 案 × 3 个模型全量跑。贵、不可复现、且本仓已经证明"0.490 相似度"之后没人再测。

**做这个**（单次模型调用 + 纯 DOM 量测，无图像比对）：

```
for id in [S03, S07, S17, S01, S12, S20, S26, S28, S30]:   # 3 个 A 案 + 6 个抽样
    prompt = buildPrompt(id, {biz:"一家只做手冲的咖啡店", action:"看豆单并下单"})
    html   = oneModelCall(prompt)          # 任何一家、temperature=0、只要一份代码
    assert html.startsWith("<!DOCTYPE html>") and "<style" in html

    # 用 CDP / jsdom 载到 1440×900，量 6 个量（与原型用同一段量测脚本）
    got = measure(html)                    # 见下
    want = measure(prototypes/<dir>/index.html)
    compare(got, want)                     # 输出 6 行 PASS/FAIL，不输出分数
```

六个量只取**不会被浏览器量化抹平、且能被一句提示词决定的**：

| # | 量 | 量法 | 容差 | 对应提示词里的哪一行 |
|---|---|---|---|---|
| 1 | 主体栏数 | `getComputedStyle(mainGrid).gridTemplateColumns.split(' ').length` 与 `columnCount` | 精确相等 | `SPEC.栅格` |
| 2 | 主轴宽度 / 主要比例 | 首列 `getBoundingClientRect().width`，或 `5fr:7fr` 的实宽比 | ±8% 或比例 ±0.5 | `SPEC.栅格` |
| 3 | 最大标题 / 正文字号比 | `max(h1..h3 fontSize) / body fontSize` | ±20% | 硬约束第 6 条 |
| 4 | 线宽集合 | 全页 `border-*-width` + `stroke-width` 去重集合 | 集合相等（±0.02） | 硬约束第 5 条 |
| 5 | 主色数量与色值 | `SPEC` 指定的 hex 是否出现在生成 HTML 的 CSS 里 | 精确相等 | 硬约束第 1 条 |
| 6 | 图片位数量与可见面积 | `img` 数、每张 `clientWidth*clientHeight` 是否 > 0 | 数量 ≥ 提示词要求、面积 > 0 | 结构约束第 4 条 |

**成本**：9 次模型调用 + 一次 CDP 起停；按本仓 `inspect.mjs` 单次渲染 63s 的口径，9 案串行约 10–15 分钟，且不需要截图、不需要人看。**最便宜的一版可以只跑 3 案（S03/S07/S17）× 1 次调用 ≈ 4 分钟**，因为这三案是唯一有硬错史的案子；把它做成发布前 checklist，而不是 CI 每提交都跑。

**Q7 的判读纪律**：FAIL 时要能回答"是提示词没写清楚，还是模型没听话"。做法：先看该量在 `SPEC` 里有没有一句明确的中文指令。有指令而模型没做 → 记「模型偏差」，重跑一次（temperature=0 下仍错才记）；没有指令 → **这是提示词缺陷，必须改 `corrections.json`**，然后 Q1–Q7 重跑。这一步保证 Q7 的结果能回流到数据层，而不是变成又一份无人消费的审计报告。

### 6.4 发布清单（给业主照着勾）

```
[ ] 1. prototypes/_prompts/corrections.json       三案修订 + A/B/C 分档（§4.3）
[ ] 2. build-prompts.mjs                          末尾 apply corrections + provenance + needsJS
[ ] 3. prompt-copy.js                             SPEC 七行段 + needsJS 分支 + 删验收三问第1/3问
[ ] 4. prototypes/_build/check-mechanism.mjs       L1+L2+语义词+双断言（§3.4）
[ ] 5. prototypes/_build/check-stale.mjs:196       prompts.js 链 inputs 加 corrections.json
[ ] 6. 变异测试 Q6                                4/4 被抓（含一个 check-prompts 对照）
[ ] 7. Q7 最便宜版                                3 案 × 1 次模型调用，6 项 ≥5 项过
[ ] 8. README.md:80 / README-EN                   1814–2138 / 中位 1988 三个数按新长度重算
        （check-docs.mjs:644-699 会核这个数，漏改会让另一个闸门变红）
[ ] 9. README.md:7 「30 个能跑的风格」            若采用 §1.4 的 12/30 分档，改成
        「30 个可运行原型；其中 12 个风格的提示词含脚本配方，18 个静态即可」
[ ] 10. DELIVERY.md:199 / :315 / :424             「30/30 需要 JavaScript」改成
        「A 3 / B 9 需要脚本，C 18 静态即可」（并改 needsJS 的现算判据）
```

第 10 条是与同一轮另一份交付物的**显式冲突**，必须点名：`DELIVERY.md:199` 提议用「`index.html` 是否含 `<script>`」现算 `needsJS`，那会得出 30/30 全 true；§1.2 的逐案分类证明正确的是 12/30。`OFFERING.md:102` 提议「给 30 条提示词各加一句本案机制是否需要 JS，若需要则写明」—— 这个方向对，本文把它细化成 A/B/C 三档与 §1.3 的具体配方。

### 6.5 实施顺序（按依赖，不按重要性）

| 步 | 做什么 | 依赖 | 可验证的完成标志 |
|---|---|---|---|
| 1 | 写 `corrections.json`（先只放 S03/S07/S17 三句 + 30 案 `needsJS` 分档） | 无 | JSON 可解析；三句与 §2.1 逐字一致 |
| 2 | 改 `build-prompts.mjs` 末尾 apply + `check-stale.mjs` 加输入 | 1 | 重跑生成器后 `prompts.js` 的三句已变；再跑一次仍是改后的（**幂等**） |
| 3 | 上线 `check-mechanism.mjs`（仅 `mechanism` + `SPEC` 段，L1+L2） | 2 | 30/30 FAIL 0；变异测试 Q6 4/4 |
| 4 | 改 `prompt-copy.js` 加 `SPEC` 段 / needsJS 分支 / 删自评问句 | 2 | 30 条提示词七行齐；`check-mechanism` 双断言仍绿 |
| 5 | 扩 `check-mechanism` 到全正文（先补 `derived` 表，不先开 FAIL） | 3、4 | 467 个 token 里不再有未声明的 miss |
| 6 | Q7 半自动复刻（3 案→扩展到 9 案） | 4 | 6 项 ≥5 项；失败回流到 `corrections.json` |
| 7 | 文档数字与 README 宣称同步（§6.4 的 8/9/10） | 6 | `check-docs.mjs` 13 PASS 不退化 |

**先修数据再改模板，先上闸门再扩范围**：本仓的历史缺陷恰好都是反着来的（先写更漂亮的文案，再补一条只认那句文案的检查）。

---

## 7. 给业主的一页纸（把六个问题的答案压在一起）

1. **JS**：不公平的二选一。30/30「有脚本」≠ 30/30「机制需要脚本」。逐案实测：纯 CSS 真做不到 = **3/30（S03/S07/S20）**；要复刻原型行为需脚本 = **12/30**；**18/30 的签名机制 CSS 就成立**。选 (c) 的分档版：只对 12 案在机制句里写各自的算法配方，3 个 A 案另写静态降级；不要给 30 案加同一句"先量几何"（会诱导 18 个案子写不必要的脆弱代码，且在 v0 里被剥掉后静默失效）；也不要把"只做静态壳"当总策略（那等于自弃"能跑的风格"这个卖点）。
2. **最小可用提示词**：不是「再补 520 个数字」，是把唯一那句 88–98 字的结构描述拆成七行 `SPEC`（栅格 / 节奏 / 字阶 / 构造 / 图像 / 交互 / 内容量），每行 ≤3 个决定形状的值。三案正确句子已逐字给出：S03 是「264px sticky 轴 + 一整列按 `秒数×28/30` 定高的影像带 + 1:1 指针十字」，S07 是「`5fr 1px 7fr` 页宽比 + `column-count:2/3` + 逐行量几何的 SVG 镜像」，S17 是「`3fr 16px 9fr` + 1.2px/6px 齿孔 + 金额列右对齐且断点行为写明（1024–1439 档 88px）」。
3. **闸门**：三层（字面 token 归一化 + var/calc 展开 → `columnCounts`/`gridTracks` 结构化断言 → 角色化数字白名单），双断言 DNA 与剪贴板全文。朴素口径 6 案 / 11 token miss（6.8%）；合理派生后 **3 案硬 FAIL（S03/S07/S17）**，另加 S03「焦距」一条语义 FAIL。computed style 不做主判据（Chrome 线宽量化会 100% 误报）。
4. **六层传播**：新增 `prototypes/_prompts/corrections.json`，由 `build-prompts.mjs` 写盘前最后一步 apply，每条带 `basedOn` 上游哈希，上游变了就拒绝应用并告警；`check-stale.mjs` 的输入链加这个文件。不改 `_specs`（会被 `extract-specs.mjs` 覆盖）、不把闸门当唯一真源（机制句一半是意图，CSS 里没有）。
5. **38% 样板**：**留** 8 条正面防退化与输出契约（它们防的是 30 案共同的模型默认解，共用是正确共用）；**砍** 验收三问里两条不可判定的自评与漏掉第 6 条的不完整自检；省下预算换七行逐案 `SPEC`。改后单案约 2,235 字（+14.7%），独有可复核结构信息从 98 字升到约 498 字。
6. **发布门槛**：Q1–Q6 是纯文本硬闸（秒级，含"注入三个已知错误必须被抓"的变异测试）；Q7 是最便宜的半自动复刻 —— 3 案 × 1 次模型调用，用 DOM 量栏数/主轴宽/标题正文比/线宽集合/色值/图片位 6 项，≥5 项落容差才算可发布。**不比审美，只比可判定量。**

> 一句话：这个提示词系统的问题不是"说得太少"，是**唯一那句结构描述既没证据、又没闸门、还被六层原样复制**。修法不是写更长的提示词，是让每一句结构描述都有出处、能被闸门证伪、且改一次能穿过所有重生成活下来。

---

### 附：本轮新增的实测数字（便于复算）

| 数 | 值 | 复算方法 |
|---|---:|---|
| 30 条提示词总字数 | 58,431 | `vm` 载入 `data.js`+`prompts.js`+`prompt-copy.js`，`buildStylePrompt(id,{})` × 30 |
| 共用整行占比（≥27/30 条） | 38.5%（22,490 字） | 同上，按整行 frequency ≥27 计 |
| S07 单案 | 1,844 字；shared 751 / own 1,055（41.6%） | 同上 |
| 全正文带单位 token | 467 | 正则 `(\d+(?:\.\d+)?)\s*(px\|%\|fr\|deg\|°\|em\|vh\|ch\|mm\|ms\|s\|栏\|列\|行\|枚\|档\|级\|秒\|倍)` |
| 机制句 token | 162 / 11 miss / 6 案 | `node deliverables/74-recon/_mech.mjs` |
| JS 分档 | A 3 / B 9 / C 18 | 逐案读 `<script>` 体 + `app.js` + `style.css`，对齐 30 条 `dna.mechanism` |
| `<script>` 标签 | **43 个：42 内联 + 1 外链（S07）**；17 案 1 个标签、13 案 2 个（后者第一块均为 1 行 `classList.add('js')` 探针） | 逐案 `matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)` + 计块内行数 |
