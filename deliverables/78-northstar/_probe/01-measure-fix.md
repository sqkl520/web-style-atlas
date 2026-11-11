# 01 · 度量器「选哪个 grid 容器」判据修复

**对象**：`deliverables/74-q7/measure.mjs` 的 ① 主体栏数 / ② 主轴比例
**口径**：1440×900，静态服务器 + `prototypes/_build/vendor/cdp.mjs` 的 `Browser`
**日期**：2026-11

---

## 一句话结论

旧判据「2–4 轨 + 面积最大」测的是**轨道数**，而验货要的是**栏数**；两者在本仓库
至少 8 个案上背离。换成「括号感知切分 → 剔栏沟 → 排除图片格 → 按文字量取主容器」后：

- 6 个有明确 CSS 真值的案，**6 个全部对上**（S01 / S07 / S17 / S33 / S09 / S28）
- 35 案批量回归，**没有一条抛异常**，除 ①② 外**所有字段逐字节不变**
- 6 个目标案各量 3 次，**结果完全一致**（旧判据的原始毛病就是同页面两次测量选不同元素）

---

## 一、逐案对账（修复前 / 修复后 / CSS 真值）

| 案 | 修复前 | 修复后 | CSS 真值 | 对上？ | 真值出处 |
|---|---|---|---|---|---|
| **S01** | **2** 轨 · `DIV.plate-grid` | **4** 轨 · `div.columns` | 4 栏 | ✓ | `prototypes/S01-red-wedge-broadsheet/style.css:195` `grid-template-columns: 5fr var(--bar) 4fr var(--bar) 4fr var(--bar) 3fr`；`--bar: 24px` 在同文件 `:26` |
| **S07** | 3 轨 · `DIV.pages` | **3** 轨 · `div.pages` | 2 或 3（有争议，见下） | ✓（落在给定区间） | `style.css:74` `.pages{5fr 1px 7fr}`；`:81` `.page-recto .toc{column-count:2}`；`:82` `.page-verso .toc{column-count:3}` |
| **S17** | 3 轨 · `DIV.sheet` | **3** 轨 · `div.sheet` | 3 轨 | ✓ | `prototypes/S17-revenue-stamp-stub/style.css:134` `grid-template-columns: minmax(210px, 3fr) 16px 9fr` |
| **S33** | 3 轨 · `LI.row w3 is-in`（**选错元素**） | **3** 轨 · `ul.rows>li` | 3 轨 | ✓ | `prototypes/S33-teal-mirror-ledger/style.css:112` `.row{grid-template-columns: 1fr 1px 1fr}`；`.rows` 本身是 block（`:103`），版心在 9 个 `li.row` 上 |
| **S09** | 3 轨 · `DIV.plate-grid`（**选错元素**） | **3** 栏 · `ul#rows.rows` | 3 栏 | ✓ | `prototypes/S09-batik-price-board/style.css:276` `.rows{column-count: 3; column-gap: 40px}` |
| **S28** | **2** 轨 · `UL.frozen` | **16** 轨 · `div.press__grid` | 16 栏 | ✓ | `prototypes/S28-jazz-intaglio-wall/style.css:369` `grid-template-columns: repeat(16, minmax(0, 1fr))`；规格原文「基础 16 栏」 |

复现：

```
node deliverables/74-q7/measure.mjs --debug prototypes/S01-red-wedge-broadsheet/index.html
```

### 修复前为什么会错（三类的机制不同）

1. **S01：栏沟是独立轨道。** `.columns` 求值后是 **7 条轨道** —— 4 条正文栏 + 3 条 24px 实体铅条。
   `tracks > 4` 把它整条排除，度量器退而选中 `.plate-grid`（图片格）：
   它 2 轨、面积 3 922 613，比版心大。**报出来的「2 轨」是一个完全合法的数字**，
   这正是最危险的地方 —— 光看数字看不出错了。
2. **S33 / S09：量到了「一行」而不是「版心」。** S33 报的 3 轨本身没错，错在元素：
   `LI.row` 是镜像版式的一行。S09 选中图片格，而它真值的 3 栏在
   `.rows{column-count:3}` 上 —— 旧判据**根本不看 column-count 容器**。
