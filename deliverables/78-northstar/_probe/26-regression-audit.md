# 26 · 回归审计：这一轮的 7 个 commit 有没有引入新问题

审计范围：`28a3891` / `c998753` / `1f801f9` / `f7e5e88` / `4e33a84` / `275bea6` / `6acd5ba`
审计时间：2026-11-14 00:15–01:20（工作树 HEAD = `6acd5ba`，开始与结束时 `git status` 均干净）
纪律：未修改任何已有文件；全部临时脚本放 `/tmp`（本次运行中被系统清理过一次，已重建于 `~\AppData\Local\Temp\reg2\`）。

---

## §0 结论先行

**3 处回归，1 处判据盲区（不算回归但会让「全中」永远为真），其余无回归。**

| # | 位置 | 性质 | 严重度 |
|---|---|---|---|
| 1 | `deliverables/74-q7/measure.mjs:494-508` —— SVG `fill`/`stroke` 的「显式声明」查找**不递归进 `@media`** | **真回归**：颜色只在媒体查询里声明时会整条丢失 | **最严重** |
| 2 | 同一段（`measure.mjs:437-450` 的 CSS 文本路 + 新的显式声明闸门）—— 计算样式成了**唯一色源**，而它对 `@media` 里的声明是盲的 | **真回归**（与 1 同源，独立后果） | 高 |
| 3 | `prototypes/_prompts/build-prompts.mjs:487` 分母仍写 `/30`（「识别出主色的案：31/30」） | **假数据**：31/30 是自相矛盾的输出 | 中（仅 stderr 输出，不入库） |
| 4 | `_batch-compare.mjs:104` 的新增反向判据 `extraHex` | **判据盲区**：把原型的 UA 默认色（`#0000EE` 链接蓝、`#FFFFFF`/`#000000`）算成「超用色」，27/35 个原型自己都过不了 | 中（该脚本此前已 10/10「未超用」，说明真实产物碰巧没有 `<a>`） |

**明确无回归的：** D1 重写（§2，35 案 0 误伤）、C9 的 5 案判定（§3，5/5 报得对，且漏报方向已核查）、sceneIndex（§4，11/12 条映射有正文依据）、全库闸门（§5，无一步由绿转红）、数据链（§6，逐字节一致）。

---

## §1 `measure.mjs` 的 hexes 数量 before/after（35 案）

方法：`git show f7e5e88^:deliverables/74-q7/measure.mjs` 取出旧版，仅把 `ROOT` 与 `Browser` 的 import 路径改成本机绝对路径（不改任何判据），新旧各跑一次 `measure()`。串行 + 并发混合执行，CDP 超时的案已串行重跑补齐（35/35 有效数据）。

| 案 | old | new | Δ | 少掉的色 |
|---|---|---|---|---|
| S01 | 5 | 4 | 1 | #000000 |
| S02 | 9 | 8 | 1 | #000000 |
| S03 | 11 | 10 | 1 | #000000 |
| S04 | 5 | 4 | 1 | #000000 |
| S05 | 11 | 10 | 1 | #000000 |
| S06 | 11 | 10 | 1 | #000000 |
| S07 | 5 | 4 | 1 | #000000 |
| S08 | 13 | 12 | 1 | #000000 |
| S09 | 7 | 6 | 1 | #000000 |
| S10 | 6 | 5 | 1 | #000000 |
| S11 | 5 | 4 | 1 | #000000 |
| S12 | 11 | 10 | 1 | #000000 |
| S13 | 6 | 5 | 1 | #000000 |
| S14 | 13 | 12 | 1 | #000000 |
| S15 | 10 | 9 | 1 | #000000 |
| S16 | 8 | 8 | 0 | — |
| S17 | 10 | 9 | 1 | #000000 |
| S18 | 7 | 6 | 1 | #000000 |
| S19 | 14 | 13 | 1 | #000000 |
| S20 | 6 | 5 | 1 | #000000 |
| S21 | 6 | 5 | 1 | #000000 |
| S22 | 7 | 6 | 1 | #000000 |
| S23 | 10 | 9 | 1 | #000000 |
| S24 | 15 | 15 | 0 | — |
| S25 | 10 | 9 | 1 | #000000 |
| S26 | 11 | 10 | 1 | #000000 |
| S27 | 8 | 7 | 1 | #000000 |
| S28 | 5 | 4 | 1 | #000000 |
| S29 | 8 | 7 | 1 | #000000 |
| S30 | 10 | 9 | 1 | #000000 |
| S31 | 8 | 6 | 2 | #000000, #E3DFD9 |
| S32 | 9 | 8 | 1 | #000000 |
| S33 | 9 | 8 | 1 | #000000 |
| S34 | 8 | 7 | 1 | #000000 |
| S35 | 8 | 7 | 1 | #000000 |
| **合计** | **305** | **271** | **−34** | |

