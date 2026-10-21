[English](README-EN.md) | 简体中文

> ⚠️ **这不是一套可以直接上线的成品站，也不是一个设计系统。** 它是一个**风格标本库**：30 个互不相同、各有性格的设计方案各自配一个可运行原型，外加 **3 个大众化模板**（拿来就能用）与**一张选型台 + 一个选型向导**（帮你从 30 个里挑）。纯静态，不需要构建，不需要后端。

# 网站设计风格图集

30 个网站设计风格方案，每个都配一个**可直接打开、可运行的真实 HTML/CSS 原型**；另有 3 个**大众化模板**（自包含、改几个变量就能变成你自己的站）；全部收进**一张可筛选的选型台**与**一个五问选型向导**。

## 功能特性

**内容**

- **30 个设计方案** —— 每个是一个完整的**设计主张**而不是配色皮肤：12 个字段涵盖一句话视觉定义、美学家族与参考、配色系统（带面积比与情绪）、字体策略、布局与网格（含三档断点行为）、关键视觉元素、动效与交互（含降级路径）、去 AI 味审查点、风险与规避、适用场景（附"不适合"）、可落地要点（含性能预算）、以及一处**设计师签名式怪癖**
- **30 个可运行原型** —— 真排版、真文案、真素材、真错误状态、真 `prefers-reduced-motion` 降级；**26 个闸门 FAIL=0**，271 张渲染截图
- **F 型 15 / R 型 15** —— F 型是有固定骨架的结构（访客 3 秒内知道先看哪、点哪），R 型是"机制驱动"的结构（靠一个物理机制组织内容）；30 个美学家族**互不重复**
- **3 个大众化模板** —— 见下节。它们是**独立的一层**，规则与 30 案不同，且把豁免范围写进了各自的 README

**浏览与挑选**

- **选型台**（`prototypes/_selection/`）—— 30 个案摊在一页：每行给出结构类型／认知门槛／调性、一句话定义、配色色块、错误码、闸门结果，以及**桌面 1440／平板 768／手机 390 三档真实渲染截图**。可筛选、可搜索、可排序，点行展开 12 字段全文与整页可翻页大图，`#S07` 可深链分享
- **选型向导**（`prototypes/_selection/wizard.html`）—— 五个问题问的是**你的处境**而不是"你喜欢什么风格"。输出 **3 个推荐 + 3 个明确排除**，每条的"为什么"都读**实测值**（正文字数、真实图片张数、调色板最高饱和度、声明门槛、调性合成的记忆点代理值），不替方案打主观分。支持带答案链接回放（`?load=2&img=2&loud=2&guide=0&fear=2`）
- **键盘可用** —— 选型台上 `J`/`K` 换方案、`1`/`2`/`3` 切视口、`/` 定位搜索框、`Esc` 收起

**工具链（都在 `prototypes/_build/`，纯 Node + Python，无 npm 依赖）**

- **`render-scheme.mjs`** —— 渲染一个原型并打印闸门结果（三档视口真实截图）
- **`verify-prototype.mjs`** —— 机械复核：远程资源、禁用字体栈、Emoji、断链图、真实图片数、横向溢出、闸门计数
- **`shot.mjs` + `shot-page.py`** —— **零依赖截图取证工具**（不依赖任何第三方设计工具、不使用 CDP）：整页长图 + 按视口切片 + 逐屏像素统计（主色占比、平均亮度、空白屏识别）
- **`fetch-fonts.mjs` / `selfhost-fonts.mjs`** —— 把字体抓成自托管，并把页面里的外链字体换成自托管
- **`assign-assets.mjs` / `make-textures.py`** —— 素材兜底（从已有语料按题材交叉分配真实照片）与 **14 个确定性纹理生成器**（参数落盘可逐字节复算）
- **`collect-schemes.mjs` / `summarize-all.mjs`** —— 给选型台生成 `data.js`、汇总全库渲染报告

## 3 个大众化模板（`templates/`）

三个模板都是**两文件即可运行**（`index.html` + `style.css`），**零外部依赖**：没有图片文件、没有 JS 库、没有 CDN、没有构建步骤。图片位置用**内联 SVG 占位框**（灰阶、带比例与建议像素），文案用**占位标记** `【换成你的：…】`——你一搜就知道该填哪里。字体走**系统字体栈**，任何机器立刻正确显示、不跳字。

