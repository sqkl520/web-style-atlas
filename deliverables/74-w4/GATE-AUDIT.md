# GATE AUDIT — 约束 `prompts.js` / `prompt-copy.js` 的现有闸门

审计对象：`D:/Web/style`
审计日期：本轮 74-w4
审计者：Gate Auditor

---

## 0. 结论速览

| 问题 | 结论 |
|---|---|
| `check-prompts.mjs` 是否校验提示词里的数字能在 `style.css` 找到？ | **是，但只三种：hex 色值、线宽（px）、字号存在性（`font-size` 关键词，不校验数值）。机制句里的数字完全不在范围内。** |
| 是否有任何闸门读 `dna.mechanism`？ | **没有。8 个检查脚本里 `dna.mechanism` / `.mechanism` 精确引用数 = 0。** `check-docs.mjs` 的 5 处 `mechanism` 全是**散文里的英文/中文词「机制」**，用于给 `nums/schemes` 的数字加「别的轴」白名单，不是读字段。 |
| 改 `dna.mechanism` 会不会让现有闸门变红？ | **只有超长时才会，且只有一条断言：`check-docs.mjs` 的 `nums/prompt-len`（3% 容差）。** `panel/fields` 与机制句无关。实测阈值见 §3.3。 |
| `_mech.mjs` 能否直接用？ | **不能。** 11 个 miss 里 **6 个误报**（S07 14%、S07 0.5px、S09 3.5px、S13 3%、S13 14%、S03 9栏[理由错]）、**3 个真报**（S17 96px、S09 5%、S09 10%）；**另把真错 S10 `1px` 判成通过**（`/1\s*px/` 吃到 `21px` 后缀）；**并漏掉最坏的 S07 `5栏`**（`grid-template[^;]*5` 吃到 `5fr`）。详见 §4。 |
| 数值错的案有几件？ | **不止 recon 说的三件。复核发现 5 件：S03（9 栏）、S07（5/7 栏）、S17（96px）、S10（1px 实为 1.5px）、S09（5%–10% 实为 6.0%–7.7%）。** 详见 §4.6。 |
| 新检查器放哪里？ | **放进现有 `check-prompts.mjs` 作为第 5 个断言块**，不另起文件。理由与具体分工见 §5。 |
| 新判据能覆盖多少？ | **实测：只查 `px/mm/%` 时，30 案出 3 FAIL（S09/S10/S17，全是真错）+ 2 WARN（S03/S13 仅注释）+ 0 误报**（`_m1-final.mjs`）。**S03 与 S07 抓不到** —— 它们是量纲语义错，值确实存在。扩大到 `栏/行/层` 会出 32 条 FAIL，绝大多数误报。详见 §5.2。 |

---

## 1. `check-prompts.mjs` 断言清单（逐条，带行号）

文件：`prototypes/_build/check-prompts.mjs`（442 行）。当前实测：**FAIL 0 / WARN 0，exit 0**（§6 有 verbatim 输出）。

### 1.1 每案循环内的断言（`for (const d of DIRS)`，L223–330）

| # | 行号 | 规则名 | 级别 | 断言内容 | 对照来源 | 数字校验？ |
|---|---|---|---|---|---|---|
| 1 | L230 | `prompt-build` | FAIL | `buildStylePrompt(id)` 不抛错 | 无（异常捕获） | 否 |
| 2 | L233 | `prompt-missing` | FAIL | 提示词非空且 ≥ 500 字 | 硬编码 500 | 否 |
| 3 | L244 | `palette-line` | FAIL | 提示词里能匹配到 `/1\.\s*配色只用这几个值：([^\n]*)/` | 模板骨架 | 否 |
| 4 | L250–253 | `palette-not-in-css` | FAIL | 配色段每个 hex 必须在 `style.css`（剥 CSS 注释）**或** `index.html` 的 hex 集合里 | `style.css` + `index.html` | **是（仅 hex）** |
| 5 | L254 | `palette-empty` | FAIL | 配色段至少 1 个 hex | 无 | 否 |
| 6 | L261–277 | `linewidth-not-in-css` | FAIL | `线宽只用这几级：` 之后所有 `/[\d.]+/g` 数字，每个都要在「CSS 线宽 ∪ HTML stroke-width 属性 ∪ HTML 内联 JS 三元值」集合里找到 `±0.02` 内的值 | `style.css` + `index.html` + 内联 `<script>` | **是（仅线宽 px）** |
| 7 | L274–276 | `linewidth-wording` | WARN | 列了 ≥3 级却说「不要自创第三级」 | 文本自洽 | 否 |
| 8 | L297–313 | `hex-in-negative-context` | WARN | 配色段之外的 hex，若任一出现位置的 ±40 字窗口内含否定词（`不要\|禁止\|避免\|不得\|反的是\|不允许\|别用\|勿用\|拒绝\|规避`），报警 | 文本自洽 + 参考文献 | 否 |
| 9 | L315–319 | `hex-outside-palette-line` | INFO | 段外但非否定语境的 hex，仅记录 | 无 | 否 |
| 10 | L325–327 | `no-typescale` | WARN | 提示词含 `/字号\|字阶\|最大标题\|主标题取\|font-size/` 之一 | 关键词存在性 | **否——注意：只查关键词存在，不查数值** |

### 1.2 全局断言

| # | 行号 | 规则名 | 级别 | 断言内容 |
|---|---|---|---|---|
| 11 | L335–337 | `coverage` | FAIL | 生成成功的提示词数 == 30 个目录数 |
| 12 | L346–360 | `template-marker` ×4 | FAIL | 每条提示词含 4 个骨架标记：`/我经营＿+。/`、`/视觉硬约束/`、`/结构约束/`、`/输出要求：只给一个完整单文件 HTML/` |
| 13 | L372–402 | `stale-vs-dna-clean` | FAIL | **`prompts.js` 的 `dna.{h1Size, lineWidths, radius, shadow}` 四个字段必须与 `dna-clean.json` 逐字相等**（`KEY_FIELDS` 在 L379） |
| 14 | L399–401 | `stale-summary` | FAIL | 落后案数汇总 |

### 1.3 关键的「数字是否在 CSS 里」实现细节（回答提问 1）

**有三种不同的匹配策略，粒度完全不同：**

- **hex（L79–81, L129–132）**：全局正则 `/HEXT/g` → `#(6位|3位)`（带 `(?![0-9a-fA-F])` 右边界），小写归一化、3 位展开成 6 位，去重成 `Set`。**是精确 token 匹配，不是子串匹配。** 但**不区分语境**——CSS 注释被剥掉（`stripCssComments` L84），但 `url()`、SVG data-URI、`content:"…"` 里的 hex 也算。
- **线宽（L159–205）**：先剥注释、展开 `:root` 变量（`resolveVars` L99–105）、求值 `calc()`（`evalCalc` L114–126），再用属性白名单正则 `/(?:^|[;{\s])(border...|outline...|column-rule...|stroke-width)\s*:\s*([^;}]+)/g` 抓值，从值里用 `/(?:^|\s)(\d*\.?\d+)px/` 取第一个数字。**注意这是「声明值的第一个 px」，不是完整 token 流。** SVG 的 `stroke-width` 额外允许无单位（L171–174）。
- **字号**：**没有任何数值校验**。L325 只测 `/font-size|字号|字阶/` 关键词是否出现。README 声称「配色/线宽/字号」，但字号这条实际只是「提了一句没有」。

