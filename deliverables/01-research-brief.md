# 01 — 智能搜索研究简报（Trend Research Brief / 弹药库）

> 撰写者：Trend Researcher Agent（trend-researcher-2）｜ 唯一写入文件：本文件 ｜ 只读规格：`00-BRIEF-AND-CONSTRAINTS.md`
> 检索方式：**真实联网**。`web_search` × 6 次（短 query），`web_fetch` × 4 次（1 次被 Cloudflare 拦截，标注于来源行）。
> 本文件不是综述，而是**弹药库**：每条结论都写成生成 Agent 可以直接抄成设计决策的指令。
> 所有 30 个方案在动笔前应至少读完本文件的 B / C / D / E / F 五节；字体与配色一律从 D、E 节取料，禁止临场自由发挥到 AI 默认值上。

## 检索与来源台账（真实可查）

| 编号 | 来源名称 | URL | 状态 |
| --- | --- | --- | --- |
| S-1 | FontAlternatives Blog《2026 Typography Trend: Neo-Grotesk Fatigue and What Replaces It》 | https://fontalternatives.com/blog/neo-grotesk-fatigue-2026/ | 抓取成功（HTTP 200） |
| S-2 | DEV Community / TheKitBase《Serif Is the New Sans: Editorial Typography Comes to SaaS》 | https://dev.to/thekitbase/serif-is-the-new-sans-editorial-typography-comes-to-saas-4iaj | 抓取成功（HTTP 200） |
| S-3 | WebDesignerDepot《Brutalism in the AI Era: Why Ugly Might Be the Only Honest Aesthetic Left》 | https://webdesignerdepot.com/brutalism-in-the-ai-era-why-ugly-might-be-the-only-honest-aesthetic-left/ | 标题取自搜索结果；正文抓取被 Cloudflare 拦截（HTTP 403） |
| S-4 | 腾讯云开发者社区《为啥我用 AI 做的网站都是蓝紫渐变色？！！咋解决啊》 | https://cloud.tencent.com.cn/developer/article/2687093 | 标题与主题取自搜索结果 |
| S-5 | Xataka《Los diseñadores están empezando a diseñar "mal" y feo con un solo objetivo: diferenciarse de la homogeneización de la IA》 | https://www.xataka.com/robotica-e-ia/basura-visual-ia-omnipresente-que-esta-desatando-corriente-estetica-a-neo-brutalismo | 标题取自搜索结果 |
| S-6 | Gizmodo en Español《La rebelión visual contra la IA: así nace el neo-brutalismo digital》 | https://es.gizmodo.com/la-rebelion-visual-contra-la-ia-asi-nace-el-neo-brutalismo-digital-2000207980 | 标题取自搜索结果 |
| S-7 | CSDN《用 Skills 根治 AI 审美趋同：Claude 前端设计进化全解析》 | https://blog.csdn.net/wojiushiwo987/article/details/159257471 | 标题取自搜索结果 |
| S-8 | One Page Love《MonoDeaf — One Page Website Award》 | https://onepagelove.com/monodeaf | 标题取自搜索结果 |

---

## A 节｜「AI 味」的工业化成因（为什么默认模板一定长成那样）

**A-1 Tailwind 默认色板是最大污染源。** Tailwind CSS 的 `indigo-500` 精确值就是 `#6366F1`，`violet-500` 是 `#8B5CF6`，`purple-600` 是 `#9333EA`。官方文档的 UI 示例、`bg-indigo-500 hover:bg-indigo-600` 的按钮代码、以及 `from-indigo-500 to-purple-600` 的渐变写法被数以百万计的教程与 starter 复制，成为互联网上出现频率最高的"强调色"三元组。语言模型在训练语料中反复看到同一串 class 名，采样时必然回归这一峰顶——**AI 味不是审美判断，是语料分布的最高峰**。中文技术社区已经把这个现象当成显性吐槽对象（S-4）。

**A-2 组件库把"默认值"写死成了审美。** shadcn/ui、Radix Themes、DaisyUI 一类组件库为了通用，把 `border-radius` 设为 `0.5rem–0.75rem`、阴影设为 `shadow-sm / shadow-md`、灰阶设为 `zinc / slate / stone`。生成式 AI 与设计师都直接继承这些值，于是全网卡片都是"大圆角 + 柔和投影 + 灰阶底"。这就是 `00` 号文件 C-2 第 11 条要封杀 `24px 圆角 + 柔和 drop-shadow` 的**技术根因**：它不是被"设计"出来的，是被 `--radius` 变量分发出来的。

**A-3 Inter 的统治是度量兼容性的胜利，而不是美学的胜利。** Inter 被 Figma 用作默认 UI 字、被大量开源项目写进 `font-family` 第一顺位，字形度量与 SF Pro / Roboto 接近，替换成本几乎为零。多篇 2026 年字体趋势文章直接把它命名为"疲劳对象"：行业里"品牌改版"常常等于"把 Roboto 换成 Inter"（S-1）。同文还指出，"干净"被默认等同于"新怪诞体（neo-grotesque）"——这正是 AI 默认字体栈的心理学外衣。

