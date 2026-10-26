# 字段全链路审计：`_specs/*.md` → `collect-schemes.mjs` → `data.js` → `prompts.js` → 选型台 UI

- 审计对象：`prototypes/_specs/S01–S30.md`、`prototypes/_build/collect-schemes.mjs`、`prototypes/_selection/{data.js, prompts.js, app.js, prompt-copy.js, wizard.js, index.html, wizard.html, style.css}`
- 审计日期：2026-10-27
- 探针脚本：全部在 `deliverables/65-audit/p*.mjs`（只读仓库，唯一写入目标是 `deliverables/65-audit/`）
- **重要前提**：审计期间仓库被并发修改四次（见 §0）。本报告所有数字以 **04:22 的文件状态**为准，复算命令在 §7。

---

## §0 基线声明（先说这个，否则所有数字都会对不上）

审计开始时 `git status` 显示工作树有未提交改动，`collect-schemes.mjs` / `data.js` / `prompts.js` 在审计进行中（03:59 → 04:22）被另一个进程改写了四次：

| 时间 | 文件 | 变化 |
|---|---|---|
| 04:07 | `collect-schemes.mjs` | R1 正则 `[.．]?` → `(-附|[.．])`，修好 S12/S15/S19 的 `layout` |
| 04:08 | `data.js` | 新增 `audit` 字段（10,539 字） |
| 04:21 | `collect-schemes.mjs` | 给 `机制` 加了一段 20 行的说明注释（**只是注释，代码仍不读它**） |
| 04:22 | `data.js` / `prompts.js` | 重新生成 |

因此本报告采用**双基线**：

| 基线 | 内容 | 用途 |
|---|---|---|
| **HEAD** = `a56426e` | `git show HEAD:...` 冻结副本，存于 `deliverables/65-audit/baseline/` | 判断「任务描述写的时候是什么状态」 |
| **CURRENT** = 工作树（04:22） | 当前的 `collect-schemes.mjs` / `data.js` / `prompts.js` | **本报告全部结论以此为准** |

```powershell
# 复算基线差异
git status --porcelain prototypes/
git diff --stat prototypes/_build/collect-schemes.mjs prototypes/_selection/data.js
node deliverables/65-audit/p12-baseline.mjs
```

CURRENT 相对 HEAD 的字段差集（`p12-baseline.mjs` 复算）：

```
HEAD 字段数: 32   当前字段数: 33
当前新增: audit
layout   27→30   11437→13046  ← 变了
audit     0→30       0→10539  ← 变了
```

**任务描述里的三条「已知事实」在 CURRENT 基线上已经过时**，详见 §5.1、§5.2、§5.3。引用 `layout` 为空、`去 AI 味审查点` 0 命中的说法，只对 HEAD 成立。

---

## §1 解析层审计（`collect-schemes.mjs`）

### 1.1 13 个 FIELDS：逐个查「读了几次 / 赋给 rec 的哪个键」

```
node deliverables/65-audit/p4-fieldreads.mjs
```

| # | FIELDS 名（L136 声明） | `fields['…']` 读取（已剔注释） | 行号 | 赋给 rec 的键 | 结论 |
|---|---|---|---|---|---|
| 1 | 一句话视觉定义 | 1 次 | L268 | `def` | ✅ |
| 2 | **机制** | **0 次** | — | **（无）** | ❌ **死项** |
| 3 | 美学家族与参考 | 1 次 | L269 | `family` | ✅ |
| 4 | 配色系统 | 2 次 | L240, L319 | `const p3` → palette/primary | ✅（派生） |
| 5 | 字体策略 | 1 次 | L270 | `fonts` | ✅ |
| 6 | 布局与网格 | 1 次 | L271 | `layout` | ✅（HEAD 上 3 案为空，已修） |
| 7 | 关键视觉元素 | 1 次 | L272 | `visuals` | ✅ |
| 8 | 动效与交互 | 1 次 | L273 | `motion` | ✅ |
| 9 | 去 AI 味审查点 | 1 次 | L284 | `audit` | ⚠️ **CURRENT 才赋值，HEAD 为 0 次** |
| 10 | 反 AI 味风险与规避 | 1 次 | L285 | `risk` | ✅ |
| 11 | 适用场景 | 1 次 | L295 | `scenes` | ✅ |
| 12 | 可落地要点 | 1 次 | L294 | `landing` | ✅ |
| 13 | 设计师签名式怪癖 | 1 次 | L296 | `quirk` | ✅ |

**「机制」是唯一真正的死项**：它在 FIELDS 里声明，但 `parseSpec()` 里一次都没读，`rec` 上也没有对应键。

> 原文摘录 —— `collect-schemes.mjs:136`
> ```js
> const FIELDS = ['一句话视觉定义', '机制', '美学家族与参考', ...];
> ```
> 而赋值表 L268–L296 里，从 `def:` 到 `quirk:` 共 12 行，**没有一行读 `机制`**。

⚠️ **这里是本报告最容易出错的地方，特此记录我的第一次错误**：初版探针用字符串 `src.includes("fields['机制']")` 统计，得到「读取 1 次 @L124」。实际上 L124 是 04:21 那次改动新加的**注释**：

```js
// collect-schemes.mjs L123-124（注释，不是代码）
 *   · 「机制」的真身是 `1-附（去掉名字之后的机制）：` —— 剥掉括号说明后 key 是空串，
 *     所以它命中不了 fields['机制']，也不需要命中。
```

剥掉注释后实测 **0 次**（`p4-fieldreads.mjs` 已改成先 `stripComments()` 再计数）。**这个坑本身就是本审计的一条发现：用字符串包含来判定「字段是否被读取」，会被注释里的同名文字骗过去。**

**但这不等于机制信息全丢**——它走的是另一条路（见 §1.4）。而且 04:21 那次改动**明确写下了「不要在这里读」的理由**，是仓库对这条做的主动裁决，不是遗漏。

### 1.2 反向检查：读了 `fields['X']` 但 FIELDS 没声明 X

```
node deliverables/65-audit/p4-fieldreads.mjs   # 输出末两行
```

- 「FIELDS 里声明但从未 read 的」：仅 `机制`
- 「fields[...] 读取涉及但不在 FIELDS 的」：**无**

CURRENT 基线上不再有伪 key `栏，基线…`——R1 正则修好后它已不再产生。

### 1.3 解析器对字段标题写法的覆盖：**5 种形态，全部覆盖，0 种漏网**

```
node deliverables/65-audit/p30-cover.mjs
```

实测全库字段标题只有 5 种书写形态（不是 9 种，见 §6.1）：

| 形态 | 出现次数 | 涉及案 | 命中正则 |
|---|---|---|---|
| `N. 名字：正文` | 120 | S01–S10 | R1 |
| `N-附 名字：正文` | 12 | S01–S10 | R1 |
| `**N. 名字**`（整行加粗独占一行） | 120 | S11–S20 | R2 |
| `N. **名字**：正文` | 120 | S21–S30 | R3 |
| `N 名字：正文`（裸数字，无点） | 7 | S11–S20 | **R1 修复前会误伤，现被正确排除** |

