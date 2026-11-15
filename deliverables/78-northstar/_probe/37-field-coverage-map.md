# 37 · dna 字段覆盖地图：13 个字段里 7 个「变了没人管」

> 2026-11-15　调查型 Agent
> 任务：把 `prompts.js` 一个案的 `dna` 全字段逐个追到 `prompt-copy.js` 的渲染点与
> `check-prompts.mjs` 的断言点，回答「**这个字段变了，谁会知道**」。
> **没有改动任何已有文件**；所有变异都在 `%TEMP%\covmap-*\` 下的仓库副本里做，
> 主仓库 `git status` 保持干净。未跑沙箱，未调模型。

---

## 〇、结论先行

S13 的 `dna` 有 **13 个字段**（`prototypes/_selection/prompts.js:980-1007`，实测枚举见 §1）。
把它们按「有没有断言守着」分三档：

| 覆盖强度 | 字段 | 数量 |
|---|---|---|
| **(a) 有断言专门守它** | `palette`、`mechanism` | 2 / 13 |
| **(b) 只被陈旧度间接守**（两边一起坏就失效） | `radius`、`shadow`、`lineWidths`、`h1Size` | 4 / 13 |
| **(c) 完全没有任何断言** | **`fonts`、`radiusBare`、`bodySize`、`h1SizeAt1440`、`degrades`、`risk`、`reuse`** | **7 / 13** |

三条最硬的实测结论：

1. **`fonts` 不只是「没断言」，它连被加进 D 段都做不到**。`dna.fonts` 是对象，
   D 段用 `String(a) !== String(b)` 比对（`check-prompts.mjs:892`），
   而 `String({…})` 恒等于 `"[object Object]"`。我把它加进 `KEY_FIELDS` 实测：
   **FAIL 0**（§4.2）。
2. **`bodySize` 空掉之后，提示词不是变差，是「换了一条更弱的话」**：倍率、正文基准、
   「最容易被做塌的一处」这句严重性标记一起丢（§5.2 原文对比）。
3. **`risk` / `reuse` 连「被陈旧度守」这条退路都没有**：这两个字段在
   `dna-clean.json` 的 23 个键里根本不存在（实测），D 段 `const a = dc[f]` 永远是
   `undefined`，第 891 行 `continue` 直接放行（§6.3）。

另外查到一个**独立的、正在生效的静默错值**：`build-prompts.mjs:44` 与 `:78` 的两个正则
用 `"id":\s*"(S\d{2})"[\s\S]*?"risk"` 跨案贪心匹配。删掉某一案的 `risk` 键，
**它不会变空，它会拿到下一案的 risk 原文**，而闸门全绿（§6.4，有复现）。

---

## 一、13 个字段的清单（不是照抄，是实测枚举）

`prototypes/_selection/prompts.js:980-1007`（S13 案），并用脚本在 35 案上求并集：

```
$ node -e "…读 prompts.js，统计每个案 dna 的键…"
S13 dna keys: palette, fonts, radius, radiusBare, shadow, lineWidths,
              h1Size, bodySize, h1SizeAt1440, mechanism, degrades, risk, reuse
