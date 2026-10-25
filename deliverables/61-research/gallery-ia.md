# 检索报告：风格图集的信息架构与可达性

> 调研对象：`D:\Web\style`「网站设计风格图集」选型台（30 方案 + 11 组筛选 + 44 行业词反查 + M01/M02/M03 三模板）
> 调研时间：2026-10-26　调研方式：直接抓取各站 HTML / 官方 CSS / 官方 sitemap，逐站抄录分类轴与取值
> 原则：只写抓到的。抓不到的一律进「§0.2 未能取证清单」，不推测网站特性。

---

## 0. 先划清可信度边界

### 0.1 本报告的一手证据强度

| 等级 | 含义 | 本报告中的例子 |
|---|---|---|
| A｜直接抄录 | 抓到 HTML/DOM 文本、官方 CSS 变量、官方 sitemap | Webflow 26 个行业分类及计数、Squarespace 63 个行业 slug、Awwwards 27 个 Category 选项、Httpster 19 style + 29 type、`--minthumb: 250px` |
| B｜读官方文章正文 | 抓到了 NN/g 文章全文段落 | NN/g 零结果三准则、渐进披露、分类命名五条、图墙 vs 列表 |
| C｜仅知存在 | 只确认了页面可达，未取到分类结构 | Mobbin、recent.design、Framer（只取到树形标签文本） |

### 0.2 未能取证清单（本报告**不对这些站点做任何特性断言**）

抓取失败，原因如实记录：

| 站点 | 尝试的 URL | 结果 |
|---|---|---|
| SiteInspire | `https://www.siteinspire.com/`、`/websites`、`/about`、`/styles` | HTTP **429** + Vercel Security Checkpoint（人机验证） |
| Land-book | `https://www.land-book.com/`、`/websites`、`/blog`、`/about`、`/feed` | HTTP **403** + Cloudflare「Just a moment…」 |
| Godly | `https://godly.website/`、`/popular` | 连接超时 / DNS 无法解析 |
| Behance | `https://www.behance.net/` | 连接超时 |
| ThemeForest | `https://themeforest.net/category/site-templates` | HTTP **403** |
| Dribbble | `https://dribbble.com/shots/popular/web-design` | HTTP 202，响应体 0 字节（JS 墙） |
| Tailwind Plus | `https://tailwindcss.com/plus/ui-blocks`、`/plus` | 被重定向到登录页，付费墙 |
| Refero | `https://refero.design/` | 只返回 4 KB 空壳，内容由 JS 渲染 |
| Google Business Profile 类别 | `support.google.com/business/answer/3038177`、`developers.google.com/my-business/content/categories` | 连接超时 |
| Stripe Atlas 业务类型 | `stripe.com/use-cases`、`/industries`、`docs.stripe.com/.../business-type` | 全部 **404** |
| 国家统计局 GB/T 4754 | 分类注释页 | 只有 `.xlsx` / `.pdf` 附件，无网页版列表可抄 |

**替代方案**：`r.jina.ai` 代理、`web.archive.org` Wayback、Mojeek / Brave / DDG / Google 搜索端点全部不可用或返回人机验证，故未做二次绕过。**因此第 1 题里 SiteInspire / Land-book / Godly / Dribbble / Behance / ThemeForest 六站只有「站点存在、定位已知」，没有分类轴结论。** 这是本报告最大的信息缺口，请勿把对比表里这六行的空白读成「它们没有分类」。

---

## 1. 同类站怎么做（问题 1）

### 1.1 对比表（只填取到证的）

| 站点 | 分类轴（实测） | 首屏放什么 | 有「按行业反查」吗 |
|---|---|---|---|
| **Awwwards** | **五轴并存**：Awards（SotD/SotM/SotY/HM）× **Category（27 个行业）** × Tag（几百个，含 360/3D/404pages…）× **Technology**（技术栈）× **Country** / **Font** / **Color** | 获奖提名网格（`grid-awwwards`，桌面 `--minthumb: 250px`），顶栏 Explore 三段下拉：Awards / Trending / **By Category** / **By Technology** | **有**，且是首屏就能点到的第二级入口 |
| **Httpster** | **双轴并列**：`/style/`（19 个风格）× `/type/`（29 个用途/行业） | 纯图墙，每张图 hover 出站名 + Visit，无文字摘要；页脚一行定位语「typographic, minimal, brutalist vibes」 | **有**，但走 `/type/` 而非 `/style/` |
| **One Page Love** | **四轴**：`genre`（20+ 行业）× `style`（24 风格）× `platform`（建站工具）× `tech`（技术）；另有独立的 Sections（按页面区块）与 Templates（按同一套 genre/style 切） | 单列大图卡（缩略图 420×560 竖版），每卡下方挂 1–3 个 genre 芯片 | **有**，且**图库与模板库共用同一套 genre 词表** |
| **Webflow 模板库** | **单一行业轴**，26 个分类带计数（详见 §2.1） | 「All template categories」一屏 26 个分类磁贴，每块一句人话解释（如 Food & Drink = "Restaurants, cuisine, beverages, and catering."） | **有**，是全站唯一主轴 |
| **Webflow Showcase**（Made in Webflow） | **松散标签轴**：3d / agency / animation / dark / ecommerce / fashion / finance / fitness / health / illustration / music / nonprofit / one-page / parallax / personal / portfolio / real-estate / restaurant / saas / startup / technology / travel / typography… | 作品墙 | **部分**，标签里混了行业（restaurant/fashion）与风格（dark/3d/typography） |
| **Wix 模板库** | **单轴 19 类 + 4 个工具类**（All / Most Popular / New / Blank） | 模板网格，**模板名自带双重命名**（见 §6.2） | **有** |
| **Squarespace** | 模板页主推 **Solutions 行业树**（10 大类 × 6 子类 = 60 格），另有 63 个 `/website-templates/<行业>` SEO 落地页 | Solutions 十宫格（Creative Services / Professional Services / Education / Beauty / Sports & Fitness / Health & Wellness / Home Services / Events / Charities / Personal） | **有，且做到二级**（大类 → 子行业，如 Beauty → Hair Salons / Nail Studios / Barbershops…） |
| **Framer Marketplace** | **两级行业树**：Portfolio（Artists/Designers/Photography/Resume）、Software（AI/Apps/Fintech/SaaS）、Agency（Architecture/Design/Marketing/Web）、Ecommerce（Beauty/Digital/Fashion/Furniture）、Services（Consulting/Education/Home/Legal）、Health（Fitness/Medical/Therapy/Wellness）、Publishing（Blogs/Entertainment/Magazines/News）、Real Estate（Agents/Construction/Listings/Management）、Hospitality（Food/Hotels/Restaurants/Travel）、Events（Conferences/Music/Sports/Weddings） | 横向标签条 + 「Price / Style」两个附加筛选 | **有，且是两级** |
| **Awwwards Market** | **按商品品类**：Homeware / Digital Product / Font / Product / App & Tool / Utilitary / Apparel / Editorial / Plugin / Hardware；另有 Platform（Webflow/Framer/WordPress/Figma…） | 策展位 + 商品卡 | **没有**——Market 刻意不用行业轴 |
| **Mobbin** | **不按行业**：平台（Apps / Sites / Screens / Flows / Animations / UI Elements）+ UI 模式（如「Paywall」「Onboarding」）；行业只作为垂直包售卖（Finance+） | 一句话价值主张 + 一个搜索框 + 示例查询 | **没有**行业反查，靠**搜索**与**UI 模式** |
| **recent.design** | 按**媒介**：Web / Interface / Branding / Motion / Illustration / Posters / Print | 杂志式大图切片（「4 slides」） | 无（仅确认页面可达，C 级） |
| SiteInspire / Land-book / Godly / Dribbble / Behance / ThemeForest | **未取证** | **未取证** | **未取证** |