```powershell
# 复算：三条正则命中的总行数与误检数
node deliverables/65-audit/p31-falsepos.mjs
# → R1 命中 132 行；判定为真标题 132；判定为误检 0
```

**有覆盖不到的变体吗？没有。** 但有一个**误伤**变体（不是漏收，是多吃），见 §1.5。

### 1.4 「机制」的第二条通路：`extract-dna.mjs` 绕开了 collect-schemes

```
node deliverables/65-audit/p16-mech.mjs
```

`prototypes/_prompts/extract-dna.mjs` 自己写了一条正则直读 md：

```js
// extract-dna.mjs 原文
// ---- 机制句（直接从 specs 抓，绕开 collect-schemes 的 bug）----
const mm = spec.match(/1-附（去掉名字之后的机制）[：:]\s*([^\n]+)/);
if (mm) mechanism = mm[1].trim();
```

复算结果：

```
来自 md 1-附：10 案｜来自 mechanisms.mjs 补丁：0 案｜空：20 案
mechanisms.mjs 覆盖: 20 案  S11 … S30（每条都带 source 字段，20 处）
```

**结论**：`机制` 在 data.js 层面确实是死字段（0 读取、无 rec 键、`"机制":` 作为键在 data.js 里 0 次），但提示词里那句「这个风格的签名动作」**没有丢**——S01–S10 由 extract-dna 直读 md，S11–S30 由 `mechanisms.mjs` 人工补 20 条。

值得注意的是：**04:21 那次改动已经把这个决定写成了 20 行注释**（`collect-schemes.mjs` L116–135），明确说明「为什么不能在这里也读一遍」，理由是「那会让 data.js 也带一份机制句（只有 10/30，S11–S30 是空的），同一个概念就此有两个来源、且其中一个天生残缺 20 案」。

所以这一条**不是遗漏，是一个有记录的主动裁决**。但它仍然留下了一个真实的架构问题（见 §6.2）：**同一个语义字段有两份互不知情的抽取实现**，而 FIELDS 数组里那个永远匹配不上的 `'机制'` 名字，恰好是这两份实现之间唯一的、且不可靠的路标。

### 1.5 截断检查：lookahead 有没有吞掉后半段？**没有**

```
node deliverables/65-audit/p27-trunc2.mjs
```

把 data.js 的 10 个正文字段逐个与「用 CURRENT 解析器对 md 重新解析」的结果**逐字比对**：

```
=== 逐字段一致性（data.js vs 当前解析器）===
不一致 0 处（0 = 无截断，data.js 与解析器输出逐字一致）
```

抽查 5 案（任务要求）实际做了 30 案 × 10 字段 = 300 组，全等。**没有任何字段被 lookahead 吞掉**。

同时验证 `scenes` 的 `cleanScenes()` 剪枝是否丢内容：

```
scenes 剪掉的文案段在 copy 里都能找到（30/30）
```

`copyParts` 四段的完整性：

```
copyParts 全部能从 copy 里找到的案: 30/30
copy 里有 copyParts 之外残留信息的案: 0/30
```

即 `copy` 与 `copyParts` 是**同一份信息的两种粒度**，不是互补内容——这决定了 `copy` 零消费不造成信息损失（见 §2.3）。

### 1.6 真正的解析层缺陷：`tailAbs` 的钳制会静默把字段截成空串

这是我在解析层抓到的、比「机制没赋值」更隐蔽的一个：

```js
// collect-schemes.mjs L165-166
let to = i + 1 < starts.length ? starts[i + 1].i : tailAbs;
if (to > tailAbs) to = tailAbs;          // ← 钳制
```

`tailAbs` 由「收尾段落」（`真实上站文案|自评|版本|校验|审查`）的位置决定。一旦某个字段起点落在 `tailAbs` 之后，`to` 会被钳到 `tailAbs`，`slice(end, to)` 变成**空串或负向切片**，字段静默变空——不报错、不告警。

实测 CURRENT 基线上 30 案全部 `tailAbs > lastStart`（`p6-field8.mjs` 的 tail 截断检查节），所以**当前没有触发**。但这是 `layout` 那类 bug 的同款放大器：任何一次 md 结构调整（比如把小节标题改成「审查」开头）都会让最后一个字段整段蒸发，而 `--check` 的自检表只查 7 个字段（L552–558），`quirk` 不在其中。

---

## §2 数据层审计（`data.js`）

### 2.1 33 个字段逐个：非空案数 / 总字数 / 最大 / 最小

```
node deliverables/65-audit/p1-fields.mjs
```

CURRENT 基线（含新增 `audit`）：

| 字段 | 类型 | 非空/30 | 总字数 | 最长（案） | 最短（案） | 备注 |
|---|---|---|---|---|---|---|
| `id` | string | 30 | 90 | 3 | 3 | 恒定 |
| `dir` | string | 30 | 782 | 35 (S23) | 21 (S09,S10) | |
| `cn` | string | 30 | 155 | 6 | 4 (S13) | |
| `en` | string | 30 | 661 | 31 (S23) | 17 (S09,S10) | |
| `fr` | string | 30 | 30 | 1 | 1 | **仅 2 种取值 F/R** |
| `structure` | string | 30 | 212 | 12 (S19) | 4 (S12) | |
| `threshold` | string | 30 | 30 | 1 | 1 | **仅 3 种取值** |
| `tone` | string | 30 | 284 | 11 | 9 | 仅 7 种 |
| `def` | string | 30 | 2845 | 115 (S10) | 71 (S23) | |
| `family` | string | 30 | 5911 | 282 (S21) | 133 (S06) | |
| `fonts` | string | 30 | 11192 | 514 (S30) | 228 (S05) | |
| `layout` | string | **30** | 13046 | 865 (S14) | 242 (S01) | CURRENT 才补齐 |
| `visuals` | string | 30 | 11305 | 542 (S29) | 247 (S01) | |
| `motion` | string | 30 | 10955 | 475 (S28) | 278 (S11) | |
| `audit` | string | **30** | **10539** | 780 (S13) | 276 (S10) | **CURRENT 新增** |
| `risk` | string | 30 | 5761 | 331 (S26) | 124 (S01) | |
| `landing` | string | 30 | 13962 | 550 (S25) | 363 (S02) | |
| `scenes` | string | 30 | 3595 | 174 (S21) | 60 (S02) | |
| `quirk` | string | 30 | 3449 | 150 (S11) | 88 (S06) | |
| `copy` | string | 30 | 4106 | 205 (S03) | 80 (S22,S23) | |
| `copyParts` | object | 30 | 4832 | 227 (S03) | 108 (S22) | |
| `bg` | string | 30 | 210 | 7 | 7 | 恒定长度 |
| `primary` | string | 30 | 210 | 7 | 7 | **恒等于 palette[1]** |
| `buttonText` | null\|string | **17** | 119 | 7 | **0（13 案 null）** | 见 §2.4 |
| `errorCode` | string | 30 | 226 | 9 | 4 (S01) | |
| `errorCodeSource` | string | 30 | 450 | 37 | 4 | 仅 2 种取值 |
| `palette` | array | 30 | 1180 | 41 | 31 | |
| `built` | boolean | 30 | 120 | — | — | **恒 true** |
| `gate` | object | 30 | 5036 | 235 (S13) | 154 (S30) | 恒非空 |
| `shots` | object | 30 | 17243 | 720 (S23) | 412 (S05) | 三视口恒非空 |
| `axes` | object | 30 | 3911 | 132 | 128 | |
| `scenesYes` | string | 30 | 2022 | 125 (S21) | 33 (S01) | |
| `scenesNo` | string | 30 | 1453 | 85 (S22) | 22 (S02) | **零消费** |

