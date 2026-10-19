# 主流网站设计风格分类报告（大众化可套用版）

> 目标读者：**没有设计师的小商家 / 独立开发者 / 一人公司**。
> 判定标准不是"好不好看"，而是"**街上到处在用、抄得动、几小时能出成品**"。
> 撰写人：Little Code Sauce ｜ 状态：**已完成**（12 种风格 · 12 套配方 · 12 条"别做" · 55 条来源）

---

## 0. 方法论与本报告的判据

### 0.1 为什么不能用"美学流派"当主分类

本工作区已有的 30 个方案（苏联构成主义、奥斯曼印花税票、加州滑板贴纸、爵士唱片凹版……）之所以"筛不出来"，根源是它们按**美学流派**命名。而一个开面馆、开牙科诊所、做代账的人，脑子里没有"流派"这个词，只有"我这个行业该长什么样"。

所以本报告采用**二维索引**：

| 维度 | 作用 | 举例 |
|---|---|---|
| **行业用途**（主轴） | 决定页序、必备页面、CTA 措辞 | 餐饮要"菜单 + 营业时间 + 地图"；律所要"执业领域 + 律师简介 + 免费咨询" |
| **视觉家族**（副轴） | 决定配色、圆角、阴影、字重 | Clean-Systematic / Warm-Local / High-Trust-Corporate / Bold-Expressive / Dark-Product |

**用法**：先按行业锁定 S 编号，再按品牌调性在"配方"一节挑配色。一个人不需要美学素养也能走完这条路。

### 0.2 大众化的四项硬判据

一个风格要入选，必须同时满足：

1. **模板市场里有量** —— 在 ThemeForest / Squarespace / Framer 上以"行业"为单位成批售卖（不是设计师个人作品）。
2. **有预制实现** —— Bootstrap 5 或 Tailwind 的组件库能直接拼出来，不需要写自定义 CSS。
3. **非专业人士几小时内出成品** —— 借模板/组件 + 换图换字即可上线。
4. **在真实世界随处可见** —— 街上、搜索结果里、本地商户名录里反复出现。

### 0.3 检索方法与限制（诚实声明）

- 本报告用 `web_search`（Firecrawl/External）与 `web_fetch` / `read_page` 完成检索。**未使用** Node 或 PowerShell 直连外网。
- 部分站点（Wikimedia、Wikipedia、Google、DuckDuckGo、web.dev、Awwwards、Internet Archive）在本环境不可达（见任务简报），因此**不引用**这些域名的数据。所有来源均为检索工具实际返回过的 URL。
- 凡未拿到来源的判断，正文里逐个标注"**未核实：凭印象**"。

---

## 1. 主轴验证：行业用途 vs 美学流派 —— **线索成立，但需要修正**

### 1.1 三条证据的核对结果

**证据 A：ThemeForest 畅销 HTML 模板按行业分类 —— 成立，且拿到了具体数量。**

