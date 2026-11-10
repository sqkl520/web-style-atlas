# W4 独立验收（VERIFY-W4）

验收对象：commit `496807d`「让机制句真正可核：改掉九条与实现不符的句子，并给它们加上第一道闸门」
验收人：独立验证 Agent（不采信 W4 自述，逐条自证）
日期：2026-11-09
基线：`git status` 在工作区另有他人未提交改动（`data.js` / `S03.md` / `S17.md` / `04-schemes-01-10.md` / `app.js`），见 §G。下文对 `data.js` 的判断区分「commit 里的」与「工作区里的」。

---

## 总判定

| Claim | 判定 | 一句话 |
|---|---|---|
| A 新句子是否真了 | **部分成立（8/9 真，1 条新引入错误）** | S03 新句子把「刻度栅格」搬到了右侧内容区，实际在左侧 264px 轴上 —— 修旧错时新造了一个错 |
| B 是否传导到 data.js | **不成立** | commit 里 `data.js` 只改了 S04/S07/S25/S26 的 `layout`；S01/S03/S07/S09/S10/S17 的旧错原样留在 `def`/`layout` 里 |
| C 新闸门是否可靠 | **不可靠** | 它能跑、变异 1/2/4 与自述一致，但存在 5 类可复现假阴性，其中一条能放过 W4 自己要修的那条 S10 原错 |
| D 是否回归 | **成立** | 6 个闸门全绿（exit 0），`verify-prototype --all` = 29/30，唯一 FAIL 是 S08 |
| E S04 旋转修复 | **成立** | 浏览器实测 9 块纸各有独立矩阵（-1.1/0.9/-0.6/1.1/-1.2/0.7/-0.4/1.0/-0.8°），9 个值互不相同；截图已重渲染 |
| F README 数字 | **成立** | 实测 min 1827 / median 1988 / max 2138（S04 最小、S23 最大），中英 README 与 check-docs 三处一致 |

**结论：D/E/F 可信；A 有一条新错；B 只在四分之一的范围里做了传导；C 的闸门看着绿、漏得比自述多。**

---

## A. 新句子是否真的为真

方法：从 `prototypes/_selection/prompts.js` 取 `dna.mechanism`，逐 token 与各案 `style.css` + `index.html`（S07 含 `app.js`）对账；带单位的数字全部存在性核对，**语义**再逐条人工读码 + 浏览器实测。

### 逐条数字核对（全部 30 案 token 均通过存在性检查）

| 案 | 新机制句里的带单位 token | 源码存在性 |
|---|---|---|
| S01 | 11° 24px | 均在 `style.css:131,145 / :26`（声明侧） |
| S03 | 264px 8px 40px 32% | 均在（`--axis-w` / `--u` / JS `% 40` / `vignette` 注释） |
| S04 | 7px | 在（偏移表 3–7px） |
| S07 | 8% 14% 1px 0.5px 28px | 均在（`opacity .08/.14`、`translate(...,1)`、`column-rule:.5px`、`--lead:28px`） |
| S09 | 1.5° 56px 12px 2px 6.0% 7.7% | 数字均在；**6.0%/7.7% 只在注释里**（几何反算 6.01%/7.67%，数字本身正确） |
| S10 | 1.5px 3px 1.5px 6px | 均在 |
| S17 | 3fr 16px 9fr 6px 24px 88px 2mm | 均在（`88px` 只在 1024–1439 档，句子已写「窄档」） |
| S25 | 72px 12px 1.6px 24px | 均在 |
| S26 | 11° 100% 64% 80% 16px 1.5px 1.2px | 均在（13 条 `<i>` × 3 处 `.rules`） |

### A-1（**新引入的错误**）S03「右侧内容区按 8px 一档铺刻度、每 40px 加粗」

