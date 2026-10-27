# 移动端 / 键盘可达性 5 条缺陷的修复（选型台）

改动面：`prototypes/_selection/app.js`、`prototypes/_selection/style.css`，两个文件，未 commit。
未碰 `prompt-copy.js` / `data.js` / `prompts.js` / `README*` / `check-docs.mjs` / `prototypes/S*/` / `templates/`。

先给结论，再逐条给证据：

| # | 缺陷 | 审计说的 | 我复现到的 | 修法 | 状态 |
|---|---|---|---|---|---|
| 1 | `#q-parked` 的 `hidden` 失效 | 三档全渲染、可 Tab | **已在工作树里被并发 Agent 修好**（主开关）；但"只有一个来源"是两行约定，缺兜底 | 补 `#q-parked[hidden]{display:none!important}` + 重建现场证明兜底有效 | 兜底已加 |
| 2 | 打开详情后焦点仍在 body | `activeElement` = body，87 次 Tab | 确认（焦点停在行卡，从那里到面板 30 次 Tab） | `open()` 移焦到 `.detail-head`，`close()` 还回行卡 | 已修 |
| 3 | `Esc` 在 summary 上关掉整个面板 | 面板关闭 | 确认（`detail.hidden` 变 true、`hash` 清空） | detail 上委托拦截 → 退到面板头，不关闭 | 已修 |
| 4 | `--s-15` 从未定义 | 回退到 16px | 确认（`getPropertyValue` 空串，两处都渲染成 16px） | 补 `--s-15: 15px`（**不是**改回 14/16，见理由） | 已修 |
| 5 | 390 档页头模板链接 20px 高 | 20px，24px 圆撞 M03 | 确认（三段都 20px，M03 折成两段） | `.mast-exit a { padding: 2px 0 }` → 24px，零排版代价 | 已修 |

---

## 0. 复现方法（先说清楚，否则下面的数字没有意义）

探针：`deliverables/66-exec/_a11y-probe.mjs`（改前/改后同一支脚本，`--tag before|after`）。
输出：`_a11y-before.json` / `_a11y-after.json`，下面所有引用都能在这两份里对上。

三件必须说清的事：

1. **键盘全走真 CDP 输入**（`Input.dispatchKeyEvent`），不用合成 `KeyboardEvent`。
   合成的 `isTrusted=false` 事件不触发浏览器默认行为（Tab 移焦、summary 开合），
   而缺陷 2/3 恰恰都是默认行为参与的结果。用合成事件量出来的数字不可信。
   顺带踩到一次：Enter 不带 `text` 字段时 `<summary>` 不会开合，我一度以为是页面缺陷，
   补上 `text:'\r'` 就正常（见 `_a11y-keycheck.mjs` 的三变体对照）—— 那是探针的坑。
2. **"改前"不是 HEAD**。HEAD 里根本没有 `syncParked()`（那是并发 Agent 未提交的改动），
   而缺陷 1 的现场正是"写了 inline-flex、还没补 `[hidden]` 兜底"这一版。
   所以改前证据分两种：
   - 缺陷 2/3/4/5：直接在**工作树改前状态**上量（我第一次跑 `--tag before` 时还没开始改）；
   - 缺陷 1：现场已被并发 Agent 改了主开关。我用 `_a11y-shots-before.mjs` 把当前
     `_selection/` 整份复制到 `_before-clone/`，**只回退我改的那 5 处**（逐条字符串替换，
     找不到锚点就抛错），其余一字不动。改前/改后截图出自同一份数据与同一套代码。
3. 两个视口各测一遍：1440×900（dsf 2）与 390×844（dsf 2、mobile）。

---

## 缺陷 1：`#q-parked` 的 `hidden` 失效

### 改前证据

**这一条的主开关已经被并发 Agent 修好了**，我开工时 `syncParked()` 末尾已经是：

```js
el.hidden = !state.qParked;
el.style.display = state.qParked ? 'inline-flex' : 'none';
```

所以直接量工作树，`#q-parked` 在空状态下是 `display:none`、`tabbableButtons = 0`。
但这只证明"当前这一刻是对的"，不证明审计说的那个 bug 存在过。要给出可对照的改前数字，
就得**重建现场** —— 把内联 `display:inline-flex` 写回去、`hidden` 只走 `el.hidden`，
也就是审计截图里那条"两个光秃秃按钮"的空壳。

改前（`_a11y-before.json` → `d1.restored`，重建现场）：

```
390 :  display=inline-flex  h=35.5  tabbableButtons=2  docH=17380
1440:  display=flex         h=35.5  tabbableButtons=2  docH=8780
```

从搜索框真按 Tab，1440 档前两次就停在那两颗假按钮上：

```
1440 restored tabWalkFromSearch:
  ["button 放回搜索", "button 丢弃", "select#sort 方案号 …", "button#reset 清空筛选", "li S01…"]
```

390 档因为这条被挪到主区顶部（`syncParked` 的窄屏分支），Tab 序列里没撞上，
但它仍然占着 35.5px、仍然可点 —— `tabbableButtons=2` 是一样的。

改后（`_a11y-after.json` → `d1.restored`，**同一个现场重建**，兜底规则在位）：

```
390 :  display=none  h=0  tabbableButtons=0  docH=17308
1440:  display=none  h=0  tabbableButtons=0  docH=8773
```

同一段 JS 写回了内联 `display:inline-flex`，`display` 依然是 `none` —— 兜底生效。

### 修法与理由

```css
#q-parked[hidden] { display: none !important; }
```

**为什么选 CSS 兜底，而不是任务书给的另一个选项（改用 class 切换）：**

`syncParked()` 本来就在动内联样式 —— 窄屏（≤980px）要把这条改成 `position:fixed` 的底栏、
宽屏再还原，那些全是内联的。再引一套 class 管显隐，等于让"显示状态"同时有两个来源，
而**这个 bug 的成因恰恰就是"显示状态有两个来源"**（内联 display 一个、hidden 一个）。
再加一个来源不是修它，是扩大它。

反过来说，既然主开关已经改好（内联 display 与 hidden 同源），这条 CSS 正常路径上
永远不会命中。留它的理由不是"怕现在坏"，而是："同源"这件事靠的是**两行必须一起改**，
而这种约定迟早会被改坏一半 —— 这个 bug 本身就是"只改了一半"的产物。作者样式表里的
`!important` 在层叠顺序上高于内联（非 `!important`）声明，于是"hidden 为真 ⇒ 不可见"
变成一条不依赖 JS 的不变量。

**顺带证明兜底没有把该显示的藏掉**（`_a11y-regress.json`）：

```
1440: display=flex  h=35.5  visible=true  label=已暂存搜索词「咖啡店」——芯片正在按行业筛
390 : display=flex  h=35.5  visible=true  label=已暂存「咖啡店」
```

点「放回搜索」后：`q=咖啡店`、`benchParked=null`、`chipStillPressed=0`、条子消失 —— 路径没断。

### `git diff` 片段

