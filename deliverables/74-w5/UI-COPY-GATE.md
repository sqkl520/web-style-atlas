# `check-ui-copy.mjs` 静态闸门设计（W5）

**结论先说**：这个文件**已经存在**（180 行，2026-11-04 由 W5 落地），今天跑出来是
`FAIL 0 / WARN 1 / exit 0`。但它**对今天树上真实存在的两个缺陷是瞎的**，其中一个正是
它自己声称要守的那类。所以本设计不是"从零设计一个新闸门"，而是**给已存在的闸门补三条断言、
并修掉它自己的一处假绿**。

下面的每一条都跑过：原型实现 286 行，10 条断言，本机实测 3.3–5.0 s。
10 条变异测试里 **9 条被对应断言抓住**（第 10 条因目标串跨行无法布置，见 §5）。

---

## 0. 先说三件实测事实（它们改变了设计的形状）

### 0.1 `data-derived` 的后备值本身就是说谎的那个值

`index.html:153` 今天写着：

```html
<summary class="rail-fold-sum">筛选 · <span data-derived="chip-groups">11</span> 组 <span data-derived="chip-count">45</span> 颗芯片（第一组是「你是做什么的」）</summary>
```

`11` 和 `45` **就是修复前那两个错数字**。`78e05ac` 只是把它们包进了 span，
运行时由 `fillDerived()` 覆盖成 `10` / `73`。实测（`deliverables/74-w5/_rt-derived.mjs`
用 CDP 跑真浏览器）：

```
AT LOAD (never touched): {"fieldCount":"12","chipGroups":"10","chipCount":"73", ...}
```

所以线上看起来是对的。但把 `fillDerived()` 冻掉（`prompt-copy.js` 没跑完、脚本报错、
或 `mountSceneChips` 抛异常）之后，用户看到的就是 `11 组 45 颗芯片` ——
**即腐化原值**，而且没有任何闸门会响。这是"派生"这个机制留下的**后备值漏洞**：
机制修好了"数字从哪来"，没修好"数字没来时显示什么"。

这一条把设计重心挪了位置：**主断言必须是"后备值 == 静态可复算值"**，而不是
"数字在不在 span 里"。前者能抓今天的树，后者不能。

### 0.2 已存在的闸门对上面的漏洞是瞎的

把三个后备值全改成 `999` 再跑现有闸门：

```
合计 FAIL 0 / WARN 0
EXIT=0
```

它不是"没查这一条"，是**查了以后报绿**：它的断言 2 会先把 `<span data-derived=…>…</span>`
整块抹成 `<DERIVED/>` 再找裸数字 —— 抹掉之后当然没有裸数字了，于是这条守卫对
"后备值写错"这个形态**结构上不可能响**。

### 0.3 它自己的第一条守卫是死的

`check-ui-copy.mjs:93-98`：

```js
{
  rule: 'field-count-hardcoded',
  re: /class="rail-note"[^>]*>([\s\S]*?)<\/div>/,
  what: '「怎么用」说明里的字段段数',
  ...
}
```

真实标记是 `<div class="rail-block rail-note">`（`index.html:209`）。`class="rail-note"`
**永远匹配不上**，于是这条守卫每次都走 `assert-anchor-missing` 分支、只发一条 WARN。
今天跑出来的就是那条 WARN。也就是说：**W2 两个修复里，field-count 那一个从落地起就没人守**，
而闸门对此的表现是"温和地提醒一句锚点变了"。这正是本仓库反复记的病（闸门自己假绿），
只是这次犯在闸门自己身上。

---

## 1. 断言清单

表列：**断言名 / 读什么 / 断言什么 / 它会抓住哪次真实事故**。
标 `[补]` 的是现有文件里**没有**、本设计要加的；标 `[修]` 的是现有但有缺陷的。