- 句子原话：`一条 264px 宽的纵向刻度轴随滚动固定，右侧内容区按 8px 一档铺刻度、每 40px 加粗……`
- 实际：刻度 SVG 是 `#scale`，位于 `index.html:62`，其父容器是 `<aside class="axis">`（`index.html:60`），**在左侧那根 264px 的年代表上，不在右侧内容区**。
- 浏览器实测（1440×900）：`.chrono` 起点 x=36；`#scale` 的 rect 为 x=48..288，宽 240；`.stream`（右侧内容区）x=320 起。JS `index.html:229-231` 的循环 `for (var y=640; y>=0; y-=8)` 直接 `svg.appendChild` 到 `#scale`。
- 且「每 40px 加粗」的实际判据是 JS 里的 `(640-y) % 40 === 0`，把 40 写成单位化的「40px」是把一个模运算读成了长度声明。
- 判定：**新句子在这一分句上与实现相反**。旧句子「右侧 9 栏」是量纲错，新句子把刻度搬到右边是位置错 —— 换了一个错，不是修掉。

### A-2 S01「红楔压到栏间留白与栏首空白、不压字（正文列在楔形之上）」

- `.columns/.col { z-index:3 }`（`style.css:149-150`），`.wedge { z-index:1 }`（`:154`）⇒ 文字层确实在楔形之上。
- 浏览器实测（1440/1200/1024/820/400 五档，逐文本节点矩形中心与两角 `elementsFromPoint`）：`coveredByWedge = 0`。
- 判定：**成立**。

### A-3 S04「跨 3 至 5 栏」

- 浏览器实测：`--span` = 5/4/3/4/3/5/3/5/4（1440 档）；1200 档实际 span 4/3/4/3/4/4/4/4/3；800/390 档 12/11/10。集合 {3,4,5} ⇒「3 至 5」为真。
- 但同一案的 `data.js:16`/`S01.md`-style `layout`、`S04 layout` 里 `900–1439 折为双列错位，纸块最大跨栏降到 4 栏` 与实measured 4 一致，可；`<900px 单列` 与实测 12/11/10 **不符**（那是三档不等宽，不是单列）。
- 判定：机制句**成立**；`layout` 有第二处同类错（见 B）。

### A-4 S07「正页 2 栏、背页 3 栏（两页宽度比 5:7）」

- `.page-recto .toc{column-count:2}` / `.page-verso .toc{column-count:3}`（`style.css:81-82`），`.pages{grid-template-columns:5fr 1px 7fr}`（`:74`）。
- 判定：**成立**。句子已正确区分「栏数」与「宽度比」。

### A-5 S09「缺口开在两处不同边（外线 6.0% 在左、内线 7.7% 在顶）」

- 6.0%/7.7% 不在任何声明里，只在 `style.css:310,515` 与 `index.html:18` 的注释里。用路径几何反算：外线缺口 17.40/289.43 = **6.01%**，内线 18.10/235.91 = **7.67%**。数字对得上，方向（左/顶）与注释一致。
- 判定：**成立**，但它是「注释推导值」，闸门只给 WARN —— 与 W4 自述一致。

### A-6 S10/S17/S25/S26

- S10 `--misreg:1.5px` 与 `--misreg-start:3px`、`--title-lift:6px`（`style.css:32,33,35`）⇒ 成立。
- S17 金额列 `td.num{text-align:end}`（`:181`），`width:88px` 只在 1024–1439（`:320`）⇒「右对齐（窄档 88px）」成立。
- S25 `column-gap:72px`（`:175`）⇒ 成立；「装订线落中缝右 12px」见 A-7。
- S26 `.plates{grid-template-columns:5fr 3fr 4fr}`（`:145`）、`.rules i` 13 条（`index.html:62,129,319` 各 13）、`drop-shadow(1.5px…)`/`(1.2px…)`（`:179-180`）⇒ 成立。

### A-7 S25「装订线落中缝右 12px」

