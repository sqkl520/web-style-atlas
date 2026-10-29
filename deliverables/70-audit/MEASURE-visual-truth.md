# MEASURE-visual-truth — 30 个原型的真实视觉构成（独立测量）

> 测量者：测量 Agent（三人并行独立测量之一）。只读，未改动任何 tracked 文件。
> 生成时间：2026-10-29T16:30:54.299Z
> 本文件由 `deliverables/70-audit/measure/probe-report.mjs` 从 JSON 生成，**所有数字都不是手写的**。

## 0 一句话结论

**「集合外颜色」这件事基本不存在。** 30 案里，像素级真正「不在色板内、也不是两色混合、也不在照片里」的孤立像素占比最高只到 0.19%（S21），且中位数为 0.00%。

真正的「集合外色」问题是**数据层的**：`dna-clean.json` 的 `palette` 只从 CSS `:root` 变量抽取（且上限 7 个），于是**硬编码在规则里的颜色结构性进不了调色板**。13/30 案存在「面积 ≥1% 或承载正文、但不在 palette 里」的颜色，绝大多数属于这一类。

## 1 测量方法（以及为什么不能只做元素级）

### 1.1 双轨制

| 轨道 | 手段 | 能回答 | 不能回答 |
| --- | --- | --- | --- |
| 元素级 | CDP 注入 JS，遍历可见元素读 `getComputedStyle` | 谁用了这个色、什么角色、多大面积 | 声明了但被盖住/根本没画；`<use>` 实例内部色 |
| 像素级 | 整页 PNG 截图 + 自写 PNG 解码 + 逐像素分类 | 屏幕上真的出现了什么 | 这个像素归哪个元素 |

两轨必须同时存在，且**必须交叉验证**。本报告第 3 节会给出多个「元素级说有、像素级说没有」的实例 —— 它们全是元素级算法的 bug。

### 1.2 面积口径

| 属性 | 面积算法 | 为什么不能更简单 |
| --- | --- | --- |
| `color` | Range 逐文本节点的墨迹矩形之和 | 元素盒子含行高与内边距，2.4 倍行高时能放大 2 倍以上 |
| `backgroundColor` | 元素 `getBoundingClientRect()` 面积 | 近似正确 |
| `border*Color` | 该边长 × 线宽 | 用盒子面积会把 1px 细线算成整块 |
| `stroke` | SVG `getBBox()` 周长 × `strokeWidth` | 同上 |
| `fill` | SVG `getBBox()` 面积，**仅叶子形状** | `<svg>`/`<g>` 的 fill 是初始值黑，它们不画填充（见 3.2） |
| 伪元素 | `getComputedStyle(el,'::before').width/height` | Chrome 给 used value；取不到才退回宿主盒子 |
| `boxShadow` | 0 | 静态渲染下多是 1px 环或不存在，按面积算会严重虚高 |

### 1.3 像素分类器（这是能否定性的关键）

每个像素落到以下一档，逐档都有实测依据：

| 档 | 含义 | 判据 |
| --- | --- | --- |
| `exact` | 与某声明色一致 | sRGB 距离 ≤ 3 |
| `near` | 某声明色被纹理调制后的值 | sRGB 距离 ≤ 15（纸纹/扫描线/噪点） |
| `aa` | 两声明色的抗锯齿过渡 | 到两色连线的距离 ≤ 5，且投影参数在两端之间 |
| `alpha` | 某声明色按 alpha 叠在另一色上 | 同上但偏离连线 2.5–5 |
| `textedge` | 文字抗锯齿 | 落在文字墨迹矩形 ±3px 内 |
| `raster` | 照片像素 | 落在 `<img>` 矩形内 |
| `isolated` | **真正可疑的集合外色** | 以上都不是 |

**为什么混合判定要在 sRGB 而不是 Lab 里做** —— `probe-blend-model.mjs` 实测：

| 模型 | 92285 个 AA 采样点的平均残差 | rgba(193,18,31,.5) 压纸底的预测 | 实测 |
| --- | --- | --- | --- |
| sRGB 直线插值 | **0.51 / 255** | (216,125,123) | (216,124,123) |
| linear-light 插值 | 10.59 / 255 | (218,170,159) | 误差 58.4 |

结论：Chrome 的合成在 sRGB 直线空间完成（sRGB 直线更贴合）。用 Lab 线段中点判混合会把大量正确混合判成「孤色」。

## 2 自检：每一条测量手段的对照实验

先造一个**答案已知**的 fixture（内存页面，不落盘），逐条断言。总计 **66 pass / 0 fail**，另有边界专项 **13 pass / 0 fail**。所有断言与其期望值都写在 `probe-selftest.mjs` 里，可逐条复核。

### 2.1 关键验证项

| 问题 | 实测答案 | 依据 |
| --- | --- | --- |
| SVG `stroke` 能不能拿到？ | 能，且**必须靠 stroke 判可见** | 水平 `<path>` / `<line>` 的 `getBoundingClientRect().height === 0`，按盒子过滤会把所有 1px 横线判成不可见 |
| 伪元素能不能拿到？ | 能，含 used value 尺寸 | `::after` 的 `width/height` 读到 `24px/24px`，面积 576 与像素直方图 576 完全一致 |
| `var()` 简写会不会读出空串？ | **不会** | `cs.border` 读到 `1px solid rgb(18,52,86)`。但代码仍读分项，因为 `border-image` 等会让简写变空 |
| 未定义 `var()`？ | 回落 inherit，不是空串 | `--nope` 的 `color` 读到父级 `rgb(26,22,20)` |
| 亚像素线会不会被取整？ | **会，而且不是简单的取整** | `border-top: 0.5px` 在 dpr=1 **和** dpr=2 下 computed 都是 `1px`；`outline-width`/`text-decoration-thickness` 则保留 `0.5px` |
| `oklch()` / `color-mix()`？ | computed 保留原语法，需归一 | `oklch(0.62 0.19 25)` → `#E24947`；`color-mix(...)` → `color(srgb 0.847...)` → `#D87C7B` |
| `<use>` 内部 symbol 色？ | **元素级拿不到** | `use.fill` 读到继承的 `rgb(0,0,0)`；像素级抓到 symbol 内色恰好 400px（20×20） |

### 2.2 半透明合成实测

`rgba(193,18,31,0.5)` 压在 `#EFE7D7` 上，实测像素 **(216,124,123)**，sRGB 直混预测 (216,125,123)，误差 1/255。

### 2.3 亚像素线与 DPR（全部 30 案都受影响）

| 属性 | dpr=1 的 computed | dpr=2 的 computed | 说明 |
| --- | --- | --- | --- |
| `border-top: 0.5px` | `1px` | `1px` | **被夹到 1 个 CSS px** |
| `border-top: 0.25px` | `1px` | — | 同样被夹 |
| `outline: 0.5px` | `1px` | — | 也夹（outline 走同一套宽度取整） |
| `text-decoration-thickness: 0.5px` | **`0.5px`** | — | 这个保留小数 |
| `box-shadow: 0 0 0 0.5px` | 渲染成半透明环 | — | 实测 `#CC84A1` = `#A8206B` 的 50% 叠在纸底 |

**结论：30 案里所有 < 1px 的 `border` 都被 Chrome 夹到 1px，与 devicePixelRatio 无关。**任何「0.5px 细线」的设计声明在渲染结果上都不成立 —— 它是 1px 实线。这条对「线宽是否符合规格」的判定很关键：按 CSS 源码判会得出「0.5px，合规」，按渲染判则是 1px。

## 3 自我纠错（本节是报告里最该被复核的部分）