**缺字段的只有 `buttonText`（13 案 null）**：S01 S03 S06 S07 S09 S10 S11 S13 S15 S17 S19 S20 S28。

### 2.2 字段 × 6 消费方命中矩阵

方法：不 grep 字段名裸词，只认 4 种**访问形态**（`.字段\b` / `['字段']` / `{字段}` 解构 / `字段:`），再人工确认。

```
node deliverables/65-audit/p7-matrix.mjs
```

| 字段 | app.js | index.html | prompt-copy.js | wizard.js | wizard.html | style.css | 合计 | 判定 |
|---|---|---|---|---|---|---|---|---|
| `id` | 37 | — | 29 | 4 | — | — | 70 | ✅ |
| `dir` | 3 | — | — | — | — | — | 3 | ✅ |
| `cn` | 6 | — | — | 1 | — | — | 7 | ✅ |
| `en` | 3 | — | — | 1 | — | 1 | 9 | ⚠️ style.css 那 1 次是 `.en` 类名，非字段 |
| `fr` | 14 | — | — | 2 | — | — | 16 | ✅ |
| `structure` | 4 | — | — | 2 | — | — | 6 | ✅ |
| `threshold` | 12 | — | — | 6 | — | — | 18 | ✅ |
| `tone` | 11 | — | 5 | 5 | — | — | 21 | ✅ |
| `def` | 4 | — | — | 1 | — | — | 5 | ⚠️ 半死，见 §2.3 |
| `family` | 3 | — | — | — | — | 41 | 44 | ⚠️ **style.css 41 次全是 `font-family`，非字段** |
| `fonts` | 2 | — | 18 | — | — | — | 20 | ✅ |
| `layout` | 2 | — | — | — | — | — | 2 | ✅（1 渲染 + 1 索引） |
| `visuals` | 2 | — | — | — | — | — | 2 | ✅（同上） |
| `motion` | 2 | — | — | — | — | 1 | 3 | ⚠️ style.css 那 1 次是 `prefers-reduced-motion` |
| `audit` | **0** | **0** | **0** | **0** | **0** | **0** | **0** | ❌ **零消费（新增字段）** |
| `risk` | 1 | — | 5 | — | — | — | 6 | ✅ |
| `landing` | 2 | — | — | — | — | — | 2 | ✅ |
| `scenes` | 2 | — | 13 | — | — | — | 15 | ⚠️ **prompt-copy 13 次是 TEMPLATES.scenes，非字段** |
| `quirk` | 2 | — | — | — | — | — | 2 | ✅ |
| `copy` | **0** | **0** | **0** | **0** | **0** | **0** | **0** | ❌ **零消费** |
| `copyParts` | 14 | — | — | — | — | — | 14 | ✅ |
| `bg` | 2 | — | — | — | — | — | 2 | ✅ |
| `primary` | **0** | **0** | **0** | **0** | **0** | **0** | **0** | ❌ **零消费** |
| `buttonText` | **0** | **0** | **0** | **0** | **0** | **0** | **0** | ❌ **零消费** |
| `errorCode` | 4 | — | — | — | — | — | 4 | ✅ |
| `errorCodeSource` | 1 | — | — | — | — | — | 1 | ⚠️ 死支，见 §2.4 |
| `palette` | 3 | — | 1 | 5 | — | — | 9 | ✅ |
| `built` | 11 | — | — | — | — | — | 11 | ⚠️ 恒 true，见 §2.4 |
| `gate` | 25 | — | 11 | 5 | — | — | 41 | ✅ |
| `shots` | 7 | — | — | — | — | 10 | 17 | ✅ |
| `axes` | 10 | — | — | — | — | — | 10 | ⚠️ 5/10 子键零消费 |
| `scenesYes` | 1 | — | — | — | — | — | 1 | ⚠️ 只进搜索索引 |
| `scenesNo` | **0** | **0** | **0** | **0** | **0** | **0** | **0** | ❌ **零消费** |

**grep 误报的实证**（任务点名要防的）：

```powershell
# family 在 style.css 的 41 次命中，全部是 font-family
node deliverables/65-audit/p21-halfdead.mjs   # → 「共 30 处；font-family 29 次，.family 访问 0 次」
# scenes 在 prompt-copy.js 的 13 次命中，全部是 TEMPLATES 定义（L651/L660/L669/L737/L751/L764）
```

`index.html` 对 data.js 字段的消费是 **0**（只有两处注释提到 `window.SCHEMES`）。

### 2.3 半死字段：有人读但读法有问题

#### (a) `def` —— 行卡上被 `plain` 顶替，只在详情面板出现

```js
// app.js:197-205
function plainOf(r) {
  var P = window.STYLE_PROMPTS;
  if (P && P.schemes) {
    for (var i = 0; i < P.schemes.length; i++) {
      if (P.schemes[i].id === r.id && P.schemes[i].plain) return P.schemes[i].plain;
    }
  }
  return r.def || '';          // ← 兜底分支
}
// app.js:266 —— 行卡只用 plainOf，不用 r.def
'<p class="row-def">' + esc(plainOf(r)) + '</p>' +
```

`plain` 30/30 都有值，所以 `return r.def` 这个兜底**在当前数据下永不执行**。`def` 实际只在两处生效：详情面板 L438、搜索索引 L146。

#### (b) `wizard.js:212` —— `def` 只取前 96 字

```js
'<p>' + (r.def || '').slice(0, 96) + '…</p>' +
```

复算（`p28-slices.mjs`）：**14/30 案被截断，共丢弃 132 字**；最长 S10 = 115 字。

#### (c) `app.js:235` —— `family` 只取前 34 字，**30/30 全被截**

```js
meta.push('<span class="row-family">' + esc((r.family || '').split('。')[0].split('：').pop().slice(0, 34)) + '</span>');
```

复算：**30/30 案被截，共丢弃 4891 字**（`family` 全长 133–282 字）。这一刀切掉的是「参考对象」全部清单，只留家族名。

#### (d) `prompt-copy.js:295` —— `risk` 只取前 220 字

```js
(d.risk.length > 220 ? d.risk.slice(0, 220) + "…" : d.risk) + "\n")
```

复算：**8/30 案被截，共丢弃 315 字**；最长 S26 = 331 字。

#### (e) `layout` / `visuals` / `quirk` —— 2 次命中里 1 次只是搜索索引

```js
// app.js:147 —— hay 搜索索引（命中即计入，但用户看不见）
r.errorCode, r.threshold, r.layout, r.visuals, r.quirk,
// app.js:442 / 451 / 455 —— 详情面板真正渲染
field('布局与网格', r.layout) +
field('关键视觉元素', r.visuals) +
field('设计师签名式怪癖', r.quirk) +
```

