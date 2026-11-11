# 主线程实测记录：度量器修复后的真实基线

> 2026-11-12　主线程（不经 agent 转述，全部是我自己跑的）

---

## 一、全库 35 案测量成功，但数据里有两处自相矛盾

脚本 `_probe/_all-measure.mjs`，用修好的 `measure.mjs` 跑全库，**35/35 成功，零失败**。

```
S01 4  S02 3  S03 3  S04 2  S05 2  S06 2  S07 3  S08 4  S09 3  S10 5  S11 12 S12 4
S13 16 S14 0  S15 12 S16 0  S17 3  S18 3  S19 12 S20 3  S21 3  S22 13 S23 2  S24 8
S25 2  S26 2  S27 9  S28 16 S29 2  S30 12 S31 4  S32 4  S33 3  S34 0  S35 2
```

与上一轮 `01-ROUND-SUMMARY.md` §六 那张表**逐案一致**，说明我修的站点根与 CLI 入口两处没有改变测量结论（这是应该的 —— 它们只影响字体能否加载与脚本能否启动）。

### 1.1 矛盾一：S09 有 `gridTracks=3` 但 `mainRatio=[]`

```
选中 ul#rows.rows  gridTracks=3  gridFrom=column  mainRatio=[]  maxColCount=3
```

轨道数出来了，比例却空了。两者本应同源。**后果**：任何拿 `mainRatio` 当判据的地方，
遇到 S09 这种会让 `significant(want.mainRatio)` 得到空数组，然后 `compare.mjs:74`
的 `wR.length >= 2` 为假 ⇒ 该判据被**静默跳过**、记 PASS。这是「闸门读不到数据 → 不报错 → 打印漂亮结果」的又一例。

### 1.2 矛盾二：S34 有 `auto-fit` 网格却量出 0 轨

```
S34  style.css:199  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
     measure.mjs --debug → 只有 1 个候选：landmark:footer 4 轨，被排除 → gridTracks=0
```

判定为 `no-column-layout` 是**正确的**（那个 auto-fit 网格是内容卡片区，不是版心），
但暴露了真问题：`gridTracks=0` 把「确实没有分栏」和「有分栏但没选中」**混成同一个值**。
S14/S16/S34 三案都是 0，其中 S14/S16 的规格原文写的就是「不使用固定栏数」，是真无分栏；
S34 则是有 auto-fit 网格但被排除。**验货时这两类不能用同一个判据。**

---

## 二、`layoutKind` 必须逐容器判，不能逐文件判

我原来在 `_all-measure.mjs` 里用「CSS 文件里有没有 `auto-fit`」当判据，得到 11 案：

```
S02 S08 S12 S17 S21 S25 S31 S32 S33 S34 S35
```

**这个判法对 S17 是错的。** 实测：

```
S17 style.css:224  grid-template-columns: repeat(auto-fit, minmax(228px, 1fr));   ← 图版
S17 style.css:244  .foot-grid { ... repeat(auto-fit, minmax(250px, 1fr)) }        ← 页脚
S17 style.css:131  .sheet { grid-template-columns: minmax(210px,3fr) 16px 9fr }   ← 真版心，固定
```

`measure.mjs` 选中的是 `div.sheet`（固定 3 轨），比例 `[0.247, 0.012, 0.741]` 与
`3fr 16px 9fr` 吻合。而我的文件级判法把 S17 归进 `auto-fit`，等于给一个版心固定的案子
贴了「列数随视口变」的标签。

**所以 `layoutKind` 必须跟着被选中的那个容器走**，即由 `gridSel` 对应的
`grid-template-columns` 值来判，而不是扫整个 CSS 文件。

这条直接决定 A3 的实现，必须写进 PLAN。

---

## 三、Q7 那批生成物在修复后的度量器下的真实表现

脚本 `_probe/_q7-rescore.mjs`，九案，用同一条度量器量原型与生成物：

| 案 | 原型 headBody | 生成物 headBody | 差 | 原型图 | 生成物图 | 原型栏 | 生成物栏 |
|---|---|---|---|---|---|---|---|
| S03 | 4.25 | 4.30 | +0.05 | 12 | **9** | 3 | 2 |
| S06 | 5.38 | 5.40 | +0.02 | 7 | 8 | 2 | 5 |
| S07 | 4.86 | 4.88 | +0.02 | 7 | **16** | 3 | 2 |
| S14 | 4.50 | 4.50 | 0 | 10 | 11 | 0 | 2 |
| S17 | 5.08 | 5.06 | −0.02 | 5 | **6** | 3 | 3 |
| S19 | 4.50 | 4.50 | 0 | 11 | **6** | 12 | 12 |
| S23 | 6.00 | 6.00 | 0 | 10 | **13** | 2 | 2 |
| S24 | 4.75 | 4.80 | +0.05 | 6 | 7 | 8 | 8 |
| S26 | 4.71 | 4.71 | 0 | 6 | 7 | 2 | 2 |