我在开工后先写自检、再量 30 案。自检第一轮 **13 个 FAIL**，逐条复核后分成两类，两类都留了证据。

### 3.1 测量真的错了（已修）

| # | 错误 | 症状（实测） | 修法 |
| --- | --- | --- | --- |
| E1 | `canvas` 往返丢色阶 | `rgba(200,30,40,.5)` 经 canvas 读出 `199,30,40` | 改成 rgb/rgba/hex 走文本解析，canvas 只兜底 oklch/lab/color() |
| E2 | `currentColor` 被当成 `#000000` | canvas 把 `currentColor` 解析成黑色 | 显式识别 `currentColor`，解析成元素自身 color |
| E3 | **SVG 水平线全被判为不可见** | `getBoundingClientRect().height === 0` | 退化盒子改用 `stroke`/`getBBox()` 判可见（影响面：30 案所有 1px 横线） |
| E4 | `border: 0.5px` 面积算错 | 以为 computed 是 0.5px，实际被夹成 1px | 按 computed 值算，不再假设 CSS 原值 |
| E5 | 纹理叠加层全部漏检 | 正则 `/\\.(png)([?#]|$)/` 不匹配 `url("x.png")`（后面是引号） | 正则允许引号/括号 |
| E6 | **`<symbol>`/`<defs>` 模板被当成渲染内容** | S19 的 `#000000` 因此被算成 **58.69% 文档面积**，像素级 0 个 | 按祖先容器显式排除模板子树；`checkVisibility()` 对此无效（实测返回 true） |
| E7 | **`<svg>`/`<g>` 根元素的默认黑 fill 被按 bbox 记面积** | S15 的 `#000000` 27.97%、S20 11.29%，像素级全 0 | `fill` 只算叶子形状 |
| E8 | 遮罩与截图取自不同页面状态 | S24 六张照片测量时 `opacity:0`（未触发揭示），截图时已显现 | 先撑高→滚通全页→同一状态下先收集再截图 |
| E9 | 文字抗锯齿被算成「集合外色」 | S21 孤立像素 178358 个中 **174889（98.1%）** 在文字墨迹 ±3px 内 | 新增 `textedge` 档；S19/S20 的「真远离文字」孤立像素从数万降到 **0** |

### 3.2 我的**预期**写错了（代码是对的）

这一类更值得记，因为它们是「凭直觉以为浏览器会怎样」的产物：

| # | 我原来的预期 | 浏览器真实行为 |
| --- | --- | --- |
| X1 | `cs.border` 简写读不到 | 读到 `1px solid rgb(18,52,86)` |
| X2 | `0.5px` 边框能保留小数 | 被夹成 `1px` |
| X3 | `::before` 的 `content` 返回 CSS 转义 `"\2713"` | 返回已解码字符 `"✓"` |
| X4 | `oklch()` 的 computed 会归一成 `rgb()` | 保留 `oklch(0.62 0.19 25)` 原语法 |
| X5 | 单个 `<span>` 的文字墨迹面积 < 盒子面积 | 单行时两者完全相等（5278 = 5278）；必须用多行/大行高才测得出来 |
| X6 | `<use>` 内部 symbol 色可在元素级读到 | 读到的是继承值黑；只能靠像素级 |

### 3.3 被推翻的中间结论（写出来是为了避免下游复用）

| 中间结论 | 当时的数字 | 为什么错 | 修正后 |
| --- | --- | --- | --- |
| 「S16 有占屏 27% 的集合外色 `#F3E7CC`」 | 27.45% | 那是纸纹平铺图把 `#F7EBCF` 调制了 ±2 阶 | `near` 档吸收；S16 像素孤立 **0.000%** |
| 「S09 有占屏 18.6% 的集合外色」 | 18.599% | 同上（`tile-wall-iron.png` 平铺） | 修正后 **0.114%** |
| 「S01 有占屏 8.9% 的孤立色」 | 8.877% | 同上（`paper-grain.png`）+ 未滚通页面 | 修正后 **0.015%** |
| 「S19 `#000000` 占 58.69% 面积」 | 58.69% | `<symbol>` 模板 + `<svg>` 根元素默认黑 fill | 修正后像素级 **0.000%** |
| 「S24 有 172326 种集合外色」 | 8.1% | 照片未被遮罩（状态不一致） | 修正后 **0.003%** |

这五个中间结论如果直接交出去，会得到「18/30 案原型严重违反色板」的错误判决。

## 4 任务 A：30 案实际渲染颜色

输出：`measure/colors-30.json`。逐案给出每个实测色的：出现次数、元素级面积、像素级绘制量、是否在正文文本上、属性来源、元素类型、样本身份。

### 4.1 30 案总表

| 案 | 元素数 | 实测色数 | 像素样本 | exact | near | 混合 | textedge | **isolated** | 孤立占比 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S21 | 473 | 4 | 1072245 | 77.2% | 0.0% | 13.1% | 9.5% | 0.191% |
| S09 | 246 | 5 | 1074250 | 23.4% | 16.4% | 46.9% | 13.1% | 0.114% |
| S11 | 432 | 4 | 2779173 | 89.5% | 0.3% | 5.1% | 5.0% | 0.110% |
| S02 | 402 | 8 | 1768315 | 85.3% | 0.1% | 7.0% | 7.5% | 0.071% |
| S17 | 330 | 7 | 3216576 | 93.9% | 0.0% | 0.2% | 5.8% | 0.059% |
| S08 | 371 | 12 | 2104560 | 96.8% | 0.0% | 0.7% | 2.5% | 0.016% |
| S01 | 226 | 5 | 989396 | 29.2% | 10.6% | 42.1% | 18.1% | 0.015% |
| S06 | 338 | 9 | 2036621 | 24.6% | 0.0% | 63.4% | 12.0% | 0.013% |
| S05 | 376 | 9 | 926784 | 79.2% | 0.0% | 13.3% | 7.5% | 0.010% |
| S14 | 496 | 14 | 2457588 | 94.8% | 0.0% | 1.0% | 4.2% | 0.008% |
| S13 | 297 | 4 | 1449472 | 4.1% | 0.3% | 80.0% | 15.6% | 0.003% |
| S24 | 490 | 14 | 3122967 | 63.4% | 0.0% | 28.7% | 7.9% | 0.003% |
| S26 | 902 | 9 | 3434595 | 70.0% | 0.0% | 23.3% | 6.7% | 0.003% |
| S10 | 426 | 6 | 1542294 | 95.6% | 0.0% | 0.3% | 4.1% | 0.002% |
| S12 | 281 | 10 | 1590912 | 94.9% | 0.0% | 0.8% | 4.2% | 0.001% |
| S23 | 661 | 9 | 2791848 | 75.9% | 0.0% | 18.6% | 5.5% | 0.001% |
| S03 | 360 | 11 | 1332492 | 96.4% | 0.0% | 0.2% | 3.5% | 0.000% |
| S04 | 278 | 4 | 1639577 | 98.4% | 0.0% | 0.0% | 1.6% | 0.000% |
| S07 | 600 | 5 | 1141058 | 93.7% | 0.0% | 2.4% | 3.9% | 0.000% |
| S15 | 795 | 9 | 2893425 | 12.5% | 0.1% | 72.4% | 15.1% | 0.000% |
| S16 | 237 | 9 | 2580987 | 4.3% | 13.7% | 69.4% | 12.5% | 0.000% |
| S18 | 657 | 5 | 3599550 | 83.0% | 0.0% | 10.1% | 6.9% | 0.000% |
| S19 | 598 | 14 | 2820383 | 90.7% | 0.0% | 3.5% | 5.8% | 0.000% |
| S20 | 538 | 4 | 2641425 | 90.3% | 0.7% | 4.5% | 4.5% | 0.000% |
| S22 | 548 | 6 | 3051694 | 82.6% | 0.0% | 11.6% | 5.8% | 0.000% |
| S25 | 360 | 10 | 2041752 | 90.1% | 1.7% | 5.3% | 2.9% | 0.000% |
| S27 | 785 | 6 | 3502669 | 91.0% | 0.1% | 4.2% | 4.6% | 0.000% |
| S28 | 982 | 4 | 2950083 | 82.1% | 0.6% | 9.7% | 7.7% | 0.000% |
| S29 | 1050 | 7 | 4122906 | 67.4% | 0.1% | 23.4% | 9.1% | 0.000% |
| S30 | 502 | 9 | 2984753 | 92.2% | 0.0% | 4.7% | 3.1% | 0.000% |

