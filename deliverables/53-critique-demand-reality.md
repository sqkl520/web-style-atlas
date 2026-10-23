# 53 · 需求现实核查（第 2 轮锐评 · 「有人需要这个东西吗？」）

> 核查员：需求现实（demand reality）。纪律：只读，不改仓库源码，不 commit，不运行 `_build/`。
> 本轮问题不是"做得好不好"，而是最根上的一问：**这个仓库回答的是一个有人问的问题，还是一个没人问过的问题？**

## §0 这个仓库自称给谁（自我声明逐句提取）

README 432 行、README-EN 434 行，选型台 `prototypes/_selection/index.html` 128 行。下面把**它对自己用途的全部宣称**逐句钉住。判定口径：**一句声明要么指定了一个"谁 + 在什么时候 + 卡在哪"，要么它只是修辞。**

### 0.1 主声明（README.md 前 40 行，逐句）

| # | 行号 | 原文（逐句引） | 它声称的"谁 + 场景 + 痛点" | 是不是可检验的声称 |
| --- | --- | --- | --- | --- |
| A1 | L7 | *「30 个能跑的风格，不是 30 张配色图。」* | 对立面是"配色图"类站点；没说谁 | 修辞。**这是全仓第一句自我定位，也是唯一一句口号** |
| A2 | L16 | 「**这是一座风格标本库：30 个方案各配一个能直接打开的 HTML 原型，外加 3 个拿来就用的模板。**」 | 定义"是什么"，未定义"给谁" | 可数（30 原型 + 3 模板，实测成立，见 §3.4） |
| A3 | L20 | 「纯静态 —— 不需要构建，不需要后端，任何静态托管直接部署。」 | 隐含"部署的人"；没说他是谁 | 可检验（成立） |
| A4 | **L22** | 「**你手上有一个要上线的站，对方张口就要"高级感"。**」 | **唯一一处指名读者**：手上有一个要上线的站、且对面有"对方"在提要求的人 = 接活的前端/独立开发者/小工作室 | 这是一句**假定的读者画像**，不是证据（详见 0.4） |
| A5 | L23 | 「你翻收藏的设计网站，越翻越眼熟——暖米色底、陶土橙、衬线大标题，和上个月那版没区别。」 | 同上，痛点=灵感网站同质化 | **半可检验**：同质批评的对象是外部画廊，本仓自己被同一批评打中（L300：18/30=60% 落暖浅色带） |
| A6 | L24 | 「不是你没审美，是你见过的样本全是渲染图：它不告诉你 1440 到 390 之间怎么塌，不告诉你长文压不进栅格，也不告诉你照片缺了得重排。」 | **核心差异化声称**：别人给渲染图，我给"塌法/长文/缺图"三种真相 | 可检验（三档真截图 + 真长文 + 真缺图状态，见 §1.6 与替代品对比） |
| A7 | L25 | 「这座标本库存在的全部理由：每个案子都能打开、能跑、能拆到字段。」 | "存在的全部理由"——把**实现特征**（可打开、可跑、可拆字段）当成**存在理由** | **循环**：这是生产标准，不是需求陈述 |
| A8 | L33 / L41 | 「看效果：打开选型台，272 张真截图摊在一页」 | 声称的用法=在选型台里挑 | 可数（272 见 §3.4 实测） |
| A9 | L72–L74 | 选型向导：「五个问题问的是**你的处境**，不是"你喜欢什么风格"：内容量、图片量、要不要扎眼、要不要导流、怕不怕复古」「输出 3 个推荐 + 3 个明确排除」 | **把读者定位成一个"要选一个风格来用"的决策者** | 可检验，但**这五个问题里有 4 个是仓库自身属性**（见 §0.3） |

**L22 之后，README 再没有第二处指名读者。** 全文 432 行里，"你"字出现的句子集中在 L22–L25（7 行）与安装/部署指令（L98、L107、L109、L240、L314、L366）。也就是说：**它对自己读者的正面描写只有 4 行（L22–L25），其余全在描述自己。**

### 0.2 其余用途声称（README 后 400 行 + 英文版）

| # | 行号 | 声称用途 | 提取到的目标人群 |
| --- | --- | --- | --- |
| B1 | L94、L140–L167 | 「模板层：改 12 个变量就是一个站」M01 律所/咨询/软件服务/工作室；M02 餐厅/咖啡馆/民宿/理发/花店；M03 个人作品集/自由职业/摄影师/设计师 | **这是全仓最具体的人群句**——11 类实体行业（L149–L151） |
| B2 | L193–L242 | 「部署四阶段：推到 Pages 只要留一个文件」 | 会把仓库整体推上 GitHub Pages 的人（**把仓库当站点用**，不是当素材用） |
| B3 | L237–L242 | 「阶段 4：只想取用某一个原型」 | 只拿 1 个案子的人——**注意：与"30 个互不相同的标本"这个卖点冲突**（单取一个不需要另外 29 个，见 §2.3） |
| B4 | L246–L266 | 「渲染与验收」`node prototypes/_build/verify-prototype.mjs --all` | 复核者/贡献者，**不是使用者** |
| B5 | L270–L288 | 「只做静态这一件事」数据不出本机、零网络请求 | 有隐私/内网/合规要求的人（隐含：企业内网评估者）。**注意 L272 一句"数据不出本机"——本地 HTML 库天然如此，把它当卖点是自我加冕** |
| B6 | L312 | 「它不是一个设计系统：没有组件库，没有 token 交付……要拿它当设计系统用的人会在第三天失望」 | **它自己排除了最大的一类真实需求**（见 §4.2） |
| B7 | L314 | 「这是一个 80 分的标本库，不是 100 分的成品站。对"要看够多种真实做法才知道自己那个站该长什么样"的人，80 分的标本库比 100 分的成品站有用」 | **README 里第二处、也是唯一一处直接给出人群句的地方**：人群=「要看够多种真实做法才知道自己那个站该长什么样」的人。这是一个**自造的读者**，见 0.4 |
| B8 | L363–L377 | 「反馈与贡献」：什么算 bug、什么算提案、CLA、`_CURRENT-VALUES.md` | 假设存在外部贡献者社区。实测：0 星标 0 issue 0 fork（§3.1） |
| B9 | README-EN L16–L25 | 英文版逐句对译同一套声称（"a style specimen library"、"You have a site to ship, and the client wants 'a premium look'"） | 把 A4 的读者从"对方"具体化成 **the client**——**受众变宽（英语外包者）但痛点同一条，无外部证据** |