### 结论

**35 案里有 33 案的 `hexes.length` 变少，但少掉的全是 `#000000`（假阳性清除），没有一案丢掉真正的设计色。**

证据：

1. **非 `#000000` 的丢失色：0 个**（35 案聚合）。S31 表里那 2 个差值的第二个 `#E3DFD9` 是**偶发**——连跑 4 次旧版全部是 7 色、不含 `#E3DFD9`，新版 3 次全部 6 色。它是某次页面过渡动画中间态被采到的混合色（`#F2F0EC → #DEDAD3` 之间的一帧），与本次改动无关。→ 稳定值应为 old=7 / new=6 / Δ=1，仍只有 `#000000`。
2. **新出现的色：0 个**（35 案聚合）。改动只减不增。
3. 残留的 `#000000` 只剩 S16、S24 两案。逐条追到源头：
   - S16：6 处，全部是 `.state-error code { background: rgba(0, 0, 0, 0.18) }`（`style.css:351`）——**作者显式声明的半透明黑**，被 `rgbToHex` 丢掉 alpha 后映射成 `#000000`。属于设计色，留着是对的（但如果用来做「超用色」判据，它是新的假阳性源，见 §0 第 4 条）。
   - S24：30 个 `.node` 按钮 × 4 个属性（`color` / `borderTopColor` / `borderBottomColor` / `outlineColor`）= 120 条里 96 条**无任何作者声明**，是 `<button>` 的 UA 默认黑。这批**没有**被表单放宽规则拦住，因为放宽条件写的是 `/^(INPUT|TEXTAREA|SELECT|BUTTON|OPTION)$/.test(el.tagName)`，而这里 `el.tagName` 是 `svg` / `path`（**按钮内部的 SVG 子元素**，`tagName` 大写是 `SVG`/`PATH`，不在名单里）。`color` 从 `button.node` 继承下来即 UA 黑。
   
   ⇒ S24 保住 `#000000` **不是**因为有作者声明，而是因为「SVG 元素」这个分支根本没被表单规则覆盖。这是**判据覆盖不全**，不是新引入的错误（旧版同样有），但它说明「排除 UA 默认色」这件事只做了一半。

### 关于「配色全中」是否会因少收集而蒙过去

**不会，但也不是完全干净。** 判断依据：

- 少掉的 34 个色全部是同一个值 `#000000`，且都是 UA 默认值/未声明值。若某个原型真的用了纯黑作设计色，新版会**保留**它（S16/S24 就是证据），所以这个方向没有松动。
- 但 S24 揭示了一个真实缺口：`#000000` 从「每个页面都多一个」变成了「只有 S24 一个」，**不是因为它被正确排除，而是因为 S24 的按钮是 SVG 子元素、绕过了表单放宽**。这条不该靠巧合。

**更关键的是新引入的一个真丢色通道**，见下节。

### 1b. 真回归：`@media` 里的 SVG 颜色会整条丢失

新加的「显式声明」闸门（`measure.mjs:494-508`）在判定 SVG 子元素的 `fill`/`stroke` 是否有作者声明时，只遍历 `sheet.cssRules` 的**顶层**：

```js
for (const rule of Array.from(rules)) {        // ← 不递归
  if (!rule.selectorText || !rule.style || !rule.style[prop]) continue;
  try { if (el.matches(rule.selectorText)) { ruleDecl = true; break; } } catch {}
}
```

`CSSMediaRule` 的 `selectorText` 是 `undefined`，所以 `@media { .box rect { fill: #AB12CD } }` 里的声明**永远查不到**。一旦查不到，`continue` 跳过该元素 ⇒ 这个颜色不进 `hexes`。

而「CSS 文本」那一路（`measure.mjs:427-433`，本该兜住这种情况）在 Chrome 上贡献 **0 个 hex**：Chrome 把 `cssText` 里的 `#RRGGBB` 规范化为 `rgb(...)`，正则 `/#([0-9a-fA-F]{6})\b/g` 抓不到。实测 5 个代表性原型（S01/S07/S14/S24/S28），CSS 文本路贡献均为 **0**。

