# 代码审计：S21–S30 的 hard 判定

> 只读审计。未修改 `prototypes/` 下任何文件。
> 取证方式：`read` 工具读 `_specs/*.md`；`grep`/`read` 读 `index.html` 与 `style.css`；
> 编号双射与数量一致性用临时只读脚本（仅 `fs.readFileSync` + 正则）核对，脚本已删，结论数字均可复算。
> 行号均为文件内实际行号（`read` 工具编号）。

## 0. 口径与两处数据源修正

**(0.1) S21–S30 的「1-附（去掉名字之后的机制）」不在 `_specs/*.md` 里。**
`_specs/S01–S10.md` 各有一条第 15 行的「1-附」，S11–S30 没有——它们被补录在
`prototypes/_prompts/mechanisms.mjs`（该文件头 1–18 行说明了理由：避免污染 `collect-schemes.mjs` 的输入）。
本段的机制句一律引自 `mechanisms.mjs:60-99`（S21 在 60–63、S29 在 92–95、S30 在 96–99）。

**(0.2) `hard` 标注的代码来源是 `prompts.js` 的 `hardIds` + 每案 `hard` 字段，不是 `_selection/data.js`。**
`prompts.js:375-385` 的 `hardIds` = `S03 S05 S10 S14 S15 S18 S20 S21 S29`；
逐案实测（`node -e` 解出 `window.STYLE_PROMPTS`）：

| 案 | hard | degrades | minItems |
|---|---|---|---|
| S21 | **true** | false | 14 |
| S22 | false | true | 6 |
| S23 | false | true | 9 |
| S24 | false | false | 6 |
| S25 | false | false | 8 |
| S26 | false | false | 8 |
| S27 | false | false | 7 |
| S28 | false | false | 12 |
| S29 | **true** | true | 23 |
| S30 | false | **false**（刚改） | 10 |

与任务书一致：本段只有 S21、S29 标 hard。`README.md:103` 的文案是这 9 案的唯一公开表述。

---

## ① 总表

| 案 | 结构 | 判决 | 判据 | 一句话依据 | 置信度 |
|---|---|---|---|---|---|
| **S21** 联锁释放簿 | F(CONSOLE) | **hard** | **H2**（副 H1） | 需要一张「两两互斥 + 全序前序」的依赖图；JS 真读 `data-excl` 值去点亮对方，但图本身是手写常量 | 高 |
| S22 糊窗对折册 | R(MIRROR) | 不 hard | — | 6+fold+6 固定网格；"镜像"是 `attr(data-verse)` 手写第二份字符串，根本没读正文 | 高 |
| S23 剥落年代墙 | F(CHRONO) | 不 hard（边界） | H1 不成立 | 9 处绝对坐标 + 3/2/2/1/1 面积递减 = 任何 9 条都能填；层数 2–4 是小序数不是值 | 中 |
| S24 蓝晒雨林径 | R(BRANCH) | 不 hard | H2 不成立 | 规格自称"由标本数据生成"，代码里是写死的 4 层骨架（`--depth` 手填） | 中高 |
| S25 专色目录帖 | F(MAG-TOC) | 不 hard | — | 3fr/7fr 固定；三级缩进靠手挂 `entry--l1/l2/l3` 类；签名机制是浏览器实时 multiply，与内容无关 | 高 |
| S26 几何对撞栏 | R(VERSUS) | 不 hard | — | 5:3:4 + 高度 100/64/80% + 1.5/1.2px 全为常量；三块版装任意 A/B 对照 | 高 |
| S27 手绘公文幕 | F(DOSSIER) | 不 hard（边界） | — | 9 栏 5:3:1 固定；ACT 交叉引用是手写锚点；`'ACT-0'+n` 只是序号拼接（>9 幕会坏） | 中 |
| S28 爵士凹版墙 | R(COLLAGE) | 不 hard | H1 不成立 | `blk--sN`/`blk--cN` 逐块手填跨度与错位；任意 12 条内容可填 | 中高 |
| **S29** 钢丝圈装订规程册 | F(MANUAL) | **hard** | **H2 + H3** | 23 点爆炸图的坐标与扭矩/MPa 字面量全写死在 SVG/表格；编号双射是真的（`getElementById`），但图形本身不可换内容 | 高 |
| S30 滑板贴纸对切 | R(SPLIT) | 不 hard | — | `--cut:-32deg` 是 `:root` 常量，四档媒体查询里改成 −30/−26/−58；不读任何内容 | 高 |

**汇总：10 案里 hard 2 案（S21、S29），与标注一致；但 S21 的归因需要改写（见③-A），S29 的"双射"虽真、硬度其实来自几何而非编号。**

---

## ② 逐案详述

