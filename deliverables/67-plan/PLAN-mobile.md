# 作战计划 · 移动端 390×844 的两个「缺陷」——先证明它们是缺陷，再决定做不做

> **写这份计划时仓库正被并发修改。这条必须先说，它影响本文所有数字的时效性。**
>
> 我开工时（01:00 前后）`git status` 对 `prototypes/` 是干净的。到 01:16 我发现
> `prototypes/_selection/app.js` 与 `style.css` 有未提交改动；01:35 时 `index.html` 也进来了：
>
> ```
> $ git status --short -- prototypes/
>  M prototypes/_selection/app.js
>  M prototypes/_selection/index.html
>  M prototypes/_selection/style.css
> ```
>
> 那是 `deliverables/67-exec/` 里的另一个 Agent 在**动手实现**（它的 `_lab/` 下已有
> `p1-baseline` 到 `p7-foldshots` 七个探针 + `shots-detail/` 截图），它改的方向是
> **把长字段逐个折成 `<details>`，字号/行高/内距一个不动**——也就是下面 §3 的 `G4C`。
>
> 后果：**我无法对一个会移动的目标报"现状"**。所以我把测量全部搬到一份冻结快照上：
>
> ```powershell
> # 我用的就是这三行（探针 _frozen 的来源，只读 git 对象，不碰工作区）
> D:\Git\cmd\git.exe show HEAD:prototypes/_selection/app.js    > _frozen\app.js
> D:\Git\cmd\git.exe show HEAD:prototypes/_selection/style.css > _frozen\style.css
> D:\Git\cmd\git.exe show HEAD:prototypes/_selection\index.html> _frozen\index.html
> ```
>
> 冻结副本在 `deliverables/67-plan/_frozen/`（9 个文件，从 `git show HEAD:` 逐字取出，
> 只把 `../_fonts/` 与 `../../templates/` 两个相对路径改成指向仓库真身）。
> **本文所有详情面板数字都来自这份快照，与并发改动无关。**
> 列表页数字来自 `_p1_list.mjs`，也跑在同一份快照与同一套 DOM 注入上。
>
> 交叉验证：冻结快照量出 390 档详情 `scrollHeight 3537–4667`，审计报告写 `3538–4668`，
> 差 1px（`clientHeight` 取整口径），**逐案 30 个值全部对应**。所以冻结快照确实是审计测的那棵树。

---

## §0 先给结论

| # | 任务书的前提 | 我复算的结果 | 判定 |
|---|---|---|---|
| 1 | 390 档首屏 0 张完整卡 | **成立**。`mast 453.4 + rail 337.6 + bar 145 = 936`，首卡 top **954**，视口 844 | ✅ 数字对（任务书写 mast=453，实测 **453.4**；bar 145 对；首卡 954 对） |
| 2 | 首卡 954px、卡高 578px | **卡高 577.8 对**；但 `.row-def` 的 `-webkit-line-clamp:3` 在 390 档**几乎不生效** | ⚠️ 数字对，但"定义被截断"是错的（§5.4） |
| 3 | A5 实测首卡 `1003.6 → 389.4`，余量 1.4px | **A5 在 HEAD 上得到首卡 388.6、卡高 453.2、完整 1 张**。但 `1003.6` 这个起点是**并发改动期的中间态**，HEAD 起点是 **954**。余量是 `844 − 388.6 − 453.2 = 2.2px`，不是 1.4px | ❌ 起点数字错，余量数字错 |
| 4 | A5「内容一个字不删」 | **不成立**。A5 把 `.mast h1` 钉死成 26px、`.mast-facts dt` 钉成 11px、`.bar .count` 12px、`figcaption` **10px**，且**全部没有媒体查询包裹** | ❌ 见 §5.2 |
| 5 | 详情 390 档 4.2–5.5 屏 | **成立**。`3537–4667`，屏数 `4.19–5.53` | ✅ |
| 6 | 首字段 639/682/618px | **实测 626.5 / 668.6 / 605.4**，恒定差 **约 12.5px**（`.detail-head` 的 `border-bottom: 2px` + 圆整） | ❌ 见 §5.1 |
| 7 | R2 实测 `3538–4668 → 1891–2413（−48.7%）` | **实测 `3537–4667 → 1911–2415（avg 2159）`**，降幅 −48.7% 对 | ✅（区间差 20px，结论不变） |
| 8 | R2「16px 不变、12 个字段一个没删」 | **16px 对、12 字段对**。但 R2 还偷偷改了**行高 1.62→1.5、内距 12→8、正文宽 355→367** | ⚠️ 数字对，表述误导 |
| 9 | 「压排版能 30/30 达标、一个字不删」 | **成立，而且审计低估了自己**——存在**一个排版值都不动**就能 0/30 的方案（`G4C`，见 §3.3） | ✅ 但结论方向要改 |
| 10 | 26/4/30 闸门 | **成立**。`verify-prototype.mjs --all` → `达标 26 / 不达标 4 / 共 30`，exit 1 | ✅ |
| 11 | （没人提）选型台自己过不过闸门 | **不过**。1440 档 4 条 FAIL（emoji / body-size / small-text / focal-point），390 档 3 条。而 `verify-prototype.mjs` 只匹配 `^S\d{2}-`，**选型台永远不在扫描范围内** | 🔴 见 §5.1 |

**我的排序建议（按用户实际后果，不按工作量）见 §7；如果只能做一件事的答案见 §9。**

---

## §1 复算方法（每个人都能重跑）

所有探针都在 `deliverables/67-plan/`，零依赖，只用仓库自带 CDP 客户端。

### 1.1 那个坑：`Browser.launch({width})` 确实不生效

任务书提醒的这个坑**是真的，而且我用两种方式复现了**。

代码依据：
- `tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs:56` —— `width/height` 只被塞进
  `--window-size=${width},${height}` 这个 Chrome 命令行参数。
- 同文件 `:142-146` —— 真正的视口由 `Emulation.setDeviceMetricsOverride` 决定，
  也就是 `page.setViewport()`。`newPage()` 内部会调它（`:109`），所以**用 `newPage({width})` 是安全的**，
  只有 `Browser.launch({width})` 这个参数是死的。

我的实测反证（`_p3_claims.mjs`）：

```
viewportProof: {"setViewportTo1440":{"iw":1440,"ih":900}, "thenTo390":{"iw":390,"ih":844}}
```

即：`launch({width:390})` 之后 `newPage({width:1440})`，`innerWidth` 是 **1440**——
launch 的 width 对布局毫无影响。

```powershell
D:\Nodejs\node.exe deliverables\67-plan\_p3_claims.mjs   # 看 viewportProof 字段
```

### 1.2 各探针与它们回答的问题

| 探针 | 回答什么 |
|---|---|
| `_p1_list.mjs` | 列表 390/414/1440 × A0–A5 六档；`mast/rail/bar` 逐块；首卡逐块 |
| `_p2_detail.mjs` | 详情 30 案 × BASE/LHONLY/CTAONLY/N3/R2（**跑在工作区**，被并发污染，仅作方向参考） |
| `_p3_claims.mjs` | 页头链接触控高、焦点进面板、第一次 Tab、全站 `<13px` 文本 |
| `_p4_sensitivity.mjs` | **视口高 844→600 的敏感性**（这是本文最重要的一张表） |
| `_p5_scrollcost.mjs` | 「滚多少像素才见到完整卡」+ 中文字宽实测 |
| `_p7_honest.mjs` | 滚到第几像素才看到方案名/定义/截图；rail 内滚陷阱 |
| `_p8_desktop.mjs` | A5 在 1440/1180/980/768 四档的破坏面 |
| `_p9_smalltext.mjs` | A5 前后 `<13px` 块数与**字号档数** |
| `_p10_gate.mjs` | **用仓库自己的 `probe.mjs`+`rules.mjs` 判 A5 过不过闸门** |
| `_p21_inplace.mjs` | **原地改一行验证 `--s-h1`**（不用追加样式表，避免顺序假象） |
| `_p13/_p16/_p17/_p18` | 冻结快照上的详情方案矩阵 |
| `_p19_offsets.mjs` | 639 vs 626.5 的 12.5px 偏移是谁 |

### 1.3 我踩到的第二个坑：用「追加 `<style>`」模拟改动会改变层叠顺序

这一条是方法论问题，后面任何人做同类实验都会撞上。

审计报告与 `67-exec` 的 lab 都用同一个手法：往页面注入 `<style>` 或动态改 DOM，
然后量"改后"的数字。这对**局部属性**（行高、内距、max-height）是安全的，
但对**会被媒体查询覆盖的属性**是错的：

- 追加的 `<style>` 排在所有样式表之后 ⇒ 它的优先级高于源文件里**任何位置**的规则，
  包括 `@media (max-width: 620px)` 里的那条。
- 于是 `.mast h1` 的 390 档规则（`style.css:815` 的 `font-size: max(26px, 6.6vw)`）
  会被压过，实测从 26px 变成 **34px**、页头 453.4 → 497.9、首卡 954 → 998.5。

我自己第一版（`_p20_recommend.mjs`）就是这么错的。正确做法是**原地改我的临时副本**
（`_p21_inplace.mjs` 改 `_frozen/style.css` 那一行，改完还原）。
两种方法对 1440 档的结论一致，对 390 档的结论**相反**。

> **可迁移的教训：凡是改动涉及"某个视口特有"的属性，验证必须在真实源文件上做，
> 不能靠运行时注入。** 这也正是 A5 那个 bug 的成因——它是一串裸 CSS 规则，
> 在 1440 档照样生效（§4.3）。

