# Lead 独立核实：提示词数据链的三个根因（精确到行）

> 测量时刻：2026-10-29 22:40–23:15 (Asia/Shanghai)
> 基线 HEAD：`03f6fd4`　受跟踪文件改动：0

---

## 数据链全貌

```
prototypes/Sxx/style.css ──┐
prototypes/Sxx/index.html ─┤
                           ├─→ extract-dna.mjs ──→ dna-raw.json
prototypes/_specs/Sxx.md ──┘                        │
                                                    ↓
                                             clean-dna.mjs ──→ dna-clean.json
                                                    │
                                                    ↓
                                          build-prompts.mjs ──→ prompts.js
                                                    │
                                                    ↓
                                   prompt-copy.js: buildStylePrompt(id)
                                                    │
                                                    ↓
                                        用户剪贴板（约 1800 字中文提示词）
```

---

## 根因 1：字号层级从未被抽取（确认）

### 证据

`prototypes/_prompts/clean-dna.mjs` 里，`font-size` 相关只有两处：

```
255:  * S03 就是这种案子：它的 h1 是 `<h1 class="d1">`，而 .d1 规则只在 @media 里给了字号、
708:  h1Size: r.h1Size,
```

第 708 行是**读取**，不是抽取——`r` 来自 `dna-raw.json`。真正的抽取在 `extract-dna.mjs`。

`prototypes/_prompts/extract-dna.mjs:111-114`：

```js
  // ---- h1 字号 ----
  let h1Size = "";
  const h1 = css.match(/h1\s*\{[^}]*font-size\s*:\s*([^;}]+)/);
  if (h1) h1Size = h1[1].trim();
```

**只有这一处**。而 `extract-dna.mjs:116-133` 的返回对象里，与字号相关的字段**只有 `h1Size` 一个**：

```js
  return {
    id, dir, structType, threshold, tone,
    colors, families, fontFaces, radii,
    shadowKind, shadowSample, dropSample,
    lineWidths: [...widths].sort(...),
    h1Size: h1Size,          // ← 唯一的字号字段
    mechanism, mechanismChars,
  };
```

### 后果

1. **整个字号层级（type scale）在数据层根本不存在**。30 案实测有 5–9 档字号（中位 8 档），但没有一档进入提示词。
2. `h1Size` 只匹配 `h1 { font-size: ... }` 这种字面写法。S01、S09 写的是 `h1 { font-size: var(--fs-h1); }`，所以抽到的是字面量 `"var(--fs-h1)"`，**2/30 案未解析**。

### 实测参照数据（`typescale-30.json`）

| 指标 | 值 |
|---|---|
| 字号档位数 | min=5，中位=8，max=9 |
| H1 字号 | min=56px，中位=81px，max=107px |
| 正文主导字号 | 13–20px（S03/S14/S19/S20/S23/S28/S30 是 13px，S16 是 20px）|

---

## 根因 2：`lineWidths` 的抽取口径错误（确认）

`prototypes/_prompts/extract-dna.mjs`（线宽段）：

```js
  // ---- 线宽分级 ----
  const widths = new Set();
  for (const m of css.matchAll(/(?:border(?:-(?:top|right|bottom|left))?|outline)\s*:\s*([0-9.]+)px/g)) {
    widths.add(m[1]);
  }
```

### 这个正则的四个缺陷

| # | 缺陷 | 后果 |
|---|---|---|
| 1 | 只匹配**简写** `border: 1px`，不匹配 `border-top-width: 1px` | 分离写法全部漏抽 |
| 2 | 完全不扫 `stroke-width`（CSS）和 `stroke-width`（SVG HTML 属性）| S19/S20/S24/S29 等以 SVG 线为主的案漏抽 |
| 3 | 不处理 `@media` 里的覆盖值对桌面档的影响 | 收入了窄屏专用值 |
| 4 | 不处理 `var()` ——`border: var(--rule)` 抽不到 | S07 等用变量的案漏抽 |