### 0.3 选型台文案（`prototypes/_selection/index.html`，逐句）

| 行号 | 原文 | 声称 |
| --- | --- | --- |
| L6 | 「选型台 · 30 个网站设计风格方案」 | 标题即"方案"层，非"模板"层 |
| L7 | meta description：「每个方案配一个按同一口径渲染的可运行原型，含三档视口的真实截图、闸门结果、配色与字体当前有效值」 | **把"同一渲染口径""闸门结果""当前有效值"当成用户可感知的卖点**——这三者是仓库内部质检概念 |
| L20 | 「三十个案，一条渲染口径」 | 主口号：**口径**是产品卖点 |
| L21 | 「选之前先看它实际长成什么样」 | **全仓最接近需求句的一句**：预设存在"先看图再选"的购买式决策 |
| L36–L38 | 「照下面九组问题挑，比按风格名挑管用（**前四组是人话问题，后五组是设计口径与质检状态**）」 | **它承认自己的筛选维度有 5/9 是给生产者看的**，并自注：「下面那组"设计口径与质检状态"是**给做这份图集的人看的**，不是给挑风格的人看的——原来它排在前面，是"五分钟选不出来"的第一大障碍」（L36–L37 注释） |
| L47 | 「如果你觉得可选项看起来都差不多，这就是原因」（暖浅色带 18/30） | 主动自曝同质 |
| L56 | 「**19 个都属于"就要扎眼"**——这一层可选的真没那么多」 | 主动自曝选项稀疏 |
| wizard L（README L72–L74） | 五问=内容量／图片量／要不要扎眼／要不要导流／怕不怕复古 | 见下：**五问里有 4 问的对象是"我的站"，1 问的对象是"这个库"**；但输出是 30 选 3——**30 个供给里做 3 选，其区分度受 §0.3 L47/L56 直接反证** |

**关键自证**：`index.html` L36–L37 那段 HTML 注释，是仓库**自己写下**的"哪些维度是给做这份图集的人看的，不是给挑风格的人看的"。这句话是 §2（谁真的需要 30 个案）最强的内生证据——**它承认了九组筛选中的五组、以及"一条渲染口径"这个主口号，服务的对象是生产者而非使用者**。

### 0.4 声明小结：它的自我声明只有三个可核用途

1. **当选型图鉴用**——"先看图再决定我的站长成什么样"（L21、L25、L72–L74、L314）。
2. **当模板拿走用**——`templates/M01–M03`，11 类实体行业（L140–L167）。
3. **当整站部署用**——推上 Pages 就是一个可访问站点（L193–L217）。

（**没有第四个**：README 从未声称"当学习材料读"、"当数据集喂模型"、"当作品集展示"——但 §1.5、§4 会显示这三条恰好是替代品市场里真实存在、且它更符合的那三个位置。）

## §1 现成替代品市场普查

**估法（先说清算法，免得"重叠%"变成嘴炮）**：把 §0.4 提取出的三个可核用途拆成 4 个维度，每个替代品逐维打 0/0.5/1：

- **D1 供给量**：能不能当场拿到"够多种真实做法"（本仓库主张 30 个）。
- **D2 可运行性**：给的是渲染图/截图，还是能点开能改的代码（本仓库最强的一条，A6/A7）。
- **D3 差异化文档**：有没有"这个风格是什么 / 适合谁 / 不适合谁"的解释（本仓库 12 字段）。
- **D4 挑选交互**：有没有筛选、对比、按处境推荐（本仓库选型台 + 向导）。

**重叠% = Σ(该替代品在 D1–D4 的得分) / Σ(本仓库在 D1–D4 的得分)**，其中本仓库的分按它 README 自己的声称记为满分基准 D1=1、D2=1、D3=1、D4=1（合计 4.0）。这个比值说的是"**它声称要办的差事，被这个替代品办掉了多少**"，不是说质量高低。所有条目都是本轮亲测（可 fetch 到的都附 URL）。

### 1.1 用途一：找风格灵感（画廊／目录类）

| 替代品 | 免费/付费 | 规模（实测） | D1 | D2 | D3 | D4 | 重叠 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Minick Studio StyleCatalog** <https://minick.studio/styles> | 免费（导流到定制建站） | **20 种风格，每种都是"live, working demo"，可把自己的品牌名打进去实时预览**，每种附"为哪类生意最出力"；带 FAQ、比较视图、收藏成 style board | 1 | 1 | 1 | 1 | **≈100%** |
| **HTML5 UP** <https://html5up.net/> | 免费（CC-AT），Pixelarity 付费 $19/80+ | **44 个模板**，逐个挂下载计数：区间 **293,898 – 774,259**，站底"Over **22,174,547** served" | 0.5 | 1 | 0.5 | 0.5 | ≈62% |
| **Godly** <https://godly.website/>（本轮 web_fetch 时被重定向到 `recent.design`）／**Land-book** <https://land-book.com/>（本轮 **HTTP 403**，Cloudflare 拦） | 免费 | 画廊类，收录数千站；**均为截图/外链，不给代码** | 1 | 0 | 0.5 | 1 | ≈62% |
| **Awwwards**、**Httpster**、**Siteinspire**、**One Page Love**、**Exhibita** <https://exhibita.design/trends.html> | 免费/会员 | 趋势统计类给的是**分布数据**（Exhibita 给"17/32 决策项没动过"） | 1 | 0 | 1 | 1 | ≈75%（灵感层） |
| **Astro 官方主题目录** <https://astro.build/themes/> | 免费+付费混合 | 目录首页即列 **17+ 个付费 bundle**：Temlis「50+ 站 + 2,500+ sections / $99」、AeroLaunch「34 themes / $159」、Waida「38+ 模板 / 590+ 版面」、Cosmic「20+」…**一个目录页上的付费主题数就 ≥ 本仓库全部 30 案** | 1 | 1 | 0.5 | 1 | ≈88% |