### 1.2 从表里能读出的四条规律

1. **没有一家用单一轴。** Awwwards 五轴、One Page Love 四轴、Httpster 双轴。**行业轴从不单独承担全部导航**——它总是和「风格/技术/平台」并列，但**排位不同**：在 Awwwards 里行业进顶栏（By Category），在 Httpster 里行业是 `/type/` 而风格是 `/style/`（对等）。
2. **行业轴是「模板库」的主轴，是「灵感库」的副轴。** Webflow 模板库、Wix、Squarespace、Framer 四家做「可交付物」的，行业是**唯一**主轴；Awwwards、One Page Love、Mobbin 做「灵感」的，行业只是若干轴之一，Mobbin 干脆不用。
3. **行业轴的成熟标志是「两级 + 人话解释」。** Squarespace（10 类 × 6 子类）和 Framer（10 类 × 2–4 子类）都做了两级；Webflow 每个分类磁贴下面都写一句「这是干什么的」。
4. **首屏不放筛选面板。** 抓到的所有站，首屏都是**内容本身**（图墙/网格/分类磁贴）或**一句话 + 搜索框**；筛选器要么在顶栏下拉，要么在左侧但**不与内容争首屏**。§5 会给出这条的可用性依据。

---

## 2. 行业分类法（问题 2）

以下五份是**逐字抄下的完整列表**，可直接拿去对表。

### 2.1 Webflow 模板库 —— 26 个分类（带模板计数）

来源：<https://webflow.com/templates/categories>

| # | 分类 | 数量 | 官方一句解释 |
|---|---|---|---|
| 1 | Architecture & Design | 879 | Interior design, buildings, and homes. |
| 2 | Arts & Entertainment | 184 | Arts, music, theater, cinema, museums, performances, and festivals. |
| 3 | Blog & Editorial | 986 | Journalism, articles, publishing, and storytelling. |
| 4 | Community & Nonprofit | 271 | Charity, volunteering, fundraising, and NGOs. |
| 5 | Documentation | 86 | Templates for guides, manuals, tutorials, and instructions. |
| 6 | Education | 437 | Schools, universities, e-learning, and courses. |
| 7 | Environment | 329 | Schools, universities, courses, and e-learning. *(官网原文如此，疑似复制错误)* |
| 8 | Food & Drink | 679 | Restaurants, cuisine, beverages, and catering. |
| 9 | Government | 51 | Public sector, policy, governance, and politicians. |
| 10 | Hair & Beauty | 311 | Hair salons, barbershops, cosmetics, and spa services. |
| 11 | Home Services | 738 | Building, renovation, repair, and maintenance. |
| 12 | HR & Hiring | 133 | HR templates, job search, recruitment, and listings. |
| 13 | Launch & Coming Soon | 56 | Templates for debut, product introduction, startup, and pre-launch. |
| 14 | Medical | 528 | Healthcare, clinics, hospitals, and medical services. |
| 15 | Music & Audio | 146 | Bands, audio production, sound design, and music industry. |
| 16 | Personal | 393 | CV, biography, personal branding, and professional profile. |
| 17 | Portfolio & Agency | 7306 | Creative, design, marketing, and projects. |
| 18 | Professional Services | 2702 | Legal, financial, consulting, and accounting. |
| 19 | Real Estate | 520 | Housing, rentals, realtors, and property listings. |
| 20 | Retail & E-Commerce | 1155 | Online stores, retail businesses, and product catalogs. |
| 21 | Technology | 6187 | Tech, software, electronics, and programming. |
| 22 | Transportation | 195 | Cars, logistics, public transport, and automotive industry. |
| 23 | Travel | 347 | Hotels, tourism, vacation, and travel agency. |
| 24 | UI Kit | 191 | UI templates, web design, landing pages, and components. |
| 25 | Weddings & Events | 179 | Marriage, ceremony, party, and event planning. |
| 26 | Wellness | 805 | Fitness, nutrition, yoga, and meditation. |

> 注意第 24 项 **UI Kit 不是行业**，是「交付物形态」。Webflow 自己也没能守住纯行业轴。

### 2.2 Squarespace —— 63 个 `/website-templates/<行业>` 落地页 slug

来源：<https://www.squarespace.com/sitemap.xml>（`/website-templates/` 路径全量）

```
accounting | agency | architecture | art-school | art-studios | bakery | ballet |
barbershop | beauty | bookkeeping | business-services | church | cleaning-service |
clubs | coffee-shop | construction | consulting | dance | dental | digital-marketing |
doctor | dog-training | education | event-management | financial-planning |
financial-services | foundations | fundraising | graphic-design | hair-salon |
hospital | hospitality | hotel | insurance | interior-design | it-company | jobs |
landscaping | laundry-services | law-firm | life-coach | life-insurance |
makeup-artists | manufacturing | medical | music | music-school | news | non-profits |
nutrition | personal-trainer | plumbing | property-management | recruitment | salon |
school | seo | spas | staffing-agency | tea-shop | technology | therapist | travel-agency
```
（共 63 项）

同时首页 Solutions 用的是**另一套 10×6 = 60 格的两级树**：

| 大类 | 六个子行业 |
|---|---|
| Creative Services | Photographers, Graphic Designers, Artists, Interior Designers, Architects, Fashion & Apparel |
| Professional Services | Consultants, Professional Coaches, Real Estate Agents, Legal Services, Marketing Agencies, Tech & IT Services |
| Education & Training | Exam Prep Tutors, Music Teachers, Art Instruction, Dance Schools, Language Schools, Vocational Training |
| Beauty | Hair Salons, Barbershops, Nail Studios, Tattoos & Piercings, Makeup Artists, Jewelry Makers |
| Sports & Fitness | Sports Coaches, Sporting Goods, Fitness Centers, Sports Camps, Personal Trainers, Yoga Studios |
| Health & Wellness | Massage Therapists, Acupuncturists, Wellness Retreats, Recovery Centers, Nutritionists, Medspas |
| Home Services | Contractors, Home Decor, Landscapers, Cleaning Services, Pet Care, Auto Repair |
| Events & Experiences | Travel Agencies, Camps, Activities, Festivals, Concerts & Shows, Restaurants & Bars |
| Charities & Nonprofits | Faith Communities, Philanthropy & Advocacy, Community Groups, Environment & Conservation, Arts & Culture, Youth & Education |
| Personal | Resumés & CVs, Portfolios, Weddings, Freelancers, Creators, Podcasts |

