# 检索报告：AI 建站提示词的实证与最佳实践

> 检索日期：2026-10-26　检索者：联网检索子 Agent
> 服务对象：`D:\Web\style\prototypes\_selection\prompt-copy.js` 中 `buildPrompt()` 生成的约 1200 字中文提示词（7 段结构）
> 任务边界：只回答「给 AI 一份设计风格提示词，让它生成指定风格的完整网页」这件事的**实证证据**与**最佳实践**。仓库既有事实（30 案、1/30 落地验证）不重新调研。

## 0. 证据分级与阅读约定

全文每条结论前标注证据等级，**严格区分「有实证」与「只是某人观点」**：

| 标记 | 含义 |
|---|---|
| **【A｜实证】** | 同行评审论文或有对照实验的技术报告。含样本量、指标、可复现条件 |
| **【A-｜预印本】** | arXiv 预印本，方法看起来严谨但未经同行评审。结论降权使用 |
| **【B｜官方文档】** | 厂商（Anthropic / Vercel / Cursor / OpenAI）官方文档中的明确陈述 |
| **【C｜单案例实测】** | 有人做过对照实验但 n=1 项目、自报数据、无第三方复现 |
| **【D｜观点】** | 工程博客、社区帖、面试题答案。**不作为结论依据，只作为待验证假设** |

**三条前置结论（先读这三条，能省掉大量误判）：**

1. **这份 1200 字提示词的「长度」本身不是风险源。** 1200 个汉字约 1200–2000 token，比所有已知的「长上下文性能衰减」阈值低一到两个数量级（衰减在 64k–128k token 量级才显著，见 §2）。真正的风险是**约束条数与约束类型**，不是字数。
2. **但「约束条数」确实已经进入风险区。** 当前提示词的有效硬约束约 **20 条**（视觉 5 + 结构 4 + 防退化 8 + 验收 3），而两个独立基准给出的「连续全部满足」上限是 **3 条左右**（FollowBench）到 **数十条**（IFScale，且限简单约束）。这是本报告最重要的发现，见 §2。
3. **关于「提示词里放具体色值/字体名能否提高保真度」，没有任何一篇公开论文直接研究过「HTML 生成」这一任务。** 最接近的三条证据链（Design2Code 的 color 分项、Sci Rep 的 hex 颜色认知实验、Paint Anything 的 hex 可控生成）都只能间接支持。**不要把这写成「已有研究证明」，只能写成「三条间接证据一致指向同一方向」。**

---

## 1. 问题一：有无公开可引用的实证，讨论「提示词里放具体色值、字体名、结构约束」对生成结果保真度的影响？

**结论：没有一篇论文直接研究这个组合问题；但有三条间接证据链，且方向一致。同时存在明确的反面证据（约束过密导致遵循率下降）。**

### 1.1 正面证据：具体化（specificity）确实提升保真度

**【A｜实证】Design2Code（NAACL 2025）——生成网页的「颜色」是所有维度里最差的一项，且提示词增强对颜色几乎无效。**