**A-4 Figma 模板经济与模板市场的激励结构。** Figma Community、Framer / Webflow 模板市场按下载量与点赞排序，而高下载的前提是"任何人拿去都能用"——这要求模板必须去个性、去语境、去材质。**可复用性与独特性在数学上互斥**：一个能被 10000 个品牌套用的模板，必定是平均脸。于是模板市场成了 AI 味的生产线，模板结构收敛为 `Hero + 三卡 + Logo 墙 + Testimonial + Pricing + FAQ + Footer`（`00` 号文件 C-1 第 3 条点名封杀的骨架）。

**A-5 生成模型的众数坍缩（mode collapse）。** 给定 prompt"做一个 SaaS 落地页"，概率最高的 token 序列就是：紫蓝渐变 hero → 居中大标题 → 三张等宽卡片 → 底部 CTA。模型不是在"设计"，是在走最短路径。同理，图片生成模型给出的"科技感 hero 图"几乎全是抽象 3D 球体 / 流体金属——因为这类图**中性、不侵权、可代表任何产品**，是条件熵最低的答案。这就是 C-1 第 5 条与 C-2 第 13 条的来源。

**A-6 无障碍合规被简化成"白底黑字 + 单一强调色"。** 对比度工具（Stark、Figma A11y 插件）给的是二值判定，最省事的通过方式就是把背景推到纯白、文字推到近黑、强调色推到高饱和中明度。合规成本被压缩成同一种配色。C-2 第 15 条之所以要求"允许接近白 / 黑，但必须给出有印刷或材质理由的具体暖冷偏移值"，就是为了逼方案写出 `#FAF7F2` 或 `#141210` 这种**有理由的脏白脏黑**，而不是 `#FFFFFF / #000000`。

**A-7 性能优化话术把字体栈推向系统字体。** "用系统字体栈省 100KB"是性能文章的标准建议，`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto` 因此高频出现。它的代价是品牌识别度归零。本次 30 个方案必须反着做：**用可变字体 + 子集化**换来个性，而不是用系统栈换来几毫秒。

**A-8 社交平台的小尺寸预览图反馈回路。** Dribbble / Behance 的高赞作品在 400px 宽的小图里必须"一眼高级"，而深色底 + 霓虹紫 + 玻璃拟态 + 3D 渲染在这种尺寸下对比最强。这是一个正反馈：越适合小尺寸预览，越容易被点赞，越容易被模仿，越容易进入 AI 的训练数据。**"AI 味"因此是平台算法与经济激励共同浇铸出来的，不是某个设计师的错。**

**A-9 结论性判断：反 AI 味 = 反默认值，而不是反好看。** 要让 30 个方案不像 AI，必须逐个击破默认值链条：色（`#6366F1/#8B5CF6` 及其 ±10° 邻域）、字（Inter/Roboto/Arial/system-ui）、形状（`24px` 圆角 + 柔和投影）、结构（Hero+三卡+FAQ）、材质（无材质的纯 CSS 平面）、图（抽象 3D 球）。**另外，AI 的输出永远是"干净的"：没有套印错位、没有欠曝、没有纸纹、没有灰尘、没有脏色。**真实媒介（报纸、丝网印、CRT、胶片、票据）必然带脏——这是本批 30 方案最可靠的差异化资源（S-3、S-5、S-6）。

**A-10 字体侧的替代窗口是真实存在的。** S-1 明确指出 2026 年的替代路径有四条：有个性的几何无衬线（Space Grotesk / Jost）、文本衬线回潮（EB Garamond / Source Serif）、人文无衬线（Cabin / Nunito Sans）、工业 DIN 系（Barlow / IBM Plex Sans）。S-2 进一步给出可执行的搭配公式：**性格衬线做展示 + 干净无衬线做正文 + 等宽体做数据/价格/标签**，并强调"衬线只做展示，绝不用展示衬线排正文"、"用光学尺寸（optical sizing）"、"只允许一款性格字体"。D 节与 E 节就是把这两篇的结论落成可直接抄用的清单。

---

## B 节｜研究结论 1–7

**结论 1｜AI 味的生成机制是"求稳"，所以只有"精确到数值的硬约束"才能把它逼出舒适区。**
- 证据/案例：中文技术社区的分析把成因归结为两点——AI 训练数据里 Tailwind 默认蓝紫出现频率最高，模型因此学到"现代化网站 ≈ 蓝紫色渐变"；同时模型遵循一条生存法则"用最常见的 = 最不容易出错"。作者给出的解法是把禁止项写成清单：禁止 `#6366F1`、`#8B5CF6` 靛蓝紫渐变、禁止纯平背景、禁止 Hero + 三卡片、禁止完美居中对齐、禁止 Emoji 作功能图标、禁止线性 `ease-in-out` 动画（S-4）。
- 来源：腾讯云开发者社区《为啥我用 AI 做的网站都是蓝紫渐变色？！！咋解决啊》 https://cloud.tencent.com.cn/developer/article/2687093
- **对 30 方案的直接指令**：每个方案的字段 8、字段 9 必须写成"禁止清单"体，且禁止项必须带**精确数值**（HEX、px、字体名、列数）。禁止出现"不要用太常见的颜色"这类无法校验的表述。方案里出现的每一个色值都要能被指出它反的是 `#6366F1` / `#8B5CF6` / `#EC4899` / `#06B6D4` 中的哪一个。

