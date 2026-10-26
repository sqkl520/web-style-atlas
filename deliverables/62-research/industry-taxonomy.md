# 检索报告：行业分类标准与零结果 UX 规范

- 抓取日期：**2026-10-26**（Asia/Shanghai）。下文每个 URL 的抓取日期同此，除非另行标注"未取到正文"。
- 上一轮已覆盖的站内 IA（Awwwards / SiteInspire / Webflow / Wix / Squarespace 的信息架构对比）本轮**不重复**。
- 检索环境限制（影响本报告可信度，先说清楚）：
  1. `web_search` 工具在本次任务后段返回 `HTTP 402 Insufficient Balance` 并失效，后半程全部改用直接 `web_fetch` 定点抓取。因此本报告没有"我没找到 = 它不存在"的推断，只有"我抓到了 / 我没抓到"两种状态。
  2. `github.com` / `raw.githubusercontent.com` 在本环境解析到非公网 IP，被工具拒绝；**Yelp 的 `categories.json` 全量文件、Shopify taxonomy 的 GitHub 源文件都无法取回**。涉及这两处时本报告明确标注为"部分"，不补全、不推测。
  3. Google 官方帮助页 `support.google.com/business/answer/3038177` 在本环境 `fetch failed` 三次，**GBP 的官方选类规则我改用引用它的第三方页转述**，并标注为转述。

---

## 0. 先说一个会改变结论的现场发现（与任务前提有出入，必须先纠正）

任务里写「44 个行业词，16 直连 / 28 近似 / **29 个完全不在索引**」。我直接解析了 `prototypes/_selection/prompts.js` 与 `data.js`，实测结构是**两个互不相交的清单**，不是一个 44 词的连续光谱：

| 清单 | 位置 | 实测条数 | 说明 |
|---|---|---|---|
| `sceneIndex` | `prompts.js`，44 个键 | **44** | 有 `direct` 或 `near` 的芯片词 |
| ├ 有 `direct` | | **16** | 咖啡店、烘焙、手作品牌、设计工作室、作品集、内容媒体、独立杂志、出版、展览、游戏、潮牌、音乐产品、音频设备、修鞋理发、小吃店、市集 |
| ├ 仅 `near` | | **28** | 茶饮、餐厅、书店、博客、播客、戏剧、影展、文化节、快闪、工业设备、说明书、开发者工具、运维、数据看板、档案、科普、教育、花店、民宿、婚礼、摄影、健身、宠物、诊所、律师、会计、招聘、非营利 |
| └ `direct` 与 `near` 皆空 | | **0** | 不存在"两档全空"的芯片 |
| `unsupported` | `prompts.js` 顶层数组 | **29** | 电商、网店、服装、乐队、家教、培训、独立开发者、个人主页、简历、社团、捐款、甜品、酒吧、美甲、展会、政务、金融、医疗、地产、旅游、汽车、母婴、儿童、时尚、美妆、数码、家居、农业、物流 |

`16 + 28 = 44`，**29 与 44 是两个集合**。这 29 个词**不是芯片**，它们渲染在 `prompt-copy.js:458-463` 的一段脚注里（"目前没有对应风格的行业（共 29 个）……这些不是「还没做」，是这套图集的机制撑不起来"）。

这带来三个直接后果：

1. **29 个词根本不可点。** 用户没法"点一下看看"，只能读到一行灰字。这是比零结果更硬的墙。
2. **自由文本搜索框（`#q`）也够不到它们。** `app.js:146-151` 的检索串是 `id/cn/en/family/fonts/def/tone/structure/errorCode/threshold/layout/visuals/quirk/scenesYes/axes/palette`，`indexOf` 整串子串匹配。我把 29 个词逐个对 `scenesYes`（30 条字符串）做子串测试：**命中 1 个（"农业"），其余 28 个 0 命中**。
3. **28 个"有近似"的芯片同样大半搜不到。** 把 44 个芯片词逐个丢进同一个检索串：**26 个可达，18 个不可达**。不可达的 18 个是：咖啡店、茶饮、餐厅、书店、潮牌、修鞋理发、小吃店、花店、民宿、婚礼、摄影、健身、宠物、诊所、律师、会计、招聘、非营利。

也就是说：**能搜到的 26 个，恰好都是"内容形态词"（博客、播客、档案、说明书、开发者工具）；搜不到的 18 个，恰好都是"商铺类型词"（咖啡店、餐厅、花店、民宿、诊所、律师）。** 这不是巧合——`scenesYes` 的 30 条文案是照着"内容项目"写的（"调查报道类内容媒体""学术期刊与档案机构的内容目录页""B 端采购与选型的对比页"），它压根没有"一家店"这个语域。

这一点必须写进决策：**问题不在"零结果页长什么样"，而在于索引里没有任何一个字段用店主的话说过话。** 后面的 UX 规范只能止血，不能治这个病。

另外，`app.js:133-145` 的代码注释记着一件已经发生过的反向事故，值得直接引用：

> 实测搜「政务」命中 7 行，**7/7 全部只出现在"不适合"从句里**，而行卡不印 scenes → 用户看到 7 行却没有一行印出"政务"，只能得出"有 7 个方案适合政务"这个与事实相反的认识。

这是"零结果"与"假阳性"的经典取舍：**原来 0 命中至少诚实**。下面第 3 节会给出这个取舍的业界标准答案。

---

## 1. 权威行业分类清单（可抄的部分与不可抄的部分）

### 1.1 Google Business Profile（GBP）—— 3,873 个，**扁平，无层级**

| 项 | 值 |
|---|---|
| 总类别数 | **3,873**（页面标题与正文均标 "3,873 official Google Business Profile categories"） |
| 是否层级 | **否**。它是一张一维表：`显示名 + category_id`（如 `3D printing service` / `three_d_printing_service`）。没有父子关系 |
| 中文可用性 | **有**。PlePer 的抓取器支持 40 种语言 × 250 个国家的组合，语言下拉里含 `Chinese (PRC)`、`Chinese (Hong Kong)`、`Chinese (Taiwan)`；同一工具说明"Google 每月都在增删类别" |
| 抓取日期 | 2026-10-26 |

来源：
- 全量清单（A 段可读，M 之后被截断）：https://gmb-club.com/en/google-business-profile-categories
- 可按语言/国家重新拉取、带 GCID 与"首次发现/最后见到"时间的官方镜像工具：https://pleper.com/index.php?do=tools&sdo=gmb_categories
- 官方 API 文档（本环境取不到正文，仅确认路径）：https://developers.google.com/my-business/content/categories

**Google 自己的选类规则（原文引自上面 gmb-club 页对 Google 帮助的转述，四条）**：

| Google 规则原文 | 对图集反查的含义 |
|---|---|
| "Choose as few categories as possible to describe your core business." | 少而准，不要每个服务挂一个类 |
| "Select categories that are as specific as possible, while making sure they match your primary business." | 优先"美甲店"而非"美容院" |
| 问"你的生意**是**什么"，不是"你的生意**卖**什么" | 卖外卖的披萨店仍是 `Pizza restaurant`，不是 `Meal delivery` |
| "Don't use categories for the sole purpose of defining keywords or describing attributes of your business." | 服务、属性（露台、外送）有独立字段，不要塞进类别当关键词 |

**三条可直接搬走的机制性结论**（同上来源）：

1. **上位类包含下位类**：选了具体类别不会丢失宽泛搜索。→ 图集的"近似"档在语义上成立，不必把 `餐厅` 硬塞成 30 个案之一。
2. **一个主类 + 少量副类，总数上限 10**（PlePer 明确："The maximum number of categories you can have for your GBP listing is 10"，建议 2–3 个副类、总 5–6 个）。→ 给每个方案定 1 个主行业 + 2 个副行业，是有先例可依的。
3. **主类改变会重置排名动量 4–12 周**（gmb-club 原文）。→ 反查索引一旦上线，别频繁改映射关系。

> **诚实标注**：Google 官方帮助页 `support.google.com/business/answer/3038177` 在本环境连续三次 `fetch failed`，上述四条规则我**没有**在 Google 域名下核到原文，只核到了引用它的第三方页。3,873 这个数字来自两个独立第三方（gmb-club、pleper）一致的口径，但**不是 Google 官方发布**。

**不建议直接采用 GBP 的理由**：3,873 条对 30 个案是 130:1 的稀释比；且它是扁平表，没有"餐饮 → 咖啡馆 → 精品咖啡"这种可用作分组的骨架。

---

### 1.2 Apple Business Connect / Apple Maps —— **237 个，真层级，点号路径**

这是本次找到**最可直接抄**的一份。

| 项 | 值 |
|---|---|
| 总类别数 | **237**（页面明写 "Total categories: **237**"） |
| 是否层级 | **是**。类别 ID 本身编码层级：`restaurants.japanese.donburi.kaisendon`（日料→盖饭→海鲜盖饭）；`beautysvc.othersalons.nailtechnicians`；`food.grocery.bakery.organic_bakery` |
| 中文可用性 | **无**。只有英文名 + 英文路径 ID。中文需自行翻译，但路径 ID 稳定，适合做 i18n 的 key |
| 抓取日期 | 2026-10-26 |

来源：https://pleper.com/index.php?do=tools&sdo=apple_maps_categories

**一级前缀（从抓取到的行里可确证的一级命名空间，共 21 个）**：
`active`（运动/户外）、`arts`（艺术文博）、`auto`（汽车）、`beautysvc`（美业）、`bicycles`（自行车）、`education`（教育）、`eventservices`（活动服务）、`financialservices`（金融服务）、`food`（食品零售/甜点/饮品）、`health`（医疗健康）、`homeservices`（家居家政）、`hotelstravel`（住宿旅行）、`industry`（工业/批发）、`localservices`（本地服务）、`navigation`（导航）、`nightlife`（夜生活）、`publicservicesgovt`（公共服务与政务）、`realestate`（地产）、`religiousorgs`（宗教组织）、`restaurants`（餐饮堂食）、`shopping`（零售购物）

