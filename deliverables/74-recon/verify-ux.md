# 独立复核：另一个 agent 对 `prototypes/_selection/` UX/a11y 的 7 条断言

复核者：独立验证 agent ｜ 基线：`main@0432753` ｜ 方法：**只读**静态阅读 + 隔离 node 脚本 + 真 Chromium（headless，file://）
并发约束：本 agent 全程未运行任何生成器（collect-schemes / build-prompts / clean-dna / render-scheme / shot）。所有脚本写在系统临时目录，不落仓库。

浏览器：`chromium-1248/chrome-win64/chrome.exe`，Playwright core（global），视口 1440×900 与 390×844。

---

## 结论速览

| # | 断言 | 判定 | 一句话 |
|---|---|---|---|
| 1 | 28 颗近匹配芯片挂到 `.rail-block` 外、无芯片样式；`is-near/is-direct` 零 CSS 引用 | **CONFIRMED** | 全对，且后果比描述更糙（拿到 UA 默认按钮外观） |
| 2 | `index.html:153` 写「11 组 47 颗芯片」但实际 73 颗 | **CONFIRMED（数字需修正口径）** | 实际渲染 45+28=73；47 是 2026-10-28 拍下的旧快照 |
| 3 | 复制摧毁键盘焦点（临时 textarea 取焦后移除） | **CONFIRMED（严重度需下调）** | 焦点确实丢到 `<body>`；但 `writeText` 是主路径，且用户已拿到「已复制 ✓」 |
| 4 | ArrowDown/Up 全局绑到上/下方案，焦点在 body 或链接时也触发 | **CONFIRMED** | 实测 body 上按 ↓ 直接开 S01 并写 `#S01` |
| 5 | 90 张图下载、60 张被 `display:none` 隐藏 | **CONFIRMED（不是 60/90 而是精确 60 张、4952 KiB）** | 每行 3 个 `<figure>`，第 2/3 张隐藏；无 lazy，实测 90 次网络请求 |
| 6 | `index.html:211` 说多数案 10 段，实际 12 段 | **CONFIRMED（但「10 段」是历史真话，不是编造）** | 现渲染 12 段（7 内联 + 5 折叠）；标签写于字段从 10→12 之前的 2026-10-24 |
| 7 | `#count` 没有 `aria-live`，但 `index.html:232` 声称它是活区 | **CONFIRMED（且注释自相矛盾更强）** | 全站唯一 `aria-live` 在 `#q-parked`，且它是**条件创建**的 |

---

## 1. 近匹配芯片样式 — CONFIRMED

**位置证据（自己读的）**
- `prototypes/_selection/prompt-copy.js:1344` `directTerms.forEach(... host.appendChild(makeChip(t)))` → 16 颗进 `#flt-scene`（本身是 `.chips`）
- `prototypes/_selection/prompt-copy.js:1345` `nearTerms.forEach(... moreHost.appendChild(makeChip(t)))`
- `prototypes/_selection/prompt-copy.js:1346` `host.parentNode.appendChild(moreHost)` ← **关键**：`moreHost` 被挂到 `.chips#flt-scene` 的**父节点**，即 `.rail-block`，不在 `.chips` 内
- `prompt-copy.js:1286` `btn.className = direct ? "scene-chip is-direct" : "scene-chip is-near"`
- `prompt-copy.js:1276` `moreHost.className = "scene-more"`

**CSS 全仓 grep（只用 .css 文件）**
- `is-near|is-direct` 在 `*.css` 里只有 **1 处**，且无关：`prototypes/S14-zero-g-launch-sequence/style.css:224` `.tag.is-near {...}`（以及 `deliverables/63-test/replica/...` 的同名副本）。`_selection` 内 **0 处**。
- `scene-chip|scene-more|scene-toggle` 在 `*.css` 里 **0 处**。也就是说这不只是"少两个修饰类"——44 颗场景芯片（16 直连 + 28 近似）的**基类** `.scene-chip` 也完全没有样式，其中直连那 16 颗只是因为落在 `.chips` 容器里才被 `.chips button` 顺带救下。

