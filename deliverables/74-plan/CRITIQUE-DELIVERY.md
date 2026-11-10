# CRITIQUE — 交付面提案（74-plan / DELIVERY.md）

> 独立批评者。只认能复核的证据：file:line、实测字节、可重跑命令。
> 基线：`D:/Web/style` HEAD `0432753`，Pages 线上 `https://sqkl520.github.io/web-style-atlas/` 已核对与本地逐字节相同。
> 口径：**[实测]** 本轮命令；**[复算]** 载入 `data.js`/`prompts.js` 现算；**[源码]** file:line。

---

## 0. 一句话结论

**诊断基本正确，处方有一处会把产品做小。**DELIVERY.md 找对了病（首屏不说交付物、复制那一下偷焦点、60 张隐藏图、面板太长、`scenesNo` 无人读），但把「首屏问行业」当成了答案——而仓库自己的数据说：44 个行业词里只有 16 个有直连方案，73 个词里 57 个点下去拿不到直连。**把 64% 的用户第一次互动做成"我们没有你这个行业"，不是五秒测试的通过，是第一次失败的入口。**

逐项裁决：**1 REJECT（诊断留、处方退）· 2 SOUND-WITH-CHANGES · 3 REJECT · 4 SOUND-WITH-CHANGES · 5 SOUND · 6 SOUND-WITH-CHANGES · 7 漏了三件更贵的**。

---

## 1. 「首屏问『你是做什么的？』，30 案网格退到第二层」——**REJECT（按现写法）**

### 1.1 先承认它对的部分

首屏确实没说清交付物。`prototypes/_selection/index.html:40` 的 H1 是「三十个案，一条渲染口径」，`:39` 是「网站设计风格方案 · 选型台」，全页没有一处说「复制一段提示词」。根页更空：`D:/Web/style/index.html:11` 是 0 秒 `meta refresh`，`index.html:30-31` 只有「正在前往选型台…」。这一段 DELIVERY.md §0 说得对，`deliverables/74-recon/ux.md:19` 也独立记过。

它引用的"30 张卡像同一张卡的 18 个变体"也有数据：`index.html:175` 写 18/30 暖浅色带，我复算 `data.js` 的 `axes.band` 分布确为 18/5/3/2/1/1，是真的。**所以"不要原样摆 30 张"成立。**

### 1.2 但它误认了向导的第一问——这是硬伤

DELIVERY.md:37 说「`wizard.html/js` 已经证明第一问可以不是『你喜欢什么风格』……**只搬向导的第一问**」，:39 说「首屏问：『你是做什么的？』」。

**向导的第一问不是这个。** `prototypes/_selection/wizard.html:30-31` 逐字是：

> 问题 1 / 5
> **你这一页大概要装多少内容？**

五问依次是内容量、图片量、安静度、首屏引导、更怕哪种失手（`wizard.html:33-80`，`wizard.js:52-80` 的 `load/img/loud/guide/fear`）。「你是做什么的」是**选型台筛选栏的第一组**（`index.html:163`），不是向导的问题。DELIVERY.md 把两个不同的控件记成了同一个，`wizard.html:21-22` 那句「不问的是『你喜欢什么风格』」讲的是**风格偏好**，也不是行业。

结论：**"只搬向导第一问"这条移植路径不存在。** 新首屏的行业问法没有现成实现可搬，`mountSceneChips()` 在 `prompt-copy.js:1261-1359`，它依赖 `window.benchSetSceneIdsParkingQuery`（`app.js:1643-1647`）——也就是说，首屏要复用芯片，就得把 `prompt-copy.js`（125,724 B）与 `app.js`（106,222 B）一起搬到根页。这不是"省字节"，是**换一个地方加载同一套引擎**。

### 1.3 最强反对：第一次互动对 64% 的用户是失败

DELIVERY.md 自己的首屏草图画的是「你是做什么的？」+ 6–8 颗实心芯片 + 「还有 28 种行业只有近似款」（:56-58）。它援引的数字"16 个 direct 非空"（:82）是真的，但**推论反了**：

| 量 | 实测 | 证据 |
|---|---:|---|
| `sceneIndex` 行业词总数 | **44** | `prompts.js:17-346` |
| 有直连（direct 非空） | **16** | `prompts.js:17-346` 复算 |
| 只有近似（near-only） | **28** | 同上 |
| 连近似都没有（`unsupported`） | **29** | `prompts.js:347-377` |
| 全部行业词 | **73** | 44 + 29；`README.md:78` |

把行业做成首屏第一问，等于让 **57/73（78%）的词**点下去先看到"没有直连"，**28/44（64%）**的行业词只能拿到近似款。而"实心＝直连"的芯片只有 16 颗，首屏还只放 6–8 颗（:57）——**用户最常见的那一行，大概率不在这 8 颗里**。五秒测试要回答的是"这里跟我有关"，而首屏先问一个对多数人答不上"有"的问题，回答的是"这里没有正好给你的"。

这不是我推测。仓库自己在空状态里写死了这个事实：`index.html:309` 逐字「这三十个案不按行业建索引——30 个案没有『行业』这一维；左侧『你是做什么的』44 个行业词里只有 16 个有直连方案」。**把这条"缺口"搬到首屏当欢迎语，是把已知短板做成第一印象。**

### 1.4 第二强反对：它会打断唯一有文档承诺的深链

DELIVERY.md §0 决定「把根 `index.html` 直接做成新的首屏（不再跳转）」（:27）。但**仓库唯一公开承诺的分享形态是 `/prototypes/_selection/#Sxx`，不是根 + hash**：

- `README.md:71`「`#S07` 能深链分享」，上下文是 `README.md:49-52` 的 `http://localhost:8080/prototypes/_selection/`；
- `prototypes/_selection/index.html:211`「地址栏的 `#S07` 可以直接分享单个方案」——这句话印在**选型台**上；
- `wizard.js:221` 生成 `'<a href="./#' + r.id + '">到选型台看它的三档截图 →</a>'`，`./` 相对 `wizard.html` 即 `/prototypes/_selection/`；
- 实测量到的完整形态是 `http://127.0.0.1:<port>/prototypes/_selection/#S06`（`deliverables/36-critique-bench-defense.md:139`）。