### S21 联锁释放簿 → **hard**

**H1（部分成立）**：切口角度由「互斥对数」这个**具体值**决定，不是由数量决定。

```html
<!-- index.html:236 -->
<li class="lockbar is-key" data-lock="3" data-lever="道岔 3" data-pairs="4" data-angle="60" data-excl="9,12,13,14" ...>
  <span class="lockbar__body cut-60"></span>
```
```css
/* style.css:557-561 —— 三档角度只此一处，24px 条高下水平进深 41.6/24.0/13.9px */
.cut-30{clip-path:polygon(0 0,56.7% 0,100% 100%,0 100%)}
.cut-45{clip-path:polygon(0 0,75% 0,100% 100%,0 100%)}
.cut-60{clip-path:polygon(0 0,85.57% 0,100% 100%,0 100%)}
```

但它**不是读出来的**——没有任何一行代码把 `data-pairs` 换算成角度。实测（临时只读脚本正则统计，脚本已删，数字可复算）：
- 14 条 `data-excl` 的对数 = `[3,3,4,2,4,3,3,2,4,3,2,3,4,2]`，与 14 条 `data-pairs` **逐项完全相同**（即 `pairs` 只是 `excl` 的冗余计数，人写在两处）；
- `data-pairs`→`data-angle` 全部自洽（2→30 / 3→45 / 4→60，0 例外），`cut-*` 类与 `data-angle` 也逐项相同；
- 但 `cut-*` 是**逐条写进 `<li>`** 的（index.html:234-247），JS 只在拼提示时读它（index.html:454）。

→ 所以是"值的形态成立、三处常量靠人工保持一致，读取动作缺失"。H1 只能算半个，不足以单独定案。

**H2（成立，这是主要判据）**：机制要的是**一张依赖图**，不是行业名。两条硬要求：
- 任一枚锁要有「它与谁互斥」的**具体列表**（`data-excl="9,12,13,14"`，index.html:234-247 共 14 条，每条 2–4 个对手）；
- 还要有「前序锁」这条**全序**（`<td>锁 4</td>`，index.html:122；窄屏还把它渲染成 `content:"后序锁 " attr(data-next)`，style.css:905-906）。

JS 确实按值解析，不是按位置：

```js
// index.html:435-450
var byNo = {};
bars.forEach(function (b) { byNo[b.getAttribute('data-lock')] = b; });   // 键 = 锁别号的值
...
var ex = (bar.getAttribute('data-excl') || '').split(',').filter(Boolean);
ex.forEach(function (n) { var t = byNo[n.trim()]; if (t) { t.classList.add('is-excl'); } });
```

**反事实检验**：换「8 道菜」——两栏表退化为两张普通菜单表（`board__grid` 仍是 `repeat(10)` 的通用栅格，style.css:381/387-388/492，本身不 hard）；14 枚锁条因为无"谁与谁互斥"而只能全填同一个 30°，`data-pairs` 全变 2、角度三档塌成一档，"读一列等于走一遍扳这根之前必须先松哪根"这句话**当场失效**。要救回来，你得**为 8 道菜编一张互斥图**（"点了这道就不能点那道"）——那不是排版，是造数据。→ **H2 成立，hard**。

**置信度：高**（H2 高；H1 因"值有机会但无计算"记为中，不影响结论）。

---

### S22 糊窗对折册 → **不 hard**

**H1 不成立**：`6 + fold-track + 6` 是写死的版心，`--fold:88px`、`--gutter:22px`、`--edge:56px` 全在 `:root`（style.css:31-34），与内容无关。

```css
/* style.css:243-250 */
.sheet__faces{grid-template-columns: repeat(6,minmax(0,1fr)) var(--fold-track) repeat(6,minmax(0,1fr));}
.face--verso { grid-column: 1 / span 6; font-size: 17px; }
.face--recto { grid-column: 8 / span 6; font-size: 16.5px; margin-inline-start: 8px; }
```

**关键取证：所谓"镜像"根本没读正文。** 镜像层的文字是**另写一份**塞进属性里的：

```css
/* style.css:258-259 */
.verse::after { content: attr(data-verse); ... transform: scaleY(-1); }
```
```html
<!-- index.html:98 —— 正文是这一句，"镜像"是属性里另写的一段 -->
<p class="verse" data-verse="镜像层：同一句以相位 180° 叠在正文下方 3px 处，不透明度 22%（宽屏 12%）。">镜像层：同一句以相位 <code>180°</code> 叠在正文下方 <code>3px</code> 处，不透明度 <code>22%</code>（宽屏 <code>12%</code>），…</p>
```