**实测计算样式（Chromium 1440×900，展开 `.scene-more` 后）**

| | 直连芯片 `.chips button` | 近匹配芯片 |
|---|---|---|
| font-size | 13px | **16px** |
| border | `1px solid rgb(165,164,155)` | **`2px outset rgb(0,0,0)`**（UA 默认） |
| background | `rgba(0,0,0,0)` | **`rgb(240,240,240)`**（UA 默认按钮灰） |
| color | `rgb(67,65,59)` | `rgb(28,27,24)` |
| padding | `4px 8px` | **`1px 6px`** |
| cursor | pointer | **default** |
| `.chips button` 是否匹配 | 是 | **否**（`matches('.chips button') === false`） |

**准确版本（比原断言更严重一点，但方向一致）**：断言说"没有芯片样式"是对的；实际后果是它们退回**浏览器原生按钮外观**（灰底 + outset 立体边 + 16px 大字号 + 非手型光标），与旁边 13px 的扁平描边芯片形成两种控件语言。`is-direct`/`is-near` 确实是死类名，但真正的主因是 `.scene-chip` 基类无 CSS + 父容器不在 `.chips` 内。

注意：隐藏这个缺陷的机制是 `.scene-more` 默认 `display:none`（`prompt-copy.js:1278` `moreHost.style.cssText="...display:none"`），只有点「还有 28 个只有近似的 →」才暴露。实测默认 `getComputedStyle(.scene-more).display === "none"`。

## 2. 「11 组 47 颗芯片」 — CONFIRMED（数字口径需说清）

**原文**（`prototypes/_selection/index.html:153`）：
```
<summary class="rail-fold-sum">筛选 · 11 组 47 颗芯片（第一组是「你是做什么的」）</summary>
```

**11 组是对的**：`index.html:162–209` 共 11 个 `class="rail-block"`（最后一个 `rail-block rail-note` 是"怎么用"说明块，无芯片）。浏览器实测 `.rail h2` = 11。

**实测量（Chromium，1440×900，`#rail-fold` 内）**

| 组 | id | 芯片数 |
|---|---|---|
| 你是做什么的 | `#flt-scene` 直连 | 16 |
| （近似，挂在 `.scene-more`） | — | 28 |
| 底色明暗 | `#flt-ground` | 2 |
| 底色色带 | `#flt-band` | 6 |
| 内容量 | `#flt-load` | 3 |
| 安静度 | `#flt-loud` | 3 |
| 结构类型 | `#flt-fr` | 2 |
| 认知门槛 | `#flt-thr` | 3 |
| 调性 | `#flt-tone` | 7 |
| 建成状态 | `#flt-state` | 1 |
| 闸门 | `#flt-gate` | 2 |

- `.chips button` 合计 **45**（16 + 29，29 = 2+6+3+3+2+3+7+1+2）
- `.scene-more button` **28**
- 芯片总数 **45 + 28 = 73**
- `.rail-fold` 内 `<button>` 总计 **74**（73 芯片 + 1 个 `.scene-toggle`）

**73 是错的吗？** 73 是"芯片"的准确总数（44 场景词 + 29 轴值）。断言给的方向对：**47 与 73 都不等于页面当前芯片数**。

**47 从哪来（git 证据）**：
- `git blame index.html:153` → `d49ed749 2026-10-28`
- 同一 commit 的 `data.js`（`git show d49ed74:prototypes/_selection/data.js`）我实测：9 组轴唯一值合计 **31**（ground 2 / band 6 / load 3 / loud 3 / fr 2 / thr 3 / tone 7 / state 1 / **gate 4**），场景词 44 但直连 16。
- **31 + 16 = 47** ← 这就是 47 的来历：**轴值全量 + 场景词只数直连的 16 颗**（不含 28 颗近似）。这个口径在 2026-10-28 恰好自洽。
- 现在 `#flt-gate` 只剩 2 个值（`FAIL 0` / `FAIL 2`），因为 2026-10-28 之后闸门结果收敛，轴值从 31 → 29。
- 于是 31+16=47 变成 29+16=45，而".chips 里的芯片"实为 45 颗；把 28 颗近似也算上就是 73。