| # | 断言名 | 读什么 | 断言什么 | 抓住的真实事故 |
|---|---|---|---|---|
| U1 | `derived/key-known` | `index.html` 的 `data-derived="K"` 集合 ∩ `app.js` 里 `var vals = {…}` 的键集合 | 前者 ⊆ 后者 | `fillDerived()` 对未知 key 是**静默 `continue`**（`app.js:1733`）。拼错一个 key 页面上什么都不发生，永远显示后备值。 |
| U2 | `derived/key-used` | 同上 | 后者 ⊆ 前者（WARN 级） | `fillDerived()` 算了但页面不显示 —— 白算。 |
| U3 | `derived/fallback` **[修·主断言]** | 每个 `data-derived` 节点的**文本内容** + 静态可复算值 | 数字型后备值必须 == 静态复算值 | **今天的树**：`chip-groups` 后备 `11` 实测 `10`；`chip-count` 后备 `45` 实测 `73`。即 78e05ac 修的那两个数，仍在兜底位置对外服务。 |
| U4 | `copy/no-hardcoded-count` **[补]** | 剥掉注释/`<style>`/`<script>` 后的可见文本节点，逐行看 `\d+\s*(组\|颗芯片\|颗\|段)` | 每个这样的数字要么在当行的 `data-derived` span 里，要么等于复算值 | **原始事故本身**：`11 组 47 颗芯片`、`多数案 10 段、个别 9 段`。这条与 U3 互为背面：U3 管"span 里写错"，U4 管"根本没包进 span"。 |
| U5 | `legend/two-states` **[修]** | `index.html` 图例句 + `prompt-copy.js` 的 `is-direct`/`is-near` 成对赋值 + `style.css` 的 `border-style` 声明（含 `@media`，按特异性取生效值） | 两个类各自有 `border-style` 规则，且**取值不同** | `78e05ac` 之前：JS 已经在发 `is-direct`/`is-near`，`style.css` 里这两个类的规则数是 **0**（`git show 78e05ac^:style.css \| grep -c scene-chip` = 0）。28 颗近似芯片落回 UA 默认 `outset 2px`，**比直连更粗**，与图例承诺正好相反。 |
| U5b | `legend/near-chips-styled` **[补]** | `style.css` 里 `.scene-more button` 是否被 base 规则覆盖且含 `border` | 两个挂载点共用同一条 base 规则 | 同上事故的根因：`.chips button` 只覆盖 16 颗，28 颗在 `.chips` 之外的 `.scene-more` 里。 |
| U6 | `aria/live` **[补]** | 三类注释块（HTML `<!-- -->`、CSS `/* */`、以及 JS 侧 `setAttribute('aria-live')` 的落点） + 标记里真实带 `aria-live` 的元素 + JS 建的 live 节点 | 某条注释若**用 `#id` 点名**了 aria-live，该元素必须真的活 | `78e05ac` 之前 `index.html` 与 `style.css` 两处注释都在按"#count 是 aria-live 的活口"论证布局，而属性不存在（实测 `78e05ac^` 的 `#count` 标签是 `<p class="count" id="count">`，无任何 ARIA）。 |
| U6b | `aria/count-live` **[补]** | `#count` 是否 live（静态属性或 JS 设置） | `#count` 必须是 live region | 同上。这一条是**定点兜底**，因为它是 W2 修的那个具体元素；U6 是通用形态。 |
| U7 | `field/consumer` **[修]** | `data.js` 的 30 个顶层键 + 12 个 `axes.*` 子键 vs `app.js`/`prompt-copy.js`/`wizard.js`/`index.html` 里的读端（`.key` 或 `["key"]`，先剥注释） | 每个键至少一个读端；**已知欠账表**之外的零读端一律 FAIL；欠账数不得增长 | `scenesNo`（30/30 有值、UI 零消费者，`78e05ac` 才接进详情面板）。现有实现只定点查 `scenesNo` 一个字段（`FIELDS_WITH_UI = ['scenesNo']`），加第三个字段它不会管。 |

**10 条断言在今天的树上跑出来**：

```
PASS derived/key-known      3 个 key 全在 fillDerived 的 vals 里
PASS derived/key-used       3 个 key 都有落点
FAIL derived/fallback       chip-groups 后备 11，复算 10；chip-count 后备 45，复算 73
PASS copy/no-hardcoded-count 每个「N 组/颗/段」要么在 span 里，要么等于复算值
PASS copy/numbered-claims   4 条正文数字断言全部等于复算值
PASS legend/two-states      .is-direct=solid vs .is-near=dashed
PASS legend/near-chips-styled
PASS aria/live              1 处点名承诺全部兑现（活的：#count #q-parked）
PASS aria/count-live
FAIL field/consumer         data.js 有值但零读端（新欠账）：copy
2 FAIL / 0 WARN / 8 PASS
```

两条 FAIL 都是真缺陷，不是设计噪声：

- `derived/fallback`：见 §0.1。
- `field/consumer` → `copy`：实测 `copy` 30/30 有值（平均 100+ 字/案），
  且 **30/30 被 `copyParts` 完全包含**（`copyParts.claim/button/empty/error` 四个子串在
  `copy` 里逐案都能找到）。页面上渲染的是 `copyParts`（`app.js:1364-1370`），
  `copy` 从来没被读过。这是 `scenesNo` 那一类的**第二例**，只不过它没被人写进
  `FIELDS_WITH_UI`，所以现有闸门看不见它。