根 `#Sxx` 今天本来就是断的（`ux.md:249-252`：根 `index.html#S07` 最终落到 `…/_selection/`，hash 丢了）。提案去掉 refresh 之后，如果根页不实现 `#Sxx` 路由，**根地址 + `#S07` 会渲染新首屏并静默忽略 hash**——比今天的"丢 hash"更糟，因为今天至少落到了能认 hash 的页面。根 `index.html:1-35` 现在**没有一行 `<script>`**，没有任何 `#Sxx` 消费者；唯一的消费者在 `app.js:1608-1613,1618-1621`，只被选型台加载（`_selection/index.html:362-366`）。

还有三处会跟着变成假话：
- `index.html:12` 的 `<link rel="canonical" href="./prototypes/_selection/">` 会把新首屏"规范化"回旧页，与 :122 的新标题/H1 直接冲突；
- `README.md:255` / `README-EN.md:256`「根目录的 `index.html` 会自动跳到选型台」立刻过期；
- `wizard.html:23` 的 `<a href="./">← 回到选型台（看全部 30 个）</a>` 与新根页的语义冲突。

### 1.5 第三强反对：它没算首屏示例是错的

DELIVERY.md:84 的结果头写「咖啡店 · 1 个直连风格 · **另有 2 个近似款**」。实测 `prompts.js:18-27`：咖啡店 `direct:["S06"]`，`near:["S19","S22","S09"]`——**3 个近似，共 4 条**。芯片点击把 `direct.concat(near)` 一起塞进 `benchSetSceneIdsParkingQuery`（`prompt-copy.js:1316`），`ux.md:517` 实测点「咖啡店」后 `count=4`。所以 :41「第一屏下半部立刻换成 3 张可用的方案卡」也少了一张。

另有两处词表错误：:57 把「**独立品牌**」列为芯片，`sceneIndex` 与 `unsupported` 里都**没有这个词**；把「餐厅」「书店」「花店」列为"实心芯片"也不对，它们是 near-only（`prompts.js:35-40,51-57,270-275`），按 :83 自己的图例是**虚边**。

### 1.6 裁决与最小改法

**REJECT**"问题当首屏、网格退第二层"这个处方；**保留**它的诊断。

改法（不是折中，是换顺序）：根页第一屏应当是**一句交付物说明 + 一排行业芯片（作筛选，不作门槛）+ 一张真实截图 + 一个复制按钮**，下面紧接着**按 `axes.band` 抽样的 6–9 张卡**（不是 30 张并排），再往下才是"看全部 N 个"。行业芯片是**过滤器**，不是**闸门**——未命中时不是"我们没有"，而是**无声地退回全量抽样**。这样：五秒测试过（说明在前）、64% 的用户不会撞空（问题可选）、深链只需根页加一个 `#Sxx`/`#tpl-exit` 路由器（约 15 行）或干脆保留 `/prototypes/_selection/` 作为唯一深链目标并在根页显式 `location.replace` 带 hash 转发。

---

## 2. 「冷载 ≤1.2 MB」——**SOUND-WITH-CHANGES**

### 2.1 先把它对的数复核一遍

| 提案说法 | 本轮实测 | 裁决 |
|---|---|---|
| app.js 106,222 → 42,224 B gzip | `curl -D -`：带 `Accept-Encoding` 时 `Content-Length: 42224`、`Content-Encoding: gzip`、`Vary: Accept-Encoding`；不带时 106,222 | **真**。GitHub Pages 确实对 JS/CSS 开 gzip |
| 60 张隐藏图 ≈ 4.84 MB | 逐文件 `statSync`：desktop-fold 合计 **4,770,298 B**，tablet-fold **3,340,480**，mobile-fold **1,730,381** → 隐藏的 60 张 = **5,070,861 B = 4.84 MiB** | **真**（按 MiB） |
| 9.39 MB 图 | JPG 合计实测 9,841,159 B = 9.39 MiB | **真** |
| 剥注释省 97,794 B gzip | 用与 `check-docs.mjs:436` 同一套剥法 + `zlib.gzipSync(level:6)`：6 文件 gzip **263,107 → 157,889**，省 **105,218 B** | **真（还保守了）** |
| 5 个文本文件 gzip 合计 | `gzip -c` 逐个：data 102,212 + prompts 19,630 + prompt-copy 49,608 + app 41,782 + style 34,502 = **247,734 B = 242 KiB** | 见下 |

### 2.2 但预算表内部有一处算不通

DELIVERY.md:242 写「图片 ≤600 KB（首屏只 ≤6 张可见截图）」。实测 30 张 desktop-fold 的**均值是 159,010 B**（min 78,212 / max 300,012，只有 **4/30** ≤100 KB）。**6 × 159 KB = 954 KB，不是 600 KB。**"≤6 张"与"≤600 KB"不能同时成立，除非换成新产物（webp 缩图）。提案自己在 :253 承认要"另出 `*-thumb.webp`（≤40 KB）"——那就意味着 :242 的表格必须写明"图片预算以缩图为前提"，否则按现有 jpg 量，6 张就破 600 KB。

### 2.3 1.2 MB 到底够不够：够，但前提比提案写的更硬

把真实数字代进第一屏：

```
文本（6 文件 gzip）        247,734 B = 241.9 KiB
字体 CSS（3 个 gzip）      770 + 32,272 + 972 = 34,014 B = 33.2 KiB
woff2（首屏实际拉取）      提案说 ≤220 KB；本轮只测到总量 38 个 / 1,991,128 B，
                          首屏切片字节未实测，按提案 ≤220 KiB 计
图片（首屏 4 张 desktop-fold，jpg）  4 × 159,010 = 636,040 B = 621.1 KiB
图片（首屏 4 张 webp 缩图）          4 × 40 KiB  = 160 KiB
```

- **不换 webp、首屏 4 张 jpg**：241.9 + 33.2 + 220 + 621.1 = **1,116 KiB ≈ 1.09 MiB** ——压线过。
- **首屏 6 张 jpg**：241.9 + 33.2 + 220 + 931.7 = **1,427 KiB ≈ 1.39 MiB** ——破。
- **换 webp 缩图、首屏 4 张**：241.9 + 33.2 + 220 + 160 = **655 KiB** ——宽裕。

所以 **1.2 MB 是诚实的，但只在"首屏 ≤4 张且换缩图"这两个条件下诚实**。还有一个口径要先钉死：提案 :239 写「**≤1.2 MB**」，而它引的基线「11.3 MB」来自 12,642,201 B（`ux.md:60`）= 12.06 MiB / 12.6 MB（十进制）。**1.2 MB 到底是 1.2 MiB 还是 1.2×10⁶ B，差 4.9%（1,258,291 vs 1,200,000）**——压线方案里这 4.9% 正好是成败。验收前必须写明用哪个。