于是计算样式是唯一色源，而它对 `@media` 声明是盲的。构造用例复现（临时目录，不入库）：

```html
<style>
body{background:#FFFFFF;color:#222222}
@media (min-width: 1000px) { .box rect { fill: #AB12CD; } }
</style>
<svg class="box"><rect width="10" height="10"/></svg>
```

| 版本 | hexes | `#AB12CD` |
|---|---|---|
| 旧版 `f7e5e88^` | `#000000, #222222, #AB12CD, #FFFFFF` | 在 |
| 新版 HEAD | `#222222, #FFFFFF` | **丢了** |

**为什么现在没炸**：本仓库 35 案的 `style.css` 里 `@media` 内**没有任何 `fill`/`stroke` 声明**（实测扫全部 35 份，唯一命中是 S28 的 `--fill: 200ms` 变量，不是 SVG 属性）。所以当前是无症状的——但这是一条**真实的静默失效通道**，与本案 `measure.mjs` 顶部那段「读不到数据也不报错」的病史同型。下一次有人在媒体查询里给 SVG 上色（响应式配色是最常见的写法），这一色就会从 `hexes` 里消失，而「配色全中」判据仍然会绿。

### 1c. 另一条同源的小盲区（旧版就有，不构成回归）

JS 在运行时设置的颜色能被正确收进来（`el.style.fill = '#AB12CD'` → 实测进了 hexes），因为 Chrome 会把它写进 `el.style`，`inlineDecl` 判为真。这一点没有问题。

---

## §2 D1 重写对现有 35 案的误伤检查

方法：独立重写一遍 D1 的六条子判据（不 import `check-prompts.mjs` 的函数，只用同一份 `prompts.js` + `prompt-copy.js` 生成文本），逐案打印每条判据的中间值。两边结果一致才算数。

`node prototypes/_build/check-prompts.mjs` 结果：**合计 FAIL 0 / WARN 1**。

独立复算的 35 案明细（长度 / 去标点后长度 / 子判据）：

| 案 | 长度 | 去标点 | FAIL | 案 | 长度 | 去标点 | FAIL |
|---|---|---|---|---|---|---|---|
| S01 | 15 | 14 | — | S19 | 17 | 16 | — |
| S02 | 14 | 12 | — | S20 | 10 | 10 | — |
| S03 | 12 | 11 | — | S21 | 15 | 14 | — |
| S04 | 14 | 13 | — | S22 | 14 | 12 | — |
| S05 | 13 | 12 | — | S23 | 15 | 14 | — |
| S06 | 13 | 12 | — | S24 | 14 | 13 | — |
| S07 | 12 | 11 | — | S25 | 16 | 15 | — |
| S08 | 13 | 12 | — | S26 | 12 | 12 | — |
| S09 | 16 | 15 | — | S27 | 16 | 15 | — |
| S10 | 14 | 13 | — | S28 | 13 | 12 | — |
| S11 | 11 | 11 | — | S29 | 11 | 11 | — |
| S12 | 12 | 11 | — | S30 | 14 | 13 | — |
| S13 | 13 | 12 | — | S31 | 13 | 12 | — |
| S14 | 14 | 13 | — | S32 | 12 | 11 | — |
| S15 | 14 | 14 | — | S33 | 12 | 11 | — |
| S16 | 13 | 12 | — | S34 | 12 | 11 | — |
| S17 | 13 | 12 | — | S35 | 12 | 11 | — |
| S18 | 14 | 13 | — | | | | |

**结论：0 案被误伤。** 三条边界的具体余量：

- **长度上限 20 字**：最长的三案 S19=17、S09=16、S25=16，余量 3 字。
- **去标点后 ≥2 字符**：最少的三案 S20=10、S03/S07/S11/S29=11，余量极大。
- **禁句末标点 `。！？；`**：35 案全 0 命中。
- **施工细节词表**（含新加的汉字写法 `像素`/`字体`/`字号`/`度角`/`度[，、。]`/`＃xxxxxx`）：35 案全 0 命中。含「度」字的三案（S08「有厚度」、S16「速度感」、S31「刻度当骨架」）都**不**触发——因为规则要求 `度` 后面紧跟 `，、。`，这三处是 `度` + 名词。
- **换行注入**（看 plain 的下一行是不是「这个案子的调性是…」）：全部 35 案的 `tone` 都有值（`data.js` 实测 35/35 非空），所以模板行序稳定，无误报。
- **变异测试** `--selftest`：8/8 全响；`_probe/_d1-bypass-test.mjs` 的 10 条对抗用例 10/10 符合预期。