---

## 2. `data-derived` 断言的实现方式（选型与理由）

### 2.1 选定方案：(a) + (c) 的合并，但主断言换掉

任务书的三个选项里，**我选 (a) 的骨架，但把它的主断言从"数字在不在 span 里"改成"后备值等于不等于复算值"**，并把 (b) 留给 `probe-ui.mjs`。

理由（每条都对着实测）：

1. **纯 (a) 抓不到今天的树。** 今天的树 100% 符合 (a)：两个错数字都在 `data-derived` span 里。
   (a) 会报绿。这就是"守机制不守值"的极限。
2. **纯 (b) 不能当闸门。** 它需要 Chrome。`check-anchors.mjs` 是 61 行、零依赖、
   按目录循环；把 CDP 拉进 CI 会让闸门的可用面从"任何克隆"缩到"有 Chrome 且 CDP 起得来"。
   本仓库已经为这件事付过代价（`78e05ac` 的提交说明：`inspect.mjs` 在 `Browser.launch()`
   **之前**删截图，Chrome 起不来时 8 张已入库截图当场没了）。静态闸门必须零依赖。
3. **后备值是可静态复算的。** 这是本设计的关键观察：`fillDerived()` 算的三个量
   —— `chip-groups`、`chip-count`、`field-count` —— 全部能从**静态文件**复算出来，
   不需要 DOM：

   | key | `fillDerived()` 的算法（`app.js:1719-1725`） | 静态复算口径 | 实测 |
   |---|---|---|---|
   | `chip-groups` | `querySelectorAll('.rail-block .chips').length` | HTML 标签栈里 class 含 `chips` 且祖先含 `rail-block` 的元素数 | **10** |
   | `chip-count` | `querySelectorAll('#flt-scene button, .scene-more button, .rail-block .chips button').length` | `Object.keys(P.sceneIndex).length` + 9 组 `uniq(轴值)` 之和 | **73**（44 + 29） |
   | `field-count` | `querySelectorAll('#d-body .fields .field:not(.field-out)').length` | `field('` 调用数 + `auditFold` 1（与 `check-docs.mjs:437` 同一口径） | **12**（11 + 1） |

   第三条**必须**用 `check-docs.mjs` 的口径，不能另立一套 —— 否则会出现
   "界面 13 段、README 12 段"这种两边都自洽、合起来说谎的状态（`app.js:1721-1724`
   的注释记的就是这个坑）。

4. **所以分工是**：静态闸门守 **机制 + 后备值**（U1/U2/U3/U4），
   `probe-ui.mjs` 守 **运行时值**（真浏览器里 `textContent` 是否等于实测）。
   两者互不替代：静态的能进 CI、能在没 Chrome 的机器上跑；运行时的能抓
   "`fillDerived()` 根本没被调用"或"算了但没写进去"。

### 2.2 正则还是 DOM 解析

**用极简标签栈，不用正则裸扫，也不引第三方 DOM 库。**

- 正则裸扫的失败是实测出来的：第一版我用
  `/<div class="rail-block[\s\S]*?<div class="rail-block/` 切块来数 `chip-groups`，
  在最后一个块上返回空（没有后继锚点），把 10 数成 9。
- 引 `jsdom` 会破坏"纯 Node + 零依赖"这条仓库约定（README:167「纯 Node + Python，无 npm 依赖」）。
- 40 行标签栈够用：跳过 `<!-- -->`、处理 void 元素、维护祖先链。实测
  `chips` 类元素 10 个、`.rail-block` 内 10 个、`id^=flt-` 10 个，全部带行号。
  `<details>`/`<summary>` 的嵌套深度只有 4 层，不需要容错恢复。

CSS 侧同理：手写一个 30 行的规则扫描器，**先剥注释**再解析，
`@media` 块递归进去并把条件记下。实测解析出 270 条规则，`.scene-chip.is-direct`
和 `.is-near` 各命中 1 条。**剥注释这一步不能省** —— 那个文件里有大段解释性注释，
不剥会把注释里的 `border-style: dashed` 当成生效声明（`verify-prototype` 规则 4
正是栽在这上面，见 `78e05ac` 提交说明）。

### 2.3 allow-list 怎么维护、怎么不失同步