### 3.1 字号判据是真的在判，而且模型确实照做了

九案 `headBodyRatio` 全部在 ±1.1% 以内。这不是巧合 —— 提示词里那条
「最大标题要压到正文的 N 倍」是**可执行的数字指令**，模型照做了。
**这是提示词有效的最硬证据**，比任何「盲测得分 7/7」都可靠，因为它逐案可比。

### 3.2 图片数偏差两个方向都有，而现判据只判 `>0`

- 少用：S03 12→9、S19 11→6（少了 5 个）
- 多用：S07 7→16（多一倍多）、S23 10→13、S17 5→6

`compare.mjs:126` 的 `got.imgVisible > 0` 对这两种**都判 PASS**。
按 `minItems`/`minPics` 该判的是「够不够」（S03 的 9 < 12 ⇒ 应 FAIL），
而「过多」是否该判取决于产品语义 —— 这条要 A1 给个明确答案，不能默认放过。

### 3.3 栏数偏差集中在「模型用了更少栏」

S03 3→2、S07 3→2、S06 2→5、S14 0→2。前两个是塌成两栏，S06 反而拆得更碎。
S17/S19/S23/S24/S26 栏数吻合。
但注意 S14 原型是 0（真无分栏），生成物 2 —— 这说明**模型给一个「刻意不分栏」的设计加了分栏**，
这是真偏差，而旧判据 `ok:true` 把它盖住了。

---

## 四、本轮我自己修掉的东西（已提交 commit 7d87923）

| 缺陷 | 后果 | 状态 |
|---|---|---|
| 静态服务站点根 = HTML 目录 | `../_fonts/` 全 404，字体**静默回退**成系统字体，字号字距全错 | 已修 |
| CLI 入口 `argv[1].endsWith('measure.mjs')` | 任何以 measure.mjs 结尾的脚本 import 时误触发 CLI，多跑一次 | 已修 |
| favicon 404 | `Page.navigate` 被任一失败子资源触发 → `goto()` 抛 → 整页测量异常 | 已修 |

第二条值得单独记：它的**症状**是「同一个函数打印两次 `[nav]`，一次路径对一次路径错」。
如果只看最终数字，这个 bug 会表现为「有时测的是别的案子」，而且不会报错。

---

## 五、提示词可区分度（生成侧前置检查）

脚本 `_probe/_prompt-distinct.mjs`。方法：把每案 `dna` 拍平成 9 个特征
（palette/display/body/mono/radius/shadow/lineWidths/h1Size/bodySize），
逐案归一化后算两两 Jaccard 相似度。

```
案数 35，两两组合 595
相似度 中位 0.125  P90 0.214  max 0.778
机制句去重：35 / 35（全部不同）
```

**整体区分度是好的**：中位 0.125 意味着任意两案的 DNA 特征只有 1/8 重合。
真正承载风格的「机制句」35/35 全不相同。

但有一处需要生成侧注意：

```
最相似的对：S32~S33 0.778
其余高相似对：S31~S32/S33/S34/S35 都是 0.455，S01~S20 0.385
```

按 `display|body|radius|shadow|lineWidths` 五维骨架分组，全库 35 案只有 **2 个重复簇**：

```
[S31, S34]  n=2
[S32, S33]  n=2
```

其余 31 个骨架唯一。也就是说：**S31–S35 这批 Q2 新建案里，
S32 与 S33 除配色外骨架完全相同，S31 与 S34 同理**。实测：

```
S31  Jost / Noto Serif SC  全直角  无阴影  1px       h1 clamp(38px,8.6vw,104px)
S32  Jost / Noto Serif SC  全直角  无阴影  1px、2px   h1 clamp(36px,8.6vw,100px)
S33  Jost / Noto Serif SC  全直角  无阴影  1px、2px   h1 clamp(36px,8.6vw,100px)
S34  （与 S31 同骨架）
```

**对产品不是缺陷**（它们视觉上确实不同，配色是设计的主体）；
**对盲测是问题**：如果抽样同时抽中 S32 和 S33，等于用一个案子测两遍，
会虚高「提示词可复刻性」。抽样方案必须**每个骨架簇最多选一案**。

---

## 六、两套度量器的「栏」不是同一个量（重要）

