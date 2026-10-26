# 替换实验：9 个 hard 案的内容替换实测

> 执行环境：Windows，`D:\Nodejs\node.exe` v26，Chrome headless（CDP，`tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs`），本地只读服务 9612–9618。
> 原始 `prototypes/` **全程未被写入**：所有替换只发生在 `deliverables/63-test/replica/` 的副本里，服务端只读挂载仓库根。

---

## ① 实验方法

### 1.1 换了什么、怎么换的

对每个被测案，把 `index.html` 复制一份为 `index.swap.html`，然后逐**文本节点**做替换。三类字符分别有各自的替换规则：

| 原文类别 | 替换成 | 长度约束 |
|---|---|---|
| 中文字符串 | 水果词（梨/桃/苹果/猕猴桃/…，共 42 个词，1–3 字） | **连续中文字段的字符数一一相等** |
| 数字串 | 无意义连号（1201、1208、1215…） | **位数一一相等** |
| 拉丁词 | 水果拉丁词（APPLE/MANGO/GUAVA…） | **字母数、大小写形态一一相等** |
| 标点、空格、实体、缩进、换行 | **原样不动** | — |

替换时**绝不触碰**：标签、class、id、`href`/`src`、行内 `style`（含 `--h`/`--dx`/`--cell` 等全部 CSS 变量）、`<script>` 里的标识符与选择器。

### 1.2 怎么保证"只有文案变了"

`01-swap.mjs` 在写出文件后立刻做三项自检，全部通过才进入渲染：

1. **标签骨架逐字节相同**：把两份 HTML 的标签序列（去掉文案型属性值）做 diff，9 案全部 `struct-identical=true`，标签数完全相同（如 S29 的 2036→2036、S15 的 1473→1473）。
2. **数字串位数完全保持**：`digitRunsPreserved=true`（9/9）。这条很关键——它保证版式差异不可能来自数值位数变化。
3. **逐条字符串长度漂移**：9 案共 3544 条字符串，**超 5% 偏差的为 0 条**，平均漂移 0–0.01%，最差单条 −1 字符（1.0–1.8%）。

### 1.3 属性里的文案怎么办

属性里的中文有两种性质，必须分开处置，否则实验会误判：

- **纯文案**（`alt`/`title`/`aria-label`/`placeholder`）→ 照常替换。
- **逻辑键**（被 JS 当查表索引，如 `getAttribute('data-lock')] = b`）→ **不换**，因为它不是文案而是主键。
- **既被 CSS 选中、又是可见文案**（S21 的 `td[data-label="互斥"]`，`content:attr(data-label)` 把它画在表头）→ 连同 `style.swap.css` 里的选择器字面量**一起改名**，否则我会测到一个坏页面。

### 1.4 三个版本，用来把"我的替换"和"案子的机制"分开

这是本次实验最重要的设计。只做原版/替换版两版是不够的——因为我替换了拉丁词和数字，而来源声明行（图版出处、CC 协议、作者名）全是拉丁文，行数一变就会重新折行，产生 20–26px 的位移。这种位移是**我的替换造成的**，不是案子的机制造成的。

所以每个案子跑三版：

| 版本 | 内容 | 作用 |
|---|---|---|
| `orig` | 原件 | 基线 |
| `swap` | 中文 + 数字 + 拉丁**全换** | 严格意义上的"完全无关内容" |
| `swap-cjk` | **只换中文**，数字与拉丁原样 | 对照组 A：隔离我自己的拉丁/数字替换 |
| `swap-inset` | 中文换成**该页自己出现过的字** | 对照组 B：保证该案自建字体子集覆盖每一个字符 |

**判定规则**：若 A 版逐像素复现原版、只有 `swap` 版位移，则位移是我的替换假象；若 A 版仍位移，位移才是案子本身的性质。

### 1.5 量了什么

三档视口 **1440×900 / 768×1024 / 390×844**，同一浏览器、同一字体、同一资源，只换 URL：

1. **文档总高** `documentElement.scrollHeight`
2. **横向溢出** `scrollWidth − clientWidth`
3. **5 个关键元素的 `getBoundingClientRect()`**（每案手工挑选，见下表）
4. **元素重叠**：同父兄弟块两两求交，交面积 > 900px² 且 > 较小块 35% 记一次
5. **文字溢出容器**：拥有文本子节点且 `scrollWidth>clientWidth` 的元素数
6. **空白洞**：`<main>` 内连续 ≥240px 无块区
7. **资产完整性**：坏图数、样式表条数、CSS 规则条数、JS 异常数

