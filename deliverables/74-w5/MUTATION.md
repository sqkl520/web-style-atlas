# W5 变异测试报告（MUTATION）

目标：用「应当被抓住」的变异去打两道新闸门，找出漏网之鱼。
执行：2026-11-09，本机 Node `/d/Nodejs/node` + 无头 Chrome（CDP），工作树 `D:/Web/style`。

- Gate 1 `prototypes/_build/check-ui-copy.mjs`（静态，快）
- Gate 2 `prototypes/_build/probe-ui.mjs`（运行时，每跑 ~20–40s）

> **重要前提：测试期间有并发写入。**
> 任务开始时 `prototypes/_selection/app.js` 的工作树里留着一句
> `throw new Error("__simulated_crash__")`（第 7 行），是上一位 agent 变异没还原的残留；
> 期间 `probe-ui.mjs` 也被另一个 agent 从 381 行改到 439 行（补上了原先缺的
> `chip-count-derived` 自检用例）。所有结论都是**在 `md5sum` 守卫下重跑**得到的：
> 每次跑前跑后比对四个源文件的 md5，确认「文件未变」才采信该次数值。
> 早期未加守卫的几次结果（曾出现 8/8、4/8、5/8 三连）已被判定为并发污染，作废。

---

## 一、结果总表

| # | 变异 | 闸门 | 预期 | 实际 | 判定 |
|---|------|------|------|------|------|
| 1 | summary 退回手写 `筛选 · 11 组 47 颗芯片` | check-ui-copy | FAIL | **FAIL** exit 1：`✗ [chip-count-hardcoded] …「11 组」` + 2 条 `derived-key-unused` | 抓住 |
| 2 | `fillDerived` 的 `'chip-count'` 改成 `'chipcount'` | check-ui-copy | FAIL | **FAIL** exit 1：`✗ [derived-key-unknown]` | 抓住 |
| 3 | 新增第三处硬编码 `<p>每案 10 段</p>`（`</body>` 前） | check-ui-copy | 应 FAIL | **PASS** exit 0，`FAIL 0 / WARN 0` | **漏网 ★** |
| 3b | 保留 span，但把量词从「颗」改成「个」，同时手写 `47 个` | check-ui-copy | 应 FAIL | **PASS** exit 0 | **漏网 ★** |
| 3c | 保留 `data-derived` span，把兜底值 `45` 改成 `47`（真值 73） | check-ui-copy | 应 FAIL | **PASS** exit 0 | **漏网 ★** |
| 3c′ | 同 3c，交给运行时闸门看 | probe-ui | 应 FAIL | **PASS 8/8**（JS 一跑就把 47 覆盖成 73） | 不适用/需组合 |
| 4 | 删掉 `.scene-chip.is-near { border-style: dashed; ... }` | check-ui-copy | FAIL | **FAIL** exit 1：`✗ [legend-not-implemented]` | 抓住 |
| 5 | 让 `fillDerived()` 的填充循环永不执行（`i > 999`） | probe-ui | FAIL | **FAIL 7 PASS / 1 FAIL**：`✗ chip-count-derived want 10 got 11`（11 = HTML 兜底值） | 抓住 |
| 6 | `app.js` IIFE 顶部 `throw new Error("x")` | probe-ui | 应 FAIL | **FAIL 3 PASS / 5 FAIL**，连跑 5 次完全一致 | 抓住（但见 §三） |
| 6b | 渲染与接线**之后**才抛（`setTimeout(…, 1500)`） | probe-ui | 视设计 | **PASS 8/8** | 不报（低危，页面功能已就绪） |

结论速览：**静态闸门被 3 种变异绕过（#3 / #3b / #3c），运行时闸门 0 漏网**。
`--selftest` 现为 8/8（原先 7/8，缺的正是 `chip-count-derived`）。

---

## 二、最严重的缺口

### 缺口 A（最重要）：`check-ui-copy.mjs` 只做「两处定点正则」，不做全页扫描

`check-ui-copy.mjs:84-99` 的 `HARDCODED_GUARDS` 只有两条锚点：

