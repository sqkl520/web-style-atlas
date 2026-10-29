# EXEC-A：`_prompts/` 数据生成链上的两个确定性 bug

> 执行者：Agent A
> 基线：`git rev-parse HEAD` = **`03f6fd47e364c43dffdf240f3eb298987f840625`**（收尾复核，未变；我没有 commit）
> 开工 / 收尾 `git status --porcelain` 中**已跟踪文件**的改动清单：见 §7。
> 所有改动都经**重跑生成链**得到，没有手改任何 JSON 产物。

---

## 0. 先读这一节：本报告有两层，必须分开看

本轮有 **两个 Agent 并发改同一条链**（我 = EXEC-A，另一个 = EXEC-B）。我们互相覆盖过 3 次。为了不让读者把两个人的工作混在一起，本报告严格分成两栏：

| 栏 | 内容 | 谁做的 |
|---|---|---|
| **§1–§4 的「根因 / 修法」** | 两个 bug 的定位与修法设计 | **A（我）** —— 见 §6 的改动归属表 |
| **§5 的「最终实测」** | 合并后代码在当前仓库状态下的全部验证 | 两人代码合并后的结果 |

**关键事实（务必知会 Lead）**：

1. `clean-dna.mjs` 现在是一个**混合体**：我的 `eachRule` 单遍重写 + `conditionApplies` + `topVars` + `h1SizeVerdict` + 无限额去重，加上 B 的 `selectorIsInteractiveOnly` + 状态类识别 + JS `stroke-width` 扫描 + 纹理容器过滤 + `lineWidthsInteractive` 字段。**两套改动共存且互相依赖**。
2. `prompt-copy.js` 被 B 改了（+158 行）：新增过「第 6 条 字号」，中间版本曾把 clamp 下限当上限用（25/30 案偏低 36–60%），现已修正为按 1440 实算。**这个文件超出我的写入授权，我没有动它。**
3. `build-prompts.mjs` 被 B 改了（+12 行）。我原本不需要改它。

---

## 1. Bug 1：`h1Size` 有 2/30 未解析成数值

### 1.1 现象（改前实测）

```
S01  "var(--fs-h1)"      ← 不是字号，是变量名。AI 不认识它。
S09  "var(--fs-h1)"      ← 同上
S03  ""                  ← 空串（任务书没提，但同源）
S07  ""                  ← 空串
S13  ""                  ← 空串
S21  ""                  ← 空串
```

任务书只点了 2 个 `var()`，实测同一根因还制造了 **4 个空串** —— 实际 6 案受影响，不是 2 案。

### 1.2 根因

`prototypes/_prompts/extract-dna.mjs:111-114`：

```js
// ---- h1 字号 ----
let h1Size = "";
const h1 = css.match(/h1\s*\{[^}]*font-size\s*:\s*([^;}]+)/);
if (h1) h1Size = h1[1].trim();
```

三个彼此独立的盲区，各自都能单独造成错误：

| 盲区 | 后果 | 命中案 |
|---|---|---|
| **不解 `var()`** | 原样吐出 `var(--fs-h1)` | S01、S09 |
| **不认「h1 没有裸规则、字号写在 h1 的 class 上」** | 抽成空串 | S03（`.d1`）、S07（`.display`）、S13（`.doctitle`）、S21（`.masthead__title`） |
| **看不见 `@media` 层叠** | 若窄屏档写在裸 h1 上会盖掉桌面档 | 本批未触发，但 S01/S12 的窄屏档证明它随时会 |

复算证据：`deliverables/70-exec/probes-a/a01-h1size-candidates.mjs` 第 1 节把「旧正则命中了哪条规则」逐案打出（S01 → `.masthead h1`，S09 → `.sign h1`，S03/S07/S13/S21 → 无命中）。

### 1.3 `--fs-h1` 的真实值（任务书要求：说明取哪一档、为什么）

`a01` 第 3 节 + `a11` 第 1 节的实测：

| 案 | `--fs-h1` 定义位置 | 值 | 是否有 `@media` 覆盖 |
|---|---|---|---|
| S01 | `style.css:34`（顶层 `:root`） | `clamp(48px, 6.67vw, 96px)` | **规则层面有**：`L393` 的 `@media (max-width: 1439px)` 把 `.masthead h1` 覆盖成 `clamp(52px, 6.1vw, 86px)`。**变量本身只有一处定义**。 |
| S09 | `style.css:44`（顶层 `:root`） | `clamp(46px, 6.7vw, 98px)` | **没有**。S09 的两个 `@media` 只改 `--pad`/`--tilt`/`--spine`，与字号无关。 |

**取哪一档 & 理由** —— 取 **桌面档 = 1440px 视口**。三条理由：

1. **提示词是给「整站设计」用的，首屏主标题的设计值就是桌面值。** `clamp(a, b vw, c)` 在 1440 下已收敛到上限（`a11` 实算：S01 = **96px**，S09 = **96.48px**）。窄屏档是同一设计被收窄的结果，写进提示词只会让 AI 把标题做小。
2. **仓库的审查视口就是 1440**（`shot.mjs`、`check-stale` 的截图、`verify-prototype` 的闸门全部按 1440 跑）。取别的档会让提示词与"这个仓库认为它长什么样"脱钩。
3. **S01 的 `@media (max-width: 1439px)` 在 1440 下不成立**。若按"最后出现的那条"取，会拿到 86px 而非 96px，且这个错误在 1440 视口下**永远是错的**。

⚠️ 取舍说明：`h1Size` **保留原始 CSS 表达式**（`clamp(48px, 6.67vw, 96px)`），不折算成单个 `96px`。理由：提示词是施工说明，`clamp()` 本身携带"这个标题是流式的"这条信息；折算成固定值会让 AI 写成死字号，在别的视口就崩。历史数据 28/30 本来就是 `clamp(...)`，保持形状一致。

### 1.4 修法

**不改 `extract-dna.mjs`**。理由：它是"上游粗略版"，而 `clean-dna.mjs` 是**唯一落盘到 `dna-clean.json` 的地方**。在 clean 侧修能同时拿到 `eachRule` 的规则遍历与 `vars` 变量表 —— extract 侧两样都没有，硬修等于复制半套 CSS 解析器。

新增 `clean-dna.mjs` 的 `h1SizeVerdict()`：

```js
function h1SizeVerdict(cleanCss, vars, h1Classes, fallback) {
  const cands = [];
  eachRule(cleanCss, function (sel, body, media) {
    if (media && !conditionApplies(media)) return;        // ← 只认桌面档
    const fm = body.match(/(?:^|;)\s*font-size\s*:\s*([^;}]+)/);
    if (!fm) return;
    const groups = selectorGroups(sel);
    const bare = groups.some(g => /^h1(?![\w-])/i.test(g));            // 裸 h1
    const desc = groups.some(g => /(^|[\s>+~])h1(?![\w-])/i.test(g));  // .masthead h1
    const cls  = (h1Classes||[]).some(c => groups.some(g => new RegExp("\\."+c+"(?![\\w-])").test(g)));
    if (!bare && !desc && !cls) return;
    cands.push({ value: fm[1].trim(), rank: bare ? 0 : desc ? 1 : 2, sel });
  });
  for (const rank of [0,1,2]) {                     // 按层叠优先级取最高一档
    const hit = cands.filter(c => c.rank === rank);
    if (!hit.length) continue;
    const last = hit[hit.length-1];                 // 同档取最后一条（CSS 后者胜）
    const v = resolveVars(last.value, vars, 0).trim();    // ← 解 var()
    if (v && !/var\(/.test(v)) return { text: v, why: ... };
  }
  const f = resolveVars(String(fallback||""), vars, 0).trim();
  return { text: /var\(/.test(f) ? "" : f, why: ... };   // 解不开宁可空，不写变量名
}
```