**不手抄 allow-list。** 单一真源是 `app.js` 里 `fillDerived()` 的 `var vals = {…}` 字面量，
用 `/'([a-z-]+)'\s*:/` 从源码里现读：

```js
const valsBlock = (() => {
  const i = cleanApp.indexOf('var vals = {');
  if (i < 0) return null;
  const j = cleanApp.indexOf('}', i);
  return cleanApp.slice(i, j + 1);
})();
const valKeys = valsBlock ? [...valsBlock.matchAll(/'([a-z-]+)'\s*:/g)].map(m => m[1]) : [];
```

这与现有实现的做法一致（`check-ui-copy.mjs:52-57` 的 `derivedKeysFromApp()`），是对的。
解析失败时报 `FAIL derived/key-known`（而不是 WARN），因为"无法判定"不等于"成立" ——
这条原则 `check-contract.mjs` 的 C0 已经立过。

**复算口径**是另一份 allow-list，但它不是"手抄的常量"，是"三行代码 + 一条实测值"。
它需要跟着 `fillDerived()` 一起改；这一点**不可自动化**，只能靠断言本身在解析失败时变红：

- 页面新增第 4 个 `data-derived` key → U3 报 `"K: no recompute rule"`，FAIL。
- `fillDerived()` 改了算法 → 后备值与新算法不符 → U3 报数字对不上，FAIL。

### 2.4 为什么 U4 需要"量词白名单"而不是"扫所有数字"

实测扫出来 23 个含数字的可见文本节点，其中：

- `1440×900` / `768×1024` / `390×844` —— 视口尺寸，是**规范值**，不是复述量；
- `M01` / `M02` / `M03` —— 模板编号；
- `#S07` —— 锚点示例；
- `1` `2` `3` —— `<kbd>` 快捷键；
- `五个问题给出 3 个推荐 + 3 个明确排除` —— 向导常量（`wizard.js:227-228` 的
  `slice(0,3)` 各一处，可复算，但不是本次缺陷类）。

把"所有数字都必须可复算"写成断言会产生 15+ 条假红，而**一条永远亮着的断言等于没有断言**
（`check-docs.mjs:884` 的原话）。所以 U4 只认四个量词：`组`/`颗芯片`/`颗`/`段` ——
这四个正好覆盖两次真实事故（`11 组 47 颗芯片`、`10 段`）。`段` 还要接受两个可能值
（总段数 12 / 折叠段数 5），因为 `index.html:211` 一句话里同时说了这两个量：

> `<strong data-derived="field-count">12</strong> 段——其中 5 段默认折叠`

只认 12 会把"5 段默认折叠"判成假红。这是我第一版实测撞到的（`line 211: 「5 段」 实测 12`）。

---

## 3. 这个闸门**证明不了**什么

这一节是给下一个读者的免责声明。**闸门过度声称比没有闸门更糟**：它会让"绿"变成一种
虚假的安心。以下每一条都是能力边界，不是待办。

### 3.1 它不能证明运行时的数字是对的

U3 证明的是"**后备值** == 静态复算值"。它**不**证明：

- `fillDerived()` 真的被调用了（`app.js:1742-1746` 的 readyState 分支可能没走到）；
- `fillDerived()` 算出来的值等于静态复算值（它数的是**渲染后的 DOM**，
  芯片由 `prompt-copy.js` 在 `DOMContentLoaded` 后生成，静态复算数的是**数据**）;
- 覆盖真的发生了（key 对上了，但 `if (vals[k] === undefined || !vals[k]) continue;`
  对**值为 0** 的 key 会静默跳过 —— `app.js:1733` 的 `!vals[k]` 是另一个后备值漏洞：
  如果哪天某个量合法地为 0，页面会显示后备值而不是 `0`）。

实测反例（`_rt-derived.mjs`）：把 `[data-derived="field-count"]` 的 `textContent` 改成
`POISON`，打开详情、关闭、重开、点芯片 —— **一直是 `POISON`**。只有手动调
`window.benchFillDerived()` 才恢复。也就是说 `fillDerived()` **只在装载时跑两次**
（立即 + `DOMContentLoaded`），之后没有任何调用点。`field-count` 依赖
`#d-body .fields` 在装载时是空的，所以它第一次算出来是 `0`（被 `!vals[k]` 跳过），
第二次在 `DOMContentLoaded` 时仍是 `0`（详情面板还没渲染）——

