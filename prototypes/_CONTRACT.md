# 原型建设契约（新 22 个适用）

> 这份文件是一个原型的完整施工规范。**新 22 个原型必须与已有 8 个在渲染上严格可比**，所以渲染命令、目录布局、尺寸基准、字体与素材来源都是固定的，不得各自发挥。

---

## 1 输入：你要读哪三个文件

| 文件 | 用途 |
| --- | --- |
| `prototypes/_specs/<Sxx>.md` | 该方案的 **12 字段原文**（机械切分自 `deliverables/04|05|06-schemes-*.md`，未改一字） |
| **`prototypes/_specs/_CURRENT-VALUES.md`** | **当前有效色值／字体／错误码。冲突时以它为准。** |
| `deliverables/02-anti-ai-rules.md` | R-01–R-40 反 AI 味条款；建原型时用来避坑（不必逐条读，按需查） |

**必读的顺序是 `_CURRENT-VALUES.md` → `_specs/<Sxx>.md`。** 先看当前值，再读原文，否则会把废弃色值建进去。已经踩过的坑：S04 主色在终局轮由 `#E8871E` 改为 `#96550F`。

参考实现（**强烈建议先读一个**）：
- `prototypes/S17-revenue-stamp-stub/` —— 结构最干净的样本（`index.html` 20 KB ＋ `style.css` 12.7 KB ＋ 5 张真实图）
- `prototypes/S21-interlocking-release-book/` —— 自托管中文字体的样本（72 个 `@font-face`）

---

## 2 输出：目录布局

```
prototypes/<Sxx>-<kebab-english-name>/
  index.html          18–27 KB   （对齐现有 8 个；太短说明内容不足，多半会被闸门判 empty）
  style.css           12–31 KB
  assets/             真实位图，见 §6
  .inspect/           渲染产物，由 §4 生成，不要手写
    desktop-fold.jpg  tablet-fold.jpg  mobile-fold.jpg
    desktop-page-01.jpg ... report.json
```

目录名照现有 8 个的写法：`S01-red-wedge-broadsheet`、`S13-blind-debossed-dispatch` 这样。

---

## 3 渲染命令（唯一，不许换）

```powershell
& 'D:\Nodejs\node.exe' 'D:\Web\style\prototypes\_build\render-scheme.mjs' <原型目录名>
```

它会以 `cwd = D:\Web\style` 调 `tools/taste-skill/skills/taste-skill/scripts/inspect.mjs`，三档视口 **1440×900 / 768×1024 / 390×844**，输出到 `prototypes/<name>/.inspect/`。

**cwd 必须是 `D:\Web\style`，这不是风格问题**：inspect.mjs 起本地 http 服务时以 cwd 为站点根，只有根是整个工作区时，原型里的 `../_fonts/` 共享字体缓存才取得到；若把 cwd 设成原型目录，`../_fonts/` 会返回 403。

---

## 4 字体：用共享缓存，不要 `<link>` 到外网

**硬规则：`index.html` 里不得出现任何指向 `fonts.googleapis.com` / `fonts.gstatic.com` 的 `<link>`。**

现有原型 S17／S08／S13 就是这么写的，后果是**渲染依赖网络、网络一抖字体回退**——这也正是 `font-fallback` 规则在这批语料上触发了 12 次、`earned` 为 0 的原因。新原型不重复这个错误。

做法：

1. 按 `_CURRENT-VALUES.md` 与 `_specs/<Sxx>.md` 字段 4／11 定下字体族与字重。
2. 把需要的族与字重写进 `prototypes/_fonts/` 的抓取（**只需一次，缓存共享**）：

   ```powershell
   & 'D:\Nodejs\node.exe' --use-system-ca 'D:\Web\style\prototypes\_build\fetch-fonts.mjs' --families "Noto Serif SC:400,700" "Literata:400,600" "Sometype Mono:400,600"
   ```

   **`--use-system-ca` 必加**：本机有 TLS 拦截代理，Node 默认拒绝其证书。
3. 它会写 `_fonts/css/<族>__<字重>.css` 与 `_fonts/files/<族>/*.woff2`。
4. 在 `index.html` 里 `<link rel="stylesheet" href="../_fonts/css/<文件名>.css">`（相对原型目录）。