### 1.4 冻结快照的复算命令

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
D:\Nodejs\node.exe deliverables\67-plan\_p18_fixed.mjs   # 详情：BASE/G2/G2C/G3C/G4C/R2
D:\Nodejs\node.exe deliverables\67-plan\_p4_sensitivity.mjs  # 视口高敏感性
D:\Nodejs\node.exe deliverables\67-plan\_p8_desktop.mjs      # A5 的桌面破坏面
D:\Nodejs\node.exe deliverables\67-plan\_p10_gate.mjs        # A5 过闸门吗
```

---

## §2 攻击「首屏 0 完整卡」（缺陷 A）

### 2.1 先承认事实：0 是真的，而且比"看不到卡"更糟

`_p7_honest.mjs` 的滚动深度表（390×844，脚本 `scrollDepth` 字段）：

| scrollY | 屏上任何卡 | 方案名完整 | 一句话定义完整 | 截图完整 |
|---|---|---|---|---|
| **0** | **0** | **0** | **0** | **0** |
| 110 | 1 | 0 | 0 | 0 |
| 150 | 1 | **1** | 0 | 0 |
| 250 | 1 | 1 | **1** | 0 |
| 688 | 2 | 1 | 1 | **1** |

**读法**：滚 110px 才有一张卡的第一个像素进视口；滚 150px 才看见**方案名**；
滚 250px 才看见**一句话定义**。也就是说 844px 的视口里，前 150px 是纯 chrome，
**用户连一个"这三十个案分别是什么"的字都看不到**。

不是"卡被切了一半"，是**一个字都没有**。

### 2.2 但「0 张完整卡」不是一个好判据——这是我要攻击的第一点

理由是**它把"完整"当成了必要条件**，而用户不需要卡完整才能判断这张卡值不值得看。

同一张表证明：**滚 150px（0.18 屏）就能读到方案名，滚 250px 能读到定义。**
"完整卡数"作为验收指标，会在下面这种情况下失效——
`_p4_sensitivity.mjs` 把视口高从 844 调到 800，A5 的完整卡数从 **1 变 0**：

```
[vh=844] A5  首卡top= 388.7 h=453.2 完整=1 可见=100%
[vh=800] A5  首卡top= 388.7 h=453.2 完整=0 可见=90.8%
[vh=750] A5  首卡top= 388.8 h=453.2 完整=0 可见=79.7%
[vh=667] A5  首卡top= 388.8 h=453.2 完整=0 可见=61.4%
```

**这些数字是任务书里最该被质疑的一组。**

`844` 是 iPhone 12/13/14 的**屏幕高**，不是 Safari 的**可视视口高**。
iOS Safari 的顶部地址栏 + 底部工具栏在竖屏下吃掉约 **140–180px**；
`844` 这个数只有在"地址栏收起 + 全屏"时才成立。
真实首屏可视高是 **≈ 664–700px**（同代 iPhone SE 是 667）。

所以：

> **A5 的「首屏 1 张完整卡」只在 headless Chrome 的 844 上成立。**
> 在真实 iPhone Safari 上，A5 依然是 **0 张完整卡**（可见 61–73%）。
> 这个改动要用 5 条 CSS 侵入 + 桌面受损（§5.2）去换一个**在真实设备上大概率不成立的 1**。

这一条不是"审计做错了"——它用的视口是任务书指定的 390×844。
**是任务书把"屏幕尺寸"当成了"可视视口"。** 而整个验收口径都建立在这个数上。

### 2.3 「首屏 0 卡」是缺陷还是设计？——读 README 与 index.html 的注释

我按要求读了注释，结论是：**这是设计，而且是被刻意论证过的设计。**

`prototypes/_selection/style.css:105-114` 有一整段标题为「首屏瘦身（2026-10-25，有实测依据）」的注释：

> 改前实测页头 465px = 视口 900px 的 52%，第一张方案卡顶边在 549px、卡高 434px
> ⇒ 卡底边 983px **超出首屏**，用户打开第一眼看不到任何一张完整卡（0/30 张）。

注意这段注释说的是 **1440×900 档**。而它给出的修法是「只动排版密度、一个字不删」，
**没有说"移动端也要 1 张完整卡"**。

`index.html:71-72` 的注释则明确写了移动端 rail 的设计意图：

> 先问用户能回答的问题。下面那组"设计口径与质检状态"是给做这份图集的人看的，
> 不是给挑风格的人看的 —— 原来它排在前面，是"五分钟选不出来"的第一大障碍。

`style.css:719-720`：

> 移动端 rail 原来会把 11 组筛选全部堆在列表前面：实测 390px 下 rail 高 1563px，
> 用户要滚 **2.6 屏**才看到第一个方案。改成限高内滚，让方案立刻出现。

**这段是关键。** 上一轮已经为移动端首屏做过一次优化，手段是 `max-height: 40vh` 内滚，
把 1563px 压到 337.6px，**把"滚 2.6 屏才看到方案"降到"滚 0.81 屏"**。
也就是说：**首屏 chrome 占比是上一轮主动选的，不是没管。**

再看 README 的定位（`README.md:24`）：

> 不是你没审美，是你见过的样本全是渲染图：它不告诉你 1440 到 390 之间怎么塌……

这个仓库的**产品说明**就是"先讲清这是什么，再让你挑"。页头的
`claim`（每个方案都有一个可运行的原型…）不是装饰，它是**这个图集的论点**。
把它折进 `<details>`，等于把论点藏起来换 264px。

我的判断：

> **「首屏 0 完整卡」是一个真实的可用性缺陷，但它不是"设计错误"。**
> 它是「先解释、再挑选」这个信息架构在 844px 视口下的必然结果。
> 要改它，代价必然是**牺牲那个解释**——这正是 A5 的 A3 步做的事。

而 A3 步的代价被审计轻描淡写了。它的原文（`mobile-390.md:452`）说这是
「本次最大的内容取舍」，缓解是「折成一条 24px 的 `<details>`」。这听起来很轻。
但实测（`_p1_list.mjs`）：`claim` 从 96px + `exit` 76.1px = **172.1px 的散文，
连同 2px 上边线、`strong` 加粗强调、三个模板链接的全部视觉权重，一起消失**，
换成一行 24px 的 "这个图集是什么 · 想要现成模板去哪"。

**这不是"折"，这是"删了再给个索引"。** 用户点开前读到的信息量 = 0。

### 2.4 一个我必须指出的自相矛盾

审计一边把 A3（折页头散文）列为**收益第二大的步骤**（−264.8px），
一边在 §7 第 7 条承认 `--s-15` 从未定义、页头散文一直按 16px 渲染、比设计意图多 6%。

**HEAD 已经补上了 `--s-15: 15px` 的定义**（`style.css:63`，注释在 `:48-62`）。
它的实测效果（`style.css:59-61` 自述）：

> 补上之后的实测差（页头 .mast 高度）：1440 档 310.4 → **304.0**（−6.4），
> 390 档 488.6 → **453.4**（−35.2）。390 档差得多是因为 claim 从 5 行收到 4 行
> （128px → 96px），一行的钱就是 32px。

**也就是说：同样是"不删一个字"，把 `--s-15` 补上就已经白拿了 35.2px。**
这是 A3 收益（264.8px）的 13%，代价为 0，且已经落地了。
审计把 A3 的 264.8px 当成"必须折散文才能拿到"，忽略了**页头里还有这种零代价的余量没挖完**。

---

## §3 攻击「4.2–5.5 屏」（缺陷 B）

### 3.1 深不深？——先看用户的核心动线

`README.md:57-60` 写明主闭环是「选中 → 复制 AI 提示词」：

> 选中一个方案，详情面板**顶部**就有「复制 AI 提示词」按钮。按下去得到一份 1639–1998 字的…

**这个按钮的位置已经是好的，而且我实测确认了**（`_p13_frozen.json`，S01，390 档）：

```
复制钮 top = 122.5px   （在 844 视口里 = 第 0.145 屏，不用滚）
```

任务书说「按钮在 120px 已修好」——**对，实测 122.5px（HEAD 冻结快照）/ 123.5px（含并发改动的工作区）**。
**主闭环根本不在"4.2–5.5 屏"这条路上。**

那么 4.2–5.5 屏是谁的成本？是**深读**：12 个字段全摊开，给要施工的人读。
这个面板的定位在 `style.css:534-537` 的注释里也写了：

> 字段之前这几段现在全是折叠条，原来的大外边距是按"整段内容"给的，收起后每一道 20–22px 的空隙都成了纯空白。

**上一轮已经把 4 个折叠块从 ~900px 压到 176.8px，并明确写了"这一手是有效的、并且已经到极限"。**

### 3.2 对比同类产品：390 下 4 屏算多吗？

我必须诚实：**我没有对 Notion / GitHub 做实测**（那需要联网且它们的 DOM 极度不稳定，
拿到的数字也不可比）。所以我不用"别人也这样"来论证。

我改用**本仓库内部的基准**，这是可复算的、同口径的：

`prototypes/_selection/.inspect/report.json`（选型台自己的闸门报告）：

```
1440 hero.vw=5.1   screens=15.2
768  hero.vw=5.2   screens=28.7
390  hero.vw=7.2   screens=26.9
```

**列表页在 390 档是 26.9 屏。** 而详情面板是 4.19–5.53 屏。
也就是说：**详情面板比它自己所在的列表页短 5 倍。**

再看 30 个案自己的原型（`README.md:229`：每案在三档真截图）：
`verify-prototype.mjs --all` 的输出里，30 个案的页屏数是 **3 屏（S17）到 12 屏（S18/S19/S24/S26/S27/S28/S29）**。

> **结论：4.19–5.53 屏的详情面板，比这个仓库里 90% 的页面都短。**
> 说它"深"，是拿"首屏"当分母，不是拿"同类页面"当分母。

### 3.3 决定性攻击：审计的选项集是错的

这是本文最有价值的一条。

审计的核心论证链是：

1. `N3`（不折字段、只压排版 + CTA 折）能 30/30 达标，但正文要降到 **15px**；
2. 而"16px 是移动端可读性下限"，所以不能取 N3；
3. 因此**必须折 4 个字段**才能既保 16px 又达标。

**第 3 步是错的。** 它在"不折字段"与"折 4 个字段 + 压排版"之间漏了一整档：
**折字段 + 一个排版值都不动。**

我在冻结快照上实测（`_p18_fixed.mjs`，390×844，30 案全量）：

| 方案 | 做了什么 | scrollH min–max (avg) | >3800 | 屏数 max | 正文字号 | 行高 | 正文宽 | 折几个字段 | 新增 details |
|---|---|---|---|---|---|---|---|---|---|
| `BASE` | 现状 | 3537–4667 (4207) | **24/30** | 5.53 | 16px | 25.92px (1.62) | 355px | 0 | 4 |
| **`G2`** | 只折「布局与网格 + 可落地要点」，**排版不动** | **2948–3768 (3339)** | **0/30** | 4.46 | **16px** | **25.92px** | **355px** | 2 | 6 |
| **`G2C`** | `G2` + CTA 填写区折（纯 chrome） | **2760–3579 (3150)** | **0/30** | 4.24 | **16px** | **25.92px** | **355px** | 2 | 7 |
| `G3C` | 折 3 个长字段 + CTA | 2452–3043 (2748) | 0/30 | 3.61 | 16px | 25.92px | 355px | 3 | 8 |
| `G4C` | 折 4 个长字段（= 审计的 LAB4）+ CTA，**排版不动** | **2119–2659 (2382)** | **0/30** | 3.15 | **16px** | **25.92px** | **355px** | 4 | 9 |
| `R2` | 审计推荐：LAB4 + CTA **+ 压行高/内距/内宽** | 1911–2415 (2159) | 0/30 | 2.86 | 16px | 24px (1.5) | 367px | 4 | 9 |

**读法有三层，每一层都在打审计的脸：**

1. **`G2` 就够 0/30 了，只折 2 个字段。** 审计说"要 16px 就得折 4 个"是错的。
   `G2` 的排版三件套（字号 16px / 行高 1.62 / 内宽 355px）**一个都没动**。
2. **`G4C` 证明 R2 的排版收紧是纯多余。** `G4C` 和 `R2` 折的字段完全相同（都是 LAB4 + CTA），
   唯一差别是 `R2` 多压了行高 1.62→1.5、内距 12→8、内宽 355→367。
   结果：`G4C` 是 2382，`R2` 是 2159，**差 223px**。
   而这 223px 换来的是：**中文正文行高从 1.62 掉到 1.5**（§3.4 会论证这是可读性损失）。
   **在已经 0/30 达标的前提下，为了 223px 去牺牲行高，不值。**
3. **审计自己写了「够了就停」这句原则**（`app.js` 并发注释里，但理念同日而语）。
   这条原则恰恰应该用在它自己身上：0/30 已经达成，就不该再压排版。

### 3.4 16px + 压缩行高，中文正文在手机上舒服吗？

任务书让我"要有依据"。我不用体感，用仓库自己定的规矩 + 实测字形宽度。

**(a) 仓库自己定的下限是"正文 16px"**，这是 `rules.mjs:106` 的硬 FAIL 口径：

```js
if (m.type.body && m.type.body.size < 15) add('FAIL', 'body-size', ...);
else if (m.type.body && m.type.body.size < 16 && !mobile) add('WARN', 'body-size', ...);
```

注意 `!mobile` 这个条件：**这道闸门在移动端只要求 ≥15px。**
也就是说，按仓库自己的判据，**N3 的 15px 在 390 档并不违规**。
审计说"15px 在 iPhone 上偏小"是审美判断，但它被写成了"不能取"的技术理由。
**真正的理由是审美，那就该说成审美。**

**(b) 行高才是真问题。** 中文没有小写字母的 x-height 差异，识别依赖**字间空白**，
所以中文正文的行高需求比拉丁文更高。仓库自己的正文行高是 `body { line-height: 1.62 }`（`style.css:82`），
而 R2 把它压到 **1.5**。

我的实测（`_p5_scrollcost.mjs`，`type` 字段，355px 宽、Noto Sans SC）：

```
16px/1.62 : 每行 22.18 汉字，99 字样本 5 行
16px/1.50 : 每行 22.18 汉字，99 字样本 5 行
15px/1.50 : 每行 23.66 汉字，99 字样本 5 行
16px/1.50 (367px 宽): 每行 22.93 汉字
```

**关键事实：行高不影响每行字数，只影响行距。**
所以 R2 的"压行高"是**纯粹的密排**——它不换来任何信息密度提升，
只是把同样 5 行文字挤在 24px×5=120px 里而不是 25.92×5=129.6px 里。

> **这就是"压排版"最不该做的地方：它不减内容、不减行数，只减呼吸。**
> 223px 的收益，是拿 30 案 × 12 字段的**连续阅读舒适度**换的。

**(c) 反向证据：R2 的 367px 内宽其实是加分的。**
`355 → 367` 让每行从 22.18 字变 22.93 字（+3.4%），这是**减少行数**的真收益。
所以如果非要在 R2 的三项里挑，**内宽值得做，行高和内距不值得**。
审计把三件事捆成一个叫"排版收紧"的包，让它们互相掩护了。

### 3.5 「一个字不删」的真相

审计反复强调「一个字不删」。这句话字面为真，但**在两种意义上误导**：

1. **默认可见的字少了。** `G4C`/`R2` 折 4 个字段后，30 案里有 **2119–2659px 的内容默认不可见**。
   「不删」是对的，「用户看到的没变少」是错的。
2. **审计把"折"和"压"混在同一档里卖。** 它的 §5.1 第 3 条把"排版收紧"写成 R2 的组成部分，
   而真正的取舍是：**折字段 = 分层（可逆、无损）；压排版 = 降质（不可逆、有损）**。
   前者正确，后者不必要。**把两者绑在一起，是用前者的正当性给后者背书。**

---

## §4 我核实后认为任务描述说错了的地方

### 4.1 首字段 639 / 682 / 618px —— 实测 626.5 / 668.6 / 605.4px，恒差 ~12.5px

`_p19_offsets.mjs` 在冻结快照上跑（`FROZEN_HEAD | 390-dsf1`）：

```
S01 scrollH=3537 首字段=626.5  headH=96.5
S13 scrollH=4340 首字段=626.5  headH=96.5
S15 scrollH=4460 首字段=668.6  headH=96.5
S26 scrollH=4625 首字段=626.5  headH=96.5
S30 scrollH=4578 首字段=605.4  headH=75.4
```

任务书写的 639 / 682 / 618 分别比我的数大 **12.5 / 13.4 / 12.6**。
恒定性说明这是**口径差，不是测量错**：任务书那一版把 `.detail-head` 的高度算进了偏移，
或用了含 `border-bottom: 2px` 的外框。**结论（首字段在 0.74–0.79 屏）不变，但引用时要改数。**

复算：`D:\Nodejs\node.exe deliverables\67-plan\_p19_offsets.mjs`

### 4.2 「首卡 1003.6 → 389.4，余量 1.4px」—— 起点和余量都错

- **起点**：HEAD 的 `mast` 是 **453.4**，首卡 **954**；`1003.6` 是审计期间另一个 Agent
  往 `app.js` 加 `#q-parked` 假控件、把 `bar` 从 145 撑到 159.4 时的中间态。
  审计报告自己在 §7.4 承认了这件事，但任务书引的是被污染的数。
