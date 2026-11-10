# PROBE-INVENTORY — 探针考古（W5 前置）

> 任务：W5 要建常驻回归装置。本文回答**在建之前**必须先知道的三件事：
> ① 仓库里已经有什么（约 30 个一次性 CDP 探针散落在 `62-verify`…`73-verify`）；
> ② 哪些值得 promote 进 `prototypes/_build/`；
> ③ 哪些是**陷阱**——新装置照抄就会重犯。
>
> 口径：本机 Node v26.12.1 / 无头 Chrome / CDP；`D:/Web/style`；测量日期 2026-11-04 之后的工作树。
> 所有「实测」均为本次重跑所得，不是抄文档。凡引用代码均为逐字。

---

## 0. 先说结论（五条）

1. **探索阶段已经结束——`probe-ui.mjs` 与 `check-ui-copy.mjs` 今天已经存在并跑绿（8/8）。**
   `prototypes/_build/probe-ui.mjs`（22,545 B，17:31 写入）已实现 W2 的 8 条断言，
   `prototypes/_build/check-ui-copy.mjs`（10,915 B）已实现静态复算闸门。
   **W5 的真实任务不是「从零写探针」，而是「把考古出来的 6 个陷阱装进这两份文件、并补 3 个未覆盖项」。**
   本文因此以「promote / 留档 / 删」三段给建议，而不是「新写」。

2. **8 条断言里有 1 条判据本身是错的（会假绿）。**
   `probe-ui.mjs` 的 `field-count-derived` 比的是「界面 12 段 = `#d-body .fields .field:not(.field-out)` 12 段」——
   两边都是同一份 `fillDerived()` 算出来的，**它证明的只是 `fillDerived` 自洽，不是「真的是 12 段」**。
   实测 DOM 里是 **13 段**（多出的是 `.field-out`「不适合的场景」，即缺陷 #8 的修复产物）。
   详见 §4-T3。

3. **最硬的可复用技术有三条**，都有现成实现可抄：
   ① **`Input.dispatchKeyEvent` 的 `text:'\r'`**（Enter 不合成字符就不触发 `<summary>`/按钮原生激活）；
   ② **真鼠标坐标点击**（`mousePressed`/`mouseReleased` 带 x,y），否则 focus 落点与真实用户不同；
   ③ **`page.eval` 返回 JSON 快照 + Node 侧独立算期望**（`66-exec/_filters-probe.mjs` 是范本）。

4. **最大的未覆盖项是「跨 30 案」与「网络层」。**
   现有探针几乎全部只开 S01 或 S07 一个案。实测字段数 **30/30 都是 13**、`不适合：` **30/30 都在** ——
   但没有一个探针跑过全 30 案来断言这一点（ENGINEERING.md 也只写「点 S07」）。
   隐藏图（缺陷 #7）的断言用的是**服务端计数**（`servedImages`），不是 CDP 的 `Network.*`，见 §4-T5。

5. **`probe-ui.mjs --selftest` 有一个会咬人的副作用：它原地改 `prototypes/_selection/*` 再还原。**
   本次实测撞上**三个并发 `probe-ui.mjs` 进程**，`app.js` 被留在变异态（`if (false) return;`）长达 ~2 分钟。
   在 CI（单进程）无碍，但**并行开发/多 Agent 时是数据竞争**。修法见 §5。

---

## 1. 探针清单（Inventory）

规模：`deliverables/` 下 **565 个** `.mjs/.js` 命中「浏览器/求值」信号（扫描式：
`cdp|playwright|puppeteer|Browser.launch|dispatchKeyEvent|Input.dispatch|createTarget`，
排除 `chrome-prof*`、`/prototypes/`、`/snap/`、`_backup`、`_mut`、`_bk` 等复制树）；其中真正
`Browser.launch()` 或 `cdp.mjs` 的约 **450 个**（`createServer` 静态服务 **448 个**，其中 **335 个**
各自内联了同一张 MIME 表）。`tools/taste-skill/.../lib/cdp.mjs` 被 **876 个**文件 import
—— 而它在 `.gitignore:2`（`tools/` 未锚定模式）里，
**CI 拉不到**。这正是 W5 必须先把 `cdp.mjs` vendor 进 `_build/vendor/` 的原因（已做，13 个探针已改用它）。

下表的「可跑」列：`✅` = 本次实跑通过；`⚠️` = 依赖已不存在的外部端口/目录；`—` = 未重跑（低价值或纯静态）。

### 1.1 核心 14 个（W2 缺陷的原始证据源）