提案 :255 的"总账"把 ~3 MB 的 lazy 收益和 ~0.5 MB 的 webp 收益加在一起，方向对，但没指出：**桌面 30 张 fold 本身就有 4,770,298 B（4.55 MiB），一旦用户往下滚，总下载仍会到 5 MB 量级。**"首屏 ≤1.2 MB"是首屏指标，不是整页指标，提案没有把这条界线写清，容易在验收时被自己骗过去。

### 2.4 一个反直觉的结论：data.js 不必拆

DELIVERY.md §4.3-5 说要拆 `data.js`（307 KB / gzip 103 KB），理由是首屏不需要长散文。但**文本全加起来才 242 KiB，远低于它自己给的 350 KB 文本预算**。也就是说：**拆 `data.js` 不是达标必需，而是"方案可自由增删"的架构收益。**这一点很重要，因为 §4.3-5（:252）说「`data.js` 改成只在『全部方案 / 详情』页加载」，而 §1.2（:87）又要求首屏 `N = window.SCHEMES.length`——**如果根页不加载 `data.js`，`window.SCHEMES` 就是 undefined。**这是 DELIVERY.md 内部的一处硬矛盾（§4 要拆、§1 要用）。

裁决：**SOUND-WITH-CHANGES**。1.2 MB 可达，但必须（a）把"≤6 张"改成"≤4 张 + webp 缩图"，（b）明确 1.2 MB 只约束首屏，（c）解决 `window.SCHEMES` vs 延迟加载 `data.js` 的矛盾（要么内联精简索引且 **N 从索引取**，要么承认 data.js 留在首屏）。

**命令（可重跑）**：`curl -sS -D - -o /dev/null -H 'Accept-Encoding: gzip' https://sqkl520.github.io/web-style-atlas/prototypes/_selection/app.js`；`node -e "zlib.gzipSync(fs.readFileSync(...))"`。

---

## 3. 「30/30 都标 `needsJS`」——**REJECT**（数字是数出来的，不是判出来的）

### 3.1 提案的推理链在哪一步断了

DELIVERY.md:193-199 的依据是 `00-SYNTHESIS.md:89`：「**30/30 原型带 `<script>`**（约 2,844 行内联 JS），提示词 DNA 里 0/30 提到 JavaScript」。这一步我复核为真：30 个案每个都至少有一个 `<script>`，内联总行数 **2,785**（本轮复算，剔空块；与 2,844 的差是口径差）。**但"带 script"不等于"签名机制需要 JS"。**

提案要写进提示词正文的那句话是：「这个风格的**核心动作**必须用内联 `<script>` 实现……先量出需要对齐的元素几何，再按下面的机制驱动」（:201）。这是对 AI 下的一条硬指令，而它成立的判据应当是：**`mechanisms` 句里描述的那个可见结构，在无 JS 时是否还存在。**不是"文件里有没有 script"。

### 3.2 我按签名机制逐案判了一遍（三个独立 Agent 分片 + 我抽查回验）

判据：`mechanism` 句（`prompts.js` / `_prompts/mechanisms.mjs`）描述的是**静态版式/颜色/几何**，还是**运行时测量/生成/驱动**。落版动画、交互状态、错误/空态、滚动读数、指针跟随一律不算签名。

| 案 | 判定 | 关键证据 |
|---|---|---|
| S01 | CSS_ONLY | 楔形是静态 `clip-path`；栏沟 `--bar:24px` 进 `grid-template-columns`。脚本只做逐栏落版、折角开合、P-03 重试 |
| S02 | CSS_ONLY | 镜像由 `style.css:149` 的 `transform: scaleX(-1) translateY(-28px)` 静态生成；级数 `--n:7/9`、级差 56px 静态 |
| S03 | **BORDERLINE** | 轴面是**空 SVG**（`index.html:62` `<svg class="scale"...></svg>`），81 条刻线由 `:221-250` 注入——无 JS 只剩空板 |
| S04 | CSS_ONLY | 12 列 + 跨栏 + 逐块内联 `--span` 全是静态 |
| S05 | CSS_ONLY | 分区 `grid-column` 跨度 + 5×7 字模静态 `<defs>` |
| S06 | **NEEDS_JS** | 差速只在 JS：`dy = lag * 0.6 * (coef-1)`，写 `--dy`；而 `style.css:187` 的 `--dy` 默认 **0px**，无 `animation-timeline` 后备 |
| S07 | **NEEDS_JS** | 透印层是空壳 `<svg class="ghost">`（`index.html:94`），`app.js:15-46` 逐行 `getBoundingClientRect()` 量位置再生成 `<text>` |
| S08 | CSS_ONLY | 层号位移 `translate3d(calc(var(--l)*24px))`、侧壁 `min(10px,...)` 全静态 |
| S09 | CSS_ONLY | `rotate(--tilt:1.5deg)`、`min-height:56px`、描边 3.5/2px 静态 |
| S10 | CSS_ONLY | `--misreg:1.5px` / `--misreg-start:3px` 静态；IO 只是加 `.settled` |
| S11 | CSS_ONLY | 三层 `drop-shadow` ×3、`--hang:56px`、`--measure:34em` 静态 |
| S12 | CSS_ONLY | `clip-path: polygon(var(--cut)...)`、`--cut:30px` 静态 |
| S13 | CSS_ONLY | 按下翻光源可用 `:active`/`:has()` 表达；`translateY(0.8px)` 在 CSS |
| S14 | **BORDERLINE** | 签名"沿 48px 半径平漂"由 CSS `@keyframes drift` 承担（`style.css:130-131,281-288`）；JS 负责指针牵引与质心读数 |
| S15 | CSS_ONLY | `grid-column:1/9` + `--off:0/3/7px` + `--op:0.56` 静态 |
| S16 | **BORDERLINE** | 12° 斜线 + 块宽档位静态；但响应式 span 数组与二次方滚动位移在 JS |
| S17 | CSS_ONLY | `minmax(210px,3fr) 16px 9fr` + `<circle r="1.2">` 静态 |
| S18 | CSS_ONLY | 单列 12% / 8px 边条 + `animation:cu-blink` 静态 |
| S19 | CSS_ONLY | `--bar:24/--pull:24/--win:144` + `translateY(var(--pull))` 静态 |
| S20 | **NEEDS_JS** | 静态 HTML 只有 3 圈基准（`index.html:72-73` 自注「其余 20 圈按公式现算」），20 圈靠 `createElementNS('path')` 运行时生成 |
| S21 | CSS_ONLY | 14 枚条 + `clip-path` 30/45/60° 静态 |
| S22 | CSS_ONLY | `repeat(6...) var(--fold-track) repeat(6...)` + 折痕静态 |
| S23 | CSS_ONLY | 9 处断面 + `repeating-linear-gradient(62deg)` 静态 |
| S24 | CSS_ONLY | 叶脉 SVG 路径 + 四级 `stroke-width` 静态 |
| S25 | CSS_ONLY | `mix-blend-mode: multiply` 由 CSS 合成 |
| S26 | CSS_ONLY | `transform: skewY(--skew)` + `5fr 3fr 4fr` + `drop-shadow` 静态 |
| S27 | CSS_ONLY | `--mis:1.8px` + `.act::before translate()` 静态 |
| S28 | CSS_ONLY | `repeat(16,...)` + 逐块 `--mis:4..14px` 静态 |
| S29 | CSS_ONLY | 穿孔是 data-URI SVG 平铺 + 静态悬挂编号 |
| S30 | CSS_ONLY | 撕痕是**预生成位图** + `--cut:-32deg/--band-h:96px` 静态 |