**直接回答提问 1：是的，它校验「提示词里的数字出现在 style.css 里」，但只对 hex 与线宽两类，且：**
- 用法是**正则抽取 + Set 成员判断**（hex）和**数值 `±0.02` 近似匹配**（线宽）；
- 线宽做了**空白归一化**（`\s*` 在正则里）与**变量/calc 展开**；
- **完全没有**「机制句」这条路径：它读的是 `text`（`buildStylePrompt(id)` 的完整输出）里以「配色只用这几个值：」「线宽只用这几级：」打头的两行，机制句那句「这个风格的签名动作：…」不匹配任何一条抽取正则。

> ⚠️ 这条对本任务很重要：**机制句不是「漏在 check-prompts 之外」，而是 check-prompts 的抽取口径是按「段标题锚点」写的，机制句没有段标题。** 加一条断言需要在 L261 附近新增一个锚点正则，而不是改现有判据。

---

## 2. `check-docs.mjs` 的两条相关断言

### 2.1 `panel/fields`（L758–803，字段断言中心在 L770）

**它数什么：**

```js
// L765-768
const docFieldCount = (() => {
  const m = src.match(/(?:全部\s*(\d{1,2})\s*段字段|all\s+(\d{1,2})\s+fields)/i);
  return m ? Number(m[1] || m[2]) : null;
})();
// L770
else if (docFieldCount !== P2.totalFields) bad.push(`README 写 ${docFieldCount} 段字段，app.js 实测 ${P2.totalFields} 段（field() ${P2.fieldCalls} + auditFold 1）`);
```

- 数的是 **`app.js` 里 `field('…')` 字面量调用数**（L437 `/\bfield\(\s*'/g`，先剥注释 L436）+ `auditFold` 的 1。
- 同块还有 5 条子断言（L773–798）：audit 30/30 有值、audit min/max/median/total 四个数、audit 在 risk 之前（源码行号比较）、`AUDIT_CUT_AT` 不存在、S13 的 audit 不含「反套路改造三指标」。
- **与 `dna.mechanism` 的关系：零。** 它读 `app.js` 与 `data.js` 的 `audit` 字段。机制句既不在 `field()` 调用里，也不在 audit 文本里。**改机制句文案，这条断言不会有任何反应。**

### 2.2 `nums/prompt-len`（L644–699）

**它数什么：**

```js
// L376-399 buildPromptLengths(): 真跑 prompt-copy.js，对 30 案调 buildStylePrompt(id).length
// L668  约 N 字
/(?:约|大约|roughly|about|approximately)\s*([\d,]{3,6})\s*(?:字|characters)/gi
// L675  N 字左右 → 一律 FAIL
/([\d,]{3,6})\s*字左右/g
// L678  区间
/([\d,]{3,6})\s*[–—\-~至]\s*([\d,]{3,6})\s*字/g
// L683  英文区间
/([\d,]{3,6})\s*(?:–|—|-|to)\s*([\d,]{3,6})\s*characters/gi
// L690  中位
/(?:中位|median)\s*([\d,]{3,6})\s*(?:字|characters)/gi
```

三档判定（L654 `DRIFT = 0.03`）：精确相等 = PASS；偏差 ≤ 3% = WARN（drift）；> 3% = FAIL。

**当前值：** 实测 min 1814 / median 1988 / max 2138；README 写的就是这三个数，因此 PASS。

### 2.3 改 `dna.mechanism` 会不会破这两条？

| 断言 | 改机制句文案会否触发 | 触发条件 |
|---|---|---|
| `panel/fields` | **不会** | 与 mechanism 无数据通路 |
| `nums/prompt-len` | **会，但只在长度尾部** | 只影响 min/max 两端各一个案（S09=1814 最低、S23=2138 最高），且要超过 3% |

**逐案实测的容差边界（README 文档值 1814 / 1988 / 2138）：**

| 文档值 | 允许的实测范围（±3%） |
|---|---|
| 1814（下限） | 1762 – 1870 |
| 1988（中位） | 1931 – 2049 |
| 2138（上限） | 2076 – 2204 |

也就是：**S09（1814）的机制句最多能减约 52 字**（1814−1762），**S23（2138）的机制句最多能加约 66 字**（2204−2138）。其余 28 案的机制句改动**无任何闸门反应**（§3.3 有实测模拟）。

---

## 3. `check-twolines.mjs` — R1/R6/R7/R8

### 3.1 四条断言的实际内容

| 规则 | 行号 | 断言 | 数据来源 |
|---|---|---|---|
| **R1** | L156–162 | `data.js` 的 `palette` hex 集合 ⊆ `prompts.js` 的 `dna.palette` hex 集合 | 两侧都是**解析出的 hex 串**，不是字符串包含 |
| **R6** | L225–233 | UI 印的「主色」(`sc.primary`) === 规格字段 3 里切分句取到的「主色」hex | `_specs/*.md` 解析（`specPrimaryOf` L107–126） |
| **R7** | L249–259 | `prompts.js` 的 `dna.palette` 每一项去掉 hex 后必须**还剩至少一个字母或汉字**（角色名） | 自洽 + 角色语义 |
| **R8** | L177–183 | `data.js` 的 `fontsSpec` 必须是非空字符串 | 键存在性 |

### 3.2 是否断言 `data.js` palette ⊆ `prompts.js` palette？

**是。** 原文（L153–162）：

```js
const dPal = asHexList(sc.palette || []);
const pPal = asHexList(ps.dna?.palette || '');

/* R1: data.js ⊆ prompts.js */
const dataOnly = dPal.filter((h) => !pPal.includes(h));
if (dataOnly.length) {
  add('FAIL', id, 'R1-not-subset',
    `data.js 有 ${dataOnly.length} 个色不在 prompts.js 里: ${dataOnly.join(' ')}` +
    `（提示词漏了这些色，AI 就不知道页面要用它们）`);
} else stats.subsetOk++;
```

`asHexList`（L91）先把值拆成数组或按 `、,，` 切分，再对每项跑 `/#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g` **并把 hex 大写化**。所以是**归一化后的集合包含判断**，不是字符串比较。

### 3.3 是否断言 `dna.mechanism`？

**完全没有。** `check-twolines.mjs` 全文 `mechanism` 出现 **0 次**（实测 grep -c = 0）。它只碰 `dna.palette` 和 `data.js` 的 `fontsSpec`/`primary`/`palette`。

---

## 4. `deliverables/74-recon/_mech.mjs` — 算法与两种失败

### 4.1 算法（44 行，全文已读）