| 路径 | 用途（文件头原话/实测） | 断言什么 | 可跑 |
|---|---|---|---|
| `deliverables/74-recon/measure-ux.mjs` | 74 轮 UX/a11y 总测量（20 KB，15 个 measure-ux 变体之首） | 首屏布局、字段折叠、chip 计数、图区、语义；7 个 W2 信号全中 | ⚠️ 依赖 `tools/`（在库，但 CI 无） |
| `deliverables/63-audit/_ux_counts.mjs` | 芯片/字段/首屏 tab 序（文件头「heading per field」） | `totalChips=45 + moreChips=28 = 73`、`tabsToFirstRow=55`、`afterCopyFocus=prompt-copy` | ✅ 实跑 |
| `deliverables/63-audit/_ux_fields.mjs` | 详情面板 12 段结构 + 390 滚动锁 | `dtCount=22`、`detailsCount`、`termRoles=22`、`scrollLock` | ✅ 实跑 |
| `deliverables/63-audit/_ux_keys_empty.mjs` | ↑ 键是否打开方案而非滚动；空态可执行性 | `arrowBody.y: 0→40`、`arrowSum`、空态按钮承诺 vs 实得行数 | ✅ 实跑 |
| `deliverables/63-audit/_ux_rootcause.mjs` | 复制偷焦点**根因**（focusin/focusout 日志）+ near/direct 样式 | `log: out:BUTTON→in:TEXTAREA→out:TEXTAREA→in:BUTTON`、`nearCount=28`、`identicalFont:true` | ✅ 实跑 |
| `deliverables/63-audit/_ux_a11y_focus.mjs` | skip link、焦点环、**live region 清单**、向导焦点 | `liveRegionsInDoc[]`、`copyState.live`、`fbEsc`、`wResult.live` | — |
| `deliverables/63-audit/_ux_network3.mjs` | **服务端**统计 jpg/woff 请求 + DOM 隐藏图 | `jpgCount=30、jpgMB=4.55`、`dom.hidden=0`、`kinds['desktop-fold']=30` | ✅ 实跑 |
| `deliverables/63-audit/_ux_semantics.mjs` | AX 树 role 计数（listitem 丢失） | `listNodes/liNodes`、`role=button` 覆盖 | — |
| `deliverables/63-audit/_ux_perf_ax.mjs` | 唯一用 **CDP `Network.*` + `Performance`** 的探针 | `requestWillBeSent/responseReceived/loadingFinished` 三事件 | — |
| `deliverables/74-w5/_rt-probe.mjs` | W5 红队总探（本文件同轮产物，**8 信号全中**，唯一一个） | 派生值/chip/near/direct/img/aria/arrow/copy 一次取全 | ✅ 实跑 |
| `deliverables/74-w5/_rt-focus.mjs` | **合成 click vs 真 Input click** 的对照实验 | `synthetic → active=detail-head`；`real → active=prompt-copy` | ✅ 实跑 |
| `deliverables/74-w5/_rt-derived.mjs` | 派生值是否会在详情渲染后重算（毒化测试） | poison 后开 S01/S07 仍是 `POISON`、chip click 后 `chip-groups` 才变 | ✅ 实跑 |
| `deliverables/74-w5/_rt-clip.mjs` | headless 剪贴板权限矩阵 | 无手势 `writeText=NotAllowedError`、`execCommand(copy)=false`、有真点击后 `ok` | ✅ 实跑 |
| `prototypes/_build/probe-ui.mjs` | **已成型的 W5 装置**（本次主角） | 8 条断言 + `--selftest` 7 变异 | ✅ 8/8 + selftest |

### 1.2 按目录的其余探针（用途摘要，均 `Browser.launch` 或等价的 `page.eval`）

| 目录 | 数量 | 代表文件 | 用途 | 可跑 |
|---|---:|---|---|---|
| `62-verify/` | 39 | `r2/b1..b9.mjs`（9 个「路线 B」） | 真机复验 9 项声称；`b3` 逐案开详情验复制按钮、`b9` 搜索 vs 芯片口径分歧 | ⚠️ 全依赖外起 `serve.mjs` 的 `:9583` |
| `62-verify/r2/` | +20 | `c4b.mjs` | 实测 S18 `.ln` 行数 vs `minItems=20`（**正则漏 `class="ln ln--out"` 的教训在此**） | ⚠️ 同上 |
| `63-audit/` | 17 | `_imgs_ux.mjs`、`_bytes_ux.mjs` | 纯 Node 静态：`data.js` 里 shots 字节复算 / 首屏 gzip 字节 | ✅ 无浏览器 |
| `66-exec/` | 69 | `_a11y-probe.mjs`、`_a11y-keycheck.mjs`、`_a11y-regress.mjs` | **移动/键盘 5 缺陷**；三份是「探针自检」的范本（见 §3-C3） | ✅ |
| `66-exec/` | | `_chip-probe.mjs`、`_matrix44.mjs`、`_filters-probe.mjs` | 44 词 × 4 操作顺序矩阵；**期望在 Node 侧独立算**（AND/OR 判别力） | ✅ |
| `66-audit/` | 74 | `m1-list`…`m32-definitive`、`m7-tabindex`、`m17-keyboard` | 编号式审计系列（手机档基线、tab 序、触控目标、确定性抖动 3 轮） | ✅（`file://`，无服务） |
| `67-exec/` | 65 | `_lab/p1-baseline`…`r20`（20 个）、`_accept.mjs` | 390/1440 布局精测、`<details>` 关闭态能否被作者样式展开 | ✅ |
| `69-exec/` | 122 | `m09-images.mjs`、`png.mjs`、`pix-lib.mjs` | **像素级可复现性**：换纯色块后 PNG 是否逐字节一致（图片解码漂移归因） | ✅ |
| `69-test/` | 28 | `_tools/measure-lib.mjs` + `judge.mjs` + `capture.mjs` | **测/判分离**范本（§3-C4）；`server.mjs` 是可复用静态服务 | ✅ |
| `70-audit/measure/` | 19 | `inpage.mjs`、`collect.mjs`、`classify.mjs`、`probe-selftest*.mjs` | 上屏色测量原语 + **fixture 自检**（13 个 FAIL 里区分「测量错」与「期望写错」） | ✅ |
| `70-exec/probes-a/-b/` | 53 | `a08-verify-values.mjs`、`B-linewidth-truth.mjs` | 线宽真值集合；`<use>`/`<symbol>` 可见性判定（两版栽在这里） | ✅ |
| `70-plan/` | 96 | `LEAD-*.mjs`、`probes/p6-linewidth-truth.mjs` | 主色/线宽/断点的取证与反证 | ✅ |
| `73-verify/` | 105 | `ab-stale.mjs`、`_reviewer-hay.mjs`、`probe-p1a-attacks.mjs` | 闸门变异测试；**从源码原样抠出表达式再求值**（不重写字段表） | ✅ |
| `73-plan/` | ~40 | `plan-p1a-mutation.mjs`、`rt-mutation*.mjs` | **镜像仓库 + 变异测试**范本（§3-C5） | ✅ |

> 说明：`69-audit/`(86)、`68-exec/`(36)、`65-exec/`(36)、`65-audit/`(10)、`68-audit/`(11)、
> `66-audit/tpl-audit/`(12) 等另有 **200+** 个同类探针。它们服务的是**当时那一轮的某个具体声称**
> （「线宽 22/30 超纲」「主色 9 案空」），对 W2 的 8 条缺陷**零覆盖或无新增**，本文归入「留档」。

---

## 2. 按 W2 八条缺陷排序（相关性）

