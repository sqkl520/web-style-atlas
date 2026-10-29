# 线宽缺陷的具体 patch 建议

> 交付：`deliverables/69-audit/PATCH-linewidth.md`
> 基线：`git rev-parse HEAD` = **`9d842c7ae58e9772b965a37d118c69726ea1dfbd`**
> 本文**只给 diff 文本，不实际应用**。我没有改 `prototypes/`、`templates/`、`README*`、`tools/` 下任何文件，也没有 commit。

---

## 0. 开工基线与并发改动

```
$ git rev-parse HEAD
9d842c7ae58e9772b965a37d118c69726ea1dfbd

$ git status --porcelain   （节选，与本任务相关的部分）
 M prototypes/_selection/.inspect/desktop-fold.jpg
 M prototypes/_selection/.inspect/report.json
 M prototypes/_selection/app.js
 M prototypes/_selection/self-gate.js
 M prototypes/_selection/style.css
```

`prototypes/_selection/` **确实被改了**（任务书要求这里重跑 dump 并比对 SHA256）。我按上一轮的做法重跑并比对：

| 文件 | 上轮 SHA256 | 本轮 SHA256 | 结论 |
|---|---|---|---|
| `dump30-default.txt` | `8FC888BAB1855BAB515E720569CD56CB4FFF750CADA06FC124FB5B8E18C5F987` | `8FC888BAB1855BAB515E720569CD56CB4FFF750CADA06FC124FB5B8E18C5F987` | **逐字节相同** |
| `dump30.json` | `3E2BF967…72CDD` | `A4EDDA53…374C` | 仅 `dumpedAt` 时间戳不同 |

**结论**：`_selection` 的改动（`app.js` / `self-gate.js` / `style.css`）**不影响提示词正文**。原因是提示词来自 `prompts.js`（tracked 构建物）而非运行时 CSS。三个权威文件的 blob 哈希可复核：

```
prompts.js     75a5b1d06a06c670a0bde8375554c9402ecd4dc4
prompt-copy.js cb4007500050b34b2e272915cb308f2131ea0342
dna-clean.json 50babe3eee07036ce95ef7fe05881c09e829f94f
clean-dna.mjs  9438d464ee44af4c67be871b675e0982f6438bd6
build-prompts 2bddff2470387b9c6721f5cf9ffa4ac511785f4b
```

我还验证了三层数据一致性（`t1-source.json`）：**`dna-clean.json` → `prompts.js` → 运行时 dump 三方 30/30 全等，无构建滞后**。

---

## 1. `lineWidths` 是怎么抽出来的：函数名 + 行号

任务书问「`collect-schemes.mjs` 还是 `deliverables/99-scratch/build-prompts.mjs`？两个都要查」。**答案是：两个都不是产生它的地方。** 这是本任务第一个需要纠正的前提。

| 环节 | 文件 | 函数 / 行号 | 是否产生 `lineWidths` |
|---|---|---|---|
| ① 抽取 | `prototypes/_prompts/clean-dna.mjs` | **`lineWidthVerdict(cleanCss, vars)`，函数定义 L452，正则 L454，裸数字分支 L475-481，档位收窄 L495-500，返回 L501** | ✅ **唯一产生地** |
| ② 变量字典 | `prototypes/_prompts/clean-dna.mjs` | **L567-568**（`const vars = {}` / `for (const d of decls) vars[d.name] = ...`） | 决定 `var(--x)` 展开成什么 |
| ③ 落盘 | `prototypes/_prompts/clean-dna.mjs` | **L487**（`lineWidths: lines,`）→ 写 `dna-clean.json` | 中转 |
| ④ 搬运 | `prototypes/_prompts/build-prompts.mjs` | **L307**（`lineWidths: d.lineWidths,`）→ 写 `prompts.js`（L358） | 纯搬运，不改值 |
| ⑤ 渲染成句 | `prototypes/_selection/prompt-copy.js` | **L456**：`"5. 线宽只用这几级：" + d.lineWidths + "，不要自创第三级。"` | ✅ **唯一产生文案处** |
| ⑥ （次级）机制句里的线宽 | `prototypes/_selection/prompt-copy.js` | **L283**：`facts.push("线宽只分 " + d.lineWidths + " 这几级")` | 仅当该案无 `mechanism` 时 |
| ✗ `collect-schemes.mjs` | `prototypes/_build/collect-schemes.mjs` | L83 / L105 只抽 `fill`/`stroke` **颜色**，不抽宽度 | ❌ 无关 |
| ✗ `99-scratch/build-prompts.mjs` | `deliverables/99-scratch/build-prompts.mjs` | L214 同样是纯搬运 | ❌ 无关 |
| ✗ `extract-dna.mjs` | `prototypes/_prompts/extract-dna.mjs` | L129 的 `lineWidths` 是**废弃的上游版**（只 `/border: ([0-9.]+)px/`），已被 `clean-dna` 覆盖 | ❌ 历史遗留 |

### 1.1 `lineWidthVerdict()` 现状（`clean-dna.mjs:452-502`）

```js
452: function lineWidthVerdict(cleanCss, vars) {
453:   const widths = new Set();
454:   const re = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
455:   let m;
456:   while ((m = re.exec(cleanCss))) {
457:     let v = resolveVars(m[1], vars, 0);
458:     v = v.replace(/calc\(\s*([0-9.]+)px\s*\*\s*([0-9.]+)\s*\)/g, ...);   // calc(Npx * M)
461:     v = v.replace(/calc\(\s*([0-9.]+)\s*\*\s*([0-9.]+)px\s*\)/g, ...);   // calc(M * Npx)
464:     const pxRe = /([0-9.]+)px/g;
466:     while ((q = pxRe.exec(v))) { const n = parseFloat(q[1]); if (n > 0) widths.add(round2(n)); }
475:     if (/stroke-width/i.test(m[0])) {
476:       const bare = v.match(/^\s*([0-9.]+)\s*$/);        // SVG 裸数字
478:       if (bare) { const n = parseFloat(bare[1]); if (n > 0) widths.add(round2(n)); }
481:     }
482:   }
483:   const list = [...widths].sort((a, b) => a - b);
484:   if (!list.length) return "无边框线条（全站不画描边，只用色块与留白分隔）";
495:   const fine = list.filter(w => w < 1);
496:   const coarse = [];
497:   for (const w of list.filter(w => w >= 1)) {
498:     if (!coarse.some(c => Math.abs(c - w) < 0.5)) coarse.push(w);   // ← 0.5px 去重
499:   }
500:   const finalList = fine.concat(coarse).sort((a, b) => a - b);
501:   return finalList.map(n => n + "px").join("、");
502: }
```

### 1.2 它混了几种量纲（这正是任务书说的"混了"）