35 案字段覆盖率: 13 个键全部 35/35（无一案缺键）
```

`fonts` 内部还有 5 个子字段（`prompts.js:982-995`）：
`display` / `body` / `mono` / `displayStack[]` / `bodyStack[]`。

---

## 二、每个字段进不进提示词（`prompt-copy.js`，`buildPrompt` 在 275 行起）

`s = pick(id)` 在 276 行，`d = s.dna` 在 279 行。下面每一条都是**实测**：
把 S13 的该字段置空/置 `null`，重新 `buildStylePrompt('S13')`，与基线文本逐行 diff。

| 字段 | 进提示词吗 | 代码行 | 置空后会发生什么 |
|---|---|---|---|
| `palette` | 是，所有 35 案 | `620` | 打印一句残句：`1. 配色只用这几个值：。不新增更多彩色。` 不抛错 |
| `fonts` | 是，但**只经 3 个子字段** | `349-371`、`390-425` | 见 §3 |
| `radius` | **只有 4/35 案**（S05/S14/S16/S17） | `630-632` | 31 案走 `radiusBare` 硬编码句，`d.radius` 整句丢弃；这 4 案置空 → `3. 圆角：。` |
| `radiusBare` | 每个案都读，但只有 5 案翻转会改变输出（S05/S14/S16/S17/S25） | `630`、`912` | 只改「直角边界/圆角边界」与「全站一律 0」这一处措辞；30 案因 `radius` 本身就是 `"全直角 0"`，翻转后两支等价 |
| `shadow` | 是，35/35 | `636`、`912` | `4. 阴影：。` **外加** `② 层级只用「直角边界 + 」这一套词汇表达` |
| `lineWidths` | 是，35/35 | `642` | `5. 线宽只用这几级：，全站线条都从这几级里取。`（级数列表消失，句子还在） |
| `h1Size` | **否，0/35** | `439`（死分支） | 什么都不变。它只在 `d.mechanism` 为空的 `else` 里被读，而 mechanism 35/35 非空 |
| `bodySize` | 是，35/35（作分母） | `667` | 静默降级到另一条分支，见 §5 |
| `h1SizeAt1440` | 是，35/35 | `666` | `parseFloat(...) \|\| 0` → `if (!h1) return ""` → **整条「6. 字号」消失** |
| `mechanism` | 是，35/35 | `432-433` | 走 `else` 兜底（`434-440`），用 `plain` + radius/shadow/lineWidths/h1Size 拼一句 |
| `degrades` | 是，13 案切换句式 | `813-818` | 布尔，`false` 走自动流分支，不抛错 |
| `risk` | 是，35/35 | `955-968` | `length <= 20` → 返回 `""` → 整段被 `1002` 行的 `.filter(x => x !== "")` 滤掉 |
| `reuse` | 是，26/35 | `495`、`856` | 已是空串 → 第 6 条整条不出现（9 案本来就是这种合法状态） |

`h1Size` 是死字段这一点，`build-prompts.mjs:376-388` 已经用注释承认了
（「哨兵实测 0/35 渲染」），并且它的名字还挂在 `check-prompts.mjs:880` 的
`KEY_FIELDS` 里 —— 闸门在认真守一个不影响产品输出的字段。

---

## 三、`fonts` 到底以什么形式出现（重点）

### 3.1 渲染源是三条链，不是 `display` / `body`

```
349    var fStack = trimStack((d.fonts && d.fonts.displayStack) || [], 4);
350    var bStack = trimStack((d.fonts && d.fonts.bodyStack) || [], 4);
351    var fontLine = "2. 字体：";
361      fontLine += "标题按这个顺序取第一个可用的：" + fStack.join(" → ") + …
366      fontLine += "正文同理，按序取：" + bStack.join(" → ") + "。";
371    if (mono) fontLine += "编号/价格等数字用等宽 " + mono + "、tabular-nums 右对齐。";
```

S13 基线实际输出（`buildStylePrompt('S13')` 第 6–7 行）：

```
2. 字体：标题按这个顺序取第一个可用的：EB Garamond → Noto Serif SC（前一个缺字就用下一个）。正文同理，按序取：Noto Serif SC → Songti SC → SimSun。编号/价格等数字用等宽 DM Mono、tabular-nums 右对齐。
   不要用 上面两条链之外的字体。也不要跳过上面这两条链回退成系统默认无衬线。
```

`display` 与 `body` 这两个「结构化字段」只在**两条链长度 ≤ 1** 时才被读（`363`、`368`）。
实测五个子字段各自的影响面：

| 子字段 | 影响提示词的案数 | 说明 |
|---|---|---|
| `displayStack` | **35/35** | 真正的标题渲染源 |
| `bodyStack` | **31/35** | 4 案（S05/S09/S26/S29）链长 ≤1，改走 `正文用 fBody` |
| `mono` | **29/35** | 6 案（S25/S31–S35）本就无 mono，行为正确 |
| `display` | **0/35** | **完全死字段**。实测 35/35 案 `display === displayStack[0]`，`363` 行永远轮不到 |
| `body` | **3/35**（S05/S26/S29） | 35 案里这 3 案 `bodyStack` 只有一项，`368` 行才用 `fBody` |

**`body` 空掉的后果是错的字，不是空的字**（实测）：

```
S05 baseline: …正文用 Glow Sans SC。…
S05 body="" : …正文用 Barlow。…        ← 正文被塞成标题字体
```

原因在 `302` 行 `fBody = d.fonts.body || fTitle;` —— 空 body 静默回退成标题族。

### 3.2 整个 `fonts` 空掉会怎样

`d.fonts = {}`（或 5 个子字段全空）实测输出：

```
2. 字体：标题用 有刻印感的衬线。正文用 有刻印感的衬线。
   中文回退到一款中文衬线（宋体类），与上面两条链并列使用。不要用 上面两条链之外的字体。