> 排序依据：扫描 565 个探针 × 8 个签名正则，再加人工复核。签名与覆盖数见下表；
> 覆盖数按「文件里出现该缺陷的特征串」计，是**上界**（同一文件可能只测了其中一个面）。
> **D1 芯片样式 / D2 芯片数 / D3 字段数 / D4 复制焦点 / D5 ↓ 劫持 / D6 aria-live / D7 隐藏图 / D8 scenesNo**

| 排名 | 缺陷 | 覆盖探针数 | 最佳探针（唯一可抄的） | 备注 |
|---:|---|---:|---|---|
| 1 | **D4 复制偷焦点** | 21 | `_ux_rootcause.mjs`（根因日志）、`_rt-focus.mjs`（合成 vs 真点击）、`66-exec/_a11y-probe.mjs`（真鼠标） | 覆盖最厚，但也**最容易被合成 click 骗**——21 个里至少 5 个用 `.click()` |
| 2 | **D3 字段数** | 18 | `_ux_fields.mjs`（结构）、`_ux_measure.mjs`（折叠计数）、`66-audit/data-m2-detail.json` | 全是「单案」；**无一跑 30 案** |
| 3 | **D6 aria-live** | 16 | `_ux_a11y_focus.mjs`（live 区清单含文本）、`74-recon/measure-ux5.mjs`（含 `ariaStatus`） | 多数只判「属性在不在」，少数读文本 |
| 4 | **D2 芯片数** | 15 | `_ux_counts.mjs`（45+28=73）、`_ux_rootcause.mjs`（label vs rendered） | 已进 `probe-ui` ✅ |
| 5 | **D5 ↓ 劫持** | 10 | `_ux_keys_empty.mjs`（body/a/summary 三种焦点）、`measure-ux11.mjs` | **`74-recon/measure-ux.mjs` 用的是合成 `KeyboardEvent`（陷阱 T2）** |
| 6 | **D1 芯片样式** | 7 | `_ux_rootcause.mjs`（`identicalFont`/`identicalBorder`）、`measure-ux.mjs`（`chipRuleMatched.matches('.chips button')`） | `matches()` 那条是**根因级**断言，优于只比 computed style |
| 7 | **D7 隐藏图** | **4** | `_ux_network3.mjs`（服务端计数）、`_imgs_ux.mjs`（静态字节）、`69-exec/m09-images.mjs` | 覆盖最薄；且**没有一个是 CDP `Network.*` 计数**（见 T5） |
| 8 | **D8 scenesNo** | **1** | 仅 `74-w5/_rt-probe.mjs`（`scenesNoShown: false→true`） | 覆盖最薄；`65-exec/_scenesno.mjs` 是纯 Node 数据侧，不测 UI |

**结论**：`probe-ui.mjs` 选的 8 条方向正确，但 D7/D8 的取证基础**只来自 1–4 个探针**，
新装置在这两条上最可能「写出来但判不准」。§3 给这两条的具体加固。

---

## 3. 可复用技术（逐条附代码）

### C1 — 真键盘：`Input.dispatchKeyEvent` 的必填字段

这是本仓库**最贵的一课**，三个探针独立踩过。规则：

- `type: 'keyDown'`（或 `'rawKeyDown'`）+ **`key`、`code`、`windowsVirtualKeyCode`、`nativeVirtualKeyCode`** 四件套；
- **Enter/空格若要触发原生控件（`<summary>` 开合、`<button>` 激活），必须再带 `text`/`unmodifiedText`**，
  否则浏览器只发「虚拟键」、不合成字符，原生激活走的是 click 合成，于是**不触发**。
- Tab 用 `rawKeyDown` 即可（无字符）；Arrow 键用 `keyDown` + `windowsVirtualKeyCode:40/38`。

**最干净的一份实现**（`deliverables/66-exec/_a11y-regress.mjs:20-27`，逐字）：

```js
const press = async (page, key, code, vk, mods = 0) => {
  const extra = key === 'Enter' ? { text: '\r', unmodifiedText: '\r' } : {};
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods, ...extra });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods });
  await sleep(60);
};
const TAB = (p) => press(p, 'Tab', 'Tab', 9);
const ESC = (p) => press(p, 'Escape', 'Escape', 27);
```

为什么必须有 `text`——同文件 `:23` 写得最清楚：

> 注意 Enter **必须带 `text:'\r'`**：不带的话浏览器只发一个虚拟键、不合成字符，
> `<summary>` 的原生激活行为（走 click 合成）不会触发。这一点坑过我一次 ——
> 我据此以为「修复挡住了 summary 开合」，实际是探针的错。

**现成反例**（`74-recon/measure-ux.mjs:155-166`）——**不要抄这段**：

```js
// keyboard: ArrowDown from body, from a link
const kb = await p.eval(`(() => {
  document.body.focus();
  const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
  document.body.dispatchEvent(ev);
  ...
})()`);
```

合成 `KeyboardEvent` 的 `isTrusted=false`，**不触发浏览器默认行为**（滚动、开合、移焦）。
`66-exec/_a11y-probe.mjs:8-13` 把这条写成了警告：

> 为什么键盘必须走 `Input.dispatchKeyEvent`：`page.eval(() => el.dispatchEvent(new KeyboardEvent(...)))`
> 造的是 `isTrusted=false` 的合成事件，它**不会**触发浏览器默认行为（Tab 移焦、summary 展开）…
> 合成事件测出来的数字不可信。

`probe-ui.mjs` 的 `arrow-key-not-hijacked` 已经用了真 `Input.dispatchKeyEvent`（✅ 正确）。

### C2 — 真鼠标坐标点击（而非 `el.click()`）

焦点落点取决于浏览器自己的 `mousedown → focus` 规则，程序化 `click()` 不跑那套规则。
`66-exec/_a11y-probe.mjs:40-46`（逐字）：

```js
async function realClick(page, x, y) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(250);
}
```

坐标怎么取——先量 rect 再点中心（`69-exec/_bce/interact.mjs:22-27`）：