**结论 2｜新怪诞体（neo-grotesque）疲劳已是 2026 年的行业共识，Inter 可以被公开点名批评。**
- 证据/案例：字体趋势专文列出设计师明确厌倦的三件事——"每个仪表盘都像 Figma 克隆""品牌改版其实只是把 Roboto 换成 Inter""把'干净'等同于新怪诞体"。文中给出的四条替代路径是：有性格的几何无衬线（Space Grotesk、Jost、Plus Jakarta Sans）、文本衬线回潮（EB Garamond、Source Serif）、人文无衬线（Cabin、Nunito Sans）、工业 DIN 系（Barlow、IBM Plex Sans）（S-1）。
- 来源：FontAlternatives《2026 Typography Trend: Neo-Grotesk Fatigue and What Replaces It》 https://fontalternatives.com/blog/neo-grotesk-fatigue-2026/
- **对 30 方案的直接指令**：30 个方案的"字体气质"分量必须全部落在上述四类里（几何性格 / 文本衬线 / 人文无衬线 / 工业 DIN-Mono），**禁止把"中性新怪诞"当成一种字体气质**。每个方案必须用一句话说出它离开 Inter 的**具体度量差异**（x-height 更高或更低、字腔开口、字重对比、是否有光学尺寸轴）。

**结论 3｜衬线回潮的最优搭配公式已经成型：性格衬线做展示 + 干净无衬线做正文 + 等宽体做数据。**
- 证据/案例：文章给出的可直接抄用的三变量写法是 `--font-display: "Fraunces"`、`--font-body: "Hanken Grotesk"`、`--font-mono: "Geist Mono"`，并列出五条纪律：展示衬线只用于标题/引文、绝不用展示衬线排正文；字形对比要拉大；用光学尺寸；只允许一款性格字体；让衬线承担全部个性、其余保持安静（S-2）。
- 来源：DEV Community《Serif Is the New Sans: Editorial Typography Comes to SaaS》 https://dev.to/thekitbase/serif-is-the-new-sans-editorial-typography-comes-to-saas-4iaj
- **对 30 方案的直接指令**：所有编辑/出版物/学术档案/报纸/杂志类家族**强制采用 display / body / mono 三分类分工**，且展示字体与正文字体**必须属于不同超家族**（两款几何无衬线并列直接判不合格）。至少 8 个方案要使用带光学尺寸轴的可变字体，并在字段 4 写出轴名与取值区间。

**结论 4｜字体必须在真实 UI 小字号上验证，Figma 里 48px 好看的字在 13px 会崩。**
- 证据/案例：趋势文把"先在 Figma 里看 48px 效果"列为常见错误，明确要求"永远在真实 UI 字号上验证"，并指出多数带性格的字体在 12–14px 会失去特征或字距失衡（S-1）。
- 来源：FontAlternatives（同 S-1） https://fontalternatives.com/blog/neo-grotesk-fatigue-2026/
- **对 30 方案的直接指令**：字段 11 必须写出正文 14–16px 与辅助标签 11–12px 两个档位的具体字体、字重、`letter-spacing`、`line-height` 数值；**禁止**任何方案只靠大字号展示字体成立。若某方案的正文字体在小字号不成立，必须写明切换字体（fallback 到哪一款开源正文体）。

**结论 5｜"故意设计得丑/坏"已经变成一种有名字的反同质化打法。**
- 证据/案例：西语科技媒体把这一波称为"数字新粗野主义（neo-brutalismo digital）"，标题直接写"设计师开始故意设计得'坏'和丑，唯一目的是把自己和 AI 同质化区分开"；另有行业站以"粗野主义在 AI 时代：丑可能是唯一还诚实的审美"为题（S-3、S-5、S-6）。
- 来源：Xataka https://www.xataka.com/robotica-e-ia/basura-visual-ia-omnipresente-que-esta-desatando-corriente-estetica-a-neo-brutalismo ｜ Gizmodo ES https://es.gizmodo.com/la-rebelion-visual-contra-la-ia-asi-nace-el-neo-brutalismo-digital-2000207980 ｜ WebDesignerDepot https://webdesignerdepot.com/brutalism-in-the-ai-era-why-ugly-might-be-the-only-honest-aesthetic-left/
- **对 30 方案的直接指令**：至少 6 个 R 型方案必须把"有理由的丑"写进结构决策（不等宽栏、基线刻意错位、裸露表格线、未对齐的页边批注），并在字段 8 逐条说明它反的是 `00` 号文件哪一条禁令。**禁止**把"丑"当作随机噪声或滤镜——每一处不整齐都必须能说出理由。

**结论 6｜模板经济是 AI 味的生产线：能被越多人直接套用的模板，越必然是平均脸。**
- 证据/案例：中文技术文章把"直接套用现成模板"（HTML5 UP、Start Bootstrap、Colorlib、WordPress 主题库、GitHub 开源项目）列为最简单粗暴的路径，并明确说"选个不错的下载下来，把代码丢给 AI 改改内容就好，样式基本准确还原"——这正是同质化的传播链。对照面是 One Page Love 收录的获奖单页 `MonoDeaf`：小体量站点的记忆点来自**单一机制**而非全套模板（S-4、S-8）。
- 来源：腾讯云开发者社区（同 S-4） https://cloud.tencent.com.cn/developer/article/2687093 ｜ One Page Love https://onepagelove.com/monodeaf
- **对 30 方案的直接指令**：字段 11 必须额外回答一句"**这个方案最难被复用到别的品牌的地方是什么**"。若答案是"换个 logo 和文案就能用"，该方案判不合格，必须回炉。同一骨架被 3 个方案共用时，三者的"不可复用点"必须完全不同。