```
rail-fold-sum 里  /\d+\s*组|\d+\s*颗/
rail-note     里  /(多数案|个别)\s*\d+\s*段/
```

没有第三条「任何页面位置出现复述可计算量的裸数字」的通用规则。
把同一句话挪个 DOM 位置就完全隐形：

```html
<!-- 插在 </body> 之前 -->
<p>每案 10 段</p>
```
→ `合计 FAIL 0 / WARN 0`，exit 0。

这不是理论风险：`每案 10 段` 就是 W2 修掉的那句话本身，一条断言都没响。

### 缺口 B：锚点正则认字面量，改量词即绕过

把 summary 里的「颗」换成「个」，再手写一个错数字：

```html
<span data-derived="chip-count">45</span> 个芯片（手写：47 个）
```
→ `FAIL 0 / WARN 0`，exit 0。`digits` 只匹配 `组|颗`，`个` 不匹配。

### 缺口 C：抹掉 span 内容的同时，也豁免了「兜底值本身是错的」

`check-ui-copy.mjs:104`：

```js
const masked = m[1].replace(/<span[^>]*data-derived="[^"]*"[^>]*>[\s\S]*?<\/span>/g, '<DERIVED/>');
```

设计本意是「span 里的数字由 JS 填，不算手写」—— 但**兜底值就是静态文本**：
JS 因任何原因没跑（404、抛错、无 JS 抓取、首屏早于 DOMContentLoaded、复制到别处打开），
用户看到的就是兜底值。实测把 `45` 改成 `47`（真值 **73**），闸门 exit 0。

运行时闸门也救不了：`probe-ui.mjs` 是在 JS 正常执行后读 `textContent` 的，
JS 一跑就把 47 覆写成 73，所以 8/8 全绿。**两闸门合起来仍然漏。**

（此条与 `deliverables/74-w5/REVIEW.md §一.1` 是同一处，我从变异侧独立复现并给出数值。）

---

## 三、「app.js 抛错」这一条是怎么处理的

**结论：不抛在加载期就会被抓住，但不是因为闸门「知道 JS 崩了」，而是因为 DOM 没建出来。**

实测（5 连跑，文件 md5 前后不变）：

| 变异 | 结果 |
|------|------|
| IIFE 顶部 `throw new Error("x")` | **3 PASS / 5 FAIL**，5 次完全一致 |
| 接线之后 `setTimeout(() => { throw }, 1500)` | **8 PASS / 0 FAIL** |

顶部抛错时红的是这 5 条：`chip-count-derived`（`got 11` = HTML 兜底）、
`field-count-derived`（`got 12` = HTML 兜底）、`copy-restores-focus`（找不到按钮）、
`no-hidden-screenshot-downloads`（0 行）、`scenes-no-rendered`（没有 `.field-out`）。
仍然绿的是 `chip-direct-vs-near-styling` / `arrow-key-not-hijacked` / `count-aria-live`
—— 这三条只读静态 HTML/CSS 就能过，不依赖 app.js。

**为什么这仍然算问题（只是没你想的那么糟）**：

1. **失败信息会误导人**。它打印的是「组数不符（手写数字回来了？）」，
   读起来像回归，实际是「JS 根本没跑」。真正的原因是 JS 异常，而探针**没有装
   `Runtime.exceptionThrown` 监听**（全文件 grep 0 处）。一个把「脚本崩溃」
   报成「数字写错了」的闸门，会让人去改错地方。
2. **迟到的抛错完全静默**（8/8 绿）。如果异常发生在渲染/接线之后的任何异步路径
   （滚动、resize、hashchange、复制、搜索），探针看不见。
3. **对比基线容易误判**：抛错态 3/8 与真实回归态（例如只错数字）可能同为「若干红」，
   靠数 PASS 数分不出病因。

**修法（最小）**：启动后在页面注入
`window.__errs = []; addEventListener('error', e => __errs.push(String(e.message)));`
（在 `goto()` 之前 `Page.addScriptToEvaluateOnNewDocument`），
跑完断言后加一条 `no-uncaught-js-errors`：`__errs.length === 0`，
失败时打印真实异常消息。这样「崩了」与「数字错了」在输出上第一次可区分。