**一处值得记录的余量风险（不是回归）**：`度[，、。]` 这条会误伤「温度，」「纬度，」这类正常中文短语。当前 35 案没有这种写法，但它是词表扩写带来的**未来**误伤面。同理 `字体`/`字号` 会误伤「字体感很重」这类人话。建议记录在案，不必现在改。

---

## §3 C9 报的 5 案逐案核实

### 3a. 数据事实（来自各案 `.inspect/report.json` 的 `viewports[0].metrics.structure`）

| 案 | layoutKind | columns | columnsFrom | columnsInLandmark | C9 报? |
|---|---|---|---|---|---|
| S09 | no-column-layout | 3 | `div.foot-grid` | footer | ★ |
| S13 | no-column-layout | 2 | `div.letterhead__top` | header | ★ |
| S14 | no-column-layout | 3 | `div.foot-grid` | footer | ★ |
| S16 | no-column-layout | 3 | `div.foot-grid` | footer | ★ |
| S17 | no-column-layout | 3 | `div.foot-grid` | footer | ★ |
| S34 | no-column-layout | 3 | `footer` | footer | （排除） |

### 3b. 逐案读结构，判 C9 报得对不对

**S09 —— 报得对。**
`index.html:55-160` 四个 `<section>`（`.prices` / `.portions` / `.shut` / `.plates`）全在 `<footer class="foot">` 之前。版心真值 3 栏在 `.rows { column-count: 3 }`（`style.css:276`），而 `.rows` 是 `display: block`、`column-count` 容器——probe 的 `_colEls` 只收 `display:grid` 的 `tracks>1`，不收 column-count（它把 column-count 的 tracks 也算进去，但 S09 的 `.rows` 有 10 个 `<li>`、每个都含 `<svg class="trace">` ⇒ 命中画廊判据 B「子元素过半带图」⇒ `tracks = 0`，被剔除）。所以 `columns=3` 只能来自页脚 `.foot-grid`（`style.css:449` `repeat(3, 1fr)`）。**C9 报得准**：这个 3 不代表版式。

**S13 —— 报得对。**
版心 `main.dossier` 是 `repeat(16, minmax(0,1fr))`（`style.css:183-184`）。实测 1440 下 `grid-template-columns` 展开成 **16 条 × 67px**。`columns=2` 来自 `div.letterhead__top`（header 里的两栏抬头，`style.css:908` `minmax(0,7fr) minmax(0,9fr)`）。

16 轨为什么没被记为 16 栏？实测机制（`/tmp/reg2/s13-mech.mjs`）：`.dossier` 有 4 个子元素（`article.clauses` / `aside.signature` / `section.levels` / `section.log`），`withImg = 2`（`.clauses` 和 `.signature` 里含 `<svg>`）。**画廊判据是 `kids.length >= 3 && withImg >= kids.length / 2` ⇒ `4 >= 3 && 2 >= 2` 为真 ⇒ `tracks = 0`。** 所以版心的 16 轨被画廊判据整个剔掉了，`columnsAll = [2]` 只剩页头那 2 栏。

⚠️ 注意这条画廊判据的口径：它只要求「过半子元素**含**图」，不要求「子元素**是**图」。`.dossier` 的四个子元素都是大段正文块（`.clauses` 是条款正文、`.levels` 是压印层级表），只因为各自内嵌了一个装饰性 `<svg>` 就被判成画廊。**这就是 `_probe/17-gallery-fix-attempt.md` 记的那条根因，C9 把它暴露得准确。**

同时注意与 `measure.mjs` 的分歧：`node deliverables/74-q7/measure.mjs prototypes/S13-.../index.html` 对同一页给出 `gridTracks=16 gridSel=main.dossier`——它用的是另一套判据（三个条件都要满足，含「每子平均不到 120 字」）。两套实现不一致这件事 `check-contract.mjs` 的注释已经记过，不属于本轮改动。