**真实计数：NEEDS_JS = 3（S06 / S07 / S20）；BORDERLINE = 3（S03 / S14 / S16）；CSS_ONLY = 24。**即便把三个 borderline 全算进去，也只有 **6/30**，不是 30/30。

### 3.3 更有杀伤力的一条：有 JS 反而毁掉签名

S02 的 JS 在首帧就执行，`window.addEventListener(...)` 之后 `phase()`（`index.html:373`）。scrollY=0 时算出 `p=0`，然后 `:266` 执行：

```js
foilB.style.transform = 'scaleX(-1) translateY(' + p.toFixed(2) + 'px)';
```

把 `style.css:149` 写死的 `translateY(-28px)`（半个 56px tier，正是机制句要的「180° 相位」）**覆盖成 0**。也就是说，**带 JS 的 S02 比禁 JS 的 S02 更不像它自己**。在这种情况下给 AI 写「核心动作必须用内联 `<script>` 实现」，是在教它复刻一个被脚本破坏的效果。

### 3.4 裁决

**REJECT**。`needsJS` 这个字段该有，但它的值必须**逐案判机制**，不是「有没有 `<script>`」。按现写法上线，会让 24 个纯 CSS 的风格在卡片上印「这一案需要 JavaScript」（:199、:315），**把「我可以用纯 CSS 做出来」这个卖点，主动说成「你得会写 JS」**——对店主是最劝退的一句话。

正确做法：`needsJS` 按 S06/S07/S20 为 true、S03/S14/S16 视口味、其余 false；提示词只对这三案加 JS 指令。**对 24 个 CSS_ONLY 案，提示词应当反向加一句「不要用 JS 实现这个机制」**——那才是本仓越多越好的一致性。

---

## 4. 「详情面板拆 判决层 + 施工层」——**SOUND-WITH-CHANGES**

### 4.1 它想修的问题是真的

详情面板确实太长：`ux.md:93-107` 实测折叠前中位 **650 字**（最坏 829），390 档 2.85 屏；`app.js:1364-1369` 的注释自己解释了两个"为什么不折"，但没有解释为什么三段平铺字段排在五条折叠条**之后**。`app.js:1356-1395` 的 12 段里，7 段平铺、5 段折叠。这些都对。

### 4.2 但「不新增字段」是假的，而且会打红闸门

DELIVERY.md:142 说「**不新增字段、不删数据**，只做三件事」，:356 又说把 `field('适用场景', r.scenes)` 拆成 `field('适合', r.scenesYes)` + `field('不适合', r.scenesNo)`。**这是删 1 个、加 2 个，净 +1 个 `field()` 调用。**

`check-docs.mjs` 的计数口径是**扫全文件**、不认 `<dl>` 边界：

- `check-docs.mjs:437` `const fieldCalls = (js.match(/\bfield\(\s*'/g) || []).length;`
- `:447` `totalFields: fieldCalls + (hasAuditFold ? 1 : 0)`
- `:765-770` 把 README 的「全部 N 段字段 / all N fields」与 `P2.totalFields` 比

我静态模拟了两种落地：

| 变体 | `<dl>` 内 field() | 判决卡 field() | fieldCalls | totalFields | README 写 12，结果 |
|---|---:|---:|---:|---:|---|
| A：判决卡也用 `field('适合')/field('不适合')` | 10 | 2 | 12 | **13** | `:770` FAIL「实测 13 段」 |
| B：判决卡用裸 HTML、删 `field('适用场景')` | 10 | 0 | 10 | **11** | `:770` FAIL「实测 11 段」 |

**两种按 :145-146 字面落地的写法都会让 `panel/fields` 变红。**唯一不动闸门仍 PASS 的写法是：施工层保留 `field('适用场景', r.scenes)`（11+1=12），判决卡两张卡用裸 HTML——但那与 :356「删除 `r.scenes` 的合并版在详情里的重复渲染」直接冲突。

### 4.3 顺序不变量仍守得住，但只在一个精确写法下

`check-docs.mjs:441-448`：

```js
const aIdx = js.indexOf('auditFold(r) +');
const rIdx = js.indexOf("field('反 AI 味风险与规避'");
auditBeforeRisk: aIdx >= 0 && rIdx >= 0 && aIdx < rIdx,
```

只要 `auditFold(r) +` 仍在 `field('反 AI 味风险与规避'` 之前，`:792` 就 PASS。DELIVERY.md:146 说「删掉『反 AI 味审查点』『设计师签名式怪癖』在**首屏的占位**」——如果"删"是指**删掉 `auditFold(r)` 调用**，那么 `hasAuditFold=false`，`totalFields` 掉到 11，`aIdx=-1`，`:792` 与 `:770` 同时红。如果只是把它们折起来（保留调用、只加 foldHint），则计数与顺序都不动。**提案用了"删"字，但它的意思应该是"折"。这处措辞必须改，否则施工者照着做就会打红闸门。**

### 4.4 全部改折：闸门不在乎，但文档在乎