> 「像素样本」= 参与分类的像素数（大页面按 2px 等距抽样，抽样不改比例）。
> **isolated 列是本报告最重要的数字**：全 30 案 ≤ 0.191%。

### 4.2 逐案主要颜色（按像素绘制量取前 3）

> **注意口径**：这里按**像素绘制量**排序并给出像素占比，不按元素级面积。元素级面积在嵌套元素上会重复累加，能算出 >100% 的「面积占比」（实测 S29 的 `#1A1A17` 达 239%）——那个数字没有物理意义，只是「有多少元素声明了这个色，各自多大」。像素不会重叠，所以像素占比才是屏幕真相。

**S21** — 文档 1440×3854，body 底 `#E4DCC9`，照片矩形 6 个
  - `#E4DCC9` 像素 75.51% / 39 元素 / backgroundColor/color
  - `#3E3A34` 像素 1.42% / 677 元素 / **正文** / backgroundColor/borderBottomColor/color
  - `#924307` 像素 0.25% / 12 元素 / backgroundColor/caretColor/stroke

**S09** — 文档 1440×3886，body 底 `#F5C842`，照片矩形 11 个
  - `#F5C842` 像素 38.10% / 18 元素 / **正文** / backgroundColor/backgroundColor::after/color
  - `#1F4E79` 像素 10.12% / 52 元素 / **正文** / color/backgroundColor/backgroundColor::before
  - `#151310` 像素 1.38% / 98 元素 / **正文** / color::before/color::after/backgroundColor

**S11** — 文档 1440×9435，body 底 `#DCDDD2`，照片矩形 8 个
  - `#DCDDD2` 像素 81.15% / 37 元素 / **正文** / backgroundColor/color/stroke
  - `#1B4A4A` 像素 7.11% / 137 元素 / **正文** / backgroundColor/color/borderTopColor
  - `#221E19` 像素 1.52% / 176 元素 / **正文** / color::before/color/textDecorationColor

**S02** — 文档 1440×6117，body 底 `#0B0B0F`，照片矩形 5 个
  - `#0A0A0D` 像素 71.64% / 5 元素 / backgroundColor
  - `#111111` 像素 10.00% / 1 元素 / color
  - `#14100A` 像素 1.61% / 9 元素 / backgroundColor

**S17** — 文档 1440×2358，body 底 `#E1D6BD`，照片矩形 5 个
  - `#E1D6BD` 像素 71.72% / 8 元素 / backgroundColor/color
  - `#C9BFA6` 像素 20.25% / 11 元素 / backgroundColor
  - `#5A2A50` 像素 1.10% / 159 元素 / **正文** / borderBottomColor/color/backgroundColor

**S08** — 文档 1440×7421，body 底 `#120C08`，照片矩形 4 个
  - `#120C08` 像素 75.99% / 20 元素 / backgroundColor/borderTopColor/borderRightColor
  - `#3A2712` 像素 18.67% / 51 元素 / borderTopColor/borderRightColor/borderBottomColor
  - `#6B4A22` 像素 1.27% / 119 元素 / backgroundColor/borderTopColor/borderRightColor

**S01** — 文档 1440×5069，body 底 `#EFE7D7`，照片矩形 6 个
  - `#EFE7D7` 像素 22.26% / 40 元素 / **正文** / backgroundColor/color/color::before
  - `#C1121F` 像素 14.23% / 16 元素 / backgroundColor/color/backgroundColor::after
  - `#1A1614` 像素 1.69% / 83 元素 / **正文** / backgroundColor/color::before/color

**S06** — 文档 1440×6150，body 底 `#ECDEC6`，照片矩形 7 个
  - `#E6D8BC` 像素 11.00% / 15 元素 / backgroundColor
  - `#241A12` 像素 7.77% / 113 元素 / **正文** / color::before/color::after/color
  - `#E0D0B0` 像素 2.81% / 3 元素 / backgroundColor

**S05** — 文档 1440×3121，body 底 `#0E100D`，照片矩形 6 个
  - `#0E100D` 像素 66.22% / 81 元素 / **正文** / backgroundColor/borderBottomColor/color::before
  - `#BFB9A6` 像素 11.76% / 115 元素 / **正文** / color/textDecorationColor/backgroundColor
  - `#4FA83D` 像素 0.57% / 24 元素 / **正文** / backgroundColor/borderTopColor/borderRightColor

**S14** — 文档 1440×7569，body 底 `#12181D`，照片矩形 10 个
  - `#12181D` 像素 53.24% / 465 元素 / **正文** / backgroundColor/color/color::before
  - `#171E24` 像素 23.19% / 2 元素 / backgroundColor
  - `#D8D2C4` 像素 15.91% / 63 元素 / **正文** / color/textDecorationColor/borderTopColor

**S13** — 文档 1440×4949，body 底 `#F4E3BE`，照片矩形 5 个
  - `#F4E3BE` 像素 3.42% / 27 元素 / backgroundColor/color/stroke
  - `#7B612C` 像素 0.61% / 39 元素 / **正文** / textDecorationColor/color/backgroundColor
  - `#D6CDB9` 像素 0.32% / 72 元素 / borderBottomColor/borderTopColor/backgroundColor

**S24** — 文档 1440×10533，body 底 `#E6EDF2`，照片矩形 6 个
  - `#E6EDF2` 像素 14.34% / 117 元素 / **正文** / backgroundColor/color/color::after
  - `#1B1136` 像素 13.60% / 3 元素 / backgroundColor
  - `#0A1116` 像素 10.71% / 166 元素 / **正文** / color::after/backgroundColor::after/color

**S26** — 文档 1440×10938，body 底 `#D3D1CA`，照片矩形 6 个
  - `#D3D1CA` 像素 48.70% / 25 元素 / **正文** / backgroundColor/color/color::before
  - `#485270` 像素 8.24% / 54 元素 / **正文** / color/backgroundColor
  - `#121212` 像素 5.76% / 710 元素 / **正文** / color::before/color/backgroundColor

**S10** — 文档 1440×5132，body 底 `#F2EFE8`，照片矩形 6 个
  - `#F2EFE8` 像素 89.41% / 66 元素 / **正文** / backgroundColor/fill/color
  - `#D32029` 像素 3.57% / 49 元素 / stroke/fill/backgroundColor
  - `#17171A` 像素 1.69% / 254 元素 / **正文** / color::before/stroke/borderBottomColor

**S12** — 文档 1440×4562，body 底 `#1E2A2E`，照片矩形 6 个
  - `#1E2A2E` 像素 59.29% / 14 元素 / backgroundColor
  - `#26353A` 像素 13.17% / 25 元素 / backgroundColor
  - `#B5D626` 像素 12.35% / 80 元素 / **正文** / borderBottomColor/color/backgroundColor