> **重要观察**：Squarespace 的 63 个 SEO slug 与 60 格 Solutions 树**不是同一套**（slug 有 `dentist`/`plumber`/`laundry-services`，树里没有）。也就是说连 Squarespace 都存在「对外 SEO 词表」与「站内导航词表」两份并行清单。这对我们是个许可：**SEO 词表可以比导航词表更细**。

### 2.3 Wix 模板库 —— 19 个内容分类 + 4 个工具分类

来源：<https://www.wix.com/website/templates>

内容分类（19）：`beauty-and-hair` 美发美容 / `blog` 博客 / `business` 商业 / `communities` 社群 / `creative-arts` 创意艺术 / `design` 设计 / `education` 教育 / `events` 活动 / `fashion-and-style` 时尚风格 / `health-wellness` 健康养生 / `industrial` 工业 / `music` 音乐 / `one-page` 单页 / `online-store` 电商 / `photography` 摄影 / `portfolio-cv` 作品集与简历 / `restaurants-food` 餐厅与食品 / `travel-tourism` 旅游 / `video` 视频

工具分类（4）：`all` 全部 / `most-popular` 最热 / `new` 最新 / `blank` 空白

### 2.4 Awwwards —— 27 个 Category（行业轴）

来源：<https://www.awwwards.com/websites/>（左侧 Category 筛选面板 DOM 文本）

```
Architecture · Art & Illustration · Business & Corporate · Culture & Education ·
Design Agencies · E-Commerce · Events · Experimental · Fashion · Film & TV ·
Food & Drink · Games & Entertainment · Hotel / Restaurant · Institutions · Luxury ·
Magazine / Newspaper / Blog · Mobile & Apps · Music & Sound · Other · Photography ·
Promotional · Real Estate · Social responsibility · Sports · Startups · Technology ·
Web & Interactive
```
（共 27 个，含一个兜底 `Other`）

### 2.5 Httpster —— 19 个 Style + 29 个 Type

来源：<https://httpster.net/>（`/style/*` 与 `/type/*` 链接全量）

**Style（19，纯风格轴）**：brutalist · colourful · dark · fullscreen · grid · illustrative · interactive · light · low-carbon · minimal · monotone · non-standard-layout · non-standard-navigation · photographic · print · responsive · retro · scrolling-behaviour · typographic

**Type（29，用途/行业轴）**：advertising · application-or-software · architecture-and-industrial-design · art-and-photography · beauty · blog · craft · culture · design-and-illustration · education · event · fashion · finance · food-drink · fundraising · health · inspiration-resource · magazine · motion · music · news · online-store · product · production · property · service · showcase · sport · travel

### 2.6 One Page Love —— 20 个 Genre + 24 个 Style（图库与模板库共用）

来源：<https://onepagelove.com/>

**Genre（图库侧，带计数）**：Portfolio 3790 · Landing Page 2030 · Digital Product 1532 · Launching Soon 937 · App 899 · Service 532 · Personal 444 · Event 378 · Informational 299 · Music Related 244 · Experimental 228 · Restaurant 152 · Finance 167 · Photography 142 · Startup 157 · SaaS 155 · Game 149 · Physical Product 140 · E-commerce 119 · Sport 120

**Genre（模板库侧追加的）**：Multipurpose 82 · No-Code 71 · Résumé 29 · Wedding 13 · UI Kit 5 · Announcement 2 · Case Study 1 · Single Serving 1 · Annual Report 1 · Travel and Tourism 1 · Real Estate and Architecture 1

**Style（24）**：Illustrative 1662 · Scroll Effects 1344 · Minimal 1016 · Flat Design 805 · Typographic 760 · Fun 433 · Horizontal Layout 295 · Retro & Vintage 246 · 3D 237 · Gradients 200 · Brutalism 178 · Narrow Layout 114 · Grunge 77 · Modular Layout 56 · Glassmorphism 49 · Futuristic 48 · Pixel Art 39 · Editorial 35 · Glitch 31 · Bold 30 · Luxury 27 · Grid Layout 24 · Skeuomorphism 20 · Corporate 9

> **这是本报告对第 4、6 题最关键的一条证据**：One Page Love 的图库和模板库**用的是同一套 genre 词表**。一个用户在图库页点 `Restaurant`，去模板库还是点同一个 `Restaurant`——不需要学第二套词汇。

### 2.7 与我们 44 词表的对照结论

把我们 `sceneIndex` 的 44 词与上表对照，**我们的缺口分三类**：

| 缺口类型 | 我们的词 | 上游站怎么处理 |
|---|---|---|
| **大类缺失（整块没有）** | 电商/网店、金融、政务、医疗/诊所、地产、旅游、汽车、物流、农业、教育（只有"教育"近邻） | 全部是上游站的**一级分类**（Webflow: Retail & E-Commerce / Professional Services / Government / Medical / Real Estate / Travel / Transportation / Environment / Education） |
| **子类缺失（大类下有，我们没拆）** | 服装、美妆/美甲、甜品/酒吧/餐厅、母婴/儿童、家居、数码 | 上游用「大类 → 子类」两级承载（Squarespace Beauty → Nail Studios / Makeup Artists；Framer Hospitality → Food / Hotels / Restaurants） |
| **形态类被误当行业** | 简历、个人主页、社团、捐款、展会、乐队、家教、培训、独立开发者 | 上游把它们拆到**另一条轴**：Webflow 放 `Personal`/`HR & Hiring`/`Community & Nonprofit`，One Page Love 放 `Résumé`/`Personal`/`Event`——即**「行业」与「交付物形态」分开** |

---

## 3. 搜索零结果的正确 UX（问题 3）

### 3.1 业界共识：三条硬准则（NN/g，有眼动实证）

来源：**3 Guidelines for Search Engine "No Results" Pages**，Kathryn Whitenton，2014-01-05
<https://www.nngroup.com/articles/search-no-results-serp/>

原文三条：

1. **Clearly explain that there are no matching results.**（明确说没有结果）
2. **Offer starting points for moving forward.**（给前进的起点）
3. **Don't mock the user.**（别调侃用户）

**实证细节（这是全文最值钱的一段）**：NN/g 用眼动仪测了 NexTag 的零结果页。页面**确实写了** "Sorry, no matches found for 2x4 flouresent ligting fixtures"，但因为字号小、字重轻、被挤在 logo 和下面第一个粗体标题之间，**被试的眼睛一次都没落在那句话上**（"There were no fixations on the actual No Results statement"），直接跳到下面看起来像正文的内容去了。

> 对我们的直接含义：零结果提示必须**在视觉权重上等同于正常结果**，不能做成一行灰色小字。

同文给出的「前进起点」清单（原文照抄）：
- Restating the original query（复述原查询）
- Providing a search box (with the original query still in it for easy editing)（搜索框保留原词，便于改）
- Suggestions for similar queries that do return results（给出**确实有结果**的相近查询）
- Spelling corrections（拼写纠正）
- Advice about how to modify queries, using different words or fewer words（建议换词或减少词）

以及反面案例：Recipe.com 的零结果页**除了站外广告没有任何链接**，被 NN/g 直接判为 dead end。

### 3.2 同义词 / 模糊匹配：官方推荐做法

来源：**Search-Log Analysis: The Most Overlooked Opportunity in Web UX Research**，Susan Farrell，2017-07-30
<https://www.nngroup.com/articles/search-log-analysis/>