- **余量**：`844 − 388.6 − 453.2 = 2.2px`，不是 1.4px。
- **更要紧的**：这个 1.4/2.2px 的余量**在真实视口高下不存在**（§2.2 的表：vh=800 就已经 0 张）。

复算：`D:\Nodejs\node.exe deliverables\67-plan\_p1_list.mjs`（看 `A5` 那行的 `firstRowTop/firstRowH`）

### 4.3 「A5 内容一个字不删」—— 它删了字号，而且没加媒体查询

这是 A5 最严重的问题，审计**只报了收益，完全没报这一项**。

`_p8_desktop.mjs` 在 5 个档位实测 A5 前后：

| 档位 | h1 字号 | h1 占宽 | `.mast` 高 | 卡缩略图高 | 完整卡 | rail 高 |
|---|---|---|---|---|---|---|
| 1440 BASE | **56px** | 3.89vw | 304 | **177.8px** | 1 | 900 |
| 1440 A5 | **26px** | **1.81vw** | 149.5 | **100px** | 3 | **56** |
| 1180 BASE | 47.2px | 4.0vw | 446.3 | 177.8 | 0 | — |
| 1180 A5 | **26px** | **2.2vw** | 229.4 | 100 | 2 | 56 |
| 980 BASE | 39.2px | 4.0vw | 451 | 213.8 | 0 | 980 |
| 980 A5 | 26px | 2.65vw | 229.4 | 100 | 1 | 56 |
| 768 BASE | 30.72px | 4.0vw | 433 | 213.8 | 0 | 471 |
| 768 A5 | 26px | 3.39vw | 229.4 | 100 | 2 | 56 |
| 390 BASE | 26px | 6.67vw | 453.4 | 164.3 | 0 | 337.6 |
| 390 A5 | 26px | 6.67vw | 223.5 | 100 | 1 | 56 |

