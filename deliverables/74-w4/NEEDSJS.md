# needsJS · 30 案签名机制是否需要 JavaScript

**产出**：`deliverables/74-w4/`
**脚本**：`extract.mjs` · `structure.mjs` · `sentence.mjs` · `sites.mjs` · `vars.mjs` · `classify.mjs` · `resolve.mjs`
**数据**：`script-signals.json` · `structure.json` · `sentence.json` · `sites.json` · `vars.json` · `classify.json` · `resolved.json`
**重跑**：`node deliverables/74-w4/classify.mjs && node deliverables/74-w4/resolve.mjs`

---

## 1. 谓词

### 1.1 机器部分（`classify.mjs`，无手工表）

对每案取其全部脚本体（`index.html` 内联 + `src=` 外链，S07 走 `app.js`）。

**根（ROOTS）**：把回调交给事件源的调用，带**回调的文本区间**。
`addEventListener('scroll'|'pointermove'|'resize'|'click'…)`、`requestAnimationFrame(fn)`、`new IntersectionObserver(fn)`、`setTimeout(fn)`。

**写入点（WRITE）**：创建或改写几何的调用。
`setProperty('--x')`、`.style.transform|left|top|width|height|filter =`、`setAttribute('d'|'points'|'cx'|'cy'|'x1'|'y1'|'x2'|'y2'|'transform')`、`createElement(NS)`、`innerHTML =`。

**驱动归属靠调用图可达性，不靠行距离**。写入点先按区间归属到根回调；随后沿调用图闭包传播 —— 命名函数若在已带某驱动种类的区间内被调用**或被当作回调裸传**（`requestAnimationFrame(par)`、`addEventListener('scroll', req)`），该函数区间及其内部写入点继承该种类。迭代到不动点（≤12 轮）。

这一步是必需的，不是过度设计：S08 的 `par()` 只由 `:313 function req(){ … requestAnimationFrame(par) }` 间接调用，而 `req` 才是 `:314 addEventListener('scroll', req)` 的登记对象。只看调用点邻近会漏掉 `scroll`。

**GEO(v)=1** 当且仅当 `style.css` 在几何声明里消费变量 v。几何声明集合：
`transform / translate / left / top / right / bottom / margin* / width / height / inset / grid-column / clip-path / offset-distance / filter / background-position(-x|-y) / perspective / scale / rotate`。

> **`background-position` 必须在内。** 漏了它，S18 的机制（走纸）会被误判成纯装饰 —— 它的实现是 `style.css:73` `background-position-y: calc(-1 * var(--tug,0px))`，`--tug` 由 `index.html:427` 的 scroll 处理器写。S02 的 `@keyframes foil-drift`（`style.css:403`）改的同样是 `background-position-y`。任何只看 `transform/left/top` 的分拣器在这两案上必错。

### 1.2 三个判据

| 类 | 定义 |
|---|---|
| **A** | 签名的**可见几何**由 JS 在运行时推导：∃ 合成点 w（`createElement(NS)` / `setAttribute('d'\|'points'\|'cx'…)`），且 w 由**实测的活体 DOM**（`getBoundingClientRect` / `getComputedStyle`）或**对变量参数的闭式公式**（`Math.sin/cos/atan2`）导出，且落在机制句所述区域。静态 CSS/SVG 不重新推导就复现不了。 |
| **B** | ¬A，且几何在某个驱动下真的动（`scroll`/`pointer`/`raf`，或 `io`/`ui` 的状态切换拧了 GEO=1 的变量）。几何归 CSS 所有，JS 只拧旋钮。 |
| **C** | 其余。JS 是壳：按钮、错误态、加载、IO 揭幕、reduced-motion 兜底。机制是 CSS 或静态 SVG。 |

### 1.3 手工输入只有五个轴（`resolve.mjs` 的 `I` 表，逐案带理由）

| 轴 | 问什么 |
|---|---|
| `motion` | **机制句本身**是否含运动/交互子句（滚动 / 跟随 / 漂移 / 进视口 / 按下 / 时相） |
| `cssMotion` | 若含，该运动能否用纯 CSS 表达 |
| `geoRuntime` | 签名**几何**是否运行时推导（实测或闭式公式） |
| `onMech` | 该 JS 几何/运动是否就是句子所述的那件事（`yes`/`partial`/`no`） |
| `chrome` | 唯一在动的 JS 几何是否只是跟指针的光标（非内容件） |