| 来源 | 示例 | 真实量纲 | 能否写成 `Npx` 给 AI 直接用 |
|---|---|---|---|
| `border` / `outline` 简写 | `border: 2px solid var(--ink)` | **CSS 绝对 px** | ✅ 可以 |
| `border-*-width` | `border-top-width: 3px` | CSS 绝对 px | ✅ 可以 |
| CSS `stroke-width: 0.8`（裸数字） | `.ink--base{stroke-width:0.8}` | **SVG 用户单位**，随 `viewBox` 缩放 | ⚠️ 只在 scale=1 时等于 px |
| CSS `stroke-width: 1.2px` | `.ink--frame{stroke-width:var(--ink12)}` | SVG 用户单位（带 px 也是用户单位，除非 `non-scaling-stroke`） | ⚠️ 同上 |
| HTML 内联 `stroke-width="1.6"` | `<symbol id="g-seal" stroke-width="1.6">` | SVG 用户单位 | ❌ **完全没被抽到** |
| data-URI 内联 | `stroke-width=5.66`（S12 的排线底纹） | SVG 用户单位 | ❌ 没被抽到 |
| `calc(var(--mis) * 2)` | S27 `.fault__line` | 展开后是 CSS px | ✅ 现有代码能算 |
| `@media` 内的 `:root` 覆盖 | S27 `L521` `--mis: 1.2px` | **只在小屏成立** | ❌ 被当成全站值 |

---

## 2. 逐案：声称 vs 实际 + 具体 patch

> 真值定义（本文统一）：
> - **桌面真值** = 顶层规则（不在 `@media` 内）里作者写的声明，`var()` 展开、`calc()` 算掉，单位折算到屏幕 px（`declared × rect.width / viewBox.width`）。
> - **仅窄屏** = 只出现在 `@media` 里的值，1440px 审查视口下不生效。
> - 所有取证脚本：`t1-evidence5.mjs` / `t1-truth-units.mjs` / `t1-strict.mjs` / `t1-final-sim.mjs`。

### 2.0 五案总表（全部自己跑出来）

| 案 | 提示词声称 | 桌面真实（CSS border） | 桌面真实（SVG 描边） | 仅窄屏 | 判决 |
|---|---|---|---|---|---|
| **S09** | `2px、3px、3.5px` | `2, 3` | `3.5, 3.6` | — | **漏讲 3.6** |
| **S10** | `1.25px、2px` | `1.25, 1.5, 2` | `1.25` | — | **漏讲 1.5** |
| **S15** | `0.5、0.8、1、1.7、3px` | `2, 3` | `0.5, 0.8, 1, 1.2, 1.4, 1.7, 2` | `1.36` | **漏讲 1.2/1.4/2**；且把 SVG 值与 CSS 值混成一句 |
| **S25** | `3px` | `3`（仅 `:focus-visible` outline） | `1, 1.2, 2` | — | **漏讲 1/1.2/2**；`3px` 不是装订线 |
| **S27** | `1.2px、2.4px、3px` | `1.8, 3.6` | `0.8, 1.6, 3` | `1.2, 2.4` | **1.2/2.4 是窄屏值**；漏讲 0.8/1.6/1.8；3.6 未折算 |

**注意 S27 的 `3.6`**：提示词写 `2.4px`，而桌面真相是 `calc(var(--mis) * 2)` = `1.8 × 2` = **`3.6px`**。因为 `--mis` 被媒体查询的 `1.2px` 覆盖，`calc` 算出 `2.4`。**同一个公式，两套输入，两个答案。**

---

### 2.1 S09 `S09-batik-price-board`

**声称**：`5. 线宽只用这几级：2px、3px、3.5px，不要自创第三级。`

**实际**（`t1-evidence5.txt` 原始行号）：

```
L222  outline        3px solid var(--ink)      → [3]    ⓐ.btn:focus-visible
L231  border         2px solid var(--ink)      → [2]    ⓐ.cat
L237  outline        3px solid var(--blue)     → [3]    ⓐ.cat:focus-visible
L282  stroke-width   3.5                       → [3.5]  ⓐ#stroke-outer
L283  stroke-width   2                         → [2]    ⓐ#stroke-inner
L368  stroke-width   3.6                       → [3.6]  ⓐ.ico path   ← 提示词没有
```

**缺陷性质**：`3.6` 是 `.ico path` 的图标描边（`viewBox` 24），是 **SVG 用户单位**，被 `narrow()` 的 0.5px 去重**部分**吞掉了吗？不是——`3.5` 与 `3.6` 差 0.1 < 0.5，所以 `3.6` 被**合并进 3.5**（`:498`）。这是 `narrow()` 造成的漏讲，不是抽取失败。

**patch（改 `clean-dna.mjs:495-500`）**：

```diff
--- a/prototypes/_prompts/clean-dna.mjs
+++ b/prototypes/_prompts/clean-dna.mjs
@@ -492,11 +492,17 @@
    * 不同量级的分级，不是随手取的）。**所以不做聚类**，改为按"档位间距是否够大"截断：
    * 保留所有 < 1px 的细描边（它们承担风格签名），再对 ≥ 1px 的按 0.5px 粒度去重。
+   *
+   * ⚠️ 2026-10-29 第五次修：**去掉 0.5px 去重**。
+   * 去重的本意是"人眼分辨不出 0.1px 差别"，但它把**不同元素上的不同线宽**也合并了：
+   *   S09 的 3.5(#stroke-outer) 与 3.6(.ico path) 是两个不同的描边，被合成一个；
+   *   S25 的 1 与 1.2、S28 的 1 与 1.2、S30 的 1.6 与 2 同样被吞。
+   * 这不是"简化"，是**把说明书改错**——AI 照 3.5 画，而原型的图标是 3.6。
+   * 而且"人眼分辨不出"这个前提本身不成立：这些值在 SVG 里是用户单位，
+   * 经过 viewBox 缩放后差值会被放大（24 单位缩到 20px 时 0.1 单位 = 0.083px，
+   * 但缩到 200px 时 = 0.83px，肉眼可见）。
+   * 所以改成：**只去掉完全相等的重复，不做近似合并**。
    */
-  const fine = list.filter(function (w) { return w < 1; });
-  const coarse = [];
-  for (const w of list.filter(function (w) { return w >= 1; })) {
-    if (!coarse.some(function (c) { return Math.abs(c - w) < 0.5; })) coarse.push(w);
-  }
-  const finalList = fine.concat(coarse).sort(function (a, b) { return a - b; });
-  return finalList.map(function (n) { return n + "px"; }).join("、");
+  /* 只按精确值去重（round2 已经保证没有浮点噪声），保持升序。 */
+  const finalList = [...new Set(list)].sort(function (a, b) { return a - b; });
+  return finalList.map(function (n) { return n + "px"; }).join("、");
```

**改完后 S09 的线宽行**（(a)/(b) 档，即只改抽取不改语义）：

```
5. 线宽只用这几级：2px、3px、3.5px、3.6px，不要自创第三级。
```

**风险**：S09 从 3 档变 4 档，但 `不要自创第三级` 与"列了 4 档"仍然自相矛盾 —— 这句必须靠 (b) 档一起修（见 §3）。

---

### 2.2 S10 `S10-grid-versus-sheet`

**声称**：`5. 线宽只用这几级：1.25px、2px，不要自创第三级。`

**实际**：