**29 / 28 / 16 / 44 的出处（全部实测）**
- `44`：`STYLE_PROMPTS.sceneIndex` 键数 = 44（`node` 直接读 `prompts.js`）
- `16`：其中 `direct.length > 0` 的 = 16
- `28`：其余 = 28，且 28 个全部**都有** `near` 候选（`unsupported`-only 词在 sceneIndex 里为 0 个）
- `29`：**不在** `sceneIndex` 里，是另一层 `STYLE_PROMPTS.unsupported` 数组长度 = 29（电商/网店/服装…物流），与 28 个近似词交集 **0**（实测 `overlap = 0`）。所以 73 = 44 + 29 这个说法也成立，只是 44 里已经含 16+28。

**准确版本**：标签里的 `47` 是一个**已过期的快照数**（2026-10-28 闸门值收敛前拍的），不是随意编造；`11 组` 至今正确。差额是 26 颗（73−47），其中 **28 颗近似芯片默认全部处在 `display:none` 的 `.scene-more` 里**，必须先点「还有 28 个只有近似的 →」才可见（实测 `.scene-more` 默认 computed display 为 `none`）。也就是说：`summary` 上的数字既不对，它所概括的那批芯片里还有 28 颗是折叠的 —— **标签同时说错了数量、也低估了自己的隐藏度**。

## 3. 复制摧毁焦点 — CONFIRMED（顺序与断言不同，严重度应下调）

**实际代码**（`prompt-copy.js:923–940`）：
```js
923:  function execCopySync(text) {
...
928:    document.body.appendChild(ta);
931:      ta.focus();                    // ← 抢焦点
932:      ta.select();
933:      ta.setSelectionRange(0, ta.value.length);
934:      ok = document.execCommand("copy");
...
938:    document.body.removeChild(ta);   // ← 焦点节点被移除 → 焦点回 <body>，无 restore
```
`execCopySync` 内**没有任何** `hadFocus` / `focus()` 复原。另两个弹窗路径（`prompt-copy.js:899` `ta.focus()` 的手动框）反而**有意**把焦点放到 textarea。

**真正的兜底阶梯（`copyPrompt`，`prompt-copy.js:950–979`）** —— 断言说"execCopySync 先取焦"是对的，但**它不是"唯一/首先尝试的主路径"**：

```
965:  execCopySync(text);                       // 1) 手势内同步 exec（尽力而为，结果被丢弃）
968:  if (navigator.clipboard && navigator.clipboard.writeText) {
969:      navigator.clipboard.writeText(text)   // 2) 主路径：以 Promise 为准
970:        .then(done(true), done(false)); return;
978:  if (execCopySync(text)) done(true);       // 3) 无 clipboard API 时才二次 exec 兜底
```
注释 `prompt-copy.js:956–963` 明写："**无论 exec 返回什么，都再用 writeText 走一遍 —— writeText 的 Promise 是唯一可信的成功信号**"。

**实测（真 file:// + Chromium 1248）**：
- `isSecureContext = true`，`navigator.clipboard.writeText` 存在
- 装好探针后点按钮：`execCalls = 1`（返回 `copy:true`），`writeTextCalls = 1` 且 **成功**
- 无 `showManual` 弹框（`manualPanelCount = 0`），按钮变「已复制 ✓」
- **焦点：`BUTTON.prompt-copy` → `BODY.detail-open`**（键盘 Enter 触发、鼠标 click 触发都一样）

