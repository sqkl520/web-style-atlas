# 方案质量勘察（SCHEME-QUALITY）— 30 套原型

测量口径：Node 脚本直接读盘（`deliverables/74-recon/_census.mjs`），对 `prototypes/S01-*` … `S30-*` 全量 30 套，非抽样。
CSS 统计先剥 `/* */` 注释；`CSS rules` = `{` 总数 − at-rule 块数；`:root props` = 所有 `:root{}` 块内 `--x:` 计数。

## 1 结构普查（30/30 实测）

| scheme | index.html B | style.css B | CSS rules | :root props | @media | mobile bp | ext font | self-host | assets files | real imgs | .inspect shots | report.at |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S01-red-wedge-broadsheet | 19604 | 22090 | 202 | 21 | 4 | 3 | no | YES | 10 | 9 | 7 | 2026-10-30 21:09 |
| S02-gilded-symmetry-salon | 26305 | 21613 | 177 | 15 | 6 | 4 | no | YES | 29 | 26 | 8 | 2026-10-30 21:04 |
| S03-long-exposure-observatory | 21154 | 16316 | 131 | 14 | 6 | 5 | no | YES | 12 | 10 | 7 | 2026-10-23 23:25 |
| S04-mango-collage-wall | 20209 | 15755 | 153 | 12 | 7 | 5 | no | YES | 31 | 26 | 9 | 2026-10-23 20:55 |
| S05-pixel-cold-storage-console | 26142 | 23389 | 187 | 13 | 4 | 3 | no | YES | 18 | 16 | 6 | 2026-10-17 06:08 |
| S06-showa-kissaten-ledger | 26554 | 19870 | 185 | 28 | 4 | 2 | no | YES | 25 | 21 | 9 | 2026-10-17 02:27 |
| S07-slate-ink-contents | 21073 | 14104 | 139 | 12 | 4 | 3 | no | YES | 14 | 9 | 9 | 2026-10-29 09:05 |
| S08-amber-overprint-lightbox | 20724 | 15758 | 144 | 17 | 5 | 3 | no | YES | 9 | 6 | 10 | 2026-10-30 18:26 |
| S09-batik-price-board | 20558 | 22256 | 174 | 25 | 3 | 2 | no | YES | 26 | 24 | 11 | 2026-10-17 12:40 |
| S10-grid-versus-sheet | 26551 | 27098 | 278 | 31 | 6 | 4 | no | YES | 26 | 16 | 8 | 2026-10-17 03:25 |
| S11-samizdat-typewriter | 26479 | 26207 | 204 | 22 | 6 | 4 | no | YES | 13 | 11 | 10 | 2026-10-24 08:53 |
| S12-lime-knockout-wall | 19394 | 23270 | 199 | 20 | 6 | 4 | no | YES | 12 | 10 | 8 | 2026-10-30 20:19 |
| S13-blind-debossed-dispatch | 26621 | 42845 | 187 | 29 | 14 | 11 | no | YES | 14 | 10 | 8 | 2026-10-29 09:06 |
| S14-zero-g-launch-sequence | 32757 | 20700 | 192 | 0 | 5 | 4 | no | YES | 36 | 33 | 10 | 2026-10-24 08:29 |
| S15-fishery-floor-ledger | 42523 | 32378 | 296 | 6 | 9 | 7 | no | YES | 24 | 21 | 10 | 2026-10-24 08:30 |
| S16-velocity-slant-manifesto | 21944 | 26549 | 192 | 35 | 6 | 4 | no | YES | 11 | 9 | 10 | 2026-10-19 01:42 |
| S17-revenue-stamp-stub | 20294 | 12669 | 121 | 16 | 5 | 3 | no | YES | 6 | 5 | 8 | 2026-10-23 19:03 |
| S18-phosphor-service-deck | 42100 | 24477 | 258 | 20 | 4 | 3 | no | YES | 11 | 9 | 10 | 2026-10-26 16:47 |
| S19-copperplate-herbarium-cabinet | 37528 | 27971 | 219 | 20 | 5 | 4 | no | YES | 11 | 9 | 10 | 2026-10-24 08:31 |
| S20-plotter-soundfield | 36695 | 21817 | 211 | 5 | 5 | 3 | no | YES | 11 | 9 | 10 | 2026-10-24 08:32 |
| S21-interlocking-release-book | 35432 | 38512 | 168 | 14 | 4 | 3 | no | YES | 66 | 48 | 8 | 2026-10-29 09:04 |
| S22-paper-screen-folded-sheet | 31162 | 32910 | 248 | 43 | 7 | 6 | no | YES | 11 | 9 | 10 | 2026-10-24 08:57 |
| S23-exposed-plaster-chronology-wall | 34764 | 34506 | 276 | 12 | 5 | 4 | no | YES | 11 | 9 | 10 | 2026-10-23 21:11 |
| S24-cyanotype-rainforest-path | 37872 | 26388 | 249 | 24 | 5 | 3 | no | YES | 10 | 8 | 10 | 2026-10-30 21:06 |
| S25-spotcolor-contents-zine | 26279 | 16627 | 196 | 16 | 5 | 3 | no | YES | 9 | 5 | 9 | 2026-10-23 18:59 |
| S26-geometric-collision-columns | 33864 | 22820 | 211 | 30 | 7 | 5 | no | YES | 11 | 9 | 10 | 2026-10-23 18:59 |
| S27-hand-painted-bill-dispatch | 42474 | 34646 | 287 | 16 | 5 | 3 | no | YES | 12 | 10 | 10 | 2026-10-25 03:03 |
| S28-jazz-intaglio-wall | 44985 | 39129 | 375 | 15 | 5 | 3 | no | YES | 11 | 9 | 10 | 2026-10-25 02:58 |
| S29-wire-bound-safety-manual | 49596 | 21097 | 247 | 17 | 5 | 3 | no | YES | 11 | 9 | 10 | 2026-10-24 08:37 |
| S30-skate-sticker-split | 28114 | 25338 | 247 | 10 | 7 | 6 | no | YES | 11 | 9 | 10 | 2026-10-25 00:45 |

合计：index.html 899,751 B（878.7 KB）；style.css 749,105 B（731.5 KB）。平均数 index 29,992 B、css 24,970 B。

**读表要点**
- 外部字体 0/30：无人 `<link>` Google Fonts，30/30 走 `_fonts/` 自托管。契约 §4 的硬规则真正落地了。
- `:root` 令牌数跨度 0–43，中位数 17。S14 是 0（令牌不在 `:root`，见 §4 判读）、S15 是 6、S20 是 5 —— 低值三案是"令牌往下沉到组件作用域"的写法，不必然是缺陷，但和"设计系统"的说法距离很远。
- assets 文件数跨度 6–66。S21 的 66 个是 71 片 CJK 子集 woff2 落在 assets/ 内（契约 §1 提到的样本），不是 66 张照片；真实位图 48 张。

## 2 一致性：违反仓库自定约定之处（全部实测，带数）

约定来源：`prototypes/_CONTRACT.md` §2（index 18–27 KB / css 12–31 KB）、§4（禁外链字体）、§5（禁远程 src/url()）、§6（无 Emoji 功能图标、必须有错误状态、必须有 `prefers-reduced-motion` 降级）。

### 2.1 CSS 超 31KB（7 案）
| 案 | style.css | 超出 |
|---|---|---|
| S13-blind-debossed-dispatch | 42,845 B = 41.8 KB | +10.8 KB |
| S28-jazz-intaglio-wall | 39,129 B = 38.2 KB | +7.2 KB |
| S21-interlocking-release-book | 38,512 B = 37.6 KB | +6.6 KB |
| S23-exposed-plaster-chronology-wall | 34,506 B = 33.7 KB | +2.7 KB |
| S27-hand-painted-bill-dispatch | 34,646 B = 33.8 KB | +2.8 KB |
| S22-paper-screen-folded-sheet | 32,910 B = 32.1 KB | +1.1 KB |
| S15-fishery-floor-ledger | 32,378 B = 31.6 KB | +0.6 KB |

7 案越界。若只算显著越界（>33KB）是 **5 案**：S13 / S21 / S27 / S28 / S23。

### 2.2 index.html 出 18–27KB 带（14 案）
**低于 18KB：0 案**（最短 S12 19,394 B）。
**高于 27KB：14 案**：
S29 49,596（48.4 KB，+21.4）· S28 44,985（43.9，+16.9）· S27 42,474（41.5，+14.5）· S15 42,523（41.5，+14.5）· S18 42,100（41.1，+14.1）· S19 37,528（36.6，+9.6）· S24 37,872（37.0，+10.0）· S20 36,695（35.8，+8.8）· S21 35,432（34.6，+7.6）· S23 34,764（33.9，+6.9）· S26 33,864（33.1，+6.1）· S14 32,757（32.0，+5.0）· S22 31,162（30.4，+3.4）· S30 28,114（27.5，+0.5）。
带内 16 案。**这条带只对上 8 个试点案有用**：后 22 案按契约"新 22 个适用"本应同带，实际 14/30 越上界，说明这条体积带在真实写作里已经不成立，不是偶发。