### 实测后果

| 问题 | 案数 |
|---|---|
| 实际用到「声称之外」的线宽 | **15/30** |
| 声称了但页面完全没用到 | **12/30** |
| 全库不同线宽值 | **22 种** |

最严重：**S25 声称只有 `3px`，页面实际用 1px 和 1.2px，一次 3px 都没用。**
最混乱：**S13 声称 7 级（1、2、3、5.5、7、9、14.5），实际只有 5 种（1、1.5、3、5、9）**，其中 1.5 和 5 从未声称。

### 还有一个设计层面的问题

22 种值里有 `1.1px`（S04）、`3.2px`（S24）、`3.6px`（S09）、`1.25px`（4 案）—— 这些不像设计分级，像**亚像素在设备像素比下的实测值**。

提示词是给 AI 的施工图。`3.6px` 对 AI 毫无意义，`1px 和 3px` 才有。

---

## 根因 3：调色板抽取漏了 S24 的 `#6E8B7A`（确认，1 案）

`prototypes/_prompts/clean-dna.mjs:510` 的 `pickPalette()` 从 `:root` 变量里挑，上限 7 个。

- 规格字段 3 声明了 `#6E8B7A`（S24 的抹茶灰绿）
- 页面实测渲染 **80 个元素**（`svg-stroke` 为主）
- 但 `dna-clean.palette` 没收录它

这是真遗漏。其余 5 个「规格声明但调色板缺失」的色值（`#6366F1`×4、`#3B82F6`×1）都是规格里的**负向示例**（「反的是 #6366F1」），本来就不该进色板。

---

## 附：我的测量错误记录（6 个坑）

这一节记录我自己犯的错，因为前几轮同类结论反复出错，根源都在测量方法。

| # | 错误 | 真相 | 修正 |
|---|---|---|---|
| 1 | 静态扫文件把「文字里提到的色」当「使用了该色」 | S28 的 `#A855F7`/`#EC4899` 是正文里写出来说明「我们离 AI 默认紫粉多远」的文字 | 改用 CDP `getComputedStyle` |
| 2 | `rgba(255,244,214,0.5)` 截断成 `#FFF4D6` | S08 的 `#FFF4D6` 是 50% 透明高光，最终像素不是这个色 | 解析颜色保留 alpha |
| 3 | 把 `#000000` 当实际用色 | 29/30 案有，但源码只有 S26 显式写过；其余是 `getComputedStyle` 默认值 | 先做源码反查 |
| 4 | 正则 `\b#` 在反引号后不匹配 | 差点得出「规格里一个 hex 都没有」的错结论 | 去掉 `\b` |
| 5 | 规格字段 3 有 3 种书写格式，只处理了 1 种 | 20/30 案解析失败，得出「解析不出声明」假结论 | 三种格式都处理 |
| 6 | **把浏览器默认 `outline-width: 3px`（`outline-style:none`）当成真实线宽** | 报出 22/30 超纲、`3px` 在 17 案出现（S07 有 566 次）；核查 S07 CSS，**没有任何 3px 边框** | 加 `outlineStyle!=='none'` 和 `borderStyle!=='none'` 判据 → **15/30** |

第 6 个坑影响最大：它把结论从「22/30 案线宽错了」变成「15/30」，差 7 个案。

---

## 相关探针

| 探针 | 作用 |
|---|---|
| `LEAD-anchor-and-scale.mjs` | 30 案字号层级 + `<a>` 渲染色 → `typescale-30.json` |
| `LEAD-linewidth-fixed.mjs` | 修正后的线宽实测 → `linewidths-fixed-30.json` |
| `LEAD-trace-3px.mjs` | 证明 `3px` 是 outline 默认值（3px 元素数=0）|
| `LEAD-rendered-colors.mjs` | 30 案渲染颜色 → `rendered-colors-30.json` |
| `LEAD-dump-30-prompts.mjs` | dump 30 条线上提示词的配色句/线宽句 |