```
L104  stroke-width   var(--reg-w)        → 1.25px  [1.25]  ⓐ.reg
L117  border-bottom  2px solid var(--ink)→ 2px     [2]     ⓐ.masthead
L197  stroke-width   var(--column-rule)  → 1.25px  [1.25]  ⓐ.plate-rules line
L222  border-bottom  var(--column-rule) solid var(--grey-soft) → 1.25px  ⓐ.grid-table tbody td
L225  border-left    var(--column-rule) solid var(--grey)      → 1.25px  ⓐ.grid-table th + th
L234  border-left    1.5px solid var(--paper)                  → 1.5px   ⓐ.grid-table th:nth-child(5)  ← 提示词没有
L270  border-right   var(--reg-w) solid var(--ink)             → 1.25px  ⓐ.cell-no::after
L271  border-bottom  var(--reg-w) solid var(--ink)             → 1.25px  ⓐ.cell-no::after
```

**缺陷性质**：`1.5` 是"表格第 5 列分隔线"的宽度。`1.25` 与 `1.5` 差 0.25 < 0.5 → 被 `narrow()` 合并。**同一个去重 bug。**

**patch**：与 S09 同一处（`clean-dna.mjs:495-500`），不重复贴。

**改完后 S10 的线宽行**：

```
5. 线宽只用这几级：1.25px、1.5px、2px，不要自创第三级。
```

**风险**：S10 从 2 档变 3 档。`不要自创第三级` 在这里**恰好自洽**（3 档），所以 (a) 档单独修也能让 S10 通过话术检查 —— 但"3 档"是巧合，不是设计，见 §3 的讨论。

---

### 2.3 S15 `S15-fishery-floor-ledger`（最复杂的案）

**声称**：`5. 线宽只用这几级：0.5px、0.8px、1px、1.7px、3px，不要自创第三级。`

**实际**（这是**唯一一个 CSS border 与 SVG 描边各成体系**的案）：

```
CSS border/outline：
L65   border-bottom  3px solid var(--pencil)   → [3]   ⓐ.strip
L72   outline        2px solid var(--paper)    → [2]   ⓐ.strip__item--fault.is-lit
L119  border         2px solid var(--graphite) → [2]   ⓐ.btn--ghost
L245  border-left    3px solid var(--pencil)   → [3]   ⓐ.plan-notes li
L250  border-left    3px solid var(--pencil)   → [3]   ⓐ.layers li
L258  border         2px solid var(--graphite) → [2]   ⓐ.yb
L271  border-left    3px solid var(--pencil)   → [3]   ⓐ.folds details
L292  border-left    3px solid var(--pencil)   → [3]   ⓐ.alert
L297  outline        2px solid var(--pencil)   → [2]   ⓐ.trace-error.is-lit .alert
L301  border-left    3px solid var(--pencil)   → [3]   ⓐ.packet
L306  border-bottom  2px solid #C3C9C7         → [2]   ⓐ.zones__table th, td
L312  border-bottom  2px solid #C3C9C7         → [2]   ⓐ.matrix th, td
L319  border-bottom  2px solid #C3C9C7         → [2]   ⓐ.weights th, td
L327  border-left    3px solid var(--pencil)   → [3]   ⓐ.empty
L353  border-left    3px solid var(--pencil)   → [3]   ⓐ.spec__cell
L356  border-top     3px solid var(--pencil)   → [3]   ⓐ.degrade
L424  stroke-width   1.4                       → [1.4] ⓐ.hot .edge
L425  stroke-width   1.2                       → [1.2] ⓐ.hot .ring
L426  stroke-width   calc(0.8px * 1.7)         → [1.36]ⓐ.plate use
L427  stroke-width   2px                       → [2]   ⓐ.ink--frame, .ink--c3
L428  stroke-width   1.7px                     → [1.7] ⓐ.ink--c2
L429  stroke-width   1.4px                     → [1.4] ⓐ.ink--c1

SVG 描边（CSS 顶层，scale=1 at 1440px）：
L185  stroke-width   var(--ink12)  → 1.2px  ⓐ.ink--frame
L186  stroke-width   0.8          → 0.8    ⓐ.ink--base
L187  stroke-width   0.8          → 0.8    ⓐ.ink--pencil
L188  stroke-width   0.8          → 0.8    ⓐ.ink--rev
L190  stroke-width   0.8          → 0.8    ⓐ.ink--c1
L191  stroke-width   1            → 1      ⓐ.ink--c2
L192  stroke-width   1.2          → 1.2    ⓐ.ink--c3
L201  stroke-width   0.8          → 0.8    ⓐ.hot .edge
L205  stroke-width   0.5          → 0.5    ⓐ.hot .ring
L208  stroke-width   1.2          → 1.2    ⓐ.hot:hover .edge
L237  stroke-width   0.8          → 0.8    ⓐ.sw__p
L240  stroke-width   1.2          → 1.2    ⓐ.legend__lines li.is-cued .sw__p

HTML 内联：
L94-96  <symbol id="g-tri" stroke-width="1.2">, g-contour 1.2/1/.8, g-anchor 1.2
```

**缺陷性质（三层叠加）**：
1. **量纲混写**：CSS 只有 `2` 和 `3`，其余全是 SVG 描边。提示词把 `3px`（CSS border）与 `0.8px`（SVG 用户单位）并列在"线宽只用这几级"里 —— **AI 会以为 0.8px 是 CSS 边框宽度**。
2. **漏讲 1.2 / 1.4 / 2**：`1.2` 与 `1` 差 0.2 被去重吞掉，`1.4` 与 `1.7` 差 0.3 被吞，`2`（SVG）与 `2`（CSS）重复但没出现在列表里（被 `1.7` 吞）。
3. **漏讲 1.36**：`calc(0.8px * 1.7)` 只出现在 `@media` 里（`L426` 属于窄屏断点），1440px 下不生效。属于"仅窄屏"。

**patch**：这次必须**同时**改抽取（加内联）与拆语义（(c)/(e) 档）。见 §3。

**改完后 S15 的线宽行（(e) 档，推荐）**：

```
5. CSS 边框/焦点环只用 2px、3px（共 2 档），不要加新档。
6. SVG 描边宽度只用 0.5px、0.8px、1px、1.2px、1.4px、1.7px、2px（共 7 档，SVG 用户单位），按原值写，不要折算。
   小屏断点另有 1.36px，只在窄屏出现，不要带回桌面版。
```

**风险**：S15 的"7 档"看起来很多，但原型确实有 7 档（`0.5/0.8/1/1.2/1.4/1.7/2`），这是"三级丙图 + 硫酸纸透叠"的真实分级。列举 7 档比隐藏 4 档更诚实。

---

### 2.4 S25 `S25-spotcolor-contents-zine`（任务书点名"最严重"之一）

**声称**：`5. 线宽只用这几级：3px，不要自创第三级。`

**实际**：

```
L58   :focus-visible { outline: 3px solid var(--spot-b); outline-offset: 3px; }   ← 唯一的 CSS 3px
L296  .thread path { stroke-width: 3; }   ← 在 @media (max-width: 899px) 里！
HTML 内联：
L35   <path ... stroke="#914A27" stroke-width="1.2"/>         ← hero-spine 的装订线
L106  <path ... stroke="currentColor" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
L139/146/153/160/167/174/181/188  <line ... stroke-width="2"/>  ← 8 处 leader（目录引线）
L235/236  <svg class="icon" ... stroke-width="1"/>              ← 2 个图标
```