**S23** — 文档 1440×9626，body 底 `#DCDCC8`，照片矩形 10 个
  - `#DCDCC8` 像素 61.41% / 61 元素 / **正文** / backgroundColor/color/color::before
  - `#241C16` 像素 6.66% / 425 元素 / **正文** / color/textDecorationColor/backgroundColor
  - `#A8206B` 像素 5.11% / 34 元素 / **正文** / color/backgroundColor/backgroundColor::before

**S03** — 文档 1440×4591，body 底 `#101A1C`，照片矩形 12 个
  - `#0C1417` 像素 48.81% / 15 元素 / backgroundColor
  - `#101A1C` 像素 26.55% / 7 元素 / **正文** / backgroundColor/color
  - `#162226` 像素 19.63% / 6 元素 / backgroundColor

**S04** — 文档 1440×4912，body 底 `#F0E2C8`，照片矩形 9 个
  - `#F0E2C8` 像素 76.33% / 78 元素 / **正文** / backgroundColor/color/fill
  - `#14100C` 像素 21.57% / 233 元素 / **正文** / color/textDecorationColor/backgroundColor
  - `#96550F` 像素 0.27% / 4 元素 / backgroundColor

**S07** — 文档 1440×4146，body 底 `#E7E7E0`，照片矩形 7 个
  - `#E7E7E0` 像素 91.57% / 4 元素 / backgroundColor/color
  - `#33505C` 像素 1.13% / 83 元素 / **正文** / color/backgroundColor/stroke
  - `#1C1A16` 像素 0.61% / 313 元素 / **正文** / color/color::before/color::after

**S15** — 文档 1440×8812，body 底 `#E7EBE9`，照片矩形 8 个
  - `#22282B` 像素 5.32% / 21 元素 / **正文** / backgroundColor/color
  - `#E7EBE9` 像素 4.45% / 49 元素 / **正文** / backgroundColor/color/color::after
  - `#C3C9C7` 像素 2.20% / 133 元素 / borderBottomColor

**S16** — 文档 1440×9506，body 底 `#F7EBCF`，照片矩形 6 个
  - `#F7EBCF` 像素 14.36% / 7 元素 / backgroundColor/borderTopColor/borderRightColor
  - `#C52C0F` 像素 3.34% / 24 元素 / color/backgroundColor/borderTopColor
  - `#1A1A1A` 像素 0.26% / 92 元素 / **正文** / color/textDecorationColor/color::before

**S18** — 文档 1440×10723，body 底 `#0A0D0A`，照片矩形 5 个
  - `#0A0D0A` 像素 60.94% / 227 元素 / **正文** / backgroundColor/backgroundColor::before/color::before
  - `#C8C4AE` 像素 20.76% / 259 元素 / **正文** / color::after/color/color::before
  - `#6E6350` 像素 0.79% / 10 元素 / backgroundColor

**S19** — 文档 1440×10794，body 底 `#E4DECD`，照片矩形 11 个
  - `#E4DECD` 像素 47.56% / 47 元素 / **正文** / backgroundColor/color/color::before
  - `#2A241C` 像素 25.73% / 321 元素 / **正文** / color/textDecorationColor/backgroundColor
  - `#E9E3D2` 像素 11.23% / 21 元素 / backgroundColor

**S20** — 文档 1440×8834，body 底 `#FAF3E1`，照片矩形 7 个
  - `#FAF3E1` 像素 70.31% / 240 元素 / **正文** / backgroundColor/color/borderTopColor
  - `#0F1418` 像素 13.74% / 391 元素 / **正文** / color/textDecorationColor/color::before
  - `#26485C` 像素 7.00% / 79 元素 / borderBottomColor/color/backgroundColor

**S22** — 文档 1440×9870，body 底 `#DDDAD4`，照片矩形 8 个
  - `#DDDAD4` 像素 80.99% / 5 元素 / **正文** / backgroundColor/color
  - `#6B6558` 像素 2.31% / 2 元素 / backgroundColor::after
  - `#2E2A24` 像素 0.80% / 480 元素 / **正文** / color/textDecorationColor/color::before

**S25** — 文档 1440×6912，body 底 `#E8E4DE`，照片矩形 5 个
  - `#E8E4DE` 像素 70.35% / 9 元素 / backgroundColor/color/textDecorationColor
  - `#DFDAD2` 像素 15.26% / 5 元素 / backgroundColor
  - `#914A27` 像素 3.92% / 62 元素 / **正文** / backgroundColor/stroke/color::after

**S27** — 文档 1440×11732，body 底 `#E8D7B5`，照片矩形 7 个
  - `#E8D7B5` 像素 59.54% / 169 元素 / **正文** / backgroundColor/color::after/color
  - `#221C10` 像素 20.07% / 497 元素 / **正文** / color/textDecorationColor/backgroundColor
  - `#0E6258` 像素 11.36% / 214 元素 / **正文** / backgroundColor::after/borderLeftColor/backgroundColor

**S28** — 文档 1440×9949，body 底 `#0B0D12`，照片矩形 15 个
  - `#0B0D12` 像素 50.34% / 690 元素 / **正文** / backgroundColor/color/color::before
  - `#AF74BE` 像素 32.27% / 67 元素 / backgroundColor/color/borderTopColor
  - `#D8D4C6` 像素 0.21% / 482 元素 / **正文** / color/textDecorationColor/color::before

**S29** — 文档 1440×12777，body 底 `#D9D3C4`，照片矩形 6 个
  - `#D9D3C4` 像素 43.41% / 88 元素 / **正文** / backgroundColor/color/textDecorationColor
  - `#1A1A17` 像素 21.49% / 661 元素 / **正文** / color::before/color::after/backgroundColor::after
  - `#5A6068` 像素 1.03% / 86 元素 / backgroundColor/borderTopColor/stroke

**S30** — 文档 1440×9841，body 底 `#EDEDED`，照片矩形 7 个
  - `#EDEDED` 像素 59.24% / 18 元素 / **正文** / backgroundColor/color::after/color
  - `#E6E6E6` 像素 17.64% / 19 元素 / backgroundColor
  - `#FFFFFF` 像素 7.28% / 59 元素 / **正文** / color/color::after/backgroundColor

## 5 任务 B：字号层级（按字符数加权）

输出：`measure/typescale-30.json`。**逐文本节点**测量（`Range` + `getClientRects`），不是元素级 ——一个 `<p>` 里的 `<strong>`/`<code>` 字号不同，元素级会塌成一个。

### 5.1 30 案分布