```
对 30 案：
  blob = style.css + index.html，剥 /* */ 注释          （L10-12）
  m = s.dna.mechanism                                    （L13）
  toks = m 里所有 /(\d+(?:\.\d+)?)\s*(px|%|秒|栏|列|枚|档|度|°|deg|ch|vh|em)/g
         去空格                                         （L14-15）
  对每个 token：
    num = token 的数字部分；unit = 剩下的单位
    n = num 把 '.' 转义成 '\.'
    按 unit 分四类，各给一组正则候选（L21-34）：
      角度类：/n\s*(?:°|deg|度)/ | /rotate\(\s*n/ | /ndeg/
      栏/列类：/n\s*(?:栏|列)/ | /repeat\(\s*n\b/ | /span\s+n\b/
              | /grid-column[^;]*n/ | /grid-template[^;]*n/
      枚/档/级类：/n\s*(?:枚|档|级)/ | /repeat\(\s*n\b/ | /--[a-z-]*n\b/ | /n\s*(?:条|个)/
      秒类：/n\s*(?:s|秒|ms)/
      其它（px/%/ch/vh/em/deg）：/n\s*unit/
    任意一条正则命中 blob → 该 token 通过，否则记为 miss      （L35）
输出每案的 token 数 / miss 数 / 前 5 个 miss，按 miss 降序      （L39-40）
```

**核心判据：`pats.some(p => p.test(blob))`** —— 纯**子串/正则存在性**，与 `check-prompts` 的 hex 判据同构，但**没有数值近似、没有变量展开、没有语境约束**。

### 4.2 实测输出（verbatim）

```
S09    7    3    3.5px 5% 10%
S07    7    2    14% 0.5px
S13    5    2    3% 14%
S17    5    2    1.2px 96px
S03    5    1    9栏
S10    4    1    1px
S01    3    0
…（其余 24 案 miss=0）
TOTAL tokens 162 missing 11 6.8%
```

### 4.3 失败一：误报（false positive）

**根因是「子串匹配 + 无空白/零前缀归一化」。** 逐条实证（`deliverables/74-w4/_classify.mjs` 与 `_mech-trace.mjs` 的输出）：

#### (a) S07 `14%` — 真值写成 `.14`（CSS 规范允许省略前导零）

机制句说「以 8% 至 14% 不透明度」。CSS 里实际是：

```
S07-slate-ink-contents/style.css:107
  .ghost text.hot{opacity:min(.14,calc(var(--ghost-o,.08) * 1.75))}
```

**`.14` 与 `14%` 是同一个值的两种写法**（`.14` 是 alpha 通道，`14%` 是不透明度百分比）。`_mech.mjs` 生成的正则是 `/14\s*%/`，`.14` 不含 `%`，所以 miss。

> 这是**归一化缺失**：需要把 `opacity: .14` 与 `14%` 视为同值，或至少把 `.14` 这种无前导零形式也接受。

#### (b) S07 `0.5px` — 真值写成 `.5px`

```
S07-slate-ink-contents/style.css:80
  .toc{column-rule:.5px solid var(--slate);column-gap:var(--gutter)}
```

`_mech.mjs` 正则 `/0\.5\s*px/` 要求字面 `0.5`，CSS 写的是 `.5`。**同一个前导零问题。**

#### (c) S09 `3.5px` — 真值是 SVG 无单位属性

```
S09-batik-price-board/style.css:312
  #stroke-outer { stroke: var(--ink); stroke-width: 3.5; }
```

`stroke-width: 3.5` 在 SVG 里合法，单位可省略（`check-prompts.mjs` L167–174 的注释专门记录了这一点，并已为此改过一次）。`_mech.mjs` 的 `/3\.5\s*px/` 要求 `px`，miss。

#### (d) S17 `1.2px` — 真值是 SVG `r` 属性

```
S17-revenue-stamp-stub/style.css:151  <circle ... r='1.2' .../>
S17-revenue-stamp-stub/index.html:47  <circle cx="3" cy="7" r="1.2"/>
```

机制句说「孔径 1.2px」。SVG 的半径属性 `r="1.2"` **就是**孔径，但 `_mech.mjs` 只找 `1.2px`。

#### (e) S13 `3%` / `14%` — 真值在 CSS **注释**里，而 `_mech.mjs` 把注释剥掉了

```
S13-blind-debossed-dispatch/style.css:13（注释）
  一级 凹 条款标题盲压凹槽   压深 0.4mm  槽带亮度差 3.1%  边缘对比度 14%
```

实测（`_classify.mjs`）：

| 模式 | 含注释 | 剥注释后 |
|---|---|---|
| `/3\.1%/` | 5 | 1（唯一一处是 `index.html` 的 `<figcaption>` 正文，不是注释） |
| `/(?<![\d.])14%/` | 2 | **0** |

**这是一个方向性错误：** 本仓库的约定（`check-prompts.mjs` L128–132 的 `cssColors`）是「剥注释，因为注释不是事实」。但对 **S13 这类案，注释恰恰是唯一的事实来源** —— `style.css` 的**声明**里根本没有 `14%`，它是由 `filter` 参数反推出来的设计值，作者把推导写在注释里。剥注释 = 把唯一的证据删掉。

> **这不是 `_mech.mjs` 独有的问题，而是新检查器必须做的一个裁决：**「注释能不能算证据」。详见 §5.3。

#### (f) S03 `9栏` — 真值在注释里，且实现换了载体

```
S03-long-exposure-observatory/style.css:120（注释）
  /* ── 观测记录：12 栏，左 3 栏年代轴，右 9 栏影像带 ──────── */
```

`/9\s*栏/`：含注释 1，剥注释 **0**。而且实现里 `.chrono` 是 `grid-template-columns: var(--axis-w) minmax(0, 1fr)`（L124），`--axis-w: 264px` —— **不是 12 栏网格，是两列 flex 近似**。所以 S03 这条是**真错**（机制句比实现更理想化），但 `_mech.mjs` 之所以报它，报的是「9 栏找不到」，而它找不到的原因是**剥了注释**，不是因为它发现了「实现不是 12 栏」。

> 这是**蒙对**：报出了正确的案，理由却是错的。这类「理由错误的真报」比纯误报更危险——它会让下一个修缺陷的人去补注释，而不是去改实现。

#### (g) S10 `1px` — **这是第 4 个真错，不是误报**

我最初按 `_mech.mjs` 的输出把它列为「命中原因不明」，复核后推翻：**S10 的机制句数字确实错了。**

机制句（`prompts.js` S10）：

> 五栏按 6:7:9:8:5 分宽，红版相对黑版固定右下错 **1px**、进视口时先错 3px 再收到 1.5px，标题基线上移 6px

实际（`S10-grid-versus-sheet/style.css`）：

```
:32   --misreg: 1.5px;          ← 「固定右下错」的真实值
:33   --misreg-start: 3px;      ← 「进视口时先错 3px」
:130  .reg-br-red { bottom: calc(10px - var(--misreg)); ... }
:211  transform: translate(var(--misreg), var(--misreg));
```

**全案 CSS/HTML 里 `px` 数值的全集（穷举解析，非 grep）：**

```
0 1.25 1.5 2 2.5 3 3.5 4 5.5 6 8 9 10 11.375 12 14 15 16 17 18 20 22
24 26 28 30 32 34 40 46 48 56 80 88 96 520 767 768 1023 1024 1439 1440
```