---

## 四、`--selftest` 覆盖情况

`runAll` 有 8 条断言。任务开始时 `runSelftest` 的 `CASES` 只有 5 条文件变异
+ 2 条运行时注入 = **7/8**，漏的是 **`chip-count-derived`**
（`probe-ui.mjs` 自己的注释第 286 行还写着「未单独跑，同 3 的机制」）。

测试期间该文件被另一个 agent 更新（381 → 439 行），补进了这条用例：

```js
{
  name: 'chip-count-derived',
  file: 'prototypes/_selection/index.html',
  from: '筛选 · <span data-derived="chip-groups">11</span> 组 <span data-derived="chip-count">45</span> 颗芯片',
  to:   '筛选 · 11 组 47 颗芯片',
  ...
}
```

实测 `node prototypes/_build/probe-ui.mjs --selftest` → **自检：8/8 条变异被对应判据识别**，exit 0。
另外这一版把变异改成**内存里做、不落盘**（`mutations` 表 + 自定义 server），
修掉了旧版「selftest 直接改写被 git 跟踪的源文件、被 kill 就留脏」的问题
（那正是我开工时在 `app.js` 里捡到 `__simulated_crash__` 的原因）。

**残余建议**：`--selftest` 自身没有守卫「变异是否真的生效」之外的**独立性**检查 ——
它用 `runAll` 跑全部 8 条，只要目标那条红就算过；如果某条断言因为**别的原因**
恒红（例如环境问题），selftest 会把它算成「变异被识别」。建议加一条基线前置：
先跑一次 `runAll` 断言 8/8 全绿，否则 `--selftest` 直接拒绝运行。

---

## 五、给每个缺口的修法

| 缺口 | 具体修法 |
|------|----------|
| A 新增位置漏扫 | 加第三条通用规则：先剥 `data-derived` span 和 `<script>/<style>/<code>`，再对 `innerText` 扫 `/(\d+)\s*(组|颗|段|张|个|条|款)/`，命中就 WARN 并**要求该处 5 行内有 `data-derived`**；宁可先 WARN 收窄误报，也别留 0 覆盖。 |
| B 量词变体 | `digits` 的量词表改成 `组|颗|个|段|张|条|款|款芯片`，或直接复用 A 的统一扫描（A 做好后 B 自动消失）。 |
| C 兜底值豁免 | 加断言：**`data-derived` span 的静态文本必须是空或 `—`**。这样 JS 没跑时用户看到的是「—」而不是一个错数字，且闸门能静态检查。`index.html:153` 的 `11`/`45` 改为 `—`。 |
| D 崩溃不可见 | `probe-ui.mjs` 装 `Page.addScriptToEvaluateOnNewDocument` 收集 `error`/`unhandledrejection`，新增第 9 条断言 `no-uncaught-js-errors`；同时把 `chip-count-derived` 失败时的 detail 从「手写数字回来了？」改成先判「DOM 是否渲染」再判「数字是否相等」。 |
| E selftest 恒红不可辨 | `--selftest` 开跑前先做一次基线 `runAll`，非 8/8 直接 exit 2（「基线不绿，自检无意义」）。 |

---

## 六、清理

所有变异均已还原，四个源文件与开工时 md5 一致：

```
66cad64f0c638c9a3a4653e513f5b4e8  prototypes/_selection/app.js
b1cc2ceb0b788d5a1aafa6a3af0afb78  prototypes/_selection/index.html
90b21abc10318e9a07258fc8b658d8f6  prototypes/_selection/style.css
4b5f6d58a449f4b2320a4644b4eb28d5  prototypes/_selection/prompt-copy.js
```

`git status --porcelain prototypes/` 只剩预期的 W5 改动
（`data.js` 的字段改写 + 两个未跟踪的闸门文件），无我引入的残留。
注：开工时 `app.js` 里那句 `throw new Error("__simulated_crash__")` 已用
`git checkout --` 清除（上一位 agent 的残留，不是我的变异）。