**准确版本**：焦点确实**必丢**（`execCopySync` 的 textarea 拿到焦点后又被 `removeChild`，浏览器回到 body），这是真缺陷，WCAG 2.4.3 也站得住。但：
1. 断言暗示"用户会遇到复制失败/兜底框"——**不成立**，`writeText` 是主判据且实测成功；
2. 每次点击**至少** `execCopySync` 一次，最多两次（无 clipboard 时），所以"焦点被抢"是**必然**而非边缘情况；
3. 严重度校准：这是"键盘用户点完复制要从头 Tab 回面板"（合成 30 次 Tab，见 `app.js:1180` 的注释），不是"复制不能用"。**断言的高危读数高估了功能损失，低估了频次**。

## 4. ArrowDown/Up 全局劫持 — CONFIRMED

**精确守卫（`app.js:1560–1577`）**：
```js
1560:  document.addEventListener('keydown', function (e) {
1561:    var tag = (e.target.tagName || '').toLowerCase();
1562:    if (tag === 'input' || tag === 'select' || tag === 'textarea') {
1563:      if (e.key === 'Escape') e.target.blur();
1564:      return;
1565:    }
...
1574:    if (tag === 'button' || e.target.isContentEditable) {
1575:      if (e.key === 'Escape') e.target.blur();
1576:      return;
1577:    }
```
排除的 tag 只有：**`input` / `select` / `textarea` / `button`**，外加 `isContentEditable` 元素。**`<a>`、`<summary>`、`<body>` 都不排除。**

**ArrowDown 绑定（`app.js:1582–1593`）**
```js
1582:    if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
1583:      e.preventDefault();                       // ← 连默认滚动一起吃掉
1584:      var n1 = rows[Math.min(i + 1, rows.length - 1)] || rows[0];
1585:      if (n1) { open(n1.id); scrollTo(n1.id); }
```
`rows` 是**全量** `ALL.filter(match)`，`state.open` 为空时 `findIndex` 得 `-1`，`rows[-1+1]=rows[0]` → **打开 S01**。

**实测（Chromium 1440×900，干净加载、焦点自然落在 body）**
- 加载后 `document.activeElement = BODY`，`location.hash = ""`，`#detail.hidden = true`
- 按一次 `ArrowDown` → `location.hash = "#S01"`，`#detail.hidden = false`，`#d-no = "S01"`，`scrollY = 50`
- **`<body>` 上确实会打开方案**：确认
- 焦点在 `<a href="#ledger">` 上按 `ArrowDown` → 同样打开 S01（断言正确）
- 反例（守卫生效）：焦点在 `#q`（input）里按 `ArrowDown` → **不触发**，`hash` 仍为空

**额外发现（断言没提、但同类且更隐蔽）**：焦点在**详情面板**的正文 `<p tabindex=-1>` 上按 `ArrowDown`，也会被全局 handler 接走 —— 实测从 `#S01` 变成 `#S02`，而**面板内滚动位置 `scrollTop` 依然是 0**（`e.preventDefault()` 吃掉了面板内滚动）。所以长字段展开后想用方向键读正文，会变成"换方案"。

**准确版本**：断言准确。补两点：① `e.preventDefault()` 让"用方向键读页面"这个基本浏览器行为在所有非表单/非按钮元素上失效；② 这与 `scrollY` 的位移证据一致——按 ↓ 后页面只滚到锚点（50px），不是常规的行滚动。修复方向很明确：把 `var tag` 判据从白名单扩到 `a, summary, [tabindex]`，或只在 `document.activeElement === document.body` 且无 `state.open` 时才接管。

## 5. 90 张图下载、60 张 `display:none` — CONFIRMED（数字全对，补上真实字节）

**结构**：`app.js:573`
```js
'<div class="shots">' + shotFig(r,'desktop') + shotFig(r,'tablet') + shotFig(r,'mobile') + '</div>'
```
每行 **3 个 `<figure>`**。`shotFig`（`app.js:438–448`）每张图取 `r.shots[vp][0]`，只渲染**第一张**。