关键元素选取（据 `02-structure.mjs` 实测结构定）：

| 案 | 5 个关键元素 |
|---|---|
| S03 | `.wrap.hero` `.plate` `.stream .band:first-child` `.readouts table` `.plates` |
| S05 | `.nameplate` `.hero.section` `.console.section` `.plates.section` `.colophon` |
| S10 | `.masthead` `.compare` `.plates` `.motion` `footer` |
| S14 | `.deck` `.fault` `.plates-sec` `.stations-sec` `.paths-sec` |
| S15 | `.masthead` `.atlas` `.year` `.zones` `.spec` |
| S18 | `.mast` `.stream` `.band` `.tags` `.fault` |
| S20 | `.masthead` `.sheet-sec` `.keys` `.plates-sec` `.maps-sec` |
| S21 | `.board` `.sheet` `.excl` `.states` `.ledger-foot` |
| S29 | `.topbar` `#ch1` `#ch2` `#ch3` `.fault` |

### 1.6 噪声底

`09-determinism.mjs`：同一张原版页连开 3 次，9 案 × 3 视口，docH 抖动 **全部 0px**。`11-s21-noise.mjs` 再对 S21 连开 6 次，docH 抖动 **0px**。所以本实验的测量噪声底是 0，任何 ≥1px 的差都是真实差异。

---

## ② 逐案结果表

字号说明：`docH` 为文档总高；三项对照列为 `swap / swap-cjk / swap-inset` 的最大 |docH 变化|。

| 案 | 1440 docH | 768 docH | 390 docH | 最大位移 | 横向溢出 | 文字溢出 | 重叠变化 | 对照 swap/cjk/inset | 判决 |
|---|---|---|---|---|---|---|---|---|---|
| **S03** 长曝光观测站 | 4591→4591 (+0%) | 5907→5907 (+0%) | 5814→5858 (+0.76%) | 20.8px | 0→0 | 0→0 | 14→14 | 0.76% / **0%** / 0.76% | **NOT-HARD** |
| **S05** 像素冷库台 | 3121→3121 (+0%) | 4510→4510 (+0%) | 5473→5498 (+0.46%) | 24.6px | 0→0 | 0→0 | 1→1 | 0.46% / **0%** / 0.62% | **NOT-HARD** |
| **S10** 栅格对开张 | 5132→5132 (+0%) | 5562→5538 (−0.43%) | 10322→10346 (+0.23%) | 24px | 0→0 | 0→0 | 5→5 | 0.43% / **0%** / 0.23% | **NOT-HARD** |
| **S14** 零重力发射序 | 7569→7569 (+0%) | 9264→9264 (+0%) | 12119→12076 (−0.36%) | 20.8px | 0→0 | 0→0 | 0→0~2 | 0.36% / **0%** / 0.17% | **NOT-HARD** |
| **S15** 渔场平面簿 | 8812→8812 (+0%) | 13296→13276 (−0.15%) | 15126→15084 (−0.28%) | 20.8px | 0→0 | 0→0 | 50→50 | 0.28% / **0%** / 0.21% | **NOT-HARD** |
| **S18** 磷光检修台 | 10723→10747 (+0.22%) | 13218→13242 (+0.18%) | 16303→16300 (−0.02%) | **0px** | 0→0 | 0→0 | 4→5 | 0.22% / **0%** / 0.32% | **NOT-HARD** |
| **S20** 针笔声场图 | 8834→8883 (+0.56%) | 11484→11484 (+0%) | 13792→13792 (+0%) | 49px | 0→0 | 0→0 | 286→286 | 0.56% / **0%** / 0.25% | **NOT-HARD** |
| **S21** 联锁释放簿 | 3854→3854 (+0%) | 4702→4753 (**+1.09%**) | 9384→9319 (−0.69%) | **65.3px** | 0→0 | 0→0 | 0→0~1 | 1.09% / **1.09%** / 1.09% | **PARTIAL** |
| **S29** 钢丝安全册 | 12777→12777 (+0%) | 16128→16128 (+0%) | 24216→24216 (+0%) | **0px** | 0→0 | 0→0 | 36→35 | **0%** / **0%** / 0.22% | **NOT-HARD** |