三个关键点：

* `resolveVars()` 是文件里已有的（递归展开，带深度上限防环）。
* `if (v && !/var\(/.test(v))` 是**出口守卫**：变量解不开时宁可返回空串，也不把变量名写进提示词。上一轮正是少了这道守卫。
* `h1Classes` 从 `index.html` 的 `<h1 class="...">` 读（原本就有，仅用于字体），现在字号也用它。

**修法是通用的，没有 hardcode 案情号**：判据是 CSS 层叠规则本身（选择器形状 + 媒体条件 + 层叠顺序）。证据：它同时修好了任务书没点的 S03/S07/S13/S21 四个空串。

### 1.5 验证

**30/30 全部是数值**（`a08` C 段 + `a07` 第 1 节）：

| 案 | 改前 | 改后 | 判据（`dna-clean.json` 的 `h1SizeWhy`，本轮新增留档） |
|---|---|---|---|
| S01 | `"var(--fs-h1)"` | **`clamp(48px, 6.67vw, 96px)`** | h1 后代规则 `.masthead h1` 声明 var(--fs-h1) → 展开为 clamp(48px, 6.67vw, 96px)（桌面 1440px 口径） |
| S09 | `"var(--fs-h1)"` | **`clamp(46px, 6.7vw, 98px)`** | h1 后代规则 `.sign h1` 声明 var(--fs-h1) → 展开 |
| S03 | `""` | `68px` | h1 的 class 规则 `.d1` 声明 68px |
| S07 | `""` | `clamp(38px,5.4vw,84px)` | h1 的 class 规则 `.display` 声明 clamp(38px,5.4vw,84px) |
| S13 | `""` | `56px` | h1 的 class 规则 `.doctitle` 声明 56px |
| S21 | `""` | `clamp(42px,6vw,88px)` | h1 的 class 规则 `.masthead__title` 声明 clamp(42px,6vw,88px) |
| S12 | `clamp(54px, 6.6vw, 104px)` | `clamp(88px, 6.6vw, 112px)` | 裸 h1，在 `@media (min-width:1440px)` 内 —— 见下 |

**S12 是本轮唯一"任务书没提、我要主动交代"的行为变化。** 它在 `style.css:389` 有 `@media (min-width: 1440px) { h1 { font-size: clamp(88px, 6.6vw, 112px); } }`，这条在 1440 下**成立**，所以按"桌面档最后一条胜"取它。`a11` 算出：两档在 1440 下的实际像素**完全相同**（都是 **95.04px**，因 `6.6vw × 1440 = 95.04` 同时落在两个 clamp 区间内）。所以这不是"字号变了"，是"同一个字号的两条等价写法，取了在当前视口生效的那条"。

### 1.6 对其它 24 案的影响：**无**

三层证明：

1. **结构性 diff（最硬）**：把改前备份的 `prompts.js` 与新的逐字段递归比对，`h1Size` 变化 **7 条**（S01/S03/S07/S09/S12/S13/S21），其余 23 条**逐字节相同**。同一次比对里 `palette`/`fonts`/`radius`/`radiusBare`/`shadow`/`mechanism`/`primary` 全部 **0 变化**。
2. **逻辑上无影响**：新函数只在"命中 h1 相关 font-size 规则"时改值。对 23 个案，它取到的规则与旧正则命中的是**同一条**（`a01` 第 1 节逐案列出，其中 23 案标 `bare-h1`，与新函数 rank=0 分支一致），值相同 → 输出相同。
3. **优先级无歧义**：`a12` 断言「桌面档里多个优先级阶梯同时有字号」的案数 = **0**。30 案里没有一案的结论依赖于我对"裸 h1 vs class 谁优先"的判断 —— 每案只有唯一一档命中，这是事实而非判断。

### 1.7 ⚠️ 必须说清：Bug 1 当前对提示词正文「零可见效果」

实测：

```
最终提示词正文里出现「首屏主标题取」的案数: 0 /30
最后一版（B 改的）第 6 条字号：30/30 出现，且数值正确
```

| 版本 | `h1Size` 是否进正文 | 说明 |
|---|---|---|
| 我的版本（23:25 前后） | **0/30** | `prompt-copy.js:284` 的 `if (d.h1Size) facts.push(...)` 在 `else` 分支里，而 30/30 案都有机制句（`mechanisms.mjs` 补齐了 S11–S30），`if (d.mechanism)` 恒真 → else 永不执行 |
| B 的中间版本 | 30/30，但 **25/30 偏低 36–60%** | 用 `/(\d+)px/` 抓 clamp 的**下限** |
| B 的最终版本 | 30/30，**数值正确** | 改成按 1440 视口实算，并给出「正文约 Npx；最大标题压到正文的 M 倍（约 Kpx）」 |

所以 **Bug 1 的修复在"数据"层面已完成（30/30 数值），在"呈现"层面由 B 的第 6 条接上了线**。我原本的修复只是修好了 `prompts.js` 里的一处错数据；任何**直接读 `window.STYLE_PROMPTS`**（不走 `buildPrompt()`）的消费方都能受益。

---

## 2. Bug 2：`lineWidths` 抽取不完整 / 与实际不符

### 2.1 现象（改前实测）

22/30 案偏少。极端例子：

| 案 | 改前声称 | 实际桌面真值（改后） |
|---|---|---|
| S25 | `3px` | `1px、1.2px、2px、3px` |
| S17 | `1px、2px` | `0.5px、0.8px、1px、2px、2.4px、5px、6px` |
| S27 | `1.2px、2.4px、3px` | `0.8px、1.6px、1.8px、3px、3.6px`（旧值 1.2/2.4 是**窄屏值**，已消失） |
| S15 | `0.5、0.8、1、1.7、3px` | `0.5px、0.8px、1px、1.2px、2px、3px` |

### 2.2 复核审计报告：**行号对，根因描述浅了一层，patch 可分离性是错的**

任务书要求「先读报告 1-2 节，但不要盲信」。

**✅ 报告说对的**：
* 唯一产生地是 `clean-dna.mjs` 的 `lineWidthVerdict()`，行号 **452**（改前）**完全正确**。
* `collect-schemes.mjs` / `99-scratch/build-prompts.mjs` / `extract-dna.mjs` 都不产生它 —— 正确。
* 文案产生处 `prompt-copy.js:456`、次级使用 `:283` —— 正确。
* §1.2 的量纲表（CSS px vs SVG 用户单位）—— 正确且有价值。

**⚠️ 三点更正**：

**(1) 报告漏了「文本全局扫描」这个结构性原因。** 报告 §1.1 引了正则（正确），但没指出它**不是用 `eachRule` 遍历规则**，而是裸 `cleanCss.replace` 全局扫描。这意味着它天然看不见 `@media` 边界，也看不见选择器。报告的 §1.2 表格最后一行"`@media` 内的 `:root` 覆盖 → 被当成全站值"讲对了现象，但没把这个结构原因说出来。**这是根因的关键一半。**

**(2) 报告认为两个 patch 可分离实施 —— 实际强耦合。** 报告 §2.4 末尾承认"必须同时去掉去重"，但 §1.1 的代码块没标出去重代码（`L495-500`），读起来像两个独立 patch。我把四种组合都跑了一遍（`probes-a/a13-s25-coupling.mjs`）：

