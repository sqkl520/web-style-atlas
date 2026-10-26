# 审计：hard 与 degrades 两套警告口径

> 审计 Agent。**只读，未改任何仓库文件。**所有数字均为本 Agent 在 `D:\Web\style` 亲手跑出。
> 核实时间 2026-10-26 18:10–19:15（Asia/Shanghai）。
>
> ⚠️ **行号时点说明（必读）**：核实时另有执行 Agent 并发改 `prototypes/_selection/`
> （HEAD 仍 `cea8436`）。审计期间 `prompt-copy.js` 从 474 行涨到 874 行、`prompts.js` 也被重写，
> 因此**涉及这两个文件的行号在审计过程中发生过位移**。
> 本文所有 `prompt-copy.js` 行号以**收尾时的工作树**为准（`hint` 块在 **411–413**，
> 审计开始时为 365–367，内容除下述一处外未变）；
> `app.js:214-228`（`capacityHTML`）、`build-prompts.mjs`、各案 `style.css`/`index.html`/`_specs`
> 行号经复核**未变**。
> 数据层结论（§0 的六行集合关系）在审计开始与收尾各复算一次，**两次完全相同**。

---

## 0. 复算：任务书给的六行数字全部成立

用 `node` 各自加载 `data.js` + `prompts.js` 比对（不经过任务书的转述）：

```
hardIds:   ["S03","S05","S10","S14","S15","S18","S20","S21","S29"]   (9)
degrades=yes: S02 S04 S05 S08 S12 S14 S15 S19 S20 S22 S23 S29 S30      (13)
重叠(5):      S05 S14 S15 S20 S29
hard 但 degrades=no(4):    S03 S10 S18 S21
degrades=yes 但无 hard(8): S02 S04 S08 S12 S19 S22 S23 S30
两者都没有(13): S01 S06 S07 S09 S11 S13 S16 S17 S24 S25 S26 S27 S28
```

复算脚本（只读，未落盘到仓库）：

```js
const ctx={window:{}};ctx.window.window=ctx.window;vm.createContext(ctx);
for(const f of ['data.js','prompts.js'])
  vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f});
const P=ctx.window.STYLE_PROMPTS;
const hard=new Set(P.hardIds);
const deg=new Set(P.schemes.filter(s=>s.capacity.degrades==='yes').map(s=>s.id));
```

**六行数字一字不差。** 但任务书漏了两个更要紧的事实，见 §1 与 §2。

> **并发编辑提示（审计收尾时观察到，供 lead 判断冲突）**：
> 审计期间 `prompts.js` 被重写（+303/−30 行）、`clean-dna.mjs` 与 `dna-clean.json` 也被改
> （19:07），`prompt-copy.js` 里 `hard` 提示语的文案已被改成指向「适用场景」段末。
> **数据层未变**：`hardIds` 仍是同样 9 个、`degrades` 仍是同样 13 个，
> 本文 §0 的六行集合关系在 18:15 与 19:12 两次复算结果完全相同。
> ⇒ 所有涉及**数据**的结论不受并发影响；涉及**行号与文案**的已按收尾时工作树更新。

### 0.1 补：`hard` 这个标记**不是**从 `_specs` 推出来的

`_specs/S0X.md` 字段 11（可落地要点）里有一句作者自己写的「最难被复用到别的品牌的地方」。
这是全套仓库里唯一一份**逐案、由原作者写的可移植性判断**。它和 `HARD_IDS` 的关系：

```
有该句的案:        21 / 30
其中在 HARD_IDS:   6   (S14 S15 S18 S20 S21 S29)
其中不在 HARD_IDS: 15  (S01 S11 S12 S13 S16 S17 S19 S22 S23 S24 S25 S26 S27 S28 S30)
HARD_IDS 里没有该句的: 3  (S03 S05 S10)
```

最刺眼的一条：`prototypes/_specs/S22.md:33` 原文写

> 最难被复用到别的品牌的地方：镜像关系必须绑定"同一篇文章的两面"，换品牌就得重写内容结构，无法只换 logo。

作者明说 S22 换内容就废，而 **S22 不在 `HARD_IDS` 里**（`degrades=yes`、`hard=false`）。
反过来 S03 / S05 / S10 在 `HARD_IDS` 里，`_specs` 里**一句这种判断都没有**
（`Select-String -Path prototypes\_specs\S03.md -Pattern '最难被复用'` → 0 命中）。

⇒ **`HARD_IDS` 与 `_specs` 是两条互不相关的来源。** 这解释了它为什么必然漂移。