| 案 | 字符数 | 档数 | 正文主力 | H1 | 最大/正文 | <11px 字符 | 全档（px，按字数降序） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S21 | 2461 | 7 | 16px | 86.4px | 5.4× | 0 | 86.4 / 27 / 22 / 17 / 16 / 13 |
| S09 | 1492 | 9 | 16px | 96.48px | 6.03× | 0 | 96.48 / 31.68 / 30.24 / 27 / 20 / 17 |
| S11 | 3778 | 7 | 16px | 106px | 6.63× | 0 | 106 / 30 / 21 / 20 / 19 / 16 |
| S02 | 3708 | 7 | 15px | 106.56px | 7.1× | 0 | 106.56 / 34 / 28 / 22 / 18 / 16 |
| S17 | 1921 | 11 | 16px | 86.4px | 5.4× | 0 | 86.4 / 28 / 24 / 20 / 17 / 16 |
| S08 | 1842 | 10 | 16px | 77.76px | 4.86× | 0 | 77.76 / 37.44 / 21 / 20 / 18 / 17 |
| S01 | 1733 | 9 | 16px | 96px | 6× | 0 | 96 / 28 / 23 / 22 / 18 / 16 |
| S06 | 3250 | 7 | 15px | 80.64px | 5.38× | 0 | 80.64 / 41.76 / 24 / 21 / 20 / 16 |
| S05 | 1928 | 5 | 16px | 86.4px | 5.4× | 0 | 86.4 / 28 / 20 / 16 / 12 |
| S14 | 4471 | 8 | 13px | 72px | 5.54× | 0 | 72 / 34 / 22 / 17 / 16 / 15 |
| S13 | 2595 | 7 | 15px | 56px | 3.73× | 0 | 56 / 30 / 26 / 22.5 / 20 / 15 |
| S24 | 3759 | 8 | 16px | 76px | 4.75× | 0 | 76 / 40 / 28 / 21.6 / 20 / 18 |
| S26 | 4999 | 9 | 15px | 80px | 5.33× | 0 | 80 / 46 / 34 / 33.84 / 24 / 22 |
| S10 | 2862 | 7 | 15px | 79.92px | 5.33× | 0 | 79.92 / 28 / 20 / 17 / 16 / 15 |
| S12 | 2674 | 8 | 17px | 95.04px | 5.59× | 0 | 95.04 / 30 / 26 / 20 / 17 / 16 |
| S23 | 2211 | 6 | 16px | 96px | 6× | 0 | 96 / 34 / 22 / 17 / 16 / 13 |
| S03 | 2399 | 9 | 13px | 68px | 5.23× | 0 | 68 / 34 / 20 / 16 / 15 / 14 |
| S04 | 1123 | 8 | 16px | 72px | 4.5× | 0 | 72 / 40 / 30 / 22 / 19 / 17 |
| S07 | 2771 | 6 | 16px | 77.76px | 4.86× | 0 | 77.76 / 40 / 34 / 24 / 18 / 16 |
| S15 | 5458 | 8 | 16px | 92px | 5.75× | 0 | 92 / 30 / 21 / 18 / 17 / 16 |
| S16 | 2397 | 6 | 20px | 88px | 4.4× | 0 | 88 / 32 / 24 / 20 / 18 / 14 |
| S18 | 7751 | 8 | 14px | 76px | 5.43× | 0 | 76 / 40 / 30 / 24 / 22 / 17 |
| S19 | 6443 | 8 | 16px | 72px | 4.5× | 0 | 72 / 34 / 26 / 22 / 17 / 16 |
| S20 | 5473 | 6 | 13px | 72px | 5.54× | 0 | 72 / 34 / 17 / 16 / 15 / 13 |
| S22 | 2250 | 8 | 17px | 80.64px | 4.74× | 0 | 80.64 / 34 / 20 / 17 / 16.5 / 15 |
| S25 | 2238 | 6 | 16px | 68px | 4.25× | 0 | 68 / 44 / 24 / 19 / 17 / 16 |
| S27 | 6808 | 8 | 16px | 86px | 5.38× | 0 | 86 / 30 / 22 / 18 / 17 / 16 |
| S28 | 7168 | 9 | 13px | 92px | 7.08× | 0 | 92 / 33.98 / 30 / 22 / 18 / 17 |
| S29 | 2590 | 8 | 16px | 74.88px | 4.68× | 0 | 74.88 / 37.44 / 23.04 / 21.6 / 20 / 16 |
| S30 | 4140 | 6 | 13px | 76px | 5.85× | 0 | 76 / 30 / 20 / 18 / 16 / 13 |

**分布特征**：档数 5–11（中位 8）；正文主力字号 13–20px（中位 16px）；最大字/正文比 3.73–7.1×。

### 5.2 字号档的用途判定

用途按「元素 tag → class 词根 → 字号分位」三级判定。下表统计全部 30 案合并后，各用途落在哪些字号：

| 用途 | 出现档数 | 字号范围 | 中位 |
| --- | --- | --- | --- |
| 正文 | 94 | 11–96px | 17px |
| 小标题 H2 | 30 | 21–44px | 32.76px |
| 等宽数据 | 30 | 11–46px | 14.86px |
| 标题 H1 | 29 | 56–106.56px | 80px |
| 元信息 | 16 | 14–19px | 15.5px |
| 小标题 H3 | 16 | 20–28px | 22px |
| 按钮/链接 | 8 | 13–24px | 16.5px |
| 标签 | 4 | 13–15px | 14px |
| 列表项 | 2 | 15–16px | 15.5px |

## 6 任务 C：色板对账

输出：`measure/palette-reconcile-30.json` + `measure/palette-reconcile-table.md`。

### 6.1 三向来源

| 方向 | 来源 | 抽取方式 |
| --- | --- | --- |
| 提示词声称 | `prototypes/_prompts/dna-clean.json` 的 `palette` | `clean-dna.mjs` 的 `pickPalette()`：**只读 CSS `:root` 声明**，上限 7 个 |
| 实测 | 本报告第 4 节 | 元素级 + 像素级 |
| 规格明写 | `prototypes/_specs/Sxx.md` 的 hex 字面量 | 逐行扫，**区分肯定/否定语境**（禁止/反的是/而不是…） |

> 上一轮 `LEAD-reconcile30.mjs` 用 `prompt.match(/#[0-9a-f]{6}/g)` 抓全部 hex，会把「禁止 `#6366F1`」也当成声称色。本报告按 40 字符窗口判语气，把否定提及单列。30 案里 `#6366F1` 全部落在否定语境。

### 6.2 逐案对账表