- 浏览器实测（1440）：`.contents` 两列 384px + 896px，`column-gap` = 72px；左列右缘 x=428，右列左缘 x=500；`.thread` 的绘制起点 x=517。
- 即装订线**落在右列内部 17px 处**，距中缝右缘 89px，不是「中缝右 12px」。12px 在源码里只有 `.entry--l2{--indent:12px}` 与 `.holes li svg{margin-left:12px}`（≤1279 档），都不是装订线偏移。
- 判定：**这一分句仍是错的**（W4 只改了「中缝 56px→72px」，没核对「右 12px」）。它沿用了 `S25 layout` 里同样错的原话。

> A 小结：9 条里 7 条完全真，S09 为真但只靠注释推导，**S03 有一条新引入的错**，**S25 有一条未核的旧错**。

---

## B. 是否传导到 data.js

### B-1 commit 里 `data.js` 实际改了什么

`git show 496807d -- prototypes/_selection/data.js` 只有 6 处内容改动：

| 案 | 字段 | 结论 |
|---|---|---|
| S04 | `layout` | `跨 2 至 6 栏` → `跨 3 至 5 栏` ✔ |
| S07 | `layout` | `左 5 栏右 7 栏（栏宽 62px、栏沟 18px）` → `两页宽度比 5:7 … 正页 2 栏、背页 3 栏` ✔ |
| S25 | `layout` | `中缝 56px` → `中缝 72px（column-gap）` ✔ |
| S26 | `layout` | `基础 12 栏` → `三栏按 5fr 3fr 4fr` ✔ |
| S03 / S17 | — | **commit 里没改**（仅在后续**未提交**工作区里改了） |

W4 自述「data.js 的 def/layout 同步更新」只对 S07/S25/S26 成立，S04 也改了但自述没列；**S03/S17 的同步不在这个 commit 里**（工作区改了，见 §G）。

### B-2 旧错在 `data.js` 里的存活清单（commit 版本 / 工作区版本都查）

| 案 | 位置 | 原样存活的错话 | 实测 |
|---|---|---|---|
| **S01** | `data.js:16` `layout` | 「楔形越界压住第二栏顶部 3 行」 | 浏览器 `coveredByWedge=0`（五档宽度全为 0）。**W4 自己点名要修的句子，在 `def`/`layout` 里一字未动** |
| S01 | `data.js:13` `def` | 「楔形越过栏线插进四栏铅字正文」 | 仍在说压字 |
| **S03** | 工作区 `data.js:185` | 「右侧 9 栏」「列数 12」 | `.chrono` 为 `264px minmax(0,1fr) minmax(0,540px)` 三轨，无 9/12 栏 |
| **S07** | `data.js:518` `def` | 「左栏 5 栏窄、右栏 7 栏宽」 | 真值是两页宽度比 5:7、栏数 2/3 —— 与 W4 刚改好的 `layout` 直接冲突 |
| **S09** | `data.js:696` `layout` | 「12 列栅格、栏宽 68px、栏沟 20px」 | 全案 `68px` **0 次**；`.rows{column-count:3; column-gap:40px}`；无 12 列栅格 |
| **S10** | `data.js:777` `def` | 「红色的一栏永远压过相邻的黑栏 1px 到 2px」 | `--misreg:1.5px`；全案 `1px` **0 次**（11.375px 不算）—— 与 W4 在机制句里修掉的正是同一个错 |
| **S17** | commit `data.js:1387` | 「12 栏」「金额列宽固定 96px」「金额列压到 80px」 | 无 12 栏；`96px` 0 次；窄档 `88px`（不是 80px） |

### B-3 这些字段是真的会被看到吗

会。`data.js` 由 `app.js` 直接渲染进详情面板：`field('一句话视觉定义', r.def)`（`app.js:1380`）、`field('布局与网格', r.layout, …)`（`app.js:1394`）。`def`/`layout` **不进 AI 提示词**（我用 `buildStylePrompt('S01')` 实测，返回文本里不含 def/layout 任何一句），但它们是用户在选型台里读到的正文。所以 B-2 的残留是**面向用户的错话**，不是内部注释。