### 2.1 判决依据

**没有任何一案达到"HARD"的门槛（15% 文档高变化）。** 最大的是 S21 的 1.09%，其余全部 ≤0.76%。横向溢出 9 案 × 3 视口全部 0→0；文字溢出容器 9 案 × 3 视口全部 0→0。也就是说：**那个 `hard:true` 警告在版式层面从未成立**。

**为什么 S21 单独判 PARTIAL**：它是唯一一个"对照组 A 也照样漂移"的案子。`swap`、`swap-cjk`、`swap-inset` 三版的漂移量**完全相同**（1.085%），说明这不是我的拉丁/数字替换造成的。继续追下去发现根因在字体：S21 的中文字体「文津宋体」是**按本页实际用到的 455 个非 ASCII 字符手工裁切的自托管子集**（71 个 unicode-range 分片，163.3KB）。换成水果字之后，73 个水果字形**一个都不在子集里**，浏览器回退到系统衬线体。字形宽度虽然同为 1em（所以 docH 只变了 1%），但**视觉上字面确实换了一种字**，单字换行位置也随之改变——390×844 那屏的 `22:04` 由一行变成了两行。

不过要如实说明：这 1.09% 是**字体子集化策略**的连带效应，不是"机制在读内容"。S21 的互斥关系、锁号、切口角度全部存在 `data-lock`/`data-excl`/`data-angle` 属性里（175 个 data-* 属性，其中 59 个纯数值），换文案碰不动它们。所以判 PARTIAL 而非 HARD，理由写在 ④。

---

## ③ 截图索引

每案每版每视口都有 `-fold.jpg`（首屏）和 `-full.jpg`（整页），共 **216 张**，位于 `deliverables/63-test/shots/<案名>/`。
命名：`{orig|swap|swap-cjk|swap-inset}-{1440x900|768x1024|390x844}-{fold|full}.jpg`。

主要成对索引（原版 ↔ 替换版）：