```

这条路径来自 `316-317` 的兜底（`fTitle = "有刻印感的衬线"`）与 `419-420` 的
「两侧都无 CJK」分支。**它读起来完全像一条正常指令** —— 这是比「留个空」更糟的形态：
AI 会照着一个泛化形容词去选字体，而用户在剪贴板里看不出任何异常。

---

## 四、断言覆盖：`check-prompts.mjs` 的 5 段 + D 段

### 4.1 每段守什么（行号已逐个核对）

| 段 | 行 | 断言 rule | 作用于 | 会不会发现字段空 |
|---|---|---|---|---|
| 0c | 460 / FAIL 484 | `mech-no-measurable` | 机制句正文 | 只管机制句 |
| 0d | 491 / FAIL 535 | `mech-width-vs-scale` | 机制句 px vs 第 5 条档位表 | 档位表空则 `scale.length===0` 整块跳过 |
| 0b | 543 / FAIL 567,571,574 | `minpics-*` | 第 4 条图片位 vs `minitems-parsed.json` | 不管 dna 字段 |
| 0 | 580 / FAIL 634…654 | `plain-*` | 第 4 行 plain | 只管 plain |
| 1 | 658 / FAIL 664,672,**674** | `palette-line`、`palette-not-in-css`、**`palette-empty`** | 第 1 条配色行 | **唯一一条直接判「段内 hex 数为 0」的断言** |
| 2 | 677 / FAIL 690 | `linewidth-not-in-css` | 第 5 条列出的每个值必须在 CSS 里存在 | **空列表时 `claimed=[] → notInCss=[]`，静默通过** |
| 3 | 699 / WARN 731 | `hex-in-negative-context` | 段外 hex | 不管字段空 |
| 4 | 741 / **WARN** 746 | `no-typescale` | 整条提示词有没有「字号/字阶/最大标题/主标题取/font-size」 | 唯一碰字号的断言，且**只是 WARN** |
| 5 | 749 / FAIL 760,795,809 | `mech-empty`、`mech-value-not-in-source`、`mech-vocab-unimplemented` | 机制句 | **`mech-empty` 是唯一一条直接判字段空的** |
| D | 863 / FAIL 893 | `stale-vs-dna-clean` | `KEY_FIELDS = ['h1Size','lineWidths','radius','shadow']`（880 行）两份文件一致性 | 见 4.2 |

`grep -n "字体\|font" prototypes/_build/check-prompts.mjs` 的全部命中：
`170`（注释）、`516`（注释）、`649-650`（plain 不许含「字体」二字）、
`741-746`（字号 WARN）。**没有任何一条断言读字体行**。

### 4.2 D 段的三个结构性失效（都在副本里复现过）

**(1) 缺键即放行。** `891` 行 `if (a === undefined || b === undefined) continue;`。
实测：把 `S13.lineWidths` 这个**键整个删掉**（dna-clean 仍有值），闸门
`合计 FAIL 0 / WARN 1`。

**(2) 对象字段恒等。** `892` 行 `String(a) !== String(b)`：

```
$ node -e "console.log(String({display:'A'})===String({display:'B'}))"
true
```

我把 `KEY_FIELDS` 临时改成含 `'fonts'`，再把 `S13.fonts.display` 改成
`"Times New Roman"`，闸门 **FAIL 0**。所以「把 fonts 加进 KEY_FIELDS」这条路是不通的。

**(3) 形状不一致的字段加进去会假红。** 把 `'palette'` 加进 `KEY_FIELDS` 实测：
35 案全红，因为 dna-clean 侧是数组 `["#7B612C gold",…]`、prompts 侧是字符串
`"#7B612C（gold）、…"`，`String()` 必然不等。**不是数据错，是判据口径错**。

### 4.3 「两边同时空」矩阵（这是真正的失效形态）

在仓库副本里**同时**把 `prompts.js` 与 `dna-clean.json` 的 S13 同字段清空，
跑 `node prototypes/_build/check-prompts.mjs --quiet`：

```
palette    → FAIL 1（palette-empty）      ✅
mechanism  → FAIL 1（mech-empty）         ✅
radius     → FAIL 0 / WARN 1              ❌
shadow     → FAIL 0 / WARN 1              ❌
lineWidths → FAIL 0 / WARN 1              ❌
h1Size     → FAIL 0 / WARN 1              ❌
bodySize   → FAIL 0 / WARN 1              ❌
fonts（整对象）→ FAIL 0 / WARN 1           ❌
```

对照：**只**清空 prompts.js 一侧时，`radius/shadow/lineWidths/h1Size` 会报
`stale-vs-dna-clean`（每个字段 FAIL 2 = 该案 1 条 + `stale-summary` 1 条）。
这两组数字放在一起就是 D 段的全部价值：**它守的是「两份文件一致」，不是「这个字段有内容」。**

### 4.4 逐字段覆盖判定

| 字段 | 进提示词 | 渲染行 | 空值的后果 | 覆盖强度 |
|---|---|---|---|---|
| `palette` | 是 35/35 | 620 | 残句「配色只用这几个值：。」 | **(a)** `palette-empty` 674 + `palette-not-in-css` 672 |
| `fonts` | 是（经 3 个子字段） | 349-371 / 390-425 | 静默换成「有刻印感的衬线」+ 中文兜底句 | **(c)** 无。加进 KEY_FIELDS 也恒为 `[object Object]` |
| `radius` | 4/35 | 630-632 | `3. 圆角：。` | **(b)** 仅 D 段 893；且 31 案置空提示词逐字不变 |
| `radiusBare` | 每案都读，5 案会变（S05/S14/S16/S17/S25） | 630、912 | 布尔翻转，改措辞不改事实 | **(c)** 无。`true→false` 两边同改，FAIL 0 |
| `shadow` | 是 35/35 | 636、912 | `4. 阴影：。` + `直角边界 + ` 残句 | **(b)** 仅 D 段 |
| `lineWidths` | 是 35/35 | 642 | `线宽只用这几级：，` | **(b)** 空列表时 690 行判据自动放弃；只剩 D 段 |
| `h1Size` | **否 0/35** | 439（死分支） | 提示词逐字不变 | **(b)** 仅 D 段 —— 守的是一个不进产品的字段 |
| `bodySize` | 是 35/35 | 667 | 切到降级分支，丢倍率/基准/严重性标记 | **(c)** 无 |
| `h1SizeAt1440` | 是 35/35 | 666 | 整条「6. 字号」消失 | **(c)** 只有 `no-typescale` **WARN** 746 |
| `mechanism` | 是 35/35 | 432-433 | 走兜底句（可能拼出「具体到实现：。」） | **(a)** `mech-empty` 760 + 484/795/809 |
| `degrades` | 是 13/35 | 813-818 | 切换句式（`dna.degrades` vs `capacity.degrades` 分叉无人管） | **(c)** 无 |
| `risk` | 是 35/35 | 955-968 | 整段消失（`length<=20` 直接 return ""） | **(c)** 无；且该键不在 dna-clean.json，D 段结构性够不着 |
| `reuse` | 是 26/35 | 495、856 | 整条第 6 点不出现（9 案是合法状态） | **(c)** 同上 |

---

## 五、`fonts` 与 `bodySize` 专项

### 5.1 `fonts` 的空值形态在 `clean-dna.mjs` 里怎么产生

| 位置 | 写法 | 后果 |
|---|---|---|
| `clean-dna.mjs:1373` | `if (!s \|\| /[/*]/.test(s)) return "";` | 族名带 `/` 或 `*` 残渣 → 空 |
| `clean-dna.mjs:401` | `h1Family(...)` 找不到 h1 规则 → `return ""` | `display` 空 |
| `clean-dna.mjs:414` | `bodyFamily(...)` 找不到 `body` 规则 → `return ""` | `body` 空 |
| `clean-dna.mjs:435` | `monoFamily(...)` 两路都空 → `return ""` | `mono` 空（6 案合法） |
| `clean-dna.mjs:274` | `dominantStack`：`if (!counts.size) return [];` | `displayStack` / `bodyStack` 空数组 |
| `clean-dna.mjs:1365` | `fDisplay \|\| fBody \|\| "有刻印感的衬线"` | `display` **永远非空** —— 抽取失败被编码成一个合法字体名 |

最后一行是要害：`display` 这一层把「抽取失败」写成了 `"有刻印感的衬线"`。
这正是 §2.3 说的形态 —— 不是留空，是**把缺失编码成一个看起来正常的常量**。
而 `prompts.js` 里没有任何东西能把它和真实字体区分开。

### 5.2 `bodySize` 降级丢了什么（原文对比）

`prompt-copy.js:665-677`：

```js
var h1   = parseFloat(d.h1SizeAt1440) || 0;
var body = parseFloat(String(d.bodySize || "").match(/([\d.]+)px/)?.[1] || "");
if (!h1) return "";
if (body > 0) { …倍率分支… }
return "6. 字号：最大标题取 " + Math.round(h1) + "px 这一档，比这更小就撑不出这个版式的气势。";
```

S13 实测两段输出（`bodySize="15px"` vs `""`）：

```
有 bodySize：
6. 字号：正文约 15px；最大标题要压到正文的 3.7 倍（约 56px）。比这更小就撑不出这个版式——这是本案最容易被做塌的一处。中间层级你按内容需要分，但**最大那一档必须够大**。

bodySize="" ：
6. 字号：最大标题取 56px 这一档，比这更小就撑不出这个版式的气势。
```

**丢掉的四样东西：**

1. **倍率 `3.7 倍`** —— 这是全条里唯一的**相对**约束。`prompt-copy.js:651-656` 的注释
   写明了为什么相对值才是可执行的那个：端到端复刻实测「H1 只有原型的 26%/30%/48%，
   但字号档数 6–8 档与原型相当」，缺的是相对关系不是绝对像素。
2. **正文基准 `15px`** —— 分母没了，AI 只能自己假设（浏览器默认 16px）。
   我按 16px 重算 35 案的真实倍率，偏差最大的是 **S16：4.4× → 5.5×（+25%）**，
   因为它的正文是 20px。
3. **严重性标记「这是本案最容易被做塌的一处」** —— `prompt-copy.js:643-650` 记录这一整段
   是「三个 Agent 独立复现同一件事」之后加的，它承担「这一条不许打折」的信号。
4. **「中间层级你按内容需要分，但最大那一档必须够大」** —— 分层授权，没了之后
   只剩一个孤立像素值。

### 5.3 `bodySize` 还有一个潜伏的 clamp 陷阱

`667` 行 `/([\d.]+)px/` 取的是**第一个** px 值。对 `clamp(14px, 1vw, 18px)` 会拿到
**下限 14px** —— 和 `h1Size` 在 2026-10-30 踩过的那个坑（`prompt-copy.js:658-663`）
是同一个 bug，只是当时只修了 h1，没修 body。实测：

```
bodySize="clamp(14px, 1vw, 18px)" → 正文约 14px；最大标题要压到正文的 4 倍（约 56px）
```

真值应是 18px 的 3.1 倍。**当前 35/35 案都是裸 px**（25×16px / 6×17px / 3×15px / 1×20px），
所以这条是潜伏的、不是正在发生的。

### 5.4 `bodySize` 的「合法空」必须说清

`clean-dna.mjs:1093` 明确写了 `return { text: "", why: "该案没有显式的正文字号规则
（浏览器默认 16px，不写进提示词以免编造）" };`。所以「bodySize 是空串」在数据层是
**一个被批准的合法状态**。这一点 `42-why-fields-dropped.md` §1.2 已经论证过，我不重复。
本条要补的是：`why` 字段在 `build-prompts.mjs:364-406` 的 `dna` 枚举里被丢了，
所以**到了 `prompts.js` 这一层，合法空与失败空完全同形**。要让断言能判，得先把
`bodySizeWhy` 搬进 prompts.js —— 那是另一件事，不在本报告范围。

---

## 六、`clean-dna.mjs` 的静默写空/写错路径清单

按「真的可能发生」排序，每条都给了行号。

### 6.1 直接返回空串

| 行 | 函数 | 触发条件 | 写进哪个字段 |
|---|---|---|---|
| `1093` | `bodySizeVerdict` | 无 `body`/`p`/正文类名规则，且 `:root` 无 `--fs-base` 等 5 个变量 | `bodySize = ""`（**合法**，带 why） |
| `1373` | `cleanName` | 族名含 `/` 或 `*` | `fonts.*` 单字段空 |
| `401` / `414` / `435` | `h1Family` / `bodyFamily` / `monoFamily` | 找不到对应规则 | `fonts.*` 空 |
| `274` | `dominantStack` | 全文零 `font-family` | `displayStack` / `bodyStack` 空数组 |

### 6.2 不返回空，返回一个「合法常数」——更难发现

| 行 | 字段 | 失败时写什么 |
|---|---|---|
| `463` / `464` | `radius` | 恒为 `"全直角 0"`（一处 border-radius 都没有时也一样） |
| `952` | `lineWidths` | `"无边框线条（全站不画描边，只用色块与留白分隔）"` |
| `1571-1581` | `shadow` | `map[sh.kind] \|\| sh.kind`，永远非空 |
| `1365` | `fonts.display` | `"有刻印感的衬线"` |
| `1457-1469`（`palette` 兜底） | `palette` | 按全文件频次取前 6，形如 `#C9C4B8 ×16` |
| `1038` / `1043` | `h1SizeAt1440` | **数字 `0`**（clamp 含 vh/% 或 calc、或没有 px） |

`h1SizeAt1440 = 0` 是这里最值得注意的一条：它是**数字 0 而不是空串**，
所以任何 `=== ""` 的判据都抓不到；而 `666` 行 `parseFloat(...) || 0` 之后
`if (!h1) return ""` 会让整条字号约束消失。实测两边同置 0 → 闸门
`FAIL 0 / WARN 2`（多出的那条 WARN 是 `no-typescale`）。

### 6.3 `risk` / `reuse`：D 段结构性够不着

实测 `dna-clean.json` 的 23 个键：

```
id dir structType threshold tone palette primary fonts radius radiusBare radiusWhy
shadow shadowDetail lineWidths lineWidthsWhy lineWidthsInteractive h1Size h1SizeWhy
bodySize bodySizeWhy h1SizeAt1440 mechanism charBudget
```

`risk`、`reuse`、`degrades` **都不在里面**（它们由 `build-prompts.mjs` 从
`data.js` 的 `risk`/`landing` 与 `minitems-parsed.json` 现取，见 `:44`、`:78`、`:337`）。
所以：

```
KEY_FIELDS 若加入 'risk' → dc['risk'] === undefined → 891 行 continue
```

这三字段的「陈旧度」检查在结构上不可能存在，除非先让 clean-dna 产出它们。

### 6.4 正在生效的静默错值：跨案贪心正则（**这条不是潜伏，是可复现的**）

`build-prompts.mjs:44`：

```js
const re = /"id":\s*"(S\d{2})"[\s\S]*?"risk":\s*"((?:[^"\\]|\\.)*)"/g;
```

`[\s\S]*?` 只保证「到下一个 risk 为止」，**不保证停在下一个 `"id"` 之前**。
所以某一案没有 `risk` 键时，它不会得空串，它会**吞下下一案的 risk**。

在副本里删掉 `data.js` 中 S05 的 `"risk": …`，重跑 `build-prompts.mjs` 的实测：

```
S05 risk 长度 161 开头 "最容易滑向\"复古咖啡店 landing page\"——暖色滤镜加衬线大字加一句手写标语…"
S06 risk 长度 0
```

对照真实数据：S05 本该是「像素风游戏界面」，S06 才是「复古咖啡店 landing page」。
**S05 的提示词凭空多了一条别的案子的风险处方，S06 的风险段整段消失，
而 `check-prompts.mjs` 报 `FAIL 0 / WARN 1`。**

`build-prompts.mjs:78` 的 REUSE 正则同构，同样实测复现（删 S05 的 `landing` →
S05 拿到 S06 landing 里的片段，S06 变 undefined）。

这是本仓库第四类缺陷（量错了对象）的一个新变体：**值非空、格式合法、来源错案**，
任何「非空断言」都拦不住。

---

## 七、给下一位的边界说明（我验证过、但不建议做的事）

1. **不要**按 `42-why-fields-dropped.md` §二点五想的那样「把所有字段加进
   `KEY_FIELDS`」。三个理由，都是实测的：
   - `fonts` 是对象 → `String()` 恒等，加了也 FAIL 0；
   - `palette` 两侧形状不同（数组 vs 字符串）→ 加了 35 案假红；
   - `risk`/`reuse`/`degrades` 不在 dna-clean → `continue` 直接放行。
2. **不要**用「字段非空」当通用判据。`38-empty-field-gate-redteam.md` §0 已经证明它
   在今天的数据上恒真、且把 `bodySize` 的合法空判成缺陷。本报告补的是另一半：
   **`radius`/`shadow`/`lineWidths` 的「失败」根本不是空串，是合法常数**
   （§6.2），非空断言对它们同样恒真。
3. 真正缺的是**文本层断言**（`40-text-level-assertions.md` 的方向）：判「第 2 条字体行
   里有没有 → 分隔符」「第 6 条字号行里有没有倍率」，而不是判 `dna.fonts` 是不是空对象。
   那类断言对 §6.2 的「合法常数」也成立 —— 因为常数读出来就是一句没有指令作用的话。

---

## 八、复现方式（全部在临时副本里，主仓库未改）

```
# 1) 生成仓库副本（只复制 _build/_selection/_prompts 与 35 个案目录）
node %TEMP%\covmap-4vwzbR\build-temp-repo.mjs <副本路径>

# 2) 单边清空（只改 prompts.js）→ 得到「FAIL 2 = stale」
node <副本>\prototypes\_build\check-prompts.mjs --quiet

# 3) 两边同时清空 → 本报告 §4.3 的矩阵
node %TEMP%\covmap-4vwzbR\both-empty.mjs <副本路径>

# 4) 字段级影响面（35 案 × 13 字段，判断「改了提示词变不变」）
node %TEMP%\covmap-4vwzbR\matrix2.mjs
node %TEMP%\covmap-4vwzbR\fsub.mjs        # fonts 的 5 个子字段

# 5) 跨案贪心正则（§6.4）
node %TEMP%\covmap-4vwzbR\rmrisk.mjs <副本路径>   # 删掉 S05 的 risk 后重跑 build-prompts
```

> 主仓库状态：除本文件外无改动（`git status --short` 只有本报告一条 `M`）；
> 所有探针脚本都在 `%TEMP%\covmap-4vwzbR\`，未落到仓库树内。

---

## 附录：本报告用到的实测数字

| 项 | 数字 | 来源 |
|---|---|---|
| 案数 / dna 字段数 | 35 / 13 | 脚本枚举 `prompts.js` |
| 闸门基线 | 长度 1827–2163，中位 1979；FAIL 0 / WARN 1 | `check-prompts.mjs` |
| S13 基线提示词长度 | 1936 字 | `buildStylePrompt('S13')` |
| `radiusBare` 真值案数 | 31/35 | 脚本枚举 |
| `degrades` 真值案数 | 13/35 | 脚本枚举 |
| `reuse` 有值案数 | 26/35 | 脚本枚举 |
| `displayStack` 长 1 的案 | 0/35（全部 ≥2） | 脚本枚举 |
| `bodyStack` 长 ≤1 的案 | 4/35：S05/S09/S26/S29 | 脚本枚举 |
| `mono` 为空的案 | 6/35：S25/S31–S35 | 脚本枚举 |
| `bodySize` 取值分布 | 16px×25 / 17px×6 / 15px×3 / 20px×1 | 脚本枚举 |
| `dna-clean.json` 键数 | 23（不含 risk/reuse/degrades） | 实测 |