`check-docs.mjs` 完全不检查第 4 参 / `<details>` / DOM（只数 `field('` 字面量与 `auditFold(r) +`）。所以给 11 个 `field()` 全补 foldHint 是安全的。**但**：第 12 段是 `auditFold(r)`，它没有第 4 参入口；README.md:74 / README-EN.md:74 / :157 明确写「**第 12 段字段『去 AI 味审查点』是折叠的**」「其中一段折叠」，全折之后这句话变成假的，而闸门**不会**替你发现（它不解析这两句）。

### 4.5 迁移成本远不止 3 小时

DELIVERY.md:308 给「约 3 小时」，:401 又给 M4 **5 天**。实测受影响面：

1. `app.js`（`renderDetail` 拼接 + 11 个 foldHint + 判决卡 + `rowHTML` meta + `plainOf` 接线 + `:1139-1147` 不变量注释）
2. `style.css`（判决层布局 + 390 档）
3. `index.html:211`（字段数文案）
4. `prototypes/_build/collect-schemes.mjs:630-670`（生成 `scenesNoBrief`）→ 重生成 `data.js`
5. **`check-docs.mjs`**（`panel` 计数、`:289-294` 的 `--selftest` 硬编码 `'与全部 12 段字段。'` 变异用例、`:770/:801` 消息）
6. `README.md:63,70,74,155-157` + `README-EN.md:63,70,74,155-157`（双语）
7. 两个 CDP 探针 + 冻结产物 `measure-out.json` / `measure-out2.json`
8. `_entries.mjs:43-69` 会让 `check-stale` 要求重跑 `_selection` 渲染 + `self-gate.js` / `report.json`

**最小一致迁移约 1.5–3 人日，不是 3 小时。**提案自己在 M4 给 5 天，说明它心里知道这个数；:308 的"3 小时"是只算 UI 重排、没算闸门与双语。

**裁决 SOUND-WITH-CHANGES**：问题真、方向对；但必须（a）把这几处措辞改成"折、不是删"，（b）明确判决卡用裸 HTML、施工层保留 `field('适用场景')`（或同步改 `check-docs` 计数口径），（c）成本改成 1.5–3 人日，（d）双语与探针列入清单。

---

## 5. 「`.md` 下载 + 四工具只换首部、不维护四份」——**SOUND**（这是提案最正确的一条）

### 5.1 「不写四份提示词」正是本仓的硬教训

README.md:101 逐字：「**为什么不给 4 个 AI 写 4 套**：分叉是这个仓库最硬的教训（`templates/M01` 的 `box-shadow` 曾出现中英两份文档结论相反）。**一个主干 + 一句适配。**」DELIVERY.md:183 的做法正是这句的直译：一份 `buildPrompt(id, opts)` 文本，工具只影响（a）确认语里的工具名、（b）粘进去时一起复制的 1–2 行首部。**它没有制造第二个真源，这是对的。**

### 5.2 `.md` 下载在 `file://` 与 Pages 下都能工作

DELIVERY.md:209 说「Blob 生成（无构建、无新文件）」。Blob URL + `<a download>` 是纯浏览器 API，不依赖服务器 MIME、不依赖构建、`file://` 与 `https` 都可用——这一条是对的，且与 `prompt-copy.js` 现有的"零构建、零模块"一致。

文件名用 `data.js:6` 的 `dir`（`S06-showa-kissaten-ledger`）避免中文乱码，也对：`data.js` 每条记录的 `dir` 是 ASCII。

### 5.3 唯一的隐患：它不是"第三顺位"，会变成"第一条真源"

提案 :210 说「不是主路径，视觉上做成文字链接或次级按钮」——**但一个可下载的文件会被用户当成"源"。**一旦有人下载 `.md`、改两行、发出去，`buildPrompt()` 的后续修正就追不上那份副本。这不是反对它，而是要求在 `.md` 里加一行**生成时间戳与方案号**（:209 已经写了"生成日期"，对），并**不把它做成主按钮**（:210 已经写了，对）。

另一个更小的坑：提案 :412 的验收写「`.md` 下载内容与剪贴板**逐字节相同**（除标题行）」——这条能自动断言，很好；但要提醒：`buildPrompt()` 受 `opts`（工具选择）影响，剪贴板与 `.md` 必须在**同一次选项状态**下生成，否则第 0 节那段工具首部会让两者不等。验收断言时应固定选项。

**裁决 SOUND。**这是全篇最该保留的一条，理由不是它聪明，而是它**没有违反本仓最贵的那条教训**。

---

## 6. 「M1–M6 各自可独立上线」——**SOUND-WITH-CHANGES**（不成立，但有 DAG 可救）

DELIVERY.md:396-406 每格都写「**是**」，:429 写「M1–M6 均可独立 push 上线」。我逐条查了隐藏边，**至少五条不自洽**：

1. **M1 的芯片样式修复依赖 M1 自己的计数修复。** §5 P1⑤（:291-294）给 `.scene-more` 加 `class="chips"`（`prompt-copy.js:1277`）；§5 P0④（:285-287）要求计数由 `$$('.chips button').length` 现算。今天 28 颗近似芯片在 `.scene-more` 里、在 `#flt-scene` 之外（`prompt-copy.js:1345` `host.parentNode.appendChild(moreHost)`），`style.css:322` 只选 `.chips button`——这就是 `ux.md:318-320` 量到的 45 vs 73。**一旦加了 `class="chips"`，`$$('.chips button').length` 会从 45 跳到 73**，所以 P0④ 和 P1⑤ 必须同批设计与上线；分开做，第二个会把第一个的数字改错。

2. **M1 的「不适合上卡片」依赖 M5 的生成器。** :356 要求 `collect-schemes.mjs` 输出 `scenesNoBrief`。我 grep：`scenesNoBrief` 在 `prototypes/` 下**零命中**，`collect-schemes.mjs:650-670` 只出 `scenesYes`/`scenesNo`。而 :402 把生成器划给 M5。**M1 的用户可见结果需要 M5 的文件。**

3. **M3 的 `needsJS`、M2 的内联索引，依赖同一个生成器。** `grep needsJS prototypes/` 零命中；`build-prompts.mjs:355-370` 只写 `{sceneIndex, unsupported, hardIds, schemes}`。:252 说 M2 的内联索引要含 `needsJS`，:400 说 M3 改生成器，:402 说 M5 改生成器——**同一个文件被三个里程碑认领。**

