# 核实：S03 的 degrades 是否漏判

> 核实对象：上一轮独立验证 Agent 的判断 ——「S03 的 8 条影像带高度写死，少一条会留洞，`degrades` 应为 `yes`；当前是 `no`，导致 UI 显示『粘给 ChatGPT / Claude / v0 都行』，零警告。」
>
> 方法：读源码（行号＋原文）＋ 真实 Chrome 渲染实测（`tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs`，1440×900 / 1280×900 / 390×844）。**未修改任何仓库文件。** 探测脚本写在临时目录 `%TEMP%\s03probe\`，只读 `prototypes/`。

---

## 结论摘要

| 问 | 答 |
|---|---|
| S03 的带高是写死的吗 | **是**，`round(秒数 × 28/30)` 逐条内联 |
| 少带子会怎样 | **不变短，留洞**：8 条→3 条，带区从 335px 缩到 96px，但三栏行高仍 640px，**中间栏留下 544px 垂直空白**，且该空白正好压在年代轴 1957→1977 的刻度上 |
| `degrades` 该判什么 | **`yes`**（验证 Agent 的判断成立） |
| minItems=8 对吗 | **数字对、语义错**：8 是设计规模，与带数一致；但 `degrades=no` 让下游把「8」读成「可增减，设计时 8 条」 |
| S21 呢 | **该判 `yes`**（同一处漏判，且比 S03 更硬：`--at` 绝对定位 + 13 处写死「14」） |
| 还有谁可疑 | S16（`--slot` 阶梯留 48px 断口）、S07（`start="19"` 编号续接断裂）；S18/S30 的文档与 JSON 已不一致（非漏判，但同属数据错误） |

**一句话**：验证 Agent 对 S03 的判断方向正确，但**理由说错了一半**——问题不是「带子高度写死」（高度写死不会留洞，它只是让每条带子的粗细固定），而是 **`.chrono` 三栏 grid 的行高由左栏 `.axis{height:640px}` 撑住**，带子再少那 640px 也不会收缩。真正留洞的是**垂直方向**，不是水平方向。

---

## ① S03 机制实况

### 1.1 带高怎么定的：写死，逐条内联

`prototypes/S03-long-exposure-observatory/index.html:71-102`，8 条 `figure.band`，每条一个内联自定义属性：

```html
71:  <figure class="band" style="--h:28px">      <!-- 73 行 figcaption：30 s -->
75:  <figure class="band" style="--h:42px">      <!-- 45 s -->
79:  <figure class="band" style="--h:14px">      <!-- 15 s -->
83:  <figure class="band" style="--h:56px">      <!-- 60 s -->
87:  <figure class="band" style="--h:19px">      <!-- 20 s -->
91:  <figure class="band" style="--h:37px">      <!-- 40 s -->
95:  <figure class="band" style="--h:84px">      <!-- 90 s -->
99:  <figure class="band" style="--h:23px">      <!-- 25 s -->
```

换算关系 `--h = round(秒数 × 28/30)`：28/30=0.9333，30s→28px、45s→42px、15s→14px、60s→56px、20s→19px(18.67)、40s→37px(37.33)、90s→84px、25s→23px(23.33)。**验证 Agent 这条说对了。**

消费这条变量的是 `style.css:149`：

```css
149: .band img { display: block; width: 100%; height: var(--h); object-fit: cover; background: var(--panel-2); }
```

`.band` 本身不定位（`style.css:145-148`）：

```css
145: .band {
146:   position: relative; margin: 0 0 4px; padding-right: 234px;
```

`.stream` 只是普通块容器（`style.css:144`：`.stream { position: relative; }`），**没有** grid/flex/absolute 子项定位。所以「带子高度写死」这件事，本身**不产生洞**——它只决定每一条带的粗细。这一点验证 Agent 用错了论据。

### 1.2 8 条变 5 条（或 3 条）会怎样：不变短，留垂直空洞

**CDP 实测（1440×900，全页加载后删 DOM 节点）**：

| | 8 条带 | 5 条带 | 3 条带＋3 行表 |
|---|---|---|---|
| `.band` 条数 | 8 | 5 | 3 |
| `.stream` 高 | **335px** | **141px** | **96px** |
| `.axis` 高 | 640px | 640px | **640px（不变）** |
| `.chrono` 行高 | **786.9px** | **786.9px** | **640px** |
| 中间栏垂直空白 | 451.9px | 499px | **544px** |
| 文档总高 | 4591px | 4591px | 4444px |

关键三行：删掉 3 条带子，**`.chrono` 的行高从 786.9 一点没动**，`.stream` 从 335 缩到 141，差额 194px 全部变成中间栏的空白。删到 3 条时行高才降到 640（因为右侧读数表也删到 3 行、比 640 矮了，此时由左栏 640px 独占行高），中间栏空白 544px = 640 − 96。

**这就是说 `degrades=no` 判错了的直接证据**：按判据 `no` 应表示「删条目只是变短」，但实测**页面几乎没变短**（4591→4444，只少 147px，因为右表也在同步缩减），变的是**中间栏多出 544px 的死白**。

### 1.3 640px 年代轴与 8 条带的关系

`style.css:129-133`：

```css
129: .axis {
130:   position: sticky; top: 24px;
131:   height: 640px; padding: 16px 12px;
132:   background: var(--panel); display: flex; flex-direction: column; gap: var(--u);
133: }
```

三栏容器 `style.css:123-126` 与 `:222-225`：

```css
123: .chrono {
124:   display: grid; grid-template-columns: var(--axis-w) minmax(0, 1fr);
125:   gap: var(--gutter); align-items: start;
...
222:   .chrono { grid-template-columns: var(--axis-w) minmax(0, 1fr) minmax(0, 540px); }
223:   .axis { grid-column: 1; }
224:   .stream { grid-column: 2; }
225:   .readouts { grid-column: 3; margin-top: 0; }
```

关系是：**轴不是「和带子等高」，而是轴把整行的最小高度钉在 640px**。`align-items:start` 让三栏各自顶对齐、各自量自己的高度，但 grid 行高取三者最大值——轴恒定 640px，所以行高下限就是 640px。带子变少，行高就由这 640px 兜底，缩不下去。

年代轴自己的刻度也是写死的，与带数**零耦合**（`index.html:62` 的 `viewBox="0 0 264 640"`；`:229-232` 按 8px 步进画 81 条线；`:234-235` 的 `years=[1957,1962,1967,1972,1977]`、`drift=[0,1.13,2.26,3.02,4.15]`）。这一点与 `build-prompts.mjs:90` 判断一致（「撤 S03：年代轴是 5 个字面量…与 8 条带零耦合」）——**但那句结论只证明了「不 hard」，不能推出「degrades=no」**，两件事正交。

**渲染出来的后果**（见截图 `s03-3b3r-chrono.png`）：轴上的 1957/1962/1967/1972/1977 五档刻度仍均匀铺满 640px，而右侧只剩 3 条总高 96px 的带子挤在顶部——轴上 1977 那段刻度对着的是**空白**。这就是「作者数出来的位置」：轴按「23 个观测年、8 条带子铺满」设计，内容少了不会重算。

### 1.4 窄屏同样成立

- 1280×900（读数表落到带子下方，`style.css:232-236`）：3 条带时 `.chrono` 高 954.6px、`.axis` 560px、`.stream` 96px，**中间栏仍空 464px**。
- 390×844：8 条时带区 366.3px / 轴 460px；5 条时 194.7px / 轴仍 460px，空白从 93.7px 涨到 265.3px。

`style.css:249-263` 明确写了窄屏「年代轴不折成顶部横条（规格原写法会停用机制），改为 88px 的纵向 sticky 轨」——即**轴的高度是机制的一部分，作者刻意不让它随内容走**。这进一步支持 `yes`。

---

## ② 按判据应判什么

`deliverables/60-minitems-degrade-audit.md:11-16` 的判据原文：

```
2. **degrades** — 单元从 N 砍到 N/3 后版式是否还成立。**只认代码**：
   - `no`：单元靠 grid/flex 自动流排布（`grid-column: span var(--s)`、`flex`、`column-count`、
     `auto-fit`），删条目只是变短；
   - `yes`：位置写死 —— 绝对定位、写死的 `grid-row/column` 坐标、手绘 SVG 绝对坐标、
     写死编号的行标题、JS 里硬编码的索引数组；
```

`no` 的实质判定是**「删条目只是变短」**。S03 实测**不变短**：删 5 条带，文档只瘦 147px（因为右表同步缩减），中间栏多 544px 死白，而 640px 轴把行高钉死。

`yes` 列举的五种形态，S03 命中的是第 4 类的一个变体：**写死的行高容器**（`.axis{height:640px}`）+ 写死的刻度数组（`years`/`drift` 共 5 个坐标写死在 JS 里，`index.html:234-235`）。判据列举的是「位置写死」，`.axis` 的 640px 正是**垂直位置/尺度的写死**——它规定了「23 个观测年压进 640px」这个版面契约，这个契约不会随内容重算。

> 原审计 `60-minitems-degrade-audit.md:27` 对 S03 的依据写的是：
> 「`index.html:70-102` 8×`figure.band`（`.stream`），每张 `style="--h:28px…84px"` 只是条高；`style.css:145` `.band` 普通块流，`:144` `.stream{position:relative}` 不定位子项。」
>
> **这段依据本身没错，但推不出 `no`。** 它只检查了「带子之间是否互相定位」（水平方向），**完全没检查容器的行高由谁决定**（垂直方向）。判据问的是「版式是否还成立」，而 `.axis{height:640px}` 恰好是让版式在内容变少时**不成立**的那一条规则。这是静态读 CSS 时最容易漏的一类：定位规则在子项上找不到，洞却在容器上。

**所以：S03 应判 `yes`。** 验证 Agent 的结论对，理由要换成「640px 定高轴把行高钉死，带区缩减全部转成中间栏空洞」。

---

## ③ minItems 核实

`prototypes/_prompts/minitems-parsed.json:14-19`：

```json
 {
  "id": "S03",
  "minItems": 8,
  "degrades": "no",
  "minPics": 8
 },
```

`8` 与 DOM 里 8 条 `figure.band`（`index.html:71/75/79/83/87/91/95/99`）**对得上**，与文档 `60-minitems-degrade-audit.md:27` 的 `8` 也一致。**minItems 数字本身没有错**，不是「另一个错误」。

错的是**语义耦合**：`degrades=no` 时，下游把 `minItems` 读成「设计规模，可增减」。`prototypes/_selection/app.js:226-227`：

```js
226:    return '<span class="cap cap-ok" title="单元靠自动流排布，删条目只是变短，不会留洞">' +
227:      '条目可增减（设计时 ' + cap.minItems + ' 条）</span>';
```

即 S03 卡片上现在写「条目可增减（设计时 8 条）」——对一条「删了会留 544px 死白」的版式，这是**明确的错误承诺**。

而详情页的「粘给谁都行」出现在 `prototypes/_selection/prompt-copy.js:471-480`：

```js
471:    var riskyTopic = !!s.hard;
472:    var riskyCount = !!(s.capacity && s.capacity.degrades === "yes");
473:    if (riskyTopic || riskyCount) {
...
479:      hint.textContent = "粘给 ChatGPT / Claude / v0 都行，约 " + buildPrompt(id).length + " 字";
```

S03 的 `hard` 已在 2026-10-27 复验时撤销（`build-prompts.mjs:90`），`degrades` 又是 `no`，两条都为假 → **详情页顶部确实打出「粘给谁都行」，零警告**。验证 Agent 这条描述属实。

同时，S03 的提示词第 2 条会走 `prompt-copy.js:237` 的自动流分支：

```
237:        : "2. 这个版式是自动流排版，条目增减只会让页面变短、不会留空位。按你真实的数量排即可，不要为了凑数编造内容。",
```

—— 这句对 S03 是**事实错误**。AI 照这句话排 3 条带子，会得到一个中间栏空 544px 的版面，而且提示词明确告诉它「不会留空位」，它不会去做补偿。

**附带发现（非本次任务范围，但同属数据错误）**：`minitems-parsed.json` 与 `60-minitems-degrade-audit.md` 的表格有 **2 处不一致**（逐行比对全部 30 条，仅这 2 条不同）：

| 案 | 审计文档 | minitems-parsed.json | 现状 |
|---|---|---|---|
| S18 | `degrades=no`（文档 `:42`） | `degrades=yes`（JSON `:107`） | 文档旧、JSON 新 |
| S30 | `degrades=yes`（文档 `:54`） | `degrades=no`（JSON `:179`） | 文档旧、JSON 新 |

原因在 git 历史里写着：`87a0235` 的提交说明第 8 条「数据修正：S18 / S30 的 degrades 判反了（审计 Agent 逐案读 CSS）」改了 JSON，**但没回写 `60-minitems-degrade-audit.md`**。所以文档的「13 案 yes」名单（文档 `:56-74`）和「可放心用」名单（文档 `:86-88`）现在都是过期的。S30 尤其危险：文档 `:54` 仍把 S30 列进「绝不能用（degrades=yes）」，而线上 JSON 是 `no`。

---

## ④ 另外 4 个 hard 案的 degrades 复核

当前值（`minitems-parsed.json`）：S15=`yes`、S18=`yes`、S21=`no`、S29=`yes`。

### S15 渔业平面台账 = `yes` ✅ 判对

`prototypes/S15-fishery-floor-ledger/index.html:139-152`，14 个热区，每个是手绘绝对坐标的 SVG `<rect>`：

```html
139:  <a class="hot" href="#z-B-3" data-code="B-3" ...><rect class="edge" x="104" y="96" width="288" height="208"/><rect class="ring" x="96" y="88" width="304" height="224"/><text class="zlab" x="113" y="116">B-3</text></a>
```

14 个区的 x/y/width/height 逐个不同，拼成一张无重叠的舱室平面。删一区，平面图缺一块，且与 `:278` 的 14 行登记表（`caption`「网具舱与港池的 14 个热区」）对不上。判据第 3 类「手绘 SVG 绝对坐标」直接命中。**`yes` 正确。**

### S18 荧光粉服务纸 = `yes` ✅ 判对（且与 S03 同型，可作交叉验证）

`prototypes/S18-phosphor-service-deck/style.css:121-132`：

```css
121: /* 只有悬挂区里的牌是绝对定位的（按 --at 挂在对应回执行的右侧）；纸头那一张走正常流 */
132: .hangrail .hang{position:absolute;left:0;top:calc(var(--at,0) * var(--line) + 2px)}
```

`index.html:172/179/186/201` 四张牌，`--at` 分别 5 / 10 / 18 / 28。CDP 实测印证：删掉第一段前 3 行 `.ln` 后，日志行整体上移 72px（`ln0` 1809.5 → 1881.5），而**四张牌的 `hangTops` 完全不动**（1931.5 / 2051.5 / 2243.5 / 2483.5 一字未变）。

这正是「作者数出来的位置」：`--at` 是**绝对行号 × 行高**，行数一变，牌就对不上它注释的那一行。**`yes` 正确。**

> 注意：S18 的 `minItems=20` 是按「每段 20 行 `span.ln`」算的（实测 3 段各 20 行 = 60 个 `.ln`），而真正的重复版面单元是 **4 张 `.hang` 牌**。这个 20 vs 4 的口径问题原文档 `:97-98` 自己也承认过（「S18 的 17 是 `pre.lines` 里 `span.ln` 的行数（正文行，不是条目）」）。可另立一条，但**不影响 `degrades=yes` 的判定**。

### S29 钢丝装安全手册 = `yes` ✅ 判对

`style.css:215-224` 逐点写死索引，`index.html` 里 23 个 `g.pt` 的 `path d` 是手绘坐标。CDP 实测：`nPt=23`、零件表 `nAxisRow=23`、编号 `01…23` 连续、`--i` 从第 8 个起依次赋 0…16（`idxVars` 前 7 个为空、第 8 个起 0,1,2…16）。图上点位与表行号必须同号，删一件即错号。**`yes` 正确。**

### S21 联锁释放簿 = `no` ❌ **判错，应为 `yes`**

原判据依据（文档 `:45`）：「`.path__rail{display:flex;flex-direction:column;gap:1px}` 自动堆，`--i` 只用于 `animation-delay`，不参与落位」。

**前半句对，后半句漏了。** `--i` 确实只控制动画延迟（`style.css:595-598`），但真正的问题在 `.path` 的 grid 定位：

```css
491: .path{
492:   grid-column:5 / span 2;
...
497:   grid-row:1;
498:   position:sticky;
499:   bottom:48px;
```

`.path` 被**写死**在 10 栏 grid 的第 5–6 栏、第 1 行，且 `position:sticky`。而 `.board__grid` 的第 1 行高度由两张表撑住（左表 547.5px、右表 405.1px），中缝那条 rail 只有 349px。

CDP 实测（1440×900）：

| | 14 枚 | 5 枚 |
|---|---|---|
| `.board__grid` 高 | **556.5px** | **556.5px（不变）** |
| `.path` 高 | 516.5px | **291.5px** |
| `.path__rail` 高 | 349px | **124px** |
| rail 下方空白 | 39.9px | **264.9px** |
| 文档总高 | 3854px | **3854px（完全不变）** |

**与 S03 一模一样的形状**：grid 行高由别的栏撑住，写死定位的中缝栏内容变少，差额全部变成垂直空洞，页面一个像素都不变短。

而且 S21 比 S03 更硬——**「14」被写死在 13 处**，删条目后会留下**文字层面的自相矛盾**（实测删到 5 枚后这些文本一字未改）：

```
index.html:7    meta description：「14 枚锁闭条拼成释放路径」
index.html:66   「上一时段的 14 枚锁闭条仍按原角度扣在原位」
index.html:230  <h3 class="path__h">释放路径 · 本时段登记 14 枚锁闭条</h3>
index.html:370  「走完 14 枚共 980 毫秒」
index.html:391  「14 枚锁闭条仍按原角度扣在原位」
index.html:412  「本簿 14 枚锁闭条由同一把刻刀逐条刻成…刻到第 14 枚时共偏出 3.5 像素」
```

再加 `style.css:608` 的 `steps(14,end)` 演示动画、`:576-584` 的「14 枚累计偏 3.5px」注释（条尾墨点按 `--i` 递减 0.25px，实测第 1 枚 3.25px → 第 14 枚 0px，**正好配平 14 枚**——这是判据里「写死编号的行标题」的同构形态：一个按数量配平过的视觉算式）。

按判据，S21 同时命中第 2 类（写死 `grid-column`/`grid-row` 坐标）与第 5 类（写死的编号文本）。**应为 `yes`。**

> S21 的 `hard=yes` 站得住（`pairs==excl` 14/14、`angle==15×pairs` 14/14，机制真读数据），但 `hard` 与 `degrades` 是两个正交的轴——`build-prompts.mjs:52-56` 自己也这么写。`hard=yes` 不能替代 `degrades=no` 的警告，因为两者在 UI 上是**两句不同的话**（`prompt-copy.js:475-476`）。S03 就是被「撤销 hard」直接推成零警告的。

---

## ⑤ 建议改动清单

### A. 必须改（`degrades` 判错，直接导致 UI 错误承诺）

| 案 | 现值 | 应改 | 证据 |
|---|---|---|---|
| **S03** | `no` | **`yes`** | `.axis{height:640px}`（`style.css:131`）把 `.chrono` 行高钉在 640px；8→3 条带，`.stream` 335→96px，中间栏留 544px 死白，文档只瘦 147px |
| **S21** | `no` | **`yes`** | `.path{grid-column:5/span 2; grid-row:1; position:sticky}`（`style.css:492/497/498`）；14→5 枚，rail 349→124px，rail 下方留 264.9px 死白，**文档总高 3854px 一像素未变**；另加 13 处写死「14」的文本 |

改后 S03/S21 的提示词会自动切到 `prompt-copy.js:234-236` 的手工定位分支、卡片切到 `app.js:223-224` 的黄色警告、详情页顶部不再说「粘给谁都行」。

### B. 需要先确认口径（`minItems` 与 `degrades` 的语义）

| 案 | 问题 |
|---|---|
| **S18** | `minItems=20` 数的是「每段 20 行正文行」，真正的版面单元是 **4 张 `.hang` 牌**。`degrades=yes` 判对，但 `20` 会误导 AI 写 20 张牌 |
| **S03** | `minItems=8` 与 8 条带子一致，无需改数字；改 `degrades` 后语义自然对齐 |

### C. 可疑名单（建议复核，本次未下终判）

| 案 | 现值 | 疑点 | 实测 |
|---|---|---|---|
| **S16 速度斜排宣言** | `no` | `--slot:0…8` 逐条写死在内联 style（`index.html:56/66/75/92/101/126…`），CSS `style.css:222` `margin-left:calc(var(--slot,0) * var(--step))`。原文档 `:40` 说「只改宽度不改位置，删块只是斜线少几级」——**不准确**，`--slot` 就是位置 | 9 块时左端 72/96/120/144/168/192/216/240/264（等差 24）；删第 5 块后 **168→192 变成 192 紧接 144，相邻差 48px**，斜线出现一个 2 倍宽断口。属「写死的索引数组」（判据第 5 类），**倾向 `yes`** |
| **S07 铅灰油墨目录** | `no` | 两段 `<ol>` 靠 `start="19"` 续接编号（`index.html:63`）；实测第一段 18 条、第二段 28 条=46。`column-count` 自动流成立，但**编号续接是写死的**：第一段砍到 6 条后，第二段仍从 19 开始 → 编号跳号（6→19） | 数字续接断裂，与 S19「写死编号的行标题」同型。**建议至少标注为边界案** |
| **S10 栅格对开页** | `no` | `.plate-strip{grid-template-columns:6fr 7fr 9fr 8fr 5fr}`（`style.css:151/304/350`）五列写死配 5 张图（`index.html:310` 起，实测 5 个 `<img>`）。原文档 `:34` 已注明「只是收尾图带」 | 删图会留一格空列，但只影响收尾带，不动主体。**维持 `no` 可接受，但理由应写明是二级图带** |
| **S02 烫金对称沙龙** | `yes` ✅ | `style.css:409` `.ladder-right .step:nth-child(n + 8){display:none}`、`:438` `.step:nth-child(n + 6){display:none}` — 硬砍，判对 | — |
| **S22 / S20 / S05** | `yes` ✅ | 原文档依据的行号需抽查，本次未逐条复算 | — |

### D. 文档与数据不一致（必改，否则下一轮审计还会读错）

`deliverables/60-minitems-degrade-audit.md` 已过期两处，需回写：
- `:42` S18 的 `degrades` 应为 `yes`（现写 `no`）
- `:54` S30 的 `degrades` 应为 `no`（现写 `yes`）
- `:56-74` 的「13 案 yes」名单、`:86-90` 的两份清单、`:74` 的案号枚举，都要跟着改（S30 移出、S18 移入）

### E. 顺带（UI 文案层，非本次判定）

`app.js:227` 对 `degrades=no` 写「条目可增减（设计时 N 条）」。即使改完 S03/S21，这句对 `no` 案的措辞仍偏乐观——它承诺「可增减」，而 `no` 只保证「变短不散架」。建议改为「删条目只会变短，不散架」。

---

## ⑥ 我的判断如果有错，错在哪

诚实列出本报告最可能被推翻的三处：

**1. 「640px 定高轴 → 留洞」这条因果，依赖「用户会保留 `.axis` 的 640px」。**
我删的是 DOM 里的 `.band`，没删 `.axis`。真实用户拿提示词重做时，AI 完全可能把轴高度改成自适应（`height:auto` 或按带数算）。**若 AI 重写了轴高度，S03 就不留洞，`no` 反而是对的。** 但判据是「按现有代码判」——现有代码写死 640px，所以 `yes`。这一层是我和原审计的**判据分歧**：原审计只看「单元自身是否定位」，我加上了「容器是否把行高钉死」。如果 lead 认为判据只认「单元自身的定位规则」，那 S03/S21 都应维持 `no`，本报告的两条主结论同时作废。

**2. S21 的 264.9px 空白，可能被读成「sticky 中缝本来就不该填满」。**
`.path{position:sticky;bottom:48px}` 是刻意的，中缝短于两侧表在 14 枚时就已经存在（39.9px）。可以说「中缝本来就留白，多留一点不算散架」。我的反驳是：39.9px 是设计留白，264.9px 是内容不足的空洞，且伴随 13 处「14 枚」的文字谎言——文字矛盾这一条不依赖我的行高论证，独立成立。

**3. S16 我只做了单点删除，没验证「删到 N/3」（3 块）。**
9 块删到 3 块时，`.slab:nth-of-type(odd/even)` 的两列错位（`style.css:452-453`）会接管，`--slot` 阶梯可能被覆盖，结论或变。我给的「倾向 `yes`」是**基于 9→8 单点删除的 48px 断口**，不是 N/3 全测。这一条我标为「可疑、待复核」而非终判，就是为此。

**另外两处需要说明的自我限制：**
- 我**没有**改任何文件（用户硬性要求），所以以上所有「应改」都只是建议，需要 lead 或执行 Agent 落地。
- S02/S05/S20/S22/S23/S30 我只读了文档结论与部分 CSS，**没有逐案跑 CDP**，不在本报告背书范围内。

---

### 复现方式

探测脚本在 `%TEMP%\s03probe\probe.mjs` / `probe2.mjs` / `probe3.mjs` / `probe4.mjs`（临时目录，未入库），均从仓库根 import `tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs`，起一个只读静态服务器指向 `prototypes/`，`Browser.launch()` → `newPage({width:1440,height:900})` → `goto()` → `eval()` 删节点后量 `getBoundingClientRect()`。截图在 `%TEMP%\s03probe\shots\`。

关键截图：`s03-8bands-chrono.png`（正常）、`s03-3b3r-chrono.png`（3 条带 + 3 行表，可见中间栏 544px 死白与轴刻度空转）、`s21b-5.png`（5 枚锁，中缝 264.9px 空洞）。