```diff
@@ -231,4 +277,30 @@ code { font-family: var(--code); font-size: 0.94em; }
 .btn-quiet:hover { border-color: var(--ink); color: var(--ink); }
 
+/* ── 暂存条 #q-parked 的显隐：第二道锁，不是主开关 ─────────────────────────
+ * 2026-10-27 修（审计 deliverables/66-audit/mobile-390.md §7.4 点名的"假控件"）。
+ *
+ * 【当时的 bug】#q-parked 由 app.js 的 syncParked() 建出来，display 写在**内联样式**
+ * cssText 里（inline-flex），显隐却只用 el.hidden 切换。内联声明压过 [hidden] 的 UA
+ * 规则 display:none，于是 hidden=true 时它照样渲染成一条"两个光秃秃按钮"的空壳：
+ *   三档视口都白占 35.5px（390 档 .bar 159.4 → 145，首卡 top 1003.6 → 989.2）
+ *   空状态下它里面「放回搜索 / 丢弃」两颗按钮仍在 Tab 序列里（实测 tabbableButtons = 2，
+ *   从搜索框 Tab 一次就停在「放回搜索」上 —— 一颗点了什么都不会发生的按钮）。
+ *
+ * 【主开关在哪】app.js syncParked() 末尾已经改成"内联 display 与 hidden 同源"
+ * （el.hidden = !state.qParked; el.style.display = state.qParked ? 'inline-flex' : 'none'）。
+ * 也就是说正常路径上这条 CSS 规则永远不会命中。
+ *
+ * 【那为什么还要它】因为"只有一个来源"这件事靠的是**两行必须一起改**，而这类约定迟早
+ * 会被下一个人改坏一半（这个 bug 本身就是"只改了一半"的产物）。作者样式表里的 !important
+ * 在层叠顺序上高于内联（非 !important）声明，所以这条规则把"hidden 为真 ⇒ 不可见"
+ * 变成一条不依赖 JS 的不变量：哪怕以后有人只改 hidden、又把内联 display 写回去，
+ * 也长不出假控件。
+ *
+ * 【为什么不用 class 切换（任务书给的另一个选项）】syncParked() 本来就在动内联样式 ——
+ * 窄屏（≤980px）要把这条改成 position:fixed 的底栏、宽屏再还原，那些都是内联的。
+ * 再引一套 class 管显隐，等于让"显示状态"同时有两个来源，而那正是这个 bug 的成因。
+ * 把内联 display 留在原地、只补一条 CSS 兜底，改动面小且不新增第二种机制。 */
+#q-parked[hidden] { display: none !important; }
+
 /* ── 清单：每一行是一张账页，不是一个 tile ─────────────────── */
```

截图（390 档，空状态）：
[before-390-4-no-parked.jpg](shots-a11y/before-390-4-no-parked.jpg) —— 视口底部挂着「放回搜索 / 丢弃」，而搜索框是空的；
[after-390-4-no-parked.jpg](shots-a11y/after-390-4-no-parked.jpg) —— 同一位置干净。

---

## 缺陷 2：打开详情后焦点仍在 body

### 改前证据

`_a11y-before.json`，键盘打开 S03（行卡已聚焦 + Enter）：

```
activeAfterEnterOpen: { tag: "li", cls: "row is-in", inDetail: false }   ← 焦点留在行卡上
detailOpenAfterEnter: true                                               ← 面板确实开了
detailRect: { top: 0, h: 900, display: "flex" }                          ← 面板确实可见
```

鼠标点击路径同样：`activeAfterMouseOpen = { tag:"li", cls:"row is-in", inDetail:false }`。

审计说"仍在 `body`"。我量到的是"仍在行卡"（`li.row`）—— 两者都指向同一个事实：
**焦点没有跟着进入新内容**。差别只在测量时机/起点：审计是在 `el.click()` 之后量的
（程序化 click 不跑 mousedown→focus，所以焦点留在了 body），我是用真鼠标与真 Enter 量的。
这个差异值得写下来，但结论方向一致。

关于「87 次 Tab」：我用三种口径分别量了，三个数都在说同一件事，但**不能混用**
（`_a11y-tabcalib.mjs` + `_a11y-tabcount2.mjs`）：

```
① 纯 DOM 顺序下标（复刻审计 m7-tabindex.mjs 的选择器）：95 个可聚焦元素，#detail 内第一个排在 87
② 从页首第一个可聚焦元素真按 Tab → 进面板：86 次（与 ① 差 1 = 下标 1 起算）
③ 打开 S01 后焦点停在行卡，从**那里**继续按 Tab → 进面板：30 次
```

所以"87"对（全页口径），但**用户刚点开一个案时实际遭遇的是 30 次**。

### 改后证据

```
1440 / 390 一致：
activeAfterMouseOpen: { tag:"div", cls:"detail-head", inDetail: true, text:"S01 红黑斜排报 …" }
activeAfterEnterOpen: { tag:"div", cls:"detail-head", inDetail: true, text:"S03 长曝光观测站 …" }
tabCountFromBodyToDetail: 1     （改前 30；按 ① 口径则是 87 → 焦点已在面板内，不再需要）
```

**`document.activeElement` 是 `.detail-head`（`div.detail-head`），在 `.detail` 内。**

焦点可见性（WCAG 2.4.7，`_a11y-focusring.mjs`）：

```
byKeyboard: matches(':focus-visible')=true  outline="2px solid rgb(31,60,96)" offset=-2px
byMouse   : matches(':focus-visible')=false outline-style=none
```

焦点环截图（只裁 `.detail-head`，不缩放）：
[zoom-after-detail-head.png](shots-a11y/zoom-after-detail-head.png) —— 2px 深蓝环；
[zoom-before-detail-head.png](shots-a11y/zoom-before-detail-head.png) —— 无环。
整页对照：[after-1440-3-detail-focus.jpg](shots-a11y/after-1440-3-detail-focus.jpg) /
[before-1440-3-detail-focus.jpg](shots-a11y/before-1440-3-detail-focus.jpg)

### 关闭后焦点回到触发它的行卡

```
close.focusBeforeClose : div.detail-head（在面板内）
close.activeAfterClose : li.row is-in   ← 行卡
close.targetRowIsS03   : true           ← 正是刚才打开的那一案
close.detailHidden     : true
Esc 路径（焦点在面板头按 Esc 关）：before=div.detail-head → after=li.row(S05)，detailHidden=true
```

### 修法与理由

`open(id, opts)` 里在 `detail.hidden = false` **之后**调 `focusIntoDetail()`；
`close(opts)` 在真的关掉面板、且焦点原本在面板内或 body 上时调 `focusBackToRow(id)`。

**为什么落点是 `.detail-head` 而不是第一个可聚焦控件 `#d-close`：**

1. 面板是"换了一个阅读上下文"，不是弹确认框。落点应先说出「你现在看的是哪个案」，
   而 `.detail-head` 的文本正是 `S01` + 中文名 + 英文名/结构型；屏读器聚焦容器会读出来。
   `#d-close` 读出来只有「收起」两个字，等于什么都没说。
2. Tab 顺序天然正确：head 之后紧跟就是 `#d-close`（DOM 里就是下一个兄弟），
   所以"进面板按一次 Tab 就能收起"零成本（实测 `tabCountFromBodyToDetail=1`）。
3. `tabindex="-1"` 只允许程序聚焦、不进 Tab 序列，不多出一个 Tab 站。

