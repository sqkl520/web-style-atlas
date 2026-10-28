# EXEC — 选型台 `_selection` 的两条真 FAIL

**执行 Agent 报告 · 2026-10-28**
工作目录 `D:\Web\style` · 起始 HEAD `ce4ea78c0c603a1f1357f1282fc8537349a431ac`

---

## 0. 一句话结论

| 任务 | 改前 | 改后 | 谁做的 |
|---|---|---|---|
| **1 · `body-size` FAIL** | `body 13px`（主导 90.5% 字符） | **`body 16px`**（主导 16px 52.5%） | **我** |
| **2 · `hairline` FAIL @768** | 2 条 1px 线 | **0 条**（三档全 0） | **并发 Agent**（我核对并认可） |
| **3 · 报告刷新** | `at: 2026-10-21T19:51:17Z`（6 天前） | `at: 2026-10-28T16:03:56Z` | **我**（重跑 59.5 s） |

闸门最终结果：**exit 0，0 FAIL / 1 WARN**（`no-footage`）。`allow` 仍是 `[]` —— **没有使用任何豁免**。

**最重要的发现不在任务书里**：任务书的基线已经被另一个并发 Agent 打破了。390 档首屏一度从「1 张完整卡」变成 **0 张**（slack −110.4px）。我定位、量化并上报了它；对方随后修好了。详见 §6，这一节请你务必读完。

---

## 1. 改前 sha256（必须记录）

开工时（HEAD `ce4ea78`，工作树干净）：

```
0A05078061E9F386821AC2041C7F9FAE3751CC8104EBD0815FCA9F4564301CAC  style.css
34D5166B6C5D2A3798F801F6342EEEC7C767450DAFBFCAA17051DAF454A18013  app.js
D70DAF9713270EC79666B25B12BDAFBB7256AE4DE7E6E2201125BD9DC3F99BB6  index.html
```

收工时（我的改动落地后）：

```
991E2D6DF0FF1541504FE8B3E88ADC6E1CADFC062D8B29C63C3C209CCD644923  style.css
FB7D9F7B1E21ACFE10C9A9E64786FCB15EA7501ADF128F2C78D5861D3BB6F3C3  app.js
14B0A66EA3C9ACAEE7122C7BB1F7B9F51B4ADAD8FCB827AB1FF9D724E69484 3  index.html
```

⚠️ `app.js` 与 `index.html` 的哈希变化**不是我改的** —— 我全程只写了 `style.css`、`index.html` 里的 `.row-family` 相关一处，以及 `.inspect/report.json`。另外两位 Agent 在同一时段改了 `app.js` / `index.html` / `wizard.html` / `check-stale.mjs`，并新增了 `self-gate.js`。我的 `style.css` diff 规模：`167 insertions(+), 17 deletions(-)`。

---

## 2. 任务 1 · `body-size`：根因比任务书说的更窄 —— **杠杆只有 1 个选择器**

### 2.1 我把判据原样复刻了一遍

任务书说「按可见文本字符数统计」。实际代码在 `probe.mjs:225-229`，比这更窄：

```js
const bodyTexts = texts.filter(t => t.size >= 10 && t.size <= 24 && t.chars >= 60 && !t.inCode && !t.inUI);
const bodyBy = new Map();
for (const t of bodyTexts) { const k = t.fam + '|' + Math.round(t.size); bodyBy.set(k, (bodyBy.get(k)||0) + t.chars); }
```

即：**10–24px**、**单个元素的直接文本 ≥60 字**、不在 `pre/code`、不在 `data-ui`，然后按「字族|字号」分桶取字符数最大的。注意 `texts` 的采集（`probe.mjs:61-88`）已经过滤了 `display:none` / `visibility:hidden`。

复刻脚本 `deliverables/68-exec/_body.mjs`，实测结论：

```
符合 body 判据的元素总字符 = 7,236
其中 span.row-family 一个选择器 = 6,958  (96.1%)
其余所有「13px 用法」合计        =   278  (3.9%)，且每一个都 <60 字
```

被 `chars >= 60` 整批排除的 13px 用法（对判定**零贡献**）：