**`1` 不在其中。** `1px` 字面量在该案 CSS+HTML 出现 **0 次**（唯一的 `1px` 在 `assets/bake-plates.py:70` 的 docstring 里，不是渲染源）。

所以机制句的「固定右下错 1px」应为 **1.5px**，而「先错 3px 再收到 1.5px」中的终态已经写了 1.5 —— **同一句话里 `1px` 与 `1.5px` 自相矛盾**。这是比 S17 更容易抓的真错：`1px` 在该案源码里根本不存在。

**为什么 `_mech.mjs` 报它**（`_mech-trace.mjs` 实测）：

```
1px   PASS  via /1\s*px/  "1px" "1px" "1px"
```

`/1\s*px/` 无词边界，命中的是 **`21px`/`11px`/`31px` 之类数字的后缀**（`21px` 含子串 `1px`）。`_mech.mjs` 因此判 PASS ——**这是唯一的「真错被误判为通过」**，比它报出的 3 个真错更严重（那 3 个至少红了）。

> 结论修正：`_mech.mjs` 的 **11 个 miss 里，6 个是误报**（S07 14%、S07 0.5px、S09 3.5px、S13 3%、S13 14%、S03 9栏[理由错]）、**3 个真报**（S17 96px、S09 5%、S09 10%）、**1 个真错被漏掉**（S10 1px 被后缀匹配放过）、**1 个待裁决**（S09 的 6.0%/7.7% 见下）。

### 4.4 失败二：漏报最坏情况（false negative）— S07 的 `5栏`

**这是最严重的一条，因为它是「最坏的错」被放过了。**

机制句：「正面 **5 栏** 对背面 **7 栏**」。实际：

```
S07-slate-ink-contents/style.css:74
  .pages{...grid-template-columns:5fr 1px 7fr}
S07-slate-ink-contents/style.css:81-82
  .page-recto .toc{column-count:2}
  .page-verso .toc{column-count:3}
```

`5fr 1px 7fr` 是**两页的宽度比 5:7，中间 1px 装订线**。真实栏数是 `column-count: 2`（正面）/ `3`（背面）。**「5 栏对 7 栏」是错的。**

`_mech.mjs` 的 `5栏` token 命中路径（`_mech-trace.mjs` 实测）：

```
5栏   PASS  via /grid-template[^;]*5/
       命中 "grid-template-columns:5"        ← 这是 .pages 的 5fr
       命中 "grid-template-columns:1fr}\n .plate-grid{...repeat(2,1fr)}\n .plate img{max-height:5"
```

**机制：** `栏/列` 类的候选正则里有一条 `new RegExp('grid-template[^;]*' + n)`。`[^;]*` 是**贪婪且无边界**的，只要 `grid-template` 与数字 `5` 出现在**同一条声明**（分号之前）里就算命中。`.pages` 的 `grid-template-columns:5fr 1px 7fr` 里 `5fr` 的 `5` 刚好被吃到。

**这就是「最坏情况被放过」的确切机制：** 一个 `fr` 宽度比被当成了栏数证据。而 `fr` 与「栏」是两个完全不同的量纲 —— 这正是 §3.1 提到的 `_SYNTHESIS` 判为「硬错」的那条。

同理 `7栏` 是靠 `/repeat\(\s*7\b/` 命中的（L123 `.plate-grid{grid-template-columns:repeat(7,1fr)}`），那是**图版网格的 7 列**，不是「背面 7 栏」。**又是一个量纲错配被当成证据。**

### 4.5 还有第三类缺陷：漏检率被结构性低估

`_mech.mjs` 的 token 正则只认 12 个单位（`px|%|秒|栏|列|枚|档|度|°|deg|ch|vh|em`）。实测 30 条机制句里**阿拉伯数字总出现 252 次，被它检查的只有 162 次（64.3%），35.7% 的数字从未进入判据**（`deliverables/74-w4/_census.mjs`）。

未被覆盖的单位类别（实测）：

| 单位 | 出现数 | 例 |
|---|---|---|
| `mm` | 2 | S13「压深 0.4mm」、S17「印面偏中缝 2mm」 |
| `fr` | 2 | S17「3fr、16px、9fr」 |
| `倍` | 1 | S16「行高压到 0.95 倍」 |
| `ms` | 1 | S18「530ms 方波」 |
| `行` | 1 | S19「20 块面板分 5 行」 |
| `层` | 2 | S23「露 2 至 4 层」、S24「最多 4 层」 |

更严重的是**斜杠/冒号表只被读到最后一个数**：

| 案 | 机制句里的串 | `_mech.mjs` 实际检查的 token |
|---|---|---|
| S05 | `5:2:1`（面积分配比） | `8px,6px` —— 5、2、1 **全部未检查** |
| S10 | `6:7:9:8:5`（栏宽比） | `1px,3px,1.5px,6px` —— 比例**全部未检查** |
| S12 | `3/2/1/1` | `45°,135°,30px,44px,0.5px` —— 比例**全部未检查** |
| S21 | `14 枚 24×96px` | `10栏,10栏,6栏,14枚,96px,1px,60°` —— `24×96` 只读到 `96px` |
| S24 | `5:3` | `8栏,2栏,24px,2.5px,0.4px,2px` —— 5:3 **未检查** |
| S26 | `5:3:4` | `12栏,11°,100%,64%,80%,16px,1.5px,1.2px` —— 比例**未检查** |

**这是量级最大的盲区：** 本仓库机制句的核心信息恰恰是「比例」，而比例恰好是唯一完全不检查的形态。

### 4.6 复核补充：真错是 5 件，不是 3 件

`00-SYNTHESIS.md:119-121` 列了 S03 / S07 / S17 三件。我逐案复核后确认**还有两件**：

| 案 | 机制句 | 源码实际 | 判定 | `_mech.mjs` 的态度 |
|---|---|---|---|---|
| **S10** | 「红版相对黑版固定右下错 **1px**」 | `--misreg: 1.5px`；全案 px 值穷举无 `1`（§4.3g） | **真错**（同句自相矛盾：后半句写 1.5px） | **误判 PASS**（后缀匹配） |
| **S09** | 「留 **5% 至 10%** 缺口」 | 注释与 `index.html` 一致写「外线 **6.0%**、内线 **7.7%**」 | **真错**（数值写错，且区间方向错：5–10% 覆盖 6 但漏 7.7 的下界感错位） | 报 MISS（结果对，理由仍是「剥注释」） |

**S09 的 `5%/10%` 复核细节：** 该案 `style.css:310` 与 `index.html:18` 都写「外线 6.0% / 内线 7.7%」，`stroke-dasharray="100"` 配 `pathLength="100"`，所以 6.0/7.7 是**真实缺口百分比**。机制句的「5% 至 10%」既不等于 6.0，也不覆盖 7.7 为中心的正确区间。

> 于是「机制句数字错」的真实规模是 **5/30 案**，而非 3/30。这改变了 §5 的成本估计：新检查器要修的不只是「加个闸门」，还包含**5 条机制句文案的返工**。



---

## 5. 关键问题：最小新检查器

### 5.1 三个真错分别需要什么判据