这三个字段**渲染是成立的**，但它们的另一处命中只是全文索引——即「能搜到、能点开看到」，不算半死。真正只进索引不渲染的是：`id cn en tone structure errorCode threshold scenesYes palette`。

#### (f) `axes` 10 个子键，5 个零消费

```
node deliverables/65-audit/p8-nested.mjs
```

| 子键 | 合计命中 | 判定 |
|---|---|---|
| `ground` | 9 | ✅ |
| `band` | 8 | ✅ |
| `load` | 15 | ✅ |
| `words` | 6 | ✅ |
| `loud` | 15 | ✅ |
| `groundL` | **0** | ❌ 死 |
| `bandHue` | **0** | ❌ 死 |
| `bandL` | **0** | ❌ 死 |
| `bandSat` | **0** | ❌ 死 |
| `chroma` | **0** | ❌ 死 |

`chroma` 尤其讽刺：`wizard.js` 用 `loudnessOf(r.palette)` **重算了一遍**色调强度（L54/L64/L76），而 `axes.chroma` 早就是同一个量的现成结果（由 collect-schemes L431 算出）。

### 2.4 死分支与恒定值（比死字段更隐蔽的一类）

```
node deliverables/65-audit/p23-deadbranch.mjs
```

| 现象 | 实测 | 影响 |
|---|---|---|
| `built` 恒 `true` | **0/30 为 false** | app.js:183「未建原型」、:247「尚未渲染」、:250「目录尚未建立」、:422–424「原型尚未建立」、:254 `is-unbuilt` class —— 5 处分支全是死代码 |
| `gate` 恒非空 | **0/30 为 null** | app.js:184「未渲染」tag 死代码 |
| `shots` 三视口恒非空 | 0/30 空 | app.js:174「X 未渲染」、:493「这个视口还没有渲染产物」死代码 |
| `copyParts.error` 只在 10 案有值 | **S21–S30 空，S01–S20 有值** | app.js:432 的「（源文件缺，错误码为 Lead 补入）」+ `errorCodeSource` **只在 10/30 案渲染**；另 20 案该分支永不执行 |
| `primary` 恒等于 `palette[1]` | **30/30** | 不是独立数据，是 collect-schemes L364–366 兜底规则的产物；零 UI 消费 |
| `buttonText` 13 案 null | 17/30 有值 | 零消费；值域只有 `#FFFFFF`(11) / `#111111`(6) / null(13) |

`primary` 的「恒等于 palette[1]」值得单独记：collect-schemes 的兜底规则是

```js
// L364-366
if (pal.length >= 2 && (!rec.primary || rec.primary === rec.bg || !pal.includes(rec.primary))) {
  rec.primary = pal[1];
}
```

它把 `primary` 变成了 `palette` 的**派生冗余**，30/30 全部落到 `pal[1]`。所以「`primary` 零消费」的真实损失是 0 —— 信息在 `palette` 里仍在。但反过来说，`_CURRENT-VALUES.md` 里那张权威的「主色」列**在 data.js 里已经不可复原了**（被兜底覆盖）。这是一个「有值但值不再可信」的字段。

---

## §3 输出层审计（`prompts.js`）

### 3.1 哪些 data.js 字段进了 prompts.js？

```
node deliverables/65-audit/p14-inprompt.mjs
```

方法：不用键名匹配，改用**值的片段包含检测**（取每个字段值的前 24 字，看是否出现在该案的提示词文本里）。

| data.js 字段 | 进入提示词案数 | 说明 |
|---|---|---|
| `risk` | **30/30** | ✅ 经 `build-prompts.mjs` 的 `RISK` 闭包 → `dna.risk` |
| `landing` | **0/30 全文** | ⚠️ 只有「最难被复用」那一句经 `REUSE` 闭包进 `dna.reuse`（21/30 案有此句） |
| `tone` | 30/30 | ✅ 走 `window.SCHEMES` 直读（prompt-copy.js:186） |
| `bg` / `primary` | 30/30 | ⚠️ **假命中**：短 HEX 恰好出现在 palette 串里，见下 |
| `threshold` | 20/30 | ⚠️ 假命中：「低/中/高」单字巧合 |
| `fr` | 30/30 | ⚠️ 假命中：「F」「R」单字母巧合 |
| `def` `family` `fonts` `layout` `visuals` `motion` `quirk` `scenes` `copy` `copyParts` `errorCode` `errorCodeSource` `palette` `axes` `scenesYes` `scenesNo` `gate` `shots` `built` `dir` `en` `id` | **0/30** | ❌ 不进提示词 |
| **`audit`** | **0/30** | ❌ **新字段未接进提示词** |

**必须点名 `bg`/`primary`/`fr`/`threshold` 这 4 行是假命中**：提示词里的短值来自别处，不是这些字段被读取。复核方式：

```
node deliverables/65-audit/p15-recheck.mjs
# → S01 fr="F" 的 includes=true，但上下文是「不得改色、不得换字体」里的那个 F
```

真正由 data.js 直接供给提示词的只有：`tone`（1 处直读）+ `risk`/`landing`（经 build-prompts 的 2 个闭包）。**`prompts.js` 的主体（palette/fonts/radius/shadow/lineWidths/h1Size/mechanism）全部来自 `dna-clean.json`，即从各案 `style.css` 实测抽取，不来自 13 字段规格。**

### 3.2 提示词总字数分布：1617–1905 字（**任务描述正确**）

```
node deliverables/65-audit/p13-promptlen.mjs
```

| 统计量 | 值 |
|---|---|
| min | **1617**（S09） |
| max | **1905**（S23） |
| 中位 | 1807 |
| 均值 | 1778 |
| 30 案合计 | 53,330 字 |

与任务描述的「1617–1905 字」**完全吻合**。

### 3.3 加入新内容后会不会超区间？**会，而且幅度不小**

```
node deliverables/65-audit/p34-final.mjs
```

`audit` 字段长度分布：`min 276 / P25 293 / 中位 327 / P75 376 / max 780`（平均 351）。

| 方案 | 投影后 min | 投影后 max | 投影后均值 | 超 1905 的案数 |
|---|---|---|---|---|
| audit 全文加入 | 1910 | 2553 | 2129 | 30/30 |
| audit 按 220 字截断（对齐 risk 口径） | 1867 | 2155 | 2028 | **29/30** |

即便按 `risk` 的 220 字口径截断，**仍有 29/30 案突破当前 1905 上限**，均值涨 250 字（+14%）。全文加入则是均值 +351 字。

**`audit` 用 220 字口径会截掉全部 30 案**（因为它的最短值 276 已 > 220）：共丢弃 3939 字。而 `risk` 在 220 字口径下只截 8/30 案、丢 315 字。两者体量不同档，**不能照抄同一个阈值**。

好消息：`audit` 与 `risk` 的八字片段重合率 >5% 的案是 **0/30**，两者内容互补、不重复。

---

## §4 specs 源头审计