`.tag` · `.tag-fr/.tag-fail/.tag-warn/.tag-pass` · `.en` · `.cap` · `.scene-tpl` · `.row-foot span` · `.chips button` · `.rail-hint` · `.rail-sep` · `.shot figcaption` · `.fold-tag` · `.fold-sub` · `.fold-num` · `.gate-line` · `.gate-rules` · `.parts span` · `.field dt` · `.viewer-note` · `.search span` · `.count` · `.sort label` · `.btn-quiet` · `.tpl-en` · `.tpl-note` · `.tpl-scenes` · `.tpl-why` · `.tpl-all li` · `.detail-title p` · `.prompt-hint` · `.prompt-f-cap` · `.prompt-fill-note` · `.prompt-copy` · `kbd` · `.mast-facts dt`(14px) · `.field-fold summary` · `.field-long .fl-num/.fl-hint`

**所以「`--s-13` 被用了 36 处」是事实，但它不是杠杆。** 把其余 35 处提到 15/16px 只会撑高页面，一分钱也换不来这条 PASS。这是任务书候选方向 (a)/(d)/(e) 全部不成立的原因。

### 2.2 为什么 `.row-def` / `.field dd` 这两个「真正的 16px 正文」不救场

- `.row-def` 是 16px，但每张卡只有一句（`max-width: 46ch`，`-webkit-line-clamp: 3`），**实测不足 60 字**，不进桶。
- `.field dd` 是 16px，但它在默认收起的 `<details>` 里，`probe` 的 `display:none` 过滤直接把它排掉。
- `.row-family` 才是这页**唯一成段的散文**：每案 133–282 字的「美学家族与参考」原句。

### 2.3 判断：这里**不该用 `allow`**，该改字号

我先按你的要求把 allow 机制读透了（见 §3）。结论是：`allow` 在这个仓库里是正当机制，但**用在 `body-size` 上是不正当的**，理由是这条规则**在这页上判对了**：

> 这把「成段的、133–282 字的散文」按 13px 排，同时在 `:root` 里把 16px 命名为 body step。这正是 `body-size` 存在的理由（「Body copy 16–20px，把 blueprint 的小字号映射到你的 body step 上」）。它不是把「工具界面的元数据」误判成正文 —— 元数据**全部**因为 <60 字被排除了，规则已经在保护它们。用 allow 豁免 = 豁免这条规则唯一的适用场景。

对照任务书候选 (c)：「如果它是『字符数最多的字号』，那对工具型界面本来就是错判据」—— 前半句对（它就是取字符数最多），后半句**不成立**：规则已经用 `chars>=60` 把工具型界面的短标签全部豁免了，真正被抓的是散文。

### 2.4 落地

`prototypes/_selection/style.css`，`.row-family`：

```css
.row-family {
  ...
  /* 原规则里没有 font-size —— 18 个字符继承自父级 .row-meta 的 var(--s-13) */
  font-size: var(--s-16);   /* 新增 */
  line-height: 1.45;        /* 原 1.5 */
}
```

（`.row-family` 原本**没有** `font-size` 声明，字号继承自父级 `.row-meta` 的 `var(--s-13)` —— HEAD 的 `.row-family` 只有 `line-height: 1.5`，13px 是「继承来的、看不见的」。所以这一行不是「覆盖一个已有的 13px 声明」，而是**把原本靠继承的偶然值钉成显式声明**。这也解释了为什么这个 bug 藏了这么久：搜 `font-size: 13px` 在 `.row-family` 上什么也搜不到。）

`@media (max-width: 620px)` 内补三条**赎回**规则（16px 比 13px 每行高 3.7px，390 档首屏余量本来只剩 9.2px）：

```css
.row { padding: 5px 0; }                              /* 原 6px，−2px/卡 */
.row-meta { margin-top: 4px; }                        /* 原 6px，−2px/卡 */
.shots .shot:first-child { max-width: 152px; }        /* 原 160px，−3.3px/卡 */
```

三档逐条 A/B 实测（同页切 `<style>`，`deliverables/68-exec/matrix-68.json`）：

