# 检索报告：模板对非技术用户的实际可用性

**检索日期**：2026-10-26（所有平台政策均为该日快照；平台条款变动频繁，引用处已标注"官方文档最近更新日期"）
**评估对象**：`templates/M01-clean-corporate`、`templates/M02-warm-local`、`templates/M03-bold-creator`
**方法说明**：除文献检索外，本报告对三个模板做了**真机实测**（Chrome 156.0.8078.47 / Edge 155.0.4283.62，Windows，`--headless=new`，`file://` 与 `http://` 双对照）。凡标 `[实测]` 的数据均可在 `deliverables/61-research/_lab/` 复现。
**诚实边界**：第 1、3、4 问的"非技术用户行为"部分，**没有找到直接针对"拿到 HTML 模板的人"的量化研究**。下文严格区分「直接证据」「相邻证据」「找不到」。没有编造。

---

## 0. 结论摘要

| 问题 | 结论 | 证据强度 |
|---|---|---|
| 1 真实失败点 | 最大卡点不是"不会起服务器"，而是**改完之后不知道/不敢上线**，以及**改坏了自己看不出来**。文档把这两步压缩成了一句话 | 间接（厂商文档 + 实测 + 文档审读） |
| 2 `file://` 双击 | 本层"零依赖"设计**成立且已验证**；但 `fetch`/ES module 在 `file://` 下必然断，这决定了模板**永远不能加需要读文件的 JS** | **直接实测** |
| 3 改 12 个变量 | "暴露 N 个变量"在**设计系统**层面是公认最佳实践（Webflow 把它写进审核条款）；但**普通人不会去改 CSS** 这一点没有直接量化证据。真正的问题是"改一个变量会连带改变 5 处，其中 2 处会破对比度" | 条款证据强 / 行为证据缺 |
| 4 占位标记 | `【换成你的：…】` **明显优于** Lorem ipsum / John Doe。NN/g 明确"不要再使用 lorem ipsum"；Webflow 审核**禁止** lorem ipsum，却**要求**"realistic dummy content"。本层做法与两家规范同向 | 强 |
| 5 最短上线路径 | 中国大陆用户：**EdgeOne Makers Drop（拖拽、免命令行、免费、有国内节点）**；海外/可接受境外托管：**Netlify Drop**（可先不注册）。**没有一个平台能做到"完全免费 + 绑自己域名 + 中国大陆长期稳定"** | 强（官方文档） |
| 6 验收清单 | 有。Webflow 的《Submission Requirements》+《Grading Rubric》是目前**最具体、可直接抄条款**的公开标准；ThemeForest 的官方条款被 Cloudflare 拦住，只能用二手来源并标注 | 中 |

**一句话判断**：这三个模板的**技术层**（零依赖、`file://` 可跑、对比度算过）是合格的，实测站得住。**"大众模板"这一层不合格的地方不在代码，在"最后一公里"**——上线流程、改坏后的自检、以及文档本身的可执行性（见 §7 的三处硬伤）。

---

## 1. 非技术用户的真实失败点

### 1.1 先给结论：找不到"HTML 模板"的直接研究

我检索了中英文的建站平台行为报告、支持论坛统计、可用性测试文献。**没有找到任何一份针对"普通人拿到一个 HTML 模板后卡在哪一步"的量化研究**。这是一个真实的研究空白，不是我没搜到——Squarespace / Wix / Webflow 的用户研究都是围绕"平台内可视化编辑器"，而不是"给你两个文件自己改"。

因此下面用的是三类**相邻证据**，并明确标注它们各自能支撑到什么程度。

### 1.2 可直接引用的相邻证据

**(a) 模板作者社群的一手经验：买家"只是稍微懂一点 HTML"**

ThemeForest 卖家在审核清单里写得很直白：