`attr(data-verse)` 取的是**作者手打的第二份文案**，不是对正文做变换。所以"同一段文字的正反两面"在实现层是假的——它是两条独立字符串。（这不影响 hard 判定，但是本案最该记的一条实现缺陷：机制是"描"出来的，不是"算"出来的。）

**反事实检验**：3 篇文章 → 只需给每段再补一条 `data-verse`，版式一行 CSS 不改。**不 hard**。注意它的 `degrades=true` 说的是另一件事（两半各 6 栏的位置是手排的，条目少了会空），与 hard 无关。

**置信度：高。**

---

### S23 剥落年代墙 → **不 hard（边界）**

**H1 不成立**：9 处剥落的位置与面积是**绝对网格坐标手写**，没有一个数字来自数据：

```css
/* style.css:250-258 —— 9 处，逐条写死 grid-column / grid-row / 断面层数 / 铲痕道数 / 三到四层色 */
#f1 { grid-column: 1 / span 14;  grid-row: 1 / span 56;  --pw: 22px; --st: 3; --sc: 5; --ph: 168px; --x1:#DCDCC8; --x2:#7A6A55; --x3:#A8206B; }
#f2 { grid-column: 17 / span 11; grid-row: 13 / span 46; --pw: 20px; --st: 3; --sc: 4; --x1:#7A6A55; ... }
#f3 { grid-column: 29 / span 8;  grid-row: 25 / span 40; --pw: 18px; --st: 4; --sc: 5; --x1:#A8206B; ... }
... #f9 { grid-column: 32 / span 2; grid-row: 200 / span 14; --pw: 0px; padding: 8px 8px 40px; }
```

**H1 唯一像是"值驱动"的地方也还是手填**：`--st`（断面层数 2/3/4）确实决定断面里 1px 石灰线的条数与逐层动画步数：

```css
/* style.css:191-208：x2/x3/x4 三个类，硬停色标逐层切；:222 用 --st 做 steps() */
.flake.is-open::before { animation: peel calc(90ms * var(--st,3)) steps(var(--st,3), end) var(--dl,0s) both; }
```

但 `--st` 是在 `#f1..#f9` 里**逐个写死**的（3/3/4/3/3/3/2/2/—），而它对应的"年代越早层越少"只是文案里的说法（index.html:143「九处里最深的一处读到 4 层」），**代码里没有任何"按年代推层数"的计算**。

**层位索引条也是手工对表**：`--r` 手写 = 该剥落起始行号（1/13/25/72/84/126/138/172/200，index.html:82-90），CSS 用 `top: calc(var(--r)*8px + 26px)`（style.css:293）。两份常量各写一遍、靠人肉保持一致——这是 H3 形态的"结构层硬编码"，但它是**位置重复**，不是行业值。

**H2 按任务书的口径不成立**：「9 处按 3/2/2/1/1 递减」正是任务书举的反例（"8 块分区按 5:2:1，任何 8 个条目都能填 → 不 hard"）。层数 2–4 也是任何有子章节的内容都能供上的小序数。

**反事实检验**：3 篇文章 → 9 处剥落只能填 3 处，其余 6 处露空墙；但那是 `degrades=yes`（已经是 true）的问题，**不是机制被值绑死**。把 3 篇文章各配 2–4 个子标题，断面照样能画。
**置信度：中**（"需要层级数据"与"任何嵌套内容都行"这条线在本案踩线；见⑤）。

---

### S24 蓝晒雨林径 → **不 hard**

**规格与代码不一致（本案的核心发现）**：`S24.md:33` 写「分叉结构由标本数据（叶脉级数与坐标）生成，换品牌必须换数据集」，`S24.md:38` 再强调一次。**代码里没有这件事。**

```css
/* style.css:130-135：8 栏加中轴，每层是固定的 5fr 3fr / 3fr 5fr */
.fork__grid{display:grid;grid-template-columns:repeat(8,1fr);gap:0 24px}
.lv{grid-column:1 / -1;display:grid;grid-template-columns:5fr 3fr;...}
.lv--mirror{grid-template-columns:3fr 5fr}
```
```html
<!-- index.html:79 / 103 / 126 / 149 / 172 / 192：depth 是手填的内联变量 -->
<article class="br br--w" data-grow data-path="a" style="--depth:1;--d:0">
```
实测 `--depth` 取值 = `[1,1,2,2,3,3,4,4,4,4]`——**是"第几层"这个位置，不是数据**。桌面端根本没有用 `--depth` 算任何东西；唯一用它的是窄屏缩进：

```css
/* style.css:346（<768px 媒体查询内） */
.br{ ... margin-left:calc(var(--depth) * var(--indent)) }
```

42° 也是算术常量：`style.css:165` 注释写明「56px 横走 / 50px 抬升 = 41.8°」。