**这一用途上最狠的一刀是 Minick Studio**：它和本仓库**同一句话级别地**满足 A6/A7——"每个风格都是我们从头做的可交互 demo，不是截图、不是模板"（`minick.studio/styles` 原文："Every style above is a **live, working demo**. Type your business name, watch it land in every one"）。它 20 种风格里至少 12 种与本仓库 30 个美学家族**同名同族**（Minimalism／Swiss／Flat／Bento／Neumorphism／Neobrutalism／Constructivism／Editorial／Maximalism／Big Type／Hand-Drawn／Retro／Y2K／Retrofuturism／Collage／**Riso Print**）。本仓库的 S26/S28/S30 那一族，那边有现成的、能输入你的名字立刻看效果的版本，**而且不需要克隆 180 MB**。

### 1.2 用途二：要能直接用的站（模板／起始站）

| 替代品 | 免费/付费 | 规模（实测） | 与本仓库重叠 |
| --- | --- | --- | --- |
| **HTML5 UP** | 免费 | 44 模板，单模板下载 **29.4 万–77.4 万**；总量 2,217 万+ | **≈90%（对 M01–M03 这一层）**：本仓库模板层就 3 个，它 44 个且全部可下载 |
| **Cruip** <https://cruip.com/> | 付费 $49–$129，Bundle 全库 | 首页原文自报 **「Trusted by 60K+ developers」**；单页可见 **20+ 模板**，HTML/React/Next/Vue/Laravel/Figma 六形态同供 | ≈70%（人群重合：要上线的站；差异：它是 SaaS 向） |
| **ThemeForest** <https://themeforest.net/category> | 付费 | **本仓库自己的 `deliverables/17-mainstream-styles-research.md` L47/L1181 实测引用**：site-templates 下 **Corporate 7,941 条 / Retail 3,707 条 / Creative 3,680 条** | **对 M01（律所/咨询/软件服务）≈95%**：7,941 条同类供给 |
| **Tailwind UI**、**HyperUI** <https://github.com/markmead/hyperui>（**12,267★**，免费） | 付费 / 免费 | HyperUI 是免费 Tailwind 组件与页面集 | ≈60%（组件级更强，风格级更弱） |
| **Start Bootstrap／TemplateMo／Colorlib**（本仓库 01 号 L75 亲自点名过） | 免费 | 数千条量级 | **100%**：17 号 L75 原话"中文技术文章把'直接套用现成模板'（HTML5 UP、Start Bootstrap、Colorlib、WordPress 主题库、GitHub 开源项目）列为最简单粗暴的路径"——**它自己已经写下这是市场上现成的答案** |

### 1.3 用途三：要配色

| 替代品 | 免费/付费 | 规模 | 重叠 |
| --- | --- | --- | --- |
| **Color Hunt** <https://colorhunt.co/> | 免费 | 首页导航列 **50+ 个色相/情绪标签**（Blue…Halloween），按 New/Popular（月/年/全时段）/Random 排；每案 4 色 | 对"配色"这一子需求 **≈100%**，且它给的正是本仓库自贬的那句「不是 30 张配色图」所否认的形态 |
| **Coolors** <https://coolors.co/> | 免费+付费 | 生成器 + 调色板库 + 对比度检查 + 导 CSS/SVG/Figma | ≈90%（多了可再生成与无障碍检查） |
| **Huemint** <https://huemint.com/> | 免费+付费 | **直接在真实 UI 预览上**看配色比例，可锁 AI 生成 | ≈85%——它把本仓库"配色带面积比"这个卖点做成了**交互产品** |
| 本仓库对照 | 免费 | 30 案 ×（README L116）「配色系统（带面积比与情绪）」 | — |

### 1.4 用途四：要字体搭配

| 替代品 | 免费/付费 | 规模 | 重叠 |
| --- | --- | --- | --- |
| **Fontjoy** <https://fontjoy.com/> | 免费（GitHub <https://github.com/Jack000/fontjoy>） | 深度学习生成组合，可锁可改，实时预览可编辑文案 | 对"字体策略"（README L116 字段 4）**≈90%** |
| **Adobe 字体组合器** <https://typekit.com/> / fonts.adobe.com pairing | 订阅 | 人工策展 + 授权一体化 | ≈80% |
| **Google Fonts** 组合器 | 免费 | 本仓库 17 号 L728 自报规模：**1,826 字族 / 累计 50 万亿次浏览 / 覆盖 5,000 万站点** | ≈85% |
| 本仓库对照 | 免费 | 48 个自托管 CSS + 925 个字体文件（实测 31.2 MB） | — |

### 1.5 用途五：要"设计主张／教学"

| 替代品 | 免费/付费 | 规模 | 重叠 |
| --- | --- | --- | --- |
| **Refactoring UI** <https://refactoringui.com/> | 付费书（$99） | 面向开发者的设计决策教材，销量级六位数（作者自报） | 对"12 字段设计主张"**≈70%**（它给规则，不给 30 个成品） |
| **Laws of UX** <https://lawsofux.com/> | 免费/付费书 | 一屏一条定律；**本仓库 19 号 L321 亲自把它引为选型台的理论依据**（Hick's Law） | 概念层≈100%，产物层 0 |
| **Design-system 文档站**：<https://sds.figma.com/>（figma/sds，866★）、Material 3、Carbon、Polaris、Radix（19,419★） | 免费 | 组件 + token + 用法 + 反例 | 对"字段化规格"**≈75%**；但本仓库 README L312 **主动否认**这一类定位 |
| **VikiLinks 九种风格** <https://vikilinks.com/blog/web-design-styles> / **Empire UI 41 种 CSS UI 风格** <https://empire-ui.com/blog/ultimate-guide-css-ui-styles-2026> | 免费 | **41 种风格**，每种带评分 + 签名 CSS + GPU 成本分层 + 可访问性排名 + 按行业选型表 | **≈85%**：它比本仓库的 30 案**多 11 种**，且每种直接给可抄 CSS |

### 1.6 普查汇总：五条声称用途被谁覆盖、覆盖多少