**S14 —— 报得对。**
版心 `<main>` 里 `.deck` 是 `position:relative` 无分栏，11 个 `.tag` 是 `position:absolute` 定位（`style.css:166-171`），`.plates` 是 4 轨图片格（画廊，已被剔）。全页唯一的多栏正文容器是 `header.masthead`（2 轨）与 `footer .foot-grid`（3 轨）。`columns=3` 取自页脚，`layoutKind=no-column-layout` 正确。**C9 报得准。**

**S16 —— 报得对。**
`main#track.track` 是 `padding: 36px var(--pad) 0`（`style.css:217`）—— 无 `display:grid` 也无 `column-count`。9 个 `.slab` 各自有 `width: calc(var(--span) * 100% / 12)` + `margin-left`，是**单栏流 + 错位**，不是分栏。唯一的多栏正文容器是 `header .masthead-grid`（2 轨，`style.css:131`）与页脚 `.foot-grid`（3 轨）。`columns=3` 来自页脚。**C9 报得准。**

**S17 —— 报得对。**
版心真值 3 轨在 `div.sheet { grid-template-columns: minmax(210px,3fr) 16px 9fr }`（`style.css:133-134`）。实测 1440 下展开为 `334px 16px 1002px`——3 条轨道，其中 16px 是齿孔线。

`.sheet` 为什么没被记成 3 栏？实测（`/tmp/reg2/s17-mech.mjs`）：`.sheet` 有 3 个子元素（`.stub-cell` / `.perf` / 主联），`withImg = 2`（`.stub-cell` 与 `.perf` 里都有 `<svg>` 齿孔/骑缝章）⇒ 画廊判据 `3 >= 3 && 2 >= 1.5` 为真 ⇒ `tracks = 0`。**`.sheet` 是被画廊判据剔掉的，不是被窄轨剔除的。**（窄轨剔除确实也会把它从 3 降到 2，因为 16px < 32，但画廊判据先一步把它清成了 0。）

于是 `columns=3` 只能来自 `div.foot-grid`：实测 `433.328px 433.328px 433.344px 0px`，4 条轨道、剔掉 0px 后剩 3 条、三个子元素都不含图（`withImg=0`）⇒ 画廊判据不触发 ⇒ 记为 3 栏。**C9 报得准**：这个 3 确实来自页脚，不代表版式。

### 3c. 反方向：有没有「应该报但没报」的？

**S34 的排除是对的。** 实测 `columnsFrom === columnsInLandmark === "footer"`，版式的确就是 `<footer>` 这个元素本身（`style.css:196-199` 的 `footer { display:grid; grid-template-columns: repeat(auto-fit, minmax(240px,1fr)) }`，`index.html:103-121` 只有 3 个 `.foot-col`）。这是自洽的，不是「版心没找到」。判据用「`columnsFrom` 与 `columnsInLandmark` 同源」来区分，逻辑成立。

**全部 35 案的 `fromIsLandmark` 分支实测（这是 C9 里最容易写反的一处）**：

| columnsFrom | columnsInLandmark | strict equal | includes | fromIsLandmark | 结果 |
|---|---|---|---|---|---|
| `div.foot` | footer | false | false | false | 会报 |
| `footer` | footer | true | true | true | 排除 |
| `div.letterhead__top` | header | false | false | false | 会报 |
| `header.masthead` | header | false | **true** | **true** | 排除 |

⚠️ 发现一处**语义不一致**（不是回归，是判据含混）：`includes` 分支让 `header.masthead` 这种「在 header **里**的容器」也被当成「同源」而排除，但它和 `div.foot` / `div.foot-grid` 是同一种情况——只不过是 `header` 恰好是 `header.masthead` 的子串。当前 35 案里 `header.masthead` 只在 S20/S23 出现、且这两案都是 `layoutKind=fixed`，所以不走 C9，**没有实际影响**。但这条 `includes` 分支是脆的：如果哪天有个 `no-column-layout` 案的 `columnsFrom` 是 `div.x-header-y`，会被静默排除。建议记在案。

**其他 `lk ≠ no-column-layout` 但 `columnsFrom` 落在 landmark 的案（C9 不管，方向相反）**：S10 / S19 / S20 / S23 / S25 / S26 / S33 / S35 共 8 案。这些案 `columns` 同样来自页头/页脚，但因为 `layoutKind` 说「有分栏」，说明版心另有容器在，属合法。与 probe 注释里记的「14 案的 columnsFrom 落在 landmark，其中 6 案被判 no-column-layout」完全对上（6 案 = S09/S13/S14/S16/S17/S34）。**C9 的覆盖面与 probe 的事实一致，无漏报。**