**反事实检验**：8 道菜 / 5 个产品 → 4 层树每层 2 支，需要 2+2+…；只要内容有层级就填得满，没有层级就在第 1 层就停，版式不崩。**不 hard**——它是"固定骨架 + 手排分支"，不是"由数据生成的分叉"。
**置信度：中高。**（若按 `_specs` 的意图判，会判 hard；但审计对象是代码，代码没做生成。这条差异本身就是本报告④的主要结论之一。）

---

### S25 专色目录帖 → **不 hard**

```css
/* style.css:172-178：右重左轻 3fr 7fr，固定 */
.contents{display:grid;grid-template-columns:3fr 7fr;column-gap:72px;...}
/* style.css:198-201：三级缩进靠手挂的类 */
.entry{padding-left:var(--indent,0)}
.entry--l1{--indent:0px} .entry--l2{--indent:12px} .entry--l3{--indent:24px}
```
层级是**作者在 HTML 上标的**（`<li class="entry entry--l2" data-hole="2">`，index.html:143/150/164/171…），不是从数据结构里读的；`data-hole` 也只用于点亮对应孔位（index.html 内联脚本 `light(entry.dataset.hole)`）。

签名机制倒确实是"算出来"的，但它与内容无关：

```css
/* style.css:92-93 */
.ink { display:block; position:absolute; mix-blend-mode:multiply; }
```
浏览器实时相乘，第三色 `#181C0D` 是渲染结果——**任何两版色块压在一起都成立**，内容多少不影响。

**反事实检验**：3 篇文章 → 全部挂 `entry--l1`，三级缩进塌成一级，目录照读；叠印机制一字不改。**不 hard**。
**置信度：高。**

---

### S26 几何对撞栏 → **不 hard**

```css
/* style.css:143 / 150-152 / 177-179 / 26 */
.plates{grid-template-columns:5fr 3fr 4fr;grid-template-rows:var(--band-h);gap:0}
.plate--blue{height:100%;--rate:1} .plate--red{height:64%;margin-top:16px;--rate:.88} .plate--black{height:80%;--rate:.94}
.plate--blue .plate__v{filter:drop-shadow(1.5px 1.5px 0 var(--mul-br))}
.plate--red  .plate__v{filter:drop-shadow(1.2px 1.2px 0 var(--mul-rk))}
--skew:-11deg;
```
三块版宽度、高度、错位、斜角**全是常量**；三块里装什么由 HTML 决定（index.html:64-78「A 班 412 / 换模 9 / B 班 386」）。这批数字是读数，但版式并不读它们——`jump__a/jump__b` 的 412→413 是写死在标记里的两帧（index.html:66），不是算的。

**反事实检验**：5 个产品 → 三块版依然三块（5:3:4），你要么塞 3 个、要么加行；版式不因产品的具体值变形。**不 hard**。
**置信度：高。**

---

### S27 手绘公文幕 → **不 hard（边界）**

```css
/* style.css:90 / 138 / 222 / 273 / 299 / 34 */
.grid9{grid-template-columns:repeat(9,minmax(0,1fr));column-gap:var(--gutter)}
.act__body{grid-column:1 / 6}      /* 正文 5 栏 */
.act__sign{grid-column:6 / 9}      /* 签发 3 栏，下沉 28px */
--mis:1.8px;
```
9 栏与 5:3:1 是固定骨架。幕次的交叉引用是**手写锚点**（`<a href="#act-06"><code>ACT-06</code></a>`，index.html:102/108/129/135/156/162…），不是查表得来的。

唯一"算出来"的是抬头编号，而它是**序号拼接**：

```js
// index.html 内联脚本 jump(n)
var code = 'ACT-0' + n;     // 7 幕时 = ACT-01..ACT-07；到第 10 幕就变成 ACT-010
```
`acts` 取自 `document.querySelectorAll('.act')`（实测 7 个 `id="act-01".."act-07"`，已核对），所以它是"按 DOM 个数"而非"按编号值"。这是**数量依赖**，恰好落在任务书的"只依赖数量 → 不 hard"。

**反事实检验**：3 篇文章 → `ACT-01..03`，9 栏 5:3:1 照排，1.8px 错位照印。**不 hard**。
**置信度：中**（`ACT-0`+n 的上限 9 是个真实的实现脆弱点，但它绑的是"数量"，不是"值"）。

---

### S28 爵士凹版墙 → **不 hard**