| 声称用途（§0.4） | 最强替代品 | 它办掉的比例 | 本仓库剩下的独有价值 |
| --- | --- | --- | --- |
| 当选型图鉴用 | **Minick Studio StyleCatalog**（20 种 live demo） | **≈100%**（且免克隆、可输入你的域名即时看） | 只剩「30 > 20」「双语」「闸门」 |
| 当模板拿走用 | **HTML5 UP**（44 个，单个下载 29–77 万） | **≈90%** | 只剩「无第三方依赖、系统字体栈」 |
| 当整站部署用 | **Astro 主题 bundle**（一页目录 ≥17 个付费包，50+ 站/包） | **≈88%** | 只剩「零配置、不要构建」 |
| 配色 / 字体 | Color Hunt / Coolors / Huemint / Fontjoy | **≈90% / ≈90%** | 只剩「与案绑定、不是孤立色卡」 |
| 设计主张 / 教学 | Empire UI（41 种）／Refactoring UI／各类 DS 文档站 | **≈75–85%** | 只剩「12 字段 × 30 份的结构化规格」 |

**五条用途、22 个替代品逐一比对后，唯一没有被上面任何一家同时满足的，是这一组四条的合取：30 个互不重复的美学家族 × 每案一个可运行完整原型（真文案真素材真错误态） × 机械闸门复核 × 中英双语。**

**但这四条合取本身就是 §2 要审的东西——"没人同时做"到底是缝隙，还是没人要。**

## §2 谁真的需要这 30 个案（niche 判定）

### 2.1 先把"没人同时做"这个事实钉住（本轮实测）

对"30 个互不相同 + 每案可运行完整原型 + 机械闸门 + 双语"这个四条合取，GitHub 检索（`api.github.com/search/repositories`，按 stars 排序，本轮逐条实测）：

| 检索式 | 命中总数 | 最接近的结果 | 它是不是同一件事 |
| --- | --- | --- | --- |
| `runnable prototype style library css gate` | — | 无匹配形态 | 否 |
| `web design styles` | 9,406 | markmead/hyperui **12,267★**（Tailwind 组件集）、lowlighter/matcha 1,942★（语义样式库）、figma/sds 866★（设计系统示范） | **否**：全是组件/token 层，不是"30 种互不相同的完整站点原型" |
| `design system showcase html css prototype` | **8** | 8 条全是个学生作业（School-Library、InventoryMS、RIMS…），stars 0–1 | **否**：这个检索式在 GitHub 上几乎不存在生态 |
| `landing page styles` | 22 | 最高 251★（教程仓） | 否 |
| `ui design trends collection` | 15 | 最高 85★（Flutter UI kit） | 否 |
| `design gallery site:github.com` | **0** | — | 空 |

**结论：这个合取确实没有人做。** 但要区分两种解释——**"缝隙"与"空洞"的判据不是有没有人做，是做完之后有没有人用。** 见 §3。

### 2.2 它指定的那个人群，被三份内生材料否掉

README L22 指定的读者=「手上有一个要上线的站，对方张口就要"高级感"」的人；README L314 又加了一句人群定义=「要看够多种真实做法才知道自己那个站该长什么样」的人。对这个人群：

1. **替代品零成本**（§1.1）：Minick `https://minick.studio/styles` 给 20 种风格、每种**从头做的可交互 live demo**、可直接把店铺名打进去看效果、免注册免克隆；本仓库要求先 `git clone --depth 1` 一个 **177.2 MB**（实测 tracked 字节 185,777,474）的仓库。**"要上线的站"的人不会为"看够多种真实做法"付 177 MB。**
2. **它自己做过一次走查，结论是这条路走不通**：`deliverables/48-critique-outsider-walkthrough.md` L59–L62（咖啡店老板人设，30 分钟）——「**我最后要用的是 README 里最被轻描淡写的那一层（模板），最被吹的那一层（30 案＋闸门＋272 图）对我产出为零**」；L62「用 M02 的心智路径成立，**用 S06 的心智路径不成立**」；L70「一个 30 分钟的选型流程，**第 12 分钟就断了线**」（`_selection/` 全目录 grep `templates|M0` = 0 命中，选型流程的终点是回到起点）。
3. **它自己写过反证条款，且从未执行**：`deliverables/19-redteam-mainstream-premise.md` L42 定义过判死条件——「**拿出 5 名非设计岗真实用户做 30 秒任务测试**」；L258/L260 给出方案与成本（测试 0.5–1 天含招募）。本轮在 `deliverables/*.md` 全文检索"已测试/测试结果/名用户/访谈/问卷/招募"，**没有任何一份文件报告这 5 个人被找过**；反而 `29-critique-homogeneity.md` L447 承认「**"用户选不出来"的心理量没有被测量……本审查没有问卷或可用性数据支撑那一步**」，`prototypes/_selection/wizard.js:190` 承认推荐权重「**它是拍的，没有经过真人回放测试**」。

→ 人群（1）不成立：**唯一被指名的用户，被唯一描述他的那 4 行 README 之外的一切证据反对**，包括仓库自己的。

### 2.3 三个"拿一个案子"的场景也自相矛盾

README L237–L242「阶段 4：只想取用某一个原型」把"只拿 1 个"写成正当用法。但：
- 单取一案时，另外 29 案的"互不相同"对这个人**不产生任何价值**（他不比较，他要一个能改的站）；
- 该场景的真实替代品就是 §1.2 那批（HTML5 UP 44 个模板、单模板下载 **29.4 万–77.4 万**，44 个合计 **21,477,067** 次下载，站底自报 "Over 22,174,547 served"——**免费、单文件即走、无 177 MB、无字体连带依赖**）；
- 而 `48` 号 L107 实测：30 个原型目录里 `git ls-files "prototypes/S*/README.md"` = **0**，S06 的 `style.css` 有 **83 个自定义属性**，"请一并带上 `prototypes/_fonts/`"只写在根 README 部署阶段 4（L239–L240）——**"取用某一个原型"这条路径是它文档里最弱的一条**。

### 2.4 唯一站得住的 niche：不是"人来看"，是"机器来用"

把合取条件换成生产视角，这四条立刻从"装饰"变成"规格符合项"：