> B 判定：**不成立**。W4 说的「同步更新」只覆盖 4 个 `layout`；`def` 一个都没改；S01/S03/S09/S10/S17 的老错全部留在用户可见的字段里。其中 S01「压住 3 行」与 S10「错 1px」正是 W4 本轮点名要修的两条 —— 提示词里修了，选型台里没修，两处仍然互相矛盾。

---

## C. 新闸门 soundness

### C-1 它真的在跑（第一版静默 bug 已修）

- 代码 `check-prompts.mjs:428` `const mechEntry = ((STYLE_PROMPTS && STYLE_PROMPTS.schemes) || []).find((x)=>x.id===id)` —— 确实读的是 `STYLE_PROMPTS.schemes`，不是 `d.mechanism`。
- `mech-empty` 断言有效：把 S05 的 mechanism 置空 → `✗ [mech-empty] 1 条 S05 …`，exit 1。
- 基线：`FAIL 0 / WARN 1`，exit 0。

### C-2 W4 指定的四个变异（逐条复跑，输出原文）

**变异 1 —— S17 改回「金额列 96px」→ 预期 FAIL**

```
✗ [mech-value-not-in-source] 1 条
    S17  机制句的「96px」在该案 style.css / index.html（声明侧与注释侧）都找不到
合计 FAIL 1 / WARN 1        EXIT=1
```
**抓到。与自述一致。**

**变异 2 —— 往 S03 注入「焦距」→ 预期 FAIL（语义词）**

```
✗ [mech-vocab-unimplemented] 1 条
    S03  机制句用了「焦距」，但该案 style.css / index.html / app.js 里没有这个概念的实现
合计 FAIL 1 / WARN 1        EXIT=1
```
**抓到。与自述一致。**（注意：`MECH_VOCAB` 只有 4 个词 `焦距/相位/透印/凹印`，词表极小。）

**变异 3 —— S07 改回「正面 5 栏对背面 7 栏」→ W4 承认抓不到**

```
· [mech-column-claim-unchecked] … S07 …：5 栏 7 栏
合计 FAIL 0 / WARN 1        EXIT=0
```
**确认漏检**。只多了一条 INFO。这是 W4 自己写在 commit message 里的已知边界，属实。

**变异 4 —— 改一个只在 CSS 注释里的数（S13 的 14%）→ 预期 WARN 不 FAIL**

```
~ [mech-value-comment-only] 1 条
    S13  机制句的「14%」只在该案注释里找到（不是声明）。它是推导值，没有声明佐证 —— 不是错，但也没被守护
合计 FAIL 0 / WARN 1        EXIT=0
```
**WARN，不 FAIL，与设计一致。** 另测把 14% 改成同样只在注释里的 `11.8%`（`style.css:124`），同样是 WARN、exit 0 —— 分档逻辑本身是对的。

### C-3 我找到的假阴性（W4 没说的）

#### FN-1 `1px` 会被 `<script>` 里的裸数字吸收 —— **它能放过 S10 那条原错**

`jsBareNumbers()` 收的是 `<script>` 体里所有裸数字（`check-prompts.mjs:194-206`），包括 `return 1` / `return -1` 这类排序函数返回值。S10 的 `<script>` 里有 3 处裸 `1`。

把 S10 的机制句**原样回填成 `496807d^` 的历史版本**（`…固定右下错 1px…`）：

```
~ [mech-value-in-script-only] 1 条
    S10  机制句的「1px」只在该案 <script> 体里出现（JS 算出来的量，不是 CSS 声明）
合计 FAIL 0 / WARN 2        EXIT=0
```

**即：W4 用来证明「这道闸门抓得住 S10」的那条错，回填后被判 WARN，exit 0。** commit message 说「`1px` 不命中 `11.375px`，这是 S10 能被抓到的唯一防线」——词边界防线确实成立（`1px` 没命中 `11.375px`），但**下一档 `jsBareNumbers` 把它接住了**，于是从 FAIL 降成 WARN。W4 的变异测试只测了 S17，没测 S10 本身。