`probe.mjs`（写进 `report.json` 的 `metrics.structure`）与
`measure.mjs`（`compare.mjs` 用的）是**两套独立实现**。
补齐 structure 的过程中我做了交叉验证，结论是：**它们数的不是同一个东西。**

### 6.1 一致的：S01

```
measure.mjs   gridTracks=4  gridSel=div.columns  borderWidths=[1,3]
probe.mjs     columns=4     columnsFrom=div.columns  lineWidths=[1,3]
```

两套实现互相印证，这一案可以当基准。

### 6.2 不一致的：S02 与 S17

```
S02  CSS  .salon-grid { grid-template-columns: 1fr 2px 1fr }
     measure.mjs  3 轨（含 2px 中缝）
     probe.mjs    2 栏（剔掉中缝，只数内容栏）

S17  CSS  .sheet { grid-template-columns: minmax(210px,3fr) 16px 9fr }
     measure.mjs  3 轨  div.sheet      ← 选对了
     probe.mjs    3 栏  div.foot-grid  ← 选错了容器
```

### 6.3 两个独立的问题

**问题一：同一个词，两种口径。**
`columns` 到底是「轨道数」还是「内容栏数」？S02 上 measure 说 3、probe 说 2，
两个都对，因为它们数的是不同的东西：

- 轨道数（measure）：包含中缝/铅条，S02=3、S17=3、S01=4
- 内容栏数（probe）：剔除窄轨，S02=2、S17=2、S01=4

**验货时绝不能混用。** 一个用 measure 量原型、用 probe 量生成物，
S02 会得到 3 vs 2 的假失败（或反过来假通过）。

**问题二：probe.mjs 在 S17 上选错了容器。**
它选了 `div.foot-grid`（页脚，`repeat(auto-fit, minmax(250px,1fr))`），
而真版心是 `div.sheet`（`minmax(210px,3fr) 16px 9fr`）。
巧合的是两者都报 3，**数字对但对象错** —— 这正是本仓库最危险的那类缺陷：
看起来完全正常，实际量的不是该量的东西。

### 6.4 对 A2/A3 的约束

1. 两套实现必须**统一口径**，或者各自显式标注数的是轨道还是内容栏。
   建议：`structure.columns` 明确成「内容栏数」，另加 `structure.tracks` 记轨道数。
2. `probe.mjs` 的主容器选择逻辑需要按 `measure.mjs` 那套（括号感知切分 + 剔窄轨
   + 排除画廊 + 按文字量选）重写，否则 S17 这种会继续选错。
3. **验收时不能只看数字相等**，必须同时比 `columnsFrom` / `gridSel` 是不是同一个容器。
   S17 就是「数字相等但容器不同」的活样本。

---

## 七、这些发现对 PLAN 的约束



1. `layoutKind` 必须**逐容器**判（§二），照文件级判法 S17 会被错标。
2. `mainRatio` 为空时必须**报错或显式降级**，不能像 `compare.mjs:74` 那样静默跳过判 PASS（§1.1）。
3. `gridTracks=0` 有两种含义，必须用 `layoutKind` 或额外字段区分（§1.2）。
4. 图片判据要给出「少了」与「多了」各自的处置（§3.2）。
5. 字号判据已被实测证明有效（§3.1），**不要动它**，更不要为了「让判据能失败」而把一条
   真的在判的判据改坏 —— 这是 A1 最需要避免的失败模式。
6. 抽样必须**每个骨架簇最多一案**（§五），否则 S32/S33 这类会用同一案测两遍。


---

## 八、每个可度量在提示词里的指令覆盖率（决定性数据）

脚本 `_probe/_instruct-coverage.mjs`，扫描 `blind/*/task.txt` 全 35 份提示词，
逐量检查「有没有一条能让模型执行的明确指令」。

```
案    字节     栏数   字号比   线宽   配色   图片数
S01  2214     有      有      有     有      无
S02  2130     无      有      有     有      无
S04  2054     有      有      有     有      无
S07  2154     有      有      有     有      无
...（35 行）
```

### 覆盖率汇总

| 可度量 | 有指令的案数 | 结论 |
|---|---|---|
| 字号比 | **35 / 35** | ✅ 可以判 |
| 线宽 | **35 / 35** | ✅ 可以判 |
| 配色 | **35 / 35** | ✅ 可以判 |
| 栏数 | **12 / 35** | ⚠️ 只能在这 12 案判 |
| 图片数 | **0 / 35** | ❌ **不该存在这条判据** |

### 8.1 这解决了 compare.mjs 那条注释提出的问题

`compare.mjs:5-7` 写着：

> FAIL 时要能回答「是提示词没写清楚，还是模型没听话」。
> 做法：先看该量在提示词里有没有一句明确的指令。