**任务书说**：「S25：声称的 `3px` 只出现在 `:focus-visible` 的 outline 上，视觉装订线其实是 SVG `1.2px`」。

**我核实后的结论**：**方向正确，但有一处需要更正**。
- ✅ `3px` 确实**只**出现在 `:focus-visible` 的 `outline` 上（`L58`）。
- ✅ 视觉装订线确实是 SVG `1.2px`（`L35` 的 `.hero-spine` 竖线 + `L106` 的粘性索引线）。
- ⚠️ **但 `.thread path{stroke-width:3}` 也确实是 3** —— 只不过它在 `@media (max-width:899px)` 内，1440px 下不生效。所以 `dna-clean` 抽到 `3px` 不是凭空来的，是"媒体查询泄漏"（见 §4）。
- ⚠️ 任务书说 `1/1.2/2` 是"提示词完全没提的"。**准确**：`1`（2 个 icon）、`1.2`（装订线）、`2`（8 条 leader）确实全在 HTML 内联里，`lineWidthVerdict` 只读 `style.css`，**一个都抽不到**。

**这是五案里唯一"抽取器完全看不见"的案** —— 它的线宽信息 100% 在 HTML 里。

**patch（必须加 HTML 扫描）**：

```diff
--- a/prototypes/_prompts/clean-dna.mjs
+++ b/prototypes/_prompts/clean-dna.mjs
@@ -452,6 +452,17 @@
-function lineWidthVerdict(cleanCss, vars) {
+/* ⚠️ 2026-10-29 第六次修：**必须扫 index.html 的内联 stroke-width**。
+ * 原实现只读 style.css，于是"线宽全写在 SVG 内联属性里"的案整批丢失：
+ *   S25 的装订线 stroke-width="1.2"（L35）、8 条 leader="2"（L139-188）、2 个 icon="1"（L235-236）
+ *   S27 的 9 个 .8（L36-45）、3 个 1.6（L32-34）
+ *   S30 的 1.6/2、S15 的 1.2/1/0.8
+ * 结果 S25 的提示词只剩 "3px" 一个值，而它的签名装订线是 1.2 —— AI 照 3px 画，
+ * 整个"骑马钉装订线"的机制就没了。这不是"少写一个数"，是**风格签名丢失**。
+ * 内联属性与 CSS 同权：两者都是作者写下的线宽声明。
+ */
+function lineWidthVerdict(cleanCss, vars, inlineMarkup) {
   const widths = new Set();
   const re = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
@@ -482,6 +493,18 @@
   }
+  /* HTML 内联属性：stroke-width="1.2"（含 data-URI 里 URL 编码后的 stroke-width%3D1.8）。
+   * 只取 stroke-width —— fill/stroke 是颜色，不参与线宽。
+   * 允许裸数字与 px 两种写法（SVG 规范两者都合法）。 */
+  if (inlineMarkup) {
+    for (const im of inlineMarkup.matchAll(/stroke-width(?:=|%3D)\s*['"]?(%?[0-9.]+)/gi)) {
+      const n = parseFloat(decodeURIComponent(im[1]));
+      if (n > 0) widths.add(round2(n));
+    }
+  }
   const list = [...widths].sort(function (a, b) { return a - b; });
```

调用处同步改（`clean-dna.mjs:563` 附近已读 `style.css`，需再读 `index.html`）：

```diff
@@ -561,6 +574,9 @@
 for (const r of raw.rows) {
   const rawCss = readFileSync(join(P, r.dir, "style.css"), "utf8");
+  /* 线宽要同时看 index.html —— S25/S27/S30 的描边全写在内联 SVG 属性里。
+   * 原来只读 CSS，导致这些案的 lineWidths 系统性偏少（S25 只剩 1 个值）。 */
+  const rawHtml = readFileSync(join(P, r.dir, "index.html"), "utf8");
   const css = stripComments(rawCss);
@@ -468,7 +484,7 @@
-  const rad = radiusVerdict(css);  const lines = lineWidthVerdict(css, vars);
+  const rad = radiusVerdict(css);  const lines = lineWidthVerdict(css, vars, rawHtml);
```

**改完后 S25 的线宽行**（(a) 档，只补抽取）：

```
5. 线宽只用这几级：1px、1.2px、2px、3px，不要自创第三级。
```

（(e) 档见 §2.7 汇总。）

**风险**：`1.2` 与 `1` 差 0.2，`2` 与 `1.2` 差 0.8 —— 如果**保留** 0.5px 去重，`1` 和 `1.2` 会被合并，仍然漏讲 1.2。所以 S25 必须**同时**去掉去重（§2.1 的 patch）。两个 patch 是耦合的。

---

### 2.5 S27 `S27-hand-painted-bill-dispatch`（任务书点名"最严重"之二）

**声称**：`5. 线宽只用这几级：1.2px、2.4px、3px，不要自创第三级。`

**任务书说**：「S27：声称的 `1.2px` 和 `2.4px` 在整份 CSS 里一次都没出现」。

**我核实后的结论：这句不准确，必须以我的实测为准。**

```
$ Select-String -Path style.css -Pattern '1\.2px'
L34   --mis: 1.8px;          /* 石版错位量，方向固定右上；窄屏收 1.2px */
L519  /* ===================== <820px：单栏纵向，错位量从 1.8px 收到 1.2px */
L521  :root { --outer: 20px; --gutter: 14px; --mis: 1.2px; }
```

字面 `1.2px` **出现 3 次**（一次在 `@media (max-width:819px)` 的 `:root` 里，两次在注释里）。
字面 `2.4` 出现 2 次，但都是 `calc(var(--base) * 2.4)` 的**倍数**，不是线宽。

**真相是这样的**：

| | 桌面（≥1200px） | 窄屏（<820px） |
|---|---|---|
| `--mis` | `1.8px`（L34） | `1.2px`（L521，`@media` 内） |
| `border-left: var(--mis)` | `1.8px` | `1.2px` |
| `border-left: calc(var(--mis) * 2)` | **`3.6px`** | **`2.4px`** |

所以：
- **`1.2px` 和 `2.4px` 不是"编造的"，是"另一台设备的值"**。原型在 820px 宽时确实是 1.2 和 2.4。
- 在 **1440px 审查视口**下，真实值是 **1.8px 和 3.6px**，提示词一个都没写。
- 根因是 `clean-dna.mjs:567-568` 的变量字典**合并所有 `:root`、不区分 `@media`**，L521 覆盖了 L34。

**这比"编造"更隐蔽**：编造可以被"值不存在"一票否决；媒体查询泄漏会通过任何"值是否存在"的检查，只在"这个值在审查视口下成立吗"这一问上暴露。我上一轮的验证器**没有问这一问**，所以没抓到。

**patch（两处，缺一不可）**：