同族变异：
- S03「264px」→「1px」：exit 0（`--u` 之外还有 `width:1px`，甚至不需 JS 兜底）
- S26「压叠 1.5px」→「1px」：exit 0（`padding:1px 6px`）
- S01「24px 隔条」→「2px」：exit 0
- S17「行高 24px」→「7px」：exit 1 ✔（7px 真的不存在）

**只要把一个正确值改成「本案里某个 1–3px 的常用值」，闸门基本都会放行。** 这是存在性检查的固有面，但它比 W4 描述的大得多：不只在「栏/列」上，也在 px 上。

#### FN-2 HTML 注释漏进「声明侧」，注释值被当成声明放行

`check-prompts.mjs:424-426` 的 `declSrc` 只剥 `/* */` 与 `<script>`，**没剥 `<!-- -->`**；而 `commSrc` 又单独收了 HTML 注释。于是 HTML 注释里的数字同时出现在两侧，第一档就 PASS。

S09 的 `7.7%` 只有三个来源：`style.css:310`（CSS 注释）、`style.css:515`（CSS 注释）、`index.html:18`（**HTML 注释**）。实测 `declSrc` 里 `7.7%` = true、正确剥完应为 false。S09 之所以是 PASS 而不是 WARN，靠的就是这个泄漏。

影响面（30 案全扫，token 只靠「HTML 注释或 HTML 正文」才过的）：**10/30 案** —— S03 S08 S09 S13 S14 S15 S19 S20 S24 S29。

#### FN-3 可见正文（HTML 散文）被算作「声明」

同一处：`declSrc` 把整个 `index.html` 的非 script 部分都算作声明侧，其中包含**页面上的说明文字**。W4 的注释写「机制句的每个 px/mm/% 必须在剥注释的 CSS/HTML 里找到」——但实际上「HTML 里的散文」也被算成实现。

实证：把 S27 的「两版固定错开 1.8px」改成「112px」（`112px` 只在 S27 页面的「孔距 112px」这句可见文案里，与两版错位毫无关系）→ **exit 0，无任何提示**。S28「外距 64px」→「160px」（只在「底部留黑 160px」文案里）→ **exit 0**。

#### FN-4 值存在 ≠ 值属于这个属性

- S09「行高 56px」→「44px」：`44px` 是 `--pad` 与 `.row-price{height:44px}`，不是行高 → **exit 0**
- S12「切角 30px」→「12px」（`12px` 是间隙）→ **exit 0**
- S02「级差 56px」→「24px」→ **exit 0**
- S05「凹槽 6px」→「12px」→ **exit 0**
- S03「四角遮罩压掉 32%」→「12%」（`12%` 是配色面积比）→ 只升 WARN，exit 0

同理，`栏/列` 类数字完全不判定（W4 已披露），但我实测把它扩大了一档：S28「12 块」→「40 块」→ exit 0，连 INFO 都不出（`块` 不在 `(\d+)\s*[栏列]` 正则里）。

#### FN-5 整句替换/串案检测不到

把 S13 的整句换成另一案的数值组合（`凹槽压深 30px、槽带亮度差 12px、边缘对比度 44px`，三个值在 S13 里都真实存在但都属于别的属性）→ **exit 0，FAIL 0 / WARN 0**。

### C-4 闸门自身的口径问题（非 bug，但会误导下一个读者）

- 注释说「三档：声明侧 PASS / **仅注释或仅 script 体** WARN / 都没有 FAIL」，但因为 FN-2，HTML 注释永远进不了「仅注释」档，实际是**四档**，只是第四档被写成了 PASS。
- 注释里 `MECH_VOCAB` 写「S03『焦距』是唯一的现存违规」—— 现在 S03 已改，注释过期。
- `mech-empty` 只判空串；`STYLE_PROMPTS.schemes` 若被整个改名，30 条全会报 FAIL（正确），但如果只丢一个案，`lens.length !== DIRS.length` 的 coverage 断言会先报 —— 这条链是通的。