**三处硬伤：**

1. **`addStyle('.mast h1{font-size:26px}')` 没有媒体查询包裹。** A5 的 `headFold()` 是一串裸规则，
   在 1440 档同样生效。审计报告的表格里写「1440 档不受损：首屏完整卡 1 → 3」——
   **卡是多了 2 张，代价是桌面主标题从 56px 掉到 26px（3.89vw → 1.81vw）。**
2. **这会让闸门判 `focal-point` FAIL。** `rules.mjs:130`：

   ```js
   else if (!mobile && m.hero.vw < 4.5 && (m.heroMedia[0]?.ratio || 0) < 0.3 && !m.page.uiFragments) {
     add('FAIL', 'focal-point', `... the largest type is ${m.hero.size}px (${m.hero.vw}vw) ...`);
   ```

   我用仓库自己的 `probe.mjs` + `rules.mjs` 实跑了（`_p10_gate.mjs`）：

   ```
   [1440] BASE  hero.size=56 vw=3.9  → FAIL:focal-point "largest type is 56px (3.9vw)"
   [1440] A5    hero.size=26 vw=1.8  → FAIL:focal-point "largest type is 26px (1.8vw)"
   ```

   **注意：BASE 在 1440 就已经 FAIL 了**（3.9 < 4.5）——这是既有问题，不是 A5 造成的。
   但 A5 把它从 3.9vw 打到 **1.8vw**，离阈值更远。
   而 `style.css:713-714` 有一条明确的作者禁令：

   > 不要再把 h1 降到 34px：768px 档 34px 只有 4.4vw，闸门会判首屏没有主导元素。

   **A5 把 h1 降到 26px，正面违反这条注释。** 这条注释是上一轮为了过闸门写的。
3. **桌面 rail 从 900px 高、1996px 内容，变成 56px 高、54px 内容。**
   `railScrollH` 从 1996 → **54**，因为 `railToSummary()` 把 rail 的所有子节点搬进了 `<details>`。
   在 1440 档，筛选栏是**常驻工具**（`style.css:192-197`：`position: sticky`）。
   A5 把它变成一个默认收起的折叠条，等于**撤掉了桌面的筛选能力**。
   审计报告的 §5.2 只讨论"390 档 rail 折成 48px 条"，**没提这条规则也作用于 1440**。

复算：`D:\Nodejs\node.exe deliverables\67-plan\_p8_desktop.mjs`

### 4.4 「Tab 到折叠条 114 次 / 91 次」—— 两个数都不对，是 10 次

审计 §6.5 说「进面板第一个控件 87 次、第一个折叠条 91 次」。
我的实测（`_p15_tab.mjs`，390×844，面板**打开后**）：

```
afterOpen: focusableTotal=101  detailFirstIdx=86  firstSummaryIdx=90  inDetailCount=15
activeNow: DIV.detail-head          ← 打开后焦点已经进面板了
```

真实 Tab 序列（从 `.detail-head` 起）：

```
1=BUTTON:收起
2=BUTTON:复制 AI 提示词     ← 主闭环，第 2 次 Tab 就到
3=INPUT:  4=INPUT:
5=SUMMARY:原型截图预览      ← 第一个折叠条，第 5 次
```

**所以：**
- 「87 次」在**面板未打开时**是对的（`firstInDetailIdx=86`，0 起算 ⇒ 第 87 个）；
- 但面板**打开后焦点已经落在 `.detail-head`**（`focusAfterOpen.isHead=true`，
  `headHasTabindex=-1`）——**审计 §6.5 说"焦点仍在 body、必须从头 Tab 87 次"，在 HEAD 上不成立**。
  它在同一份报告里既说了"修法是 `open()` 里加 focus"，又说了"这是真的可达性缺陷"，
  但 HEAD 的 `app.js:1018` 已经有 `focusIntoDetail()`，`app.js:1050` 在 `open()` 里调它。
  **这条已经修了，审计报的是过时状态。**
- 「第一个折叠条 91 次」→ 正确读法是**打开面板后第 5 次 Tab**。

复算：`D:\Nodejs\node.exe deliverables\67-plan\_p15_tab.mjs`

### 4.5 审计说「Esc 在折叠条上会关掉整个面板」—— 不成立

`_p11_tail.mjs` 实测：聚焦第一个 `<summary>` 后发真实 Esc：

```
escOnSummary: {"detailHidden": false, "hash": "#S01", "activeEl": "DIV.detail-head"}
```

**面板没关，焦点退回 `.detail-head`。** `app.js:1358` / `:1370` 对 `<summary>`
与输入框都是 `e.target.blur()` 而不是 `close()`。这条也已经是旧状态。

### 4.6 「`#rail-fold` 已被删除」—— 对，但审计漏了它留下的真问题

`index.html:66-69` 的注释确实说明它被有意删除。但审计在 §1.3 得出的结论是
「删得对，但没有替代品」，然后推荐"新造一个有内容的折叠块"。

**它没注意到：rail 的问题不是"占 337.6px"，而是"1406px 的内容塞进 336px 的框"。**
`_p7_honest.mjs` 的 `railTrap`：

```
railH=337.6  railScrollH=1406  railClientH=336  hiddenPx=1070
groupsTotal=11  groupsFullyVisible=2  groupsBelow=9  chipCount=47
```

**11 组筛选里，首屏只能完整看到 2 组，9 组在框外。** 而 `style.css:719-720` 说
上一轮把它从 1563px 压到 337.6px 是"让方案立刻出现"——**代价是筛选栏从"全可见"
变成了"内滚 1070px"**。

再加一条实测（`_p7_honest.mjs` 的 `touchTrap`）：

```
railShareOfViewport: 40        ← rail 占视口 40%
elementAtRailCenter: P.rail-hint  insideRail: true
```

**屏幕中部（y≈622）落点是 rail 内部。** 拇指在屏幕中间上下滑，滚的是 rail 而不是页面。
这是个真的手势陷阱，而它不在任务书的两个缺陷里。

---

## §5 我抓到的、任务描述没提到的问题

按严重度排序。**这些都不是移动端 390 专属问题。**

### 5.1 🔴 选型台自己也过不了自家闸门（6 条 FAIL），而且没人报过

`_p10_gate.mjs` 用仓库自带的 `probe.mjs` + `rules.mjs` 对选型台首页实跑：

```
=== 1440 BASE ===
 FAIL emoji         : Emoji in the page: ⚠
 FAIL body-size     : Body text is 13px
 FAIL small-text    : 30 text blocks under 13px
 FAIL focal-point   : The first screen has no dominant element: 56px (3.9vw)
 WARN no-footage / measure
=== 390 BASE ===
 FAIL emoji / body-size / small-text
```

（这组数字来自 `_p10_gate.mjs`，它跑的是**真实工作区页面**，所以没有截图路径的假阳性。
`_p21_inplace.mjs` 跑在冻结副本上会多报 `few-pictures`/`broken-image`，
那是副本相对路径解析不到 `.inspect/*.jpg` 造成的，不计入。）

**这直接违反 README 的核心承诺。** `README.md:160` 写「26 个闸门 FAIL=0」，
`README.md:223` 写「闸门只认能机械判定的东西」。
但**选型台自己**（`prototypes/_selection/`）从未被 `verify-prototype.mjs` 扫过——
我核实了它的口径（`verify-prototype.mjs:141-144`）：

```js
names = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
```

`_selection` 不匹配 `^S\d{2}-`，**所以它永远不进闸门**。
任务书自己也提示了这一点（"`verify-prototype.mjs` 只读 `prototypes/Sxx/`"），
但**没人算过这意味着什么**：这个仓库最核心的那张页面，是这个仓库唯一没被自己验过的页面。

其中 `emoji: ⚠` 是**真缺陷**（`app.js` 字符串字面量 `'⚠ 内容少于 '`，
在 30 张行卡的 `.cap.cap-warn` 里渲染，30 个实例），而 `README.md:223` 把 emoji 列为
闸门机械复核项之一。

### 5.2 🟡 A5 会把「13px 下限」这条已经修好的规矩打破

`style.css:8` 明写：

> 2 小字下限收到 13px（原先 11/12px 有 **115 处**）

而 A5 的 `ROWFIX` 引入 **`figcaption { font-size: 10px }`**（30 个实例），
`headFold()` 引入 `mast-facts dt { font-size: 11px }`、`mast-kicker { 12px }`、
`barTight()` 引入 `.count { 12px }`。

`_p9_smalltext.mjs` 实测：

| 档 | 方案 | `<13px` 文本块 | 分布 | 字号档数 |
|---|---|---|---|---|
| 390 | BASE | 63 | 11px×33, 12px×30 | 10 |
| 390 | **A5** | **69** | **10px×30**, 11px×7, 12px×32 | 11 |
| 1440 | BASE | 33 | 11px×3, 12px×30 | 10 |
| 1440 | **A5** | **69** | **10px×30**, 11px×7, 12px×32 | **12** |