原文关键句（照抄）：

> "Most search engines allow you to force good results (*best bets* for a given query) to the top… They also allow you to make **synonym relationships** between terms so that when someone searches for X they get Y. For example, this feature helps overcome misspellings or ties branded terms to generic terms."

同一篇给出的具体动作，几乎就是给我们写的：

> "**Get the list of search terms with no results.** These queries often indicate both misspellings and wanted information that the search engine can't find for some reason… If you see that people are searching for something you know the site doesn't have, consider offering custom results for some terms that point to the resources people need."

还有一条策略对我们特别适用——**「Best bets」**：对已知会零命中的查询，**手工钉死一个结果**。这正是「搜『餐厅』→ 直接给 M02」的官方说法。

### 3.3 「你是不是要找」的边界条件（NN/g 有数据说它常被忽略）

来源：**Site Search Suggestions**，Kate Moran，2018-05-20
<https://www.nngroup.com/articles/site-search-suggestions/>

- 建议词**必须真有结果**：原文举 JC Penney 的例子，用户点了建议词 "luggage sets clearance" 却得到两个宠物旅行用品，用户原话 "That's very weird… this is not great."。NN/g 判词："Suggested terms that return zero results, or irrelevant results, are worse than unhelpful."
- **建议词的实际使用率只有 23%**（31/136 次，误差 ±7%）。也就是说：**光加「你是不是要找」不够，因为四分之三的人根本不点它**。它只能当辅助信号，不能当唯一补救。
- 但即使不点也有价值：用户会**读**建议词来判断「这个站到底有什么」。反向风险：原文明确写——如果输入几个字后下拉里没出现某个词，部分用户会**直接断定站里没有这个东西然后离开**。

### 3.4 专业检索器（facets）优于自由文本搜索

来源：**Search Is Not Enough: Synergy Between Navigation and Search**，Raluca Budiu，2014-09-07
<https://www.nngroup.com/articles/search-not-enough/>

五条理由（原文小标题）：搜索要求用户**知道检索空间**；搜索增加**记忆负担**（recall 而非 recognition）；搜索的**交互成本高于浏览**；站内搜索**通常实现得差**；用户**搜索技能差**。

原文对我们最有用的一句：

> "**Facets** … have exactly this great benefit: they **transform search into navigation** and solve the problem of a user confronted with an unfamiliar search space. Facets structure the search space and make the user get a sense of the type of information she can expect to find there."

> 含义：「44 个行业词反查」这件事本身方向是对的（它把搜索变成了浏览），问题不在形态，在**词表覆盖**和**零结果兜底**。

### 3.5 零结果页还应该是「教学位」

来源：**Designing Empty States in Complex Applications: 3 Guidelines**，Kate Kaplan，2021-09-19
<https://www.nngroup.com/articles/empty-state-interface-design/>

三条用途（原文）：communicate system status / provide learning cues / provide direct pathways for key tasks。并特别点名「Search results lists when nothing is found」属于典型空状态。

原文还有一个精确的反模式，**我们现在正好犯了**：

> 系统先显示 "No records"，几秒后内容加载出来把这句话替换掉，NN/g 判为 "particularly harmful"——用户会 "develop a severe distrust of and distaste for the application"。

> 含义：空状态里那句「目前没有对应风格的行业（共 29 个）」如果和「其实有近似方案」并列出现，必须**一次说清**，不能先否定再补充。

### 3.6 Baymard 侧的唯一可取证据

来源：<https://baymard.com/blog/search-bar-ui>
原文（照抄）：

> "Well-implemented predictive search reduces the number of keystrokes required to reach a result, surfaces relevant products the user might not have known to search for, and **significantly reduces zero-results states by guiding users toward queries the catalog can fulfill**."

Baymard 的完整 31 条 search 准则在付费墙后（<https://baymard.com/research/ecommerce-search>，官网写明「31 search UX guidelines」、344 站基准、5,000+ 元素），**本报告未能读到条款原文**，故不引用其具体结论。

### 3.7 问题 3 的结论

| 手段 | 有实证支持吗 | 该怎么做 |
|---|---|---|
| 明确告知零结果（视觉权重要够） | ✅ NN/g 眼动 | 结果区顶部整行大字，不是灰色小字 |
| 保留搜索框 + 原词可编辑 | ✅ NN/g | 已有 `#q`，保持 |
| 给**确有结果**的相近查询 | ✅ NN/g | 「你是不是要找：餐厅 → M02 餐饮本地模板」 |
| 同义词 / best bets 手工钉 | ✅ NN/g | 「餐厅→M02」「电商→M01」「简历→M03」这类硬映射 |
| 拼写纠正 | ✅ NN/g | 中文场景价值低，可跳过 |
| 降低匹配阈值（模糊匹配） | ⚠️ **未找到 NN/g/Baymard 的实证支持** | 谨慎：这正是仓库里已经踩过的坑（见 §7.3 反向信号） |
| 纯靠「你是不是要找」 | ❌ 使用率仅 23% | 只能当辅助 |

---

## 4. 「先锋实验层」与「大众可用层」如何共存（问题 4）

### 4.1 真实案例：三家都做了「分层」，但分法完全不同

| 站点 | 分层方式 | 两层的入口关系 | 词表是否复用 |
|---|---|---|---|
| **Awwwards** | **按「是不是可交付的商品」分节**：`/websites/`（获奖灵感）vs `/market/`（可买模板/字体/插件） | 顶栏一级并列（Awards · Market · Academy · Jobs · Directory） | **不复用**。灵感区用 27 个行业 Category；Market 用 10 个**商品品类**（Homeware/Digital Product/Font/Plugin/Hardware…）+ Platform 轴 |
| **One Page Love** | **按「是网站还是模板」分节**：`/inspiration` vs `/templates`，另有 `/sections`（可复用区块） | 顶栏一级并列 | **完全复用**。两边都点 `Restaurant`、`Portfolio`、`Wedding` |
| **Webflow** | **按「看别人做的」还是「买个底座」分节**：`/made-in-webflow`（Showcase）vs `/templates` | Marketplace 二级并列 | **不复用**。模板库 26 个严格行业分类；Showcase 是松散标签（dark/3d/typography 混着 restaurant/fashion） |

### 4.2 能读出的规律

1. **三家都把两层放在「一级导航并列」，没有一家把两层混在同一个网格里。** 用户永远知道自己在「逛灵感」还是「拿模板」。
2. **Awwwards 的做法最保守也最安全**：它连词表都不共用，因为 Market 卖的是字体/插件/主题，本来就不是行业。它的教训是——**只有当两层的物件类型真的不同时，才该分两套词**。
3. **One Page Love 的做法最适合我们**：图库和模板库**同 genre**。用户在图库建立起来的「我是餐厅 → Restaurant」心智，到模板库零成本复用。
4. **Webflow 的做法是反面教材**：模板库用严格行业、Showcase 用混合标签，同一个站在两个入口对同一批内容给出两套词汇，用户要学两遍。

### 4.3 关于「博物馆策展区 vs 常设区」的类比