> C 判定：**不可靠**。它能跑、能抓「值完全不存在」这一类，但（a）1–3px 的常用值几乎全放行，（b）HTML 注释泄漏成声明（10/30 案受益），（c）可见文案算实现，（d）值存在即通过、不问属于哪个属性。**W4 自述的「S10 能被抓到」在回填历史原句时不成立（FAIL→WARN）。**

---

## D. 回归

全部逐条实跑，记录 exit code：

| 命令 | 结果 | exit |
|---|---|---|
| `node prototypes/_build/check-docs.mjs` | `README.md: 0 FAIL / 0 WARN / 13 PASS` | **0** |
| `node prototypes/_build/check-prompts.mjs` | `合计 FAIL 0 / WARN 1`（长度 1827–2138，中位 1988） | **0** |
| `node prototypes/_build/check-twolines.mjs` | `合计 FAIL 0 / WARN 0`（R5 补色注释 33/53，INFO 一条） | **0** |
| `node prototypes/_build/check-anchors.mjs` | `扫了 31 个入口 … ✓ 无死锚点`（S05 一处动态拼接需人工确认） | **0** |
| `node prototypes/_build/check-texture.mjs` | `违规 0 … 合计 FAIL 0 / WARN 0` | **0** |
| `node prototypes/_build/check-contract.mjs` | `合计 FAIL 0 / WARN 1 / INFO 2` | **0** |
| `node prototypes/_build/verify-prototype.mjs --all` | `达标 29 / 不达标 1 / 共 30` | **1（设计如此）** |

`verify-prototype` 的唯一失败：

```
✗ S08 S08-amber-overprint-lightbox
    html 20.2K / css 15.4K / FAIL 2 / WARN 2 / 真图 6 / 截图 10
    · 闸门 FAIL=2：palette-terracotta font-count
```

**确认 29/30，S08 是唯一失败，且失败原因是已知的两条豁免（palette-terracotta / font-count），与 W4 自述一致。**

---

## E. S04 旋转修复

### E-1 浏览器实测（1440×900，CDP）

9 个 `.slip` 的 `getComputedStyle(...).transform` **全部非 `none`**，解出的角度：

```
-1.1  +0.9  -0.6  +1.1  -1.2  +0.7  -0.4  +1.0  -0.8   （度）
```

- `none` 计数 = **0**
- 互不相同 = **是**（9 个值，`new Set(...).size === 9`）
- 与 HTML 内联的 `--r` 一一对应（`index.html:41,52,63,78,89,100,115,126,137`）

原 CSS 7 处 `var(--rot)` 已全改为 `var(--r, 0deg)`（`style.css:84,93,161-163,229,234`），`--rot` 全仓 0 处赋值 → 判定修复真实有效。

### E-2 截图确实变了

- commit 里 S04 的 8 个 `.inspect` 文件全部改变（170 万→190 万字节区间变化），`report.json` 46 行变更。
- 我直接看 `496807d^` 与 `496807d` 的 `desktop-page-01.jpg`：旧图里 9 张纸块边缘与栏线严格平行（无倾角）；新图里纸块明显左倾/右倾、撕口不再与网格对齐。
- 判定：**成立**。

---

## F. README 数字

独立用 `buildStylePrompt` 跑 30 案（不读 check-docs 的输出）：

```
min   S04  1827
max   S23  2138
median      1988
全序列：1827,1831,1854,1855,1883,1888,1931,1936,1941,1945,1959,1959,1959,
        1967,1984,1988,2000,2020,2028,2035,2041,2052,2061,2065,2084,2085,
        2102,2103,2117,2138
```

三处口径一致：

| 位置 | 写的是 |
|---|---|
| `README.md:80` | `1827–2138 字（30 案实测：中位 1988 字）` ✔ |
| `README-EN.md:80` | `1,827–2,138 characters (30 schemes measured; median 1,988)` ✔ |
| `check-docs.mjs` 断言输出 | `✓ nums/prompt-len 提示词长度 = 1827–2138，中位 1988，文档一致` ✔ |