**A5 让 `<13px` 块数翻倍（33→69 @1440），并新增一个 10px 档。**
按 `rules.mjs:120` 的口径（`smallText > 3` ⇒ FAIL），这一项本来就 FAIL，
A5 让它更 FAIL。**审计报告的全文没有出现过 "10px" 这个数字。**

顺带：A5 把字号档数从 9/10 推到 **11/12**，逼近 `rules.mjs:104` 的
`sizeCount > 9 ⇒ WARN`。审计的"内容一个字不删"里不含"字号档位"。

复算：`D:\Nodejs\node.exe deliverables\67-plan\_p9_smalltext.mjs`

### 5.3 🟡 `--s-h1` 是一个从未被使用的死变量

`style.css:42` 定义 `--s-h1: clamp(34px, 5.2vw, 74px);`，而 `.mast h1` 真正用的是
`clamp(30px, 4vw, 56px)`（`:129`）。

`_p11_tail.mjs` 的 `deadVar`：

```
sH1Decl=true  sH1DeclValue="clamp(34px, 5.2vw, 74px)"
usesInCss=0  usesInApp=0  usesInHtml=0
```

**零引用。** 这和上一轮修掉的 `--s-15` 是同一个病（定义了但没人用 / 用了但没定义），
只是方向相反。`style.css:713-714` 那条禁令说"保持 clamp(34px, 5.2vw, 74px)"，
**但它说的那个值根本没生效** —— 实际是 `clamp(30px, 4vw, 56px)`，所以 1440 档是 56px 而非 74px，
`focal-point` 才会在 3.9vw 就 FAIL（若用 `--s-h1`，1440 档是 5.2vw，刚好过 4.5）。

> **也就是说：`focal-point` 这条 FAIL，根因是 `--s-h1` 定义了没用。**
> 这比"折页头"重要得多，而它只需要改 1 行。

**这一条我做了原地改动的实测验证**（`_p21_inplace.mjs`，直接改 `_frozen/style.css` 那一行，
不用「追加 `<style>`」的模拟——那个方法会让追加的样式表压过 `@media(max-width:620px)`，
把 390 档误测成 34px，我第一版就踩了这个坑，`_p20_recommend.mjs` 的 390 档数字因此作废）：

| 档 | h1 改前 | h1 改后 | hero.vw | `focal-point` | 页头高 | 首屏完整卡 |
|---|---|---|---|---|---|---|
| 1440 | 56px | **74px** | 3.9 → **5.1** | FAIL → **PASS** | 304 → 323.1 (+19.1) | 1 → 1 |
| 1180 | 47.2px | 61.36px | 4.0 → **5.2** | FAIL → **PASS** | 396.2 → 411.2 (+15.0) | 1 → 1 |
| 980 | 39.2px | 50.96px | 4.0 → **5.2** | FAIL → **PASS** | 409.4 → 421.9 (+12.5) | 0 → 0 |
| 768 | 30.72px | 39.94px | 4.0 → **5.2** | FAIL → **PASS** | 400.4 → 410.2 (+9.8) | 0 → 0 |
| **390** | **26px** | **26px** | 6.7 → 6.7 | 本来就 PASS | **453.4 → 453.4 (Δ0)** | 0 → 0 |

**四档 `focal-point` 全部转 PASS，390 档零影响，首屏完整卡数一格没掉，横向溢出全程 0。**
代价是页头在 1440 档高 19.1px（`clamp` 上限从 56 抬到 74 的必然结果）。

> **读这张表时要注意 `FAIL=` 那一列的噪声。** `_p21` 跑在冻结副本上，而副本里的
> `.inspect/*.jpg` 截图是相对路径，在 `_frozen/` 下解析不到 ⇒ 多出
> `few-pictures` 与 `broken-image` 两条**假阳性**。
> **判定 `focal-point` 的转向是可靠的**（它只看 `hero.vw`，与图片无关）；
> **但"选型台一共几条 FAIL"要用 `_p10_gate.mjs`（跑真实页面）的数字：4 条，不是 6 条。**

复算：`D:\Nodejs\node.exe deliverables\67-plan\_p21_inplace.mjs`

### 5.4 🟢 `.row-def` 的 `-webkit-line-clamp:3` 在 390 档基本无效

审计 §1.5 已经测到「R1（clamp 3→2）= 0px，因为本卡只 1 行」，
但没把这个结论推到全站。我实测 390 档首卡 `.row-def` 高度 **25.9px**（1 行）。
`_p1_list.mjs` 的 `firstCardParts`：`.row-def: 25.9`。

**这意味着"截断定义"这类常见优化在 390 档没有收益。** 好消息，记下来避免下一轮重复试。

### 5.5 🟢 详情面板「去 AI 味审查点」的 summary 只有 20.8px，靠豁免过 24px

审计 §6.1 测到了（20.8px），结论是"靠 WCAG 间距豁免合规"。
我没有重复判定 WCAG，但**如果做 `G2C` 方案新增 2–4 条 summary，这些新 summary 的高度
就是审计自己测的 25.8px**（`_p12_final.json` 里 LAB4 折叠条都是 25.8px）。
**新增的折叠条不靠豁免也合规**，而现有的 20.8px 那条不达标。这是一次顺手修的机会。

---

## §6 拆解成可并行的子任务

**先说一句：按 §7 的排序，下面的 T1 才该做，T2–T5 大部分不该做。**
但任务书要求拆解，所以我把"如果要做"的版本也写全，并标清每个的代价。

### 写作用域与冲突矩阵

只有 3 个文件可写，这是硬约束（`prototypes/_selection/` 之外的 `prototypes/S*` 一个都不能动）：

| 文件 | 谁在写 | 说明 |
|---|---|---|
| `prototypes/_selection/style.css` | 所有子任务都想要 | **最大冲突源**，见下方拆分 |
| `prototypes/_selection/app.js` | T2/T3 需要 | 只有 `renderDetail()` 附近的字段渲染 |
| `prototypes/_selection/index.html` | T1 需要 | 只有 `.mast` 的 4 个 `<p>` 与 rail 的 `<aside>` |

### T1 · 修闸门能机械判定的那 3 条（P0，先做）

| 项 | 内容 |
|---|---|
| **作用域** | `style.css`（`.cap` 的 emoji 无关，只改字号）；`app.js`（`'⚠ 内容少于 '` 字面量） |
| **做什么** | ① 去掉 `.cap.cap-warn` 文本里的 `⚠` 字符，改用 `.cap-warn` 的既有颜色/边框表意；② `--s-h1` 接到 `.mast h1`（或删掉该死变量并把实际值写进注释）；③ `.cap` 从 12px 提到 13px |
| **验收（脚本可判）** | `_p10_gate.mjs` 输出里 `FAIL:emoji` 消失；`hero.vw ≥ 4.5`（1440 档）；`smallText` 从 30/63 降到 0（`.cap` 提档后 `12px×30` 归零需同时处理别的 12px 源） |
| **Agent 数** | 1 |
| **依赖** | 无。**必须第一个做**，因为它改的是 `app.js` 与 `style.css`，与 T2/T3 同文件 |

### T2 · 详情面板：折字段（P1，如果做，只做这个）

| 项 | 内容 |
|---|---|
| **作用域** | `app.js` 的 `field()` / `renderDetail()`；`style.css` 的 `.field-fold`（复用既有类） |
| **做什么** | 按 `G4C`：把「布局与网格 / 可落地要点 / 关键视觉元素 / 动效与交互」4 个字段渲染成 `<details>`，summary 写「字段名 + 字数 + 一句说明」。**排版三件套一个不动**：字号 16px、行高 1.62、内距 12px、正文宽 355px |
| **验收（脚本可判）** | ① 30 案 `detail.scrollHeight` **全部 ≤ 3800**（`_p18_fixed.mjs` 的 `G4C` 行读数：2119–2659）；② `getComputedStyle(dd).fontSize === '16px'` 且 `lineHeight === '25.92px'` 且 `dd.width === 355`（**三个值逐案比对**）；③ `fieldCount === 12`（`check-docs.mjs` 的 `panel/fields` 仍 PASS）；④ 每个新 summary 高 ≥ 24px；⑤ 详情内 `<details>` 数 = 9 |
| **Agent 数** | 2（一个做 4 个字段的折叠，一个做 summary 文案 + 触控断言） |
| **依赖** | 依赖 T1（同文件 `app.js`）。**注意：并发 Agent 已经在做这件事了**（§0），开工前必须先和它对齐，否则必冲突 |

### T3 · 详情面板：CTA 填写区折起（P1，可与 T2 合并）

| 项 | 内容 |
|---|---|
| **作用域** | `app.js` 的 `promptCta()` 附近；`style.css` 若需要 |
| **做什么** | 把 `.prompt-fill`（2 个 input，390 档 141.1px）+ `.prompt-fill-note`（62.4px）包进 `<details>`，summary 写「填写提示词开头（不填也能复制）」。**复制按钮留在外面** |
| **验收** | ① `.prompt-copy` 的 `getBoundingClientRect().top ≤ 200`（现状 122.5）；② 390 档 `.prompt-cta` 高从 296.4 降到 ≤ 110；③ 2 个 input 的 `id`（`prompt-biz-Sxx` / `prompt-action-Sxx`）在 DOM 里仍存在且 `details.open=false`；④ 复制出的提示词与改前逐字节相同（这是上一轮 A11y Agent 做过的同类验证，`deliverables/66-verify/LEAD-wizard-s15-check.md`） |
| **Agent 数** | 1 |
| **依赖** | 与 T2 同文件，**串行**。收益 296.4−103.8=192.6px，比 T2 折 4 字段（~1900px）小一个量级 |