**结论 7｜工具链正在把审美做成"按产品类型检索的查询库"，这会让同类型项目二次趋同。**
- 证据/案例：中文文章介绍的去 AI 味技能包 UI UX Pro Max 的工作方式是：先识别产品类型与页面类型，再用 `search.py` 在 data 目录里多维度检索"适合的配色、字体、布局风格"，然后综合成设计方案再生成代码；另有文章以"用 Skills 根治 AI 审美趋同"为题讨论同一现象（S-4、S-7）。
- 来源：腾讯云开发者社区（同 S-4） https://cloud.tencent.com.cn/developer/article/2687093 ｜ CSDN《用 Skills 根治 AI 审美趋同：Claude 前端设计进化全解析》 https://blog.csdn.net/wojiushiwo987/article/details/159257471
- **对 30 方案的直接指令**：**禁止按"产品类型 → 查表配色"的方式分配视觉**。矩阵分配时必须保证**同一目标项目类型下的方案不共享主色色相区间、不共享字体气质**：例如 6 个 SaaS/工具类方案，主色色相至少分散在 6 个不同 60° 扇区，标题字体必须来自 6 个不同超家族。生成 Agent 在字段 3 必须写出该方案主色的色相角数值，供审查官做差角计算。

---

## C 节｜研究结论 8–14

**结论 8｜AI 输出的颜色永远是"干净的"，所以真实媒介的"脏"是本批最可靠的差异化资源。**
- 证据/案例：讨论反同质化审美的文章反复指向同一件事——AI 生成的视觉没有物理损耗：没有套印错位、没有欠曝、没有纸纹、没有灰尘、没有脏色。真实印刷媒介（丝网印、报纸凸版、油墨叠印）必然产生偏色与脏面（S-3、S-5、S-6）。同时中文字体趋势与传统印刷工艺的搭配方案在本次检索中未被直接覆盖，这一条的具体工艺参数为**未核实：凭记忆**。
- 来源：WebDesignerDepot https://webdesignerdepot.com/brutalism-in-the-ai-era-why-ugly-might-be-the-only-honest-aesthetic-left/ ｜ Xataka https://www.xataka.com/robotica-e-ia/basura-visual-ia-omnipresente-que-esta-desatando-corriente-estetica-a-neo-brutalismo
- **对 30 方案的直接指令**：每个方案的 3–4 个 HEX 里**至少 1 个必须是"脏色"**——判定标准：HSL 明度 ≤ 38%，或饱和度被灰化（S ≤ 22%）的中间调。所有配色必须能说出**实体出处**（Pantone 色号 / RAL / 印刷油墨 / 品牌手册 / 艺术运动 / 具体材质），禁止写成"我们选了一个舒服的灰"。凡只有取色器来源、无实体出处的配色，判不合格。

**结论 9｜中文排版是本次最大的未开采差异化区，因为 AI 默认根本不会用开源中文字体。**
- 证据/案例：本次检索到的英文趋势文全部只谈拉丁字体（S-1、S-2），中文侧未被覆盖；拉丁字体趋势与中文字体授权的对应关系为**未核实：凭记忆**（依据是常见开源中文项目的公开授权声明：思源黑体 / 思源宋体系列为 OFL，霞鹜文楷为 OFL，朱雀仿宋、未来荧黑、文津宋体为开源发布，具体授权文本需在下载页复核）。
- 来源：FontAlternatives（同 S-1） https://fontalternatives.com/blog/neo-grotesk-fatigue-2026/ ｜ DEV Community（同 S-2） https://dev.to/thekitbase/serif-is-the-new-sans-editorial-typography-comes-to-saas-4iaj
- **对 30 方案的直接指令**：**30 个方案全部必须写出中文搭档字体**，且必须写明授权。矩阵分配时，**中文主字体不得被超过 4 个方案共用**；`思源黑体` 作为中文主字体出现次数**不得超过 6 次**，其余必须从 D 节清单里轮换。凡方案只写拉丁字体、把中文交给浏览器默认字体的，字段 4 判不合格。

**结论 10｜"大留白 + 细无衬线 = 高级"是瑞士国际主义被偷懒后的空壳，必须用机制补齐。**
- 证据/案例：字体趋势文指出行业把"干净"默认等同于新怪诞体，这正是"留白 + 细体"套路的心理根据（S-1）。瑞士国际主义的原始机制（非对称栏宽、严格基线网格、悬挂标点、左对齐右不齐、字号比例的数学级数）与当代简化版的差异为**未核实：凭记忆**。
- 来源：FontAlternatives（同 S-1） https://fontalternatives.com/blog/neo-grotesk-fatigue-2026/
- **对 30 方案的直接指令**：任何自称瑞士 / 国际主义 / 网格系统的方案，字段 5 必须给出**至少 2 个可测量的不对称机制**（例如"栏宽比 5:7:8""标题基线相对正文网格偏移 6px""标点悬挂出血 0.5em"）。只写"大量留白、细无衬线、严格网格"的方案直接打回。