```diff
--- a/prototypes/_prompts/clean-dna.mjs
+++ b/prototypes/_prompts/clean-dna.mjs
@@ -564,8 +564,24 @@
   const rawCss = readFileSync(join(P, r.dir, "style.css"), "utf8");
   const css = stripComments(rawCss);
   const decls = rootDecls(rawCss);
 
+  /* ⚠️ 2026-10-29 第七次修：变量字典**只能取顶层 :root**。
+   * 原实现把所有 :root 块合并，包括 @media 里的断点覆盖，后出现的赢。
+   * S27 因此把 "1.8px"（L34 桌面）换成了 "1.2px"（L521 窄屏 @media），
+   * 于是提示词说"线宽 1.2px、2.4px、3px"，而 1440px 下的真相是 1.8px 与 3.6px。
+   * 这是**最坏的一类错**：值在文件里确实存在（任何"存在性"检查都过），
+   * 但它在审查视口下不成立。上一轮我的验证器没问"这个值在这个视口成立吗"，漏掉了。
+   *
+   * 统计（t1-media-leak.mjs）：30 案里 21 案有 @media 内的 :root 覆盖，
+   * 其中只有 S27 的覆盖变量（--mis）恰好被线宽用到，所以只暴露 1 例。
+   * 但同一 bug 对 palette / radius / shadow 是**同一套字典** —— 修这里会连带影响它们，
+   * 所以本 patch 必须与那三项的回归一起做（见 §5 风险）。
+   */
   const vars = {};
-  for (const d of decls) vars[d.name] = stripComments(d.value).trim();
+  for (const d of decls) {
+    /* topLevelOnly：rootDecls 需要带出"这个 :root 是否在 @media 内"。 */
+    if (d.inMedia) continue;
+    vars[d.name] = stripComments(d.value).trim();
+  }
```

同时 `rootDecls()`（`clean-dna.mjs:62-`）需要标出 `inMedia`：

```diff
--- a/prototypes/_prompts/clean-dna.mjs
+++ b/prototypes/_prompts/clean-dna.mjs
@@ -62,6 +62,15 @@
 function rootDecls(rawCss) {
   const out = [];
-  const blocks = [...rawCss.matchAll(/:root\s*\{([\s\S]*?)\}/g)].map(function (m) { return m[1]; });
+  /* 每个 :root 块要带上"它是否位于 @media 内"。
+   * 判据：从块起点向前回溯大括号栈，若栈顶选择器以 @media 开头，则它在媒体查询里。
+   * 不能只看缩进 —— 本仓库的 CSS 缩进不统一（S27 的 @media 内 :root 与顶层 :root 都顶格）。 */
+  const blocks = [...rawCss.matchAll(/:root\s*\{/g)].map(function (m) {
+    const before = rawCss.slice(0, m.index);
+    let depth = 0;
+    const stack = [];
+    for (let i = 0; i < before.length; i++) {
+      const ch = before[i];
+      if (ch === "{") { stack.push(i); }
+      else if (ch === "}") { stack.pop(); }
+    }
+    let inMedia = false;
+    if (stack.length) {
+      const openAt = stack[stack.length - 1];
+      const prev = Math.max(before.lastIndexOf("}", openAt), before.lastIndexOf("{", openAt - 1));
+      const sel = before.slice(prev + 1, openAt).trim();
+      inMedia = /^@media/.test(sel);
+    }
+    const body = rawCss.slice(m.index, rawCss.indexOf("}", m.index) + 1).replace(/^:root\s*\{/, "");
+    return { body: body, inMedia: inMedia };
+  });
```

> 注：这段 `rootDecls` 的改法我**实测过等价实现**（`t1-media-leak.mjs` 的 `rootsWithContext`，修正后的版本），它正确判出 S27 的 `L494/L499/L521` 三个 `:root` 在 `@media` 内、`L27` 在顶层。但**我第一版写错了**（用 `lastIndexOf('{', openAt)` 求选择器起点，返回自身 → 30/30 全判"不在 @media"），这个错误已写进 §6 自我披露。

**改完后 S27 的线宽行**（(a) 档：补内联 + 修正变量）：

```
5. 线宽只用这几级：0.8px、1.6px、1.8px、3px、3.6px，不要自创第三级。
```

（(e) 档见 §2.7。）

**风险**：`--mis` 修正后，S27 的 `calc(var(--mis) * 2)` 从 `2.4` 变 `3.6`（数学上正确）。但**这会同时改变 `border-left` 的渲染宽度吗？不会** —— 我没有改原型，只改了"读哪个 `:root`"。原型在 1440px 下本来就用 `--mis:1.8px`（浏览器同样只应用顶层 `:root`）。**所以这个 patch 让说明书追上了浏览器，没有改作品。**

---

### 2.6 改数据 vs 改原型：我的判断

任务书要求对 S25 / S27 明确表态。**判断：两案都改数据（说明书），不动原型。** 理由按强度排序：

1. **仓库纪律**：30 个原型是「设计作品」，提示词是「描述作品的说明书」。说明书错了改说明书。这不是妥协，是唯一自洽的方向 —— 反过来做，等于为了迁就一句自动生成的文案去改动一件已经过验收的设计。
2. **"改原型"在这里没有明确的正确目标**。要让 S27 的提示词成立，得把 `--mis` 从 `1.8px` 改成 `1.2px`。但 `1.8px` 是作者写的"石版错位量"，`1.2` 是作者**明确标注为窄屏值**的（`L34` 注释原文："窄屏收 1.2px"）。把桌面值改成窄屏值会**破坏作者已经表达的设计意图**。
3. **S25 更不可能改原型**。它的 `3px` 是 `:focus-visible` 的 outline —— 那是**无障碍焦点环**，`3px` 是有理由的（WCAG 焦点可见性）。为了让"线宽只有 3px"成立而去改焦点环，是在破坏可访问性换一句文案的漂亮。
4. **改数据的成本已知且可复算**：`clean-dna.mjs` + 重建 `prompts.js`，30 案文案统一重生成，我有 30/30 的模拟结果（§3）。改原型的成本未知：30 个原型是手写 CSS，改一处可能触发视觉回归，而仓库**没有像素基线**（我上一轮查过，`tools/taste-skill` 没有截图对比工具）。
5. **反例检查**：有没有"说明书写对了、作品错了"的情况？我逐案查了 5 个缺陷案，**没有一例**是"提示词声称的值在原型里是设计意图、但原型渲染错了"。S27 的 `2.4` 是 `clean-dna` 算错的（用了窄屏变量），不是原型画错的。

**一句话**：S25 的 `3px` 和 S27 的 `1.2/2.4` 都是**真实的、合法的、但属于另一个语境的值**（焦点环 / 窄屏断点）。说明书把它们当成了"全站线宽"，错在说明书。

---

### 2.7 五案改完后（(e) 档）的提示词线宽行 —— 逐字

> (e) = 补内联抽取 + 修正 `@media` 变量 + 去掉 0.5px 去重 + 拆"CSS 边框 / SVG 描边"两句 + 按真实级数说话 + 单列窄屏值。
> 这是 §3 里唯一 30/30 通过的档。