`1814→1827` 的变化原因也对得上：`S04` 的机制句从 76 字缩到 66 字（`mechanismChars` 实测 76/66），但它是**最短**那条，缩短后 min 应该**下降**而不是上升…… 复核：min 由 1827 决定的是 S04 本身（1827），`496807d^` 的 min 是 1814 —— 差 13 字，来自 S04 同一案内 layout/其它段的变化（工作区 `data.js` 的 `at` 时间戳与 S04 `layout` 文字在本 commit 前后有联动重生成）。数字本身**现在是对的**，README/EN/check-docs 三处对齐。

> F 判定：**成立**。（附注：`1814→1827` 的因果链条中没有直接的单字段解释，但**结论数字正确且三处一致**，不影响判定。）

---

## G. 工作区污染（超出 W4 范围，但会影响复核）

验收时 `git status` 显示以下**未提交**改动，不属于 `496807d`：

```
 M deliverables/04-schemes-01-10.md     ← S03 段落改写（正确，但没进 commit）
 M prototypes/_selection/data.js        ← S03 layout + 3 个 at 时间戳
 M prototypes/_selection/app.js         ← if (arrow && !detailOpen) return;  →  if (false) return;
 M prototypes/_specs/S03.md             ← S03 字段 5 改写
 M prototypes/_specs/S17.md             ← S17 字段 5 改写
?? prototypes/_build/check-ui-copy.mjs
?? prototypes/_build/probe-ui.mjs
```

要点：

1. **S03/S17 的 data.js 修复只存在于工作区**。若按 `git checkout .` 复核，`data.js` 会退回「右侧 9 栏」与「金额列 96px」。W4 的 commit message 声称「data.js 的 def/layout 同步更新」，实际这个 commit 只同步了 S04/S07/S25/S26。
2. `app.js` 的 `if (false) return;` 是**别人未提交的临时调试改动**（把键盘方向键在详情未开时的提前返回短路掉），与本任务无关，但会污染任何针对选型台行为的复核。我所有针对 `data.js`/`prompts.js` 的判定都基于 `git show 496807d:` 的版本，不依赖工作区。
3. `deliverables/74-w5/` 下已有 `MUTATION.md` / `REVIEW.md` / `UI-COPY-GATE.md` 等他人产物，非本报告。

---

## 遗留差异总表

按严重度排序。全部为我实测，非推测。