**结论 11｜默认动效（滚动淡入 + 视差 + ease-in-out）与默认配色一样是 AI 指纹。**
- 证据/案例：中文去 AI 味清单把"线性动画 `ease-in-out`"与紫蓝渐变并列写进禁止项（S-4）；衬线趋势文强调"让性格字体承担全部个性、其余保持安静"，暗示动效不应与字体争夺注意力（S-2）。
- 来源：腾讯云开发者社区（同 S-4） https://cloud.tencent.com.cn/developer/article/2687093 ｜ DEV Community（同 S-2） https://dev.to/thekitbase/serif-is-the-new-sans-editorial-typography-comes-to-saas-4iaj
- **对 30 方案的直接指令**：每个方案只能有**一个动效主机制**，且必须能写出物理来源（机械棘轮、电传打字机走纸、显像管扫描线、胶片走片、继电器吸合、纸张翻页）。**禁止把 `ease-in-out` 当作全局缓动**，每个方案必须给出缓动曲线的具体性格描述（阶跃 / 过冲 / 阻尼 / 逐帧跳变）。全部方案必须写 `prefers-reduced-motion` 降级行为。

**结论 12｜"没有真实图片"是 AI 网站的固定病灶，图像处理必须写进方案。**
- 证据/案例：中文文章把"AI 生成的网站通常没有图片"列为 AI 味的第五个症状（无真实图片、文字风格刻板），并给出可执行解法：插画取 unDraw、图标取 Iconify、真实照片取 Pexels、占位取 Picsum（S-4）。注意其中 unDraw 与 Iconify 的通用插画/图标风格本身已高度同质，直接使用会引入新的 AI 味。
- 来源：腾讯云开发者社区（同 S-4） https://cloud.tencent.com.cn/developer/article/2687093
- **对 30 方案的直接指令**：字段 6 必须写明图像的**加工流程**（格式、是否有抖动/半调/双色调/套印错位/网点放大、颗粒叠加方式与不透明度区间）。**禁止**直接使用未处理的图库原始照片，**禁止**使用 unDraw 默认配色的插画，**禁止**用大尺寸渐变块占位。图标必须写明绘制规则（线宽、端点、网格单位），不得使用 Emoji。

**结论 13｜文案的具体化程度可以被机械判定：有没有数字、有没有场景。**
- 证据/案例：中文文章给出的文案标准是"具体化（'每天节省 2 小时重复劳动'而不是'提升生产力'）、口语化、带情绪、每句不超过 15 字"，并把"高深的专业名词和无意义的空话"列入禁止项（S-4）。
- 来源：腾讯云开发者社区（同 S-4） https://cloud.tencent.com.cn/developer/article/2687093
- **对 30 方案的直接指令**：每个方案写入正文的真实文案样例（≥2 处）**必须至少含 1 个阿拉伯数字或 1 个具体场景名词**（时间、数量、地点、器物、动作）。审查官按"是否含数字/场景"做机械判定，不含数字也不含场景的文案样例视为占位文案，按 C-2 第 16 条处理。

**结论 14｜把以上收敛为"反 AI 味"的可交付判据（6 条机械校验）。**
- 证据/案例：综合本次检索到的全部来源（S-1 至 S-8），AI 味的可检测性来自它**统计上的默认值收敛**：默认色（Tailwind 靛蓝紫）、默认字（Inter/Roboto/系统栈）、默认形状（大圆角 + 柔和阴影）、默认结构（Hero + 三卡 + FAQ）、默认材质（无材质的纯 CSS 平面）、默认图（抽象 3D 球 / 无加工图库图）、默认腔调（空话文案）。
- 来源：综合 S-1 https://fontalternatives.com/blog/neo-grotesk-fatigue-2026/ ｜ S-2 https://dev.to/thekitbase/serif-is-the-new-sans-editorial-typography-comes-to-saas-4iaj ｜ S-4 https://cloud.tencent.com.cn/developer/article/2687093 ｜ S-8 https://onepagelove.com/monodeaf
- **对 30 方案的直接指令**：交付前按这 6 条机械校验，任一条不过即回炉——(1) 每个 HEX 都能指出它反的是哪个 AI 默认色；(2) 字体栈里没有任何默认值字体，且展示与正文属于不同超家族；(3) 圆角与阴影有材质理由，或干脆不存在；(4) 页面主体结构不包含 Hero + 三等宽卡 + FAQ 的任意组合；(5) 每方案至少 1 个脏色 + 1 个脏材质（颗粒/网点/套印错位/污渍）；(6) 真实文案样例含数字或场景，且无空洞营销词。

---

## D 节｜字体弹药库（全部真实存在、开源可商用；**严禁出现 Inter / Roboto / Arial / system-ui**）

> 使用规则：字段 4 从下表取料。同一款标题字体在 30 个方案中出现 **≤3 次**；展示字体与正文字体必须属于**不同超家族**。表中"授权"为公开声明，落地前必须在该字体的官方发布页二次复核授权文本。

### D-1 拉丁字体（14 款）