| 组合 | S25 结果 |
|---|---|
| ① 只扫 CSS + 0.5px 合并（改前实况） | `3px` |
| ② 只扫 CSS + 不合并 | `3px`（CSS 里真的只有 3） |
| ③ **加扫 HTML + 保留合并（"只加半套"）** | `1px、2px、3px` ← **仍然缺 1.2** |
| ④ 加扫 HTML + 不合并（实际采用） | `1px、1.2px、2px、3px` ✓ |

机理：`coarse` 从 1 开始，`1.2` 与 `1` 相差 0.2 < 0.5 → **被丢掉的是 1.2**（装订线那一级），留下的是 1。所以"只加 HTML 扫描"会让人以为修好了（多出 1 和 2），实际最关键的 1.2 依然缺席。

**(3) 报告的 §2.5 说 S27 的 `3.6` "未折算" —— 实际上桌面档本身就该有 3.6。** `--mis: 1.8px`（顶层），`calc(var(--mis) * 2)` = **3.6px**。改后 S27 同时有 `1.8` 与 `3.6`，正是 `--mis` 与其 2 倍。报告把它当成"窄屏 1.2×2=2.4"的对照物，没意识到桌面档的正确结论。

**结论**：报告的**行号定位（452）与"唯一产生地"判断正确**，可以采信；但**根因描述不完整**，且 patch 的耦合关系被低估。

### 2.3 实际抽取来源（任务书逐条问的六个问题）

`a02` + `a05` + `a06` 逐案实测：

| 问题 | 改前答案 | 实测证据 |
|---|---|---|
| 只扫 `border-width`？ | **不止**：`border`、`border-top/right/bottom/left`（含简写）、`outline`、`outline-width`、`stroke-width` | 正则 L454 |
| 有没有扫 `stroke-width`？ | **CSS 有，HTML 属性没有**。19/30 案的真实线宽写在 `index.html` 的 SVG 属性上 | S25 的 `1.2/2/1` 全在 HTML；CSS 里一个都没有 |
| 有没有扫 `outline-width`？ | **有**（`outline(?:-width)?`），简写 `outline: 3px solid` 也命中 | S25 的 `3px` 正是 `:focus-visible{outline:3px}` |
| 有没有扫 `column-rule-width`？ | **没有** —— 实打实的漏项。S07 的 `.toc{column-rule:.5px solid}`（目录栏间竖线）完全没抽到 | 改后 S07 从 `1px、2px` → `0.5px、1px、2px` |
| 有没有扫 `border-top-width` 的简写？ | **有**，但**漏了 `border-block`/`border-inline`/`-start`/`-end` 逻辑属性** | S13 用 `border-block: 1px solid`（forced-colors 分支） |
| 有没有处理 `@media` 里的覆盖？ | **没有** —— 最严重的一条。全局文本扫描看不见 `@media` 花括号 | S25 的 `3px` 有一半来自 `@media(max-width:899px){.thread path{stroke-width:3}}`；S27 的 `1.2/2.4` 来自 `@media(max-width:819px){:root{--mis:1.2px}}` |

**另外两个报告没提的漏项**（我复核时发现）：
* **`@media` 里的 `:root` 变量覆盖**：`clean-dna.mjs:594`（改前）建 `vars` 字典时遍历**所有** `:root` 块，不区分媒体，后者覆盖前者。S27 的 `--mis` 因此从 `1.8px` 漂成 `1.2px`。这是 S27 那两个"编造值"的真正来源 —— 不是抽取器把 1.2 读错，是**变量表本身被污染了**。
* **0.5px 合并**（`L495-500`，改前）：把相差 <0.5px 的 ≥1px 值合成一档，实测吃掉 7 案的签名：S25 的 1/1.2、S09 的 3.5/3.6、S15 的 1.2/1.4/1.7、S24 的 0.4/0.6/0.8。

### 2.4 修法（我做的部分）

`lineWidthVerdict()` 整体重写，配 4 个新辅助：

| 新函数 | 作用 |
|---|---|
| `declsOf(body)` | 声明块 → `{prop, value}`，用**属性名白名单**过滤（不用 `([^;}]+)` 一把梭 —— 值里可能有 data-URI） |
| `widthNumbers(value, isStroke)` | 解 calc → 取 `Npx`；`stroke-width` 额外允许裸数字（SVG 用户单位） |
| `topVars(rawCss)` | **只取桌面作用域**的 `:root`（跳过 `@media` 里在 1440 不成立的） |
| `conditionApplies(cond, viewport)` | 按 1440 视口判条件组真伪 |

**四条修法，对应四个根因**：

1. **加扫 `index.html`**（对应"漏 HTML"）
   ```js
   for (const m of html.matchAll(/stroke-width\s*=\s*["']?([%0-9.]+)(?:px)?["']?/gi)) {
     const around = html.slice(Math.max(0, m.index - 240), m.index);
     if (/data:image\/(?:svg\+xml|png|jpeg)/i.test(around)) continue;   // data-URI 是纹理
     let raw = m[1]; try { raw = decodeURIComponent(raw); } catch {}
     if (parseFloat(raw) > 0) note(round2(parseFloat(raw)), ...);
   }
   ```
   扫描前先剥 HTML 注释与 `<script>`（**B 后来改为保留 script 并解析 JS**，见 §6）。

2. **属性白名单扩到 8 类**（对应"漏 column-rule / 逻辑属性"）
   ```js
   const WIDTH_DECL_RE = /^(?:border|border-width|border-(?:top|right|bottom|left|block|inline)(?:-(?:width|start|end))?|outline|outline-width|column-rule|column-rule-width|stroke-width)$/i;
   ```

3. **按 1440 判 @media + 变量表只认桌面**（对应"窄屏值冒充桌面值"）
   ```js
   function conditionApplies(cond, viewport) {   // 默认 1440
     if (/^@(supports|layer|container)/i.test(cond)) return true;   // 渐进增强，不是断点
     if (/prefers-reduced-motion|print|forced-colors|hover\s*:|pointer\s*:/i.test(cond)) return false;
     for (const m of cond.match(/min-width:\s*Npx/gi)||[]) if (1440 < N) return false;
     for (const m of cond.match(/max-width:\s*Npx/gi)||[]) if (1440 > N) return false;
     return true;
   }
   ```
   实测边界（`a05`）：`min-width:1440` → true（S02/S10/S17 各一条）；`min-width:1024 and max-width:1439` → false；`max-width:1439` → false；`prefers-reduced-motion` → false。

4. **去掉 0.5px 合并**（对应"吃掉签名档位"）
   ```js
   // 旧：fine(<1) 全留 + coarse(≥1) 按 0.5px 粒度去重
   // 新：只保留完全相等的去重（round2 之后 Set 已经做到）
   return list.map(n => n + "px").join("、");
   ```

**排除误报的三条**（任务书要求）：
* `border-width: 0` / `none` / `hidden` 不算 —— 在取数值**之前**判 `/^(?:none|hidden|0)(?:\s|;|$)/i`，不依赖 `n>0`（`border: 0 solid red` 这种带颜色的 0 也能挡住）。
* 只出现在注释里的不算 —— 入口已 `stripComments(rawCss)`，HTML 侧另剥 `<!-- -->`。
* 被后续规则完全覆盖的旧值：**没有做**（任务说明允许"难以判断就宁可保留并标注"）。真做层叠覆盖判定需要完整 CSS 优先级引擎（`!important` / specificity / 源序 / 继承），仓库里没有；硬写半吊子版本会误删真值。现在做法是**全部保留 + 每个值留出处**（`lineWidthsWhy`），由人复核。

**变量解不开时的保护**（新增，报告没有）：
```js
const resolved = resolveVars(d.value, vars, 0);
if (/var\(/.test(resolved)) continue;   // 变量没解开就跳过整条
```
`var(--x)` 里一个 px 都没有，但 `var(--x) 3px` 会**只取到 3px 而丢掉真正那一级** —— 最难发现的漏讲。整条跳过更安全。