**为什么不记录 `activeElement` 而是用 `state.open` 反查行卡：** J/K 换案时 `activeElement`
是 body 或面板内部，但"我读到的是哪个案、该还回哪一行"始终由 `state.open` 唯一决定。

**两个不抢焦点的地方**（都是刻意的）：
- 带 `#S07` 深链首次加载传 `focus:false` —— 页面正在载入，一进来就把焦点扔进右下角面板
  是"我还没让你跳"。实测：`deepLink = { detailOpen:true, dNo:"S07", activeIsBody:true }`，
  按一次 Tab 落到 skip 链接（正常的页首顺序），没有跳进面板。
- 面板本来就没开时调 `close()` 什么都不做。全局 keydown 无条件调 `close`，
  否则会把焦点从用户正在操作的地方（比如 rail 里某颗芯片）拽走。

### `git diff` 片段

```diff
@@ -577,5 +971,71 @@
-  function open(id) {
+  /* ── 打开 / 关闭详情：焦点跟着内容走（2026-10-27 修）────────────────────
+   *
+   * 【修的是什么】审计 deliverables/66-audit/mobile-390.md §6.5 实测：
+   *   打开详情后 document.activeElement **仍是 body**（body.detail-open 已挂上，面板
+   *   900px 高、display:flex 都在，只有焦点没跟过来）。后果是键盘用户展开一个案之后，
+   *   还得再从头 Tab 一遍才够得着面板里的任何控件。
+   *
+   * 【87 / 86 / 30 这三个数各是什么，别混用】都实测过，口径不同，都写在这里免得下一个人
+   *   照着一个错数字去改：
+   *     · **87** = 纯 DOM 顺序下标：95 个可聚焦元素里，#detail 内第一个排在 87。
+   *       这是审计 m7-tabindex.mjs 的算法，我用同一套选择器复现，得到的也是 87（含 1 起算）。
+   *     · **86** = 从页首第一个可聚焦元素真按 Tab，数到踏进 #detail 的次数。与 87 的 1 之差
+   *       就是"下标从 1 起算"这件事，两个数其实在说同一件事。
+   *     · **30** = 打开 S01 之后，焦点停在 S01 行卡上，从**那里**继续按 Tab 进面板的次数。
+   *       这才是"用户刚点开一个案"的真实代价 —— 比 86 小，但仍然是 30 次。
+   *   修好之后同一路径是 **1 次**（焦点已在 .detail-head，再按一次 Tab 就是「收起」）。
+   *   所以"87 次"不必改口，只是要标明它是全页口径；用户实际遭遇的是 30 次。
+   *   反向的一半同样缺：关闭后焦点落回 body，用户被踢回页面顶部，得重新找刚才那一行。
+   *
+   * 【为什么焦点落在 .detail-head 而不是第一个可聚焦控件（#d-close）】
+   *   1) 面板是"换了一个阅读上下文"，不是弹出一个确认框。焦点进入的落点应该先说出
+   *      「你现在看的是哪个案」，而 .detail-head 的文本正是 `S01` + 中文名 + 英文名/结构型；
+   *      屏读器聚焦容器时会把这段读出来。#d-close 读出来只有「收起」两个字，等于什么都没说。
+   *   2) Tab 顺序天然正确：head 之后紧跟的就是 #d-close（DOM 里就是它的下一个兄弟），
+   *      所以"进面板按一次 Tab 就能收起"这条路径没有任何成本。
+   *   3) tabindex="-1" 只让它可以被**程序**聚焦，不进入 Tab 序列 —— 不会多出一个 Tab 站。
+   *
+   * 【为什么焦点移动要能被关掉（opts.focus === false）】
+   *   带 #S07 直接进来的首次加载不能抢焦点：页面正在载入，用户（和屏读器）应该从页首开始读，
+   *   一进来就把焦点扔进右下角的面板是"我还没让你跳"。所以只有**用户动作**（点行卡、
+   *   行卡上按 Enter/Space、J/K、改 hash）才移焦点；boot 那条路显式传 focus:false。
+   *
+   * 【关闭时为什么能"还回触发它的行卡"】
+   *   不记"是谁点的"，而是用 state.open 反查：`ledger.querySelector('.row[data-id=…]')`。
+   *   这比记 activeElement 可靠 —— J/K 换案时 activeElement 是 body 或面板内部，
+   *   但"我读到的是哪个案、该还回哪一行"始终由 state.open 唯一决定。
+   *   还回时用 preventScroll 再显式 scrollIntoView({block:'nearest'})：
+   *   前者避免整页跳一下，后者保证那一行真的在视口里（J/K 跨很远时它可能在屏幕外）。
+   *
+   * 【不给键盘用户抢焦点的情况】面板本来就没开时调 close()（比如什么都没展开就按 Esc，
+   *   全局 keydown 会无条件调 close）必须什么都不做。判据是"关之前面板是否真的开着"
+   *   加上"焦点此刻是否在面板里或 body 上"。两条都成立才抢 —— 否则会把焦点从用户
+   *   正在操作的地方（比如 rail 里某颗芯片）拽走，那是拿新缺陷换旧缺陷。
+   */
+  var FOCUS_TARGET = '.detail-head';
+
+  function focusIntoDetail() {
+    var head = $(FOCUS_TARGET, detail);
+    if (!head) return;
+    /* tabindex 写在 JS 里而不是 index.html：本轮的改动面被限定在 app.js / style.css，
+       而 tabindex="-1" 是纯行为语义（"可被程序聚焦，不进 Tab 序列"），放在行为层更合适。 */
+    if (!head.hasAttribute('tabindex')) head.setAttribute('tabindex', '-1');
+    head.focus({ preventScroll: true });
+  }
+
+  function focusBackToRow(id) {
+    var row = id ? ledger.querySelector('.row[data-id="' + id + '"]') : null;
+    /* 行卡可能已经不在清单里（面板开着时改了搜索词/筛选，而 render() 重铺了 ledger）。
+       这时退回搜索框 —— 它是主工作区的起点，总比把焦点丢给 body 强。 */
+    var target = row || $('#q');
+    if (!target) return;
+    target.focus({ preventScroll: true });
+    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
+  }
+
+  function open(id, opts) {
     var r = ALL.filter(function (x) { return x.id === id; })[0];
     if (!r) return;
+    opts = opts || {};
     state.open = id;
@@
     if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
     syncCurrent();
+    /* 焦点必须在 detail.hidden = false 之后移：display:none 的元素聚不上焦。 */
+    if (opts.focus !== false) focusIntoDetail();
   }
 
-  function close() {
+  function close(opts) {
+    opts = opts || {};
+    var wasOpen = !detail.hidden;
+    var id = state.open;
+    var a = document.activeElement;
+    var focusWasOurs = !!a && (a === document.body || detail.contains(a));
     state.open = null;
     detail.hidden = true;
@@
     if (location.hash) history.replaceState(null, '', location.pathname + location.search);
     syncCurrent();
+    if (wasOpen && opts.restoreFocus !== false && focusWasOurs) focusBackToRow(id);
   }
```