### 0.2 补：`hard` 与「认知门槛」中等相关，与「内容量」几乎无关

```
门槛 低: 11 案，其中 hard 0 案
门槛 中: 12 案，其中 hard 4 案
门槛 高:  7 案，其中 hard 5 案
```

`hard` 有 0/11 落在「低门槛」案上 —— 它不是随机的。
但 `hard` 与 `degrades` 的重叠（5，期望 3.9，Fisher 双侧 p=0.44）**统计上不可区分于随机**。

---

## 1. 问题 1：`hard` 这个标注准不准？

**结论：作为「机制绑死在行业数据上」这个字面断言，9 案里只有 2 案站得住（S15、S29）；
4 案是「需要固定条数」被误写成「需要特定题材」；3 案是纯误标（S03、S05、S10 中的 S03/S05 无据，S10 理由用词错）。**

判据表（每条都给了文件·行·原文）：

| 案 | `hard` 断言是否成立 | 证据（文件:行） | 真实约束是什么 |
|---|---|---|---|
| **S15** | ✅ **成立** | `S15/index.html:139-152` 14×`<a class="hot">` 内嵌 `<rect class="edge" x="104" y="96" width="288" height="208"/>` —— 手绘绝对坐标，按舱室真实面积画 | 需要**空间数据**（平面图 + 登记表交叉对号）。普通内容造不出平面图 |
| **S29** | ✅ **成立** | `S29/style.css:216-219` 逐点 `.diag .pt:nth-of-type(8){--i:0}`…`(23)`；`index.html:209` 起 23×`g.pt` 路径为手绘坐标 | 需要**编号双射**（图上 07 号 = 表第 7 行）。这是数据结构，不是版面 |
| **S10** | ⚠️ 理由错，风险真 | `S10/style.css:151` `grid-template-columns: 6fr 7fr 9fr 8fr 5fr`；`:221-225` `col.c1{width:17.1429%}`…`col.c5{width:14.2857%}`；`index.html:126-133` 五列语义＝供应商/报价/到货周期/价格序/打样编号 | 需要**两组可对照的数据**（VERSUS 骨架）。不是「行业」，是「对照性」。`hard` 文案说「行业数据」→ 错 |
| **S18** | ⚠️ 成立，但 `degrades` 判错了 | `S18/style.css:163` `.stream__grid{grid-template-columns:12% 54% 34%}`；`:122` `.hangrail .hang{position:absolute;top:calc(var(--at,0)*var(--line)+var(--line)+2px)}` | 需要**≥20 行连续日志 + 对应回执**。`hard` 对；但见 §2，`degrades` 应为 `yes` |
| **S21** | ⚠️ 成立，但判据与审计自己的口径冲突 | `S21/index.html:234-247` 14×`li.lockbar` 带 `data-excl="9,12,13"` 硬编码互斥号；`:300-318` 角度表「本时段锁数 4/6/4 枚」；`:230` 静态文案「本时段登记 14 枚锁闭条」 | 需要**依赖图**（互斥对）。`hard` 对；但审计口径第 2 条把「JS 里硬编码的索引数组」列为 `yes` 依据 → S21 按自己的口径该判 `yes` |
| **S05** | ❌ 误标 | `S05/style.css:246-253` `.panel--main{grid-column:1/6;grid-row:1}`…`.panel--switch{grid-column:5/9;grid-row:3}` —— 8 块写死坐标 | 需要**8 个有优先级的单元**。任何 8 分区仪表盘都成立，与冷链无关。这是 `degrades`，不是 `hard` |
| **S14** | ❌ 误标 | `S14/index.html:70-160` 11 枚内联 `--dx/--dy/--ux/--uy/--i`；`style.css:170` `translate(calc(var(--dx)*var(--k)*1px),…)` | 需要**11 个绕质心的单元**。与「开发者工具」无关。这是 `degrades` |
| **S20** | ❌ 误标 | `S20/style.css:265` `repeat(4,1fr)` + `:267-272` `.plate:nth-child(1){span 2}`…`(6){span 3}`（2+2+1+3+1+3=12，正好 3 行） | 需要**6 张特定跨度的图**。与「音频设备」无关。这是 `degrades` |
| **S03** | ❌ **断言被自己的代码证伪** | 见下 | 见下 |

### 1.1 S03 专项：`hard` 说「机制绑死在行业数据上」，但机制**根本没读数据**

`hard: true` 写在 `prototypes/_prompts/build-prompts.mjs:61`：