```
S09：
5. CSS 边框/焦点环只用 2px、3px（共 2 档），不要加新档。
6. SVG 描边宽度只用 2px、3.5px、3.6px（共 3 档，SVG 用户单位），按原值写，不要折算。

S10：
5. CSS 边框/焦点环只用 1.25px、1.5px、2px（共 3 档），不要加新档。
6. SVG 描边宽度只用 1.25px、2px（共 2 档，SVG 用户单位），按原值写，不要折算。

S15：
5. CSS 边框/焦点环只用 2px、3px（共 2 档），不要加新档。
6. SVG 描边宽度只用 0.5px、0.8px、1px、1.2px、1.4px、1.7px、2px（共 7 档，SVG 用户单位），按原值写，不要折算。
   小屏断点另有 1.36px，只在窄屏出现，不要带回桌面版。

S25：
5. CSS 边框/焦点环只用 3px（共 1 档），不要加新档。
6. SVG 描边宽度只用 1px、1.2px、2px、3px（共 4 档，SVG 用户单位），按原值写，不要折算。

S27：
5. CSS 边框/焦点环只用 1.8px、3.6px（共 2 档），不要加新档。
6. SVG 描边宽度只用 0.8px、1.6px、1.8px、3px（共 4 档，SVG 用户单位），按原值写，不要折算。
```

---

## 3. 三种修法对比（Lead 要看的取舍）

我在 `t1-final-sim.mjs` 里实现了 5 个档位（a/b/c 三档 + 我自己的两个中间档 d/e），对 **30 案**逐一生成文案并用**统一验证器**复算。验证器三条判据：

- **无编造**：文案里每个 `Npx`，必须在真值集合里（`border/outline px` ∪ `CSS stroke` ∪ `HTML 内联 stroke`，含窄屏）。
- **无漏讲**：桌面真值里每个值，必须被文案覆盖。
- **话术自洽**：文案说"不要自创第三级"时，列表必须恰好 2 档（否则自相矛盾）。

### 3.1 复算结果

| 档位 | 内容 | 通过数 | 无编造 | 话术自洽 | 无漏讲 |
|---|---|---|---|---|---|
| **现行** | 只读 CSS、含 0.5 去重、含媒体查询泄漏、固定"第三级" | **6/30** | 30/30 | 14/30 | 8/30 |
| **(a)** | 只补抽取（加 HTML 内联） | **6/30** | 30/30 | 10/30 | 14/30 |
| **(b)** | (a) + 按真实级数生成那句话 | **14/30** | 30/30 | 30/30 | 14/30 |
| **(c)** | 彻底改语义：拆「CSS border」与「SVG 描边」两句 | **23/30** | 30/30 | 30/30 | 23/30 |
| **(d)** | (c) + 只报桌面值、窄屏值单列 | **23/30** | 30/30 | 30/30 | 23/30 |
| **(e)** | (d) + 去掉 0.5px 去重 | **30/30** | 30/30 | 30/30 | 30/30 |

> **每案明细见 `t1-final-sim.txt`；五案逐字前后对照见 `t1-before-after.txt`。**

### 3.2 关键发现：缺陷的性质是「漏讲」，不是「编造」

现行判决里 **`无编造 = 30/30`**。也就是说：**30 条提示词里，没有一个线宽值是原型里根本不存在的**（这是宽松口径；严格口径下只有 S27 的 `1.2/2.4` 是"属于窄屏"的编造，1/30）。

真正的缺陷是 **22/30 案漏讲了真实存在的线宽级**。这改变了对"严重性"的判断：

- 如果是"编造"，AI 会画出不存在的线 → 但根本画不出来（值不对）。
- 如果是"漏讲"，AI 会**只画列出来的那几级**，于是把 7 档压成 2 档 —— **风格签名被抹平**，页面看起来"太整齐"，但没有任何一条硬约束被违反。

**所以 S25 的严重性不在"3px 是假的"，而在"1.2px 的装订线被整段藏起来了"** —— AI 永远画不出骑马钉的装订线。这是风格丢失，不是规则违反，而风格丢失恰恰是这套提示词**唯一存在的目的**。

### 3.3 成本与影响面

| 档位 | 改动量 | 影响面 | 能否 30/30 |
|---|---|---|---|
| (a) | `clean-dna.mjs` +12 行（2 处） | 30 案中 **16 案**的线宽行变长；其中 8 案的级数错位（话术更不自洽，14→10） | ❌ 6/30 |
| (b) | (a) + `prompt-copy.js:456` 改 1 行（级数逻辑 6 行） | 30 案全部重写线宽行；`机制句` L283 同步 | ❌ 14/30 |
| (c) | (b) + `prompt-copy.js` 结构性改动（一行变两行，编号 5/6 顺延） | **30 案全部**；编号 `5.`/`6.` 变化会影响下游解析（见风险） | ❌ 23/30 |
| **(e)** | (c) + 删去重 6 行 + 变量作用域 2 处 | 30 案全部；`palette`/`radius`/`shadow` 共用同一变量字典 → **必须连带回归** | ✅ **30/30** |

### 3.4 为什么 (b) 不够，以及 (c) 为什么只到 23

**(b) 卡在"量纲"上**。`(b)` 把话说对了级数，但仍然把 `0.8px`（SVG 用户单位）和 `2px`（CSS 边框）放在**同一句**里说"只用这几级"。验证器判它漏讲，是因为 S15 的 CSS 边框只有 `2,3`，SVG 有 `0.5…2` —— 一句"线宽只用 0.5、0.8、1、1.2、1.4、1.7、2、3"在语义上是**两种量纲混在一个集合里**，AI 无法知道哪个值该用在 `border` 上。这不是格式问题，是会真的画出错东西。

**(c) 卡在 0.5px 去重上**。剩下的 7 个失败案（S09/S10/S15/S24/S25/S28/S30）全部是**同一个原因**：`narrow()` 把相差 <0.5px 的两个真实值合并。`(c)` 已经拆对了量纲、说对了级数，但列表本身是**错的**（少了值），所以仍然漏讲。

**这是本轮最值得记的一条**：`(c)` 已经是深思熟虑的结构性修法，却只到 23/30；最后 7 案全部来自一个 6 行的"合理化"辅助函数（`narrow()`），它的注释还写着"人眼分辨不出 0.5px"。**一个出于好意的小优化，制造了 7/30 的缺陷。**

---

## 4. 附带的第三个缺陷：`@media` 变量泄漏（任务书没提）

在追 S27 的过程中发现了一个**独立于线宽**的缺陷，必须单独报：

`clean-dna.mjs:567-568` 构造 `vars` 字典时**遍历所有 `:root` 块，不区分是否在 `@media` 内**，后出现的覆盖前面的。于是**窄屏断点值会冒充全站值**。

**实测（`t1-media-leak.mjs`）**：

| 指标 | 数值 |
|---|---|
| 有 `@media` 内 `:root` 的案 | **21/30** |
| 其中被覆盖的变量含 **px 长度**的案 | **1/30（S27）** |
| 具体 | `--mis`: 顶层 `1.8px`（L34）→ 被 `@media(max-width:819px)` 的 `1.2px`（L521）覆盖 |

**为什么只暴露 1 例**：30 案的 `@media :root` 绝大多数只覆盖 `--outer` / `--gutter` 这类**不被线宽引用**的变量。S27 恰好让 `--mis` 既被线宽用、又在断点里被改。

**但风险面远大于 1 例**：同一个 `vars` 字典被 `pickPalette`（颜色）、`radiusVerdict`（圆角）、`shadowText`（阴影）共用。**如果我修了这个 bug，那三项的文案会一起变**。我在 §2.5 的 patch 里只修了"顶层优先"，但**没有验证 palette/radius/shadow 的连带影响** —— 这是我本轮**没有做完**的部分，必须在实施前补。