```diff
@@ -885,5 +1403,7 @@
   var h = (location.hash || '').replace('#', '');
-  if (/^S\d{2}$/.test(h)) open(h);
+  /* 首次加载**不抢焦点**（focus:false）：带 #S07 进来时，用户（和屏读器）应该从页首开始读。
+     一载入就把焦点扔进右下角面板，等于替他做了一次他没做的跳转。 */
+  if (/^S\d{2}$/.test(h)) open(h, { focus: false });
```

```diff
@@ -446,4 +518,14 @@ code { font-family: var(--code); font-size: 0.94em; }
 .detail-title p { font-family: var(--ui); font-size: var(--s-13); color: var(--ink-3); }
+/* .detail-head 是"打开面板后焦点去哪"的落点（app.js 的 focusIntoDetail 给它加了
+   tabindex="-1" 再 focus）。这里补焦点环，理由与 .fold > summary / .chips 一致：
+   面板底色 #f2f2ee 上，UA 那条 1px 的 auto 环几乎看不见。
+   实测（1440×900，真 Input.dispatchKeyEvent）：焦点在 .detail-head 上时
+   matches(':focus-visible') = true、UA 只画 outline 1px auto rgb(16,16,16)；
+   换成 2px var(--link)（对 #f2f2ee 是 5.6:1）与其它控件同一套。
+   为什么用 :focus-visible 而不是 :focus：鼠标点开面板时**不该**在面板头上留一道框
+   （实测鼠标路径 matches(':focus-visible') = false）—— 那是噪声，不是信息。
+   outline-offset 用负值：头部是贴边的 sticky 条，正 offset 会把环画到面板外被裁掉。 */
+.detail-head:focus-visible { outline: 2px solid var(--link); outline-offset: -2px; }
 .detail-body { padding: 18px 20px 60px; }
```

---

## 缺陷 3：`Esc` 在折叠条上关掉整个面板

### 改前证据

`_a11y-before.json`（焦点先放到 `#detail summary` 上，再按真 Esc）：

```
setup: { detailHidden:false, focusedTag:"summary", summaryText:"原型截图预览3 张点开看 1440 / 768 " }
afterEscOnSummary: {
  detailHidden: true,          ← 整个面板关了
  bodyClass: "",               ← body.detail-open 也撤了
  activeTag: "body",           ← 焦点掉回 body
  hash: ""                     ← 深链被清空，阅读位置丢失
}
```

### 改后证据

同一串操作（`_a11y-after.json`）：

```
afterEscOnSummary: {
  detailHidden: false,                    ← 面板还在
  bodyClass: "detail-open",               ← 仍是打开态
  activeTag: "div", activeInDetail: true, ← 焦点退到面板头
  hash: "#S07",                           ← 深链保留
  detailsOpen: false                      ← 折叠块状态没被误改
}
```

**对照组（证明"修 Esc"没有修过头）**：焦点放在面板正文的「打开原型」链接（不是 summary）
上按 Esc，面板**仍然会关**：

```
control.setup: { focused:"a.open-proto", isSummary:false }
control.afterEsc: { detailHidden: true }
```

### 修法与理由

在 `detail` 上做事件委托，命中 `summary` 才拦截：

```js
detail.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var s = e.target && e.target.closest ? e.target.closest('summary') : null;
  if (!s || !detail.contains(s)) return;
  e.preventDefault();
  e.stopPropagation();
  focusIntoDetail();
});
```

三个决定各自的理由：

- **挂在 `detail` 上而不是逐个 summary**：面板内容每次 `open()` 都用 `innerHTML` 重铺，
  逐个绑会在下一次渲染后全部失效，且 30 案 × 4 折叠条 = 120 次绑定。委托一次就够。
- **冒泡阶段就够**：事件路径是 summary → details → … → `#detail` → body → document，
  `#detail` 的监听器先于 `document` 跑，`stopPropagation` 之后全局那条收不到。
  **不改全局那个"任何地方按 Esc 都能收起"的开关** —— 键盘用户需要这条退路。
- **落点是面板头，不是 `blur()`**：审计建议"只 blur 不关闭"，但 `blur()` 会把焦点丢给
  body —— 那正是缺陷 2 刚修掉的症状。改成"退到面板头"后 Esc 是一条有方向的阶梯：
  折叠条上按 Esc → 焦点退到面板头（面板还开着，当前是哪个案仍读得出来）→ 再按一次 → 关闭
  且焦点还回行卡。实测（`_a11y-regress.json` → `ladder`）：

```
afterOpen     : cls=detail-head, inDetail=true
esc1（summary）: detailOpen=true,  active=detail-head, inDetail=true
esc2（head）   : detailOpen=false, active=li.row dataId=S04, hash=""
```

  与 `prompt-copy.js:881` 那处输入框 Esc 同一思路（`stopPropagation` 后再收焦点），
  区别是那里 `blur()` 有合理落点（用户刚点过的按钮），这里没有，所以要显式指定。

**summary 的默认开合没被挡**（`_a11y-keycheck.mjs`，三种按法对照）：

```
enter-plain : afterFirst open=false   ← CDP 少了 text 字段，浏览器不合成激活，探针的坑
enter-text  : afterFirst open=true, afterSecond open=false
space       : afterFirst open=true, afterSecond open=false
escThenSpace: 按过 Esc 之后 Space 仍能正常开合（stopPropagation 没有"粘住"后续按键）
```

### `git diff` 片段

```diff
@@ -778,6 +1237,59 @@
   /* ── 交互接线 ─────────────────────────────────────────── */
-  $('#d-close').addEventListener('click', close);
+  /* 包一层而不是直接传 close：addEventListener 会把 MouseEvent 当第一个参数递进去，
+     而 close 现在收 opts（{restoreFocus}）。直接用会让"事件对象"被当成配置读 ——
+     今天恰好每个字段都是 undefined 所以不出错，但那是运气，不是约定。 */
+  $('#d-close').addEventListener('click', function () { close(); });
+
+  /* ── Esc 在折叠条（<summary>）上不该关掉整个面板（2026-10-27 修）────────────
+   *
+   * 【修的是什么】审计 §6.5 实测：焦点停在详情里的任意 <summary> 上按 Esc，
+   *   document 上的全局 keydown 无条件调 close() ⇒ 整个面板 hidden、hash 清空、
+   *   焦点掉回 body。用户的意图是"收起这个折叠块"，代价却是丢掉整个阅读上下文
+   *   与滚动位置 —— 而面板要重新打开才能回来，且回来时停在顶部。
+   *
+   * 【为什么在 detail 上监听、而不是给每个 summary 单独绑】
+   *   面板内容是每次 open() 用 innerHTML 重铺的（renderDetail），逐个绑会在下一次
+   *   渲染后全部失效，而且 30 个案 × 每案 4 个折叠条 = 120 次绑定。挂在 detail 上
+   *   用事件委托，一次就够，且对新出现的 summary 自动生效。
+   *
+   * 【为什么放在 detail 的冒泡阶段就够】事件路径是 summary → details → … → #detail
+   *   → body → document。detail 的监听器先于 document 的跑，这里 stopPropagation
+   *   之后全局那一条根本收不到，不需要去改那个"总开关"的判断条件 ——
+   *   那个条件还必须保持"任何地方按 Esc 都能收起面板"，否则键盘用户会没有退路。
+   *
+   * 【为什么落点是面板头，而不是 blur()】
+   *   审计的建议是"只 blur 不关闭"。blur() 会把焦点丢给 body —— 那正是缺陷 2 刚修掉的
+   *   症状（焦点在 body ⇒ 想回到刚才的折叠条要重新 Tab 整个页面）。所以这里改成
+   *   "退到面板头"：Esc 变成一条有方向的阶梯 ——
+   *     折叠条上按 Esc → 焦点退到面板头（面板还开着，当前是哪个案仍读得出来）
+   *     再按一次 Esc  → 面板关闭，焦点还回触发的行卡（见 close()）
+   *   两级都能反悔，且任何一级都不会把焦点扔回 body。
+   *   与 prompt-copy.js:881 那处输入框 Esc 的处理同一个思路（stopPropagation 后再收焦点），
+   *   区别是那里 blur 是合理的（输入框 blur 后焦点还在用户刚点过的按钮上），
+   *   这里 blur 没有合理落点，所以要显式指定。 */
+  detail.addEventListener('keydown', function (e) {
+    if (e.key !== 'Escape') return;
+    var s = e.target && e.target.closest ? e.target.closest('summary') : null;
+    if (!s || !detail.contains(s)) return;
+    e.preventDefault();
+    e.stopPropagation();
+    focusIntoDetail();
+  });
+
```