**隐藏规则**：`style.css:541` `.shots .shot:not(:first-child) { display: none; }`
—— 隐藏的是 `.shots` 里**第 2、3 个 `<figure>`**，即 **tablet(768) 与 mobile(390)**，与 `.shots` 外面无关。`style.css:539` 的 `.shot:first-child` 只是把桌面图显式放回栅格。

**`loading="lazy"`：故意不加，且注释写明了理由**（`app.js:443–446`）：
> 不加 `loading="lazy"`：闸门在 1440 档统计到"真实图片 0 张"，因为视口外的懒加载图在这一轮采集里根本没请求。整页 48 张缩略图直接加载，本地文件、总字节可控…

**实测（Chromium，`page.on('request')` 统计 `/\.(jpg|png|webp)$/`）**
- 图片网络请求 **90 次，去重后仍 90** —— 60 张隐藏的确实被下载
- DOM：`.shots img` = **90**；`.shot[display:none]` 内含 = **60**；可见 = **30**
- 每行 figures = 3；隐藏的 figcaption 只有 `768` 与 `390`
- 代码里 `loading` 属性出现次数 = **0**

**真实字节（30 案 × 第 2/3 张 `.inspect` jpg，fs.statSync 求和）**

| | 文件数 | 字节 | KiB |
|---|---|---|---|
| 被 `display:none` 的（768） | 30 | 3,340,480 | 3,262.2 |
| 被 `display:none` 的（390） | 30 | 1,730,381 | 1,689.8 |
| **隐藏合计** | **60** | **5,070,861** | **4,952.0** |
| 全部 90 张 img | 90 | 9,841,159 | 9.39 MiB |

隐藏字节占全部缩略图字节的 **51.5%**（5.07/9.84 MiB）。

**准确版本**：断言"60 of 90、display:none"**完全正确**。我补上两点让严重度可判：
1. 真正的浪费是 **4.95 MB 本地磁盘读 + 60 次解码**，在 `file://` 本地场景下不是网络成本；这也是注释敢"整页直接加载"的原因；
2. 注释里"整页 48 张"从写下的第一天（`caefdd9`，2026-10-20）就是错的——我复核了那个 commit 的 `data.js`/`app.js`，当时每行已渲染 3 个 figure、实际 img 已 **90** 张。这不是"结构改了注释没跟"，而是**注释里的数字从未对上过**。同一段注释里"闸门在 1440 档统计到真实图片 0 张"也已被它自己在 `style.css:537` 的追加注释纠正为"讲的是原型页面自己，与这里的卡片缩略图无关"。

## 6. 「多数案 10 段」 vs 实际 12 段 — CONFIRMED（但这是历史真话，不是编造）

**原文**（`prototypes/_selection/index.html:211`）：
```
<p>点任意一行展开它的全部字段与整页截图（多数案 10 段、个别 9 段——缺失原因在 README「做不到与已知边界」里写明）。<kbd>1</kbd>…
```
注意它说的是 **「10 段 / 个别 9 段」**，**没有**「12」这个数字。

**现在实际渲染（浏览器实测，打开 `#S01`，数 `#d-body dl.fields > .field`）**

| | 数量 | 哪些 |
|---|---|---|
| 内联（`<dt>/<dd>`） | **7** | 一句话视觉定义 / 美学家族与参考 / 当前有效配色 / 字体策略 / 反 AI 味风险与规避 / 适用场景 / 设计师签名式怪癖 |
| 折叠（`<details>`） | **5** | 布局与网格 / 可落地要点 / 关键视觉元素 / 动效与交互 / 去 AI 味审查点（n 条） |
| **合计** | **12** | |