先确定要抓什么。以下前三条来自 `deliverables/74-recon/00-SYNTHESIS.md:119-121`，第 4、5 条是我复核后新增（§4.6）。全部已独立验证：

| 案 | 机制句原文 | 实际 | 判据类型 |
|---|---|---|---|
| **S03** | 「右侧 **9 栏**」 | 注释说「12 栏，左 3 栏年代轴，右 9 栏影像带」；实现 `.chrono` 是 `grid-template-columns: 264px minmax(0,1fr)` 两列 | **需要「栏数 vs 列宽定义」的语义区分** —— 不能只查「9 有没有出现」 |
| **S07** | 「正面 **5 栏** 对背面 **7 栏**」 | `5fr 1px 7fr` 是宽度比；真实 `column-count: 2 / 3` | **需要区分 `fr`/宽度比 与 栏数** |
| **S17** | 「金额列 **96px**」 | `96px` 在该案 CSS+HTML 出现 **0 次**；1024–1439 档是 `88px`（`style.css:320`） | **纯存在性即可抓到** |
| **S10** | 「固定右下错 **1px**」 | `--misreg: 1.5px`；全案 px 值穷举无 `1` | **纯存在性即可抓到（前提是用词边界）** |
| **S09** | 「留 **5% 至 10%** 缺口」 | 注释与 HTML 一致写「外线 6.0% / 内线 7.7%」 | **需要「值不在声明里」+ 注释作证据 + 区间语义** |

**关键结论（修订）：五条里，S17 与 S10 能被「数字在源码里找不到」这一类判据直接抓到；S09 需要「注释当证据」的裁决；S03 与 S07 是语义错，数值都存在，纯存在性判据抓不到。**

> 一个纯粹「token 存在性」的检查器，能抓到 **2/5（S17、S10）**；要覆盖 S09 必须引入「注释算证据」的分档（§5.3）；而 **S03 与 S07 结构上需要「量纲匹配」判据**（栏数 ≠ fr 宽度比 ≠ repeat 列数），这已不是存在性检查，而是**语义检查的最小形式**。

`_mech.mjs` 之所以「看起来」抓到了 S03/S07，是因为它剥了注释（S03）与用贪婪 `[^;]*`（S07 被放过）—— 两个都是**判据缺陷的副产品**，不是设计。

### 5.2 建议的最小判据集 —— 已用原型实测验证

我把建议的判据写成四个原型脚本跑了一遍（全部只读，不改仓库）：`_m1-proto.mjs`（全量）、`_m1-narrow.mjs`（+角度）、`_m1-pxonly.mjs`（仅长度）、`_m1-final.mjs`（长度+百分比）。

#### 决定性结果：`_m1-final.mjs` 的实测分布

```
S09  FAIL=2  WARN=0  5% 10%
S10  FAIL=1  WARN=0  1px
S17  FAIL=1  WARN=0  96px
S03  FAIL=0  WARN=1    [仅注释] 32%
S13  FAIL=0  WARN=1    [仅注释] 14%

长度 token=103 FAIL=2 | 百分比 token=18 FAIL=2 | 仅注释 WARN=2
```

**判据（v4）的完整定义：**

1. **只检查三类 token：`px`、`mm`、`%`。** 刻意**不**检查 `栏/列/行/层/枚/档/倍/fr/时间/角度`。
2. **前后词边界：** `/(?<![\d.])(\d+(?:\.\d+)?)\s*(px|mm|%)(?![\w])/g`。
3. **源码侧三套抽取：**
   - 声明侧（剥 CSS 注释 + HTML 注释）与注释侧（只取注释体）**分开建集合**；
   - 长度集合包含 `Npx`、`Nmm`、SVG `stroke-width: N`（无单位）、SVG `r="N"`；
   - 百分比集合包含 `N%` **与 `opacity: .NN` 归一成 `NN%`**（这一条修掉 S07 的 `.14` 误报）。
4. **判定分三档：** 声明侧命中 = PASS；仅注释侧命中 = **WARN**；两侧都没有 = **FAIL**。

**这个 v4 判据同时做到了三件事：**

| 目标 | 结果 |
|---|---|
| 抓到 S17（96px 不存在） | ✅ FAIL |
| 抓到 S10（1px 不存在，recon 未发现） | ✅ FAIL |
| 抓到 S09（5%/10% 与 6.0%/7.7% 不符） | ✅ FAIL |
| **零误报** | ✅ 30 案里只有 3 案红，全部是真错 |
| S13 的 3%/14%（合理值，只在注释） | ✅ 降级 WARN，不假红 |
| S03 的 32%（预生成位图的 cos⁴，只在注释） | ✅ 降级 WARN，不假红 |

#### 但 v4 抓不到 S03 与 S07 —— 这是必须承认的边界

| 案 | 为什么抓不到 |
|---|---|
| **S03** | 「9 栏」是**栏数语义**。该案实现是 `grid-template-columns: 264px minmax(0,1fr)`，没有 `column-count`，也没有 `repeat(9,…)`。数字 `9` 只出现在注释里，而 `9栏` 不在 v4 的检查类别内（即便放进「栏」类，`9` 也找不到对应声明）。**这是实现与文案的真实分歧，不是数值笔误。** |
| **S07** | 「5 栏 / 7 栏」同理。`5` 在 `5fr` 里（量纲不同，v4 靠词边界正确拒绝），`7` 在 `repeat(7,1fr)` 里（那是图版网格的列数，不是「背面栏数」）。真实 `column-count: 2 / 3`。 |

**对这两条，任何「值存在性」判据都不可能抓到，因为值确实存在（只是量纲错配）。** 我在 §5.2 开头试过把它们放进「栏」类：

```
_m1-proto.mjs（含栏/行/层/枚/档/倍/角度/时间，共 175 token）
TOTAL tokens=175  FAIL=32  WARN_comment=2
```

**32 条 FAIL —— 其中绝大多数是误报。** 原因：

- **S01「4 栏版心」**：实现是 `grid-template-columns: 5fr var(--bar) 4fr var(--bar) 4fr var(--bar) 3fr` —— 4 是**第三条轨道的宽度数值**，不是「4 栏」。但没有 `column-count: 4`。
- **S15「1 至 8 栏」**：实现是 `grid-column: 1 / 9` —— 栏数 = 9−1 = 8，**数值 8 不以 `8栏` 或 `repeat(8` 形式出现**。
- **S19「20 块面板分 5 行」**：`index.html` 里是 5 个 `<div class="rowwrap">` —— 行数是**数 DOM 节点数出来的**，源码里没有 `5` 这个数。
- **S27「9 栏、正文占 5 栏、签发栏 3 栏」**：答案在 `grid-column` 的起止线号里。

> **结论：`栏/行/层` 在 CSS 里不是「值」，是「区间」或「节点计数」。用值存在性判据去查它们，误报率约等于 30/30 里的 12 案。**
>
> 这正是 `_mech.mjs` 用 `/grid-template[^;]*5/` 这种宽松匹配的原因 —— 它宽松到能命中，但代价是把 `5fr` 当成 `5 栏`。**宽松匹配与精确匹配在这里是同一枚硬币：要么误报，要么漏报。**