---

## 缺陷 4：`--s-15` 从未定义

### 改前证据

`_a11y-before.json`：

```
s15: "\"\""            ← getPropertyValue('--s-15') 是空串
defined: false
scale: --s-13="13px" --s-14="14px" --s-15="" --s-16="16px" --s-17="17px" --s-20="20px" --s-24="24px" --s-34="34px"
claimFontSize: "16px"   ← .mast-claim 回退到继承的 body 字号
wizardFontSize:"16px"   ← .mast-wizard a 同样
bodyFontSize:  "16px"
```

### 选哪个：**补 `--s-15: 15px`**（不是改回 `--s-14`/`--s-16`）

任务书要求"先查清本意，不要随便加一个 15px"。查证结果：

1. **本文件所有字体变量的名字就等于它的像素值**：`--s-13`=13px、`--s-16`=16px、`--s-24`=24px……
   所以 `--s-15` 只能是 15px，不存在第二种读法。
2. **15px 是作者有意选的值，不是打字错误。** 证据在提交 `eed3587`：
   diff 里 `.mast-claim` 从 `var(--s-17)` 改成 `var(--s-15)`，而同一提交的说明写着
   「claim 从 17px/1.75 收到 **15px**/1.6」。也就是说：作者想改成 15px，也确实写了 `--s-15`，
   只是 `:root` 里漏了定义这一步 —— 于是那句"收到 15px"在浏览器里从来没有成立过。
   （`.mast-wizard a` 的 `var(--s-15)` 在那次提交**之前**就写着，同样一直悬空。）
3. 如果当初真是想用 14 或 16，作者不会同时写出"15px"这个数字。

**顺带核对了 `:root` 上那句注释**："字号只留 6 档" —— 数一遍从来就不是 6：
补之前是 7 个（34/24/20/17/16/14/13），补完是 8 个。注释已按实测改正，
并写明"不是在原有档位上再加一档"。

### 改后证据

```
s15: "\"15px\""   defined: true
claimFontSize: "15px"   wizardFontSize: "15px"
```

页头高度变化（这是"回退成 16px"这件事一直藏着的代价）：

```
1440: .mast 310.4 → 304.0（−6.4）   首卡 top 394.3 → 387.9
390 : .mast 488.6 → 453.4（−35.2）  首卡 top 989.2 → 954.0   （claim 从 5 行收到 4 行，128px → 96px）
```

**副作用（超出审计范围，必须自己报）**：`wizard.css:68` 的 `.wz-card p` 也用这个变量，
跟着从 16px 变成 15px。实测（`_a11y-wizard.mjs`，在真 wizard.html 里插一条同结构段落）：

```
改前: fontSize=16px lineHeight=25.92px pHeight=77.7 lines=3
改后: fontSize=15px lineHeight=24.30px pHeight=72.9 lines=3     （行数不变，overflowX=0）
```

行数没变、没有横向溢出。这是**预期内**的（作者写的本来就该是 15px），但它确实是第二个页面
的观感变化，所以单独量了、也留了图：
[wizard-before-1440.jpg](shots-a11y/wizard-before-1440.jpg) / [wizard-after-1440.jpg](shots-a11y/wizard-after-1440.jpg)

### `git diff` 片段

```diff
@@ -35,5 +35,9 @@
   --code: "IBM Plex Mono", ui-monospace, monospace;
 
-  /* 字号只留 6 档，下限 13px */
+  /* 字号档位，下限 13px。
+     注：这句原写作「只留 6 档」，但数一遍从来就不是 6 —— 补 --s-15 之前是 7 个
+     （34/24/20/17/16/14/13），补完是 8 个（多一个 15）。数字已按实测改正，
+     不是在原有档位上再加一档：15px 本来就被 .mast-claim 与 .mast-wizard a 用着，
+     只是定义漏了、浏览器一直按 16px 兜底（见下面 --s-15 的注释）。 */
   --s-h1: clamp(34px, 5.2vw, 74px);
   --s-34: 34px;
@@ -42,4 +46,18 @@
   --s-17: 17px;
   --s-16: 16px;
+  /* --s-15 是 15px（2026-10-27 补定义，此前**从未存在**）。
+     为什么补 15 而不是把它改回 --s-14 / --s-16：这不是打字错误，是作者本来的意图。
+     证据在提交 eed3587 的 diff 与说明里 —— 那一条同时改了 .mast-claim 的
+     `var(--s-17)` → `var(--s-15)`，并把正文说明写成「claim 从 17px/1.75 收到 15px 与 1.6 行高」。
+     也就是说：15px 这个值是有意选的，只是 `:root` 里漏了这一步定义。
+     （`.mast-wizard a` 的 `var(--s-15)` 在那次提交之前就写着，同样一直悬空。）
+     本文件所有字体变量的名字就等于它的像素值（--s-13 是 13px、--s-16 是 16px），
+     所以 --s-15 只能是 15px，不存在第二种读法。
+     不补的实测后果（1440×900 / 390×844 各测一次）：var() 解析失败 ⇒ font-size 整条声明
+     在计算值阶段被丢弃 ⇒ 回退到继承的 body 16px。即 .mast-claim 与 .mast-wizard a
+     实际按 16px 渲染了整整两个提交周期，而作者写的那句「收到 15px」在浏览器里从没成立过。
+     补上之后的实测差（页头 .mast 高度）：1440 档 310.4 → **304.0**（−6.4），
+     390 档 488.6 → **453.4**（−35.2）。390 档差得多是因为 claim 从 5 行收到 4 行
+     （128px → 96px），一行的钱就是 32px。首卡 top 相应 394.3 → 387.9、989.2 → 954.0。
+     影响面不止选型台：wizard.css 的 .wz-card p 也用这个变量，一并从 16px 回到 15px。 */
+  --s-15: 15px;
   --s-14: 14px;
   --s-13: 13px;
```