| 本仓库特征 | 对"浏览者" | 对"生成/评测循环" |
| --- | --- | --- |
| 30 个**互不重复**的美学家族（L121） | 用不上（他只要 1 个） | **是条件语料的硬要求**：风格彼此可区分，采样才不坍缩 |
| 每案 12 字段结构化规格（`_specs/` 31 份 330,333 B） | 读不完（48 号 L45：正文 1,866 字/案，"适用场景"在 2,654 px 处） | **天然 schema**：字段名即约束项，可直接喂 prompt / 做检索键 |
| 机械闸门（`verify-prototype.mjs --all`、FAIL/WARN/错误码） | 看不懂（48 号 L88：`mono`/`palette-cream`/`MIR-47` 无一处解释，grep `CONTRACT` = 0 命中） | **就是判别器**：可自动拒绝 AI 味产出 |
| `02-anti-ai-rules.md` 91,632 B 规则法典 | 读者不会去读一部法典 | **就是评测标准的实现**（L164 那串禁令本身就是可执行清单） |
| 中英双语 | 是"既定约定"（README-REWRITE-NOTES L37 自己这么说） | 跨语言泛化测试 |

而这个人群**在 2026 年是真实存在且在长**，本轮实测的同类占位：

- `bryntay/a1-mcp`（GitHub API 实测：1★，created 2026-08-13，pushed 2026-10-23）——描述逐字：**"A1 Gallery MCP server — curated real website designs, sections, pages, fonts and measured design tokens for AI agents."**（**同一件事，做成 MCP 供 agent 消费**）
- `TonnyWong1052/UI-Prompt`——**419★ / 37 fork**，created 2025-11-13，描述："UI 风格提示模板库，可帮助开发人员使用 AI 生成更高质量、更一致、以设计为导向的 Web 界面"——**这条 star 数就是该人群规模的唯一实测下界（几百人级）**
- Astro 官方目录里在售商品直接把买家写成模型：`Temlis All Access`——"**50+** professionally designed Astro websites and **2,500+** sections, ready to make yours **with Claude, ChatGPT or Cursor**"；`Themefisher Astro bundle`——"40+ production-ready premium Astro themes… **with Agent skills** 🚀"（`https://astro.build/themes/`）
- `Eskapeum/website-design-veteran`——"Claude Code plugin: Conversational website design… 2025-2026 design trends"

**niche 判定（可数人群，不许大词）**：

> **有 niche，但只有一个人群：**「**在自己机器上用 Claude Code / Cursor 一类 agent 生成落地页，需要一个风格条件语料 + 一个能自动判"这版是不是 AI 味"的校验器的人**」——即 **agent 工作流搭建者本人**（特征：会写 mcp 配置、在找 style corpus、拿 taste-skill / impeccable 这类规则集的人）。规模的可数代理：`UI-Prompt` 419★、`a1-mcp` 1★，加上 `02-anti-ai-rules.md` 引用的那两套外部规则集（taste-skill、impeccable）各自的社区，**量级是几百到几千人，不是"设计师"这个几百万人的大词**。
>
> **并且：这个 niche 与本仓库 README 声称的 niche 不是同一个**。它把自己卖给"要上线的站的人"（§0.1 A4），却按"给 agent 用的语料+判别器"的形状生产（本节表格）。**"感觉有些不对"最可能的根源就在这条错位上——产品形状与产品叙事来自两个不同的消费者。**

## §3 内生证据 vs 外部证据（循环自证检验）

### 3.1 外部证据：全部为零，且可复核

`https://api.github.com/repos/sqkl520/web-style-atlas`（本轮 PowerShell 直连实测；`web_fetch` 到该域名报 "resolves to a non-public IP"，非 GitHub 侧问题）：

| 指标 | 实测值 |
| --- | --- |
| **stars** | **0** |
| **forks** | **0** |
| **watchers** (`subscribers_count`) | **0** |
| open issues（`?state=all` 全量） | **0** |
| releases / tags | **0 / 0** |
| `homepage` | **空字符串**（Pages 站点实为在线，见 3.3，但它自己没登记） |
| `topics` | **空** |
| created_at | 2026-10-19T16:08:50Z |
| pushed_at | 2026-10-23T20:12:05Z |
| contributors | **1 个**（`sqkl520: 34`）；`git shortlog -sne` 独立复核：**33 commits，作者仅 `sqkl520 <sqkl520soap@gmail.com>`** |
| traffic（referrers/views） | HTTP 401，需仓库所有者鉴权 → **外部不可得**（GitHub 只向 owner 开放；这不是隐瞒，是平台规则） |

账户面补充：`api.github.com/users/sqkl520` → `public_repos=9, followers=2`，9 个仓全部 0–3★，其中 **5 个建于 2026-10-14 至 10-22 这 9 天内**（`Minecraft-server-plugin-PerfScope`、`shapez-ai-bridge`、`papermc-docs`、`rea-handbook`、`web-style-atlas`）。

> **一句话**：**没有任何一条外部证据支持"有人需要它"。** 需求侧的四个可观测变量（star / fork / issue / watcher）实测全为 0，作者是 1 人，生命周期 4 天。

### 3.2 内生证据：所谓"19 份自我审计"的循环链拆解

先纠数：任务书说"19 份自我审计"。本轮 05:10 实测 `deliverables/*.md` 共 **64 份 / 3,990,161 B**（我写本卷期间 `47`/`48`/`52` 三份被其他 agent 改写，数字在动）。按文件名分类：**字面含 `audit` 的 15 份**（与"19 份"最接近的可复现口径）；**广义自审／锐评／辩护类 45 份 / 2,543,680 B**（匹配 `audit|critique|red-team|redteam|reconcil|rebuttal|defense|convergence|positioning|homogeneity|promises|portability|verify`）；**向外看的只有 3 份 / 204,268 B**（`01-research-brief`、`17-mainstream-styles-research`、`48-critique-outsider-walkthrough`）。

**45 份自审文档（2.54 MB）对着 61 个原型源文件（1.63 MB），比值 1.56 : 1。** 而"向外看的 3 份"占 `deliverables` 总字节 **5.1%**。

循环链逐环（每一环的"证据"都由同一套系统生产）：