### 2.3 内联 `style=` 属性（16 案、合计 251 处）
S23 41 · S17 27 · S24 27 · S19 24 · S14 22 · S02 18 · S21 14 · S30 13 · S04 12 · S10 12 · S09 11 · S16 9 · S03 8 · S08 6 · S18 4 · S20 3。其余 14 案为 0。
口径：`index.html` 中 `\sstyle\s*=\s*["']` 的匹配次数。契约里没有明文禁止内联 style，但 §3 之后所有样式都应进 `style.css`（否则"CSS 规则数"这类闸门统计会漏掉这 251 条声明）。S17 是最坏的样本：27 处内联 style 对 121 条 CSS 规则，等于五分之一的样式游离在样式表外。

### 2.4 `<script>`（30/30 全有）
没有一套原型是纯 HTML/CSS。分布：内联脚本 1 个的 15 案；2 个的 15 案（其中多数第二个是 `document.documentElement.classList.add('js')` 这类一行探针）。唯一的**外链**脚本是 `S07-slate-ink-contents/index.html:173` → `app.js`（仓库内文件，非远程）。
判断：仓库没有任何"原型不得有 JS"的成文约定；相反 §6 要求"必须有错误状态""必须有 `prefers-reduced-motion` 降级"，S02 的错误态就是靠 JS 切类名（契约 §9.12 明说这一点）。**所以"有 script"本身不算违规**；真正的账是"签名机制的可见性是否依赖 JS"（见 §4 对 S15/S29 的判读）。

### 2.5 结构性缺口
- `lang` 属性：30/30 存在，取值两种 —— `zh-Hans`（24 案）、`zh-CN`（6 案：S03/S04/S08/S13/S21/S25）。两种都合法，但不是统一约定。
- `<h1>`：30/30 恰好 1 个。**零缺陷。**
- `<img>` 缺 `alt`：30/30 = 0 处。**零缺陷。**（共 242 个 `<img>`）
- `prefers-reduced-motion`：30/30 有。**零缺陷。**
- `:focus` / `:focus-visible` 规则：30/30 有，但 S03/S20/S22/S23/S27 只有 1 条 —— 单条无法覆盖链接、按钮、表单三类可聚焦元素（见 §4 对 S29/S21 的逐项判读）。
- 有 `@media` 但无 `width` 断点：0 案（每案的 media 数都 ≥ mobile 断点数，最小 S06/S09 是 4 条里 2 条带宽度条件）。
- 无 `assets/` 目录：0 案；无 `.inspect/report.json`：0 案。**产物完整性 30/30。**

### 2.6 目录卫生（契约 §2 未写、但明显是残留）
7 案在原型根目录留了 `index.html.bak-fonts` 备份：S03 / S04 / S08 / S13 / S17 / S21 / S25。
另有脚本残留在原型目录内：S03（`check-palette.mjs`、`make-masks.mjs`、`measure-area.py`、`verify.mjs`）、S08（`build-assets.py`）、S13（`_fillmap.mjs`、`_plate.py`）、S27（`_fontfetch.log`）。
契约 §2 的目录布局只有 `index.html / style.css / assets/ / .inspect/`，这些都在布局之外。

---

## 3 五个抽样案的逐案判读

抽样：S01 / S07 / S15 / S21 / S29（契约 §1 点名的参考实现 S21 在列；S01 是最早的试点；S15、S29 是体积最靠上界的两个）。判断基于把 `index.html` 与 `style.css` 逐行读完；CSS 特征由 `_cssquality.mjs` 机器统计佐证。

### S01 红黑斜排报 — 真正的工程，但注释比机制更诚实

**结论：够得上"真做"，不是散文配大 CSS。** 它是五案里唯一把签名机制的几何量直接在 CSS 注释里写成可复核数字的：`style.css:145` 的 `clip-path: polygon(42% 0, 73.6% 0, 45.6% 89.3%)`，注释 `style.css:131-134` 给出 11° 的推导（左边缘从顶端 (42%,0) 下到 (45.6%,89.3%)），`style.css:451` 在 390px 档换成 `polygon(0 90%, 100% 0, 100% 100%, 0 100%)` 并注明"上抬 75.6px ≈ 11°"。

- **语义 HTML：优。** `<main>/<header>/<footer>/<article>` 齐全；四栏用 `<article class="col">`（`index.html:43/60/76/95`），制版单是真 `<table>` 带 `<caption>` 与 `scope="col"/"row"`（`index.html:145-156`）；折角导读用 `<button aria-expanded aria-controls>`（`index.html:97/105`），不是 div 加 onclick。`<a class="skip">` 在 `index.html:14`。
- **CSS 系统性：良。** `:root` 21 条（4 色 + 3 字族 + 7 尺寸 + 曲线），字号全走 `--fs-*`，`clamp()` 4 处，grid 5 处。但只有 4 个色令牌，`.fold-panel::before` 的 `opacity:.5`、`.fold-corner::before` 的 `rgba(26,22,20,.55)`（`style.css:291`）都是硬编码字面色——令牌化到颜色就停了。`--f-latin` 写成 `"Archivo","Noto Sans SC",sans-serif`（`style.css:19`），混了中文族做拉丁回退，能跑但语义不干净。
- **特异性卫生：好。** 最高 `0,3,1`（`.fold-item[aria-expanded="true"] .fold-s::after`），**选择器里 id 出现 0 次**。`!important` 10 处，全部集中在 `@media (prefers-reduced-motion: reduce)` 块内（`style.css:485-498`）——合理用法，不是补丁式覆盖。
- **现代布局：有。** grid 5 / flex 3 / `gap` 7 / `clip-path` 6 / `text-wrap:balance` 1 / `font-stretch:63%`（真用了可变字体的宽度轴，`style.css:68`）。`box-shadow:0`、`drop-shadow:0`、`gradient:0`——契约 §6 禁阴影是真遵守的，连合规的 `drop-shadow` 都没用，而是用多一层 `.wedge-mis` 元素整体 `translate(-1.5px,1.5px)` 做套印错位（`style.css:142-153`），注释解释了为什么不能用 `drop-shadow`（clip-path 会把投影一起裁掉）。这是懂 CSS 的人才写的取舍。
- **签名机制是否真实现：是。** 11° 楔形（clip-path + 实数）、24px 铅条（`--bar:24px` 直接做 grid 列，`style.css:195`）、96×96 折角 + 1px 压痕 + 0.5px 高光（`style.css:276-296`，压痕是 `transform:rotate(45deg)` 的 1px 条，高光 `height:0.5px`）。三个机制都在 CSS 里。
- **最弱处：** ①`style.css:263-270` 把"⚠️ 这一行原本漏了"的过程性注释留在交付物里，说明红底上 `--ink` 文字曾只有 2.87:1，靠补 `.col-head-red .col-meta{color:var(--paper)}` 修掉——修得对，但把事故记录写进 CSS 是这批原型的普遍病（S07 也有 6 行同类，`style.css:169-175`）。②`--lead` 铅灰对纸底实测 **4.40:1**（§4），被用作 `border-top:1px` 与 `.lead-bar` 底色；`style.css:320` 的注释自己写着"铅灰只做结构色，不做文字色：4.4:1 不够"——设计阶段就把一个 4.4:1 的颜色放进令牌表，靠"不用它写字"规避，而不是把它压深到 4.5 以上。

### S07 铅灰油墨目录 — 最省 CSS，机制/代码比最高

**结论：真做。14KB CSS 做出 8 个可复核机制。**

- **语义 HTML：良，有一处倒退。** `<nav aria-label>`、`<main>`、`<header>`、`<footer>` 齐全；目录是两段 `<ol class="toc">`（`index.html:40`、`index.html:63`），跨页第 19 条起用 `<ol start="19">`——真把跨页连续编号当 HTML 语义问题解了，不是手写数字。`<dl class="colophon">` 用 `<dt>/<dd>` 配对。**倒退**：`index.html:161` 的 `role="link" aria-disabled="true" tabindex="-1"` 三条并写自相矛盾（不该被聚焦的链接，语义上该是 `<span>` 或 `<button disabled>`）。
- **CSS 系统性：好，但是局部令牌而非全局令牌。** `:root` 12 条：4 色 + 4 度量（`--module:62px/--gutter:18px/--base:7px/--lead:28px`）+ 3 字族 + 1 曲线。基线关系被写成 `calc(var(--base)*4)`（`style.css:93/130` 等 6 处）——真基线网格，`--lead:28px` 可由 `--base:7px` 整除。
- **特异性卫生：中。** 最高 `0,3,3`（`.toc li a:hover .d::after`），id 选择器 0 次，`!important` **0 处**。`style.css:169-175` 用 8 行注释记录一次真实故障（"原本只写 `.toc{column-count:1}`，特异性 (0,1,0)，而 ≤1279 的 `.page-recto .toc{column-count:3}` 是 (0,2,0)，特异性高的赢，与媒体查询先后无关"）——**全批唯一把 CSS 层叠规则讲对的调试记录**，修复方式（三个选择器并列）也正确。但同时说明是撞上才修，不是一开始按层级前缀规约写。
- **现代布局：中上。** grid 6 / flex 5 / `column-count` 4 处（本案核心排版手段）/ `mask-image` 2 处（页边毛口用真实扫描件当遮罩，`style.css:113`）/ `text-wrap:pretty`。无 container query。
- **签名机制是否真实现：是，而且是五案里最难伪造的。** 透印层：`index.html:94` 只有一个空 `<svg class="ghost">`；`app.js:24` 用 `transform: translate(W,1) scale(-1,1)` 生成真实镜像文本——它读 `.toc li` 的几何位置逐行写 `<text>`（`app.js:36-39`），不是 CSS 镜像一个 div。不透明度锁 8%–14%：`style.css:106` 的 `opacity:var(--ghost-o,.08)`，`app.js:48` 按滚动位置把 `--ghost-o` 从 0.08 推到 0.14。引导点：`style.css:90` 用 4×4px 的 SVG data-URI 平铺 1.5px 方点，`style.css:91` 的 `.d::after` 是 0.75×1.5px 的半点（0.75 = 1.5 的 50%）——字段 12 的"行末半点宽 50%、距右边界 2px"逐字实现了。
- **最弱处：** ①`index.html:37` 把 `<p class="list-head" id="list-head">` 塞进 `<details class="spec">`，而 `aria-labelledby="list-head"` 指向它——屏幕阅读器读区块名要先展开折叠区。②`index.html:103` 的 alt 与 figcaption 高度重复，没有信息增益。