### 一个自己踩的坑（写下来给下一个人）

第一版注释里我写了「收到 **15px**/1.6」。那个 `**/` 把 CSS 注释提前闭合了 ——
`:root` 从那一行往下全部解析失败，`--s-15` 仍然是空串，而**同一个文件里**后面改的
`.mast-exit a{padding:2px 0}` 却生效了（因为它在闭合点之后，自成一条合法规则）。

一开始怀疑是浏览器缓存，查了一圈都不是：注释开闭计数 `52 / 53`（差 1），
而 `**/` 在文件里只出现一次，就是我自己写的那句。
教训：在 CSS 注释里写 Markdown 强调（`**x**`）时，只要紧跟一个 `/` 就会变成注释结束符。

---

## 缺陷 5：390 档页头两个模板链接触控目标太小

### 改前证据

`_a11y-before.json` → `d5`：

```
390 : minHeight=20  passesBySize=false
  targets:
    企业站 M01   h=20  w=72     fragCount=1
    餐饮本地 M02 h=20  w=86     fragCount=1
    作品集 M03   h=20  unionH=41.7  fragCount=2   ← 折成两段：42×20 与 26.9×20
  linkPadding="0px"  linkDisplay="inline"
1440: minHeight=20  passesBySize=false  （三段各 1 rect，h=20）
```

`.mast-exit` 段落高：390 档 76.1px（4 行）、1440 档 32.7px。

### 改后证据

```
390 : minHeight=24  passesBySize=true  circleHits=0
  targets:
    企业站 M01   h=24  unionH=24
    餐饮本地 M02 h=24  unionH=24
    作品集 M03   h=24  unionH=45.7  fragCount=2（两段各 24）
1440: minHeight=24  passesBySize=true  circleHits=0
```

**验收 7 要的那个数**：390 档两个模板链接 `getBoundingClientRect().height` 都是 **24**（改前 20）。

关于 WCAG 2.2 2.5.8 的间距豁免：我在探针里按"以目标为中心的 24px 圆是否与其它目标相交"
逐段（`getClientRects()`，不是并集矩形）算了一遍。改前 M03 折成两段、末段与 M02 同排，
两段并集矩形会把中间空白当成可点区域 —— 那是假阳性，审计里也撞了这一步。
按逐段算，改前 `passesBySize=false` 就是硬失败；改后 `passesBySize=true`，不再依赖豁免。

### 修法与理由

```css
.mast-exit a { padding: 2px 0; }
```

三条候选都在真浏览器里量过（1440 与 390 各一遍）：

| 候选 | 链接高 | `.mast-exit` 高 | 首卡 top | 结论 |
|---|---|---|---|---|
| **纯内联 `padding:2px 0`** | **24** | 76.1 → 76.1（0） | 989.2 → 989.2（0） | **选它** |
| `display:inline-block; padding:2px 0` | 25.7 | 76.1 → 84.1（+8） | 989.2 → 997.2 | 链接变成不可折行原子盒，M03 从 2 段并成 1 段，用首屏换 1.7px 余量 |
| 上条 + `margin:-2px 0` | 25.7 | 76.1 → 76.1 | 989.2 → 989.2 | 负外边距让相邻两行可点区垂直**互相盖住** —— 拿新缺陷换旧缺陷 |

选第一条的关键性质：**内联元素的垂直 padding 不参与行盒高度计算**，所以视觉上完全不动，
而命中区（`getBoundingClientRect` / 点击热区）确实长到 24px —— 正是 2.5.8 要的那个量。
字号一个没动（仍是 14px，`.mast-exit` 在 index.html 的局部样式里定为 `var(--s-14)`）。

### `git diff` 片段

```diff
@@ -124,4 +142,32 @@ code { font-family: var(--code); font-size: 0.94em; }
 }
 .mast-wizard a:hover { background: var(--link); }
+
+/* ── 页头三个模板链接的触控目标（WCAG 2.2 AA 2.5.8）──────────────────────
+ * 2026-10-27 修。审计实测（deliverables/66-audit/mobile-390.md §6.2）：
+ *   390×844 下「企业站 M01」(72×20)、「餐饮本地 M02」(86×20)、「作品集 M03」(42×20)
+ *   三个链接**高度都只有 20px**，低于 AA 要求的 24px。
+ * 2.5.8 有一条间距豁免（以目标为中心的 24px 直径圆不与其它目标相交即合规），
+ * 而这处**不满足**：第三个链接在 390 档折成两段（末行只剩「作品集 M03」，
+ * 和上一行同一水平起点），其 24px 圆与 M02 的同排矩形相交 ⇒ 真失败，不是豁免。
+ * 这是本次审计在整个界面上找到的唯一一处硬性 WCAG 2.2 违规。
+ *
+ * 【为什么是 padding 2px 0，不是 display:inline-block + padding】
+ * 三条候选都在真浏览器里量过（1440×900 与 390×844 各一遍）：
+ *   · 纯内联 padding:2px 0      → 链接高 20 → **24**，.mast-exit 76.1 → 76.1（0），
+ *                                 首卡 top 989.2 → 989.2（0）。零排版代价。
+ *   · inline-block padding:2px 0 → 高 25.7（够），但链接变成不可折行的原子盒，
+ *                                 390 档第三个链接从 2 段并成 1 段、段落 76.1 → 84.1px，
+ *                                 首卡下移 8px（989.2 → 997.2）。**用首屏换 1.7px 余量，不值。**
+ *   · 上面那条加 margin:-2px 0  → 高度与折行同 inline-block，段落高度回到 76.1，
+ *                                 但负外边距会让相邻两行的可点区域在垂直方向**互相盖住** ——
+ *                                 这是拿新缺陷换旧缺陷。
+ * 选第一条。内联元素的 padding 垂直方向不参与行盒高度计算，所以视觉上完全不动，
+ * 而命中区（getClientRects / 点击热区）确实长到 24px —— 这正是 2.5.8 要的那个量。
+ *
+ * 【字号一个没动】仍是 14px（.mast-exit 在 index.html 的局部样式里定为 var(--s-14)），
+ * 只补垂直内距。多行折行的那个链接两段各 +4px，合计 45.7px，同样达标。
+ * 【作用域】.mast-exit 只出现在页头这一段（index.html:52），不会外溢到正文链接。 */
+.mast-exit a { padding: 2px 0; }
+
```

---

## 13 条验收（原文输出）

### 1. `node --check prototypes/_selection/app.js`

```
$ D:\Nodejs\node.exe --check prototypes/_selection/app.js
node --check exit=0
```

### 2. 缺陷 1：`#q-parked` 无暂存词时 `display:none` 且不可 Tab

```json
"390":  { "hiddenAttr": true, "hiddenProp": true, "display": "none", "rect": {"h": 0},
          "occupiesLayout": false, "buttonCount": 2, "tabbableButtons": 0,
          "barH": 145, "firstRowTop": 989.2,
          "tabWalkFromSearch": ["select#sort …", "button#reset 清空筛选", "li S01…", "li S02…", "li S03…"] }
"1440": { "hiddenAttr": true, "hiddenProp": true, "display": "none", "rect": {"h": 0},
          "occupiesLayout": false, "buttonCount": 2, "tabbableButtons": 0,
          "barH": 59.9, "firstRowTop": 394.3,
          "tabWalkFromSearch": ["select#sort …", "button#reset 清空筛选", "li S01…", "li S02…", "li S03…"] }
```