| # | 字体 | 授权 | 气质（一句话） | 适配美学家族 | 中文搭档 |
| --- | --- | --- | --- | --- | --- |
| F1 | Space Grotesk | OFL 1.1 | 几何骨架 + 工程图纸式的窄字腔，冷但有个性 | 工业控制台、参数化生成、技术手册 | 思源黑体 / 未来荧黑 |
| F2 | Fraunces | OFL 1.1 | 高对比展示衬线，带 SOFT / WONK 可变轴，能"故意不正经" | 复古杂志、糖果包装、玩心广告 | 思源宋体 / 霞鹜文楷 |
| F3 | EB Garamond | OFL 1.1 | 威尼斯老式衬线，小写字母有手写倾斜 | 学术档案、严肃出版、古典公文 | 朱雀仿宋 / 思源宋体 |
| F4 | IBM Plex Sans + Plex Mono + Plex Serif | OFL 1.1 | 同一超家族三兄弟，工程公司的理性笔触 | 仪表盘、数据看板、开发者文档 | 思源黑体 |
| F5 | Barlow | OFL 1.1 | DIN 派生，字肩微圆，机能冷峻 | 工业设备、运输、运动器械 | 未来荧黑 |
| F6 | Archivo / Archivo Narrow / Archivo Black | OFL 1.1 | 美式 grot，宽度轴极宽（Expanded↔Condensed），招牌基因 | 报纸头版、体育、街头招牌 | 思源黑体 |
| F7 | Libre Franklin | OFL 1.1 | 美式哥特，报纸标题的原始血统 | 报纸、公告、票据 | 思源宋体 |
| F8 | Newsreader | OFL 1.1 | 为屏幕重绘的报纸正文衬线，有光学尺寸轴 | 报纸正文、杂志跨页 | 思源宋体 / 文津宋体 |
| F9 | Spectral | OFL 1.1 | 低对比屏幕衬线，长文极耐读 | 内容媒体、博客、报告 | 思源宋体 |
| F10 | Literata | OFL 1.1 | 电子书原生衬线，字腔开阔、小字号稳定 | 阅读产品、出版物、档案 | 文津宋体 |
| F11 | Instrument Serif | OFL 1.1 | 极高对比展示衬线，细笔画像刻线 | 奢华暗黑、高定、艺术机构 | 朱雀仿宋 |
| F12 | Bodoni Moda | OFL 1.1 | Didone 系，发丝细横 + 球状终端 | 时尚杂志、高定、拍卖 | 思源宋体 |
| F13 | Redaction | OFL 1.1 | 自带 10/20/35/50/70 五档"退化"变体，模拟复印机反复复印的劣化 | 档案批判、vernacular、法律文书反讽 | 霞鹜文楷 |
| F14 | Martian Mono | OFL 1.1 | 可调宽度等宽体，窄到像机械打字机 | 终端、票据、读数面板 | 思源黑体 / 未来荧黑 |

**补充可用（同属开源，按需取用）**：`Syne`（OFL 1.1，宽度极端的怪异几何，适合艺术机构）、`Unbounded`（OFL 1.1，夸张圆润展示体，适合玩心）、`VT323`（OFL 1.1，DEC VT320 终端像素字，适合 CRT 语境）、`Departure Mono`（OFL 1.1，像素等宽，适合机台界面）、`JetBrains Mono`（OFL 1.1，代码语境的稳妥等宽）、`Source Serif 4`（OFL 1.1，带光学尺寸轴的出版衬线）。以上六款的授权与开源仓库细节为**未核实：凭记忆**，采用前须复核。

**明确列为"要避开的"字体（只能出现在批判文字里，不得进入任何字体栈）**：`Inter`、`Roboto`、`Arial`、`system-ui`、`-apple-system`、`BlinkMacSystemFont`、`Segoe UI`、`Helvetica Neue`、`Poppins`、`Montserrat`、`Playfair Display`。其中 `Poppins / Montserrat / Playfair Display` 虽为 OFL，但因在 AI 生成结果中出现频率过高，**与 Inter 同等对待**（**未核实：凭记忆**，依据是其在高频 AI 输出中的出现印象）。

### D-2 中文搭档（7 款，全部开源或明确免费商用）

| # | 中文字体 | 授权 | 气质 | 与拉丁字体的搭配逻辑 |
| --- | --- | --- | --- | --- |
| C1 | 思源黑体 Source Han Sans / Noto Sans SC | OFL 1.1 | 中性现代黑体，字重齐全，最稳的正文与 UI | 配 F1 / F4 / F5 / F6，做正文与界面；**全批出现 ≤6 次** |
| C2 | 思源宋体 Source Han Serif / Noto Serif SC | OFL 1.1 | 有书写感的宋体，横细竖粗，印刷味 | 配 F2 / F3 / F8 / F9 / F11 / F12，做正文或副标题 |
| C3 | 霞鹜文楷 LXGW WenKai | OFL 1.1 | 楷体骨架、手写温度，非正式但可读 | 配 F2 / F13，做引文、批注、档案手写层 |
| C4 | 朱雀仿宋 Zhuque Fangsong | OFL 1.1 | 仿宋，公文与古籍排印的典型面貌 | 配 F3 / F11，做公文抬头、条款、编号 |
| C5 | 未来荧黑 Glow Sans | OFL 1.1 | 骨架更硬、更几何的黑体，有"机械感" | 配 F1 / F5 / F14，做工业与控制台语境的中文 |
| C6 | 文津宋体 Wenjin Serif | OFL 1.1（发布页需复核） | 书卷气重的宋体，笔画收尾明确 | 配 F8 / F10，做学术档案与长文正文 |
| C7 | 得意黑 Smiley Sans | OFL 1.1 | 高倾斜、粗窄的展示黑体，天生招牌感 | 配 F6 / F2，做中文大标题与价目表头 |