### 2.5 验证：30 案新旧对比（任务书要求逐案列出）

基线 = `deliverables/70-exec/backup-a/dna-clean.json`（我的改前快照）。**「新值」是合并后最终状态**（含 B 的后续改动，故与"我一个人的版本"在 S03/S20 等个案上有出入 —— 那些差异见 §6）。

| 案 | 改前 | 改后（最终） | 变化 |
|---|---|---|---|
| S01 | `1px、3px` | `1px、3px` | = |
| S02 | `1px、2px` | `1px、2px` | = |
| S03 | `1px、2px` | `1px、1.2px、1.5px、2px` | +1.2（HTML 属性）、+1.5（JS 运行时描边） |
| S04 | `1px、3px` | `1px、1.1px、3px` | +1.1（CSS stroke 裸数字，原被 0.5 合并吃掉） |
| S05 | `1px、2px` | `1px、2px` | = |
| S06 | `1px、2px` | `0.8px、1px、2px` | +0.8（HTML 属性 ×17） |
| S07 | `1px、2px` | `0.5px、1px、2px` | +0.5（**column-rule 漏项**） |
| S08 | `2px、3px、4px` | `1.25px、2px、3px、4px` | +1.25（HTML 属性 ×10） |
| S09 | `2px、3px、3.5px` | `2px、3px、3.5px、3.6px` | +3.6（0.5 合并曾吃掉） |
| S10 | `1.25px、2px` | `1.25px、1.5px、2px` | +1.5（border-left，0.5 合并曾吃掉） |
| S11 | `1px、2px、3px` | `1px、1.25px、2px、3px` | +1.25（CSS stroke，0.5 合并曾吃掉） |
| S12 | `1px、2px、8px` | `1px、2px、8px` | =（data-URI 的 5.66 正确排除） |
| S13 | `1px、2px、3px、5.5px、7px、9px、14.5px` | `1px、1.5px、2px、3px、5.5px、9px、14.5px` | **−7 / +1.5**：7px 只在 `@media(max-width:1023)`；1.5 来自 HTML 属性 ×10 |
| S14 | `1px、2px、3px` | `1px、1.25px、2px、3px` | +1.25（HTML 属性 ×4） |
| S15 | `0.5px、0.8px、1px、1.7px、3px` | `0.5px、0.8px、1px、1.2px、2px、3px` | **−1.7 / +1.2、+2**：1.7 只在 `@media(max-width:1023)` |
| S16 | `2px、3px、6px、13px` | `2px、3px、6px、13px` | = |
| S17 | `1px、2px` | `0.5px、0.8px、1px、2px、2.4px、5px、6px` | **+5 项**（HTML 属性 ×8，全套印章描边） |
| S18 | `0.8px、1px、2px、4px` | `0.8px、1px、1.25px、2px、4px` | +1.25（HTML 属性 ×3） |
| S19 | `0.4px、0.8px、1px、3px` | `0.4px、0.8px、1px、3px` | =（data-URI 的 `%271%27` 正确排除） |
| S20 | `0.35px、0.5px、1px、3px` | `0.35px、0.5px、1px、3px` | =（HTML 的 0.2 是 `<pattern>` 网格纹理，正确排除） |
| S21 | `1px、2px` | `1px、1.25px、2px` | +1.25（HTML 属性 ×3） |
| S22 | `1px、3px` | `1px、3px` | = |
| S23 | `1px、6px` | `1px、1.5px、6px` | +1.5（HTML 属性 ×4） |
| S24 | `0.4px、0.6px、0.8px、1px、2px、2.5px` | `0.4px、0.6px、0.8px、1px、1.2px、2px、2.5px、3.2px` | +1.2、+3.2（0.5 合并 + HTML 属性） |
| S25 | `3px` | `1px、1.2px、2px、3px` | **+1/1.2/2**（全部来自 HTML 属性；任务书点名的案） |
| S26 | `2px、8px` | `2px、8px` | = |
| S27 | `1.2px、2.4px、3px` | `0.8px、1.6px、1.8px、3px、3.6px` | **−1.2、−2.4 / +0.8、+1.6、+1.8、+3.6**（窄屏变量污染修掉，桌面真值全抽到） |
| S28 | `2px、8px` | `1.2px、2px、8px` | +1.2（HTML 属性 ×4） |
| S29 | `0.4px、0.6px、1px、2px、3px、6px` | `0.4px、0.6px、1px、1.2px、2px、3px、6px` | +1.2（CSS stroke，0.5 合并曾吃掉） |
| S30 | `1px、3px、6px、8px` | `1px、1.6px、2px、3px、6px、8px` | +1.6、+2（HTML 属性 ×4） |

**统计**：变化 **21/30**（S01/S02/S05/S12/S16/S19/S20/S22/S26 未变）。其中 **3 案出现"值变少"**（S13 删 7px、S15 删 1.7px、S27 删 1.2/2.4），全部是**窄屏值被正确剔除**，不是漏抽。

**变化最大的 8 个**（按新增项数）：S17(+5)、S27(净 +3，且删了 2 个假值)、S25(+3)、S15(净 +3)、S24(+2)、S30(+2)、S03(+2)、S13(净 +1，删了 1 个假值)。

**独立复算**（`a08`，用**完全不同的一遍实现** —— 逐声明扫描 + 区间判媒体，不 import clean-dna 任何函数）：

```
A 编造（声称值不在真值里）：0/30 案
B 漏讲（桌面真值没进列表）：0/30 案
C h1Size 不可复算/含 var()：  0/30 案
→ 全过 ✓
```

### 2.6 对 S20 的专门检查（任务书点名）

**结论：这是两个数据源的冲突，但不是 `lineWidths` 的错。我没有裁决，报告如下。**

| 项 | 值 | 来源 |
|---|---|---|
| 机制句（`dna.mechanism`） | 「…走线 **0.35px** 按 **0.6/1.2/2.4px** 三级分档——量级由**线距**读出」 | `prototypes/_prompts/mechanisms.mjs` 的 `S20` 条目（人工补写），source 标注 `index.html:94,113 + _specs/S20.md:32` |
| 硬约束第 5 条（`dna.lineWidths`） | `0.35px、0.5px、1px、3px` | `clean-dna.mjs` 的 `lineWidthVerdict()`，抽取自 CSS 与 SVG 属性 |

**这两个 0.6/1.2/2.4 是什么？** —— 查 `index.html` 原文：

* `L94`：`<p class="grp__body">每 6 格换一档，只有三级 0.6 / 1.2 / 2.4px；画布按 8 倍图面输出，即 4.8 / 9.6 / 19.2px。`
* `L113`：`<tr><td>走线间距 s</td>…<td><code>s = {0.6, 1.2, 2.4}[…]</code></td></tr>`
* `L254`（JS）：`SP = [0.6, 1.2, 2.4]`
* `L257`：`sp = 8 * s` —— **间距（spacing）直接乘 8**

**它们不是线宽，是「走线间距」（spacing / 圈与圈的间隙）。** 证据链：

1. HTML 里这个词出现 20+ 次，**每一次都是「走线间距」**（`L26/29/93/94/101/102/113/124/131/134/136/139/140/149/198/219/221/236`），没有一处写"线宽"。
2. `SP = [0.6,1.2,2.4]` 通过 `sp = 8 * s` 变成画布上的 4.8/9.6/19.2px —— 那是**两条线之间的距离**，不是线本身的粗细。
3. 真正的线宽是 `style.css:206` 的 `stroke-width: 0.35`（+ `:212` 的 `0.5` 悬停加粗），HTML `L151` 也写着 `stroke-width: 0.35` 配 `vector-effect: non-scaling-stroke`。
4. `_specs/S20.md:32` 原文把两者分开写：「线宽 0.35px 单线」+「声场图例，量级用**走线间距**表达（间距 0.6px / 1.2px / 2.4px 三级…）」。