**结论：C9 报的 5 案全部报得对；S34 的排除正确；无「应报未报」。**

---

## §4 sceneIndex 改动核对

方法：从 `build-prompts.mjs` 抠出 `SCENE_INDEX` 字面量求值，与 `git show 1f801f9^:` 的旧版逐词比较。

### 4a. 结构性检查

- **词条数**：44，与改动前一致（无增删）。
- **悬空案号**：0（新加的 S15/S21/S31–S35 全部存在）。
- **`direct` 被改动的词条：0 条**（逐个比对 `JSON.stringify(direct)`，与改动前完全相同）。
- **`near` 删除：0 条**；新增 12 条，全部是追加。
- **`direct ∩ near` 重叠：0**；`near` 内重复：0。
- **覆盖率**：27/35 → 34/35，未覆盖只剩 S10（其「B 端采购/工程规格/研究机构」确实不在 44 词表里，符合 commit 说明）。

### 4b. 新增 12 条 `near` 的逐条依据（拿该案 `data.js` 的正文与之对词）

| 词 → 案 | 该案正文里的支撑 |
|---|---|
| 出版 → S34 | 「写作课、编辑服务、翻译、**出版**」 |
| 教育 → S34 | 「**课程**说明」「**写作课**」「**学员**不同意露脸」 |
| 工业设备 → S35 | 「**设备**、工具、服务系统」 |
| 开发者工具 → S35 | 「设备、**工具**」「**命令式**组织」「**命令行**语气」 |
| 运维 → S35 | 「**状态页** / **更新日志**」 |
| 数据看板 → S35 | **0 个** —— 见下 |
| 档案 → S15 | 「**档案**馆、**博物馆**、研究机构」「**档案**条目之间」 |
| 修鞋理发 → S31 | 「**修表修鞋**、开锁配钥匙、**裁缝**改衣、**家电维修**」 |
| 花店 → S32 | 「**花艺**工作室」「**花店**」 |
| 摄影 → S32 | 「**摄影**、装帧、定制家具」 |
| 律师 → S33 | 「咨询 / 设计 / **法务**」 |
| 会计 → S33 | 「**对账**表」「青灰**对账**簿」 |

**唯一失据：`数据看板 → S35`。** S35 的正向段只写了「技术产品的状态页 / 更新日志」与「设备、工具、服务系统」，**通篇没有「看板/仪表/图表/指标/监控/dashboard」任何一个词**。把 S35 加进「数据看板」是靠「状态页/更新日志」的间接引申。这不算「加进了完全不相关的词」（S35 的阿什新闻纸 + 命令行语气确实能做状态页），但它是 12 条里唯一没有词汇依据的，比 commit 说明里「每一条映射都从 scenesYes 原文里摘」的表述要松。S34 加进「花店」的担忧不成立——S34 只被加进「出版/教育」，没有进「花店」。

### 4c. 对闸门的影响（换回旧 sceneIndex 复算同一条判据）

| | 旧 sceneIndex | 新 sceneIndex |
|---|---|---|
| `scenes-search-only` WARN 数 | 17 | 17 |
| `scenes-chip-only` FAIL 数 | 1（修鞋理发→S09） | 1（修鞋理发→S09） |

**新增的 12 条 `near` 没有制造新的 WARN，也没有掩盖旧的 WARN。** 那条 `修鞋理发→S09` 的 FAIL 是**既有缺陷**（S09 正文写「独立餐饮」，没有「修鞋理发」四字），与本次改动无关——而且本次给「修鞋理发」加了 `near: ["S31"]` 而不是 `direct`，所以没有把它弄红更多。

**结论：sceneIndex 无回归。** 一处弱依据（数据看板→S35）记录在案。

---

## §5 全库闸门