静态复核（`node` 直接读 `data.js` + 复刻 `field()` 的空值规则）：**30/30 案都渲染 12 段**，分布 `{12: 30}`，无 9 段案。（`#S01` 之外另跑全量 30 案；`app.js:1357–1394` 共 **11 个 `field(...)` + 1 个 `auditFold(r)`** = 12 个调用点，与实测一致。）

**「10」与「9」是怎么来的 —— git 证据链**
- `git blame index.html:211` → `e15a6ee1 2026-10-24`
- 同 commit 的 `app.js`（`git show e15a6ee1:prototypes/_selection/app.js`）`field(` 调用点 **正好 10 处**：def / family / palette / fonts / layout / visuals / motion / risk / scenes / quirk
- 同 commit 的 `data.js` 实测字段分布：**`{10: 27, 9: 3}`**，唯一缺的键是 `layout`（3 案缺）
- 所以 **2026-10-24 那天，"多数案 10 段、个别 9 段"是逐字节正确的**
- 之后两个字段被加进来，label 没跟着改：
  - `git log -S"field('可落地要点'"` → `a56426e 2026-10-27`（+1 段）
  - `git log -S"auditFold(r)"` → `a0c0d54 2026-10-27`（+1 段，"去 AI 味审查点"）
- 10 + 2 = **12**，与今日实测一致

**另一种可能的"10"口径（已排除）**：断言问是否指"10 vs 12 含 2 个 chrome 段"。我数了：面板里除 `dl.fields` 外还有 `viewer`（截图预览）/ `proto`（原型入口）/ `gate`（闸门标签）/ `parts`（上站文案 4 段），**都不在 `dl.fields` 内**，且"上站文案"是 4 段（`ul.parts li = 4`，30/30），凑不出 10。**没有其他口径能解释 10。**

**准确版本**：断言"12 render、10 是错的"成立，但**"当初就写错"不成立**——label 是 2026-10-24 的准确快照，缺陷是"2026-10-27 加了 2 段却没改 label"的**漂移**。这是本仓库自己定义的第三类缺陷（结论/文案与实现脱钩），比"凭空写错"更值得记：它恰好发生在同一次「接通有值但没人读的字段」提交里。

## 7. `#count` 没有 `aria-live` — CONFIRMED（且矛盾比断言更硬）

**`#count` 的真实标记**（`index.html:223`，`cat -A` 逐字节确认过）：
```html
<p class="count" id="count">—</p>
```
浏览器实测属性列表：`["class=count", "id=count"]` —— **没有** `aria-live`、**没有** `role`、**没有** `aria-atomic`。`tag = P`。祖先链上也没有任何 live region（实测 `not inside any live region`）。

**全 `_selection` 的 `aria-live` 普查（grep html + js + css，再用 DOM 复核）**

| 文件:行 | 性质 | 元素 | 实测 |
|---|---|---|---|
| `app.js:350` | **唯一真正设置** | `span#q-parked.q-parked` | `aria-live="polite"`，但默认 `display:none`、`0×0`（无搜索词挂起时根本不显示） |
| `index.html:232` | 注释文字，不是属性 | — | 写给维护者的说明 |
| `style.css:1333` | 注释文字 | — | 同上 |

浏览器遍历全文档 `*[aria-live]`：**只有 1 个元素** —— `SPAN#q-parked`。

**所以索引页的"活区"现状是**：
- 唯一的 live region 是 `#q-parked`，它是**条件创建/条件显示**的（`syncParked()` 在 `state.qParked` 为空时 `display:none`），只在"点了芯片、搜索词被挂起"这一种交互后才有内容；
- 用户每次筛选都会变的 `#count`（`app.js:863` `$('#count').textContent = '列出 ' + n + ' / 30 个方案'`）**没有 live 语义**；
- 空状态 `#empty`（`index.html:309`）也没有 live 语义。

**注释与代码的自相矛盾（比断言更值得记）**：`index.html:232` 与 `style.css:1333` 两处注释都把「计数不折」的理由写成"**它是 aria-live 的活口**"，而 `#count` 从来没有这个属性。也就是说：一个**为 live region 做的布局决定**，建立在一个**不存在的属性**上。这类"结论没有守卫"正是本仓库在 `ab02f43` 里刚修过的那一类。