### S15 渔场平面簿 — 最厚的一案：机制真实，叙事密度压垮语义

**结论：真做，但是"过度生产"的典型。** 42,523B 的 HTML 里，内容机制（三层硫酸纸 + 14 热区 + 铅笔线宽）与说明书式的自我描述（`<section class="spec">` 与 `<section class="motion">`，`index.html:346-399`，共 54 行）几乎等量。

- **语义 HTML：优的位置很优，怪的位置很怪。** 优：`<aside class="legend" aria-labelledby>`（`index.html:200`）、`<table>` 带 `<caption>` 与 `scope`、14 个热区用 `<a href="#z-B-3">` 包住 `<rect>/<text>`（`index.html:139-152`）——**可聚焦的 SVG 热区**，键盘能 Tab 到；SVG 用 `<symbol>` + `<use>` 复用，不是复制 14 份路径。怪：`<svg class="sprite">` 从 `index.html:18` 开到 `index.html:97`，**80 行 symbol 定义插在 `<body>` 最前**，把第一个可读元素（`.strip` 状态条）推到第 99 行；`index.html:88-91` 的 `<symbol id="p-sound">` 里放的是装饰性文本数字（4.2/3.8/5.1…），屏幕阅读器不可读，而同一信息在 `index.html:258` 的 `<details>` 里又以文字复述一遍——信息重复、语义分裂。
- **CSS 系统性：差。** `:root` **只有 6 条**（4 色 + `--trace36` + 1），全批第二低（最低 S14 = 0）。字号、间距、线宽几乎全是字面值：`0.8px` 出现 20+ 次、`1.2px` 10+ 次、`32px/40px/20px` 到处硬编码。CSS 规则 296 条（全批第二多），**但没有尺寸刻度**。它有一个真实的"线宽配线表"（`index.html:356-367`，四级线宽 0.5/0.8/1.0/1.2px），但那张表只存在于 HTML 说明文字里，CSS 里没有对应变量——用散文描述设计系统，用字面值实现设计系统。
- **特异性卫生：好。** 最高 `0,4,0`（`.stack.is-cued .hot .edge`），id 选择器 **0 次**，`!important` 2 处。
- **现代布局：好。** grid 14 / `minmax()` 4 / `gap` 22 / `mix-blend-mode` 3——三层硫酸纸的"交叠处亮度降低"是 `mix-blend-mode:multiply` 真算的（`style.css:176`），并用 `isolation:isolate` 把混合范围锁在图幅内（`style.css:162`）。这是全批最正确的一次 mix-blend-mode 用法。
- **签名机制是否真实现：是，数值可核。** `style.css:171-173`：`.trace--1934{--op:1;--off:0px}` / `.trace--1936{--op:var(--trace36);--off:3px}` / `.trace--1938{--op:0.56;--off:7px}`。错位 0/3/7px、不透明度 100%/56%、缺页层 30%（`style.css:21`）——字段 1 与字段 8 的每个数都在 CSS 里。热区不等量不等距（14 个 `<a>` 的 x/y/w/h 各不相同）。擦痕 `fill-opacity:0.12`（`style.css:202`）对上"12% 浅底"。
- **最弱处：** ①`--trace36` 是唯一被 JS 改写的令牌（`index.html:481` `doc.style.setProperty('--trace36','0.78')`），却与 `--op` 混在同一个 `:root` 里。②`index.html:112` 的 `<details class="spec">` 里写"主色对底 8.83:1"——我复算 **8.83:1 完全正确**（§4）；但同一格式在 S07/S29 也出现，形成"每案在页面里自证对比度"的惯例，而 S29 的自证数字与实测对不上（见下）。

### S21 联锁释放簿 — 规模最大，机制最硬，a11y 有一处实伤

**结论：真做，且是五案里"机制 = 几何"最硬的一案。** 71 条 `@font-face` 承载 455 个汉字子集（`style.css:12-82`），`style.css:1-11` 把授权（SIL OFL 1.1）、上游（github.com/takushun-wu/WenJinMincho）、体积（163.3 KB / 预算 300 KB）、构建方式（按页面实际字符逐片裁切）全写明——全批唯一一份把字体许可与子集化预算写进 CSS 的。

- **语义 HTML：优。** 两个 `<table>`（道岔/信号）各带 `<caption>` 与 `scope="col"/"row"`（`index.html:72-80`）；号牌用 `<button data-flip aria-label="道岔 1 号号牌，按回车翻转查看锁别号">`（`index.html:83`），每个 aria-label 都写明操作后果；时段选择用真 `<fieldset><legend>` + `<input type="radio">` + `<label>`（`index.html:57-62`），3 input 对 3 label，无孤立 input；互斥清单用 `<button aria-expanded aria-controls>` + `<ul hidden>`（`index.html:390`）。
- **CSS 系统性：优。** `:root` 14 条每条带用途注释（`--paper` 注"值班室硬纸，长期琥珀灯照后泛黄，H42.2 L84.1"，`--ink` 注"与纸底 8.27:1"）。`--baseline:6px` 被 `calc(var(--baseline)*N)` 用了 30+ 次——全批最彻底的一次基线网格。
- **特异性卫生：优。** 最高 `0,3,0`（`.lockbar.is-key .lockbar__no`），id 选择器 **0 次**，`!important` **0 处**，`minmax()` 15 处。
- **签名机制是否真实现：是，角度是算出来的。** 字段 6 要求切口按互斥对数分 30°/45°/60° 三档，三档水平进深 41.6 / 24.0 / 13.9 像素（`index.html` 角度表第四列）。`style.css:559-561`：
  ```
  .cut-30{clip-path:polygon(0 0,56.7% 0,100% 100%,0 100%)}
  .cut-45{clip-path:polygon(0 0,75% 0,100% 100%,0 100%)}
  .cut-60{clip-path:polygon(0 0,85.57% 0,100% 100%,0 100%)}
  ```
  条高 24px：tan30=0.577→24/0.577=41.6px ✓；tan45=1→24px ✓；tan60=1.732→13.9px ✓。百分比是 `(96−进深)/96`：54.4/96=56.7% ✓；72/96=75% ✓；82.1/96=85.5% ✓。**三档角度、三个进深、三个百分比，六个数完全自洽。** 这是我核过的所有签名机制里唯一能反算回原始设计参数的。条尾墨点 `right:calc(3.5px - (var(--i)+1)*.25px)`（`style.css:577-585`）把字段 12 的"每枚偏 0.25px、14 枚累计 3.5px"落成公式。
- **最弱处——一处实伤：** `style.css:545` `.lockbar{outline:none}`。全案唯一焦点样式是 `style.css:148` 的 `:focus-visible{outline:2px solid var(--amber)}`（元素选择器，0,1,0）。`.lockbar` 也是 0,1,0 且在 L545 更靠后，**类选择器胜出**：14 枚锁闭条 + 4 个 demo 条（`.lockbar` 全部由脚本赋 `tabindex="0"`）被键盘聚焦时**没有任何可见焦点指示**。这是 WCAG 2.4.7 失败。作者想用 `.is-hovered .lockbar__body` 的两层 inset 阴影替代焦点框（`style.css:588-591`，`focus` 事件里加 `is-hovered`），但那是 24px 高深色条内部的描边，视觉上几乎不可辨，`outline:none` 又去掉了浏览器兜底。
- 次弱：`index.html:390` 的互斥清单按钮同时改 `aria-expanded` 与文案（"查看…"↔"收起…"），状态已由 `aria-expanded` 表达，文案再变会让屏幕阅读器整句重读。

### S29 钢丝安全册 — 最像手册，自证数字有一处算错

**结论：真做，工程量最大（587 行 HTML / 381 行 CSS / 23 个零件 + 6 章），但自证里有一个错数。**