这是目前最贴近本任务的大规模基准：484 个真实网页、以截图为输入、用 CLIP + 元素级 block/text/position/**color** 五项指标评分。关键数字（GPT-4o，Direct 提示）：

| 维度 | GPT-4o | GPT-4V | Claude 3 Opus | Gemini 1.0 Pro Vision |
|---|---|---|---|---|
| Block（元素召回） | 93.0 | 85.8 | 90.2 | 80.2 |
| Text（文字内容） | 98.2 | 97.4 | 97.5 | 94.6 |
| Position（位置） | 85.5 | 80.5 | 77.9 | 72.3 |
| **Color（颜色，CIEDE2000）** | **84.1** | **73.3** | **71.4** | **66.2** |
| CLIP（整体相似） | 90.4 | 86.9 | 87.0 | 84.4 |

三个可直接引用的推论：
- **颜色保真度系统性地低于文字保真度 14–32 个百分点**（98.2 vs 84.1 最好情况；97.5 vs 71.4 Claude）。即模型「抄文字」几乎不出错，「抄颜色」明显出错。
- 论文自己的结论是「models mostly lag in **recalling visual elements** and generating correct **layout designs**」（摘要原文）。
- **反面细节（必须一起引用）**：作者尝试的 text-augmented prompting（把网页文字抽出来喂给模型）显著提升了 block-match 与 text 分，但**颜色分几乎不动甚至下降**（GPT-4o 84.1→83.1，Claude 3 Opus 71.4→69.3）。这说明「把信息写清楚」不等于「模型就会照做」——存在一个与信息量无关的执行缺口。
- 同类：self-revision（让模型对比自己生成的截图与原图再改）在 GPT-4V / Claude 3 上有「minor improvement」，在 Gemini 和全部开源模型上**没有提升甚至变差**，作者归因于「limited capabilities of LLMs to do self-revision」。这条对 §5（自检）非常关键。

来源：[Design2Code, NAACL 2025](https://aclanthology.org/2025.naacl-long.199/)（全文数据表见 [ar5iv 版](https://ar5iv.labs.arxiv.org/html/2403.03163)）

**【A｜实证】Sci Rep 2024：GPT-4 对 hex 色值的表征能力显著优于颜色词，且其颜色知识主要来自 HTML 训练数据。**

这是一篇认知科学论文（六个模态的心理物理实验），但其中一组对照实验直接回答了「hex vs 颜色名」：

| 输入形式 | 与人类判断的相关性 r |
|---|---|
| **hex 色值**（如 `#FF0000`） | **0.84**（95% CI [0.84, 0.85]） |
| 标准 HTML 颜色名（如 "red"） | 0.79（95% CI [0.78, 0.80]） |
| 直接看色块图片 | 0.77 |
| 人类联想词（"blood"、"rose"） | 0.53（95% CI [0.52, 0.54]） |

更关键的是作者的一段归因（原文讨论部分）：当把 hex 换成 CIELAB/CIELUV 坐标时，GPT-4 在颜色**命名**任务上的表现变差，作者解释为「the source of training data that the model relies on to perform the naming task is much more heavily based on **hex-codes as these are very common in HTML documents** that are part of the model's training set」。

**这是本报告找到的、支持「提示词里写 hex 而不是写『暖米色』」最强的一条证据**：不是因为 hex 更「精确」，而是因为 **hex 是模型预训练分布里的原生记号**（HTML/CSS 里就是这么写的），语义描述词反而要经过一次有损翻译。差值 0.84 vs 0.79 不算大，但方向明确、样本可靠。

来源：[Large language models predict human sensory judgments across six modalities, *Scientific Reports* 14:21445 (2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11399123/)

**【A-｜预印本】Paint Anything（NeurIPS 2026）：把 24-bit hex 直接嵌进文本提示是「可学但非默认」的能力。**

论文摘要明确说：现代文生图模型「already contain **partial** color understanding, but this capability remains **unstable** unless numeric color tokens are aligned with localized pixel colors」——他们为此专门构造了 500K 的色彩控制数据集并做 RGB 对齐训练，才把 hex 控制变成「native prompt-following behavior」。

对本任务的意义（**这是推论，不是论文结论**）：既然连专门的图像模型都需要额外对齐才能稳定执行 hex，那么通用 LLM 在生成 CSS 时对 hex 的执行也应当是「大体可靠但不保证」——这与「1/30 样本实测 5 项全对」的现状是自洽的，也说明**不能假设 hex 一定被忠实执行**。

来源：[Paint Anything, NeurIPS 2026](https://neurips.cc/virtual/2026/loc/atlanta/poster/149500)

**【C｜单案例实测】设计系统喂给 Claude Code 的对照实验：自行发明的色值 19 → 0。**

一篇中文工程博客记录了一个可复现的对照：同一个 10 页仪表盘项目做两次，一次只给描述、一次给「设计系统（Token/组件/规范）」+ 一条常驻指令。自报数据：

| 指标 | 无设计系统 | 有设计系统 |
|---|---|---|
| 首次生成即符合品牌规范的页面 | 2 / 10 | 9 / 10 |
| 重新调整样式耗时 | ~6 小时 | ~40 分钟 |
| AI 自行发明的一次性 hex 色值 | **19 个** | **0 个** |

作者的关键那句话值得单独引用：**「截图只能让 Claude Code 去猜测，但是设计令牌/Token 包则让它有据可查。同一个模型，输出截然不同的结果，因为前者给了它一张待解读的图片，后者给了它一套必须遵守的系统。」**

**必须标注的局限**：n=1 项目、单人操作、自报数据、无第三方复现、未披露评分细则。这是 **【C】级证据，不能当【A】用**。但它是本报告找到的、唯一直接测量「色值层面的 AI 胡编」的对照数据，且方向与其他证据一致。

来源：[别再让AI随机生图了！教你用设计系统稳定生成高一致性UI界面！(优设, 2026-07-18)](https://www.uisdc.com/claude-code-design-system)

### 1.2 反面证据：约束越具体、越多，遵循率越低

**【A｜实证】FollowBench（ACL 2024）：GPT-4 只能连续满足约 3 条约束。**

820 条指令、5 类约束（Content / Situation / Style / Format / Example）、1→5 级递增。核心指标 CSL（Consistent Satisfaction Levels，从第 1 级起连续全部满足到第几级）：

| 模型 | CSL |
|---|---|
| GPT-4-Preview-1106 | **3.3** |
| GPT-3.5-Turbo-1106 | 2.9 |
| Qwen-Chat-72B | 2.4 |
| LLaMA2-Chat-70B | 2.1 |
| ChatGLM3-6B | 1.6 |

GPT-4 的 HSR（全部约束同时满足率）从 L1 的 84.7% 降到 L5 的 61.9%。论文原话：「even the most sophisticated models are limited to following instructions with about three constraints」。

**但这里有一个极其重要的分项数据，直接决定了怎么读这张表**（见 §2.3 的拆解）：FollowBench 的 Figure 5 指出「most models demonstrated commendable proficiency under the **Style** constraint」，而 **Example 和 Mixed 约束最难**。也就是说 3 这个数字被「难约束」拉低了，不能直接套到「色值/字体/圆角」这类格式约束上。

来源：[FollowBench, ACL 2024](https://aclanthology.org/2024.acl-long.257/)（全文与数据表见 [ar5iv 版](https://ar5iv.labs.arxiv.org/html/2310.20410)）

**【B｜官方文档】Anthropic 明确不建议堆砌边界情况清单。**

Anthropic 工程博客《Effective context engineering for AI agents》中有一段几乎是逐字针对「防退化 8 条」这类写法的：

> 「Providing examples, otherwise known as few-shot prompting, is a well known best practice... However, teams will often **stuff a laundry list of edge cases into a prompt** in an attempt to articulate every possible rule the LLM should follow for a particular task. **We do not recommend this.**」

同一篇给出的正面原则是「find the **smallest possible set of high-signal tokens** that maximize the likelihood of some desired outcome」，以及 system prompt 应处在「right altitude」——「specific enough to guide behavior effectively, yet flexible enough to provide the model with strong heuristics」。同文还直接引用了 context rot 并解释机制：transformer 是 n² 关系，「as its context length increases, a model's ability to capture these pairwise relationships gets stretched thin」，模型有「attention budget」。

来源：[Effective context engineering for AI agents, Anthropic](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)

**【A｜实证】InFoBench（ACL 2024 Findings）：把复杂指令拆成子约束来评分，揭示「整体满足」远低于「单项满足」。**

500 条指令 / 2250 个分解问题，提出 DRFR（Decomposed Requirements Following Ratio）指标。价值在于方法论：**它证明了「模型看起来做到了」和「逐条核对都做到了」是两件事**，这与本仓库用 CDP 实测 5 项的做法同源，可作为该方法论的外部背书。

来源：[InFoBench, ACL 2024 Findings](https://aclanthology.org/2024.findings-acl.772/)

### 1.3 本问题的诚实结论

- **「具体色值/字体名/结构约束提升保真度」：有间接实证支持，但无直接研究。** 可引用的最强表述是：「Design2Code 显示颜色是生成网页最不可靠的维度（比文字低 14–32 分）；Sci Rep 显示 hex 是模型的原生记号（r=0.84 vs 颜色词 0.79）；一个 n=1 对照实验显示给 Token 后自行发明色值从 19 降到 0。三条方向一致，但都未直接测量『提示词里写 hex 是否提高 HTML 输出的色值命中率』。」
- **「约束过多降低遵循率」：有直接实证。** FollowBench 的 CSL≈3、IFScale 的密度衰减曲线、Prompt Design at Scale 的 N=80 崩塌，三条独立证据。
- **「结构约束（我有 N 个条目就排 N 个）」：未找到实证，仅有观点。** 检索未命中任何研究专门测试过「条目数量显式给定」对版面空洞的影响。这条目前只能作为设计假设，需靠自家 30 案实测补证。

---

## 2. 问题二：长提示词 vs 短提示词——超过某长度后遵循度下降吗？有阈值或曲线吗？

**结论：有，而且证据质量很高。但要注意区分三个不同的自变量：①token 长度 ②约束条数 ③约束难度。对本任务而言，②和③是风险，①不是。**

### 2.1 token 长度：衰减真实存在，但阈值远在 1200 字之上

**【A｜实证】Lost in the Middle（TACL 2024 / arXiv 2307.03172）：U 形曲线，中间最差。**

原文摘要：「performance is often highest when relevant information occurs at the **beginning or end** of the input context, and **significantly degrades** when models must access relevant information in the **middle** of long contexts. Furthermore, performance **substantially decreases as the input context grows longer**, even for explicitly long-context models.」

对本任务的直接含义：**7 段结构里第 4–5 段（结构约束、防退化）正好落在「中间」**。这是本报告给出「顺序重排」建议（§8 建议 3）的直接依据。

来源：[Lost in the Middle, arXiv:2307.03172](https://arxiv.org/abs/2307.03172)

**【A｜实证】Context Rot（Chroma 技术报告，2025-07）：18 个模型，长度增加则性能非均匀下降。**

关键设计与结论：
- 刻意**固定任务难度、只变输入长度**，排除「长=难」的混淆。
- 结论一：「Across all experiments, model performance consistently **degrades with increasing input length**.」
- 结论二：**干扰项（distractors）的影响随长度放大**——「Even a single distractor reduces performance relative to the baseline」。
- 结论三（反直觉但可引用）：「structural coherence **consistently hurts** model performance」——打乱句序的 haystack 反而表现更好。含义：**结构化的长清单不一定比散乱文本更容易被遵循**。
- 结论四（对「8 条否定清单」最致命的一条）：「what matters more is **how that information is presented**」，并明确提出「context engineering」。

来源：[Context Rot: How Increasing Input Tokens Impacts LLM Performance, Chroma](https://research.trychroma.com/context-rot)
中文解读（可作二次引用）：[百万 Token 上下文并不可靠？Chroma 揭秘大模型「上下文腐烂」真相](https://cloud.tencent.cn/developer/article/2652203)

**【A-｜预印本】Prompt Design at Scale（arXiv 2607.19257, 2026-07，单作者）：给出了具体的长度阈值。**

这是本报告找到的**唯一给出「recall 随 token 长度」具体拐点**的研究：2k→512k token 的阶梯，五种模型。

- 「Recall stays near ceiling through **64–128k tokens**, then degrades sharply and format-dependently: one model's accuracy spread reaches **48 points at 128k tokens**.」
- 上下文接近上限时，上升的不是幻觉而是**直接拒答**（0% → 79–90%）。
- 幻觉率极低（0/5,760 probes），谄媚率 ≤8.3%。

**对本任务**：1200 字 ≈ 1.5k token，距离 64k 拐点还有 40 倍余量。**「提示词太长导致模型记不住」这个担心，在本任务的量级上不成立。**（但该文只有一个作者、未经同行评审，引用时应注明。）

来源：[Prompt Design at Scale, arXiv:2607.19257](https://arxiv.org/abs/2607.19257)

### 2.2 约束条数：这才是真正的悬崖，且阈值低得惊人

**【A｜实证】IFScale（arXiv 2507.11538，NeurIPS 2025 有收录）：500 条约束、20 个模型，最好的也只有 68%。**

设计：让模型写一份商业报告，同时塞进 N 条「必须出现某个词」的指令，N 从 10 到 500、步长 10、5 个随机种子。关键数字：

| 模型 | 10 条 | 50 条 | 100 条 | 250 条 | 500 条 |
|---|---|---|---|---|---|
| gemini-2.5-pro | 100% | 99.6% | **98.4%** | 84.8% | **68.9%** |
| claude-3.7-sonnet | 100% | 99.6% | 94.8% | 72.9% | 52.7% |
| claude-sonnet-4 | 100% | 98.0% | 94.4% | 77.2% | 42.9% |
| gpt-4.1（线性衰减） | — | — | — | — | 低位 |
| claude-3.5-haiku（指数衰减） | 98.0% | 78.0% | 43.4% | 16.6% | 8.5% |

三条可直接用的结论：
- **三种衰减形态**：threshold decay（推理模型：100–250 条之前几乎不掉，之后陡降）、linear decay（gpt-4.1、claude-3.7-sonnet）、exponential decay（gpt-4o、llama-4-scout、claude-3.5-haiku）。
- **首因效应（primacy）在 150–200 条处达到峰值**：「Instructions not found are counted as omission errors... they start low at minimal instruction densities... **peak around 150–200 instructions**, then level off」。即**约束越多，越倾向忽略后半段**——这正是「约束太多导致模型忽略后半段」的直接实证。
- **失败形态是「整条丢弃」而不是「做错」**：在高密度下 omission:modification 比值可达 34.88（llama-4-scout）。对本任务的含义：模型更可能**完全不做某条防退化规则**，而不是做得不彻底。

来源：[IFScale, arXiv:2507.11538](https://arxiv.org/abs/2507.11538)　交互式榜单：[distylai.github.io/IFScale](https://distylai.github.io/IFScale/)

**【A-｜预印本】Prompt Design at Scale：N=80 是硬墙。**

「Experiment 1 (960 calls/model) measures instruction-following decay as rule count N grows from 10 to 160... **Perfect-response rate collapses to zero by N=80 for every model, format, and placement.**」另外「No model shows a reliable markdown advantage」——即**用 Markdown 分节并不能救回遵循率**（这条对「用标题分 7 段」是个负面提示，但注意它测的是 160 条规则的极端场景）。

来源：[Prompt Design at Scale, arXiv:2607.19257](https://arxiv.org/abs/2607.19257)

### 2.3 约束难度：同样的「条数」，价格差 3 倍

**【A｜实证】Order Matters（arXiv 2502.17204）：位置偏差存在，且「先难后易」更好；不同类型约束的遵循率差 3 倍。**

这是对 §2.2 最重要的补充。该文把约束分 8 类，实测各类遵循率（LLaMA3-8B-Instruct，单轮推理，n=7）：

| 约束类型 | 遵循率区间 |
|---|---|
| Content（内容） | 72.9 – 81.2% |
| Format（格式） | 71.1 – 79.1% |
| Keywords（关键词） | 68.5 – 77.6% |
| Startend（首尾） | 57.4 – 63.5% |
| ChangeCase（大小写） | 49.0 – 59.2% |
| **Punctuation（标点）** | **23.3 – 53.1%** |
| **Length（长度）** | **27.5 – 30.3%** |
| **Language（语言）** | **28.2 – 67.1%** |

**这是本报告最有操作价值的一张表**：本任务里的「色值 / 字体名 / 圆角 / 线宽」全部属于 **Format 类（71–79%）**，是相对最容易被执行的一类；而最难的三类（长度、语言、标点）本任务基本不涉及。所以 FollowBench 的 CSL≈3 不能直接套——**但也不能因此乐观到认为 20 条没问题**，因为约束之间会互相竞争注意力。

同文的第二个结论：**「LLMs are more performant when presented with constraints in a 'hard-to-easy' order」**，且该偏好跨架构、跨参数量、跨约束数量都成立。性能波动幅度：LLaMA3-8B 约 7%、Qwen2.5-7B 约 5%（极值情形）。

来源：[Order Matters: Investigate the Position Bias in Multi-constraint Instruction Following, arXiv:2502.17204](https://arxiv.org/abs/2502.17204)

### 2.4 本问题的诚实结论

| 自变量 | 有无实证阈值 | 对 1200 字提示词的风险判断 |
|---|---|---|
| token 长度 | **有**：64–128k token 才开始陡降 | **无风险**（1.5k token，余量 40×） |
| 约束条数（简单约束） | **有**：推理模型 100–250 条、非推理模型 50 条就开始掉 | **低风险**（约 20 条，在阈值内） |
| 约束条数（混合难度） | **有**：FollowBench CSL≈3（GPT-4） | **中高风险**（20 条 > 3 条，但本任务约束偏 Format 类） |
| 约束位置 | **有**：U 形曲线 + 首因峰值在 150–200 条 + 先难后易更优 | **中风险**（第 4–5 段落在中间） |

**一句话**：不要把「1200 字」当成问题去砍；要砍的是**约束条数**，要调的是**约束顺序**。

---

## 3. 问题三：具体 hex 色值 vs 语义描述（"暖米色" vs "#E4DECD"），哪个更可靠？为什么？

**结论：在生成网页/CSS 这个场景下，hex 更可靠，且理由不是「更精确」，而是「hex 在模型的训练分布里」。三条证据方向一致。**

### 3.1 为什么 hex 更可靠（机制层面）

1. **【A｜实证】hex 是原生记号，颜色词是翻译结果。** Sci Rep 那篇的核心归因已引：模型颜色知识「much more heavily based on hex-codes as these are very common in HTML documents」。也就是说，`#E4DECD` 是模型在 HTML/CSS 语料里见过的 token 序列，而「暖米色」需要先映射到一个色值再映射到 CSS——**两次有损转换，且映射不稳定**（同文实测：把 hex 换成 CIELAB 坐标后，GPT-4 的颜色命名表现变差）。r 值：hex 0.84 > HTML 颜色名 0.79 > 词联想 0.53。
   来源：[Sci Rep 14:21445](https://pmc.ncbi.nlm.nih.gov/articles/PMC11399123/)

2. **【A｜实证】颜色是生成网页时最不可靠的维度。** Design2Code 的 Color 分项：GPT-4o 84.1、GPT-4V 73.3、Claude 3 Opus 71.4、Gemini 1.0 Pro Vision 66.2，而同表 Text 分普遍 94–98%。**即模型不是「不会抄颜色」，是「抄得比文字差得多」**——这恰恰说明需要更强的约束形式来补偿，而不是放宽。
   来源：[Design2Code, NAACL 2025](https://aclanthology.org/2025.naacl-long.199/)

3. **【A-｜预印本】即便专门训练，hex 精确控制也需要对齐。** Paint Anything 指出基础文生图模型对色彩只有「partial understanding」，必须用 500K 数据 + RGB 对齐才能把 24-bit hex 变成稳定的 prompt-following 行为。推论：**通用 LLM 生成 CSS 时，hex 会被「大致执行」而不是「精确执行」**——这解释了为什么 1/30 的实测能全对，但不能假设 30/30 都能。
   来源：[Paint Anything, NeurIPS 2026](https://neurips.cc/virtual/2026/loc/atlanta/poster/149500)

### 3.2 一个更强的做法：不要只给 hex，给「可复制的声明块」

**【B｜官方文档】v0 的 Design Systems 2.0 明确用 hex token + 「无法验证就不许用」的硬规则。**

v0 官方文档里，设计系统的外观色就是这样声明的（原文 YAML）：

```yaml
metadata:
  v0.kind: design-system
  v0.design-system:
    appearance:
      light:
        background: "#E6F4FF"
        foreground: "#002A3A"
      dark:
        background: "#004052"
        foreground: "#E6F4FF"
```

更关键的是这条原则（原文）：「v0 grounds itself in the real source. **If a component, prop, or token cannot be verified from the sources, v0 should not use it.**」——即平台层面对「不许自行发明 token」的支持。
来源：[Design Systems 2.0, v0 Docs](https://v0.app/docs/design-systems-2)

**【C｜单案例实测】** 同一思路的实测效果（19→0 个自创色值）与那句关键提示词：「use only the tokens, components, and spacing defined in the system. **do not introduce new colors, radii, or font sizes**. if the system doesn't cover something, **stop and ask** instead of inventing it.」作者特别指出「『请询问』这个要求真正起了作用：它将模型自动填补空白的本能，转变为主动标记问题的本能」。
来源：[优设, 2026-07-18](https://www.uisdc.com/claude-code-design-system)

**这给出一条具体的改造方向**：现在的写法是「配色只用这几个值：#A、#B、#C」。可以改成「先输出一个 `:root{--bg:...;--fg:...}` 块，然后全站只允许 `var(--*)`」。前者是「一句话里塞 3 个 hex」，后者是「先把 token 固化，再引用」——后者更接近 v0 验证过的形态。

### 3.3 反面：什么时候语义描述更好？

**未找到实证支持「语义描述在网页生成中优于 hex」。** 只找到两条相关的**观点**（【D】级，不作为依据）：
- 过度精确的 hex 在**跨模型/跨版本**时可能出现「模型微调色值到它认为更协调的值」的行为，但这是社区观察，无对照实验。
- 语义描述在**图像生成**（非代码）中的优势有讨论，但同样缺少本任务可用的对照数据。

**诚实结论：就本任务而言，没有理由把 hex 换成语义词；但有理由把「散落在句子里的 hex」改成「独立的 token 声明块」。**

---

## 4. 问题四：负面指令有效性——8 条「不要 X」会不会反而引发 X？

**结论：会，而且证据比预想的强。但「引发」的具体机制在图像生成和文本遵循里不同，需要分开说。这对 8 条清单的处置建议是：改写，不是保留，也不是删除。**

### 4.1 图像生成领域：有直接的「反向激活」实证

**【A｜实证】Understanding the Impact of Negative Prompts（ECCV 2024）：负面提示词在早期施加，会**真的生成**被禁止的物体。**

这是本报告找到的、对「别想大象」效应最强的实证。作者发现两个机制：

1. **Delayed Effect（延迟生效）**：负面提示词的注意力要到第 8 步才对准目标区域，而正面提示词第 4 步就对准了。「the negative prompt has to **wait for the target object** specified in the positive prompt to appear before it can attend to it.」
2. **Reverse Activation（反向激活）**——原文：「introducing a negative prompt in the early stages of diffusion **paradoxically results in the generation of the specified object** in the initial generation stage.」举例：把 "Glasses" 作为负面提示词只施加在前 3 步，最终输出里**出现了眼镜**；而不加负面提示词时眼镜根本不会出现。
3. 机制解释：**Inducing Effect**（负面提示词会把正面噪声朝「该物体方向」推）+ **Momentum Effect**（相邻步噪声余弦相似度前 25 步高达 99.5%，方向一旦被推动就会保持）。
4. 实用结论：负面提示词应该**在中段施加**（论文取 5–15 步），过早施加「can disrupt the layout of an image that has not yet been fully formed」。

来源：[Understanding the Impact of Negative Prompts: When and How Do They Take Effect?, ECCV 2024 / arXiv:2406.02965](https://arxiv.org/abs/2406.02965)

**⚠️ 必须标注的类推边界**：这是**扩散模型的潜空间机制**，不是 LLM 的 token 生成机制。LLM 没有「负面条件分支」这种东西。**不能直接说「所以你的 8 条不要 X 会生成 X」**。它的价值是：证明「否定式条件在生成系统里可能产生与意图相反的效果」是一个**已被实验证实的真实现象**，不是都市传说。

### 4.2 文本/指令遵循领域：有「否定被当肯定」的实证，但任务不同

**【A-｜预印本】When Prohibitions Become Permissions（arXiv 2601.21433）：16 个模型、14 个伦理场景，否定式表述被反向理解。**

核心数字：
- 开源模型：肯定式 24% 认同 → **简单否定 77% 认同 → 复合否定 100% 认同**（相对增幅 317%）。
- 商用模型：极性摆动 **19% – 128%**（Gemini-3-Flash 为 0，Claude-Haiku-4.5 为 0.71）。
- 模型间一致率：肯定式 74% → 否定式 **62%**。
- 确定性解码（T=0）下敏感性反而**上升 16%**——排除采样噪声，说明是结构性缺陷。
- 推理模式有帮助但不够：Grok-4.1-reasoning 相比 non-reasoning 降低 52%。

来源：[When Prohibitions Become Permissions: Auditing Negation Sensitivity in Language Models, arXiv:2601.21433](https://arxiv.org/abs/2601.21433)

**⚠️ 类推边界**：这是**伦理判断题**（"should he rob the store" vs "should he **not** rob the store"），不是「生成代码时别用紫蓝渐变」。它证明的是「模型对否定算子的语义处理不可靠」，而不是「说到渐变就会用渐变」。而且该文 DOI/ISBN 是占位符，明显是未定稿预印本，**只能降权引用**。

**【A｜实证】Negation: A Pink Elephant in the LLMs' Room?（arXiv 2503.22395）：否定确实是系统性弱点，但比想象中可救。**

这篇的贡献是**修正了过度悲观的叙事**：「Contrary to previous work, we show that **increasing the model size may improve** the models' ability to handle negations」，且否定鲁棒性是**语言相关**的（英语这种固定语序的投影语言表现好于德语/捷克语），**前提的长度和显式程度**也有影响。
来源：[arXiv:2503.22395](https://arxiv.org/abs/2503.22395)

**【A｜实证】DIM-Bench（ACL 2025）：模型会被「看起来像指令的输入」带偏。**

论文定义「instructional distraction」：当输入文本本身长得像指令时，「even the most advanced LLMs are susceptible... often failing to accurately follow user intent」。**对本任务的启示是间接的**：8 条否定规则本身就是「一串看起来像待执行动作的短语」（"不要紫蓝渐变" 里含 "紫蓝渐变" 这个高显著度词组），它们可能被模型当成「要包含的要素」而非「要排除的要素」。
来源：[LLMs can be easily Confused by Instructional Distractions, ACL 2025 / arXiv:2502.04362](https://arxiv.org/abs/2502.04362)

### 4.3 工程侧共识：改写为正向，但保留「可 grep 的否定边界」

**【B｜官方文档】** Anthropic 的 prompt engineering 文档有一条被广泛引用的原则：「Tell Claude what to do instead of what not to do.」（原文档链接在多次重定向后未取得正文，**故按【B】但标注未直接核验原文**；该原则在多篇二手资料中被一致转述。）

**【D｜观点，但内部逻辑自洽且给出了可检验判据】** 一篇系统整理「指令极性」的工程文档给出了比「一律正向」更细的规则，值得采纳为设计原则（**注意：这是观点，不是实证**）：

> 「A negative instruction demands **suppression**: the model holds the prohibited action in mind while choosing not to take it. A positive instruction demands **execution**... The gap is small with a handful of rules and **compounds as instruction count grows**. **Negative rules degrade first under a large set** — the suppression signal competes with a rising tide of execution targets.」

以及三条「该保留否定式」的例外，正好可以拿来给 8 条分类：
- 可接受空间大到无法枚举（"Do not modify infrastructure files"）；
- 禁令是绝对的、正向表述会有歧义（"Never push directly to main"）；
- 只点名一个具体禁用项（"No `console.log` in production code"）。

以及一条非常有用的判据：**「A negative constraint is binary and greppable」**——「Write concisely」需要人来判断，「No 'in this guide'」可以用 grep 检查。**「If a constraint can't be expressed as a deterministic check, it probably belongs in the positive half instead.」**

来源：[Say What To Do, agentpatterns.ai](https://learn.agentpatterns.ai/prompt-engineering/say-what-to-do/)（CC BY 4.0，明确标注为教学材料而非研究）

### 4.4 对这 8 条意味着什么：逐条处置建议

**结论：不应保留原样，也不应删除。应该按「是否可机械检验」二分：可检验的保留否定式并前置；不可检验的改写为正向目标。**

| # | 现文 | 可否 grep/肉眼机械检验 | 建议处置 |
|---|---|---|---|
| ① | 不要紫蓝渐变、#6366F1、蓝紫光斑 | **可**（查 `linear-gradient` + 具体 hex） | **保留否定式**，并升级为可检验断言：「CSS 中不得出现 `#6366F1`/`#8B5CF6`/`#A78BFA` 任一值，不得出现含 blue→purple 的 `linear-gradient`」。理由：这是「点名一个具体禁用项」的例外情形 |
| ② | 不要圆角卡片配柔和外投影 | 半可（可查 `border-radius>0` + `box-shadow` 同时出现） | **改写为正向**：「卡片一律 `border-radius:0`；分隔用 1px 实线，不用 `box-shadow`」。理由：正向表述可直接执行，且与视觉硬约束第 3、4 条合并可减 1 条 |
| ③ | 不要居中大标题 + 副标题 + 两个并排 CTA | 半可（可数首屏 CTA 数量） | **改写为正向 + 可数断言**：「首屏只允许 1 个主要按钮；标题靠左（`text-align:left`）；不设并列 CTA 容器」 |
| ④ | 不要三条等宽 feature 卡片 | **可**（数 `grid-template-columns: repeat(3`） | **保留但改为可数**：「feature 区不得使用 `repeat(3, 1fr)`；若必须并列，用不等宽（如 `2fr 3fr 2fr`）或单列错位」 |
| ⑤ | 不要 emoji、彩色 iconfont、扁平插画 | **可**（扫 Unicode emoji 区段 / `<i class=`） | **保留否定式**（属于「点名具体禁用项」），但补正向替代：「图标位用文字、编号或 CSS 绘制的几何形状」 |
| ⑥ | 不要玻璃拟态、毛玻璃、半透明浮层 | **可**（查 `backdrop-filter`） | **保留否定式 + 补正向**：「层级用 1px 边框和底色差表达，不用 `backdrop-filter`/`opacity<1` 的浮层」 |
| ⑦ | 不要暗底发光字、霓虹色、扫描线 | **可**（查 `text-shadow` + 高饱和 hex） | **保留否定式**（点名具体项），补正向：「文字对比靠字重与字号，不靠 `text-shadow`」 |
| ⑧ | 不要自动轮播、滚动视差、卡片翻转 | **可**（查 `setInterval`/`requestAnimationFrame`/`transform:rotateY`） | **保留否定式**（绝对禁令，正向表述会有歧义），并前移到最前 |

**净效果**：8 条 → **5 条保留否定式（且全部升级为可机械检验的形式）+ 3 条改写为正向**，总条数不增。同时把 ② 与视觉硬约束 3/4 合并，可再省 1 条。

**为什么「保留 5 条否定式」是安全的**：§4.3 的三条例外恰好覆盖它们；而且 §4.1 的反向激活实验的适用条件是「负面条件在生成早期施加」——CSS 生成没有这种时序机制，属于**跨机制类推，风险较低**。真正的风险是 §4.2 那类「否定算子语义处理不可靠」，而缓解手段是**把否定项写成具体字面量（`#6366F1`、`backdrop-filter`）而不是概念（「紫蓝」「玻璃」）**——字面量不需要理解否定算子，只需要字符串不出现。

---

## 5. 问题五：模型自检（「验收三问」）有证据支持吗？

**结论：分三种情形，证据完全不同。①「让模型自己想想有没有做错」——有实证表明会变差；②「让模型逐条回答可验证的问题」——有实证表明有效；③「让模型对照截图自我修正」——实证表明基本无效。**

### 5.1 反面：内在自我纠错会降低性能

**【A｜实证】Large Language Models Cannot Self-Correct Reasoning Yet（ICLR 2024）。**

原文摘要：「our research indicates that LLMs **struggle to self-correct their responses without external feedback**, and at times, their performance **even degrades** after self-correction.」关键限定词是 **"without external feedback"**——即「靠自己再想一遍」不行。该文投 ICLR 2024，是这一结论的标准引用源。
来源：[arXiv:2310.01798](https://arxiv.org/abs/2310.01798)

**【A｜实证】Is Self-Repair a Silver Bullet for Code Generation?（ICLR 2024）：代码自修的收益「modest、不稳定、有时不存在」。**

原文摘要：「when the cost of carrying out repair is taken into account, performance gains are often **modest**, vary a lot between subsets of the data, and are **sometimes not present at all**.」作者归因：「self-repair is **bottlenecked by the model's ability to provide feedback on its own code**」；用更强模型提供反馈后收益才显著变大。
来源：[arXiv:2306.09896](https://arxiv.org/abs/2306.09896)

**【A｜实证】Design2Code 的 self-revision 实验：视觉自修基本无效。**（已在 §1.1 引用，此处作为独立证据重申）
- GPT-4V：Block 85.8→88.8、Position 80.5→81.1（**有改善**）
- GPT-4o：Block 93.0→92.7、Color 84.1→83.3（**变差**）
- Gemini 1.0 Pro Vision / LLaVA / DeepSeek-VL / Idefics2：**全部无改善或大幅变差**（Idefics2 Block 46.7→12.3）
- 作者结论：「few can self-revise their generation」，且「self-revision needs the model to understand the differences between the two given images... which is **harder** than leveraging text augmentation」

### 5.2 正面：把「自检」改造成「独立验证问题」就有效

**【A｜实证】Chain-of-Verification（CoVe）：先起草 → 独立生成验证问题 → **独立回答**这些问题 → 输出最终答案，显著降低幻觉。**

关键设计在于**独立性**：「plans verification questions to fact-check its draft; answers those questions **independently so the answers are not biased by other responses**」。即验证阶段不能看到自己刚写的东西，否则会自我确认。
来源：[Chain-of-Verification Reduces Hallucination in Large Language Models, arXiv:2309.11495](https://arxiv.org/abs/2309.11495)

**这三条合起来给出了明确的设计规则**：
- 「做完自己看看像不像」= §5.1 的失败模式（无外部反馈的内在自省）。
- 「逐条回答一个可验证的具体问题」= §5.2 的成功模式。

### 5.3 现有「验收三问」的逐条评估

| 现文 | 属于哪一类 | 评估 |
|---|---|---|
| 1.「拿远半米看：整页像不像那个气质？像落地页就重做」 | 无外部反馈的主观自省 | **最弱的一条**。这正是 §5.1 证明会失效的形态。而且「气质」无法被模型自身验证（它没有眼睛）。建议：改成可判定的二选一，或干脆删除（由人来看） |
| 2.「随便挑一条内容：首屏、卡片、页脚上的编号是不是同一串？」 | **可独立验证的具体问题**（抽取三处字符串比对） | **最强的一条**，符合 CoVe 形态。建议保留，并升格为「先输出三处编号的字面值，确认相同，再输出 HTML」 |
| 3.「扫一眼：有没有圆角、影子跑到纸外、发光字、表情图标、两个主按钮？」 | 半可验证（5 个子项都可 grep，但「扫一眼」的执行形式是主观的） | **中等**。建议拆成 5 个 yes/no 断言并**要求写出实际值**，而不是「扫一眼」 |

**核心改造**：把「验收三问」从「做完检查」改成「**输出前先声明 5 个实际值**」。因为模型在生成 HTML 之后再去「回顾」属于内在自省（§5.1 会失效），但在生成之前先写下 `--bg:#...`、`font-family:...`、`border-radius:0`、`编号串:...` 再照着写，属于**可验证的约束声明**（§5.2 的形态）。这个改动成本极低（加一个 5 行输出块），但性质完全不同。

---

## 6. 问题六：v0 / Claude Artifacts / ChatGPT / Cursor 在「生成完整单文件 HTML」上的已知限制与最佳输入形态

### 6.1 v0（Vercel）

**【B｜官方文档】v0 的 Text Prompting 页给出的偏好非常明确，且与本任务方向一致：**

官方列出的 Best Practices（原文小标题 + 例子）：
- **Be Specific**：「The more specific your prompt, the better the results. Include details about functionality, **design preferences**, and technical requirements.」反例 "Make a website" vs 正例「Create a portfolio website for a freelance designer with hero section, projects showcase, contact form, and responsive design」。
- **Break down complex tasks**：「Large, complex applications are better built incrementally. This approach reduces errors...」
- **Specify UI/UX preferences**：「Include design preferences to get results that match your vision. Consider factors like color schemes, layout preferences...」例：「Design a minimal, dark-mode interface with mobile-first responsive layout」。

**对本任务的关键含义（限制）**：v0 的官方工作流是 **React/Next.js + Tailwind 的组件化**，而不是「单个完整 HTML 文件」。文档里所有模板都是 "Create a header component"、"Build a dashboard widget" 这种粒度。**要求 v0「只给一个单文件 HTML、不引框架、CSS 内联」是在逆着它的默认形态走**——这条路技术上能走通（v0 支持自定义模型与 instructions），但属于非主路径，退化风险高于 ChatGPT/Claude。

来源：[Text Prompting, v0 Docs](https://v0.app/docs/text-prompting)　[Design Systems 2.0, v0 Docs](https://v0.app/docs/design-systems-2)　[Choosing models, v0 Docs](https://v0.app/docs/model-picker)

**【B｜官方文档】v0 的 token 约束机制**：「If a component, prop, or token cannot be verified from the sources, v0 should not use it.」以及 `v0.json` 最多 3 个 reference source、设计系统存为 skill。**这提示一个更强的输入形态：与其在提示词里罗列 hex，不如给一个可被当作「source」的最小 token 文件。**

### 6.2 Claude Artifacts

**【B｜官方文档】Artifact 的触发判据，直接约束了「单文件 HTML」这条路：**

官方列出 Claude 创建 artifact 的条件（原文）：
- 「It's **significant and self-contained**, typically **over 15 lines**.」
- 「It's something you're likely to want to edit, iterate on, or reuse outside the conversation.」
- 「It **stands on its own** without needing extra context from the conversation.」
- 「It's content you're likely to refer back to or use later.」

且明确列举 artifact 可以是「documents, code snippets, **single-page websites**, images, diagrams and flowcharts, dashboards, and small interactive tools」，并支持「Designs export as a .zip, PDF, PowerPoint, or **standalone HTML**」。

**对本任务的含义**：
- **「单个完整 HTML 文件」是 Artifacts 的原生形态**，不是逆向使用。这是 ChatGPT/v0 都不具备的优势。
- 「stands on its own / 不需要额外上下文」这条要求，反过来支持「提示词必须自包含」——而当前 7 段结构恰好是自包含的，这是它的优点。
- ⚠️ **检索中未找到任何官方文档给出「单文件 HTML 的推荐行数/字节上限」**。网上流传的「20 行/300 行」阈值**未能在官方文档中核实**，本报告不予引用。

来源：[What are artifacts and how do I use them?, Claude Help Center](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)

### 6.3 ChatGPT

**未找到官方文档描述「单文件 HTML 的偏好输入形态」。** 检索到的 OpenAI Help Center canvas 条目在抓取时返回 403，未能核验正文，**故不对 ChatGPT 作任何具体断言**。可确认的只有：Canvas 是一个可迭代的编辑界面，与本任务的「一次性输出单文件」不是同一工作流——但这属于印象，不是文档结论，标注为**未证实**。

### 6.4 Cursor

**【B｜官方文档】Cursor Rules 的机制说明了「约束应该放哪里」：**

- 「When applied, rule contents are included **at the start of the model context**.」（即：规则是**前置**注入的，不是附在末尾）
- 四种 rule type：Always Apply / Apply Intelligently / Apply to Specific Files / Apply Manually。
- `alwaysApply: true` 时「Always included. Globs and description are ignored.」
- 官方示例里就包含这类恒久约束：「Never modify generated files in the `dist/` or `build/` directories」。

**对本任务的含义**：如果用户是在 Cursor 里用（而不是直接粘给聊天框），那么**把 5 条视觉硬约束做成 `.cursor/rules/*.mdc`（alwaysApply）比塞进提示词更可靠**——因为它绕过了「长提示词中间段被忽略」的问题（§2.1）。这是一个成本低、收益明确的替代路径，值得在 UI 上提示。

来源：[Rules, Cursor Docs](https://cursor.com/docs/rules)

### 6.5 四平台对照小结

| 平台 | 单文件 HTML 是否原生 | 官方描述的偏好输入 | 主要限制 |
|---|---|---|---|
| **Claude Artifacts** | **是**（"single-page websites"，可导出 standalone HTML） | 自包含、>15 行、无需额外上下文 | 未找到行数上限官方说明 |
| **v0** | 否（默认 React/Next + Tailwind 组件） | 具体、拆解、明确 UI/UX 偏好、给 design system source | 单文件+无框架是逆默认形态 |
| **ChatGPT** | 未证实 | **未找到官方文档** | — |
| **Cursor** | 是（但需项目上下文） | rules 前置注入；`alwaysApply` | 需要项目文件系统，非「粘一句话」场景 |

**可执行结论**：当前 UI 文案「粘给 ChatGPT / Claude / v0 都行」**不够准确**。按证据，应改为「**Claude / Cursor 优先**（单文件 HTML 是它们的原生形态或可前置注入）；v0 需要先说明『不要用 React/Tailwind，输出单文件』」。这是一个可以直接改的文案问题。

---

## 7. 问题七：公开的 AI 建站/设计提示词库，长度、结构、社区评价

**结论：找到 3 个规模明确、结构清晰的库。共同特征是「短于本任务的 1200 字，但把设计规格写成独立的、可复制的块」——这一点与本任务的 7 段结构同源，可作为外部印证。**

### 7.1 三个库的对照

| 库 | 规模/热度 | 组织方式 | 单条提示词的结构 |
|---|---|---|---|
| **DexZane/awesome-web-prompts** | **324 stars / 27 forks**，2026-07 创建，MIT。曾获 TiniX Trending #1（2026-10-16，awsome-lists / awsome 双榜） | 按 **Hero Section / Landing Page / Portfolio** 三类；每条 = 提示词 + 可运行源码 + 预览截图 | 未取得逐条原文（GitHub 域名在本环境不可达），**故不对其长度下断言** |
| **superdesigndev/superdesign-prompts** | **128 条**「usage-ranked, vision-curated UI design prompts（full design specs + live previews）」 | 按风格命名（如 `editorial-grid`）；每条含 SPEC + 实现细节 | **已读到一条完整样本**，见 §7.2 |
| **alchaincyf/huashu-design** | **26.2k stars / 2.9k forks**，MIT，2026-04 创建 | **84 种风格库**（带样张）+ 六候选挑三方向 + 外观账本 + 设计体检（5 维雷达：一致性/美学/细节/功能/创意） | 未取得逐条原文 |

来源：[awesome-web-prompts（TiniX 索引）](https://repo.tinix.ai/en/project/dexzane-awesome-web-prompts-0e8a4231-aef7-42a6-80bf-ed60f0e5f2e5)　[superdesign-prompts（GitHub）](https://github.com/superdesigndev/superdesign-prompts)　[huashu-design（TiniX 索引）](https://repo.tinix.ai/en/project/alchaincyf-huashu-design-7f706372-d0ec-449c-824f-0d387abeb78b)

### 7.2 一条真实的「风格提示词」长什么样（最有参考价值的样本）

以下是从 superdesign 的 `editorial-grid` 模板中摘录的结构骨架（**我读到的是镜像副本，非 GitHub 原文**，见文末核验说明）：

- **TITLE**：`EDITORIAL GRID（EDITORIAL TECH AESTHETIC）`
- **SUMMARY**：一句话气质（"high-contrast serif typography, and technical monospace accents with a muted forest green primary color"）
- **STYLE**：三款字体 + 三个 hex + 网格系统 + 缓动函数，全部写死 —— 「BACKGROUND (#F7F6F2), FOREGROUND (#1C1C1C), AND PRIMARY ACCENT (#3D7068)」「CUBIC-BEZIER(0.16, 1, 0.3, 1)」
- **LAYOUT & STRUCTURE**：逐段拆（structural grid / header nav / hero / statistics grid / text reveal / interactive workflow / use case tabs / contact form），每段给具体数值（`9vw` 的 H1、`40px` 网格、`240px` 幽灵图标、`5%` 透明度）
- **SPECIAL COMPONENTS**：给可复制代码（`.btn:hover{letter-spacing:.4em}`、`@keyframes slide`）
- **SPECIAL NOTES**：**4 条 MUST + 2 条 MUST NOT** —— 「MUST: MAINTAIN THE #F7F6F2 BACKGROUND...」「MUST NOT: USE ROUNDED CORNERS LARGER THAN 2PX」「MUST NOT: USE VIBRANT GRADIENTS」
- **IMPLEMENTATION DETAILS**：CSS 变量块（`:root{--bg:#f7f6f2;...}`）、每个组件的完整样式、动画规则

来源（我实际读取的副本）：[superdesign editorial-grid prompt.md（jsDelivr 镜像）](https://cdn.jsdelivr.net/gh/pulkitxm/claude-directory@f924b0f92c558c23115a5a011b569ddefa5dea02/templates/superdesign-editorial-grid/prompt.md)

**三条可对比的观察**：

1. **结构与本任务 7 段高度同源**：气质一句话（②）+ 硬约束 hex/字体（③）+ 结构拆解（④）+ MUST NOT 段（⑤）。**这说明 7 段结构不是拍脑袋的产物，它与社区头部库的形态一致。**这是本报告对现有设计最正面的一条结论。
2. **但它比本任务「短而密」**：整份约 900–1100 英文词，只服务**一个风格**；本任务的 1200 字要覆盖「用户业务内容 + 风格 + 结构 + 防退化 + 验收」。**信息密度上本任务更高**。
3. **它把 MUST NOT 压到 2 条**（不超过 2px 圆角、不用鲜艳渐变），而不是 8 条。这与 §4 的结论一致：**否定项应该是少数、字面化、绝对的**。

### 7.3 中文圈的另一条路径：DESIGN.md

**【D｜观点，但形态值得参考】** 优设有一篇整理「9 大要素写好 DESIGN.md」，并提到一个收录 70+ 全球品牌官网设计规范的开源仓库（苹果、SpaceX、星巴克、Nike 等）。核心主张：「DESIGN.md 是写给 AI 看的品牌设计说明书。提前把规范写好，AI 就能按照你的需求生成风格更一致的页面效果图。」

来源：[9大要素写好DESIGN.md！让AI生成的页面不再反复跑偏（优设, 2026-08-06）](https://www.uisdc.com/group/679608.html)

**与本任务的关系**：这是「把提示词外置成一份可复用文件」的思路，与 §6.4（Cursor rules）和 §6.1（v0 design system skill）指向同一个方向。**如果本仓库将来要做「导出 DESIGN.md」而不只是「复制提示词」，这条是有先例支撑的。**

### 7.4 社区评价

**未找到任何针对上述库的系统性社区评价（无对比评测、无用户满意度数据）。** TiniX 页面对 awesome-web-prompts 记录「No discussions found — We haven't indexed any recent discussions about this project on Reddit, X, or Hacker News yet」。**故不对这些库的「社区评价」作任何断言**，只能报 star 数。

---

## 8. 对这份 1200 字提示词的 5 条可执行改进建议

> 每条注明依据。按「改动成本 ÷ 预期收益」排序。

### 建议 1｜把 8 条防退化按「可机械检验性」二分：5 条保留并字面化前置，3 条改写为正向

**改什么**：按 §4.4 的表逐条改。①⑤⑥⑦⑧ 保留否定式但把概念换成字面量（`#6366F1`、`backdrop-filter`、`text-shadow`、emoji Unicode 区段）；②③④ 改写为正向可数断言；② 与视觉硬约束 3、4 合并。净条数 8→7，且把 ①⑧ 两条最关键的移到「视觉硬约束」之前。

**依据**：
- 【A｜实证】负面条件在生成早期施加会**反向激活**被禁对象（[ECCV 2024 / arXiv:2406.02965](https://arxiv.org/abs/2406.02965)）——说明否定条件机制上不可靠，但这是扩散模型结论，跨机制引用需降权。
- 【A-｜预印本】否定式表述被反向理解，商用模型极性摆动 19–128%（[arXiv:2601.21433](https://arxiv.org/abs/2601.21433)）。
- 【B｜官方文档】Anthropic 明确不建议「stuff a laundry list of edge cases into a prompt」（[Anthropic](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)）。
- 【D｜观点但给出可检验判据】「negative rules degrade first under a large set」，且「if a constraint can't be expressed as a deterministic check, it probably belongs in the positive half」（[agentpatterns](https://learn.agentpatterns.ai/prompt-engineering/say-what-to-do/)）。
- 【C｜单案例实测】外部样本 superdesign 的同类提示词只保留 2 条 MUST NOT（§7.2）。

**反证/风险**：没有实证表明「8 条否定 + 网页生成」会真的引发被禁样式。这个改动的收益是**降低「整条被丢弃」的概率**（IFScale 显示高密度下 omission 是主要失败形态），不是「避免反向生成」。

---

### 建议 2｜把「验收三问」从「做完自检」改成「生成前先声明 5 个实际值」

**改什么**：在输出 HTML **之前**，要求模型先输出一个 5 行块：

```
CHECK
bg=#xxxxxx  fg=#xxxxxx  accent=#xxxxxx
title-font=<字体名>  body-font=<字体名>  mono-font=<字体名>
radius=<实际值>  shadow=<实际值或 none>  borders=<线宽列表>
numbers=<首屏/卡片/页脚三处编号的字面值>
cta=<首屏主要按钮数量>
```

然后要求「HTML 必须与上面 5 行完全一致」。把「验收三问」第 1 问（拿远半米看气质）删除或降级为附注——模型没有眼睛，这一问无法自我验证。

**依据**：
- 【A｜实证】无外部反馈的内在自省会让性能**下降**（[ICLR 2024, arXiv:2310.01798](https://arxiv.org/abs/2310.01798)）。
- 【A｜实证】代码自修收益「modest、有时不存在」，瓶颈在「模型给自己提供反馈的能力」（[ICLR 2024, arXiv:2306.09896](https://arxiv.org/abs/2306.09896)）。
- 【A｜实证】视觉自修在多数模型上**无改善或变差**（Design2Code：Idefics2 Block 46.7→12.3）（[NAACL 2025](https://aclanthology.org/2025.naacl-long.199/)）。
- 【A｜实证】但「独立回答可验证问题」有效（CoVe）（[arXiv:2309.11495](https://arxiv.org/abs/2309.11495)）。
- 【C】「先声明 token 再实现」在实测中把自创色值从 19 降到 0，且作者归因于「stop and ask」而非「自我检查」（[优设](https://www.uisdc.com/claude-code-design-system)）。

**反证/风险**：多了 5 行输出会占用输出预算，可能压缩 HTML 长度。缓解：明确「CHECK 块不计入输出长度限制，共 5 行、不许扩写」。

---

### 建议 3｜按「先难后易 + 首尾加权」重排 7 段：把「输出要求」前移，把最易被忽略的约束放首尾，中段只留最不容易忘的

**改什么**：现在是 ①业务 ②气质 ③视觉硬约束 ④结构 ⑤防退化 ⑥验收 ⑦输出要求。建议调成：

```
①业务+目标  ②气质一句话  ③输出要求（单文件/无框架/内联）  ← 前移，格式约束最先锁定
④视觉硬约束（最关键的 3 条）  ← 靠前
⑤结构约束（N 个条目）        ← 中段，此类约束遵循率最高（Format 类 71–79%）
⑥防退化（剩下的，字面量）     ← 中段
⑦视觉硬约束复述（另 2 条）+ 验收 CHECK 块  ← 靠后，利用 recency
```

即：**格式类前置、内容类居中、最易漏的 2 条约束在开头和结尾各出现一次**。

**依据**：
- 【A｜实证】U 形曲线，首尾最好、中间最差（[Lost in the Middle, arXiv:2307.03172](https://arxiv.org/abs/2307.03172)）。
- 【A｜实证】首因效应在 150–200 条密度处达峰，即「越靠后越容易被违反」（[IFScale, arXiv:2507.11538](https://arxiv.org/abs/2507.11538)）。
- 【A｜实证】「hard-to-easy」顺序表现更好，跨架构跨规模成立；同一批约束换序可造成 5–7% 性能波动（[Order Matters, arXiv:2502.17204](https://arxiv.org/abs/2502.17204)）。
- 【A｜实证】约束类型遵循率差异巨大：Format 71–79% vs Length 27–30%（同上，Table 1）——本任务的约束恰好集中在最容易的那一档，这是可以乐观的依据。
- 【B｜官方文档】Cursor 把 rules 放在 context **开头**（[Cursor Docs](https://cursor.com/docs/rules)）。

**反证/风险**：上述顺序实验都是在「7–9 条同质约束」下做的，**没有一篇论文验证过「20 条混合约束混排 + 重复关键约束」的效果**。这是推论，需自家 A/B 验证。

---

### 建议 4｜把散落的 hex 改成「先给 `:root` token 块照抄」，并补字体 fallback 与「缺失时停下来问」

**改什么**：把

> 1. 配色只用这几个值：#A、#B、#C。不新增更多彩色。

改成：

> 1. 先把下面这个块原样放进 `<style>` 顶部，全站只允许用 `var(--*)` 引用，禁止出现任何其他色值：
> ```css
> :root{ --bg:#A; --fg:#B; --accent:#C; --line:#D; }
> ```
> 如果某个视觉需求这套 token 覆盖不到，**停下来问，不要自己调一个新色**。

字体同理：给完整的 `font-family` 栈（含中文 fallback），并加一句「若指定字体不可用，用 fallback 栈里的下一个，**不要换成 Inter/Roboto/系统默认**」（这句现有版本已有，保留）。

**依据**：
- 【A｜实证】hex 与人类判断相关性 0.84，高于颜色名 0.79、联想词 0.53；且模型颜色知识主要来自 HTML 语料中的 hex（[Sci Rep 14:21445](https://pmc.ncbi.nlm.nih.gov/articles/PMC11399123/)）。
- 【A｜实证】颜色是生成网页时最弱的一维（Color 66–84 vs Text 94–98），且文本增强对颜色无效（[Design2Code](https://aclanthology.org/2025.naacl-long.199/)）。
- 【A-｜预印本】hex 精确控制需专门对齐才稳定（[Paint Anything, NeurIPS 2026](https://neurips.cc/virtual/2026/loc/atlanta/poster/149500)）。
- 【B｜官方文档】v0 用 SKILL.md frontmatter 的 hex token + 「无法验证就不许用」（[v0 Design Systems 2.0](https://v0.app/docs/design-systems-2)）。
- 【C｜单案例实测】19→0 个自创色值，关键在「stop and ask」（[优设](https://www.uisdc.com/claude-code-design-system)）。

**反证/风险**：「不许自己调色」在某些设计上会真卡住（需要 hover 态、disabled 态、半透明遮罩）。**所以必须给出态色规则**（如「hover 用 `--fg` 降到 80% 不透明度，disabled 用 `--line`」），否则模型会为了满足约束而砍掉必要的交互反馈。

---

### 建议 5｜把总约束数压到 15 条以内，并给每条编号、要求 CHECK 块回读编号

**改什么**：现状约 20 条有效约束（视觉 5 + 结构 4 + 防退化 8 + 验收 3）。目标 15 条：
- 视觉 5 → 5（不增不减，但合并 ② 进来后仍是 5）
- 结构 4 → **3**（「首屏不要轮播图」并入防退化的 ⑧，因为它就是同一件事）
- 防退化 8 → **7**（② 与视觉 3/4 合并）
- 验收 3 → **0 条指令 + 1 个 CHECK 块**（CHECK 块是输出格式，不是约束）
- 输出要求 3 → 3

合计 **18 条**，且每条带 `[V1]…[V5]`、`[S1]…[S3]`、`[A1]…[A7]` 编号，要求 CHECK 块逐条回读（「V1 通过/不通过」）。

**依据**：
- 【A｜实证】FollowBench：GPT-4 的 CSL = 3.3，即「连续全部满足」的上限约 3 条；HSR 从 L1 84.7% 降到 L5 61.9%（[ACL 2024](https://aclanthology.org/2024.acl-long.257/)）。
- 【A｜实证】IFScale：非推理模型 50 条就开始掉，指数衰减型 50 条只有 54–78%（[arXiv:2507.11538](https://arxiv.org/abs/2507.11538)）。
- 【A-｜预印本】N=80 时完美响应率对所有模型归零（[arXiv:2607.19257](https://arxiv.org/abs/2607.19257)）。
- 【A｜实证】约束换序可造成 5–7% 波动，说明注意力是稀缺资源（[arXiv:2502.17204](https://arxiv.org/abs/2502.17204)）。
- 【B｜官方文档】「smallest possible set of high-signal tokens」（[Anthropic](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)）。

**反证/风险**：18 条仍远高于 CSL=3。但要注意 FollowBench 的 3 是**混合难度**约束的下限（其 Figure 5 显示 Style 类表现最好、Example/Mixed 最差），而本任务的约束集中在 Format 类（遵循率 71–79%）。**所以「3」不能直接当目标**，把它当「不要盲目加到 40 条」的警告更合适。

---

## 9. 本报告的自身局限（必读）

1. **29/30 未验证这件事，不是文献能解决的。** 上面所有建议都是「基于外部证据的合理推断」，**没有一条能替代本仓库自己的 CDP 实测**。最高性价比的动作仍然是：抽 5 个风格差异最大的案子 × 2 个提示词版本（现版 / 改进版）× 3 个模型，用现有 5 项实测跑一遍。这比再检索 20 篇论文有用。
2. **跨任务类推是本报告最大的方法论弱点。** Design2Code 是「截图→代码」，不是「文字描述→代码」；ECCV 负提示词是扩散模型；Negation 审计是伦理判断题。**每一处类推都在正文标注了边界，但请把它们当作「方向性证据」而非「直接证据」。**
3. **未取得的三条**：
   - ChatGPT canvas 的官方功能说明（[OpenAI Help Center 条目](https://help.openai.com/en/articles/9930697-what-is-the-canvas-feature-in-chatgpt-and-how-do-i-use-it) 抓取返回 403）。
   - GitHub 仓库正文（本环境 `github.com` / `raw.githubusercontent.com` 解析到非公网 IP，不可达）。superdesign 的提示词是通过 jsDelivr 镜像的第三方副本读到的，**不排除与原文有差异**；awesome-web-prompts 与 huashu-design 的逐条提示词**完全未读到**，只读到索引页摘要。
   - Vercel 官方博客《How to prompt v0》的正文（抓取仅得到导航，正文被截断）。
4. **未找到实证、仅有观点的三处，已在正文标明**：
   - 「结构约束（我有 N 个条目就排 N 个）」对版面空洞的影响——**零命中**。
   - 「语义描述 vs hex 在网页生成中的对比」——只有 hex 侧的间接证据，无语义侧的对照实验。
   - 各提示词库的**社区评价**——只有 star 数，无评测数据。

---

## 附：全部引用源（按证据等级）

### 【A】同行评审论文 / 有对照实验的技术报告
1. [Lost in the Middle: How Language Models Use Long Contexts (TACL 2024)](https://arxiv.org/abs/2307.03172)
2. [FollowBench (ACL 2024)](https://aclanthology.org/2024.acl-long.257/) ｜ [ar5iv 全文](https://ar5iv.labs.arxiv.org/html/2310.20410)
3. [Design2Code (NAACL 2025)](https://aclanthology.org/2025.naacl-long.199/) ｜ [ar5iv 全文（含数据表）](https://ar5iv.labs.arxiv.org/html/2403.03163)
4. [InFoBench (ACL 2024 Findings)](https://aclanthology.org/2024.findings-acl.772/)
5. [IFScale: How Many Instructions Can LLMs Follow at Once? (arXiv:2507.11538)](https://arxiv.org/abs/2507.11538) ｜ [交互榜单](https://distylai.github.io/IFScale/)
6. [Order Matters: Position Bias in Multi-constraint Instruction Following (arXiv:2502.17204)](https://arxiv.org/abs/2502.17204)
7. [LLMs can be easily Confused by Instructional Distractions / DIM-Bench (ACL 2025)](https://arxiv.org/abs/2502.04362)
8. [Understanding the Impact of Negative Prompts (ECCV 2024)](https://arxiv.org/abs/2406.02965)
9. [Negation: A Pink Elephant in the LLMs' Room? (arXiv:2503.22395)](https://arxiv.org/abs/2503.22395)
10. [Large Language Models Cannot Self-Correct Reasoning Yet (ICLR 2024)](https://arxiv.org/abs/2310.01798)
11. [Is Self-Repair a Silver Bullet for Code Generation? (ICLR 2024)](https://arxiv.org/abs/2306.09896)
12. [Chain-of-Verification Reduces Hallucination (arXiv:2309.11495)](https://arxiv.org/abs/2309.11495)
13. [Large language models predict human sensory judgments across six modalities, *Sci Rep* 14:21445 (2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11399123/)
14. [Interaction2Code (arXiv:2411.03292)](https://ar5iv.labs.arxiv.org/html/2411.03292)
15. [Context Rot: How Increasing Input Tokens Impacts LLM Performance (Chroma, 2025-07)](https://research.trychroma.com/context-rot)

### 【A-】预印本（未经同行评审，降权使用）
16. [Prompt Design at Scale (arXiv:2607.19257)](https://arxiv.org/abs/2607.19257)
17. [When Prohibitions Become Permissions: Auditing Negation Sensitivity (arXiv:2601.21433)](https://arxiv.org/abs/2601.21433)
18. [Paint Anything: Toward Any-Color Controllable Image Generation (NeurIPS 2026)](https://neurips.cc/virtual/2026/loc/atlanta/poster/149500)

### 【B】厂商官方文档
19. [Effective context engineering for AI agents, Anthropic](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents)
20. [What are artifacts and how do I use them?, Claude Help Center](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
21. [Text Prompting, v0 Docs](https://v0.app/docs/text-prompting)
22. [Design Systems 2.0, v0 Docs](https://v0.app/docs/design-systems-2)
23. [Choosing models, v0 Docs](https://v0.app/docs/model-picker)
24. [Rules, Cursor Docs](https://cursor.com/docs/rules)

### 【C】单案例实测（自报数据，n=1）
25. [别再让AI随机生图了！教你用设计系统稳定生成高一致性UI界面！(优设, 2026-07-18)](https://www.uisdc.com/claude-code-design-system) —— 2/10→9/10 合格页、19→0 自创色值、6h→40min

### 【D】观点/教学材料（不作结论依据）
26. [Say What To Do — 指令极性 (agentpatterns.ai, CC BY 4.0)](https://learn.agentpatterns.ai/prompt-engineering/say-what-to-do/)
27. [9大要素写好DESIGN.md！(优设, 2026-08-06)](https://www.uisdc.com/group/679608.html)
28. [百万 Token 上下文并不可靠？Chroma「上下文腐烂」中文解读 (腾讯云)](https://cloud.tencent.cn/developer/article/2652203)
29. [Prompt 写长了为什么效果反而变差？(腾讯云, 2026-10-21)](https://cloud.tencent.cn/developer/article/2765737) —— 面试题体裁，无数据，仅记录「中文圈存在该讨论」
30. [superdesign editorial-grid prompt.md（jsDelivr 镜像副本）](https://cdn.jsdelivr.net/gh/pulkitxm/claude-directory@f924b0f92c558c23115a5a011b569ddefa5dea02/templates/superdesign-editorial-grid/prompt.md)
31. [superdesigndev/superdesign-prompts（GitHub，128 条）](https://github.com/superdesigndev/superdesign-prompts)
32. [awesome-web-prompts（TiniX 索引，324 stars）](https://repo.tinix.ai/en/project/dexzane-awesome-web-prompts-0e8a4231-aef7-42a6-80bf-ed60f0e5f2e5)
33. [alchaincyf/huashu-design（TiniX 索引，26.2k stars）](https://repo.tinix.ai/en/project/alchaincyf-huashu-design-7f706372-d0ec-449c-824f-0d387abeb78b)

---

*报告完。全部 URL 均为检索中实际访问或实际出现在搜索结果中的地址；凡未取得正文的，已在 §9 逐条标明。*