`tabWalkFromSearch` 里没有出现「放回搜索 / 丢弃」。兜底规则在同一现场重建下也生效（见缺陷 1 节）。

### 3. 缺陷 2：打开详情后 `document.activeElement` 在 `.detail` 内

```json
"1440": { "activeAfterMouseOpen": { "tag": "div", "cls": "detail-head",
          "text": "S01 红黑斜排报 Red Wedge Broadsheet · F 型／NEW", "inDetail": true } }
"390":  { "activeAfterMouseOpen": { "tag": "div", "cls": "detail-head",
          "text": "S01 红黑斜排报 Red Wedge Broadsheet · F 型／NEW", "inDetail": true } }
```

**实际元素：`div.detail-head`**（`#detail` 内，带 `tabindex="-1"`）。

### 4. 缺陷 2：关闭详情后焦点回到触发行卡

```json
"close": {
  "focusBeforeClose": { "tag": "div", "cls": "detail-head", "inDetail": true },
  "activeAfterClose": { "tag": "li", "cls": "row is-in",
                        "text": "S03长曝光观测站Long-Exposure ObservatoryF 型 · " },
  "detailHidden": true,
  "targetRowIsS03": true
}
```

Esc 关闭路径同样：`before=div.detail-head` → `after=li.row (S05)`。

### 5. 缺陷 3：在 summary 上按 Esc，面板不关（改前/改后对照）

| | 改前 | 改后 |
|---|---|---|
| `detail.hidden` | **true**（面板关了） | **false**（面板还在） |
| `body.className` | `""` | `"detail-open"` |
| `document.activeElement` | `body` | `div.detail-head`（在 `.detail` 内） |
| `location.hash` | `""`（深链被清） | `"#S07"` |
| 对照组（焦点在 `.open-proto` 上按 Esc） | 面板关闭 | 面板关闭（**仍会关**，没修过头） |

### 6. 缺陷 4：`--s-15` 有定义

```json
"1440/390": { "s15": "\"15px\"", "defined": true,
              "scale": ["--s-13=\"13px\"","--s-14=\"14px\"","--s-15=\"15px\"","--s-16=\"16px\"",
                        "--s-17=\"17px\"","--s-20=\"20px\"","--s-24=\"24px\"","--s-34=\"34px\""],
              "claimFontSize": "15px", "wizardFontSize": "15px" }
```

**选的是补 `--s-15: 15px`**；理由见缺陷 4 节（commit `eed3587` 的说明写着"收到 15px"，
变量名即像素值，不是打字错误）。

### 7. 缺陷 5：390 档两个模板链接高度 ≥ 24

```json
"390": { "minHeight": 24, "passesBySize": true, "passesBySpacing": true, "circleHits": [],
         "targets": [
           { "text": "企业站 M01",   "h": 24, "unionH": 24,   "fragCount": 1 },
           { "text": "餐饮本地 M02", "h": 24, "unionH": 24,   "fragCount": 1 },
           { "text": "作品集 M03",   "h": 24, "unionH": 45.7, "fragCount": 2 } ] }
"1440": { "minHeight": 24, "passesBySize": true, "passesBySpacing": true, "circleHits": [] }
```

### 8. `node prototypes/_build/verify-prototype.mjs --all`

```
达标 26 / 不达标 4 / 共 30
exit=1
```

**26 / 4 / 30 —— 与任务书要求的数字一致。** 4 个不达标：

```
✗ S07 S07-slate-ink-contents        闸门 FAIL=1：mono
✗ S08 S08-amber-overprint-lightbox  闸门 FAIL=2：palette-terracotta font-count
✗ S13 S13-blind-debossed-dispatch   闸门 FAIL=2：mono empty-screens
✗ S21 S21-interlocking-release-book 闸门 FAIL=1：mono
```

S13 的 `style.css` 与 `.inspect/*` 在 `git status` 里是 `M`（另一 Agent 未提交的改动），
但我改动前后这个总数都是 26/4/30、四个 FAIL 名单也没变 —— 我这两个文件不参与闸门
（`verify-prototype.mjs` 只扫 `prototypes/S*/`，不扫 `_selection/`）。

### 9. `node prototypes/_build/check-docs.mjs`

```
  ✓ i18n/facts           中英两版的关键事实一致（方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集）
  ✓ paths/exist          文档里 15 条仓库路径全部存在
  ✓ paths/templates      文档提到的模板编号都存在
  ✓ regression/banned    6 条已腐化原话均未回归

README.md: 0 FAIL / 0 WARN / 13 PASS
exit=0
```

### 10. `node prototypes/_build/check-stale.mjs`

```
闸门陈旧度：检查 30 案
  ✓ 全部新鲜
exit=0
```

（本轮开工时就是全部新鲜；S13 的陈旧度不属于本次改动范围。）

### 11. 截图（1440×900 与 390×844）

全部在 [shots-a11y/](shots-a11y/)，改前/改后同名对照：

| 图 | 看什么 |
|---|---|
| `{before,after}-{1440,390}-1-list-fold.jpg` | 列表首屏（页头高度 / 首卡位置） |
| `{before,after}-{1440,390}-2-mast.jpg` | 页头特写（三个模板链接，缺陷 4 与 5 的视觉面） |
| `{before,after}-{1440,390}-3-detail-focus.jpg` | 打开详情后焦点在哪（缺陷 2） |
| `{before,after}-{1440,390}-4-no-parked.jpg` | 空状态：底部有没有那条假控件（缺陷 1） |
| `{before,after}-{1440,390}-5-parked-visible.jpg` | 有暂存词：条子**应该**出现（回归） |
| `zoom-{before,after}-detail-head.png` | 焦点环的像素级对照（不缩放，只裁头部） |
| `wizard-{before,after}-1440.jpg` | `--s-15` 对向导页的副作用 |

改前/改后两套出自 `_a11y-shots-before.mjs` / `_a11y-shots.mjs`，同一份数据、
同一套截图路径、同一串操作，差异只来自这 5 条修复。

### 12. `git diff --stat`

**整个仓库**（含其他 Agent 未提交的改动）:

```
 README-EN.md                                       |   4 +-
 README.md                                          |   4 +-
 .../.inspect/desktop-fold.jpg                      | Bin 173664 -> 174000 bytes
 .../.inspect/desktop-page-01.jpg                   | Bin 166159 -> 165144 bytes
 .../.inspect/desktop-page-02.jpg                   | Bin 57979 -> 57813 bytes
 .../.inspect/mobile-fold.jpg                       | Bin 54905 -> 55055 bytes
 .../.inspect/mobile-page-01.jpg                    | Bin 364976 -> 364035 bytes
 .../.inspect/mobile-page-02.jpg                    | Bin 96665 -> 96434 bytes
 .../.inspect/report.json                           |  57 +--
 .../.inspect/tablet-fold.jpg                       | Bin 121568 -> 121898 bytes
 .../.inspect/tablet-page-01.jpg                    | Bin 247763 -> 246235 bytes
 prototypes/S13-blind-debossed-dispatch/style.css   |  98 +++-
 prototypes/_selection/app.js                       | 566 ++++++++++++++++++++-
 prototypes/_selection/prompt-copy.js               | 376 +++++++++++++-
 prototypes/_selection/style.css                    |  86 +++-
 15 files changed, 1095 insertions(+), 96 deletions(-)
```