**为什么必须这样**：工作区没有 fontTools、读不到系统 CJK 字体、没有任何中文字体源料，**自行子集化做不到**；而 googleapis 的 css2 端点返回的**本来就是按 `unicode-range` 切好片的 woff2**，形态与 S21 手切的 71 片一致。浏览器按 `unicode-range` 惰性取片，页面用到的字符只会下几片。

**字体里的禁用项**（`font-family` 声明中出现次数必须为 0）：`Inter`、`Roboto`、`Arial`、`Helvetica`、`system-ui`、`-apple-system`、`BlinkMacSystemFont`、`Segoe UI`。回退栈要用真实字体名（如 `Georgia`、`"Noto Serif SC"`），不要用 `system-ui`。

---

## 5 图片素材：必须真实、必须本地

**硬规则：`index.html` / `style.css` 里不得出现任何 `http://` / `https://` 的 `src` 或 `url()`。** 素材一律先抓下来烘焙进 `assets/`。

现有原型的做法可以照抄：

- **S25 的图片**：`prototypes/S25-spotcolor-contents-zine/assets/fetch-assets.ps1` —— 走 Wikimedia Commons API（`action=query&generator=search&gsrnamespace=6&prop=imageinfo`），按关键词搜图、取 1100px 缩略图、**记录署名**。这是真实照片的唯一可靠来源，且许可清晰。
- **位图纹理／印痕**（纸纹、网点、撕边、压痕、油墨不匀）：**用 Python + Pillow 程序化生成**，不要去找素材。范例：`prototypes/S04-mango-collage-wall/build/make-plates.py`、`prototypes/S08-amber-overprint-lightbox/build-assets.py`、`prototypes/S25-spotcolor-contents-zine/assets/fetch-and-bake.py`。Pillow 可用：

  ```
  C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe
  ```

  （numpy 2.3.5、Pillow 12.3.0、pandas 3.0.1 都在）

**要求**：`report.json` 的 `realPictures` 在桌面档 **≥4**（`few-pictures` 规则阈值；SVG 不算图片）。**不要用 SVG 冒充照片。** 图片必须有 `alt`，不得有断链（`brokenImages` 必须为空）。

---

## 6 硬约束（违反即返工）

| 约束 | 说明 |
| --- | --- |
| **无 Emoji 作功能图标** | 扫**渲染文本**（先剥掉 CSS/JS 注释、`<script>`、`<style>`）里的 `U+2600–U+27BF`、`U+2B00–U+2BFF`、`U+1F300–U+1FAFF`，必须为 0。**`U+2190–21FF`（箭头）不算 Emoji**——见 §9.13 |
| **无远程资源** | 见 §4、§5 |
| **无禁用字体栈** | 见 §4 |
| **禁骨架** | 不得出现「居中大标题 ＋ 3 张等量卡片 ＋ 底部 CTA」这一组合。**注意：三栏目录／表格不算"3 张卡片"，但三张视觉等量的功能卡片算。** |
| **无 AI 味渐变** | 紫蓝／粉紫那一类；`gradient` 规则会查 |
| **不用空词** | 赋能／解锁／一站式／无缝体验 等 40 词黑名单，命中 0 |
| **无删减托辞** | 不得写"由于篇幅限制""以下省略""简要描述""不再展开" |
| **标题不得超 2 行** | `headline-lines`：任一标题在任一视口超 2 行即 FAIL |
| **正文不得 <15px** | `body-size`：<15px 直接 FAIL，16–20px 为目标 |
| **不得横向溢出** | `horizontalOverflow` 必须为 0 |
| **必须有错误状态** | 带 `_CURRENT-VALUES.md` 指定的错误码 |
| **必须有 `prefers-reduced-motion` 降级** | 且**不得用"停用/取消/关闭"否掉签名机制**，要写机制在窄屏的再发明形式并带数值 |

**两条工具盲区的提醒**（别被假绿骗了）：
- **没有那个 CSS 属性，就没有那条发现**。用位图或几何做出渐变／阴影／虚线，规则查不到——**但那是规避，不是合规**。该有的视觉就用真手段做。
- `font-count` 对中文站有**结构性下限**：中文主字体 ＋ 拉丁字体 ＋ 等宽数字槽通常就是 3 族，而工具按 2 族为目标。**3 族是 WARN 不是 FAIL，可以接受**，但不要超过 3，也不要去合并中文字体去讨好它。

---

## 7 完成判据（缺一不算完）