用户提问里提到这个类比。**本报告未能找到任何博物馆/美术馆官方发布的、关于「策展区与常设区信息架构」的可引用文档**，故不把它当作论据。但上面的三站实测已经足够支撑同一结论：**分层要靠「入口并列 + 层内词表一致」，不靠视觉风格区分。** 若需要学术支撑，NN/g 的渐进披露给出了同构的理论依据（见 §4.4）。

### 4.4 理论支撑：渐进披露（Progressive Disclosure）

来源：**Progressive Disclosure**，Jakob Nielsen，2006-12-03
<https://www.nngroup.com/articles/progressive-disclosure/>

原文两条硬约束（照抄）：

> "You must get the right **split between initial and secondary features**. You have to disclose everything that users frequently need up front… Conversely, the primary list can't contain too many options or you'll fail to sufficiently focus users' attention."
> "It must be **obvious how users progress** from the primary to the secondary disclosure levels."

以及一条关键警告：

> "In practice, designs that go beyond **2 disclosure levels** typically have low usability because users often get lost when moving between the levels."

> **含义**：30 个先锋方案 + 3 个大众模板 = **天然的两层，正好卡在上限**。不要再加第三层（比如「模板 → 变体 → 配色版」）。并且第二层的入口必须**标签写清会发生什么**——「拿来就能用的三个模板」比「大众模板」信息气味强得多。

**NN/g 还明确否证了一个常见担忧**：

> "You might assume that by initially focusing users' attention on a few core features, they might build a limiting mental model… **Research says that these are groundless worries**: people understand a system *better* when you help them prioritize features."

> 也就是说：**把 M01/M02/M03 提到首屏、把 30 个先锋方案放在后面，不会让用户「以为这站只有三个模板」**。这个担心可以放下。

---

## 5. 卡片密度与可用性（问题 5）

### 5.1 NN/g 的方向性结论（有实验，但没给「几张」这个数字）

来源：**Mobile Navigation: Image Grids or Text Lists?**，Aurora Harley，2014-03-30
<https://www.nngroup.com/articles/image-vs-list-mobile-navigation/>

关键实测数据（照抄）：

> "if image grids are used for navigation, the user often sees only **4 grid items at a time**"

> "even displaying only **12 categories in a grid** would run onto a **third screenfull**"

> "This is why images in a **2-column grid** work well on mobile, while images presented as a tiny thumbnail within a list layout do not."

结论（原文）：

> "For mobile navigation, **image grids should be saved for deeper IA levels** where visual differentiation between menu items is critical, as they increase page load times, create longer pages, and cause more scrolling."

> "On the desktop… our guideline … maintains that **images should be included on product listing and category pages**."

一个很有说服力的行为观察：

> 在 West Elm 手机上，42 个分类的图墙，用户**只看了 4 个就下单了**（"Only 4 of the 42 navigational options… were reviewed before the user made her selection"），因为 "people often stop once they see an item that looks *close enough*"。

> **对我们最重要的一条**：网格越密、越往下滚，用户**越早停手**。所以「一屏塞满 30 张」不会让人挑得更准，只会让人更早随便挑一个。

### 5.2 缩略图大小的判据（不是「多大好看」，是「能不能独立支撑判断」）

来源：**List Thumbnails on Mobile: When to Use Them and Where to Place Them**，Aurora Harley，2015-12-06
<https://www.nngroup.com/articles/mobile-list-thumbnail/>

判据原文（照抄）：

> "ask yourself whether someone would be able to decide where to navigate **using only the image**. If the image alone would definitely not suffice… **eliminate it**."

左右位置规则：

> "If the image is essential for choosing an item in the list, **place it on the left**… Otherwise, if the image is secondary to the text, **position it on the right**."

以及一条对我们特别贴切的：

> "if the list content is primarily visual (e.g., videos or photographs), then the images should definitely be prioritized on browse pages to aid navigation, **warranting large thumbnails or a grid-based layout** depending on how much associated text also needs to be displayed."

> **含义**：我们每行都有大量文字（方案名/定义/结构/调性/闸门），所以**缩略图是次要的 → 应放右侧**。仓库现在的 `.row { grid-template-columns: 62px minmax(0,1fr) 316px }` **正好就是这个形态**，这一点是对的，不该改成图墙。

### 5.3 站点实测取值（A 级证据：官方 CSS）

| 站点 | 每格最小宽 | 列数策略 | 实测换算 |
|---|---|---|---|
| **Awwwards** | `--minthumb: 250px`（桌面默认）；`≤576px` 时 `150px!important`；部分集合 `426/440/600px` | `repeat(auto-fill, minmax(var(--minthumb), 1fr))` + `grid-gap: clamp(20px,10vw,100px) var(--gutter)` | 1440 宽 ≈ **5 列**；1920 ≈ 7 列；390 手机 ≈ **2 列** |
| **Webflow 模板库** | `minmax(0, 380px)` / `minmax(0, 420px)` | `repeat(3, minmax(0,380px))` / `repeat(2, minmax(0,420px))` | **2–3 列**，格子 380–420px |
| **One Page Love** | 缩略图 420×560（CDN `width=420,height=560,fit=cover,gravity=top`） | 单列大卡 | **1 列**，竖版大图 |

**取值区间归纳（基于以上三个实测）**：桌面 **3–5 列**、格子 **250–420px**；手机 **2 列**、格子 **150px 起**。

### 5.4 我对「一屏几张」的结论

- **没有找到任何 NN/g / Baymard 研究给出「一屏 N 张」的最优数字。** 找不到就说找不到。能找到的只有：手机图墙一屏约 **4 个**可见；**2 列**图墙在手机可用；**12 个**图块就要占 **3 屏**。
- 可用的替代判据是**滚动惩罚**：West Elm 那个「42 个里只看 4 个」的实测说明，**选项越多，用户越早停**。所以「一屏放几张」不该由审美决定，该由「用户愿意滚几屏」决定。
- **列表 vs 网格的判据**（NN/g 原话）：图文关联弱、需要横向比对多个字段 → **列表**；图本身能独立支撑选择 → **网格**。我们是前者（要比对结构/调性/门槛/闸门），**列表正确**。

---

## 6. 命名桥接（问题 6）

### 6.1 权威依据：NN/g 直接说「别用自造词」

来源：**5 Tips for Avoiding Confusing Category Names**，Hoa Loranger & Taylor Dykes，2013-12-15（2024-10-11 复审）
<https://www.nngroup.com/articles/category-names-suck/>

五条（原文小标题）：
1. **Be Descriptive and Relatable** —— "Choose function over form"
2. **Avoid Made-Up Terms** —— "Don't be tempted by the allure of clever names. **Stick to commonly used words.**"
3. **Check for Overlapping Categories**
4. **Categorize Based on Users' Mental Models**
5. **Don't Rely on Instincts**

最关键的三句（照抄）：

> "**Descriptive category names that people understand are better than made-up words or internal jargon.**"

> "Because website designers are usually domain experts, they're familiar with internal jargon and sometimes forget that their audiences are not."

> "If you must use fancy names, **always explain their meaning**, because people tend to skip over meaningless words."

还有一条关于「弱信息气味」的实测观察：

> "In usability studies, we often see users **skip a category name with weak information scent**, even though that link leads to the item they are looking for."