```js
async function clickEl(page, sel) {
  const b = await page.eval(`(() => { const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return null; e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),...}; })()`);
  ...
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
```

**实测证据**（`_rt-focus.mjs`，本次重跑）：

```
synthetic click result: {"activeNow":"DIV.detail-head"}          ← 合成 click：焦点没落在按钮上
after REAL click settle: {"active":"BUTTON.prompt-copy is-copied"} ← 真点击：焦点正确
```

> ⚠️ 注意：`probe-ui.mjs` 的 `copy-restores-focus` 用的是 `btn.focus(); btn.click()`（合成），
> 但因为它是**先 `.focus()` 再点**，起点被人工摆正，所以这条断言**仍然有效**——
> 它测的是「execCopySync 之后焦点有没有还原」，不是「点击是否移焦」。
> 若将来要测「点击落点」，必须换成 C2 的真坐标点击。

### C3 — 如何读 computed style（并区分「作者样式」与「UA 默认」）

D1（芯片视觉倒置）的根因是**28 颗 near 芯片落在 `.chips` 之外，选择器 `.chips button` 选不中**，
于是回落到浏览器默认（16px / outset 2px / #f0f0f0）。所以判据不能只比两个 computed 值，
要**直接问「这个元素匹配不匹配那条作者选择器」**。`74-recon/measure-ux.mjs:207`：

```js
chipRuleMatched: (() => { const b = document.querySelector('.scene-chip.is-direct'); if (!b || !b.matches) return null;
  return { directMatchesChipsBtn: b.matches('.chips button'),
           nearMatchesChipsBtn: ...matches('.chips button') }; })(),
```

`_ux_rootcause.mjs:40-55` 的「逐档比较」写法（更通用）：

```js
const cs=getComputedStyle(b);
return {moreInsideChips:inChips, moreParent:parent,
  nearCS:{font:cs.fontSize, border:cs.borderStyle+' '+cs.borderWidth, bg:cs.backgroundColor, ...},
  directCS:{...},
  identicalFont: cs.fontSize===dcs.fontSize, identicalBorder: cs.borderStyle===dcs.borderStyle,
  nearCount: more.querySelectorAll('button').length};
```

**教训**：GEOMETRY 类的 computed style 在 `display:none` 的子树上读出来是空/默认值。
`_ux_rootcause.mjs` 必须先 `more.style.display=''` 才能读到 near 芯片的真实样式。
`probe-ui.mjs` 正确地对 `.scene-toggle` 先 `click()` 展开再读。

**实测的当前值**（`_definitive.mjs`，本次重跑，`style.css` 17:35 版）：

| | font | border | padding-top | background |
|---|---|---|---|---|
| direct (16 颗) | 13px | `1px solid` | 4px | `rgba(0,0,0,0)` |
| near (28 颗) | 13px | `1px dashed` | 4px | `rgba(0,0,0,0)` |
| near 按下后 | 13px | `1px dashed` | — | `rgb(28,27,24)` 字 `rgb(242,242,238)` |

### C4 — 测 / 判分离（阈值不跟着实现走）

`69-test/_tools/measure-lib.mjs:1-4` 与 `judge.mjs:1-3` 是本仓库最成熟的一对：

> **measure-lib**：「共享测量库：所有判据的测量原语都在页面里跑，返回可复算的原始数据。
> 设计原则：**原始数据先落盘（raw json），判定在 Node 侧按预先登记的阈值做** ——
> 这样「测什么」与「判多少算过」分离，避免测量时无意识地朝 PASS 调。」
>
> **judge**：「阈值**全部硬编码在本文件里，与 JUDGE.md 里登记的一致**；
> 任何「看到实现后想放宽」的冲动都必须表现成这里的一条注释，而不是一个悄悄改过的数字。」

这是 `probe-ui.mjs` 当前**最该吸收**的一条：它现在把「测量」与「判据」混在同一个 `check()` 里。
对 8 条断言尚可，但一旦扩到 30 案 × 多视口，就必须把 `measure` 与 `judge` 拆开。

**期望值必须独立于被测对象**——`66-exec/_filters-probe.mjs:1-12` 是范本：

> 判据不是"看起来对"，而是每条组合都：
> 1) 与在 Node 里**独立算出的期望行数逐条相等**（期望由 data.js 直接算，不经过页面逻辑）；
> 2) 行卡上印出来的 id 集合与期望 id 集合逐案相同；
> 3) 点「清空筛选」后回到 30/30。
> **期望值独立实现一遍是有意的**：如果我只比对"页面自己前后是否一致"，那页面把 AND 写成 OR 也一样能自洽。

### C5 — 变异测试（证明闸门真的会响）

`73-plan/plan-p1a-mutation.mjs:1-18` 的做法是**镜像仓库**：把真文件逐字节复制到
`_mut/p1a/`，在镜像里改坏，真仓库一个字节不动；断言两件事——退出码 + 输出里出现该响的规则。

`check-docs.mjs --selftest` 是同一思路的「临时目录 + 变异」版（`prototypes/_build/check-docs.mjs:151`）。
`probe-ui.mjs --selftest` 采用了它，但**改的是真文件**（见 §4-T1）。

### C6 — 本地静态服务：三种写法，只有一种能进 CI

实测 448 个探针内联 `createServer`，**335 个**各自抄了同一张 MIME 表。问题不在重复，在**端口**：

| 写法 | 例子 | 问题 |
|---|---|---|
| 硬编码端口 | `62-verify/r2/serve.mjs` `PORT = 9583` + 9 个 `b*.mjs` 连它 | **必须手工先起服务**；跑单个 `b3.mjs` 会连不上 |
| 硬编码端口（很多） | 63-audit `:9611`…`:9631`、74-recon `:9761`…`:9776` | 168 个不同端口，**没有登记表**；两个探针撞端口就互相串页 |
| **临时端口（✅）** | `probe-ui.mjs` `server.listen(0,'127.0.0.1')` + `server.address().port` | 无冲突、无需外部进程 |

`probe-ui.mjs:44` 已经是正确写法：