原实现靠 `/字号|字阶|font-size|标题/i.test(prompt)` 这种粗判 ——
而「标题」这个词在 `risk` 字段里也会出现（例如 S31 的
「最大标题要压到正文的 6.5 倍」里就有），于是它把「文案里提到标题」
误判成「有字号指令」。现在这个表给了**逐案可查**的答案，
不再需要靠正则猜。

### 8.2 最尖锐的一条：图片数 0/35

`compare.mjs:126`：

```js
const picOk = got.imgVisible > 0 || want.imgVisible === 0;
add('图片位可用', picOk, ...);
```

**提示词从来不给图片数量。** 35/35 份都没有。它给的是
「这个版式的设计规模是 N 个服务格」，那是**条目数**，不是图片数。

所以：

- 拿 `minPics` 判产物（我早先建议 A1 这么做）是**错的** ——
  那是在要求模型复刻一条它从未收到的指令。
- 现判据 `> 0` 虽然松，但它**至少没有误判**。
- 真正的缺陷不是「判得太松」，而是「这条判据没有对应任何提示词指令，
  它的结果无论 PASS 还是 FAIL 都不能归因」。

**结论**：这条判据应该**降级为 INFO**，或者从提示词侧先补上图片数量指令、
再让它变回判据。二选一，不能维持现状假装它在判。

### 8.3 栏数 12/35 与 §五 的实测闭环

S31 在 35 份提示词里「栏」字出现 **0 次**（实测 `grep -c '栏' blind/S31/task.txt` → 0），
而我用它做盲测时产物栏数 3 vs 原型 4。按这张表，S31 属于那 23 个「无栏数指令」的案子，
**差 1 栏不是模型的问题**。

S07 则「栏」出现 2 次（「正页 2 栏、背页 3 栏（两页宽度比 5:7）」），
它属于那 12 个「有指令」的案子，**栏数可以判**。

这就是判据该怎么分情况：不是按 `layoutKind`（那是 CSS 层的属性），
而是**按提示词里有没有这条指令**（那是契约层的属性）。
两者相关但不重合 —— S07 是 `auto-fit` 却明确写了栏数，
S31 也是 `auto-fit` 却没写。

---

## 九、全库 35 案 structure 审计：**13 案选错了主容器**（37%）

structure 补齐完成后（35/35 全覆盖），我用 `_probe/_structure-quality.mjs` 审计了
「选中的容器是不是版心」这个质量维度。判据：容器名是否像页头/页脚/导航。

### 9.1 结果

**13/35 案主容器是页头、页脚或导航**：

```
S09  cols=3  div.foot-grid
S10  cols=4  div.foot
S14  cols=3  div.foot-grid
S16  cols=3  div.foot-grid
S17  cols=3  div.foot-grid
S19  cols=3  div.foot-grid
S20  cols=2  header.masthead
S23  cols=2  header.masthead
S25  cols=4  div.colophon-foot__cols
S26  cols=3  div.foot__grid
S33  cols=3  footer
S34  cols=3  footer
S35  cols=3  footer
```

**这不是个案，是系统性缺陷。** 而且它不影响「有没有 structure」这个覆盖率指标 ——
35/35 全都有值，每个值都是合法整数。只有把容器名一起看，才发现它量的不是版心。

这正是本仓库最危险的那类缺陷：**数字对但对象错**。

### 9.2 measure.mjs 在同样的 13 案上全部选对

脚本 `_probe/_cross-measure-13.mjs`，用 `measure.mjs` 重量这 13 案：

| 案 | probe（错） | 栏 | measure（对） | 栏 |
|---|---|---|---|---|
| S09 | `div.foot-grid` | 3 | `ul#rows.rows` | 3 |
| S10 | `div.foot` | 4 | `div.notes` | 5 |
| S14 | `div.foot-grid` | 3 | （空） | 0 |
| S16 | `div.foot-grid` | 3 | （空） | 0 |
| S17 | `div.foot-grid` | 3 | `div.sheet` | 3 |
| S19 | `div.foot-grid` | 3 | `div.rowwrap>ul` | 12 |
| S20 | `header.masthead` | 2 | `div.plot` | 3 |
| S23 | `header.masthead` | 2 | `div.degrade-grid` | 2 |
| S25 | `div.colophon-foot__cols` | 4 | `section#contents.contents` | 2 |
| S26 | `div.foot__grid` | 3 | `div.two.two--f` | 2 |
| S33 | `footer` | 3 | `ul.rows>li` | 3 |
| S34 | `footer` | 3 | （空） | 0 |
| S35 | `footer` | 3 | `ul.note-list>li` | 2 |