> "Шаблоны не всегда покупают разработчики, а очень часто обычные люди которые немного разбираются в HTML. И чтобы помочь им разобраться с шаблоном и легко его настроить и конечно же избежать обращений в поддержку - делайте документацию."
> （模板不总是开发者买，**很常见的是稍微懂一点 HTML 的普通人**。为了帮他们搞懂、轻松配置、并且避免来找客服——所以要写文档。）
> —— [WebLayner: Чек лист HTML шаблона перед отправкой на Themeforest](https://weblayner.com/blog/themes/2019-06-09-chek-list-html-shablona-pered-otpravkoj-na-themeforest-templatemonster.html)

这条证据的价值在于：它把"文档的首要目的是**减少支持请求**"说清楚了。也就是说，文档的验收标准不是"写得全"，而是"读完不需要问人"。

**(b) 官方文档承认"上传"这一步本身就是失败点**

GitHub 专门为"404"写了一整页排障文档，列出的原因全是**非技术性的**：

> - "GitHub Pages will look for an `index.html` file as the entry file for your site."
> - "The name of the `index.html` file is **case sensitive**. For example, `Index.html` will not work."
> - "The name of the file should be `index.html`, not `index.HTML` or any other variation."
> - "Check that your directory contents are in the **root directory**."
> - "The branch you are using to publish your site must be the `main` or default branch."
> —— [GitHub Docs: Troubleshooting 404 errors for GitHub Pages sites](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites)

**这五条里没有一条是"代码写错了"**。全部是"文件名大小写""文件放错目录""分支不对"。一个平台需要为这类问题写官方排障页，本身就是"这步会大量失败"的证据。

**(c) Netlify 的排障文档承认"拖对了但站点不出来"是常见故障**

> "If your site is not publishing or not in working order, check out the Troubleshooting tips. You may need to **add an empty `index.html` file** in your project folder to get your site to show up as expected."
> —— [Netlify Docs: Netlify Drop Quickstart](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/)

注意这条的微妙之处：用户拖上去的是**文件夹**，但因为文件夹里可能还套了一层同名文件夹（`m01-clean-corporate/index.html`），站点就不出来。这正是"下载模板 → 解压 → 得到一层文件夹 → 直接拖"这条最自然的路径会踩的坑。

**(d) 抽象占位会让非设计者无法判断，这一点 NN/g 有直接表述**

> "squiggly lines and lorem ipsum are often **too abstract for nondesigners**."
> —— [NN/g: Promptframes: Evolving the Wireframe for the Age of AI](https://www.nngroup.com/articles/promptframes/)

### 1.3 三个模板实际卡在哪：把"卡点"落到具体行

我按文档给出的操作路径逐条执行，得到下表。**这是本报告最实用的部分**。

| 卡点 | 是否真实存在 | 具体证据 | 严重度 |
|---|---|---|---|
| 不会起服务器 | **不存在** | `[实测]` 三个模板 `file://` 双击全部完整渲染：CSS 变量生效、内联 SVG 生效、0 个外部请求、0 个 JS 报错 | — |
| 不知道改哪一行 | **存在，且文档给错了行号** | `[实测]` M01 README 写"只改第 15–30 行那一组变量"，但 `--brand` / `--brand-ink` / `--brand-soft` 在 **12–14 行**，15–30 行从 `--ink` 开始。**用户按说明操作会漏掉最能体现"换肤"的三个品牌色** | **高** |
| 改完不知道对不对 | **存在** | 换 `--brand` 后 `--brand-soft`（图标底）仍是旧蓝色，`--brand-soft` 上的深灰字对比度会跌破 4.5:1；没有任何机制提示 | **高** |
| 图片替换失败 | **存在（静默失败）** | `[实测]` `<img src="me-photo.jpg">` 文件不存在时 `naturalWidth=0`、`complete=true`，页面**只显示 alt 文字，不报错**。用户以为"改好了" | **中** |
| 改完怎么上线 | **存在（最大卡点）** | M01 上线说明全文只有一句："把 `index.html` 和 `style.css` 两个文件上传到任何静态空间（GitHub Pages、对象存储、服务器上的 Nginx 目录）即可"。对目标用户，"静态空间""对象存储""Nginx 目录"三个词等于没说 | **最高** |
| 标记太多做不完 | **存在** | M01 有 **84 处**可见标记（86 处含注释内 2 处），M02 有 **75 处**，M03 有 **30 处**可见（33 处含属性内 3 处）。README 让用户"一个一个替换" | **中** |
| 表单填了没反应 | **存在** | M02 `<form action="#" method="post">`，纯静态无后端，提交后回到本页；文档有 §6 说明要自己接，但表单**没有任何前端提示** | **中** |

> `[实测]` 环境：Chrome 156.0.8078.47，`file:///D:/.../index.html`，1280×900 与 390×844 两档。三档均 **无横向溢出**（`scrollWidth == clientWidth`）。

---

## 2. `file://` 双击打开：2025–2026 年实际能做什么

### 2.1 双对照实测结果

同一份探针页，分别在 `file://` 和 `http://127.0.0.1` 下运行。Chrome 156 与 Edge 155 结果一致。

| 能力 | `file://` | `http://` | 说明 |
|---|---|---|---|
| CSS 变量（读取 + 应用） | ✅ `#1b2a6b` → `rgb(27,42,107)` | ✅ | |
| CSS 变量在**内联 SVG** 里生效 | ✅ `fill: rgb(27,42,107)` | ✅ | 本层图片占位框依赖此项 |
| 相对路径 `<img>` | ✅ 加载成功 | ✅ | 含**中文文件名、空格、大小写不一致**三种情况，均成功 |
| 相对路径 `@font-face`（本地 .ttf） | ✅ **真加载** | ✅ | 用字体宽度差异验证：`Mono` 87.97px vs fallback 80px，确认不是回退 |
| 相对路径 `<link rel=stylesheet>` | ✅ | ✅ | |
| 传统 `<script src>` | ✅ | ✅ | |
| **`<script type="module">`** | ❌ **被拦** | ✅ | 模块脚本因 CORS/opaque origin 不执行 |
| **`fetch()` 相对路径** | ❌ **被拦** `TypeError: Failed to fetch` | ✅ | |
| `localStorage` | ✅ | ✅ | |

`[实测]` 完整输出见 `_lab/dom-file.txt`（file://）、`_lab/dom-http.txt`（http://）、`_lab/edge-file.txt`（Edge）。

### 2.2 厂商官方说明（这是有据可查的部分）

**MDN（Mozilla）对 `file://` 的定性——最关键的一段：**

> "Local files from the same directory and subdirectories were **historically** treated as being from the same origin… **Many browsers, including Firefox and Chrome, now treat all local files as having opaque origins (by default). As a result, loading a local file with included local resources will now result in CORS errors.**"
>
> "Developers who need to perform local testing should now set up a local server."
> —— [MDN: Reason: CORS request not HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors/CORSRequestNotHttp)

同页明确点名受影响的东西：`fetch()`、`XMLHttpRequest`、**Web Fonts (`@font-face`)**、WebGL textures、XSL stylesheets。

**这里有一个必须说清楚的矛盾**：MDN 把 `@font-face` 列进了"会被 CORS 拦"的清单，但我的实测里 `@font-face` 在 Chrome 156 / Edge 155 下**能加载**。原因是从同一个目录加载的本地字体不走 CORS 检查路径（`file://` 下的子资源加载规则与 `fetch()` 不同）。**结论：以实测为准，但不要依赖它**——这属于浏览器实现细节，不是规范保证，换个浏览器/版本可能就变。

**MDN 对"为什么双击跑不起来"的教学说明：**

> "Some examples won't run if you open them as local files… **They feature asynchronous requests.** Some browsers (including Chrome) will not run async requests if you just run the example from a local file."
> "**They include other files.** Browsers commonly treat requests to load resources using the `file://` scheme as cross-origin requests."
> —— [MDN: How do you set up a local testing server?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_setup/set_up_a_local_testing_server)

### 2.3 对"大众模板"层的硬性推论

| 推论 | 依据 |
|---|---|
| **永远不能引入 `fetch()` / `XMLHttpRequest` / `type="module"`** | `file://` 下必断。一旦引入，"双击即用"这个卖点当场失效 |
| 相对路径 `<img>` 是**安全**的（含中文名/空格） | `[实测]` 三种边界全部成功 |
| **不能依赖任何相对路径的"数据文件"**（如 `content.json`） | 同上，`fetch` 被拦 |
| 内联 SVG 是"零依赖图片占位"的**唯一正确解法** | 内联 SVG 无网络请求、能吃到 CSS 变量、`file://` 无障碍 |
| 本地字体可加，但**属于灰色地带** | 实测能跑，但 MDN 明确把它列在 CORS 风险清单里；本层选系统字体栈是**保守且正确**的 |

**给验收用的一句话**：`file://` 下"能跑"的充分条件是「**只依赖 HTML/CSS 内联 + 相对路径 img/font/stylesheet，不含任何 JS 读取本地文件**」。本层三个模板**全部满足**，这是它们最扎实的优点。

---

## 3. 「改 12 个变量」这个交互设计

### 3.1 业界有没有证据说"暴露 N 个 CSS 变量"是对的？

**有，但证据的性质要说清楚：这是设计系统（design system）层面的行业共识，不是"面向普通人"的可用性研究。**

最强的条款级证据来自 Webflow 的模板审核要求——它把"定义可复用变量"写成了**强制项**：

> "Define reusable style **Variables** for
> - Colors (primary, secondary, background)
> - Typography (font families, sizes, weights)
> - Spacing (margins, paddings)
> - Brand specifics: Border radius, shadows, etc."
>
> "**Variable names should use title casing** with words separated by a space."
> "**Avoid turning one-off or rarely used values into Variables.**"
> "**Organize variables into purposeful groups.**"
> "Ramps should be **ordered light-to-dark or small-to-large for quick scanning.**"
> —— [Webflow: Template Submission Requirements → Design Systems → Variables](https://webflow.com/templates/submission-guidelines)

这四条可以直接当验收标准用，而且**本层全部踩中**：

| Webflow 条款 | M01 | M02 | M03 |
|---|---|---|---|
| 颜色/字体/间距/圆角都有变量 | ✅ 12 个 | ✅ 12 个 | ✅ 12 个 |
| 分类分组 | ✅ 颜色 / 形状与尺度 / 字体 三组 | ✅ 底色/文字/品牌/分隔/尺寸/字体 | ✅ 同 |
| 不做一次性变量 | ✅ 全部被引用 | ✅ 全部被引用 | ✅ 全部被引用 |
| 命名可读（**此处不适用**：Webflow 要 Title Case，CSS 惯例是 kebab-case） | ✅ kebab-case | ✅ | ✅ |

**但有一个反向证据必须放进来**：Webflow 的规则是写给**设计师用可视化工具**的，变量面板会直接列出名字+色板+实时预览。本层是**纯文本 CSS**，用户看到的是 `--brand-soft: #EAF1F8; /* 主色淡色… */`。**同样是"12 个变量"，交互成本差一个量级。**

### 3.2 普通人到底会不会去改 CSS？

**没找到任何量化研究。这一点我必须如实说找不到。**

能找到的最接近的**行为代理证据**是 WordPress 生态的插件安装量——"主题定制"类插件在 Top 100 万站点中的检出量：

> Kirki Customizer Framework：**73,745** 个站点；KeyDesign：17,621；Colorlib 404 Customizer：3,251
> —— [StackScan: 主题定制 WordPress 插件市场份额](https://www.stackscan.com/zh/wordpress-plugins/theme-customization)

这个数据**能说明的**：确实有相当数量的站点主愿意为了"改主题"而额外装插件（说明需求真实存在）。
**不能说明的**：这些人里有多少是非技术人员，以及他们是通过 Customizer 图形界面还是直接改 CSS。

**我的判断（明确标为判断，不是研究结论）**：
- 愿意改 5 个以内颜色的人：**大概率是多数**（"换个品牌色"是店主/自由职业者的强需求）
- 会主动去改 `--radius` / `--space` / `--maxw` 的人：**极少数**。这三个变量是给"懂一点的人"留的旋钮，对普通人只是噪声
- 真正会失败的不是"不会改"，而是"**改完不知道坏了**"

### 3.3 本层的真实缺陷：12 个变量之间存在隐性耦合

`[实测]` 以 M01 为例，`--brand: #1B3A5C` 被至少 3 个派生变量关联：

```
--brand      → 按钮底色、链接、图标
--brand-ink  → 按钮悬停、页脚底色      ← 用户以为改了 --brand 就够
--brand-soft → 图标底、结尾区底色      ← 会留在旧色系
```

后果很具体：换了 `--brand` 但没换 `--brand-soft`，页面上会出现**新旧两个品牌色并存**——这正是非技术用户最容易产出、又最说不清"哪里不对"的结果。

M01 的 TOKENS.md 里确实写了"改完请重新核对比度"之类的提醒，**但提醒不是机制**。这是本层最需要修的一处（见 §8 建议 2）。

---

## 4. 占位标记 vs 假数据

### 4.1 结论：`【换成你的：…】` 明显更好，而且有规范背书

**NN/g 的立场（反对 lorem ipsum）：**

> "placeholder content (especially the notorious lorem ipsum) can be a **barrier to gathering insightful feedback** from users and stakeholders. I have personally experienced **derailed usability testing sessions** because my placeholders provoked unintentional confusion and doubt in my participants."
> "In UX, remember that **the content inspires feedback, not the container.**"
> —— [NN/g: Promptframes](https://www.nngroup.com/articles/promptframes/)

该文摘要直接写：**"Never use lorem ipsum again."**

**Webflow 的审核条款（双向约束，这是最有力的一条）：**

> "All copy/text should use unique, relevant wording based on the website type and **avoid placeholder text like 'lorem ipsum'** for headings, paragraphs etc."
> —— [Webflow: Submission Requirements → Typography](https://webflow.com/templates/submission-guidelines)

同时，Webflow 又**要求** CMS 里放"看起来真"的假数据：

> "Collections should have at least 3 items and a maximum of 7 items per collection **with realistic dummy content**."
> —— 同上，CMS Structure 节

**这两条合起来给出的行业答案是**：
- ❌ Lorem ipsum（无意义拉丁文）——**明确禁止**
- ✅ Realistic dummy content（像真的假数据，如"XX 咖啡·静安店"）——**要求**
- ✅ 本层的 `【换成你的：公司名】`——**第三种，也是更强的第三种**

为什么更强：它同时具备"**像真的**"（给了写作提示："一句话业务定位，60 字以内，会出现在搜索结果里"）和"**明显是待填的**"（不会被误当成终稿上线）。

### 4.2 这个设计好在哪：它把"内容策略"嵌进了标记

对比三种占位：

| 方案 | 用户看到 | 会不会被原样上线 | 会不会卡住用户 |
|---|---|---|---|
| `Lorem ipsum dolor` | 看不懂的拉丁文 | 低（太假） | **高**（不知道该写什么、写多长） |
| `John Doe / 张三` | 像真的 | **高**（很容易忘了改） | 低（但也没告诉他写什么） |
| `【换成你的：公司名】` | 明显待填 + 有提示 | 低 | 低 |

M01 的标记里带**篇幅约束**，这是最值钱的部分：

> `【换成你的：两三句公司介绍。谁在用你的服务、你交付什么、客户为什么选你。保持 2–3 行的长度最好看，太长会把按钮挤到屏幕外面。】`

这一条同时解决了"写什么"和"写多少"——后者是排版崩版的直接原因。**这一点比大多数商业模板做得好。**

### 4.3 但有一个反证：标记太多会变成负担

`[实测]` 可见标记数：**M01 = 84，M02 = 75，M03 = 30**。

M01 的 README 用"全站共 84 处标记"来**强调完整性**，但对目标用户这是**劝退数字**。一个店主看到"84 处"，合理的反应是关掉文件去找建站平台。

M02 的 README 里其实写了正确做法——**分级**：

> "**价格和营业时间现在是「示例值」，不是占位标记**（比如菜价 ¥38、周一至周四 11:00–21:30）。这样做的原因：价目表必须排成一张真能读的价目表… **请把示例值也一并替换掉**。"

M02 混用了"标记"和"示例值"两种占位，**这是对的方向**，但没有在开头告诉用户"你其实只需要先改 8 处就能上线，其余可以慢慢来"。M03 做对了这件事：README 标题就是「**先改这 7 处文案**」。

---

## 5. 上线流程的最短路径（2025–2026）

> ⚠️ 本节政策均为 **2026-10-26** 快照。平台额度改动频繁，使用前请复核官方链接。

### 5.1 主表

| 平台 | 注册 | 命令行 | 拖拽 | 免费额度（关键数字） | 单文件上限 | 中国大陆可访问 | 能否绑自己域名 |
|---|---|---|---|---|---|---|---|
| **Netlify Drop** | **可先不注册**（未认领 1 小时后删除） | 不需要 | ✅ 拖文件夹/zip | 300 credits/月；**部署 15 credits/次**、带宽 20 credits/GB | 建议 <50MB 单文件 <10MB | ⚠️ 不稳定，无国内节点 | ✅ 免费支持 |
| **Vercel Drop** | **必须**（要选 team + 项目名） | 不需要 | ✅ 文件/文件夹/zip | 带宽 **100GB/月**、CDN 请求 100 万/月 | 浏览器上传，无硬限 | ⚠️ 不稳定 | ✅ |
| **Cloudflare Pages**（Direct Upload） | 必须 | 可选（Wrangler） | ✅ 拖文件夹/zip，**限 1000 文件** | **静态资源请求免费且无限**；100 项目；文件 20,000（CLI）/1,000（拖拽） | **25 MiB** | ⚠️ 不稳定 | ✅ 免费 |
| **GitHub Pages** | 必须（+ Git 操作） | **需要**（或网页逐个上传） | ❌ | 仓库 1GB / 站点 1GB / 带宽 100GB/月（软限） | 仓库建议 <1GB | ⚠️ 不稳定，常被墙 | ✅（需 CNAME） |
| **EdgeOne Makers Drop** | 中国境内**必须注册**（否则链接仅 1 小时） | 不需要 | ✅ 拖文件/文件夹 | 免费版永久；**超出配额不中断服务**（官方 FAQ） | **25MB** | ✅ **有国内节点** | ✅ 免费（自定义域名需 ICP 备案） |
| **腾讯云 CloudBase** | 必须（+ 实名） | 不需要 | ❌ 控制台上传 | 免费体验版 3000 资源点/月（需一次性兑换码） | — | ✅ 有国内节点 | ✅ **但必须 ICP 备案**，否则默认域名弹"访问提示中间页" |
| **阿里云 OSS** | 必须（+ 实名） | 不需要 | ❌ 控制台上传 | 按量计费，无长期免费额度 | 单对象 5GB | ✅ 有国内节点 | ✅ **但必须 ICP 备案**；**不绑域名则 HTML 被强制下载** |

**表格依据（逐条对应）**：
- Netlify 额度：[Netlify Pricing](https://www.netlify.com/pricing/)（Free：300 credit limit/month；Production deploys 15 credits each；Bandwidth 20 credits per GB）
- Netlify Drop 流程与匿名部署：[Netlify Drop Quickstart](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/)（"If you drop without signing in, your project URL is protected with a temporary password until you claim it"）
- 匿名站点 1 小时删除：[Vercel KB: Vercel Drop vs Netlify Drop](https://vercel.com/kb/guide/vercel-drop-vs-netlify-drop)（"Unclaimed sites are deleted within an hour"）
- Vercel 额度：[Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)（Fast Data Transfer First 100 GB；CDN Requests First 1,000,000；Projects 200）
- Vercel 商用限制：[Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)（"Hobby teams are restricted to **non-commercial personal use only**"）
- Cloudflare 额度与文件数：[Cloudflare Pages Limits](https://developers.cloudflare.com/pages/platform/limits/)（20,000 files Free；25 MiB max file）
- Cloudflare 拖拽 1000 文件上限：[Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)（Drag and drop：1,000 files）
- Cloudflare 静态请求免费：[Cloudflare Pages Pricing](https://developers.cloudflare.com/pages/functions/pricing/)（"On both free and paid plans, requests to static assets are **free and unlimited**"）
- GitHub Pages 额度：[GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)（1 GB 站点、100 GB/月软限、10 builds/hour）
- EdgeOne 免费与 25MB：[EdgeOne Makers 免费 HTML 托管](https://pages.edgeone.ai/zh/use-cases/free-html-hosting)（"单个文件最大支持 25MB"；"未注册时，部署成功后生成的访问链接仅 1 小时有效；注册后将永久保留。请注意，根据当地法律法规，**中国境内用户需注册并登录控制台**才能获取域名访问链接"）
- EdgeOne 超限不中断：[EdgeOne Makers 定价](https://pages.edgeone.ai/zh/pricing)（"在推出收费版之前，即使超出免费版的用量限制也不会中断服务"）
- CloudBase 中间页（关键风险）：[默认域名访问限制及中间页](https://docs.cloudbase.net/service/alias)（"用户通过浏览器直接访问的请求（Sec-Fetch-Mode 请求头的值为 navigate）将会展示**'访问提示中间页'**… 移除中间页的唯一合规途径是配置并使用自定义域名"；"自定义域名必须完成 **ICP 备案**"）
- CloudBase 免费额度：[资源点价格文档](https://cloud.tencent.com/document/product/876/127357)（免费体验版 3000 点/月，需一次性兑换码）
- 阿里云 OSS 强制下载（关键坑）：[OSS 静态网站托管](https://www.alibabacloud.com/help/zh/oss/user-guide/hosting-static-websites)（"使用 OSS Bucket 域名访问 HTML 文件时，出于安全考虑**浏览器会强制下载而非在线预览**。要实现网页正常浏览…需要绑定自定义域名…若 Bucket 位于中国内地，绑定的域名需要完成 **ICP 备案**"）

### 5.2 最短路径排名（按"一个普通人实际能走完"排序）

**🥇 第 1 名：EdgeOne Makers Drop —— 如果用户在中国大陆**

```
打开 pages.edgeone.ai/zh/drop → 拖入文件夹 → 注册登录 → 拿到 xxx.edgeone.app 链接
```
- 步骤数：**3 步**（拖 → 注册 → 复制链接）
- 免费、免命令行、有国内节点、**超配额不断服**
- **决定性的优点**：这是唯一一个"国内能直接打开、不需要先买域名+备案"的路径
- 缺点：单文件 25MB；未注册时链接只有 1 小时；要求注册是因为**法规**（官方 FAQ 明说）

**🥈 第 2 名：Netlify Drop —— 如果用户能接受境外托管**

```
app.netlify.com/drop → 拖入文件夹 → 拿链接（可不注册，1 小时内认领）
```
- 步骤数：**2 步**（拖 → 复制链接）
- **唯一能"先看到结果再决定要不要注册"的平台**，这对非技术用户的决策心理很关键
- 缺点：国内访问不稳定；免费额度按 credits 计（300/月，每次部署 15 credits，约 20 次部署/月）

**🥉 第 3 名：Cloudflare Pages Direct Upload**

```
dash.cloudflare.com → Workers & Pages → Create → Drag and drop → 拖文件夹
```
- **静态请求无限免费**是它最大的优势，长期最省心
- 缺点：必须先注册 Cloudflare 账号；拖拽限 1000 文件；控制台对非技术用户偏复杂

**第 4 名：GitHub Pages** —— **不推荐给目标用户**
- 需要理解 repo / branch / commit / Pages 设置，且官方为 404 写了一整页排障文档（见 §1.2b）
- 国内访问不稳定

**❌ 不推荐：阿里云 OSS**
- 不绑自定义域名 → **HTML 被强制下载**，根本不是"网页"
- 绑自定义域名 → 必须 ICP 备案（域名 + 主体，周期以周计）
- 对"我只有一个 HTML 文件想给人看"这个需求，这是最重的路径

**❌ 不推荐：腾讯云 CloudBase 默认域名**
- 浏览器访问会先弹"**访问提示中间页**"，访客要点"确定访问"才能进 —— 对一个要给客户看的官网，这是致命的
- 移除中间页唯一途径是绑已备案域名

### 5.3 一个必须说清的现实

**不存在"完全免费 + 绑自己域名 + 中国大陆长期稳定"的三全路径。** 三者只能取二：

| 想要 | 代价 |
|---|---|
| 免费 + 国内稳定 | 用平台子域名（`*.edgeone.app`），不能用自己的域名 |
| 免费 + 自己域名 | 境外托管（Netlify/Vercel/Cloudflare），国内访问不稳 |
| 自己域名 + 国内稳定 | 必须 ICP 备案（时间成本）+ 通常要付费 |

**这条应该写进模板的 README**，因为它决定了用户"拿走之后能不能真的上线"。

---

## 6. 模板层的验收标准：可直接抄的条款

### 6.1 Webflow（最具体、最可执行，推荐作为主参照）

来源：[Webflow Template Submission Requirements](https://webflow.com/templates/submission-guidelines) + [Template Grading Rubric](https://webflow.com/templates/grading-rubric)

**准入门槛**：必须"在 rubric 的所有项目上达到至少 **Good**"，且满足全部 submission requirements。**2 轮反馈后仍未达标即拒**。

**可直接抄的硬条款（原文摘录）：**

*内容与占位*
- "All copy/text should use unique, relevant wording based on the website type and **avoid placeholder text like 'lorem ipsum'** for headings, paragraphs etc."
- "All text must use correct spelling and grammar."

*变量与设计系统*
- "Define reusable style **Variables** for Colors (primary, secondary, background) / Typography (font families, sizes, weights) / Spacing (margins, paddings) / Brand specifics: Border radius, shadows, etc."
- "**Avoid turning one-off or rarely used values into Variables.**"
- "**Organize variables into purposeful groups.**"
- "Ramps should be ordered light-to-dark or small-to-large for quick scanning."
- "Limit stacked combo classes to 3-4 per element."
- "Clean up and remove unused styles and classes regularly."

*文档（这是与本任务最相关的一条）*
- "**Instructions Page** must be created at the slug /instructions **if advanced and complex interactions or hidden components are used**. This page should provide brief information on how to access and edit these components."
- "**Style Guide Page** must be created at the slug /style-guide and should include all tags (headings, paragraphs, links, buttons, etc)."
- "**License Page** must be created and have the slug set to /licenses."
- "Link the Style Guide, Licenses and Changelog pages from the footer or a utility navigation."

*图片与资源*
- "**Compress images to 150KB or less.** Submissions with larger images are blocked (SVGs and Webflow-generated video posters are exempt)."
- "Max file size: **4MB**"
- "The site's total weight should be **less than 10mb**."
- "Minify CSS."
- "To prevent layout shifts, explicit width and height attributes or aspect ratio boxes must be set for all images"
- "**Lazy-load** all below-the-fold images by default"
- "Nav logo must match the template name and **be an image file for easy replacement**."

*布局与响应式*
- "**All links/buttons must link somewhere- no empty links**"
- "Use **min-height** instead of height for sections, especially hero sections to allow content growth."
- "Layouts must be **fluid and responsive across all viewports**."
- "Use **fluid units instead of absolute units like pixels**. It is a best practice to use **REM units for typography**"
- "Maintain consistent spacings, avoid crammed or cluttered layouts."

*可访问性*
- "Ensure all elements meet **WCAG color contrast**, ensure contrast compliance for focus, hover, active states. Check contrast for text, borders, icons, and overlays."
- "Use clear, logical heading order with **one H1 per page**. Headings H1-H6 must follow a serial hierarchy **without skipped levels**."
- "Use **semantic HTML tags** and custom ARIA roles/labels as needed."
- "**Add alt text** for important images; mark decorative images correctly."
- "**Avoid autoplaying media.**"

*自定义代码（对本层有直接约束力）*
- "Custom code… **is not allowed** in Templates, except for: GSAP Custom Code / The Webflow Way Validator snippet / Font smoothing / no-index on Licenses & Changelog / **SVGs - If you're using SVG's code it is required to add an Instructions page** to the template with clear guidelines about how to use it."

> ⚠️ 注意最后这条：Webflow 要求"用了 SVG 代码就必须配说明页"。**本层三个模板全部重度使用内联 SVG 占位框，按 Webflow 口径必须配说明页**——M01/M02/M03 的 README 确实有"换图"章节，这条是达标的。

**Rubric 的量化档位（"Good" 档要求，可当验收线）：**

| 维度 | Good 档的具体门槛 |
|---|---|
| SEO | PageSpeed Insights SEO **70–90** |
| Performance | PageSpeed Performance **51–70** |
| Best Practices | **51–70** |
| Accessibility | PageSpeed Accessibility **70–90**，且"high legibility, passing contrast ratios" |
| Responsive | "fully responsive with **no more than 2 bugs** to resolve on different screen sizes" |

### 6.2 ThemeForest（官方页面被反爬拦住，只能用二手来源，标注清楚）

`help.author.envato.com` 的官方条款页返回 **HTTP 403**（Cloudflare 人机校验），我**无法直接引用原文**。以下来自两个第三方整理，**可信度低于 Webflow 那节**，仅作补充：

来源：[WebLayner 审核清单](https://weblayner.com/blog/themes/2019-06-09-chek-list-html-shablona-pered-otpravkoj-na-themeforest-templatemonster.html) / [HackerNoon: How to publish your HTML template on Themeforest](https://hackernoon.com/lite/how-to-publish-your-html-or-wordpress-website-template-on-themeforest-a9844a04deda)

- **必须有文档**："Themeforest doesn't approve any templates for sale without it"（无文档必拒）。文档需覆盖：如何上传到主机、如何配置联系表单、如何换图标、所有引用出处、支持链接
- **图片必须换成 placeholder**："обязательно замените все изображения на плейсхолдеры"（提交前必须把所有图片换成占位图）
- **HTML 必须通过校验**（可用 Validity 扩展；Google Fonts 多字体引入的报错是唯一例外）
- **禁止 inline CSS**
- **必须响应式**
- **必须有 Demo URL**："Themeforest doesn't approve HTML and Wordpress templates for sale without it"
- **文档的目的是减少支持请求**（原文见 §1.2a）

### 6.3 对照：本层三个模板的验收结果

| 验收项（来源） | M01 | M02 | M03 | 备注 |
|---|---|---|---|---|
| 不用 lorem ipsum（Webflow） | ✅ | ✅ | ✅ | |
| 有真实可用的写作提示（NN/g 精神） | ✅ 优秀 | ✅ 优秀 | ✅ 优秀 | 标记里带篇幅/写法约束 |
| 变量分组、命名可读（Webflow） | ✅ | ✅ | ✅ | |
| 无一次性变量（Webflow） | ✅ | ✅ | ✅ | 12 个全部被引用 |
| 响应式无横向溢出（Webflow） | ✅ `[实测]` | ✅ `[实测]` | ✅ `[实测]` | 390px & 1280px |
| 图片有 width/height（Webflow） | ✅ | ✅ 内联 SVG 自带 viewBox | ✅ | 防 CLS |
| 每个链接都有去处（Webflow） | ✅ | ⚠️ | ✅ | `[实测]` href 总数：M01 33（裸 `#` **0**、`#锚点` 24、mailto 4、tel 4）；M02 37（裸 `#` **4**、`#锚点` 29、tel 3）；M03 7（裸 `#` **0**、`#锚点` 5、mailto 1）。**仅 M02 有 4 个裸 `#` 需修** |
| 无 autoplay media（Webflow） | ✅ | ✅ | ✅ | 零 JS 库 |
| 用 rem 而非 px（Webflow 建议） | ✅ | ✅ | ✅ | |
| 有换图说明页（Webflow 对 SVG 的要求） | ✅ | ✅ | ✅ | |
| **文件总量 <10MB**（Webflow） | ✅ 78KB | ✅ 85KB | ✅ 50KB | 远低于限 |
| 对比度达标（Webflow/WCAG） | ✅ 算过 | ✅ 算过 | ✅ 算过 | 但**换色后会破**，见 §3.3 |
| **文档能让人独立上线**（ThemeForest 核心要求） | ❌ | ❌ | ❌ | 见 §7 |

---

## 7. 文档层的三处硬伤（实测发现，可直接修）

这三条是本报告的原始发现，不在任何检索结果里。

### 7.1 M01：README 给的行号是错的

- **README 原文**："**改颜色**：打开 `style.css`，只改第 **15–30** 行那一组变量。"
- **实际**：`[实测]` `:root` 在 **10–29** 行；`--brand` / `--brand-ink` / `--brand-soft`（**三个品牌色**）在 **12–14 行**；15–30 行从 `--ink` 开始，**恰好把品牌色排除在外**。
- **后果**：用户照着改，改的是文字色和圆角，**唯一真正想改的品牌色一个都没动**。这是"照着说明做反而失败"的最坏情况。
- **修法**：改成"`:root` 在**第 10–29 行**，其中**第 12–14 行是三个品牌色**，想换主色只改这三行"。

### 7.2 三个 README 都把"上线"压缩成了一句话

| 模板 | 上线相关文字 | 问题 |
|---|---|---|
| M01 | "把 `index.html` 和 `style.css` 两个文件上传到任何静态空间（GitHub Pages、对象存储、服务器上的 Nginx 目录）即可" | "静态空间""对象存储""Nginx 目录"三个词对目标用户全是黑话；没有 URL、没有步骤、没有"拖进去" |
| M02 | "上传这两个文件 放同一个目录即可" | 上到哪？怎么上？ |
| M03 | 只说"能上线"，无步骤 | — |

对照 §5：**最短路径是 3 步、有确定的 URL、不需要命令行**。这段完全可以写成可执行的：

```
想让人看到？3 步，不要钱：
1. 打开 https://pages.edgeone.ai/zh/drop
2. 把整个文件夹拖进去
3. 注册一下，复制给你的链接，发给客户
```

### 7.3 数字自称与实际不一致（会削弱信任）

| 模板 | README 自称 | `[实测]` 实际 | 差异性质 |
|---|---|---|---|
| M01 | "全站共 **84 处**标记" | 84 处可见 + 2 处在 HTML 注释里 = 86 | ✅ **口径一致，准确** |
| M03 | "一共 **32 处**" | 33 处（含 head 内 2 处、属性内 1 处）、可见 30 处 | ⚠️ 差 1，口径不明 |
| M02 | "换域名后记得改 **3 处**" | 与总数无关的另一口径 | ✅ 不冲突 |
| M02 | 变量"这 **12** 个" | `:root` 里 12 个，但 `--ring`（焦点色）在 298/448 行另定义 | ⚠️ 实际有 13 个颜色值可改，文档未提 |

这类偏差单独看不起眼，但**它们是"文档可信度"的锚点**：如果 84 这个数字是准的，用户会信任其余内容；如果 32 对不上，用户会开始怀疑所有说明。

---

## 8. 六条可执行改进建议

> 排序依据：**对非技术用户的实际帮助**，不按工程量。第 1 条改完，能上线的人可能翻倍；第 6 条只影响观感。

### 建议 1（最高优先级）：把"上线"从一句话扩成"3 步、带 URL、免命令行"的可执行段

**问题**：三份 README 里，上线说明合计不到 40 字，且全是黑话。这是"拿走之后能不能真的上线"的唯一决定因素。
**做法**：
1. 在每份 README 的**第 1 节**（不是附录）加一个"### 想让人看到？3 步"：
   ```
   1. 打开 https://pages.edgeone.ai/zh/drop      ← 国内可用，免费
   2. 把整个模板文件夹拖进网页
   3. 注册并登录（中国境内必须，法规要求），复制链接
   ```
2. 紧跟一行"**如果打不开或想要自己的域名**" → 简要指向 Netlify Drop / Cloudflare Pages（境内访问不稳，需说明）。
3. 明确写一句风险提示："**免费的都不带自己的域名**；要 `www.你的名字.com` 就得买域名 + 备案，这一步要几周。"
**为什么排第一**：这一步失败，前面所有工作归零。**这正是 §5 的结论，也是三个模板当前最大的缺口。**

### 建议 2：修 M01 的行号错误，并把"变量耦合"从文字提醒变成可见机制

**问题**：README 说"改 15–30 行"，实际品牌色在 12–14 行（§7.1）。更根本的是 `--brand` / `--brand-ink` / `--brand-soft` 三个变量必须联动改，但文档只是"提醒"（§3.3）。
**做法**：
1. 把行号改正为"**第 10–29 行，其中 12–14 行是三个品牌色**"。
2. **在 CSS 里就把耦合关系写成注释块**，让三个值物理相邻：
   ```css
   /* ⚠️ 这三个要一起改。只改 --brand 会出现新旧两个品牌色 */
   --brand:      #1B3A5C;
   --brand-ink:  #12283F;   /* 建议 = --brand 加深 20% */
   --brand-soft: #EAF1F8;   /* 建议 = --brand 淡化到 8% */
   ```
3. 在 TOKENS.md 里为每个"配方"给出**三个值一组的整段替换块**（一次复制粘贴搞定），而不是逐个变量说明。
**为什么排第二**：这是唯一一处"照着文档做**必然**做错"的地方，修复成本几乎为零。

### 建议 3：给"改完之后"一个自检动作：让用户可以自己发现"改坏了"

**问题**：`[实测]` 图片路径写错时页面**静默失败**（只显示 alt 文字）；换色后对比度破了也**没有任何提示**。非技术用户不缺"改"的能力，缺"判断改对了没有"的能力。
**做法**（零依赖、不违反"两个文件"约束）：
1. 在 README 里加一个"**改完检查这 5 条**"清单，每条都是肉眼可判断的：
   - 页面上还有没有残留的 `【换成你的`？（用 Ctrl+F 搜一次，应当 0 结果）
   - 有没有出现"文字变成了 alt 描述"的灰框？（= 图片路径错了）
   - 主色换了之后，图标底色是不是还是旧的蓝/褐色？（= 联动变量没改）
   - 手机上左右滑一下，有没有横向滚动条？
   - 浏览器标签页上的标题，是不是你的名字？
2. 在 `style.css` 的 `:root` 上方加一行醒目注释："**改完请打开 README 的「改完检查这 5 条」**"。
**为什么排第三**：它把"我不知道哪里错了"变成"我知道该看哪 5 个地方"，直接减少放弃率，且**零工程量**。

### 建议 4：给标记分级——先给一条"15 分钟能上线"的最短路径

**问题**：M01 有 84 处标记，README 让用户"一个一个替换"。**这个数字本身就是劝退信号**（§4.3）。
**做法**：
1. 在 README 开头加一张"**只改这 8 处就能上线**"的表（M03 已经这么做了，标题就是「先改这 7 处」）：
   - `<title>` 标签、品牌名、主标题、一句业务定位、主按钮文字、联系方式、页脚版权、备案号
2. 其余 76 处明确标注"**可以以后再改，不改也不影响上线**"。
3. 把"全站共 84 处"改成"8 处必改 + 76 处可选"。
**为什么排第四**：同样的工作量，**换个说法就能把"劝退"变成"可完成"**。M03 已经验证了这个模式有效。

### 建议 5：M02 的表单要有一个"没接后端"的显式提示

**问题**：`[实测]` `<form action="#" method="post">`，纯静态。用户填完点提交，页面刷新回到原处，**没有任何反馈**。店主很可能以为"表单坏了"，或者更糟——**以为收到了订位**。
**做法**：在表单下方加一行常驻小字（不是注释，是可见文字）：
```html
<p class="form-note">⚠️ 这个表单还没接邮箱/后台，现在提交不会发给你。
接法见 README 第 6 节（约 5 分钟）。</p>
```
并在 README 第 6 节给出**一个"最省事的接法"**（例如 Formspree / 腾讯问卷 的免费方案），而不是只讲原理。
**为什么排第五**：这关系到"用户会不会漏掉真实订单"，但因为模板本身是演示性质，优先级低于上线与自检。

### 建议 6：统一数字口径，让文档可信

**问题**：§7.3 —— M03 自称 32 处、实测 33 处；M02 称 12 个变量，实际 `--ring` 另算。
**做法**：明确标注统计口径（"可见文字中 30 处 + 属性 3 处 = 33 处"），或直接改成不依赖精确计数的表述（"约 30 处"）。同时把 `--ring` 补进 TOKENS.md。
**为什么排最后**：影响的是"信任度"而非"能否完成"，但**成本极低，顺手就做**。

---

## 附录 A：实测数据可复现清单

所有实测脚本与输出在 `deliverables/61-research/_lab/`：

| 文件 | 内容 |
|---|---|
| `probe.html` + `probe-*.{js,css,json,png,ttf}` | `file://` vs `http://` 能力对照探针（CSS 变量 / 内联 SVG / 相对图片 / @font-face / fetch / module / localStorage） |
| `dom-file.txt` / `dom-http.txt` / `edge-file.txt` | 上述探针在 Chrome 156 `file://`、Chrome 156 `http://`、Edge 155 `file://` 的完整输出 |
| `template-probe.js` | 注入式模板体检脚本（溢出、SVG 数、变量解析、断图数、标记数、最小点击区） |
| `dom2-M01/M02/M03.txt` | 三个模板 1280×900 下的完整体检输出 |
| `mob-M01/M02/M03.txt` | 三个模板 390×844 下的溢出与点击区输出 |
| `fontcheck.html` / `fc.txt` | 本地 `@font-face` 是否真加载（用字宽差判据） |
| `cjk3.txt` | 中文文件名图片在 `file://` 下能否加载 |
| `miss2.txt` | 图片路径写错时的静默失败验证（`naturalWidth=0, complete=true`） |
| `server.js` | 本地 HTTP 静态服务器（用于 `http://` 对照组） |

**复现命令**（Chrome headless）：
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu `
  --user-data-dir="$env:TEMP\probe" --virtual-time-budget=8000 --dump-dom `
  "file:///D:/Web/style/deliverables/61-research/_lab/probe.html"
```

**环境**：Windows，Chrome 156.0.8078.47，Edge 155.0.4283.62，`[实测]` 日期 2026-10-26。

---

## 附录 B：明确"找不到"的项

为免误导，以下是我**没有找到**的，不做推测性填充：

1. **"非技术用户拿到 HTML 模板后的分步失败率"** —— 无任何平台或研究机构公开此数据。
2. **"普通人会不会去改 CSS 变量"的行为数据** —— 无。StackScan 的插件安装量只能证明"改主题"需求存在，不能证明改法。
3. **ThemeForest 现行官方审核条款原文** —— `help.author.envato.com` 返回 403（Cloudflare 人机校验），仅能引用第三方整理（已标注可信度较低）。
4. **Squarespace / Wix 的模板质量规范** —— 检索未发现公开的、条款化的模板验收文档；两者均不开放第三方模板提交，因而不存在同类审核标准。
5. **"暴露 N 个变量是有效做法"的对照实验** —— 无。Webflow 的条款是**规范性要求**（"应该这样做"），不是**有效性证明**（"这样做有效果"）。这两者的差别在 §3.1 已说明。

---

*报告完成：2026-10-26。所有平台政策请在使用前复核官方链接。*
