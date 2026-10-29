# 检索报告：把「字号 / 配比 / 色板 / 线宽」补进提示词，有证据吗？

> 检索日期：2026-10-29　检索者：检索子 Agent
> 服务对象：`buildPrompt()` / `buildStylePrompt()` 生成的约 1900 字中文提示词（30 案）
> 任务性质：**纯知识问题，不改代码**。判断「补四个维度」这个决定本身是否有外部证据支撑。
> 增量定位：`deliverables/61-research/prompt-efficacy.md`（下称 **61 号报告**）已覆盖 FollowBench / IFScale / Design2Code / Lost-in-the-Middle / 负向指令（扩散模型侧）。本报告**只写它没写的**，并在两处**挑战**它的结论（§1.4、§5.3）。

---

## 0. 证据分级、检索条件、以及三条先读结论

### 0.1 分级

| 标记 | 含义 |
|---|---|
| **【A】** | 同行评审，或有大样本 + 指标的对照实验（含 arXiv 上方法完整、样本量大的预印本，但会在文中注明「预印本」） |
| **【B】** | 有实测但样本小 / 单一数据集 / 无第三方复现 |
| **【C】** | 工程经验、官方文档、厂商声明、单案例 |
| **【D】** | 推测。「听起来合理但没证据」，**对决策无价值，本文一律标注** |
| **【✗】** | 检索后**确认不存在**该证据。这是本文最有价值的一类结论 |

### 0.2 本轮检索的实际条件（必须说明，影响可信度）

- **`web_search` 工具全程不可用**（返回 `HTTP 402 Insufficient Balance`，DeepSeek 搜索端点欠费）。因此**没有做常规网页检索**。
- Google / Brave / DuckDuckGo / Mojeek / SearX 均被拒（403、DNS 到非公网 IP、或 fetch failed）。
- 实际可用通道：**arXiv API（`export.arxiv.org/api/query`）**、**OpenAlex API**、**ar5iv 全文镜像**、**arXiv abs 页**。Semantic Scholar 全程 429。
- **这意味着**：本报告的覆盖面偏向「有 arXiv 记录的学术文献」，**工程博客、厂商 changelog、社区实测这几类【C】级材料严重缺失**。凡本文说「未找到」，严格含义是「在 arXiv/OpenAlex 可检索范围内未找到」，不等于全网不存在。

### 0.3 三条先读结论

1. **「补全四个维度」在证据上是四件性质完全不同的事，不能打包成一个决定。** 字号与配比属于「补形式规格」，色板属于「补数据但已有部分」，线宽属于「修错」。**只有「修错」有明确证据支持**（§6）。把四件事捆在一起做，等于用一件对的事给三件没证据的事背书。
2. **真正的风险不是字数，是约束条数，而当前已经越线了。** 1900 字 ≈ 2.5k token，距任何长度拐点都有两个数量级余量；但当前约 20 条有效约束，**已经落在我这轮找到的最严基准的崩塌区**（§1.2：5–6 条以上可靠遵循开始崩）。补四个维度会把约束推到 **26–32 条**，即**在一个已经超载的集合上再加 30–60%**。
3. **最反直觉的发现：写得更多不一定更准，写得「更少但结构更好」在受控实验里能反超。** 见 §1.4（under-specification 反而提升正确率）与 §4.3（长度不是预测因子）。这直接否掉了「把知道的都写进去」这个直觉。

---

## 1. Q1：规格完备性 vs 遵守率——「写得更全」一定更好吗？

**结论：不一定。「更全」在低约束区（≤5 条）几乎单调有益；在高约束区（≥7 条）会被「组合崩塌」吃掉，且崩塌是乘性的，不是加性的。当前提示词已在崩塌区。**

### 1.1【A｜预印本，但设计极硬】CSE：k=1–12，15 模型，369,753 次检查——这是本轮最重要的一篇

《Large Language Models Can Follow Instructions, But Not Many at Once: Phase Transitions in Compositional Constraint Satisfaction》（arXiv 2608.12426，2026-08，单作者，35 页，声明经 ARR 2026-05 轮审阅）。

设计与关键数字：

- 程序化生成基准，系统改变**同时生效的约束条数 k**（k=1–12），**36 类约束**，15 个模型，**369,753 次判定**。
- 评分**全部由确定性规则验证器完成，零 LLM-judge 参与**——这一点很重要，排除了「评委模型自己不稳」这个混淆。
- 三个结论（原文措辞）：

  1. **单项通过率是平缓下降的，但「全 k 条同时满足」是崩塌的。** 原文：一个「k=8 时单项通过率约 **41%**」的模型，「八条全部成功只有 **5.7%**」。
  2. **不同约束类型的衰减速度差 2 倍**：**structural（结构性）约束每增加一条损失约 2 倍于 lexical（词汇性）约束**的基线能力。作者用一个「comprehension–maintenance gap」排序：需要**持续跟踪**的约束 vs **一次性二元判断**的约束。
  3. **失败近似独立**，所以累积是**乘性**的；残余耦合来自「共享输出特征」而非两两干扰——原文举例：**句数写错，会让所有「读取句数」的约束一起失败**。

- **可直接引用的崩塌阈值**（原文）：可靠指令遵循在**超过 5–6 条同时约束**后开始崩；**最强模型在 7 条时 probe 级成功率跌破 50%**；**15 个模型里有 12 个在 3 条或更少时就跌破 50%**。

**对本任务的直接换算**：当前提示词约 20 条有效约束（61 号报告 §2 的计数），是 CSE「最强模型崩塌点（7 条）」的 **2.9 倍**，是「12/15 模型崩塌点（≤3 条）」的 **6.7 倍**。

**⚠️ 类推边界（必须一起引用）**：CSE 的约束是**程序生成的合成约束**（如「句数必须是 N」「必须包含词 X」），不是设计规格。而且它测的是**单次输出内同时满足**，本任务是「一次性生成一整个 HTML」——形式上一致（都是一次生成里多个并发约束），但约束的**语义难度**不同。设计类约束（色值、字体名）在另一条证据里属于**较易执行**的一类（61 号报告 §2.3 引 Order Matters：Format 类 71–79%）。所以 20 条设计约束的**实际**崩塌程度应低于 CSE 的 20 条合成约束。**但方向明确：约束越多，「全部满足」的概率乘性下降，这一条对本任务是成立的。**