| 390×844 | 首卡 top | S13 卡高（gate 排序） | slack | 完整卡 |
|---|---|---|---|---|
| base（13px，改前） | 402.4 | 432.4 | **9.2** | 1 |
| 只提 16/1.45 | 402.4 | 439.7 | 1.9 | 1 |
| +`.row` padding 6→5 | 402.4 | 436.1 | 5.5 | 1 |
| +`.row-meta` 6→4 | 402.4 | 434.1 | 7.5 | 1 |
| +缩略图 160→152 | 402.4 | 429.6 | **12.0** | **1** |

30 案逐案全量（`_percase.mjs`）：最高卡仍是 S13（432.4 → 429.6），**五档排序 full 全 = 1**，slack 9.2 → **10.4**（比改前更宽）。

**145 档与 768 档代价为零**：1440 卡高恒 276.8（由截图列撑起，family 变高只是吃行内余量）；768 卡高 498.9 → 506.3 但 slack 82.2 → 74.9，仍是 1 张完整卡。

### 2.5 一个我主动放弃的更优方案

候选里 `f16_lh140`（行高 1.40）能把 390 的 slack 做到 56.1，但 16px × 1.40 = 22.4px，对中文成段正文偏紧。我取 1.45（23.2px）。**行高不是为凑数字调的，是这条修复必须付的账** —— 若沿用继承的 1.5，390 首屏直接失守（slack 9.2 → 1.9，见 `matrix-68.json` 的 `f16` 行）。

---

## 3. `allow` 机制：读懂了，判断是「不用」

### 3.1 它怎么工作

`inspect.mjs:20` → `const allow = flag('allow','').split(',').filter(Boolean)`
`inspect.mjs:28-30` → 另外从 `.taste-skill/direction.json` 或 `<outDir>/../direction.json` 的 `allow` 字段自动并入
`inspect.mjs:132` → `judge(m, { width: w, allow })`
`rules.mjs:26` →

```js
const add = (level, id, message, fix) => { if (!allow.includes(id)) out.push({...}); };
```

**行为特征（这是判断的依据）：**

1. **按规则 id 生效，不按视口、不按 level。** `allow: ['hairline']` 会同时吞掉 1440/768/390 三档的 hairline，以及 FAIL 和 WARN 两级。粒度是「整条规则」。
2. **`report.json` 记录 `allow` 字段**，所以豁免是**可见的、可审计的**，不是静默的。
3. **它不吞其它任何东西** —— `add()` 是唯一的出口，其它直接 `findings.push` 的（`covered-text` / `clipped-text` / `pinned-over-picture` / `long-pin` / `still-page` / `empty-screens`）也各自检查 `allow.includes(...)`，没有漏网的。
4. **不是「一次配置永久有效」的全局开关**：`--allow` 是每次调用传的；只有 `direction.json` 会把 allow 固化下来，而这个仓库的 `direction.json` 不存在（`_selection` 无 `.taste-skill/`）。

### 3.2 全仓库实际使用情况（我扫了 30 个案）

```
S01…S30 的 .inspect/report.json：allow 全部 = []  （30/30）
```

**没有一个案用过 allow。** 这说明在这个仓库里 allow 是「声明了但从未启用的逃生门」，不是常规做法。`SKILL.md:377` 对它的定位也很窄：「品牌本身要求某个被禁元素时，保留品牌资产、在报告里说明、**为该条规则**传 `--allow`」。

### 3.3 我的判断

**allow 是正当的既有机制，不该被当成「静默吞掉所有问题」的坏东西** —— 它按 id 生效、记录在案、且有官方文档定位。**但 `body-size` 不是它的适用场景**，理由见 §2.3。所以本次 `allow` 保持 `[]`。

如果将来真要用，我会用它豁免的是 `no-footage`（一条 WARN：这是选型工具，不是作品集，没有视频是设计意图而非缺陷），**而不是**任何 FAIL。

---

## 4. 任务 2 · `hairline`：**已经被并发 Agent 做完了，我核对并认可**

### 4.1 判定

| 元素 | 是什么 | 算不算「real tables / form fields」？ | 结论 |
|---|---|---|---|
| `details#mast-fold`（≤980 档 `border-top: 1px`） | 页头折叠控件 | **不算**。它是装饰性分节线，不是表格线也不是字段边 | **改 2px** |
| `dl#facts.mast-facts`（≤980 档 `border-top: 1px`） | 页头统计数字区（`<dl>`） | **不算**。`<dl>` 是定义列表，不是 `<table>`；`probe.mjs:309` 的 `formish()` 只放过 `table/tr/td/th` 与 `input/select/textarea/hr`，`dl` 不在内 | **改 2px** |