| 案 | 声称 | 实测 | 集合外 | 其中重要 | 案级裁决 | 主要集合外色（像素占比） |
| --- | --- | --- | --- | --- | --- | --- |
| S21 | 5 | 4 | 0 | 0 | CLEAN-无集合外色 | — |
| S09 | 4 | 5 | 2 | 0 | IGNORE-可忽略 | `#0000EE` 0.00% `#FFFFFF` 0.00% |
| S11 | 4 | 4 | 0 | 0 | CLEAN-无集合外色 | — |
| S02 | 7 | 8 | 1 | 1 | PROTO-原型超出规格 | `#0A0A0D` 71.64% |
| S17 | 7 | 7 | 1 | 0 | IGNORE-可忽略 | `#8C7A5B` 0.00% |
| S08 | 6 | 12 | 6 | 0 | IGNORE-可忽略 | `#FFF4D6` 0.00% `#8D4C16` 0.03% `#663710` 0.02% |
| S01 | 4 | 5 | 1 | 0 | NOISE-否定提及 | — |
| S06 | 7 | 9 | 2 | 1 | DATA-缺二级文字色 | `#5A3A1C` 0.01% `#B9A87F` 0.11% |
| S05 | 7 | 9 | 2 | 0 | IGNORE-可忽略 | `#FFFFFF` 0.00% `#7D7A68` 0.01% |
| S14 | 6 | 14 | 8 | 4 | PROTO-原型超出规格 | `#171E24` 23.19% `#9A968C` 0.01% `#3A3630` 0.00% |
| S13 | 4 | 4 | 0 | 0 | CLEAN-无集合外色 | — |
| S24 | 7 | 14 | 7 | 4 | PROTO-原型超出规格 | `#1B1136` 13.60% `#2A1B50` 1.54% `#3A276E` 0.49% |
| S26 | 7 | 9 | 2 | 1 | DATA-缺二级文字色 | `#2E3448` 0.00% `#0E0402` 0.04% |
| S10 | 5 | 6 | 1 | 0 | IGNORE-可忽略 | `#000000` 0.00% |
| S12 | 7 | 10 | 3 | 0 | IGNORE-次要 | `#4A5C60` 0.13% `#FF9AAB` 0.00% `#2C3A10` 0.00% |
| S23 | 7 | 9 | 2 | 2 | DATA-规格有但提示词漏 | `#FFFFFF` 0.02% `#E9A9C6` 0.00% |
| S03 | 7 | 11 | 4 | 0 | IGNORE-可忽略 | `#4A5A5E` 0.00% `#7C8A8C` 0.00% `#3B4A4D` 0.01% |
| S04 | 4 | 4 | 0 | 0 | CLEAN-无集合外色 | — |
| S07 | 4 | 5 | 1 | 0 | NOISE-否定提及 | — |
| S15 | 4 | 9 | 5 | 3 | PROTO-原型超出规格 | `#4C5257` 0.08% `#C8CECC` 1.50% `#C3C9C7` 2.20% |
| S16 | 5 | 9 | 4 | 2 | DATA-规格有但提示词漏 | `#FFFFFF` 0.02% `#FFF2E9` 0.00% `#000000` 0.00% |
| S18 | 6 | 5 | 0 | 0 | CLEAN-无集合外色 | — |
| S19 | 7 | 14 | 7 | 4 | PROTO-原型超出规格 | `#24201A` 0.33% `#DCD4BD` 2.35% `#5E5443` 0.01% |
| S20 | 4 | 4 | 0 | 0 | CLEAN-无集合外色 | — |
| S22 | 4 | 6 | 2 | 2 | DATA-规格有但提示词漏 | `#FFFFFF` 0.00% `#373A2F` 0.00% |
| S25 | 6 | 10 | 4 | 1 | DATA-缺二级文字色 | `#4A423A` 0.00% `#4B453F` 0.01% `#6B625A` 0.01% |
| S27 | 6 | 6 | 1 | 1 | DATA-缺二级文字色 | `#4A4232` 0.03% |
| S28 | 4 | 4 | 0 | 0 | CLEAN-无集合外色 | — |
| S29 | 6 | 7 | 1 | 0 | DATA-规格有但提示词漏 | `#FFFFFF` 0.01% |
| S30 | 6 | 9 | 3 | 2 | DATA-缺二级文字色 | `#2B2B2B` 0.03% `#4A4A4A` 0.01% `#B9B9B9` 0.09% |

### 6.3 「重要」与「不重要」的分界（按像素占比，不按元素面积）

| 判定 | 条件 | 30 案合计色数 |
| --- | --- | --- |
| 重要 | 像素占比 ≥1% **或** 用于正文/标签文字 | 28 |
| 不重要 | 其余（亚像素线、抗锯齿、单个装饰点） | 39 |
| 否定提及 | 只在规格的禁用句里出现 | 3 |
| 集合外合计 | | 70 |

### 6.4 关键分辨：规格里有 vs 规格里没有

这是两种完全不同的 bug，修法相反：

| 类型 | 含义 | 修法 | 案数 | 案号 |
| --- | --- | --- | --- | --- |
| **DATA** | 规格字段 3 明写了这个 hex，但 `palette` 没收录 | 改 `clean-dna.mjs` 抽取逻辑 | 5 | S24 S23 S16 S22 S29 |
| **PROTO** | 规格没写，原型自己加的，且屏幕占比 ≥1% 且非文字 | 改原型（需评估风险） | 5 | S02 S14 S24 S15 S19 |

**根因（DATA 类）**：`clean-dna.mjs` 的 `pickPalette()` 遍历的是 `rootDecls(rawCss)` 的结果，即**只包含 `:root{}` 里的自定义属性**。任何直接写在规则里的颜色（`border-bottom: 2px solid #C8CECC`）不可能进入 `palette`，与它有多重要无关。这是结构性漏抽，不是阈值问题。

### 6.5 像素级核对：palette 的头号色到底是不是屏幕上的主导色？

元素级面积会被嵌套元素重复累加（S02 在 1440×6117 的文档上累出 24.8M 的元素面积），所以「面积占比」不能直接当「屏幕占比」。这里用**像素绘制量**复核，问题更尖锐：如果 palette 声称的背景色不是屏幕上最大的那块色，palette 本身就是错的，这比「多了几个装饰色」严重得多。

| 案 | 屏幕主导色 | 占比 | 在 palette 里？ | palette 里画得最多的 | 占比 |
| --- | --- | --- | --- | --- | --- |
| S21 | `#E4DCC9` | 75.5% | ✓ | `#E4DCC9` | 75.5% |
| S09 | `#F5C842` | 38.1% | ✓ | `#F5C842` | 38.1% |
| S11 | `#DCDDD2` | 81.2% | ✓ | `#DCDDD2` | 81.2% |
| S02 | `#0A0A0D` | 71.6% | **✗** | `#111111` | 10.0% |
| S17 | `#E1D6BD` | 71.7% | ✓ | `#E1D6BD` | 71.7% |
| S08 | `#120C08` | 76.0% | ✓ | `#120C08` | 76.0% |
| S01 | `#EFE7D7` | 22.3% | ✓ | `#EFE7D7` | 22.3% |
| S06 | `#E6D8BC` | 11.0% | ✓ | `#E6D8BC` | 11.0% |
| S05 | `#0E100D` | 66.2% | ✓ | `#0E100D` | 66.2% |
| S14 | `#12181D` | 53.3% | ✓ | `#12181D` | 53.3% |
| S13 | `#F4E3BE` | 3.4% | ✓ | `#F4E3BE` | 3.4% |
| S24 | `#E6EDF2` | 14.3% | ✓ | `#E6EDF2` | 14.3% |
| S26 | `#D3D1CA` | 48.7% | ✓ | `#D3D1CA` | 48.7% |
| S10 | `#F2EFE8` | 89.4% | ✓ | `#F2EFE8` | 89.4% |
| S12 | `#1E2A2E` | 59.3% | ✓ | `#1E2A2E` | 59.3% |
| S23 | `#DCDCC8` | 61.4% | ✓ | `#DCDCC8` | 61.4% |
| S03 | `#0C1417` | 48.8% | ✓ | `#0C1417` | 48.8% |
| S04 | `#F0E2C8` | 76.3% | ✓ | `#F0E2C8` | 76.3% |
| S07 | `#E7E7E0` | 91.6% | ✓ | `#E7E7E0` | 91.6% |
| S15 | `#22282B` | 5.3% | ✓ | `#22282B` | 5.3% |
| S16 | `#F7EBCF` | 14.4% | ✓ | `#F7EBCF` | 14.4% |
| S18 | `#0A0D0A` | 60.9% | ✓ | `#0A0D0A` | 60.9% |
| S19 | `#E4DECD` | 47.6% | ✓ | `#E4DECD` | 47.6% |
| S20 | `#FAF3E1` | 70.3% | ✓ | `#FAF3E1` | 70.3% |
| S22 | `#DDDAD4` | 81.0% | ✓ | `#DDDAD4` | 81.0% |
| S25 | `#E8E4DE` | 70.3% | ✓ | `#E8E4DE` | 70.3% |
| S27 | `#E8D7B5` | 59.5% | ✓ | `#E8D7B5` | 59.5% |
| S28 | `#0B0D12` | 50.3% | ✓ | `#0B0D12` | 50.3% |
| S29 | `#D9D3C4` | 43.4% | ✓ | `#D9D3C4` | 43.4% |
| S30 | `#EDEDED` | 59.2% | ✓ | `#EDEDED` | 59.2% |

**结论：29/30 案的主导色确实在 palette 里。**唯一例外是 S02，详见 6.6。

### 6.6 S02 —— 唯一一个「palette 说错了背景色」的案