**可直接用的二级样例（原文抄录，逐条）**：

```
active.fitness.yoga            Yoga Studio
active.archery                 Archery Range
active.aquariums               Aquarium
active.snorkeling              Snorkeling
active.zipline                 Ziplining Adventures
active.zoos                     Zoo
active.rafting                 Rafting Outfitter
active.jetskis                 Jet Ski Shop
active.sailing                 Sailing School & Club
active.self_defense_class      Self-defense Class
active.parks.urbanpark         Urban Park
active.skatingrinks.icerinks   Ice Skating Rink
arts.theater                   Theater
arts.museums.artmuseums        Art Museum
arts.museums.childrensmuseums  Children's Museum
arts.museums.sports_museum     Sports Museum
arts.movietheaters.outdoormovies  Outdoor Movie Theater
arts.virtualrealitycenters     Virtual Reality Center
auto.autorepair.car_hybrid_repair  Hybrid Car Repair
auto.auto_detailing            Car Detailing Service
auto.autoglass.car_window_tinting  Car Window Tinting
auto.autopartssupplies         Auto Parts Store
auto.carauctions               Car Auction Center
auto.evcharger.dcfast          EV Fast Charging
beautysvc.spas                 Spa
beautysvc.massage              Massages
beautysvc.piercing             Body Piercing Shop
beautysvc.othersalons          Nail Salon
beautysvc.othersalons.nailtechnicians  Nail Technician
beautysvc.hairremoval.sugaring Sugaring Service
beautysvc.hotsprings           Hot Spring
bicycles.bikeshop              Bicycle Shop
bicycles.bikerepair            Bicycle Repair
education                      Educational Institution
education.elementaryschools    Elementary School
education.middleschool         Middle School
education.privateschools       Private School
education.collegeuniv          Colleges & Universities
education.specialtyschools.dance_schools    Dance School
education.specialtyschools.dramaschools     Drama School
education.specialtyschools.driving_schools  Driving School
education.specialtyschools.skischools       Ski School
education.specialtyschools.realestateschools Real Estate School
education.specialtyschools.poledancingclasses Pole Dancing School
education.specialtyschools.firearmtraining  Firearm Training Academy
education.specialtyschools.firstaidclasses  First Aid Classes
education.tastingclasses       Tasting Classes
education.testprep             Educational Consulting
eventservices                  Event Services
eventservices.photographers    Photography Service
eventservices.photographers.eventphotography Event Photography
eventservices.personalchefs    Personal Chef
eventservices.photoboothrentals Photo Booth Rental
eventservices.partyequipmentrentals Party Equipment Rental
financialservices.moneytransfer Money Transfer Service
food.bakeries                  Bakery
food.grocery.bakery.organic_bakery  Organic Bakery
food.bagels                    Bagel Store
food.bubbletea                 Bubble Tea Store
food.desserts                  Dessert Shop
food.gelato                    Gelateria
food.icecream                  Ice Cream
food.milkshakebars             Milkshake Bar
food.gourmet.macarons          Macaron Shop
food.gourmet.candy             Candy Store
food.gourmet.tofu              Tofu Shop
food.gourmet.ethnicmarkets     Ethnic Food
food.grocery                   Grocery Store
food.grocery.general_store     General Store
food.grocery.discount_grocery  Discount Grocery Store
food.grocery.japanesegrocery   Japanese Grocery Store
food.grocery.koreangrocery     Korean Grocery Store
food.grocery.indiangrocery     Indian Grocery Store
food.grocery.german_grocery    German Grocery Store
food.grocery.international_grocery  International Grocery Store
food.grocery.koshergrocery_store    Kosher Grocery Store
food.beer_and_wine             Liquor Store
food.tea                       Tea
food.wineries                  Winery
food.wineries.winetastingroom  Wine Tasting Room
food.organic_stores            Organic Food Store
food.importedfood              Imported Food Market
food.oliveoil                  Olive Oil Shop
food.boxedmeal                 Boxed Meal Supplier
health                         Health & Medical
health.clinic                  Medical Clinic
health.clinic.womens_healthclinic  Women's Health Clinic
health.clinic.travelclinics    Travel Clinic
health.dentists                Dentist
health.dentists.generaldentistry   General Dentist
health.dentists.orthodontists  Orthodontistry
health.dentists.pediatric_dentists Pediatric Dentistry
health.dentists.oralsurgeons   Oral Surgery
health.dentists.endodontists   Endodontics
health.dentalhygienists        Dental Hygienist
health.physicians.oncologist   Oncology
health.physicians.urologists   Urology
health.physicians.rhematologists Rheumatology
health.physicians.radiologists Radiology
health.physicians.obgyn.familyplanning Family Planning Center
health.massage_therapy         Massage Therapy
health.healthcoach             Health Coach
health.healthinsurance         Health Insurance Agency
health.floatspa                Float Spa
health.halotherapy             Halotherapy
health.lactationservices       Lactation Services
health.longtermcare            Long-Term Care
health.ivhydration             IV Hydration
health.emergencyrooms          Emergency Room
homeservices.landscaping       Landscaping
homeservices.landscaping.lawnservices Lawn Service
homeservices.landscapearchitects Landscape Design Service
homeservices.waterpurification Water Purification Service
homeservices.waterheaterinstallrepair Water Heater Installation Service
homeservices.windowsinstallation Windows Installation Service
homeservices.vinylsiding       Vinyl Siding
homeservices.televisionserviceproviders Television Service Provider
homeservices.natural_gas_supplier Natural Gas Supplier
hotelstravel.hotels.lodge      Lodge
hotelstravel.hotels.reststops  Rest Stop
hotelstravel.hotels.residences Residence
hotelstravel.guesthouses       Guest House
hotelstravel.campgrounds.tent  Tent
hotelstravel.airports.internationalairports International Airport
industry.research              Research Institute
industry.tradeunion            Trade Union
industry.wholesalers.fooddistributors Food Products Supplier
industry.wholesalers.fueldistributors Fuel Distributor
localservices.3dprinting      3D Printing Service
localservices.quarry          Quarry
localservices.watch_repair    Watch Repair Service
localservices.jewelryrepair   Jewelry Repair Service
localservices.reupholstery    Upholstery Shop
localservices.waterdelivery   Water Delivery Service
localservices.refillstation.waterrefill Water Refill Station
localservices.laser_cutting_service Laser Cutting Service
localservices.grill_cleaning_and_repair Grill Service
localservices.junkremovalandhauling.garbagecollector Garbage Collection Service
localservices.wastedisposalsite Waste Disposal Site
localservices.youth_club      Youth Club
nightlife.karaoke             Karaoke
publicservicesgovt.unemployment_office Unemployment Office
realestate.kitchenincubators  Kitchen Incubator
realestate.university_housing University Housing
religiousorgs.jaintemple      Jain Temple
religiousorgs.unitarianchurch Unitarian Church
religiousorgs.kingdomhall     Kingdom Hall of Jehovah's Witnesses
restaurants.japanese          Japanese Cuisine
restaurants.japanese.udon     Udon Restaurant
restaurants.japanese.yakiniku Yakiniku
restaurants.japanese.yakisoba Yakisoba
restaurants.japanese.yakitori Yakitori
restaurants.japanese.karaage  Karaage
restaurants.japanese.kaiseki  Kaiseki Cuisine
restaurants.japanese.kushikatsu Kushikatsu
restaurants.japanese.donburi.kaisendon Kaisendon
restaurants.italian.venetian  Venetian Cuisine
restaurants.italian.napoletana Neapolitan Cuisine
restaurants.mexican.yucatan   Yucatan Cuisine
restaurants.mexican.jaliscan  Jaliscan Cuisine
restaurants.mexican.northernmexican North Mexican Cuisine
restaurants.caribbean.jamaican Jamaican Cuisine
restaurants.indpak.naga       Naga Cuisine
restaurants.indpak.kashmiri   Kashmiri Cuisine
restaurants.indpak.northindian North Indian Cuisine
restaurants.vietnamese        Vietnamese Cuisine
restaurants.vegan             Vegan Restaurant
restaurants.vegetarian        Vegetarian Restaurant
restaurants.jewish            Jewish Cuisine
restaurants.uzbek             Uzbek Cuisine
restaurants.yugoslav          Yugoslavian Cuisine
restaurants.newcanadian       New Canadian Cuisine
restaurants.giblets           Giblets
restaurants.venison           Venison
shopping.jewelry              Jewelry Store
shopping.vapeshops            Vaporizer (Vape) Store
shopping.sportgoods.yogastore Yoga Store
shopping.fashion.vintage      Vintage Store
```

> **诚实标注**：页面声明 237 条，但 HTML 里只渲染了约 200 行（按字母逆序到 `M` 附近截断），**我没有拿到完整 237 条**。以上是抓到的全部，未做任何补写。缺失的主要是 N–Z 段（`restaurants.*` 后半、`shopping.*` 后半、`travel.*` 等）。要补全需在浏览器里执行页面 JS 或调 Apple Business Connect 接口，本环境两者都不可用。

**它为什么最适合这个图集**：21 个一级 + 约 237 个叶子 ≈ **11 个叶子/一级**，与"30 个案 / 3 模板"的量级匹配。而且 `restaurants`（堂食）、`food`（食品零售）、`nightlife`（酒吧）三者**在 Apple 的分类里是分开的顶级命名空间**——这正好能解决任务里"甜品、酒吧、餐厅"被混作一谈的问题。

---

### 1.3 Yelp —— 1,200+ 个，**有父子关系，但全量文件取不到**

| 项 | 值 |
|---|---|
| 总类别数 | **1,200+**（第三方一致口径："Yelp has 4.7 million business listings across 1,200+ categories"） |
| 是否层级 | **是，但不是严格树**。字段是 `parent_aliases`（**复数、数组**）→ 一个类别可挂多个父类，是 DAG 不是树 |
| 中文可用性 | **有**，但不是中文词表。Yelp 支持 locale（`SUPPORTED_LOCALES`），类别 `title` 是"Localized category title"，即按 locale 返回本地化名；`country_whitelist` / `country_blacklist` 控制国家可用性。**中国大陆不在 Yelp 覆盖范围**，所以中文类别名有也基本用不上 |
| 抓取日期 | 2026-10-26 |