| 环 | 声称 | 它用的证据 | 该证据的性质 |
| --- | --- | --- | --- |
| ① | "30 个互不相同"（L121） | `03-uniqueness-matrix.md` 38,811 B | 矩阵由**同一 Lead** 定义并填写 → **自证** |
| ② | "没有 AI 味"（L164 禁令） | `02-anti-ai-rules.md` 91,632 B + `09-audit-anti-ai-scores.md` 194,382 B 打分 | 规则与打分者同源 → **自证** |
| ③ | "26 案闸门 FAIL=0"（L119） | `verify-prototype.mjs` + 自家 `12-tool-rule-audit-30*`（同名 5 个版本：base/FULL/retry5/v2-authoritative/v4，共 379,590 B） | 尺子与量的人同一个；**5 次重跑本身就是尺子不稳的自供** |
| ④ | "我们诚实，边界都写了"（L359「没有一条断言是估的」） | `29-critique-homogeneity.md`、`30-critique-assets-license.md`… 等自批文档 | **把自我披露的规模当成可信度证据**——披露的是缺陷，不是需求 |
| ⑤ | "所以它有稀缺性" | ①–④ 全部 | 结论建立在 ①–④ 上，**链条闭合，外部输入为 0** |

**判据（一句话可核）**：**这套文档里被反复"证明"的命题，全部是"我们做得是否合乎我们自己定的标准"；没有一条被证明的命题是"有人要它"。** README L355 的原句最能说明：**「deliverables/ 里从 00 号约束简报排到 40 号，中间是研究简报、规则法典、红队锐评、以及一批为既有结论辩护的复审」**——实测有 **5 份文件直接是"为既有结论辩护"**（`33-critique-rebuttal`、`35-…differentiation-defense`、`36-…bench-defense`、`37-…completeness-defense`、`38-…doc-intent-defense`）。**一个从未面向外部读者的项目，不需要"辩护"。** 辩护的对象只可能是它自己的前一份文档——这就是循环链的形状。

**唯一两处真正的向外看**（本轮 grep 出的全部例外）：
1. `17-mainstream-styles-research.md` 129,066 B、**199 条真实 URL**（ThemeForest 分类条目数、W3Techs 框架占有率、Squarespace 官方指南、Empire UI 41 种风格、Minick 20 种风格…）。**这是全仓最强的一份外部证据——而它的结论是"大众模板该怎么做"，服务的是 M01–M03 那一层，与"30 案标本库"这个主打无关。**
2. `48-critique-outsider-walkthrough.md` 16,056 B，一份"路人 30 分钟走查"。**但 L4 自报身份：「作者身份：第一次路过的陌生用户，30 分钟预算」——它是被指派扮演路人，不是招募来的**；走查中"实测"是真的（自建 server、无头 Chrome、iframe 量几何），但**人设不是抽样**。它给出的核心结论（§2.2 引）恰好否证主打定位。

**最硬的一条循环证据**：`deliverables/README-REWRITE-NOTES.md` L50 逐字：
> 「| 6 和 X 的关系（竞品对比表） | **删** | 5/10 命中，但本项目**没有真实竞品**可核。」

**这一句是整条循环链的闭合点。** 市场普查（§1）实测：**仅 `minick.studio/styles` 一家就 100% 重叠，HTML5 UP 44 个模板合计下载 21,477,067 次，Astro 官方目录首页一个屏上就列着 17+ 个付费 bundle（Temlis 50+ 站、AeroLaunch 34 主题、Waida 38+ 模板）**——竞品多到能列成表。它删掉竞品表给出的理由是"**没有真实竞品可核**"，而它的 README L359 又写着"**这里没有一条断言是估的**"。**这两句不能同时为真。** 竞品表被删不是因为无法核实，是因为**从未去核实**；而"从未去核实"正是需求侧唯一缺失的动作，被写成了一条"红线纪律"。

同页 L200 的另一句是同一机制的第二证：「**0 star 不放 Star History**」——它准确地知道自己没有分发，但把这个事实处理成"不放徽章"，而不是"这个用途没人要"。

### 3.3 一项为它说话的外部事实（必须记账）

Pages 站点**真实在线且完整**（本轮实测）：`https://sqkl520.github.io/web-style-atlas/` → HTTP 200（title「网站设计风格图集 · 30 个方案」）、`prototypes/_selection/index.html` → 200、`data.js` → 200 / 261,815 B。
**但两份 README（432 / 434 行）里检索 `sqkl520.github.io` = 0 命中**——**一个能把 177 MB 静态站推上线的项目，没在文档里给出那个已经上线的 URL**。这不是疏忽，是需求侧的硬指标：**发布（deployment）完成了，分发（distribution）一步没做。** `48` 号 L39 记录了同一个事实的读者视角：「一个纯静态站点，Pages 已经开好了，却不给我链接？那我到底要不要先 clone 180MB」。

### 3.4 顺带复核：README 的内生数字基本诚实（这点要给分）

| README 声称 | 实测 | 结论 |
| --- | --- | --- |
| L101「约 180 MB」 | tracked 185,777,474 B = 177.2 MB | ✅ 成立 |
| L46「272 张」 | `git ls-files "prototypes/S*/.inspect/*.jpg"` = 272 | ✅ 成立 |
| L329「48 个样式表」 | `prototypes/_fonts/css/*.css` = 48 | ✅ 成立 |
| L355「从 00 号…排到 40 号」 | 已到 **53**，且缺号 **18/42/43/44/46** | ❌ 过期（文档链自己在长） |
| L312「不是设计系统」 | 无组件库/无 token 交付 | ✅ 成立（也是它自己排除最大需求的一条） |

（本表不构成对"被 48 号指出的 `5818 种 vs 2 种` 口径问题"的复核——那是 `48` 号与文档精度审查的范围，本卷不重复。）

## §4 若需求不成立，它作为什么成立

三个候选身份，逐个按"该身份的真实市场是否存在 + 本仓库是否满足该身份的验收标准"打分。**关键事实：这三条身份 README 一个都没有声称过（§0.4），但其中两条它比它声称的三条做得更好。**

### 4.1 候选一：教材／课程读物 —— 不成立

教材的验收标准是**可讲授性**：线性叙事、练习、答案。本仓库给的是 30 份并列规格 + 45 份互相推翻的审计（`12-tool-rule-audit-30` 一个文件有 **5 个版本**：base / FULL / retry5 / v2-authoritative / v4；README L355 自称"为既有结论辩护的复审"）。学习者要的是"一条被证伪的路径的教训"，这里有的是"未收敛的路径的现场"。**它是教材的原材料，不是教材。** 且教学这条赛道上 `Refactoring UI`（付费书、六位数销量）与 `Laws of UX` 早已占位（§1.5）。