### T4 · 列表页：只修真缺陷，不折内容（P2）

| 项 | 内容 |
|---|---|
| **作用域** | `style.css` 的 `@media (max-width: 620px)` 块内部；`index.html` 的 `.mast` |
| **做什么** | **只做 A5 里"零内容损失"的部分**：① rail 的 40vh 内滚改成**真 `<details>` 折叠**（解决筛选栏 9/11 组不可见 + 手势陷阱）；② 工具条两行（`.search` 占满一行）；③ 缩略图 190→140（**不是 100**，见 §8.4）。**不做**：折页头散文、h1 钉 26px、10px 图注、family clamp 1 行 |
| **验收（脚本可判）** | ① 390 档 `rail.scrollHeight === rail.clientHeight`（折叠展开后无内滚）；② `scrollForComplete ≤ 460px`（`_p5_scrollcost.mjs` 的 `M2` 方案实测 310.2px）；③ 1440 档 `h1FontSize === '56px'` 且 `railW === 264` 且 `railH === 900`（**这条是防 A5 那种无媒体查询外溢的守门断言**）；④ `smallText` 不增加；⑤ `figcaption` 字号 ≥ 11px |
| **Agent 数** | 2（一个改 CSS，一个写守门断言） |
| **依赖** | 依赖 T1（同 `style.css`） |

### T5 · 桌面端防线（P0，与所有任务并行）

| 项 | 内容 |
|---|---|
| **作用域** | 新建 `deliverables/67-exec/verify-mobile-scope.mjs`（**不写产品文件**） |
| **做什么** | 一条机械断言：390 档生效的规则不许在 1440 档生效。具体做法——分别在 390/768/980/1180/1440 打开页面，采样 `h1 字号 / rail 宽高 / 卡缩略图高 / body 字号 / figcaption 字号 / 字号档数`，断言 1440 档的值与 HEAD 基线**逐项相等** |
| **验收** | 故意把 A5 的 `headFold()` 注入，断言必须 FAIL。这是"守门员要先证明自己会响"的规矩（`check-docs.mjs:288` 同款要求） |
| **Agent 数** | 1 |
| **依赖** | 无。**应该第一个写**，因为它保护后面所有任务 |

### 冲突与排序总结

```
T5（守门断言）──┬─> T1（闸门 3 条）
                │        │
                │        ├─> T2（折字段）──> T3（CTA 折）
                │        └─> T4（列表真缺陷）
                └─ 全程守护
```

**可并行的：{T5} ∥ {}；T1 之后 {T2/T3 串行} ∥ {T4}。**
**不可并行的：T1 必须最先（同文件）；T2 与 T3 必须串行（同函数）。**

---

## §7 排序：按「用户实际会遇到的后果」

任务书给的判据是三条：**拿不到东西 / 只是不完美 / 其实是设计选择**。我按这个判。

### P0 · 让用户**拿不到东西**（功能受阻）

| # | 问题 | 为什么是"拿不到" | 证据 |
|---|---|---|---|
| **1** | **`.cap` 里的 `⚠` 让选型台自己过不了闸门，且 README 声称全库 FAIL=0** | 这不是用户直接"拿不到"，但它让**整个仓库的质量声明失效**：读者被告知"26 案 FAIL=0"，而最核心的页面带着 4 条 FAIL 且从未被扫过。**这是可信度问题，任何后续结论都建立在它上面** | §5.1，`_p10_gate.mjs` |
| **2** | **rail 1406px 内容塞进 336px 框，11 组里 9 组不可见；且拇指在屏幕中部滑的是 rail 不是页面** | 用户**真的拿不到**那 9 组筛选。这不是"不完美"，是他不知道有"结构类型/认知门槛/调性/建成状态/闸门"这 5 组存在。而且手势陷阱会让"想往下看方案"变成"在筛选栏里打转" | §4.6，`_p7_honest.mjs` 的 `railTrap`/`touchTrap` |
| **3** | **`--s-h1` 死变量导致 1440 档 h1 是 56px 而非设计意图的 74px，直接造成 `focal-point` FAIL** | 这个仓库的**第一屏主导元素**是按 `--s-h1` 设计的（`clamp(34px,5.2vw,74px)`），实际渲染用的是写死的 `clamp(30px,4vw,56px)`。**设计意图与实现差 18px**，且因此过不了自己的闸门 | §5.3，`_p11_tail.mjs` 的 `deadVar` |

### P1 · 只是**不完美**

| # | 问题 | 为什么不完美而非受阻 |
|---|---|---|
| **4** | 首屏 0 完整卡（`scrollForComplete = 687.8px = 0.81 屏`） | 用户滚 0.81 屏就看到卡了。**而且滚 150px 就能读到方案名**（§2.1）。这是"第一眼没东西"，不是"拿不到" |
| **5** | 详情面板 4.19–5.53 屏 | **主闭环（复制按钮）在 122.5px，不用滚。** 深读是次要动线，而且比列表页（26.9 屏）短 5 倍（§3.2） |

### P2 · **其实是设计选择**（不该动）

| # | 东西 | 为什么是设计 |
|---|---|---|
| **6** | 页头把"这是什么"放在方案列表前面 | `README.md:24` 的产品说明就是这个；`index.html:71-72`、`style.css:105-114` 都有论证。**折它就是改产品定位，不是修 bug** |
| **7** | 详情面板"12 个字段全摊开" | `style.css:534-537` 明确写了这是"给要施工的人读"的定位。**上一轮已经把 4 个折叠块压到 176.8px 并写了"已到极限"** |
| **8** | 16px 正文字号 | `rules.mjs:106` 的移动端下限是 15px，但仓库自己选了 16px。**这是品味，不是判据**——审计把"15px 偏小"写成技术理由，是偷换 |

### 我的实际建议排序

> **P0-1（闸门可信度）→ P0-2（rail 手势陷阱）→ P0-3（`--s-h1` 一行修）→ 停。**
>
> P1 的 4、5 两条，我建议**先不动**，理由是一个"不存在的用户问题"论证（§8）。

---

## §8 明确说「不该做什么」

### 8.1 不该折页头散文（A5 的 A3 步）

- **它是产品定位，不是布局浪费。** §2.3 已举证 `README:24` + `index.html:71` + `style.css:105`。
- **它已经在被零代价地优化。** `--s-15` 补定义就让 `.mast` 从 488.6 → 453.4（−35.2px），
  一个字没删。**还有同类余量没挖完就先折内容，顺序错了。**
- **折完只剩一行 24px 的摘要。** 172.1px 的散文 + `strong` 强调 + 3 个模板链接的视觉权重
  全消失。用户点开前信息量 = 0。
- **它的收益（264.8px）在真实视口下买不到那个 1**（§2.2：vh=800 就已经 0 张）。

### 8.2 不该把 h1 钉成 26px，尤其不该没有媒体查询

- 直接违反 `style.css:713-714` 的作者禁令。
- 打穿 `focal-point`：1440 档 3.9vw → **1.8vw**（阈值 4.5）。
- 把桌面 rail 从 900px 常驻工具变成 56px 折叠条（§4.3）。
- **如果非要压页头，正确做法是让 `--s-h1` 生效（5.2vw），而不是写死 26px。**

### 8.3 不该碰已经修过 6 轮的东西

| 东西 | 为什么别碰 |
|---|---|
| 4 个详情折叠块（`.fold`，176.8px） | `mobile-390.md:212-213` 自己写了"有效、已到极限" |
| `.row-family` 的 `-webkit-line-clamp:2` | `style.css:354-368` 有 15 行论证：为什么是 2 行不是 3 行，含 390/1440 两档实测 |
| `--s-15` 的定义 | `style.css:48-62` 有 15 行论证，含补定义前后的实测差 |
| `.row-def` 的 `clamp:3` | §5.4 实测：390 档首卡 `.row-def` 只有 1 行 25.9px，**改了是 0 收益** |
| `#q-parked` 的 `[hidden]` 锁 | `style.css:281-305` 有完整复盘，且 HEAD 实测 `qparkedH=0`（已修） |
| 详情面板的焦点管理 | `app.js:1018` 的 `focusIntoDetail()` 已工作（§4.4 实测 `isHead=true`） |
| 折叠条上的 Esc 行为 | `app.js:1358/1370` 已是 `blur()` 不是 `close()`（§4.5 实测面板没关） |

**这 7 项里有 4 项，审计报告说它们"仍是缺陷"。我逐个实测，全部已是修复态。**
**这是最需要警惕的一类错误：拿旧报告当现状，去"修"一个已经修好的东西。**

### 8.4 不该把缩略图压到 100px

A5 的 `ROWFIX` 用 `max-height:100px`。390 档实测：

```
BASE: 图 164.3px 宽 355 → 显示原图 100%（imgVisibleFractionOfDesktop = 1）
A5  : 图 100px   宽 355 → 只显示原图 59.7%（imgVisibleFractionOfDesktop = 0.597）
```

**`100 / (355 × 9/16) = 0.597`。** 也就是说 A5 把首卡截图**裁掉了 40%**。
而 `README.md:66` 写得很清楚：

> 卡片上为什么只留一张图：原来卡上是三档并排……卡上留一张**能看清的桌面图**。

