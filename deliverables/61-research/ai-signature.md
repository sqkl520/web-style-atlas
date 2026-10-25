# 检索报告：AI 生成网页的视觉签名与可校验反制清单

> 作者：research agent（61-research）｜检索日：2026-10-26（Asia/Shanghai）
> 目标：为「网站设计风格图集」的 8 条防退化清单提供**可机械校验**的外部依据，并核实 `#6366F1` 说法的真伪。
> 上游冲突记录：`README.md:99` 记载 `templates/M01` 的中英文档对 `box-shadow` 给出相反结论；`deliverables/34-critique-doc-accuracy.md:97` 给出实测计数（M01 三处命中 = 2 处实体阴影 + 1 处 `box-shadow:none` 复位，见 `deliverables/38-critique-doc-intent-defense.md:75`）。本报告不重开此案，只在 §7 说明它与 8 条清单的同构问题。

---

## 0. 证据分级（全文通用）

| 标记 | 含义 | 本报告的判定标准 |
|---|---|---|
| **【实】** | 有原始出处、可复现 | 论文摘要原文 / 官方仓库代码 / 官方文档页面 / 本人发文 |
| **【测】** | 本次亲自跑数得到 | 命令与输出写进正文，读者可重跑 |
| **【圈】** | 圈内共识 / 二手转述 / 相互引用但无一手数据 | 明确标注「无一手数据」，不得当作事实使用 |
| **【缺】** | 找不到 | 直接写找不到，不给替代品 |

一条纪律：**「有出处」不等于「有实证」。** 下面很多说法有一手出处（某人某天写了某篇博文），但那个人自己也没有数据。这类记为 **【圈】**，不升格。

---

## 1. 问题一：AI 生成网页的视觉签名，有没有人系统总结过

**结论：有，而且 2026 年已经形成了「规则集 + 可复现脚本 + 带标注数据集」的完整链条。但所有系统性总结都集中在 2026 年，2024–2025 年基本只有零散吐槽。**

### 1.1 三条独立路线（互相不知道对方）

| 路线 | 代表 | 方法 | 为什么可信 |
|---|---|---|---|
| 大规模语料测量 | Krebs 的 Design Slop Cop | Playwright 无头浏览器 + DOM/computed style 的 14 条确定性规则，跑 1,590 个 Show HN 落地页 | 有标注集、有 precision/recall 脚本、有原始 JSON 结果 |
| 学术 | arXiv 2603.13036（CHI 系作者群） | 社会学技术风险分析 + 案例研究 | 有作者、有机构、有同行评审路径 |
| 设计师经验总结 | Anthropic 自家 `frontend-design` skill、avoid-ai-design 目录 | 逐条 tell + 检测信号 + 修法 | 被厂商自己写进系统提示词，等于承认现象存在 |

### 1.2 Krebs 的 16 条原始特征表【实】