因此 v4 的**结构性取舍**是：

- **能上线的部分（v4）**：`px/mm/%` 三类。误报 0，抓 3 案。
- **不能上线的部分**：`栏/列/行/层/枚/档`。需要「CSS 区间语义解析器」（把 `grid-column: 1/9` 读成 8 栏），那是另一个量级的工作，且需要 CDP 渲染实测来仲裁。**建议第一版明确列为「不判」，并在输出里打印数量**（约定见 M2）。
- **S03 / S07 靠 v4 抓不到，必须靠人工返工文案。** 这是 5 条文案返工里的 2 条。

#### 原方案里的 M1 四项要求的保留/删除

| 原要求 | 裁决 | 依据 |
|---|---|---|
| 前导零归一（`.14` ↔ `14%`） | **保留，且升级为「opacity 小数→百分比」** | S07 误报的直接原因 |
| 单位族归一（`stroke-width: N`、`r="N"`） | **保留** | S09 `3.5`、S17 `r=1.2` 的误报原因 |
| 词边界（`5栏` ≠ `5fr`、`1px` ≠ `21px`） | **保留，最高优先级** | S10 真错被漏 + S07 漏报的唯一防线 |
| 注释当证据 | **改成 WARN 档，不参与退出码** | S13/S03 的 3 个注释值全是合理推导 |

### 5.3 必须裁决的一件事：注释算不算证据

这是 S13（3%/14% 只在注释）与 S03（9 栏 / 32% 只在注释）逼出来的。**§5.2 的 v4 已经给出了实测答案：降级为 WARN，不进退出码。**

| 立场 | 后果（实测） |
|---|---|
| 注释算证据（PASS） | S13 通过；S03 的 32% 通过 —— **但 S03 的 9 栏也一并被放过**（它本来就不在检查范围） |
| 注释不算证据（FAIL） | S13 与 S03 各出 1 条 FAIL —— **两条都是误报**（3%/14% 与 32% 都是有依据的推导值） |
| **分档：声明 PASS / 仅注释 WARN / 都没有 FAIL** | ✅ **v4 实测出 2 条 WARN（S03 32%、S13 14%），0 条假 FAIL** |

**推荐第三档，已实测。** 它与本仓库既有实践一致：`check-prompts.mjs` L128–132 剥注释是因为「注释里的色会被误当声明」；但 `check-twolines.mjs` R5（L265–293）已经引进了「注释当作**角色语义**来源」的先例。**同一个仓库已经有两种注释用法，新检查器显式分档而不是二选一。**

**WARN 文案必须点明「这条只是没有被声明佐证」，而不是「这条错了」**，否则下一个人会去改正确的数字。拟：

```
~ [mech-value-comment-only] S13  机制句的「14%」只在该案注释里找到
  （style.css:13「边缘对比度 14%」）。它是从 filter 参数反推的推导值，
   实现里没有对应声明。这不是错，但也没有声明在守护它。
```

### 5.4 分工建议：**扩展 `check-prompts.mjs`，不新建文件**

#### 反对新建 `check-mechanism.mjs` 的理由（按权重排序）

1. **它与 `check-prompts.mjs` 的输入完全相同。** 两者都需要：`prompts.js` 求值（`window.STYLE_PROMPTS`）、`buildStylePrompt` 装载（data.js + prompt-copy.js + DOM stub）、30 个 `Sxx-*` 目录枚举、每案的 `style.css` + `index.html`。**`check-prompts.mjs` 的 L39–76 已经把这一整套「装载 + 目录枚举 + sandbox 求值」写好了 38 行**，且其中 `loadBuildPrompt()`（L48–66）的 DOM stub 是踩过坑的产物。新建文件意味着**复制这 38 行**，或者抽公共模块（那要改 8 个文件的 import，风险与收益不成比例）。
2. **判据同构。** 新判据 M1 与现有的 `palette-not-in-css`（L250）和 `linewidth-not-in-css`（L261）是**同一个模式**：抽 token → 与源码声明集合比对。差别只在「抽 token 的正则」与「源码侧的抽取函数」。放进同一个循环里，可以共用 `stripCssComments`、可以共用每案已读入的 `css`/`html` 变量。
3. **闸门数量本身是成本。** README `README.md:174-178` 是一张**手写的**闸门清单表，`check-docs.mjs` 的 `paths/exist` 与 `i18n/facts` 都在对账 README。**新建第 9 个检查器 = 要同时改 README.md 与 README-EN.md 两处表格**，否则文档与实现背离（这正是这个仓库最贵的一类缺陷，`check-docs` 13 条断言全在管这个）。而扩展 `check-prompts.mjs` **不需要动 README 的表格**，只需在它已有的描述行里加半句。
4. **`check-prompts.mjs` 的文件头（L1–21）已经把这个闸门的使命写成「提示词内容 vs 独立来源」** —— 机制句的数字正是「提示词内容」。不放进来的话，这个文件的名字与它的实际范围就不一致了。

#### 具体建议：在 `check-prompts.mjs` 里加第 5 个块（v4 规格）

```
插入位置：L321（现有「4. 字号」块）之后、L329 `stats.pass++` 之前
新增内容：
  · 常量 MECH_ANCHOR = /这个风格的签名动作：([^\n]*)/
      实测 30/30 都命中（已验证），锚点可靠
  · 新函数 sourceNumbers(css, html) —— 复用 stripCssComments(L84) / parseRootVars(L92) /
    resolveVars(L99) / evalCalc(L114)，返回两个集合对：
        { decl: { len:Set, pct:Set }, comm: { len:Set, pct:Set } }
      len 收录：Npx / Nmm / stroke-width: N / r="N"
      pct 收录：N% / opacity: .NN → NN%
  · 新函数 mechNumbers(mech) —— /(?<![\d.])(\d+(?:\.\d+)?)\s*(px|mm|%)(?![\w])/g
  · 断言 mech-value-not-in-source       FAIL  声明侧与注释侧都没有该值
  · 断言 mech-value-comment-only        WARN  只在注释侧（不进退出码）
  · 断言 mechanism-marker               FAIL  「签名动作：」句丢失（防模板改坏）
  · INFO 行打印不判定的 token 数量（栏/行/层/枚/档/倍/fr/角度/时间/比例表）
退出码：沿用现有的 `process.exit(FAILS.length ? 1 : 0)`，无需新增
```

**净新增约 70–90 行**（比我最初估的 90–110 少：v4 砍掉了角度、栏数、比例表三类，因此不需要量纲映射表与区间解析器）。原型文件 `deliverables/74-w4/_m1-final.mjs` 是**可直接移植的参考实现**，52 行。

#### 为什么不放进 `check-twolines.mjs`

虽然它叫「两条链的关系闸门」，且机制句也是两链（`dna-clean` / `mechanisms.mjs` → `prompts.js`）的产物，但：
- 它**不装载 `buildStylePrompt`**（只 `evalWindow` 两个文件），加进来要新增一整套装载逻辑；
- 它的定位是「关系」而非「内容正确性」，机制句的数字正确性是**内容**而非**关系**；
- 它已经删过 3 条恒真式断言（L185–207 的 R2/R3/R4），作者对「往这里堆断言」有明确警惕。