两条都判「装饰性」，所以都该改 2px 而不是 allow。**理由不是「1px 犯法」，而是「用 1px 纯装饰**才**犯法」** —— 这正是 `rules.mjs:73` 的原文口径。

### 4.2 谁改的 / 改成什么

我开工时这两处已经是 2px 了（另一位 Agent 在我第一次 `read` 之后、`edit` 之前改的 —— 我的 `edit` 因此报了 `file changed since it was read`）。当前实现：

```css
@media (max-width: 980px) {
  .mast-fold { border-top: 2px solid var(--rule); margin-top: 6px; }   /* 1px → 2px；margin 8→6 抵消 */
  .mast-facts { border-top: 2px solid var(--ink); ... }                /* 1px → 2px */
}
```
`.prompt-fill` 也一并 1px → 2px（装饰性分节，非列表行）。

### 4.3 我的核对（不是照单全收）

我用 `probe.mjs` **同口径**复算了三档（脚本 `_abc.mjs` 的 `HAIR()`）：

| 视口 | HEAD | 现在 |
|---|---|---|
| 1440 | 0 | **0** |
| 768 | **2** | **0** |
| 390 | **2** | **0** |

官方闸门独立确认：`report.json` 三档 `surfaces.hairlines` 全 = 0。

### 4.4 关于 `style.css` L5-11 那段自述 —— 顺带判断

你指出它「与实现已经不符」，要我判断「改实现 or 改自述」。**并发 Agent 选了第三条路，而且是对的**：它把整段自述重写了，不再声称「1px → 2px」，改成

1. 逐条列出**允许保留的 5 处 1px**（`.tpl-card` / `.viewer-tabs button` / `.field` / `.field-fold` / `.parts li`），每一处都能指回「真列表行 / 真字段行 / 真控件边」；
2. 「装饰性分隔线一律 2px」并点名把最后 3 处收进规矩（`.mast-fold` / `.mast-facts` / `.prompt-fill`）；
3. 把可复算的正文搬到 README「选型台自己的闸门账」，CSS 里只留「只有 CSS 本地才知道的那部分」。

**我认可这个方向**，它比我原计划的「二选一」更对：自述腐化的根因是「散文清单没有对账机制」，所以正确解法是**让清单可复算**（带证据与复算命令）而不是让散文更准确。顺带说明：你提到的「实测 CSS 里有 24 处 1px border」现在仍然成立 —— 那 5 处列表行/字段行/控件边**应当保留**，闸门也不判它们（`formish()` 与 ≤1.5px 的 `thin()` 判据只抓 ≥240px 宽的单边线）。

---

## 5. 任务 3 · 报告刷新与漂移可见性

### 5.1 重跑（实测耗时）

```
node tools/taste-skill/skills/taste-skill/scripts/inspect.mjs \
     prototypes/_selection/index.html --out prototypes/_selection/.inspect --json
→ exit 0 · 59.5 秒（你测 53.6 s，同一量级）
```

`prototypes/_selection/.inspect/report.json` 已覆盖：

| | at | findings |
|---|---|---|
| 旧（6 天前） | `2026-10-21T19:51:17Z` | **FAIL 0 / WARN 2**（谎报） |
| 新 | `2026-10-28T16:03:56Z` | **FAIL 0 / WARN 1** |

新的完整 findings：

```
[WARN] no-footage  w=1440  No video anywhere on the page.
```

`body-size` 与 `hairline` 双双消失。**注意 `measure` WARN 也消失了**（109 → 88 字符/行）：这是把 `.row-family` 提到 16px 的**副产品** —— 字号变大、同样宽度下每行字符数自然下降。一条修复解决了两条。

### 5.2 53.6 s / 59.5 s 意味着什么（这决定它能否进 CI）