### 4.2 候选二：AI-taste 语料／判别器资产 —— 成立度最高

把 §0 的三个"用户用途"全部撤掉，换成机器消费视角，本仓库的每一项"过度工程"立刻变成规格符合项：

| 被批评的特征 | 在"选型图鉴"叙事下 | 在"语料/判别器"身份下 |
| --- | --- | --- |
| 30 案互不重复的美学家族（L121） | 没人比较 30 个（48 号实测：首屏 0 行可看） | **条件语料的基础要求**：可区分才能防采样坍缩 |
| 12 字段规格 × 30（`_specs/` 330 KB） | 读不完（单案正文实测 1,866 字） | **天然 schema**，字段名直接进 prompt |
| `02-anti-ai-rules.md` 91,632 B 规则法典 | 读者不看 | **就是判别规则的实现**（README L164 那串禁令本身就是可执行清单） |
| 机械闸门 + FAIL/WARN + 错误码 | 看不懂（`_selection/` grep `CONTRACT`=0） | **就是 CI**：产出可自动拒收 |
| 272 张三档真截图 + 像素统计 | "对我毫无意义"（48 号 L42） | **就是回归基线**（视觉 diff 数据集） |
| 双语 | 只是"既定约定"（README-REWRITE-NOTES L37） | 跨语言泛化测试集 |

外部需求信号也真实存在（§2.4）：`TonnyWong1052/UI-Prompt` 419★（风格提示模板库）、`bryntay/a1-mcp`「measured design tokens **for AI agents**」、Astro 目录里在售的 Temlis 明写 "**ready to make yours with Claude, ChatGPT or Cursor**"、Themefisher 明写 "**with Agent skills**"。**这个人群在 2026 年正在被商业化定价。**
**但本仓库离合格判别器还差硬一步**：`render-scheme.mjs` 依赖被 `.gitignore` 排除的 `tools/`（README L251 自认"只在本项目开发机上可直接跑"）、`texture-job.json` 只 12/30 入库（L403）、4 案仍有 8 条 FAIL（L296）。**作为语料它可用，作为可复算判别器它目前不可复算。**

### 4.3 候选三：作品集（"我能做出 30 个互不相同的完整原型"的证明） —— 部分成立

证据链完全符合作品集逻辑：单人 33 commits、4 天、177 MB、45 份自审——**这是"展示工艺上限"的形状，不是"服务用户"的形状**。作品集身份的验收标准是"看了之后相信作者的能力"，本仓库超额完成（每条数字可回指文件，README L359）。它不成立的地方：没有任何分发（0 star、README 里不链已上线的 Pages、`followers=2`），而**作品集的本质恰恰是分发动作**。账户面（9 仓 5 天内新建、主题横跨 Minecraft 插件/shapez/RE 手册/实习门户）更像**多项目实验台**而非单一作品陈列。

### 4.4 真实需求 = 生成它的练习本身（第四种，也是 §5 的主答案之一）

`00-BRIEF-AND-CONSTRAINTS.md` L1–L17 暴露了起点：**不是从问题出发，是从参数出发**——"项目类型（全选）／品牌调性（全选，7 种各至少 3 案）／目标用户（全选 7 类）／必须避免（无）"。一个把所有枚举值都勾"全选"的需求单，**在真实需求访谈里不可能出现**；它的功能不是约束产品，是**约束生成过程**（保证 Agent 不敢偷懒同质化）。README L314「这是一个 80 分的标本库」与 L25「这座标本库存在的全部理由」互相指认，理由链上没有外部读者。
**所以最诚实地说：本仓库回答的问题不是"有人需要这个"，而是"一个多 Agent 系统在冻结约束下最多能产出什么"——而这个问题有且只有一个回答者：造它的人。** 对这个真问题，它回答得极好；这个问题也天然不需要 star。

## §5 裁定

### 5.1 三种可能，各一句话 + 概率

| 判定 | 一句话 | 概率 |
| --- | --- | --- |
| **(a) 需求成立但被叙事埋住** | "先看图再看站怎么塌"的需求是真的，且 17 号文档已经替它证明了方向——**但被 §1 普查打脸：Minick/HTML5 UP 免费且免克隆地把同一差事办掉了 ≥90%，"埋住"说不通，被埋住的不是需求是差异。** | **15%** |
| **(b) 需求是编的，真实需求 = 生成它的练习本身** | L22 的读者画像无外部证据、5 人测试在自家反证条款里定义却从未执行、star/fork/issue/watcher 实测全 0、而 00 号简报"全选式需求单"证明起点是约束不是问题——**"30 个能跑的风格"回答的是"能不能造出来"，不是"有没有人要"。** | **55%** |
| **(c) 它是别的东西被错误包装** | 同一批事实在"AI-taste 语料/判别器资产"（§4.2）身份下从缺陷变成规格符合项，且该市场已有人用星级与美元定价（UI-Prompt 419★、Temlis $99）——**它按 agent 语料的形状生产，按选型图鉴的形状售卖。** | **30%** |

**我的答案：(b) 为主、(c) 为真的残值——写成一句就是：需求是编的；但它无意中攒出了一份有真实转售价值的 agent 语料与判别规则资产，而这层价值从未被 README 声称。**
概率给 (b)>(c) 的依据：(c) 要求"包装错误"是被动的，但 `README-REWRITE-NOTES.md` L50 显示**删除竞品对比表是一次主动决定**（"没有真实竞品可核"），而 §1 证明竞品一查就有——这说明叙事层对"市场上有没有同类"这个问题**主动放弃过一次核实**。主动放弃核实的定位叙事，源头只能是内部生成（b），不是外部错配（c）。

### 5.2 最硬的一条证据

> **`deliverables/README-REWRITE-NOTES.md` L50：「6 和 X 的关系（竞品对比表）｜**删**｜5/10 命中，但本项目**没有真实竞品**可核。」**