来源：[Scoring Show HN submissions for AI design patterns](https://www.adriankrebs.ch/blog/design-slop/)（2026-04-20；HN 讨论 2026-04-22，333 分，72 条评论：[HN 47864393](https://news.ycombinator.com/item?id=47864393)）。原文把这 16 条分成四组，我逐条抄录（不增不减）：

- **字体**：Inter 用满全站，尤其是居中的 hero 大标题；模型偏爱的固定搭配 Space Grotesk / Instrument Serif / Geist；在其余全 Inter 的 hero 里，用一个衬线斜体词做强调。
- **配色**：「VibeCode Purple」；不问就来的常驻深色模式，正文是中灰、小标题全大写；深色主题下正文对比度勉强及格；什么都要渐变；大面积色光与带色 box-shadow。
- **布局怪癖**：通用无衬线体配居中 hero；H1 正上方挂一枚徽章；卡片的上边或左边有彩色描边；一模一样的 feature 卡片、每张顶上一个图标；「1、2、3」编号步骤；数据横幅行；侧栏或导航用 emoji 当图标；全大写标题与小标题。
- **CSS 模式**：shadcn/ui；玻璃拟态。

同文给出两个数字：作者用设计师朋友的一句话起头——「**彩色左边框几乎和文本里的破折号一样，是 AI 生成设计的可靠标志**」；以及实测分布：**1,590 个站点里，命中 4 条以上 22%、2–3 条 32%、0–1 条 46%**。作者自己标注人工复核的**误报率约 5–10%**。

**这条最重要，因为它把「AI 味」从形容词变成了可数的东西**：单条命中不算，要数命中条数分档。这与仓库 `deliverables/02-anti-ai-rules.md:31` 的「分布现象而非单点现象」定义一致，且早于本仓库。

### 1.3 学术侧：唯一一篇正面研究 web vibe coding 同质化的论文【实】

**Interrogating Design Homogenization in Web Vibe Coding**，Donghoon Shin、Alice Gao、Rock Yuren Pang、Jaewook Lee、Katharina Reinecke、Emily Tseng，arXiv:2603.13036，2026-03-13。[https://arxiv.org/abs/2603.13036](https://arxiv.org/abs/2603.13036)

摘要关键句（原文）：「Generative AI is known for its tendency to homogenize, often reproducing dominant style conventions found in training data. However, it remains unclear how these homogenizing effects extend to complex structural tasks like web design.」

**必须如实说明的局限**：这篇论文**没有给出视觉特征的清单，也没有色值层面的测量**。它做的是 (a) 刻画 vibe coding 生命周期中同质化风险出现的阶段，(b) 社会技术风险分析，(c) 提出「productive friction（生产性摩擦）」作为缓解框架。**它不能用来支撑任何具体色值或圆角数值的主张。** 谁拿它证明「AI 网页都是紫色」，就是超额引证。

其余相关论文（都不是「AI 网页长什么样」，用途见括号）：

- **Emergent Dark Patterns in AI-Generated User Interfaces**，Daksh Pandey，arXiv:2602.18445，2026-01-14。[链接](https://arxiv.org/abs/2602.18445)。（讲的是操纵性 UI 而非视觉风格；提出 DarkPatternDetector，印度 DPDP 法语境。**不要拿它当视觉签名证据。**）
- **DeGenTWeb: A First Look at LLM-dominant Websites**，Sichang Steven He、Calvin Ardi、Ramesh Govindan、Harsha V. Madhyastha，arXiv:2605.00087，2026-04-30。[链接](https://arxiv.org/abs/2605.00087)。（这篇最有价值的一句是**反证**：现有 LLM 文本检测器「perform much worse than advertised」——即「检测 AI」这件事本身在方法上很脆。详见 §6.4。）

### 1.4 厂商侧：Anthropic 自己写了一份「AI 味清单」【实】

两处，都是 Anthropic 官方仓库：

1. **Frontend Aesthetics: A Prompting Guide**（Claude Cookbook），文件首提交 2025-10-21（commit #234）。[notebook](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb)。其 `DISTILLED_AESTHETICS_PROMPT` 原文：
   > 「You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic.」
   > 并点名：`Overused font families (Inter, Roboto, Arial, system fonts)`、`Clichéd color schemes (particularly purple gradients on white backgrounds)`、`Predictable layouts and component patterns`；结尾补一句「You still tend to converge on common choices (Space Grotesk, for example)」。
   同页还给了一组对照实验结果（三组 prompt：SaaS 落地页 / 博客布局 / 后台表格，各有「有/无 aesthetics prompt」的截图），并写道「Without guidance, Claude often defaults to simplistic designs with **white and purple backgrounds**」。

2. **frontend-design skill**。[github.com/anthropics/skills/tree/main/skills/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)。这份更狠，直接列出「AI 设计目前聚集的五个簇」，其中第 1 簇是「暖奶油底（近 `#F4F1EA`）+ 高对比衬线 + 赤陶/暖陶土强调色（常近 `#D97757`——Anthropic 自己 Claude 交互色，所以在用户 brief 上会被读成 tell）」。同文件还点名三种「最常见 tell」：标题里只强调一个词、小标题全大写、内容上方加不必要的排版标签。

**这意味着什么**：厂商自己在提示词里承认「模型会向众数收敛」，并把这个众数点名到色值级（`#F4F1EA`、`#D97757`）。这是**能拿到的最强一手证据**，因为它不是外部批评者的猜测，是模型提供方自己的工程判断。

### 1.5 社区侧：被验证过的「二阶默认值」【圈/实混合】

**二阶默认值**指：大家学会躲开紫渐变之后，**新的躲避方式又收敛成了同一批**。这个概念有多个独立来源指向同一结论：

- avoid-ai-design 的 `references/ai-tells-catalog.md`（46KB，标注每个 tell 的检测信号 + 为什么读起来像 AI + HTML/CSS 与 React/Tailwind 两套修法）。[github.com/funboy322/avoid-ai-design](https://github.com/funboy322/avoid-ai-design)。它把 tell 分成 `⚙ scanner`（脚本可判）/ `👁 render`（要看渲染像素）/ `🧠 judgment`（要读意图）三档——**这个三分类正是本任务问题四要的答案骨架**。
- JCarterJohnson/vibecoded-design-tells（Reddit 语料挖掘）。[github.com/JCarterJohnson/vibecoded-design-tells](https://github.com/JCarterJohnson/vibecoded-design-tells)。其 `skill/references/tells.md` 开头就写明：数据里最响的是**旧**默认值（紫渐变、深色 hero），但**上升最快的 tell 是上一代反 slop 建议自己造出来的「tasteful default」**——奶油/米色底 + 衬线 display（Instrument Serif、Fraunces、Playfair）+ 鼠尾草绿或森林绿强调色。该文第 12 节「数据判定为不必追的」明确列了三条**反例**：mesh/blob/aurora 背景（作为关键词伪影被否掉）、bento grid（0.1%，垫底，且有人主动为它辩护）、深色模式本身（只有「没被要求的辉光」才算 tell）。**这直接影响本仓库规则。**

- 对照：Hallmark（Together AI 出品，33.4k stars）的 `skills/hallmark/references/gates.md`。[github.com/Nutlope/hallmark](https://github.com/Nutlope/hallmark)。这是目前见过**最工程化**的规则表：每条 gate 有编号、有 tier（Floor / Reflex / Finish）、有 class（`M` 静态 CSS/标记可判 / `M/R` 静态+渲染 / `R` 只渲染 / `R/J` 渲染或人判 / `J` 人判）、有「the tell」、有「the fix」。例如：

  | Gate | Tier | Class | The tell |
  |---|---|---|---|
  | 2a | Floor | M | 紫→蓝、紫→粉、深底青，任何位置的渐变，含 `background-clip: text` |
  | 74 | Reflex | M | 框架默认色板（Tailwind 的 indigo-500、violet-600、slate-900 之流）作为 token 或 utility |
  | 1 | Reflex | M | Inter / Roboto / Open Sans / Poppins / Lato / 系统字体作 display |
  | 3 | Reflex | M/R | 卡片特征：三列等宽、图标在标题上方；圆角方块里放图标；卡片侧边粗色条 |
  | 54 | Floor | M | eyebrow：标题前那段只起宣告作用的短文本（含 pill、序数、类目标签、logo 墙上的 `TRUSTED BY`） |
  | 67 | Floor | M | tracked-caps label：≤15px 的文字设成全大写/小型大写，或字距 > 0.03em |
  | 30a | Floor | M | emoji 顶替图标 |

  **注意 gate 74 与 gate 2a 的分工**：前者禁「框架默认色板」，后者禁「紫蓝渐变」。它们不是同一条规则的两种说法——一个页面可以用 Tailwind 的 indigo 但不用渐变，也可以手写一个紫蓝渐变但不用任何框架。这个拆分方式值得抄。

### 1.6 中文圈

本次检索**未能取得**可引用的一手中文系统总结（Wikipedia、知乎、微信公众号镜像在本机网络下全部不可达，见 §8 环境限制）。有一条间接证据：本仓库 `deliverables/01-research-brief.md:23` 记录了「Tailwind 的 `indigo-500` 精确值就是 `#6366F1`，`violet-500` 是 `#8B5CF6`」这一事实链（该事实本身我在 §2 独立核实为真）。**除此之外，中文侧的「AI 味」话语我没有找到可引用的原始出处，不做声称。**

---

## 2. 问题二：`#6366F1` 到底是真事实还是圈内传说

**这一节是本报告的核心。结论分三层，必须分开说。**

### 2.1 事实层：色值本身是真的【实】

我用三个独立来源核对了 Tailwind 调色板的实际数值：

```
# Tailwind v2.0.1  colors.js（cdn.jsdelivr.net/npm/tailwindcss@2.0.1/colors.js）
indigo-500 = #6366f1   violet-500 = #8b5cf6
# Tailwind v3.4.1  src/public/colors.js
indigo-500 = #6366f1   violet-500 = #8b5cf6
```

Tailwind v4 已改用 OKLCH，官方文档 [tailwindcss.com/docs/colors](https://tailwindcss.com/docs/colors) 页面上实测的 tooltip 值是 `indigo-500 → oklch(51.1% 0.262 276.966)`、`violet-500 → oklch(54.1% 0.281 293.009)`、`purple-500 → oklch(55.8% 0.288 302.321)`。

**所以「`#6366F1` = Tailwind `indigo-500`」「`#8B5CF6` = `violet-500`」两句成立，可放心写进任何文档。** 这是整条说法里唯一无争议的部分。

### 2.2 归因层：色值来自 Tailwind UI 的按钮默认值——**部分成立，且有一个被普遍忽略的反证**【实+测】

流传最广的版本是（[Alan West, dev.to, 2026-03-25](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)）：「2025 年 8 月，Adam Wathan 发了一条半道歉的推文，说后悔五年前让 Tailwind UI 里每个按钮都用 `bg-indigo-500`，导致地球上每个 AI 生成的界面都变紫了。这条推文超过一百万浏览。」

我做了三件事：

1. **推文 ID 解码**（Twitter snowflake：`(id >> 22) + 1288834974657` 即毫秒时间戳）。`1953510802159219096 → 2025-08-07 17:37:24 UTC`。同一算法对已知推文 `1787472784106639418`（Simon Willison 2024-05-08 文中引用的 deepfates「slop」推文）解出 `2024-05-06`，与 Willison 原文「I saw this tweet yesterday」在 2024-05-08 吻合，**解码算法自检通过**。所以「2025 年 8 月」这个时间是**可信的**。
2. **推文正文**：本机无法访问 x.com / nitter / xcancel / archive.org（全部超时），**我没有读到推文原文**。点赞/浏览数、措辞、是否真是「道歉」，我一律无法核实。**凡引用这条推文的地方，必须注明「转引自二手」，不能写成「Wathan 承认」。**
3. **关键反证（本次新发现，值得单列）**：我拉了 Tailwind v1 的默认配置：

```
# cdn.jsdelivr.net/npm/tailwindcss@1.9.6/stubs/defaultConfig.stub.js
indigo-500 = #667eea        ← 不是 #6366F1
```

**Tailwind v1 的 `indigo-500` 是 `#667EEA`（H=229），`#6366F1`（H=239）是 v2 才引入的。** 也就是说：如果 Wathan 的「五年前」指 2020 年的 Tailwind UI v1，那当时的按钮色是 `#667EEA`；`#6366F1` 成为默认值发生在 v2（2020-11）之后。这条细节在技术文章里被普遍合并掉了。**后果：把「AI 网页发紫」精确归因到 `#6366F1` 这个具体十六进制值，在时间线上有错位。** 更准确的表述是「归因到 Tailwind 的 indigo 系列（v1 `#667EEA` → v2+ `#6366F1`）」，而不是单点色值。

另有一条**语义层**的观察（这点我认为比色值本身更重要）：Anthropic 的 skill 里写 `#D97757`「是 Anthropic 自己的 Claude 交互色，所以在用户 brief 上会被读成 tell」。这句话承认了归因机制的本质——**不是色值本身有罪，是「这是某某工具的默认值」这个身份有罪**。同一逻辑下，`#6366F1` 的问题是「它是没被改过的框架默认值」，不是「它是紫色」。

### 2.3 实证层：它到底是不是「AI 生成网页的高频色」——**有数据，但数据很弱，且是相关不是因果**【实+测】

现有的唯一量化数据来自两处，我都要如实交代其局限：

**(a) Krebs 的 1,590 站点语料**：他把 `purple_accent` 作为 14 条规则之一，判定条件是「Indigo/violet 作为**实心 CTA 填充**」——源码 `src/patterns/purple-accent.js` 明确排除了 outline/ghost 按钮、纯装饰紫、插画紫；渐变按钮只有在 `backgroundColor` 近乎透明（即渐变本身就是填充）时才计。色相判定在 `src/lib/color.js`：

```js
function isPurple(color) {
  if (!color || color.a < 0.3) return false;
  const hsl = rgbToHsl(color);
  return hsl.h >= 250 && hsl.h <= 300 && hsl.s > 0.25 && hsl.l > 0.15 && hsl.l < 0.85;
}
```

**这里有一个必须指出的技术缺陷【测】**：`#6366F1` 的 HSL 是 **H=239**（我实算：`#6366F1 H=239 S=84% L=67%`）。**239 < 250，落在 Krebs 自己的 `isPurple` 区间之外。** 也就是说，**这个工具的紫色检测器检不出 `#6366F1` 本身**，只能检出 `#8B5CF6`（H=258）、`#A855F7`（H=271）、`#7C3AED`（H=262）。同理 `#4F46E5`（H=243）也检不出。这不是我推测，是把色值代进他公开的函数得到的。

对照：本仓库自己的闸门用的是 `H ∈ [244, 295]`（`tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs:13`）。我实测该函数对候选色的输出：

```
#6366F1 H=239 => null        ← 也漏
#8B5CF6 H=258 => ai-purple
#4F46E5 H=243 => null        ← 也漏
#818CF8 H=234 => null        ← 也漏
#667EEA H=229 => null        ← 也漏（Tailwind v1 的 indigo-500！）
#A855F7 H=271 => ai-purple
#7C3AED H=262 => ai-purple
#D97757 H=15  => terracotta
#F4F1EA H=42  => cream
```

**结论：本仓库现役的 `palette-purple` 规则，恰恰检不出 8 条清单第①条点名的那个色值 `#6366F1`，也检不出 Tailwind v1 的 `#667EEA`。** 这是一个**可复现的内部矛盾**，比 README 里记录的 `box-shadow` 中英打架更严重——那条只是文档口径不一致，这条是**规则与它自己宣称要抓的目标对不上**。

**(b) avoid-ai-design 引用的百分比**：「Indigo / violet CTA buttons … ~10.7% of sites」「Colored glow box-shadows … ~4.3%」「三卡 ~20%」「居中标题 ~23.5%」。这些百分比的来源标注是 Krebs 的语料，但 Krebs 原文**只在正文给了三档分布（22%/32%/46%）**，没有逐条给百分比。**我没能在原始出处找到这些分项数字。记为【圈】：可能是该 skill 作者自己跑的结果，但无法回溯。不得引用。**

**(c) 反向量化证据**：JCarterJohnson 的 Reddit 挖掘给出「AI purple（violet/indigo 主色）在 on-topic 评论里被点名 **2.3%**，是**最高频的颜色类 tell**，且与「gradients」的共现次数最多（32 次）」。**注意 2.3% 这个数字很低**——它的意思是：在人们讨论「AI 站点为什么都一样」时，只有 2.3% 的评论提到紫色。而「默认的 shadcn / Tailwind 观感」被点名 2.5%，略高。**两者都远低于直觉。**

### 2.4 本节结论（可直接引用）

> **`#6366F1` 是 Tailwind `indigo-500` 的精确值——真。**
> **它被归因为 AI 网页高频色——半真：有归因链（Wathan 推文 2025-08-07 + Tailwind UI 默认按钮），有语料测量（Krebs 1,590 站、Reddit 2.3% 提及率），但没有一项是「控制变量的因果实验」。而且最常被引用的那个色值（`#6366F1`）在两个主流检测器里都检测不出来，因为它的 HSL 色相 239 落在所有「紫」判定区间之外。**
> **最准确的表述**：紫/靛蓝作为**未被改动的框架默认强调色**，是生成式 UI 的可测量特征之一，但强度被圈内明显夸大；落到具体十六进制值上做禁令，技术上不可靠——除非像 §4/§5 说的那样，直接按字面量列名单。

---

## 3. 问题三：负面指令 vs 正面指令，有无数值比较

**结论：有实证，但没有任何一篇是专做「网页/代码生成」的。现有证据全部来自邻近任务，属跨任务外推，必须降级使用。**

### 3.1 直接可用的实证：否定是 LLM 的已知弱项【实】

- **Language models are not naysayers: An analysis of language models on negation benchmarks**，Thinh Hung Truong、Timothy Baldwin、Karin Verspoor、Trevor Cohn，arXiv:2306.08189，2023-06-14。[链接](https://arxiv.org/abs/2306.08189)。摘要原句：「LLMs have several limitations including **insensitivity to the presence of negation**, an inability to capture the lexical semantics of negation, and a failure to reason under negation.」测试对象含 GPT-3 与 InstructGPT。
  **用途**：这是「不要 X」可能被当成「X」这一担忧的**唯一有分量的学术支撑**。但注意它测的是**理解否定**（判断「不是 A」的真假），不是**执行否定指令**（生成时不产生 A）。跨到后者需要一步外推。
- **Tell Robot What Not to Do: A Negation Understanding Perspective**（NegaAlign / NegaBench），arXiv:2610.11952，2026-10-08。[链接](https://arxiv.org/abs/2610.11952)。最刺眼的数字：在 NegaBench 上，`π0.5` 模型对**否定式指令**的成功率是 **2.60%**，加上他们的对齐层后升到 **88.45%**；真实世界任务 12.4% → 88.8%。**这是本次检索里「否定指令很难被遵循」最硬的量化证据**——但它是**机器人操作**任务（VLA 模型），不是网页生成。跨过来用必须明说。
- **FollowBench**，Yuxin Jiang 等，arXiv:2310.20410，2023-10-31。[链接](https://arxiv.org/abs/2310.20410)。多级细粒度约束遵循基准，五类约束（Content、Situation、Style、Format、Example），逐步加一条约束看模型何时崩。**它测的是「约束越多越难遵循」这个趋势，没有单独拆出「否定 vs 肯定」的对照臂。**
- **The Language of Security: How Prompt Syntax Shapes Secure Code Generation in Open LLMs**，arXiv:2607.15937，2026-07-17。[链接](https://arxiv.org/abs/2607.15937)。**这是最接近本任务的一篇**（代码生成 + 提示词语法）。结论：`constraints, guards, conditions, and concept bindings` 这些**句法成分及其在提示词中的位置**会稳定影响生成不安全代码的概率。**局限**：它研究的是「安全/不安全」这个二元属性，不是「设计同质化」。
- **You Don't Need Prompt Engineering Anymore: The Prompting Inversion**，arXiv:2510.22251，2025-10-25。[链接](https://arxiv.org/abs/2510.22251)。**这条对「8 条清单该不该保留」有直接后果**：同一套「约束式」提示在 gpt-4o 上有效（97% vs 93%），在 gpt-5 上**变成有害**（94.00% vs 96.36%）。作者称之为「Guardrail-to-Handcuff」转变——防止中等模型犯常识错的约束，会让更强模型过度字面化。**含义：清单的有效性本身随模型版本漂移，2026 年有效的清单不保证 2027 年有效。** 这一条应该写进任何长期维护的规则集的头部。

### 3.2 找不到的东西【缺】

- **没有**任何论文做过「同一网页生成任务，N 条负面约束 vs N 条正面约束」的对照实验。
- **没有**任何论文测量「负面约束会不会反向激活被禁的视觉特征」在**网页/UI 生成**上的效应。图像生成侧有 negative prompt 机制研究（如 arXiv:2406.02965《Understanding the Impact of Negative Prompts: When and How Do They Take Effect?》，2024-06-05，[链接](https://arxiv.org/abs/2406.02965)，结论是「Delayed Effect」与「Deletion Through Neutralization」），但那是 diffusion 的 latent 机制，**不能直接搬到自回归代码生成上**。
- 网上「否定指令会反向激活」的说法在本机可达的范围内**没有找到控制实验**，只有教学材料和经验帖。

### 3.3 Anthropic 自己怎么做（这是最实用的证据）【实】

上面 §1.4 那份 cookbook 的 `DISTILLED_AESTHETICS_PROMPT` 是**否定与肯定混写**的：

- 否定（点名具体物）：`Avoid generic fonts like Arial and Inter`、`Avoid generic AI-generated aesthetics` + 四条 bullet（`Overused font families (Inter, Roboto, Arial, system fonts)`、`Clichéd color schemes (particularly purple gradients on white backgrounds)`、`Predictable layouts and component patterns`、`Cookie-cutter design that lacks context-specific character`）。
- 肯定（给方向、给范围）：`Choose fonts that are beautiful, unique, and interesting`、`Dominant colors with sharp accents outperform timid, evenly-distributed palettes`、`Layer CSS gradients, use geometric patterns, or add contextual effects`、`one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions`。

而 `TYPOGRAPHY_PROMPT` 那份更极端，是**肯定为主 + 白名单**：

```
**Never use:** Inter, Roboto, Open Sans, Lato, default system fonts
**Impact choices:**
- Code aesthetic: JetBrains Mono, Fira Code, Space Grotesk
- Editorial: Playfair Display, Crimson Pro, Fraunces
- Startup: Clash Display, Satoshi, Cabinet Grotesk
- Technical: IBM Plex family, Source Sans 3
- Distinctive: Bricolage Grotesque, Obviously, Newsreader
**Pairing principle:** High contrast = interesting.
**Use extremes:** 100/200 weight vs 800/900, not 400 vs 600. Size jumps of 3x+, not 1.5x.
```

**可提炼的模式**：**「禁止项写成一个封闭白名单的补集」比「禁止项写成形容词」有效得多。** 「Never use: Inter, Roboto, Open Sans, Lato, system fonts」是可 grep 的；「Choose fonts that are beautiful, unique, and interesting」不是。两者并列出现时，前者负责**排除**，后者负责**在剩余空间里给方向**。

### 3.4 对本仓库 8 条的直接判决

**不要整体改成正面表述，也不要整体保留。** 依据只有一条，但它是硬的：**一条规则能不能被机械检验，决定它该写成哪种极性。**

- 能被 grep/计数命中的（`#6366F1`、`backdrop-filter`、emoji 码位、`repeat(3, 1fr)`）→ **保留否定式**，且必须把**字面量**写进规则（不是「紫蓝」而是 `#6366F1`）。理由：这类规则的价值不在说服模型，在于**生成后能被闸门判死**；写成否定式可让闸门直接输出「命中 X」。
- 不能机械检验的（「柔和外投影」「高级感」「AI 味」）→ **必须改写为可数的肯定式**，否则它在提示词里只是一句祈使句，在闸门里没有对应物。
- **额外一条（本次新增）**：即使保留否定式，也要遵守 `#6366F1` 的教训——**规则点名的字面量必须落进规则自己的检测区间**。§2.3 已经证明现役 `palette-purple` 的区间 `[244,295]` 抓不到 `#6366F1`（239）。**这是 8 条里第①条站不住的直接原因。**

---

## 4. 问题四：哪些能机械校验，哪些只能靠人眼

### 4.1 判据

我用 avoid-ai-design 的三分法做骨架，但把判据写死成本仓库能用的形式：

| 类别 | 判据 | 需要什么 | 误报风险 |
|---|---|---|---|
| **M（静态可判）** | 只看 CSS 声明 / HTML 标记 / 文本内容，正则或 AST 即可 | 源码 | 低，但会误伤「有意为之」 |
| **R（渲染可判）** | 必须跑无头浏览器，读 `getComputedStyle` 与 `getBoundingClientRect` | Playwright/CDP | 中，依赖视口尺寸 |
| **P（像素可判）** | 只有截图后算颜色面积/对比/密度才能判 | 截图 + 图像分析 | 中高 |
| **J（人判）** | 需要读意图：这个默认值是被选的还是被继承的 | 人 | 高，不可复现 |

**关键区分不在「难不难测」，在「测出来说明什么」。** M/R 能测出「页面里有 `#6366F1`」，测不出「这是不是 AI 写的」。后者永远需要 J。

### 4.2 逐条落地的检测思路

下面每条都给可执行判据。凡是标 **【测】** 的，是我已经用本仓库现存代码验证过可行性的。

**① 紫蓝渐变 → M**
- 扫 CSS 文本：`/linear-gradient\([^)]*\)/`，提取所有色标，转 HSL，判 `H∈[240,300]` 且 `S>0.4`。
- 扫渲染：`getComputedStyle(el).backgroundImage`，同上；注意 `background-clip: text` 要单独计（Krebs 把它作为独立信号）。
- **坑（已踩）**：`#6366F1` 的 H=239，落在 `[240,300]` 外。必须把区间下限降到 **235**，或改成「同时接受 `H∈[230,300]` 且 `S>0.5`」。**不修这个，规则抓不到它自己点名的色值。**
- 另一个坑：无意义的兜底渐变 `linear-gradient(rgba(0,0,0,0),rgba(0,0,0,0))` 在 SVG 图标下很常见（HN 的投票箭头就是），必须先滤掉 alpha≈0 的色标，否则误报。Krebs 的 `hasVisibleStop()` 就是干这个的，可直接抄。

**② 圆角卡片配柔和外投影 → R**
- `getComputedStyle` 读 `borderTopLeftRadius ≥ 6px` 且 `boxShadow !== 'none'` 且阴影 `blur ≥ 12px` 且颜色 alpha ≤ 0.15 且偏移无主导方向。
- 本仓库 `probe.mjs` 已经在做同类测量（`roundedBoxes`、`shadowStatic`、`shadowOverlay`），**复用即可，不需要新写**。
- 人眼部分：一个 `24px/0.08` 的阴影和一个 `4px/0.3` 的硬阴影，数值上都「有阴影」，视觉上完全不同。**这里必须靠人判或阈值调参**。

**③ 居中大标题 + 两个并排 CTA 的首屏 → R**
- 居中：`h1` 的 `textAlign === 'center'`，且首屏（`top < viewportHeight`）内文本块中居中占比 ≥ 0.6。Krebs 的 `center_aligned_hero` 用的正是这个阈值（`minAboveFoldRatio: 0.6`，`withH1Ratio: 0.4`）。
- 并排 CTA：首屏内 `a[href]` 与 `button` 中，可见、宽高 ≥ 44px、且两两之间垂直重叠 > 50% 的簇，簇大小 ≥ 2。
- **坑**：单看「居中」会误伤——Anthropic 自己说 centered hero 在某些 brief 下是对的。Krebs 也是把「居中 + 通用无衬线标题字体」**联合**判定才触发。**单独一条「居中」不足以定罪。**

**④ 三条等宽 feature 卡片 → R（最干净的一条）**
- 本仓库 `probe.mjs:359-374` 已有实现，逻辑值得抄：
  - 找 `big` 元素的 `parentElement`（去重）；
  - 子元素过滤：`150 ≤ width < 视口宽 × 0.9`、`height ≥ 90`、不是 `img/picture/video/canvas/svg`、`innerText` 长度 ≥ 12（**这条排除了「一排照片」和「一排纯图标」**）；
  - 子元素数 ≥ 3；
  - 其中「有盒子外观」（背景 alpha > 0.04 或 border 或 boxShadow）的 ≥ 3；
  - 宽度与第一个的差 < 3px 的 ≥ 3（**这是「等宽」的可执行定义**）；
  - 再判「图标在顶部」：每个卡片内第一个 `svg/img/i/[class*=icon]` 尺寸 ≤ 64px 的个数 ≥ n−1。
- **这套判据完全可复现，且已经在本仓库跑过。** 建议直接复用，不要重造。

**⑤ emoji → M（最简单，也最容易过头）**
- Unicode 区段：`[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]`。本仓库 `probe.mjs:430` 用的正是这个。
- **坑**：`★`(U+2605) 落在 `2600-26FF` 里。本仓库已经踩过：`deliverables/51-critique-promises.md:63` 记录 M03 的 `style.css` 命中 6 枚 `★`，其中 3 枚在**注释里**。**必须只扫渲染文本（`bodyText`），不扫 CSS 注释与源码。** 另外「★」作为评分星标是功能性符号，不是「emoji 当图标」。

**⑥ 玻璃拟态 → M（最可靠的一条）**
- `backdrop-filter` 在 `getComputedStyle` 里直接可读，CSS 文本里也可 grep。**几乎零误报**，因为这个词没有别的用途。
- 只需加一条阈值：Krebs 与本仓库都是 `> 1` 才报（`s.blurred > 1`），因为单个吸顶导航用毛玻璃是合理设计。**阈值是 1，不是 0——这个细节 8 条清单里没有。**

**⑦ 暗底发光字 / 霓虹 / 扫描线 → M+R（拆成三件事）**
- 发光字：`textShadow !== 'none'`（M，直接可读）。
- 霓虹：前景色 `S > 0.8` 且 `L > 0.5`，背景 `L < 0.15`，同一元素内共现（R）。
- 扫描线：`repeating-linear-gradient` 出现即命中（M，正则即可）。
- **注意**：JCarterJohnson 的数据说「深色模式本身不是 tell，只有没被要求的辉光才是」。**把「暗底」和「发光」绑在一条规则里会误伤一半正当的深色产品。**

**⑧ 自动轮播 / 视差 / 卡片翻转 → M+R（最难的一条，且容易变成静态分析幻觉）**
- 轮播：DOM 里有 `setInterval` 的可见证据很难拿（要跑 JS 并观察）。可行的替代是**行为探测**：加载后等 2 个间隔，比较首屏某元素的 `getBoundingClientRect().left` 是否变化。
- 视差：滚动 200px，比较背景元素与前景元素的位移比。需要 CDP 派发滚动事件。
- 卡片翻转：`transform` 里含 `rotateY(` 或 `rotate3d(`（M，可 grep），但要区分「真的翻转交互」与「静态 3D 装饰」。
- **诚实结论：这三样里只有「卡片翻转」能在源码层可靠判定。轮播与视差必须跑行为，成本高、稳定性差，建议降级为 WARN 而非 FAIL。**

### 4.3 汇总表

| 8 条 | 可机械判定 | 类别 | 现役闸门是否已覆盖 |
|---|---|---|---|
| ① 紫蓝渐变/`#6366F1`/光斑 | 部分 | M+R | `gradient` 有；**`palette-purple` 抓不到 `#6366F1`（H=239 < 244）** |
| ② 圆角卡片 + 柔影 | 可 | R | `shadow`、`card-rows` 有，但阈值为 0 阴影（比本条更严） |
| ③ 居中 hero + 双 CTA | 可 | R | `all-centred` 只是 WARN，且阈值 0.72 |
| ④ 三条等宽 feature 卡 | 可，且最干净 | R | `icon-cards` / `card-rows` 已有完整实现 |
| ⑤ emoji | 可 | M | `emoji` 有，但需限定「只扫渲染文本」 |
| ⑥ 玻璃拟态 | 可，近零误报 | M | `glass`（WARN，阈值 >1） |
| ⑦ 暗底发光/霓虹/扫描线 | 拆三件，前两件可 | M+R | `text-shadow` 有；霓虹与扫描线无 |
| ⑧ 轮播/视差/翻转 | 只有翻转可 | M（翻转）/ 行为探测（轮播视差） | `still-page` 部分覆盖，但语义不同 |

---

## 5. 问题五：公开的 AI 网页检测工具

**结论：有，而且比预期多。但质量差异极大，只有两三个能当工程依赖。**

### 5.1 可用作参考的（按可用性排序）

**1. Design Slop Cop / ai-design-checker**（Krebs）——**最值得抄的一个**
- [github.com/AdrianKrebs/design-slop-cop](https://github.com/AdrianKrebs/design-slop-cop)、[github.com/AdrianKrebs/ai-design-checker](https://github.com/AdrianKrebs/ai-design-checker)（两者为同一项目的不同快照）。MIT。
- 结构：`src/patterns/<id>.js` 每个文件一条规则，导出 `{ id, label, thresholds, extract(ctx), score(signal, T) }`。`extract` 被 `Function.prototype.toString()` 序列化后**注入浏览器执行**，`score` 在 Node 侧跑。**这个设计非常适合本仓库**——因为本仓库的闸门本来就是「探针在页面里采数、规则在 Node 里判定」。
- 规则共 14 条（README 表格逐条列出）：Templated display fonts / Hero font mix / Vibe purple / Gradients / Accent stripe / Glassmorphism / Colored glow / Emoji nav / Centered + Inter / Perma dark / Numbered steps / Stat banner / Headline badge / FAQ accordion。
- 评分：`score = round(100 × patternsFlagged / patternsTotal)`；分档 `5+ High · 3–4 Medium · 1–2 Low · 0 None`。
- **有校准集**：`dataset/labels.jsonl` 附 165 条人工标注，`npm run eval` 出 precision/recall。**这是它比其它同类强的地方——它有 ground truth。**
- 已知缺陷（我在 §2.3 实测的色相区间漏 `#6366F1`）。

**2. Hallmark（Together AI）**——**规则的工程化范式最好**
- [github.com/Nutlope/hallmark](https://github.com/Nutlope/hallmark)，MIT，33.4k stars。
- 核心是 `skills/hallmark/references/gates.md`（39KB）。它的三分 tier 值得整体借鉴：**Floor（一票否决，不许发布）/ Reflex（模型反射，要么改要么留痕豁免）/ Finish（工艺细节，只记录不拦截）**。
- 每条 gate 有：编号、tier、class（M/M-R/R/R-J/J）、the tell、the fix。**「the fix」是必填项——这是它和「只列禁止项」的规则集最大的区别。**
- 有几条本仓库没有、但很值得抄的：`Gate 74` 禁「框架默认色板作为 token/utility」（直接点名 `Tailwind 的 indigo-500、violet-600、slate-900`）；`Gate 19` 的文案公然词表（`seamless, robust, empower, supercharge, elevate, effortless, unlock, unleash, next-generation, world-class, best-in-class, industry-leading, mission-critical, future-proof`）+ 反驳式节奏（`Not a feature. A platform.`）+ 破折号 + `Learn more / Get started / Book a demo` 这种「配角 CTA」；`Gate 58` 一屏 900px 内不超过约 80 词。

**3. avoid-ai-design**——**分类最细，且自己承认误伤**
- [github.com/funboy322/avoid-ai-design](https://github.com/funboy322/avoid-ai-design)。`references/ai-tells-catalog.md` 46KB，`scripts/detect.mjs` 43KB（零依赖扫描器）。
- 它的 `⚙/👁/🧠` 三分类、`P0/P1/P2` 严重度分级（P0 = 外行看得出是 AI；P1 = 设计师看得出；P2 = 工艺细节）值得直接抄。
- **它有一段「What not to over-flag」，写得比大多数规则集清醒**（原文要点）：brief 优先；判组合不判单点；一条用得好的渐变不是 slop；`Glassmorphism, bento grids, and aurora / mesh backgrounds are over-blamed`；`"It's just Tailwind" is true and beside the point`；Corporate Memphis 是前 AI 时代的产物，不能当证据。

**4. Gesso Build skills（73 条 guard）**
- [github.com/Gesso-Build/skills](https://github.com/Gesso-Build/skills)。`skills/anti-slop/references/rules.md` 64KB，**实测 73 条**（我用 `^### <id> \(severity` 正则数的）。每条格式统一：`### id (severity N, FIX|FLAG|BASE)` + Detects + Why it reads as slop + bad/good 代码 + Auto-fix。
- 有特色的几条：`indigo-accent`（**明确列了十个十六进制值**：`#6366f1, #818cf8, #4f46e5, #4338ca, #3730a3, #8b5cf6, #7c3aed, #6d28d9, #a78bfa, #5b21b6`，并且**跳过自定义属性定义、content 字面量、url() 里的 SVG id**——这个豁免逻辑很实用）、`cream-default-wash`、`safe-green-default`、`purple-violet-wash`、`fake-dot-viz`、`viz-stray-ticks`。
- **注意**：它把 `#6366f1` 直接写进规则表，说明「按字面量列白/黑名单」这条路是有人走通的。**这比按色相区间判更可靠**——因为色相区间会像 §2.3 那样漏。

**5. 其余（只列，未深读）**
- VibeCheck：[vibecheck.fail](https://www.vibecheck.fail/)，声称 45+ 信号 / 5 类 / 全页截图 + Puppeteer。它的自我定位值得引用一句：「We grade the **vibe**, not the toolchain. A tasteful site fully written by AI scores low. A slop site hand-coded by a human still scores high.」——**这句话本身就是对「AI 检测」这个概念的界限声明。**
- impeccable：[github.com/pbakaus/impeccable](https://github.com/pbakaus/impeccable)，87k stars，Apache-2.0。`reference/critique.md` 45KB。定位是「设计语言 skill」而非检测器。
- 其它同名/近似项目（`omergocmen/aislopmeter`、`Trystan-SA/claude-design-system-prompt`、`superdesigndev/superdesign-skill` 等）star 数低或未验证，**不建议作为依据**。

### 5.2 找不到的【缺】

- **没有** Lighthouse 式的官方「审美检查」。Lighthouse 的 category 只有 performance / accessibility / best-practices / SEO（以及 PWA），**没有 aesthetics**。
- **没有**任何浏览器厂商或标准组织出的「AI 生成检测」API。
- **没有**跨工具统一的「AI 味分数」定义——四家（Krebs / Hallmark / Gesso / VibeCheck）的评分公式互不兼容，分值不可比。

---

## 6. 问题六：反例——「AI 味」这个概念本身有问题吗

**结论：有，而且最强的反对意见不是来自网友，是来自做这件事的人自己。这一节建议整段读，因为它决定清单要不要加免责条款。**

### 6.1 最强的一击：做检测的人自己写的免责声明【实】

Krebs 在原文倒数第二段写：

> 「Is this bad? Not really, just uninspired. After all, validating a business idea was never about fancy design, and **before the AI era, everything looked like Bootstrap**.」

并且他在方法段就写明：他**故意不截图让 LLM 判**，只用确定性 CSS/DOM 检查；即便这样，「This ultimately also leads to false positives, but my manual QA run verified it's maybe **5-10%**」。

**这两句合起来是致命的**：一个花了 1,590 个站点做测量的人，第一承认误报率 5–10%，第二承认「这件事在 Bootstrap 时代就发生过」。**任何引用他数据的人，如果不同时引用这两句，就是断章取义。**

### 6.2 第二击：混淆「收敛」与「AI 生成」【实】

avoid-ai-design 的目录开头写得很直白：

> 「**A tell is evidence of a default nobody chose, not proof that a model made the page.** Designers shipped rounded cards and centered heroes long before LLMs, and much of this is simply Tailwind and shadcn left as installed. The fix is the same whoever defaulted. **Never accuse; fix.**」

VibeCheck 的首页同样声明：手工写的 slop 站也会得高分，AI 写的好站也会得低分，「we grade the vibe, not the toolchain」。

**含义**：把「AI 味」当作「AI 生成」的证据，在方法论上是错的。它能当的只有「**这个页面没有做过决策**」的代理指标。**这个区分应该写进清单的开头，而不是脚注。**

### 6.3 第三击：标签化的社会成本【实】

- **AI Slop and the Software Commons**，Sebastian Baltes、Marc Cheong、Christoph Treude，arXiv:2604.16754，2026-04-17。[链接](https://arxiv.org/abs/2604.16754)。核心论点：AI slop 在制造**公地悲剧**——个体的生产力收益把成本外部化到 reviewer 容量、代码库完整性、公共知识资源、协作信任上。**「AI slop 便宜生成、昂贵审查，而审查层本来就很薄」。** 但它同时指出：**公地问题不靠个体自律解决**（要用 Ostrom 的制度设计原则）。**对本任务的推论：靠一份 8 条清单让生成方「自觉不写 AI 味」是错配的解法，真正的解法是闸门（可机械执行的拒绝）。**
- **Defective, Amplified, Contested: Folk Conceptualizations of AI Slop**，Zhixin Li、Jaime Banks，arXiv:2610.14231，2026-10-09。[链接](https://arxiv.org/abs/2610.14231)。分析六个 slop 相关 subreddit 的帖子和评论，得出用户侧定义：**「AI slop is audience-contested AI-generated content characterized by constitutional defects and enabled by platform logics」**——关键词是 **audience-contested（受众争议的）**。文中还记录了一种「防御性区分」：用户会主动把「高质量 AI 内容」和「slop」分开。
- **Measuring AI "Slop" in Text**，Chantal Shaib、Tuhin Chakrabarty、Diego Garcia-Olano、Byron C. Wallace，arXiv:2509.19163，2025-09-23。[链接](https://arxiv.org/abs/2509.19163)。**这是最直接打脸「可以自动判 slop」的一篇**：摘要原句「we find that binary "slop" judgments are (somewhat) **subjective**, but such determinations nonetheless correlate with latent dimensions such as coherence and relevance」，结尾「We highlight that **fully automated and scalable methods remain an open challenge**.」
- **Why AI Slop Matters, but Not Like That**，Sachita Nishal、Marijn Sax、Kimon Kieslich，arXiv:2606.12285，2026-06-10。[链接](https://arxiv.org/abs/2606.12285)。对「Why Slop Matters」一文的回应，主张现有讨论**忽略了 slop 的社会技术语境**，呼吁「contextual and culturally-grounded debate」。**可引用的最强一句是它的立场：slop 的社会功能与美学价值需要被正面讨论，而不是简单否定。**

### 6.4 第四击（技术性，最实用）：检测本身不可靠【实】

**DeGenTWeb**（arXiv:2605.00087，2026-04-30）在摘要里明说：当目标是「尽量减少把人类内容误判为 LLM」时，他们发现「**detectors of LLM-generated text perform much worse than advertised**」，而且是「given the capabilities of the latest LLMs」持续挑战。他们不得不改成「多页聚合到站点级」才拿到可用准确率。

**对本任务的推论**：任何「单页判定 AI 生成」的承诺都是过度承诺。**能承诺的只有「单页命中 N 条默认值」**。

### 6.5 第五击：反 AI 本身会变成新的 AI 味【实+圈】

这是本仓库**已经自己发现过**的：`deliverables/10-red-team-critique.md:207` 的 Q-14 标题就是「『反 AI』这句话本身，已经被你们写成了新的 AI 味」，同文件 `:227` 记录了 18/30 案撞进同一个「暖米纸」窗口、色相带宽只有 5.9°。

外部佐证完全一致：
- Anthropic 的 skill 自己列了第 1 簇「暖奶油 + 高对比衬线 + 赤陶」并承认「on a user's brief it reads as a tell」——**这正是上一代反紫渐变建议的产物**。
- JCarterJohnson 的 tells.md 把这一条列为 **tell 0**，并写：「it is now the single most recognizable "AI tried to be tasteful" signal」；还补了一句更狠的：「it is dishonest slop. The purple gradient at least looked like a default. This one looks like taste, so being told it is also a default lands harder.」
- avoid-ai-design 提出「**三阶**已经在形成」：手作感、谷粒、手绘字、剪贴簿拼贴——「It is legitimate when the subject earns it and the next reflex when it is reached for to look human.」
- 本仓库 `templates/M02` 的暖米 + 赤陶路线，按这三家的判定，**正好落在当前最强的 AI 味簇里**。这一点建议 Lead 单独复核。

### 6.6 我认为最强的反对意见（一句话版）

> **「AI 味」不是一个关于来源的命题，而是一个关于决策密度的命题。** 说一个页面「有 AI 味」，可靠的意思是「这个页面的关键变量都停在了某个未经选择的默认值上」。一旦把它当成「这是 AI 写的」的证据，就会同时犯两个错：冤枉了套模板的人类，放过了精心调过的模型。而**反 AI 味的建议本身也会收敛成默认值**——这不是意外，是同一个机制在下一次迭代里重演。

**这条应该写进清单第 0 条，作为整个清单的适用边界。**

---

## 7. 与仓库现状的对照：8 条清单的问题清单

在给重写版之前，先把「站不住」的部分点名。每条都给可复核的行号。

| # | 现文 | 判定 | 依据 |
|---|---|---|---|
| ① | 不要紫蓝渐变、`#6366F1`、蓝紫光斑 | **半站得住，且闸门与其自相矛盾** | 归因链成立（§2.2），但现役 `palette-purple` 的色相区间 `[244,295]`（`rules.mjs:13`）**抓不到 H=239 的 `#6366F1`**，也抓不到 Tailwind v1 的 `#667EEA`（H=229）。**规则点名了一个自己检不出的值。** |
| ② | 不要圆角卡片配柔和外投影 | **站不住（表述层）** | 「柔和」不可判。现役 `shadow` 规则实际是**任何静态 box-shadow 都 FAIL**（`rules.mjs:70`），比本条严得多；而 `README.md:202` 已承认 M01 有 3 处、M03 有 1 处。**规则说的和闸门做的不是同一件事。** |
| ③ | 不要居中大标题加两个并排 CTA | **站得住，但阈值缺失** | 有实证支撑联合判定（Krebs 的 `center_aligned_hero` 要求「居中比例 ≥0.6」**且**「标题字体是通用无衬线」）。现役 `all-centred` 只是 WARN，阈值 0.72，且不数 CTA。 |
| ④ | 不要三条等宽 feature 卡片 | **最站得住的一条** | `probe.mjs:359-374` 有完整实现（等宽判据 = 宽度差 < 3px；图标判据 = 首个子元素 ≤64px）。**唯一问题：清单没写「等宽」的可执行定义。** |
| ⑤ | 不要 emoji、彩色 iconfont | **站得住，缺一条限定** | Unicode 区段扫法有效（`probe.mjs:430`）。**但必须限定只扫渲染文本**，否则 `★`(U+2605) 在 CSS 注释里会被误伤——`deliverables/51-critique-promises.md:63` 已经踩过。 |
| ⑥ | 不要玻璃拟态、毛玻璃、半透明浮层 | **站得住，但阈值写成 0 是错的** | `backdrop-filter` 近零误报。但现役阈值是 `>1`（`rules.mjs:77`，WARN），因为单个吸顶导航用毛玻璃是合理的。**清单写「不要」= 阈值 0，与闸门的 1 冲突。** |
| ⑦ | 不要暗底发光字、霓虹色、扫描线 | **半站得住：把三件事绑成一条** | 「深色模式本身不是 tell，只有没被要求的辉光才是」（JCarterJohnson tells.md §12）。**按现文执行会误伤所有正当的深色产品。** |
| ⑧ | 不要自动轮播、滚动视差、卡片翻转 | **站不住（可检性）** | 只有 `rotateY(`/`rotate3d(` 能在源码层可靠判定；轮播与视差必须跑行为探测（滚动事件 + 位移比），稳定性差。**写成一条 FAIL 级禁令，闸门给不出对应证据。** |

**共性诊断（三条）**：

1. **清单讲视觉，闸门讲数值，两边没有共享的判据文件。** 8 条里只有 ④⑥ 能在 `rules.mjs` 找到语义等价的规则；①②③⑦⑧ 要么口径不同，要么根本没有对应。
2. **「不要 X」里 X 是概念（「柔和」「霓虹」「AI 味」），不是字面量。** 字面量才能被 grep；概念只能被人解释，而人一解释，规则就失效（这正是 `deliverables/02-anti-ai-rules.md:55` 自己警告过的「40 条规则会被解释成 40 种口味偏好」）。
3. **和 `box-shadow` 那个案例同构**：文档声明一个状态，代码实现另一个状态，两者都没错，错在**没有一条命令能同时验证两者**。修 `box-shadow` 的办法（跑一遍探针，把数字写回文档）同样适用于这 8 条。

---

## 8. 环境与方法限制（必读）

**本机网络状况**（2026-10-26 02:17–03:20 实测）：

- 可达：`github.com` 与 `api.github.com`、`arxiv.org` / `export.arxiv.org`、`hn.algolia.com`、`tailwindcss.com`、`cdn.jsdelivr.net`、`dev.to`、`theverge.com`、`smashingmagazine.com`、`cn.bing.com`（结果质量差）。
- 不可达（连接超时）：`x.com`、`archive.org` / `web.archive.org`、`news.ycombinator.com`（HTML 页面；**API 可用**）、`reddit.com` / `old.reddit.com`、`medium.com`、`css-tricks.com`、`stackoverflow.com`（403）、`openai.com`（403）、全部 Wikipedia 镜像、全部 SearXNG 实例、`r.jina.ai`、`google.com/search`、DuckDuckGo、Brave Search、Startpage、Qwant、Yahoo。
- **因此**：所有 Bing/Google 依赖的搜索均不可用；我的检索路径是「HN Algolia API 全文检索 + GitHub API 仓库/文件树 + arXiv API + 直连已知域名」。这意味着**长尾博文（尤其中文）的覆盖率不足**，本报告对中文圈的结论是「未找到」而非「不存在」。
- **推文原文未读到**（见 §2.2），只做了 ID 时间戳解码。
- Wayback Machine 不可达，**无法验证 Tailwind UI 2020 年的按钮默认值**。§2.2 关于 v1/v2 的结论来自 npm 包内的 `defaultConfig.stub.js`，那是**该版本的默认调色板**，不等于**Tailwind UI 组件当时用的类名**。这两者之间的最后一步我没能验证，必须标明。

---

# 交付 (a)：8 条防退化清单的重写版

**总原则（本次检索的结论）**：
1. **可 grep 的保留否定式，但必须写死字面量**（不是「紫蓝」而是十六进制列表）。
2. **不可 grep 的改写成可数断言**（不是「柔和」，而是 `blur ≥ 12px 且 alpha ≤ 0.15`）。
3. **每条必须能与 `rules.mjs` 的一个 rule id 对上**，对不上就说明它不该在这份清单里。
4. **每条加一行「例外」**——没有例外的规则一定会误伤，误伤之后人会开始解释规则，规则就死了。
5. **清单头部必须写适用边界**（§6.6 那句），否则它会退化成品味审查。

| # | 重写版（可执行、可校验） | 检测方式 | 对应 rule id | 例外 |
|---|---|---|---|---|
| **①** | CSS 中不得出现以下任一色值作为**声明值**：`#6366f1 #818cf8 #4f46e5 #4338ca #3730a3 #8b5cf6 #7c3aed #6d28d9 #a78bfa #5b21b6`（即 Tailwind indigo/violet 500–800 全系）。自定义属性定义、`content` 字面量、`url()` 内的 SVG id 不计。若页面出现 `linear-gradient` / `radial-gradient`，其色标不得同时包含 `H∈[230,300]` 与 `H∈[200,240]` 两个色相（蓝→紫插值）。 | **机械（M）** — 正则扫声明值 + 色相计算 | `palette-purple`（**须把区间从 `[244,295]` 改到 `[230,300]`**）、`gradient` | 品牌色本身是靛蓝且在 brief 中写明来源的，登记豁免并附色值来源。 |
| **②** | 静态元素上 `box-shadow` 数量为 0，唯一例外是**真的浮起来的东西**（菜单、对话框、吸顶栏）。若使用，必须满足：`blur ≥ 12px` 且 `alpha ≤ 0.15` 且**无主导偏移方向**（偏移量 X 分量绝对值与 Y 分量绝对值之差 < 2px）时判为「柔影」，FAIL。卡片圆角 `border-radius ≥ 6px` 且同时有柔影 = 双重命中。 | **机械（R）** — `getComputedStyle` 读 `boxShadow` 与 `borderRadius` | `shadow`（现为「任何静态阴影 FAIL」）、`card-rows` | 硬阴影（`blur = 0` 或 `alpha ≥ 0.3` 且有明确方向）不计——它是印刷/工业语汇，不是「卡片浮起」。 |
| **③** | 首屏（`top < viewportHeight`）内：`textAlign:center` 的文本块占比 ≥ 0.6 **且** 标题字体命中通用无衬线名单（Inter / system-ui / -apple-system / Helvetica / Arial / DM Sans / Plus Jakarta Sans / Manrope / SF Pro Display）**且** 首屏内并排 CTA 簇大小 ≥ 2。**三条同时成立**才判 FAIL。 | **机械（R）** — 居中比例 + 字体名单 + 按钮簇几何重叠 | `all-centred`（**须把 WARN 升为组合判定，并加 CTA 计数**） | 首屏只有一个居中元素、且第二个元素破坏对齐的（Anthropic 的门 6b 用的就是这个豁免）。 |
| **④** | feature 区不得出现「≥3 个等宽兄弟节点，每个都有盒子外观（背景 alpha>0.04 或 border 或 box-shadow），且每个顶部有一个 ≤64px 的图标，且每个含 ≥12 字文本」。**等宽 = 与首个卡片宽度差 < 3px。** | **机械（R）** — `probe.mjs:359-374` 现成实现 | `icon-cards`（FAIL）、`card-rows`（WARN，≥2 行） | 一排**照片**（`img/picture/video/canvas/svg`）不算卡片行——`probe.mjs` 已排除，勿改。 |
| **⑤** | 渲染文本中不得出现 `[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]` 区段的字符。**只扫 `body.innerText`，不扫源码、不扫 CSS 注释。** 星标 `★/☆` 若出现在评分/评级语义中不计。 | **机械（M）** — Unicode 区段扫渲染文本 | `emoji` | 评价组件的评分星、终端里的 `›` 提示符（U+203A 不在区段内，天然豁免）。 |
| **⑥** | 全页 `backdrop-filter` 非 `none` 的元素**数量 ≤ 1**，且该元素必须是吸顶/固定定位的导航或工具条。任何非 fixed/sticky 元素上的 `backdrop-filter` 一律 FAIL。 | **机械（M）** — CSS 文本 + computed style | `glass`（现为 WARN，阈值 `>1`） | 单个吸顶导航。**注意本条与现役闸门只差一个 level**，统一即可。 |
| **⑦** | 拆成三条独立判据：**(a) 发光字**：`text-shadow !== 'none'` → FAIL；**(b) 霓虹**：同一元素上 `color` 的 `S>0.8 且 L>0.5` 而其 `background-color` 的 `L<0.15`，且该元素有 `box-shadow` 或 `text-shadow` 的彩色光晕 → FAIL；**(c) 扫描线**：CSS 出现 `repeating-linear-gradient` → FAIL。**「深色背景」本身不判。** | **机械（M+R）** | `text-shadow`（已有）；(b)(c) **需新增** | 深色产品（监控、夜间工具）保留深色底，只要不加辉光。数据支持：dark mode 本身已被证伪为 tell。 |
| **⑧** | **(a) 卡片翻转**：CSS/内联样式出现 `rotateY(` 或 `rotate3d(` 且该元素有 `transition` → FAIL（M，可靠）。**(b) 自动轮播**：加载后间隔 2× 检测周期，首屏任一元素的 `getBoundingClientRect().left` 变化 > 2px → WARN（行为探测，不稳定）。**(c) 滚动视差**：滚动 200px，比较两个不同 `z` 层元素的位移比，若比值 ∉ [0.95,1.05] 且 ∉ {0} → WARN。 | **(a) 机械**；**(b)(c) 行为探测，降级为 WARN** | `still-page`（语义不同，需新增 `rotate3d` 与视差探测） | 用户主动触发的切换（tab、accordion）不算轮播——判据是「无用户输入也变化」。 |

**净变化**：8 条 → 8 条（不增不减），但**每条都落到一个 rule id 上**，且 **⑤⑥ 的阈值与现役闸门对齐**、**①的色相区间被修正**、**⑦被拆成三条**、**⑧被降级**。

---

# 交付 (b)：该新增但清单里没有的 5 条

选择标准：**有实证或有一手出处 + 可机械校验 + 现役 8 条完全没覆盖**。按价值排序。

### 新增 1｜二阶默认值：奶油 + 衬线 + 赤陶/鼠尾草绿【依据最强】

**规则**：若页面底色 `L ≥ 0.88` 且 `H∈[22,62]`（米/奶油），且强调色 `H∈[6,30]` 且 `S∈[0.38,0.85]`（赤陶）或 `H∈[120,170]`（鼠尾草/森林绿），且 display 字体是高对比衬线 → 判「二阶 AI 味」FAIL。

**依据**：
- Anthropic `frontend-design` skill 把它列为 AI 设计五簇的**第 1 簇**，并给出具体值 `#F4F1EA` / `#D97757`，还自陈「on a user's brief it reads as a tell」。[来源](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
- JCarterJohnson 的 tells.md 把它列为 **tell 0**，称其为「single most recognizable "AI tried to be tasteful" signal」。[来源](https://github.com/JCarterJohnson/vibecoded-design-tells)
- **本仓库现役闸门已经有 `palette-cream` 和 `palette-terracotta`**（`rules.mjs:11-12, 90-92`），但 **8 条清单里一个字都没有**。这是清单与闸门最大的缺口。
- **对本仓库的直接风险**：`templates/M02-warm-local` 走的正是这条路线，且 `deliverables/10-red-team-critique.md:227` 已记录 18/30 案撞进「暖米纸」窗口、色相带宽 5.9°。

**检测**：机械（M），现成代码，只需把两个 family 联合判定（`palette-claude` 已有此逻辑，`rules.mjs:90`）。

### 新增 2｜Eyebrow / 小标题标签 / 编号标记【被三家独立点名，现役闸门已实现，清单没有】

**规则**：标题正上方不得有只起宣告作用的短文本（≤80 字符、无信息量）；`≤15px` 的文字不得设为全大写或字距 > 0.03em；装饰性 `01/02/03` 序号不得出现在非序列内容上。

**依据**：
- Anthropic skill 明写三种「最常见 tell」：`Accenting just a single word or phrase in a headline`、`Using all caps for labels`、`Adding unnecessary typographic labels above content`。[来源](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
- Krebs 的 16 条里有 `Badge right above the hero H1` 与 `Numbered "1, 2, 3" step sequences`。[来源](https://www.adriankrebs.ch/blog/design-slop/)
- Hallmark 把这两条都设为 **Floor（一票否决）**：gate 54（eyebrow）、gate 67（tracked-caps label）、gate 38iii（accented word）。[来源](https://github.com/Nutlope/hallmark)
- **本仓库已有三条现成规则**：`eyebrow`（FAIL）、`micro-label`（≥3 即 FAIL）、`numbering`（FAIL）。**清单里一条都没写。**

**检测**：机械（M）。`eyebrow` 与 `micro-label` 已在 `rules.mjs:50-63` 实现。

### 新增 3｜文案腔调：公然词表 + 反驳式节奏 + 配角 CTA【唯一一条能纯文本判的】

**规则**：正文不得出现词表命中（`seamless / robust / empower / supercharge / elevate / effortless / unlock / unleash / next-generation / world-class / best-in-class / industry-leading / mission-critical / future-proof`，中文对应「无缝 / 赋能 / 一站式 / 解锁 / 颠覆 / 极致 / 生态 / 闭环」）；不得出现「Not a feature. A platform.」式的两段短句反驳节奏 ≥3 次；主 CTA 旁不得有 `Learn more / Get started / Book a demo` 这类配角按钮。

**依据**：
- Hallmark gate 19（Floor）逐条列了这份词表，并点名「the rebuttal cadence three or more times ("Not a feature. A platform.")」和「a stock second action beside the primary」。[来源](https://github.com/Nutlope/hallmark)
- JCarterJohnson §11 记录了 gradient hero 的文案套路：「Transform your X」「Supercharge」「Unleash」「Effortlessly」「Your X, reimagined」。[来源](https://github.com/JCarterJohnson/vibecoded-design-tells)
- **本仓库 `deliverables/02-anti-ai-rules.md` 第 7 节已有 40 词黑名单**，但 8 条清单里没有对应条目。

**检测**：机械（M）——纯字符串匹配，零渲染成本。**这是整份清单里唯一一条不需要浏览器就能跑的规则，应该优先实现。**

### 新增 4｜「一个色相假装两个色」/ 强调色面积失控【可数，且直击 M02 风险】

**规则**：`primary` 与 `accent` 的 OKLCH/HSL 色相差 < 20° 视为「一个色」→ FAIL；强调色在任一视口内覆盖 > 8%（`atmospheric` 类允许到 30%）→ FAIL。

**依据**：
- tailthemes 的七个主题实测：「One theme's `--accent` was a **5.4 degree** rotation of its own `--primary`… two different themes that are supposed to be different products landed within **4.1 degrees** of hue, 0.001 chroma and 0.004 lightness of each other」、「A palette needs a **second job**, not a second swatch」。[来源](https://tailthemes.com/blog/ai-design-slop-quality-gate)（这篇的价值在于它是**自家产品的实测**，不是旁观者评论：七个主题、独立评审、0.5 分差。）
- Hallmark gate 22 / 23 把这两条都写成了 gate（`Zero-chroma neutrals` / `Accent past ~5% of any viewport without a declared posture`，渲染层过 8% 直接 fail）。[来源](https://github.com/Nutlope/hallmark)
- **对本仓库的直接价值**：`deliverables/10-red-team-critique.md` 反复记录「结构没变，只换了色相」——这正是「一个色相假装两个色」的宏观版本。**这条规则能把那个批评机械化。**

**检测**：机械（M）色相差可算；面积需要渲染（R）或从 token 声明里读。

### 新增 5｜字体真的被交付了 / 图片是真的【供应链级，零审美争议】

**规则**：**(a)** `--font-sans` 或 `font-family` 首个家族不是 `ui-sans-serif / system-ui / -apple-system`，**且** `fonts/` 目录或 `@font-face` 的 `src` 真的可达（不得出现「声明了 Inter 但没有字体文件」）。**(b)** 页面上「真实照片/镜头素材/位图」数量 ≥ 4（视口 ≥1100px 时），SVG 插画不计。

**依据**：
- tailthemes 的第一条 tell 就是这个，且描述极准：「Six of the seven shipped without a single font file. Five declared the operating system stack outright, first family `ui-sans-serif`… **Declaring is not shipping**」，并称之为「the loudest tell and it is a **supply-chain problem, not a taste problem**」。[来源](https://tailthemes.com/blog/ai-design-slop-quality-gate)
- Anthropic skill 的 `TYPOGRAPHY_PROMPT` 也要求「Load from Google Fonts. State your choice before coding.」
- **本仓库已有 `font-fallback`（WARN，注释写「declared but not loaded」）与 `few-pictures`（FAIL，<4 张即失败）、`no-real-pictures`（WARN，真实照片 <2）。** 这两组规则是现役闸门里**最不依赖审美判断**的部分，却没有进 8 条清单。

**检测**：机械（M）——字体文件可达性可查 `document.fonts` 或直接 HEAD 请求；图片计数已有实现（`probe.mjs` 的 `realPictures` / `uiPictures`）。

---

## 附：全部引用源（按类型）

**原始研究（arXiv，均附摘要核实）**

1. Shin, Gao, Pang, Lee, Reinecke, Tseng. *Interrogating Design Homogenization in Web Vibe Coding.* arXiv:2603.13036, 2026-03-13. https://arxiv.org/abs/2603.13036
2. Pandey. *Emergent Dark Patterns in AI-Generated User Interfaces.* arXiv:2602.18445, 2026-01-14. https://arxiv.org/abs/2602.18445
3. He, Ardi, Govindan, Madhyastha. *DeGenTWeb: A First Look at LLM-dominant Websites.* arXiv:2605.00087, 2026-04-30. https://arxiv.org/abs/2605.00087
4. Truong, Baldwin, Verspoor, Cohn. *Language models are not naysayers.* arXiv:2306.08189, 2023-06-14. https://arxiv.org/abs/2306.08189
5. *Tell Robot What Not to Do: A Negation Understanding Perspective.* arXiv:2610.11952, 2026-10-08. https://arxiv.org/abs/2610.11952
6. Jiang et al. *FollowBench.* arXiv:2310.20410, 2023-10-31. https://arxiv.org/abs/2310.20410
7. *The Language of Security: How Prompt Syntax Shapes Secure Code Generation in Open LLMs.* arXiv:2607.15937, 2026-07-17. https://arxiv.org/abs/2607.15937
8. *You Don't Need Prompt Engineering Anymore: The Prompting Inversion.* arXiv:2510.22251, 2025-10-25. https://arxiv.org/abs/2510.22251
9. *Understanding the Impact of Negative Prompts.* arXiv:2406.02965, 2024-06-05. https://arxiv.org/abs/2406.02965
10. Shaib, Chakrabarty, Garcia-Olano, Wallace. *Measuring AI "Slop" in Text.* arXiv:2509.19163, 2025-09-23. https://arxiv.org/abs/2509.19163
11. Baltes, Cheong, Treude. *AI Slop and the Software Commons.* arXiv:2604.16754, 2026-04-17. https://arxiv.org/abs/2604.16754
12. Li, Banks. *Defective, Amplified, Contested: Folk Conceptualizations of AI Slop.* arXiv:2610.14231, 2026-10-09. https://arxiv.org/abs/2610.14231
13. Nishal, Sax, Kieslich. *Why AI Slop Matters, but Not Like That.* arXiv:2606.12285, 2026-06-10. https://arxiv.org/abs/2606.12285

**一手工程产物 / 官方文档**

14. Krebs. *Scoring Show HN submissions for AI design patterns.* 2026-04-20. https://www.adriankrebs.ch/blog/design-slop/ ｜ HN 讨论 https://news.ycombinator.com/item?id=47864393（2026-04-22，333 分）
15. Krebs. *Design Slop Cop*（源码、14 条规则、165 条标注数据集）。https://github.com/AdrianKrebs/design-slop-cop ｜ https://github.com/AdrianKrebs/ai-design-checker
16. Anthropic. *Frontend Aesthetics: A Prompting Guide*（notebook 首提交 2025-10-21）。https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb
17. Anthropic. *frontend-design skill*（五个 AI 设计簇）。https://github.com/anthropics/skills/tree/main/skills/frontend-design
18. Nutlope / Together AI. *Hallmark — gates.md*（Floor/Reflex/Finish 三级，M/M-R/R/R-J/J 五类）。https://github.com/Nutlope/hallmark
19. *avoid-ai-design — ai-tells-catalog.md*（46KB，⚙/👁/🧠 三分类）。https://github.com/funboy322/avoid-ai-design
20. *Gesso Build skills — rules.md*（实测 73 条 guard）。https://github.com/Gesso-Build/skills
21. JCarterJohnson. *vibecoded-design-tells*（Reddit 语料挖掘，tell 0 = 二阶默认值）。https://github.com/JCarterJohnson/vibecoded-design-tells
22. *VibeCheck*（45+ 信号，自我定位声明）。https://www.vibecheck.fail/
23. pbakaus. *impeccable*。https://github.com/pbakaus/impeccable
24. *TailThemes. AI Design Slop: The 5 Tells and the 30-Second Checks.* 2026-08-20（更新 2026-09-14）。https://tailthemes.com/blog/ai-design-slop-quality-gate
25. Willison. *Slop is the new name for unwanted AI-generated content.* 2024-05-08. https://simonwillison.net/2024/May/8/slop/
26. Tailwind CSS 官方色板文档（v4，OKLCH 值）。https://tailwindcss.com/docs/colors

**二手转述（引用需注明）**

27. West. *Why Every AI-Built Website Looks the Same (Blame Tailwind's Indigo-500).* dev.to, 2026-03-25. https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p —— **Wathan 推文的一手来源；本报告未能读到推文原文，只核对了其时间戳（2025-08-07）。**
28. Gajjar. *Why Your AI Keeps Building the Same Purple Gradient Website.* 2025-10-26. https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website —— 同一推文的另一处转述，并附推文链接 `x.com/adamwathan/status/1953510802159219096`。

**本仓库内部引用**

29. `tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs`（`colourFamily` 定义在 L8-15；`palette-purple` 在 L93）
30. `tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs`（cardRows 在 L359-374；emoji 在 L430）
31. `deliverables/02-anti-ai-rules.md`（AI 味定义 L23-33；检测流水线 L60-76）
32. `deliverables/61-research/prompt-efficacy.md`（负面指令实证，§4；与本文 §3 互补，**不重复其已核实的引文**）

---

## 一句话总结

> **「AI 味」有真实的可测量内核（默认值收敛，可数、可 grep），但落到具体色值上就被夸大了——`#6366F1` 确实是 Tailwind `indigo-500`（v2+；v1 是 `#667EEA`），归因链成立，实证只有相关没有因果，而且本仓库现役的紫色检测器（`H∈[244,295]`）根本检不出它（H=239）。8 条清单里真正站不住的只有 ②（「柔和」不可判，且与闸门的「任何阴影即 FAIL」冲突）和 ⑧（轮播/视差无法在源码层判定）；①是「规则检不出自己点名的值」；③⑥⑦ 是阈值/拆条问题；④⑤ 只需补执行定义。清单该做的不是「否定改肯定」，而是「每条落一个 rule id + 写死字面量 + 每条附例外」。**