```css
/* style.css:175 / 180 / 185-191 —— 16 栏、跨度与错位逐块手填 */
.row{display:grid;grid-template-columns:repeat(16,minmax(0,1fr));column-gap:0}
.blk{grid-column:span var(--span,4)}
.blk--s2{--span:2} ... .blk--s7{--span:7}
.blk--c4{--mis:4px} ... .blk--c14{--mis:14px}
```
```html
<!-- index.html:90 / 104 / 115 / 130 …：每块自己带齐 sN + cN + eN 三个类 -->
<article class="blk blk--s7 blk--c7 blk--n7 blk--e1" id="blk-01" ...>
```
12 块 = 12 组手写类名。错位量确实**进了几何**（不是纯装饰）：

```css
/* style.css:228-230：缺口尺寸 = --mis */
clip-path: polygon(0 0, 100% 0, 100% var(--mis,6px), var(--mis,6px) var(--mis,6px), var(--mis,6px) 100%, 0 100%);
```
但 `--mis` 是**每块写死的常量**，不是从内容算出来的（`S28.md:33` 自己承认"12 块裁切位置必须与真实唱片档案的封面构图对应"——即人工对齐）。

**反事实检验**：8 道菜 → 12 块变 8 块，跨度与错位仍可逐块手填，缺口照切。**不 hard**（面积+错位是配比，属任务书反例那一类）。
**置信度：中高。**

---

### S29 钢丝圈装订规程册 → **hard**

**编号双射是真的，不是 `nth-child` 对齐。** 实测（`_probe.mjs`）：`data-part` 23 个 `01..23`、`id="part-NN"` 23 个 `01..23`、`data-back` 23 个 `01..23`，三列顺序完全一致、零重复。代码按**值**查：

```js
// index.html:549-555
function flash(no) {
  var row = document.getElementById('part-' + no);       // 值 → 行
  if (!row) return;
  row.classList.add('flash'); ...
  row.scrollIntoView({ block: 'center' });
}
// index.html:558 / 561-562
if (pt) { flash(pt.getAttribute('data-part')); return; }
var g = document.querySelector('.pt[data-part="' + back.getAttribute('data-back') + '"]');  // 行 → 值 → 图元
```
改一个零件号，跳转跟着走；挪一行，图元不用动。**这个"双射"在代码里成立。**

`nth-of-type` 确实存在，但只负责**描画次序**（装饰性 stagger），不承担对齐：

```css
/* style.css:215-225 —— 24 是因为 <g class="axle"> 占了 g:1，所以 pt 01..23 = nth-of-type 2..24 */
.js .diag .pt:nth-of-type(n+8) .pc, ... {stroke-dasharray:2000 2000; stroke-dashoffset:2000}
.diag .pt:nth-of-type(8){--i:0} ... .diag .pt:nth-of-type(24){--i:16}
```

**但硬度不在双射上，在几何与字面量上（H3 + H2）：**

```html
<!-- index.html:209 —— 23 个零件，每个的轮廓是手绘 path 坐标 -->
<g class="pt" data-part="01" ...><path class="pc" d="M60,262h30v76h-30z M90,278h22v44h-22"/>...
<!-- index.html:215 -->
<g class="pt" data-part="07" ...><path class="pc" d="M320,272h22v56h-22z M342,278h9v44h-9 M351,266h10v68h-10"/>...
```
这 23 条 `d` 是**一台离心泵的装配几何**，不是从数据推出来的，也不可能换成别的内容——「8 道菜」没有爆炸图，「5 个产品」凑不出 23 件正交分解。加上整页的行业常量（`0.3 MPa`、`42 N·m`、`CP-80/200`、`TORQUE-29`、`ISO VG 46`，index.html:21-23/45/111-118/318-323），这是 H3 的教科书情形。

**H2 补充**：机制要的是「一个可分解成 N 个唯一编号零件的实物 + 每件带材料/扭矩/间隙的规格行」。`S29.md:33` 自己写「换品牌等于重编整本手册的编号体系」。

**反事实检验**：3 篇文章 → 爆炸图、零件表、`TORQUE-29` 错误态、45° 警示斜纹全部无对象；能留下的只有"左缘 72px 装订边距 + 栏外编号 + 表格下沉 18px"这套外壳（`style.css:59/164/194`），而那已经不是本案的记忆点。**hard，置信度高。**

---

### S30 滑板贴纸对切 → **不 hard**

**−32° 不依赖内容，它是 `:root` 里的常量，且按断点手改：**

```css
/* style.css:26-29 */
--cut: -32deg;   /* 对角线角度：页面宽高比算出，1440×900 时为 −32° */
--band-h: 96px;
--mis: 9px;
```
```css
/* style.css:373 / 382 / 398 / 430 —— 四档全部写死 */
@media (max-width:1439px) and (min-width:1024px){ .cut{--cut:-30deg} }
@media (max-width:1199px) and (min-width: 820px){ .cut{--cut:-26deg;--mis:6px} }
@media (max-width: 819px) and (min-width: 520px){ .cut{--cut:-26deg;--mis:0px;--band-h:3px} }
@media (max-width:519px){ .cut{--cut:-58deg;--mis:3px;--band-h:96px} }
```
注释说"按宽高比算出"，**代码里没有任何 JS 计算角度**：滚动脚本只有三个常量