```js
const server = createServer(async (req, res) => { ... });
...
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const pg = await browser.newPage();
await goto(`http://127.0.0.1:${server.address().port}/${PAGE}`);
```

**必须走 http 而非 `file://`**，理由写在 `74-plan/ENGINEERING.md:96`：
`clipboard` 权限、模块脚本、相对资源在 `file://` 下与 Pages 不同。
但注意 `66-audit/` 那 74 个探针**全部用 `file://`** —— 它们测布局可以，**测剪贴板不行**。

### C7 — 检测控制台错误

`vendor/cdp.mjs:132-134` 已经在 `Page` 构造时挂了监听，任何探针拿 `page.consoleErrors` 即可：

```js
browser.on(sessionId, 'Runtime.exceptionThrown', (p) => {
  this.consoleErrors.push((p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || '').slice(0, 300));
});
```

`62-exec/tpl-integration/probe-diag.mjs:7-8` 展示了**同时**挂 `exceptionThrown` + `consoleAPICalled`
（后者抓 `console.error`，前者不抓）：

```js
b.on(p.sessionId, "Runtime.exceptionThrown", (x) => errs.push(JSON.stringify(x).slice(0, 500)));
b.on(p.sessionId, "Runtime.consoleAPICalled", (x) => errs.push("console:" + JSON.stringify(x.args).slice(0, 300)));
```

`probe-ui.mjs` 目前**没有**断言 `consoleErrors.length === 0`。这是一条**便宜且高价值**的补充：
一个 `app.js` 崩了但页面仍渲染出部分 DOM 的场景，`probe-ui` 的 8 条可能大部分仍绿（见 T4）。

### C8 — 网络请求：服务端计数 vs CDP `Network.*`

`_ux_network3.mjs`（服务端计数）与 `_ux_perf_ax.mjs`（CDP `Network.*`）是两种口径。
`_ux_perf_ax.mjs:24-32` 是唯一用 CDP 三事件的：

```js
await p.send('Network.enable', {});
const reqs = new Map();
b.on(p.sessionId,'Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, type: e.type, ... }));
b.on(p.sessionId,'Network.responseReceived', (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; ... } });
b.on(p.sessionId,'Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.finished = e.encodedDataLength; });
```

**两者差别**：服务端计数 = 「浏览器真的来要了几张」；DOM 计数 = 「最终有几张 `<img>`」。
`_ux_network3.mjs` **同时给了两者**，这才是 D7 的完整口径：

```js
const jpg = log.filter(x => /\.jpg$/i.test(x.url));      // 服务端
const dom = await p.eval(`(()=>{ const imgs=[...document.querySelectorAll('.shots img')]; ... })()`); // DOM
```

> **`probe-ui.mjs` 的现状**：它的 `no-hidden-screenshot-downloads` **确实**维护了 `servedImages`
> 计数（`:42/:48/:212/:235`），但只用它拼 detail 字符串，**从未拿它做断言**。
> 判据仍是 `hidden === 0 && imgs <= rows`。所以「服务端下载数 == DOM 图数」这条**实际上没有守**：
> 若有人把隐藏规则从 `display:none` 改成别的（如 `visibility:hidden` 或负 margin 移出视口），
> `hidden` 数不变、`imgs` 数不变，但 60 张仍被下载 —— 这条断言会绿。见 §5.3 第 3 条。

---

## 4. 陷阱清单（新装置照抄就会重犯）

> 这一节是本文件的核心。每一条都是**有人已经踩过、并写在探针注释里**的。
> 一个重复这些陷阱的新 harness，比没有更糟——它会给出「绿」的假证据。

### T1 — `--selftest` 原地改真文件 → 并发即数据竞争 🔴

`probe-ui.mjs:395-420` 的 `runSelftest` 用 `fs.writeFileSync(path, src.replace(...))` 改
`prototypes/_selection/{style.css,app.js,prompt-copy.js}`，再在 `finally` 里还原。
**本次实测撞上三个并发 `probe-ui.mjs` 进程**，`app.js` 被留在变异态近 2 分钟：

```
-    if (arrow && !detailOpen) return;
+    if (false) return;
```

这在 CI（单进程串行）无碍，但在**多 Agent 并行开发**时会让别的探针读到变异后的页面——
本次我自己的 `_definitive.mjs` 就一度测到 near 芯片 `16px`（正是变异态），而干净树是 `13px`。
**修法**：照 `73-plan/plan-p1a-mutation.mjs` 的镜像仓库法（复制到临时目录再变异），
或至少 `mkdtempSync` + 只变异副本。`check-docs.mjs:151` 已是这个写法。

### T2 — 合成 `KeyboardEvent` 测键盘 🔴

见 §3-C1。`74-recon/measure-ux.mjs:158` 用它测 ArrowDown，得到的 `defaultPrevented`/`scrollY`
**不可信**：合成事件不触发默认滚动。而 `_ux_keys_empty.mjs`（真 `Input.dispatchKeyEvent`）
测出 `y: 0→40`。**两条探针对同一缺陷给出不同数字，真值只能信真事件那条。**

### T3 — `field-out` 让「12 段」的判据自相矛盾 🔴

- `fillDerived()`（`app.js:1725`）数的是 `.field:not(.field-out)` → **12**；
- DOM 里 `.fields > div` 实际是 **13**（多出 `.field-out`「不适合的场景」，即 D8 的修复产物）；
- README/`check-docs` 认的是 `field('` 字面量 + `auditFold` = **12**（`check-docs.mjs:766` 注释）；
- 我的全 30 案实测（`_gap-fieldcount.mjs`）：**`{"13":30}`**，即 30 案 DOM 全是 13 段、不含 field-out 是 12。

**陷阱**：`ENGINEERING.md:1.3#3` 原写的断言是「`#d-body .fields > div` 恰好 12」——
照它写，**修复日当天就假红**（实测 13）。`probe-ui.mjs` 已经避开（用 `:not(.field-out)`），
但它现在的判据是「界面 12 = `:not(.field-out)` 12」，**两边同源**，证明不了「真的是 12」。
**正确判据**应三方独立：`data-derived` 文本（12）+ 剥离后 `field('` 计数（12）+ DOM `:not(.field-out)`（12），
任一不等即红 —— 这正是 `check-ui-copy.mjs` 应当承担的（见 §5）。