来源：[arXiv:2608.12426](https://arxiv.org/abs/2608.12426)

### 1.2【A｜预印本】RECAST 给了一个更保守、也更贴近本任务的数字：**>10 条**

《RECAST: Expanding the Boundaries of LLMs' Complex Instruction Following with Multi-Constraint Data》（arXiv 2505.19030）。摘要原话：

> 「as the number of explicitly stated requirements increases (**particularly more than 10 constraints**), LLMs often struggle to accurately follow such instructions」

同一段还给了一个对本案有用的事实：**在 RECAST 之前，现有数据集的单实例约束数都不超过 10 条**——也就是说，「10 条」是学界做数据时默认的天花板，而本任务是 20 条。

来源：[arXiv:2505.19030](https://arxiv.org/abs/2505.19030)

### 1.3 三份阈值证据的交叉表（这张表是 Q1 的答案）

| 来源 | 崩塌起点 | 形态 | 对本任务（约 20 条）的判定 |
|---|---|---|---|
| **CSE**（2608.12426） | 最强模型 7 条；12/15 模型 ≤3 条 | 乘性崩塌（单项 41% → 全 8 条 5.7%） | **已深度越线** |
| **RECAST**（2505.19030） | 「尤其 >10 条」 | 定性 + 数据集证据 | **已越线** |
| **IFScale**（61 号报告 §2.2 已引） | 推理模型 100–250 条；非推理 50 条 | 阈值/线性/指数三种 | 未越线 |
| **FollowBench**（61 号报告 §1.2 已引） | CSL≈3（混合难度） | 连续满足上限 | 已越线 |

**怎么读这个矛盾**：IFScale 说 100–250 条才掉，CSE 说 7 条就崩。差别在**约束的独立性与难度**。IFScale 的约束是「必须出现词 X」（彼此几乎不耦合，且模型可以「顺手」塞进去）；CSE 明确用「失败近似独立 → 乘性」解释崩塌；FollowBench 的 CSL=3 是混合难度下限。

**对本任务，正确的读法是**：设计规格（色值/字体/线宽）**不属于** IFScale 那种「可顺手满足」的独立约束——它们**互相耦合**（色板约束和配比约束会打架、字号约束和线宽约束共享同一个「视觉层级」目标、线宽的 3 组互斥值**本身就是内部矛盾**）。**耦合度高 → 更接近 CSE 的情形，而非 IFScale 的情形。** 这是本文对「20 条其实还好」这一乐观判断（61 号报告 §2.4）的**修正**。

### 1.4【A｜预印本】挑战「写全就好」：**under-specification 有时反而提高正确率**

《When Prompt Under-Specification Improves Code Correctness》（arXiv 2604.24712，2026-04，10 个模型 × HumanEval + LiveCodeBench）。

这是本轮找到的、**唯一直接反驳「把规格补全」这个直觉的受控实验**：

- 同一批 under-specification 变异，**在 HumanEval 上显著降低性能，在 LiveCodeBench 上净效应接近零**——原因是 LiveCodeBench 的描述有「描述、约束、示例、I/O 约定之间的冗余」。
- 更关键的一句（原文）：「Surprisingly, we also find that prompt mutations can **improve** correctness.」机制是：under-specification 常常**打断了误导性的词汇/结构线索**（"disruption of over-fitted terminology, removal of misleading constraints, and elimination of spurious identifier triggers"），从而抵消了损失。
- 结论句：「structurally rich task descriptions can substantially mitigate the negative effects of under-specification and, **in some cases, even enhance correctness**」。

**为什么这条对本案特别重要**：本案要补的四个维度，**正好是四类"术语线索"**——「字号 1.25 倍模数」「主色 60%」「线宽 0.4/0.8px」。论文说的失败机制是「over-fitted terminology」和「misleading constraints」触发模型的**检索式套路解**（retrieval-based solution strategies）。**「60/30/10」是一个极强的套路触发词**：模型见过大量 Bootstrap/Tailwind 的 60-30-10 表述，很可能直接调用模板响应，而不是去执行你这套色板。这是**有机制解释的、针对本案的具体风险**，不是泛泛的担心。

**⚠️ 边界**：任务不同（算法题代码 vs 网页外观），指标不同（单测通过 vs 视觉相似）。它证明的是**机制存在**，不是「本案补维度一定有害」。

来源：[arXiv:2604.24712](https://arxiv.org/abs/2604.24712)

### 1.5【B】规格「缺陷类型」比「规格多少」更能预测失败

同组的《Defective Task Descriptions in LLM-Based Code Generation》（arXiv 2604.24703）给了一个关键的排序结论（原文）：

> 「the robustness of LLMs in task description defects depends **primarily on the type of defect and the characteristics of the task description, rather than the capacity of the model**, with **Under-Specification defects being the most severe**.」

即：**「没说清」（under-specification）比「说太多」更致命**。这条**支持**补规格，但注意它说的是「补到能判定」而不是「补到信息完备」——两者的区别正是本报告 §6 的核心区分。

来源：[arXiv:2604.24703](https://arxiv.org/abs/2604.24703)

### 1.6【A】「规则多了会互相稀释」有一个机制层面的旁证

《When Built-in Thinking Helps and Hurts: Constraint-Level Error Shifts in Instruction Following》（arXiv 2606.09662）在 IFEval 上做同权重 Thinking ON/OFF 对照：**聚合通过率变化很小（−0.55 到 −3.52 个百分点），但有 10–20% 的 prompt 在两种模式间从 pass 翻成 fail**，作者明确说这是「constraint-level error shifts」——**总量不变，个体互换**。

**对本案的含义**：这解释了为什么「加一条约束」的伤害**看不见**。你测总分，总分几乎不动；但具体某几条（可能是你最关键的那 3 条视觉硬约束）在被挤掉，同时另几条被满足。**用「总体像不像」来验收，结构上无法发现这种伤害。** 这与 69 号审计 §2.6 的结论（验证器自己的假阳性是最大风险）互为印证。

来源：[arXiv:2606.09662](https://arxiv.org/abs/2606.09662)

### 1.7 Q1 小结

- **「写得更全提高遵守率」：只在低约束区成立，且有反例。**
- **「存在指令过载 / 关键指令被稀释」：有直接、大样本、机制清晰的实证。**具体数字：CSE 的 7 条（最强模型）/ ≤3 条（12/15 模型）、RECAST 的 >10 条、以及「k=8 单项 41% 但全 8 条 5.7%」这个乘性崩塌。
- **【✗】没有任何研究测过「中文设计提示词补字号/配比后 HTML 保真度变化」。** 这一层永远是类推。

---

## 2. Q2：字号 / 字阶是不是 AI 生成网页的高频失误点？

**结论：这是六个问题里证据最弱的一环。我找不到任何直接证据支持「LLM 系统性把字号压小」或「只用 2–3 个字号档」。你的 6.9 档 → 2–3 档观察，外部文献既不能证实也不能证伪。**

### 2.1 先把「找不到」说清楚：我查了什么

- arXiv 全文/摘要检索：`"type scale"`、`"font-size hierarchy"`、`"typography" AND "code generation"`、`"font size" AND "web page" AND "LLM"`、`"visual hierarchy" AND "LLM" AND "web"`、`"legibility" AND "code generation"`。
- 结果：`"typography" AND "code generation"` 全库**只有 1 条**（Graphic-Design-Bench，见 2.4）；`"visual hierarchy" AND "LLM" AND "web"` 全库**只有 1 条**（UI 原则违规检测，见 2.3）；`"font size" AND "web page" AND "LLM"` **0 条**。

**这个「1 条 / 0 条」的稀疏度本身就是一个发现**：字号不是设计生成研究里的独立变量。所有主流 UI-to-code 基准（Design2Code、DesignBench、WebGen-Bench、WebSight、Web2Code）**都没有字号指标**。

### 2.2【A】DesignBench：900 个样本、9 个模型，**指标体系里没有字体/字号这一项**

《DesignBench: A Comprehensive Benchmark for MLLM-based Front-end Code Generation》（arXiv 2506.06251v3，v3 修订至 2026-03；900 个网页样本，React/Vue/Angular/vanilla 四栈，generation/edit/repair 三任务，9 个 MLLM）。

我读了全文，可以确认三件事：

1. **generation 任务的指标只有两个**：`CLIP`（整体语义相似）和 `Compilation Success Rate`。**没有任何元素级、样式级、字号级指标。**
2. **repair 任务的 6 类问题分类里，没有「字号」这一类。**6 类是：Occlusion、Crowding、Text overlap、Alignment、Color and contrast、Overflow。分布是 **Alignment 42.2% > Crowding 18.7% > Occlusion 18.1% > Overflow 11.4% > 其他**。
3. **「incorrect font sizes」只出现在标注指引的一句话里**（原文，作为「Visual inconsistencies」的例子）：「Visual inconsistencies including improper spacing, **incorrect font sizes**, or color scheme violations」。**它是一个被提及的例子，不是一个被统计的维度。**

**这为什么重要**：如果字号真是「高频失误点」，一个 900 样本、专门做前端代码生成的基准**不太可能不给它一个类别**。更合理的解读是：**在「截图→代码」这个任务里，字号错误会被 CLIP 和「Alignment / Crowding」间接吸收**（字号错了常常表现为拥挤/溢出），所以研究者没有单独拆出来。**这不等于字号不重要，但等于「字号错误没有被独立测量过」。**

来源：[arXiv:2506.06251](https://arxiv.org/abs/2506.06251) ｜ [ar5iv 全文](https://ar5iv.labs.arxiv.org/html/2506.06251)

### 2.3【B】唯一直接测「视觉层级违规」的研究：19 条原则，专门训模型才能测出来

《Learning to Detect UI Principle Violations via Reinforcement Learning》（arXiv 2607.20690，2026-07）。它把 19 条界面质量原则统一起来（来源是 WCAG 2.2 + 欺骗性设计分类 + 感知/认知/交互理论），明确把 **"poor visual hierarchy"** 列为要被检测的违规之一。

关键数字：一个 4B 视觉语言模型，经持续强化学习后 **micro-F1 从 36% 提到 84%**，19 条里 13 条超过 80% F1。

**怎么读这个 36%**：在**专门训练之前**，一个小 VLM 只能以 36% 的 micro-F1 判断「这条界面原则被违反了吗」。这是个**很低的起点**，说明这类判断（含视觉层级）对模型并不平凡。但它测的是**判别能力**，不是**生成时是否会犯**。所以它**不能**回答 Q2。

来源：[arXiv:2607.20690](https://arxiv.org/abs/2607.20690)

### 2.4【B】Graphic-Design-Bench：排版保真是「largely unsolved」，但这是图像生成不是 HTML

《Graphic-Design-Bench》（arXiv 2604.04192，2026-04，50 个任务 × 5 轴：layout / typography / infographics / template / animation）。摘要原话：当前模型在「**fine-grained typographic perception**」「faithful vector code generation」「spatial reasoning over complex layouts」上「remain largely unsolved」，且「the gap widens sharply as tasks demand precision, structure, and compositional awareness」。

**⚠️ 类推边界很宽**：这是**图形设计任务**（含图像生成、矢量），不是「HTML/CSS 生成」。它能支持的最强表述只是：**在 AI 做设计这件事上，排版精度是公认的短板方向**。它**没有**测过字号档数。

来源：[arXiv:2604.04192](https://arxiv.org/abs/2604.04192)

### 2.5 一条间接但有用的机制证据：字号对比度确实影响模型自身的判断

《Can AI Models Appreciate Document Aesthetics?》（arXiv 2403.18183）专门测了 **font-size contrast** 对文档理解模型置信度的影响（与 noise、alignment、complexity 并列四项）。这说明「字号对比」在方法上是可测、可操纵的美学变量。

**但它测的是「模型读文档时的置信度」，不是「模型写 CSS 时的选择偏好」。** 方向不对，只能当背景。

来源：[arXiv:2403.18183](https://arxiv.org/abs/2403.18183)

### 2.6 Q2 小结

- **【✗】「LLM 系统性把字号压小」：零证据。**
- **【✗】「LLM 只用 2–3 个字号档」：零证据。**
- **【✗】任何 UI-to-code 基准的字号维度：零。** 主流基准都没有这个指标。
- **【B】排版精度是 AI 做设计的公认短板方向**（Graphic-Design-Bench），但那是图像/矢量任务。
- **【A】字号没有被独立测量过**（DesignBench 的 6 类问题里没有它，指标只有 CLIP + 编译率）。

**所以「补字号」这件事：证据等级 = 你的内部观察（n=30 案，无外部对照）。它是一个好假设，但它现在是【D】。** 注意你自己的观察里有一个数字很硬——**原型 6.9 档 → 实现 2–3 档**——如果这个测量方法可复现（数 `font-size` 去重值），它比任何外部文献都更有针对性。**建议：把这个测量升级成正式指标再决定，而不是先补提示词。**

---

## 3. Q3：颜色配比比色值列表更有效吗？

**结论：没有证据。这是六个问题里唯一一个「连方向性证据都没有」的。而且反证的方向是存在的（Design2Code 的色值指标是元素级、非面积加权，意味着「配比」在这一整条研究线里不被认为是关键变量）。**

### 3.1【✗】先说结论：检索不到任何「配比说明 → 生成保真度」的实验

检索覆盖：`color proportion 60 30 10 design palette`、`"60-30-10" color rule design`、`color palette AND LLM AND generation`、`color harmony AND large language models`（**0 条**）、`color proportion design interface dominant accent`（**0 条**）。

**唯一命中的「60-30-10」相关文献**是《Energy-Efficient Web Design》（IGI Global，2025，书章）。它做的事是：**分析真实网页是否遵循 60-30-10 规则**（原文摘要：「find out whether UI principle **60-30-10 rule** is followed or not」），并把它与能耗、图像格式、字体风格一起讨论。

**这条证据的方向很容易被误读**：它证明「60-30-10 是一个被学界承认、可被检验的设计原则」。它**完全不证明**「在提示词里写 60-30-10 会让 AI 生成得更准」。前者是设计学常识，后者是我们真正要的。

来源：[Energy-Efficient Web Design, IGI 2025](https://doi.org/10.4018/979-8-3373-0766-4.ch001)

### 3.2【A】Design2Code 的 color 指标是**元素级 CIEDE2000**，不是面积配比

这一条是**反对**「配比是关键变量」的最实质证据（61 号报告已引 Design2Code，但没点出这一层）：

Design2Code 的 color 分项做法是：**逐个元素比对其前景/背景色的 CIEDE2000 色差**，然后汇总。**它不计算任何颜色的屏幕面积占比。**

**含义**：如果「配比」是网页风格保真的关键维度，一个 484 页、被广泛使用的基准**应该**会有面积加权指标。它没有。**这不构成反驳，但构成「该研究线不认为配比是主要误差来源」的信号。** 而 Design2Code 已经证明**颜色是它五个维度里最差的一项**（GPT-4o 84.1 vs Text 98.2）——**误差主要在「选错色」而不是「用错量」**，至少在该基准的度量下如此。

来源：[Design2Code, NAACL 2025](https://aclanthology.org/2025.naacl-long.199/)

### 3.3【B】唯一沾边的正面信号：调色板研究确实认为「空间分布」重要

《InfoColorizer: Interactive Recommendation of Color Palettes for Infographics》（IEEE TVCG 2021）。摘要里有一句关键的自我批评（针对既有工作）：它们「**neglect the influence of elements' spatial arrangement**」。作者的主张是：好的调色板推荐必须考虑元素的空间排布。

**这是「面积/空间分布是配色质量的一部分」的一个真实学术立场**，来自可视化领域而非 LLM 领域。它支持「配比是有意义的信息」，但**完全没有**测过「把它写进提示词会怎样」。

来源：[InfoColorizer, TVCG 2021](https://doi.org/10.1109/tvcg.2021.3085327)

### 3.4【B】ColorGPT：LLM 做配色时，「颜色在调色板中的分布」是一个被评估的维度

《ColorGPT: Leveraging Large Language Models for Multimodal Color Recommendation》（ICDAR 2025，arXiv 2508.08987）。它把「**the distribution of colors in the color palette**」列为 accuracy 之外的评估项，并报告其方法在「color diversity and similarity」上有改进。

**⚠️ 关键区别**：「palette 内的颜色分布」≠「页面上的面积配比」。前者是「这几个色彼此多不一样」，后者是「这个色占屏幕多少」。**不要把这条当成配比证据。** 我在正文里明确标注：这条**不支持** Q3。

来源：[arXiv:2508.08987](https://arxiv.org/abs/2508.08987)

### 3.5【D】「AI 会机械按比例刷色」——这个反面担心也没有证据

我在检索中没有找到任何关于「模型机械执行百分比配比」的实测。这个担心和「配比有效」一样，**都是推测**。

**但有一条相邻的、有证据的机制值得警惕**：§1.4 那篇 under-specification 论文指出的「over-fitted terminology 触发 retrieval-based 套路解」。「60/30/10」是网页设计语料里**极度常见**的短语，正是典型的 over-fitted terminology。**如果模型把它当成一个套路标签去检索模板，那它不仅不会更精确，还会覆盖掉你的具体色板。** 这是有机制依据的、针对「补配比」的具体风险，等级【B】（机制有证据，应用于本案是推论）。

### 3.6 Q3 小结

| 命题 | 证据 |
|---|---|
| 60-30-10 是被承认的设计原则 | 【A/C】是（Energy-Efficient Web Design 在检验它） |
| 面积/空间分布影响配色质量 | 【B】有（InfoColorizer，可视化领域） |
| **在提示词里写配比 → 生成更接近目标风格** | **【✗】零证据** |
| **AI 会机械按比例刷色** | **【✗】零证据** |
| 「60/30/10」可能触发套路解而非精确执行 | 【B】机制有据，本案是推论 |

**所以「补配比」：没有证据，这是赌。** 而且它是四个维度里**唯一一个连「间接支持」都没有的**——字号至少有「排版是 AI 短板」的间接支持，配比连这个都没有。

---

## 4. Q4：提示词长度与遵守率——中文长提示词有拐点吗？

**结论：没有「中文」拐点，也没有「2600–3000 字」拐点。有证据表明长度根本不是主要自变量。真正会随补维度上升的是约束条数（§1），而它已经在崩塌区。**

### 4.1 长度拐点远在本次改动之上（沿用 61 号报告，此处只做增量确认）

61 号报告 §2.1 已给出：Prompt Design at Scale 的 recall 在 **64–128k token** 前保持接近上限；`1200 字 ≈ 1.5k token`，余量约 **40 倍**。补到 3000 字 ≈ 4k token，余量仍有 **16–32 倍**。

**这一条我本轮没有找到任何反证。** 也没有找到任何针对中文的独立阈值研究。

### 4.2【A】新增：长度不是预测因子，这是有论文明确说的

《The language of prompting: What linguistic properties make a prompt successful?》（EMNLP 2023 Findings，arXiv 2311.01967）。它系统比较了语义等价但语言结构不同的 prompt，结论原话：

> 「Prompts transfer poorly between datasets or models, and performance **cannot generally be explained by perplexity, word frequency, ambiguity or prompt length**.」

**「prompt length」被明确列为不能解释性能的变量之一。** 这是对「补到 3000 字会不会变差」这个问题最直接的回答：**至少在这条研究线上，长度不是那个变量。**

来源：[arXiv:2311.01967](https://arxiv.org/abs/2311.01967)

### 4.3【A】新增：注意力被「碎片化」抢走，但**不是**因为长度

《Lexical Perturbations Disrupt LLM Reasoning: An Empirical Study of Attention Diversion》（EMNLP 2026 Main，arXiv 2608.22140）。摘要里有一句方法论上极重要的话：

> 「**Length-matched controls confirm that fragmentation, not prompt length, drives the loss.**」

即：他们做了**长度匹配的对照**，证明性能损失来自**词汇碎片化抢走注意力**，而不是 prompt 变长。机制叫 Attention Diversion：碎片化的子词切分「attract disproportionate attention mass, concentrated in middle and final transformer layers」。

**对本案的直接含义（这是个真正的操作建议）**：**往提示词里塞更多「看起来精确但不是模型原生记号」的字符串，会制造注意力碎片。** 本案要补的四个维度里：
- `#AF74BE` 是**原生记号**（HTML/CSS 里就是这么写的，61 号报告 §3.1 有 Sci Rep 证据）→ 低碎片风险。
- 「字阶 1.25 倍模数」「主色 60%」「次色 30%」是**自然语言的新术语**，不是 CSS 记号 → **高碎片风险**。
- 「线宽 0.4/0.8/1.2px」是原生记号，但**三组互斥值**是逻辑碎片 → 最高风险。

**这是本报告给四条修法排序的一个独立依据：按「记号原生性」排序，而不是按「信息重要性」排序。**

来源：[arXiv:2608.22140](https://arxiv.org/abs/2608.22140)

### 4.4【B】反方向的证据：显式惩罚长度，性能反而更好

《CAPO: Cost-Aware Prompt Optimization》（arXiv 2504.16005）。它用**多目标优化**同时优化性能和 prompt 长度，带一个「length penalty」；结果在 15 个案例中 11 个超过 SOTA，最高 +21 个百分点，**同时降低了平均 prompt 长度**。

**⚠️ 边界**：这是自动 prompt 优化（进化算法），不是人在写设计规格。它不能证明「短的设计提示词更好」。它能证明的是：**在优化目标里加长度惩罚，并不会牺牲性能，有时还提升**——即「长度与性能不是正相关」这个方向。

来源：[arXiv:2504.16005](https://arxiv.org/abs/2504.16005)

### 4.5 Q4 小结

| 自变量 | 有无阈值证据 | 本案（1900 字 → 2600–3000 字）判定 |
|---|---|---|
| token 长度 | 有，64–128k（61 号报告） | **无风险**，余量 16–40 倍 |
| 中文特有长度拐点 | **【✗】零证据** | 无法判定，不要假装有 |
| prompt 长度作为预测因子 | **【A】明确说不能解释性能** | 长度不是决策变量 |
| **约束条数** | **【A】7 条 / >10 条 / CSL 3** | **中高风险，且补维度会推高它** |
| **术语碎片化 / 非原生记号** | **【A】长度匹配对照已证明** | **补「配比」和「字阶模数」会推高它** |

**一句话**：不要用「字数」来评估这个改动。**用「新增了几条约束」和「新增了几个非 CSS 原生术语」来评估。** 前者大约 +6 到 +10 条（→ 26–32），后者大约 +3 到 +5 个新术语。

---

## 5. Q5：负向指令（「不要用 X」）有效吗？该改写成正向吗？

**结论：无效，而且比 61 号报告描述的更糟——不是因为「模型不懂否定」，而是因为「说出被禁的东西」本身会给它加权。本轮找到的机制证据（n=40,000）比 61 号报告引的扩散模型证据更贴近 LLM。**

### 5.1【A｜预印本，但样本 4 万、有 activation patching】Semantic Gravity Wells：命名禁令 = 给禁令加权

《Semantic Gravity Wells: Why Negative Constraints Backfire》（arXiv 2601.08070，2026-01，单作者，10 页，代码开源）。这是本轮找到的**对本案最锋利的一篇**。

核心设计与数字：

- 定义「semantic pressure」`P₀` = **模型生成被禁 token 的内在概率**（即「模型本来有多想说这个词」）。
- **违反概率与 pressure 呈紧密的 logistic 关系**：`p = σ(−2.40 + 2.27·P₀)`，**n = 40,000 样本**，bootstrap 95% CI 斜率 `[2.21, 2.33]`。
- **抑制信号存在但太弱**：失败案例里，禁令只把目标概率压低 **5.2 个百分点**；成功案例里压低 **22.8 个百分点**——**4.4 倍不对称**。
- **两种失败模式**：
  - **Priming failure（占违规的 87.5%）**：禁令**明确提到**被禁词，反而**激活**了该词的表征。原文结论句：「**the very act of naming a forbidden word primes the model to produce it**」。
  - **Override failure（12.5%）**：后层 FFN 给出 `+0.39` 的贡献，是成功案例的近 4 倍，压过了早层的抑制。
- **因果性**：activation patching 确认 **23–27 层**负责；替换这些层的激活**能翻转约束效果的符号**。

**为什么这条对本案比对扩散模型那条更有用**：61 号报告 §4.1 引的 ECCV 负提示词实验是**扩散模型潜空间**机制，作者自己也标注了「跨机制类推，风险较低」。**而这一篇就是 LLM 的 token 级机制，n=40,000，有因果干预。** 它把「否定式不可靠」从「类比」升级成了「直接证据」。

来源：[arXiv:2601.08070](https://arxiv.org/abs/2601.08070)

### 5.2 把 logistic 套到本案的三条负向指令上——这是本节最有操作价值的部分

公式 `p = σ(−2.40 + 2.27·P₀)` 的含义：**P₀ 越高，违反概率越接近 1。** 代入本案（`P₀` 是估计值，不是测量值，标注为推论）：

| 本案负向指令 | 模型的先验 `P₀`（估） | 推论：违反概率 | 判定 |
|---|---|---|---|
| 「不要用 #6366F1」 | **高**（Tailwind indigo-500，AI 生成的 SaaS 落地页里极常见） | 高 | **禁令几乎无效，甚至有害**（§5.1 priming） |
| 「不要紫蓝渐变」 | **高**（"purple-blue gradient" 是 AI 网页的高频套路） | 高 | 同上 |
| 「不要三条等宽 feature 卡片」 | **极高**（`repeat(3, 1fr)` 是训练分布里的默认解） | 极高 | **写出来等于点名要它** |
| 「不要 Inter / Roboto」 | **极高**（默认字体） | 极高 | **最不该写成否定的一条** |

**这张表的操作结论**：**「不要 X」的效果与「X 有多常见」成反比。** 越是 AI 的默认解，越不能用否定式——因为否定式恰恰把那个默认解放进了上下文。**而本案的 8 条防退化，全部是「AI 的默认解」**（不然也不会被列为防退化项）。**这 8 条正好落在最不该用否定式的那一档。**

**⚠️ 推论声明**：`P₀` 我无法测量；上表的「高/极高」是我基于「这些项之所以被写进防退化清单，就是因为它们在 AI 输出里高频出现」这一内部事实做的推断。**机制是【A】，代入是【D】。**

### 5.3【挑战 61 号报告】「把否定改写成更精确的否定（字面量）」可能方向错了

61 号报告 §4.4 的建议是：**保留 5 条否定式，但把概念换成字面量**——理由原文是「字面量不需要理解否定算子，只需要字符串不出现」。

**Semantic Gravity Wells 直接挑战这个理由**：论文测的**正是**「do not use **word X**」这种**字面量**形式（`abs:"negative constraints"` 的摘要第一句就是「instructions of the form "do not use word X"」），而且发现 **87.5% 的违规是 priming failure——即字面量点名本身造成激活**。

**所以「换成字面量」不会绕开否定算子问题，它恰恰是实验里最坏的那个形式。** 61 号报告这条建议的**理由不成立**（结论也许仍可用，但支撑它的论证需要换掉）。

**替代方向（推论，【D】但有机制依据）**：**改成「正向的可执行替代」，并且不要让被禁项出现在文本里。** 例如：
- 不是「不要 #6366F1」→ 而是「强调色只用 `--accent: #AF74BE`，全站只允许 `var(--accent)`」。（禁项名不出现）
- 不是「不要三条等宽卡片」→ 而是「feature 区固定用 `grid-template-columns: 2fr 3fr 2fr`」。（给出唯一解，而不是排除一个解）
- 不是「不要 Inter/Roboto」→ 而是「`font-family: "Saira Condensed", "Noto Sans SC", sans-serif`」。（只给一条链，不给排除清单）

**为什么这比「字面化否定」好**：它同时满足三件事——① 被禁项不在上下文里（避开 priming）；② 是 CSS 原生记号（避开 §4.3 的碎片化）；③ 可机械验证（比「不要 X」更容易判）。

### 5.4 Q5 小结

- **【A】负向指令在 LLM 上系统性不可靠**，机制是「命名即加权」，n=40,000，有因果干预。
- **【A】违规的主要形态（87.5%）恰恰发生在「明确点名被禁词」时**——所以「写得更具体」在否定式上是**反效果**。
- **【D】本案 8 条防退化全部针对「AI 默认解」，因此是效果最差的一类否定式。**
- **建议（有机制依据，但未在本案验证）**：改成「只给正向唯一解 + 让被禁项完全不出现在文本里」。**这条与 61 号报告 §4.4 的具体做法冲突，冲突点在 §5.3 已说明。**

---

## 6. Q6：单文件 HTML 约束会导致字形退化吗？

**结论：「单文件约束导致不用外部字体」这个因果链，证据不支持。真正的字形退化风险在**渲染环境**，不在**模型合规**——这两件事被混在一起了。分开之后，结论完全不同。**

### 6.1【A】先否掉一半：单文件 / vanilla HTML 不是保真度劣势

DesignBench 的 CLIP 分数（design generation，原文 Table IV）可以直接回答「单文件是不是吃亏」：

| 框架 | Claude-3.7 | GPT-4o | Gemini-2.0 | Qwen-72B |
|---|---|---|---|---|
| React | 0.8083 | 0.7637 | 0.7611 | 0.7790 |
| Vue | **0.8319** | **0.7734** | 0.6897 | 0.6836 |
| Angular | 0.6024 | 0.5963 | 0.6006 | 0.5149 |
| **Vanilla（纯 HTML/CSS）** | 0.8132 | 0.7683 | **0.7588** | 0.7597 |

**vanilla HTML/CSS 与最好的框架（Vue）差距在 0.005–0.02 之间，且明显高于 Angular。** 在 DesignBench 里，「单文件纯 HTML/CSS」**不是**保真度的短板。**这直接反驳「单文件约束会拖累视觉还原」这个泛化担心。**

**⚠️ 边界**：这是「截图→代码」且模型能看到原图。本案是「文字描述→代码」，没有图。**但至少可以确定：单文件这个形式本身不是 fidelity 的负因素。**

来源：[DesignBench, ar5iv 全文 Table IV](https://ar5iv.labs.arxiv.org/html/2506.06251)

### 6.2【✗】「单文件 → 不敢引外部字体 → 字形退化」：这条链没有证据

我检索了 `"external resources" AND "single-file" AND "HTML"`（0 条）、`"web font" AND "rendering"`（0 条）。**没有任何研究测过「要求单文件 HTML 时模型是否省略 webfont link」或「省略后视觉相似度下降多少」。**

### 6.3 把这条链拆开：两个完全不同的失败点

这是本节的核心。现在的表述把两件事混成一件：

**失败点 A（模型侧）：模型是否会写 `<link href="fonts.googleapis.com/...">`？**
- **69 号审计已经实测过这件事**：字体相关四项 **119/119 全过**，且明确写着「字体链（30/30）…**零假话**」。也就是说，**在原型侧，字体链是完整写出来的**。
- 61 号报告 §6.2 也确认：Claude Artifacts 的原生形态就是「standalone HTML」，可导出。**单文件与外部字体 link 并不互斥**——`<link>` 是 HTML 的一部分，不是「拆文件」。

**失败点 B（渲染侧）：模型写了 Google Fonts link，但打开页面时字体没加载 → fallback → 字形退化。**
- 这才是真正会发生的事。机制是：**离线环境 / 被墙 / 无网 / CORS**，`@import` 或 `<link>` 静默失败，浏览器回落到 `sans-serif`（通常是系统默认，中文就是黑体）。
- **这个失败点与「单文件约束」无关**。哪怕允许拆文件、允许构建，只要字体是外链，同一个失败照样发生。

**所以正确的诊断是**：你观察到的字形退化，**大概率是失败点 B，而不是 A**。而现在的提示词约束（「不引 React/Vue/Tailwind，不拆文件」）**根本没有触及 B**——它约束的是框架和文件结构，不是字体加载。

**这条拆分有直接的操作价值**：如果病因是 B，那么「允许 Google Fonts 一行 link」**不会解决问题**，甚至会**加重**问题（多一个网络依赖）。真正对症的是：**要求 `font-family` 栈里必须有可用的本地 fallback，并明确 fallback 顺序**。

### 6.4【C】官方文档层面的旁证：自包含是平台偏好，但不是字体禁令

- **Claude Artifacts**：官方判据是「**significant and self-contained**，typically over 15 lines」「**stands on its own** without needing extra context」（61 号报告 §6.2 已引）。**「self-contained」指「不依赖对话上下文」，不是「不依赖网络资源」**——这两者在文档里不是一回事。
- **v0 Design Systems 2.0**：「If a component, prop, or token cannot be verified from the sources, v0 should not use it.」（61 号报告 §3.2 已引）——这是**token 层面**的封闭，不是资源层面。

**没有找到任何厂商文档说「单文件 HTML 不得引用外部字体」。** 这个禁令是本案自己加的。

### 6.5 Q6 的替代写法（推论，【D】，但依据 6.3 的拆分）

不要改成「允许 Google Fonts 一行 link」，而是**把字体加载的失败模式写进提示词**：

```
字体：@font-face 用 data: URI 内嵌，或 font-family 只写系统可用栈。
- 允许外部字体 link，但必须在 font-family 里给出完整的本地 fallback 链，
  且链尾必须是具体族名，不能是 sans-serif 泛称。
- 示例：font-family:"Saira Condensed","Noto Sans SC","Source Han Sans SC",
        "Microsoft YaHei",sans-serif;
- 禁止：font-family:Inter,sans-serif;（无本地 fallback，离线必退化）
```

**为什么这比对「允许一行 link」更好**：它把「字形退化」的**必要条件**（无可用 fallback）变成了一条**可 grep 的断言**——扫 `font-family` 里有没有具体族名。这和 69 号审计 §5.1 的改法（把形容词换成阈值）是同一套方法论。

---

## 7. 对本案的具体建议：四件事，哪件有证据，哪件是赌

> 严格按证据排序。**「没有证据」的会直接写「没有证据，这是赌」。**

### 7.1 四件事的证据支撑度总表

| # | 要补的维度 | 外部证据 | 支撑度 | 判定 |
|---|---|---|---|---|
| ① | **修线宽**（三组互斥值 → 单一分级） | **【A】强**：69 号审计实测 5/30 案假声称；§1.2 的「互斥约束 = 无解」；§4.3 的「逻辑碎片抢注意力」 | **★★★★★ 该做** | **不是「补维度」，是「修错」。有最硬的证据。** |
| ② | **补色板**（20/30 案用到色板外颜色） | **【A】中**：hex 是原生记号（Sci Rep r=0.84）；颜色是网页生成最弱维度（Design2Code 84.1 vs 98.2）；v0 的 token 封闭原则 | **★★★☆☆ 该做，但改法要对** | **该做，但不是「补更多色值」——现在的色板已经列了 4–7 个色。要补的是「封闭性」（只允许 var(--*)），不是「更多颜色」。** |
| ③ | **补字号** | **【✗】零外部证据**（§2.6）。仅有内部观察 6.9→2–3 档 | **★☆☆☆☆ 没有证据，这是赌** | **没有证据，这是赌。** 而且它是**新增约束**，会推高 §1 的崩塌风险。 |
| ④ | **补配比**（主色 60% / 次色 30%） | **【✗】零证据，连间接支持都没有**（§3.6）。且有 §1.4 的「套路词」风险和 §3.2 的「该研究线不认为配比是关键变量」 | **☆☆☆☆☆ 纯赌，且有已知风险** | **没有证据，这是赌。而且是四件里唯一「没有任何间接支持 + 有明确反方向信号」的一件。** |

### 7.2 逐条说清「为什么」和「怎么做」

#### ① 修线宽 —— **该做，证据最硬，而且与另外三件性质不同**

**这不属于「补维度」，属于「修数据缺陷」。** 69 号审计 §2.5 的判决原文：「线宽是唯一的系统性谎区（5/30）」，根因是 `lineWidths` 从 CSS 文本抽取（混合 border / outline / SVG 用户单位），却被包装成「线宽只用这几级：Xpx」这种精确指令。S27 尤其严重：**声称的 3 个值里 2 个在整份 CSS 里一次都没出现**。

**外部证据支持「互斥约束必须修」**：
- 69 号审计 `UNVERIFIABLE.md` §2.1 的 **U3「数学不可能」** 定义就是「约束之间矛盾，无解」——本批实测 0 例，但**线宽的「多组互斥值」正是 U3 的定义**，只是被归到了别处。
- §1.1 的 CSE 结论「failures are nearly independent → accumulation is multiplicative」意味着：**一条自相矛盾的约束不是「-1 条」，而是让所有读取该字段的约束一起失效**（CSE 的原话示例：「a wrong sentence count fails every constraint that reads it」）。**线宽错，会连带毁掉「视觉层级」类的判断。**
- §4.3 的 Attention Diversion：**互斥值是最严重的「逻辑碎片」**。

**怎么做**：不是加约束，是**减**。三组互斥值 → **一组**，且只保留**实际在 CSS 里出现过的**值（按审计的实测清单）。**这一条会让总约束数下降，因此它同时改善 §1 的风险。**

#### ② 补色板 —— **该做，但要改的是「封闭性」不是「色值数量」**

**证据支持「颜色需要更强的约束形式」**（61 号报告 §3.1 三条已引，我不重复）。**但「20/30 案用到色板外颜色」这个内部发现，直接指向的是「色板不封闭」，不是「色板不够全」。**

**关键判断**：如果 20/30 案的原型自己都越界，那么**「补全色板」等于把越界色追认进白名单**——这会**削弱**约束而不是加强。正确做法是 69 号审计 `UNVERIFIABLE.md` §5.1 已有的那条：

```diff
- "1. 配色只用这几个值：" + d.palette + "。不新增更多彩色。",
+ "1. 配色只用这几个值：" + d.palette + "。只允许这 " + nColors + " 个字面色值；"
+   + "不要用 rgba()、hsla()、color-mix() 派生新颜色；不要给元素加 opacity。",
```

**这条改法的证据**：不是「更多色值更好」，而是「**判据必须可机械判定**」——`UNVERIFIABLE.md` §2.2 实测同一句话在四档口径下得出 **0 / 21 / 9 / 30** 四个不同的 FAIL 数。「没有正确/错误之分」是它最大的问题，与外部的 FollowBench / IFScale 无关，是**内部方法论**问题。

**⚠️ 注意**：这条改法**不增加约束条数**（3 条机械条件替换 1 条不可判条件），所以不加剧 §1 的风险。这是它比 ③④ 优越的地方。

#### ③ 补字号 —— **没有证据，这是赌**

**必须直说**：
- **没有任何外部研究测过「LLM 生成网页时字号档数」**（§2.6）。
- **没有任何 UI-to-code 基准有字号指标**（§2.1，DesignBench 的 6 类问题里没有）。
- **你的 6.9 档 → 2–3 档观察是唯一的证据**，n=30 案，无对照，无外部复现。

**而且它是「新增约束」，会加剧 §1 的风险**：字号分级至少要写 4–6 个值（「H1 48px / H2 32px / H3 24px / body 17px / small 14px」），这在 CSE 的计数里是 **+5 条**，把总数从 20 推到 25。**在一个已经超过崩塌点 3 倍的集合上加 5 条，收益未知、代价已知。**

**如果一定要做，唯一有证据支撑的做法是「先测量，后补」**：
1. 先把「字号档数」做成一个**可机械判定的指标**（`new Set(getComputedStyle(el).fontSize).size`），在 30 案原型上测出真实分布。**这一步不花外部证据，只花脚本。**
2. 如果原型确实是 6.9 档而实现是 2.3 档（用你现有的 CDP 管线就能测），**那你就有了一份 n=30 的内部对照证据**——它比任何外部文献都更有针对性，因为它测的正是「你的提示词 + 你的风格」。
3. 有了这个数，再决定补不补。

**理由**：这是本案唯一一个「内部证据可以在几小时内做到比外部文献更强」的维度。**在花 700 字提示词预算之前，先花 2 小时测一下。**

#### ④ 补配比 —— **没有证据，这是赌，而且是四件里风险最高的一件**

**必须直说**：
- **零证据**，且是四件里**唯一连间接支持都没有**的（§3.6）。
- **两条反方向信号**：
  - Design2Code（484 页基准）的 color 指标是**元素级 CIEDE2000，不是面积配比**——该研究线不认为配比是关键误差源（§3.2）。
  - 「60/30/10」是**极度常见的套话**，正是 §1.4 那篇论文说的「over-fitted terminology」，**可能触发套路解，覆盖掉你的具体色板**。
- **它需要「测量」才能写对**：你要先算每个色的**屏幕面积占比**（这就是 69 号审计 §2.2「像素直方图」已经在做的事！）。**如果直方图已经能算出 `35.86%`（`pixel-histogram.json` 里确实有这样的数），那么「配比」的信息你已经有了——但「把它写进提示词是否有效」仍然零证据。**

**建议**：**这一条先不做。** 如果做，只做「一个数」——主色占比，而且用**正向唯一解**表述（「背景始终是 `--paper`，占画面 60% 以上」），不要写成三段式百分比。

### 7.3 一个必须一起做的、有证据的配套改动（不在这四件里，但优先级更高）

**把 8 条负向指令改成「正向唯一解 + 禁项名不出现」。**

**证据**：§5.1 的 Semantic Gravity Wells（n=40,000，87.5% 的违规发生在「点名被禁词」时，activation patching 确认因果）。**这是本轮找到的、对本案最直接可用的因果证据。**

**为什么优先级高于四件修法**：它**减少**约束条数（8 条否定 → 4–5 条正向），同时**移除**最有害的注意力碎片。它同时改善 §1（约束数）和 §4.3（碎片化）两个风险。**而四件修法里有三件是增加风险的。**

**⚠️ 与 61 号报告的冲突**：61 号报告 §4.4 建议「保留 5 条否定式，把概念换成字面量」，理由是「字面量不需要理解否定算子」。**本报告 §5.3 认为这个理由不成立**——Semantic Gravity Wells 测的**正是**字面量形式（「do not use word X」），且发现字面量点名是 87.5% 违规的直接原因。**建议 lead 用这条新证据重新裁决 §4.4。**

### 7.4 如果只能做一件事

**修线宽。** 理由：唯一一个「有硬证据 + 减少约束数 + 修复已知的数据谎报」的动作。**它在三个维度上同时改善，且不需要任何新证据。**

**如果只能做两件事**：修线宽 + 改写负向指令。**这两件都让提示词变短、变可判定，而不是变长。**

**如果要做四件**：请先接受这一点——**③④ 是在拿「已知的约束过载风险」换「未知的保真度收益」。** 如果决定赌，建议**分两批发布并测量**（先 ①②+负向改写，测一轮；再 ③④，测一轮），而不是一次性把 2600–3000 字推上去。**否则你无法区分「补维度有效」和「补维度有害但被其他改动抵消」。**

---

## 8. 本报告的局限（必读）

1. **`web_search` 全程不可用（HTTP 402）**，Google/Brave/DDG/Mojeek/SearX 全部被拒。**证据来源偏向 arXiv/OpenAlex 学术文献，工程博客与厂商 changelog 这类【C】级材料严重缺失。** 凡「未找到」，严格含义是「在 arXiv/OpenAlex 可检索范围内未找到」。
2. **跨任务类推仍是最大方法论弱点**，且比 61 号报告更严重：CSE 是合成约束、RECAST 是长文生成、under-specification 是算法题、Graphic-Design-Bench 是图像生成。**每一处都在正文标注了边界。**
3. **§5.2 的 `P₀` 表是推论，不是测量。** 机制是【A】，代入本案是【D】。
4. **Q2 和 Q3 的「零证据」是本文最重要的产出，也是最容易被误读的产出。** 「没有证据」不等于「无效」——它等于「**这个决定目前无法用外部证据辩护，只能靠内部实测**」。
5. **未取得的三条**：DesignBench 的 `arxiv.org/html` 版本（fetch failed，只能用 ar5iv 镜像）；`ColorGPT` 的 abs 页（超时，只有 OpenAlex 摘要）；Anthropic 官方 prompt engineering 文档正文（重定向到 `anthropic.com`，跨域不跟随）。**这三条都不影响主要结论。**

---

## 附：本轮新增引用源（按证据等级）

### 【A】同行评审 / 大样本对照实验

1. [Large Language Models Can Follow Instructions, But Not Many at Once: Phase Transitions in Compositional Constraint Satisfaction (arXiv:2608.12426)](https://arxiv.org/abs/2608.12426) —— 15 模型 / 36 类约束 / 369,753 次检查 / k=1–12；**7 条崩塌，12/15 模型 ≤3 条**；乘性累积
2. [DesignBench: A Comprehensive Benchmark for MLLM-based Front-end Code Generation (arXiv:2506.06251v3)](https://arxiv.org/abs/2506.06251) ｜ [ar5iv 全文（含 Table IV）](https://ar5iv.labs.arxiv.org/html/2506.06251) —— 900 样本；**指标体系无字号**；vanilla HTML/CSS 的 CLIP 不劣于框架
3. [Semantic Gravity Wells: Why Negative Constraints Backfire (arXiv:2601.08070)](https://arxiv.org/abs/2601.08070) —— n=40,000；`p=σ(−2.40+2.27·P₀)`；**87.5% 违规源于「点名」**；activation patching 定位 23–27 层
4. [The language of prompting: What linguistic properties make a prompt successful? (EMNLP 2023 Findings, arXiv:2311.01967)](https://arxiv.org/abs/2311.01967) —— **「performance cannot generally be explained by … prompt length」**
5. [Lexical Perturbations Disrupt LLM Reasoning: An Empirical Study of Attention Diversion (EMNLP 2026 Main, arXiv:2608.22140)](https://arxiv.org/abs/2608.22140) —— **长度匹配对照证明损失来自碎片化而非长度**
6. [When Built-in Thinking Helps and Hurts: Constraint-Level Error Shifts in Instruction Following (arXiv:2606.09662)](https://arxiv.org/abs/2606.09662) —— 聚合变化 −0.55~−3.52pp，但 **10–20% 的 prompt 翻转 pass/fail**
7. [Energy-Efficient Web Design (IGI Global, 2025)](https://doi.org/10.4018/979-8-3373-0766-4.ch001) —— 检验真实网页是否遵循 **60-30-10**
8. [InfoColorizer: Interactive Recommendation of Color Palettes for Infographics (IEEE TVCG 2021)](https://doi.org/10.1109/tvcg.2021.3085327) —— 既有工作「neglect the influence of elements' spatial arrangement」

### 【A-】预印本（方法完整，未同行评审，降权）

9. [RECAST: Expanding the Boundaries of LLMs' Complex Instruction Following (arXiv:2505.19030)](https://arxiv.org/abs/2505.19030) —— **「>10 constraints」**；此前数据集单实例不超过 10 条
10. [When Prompt Under-Specification Improves Code Correctness (arXiv:2604.24712)](https://arxiv.org/abs/2604.24712) —— 10 模型 × HumanEval/LiveCodeBench；**under-specification 有时提升正确率**；机制是打断 over-fitted terminology
11. [Defective Task Descriptions in LLM-Based Code Generation (arXiv:2604.24703)](https://arxiv.org/abs/2604.24703) —— 缺陷**类型**比模型容量更能预测失败；under-specification 最严重
12. [CAPO: Cost-Aware Prompt Optimization (arXiv:2504.16005)](https://arxiv.org/abs/2504.16005) —— **长度惩罚下性能仍提升**（15 例中 11 例）
13. [LIFT: Scoped Constraints for Evaluating and Training Instruction Following (arXiv:2610.28819)](https://arxiv.org/abs/2610.28819) —— 按节段限定约束密度（Lift-Bench）
14. [Learning to Detect UI Principle Violations via Reinforcement Learning (arXiv:2607.20690)](https://arxiv.org/abs/2607.20690) —— 19 条原则含 **poor visual hierarchy**；4B VLM micro-F1 **36%→84%**
15. [Graphic-Design-Bench (arXiv:2604.04192)](https://arxiv.org/abs/2604.04192) —— 「fine-grained typographic perception … largely unsolved」
16. [Interrogating Design Homogenization in Web Vibe Coding (arXiv:2603.13036)](https://arxiv.org/abs/2603.13036) —— 默认输出「minimalist whitespace, standard sans-serif typography」；productive friction

### 【B】小样本 / 单一数据集 / 相邻领域

17. [ColorGPT: Leveraging Large Language Models for Multimodal Color Recommendation (ICDAR 2025, arXiv:2508.08987)](https://arxiv.org/abs/2508.08987) —— palette 内**颜色分布**（≠ 页面面积配比，正文已标注不适用）
18. [Can AI Models Appreciate Document Aesthetics? (arXiv:2403.18183)](https://arxiv.org/abs/2403.18183) —— **font-size contrast** 作为可操纵美学变量

### 内部依据（非外部证据，列出以便对账）

- `deliverables/61-research/prompt-efficacy.md`（本报告增量基线，两处被挑战：§4.4 的否定式改法、§2.4 的乐观判断）
- `deliverables/69-audit/PROMPT-VERIFIABILITY.md` §2.5（线宽 5/30 系统性谎区）、§2.6（验证器自身假阳性）
- `deliverables/69-audit/UNVERIFIABLE.md` §2.1–2.2（35.8% 不可判；U1-a 四档口径 0/21/9/30）、§5.1（配色改法）

---

*报告完。全部 URL 均为本轮实际访问成功的地址；访问失败的已在 §8 逐条标明。检索通道受限情况见 §0.2——本报告的证据面偏学术，【C】级工程材料缺失。*