```js
// index.html:277
var WAVE = 2400, PUSH = 24, MIS = 9, sy = 0, raf = 0;
```
`--push` 与 `--mis` 被三角波改写（index.html:286-287），改的是**错位量**，角度不动。贴纸宽度是每张内联写死的 `style="--w:96%"`（index.html:74/79/84/89/94/102/107/112/117/122），`data-no="ST-37"` 只用于点开时显编号（style.css:222 `content: attr(data-no)`）。

**反事实检验**：3 篇文章 → 对切照切，−32° 不变，错位 9px 不变，只是分到两半的卡片变少（`cut__col--b` 空了也只是少一列）。**不 hard，`degrades=no` 改对了**。
**置信度：高。**

---

## ③ 专项核实

### ③-A S21：两栏联动靠数据关系，但那张"数据"是手写常量 → **hard，归因需改写**

| 问题 | 取证结论 |
|---|---|
| 联动是数据驱动还是 `nth-child` 对齐？ | **数据驱动**。`byNo[data-lock]` 建索引，再按 `data-excl` 里的值取对方（index.html:435-450）。不存在 `nth-child` 配对。 |
| 角度是按对数算的吗？ | **不是**。`cut-30/45/60` 逐条写在 `<li>` 上（index.html:234-247），JS 只拿来拼提示文案（index.html:454）。实测 15 条的 2/3/4→30/45/60 全部自洽，是人工维持的一致。 |
| 「互斥清单」是从数据渲染的吗？ | **不是**。`#excl-list` 的 4 条（index.html:351-354）是静态 HTML。实测 3 号锁 `data-excl="9,12,13,14"` 与清单里渲染的 `["9","12","13","14"]` 一致——**这次对齐了，但靠人肉**（两处各自维护，无渲染管线）。 |
| 所以要不要判 hard？ | **要，但理由是 H2**：整案的可读性押在"存在一张两两互斥图 + 一条全序前序链"。换普通内容，图要么不存在、要么只能编。这是**依赖图**的要求，不是"铁路"的要求——`S21.md:31` 自己就把适用面写成 CI/CD 门禁、工序放行、变更依赖校验。 |

**结论：前一轮"方向对但归因错——要的是依赖图，不是行业"成立，我复核同意。**
再补两条前一轮没写的：
1. **机制句与实现不符**：`mechanisms.mjs:61` 写「先后由切口角度读出」。角度编码的是**互斥对数**，不是**先后**；先后由"前序锁"那一列承担（index.html:86/92/98…）。这句话把两件事混成一件。
2. **"读得出"只在文案里成立**：页面上没有任何"从角度反推对数"的 UI（角度表 index.html:299-319 是静态五行表），读者无法验证。

### ③-B S29：双射是真读数据，不是 `nth-child`；但真正让它 hard 的是 23 点几何

- 双射实现 = `getElementById('part-'+no)`（index.html:550）与 `querySelector('.pt[data-part="…"]')`（index.html:561），**按值**，双向，无需位置对应。
- `nth-of-type` 只用于 `--i` 描画延迟（style.css:216-221），且**偏移了一位**（`<g class="axle">` 是 `g:1`，所以零件 01 = `nth-of-type(2)`，零件 07 = `nth-of-type(8)`，零件 23 = `nth-of-type(24)`）——注释与实现一致，不是 bug，但它是"序号"不是"值"，与双射无关。
- **前一轮"站得住"我同意，但要换理由**：`S29.md:33` 与 `mechanisms.mjs:93` 都把硬度落在"编号位与出血方向"上——那是**外壳**（`--bl:96px`、`.num{left:-56px}`，style.css:59/164），换内容能照搬。真正的不可移植物是 index.html:209-231 那 23 条手绘 `path d` 与 23 行规格表，机制句一个字没提。
- 另有一条自证：`S29.md:27` 说「爆炸图用 0.8px 单线」，`S29.md:23` 说 0.6/0.4px——规格自相矛盾，代码取 0.6/0.4（style.css:207-208）。说明这套图的线宽是后填的，不是从数据来的。

### ③-C S30：−32° 与内容零关系，`degrades=no` 改对了