### 4.1 13 个字段在 30 个 md 里的实际出现率

```
node deliverables/65-audit/p5-specs.mjs
```

**13 个字段 30/30 全部出现，没有任何一案缺字段。**

| 字段 | 出现率 | 缺的案 |
|---|---|---|
| 一句话视觉定义 | 30/30 | 无 |
| **机制** | **0/30（作为「机制」这个标题）** | **全部 30 案** |
| 美学家族与参考 | 30/30 | 无 |
| 配色系统 | 30/30 | 无 |
| 字体策略 | 30/30 | 无 |
| 布局与网格 | 30/30 | 无 |
| 关键视觉元素 | 30/30 | 无 |
| 动效与交互 | 30/30 | 无 |
| 去 AI 味审查点 | 30/30 | 无 |
| 反 AI 味风险与规避 | 30/30 | 无 |
| 适用场景 | 30/30 | 无 |
| 可落地要点 | 30/30 | 无 |
| 设计师签名式怪癖 | 30/30 | 无 |

**「机制」的真相**：它在 md 里**从不以 `机制` 作标题**，而是写成 `1-附（去掉名字之后的机制）：`——挂在字段 1 下面的附注。所以：

- `collect-schemes.mjs` 的 `fields['机制']` **永远取不到东西**（key 是 `1-附（…）`，剥括号后是空串）
- FIELDS 数组里的 `'机制'` 从一开始就是个**永远匹配不上的名字**

这是「解析了但没用」的第三层形态：不是漏赋值，是**连 key 都不存在**。

```
node deliverables/65-audit/p5-specs.mjs   # §B
# → 合计 12 处；涉及案：S01 S02 S03 S04 S05 S06 S07 S08 S09 S10
# （12 = 10 案的 1-附 + S03/S08 各多一条 3-附）
```

### 4.2 字段 8 的体量差异：**任务描述的数字错了 5 倍**

```
node deliverables/65-audit/p25-auditlen.mjs
```

| 分组 | 实测（data.js `audit` 字段） | 任务描述 |
|---|---|---|
| S01–S10 | 平均 **295** 字（276–337） | 「约 300 字」✅ 吻合 |
| S11–S20 | 平均 **377** 字（293–780） | 「约 1800 字」❌ **实测只有描述的 1/5** |
| S21–S30 | 平均 **383** 字（299–444） | 未提 |
| 全库 | **10,539** 字 | 「26,096 字」❌ |

**26,096 这个数字复算不出来**（`p26-26096.mjs` 试了 6 种口径）：

| 口径 | 结果 |
|---|---|
| data.js `audit` 字符数 | 10,539 ✗ |
| data.js `audit` UTF-8 字节 | 25,767（接近但不等于） |
| md 原始段落字符 | 10,740 ✗ |
| md 原始段落 UTF-8 字节 | **25,968**（最接近，仍差 128） |
| audit + risk 字符 | 16,300 ✗ |

最接近的是「md 原始段落的 UTF-8 字节数」= 25,968，与 26,096 差 128。**很可能任务描述把「字节」当成了「字」，且统计的是 md 原文（含空白换行）而非 data.js 解析值。** 但 128 的差额无法用已知口径消除，所以我判定：**26,096 无法复现，应以 10,539（字符）/ 25,968（md 原始字节）为准。**

体量差异的**真实成因是写法差异，不是信息量差异**（`p20-field8style.mjs`）：

| 分组 | 编号样式 | 条目数 | 每条约字数 | 残留的独立段落 |
|---|---|---|---|---|
| S01–S10 | `①②③` | 3 条 | 92–112 | 0 |
| S11–S20 | `第一，第二，…` | 3–4 条 | 73–195 | S13 有 5 段（含「反套路改造三指标」表） |
| S21–S30 | `（1）（2）…` | 4 条 | 75–111 | 0 |

**不是 S11–S20 信息量大 5 倍，而是它们用「第一，第二」的散文写法**（每条一个完整句群），S01–S10 用「①②③」的紧凑写法。唯一真正的异常值是 **S13 = 780 字**：它的字段 8 后面**混进了一个不属于字段 8 的小节**「**反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾）**」+ 5 段列表——这是 `starts` 认不出无编号小节标题导致的**串段**（与 `scenes` 串文案是同一类问题）。

### 4.3 字段 8 引用的规则编号：C 全查得到，P 不在这个文档里

```
node deliverables/65-audit/p19-refs2.mjs
```

任务描述说「`C-1.6`、`C-2.11`、`PN`、`0X-xxx` 这类规则编号共 31 处，在 `deliverables/02-anti-ai-rules.md` 里能查到吗？」

实测**去重后是 26 个编号 × 案 = 144 处引用**，不是 31 处。分类核查：

| 编号族 | 去重数 | 在 `02-anti-ai-rules.md` 可查 | 实际归属 |
|---|---|---|---|
| **C-x.y**（如 `C-1.6`、`C-2.11`） | 13 | **13/13 全部可查** ✅ | `02-anti-ai-rules.md`（该文档定义了 C-1.1 … C-2.20 共 20 条） |
| **P-n**（如 `P5`、`P13`） | 12 | **0/12 不可查** ❌ | 实际归属 **`deliverables/01-research-brief.md`**（该文档定义了 P1–P15） |
| **R-nn**（如 `R-22`、`R-40`） | 5 | 5/5 可查 ✅ | `02-anti-ai-rules.md` |
| `0X-xxx`（`01-research`） | 1 | — | 是**文件名** `01-research-brief.md`，不是规则编号（我的正则误抓） |

**查不到的 8 个 P 编号**（按任务口径「在 02 里查不到」）：

```
P5(S04) P6(S06,S29) P7(S30) P8(S27,S29) P10(S11,S16,S21) P11(S20) P13(S10,S14,S26) P14(S15)
```

**但这 8 个不是坏引用**——它们在 `01-research-brief.md` 里全部有定义（`p19-refs2.mjs` 逐条打出了定义原文）：

| 编号 | 01-research-brief.md 的定义 |
|---|---|
| P5 | 渐变描边文字 / 渐变填充标题 |
| P6 | Hero + 三张等宽卡片 + Logo 墙 + 评价 + 定价 + FAQ |
| P7 | Emoji 当功能图标 |
| P8 | 每个 section 白 / 灰交替铺底 |
| P10 | 全局 `ease-in-out` + 滚动淡入 + 视差三层 |
| P11 | 网格背景 + 虚线边框 + 玻璃卡片 三层叠加 |
| P13 | 所有元素完美居中 |
| P14 | 没有真实图片，用大渐变块 + 抽象 SVG blob 顶替 |

**真正的缺陷是引用格式不一致**，不是引用失效：

- S11/S14/S15/S16/S20/S21/S26/S27/S29/S30 写全了出处：「反 `01-research-brief.md` F 节 P10」「反文件 01 的 P6」
- S04/S05/S06/S07/S08/S10/S25/S28 写的是裸 `P5`/`P3`/`P6`——**读者在 `02-anti-ai-rules.md` 里查不到**，必须知道要去 `01-research-brief.md` 才行