我实际改过一次 palette 的抽样核算（`t1-strict.mjs` 顺带输出），**S27 的 `--green` 在断点里没有覆盖**，所以那份不受影响；但我只查了 S27 一个案，**不能外推到 30 案**。这条明确标为「未验证」。

---

## 5. 风险：会不会影响其他 25 案

### 5.1 逐 patch 的影响面

| patch | 直接影响 | 间接影响 | 回归测试 |
|---|---|---|---|
| 加 HTML 内联扫描 | **19/30 案**抽到新值（`t1-truth.json` 的 `C_htmlInline` 非空）：S03,S06,S07,S08,S10,S13,S14,S15,S17,S18,S20,S21,S22,S23,S24,S25,S27,S28,S30 | 级数变多，`(a)` 档下 8 案话术更不自洽 | 30 案 `lineWidths` 全量 diff，逐条核对 |
| 去掉 0.5px 去重 | **7 案**（S09/S10/S15/S24/S25/S28/S30） | 无 | 同上 |
| 修正 `@media` 变量 | 线宽：1 案（S27）；**palette/radius/shadow：未验证** | ⚠️ **最大风险** | **必须先跑 palette/radius/shadow 三项的 30 案 diff** |
| 拆两句语义 | **30 案全部**（编号 5/6 变化） | 下游若有按 `"5. 线宽"` 解析的脚本会失配 | grep 全库对 `"5. 线宽"` 的引用 |
| 按级数说话 | 30 案全部（28 案的话术文字变） | 无 | 同上 |

### 5.2 我实际检查过的下游引用

我 grep 了全库对线宽行的依赖：

- `prototypes/_selection/prompt-copy.js:283`（机制句）也用了 `d.lineWidths`，**必须同步改**，否则同一份提示词里会出现两套线宽口径（这正是 2026-10-26 修 P0 时踩过的坑，见 `clean-dna.mjs:443-450` 的注释）。
- `deliverables/` 下有多个探针按 `"5. 线宽只用这几级"` 正则取声称值（我自己的 `t1-linewidth-truth.mjs`、`t1-strict.mjs` 都是）。**拆成两句后这些探针全部失效** —— 实施时必须同步改探针，否则"验证器"会静默返回 `null` 而看起来"全过"。
- 我没有找到 `templates/` 或 `tools/` 里对线宽行的硬依赖（grep `线宽` 只命中 `prompts.js` 与 `prompt-copy.js`）。

### 5.3 我建议的实施顺序（最小风险）

1. **先只做 (e) 的抽取部分**（加内联 + 去重 + 变量作用域），不动文案 → 生成新 `dna-clean.json`，与旧版做 30 案 diff，**逐条人工确认每个新值都是真的**。
2. **跑 palette/radius/shadow 的 30 案 diff**（变量作用域修正的连带影响），确认无意外。
3. **再做文案拆分**（`prompt-copy.js:456` + `:283`），同步改所有探针正则。
4. **最后重跑本文的 `t1-final-sim.mjs`**，确认 30/30。

**不要**把 1–4 合成一个 commit —— 第 2 步如果出问题，混在一起就无法定位。

---

## 6. 我核实后认为任务书说错了的地方

### 6.1 「`lineWidths` 是从 `collect-schemes.mjs` 还是 `99-scratch/build-prompts.mjs` 抽的」——两个都不对

`collect-schemes.mjs` 只抽 `fill`/`stroke` **颜色**（L83/L105），根本不碰宽度。`99-scratch/build-prompts.mjs:214` 是纯搬运。**唯一产生地是 `prototypes/_prompts/clean-dna.mjs:452` 的 `lineWidthVerdict()`**，最终文案在 `prompt-copy.js:456`。`collect-schemes.mjs` 的产物是 `SCHEMES`（风格名/气质/机制句），与线宽无关。

### 6.2 「S27 声称的 `1.2px` 和 `2.4px` 在整份 CSS 里一次都没出现」——**不准确**

`1.2px` 字面出现 **3 次**（`style.css` 的 L34 注释、L519 注释、L521 的 `@media` 内 `:root`）。它**不是编造**，是**窄屏断点值**被当成了全站值。`2.4` 字面出现 2 次但都不是线宽；提示词的 `2.4px` 是 `clean-dna` 用窄屏 `--mis=1.2` 算 `calc(1.2×2)` 得来的，**在窄屏语境下完全正确**。

这个区别很重要：如果按"编造"去修，修法是"删掉不存在的值"；按"语境错位"去修，修法是"取对变量作用域"。**前者会删掉真实信息，后者才是根治。** 我按后者给了 patch。

### 6.3 「S25 声称的 `3px` 只出现在 `:focus-visible` 的 outline 上」——**方向对，但漏了第二个宿主**

`3px` 有**两个**宿主：`L58` 的 `:focus-visible { outline: 3px ... }`（全站），以及 `L296` 的 `.thread path { stroke-width: 3 }`（在 `@media (max-width:899px)` 内）。后者在 1440px 下不生效，但在 <900px 时**就是装订线的宽度**。

所以更准确的说法是：「S25 的 `3px` 在桌面是焦点环、在窄屏是装订线，**两个都不是桌面装订线**；桌面装订线是 HTML 内联的 `1.2`」。任务书的结论（装订线其实是 1.2px）**正确**，只是路径比"只出现在 focus"复杂一层。

### 6.4 「30 个原型是设计作品，提示词是说明书」——**这条我完全同意，而且它比任务书说的更有力**

任务书把它作为"仓库纪律"提出。我核实后发现它是**唯一可行**的方向，而不只是纪律：要让 S27 的提示词成立就得把 `--mis` 从 `1.8px` 改成 `1.2px`，而 `1.8px` 旁边的注释原文是「窄屏收 1.2px」—— 作者已经明确表达了"桌面 1.8、窄屏 1.2"。改原型等于**推翻作者已经写下的设计判断**去迁就一句自动生成的文案。

### 6.5 「三种修法里有一档能让 30/30 全过」——**任务书的 (a)(b)(c) 三档都不能**

(a) 6/30、(b) 14/30、(c) 23/30。**30/30 需要第四档 (e)** = (c) + 去掉 0.5px 去重，也就是要修**四个**独立缺陷（抽取漏内联、变量泄漏、去重吞值、话术硬编码"第三级"），不是三个。任务书列的三种修法覆盖了前两个和第四个，**漏了第三个**。

### 6.6 任务书说「你上一轮判错 8 类、42→23→20 FAIL」——本轮我**又**判错 3 处，见 §7

---

## 7. 本轮我自己的误判（自我披露）

任务书要求保持自我披露纪律。本轮我又犯了 **3 个错**，其中第 1 个如果不改，会让我得出**完全相反的结论**：

### 7.1 我的第一版验证器把 SVG 用户单位当成 px —— 差点造出 20 个假缺陷

`t1-sims.mjs`（v1）里，我把"提示词里的 px"与"真值集合"直接比，而真值集合里混了 SVG 的 `stroke-width: 3.6`（用户单位）。结果判 **S09 漏报 3.6px、S27 漏报 0.8/1.6、S20 漏报 0.2、S12 漏报 5.66**…… 一共 **22 案 FAIL**。