硬在三点，全部可当场复算：
1. **它自己说过"没有竞品"**——而本卷 §1 实测：`minick.studio/styles` 免费给 20 种风格的**可交互 live demo**（100% 重叠）、HTML5 UP 免费给 44 个模板（单模板下载 29.4–77.4 万次、合计 21,477,067）、Astro 官方目录首页一屏就列 17+ 个付费 bundle。**竞品不需要"核查日期"就能核实，是没人去核。**
2. **同一 README 的 L359 写着「这里没有一条断言是估的」**——两句在同一仓库内互斥：断言可以全部实测，**"没有竞品"这句关键断言却既没实测也不成立**。需求侧的纪律缺口恰好开在唯一没人问过的方向上。
3. **同一批 199 条外部 URL 已经在 `17-mainstream-styles-research.md` 里躺着**（ThemeForest 7,941/3,707/3,680 条分类计数、Empire UI 41 种风格、Minick 20 种风格——第 42 条就是它）：**核实竞品所需的全部材料是仓库自有的，删表时触手可及。** 它拿着弹药，决定不看战场。

**推论（对用户那句"感觉还是有些不对"的直接回答）**：不对的不是质量，是**方向性自证**——45 份文档、1.56:1 的审计/代码比、"5 人测试"被写成条款又被遗忘、"没有竞品"被写成红线——所有动作都在回答"我们做得对不对"，没有一个动作回答"有没有人要"。**这个项目不是失败于没人需要，是成功于不需要任何人：它的需求单（00 号，全部'全选'）是为生成过程写的，不是为读者写的。** 要让它面向外部，唯一必须补的动作是 README-REWRITE-NOTES L50 删掉的那一节——现在本卷 §1 已把那张竞品表做了出来，直接可用。

## 附：本卷引用的外部 URL 清单（全部本轮亲测；fetch 失败处已注明）

**市场替代品：**
- https://html5up.net/ （200：44 模板、逐个下载计数 293,898–774,259、合计 21,477,067、"Over 22,174,547 served"）
- https://cruip.com/ （200："Trusted by 60K+ developers"，$49–$129）
- https://astro.build/themes/ （200：首页 17+ 付费 bundle；Temlis "with Claude, ChatGPT or Cursor"；AeroLaunch $159/34 themes）
- https://minick.studio/styles （200："Every style above is a live, working demo… Type your business name"，20 种风格）
- https://colorhunt.co/ （200：50+ 标签）
- https://fontjoy.com/ （200：免费，neural pairing）
- https://github.com/Jack000/fontjoy
- https://land-book.com/ （**403，Cloudflare**，未取得规模）
- https://godly.website/ （**跨源重定向至 recent.design，未追**）
- https://lawsofux.com/ （**跨源重定向未追**；仓库内 19 号 L321 引用过 lawsofux.com/hicks-law/）
- https://themeforest.net/category （经仓库自有 `17` 号 L47/L1181 转引：Corporate 7,941 / Retail 3,707 / Creative 3,680）
- https://webcode.tools/statistics/css 、 https://fosspost.org/css-statistics （经 `17` 号转引 W3Techs：Bootstrap 13.4%=框架用户 74.9%）
- https://empire-ui.com/blog/ultimate-guide-css-ui-styles-2026 、 https://vikilinks.com/blog/web-design-styles （`17` 号 L1148/L1146 转引：41 种风格 / 9 种风格）

**GitHub API（web_fetch 被拦"non-public IP"，PowerShell `Invoke-RestMethod` 直连成功）：**
- https://api.github.com/repos/sqkl520/web-style-atlas → **stars 0 / forks 0 / watchers 0 / open_issues 0 / topics 空 / homepage 空**
- https://api.github.com/repos/sqkl520/web-style-atlas/contributors → **1 人（34 次提交）**
- https://api.github.com/users/sqkl520 → public_repos 9、**followers 2**、created 2025-03-02
- https://api.github.com/search/repositories?q=… （各检索式 total 与 top 命中见 §2.1 表与 `53-scratch/measurements.md` R7）
- https://github.com/markmead/hyperui （12,267★）｜ https://github.com/TonnyWong1052/UI-Prompt （419★）｜ https://github.com/bryntay/a1-mcp （1★，2026-08-13 建）

**本仓库线上站（为它记账的外部事实，但 README 从未链接）：**
- https://sqkl520.github.io/web-style-atlas/ （200）｜ https://sqkl520.github.io/web-style-atlas/prototypes/_selection/index.html （200）｜ …/data.js （200，261,815 B）

**仓库内证据（本卷引用的关键行）：**
- [README.md](README.md) L7/L16/L22–L25/L33/L72–L74/L101/L116/L119/L121/L140–L167/L237–L242/L251/L296/L300/L312/L314/L355/L359/L403
- [README-EN.md](README-EN.md) L16–L25
- [prototypes/_selection/index.html](prototypes/_selection/index.html) L7/L20–L21/L36–L38/L47/L56/L83 · [wizard.js](prototypes/_selection/wizard.js) L190
- [deliverables/00-BRIEF-AND-CONSTRAINTS.md](deliverables/00-BRIEF-AND-CONSTRAINTS.md) L1–L17
- [deliverables/19-redteam-mainstream-premise.md](deliverables/19-redteam-mainstream-premise.md) L42/L258/L260
- [deliverables/29-critique-homogeneity.md](deliverables/29-critique-homogeneity.md) L447
- [deliverables/48-critique-outsider-walkthrough.md](deliverables/48-critique-outsider-walkthrough.md) L4/L39/L59–L62/L70/L76/L79/L88/L107
- [deliverables/README-REWRITE-NOTES.md](deliverables/README-REWRITE-NOTES.md) **L50**/L200
- 草稿与原始输出：[deliverables/53-scratch/measurements.md](deliverables/53-scratch/measurements.md)

---

## 附 · Lead 验收批注

最硬证据的两句对撞**位置需要修正后才成立**：「没有一条断言是估的」不在 NOTES L359，而在 **README.md:359 / README-EN.md:362**；NOTES L50 的"没有真实竞品可核"命中。两句仍然对撞（同一仓库内"无竞品可核"×"没有一条断言是估的"），引文换位置后成立。
GitHub API 我独立复核：stars/forks/watchers/issues = 0/0/0/0，created 2026-10-19、pushed 2026-10-23，一致。
README L355"排到 40 号"确过期（现有编号到 54、缺 18/42/43/44/46）——入 T0 文档批。
裁定 (b)55%/(c)30%/(a)15% 接受为⑳ 收敛的主轴之一；§1.6 竞品表搬回 README（你已给现成件，搬即可）。