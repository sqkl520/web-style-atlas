<sub>🌐 <b>中文</b> · <a href="README-EN.md">English</a></sub>

<div align="center">

# 网站设计风格图集

> *「30 个能跑的风格，不是 30 张配色图。」*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Schemes: 30](https://img.shields.io/badge/Schemes-30-blue)](#仓库里有什么)
[![Build: none](https://img.shields.io/badge/Build-none-green)](#装上就能用)
[![Static-only: no backend](https://img.shields.io/badge/Static--only-no%20backend-brightgreen)](#只做静态这一件事)

<br>

**这是一座风格标本库：30 个方案各配一个能直接打开的 HTML 原型，外加 3 个拿来就用的模板。**

<br>

<sub>纯静态 —— 不需要构建，不需要后端，任何静态托管直接部署。</sub>

你手上有一个要上线的站，对方张口就要"高级感"。
你翻收藏的设计网站，越翻越眼熟——暖米色底、陶土橙、衬线大标题，和上个月那版没区别。
不是你没审美，是你见过的样本全是渲染图：它不告诉你 1440 到 390 之间怎么塌，不告诉你长文压不进栅格，也不告诉你照片缺了得重排。
这座标本库存在的全部理由：每个案子都能打开、能跑、能拆到字段。

```bash
npx serve . -l 8080                # 或者：python -m http.server 8080
```

跨平台通用——任何浏览器、任何静态托管都能跑，不需要装任何东西。

[看效果](#看效果打开选型台272-张真截图摊在一页) · [安装](#装上就能用) · [内容](#仓库里有什么) · [机制](#核心机制) · [边界](#做不到与已知边界)

<br>

</div>

---

## 看效果：打开选型台，272 张真截图摊在一页

没有 GIF，也不借图。这里能给你的是**能当场点开的文件**。

```bash
git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l    # 272 张三档真实渲染截图
```

起个服务器（命令在下一节），然后打开 `prototypes/_selection/`：

```
http://localhost:8080/prototypes/_selection/
```

一屏摊开 30 个案子。每行给出结构类型／认知门槛／调性、一句话定义、配色色块、错误码、闸门结果，以及**桌面 1440／平板 768／手机 390 三档真实渲染截图**。

```
S07  铅灰油墨目录            F 型 · 门槛低 · 调性：学术档案 / 严肃出版
     ┌────────────────┬──────────────┬────────────┐
     │ 1440 桌面      │ 768 平板     │ 390 手机   │
     │  [真截图]      │  [真截图]    │  [真截图]  │
     └────────────────┴──────────────┴────────────┘
     闸门 FAIL 1（mono） · 错误码 MIR-47 · 5 屏 / 6 张真图 · [展开 12 字段]
```

ASCII 只是形状。页面上是像素。

点一行展开全部字段（多数案子 10 段）。
`#S07` 能深链分享。
键盘全程可用：`J`/`K` 换方案，`1`/`2`/`3` 切视口，`/` 定位搜索框，`Esc` 收起。

旁边站着**选型向导**（`prototypes/_selection/wizard.html`）。五个问题问的是**你的处境**，不是"你喜欢什么风格"：内容量、图片量、要多安静、首屏要不要三秒知道点哪、更怕做错还是怕没记忆点。（⚠️ 此处原文曾写"要不要导流、怕不怕复古"——`git grep` 核验向导里根本没有这两问，是 51 号双语审计抓出的**虚构维度**，已改为向导实际的 `load/img/loud/guide/fear` 五问。EN 同改。）
输出 **3 个推荐 + 3 个明确排除**。每条"为什么"都读**实测值**——正文字数、真实图片张数、调色板最高饱和度、声明门槛、调性合成的记忆点代理值——不替方案打主观分。
答案能带链接回放：`?load=2&img=2&loud=2&guide=0&fear=2`。

---

## 装上就能用

整个仓库**纯静态**：没有后端，没有构建，没有依赖安装。

```bash
# 任选一种
npx serve . -l 8080                  # Node（不用先装，npx 会临时拉；-l 8080 对齐下面的 URL）
python -m http.server 8080           # Python 3
php -S localhost:8080                # PHP
```

然后打开：

```
http://localhost:8080/prototypes/_selection/               # 选型台（总入口）
http://localhost:8080/prototypes/_selection/wizard.html    # 选型向导
http://localhost:8080/templates/M01-clean-corporate/       # 一个大众模板
http://localhost:8080/prototypes/S14-zero-g-launch-sequence/   # 一个原型
```

**必须通过 HTTP 打开，不能双击文件。**
`file://` 下 CSS `mask-image: url(...)` 会被 CORS 拒绝、整条链失效：`S04` 与 `S07` 双击打开会让纸块和书口毛边变成一整面空白——看起来像页面坏了。同一页面同一尺寸对照实测：**5818 种颜色 vs 2 种颜色**。这是功能前提，不是风格建议。

仓库**约 180 MB**（照片、渲染截图、自托管字体），建议浅克隆：

```bash
git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
```

只想看截图不想克隆，直接在 GitHub 网页上浏览 `prototypes/<方案>/`。

装完自检：`prototypes/_selection/index.html` 能打开、`prototypes/_selection/data.js` 非空、`prototypes/S01-*/index.html` 存在——少任何一个说明你克隆中断了。

---

## 仓库里有什么

**30 个设计方案**——它不是配色皮肤，而是一份完整的设计主张，12 个字段：
一句话视觉定义、美学家族与参考、配色系统（带面积比与情绪）、字体策略、布局与网格（含三档断点行为）、关键视觉元素、动效与交互（含降级路径）、去 AI 味审查点、风险与规避、适用场景（附"不适合"）、可落地要点（含性能预算），以及一处**设计师签名式怪癖**。

**30 个可运行原型**——真排版、真文案、真素材、真错误状态、真 `prefers-reduced-motion` 降级。
**26 个闸门 FAIL=0**。剩下 4 个的 8 条失败逐条列在[做不到与已知边界](#做不到与已知边界)。

**F 型 15 / R 型 15**——F 型是有固定骨架的结构，访客 3 秒内知道先看哪、点哪；R 型靠一个物理机制组织内容。30 个美学家族**互不重复**。

**3 个大众化模板**——独立的一层，规则和 30 案不同，豁免范围写进各自的 README。见[模板层](#模板层改-12-个变量就是一个站)。

**浏览与挑选**——选型台 + 选型向导 + 键盘操作，见上一节的上一节。

**工具链**（都在 `prototypes/_build/`，纯 Node + Python，无 npm 依赖）：

| 脚本 | 它管什么 |
| --- | --- |
| `render-scheme.mjs` | 渲染一个原型并打印闸门结果（三档视口真实截图）。⚠️ 依赖仓库外的 `tools/`，见[渲染与验收](#渲染与验收) |
| `verify-prototype.mjs` | 机械复核：远程资源、禁用字体栈、Emoji、断链图、真实图片数、横向溢出、闸门计数 |
| `shot.mjs` + `shot-page.py` | **零依赖截图取证**（不依赖任何第三方设计工具、不使用 CDP）：整页长图 + 按视口切片 + 逐屏像素统计（主色占比、平均亮度、空白屏识别） |
| `fetch-fonts.mjs` / `selfhost-fonts.mjs` | 把字体抓成自托管，并把页面里的外链字体换成自托管 |
| `assign-assets.mjs` / `make-textures.py` | 素材兜底（从已有语料按题材交叉分配真实照片）+ **14 个确定性纹理生成器**（参数落盘可逐字节复算） |
| `collect-schemes.mjs` / `summarize-all.mjs` | 给选型台生成 `data.js`、汇总全库渲染报告 |

---

## 模板层：改 12 个变量就是一个站

三个模板都是**两文件即可运行**（`index.html` + `style.css`），**零外部依赖**：没有图片文件、没有 JS 库、没有 CDN、没有构建步骤。
图片位置用**内联 SVG 占位框**（灰阶、带比例与建议像素）。
文案用**占位标记** `【换成你的：…】`——你一搜就知道该填哪里。
字体走**系统字体栈**，任何机器立刻正确显示、不跳字。

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

**为什么这一层的规则和 30 案不同？**
30 案受一份严格的"反 AI 味"规格约束，明令禁止居中大标题＋三张等宽卡片＋底部 CTA、白／浅灰 section 交替、纯白底＋纯黑字＋单一强调色、圆角浮起卡片、`Inter`/`system-ui` 作主字体、紫蓝渐变、毛玻璃吸顶导航。
**而这些禁令恰好就是"大众模板"的构成要件。**
所以本层**明示豁免**它们。口径分清：**30 案那层的目标是被记住，这一层的目标是不犯错、拿起来就能用。**
每份 README 都逐条写了豁免范围与**用途级**理由（不是"因为大众"），并列出仍然守住的条款（`gradient` 0、`backdrop-filter` 0、Emoji 0、无空洞营销词）。

> ⚠️ **`box-shadow` 0 其实没守住**：M01 有 3 处、M03 有 1 处（用 `box-shadow` 画汉堡两条杠）。
> **而 M01 自己的 `README.md` 就承认这是有意豁免**——两层文档对同一处声明给过相反结论。

---

## 核心机制

这一节回答"为什么它做得出来"。四条硬规则，每条都有落点。

**一、规格先于像素。** 每个方案先写满 12 字段规格（`prototypes/_specs/Sxx.md`），再动 HTML。
色彩、字体、断点、降级路径都是**声明过的值**，不是调出来的感觉。

**二、闸门只认能机械判定的东西。** 远程资源、禁用字体栈、Emoji、断链图、真实图片数、横向溢出——由 `prototypes/_build/verify-prototype.mjs` 复核，可复算；⚠️ 但 `box-shadow`／`mono`／`button-fx` **不在那个脚本里**（脚本内 `shadow` 出现 0 次），它们由**仓库外**的 `tools/taste-skill/…/rules.mjs` 判定，克隆者须自备 `tools/` 才能复算这几项（见「渲染与验收」的 exit-4 提示）：

```bash
node prototypes/_build/verify-prototype.mjs --all
```

**三、渲染是最后一道，不是装饰。** 每个案子在 1440／768／390 三档真截图，像素统计判空白屏。截图即取证，`272 张`全部在库里，可 `git ls-files` 数出来。

**四、来源与修正分文件写。** `_specs/Sxx.md` 是修正前的原文，当前有效的色值／字体／错误码以 **`_specs/_CURRENT-VALUES.md`** 为准——跨若干轮审查后有二十多处背景色、主色和字体被替换过。想追溯"这个数你怎么算的"，两份文件相加就是链条。

---

## 部署四阶段：推到 Pages 只要留一个文件

**任何静态托管都能直接用，不需要任何配置或环境变量。站点根目录就是仓库根目录。**

### 阶段 1：推到自己的仓库

```bash
git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
cd web-style-atlas
git remote set-url origin https://github.com/<你的用户名>/<你的仓库名>.git
git push -u origin main
```

### 阶段 2：开 Pages

仓库页面 **Settings → Pages** → **Source** 选 `Deploy from a branch` → **Branch** 选 `main`、目录选 `/ (root)` → 保存。
一两分钟后访问 `https://<用户名>.github.io/<仓库名>/`。根目录的 `index.html` 会自动跳到选型台。

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

每个 `prototypes/<方案目录>/` 不含任何远程 URL（契约 §4），**能原地跑起来；但"搬走"比"跑起来"复杂，它是标本不是组件**：

- 要让它独立跑，须**一并带上 `prototypes/_fonts/`**（各案引用 `../_fonts/css/*.css`），放进同一个父目录、改掉相对路径。
- **⚠️ 四个案另有私有字体**：`S04`/`S07`/`S08` 在案目录 `assets/fonts/`、`S21` 在案目录根 `fonts/wenjin-*.woff2`（文锦坊老宋体 CJK 分块，共 71 片，它的 @font-face 全指向这里）——只带 `_fonts/` 照做**必缺字**。搬这四案必须连案目录字体一起拿走。
- 取用成本实测（可移植性审计 50 号，费率在 `deliverables/50-critique-portability.md` §0）：当静态页换文案约 1–2 小时；拆进自己的框架 **8–16.5 小时/案**（中位 10.9h，大头是没有可搬的组件边界）。

**大众模板（`templates/M0x/`）没有这些限制**——系统字体栈、零第三方素材，复制一个目录走就能用。

---

## 渲染与验收

```bash
# 渲染一个原型：三档视口真实截图 + 闸门结果
# ⚠️ 本命令还依赖 prototypes/_build/ 之外的 tools/taste-skill/…/inspect.mjs —— tools/ 被 .gitignore 排除、不在仓库里。
#    克隆者须先自行取得该工具；脚本本身免改——仓库根由脚本位置自动推导（ROOT 硬编码已在工具链 T0 清除）。
#    只想看截图就用下面的 shot.mjs（不依赖 tools/）。
node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence

# 机械复核（不带参数则复核全部）
node prototypes/_build/verify-prototype.mjs --all

# 零依赖截图取证：整页 + 逐屏切片 + 像素统计
node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ --out .shots --widths 1440,768,390 --name S14
```

⚠️ **一条会骗到你的坑**：`chrome --headless=new --window-size=390,844` **不是 390 视口**。
Windows 上 Chrome 有**最小窗口宽约 500 CSS px**，布局按 500 走、截图按 390 宽输出，你拿到的是 **500px 布局的左侧裁切**——于是会看到"文字被截断""汉堡菜单不见了"这种**假故障**。
`--window-size=768,1024` 实际 `innerWidth` 也只有 752。

**窄档验收请用上面的 `shot.mjs`**（390 档它用 iframe 造视口）或任何走 CDP `Emulation.setDeviceMetricsOverride` 的工具；1440 档用 `--window-size` 没问题。

---

## 只做静态这一件事

数据不出本机：页面是 HTML/CSS/JS，素材在仓库里，字体自托管。

- 浏览与部署**零依赖**、**零网络请求**（无 CDN、无远端接口、无埋点）。
- 没有账号，没有登录，没有后端，没有 `npm install`。
- 没有安装过程，也就没有遥测。

复算（第一条应当**没有任何输出**）：

```bash
# 页面不加载任何远程资源：无 <script src=http>、无外链字体、无 url(http)、无 fetch
grep -rEn 'src="https?://|url\("https?://|<link[^>]+href="https?://|@import url|fetch\(|XMLHttpRequest' prototypes/S14-zero-g-launch-sequence/

# 页面里确实出现的 http(s) 字符串只有署名链接（S14 共 9 处，全在 figcaption 的 <a> 里）
grep -rEo '<a href="https?://[^"]+"' prototypes/S14-zero-g-launch-sequence/index.html | wc -l
```

那些是给人点的出处，不是页面运行时要取的东西。

---

## 做不到与已知边界

写清楚什么时候别用。

- ❌ **`S07` `S08` `S13` `S21` 四个旧原型仍有闸门 FAIL，合计 8 条**：`S07` `mono`（1）；`S08` `palette-terracotta` + `font-count`（2）；`S13` `mono` + `shadow`（17 处）+ `button-fx` + `empty-screens`（4）；`S21` `mono`（1）。
  其中 `S21` 的 `few-pictures` 与 `empty-screens` **已修**（接上了它自己 `assets/_cand/` 里 28 张对题照片中的 6 张，真实图片 0 → 6）。
  `S07`/`S08`/`S13`/`S21` 的 `mono`，以及 `S08` 的琥珀主色，是**已知豁免**（理由见 `prototypes/_CONTRACT.md` §9.15）。
  **`S13` 的 `shadow`（17 处）与 `button-fx` 没有豁免记录**——30 案那层明令 `box-shadow: 0`，这两条是**真的未清**。
- ❌ **底色同质是真的**：**18 / 30 = 60% 落在"暖浅色带"**（判据 `色相 28–72° 且 明度 ≥78`）。另有两条比百分比更说明问题：**12 个案子（40%）的底色在宽口径 ΔH≤3° 且 ΔL≤3° 下连成单一连通块**（链上最大单步 ΔE76 = 4.39；换 ΔE76≤5 口径则是 19 案）；**83% 的案子首屏没有导航链接、97% 圆角为 0**（口径已补：前者的分母是各案 `.inspect/report.json` 的 `metrics.nav.links=0`，实测 **25/30 = 83.3%**，⚠️ 该指标只数 `<nav>`/`header` 内的 `<a>`、**量不到"页内锚点目录系统"**——56 席实测 S07/S15/S27 等案的页内锚点有 52/40/38 条，所以"缺的是可感知的进度反馈"比"缺导航链接"更准；后者分母是 `roundedBoxes>0`，全批仅 S14 一案有圆角 ⇒ 29/30 = 96.7%。两个数都属 `report.json` 机械口径，换 grep `<nav>` 口径会得到 76.7%，这不是漂移、是不同判据）。见 [deliverables/29-critique-homogeneity.md](deliverables/29-critique-homogeneity.md)。
  > ⚠️ **报同质数字必须附判据。** 换成 ΔE76≤5 口径，最大连通分量是 **19 案（63%）**，「12 案」只在上面那个口径下成立。
  > 本项目在这件事上混用过 **17% / 60% / 73%** 三个数——它们分别测"最严纸族""暖浅底""含主色暖倾向"，**分母还差 4 案**；"近同对 12 严 / 22 宽"来自**先把色相与明度取整再比**，连续值直接比只有 8 / 17。三个数的来历见 [deliverables/29](deliverables/29-critique-homogeneity.md) §1。
- ❌ **底色之外还有两条同质**：**"安静度"这一轴（`axes.loud`，由调色板最高彩度算出）里"很安静"只有 2 案**、"就要扎眼"19 案（63%）——别把这组数当成 `tone`；`tone` 是另外七个词（「混乱活力／街头」等），最多的一词 5 案。
  色相 36 个 10° 桶只用了 11 个，**紫→品红连续 110° 全空**；明度 **20–60 整段 0 案**。
  也就是说：**用户能用的筛选维度（内容量、复杂度）恰好都是缩略图上看不见的维度。**
- ❌ **选型台对三个案子抽少了段**：`S12`/`S15`/`S19` 只展开 9 段。**原因不是规格里没有**——这三案的 `_specs/*.md` **L25 都有「5. 布局与网格」**，是 `_build/collect-schemes.mjs:187` 的抽取对它们失效。**这是本项目一个已知未修的抽取缺陷**，不是规格缺陷。
- ❌ **题材缺口**：`S28「爵士凹版墙」`的可用语料里没有爵士唱片本身，顶上的其实是**印刷素材（活字盘×2、金属活字、丝网印台、Riso 印刷机）与一台 Marble Madness 街机柜（出现 2 次、占最大一块）——零爵士、零唱片、连唱片机都没有**；`S22`、`S23` 的复用素材方向本就对题（纸/装订、1902 年报纸+档案）。缺口都写进了对应原型的 `CREDITS.md`。Wikimedia 现已可达（契约 §10.1），换对题素材是产品决定（首批候选：Reid Miles/Blue Note 公版封套）。
- ❌ **`#888888` 灰块专属于 `inspect.mjs` 链路**：少数 `.inspect/` 里的桌面滚动截图会出现大片精确中性灰（S08 的 `desktop-page-03` 占 49.86%、S17 的 `desktop-page-01` 占 24.27%）。**那是 `inspect.mjs` 自己滚动拼接的缺陷，不是页面真有灰**——已定性于 `deliverables/16-render-look-audit.md`。**旁证**：一次独立审查对 246 张用 `shot.mjs`／裸 CDP／Pillow 这条链路产出的 PNG 做了全量扫描，**无一张该灰占比超过 2%**（最高 0.236%，是页面抗锯齿边缘）。它不出现于其他截图方式。
- ❌ **`measure` 这条规则对中文是假阳性**：它按 0.5em 估算字符宽，而汉字约 1.0em，**报数除以 2 才是真实汉字数**。
- ❌ **双击打不开正确结果**：`file://` 下 CSS `mask-image: url(...)` 会整体失效（CORS 拒绝 → 全透明）。受影响的是 `S04` 与 `S07`：**纸块与书口毛边会变成一整面空白**——比页面本身的任何缺陷都严重，而且**看起来像页面坏了**。同一页面同一尺寸的 http/file 对照实测：**5818 种颜色 vs 2 种颜色**。
- ❌ **13/30 案的 `index.html` 在 30–48.4 KB**（最大的 S29 是 49,512 B），超过契约 §2 的目标区间 18–27 KB。⚠️ 此句原写"**少数**原型"——实测 13/30 = 43%，不是少数（51 号承诺对撞抓出）。中文正文本身占字节就大（四千多汉字约 14 KB），压下去只能删内容。
- ❌ **它不是一个设计系统**：没有组件库，没有 token 交付，没有可复用的 CSS 框架。要拿它当设计系统用的人会在第三天失望。

一句自贬定位：**这是一个 80 分的标本库，不是 100 分的成品站。**（这两个分数是定位说法，不是实测评分——实测结论全在上面那 9 条里。）对"要看够多种真实做法才知道自己那个站该长什么样"的人，80 分的标本库比 100 分的成品站有用。

---

## 仓库结构

```
.
├── index.html                  # 跳转到选型台（给静态托管当入口）
├── README.md / README-EN.md    # 中英双语，逐节对译
├── LICENSE
├── .nojekyll                   # 必须保留（见部署阶段 2）
├── templates/                  # ★ 3 个大众化模板（M01 / M02 / M03）
├── prototypes/
│   ├── _selection/             # ★ 选型台 + 选型向导
│   ├── _fonts/                 # 自托管字体（48 个样式表 + woff2 分片）
│   ├── _specs/                 # 每案 12 字段原文 + _CURRENT-VALUES.md（当前有效值权威来源）
│   ├── _build/                 # 全部工具脚本（渲染 / 复核 / 抓字体 / 备素材 / 生成纹理 / 陈旧度检查）
│   ├── _CONTRACT.md            # 施工规范（在 prototypes/ 根，不在 _build/ 下）
│   └── S01-… S30-…/            # 30 个原型（index.html + style.css + assets/ + .inspect/）
└── deliverables/               # 从约束简报、研究简报、规则法典到审查记录的完整文档链
```

---

## 依赖

- 浏览与部署：**无**（纯静态）
- 渲染与复核工具：Node.js 18+、Python 3.8+（Pillow）、Google Chrome
- **不使用**任何第三方设计审查工具；`prototypes/_build/shot.mjs` 完全零依赖

---

## 这个图集是怎么造出来的

三条来源，都写明白。

**一、外部规则集回灌。** 30 案的"反 AI 味"条款不是拍脑袋，是把 `taste-skill`（MIT）与 `impeccable`（Apache-2.0）两套真实规则集逐条回灌到方案上裁定的结果，记录在 `deliverables/12-*` 到 `16-*`。
两个工具的规则集**不互相覆盖**，所以两条都得跑。裁定分三档：`earned`（被这个视觉世界挣来的）、`habit`（顺手件）、`indefensible`（说不出理由）。
**这两个工具都不在本仓库里**——见 `LICENSE` 第 4 条；本仓库的运行与部署也不依赖它们。

**二、审查链条。** `deliverables/` 里从 00 号约束简报排到 40 号，中间是研究简报、规则法典、红队锐评、以及一批为既有结论辩护的复审。上面每一条边界数字都能回指到某一号文件。

**三、这份 README 的写法。** 结构、语气与证据装置来自公开的花叔风格 README 方法论（`write-attractive-readme` skill，样本仓 LICENSE 均为 MIT）；风格照搬，证据不照搬——文中每个数字都在本仓库里实测过，句式出处与本仓库无关。

一句话：**本文尽量把每个数字标注判据与口径；少数撞不出或已漂移的，已在此点名**（如纹理参数 `build/texture-job.json` 对克隆者不可核、派生件归属需读生成器而非文件名）。此前这里写的是"**没有一条断言是估的**"——那是给自己发的免检牌，双语审计当场抓到若干处行号漂移与两处虚构（已删/已改），**绝对化的自誓本身就是最该被审计的断言**，故改为如实版本。

---

## 反馈与贡献

什么算 bug：脚本跑不通、锚点跳空、闸门计数与文中数字不符、文中路径与仓库实际结构不符。
提之前请先跑这三条复算命令，把原始输出贴上来：

```bash
git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l     # 文中写 272
node prototypes/_build/verify-prototype.mjs --all        # 文中写 26 案 FAIL=0
ls prototypes/_selection/                                 # 选型台 + 向导的文件
```

什么算提案：新的美学家族要能说清它和已有 30 族里最接近的一族差在哪；说不清就不是新族，是皮肤。
提案请附一份 12 字段规格，别只附一张参考图。

贡献代码不需要签 CLA；改动了 `_specs/` 或 `_CONTRACT.md` 请一并更新 `_CURRENT-VALUES.md`。

## License 与署名：MIT，但三类素材不归它管

三部分许可不同，请分别对待：

| 内容 | 许可 |
| --- | --- |
| **本仓库的代码与文档**（`index.html` / `style.css` / `app.js` / `templates/` / `_build/` 脚本 / `deliverables/` / README） | **MIT**，见 [LICENSE](LICENSE) |
| **字体**（`prototypes/_fonts/`） | 各字体原有许可，绝大多数为 **SIL OFL 1.1**（Noto / IBM Plex / Archivo / Oswald / Syne / Space Mono 等）。来源与许可见 `_fonts/css/*.css` 文件头注释 |
| **照片**（各原型 `assets/`） | **第三方素材，不由本仓库授权**。多为 Wikimedia Commons 的 **CC BY / CC BY-SA / CC0 / 公有领域**，另有部分 **NASA 图像**（公有领域） |

**每一张照片都逐张登记在各原型的 `assets/CREDITS.md` 里；但逐张登记的字段完整度不一致**——除下表点名的五案（`S04`/`S07`/`S08`/`S13`/`S17` 的自述承认作者与许可未保留）外，其余案给全「作者 + 许可 + 原件链接」三件套。 复用前请按表核对并遵守其许可（CC BY / CC BY-SA 要求署名，部分还要求以相同方式共享）。

> ⚠️ **上面这句有两个已知例外，别当成全库事实。**
> `S04` / `S07` / `S08` / `S13` / `S17` 五案的 `CREDITS.md` **自认逐张的作者与许可没有保留下来**（当初抓素材时这些字段就没落盘），涉及 **56 个位图文件**（逐份 CREDITS.md 的"盘上存在但署名表里没有对应记录"相加：S04 26、S07 9、S08 6、S13 10、S17 5，56 个文件全部在盘上存在）。
> **「43 张唯一图」是另一个口径，两个都要报**：43 只在把 S04 那 26 个文件按 13 个同名 stem 的 png/webp 成对折半时才成立；按 sha256 逐字节去重，这 56 个文件是 56 个不同的字节对象。此前本文件与 `LICENSE` 写的"约 38 张"复现不出来，已按实测改掉。
> 且全库有 **11 行**把许可写成“见来源页”而来源页/`source`/`original` 三个 URL 字段全空（分布在 `S20`/`S21`(credits-unused)/`S22`/`S23`/`S24` 的 `assets/credits*.json`；逐案逐条清单见 `deliverables/30-critique-assets-license.md`）。
> ⚠️ **本节原来给过 `assign-assets.mjs` 的逐行行号（`:228`/`:300`/`:359`…），已全部删除**：工具链 T0 批次给该文件净增了 40 多行，行号全线漂移；更糟的是其中一条机制（“`if (Array.isArray) out.push(...arr)` 把 S13 的 `{value,Count}` 包装当成一条正常记录塞进语料、字段全空”）**经 `git log -S` 全史核验从未存在**——写一条不存在的代码当作缺陷根因，比行号漂移严重。双语纪律只检查“两份是否同值”，不检查“每一份是否为真”，所以这条假机制在 CN/EN 两份里一起活了 40 多个提交。**行号是易腐引用，机制描述才该留在文档里**，要定位就现查。
> **根因不是“跨案复用时把字段搬丢了”**——`assign-assets.mjs` 从不丢弃已命中的 `artist`/`license`/`page`。真实机制是六条（按函数定位，不按行号）：**体积闸门**把原图挡在语料外（入库门槛与参评门槛各一道，字节数小于阈值即跳过）；**未命中的硬编码兜底**写 `见来源页` 且**根本不写 `page`**（`build` 目录那条兜底同样只写 `artist`/`license`、不写 URL）；**默认值分支只认 `artist`/`license`/`page`/`original` 四个名字**，不认博物馆 schema 的 `creator`/`licenseUrl`/`image`，也不认 `source`——Met 那类记录因此整条读空；**复用记录只搬 6 个字段**（`file`/`title`/`artist`/`license`/`page`/`origin`，丢掉 `width`/`height`/`bytes`/`query`，并把 `original` 覆盖成 `page`）；**查找阶段只按 5 个子路径找 `credits.json`**（`assets/`、`build/raw/`、`build/raw-s01/`、`build/`、`build/raw/credits-raw.json`——S01/S04/S07/S08/S17 的署名根本不在这些位置）；**以及 S13 的真实机制**：它的 `credits.json` 顶层是数组，但第一个元素是 PowerShell `ConvertTo-Json` 留下的 `{value:[…],Count:5}` **包装对象、没有 `file` 键**，按文件名建索引时它贡献 0 条、**内层 5 条从未被读取**（不是“当成空记录塞进语料”）；另 2 条真实记录正常索引。
> **另有 7 行属“从未记录”而非“记录后丢失”**：S07 没有 `assets/credits.json`；S13 那 2 条真实记录带完整 Met `creator`/`license`/`licenseUrl`/`page`，但它们的 `file` 名在磁盘上不存在（磁盘上是烘焙后的图版名）——**准确说法是“文件名与磁盘不匹配、无法据此核验落盘”**，此前写“作者与许可在仓库内无法确认”是过度陈述（许可数据其实齐全）。
> **还有 5 行有许可名但整条记录没有任何 URL**（`S22`、`S28`、`S30`；上游 `S25/assets/credits.json` 其实有 `source` 直链，但下游只认 `page`/`original`，URL 因此丢失）。**这些案子的照片不得对外复用**，直到署名表补齐。
> 另：`S14` / `S15` 的 `CREDITS.md` 里"页面里用在哪"那一列是**没刷新的占位文本**（S14 有 28 处），不要据此判断某张图用没用。

**程序化纹理不是照片**：由 `_build/make-textures.py` 生成，参数落盘（各案 `build/texture-job.json`）可逐字节复算，无第三方权利。

> ✅ **已补（`7585040`）**：那 12 案的参数单已搬进受跟踪路径 `prototypes/_build/textures/`（12 份 JSON，正是盘上有 job 的那 12 案），并重烘 S18 的三张纹理与已交付件 **SHA-256 逐字节相同**验证过。
> 「参数落盘可逐字节复算」这句**从克隆者视角今天起可核**（它是 LICENSE 划「无第三方权利」的依据）。⚠️ 仍存两个真缺口：① 其余 18 案盘上本就无参数文件（不是漏搬）；② 生成器 `jobFile` 仍写被忽略的 `build/`，**重跑会与快照分叉**——彻底修好要同步改 4 处，见 `prototypes/_build/textures/README.md`。
> （本句原写「要让它可核需把参数表挪到不受忽略的路径」——该路径现已建成，故降为历史说明；实测覆盖率仅 19.6%，S15 独占 78.9% 未被覆盖。）

> ⚠️ **但"派生件"的许可要单独说清。** `LICENSE` 第 3 条按**文件名**（`assets/texture-*.png`）划 MIT 范围、第 2 条按**目录**划第三方范围——而介于两者之间的**派生件**（`halftone-*.png`、`*-dither.png`、`plate-*.jpg`、`photo-*.jpg` 等，被引用的 287 张位图里约 **183 张**属这类）**同时落在两条的补集里，仓库原先没有一句话说明它们的许可**（全库只有 `S02` 写了"衍生图沿用原图的许可"）。已在 `LICENSE` 补上 **`2bis`** 条款。

**大众模板不含任何第三方素材**——图片位是内联 SVG 占位框，没有授权问题。

一句人话：**代码与文档随便用、随便改；字体和照片各归各的许可，先查 `CREDITS.md`。**

---

## English

**Web Style Atlas** — 30 website design schemes, each with a real, runnable HTML/CSS prototype, plus 3 mainstream templates, a filterable selection bench and a five-question wizard.

Pure static: no build step, no backend, no dependency install. Open `prototypes/_selection/` over HTTP and all 30 schemes appear on one page with real renders at 1440 / 768 / 390 (**272 screenshots**, `git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l`).

26 prototypes pass the mechanical gate with FAIL = 0. What this repository cannot do — 8 remaining gate failures, measured ground-colour homogeneity (18 / 30 = 60% in a warm pale band), the `file://` `mask-image` breakage, the incomplete photo attribution tables — is listed under [做不到与已知边界](#做不到与已知边界).

Full English README: **[README-EN.md](README-EN.md)**（与本文逐节对译）.

---

<div align="center">

**网站设计风格图集** 把风格变成能打开、能跑、能拆到字段的标本。<br>
*「30 个能跑的风格，不是 30 张配色图。」*

</div>