一个 `P3` 的歧义实例：`02-anti-ai-rules.md` 里 `P3` 是流水线第 3 阶段「计数判分」，而 S05/S07/S08 指的是 `01-research-brief.md` 的「24px 圆角 + 柔和 drop-shadow 卡片」。**同一个编号在两份文档里指两件不同的事**，而引用处没写出处。

`0X-xxx` 这一族需要澄清：字段 8 里出现的 `01-research` 是**文件名的前缀**（`01-research-brief.md`），被我的初版正则误当成规则编号 `01-research`。实际共 5 处（S11 S14 S15 S16 S20），全部是同一个文件名的不同截取。**这一族不是规则编号，任务描述的归类有误。**

---

## §5 我核实后认为任务描述说错了的地方

### 5.1 ⚠️「`机制` 与 `去 AI 味审查点` 两项读了但从未被使用」

- **`去 AI 味审查点`：在 CURRENT 基线上已经不成立。** 工作树在审计期间新增了 `audit:` 赋值（`collect-schemes.mjs:284`），`data.js` 已有 30/30 案、10,539 字。该说法只对 HEAD 成立。
  ```powershell
  node deliverables/65-audit/p12-baseline.mjs   # audit 0→30, 0→10539  ← 变了
  ```
  **但「没被使用」这半句在 CURRENT 上反而更严重了**：它现在有值了，却仍然 6 个 UI 文件 0 命中、prompts.js 里也没有（`p7-matrix.mjs` + `p29-stale.mjs`）。**赋值做完了，消费端一行没动。**
- **`机制`：不是「读了但没用」，是「从来没读到过」。** 剥掉注释后 `fields['机制']` 的代码读取次数 = **0**，而且 md 里根本没有以 `机制` 为标题的段落（标题是 `1-附（去掉名字之后的机制）`，剥括号后是空 key）。所以它在 FIELDS 数组里是个**永远匹配不上的名字**——问题比「读了没用」更早一层。
  这条已在 04:21 的注释里被承认（`collect-schemes.mjs` L116–135），是**主动裁决而非遗漏**，但数组里的死名字没删。

### 5.2 ❌「`去 AI 味审查点` 约 26,096 字」

实测 **10,539 字**（data.js `audit`，字符数）／ 10,740 字（md 原始段落字符）。7 种口径都到不了 26,096（`p26-26096.mjs`）：

| 口径 | 结果 | 差 |
|---|---|---|
| data.js `audit` 字符数 | 10,539 | −15,557 |
| data.js `audit` UTF-8 字节 | 25,767 | −329 |
| md 原始段落字符 | 10,740 | −15,356 |
| md 原始段落 UTF-8 字节 | **25,968** | **−128**（最接近） |
| audit + risk 字符 | 16,300 | −9,796 |

另外，全仓库扫描六位数字，**`26096` 这个串在任何文件里都不存在**（`p26-26096.mjs` 的仓库扫描节，命中 0）。最接近的是「md 原始段落的 UTF-8 字节数」= 25,968，疑似「字节当字」+ 统计对象为 md 原文（含空白换行）而非 data.js 解析值，但 128 的差额无法用已知口径消除。

**判定：26,096 无法复现。应以 10,539（data.js 字符）/ 25,968（md 原始字节）为准。**

### 5.3 ❌「`layout` 在 S12/S15/S19 为空」

**在 CURRENT 基线上已经修好了**（30/30 有值）。这个现象只存在于 HEAD。

根因值得记下来（因为它证明「解析了 ≠ 用上了」还有第三种形态）：R1 正则的 `[.．]?` 分隔符可选，于是 S12/S15/S19 字段 5 正文的首句

```
8 栏，基线 6px（对齐街机像素栅格），栏间距 0。不对称方式：
```

被读成「字段 8，名字 = `栏，基线 6px…不对称方式`」，字段 5 段落被切到长度 0，正文挂到一个谁都不读的伪 key 上。

**触发条件可以精确刻画**（`p33-colon.mjs`）：行首 1–2 位裸数字 + 40 字内出现**全角冒号**。全库 7 条行首裸数字行里，只有 3 条满足：

| 案 | 到首个全角冒号的距离 | 是否触发 |
|---|---|---|
| S12:26 | 32 | ⚠️ 触发 |
| S15:26 | 26 | ⚠️ 触发 |
| S19:26 | 37 | ⚠️ 触发 |
| S11:26 | 106 | 安全 |
| S13:26 | 62 | 安全 |
| S17:26 | 57 | 安全 |
| S20:26 | 91 | 安全（`1:1` 用的是半角冒号） |

**「恰好 3 案」不是巧合，是「正文首句以数字开头且 40 字内有全角冒号」这个条件的自然结果。** 剩下 4 条之所以安全，靠的是「冒号出现得晚」——一旦有人把 S20 的正文改短（把 `1:1` 换回 `1：1`），第 4 案立刻复发。这是**未被修的残余风险**。

### 5.4 ❌「`primary`、`buttonText`、`scenesNo` 在 data.js 里有值，5 个 UI 文件 0 命中」

- **「5 个 UI 文件」应为 6 个**：`app.js / index.html / prompt-copy.js / wizard.js / wizard.html / style.css`。
- 零命中的**实际是 5 个字段**，不止 3 个：`copy`、`primary`、`buttonText`、`scenesNo`，**加上新增的 `audit`**。
- `buttonText` 不是「有值」——**13/30 案是 `null`**（S01 S03 S06 S07 S09 S10 S11 S13 S15 S17 S19 S20 S28）。

### 5.5 ❌「我实测有 9 种不同的标题变体」

实测只有 **5 种**书写形态（`p30-cover.mjs`），且三条正则 **100% 覆盖、0 误检**：

```
N. 名字：正文     × 120  (S01–S10)   ← R1
N-附 名字：正文   ×  12  (S01–S10)   ← R1
**N. 名字**       × 120  (S11–S20)   ← R2
N. **名字**：正文 × 120  (S21–S30)   ← R3
N 名字：正文      ×   7  (S11–S20)   ← 裸数字，是正文不是标题，必须**排除**
```

（`N. 名字` 这 120 行是 S01–S10 的 12 字段 × 10 案；`1-附` 那 12 行 = 10 处 `1-附` + 2 处 `3-附`。）

任务描述给的 3 个例子（`**8. 去 AI 味审查点（≥3 条）**`、`8. **去 AI 味审查点（≥3 条）**：`、`8. 去 AI 味审查点（≥3 条）：`）**分别对应形态 3、4、1**——它们不是「9 种变体中的 3 种」，而是**同一个字段在三种惯例下的三种写法**。把「同一字段 × 三种惯例 + 括号后缀差异」数成 9 种变体，会让人误以为解析器漏了一大片，实际是 5 种形态全覆盖。

真正的风险不在「变体太多」，而在「裸数字行被误收」——见 §5.3。

### 5.6 ❌「字段 8 在 S11–S20 各约 1800 字」

实测 S11–S20 平均 **377 字**，区间 293–780。**差 5 倍。** 详见 §4.2。

### 5.7 ❌「`C-1.6`、`C-2.11`、`PN`、`0X-xxx` 这类规则编号共 31 处」