**实测**（本机，`/tmp/fieldcount.mjs`）：页面装载完成后
`#d-body .fields .field:not(.field-out)` 数 **0**，`[data-derived="field-count"]`
显示 `12` —— 那就是**后备值**，不是算出来的。打开 S12 之后真实值是 12，
但 `field-count` 节点从未被更新过。**它今天显示 12 是因为它一开始就写着 12。**
这是本设计发现的第三个后备值漏洞，也是最阴的一个：**它看起来正确，而且恰好正确，
但机制上从来没工作过。**

> 这一条直接改变了 U3 的定位：U3 不是"验证派生机制"，是"**验证兜底值不是错的**"。
> 真正的派生验证必须去 `probe-ui.mjs`。

### 3.2 它不能证明图例在**视觉上**可区分

U5 证明的是"两个类各有一条 `border-style` 规则且取值不同"。它**不**证明：

- 用户真的能分辨（`solid` vs `dashed` 在 1px 上、在某些 DPI 下几乎同色）。
  实测依据：`78e05ac` 修完之后两档"同字号同内距，强弱只由线的样式承担"
  （`style.css:350` 的注释），而这正是**没有量过视觉差异**的说法。
- 层叠顺序与我想的不同。我的特异性计算是简化的（id×10⁶ + (class+attr+pseudo)×10³ + element），
  够用来判"这两条谁赢"，但**不是**浏览器的真算法（不处理 `:is()`、`!important`、
  `@layer`、内联样式）。实测该文件里这三者都没有，所以今天是对的；有人加了 `!important`
  之后这条断言会**静默变错**（报绿但实际不生效）。
- 伪元素/`::before` 画的边框它看不见。

### 3.3 aria-live 这一类**只有一部分可机械化**

这是任务书要我诚实的那一条。分成三档：

| 形态 | 可机械化？ | 本设计的处理 |
|---|---|---|
| 注释里用 `#id` 点名 aria-live，该元素必须真有 | **可以** | U6 做这一条 |
| 注释里**不说 id**、只用自然语言（「它是 aria-live 的活口」） | **不可以** | **不做**。见下 |
| 有 aria-live 但实际不播报（`display:none`、值没变、`aria-atomic` 缺失） | **不可以**（静态） | 交给 `probe-ui.mjs` |

实测这份仓库今天有 3 个注释块提到 `aria-live`：

```
index.html  ids-mentioned=["q-parked"]     ← 有 id，可查
index.html  ids-mentioned=[]               ← 「「计数」不折：它是 **aria-live** 的活口」
style.css   ids-mentioned=[]               ← 「计数**不折**：它是 aria-live 的反馈口」
```

**3 个里只有 1 个（33%）带 `#id`。** 另外两个的指代物只能从上下文
（「计数」→ `.bar > .count`）推出来，而"计数"这个词在页面上出现 6 次以上。
要把它们机械化，就得写一个中文指代消解器 —— 那是假精确，而且一旦猜错就会
**逼人去改一句正确的话**（本仓库对这类假红有明确态度，见 `check-docs.mjs:110-113`）。

所以 U6 只做"带 `#id` 的那三分之一"，**并且当没有任何带 id 的承诺时发 WARN 而不是 PASS**：

```js
else if (unaddressed) warn('aria/live', '没有任何注释用 #id 点名 aria-live —— 这条断言当前无对象（不是通过，是没有可查的承诺）');
```

这条 WARN 本身是诚实的：它告诉读者"这条断言今天没在工作"，而不是冒领一个 PASS。
现有实现的写法更糟 —— `aria-live-claimed-not-implemented` 那条的
`commentClaimsCountLive` 正则要求 `#count` 与 `aria-live` 在同一行 40 字内，
而真实注释里 `#count` 出现在**另一段**注释（`index.html:223-227` 那段修复说明），
两者相距 2 行 —— 实测 `commentClaimsCountLive = false`。也就是说
**现有实现那条断言从来没可能响**。它今天报绿是因为另一条 `count-not-live` 兜底，
不是因为这条在工作。

### 3.4 `field/consumer` 只能是"读端存在"，不能是"读了有用"

U7 用的是文本匹配 `\.key` / `["key"]`。它能抓 `scenesNo` 那一类（零命中），
但抓不到这些：

- **读了但读了没用**：`app.js:975` 的注释说「底色标签用 palette[0] 而不是 r.bg」，
  于是 `r.bg` 只在 `paletteLine()` 里被读来**做一致性比较**（`if (r.bg && p[0] !== r.bg)`），
  不参与渲染。U7 会把 `bg` 算成"已接"。