1. `index.html` / `style.css` / `assets/` 落盘，且**不含任何远程 URL**。
2. `render-scheme.mjs` 跑通，`FAIL = 0`（WARN 允许，但要在交付说明里逐条解释为什么 WARN 可接受）。
3. `.inspect/` 里有三档 `*-fold.jpg` ＋ 至少 2 张 `*-page-*.jpg` ＋ `report.json`。
4. 交付说明里给出：**FAIL/WARN 计数**、**实际用到的字体族与来源方式**、**素材来源与署名**、**你自己知道的两处最弱的地方**。

---

## 8 已知坑（都被踩过）

1. **不要照 `_specs/<Sxx>.md` 的字段 3／4 直接建**——那是修正前原文，先看 `_CURRENT-VALUES.md`。
2. **`#888888` 灰块是 `inspect.mjs` 桌面滚动截图的工具缺陷，不是你的页面问题**（S08 `desktop-page-03`、S17 `desktop-page-01` 都中过）。如果你的 `desktop-page-0N` 出现大片中性灰，**先怀疑工具**，并在交付说明里报出来。
3. **`--use-system-ca` 必加**，否则 Node 抓字体会因 TLS 拦截代理失败。
4. PowerShell 里 `>` 与 `Out-File` 默认 UTF-16LE，写文本请用 `Set-Content -Encoding utf8` 或交给 Node/Python 写。
5. **不要用 `Select-Object -First N` 截断管道里的外部进程输出**，会让 Node 断言崩溃（`UV_HANDLE_CLOSING`）；先重定向到文件再读。
6. 中文正文里**不要出现半角引号套用**导致的排版断裂；`text-wrap: balance` 只用在标题。
7. **位图素材要有真实分辨率**，别把 300×200 的图拉满 1440 宽——会让页面看起来是色块而不是照片（闸门查不出，人一眼看得出）。

---

## 9 第二轮试点学到的新坑（强制，都由 S01／S02 实战换来）

**9.1 一个方案目录只能有一个写入者。**
S01 与 S02 都出过事故：同一目录两个施工者并发，读-改-写守护只保证"两次调用之间"的一致，一方 `read` 再 `edit` 全部返回成功，但再 `read` 时文件早已换主，**丢失的版本没有快照**。症状识别：`index.html`/`style.css` 的 mtime 比你自己上一次读的还新、`.inspect/report.json` 的 `at` 在你从没跑过的时间点、`build/` 里出现你没写过的脚本名。**发现即停手、留证据、报告，绝不抢写。**

**9.2 整页纹理必须挂伪元素，不能挂 `body`。**
这是**会伪造通过**的一条：探测器 `bgBehind()` 会在祖先链上找到 `background-image` 就整条跳过对比度检查。纹理挂 `body` 会有两个后果——① 所有对比度问题**静默通过**；② `filled`／空屏判定被刷成假的满分，`empty-screens` 规则失去意义。
正确做法：`body` 保持纯色，纹理放 `.sheet::before` / `.panel::before` 这类伪元素上。S01 这么做之后，工具立刻量出并报出两处真实低对比（红底上继承的墨色 2.9:1、铅灰表注 4.39:1）。**"工具没报"不等于"没问题"，可能只是被纹理屏蔽了。**

**9.3 `filter: drop-shadow()` 能合法做出套印错位边，不算 `shadow`。**
`shadow` 规则只查 `boxShadow`。所以 `filter: drop-shadow(-1.5px 1.5px 0 var(--ink))` 既给出错位轮廓、又不触发规则，也不会像 1px 细线那样进 `hairlines`。同理 3px 宽硬边压在 12px 墨条下半（`::after`）不违规。**这是合规手段，不是钻空子**——规格要错位边时优先用它。

**9.4 彩色分区里，继承来的颜色是隐藏的对比度陷阱。**
`.panel{color:paper}` 保护不了里面又写 `color:var(--ink)` 的后代。凡是红底／墨底分区，**必须在自己的作用域里把后代色重新声明一遍**，不要指望继承。

**9.5 `assets/CREDITS.md` 是构建产物，会被别人的脚本无条件覆盖。**
做法：抓取脚本必须把 `artist`/`license`/`origin`/`page` 一起落盘成 `credits.json`；再由**唯一一个** `write-credits.py` 按「页面真实引用 ∪ 抓取落盘的 credits.json」生成 `CREDITS.md`，不要手抄。各自 bake 脚本只写自己目录下的说明文件。