**准确版本**：断言完全正确。补一句严重度校准：对屏幕阅读器用户，筛完听不到"列出 4 / 30"这句话——**这是真损失**；`#q-parked` 有 live 反而说明作者知道该怎么做，只是没做到 `#count` 上。修复成本是一行 `aria-live="polite"`（若怕吵可加 `role="status"`）。

---

## 判定表

| # | 断言 | 原文声称 | 我的判定 | 我的实测/证据 |
|---|---|---|---|---|
| 1 | 近匹配芯片无 `.chips` 样式；`is-near/is-direct` 零 CSS | — | **CONFIRMED** | `prompt-copy.js:1345-1346` 挂到 `.rail-block`；`.chips button` 不匹配；`is-near/is-direct` 在 `_selection/*.css` 0 处，全仓 `.css` 仅 S14 无关 1 处；`.scene-chip` 基类也 0 处；实测退回 UA 原生按钮（16px / `2px outset` / `#f0f0f0`） |
| 2 | `index.html:153` 说 47，实际 73 | 73 | **CONFIRMED** | 实测 45 `.chips` + 28 近匹配 = 73；`rail-fold` 内 74 button（含 1 toggle）；47 = 2026-10-28 的 31 轴值 + 16 直连，闸门收敛后轴值 31→29 |
| 3 | 复制摧毁焦点，temp textarea 取焦后移除 | — | **CONFIRMED（严重度需下调）** | `prompt-copy.js:928/931/938` 无复原；实测 `BUTTON.prompt-copy → BODY`；但 `writeText` 是主路径且实测成功、无兜底框 |
| 4 | ArrowDown/Up 全局绑定，body/链接上也触发 | — | **CONFIRMED** | `app.js:1562/1574` 只排 `input/select/textarea/button` + contentEditable；实测 body 上 ↓ → 打开 S01 且写 `#S01`；`<a>` 上同样；`#q` 内不触发 |
| 5 | 60/90 图片下载后被 `display:none` | — | **CONFIRMED** | `app.js:573` 每行 3 figure；`style.css:541` 隐藏第 2/3；实测 90 请求 / 90 img / 60 hidden；隐藏字节 **4,952 KiB**；`loading` 属性 0 处（注释明写故意不加） |
| 6 | `index.html:211` 说 10 段，实际 12 段 | — | **CONFIRMED（"写错"应改为"漂移"）** | 实测 30/30 均 12 段（7 内联 + 5 折叠）；`e15a6ee1`(10-24) 时 `field(` 恰 10 处、数据分布 `{10:27, 9:3}`，label 当时准确；10-27 两次提交 +2 段未改 label |
| 7 | `#count` 无 `aria-live`，但注释称其为活区 | — | **CONFIRMED** | `index.html:223` 只有 class/id；全站唯一 `aria-live` 在 `app.js:350` 的 `#q-parked`（且默认 `display:none`）；`index.html:232` 与 `style.css:1333` 两处注释自相矛盾 |

**统计**：7 条中 **7 条 CONFIRMED**，0 条 FALSE，0 条 PARTLY TRUE，0 条 UNVERIFIABLE。
但其中 **3 条需要改写口径**：第 2 条的「47」是过期快照而非捏造；第 3 条的严重度被高估；第 6 条的「10 段」是历史真话而非笔误。

---

## 哪条最严重 / 哪条被高估得最多

