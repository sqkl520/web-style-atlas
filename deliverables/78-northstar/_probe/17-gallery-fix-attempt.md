# 修 probe.mjs 画廊判据：离线模拟的失败尝试

> 2026-11-13　主线程
> 结论：**我的修法改动面过大，而且引入了比原问题更糟的退步。没有改。**
> 这份文件记录为什么不动它 —— 免得下一个人以为「已知缺陷但没人管」。

---

## 一、原缺陷

`probe.mjs:279-284` 的画廊判据：

```js
const kids = [...el.children];
if (kids.length >= 3) {
  const withImg = kids.filter((k) => k.querySelector('img, picture, svg, canvas')).length;
  if (withImg >= kids.length / 2) tracks = 0;   // 判为画廊
}
```

S17 的 `.sheet` 被它误杀：3 个子元素、2 个含图 → 判为画廊 → `tracks = 0` →
真版心连候选都没进，最后从页脚取了 3 栏。

**实测根因**（`_s17-sheet.mjs`）：

```
.sheet  334px 16px 1002px   3 轨
kids    ASIDE.stub-cell / DIV.perf / DIV.main-cell
withImg 2（stub-cell 和 main-cell 各含图）
文字量  937 字
```

三个子元素是**功能不同的三个区**，不是重复单元。判据把「多个子元素且过半含图」
当成了「重复单元」。

---

## 二、我提的修法

两条：

1. **不把 `svg` 算作图片** —— 很多案用 SVG 画装饰线（S17/S20/S33 都是）
2. **加文字量下限** —— 容器文字 < 200 字的可能是画廊

---

## 三、离线模拟结果：改动面过大，且引入退步

脚本 `_gallery-fix-sim.mjs`，在真浏览器里对 35 案分别算「旧判据选中」与「新判据选中」。

**18/35 案改变了选择。** 其中有三处明显是**退步**：

| 案 | 旧选中 | 新选中 | 问题 |
|---|---|---|---|
| S21 | `div#board-grid` 10 轨 / 262 字 | `div.figs` 3 轨 / 533 字 | `figs` 是图片组，不是版心 |
| S27 | `ul.spec-list` 9 轨 / 445 字 | `ul.plates` 9 轨 / 1032 字 | `plates` 是版画组 |
| S20 | `header.masthead` 2 轨 / 324 字 | `ul.plates` 4 轨 / 554 字 | 仍然是图组 |
| S23 | `header.masthead` 2 轨 / 334 字 | `ul.plates` 6 轨 / 459 字 | 同上 |

**根因**：去掉 `svg` 计数之后，「图组」不再被识别为画廊了。
S20/S21/S23/S27 的 `plates` / `figs` 全是 SVG 画的图，原判据靠 SVG 计数把它们排除，
我的修法把这个能力拿掉了。

「不把 svg 算作图片」这条，我本来是为了救 S17，但它同时放出了四个更糟的错误选择。

### 3.1 变好的那几处

改对的：

| 案 | 旧 | 新 | 评价 |
|---|---|---|---|
| S17 | `div.foot-grid` 3 轨 / 194 字 | `div.sheet` 2 轨 / 937 字 | ✅ 真版心 |
| S13 | `div.letterhead__top` 2 轨 / 110 字 | `main.dossier` 16 轨 / 1845 字 | ✅ 真版心 |
| S14 | `div.foot-grid` 3 轨 / 263 字 | `ul.plates` 4 轨 / 600 字 | 存疑，`plates` 是图组 |
| S24 | `div.motion__grid` 2 轨 / 548 字 | `div.fork__grid` 8 轨 / 1151 字 | ✅ 更多正文 |

即使是「改对」的那几处也有问题：S17 新判据报 **2 轨**，而 `measure.mjs` 报 **3 轨**
（`334px 16px 1002px` 含 16px 中缝）。两套实现的「剔窄轨」条件不同，
这会让「轨道数」这个量继续有两套口径。

### 3.2 还有三案完全没解决

```
S33  footer  3 轨 / 127 字   （新判据仍选 footer）
S34  footer  3 轨 / 141 字
S35  footer  3 轨 / 133 字
```

文字量下限 200 应该拦住它们，但它们仍在候选里 —— 因为**页脚的文字量是唯一候选里最大的**，
而这三个案子的版心确实没有多栏（它们是 `no-column-layout`）。
所以对这三案，「选中 footer」其实是当前逻辑下不可避免的结果，
只能靠 `layoutKind` 把它们标出来（已经做了）。

---

## 四、我的决定：不改

理由：

1. **改动面 18/35，其中至少 4 处是退步。** 修 1 个问题、造 4 个问题，不划算。
2. **`layoutKind` 已经绕开了这个缺陷**。它只认不在 landmark 里的容器，
   所以 S17 现在被标成 `no-column-layout` —— 虽然不理想（它其实有版心），
   但至少不会拿页脚的 3 栏去判 S17 的对错。
3. **真正的修法需要两套判据合流**，而不是给 `probe.mjs` 打补丁：
   `measure.mjs` 已经证明了「括号感知切分 + 剔窄轨 + 排除页头页脚 + 按文字量排序」
   这套组合在 13/13 个失败案例上都选对了。正确做法是**把 `measure.mjs` 的选择逻辑
   整体搬进 `probe.mjs`**，而不是逐条改判据。
   那是一次真正的重构，需要全库重渲染验证，不该在收尾时做。

---

## 五、留下什么

- 缺陷仍然存在：13/35 案的主容器是页头/页脚/导航
- 已用 `columnsInLandmark` 字段暴露出来（`layoutKind` 里绕开）
- `measure.mjs` 的对账不受影响（它有自己的正确实现）
- **影响范围**：只有 `report.json` 里的 `structure.columns` 这个字段不可靠。
  本轮的十案对账用的是 `measure.mjs`，不受它影响。

### 5.1 如果以后要修，从哪开始

```bash
# 1. 先看 measure.mjs 的选择逻辑（那是已验证正确的版本）
sed -n '160,240p' deliverables/74-q7/measure.mjs

# 2. 用这个脚本评估任何改动的面
node deliverables/78-northstar/_probe/_gallery-fix-sim.mjs

# 3. 判据：改完之后，变好的案数必须远大于变差的案数，
#    且 S01/S28 这类已确认正确的案不能被改坏
```

**验收基线**（当前已确认正确的）：

```
S01  div.columns      4 轨  1451 字
S28  div.press__grid 16 轨   733 字
S31  div#blocks.blocks 4 轨  862 字
S22  div#sheet.sheet 13 轨  1046 字
```

任何改动都不能动这四个。