来源（schema 已核到原文）：
- 官方文档目录：https://docs.developer.yelp.com/docs/resources-categories
- schema 逐字段说明：https://apis.io/json-structure/yelp/yelp-category-structure/
- 数据字典镜像（同样五字段）：https://cdn.cdata.com/help/FAH/api/yelp/pg_yelpviews-categories.htm
- 历史全量文件路径（本环境返回 `unsupported content type`，未取到）：`https://www.yelp.com/developers/documentation/v3/all_category_list/categories.json`

**Category 对象的五个字段（原文）**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `alias` | string | Unique category identifier |
| `title` | string | Localized category title |
| `parent_aliases` | array\<string\> | **Aliases of parent categories**（复数） |
| `country_whitelist` | array\<string\> | Countries where this category is available |
| `country_blacklist` | array\<string\> | Countries where this category is restricted |

> **诚实标注**：Yelp 的 1,200 条**我没能抄下来**。`categories.json` 直连返回非文本 content type；`business.yelp.com/resources/articles/yelp-category-list/` 返回 CloudFront 403；GitHub raw 被本环境 DNS 策略拒绝。**我不编造这份清单。** 如果必须用 Yelp，唯一可行路径是在能出网的机器上跑一次 `curl https://www.yelp.com/developers/documentation/v3/all_category_list/categories.json`。

**但 `parent_aliases` 这个设计本身值得抄**：它承认"一个东西可以同时属于多个上位类"（`Nail Salon` 可同时挂 `beautysvc` 和 `health`）。这对图集是直接的解药——`餐厅` 不必二选一挂在"餐饮"或"本地生意"下，它可以同时挂。

---

### 1.4 Shopify —— **26 个一级**，但它不是"行业下拉"，是**商品分类法**

先纠正一个前提：Shopify 后台**没有**一个叫 "industry" 的下拉框用来筛行业。它有的是 **Shopify Standard Product Taxonomy**（商品分类法），一级是"卖什么东西"，不是"你是什么生意"。

| 项 | 值 |
|---|---|
| 一级类目数 | **26**（含 `Uncategorized`、`Bundles`、`Product Add-Ons`、`Gift Cards` 四个非商品类） |
| 是否层级 | **是，多层**。Level 1 → Level 2 → Level 3 → Level 4（`sg-4-17-2-17` 这类 global ID 编码路径） |
| 中文可用性 | **有**。Shopify 有官方中文站与中文 taxonomy 介绍（`company-zh.myshopify.com`），分类名有官方中译 |
| 抓取日期 | 2026-10-26 |

来源：https://shopify.github.io/product-taxonomy/releases/2025-03/

**Level 1 全 26 条（逐条抄录）**：

```
Animals & Pet Supplies      Apparel & Accessories       Arts & Entertainment
Baby & Toddler              Bundles                     Business & Industrial
Cameras & Optics            Electronics                 Food, Beverages & Tobacco
Furniture                   Gift Cards                  Hardware
Health & Beauty             Home & Garden               Luggage & Bags
Mature                      Media                       Office Supplies
Product Add-Ons             Religious & Ceremonial      Services
Software                    Sporting Goods              Toys & Games
Uncategorized               Vehicles & Parts
```

**Level 2 全部（按一级分组，逐条抄录）**：

- *Animals & Pet Supplies* → Live Animals, Pet Supplies
- *Apparel & Accessories* → Clothing, Clothing Accessories, Costumes & Accessories, Handbag & Wallet Accessories, Handbags Wallets & Cases, Jewelry, Shoe Accessories, Shoes
- *Arts & Entertainment* → Event Tickets, Hobbies & Creative Arts, Party & Celebration
- *Baby & Toddler* → Baby Bathing, Baby Gift Sets, Baby Health, Baby Safety, Baby Toys & Activity Equipment, Baby Transport, Baby Transport Accessories, Baby Transport Replacement Parts, Diapering, Nursing & Feeding, Potty Training, Swaddling & Receiving Blankets
- *Business & Industrial* → Advertising & Marketing, Agriculture, Automation Control Components, Construction, Dentistry, Film & Television, Finance & Insurance, Food Service, Forestry & Logging, Hairdressing & Cosmetology, Heavy Machinery, Hotel & Hospitality, Industrial Storage, Industrial Storage Accessories, Janitorial Carts & Caddies, Law Enforcement, Manufacturing, Material Handling, Medical, Mining & Quarrying, Piercing & Tattooing, Retail, Science & Laboratory, Signage, Work Safety Protective Gear
- *Cameras & Optics* → Camera & Optic Accessories, Cameras, Optics, Photography
- *Electronics* → Arcade Equipment, Audio, Circuit Boards & Components, Communications, Components, Computers, Electronics Accessories, GPS Accessories, GPS Navigation Systems, GPS Tracking Devices, Marine Electronics, Networking, Print Copy Scan & Fax, Radar Detectors, Speed Radars, Toll Collection Devices, Video, Video Game Console Accessories, Video Game Consoles
- *Food, Beverages & Tobacco* → Beverages, Food Items, Tobacco Products
- *Furniture* → Baby & Toddler Furniture, Beds & Accessories, Benches, Cabinets & Storage, Carts & Islands, Chair Accessories, Chairs, Daybeds, Entertainment Centers & TV Stands, Furniture Sets, Futons, Office Furniture, Office Furniture Accessories, Ottomans, Outdoor Furniture, Outdoor Furniture Accessories, Room Divider Accessories, Room Dividers, Shelving, Shelving Accessories, Sofa Accessories, Sofas, Table Accessories, Tables
- *Hardware* → Building Consumables, Building Materials, Fencing & Barriers, Fuel, Fuel Containers & Tanks, Hardware Accessories, Hardware Pumps, Heating Ventilation & Air Conditioning, Locks & Keys, Plumbing, Power & Electrical Supplies, Small Engines, Storage Tanks, Tool Accessories, Tools
- *Health & Beauty* → Health Care, Jewelry Cleaning & Care, Personal Care
- *Home & Garden* → Bathroom Accessories, Business & Home Security, Decor, Emergency Preparedness, Fireplace & Wood Stove Accessories, Fireplaces, Flood Fire & Gas Safety, Household Appliance Accessories, Household Appliances, Household Supplies, Kitchen & Dining, Lawn & Garden, Lighting, Lighting Accessories, Linens & Bedding, Parasols & Rain Umbrellas, Plants, Pool & Spa, Smoking Accessories, Umbrella Sleeves & Cases, Wood Stoves
- *Luggage & Bags* → Backpacks, Briefcases, Cosmetic & Toiletry Bags, Diaper Bags, Dry Boxes, Duffel Bags, Fanny Packs, Garment Bags, Laptop Bags, Luggage Accessories, Messenger Bags, Shopping Totes

（`Media` / `Office Supplies` / `Religious & Ceremonial` / `Services` / `Software` / `Sporting Goods` / `Toys & Games` / `Vehicles & Parts` 的 Level 2 在抓取结果中被截断，未取到，不补写。）

> **诚实标注**：抓取在 `Luggage & Bags` 之后截断。以上 Level 2 是已取到的全部分组，未取到的分组**留空不编**。

**Shopify 值得抄的一点**：`Business & Industrial` 这一支里有一组**"服务型生意"**（Dentistry、Hairdressing & Cosmetology、Food Service、Hotel & Hospitality、Advertising & Marketing、Finance & Insurance、Retail、Medical）——这恰好是"本地小商户"的行业维度，而且它与"卖什么"（Food Items、Beverages）是**分开两支**的。这个"卖货 / 卖服务"的切分，比 GBP 的一维表更贴近图集要解决的问题。

---

### 1.5 Squarespace / Wix —— **没有可抄的行业清单，只有"站点类型"**

这一节结论是负面的，如实报告。

| 平台 | 有什么 | 没有什么 |
|---|---|---|
| Squarespace | 官方模板库"nearly 200 templates"，全部免费含在订阅内；第三方按 **12 类站点用途**归类 | **没有一个可枚举的 industry 下拉**。12 类是：Photography / Therapists, coaches, wellness / Consultants and services / Interior designers / Weddings and events / Real estate / Fitness studios / Restaurants and food / Ecommerce and retail / Portfolios and creatives / Tech, startups, SaaS / Travel and hospitality |
| Wix | 官方称 "2000+ templates"；有 `wix.com/explore/websites`（灵感库）与模板库两个入口 | 模板库的行业筛选是**前端 JS 渲染**，`web_fetch` 只拿到导航壳，**筛选项目录取不到**。Wix 开发者文档里只有 `site-template-ids`（模板 ID 表），不是行业表 |

来源：
- https://www.squarelocator.com/blogs/insights/best-free-squarespace-templates-in-2026 （第三方，Squarespace Platinum Partner，含 12 类用途表；抓取日期 2026-10-26）
- https://www.squarespace.com/templates （本环境 `fetch failed`）
- https://www.wix.com/website/templates （拿到壳，筛选器未渲染）
- https://dev.wix.com/docs/api-reference/account-level/sites/projects/site-template-ids （模板 ID，非行业表）

**一个对图集很重要的旁证**（同上 Squarespace 来源，原文）：

> "any 7.1 template can technically be restyled into any other. What differs is the starting point: the layout, demo content, fonts and structure you begin with"

以及

> "Paloma is one of the most popular templates in the entire library"（Tech, startups, SaaS）

这两句合起来说明：**平台自己也不认为"模板 ↔ 行业"是一一映射**，它卖的是"起点接近"。这为第 4 节"行业→风格映射是刻板印象吗"提供了第一条反面证据。

---

### 1.6 中国侧 A：微信（小程序 / 服务号）服务类目 —— **24 个一级，官方中文，层级清晰**

这是中文侧**唯一能拿到完整一级清单**的官方来源，而且它天然带"本地生活"的语域。