```js
S03: { plain: "纵向年代轴，像观测记录仪", scenes: ["科研机构", "气象看板"], minItems: 8, minPics: 3, hard: true },
```

唯一给出的理由是 `:91` 那行注释：「不能大众化的 9 案（机制绑死在行业数据结构上）」——**无逐案理由**。

而 S03 的「年代轴」是**纯静态画出来的，不绑定任何数据**。
`prototypes/S03-long-exposure-observatory/index.html:234-235`：

```js
var years = [1957, 1962, 1967, 1972, 1977];
var drift = [0, 1.13, 2.26, 3.02, 4.15];
```

这 5 个年份与 5 个漂移量是**字面量**，与 8 条影像带（`index.html:71-102`）没有任何关联；
刻度线由 `:229-232` 的 `for (var y = 640; y >= 0; y -= 8)` 按固定 640 高度画。

影像带本身是**普通块流**，`style.css:144-149`：

```css
.stream { position: relative; }
.band { position: relative; margin: 0 0 4px; padding-right: 234px; }
.band img { display: block; width: 100%; height: var(--h); object-fit: cover; }
```

`.stream` 只有 `position: relative`，**不定位任何子项**；每条带子的高度来自内联 `--h`
（`index.html:71-102`，8 条分别 28/42/14/56/19/37/84/23px）。

⇒ **`degrades=no` 是对的**（删条目只是变短）；**`hard=true` 的理由是错的**
（机制不依赖天文数据，连「数据驱动」都不是）。

**S03 真正的问题不是「绑死行业」，而是比例本来就是坏的**（复算）：

```
8 条带子高度和 = 303px，加 8×4px 片基间隙 = 335px
年代轴固定高 = 640px            （style.css:131  height: 640px）
→ 设计规模下年代轴已经空出 305px
```

即使按设计稿 8 条满配，640px 的轴旁边只有 335px 的内容 —— **轴已经空转 91%**。
把内容换成 5 个产品，这个比例只会更糟，但它**从一开始就不是 1:1 的读数关系**。
所以 `hard` 警告在这案上连「方向对、理由错」都算不上：它描述的因果（换内容才退化）不成立，
退化在设计时就已经存在。

### 1.2 S21 专项（任务书点名）

`degrades=no` **在版面层成立**：`style.css:516-527`

```css
.path__rail{
  position:relative; display:flex; flex-direction:column; gap:1px; width:96px;
```

14 枚锁条是 flex 纵向自动堆，`--i` 只用于两件事：
`:579-580` 签名墨点偏移 `right:calc(3.5px - (var(--i)+1)*.25px)`、
`:597` `animation-delay:calc(var(--i)*70ms)` —— 都不参与落位。

但 S21 **有 `hard` 该有的那种约束**，而且比 S03 硬得多：
`index.html:234-247` 每枚锁条带 `data-excl="9,12,13"` 这类**硬编码互斥号**，
删掉第 9 枚后 `index.html:446-450` 的 JS 仍然会去点名它：

```js
var ex = (bar.getAttribute('data-excl') || '').split(',').filter(Boolean);
ex.forEach(function (n) { var t = byNo[n.trim()]; if (t) { t.classList.add('is-excl'); } });
```

`if (t)` 挡住了崩溃，但 `:452-455` 的提示语会照念「与 4 枚锁互斥：9 号、12 号、13 号、14 号」——
其中 9 号已经不存在。再看 `:230` 的静态标题「释放路径 · 本时段登记 **14** 枚锁闭条」
与 `:300-318` 角度表「本时段锁数 **4/6/4** 枚」（合计 14）。
内容一少，**图和表开始互相说谎**，这正是审计口径里「写死的编号」那一类。

⇒ **判 `degrades=no` 只看了落位，漏了编号一致性。** `hard` 在这案上是**对的**，
反倒 `degrades` 漏判。

---

## 2. 问题 2：`degrades` 这个口径准不准？

**结论：13 案里 11 案判对，1 案偏软（S30），1 案漏判并已错标为 `no`（S18）。**
判据来自 `deliverables/60-minitems-degrade-audit.md:11-16`（「只认代码」），
逐案依据在 `:23-54` 的表格列。

### 2.1 抽查 3 案自查 CSS（任务书要求）

**① S22（`degrades=yes`）→ 判对。** `S22/style.css:328-335`：