3. **S28：卡片网格压过版心。** `UL.frozen`（2 轨「已冻结」清单）面积大于 16 栏拼贴栅格。

---

## 二、新判据

### 2.1 六条规则

前四条照搬 `prototypes/_build/vendor/probe.mjs` 的 `metrics.structure`
（`probe.mjs:108-201`），那一套已在 30 个原型上跑过：

1. **括号感知切分** —— `minmax(0, 1fr)` 内部有空格，按空白硬切会把它切碎。
2. **剔掉窄轨道当栏沟**，但只在它**反复出现**时剔（见 2.2）。
3. **排除图片网格**：子元素过半带图 **且** 每子平均不到 120 字。
4. **按容器文字量排序取第一** —— 不是面积最大。

后两条是这次新增的，`probe.mjs` 没有（它要的是「这一页最多几栏」，
我要的是「版心几栏」）：

5. **排除页头 / 页脚 / 侧栏里的候选**（含元素**自身**是 `footer` 的情况）。
6. **同构兄弟聚组** —— S33 的版心是 9 个 `li.row`，不是一个包裹容器。

### 2.2 「接缝 vs 栏沟」：本次最关键的一条，也是踩得最深的一处

把宽度 < 32px 的轨道**一律**剔掉（`probe.mjs` 的写法），会让 S17 和 S33 各少一栏：

| 案 | 声明 | 窄轨道是什么 | 规格原文 | 剔掉后 | 真值 |
|---|---|---|---|---|---|
| S01 | `5fr 24px 4fr 24px 4fr 24px 3fr` | **3 条** 24px 铅条 | 「四栏」「栏沟 24px 为铅条空隙」 | 4 | 4 ✓ |
| S17 | `minmax(210px,3fr) 16px 9fr` | **1 条** 16px 齿孔线 | 「两联之间是齿孔线而不是边框」 | 2 ✗ | 3 |
| S33 | `1fr 1px 1fr` | **1 条** 1px `.row-tick` | 「每一行是 … `<左> 1px <右>`」 | 2 ✗ | 3 |

区别是可判的：**栏沟成组出现**（每两栏之间一条，S01 是 3 条）；
**接缝只有一条**，把版心切成两个不对称的联。所以规则是：

> 窄轨道 **≥ 2 条** ⇒ 当栏沟剔掉；只 **1 条** ⇒ 留着，它是接缝。

⇒ S01 = 4、S17 = 3、S33 = 3 同时成立。

**已知代价（必须写清楚）**：一个真实的两栏版心若写成 `1fr 24px 1fr`（两栏之间只有
一条实体栏沟），会被数成 3 轨。本仓库 30 案里没有这种写法（S01 是唯一用实体铅条的，
它有 3 条；其余都走 `column-gap`），但**拿它去量别人的产物就会撞上**。
这是本判据最大的已知假阳性，不藏着。

### 2.3 图片判据：不数 `svg`

`probe.mjs` 的口径是 `img, picture, svg, canvas`。照搬到 Q7 会**误杀 S09 的版心**：

- S09 的 `.row` 里，价格下划线是 118×44 的 `svg.trace`
  （`prototypes/S09-batik-price-board/index.html` 里每个 `<li class="row">` 都带一个）。
  按「svg 也算图」，`.rows` 的 10 个子元素全是「带图」，直接判成画廊。
- S17 的齿孔线也是 svg（`div.perf`）。

改成只认 `img, picture, canvas, video`。同时保留「每子平均字数」这一条 ——
S17 的 `.sheet` 3 个子元素里 2 个含 svg，但它承载 937 字正文、真值 3 轨。

### 2.4 同构兄弟聚组：必须排除「页面区块序列」

聚组第一版把 S03 打坏了：`.wrap > div` 有 3 个同构兄弟、合计 **926 字**，
比真值容器 `.chrono`（579 字）还多，于是抢走了 PICK。

但那 3 个 div 是**三个板块**（各自带 h2），不是一个版心的三**行**。判据：

> **组内任一成员自带 h1–h6 就不聚组。**