**9.6 `report.json` 的 `at` 字段是"这份报告还算不算数"的唯一依据。**
配合 `index.html`/`style.css` 的 mtime 与 sha256，才能说清"我验证的是哪个修订"。**交付报告里必须写明这三个值。**

**9.7 `familyCount` 只按"声明在最前的字族"统计。**
中文页若把拉丁字面写在正文栈第一位，报告会显示"拉丁 55–86%"，而真正渲染中文的思源宋体根本不进 `families`（只在 `fontsLoaded` 里）。要在 3 族内落位，**必须显式想清楚栈的声明顺序**。

**9.8 `monoProseShare` 必须盯到 0。**
只要有**一处**等宽字族落在 `<code>`／`<pre>` 之外，`mono` 立刻从 WARN 变 FAIL。另外 `_fonts/css/` 里同一字族可能存在多个缓存文件（如 `martian-mono__400-500.css` 与 `__400-600.css` 并存），页面**必须只链一个**。

**9.9 禁用词与禁用字体要按词边界查。**
`Inter` 会命中 `IntersectionObserver`、`Internationale`；`Arial` 会命中 `ArialNarrow`。反向也要查：`关掉／收起来` 一类同义否定也算 R 型要求里被禁的"否定机制"。

**9.10 `sr-only` 只有三种写法能被认出。**
`clip:rect(0,0,0,0)`、`clip-path:inset(50%)`、或 ≤2×2 且 `overflow:hidden`。写成 `opacity:0` ／ `height:0` 会被算进文本统计，可能触发 `eyebrow`／`numbered`。

**9.11 验收时不要只看闸门。**
闸门 FAIL=0 不代表规格对上了。S01 的实际偏离（正文 16px/28px 而规格冻结 15px/1.75、行高没落在自己声明的 6px 基线上、错误态锚点名与落点不一致）**闸门一条都没报**，是逐条对规格才发现的。**每个原型交付时必须自己列出"我知道的两处最弱的地方"。**

**9.12 必需的交互态不能默认 `hidden`。**
S02 的错误态 `BOOK-409` 在 DOM 里但默认隐藏、点击预约才出现，静态截图永远看不到——而评审找的正是"必须有错误状态"。**错误态要在首屏或截图可达的位置有可见入口**（或用 `<details>` 展开、或作为可见的"状态"区块列出），别只留在 JS 分支里。

**9.13 箭头不是 Emoji，禁的是"把字形当功能图标用"。**
初版口径把 `U+2190–21FF`（箭头）也划进 Emoji，结果 S01/S10/S11 三个复核者都在改 **CSS 注释里的 `→`**——注释根本不渲染，那是规则过宽造成的无效劳动。正确口径：
- **要扫的是渲染文本**：先剥掉 CSS/JS 注释、`<script>`、`<style>`，再扫 `U+2600–27BF`、`U+2B00–2BFF`、`U+1F300–1FAFF`。
- **箭头 `→ ← ↑ ↓` 允许**出现在正文、注释、以及"步骤 1 → 2"这类流程表意里。
- **只有当箭头作为独立按钮/导航的功能图标**（例如一个只有 `→` 的「下一页」按钮，且旁边没有文字标签）时才算违规。

**9.14 工具的字符宽度假设是 0.5em，对中文会把行长算成两倍。**
`probe.mjs:447` 是 `measureChars = 宽度 / (字号 × 0.5)`。它假设一个字符平均占 0.5em —— 那是拉丁字母的假设，**中日韩汉字实际约 1.0em**。后果：任何一行中文只要超过约 68 个汉字，就会被算成 136 并触发 `measure` FAIL/WARN（"Cap paragraphs at 45–75 characters"）。
**判别方法**：把工具报的数字除以 2，就是真实的汉字数。落在 45–75 之间就是合规的。
实测例：选型台报 136 → 真实约 68 汉字/行，**在工具自己的目标区间内**。S14 报 107 → 真实约 53。
**不要把 `measure` 当成中文页的真实缺陷**，也不要去为了它把中文段落压到 34 个汉字宽——那会把版心做坏。