**这一条几乎是为「钢丝安全册 / 联锁释放簿 / 盲压公函」写的。** NN/g 举的反例正是 Live Nation 的 `Life at LN` / `Empowered by LN`，判词是 "Made-up category names fit the company's branding but were hard to understand."

### 6.2 真实站点的三种桥接法（全部实测）

**（a）Wix：行业名 +（风格形容词）—— 括号里放艺术名**

从 Wix 模板页的 `templateName` 参数直接抄下的真实取值：

```
Massage Therapist (Soft)      Kindergarten (Playful)      Vacation Rental Company (Warm)
Landscaping Services (Fresh)  Electrician (Modern)        Hair Salon (Simple)
Locksmith (Simple)            Author (Dreamy)             Non-Profit Organization (Earthy)
Plumber (Traditional)         Coming Soon (Business)      Subscribe to Newsletter LP (Editorial)
```

> 这正是「双轨命名」的标准形：**用途名在前（可检索、可反查），艺术名括在后面（表达调性）**。

**（b）Framer / Awwwards Market：品牌名 + 破折号 + 用途名**

从 Awwwards Market 与 Framer Marketplace 抄下的真实标题：

```
Margins: Film & Photography Studio Template
CASPIA — Free Portfolio Template for Creatives
HOLMCHROME · Framer Portfolio Template
Minifolio001 ― Framer Portfolio Template (CMS)
Folira Lite — Free Portfolio & Resume Template
Selv - Free Portfolio & Resume Template
Plyń Piaty — Infinite CMS-Ready Portfolio
```

> 结构恒为 `[艺术名] + 分隔符 + [用途/行业] + Template`。**换句话说：没有一家把艺术名单独当标题用。**

**（c）One Page Love：标题只放站名，用途靠 genre 芯片承载**

`Monocle` 下面挂 `Digital Product` + `Landing Page`；`Stolaze` 挂 `Personal` + `Portfolio`。**艺术名做标题，行业词做结构化元数据**——两者不抢同一个位置。

### 6.3 我们的名称问题，用上面三条怎么解

现有 30 个方案名（如「钢丝安全册」「联锁释放簿」「盲压公函」）在三种桥接法里**都不成立**，因为：

- 它们既不含用途词（违反 6.1「Avoid Made-Up Terms」）；
- 也不在括号/破折号后给出用途（违反 6.2a/6.2b 的通用结构）；
- 且 `data.js` 里其实**已经有** `cn`（中文名）、`en`（英文名）、`structure`（结构类型）、`tone`（调性）、`scenesYes`（适用场景）这几个可以拿来做「用途名」的字段——**信息是有的，只是没放在名字的位置上**。

> 补充证据（字段位置已实测核对）：`plain` 字段在 **`prompts.js`** 的 `window.STYLE_PROMPTS.schemes[].plain`（30 条全有），不在 `data.js`；`cn`/`en`/`scenesYes`/`structure`/`tone` 在 **`data.js`** 的 `window.SCHEMES`（各 30 条）。`plain` 是如 S01「没裁齐的报纸感，红斜块压住版面」、S06「咖啡泡过的纸，卡片沿斜轨漂」这样的**人话版**。
>
> **并且 `app.js` 的 `plainOf()` 已经在卡片上渲染它了**（`.row-def` 用的就是 `plainOf(r)`）。所以现状是「艺术名做标题 + 人话做摘要」，**缺的只有『用途名』这一层**——不是缺三套。

### 6.4 问题 6 的结论

| 方案 | 有案例支持吗 | 评价 |
|---|---|---|
| 给方案加行业标签 | ✅ One Page Love、Webflow、Wix 全都在做 | **必做**，成本最低 |
| 完全按行业组织 | ✅ Webflow/Wix/Squarespace/Framer（模板库） | 适合「可交付物」，不适合「灵感库」；我们两层并存，不该全按行业 |
| 双轨命名（艺术名 + 用途名） | ✅✅ Wix 括号式、Framer 破折号式，两家头部都在用 | **首选**，且我们字段已齐，只差排版 |
| 只保留艺术名 | ❌ 未找到任何一家这么做 | 不可取 |

---

## 7. 对本仓库的实测复核（写建议前先把事实钉死）

以下数字均为本次直接跑代码/读文件得出，非引用任务描述。

### 7.1 三模板确实完全不在索引里 —— 确认

```
prompts.js    中 M0[123] 命中：0
prompt-copy.js 中 M0[123] 命中：0
data.js       中 M0[123] 命中：0
```
（`data.js` 是 `window.SCHEMES`，30 条记录，无任何 M 开头条目。）

**M02 的实际表述**（`templates/M02-warm-local/README.md` 第 3 行，逐字）：

> 「给**本地实体店**用的一页式官网模板：餐厅、咖啡馆、烘焙、民宿、理发店、花店都能套。」

而 `index.html` 第 40 行的占位符是「【换成你的：品类，例如 手作烘焙 · 咖啡馆】」。

**结论：任务描述成立。** 用户搜「餐厅」→ 零结果，但仓库里有一个 README 第一句就写着「餐厅」的模板。这是最刺眼的一处。

### 7.2 零命中的真实范围比任务描述更严重 —— 修正

任务描述说「44 个行业词里 29 个零命中」。实测这两组是**两个不同的数组**：

- `sceneIndex` 有 **44** 个键，其中 **16** 个有 `direct`（实心芯片），**28** 个只有 `near`；
- **另一个独立数组 `unsupported`，恰好 29 个词**。

我按 `app.js` 里真实的搜索 haystack（`[id, cn, en, family, fonts, def, tone, structure, errorCode, threshold, layout, visuals, quirk, scenesYes, axes.ground, axes.band, axes.load, axes.loud, palette]`）**逐词模拟**，结果：

- 44 个 sceneIndex 词里，**17 个**在搜索框里字面零命中：咖啡店 / 茶饮 / 餐厅 / 书店 / 潮牌 / 修鞋理发 / 小吃店 / 花店 / 民宿 / 婚礼 / 健身 / 宠物 / 诊所 / 律师 / 会计 / 招聘 / 非营利
- 29 个 unsupported 词里，**28 个**零命中，只有 `农业` 命中 1 行
- **合计 73 个用户词，45 个零命中 = 62%**

> 也就是说：**问题不是「44 个里 29 个」，而是「73 个里 45 个」。** 而且更关键的是——**那 17 个零命中的 chip 是「有方案」的**（有 direct 或 near）。用户点「餐厅」这个 chip，芯片高亮、列表清空，因为芯片走的是 `state.sceneIds` 白名单，而搜索框走的是 haystack。**两条路径给出互相矛盾的答案。** 这比单纯缺词更难解释给用户。

### 7.3 模糊匹配已经被试过并且被回滚 —— 这是重要反证

`app.js` 里有一段代码注释，记录了一次失败尝试（逐字）：

> 「实测搜"政务"命中 7 行，**7/7 全部只出现在"不适合"从句里**，而行卡不印 scenes → 用户看到 7 行却没有一行印出"政务"，只能得出"有 7 个方案适合政务"这个**与事实相反**的结论。（这是我自己在一次"修复"里引入的反向信号。原来的 0 命中至少诚实。）」