实测分布（`_diag-groupsem.mjs`）：

| 案 | 组 | 成员带标题 | 处置 |
|---|---|---|---|
| S33 | `ul.rows > li` × 8 | 0/8 | 聚组 ✓ |
| S03 | `div.wrap > div` × 3 | 1/3 | 不聚组 ✓ |
| S28 | `div.wrap > div` × 7 | 7/7 | 不聚组 ✓ |

---

## 三、`--debug` 自检

`measure.mjs` 现在会把候选表摊开（按文字量降序，前 24 个），每个候选给：
`rawTracks` / `cols` / `gutters` / `chars` / `kids` / `imgKids` / `imgShare` / `avgKid` / `verdict`。

`cols` 是**计作栏的轨道数**（不是「宽轨道数」）：S17 的 16px 接缝宽度不足 32px，
但它算一栏，真值 3 轨 = 334 + 16 + 1002。

`verdict` 的取值就是「为什么没选它」：`gallery`、`landmark:footer`、`cols<2`、
`text<40`、`ok-not-max`，被选中的是 `PICK`。

S01 的实跑输出（这是「下一个人能看见它为什么选了那个元素」的样子）：

```
轨道判据自检（按文字量降序，前 24 个候选）
  verdict          raw cols gutter  chars  kids img  share avgKid  sel
  ★ PICK             7    4      3   1451     7   0      0    207  div.columns
    gallery          2    2      0    257     6   6      1     43  div.plate-grid
    landmark:footer   3    3      0    195     3   0      0     65  div.foot-grid
    text<40          1    1      0      0     1   0      0      0  div.slug-slot

选中：div.columns
  gridTracks=4  gridFrom=grid  mainRatio=[0.312,0.25,0.25,0.188]  maxColCount=1
```

一眼能看出：`.columns` 的 `raw=7` 被剔掉 3 条栏沟后是 `cols=4`，
而修复前被选中的 `.plate-grid` 现在明确标着 `gallery`。

不加 `--debug` 时 `gridCandidates` 字段被剥掉，**输出与旧版逐字节可比**（见下）。

---

## 四、回归与稳定性

### 4.1 其余字段零回归

脚本 `_probe-diff.mjs` 对比修复前后 6 案的**全部**字段，只跳过
`gridTracks` / `gridSel` / `mainRatio` / `maxColCount` / `gridCandidates`：

```
其余字段全部逐字节相同 ✓
```

`hexes` / `borderWidths` / `svgStrokeWidths` / `imgCount` / `imgVisible` /
`headBodyRatio` / `pageHeight` 一个数都没动。

### 4.2 稳定性（旧判据的原始毛病）

6 个目标案各量 3 次：

```
S01  稳定 ✓  4|div.columns|0.312,0.25,0.25,0.188
S07  稳定 ✓  3|div.pages|0.416,0.001,0.583
S17  稳定 ✓  3|div.sheet|0.247,0.012,0.741
S33  稳定 ✓  3|ul.rows>li|0.5,0.001,0.5
S09  稳定 ✓  3|ul#rows.rows|
S28  稳定 ✓  16|div.press__grid|0.063 ×16
```

### 4.3 35 案全量

栏数分布：`{0:3, 2:8, 3:9, 4:5, 5:1, 8:1, 9:1, 12:4, 13:1, 16:2}`。
三个 0 是 S14 / S16 / S34 —— 见第五节第 3 条，那是**正确结果**不是失败。

前后对照（脚本 `_probe-compare-all.mjs`，旧判据取出 git HEAD 版本）：

| 案 | 前 | 后 | 案 | 前 | 后 |
|---|---|---|---|---|---|
| S01 | 2 | **4** | S20 | 4 | **3** |
| S08 | 2 | **4** | S21 | 2 | **3** |
| S09 | 3(图格) | 3(版心) | S22 | 2 | **13** |
| S10 | 4 | **5** | S23 | 2 | 2 |
| S11 | 2 | **12** | S24 | 2 | **8** |
| S13 | 2 | **16** | S27 | 0 | **9** |
| S14 | 4 | **0** | S28 | 2 | **16** |
| S15 | 4 | **12** | S29 | 2 | 2 |
| S16 | 2 | **0** | S30 | 2 | **12** |
| S19 | 3 | **12** | S33 | 3(一行) | 3(版心) |
| S17 | 3 | 3 | S18 | 3 | 3 |