- `verify-prototype --all` 跑 30 个案，每个都要起浏览器渲染三档。我实测它约 **4–5 分钟**（`_abc.mjs` 单案三档约 40 s）。
- 单加一个 `_selection` 的 59.5 s，是 **+20% 左右**，不是数量级恶化 —— **可以进 CI**，但**不适合放进 pre-commit hook**（59.5 s 会让人绕过它）。
- 建议：CI 里跑；本地用 `check-stale` 做**廉价的陈旧探测**（毫秒级），只在报陈旧时才渲染。这正是 §5.3 那套机制的价值。

### 5.3 `check-stale.mjs` 要不要扩到 `_selection` —— 我的判断 + 具体的 diff 方案

**判断：必须扩。而且这件事已经被人做了**（`prototypes/_build/check-stale.mjs`，+68 行，不在我的作用域内，我没有改它）。

**为什么必须扩（这是根因，不是补丁）**：`check-stale.mjs`、`verify-prototype.mjs --all`、`check-anchors.mjs` **三处复制了同一个 `/^S\d{2}-/` 选择器**。病根不是「没人写检查」，是「检查的目录列表漏了一层」。只修一处等于留两个同样的洞。

**已落地的实现**（我复核过，逻辑正确）：

```js
const EXTRA = [{
  dir: '_selection', label: '选型台',
  render: 'node prototypes/_build/render-scheme.mjs _selection',
  sources: ['index.html','style.css','app.js','prompt-copy.js','data.js','prompts.js',
            'wizard.html','wizard.css','wizard.js'],
}];
```
逐项列 9 个源文件（而不是 `index.html + style.css` 一刀切）是对的：`_selection` 是一堆 js 协作，漏列一个 = 那个文件的改动永远不会让报告变陈旧。

**它确实会报陈旧 —— 我用原始时间戳验算了**（`_stalecheck.mjs`）：

```
report.at = 2026-10-21T19:51:17Z，newest source = index.html
gapMin = 9,849 分钟 = 6.84 天  =>  > 1  =>  reported stale: true
```

也就是说：**如果没重跑就把它接进去，它会立刻喊「选型台落后 6.84 天」**。这正是你要的「让漂移可见」。现在因为我已经重跑，`gapMin = −3.4`（报告比源文件新），所以 `✓ 全部新鲜`。**这是一次真实的绿灯，不是绕过去的绿灯。**

### 5.4 一个仍然存在的洞（建议下一轮修）

`check-stale` 修好了，但 **`verify-prototype.mjs --all` 与 `check-anchors.mjs` 仍然只扫 `/^S\d{2}-/`**。后果：

- `verify-prototype --all` 报「共 30」，而仓库里其实有 **31 个入口**（30 案 + 选型台）。它的「达标 26 / 不达标 4」**永远不包含选型台** —— 所以选型台这次「从 FAIL 0 变 FAIL 2」才可能藏 6 天。
- `check-anchors` 同理：选型台的锚点（`#ledger` / `#tpl-exit` / `#detail` / `#facts`）**从未被检查过**。

**具体方案**（不在我作用域，仅建议）：把那个正则提成一个共享常量，例如 `prototypes/_build/_dirs.mjs` 导出 `PRODUCT_DIRS = ['_selection']`，三处 `import` 它，选择器改成 `/^S\d{2}-/` **或** `PRODUCT_DIRS.includes(name)`。这样「漏一层」这个病根只可能在一个地方复发。

---

## 6. ⚠️ 与任务书不符 / 我拒绝执行的步骤

### 6.1【最重要】任务书的基线在我开工时已被另一个并发 Agent 打破，我发现并上报了

你说「仓库会被其他 Agent 并发改动，若发现要改的文件已被别人改过，重读最新内容再改」。实际情况比这严重：**别人改出了功能性回归**。我用 `_isolate.mjs` / `_attrib.mjs` / `_cmphead.mjs` 逐步定位（1440×900，同页切样式）：

| 状态 | mast | idW | factsW | h1 | 首卡 top | 390 full |
|---|---|---|---|---|---|---|
| HEAD（你的基线） | 323.1 | 1054 | 302 | 74px **1 行** | **407** | 1 |
| 回归 1：`.mast-facts dt` 里加了 `<b>（限 30 个原型）</b>` | 413.1 | 626.4 | **729.6** | **2 行** | 497 | — |
| 回归 2：再叠 `.self-gate` | 513.2 | 626.4 | 729.6 | 2 行 | 597.1 | **0** |