```css
.plates { … grid-template-columns: repeat(12, minmax(0,1fr)); … }
.plate--a { grid-column: 1 / span 7; }
.plate--b { grid-column: 8 / span 5; }
.plate--c { grid-column: 1 / span 5; }
.plate--d { grid-column: 6 / span 7; }
.plate--e { grid-column: 1 / span 8; }
.plate--f { grid-column: 9 / span 4; }
```

三行各自正好拼满 12 栏（7+5 / 5+7 / 8+4）。删一张 → 该行露出半行空洞。
**但有个前提任务书没说：** `:451` 在 `<900px` 把六张全部改成 `grid-column:1/span 6` 单列：

```css
.plate--a, .plate--b, .plate--c, .plate--d, .plate--e, .plate--f { grid-column: 1 / span 6; }
```

⇒ 桌面档会散，窄屏档不会。警告文案「内容少于 6 条会留空位」缺了「桌面宽度下」这个限定。

**② S30（`degrades=yes`）→ 判偏软，实为 `no`。** `S30/style.css:182-196`：

```css
.cut__cols { … display:grid; grid-template-columns:repeat(12,1fr); column-gap:16px; row-gap:48px; }
.cut__col { display: flex; flex-direction: column; gap: 20px; }
.cut__col--a { grid-column: 1 / 7; grid-row: 1; }
.cut__col--b { grid-column: 6 / 13; grid-row: 2; … }
```

「对切」由**两个容器**的 `grid-column/grid-row`（6–7 栏重叠、上下两行错位）产生，**不在条目上**。
条目是 `.cut__col` 里的 `flex-direction:column` **自动堆**（`:188`）。
`:224-233` 的 `.sticker:nth-of-type(n){--d:…}` 只改动画延时。

⇒ 删掉 4 张，两列只是变短，**−32° 的对切关系原样保留**。
审计表 `60-minitems-degrade-audit.md:54` 给的理由是「两列靠 `grid-row` 上下错位才成对切」——
这句话描述的是**容器**，不是**条目**，不能推出「删条目就散架」。
**S30 的 `degrades=yes` 站不住**（至少「少于 10 条会留空位」这个文案是假的）。

**③ S19（`degrades=yes`）→ 判对，且理由比表里写的更强。** `S19/style.css:190-191`：

```css
.dw { grid-column: span var(--s); position: relative; z-index: 1; }
```

单看这条是自动流（审计表据此其实可以判 `no`）。真正让它散架的是**行标题是静态文本**：
`S19/index.html:67` `<p class="row__h">第 1 行 · 抽屉 01–04 · 栏宽 4 / 3 / 3 / 2</p>`，
以及 `:69-72` 每屉内联 `--s:4/3/3/2`。抽屉删到 5 个后，`第 2 行…第 5 行` 四条标题仍写着
「抽屉 05–08 / 09–12」——**空标题 + 空行**。审计表 `:43` 已经点到这一层，判对。

### 2.2 漏判：S18 应为 `yes`

`schema` 层看得对（`span.ln` 是 `pre-wrap` 流，`style.css:166-170`），
但**漏掉了第三栏那 4 张绝对定位的回执牌**。`S18/index.html:172-203`：

```html
<div class="hang" style="--at:5"> … </div>
<div class="hang" style="--at:10"> … </div>
<div class="hang" style="--at:18"> … </div>
<div class="hang" style="--at:34"> … </div>
```

配 `style.css:122`：

```css
.hangrail .hang{position:absolute;left:0;top:calc(var(--at,0) * var(--line) + var(--line) + 2px)}
```

`--at` 是**行号**，`--line` 是 24px。这 4 张牌按「第 5 / 10 / 18 / 34 行」的算术位置钉死。
日志从 60 行砍到 6 行时，`--at:18` 与 `--at:34` 两张牌**悬在正文下方的空白里**，
指向不存在的回执行 —— 与 S19 的空行标题是同一类失效。

⇒ 审计口径 `:14-15` 明写 `yes` 包含「绝对定位」。
S18 的**主单元**是流式（判 `no` 没错），但**次单元**（回执牌）是绝对定位。
这说明 `degrades` 的「只取最大一组单元」这条规则（`:8-9`）会**系统性漏掉二级硬编码组**——
审计自己在 `:79-82` 为 S26 开了「边界案」的先例，S18 属于同一类却没被单列。

---

## 3. 问题 3：两个概念到底是什么关系？

**你的定义基本正确，但「正交」这个结论要打折。我的判定：概念上正交，实现上不正交。**

### 3.1 概念层：确实正交（2×2 四格都该允许存在）