**9.15 四条对中文站结构性不利的规则（已知，按"报告原始值 + 说明豁免理由"处理，不要靠改设计去讨好）。**
| 规则 | 为什么在本语料上必然触发 | 处理 |
| --- | --- | --- |
| `mono` | 30 案的字段 4 都规定了"辅助数字用等宽字族"（编号、时刻、页码、尺寸），这些都在 `<code>` 之外 | 保留等宽槽；报告原始 FAIL 并说明 |
| `font-count` | 中文主字体 + 拉丁字体 + 等宽数字槽 = 3 族是下限，工具目标是 2 | 3 族可接受；**不要为了它去合并中文字体** |
| `font-fallback` | 只检查"已声明且已加载"的族；凡是声明了却没随包发布的都会命中 | 这条**永远不可能 earned**；把死声明删掉（S08 的 `KingHwa_OldSong` 就是这么修的） |
| `measure` | 见 §9.14 的 0.5em 假设 | 把报数除以 2 再判断 |

**9.16 一条会伪造通过的做法：整页纹理挂 `body`。**
见 §9.2。它会让 `contrast` 与 `empty-screens` 双双失真。凡是要交出去的原型，纹理一律挂伪元素。

---

## 10 【环境事实】本机到图源的可达性（2026-10-18 实测）

**这不是配置问题，是硬约束。** 2026-10-18 04:15 之后，能检索的图源在本环境**全部不可用**：

| 主机 | 现象 |
| --- | --- |
| `commons.wikimedia.org` / `upload.wikimedia.org` / `www.wikidata.org` / `en.wikipedia.org` | `ECONNRESET`（40–49 秒后）或 30 秒连接超时；**连发 10 次成功率 0/10** |
| `archive.org` / `ia*.us.archive.org` | `ETIMEDOUT` |
| `api.openverse.org` / `openverse.org` / `duckduckgo.com` | `ETIMEDOUT` |
| `www.loc.gov` / `tile.loc.gov` / `picryl.com` / `www.pexels.com` / `pixabay.com` | **HTTP 403 + 约 5KB 的拦截页**（换浏览器 UA 也一样） |
| `iiif.wellcomecollection.org`（Europeana 的图源之一） | HTTP 403 |
| `collectionapi.metmuseum.org` 的 search 端点 | HTTP 410（已下线）；`objects/<id>` 仍可用 |

**仍然可用的**：

- **`images-api.nasa.gov` / `images-assets.nasa.gov`** —— 唯一还能**检索 + 下载**的真图源。题材偏航天、地球观测、地面设施；适合工业／仪表／设施类方案，**不适合"和纸""爵士唱片"这类题材**。
- `images.unsplash.com`、`images.pexels.com`、`cdn.pixabay.com`、`images.nypl.org` —— 只认**直链**、不给检索；没有 API key 就无法发现图片地址。
- `fonts.googleapis.com` / `fonts.gstatic.com` —— **正常，1 秒内响应**。所以**字体自托管这条路始终是通的**（抓 110 个 woff2 分片只要 8 秒）。

**因此建原型的正确姿势**：

1. **素材与页面分开做，素材用确定性脚本，别交给会自由发挥的 agent。**
   - `_build/fetch-scheme-assets.mjs` —— 按配置表抓真图 + 生成纹理 + 写署名（图源可用时用）
   - `_build/assign-assets.mjs` —— **图源不可用时的兜底**：从工作区**已有语料**（209 条真实照片，带原始署名）按题材交叉分配，不足的用 NASA 补；`--redo` 可清掉重配
   - `_build/make-textures.py` —— 14 个确定性纹理生成器（grain / scanlines / grid / halftone / streak / blotch / fiber / flake / crease / band / misreg / rule / groove / vignette），参数写在 `build/texture-job.json`，可逐字节复算
2. **然后只让 agent 写页面**（`page-batch-*` 那套）。页面阶段不需要网络。
3. **绝对不要用生成图冒充照片。** 交叉复用的照片照实署名并注明"原本为哪个方案抓取"；程序化产物一律叫纹理，`CREDITS.md` 里写明"生成物，非照片"。**题材对不上时（例如语料里没有爵士唱片）要在 CREDITS.md 里写明这个缺口**，不要假装对上了。

**教训（与 §9.1 同源）**：素材是确定性劳动，页面才需要设计判断。把确定性劳动交给 agent，它会无休止地自我迭代——实测 S15 的素材 agent 在素材早就够用之后又空转了一小时，两个修版 agent 也各自卡在同一个图上。