- 角度是 `:root` 常量（style.css:26），四档断点覆盖为 −30/−26/−26/−58（:373/:382/:398/:430），**没有任何一处由内容或宽高比计算**。
- 内容侧只有两个可选值参与形态：`--w`（每张贴纸宽度，内联手写）与 `data-no`（点开显示的编号）。删到 3 张也不会留洞。
- 顺带记两个不影响 hard 的缺陷：
  1. **断点表与 CSS 不符**：index.html:219 写「≥1200px → −32deg」，但 1024–1439 档 CSS 给 −30deg（style.css:373）；1200–1439px 实际是 −30°，与表格和 `:root` 都不一致。
  2. **机制句与实现不符**：`mechanisms.mjs:97` 写「先后由错位量与深度给出」。本案**没有"先后"**——10 张贴纸是无序并列的，错位量只区分"上半/下半"，深 2–9px 是撕痕缺口尺寸。这句话是从 S21/S23 那类"有序"案子里套过来的句式。

---

## ④ 跨案模式与 F/R 型关系

### ④-1 多案共用骨架（本段内 + 跨段）

| 骨架 | 本段的案 | 跨段同名案 | 本段判决 |
|---|---|---|---|
| **编号索引 + 主视图 ↔ 明细表交叉引用** | S29（爆炸图 ↔ 零件表） | S19（卡片目录）、S17（收据） | S29 hard；S19/S17 未标 |
| **两栏关系表 + 横向条目带（CONSOLE）** | S21 | S05（同 F/CONSOLE） | S21 hard；S05 标 hard |
| **时间/层序纵向排列（CHRONO）** | S23 | S03（同 F/CHRONO） | S23 不 hard；S03 标 hard ← **同类不同标** |
| **非对称分栏比 + 套色错位（VERSUS）** | S26（5:3:4） | S10（6:7:9:8:5） | S26 不 hard；S10 标 hard ← **同类不同标** |
| **对角/镜像分割（SPLIT / MIRROR）** | S30、S22 | S02（SPLIT） | 三案全不 hard（一致） |
| **公文/档案分栏（DOSSIER）** | S27 | S13（DOSSIER） | 两案都不 hard（一致） |
| **目录页（MAG-TOC）** | S25 | S07（MAG-TOC） | 两案都不 hard（一致） |
| **拼贴/裁切错位** | S28 | S04（COLLAGE）、S08 | S28 不 hard；S04/S08 未标 |

→ **7 组骨架里 5 组标注一致、2 组不一致**（S23/S03、S26/S10）。

### ④-2 同类不同标时哪个对

- **S23 vs S03：S23 这一侧对，S03 的 hard 可疑。** 按 H1，两者都没读数据：S03 的机制句是「9 栏高度按 30 秒曝光折成 28px 一档」（`_specs/S03.md:15`）——"28px 一档"是常量步长，"9 栏"是数量；S23 是"3/2/2/1/1 面积 + 2–4 层"，同样是常量+数量。两者都落在任务书的反例里。**建议 lead 把 S03 从 hardIds 拿下或补 H2 证据。**
- **S26 vs S10：S26 这一侧对，S10 的 hard 可疑。** S10 的机制句是「五栏按 6:7:9:8:5 分宽 + 红色版错 1px」（`_specs/S10.md:15`）——纯配比，任何 5 条内容都能填，正是任务书写明的"不 hard"。
- **S21 vs S05：S21 这一侧站得住，S05 需要重看。** S05 的机制句是「8 块分区按 5:2:1 再加一个双高块分配面积」（`_specs/S05.md:15`）——与 S23 同构，按同一条尺子应判不 hard。**但 S05 不在我这一段，仅作交叉提示。**

（我不对 S03/S05/S10 下判决——它们在别的 Agent 手里。上面三条只是"同骨架对照组"的读数，供 lead 对齐口径。）

### ④-3 F 型 / R 型 与 hard 的关联：**没有可用关联**

按 `hardIds` 全 30 案拆分（结构类型取自各 `_specs/*.md:11`）：

| | hard | 不 hard | hard 占比 |
|---|---|---|---|
| F 型（15 案） | S03 S05 S15 S21 S29 = **5** | S01 S07 S09 S11 S13 S17 S19 S23 S25 S27 = 10 | 33% |
| R 型（15 案） | S10 S14 S18 S20 = **4** | S02 S04 S06 S08 S12 S16 S22 S24 S26 S28 S30 = 11 | 27% |

33% vs 27%——**F/R 对 hard 没有预测力**。本段内部更明显：2 个 hard 全是 F（S21/S29），但 8 个不 hard 里有 5 个也是 F（S23/S25/S27 + S30/S22 属 R）。所以"F 型 = 固定骨架 = 更容易 hard"这个直觉是错的：F 型的固定骨架恰恰让它**不依赖数据**。

**真正与 hard 相关的是"有没有一个跨区块的键"**：