**我只改了这两个文件**（其余行是并发 Agent 的未提交成果，按协议没有碰、也没有 `git checkout`）:

```
 prototypes/_selection/app.js    | 566 +++++++++++++++++++++++++++++++++++++++-
 prototypes/_selection/style.css |  86 +++++-
 2 files changed, 643 insertions(+), 9 deletions(-)
```

**注意**：`app.js` 的 566 行里只有约 130 行是我加的（缺陷 2 的 `open`/`close`/两个焦点函数、
缺陷 3 的委托监听、几处调用点），其余是并发 Agent 早先加进去的 `syncParked` / `parkQuery` 等。
两个文件的 diff 无法按作者拆分（同一份文件、都未提交），这里如实说明归属，而不是把行数算成自己的。

### 13. 三文件无 BOM、LF

```
prototypes/_selection/app.js        | bytes=89713 | BOM=false | CRLF=0 | LF=1449 | endsWithLF=true | U+FFFD=false
prototypes/_selection/style.css     | bytes=47712 | BOM=false | CRLF=0 | LF=858  | endsWithLF=true | U+FFFD=false
prototypes/_selection/prompt-copy.js| bytes=99579 | BOM=false | CRLF=0 | LF=1499 | endsWithLF=true | U+FFFD=false
```

（第三个是"确认没有波及"：`prompt-copy.js` 本轮只读、未改动，仍是 BOM=false / CRLF=0。
全程用 `edit` 工具改，没有用 PowerShell `Set-Content`。）

---

## 我可能弄坏的地方

按"最可能真的坏"排序，每条都给了怎么验、以及我验到了什么。

1. **`focusBackToRow` 可能把焦点从一个用户正在操作的地方抢走。**
   我加了两个守卫（`wasOpen` 且焦点在面板内或 body 上），但"焦点在 body"这个条件本身有歧义：
   如果用户在面板开着的时候点了一下页面空白（焦点落到 body），此时按 Esc 关面板，
   我会把焦点还给行卡 —— 这大概是对的，但严格说这是我替用户做的判断。
   *验过*：`chipAfterClose = { before:"30/30", clicked:true, after:"4/30" }`，rail 芯片筛选没坏。

2. **`#q-parked[hidden]{display:none!important}` 是 `!important`。**
   它会把任何"给 `#q-parked[hidden]` 写 display"的后续改动压掉。这是有意的不变量，
   但如果将来有人想让这条在 hidden 时也显示（比如做一个收起动画的过渡态），会撞墙。
   *验过*：有暂存词时 `display=flex / h=35.5 / visible=true`，两侧都正常。

3. **`open()` 现在会移动焦点，可能影响"滚动位置"的观感。**
   我用了 `focus({preventScroll:true})`，理论上不滚动。但 `.detail` 是 `overflow-y:auto`，
   聚焦 `.detail-head`（`position:sticky; top:0`）时浏览器**可能**把它滚进视野。
   *验过*：`detailRect.scrollTop = 0`（打开后仍是 0），没看到跳动。但这条依赖浏览器实现，
   换 Chrome 版本值得再看一眼。

4. **深链首次加载不抢焦点，与"点行卡抢焦点"是两套行为。**
   如果将来有人把 `open()` 的 `focus:false` 默认值改掉，深链会开始抢焦点。
   我在 boot 那行写了注释，但没有测试守它（没有"测试断言"，只有注释）。

5. **`--s-15` 的影响面比审计说的大。**
   它不只改 `.mast-claim` / `.mast-wizard a`，还改了 `wizard.css:68` 的 `.wz-card p`。
   *验过*：16px→15px、行数 3→3、`overflowX=0`。但向导结果页我只测了那一条规则，
   **没有把五道题真的走完**（脚本点不到结果页，`reachedResults=false`）——
   所以"向导结果页整体观感没变"这句话我没有证据，只能说"那一条 CSS 的效果是这样"。

6. **`.mast-exit a { padding: 2px 0 }` 用的是裸元素选择器，作用域靠 `.mast-exit` 兜。**
   `.mast-exit` 目前只出现在页头一处（index.html:52），但如果以后别处也挂这个 class，
   那里所有 `<a>` 都会得到这 2px 垂直内距。*验过*：`document.querySelectorAll('.mast-exit')` 长度 1。

7. **summary 上的 Esc 现在"多做了一件事"（退到面板头）。**
   这与审计建议的"只 blur"不同。如果用户的心智模型是"按 Esc 什么都不该发生"，
   焦点被移到面板头会让他困惑。我认为"有方向的阶梯"更好，但这是我的判断，不是审计的要求。
   *验过*：阶梯实测 `summary → detail-head → 关闭+回行卡`，且 summary 的 Enter/Space 开合未受影响。

8. **一个我自己制造又修掉的坑，留档**：CSS 注释里写 `**15px**/1.6` 时，`**/` 提前闭合了注释，
   `:root` 从那一行往后全部解析失败。当时表现是"同一个文件里后面的规则生效、前面的变量失效"。
   已修，并核对了两个文件的注释开闭计数（`app.js` 81/81、`style.css` 53/53）。
   教训写进了缺陷 4 节 —— 这类错误不会被 `node --check`（只查 JS）或任何现有闸门抓到。

---

## 附：本轮新增的探针与产物

都在 `deliverables/66-exec/`：

| 文件 | 作用 |
|---|---|
| `_a11y-probe.mjs` | 5 条缺陷的复现 + 验收（`--tag before\|after`） |
| `_a11y-before.json` / `_a11y-after.json` | 上面那支的输出，本报告所有数字的来源 |
| `_a11y-regress.mjs` / `_a11y-regress.json` | 近邻回归：暂存条、深链、J/K、Esc 阶梯、芯片 |
| `_a11y-keycheck.mjs` | summary 的 Enter/Space 开合三变体对照（证明上一版的 false 是探针的坑） |
| `_a11y-focusring.mjs` | 焦点环在键盘/鼠标两条路径下的可见性 |
| `_a11y-tabcalib.mjs` / `_a11y-tabcount2.mjs` | 87 / 86 / 30 / 1 四个 Tab 口径的标定 |
| `_a11y-shots.mjs` / `_a11y-shots-before.mjs` | 改后 / 改前截图（改前靠 `_before-clone/` 回退 5 处生成） |
| `_a11y-zoom.mjs` | 焦点环的像素级裁剪 |
| `_a11y-wizard.mjs` | `--s-15` 对向导页的副作用 |
| `_a11y-parked-ab.mjs` | 暂存条"放回搜索"路径的改前/改后 A/B |
| `_cssdiag.mjs` | 定位 `**/` 提前闭合注释的那次诊断 |
| `_acc/*.txt` | 验收命令的原始输出 |
| `_before-clone/` | 改前副本（`_selection/` 整份 + 回退 5 处），2.5MB，可删 |