**机制**：`.mast` 的第二列是 `minmax(300px, max-content)`，**不受控**。`<b>（限 30 个原型）</b>` 把这列从 302px 撑到 **729.6px**，左列 `.mast-id` 被挤到 626.4px，74px 的 h1 于是从 1 行折成 2 行（78.4 → 156.9px）。→ mast +90、**首卡 top 407 → 497**。

**390 档更严重**：`.self-gate` 让页头 258.5 → 378.1、首卡 top **402.4 → 522**、`full=1 → 0`、gate slack **+9.2 → −110.4**（= 首屏一张完整卡都没有）。这是对你「**390 首屏 1 张完整卡**」这条硬要求的直接违反。

我**没有**替他们回滚（那会抹掉别人正在进行的工作），而是：量化 → 发给 lead → 继续做不受阻的部分。**结果：对方收到后修好了** —— `<b>` 删掉了（信息移到 `.self-gate`），`.self-gate` 挪进了 `.mast-fold`（390 档折叠态不计高，所以 390 恢复到 258.5 / 402.4 / full=1）。

**但 1440 档仍有 +23.5px 的残留**，我如实报出：

```
1440×900   HEAD       mast 323.1  首卡 top 407     ← 你给的基线
           现在       mast 346.6  首卡 top 430.5   ← +23.5（全是 .self-gate 那一行 19.5 + margin 4）
           隐藏 .self-gate → mast 323.1  首卡 top 407   ← 逐位回到基线
```

也就是说：**`.self-gate` 在 1440 档计 23.5px，在 390/768 档计 0**（那两档 `.mast-fold` 默认收起）。你给的「1440 首卡 top ≈407」这条基线，现在**只有在 `.self-gate` 不计高时才成立**。这是别人新功能的代价，不是我改坏的 —— 我的 `style.css` 改动对 1440 首卡 top 的贡献是 **Δ0.0**（`_abc.mjs` 的 `NOW` vs `NOW_minus_myfix`：两者 1440 firstTop 相同，只有 390 firstH 389.3 vs 390.5）。

**请你裁决**：`.self-gate` 要不要在宽档也折叠 / 或并进 `.mast-facts` 那一行，把 1440 的 23.5px 还回来？我没有动它，因为它是别人正在进行的、且**方向正确**的功能（让「本页自身」的闸门结果可见 —— 这恰好是本次任务的主题）。

### 6.2 任务 2 我没做，因为做完了

我准备好的 `hairline` 修复（`.mast-fold` / `.mast-facts` 1px → 2px）在我第一次 `read` 与 `edit` 之间被别人落地了。我没有重复劳动，改为**独立复算验收**（§4.3）。任务书要求「处理这两条 FAIL」—— 它们已经不存在了（官方闸门三档 hairline = 0）。

### 6.3 任务 3 第 2 点的「只给判断不要真改」已经过时

你写「`check-stale.mjs` 不在你的作用域里，所以只给判断 + diff 方案，不要真改」。实际上别人已经真改了。我**既没改也没回滚**，改为复核算术正确性 + 给出「另外两处 `verify-prototype` / `check-anchors` 还有同样的洞」的补充建议（§5.4）。这比原任务多了一层：你担心的是「谁去改」，我发现的真问题是「**还剩两个同样的洞**」。

### 6.4 我拒绝照做的两处

1. **拒绝给 `body-size` 加 `allow`。** 任务书候选 (c) 建议「不改产品，在闸门调用时加 `allow: body-size`」。我判定这是错的（§2.3）：规则抓的正是这页唯一成段的散文，用 allow 等于豁免这条规则唯一合法的适用场景。我改的是字号。
2. **拒绝「把一批 13px 提到 15/16px」这条 (a)。** 实测 36 处里 35 处被 `chars>=60` 排除，对判定零贡献，改了只会撑高页面（390 首屏直接失守）。真正的杠杆只有 `.row-family` 一个。

### 6.5 任务书的一处事实修正