**这段是第 3 题的重要反证**：降低阈值 / 把 `scenesNo`（「不适合」）也纳入索引，会制造**反向信息**。NN/g 的 §3.5 警告（先否定后补充 = 用户不信任系统）在中文语料上被本地实测复现了一次。所以改进方向**不是**放宽匹配，而是 §3.2 的 best bets + 同义词硬映射。

### 7.4 已知的一处「假控件」历史

`index.html` 第 36–39 行留有一段注释，记录曾经有个 `<details>` 折叠条的子元素数实测为 0（"railFoldBodyChildren: 0"），点开什么都没有，已删除。**这说明「折叠起来不占首屏」这个解法在本仓库已经被证伪过一次**——`prompt-copy.js` 现在用同一思路收起 28 个近似词和 29 个 unsupported，需警惕重蹈覆辙。

---

## 8. 对这个图集选型台的 6 条可执行改进建议

> 每条附依据来源。按「投入产出比」排序。

### 建议 1｜把三个模板接进 `sceneIndex`，用 Best Bets 硬钉，而不是靠全文索引

**做法**：不改搜索算法，直接在 `prompts.js` 加一张 `bestBets` 映射表，在零结果页与 `sceneIndex` 里同时生效：

```js
bestBets: {
  "餐厅": { to: "M02", why: "餐饮本地模板，README 第一句就写着能套餐厅" },
  "咖啡店": { to: "M02" }, "烘焙": { to: "M02" }, "民宿": { to: "M02" },
  "花店": { to: "M02" }, "理发": { to: "M02" }, "修指甲": { to: "M02" },
  "电商": { to: "M01" }, "网店": { to: "M01" }, "企业": { to: "M01" },
  "作品集": { to: "M03" }, "简历": { to: "M03" }, "个人主页": { to: "M03" }
}
```

**依据**：
- NN/g 明确把「best bets」列为站内搜索的标准调优手段 —— <https://www.nngroup.com/articles/search-log-analysis/>
- 对已知查不到的词，「consider offering custom results for some terms that point to the resources people need」——同上
- 零结果页必须给「前进的起点」且建议必须**真有结果** —— <https://www.nngroup.com/articles/search-no-results-serp/>、<https://www.nngroup.com/articles/site-search-suggestions/>

**为什么不是加进全文索引**：§7.3 已实测，把模板描述塞进 haystack 会重演「政务 7/7 全在不适合从句」的反向信号。硬映射是**显式承诺**，索引是**隐式暗示**，前者可解释。

---

### 建议 2｜双层结构改成「两个并列入口」，并让两层共用一套行业词

**做法**：
- 选型台首屏顶部加一个**二选一入口条**，放在 h1 下面、30 张卡上面：
  `我要一个能直接上线的站 →（M01 企业 / M02 餐饮本地 / M03 作品集）`　|　`我要挑一种视觉风格 →（30 个方案，往下看）`
- 三个模板**不放进 30 张卡里**，而是各自成为一个**带缩略图的入口卡**，和 30 张卡同一套视觉语言。
- 关键：**模板沿用 `sceneIndex` 的同一批行业词**。用户点了「餐厅」，M02 出现在结果里，且它在 30 个方案旁边，用同样的卡片样式。

**依据**：
- 三家实测都把两层放在**一级导航并列**，没有一家混编（Awwwards `/websites/` vs `/market/`；One Page Love `/inspiration` vs `/templates`；Webflow `/made-in-webflow` vs `/templates`）——§4.1
- One Page Love 图库与模板库**共用同一套 genre 词表**，是最适合我们的范式 —— <https://onepagelove.com/>
- 渐进披露要求「primary 必须包含用户高频需要的东西」，且「必须明显知道怎么进第二层」—— <https://www.nngroup.com/articles/progressive-disclosure/>
- 超过 2 层可用性下降 —— 同上（所以**不要再加第三层**）
- 「把少数核心项提前不会让用户误以为只有这些」有 NN/g 明确背书 —— 同上

---

### 建议 3｜列表行首改成「用途名 ← 人话 ← 艺术名」三段式（数据已有，只差排版）

**做法**：`app.js` 约 L254–270 的 `.row` 结构，把现在的单一 `<h3>{cn}</h3>` 拆成：

```
<h3>{用途名}</h3>                  ← 唯一需要新增的字段，如「餐厅 / 本地门店」
<p class="row-plain">{plain}</p>   ← 已经在渲染了（plainOf()），不用动
<p class="row-art">{cn} · {en}</p> ← 现在的主标题降为副标题
```

字段来源已实测核对：`plain` 在 `prompts.js`（`window.STYLE_PROMPTS.schemes[].plain`，30/30），`cn`/`en`/`scenesYes` 在 `data.js`（`window.SCHEMES`，30/30）。**所以只缺『用途名』一个字段，其余数据现成。**

**依据**：
- NN/g：「Descriptive category names…are better than made-up words」；「Stick to commonly used words」；「If you must use fancy names, always explain their meaning」 —— <https://www.nngroup.com/articles/category-names-suck/>
- NN/g 实测：用户会**跳过信息气味弱的标签**，哪怕它通向正确答案 —— 同上
- Wix 真实模板名一律是 `行业名 (风格形容词)`，如 `Massage Therapist (Soft)`、`Hair Salon (Simple)` —— <https://www.wix.com/website/templates>
- Framer/Awwwards Market 一律是 `艺术名 — 用途名 Template`，如 `Margins: Film & Photography Studio Template`、`CASPIA — Free Portfolio Template for Creatives` —— <https://www.awwwards.com/market/>
- One Page Love 用「站名做标题 + genre 芯片做用途」，两者不抢同一位置 —— <https://onepagelove.com/>

---

### 建议 4｜把 44 词表扩到「26 大类 + 子类」，直接照抄 Webflow 的 26 个分类做骨架

**做法**：用 §2.1 的 Webflow 26 类做**一级**，用 §2.2 Squarespace 63 slug 与 §2.6 One Page Love 的 genre 做**二级候选池**。优先补上我们现在整块缺失的 9 个大类：**电商/零售、金融、政务、医疗、地产、旅游、汽车/物流、农业、教育**。并把「简历/个人主页/社团/捐款/展会/乐队/家教/培训/独立开发者」从行业轴移到**形态轴**（Webflow 的做法：`Personal` / `HR & Hiring` / `Community & Nonprofit`）。

**依据**：
- Webflow 26 类带计数的完整清单（含每类一句人话解释）—— <https://webflow.com/templates/categories>
- Squarespace 63 个行业 slug 全量 + 10×6 两级树 —— <https://www.squarespace.com/sitemap.xml>、<https://www.squarespace.com/templates>
- Wix 19 类 + 4 工具类 —— <https://www.wix.com/website/templates>
- Awwwards 27 个 Category —— <https://www.awwwards.com/websites/>
- Httpster 19 style + 29 type 的双轴分法 —— <https://httpster.net/>
- 「行业轴 + 形态轴分开」有 NN/g 的 polyhierarchy 依据（同一物件可属多个类）—— <https://www.nngroup.com/videos/polyhierarchy-information-architecture/>
- 词表要跟用户心智而非内部结构 —— <https://www.nngroup.com/articles/category-names-suck/>