**所以机制句把两个量纲写进了同一句而没有区分**：「走线 0.35px 按 0.6/1.2/2.4px 三级分档」读起来像"线宽分三级"，实际是"线宽固定 0.35，间距分三级"。

**这不是"两个数据源矛盾"，是「机制句的表述歧义」。** 要修它属于**改机制句文本**（`mechanisms.mjs`，在 `_prompts/` 内但不在本次授权范围）且涉及**产品措辞裁决**，所以我**不动**。

**给 Lead 的裁决选项**（我不选）：
* (a) 改机制句为「走线 **0.35px** 固定，**间距**按 0.6/1.2/2.4px 三级分档」—— 一词之差（"线宽"→"间距"），消除歧义，不碰任何抽取逻辑。
* (b) 保持现状 —— 第 5 条给的是正确的线宽，机制句给的是正确的间距，AI 若懂"线距"就不会混。风险：AI 未必能区分。
* (c) `clean-dna` 增补 `spacings` 字段 —— 超范围，且新增一个提示词字段。

**另外**：`a08` 的 B 段（无漏讲）把 `0.6/1.2/2.4` 判为"不该进 lineWidths"，这是**正确的** —— 它们是 spacing。塞进线宽列表就是真正的"编造"。

---

## 3. Bug 3（附带）：`palette` 的抽取上限

### 3.1 存在性与行号

`prototypes/_build/collect-schemes.mjs`：

```js
483:   const pal = [];
484:   if (rec.bg) pal.push(rec.bg);
485:   if (rec.primary && !pal.includes(rec.primary)) pal.push(rec.primary);
486:   for (const h of fromSpec) { if (pal.length >= 4) break; if (!pal.includes(h)) pal.push(h); }
487:   rec.palette = pal;
```

**上限确认存在，行号 = `486`，阈值 = 4。** 任务书猜的 `if (pal.length >= 4) break` 与原文**逐字相同**。

### 3.2 是否影响 `prompts.js`：**不影响，两条链完全独立**

四条证据：

1. **`collect-schemes.mjs` 写的是 `_selection/data.js`**（`L495-496`），不写 `prompts.js`。
2. **`build-prompts.mjs` 只从 `data.js` 读两个字段**：`RISK`（`L39-49`）与 `REUSE`（`L75-82`）。grep 实测 `data.js` 在整个文件里只被打开 **2 次**（`L40`、`L76`）。
3. **`prompts.js` 的 palette 来自 `dna-clean.json`**：`build-prompts.mjs:261-273` 消费 `d.palette`，`d` 来自 `dna-clean.json`，其 palette 由 `clean-dna.mjs` 的 `pickPalette()`（`MAX = 7`）产生。
4. **实测色数分布**（`a11` 第 2 节）：`data.js` 里 = **3–4 色**（22/30 案恰好 4 色，8 案 3 色）；`prompts.js` 里 = **4–7 色**。**色数相同仅 8/30** —— 直接证明两者是独立抽取。

```
案    data.js(collect-schemes, 上限4)    prompts.js(clean-dna, 上限7)   同一份?
S02   4 色                               7 色                          否 ← 独立抽取
S19   4 色                               7 色                          否 ← 独立抽取
S17   3 色                               7 色                          否 ← 独立抽取
...
→ 色数相同 8/30
```

**结论**：`collect-schemes.mjs:486` 的 `>= 4` 上限会让**选型台的推荐卡与列表**少显示颜色（那是 `data.js` 的消费方），但对 `prompts.js` / 提示词**零影响**。

**我没有改它**（不在写入范围）。若 Lead 要修，改动是一行：`>= 4` → `>= 7`，并与 `clean-dna.mjs` 的 `MAX = 7` 对齐。

---

## 4. 发现的三件事（任务书没要求，但必须报）

### 4.1 `eachRule()` 原本把「条件组里的规则」上报两遍 —— Bug 2 的隐藏一半

改前的 `eachRule()`：

```js
if (/^@(media|supports|layer|container)\b/i.test(top.sel)) {
  eachRule(body, cb);          // ← 递归：条件组里的规则报一次（media 没传下去）
} else {
  cb(top.sel, body);           // ← 平扫：同一批规则**又**报一次，且 media=null
}
```

对 `familyRules` 无害（重复项被后者覆盖），但对**任何按条件过滤的消费端**是致命的：一个只在 `@media (max-width:1023px)` 成立的 `border-top-width: 7px`，会以 `media=null` 的身份混进"桌面真值"。

**实测**：S13 的 `border-top-width: 7px` 在 `@media (max-width:1023px)` 里（`style.css:667`），改前被当成桌面值 → S13 声称 `…、7px、…`。改成单遍后 7px 正确消失。

**这条值得记**：单纯"给 `eachRule` 加 media 参数"**不解决问题**，因为平扫那一遍的 `media` 是 `null`。我先只加了参数，跑出来 S13 仍是 `…7px…`，才发现双报。**根因不是"没传参数"，是"同一规则被报了两次"。**

### 4.2 `dna-raw.json` 的变化：源自我发现的上游滞后，最终由 B 在源头修掉

**我发现的现象**：`git diff` 显示 `dna-raw.json` 变了 16 行，涉及 3 个案的 5 个字段：

```
改变的字段: S07.families S13.families S13.shadowSample S13.dropSample S21.families
```

`families` 新增的串是：

```
"monospace（Chrome 实测，见 deliverables/69-exec/EXEC-mono-empty.md §2.3），\n
 下面把这条与其余可能因引擎而异的默认值一并还原成继承值：换标记，不换排版。 */\ncode{font-family:inherit"
```

**成因**：`S07/S13/S21` 的 `style.css` 里有一条**未闭合的块注释**（`/*` 后少了 `*/`）。`extract-dna.mjs` 的 `font-family` 正则 `([^;}]+)` 没剥注释，于是从那里一直吞到下一个 `;`。

**关键判断（当时）**：这个 CSS 缺陷在 `HEAD`（`03f6fd4`）里**已存在**，而 `dna-raw.json` 是 `cea8436`（2026-10-26）生成的 —— **比 CSS 旧 3 天**。所以：

* 仓库里提交的 `dna-raw.json` 是**过期快照**，从未按当前 CSS 重跑过。
* 我这次跑 `extract-dna.mjs`，才第一次把"当前 CSS"的真实抽取结果落盘。
* 这 16 行**不是我引入的**，是"把早已存在的上游事实显影出来"。

**影响面（当时）**：这 5 个字段（`families`/`shadowSample`/`dropSample`）**没有一个被 `clean-dna` 消费**。实测：`dna-clean.json` 的 `fonts`/`shadow` 与改前**逐字节相同**（`a07` 第 3 节）。

**后续（B 的处理，2026-10-30 00:1x）**：B 在 `extract-dna.mjs` 里加了源头修复——读 CSS 后先 `stripComments` 再抽：

```js
const cssRaw = existsSync(cssPath) ? readFileSync(cssPath, "utf8") : "";
// 谁能直接从源文件抽，谁就必须自己先洗干净
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "");
```

**这是正确的修法，而且比我建议的更彻底** —— 我原本只是"报给 Lead 说那三份 CSS 有未闭合注释、需要 `prototypes/S*` 写权限"，B 找到了在不碰 `prototypes/S*` 的前提下也能修的位置（在抽取器里剥注释是本来就该做的事，不管 CSS 有没有缺陷）。