- **读了但是死分支**：`prompt-copy.js:429` 有一段 `if (typeof window !== "undefined" && window.SCHEMES)`
  —— 在没有 window 的环境里永不成立。U7 照样算它读了。
- **名字碰撞**：`.copy` 这个字段的文本扫描会命中 `prompt-copy.js` 这类**标识符片段**吗？
  我实测过：不会（正则要求 `.copy` 后面不是 `[\w$]`，`prompt-copy.js` 是 `-copy` 不是 `.copy`）。
  但 `.dir` 会命中 `r.dir`（真的读端）与 `dir` 作为局部变量（假命中）—— 这是我实测
  `dir` 报 `app.js:3` 的那 3 处，其中 1 处是真的。

所以 U7 的措辞必须是「有读端」，不能写成「字段被用了」。今天的已知欠账表：

```js
const EXEMPT = {
  primary: 'palette[1] 的冗余副本（30/30 相等，构造不变量）',
  buttonText: '17/30 非空、13 案 null，已知未接',
  'axes.groundL': '中间量', 'axes.bandHue': '中间量', 'axes.bandL': '中间量',
  'axes.bandSat': '中间量', 'axes.chroma': '中间量',
};
```

六条欠账 + 一条新发现（`copy`）＝ 7 条。设计上**欠账数不许增长**：新字段没有读端就 FAIL，
这样"加字段"这个动作必须同时想清楚"谁读它"。这比"所有字段都必须有读端"现实 ——
后者会给 `palette`（30 案都读，但只读前 4 位）这类产生假红。

---

## 4. 新文件还是扩 `check-docs.mjs`

**结论：留在独立的 `check-ui-copy.mjs` 里（它已存在），不要并进 `check-docs.mjs`。**

四条理由，按重要性：

1. **读的对象不同。** `check-docs.mjs` 的第一个参数是**文档名**（`README.md` /
   `README-EN.md`），整个 945 行都围着"文档说了什么 vs 代码实际是什么"转，
   并且有一条 `i18n/facts` 断言要求中英两版事实一致。UI 闸门读的是**产品文件**
   （`index.html` / `style.css` / `app.js` / `data.js`），没有中英两版，没有 `--root` 语义。
   并进去会让 `check-docs.mjs README-EN.md` 这个已有用法开始跑一遍与英文无关的 UI 断言。
2. **失败时该不该 exit 1 不同。** 两者都是 exit 1，但**判据的性质**不同：
   `check-docs` 的 FAIL 是"文档过期了"（改文档即可）；UI 闸门的 FAIL 多数是
   "产品有缺陷"（改代码）。混在一个退出码里，看输出的人得先分辨这是哪一类。
3. **`check-docs.mjs` 已经有 945 行、13 条断言、两套 `--selftest` 用例组。**
   加第 14–20 条断言会让它变成一个"什么都查"的脚本 —— 而本仓库的历史结论恰恰相反：
   拆分出来的 `check-prompts.mjs` / `check-twolines.mjs` / `check-contract.mjs` /
   `check-texture.mjs` 各自只有一件事，也各自都有"为什么不能并进 check-docs"的记录
   （README:175-178）。
4. **改造成本不对称。** 新文件的成本是"README 两处表格各加一行"；并进 `check-docs`
   的成本是"改它的 `docName` 参数语义 + 给 `--root` / `--selftest` / `i18n/facts`
   各加一条旁路 + 13 条已有断言的输出顺序可能变"。

### 4.1 但「新文件要更新 README 两处表格」这个前提，实测**不成立**

任务书说「a new file requires updating the gate table in both README.md and README-EN.md,
which `check-docs` audits」。我实测了这句话的两半：

- **前半成立**：README.md:172-178 有工具链表，README-EN.md:172-176 有对应英文表。
- **后半不成立**：`check-docs.mjs` **不审计那张表**。它的 13 条断言里没有任何一条
  读那张表格。实测：

```
build scripts: 25
not mentioned in README.md:    backfill-credits.mjs check-ui-copy.mjs checked-spawn.mjs
                               extract-specs.mjs fetch-css-fonts.mjs fetch-scheme-assets.mjs
                               probe-ui.mjs _entries.mjs _s03-probe.mjs
not mentioned in README-EN.md: （同样的 9 个）
```

**9 个脚本（含 `check-ui-copy.mjs` 自己）不在任何一张表里，而 `check-docs` 报 0 FAIL。**
所以"漏更新表格"这件事今天**不会被任何闸门抓住**。