- `hard` ＝ **题材/结构必须匹配**：内容的**语义 schema** 要能承载机制（S15 要平面图、S29 要零件号双射、S21 要互斥对）。
- `degrades` ＝ **数量必须够**：内容的**条数**被写进了版面坐标（S05 八块 grid 坐标、S23 九处 36×220 绝对位）。

四格：

| | `degrades=no` | `degrades=yes` |
|---|---|---|
| **`hard` 成立** | S10、S21（有 schema 依赖，删条目只是变短） | S15、S29（两者都要） |
| **`hard` 不成立** | 13 案（S01 S06 S07…） | S02 S04 S08 S12 S19 S22 S23 S30 |

**四格都有实例，所以不能合并成一个三档标。** 三档（够/勉强/不行）会把
「要 8 条**且**要平面图」压成「不行」，用户无法区分「我凑够 8 条就能用」和「我永远用不了」——
这正是最需要区分的两种处境。（→ 否定选项 b）

### 3.2 实现层：不正交，因为 `degrades` 的判据已经把语义混进去了

`60-minitems-degrade-audit.md:14-15` 给 `yes` 的定义是：

> `yes`：位置写死 —— 绝对定位、写死的 `grid-row/column` 坐标、手绘 SVG 绝对坐标、
> 写死编号的行标题、JS 里硬编码的索引数组；

后半段「写死编号的行标题」「JS 里硬编码的索引数组」**是语义/计数约束，不是几何约束**。
按这条口径，S21（`data-excl` 硬编码互斥号）与 S18（`--at` 行号）都该是 `yes`，
而 S30（容器错位、条目流式）不该是 `yes`。所以**不是口径写错了，是执行时只看了几何**。

⇒ 结论：`degrades` 这个字段名承载不了它自己写下的判据。
要么把它收窄成纯几何（并另立一个「编号一致性」字段），要么承认它已经是「数量+编号」的复合量。

---

## 4. 问题 4：修法（推荐 + 理由 + 具体行号）

### 4.1 四个选项的判定

| 选项 | 判定 | 理由 |
|---|---|---|
| **(b) 三档合并** | ❌ 否 | §3.1 的 2×2 四格都有实例，三档必然丢信息；且「够/勉强/不行」无法表达「凑够数量就能用、但题材必须匹配」 |
| **(c) 只留 `degrades`、删 `hard`** | ❌ 否 | 会净损失 S15 / S29（真·题材绑死）、S10 / S21（真·结构依赖）。这 4 案的用户会拿到「都行」的假保证 —— 比现在的错文案更糟 |
| **(d) 重新实测 `hard`** | ✅ **采纳（改造后）** | 但「实测」不能测「行业绑死」这种不可证伪的属性。可测的是**代理量**：见 4.3 |
| **(a) 两个都留、说清区别** | ✅ **采纳（作为主修法）** | 现状失败不在「留了两个」，而在两条文案都在说**同一句话**（会不会退化），却指向两个不同的集合 → 用户看到的是矛盾 |

### 4.2 推荐：**(a) + (d)** —— 保留两轴，但把 `hard` 改写成它能证明的事，并把 8 个案补上数量警告

**这是一次「改文案 + 改判据」，不是「改数据」。** 分三步，按优先级排。

#### 第一步（必做，3 行）：让「内容量」警告覆盖它该覆盖的 13 案

现在 `prompt-copy.js:411-413` 用 `s.hard` 决定提示语，导致 8 个**实测会散架**的案
（S02 S04 S08 S12 S19 S22 S23 S30）拿到的是**肯定式保证**：

```js
411:    hint.textContent = s.hard
412:      ? "⚠ 这案机制绑死在行业数据上，换普通内容会退化——详情面板「适用场景」段末写了它不适合什么（约在面板底部）"
413:      : "粘给 ChatGPT / Claude / v0 都行，约 " + buildPrompt(id).length + " 字";
```

`第 413 行` 这句话对这 8 案是**事实错误**。而 `app.js:222-227` 的卡片上，
同一个案会同时显示黄色的「⚠ 内容少于 N 条会留空位」：

```js
222:    if (cap.degrades === 'yes') {
224:        '⚠ 内容少于 ' + cap.minItems + ' 条会留空位</span>';
```

⇒ **用户在同一屏看到「⚠ 会留空位」和「都行」两句互相否定**（详情面板不遮住左侧行卡：
`style.css:515` `body.detail-open .bench { padding-right: min(var(--detail), 42vw); }`）。
这正是任务书说的「两套口径打架」，**但打架的不是 hard 与 degrades，是文案与数据**。