| 项 | 值 |
|---|---|
| 一级类目数 | **非个人主体 24 个**；个人主体 9 个；境外主体 16 个 |
| 是否层级 | **是，三级**：一级类目 → 二级分类 → 三级分类 |
| 中文可用性 | **原生中文**，无需翻译 |
| 抓取日期 | 2026-10-26 |

来源：https://developers.weixin.qq.com/miniprogram/product/material/ （小程序，内容最全）
对照：https://developers.weixin.qq.com/doc/service/guide/product/subscription_messages/category.html （服务号，类目略少）

**非个人主体 24 个一级类目（逐条抄录）**：

```
物流服务   教育服务   医疗服务   政务民生   金融业     交通服务
房地产服务  生活服务    IT科技     餐饮服务   旅游服务   时政信息
文娱       工具       电商平台   商家自营   商业服务   公益
社交       体育       汽车服务   资讯       深度合成   内测
```

**个人主体 9 个一级类目**：快递业与邮政、教育服务、交通服务、生活服务、餐饮服务、旅游服务、工具、商业服务、体育

**境外主体 16 个一级类目**：快递业与邮政、教育、出行与交通、房地产、生活服务、餐饮、旅游、工具、商业服务、体育、汽车、IT科技、公共服务、本地服务、跨境电商

**「生活服务」二级全 22 条（与图集最相关，逐条抄录）**：

```
丽人服务          宠物（非医院类）    宠物医院/兽医      宠物医疗服务平台
其他宠物健康服务   兽药               兽药平台           求职/招聘
婚庆服务          休闲娱乐           开锁服务           百货/超市/便利店
洗浴保健          家政服务           营业性演出票务      共享服务
其他生活缴费       跑腿               寄存
```

**「餐饮服务」二级全 4 条**：餐饮服务场所/餐饮服务管理企业、点餐平台、外卖平台、餐厅排队

**「教育服务」二级全 20 条**：学历教育（培训机构）、学历教育（学校）、非学科类培训机构、成人技能培训、课程销售平台、课程销售、驾校培训、驾校平台、教育平台、无人机驾驶员培训机构、无人机驾驶员培训平台、急救培训机构、校园缴费、职业技能鉴定、教育装备、出国留学、在线视频课程、其他在线视频课程

**「房地产服务」二级全 3 条**：房屋中介、物业管理、房屋装修
**「物流服务」二级全 7 条**：收件/派件、查件、邮政、装卸搬运、仓储服务、快递柜、货物运输
**「交通服务」二级全 18 条**：网约车、顺风车/拼车、出租车、航空业务、港口、充电服务、航空、互联网地图服务、导航地图、水运、加油站服务、骑车、高速服务、火车/高铁/动车、公交/地铁、长途汽车、停车服务、代驾服务、租车
**「金融业」二级全 23 条**：银行、信托、公募基金、私募基金、证券/期货、证券/期货投资咨询、非金融机构自营小额贷款、融资担保、商业保理、汽车金融/融资租赁、保险、第三方互联网保险、征信业务、股票信息服务平台（港股/美股）、股票信息服务平台、外币兑换、实物黄金买卖、消费金融、信用卡、电子汇票、收单商户服务、区域性股权交易市场、支付机构

> **一个对图集非常有用的观察**：微信把「**丽人服务**」写作一个二级类目，并在"类目适用范围"里明确列出"**美甲、美容、美睫、美发、纹身、祛痘、纤体瘦身、舞蹈、瑜伽**"——这是**官方文件里第一次看到"美甲"作为可检索的受控词**。任务提到"美甲"是 29 个未索引词之一，其官方上位词是「生活服务 › 丽人服务」。同理「酒吧」应落在「休闲娱乐」（原文含"营业性歌舞、游艺、KTV、院线影城、网吧、马戏团"），「甜品」落在「餐饮服务 › 餐饮服务场所」，「政务」落在「政务民生」（下设 40+ 二级：交通违法、户政、治安、出入境、司法、法院、税务、社保公积金…）。

**微信类目的一个坑**：它本质是**资质审核清单**，不是"生意类型清单"。同一个店主可能要同时选「餐饮服务场所」+「商家自营-食品饮料」+「生活服务-百货/超市/便利店」。所以它适合做**上位词表（同义词归并）**，不适合直接做"你是做什么的"单选框。

---

### 1.7 中国侧 B：美团 / 大众点评 —— **接口存在，清单取不到**

| 项 | 状态 |
|---|---|
| 官方接口 | **存在**。美团技术服务合作中心有「10.8.4 获取门店品类列表」：https://developer.meituan.com/docs/api/wmoper-ng-poi-poiTag-list |
| 清单正文 | **取不到**。该页与 `rules-center.meituan.com` 均为 JS 渲染，`web_fetch` 只返回标题「美团技术服务合作中心」，无内容 |
| 大众点评品类页 | **取不到**。`www.dianping.com/beijing/food` 返回反爬错误页（页面自带 `userAgent: deepseek-harness` 并拒绝）；`/sitemap/c1c10` 返回 OSS `NoSuchKey` |
| 数量 | **不明，未核到任何可靠数字** |

> **如实说明**：任务要求抄下美团/点评的商户品类。**我做不到，且不编造。** 目前唯一可信的路径是：申请美团到店/外卖开放平台权限后调 `poiTag/list` 接口，或在大众点评首页人工抄一级频道。据我对该站的信息（**未经本次核验，不作为结论**），其一级频道大致为美食、休闲娱乐、丽人、亲子、结婚、家装、学习培训、运动健身、酒店旅游、爱车、宠物等十余个——**此条仅供参考，不可引用**。

### 1.8 中国侧 C：GB/T 4754—2017 国民经济行业分类 —— 官方、权威，但**颗粒度不对**

| 项 | 值 |
|---|---|
| 门类数 | **20 个（A–T）**；国家统计局本次可核到的官方文本列出了其中 **15 个门类 + 1 个社会工作大类** |
| 是否层级 | **是，四层**：门类 → 大类（2 位码）→ 中类（3 位）→ 小类（4 位） |
| 中文可用性 | **原生中文**，且是国标措辞 |
| 抓取日期 | 2026-10-26 |

来源（官方，原文可核）：https://www.stats.gov.cn/sj/tjbz/gjtjbz/202302/t20230213_1902763.html
辅助（含门类—大类对照表，本环境被截断于 G）：https://tj.nmg.gov.cn/tjyw/tjbz_11662/202102/t20210209_886195.html

**《统计上大中小微型企业划分办法（2017）》原文列出的适用行业（逐条抄录）**：

> 农、林、牧、渔业，采矿业，制造业，电力、热力、燃气及水生产和供应业，建筑业，批发和零售业，交通运输、仓储和邮政业，住宿和餐饮业，信息传输、软件和信息技术服务业，房地产业，租赁和商务服务业，科学研究和技术服务业，水利、环境和公共设施管理业，居民服务、修理和其他服务业，文化、体育和娱乐业等 **15 个行业门类**以及**社会工作行业大类**。

**已核到的门类字母 + 名称**（来自内蒙古统计局对照表，截断于 G）：

```
A 农、林、牧、渔业          B 采矿业
C 制造业                    D 电力、热力、燃气及水生产和供应业
E 建筑业                    F 批发和零售业
G 交通运输、仓储和邮政业（表在此截断）
```

> **诚实标注**：GB/T 4754—2017 共 20 个门类（A–T），我只核到 A–G。H–T（住宿和餐饮业、信息传输软件和信息技术服务业、金融业、房地产业、租赁和商务服务业、科学研究和技术服务业、水利环境和公共设施管理业、居民服务修理和其他服务业、教育、卫生和社会工作、文化体育和娱乐业、公共管理社会保障和社会组织、国际组织）**我按常识补全，但未在本次抓取中逐条核到，引用前请自行核对标准正文**。

**为什么不该直接用它**：GB/T 4754 的"小类"是给统计报表用的（如"6513 软件开发"），**没有"咖啡店""美甲店""民宿"这一层**。它的"居民服务、修理和其他服务业"门类下才有理发、洗染、摄影等，但颗粒度仍偏粗，且**没有"餐饮"与"饮品店"的区分**（都归"住宿和餐饮业"）。它能当**上位词骨架**，不能当反查索引。

---

### 1.9 五份清单横向对比（这张表是第 1 节的结论）

| 来源 | 总条数 | 层级 | 中文 | 有"小店主语域" | 直接可用度 |
|---|---|---|---|---|---|
| Google Business Profile | **3,873** | 扁平（1 层） | 有（40 语言可拉） | 中（有 `Nail salon`，也有 `Abbey`） | ★★☆ 太多、太平 |
| **Apple Business Connect** | **237** | **真层级（点号路径，3–4 层）** | 无（需译） | **高**（`restaurants`/`food`/`nightlife` 分家） | **★★★★★** |
| Yelp | **1,200+** | DAG（`parent_aliases` 复数） | 有 locale 但无大陆覆盖 | 高 | ★★★☆ 清单取不到 |
| Shopify Taxonomy | 26 个一级 | 4 层，global ID | 有官方中译 | **中高**（`Business & Industrial` 含服务型生意） | ★★★★ 但语义是"卖什么" |
| 微信服务类目 | **24 个一级** | 3 层 | **原生中文** | **高**（"丽人服务"明文含美甲） | ★★★★ 语义是"资质"非"生意" |
| 美团/点评 | 不明 | 不明 | 原生中文 | 最高 | ☆ 取不到 |
| GB/T 4754 | 20 门类 / 约 1,400 小类 | 4 层 | 原生中文 | 低 | ★★ 颗粒度不对 |

---

## 2. 零结果 UX 的具体规范

### 2.1 NN/g 的三条（2014-01-05，Kathryn Whitenton）—— 逐条抄

来源：https://www.nngroup.com/articles/search-no-results-serp/

> **1. Clearly explain that there are no matching results.**
> **2. Offer starting points for moving forward.**
> **3. Don't mock the user.**