### T4 — 「断言没有坏东西」之前，「好东西确实在」是**前置条件** 🟠

`probe-ui.mjs:282-287` 自己写下了这条教训：

> ⚠️ 前置条件：页面必须真的渲染出了行。否则「0 行 0 张图」会被判成
> 「没有隐藏图，通过」—— 实测注入一个 `app.js` 崩溃后，这条是 4 PASS 里的一条假绿。

同理 `arrow-key-not-hijacked` 加了 `scrollable` 前置（`:216`）。**新加的每一条「不存在 X」断言，
都要配一条「Y 存在」的前置**，否则 `app.js` 一崩，一半断言静默变绿。

### T5 — 「0 张真实图片」是因为懒加载没请求（D7 的镜像陷阱）🟠

这正是任务描述点名的那条。仓库文档给了两处原始记录：

- `prototypes/_selection/app.js:443-446` 旧注释（现已改）：
  > 不加 `loading="lazy"`：闸门在 1440 档统计到"真实图片 0 张"，因为视口外的懒加载图在这一轮采集里根本没请求。
- `74-recon/verify-ux.md:187-188` 复述同一句，并在 `:194` 指出**这段注释里的数字从写下的第一天就是错的**
  （「整页 48 张」实际从一开始就是 90 张）。

**陷阱的形状**：`vendor/probe.mjs:411` 的 `realPictures` 判据里有 `el.naturalWidth > 0`——
图没被请求 → `naturalWidth === 0` → **不计入真实图片** → 闸门报「0 张真实图片」→ 触发 `few-pictures` FAIL。
于是有人为了「让闸门数得到图」去**去掉 lazy**，反而制造了 D7（60 张隐藏图全下载）。
**正确做法**：量图片时要么先滚到底触发懒加载（`69-exec/m09-images.mjs:32-40` 有现成滚动脚本），
要么用「DOM 里有几个 `<img>`」而非「`naturalWidth>0` 的有几个」作为分母。

`69-exec/m09-images.mjs` 的滚动触发脚本（逐字，含 `decode()`）值得直接抄：

```js
await page.eval(`(async () => {
  const H = innerHeight, max = Math.max(0, document.documentElement.scrollHeight - H);
  for (let y = 0; y <= max; y += Math.round(H*0.5)) { window.scrollTo({top:y,behavior:'instant'}); await new Promise(r=>setTimeout(r,120)); }
  ...
  await Promise.all([...document.images].map(i=>i.decode().catch(()=>null)));
  return true;
})()`);
```

### T6 — `measure` 规则对中文是**结构性假阳性**（0.5em 假设）🟠

`vendor/probe.mjs:447`：

```js
measureChars: longest ? Math.round(longest.w / (longest.size * 0.5)) : null,
```

假设「一个字符宽 0.5em」是拉丁字母；汉语全宽约 **1.0em**，于是中文行长被算成 2 倍，
任何超过 ~68 汉字的行都会被判 `measure` WARN（`rules.mjs:119`，阈值 `>88`）。
`prototypes/_CONTRACT.md:185-188` 的裁定：

> 它假设一个字符平均占 0.5em —— 那是拉丁字母的假设，**中日韩汉字实际约 1.0em**。
> 后果：任何一行中文只要超过约 68 个汉字，就会被算成 136 并触发 `measure` FAIL/WARN。
> **不要把 `measure` 当成中文页的真实缺陷**，也不要去为了它把中文段落压到 34 个汉字宽。

**陷阱**：新 harness 若把 `inspect.mjs` 的 `measure` 规则结果当回归基线，中文页会**永远红**；
若为了消红去压窄正文，会**把版心做坏**（这正是原注释警告的）。
`probe-ui.mjs` 没有碰 `measure`（正确——它只测行为，不测审美）。
**但 `check-ui-copy.mjs` 若引入「行长」类检查，必须先做 `÷2` 换算或直接换 `measureText`。**
`66-plan/_p6_waste.mjs:4` 有正确做法：

> 字符显示宽度用 canvas `measureText` 逐字累加（CJK=1em，拉丁按实测），所以不是"字节当字数"。

### T7 — `<use>`/`<symbol>` 可见性：两版探针都栽在 0×0 🟡

`70-exec/probes-b/B-linewidth-truth.mjs:121-133`（逐字）：

> ① 模板几何的可见性判定 —— 这是整个探针最容易搞错的地方，两版探针都栽在这里。
> · `<symbol>`/`<defs>` 里的几何**不直接渲染**，它的 rect 是 0x0、不在视口内。
> · 但被 `<use href="#id">` 引用后，**实例是渲染的**。
> · 实例在 shadow tree 里，`querySelectorAll` 选不到 —— 不能靠「给 symbol 内的 path 量 rect」判断，
> 那样永远得到 0x0，于是把真实的蚀刻线判成「没画」。
>
> 正确做法：**以 `<use>` 元素为宿主**。

对 W2 的 8 条**不直接相关**，但若 harness 扩到「图/线是否存在」，会立刻撞上。

### T8 — 文本抗锯齿被误判为「集合外颜色」🟡

`70-audit/measure/classify.mjs:69-77`：

> 文字抗锯齿的混合**不在 sRGB 直线上** —— Chrome 对文字走 gamma 校正混合，glyph 边缘会出现
> 「偏离任何两色连线」的像素。实测：S21 孤立像素 178358 个，其中 174889 (98.1%) 落在文字墨迹矩形 ±3px 内…

**陷阱**：任何「量页面实际用了哪些颜色」的断言，不剔除文字边缘就会 90%+ 变成测字体渲染器。
`probe-ui.mjs` 不测颜色（正确）。若未来加「色板一致性」，必须抄 `textedge` 分类。

### T9 — `class="ln ln--out"` 正则漏匹配：先怀疑自己的正则 🟡