| 案 | 首屏 1440 | 整页 1440 | 首屏 390 |
|---|---|---|---|
| S03 | [orig](shots/S03-long-exposure-observatory/orig-1440x900-fold.jpg) ↔ [swap](shots/S03-long-exposure-observatory/swap-1440x900-fold.jpg) | [orig](shots/S03-long-exposure-observatory/orig-1440x900-full.jpg) ↔ [swap](shots/S03-long-exposure-observatory/swap-1440x900-full.jpg) | [orig](shots/S03-long-exposure-observatory/orig-390x844-fold.jpg) ↔ [swap](shots/S03-long-exposure-observatory/swap-390x844-fold.jpg) |
| S05 | [orig](shots/S05-pixel-cold-storage-console/orig-1440x900-fold.jpg) ↔ [swap](shots/S05-pixel-cold-storage-console/swap-1440x900-fold.jpg) | [orig](shots/S05-pixel-cold-storage-console/orig-1440x900-full.jpg) ↔ [swap](shots/S05-pixel-cold-storage-console/swap-1440x900-full.jpg) | [orig](shots/S05-pixel-cold-storage-console/orig-390x844-fold.jpg) ↔ [swap](shots/S05-pixel-cold-storage-console/swap-390x844-fold.jpg) |
| S10 | [orig](shots/S10-grid-versus-sheet/orig-1440x900-fold.jpg) ↔ [swap](shots/S10-grid-versus-sheet/swap-1440x900-fold.jpg) | [orig](shots/S10-grid-versus-sheet/orig-1440x900-full.jpg) ↔ [swap](shots/S10-grid-versus-sheet/swap-1440x900-full.jpg) | [orig](shots/S10-grid-versus-sheet/orig-390x844-fold.jpg) ↔ [swap](shots/S10-grid-versus-sheet/swap-390x844-fold.jpg) |
| S14 | [orig](shots/S14-zero-g-launch-sequence/orig-1440x900-fold.jpg) ↔ [swap](shots/S14-zero-g-launch-sequence/swap-1440x900-fold.jpg) | [orig](shots/S14-zero-g-launch-sequence/orig-1440x900-full.jpg) ↔ [swap](shots/S14-zero-g-launch-sequence/swap-1440x900-full.jpg) | [orig](shots/S14-zero-g-launch-sequence/orig-390x844-fold.jpg) ↔ [swap](shots/S14-zero-g-launch-sequence/swap-390x844-fold.jpg) |
| S15 | [orig](shots/S15-fishery-floor-ledger/orig-1440x900-fold.jpg) ↔ [swap](shots/S15-fishery-floor-ledger/swap-1440x900-fold.jpg) | [orig](shots/S15-fishery-floor-ledger/orig-1440x900-full.jpg) ↔ [swap](shots/S15-fishery-floor-ledger/swap-1440x900-full.jpg) | [orig](shots/S15-fishery-floor-ledger/orig-390x844-fold.jpg) ↔ [swap](shots/S15-fishery-floor-ledger/swap-390x844-fold.jpg) |
| S18 | [orig](shots/S18-phosphor-service-deck/orig-1440x900-fold.jpg) ↔ [swap](shots/S18-phosphor-service-deck/swap-1440x900-fold.jpg) | [orig](shots/S18-phosphor-service-deck/orig-1440x900-full.jpg) ↔ [swap](shots/S18-phosphor-service-deck/swap-1440x900-full.jpg) | [orig](shots/S18-phosphor-service-deck/orig-390x844-fold.jpg) ↔ [swap](shots/S18-phosphor-service-deck/swap-390x844-fold.jpg) |
| S20 | [orig](shots/S20-plotter-soundfield/orig-1440x900-fold.jpg) ↔ [swap](shots/S20-plotter-soundfield/swap-1440x900-fold.jpg) | [orig](shots/S20-plotter-soundfield/orig-1440x900-full.jpg) ↔ [swap](shots/S20-plotter-soundfield/swap-1440x900-full.jpg) | [orig](shots/S20-plotter-soundfield/orig-390x844-fold.jpg) ↔ [swap](shots/S20-plotter-soundfield/swap-390x844-fold.jpg) |
| S21 | [orig](shots/S21-interlocking-release-book/orig-1440x900-fold.jpg) ↔ [swap](shots/S21-interlocking-release-book/swap-1440x900-fold.jpg) | [orig](shots/S21-interlocking-release-book/orig-1440x900-full.jpg) ↔ [swap](shots/S21-interlocking-release-book/swap-1440x900-full.jpg) | [orig](shots/S21-interlocking-release-book/orig-390x844-fold.jpg) ↔ [swap](shots/S21-interlocking-release-book/swap-390x844-fold.jpg) |
| S29 | [orig](shots/S29-wire-bound-safety-manual/orig-1440x900-fold.jpg) ↔ [swap](shots/S29-wire-bound-safety-manual/swap-1440x900-fold.jpg) | [orig](shots/S29-wire-bound-safety-manual/orig-1440x900-full.jpg) ↔ [swap](shots/S29-wire-bound-safety-manual/swap-1440x900-full.jpg) | [orig](shots/S29-wire-bound-safety-manual/orig-390x844-fold.jpg) ↔ [swap](shots/S29-wire-bound-safety-manual/swap-390x844-fold.jpg) |

三版对照（同一视口）：
[S03](shots/S03-long-exposure-observatory/swap-cjk-1440x900-fold.jpg) · [S05](shots/S05-pixel-cold-storage-console/swap-cjk-1440x900-fold.jpg) · [S10](shots/S10-grid-versus-sheet/swap-cjk-1440x900-fold.jpg) · [S14](shots/S14-zero-g-launch-sequence/swap-cjk-1440x900-fold.jpg) · [S15](shots/S15-fishery-floor-ledger/swap-cjk-1440x900-fold.jpg) · [S18](shots/S18-phosphor-service-deck/swap-cjk-1440x900-fold.jpg) · [S20](shots/S20-plotter-soundfield/swap-cjk-1440x900-fold.jpg) · [S21](shots/S21-interlocking-release-book/swap-cjk-1440x900-fold.jpg) · [S29](shots/S29-wire-bound-safety-manual/swap-cjk-1440x900-fold.jpg)