| 模板 | 定位 | 观感 | 换肤 |
| --- | --- | --- | --- |
| **M01 清爽企业站** | 专业服务型公司：律所、咨询、软件服务、设计工作室、代理商 | 白底 + 深靛蓝主色 + 无衬线，干净可信 | 12 个 CSS 变量，含 3 个算过对比度的换肤配方（砖红／墨绿／炭黑） |
| **M02 暖调门店站** | 本地实体店铺：餐厅、咖啡馆、烘焙、民宿、理发、花店 | 米白底 + 深暖褐主色，**标题衬线 + 正文无衬线**，大图优先 | 12 个 CSS 变量 |
| **M03 醒目作品集** | 个人作品集、自由职业者、小型创意工作室、摄影师、设计师 | 近黑底 + 近白字 + 单一橙，**字很大**，靠排版纪律 | 12 个 CSS 变量 |

每个模板四个文件：

```
templates/M01-clean-corporate/
├── index.html     完整可用，含占位标记与语义标签
├── style.css      顶部集中 12 个 CSS 变量，改这几个就能换色换宽
├── README.md      给不会写代码的人看：怎么打开、改哪几个变量、怎么换文案换图、本层豁免了哪些条款及理由
└── TOKENS.md      12 个变量逐个说明（作用／默认值／改成什么会怎样）
```

> **为什么这一层的规则和 30 案不同？** 30 案受一份严格的"反 AI 味"规格约束，明令禁止居中大标题＋三张等宽卡片＋底部 CTA、白／浅灰 section 交替、纯白底＋纯黑字＋单一强调色、圆角浮起卡片、`Inter`/`system-ui` 作主字体、紫蓝渐变、毛玻璃吸顶导航。**而这些禁令恰好就是"大众模板"的构成要件。** 所以本层**明示豁免**它们——口径分清：**30 案那层的目标是被记住，这一层的目标是不犯错、拿起来就能用。** 每份 README 都逐条写了豁免范围与**用途级**理由（不是"因为大众"），并列出仍然守住的条款（`box-shadow` 0、`gradient` 0、`backdrop-filter` 0、Emoji 0、无空洞营销词）。

## 快速开始

整个仓库是**纯静态**的：没有后端、没有构建、没有依赖安装。唯一要求是**通过 HTTP 打开**而不是双击文件（原型的字体与截图用相对路径，`file://` 下部分浏览器会拦）。

```bash
# 任选一种
npx serve .                          # Node（不用先装，npx 会临时拉）
python -m http.server 8080           # Python 3
php -S localhost:8080                # PHP
```

然后打开：

```
http://localhost:8080/prototypes/_selection/          # 选型台（总入口）
http://localhost:8080/prototypes/_selection/wizard.html  # 选型向导
http://localhost:8080/templates/M01-clean-corporate/  # 一个大众模板
http://localhost:8080/prototypes/S14-zero-g-launch-sequence/  # 一个原型
```

> **仓库约 180 MB**（照片、渲染截图、自托管字体），建议浅克隆：`git clone --depth 1 <仓库地址>`
> 只想看截图不想克隆，直接在 GitHub 网页上浏览 `prototypes/<方案>/` 即可。

## 部署指南

**任何静态托管都能直接用，不需要任何配置或环境变量。站点根目录就是仓库根目录。**

### 阶段 1：推到自己的仓库

```bash
git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
cd web-style-atlas
git remote set-url origin https://github.com/<你的用户名>/<你的仓库名>.git
git push -u origin main
```

### 阶段 2：开 Pages

仓库页面 **Settings → Pages** → **Source** 选 `Deploy from a branch` → **Branch** 选 `main`、目录选 `/ (root)` → 保存。一两分钟后访问 `https://<用户名>.github.io/<仓库名>/`。根目录的 `index.html` 会自动跳到选型台。

命令行等价写法：

```bash
gh api -X POST repos/:owner/:repo/pages -f 'source[branch]=main' -f 'source[path]=/'
```

> **必须保留根目录的 `.nojekyll`。** Pages 默认用 Jekyll 构建，而 **Jekyll 会丢掉所有下划线开头的目录**——本站内容恰好全在 `prototypes/_selection/`、`_fonts/`、`_specs/`、`_build/` 里。删掉它整站会 404。