（未列出的案前后数字相同。）

变动的每一个都对着 CSS 核过，全部是**旧值量错了**：

| 案 | 真值出处 | 新值 |
|---|---|---|
| S10 | `style.css:151` `grid-template-columns: 6fr 7fr 9fr 8fr 5fr` | 5 ✓ |
| S11 | `style.css:282` `.chapter-grid{repeat(12, minmax(0,1fr))}` | 12 ✓ |
| S13 | `style.css:184` `.dossier{repeat(16, minmax(0,1fr))}` | 16 ✓ |
| S15 | `style.css:155` `.atlas__grid{repeat(12, 1fr)}` | 12 ✓ |
| S19 | `style.css:278` `.xg{repeat(12, 1fr)}` | 12 ✓ |
| S20 | `style.css:162` `.plot{minmax(0,1fr) 1px 324px}` | 3 ✓ |
| S21 | `style.css:300` `.figs--three{repeat(3,minmax(0,1fr))}` | 3 ✓ |
| S22 | `style.css:243` `.sheet{repeat(6,1fr) var(--fold-track) repeat(6,1fr)}` | 13 ✓ |
| S24 | `style.css:130` `.fork__grid{repeat(8,1fr)}` | 8 ✓ |
| S27 | `style.css:90` `.grid9{repeat(9, minmax(0,1fr))}` | 9 ✓ |
| S28 | `style.css:369` `.press__grid{repeat(16, minmax(0,1fr))}` | 16 ✓ |
| S30 | `style.css:185` / `:299` `repeat(12, 1fr)` | 12 ✓ |
| S08 | `style.css:241` `.states{repeat(auto-fit, minmax(250px,1fr))}` → 1440 展开 4 轨 | 4 |

⚠️ **这些是按 CSS 结构性核对的，不是逐案人工判定过的**。S08 / S20 / S21 / S22 这几个
是本轮新选中的元素，我核的是「它的声明确实是 4 / 3 / 3 / 13 轨」，
**没有再逐案判它是不是这一页最该量作『版心』的那个容器**。要拿去当验货基准前，
这 4 案值得再人工看一眼。

### 4.4 顺手修的一个随机失败

`measure()` 里 `server.listen(0)` 偶尔会分到浏览器黑名单端口，Chrome 直接拒绝导航并抛
`net::ERR_UNSAFE_PORT` —— 批量回归里大约每 30 次撞一次，表现为随机红。
已改为「撞黑名单就换端口重试」（`BAD_PORTS` 集合 + 最多 40 次）。
这不是 ①② 判据的问题，但它会让**所有**度量随机失败，所以一并修了。

---

## 五、真值本身有争议 / 判据的已知边界

### 1. S07：规格里有两个「栏数」，判据选了 3

规格原文（`_selection/data.js` S07 的 `layout`）：
「跨页版心两页宽度比 5:7（`.pages` 为 `grid-template-columns:5fr 1px 7fr`，1px 是中缝实线），
**正页 2 栏、背页 3 栏**（`.toc` 的 `column-count`）」。

同一页上有三个都能自称「栏数」的数：

| 口径 | 值 | 依据 |
|---|---|---|
| 版心横向分成几联 | **3** | `style.css:74`，2 联 + 1 条中缝 |
| 正页几栏 | **2** | `style.css:81` `column-count: 2` |
| 背页几栏 | **3** | `style.css:82` `column-count: 3` |

新判据给出的是**第一个**（3），因为按文字量排序 `.pages`（1574 字）稳居第一。
任务里给的接受区间是「2 或 3」，落在里面；但**这三个数不是一回事**，
拿它当验货基准时得说清楚在比哪一个。我**没有**去硬凑 2。

### 2. 一个已知的假阳性（不是这 6 案）

