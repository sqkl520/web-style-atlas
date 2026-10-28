# Lead 实测：`_selection` 重跑闸门的真实结论（推翻了 6 天前的报告）

- 测量时刻：2026-10-28 23:16 (Asia/Shanghai)
- HEAD：`ce4ea78`
- 命令：`node tools/taste-skill/skills/taste-skill/scripts/inspect.mjs prototypes/_selection/index.html --out deliverables/68-plan/_sel-fresh --json`
- 实测耗时：**53.6 秒**
- exit code：**1**（有 FAIL）

## 结论：`FAIL 2 / WARN 2`

```
[FAIL] body-size   w=1440  Body text is 13px (the size most of the running text is set in).
[FAIL] hairline    w=768   2 thin rule(s)/divider line(s): details#mast-fold.mast-fold 712px | dl#facts.mast-facts 712px
[WARN] no-footage  w=1440  No video anywhere on the page.
[WARN] measure     w=1440  Longest paragraph runs about 109 characters per line.
```

6 天前的报告（`.inspect/report.json`）说 **FAIL 0 / WARN 2**。

## 与 6 天前报告的逐项差异

| 指标 | 6 天前 | 现在实测 | 判定 |
|---|---|---|---|
| `body.size`（三档） | **16px** | **13px** | 变成了 FAIL 的直接原因 |
| `surfaces.hairlines` @768/390 | **0** | **2** | 新增 FAIL |
| `surfaces.hairlines` @1440 | 0 | 24（静态数） | 1440 档动态测量未报 |
| `page.height` @1440 | 13,635 | **8,792** | 面板变浅 36% |
| `page.screens` @1440 | 15.2 | **9.8** | |
| `page.height` @768 | 29,426 | **15,051** | 几乎减半 |
| `page.screens` @768 | 28.7 | **14.7** | |
| `page.height` @390 | 22,707 | **11,598** | |
| `page.screens` @390 | 26.9 | **13.7** | |
| `type.sizes` @390 | `[11,13,14,16,17,20,24,28]` | `[13,14,15,16,20,26]` | 下限从 11 抬到 13 ✓ |
| `hero.size` @390 | 28px | **26px** | `--s-h1` 接回后的连带 |
| `realPictures` @390 | **30** | **0** | ⚠️ 移动端真实图片归零 |
| `realPictures` @768 | **90** | **30** | |

**向好**：页面高度减半（面板变浅是本轮成果）、字号下限抬到 13px。
**变坏**：`body-size` 与 `hairline` 两条新 FAIL、390 档真实图片 30→0。

## `body-size` FAIL 的根因（已查明）

规则定义（`lib/rules.mjs`）：
```js
if (m.type.body && m.type.body.size < 15) add('FAIL', 'body-size',
  `Body text is ${m.type.body.size}px (the size most of the running text is set in).`,
  'Body copy 16–20px. Map small sizes from blueprints onto your body step.');
else if (m.type.body && m.type.body.size < 16 && !mobile) add('WARN', 'body-size', ...);
```

判据是「**running text 主导字号**」——按可见文本字符数统计得出。

我用 CDP 实测可见文本的字号分布（跳过 `display:none`、`visibility:hidden`、以及未展开的 `<details>` 内容）：

```
=== 1440x900 ===
  主导字号: {size:13, chars:10825, share:90.5%}
  top5: 13px 90.5% | 16px 3.5% | 14px 2.6% | 20px 1.3% | 15px 1.1%
  可见总字符: 11,956

=== 768x1024 / 390x844 ===
  主导字号: {size:13, chars:10432, share:93.4%}
  top5: 13px 93.4% | 16px 3.8% | 20px 2.2% | 15px 0.3% | 14px 0.1%
```

**13px 占可见文本 90.5–93.4%。**

而 `--s-13` 在 `style.css` 里被用了 **36 处**：标签、元数据、图注、提示、配色行、闸门行、模板行、折叠条 summary……