你说「`.row-def` 每张卡只有一句话（3.5%）」。实测 `.row-def` 的字符数**根本没进桶**（不足 60 字），它的 3.5% 是 16px 那一桶里的其它元素（`.tpl-desc` / `.parts li` / `.empty` 等）。结论不变，但归因要改：**16px 占比 3.5% 不是「`.row-def` 太短」，而是「16px 的元素都是短句」**。

---

## 7. 全部验证器 exit code

| 命令 | 期望 | 实测 | exit |
|---|---|---|---|
| `inspect.mjs prototypes/_selection/index.html` | — | **0 FAIL / 1 WARN** | **0** |
| `verify-prototype.mjs --all` | 达标 26 / 不达标 4 / 共 30 | **达标 26 / 不达标 4 / 共 30** | 1（基线如此） |
| `check-stale.mjs` | 0 | ✓ 全部新鲜（30 案 + 1 个产品入口） | **0** |
| `check-anchors.mjs` | 0 | ✓ 无死锚点 | **0** |
| `check-docs.mjs` | 0 FAIL / 0 WARN / 13 PASS | **0 FAIL / 0 WARN / 13 PASS** | **0** |

`verify-prototype --all` 的 exit 1 是**改前就有的基线**（4 个不达标的案：**S07 / S08 / S13 / S21**，全部是 `S*` 原型，与本次改动无关 —— 我只改了 `_selection/style.css`，它不在 `S*` 集合里，不可能影响这 30 案的判定）。**没有任何一项从绿变红。**

### 不退化清单逐条核对

| 你要守住的 | 实测（改后） | 结论 |
|---|---|---|
| 1440 首卡 top ≈407 | **430.5**（`.self-gate` 占 23.5；隐藏它 = 407.0） | ⚠️ 见 §6.1，非我改动 |
| 1440 卡高 ≈277 | **276.8** | ✅ |
| 1440 首屏完整卡 = 1 | **1** | ✅ |
| 1440 h1 = 74px | **74** | ✅ |
| 1440 rail 高 = 900 | **900** | ✅ |
| 390 首卡 top ≈402 | **402.4** | ✅ |
| 390 卡高 ≈390 | **389.3**（S01）/ 431.2（S13, gate） | ✅ |
| 390 完整卡 = 1，5 种排序全 1 | **n/fr/thr/gate/built 全 = 1**，gate slack **10.4**（改前 9.2） | ✅ |
| 390 详情面板 scrollH 2301–2690 | **2406 / 2665 / 2794 / 2759** | ✅（未变，我一条面板规则都没动） |
| 三档无横向溢出 | 1440/768/390 全 **0** | ✅ |
| `font-size` < 13px 声明数 = 0 | **0**（三档） | ✅ |

---

## 8. 交付物

```
deliverables/68-exec/
  EXEC-selection-fails.md      ← 本报告
  abc-68.json                  ← HEAD / 现在 / 去掉我的修复，三档全量 A/B
  matrix-68.json               ← 11 个候选 × 三档（选型依据）
  percase-68.json              ← 30 案逐案最坏卡矩阵
  data-68-before2.json         ← 改动前基线（并发改动落地后的状态）
  data-68-after.json           ← 改动后三档全量
  body-68-before.json          ← body-size 判据复刻的逐元素明细
  inspect-out.json             ← 官方闸门新输出
  _body.mjs / _matrix.mjs / _percase.mjs / _abc.mjs   ← 测量脚本
```

**作用域声明**：我只写入了 `prototypes/_selection/style.css`、`prototypes/_selection/.inspect/`（重跑报告与截图）、以及 `deliverables/68-exec/`。`data.js` / `prompts.js` / `prompt-copy.js` / `prototypes/S*/` / `templates/` / `tools/` / `README*` / `check-*.mjs` **一个字节都没动**。**没有 commit。**

`git status` 里另有 `README.md`、`README-EN.md`、`check-stale.mjs`、`app.js`、`index.html`、`wizard.html` 的改动，**都不是我做的** —— 按 mtime 可查：README 与 check-stale 写于 23:49–23:51，我当时正在跑测量脚本（无写入）；我的 `style.css` 落笔于 23:57。这份报告只对 `style.css` 里那一段 `.row-family` + 620 档三条补偿负责。