| 案件 | 跨区块的键 | 键的性质 | hard |
|---|---|---|---|
| S21 | 锁别号 1–14 | 一枚锁 ↔ 一行表 ↔ 一条互斥链 | **是** |
| S29 | 零件号 01–23 | 图元 ↔ 零件表行 ↔ 规格值 | **是** |
| S23 | 层位号 1–9 | 号牌 ↔ 索引条（但索引是 `--r` 手对行） | 否（键不携带值） |
| S27 | ACT-01–07 | 幕次 ↔ 锚点（手写 href） | 否（键只是锚） |
| S28/S30/S26/S25/S24/S22 | 无 | 位置/宽度/角度全是常量 | 否 |

**结论：hard ≈ "存在一个必须唯一的键，且键的另一端挂着随内容变化的值"**——S21 的键挂着 2–4 个互斥对手，S29 的键挂着材料/扭矩/几何；S23/S27 的键只是书签。这比 F/R 好用得多，也解释了为什么 S29 的 `nth-child` 疑云不影响判决（对齐靠键，不靠位置）。

### ④-4 本段最强的一条模式：**规格声称"数据生成"，代码是"手工摆放"**

四案自述由数据驱动，代码里查不到生成逻辑：

| 案 | 规格的声称 | 代码实况 | 证据 |
|---|---|---|---|
| S24 | 「分叉结构由标本数据（叶脉级数与坐标）生成」（`S24.md:33`） | 固定 4 层骨架，`--depth` 手填 `[1,1,2,2,3,3,4,4,4,4]` | style.css:130-135；index.html:79/103/126 |
| S23 | 索引条"纵向位置与该剥落实际高度对齐"（`S23.md:21`） | `--r` 与 `grid-row` 两份常量人肉对表 | index.html:82-90；style.css:250-258/293 |
| S28 | 「12 块裁切位置必须与真实唱片档案的封面构图对应」（`S28.md:33`） | `blk--sN`+`blk--cN` 逐块手写类名 | index.html:90-236；style.css:185-191 |
| S22 | 「同一段文字的正反镜像」 | `attr(data-verse)` 手打第二份字符串，不读正文 | style.css:258-259；index.html:98/121 |

这四种"声称"如果被当成 hard 的证据，就会**系统性地把 hard 判高**——S24 正是这样：按 spec 该判 hard，按代码只能判不 hard。**建议 lead 在口径里写明：hard 只认代码里的读取动作，不认 `_specs` 第 11 字段的意图声明。**

---

## ⑤ 判不出的案子

只有 2 案真正踩线，其余 8 案证据充分。

**（1）S23 剥落年代墙 —— 判不出"要不要算 H2"。**
不确定点：`--st`（2/3/4 层）确实进入了形态（断面线数 + `steps()` 步数，style.css:191-222），而"每一条内容要带 2–4 层嵌套"算不算 H2 的"层级数据"？
- 若算：S23 与 S29 同类，应判 hard；
- 若不算（我倾向）：`--st` 是逐个手填的小序数，且 3/2/2/1/1 面积已被任务书列为反例，应判不 hard。
**卡点在于"层级"是数据结构还是内容属性，任务书的 H2 举例（唯一编号/层级/时间戳/坐标/双射）把"层级"列了进去，但反例又说"任何 8 个条目都能填"。** 需要 lead 给一个操作性定义（例如：层级深度是否**改变了版面拓扑**，还是只改变某个块内部的线条数）。

**（2）S27 手绘公文幕 —— 判不出"交叉引用算不算机制"。**
不确定点：`ACT-01..07` + 「见 ACT-03 第 2 条」这种互引，在代码里是手写 `<a href>`（index.html:102/108/129/135/156/162/208/216/243/270），在语义上却是一张**有向引用图**（近似 S21 的前序锁）。
- 若按"引用图的存在"判：它与 S21 同源，应判 hard；
- 若按"引用是手写锚点、不是查表"判（我倾向）：它只是超链接，`jump()` 还用 `'ACT-0'+n` 拼接（>9 幕即坏），应判不 hard。
**卡点：S21 的 `data-excl` 也是手写常量——两者的差别只在"键的另一端是否挂值"。** 我按这条差别把 S21 判 hard、S27 判不 hard，但这条线是我自己划的，不是任务书给的。

**（附）一处不影响判决、但需要 lead 知道的实现缺陷**：S22 的"镜像"是 `attr(data-verse)` 手写第二份文案（style.css:258-259），并非对正文做相位变换；`S22.md:13` 与 `mechanisms.mjs:64-67` 的"同一段文字的正反镜像"在实现层不成立。这不改变 hard（不 hard），但若有人拿"镜像必须绑定同一篇文章的两面"（`S22.md:33`）当 hard 证据，那是被文案误导——代码里没有这个绑定。
