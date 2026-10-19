# 网站设计风格图集 · 30 个方案的可运行原型

30 个**互不相同的网站设计风格方案**，每个方案都配了一个**可直接打开、可运行的真实 HTML/CSS 原型**，全部按同一套视口渲染出截图，最后收进一张可筛选、可对比的**选型台**页面。

这不是设计稿，也不是模板合集。每个原型是一份能跑起来的页面：真实排版、真实文案、真实素材、真实的错误状态与 `prefers-reduced-motion` 降级。三条命令之外没有任何构建步骤。

- **30** 个方案（F 型 15 / R 型 15）
- **30** 个可运行原型，**271** 张渲染截图
- **1** 张选型台，把 30 个案与它们的截图排在一页上

---

## 目录

- [先看效果](#先看效果)
- [本地浏览（不用装东西）](#本地浏览不用装东西)
- [部署到线上](#部署到线上)
- [仓库结构](#仓库结构)
- [这 30 个方案是什么](#这-30-个方案是什么)
- [原型是怎么做出来、怎么验的](#原型是怎么做出来怎么验的)
- [授权与署名](#授权与署名)
- [已知缺口](#已知缺口)
- [English](#english)

---

## 先看效果

**选型台**是入口。它把 30 个案摊在一页上，每行给出：

| 列 | 内容 |
| --- | --- |
| 标识 | 方案号 `S01`–`S30`、中文名、英文名 |
| 分类 | 结构类型（F／R 型）、认知门槛（低／中／高）、调性 |
| 内容 | 一句话视觉定义、美学家族、配色色块、错误码 |
| 截图 | 桌面 1440 / 平板 768 / 手机 390 三档真实渲染图 |
| 质检 | 闸门结果（FAIL/WARN 计数与具体规则名）、屏数、真实图片数 |

点任意一行展开它的 **12 个字段全文**与整页可翻页的大图，并给出一个直接打开该原型的链接。

筛选（按结构类型／认知门槛／调性／建成状态／闸门）、搜索、排序都在左栏与顶栏。地址栏的 `#S07` 可以直接分享单个方案；键盘 `J`/`K` 换方案、`1`/`2`/`3` 切视口、`/` 定位搜索框。

## 本地浏览（不用装东西）

整个仓库是**纯静态**的——没有后端、没有构建、没有依赖安装。唯一的要求是**通过 HTTP 打开**而不是直接双击文件（原型的字体与截图用了相对路径，`file://` 协议下部分浏览器会拦）。

任选一种：

```bash
# 方式一：Node（不用先装，npx 会临时拉）
npx serve .

# 方式二：Python 3
python -m http.server 8080

# 方式三：PHP
php -S localhost:8080
```

然后在浏览器打开：

```
http://localhost:8080/prototypes/_selection/
```

也能单独打开某个原型，例如：

```
http://localhost:8080/prototypes/S14-zero-g-launch-sequence/
```

> **仓库较大（约 180 MB，主要是照片、渲染截图与自托管字体），建议浅克隆：**
> ```bash
> git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
> ```
> 只想看截图不想克隆，直接在 GitHub 网页上浏览 `prototypes/<方案>/` 即可，每个目录里都有 `index.html` 与 `style.css`。

## 部署到线上

**任何静态托管都能直接用，不需要任何配置或环境变量。** 站点根目录就是仓库根目录。

### GitHub Pages（推荐，本仓库已可直接用）

```bash
# 1 克隆
git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
cd web-style-atlas

# 2 推到自己的仓库
git remote set-url origin https://github.com/<你的用户名>/<你的仓库名>.git
git push -u origin main
```

然后在仓库页面 **Settings → Pages** 里把 **Source** 设为 `Deploy from a branch`，**Branch** 选 `main`、目录选 `/ (root)`，保存。一两分钟后访问：

```
https://<你的用户名>.github.io/<你的仓库名>/
```

根目录的 `index.html` 会自动跳到选型台。（也可以只用命令行：`gh api -X POST repos/:owner/:repo/pages -f source[branch]=main -f source[path]=/`）

### Cloudflare Pages / Netlify / Vercel

连接仓库，然后：

| 项 | 值 |
| --- | --- |
| Build command | **留空**（没有构建步骤） |
| Output / Publish directory | **仓库根目录**（`/`） |
| 环境变量 | 无 |

### 自己的服务器（Nginx / Caddy / Apache）

把仓库放到站点根目录即可。因为是静态文件，唯一值得加的是给字体与图片配长缓存：

```nginx
location ~* \.(woff2|jpg|jpeg|png|webp)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 只想取用某一个原型

每个 `prototypes/<方案目录>/` 是**自包含**的（`index.html` + `style.css` + `assets/`）。要让某个原型独立跑起来，需要一并带上 `prototypes/_fonts/`，因为它引用 `../_fonts/css/*.css`。把这两部分放进同一个父目录即可。

## 仓库结构

```
.
├── index.html                      # 跳转到选型台（给 GitHub Pages 用）
├── README.md
├── LICENSE                         # 本仓库的代码与文档：MIT
├── prototypes/
│   ├── _selection/                 # ★ 选型台（30 个案的总入口）
│   │   ├── index.html  style.css  app.js
│   │   └── data.js                 # 由脚本从 30 个案的数据生成
│   ├── _fonts/                     # 自托管字体（46 个样式表 + woff2 分片）
│   ├── _specs/                     # 每一案的 12 字段原文 + 当前有效值
│   │   ├── S01.md … S30.md
│   │   └── _CURRENT-VALUES.md       # 30 案"现在到底什么颜色/什么字体"的权威来源
│   ├── _build/                     # 全部工具脚本（见下）
│   ├── _CONTRACT.md                # 施工规范 + 16 条实战坑 + 环境事实
│   └── S01-red-wedge-broadsheet/   # 一个原型
│       ├── index.html              #   可运行页面
│       ├── style.css
│       ├── assets/                 #   真实照片 + 程序化纹理
│       │   └── CREDITS.md          #   逐张的作者与许可
│       └── .inspect/               #   渲染截图 + report.json（闸门原始结果）
└── deliverables/                   # 从简报、研究、规则法典到审查记录的完整文档链
```

## 这 30 个方案是什么

每个方案是一个**完整的设计主张**，不是配色皮肤。它们分布在 15 个 F 型（有固定骨架的结构）与 15 个 R 型（机制驱动的结构），美学家族从苏联构成主义印刷、装饰艺术、昭和喫茶店、西非蜡染广告牌、东欧地下出版物，到参数化生成印刷、爵士唱片凹版、加州滑板贴纸，**互不重复**。

每个方案的 12 个字段是：

1. 一句话视觉定义　2. 美学家族与参考　3. 配色系统（含面积比与情绪）　4. 字体策略
5. 布局与网格（含三档断点行为）　6. 关键视觉元素　7. 动效与交互（含降级路径）
8. 去 AI 味审查点　9. 反 AI 味风险与规避　10. 适用场景（附"不适合"）
11. 可落地要点（含性能预算）　12. 设计师签名式怪癖

字段原文在 `prototypes/_specs/S01.md … S30.md`；**注意**：那些是修正前的原文，**当前有效的色值／字体／错误码以 `_specs/_CURRENT-VALUES.md` 为准**——跨越若干轮审查后，有二十多处背景色、主色和字体被替换过。

`deliverables/` 里是完整的过程文档：约束简报、联网研究简报、可机械校验的反 AI 味规则法典（40 条规则 + 20 条侦探项 + 一票否决项）、唯一性矩阵、30 案全文、字体与配色审计、差异化审计、反 AI 味评分、红队批评、以及针对渲染结果的复核记录。

## 原型是怎么做出来、怎么验的

工具脚本都在 `prototypes/_build/`，是纯 Node + Python，无依赖安装：

| 脚本 | 用途 |
| --- | --- |
| `render-scheme.mjs` | **渲染一个原型并打印闸门结果**（唯一入口） |
| `verify-prototype.mjs` | 机械复核：远程资源、禁用字体、Emoji、断链、图片数、闸门 |
| `summarize-all.mjs` | 汇总全部原型的渲染报告 |
| `collect-schemes.mjs` | 给选型台生成 `data.js` |
| `fetch-fonts.mjs` / `fetch-css-fonts.mjs` | 把字体抓成自托管（Google Fonts 与任意 webfont 包） |
| `selfhost-fonts.mjs` | 把页面里的外链字体替换成自托管 |
| `fetch-scheme-assets.mjs` / `assign-assets.mjs` | 备素材（抓图 / 从已有语料按题材交叉分配） |
| `make-textures.py` | 14 个确定性纹理生成器 |
| `write-credits.mjs` | 从 `credits.json` 汇总出人可读的署名表 |
| `extract-specs.mjs` | 从交付文档里机械切出每一案的 12 字段 |

渲染与质检：

```bash
# 渲染一个原型：三档视口真实截图 + 闸门
node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence

# 机械复核（不带参数则复核全部）
node prototypes/_build/verify-prototype.mjs --all
```

渲染用的是第三方的 **taste-skill**（MIT，[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)），它在本仓库里**没有被 vendor 进来**，请自行安装到 `tools/`。另一件工具 **impeccable**（Apache-2.0，[pbakaus/impeccable](https://github.com/pbakaus/impeccable)）用于规则审计，同样未入库。

30 个原型的当前状态：**26 个闸门 FAIL=0**；`_selection/` 选型台自身也是 FAIL=0。

## 授权与署名

三部分，许可不同，请分别对待：

| 内容 | 许可 |
| --- | --- |
| **本仓库的代码与文档**（`index.html` / `style.css` / `app.js` / `_build/` 脚本 / `deliverables/` / `README` 等） | **MIT**，见 [LICENSE](LICENSE) |
| **字体**（`prototypes/_fonts/`） | 各字体原有许可，绝大多数为 **SIL OFL 1.1**（Noto / IBM Plex / Archivo / Oswald / Syne / Space Mono 等），少数为同类可商用许可。每族的来源与许可见 `_fonts/css/*.css` 文件头的注释 |
| **照片**（各原型 `assets/`） | **第三方素材，不是本仓库授权的**。多为 Wikimedia Commons 的 **CC BY / CC BY-SA / CC0 / 公有领域**，部分为 **NASA 图像**（公有领域） |

**每一张照片的作者、许可与原件链接都逐张列在各原型的 `assets/CREDITS.md` 里。** 若你要复用这些照片，请按那张表逐个核对并遵守其许可（CC BY / CC BY-SA 要求署名，部分还要求以相同方式共享）。**程序化纹理不是照片**，它们由 `_build/make-textures.py` 生成、参数落盘可逐字节复算，无第三方权利。

两件第三方工具（taste-skill、impeccable）**未包含在本仓库中**，请向各自的仓库获取并遵守其许可。

## 已知缺口

写清楚，别让人踩：

- **四个旧原型仍有闸门 FAIL**，其中两处是真的内容偏薄：`S13` 有 3 屏近乎空白；`S21` 页面还没引用已经备好的照片。另两处（`S07` 的等宽数字槽、`S08` 的琥珀主色）是**已知豁免**——那两条规则与中文站／该案材质本来就冲突，理由写在 `_CONTRACT.md` §9.15。
- **题材缺口**：`S28「爵士凹版墙」`的可用语料里没有爵士唱片本身，只能用唱片机与印刷相关素材顶上；`S22`、`S23` 有类似妥协。这些都写进了对应原型的 `CREDITS.md`，页面上也没有把素材说成它是别的东西。
- **`#888888` 灰块**：少数桌面滚动截图（如 `S08` 的 `desktop-page-03`、`S17` 的 `desktop-page-01`）里会出现大片中性灰。这是截图工具的缺陷，**不是页面里真有那块灰**——已在 `deliverables/16-render-look-audit.md` 里复现并定性。
- **`measure` 这条警告对中文是假阳性**：工具按 0.5em 字符宽估算行长，而汉字约 1.0em，所以它报的数字**除以 2 才是真实汉字数**。理由与出处见 `_CONTRACT.md` §9.14。
- 少数原型的 `index.html` 在 30–45 KB，超过施工规范里 18–27 KB 的目标。中文正文本身占的字节就大（四千多汉字约 14 KB），压下去只能靠删内容，所以没有为凑尺寸而删。

---

## English

**A catalogue of 30 distinct website design styles — each with a real, runnable HTML/CSS prototype, all rendered at the same three viewports and collected into one browsable selection bench.**

This is not a mockup set or a template pack. Every prototype is a working page: real typography, real copy, real photos, real error states, and a `prefers-reduced-motion` fallback. Nothing needs building.

- **30** design schemes (15 F-type / 15 R-type), mutually distinct in aesthetic family, layout paradigm, typography, palette and motion
- **30** runnable prototypes · **271** rendered screenshots
- **1** selection bench that lays all 30 schemes and their screenshots onto a single page

**Browse locally** (static, no build, no dependencies — just serve over HTTP):

```bash
npx serve .                       # or: python -m http.server 8080
# then open http://localhost:8080/prototypes/_selection/
```

**Deploy**: any static host works with an empty build command and the repository root as the publish directory — GitHub Pages, Cloudflare Pages, Netlify, Vercel, or plain Nginx. For GitHub Pages, set *Settings → Pages → Deploy from a branch → main → / (root)*.

The repo is around 180 MB (photos, screenshots, self-hosted fonts), so prefer `git clone --depth 1`.

**Licensing**: my code and documentation are MIT. The fonts are self-hosted under their own licences (mostly SIL OFL 1.1). **The photographs are third-party material** — mostly Wikimedia Commons (CC BY / CC BY-SA / CC0 / public domain) plus NASA imagery — and each prototype's `assets/CREDITS.md` lists the author, licence and source URL for every single image. Two third-party tools used during development (taste-skill, MIT; impeccable, Apache-2.0) are cited but deliberately not vendored into this repository.