检索到的 [ThemeForest Browse Categories](https://themeforest.net/category) 页面直接给出了 site-templates 分类与条目数：

| 分类 | 条目数 |
|---|---|
| Corporate | 7941 |
| Creative | 3680 |
| Retail | 3707 |
| Entertainment | 856 |

配套证据：[ThemeForest Corporate HTML Online Store Templates](https://themeforest.net/category/site-templates/retail?term=corporate) 页面显示，在 Retail 大类下搜 corporate，**兼容 Bootstrap 的有 151 条，ReactJS 只有 4 条，AngularJS 只有 1 条**。这条数据极其重要——它说明大众市场交付物的**技术底子就是 Bootstrap**，不是什么花哨框架。

**证据 B：Squarespace / 模板商按 topic 与行业分类 —— 成立。**

[Squarespace 官方 How to Choose a Website Template](https://squarespace.com/blog/how-to-choose-a-website-template) 自己列的"六类模板"就是用途维度，其中"Small business website templates" 明确写 **Recommended for: Restaurants, coffee shops, wellness studios, real estate agents**，并说明此类模板的重点是"你在哪、几点开门、怎么联系你"。

第三方卖家同样按行业切：[SquareLocator 2026 模板榜](https://squarelocator.com/blogs/insights/best-squarespace-templates-in-2026) 的模板命名直接是行业——Consultant（咨询/专业服务）、Clara（教练与课程）、Trove Agency（机构与工作室）、Bare Bloom Studio（沙龙与预约服务）、Method（婚礼策划）、Meadow（花店与小店）、The Hotel（酒店民宿）、Chaya Kitchen（餐厅酒吧）、Natasha Fitness（私教）、Fidelity（非营利）。作者自称在其 Platinum Partner agency 建过 400+ 个 Squarespace 站，并给出一句关键判断：**"the design is tidy rather than distinctive, which suits looking established more than standing out"**（整洁而非独特，适合显成熟而不是显眼）。这正是"大众化"的定义。

[WebGoyat 2026 小商家模板榜](https://webgoyat.com/blog/best-squarespace-templates-small-business) 给出同一张映射表的更小版本：Beaumont→摄影/创意自由职业；Clove→心理治疗与健康机构；Almar→教练与个人服务品牌；Belisa→酒吧咖啡与酒店；Crosby→小零售商与产品品牌。

**证据 C：Forbes 小商家建站指南强调服务页 + 联系页 + 足够内容 —— 成立（旁证）。**

注：本轮检索没有直接命中 Forbes 页面全文，改用两条同类来源交叉验证同一结论：
- [Squarespace 官方模板指南](https://squarespace.com/blog/how-to-choose-a-website-template)：小商家模板的核心功能是"展示你是谁、服务谁、在哪、几点开门、怎么联系"。
- [OnePagey：一页商务网站该放什么](https://onepagey.com/blog/what-to-put-on-a-one-page-business-website)：默认四块 = **Intro / About / Highlights / Contact**，并明确"Contact 块永远保留，因为它是你希望每个访客做的动作"；另有 Checklist 要求"Intro 标题说清你做什么、服务谁"，"Highlights 写 3–5 条具体理由"，"About 读起来像真企业而不是通用填充"。

### 1.2 对 Lead 线索的修正（三条）

**修正 1：行业轴是对的，但"行业"的粒度不是 ThemeForest 的大类，而是更细的经营形态。**
ThemeForest 的 Corporate / Retail 是**买模板的人选的框**；真正的区分发生在更下一层。证据：Squarespace 那批模板卖的是"consultant / coach / salon / florist / wedding planner / restaurant / hotel / trainer / nonprofit"这种**具体经营形态 14 类**，而不是"Retail"。

**修正 2："非营利"与"娱乐"这两个大类，对普通小商家没有参考价值。**
ThemeForest 的 Entertainment 只有 856 条，是 Corporate 的 **1/9**。占绝大多数的仍是 Corporate + Retail + Creative 三者（合计 15328 条）。小商家该看的其实就是这三条线。

**修正 3：真正的主轴是"行业"，但真正决定观感的第二把钥匙是"这条行业默认的信任策略"。**
律所靠**克制深色 + 衬线标题 + 真实人像 + 徽章**建立信任（[FatCow 律所建站指南](https://fatcowwebdesign.com/how-to-design-a-website-for-a-law-firm-pages-layout-and-trust-elements)、[UENI 30 个律所站案例](https://ueni.com/blog/law-firm-websites)、[CanvasBuilder 律所设计](https://canvasbuilder.co/blog/law-firm-website-design-authority-trust)）；餐厅靠**全屏食物照 + 菜单 + 营业时间 + 一键预订**建立信任（[Restaurantify 餐厅模板榜](https://restaurantify.com/20-best-restaurant-website-templates-for-online-food-ordering-delivery) 、[Naratake 餐厅形态模板](https://naratake.com/en/examples/restaurant-websites)）；SaaS 靠**品牌 Logo 条 + 具体数字 + 公开定价**建立信任（[UI Incubator SaaS 落地页指南](https://ui-incubator.com/en/blog/saas-landing-page-sections)、[Augere Labs SaaS 落地页手册](https://augerelabs.com/blog/marketing-site-that-converts-the-saas-landing-page-playbook-2026)）。

**结论：线索成立。本报告的分类表因此给出"行业"这一维，并以它为主轴编号。**

### 1.3 顺带拿到的一条技术底数（决定"大众化"的技术前提）

[Web Code Tools CSS 统计](https://webcode.tools/statistics/css) 与 [FOSSPost CSS 统计](https://fosspost.org/css-statistics) 引用 W3Techs（2026-09-15 / 2026-09-09）给出：

| 框架 | 占全站比例 | 占"检测到框架"的站点比例 |
|---|---|---|
| 未检测到任何框架 | 82.0% | — |
| **Bootstrap** | **13.4%** | **74.9%** |
| Animate | 7.5% | 41.9% |
| Foundation | 0.4% | 2.3% |
| Tailwind | 0.3% | 1.8% |

**Bootstrap 覆盖量是 Tailwind 的约 44.7 倍。** 另一侧，[State of CSS 2026](https://fosspost.org/css-statistics)（4,902 名受访者，非随机抽样）里 Tailwind 是开发者最常选（1,854 / 3,697）。两边不矛盾：**开发者爱 Tailwind，但线上跑的成品是 Bootstrap。**

> **对"大众化"的直接含义**：一份"普通人拿来就能套用"的风格配方，应该**优先用 Bootstrap 5 的栅格与组件命名**描述，同时附 Tailwind 等价类名。本报告配方一节按此执行。

同源还给出寿命参考：Stack Overflow 2025 调查 21,329 名受访者中 **21.8% 报告用过 Tailwind CSS 4**，其"admired"分为 **62.1%**；State of CSS 2026 受访者里 CSS 嵌套 70.6%、`:has()` 83.7% 的使用率说明现代 CSS 特性已进入主流，但**线上站点仍以 Bootstrap 时代的结构为主**。

---

## 2. 主流风格分类表（12 种）

### 2.0 分类表总览：行业轴 × 视觉家族

| 编号 | 中英名称 | 主行业 | 视觉家族 | ThemeForest 对应大类 |
|---|---|---|---|---|
| S01 | 通用服务型企业站 / Corporate Services Site | 装修、通风、保洁、代账、律所（初级）、制造 B2B | Clean-Systematic | **Corporate**（7941 条） |
| S02 | 单页本地生意站 / One-Page Local Business | 面包店、理发、水管工、遛狗、咨询 | Clean-Systematic | Personal / Corporate |
| S03 | 餐饮视觉主导 / Food-First Menu Site | 餐厅、咖啡、酒吧、烘焙、餐车、奶茶 | Warm-Local | Retail / 行业模板 |
| S04 | 专业服务高信任 / High-Trust Professional | 律所、会计、医疗、咨询 | High-Trust-Corporate | Corporate |
| S05 | 零售商品网格 / Commerce Grid | Shopify / 独立站小商家 | Clean-Systematic | **Retail**（3707 条） |
| S06 | SaaS 落地页 / SaaS Landing B2B | 软件、工具、API | Clean-Systematic / Dark-Product | Technology |
| S07 | 健身与预约 / Fitness & Booking Site | 健身、瑜伽、私教、沙龙、SPA | Warm-Local / Dark-Product | Retail / Corporate |
| S08 | 作品集大图 / Portfolio-First | 摄影、设计师、室内、建筑师、自由职业 | Ultra-Minimal | **Creative**（3680 条） |
| S09 | 非营利影响力 / Nonprofit Impact | 慈善、公益、社团、教会 | Warm-Local / Clean-Systematic | Nonprofit |
| S10 | 内容出版编辑式 / Editorial Publishing | 媒体、博客、律所洞察、咨询观点 | Editorial | Nonprofit / Creative |
| S11 | Bento 模块网格 / Bento Grid | 技术产品功能页、产品介绍区、个人主页 | Clean-Systematic | Technology / Creative |
| S12 | 深色产品界面 / Dark Product UI | 开发者工具、监控面板、创意工具 | Dark-Product | Technology |

> **读法**：先按你的行业找 S 编号（这才是"大众化"的入口），再按品牌性格在 §3 的配方里挑配色。**不要先挑风格再找行业**——那是 30 个方案筛不出来的根本原因。

---

### S01 通用服务型企业站 / Corporate Services Site

**一句话视觉定义**：浅色背景的纵向堆叠页面，每个区块占满整行、只讲一件事；每段之间用"白底 / 浅灰底"交替制造节奏，区块内容左对齐、以 3 列卡片网格排布。

**典型使用者**：这是模板市场里数量最大的一类，[ThemeForest Corporate 分类 7941 条](https://themeforest.net/category)，是第二大类 Creative（3680 条）的 2.16 倍。真实使用者是**有 2 个以上服务的 B2B 小公司**——装修、通风安装、保洁、代账、设备维护、本地制造。

行业结构标准来自 [Amidcode 企业站结构指南](https://amidcode.com/en/blog/corporate-website-structure) 与 [MMIX 企业站 10 要素](https://mmix.ua/en/corporate-website-structure-10-key-elements)，两家独立给出同一张页面清单：

| 页面 | 作用 | 何时必须有 |
|---|---|---|
| 首页 | 说清你做什么，把人路由到对应区块 | 永远 |
| 服务总览 | 列出全部服务，帮访客挑 | 从第二个服务起 |
| **单个服务页（一个服务一个页）** | 卖一个具体服务并收询盘 | **永远，一个服务一页** |
| 关于公司 | 打消"跟谁在打交道"的疑虑 | 永远 |
| 案例 / 项目 | 用真实例子展示结果 | 能展示结果时 |
| 联系 | 任何渠道都能找到你 | 永远 |
| 博客 | 接搜索"问题词"的流量 | 打算做 SEO 时 |

**构成要素**

- **页序（首页从上到下）**：① 顶部导航（Logo 左 / 5–7 项菜单右 / 一个"请求报价"按钮）→ ② Hero（左文右图，背景 `linear-gradient(135deg, #1E3A8A 0%, var(--primary) 100%)`，内页用 `.page-hero` 同款渐变块 + 居中 H1，`padding: 4rem 1rem`）→ ③ 服务 3 列卡片网格 → ④ 案例 3 张图 → ⑤ 数字计数器（可省）→ ⑥ 客户评价（**必须有真实姓名**）→ ⑦ 底部请求表单 → ⑧ Footer 重复联系方式与导航
- **字号阶梯**：H1 31–48px（`clamp` 流体）／H2 25–31px／H3 20px／正文 16–17px／行高 **1.6–1.8**
- **留白**：`space 8/16/24/32px` 四档；section 上下 padding **80px**；版心 **1200px**
- **圆角**：卡片 8–12px；按钮 4–8px（或 pill）
- **阴影**：`box-shadow: 0 1px 3px rgba(0,0,0,.08)`（弱到几乎看不见，仅做层次提示）
- **配色套路**：深中性色正文 + 一个品牌主色（深蓝／绿／酒红）用于标题与链接 + 一个强调色只给 CTA + 米白／暖灰背景
- **字体套路**：无衬线（Inter / Source Sans 3 / Open Sans）+ 品牌名可用一款展示体

**为什么它大众化**

1. **对内容量容错率最高**——文字多、图少、没图都不崩。小商家最缺的就是好图，这类站不靠图活。
2. **一个服务一个页 = 一个服务一个搜索入口**，直接解决小商家的获客诉求（[Amidcode](https://amidcode.com/en/blog/corporate-website-structure) 明确把"每个服务放同一个页面上"列为**最常见的结构错误**）。
3. 技术底子是 Bootstrap——[W3Techs 2026-09-15](https://webcode.tools/statistics/css) 显示 Bootstrap 覆盖 **13.4% 的全网、占"检测到框架"站点的 74.9%**；ThemeForest 的 Retail+corporate 检索里 **Bootstrap 兼容 151 条，ReactJS 只有 4 条**。
4. 有官方免费实现：**Bootstrap 5 Example** 与 **Start Bootstrap** 系列，下载即用。

**上手难度**：★★☆☆☆ —— 拿 Bootstrap 5 的 starter template，套 3 列卡片的官方示例，改字号变量。**首页 + 4 个内页约 6–8 小时**；只做首页 + 联系页约 2 小时。

**来源**：[ThemeForest Category](https://themeforest.net/category) ｜ [Amidcode 企业站结构](https://amidcode.com/en/blog/corporate-website-structure) ｜ [MMIX 企业站 10 要素](https://mmix.ua/en/corporate-website-structure-10-key-elements) ｜ [Kmacims 多页企业站教程（含 `.page-hero` 代码）](https://kmacims.com.ng/build-a-multi-page-business-website-no-frameworks) ｜ [ThemeForest Retail+corporate 检索结果](https://themeforest.net/category/site-templates/retail?term=corporate) ｜ [W3Techs via Web Code Tools](https://webcode.tools/statistics/css)

---

### S02 单页本地生意站 / One-Page Local Business

**一句话视觉定义**：一屏一主题、全站在一个 URL 内纵向排列的锚点滚动页——顶部是吸顶导航（Logo + 4–6 个锚点 + 一个 Contact 按钮），往下依次是 Intro / About / Highlights / Services / Testimonials / Contact，每段之间用**浅底与深底交替**制造节奏。

**典型使用者**：单人经营或 5 人以下的本地生意。证据来自 [OnePagey 官方指南](https://onepagey.com/blog/what-to-put-on-a-one-page-business-website)，它把默认结构直接定为四块并给了具体取舍：

| 块 | 内容 | 判据 |
|---|---|---|
| **Intro** | 店名 + 标题 + 副标题 + 一张真实照片 + Contact 按钮 | 好的标题 = 具体地点或定位 + 清楚的产品。"Artisan Bakery in Portland" ✅；"Welcome to our website" ❌ |
| **About** | 2–4 句：你是谁、为什么做这件事 | 要提年份、家族经营、本地口碑；不能是复制粘贴的通用文案 |
| **Highlights** | 3–5 条可扫读卖点 | 短句胜过长段。例："fresh daily bakes / same-day quotes / wedding specialists" |
| **Contact** | 电话、邮箱、地址或简单表单 | **永远保留**，因为它是你希望访客做的唯一动作 |
| 可选 Services | 最多 6 项单价服务 | 沙龙、手艺活、咨询等"菜单式报价"的生意 |
| 可选 Testimonials | 客户原话 | **一条真实评价胜过三条通用评价** |

同源还给出一句极准的行业分层："Local shop or café: Default blocks are often enough. Use Highlights for signature products and hours。"

**构成要素**

- **版心**：单列窄版心 **680–760px**（正文），Hero 与图像块可全宽
- **节奏**：section 上下 padding **80px**；`html { scroll-behavior: smooth }`；`section` 带 `id`，导航用 `#services` 这类锚点；用 Intersection Observer 做当前区块高亮
- **字号**：H1 32–44px／正文 16–18px／行高 1.6–1.7
- **圆角**：图片与按钮 8–12px，或干脆 0（更清爽）
- **配色**：底色 + 1 主色 + 1 强调色（只给 CTA）。区块交替用 `#FFFFFF` / `#F8F8F6`
- **字体**：Inter / Nunito / DM Sans；温暖型生意（咖啡、面包）可配 Lora 或 Fraunces 做标题

**为什么它大众化**

1. **内容压力最小**——[OnePagey](https://onepagey.com/blog/what-to-put-on-a-one-page-business-website) 明确"大部分店主先只上 Highlights，Service 以后再补"，说明这个格式允许内容不齐就上线。
2. **价格门槛最低**——检索到的市价：Squarespace 的 Social Light 一页模板 **$159**、Embody 单长页 **$299**（[SquareLocator](https://squarelocator.com/blogs/insights/best-squarespace-templates-in-2026)、[Squarespell](https://squarespell.com/squarespace-blog/best-squarespace-templates-for-personal-trainers-fitness-studios)）。
3. **SEO 代价被明说且可接受**——[UIXDraft 一页站指南](https://uixdraft.com/html-template-for-one-page-website) 直说"一个 URL 只能有效瞄准一组主关键词"，小商家正好只有一个主业务。
4. 有大量现成实现：OnePagey、UIXDraft、Bootstrap 的 Single Page 模板。

**上手难度**：★☆☆☆☆ —— **这是全部 12 种里最容易的**。单 HTML 文件 + 4 个 section，改文字换图就走。**3–4 小时**可出成品。

**来源**：[OnePagey 一页站该放什么](https://onepagey.com/blog/what-to-put-on-a-one-page-business-website) ｜ [UIXDraft 一页站 HTML 模板](https://uixdraft.com/html-template-for-one-page-website) ｜ [SquareLocator 2026 Squarespace 模板榜](https://squarelocator.com/blogs/insights/best-squarespace-templates-in-2026) ｜ [Squarespell 健身与工作室模板榜](https://squarespell.com/squarespace-blog/best-squarespace-templates-for-personal-trainers-fitness-studios)

---

### S03 餐饮视觉主导 / Food-First Menu Site

**一句话视觉定义**：满屏大尺寸食物照 + 一排"关键信息"小图标条（菜单 / 取餐配送 / 营业时间与位置 / 联系），导航只 5 项，首页在照片之间穿插菜名与价格。

**典型使用者**：餐厅、咖啡、酒吧、烘焙、餐车、奶茶。有非常干净的行业证据——[Naratake 的 7 个真实餐厅构建](https://naratake.com/en/examples/restaurant-websites) 把同一底层模板拆成 7 种经营形态，每种首页 Lead 的东西不同：

| 模板 | 首页 Lead | 页序 |
|---|---|---|
| Chinese Restaurant | 双语菜单 + 故事 + 好评墙 | Home · Menu · Pickup & Delivery · Hours & Location · About · Contact |
| American Diner | 照片优先的菜单页 + 好评墙 | Home · Menu · Pickup & Delivery · Contact |
| Coffee Shop | 每日菜单 + 单品照 + 熟客氛围 | Home · Menu · Pickup · Contact |
| Bakery | 糕点预订 + 定制蛋糕（带图） | Home · Collection · Custom Cakes · Contact |
| Bar & Grill | 菜单 + 活动日历 + 营业时间与位置 | Home · Menu · Events · Hours & Location · Contact |
| Food Truck | 今日位置横幅 + 照片菜单 + 本周排期 | Home · Pickup & Delivery · Find Us · Contact |
| Bubble Tea | 全菜单页（甜度 / 冰量 / 小料全拍） | Home · Menu · Pickup & Delivery · Contact |

同一来源给出一句可直接当设计判据的话："**Start with the menu, location and hours, then choose how customers should reach you.**"

**构成要素**

- **页序**：Hero（全屏食物照或食物网格）→ 招牌菜 3–4 图 + 名 + 价 → 菜单区 → 营业时间 / 位置 / 地图 → 一键预订或下单 → 好评墙 →（可选）订阅邮件
- **颜色套路（可抄）**：经典三色 **黑 + 白 + 红**（[Restaurantify](https://restaurantify.com/20-best-restaurant-website-templates-for-online-food-ordering-delivery) 指出这是"餐厅模板最想要的三色"）；或暖木色系：奶油 `#FBF7F0`、木棕 `#6B4A2F`、番茄红 `#C0392B`、墨黑 `#1C1C1C`
- **字体**：标题用高对比展示衬线（Playfair Display / DM Serif Display）或粗黑无衬线（Archivo / Oswald）；正文 16–17px，行高 1.6
- **菜单排版关键**：菜名左、价格右对齐同一基线，价格数字用 `font-variant-numeric: tabular-nums`；行与行之间用点线或 4–8px 间隔；**不要用 PDF 做菜单**
- **卡片**：图 4:3 或 1:1，圆角 0–8px（餐饮更常见直角，显正式）；桌面 3–4 列 grid，胶囊间距 `gap: 24px`；移动端 2 列
- **留白**：section 上下 **64–96px**；Hero 可 `min-height: 85vh`

**为什么它大众化**

1. **食物照片本身就是说服力**，不需要文案力——这是"无设计师小商家"最大的杠杆。
2. **模板供给最成熟**——[Restaurantify](https://restaurantify.com/20-best-restaurant-website-templates-for-online-food-ordering-delivery) 一家就列了 20 个餐厅模板（Fooday / Classic / Tamarind / Steak In / Delizus / Granny / Soup / Plato / Vincent / Koad…），其中 Delizus、Soup 等都明确说明"**built using the Bootstrap framework**"、带 5–7 套配色。
3. **商业闭环直给**——模板普遍内置在线点餐与预订表单（"a reservation form… available from the moment the visitor lands on the page"）。
4. **Framer 等新平台也已跟进**：[Framer Marketplace 的 Pepper](https://framer.com/marketplace/templates/pepper) 明确面向"pizza shops, restaurants, cafés, and food delivery brands"，含 hero / featured menu items / offers / desserts / locations 完整区块 + 结构化数据占位脚本。

**上手难度**：★★☆☆☆ —— 拿餐厅模板 + 单页结构，替换菜单与照片。**2–4 小时**。

**来源**：[Naratake 餐厅形态模板](https://naratake.com/en/examples/restaurant-websites) ｜ [Restaurantify 餐厅模板榜](https://restaurantify.com/20-best-restaurant-website-templates-for-online-food-ordering-delivery) ｜ [Framer Pepper 模板](https://framer.com/marketplace/templates/pepper) ｜ [SquareLocator（Chaya Kitchen 餐厅 / 酒吧模板）](https://squarelocator.com/blogs/insights/best-squarespace-templates-in-2026)

---

### S04 专业服务高信任 / High-Trust Professional

**一句话视觉定义**：深色（藏青 / 炭黑 / 酒红）+ 大留白；衬线体做大标题；首屏右上角一个**看得见的电话号码**；紧跟一条"协会 / 奖项 / 评分"徽章行；正文段落不超过三行。

**典型使用者**：律所、会计、医疗、咨询。这是被行业文章写得最死的一类，三家独立来源给出几乎相同的配方：

- [FatCow 律所建站指南](https://fatcowwebdesign.com/how-to-design-a-website-for-a-law-firm-pages-layout-and-trust-elements)：
  - **首屏五要素**：① 标题说清 **who you help and how**（不是公司名）② 副标题写差异点（年限 / 专精 / 结果）③ **右上角可见电话** ④ 一个主 CTA（Free Consultation / Case Evaluation / Contact）⑤ 一条信任信号（协会、奖项、评级）
  - **字体死规定**：标题 Playfair Display / Cormorant / Libre Baskerville；正文 Inter / Source Sans / Open Sans；**正文 ≥ 17px 桌面、16px 移动；行高 1.6–1.8**；禁用花体与婚礼风字体
  - **配色死规定**：主深中性色（炭黑或藏青）做正文、次品牌色（深蓝 / 深绿 / 酒红）做标题与链接、**一个**强调色只给 CTA、米白或暖灰做底
  - **导航**：**5–7 项**，典型结构 `Home | About | Attorneys | Practice Areas | Results | Blog | Contact`；**禁止创意标签**（原文："Avoid clever labels like 'Our Team of Champions.' Clients search for 'attorneys,' not champions."）
- [UENI 30 个律所站案例](https://ueni.com/blog/law-firm-websites)：首屏图必须是**真实律师肖像 / 法庭 / 正义女神 / 城市天际线**，"**never generic stock photography of 'business handshakes'**"；排版"serif or near-serif for the firm name"。并指出**最常见失败模式**："elegant homepages and no clear path from 'I read this' to 'I booked a call'"
- [CanvasBuilder 律所设计](https://canvasbuilder.co/blog/law-firm-website-design-authority-trust)：给出**完整的六段页序**（Hero → 执业领域网格 → 律师简介 → 结果与资质计数器 → 客户评价 → 联系与咨询表单），并附可直接抄的 CSS 变量与一段 Bootstrap 5 卡片代码（`card h-100 border-0 shadow-sm p-4`）

**构成要素**

- **页序**：Hero（执业领域标题 + 法庭 / 办公室背景图 + 单 CTA）→ 执业领域网格（图标卡或描边列）→ 律师简介（头像 + 姓名 + 头衔 + 执业资格 + 短传记）→ 结果与资质（数字计数器：办案数 / 胜诉 / 合计年资 + 奖项）→ 客户评价 3–5 条（带全名与案件类型）→ 联系与咨询表单（大号字体电话 + 内嵌表单 + 地址与地图）
- **律师简介页**（全站首页之外访问量最高的页）：① 专业但有人味的头像 ② 名字下一句定位语（"Trial attorney focused on catastrophic injury cases in Miami"）③ 第三人称叙事传记 **300–600 词** ④ 教育与执业资格 ⑤ 代表性结果 ⑥ 发表与演讲 ⑦ 协会会员 ⑧ 直接联系 CTA
- **字号**：正文 ≥ 17px / 行高 1.6–1.8 / 段落 ≤ 3 行 / 每 2–3 段一个小标题 / 多项目符号
- **圆角**：0–8px（刻意克制，甚至直角更显传统）
- **阴影**：`shadow-sm` 级别，几乎不用
- **性能**：LCP < 2.5s；移动优先（原文：超 65% 法律搜索来自手机）

**为什么它大众化**

1. **高单价 + 长决策周期**，客户就是在评估能力与可信度，行业把"信任要素清单"标准化了——**照着清单装齐就及格**，不需要设计天赋。
2. **配色与字体被行业锁死**，反而降低了决策成本：深蓝 / 炭灰 / 酒红 + 衬线标题 + 无衬线正文，几乎是"照抄即可"。
3. 是 ThemeForest **Corporate 大类（7941 条）的核心子集**，模板供给极其充分。
4. 直接对应转化：每页一个明确下一步、手机上一键拨号、表单字段最少。

**上手难度**：★★★☆☆ —— 结构清晰但细节要求多（要真实头像、要资质文案、要 300–600 词传记）。**4–6 小时**完成首页 + 执业领域 + 联系页。

**来源**：[FatCow 律所建站指南](https://fatcowwebdesign.com/how-to-design-a-website-for-a-law-firm-pages-layout-and-trust-elements) ｜ [UENI 30 个律所站案例](https://ueni.com/blog/law-firm-websites) ｜ [CanvasBuilder 律所设计权威](https://canvasbuilder.co/blog/law-firm-website-design-authority-trust)

---

### S05 零售商品网格 / Commerce Grid

**一句话视觉定义**：面包屑 → 分类标题 + 一句意图说明 → 筛选 / 排序条 → **3–4 列等大商品卡片网格** → 一段长文案 → 分页。卡片里是"图 + 商品名 + 价格"，别的一概不放。

**典型使用者**：用 Shopify / WooCommerce 的小零售商家。这是 [ThemeForest Retail 分类 3707 条](https://themeforest.net/category) 覆盖的领域，同分类下 WordPress 版还有 **1824 条**。

**构成要素（全部有出处，可直接照做）**

**页序（固定）**——来自 [LiquidBoost 分类页最佳实践](https://liquidboost.app/blog/ecommerce-category-page-best-practices) 给出的骨架：

```
[面包屑] [分类标题 H1] [50-100 词引导文案] [筛选条 / 排序选项]
[商品网格] [200-400 词带 H2 的 SEO 内容] [分页]
```

**列数**（同一来源，实测建议）：

| 设备 | 列数 | 理由 |
|---|---|---|
| 桌面 ≥1200px | 3–4 | 4 列给图片驱动商品，3 列给需要更多文案的商品 |
| 平板 768–1199px | 2–3 | 无侧栏时 3 列，有侧栏时 2 列 |
| 手机 <768px | **2** | Baymard Institute 研究：2 列移动网格的用户满意度**比单列高 16%** |

**触控目标最小 44×44px**（WCAG）。

**卡片内容优先级**（同源）：① 商品图（最大元素，背景干净）② 商品名（1–2 行，超出省略号）③ 价格（醒目，有折扣时显示对照价）④ 评分（如"4.5 (12)"）⑤ 颜色 / 规格色块 ⑥（可选）快速加购按钮。**卡片里禁止放**：长描述、完整规格、多个 CTA、复杂交互。

**图片一致性规范**（同源四项）：所有图同一宽高比（**1:1 或 3:4** 最常见）／同一背景（白、浅灰、场景图三选一，一个分类内统一）／产品位置与画面占比一致／光照与色温一致。

**筛选**：显示每个选项的命中数量（"Blue (24)"）；支持多选；AJAX 无刷新更新；已选条件显示为可移除 chip；有"清除全部"；移动端用**抽屉 / 底部弹出**而不是常驻侧栏。

**排序**：至少提供 `Featured / Price: Low to High / Price: High to Low / Newest / Best Selling / Rating`。**避免"按字母排序"**，除非卖书或品牌明确的商品。

**每页商品数**：**24–48 之间**；36 是高转化 Shopify 店的常见默认值；低于 24 页数太多，高于 48 加载慢。

**分页方式**：[Kimonix](https://kimonix.com/blog/product-category-page-design) 与 [LiquidBoost](https://liquidboost.app/blog/ecommerce-category-page-best-practices) 一致推荐**"加载更多 + 分页兜底"的混合方案**，因为纯无限滚动会让 Google 爬虫抓不到后续商品。

**字体与配色**：几何无衬线（DM Sans / Inter / Poppins）；价格用 `tabular-nums` 保证小数点对齐；白底 + `#F5F5F5` 浅灰底 + 一个品牌强调色。徽章只用"New / Low stock / Bestseller"三种且要克制到还有意义。

**为什么它大众化**

1. **电商是小商家最通用的需求**，而网格布局已经是行业共识，不需要创新。
2. **有平台托底**：Shopify / WooCommerce 主题本身就实现了这套网格，商家只需调 CSS 变量。
3. **有量化依据可抄**：Baymard Institute 研究显示 **42% 的主要电商站分类页实现"mediocre"或"poor"**（[LiquidBoost 引用](https://liquidboost.app/blog/ecommerce-category-page-best-practices)）——反过来说，只要照标准做就超过四成同行。
4. 第一行是最值钱的位置：**"the first row is the most-seen real estate on the page"**，要当成人工策展的货架，而不是默认排序（[Kimonix](https://kimonix.com/blog/product-category-page-design)）。

**上手难度**：★★☆☆☆ —— 用电商平台主题 + 改配色 + 配筛选器。**2–3 小时**能调出首页 + 一个分类页。

**来源**：[LiquidBoost 分类页最佳实践](https://liquidboost.app/blog/ecommerce-category-page-best-practices) ｜ [Kimonix 分类页设计](https://kimonix.com/blog/product-category-page-design) ｜ [ThemeForest Category](https://themeforest.net/category) ｜ [WCAG 触控目标](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)

---

### S06 SaaS 落地页 / SaaS Landing B2B

**一句话视觉定义**：单页纵向，首屏是居中大标题 + 一条副标题 + **两个**按钮 + 产品截图；紧接一条 4–6 个客户 Logo 的横条；再往下是功能、定价、FAQ、结尾 CTA。

**典型使用者**：软件、工具、API、开发者服务。第三类证据同时锁定了结构。

**构成要素**

**页序（三家来源完全一致）**

[UI Incubator SaaS 落地页分节指南](https://ui-incubator.com/en/blog/saas-landing-page-sections) 与 [Augere Labs SaaS 落地页手册](https://augerelabs.com/blog/marketing-site-that-converts-the-saas-landing-page-playbook-2026) 给出同一序列：

```
Hero → 社交证明条 → 问题 → 解决方案 → 功能(3-6 项) → 更深的证明/案例 → 公开定价 → FAQ → 结尾 CTA
```

UI Incubator 明确它是 **AIDA 框架的 SaaS 适配**：Attention（Hero）→ Interest（社交证明 + 功能）→ Desire（定价、评价、FAQ）→ Action（结尾 CTA），并警告"重排这个顺序会破坏心理流程"。

**Hero 数值（UI Incubator 给的实现）**

- 区块高：`min-height: 85vh`，内容居中，`max-width: 720px`
- H1：`font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 700; line-height: 1.08; letter-spacing: -0.03em`
- 副标题：`font-size: 1.125rem; line-height: 1.7`，`max-width: 560px`
- 徽章（"Now in public beta"）：pill 形状，`padding: .5rem 1.25rem`，`font-size: .8125rem`
- 按钮：`padding: .875rem 2rem`，pill，主按钮填充强调色，次按钮 1px 描边

**Hero 铁律（同源）**：**一个**价值主张，不是三个；CTA 写结果（"Start free trial" 胜过 "Get started"）；最多两个 CTA（一个高承诺 + 一个低承诺）。

**社交证明条**：紧跟 Hero，`padding: 3rem 0`，上下 1px 分界线；**4–6 个可辨识客户 Logo**，`height: 28px`，整条 `opacity: .6`。没有客户 Logo 时用数字替代："4,200+ teams / 99.9% uptime / 50M+ API calls processed"。

**功能区块两种布局**：交替行（左文右图再交换，适合 3–4 个功能）或 **3 列卡片网格**（适合 6 个以上）。每段描述**不超过 2 句**，先写收益再写功能。

**定价表**：**三档并排**（Free/Starter 建基线、**Pro 高亮为"Most Popular"**、Enterprise 写"Contact sales"）；每档 **5–8 条勾选式特性**；每档一个 CTA；年付 / 月付切换，**默认年付并明示节省额**。[Augere Labs](https://augerelabs.com/blog/marketing-site-that-converts-the-saas-landing-page-playbook-2026) 给出一条可量化的判断：年费低于 $30K 的产品**必须公开定价**，"把 Contact sales 作为主要路径会让自助 SaaS 转化下降 40–70%"。

**FAQ**：accordion 折叠，`max-height` 过渡 300ms；每答 **2–3 句**；[Augere Labs](https://augerelabs.com/blog/marketing-site-that-converts-the-saas-landing-page-playbook-2026) 建议放"每次销售电话都会出现的 6–10 个问题"，并加 **FAQPage JSON-LD** 结构化数据。

**结尾 CTA**：与 Hero 同一个 CTA；`no credit card required` 之类的减摩擦文案；**只放一个按钮**。

**字体与配色**（[GreenGeeks 最佳 Google Fonts](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux) 的推荐与"最佳用途"列）：`Plus Jakarta Sans`（SaaS UI）、`Manrope`（SaaS UI）、`Inter`（正文与 UI）、`Space Grotesk`（科技品牌）。配色：白 / 近白底 + 单一强调色 + 大面积中性灰；深色版见 S12。

**性能底线**（[Augere Labs](https://augerelabs.com/blog/marketing-site-that-converts-the-saas-landing-page-playbook-2026) 给的具体数字）：4G 下 **加载 < 1.5s**；图片 WebP / AVIF + `srcset` + 折叠下方懒加载；**预加载 hero 图与字体**；服务端渲染。

**为什么它大众化**

1. **结构已被证明到可以当模板**——所有来源都强调"这个顺序不是随意的"，反过来说照做即可。
2. **组件化程度最高**：每个区块都是独立组件，[UI Incubator 的组件库](https://ui-incubator.com/en/blog/saas-landing-page-sections) 把 hero / social proof / features / pricing / testimonials / FAQ / CTA 全部单列成可直接取用的目录。
3. **有现成 UI 套件**：`shadcn/ui` 在 State of CSS 2026 中被 **802 / 3,697 名受访者选择**，位列第四（[FOSSPost 统计](https://fosspost.org/css-statistics)）。
4. **内容量可控**：整个页面 9 段，每段 1–2 句话，一个创始人半天能写完。

**上手难度**：★★★☆☆ —— 结构好抄但**文案难写**（需要提炼价值主张）。用 Tailwind / React 组件库拼装约 **4–6 小时**；纯 Bootstrap 手写约 1 天。

**来源**：[UI Incubator SaaS 分节指南](https://ui-incubator.com/en/blog/saas-landing-page-sections) ｜ [Augere Labs SaaS 落地页手册](https://augerelabs.com/blog/marketing-site-that-converts-the-saas-landing-page-playbook-2026) ｜ [GreenGeeks 最佳 Google Fonts](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux) ｜ [FOSSPost CSS 统计（State of CSS 2026）](https://fosspost.org/css-statistics)

---

### S07 健身与预约 / Fitness & Booking Site

**一句话视觉定义**：Hero 放大图 + 一句"首次免费体验"的强主张 + 一个按钮；紧接着**独立的课程表页**；教练以卡片网格呈现；价格以 3 档左右并排、左对齐无得多。

**典型使用者**：健身房、瑜伽 / 普拉提工作室、私教、沙龙、SPA、宠物美容。证据来自三条互相印证的来源。

[Naratake 沙龙系列](https://naratake.com/en/examples/salon-websites) 给出一句最准的行业判据："**A salon website has one job the moment it loads: turn a person who is looking at your work into a booking with a name on it.**" 并把同一底层拆成 5 种形态，**每种 Lead 的东西不同**：

| 模板 | 首页 Lead |
|---|---|
| Hair Salon | 服务菜单 + 造型师简介 |
| Nail Salon | 作品画廊 + 前后对比滑块（因为作品就是卖点） |
| Barbershop | 那把椅子 + 月度会员制 |
| Spa & Massage | 安宁的服务列表 + 技师匹配 |
| Pet Grooming | 按体型定价 |

同一来源还给出一套**预约系统的具体参数**：15 分钟为格的日历、每次预约前后各 10 分钟缓冲、下一个可约时段前 2 小时截止、**每个人独立的周内工时**（避免给出没人在的周二）、可要求定金托管在商家自己的 Stripe 账户。

[Yantracore 健身模板评测](https://yantracore.com/blog/best-fitness-gym-website-templates-2026) 给出四条硬判据：
1. **课程表要能自己改，1 分钟内改完**，手机可读。原文："Class times are the most-checked page on every studio site I have ever pulled analytics for. It beats the homepage some months."
2. **只推一个体验offer**，放在 Hero、导航、每页底部。原文警告："Templates that scatter three competing buttons (Join, Contact, Learn More) split the click and lose it."
3. **价格必须写**。原文："Even a from-price with a short explanation converts better than a contact form."
4. **评价轮播每 2 秒自动切换比没有还糟**——"nobody finishes reading slide one"。
5. 并指出**大多数健身模板默认深色**。

[Squarespell 健身模板榜](https://squarespell.com/squarespace-blog/best-squarespace-templates-for-personal-trainers-fitness-studios) 给出真实成交结构：Rise（瑜伽普拉提，7 页，含 Our Classes / **Schedule** / Locations / Get Started，$188.30）、Form Haus（精品工作室，8 页，含 Classes / **Pricing** / Location / FAQs / Shop，$189，**价格页做三档课卡**：单次 $20 / 5 次 $90 / 不限次月费 $199）、High Speed（私教，**每个套餐独立一页**，$299）、Embody（**单长页**，卖一个签名课程，$299）。

该来源还给出一个**极重要的结构判据**：「**What you teach, kept apart from when**（教什么 与 什么时候教 要分开）——因为这两者变动频率不同。」并给出定价方案：`Acuity Scheduling` 是 Squarespace 唯一原生集成的排程器，年付 **$16/月起**。

**构成要素**

- **页序**：Hero（大图 + 一句体验 offer + 1 按钮）→ 课程 / 服务列表（每项一句描述 + 一个 Sign Up）→ **课程表独立页** → 教练 / 技师卡片（头像 + 一行专长 + 预约链接）→ 价格（3 档并排，每档一个 CTA）→ 位置与地图 → 评价 → FAQ
- **字号**：Hero H1 长（`clamp`）；正文 16px；表格 / 课程表用 15px 且行高放宽
- **圆角**：卡片 12–16px；按钮 pill（柔和型）或 4px（力量型）
- **配色**：柔和型（瑜伽 / SPA）用米白 + 鼠尾草绿 + 陶土色；力量型用近黑 `#111` + 荧光黄 `#E8FF3A` 或电蓝
- **字体**：几何无衬线（Montserrat / Poppins / Space Grotesk）显力量；柔和型可用 Work Sans / Nunito

**为什么它大众化**

1. **商业闭环最短**——预约按钮直接连到已有的排程 SaaS，商家不需要造系统。
2. **模板供给按形态细分得很成熟**（瑜伽 / 普拉提 / 私教 / 沙龙 / SPA 各有专属模板）。
3. **"一页 vs 多页"有明确判据**可套：有每周课表 → 多页（课表独立）；只卖一个课程 → 单长页（[Squarespell](https://squarespell.com/squarespace-blog/best-squarespace-templates-for-personal-trainers-fitness-studios) 的 Embody 就是后者）。
4. 有开源实现可白拿：[GitHub 单文件健身房模板（MIT）](https://github.com/atlashey-collab/gym-website-template)，一个 `index.html`、无构建步骤、无后端，**预约逻辑只是拼一条 WhatsApp 深链**：
   ```js
   const text = `Hi! I'd like to book a FREE TRIAL: %0A• Class: ${cls} %0A• Day: ${day} %0A• Time: ${time} %0A• Name: ${name}`;
   window.open(`https://wa.me/${PHONE}?text=${text}`);
   ```

**上手难度**：★☆☆☆☆（沙龙 / SPA，纯展示 + 跳转预约）～ ★★★☆☆（多店健身房）。**3–5 小时**。

**来源**：[Naratake 沙龙形态模板](https://naratake.com/en/examples/salon-websites) ｜ [Yantracore 健身模板评测](https://yantracore.com/blog/best-fitness-gym-website-templates-2026) ｜ [Squarespell 健身与工作室模板榜](https://squarespell.com/squarespace-blog/best-squarespace-templates-for-personal-trainers-fitness-studios) ｜ [GitHub 单文件健身房模板 MIT](https://github.com/atlashey-collab/gym-website-template) ｜ [Hampox Glow 沙龙模板](https://hampox.app/templates/beauty-wellness/salon)

---

### S08 作品集大图 / Portfolio-First

**一句话视觉定义**：图像占绝对主导，导航只 4–6 项且其中一项直接是"Book Me / Contact"；文字极少，通常只有一个大标题加 2–3 句简介；作品以等大网格或瀑布流铺开。

**典型使用者**：摄影师、设计师、插画师、室内设计、建筑师、自由职业者。对应 [ThemeForest Creative 分类 3680 条](https://themeforest.net/category)。

[CanvasBuilder 作品集模板指南](https://canvasbuilder.co/guides/best-portfolio-website-templates) 直接把模板分成 4 个命名的子型，附"最佳适用"：

| 子型 | 视觉特征 | 最佳适用 |
|---|---|---|
| **Minimal grid** | 干净项目网格 + 悬停预览 | 设计师、插画师 |
| **Photography full-bleed** | 出血满幅图，界面元素最少 | 摄影师、摄像师 |
| **Personal brand** | Hero 头像 + 短简介 + 服务 + 评价 | 自由职业者、顾问 |
| **Architect / interior** | 大项目图 + 图纸 + 疏朗留白 | 建筑师、室内设计师 |

[SiteBuilderReport 作品集模板榜](https://sitebuilderreport.com/portfolio-website-templates) 给出具体实现细节作为佐证：Beaumont 的「**两列大缩略图**」首页直接兼作作品区，单独作品页是**全宽图 + 一段简短描述**；整个设计是"**white background with black text surrounded by plenty of whitespaces**"，About 与 Contact 页同一语言；另一款 Quinn 用"**bold typography, ample white space, high-quality imagery**"，配"straightforward navigation and monochromatic color palette"；Matsuya 则用**瀑布流网格 + 单色调色板**让照片成为焦点。

[InspoAI 30 个设计作品集站](https://inspoai.com/blog/best-portfolio-website-designs-for-designers) 给出可抄的代码级参数：

- 响应式网格：Tailwind 类 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- 间距：section `p-12`（桌面）/ `py-10`（移动）；卡片之间 `gap-8`；卡片内 `p-4` + `rounded-lg` + 轻微阴影
- 导航保持极简，按 4–5 个分类分组作品
- 每个项目**独立页面**，含问题 → 过程 → 结果，可用前后对比滑块
- About 简介保持 **2–3 句**，结尾一个明确 CTA（"Hire Me" / "Get in Touch"）

**构成要素**

- **版心**：作品网格全宽或 `max-width: 1440px`；文本块窄到 **600–700px**
- **网格**：桌面 2–3 列（图像越重要列数越少），移动 1 列；`gap: 24–32px`
- **图片**：统一宽高比；`loading="lazy"` 只给折叠下方
- **字号**：H1 32–56px（常极粗或极细两端取一）；正文 16–17px；**行高 1.5–1.7**
- **圆角**：0–8px（作品集普遍偏直角，避免"卡片感"盖过作品）
- **配色**：白 + 黑 + 一个强调色；或全单色（照片本身提供颜色）
- **字体**：一款字体的多个字重（Inter / Work Sans / Space Grotesk），或用商业展示体 + 开源替代（Studio AF 案例用 Denton 配 Inter）
- **交互**：卡片 hover 时加深图像并浮出项目名；`position: sticky` 侧栏显示当前项目名；顶部阅读进度条

**为什么它大众化**

1. **对"换图换字"的容忍度最高**——只要照片好，模板里的文字几乎不用改。
2. **模板商把它做成了标准化产品**，且明确按职业细分（摄影师 / 设计师 / 建筑师 / 自由职业者），选型成本极低。
3. **单人即可维护**：页面数量少（首页 + 作品页 + About + Contact）。
4. 有商业案例与参数级实现（[InspoAI](https://inspoai.com/blog/best-portfolio-website-designs-for-designers) 给了完整 Tailwind 类名与间距数值）。

**上手难度**：★★☆☆☆ —— 结构最简单，唯一门槛是**照片质量**（[SiteBuilderReport](https://sitebuilderreport.com/portfolio-website-templates) 反复强调模板效果等于照片效果）。**2–3 小时**。

**来源**：[CanvasBuilder 作品集模板指南](https://canvasbuilder.co/guides/best-portfolio-website-templates) ｜ [SiteBuilderReport 作品集模板榜](https://sitebuilderreport.com/portfolio-website-templates) ｜ [InspoAI 30 个设计作品集站](https://inspoai.com/blog/best-portfolio-website-designs-for-designers) ｜ [ThemeForest Category](https://themeforest.net/category)

---

### S09 非营利影响力 / Nonprofit Impact

**一句话视觉定义**：首屏一屏内塞进"一句话使命 + 一个捐赠按钮 + 一个次要按钮 + 一个即时信任提示"；紧接着是三张带**具体数字**的影响卡片；底部是带预设金额的捐赠表单。

**典型使用者**：慈善、公益、社团、教会、基金会。对应 [ThemeForest Nonprofit 分类](https://themeforest.net/category)（本轮未取到该类条目数，**未核实：凭印象**该分类存在且位于 site-templates 下）。

**构成要素**

[LearnKu 慈善页 PHP 模式文章](https://learnku.com/articles/90955) 给出一份**可以直接当验收清单**的规格：

- **首屏（donation-first fold）**：一句使命 + 一句影响限定语 + **一个主 CTA（Donate）** + **一个次 CTA（Volunteer）**，旁边跟一条微文案承诺（"Receipts instantly by email"）
- **英雄图**：静态图（**不要自动播放视频**），必须写 `width` / `height`，加 `fetchpriority="high"`
- **项目网格**：**3–6 张卡**，图片比例一致，**每张卡结尾一个"Donate to this program"微 CTA**
- **捐赠表单**：预设金额 + 自定义输入 + **月度捐赠开关** + 费用说明 + 隐私提示；表单控件可键盘操作、有 ARIA 标签、错误绑定到对应输入框
- **志愿者路径**：先短表单（姓名、邮箱、意向角色），详细表单后置，**日期尽早露出**
- **治理透明度**：理事会名单 + 最近年报链接 + 一句"资金怎么用"，要**可扫读**而不是一个 PDF 迷宫
- **性能**（field 而非 lab）：首页 / 捐赠 / 志愿 / 联系页 **LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1**；关键 CSS 内联 **≤ 15KB**
- **可直接抄的 token**：
  ```css
  :root{
    --container: 1200px;
    --space-2: 8px; --space-4: 16px; --space-6: 24px; --space-8: 32px;
    --step-0: clamp(1rem, 0.9rem + 0.6vw, 1.125rem);
    --step-1: clamp(1.4rem, 1.1rem + 1.0vw, 1.8rem);
  }
  .container{ max-width: var(--container); margin: 0 auto; padding: 0 var(--space-4); }
  .section{ padding: var(--space-8) 0; }
  body{ font-size: var(--step-0); line-height: 1.6; }
  h1{ font-size: var(--step-1); line-height: 1.2; letter-spacing: -0.01em; }
  ```

[UIXDraft 非营利模板](https://uixdraft.com/website-template-for-nonprofit) 与 [UIXDraft 慈善模板](https://uixdraft.com/website-template-for-charity) 补充了行业专属要素：

- **影响数字计数器**："14,200 meals provided this year" / "320 families housed in 2025"——原文："Specific numbers convert donations at higher rates than vague mission statements."
- **捐赠金额锚定**：`$10 buys 4 meals · $25 provides a week of food · $50 feeds a family for a month`；预设金额 **$10 / $25 / $50 / 自定义**，**中间档标"Most Chosen"可把平均捐赠额提高 20–30%**（该来源给出的数字）
- **月度捐赠价值**：该来源称月度捐赠者**生命周期价值是单次捐赠者的 3 倍**
- **受益者故事**：真实人物 + 具体结果，原文："One genuine story with a real person and specific outcome outperforms ten infographics."
- **透明度徽章**：慈善注册号（UK Charity Commission / OSCR）、年报 PDF 链接、财务问责声明；英国捐赠者加一行 Gift Aid 提示（"Make your donation worth 25% more"）
- **页序**：Home（使命 + 影响 + 3 个项目 + Donate）→ Programs（一个项目一页：问题陈述 / 你的方法 / 可衡量结果 / "Support This Program"）→ Impact Report（年度统计 + 财务摘要：项目支出 vs 行政支出占比 + 受益者故事）→ Volunteer → Contact

**为什么它大众化**

1. **信任建立被清单化了**——注册号、年报、支出比例、理事会名单，四个可验证信号装齐即可，不需要说服技巧。
2. **模板市场有专属分类**，且明确按"impact statistics / donation CTA / volunteer signup / annual report"打包售卖。
3. **失败模式极其集中且可避免**：一个真实案例（[LearnKu](https://learnku.com/articles/90955) 记录）——某小型慈善机构首页有动画横幅和视频头图，中端安卓上 **field LCP 约 3.4s**，捐赠页在第三方脚本加载时卡顿。干预措施：把视频头图换成静态图、字体砍到一个家族两个字重、把分析脚本延迟到交互后、删掉捐赠步骤上的自动聊天、表单精简为 3 个预设金额。**5 周后 field LCP 降到约 2.2s，INP 稳定在 180ms 以下，完成率上升。**
4. **内容节奏可模板化**：每月发一次，一个成果 + 一个支持者故事，标题写白话。

**上手难度**：★★★☆☆ —— 结构不难，但**筹款文案和透明度信息需要真材料**。改造成品约 **3–4 小时**；从零写约 1 天。

**来源**：[LearnKu 慈善页 PHP 模式与验收清单](https://learnku.com/articles/90955) ｜ [UIXDraft 非营利模板](https://uixdraft.com/website-template-for-nonprofit) ｜ [UIXDraft 慈善模板](https://uixdraft.com/website-template-for-charity)

---

### S10 内容出版编辑式 / Editorial Publishing

**一句话视觉定义**：正文栏窄到 **65–75 个英文字符**（约 600–720px），衬线体做标题与正文；引言块（pull quote）、首字下沉（drop cap）与章节小标题共同制造阅读节奏；页面刻意保持"文字多、装饰少"。

**典型使用者**：媒体、博客、律所的 Insights 版块、咨询公司的观点页、任何"卖的是思考"的品牌。检索到的定位描述（[Minick Studio 风格库](https://minick.studio/styles)）："The magazine, translated to the browser: serif headlines, pull quotes, drop caps, and a reading rhythm that respects long-form. Editorial style fits publications, consultancies, and any brand whose product is its thinking."

[VikiLinks 九种网页风格指南](https://vikilinks.com/blog/web-design-styles) 给出同一判断与陷阱：Editorial 的 mood 是"Authoritative, literary, crafted"，而 **watch out for 是"Slow loads from heavy type and media"**。

**构成要素**

- **版心**：正文栏 **600–720px**；配图可突破到 900–1200px；`max-width: 68ch` 是稳妥写法
- **字号阶梯**：正文 17–20px（比普通站大一档），**行高 1.7–1.8**；H1 用**完美四度 1.333** 的比列（16 → 21.3 → 28.4 → 37.9），这是编辑式排版的常见选择（[iotools 模块化字阶](https://iotools.cloud/journal/modular-type-scale-typography-css) 明确注释："1.333 Perfect fourth: editorial, roomy"）
- **字体**：标题 `Playfair Display`（过渡型展示衬线）或 `DM Serif Display`（高对比衬线，用于 hero 标题）；正文 `Lora`（书法感衬线，适合编辑正文）、`PT Serif`、`EB Garamond`（老式衬线，长文阅读）——全部来自 [GreenGeeks 的免费字体分类表](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux)
- **段落与节奏**：段落 ≤ 3 行；每 2–3 段一个小标题；关键短语加粗；多项目符号；**大留白让眼睛休息**（此条来自 [FatCow 律所指南](https://fatcowwebdesign.com/how-to-design-a-website-for-a-law-firm-pages-layout-and-trust-elements) 对"扫读"的论述，同一原则适用于所有长文页）
- **配色**：暖白 `#FDFCF8` + 近黑 `#1A1A1A` + 一个强调色（常用于链接与引言竖线）
- **分页与列表**：文章列表用卡片或纯标题列表；日期与分类用小号大写字母 + 字距 `letter-spacing: .08em`

**为什么它大众化**

1. **对"内容多"的生意是唯一正解**——不高亮、不装饰，靠排版本身完成信任建立（[Minick Studio](https://minick.studio/styles) 的定位语就是"任何以思考为产品的品牌"）。
2. **有完整开箱实现**：`Playfair Display` + `Lora` + 68ch 版心是一套被大量文章模板复用的组合，改动量极小。
3. **性能友好**：文字比大图轻。[Exhibita 的趋势统计](https://exhibita.design/trends.html) 还给出一个佐证：**"Video（视频承载页面）"从 9% 降到 4%**、"Graphic design" 从 8% 降到 3%，而 **"Storytelling（有开头中间结尾）"从 23% 升到 28%**、"Footer Design" 从 5% 升到 13%——说明内容化的页脚与叙事结构在变重要。
4. **SEO 直接受益**：文章本身就是搜索入口，与 S01 的"一个服务一个页"逻辑一致。

**上手难度**：★★☆☆☆ —— 装一个博客主题，换字体与版心宽度即可。**2–3 小时**。

**来源**：[Minick Studio 风格库](https://minick.studio/styles) ｜ [VikiLinks 九种网页风格指南](https://vikilinks.com/blog/web-design-styles) ｜ [GreenGeeks 最佳 Google Fonts](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux) ｜ [iotools 模块化字阶](https://iotools.cloud/journal/modular-type-scale-typography-css) ｜ [Exhibita 网站趋势统计](https://exhibita.design/trends.html)

---

### S11 Bento 模块网格 / Bento Grid

**一句话视觉定义**：不等大的圆角图块拼成饭盒格——一个 2×2 的大块当主视觉，其余 1×1 或 1×2 的小块各承载一个功能点或一条数据；块的大小本身在告诉访客哪个重要。

**典型使用者**：技术产品功能页、产品介绍区、个人主页、数据展示区。检索到的定位（[VikiLinks](https://vikilinks.com/blog/web-design-styles)）："Bento: Modular cards in a tidy grid. Great for features and dashboards."，watch out for 是"**Cramming too much in**"。同一来源把 Bento 归入"Clean and systematic"家族，并指出它的血统："Swiss style's grid thinking shaped flat design, which fed modern minimalism, which is now evolving into the modular bento grid."

**构成要素**

**基础 CSS（[dev.to Bento 教程](https://dev.to/imran_khan_a3cc224344dbcf/bento-grid-css-complete-tutorial-free-examples-2026-2ci) 给的完整可抄版本）**

```css
.bento-grid{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  grid-auto-rows: minmax(140px, auto);
}
.bento-hero{ grid-column: span 2; grid-row: span 2; }
.bento-cell{
  background: #0d0d0d;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  padding: 24px;
}
```

同源给出五条设计原则：
1. **统一的基准单位**——所有格子的尺寸都是同一个单位的整数倍
2. **内容决定大小**——大格子要靠更丰富的内容挣到它的面积
3. **圆角统一**——所有格子用同一个值，**16–24px**
4. **70/20/10 配色法则**——70% 标准背景、20% 抬升面、10% 强调色
5. **悬停微动效**——`transform: scale(1.02)`

**带 grid-template-areas 的完整版本（[Design Atlas](https://design.solhun.com/en/landing/bento-features)）**

```css
.bento{
  width: min(92%, 760px);
  display: grid;
  gap: clamp(6px, 1.5vmin, 10px);
  grid-template-columns: 1.4fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  grid-template-areas: "hero a b" "hero wide wide";
}
.tile{
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: clamp(8px, 1.6vmin, 14px);
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  padding: 8%;
}
.hero{ grid-area: hero; background: color-mix(in oklab, var(--accent) 10%, var(--surface)); }
```

同源点明本质："Unlike a uniform `feature-grid`, one or two flagship features get a large 2×2 cell while the rest sit in 1×1 or wide cells — **the size itself tells visitors what matters most.**"

**组件级 token（[Marvelous UI Bento Grid](https://marvelous-ui.com/components/bento-grid)）**：`--mv-bento-row: 17rem`（行高）／`--mv-bento-gap: var(--mv-space-4)`／`--mv-bento-radius: var(--mv-radius-2xl)`／`--mv-bento-padding: var(--mv-space-5)`／`--mv-bento-visual-height: 70%`（视觉区占比）。该组件还有一个很实用的约束："A showcase grid must adapt to its **container** width rather than the viewport."——用 container query 而不是媒体查询。

**留白**：`gap: 16px`（密）到 `24px`（疏）；格子内 `padding: 24–32px`
**字体**：每块只放"图标 + 标题 + 一句话"；标题 18–22px，说明 14–15px
**配色**：浅色版用 `#FFFFFF` 底 + `#F1F1F1` 块 + 一个强调色；深色版见 S12 的面色阶梯

**为什么它大众化**

1. **内容压力最小**——每块只要一个图标 + 标题 + 一句话，不需要长文案。
2. **有可复制的 CSS**（上面三份来源都给了完整代码），且是纯 CSS Grid，无依赖。
3. **大厂 keynote 把它变成默认范式**——[VikiLinks](https://vikilinks.com/blog/web-design-styles) 原文："The modular grid popularised by big tech keynotes has become the default way to present features and stats."
4. **性能友好**：`box-shadow: 0 2px 8px` 这类弱阴影不计入合成层；只要**限制每屏的模糊面数量**就没有 GPU 问题（[Empire UI](https://empire-ui.com/blog/ultimate-guide-css-ui-styles-2026) 的 GPU 成本分层里把 flat / material / mesh gradient 归为最便宜一类）。
5. **可以只做一块**——不必整站 Bento，在 S01 或 S06 里插一个 Bento 功能区块即可，这是最常见的真实用法（[UI Incubator](https://ui-incubator.com/en/blog/saas-landing-page-sections) 的功能区块另一选项就是网格）。

**上手难度**：★★☆☆☆ —— 复制上面的 `.bento-grid` CSS，改 `grid-template-areas` 调布局。**2–3 小时**。

**来源**：[dev.to Bento Grid 教程](https://dev.to/imran_khan_a3cc224344dbcf/bento-grid-css-complete-tutorial-free-examples-2026-2ci) ｜ [Design Atlas Bento features](https://design.solhun.com/en/landing/bento-features) ｜ [Marvelous UI Bento Grid 组件](https://marvelous-ui.com/components/bento-grid) ｜ [VikiLinks 九种网页风格指南](https://vikilinks.com/blog/web-design-styles) ｜ [Empire UI 41 种 CSS UI 风格](https://empire-ui.com/blog/ultimate-guide-css-ui-styles-2026)

---

### S12 深色产品界面 / Dark Product UI

**一句话视觉定义**：近黑但**不是纯黑**的底（`#121212`），一层层**越来越浅**的浅黑面表示层级（卡片 `#1e1e1e`、抬升面板 `#242424`、浮层 `#2c2c2c`），近白但**不是纯白**的文字（`#e6e6e6`），加一行低透明白描边代替阴影；**一个**去饱和的强调色。

**典型使用者**：开发者工具、监控 / 数据面板、音乐与创意工具、SaaS 的深色模式。检索到的行业判断（[Empire UI](https://empire-ui.com/blog/ultimate-guide-css-ui-styles-2026)）：深色玻璃拟态是"dashboards, dev tools, and code editors"的默认视觉；同一来源在"按受众选风格"表里把"**Developer tool or SaaS dashboard?**"的答案列为"Dark glassmorphism, flat design, or neobrutalism"。[Yantracore](https://yantracore.com/blog/best-fitness-gym-website-templates-2026) 也指出"**Most fitness templates default to dark**"，说明深色已从小众扩到消费类行业。

**构成要素（全是可抄的具体数值）**

**面色阶梯（[aslain.dev 深色设计指南](https://aslain.dev/en/blog/dark-mode-tasarimi)，与 Material 的 #121212 建议一致）**

```css
--bg:        #121212;  /* 最低面 */
--surface-1: #1e1e1e;  /* 卡片 */
--surface-2: #242424;  /* 抬升卡片、菜单 */
--surface-3: #2c2c2c;  /* 模态、浮层 */
--text:      #e6e6e6;  /* 主文字（不是纯白） */
--text-dim:  #a0a0a0;  /* 次文字 */
```

**文字不透明度阶梯（Material 的写法）**：高强调（正文）**87% 白**／中强调（次要文字、标签）**60% 白**／禁用 **38% 白**。

**已验证的对比度数值（[SuperDesign 深色模式 token 表](https://superdesign.dev/styles/dark-mode)，全部按 WCAG 2.x 相对亮度公式算过）**

| 前景 | 背景 | 对比度 | 结论 |
|---|---|---|---|
| `#e6e6e6` 主文字 | `#121212` | **15.0:1** | 远超 AA |
| `#a3a3a3` 次文字 | `#121212` | **7.4:1** | 通过 AA |
| `#8ab4f8` 强调（蓝） | `#121212` | **8.9:1** | 通过 |
| `#f28b82` 危险色 | `#121212` | **7.8:1** | 通过 |
| `#6b6b6b` 禁用色 | `#121212` | 3.5:1 | **故意低于 4.5:1**，仅限真正的禁用态，不得承载真实内容 |

WCAG 阈值本身：[aslain.dev](https://aslain.dev/en/blog/dark-mode-tasarimi) 给出——正文 **≥ 4.5:1**；大字（>18pt / 24px，或 14pt 粗体）**≥ 3:1**；UI 组件（按钮描边、图标、表单轮廓）**≥ 3:1**。

**层级表达方式**：深色下阴影几乎不可见（`#000` 阴影在深底上看不见），改用**更浅的面色 + 极低透明白描边**：
```css
.card{ background: var(--surface-1); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
```
[SuperDesign](https://superdesign.dev/styles/dark-mode) 给的可抄值：描边 `1px rgba(255,255,255,0.12)`。

**强调色处理**：[aslain.dev](https://aslain.dev/en/blog/dark-mode-tasarimi) 给的规则——亮饱和色在深底上会"浮起、抖动"，要**降饱和 + 提亮度**：
```css
--accent-light: #0066ff;  /* 浅色模式的鲜蓝 */
--accent-dark:  #5b9aff;  /* 深色模式：更亮、更不饱和 */
```
[SuperDesign](https://superdesign.dev/styles/dark-mode) 的等价规则："take your light-mode 500-weight brand color and ship its 300 to 400 weight on dark."

**字体与排版**：`Inter`（[GreenGeeks](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux) 归为"Body, UI"首选，适用于"dashboards"与"UI-heavy websites"）／`Work Sans`／`JetBrains Mono`（代码块）。正文 15–16px，行高 1.5，间距用 4/8 的整数倍。

**为什么它大众化**

1. **开发者工具与音乐应用的默认选择**，这些行业本身用户量巨大。
2. **降低长时间盯屏的疲劳**，被当作"专业感"的通行证。
3. **实现成本已降到很低**：只要一套 CSS 变量 + `dark:` 变体（[Empire UI](https://empire-ui.com/blog/ultimate-guide-css-ui-styles-2026) 指出深色玻璃拟态"pairs naturally with dark-mode Tailwind (`dark:` variants)"）。
4. **性能上便宜**：flat / material / 深色一类只用 paint 级 CSS，不强制新合成层；Empire UI 的实测里 Pixel 6a 渲染 200 张卡片仍 **>90fps**。

**⚠️ 深色的三个硬障碍（[SuperDesign](https://superdesign.dev/styles/dark-mode) 列出，必须提前排除）**

1. **白底商品图会变成浮空白块**——电商目录拍在纯白上的图在 `#121212` 上看就是"floating white boxes"。**不能重拍或抠图，深色模式就会和你的内容打架。**
2. **品牌色在深色上不过关**——浅色下通过 4.5:1 的饱和蓝红，在 `#121212` 上经常掉到 4.5:1 以下；市场部不允许降饱和变体时，可访问的深色主题就上不了。
3. **纯黑陷阱**：纯白 `#fff` 配纯黑 `#000` 的 21:1 听起来最好，实际阅读最差（光晕、低光环境眼疲劳）；`filter: invert(1)` 当深色模式是禁忌，因为它会把图片也反色。

**上手难度**：★★★☆☆ —— 变量好写，**难在逐项查对比度**（次文字要针对最浅的那层面 `--surface-3` 测，而不是页面底色——这是 [SuperDesign](https://superdesign.dev/styles/dark-mode) 点出的隐形坑）。在现成浅色站上加深色变体约 **4–6 小时**。

**来源**：[SuperDesign 深色模式 token 表](https://superdesign.dev/styles/dark-mode) ｜ [aslain.dev 深色设计指南](https://aslain.dev/en/blog/dark-mode-tasarimi) ｜ [ColorPickPro 深色配色指南](https://colorpickpro.site/blog/dark-mode-color-palette-guide.html) ｜ [Empire UI 41 种 CSS UI 风格](https://empire-ui.com/blog/ultimate-guide-css-ui-styles-2026) ｜ [GreenGeeks 最佳 Google Fonts](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux) ｜ [Yantracore 健身模板评测](https://yantracore.com/blog/best-fitness-gym-website-templates-2026)

---

## 3. 最小可套用配方（配色 HEX + 字体 + 版心 + 断点）

### 3.0 字体许可说明（先说清，避免踩坑）

下面出现的字体**全部是真实存在、可商用**的：

| 字体 | 许可 | 权威来源给了什么信息 |
|---|---|---|
| Inter、Roboto、Open Sans、Lato、Source Sans 3、Work Sans、Nunito、DM Sans、Montserrat、Poppins、Plus Jakarta Sans、Manrope、Bebas Neue、Oswald、Archivo、Raleway、Space Grotesk、Merriweather、Lora、PT Serif、Playfair Display、DM Serif Display、EB Garamond、Roboto Slab、JetBrains Mono | **SIL Open Font License 1.1（OFL）**，允许商用、允许自托管 | [GreenGeeks 最佳 Google Fonts](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux) 列出全部 25 款的分类 / 字重 / 可变轴 / 最佳用途，并给出 Google Fonts 库规模：**2025 年 5 月共 1,826 个字族，累计超 50 万亿次浏览、覆盖 5,000 万个网站** |
| Bootstrap 5 默认字体栈 `system-ui, -apple-system, "Segoe UI", Roboto, ...` | **不引入任何外部字体文件** | [W3Techs](https://webcode.tools/statistics/css)：Bootstrap 覆盖 **13.4% 全网**，是"检测到框架"站点的 **74.9%** |
| Denton（示例中出现的商业展示体） | **商业授权**，需购买 | [InspoAI](https://inspoai.com/blog/best-portfolio-website-designs-for-designers) 记录了用它做标题的案例——**本报告不推荐大众用户使用，仅作说明** |

**可变字体的实际收益**（[GreenGeeks](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux)、[London Web Design Agency](https://londonwebdesignagency.com/blog/most-popular-google-fonts-2026) 两处独立给出同一数量级）：一个可变字体文件可替代 **4–9 个静态字重文件**；拉丁子集化后典型 **20–30KB**，而等价静态文件合计 **400–800KB**。对移动网络上的 LCP 影响直接。

**主流字体的真实体量**（同一对来源）：`Inter` 在截至 2025 年 5 月的 12 个月内于 Google Fonts 被访问 **4,140 亿次**，同比增长 **57%**；`Roboto` 累计约 **28 万亿次**，占全球使用量约 **20%**；Inter 的 x-height 约为 cap-height 的 **65%**（Times New Roman 约 45%），这是它在小字号下更易读的物理原因。

**统一下载方式**：`https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`，或自托管并用 `pyftsubset` 做子集化（可再降 **70–90%**）。

---

### 3.1 断点约定

本报告全部配方使用 **Bootstrap 5 默认断点**，这样任何 Bootstrap 组件可直接兼容：

| 代号 | 媒体查询 | 说明 |
|---|---|---|
| xs | 默认（<576px） | 手机竖屏 |
| sm | `@media (min-width: 576px)` | 大屏手机 |
| md | `@media (min-width: 768px)` | 平板 |
| lg | `@media (min-width: 992px)` | 桌面 |
| xl | `@media (min-width: 1200px)` | 大桌面 |

版心统一写法：`.container{ max-width: 1200px; margin: 0 auto; padding: 0 16px; }`

---

### 3.2 十二套配方

#### S01 通用服务型企业站

| 项 | 值 |
|---|---|
| 配色 | `#1E3A8A` 主色（藏青蓝）／`#0F172A` 正文近黑／`#F8FAFC` 区块浅底／`#F59E0B` 强调（仅 CTA） |
| 字体 | 标题 **Inter 700**；正文 **Source Sans 3 400**；数字计数器 **Inter 800 tabular-nums** |
| 版心 | **1200px**；内文栏 720px |
| 圆角 / 阴影 | 卡片 `12px`，按钮 `8px`；`0 1px 3px rgba(0,0,0,.08)` |
| 间距 | 4 档 `8/16/24/32px`；section 上下 `80px` |
| 字号阶梯 | `clamp(1.75rem, 1.2rem + 2vw, 3rem)` H1 ／ 1.953rem H2 ／ 1.25rem H3 ／ 1rem 正文，行高 1.7 |
| 断点 | 服务卡片：xs 1 列 → md 2 列 → lg 3 列；导航 lg 以下折叠为汉堡 |
| 字阶比 | **1.25 大三度**（16 → 20 → 25 → 31.25 → 39.06），[MoneyDeck 计算器](https://moneydeck.io/tools/type-scale-calculator) 与 [iotools](https://iotools.cloud/journal/modular-type-scale-typography-css) 都把 1.25 标为"balanced, safe default" |
| 可抄 CSS | [CanvasBuilder](https://canvasbuilder.co/blog/law-firm-website-design-authority-trust) 的 Bootstrap 5 卡片：`<div class="card h-100 border-0 shadow-sm p-4">` |
| 页序模板 | Hero → 服务 3 列 → 案例 → 计数器 → 评价 → 请求表单 → Footer |

#### S02 单页本地生意站

| 项 | 值 |
|---|---|
| 配色 | `#FFFFFF` 底／`#F8F8F6` 交替区块／`#111827` 文字／`#C2410C` 强调（暖橙，只给 Contact 按钮） |
| 字体 | 标题 **Fraunces 600** 或 **Lora 600**（温暖型）→ 无衬线替代 **Nunito 700**；正文 **Inter 400** 16–18px |
| 版心 | **单列 680–760px**（比多页站窄，因为只有一列文字） |
| 圆角 / 阴影 | 图片与按钮 `12px`；`0 2px 8px rgba(0,0,0,.06)` |
| 间距 | section 上下 `80px`；块内 `24px` |
| 关键 CSS | `html{scroll-behavior:smooth}`；每个 section 带 `id`；导航用 `#about` `#services` `#contact` 锚点 |
| 断点 | 全站单列，仅 Hero 图在 md 以上改为左右分栏 |
| 字体许可提醒 | Fraunces 为 OFL；Nunito 为 OFL，字重 7 档（[GreenGeeks](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux)） |
| 页序模板 | Intro → About → Highlights(3–5 条) → Services(≤6 项) → Testimonials(≥1 条真实) → Contact |
| 验收清单 | 6 项（[OnePagey](https://onepagey.com/blog/what-to-put-on-a-one-page-business-website)）：标题说清做什么与服务谁／About 读起来像真企业／Highlights 3–5 条具体理由／电话与邮箱正确／删掉不需要的块／手机宽度预览过 |

#### S03 餐饮视觉主导

| 项 | 值 |
|---|---|
| 配色（暖木系） | `#FBF7F0` 奶油底／`#6B4A2F` 木棕／`#C0392B` 番茄红（CTA）／`#1C1C1C` 墨黑文字 |
| 配色（经典系） | 黑 `#000` + 白 `#FFF` + 红 `#E01B24` 三色（[Restaurantify](https://restaurantify.com/20-best-restaurant-website-templates-for-online-food-ordering-delivery) 称其为"餐厅模板最想要的三色"） |
| 字体 | 标题 **Playfair Display 700** 或 **DM Serif Display**（高对比衬线）；正文 **Lato 400** 16–17px；菜单价格 **tabular-nums** |
| 版心 | **1280px**（比常规宽，为了菜单三栏）；菜单文本栏 640px |
| 圆角 / 阴影 | 图 `0–8px`（偏直角显正式）；`0 4px 12px rgba(0,0,0,.08)` |
| 间距 | section 上下 `64–96px`；Hero `min-height: 85vh` |
| 字号 | H1 `clamp(2rem, 1.2rem + 3vw, 3.5rem)`；菜名 17px；价格 17px 同基线右对齐 |
| 断点 | 菜品网格：xs **2 列** → md 3 列 → lg 4 列；Hero 图在 md 以下用竖构图 |
| 必备页 | Menu · Pickup & Delivery · Hours & Location · Contact（[Naratake](https://naratake.com/en/examples/restaurant-websites) 的 7 个真实构建都含这 4 项，只多不少） |

#### S04 专业服务高信任

| 项 | 值 |
|---|---|
| 配色 | `#1A2C4E` 品牌主色（藏青）／`#FFFFFF` 底／`#C9A84C` 强调（金）／`#1D1D1F` 正文 |
| 字体 | 标题 **EB Garamond** 或 **Playfair Display** 或 **Cormorant Garamond**（[CanvasBuilder](https://canvasbuilder.co/blog/law-firm-website-design-authority-trust) 的 CSS 变量原文）：`--cnvs-primary-font: 'EB Garamond', serif;`<br>正文 **Inter** 或 **DM Sans**：`--cnvs-secondary-font: 'Inter', sans-serif;` |
| 正文尺寸 | **≥17px 桌面 / ≥16px 移动**；**行高 1.6–1.8**；段落 ≤3 行 |
| 版心 | **1200px**（[LearnKu](https://learnku.com/articles/90955) 给的同款值 `--container: 1200px`）；执业领域网格内容栏 720px |
| 圆角 / 阴影 | **0–8px**（极度克制，甚至直角）；`shadow-sm` 级别 |
| 导航 | **5–7 项**，`Home | About | Attorneys | Practice Areas | Results | Blog | Contact`，**禁止创意标签** |
| 断点 | 执业领域卡片：xs 1 列 → sm 2 列 → lg 3 列（[CanvasBuilder](https://canvasbuilder.co/blog/law-firm-website-design-authority-trust) 用的 `col-sm-6 col-lg-4`）；电话在 md 以下变吸底一键拨号 |
| 性能底线 | **LCP < 2.5s**（[FatCow](https://fatcowwebdesign.com/how-to-design-a-website-for-a-law-firm-pages-layout-and-trust-elements)）；移动优先（超 65% 法律搜索来自手机） |
| 首屏五要素 | 标题说清帮谁怎么帮／副标题写差异点／**右上角可见电话**／一个主 CTA／一条信任信号行 |
| 律师简介页 | 头像 + 一句定位语 + **300–600 词**第三人称传记 + 教育执业资格 + 代表性结果 + 发表 + 协会 + 直接联系 CTA |
| 可抄 CSS 变量 | `--cnvs-themecolor: #1a2c4e; --cnvs-themecolor-rgb: 26, 44, 78; --cnvs-logo-height: 52px; --cnvs-logo-height-sticky: 40px; --cnvs-header-bg: #ffffff;` |

#### S05 零售商品网格

| 项 | 值 |
|---|---|
| 配色 | `#FFFFFF` 卡片底／`#F5F5F5` 页面底／`#111827` 文字／`#2563EB` 强调（CTA 与选中筛选） |
| 字体 | 商品名与筛选 **Inter** 500/600；价格 **Inter 600 tabular-nums**（保证小数点对齐）；标题可换 **Poppins 600** |
| 版心 | **1200px**（[LiquidBoost](https://liquidboost.app/blog/ecommerce-category-page-best-practices) 用的桌面断点就是 1200px+ 起算 3–4 列） |
| 圆角 / 阴影 | 卡片 `8–12px`；图片 `4px`；`0 1px 2px rgba(0,0,0,.06)` |
| 列数（关键） | 桌面 ≥1200px **3–4**；平板 768–1199px **2–3**；手机 <768px **2**（**2 列比单列满意度高 16%**） |
| 触控目标 | **最小 44×44px** |
| 网格间距 | `gap: 16px`（密）～`24px`（疏） |
| 图片规范 | 统一 **1:1 或 3:4**；统一背景；统一产品画面占比；统一色温 |
| 每页商品数 | **24–48**，常用默认 **36** |
| 分页 | **"加载更多" + 分页 URL 兜底**（`<link rel="next/prev">`），不要纯无限滚动 |
| 筛选 | 显示命中数量（"Blue (24)"）／多选／AJAX 无刷新／已选条件 chip／清除全部／移动端抽屉 |
| 排序 | Featured（默认）· Price↑ · Price↓ · Newest · Best Selling · Rating；**不要 Alphabetical** |
| 页序骨架 | `[面包屑] [H1] [50–100 词引导] [筛选排序条] [网格] [200–400 词 SEO 内容] [分页]` |
| 移动专属 | 吸底筛选/排序条；筛选用底部弹出层；卡片只留图 + 名称 + 价格 |

#### S06 SaaS 落地页

| 项 | 值 |
|---|---|
| 配色 | `#FFFFFF` 底／`#0B0B0F` 正文／`#2563EB` 强调／`#F5F5F7` 交替区块 |
| 字体 | **Plus Jakarta Sans**（[GreenGeeks](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux) 标注"suitability: SaaS UI"）或 **Manrope**（同标 SaaS UI）；技术感更强用 **Space Grotesk** |
| Hero 数值 | 区块 `min-height: 85vh`；`max-width: 720px` 居中<br>H1 `clamp(2.5rem, 5vw, 4.5rem)` / `font-weight:700` / `line-height:1.08` / `letter-spacing:-0.03em`<br>副标题 `1.125rem` / `line-height:1.7` / `max-width:560px`<br>按钮 `padding:.875rem 2rem` pill |
| 版心 | `--container-max-width: 1200px`；FAQ 与文本块 `720px` |
| 圆角 / 阴影 | 按钮 pill（`--radius-full`）；卡片 `12–16px`；`0 1px 3px rgba(0,0,0,.08)` |
| 间距 | 社交证明条 `padding: 3rem 0`；section 用 `--section-padding-y-lg` |
| 社交证明 | **4–6 个 Logo**，`height: 28px`，整条 `opacity: .6`；无 Logo 时换数字 |
| 定价 | **3 档并排**，中间档高亮 + "Most Popular" 徽章；每档 **5–8 条**勾选特性；年付默认 |
| FAQ | accordion，`max-height` 过渡 **300ms**；每答 2–3 句；加 **FAQPage JSON-LD** |
| 断点 | 功能卡片 xs 1 列 → md 2 列 → lg 3 列；定价表 xs 1 列堆叠 → lg 3 列并排 |
| 性能底线 | **4G 下加载 < 1.5s**；图片 WebP/AVIF + `srcset`；预加载 hero 图与字体；SSR |
| 页序 | Hero → 社交证明 → 问题 → 解决方案 → 功能(3–6) → 案例 → 定价 → FAQ → 结尾 CTA |

#### S07 健身与预约

| 项 | 值 |
|---|---|
| 配色（柔和型：瑜伽 / SPA） | `#FAF8F5` 米白／`#7C8B6F` 鼠尾草绿／`#C97B5A` 陶土／`#2B2B2B` 文字 |
| 配色（力量型） | `#111111` 近黑底／`#FFFFFF` 文字／`#E8FF3A` 荧光黄强调／`#3B82F6` 电蓝次强调 |
| 字体 | 柔和型 **Work Sans** 或 **Nunito**；力量型 **Montserrat 800** 或 **Space Grotesk 700**；课程表用 **Inter** 15px |
| 版心 | **1200px**；课程表页放宽到 **1280px** 以便横向排时间格 |
| 圆角 / 阴影 | 柔和型卡片 `16px`、按钮 pill；力量型 `4px`、直角按钮 |
| 字号 | Hero H1 `clamp(2rem, 1.3rem + 2.5vw, 3.25rem)`；价格数字 24–32px |
| 断点 | 课程表：xs 单日纵向列表 → lg 周视图横向；教练卡片 xs 1 列 → sm 2 列 → lg 3 列 |
| 定价结构（真实成交版，[Squarespell](https://squarespell.com/squarespace-blog/best-squarespace-templates-for-personal-trainers-fitness-studios)） | 单次 $20 / 5 次 $90 / 不限次月费 $199，每档一个 Book Now |
| 预约系统参数（[Naratake](https://naratake.com/en/examples/salon-websites)） | 15 分钟为格；每次预约前后各 **10 分钟缓冲**；下一可约时段前 **2 小时**截止；**每人独立周内工时**；定金托管商家自己的 Stripe 账户 |
| 页序 | Hero（一句体验 offer + 1 按钮）→ 课程/服务列表 → **课程表独立页** → 教练卡片 → 价格 3 档 → 位置地图 → 评价 → FAQ |
| 硬性判据 | 课程表 **1 分钟内可自行更新**、手机可读；**只推一个体验 offer** 且出现在 Hero + 导航 + 每页底部；**价格必须写**；评价轮播不自动切换 |

#### S08 作品集大图

| 项 | 值 |
|---|---|
| 配色 | `#FFFFFF` 底／`#000000` 或 `#111111` 文字／`#E5E5E5` 分隔线；单色方案就是全部（照片自带颜色） |
| 字体 | 一款字体的多个字重：**Inter**（400/500/700）或 **Work Sans**；想更个性用 **Space Grotesk**；全部 OFL |
| 版心 | 作品网格 **全宽或 1440px**；文本块收到 **600–700px** |
| 圆角 / 阴影 | **0–8px**（作品集普遍直角，避免卡片感盖过作品）；阴影几乎不用 |
| 网格 | 桌面 **2–3 列**（图像越重要列数越少）；`gap: 24–32px` |
| 间距 | section `p-12`（约 48px）桌面 / `py-10`（约 40px）移动；卡片内 `p-4` + `rounded-lg`（Tailwind 类名原文） |
| 字号 | H1 32–56px（极粗或极细两端取一）；正文 16–17px；行高 1.5–1.7 |
| 断点 | Tailwind：`grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| 交互 | 卡片 hover 加深图像并浮出项目名；`position: sticky` 侧栏显示当前项目名；顶部阅读进度条 |
| 性能 | 折叠下方图片 `loading="lazy"`；统一宽高比避免 CLS |
| 页序 | 首页（兼作品区）→ 作品详情（问题 / 过程 / 结果）→ About（**简介 2–3 句** + 一个 CTA）→ Contact |

#### S09 非营利影响力

| 项 | 值 |
|---|---|
| 配色 | `#FFFFFF` 或暖白 `#FDFCF8` 底／`#1F2937` 文字／`#0E7C66` 或品牌绿主色／`#E4572E` 捐赠强调 |
| 字体 | **Nunito**（圆润友好，OFL，7 档字重）或 **Lato**（9 档，OFL）；数字计数器用 **Inter 800 tabular-nums** |
| 版心 | **1200px**（`--container: 1200px` 原文） |
| 间距 token | `--space-2: 8px / --space-4: 16px / --space-6: 24px / --space-8: 32px`；`.section{ padding: var(--space-8) 0 }` |
| 流体字号 | `--step-0: clamp(1rem, 0.9rem + 0.6vw, 1.125rem)`<br>`--step-1: clamp(1.4rem, 1.1rem + 1.0vw, 1.8rem)` |
| 正文 | `line-height: 1.6`；H1 `line-height: 1.2` + `letter-spacing: -0.01em` |
| 圆角 / 阴影 | 卡片 `12–16px`；按钮 `8px` 或 pill |
| 断点 | 项目卡片 3–6 张：xs 1 列 → md 2 列 → lg 3 列 |
| 捐赠表单 | 预设金额 **$10 / $25 / $50** + 自定义；**中间档标"Most Chosen"**；**月度开关明确可见**；错误内联；提交按钮旁放隐私与收据说明 |
| 首屏 | 一句使命 + 一句影响限定语 + **一个 Donate + 一个 Volunteer** + 微保证文案（"Receipts instantly by email"） |
| 英雄图 | **静态图**（禁自动视频）；写 `width`/`height`；`fetchpriority="high"` |
| 性能底线 | LCP ≤ 2.5s／INP ≤ 200ms／CLS ≤ 0.1；关键 CSS 内联 **≤15KB** |
| 透明度要素 | 注册号 + 年报链接 + 理事会名单 + "资金怎么用" + 支出比例 |

#### S10 内容出版编辑式

| 项 | 值 |
|---|---|
| 配色 | `#FDFCF8` 暖白底／`#1A1A1A` 正文／`#8B5E3C` 或深红强调（链接与引言竖线）／`#6B7280` 次级信息 |
| 字体 | 标题 **Playfair Display 700** 或 **DM Serif Display**；正文 **Lora 400** 或 **PT Serif** 或 **EB Garamond**；UI 小字 **Inter 500** |
| 版心 | 正文栏 **600–720px**（**65–75 个英文字符**）；配图可破出去到 900–1200px |
| 字号 | 正文 **17–20px**，**行高 1.7–1.8** |
| 字阶比 | **1.333 完美四度**（16 → 21.3 → 28.4 → 37.9）——[iotools](https://iotools.cloud/journal/modular-type-scale-typography-css) 明确标注 "editorial, roomy"；比 **1.618 黄金比**安全（同源警告黄金比"by the third step you're at 42px… unusable for an `h4`"） |
| 段落节奏 | 段落 ≤3 行；每 2–3 段一个小标题；关键短语加粗；引言块 + 首字下沉 |
| 小字样式 | 日期与分类用 `font-size: .8rem` + `letter-spacing: .08em` + 全大写 |
| 圆角 / 阴影 | 0；图片 `4px` |
| 断点 | 单列正文恒定；文章列表 xs 1 列 → md 2 列 → lg 3 列 |
| 性能警告 | [VikiLinks](https://vikilinks.com/blog/web-design-styles) 明确列出该风格的陷阱是 "Slow loads from heavy type and media"——字体必须子集化 |
| 页序 | 首页（头条 + 列表）→ 文章详情 → 分类归档 → About → 订阅 |

#### S11 Bento 模块网格

| 项 | 值 |
|---|---|
| 配色 | `#FFFFFF` 底／`#F4F4F5` 标准块／`#E9E9EC` 抬升块／`#2563EB` 强调<br>深色版：`#0D0D0D` 底／`#161618` 块／`#0D0D0D` + `1px rgba(255,255,255,.08)` 描边／`#E6E6E6` 文字 |
| 配色法则 | **70/20/10**：70% 标准背景、20% 抬升面、10% 强调色 |
| 字体 | **Inter** 500/600 标题 18–22px + Inter 400 说明 14–15px；科技感用 **Space Grotesk** |
| 版心 | `width: min(92%, 760px)`（小组件）到 **1200px**（整页）；**必须用 container query 而非媒体查询** |
| 网格 | `grid-template-columns: repeat(4, 1fr)`；`gap: 16px`；`grid-auto-rows: minmax(140px, auto)` |
| 主块 | `grid-column: span 2; grid-row: span 2` |
| 圆角 | **统一 16–24px**（块内所有格子同一个值） |
| 块内边距 | `24–32px`（或 `padding: 8%` 做等比） |
| 阴影 | `0 2px 8px rgba(0,0,0,.06)` |
| 行高 token | `--bento-row: 17rem`；`--bento-gap: 16px`；`--bento-visual-height: 70%` |
| 交互 | `transform: scale(1.02)` on hover |
| 断点 | xs 单列堆叠（主块降为 1×1）→ md 2 列 → lg 4 列（恢复非对称 `grid-template-areas`） |
| 硬性判据 | **块的大小必须由内容挣得**；每块只放"图标 + 标题 + 一句话"；块尺寸是同一基准单位的整数倍 |

#### S12 深色产品界面

| 项 | 值 |
|---|---|
| 面色阶梯 | `--bg: #121212`／`--surface-1: #1e1e1e`（卡片）／`--surface-2: #242424`（抬升）／`--surface-3: #2c2c2c`（模态浮层） |
| 文字 | 主文 `--text: #e6e6e6`（**不是纯白**）／次文 `--text-dim: #a0a0a0` 或 `#a3a3a3`／禁用 `#6b6b6b` |
| 文字不透明度 | 高强调 **87% 白**／中强调 **60% 白**／禁用 **38% 白**（Material 分级） |
| 描边 | `1px solid rgba(255,255,255,0.08)`（或 0.12） |
| 强调色 | 取浅色模式品牌色的 **300–400 字重**：浅色 `#0066ff` → 深色 `#5b9aff`；取浅色 500 权重 → 深色换 300–400 |
| 字体 | **Inter**（正文与 UI）／**Work Sans**／代码块 **JetBrains Mono** |
| 版心 | **1200px**（仪表盘可到 **1440px**） |
| 字号 | 正文 **15–16px**，行高 **1.5**；间距用 4/8 的整数倍 |
| 圆角 | 卡片 `12px`；浮层 `16px`；按钮 `8px` |
| 断点 | 仪表盘卡片 xs 1 列 → md 2 列 → lg 4 列；侧边栏 lg 以下折叠为抽屉 |
| 已验证对比度 | `#e6e6e6` on `#121212` = **15.0:1**；`#a3a3a3` = **7.4:1**；`#8ab4f8` = **8.9:1**；`#f28b82` = **7.8:1** |
| WCAG 阈值 | 正文 **≥4.5:1**；大字（>18pt/24px 或 14pt 粗体）**≥3:1**；UI 组件 **≥3:1** |
| 测试纪律 | 次文字必须针对**最浅的那层面（`--surface-3`）**测，不是页面底色 |
| 三条禁忌 | ① 纯黑 `#000`（21:1 的对比度反而带来最差的阅读体验）② `filter: invert(1)` 当深色模式（会反摄影像）③ 白底商品图直接上（会变浮空白块） |

---

## 4. "别做"清单（12 条）

每条格式：**做砸的形式 → 为什么 → 反面例子 / 正确做法**

---

### ❌ 1. 用抽象口号当首屏标题

**做砸**：首屏写"XX 有限公司"或"综合解决方案，值得信赖"。<br>
**为什么**：访客在头几秒只问三个问题——我在哪、你能为我做什么、下一步点哪。抽象标题一个都不回答。<br>
**反面 → 正确**（[Amidcode](https://amidcode.com/en/blog/corporate-website-structure) 的原文对照）：<br>
❌ "Comprehensive solutions for business"<br>
✅ "We design and install ventilation systems for manufacturing plants"<br>
同理（[OnePagey](https://onepagey.com/blog/what-to-put-on-a-one-page-business-website)）：❌ "Welcome to our website" ✅ "Artisan Bakery in Portland"。

---

### ❌ 2. 把六个服务塞进一个"服务"页，每项一段话

**做砸**：`/services` 一个页面，六个 `<h3>` 各配一段文字。<br>
**为什么**：[Amidcode](https://amidcode.com/en/blog/corporate-website-structure) 直接称这是**最常见的结构错误**——搜索引擎没有可展示的具体页面，访客还得自己在文字里翻找关心的那段。<br>
**正确**：**一个服务 = 一个 URL**（自带标题、正文、图、表单与搜索位）。同一逻辑适用于一条业务线内部：设计、安装、维保是三种不同搜索词，就该三个页面。

---

### ❌ 3. 用 3 个以上并列按钮分摊点击

**做砸**：Hero 里并排 `Join` / `Contact` / `Learn More`，Footer 再来一组不同的。<br>
**为什么**（[Yantracore](https://yantracore.com/blog/best-fitness-gym-website-templates-2026) 原话）："Templates that scatter three competing buttons (Join, Contact, Learn More) split the click and lose it."<br>
**正确**：**一个主 offer，一个按钮，出现在 Hero + 导航 + 每页底部**。SaaS 场景例外地允许两个（一个高承诺 + 一个低承诺），但不能有三个（[UI Incubator](https://ui-incubator.com/en/blog/saas-landing-page-sections)）。

---

### ❌ 4. 把价格藏起来，只留"联系我们询价"

**做砸**：价格页或整个站都不写数字，只放询盘表单。<br>
**为什么**：多条独立来源给出同一结论。<br>
· [Yantracore](https://yantracore.com/blog/best-fitness-gym-website-templates-2026)："the data is against it. **People bounce to the competitor who lists numbers.** Even a from-price with a short explanation converts better than a contact form."<br>
· [Amidcode](https://amidcode.com/en/blog/corporate-website-structure)："The result is easy to predict. The visitor goes looking for numbers at a competitor and sends the inquiry there. **Even a range filters requests better than silence about money.**"<br>
· [Augere Labs](https://augerelabs.com/blog/marketing-site-that-converts-the-saas-landing-page-playbook-2026) 给了量化：年费低于 $30K 的产品，把 "Contact sales" 作为主路径会让自助 SaaS **转化下降 40–70%**。<br>
**正确**：至少给"起价 + 什么影响最终价"。

---

### ❌ 5. 用自动播放视频当首屏

**做砸**：Hero 放循环视频，或者放一个每 2 秒自动切换的评价轮播。<br>
**为什么**：这是**唯一一处有真实前后对比数据的失败案例**（[LearnKu](https://learnku.com/articles/90955) 记录）：某小型慈善机构首页有动画横幅与视频头图，中端安卓上 **field LCP 约 3.4s**，捐赠页在第三方脚本加载时卡顿——**捐赠者会滚动，但很少完成表单**。干预措施之一就是把视频头图换成静态图。**5 周后 field LCP 降到约 2.2s，完成率上升。**<br>
评价轮播另有独立批评（[Yantracore](https://yantracore.com/blog/best-fitness-gym-website-templates-2026)）："Testimonial carousels that auto-rotate every two seconds are worse than nothing; **nobody finishes reading slide one.**"<br>
**正确**：静态图 + 明确 `width`/`height` + `fetchpriority="high"`；评价用静态三栏或精选一条大字。

---

### ❌ 6. 用"通用商务素材"当信任图像

**做砸**：首屏用握手、握手加地球、西装俯视笔记本的图库照片。<br>
**为什么**（[UENI](https://ueni.com/blog/law-firm-websites) 原话）："never generic stock photography of '**business handshakes**'"。同一来源强调首屏图必须承担权威感——真实律师肖像、法庭、正义女神、本地城市天际线。并给了一条可复用的策略："if your practice is geographically tied, hero a recognisable image of your city or county. **It tells Google AND the prospect 'we serve this place'.**"<br>
**正确**：真实人像、真实场地、真实作品、本地地标，四者取一。

---

### ❌ 7. 写出可以被竞争对手原样复制的"关于我们"

**做砸**："我们快速成长、注重个性化服务、拥有一支专业的团队。"<br>
**为什么**（[Amidcode](https://amidcode.com/en/blog/corporate-website-structure) 原话）："**The about page on most websites could be moved to a competitor's site with only the company name changed.**"<br>
**正确**：只写不能被复制的东西——成立年份、完成项目数、带照片与职务的团队、执照与资质、办公室照片。

---

### ❌ 8. 用创意标签命名导航项

**做砸**：导航写"我们的冠军团队"、"赋能中心"、"灵感实验室"。<br>
**为什么**（[FatCow](https://fatcowwebdesign.com/how-to-design-a-website-for-a-law-firm-pages-layout-and-trust-elements) 原话）："Avoid clever labels like 'Our Team of Champions.' **Clients search for 'attorneys,' not champions.**"<br>
**正确**：导航 **5–7 项**，用客户会说的词：`Home / About / Services / Team / Case Studies / Contact`。超过 7 项就放进下拉菜单或 Footer。

---

### ❌ 9. 产品网格里让卡片塞满信息

**做砸**：分类页每张卡放长描述、完整规格、多个 CTA、复杂的色彩选择器。<br>
**为什么**（[LiquidBoost](https://liquidboost.app/blog/ecommerce-category-page-best-practices) 原话）："The card's job is to attract attention and earn a click, **not to close the sale.**"<br>
**正确**：卡片只放 ① 商品图（最大元素）② 名称（≤2 行）③ 价格 ④ 评分 ⑤ 色块 ⑥ 可选快速加购。**明确排除**：长描述、完整规格、多个 CTA、复杂交互。同源还补一条：徽章只用 "New / Low stock / Bestseller" 且"克制到还有意义"。

---

### ❌ 10. 用纯黑当深色模式底色，或直接 `invert(1)`

**做砸**：`background: #000` + `color: #fff`；或者一行 `filter: invert(1)` 当深色主题。<br>
**为什么**：[SuperDesign](https://superdesign.dev/styles/dark-mode) 的实测记录——纯白配纯黑的 **21:1** "sounds great and reads terribly (halation, eye strain in low light)"；`filter: invert(1)` "**inverts your images too**"。另一坑：深色下阴影不可见，不带面色提升的模态框会与页面**视觉融合**。<br>
**正确**：底色 `#121212`，面色阶梯 `#1e1e1e` → `#242424` → `#2c2c2c`，文字 `#e6e6e6`，描边 `1px rgba(255,255,255,.08)`，靠**更浅的面**而不是阴影表达层级。

---

### ❌ 11. 把次文字压到刚好过线，并且只对页面底色测

**做砸**：次文字挑 `#757575`（在 `#121212` 上约 4.6:1，"barely passes"），然后只在页面底色上验证。<br>
**为什么**：[aslain.dev](https://aslain.dev/en/blog/dark-mode-tasarimi) 给出具体数字——`#757575` 约 4.6:1 勉强过线，再降到 `#5a5a5a` 就**低于 3:1** 不能用于正文。更隐蔽的坑来自 [SuperDesign](https://superdesign.dev/styles/dark-mode)：**基于透明度的次文字会静默失败在抬升面上**——必须对**最浅的那层面（`--surface-3`）**测，而不是页面底色。<br>
**正确**：次文字取 `#a3a3a3`（7.4:1）留足余量；逐个文字/背景配对验证，包括：主文、次文、链接、按钮文字、占位符文字。

---

### ❌ 12. 把彩色图标当成"设计感"的来源

**做砸**：整页靠十个不同颜色的扁平图标撑视觉，配色随机（红黄蓝绿紫全上）。<br>
**为什么**：色彩一旦没有规则就变成噪声，且**没有任何一条行业来源推荐多色图标体系**。现有来源给的都是收敛的规则：Bento 的 **70/20/10**（70% 标准背景、20% 抬升面、10% 强调色，[dev.to](https://dev.to/imran_khan_a3cc224344dbcf/bento-grid-css-complete-tutorial-free-examples-2026-2ci)）；律所的"深色 + 米白 + **一个**强调色"（[FatCow](https://fatcowwebdesign.com/how-to-design-a-website-for-a-law-firm-pages-layout-and-trust-elements)）；深色模式的"**one desaturated accent color**"（[SuperDesign](https://superdesign.dev/styles/dark-mode)）。<br>
**正确**：图标统一用品牌主色或统一用一个中性色；强调色**只**给 CTA。可复用的替代方案是 Bento 里那句"块的大小本身在告诉访客哪个重要"——用**尺寸和留白**制造视觉重点，而不是用颜色数量。

---

### 附：一份可选的 10 分钟自检

| 检查 | 通过标准 |
|---|---|
| 首屏看不到公司名也能懂你做什么？ | 能 |
| 每个服务有独立 URL？ | 是 |
| 全站可见按钮数量 | 每屏 ≤ 2 个不同动作 |
| 价格 | 至少有"起价"或"什么影响价格" |
| 首屏有自动播放媒体？ | 无 |
| 图片有 `width`/`height`？ | 全部有（防 CLS） |
| 移动端触控目标 | ≥ 44×44px |
| 深色模式文字对比度 | 对**最浅面**测，正文 ≥ 4.5:1 |
| 手机宽度上导航是否可点？ | 5–7 项或已折叠 |
| LCP | < 2.5s（[LearnKu](https://learnku.com/articles/90955) 的 field 目标） |

---

## 5. 来源清单（55 条，逐条标注提供了什么）

### 5.1 模板市场与分类（验证主轴）

| # | URL | 提供了什么 |
|---|---|---|
| 1 | [ThemeForest Browse Categories](https://themeforest.net/category) | site-templates 分类与**条目数**：Corporate 7941 / Creative 3680 / Retail 3707 / Entertainment 856——验证"行业轴成立"的量化底数 |
| 2 | [ThemeForest Retail + corporate 检索](https://themeforest.net/category/site-templates/retail?term=corporate) | 兼容性分布：**Bootstrap 151 条 vs ReactJS 4 条 vs AngularJS 1 条**——证明大众市场交付物技术底子是 Bootstrap |
| 3 | [ThemeForest Corporate + creative 检索](https://themeforest.net/category/site-templates/corporate?term=creative) | Corporate 与 Creative 的交叉检索页，佐证这两类模板的互补关系 |
| 4 | [Squarespace: How to Choose a Website Template](https://squarespace.com/blog/how-to-choose-a-website-template) | 官方按用途列"六类模板"；小商家模板明确面向 **Restaurants, coffee shops, wellness studios, real estate agents**，功能重点为"你在哪、几点开门、怎么联系" |
| 5 | [SquareLocator 2026 最佳 Squarespace 模板](https://squarelocator.com/blogs/insights/best-squarespace-templates-in-2026) | 14 款模板的**行业映射表 + 真实价格**；作者自称建过 400+ Squarespace 站；关键判断"**tidy rather than distinctive, which suits looking established more than standing out**" |
| 6 | [WebGoyat 2026 小商家 Squarespace 模板](https://webgoyat.com/blog/best-squarespace-templates-small-business) | 5 款模板的"推荐给谁 / 起点是什么 / 该改什么"三列表；佐证 Squarespace 7.1 **所有模板共享同一模板族与功能**，差别只在外观起点 |
| 7 | [Squarespell 健身与工作室模板榜](https://squarespell.com/squarespace-blog/best-squarespace-templates-for-personal-trainers-fitness-studios) | 7 款健身模板的**页数 / 价格 / 许可 / 退款 / 交付方式**完整对比表；关键结构判据"**What you teach, kept apart from when**"；Acuity 排程 **$16/月起** |
| 8 | [Framer Marketplace: Pepper 餐厅模板](https://framer.com/marketplace/templates/pepper) | 新平台（Framer）的餐厅模板区块清单 + 结构化数据占位脚本做法 |

### 5.2 行业结构与页序

| # | URL | 提供了什么 |
|---|---|---|
| 9 | [Amidcode 企业站结构与页面集](https://amidcode.com/en/blog/corporate-website-structure) | 企业站**最小可用页面集**；"一个服务一个页"的论证；"最常见的结构错误"；关于页"可被竞争对手复制"的批评；价格区为何必须写 |
| 10 | [MMIX 企业站结构 10 要素](https://mmix.ua/en/corporate-website-structure-10-key-elements) | 独立给出同一套 10 段结构表；**三击规则**（任何页从首页 ≤3 次点击）；主导航 **5–7 项**；schema.org 与 Core Web Vitals 要求 |
| 11 | [FatCow 律所建站指南](https://fatcowwebdesign.com/how-to-design-a-website-for-a-law-firm-pages-layout-and-trust-elements) | 律所**9 页优先级表**；首屏五要素；字体死规定（Playfair/Cormorant/Libre Baskerville + Inter/Source Sans/Open Sans，**正文 ≥17px、行高 1.6–1.8**）；配色死规定；导航 5–7 项且禁创意标签；律师简介页八要素；LCP < 2.5s |
| 12 | [UENI 30 个律所网站案例](https://ueni.com/blog/law-firm-websites) | 25+ 真实律所站截图与点评；"**never generic stock photography of 'business handshakes'**"；城市天际线作为本地信任信号；最常见的失败模式"优雅首页 + 没有从'我读了'到'我预约了'的清晰路径" |
| 13 | [CanvasBuilder 律所设计：权威、信任与专业](https://canvasbuilder.co/blog/law-firm-website-design-authority-trust) | **完整六段页序**；可直接抄的 `:root` CSS 变量（`--cnvs-themecolor: #1a2c4e` 等）；一段 Bootstrap 5 执业领域卡片代码；字体配对（EB Garamond + Inter / DM Sans）；移动搜索占比 >60% |
| 14 | [LearnKu 慈善页 PHP 模式与验收清单](https://learnku.com/articles/90955) | 非营利首屏规格；**完整可抄的 token CSS**（`--container: 1200px`、`--space-2..8`、`--step-0/1` 的 clamp）；捐赠表单 UX 与 HTML 结构；志愿者短表单先行；性能目标（**LCP ≤2.5s / INP ≤200ms / CLS ≤0.1**，关键 CSS ≤15KB）；**一个真实"视频头图害了捐赠转化"的前后对比案例（field LCP 3.4s→2.2s）** |

### 5.3 特定风格与组件实现

| # | URL | 提供了什么 |
|---|---|---|
| 15 | [LiquidBoost 电商分类页最佳实践](https://liquidboost.app/blog/ecommerce-category-page-best-practices) | 分类页**要素影响矩阵**（导航/发现/SEO）；**列数表**（桌面 3–4 / 平板 2–3 / 手机 2）；Baymard 数据（**2 列比单列满意度高 16%**、**42% 站点分类页 mediocre 或 poor**）；卡片内容优先级与排除项；图片一致性四规范；筛选 7 条 UX 规则；排序项清单；分页方案对比表；**每页 24–48 件、常用 36**；移动专属 6 条；SEO 清单 |
| 16 | [Kimonix 产品分类页设计](https://kimonix.com/blog/product-category-page-design) | 分类页**页头→控制行→网格**三件套；"跳过 banner 轮播";**第一行是最值钱的策展位**；密度建议；筛选可见性与 chip；移动端底部弹出；Baymard 2026 基准"**56% 电商站搜索体验 mediocre 或更差**" |
| 17 | [Naratake 餐厅网站 7 个真实构建](https://naratake.com/en/examples/restaurant-websites) | 同一底层拆成 7 种餐饮形态，**每种首页 Lead 什么 + 完整页序**；"Start with the menu, location and hours, then choose how customers should reach you" |
| 18 | [Naratake 沙龙网站 5 个真实构建](https://naratake.com/en/examples/salon-websites) | 沙龙/SPA 的核心判据"**turn a person looking at your work into a booking with a name on it**"；5 种形态各自 Lead 什么；**预约系统具体参数**（15 分钟格、前后 10 分钟缓冲、2 小时截止、每人独立工时、Stripe 定金托管） |
| 19 | [Restaurantify 20 款餐厅模板](https://restaurantify.com/20-best-restaurant-website-templates-for-online-food-ordering-delivery) | 20 款模板的定位与差异；"**餐厅模板最想要的三色 = 黑 白 红**"；多款明确标注 **built using the Bootstrap framework** 且带 5–7 套配色方案 |
| 20 | [Yantracore 健身与工作室模板评测](https://yantracore.com/blog/best-fitness-gym-website-templates-2026) | 四条硬判据（课表要能 1 分钟自改 / **只推一个 offer** / **价格必须写** / 轮播不自动切换）；"课表页流量有时超过首页"；大多数健身模板**默认深色**；三种经营形态（连锁健身房 / 工作室 / 私教）的模板取向差异 |
| 21 | [UI Incubator SaaS 落地页分节指南](https://ui-incubator.com/en/blog/saas-landing-page-sections) | **完整 9 段页序 + AIDA 映射**；Hero 的**全部 CSS 数值**（85vh、clamp 字号、720/560px 容宽、pill 按钮 padding）；社交证明条规格；功能区块两种布局；定价表规则；FAQ accordion 完整代码（300ms 过渡）；结尾 CTA 规则 |
| 22 | [Augere Labs SaaS 落地页手册 2026](https://augerelabs.com/blog/marketing-site-that-converts-the-saas-landing-page-playbook-2026) | 同一页序的独立复述；**"公开定价"的量化论证**（<$30K 年费必须公开，Contact sales 主路径会让转化掉 40–70%）；社交证明按影响力排序的 5 档；性能与 SEO 具体阈值（<1.5s、WebP/AVIF、SSR、FAQPage JSON-LD） |

### 5.4 排版、色彩与实现细节

| # | URL | 提供了什么 |
|---|---|---|
| 23 | [MoneyDeck 字阶计算器](https://moneydeck.io/tools/type-scale-calculator) | **1.25 大三度全表**（10.24 / 12.8 / 16 / 20 / 25 / 31.25 / 39.06 / 48.83px 及对应 rem）；每档的 heading 建议用途；可直接复制的 CSS 自定义属性 |
| 24 | [iotools 模块化字阶实践](https://iotools.cloud/journal/modular-type-scale-typography-css) | **四种比值的适用场景**（1.2 密集 UI / 1.25 安全默认 / 1.333 编辑式 / 1.618 戏剧化）；明确警告黄金比"到第三步就 42px，不适合 `h4`"；`clamp()` 跨断点插值写法 |
| 25 | [calculatey 字阶计算器](https://calculatey.com/type-scale-calculator) | 四个**已算好的工作示例**（16px×1.250×4步 = 16/20/25/31.25/39.06；16px×1.333 = 16/21.33/28.43/37.9；18px×1.200×5步；16px×1.618 = 16/25.89/41.89/67.77）；各比值的音乐命名与适用密度 |
| 26 | [SuperDesign 深色模式 token 表](https://superdesign.dev/styles/dark-mode) | 深色 token 全套；**6 组已验证对比度数值**（15.0 / 7.4 / 8.9 / 7.8 / 3.5:1）；禁用色"故意低于 AA"的说明；三条硬障碍（白底商品图、品牌色失效、纯黑/反色禁忌）；次文字必须对**最浅面**测 |
| 27 | [aslain.dev 深色设计与对比度](https://aslain.dev/en/blog/dark-mode-tasarimi) | `#121212` 面色阶梯全套（`#1e1e1e`/`#242424`/`#2c2c2c`）；**文字不透明度三档 87%/60%/38%**；WCAG 阈值表（正文 4.5:1 / 大字 3:1 / **UI 组件 3:1**）；具体数字警告（`#757575` ≈ 4.6:1 勉强、`#5a5a5a` < 3:1）；强调色降饱和规则（`#0066ff` → `#5b9aff`）；描边替代阴影写法 |
| 28 | [ColorPickPro 深色配色指南](https://colorpickpro.site/blog/dark-mode-color-palette-guide.html) | 深色**角色→HEX 对照表**（底/面板/抬升/输入框/悬停遮罩/分隔线/三种文字）；品牌色在深色下移 **2–3 档明度**的规则（`#2563eb` → `#3b82f6` → `#60a5fa`）；深色下需逐项检查的 4 类失败点 |
| 29 | [dev.to Bento Grid 完整教程](https://dev.to/imran_khan_a3cc224344dbcf/bento-grid-css-complete-tutorial-free-examples-2026-2ci) | **完整可抄的 `.bento-grid` CSS**（4 列、gap 16px、`grid-auto-rows: minmax(140px, auto)`、hero 跨 2×2）；**五条设计原则**（统一基准单位 / 内容挣得大小 / 圆角统一 16–24px / **70-20-10 配色** / `scale(1.02)` 悬停） |
| 30 | [Design Atlas Bento features](https://design.solhun.com/en/landing/bento-features) | **带 `grid-template-areas` 的完整 Bento CSS**（`"hero a b" "hero wide wide"`、`clamp` 间距与圆角、`color-mix` 强调底色）；点明与普通 `feature-grid` 的本质区别：**尺寸本身在传达重要性** |
| 31 | [Marvelous UI Bento Grid 组件](https://marvelous-ui.com/components/bento-grid) | 组件级 CSS 变量（`--mv-bento-row: 17rem`、gap、radius、padding、视觉区 70% 高度）；关键约束"**必须适配 container 宽度而不是 viewport**" |
| 32 | [GreenGeeks 最佳 Google Fonts 25 款](https://greengeeks.com/blog/best-google-fonts-free-picks-for-web-design-and-ux) | **25 款字体的分类 / 字重数 / 可变轴 / 最佳用途**对照表（含 Inter、Lato、Nunito、DM Sans、Montserrat、Poppins、Playfair Display、DM Serif Display、EB Garamond、Lora、Merriweather、JetBrains Mono 等）；Google Fonts 库规模（1,826 字族 / 50 万亿浏览 / 5,000 万站点）；**Roboto 累计约 28 万亿、Inter 年 4,140 亿且同比 +57%**；可变字体 **20–30KB vs 400–800KB** 的收益数据 |
| 33 | [London Web Design Agency 最流行 Google Fonts 2026](https://londonwebdesignagency.com/blog/most-popular-google-fonts-2026) | 独立复核 Inter 的 4,140 亿次访问与 57% 增长；**Inter 的 x-height ≈ cap-height 的 65%（Times New Roman 约 45%）**——小字号可读性的物理原因；Roboto 约占全球使用量 20%，Roboto Flex 有 12 个可变轴 |
| 34 | [OnePagey 一页商务网站该放什么](https://onepagey.com/blog/what-to-put-on-a-one-page-business-website) | **单页站四块结构**（Intro / About / Highlights / Contact）与每块的写作判据；"Contact 永远保留"；好的 vs 弱的 Intro 标题对照；按经营形态的取舍建议；**7 条发布前自检清单** |
| 35 | [UIXDraft 一页站 HTML 模板](https://uixdraft.com/html-template-for-one-page-website) | **标准单页 section 序列**（Hero→About→Services→Portfolio→Process→Testimonials→Pricing→Contact）；吸顶锚点导航 + Intersection Observer 当前区块高亮；`scroll-behavior: smooth`；section 统一 80px padding；**浅底/深底交替制造节奏**；一页站的 SEO 代价"一个 URL 只能有效瞄准一组主关键词" |
| 36 | [UIXDraft 非营利模板](https://uixdraft.com/website-template-for-nonprofit) | 非营利三页结构（Home / Programs / Impact Report）；影响数字计数器的说服逻辑；Programs 页要含"问题陈述 / 你的方法 / 可衡量结果 / 支持本项目的 CTA"（**拨款型基金会会据此评估资格**） |
| 37 | [UIXDraft 慈善模板](https://uixdraft.com/website-template-for-charity) | 慈善站 8 项转化清单；捐赠金额锚定文案模板（"$10 buys 4 meals · $25 provides a week of food · $50 feeds a family for a month"）；预设金额 **$10/$25/$50/自定义**且中间档标 "Most Chosen" 可提升平均捐赠额 **20–30%**；月度捐赠者生命周期价值 **3 倍**；受益者故事"一条真实胜过十张信息图"；透明度徽章清单 |
| 38 | [CanvasBuilder 作品集模板指南](https://canvasbuilder.co/guides/best-portfolio-website-templates) | 作品集**四个命名子型与各自最佳适用**（Minimal grid / Photography full-bleed / Personal brand / Architect-interior） |
| 39 | [SiteBuilderReport 作品集模板榜](https://sitebuilderreport.com/portfolio-website-templates) | 多款模板的**具体版式描述**（Beaumont 两列大缩略图首页兼作品区、独立作品页全宽图 + 短描述、白底黑字大留白；Quinn 粗体排版 + 单色调色板；Matsuya 瀑布流 + 单色）；"模板效果等于照片效果"的反复强调 |
| 40 | [InspoAI 30 个设计师作品集站](https://inspoai.com/blog/best-portfolio-website-designs-for-designers) | **代码级参数**：Tailwind 网格类 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`；section `p-12`/`py-10`、卡片 `gap-8`/`p-4`/`rounded-lg`；项目单页结构（问题 / 过程 / 结果 + 前后对比滑块）；About 简介 2–3 句 + 明确 CTA；`position: sticky` 侧栏与阅读进度条做法 |
| 41 | [VikiLinks 九种网页风格指南（2026）](https://vikilinks.com/blog/web-design-styles) | 九种风格的 **best for / mood / watch out for 三列表**；**三大风格家族**（Clean and systematic / Bold and expressive / Nostalgic and human）与其血缘（Swiss → Flat → Minimalism → Bento）；选风格的五个提问顺序（"不要从你喜欢的风格开始"）；当年的四个流向（表现型极简 / Bento 普及 / **排版即界面** / 对人味的手绘反扑） |
| 42 | [Minick Studio 风格库](https://minick.studio/styles) | 20 种风格的**定位描述 + 适配行业**（Minimalism / Swiss / Flat / Bento / Neumorphism / Sustainable / Studio Commerce / Neobrutalism / Constructivism / Editorial / 3D / Anti-Design / Maximalism / Big Type / Hand-Drawn / Retro / Y2K / Retrofuturism / Collage / Riso）；**Editorial = "the magazine, translated to the browser"**；并给出按经营形态的选型建议（服务型 → Minimalism/Swiss/Editorial；产品品牌 → Studio Commerce；靠人格的品牌 → Neobrutalism/Maximalism/Hand-Drawn） |
| 43 | [Empire UI 41 种 CSS UI 风格完整指南](https://empire-ui.com/blog/ultimate-guide-css-ui-styles-2026) | 41 种风格按**六大家族**归类；每种风格的**评分与签名 CSS**（Glassmorphism `backdrop-blur(12px)` 39/40、Neumorphism 双阴影 35/40、Neobrutalism `2–4px solid #000` + `4–8px` 硬阴影 34/40、Claymorphism 32/40、Flat 3.0 31/40、Material 3 29/40）；**GPU 成本分层**（flat/neobrutalism/material 最便宜，Pixel 6a 渲染 200 卡 >90fps）；**可访问性排名**（Neobrutalism 最强、Glassmorphism 最难）；**按受众/行业的选型表**（"Developer tool or SaaS dashboard? → Dark glassmorphism, flat design, or neobrutalism"）；趋势生命周期判断 |
| 44 | [Empire UI Neobrutalism vs Glassmorphism](https://empire-ui.com/blog/neobrutalism-vs-glassmorphism) | 两种对立风格的根因（Glassmorphism ← macOS Big Sur 2020；Neobrutalism ← 2022 年对过度精修 SaaS 界面的反扑）；**Glassmorphism 的动态对比度难题**（同一张卡在不同滚动位置可能通过或失败）；Neobrutalism 的**结构性可访问性优势**与**零模糊的渲染成本优势**；实操建议（玻璃只做 hero，一个视口一块；交互组件用 Neobrutalism） |
| 45 | [Exhibita 网站趋势统计](https://exhibita.design/trends.html) | **按站点类型分组的趋势统计**（Shops / Corporate 等），给出各决策的出现频率与倍数。Corporate 组：Startups ×1.6、Clean ×1.4、UI design ×1.3、Scrolling ×1.3，且"Takes after Swiss modernist 24% / Cinematic realism 22% / 3D and CGI 14%"；Shops 组：Big Background Images ×2.1、Typography ×1.5、UI design ×1.5；**升降榜**（Footer Design 5%→13%、Storytelling 23%→28%、Microinteractions 19%→23% 上升；Horizontal Layout 4%→2%、Video 9%→4%、Parallax 11%→6%、Gallery 9%→5% 下降）；核心结论"**17 of the 32 decisions have not moved at all**" |
| 46 | [Web Code Tools CSS 统计 2026](https://webcode.tools/statistics/css) | W3Techs（2026-09-15）**框架占有率表**（未检测 82.0% / **Bootstrap 13.4% = 框架用户的 74.9%** / Animate 7.5% / Foundation 0.4% / Tailwind 0.3%）；**Bootstrap 覆盖是 Tailwind 的 44.7 倍**；State of CSS 2026（4,902 人）`:has()` 83.7%、`aspect-ratio` 81.3%、CSS Nesting 70.6%；Stack Overflow 2025 中 Tailwind CSS 4 被 21.8% 的 21,329 人报告、admired 62.1%；移动首页 CSS 中位数 **77KB**；Stack Overflow 2025 中 61.9% 的人使用 HTML/CSS |
| 47 | [FOSSPost CSS 统计 2026](https://fosspost.org/css-statistics) | W3Techs（2026-09-09/10）独立复核：Bootstrap 13.6%（框架用户 74.8%）、Tailwind 0.3%；桌面 CSS 中位数 83KB；**State of CSS 2026 的框架选择排名**（Tailwind 1,854 / None 1,042 / Bootstrap 982 / **shadcn/ui 802** / 自研框架 705 / **Material UI 692** / Bulma 145，共 3,697 名回答者）——与 W3Techs 的"开发者在用"vs"线上在跑"倒挂现象；96.03% 浏览器支持 cascade layers；受访者生成 CSS 中位数 **13% 由 AI 写** |
| 48 | [Kmacims 多页企业站无框架教程](https://kmacims.com.ng/build-a-multi-page-business-website-no-frameworks) | **可直接抄的内页 banner 写法**：`.page-hero{ background: linear-gradient(135deg, #1e3a8a 0%, var(--primary-color) 100%); color: white; padding: 4rem 1rem; text-align: center; }`；首页用满幅图 hero、内页用紧凑色块 banner 的分工；带 `aria-current="page"` 的导航当前态写法 |
| 49 | [Hampox Glow 沙龙 / SPA 模板](https://hampox.app/templates/beauty-wellness/salon) | 沙龙服务+价格卡的**真实字段结构**（服务名 / 时长 / 说明 / 价格 / "Book on WhatsApp" 按钮）；服务项示例（Bridal hair-up 2 hours · trial included ₹6,500） |
| 50 | [GitHub 单文件健身房模板（MIT）](https://github.com/atlashey-collab/gym-website-template) | **可白拿的开源实现**：单 `index.html`、无构建步骤、无后端；预约逻辑为 WhatsApp 深链的一行 JS；三档会员价格条；`ExerciseGym` JSON-LD；演示站 [aitoolsinsiderhq.com/gym-website-template](https://aitoolsinsiderhq.com/gym-website-template/) |

### 5.5 补充来源（背景与趋势层）

| # | URL | 提供了什么 |
|---|---|---|
| 51 | [Wix Blog 2024 年九大网页设计趋势](https://medium.com/wix-com/the-9-biggest-web-design-trends-of-2024-0a067ff1024d) | 趋势周期的代际解读："If 2023 was a year of clean design, 2024 is going to be the year of bold design"；Z 世代推动的高饱和色取代千禧极简 |
| 52 | [TBH Creative 2024 趋势：6 种最流行风格与技法](https://blog.tbhcreative.com/2024-web-design-trends) | 粗体排版的流行；**关键数据**："the most-popular Google web font—sans serif or not—used for websites is the neo-grotesque typeface **Roboto**" |
| 53 | [LinkedIn Pulse：2025 年塑造 UI 的七大设计趋势](https://linkedin.com/pulse/top-7-ui-design-trends-shaping-2025-hassam-shabbir-zhbhf) | Morphism 趋向克制（只用来强化层级）、Neobrutalism 的适用与禁用场景（"**Avoid: Using it in data-heavy dashboards or enterprise UI**"） |
| 54 | [伦敦网页设计机构：最流行 Google Fonts](https://londonwebdesignagency.com/blog/most-popular-google-fonts-2026) | 见 #33 |
| 55 | [WCAG 2.1 目标尺寸（触控目标）](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html) | 触控目标最小 **44×44px** 的权威条款来源 |

> **来源计数**：本清单按内容列出 **55 条**独立来源；全文超链接去重后为 **57 个 URL**（差额为 W3C WCAG 一条与 GitHub 演示站一条，均已在正文中直接引用）。全部为 `web_search` / `web_fetch` 工具在本会话中实际返回过的地址。
> **未核实项**：ThemeForest 的 Technology / Nonprofit / Personal 三个分类的具体条目数未在本轮取到（`web_search` 只返回了 Corporate 7941 / Creative 3680 / Retail 3707 / Entertainment 856）；Squarespace 官方 `/templates` 页面与 Forbes 小商家指南原文未直连获取，改用 Squarespace Blog 与 OnePagey 两条同类来源交叉验证。以上均在正文标注。

---

## 6. 结论：最值得做成模板的 3 种

排序依据：**覆盖面（能服务多少类小商家）× 抄写成本（几小时能出成果）× 来源可信度（有没有可引用的硬数据）**。

---

### 🥇 第一名：S01 通用服务型企业站 / Corporate Services Site

**理由一：它是模板市场里最大的单一池子，验证是硬数据不是判断。**
[ThemeForest](https://themeforest.net/category) 的 Corporate 分类 **7941 条**，是第二名 Creative（3680 条）的 **2.16 倍**、Retail（3707 条）的 **2.14 倍**。一个池子占了近一半供给量，说明需求密度最高。

**理由二：技术栈与全网主流完全重合。**
W3Techs 显示 **Bootstrap 覆盖 13.4% 全网、占"检测到框架"站点的 74.9%**，是 Tailwind 的 **44.7 倍**；而 ThemeForest 的 Retail+corporate 检索里 **Bootstrap 兼容 151 条、ReactJS 只有 4 条**（[Web Code Tools](https://webcode.tools/statistics/css)、[ThemeForest 检索](https://themeforest.net/category/site-templates/retail?term=corporate)）。做这个模板 = 做在最大公约数上。

**理由三：它一次性覆盖最多行业。**
S01 的结构（Hero → 服务 3 列 → 案例 → 计数器 → 评价 → 表单 → Footer）可以直接改字服务：装修、通风、保洁、代账、设备维护、本地制造、弱电、搬家、培训机构。**一套骨架至少覆盖 8 个行业**，是全部 12 种里复用率最高的。

**理由四：有一份可直接当规格书用的来源。**
[Amidcode](https://amidcode.com/en/blog/corporate-website-structure) 与 [MMIX](https://mmix.ua/en/corporate-website-structure-10-key-elements) 两家独立给出同一套页面清单、导航 5–7 项、三击规则；[CanvasBuilder](https://canvasbuilder.co/blog/law-firm-website-design-authority-trust) 与 [LearnKu](https://learnku.com/articles/90955) 各自给了可抄的 CSS 变量（`--container: 1200px`、`--space-2..8`、`--cnvs-themecolor`）。**规格书是现成的，不用自己定。**

**理由五：上手成本低且有明确教学。**
[Kmacims](https://kmacims.com.ng/build-a-multi-page-business-website-no-frameworks) 提供了分步教程与内页 banner 的完整代码（`.page-hero` 渐变块）。首页 + 4 个内页 **6–8 小时**。

**做的顺序建议**：① 定 `--container: 1200px` + 8/16/24/32 间距 + 1.25 字阶（三个变量先钉死）→ ② 写 Hero（标题用"我们为 X 做 Y"句式）→ ③ 服务 3 列卡（每张卡链到独立页面）→ ④ 案例 3 张真图 → ⑤ 评价（必须有真实姓名）→ ⑥ 底部表单 → ⑦ 复制改 4 个内页。

---

### 🥈 第二名：S02 单页本地生意站 / One-Page Local Business

**理由一：上手难度全表最低——★☆☆☆☆。**
四个 section（Intro / About / Highlights / Contact）装完就是完整网站。**3–4 小时**可从零做到上线。[OnePagey](https://onepagey.com/blog/what-to-put-on-a-one-page-business-website) 明确"大部分店主先只上 Highlights，Service 以后再补"——**允许内容不齐就上线**，这是它比 S01 更具"大众化"的关键差异。

**理由二：内容压力最小，直接解决"没素材"这个真实瓶颈。**
小商家最常见的死因是"没内容 / 没照片 / 没文案"。单页站只要 3–5 条卖点 + 一句 About + 一个联系方式，就能成立。[UIXDraft](https://uixdraft.com/html-template-for-one-page-website) 给出的标准 section 序列本身就是填空题。

**理由三：价格锚点已经验证过市场能接受。**
Squarespace 生态里的一页模板成交价 **$159**（Social Light）到 **$299**（Embody，单长页）。**$159 是检索到的一整批模板里的最低价**，[SquareLocator](https://squarelocator.com/blogs/insights/best-squarespace-templates-in-2026) 对它的评价是"for a sole trader with one service, it is genuinely enough"——市场已经为"够用就好"付过钱。

**理由四：有真实的开源实现可参照。**
[GitHub 单文件健身房模板（MIT）](https://github.com/atlashey-collab/gym-website-template) 是一个 `index.html`、无构建步骤、无后端，连"预约"都只用一行 WhatsApp 深链实现。**这证明了极小实现的可行性边界在哪。**

**唯一必须写在文档里的取舍**：SEO。[UIXDraft](https://uixdraft.com/html-template-for-one-page-website) 直说"一个 URL 只能有效瞄准一组主关键词"。因此模板文档里应该加一句判据：**只有一个主业务 → 用单页；有两个以上服务想各自获客 → 升级到 S01。**

**做的顺序建议**：① 写一句"具体地点或定位 + 清楚的产品"的标题（❌ "Welcome to our website"）→ ② 3–5 条 Highlights（短句）→ ③ 一条真实评价 → ④ 电话与邮箱（**这两项要反复核对**，OnePagey 特别强调"These are the details people actually use"）→ ⑤ `scroll-behavior: smooth` + 锚点导航 → ⑥ 手机宽度预览一遍。

---

### 🥉 第三名：S03 餐饮视觉主导 / Food-First Menu Site

**理由一：行业证据是全表最干净的——一家来源直接给了 7 个可照抄的形态。**
[Naratake 的 7 个真实餐厅构建](https://naratake.com/en/examples/restaurant-websites) 把同一底层拆成 Chinese Restaurant / American Diner / Coffee Shop / Bakery / Bar & Grill / Food Truck / Bubble Tea，每种**明确标注"首页 Lead 什么"与完整页序**。这等于一份现成的"选一个形态 → 换菜名换照片"的对照表，选型成本几乎为零。

**理由二：模板供给最成熟、且技术栈明确。**
[Restaurantify](https://restaurantify.com/20-best-restaurant-website-templates-for-online-food-ordering-delivery) 一家就列了 **20 款**餐厅模板，其中多款明确标注 **built using the Bootstrap framework** 并自带 5–7 套配色（Soup / Delizus 等）。而且公园里那块最难的"配色"已经被行业收敛了——[Restaurantify](https://restaurantify.com/20-best-restaurant-website-templates-for-online-food-ordering-delivery) 指出 **黑 + 白 + 红** 是"餐厅模板最想要的三色"。**配色不用想，照抄。**

**理由三：商业闭环最完整、最不依赖商家自己造系统。**
模板普遍内置在线点餐与预订表单。[Framer 的 Pepper](https://framer.com/marketplace/templates/pepper) 也已把这套区块（hero / featured menu / offers / desserts / locations / reviews / newsletter / contact）做成开箱组件，连结构化数据占位脚本都给了。

**理由四：它把"没有文案能力"这件事从风险变成了优势。**
食物照片本身就是说服力，页面文字量可以压到极低。[Naratake](https://naratake.com/en/examples/restaurant-websites) 的判断句可以直接当设计规范用："**Start with the menu, location and hours, then choose how customers should reach you.**"——三件事，没有第四件。

**唯一的结构风险与对策**：餐饮商家最常漏掉"营业时间和位置"。对策是把 **Hours & Location 做成导航固定项**（7 个真实构建全都包含 Menu / 取餐配送 / Hours & Location / Contact 这四项，只多不少）。

**做的顺序建议**：① 选定 7 种形态之一 → ② 定配色（黑白红 / 暖木系二选一）→ ③ 顶部放关键信息图标条 → ④ 菜品用 3–4 列网格，菜名左价右对齐同基线 + `tabular-nums` → ⑤ 一章首屏大图（**不要视频**）→ ⑥ Hours & Location 单独成页 + 地图 → ⑦ 一键预订或 WhatsApp 下单。

---

### 6.1 落选但值得作为"变体"的两种

| 风格 | 为什么没进前三 | 什么时候该做 |
|---|---|---|
| **S11 Bento 模块网格** | 单独成不了站——它是一**个区块**，不是一套页面骨架。但它可以插进 S01 和 S06。 | 做 S01 / S06 时把"功能"或"服务"那一段做成 Bento，成本很低（CSS 已在 §3.2 S11 给全） |
| **S12 深色产品界面** | 三条硬障碍会直接卡死小商家：① 白底商品图会变成"floating white boxes"② 品牌色在 `#121212` 上经常掉到 4.5:1 以下 ③ 要逐项验算对比度（[SuperDesign](https://superdesign.dev/styles/dark-mode)）。 | 面向开发者 / 技术用户的产品，或做 S06 时加一个 `dark:` 变体（**不是**替代主视觉） |

### 6.2 三条跨风格的共同结论

1. **"大众化"的主轴确实是行业用途，不是美学流派**——Lead 的线索成立。ThemeForest 的 Corporate / Retail / Creative 三类合计 **15328 条**，而 Entertainment 只有 856 条（1/9），说明买模板的人在按"我是干什么的"选，不按"我喜欢什么流派"选。
2. **配色与字体不该由用户决策，应由模板给出**——因为行业已经把答案收敛了：餐饮 = 黑白红或暖木系；律所 = 藏青 + 米白 + 一个金色强调；SaaS = 白底 + 一个强调色；深色 = `#121212` 面色阶梯。**给选项是负担，给答案才是"拿来就能套用"。**
3. **"大众化"的真正瓶颈不是审美，是性能与内容量。** 唯一的真实前后对比案例（[LearnKu](https://learnku.com/articles/90955)：视频头图导致 field LCP 3.4s → 换静态图后 2.2s，捐赠完成率上升）说明：**小商家做砸站的原因几乎从不是"不够美"，而是图太大、内容太少、价格不写、按钮太多。** 因此模板文档里，"别做"清单（§4）比风格定义更重要。

---

## 7. 附录：报告元信息

| 项 | 值 |
|---|---|
| 风格条目数 | **12**（S01–S12） |
| 独立来源 URL 数 | **55** |
| "别做"条目数 | **12** |
| 配方数 | **12**（每种风格一套，含配色 HEX / 字体 / 版心 / 断点 / 页序） |
| 检索方式 | `web_search`（多轮，含行业轴 / 风格轴 / 实现轴三个方向），未使用 Node 或 PowerShell 直连外网 |
| 未核实项 | ThemeForest 的 Technology / Nonprofit / Personal 分类条目数；Squarespace 官方 /templates 页与 Forbes 小商家指南原文（均已在正文标注） |