改法（`prototypes/_selection/prompt-copy.js:411-413`）：

```js
    var cap = s.capacity || null;
    var capWarn = cap && cap.degrades === 'yes' ? cap.minItems : 0;
    var bits = [];
    if (capWarn) bits.push("⚠ 这案版面按 " + capWarn + " 条手工排定，少于 " + capWarn + " 条会留空位");
    if (s.hard) bits.push("另：这案的记忆点依赖特定数据形态，换题材会退化（见详情「不适合」）");
    if (!bits.length) bits.push("粘给 ChatGPT / Claude / v0 都行，约 " + buildPrompt(id).length + " 字");
    hint.textContent = bits.join("；");
```

⚠️ 注意：`prototypes/_selection/prompt-copy.js` **不在闸门覆盖内**
（`verify-prototype.mjs:143-144` 的过滤正则是 `/^S\d{2}-/`），改完只能靠 `node -e` 与手点验证。

顺带：`prompts.js` 的提示词正文已经是对的 —— `buildPrompt()` 在 `:152-155` 按 `d.degrades`
写「位置是按 N 个条目手工排定的…会留洞」。**UI 与提示词正文不一致**，
所以用户复制出去的东西反而比屏幕上看到的诚实。这条可以作为「改 UI 而非改数据」的额外理由。

#### 第二步（必做，改生成器）：把 `hard` 的判据落纸，或降级声明

`prototypes/_prompts/build-prompts.mjs:91` 的注释是目前**唯一**的理由：

```js
// 不能大众化的 9 案（机制绑死行业数据结构）——如实标注，不硬接
const HARD_IDS = Object.keys(HUMAN).filter((k) => HUMAN[k].hard);
```

建议改成逐案带理由的结构（而不是裸 `hard: true`），并把判据写成**可机械复核**的：

```js
/* hard ＝ 内容的「语义 schema」必须匹配（不是条数：条数归 degrades）。
 * 判据（三条全过才算）：① 机制句要求一个普通内容没有的字段（编号/坐标/互斥对/零件号）；
 *                      ② 换成「5 个产品」后该字段无处可填；③ 能在 CSS/HTML 指到具体行。 */
const HARD = {
  S15: { why: "14 个热区是手绘 SVG 矩形，按舱室面积画；普通内容给不出平面图", ev: "S15/index.html:139-152" },
  S29: { why: "零件号与表格行号必须双射；普通内容没有编号体系",           ev: "S29/index.html:209,247" },
  S21: { why: "锁闭条互斥号 data-excl 硬编码；普通内容没有依赖图",       ev: "S21/index.html:234-247" },
  S10: { why: "五列语义是两组可对照数据；普通内容没有对照关系",           ev: "S10/index.html:118-123" },
  S18: { why: "回执牌按行号 --at 绝对定位；普通内容没有连续流水",         ev: "S18/style.css:122" },
};
```

**删掉 S03 / S05 / S14 / S20 的 `hard`**（理由见 §1：S05/S14/S20 是纯条数约束，已由 `degrades` 覆盖；
S03 的轴是静态画的不读数据）。`HARD_IDS` 由 9 → 5。

同时处理死字段：`prompts.js:375` 的 `"hardIds"` 数组**在 `_selection/` 里零读取**
（全仓库只有 `build-prompts.mjs:251` 写出与产物自身，UI 读的是 `s.hard`）。
二选一：让 `prompt-copy.js` 改读 `P.hardIds`，或按 `template` 字段的先例删掉
（先例与理由见 `build-prompts.mjs:148-160`）。

#### 第三步（建议）：修 `degrades` 的两处偏差

1. **S30 → `no`**（或保留 `yes` 但把文案改成「两列各留 5 条时对切最完整」）。
   依据：`S30/style.css:188-192`，条目是 flex 自动堆，对切在容器上。
2. **S18 → `yes`**，或至少单列为「次单元硬编码」（照 `60-minitems-degrade-audit.md:79-82` 给 S26 开的先例）。
   依据：`S18/style.css:122` + `index.html:172-203`。
3. **S22 的文案补限定词**「桌面宽度下」：`S22/style.css:451` 在 <900px 变成单列。

### 4.3 关于 (d) 「怎么测 `hard`」