**这些几乎全是假的**。`stroke-width:3.6` 在 `viewBox="0 0 24 24"` 的图标里渲染到 20px 时是 **3.0px**；把它写成"3.6px"是单位错误。我是回头读 `probe-linewidths2.mjs` 自己上一轮写的注释（"坑 2：SVG stroke-width 是用户单位"）才发现的 —— **同一个坑我上一轮踩过、写下来了、这一轮又踩了。**

修正后（`t1-final-sim.mjs`，分 `abs`/`user` 两个量纲），22 案 FAIL 降到 **6/30 通过**——数字变了，但**结论方向没变**（仍然是"大面积漏讲"）。如果没纠正，我会向 Lead 报告一个**数量级错误**的缺陷数。

### 7.2 我的 `@media` 检测第一版是坏的，而坏的方向恰好是「安全」

`t1-media-leak.mjs` v1 用 `before.lastIndexOf('{', openAt)` 求选择器起点，但 `lastIndexOf` 的第二个参数是**起始搜索位置**，返回的是**它自己**，所以选择器恒为空串 → `inMedia` 恒为 `false` → 输出 **"受影响案数: 0/30"**。

这个 bug 的危险在于它**倾向于报告"没问题"**。如果我停在那里，我会写"媒体查询泄漏不存在"，而真相是 21/30 案有 `@media :root`、S27 的线宽因此全错。修正后（改成单趟栈扫描）才得到正确结果。

**教训**：验证器报"0 个问题"时，比报"很多问题"时**更需要**先自测 —— 后者至少有输出可看，前者只是沉默。

### 7.3 我用 `getComputedStyle` 当真值时，漏掉了所有伪元素

`t1-five-desktop.mjs` 里我用 `document.querySelectorAll('*')` 收 `border-*-width`，得出 **S27 的 CSS 绝对线宽只有 `1×178, 3×2`** —— 完全没有 `1.8`。原因是 S27 的边框宿主大量是**伪元素**（`.act__sign::before`、`.plate__frame::before`、`.fault__line::before`），`querySelectorAll('*')` 看不到 `::before`。同时 Chrome 对 `border-width` 取整，`1.8px` 读成 `2` 或 `1`，精度全丢。

**我没有用这份数据下结论**（定稿 `t1-final-sim.mjs` 改成只信声明文本），但如果我用了，会得出"提示词编造了 1.8px"的错误指控 —— 而 `1.8px` 恰恰是**真值**。

### 7.4 一处我**没有**判错但值得记的：任务书的 U3 例子是错的

任务书给的 U3 例子是「S28「16 栏放 12 块，最小 2 栏」→ 12×2=24>16」。我数了原型：**4 个 `.row`，每行 3 块，每行 span 合计恰好 16**（`7+5+4` / `2+7+7` / `6+3+7` / `4+5+7`）。只有假定"12 块排同一行"才矛盾。**所以 S28 不是 U3，U3 实例数 = 0。**

我把它从实例降级为"潜在风险：提示词没写清块是分行排的"。详见 `UNVERIFIABLE.md` §3。

---

## 8. 交付物清单

| 文件 | 内容 |
|---|---|
| `PATCH-linewidth.md` | 本文 |
| `t1-linewidth-truth.mjs` / `t1-truth.json` / `t1-claims.json` | 四路静态取证（CSS border / CSS stroke / HTML 内联 / 全文件 px） |
| `t1-evidence5.mjs` / `t1-evidence5.txt` / `.json` | 五案逐条声明，带真实行号与宿主选择器 |
| `t1-source.mjs` / `t1-source.json` | 三层数据一致性（dna-clean → prompts.js → runtime） |
| `t1-eol.mjs` / `t1-eol.json` | 行尾符审计（排除"行号不一致是 CRLF 混用"这一解释） |
| `t1-lineno.mjs` / `t1-lineno.json` | 行号校准（证明我的行号与编辑器一致） |
| `t1-truth-units.mjs` / `t1-truth-units.json` | 单位感知真值（P1/P2/P3 三路） |
| `t1-five-desktop.mjs` / `t1-five-desktop.json` | 五案 1440px 实测（**含已知缺陷，见 §7.3**） |
| `t1-media-leak.mjs` / `t1-media-leak.json` | `@media` 变量泄漏（修正后） |
| `t1-sims.mjs` / `t1-sims.json` | **v1 有单位 bug，保留作为错误记录** |
| `t1-final-sim.mjs` / `t1-final-sim.txt` / `.json` | 五档修法 × 30 案复算（定稿） |
| `t1-strict.mjs` / `t1-strict.json` | 严格 vs 宽松口径的编造/漏讲统计 |
| `t1-before-after.mjs` / `t1-before-after.txt` | 五案逐字前后对照 + 30 案 (e) 档全文 |
| `t1-s25-scope.mjs` | S25 作用域取证 |
| `dump30*.txt` / `dump30.json` | 重跑的 dump（SHA256 已比对） |

---

## 9. 一页结论

1. **`lineWidths` 的唯一产生地是 `clean-dna.mjs:452` 的 `lineWidthVerdict()`**，不是 `collect-schemes.mjs`（它只管颜色），也不是 `99-scratch/build-prompts.mjs`（纯搬运）。文案出口在 `prompt-copy.js:456`。
2. **现行提示词 6/30 通过**；缺陷性质是**漏讲**（22/30 案）而非**编造**（宽松 0/30，严格 1/30）。这个区分决定修法方向。
3. **四个独立缺陷**，不是一个：① 不扫 HTML 内联 `stroke-width`（S25/S27/S30 的描边全丢）② `@media` 变量泄漏（S27 的 1.2/2.4 是窄屏值）③ `narrow()` 的 0.5px 去重吞掉 7 案的真实值 ④ 文案硬编码"不要自创第三级"（14/30 案自相矛盾）。
4. **三档修法不够**：(a) 6/30、(b) 14/30、(c) 23/30。**30/30 需要第四档 (e)** = (c) + 去重修复。
5. **S25/S27 都改数据、不改原型**。理由：`3px` 是焦点环、`1.2px` 是窄屏值，两者都是**真实的、属于另一语境的值**；改原型会推翻作者已写下的设计判断（S27 L34 注释原文"窄屏收 1.2px"）。
6. **实施前必须先做变量作用域修正的连带回归**（palette/radius/shadow 共用同一字典）—— 这一步我**没做完**，见 §4。
7. **本轮我又判错 3 处**（单位、`@media` 检测、伪元素），其中第 1 处若不改会让缺陷数虚高一个数量级，第 2 处若不改会让我漏报整类缺陷。已全部写进 §7。
8. **写完之后我另做了一次交叉核对**（`t4-crosscheck.mjs`，38 项断言），发现报告里有 **2 处数字错误**：一是"19 案抽到内联"的**成员名单**写错（数字对、名单错），二是 U 类模板句数目在另一份报告里写成"6 句 180 条"（实为 **9 句 302 条**）。两处都已按 `t4-authoritative.mjs` 的复算结果改正。**这条纪律值得保留：报告写完不等于数对了。**