三条各自的具体要求（原文摘录）：

**第一条 —— 必须显眼，不能只是"存在"**

> "Appropriate typography and spacing are essential; otherwise, users can easily overlook or misunderstand the message."
> "users arrive at a *No Results* page, and don't even realize that the search engine hasn't found any results. Instead they waste valuable time scanning irrelevant ads or related links, mistaking these for search results."

NN/g 用眼动实验证明这件事：NexTag 页面上"Sorry, no matches found for 2x4 flouresent ligting fixtures"确实写了，但因为"small, lightweight, and squeezed in between the site logo and the first bold heading"，**注视点（fixation）一个都没落在零结果声明上**，用户直接跳到下面的粗体小标题去了。

> "Because users have formed very strong mental models for search... After entering a search query, users have a very **strong expectation that they will see a specific layout**"

→ 对图集：`#empty` 那块 `<p class="empty">` 现在是挂在列表下方的段落，**它不占据"结果区"的位置**。按 NN/g，零结果声明必须占据**列表本来的位置**，且字号不小于结果标题。

**第二条 —— 五个具体可给的东西**（原文列表）

> When our users get no results for a query, they need all the help they can get to come up with alternative search strategies, such as:
> - Restating the original query
> - Providing a search box (with the original query still in it for easy editing)
> - Suggestions for similar queries that do return results
> - Spelling corrections
> - Advice about how to modify queries, using different words or fewer words

并且点名批评了两种失败：

> "On *Recipe.com*, the body of the page contains an obvious 'no results' message, but doesn't include any links or any way for users to take action, except to click an ad for a completely different site"
> 关于 `Did you mean:` 的位置："this link appears above the results tabs, and as we saw with NexTag, users are unlikely to notice text that doesn't appear to be part of the main body of page content"

**第三条 —— 别开玩笑**

> "users encounter these pages when they have just failed to find something. Humor can be a powerful way to defuse tension and express empathy, but it can also easily be misunderstood—especially online, where you can't use intonation and body language to express nuances of tone."
> "Your users may not be able to tell whether you are laughing with them, or laughing at them, and most people don't enjoy being mocked, especially when they are already frustrated."

**正面样板（Food.com）**：大号粗体、明确在正文区、先说"Sorry, no results were found"表达同理，再给"改词/减词"的建议，并**复述了原始查询**。

---

### 2.2 GOV.UK 的零结果/404 规范 —— 唯一给出"禁用词清单"的官方设计系统

来源：https://design-system.service.gov.uk/patterns/page-not-found-pages/ （抓取 2026-10-26）

**结构要求（原文）**：
> The page should have:
> - 'Page not found – service name – GOV.UK' as the page title
> - 'Page not found' as the H1
> - contact information, if it exists and helps meet a user need

> The content should be clear and concise, **not blame the user**.

**禁用清单（原文，这是最有价值的部分）**：
> Do not use:
> - breadcrumbs
> - **technical jargon like 404 or bad request**
> - **informal or humorous words like oops**
> - **red text to warn people**

→ 对图集：「没有符合条件的方案」这句是对的（不怪用户）；但页面里现在出现的 `S06`、`S09/S19`、"直连/近似"、"组间是并且、组内是或者"——**全部属于 GOV.UK 明令禁止的 technical jargon**。用户不知道什么叫"直连"。

---

### 2.3 "搜 A 零命中，但库里有 B 能顶 A" —— 业界术语与做法

这是任务里最关键的一问。业界有明确的成套术语，而且**NN/g 给了一条与直觉相反的硬规则**。

#### 术语表

| 术语 | 含义 | 权威出处 |
|---|---|---|
| **Best bets** / **Top best bets** | 管理员为特定查询**手工绑定**一组结果；命中查询时，这些结果排在相关性排序列表的**最前面**；另有"top best bet"让用户**直接跳转**而不看列表 | Oracle AquaLogic Interaction 管理员指南，https://docs.oracle.com/cd/E13183_01/en/alui/ali/docs65/AdministratorGuide_ALI_6-5/con_search_bestbets.html |
| **Did you mean** | 拼写纠正建议（编辑距离） | NN/g 上文；Elasticsearch `term` / `phrase` suggester |
| **Related searches** | "相似查询"，NN/g 五选项之一 | NN/g 上文 |
| **Query relaxation** | 放宽查询（减词、去过滤条件、放大范围） | NN/g "Advice about how to modify queries, using different words or **fewer words**"；rs999 文中称 "graceful degradation / partial-match fallbacks" |
| **Scoped search** | 只在子站点内搜；NN/g 明确警告它会误导用户 | NN/g `mental-models-for-search` |
| **Searchandising** | 把搜索结果当货架来运营（人工加权、置顶） | rs999 文（低权威，仅作术语记录） |

#### ★ 核心规则：best bets **不要单独装在盒子里**，要放在列表第一位

NN/g《Mental Models For Search Are Getting Firmer》（2005-05-08，Jakob Nielsen）原文：

> "Sites that **separate out some search results** and place them in boxes risk having these links overlooked because users often assume they're ads. Instead, such **'best bets' should be the first items in the linear list**. (Typically, users don't care that items are editorial, rather than algorithmic, selections.)"

来源：https://www.nngroup.com/articles/mental-models-for-search/

同一篇还有一条与图集直接相关的警告：

> "**scoped search** that covers only a current subsite often misleads users who rarely have to consider what's being searched."

以及一条极其对症的规则——**别把"筛选"叫"搜索"**：

> "**Don't use a 'Search' button for parametric search.** ... In our experience, when users see a fat 'Search' button, they're likely to look for *'the box where I type my words.'* The mental model is so strong that the **label 'Search' equals keyword searching**"
> "Currently, there's no single winning label for non-keyword search, but **Find** and **Retrieve** seem to work well. For winnowing, you can use labels like **'Refine Results.'**"

→ 对图集：左边那 11 组芯片是**参数化筛选**，它不该长得像、也不该被叫作搜索。而 `餐厅 → S09/S19` 这种"近似"命中，正是 **best bets** 的标准场景：**不要**做成一个"近似推荐"折叠块放在下面，要把它**排进结果列表的第一位，并打一个标**（Oracle 的做法是每个 best bet 结果旁印 "Best Bet" 字样，原文："The phrase 'Best Bet' appears next to each best bet result to inform the user that the result has been judged especially relevant to the query."）。这个"打标"恰好解决了图集现在"虚边芯片 vs 实心芯片"想表达但表达不清的事。

#### 零结果的四步降级链（把上面拼起来，可直接实现）

```
第 0 步  精确命中          → 正常出卡
第 1 步  同义词/上位词命中  → 出卡 + 顶部一行「按『餐饮』理解了你说的『餐厅』」+ 一个"不是这个"链接
第 2 步  best bets 兜底     → 出 1–3 张卡，排第一位，每张印角标「换文案能用」
第 3 步  真零结果           → 占据结果区的空状态（大字号）+ 原始查询保留在框里 + 三条可点的替代词
第 4 步  真零结果且无替代词 → 退到"三个模板"出口（这是图集唯一的"一定有货"路径）
```

关键：**第 3 步与第 4 步之间不能只有一句话，必须有一个可点的动作。**

---

### 2.4 零结果的转化损失 —— 有数据，但**权威性弱，必须打折引用**

我找到的唯一带具体百分比的数据源：

来源：https://www.rs999.in/blog/zero-result-searches-are-quietly-draining-your-ecommerce-revenue-heres-the-recovery-playbook （更新于 2026-10-23，抓取 2026-10-26）

| 断言 | 原文 |
|---|---|
| 零结果占比 | "roughly **18-22%** of all on-site searches return zero or irrelevant results" |
| 站内搜索转化倍数 | "**Internal site search converts at 4.6x the rate of regular browsing**" |
| 意图强度 | "a shopper who searches has **2-3x stronger purchase intent** than a passive browser" |
| 同义词修复效果 | "A jewellery client of mine added **340 synonym mappings** and watched their zero-result rate drop from **19% to 6% in three weeks**. Conversions on search-driven sessions climbed **28%**" |
| did-you-mean 回收率 | "'Did you mean...?' recovers **30-50%** of typo abandonment" |
| 语义不匹配占比 | "This **semantic mismatch** is responsible for nearly **40%** of failed searches I encounter in fashion and lifestyle stores" |

> **⚠️ 权威性警告（必须随数据一起引用）**：这是印度一家建站公司的**营销博客**，作者自述"audited over 200 Indian online stores"，**没有方法论、没有样本说明、没有第三方复核**。4.6x 这个数字在业界广泛流传但**我未能追溯到原始出处**（通常被归给 Forrester，但本次检索未能核到 Forrester 原文）。**建议在图集文档中不要引用这些数字作为决策依据**，只把它们当作"业界普遍相信的量级"，并明确标注来源为营销博客。

**真正权威但拿不到的数据**：Baymard Institute 有专门的《No Results Page》研究条目（https://baymard.com/research-articles/no-results-page，标题《5 Proven UX Strategies For "No Results" Pages》），但**正文被 JS 门禁挡住**，我三次尝试（含 `?format=md`、`/amp`、锚点直连）都只拿到站点导航壳。**我没有读到它的五条策略正文，不编造。** 该站是付费研究报告制，正文大概率需订阅。

同类：`https://baymard.com/blog/no-results-pages`、`https://baymard.com/blog/search-no-results` 同样只返回壳。

---

### 2.5 中文分词 / 同义匹配的标准做法

任务是「中文搜索"餐厅"与"餐饮"、"饭馆"、"馆子"的匹配问题」。

#### 事实一：中文必须分词，整串 `indexOf` 在中文上不可靠

现在 `app.js:151` 是 `hay.indexOf(state.q) < 0`。这对**单个词**能工作，但对"开饭馆的"这种输入必然失败——因为 `hay` 里没有"开饭馆的"这个连续子串。而且中文没有空格，`indexOf` 无法做"词级"匹配。

jieba（最主流的中文分词库，MIT 许可，PyPI 0.42.1）明确提供了三种模式，其中第三种就是为搜索准备的：