`66-exec/_count-units.mjs:31`：

> ⚠️ 2026-10-27 修：`<span class="ln">` 这个正则**漏了带修饰类的行**。
> S18 的 60 行里有一批是 `class="ln ln--out"`…只匹配完全等于 `"ln"` 的写法会数出 47 行 / 3 段 = 15.67，
> 看起来像数据的错。…**教训：审计文档说 20 就该先怀疑自己的正则，而不是先怀疑数据。**

### T10 — headless 剪贴板：没有真手势就 `NotAllowedError` 🟠

`_rt-clip.mjs` 本次实测：

```
clipboard NO gesture: {"isSecure":true,"hasApi":true,"perm":"granted","write":"NotAllowedError..."}
clipboard after programmatic click: NotAllowedError
clipboard.readText: NotAllowedError
execCommand(copy) no gesture: false
```

而**有真鼠标点击后**：`{"write":"ok"}`。
**陷阱**：若 harness 断言「剪贴板内容 == 提示词全文」，headless 下**永远失败**。
`probe-ui.mjs` 的处理正确——把 `navigator.clipboard.writeText` 打桩成成功，**只验焦点路径**，
并在注释里写明「不验剪贴板是否真写入」。这个取舍必须保留并写进文档，否则后人会去「修」它。

另外：`prompt-copy.js:932` 记录了**更隐蔽的一层**——`exec` 返回 `true` 但剪贴板未变：

> 按钮显示"已复制 ✓"，但系统剪贴板逐字节比对**没有变化**。⇒ 返回值不可信。

所以「复制成功」的唯一可信信号是 `writeText` 的 Promise，不是 `execCommand` 的返回值，
更不是按钮文字。harness 若以按钮文字断言，会在 `exec` 假成功时假绿。

### T11 — 端口硬编码 + 外起服务（可用性陷阱）🟡

见 §3-C6。`62-verify/r2/b1..b9.mjs` 全部连 `http://127.0.0.1:9583`，必须手工先跑 `serve.mjs`。
单个跑 = 连不上。**这不是 correctness 陷阱，是「以为能跑其实跑不了」的陷阱**——
考古时若把 `b3.mjs` 当「现成可用的复制按钮探针」，会浪费一轮。

### T12 — flaky：`m20-determinism` 的抖动与 `sleep` 依赖 🟡

`66-audit/m20-determinism.mjs` 连测 3 轮比 `scrollHeight` 抖动——说明仓库自己承认
「同一视口连测会有像素级抖动」。`69-scratch`/`69-exec` 的 `pix-lib.mjs` 更是专门为此建库
（`sha256` 整页 + 元素几何签名）。
**陷阱**：新 harness 若用「截图逐字节相等」做回归，会因字体/抗锯齿抖动而 flaky。
`probe-ui.mjs` 用 computed style 与 DOM 计数（正确，稳定）而非像素。

---

## 5. 建议：promote / 留档 / 删

### 5.1 Promote（进 `prototypes/_build/`，改名并接入 CI）

| 现状 | 建议 | 理由 |
|---|---|---|
| `prototypes/_build/probe-ui.mjs`（已存在，8/8 绿） | **保留为唯一运行时入口**；按 §5.3 补 4 处 | 已覆盖 8 缺陷，有 `--selftest` |
| `prototypes/_build/check-ui-copy.mjs`（已存在） | **保留为唯一静态入口**；补 §5.4 的 `field-out` 三方对账 | `index.html` 首次进闸门 |
| `66-exec/_a11y-keycheck.mjs` | **把「三种按法对照」并入 `probe-ui.mjs --selftest`** 自检段 | 证明 Enter 必须带 `text`，防止后人「简化」掉 |
| `66-exec/_a11y-tabcount2.mjs` | **抽 `TAB`/`press` 助手进 `_build/vendor/keys.mjs`** | 三处重复实现，且只有它写对了「先展开再按」的顺序 |
| `69-test/_tools/measure-lib.mjs` + `judge.mjs` 的**设计模式** | 当 harness 扩到 30 案时采用（不复制代码，抄结构） | 测/判分离，阈值不随实现漂移 |
| `73-plan/plan-p1a-mutation.mjs` 的**镜像仓库法** | 改 `probe-ui.mjs --selftest` 为副本变异（修 T1） | 并发安全 |
| `63-audit/_ux_network3.mjs` 的**双口径**（服务端 + DOM） | 并入 D7 断言 | 当前只数 DOM，看不到「下载了但隐藏」 |

### 5.2 留档（保留为 archaeology，不进 CI、不删）

- `deliverables/63-audit/_ux_*.mjs`（10 个）：**它们是 W2 全部 8 条缺陷的原始证据**。
  删了就无法回答「这个数当初怎么量出来的」。保留，但在目录加一行 `README` 指明
  「证据快照，勿改；现役装置在 `prototypes/_build/`」。
- `deliverables/74-recon/measure-ux*.mjs`（15 个）：同上，且含 §4-T2 的反例，**有教育价值**。
- `deliverables/66-audit/m*.mjs`（74 个）：手机档/触控/tab 序的度量史。
- `deliverables/70-audit/measure/`、`70-exec/probes-*/`、`70-plan/LEAD-*`：颜色/线宽取证。
- `deliverables/73-verify/`、`73-plan/`：闸门变异测试史，**`plan-p1a-mutation.mjs` 要标星**。
- `deliverables/69-exec/`（122 个）：像素可复现性。`png.mjs`/`pix-lib.mjs` 若将来做视觉回归，可复用。

### 5.3 `probe-ui.mjs` 的 4 处加固（按优先级）

1. **🔴 修 `--selftest` 的并发竞争（T1）**：改为 `mkdtempSync` 副本 + `--root` 指向副本。
   否则多 Agent/并行 CI 会互相污染（本次已实测发生）。