`1fr 24px 1fr` 这种「两栏 + 一条实体栏沟」会被数成 3 轨。见 2.2 末段。
本仓库 30 案没有这种写法。

### 3. 三个 0 分之案：S14 / S16 / S34 —— 0 是正确的，但 0 有歧义

| 案 | 规格原文 | 结论 |
|---|---|---|
| S14 | 「**不使用固定栏数**，改用质心极坐标」 | 无分栏版心 |
| S16 | 「**不使用正交栏**，改用 12° 斜向基线系统」 | 无分栏版心 |
| S34 | 七块缩进序列（0/3/5.5/2/7/4/1%），无分栏 | 无分栏版心 |

「0 = 这一页没有分栏概念」与「0 = 根本没测到」在验货里语义完全不同
（`prototypes/_build/vendor/probe.mjs:190-201` 也专门为这个坑写过注释）。所以新增了 `gridFrom` 字段：

- `grid` / `column` / `group` —— 选中了某个容器，以及它靠什么判出来的
- `no-column-layout` —— 页面**有**候选，但没一个够格 ⇒ 真的没有分栏版心
- `nothing-measured` —— 一个候选都没扫到 ⇒ 度量失败

S14 / S16 / S34 都是 `no-column-layout`。

### 4. 本轮**没有**解决的残留：卡片/图版网格仍可能压过版心

全库 35 案里，仍有若干案选中的是「带图版的网格」而不是「连续正文的版心」。
已确认的：

| 案 | 选中 | 实际声明的版心 | 说明 |
|---|---|---|---|
| S21 | `div.figs.figs--three`（3 图版，533 字） | `.board__grid`（10 栏，262 字） | 图版组字数更多，压过版心 |
| S23 | `div.degrade-grid`（2 轨，272 字） | `.wall`（36 栏 + 96px 索引栏，900 字） | 36 栏每轨 **27.56px**（`style.css:151`，`repeat(36, minmax(0,1fr)) 96px`）< 32px 门槛，**全部被判成栏沟**，于是 `cols=1` → `cols<2` 出局 |
| S11 | `div.chapter-grid`（12 轨） | 同 | 12 轨每轨 **86px**（`style.css:282`）。是「12 栏细栅格」而非 12 栏正文；但规格原文确实写「12 栏」，两种读法都成立 |
| S08 | `div.states.panel`（4 轨） | `.material-row` 只有 1 轨；`.spec-grid` 是 `repeat(auto-fit, minmax(240px,1fr))` | 选了 4 个状态卡，不是版心；`spec-grid` 展开后 `616px 616px 0px 0px`，剔 2 条 0px 后 `cols=2` |

**为什么这轮不继续动**：再往下每一次收紧都会拿 6 个已核实的案去赌 ——
S17 的 `.plates` 必须被判画廊（而 S21 的 `.figs` 结构相似、带图 0.75，却该被选中），
S22 的 `.sheet`（13 轨）本该被选中而 `ul.plates`（12 图版）该被排除。
这条线**需要先定清楚「栏数」在产品里的语义**（是「正文栏」还是「栅格列数」），
不该由度量器自己猜。已如实记在这里，不硬凑。

补充一条**看起来像缺陷其实不是**的：S12 选中 `ul.states`（4 轨、339 字），
而 `ul.plates`（5 图版、548 字）被判 `gallery` 排除。但 S12 的规格原文是
「8 栏」，`style.css:197` 确有 `repeat(8, 1fr)` —— 那个 8 是**洞口栅格**，
不是正文栏。`ul.states` 的 4 轨来自 `repeat(auto-fit, minmax(272px,1fr))`
（`style.css:358`）在 1440 下的展开。这一案三种口径（8 栅格 / 5 图版 / 4 状态卡）
没有一个是「正文栏」，说明该案本身不以分栏为骨架。

### 5. 一个与本次无关但撞见的既有事实

`S13-blind-debossed-dispatch/style.css:184` 基线声明 `.dossier{repeat(16, minmax(0,1fr))}`，
`:705` 在 `@media (min-width:1024px) and (max-width:1439px)` 里改成
`repeat(12, minmax(0,1fr))`。1440 命中的是 **16**，所以本次实测 16 是对的。
**这不是缺陷** —— 写在这里只是提醒：抄这一案的规则时容易把两个数混起来。