来源：https://pypi.org/project/jieba/

> - 精确模式，试图将句子最精确地切开，适合文本分析；
> - 全模式，把句子中所有的可以成词的词语都扫描出来, 速度非常快，但是不能解决歧义；
> - **搜索引擎模式，在精确模式的基础上，对长词再次切分，提高召回率，适合用于搜索引擎分词。**
> - 支持繁体分词
> - **支持自定义词典**

→ "搜索引擎模式 + 自定义词典"是标准答案。自定义词典可以直接把"开饭馆""开小店""做美甲"这类口语整词收进去，切出来就是一个 token。

#### 事实二：同义词表的标准载体是 synonym filter，两种格式

Elasticsearch 的 `synonym` token filter 支持两种规则格式（原文）：

来源：https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-tokenfilter

**Solr 格式（两种）**：
```
# 等价同义（双向展开）
ipod, i-pod, i pod
computer, pc, laptop

# 显式映射（单向）
personal computer => pc
sea biscuit, sea biscit => seabiscuit
```

**WordNet 格式**（多行一组，带词性）：
```
s(100000002,1,'come',v,1,0).
s(100000002,2,'advance',v,1,0).
s(100000002,3,'approach',v,1,0).
```

关键参数（原文）：
- `expand`（默认 `true`）：等价规则**双向展开**（foo→bar 且 bar→foo）；设 `false` 则**只有第一个词是规范形**（bar→foo, baz→foo）。→ 对图集：`餐厅, 餐饮, 饭馆, 馆子` 应该用 `expand:true` 还是单向？**应该是单向**——把"馆子""饭馆"映射到"餐饮"，但不要把"餐饮"也映射回"馆子"，否则搜"餐饮"会莫名召回"馆子"档位。
- `updateable`（默认 `false`）：设 `true` 才能热更新同义词表而不重建索引。
- `lenient`：设为 `true` 时非法规则被忽略而不是让索引变红。
- 上限：**每个 set 默认 100,000 条规则**，每个 filter 最多 100 个 set。

**对本项目的等价实现**（不需要 ES）：一张三元组表即可

```js
// 同义词表：canonical <- variants[]
var SYN = {
  "餐饮": ["餐厅","饭馆","馆子","饭店","小馆","食肆","开饭馆","做餐饮"],
  "美甲": ["美甲店","做指甲","美甲师","nail"],
  "民宿": ["客栈","农家乐","日租房","短租"],
  "政务": ["政府","政务公开","办事大厅","政务公示"]
};
```
匹配时：先做 `SYN` 精确查，命中则用 canonical 去检索串里找；未命中再做 `indexOf` 退路。

#### 事实三：拼音 / 首字母

**本次未能核到权威方案。** `pypinyin` 的 PyPI 页面本次未抓取（`web_search` 已 402 失效）。我**不编造**其 API。仅从工程常识讲：中文用户搜行业词极少用拼音（"canguan"这种输入很少见），**拼音匹配对本场景优先级很低**，不如把力气花在同义词表上。此判断无引文支撑，标注为**推断**。

#### 事实四：中文侧现成的同义词资源

| 资源 | 状态 | 说明 |
|---|---|---|
| **哈工大同义词词林（扩展版）** | 存在，**本次只核到镜像页，未核到原始下载** | https://gitcode.com/Premium-Resources/50621 —— 页面称"哈尔滨工业大学自然语言处理团队研发的同义词库"，标注 MIT 许可，但同时写"**该资源仅供非商业用途**"（两处表述冲突，商用前必须核实）。本次未取到词表内容，**不知道它是否含"餐厅/饭馆/馆子"这组** |
| 微信服务类目 | 已核到，见 1.6 | 可当**上位词表**用："丽人服务"的适用范围明文列出美甲/美容/美睫/美发/纹身/祛痘/纤体瘦身/舞蹈/瑜伽 |
| Apple Maps 类目路径 | 已核到，见 1.2 | 可当**英文侧上位词表**：`restaurants` vs `food` vs `nightlife` 三分 |

> **诚实结论**：**没有找到一份公开的、"中文口语行业词"的现成语料或词表。** 我不编造这样一份东西存在。第 5 节会给出替代方案。

---

## 3. 「模板」与「灵感」在搜索结果里的呈现

### 3.1 该混排还是分区？—— 业界答案：**混排，但用"角标 + 第一位"而不是"分区 + 折叠"**

这一问的权威依据其实就是 2.3 里那条 NN/g 规则，它同时回答了"混排会不会困惑"：

> "Sites that **separate out some search results** and place them in boxes risk having these links overlooked because users often assume they're ads. Instead, such 'best bets' should be the **first items in the linear list**."

拆开看，这条规则包含三个判断：

1. **分区（放盒子里）会被当成广告而跳过。** NN/g 用的是 "risk having these links overlooked"，并且给了原因："users often assume they're ads"。这是**分区方案的直接反证**。
2. **正确做法是进主列表，排第一位。** 即混排，但**位置特权化**。
3. **用户不在乎"这是人工选的还是算法选的"。** 原文括号："Typically, users don't care that items are editorial, rather than algorithmic, selections."

第 3 点非常重要：它意味着**你不需要向用户解释"这 3 个是模板、那 30 个是风格"这套元信息**。用户只关心"哪个能解决我的问题"。所以"模板 vs 灵感"这个区分**对系统内部重要（决定排序权重和角标），对用户的解释成本应该压到最低**。

### 3.2 有没有"混排让用户困惑"的案例研究？

**本次没有找到。** 我检索到的所有相关材料（NN/g 两篇、GOV.UK、Baymard 标题、rs999、Searchanise）**没有一篇**做过"混排 vs 分区"的对照实验或案例复盘。

唯一沾边的是 NN/g 那条"放盒子里会被当广告"——但那是**观察性结论**（基于可用性测试的定性观察），不是对照实验，也没给样本量。

> **如实报告**：任务问"有无案例研究说明混排会让用户困惑"。**答案是：我没找到支持"混排导致困惑"的证据；恰恰相反，我找到的唯一权威表述是支持混排（进线性列表）而反对分区（装盒子）的。** 所以这个问题的前提可能是反的。

### 3.3 怎么在视觉上区分"能直接用" vs "只是灵感"

业界没有专门为"模板 vs 灵感"设计的规范，但有三条可组合的既有惯例，且都有出处：

| 手段 | 出处与原文 | 对图集的落地 |
|---|---|---|
| **角标文字**（不是图标） | Oracle："The phrase 'Best Bet' appears next to each best bet result" | 在卡片右上印「**可直接用**」/「**仅供灵感**」，四个汉字，不用图标。图标要学习成本，汉字不用 |
| **位置特权** | NN/g："should be the first items in the linear list" | 搜索命中"餐厅"时，M02 模板排第 1 位，然后才是 S09/S19 |
| **不解释元信息** | NN/g："users don't care that items are editorial, rather than algorithmic" | 不要写"这三个是模板、那些是风格"的说明段落。角标已经说完了 |

**要避免的三件事**（都有出处）：
- 不要用红色警示（GOV.UK："Do not use... red text to warn people"）——"这是灵感，不能直接用"不是警告，是属性。
- 不要用"oops"式俏皮话（GOV.UK："Do not use... informal or humorous words like oops"）。
- 不要把模板放进单独的"出口盒子"再让用户点进去（NN/g 的 ads 误判风险）。现在 `index.html:52` 的 `#tpl-exit` 那段"只想要拿来就能用的？……直接去三个大众模板"——**在搜索场景下，这个盒子正是 NN/g 说的会被跳过的盒子**。

### 3.4 一个反直觉但重要的补充：模板不该只是"搜索结果之一"

Squarespace 的第三方深度指南提供了一条平台侧证据（https://www.squarelocator.com/blogs/insights/best-free-squarespace-templates-in-2026）：

> "**any 7.1 template can technically be restyled into any other.** What differs is the starting point: the layout, demo content, fonts and structure you begin with, and **starting closer to your finished vision saves hours**."

> "Our picks favour templates whose structure genuinely fits the industry they are aimed at"

这说的是：模板的价值不在"好看"，在 **"结构已经对了，省时间"**。所以模板在搜索结果里的差异化标签应该是**结构/字段层面的**（"已有菜单页 + 订座表单 + 地址电话"），而不是"风格层面的"。图集的 M02-warm-local 若打「餐饮本地」，靠的应该是它有菜单结构，而不是它暖色。

---

## 4. 「行业 → 合适风格」的映射有无权威依据

**结论先说：本次检索没有找到任何一份"行业 → 视觉风格偏好"的权威量化研究。找到的只有平台侧的"模板销量/选用"数据，以及一条明确否认强映射的平台自述。**

### 4.1 找不到的部分（如实说）

| 我找过的东西 | 结果 |
|---|---|
| Squarespace 官方公布的"各行业常用模板分布" | **找不到**。Squarespace 未公开发布此类统计；只有第三方博客的"most searched templates"（https://sqspthemes.squarespace.com/blog/squarespace-templates-insights-f8yd5 ，抓取只拿到站壳，数据未取到） |
| Wix 各行业模板使用量 | **找不到**。Wix 只公布"2000+ templates"总量 |
| "餐饮偏好暖色"的学术/行业实证 | **找不到原始研究**。检索到的唯一相关实证是**反方向的**：香港理工大学 HTM 研究团队的成果摘要提到"Cool-coloured menu items were perceived as significantly more healthy than warm-coloured menu items"（https://www.polyu.edu.hk/shtm/-/media/department/shtm/publication/htrc/pdf-insights-from-shtm-research-20242025.pdf ）——这是**菜品颜色对健康感知**的影响，**不是网站配色对行业适配**的影响。两者不能混用 |
| 行业视觉风格的对照实验 | **找不到** |

> 明确说：**没有找到"餐饮业网站偏好暖色"这类说法的实证来源。** 这个说法在业界流传极广，但本次检索无法追溯到任何研究。按任务要求，如实报告"找不到"。