2. **🟠 加 `consoleErrors` 断言**：`page.consoleErrors.length === 0`。便宜、能抓「崩了但半渲染」。
3. **🟠 D7 把已有的 `servedImages` 计数变成真断言**（抄 `_ux_network3.mjs` 的双口径）：
   当前 `servedImages` 只拼字符串、不判。应断言 `loaded === rows`（每行 1 张），
   并显式断言 `.shot` 无 `display:none`（当前只数 `#ledger .shots .shot`，够用但需连同服务端数一起判）。
4. **🟠 D8 加「负向前缀」判据**：当前 `scenes-no-rendered` 只判 `.field-out` 存在且含「不适合：」。
   但 `CRITIQUE-DELIVERY.md:345` 指出 **27/30 案首句不含否定词，极性全靠「不适合：」前缀**——
   应加一条「若去掉前缀，文本不含否定词 ⇒ 必须保留前缀」的断言，防未来有人把它挪进 `title`。

### 5.4 `check-ui-copy.mjs` 建议补的（解决 T3）

`field-count` 应**三方独立对账**，而不是让 `probe-ui` 自证自洽：

| 来源 | 期望 | 现状 |
|---|---|---|
| `app.js` 剥离注释后 `field('` 计数 + `auditFold` | 12 | `check-docs` 已算 |
| `index.html` 的 `data-derived="field-count"` 静态回填值 | 12 | 写死 12（回填前） |
| 运行时 DOM `#d-body .fields > div:not(.field-out)` | 12 | **无独立闸门**，只有 `probe-ui` 自比 |
| 运行时 DOM `#d-body .fields > div`（含 field-out） | **13** | **无人断言** |

后者（13）是 D8 的修复产物，**应显式登记为 13**，否则下一个人看到「DOM 里 13 段、界面说 12 段」
会以为是新 bug 而去「修」，把 D8 的修复删掉。

### 5.5 Delete（真·死重，可安全删）

| 路径 | 理由 |
|---|---|
| `deliverables/62-verify/_a_old.js`、`_d_old.js`、`_p_old.js` | 名字即 `old`；被同目录 `*.HEAD.js`/工作版取代 |
| `deliverables/66-exec/_out/*.BASE.js`、`.HEAD.js`、`.MINE.js` | 三份并存的 diff 中间快照，结论已进文档 |
| `deliverables/73-verify/_bk/dbg1..dbg14.mjs` | 14 个一次性调试脚本，`dbgN` 递增命名 |
| `deliverables/40-scratch/chrome-prof-*`（5 个目录） | Chrome 用户数据目录垃圾（含扩展源码），非探针 |
| `deliverables/99-scratch/chrome-*`（多个） | 同上 |

> 删除前请 `git status` 确认未被 track；多数本就在 `??` 里。

---

## 6. 未覆盖清单（W2 八条中现有探针从未测过的）

| 缺口 | 证据 | 影响 |
|---|---|---|
| **30 案全量** | 所有探针只开 S01/S07；唯一 `for i<30` 的 `measure-ux12.mjs` 是数 Tab 次数，不是开案 | 字段数/`scenesNo`/隐藏图 的「30/30」从未被断言（我本次实测 30/30 都是 13、都有 `不适合：`） |
| **`consoleErrors === 0`** | `probe-ui.mjs` 无此断言；`63-test/scripts/03-render.mjs:212` 有但只用于原型页 | app.js 半崩时 8 条断言可能大部分仍绿 |
| **真手势下的剪贴板内容** | headless 下 `writeText` 无手势必失败（T10） | 「复制走的是全文」只能验证到「提示词字符串正确」，验不到「真进了剪贴板」 |
| **D8 的截断极性** | 只有 `_rt-probe` 判 `.field-out` 存在 | 若 `scenesNo` 被挪进 `title`/向导卡而丢前缀，语义翻反，无探针能抓 |
| **D7 的服务端 vs DOM 双口径** | `probe-ui` 维护 `servedImages` 但只拼 detail、不判（见 §3-C8 注） | 若隐藏规则改成 `visibility:hidden`/负 margin，DOM 数仍对但下载翻倍，断言仍绿 |
| **330 个芯片的目标尺寸（24px 触控）** | `66-audit/m18-targets-detail.mjs` 有，但未进 `probe-ui` | W2 未要求，但 `probe-ui` 扩 3 视口时应带 |
| **多视口** | `probe-ui` 只 1440×900 | 390 档 details 开合、详情全屏模态未回归（ENGINEERING.md 任务 19 列为后续） |

---

## 7. 一句话交接

**别新写。** `prototypes/_build/probe-ui.mjs` + `check-ui-copy.mjs` 已是 W5 的骨架、且 8/8 绿。
接下来 5 天的价值排序：① 修 `--selftest` 并发竞争（T1）；② 补 `consoleErrors` 与 D7 双口径；
③ 把 `field-count` 做成三方独立对账（T3）；④ 给 D8 加「截断极性」断言。
其余 200+ 探针是**证据档案**，不是待办清单——它们已经完成了使命：证明了这 8 个缺陷真实存在。

---

### 附：本次新增的取证脚本（均在 `deliverables/74-w5/`）

> 说明：`74-w5/` 与我并发的还有 W5 红队 Agent。`_rt-*.mjs`（`_rt-probe`、`_rt-focus`、`_rt-derived`、
> `_rt-clip`、`_rt-counts`、`_rt-copyroot*`、`_rt-taut`、`_rt-brittle`、`_rt-clipgrant`、`_stale-git`）
> 是**对方**的产物——本文把它们当「已有的 W5 探针」引用与评价，**不是**我写的。
> 下列三个是本文新增的：

| 文件 | 作用 |
|---|---|
| `_definitive.mjs` | near/direct 样式 + 派生值 + 图 + aria 的干净读数（可反复重跑，不毒化） |
| `_focus-ab.cjs.mjs` | 复制焦点的 A/B（程序化 `.click()` vs 真鼠标坐标点击） |
| `_gap-fieldcount.mjs` | **全 30 案**字段数实测（`{"13":30}`），本文 §4-T3 的证据 |

扫描用的两个一次性脚本（`_scan-probes.cjs` / `_coverage.cjs`）跑完即删，
口径已写进 §1/§2 的正文，可据此重写。