这本身是一个**新的、可机械化的断言**，而且它正好属于这个闸门的主题：

> **U8 `docs/gate-table` [补]**：`prototypes/_build/` 下每个 `check-*.mjs` /
> `verify-*.mjs` / `probe-*.mjs` 必须在 README.md 与 README-EN.md 的工具链表里各出现一次。
> 例外用显式 allow-list（`_entries.mjs` 之类的内部模块）。

它守住的是"工具链的可见性"：一个没人知道存在的闸门，等于不存在。
实测今天会报 4 条（`check-ui-copy.mjs` / `probe-ui.mjs` / `checked-spawn.mjs` /
`verify-prototype` 以外的两个），全部是真的。

**但**：我不建议把 U8 塞进本闸门。它是文档一致性，属于 `check-docs.mjs` 的领域
（它已经在读两份 README、已经在比对中英一致）。正确的位置是
`check-docs.mjs` 里加第 14 条断言 `docs/gate-table`，**复用**它已经读进来的
`src` 与 `en`。这样两件事各归各位：产品 UI 归 `check-ui-copy`，文档归 `check-docs`。

### 4.2 落地清单（如果要照这份设计做）

1. `check-ui-copy.mjs` 补 U3（改主断言）、U4、U5b、U6/U6b、U7（改造）、U8 归 `check-docs`。
2. 修 §0.3 那条死守卫：`/class="rail-note"/` → `/class="[^"]*\brail-note\b[^"]*"/`。
   或者更稳的做法：**不要按类名锚定**，直接用 U4 的通用形态（扫所有可见文本节点），
   这样"锚点变了"这个失败模式整体消失。
3. 修 §0.1：把 `index.html:153` 的后备值改成 `10` / `73`（`field-count` 的 `12` 已经对）。
4. README.md / README-EN.md 工具链表各加一行 `check-ui-copy.mjs` 与 `probe-ui.mjs`。
5. `--selftest`：现有文件**声明了**这个 flag（`check-ui-copy.mjs:17`）但**没有实现** ——
   实测 `--selftest` 与不带参数跑出来的输出逐字相同（`FAIL 0 / WARN 0 / exit 0`）。
   这是一个**文档承诺了、代码里不存在**的开关，与本闸门要守的那一类缺陷同型。
   照 `check-docs.mjs` 的 `--selftest` 结构补（临时目录 + 逐条改坏 + 断言 exit 码与**具体断言行**）。

---

## 5. 五条变异测试

每条的格式：**改什么 → 哪条断言必须红 → 期望报什么**。
全部在临时目录里对副本操作，跑完删掉（照 `check-docs.mjs:148-151` 的做法）。

| # | 变异（真实编辑） | 必须红的断言 | 实测输出 |
|---|---|---|---|
| **M1** | `index.html:153` 的 `<span data-derived="chip-count">73</span>` 改成 `999` | `derived/fallback` | `FAIL derived/fallback  chip-count 后备 999，复算 73` |
| **M2** | `index.html:153` 的 `data-derived="chip-count"` 改成 `data-derived="chip-cnt"`（拼错） | `derived/key-known` | `FAIL derived/key-known  index.html 用了 fillDerived 不认识的 key：chip-cnt` |
| **M3** | `style.css:352` 的 `.scene-chip.is-near { border-style: dashed; … }` 改成 `solid` | `legend/two-states` | `FAIL legend/two-states  两档 border-style 相同（都是 solid）` |
| **M4** | `index.html:211` 的 `<strong data-derived="field-count">12</strong> 段` 换成旧原话 `多数案 10 段、个别 9 段` | `copy/no-hardcoded-count` | `FAIL copy/no-hardcoded-count  line 211：「10 段」实测 12 或 5；line 211：「9 段」…` |
| **M5** | `data.js` 每个案的 `"scenesNo":` 前面插一个 `"brandVoice": "x",`（新字段、零读端） | `field/consumer` | `FAIL field/consumer  data.js 有值但 UI 零读端（新欠账）：brandVoice` |

**外加两条**，因为它们对应的是"修复前的历史状态"（更能证明闸门有用）：

| # | 变异 | 必须红的断言 | 实测输出 |
|---|---|---|---|
| **M6** | 把 `index.html:153` 整句退回 `78e05ac^` 的原话：`11 组 47 颗芯片`（两个 span 全去掉） | `copy/no-hardcoded-count` | `FAIL … line 153：「11 组」实测 10；line 153：「47 颗芯片」实测 73` |
| **M7** | `style.css` 删掉 `.scene-chip.is-direct` 与 `.is-near` 两条规则（回到 78e05ac 之前的零规则状态） | `legend/two-states` | `FAIL legend/two-states  style.css 里 .is-direct 没有 border-style 规则` |