**最终验证（我复核）**：

```
dna-raw.json 里含脏字体名的案: 0 (无)
dna-raw 改变的字段: S07.families S13.shadowSample S13.dropSample S16.dropSample S26.dropSample S30.dropSample
stats 变化: 无
```

`families` 只有 S07 一处变化（脏串被洗净），`*Sample` 是 `box-shadow`/`drop-shadow` 的取样列表（剥注释后顺序变了，值本身是原文）。**统计口径（`stats`）与改前完全一致**：`机制句 10/30`、`全直角 12/30`、`有字族 30/30` 等全部不变。

**残留提示**：`prototypes/S07|S13|S21/style.css` 里那三条**未闭合的块注释本身仍然存在**（在禁止写入范围内）。现在 `extract-dna.mjs` 剥注释后不再受害，但任何**新的**不剥注释的读取方仍会踩。建议 Lead 找人补上 `*/`。

### 4.3 `verify-prototype` 的既有 FAIL 与本次改动无关

改前改后 `Compare-Object` 输出**空**（逐字节相同）：`达标 29 / 不达标 1`，FAIL 的是 **S08 `palette-terracotta` + `font-count`**。既有缺陷，非本次引入。

---

## 5. 最终验证（合并态，最终快照：整链重跑后）

**验证前置**：`extract-dna.mjs` → `clean-dna.mjs` → `build-prompts.mjs` 全部重跑，**三个 exit 都是 0**：

```
extract=0   clean=0   build=0
=== 清洗后 ===
  有真实字体名的案：30/30
  有调色板的案：30/30
  平均紧凑载荷：195 字/案
=== prompts.js 已生成 ===
  体积：60.8 KB
  场景索引：44 个行业词，其中 unsupported 单列 29 个
```

日志：`logs/FINAL-extract.txt` / `FINAL-clean.txt` / `FINAL-build.txt`。

### 5.1 三个检查器

| 检查器 | exit | 结论 |
|---|---|---|
| `node prototypes/_build/verify-prototype.mjs --all` | **1** | `达标 29 / 不达标 1 / 共 30`。**与改前逐字节相同**（`Compare-Object` 空结果）—— 未受本次改动影响，FAIL 是既有的 S08（`palette-terracotta` + `font-count`）。 |
| `node prototypes/_build/check-stale.mjs` | **1** | `⚠️ 1 项陈旧：选型台(_selection) prompts.js 落后 2 分钟`。这是**预期内**：重渲染要跑 `node prototypes/_build/render-scheme.mjs _selection`（会改 `_selection` 下的截图与 report，**超出我的写入范围**）。<br>（中间一度报的是 `_prompts/dna-clean.json` 落后于 `dna-raw.json` —— 因为 B 改了 `extract-dna.mjs` 并重跑抽取但没重跑清洗。**我已按授权补跑 `clean-dna.mjs` + `build-prompts.mjs`**，该项已消。） |
| `node prototypes/_build/check-docs.mjs` | **0** | `README.md: 0 FAIL / 1 WARN / 12 PASS`。WARN 是 `nums/prompt-len` 小幅漂移（均 <1%），见 §5.5。 |

### 5.2 提示词可被 `prompt-copy.js` 消费：两条路径都跑了

**(a) vm 装载**（`a09`，exit **0**）：`node:vm` + 最小 document 桩，按浏览器顺序 `data.js → prompts.js → prompt-copy.js` 装入，调 `window.buildStylePrompt`。

**(b) 真实 Chrome CDP**（`a10`，exit **0**）：本地静态服务 + `tools/taste-skill/…/lib/cdp.mjs` 启动 1440×1000 Chrome，打开 `_selection/index.html`，在页面里调 `window.buildStylePrompt('S01')` / `('S25')`（另加 S09/S20/S27）。

```
=== 页面环境 ===
  {"hasBuild":"function","hasPrompts":true,"nSchemes":30,"nPrompts":30}

S01  长度 1773 ／ 第 5 条线宽 "1px、3px" ✓ ／ 无 var(-- / undefined / NaN
S09  长度 1645 ／ "2px、3px、3.5px、3.6px" ✓
S25  长度 1828 ／ "1px、1.2px、2px、3px" ✓
S20  长度 1789 ／ "0.2px、0.35px、0.5px、1px、3px" ✓   ← 当时 B 的纹理过滤还没加
S27  长度 1852 ／ "0.8px、1.6px、1.8px、3px、3.6px" ✓

vm vs 浏览器 S01：VM 1773 字 / 浏览器 1773 字 → 逐字相同 ✓
vm vs 浏览器 S25：VM 1828 字 / 浏览器 1828 字 → 逐字相同 ✓
=== 汇总 === ✓ 全部断言通过
```

**30 案批量**（`a09`，合并态最终版）：`min 1799 / median 1973 / max 2123`，无 `var(--)` / `undefined` / `NaN` / `[object`，第 5 条线宽行与 `dna-clean.json` **逐值一致**。

> 注：`a09` 的长度窗口原设 1500–2100，因 B 新增「第 6 条」使每案 +~100 字而误报 2 案（S23/S29）。已放宽到 1500–2300 —— **放宽的是"明显异常"判据，不是放弃断言**：具体区间由 `check-docs` 的 `nums/prompt-len`（读 README 承诺值）负责。

### 5.3 30 条提示词 diff（改前 vs 改后，逐案）

**结构性 diff**（递归比对 `prompts.js` 每个字段）：

```
h1Size 变化 7 条；lineWidths 变化 21 条
palette / fonts / radius / radiusBare / shadow / mechanism / primary：全部 0 变化
```

**正文长度变化**（`a07` 第 4 节）：

| 案 | 旧 | 新 | 增幅 | 案 | 旧 | 新 | 增幅 |
|---|---|---|---|---|---|---|---|
| S01 | 1835 | 1929 | +94 | S16 | 1848 | 1944 | +96 |
| S02 | 1847 | 1944 | +97 | S17 | 1903 | 2025 | **+122** |
| S03 | 1808 | 1916 | +108 | S18 | 1910 | 2013 | +103 |
| S04 | 1720 | 1822 | +102 | S19 | 1991 | 2087 | +96 |
| S05 | 1743 | 1839 | +96 | S20 | 1804 | 1900 | +96 |
| S06 | 1814 | 1916 | +102 | S21 | 1967 | 2070 | +103 |
| S07 | 1727 | 1829 | +102 | S22 | 1954 | 2050 | +96 |
| S08 | 1765 | 1868 | +103 | S23 | 2023 | 2123 | +100 |
| S09 | 1699 | 1799 | +100 | S24 | 1939 | 2047 | +108 |
| S10 | 1769 | 1871 | +102 | S25 | 1875 | 1985 | **+110** |
| S11 | 1869 | 1973 | +104 | S26 | 1941 | 2037 | +96 |
| S12 | 1992 | 2088 | +96 | S27 | 1912 | 2020 | +108 |
| S13 | 1823 | 1921 | +98 | S28 | 1903 | 2005 | +102 |
| S14 | 1806 | 1909 | +103 | S29 | 2000 | 2102 | +102 |
| S15 | 1869 | 1969 | +100 | S30 | 1963 | 2069 | +106 |
| | | | | **合计** | | | **+3051** |

**为何每案都涨 ~96–122 字**：因为 B 新增的「第 6 条 字号」（约 +96 字/案）是**无条件**出现的，与本案的 `lineWidths`/`h1Size` 是否变化无关。**扣掉这 ~96 字的基线增量后，真正的变化量就是 `lineWidths` 的 ±N 个值**（S17 +26、S25 +14、S24 +12、S27 +12、S30 +10 等）。