- **语义 HTML：优。** 6 个 `<section class="ch">` 各带 `<h2>`；`<table>` 全部带 `<caption>`；23 个零件用 `<g class="pt" tabindex="0" role="button" aria-label="零件 01 吸入法兰，跳到零件表第 1 行">`——**SVG 里 23 个可聚焦、带 role、带 aria-label 的图形**，全批最硬的一处 SVG a11y。`<form class="rec">` 1 input 对 1 label（labels=1 / inputs=1）。
- **CSS 系统性：中。** `:root` 17 条，其中 6 条是内联 SVG data-URI（`--hz`/`--wire`/`--strip`/`--cursor`），真正设计令牌只有 6 色 + 4 度量 + 3 字族。`--base:6px` 存在但用得很少（大量间距是字面值）。`--hz` 的 45° 斜纹用 22.63px 方砖 + 两条纹实现，`style.css:24-26` 解释了"一块砖里必须放两条纹（c 与 c−22.63），否则纹会在砖缝处断开成阶梯"——真懂 SVG 平铺的人写的。
- **特异性卫生：差（唯一用 id 的一案）。** 最高 **`1,2,2`**（`#ch1 .spec td:nth-of-type(1)::before`），**id 选择器 20 处**（`.js #ch1` … `.js #fault`），其余 29 案为 0。用 id 做作用域前缀在 587 行页面上会迅速失控。
- **现代布局：中。** grid 4 / flex 6 / `minmax()` 7 / `mix-blend-mode` 2（整页两层 fixed 纹理 `style.css:73-88`，`z-index:7/8` 压在内容之上、`pointer-events:none`——契约 §9.2 的正确做法）。`clip-path:0`、`drop-shadow:0`、`box-shadow:0`。
- **签名机制是否真实现：是。** 钢丝圈：`--wire` 是 72×18 的 SVG data-URI，含 3px 穿孔 + 1.2px 钢丝 + 0.5px 高光（`style.css:30`），`.wire` 用 `repeat-y` 贴左缘 72px（`style.css:92-95`）。45° 警示斜纹：`--hz` + `.haz{height:96px;background-image:var(--hz)}`（`style.css:142`）。爆炸图线宽 0.6px / 轴心 0.4px（`style.css:207-209`）。签名怪癖"4.2 节表格最后一行是空行"：`index.html:325` 的 `<tr class="qs"><td colspan="4"></td></tr>` + `style.css:190` `tr.qs td{height:22px;padding:0}`——**行高与真行一致（22px），真的留了一行空白**，且 `index.html:327` 给了文字说明。这条怪癖真落地了。
- **最弱处——自证数字算错：** `index.html:52` 的 `<details>` 写"主色 `#644F02` 对纸底 `5.29:1`，作按钮底时白字 `6.94:1`；正文 `#1A1A17` 对纸底 `11.68:1`；`#E4B400` 对纸底只有 `1.50:1`"。逐条复算（§4）：`#644F02`/`#D9D3C4` = **5.29:1 ✓**；`#1A1A17`/`#D9D3C4` = **11.68:1 ✓**；**但"作按钮底时白字 6.94:1"是错的：`#FFFFFF`/`#644F02` 实测 7.89:1**。同一个错数在 `style.css:5` 的注释里又写了一遍。按钮白字实际更好（7.89 > 6.94），所以是"把好消息报小了"的错，不影响合规判定，但说明这套数字是手算/抄来的，没跑过脚本。
- 次弱：`style.css:56` 的 `a:focus-visible,button:focus-visible,input:focus-visible` **漏了 `<summary>`**（页面有 6 个 `<details class="spec">`），`summary` 默认可聚焦但拿不到这条 outline，只能靠 UA 默认虚线。

### 3.6 五案横向对照

| 维度 | S01 | S07 | S15 | S21 | S29 |
|---|---|---|---|---|---|
| 最高特异性 | 0,3,1 | 0,3,3 | 0,4,0 | 0,3,0 | **1,2,2** |
| 选择器内 `#id` | 0 | 0 | 0 | 0 | **20** |
| `!important` | 10（全在 RM 块） | 0 | 2 | 0 | 0 |
| `:root` 令牌 | 21 | 12 | **6** | 14 | 17（6 条是 SVG） |
| `box-shadow` | 0 | 0 | 0 | 6（全 inset） | 0 |
| 渐变函数 | 0 | 0 | 0 | 0 | 0 |
| 签名机制可反算 | 是（11°） | 是（镜像 / 8–14%） | 是（0/3/7px） | **是（30/45/60° 全链）** | 是（45° / 22.63px） |
| 实质 a11y 缺陷 | 无 | role=link + tabindex=-1 | 信息重复 / 80 行 SVG 前置 | **outline:none 吃掉焦点** | summary 无焦点样式 |

---

## 4 无障碍审计（同一 5 案）

### 4.1 标题层级与地标

我把 5 案的完整 h1–h6 序列与地标都导出了（`_census.mjs` 的 `heads` 字段），并顺带扫了全 30 案：

**全 30 案：`<h1>` 恰好 1 个 = 30/30；`<img>` 缺 `alt` = 0/30（共 242 个 img）；`prefers-reduced-motion` = 30/30。**

heading 层级断档只有 2 案：

| 案 | 问题 | 序列 |
|---|---|---|
| S23-exposed-plaster-chronology-wall | **第一个标题是 h2，h1 出现在第二位** | h2 h1 h2 h3×9 h2×5 h3×3 |
| S26-geometric-collision-columns | **h1 直接跳 h3**（无 h2） | h1 h3 h3 h3 h2 h2 h3 h3 h3 h2… |

5 案的序列：

| 案 | h1–h6 序列 | 说明 |
|---|---|---|
| S01 | h1 h2 h2 h2 h3 h2 h3 h2 h2 h3 h3 h3 | 合格。h3 只出现在 h2 之下（读者来信 / 制版单 / 页脚三块） |
| S07 | h1 h2 h2 | 合格但极浅——整页只有 3 个标题、2 个 h2；`index.html:37` 的 `list-head` 是 `<p>` 不是标题，所以「正页目录」这一段没有标题 |
| S15 | h1 h2 h3 h2 h2 h2 h2 h2 h2 h3 h3 h3 | 合格。h3 在 h2 之下（图例 / 页脚三块） |
| S21 | h1 h2 h3 h2 h2 h2 h3 h3 h3 h3 | 合格。第二个 h3（`index.html:203`「释放路径」）在 h2「本时段联锁关系」之下，正确 |
| S29 | h1 h2 h3 h3 h3 h3 h2 h3 h3 h3 h3 h2 h3 h2 h3 h3 h3 h3 h2 h3 h3 h3 h3 h2 h2 h2 h3 h3 h3 | 合格，但有一处**语义错配**：h2 的文案是「4.1 联轴器与轴承箱」「4.3 扭矩复位与检修记录」，而 h3 是「4.2 机械密封拆卸参数」（`index.html:311`）—— 章节号 4.2 挂在 h3 上，与 4.1/4.3 的 h2 不同级，编号与层级不一致 |

地标（landmark）：

| 案 | header | nav | main | footer | aside | section 数 | article |
|---|---|---|---|---|---|---|---|
| S01 | ✓ | **✗** | ✓ | ✓ | ✗ | 3 | ✓ |
| S07 | ✓ | ✓（`aria-label="本辑分区"`） | ✓ | ✓ | ✗ | 4 | ✗ |
| S15 | ✓ | **✗** | ✓ | ✓ | ✓（图例） | 7 | ✗ |
| S21 | ✓ | **✗** | ✓ | ✓ | ✗ | 4 | ✗ |
| S29 | ✓ | **✗** | ✓ | ✓ | ✗ | 8 | ✗ |

S29 有一个**看起来像导航但没有 nav 语义**的章节索引：`index.html:27` 的 `<div class="idx" role="group" aria-label="章节索引">` 里包着 4 个 `<a href="#ch1">`。用 `role="group"` 而不是 `<nav>`，屏幕阅读器的「跳转到导航」快捷键抓不到它——而它是全页唯一的章节导航。CSS 注释 `style.css` 里也自认「索引不是导航菜单」，但功能上它就是。

### 4.2 表单标签

| 案 | `<label>` | `<input/select/textarea>` | 结论 |
|---|---|---|---|
| S01 | 0 | 0 | 无表单 |
| S07 | 0 | 0 | 无表单（`index.html:164` 有一个 `<button id="rerun">`，按钮不需要 label） |
| S15 | 0 | 0 | 无表单（3 个 `<button class="yb">` 用文字当可及名） |
| S21 | **3** | **3** | 合格：3 个 `<label class="slot">` 各包住 1 个 `<input type="radio">`（`index.html:59-61`），包裹式关联，无需 `for/id` |
| S29 | **1** | **1** | 合格：1 对 1 |

5 案里只有 S21/S29 有表单控件，都做了关联。

### 4.3 键盘焦点样式

| 案 | `:focus*` 规则数 | 覆盖到哪 | 实质缺陷 |
|---|---|---|---|
| S01 | 4 | `.skip:focus`、`.btn:focus-visible`、`.col-head:focus-within`、`.fold-corner:focus-visible` | **无** — 但 `<a href>` 没有专门焦点样式，靠 UA 默认 |
| S07 | 3 | 全局 `:focus-visible`（`style.css:33`，2px slate outline）+ `.skip:focus` + `.toc li a:focus-visible` | 好：全局规则兜底，目录项额外给下划线 |
| S15 | 4 | 全局无；`.skip:focus`、`.hot:focus-visible`（SVG 热区，`style.css:223` 有 outline）、`.yb` 靠 UA | 中：`.hot` 只覆盖 SVG 热区，14 个 `<button class="yb">` 无自定义焦点 |
| S21 | 2 | 全局 `:focus-visible`（`style.css:148`，2px amber outline）+ `.skip-link:focus` | **实伤**：`style.css:545` `.lockbar{outline:none}` 特异性 (0,1,0) 且位置更靠后，压过 `style.css:148` 的 (0,1,0) 全局规则 → **18 个 `tabindex="0"` 的锁闭条全部无可见焦点**（14 枚路径条 + 4 个 demo 条）。WCAG 2.4.7 失败 |
| S29 | 2 | `a:focus-visible, button:focus-visible, input:focus-visible`（`style.css:56`）+ `.pt:focus .pn`（改填充色，无 outline） | **缺口**：6 个 `<summary>`（`<details class="spec">`）不在选择器里，只能吃 UA 默认；`.pt:focus` 只把零件编号文字改成 amber，**图形本身无焦点指示**（23 个零件） |