**最严重的是第 4 条（方向键全局劫持）。** 它不是"某个控件不美观"或"某条文案过期"，而是**交互模型层面的越权**：`document` 级 `keydown` 用一个只有 4 个 tag 的白名单（`input/select/textarea/button`，`app.js:1562/1574`）接管了 `ArrowDown/ArrowUp`，并对 `body`、`a`、`summary`、`p[tabindex]` 一律 `preventDefault()`。实测后果有三层，一层比一层糟：① 页面刚加载、焦点自然在 body 时按 ↓，直接打开 S01 并写 `#S01` —— 用户以为自己只是在滚动；② 焦点在详情面板正文上按 ↓，方案从 S01 跳到 S02 而面板内 `scrollTop` 停在 0 —— 长字段读不完；③ 因为它连默认滚动一起吃掉，"用方向键读网页"这个最基本的键盘行为在整张页面上失效。第 1、7 条影响的是局部观感或某类用户的某条反馈，第 4 条影响**所有键盘用户的所有滚动动作**，且**没有任何可见 UI 提示它被接管了**。

**被高估得最多的是第 3 条（复制摧毁焦点）。** 断言把它叙述成"临时 textarea 取焦后移除 → 焦点丢失"，读起来像是复制链路的主路径坏了。实际上 `copyPrompt`（`prompt-copy.js:950–979`）的阶梯是 **同步 exec 尽力写 → `navigator.clipboard.writeText` 作主判据 → 都没有才二次 exec → 再失败才弹手动框**，注释还专门写了"exec 返回 true 不可信"。我在真 `file://` 里实测：`execCalls=1`、`writeTextCalls=1` 且成功、按钮正常变「已复制 ✓」、**没有**弹兜底框。所以功能是好的，坏的只有焦点：`execCopySync` 的 `ta.focus()`（`prompt-copy.js:931`）把焦点抢到隐藏 textarea，`removeChild`（`prompt-copy.js:938`）之后浏览器把焦点扔回 `<body>`，且**没有 `hadFocus` 复原**——对比 `collapseRailAfterPick`（`prompt-copy.js:1253-1258`）在同类场景里就老实做了 `hadFocus` 判断再 `summary.focus()`，说明作者知道这个模式，只是复制这条路径漏了。准确表述应是：「复制功能正常，但每次点击（键盘与鼠标皆然）都会把焦点重置到 body，键盘用户点一次复制就要重走最多 30 次 Tab 才能回到面板；修复只需在 `execCopySync` 里记 `document.activeElement` 并在 `removeChild` 后复原。」

**一个横跨多条的系统性观察**：第 2 条的 `47`、第 5 条的「48 张」，是**同一个病**——数据在 2026-10-28 那次提交里变了（闸门结果收敛，轴值唯一数 31→29；`#flt-gate` 从 4 个值缩到 2 个），而**用户可见的文案与注释停在旧快照**。第 6 条的「10 段」同源但机制不同：2026-10-27 两次提交各加了一个字段（10→12），label 没跟。

有一点我要修正自己先前的猜测：第 5 条注释里的「48 张」**不是**旧结构快照。我拉了最早提交 `caefdd9`（2026-10-20）的 `data.js` 与 `app.js` 复核——那时`每行 3 个 figure`的结构就已存在（`shotFig(r,'desktop')+shotFig(r,'tablet')+shotFig(r,'mobile')`），实际 img 也已经是 90 张。也就是说「48 张」从写下那天起就是错的（48 vs 实际 90），并非"结构改了注释没改"。这与第 2、6 条不是同一类，**不能并成一个结论**。

不过更值得记的是它揭示的共性：这三处（`47`、`48`、`10 段`）**都没有被任何闸门或分层断言覆盖**。仓库在 `ab02f43` 里刚补过四条「结论没有守卫」，但那批守卫覆盖的是"数据有没有值 / 字段有没有展示"这一层；**"页面上的数字说的是不是页面上的东西"这一层至今零守卫**。这类缺陷的共性是只读 `textContent` 的检查永远发现不了（第 1 条那些隐藏芯片、第 7 条那个不存在的 live 属性，都骗过了历次审查），判据必须同时是"计算样式 + 有面积的 rect + 与实际 DOM 计数对账"。