实测去重 **26 个编号 / 144 处引用**。并且：
- `C-x.y` 13 个**全部**能在 `02-anti-ai-rules.md` 查到 ✅
- `P-n` 12 个**一个都不在** `02-anti-ai-rules.md` 里——它们在 `01-research-brief.md`，且有 8 个是裸引用（未写文档出处）
- `0X-xxx` 不是规则编号，是文件名 `01-research-brief.md` 的前缀

### 5.8 ✅ 任务描述说对的部分

- 提示词总字数 **1617–1905 字**：实测 min 1617 / max 1905，**分毫不差**
- `primary`、`buttonText`、`scenesNo` 零 UI 消费：✅（但清单不全，见 §5.4）
- `去 AI 味审查点` 在 data.js / prompts.js 里 0 命中：对 HEAD ✅，对 CURRENT 只对 prompts.js 成立

---

## §6 我抓到的、任务描述里没提到的问题

### 6.1 🔴 FIELDS 里那个 `'机制'` 是个死名字，且它是唯一的指路牌

`1-附（去掉名字之后的机制）` 经 `starts[i].key.replace(/（[^）]*）/g, '')` 剥括号后是**空字符串**，靠 `if (key && ...)` 被整个丢弃。所以 FIELDS 里的 `'机制'` 不是「忘了读」，是**永远读不到**。

04:21 的注释已经承认了这一点（L118-124：「规格里根本没有一个叫「机制」的字段标题」「出现的 key 只有这 12 个」）。但**数组里的 `'机制'` 并没有被删掉**。后果是：

- 读代码的人看到 FIELDS 有 13 项，会以为 13 个字段都进 data.js，实际只有 12 个
- 想找机制句的人会先 grep `data.js` 的 `机制`，命中 70 次**全部是正文字段里的「主机制＝…」**，`"机制":` 作为键是 0 次——然后才会去看注释

这一条比漏赋值更难发现：漏赋值时 `--check` 的自检表还能报「缺」，而活在这个位置的名字连「缺」都报不出来。

### 6.2 🔴 同一个语义字段有两条互不知情的抽取实现

- `collect-schemes.mjs`：FIELDS 声明 `机制`，0 读取，并在 L127–129 明确把消费链指给别处
- `extract-dna.mjs`：自己写 `/1-附（去掉名字之后的机制)[：:]\s*([^\n]+)/` 直读 md，注释里明写「**绕开 collect-schemes 的 bug**」

两份实现各自演化，且 `extract-dna` 只取 `[^\n]+`（**单行**）——若某个 md 的机制句换行了就会静默截断，而 `collect-schemes` 那份（如果存在）用的是 `dec()` 会把换行压成空格。**同一个语义，两种断行处理。** 这是仓库自己记录过的「两份副本静默分叉」老毛病（`build-prompts.mjs` 删 `TEMPLATE` 的理由），在同一位置又长了一次。

### 6.3 🟡 `tailAbs` 的静默钳制会吃掉最后一个字段

```js
if (to > tailAbs) to = tailAbs;   // collect-schemes.mjs L166
```

字段起点若落在「收尾段落」正则之后，`slice(end, to)` 直接变空，无告警。`--check` 的自检表只查 7 个字段（L552–558），`quirk`、`risk`、`motion`、`visuals`、`audit` 都不在自检范围内——**即使真被吃掉也发现不了**。

### 6.4 🟡 `scenes` 的串段问题在字段 8 上重演（S13）

`p20-field8style.mjs` 显示 S13 的字段 8 是 780 字 / 9 行，比其他案多 5 段。原因是它的字段 8 后面跟了一个**无编号小节**：

```
**反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾）**
- **必须存在 X**：单向硬光源方位角常驻 135°…
```

`starts` 的三条正则都要求「数字开头」，所以这个无编号小节不被识别为字段起点，**整段被并进字段 8**。这和注释里记载的 `scenes` 串文案（52/57 双席报出、20/30 命中）是**同一个机制**，只是发生在另一个字段上。若 `audit` 接进 UI，用户会在 S13 的「去 AI 味审查点」里看到一张不该在那里的验收表。

### 6.5 🟡 `index.html` 对 data.js 零消费，但注释声称相反

`index.html:177`：

```html
<p>…window.STYLE_PROMPTS.sceneIndex 与 window.SCHEMES 现算填入…</p>
```

而 `p7-matrix.mjs` 显示 `index.html` 对全部 33 个字段的访问形态命中 **0 次**。那两个数字实际是 `app.js` 的 `syncEmptyFacts()`（L307–319）填的。**注释描述的是 app.js 的行为，写在 index.html 里。**

### 6.6 🟡 `wizard.js` 重算了 `axes.chroma` 已有的结果

```js
// wizard.js:54, 64, 76
var louds = ALL.map(function (r) { return loudnessOf(r.palette); });
var loud = stretch(louds, loudnessOf(r.palette));
loudRaw: Math.round(loudnessOf(r.palette) * 100),
```

而 `collect-schemes.mjs` L431 已经算好 `axes.chroma`（全部案最大饱和度），存在 data.js 里、零消费。两处算法不同（一个取 palette 整体、一个取 max），**同一个「吵不吵」轴有两份可能不一致的数值**。

### 6.7 🟡 `family` 在行卡上被切到 34 字，30/30 全中

`app.js:235` 的 `.slice(0, 34)` 丢弃 4891 字，把「参考对象」清单整段切掉只剩家族名。对比 `wizard.js:212` 的 `def.slice(0, 96)`（只影响 14/30、丢 132 字）——`family` 这一刀的损失是它的 **37 倍**，但两个截断点在代码里长得一模一样，很容易只注意到 `def`。

### 6.8 🟡 `prompts.js` 已落后于 `data.js`（新字段未接）

```
node deliverables/65-audit/p29-stale.mjs
# prompts.js 里是否存在 audit: 不存在 → prompts.js 未跟上 data.js 的新字段
```

`build-prompts.mjs` 有 2 个从 data.js 抽字段的闭包（`RISK` 抽 risk、`REUSE` 抽 landing），要接 `audit` 需要新增第 3 个。`p29-stale.mjs` 已验证正则可用（`AUDIT` 抽到 30/30 案），改动面很小。

### 6.9 🟢 `built` / `gate` / `shots` 三个字段无区分度，养着 8 处死分支

见 §2.4。`built` 30/30 恒 true 却仍在 app.js 里驱动 5 个分支（含两个 CSS class 与三个文案）。

### 6.10 🟢 `errorCodeSource` 只在 10/30 案有机会渲染

`app.js:433` 把它放在 `r.copyParts.error` 的 else 分支里，而 `copyParts.error` 恰好只在 S21–S30 为空。所以这个字段的「Lead 补入」说明**永远只在 S21–S30 出现**——设计上也许正确，但代码里没有任何注释说明这个耦合，改动 `copyParts.error` 的解析会静默改变它的可见性。

---

## §6A 方法学附录：这次审计里我自己踩的 4 个坑

写下来是因为**这 4 个坑都会让审计结论反向**，而它们都不是「算错了」，是「量错了对象」。