**横向结论：** 5 案里 1 案（S21）有确定的 WCAG 2.4.7 失败，1 案（S29）有两处缺口。S07 是唯一把全局 `:focus-visible` 写在最前面、且用元素选择器（不会被类覆盖）的一案 —— 这是正确做法。S01/S15 靠"逐组件写"的方式覆盖，遗漏面更大（S01 的 `<a>` 链路、S15 的 `.yb` 按钮）。

### 4.4 `prefers-reduced-motion`

30/30 都有阻断，5 案内容：

| 案 | 位置 | 做法 | 是否"取消机制"而非"再发明" |
|---|---|---|---|
| S01 | `style.css:484-501` | 位移全静止；四栏改 120ms 不透明度切换，**间隔仍 60ms**（`.col-1/2/3/4` 的 `animation-delay` 0/60/120/180ms 保留）；楔形改 120ms 淡入并保留 `.wedge-mis` 的 1.5px 错位 | 合规。契约 §6 要求"写机制在窄屏的再发明形式并带数值"——S01 保留 60ms/120ms/180ms 三个数 |
| S07 | `style.css:186-192` | 透印层/渗墨动画全停，但 `.ghost text{transition:opacity 120ms linear}` 与 `.ghost.lead,.pages.lag{transform:none;transition:opacity 120ms linear}` **保留 120ms 不透明度**，把"位移错位"换成"淡入" | 合规，数值齐全 |
| S15 | `style.css:517-535` + 另一条 `@media (prefers-reduced-motion: reduce) and (max-width:1023px)` | `.trace` 改 100ms 不透明度瞬切、`transform:none`、逐层叠上动画全停、比例尺改 `position:static` | 合规，且**唯一一案用了 `reduce + 断点` 的复合查询** |
| S21 | `style.css:944-952` | 只写 3 条：`.path.is-armed .lockbar` / `.lockbar--demo.is-loading` / `.caret` 的 `animation:none`，其余 `transition:none` | **偏薄**：锁闭条"逐枚扣接"的 70ms 阶梯被整体取消（`animation:none`），**没有给出替代形式**（如全部立即落位并保留 14 枚的静态叠放）。契约 §6 明确要求"不得用停用/取消否掉签名机制，要写再发明形式并带数值"——这一条 S21 是**表面合规、实质取消** |
| S29 | `style.css:367-375` | `[data-grow]` 改 120ms 不透明度；零件逐件描画 `stroke-dashoffset:0`（立即全画完）；警示斜纹悬停位移取消 | 合规，数值齐全 |

### 4.5 WCAG 对比度实测

方法：`_ratios.mjs` 解析每案 `:root` 的颜色令牌，按 WCAG 2.x 相对亮度公式计算；`rgba()` 先按 sRGB alpha 合成到背景色再算（S21 的 `--ink-2`）。阈值：正文 4.5:1，大字（≥18.66px 粗体 / ≥24px）3:1。

**五案全部"声明为文字色"的配对：**

| 案 | 前景 / 背景 | 比值 | 判定 | 用在哪 |
|---|---|---|---|---|
| S01 | `--ink` #1A1614 / `--paper` #EFE7D7 | **14.61:1** | AAA | 正文 |
| S01 | `--paper` #EFE7D7 / `--red` #C1121F | **5.06:1** | AA（正文也过） | 红底折角栏、错误态红带 |
| S01 | `--red` #C1121F / `--paper` #EFE7D7 | **5.06:1** | AA | 行内红字（栏号、错误码） |
| S01 | `--ink` #1A1614 / `--red` #C1121F | **2.89:1** | **FAIL <3** | **不该出现**；由 `style.css:270-271` 补 `.col-head-red .col-meta{color:var(--paper)}` 规避 |
| S01 | `--lead` #6E6A5E / `--paper` #EFE7D7 | **4.40:1** | **FAIL <4.5** | 只用作 `·` 分隔符（`style.css:116`）、`.lead-bar` 底色、`border-top`。**唯一一处真文字是那个 `·`**，属装饰性分隔符，可判为 1.4.3 豁免（若承认它是文本则不足） |
| S07 | `--ink` #1C1A16 / `--paper` #E7E7E0 | **13.99:1** | AAA | 正文 |
| S07 | `--slate` #33505C / `--paper` #E7E7E0 | **6.92:1** | AA（正文也过） | 14 处文字：imprint、导航、页码、图注、页脚、`.st` |
| S07 | `--paper` #E7E7E0 / `--slate` #33505C | **6.92:1** | AA | 按钮白字 |
| S07 | `#FFFFFF` / `--slate` #33505C | **8.60:1** | AAA | （spec 字段 3 声称 8.60，**完全正确**） |
| S07 | `--deckle` #9A9384 / `--paper` #E7E7E0 | **2.46:1** | FAIL <3 | 只作页边毛口遮罩底色（`style.css:113`），**非文字，**不构成对比度缺陷 |
| S15 | `--graphite` #3A3F45 / `--paper` #E7EBE9 | **8.83:1** | AAA | 主文字（spec 声称 8.83，**正确**） |
| S15 | `--press` #22282B / `--paper` #E7EBE9 | **12.41:1** | AAA | 重压处文字 |
| S15 | `--pencil` #7A7466 / `--paper` #E7EBE9 | **3.86:1** | FAIL <4.5 | **非文字**：`style.css:278` 只作 `.yb--fault` 的 `border-color`。字段 3 明写"只画线、不承载文字"，属实 |
| S21 | `--ink` #3E3A34 / `--paper` #E4DCC9 | **8.27:1** | AAA | 正文（CSS 注释声称 8.27，**正确**） |
| S21 | `--ink-2` rgba(62,58,52,.8) 合成后 / `--paper` | **4.98:1** | AA | 次级文字（CSS 注释声称 4.7，实测 4.98，**偏保守**） |
| S21 | `--amber` #924307 / `--paper` #E4DCC9 | **5.08:1** | AA | 链接下划线色、`:focus-visible` outline（CSS 注释声称 5.08，**正确**） |
| S21 | `#FFFFFF` / `--amber` #924307 | **6.93:1** | AA | 强调底白字（CSS 注释声称 6.93，**正确**） |
| S21 | `--fibre` #6E6A5E / `--paper` #E4DCC9 | **3.96:1** | FAIL <4.5 | **非文字**：只用于 `scrollbar-color`（`style.css:121`）与滚动条滑块（`style.css:146`） |
| S29 | `--ink` #1A1A17 / `--paper` #D9D3C4 | **11.68:1** | AAA | 正文（页面自证 11.68，**正确**） |
| S29 | `--amber` #644F02 / `--paper` #D9D3C4 | **5.29:1** | AA | 链接、按钮底（页面自证 5.29，**正确**） |
| S29 | `#FFFFFF` / `--amber` #644F02 | **7.89:1** | AAA | 按钮白字（页面自证 **6.94 — 错**，实际 7.89） |
| S29 | `#FFFFFF` / `--gray` #5A6068 | **6.35:1** | AA | **表格 thead 白字压灰底**（`style.css:180`，**未被页面自证提到**） |
| S29 | `--ink` #1A1A17 / `--bright` #E4B400 | **8.99:1** | AAA | 警示框编号（页面自证 8.99，**正确**） |
| S29 | `--bright` #E4B400 / `--paper` #D9D3C4 | **1.30:1** | FAIL <3 | 页面自证 1.50（**错，实测 1.30**）。非文字装饰块，页面自认"不承载正文"；但 `style.css:146` 用它做按钮底并压 `--ink`（8.99:1）——底与周围纸面的 1.30:1 会让按钮边界几乎不可辨（WCAG 1.4.11 非文本对比度要求 3:1） |
| S29 | `--ink` #1A1A17 / `--row` #E0DACB | **12.51:1** | AAA | 表格行悬停 |

### 4.6 对比度结论（按缺陷严重度排序）

1. **S29 的非文本对比度 1.30:1**（`#E4B400` 按钮底 vs 纸底）—— 唯一一条**真会让控件消失**的缺陷。WCAG 1.4.11 要求 UI 组件与相邻色 3:1。同一色被用作 `.flash` 行底（`style.css:191`）也不足。
2. **S21 的 `outline:none` 吃掉 18 个可聚焦条**——虽不是颜色问题，但属 2.4.7，与对比度同级严重。
3. **S01 的 `--lead` 4.40:1**——差 0.10 未达 4.5。若那个 `·` 被视为文本（它在 `<li>::after` 的 `content` 里，会被多数屏幕阅读器忽略，但在视觉上可读），则不达标。
4. **S29 自证错两处数**（白字 6.94 应为 7.89；`#E4B400` 1.50 应为 1.30）—— 不影响判定方向（一处更好、一处更差），但说明页面内的"对比度自证"不是脚本产出的，**不可作为审计依据**。
5. **S01 spec 的"校验"行写 14.78:1，实测 14.61:1**（`_specs/S01.md` 末段）—— 差 0.17。同一模式的第二个证据：这套数字是手算的。
6. 其余低比值（S07 `--deckle` 2.46、S15 `--pencil` 3.86、S21 `--fibre` 3.96、S01 `--lead` 4.40）**都只用于非文字装饰**，与各自字段 3 的声明一致，**不构成缺陷**；这一点值得记下：这 5 案的配色声明与 CSS 用法是对得上的，没有"声明只画线、实际拿去写字"的偷换。