| 项 | 值 |
| --- | --- |
| palette 声称背景 | `#0B0B0F`（`--card`，"炭黑卡纸"） |
| 屏幕上占 71.6% 的色 | `#0A0A0D` |
| `#0A0A0D` 的来源 | `style.css:249` `.sheet{background-color:#0A0A0D}` 与 `style.css:364` `footer{background-color:#0A0A0D}` —— **硬编码，不在 `:root`** |
| 两者色差 | RGB 距离 2/255（`0A0A0D` vs `0B0B0F`）|
| 像素级判定 | 主导，71.640%；`#0B0B0F` 只有 0.85% |

这是**最有价值的一条发现**：它不是「多了个装饰色」，而是「提示词告诉 AI 的背景色不是实际背景色」。两者肉眼几乎相同（Δ2），所以任何基于「视觉差异」的检测都发现不了；只有把 `:root` 与硬编码值分开统计才能看见。修法明确：`clean-dna.mjs` 需要把「规则里硬编码的背景色」也纳入候选，而不是只看 `:root`。

### 6.7 反面发现：palette 里有一批色在屏幕上几乎不存在

这是 6.6 的镜像问题，同样属于数据质量。判据：palette 里的某色像素占比 < 0.5%。

| 案 | 声称了但屏幕占比 < 0.5% 的色 |
| --- | --- |
| S21 | `#924307` `#6E6A5E` `#FFFFFF` |
| S09 | `#8A4B24` |
| S11 | `#6E7A64` |
| S02 | `#B9B09A` |
| S17 | `#3F1A38` `#7A2E2E` `#DFD6BF` |
| S08 | `#E8DCC8` `#111111` |
| S06 | `#85572A` `#ECDEC6` |
| S05 | `#8C2F1F` `#111111` `#2A2E28` `#050605` |
| S14 | `#111111` |
| S13 | `#241F17` `#D6CDB9` |
| S24 | `#5D43AD` `#3A4652` |
| S26 | `#FFFFFF` `#38110E` |
| S10 | `#6E7076` |
| S12 | `#111111` |
| S23 | `#E9E9D7` `#5F5240` `#B7A78C` |
| S03 | `#C9D6CF` `#B9A98C` `#2A3639` |
| S04 | `#2F7D4F` `#96550F` |
| S07 | `#9A9384` |
| S15 | `#3A3F45` `#7A7466` |
| S16 | `#1A1A1A` `#8E2A18` `#5C5C55` |
| S18 | `#278F43` `#111111` |
| S19 | `#3A3227` `#7C7460` |
| S20 | `#55606B` |
| S25 | `#2E6B5E` `#FFFFFF` |
| S27 | `#1A150C` `#C9BFA6` `#FFFFFF` |
| S28 | `#D8D4C6` `#07080C` |
| S29 | `#644F02` |

**27/30 案**存在这种情况，共 53 个色。

其中 **S04 的 `#2F7D4F` 是 `primary` 之一**，但全页只有 780px²（0.011%）——它被定义成「辅助色（被晒褪的旗布）」，实际只在某处的 1 个背景块上出现。这不算 bug（规格允许辅助色面积小），但如果下游按 `primary` 给权重，就会高估它的视觉作用。

## 7 任务 D：逐案裁决

裁决规则（写死，可复核）：

| # | 条件 | 裁决 | 动作 |
| --- | --- | --- | --- |
| 1 | 规格里明写这个 hex | **改提示词** | `clean-dna.mjs` 抽取逻辑 |
| 2 | 用于正文/标签文字（`onBodyText > 0`） | **改提示词** | 补二级文字色到 palette |
| 3 | 屏幕占比 ≥1% 且非文字 | **改原型** | 评估改动风险 |
| 4 | 像素占比 <0.1% 且非文字 | **可忽略** | 不改 |
| 5 | 其余（0.1%–1%） | 次要 | 可不改 |

> 规则 2 是这次单独拆出来的一类。第一版把「承载正文」和「面积 ≥1%」合并判成「改原型」，结果 13 个案都被判成原型有问题。但逐个看样本后，这些几乎全是 **二级文字色**（`figcaption` / `span.ref` / `p.masthead__line` / `p.empty__say`）——文字本身只占几万像素，面积永远到不了 1%，但它们**视觉上不可忽略**，而且这是「palette 只收了一个主文字色」的**缺口**，该补数据，不该改原型。

| 案 | 裁决 | 动作 | 风险 | 依据（前 3 个集合外色） |
| --- | --- | --- | --- | --- |
| S21 | CLEAN-无集合外色 | 不改 | 无 | — |
| S09 | IGNORE-可忽略 | 不改 | 无 | `#0000EE` 0.07% IGNORE；`#FFFFFF` 0.04% IGNORE |
| S11 | CLEAN-无集合外色 | 不改 | 无 | — |
| S02 | PROTO-原型超出规格 | 改原型（评估风险） | **高（主导色都错了，下游全部受影响）** | `#0A0A0D` 81.99% PROTO |
| S17 | IGNORE-可忽略 | 不改 | 无 | `#8C7A5B` 0.00% IGNORE |
| S08 | IGNORE-可忽略 | 不改 | 无 | `#FFF4D6` 3.55% IGNORE；`#8D4C16` 0.03% IGNORE；`#663710` 0.02% IGNORE |
| S01 | NOISE-否定提及 | 不计 | 无 | — |
| S06 | DATA-缺二级文字色 | 改 clean-dna.mjs：palette 应包含二级文字色 | 无 | `#5A3A1C` 4.54% DATA；`#B9A87F` 0.12% IGNORE |
| S05 | IGNORE-可忽略 | 不改 | 无 | `#FFFFFF` 0.10% IGNORE；`#7D7A68` 0.01% IGNORE |
| S14 | PROTO-原型超出规格 | 改原型（评估风险） | 中（改 CSS 硬编码值） | `#171E24` 27.73% PROTO；`#9A968C` 0.82% DATA；`#3A3630` 0.63% DATA |
| S13 | CLEAN-无集合外色 | 不改 | 无 | — |
| S24 | PROTO-原型超出规格 | 改原型（评估风险） | 中（改 CSS 硬编码值） | `#1B1136` 12.90% PROTO；`#2A1B50` 1.75% PROTO；`#3A276E` 0.71% IGNORE |
| S26 | DATA-缺二级文字色 | 改 clean-dna.mjs：palette 应包含二级文字色 | 无 | `#2E3448` 0.07% DATA；`#0E0402` 0.04% IGNORE |
| S10 | IGNORE-可忽略 | 不改 | 无 | `#000000` 0.00% IGNORE |
| S12 | IGNORE-次要 | 可不改 | 无 | `#4A5C60` 0.16% IGNORE；`#FF9AAB` 0.05% IGNORE；`#2C3A10` 0.02% IGNORE |
| S23 | DATA-规格有但提示词漏 | 改 clean-dna.mjs 抽取逻辑 | 低（改抽取脚本） | `#FFFFFF` 1.86% DATA；`#E9A9C6` 0.16% DATA |
| S03 | IGNORE-可忽略 | 不改 | 无 | `#4A5A5E` 0.05% IGNORE；`#7C8A8C` 0.03% IGNORE；`#3B4A4D` 0.01% IGNORE |
| S04 | CLEAN-无集合外色 | 不改 | 无 | — |
| S07 | NOISE-否定提及 | 不计 | 无 | — |
| S15 | PROTO-原型超出规格 | 改原型（评估风险） | 中（改 CSS 硬编码值） | `#4C5257` 1.19% DATA；`#C8CECC` 0.59% DATA；`#C3C9C7` 0.49% PROTO |
| S16 | DATA-规格有但提示词漏 | 改 clean-dna.mjs 抽取逻辑 | 低（改抽取脚本） | `#FFFFFF` 0.37% DATA；`#FFF2E9` 0.10% DATA；`#000000` 0.04% IGNORE |
| S18 | CLEAN-无集合外色 | 不改 | 无 | — |
| S19 | PROTO-原型超出规格 | 改原型（评估风险） | 中（改 CSS 硬编码值） | `#24201A` 16.38% IGNORE；`#DCD4BD` 1.82% PROTO；`#5E5443` 1.16% DATA |
| S20 | CLEAN-无集合外色 | 不改 | 无 | — |
| S22 | DATA-规格有但提示词漏 | 改 clean-dna.mjs 抽取逻辑 | 低（改抽取脚本） | `#FFFFFF` 0.16% DATA；`#373A2F` 0.08% DATA |
| S25 | DATA-缺二级文字色 | 改 clean-dna.mjs：palette 应包含二级文字色 | 无 | `#4A423A` 2.90% DATA；`#4B453F` 0.02% IGNORE；`#6B625A` 0.02% IGNORE |
| S27 | DATA-缺二级文字色 | 改 clean-dna.mjs：palette 应包含二级文字色 | 无 | `#4A4232` 0.26% DATA |
| S28 | CLEAN-无集合外色 | 不改 | 无 | — |
| S29 | DATA-规格有但提示词漏 | 改 clean-dna.mjs 抽取逻辑 | 低（改抽取脚本） | `#FFFFFF` 0.20% DATA |
| S30 | DATA-缺二级文字色 | 改 clean-dna.mjs：palette 应包含二级文字色 | 无 | `#2B2B2B` 3.55% DATA；`#4A4A4A` 0.48% DATA；`#B9B9B9` 0.02% IGNORE |