### 坑 1：用字符串包含判「字段是否被读取」，被注释骗了

`src.includes("fields['机制']")` → 命中 L124 → 得出「读取 1 次」。
实际 L124 是 04:21 新加的注释：`所以它命中不了 fields['机制']，也不需要命中。`

**修法**：先 `stripComments()` 再计数（`p4-fieldreads.mjs`）。修完实测 0 次。

同类陷阱：`grep '"risk"'` 会同时命中代码与注释里的示例；`grep 'minPics'` 会命中「此前 minPics 命中 0 次」这句注释本身。

### 坑 2：用裸字段名 grep，把同名的别的东西算成消费

本轮实测到的三处：

| 字段 | 假命中 | 真相 |
|---|---|---|
| `family` | `style.css` 41 次 | 全部是 `font-family`，`.family` 访问 **0 次** |
| `scenes` | `prompt-copy.js` 13 次 | 全部是 `TEMPLATES[].scenes`（模板的适用行业），不是 `SCHEMES[].scenes` |
| `motion` | `style.css` 1 次 | `prefers-reduced-motion` |
| `load` / `word` / `ground` | 多处 | `XHR.load` / `word-wrap` / `background-ground` 一类 |

**修法**：只认 4 种访问形态（`.字段\b` / `['字段']` / `{字段}` 解构 / `字段:`），再逐条人工确认（`p7-matrix.mjs` + `p21-halfdead.mjs`）。

### 坑 3：用「值的短片段包含」判「字段是否进了提示词」

`p14-inprompt.mjs` 初版报 `fr` 30/30 进了提示词——因为 `fr` 的值是单字母 `F` 或 `R`，而提示词里到处都有 `F`（`font`）和 `R`（`Redaction`）。同理 `threshold`（低/中/高）、`bg`/`primary`（7 字符 HEX 恰好出现在 palette 串里）。

**修法**：对短值必须打印上下文（`p15-recheck.mjs`），确认它出现的**位置**是否就是该字段的语义位置。修正后真实结论是：只有 `tone` 直读 + `risk`/`landing` 经闭包，共 3 个字段进了提示词。

### 坑 4：拿 md 原文长度和 data.js 解析长度对比时，忘了 `dec()` 会压空白

`dec()` 做三件事：去 `**`、去反引号、把连续空白压成一个空格。所以同一段文字在 md 里 300 字符、`dec()` 后是 292 —— 差 8 是我自己的函数造成的，不是「截断」。

**修法**：比长度只能比「同一个函数处理后的结果」（`p27-trunc2.mjs` 用同一解析器重跑 md 再逐字比对，得 0 处不一致）。否则会把 `dec()` 的正常压缩误报成 30 案全部截断。

---

## §7 复算命令总表

所有探针在 `deliverables/65-audit/`，均只读仓库。

| 结论 | 命令 |
|---|---|
| 基线差异（HEAD vs 工作树） | `node deliverables/65-audit/p12-baseline.mjs` |
| 33 字段非空/字数/极值 | `node deliverables/65-audit/p1-fields.mjs` |
| 13 FIELDS 读取与赋值 | `node deliverables/65-audit/p4-fieldreads.mjs` |
| 标题写法 5 形态 + 覆盖率 | `node deliverables/65-audit/p30-cover.mjs` |
| 正则误检数（0） | `node deliverables/65-audit/p31-falsepos.mjs` |
| `layout` bug 触发条件 | `node deliverables/65-audit/p33-colon.mjs` |
| 逐案 starts 与伪 key | `node deliverables/65-audit/p3-starts.mjs` |
| 字段截断（300 组比对） | `node deliverables/65-audit/p27-trunc2.mjs` |
| 字段 8 体量（分组） | `node deliverables/65-audit/p25-auditlen.mjs` |
| 26,096 复算尝试 | `node deliverables/65-audit/p26-26096.mjs` |
| 字段 8 写法差异成因 | `node deliverables/65-audit/p20-field8style.mjs` |
| 规则编号 C/P/R 核查 | `node deliverables/65-audit/p19-refs2.mjs` |
| 字段 × 6 消费方矩阵 | `node deliverables/65-audit/p7-matrix.mjs` |
| 嵌套字段（axes/gate/shots） | `node deliverables/65-audit/p8-nested.mjs` |
| grep 误报取证 | `node deliverables/65-audit/p21-halfdead.mjs` |
| 半死字段截断量 | `node deliverables/65-audit/p28-slices.mjs` |
| 死分支与恒定值 | `node deliverables/65-audit/p23-deadbranch.mjs` |
| 提示词字数分布 | `node deliverables/65-audit/p13-promptlen.mjs` |
| 哪些字段进了提示词 | `node deliverables/65-audit/p14-inprompt.mjs` |
| 短值假命中复核 | `node deliverables/65-audit/p15-recheck.mjs` |
| 机制双通路 | `node deliverables/65-audit/p16-mech.mjs` |
| prompts.js 陈旧性 | `node deliverables/65-audit/p29-stale.mjs` |

---

## §8 一页纸结论

**真·死字段（5 个有值 + 1 个死名字，共 16,453 字零消费）**

| 字段 | 字数 | 性质 |
|---|---|---|
| `audit` | 10,539 | **新赋值，UI 与提示词都未接**（本轮最该跟进的） |
| `copy` | 4,106 | 内容已被 `copyParts` 完整覆盖（30/30 验证），纯冗余 |
| `scenesNo` | 1,453 | 「不适合」段，30/30 有值，从未被读取 |
| `primary` | 210 | 恒等于 `palette[1]`（30/30），派生冗余 |
| `buttonText` | 145 | 17/30 有值，13 案 null |
| `机制` | 0 | **FIELDS 里的死名字，key 在 md 里不存在**；机制句走 extract-dna + mechanisms.mjs 另一条路 |

**半死字段（4 类）**：`def`（14/30 被切成 96 字，兜底分支永不执行）、`family`（**30/30 被切成 34 字，丢 4891 字**）、`risk`（8/30 被切成 220 字）、`axes`（10 子键中 5 个零消费，`chroma` 被 wizard.js 重算一遍）。

**死分支（8 处）**：由 `built` 恒 true、`gate` 恒非空、`shots` 恒非空支撑；另 `errorCodeSource` 只在 10/30 案可达。

**三个最该先修的**

1. **把 `audit` 接进消费端**——它已经是全库第 4 大字段（10,539 字），却 6 个 UI 文件与 prompts.js 全部 0 命中。接提示词时**不能照抄 `risk` 的 220 字口径**：`audit` 最短值 276 已 > 220，按该口径 30/30 全被截、均值涨 250 字、29/30 案突破 1905 上限。
2. **`tailAbs` 的钳制加断言**（`if (to <= starts[i].end) throw`）——现在它会静默把字段切成空串，且 `--check` 的自检表只覆盖 7 个字段，`quirk`/`risk`/`motion`/`visuals`/`audit` 被吃了也发现不了。
3. **删掉 FIELDS 里的 `'机制'`**（或改成注释说明），别让它继续当唯一的路标——它指向的不是 data.js，而是另一条完全独立的抽取链。