---

## 5 素材与授权

### 5.1 assets/ 里有什么（30 案全量）

总量：**426 个位图文件，93.0 MB**。格式分布以 `.jpg` 与 `.png` 为主，S21 额外有 `.avif`/`.webp` 双格式（12+12），S04 有 13 个 `.webp` 副本。另有 4 案在 `assets/` 内放 `.woff2`（S04 4 片、S07 4 片、S08 1 片、S21 71+ 片 —— 后三个是**字体不在共享缓存里、私有跟包**，见 5.4）。

逐案 assets 规模（前 8 名）：S21 10.9 MB / S28 2.3 MB / S09 7.8 MB / S15 7.3 MB / S14 6.5 MB / S02 6.0 MB / S06 5.1 MB / S23 5.0 MB；最小 S08 99 KB（6 张 PNG + 1 SVG + 1 woff2）。

`assets/` 内同时混进了**非素材文件**（契约 §2 的布局只写"真实位图"）：
- `credits.json`（22 案有）、`CREDITS.md`（30/30 有）
- 抓取/烘焙脚本：S02 `fetch.ps1`、S06 `fetch.ps1`、S10 `write-credits.py` + 3 个 `.py` + 4 个 `.ps1` + `credits-extra.ndjson`、S13 `fetch.ps1`、S14 `fetch.ps1`、S15 `fetch.ps1`、S25 `fetch-and-bake.py` + `fetch-assets.ps1`、S21 `fetch-assets.ps1`
- S21 `assets/_cand/` 的候选池 + `candidates.json` + `credits-unused.json` + `credits.fetch.json` + 一个 `.log`

### 5.2 CREDITS.md 完整度（30/30 实测）

**4 案是明确的占位文件（PLACEHOLDER）**：`S04 / S07 / S08 / S17`。它们的 `CREDITS.md` 正文原样写着：

> （`credits.json` 与磁盘上的文件对不上，或本方案没有留存的署名记录。**这是一个未闭合的缺口**：照片本身是从 Wikimedia Commons 抓的，逐张的作者与许可没有随包保留下来。）

然后罗列"盘上存在但署名表里没有对应记录的位图"清单。其中 S07 列 9 张、S04 列 17 张、S17 列 5 张、S08 列 6 张。

**交叉验证：把每案 `assets/` 里的位图文件名逐个到该案 `CREDITS.md` 里查**，未出现的：