**13/13 全部修正。** 其中 S14/S16/S34 返回空是正确的 —— 它们是 `no-column-layout`，
「正确地不选」就是选对了。

### 9.3 结论

`measure.mjs` 的判据组合在全部 13 个失败案例上都选对了：

1. 括号感知切分（`minmax(0, 1fr)` 内部有空格，`split(/\s+/)` 会切碎）
2. 剔窄轨（<32px），但**成组出现才剔**（单条留作中缝）
3. **排除页头/页脚/导航** ← probe.mjs 缺的就是这条
4. 排除图片画廊
5. 按**容器文字量**排序（不是面积）

`probe.mjs` 缺的主要是第 3 条。修 probe 应该搬这套判据，不要另调。

### 9.4 为什么这条比「补齐 30 案」更重要

补齐是量变：从 5/35 变成 35/35 有值。
选错容器是质变：**值有了，但量的不是该量的东西。**

如果把选错的 13 案直接拿去当验货基准，会出现两种假结论：
- 原型页脚 3 栏 vs 生成物版心 2 栏 ⇒ 假失败
- 原型页脚 3 栏 vs 生成物页脚 3 栏 ⇒ 假通过（两个都没在做版心）

而且因为数字都合法，没有任何闸门会报错。

---

## 十、probe.mjs 画廊判据误杀真版心（S17 的精确根因）

§九 说 13 案选错容器。我追到了 S17 的**精确根因**，它和其余 12 案不同，
是一个独立缺陷。

### 10.1 实测

在真浏览器里量 S17 的 `.sheet`（脚本 `_probe/_s17-sheet.mjs`）：

```json
{
 "display": "grid",
 "gtc": "334px 16px 1002px",     ← 真版心，3 轨（含 16px 中缝）
 "trackCount": 3,
 "kids": 3,
 "kidsTag": ["ASIDE.stub-cell", "DIV.perf", "DIV.main-cell"],
 "withImg": 2,                    ← 两个子元素含图
 "wouldBeGallery": true,          ← 被判成画廊
 "ownTextLen": 937                ← 但它有 937 字正文
}
```

### 10.2 判据冲突

`probe.mjs:269` 的画廊判据：

```js
const kids = [...el.children];
if (kids.length >= 3) {
  const withImg = kids.filter((k) => k.querySelector('img, picture, svg, canvas')).length;
  if (withImg >= kids.length / 2) tracks = 0;   // 判为画廊
}
```

S17 的 `.sheet`：`kids.length = 3`、`withImg = 2`、`2 >= 3/2 = 1.5` ⇒ **判为画廊，tracks = 0**。

于是真版心被丢弃，最后只能从页脚 `div.foot-grid` 里取 3 栏当页面栏数。

### 10.3 为什么这条判据本身是错的

它的假设是「重复单元且每个都装图片 ⇒ 网格画廊」。但 S17 的 `.sheet` 是：

- `ASIDE.stub-cell`（存根联，含图）
- `DIV.perf`（齿孔线，纯装饰）
- `DIV.main-cell`（主联，含图）

三个子元素是**功能不同的三个区**，不是重复单元。判据把「多个子元素且过半含图」
当成了「重复单元」，这是量纲错配。

`measure.mjs` 没有误杀它，因为它的判据更严：它**不把 `svg` 算作图片**
（很多案用 SVG 画装饰），而且最后按**容器文字量**排序 —— 937 字足以让它排在页脚之前。

### 10.4 这条与 §九 的关系

§九 的 13 案里，其余 12 案是「页脚字比版心多」导致选错（`probe.mjs` 已用
`layoutKind` 把它隔离掉，并记 `columnsInLandmark` 暴露出来）。

S17 是另一回事：**真版心连候选都没进**。`layoutKind` 因此判成
`no-column-layout`（`layoutKindSelector: null`），而事实是它有一个明确的
固定三轨版心 `minmax(210px,3fr) 16px 9fr`。

### 10.5 正确的修法

把画廊判据从「子元素过半含图」改成与 `measure.mjs` 一致的两条：

1. **不把 `svg` 算作图片**（S17/S20/S33 这类案用 SVG 画装饰线）
2. **加文字量下限**：容器内文字量 < 某个阈值才可能是画廊。
   S17 的 `.sheet` 有 937 字，任何正文容器都不会只有几十字。

改动很小，但需要重跑 35 案验证不能打坏别的案子。
我把这条写进 PLAN 的待办，不在本轮直接动 `probe.mjs`（那是 vendored 采集器，
改完必须全库重渲染 + 逐案核对，应当并入 structure 补齐那一轮一起做）。