4. **M2 会把一个已知是错的提示词放到首屏主按钮上。** `prompt-copy.js:820-843` 的输出要求里没有 JS 指令；`00-SYNTHESIS.md:89,101-124` 记着 0/30 提示词提 JS、S07 的「5 栏对 7 栏」、S17 的「96px」是错的（`prompts.js:709`）；DELIVERY.md:205 自己写「**在修好之前不许写『100% 照原型复刻』**」。M2（:41,65,73,85）却把复制按钮放到首屏并声称独立。而根页复制控件又是 M3 的交付物（:400「新根页的复制控件」）。**M2 与 M3 在同一个控件上相遇。**

5. **M3 已经自认依赖 M1，直接反驳 :406/:429。** :400 括号里写「**依赖 M1 的焦点修复**」。

6. **M1/M3/M4 改同一段代码。** `app.js:1356-1395`（M1 :398 与 M4 :401 都改）、`prompt-copy.js:982-1201 mountPromptButton`（M1 :279 与 M3 :400 都改）、`app.js:1393` 的 `field('适用场景', r.scenes)` 被 M1 §6 与 M4 :145 同时重写。

7. **M6 断言 M1–M5 全部。** :410-415 逐条编码前五个里程碑的验收，:415 写「上述五组断言……全绿」。**M6 天生不能先上。**

### 真正可执行的 DAG

```
M5（生成器：scenesNoBrief + needsJS）──► M1（卡片/焦点/芯片/计数）──► M4（判决层）
                    │                              │
                    └──────────────► M3（交接闭环 + 提示词正确性）
                                                   │
M2（根页 + 路径重基 + 首屏）◄──────────────────────┘（首屏复制按钮要知道 needsJS 与正确提示词）
                                                   │
                                          M6（线上回归，断言 M1–M5）
```

两个必须点名的隐藏前提：
- **M2 需要路径重基。** `data.js:59-63` 用 `../Sxx/.inspect/…`、`_selection/index.html:8-10` 用 `../_fonts/…`、`prompt-copy.js:1438,1448,1457` 用 `../../templates/…`、`app.js:1284` 用 `'../' + r.dir`。这些前缀在**根页**会 404（我实测 `https://sqkl520.github.io/_fonts/css/archivo-vf__wdth-wght.css` → 404）。提案完全没提这件事，而 M2 的全部价值都依赖这些路径正确。
- **M2 的行业问题回答依赖 44 词索引的正确性**，而索引的 `scenesNo`/`scenesYes` 一致性（见 §7-c）属于 M5/M4 的数据工作。

**裁决 SOUND-WITH-CHANGES**：把「可独立上线」改成「按 DAG 排序后每步都不会让站点半可用」。这个结论比原文更强也更有用——它仍然是渐进的，只是不假装无依赖。

---

## 7. 提案漏了什么更要紧的——三件，按代价排序

### 7(a) 线上正在公开服务 31 张未署名位图（以及它们的截图）——**最贵，零提及**

我搜了整份 DELIVERY.md（1-429 行）的 `署名|CREDITS|许可|授权|版权|attribut|对外复用|位图|照片|素材|MIT|license`：**零命中**。唯一出现「徽章」的是 :376 讲"价格/星级/分类徽章"的比喻。

而线上实测（Pages 与本地 `0432753` 逐字节相同）：

| 路径 | HTTP | 字节 |
|---|---|---:|
| `prototypes/S04-mango-collage-wall/assets/plate-01.webp`（`S04/index.html:53` 在用） | 200 | 68,350 |
| `prototypes/S07-slate-ink-contents/assets/plate-masthead.jpg`（`S07/index.html:103`） | 200 | 56,730 |
| `prototypes/S08-amber-overprint-lightbox/assets/overprint.png`（`S08/index.html:150`） | 200 | 17,992 |
| `prototypes/S17-revenue-stamp-stub/assets/heritage-1905-hejaz-revenue.jpg`（`S17/index.html:140`） | 200 | 319,203 |
| `prototypes/S04…/.inspect/desktop-fold.jpg` | 200 | 115,124 |

`LICENSE:24-28` 明写这些照片「**不得对外复用**，直到署名表补齐」。`.nojekyll` 让 `main /` 原样供应，于是**一份自己写"不得复用"的仓库，正在公开分发这些文件**。在"strangers 不 clone、只看 Pages"这个新前提下，这比 clone-only 时更严重：**下载者不需要 clone 就能拿到。**

DELIVERY.md 反而把这条当好消息（:18「dot 目录仍被 Pages 正常供应」；:20「不需要再开通 Pages」）。同目录的 `OFFERING.md:327` 与 `CRITIQUE-OFFERING.md:187` 都把「止血公开许可链」排在改封面之前，**DELIVERY 把那个前置条件丢了。**

数量口径也要说清（本仓有 31/46/51/56/43 五个数）：**31 = 四案 `index.html`+`style.css` 实际引用的位图数**（S04 13 + S07 7 + S08 6 + S17 5，`redteam.md:448,901`）。但其中 S04 与 S08 的位图是**程序生成**（`S04/build/make-plates.py:3`「没有摄影原稿…直接生成」；`S08/build-assets.py` 只读自己的六张 PNG）。**能确证是第三方、在用、未署名的照片只有 12 张（S07 7 + S17 5）。**这个区分很重要：它把"31 张法律风险"降为"12 张真照片 + 19 张生成物的署名表述问题"，但仍足以要求在 M1 之前加一条"许可止血"。

### 7(b) `scenesNo` 上卡片会与行业芯片自相矛盾——提案称"两者不冲突"

DELIVERY.md §6.3（:352-356）要每张结果卡同时印 `适合：{scenesYes}` 与 `不适合：{scenesNoBrief}`。我用 `data.js` 复算 near 芯片对：