「机制绑死在行业数据上」不可证伪，但可以测它的**代理量**，一条命令能跑：
`schema` 字段依赖度 = 机制句里出现的、必须由内容提供的字段类型数
（编号 / 坐标 / 日期 / 尺寸 / 单位 / 互斥对）。做法：对 30 案的 `dna.mechanism` 正则计数，
再与 `_specs` 字段 11 的「最难被复用」句交叉验证。
**但注意：本审计已验证 `_specs` 字段 11 与 `HARD_IDS` 只有 6/21 重叠**（§0.1），
所以这一步只能用来**重新生成名单**，不能用来「验证现有名单」。

### 4.4 如果只能改一行

**改 `prototypes/_selection/prompt-copy.js:411`**，把条件从 `s.hard` 改成
`s.hard || (s.capacity && s.capacity.degrades === 'yes')`：

```js
411:    hint.textContent = (s.hard || (s.capacity && s.capacity.degrades === 'yes'))
```

理由：**当前最伤人的不是错警告，是假保证。** 8 个「删条目就留洞」的案
（含 S19 那类连行标题都会空掉的）现在对用户说「粘给谁都行」。
这一改让警告集合从 9 → 17，**只会减少假保证**：新增的 8 案里 7 案经复核确实会留洞
（S02 S04 S08 S12 S19 S22 S23，S30 见 §2.1 ② 判偏软，是这 8 个里唯一的假警告）。
文案仍不准（对 8 案说的是「行业数据」），但**方向从错变成对**。
之后再做第一步的完整文案。

---

## 5. 问题 5：`hard` 的文案是否在说谎？—— 是，对 S03 尤其

### 5.1 三处可判定的失实

**① 「机制绑死在行业数据上」—— 对 S03 不成立。**
如 §1.1 所述，S03 的年代轴由 `index.html:234-235` 的字面量数组画出，影像带是块流。
机制**不读数据**，谈不上「绑死」。断言把一个静态装饰说成了数据依赖。

**② 「建议先看详情里的「不适合」」—— 指错位置；即使指对了，内容也支撑不了这个警告。**

审计开始时（HEAD `cea8436`）的原文是 `prompt-copy.js:366`
「…建议先看详情里的「不适合」」。**「不适合」根本不是一个字段名**：
`app.js:446` 渲染的字段标签是「适用场景」（`field('适用场景', r.scenes)`），
「不适合：…」只是 `scenes` 这个 value 的尾部（实测 `data.js` 的 S03 记录 31 个键，
无任何含「不适合」的键；`scenes` 尾部原文
「…成果汇报页。**不适合：**需要热闹促销氛围的电商活动页、儿童与低龄用户为主的产品页。」）。
⇒ 让用户去详情里找一个**不存在的字段**，这一条是硬缺陷。

**（并发说明）审计收尾时该句已被另一 Agent 改成** `prompt-copy.js:412`
「…详情面板「适用场景」段末写了它不适合什么（约在面板底部）」——
位置指对了，**但本节要指出的问题没有解决**：S03 的「不适合」原文（`S03.md:37`）是

> 不适合：需要热闹促销氛围的电商活动页、儿童与低龄用户为主的产品页。

这两条讲的是**调性**（热闹 / 低龄），**没有一句**讲内容量、数据形态或「机制绑死」。
用户照着提示去看，读到的是「我的内容不热闹，那应该没问题」——
**提示语把人引到了一段会得出相反结论的文字**。
所以这一条不是「指错路」，是「**路修好了，但目的地本身答非所问**」。改指针不解决它，只有改文案（§4.2 第一步）能解决。

**③ 该警告的案没警告，且给了反向保证。**
`prototypes/_specs/S22.md:33` 作者自己写「换品牌就得重写内容结构，无法只换 logo」，
而 S22 在 UI 上拿到的是 `prompt-copy.js:413` 的「粘给 ChatGPT / Claude / v0 都行」。

### 5.2 S03 换普通内容后**实际**会发生什么（逐条核实）

假设用户把 S03 拿去给「一家小店的 5 个产品」用：

1. **版面不会塌。** `.stream` 是块流（`style.css:144-149`），5 条带子就是 5 条，不留洞。
   → `degrades=no` 在这一层正确。
2. **比例会明显变差，而这个坏比例本来就存在。** 复算：8 条满配 = 335px 高，
   而轴固定 640px（`style.css:131`）→ 满配已空 305px。砍到 5 条 ≈ 200px → 空 440px。
   → 退化是真的，但**原因是「轴写死 640px」，不是「内容题材不对」**。