---

## 六、改了哪些文件

| 文件 | 改动 |
|---|---|
| `deliverables/74-q7/measure.mjs` | 重写 ①②；新增 `--debug`、`gridFrom`、`gridCandidates`；修 `listen(0)` 撞黑名单端口 |
| `deliverables/78-northstar/_probe/01-measure-fix.md` | 本报告 |

**未改动** `prototypes/` 下任何文件，也**未改动** `prototypes/_build/vendor/probe.mjs`。

`deliverables/78-northstar/_probe/` 下新增的诊断脚本（可删，保留是为让下一个人能复跑
上述每一个数字）：

| 脚本 | 作用 |
|---|---|
| `_diag-grid.mjs` | 每个 grid 候选的 raw gtc / 切分结果 / 宽轨道数 / 文字量 / img 占比 |
| `_diag-groups.mjs` | column-count 容器 + 重复兄弟分组的文字量 |
| `_diag-probe-xcheck.mjs` | 与 `vendor/probe.mjs` 的 `probe().structure` 交叉对账 |
| `_diag-kids.mjs` | 单容器与分组的逐项指标（本轮所有阈值的来源） |
| `_diag-groupsem.mjs` | 分组内成员是否自带标题（2.4 那条判据的依据） |
| `_diag-homog.mjs` / `_diag-prose.mjs` / `_diag-gal.mjs` | 探索过的、**未被采用**的判据（同质度 / 正文占比 / 图片占比阈值），留着是为了下次不用重新试 |
| `_probe-baseline.mjs` / `_baseline.json` | 修复前全字段快照 |
| `_probe-after.mjs` / `_after.json` | 修复后全字段快照 + 6 案对账 |
| `_probe-diff.mjs` | 前后全字段 diff（证明零回归） |
| `_probe-all.mjs` | 35 案批量回归 |
| `_probe-compare-all.mjs` / `_old-measure.mjs` | 35 案前后对照（旧判据取自 git HEAD） |
| `_probe-stable.mjs` | 6 案 × 3 次稳定性 |

---

## 七、这次踩到的坑（供下一个人）

1. **模板字符串里的反引号会直接炸掉整个文件。** `pg.eval` 的整段代码是一个模板
   字符串，我在里面写注释时用了 Markdown 行内代码的反引号，`node --check` 报
   `SyntaxError: missing ) after argument list`，位置指向文件第 58 行（哪一行都不像）。
   **本轮踩了 3 次**（其中一次是给 `footer` 加反引号）。教训：长的理由写在模板字符串
   **外面**，里面只留一两行指针。文件顶部已写警告。
2. **不要用 `sed`/正则批量改文件里的注释。** 我想用 `sed 's/`/"/g'` 处理反引号，
   结果把 `\s` 也替换成了中文占位符，整个注释段变成
   「空白正则空白正则空白正则…」，只能 `git checkout` 重来。
   **要么手改，要么用 Write 整体重写。**
3. **`split(/\s+/)` 在 `node -e` 里会被 shell 吞掉反斜杠。** 所以本轮所有诊断脚本
   都用 Write 写成文件再跑；页面内的切分用 `charCode` 而不是正则。
4. **`server.listen(0)` 会随机分到浏览器黑名单端口。** 见 4.4。批量回归时表现为
   「跑一半随机红」，很容易被误读成判据不稳。
5. **`probe.mjs` 的结论不能直接照抄。** 它对 S17 给出 `columns: 3`、`columnsFrom:
   div.foot-grid`，对 S33 给出 `from: footer` —— **数字对、元素错**。它要的是
   「这一页最多几栏」，Q7 要的是「版心几栏」，两种问题共用一套切分但要不同的选择器。
   交叉对账时我把它当参考，没有当答案。
6. **「数字合法」≠「量对了」。** S01 修复前报 2 轨、S33 报 3 轨，两个数字都不荒谬。
   这就是为什么必须加 `--debug`：只有把候选集摊开，才看得出它量的是哪个元素。