| 闸门 | 结果 | 有无由绿转红 |
|---|---|---|
| `quarter.mjs --dry-run` | **全部 17 步通过**（7 步因 dry-run/未开 --render 跳过） | 无 |
| `check-twolines.mjs` | FAIL 0 / WARN 0（R1 35/35、R6 30/35、R7 35/35、R8 35/35、R5 INFO 46/76） | 无 |
| `check-scenes.mjs` | FAIL 0 / WARN 17 / INFO 1（17 条全为 `scenes-search-only`，与 §4c 复算一致） | 无 |
| `check-docs.mjs` | 13 PASS / 0 FAIL / 0 WARN（含「提示词长度 1827–2159，中位 1979」与改动后的实测一致） | 无 |
| `check-prompts.mjs` | FAIL 0 / WARN 1（S13 的「14%」只在注释里） | 无 |
| `check-prompts.mjs --selftest` | 8/8 变异全响 | 无 |
| `check-contract.mjs` | FAIL 0 / WARN 6 / INFO 2（WARN 含 5 条 C9 + C5 的 1 条） | 无 |
| `check-contract.mjs --selftest` | C7 变异响（1/1） | 无 |
| `check-scenes.mjs --selftest` | 7/7 符合预期 | 无 |
| `_banner-check.mjs` | 3 条 banner 断言 + 1 条附 = 4/4 通过 | 无 |
| `_d1-bypass-test.mjs` | 10/10 符合预期 | 无 |

**无一步从绿变红。** 唯一需要记录的是 `check-contract` 的 WARN 从 1 涨到 6——涨的 5 条全是 C9 自己新报的，属于「新判据暴露既有缺陷」，不是「新判据误报」（§3 已逐案核实报得对）。

⚠️ **C9 没有 selftest 覆盖**：`check-contract.mjs --selftest` 只变异 C7（`layoutKind-removed`），没有一条变异验证 C9 会响。C9 的判据里已经写反过一次（commit message 自己记了「第一版用 `!s.columnsInLandmark`，方向写反，从不触发」）。目前它靠「跑一次看到 5 条 WARN」证明自己能响，而不是靠变异。这是本仓库反复出现的病（新断言没有变异测试），建议补一条。

---

## §6 数据链一致性

```
$ node prototypes/_prompts/build-prompts.mjs
$ git diff --stat prototypes/_selection/prompts.js
（无输出）
$ md5sum prototypes/_selection/prompts.js
804930615e3098842ed303cd09cbd609 *prototypes/_selection/prompts.js
$ git show HEAD:prototypes/_selection/prompts.js | md5sum
804930615e3098842ed303cd09cbd609 *-
```

**逐字节一致。** 重生成后工作树干净（`git diff --stat` 无输出），与 `HEAD` 的 md5 相同。

### 但重生成时 stderr 打出一行自相矛盾的数据

```
识别出主色的案：31/30（其余 9 案没有可靠主色标记，按 :root 声明顺序取，见 banner）
```

`31/30` 与「其余 9 案」不可能同时成立（31 + 9 = 40 ≠ 35）。根因是 `build-prompts.mjs:487` 的分母写死 `/30`，而实际已扩到 35 案。实测有主色的是 31 案、无主色的是 4 案（S32 S33 S34 S35）。

这条**不入库**（只是 stdout/stderr 输出），但它正是 `c998753` 那个 commit 要修的同一类问题的兄弟——`prompts.js` banner 里的「30」被修成了「35」，而生成器控制台里的「/30」被漏掉了。严重度中：这是跑步者唯一能看到的进度反馈，写错会让人以为有 40 个案。

---

## 附：本次审计的复现命令

```bash
# §1 old/new hexes 对照（需要旧版度量器）
git show f7e5e88^:deliverables/74-q7/measure.mjs > /tmp/reg2/measure-old.mjs
# 仅替换 ROOT 与 Browser import 为绝对路径，不改判据
node /tmp/reg2/hexes-batch.mjs           # 并发 4，CDP 超时的案需串行重跑

# §1b @media 丢色复现：在临时目录放一个 index.html，
#      媒体查询里给 <rect> 设 fill，分别用新旧度量器跑

# §2 D1 逐案复算
node /tmp/reg/d1-probe.mjs               # 独立重写六条子判据

# §3 C9 逐案
node /tmp/reg/c9-table.mjs               # 35 案 layoutKind/columns/landmark 全表

# §4 sceneIndex
node /tmp/reg/scene-diff.mjs             # 新旧 SCENE_INDEX 逐词 diff
node /tmp/reg2/scene-warn.mjs            # 换回旧表复算 check-scenes 的 WARN

# §5 闸门
node prototypes/_build/quarter.mjs --dry-run
node prototypes/_build/check-twolines.mjs
node prototypes/_build/check-scenes.mjs
node prototypes/_build/check-docs.mjs
node prototypes/_build/check-prompts.mjs
node prototypes/_build/check-contract.mjs

# §6 数据链
node prototypes/_prompts/build-prompts.mjs && git diff --stat prototypes/_selection/prompts.js
```