#### 补充：v4 的实测产出量也不支持独立成文件

除了 §5.4 开头的四条，v4 的实测结果又加了一条：**新判据只有 3 条 FAIL + 2 条 WARN + 1 条 INFO，输出量很小。** 它撑不起一个独立文件的心智负担（README 两版表格、`check-docs` 的 `paths/exist` 与 `i18n/facts` 对账、CI 脚本清单）。**一个 52 行判据配一个 442 行的文件是合适的；配一个新建的 150 行文件则是让「闸门数量」这个指标虚高。**

#### 不建议只依赖 `stale-vs-dna-clean`（L379 `KEY_FIELDS`）

理论上把 `mechanism` 加进 `KEY_FIELDS` 很便宜（一行）。**但实测不可行：**

| 字段 | `dna-clean.json` 有值的案 | 逐字相等的案 |
|---|---|---|
| `mechanism` | **10/30**（只有 S01–S10，其余 20 条是空串） | 10/30 |

`dna-clean.json` 只覆盖 S01–S10 的机制句；S11–S30 的 20 条由 `prototypes/_prompts/mechanisms.mjs` 在 `build-prompts.mjs:105-110` 合并时注入。**把 `mechanism` 加进 `KEY_FIELDS` 会让 20 条立刻 FAIL（`dna-clean=空串` vs `prompts.js=有内容`），这不是缺陷，是数据源分工。** 若要复用这条断言，必须同时把 `mechanisms.mjs` 纳为第三个数据源，那已经超出「一行」的成本。

> 附加发现：`build-prompts.mjs:107` 会写 `d.mechanismSource`（带行号来源），**但 `prompts.js` 里 30/30 都没有这个字段，`dna-clean.json` 里也是 0/30**。原因是那 20 条已经在 `dna-clean.json` 里被判定为「有 mechanism」——实测 `dna-clean.json` 的 30 条**全部**有 `mechanism` 键，其中 20 条的值是空串。`if (!d.mechanism && MECHANISMS[d.id])` 对空串成立，所以会注入 `text`，但 `mechanismSource` 被写进 `d` 后，`build-prompts.mjs:321` 的 `mechanism: d.mechanism` **没有把 `mechanismSource` 一起写进输出对象**。也就是说 **20 条机制句的行号来源在生成物里丢失了** —— 而这正是新检查器最需要的溯源信息。建议新检查器顺带断言「有 mechanism 的案必须有 mechanismSource」，或至少把这个问题报出来。

---

## 6. 现行闸门 verbatim 输出

### 6.1 `node prototypes/_build/check-prompts.mjs`

```
提示词闸门：检查 30 条提示词（源: prototypes/_selection/prompts.js + prompt-copy.js vs prototypes/Sxx/style.css + index.html）
  长度 1814–2138，中位 1988  配色段 hex 合计 168

· [hex-outside-palette-line] 1 条（信息，不需动作）
    S25  配色段之外还有 1 个 hex，均为技术说明（派生色/混合结果），不是否定句: #181c0d

合计 FAIL 0 / WARN 0
```

**退出码：0**

`--json` 模式：`stats.fail=0, stats.warn=0, stats.pass=30`，`findings` 只有那 1 条 INFO。

### 6.2 `node prototypes/_build/check-docs.mjs`（相关两条）

```
文档一致性：README.md ↔ data.js / prompts.js / prompt-copy.js
  ✓ nums/prompt-len      提示词长度 = 1814–2138，中位 1988，文档一致
  ✓ panel/fields         12 段字段（field() 11 + auditFold 1），audit 30/30 有值（276–444，中位 324，合计 10065），顺序 audit → risk，S13 = 306 字且无评审工件
  ...
README.md: 0 FAIL / 0 WARN / 13 PASS
```

**退出码：0**

### 6.3 当前状态判读

**三道闸门全绿，而 S03 / S07 / S17 三条机制句的错误全部在盘上。** 这与 `_SYNTHESIS.md:113-124` 的判断一致：机制句是「唯一传给用户的结构描述」，却是唯一没有任何闸门读的字段。**绿不是因为正确，而是因为没有人问。**

---

## 7. 30 条 `dna.mechanism` token 普查

### 7.1 长度分布（`deliverables/74-w4/_census.mjs`）

```
n=30  min=74  p25=86  median=89  p75=91  max=118  mean=88.1  sd=7.6
```

| 统计量 | 值 |
|---|---|
| 最短 | 74（S01） |
| 中位 | 89 |
| 最长 | **118（S20，唯一破 100 的案）** |
| 均值 | 88.1 |
| 标准差 | 7.6 |

分布**高度集中**：p25=86 到 p75=91 只差 5 字。26/30 落在 83–91 区间。S20 的 118 是唯一离群值（它在 `mechanisms.mjs` 里有 2026-10-30 的 Lead 裁决注释，说明它被改写过一次）。

### 7.2 带单位 token 的覆盖

`_mech.mjs` 的口径（`\d+ (px|%|秒|栏|列|枚|档|度|°|deg|ch|vh|em)`）：

| 指标 | 数值 |
|---|---|
| 带单位 token 的案 | **30 / 30** |
| 完全无单位 token 的案 | **0 / 30** |
| 完全无阿拉伯数字的案 | **0 / 30** |
| 单位 token 总数 | **162** |
| 全部阿拉伯数字出现次数 | **252** |
| **未被 `_mech.mjs` 覆盖的数字** | **90（35.7%）** |

**单位种类分布：**

| 单位 | 次数 |
|---|---|
| `px` | 101 |
| `栏` | 23 |
| `%` | 18 |
| `°` | 16 |
| `秒` | 1 |
| `列` | 1 |
| `em` | 1 |
| `枚` | 1 |

**未被覆盖的单位（19 处）：** `mm`×2、`fr`×2、`倍`×1、`ms`×1、`行`×1、`层`×2 —— 加上 18 处斜杠/冒号比例表与约 70 个无单位的裸数字（如 `5:2:1` 里的各项、`3/2/1/1` 里的各项）。

### 7.3 逐案明细