### 7.1 裁决分布

| 裁决 | 案数 | 案号 |
| --- | --- | --- |
| CLEAN-无集合外色 | 7 | S21 S11 S13 S04 S18 S20 S28 |
| IGNORE-可忽略 | 6 | S09 S17 S08 S05 S10 S03 |
| PROTO-原型超出规格 | 5 | S02 S14 S24 S15 S19 |
| DATA-缺二级文字色 | 5 | S06 S26 S25 S27 S30 |
| DATA-规格有但提示词漏 | 4 | S23 S16 S22 S29 |
| NOISE-否定提及 | 2 | S01 S07 |
| IGNORE-次要 | 1 | S12 |

### 7.2 裁决的实际含义：13/30 案有问题，但只有 5 案该改原型

拆开看这 13 个案：

| 类型 | 案数 | 案号 | 该改什么 |
| --- | --- | --- | --- |
| **改原型** | 5 | S02 S14 S24 S15 S19 | CSS 里硬编码的实色块，面积 ≥1% |
| **改提示词（规格已有）** | 4 | S23 S16 S22 S29 | 规格字段 3 明写了，抽取时漏了 |
| **改提示词（缺二级文字色）** | 5 | S06 S26 S25 S27 S30 | palette 应支持二级文字色 |

**S02 是唯一一个「palette 说错了背景色」的案**（见 6.6），虽然案级裁决是 PROTO，但它的性质比其它 PROTO 严重得多 —— 其它 PROTO 是「多了一个色」，S02 是「背景色本身就报错了」。

而且如果按「改原型」去执行 14 个 PROTO 案，风险并不对等 —— 其中多数是**正文字色**被硬编码：

| 案 | PROTO 色 | 面积 | 承载正文 | 若改成 palette 内的色会怎样 |
| --- | --- | --- | --- | --- |
| S02 | `#0A0A0D` | 81.99% | 否 | 纯装饰，风险低 |
| S14 | `#171E24` | 27.73% | 否 | 纯装饰，风险低 |
| S24 | `#1B1136` | 12.90% | 否 | 纯装饰，风险低 |
| S24 | `#2A1B50` | 1.75% | 否 | 纯装饰，风险低 |
| S19 | `#DCD4BD` | 1.82% | 否 | 纯装饰，风险低 |

**结论**：PROTO 案里真正值得动的是「面积大 + 非正文」的少数几个；承载正文的那些（S06 `#5A3A1C` 21 处、S19 `#5E5443` 16 处、S30 `#2B2B2B` 38 处）改色会牵动对比度，应优先改**提示词**（把这些色补进 palette），而不是改原型。

## 8 我不确定的地方

1. **`near` 档的 15/255 阈值是经验值。** 它把「纸纹调制的纸色」和「另一个相近但不同的设计色」分在一线之间。30 案里 `near` 占比最高的是 S09 16.4%、S16 13.7%。若阈值取 8，这两案会出现新的「集合外色」；取 25 则消失。
2. **「重要」的 1% 门槛是任务书给的，不是推导出来的。** 面积 0.9% 与 1.1% 的色在视觉上没有区别，但判决相反。
3. **元素级面积是近似的。** 半透明叠加、`mix-blend-mode`（12 案用到）、`clip-path` 都会让「元素盒子面积」偏离真实覆盖。像素级更可信，但像素级给不出「谁」。
4. **只测了 1440×900 一档。** 768/390 的字号档与颜色面积会变（clamp 生效），本报告未覆盖。
5. **`textedge` 档可能吃掉了真实的细线颜色。** 落在文字矩形 ±3px 内的非实色像素一律归 textedge；若某案在文字紧邻处真有 1px 彩色描边，会被误吞。

## 9 复现

```powershell
cd D:\Web\style
node deliverables/70-audit/measure/probe-selftest.mjs        # 66 断言，必须全 PASS
node deliverables/70-audit/measure/probe-selftest-edge.mjs   # 边界专项
node deliverables/70-audit/measure/probe-blend-model.mjs     # 合成色彩空间
node deliverables/70-audit/measure/probe-colors.mjs          # 任务 A → colors-30.json
node deliverables/70-audit/measure/probe-typescale.mjs       # 任务 B → typescale-30.json
node deliverables/70-audit/measure/probe-reconcile.mjs       # 任务 C/D → palette-reconcile-30.json
node deliverables/70-audit/measure/probe-report.mjs          # 生成本文件
```

探针清单：`lib.mjs`（服务器/CDP/IO）、`inpage.mjs`（DOM 原语）、`collect.mjs`（颜色收集）、`png.mjs`（PNG 解码 + Lab）、`classify.mjs`（像素分类器）、`css-sources.mjs`（CSS 来源定位）。

## 10 环境与只读证明

| 项 | 值 |
| --- | --- |
| `git rev-parse HEAD` | `03f6fd47e364c43dffdf240f3eb298987f840625` |
| tracked 文件改动数 | **17** |
| 改动清单 | 
```
M README-EN.md
 M README.md
 M prototypes/_build/check-stale.mjs
 M prototypes/_prompts/build-prompts.mjs
 M prototypes/_prompts/clean-dna.mjs
 M prototypes/_prompts/dna-clean.json
 M prototypes/_prompts/dna-raw.json
 M prototypes/_prompts/extract-dna.mjs
 M prototypes/_prompts/mechanisms.mjs
 M prototypes/_selection/.inspect/desktop-fold.jpg
 M prototypes/_selection/.inspect/desktop-page-01.jpg
 M prototypes/_selection/.inspect/mobile-page-01.jpg
 M prototypes/_selection/.inspect/report.json
 M prototypes/_selection/.inspect/tablet-page-01.jpg
 M prototypes/_selection/prompt-copy.js
 M prototypes/_selection/prompts.js
 M prototypes/_selection/self-gate.js
``` |