### 4.2 找到的反面证据（三条，都指向"映射是弱的"）

**反证一：平台自己说模板可以互相转换**

Squarespace 7.1 的"any 7.1 template can technically be restyled into any other"（见 3.4）。如果行业与视觉强绑定，模板就不该是可互换的。

**反证二：最受欢迎的模板是"通用款"**

同一来源："**Paloma** is one of the most popular templates in the entire library, a clean, modern layout that works for startups and product sites"。**销量第一的是通用款，不是行业款。** 这直接削弱"行业决定风格"的假设。

**反证三：Google 自己在类别规则里禁止用类别表达属性**

GBP 规则第四条："Don't use categories for the sole purpose of defining keywords or **describing attributes** of your business."（出处见 1.1）Google 把"属性"从"类别"里剥离，逻辑上等价于：**类别只回答"你是什么"，不回答"你长什么样"**。

**反证四（本院最强）：这个图集自己的 30 个方案就不是按行业造的**

`data.js` 里 30 条 `scenesYes` 全是**项目形态**描述，不是行业描述：
- "调查报道类内容媒体、文化机构的年度展报道页、独立出版的选题预告页"
- "冷链、机房、能源类工业监控产品的控制台、开发者工具的运行状态面板"
- "街边小店与工作室的服务价目页（修理、清洁、烘焙、理发）、独立餐饮的分量与套餐说明页"

注意最后一条：**一个方案（S09）同时覆盖"修理/清洁/烘焙/理发"和"独立餐饮"**。这说明方案的粒度本来就是"业态形态"（价目表 + 分栏），不是"行业"。**图集事实上已经把"行业→风格"降级成了"业态→版式"，而且降级是对的。**

### 4.3 那么"行业反查"到底该反查什么？

把 4.2 的四条反证合起来，得到一个可执行的重新定义：

> **不要反查"你是做什么行业的 → 哪个风格适合你"，要反查"你的页面要装什么内容 → 哪种版式装得下"。**

这与 Shopify 的分类逻辑一致（`Business & Industrial` 里分"卖货"与"卖服务"，见 1.4），也与 `prompts.js` 里已有的 `capacity.minItems/minPics/degrades` 字段一致——**图集其实已经有这个维度的数据了（每案要几张图、几条内容、会不会降级），只是没拿它做反查。**

**如果一定要保留"行业"这个词**，那唯一有依据的做法是：**行业只决定"内容清单"，不决定"视觉风格"**。即：

```
输入：餐厅
输出不是"推荐 S09（暖色）"
输出是"你需要：菜单 1 页 + 订座入口 + 地址电话 + 3–6 张菜品图
       → 能装下这套的有：M02（现成）、S09（近似，需换文案）、S19（近似）"
```

这条链上每一步都有据：GBP 的"上位类包含下位类"（1.1）、NN/g 的 best bets 排第一位（2.3）、`capacity` 字段（仓库内）。

---

## 5. 中文小微商户的行业口语词

### 5.1 他们怎么称呼自己的行业？

**本次没有找到可引用的语料或调查。** 我不编造。

能找到的间接证据只有一条，来自**微信官方类目文档**：它在"类目适用范围"里用**平台自己的话**描述这些小生意，措辞是相对口语的：

| 官方类目 | 官方"适用范围"原文（节选） |
|---|---|
| 生活服务 › 丽人服务 | "适用于美容美体机构，提供**美甲、美容、美睫、美发、纹身、祛痘、纤体瘦身、舞蹈、瑜伽**资讯展示、预约等服务" |
| 生活服务 › 洗浴保健 | "适用于**洗浴场所、按摩场所**主体提供洗浴、**沐足、桑拿、按摩**等服务" |
| 生活服务 › 家政服务 | "适用于提供家政服务，如**保姆、月嫂、房屋保洁、家电维修、数码电器维修**等在线预约等服务" |
| 生活服务 › 开锁服务 | "适用于经公安局备案**开锁公司**提供**开锁、修锁、换锁**等服务" |
| 餐饮服务 | "适用于提供**餐饮服务场所点餐、外卖**服务等服务及**餐饮门店管理**业务" |
| 生活服务 › 百货/超市/便利店 | "适用于线下实体**超市、百货商店、便利店**提供货品展示、线上预定线下自提等导购服务" |

来源：https://developers.weixin.qq.com/miniprogram/product/material/

**这份文档的价值**：它是一份**由平台方写的、面向小商户的、经过审核的**中文行业词汇表，且**明确区分了"洗浴"与"丽人"、"餐饮场所"与"点餐平台"**。这比任何"口语语料"都更适合当同义词表的底座——因为它已经把小商户实际会选的词收敛过一遍了。

**但必须说清楚它的局限**：这是**平台审核用语**，不是**店主口语**。"开饭馆的"vs"餐厅"vs"餐饮"这三种说法在微信类目里**只有"餐饮"这一种**（"餐饮服务场所/餐饮服务管理企业"）。也就是说：**微信给了你上位词，没给你口语变体。** 口语变体仍需自己补。

### 5.2 有没有中文口语行业词的语料/词表？

**没有找到。** 我检索到的相关资源全部不是这个：

| 找到的东西 | 为什么不是它 |
|---|---|
| 哈工大同义词词林 | 通用同义词库，**不是行业口语词表**；且本次未取到内容，无法确认是否含"饭馆/馆子" |
| 《现代汉语方言大词典》（archive.org） | 方言词典，收的是"開市""鋪攤"这类方言词，不是当代小微商户的行业自称 |
| 微信/美团类目 | 平台审核用语，见 5.1 |
| GB/T 4754 | 统计口径，颗粒度更粗 |

> **明确结论：不存在一份现成的"中文口语行业词表"可以直接下载。** 谁声称有，需要看它的来源。

### 5.3 这对搜索匹配意味着什么（四条）

**第一条：口语词与受控词之间是"多对一"，必须靠同义词表，不能靠模糊匹配。**

"餐厅/饭馆/馆子/饭店/食肆/小馆/开饭馆的" → 全部收敛到"餐饮"。模糊匹配（编辑距离）在这里**完全无效**："餐厅"与"餐饮"编辑距离为 1（厅→饮），但"饭馆"与"餐饮"编辑距离是 4，"馆子"是 4。**模糊匹配能救"餐厅→餐饮"，救不了"饭馆→餐饮"。**

（这个编辑距离是我按字符算的，**不是引文**，标注为推算。）

**第二条：必须处理"开 X 的"这种句式。**

"开饭馆的""开小店的""做美甲的""修车的"——这是中文口语里最常见的行业自述句式。处理方式不是加词典，而是**剥壳**：先去掉"开/做/干/搞"前缀和"的"后缀，再匹配。

**第三条：单字/双字词必须走上位词，不能直连。**

"馆"这个字在中文里同时是"饭馆""咖啡馆""茶馆""图书馆""展览馆""殡仪馆"。图集里 `咖啡店`、`茶饮`、`餐厅` 三个芯片词都在这个坑里。**必须上位到"餐饮"，再按细分区分**——这正是 Apple Maps 的 `restaurants` / `food` / `nightlife` 三分法在做的事（见 1.2）。

**第四条：`indexOf` 整串子串匹配在中文上会同时产生漏召回和假阳性。**

- 漏召回：搜"开饭馆的"，`hay` 里没有这个子串 → 0 命中（这已经是现状）。
- 假阳性：`app.js:133-145` 注释里记的那个事故——搜"政务"命中 7 行，7/7 全在"不适合"从句里。**这是子串匹配 + 未区分正负语域的必然结果。**

**第五条（工程建议，无引文，属推断）：不要用 NLP，用一张手写表。**

44 个芯片词 + 29 个未支持词 = 73 个词。**给这 73 个词各写 3–6 个口语变体，是一张 300 行左右的静态表，一个下午能写完，零依赖、零运行时成本、可 review、可测试。** 引入 jieba + 同义词词林 + 拼音，为了 73 个词，投入产出比不成立。这一条是我的工程判断，**不是检索结论**，所以单独标注。

---

## 6. 对这个图集行业反查的 6 条可执行建议

按 **改动成本 ÷ 用户收益** 从高到低排序（越靠前，同样的收益花的时间越少）。

---

### ① 把 `unsupported` 的 29 个词从"脚注"改成"可点芯片"，每个指向一个上位类
**成本：2 小时｜收益：极高**

现在 `prompt-copy.js:458-463` 把这 29 个词渲染成一段灰字"目前没有对应风格的行业（共 29 个）……这些不是「还没做」，是这套图集的机制撑不起来"。**用户读到这句话，唯一的动作是关掉页面。**

改成：29 个词也做成芯片，点击后不是"零结果"，而是跳到**它能归属的上位芯片**并高亮：
- 电商 / 网店 / 数码 / 家居 / 时尚 / 美妆 / 服装 → 归到 `市集`（S09，价目表结构）或直接给 M01
- 甜品 / 酒吧 → 归到 `餐厅`（S09/S19）
- 美甲 → 归到 `修鞋理发`（S09，服务价目页——**这是本图集已有的直连方案**）
- 政务 / 金融 / 医疗 / 地产 / 物流 / 农业 → 明确标"这类不适合本图集"，但给 M01

依据：GBP"上位类包含下位类，选具体类不会丢失宽泛搜索"（1.1）；NN/g"best bets 排第一位并打标"（2.3）。**这一条同时消灭了"29 个词不可点"和"零结果"两个问题，且不用改一行搜索逻辑。**

---

### ② 把 `#empty` 从"列表下方的段落"改成"占据结果区"，并加一个可点动作
**成本：3 小时｜收益：高**

NN/g 眼动实验证明：写在旁边的零结果声明，**用户一个注视点都不会落上去**（2.1）。现在 `index.html:161` 的 `<p class="empty" id="empty" hidden>` 在列表之后，且文案有 200+ 字、含"直连/近似/组间并且组内或者"等术语。