**"没有我没注意到的意外变化"**：字段级只有 29 条（`h1Size` 7 + `lineWidths` 21，有 1 案两者都变），其它字段 0 变化。正文的 ~96 字/案是**单一新增行**（第 6 条）造成的，其内容与数值已由 `a14` 逐案核对（见 §6.3）。

### 5.4 文本卫生

```
改前含 var(--：无
改后含 var(--：无  ✓
改后含 undefined/NaN：无  ✓
```

### 5.5 `check-docs` 的 WARN：具体是哪一项、要改哪一行

**报的是 `nums/prompt-len`**（`check-docs.mjs:655-700`）：

```
⚠ nums/prompt-len  提示词长度小幅漂移，建议更新（容差 3%）：区间下限 写 1793，此刻实测 1799；
   区间上限 写 2113，此刻实测 2123；中位 写 1968，此刻实测 1973
```

**为什么是 WARN 而非 FAIL**：`DRIFT = 0.03`，三处偏差 +0.33% / +0.47% / +0.25%，均 <1%，所以降级为 WARN。**这不是说谎，只是文档该更新了。**

**要改的仍是 `README.md:80`**，把 `1793–2113` / `1968` 改成 `1799–2123` / `1973`。**我没有改**（README 超出写入范围）。

**⚠️ 这个数字还会动**：B 仍在编辑 `prompt-copy.js`（00:07 最后一次）。建议等 B 收工后一次性更新，不要每轮改一次。

**另需确认**：`README-EN.md` grep `1793|2113|1968` **零命中** —— 英文版没写这三个数，只需改中文版一行。

---

## 6. 改动归属（重要：本轮是两个 Agent 并发改同一条链）

### 6.1 已跟踪文件的最终改动清单

```
$ git rev-parse HEAD
03f6fd47e364c43dffdf240f3eb298987f840625        ← 未变，我没有 commit

$ git status --porcelain  （已跟踪文件）
 M prototypes/_prompts/build-prompts.mjs
 M prototypes/_prompts/clean-dna.mjs
 M prototypes/_prompts/dna-clean.json
 M prototypes/_prompts/dna-raw.json
 M prototypes/_selection/.inspect/desktop-fold.jpg
 M prototypes/_selection/.inspect/desktop-page-01.jpg
 M prototypes/_selection/.inspect/report.json
 M prototypes/_selection/.inspect/tablet-page-01.jpg
 M prototypes/_selection/prompt-copy.js
 M prototypes/_selection/prompts.js
 M prototypes/_selection/self-gate.js
```

| 文件 | 谁改的 | 在**我**的授权范围内？ | 说明 |
|---|---|---|---|
| `_prompts/clean-dna.mjs` | **A + B 混合** | ✅ | A：`eachRule` 单遍重写、`conditionApplies`、`topVars`、`declsOf`/`widthNumbers`/`WIDTH_DECL_RE`、`lineWidthVerdict` 重写、`h1SizeVerdict`、`lineWidthsWhy`/`h1SizeWhy` 留档<br>B：`selectorIsInteractiveOnly`、状态类识别、JS `stroke-width` 扫描、纹理容器过滤、`lineWidthsInteractive`、`bodySize` |
| `_prompts/dna-clean.json` | 重跑生成 | ✅ | 产物 |
| `_prompts/dna-raw.json` | 重跑生成 | ✅ | 产物（脏字体名已由 B 的 `extract-dna` 修复洗净，§4.2） |
| `_prompts/extract-dna.mjs` | **B** | ✅（在我的范围内，但我判断"不改"） | +16 行：读 CSS 后先 `stripComments`。**这是对我 §4.2 发现的问题的正确修复** —— 我原本只提议"报给 Lead"，B 找到了不碰 `prototypes/S*` 也能修的位置 |
| `_prompts/build-prompts.mjs` | **B** | ✅（在我的范围内，但我没改） | +12 行 |
| `_selection/prompts.js` | 重跑生成 | ✅ | 产物 |
| `_selection/prompt-copy.js` | **B** | ❌ **超出我的授权** | +158 行：第 6 条字号、措辞「不要自创第三级」→「不要自创新值」 |
| `_selection/.inspect/*` | **B** | ❌ 超出 | 重渲染产物：report.json 改了，11 个 jpg 被删除（`D`） |
| `_selection/self-gate.js` | **B** | ❌ 超出 | 2 行 |
| `README.md` / `README-EN.md` | **B** | ❌ 超出 | 各 1 行（prompt-len 数字） |
| `_build/check-stale.mjs` | **B** | ❌ 超出 | +59 行 |

**我没有改的**：`prototypes/S*`（0）、`templates/`（0）、`tools/`（0）、`README*`（0 —— B 改的）、`prototypes/_build/`（0 —— B 改的）、`_selection/` 下除 `prompts.js` 外的任何文件（0 —— B 改的）。

**⚠️ 需要 Lead 注意的越界**：`_selection/prompt-copy.js`、`_selection/.inspect/*`、`_selection/self-gate.js`、`README*.md`、`_build/check-stale.mjs` 都被 B 改了，**全部在我的授权清单之外**。这不代表 B 做错了（B 可能有更宽的授权），但如果 Lead 的意图是"两人各守一块"，这些改动需要单独审。

### 6.2 并发冲突的完整时间线（供 Lead 复盘）

| 时间 | 事件 |
|---|---|
| 22:44 | A 开工，基线 `03f6fd4`，备份 6 个文件到 `backup-a/` |
| 22:45–23:10 | A 跑 6 个只读探针（a01–a06），定位两个 bug |
| 23:15–23:25 | A 改 `clean-dna.mjs`（4 轮迭代，含发现 `eachRule` 双报），跑通整链，`prompts.js` 生成成功 |
| 23:25 | **A 的 `prompts.js` 落盘**（我的完整版本） |
| 23:25–23:42 | A 跑 a07–a13 + CDP + 三个检查器，写报告（493 行） |
| 23:41 | **B 开始改同一个 `clean-dna.mjs`**（41645 → 60806 字节） |
| 23:42 | A 跑全套探针，发现 `a08` 8 案"漏讲" —— **实为 B 已改数据、我的探针读的是新数据** |
| 23:45 | A 发现 `prompts.js`（我的）与 `dna-clean.json`（B 的）**9/30 不一致**，发告警给 Lead |
| 23:48–23:50 | B 重跑 `build-prompts.mjs`，两者恢复一致 |
| 23:55 | B 改 `prompt-copy.js` 加「第 6 条 字号」 |
| 00:00 | A 实测第 6 条 **25/30 案偏低 36–60%**（clamp 下限当上限），发紧急告警 |
| 00:04 | B 修正第 6 条为按 1440 实算 |
| 00:06 | A 做最终验证快照（本报告 §5） |
| 00:12 | A 修正 `a08` 探针的两处口径错误（JS 描边该算、纹理该排），全过 |

**我犯的两个错误（自我披露）**：
1. 我在 23:45 的告警里说"B 单方面定案交互态线宽、8 案逻辑不一致" —— **这是我误读**。实际代码 `clean-dna.mjs:698-701` 是「`interactive.push()` 留档 + `note()` 照常入列」，即**保留数值 + 另标出处**，正是 Lead 裁决要的。
2. 我的 `a08` 探针第一版把 `<script>` 整段剥掉、又把 `<pattern>` 里的值算进真值 —— 导致 S03 的 1.5 被误判"编造"、S20 的 0.2 被误判"漏讲"。**那两次 exit 1 是探针的错，不是数据的错。** 已修正（§5.2 的说明）。