3. **机制的含义会消失（这才是真损失）。** 「高度即曝光时长」靠的是
   带高（28–84px 八档）与右侧读数表（`index.html:113-120` 八行，日期/曝光/强度/磁偏角）
   **一一对应**。换成产品后，`--h` 仍然是 28/42/14/56/19/37/84/23 这 8 个值
   （写在内联 style 里），于是「高的一档」不再有任何含义 —— 退化成随机的条带高度。
   → 这一层 `hard` 的方向是对的，**但它的文案把它归因到了「行业数据」，实际归因是「每条的数值字段」**。
4. **静态文案会立刻说谎。** `index.html:51` 写着「下面每一条带子的高度，等于当晚快门压住的秒数」，
   `:35` 「共 23 个观测年」，`:73-101` 每条 figcaption 带真实日期与「30 s · 强度 4 级」。
   换内容后这些全是假话，用户得逐条改 8 处 figcaption + 8 行读数表。

⇒ **给用户的准确说法应该是**：
「这案的记忆点靠『每条内容都要有一个可换算成高度的数值（秒数/量级/权重）+ 一张与之一一对应的读数表』。
没有这个字段，条高就变成随机的；轴固定 640px，条目少于 6 条时轴会空掉一大半。」
——而不是「机制绑死在行业数据上」+「去看不适合」。

---

## 6. 我不认同任务书的地方（任务要求：直说）

任务书把这件事定为「最该先修的」。**我同意它重要，但不同意它是第一优先，理由如下。**

1. **它不是「两套口径打架」，是「一句文案与它自己的数据打架」。**
   真正的矛盾发生在 `prompt-copy.js:413`（都行）与 `app.js:222`（会留空位）之间，
   而这两句**指向同一份实测数据**（`capacity`）。`hard` 只是让这个矛盾多了一种表现形式。
   把 `hard` 当主角，会让人以为修完它矛盾就消失了 —— 不会：
   即使删掉 `hard`，那 8 个案仍然是一边「⚠ 会留空位」一边「都行」。
   换句话说：**`hard` 是那个「多出来的一层」，但矛盾的两端都不在 `hard` 上。**

2. **同样严重的、更容易验证的缺陷至少还有两处**（本次顺带核实到，未展开）：
   - `S18/style.css:122` 的 4 张回执牌按行号绝对定位，`degrades` 判成 `no` —— 这是**实测数据本身的错**，
     比「人工标注不准」更硬，修它的收益也更确定。
   - `S26` 被审计自己列为「边界案」（`60-minitems-degrade-audit.md:79-82`）却没进任何警告集合，
     而它的三色版是 `style.css:143` + `:150-152` 写死的成套构图。
3. **`hard` 的根因是「判据从未落纸」**（§0.1：与 `_specs` 的 21 条自述只有 6 条重叠）。
   这类问题**改文案治不好**，改完还会漂。要么落判据（第二步），要么删字段（选项 c 的局部）。
   单纯「说清区别」（选项 a 的字面做法）只是把一句不可证伪的话换成两句。

⇒ **我的排序**：先做 4.2 第一步（3 行，消除假保证，收益确定、风险为零）→
再修 `degrades` 的两处实测偏差（S18 / S30，改数据表）→ 最后才动 `hard` 的判据与文案。
理由是前两步都能用 `node -e` 逐 id 验收，第三步只能靠人读。

---

## 附录：本次核实用到的命令（全部只读）

```powershell
# --- 集合关系 ---
& D:\Nodejs\node.exe <script>   # 见 §0 脚本，加载 data.js + prompts.js
# --- 逐案证据 ---
Select-String -Path prototypes\S03*\style.css -Pattern '\.axis|\.band|--h' -Encoding utf8
Select-String -Path prototypes\S21*\style.css -Pattern 'lockbar|path__rail|--i' -Encoding utf8
Select-String -Path prototypes\S18*\style.css -Pattern 'hangrail|\.hang\{|\.fold' -Encoding utf8
Select-String -Path prototypes\S30*\style.css -Pattern 'cut__col|--d:' -Encoding utf8
# --- 作者自述的可移植性判断 ---
Select-String -Path prototypes\_specs\S*.md -Pattern '最难被复用' -Encoding utf8   # 21/30 命中
# --- 全部 hard 引用 ---
Select-String -Path prototypes\*,prototypes\_selection\* -Pattern 'hardIds|\.hard\b' -Encoding utf8
```

`node` 使用 `D:\Nodejs\node.exe`。**未修改任何原型文件、未运行生成器。**
本文件是本次唯一写入，路径 `deliverables/62-audit/hard-vs-degrades.md`。