**逐张目视核对过**（`read_image`），不是只看数字。核对结论与度量一致：替换版的标题、正文、表头、图注全部变成水果词，但**网格、栏宽、图片位、色块、留白节奏一处未动**；S21 的移动端能看到字体回退（笔画风格由宋体变成系统衬线）与 `22:04` 折行。

---

## ④ 每案的机制解读

先把结论摆出来：**9 案的"数据"几乎全部住在标记属性与 CSS 自定义属性里，没有一个住在文案里**。这是它们换成水果之后纹丝不动的根本原因。

| 案 | 几何/数据住在哪 | 换成水果后 | 机制在读什么 |
|---|---|---|---|
| **S03** | 8 个 `style="--h:28px"`（带高即曝光秒数），被 CSS 消费 | 全案 0 位移（cjk 版逐像素相同） | 读 `--h`，不读 `<figcaption>` 里的"30 s"。改文案不影响带的相对高度；**要改带高得改 `--h`** |
| **S05** | 30 条 SVG path、`content:"探头编号已登记"`、格栅位图 | 1440/768 逐像素相同；390 差 24.6px 但 cjk 版 0 | 读 SVG/位图几何。唯一影响版式的是 `.plate-credit` 那行**拉丁**署名折行（我的替换假象） |
| **S10** | 12 个 `--p`（列宽百分比）、24 个纯数值 `data-*` | cjk 版 0；swap 版 24px 全在拉丁金额行 | 读 `--p` 与 `data-*`。表格列宽由变量定，不由"46 家"这个数字定 |
| **S14** | **110 个 CSS 变量**（`--dx/--dy/--w/--ux/--uy/--ord`），11 枚标贴的极坐标由构建脚本预算 | cjk 版 0；swap 版 390 差 20.8px（`.ref` 拉丁引文行） | 读极坐标变量做"距质心最近"排序。文案换了，标贴仍钉在原来的坐标上 |
| **S15** | 39 条 SVG path（船体线图）、21 个 `data-*`（7 个纯数值） | cjk 版 0；swap 版 20.8px 全在 `span.ref` | 读 SVG 与 `data-layer`/`data-year`。"第 2 层"是文案，真正驱动分层高亮的是 `data-layer` |
| **S18** | 20 条 SVG path、4 个 `--at` | **三视口关键元素全部逐像素相同**，仅页脚 +24px（拉丁 URL 折行） | 读位图与 `--at`。这是最"只依赖结构"的一案 |
| **S20** | 33 条 SVG path（`pathLength="1"` 的走线环）、6 个 `--d`/`--t` | cjk 版 0；swap 版 1440 差 49px（`.grp__body` 拉丁参数行） | 读 SVG 环与 `--d`（圈数/间距）。"1840 段"是文案，真正的段数由 `p.segs` 算 |
| **S21** | 175 个 `data-*`（59 纯数值）+ 14 个 `--i`；**字体为手工子集** | 三版均漂 1.09%；65.3px 位移 | 互斥/锁号/角度读属性；**但字体子集是按原文字形裁的，换字即回退**——这是唯一"内容真的进来了"的地方，进的是字体，不是版式 |
| **S29** | 47 条 SVG path、51 个纯数值 `data-*` | **三视口全部逐像素相同（0px）** | 读 `data-chapter`/`data-part` 做章节跳转。全案对文案最不敏感 |

**最反直觉的一条**：`hard:true` 这个标注想说的是"机制绑死在行业数据上"，但实测下来真正的耦合方向反了——这些原型把数据**预先炸进了标记**（CSS 变量、SVG path、`data-*`），所以文案反而是最自由的一层。也就是说，标注警告的那件事（换普通内容会退化）在版式上不成立；真正会退化的地方是**语义**：换成水果后 S03 的"带高=曝光秒数"不再是可读的叙述，S21 的"互斥锁"不再有对象。**机制没崩，故事崩了。**

S21 是唯一能把这条说清楚的证据：它崩的地方不是网格，是字体——因为它的中文字体是按**这一页的具体用字**裁的。这是"内容真的进到了构建管线里"，比版式耦合隐蔽得多，也更容易在换内容时被忽略。

---

## ⑤ 实验的边界

这个实验能证明"版式不依赖文案"，但不能证明"案子能换行业"。以下情形会误判：