- **直连芯片 17 对：0 冲突。**「实心＝有直连」安全。
- **近似芯片 77 对：3 对直接打架**——展览→S23（`data.js:1972` 的 `scenesNo` 逐字说「以高清大图或视频为核心的艺术**展览**页」）；诊所→S29（`data.js:2486`「…教育或**医疗**场景」）；内容媒体→S07（`data.js:593`「以短视频为主的娱乐**内容站**」）。**芯片说"近似：S23"，卡片说"不适合：…展览页"。**
- 更大的、**先于本案**的矛盾在另一边：**77 个 near 对里有 33 个的 `scenesYes` 点名了芯片词**，其中 **12/28 个 `direct:[]` 词是"每一行都点名"**。例如「工业设备」→ S05 `data.js:420`「**工业**监控产品」、S29 `data.js:2485`「**工业设备**与硬件」；「档案」→ S07/S11/S23 三案都点名。所以 `index.html:165` 的「虚边＝换文案能用但不是为这行做的」**今天就被作者自己的正面字段否定**，只是 `scenesYes` 从没显示过。§6.3 把 `scenesYes` 第一次放上卡片，等于**第一次把这条矛盾摆到用户眼前**。
- **截断规则会制造反向语义。** :352 说超 42 字截到第一个句号。我数了 30 案：**27/30 的首句不含任何否定词**，极性完全靠前缀「不适合：」承担。一旦 `scenesNo` 被塞进 `title`/`aria-label`/向导卡（:369）而丢了前缀，就会变成「复制前请确认：需要快速下单的电商流程…」——**字面意思正好相反**。§6.3 的 30 字预览行（:354）就会踩这个。

提案 §6.4（:362）说「两者不冲突，也不合并」——**这句话对 `scenesNo` 与向导的欧氏距离成立，对 `scenesNo` 与行业芯片不成立。**

### 7(c) 向导的五条真缺陷，M1–M6 一条都不修

DELIVERY.md 全文搜 `NaN|分享|重来|重置|wz-share|wz-reset`：**零命中**。向导只作为素材被引（:37,:39,:89,:362,:380,:404）。实测的五条：

1. **非法/越界 URL 参数静默给出与答案无关的推荐。** `wizard.js:275` 只查 `p.get(k)!==''`，`:278` `+p.get('abc')` = NaN，`:101` `NaN !== undefined` 为真 → `render()`；`:111` 全部距离 NaN → `sort` 退化 → 输出就是 `data.js` 顺序 **S01/S02/S03**，页面却写「内容量 undefined」。`ux.md:429-430` 实测。
2. **「重来」不清 URL。** `wizard.js:252-259` 无 `history.replaceState`；刷新会 `replay()` 复活旧答案直接跳结果页（`ux.md:470-475`）。
3. **分享按钮文字被永久改写。** `wizard.js:266` `btn.textContent='已复制：'+url`，无还原定时器；重置后重新出现时仍带旧 URL（`ux.md:454-457`）。
4. **`file://` 分享链接是废的。** `wizard.js:263` 用 `location.origin`（file 下是 `"file://"`），产出 `file:///D:/…`；`ux.md:449-453` 实测。而 `index.html:85` 宣传"双击即对"。
5. **`wizard.html:32` 的数字过期。** 写"179 字到 1212 字，中位数 509"；复算 `gate.words` 是 min 179 / max **1188**（S18）/ median **511**——两个数都不对。

这五条里，第 1 条是"界面在说谎"的最高级形态（**给出的推荐与用户答案完全无关，且页面不标降级**），比提案花 5 天做的首屏问句更伤核心承诺。**它被漏掉，是因为 M1–M6 的视角是"首屏→复制"，而向导是第二个入口。**

### 7(d) 还有一件小的但会立刻反噬

DELIVERY.md:322 立了条纪律「任何数字都由现场数据现算……不写『30』『44』『47』『10 段』『FAIL=0』这类硬编码」。但它自己在 :58 写「还有 **28** 种行业只有近似款」、:84 写「另有 **2** 个近似款」（实际 3）、:107 写「18/30」。**提案违反了它自己刚立的纪律**，而且第一个例子（2 vs 3）已经是错的。

**裁决**：漏项里，7(a) 是唯一有外部法律面、且随"公开"这个前提**升级**的；7(b) 是唯一会让**两个页面对同一用户说相反的话**的；7(c) 是唯一**给出错误答案**的。三者都比"首屏标语"更该先做。

---

## 8. 我会最先改的三件事

1. **先做「许可止血」，排在 M1 之前。** 把 S04/S07/S08/S17 的 31 个在用位图逐一补署名，或从公开树里移出（`prototypes/S*/assets/` 移出 Pages 供应、或按 `74-plan/OFFERING.md:327` 的办法）。理由：这是唯一一件**每多一天就更贵**的事，且 `LICENSE` 自己的文字正在被部署打脸。工作量 1–2 天（12 张真照片要查来源，19 张生成物只需在 CREDITS 写明是生成物）。

2. **修向导的「NaN 推荐」+「重来不清 URL」两条。** 约 10 行（`wizard.js:275-281` 加范围校验、`:252-259` 加 `replaceState`、`:266` 加还原）。理由：这是全站唯一**输出错误答案**的缺陷，而产品承诺是"帮你排除"——排除依据算不出来时给出 S01/S02/S03，等于把"选型"变成"随机"。

3. **把 `needsJS` 从"30/30"改成"逐案判机制"（3 真 + 3 borderline）。** 约半天（+1 天做 24 案的 CSS_ONLY 验证）。理由：这是提案里**唯一会主动降低产品价值**的一条——它把 24 个"纯 CSS 可做"说成"你得会 JS"。同时把提示词对 CSS_ONLY 案加一句「不要用 JS 实现」——这一条比 JS 指令更能提高产出质量。

同时：**首屏方案退回为"说明在前、行业作过滤、6–9 张按 band 抽样的卡"，不是"问题当首屏"。** 这不是三件事之一，是第 1 件的前提——因为首屏要复用 `prompt-copy.js` + `app.js`，而这套引擎的路径在根页会 404。

---

## 9. 我最强烈支持的一条

**「四工具只换首部、不维护四份提示词」（:183-191）。**

不是因为这条最亮眼，而是因为它是**唯一一条用本仓自己的失败史说服自己的**：README.md:101 记着 `templates/M01` 的 `box-shadow` 曾因中英两份文档结论相反而分叉，并把它总结为"分叉是这个仓库最硬的教训"。在一个 30 案 × 4 工具 × 季度增删的矩阵里，四份提示词会在**第三个季度**就 drift——而本仓已经为一次 drift 付过一次代价。这一条把"工具差异"压成"一句上下文"，是**用架构消除一类缺陷**，而不是用闸门追它。

如果只能保留提案的一条，保留这条。

---

## 10. 逐项裁决一览