**中文排版三条硬纪律**（**未核实：凭记忆**，属工程经验判断）：(1) 中文正文行高建议 ≥1.75，字距 `0.01em–0.03em`，绝不用拉丁默认的 1.5；(2) 中文标题与拉丁标题混排时，中文首行缩进与标点挤压必须显式关闭或显式设定，不能交给浏览器默认；(3) 中文可变字体子集化必须按实际用字裁剪，落地时给出子集后体积预算（字段 11）。

---

## E 节｜配色弹药库（10 组非 AI 默认配色，含精确 HEX 与出处）

> 使用规则：字段 3 从下表取料或据此改造。每组都给出了"它反的是哪个 AI 默认色"。色号级引用凡属记忆复述的，一律标 **未核实：凭记忆**，落地前须比对实体色卡。

**E-1 凸版新闻纸**｜`#F2EBDD` 背景 62% ／ `#17150F` 正文 26% ／ `#C1272D` 强调 8% ／ `#2B4C7E` 辅助 4%
出处：报纸凸版轮转印刷 + 未漂白新闻纸；朱红近似 Pantone 186 C（**未核实：凭记忆**）。反的是"纯白 `#FFFFFF` 底 + 靛蓝强调"。

**E-2 丝网印荧光橙 × 牛皮纸**｜`#F0E4CE` 背景 55% ／ `#E4572E` 主色 22% ／ `#1B1B1B` 正文 18% ／ `#4E6E58` 辅助 5%
出处：1960–70 年代丝网印刷演出海报（Fillmore 系）与牛皮纸袋；荧光橙为专色油墨 Day-Glo 系（**未核实：凭记忆**）。反的是"紫蓝渐变 + 冷灰"。

**E-3 单色磷光终端**｜`#0C0F0B` 背景 70% ／ `#C9A227` 主色（琥珀）20% ／ `#8A7B4A` 次级 7% ／ `#E8E2CF` 高亮 3%
出处：IBM 5151 / DEC VT 系列单色 CRT 的 P3 琥珀磷光层（**未核实：凭记忆**）。反的是"深色底 + 霓虹紫青"，也反 C-2 第 10 条的蓝紫插值。

**E-4 构成主义红黑**｜`#F5F2EA` 纸色 58% ／ `#141414` 黑 27% ／ `#D5322A` 红 15%
出处：El Lissitzky《Beat the Whites with the Red Wedge》(1919) 与 Rodchenko 海报的双色印刷。反的是"多彩渐变"，它只有两色，靠面积与斜切取胜。

**E-5 孟菲斯 1981**｜`#F3E7D3` 背景 50% ／ `#4EA5D9` 蓝 18% ／ `#F4CE4B` 黄 17% ／ `#E0607E` 粉 15%
出处：Ettore Sottsass 与 Memphis Group 1981 米兰首展的家具/图案配色（**未核实：凭记忆**）。反的是"低饱和莫兰迪 + 玻璃模糊"。

**E-6 包豪斯三原色**｜`#EDEAE3` 背景 60% ／ `#D5322A` 红 15% ／ `#F2C200` 黄 13% ／ `#1B3F8B` 蓝 12%
出处：Bauhaus 1923 年展览明信片与 Herbert Bayer 的印刷作品（**未核实：凭记忆**）。反的是"三色等量 + 圆形柔和"，它用硬边几何与不等面积。

**E-7 浮世绘普鲁士蓝**｜`#E8DCC4` 和纸 52% ／ `#1B3A4B` 普鲁士蓝 26% ／ `#B33A2B` 朱 14% ／ `#2A2A28` 墨 8%
出处：葛饰北斋《神奈川冲浪里》所用普鲁士蓝（进口荷兰蓝），锦绘多色套印。反的是"冷灰蓝 + 白色卡片"，这套蓝带绿相且浑浊。

**E-8 热带主义 1968**｜`#1B7F4C` 绿 40% ／ `#F2B705` 黄 28% ／`#E85D9E` 粉 20% ／ `#2B1B12` 深棕 12%
出处：Hélio Oiticica 与 Tropicália 运动（1968）的装置与海报配色（**未核实：凭记忆**）。反的是"两色渐变 + 灰阶"，它是四色高饱和对撞但不发光。

**E-9 氰版蓝晒图**｜`#123A5C` 底 66% ／ `#E9F1F5` 线稿 22% ／ `#E4B363` 标注 8% ／ `#7A2E1E` 红线 4%
出处：cyanotype 蓝晒法（1842，John Herschel）与工程蓝图；白线是纸基留白而非发光。反的是"发光边框 + 玻璃卡片"。