**另一个必须知道的坑**：多数 `credits.json` 是 PowerShell 写的，**带 UTF-8 BOM**，`JSON.parse` 会直接抛 `Unexpected token '﻿'`。读的时候一律先 `.replace(/^\uFEFF/, '')`（Python 侧用 `encoding="utf-8-sig"`）。我的语料索引第一版就是因为这个，把 S01／S14／S15 等一大批方案的素材全漏掉了，而表象看起来像"标题对不上"。

---

## §9.17 闸门陈旧度：任何闸门规则都发现不了的缺陷

**改了原型之后忘了重渲染，选型台与 `data.js` 就会展示「旧修订」的闸门结果与截图。**

它已经造成过 **三次**独立缺陷（AH-11 的 `data.js` 残留 S21 旧闸门、AH-14 的 S14 报告过期、N1 的 S13 报告落后 993 分钟），
而**任何闸门规则都发现不了它**——闸门只查 `report.json` 的**内容**，不查它有多**旧**。

**对策：`prototypes/_build/check-stale.mjs`**。判据是「任一案的 `index.html` / `style.css` 的 mtime 比它的
`report.json.at` 新超过 1 分钟」，退出码 1 可接进提交前检查。首次运行立刻命中 2 案（S13 落后 993 分钟、S14 落后 11 分钟）。

**任何一次改完原型之后，提交前都应该跑一次它。** 三个命令构成一条完整链路：

```powershell
node prototypes/_build/render-scheme.mjs <案目录>   # 重渲染
node prototypes/_build/collect-schemes.mjs          # 重新生成 data.js
node prototypes/_build/check-stale.mjs              # 确认没有其他案陈旧
```

## §9.18 临时取证目录会被清理，证据必须内联进报告正文

**实测：审查中途临时目录被整体清理过至少一次**，同批消失的有 `_crit4` / `_crit4b` / `_crit6` / `_crit7b` / `_crit8` / `_crit10` / `_crit11` / `_crit12`。

**已经因此损失过四次证据**（四个 agent 各自独立撞上，说明是环境行为不是操作失误）：

| agent | 丢了什么 |
| --- | --- |
| 跨视口几何测量员 | `_crit3/ledger.json`（134 KB 台账），导致对账员做不了逐标量机械对账 |
| 误报驳回员 | 第一轮 7 个探针脚本与中间 JSON |
| 对账裁决员 | `_crit8b/` 的脚本与 JSON |
| 设计同质性审查员 | **`_crit6/` 的 26 张判读图**，导致它 §3 的目视证据**至今不可复看** |

**硬要求：凡是要写进结论的数字与图，必须内联进报告正文。**
**"存在临时目录里"不算存证。** 报告交回后临时目录随时可能消失。

**反过来说：如果你的结论只存在于临时目录的某个 JSON 里，那么这条结论等于没做。**

## §9.19 量错了对象：本项目最高发的 Lead 级错误

**"数量算对了，但量错了对象"** —— 这个模式在项目里出现过至少五次，每次都不是算错，是**取错了东西**：

| 实例 | 数量对不对 | 取错了什么 |
| --- | --- | --- |
| `21-lead-verify-homogeneity.md` 的底色 | 对 | 脚本在找不到 `body` 背景时**回退到"名字像底"的 `:root` 变量**，对 S03/S18/S28 抓到了文字色与分段地面 → S28 被误判进暖浅色带 |
| 选型台的 `scenes` 搜索 | 对（命中数） | 把「适合…**不适合：**…」整串索引，**正负两段一起进了** → 搜"政务"7 条全是"不适合政务" |
| README 的暖浅色带百分比 | 对 | 用了**另一个分母**（19/26 而非 18/30） |
| 同质审查的缩略图判读 | 对（ΔE76 15/15 被 CIELAB 复算验证） | 按 **155px** 判读，而桌面首屏在选择台上是 **316×197.5**（那两个 155px 位置是平板/手机首屏）→ 核心视觉结论建立在一个不存在的尺度上 |
| 修 `.scenes` 那一次 | 对 | **只测了命中数、没测命中的落在正段还是负段** |

**通用对策：报任何一个"数量"之前，先回答三个问题** ——
① **分母是什么**（哪个集合、多少案）？② **分子是从哪里取的**（哪条字段／哪种口径／哪个尺度）？③ **换成另一种口径会不会翻转结论**？

三问里任何一问答不上来，这个数字就先别写进结论。