### 阶段 3：其他托管

| 平台 | Build command | Output / Publish directory | 环境变量 |
| --- | --- | --- | --- |
| Cloudflare Pages | **留空** | 仓库根目录 `/` | 无 |
| Netlify | **留空** | 仓库根目录 | 无 |
| Vercel | **留空** | 仓库根目录 | 无 |
| Nginx / Caddy / Apache | —— | 把仓库放到站点根目录 | 无 |

给字体与图片配长缓存（可选）：

```nginx
location ~* \.(woff2|jpg|jpeg|png|webp)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 阶段 4：只想取用某一个原型

每个 `prototypes/<方案目录>/` 是**自包含**的（`index.html` + `style.css` + `assets/`）。要让它独立跑起来，需**一并带上 `prototypes/_fonts/`**，因为它引用 `../_fonts/css/*.css`。把这两部分放进同一个父目录即可。

**大众模板（`templates/M0x/`）没有这个限制**——它们用系统字体栈，复制一个目录走就能用。

## 渲染与验收

```bash
# 渲染一个原型：三档视口真实截图 + 闸门结果
node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence

# 机械复核（不带参数则复核全部）
node prototypes/_build/verify-prototype.mjs --all

# 零依赖截图取证：整页 + 逐屏切片 + 像素统计
node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ --out .shots --widths 1440,768,390 --name S14
```

⚠️ **一条会骗到你的坑**：`chrome --headless=new --window-size=390,844` **不是 390 视口**。Windows 上 Chrome 有**最小窗口宽约 500 CSS px**，布局按 500 走、截图按 390 宽输出，你拿到的是 **500px 布局的左侧裁切**——于是会看到"文字被截断""汉堡菜单不见了"这种**假故障**。`--window-size=768,1024` 实际 `innerWidth` 也只有 752。

**窄档验收请用上面的 `shot.mjs`**（390 档它用 iframe 造视口）或任何走 CDP `Emulation.setDeviceMetricsOverride` 的工具；1440 档用 `--window-size` 没问题。

## 授权与署名

三部分许可不同，请分别对待：

| 内容 | 许可 |
| --- | --- |
| **本仓库的代码与文档**（`index.html` / `style.css` / `app.js` / `templates/` / `_build/` 脚本 / `deliverables/` / README） | **MIT**，见 [LICENSE](LICENSE) |
| **字体**（`prototypes/_fonts/`） | 各字体原有许可，绝大多数为 **SIL OFL 1.1**（Noto / IBM Plex / Archivo / Oswald / Syne / Space Mono 等）。来源与许可见 `_fonts/css/*.css` 文件头注释 |
| **照片**（各原型 `assets/`） | **第三方素材，不由本仓库授权**。多为 Wikimedia Commons 的 **CC BY / CC BY-SA / CC0 / 公有领域**，另有部分 **NASA 图像**（公有领域） |

**每一张照片的作者、许可与原件链接都逐张列在各原型的 `assets/CREDITS.md` 里。** 复用前请按表核对并遵守其许可（CC BY / CC BY-SA 要求署名，部分还要求以相同方式共享）。

**程序化纹理不是照片**：由 `_build/make-textures.py` 生成，参数落盘（`build/texture-job.json`）可逐字节复算，无第三方权利。

**大众模板不含任何第三方素材**——图片位是内联 SVG 占位框，没有授权问题。

## 依赖

- 浏览与部署：**无**（纯静态）
- 渲染与复核工具：Node.js 18+、Python 3.8+（Pillow）、Google Chrome
- **不使用**任何第三方设计审查工具；`prototypes/_build/shot.mjs` 完全零依赖

## 已知缺口

- **四个旧原型仍有闸门 FAIL**：`S13`（`empty-screens`，内容偏薄）与 `S21`（只剩 `mono`）——`S21` 那两条 `few-pictures` / `empty-screens` **已修**（接上了它自己 `assets/_cand/` 里 28 张对题照片中的 6 张，真实图片 0 → 6）；`S07` 的等宽数字槽与 `S08` 的琥珀主色是**已知豁免**（那两条规则与中文站／该案材质本来就冲突，理由见 `prototypes/_CONTRACT.md` §9.15）
- **底色同质是真的**：**18 / 30 = 60% 落在"暖浅色带"**（判据 `色相 28–72° 且 明度 ≥78`）。另有两条比百分比更说明问题的：**12 个案子（40%）的底色在 ΔE76≤5 内连成单一连通块**（链上最大单步 4.39），以及 **83% 的案子首屏没有导航链接、97% 圆角为 0**。见 [deliverables/29-critique-homogeneity.md](deliverables/29-critique-homogeneity.md)
  > ⚠️ **报同质数字必须附判据。** 本项目在这件事上混用过 **17% / 60% / 73%** 三个数——它们分别测"最严纸族""暖浅底""含主色暖倾向"，**分母还差 4 案**；而"近同对 12 严 / 22 宽"来自**先把色相与明度取整再比**，连续值直接比只有 8 / 17。三个数的来历已由审查员逐条复原，见 [deliverables/29](deliverables/29-critique-homogeneity.md) §1。
- **底色之外还有两条同质**：`tone` 七个词里**"很安静"只有 2 案**、"就要扎眼"19 案（63%）；色相 36 个 10° 桶只用了 11 个，**紫→品红连续 110° 全空**，明度 **20–60 整段 0 案**。也就是说：**用户能用的筛选维度（内容量、复杂度）恰好都是缩略图上看不见的维度。**
- **题材缺口**：`S28「爵士凹版墙」`的可用语料里没有爵士唱片本身，只能用唱片机与印刷素材顶上；`S22`、`S23` 有类似妥协。都写进了对应原型的 `CREDITS.md`
- **`#888888` 灰块专属于 `inspect.mjs` 链路**：少数 `.inspect/` 里的桌面滚动截图会出现大片精确中性灰（S08 的 `desktop-page-03` 占 49.86%、S17 的 `desktop-page-01` 占 24.27%）。**那是 `inspect.mjs` 自己滚动拼接的缺陷，不是页面真有灰**——已定性于 `deliverables/16-render-look-audit.md`。**旁证**：一次独立审查对 246 张用 `shot.mjs`／裸 CDP／Pillow 这条链路产出的 PNG 做了全量扫描，**无一张该灰占比超过 2%**（最高 0.236%，是页面抗锯齿边缘）。所以它不出现于其他截图方式。
- **`measure` 这条规则对中文是假阳性**：它按 0.5em 估算字符宽，而汉字约 1.0em，**报数除以 2 才是真实汉字数**
- **`file://` 下 CSS `mask-image: url(...)` 会整体失效**（CORS 拒绝 → 全透明）。受影响的是 `S04` 与 `S07`：**双击 `index.html` 会让它们的纸块与书口毛边变成一整面空白**——比页面本身的任何缺陷都严重，而且**看起来像页面坏了**。同一页面同一尺寸的 http/file 对照实测：该区域 **5818 种颜色 vs 2 种颜色**。**这就是为什么本仓库要求通过 HTTP 打开**，不是风格建议而是功能前提。
- 少数原型的 `index.html` 在 30–45 KB，超过内部施工规范的目标区间。中文正文本身占字节就大（四千多汉字约 14 KB），压下去只能删内容

## 目录结构

```
.
├── index.html                  # 跳转到选型台（给静态托管当入口）
├── README.md / README-EN.md    # 中英双语，逐节对译
├── LICENSE
├── .nojekyll                   # 必须保留（见部署阶段 2）
├── templates/                  # ★ 3 个大众化模板（M01 / M02 / M03）
├── prototypes/
│   ├── _selection/             # ★ 选型台 + 选型向导
│   ├── _fonts/                 # 自托管字体（46 个样式表 + woff2 分片）
│   ├── _specs/                 # 每案 12 字段原文 + _CURRENT-VALUES.md（当前有效值权威来源）
│   ├── _build/                 # 全部工具脚本 + _CONTRACT.md（施工规范）
│   └── S01-… S30-…/            # 30 个原型（index.html + style.css + assets/ + .inspect/）
└── deliverables/                # 从约束简报、研究简报、规则法典到审查记录的完整文档链
```

**`_specs/Sxx.md` 是修正前的原文**；当前有效的色值／字体／错误码以 **`_specs/_CURRENT-VALUES.md`** 为准——跨越若干轮审查后有二十多处背景色、主色和字体被替换过。