| # | 案 | 位置 | 问题 | 证据 | 严重度 |
|---|---|---|---|---|---|
| 1 | **S03** | `prompts.js` `dna.mechanism`（= `mechanisms.mjs` S03、`04-schemes-01-10.md` 1-附、`S03.md` 1-附） | 「**右侧内容区**按 8px 一档铺刻度、每 40px 加粗」——刻度在**左侧** 264px 轴上 | `index.html:60,62`（`#scale` 在 `.axis` 内）；浏览器 `scaleRect.x=48..288` vs `streamRect.x=320` | **高（新引入）** |
| 2 | **S01** | `data.js:16` `layout` | 「楔形越界压住第二栏顶部 3 行」原样未改 | 浏览器五档宽度 `coveredByWedge=0` | **高（本轮点名要修却没修）** |
| 3 | **S01** | `data.js:13` `def` | 「楔形越过栏线插进四栏铅字正文」仍在说压字 | 同上 | 高 |
| 4 | **S10** | `data.js:777` `def` | 「红色的一栏永远压过相邻的黑栏 1px 到 2px」——`1px` 全案 0 次 | `--misreg:1.5px`（`style.css:32`）；与机制句已修的错同源 | **高（与已修句子直接矛盾）** |
| 5 | **S07** | `data.js:518` `def` | 「左栏 5 栏窄、右栏 7 栏宽」——与同一行下方已修好的 `layout`（5:7 宽度比、2/3 栏）自相矛盾 | `.toc` 的 `column-count:2/3`；`.pages` 5fr/1px/7fr | 高 |
| 6 | **S09** | `data.js:696` `layout` + `S09.md` 字段5 + `04` 第 5 段 | 「12 列栅格、栏宽 68px、栏沟 20px」——`68px` 全案 0 次，无 12 列栅格 | `.rows{column-count:3;column-gap:40px}`（`style.css:276`） | 高 |
| 7 | **S17** | commit `data.js:1387` `layout` + `S17.md` + `04` | 「12 栏」「金额列宽固定 96px」「金额列压到 80px」——96px/80px 均 0 次 | `td.num` 无宽度；`:320` 是 `88px` | 高 |
| 8 | **S03** | commit `data.js:185` `layout` + `S03.md` + `04` | 「右侧 9 栏」「列数 12」——三轨 grid，无 9/12 栏（工作区已修，commit 未修） | `.chrono{grid-template-columns:264px minmax(0,1fr) minmax(0,540px)}` | 中（工作区已改） |
| 9 | **S25** | 机制句 + `data.js:2072` `layout` | 「装订线落中缝右 12px」——实测落右列内 17px、距中缝右缘 89px | 浏览器：中缝 428→500，thread 起点 517 | 中 |
| 10 | **S26** | `data.js` `layout` + `S26.md` + `06` | 「全部栏线在页面**左侧 120px 处**整体倾斜」——`120px` 全案 0 次 | 全案 `120px` 无命中 | 中 |
| 11 | **S04** | `data.js:268` `layout` | 「<900px 单列纵向堆叠」——实测 12/11/10 栏三档不等宽 | 浏览器 800/390 档 `grid-column:span 12/11/10` | 中 |
| 12 | **S25** | `data.js` + `S25.md` + `06` | 「<900px … 标题 28px、正文 15.5px」——`15.5px` 全案 0 次 | 全案 `15.5px` 无命中 | 低 |
| 13 | **S01/S03/S04/S07/S25** | 各 `layout` | 断点写成 `1440px`/`1280px`/`900px`/`768px`，而 CSS 是 `max-width:1439px`/`1279px`/`899px`/`767px` | 逐案 `@media` 行 | 低（语义等价） |
| 14 | **闸门** | `check-prompts.mjs:424-426` | `declSrc` 未剥 HTML 注释，注释值当声明 PASS | `7.7%` 在 `declSrc` = true；正确剥后 false | **高（闸门缺陷）** |
| 15 | **闸门** | `check-prompts.mjs:194-206` | `jsBareNumbers` 收 `<script>` 裸数字，S10 的 `1px` 被 `return 1` 吸收 → FAIL 降 WARN | 回填历史 S10 原句 → `WARN mech-value-in-script-only`，exit 0 | **高（W4 的 S10 论据不成立）** |
| 16 | **闸门** | `declSrc` 含 HTML 散文 | 可见文案被当实现 | S27 `1.8px→112px`（只在「孔距 112px」文案）exit 0；S28 `64px→160px` exit 0 | 中 |
| 17 | **闸门** | 存在性检查本身 | 值存在即通过，不问属于哪个属性 | S09 `56px→44px`、S12 `30px→12px`、S02 `56px→24px`、S05 `6px→12px` 全 exit 0；S13 整句串值 exit 0 | 中（固有限制，但 W4 只披露了「栏/列」一档） |

---

## 附：复跑命令与预期

```bash
cd D:/Web/style
node prototypes/_build/check-prompts.mjs --quiet   # → FAIL 0 / WARN 1 / exit 0
node prototypes/_build/check-docs.mjs              # → 13 PASS / exit 0
node prototypes/_build/verify-prototype.mjs --all  # → 29/30 / exit 1（S08 两条豁免）
```

变异复跑方法：改 `prototypes/_selection/prompts.js` 里对应 `"mechanism"` 字符串 → 跑 `check-prompts.mjs` → 还原。**注意：`prompts.js` 是生成物，改完必须还原，否则下次 `build-prompts.mjs` 会覆盖。** 本报告所有变异均已还原（`git status --porcelain prototypes/_selection/prompts.js` 为空）。