> 落地节奏建议：**先只补 9 个大类**（一级），子类留到第二批。理由见 §8 建议 6 的「不要制造新假控件」。

---

### 建议 5｜零结果页按 NN/g 三条重写，并把「高亮 chip + 空列表」这个矛盾消掉

**做法**：
1. **先修矛盾**（§7.2）：点击 scene chip 时，如果该词在搜索框里零命中，**不要**让列表变空——改成「滚到并展开 M02 卡片」，或者把 chip 点击同时写入 `state.q`，让两条路径给同一答案。
2. **零结果提示视觉权重拉满**：占满结果区一整行，字号 ≥ 正文，不用灰色小字。（NN/g 眼动证据：小字零结果提示被试一次都没看）
3. **一次说清，不分两段**：不要「没有 → 但其实有近似」。直接：「『美甲』目前没有专门的方案。最接近的是 **M02 餐饮本地模板**（换文案能做美甲店），或这 3 个方案：…」
4. **保留 `#q` 原词**，并给它 3–5 个**确有结果**的相近词按钮。
5. **不要**再学现在这样把 29 个 unsupported 折叠起来（§7.4 已证伪过一次）。

**依据**：
- 三准则 + 眼动实证 + 「dead end」反例 —— <https://www.nngroup.com/articles/search-no-results-serp/>
- 空状态三用途，以及「先显示 No records 再替换」被明确判为 harmful —— <https://www.nngroup.com/articles/empty-state-interface-design/>
- 建议词必须真有结果，且使用率仅 23% —— <https://www.nngroup.com/articles/site-search-suggestions/>
- facets 把搜索变成浏览，能解决「不熟悉检索空间」的问题 —— <https://www.nngroup.com/articles/search-not-enough/>

---

### 建议 6｜保留列表形态与右侧 316px 缩略图，不要改成图墙；顺便砍掉第 3 层折叠

**做法**：
- **不要**把 30 张卡改成网格图墙。现有 `.row { grid-template-columns: 62px minmax(0,1fr) 316px }` 是「列表 + 右侧缩略图」，**符合 NN/g 对「图是次要信息」场景的处方**。
- 若要提升密度，参考实测区间调整**格子**而不是**列数**：桌面保持单列列表，缩略图 316px 已在 Awwwards/Webflow 的 250–420px 区间内，无需改动。
- 移动端断点（`≤` 某值）已是 `.row { grid-template-columns: 46px minmax(0,1fr) }`，缩略图落到第二行——这与 NN/g「手机 2 列图墙 / 列表优先」一致。
- **删掉** `.scene-more` 这层折叠（§7.4），改用「展开后是一个可滚动的完整词表」或干脆全部平铺。

**依据**：
- 「图不能独立支撑选择就删掉」；「图次要则放右侧」；「列表内容以图为主才用大图/网格」 —— <https://www.nngroup.com/articles/mobile-list-thumbnail/>
- 手机图墙一屏约 4 个、12 个就占 3 屏、42 个里用户只看 4 个就下单 —— <https://www.nngroup.com/articles/image-vs-list-mobile-navigation/>
- 桌面端「category pages 应该有图」——同上
- 实测缩略图区间：Awwwards `--minthumb: 250px`（桌面）/`150px`（≤576px）、Webflow `380–420px`、One Page Love `420×560` —— 见 §5.3
- 折叠层不可用已被本仓库实测证伪（`index.html` L36–39 注释）—— §7.4

---

## 9. 一页纸结论

1. **同行没有一家只用一个轴。** 行业轴在「模板库」是主轴（Webflow/Wix/Squarespace/Framer），在「灵感库」是副轴（Awwwards/Httpster），Mobbin 干脆不用。我们「30 方案 + 3 模板」是灵感库 + 模板库的混合体，**必须两层分开入口**。
2. **我们的行业词表缺的是「大类」，不是「同义词」。** Webflow 26 类里有 9 类我们整块没有（电商/金融/政务/医疗/地产/旅游/交通/环境/教育）。补大类比补同义词收益高一个量级。
3. **零结果的正确解法是「明确告知 + 给真有结果的去处 + best bets 硬钉」，不是放宽匹配。** 放宽匹配在本仓库已经被实测反噬过一次（政务 7/7 反向信号）。
4. **「艺术名 vs 行业词」业界有成熟解法，且两个头部都在用：Wix 的 `行业名 (风格词)`、Framer 的 `艺术名 — 用途名`。** 我们已有 `plain`（人话版，已渲染）+ `cn`/`en`（艺术名）+ `scenesYes`（适用场景），**只缺一个『用途名』字段**，不需要重新命名 30 个方案。
5. **列表 + 右侧缩略图是对的，不要改成图墙。** 图墙会让人更早随便挑一个（West Elm 42 选 4 的实测）。
6. **最大的单点收益**：把 M01/M02/M03 接进 `sceneIndex` 并做 best bets。这一步能一次性消灭「搜餐厅得到空结果，但仓库里有餐厅模板」这个最刺眼的矛盾。

---

## 附录：本报告引用的一手 URL

**NN/g（均有正文段落被引用）**
- 零结果三准则：<https://www.nngroup.com/articles/search-no-results-serp/>
- 搜索日志与 best bets / 同义词：<https://www.nngroup.com/articles/search-log-analysis/>
- 搜索建议（23% 使用率）：<https://www.nngroup.com/articles/site-search-suggestions/>
- 搜索不够 / facets 把搜索变浏览：<https://www.nngroup.com/articles/search-not-enough/>
- 空状态三准则：<https://www.nngroup.com/articles/empty-state-interface-design/>
- 渐进披露：<https://www.nngroup.com/articles/progressive-disclosure/>
- 分类命名五条：<https://www.nngroup.com/articles/category-names-suck/>
- 卡片排序与同义词：<https://www.nngroup.com/articles/card-sorting-terminology-matches/>
- 图墙 vs 列表（手机）：<https://www.nngroup.com/articles/image-vs-list-mobile-navigation/>
- 列表缩略图：<https://www.nngroup.com/articles/mobile-list-thumbnail/>
- 卡片组件定义：<https://www.nngroup.com/articles/cards-component/>
- filters vs facets：<https://www.nngroup.com/articles/filters-vs-facets/>
- polyhierarchy：<https://www.nngroup.com/videos/polyhierarchy-information-architecture/>

**站点（分类轴为本次直接从 HTML/CSS/sitemap 抄录）**
- Awwwards 图库：<https://www.awwwards.com/websites/>
- Awwwards Market：<https://www.awwwards.com/market/>
- Httpster：<https://httpster.net/>
- One Page Love：<https://onepagelove.com/>
- Webflow 模板分类：<https://webflow.com/templates/categories>
- Webflow Showcase：<https://webflow.com/made-in-webflow>
- Wix 模板：<https://www.wix.com/website/templates>
- Squarespace 模板：<https://www.squarespace.com/templates>　sitemap：<https://www.squarespace.com/sitemap.xml>
- Framer Marketplace：<https://www.framer.com/marketplace/templates/>
- Mobbin：<https://mobbin.com/>
- recent.design：<https://recent.design/>
- Baymard 搜索栏：<https://baymard.com/blog/search-bar-ui>　搜索研究总览：<https://baymard.com/research/ecommerce-search>