| 案 | 位图总数 | CREDITS.md 里未出现 | 性质 |
|---|---|---|---|
| S21 | 60 | **46** | 主要是 `.avif`/`.webp` 变体 + `_cand/` 候选池（主体 6 张已逐张署名，见 S21 CREDITS 第一节 6 行表） |
| S05 | 16 | 6 | 全部是 `source\` 子目录里的原件（成品已署名） |
| S15 | 21 | 6 | `photo-0N-*.jpg` 成品 —— **CREDITS 第二节的表是空的**（`sed -n '28,30p'` 只有表头与分隔行，0 行数据），而成品恰是页面实际引用的那 6 张。署名在第一节的 `assets/source/` 原件行里，逻辑上可追，但"页面用在哪"这一列写的是"待页面引用（index.html 未落盘）" |
| S02 | 26 | 2 | `foil-plate@2x.png`、`leak-patch@2x.ivory-backup.png`（后者文件名带 `.ivory-backup`，像备份残留） |
| S16 | 9 | 1 | `plate-07-marinetti.png` |

**结论：30/30 都有 CREDITS.md 文件；22/30 有机器可读的 `credits.json`；4 案（S04/S07/S08/S17）明确自认缺口；S15 的成品署名表是空表。**

### 5.3 许可构成（从 30 份 CREDITS.md 全文统计）

| 许可 | 出现次数 |
|---|---|
| Public domain / 公有领域 / public domain | 83 |
| CC BY-SA 4.0 | 41 |
| OFL 1.1（字体） | 32 |
| CC0 | 23 |
| CC BY-SA 3.0 | 18 |
| CC BY 4.0 | 15 |
| CC BY 2.0 | 15 |
| No restrictions / 无已知限制 | 7 |
| CC BY-SA 2.0 | 4 |
| CC BY 3.0 | 4 |
| CC BY 2.5 | 1 |

**没有任何 NC（非商业）或 ND（禁止演绎）许可。** 全部落在 CC0 / PD / CC BY / CC BY-SA / 无已知限制五类里 —— 都能再分发，但 **CC BY 与 CC BY-SA 要求署名，CC BY-SA 还要求以相同方式共享**。这就是 4 案"署名缺口"为什么是实质风险而不是形式问题：那 56 个（LICENSE 自报数）文件的许可类型都还不知道。

### 5.4 非可再分发的风险清单（按严重度）

| # | 风险 | 证据 | 影响 |
|---|---|---|---|
| **R1** | **4 案的 56 个位图没有署名记录** | `S04/S07/S08/S17` 的 `assets/CREDITS.md` 首段自认"未闭合的缺口"；`LICENSE` 第 2 条明写"**这些照片不得对外复用**，直到署名表补齐" | 若把原型当成品分发，这 56 个文件构成 CC BY/CC BY-SA 的署名违约。**LICENSE 自己已经禁止了**，所以这是"仓库自认的未清债务"而非隐藏风险 |
| **R2** | **字体私有跟包，且无上游许可文件** | `_fonts/` 871 个 woff2、33 MB，`find _fonts -iname 'LICENSE*' -o -iname 'OFL*'` 返回 **0 个文件**。许可信息只在 `_fonts/css/*.css` 的注释头（如 `alfa-slab-one__400.css:3` "许可：SIL OFL 1.1（依据 S23·「字体策略」）"） | OFL 1.1 要求随分发附带许可全文。**48 个 CSS 注释头 ≠ 许可全文**。这是形式违约，不是实体风险（OFL 允许再分发） |
| **R3** | **S07/S08 的字体不在共享缓存里** | S07 `style.css:1-4` 引用 `assets/fonts/libre-franklin-700.woff2` 等 4 片（私有）；S08 `assets/` 内有 1 片 woff2；S21 `style.css` 内 71 条 `@font-face` 指向 `fonts/wenjin-*.woff2` | 与契约 §4"用共享缓存"的约定不一致，但可运行。S21 反而是唯一把 OFL 1.1 与上游 URL 写进 CSS 头的（`style.css:1-11`） |
| **R4** | **S14 有一张品牌产品的照片** | `S14/assets/CREDITS.md:28`：`cabin-12-pilot-watch.jpg` ← "Crown and chronograph pushers of a **Montblanc Timewalker** wristwatch"，Pittigrilli，CC BY 4.0 | 照片本身 CC BY 4.0 可再分发，但**画面主体是万宝路/万宝龙的商标与表冠造型**。用于"航天仪表"题材有商标误用风险。**减轻事实：该文件在 `index.html`/`style.css` 里 0 次引用（grep 命中 0）**，是未使用的抓取残留 |
| **R5** | **跨案复用照片 53 个文件，题材与来源分离** | `reuse-sNN-*` 命名 53 个，分布在 11 案。例：S29「钢丝安全册」用 `reuse-s10-road-04-raw.jpg`（公路货运卡车）当封面；S21「联锁释放簿」的 6 个 `reuse-s14-*`（驾驶舱、遥测面板、Chipmunk 座舱）**全部 0 次引用** | 契约 §10.1 要求"题材错配必须在 CREDITS.md 写明"。S29 做到了（CREDITS 里逐张注明"为本方案抓取"并写明改用 S10 的图）；S21 的 6 个未引用文件是纯占用 10.9 MB 的死重 |
| **R6** | **版权状态"见来源页"的空记录** | `LICENSE` 第 2 条自报："11 行许可写作'见来源页'而来源页为空，7 行的上游署名从未落盘，5 行有许可名但整条记录没有任何 URL" | 我未能独立复现这三个数（LICENSE 未给逐行位置），按 LICENSE 原文照录为**未复核的自报缺陷** |

**未发现的（做了反面验证）**：
- 全 30 案的 `index.html`/`style.css` **远程资源加载 = 0**（`<img|script|link|source|iframe>` 的 `src/href` 无一指向 http(s)，CSS `url()` 除 `w3.org` 命名空间外无一远程）。90 处 `<a href="https://commons.wikimedia.org/...">` 是**署名回链**，不是资源加载，符合契约 §5。
- 禁用字体栈（Inter/Roboto/Arial/Helvetica/system-ui/-apple-system/BlinkMacSystemFont/Segoe UI）**30/30 = 0 处**（令牌展开后逐一比对）。
- 断链：30/30 的本地引用全部存在（`brokenImages` 全为空）。

### 5.5 图像素材的真实性

契约 §5 要求"桌面档 realPictures ≥4，SVG 不算图片"。30/30 的 `report.json` 实测 `realPictures`：S28 = 15、S06 = 13、S19 = 11、S14/S23/S29 = 10、S04 = 9、S20/S26/S30 = 8、其余 5–8；**最低 S03 = 4**（正好压线）。`realPictures` 与我在 `assets/` 数到的位图数不一致（S03 有 10 个位图但只报 4 张真实图），说明工具只计"首屏/可视区实际绘制"的图，不是文件数 —— 这是口径差异，不是缺陷。

`S08` 的 assets 只有 6 张 PNG 且总计 99 KB，`realPictures` 报 6 —— 这 6 张是程序化生成的纸纹与套印层，不是照片。契约 §5 说"SVG 不算图片"但没说"生成纹理算不算"，**这是契约的一个未定义边界**；`report.json` 认它，LICENSE 第 3 条也把生成纹理归入 MIT，逻辑自洽，但"6 张真实图"这个措辞在这里是虚的。

---

## 6 增加第 31 个方案的成本

依据 `prototypes/_CONTRACT.md`（396 行）。下面把「机器检查」与「人工检查」分开列，并给出我**实测**的耗时。

### 6.1 机器可查的硬性要求（跑脚本就知道对错）

| # | 要求 | 判定方式 | 出处 |
|---|---|---|---|
| M1 | 目录名 `S31-<kebab-english-name>` | 人工比对命名式样 | §2 |
| M2 | `index.html` 18–27 KB | `verify-prototype.mjs` 只在 <12K 报错，**上位不带检查** | §2 |
| M3 | `style.css` 12–31 KB | 同上，**无检查** | §2 |
| M4 | `assets/` 存在且含 ≥4 张真实位图（桌面档实绘） | `verify-prototype.mjs:127` | §5、§7 |
| M5 | `assets/CREDITS.md` 存在 | `verify-prototype.mjs:85` | §7 |
| M6 | `assets/credits.json` 存在 | 只记 note，不判错（`verify-prototype.mjs:86`） | §9.5 |
| M7 | 无远程资源（`<img|script|link|source|iframe>` 与 CSS `url()`） | `verify-prototype.mjs:44-57` | §4、§5 |
| M8 | 字体栈里无 8 个禁用族 | `verify-prototype.mjs:59-66` | §4 |
| M9 | 渲染文本里无 Emoji（U+2600–27BF / U+2B00–2BFF / U+1F300–1FAFF），箭头不算 | `verify-prototype.mjs:69-73` | §6、§9.13 |
| M10 | `body`/`html` 规则不挂 `background-image` | `verify-prototype.mjs:76-78`（**该检查有假阳性，见 6.4**） | §9.2、§9.16 |
| M11 | 引用的本地文件全部存在（无断链） | `verify-prototype.mjs:92-107` | §5 |
| M12 | `.inspect/report.json` 存在且可解析 | `verify-prototype.mjs:110-111` | §7 |
| M13 | 闸门 `FAIL = 0`，或 FAIL 集合 ⊆ §9.15 允许表 ∪ 逐案批准 | `verify-prototype.mjs:118` + `check-contract.mjs` C1/C2/C5 | §7.2 |
| M14 | `report.json` 有 1440 档 | `verify-prototype.mjs:120` | §7 |
| M15 | 桌面档 `realPictures ≥ 4` | `verify-prototype.mjs:127` | §5 |
| M16 | `horizontalOverflow = 0` | `verify-prototype.mjs:128` | §6 |
| M17 | 标题不超 2 行（任一视口） | `verify-prototype.mjs:129`（`check-twolines.mjs` 另有一份） | §6 |
| M18 | `brokenImages` 为空 | `verify-prototype.mjs:130` | §5 |
| M19 | 控制台无报错 | `verify-prototype.mjs:131` | §7 |
| M20 | 三档（1440/768/390）各有 `*-fold.jpg` | `verify-prototype.mjs:135-137` | §7.3 |
| M21 | 至少 2 张 `*-page-*.jpg` | 契约 §7.3 写"至少 2 张"，**脚本未单独断言张数**（只查 fold） | §7.3 |
| M22 | 正文 ≥15px（`body-size`） | 闸门规则 `body-size`（WARN/FAIL） | §6 |
| M23 | 静止态无外投影（`shadow`） | 闸门规则 `shadow`（只查 `boxShadow`；`filter: drop-shadow()` 合规） | §6、§9.3 |
| M24 | 必须是真表格/真列表，不得"居中大标题 + 3 等量卡片 + 底部 CTA" | 闸门规则 `card-rows` | §6 |
| M25 | 必须有错误状态且带 `_CURRENT-VALUES.md` 指定的错误码 | 人工 + 闸门不查 | §6 |
| M26 | 必须有 `prefers-reduced-motion` 降级，且不得取消签名机制 | 人工 | §6 |
| M27 | 纹理必须挂伪元素，不挂 `body` | `check-texture.mjs`（全库实测 FAIL 0 / WARN 0） | §9.2、§9.16 |
| M28 | 交付说明必须含 `report.json.at` + `index.html`/`style.css` 的 mtime 与 sha256 | `check-stale.mjs` 间接查陈旧度 | §7.4、§9.6 |
| M29 | `check-stale.mjs` 必须过（源文件 mtime 不得比 `report.json.at` 新 >1 分钟） | `check-stale.mjs` 退出码 1 | §9.17 |
| M30 | 改完必须跑「渲染 → `collect-schemes.mjs` → `check-stale.mjs`」三步链 | 人工 | §9.17 |

### 6.2 只能人工判断的要求

| # | 要求 | 出处 |
|---|---|---|
| H1 | 12 字段原文逐条对上（色值、字体、断点、动效时长、签名怪癖） | §1、§9.11 |
| H2 | 先读 `_CURRENT-VALUES.md` 再读 `_specs/S31.md`（否则会把废值建进去） | §1、§8.1 |
| H3 | 无 40 词空词黑名单（赋能/解锁/一站式/无缝体验…） | §6 |
| H4 | 无删减托辞（"由于篇幅限制""以下省略"） | §6 |
| H5 | 反 AI 味 R-01–R-40 逐条避坑 | §1 |
| H6 | 素材题材要对得上（爵士唱片类题材要如实写缺口） | §10 |
| H7 | 交叉复用照片必须注明"原本为哪个方案抓取" | §10、§10.1 |
| H8 | 交付说明里必须列出"你自己知道的两处最弱的地方" | §7.4、§9.11 |
| H9 | WARN 要逐条解释为什么可接受；用了 `--allow` 要列出放过哪些 id 与理由 | §7.2、§3 |
| H10 | 不得"用位图/几何规避规则"（没有那个 CSS 属性就没有那条发现，但那是规避不是合规） | §6 |
| H11 | 一个方案目录只能有一个写入者（并发会丢版本且无快照） | §9.1 |

### 6.3 实测耗时（本机，2026-11-04）

我把能跑的都跑了一遍并计时：

| 步骤 | 命令 | 实测耗时 | 备注 |
|---|---|---|---|
| 单案渲染（三档 1440/768/390 + JSON） | `inspect.mjs <proto>/index.html --out ... --widths 1440,768,390 --json` | **63 秒** | 我在 `/tmp` 输出目录上跑的，未触碰任何受跟踪文件；退出码 0 |
| 单案渲染（契约规定入口） | `node prototypes/_build/render-scheme.mjs S31-...` | ≈63 秒 + 前置断言 | 该脚本会先断言 `tools/taste-skill/.../inspect.mjs` 存在（本机**存在**），再做前后指纹比对防"打印旧报告" |
| 重新生成选型台数据 | `node prototypes/_build/collect-schemes.mjs` | **8.3 秒** | **会重写 `prototypes/_selection/data.js`（受跟踪）** |
| 陈旧度检查 | `node prototypes/_build/check-stale.mjs` | **13 秒** | 当前退出码 1：S02 截图落后 5547 分钟、选型台 prompts.js 落后 5505 分钟 |
| 全 30 案机械复核 | `node prototypes/_build/verify-prototype.mjs --all` | **8 秒** | 达标 28 / 不达标 2（S02、S08） |
| 纹理检查 | `check-texture.mjs` | 12.3 秒 | FAIL 0 / WARN 0 |
| 锚点检查 | `check-anchors.mjs` | 8.0 秒 | 无死锚点 |
| 文档检查 | `check-docs.mjs` | 7.3 秒 | README 0 FAIL / 13 PASS |
| 提示词检查 | `check-prompts.mjs` | 11.6 秒 | FAIL 0 / WARN 0 |
| 两行标题检查 | `check-twolines.mjs` | 11.4 秒 | FAIL 0 / WARN 0 |
| 契约一致性 | `check-contract.mjs` | 13.2 秒 | FAIL 0 / WARN 1 / INFO 2 |

**所以"加一个第 31 案"的最小机器时间 = 63 秒（渲染）+ 8 秒（collect）+ 13 秒（stale）≈ 1 分 24 秒**，加上 6 个检查器总共约 2 分钟。**真正的时间成本在写作与素材**，不在跑闸门。

### 6.4 契约本身的三处成本陷阱（我实测到的）

1. **`verify-prototype.mjs` 的 M10 检查会误杀。** `verify-prototype.mjs:76-78` 用 `C`（**未剥注释的原始 CSS**）做 `body{...}` 块正则，只要注释里出现 `background-image` 字样就报"body 规则挂了背景图"。实测 S02 因此被判不达标：它在 `style.css:52-60` 用注释解释"原本 `background-image: url(...)` 挂在 body 上，已修"，**注释里的修复记录本身触发了检查**。`stripNonRendered(C)` 已经算好放在 `:69` 但那一段用的是 `C`。这是"修好了却被自己写的修复说明判红"的一类缺陷，第 31 案只要写同类注释就会踩。
2. **`collect-schemes.mjs` 会重写受跟踪的 `prototypes/_selection/data.js`。** 我跑了一次，`git diff` 显示 `1 file changed, 1 insertion(+), 1 deletion(-)`，随后 `git checkout --` 复原。契约 §9.17 把它列为提交前必跑的三步之一 —— **这意味着每次按契约走都会产生一个待提交的受跟踪改动**，容易和别的改动混在一起。
3. **`mtime` 判据在 Git 下不稳。** `check-stale.mjs` 用"源文件 mtime 比 `report.json.at` 新 1 分钟"判陈旧。`git checkout`/`git clone` 会把 mtime 刷成当前时间，所以**克隆仓库后第一次跑 `check-stale` 必然全红**。当前实测已经是红（S02 落后 5547 分钟），说明这套判据在真实工作流里没有被持续维持。

### 6.5 第 31 案的完整清单（压缩版）

```
1. 读 _CURRENT-VALUES.md → 读 _specs/S31.md（12 字段）→ 读 02-anti-ai-rules.md
2. 建目录 prototypes/S31-<kebab>/{index.html, style.css, assets/}
3. 字体：先 fetch-fonts.mjs --use-system-ca 抓族与字重到 _fonts/，
         再 <link href="../_fonts/css/<file>.css">（禁 googleapis 直链，禁 8 个禁用族）
4. 素材：fetch-scheme-assets.mjs 或 assign-assets.mjs 抓/配真图到 assets/，
         纹理用 make-textures.py（14 个确定性生成器 + build/texture-job.json），
         抓取脚本必须落 credits.json（artist/license/origin/page），
         再由 write-credits.mjs 生成 CREDITS.md（不手抄）
5. 写 index.html（18–27 KB）+ style.css（12–31 KB）：
   - 语义地标、唯一 h1、每个 img 有 alt、真 table/ol
   - 必须有错误状态（带指定错误码）且截图可达
   - 必须有 prefers-reduced-motion，写机制的再发明形式并带数值
   - 纹理挂伪元素不挂 body；正文 ≥15px；标题 ≤2 行；无横向溢出
   - 无远程资源、无 Emoji 功能图标、无空词、无删减托辞
   - 静止态无外投影（要用投影就用 filter: drop-shadow()）
6. node prototypes/_build/render-scheme.mjs S31-...        ← 63 秒
7. node prototypes/_build/collect-schemes.mjs               ← 8 秒，会改 _selection/data.js
8. node prototypes/_build/check-stale.mjs                   ← 13 秒
9. node prototypes/_build/verify-prototype.mjs S31-...       ← 8 秒（全量）
10. 交付说明（写进 deliverables/S31-adjudication.md 或 _build/_gate-old8.txt）：
    FAIL/WARN 计数 + 字体族与来源 + 素材来源与署名 + 你自己知道的两处最弱的地方
    + report.json.at + index.html/style.css 的 mtime 与 sha256
    + 若用了 --allow，列出放过的 id 与理由
```

---

## 7 总判

### 7.1 一句话结论

**这 30 个案不是"散文配大 CSS"。** 我逐行读完的 5 案里，5/5 的签名机制都在 CSS 里用可复核的数值实现了，其中 S21 的三档切口角度能从 `clip-path` 百分比反算回 30/45/60° 与 41.6/24.0/13.9px，S07 的透印层是 JS 量出每行几何再重排的真实镜像文本。**质量问题是"纪律不匀"，不是"空心"。**

### 7.2 四个真实缺陷（按可修性排）

| # | 缺陷 | 范围 | 证据 | 严重度 |
|---|---|---|---|---|
| **D1** | **S21 的 `.lockbar{outline:none}` 压掉全局焦点样式** → 18 个 `tabindex="0"` 元素键盘聚焦时零可见指示（WCAG 2.4.7） | 1 案 | `S21/style.css:545` vs `:148`，同为 (0,1,0)，后者更靠前 | **高**（唯一确定的 a11y 失败） |
| **D2** | **4 案的 56 个位图无署名记录，LICENSE 自己禁止对外复用** | 4 案（S04/S07/S08/S17） | 4 份 `assets/CREDITS.md` 首段自认"未闭合的缺口"；`LICENSE` 第 2 条 | **高**（法律风险，已被仓库自认） |
| **D3** | **S29 的非文本对比度 1.30:1** —— `#E4B400` 按钮底与纸底几乎同亮 | 1 案 | `S29/style.css:146`；复算 1.30:1（页面自证 1.50，错） | 中（WCAG 1.4.11） |
| **D4** | **`verify-prototype.mjs` 的 M10 检查有假阳性**：注释里的 `background-image` 字样触发"body 挂背景图" | 工具，当前误杀 S02 | `verify-prototype.mjs:76-78` 用未剥注释的 `C`，而 `stripNonRendered(C)` 在 `:69` 已算好 | 中（会让正确的修复被判红，正是 §9.23 描述的那类缺陷） |

### 7.3 三类"看起来是缺陷、实测不是"的

1. **`#id` 选择器泛滥**：我第一版扫描报了 S15 41 处、S29 61 处，**是错的** —— 那个正则把 `url(#p-frame)` 这类 SVG 片段引用当成了 id 选择器。重扫（只取选择器位置）结果：**29 案为 0，只有 S29 有 20 处**（`.js #ch1` … `.js #fault`）。这条自我更正记在这里，因为它正好是契约 §9.19「量错了对象」的又一次复现。
2. **`!important` 数量**：S01 的 10 处全在 `prefers-reduced-motion` 块内，是正确用法，不是补丁。
3. **低对比度色**：S07 `--deckle` 2.46:1、S15 `--pencil` 3.86:1、S21 `--fibre` 3.96:1、S01 `--lead` 4.40:1 全部**只用于非文字装饰**，与各自字段 3 的声明一致 —— 这 5 案的配色声明与 CSS 用法对得上，没有"声明只画线、实际拿去写字"的偷换。

### 7.4 一致性总账（30/30 实测）

| 检查项 | 结果 |
|---|---|
| 外部字体链接 | **0/30**（全自托管） |
| 远程资源加载 | **0/30**（90 处 `https://` 全是署名回链，不是资源） |
| 禁用字体栈 | **0/30** |
| 缺 `lang` | **0/30** |
| 缺 `<h1>` 或多 `<h1>` | **0/30** |
| `<img>` 缺 `alt` | **0/30**（242 个 img） |
| 缺 `prefers-reduced-motion` | **0/30** |
| 缺 `assets/` 或 `.inspect/report.json` | **0/30** |
| 断链 | **0/30** |
| 横向溢出 / 标题超 2 行 / 控制台报错 | **0/30 / 0/30 / 0/30** |
| CSS > 31KB | **7/30** |
| index.html 出 18–27KB 带 | **14/30**（全部是超上界，无低于 18KB） |
| 内联 `style=` | **16/30，共 251 处** |
| `<script>` | **30/30**（其中 15 案 1 个、15 案 2 个；仅 S07 用外链 `app.js`） |
| 标题层级断档 | **2/30**（S23 h2→h1、S26 h1→h3） |
| 闸门 FAIL>0 | **1/30**（S08：palette-terracotta + font-count） |
| CREDITS.md 占位 | **4/30** |
| 目录残留（`.bak-fonts`、脚本） | **7/30** 有 `index.html.bak-fonts`，另有 4 案把构建脚本留在原型根目录 |

### 7.5 对自己这份报告的三个限定

1. **`#id` 一栏我改过一次**（7.3 第 1 条）。第一版用错了正则，第二版重扫。表里是第二版。
2. **对比度只算了 `:root` 令牌之间的配对**，没有算组件里硬编码的字面色（如 S01 `style.css:291` 的 `rgba(26,22,20,.55)`）。这些零散值合计约 20 处，其中若有文字色则可能有未发现的低对比。分母是"5 案的 `:root` 颜色令牌"，不是"5 案的全部颜色"。
3. **`verify-prototype.mjs --all` 的「28/30 达标」不等于 28 案无缺陷** —— 它只跑 M 系列机器检查。S21 的 `outline:none`、S29 的 1.30:1、S15 的空署名表**全部通过**了这套机器检查。这是契约 §9.11「闸门 FAIL=0 不代表规格对上了」的又一次实证。

### 7.6 交付卫生

- 本报告涉及的临时脚本全部落在 `deliverables/74-recon/`（`_census.mjs`、`_flags.mjs`、`_contrast.mjs`、`_ratios.mjs`、`_cssquality.mjs`、`_assets.mjs`、`_scan2.mjs`、`_fontsize.mjs`、`census.json`），未写入任何受跟踪路径。
- 跑 `collect-schemes.mjs` 时它重写了受跟踪的 `prototypes/_selection/data.js`（1 行），**已 `git checkout --` 复原并确认**。
- 渲染计时用的是 `/tmp` 输出目录，跑完已删除；`S17/.inspect/report.json` 的 `at` 仍为 `2026-10-23T19:03:13.313Z`，未变。
- `git status --porcelain | grep -v '^??'` 为空 —— **无受跟踪文件被修改**。