| # | 提案 | 裁决 | 一句话理由 |
|---|---|---|---|
| 1 | 首屏问「你是做什么的」，网格退第二层 | **REJECT** | 44 词只 16 直连、73 词 57 空；64% 用户第一次互动撞空；且误认向导第一问（`wizard.html:30-31` 是"装多少内容"）；深链契约在 `/prototypes/_selection/#Sxx`。诊断留、处方退 |
| 2 | 冷载 ≤1.2 MB | **SOUND-WITH-CHANGES** | 数字基本真（gzip 42224、隐藏图 4.84 MiB、剥注释 105 KB）；但"≤6 张图 ≤600 KB"算不通（6×159 KB=954 KB），须改"≤4 张 + webp 缩图"，且解决 `window.SCHEMES` vs 延迟加载 `data.js` 的矛盾 |
| 3 | 30/30 `needsJS` | **REJECT** | 真计数 3 真（S06/S07/S20）+ 3 borderline（S03/S14/S16）；24 案纯 CSS；S02 的 JS 还会毁掉自己的签名。会把 80% 的风格说成"需要 JS" |
| 4 | 判决层 + 施工层 | **SOUND-WITH-CHANGES** | 问题真；但"不新增字段"是假的（净 +1），两种字面落法都打红 `check-docs.mjs:770`；顺序不变量只需 `auditFold(r) +` 在前；成本 1.5–3 人日不是 3 小时 |
| 5 | `.md` 下载 + 一主多适配 | **SOUND** | 与 README.md:101 的"分叉是最硬教训"一致；Blob 下载无构建、file:// 与 Pages 都可用。全篇最该保留 |
| 6 | M1–M6 各自独立 | **SOUND-WITH-CHANGES** | 至少 5 条隐藏边（M1 内部、M1→M5 生成器、M2↔M3 同一控件、M3 自认依赖 M1、M6 断言全部）；但有清晰 DAG 可救，且 M2 漏了根页路径重基（会 404） |
| 7 | 漏项 | — | 7(a) 31 张未署名位图正在公开服务（零提及，法律面）；7(b) `scenesNo` 与行业芯片 3 对直接矛盾 + 33 对既存矛盾（提案说"不冲突"）；7(c) 向导 5 条缺陷一条不修，含"输出与答案无关的推荐" |

### 未能证实的部分（不装懂）

- **woff2 首屏实际切片字节**：我只测到 `_fonts/files/` 下 871 个 woff2 / 30,324,228 B 的总量，没有用 CDP 抓首屏实际请求了哪几个切片。提案 :242 的「字体 ≤220 KB」我没有独立复核——它可能是对的（`noto-sans-sc__100..900.css` gzip 后 32,272 B，切片按 unicode-range 按需拉），但**不是本轮实测**。
- **`needsJS` 的 3 个 BORDERLINE（S03/S14/S16）**：我把它们判为 borderline 而非 CSS_ONLY，是因为签名机制的某一半确实在 JS 里（S03 的空 SVG 轴面、S14 的指针牵引、S16 的响应式 span 数组）。这三个判 CSS_ONLY 也说得过去——取决于"签名"是取 `mechanism` 句的字面，还是取原型页自述的头条机制。**不管怎么判，都不支持 30/30。**
- **S04 的 `--rot` 疑似死变量**（子 Agent 报告 CSS 读 `var(--rot)` 而 HTML 只定义 `--r`）：我没有逐行复核，若属实是一次独立的"有值没人读"，与本案无关。

---

## 附：本轮可复跑命令

```bash
# 线上 gzip 与部署状态
curl -sS -D - -o /dev/null -H 'Accept-Encoding: gzip' \
  https://sqkl520.github.io/web-style-atlas/prototypes/_selection/app.js
gh api repos/sqkl520/web-style-atlas/pages

# 文本 gzip 合计（6 文件 242 KiB）
node -e "const fs=require('fs'),z=require('zlib');let t=0;for(const f of ['data.js','prompts.js','prompt-copy.js','app.js','style.css','index.html'])t+=z.gzipSync(fs.readFileSync('prototypes/_selection/'+f),{level:6}).length;console.log(t)"

# 剥注释的真实收益（263,107 → 157,889，省 105,218）
node -e "const fs=require('fs'),z=require('zlib');const f=['data.js','prompts.js','prompt-copy.js','app.js','style.css','index.html'];let a=0,b=0;for(const x of f){const s=fs.readFileSync('prototypes/_selection/'+x,'utf8');const t=s.replace(/<!--[\s\S]*?-->/g,'').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');a+=z.gzipSync(s,{level:6}).length;b+=z.gzipSync(t,{level:6}).length}console.log(a,b,a-b)"

# 隐藏图与 fold 均值
node -e "const fs=require('fs'),vm=require('vm');const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('prototypes/_selection/data.js','utf8'),c);let d=0,t=0,m=0,n=0;for(const r of c.window.SCHEMES){d+=fs.statSync('prototypes/_selection/'+r.shots.desktop[0]).size;t+=fs.statSync('prototypes/_selection/'+r.shots.tablet[0]).size;m+=fs.statSync('prototypes/_selection/'+r.shots.mobile[0]).size;n++}console.log({desktop:d,hidden:t+m,avgDesktop:Math.round(d/n)})"

# sceneIndex 口径
node -e "const fs=require('fs'),vm=require('vm');const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('prototypes/_selection/prompts.js','utf8'),c);const P=c.window.STYLE_PROMPTS;const k=Object.keys(P.sceneIndex);console.log({terms:k.length,direct:k.filter(t=>P.sceneIndex[t].direct.length).length,near:k.filter(t=>!P.sceneIndex[t].direct.length).length,unsupported:P.unsupported.length})"

# 内联脚本行数（剔空块）
node -e "const fs=require('fs');let t=0,b=0;for(const d of fs.readdirSync('prototypes').filter(x=>/^S\d\d-/.test(x))){const s=fs.readFileSync('prototypes/'+d+'/index.html','utf8');const re=/<script\b[^>]*>([\s\S]*?)<\/script>/gi;let m;while((m=re.exec(s))){if(m[1].trim()){t+=m[1].trim().split('\n').length;b++}}}console.log({blocks:b,lines:t})"

# 闸门计数口径
sed -n '430,457p' prototypes/_build/check-docs.mjs
sed -n '758,802p' prototypes/_build/check-docs.mjs

# 线上是否供应未署名位图
curl -sS -o /dev/null -w '%{http_code} %{size_download}\n' \
  https://sqkl520.github.io/web-style-atlas/prototypes/S17-revenue-stamp-stub/assets/heritage-1905-hejaz-revenue.jpg
```