**实测的变异结果（本机跑过，不是推演）**：

在**修复后的基线**（后备值 10/73）上跑 10 条变异，与现有实现对照：

```
id   mutation                          existing    proposed
M1   fallback chip-groups wrong (999)  missed      CAUGHT
M2   fallback chip-count wrong (999)   missed      CAUGHT
M3   typo a data-derived key           CAUGHT      CAUGHT
M4   both legend states solid          CAUGHT      CAUGHT
M5   delete both legend rules          CAUGHT      CAUGHT
M6   hardcode 11 groups / 47 chips     CAUGHT      CAUGHT
M7   hardcode "多数案 10 段、个别 9 段"   CAUGHT      CAUGHT
M8   new dead field in data.js         missed      CAUGHT
M9   drop aria-live from #count        CAUGHT      CAUGHT
M10  delete .scene-more base rule      n/a         n/a
正确断言命中：existing 6/10   proposed 9/10
```

M10 标 `n/a` 是因为它的目标串跨两行（`'.chips button,\n.scene-more button {'`），
变异脚本按行找不到位置 —— 这是**测试工具**的限制，不是断言的问题：
U5b 在真删掉那条规则时会红（我手工验过）。

**在修复前的树（`78e05ac^`，九个文件全部取那个提交）上跑本闸门**：

```
FAIL derived/key-known      找不到 `var vals = {…}` literal
FAIL copy/no-hardcoded-count line 153：「11 组」实测 10；「47 颗芯片」实测 73；line 211：「10 段」；「9 段」
FAIL copy/numbered-claims   target phrase not found
FAIL legend/two-states      missing border-style rule for .is-direct
FAIL field/consumer         data.js 有值但 UI 零读端（新欠账）：copy scenesNo
5 FAIL / 0 WARN / 1 PASS
```

五条都红，其中前四条**逐条对应 78e05ac 修掉的一个缺陷**。这就是"它会不会抓住原始事故"的可复算答案。

---

## 6. 规模与运行时间

| 项 | 实测 |
|---|---|
| 原型实现 | **286 行**（含 10 条断言、标签栈、CSS 规则扫描、注释剥离、数据装载） |
| 预计落地产出 | **约 420–480 行**（原型不含 `--selftest`、不含注释与文件头说明；现有 `check-ui-copy.mjs` 180 行对应 5 条断言，按密度外推） |
| 断言数 | **10**（U1/U2/U3/U4/U5/U5b/U6/U6b/U7 + 正文数字断言） |
| 运行时间 | **3.3–5.0 s**（5 次：3388 / 5012 / 4331 / 4813 / 3318 ms） |
| 对照 | `check-docs.mjs` 1.8–4.1 s、`check-anchors.mjs` 3.2–3.8 s、现有 `check-ui-copy.mjs` < 1 s |
| 依赖 | **零**（`node:fs` / `node:vm`，与 `check-docs.mjs` 同一条数据装载路径） |
| 读的文件 | 5 个：`index.html`（27 KB）、`style.css`（92 KB）、`app.js`（113 KB）、`prompt-copy.js`（128 KB）、`data.js`+`prompts.js`（经 `vm`，共 360 KB） |

时间几乎全部花在 `vm.runInContext` 装载 `data.js`（307 KB）+ `prompts.js`（62 KB）上
—— 与 `check-docs.mjs` 同价。**如果只要 U1–U6 而不要 U3 的 `chip-count` 复算，可以不装载数据，
时间会掉到 200 ms 以内**；我保留了装载，因为"复算值来自真数据"比"快 3 秒"重要。

---

## 7. 一句话总结

**派生机制修好了"数字从哪来"，没修好"数字没来时显示什么"。**
`check-ui-copy.mjs` 今天守的是前半句（数字在不在 span 里），所以它对
`index.html:153` 里那两个**就是腐化原值的后备值**报绿 —— 而那正是它存在的理由。
本设计把主断言换成"后备值 == 静态复算值"，实测能在修复前的树上逐条抓住
`78e05ac` 修掉的四个缺陷中的四个，并在今天的树上抓到两个仍然存在的真缺陷
（`chip-groups` 11≠10、`chip-count` 45≠73，以及死字段 `copy`）。