`cssMotion` 对 30 案**全部为 true**。这是仓库自己的证据：S16 在 `style.css:505-512` 写了 `@supports (animation-timeline: scroll()) { animation: reduce-slide 1s linear both; animation-timeline: scroll(root block) }`，把滚动位移交给 CSS 时间轴。**注意它坐落在 `@media (prefers-reduced-motion: reduce)`（起始于 `:488`）里的降级路径**，不是主路径（主路径仍走 JS 的平方关系，见 `:297-298` 注释）。所以它证明的是「这套位移**技术上** CSS 时间轴可表达」，不是「作者认为主路径该用 CSS」。

既然滚动映射都能用 CSS 做，那么「按下」(`:active`)、「进视口」(`view-timeline` 或 IO 加类）、「光源翻转」（类）就更不构成 JS 必需。**`cssMotion` 恒真这一结论抓住了一件事：机制句里的运动几乎从不是 JS 的不可替代理由 —— 它最多是不想写 CSS 时间轴的理由。**

### 1.4 三种判决

```
LITERAL      : A iff geoRuntime ; B iff motion ; C 其余
PROTO-STRICT : A iff geoRuntime ∧ onMech≠'no' ; B iff ¬A ∧ 有几何在动 ∧ ¬chrome ∧ onMech≠'no' ; C 其余
PROTO-LOOSE  : A iff geoRuntime ∧ onMech≠'no' ; B iff ¬A ∧ 有几何在动 ∧ ¬chrome ; C 其余
```

两个原型读法只差一个条件：**句子没提的运动算不算**。这就是批评者那份 A3/B14/C13 与内部分歧的全部来源。

---

## 2. 三张表

### 2.1 字面读法 —— **A=2 / B=5 / C=23**

| 案 | 判 | 依据 |
|---|---|---|
| **S07** | **A** | 句子要「同一段文字在纸背以 8%–14% 不透明度做镜像」—— 坐标来自实测字号与位置，静态声明做不出 |
| **S20** | **A** | 句子要 1840 段正弦极坐标走线，`r = 96 + i·sp + t·(25sin(11θ+0.35) + 8sin(13θ+2.1))` |
| S03 | B | 「刻度轴**随滚动固定**…游标**随**焦距比**移动**」——运动子句，但 CSS scroll-timeline 可做 |
| S06 | B | 「漂移速度为**滚动量的 0.6 倍**」 |
| S08 | B | 「**滚动 200px** 走 6px」 |
| S10 | B | 「**进视口时**先错 3px 再收到 1.5px」 |
| S13 | B | 「**按下时**方位角翻到 315° 并下沉 0.8px」——`:active` 即够，但句子确实承诺了运动 |
| 其余 23 | C | 句子全由角度/栏宽/偏移/线宽/不透明度构成 |

**与批评者「字面 A3/B4/C23」的差异**：A 我只给 2（S07/S20），他给 3。S03 的刻度线是**两条** `repeating-linear-gradient` 的事（`index.html:220-232`：`:224` 按 `w>1` 二选一颜色，`:231` 按 `major` 二选一起 x 176/208，`:230` `major=(640−y)%40===0` 每 5 条一次），所以它**不满足**「静态 CSS 不可复现」。B 是 5 对 4，多出的是 S13 —— 他的词表漏了「按下」这类状态型子句。

### 2.2 原型·严格读法 —— **A=2 / B=10 / C=18**

只承认机制句所述区域内的运动。

| 案 | 判 | 运动件 | 证据 |
|---|---|---|---|
| **S07** | **A** | 纸背镜像 | `app.js:28-30` 逐行实测 + `:23-43` 建节点 |
| **S20** | **A** | 走线重排 | `index.html:272-274` trig、`:311 setAttribute('d')` |
| S02 | B | 纹样相位 | `:266` scroll→rAF 写 `foilB.style.transform`，`p=−(scrollY/100)×3` |
| S03 | B | 影像带上移 | `:259-262` scroll 里按实测位置 `translateY` 0.5px |
| S05 | B | 拨杆位置 | `:322/:344` 写 `--pos`，`style.css:315 translateY(calc(var(--pos)*76px))` |
| S06 | B | 河道漂移 | `:357-369` 实测 + `--dy`/`--rail-drift` |
| S08 | B | 层深视差 | `:303-310` `scrollY/200` → 三层 transform |
| S10 | B | 套准回位 | `style.css:32-33/211/216/212` + `:486` 加 `.settled` |
| S14 | B | 质心平漂 | `:363` 写 `--sy`，`style.css:126` 消费（`onMech=partial`） |
| S18 | B | 走纸 | `:427` 写 `--tug`，`style.css:73` `background-position-y`（`onMech=partial`） |
| S28 | B | 三速率跟随 | `:449` `img.style.transform`，速率 1.0/0.92/1.06（`onMech=partial`） |
| S30 | B | 三角波推挤 | `:286-287` `--push`/`--mis` |
| 其余 18 | C | — | — |

### 2.3 原型·宽松读法 —— **A=2 / B=13 / C=15**

任何内容几何在动就算。比严格读法多三案：

| 案 | 严格 | 宽松 | 为什么翻 |
|---|---|---|---|
| S16 | C | **B** | `:291` 写 `--shift`（平方关系速度线）、`:294` `--rung`（进度尺），确实在 scroll 里动 —— 但句子说的是 12°/24px/栏宽，与速度线无关（`onMech=no`） |
| S25 | C | **B** | `:364-370` scroll 写 `--follow`（1:0.94 跟随），句子只说「错开 0.8–1.6px、缩进 0/12/24px」 |
| S26 | C | **B** | `:465-469` scroll 写 `--p`（三速率视差），句子只说倾 11°/5:3:4/压叠 1.5/1.2px |

S13 在两读法下都是 **C**：它唯一在动的几何是 `:404` 的 6×6 压痕光标（`chromeOnly=true`），而句子要的「按下 135°→315°」由 `style.css:439 .btn:active{transform:translateY(0.8px)}` 完成 —— 纯 CSS。

---

## 3. 与前三次读数的比对

| 读数 | A | B | C |
|---|---|---|---|
| 文档 agent | 3 | 9 | 18 |
| 批评者·字面 | 3 | 4 | 23 |
| 批评者·原型 | 3 | 14 | 13 |
| **本次·字面** | **2** | **5** | **23** |
| **本次·严格** | **2** | **10** | **18** |
| **本次·宽松** | **2** | **13** | **15** |

**三次读数都给了 A=3，但三次的 3 都不是同一个集合，而且三次都错了。**

正确的 A 只有 2 案：**{S07, S20}**。
- **S07 被所有人漏掉**。它常被归 C，理由大概是「脚本只跑一次，像初始化」。恰恰相反：`app.js:28-30` 的逐行 `getBoundingClientRect` + `getComputedStyle` 是整个仓库最标准的「实测-再排」，`app.js:10` 的 `MIRROR_BUDGET=46` 是实测驱动的截断。
- **S03 被所有人算进 A**。但它的 81 条刻度线是两条 `repeating-linear-gradient` 的事（细线 8px 步进起 x=208、粗线 40px 步进起 x=176）；真正必须 JS 的只有 `:259-262` 那条按实测位置滚动上移 —— 那是 B，不是 A。
- S20 确认是 A，但见 §5 的限定。

批评者的**原型 A3/B14/C13** 与我宽松读法的 A2/B13/C15 合计都等于 30。差额是 −1 A / −1 B / +2 C，即**至少两案不同**：确定的一案是 **S03（他 A、我 B —— 刻度线可写成 `repeating-linear-gradient`）**；另一案落在 B/C 边界，最可能是 **S13**（他把压痕光标算作运动件，我按 `chrome=true` 排除）。除这两案外，S02/S05/S06/S08/S10/S14/S18/S28/S30 的归属与他完全一致 —— 说明**分歧很小且可指名，不是一整套判断不同**。

---

## 4. 十个争议案的裁决

### S02 — 脚本确实驱动机制；文档 agent 判 C 只在字面读法下站得住
`index.html:250-251` 注释：「签名机制：滚动 100px 对应右侧纹样相位 3px，线性映射」。`:253-266` `phase()`：`:254` 读 `pageYOffset`，`:266` `foilB.style.transform = 'scaleX(-1) translateY(' + p + 'px)'`，`p = -(y/100)*3`。`:369 addEventListener('scroll', onScroll, {passive:true})` → `:365-368` → `requestAnimationFrame` → `phase()`。机器确认该写入点驱动为 `raf|scroll`（`classify.json` S02 唯一带驱动种的 `style` 写入）。

**字面 C / 原型 B**。批评者说文档 agent 判 C 错 —— 在原型读法下成立；字面读法下文档 agent 没错（句子没提滚动）。**「文档 agent 错」这个说法本身需要限定读法**。

### S03 — A 证据成立但不是「CSS 不可能」
`index.html:62` 是空 `<svg class="scale" id="scale" viewBox="0 0 264 640" preserveAspectRatio="none"></svg>`。`:229-232` 循环 `for (var y=640; y>=0; y-=8)` 造 **81 条** `line`（每 40px 加粗到 1.5px），`:234-250` 再为 5 个年份造 `text` + `rect` 齿孔。`:259-262` 在 scroll 里按 `getBoundingClientRect` 把影像带整体上移 0.5px。

**但刻度线等价于两条 `repeating-linear-gradient`**：`:220-228 line(x1,y1,x2,y2,w)` 里 `:224` 的 `stroke` 按 `w>1` 二选一（major `#C9D6CF` / minor `#4A5A5E`），`:231` 的 `x1` 按 `major` 二选一（176 / 208），`:230` 的 `major = (640−y)%40===0` 即每 5 条一次。所以它只是**「8px 步进的细线 + 40px 步进的粗线，两条不同起 x」** —— 两条渐变各画一类即可，无需 81 个 DOM 节点。

「CSS 物理上做不到」对 S03 **不成立**。所以 `geoRuntime=false`，**判 B 而非 A**。这是我与三次旧读数最实质的分歧。

### S07 — 最干净的 A
`index.html:94` 空 `<svg class="ghost" aria-hidden="true" focusable="false"></svg>`。`app.js:15-46`：
- `:16-17` `pages.getBoundingClientRect()` → W/H
- `:22` 清空 ghost，`:23-24` `createElementNS('g')` + `setAttribute('transform','translate(W,1) scale(-1,1)')`（1px 纸厚）
- `:26-31` 每行 `:28 getBoundingClientRect()`、`:29 getComputedStyle()` → `{left, top, text, size}`
- `:34-43` 逐个 `createElementNS('text')`，写 x/y/font-size
- `:10` `MIRROR_BUDGET=46`

坐标来自**实测的文本位置与字号**。手工复制一份镜像 DOM 无法跟踪每行实测字号，也无法复现 46 行截断。**判 A**。

### S14 — 纯 CSS 定位 + 纯 CSS 漂移，脚本动的是句子没写的东西
站位由 `build/polar-layout.py` 烘出、写进 `index.html:70-133` 的内联 `--dx/--dy/--w`（11 枚），由 `style.css:166-171`：
```css
.tag { position:absolute; left:44%; top:50%;
  transform: translate(-50%,-50%)
             translate(calc(var(--dx) * var(--k) * 1px), calc(var(--dy) * var(--k) * 1px))
             translate(var(--px, 0px), var(--py, 0px)); }
```
「48px 半径平漂」是 `style.css:281-291 @keyframes drift`，`--dr:48` 在 `:130`，断点降级 `:325 --dr:24`、`:393 --dr:0`。**句子的每一项都在 CSS/内联变量里。**

脚本额外两件：`:345-346` 指针牵引写 `--px/--py`、`:363` scroll 写 `--sy`（`style.css:126` 消费）。**判字面 C / 原型 B（`onMech=partial`）**。批评者说 S14「纯 CSS 尽管有脚本」—— 对机制句正确，对原型不成立。

### S16 — 纯 `calc()`；脚本动的是速度线，句子没提
`style.css:221` `width: calc(var(--span,9) * 100% / 12)`、`:222` `margin-left: calc(var(--slot,0) * var(--step))`。**`--span`/`--slot` 全部由 HTML 内联 style 写死**：`index.html:56` `--span:9;--slot:0`、`:66` `--span:6`、`:75/:92/:101/:126/:135/:152/:161` 依次 7/4/7/9/6/7/4。脚本 `:255` 只在断点变化时覆盖成**另一组写死值**（`:242 SPANS` 表）。

脚本的滚动件是 `:291 --shift`（平方关系速度线）与 `:294 --rung`（进度尺），句子一个字没提。**字面 C / 严格 C / 宽松 B**。批评者判「纯 CSS 尽管有脚本」，完全正确。

### S17 — 129 行确认是业务状态机
`index.html:15` `var stage='draft', busy=false, torn=false`。三段：`:54-80` 核验（draft→mismatch→verified，`:66` 错误码 `STUB-17`，`:72` 锁合计行）；`:82-104` CSV 导出（`:96-99` `new Blob([...],{type:'text/csv;charset=utf-8'})` + `createObjectURL`，`:286 createElement('a')` 下载锚点）；`:106-128` 期号切换改 `innerHTML`。几何只有 `:211 --row-index(i%20)`。**三读法皆 C**。

### S20 — 确认为 A，但 A 的定义要放宽（§5）
`:272-274` `r = R0 + i*sp + t*(A1*sin(L1*th+P1) + A2*sin(L2*th+P2))`、`xs.push(CX + r*cos(th))`；`:286 createElementNS('path')`；`:311 o.setAttribute('d', r.d)`。`:96` `Math.floor(window.scrollY/STEP())` → `PAR(n)` → 整图重排。23 圈 × 80 点 = 1840 段（`index.html:26/:69/:77` 三处读数一致）。

### S26 / S28 / S30 — 视差三兄弟
- **S26**：`:465-469` scroll→rAF 逐块 `getBoundingClientRect` 写 `--p`（钳 ±1.4），`style.css:147 transform:translateY(calc(var(--p)*var(--rate,1)))`。句子写倾 11°/5:3:4/压叠 1.5/1.2px —— 全静态。**C / C / B**。
- **S28**：`:440-451` scroll 内逐块量框，`:449 img.style.transform`（三速率），`:451 --edge`（`style.css:120/128/212 drop-shadow`）。句子写裁切 4–14px、出血 24px —— 静态。**C / B / B**（`onMech=partial`：视差是同一面墙的同一批块，只是句子没提速率）。
- **S30**：`:279-289 tick()` 三角波推 `--push` 到 24px、`--mis` 从 9 收到 0 再放回，`style.css:193/196/437` 消费。句子写「下半错开 9px」—— 静态读法是定值。**C / B / B**。

---

## 5. S20 的诚实限定：A 的定义太强，需收紧

`index.html:72` 的注释自己承认：

> 「基准三圈落在 HTML 里（无脚本也看得见），其余 20 圈按公式现算」

`index.html:73` 确实有 **3 条完整 `<path class="ring" d="M524 385l0 8 -1 7 …">`**，机器量出**每一条都是 81 组相对坐标**（`structure.json` S20 `longestDCoords=81@73`；全库次高 S15 是 63、S24 是 22）。

所以严格说：

| 命题 | 真假 |
|---|---|
| 「CSS 做不出这个形状」 | **假**。3 圈已经手写进了 HTML，再多 20 圈是同一件事。 |
| 「AI 在一个提示词的产出预算里做不出 23 圈 × 80 点 = 1840 段」 | **真**。 |
| 「参数联动做不出」（间距 0.6/1.2/2.4px 三档 → 圈数 `C=(ro−R0)/sp` 跟着变） | **真**。手写只能定格某一档。 |

**建议把 A 的定义从「CSS 物理上做不到」改成：**

> **A** = 签名几何由 JS **在运行时按参数/实测推导**；静态 CSS/SVG 若要等价，需要人工预生成与运行时同量级的手工数据（本案 1840 段），**或**需要固定住某个用户本该能改变的参数档位。此时提示词必须给 JS 配方。

按这个收法：S07 仍是 A（实测坐标 + 46 行截断）、S20 仍是 A（1840 段 + 三档联动）、S03 明确掉到 B。**这正是本报告给出 A=2 而不是 A=3 的理由。**

---

## 6. 建议：产品用哪个读法，徽章怎么写

**用「原型·严格」读法（A2/B10/C18），徽章分三档。**

理由：用户是在选型台上**看截图 + 点两下**判断的，比对的是屏幕上的原型。按字面读法，这 6 案会被打成「纯 CSS」但台子上看得见运动：**S02（纹样随滚动移相位）、S05（拨杆落位）、S14（指针牵引）、S18（走纸）、S28（三速率跟随）、S30（三角波推挤）**。用户照提示词做出来不会动，这是可预期的「说了谎」投诉。字面读法还有一处反向误差：它把 **S13 判成 B**（因为句子写了「按下」，但其实 `:active` 就够），而原型读法判 C —— 这条不会造成落差，只会让提示词多给一段无用 JS。

但也不能用宽松读法：S16/S25/S26 那些「机制句没提、原型在动」的件是润色，不是风格本身。用户要的是「像这个风格」。

| 徽章 | 含义 | 提示词怎么写 | 案 |
|---|---|---|---|
| **JS 必需** | 签名几何本身由 JS 推导；无 JS 就没有这个签名 | 给完整配方（算法 + 参数表 + 调用时机），并说明「这段不可省」 | **S07 S20** |
| **JS 可选** | 几何 CSS 可写；句子所述的事 CSS 可做；但原型里有一段 JS 拧的运动 | 给 CSS 主配方 + 独立可选的「运动段」JS，注明「删掉这段，风格仍成立」 | **S02 S03 S05 S06 S08 S10 S14 S18 S28 S30** |
| **纯 CSS** | 机制是 CSS 或静态 SVG；JS 只是按钮/错误态/入场 | 显式写「**签名机制不要用 JS**」，运动交给 CSS `animation`/`transition` | **其余 18** |

**徽章文案建议**（避免「需要/不需要 JS」这种会被截图取证的绝对话）：

- JS 必需 → 「签名几何由脚本按参数生成；提示词含完整 JS 配方」
- JS 可选 → 「版面 CSS 可写；随滚动/指针的运动用 JS，删掉仍成立」
- 纯 CSS → 「签名机制不用 JS；脚本仅用于按钮与错误态」

---

## 7. 证据真正含糊、不予强判的案子

| 案 | 含糊点 | 我给的标注 |
|---|---|---|
| **S05** | `:303-311 paint()` 确实按字数重排 5×7 点阵并改 `viewBox`，但首屏 7 处点阵已由 HTML 写死（`:76/:99/:125/:136/:147/:164/:179`），脚本只在拨杆变化时重绘；触发源是 `input`/`click` 非滚动。「生成器」与「静态数据 + 重绘」两种描述都成立。 | 严格/宽松都判 B（`--pos` 确实在拧 `translateY`），但 `onMech=partial` |
| **S09** | `:223-231 watch()` 写 `--d` 错开延迟（`:232 watch(document)` 调用，非滚动）；`:259 void lamp.offsetWidth` 是重启动画的 reflow 技巧。既不合成几何也不拧运动。 | C（若「悬停重描分六段」算签名，会升 B） |
| **S13** | 句子明写「按下时方位角翻到 315° 并下沉 0.8px」，实现是 `:373 flip()` 改 `body[data-azimuth]` + `style.css:439 .btn:active{translateY(0.8px)}` + `:613/:645` 反向阴影 —— 纯 CSS 态。唯一 JS 几何是 `:399-411` 的 6×6 压痕光标。 | 字面 B / 原型 C（`chrome=true`）。**若认定光标算签名，原型升 B。** |
| **S14** | 句子无运动词（「平漂」可读作静态圆弧轨迹），但 `@keyframes drift` 确实在动。 | `motion=false`，原型 B |
| **S16** | 严格 C / 宽松 B，取决于「速度线算不算签名的一部分」。句子没提，但它在首屏可见。 | 标 `onMech=no`，两读法分列 |
| **S18** | 句子「530ms 方波」是 CSS（`style.css:191-193 cu-blink 1060ms steps(1,end) infinite`），但原型另有 `--tug` 走纸。句子只写了一半。 | `onMech=partial`，原型 B |
| **S25 / S26** | 机制句是纯静态量，原型在 scroll 里写 `--follow` / `--p`。**句子与原型直接不一致**，只能按产品取径选边。 | 严格 C / 宽松 B |
| **S30** | 句子「下半错开 9px」是定值，但实现里 9px 是三角波**峰值**（`:287 MIS*|1−2w|`，每 2400px 一循环）。静态读法不矛盾，运动读法也不矛盾。 | `motion=false`，原型 B |

---

## 8. 结论

1. **A 的正确集合是 {S07, S20}，不是 3 案。** 三次旧读数都给了 3，但都不对：S07 被系统性漏判（只跑一次的初始化看着像壳，恰是最标准的实测-再排）；S03 被系统性高估（81 条刻度线 = 两条 `repeating-linear-gradient`，见 §4）。
2. **`cssMotion` 对 30 案全为 true 是一条实质发现**：机制句里的运动（滚动映射、按下、进视口）没有一条是 JS 的真正理由 —— 仓库自己在 S16 `style.css:505-512` 的 reduced-motion 降级路径里用 `animation-timeline: scroll()` 证明了这点。所以「句子有运动」≠「需要 JS」。
3. **分歧的全部来源是「句子没提的运动算不算」**，不是各案判断不同。严格读法 B=10，宽松读法 B=13，差的恰好是 S16/S25/S26。
4. **`background-position` 必须进几何属性集合**，否则 S18（走纸）与 S02（纹样相位）会被误判成纯装饰 —— 这是我这个谓词相对朴素实现的实质改进。
5. **A 的定义要收紧**（§5）：S20 自己在 `index.html:72-73` 承认有 3 圈手写 `<path d>`，每条 81 组坐标、全库第一。「CSS 物理上不可能」是错的表述；正确表述是「手工预生成量级不可行 + 参数联动不可复现」。
6. **S17 的 129 行确认与样式无关**：核验状态机（`draft→mismatch→verified`）、CSV 导出（`Blob`+`createObjectURL`+下载锚点）、期号切换改 `innerHTML`，错误码 `STUB-17`。三读法皆 C。

---

## 9. 附录：30 案全表（机器生成，与 `resolved.json` 逐格对应）

`合成点` = `createElement(NS)` / `setAttribute(d|points|cx|…)` 的调用处数量。
`运动几何` = 从 `scroll`/`pointer`/`raf`/`io`/`ui` 可达、且被 CSS 在几何声明里消费的写入点数量。

| 案 | 字面 | 严格 | 宽松 | 合成点 | 运动几何 | onMech |
|---|---|---|---|---|---|---|
| S01 | C | C | C | — | — | no |
| S02 | C | B | B | — | 1 | yes |
| S03 | B | B | B | 11 | 2 | yes |
| S04 | C | C | C | — | — | no |
| S05 | C | B | B | 2 | — | partial |
| S06 | B | B | B | — | 2 | yes |
| S07 | A | A | A | 8 | — | yes |
| S08 | B | B | B | — | 2 | yes |
| S09 | C | C | C | 2 | — | no |
| S10 | B | B | B | 3 | 1 | yes |
| S11 | C | C | C | — | — | no |
| S12 | C | C | C | 3 | — | no |
| S13 | B | C | C | 2 | 1 | no |
| S14 | C | B | B | — | 3 | partial |
| S15 | C | C | C | — | — | no |
| S16 | C | C | B | — | 3 | no |
| S17 | C | C | C | 5 | — | no |
| S18 | C | B | B | 1 | 1 | partial |
| S19 | C | C | C | — | — | no |
| S20 | A | A | A | 5 | — | yes |
| S21 | C | C | C | — | — | no |
| S22 | C | C | C | — | — | no |
| S23 | C | C | C | — | — | no |
| S24 | C | C | C | — | — | no |
| S25 | C | C | B | — | 1 | no |
| S26 | C | C | B | — | 1 | no |
| S27 | C | C | C | 1 | — | no |
| S28 | C | B | B | — | 2 | partial |
| S29 | C | C | C | — | — | no |
| S30 | C | B | B | — | 3 | yes |

**读数提示**：`合成点 > 0` 但判 C 的案（S09/S12/S17/S27）都是 synth 落在**非机制区域**（cursor、innerHTML 文案、下载锚点、日志条目）—— 见 `resolve.mjs` 每案的 `why` 字段。S09/S12/S17/S27 的 synth 计数会误导只看数字的人，这也是为什么 `onMech` 必须单列。