**裁到 59.7% 就"看不清"了，这正是 README 那段话要避免的事。**
如果一定要压，`140px` 是更好的点（保留 83.5%，`_p5_scrollcost.mjs` 的 `M2` 方案）。

### 8.5 不该改「验收口径」来让报表变好看（丁方案）

审计自己在 `mobile-390.md:425` 把"按视口给不同阈值"评为**最差的一档**，我同意。
但**它推荐的东西有同一个毛病**：3800 这个阈值

- 全库 grep，第一次作为判据出现在 `deliverables/65-exec/EXEC-panel-discoverability.md:136`，
- **是上一轮执行 Agent 自己定的**（`66-plan/PLAN-round6.md:316` 已查明），
- 不在 README、不在任何检查器、无推导过程。

> **用一个人为设定的、无出处的 3800 去驱动设计决策，本质上和"改验收口径"是同一类操作。**
> 我建议：**要么给 3800 一个推导（比如"3 屏 × 844 − 644px chrome"），要么别用它当 P0 判据。**

### 8.6 不该为了一个不存在的用户问题而优化

这是我最想说的一条。

**任务书给的两个缺陷，都建立在 `844px` 这个视口高上。而 844 是 iPhone 的屏幕高，不是可视视口高。**

- 首屏完整卡：A5 在 vh=800 就已经是 0 张（§2.2）。**真实 iPhone 上 A5 不产生那个 1。**
- 详情屏数：844 下是 4.19–5.53 屏；**667（iPhone SE / 地址栏展开）下是 5.30–7.00 屏**（§1.2 的 `_p4` 表）。
  换句话说，"4.2–5.5 屏"这个描述在真实设备上偏乐观，但这不影响它的**性质**（仍然是 5–7 屏的可滚面板）。

> **所以：为一个在真实设备上不成立的"首屏 1 张完整卡"，去付出
> ① 折掉产品论点 ② 桌面主标题 56→26px ③ 缩略图裁掉 40%
> ④ `<13px` 文本翻倍 ⑤ 桌面筛选栏失效 —— 这个交易是亏的。**

**换成可迁移的判据**：`scrollForComplete`（滚多少像素见到完整卡）。
它不依赖视口高，实测值（`_p5_scrollcost.mjs`）：

| 方案 | vh=844 | vh=800 | vh=750 | vh=667 |
|---|---|---|---|---|
| BASE | 687.8 | 714.2 | 744.2 | 794.0 |
| A4（不压卡） | 122.6 | 167.0 | 216.6 | 299.6 |
| **M2（rail折+工具条+图140）** | **310.2** | **354.7** | **404.3** | **486.9** |
| A5（全做） | 0 | 42.7 | 92.2 | 175.2 |

**注意 A4：只折 rail + 工具条两行，就把"需滚 687.8px"降到 122.6px，而缩略图和页头一个字没动。**
A4 是一个**比 A5 便宜得多、也没有 A5 那些副作用**的方案。

---

## §9 如果只能做一件事

> ### 做这一件：把 `--s-h1` 接上，并顺手把 `.cap` 的 `⚠` 去掉。

理由：

1. **它修的是"设计意图与实现不一致"，这是所有缺陷里唯一不需要重新做审美判断的一类。**
   `style.css:42` 定义了 `clamp(34px, 5.2vw, 74px)`，`:129` 用的是 `clamp(30px, 4vw, 56px)`。
   `:713-714` 的注释还专门为前者写了禁令（"不要再把 h1 降到 34px…保持 clamp(34px, 5.2vw, 74px)"）。
   **作者以为在用后者，实际在用前者。这跟上一轮 `--s-15` 是同一个 bug，只是方向相反。**
2. **它同时修掉一条真 FAIL。** `focal-point` 在 1440 档 FAIL（3.9vw < 4.5）。接上 `--s-h1` 后
   1440 档是 **5.2vw**，过线。一条 1 行的改动，同时消掉一条闸门 FAIL。
3. **它零风险、可秒回滚。** 改 `style.css` 一行；`git checkout prototypes/_selection/style.css` 即回滚。
4. **它不碰任何争议项。** 不折页头、不动缩略图、不动行高、不改 390 档任何布局。
   **它在 390 档完全无影响**（390 档 `.mast h1` 被 `@media (max-width:620px)` 的
   `font-size: max(26px, 6.6vw)` 接管，`_p8_desktop.mjs` 实测 BASE 与 A5 都是 26px）。
5. **它让"这个仓库自己的页面过不了自己的闸门"这件事少一条。** 那是比"首屏几张卡"重要得多的问题。

**具体改法（1 行 + 1 个字符）：**

```css
/* style.css:129，.mast h1 内 —— 原地改，不要追加新样式表 */
-  font-size: clamp(30px, 4vw, 56px);
+  font-size: var(--s-h1);            /* clamp(34px, 5.2vw, 74px)，与 :42 的定义和 :713 的禁令一致 */
```

```js
/* app.js，'.cap cap-warn' 的文本 */
-  '⚠ 内容少于 ' + n + ' 条会留空位'
+  '内容少于 ' + n + ' 条会留空位'      /* 去掉 emoji，靠 .cap-warn 已有的颜色/边框表意 */
```

**⚠️ 一个必须写死的注意事项：这两条都必须是"原地改源文件"，不能用追加 CSS 的方式实现。**
`_p21_inplace.mjs` 证明了区别：追加 `<style>` 会排在 `@media (max-width:620px)` 之后，
把 390 档的 h1 从 26px 顶成 34px、页头从 453.4 顶到 497.9、首卡从 954 推到 998.5。
**原地改时源文件顺序不变，620px 那段仍然后置、仍然赢，390 档 Δ0。**
我自己第一版探针（`_p20_recommend.mjs`）就是这么错的，它的 390 档数字已作废。

**验收（两条脚本可判）：**

```powershell
D:\Nodejs\node.exe deliverables\67-plan\_p21_inplace.mjs
# 期望：4 个非移动端档 focal-point true→false；390 档 h1 26px→26px；完整卡数无一格下降
D:\Nodejs\node.exe deliverables\67-plan\_p10_gate.mjs
# 期望：emoji 从 FAIL 列表消失（这条要等 .cap 改完）
```

**为什么不是"修 rail 手势陷阱"（我的 P0-2）**：
那条更伤用户，但它需要新造一个带内容的 `<details>`、要动 `index.html` 与 `style.css`、
要处理"桌面是否也折"的分支，**改动面是这一条的 30 倍，且与并发 Agent 正面冲突**。
如果只能做一件事，做那条**失败模式最确定、回滚最简单、且能证明"我们已经开始认真对待闸门"**的。

---

## §10 风险与回滚

### 10.1 哪些改动可能破坏闸门

| 风险 | 机制（文件:行） | 后果 | 防法 |
|---|---|---|---|
| **`_selection` 从不进闸门，所以"改了也不响"** | `verify-prototype.mjs:141-144` 只匹配 `^S\d{2}-` | 任何对选型台的破坏都**不会**被 `--all` 发现。这是最危险的一条：**你以为有守门员，其实没有** | 必须自建守门断言（T5） |
| **`check-docs.mjs` 依赖 `app.js` 的 `field('` 字面量计数** | `check-docs.mjs:437`：`js.match(/\bfield\(\s*'/g)` | 若把 `field(...)` 重构成 `longField(...)` 或数组驱动，`fieldCalls` 会变 0 或 11，`totalFields` 对不上 README 的「全部 12 段字段」⇒ **`panel/fields` FAIL** | 我实测过并发 Agent 的当前版本：`field(` 11 + `longField(` 0 + `hasAuditFold` ⇒ 12，**暂时没破**。但它的注释说要改成 `longField` 且已出现 2 处调用 —— **一旦把 `field('` 换成 `longField('` 且超过 1 处，计数就会变** |
| **`check-docs.mjs` 也读 `app.js` 的注释剥离** | `check-docs.mjs:437` 前一行先 `replace(/\/\*[\s\S]*?\*\//g,'')` | 若把 `field(` 调用写进块注释里的示例代码，会被正确剥离（好事）；但若写在字符串里，会被误计 | 改完必须跑 `check-docs.mjs`，它会 `exit 1` |
| **`auditFold(r) +` 这个调用形态被硬匹配** | `check-docs.mjs:447` `hasAuditFold`；`:792` `auditBeforeRisk` 比对 `js.indexOf('auditFold(r) +')` | 把 `auditFold(r) +` 改成别的写法（如 `auditFold(r) + '\n' +` 或换函数名）⇒ `totalFields` 少 1 ⇒ FAIL | 不要动 `auditFold(r) +` 这一行 |
| **`AUDIT_CUT_AT` 不许回归** | `check-docs.mjs:795` | 若为了折叠而在 UI 层切数据（模拟审计的 `foldField` 做法），很容易把 `AUDIT_CUT_AT` 那套补丁带回来 ⇒ FAIL | 折叠在前端渲染层做，不要在数据层切 |
| **`rules.mjs` 的 `size-count` / `small-text`** | `rules.mjs:104`（>9 档 ⇒ WARN）、`:120`（>3 块 <13px ⇒ FAIL） | A5 把字号档数推到 11–12、`<13px` 块推到 69 | §5.2 的表当基线，改完对比 |
| **`focal-point` 的 4.5vw 阈值只对非 mobile 生效** | `rules.mjs:130` 的 `!mobile` | 390 档不会因为 h1 26px 而 FAIL，所以**这个错在移动端看不出来**，只在 1440 暴露 | 必须用 1440 跑 `_p10_gate.mjs` |