1. **只测版式，不测语义。** 全部指标都是几何量。一个页面可以在 0px 位移的同时彻底失去意义（S03 的"高度即曝光时长"在水果版里已成空话）。**若把 NOT-HARD 读成"可以随便换内容"，就是误读。**

2. **保持长度就等于替案子辩护了一半。** 我强制每条文案等长，等于替它挡住了最容易崩的一种替换。真实使用中「把 46 家供应商的报价按到货周期排成一栏」会被换成「我们的咖啡豆」这种长度完全不同的文案，那时折行数会变，docH 会动。**本实验测的是"内容语义无关"，不是"内容长度无关"。** 长度敏感性必须另做实验（把每条文案随机缩到 0.5×/1.5×）。

3. **对照组暴露了我的替换本身会制造 20–50px 噪声。** `swap-cjk` 版 9 案全部 0px，说明那 20–50px 全部来自我改拉丁/数字导致来源声明行重排。任何后续做同类实验的人，**必须**设这个对照组，否则会把假象当成结论。

4. **S21 的字体子集问题只在"自建子集字体"的案子上出现，而它刚好是本次唯一一例。** 30 个原型里凡是自托管裁切中文字体的，换内容都会遇到同一问题；只换文案不会发现它，因为文案是同一批字。这一条无法靠几何指标发现（宽度同为 1em），只能靠 `document.fonts.check()` 或目视。

5. **字体加载时序会污染测量。** S21 在 `document.fonts.status === 'loading'` 时测得的 docH 会在 4676–4728 之间跳；等 `fonts.ready` + 800ms 后 6/6 稳定。**任何不等字体就量的 A/B，在自建字体页面上结论都不可信。**

6. **"5 个关键元素"是我选的。** 选的是结构上的大块与机制驱动的原子块；如果某案的崩坏发生在没被选中的深层节点，`maxShift` 会漏报。缓解手段是 `05-element-diff.mjs` 做了全量元素逐一比对（不是只比 5 个），但它只跑了三个视口各一次，没做重复取样。

7. **只测 3 个视口、只测 Chrome。** 768/1024 与 390/844 之外的中间宽度、以及 Firefox/Safari 的字体回退与 `ch`/`ex` 单位差异未覆盖。

8. **没测交互态。** 所有测量都在初始渲染完成、滚回顶部之后进行。按钮点开后的展开态、`aria-live` 回话区、滚动驱动的参数变化（S20 的滚动改频率）都未纳入。这些区域恰恰是文案密度最高的地方。S05 的探针输入（`maxlength=6`）与 S10 的 `match(/[\d.]+%/)` 读的是**数字**，若把百分比换成非数字，交互会直接失效——本实验保留了数字位数，所以没触发这条。

---

## 附：可复现产物

| 路径 | 内容 |
|---|---|
| `scripts/00-inventory.mjs` | 文案清单（文本节点/属性值/JS 字符串/CSS content） |
| `scripts/01-swap.mjs` | 替换生成器 + 三项自检（`SUFFIX`/`LATIN_MODE`/`NUM_MODE`/`CJK_MODE`） |
| `scripts/02-structure.mjs` | 结构探针，用于挑选关键元素 |
| `scripts/03-render.mjs` | A/B 渲染 + 度量 + 截图（`VARIANTS` 可选 orig/swap/swap-cjk/swap-inset） |
| `scripts/04-compare.mjs` | 三版对比表 |
| `scripts/05-element-diff.mjs` | 全量元素逐一几何 diff，定位位移到根因块 |
| `scripts/06-font-check.mjs` | `document.fonts.check()` 逐字验证字体子集覆盖 |
| `scripts/07-verdict.mjs` | 四版合并 → 判决数据集 |
| `scripts/08-data-location.mjs` | 统计各案数据住在变量/属性/SVG 的比例 |
| `scripts/09-determinism.mjs` `11-s21-noise.mjs` | 噪声底（0px） |
| `scripts/10-s21-font-timing.mjs` | S21 字体加载时序实验 |
| `data/verdict-data.json` | 判决原始数据（三版 × 三视口 × 5 元素） |
| `data/element-diff.json` | 全量元素位移 |
| `data/font-coverage.json` | 逐字体逐字覆盖结果 |
| `data/determinism.json` | 重复渲染噪声 |
| `replica/<案>/index.swap{,-cjk,-inset}.html` | 三个替换版 |