**关键矛盾**：真正的正文确实写的是 16px——
```
.row-def    → font-size: var(--s-16)
.field dd   → font-size: var(--s-16)
.parts li   → font-size: var(--s-16)
```
但 `.field dd` 在**默认收起的折叠块里**，`.row-def` 只有一句话（3.5%）。所以「字符数最多」的是 13px 的标签堆。

## 这个 FAIL 是"好意图导致坏结果"

上一轮的执行 C 为了修 `small-text` 规则（禁止 <13px），把 `.cap` 从 12px → 13px。这是对的。
同时 `1753f94` 补了 `--s-15`（15px）。
但结果：**13px 的用量太大，在"字符数占比"这个判据下成了"正文"**。

这不是任何一个 Agent 的错，是**两个正确决策叠加出的副作用**，且**没有任何闸门能发现它**（因为 `_selection` 不在 `--all` 里）。

## `hairline` FAIL 的细节

```
@768: details#mast-fold.mast-fold  712px
      dl#facts.mast-facts          712px
```
规则原文："Thin rule / divider line. Separate with space, tone or scale; lines belong to real tables and form fields."

`#mast-fold` 是页头的折叠条（`details`，`border-top: 1px`）；`dl#facts` 是页头的统计数字表。**后者是 `dl`（定义列表），可能属于 "real tables"；前者是折叠控件边框。**

## 390 档 `realPictures` 从 30 归零 —— 根因已精确定位

`probe.mjs` 的判据（`lib/probe.mjs`）：
```js
const r = el.getBoundingClientRect();
if (r.width < 120 || r.height < 90 || r.width * r.height < 160 * 120) continue;  // 160*120 = 19200
```

我用 CDP 实测 `_selection` 三档缩略图：

```
=== 1440x900 ===  可见 img 30 / 过闸门 30
  尺寸分组: [["316x178", 30]]     面积 56,169  → 通过（阈值 2.9 倍）

=== 768x1024 ===  可见 img 30 / 过闸门 30
  尺寸分组: [["380x214", 30]]     面积 81,225  → 通过（阈值 4.2 倍）

=== 390x844 ===  可见 img 30 / 过闸门 0
  尺寸分组: [["160x90", 30]]      面积 14,400  → 差 4,800（25%）不到
```

**`160×90` 正是上一轮执行 A 为压首屏「图宽 176 → 160」的结果。** 它把缩略图从「勉强过阈值」压到「刚好不过阈值」。

若要过阈值（保持 16:9）：
- 宽需 ≥ **185px**（`0.5625w² ≥ 19200` → `w ≥ 184.7`）
- 或改成 4:3：160×120

**但加宽会撑高卡片，可能破坏上一轮刚做出来的「390 首屏 1 张完整卡」。** 这是一个真实的权衡，不是 bug。

**注意**：`few-pictures` 规则只在 `width >= 1100` 时检查：
```js
if (width >= 1100 && m.page.realPictures != null) {
  const pics = m.page.realPictures + m.page.uiPictures;
  if (pics < 4) add('FAIL', 'few-pictures', ...);
```
所以 390 档 `realPictures=0` **不会**触发 `few-pictures` FAIL——这解释了为什么新报告里没有这条规则。**也就是说：这个"归零"是闸门测出来了，但闸门不判它。**

## 待办

1. `body-size` FAIL：要么把正文类选择器真的提到 16px（但 `.field dd` 已经是 16px，问题在折叠），要么**展开折叠时让 16px 正文可见**，要么给 `_selection` 加 `body-size` 的豁免（因为工具界面的"正文"定义与营销页不同）。
2. `hairline` @768：`#mast-fold` 和 `#facts` 的两条 1px 线。
3. 报告要刷新：现在库里的 `.inspect/report.json` 是 6 天前的，且与现状不符。
4. `check-stale.mjs` 要不要覆盖 `_selection`？如果要，它会把 `_selection` 判定为"陈旧"（因为 report.json 比 style.css 旧），从而**第一次让这个漂移可见**。