### 6.3 B 的「第 6 条 字号」：从严重 bug 到修正的过程（需 Lead 复核）

**中间版本的缺陷**（`a14` 量测，已修复但值得记录）：

```js
var h1 = parseFloat(String(d.h1Size || "").match(/(\d+(?:\.\d+)?)px/)?.[1] || "");
```

`h1Size` 在 28/30 案里是 `clamp(46px, 6vw, 88px)`，这个正则抓的是**第一个数 = clamp 下限**。

| 案 | h1Size 原文 | 提示词说 | 1440 实际 | 偏差 |
|---|---|---|---|---|
| S10 | `clamp(32px, 5.55vw, 80px)` | **32px** | 79.92px | **−60%** |
| S11 | `clamp(46px, 7.4vw, 106px)` | **46px** | 106px | **−56.6%** |
| S28 | `clamp(40px, 6.4vw, 92px)` | **40px** | 92px | **−56.5%** |
| S01 | `clamp(48px, 6.67vw, 96px)` | **48px** | 96px | −50% |

**尤其有害**：这一条的目的（B 的注释写的）是「解决 H1 只有原型的 26–48%，缺的是'最大标题敢用多大'」—— 即让 AI 把标题**做大**。但它给的是下限，AI 照做只会做出**更小**的标题，**与修复目标完全相反**。

**当前版本**（00:04 后）已改为按 1440 实算，并在 `a14` 复测中 **0/30 偏差 >5%**：

```
6. 字号：正文约 16px；最大标题要压到正文的 6 倍（约 96px）。比这更小就撑不出这个版式
   ——这是本案最容易被做塌的一处。中间层级你按内容需要分，但**最大那一档必须够大**。
```

S01 说 96px，`a11` 算 1440 实际 = 96px ✓。S10 说 80px，实际 79.92px ✓。

**另外**：`d.bodySize` 字段在 `dna-clean.json` 里**曾不存在**（B 后来在 `clean-dna.mjs` 里补了）。在补上之前 `var body = parseFloat(...)` 恒为 NaN，「倍率」那条路径是死代码。

### 6.4 交互态线宽：Lead 已裁决"保留"

`clean-dna.mjs:679-697` 的注释写着「2026-10-30 Lead 裁决：**保留**」，三条依据：

1. 30/30 案的 `:focus-visible` 都定义了 outline，且用各案自己的主色（S01 `3px var(--red)`、S09 `3px var(--ink)`、S25 `3px var(--spot-b)`、S13 `2px var(--gold)`）—— 有意的设计决策。
2. 提示词要求 AI 做**键盘可用**的页面。抹掉 focus 环线宽等于告诉 AI「这个案只用 1px 和 2px」，而用户按 Tab 时真的会看到 3px —— 提示词与实现不一致。
3. S25 是最直接反例：排除后 `lineWidths` 变成 `1px、1.2px、2px`，而规格写明核心线宽是 3px（只在 focus 环上）。

实现是「保留数值 + 另标出处」：`lineWidths` 照常出现，`lineWidthsWhy` 注明「（交互态）」，另有 `lineWidthsInteractive` 字段归档。**两边的信息都不丢。** 我的 `a08` 已按此口径验证（A 段 0/30）。

---

## 7. 探针清单（全部可重跑）

目录：`deliverables/70-exec/probes-a/`

| 探针 | 回答什么问题 | 最终 exit |
|---|---|---|
| `a01-h1size-candidates.mjs` | 旧正则命中了哪条规则？每案 h1 字号候选？`--fs-h1` 定义在哪、有无媒体覆盖？ | 0 |
| `a02-linewidth-sources.mjs` | 每案线宽分别来自 CSS 顶层/CSS 媒体/HTML 属性/内联/`<style>`？ | 0 |
| `a03-css-structure.mjs` | 30 案花括号是否配平？每个 `@media` 的行号范围与内含覆盖？ | 0 |
| `a04-media-root-vars.mjs` | 哪些案在 `@media` 里覆盖 `:root`？会不会影响 palette/radius/shadow/fonts？ | 0 |
| `a05-linewidth-media-split.mjs` | 哪些线宽值**只在**媒体里（窄屏专用）？有 `min-width` 里的线宽吗？ | 0 |
| `a06-html-side-scan.mjs` | HTML 里 `stroke-width` 的分布与误报面（注释/脚本/data-URI） | 0 |
| `a07-diff-before-after.mjs` | 改前 vs 改后：字段级 diff + 正文长度 + 文本卫生 | 0 |
| `a08-verify-values.mjs` | **独立复算**：A 无编造 / B 无漏讲 / C h1Size 可复算 | **0** |
| `a09-build-prompt-eval.mjs` | vm 里跑 `buildStylePrompt` 30 案，断言长度/卫生/线宽行一致 | **0** |
| `a10-cdp-build-prompt.mjs` | 真实 Chrome CDP 打开选型台，页面里调 `buildStylePrompt`，与 vm 版逐字对照 | 0 |
| `a11-h1-desktop-and-palette.mjs` | ① 各断点 h1 在 1440 下的实际 px；② `data.js` 与 `prompts.js` 的 palette 是否同源 | 0 |
| `a12-h1priority-collisions.mjs` | 30 案里有没有「多个 h1 优先级阶梯同时有字号」？ | 0（**0 案**） |
| `a13-s25-coupling.mjs` | 验证"加 HTML 扫描"与"去 0.5px 合并"是否强耦合 | 0（只加半套仍缺 1.2） |
| `a14-clause6-h1-accuracy.mjs` | 第 6 条声称的字号 vs 1440 实际值 | **0**（B 修正后 0/30 偏差） |

日志：`deliverables/70-exec/logs/`（`before-*`、`after-*`、`final-*`、`final2-*`、`merged-*`、`cdp-result.json`）。

---

## 8. 结论与留给 Lead 的四件事

**两个 bug 都修好且经独立复算验证**：`h1Size` 30/30 是数值、`lineWidths` 30/30 无编造无漏讲、提示词 30/30 可被 `prompt-copy.js` 消费且无 `var(--)`/`undefined`。

**留给 Lead 的四件事**（我都没有动）：

1. **`README.md:80` 的数字**：`1793–2113` / `1968` → `1799–2123` / `1973`（§5.5）。这是 `check-docs` 唯一的 WARN，且数字仍在被 B 的编辑推动，**建议等 B 收工后一次性更新**。
2. **`_selection/.inspect/report.json` 需要重渲染**：`node prototypes/_build/render-scheme.mjs _selection`，否则 `check-stale` 会一直报陈旧（§5.1）。这会改 `_selection` 下的截图与 report。
3. **S20 机制句的措辞**（§2.6）：`mechanisms.mjs` 的 S20 把「走线间距 0.6/1.2/2.4px」和「线宽 0.35px」写进同一句而无区分，读起来像"线宽分三级"。**这是表述歧义，不是数据矛盾**，改法是一词之差。
4. **两个 Agent 的写入范围越界**：`prompt-copy.js`、`build-prompts.mjs`、`_selection/.inspect/*`、`_selection/self-gate.js` 都被 EXEC-B 改了，其中前两者不在**我的**授权清单里。如果 Lead 的意图是"只有 A 动 `_prompts/`、B 只读"，那么 B 的改动需要单独审。**建议合并前先明确谁对 `prompt-copy.js` 负责。**

**另需知会的既有缺陷**（非本轮引入）：`prototypes/S07|S13|S21/style.css` 各有一条**未闭合的块注释**，会污染任何"不剥注释就读 CSS"的工具（§4.2）。修它需要 `prototypes/S*` 的写权限。