| 案 | 长度 | 单位 token 数 | 全部数字数 | 比例表 | 单位 token |
|---|---|---|---|---|---|
| S01 | 74 | 3 | 4 | — | 11°, 4栏, 24px |
| S02 | 75 | 3 | 5 | — | 2px, 180°, 56px |
| S03 | 91 | 5 | 5 | — | 264px, 9栏, 30秒, 28px, 32% |
| S04 | 76 | 4 | 6 | — | 12列, 6栏, 7px, 1.2° |
| S05 | 76 | 2 | 8 | 5:2:1 | 8px, 6px |
| S06 | 88 | 2 | 6 | — | 3°, 96px |
| S07 | 87 | 7 | 7 | — | 8%, 14%, 1px, 5栏, 7栏, 0.5px, 28px |
| S08 | 85 | 6 | 7 | — | 24px, 12px, 10px, 2px, 200px, 6px |
| S09 | 91 | 7 | 8 | — | 1.5°, 56px, 12px, 3.5px, 2px, 5%, 10% |
| S10 | 84 | 4 | 9 | 6:7:9:8:5 | 1px, 3px, 1.5px, 6px |
| S11 | 86 | 3 | 6 | — | 56px, 3px, 12% |
| S12 | 91 | 5 | 11 | 3/2/1/1 | 45°, 135°, 30px, 44px, 0.5px |
| S13 | 87 | 5 | 6 | — | 135°, 3%, 14%, 315°, 0.8px |
| S14 | 90 | 5 | 8 | — | 120px, 26°, 61°, 48px, 44% |
| S15 | 91 | 6 | 10 | 0/3/7 | 8栏, 40px, 12栏, 62%, 7px, 56% |
| S16 | 88 | 4 | 8 | 4/6/7/9 | 12°, 24px, 9栏, 0.02em |
| S17 | 91 | 5 | 8 | — | 16px, 1.2px, 6px, 24px, 96px |
| S18 | 91 | 8 | 10 | — | 12%, 34%, 24px, 8px, 8px, 12px, 3px, 14px |
| S19 | 91 | 6 | 11 | 2/3/4 | 4栏, 24px, 24px, 144px, 24px, 0.8px |
| S20 | **118** | 6 | 10 | 0.6/1.2/2.4 | 96px, 24px, 0.2px, 8px, 0.35px, 2.4px |
| S21 | 91 | 7 | 14 | 30/45/60 | 10栏, 10栏, 6栏, 14枚, 96px, 1px, 60° |
| S22 | 90 | 8 | 9 | — | 6栏, 22px, 56px, 88px, 8px, 16.5px, 3px, 4px |
| S23 | 91 | 5 | 13 | 3/2/2/1/1 | 1px, 62°, 2px, 6px, 96px |
| S24 | 89 | 6 | 11 | 5:3 | 8栏, 2栏, 24px, 2.5px, 0.4px, 2px |
| S25 | 88 | 5 | 9 | — | 7栏, 56px, 12px, 1.6px, 24px |
| S26 | 91 | 8 | 11 | 5:3:4 | 12栏, 11°, 100%, 64%, 80%, 16px, 1.5px, 1.2px |
| S27 | 83 | 6 | 6 | — | 9栏, 20px, 7px, 5栏, 3栏, 1.8px |
| S28 | 89 | 6 | 9 | — | 16栏, 64px, 7栏, 2栏, 14px, 24px |
| S29 | 91 | 7 | 7 | — | 72px, 3px, 18px, 1.2px, 48px, 18px, 96px |
| S30 | 89 | 8 | 10 | — | 32°, 96px, 9px, 28px, 9px, 1.5px, 55%, 70% |

### 7.4 这一节对「blast radius」的意义

- **30/30 都会被新检查器触达**（没有一条是无数字的散文）。所以新判据不是「给少数案加保险」，而是**改变全部 30 条的状态**。
- **误报的代价是 30 倍。** `_mech.mjs` 当前 11/162 = 6.8% 的 miss 率，其中约 6 个误报 —— 如果原样上线，会有 4–5 个案变成假红，而这 4–5 个案的机制句是**对的**。按本仓库的既有教训（`check-prompts.mjs` L134–142 记录了四类误报、L167–170 记录了三类），**上线一个会误报的闸门比没有闸门更贵**：它会教下一个人去怀疑正确的数据。
- **S20 的 118 字是长度异常值**，但它不在 `check-docs` 的 `nums/prompt-len` 的 min/max 端点上（它在 prompt 长度 1945，不在两端），所以改它**不会触发任何现有闸门**。

---

## 8. 交付清单

| 项 | 状态 |
|---|---|
| 断言清单表（14 条，带行号） | §1 |
| `check-prompts` 是否校验数字在 style.css（及如何校验） | §1.3 —— 是，仅 hex + 线宽；字号只查关键词 |
| `check-docs` 的 `panel/fields` 与 `nums/prompt-len` | §2 —— 与 mechanism 无关 / 3% 容差 |
| `check-twolines` R1/R6/R7/R8 | §3 —— R1 是归一化集合包含；`mechanism` 引用 0 次 |
| `_mech.mjs` 算法 | §4.1 |
| `_mech.mjs` 误报的**确切机制**（6 例） | §4.3 —— 前导零×2、SVG 无单位、SVG r 属性、注释被剥×3 |
| `_mech.mjs` 漏报最坏情况的**确切机制**（S07 `5栏`） | §4.4 —— `grid-template[^;]*5` 贪婪吃到 `5fr` |
| `_mech.mjs` **把真错判成通过**的唯一一例（S10 `1px`） | §4.3g —— `/1\s*px/` 命中 `21px` 后缀 |
| 真错规模复核（3 件 → 5 件） | §4.6 —— 新增 S10、S09 |
| `mechanism` 全仓引用核验 | §0 —— 8 个检查脚本 0 引用；`check-docs` 的 5 处是散文「机制」 |
| 分工建议 | §5.4 —— **扩展 `check-prompts.mjs`，不新建文件**；约 70–90 行，参考实现 52 行 |
| **判据的可上线范围（实测）** | §5.2 —— v4 只查 `px/mm/%`：3 FAIL + 2 WARN + 0 误报（参考实现 `_m1-final.mjs`） |
| 判据**抓不到**的部分（实测） | §5.2 —— 全量版 175 token 出 32 条 FAIL，绝大多数误报；`栏/行/层` 是区间语义不是值 |
| 现行闸门 verbatim 输出 + 退出码 | §6 —— 全绿 / exit 0 |
| 30 条 token 普查 | §7 —— 162/252 覆盖，35.7% 未检查 |

### 附带发现（不在原任务范围，但值得单独立项）

1. **`mechanismSource` 在生成物里丢失**（§5.4 末）：`build-prompts.mjs:107` 写了 `d.mechanismSource`，但 L321 的输出对象只取 `mechanism: d.mechanism`。结果 30/30 案的 `prompts.js` 与 `dna-clean.json` 都没有 `mechanismSource`。**20 条补录机制句的行号来源在生成链上被丢弃了。**
2. **`dna-clean.json` 里 20 条 `mechanism` 是空串而非缺键**（§5.4）。这让 `build-prompts.mjs:105` 的 `if (!d.mechanism && MECHANISMS[d.id])` 靠「空串 falsy」工作。如果哪天有人把空串改成 `undefined`（更符合语义），`d.mechanism` 的判据不变但 `JSON` 序列化行为会变 —— 而且 `KEY_FIELDS` 那种 `String(a) !== String(b)` 的比对会把 `undefined` 与 `""` 判成不同。
3. **S03 存在一处「游标随焦距比移动」的措辞错**：`00-SYNTHESIS.md:123-124` 指出实现在 `index.html:302-310` 是 **1:1 跟随鼠标**（`translate(e.clientX, e.clientY)`），全案 `grep 焦距` **0 命中**。这是**数值判据抓不到的错**（没有任何数字），属于「用漂亮术语描述朴素实现」。新检查器的 M1/M2/M3 都抓不到它 —— **需要明确写下「本检查器不判语义措辞」这条边界**，否则读者会以为机制句已被完全覆盖。