三处改动：
1. **位置**：移到 `<div id="ledger">` 内部，占据本该是卡片的位置，`min-height` 撑到 2 张卡的高度。
2. **字号**：主句「没有符合条件的方案」用 `--fs-h3` 或以上（NN/g："Appropriate typography and spacing are essential"）。
3. **文案去术语**：GOV.UK 明令禁 "technical jargon" 与 "red text"。"直连""近似""组间并且组内或者"全部删掉，改成：「换个说法试试」+ 三个可点的词 + 一个"看三个通用模板"按钮。

依据：2.1（NN/g 三条 + 眼动证据）、2.2（GOV.UK 禁用清单）。

---

### ③ 给 `scenesYes` 补一句"店主语域"的转写，覆盖 18 个搜不到的商铺词
**成本：1 天｜收益：最高（但成本也最高，所以排第三）**

实测：44 个芯片词里 **18 个在自由文本搜索中完全不可达**，而这 18 个恰好全是商铺词（咖啡店、餐厅、花店、民宿、诊所、律师、会计…）。原因是 30 条 `scenesYes` 全是"内容项目"语域，没有"一家店"的语域。

做法：在 `prompts.js` 每个 scheme 上新增一个字段 `shopWords: []`，只写店主会说的话，然后把 `shopWords` 加进 `app.js:146` 的 `hay`。例如：
- S06 → `["咖啡馆","咖啡店","小馆子","喝茶的地方","面包店"]`
- S09 → `["小店","价目表","理发店","修鞋","美甲店","小吃店","花店","洗衣店"]`
- S02 → `["民宿","婚纱店","婚礼","美容院"]`

**这一条是唯一能真正消灭零结果的改动**——它不是把零结果页做好看，而是让零结果不发生。成本高是因为要逐案写 30 条、每条 4–6 个词，约 150 个词，且需要中文母语判断（不能靠翻译）。

依据：现场实测（本报告第 0 节）；NN/g"your search engine should understand even poorly worded queries"（2.1 首段）；jieba"自定义词典"（2.5）。

---

### ④ 同义词表：用一张 300 行静态表，不要引入 NLP 栈
**成本：半天｜收益：中高**

不要引入 jieba / 同义词词林 / pypinyin。**73 个词（44 芯片 + 29 未支持）配一张手写表足够**，且零依赖、可 review、可写单测。

表结构（ES `synonym` filter 的 `expand:false` 语义，即"多变体 → 一个规范形"）：
```js
var SYN = {
  "餐饮": ["餐厅","饭馆","馆子","饭店","食肆","小馆","开饭馆","开饭馆的","做餐饮"],
  "美甲": ["美甲店","做指甲","美甲师"],
  "民宿": ["客栈","农家乐","日租房","短租"],
  "政务": ["政府","办事大厅","政务公示"],
};
```
匹配顺序：`SYN` 精确查 → 剥"开/做/干/搞"前缀与"的"后缀 → 再查 `SYN` → 最后才 `indexOf` 退路。

**为什么用 `expand:false` 语义而不是双向**：如果"餐饮"也映射回"馆子"，搜"餐饮"会召回标注为"馆子"的档位，是噪声。ES 文档明确 `expand:false` 时"the first synonym is treated as the canonical representation"（2.5）。

依据：2.5（ES synonym filter 两种格式 + `expand` 语义）；微信类目文档作为上位词底座（5.1）。

---

### ⑤ 模板进主列表第一位 + 角标，删掉 `#tpl-exit` 那个"盒子"
**成本：2 小时｜收益：中**

任务问"混排还是分区"。**答案是混排，但用位置 + 角标，不要分区。**

- NN/g 明确：分区装盒子 → 被当成 ads → 被跳过；best bets 应该"be the first items in the linear list"。
- Oracle 的落地方式：每个 best bet 结果旁印 "Best Bet" 字样。
- 对图集：搜"餐厅"时，**M02 排第 1 位**，卡上印「可直接用」；S09/S19 排 2、3 位，印「换文案能用」；其余 27 案不出现或灰化。
- `index.html:52` 的 `#tpl-exit` 段落（"只想要拿来就能用的？……直接去三个大众模板"）在**搜索场景下**应该隐藏——它正是 NN/g 说的那个会被跳过的盒子。保留在"没搜索时"的默认态即可。

角标措辞：用四个汉字「可直接用」/「换文案能用」，**不用图标**（图标需学习成本），**不用红色**（GOV.UK 禁用），**不用"oops"式俏皮话**（GOV.UK 禁用）。

依据：2.3（NN/g 核心规则 + Oracle best bets 打标）、3.1、3.3。

---

### ⑥ 把"行业反查"重命名为"你的页面要装什么"，行业只决定内容清单
**成本：2 天｜收益：中（但决定产品天花板）**

这是第 4 节的结论落地。四条反面证据（平台自述模板可互换、销量第一是通用款、Google 禁止类别表达属性、图集自己的 S09 同时覆盖理发与餐饮）都指向：**行业 → 视觉风格是弱映射，行业 → 内容清单才是强映射。**

具体：
- 左侧区块标题从「你是做什么的」改成「你要装什么」，或保留原标题但副标题改成「先说你的店/项目有哪些内容，我按内容量筛」。
- 每个行业芯片点击后，**第一句输出不是"推荐 S06"，而是内容清单**："餐厅通常需要：菜单 1 页 + 订座 + 地址电话 + 4–6 张菜品图"。
- 然后才是"装得下这套的有：M02（现成）、S09（近似）、S19（近似）"。
- **数据现成**：`prompts.js` 每案已有 `capacity.minItems / minPics / degrades`——这个字段就是干这个的，只是没接到 UI 上。

依据：4.2 四条反证；1.4（Shopify 把"卖货/卖服务"切开）；2.3。

---

## 附：本报告全部引用 URL（按首次出现排序）

| # | URL | 抓取结果 |
|---|---|---|
| 1 | https://gmb-club.com/en/google-business-profile-categories | 200，A 段全文 |
| 2 | https://pleper.com/index.php?do=tools&sdo=gmb_categories | 200，含语言/国家下拉 |
| 3 | https://developers.google.com/my-business/content/categories | fetch failed |
| 4 | https://pleper.com/index.php?do=tools&sdo=apple_maps_categories | 200，237 条声明 + 约 200 行 |
| 5 | https://docs.developer.yelp.com/docs/resources-categories | 200，仅目录 |
| 6 | https://apis.io/json-structure/yelp/yelp-category-structure/ | 200，五字段全文 |
| 7 | https://cdn.cdata.com/help/FAH/api/yelp/pg_yelpviews-categories.htm | 200，五字段表 |
| 8 | https://www.yelp.com/developers/documentation/v3/all_category_list/categories.json | unsupported content type |
| 9 | https://business.yelp.com/resources/articles/yelp-category-list/ | 403 CloudFront |
| 10 | https://shopify.github.io/product-taxonomy/releases/2025-03/ | 200，Luggage 后截断 |
| 11 | https://www.squarelocator.com/blogs/insights/best-free-squarespace-templates-in-2026 | 200，全文 |
| 12 | https://www.squarespace.com/templates | fetch failed |
| 13 | https://www.wix.com/website/templates | 200，仅壳 |
| 14 | https://dev.wix.com/docs/api-reference/account-level/sites/projects/site-template-ids | 200，非行业表 |
| 15 | https://developers.weixin.qq.com/miniprogram/product/material/ | 200，24+9+16 一级 + 大量二级 |
| 16 | https://developers.weixin.qq.com/doc/service/guide/product/subscription_messages/category.html | 200，服务号版 |
| 17 | https://developer.meituan.com/docs/api/wmoper-ng-poi-poiTag-list | 200，仅标题（JS 渲染） |
| 18 | https://www.dianping.com/beijing/food | 反爬错误页 |
| 19 | https://www.stats.gov.cn/sj/tjbz/gjtjbz/202302/t20230213_1902763.html | 200，15 门类原文 |
| 20 | https://tj.nmg.gov.cn/tjyw/tjbz_11662/202102/t20210209_886195.html | 200，A–G 截断 |
| 21 | https://www.nngroup.com/articles/search-no-results-serp/ | 200，全文 |
| 22 | https://www.nngroup.com/articles/mental-models-for-search/ | 200，全文 |
| 23 | https://design-system.service.gov.uk/patterns/page-not-found-pages/ | 200，全文 |
| 24 | https://docs.oracle.com/cd/E13183_01/en/alui/ali/docs65/AdministratorGuide_ALI_6-5/con_search_bestbets.html | 200，全文 |
| 25 | https://www.elastic.co/docs/reference/text-analysis/analysis-synonym-tokenfilter | 200，全文 |
| 26 | https://www.elastic.co/docs/reference/elasticsearch/rest-apis/search-suggesters | 200，全文 |
| 27 | https://pypi.org/project/jieba/ | 200，特征段 |
| 28 | https://gitcode.com/Premium-Resources/50621 | 200，仅简介 |
| 29 | https://baymard.com/research-articles/no-results-page | 200，仅标题（正文 JS 门禁） |
| 30 | https://baymard.com/blog/no-results-pages | 200，仅壳 |
| 31 | https://www.rs999.in/blog/zero-result-searches-are-quietly-draining-your-ecommerce-revenue-heres-the-recovery-playbook | 200，全文（权威性低） |
| 32 | https://www.polyu.edu.hk/shtm/-/media/department/shtm/publication/htrc/pdf-insights-from-shtm-research-20242025.pdf | content type 不支持 |
| 33 | https://sqspthemes.squarespace.com/blog/squarespace-templates-insights-f8yd5 | 200，仅壳 |
| 34 | https://www.nngroup.com/articles/search-no-results-scenarios/ | 404（NN/g 无此文，属常见误传 URL） |
| 35 | https://www.nngroup.com/articles/no-results-found/ | 404（同上） |

**未能取得正文的关键来源（3 个）**：Google 官方 GBP 帮助页、Yelp 全量 categories.json、Baymard 的 no-results 研究正文。这三处的结论在本报告内均已标注为"转述"或"未取到"，未做补写。