### 10.2 哪些改动需要重跑生成链

**结论：本轮任何改动都不需要重跑生成链。** 依据：

| 生成链 | 产出 | 读什么 | 需要重跑吗 |
|---|---|---|---|
| `collect-schemes.mjs` | `_selection/data.js` | 读 `prototypes/S*/.inspect/report.json` + `style.css` | **不需要**（不改 S* 原型） |
| `check-stale.mjs` | — | 比对 `S*/index.html`、`S*/style.css` 的 mtime 与 `report.json.at` | **不需要**（同上） |
| `check-anchors.mjs` | — | 只扫 `S*/index.html` | **不需要** |
| `check-docs.mjs` | — | 读 `_selection/app.js` + `data.js` + `prompts.js` + `prompt-copy.js` | **不需要重跑生成，但必须重跑检查**（它会因 `field(` 计数变化而 FAIL） |

**唯一必须做的是：改完 `app.js` 后立刻跑 `check-docs.mjs`。**
因为它是本仓库唯一读 `_selection/app.js` 的检查器（`check-docs.mjs:431`）。

```powershell
D:\Nodejs\node.exe prototypes\_build\check-docs.mjs        # 期望 0 FAIL
D:\Nodejs\node.exe prototypes\_build\verify-prototype.mjs --all   # 期望仍是 26/4/30
```

### 10.3 每个子任务的回滚点

**前提：本轮只写 `prototypes/_selection/` 下 3 个文件。所有回滚都是单文件 `git checkout`。**

| 任务 | 改的文件 | 回滚命令 | 回滚后需重跑 |
|---|---|---|---|
| **T1** | `app.js`, `style.css` | `git checkout -- prototypes/_selection/app.js prototypes/_selection/style.css` | `check-docs.mjs` |
| **T2** | `app.js`, `style.css` | 同上 | `check-docs.mjs`（**必跑**，`field(` 计数风险最高） |
| **T3** | `app.js` | `git checkout -- prototypes/_selection/app.js` | `check-docs.mjs` |
| **T4** | `style.css`, `index.html` | `git checkout -- prototypes/_selection/style.css prototypes/_selection/index.html` | `check-anchors.mjs`（`index.html` 有 `#tpl-exit` 深链，`wizard.js:243` 指向它） |
| **T5** | 只新增 `deliverables/67-exec/verify-mobile-scope.mjs` | 删文件 | 无需（不碰产品文件） |

**额外回滚注意（三条硬雷）：**

1. **`index.html` 的 `id="tpl-exit"` 不能改。** `wizard.js:243` 有 `href="./#tpl-exit"` 的深链，
   `index.html:51` 的注释明写「保留 id="tpl-exit"：wizard.js:192 有 ./#tpl-exit 的深链，改 id 会断」。
   `check-anchors.mjs` **不扫 `_selection/`**（只扫 `S*/index.html`），所以**断了它查不出来**。
2. **`index.html` 的 `#tpl-strip` 位置不能变。** `index.html:157-162` 记录了实测：
   放清单后面 ⇒ top=1520，**整条在 900px 视口外**。改回去等于复原一个已修的 bug。
3. **`_selection/.inspect/report.json` 的 `at` 是 2026-10-21**，比 `style.css` 的 mtime 旧得多。
   但 `check-stale.mjs` 只扫 `S*/`，所以**不会报**。这意味着：**选型台的闸门数据是 7 天前的，
   且没有任何检查器会提醒你它过期了。** 这是我建议 T5 那条守门断言的另一个理由。

### 10.4 并发风险（本轮特有的）

**当前有另一个 Agent 在写 `app.js` / `style.css` / `index.html`（§0）。**
本计划的任何执行版本都会与它冲突。开工前必须：

1. `git status --short -- prototypes/` 确认干净，或
2. 与 `67-exec` 的 Agent 明确分工（它已在做 T2 的 `G4C` 方向），
3. **不要让两个 Agent 同时写 `app.js` 的 `renderDetail()`。**

我这份计划**不写任何产品文件**（只写 `deliverables/67-plan/`），所以与它无冲突。

---

## §11 附：本文全部数字的复算命令一览

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
cd D:\Web\style

# 闸门基线（26/4/30）
D:\Nodejs\node.exe prototypes\_build\verify-prototype.mjs --all

# 文档一致性（唯一读 _selection/app.js 的检查器）
D:\Nodejs\node.exe prototypes\_build\check-docs.mjs

# 列表页：A0–A5 × 390/414/1440 + launch width 不生效的反证
D:\Nodejs\node.exe deliverables\67-plan\_p1_list.mjs

# 详情面板：BASE/LHONLY/CTAONLY/N3/R2（工作区版，仅方向参考）
D:\Nodejs\node.exe deliverables\67-plan\_p2_detail.mjs

# 触控 / 焦点 / Tab / <13px 文本
D:\Nodejs\node.exe deliverables\67-plan\_p3_claims.mjs
D:\Nodejs\node.exe deliverables\67-plan\_p15_tab.mjs

# 【核心】视口高敏感性：844 是屏幕高不是可视视口
D:\Nodejs\node.exe deliverables\67-plan\_p4_sensitivity.mjs

# 【核心】滚多少像素见到完整卡（不依赖视口高的判据）
D:\Nodejs\node.exe deliverables\67-plan\_p5_scrollcost.mjs

# 滚到第几像素看到方案名 / rail 手势陷阱
D:\Nodejs\node.exe deliverables\67-plan\_p7_honest.mjs

# 【核心】A5 的桌面破坏面（h1 56→26px、rail 900→56px）
D:\Nodejs\node.exe deliverables\67-plan\_p8_desktop.mjs

# A5 把 <13px 块数翻倍、新增 10px 档
D:\Nodejs\node.exe deliverables\67-plan\_p9_smalltext.mjs

# 【核心】用仓库自己的 probe+judge 判 A5 过不过闸门
D:\Nodejs\node.exe deliverables\67-plan\_p10_gate.mjs

# --s-h1 死变量 / .cap 是 12px 的 30 个块
D:\Nodejs\node.exe deliverables\67-plan\_p11_tail.mjs

# 冻结 HEAD 快照上的详情矩阵（**本文详情数字的正源**）
D:\Nodejs\node.exe deliverables\67-plan\_p13_frozen.mjs
D:\Nodejs\node.exe deliverables\67-plan\_p16_twofold.mjs
D:\Nodejs\node.exe deliverables\67-plan\_p17_matrix.mjs
D:\Nodejs\node.exe deliverables\67-plan\_p18_fixed.mjs

# 639px vs 626.5px 的 12.5px 偏移归属
D:\Nodejs\node.exe deliverables\67-plan\_p19_offsets.mjs
```

冻结快照的重建（可重复，只读 git 对象）：

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$fz = "deliverables\67-plan\_frozen"
New-Item -ItemType Directory -Force -Path $fz | Out-Null
foreach ($f in @('index.html','style.css','app.js','data.js','prompts.js','prompt-copy.js','wizard.html','wizard.js','wizard.css')) {
  $txt = D:\Git\cmd\git.exe show "HEAD:prototypes/_selection/$f"
  [System.IO.File]::WriteAllText((Join-Path $fz $f), ($txt -join "`n"), [System.Text.UTF8Encoding]::new($false))
}
# 修正两个相对路径（否则字体与模板链接 404）
$p = Join-Path $fz 'index.html'
$t = [System.IO.File]::ReadAllText($p)
$t = $t.Replace('../_fonts/','../../prototypes/_fonts/').Replace('../../templates/','../../templates/')
[System.IO.File]::WriteAllText($p, $t, [System.Text.UTF8Encoding]::new($false))
```

---

## §12 一句话总结

**两个"缺陷"的数字基本都对（除了 639px 和 1003.6px 两个口径差），但它们的性质被搞错了：**
「首屏 0 卡」是「先解释再挑选」这个信息架构在 844px 下的必然结果，而且 844 是屏幕高不是可视视口高——
**A5 那个"1 张完整卡"在真实 iPhone 上不存在**，代价却是 h1 从 56px 砸到 26px（打穿 `focal-point`）、
桌面筛选栏从 900px 常驻变 56px 折叠条、缩略图裁掉 40%、`<13px` 文本从 33 涨到 69。
「详情 4.2–5.5 屏」的主闭环（复制按钮）在 **122.5px**，深读是次要动线，而且比它自己所在的列表页短 5 倍。

**审计最有价值的一条是"压排版"的发现，但它把自己的结论用反了**：我实测存在
**一个排版值都不动、只折 2 个字段就 0/30 达标**的方案（`G2`，2948–3768）；
折 4 个字段、排版全不动是 `G4C`（2119–2659），而它推荐的 `R2`（多压行高 1.62→1.5、内距 12→8）
只多拿 223px，代价是**连续阅读的行距**。**`R2` 的排版收紧是纯冗余。**

**最该做的不是这两条里的任何一条，而是：这个仓库最核心的那张页面，是这个仓库唯一没被自己闸门验过的页面**
（`verify-prototype.mjs` 只匹配 `^S\d{2}-`），而它现在带 4 条 FAIL，其中一条的根因是
**`--s-h1` 定义了却从没被使用**——和上一轮修掉的 `--s-15` 是同一个 bug，方向相反。**那是一行的事。**