**E-10 RAL 工业安全色**｜`#1A1A1A` 机壳 62% ／ `#F0CA00` RAL 1023 交通黄 18% ／ `#C1121F` RAL 3020 交通红 12% ／ `#9AA0A3` RAL 7040 窗灰 8%
出处：德国 RAL 工业漆色卡（交通黄 / 交通红 / 窗灰）（**未核实：凭记忆**，需比对色卡）。反的是"霓虹强调色"，工业安全色的对比靠色卡制度而非发光。

---

## F 节｜反面清单：一眼就是 AI 的 15 个视觉套路（生成 Agent 逐条自检，全部禁止）

| # | 套路 | 为什么一眼假 | 替代方向 |
| --- | --- | --- | --- |
| P1 | 紫蓝 / 靛蓝渐变 hero（`#6366F1`→`#8B5CF6`） | Tailwind 默认色板最高频组合，语料众数 | 改用 E 节的油墨/纸张/色卡配色 |
| P2 | 抽象 3D 发光球、流体金属、线框地球当"科技"主视觉 | 条件熵最低的图片答案，中性且不侵权 | 真实摄影 + 抖动/半调，或纯排版主视觉 |
| P3 | `24px` 圆角 + 柔和 drop-shadow 卡片，hover 上移 `4px` | 组件库 `--radius` 与 `shadow-md` 默认值外溢 | 无圆角硬边，或凸版压印/单侧硬阴影 |
| P4 | 毛玻璃吸顶导航 + `backdrop-filter: blur(12px)` | 模板市场标配，C-2 第 17 条点名 | 亚克力实物厚度倒角，或干脆不做吸顶 |
| P5 | 渐变描边文字 / 渐变填充标题 | 生成式工具默认"高级感"手段 | 单一油墨色 + 靠字重与字号建立层级 |
| P6 | Hero + 三张等宽卡片 + Logo 墙 + 评价 + 定价 + FAQ | 模板经济收敛出的平均骨架 | 用 `00` 号文件 B 节 10 种 F 骨架之一 |
| P7 | Emoji 当功能图标（火箭、闪光、锁、闪电一类的表情符号） | 训练语料里最省事的图标替代 | 单一规则绘制的 SVG 图标（线宽/端点写死） |
| P8 | 每个 section 白 / 灰交替铺底 | 无脑分隔手段，C-1 第 6 条点名 | 用纸张底色 + 印刷分区（栏线、折角、页码） |
| P9 | 深色底 + 霓虹紫青强调 + 发光边框的"仪表盘" | Dribbble 小尺寸预览图反馈回路的产物 | CRT 磷光单色，或 RAL 工业色卡 |
| P10 | 全局 `ease-in-out` + 滚动淡入 + 视差三层 | 默认动效指纹，S-4 已把它列入禁止项 | 阶跃/阻尼/逐帧跳变，一个方案只留一个机制 |
| P11 | 网格背景 + 虚线边框 + 玻璃卡片 三层叠加 | "科技感"措辞的视觉同义词 | 真实材质：网点、纸纹、套印错位 |
| P12 | "已服务 10000+ 团队"式假社会证明 + 空话文案 | 无数字无场景，C-2 第 16、20 条 | 写带数字与场景的真实主张句 |
| P13 | 所有元素完美居中 | 视觉决策缺席的默认结果 | 强制不对称：栏宽比、基线偏移、悬挂标点 |
| P14 | 没有真实图片，用大渐变块 + 抽象 SVG blob 顶替 | AI 站点固定病灶，S-4 已点明 | 真实图库图 + 加工流程，或纯排版 |
| P15 | 圆润几何无衬线 + 圆角图标 + 柔和阴影的"友好 SaaS 三件套" | 圆润无衬线是 AI 默认字体栈第三件 | 从 D 节取性格字体，正文与展示分属不同超家族 |

**F 节收尾纪律**：以上 15 条在字段 8「去 AI 味审查点」中必须被**逐条点名反制**，每条写成"它故意反的是 P 编号（P1–P15）→ 具体怎么做 → 跳脱在哪里"。凡某方案对 P1–P15 中任意一条既不规避也不批判性击碎，审查官可直接判不合格。

---

## 本文件自检

- 研究结论：**14 条**（结论 1–7 见 B 节，结论 8–14 见 C 节），每条含主张、证据/案例、来源名称与 URL、对 30 方案的直接指令。
- A 节：AI 味工业化成因 **10 条**，点名 Tailwind `#6366F1` / `#8B5CF6`、Inter 的度量兼容性、组件库默认变量、Figma 模板经济、众数坍缩、A11y 简化、性能话术、小尺寸预览图反馈回路。
- D 节：拉丁开源字体 **14 款**（另列 6 款补充可用），中文搭档 **7 款**，全部标注授权与搭配逻辑；Inter / Roboto / Arial / system-ui 只出现在"要避开的"清单里。
- E 节：非 AI 默认配色 **10 组**，每组 4 个精确 HEX + 面积比例 + 实体出处 + "它反的是哪个 AI 默认色"。
- F 节：一眼 AI 的视觉套路 **15 条**。
- 未核实项：已逐处标注「未核实：凭记忆」，集中在 Pantone / RAL 具体色号、部分字体补充清单的授权细节、中文字体排印参数与个别设计运动的具体作者归属。
- 联网凭证：`web_search` × 6、`web_fetch` × 4（其中 1 次 HTTP 403 被拦截）；来源台账见文件头表格 S-1 至 S-8。
