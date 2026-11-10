# 选型台（`prototypes/_selection/`）架构侦察

ARCHITECTURE specialist recon. Repo root `D:/Web/style`. All line numbers are from the files as of this read (data.js mtime 2026-11-03 22:54, app.js 10-31 04:04, prompt-copy.js 10-30, prompts.js 10-31 05:07, index.html/style.css 10-29).

Scope: `index.html`(368) `app.js`(1654) `data.js`(2573) `prompts.js`(1791) `prompt-copy.js`(1816) `style.css`(1433) `wizard.*` `self-gate.js`(11).

---

## 0. 一句话结论

选型台是一个**没有模块系统、没有测试、靠 12 个独立 Node 闸门脚本反向守住的四文件全局脚本应用**。
数据有两条互不相通的链（`data.js` 给人看、`prompts.js` 给人拿走），UI 层 3 个脚本通过
`window.*` 上 9 个手工挂载的函数互相调用。所有真正的行为验证都在 `deliverables/` 下的一次性
CDP 探针里，没有一条进了 `_build/`，因此 **app.js 的运行时行为今天零自动断言**。

---

## 1. `data.js` 的精确数据模型

生成器：`prototypes/_build/collect-schemes.mjs`（746 行），头部 L1-3 与 L715 写盘确认：

```
/* 由 prototypes/_build/collect-schemes.mjs 生成，勿手改。
   数据来源优先级：_CURRENT-VALUES.md（当前有效色值） > _specs/Sxx.md（12 字段） > .inspect/report.json（闸门与截图） */
...
writeFileSync(join(OUTDIR, 'data.js'), js, 'utf8');   // collect-schemes.mjs:715
```

形状：`window.SCHEMES = [ {…} × 30 ]`。**所有键在 30/30 案上都存在**（无缺键、无 undefined），
`null` 只出现在 `buttonText`。

### 1.1 字段表（30/30 实测，`deliverables/74-recon/_stats.js` 复算）

| # | key | 类型 | 出现 | 长度/取值 | 来源 | 性质 |
|---|-----|------|------|-----------|------|------|
| 1 | `id` | string | 30/30 | `S01`…`S30`，恒 3 字 | 目录名前 3 字 | 派生的**主键** |
| 2 | `dir` | string | 30/30 | 21–35 字，如 `S07-slate-ink-contents` | 目录名 | 派生（与 prompts.js 30/30 重复，见 §5.2） |
| 3 | `cn` | string | 30/30 | 4–6 字 | 规格 | 作者写 |
| 4 | `en` | string | 30/30 | 17–31 字 | 规格 | 作者写 |
| 5 | `fr` | enum string | 30/30 | 只有 `F`(15) / `R`(15) | 规格 | 作者写，二值 |
| 6 | `structure` | enum string | 30/30 | 4–12 字，8 种：`NEWS-FRONT`/`MAG-TOC`/`FLOORPLAN`… | 规格 | 作者写 |
| 7 | `threshold` | enum string | 30/30 | `低`(11)/`中`(12)/`高`(7) | 规格 | 作者写 |
| 8 | `tone` | enum string | 30/30 | 7 种，如 `混乱活力 / 街头`（含全角空格斜杠） | 规格 | 作者写 |
| 9 | `def` | prose | 30/30 | 71–115 字 | 规格字段 1 | 作者写 |
| 10 | `family` | prose | 30/30 | 133–282 字 | 规格字段 2 | 作者写 |
| 11 | `fontsSpec` | prose | 30/30 | **228–514 字**（均值 373） | 规格字段 4 | 作者写。**与 prompts.js 的 `dna.fonts` 同名不同形状** —— 已在 2026-10-31 从 `fonts` 改名 |
| 12 | `layout` | prose | 30/30 | **242–865 字** | 规格字段 5 | 作者写。5 案含混入的无编号小结（见 collect-schemes L26-40） |
| 13 | `visuals` | prose | 30/30 | 247–542 字 | 规格字段 6 | 作者写 |
| 14 | `motion` | prose | 30/30 | 278–475 字 | 规格字段 7 | 作者写 |
| 15 | `audit` | prose | 30/30 | 276–444 字（S13 被 cut 到 306） | 规格字段 8 | 作者写 + **生成器有损切断**（`cutAuditMarker`，标记 `反套路改造三指标`） |
| 16 | `risk` | prose | 30/30 | 124–331 字（合计 5,761） | 规格字段 9 | 作者写 |
| 17 | `landing` | prose | 30/30 | **363–550 字**（合计 13,962） | 规格字段 11 | 作者写。2026-10-27 才被赋值（此前 FIELDS 列了但漏赋值） |
| 18 | `scenes` | prose | 30/30 | 60–174 字，**含「不适合：」** | 规格字段 10 清洗后 | 作者写 + 生成器剪掉串入文案段 |
| 19 | `quirk` | prose | 30/30 | 88–150 字 | 规格字段 12 | 作者写 |
| 20 | `copy` | prose | 30/30 | 80–205 字 | 规格文案 | 作者写 |
| 21 | `copyParts` | object | 30/30 | 恒 4 键 `claim/button/empty/error` | 规格文案 | **派生**（从 `copy` 拆） |
| 22 | `bg` | hex string | 30/30 | 恒 7 字 `#EFE7D7` | `_CURRENT-VALUES.md` | 派生的权威色 |
| 23 | `primary` | hex string | 30/30 | 恒 7 字 | 同上 | 派生 + 兜底改写（`collect-schemes.mjs:527-531`） |
| 24 | `buttonText` | hex \| null | 30/30 | 13 案非空（`#111111`/`#FFFFFF`），17 案 null | 规格 | 作者写 |
| 25 | `errorCode` | string | 30/30 | 4–9 字，如 `P-03`/`MIR-47`/`TRACE-36` | 规格/Lead 补 | 作者写或补入 |
| 26 | `errorCodeSource` | enum string | 30/30 | 只有 2 值：`规格文案`(29) / `Lead 补入（源文件缺，见 _CURRENT-VALUES.md §4）`(1) | 生成器判 | **派生** |
| 27 | `palette` | hex array | 30/30 | 长度 3(5 案) / 4(25 案) | bg+primary+字段3 过滤 | **派生**，`palette[0]≡bg`、`palette[1]≡primary` **30/30 恒等**（生成器构造不变量） |
| 28 | `built` | boolean | 30/30 | 30 全 true | `existsSync(index.html)` | 派生 |
| 29 | `gate` | object | 30/30 | 9 键，见下 | `.inspect/report.json` | **派生** |
| 30 | `shots` | object | 30/30 | 3 键 `desktop/tablet/mobile`，各 2–4 张，合计 272 | 同上 | **派生** |
| 31 | `axes` | object | 30/30 | 10 键，见下 | 从 `bg`+`gate` 现算 | **派生**（HSL 计算） |
| 32 | `scenesYes` | prose | 30/30 | 33–125 字 | `scenes` 按 `不适合：` 切前半 | **派生** |
| 33 | `scenesNo` | prose | 30/30 | 22–85 字 | 同上切后半 | **派生。但 30/30 无 UI 消费者**（详情面板只 `field('适用场景', r.scenes)`，app.js:1393） |

`gate` 子对象（`collect-schemes.mjs:535-550`）：

```
{ fail: 0, warn: 3, failIds: [], warnIds: ["hairline","font-count","no-footage"],
  at: "2026-10-29T09:05:42.135Z", screens: 5, realPictures: 6, overflow: 0, words: 510 }
```
30 案里只有 S08 是 `fail:2`（`palette-terracotta`、`font-count`），其余 29 案 `fail:0`。

`axes` 子对象（`collect-schemes.mjs:619-628`，全部由 bg 的 HSL + gate.words + palette 最高饱和现算）：

```
{ ground:"亮底"|"暗底"|"中间调", groundL: 0-100,
  band:"暖浅色带"|"冷浅色带"|"中性浅带"|"冷暗带"|"暖暗带"|"中间明度带"|"纯中性暗带"|"中性中带",
  bandHue: 0-360, bandL: 0-100, bandSat: 0-100,
  load:"一屏说清"|"三五屏"|"很多栏目", words: int,
  loud:"很安静"|"有态度不吵"|"就要扎眼", chroma: 0-100 }
```
**实际出现值比声明值少 3 个**（`纯中性暗带`/`中性中带`/`中间调` 在 30 案里 0 次命中）——
声明了 8 个 band 分支，数据只走到 6 个，`chips()` 自然也不会画出这两个空芯片，属**无害死分支**。

`shots` 的路径是**相对 `_selection/` 的 `../S0x-.../.inspect/*.jpg`**，即需要整个 `prototypes/` 树在位，
单独拷 `_selection/` 出去会全图 404（而 1440 档闸门 `realPictures=0` 只在 390 档出现，说明探测器
本身对相对路径是敏感的 —— 见 §6）。

### 1.2 S07 / S15 完整对象（逐字）

见 `deliverables/74-recon/s07-s15.json`（本报告的附件，由 `node -e` 直接 `JSON.stringify` 导出，未改一字）。
要点摘录：

**S07**（`structure:"MAG-TOC"`，`threshold:"低"`，`fr:"F"`，bg `#E7E7E0`，primary `#33505C`，palette 4 色，
gate `fail:0 warn:3 warnIds:["hairline","font-count","no-footage"]`，`screens:5 realPictures:6 words:510`，
axes `{ground:"亮底", groundL:80, band:"暖浅色带", bandHue:60, bandL:89, bandSat:13, load:"三五屏", words:510, loud:"有态度不吵", chroma:29}`）。

**S15**（`structure:"FLOORPLAN"`，`threshold:"高"`，bg `#E7EBE9`，primary `#3A3F45`，
gate `fail:0 warn:3 warnIds:["font-count","no-footage","measure"]`，`screens:10 realPictures:7 words:834`，
axes `{ground:"亮底", groundL:82, band:"中性浅带", bandHue:150, bandL:91, bandSat:9, load:"很多栏目", words:834, loud:"很安静", chroma:12}`）。
S15 是 4 个 `hard` 案之一（`prompts.js` 的 `hardIds`），也是 `degrades:"yes"` 的 13 案之一。

S15 的 `layout` 字段长 **640 字**，含两段被吞进来的无编号加粗小结（三段硫酸纸的透叠规则 / 断点具体行为）——
这正是 `collect-schemes.mjs:26-40` 明确**放弃修**的 5 处之一（S14 −648/−364、S15 −396/−183、
S16 −330、S17 −190、S20 −315 字，合计 2,426），理由写在那里：修切分器会撞碎字节验收线。
今天 30 案 `layout` 最长的是 **S14（865 字）**，S15 是 640、S16 是 663。

---

## 2. 生成链（逐段落实，不靠猜）

有**两条互不相通的链**，各自独立的生成器、独立的输入、独立的消费端：

```
链 A（人看：选型台 UI）
  prototypes/_specs/_CURRENT-VALUES.md   ─┐  (当前有效 bg/primary/buttonText/errorCode)
  prototypes/_specs/Sxx.md（12 字段正文）─┼→ _build/collect-schemes.mjs ──→ _selection/data.js
  prototypes/Sxx-*/.inspect/report.json  ─┘        (746 行, L715 writeFileSync)      (307 KB, 2573 行)
                                                                                       │
                                                                                       ↓  window.SCHEMES
                                                                                 app.js + wizard.js

链 B（人拿走：AI 提示词）
  prototypes/Sxx-*/style.css（:root + h1 规则）─→ _prompts/extract-dna.mjs ─→ _prompts/dna-raw.json
                                                                     │  (L164 writeFileSync)
                                                                     ↓
  _prompts/dna-raw.json ────────────────→ _prompts/clean-dna.mjs ─→ _prompts/dna-clean.json
                                          (1523 行, L1484 writeFileSync)
                                                                     │
  _prompts/minitems-parsed.json（实测 minItems/degrades/minPics）───┤
  _prompts/mechanisms.mjs（S11–S30 机制句 + 数值来源）──────────────┤
  _selection/data.js（RISK / REUSE 用正则回读）─────────────────────┤
  _prompts/build-prompts.mjs 内 HUMAN 表（plain/scenes/minItems）───┘
                                                                     ↓
                                          _prompts/build-prompts.mjs ─→ _selection/prompts.js
                                          (410 行, L370 writeFileSync)   (62 KB, 1791 行)
                                                                     │
                                                                     ↓ window.STYLE_PROMPTS
                                                  prompt-copy.js（buildPrompt）+ app.js（plainOf / capacityHTML）

链 C（本页自身闸门，产物不是源）
  _selection 渲染 ─→ tools/taste-skill/skills/taste-skill/scripts/inspect.mjs
                  ─→ _selection/.inspect/report.json
                  ─→ _build/render-scheme.mjs 顺手写 self-gate.js (11 行, window.SELECTION_REPORT)
```

**确认证据**：
- `data.js:1` 明写「由 prototypes/_build/collect-schemes.mjs 生成，勿手改」；`collect-schemes.mjs:715` 是唯一 `writeFileSync(join(OUTDIR,'data.js'))`。
- `prompts.js:1-3` 明写「自动生成，勿手改。生成器：prototypes/_prompts/build-prompts.mjs」；`build-prompts.mjs:370` 是唯一 `writeFileSync(...'prompts.js')`。
- `self-gate.js:1-2` 明写「由 render-scheme.mjs 生成，勿手改。生成时机：node prototypes/_build/render-scheme.mjs _selection」。

**关键点：两条链之间只有一处单向回读。** `build-prompts.mjs:39-50`（RISK）与 `:78`（REUSE）用**行级正则**从 `data.js`
原文剥 `"risk"` 与 `landing` 里「最难被复用」那一句，写进 `prompts.js` 的 `dna.risk` / `dna.reuse`：

```js
const re = /"id":\s*"(S\d{2})"[\s\S]*?"risk":\s*"((?:[^"\\]|\\.)*)"/g;   // build-prompts.mjs:44
```

它依赖「JSON 键序固定 + 每案只有一个 `"risk":` 字面量」。今天成立（`risk` 30/30 逐字相同，
合计 5,761 字完全重复，见 §5.2），但这是一个**没有断言、没有解析器**的跨文件隐式契约：
任何一个 prose 字段里出现 `"risk":` 这个词面，回读就会静默错位。

**链 B 的输入里没有 `_specs/*.md` 的字段正文**（除 `landing` 的一句回读），
所以「data.js 说 A、prompts.js 说 B」在结构上是**必然**的，不是 bug：
`check-twolines.mjs:19` 把它写成 R1「data.js ⊆ prompts.js」而不是相等。
实测：`data.palette ⊆ dna.palette` **30/30**、`dir` **30/30 相同**、`risk` **30/30 逐字相同**。

**产物不是源，且 `_entries.mjs:38-56` 明确把 `data.js` / `self-gate.js` 排除在 `check-stale` 的 sources 之外**
（理由：列进去会造成死循环误报 —— 跑 collect-schemes → data.js mtime 变新 → 立即报陈旧）。
副作用：**`data.js` 是否比 `_specs/*.md` 新，今天没有任何闸门检查。**

---

## 3. `app.js` 结构

单 IIFE（`(function(){ 'use strict'; … })()`，L5–L1654），无模块、无导出，
对外只挂 7 个 `window.bench*` 函数（L1625–1653）。

### 3.1 state 对象（L12-39，21 个键）

```
state = {
  q: '',                    // 搜索词，已 trim + toLowerCase
  ground, band, load, loud, // 4 个「用户能回答的轴」（Set）
  fr, thr, tone, st, gate,  // 5 个「设计口径与质检」轴（Set）
  sceneIds: new Set(),      // 场景反查白名单（由 prompt-copy.js 的芯片写入）
  qParked: null,            // 被行业芯片「接管」时挂起的搜索词
  sort: 'n',                // n | fr | thr | gate | built
  open: null,               // 当前展开的方案 id
  vp: 'desktop',            // desktop | tablet | mobile
  shotIdx: 0                // 预览第几张
}
```

**10 个筛选 Set + 3 个互斥状态位（`q` / `sceneIds` / `qParked`）+ 4 个视图态。**
10 个 Set 由 `match()`（L204-260）逐条 AND。新增一组筛选要同时改 5 处（state、`chips()` 调用、
`match()` 判断、`#reset` 清理、`syncEmptyNext` 的 `AX` 数组 L748）。L1509-1530 的注释记着这个坑**犯过两次**
（新增四轴漏进 reset → 清空后仍 0 行；`sceneIds` 漏进 reset → 芯片全灭但仍是 4 行）。

### 3.2 详情面板字段注册表 —— 12 段（`renderDetail`，app.js:1266-1414）

`#d-body.innerHTML = viewer + proto + gate + parts + fields`（L1397）—— 五段拼接。
`fields` 是 `<dl class="fields">`，内部**全部是 `<div class="field">`**（`auditFold` 也返回 `.field`，
「`<dl>` 的子元素全是 div」这条内容模型不变量成立；`check-docs.mjs:420-458` 靠数 `field('` 字面量守它）。

| # | dt 字面量 | 数据键 | 行号 | 形态 |
|---|-----------|--------|------|------|
| 1 | 一句话视觉定义 | `r.def` | 1357 | 平铺 |
| 2 | 美学家族与参考 | `r.family` | 1358 | 平铺 |
| 3 | 当前有效配色 | `paletteLine(r)` ← `r.palette` + `r.bg` | 1362 | 平铺（派生文本） |
| 4 | 字体策略 | `r.fontsSpec` | 1363 | 平铺 |
| 5 | 布局与网格 | `r.layout` | 1370 | **折**（第 4 参 `'栏数、基线、断点、留白'`） |
| 6 | 可落地要点 | `r.landing` | 1378 | **折**（`'CSS 思路、字体子集、性能预算'`） |
| 7 | 关键视觉元素 | `r.visuals` | 1379 | **折**（`'母题、线宽、图标规则、禁用项'`） |
| 8 | 动效与交互 | `r.motion` | 1380 | **折**（`'滚动、悬停、加载、转场'`） |
| 9 | 去 AI 味审查点 | `r.audit` via `auditFold(r)` | 1391 | **折**（独立路径；summary 带「N 条」现算） |
| 10 | 反 AI 味风险与规避 | `r.risk` | 1392 | 平铺 |
| 11 | 适用场景 | `r.scenes`（**不是** scenesYes/scenesNo） | 1393 | 平铺 |
| 12 | 设计师签名式怪癖 | `r.quirk` | 1394 | 平铺 |

- **顺序不变量**：`audit` 必须在 `risk` 之前。代码级 L1391 < L1392；数据级 `data.js` 键序
  `audit`(idx 14) < `risk`(idx 15)。两侧都被 `check-docs.mjs:792` 断言。
- **5 段默认收起**（4 个 `field(...,foldHint)` + `auditFold`），恰好是最长的 5 段
  （390 档实测 layout 491 / landing 485 / visuals 456 / motion 420 / audit 中位 324px），
  依据在 `field()` 上方 L1105-1148 的长注释（390 档 30 案 3538–4668px → 2260–2820px）。
- **data.js 里未进 `.field` 的字段**：`built`、`gate`（进 gateBox + fold-gate）、`shots`（进 fold-view）、
  `axes`（只作筛选）、`scenesYes`（只进搜索 hay）、**`scenesNo`（零 UI 消费者）**、
  `copy` 原文（只用 `copyParts`）、`errorCodeSource`（只在 copyParts.error 缺失时兜底，L1345）、
  `bg`/`primary`/`palette`（只经 `paletteLine` 兜底）、`dir`（打开原型链接）。

### 3.3 「字段之前」的四段（吃掉首屏的东西）

拼接顺序 = `viewer`（截图预览，默认折）→ `proto`（打开原型，平铺）→ `gate`（闸门，默认折）
→ `parts`（上站文案 4 段，默认折）→ `fields`。外加 `mountPromptButton` 把复制区**插到 `#d-body` 最前**
（`prompt-copy.js:1201`）。L1190-1201 记录了这个顺序的代价史：复制按钮曾落在 scrollHeight 2881px 处，用户滚 3.3 屏才看见。

### 3.4 键盘快捷键（全部在 `document.addEventListener('keydown')`，L1560-1601）

| 键 | 行为 | 行号 | 守卫 |
|----|------|------|------|
| `/` | `#q.focus()` | 1580 | 焦点在 input/select/textarea/button/contentEditable 上时早退（L1561-1577） |
| `Esc` | `close()` | 1581 | 同上；`<summary>` 上按 Esc 被 `detail` 的监听器先截（L1485-1501） |
| `j` `J` `ArrowDown` | 下一案 + `scrollTo` | 1582-1587 | 同上 |
| `k` `K` `ArrowUp` | 上一案 + `scrollTo` | 1588-1593 | 同上 |
| `1` `2` `3` | 切 desktop/tablet/mobile | 1594-1600 | **额外要求 `state.open` 非空** |

**未列在文档里的键**：行卡 `Enter`/`Space` 展开（L882-888）；详情里两个「你经营什么 / 访客要做的动作」
输入框上 `Enter` = 直接复制、`Esc` = 只 blur 不关面板（`prompt-copy.js:1064-1068`）；
折叠条上 `Esc` 退焦点到面板头（L1495）。`index.html:211` 的「怎么用」写的是
`1 2 3 / J K / / / Esc`（**有** `/`，是本报告初稿误判，已更正）—— 但它漏了行卡 Enter/空格、
漏了复制输入框的 Enter，还写着「多数案 10 段、个别 9 段」（见 §11.1）。`check-docs.mjs` 不查这张表。
**`#q` 搜索框本身没有 Enter 处理器**（全库 `keydown` 只有 6 处：`prompt-copy.js:905/1008/1059`、
`app.js:885/1485/1560`），Enter 走浏览器默认行为（不提交、因为不在 `<form>` 里）。

### 3.5 深链

- **写**：`open()` → `history.replaceState(null,'','#'+id)`（L1246）；`close()` → 清成 `pathname+search`（L1260）。
- **读**：`hashchange`（L1608-1614）只认 `/^S\d{2}$/`；boot（L1618-1621）匹配则 `open(h,{focus:false})`。
- **不认的形态**：`#tpl-exit`（`wizard.js:243` 与 `index.html:85` 都在用）、`#S07-xxx`、`#s07`。
  `#tpl-exit` 恰好因浏览器原生锚点滚动而能工作；其余形态**静默失败**（`hashchange` 跑一遍正则就什么都不做）。
- **反向链**：`wizard.js:220` 生成 `./#S07`；注释记着它曾是 `./#index-S07`（死链，`id="index-*"` 全库 0 次）。
  这是一个「深链格式只能由 app.js 的正则定义」的**隐式契约**：没有共享常量，
  `check-anchors.mjs` 也不查 hash 路由能否消费它。

### 3.6 搜索 / 过滤

`match(r)`（L204-260）：10 个 Set 逐条 AND → `state.q` 子串匹配一个 20 字段拼成的大 `hay`
（L246-250：`id cn en family fontsSpec def tone structure errorCode threshold layout visuals quirk scenesYes
axes.* palette.join(' ')`，全部 `.toLowerCase()`）。

**语义陷阱（已入注释，L224-243）**：hay 里只能放 `scenesYes`，不能放 `scenes`。
放 `scenes` 会让「不适合：」从句进索引 —— 实测搜「政务」命中 7 行、7/7 全在否定从句里，
是**方向相反的假信号**。这是「看起来更完整的索引反而更错」的实例。

`sceneIds` 与 `q` 是 AND，于是产生过 18/44 个词「先搜词再点同名芯片 → 0 行」的死路。
`parkQuery()`(L283) / `restoreQuery()`(L296) / `dropParked()`(L308) / `clearQueryAxis()`(L319)
是这条修复的四个原子操作。**`q` / `sceneIds` / `qParked` 三者互斥关系只写在注释里，无类型或断言保护。**

### 3.7 44 行业反查住在哪

| 层 | 位置 | 规模 |
|----|------|------|
| 数据（原稿） | `_prompts/build-prompts.mjs:172-217` **硬编码在生成器** | `SCENE_INDEX` 44 键 + `UNSUPPORTED` 29 项 |
| 数据（产物） | `prompts.js` 的 `window.STYLE_PROMPTS.sceneIndex` / `.unsupported` | 73 词 |
| 渲染 | `prompt-copy.js` 的 `mountSceneChips()` L1261-1432（148 行） | 16 实心 + 28 虚边 + 29 文字 |
| 消费 | `app.js` 的 `match()` sceneIds 白名单（L206） | — |

**「44 个词」的真源是生成器源码，不是 data.js、也不是 README。** 它是三个手工维护的词表之一。

### 3.8 wizard 集成（同一份 data.js，零共享代码）

- `wizard.html:102-103` 只加载 `data.js` + `wizard.js`，**不加载** prompts.js / prompt-copy.js / app.js。
- `wizard.js:13` 自己 `filter(r => r.gate)`；`wizard.js:20-38` 自己实现 `satOf` / `loudnessOf`（HSL）
  —— 与 `collect-schemes.mjs:600` 的 `hslOf/rgbOf`、`app.js:189` 的 `axColor` **是三份独立实现**。
- `wizard.js:220` 的 `'<a href="./#' + r.id + '">'` 是唯一跨页深链。
- 向导与选型台**不共享任何函数**：同一批数据、两套打分、两套色块渲染、两套 `esc`、两套字段截断。

---

## 4. `prompt-copy.js` 解剖（1,816 行，1 个 IIFE，17 个内部函数 + 3 个 `window.*` 挂载 + 2 个嵌套局部函数）

### 4.1 1814–2138 字提示词怎么拼出来（`buildPrompt` L151–847，**697 行单函数**）

实测（vm 沙箱装载 data.js + prompts.js + prompt-copy.js，调 `buildStylePrompt(id)`）：
最短 1814（S09）/ 最长 2138（S23）/ 中位 1988 —— 与 README L80 完全一致。

拼接顺序（`lines` 数组，`.filter(x => x !== '')` 之后 `join("\n")`）：

| 序 | 段 | 行号 | 内容形态 | 数据来源 |
|----|----|------|----------|----------|
| 1 | 开头 2–3 行 | 461, `promptOpener` L96-124 | 用户输入或 `＿＿＿＿` 空槽 | `opts.biz/what/action`（界面上只有 biz/action 两个输入框） |
| 2 | `请把整页做成这个风格：{plain}。` | 465 | 一句 | `P.schemes[].plain`（人工） |
| 3 | 调性句 | 467 | 一句，取不到整句省略 | `window.SCHEMES[].tone`（**跨链读**） |
| 4 | 机制句 (`mech`) | 309-320 | 「这个风格的签名动作：…」 | `dna.mechanism`；空则用 plain+radius+shadow+lineWidths+h1Size 拼 |
| 5 | 视觉硬约束 1–6 条 | 472-530 | **6 条编号**：配色/字体/圆角/阴影/线宽/字号 | `dna.palette` / `fonts`+`displayStack`+`bodyStack` / `radiusBare` / `shadow` / `lineWidths` / `h1SizeAt1440`+`bodySize` |
| 6 | 结构约束 1–5(+6) 条 | 532-694 | 数量 3 条 + 图片 1 条 + 首屏 1 条 + 可选 reuse 第 6 条 | `count`(=minItems) / `dna.degrades` / `hasVoid` / `minPics` / `dna.reuse` |
| 7 | 防退化 8 条正面处方 `①②…⑧` | 725-776 | 8 条 | `dna.radiusBare` / `shadow` / `plain`（**无外部数据**） |
| 8 | 「这一案最容易做成的错误样子」 | 780-810 | 1 段，截 220 字 | `dna.risk`（从 data.js 回读） |
| 9 | 验收三问 | 811-818 | 3 条 | `plain` |
| 10 | 输出要求 4 句 | 820-846 | 单文件 HTML / 不引框架 / 图片路径 / 只给代码 | 常量 |

**变长来源（逐项）**：`dna.palette`（1–7 色）→ 0–60 字；`displayStack`/`bodyStack` 各最多 4 族 → 0–80 字；
`dna.risk` 截 220 字；`dna.reuse`（21/30 有值）49–73 字；`hasVoid`（7/30）±60 字；
`count`/`minItems` 1–2 位数字。**30 案差值 324 字（1814→2138）里，约 150 字来自字体链 + palette 长度，
约 73 字来自 reuse 有无，约 60 字来自 hasVoid。** 这些都不是"每案手写的长提示词"，而是同一模板 + 逐案 DNA。

**关键设计取舍（都写在代码注释里，逐条可核）**：
- 字体**不再按数组顺序猜**（L160-186）；7/30 案曾猜错（S04/S06/S08/S10/S18/S19/S23）。
- 字体链**不能机械 slice(0,3)**（`trimStack` L219-231）：S04 唯一中文字族在第 4 位，被切掉 = 中文全回退。
- 字号**不自己解析 clamp**（L505-530）：clamp 第一个数是下限，`clean-dna` 已算好 `h1SizeAt1440`。
- 负向指令**全部改写为正面处方**（L701-724）：依据 arXiv 2601.08070「点名即加权，87.5% 违规发生在点名时」。
  8 条里 8/8 原本都点名了被禁项（`#6366F1`/emoji/玻璃拟态/霓虹…），现在 0 条点名具体值。

### 4.2 风险旗标（risk flags）

两套**独立**口径，只重叠 5 案（`prompt-copy.js:1098-1124` 明确记账）：

| 旗标 | 真源 | 案数 | 消费者 |
|------|------|------|--------|
| `s.hard` | `HUMAN[id].hard`（`build-prompts.mjs:169`） | **4**：S15 S18 S21 S29 | 提示词风险句 + 详情 hint（`prompt-copy.js:1128`） |
| `s.capacity.degrades === "yes"` | `minitems-parsed.json` | **13**：S02 S04 S05 S08 S12 S14 S15 S18 S19 S20 S22 S23 S29 | 行卡 `capacityHTML`（`app.js:490`）+ 详情 hint（`prompt-copy.js:1129`） |
| 并集 | — | **14**（重叠 5：S15 S18 S19 S22 S23） | — |
| `dna.degrades`（第三份副本） | `build-prompts.mjs:284` 由上面 cap 现算 | **13/13 与 capacity.degrades 完全同值** | `buildPrompt` 结构约束第 3 条 |

**`dna.degrades` 与 `capacity.degrades` 是同一事实的两份副本**（30/30 同值，实测确认），
一份在 `prompts.js` 的 `schemes[].capacity.degrades`（字符串 `"yes"/"no"`），
一份在 `schemes[].dna.degrades`（布尔）。`buildPrompt` 读布尔那份，`capacityHTML` 读字符串那份。
**没有任何闸门断言这两份必须同值** —— 它们是同一次 `const degrades = cap && cap.degrades === "yes"`
（`build-prompts.mjs:284`）的两种序列化，改一处生成器就同时变，所以今天安全；
但读者会以为是两个独立判据。

`hasVoid`（"这个版式靠空位讲故事"）是**第四个**旗标，30/30 里命中 7 案
（S01 S02 S06 S12 S19 S23 S29），判据是 `data.js` 全字段 blob 里 `indexOf` 5 个短语
（`VOID_TOKENS = ["故意留空","空抽屉","空白卡","空白行","永久留"]`，L433）。
这套判据的**唯一**实现就在 `prompt-copy.js` 里，`build-prompts.mjs` 没有对应字段
—— 是"本该在数据层的判断被迫放在渲染层"的典型，注释 L390-430 明写原因（写作用域限制）。

### 4.3 剪贴板三级降级阶梯（`copyPrompt` L950-980）

```
copyPrompt(id, btn, opts)
  ├─ buildPrompt(id, opts) → 空串则直接 return（**静默**，按钮不动）
  ├─ ① execCopySync(text)                      L923-948  同步 execCommand('copy')
  │     └─ 返回值**不可信**（实测返回 true 但剪贴板未变），因此结果被丢弃
  ├─ ② navigator.clipboard.writeText(text)     L972-978  唯一可信成功信号（Promise）
  │     ├─ resolve → done(true)  → 按钮 "已复制 ✓" 1.8s
  │     └─ reject  → done(false) → showManual(text)
  └─ ③ 无 clipboard API → 再跑一次 execCopySync
        ├─ true  → done(true)
        └─ false → done(false) → showManual(text)

showManual(text)  L853-921
  └─ 全屏 role="dialog" aria-modal="true" 遮罩 + readonly textarea（自动 focus+select）
     + 「共 N 字」 + Esc 关闭 + 点遮罩关闭
```

**为什么必须三级**（L1-14 头注释 + L923-948）：`file://` 下 `isSecureContext===true`、
`navigator.clipboard` 存在，但**无真实用户手势时三条路径全 NotAllowedError**（A/B/C 三种时序实测均失败），
所以必须有可见的手动兜底。这是全仓**唯一**在 `file://` 下确定有效的路径。

**一个真实缺陷（不是猜测）**：`copyPrompt` 在 `buildPrompt` 返回空串时**静默 return**（L952-953），
按钮不显示任何反馈。`buildPrompt` 只在 `pick(id)` 找不到案时返回 `""`（L152-153），
即 `prompts.js` 缺该 id —— 今天 30/30 齐全所以走不到，但这是「失败无反馈」的死角。

### 4.4 复制按钮本体（`mountPromptButton` L982-1204，**222 行**）

由 `app.js:1403` 在 `#d-body` innerHTML 赋值**之后**调一次。内含：
- 按钮 + `keydown` 拦截（Enter/Space 必须 `preventDefault + stopPropagation`，
  否则行卡的 keydown 会吃掉合成 click —— L1000-1008 记着这个坑）；
- **两个输入框** `biz` / `action`（`makeField` L1052-1091），默认 value 空、示例放 `placeholder`；
- `readFields()` L1093-1098 → `copyPrompt(id,b,{biz,action})`；
- `refresh()` L1164-1170：每次输入重算 `buildPrompt().length`，实时更新「约 N 字」；
- `riskNote` L1130-1152：只在 hard ∪ degrades 的 14 案上出现警告句；
- `note` L1180-1185：`aria-describedby` 目标。
- **位置**：`host.insertBefore(wrap, host.firstChild)`（L1201），必须最顶，理由见 L1190-1199 的 2881px 事故。

### 4.5 场景芯片（`mountSceneChips` L1261-1432，148 行）

- 16 个 direct 芯片进 `#flt-scene`；28 个 near 芯片进 `moreHost`（默认 `display:none`）；
- toggle 按钮「还有 28 个只有近似的 →」；
- 29 个 `unsupported` 词作为**一段纯文字**追加进 `moreHost`（跟着一起显隐）——
  L1363-1390 记着它曾经被**两层 display:none** 藏死（内层 `note.style.display='none'` 全文件没有任何一处改回来），
  文本在 DOM 里、`textContent` 读得到、`getBoundingClientRect` 是 0×0 —— **能骗过所有只读 textContent 的检查**。
- 每颗芯片带模板角标（`resolveTemplateHits`），但**只影响可发现性、不影响筛选**（L1287-1295）。

### 4.6 模板层（`renderTemplateLayer` L1597-1795，**199 行**）

由 `app.js:879` 的 `window.onBenchRender({q, rows, total})` 每轮 render 后回调。
- 数据 `TEMPLATES`（3 个）**硬编码在本文件** L1433-1466，`TPL_ALIAS`（2 条）、`TPL_ADJACENT`（6 条）L1468-1511。
  为什么放这里而不是 data.js/prompts.js：L1395-1420 逐条否掉了三条路（prompts.js 会整文件覆写、
  app.js 契约禁止写死方案信息、data.js 是生成物且明令不动）。
- 两个容器 `#tpl-strip`（有结果时，落在 `#ledger` 上方）与 `#empty-tpl`（0 行时）。
  **都不进 `#ledger`、不进 `state.sceneIds`、不进 `#count`** —— L1590-1595 记着实测：
  `benchSetSceneIds(["M02"])` → 0/30 行（M02 被白名单静默吞掉）。

---

## 5. 架构坏味道（按爆炸半径排序，全部带 file:line）

### 5.1 【半径最大】`app.js` 的运行时行为零自动断言 —— 所有真行为验证都在一次性探针里

`_build/` 下 23 个 `.mjs`（含 8 个 `check-*.mjs`），**没有一个执行 `app.js`、没有一个点击、没有一个渲染 DOM**：

| 闸门 | 查什么 | 查 app.js 的方式 |
|------|--------|------------------|
| `check-docs.mjs` | README ↔ 数据 | **静态读源码**：剥注释后数 `field('` 字面量、比 `auditFold(r) +` 与 `field('反 AI 味风险与规避'` 的**字符下标**（L439-442） |
| `check-twolines.mjs` | data.js ↔ prompts.js | 纯数据，不碰 app.js；只在注释里引用 `app.js:953/963` 当"谁依赖这个不变量" |
| `check-prompts.mjs` | 提示词 ↔ style.css | 纯文本 + vm 装 prompts.js/prompt-copy.js，**不装 app.js** |
| `check-stale.mjs` | mtime | 只看文件 mtime |
| `check-anchors.mjs` | `href="#X"` vs `id="X"` | 正则扫 html，**不跑 hash 路由** |
| `check-contract.mjs` / `check-texture.mjs` | 契约 / 纹理 | 静态 |
| `verify-prototype.mjs` | 30 个原型（`/^S\d{2}-/`） | **`_selection` 不在选择器里** |
| `render-scheme.mjs` | 跑 `inspect.mjs` | `inspect.mjs` 只 `goto` + `scrollTo` + 截图 + 量 DOM，**零 click、零 keydown、零输入**（`grep -c "click\|dispatchEvent" = 0`） |

**唯一被跑起来的应用代码是 `prompt-copy.js` 的 `buildPrompt()`**（`check-docs.mjs:374-401`
用 vm + 一个 mock `document` 装它，取 30 个长度）。`app.js` 从头到尾**一次都没有被执行过**。

**会静默坏掉的具体清单**（每一处都是"改了没报错、用户看得见"的形状，历史上都真发生过）：
1. `#reset` 漏清一个轴 → 点清空仍 0 行（L1509-1530 记着犯过 **两次**）。
2. `match()` 多索引一个字段 → 搜索命中数变了，无人发现（`fontsSpec` 曾零测试保护，L224-243 明写）。
3. `renderDetail` 少渲染一段字段 → **`check-docs` 的 `field('` 计数会红**（这是唯一被守住的一段）。
4. 键盘 `1/2/3` 的 `state.open` 守卫被删 → 无焦点时按 3 会 `paintViewer(undefined)`。
5. `focusBackToRow` 的行卡已不在 DOM → 退回 `#q`；若 `#q` 也 None 则**什么都不做**（静默）。
6. `#d-close` / `#q` / `#sort` / `#reset` 的 `addEventListener` 是**无守卫顶层调用**（L1456/1494/1508/1509）：
   `index.html` 少一个 id，整个 IIFE 在装配阶段抛错，**页面全白、控制台一条 reference error**。
   这 4 个 id 一个都不在 `check-anchors` 的检查范围内（它只查 `href="#X"`）。
7. `syncEmptyNext` 的 4 条退路文案与按钮：文案里的行数由 `match()` 现算，但"按钮点下去得到几行"
   只有真人点过才知道 —— 这里历史上出过 3 个谎（L735-745 的注释列了三个）。
8. `observeRows` 的 `IntersectionObserver` 分支 vs `prefers-reduced-motion` 分支：后者在无头浏览器默认不触发。

**结论**：这个页面**只能靠人眼 + 一次性 CDP 探针**验证。`deliverables/62-verify`、`63-audit`、`66-exec`、
`67-exec`、`69-exec` 下累积了几十个 `.mjs` 探针（`cdp-*.mjs`、`_empty-probe.mjs`、`m7-tabindex.mjs`…），
**全部不在 `_build/` 里、没有一条进过 CI、也没有一条被任何闸门调用**。它们是考古证据，不是回归防线。

### 5.2 【半径大】`risk` 字段 30/30 逐字重复（5,761 字），靠正则回读而不是解析

- `data.js` 的 `risk`：**5,761 字**，30/30 有值，124–331 字/案。
- `prompts.js` 的 `dna.risk`：**同一份字符串，30/30 逐字相同**（实测 `p.dna.risk === s.risk` 30/30）。
- 搬运方式是 `build-prompts.mjs:44` 的**行级正则** `/"id":"(S\d{2})"[\s\S]*?"risk":"…"/g`。

**为什么是坏味道**：`prompts.js` 是 62 KB 的 tracked 构建产物，其中 5.6 KB 是 `data.js` 的原文副本；
两份之间**没有闸门断言它们相等**（`check-twolines` 只查色值子集，`check-prompts` 查提示词内容 vs style.css）。
正则是贪婪的：`[\s\S]*?` 从 `"id"` 跨到**下一个** `"risk"`，一旦 `data.js` 的键序变了或某个 prose 里
出现 `"risk":` 字面量，回读会取到**另一个案**的 risk 而不报错。
修法（不是本条任务）：`JSON.parse` 正则剥 `window.SCHEMES = ` 前缀，或让 `collect-schemes` 额外吐一份 json。

### 5.3 【半径大】7 个全局可变入口 + 3 个全局可写数据对象，没有命名空间

```
window.SCHEMES            ← data.js（生成物，30 案 × 33 键，307 KB）
window.STYLE_PROMPTS      ← prompts.js（生成物，62 KB）
window.SELECTION_REPORT   ← self-gate.js（生成物，11 行）
window.buildStylePrompt   ← prompt-copy.js:1206（对外公开接口，签名变更无版本号）
window.mountPromptButton  ← prompt-copy.js:982  （app.js 调）
window.onBenchRender      ← prompt-copy.js:1801 （app.js 调）
window.benchSetSceneIds              ← app.js:1625
window.benchClearSceneIds            ← app.js:1629
window.benchParkQuery                ← app.js:1638
window.benchSetSceneIdsParkingQuery  ← app.js:1643
window.benchClearSceneIdsKeepQuery   ← app.js:1649
window.benchParked                   ← app.js:1653
window.benchTemplateHits             ← prompt-copy.js:1552
```

**两个方向的调用都靠 `window` 上的字符串约定**：app.js → prompt-copy.js（`onBenchRender`/`mountPromptButton`），
prompt-copy.js → app.js（6 个 `bench*`）。**任何一侧改名，另一侧静默变成 no-op**：
`app.js:879` 写的是 `if (window.onBenchRender) { … }`，`app.js:1403` 写的是 `if (window.mountPromptButton) { … }`，
`prompt-copy.js:1332` 写的是 `if (window.benchSetSceneIdsParkingQuery) … else if (window.benchSetSceneIds) …`。
**所有跨文件调用都有 `if` 兜底 ⇒ 缺了后端也不报错，功能静默消失。**
这正是 `benchClearSceneIds` 今天仍在（`app.js:1629`）而场景芯片已经不调它的原因：
死函数不会红，只会留在那儿。

### 5.4 【半径中】`buildPrompt` 是 697 行的单函数（`prompt-copy.js:151-847`）

占本文件 **38% 的行数**（1816 行中的 697）。内嵌：
- 1 个嵌套函数 `trimStack`（L219-231）
- 2 个立即执行函数（L505-529 字号行、L780-810 风险截断）
- 4 个 for 循环遍历 `window.SCHEMES`（找 `tone` L341-349、找 `hasVoid` 的 blob L438-458）
- 8 条防退化字符串 + 6 条视觉约束 + 5 条结构约束 + 3 条验收
- **54.3% 的行是注释**（986/1817）—— 单函数里塞了一篇架构文档

配套的 `renderTemplateLayer`（199 行）、`mountPromptButton`（222 行）、`mountSceneChips`（148 行）、
`syncEmptyNext`（app.js 174 行）、`renderDetail`（app.js 148 行）——
**6 个 148–222 行的函数**，加上一个 697 行的，构成这个文件群的主体。

### 5.5 【半径中】同一规则在两处实现 = 漂移风险

| 规则 | 实现 A | 实现 B | 是否有断言 |
|------|--------|--------|-----------|
| `degrades === "yes"` | `app.js:490`（`capacityHTML`） | `prompt-copy.js:1129`（`riskNote`） | `check-docs.mjs:412-413` 对 README 数字有；对两处代码无 |
| 同上，第三份 | `prompts.js: dna.degrades`（布尔） | — | **无**（30/30 同值靠生成器保证） |
| `hard` | `prompts.js: s.hard` | `prompts.js: P.hardIds` | **无**（30/30 同值靠生成器同源） |
| `palette[0]===bg` / `palette[1]===primary` | `app.js:966` `paletteLine()` 依赖 | `collect-schemes.mjs:411-415` 构造 | ✅ `check-twolines.mjs` R2/R3 **已删除**（因为它们恒真，注释 L185-206 明写"三条断言一起漏掉同一个错误"） |
| 「12 段字段」 | `README.md:70` 写 12 | `app.js` 数出 11+1 | ✅ `check-docs.mjs:764-770` |
| `audit` 在 `risk` 之前 | `app.js:1391/1392` | `data.js` 键序 idx14/15 | ✅ `check-docs.mjs:792`（只查代码，不查数据） |
| 断点 `980` | `app.js:338` `NARROW` | `prompt-copy.js:1248` `NARROW_RAIL` | **无**（注释 L1239 说"与 index.html:327 的 NARROW、style.css 的 @media 同一个值"—— 而 `index.html` 现在在 L347，**注释里的行号已经指错了**） |
| 同 `980`，第三/四份 | `index.html:347` | `style.css:998` `@media` | 无 |
| HSL 饱和度 | `wizard.js:20` `satOf` | `collect-schemes.mjs:600` | 无（两份独立实现） |
| `esc` | `app.js:44` | `prompt-copy.js:1523` `tplEsc`（逐字相同实现） | 无 |
| `VOID_TOKENS` 5 短语 | `prompt-copy.js:433` | 无第二份 | — |

**`980` 出现在 4 个文件里**（`app.js:338`、`prompt-copy.js:1248`、`index.html:347`、`style.css:998,1235`），
其中 2 份是 JS 常量、1 份是内联脚本、1 份是 CSS media query。这个仓库已经因为"两处必须同时改"栽过
（`style.css:1204` 那段注释自己写着："'两处必须同时改'的约定这个仓库已经栽过一次"）。

### 5.6 【半径中】内联 HTML 字符串拼接（无模板引擎、无虚拟 DOM）

- `app.js`：**92 个 HTML 标签字面量**，9 处 `.innerHTML =`。
- `prompt-copy.js`：**27 个标签字面量**，7 处 `.innerHTML =`。
- 合计约 **119 个标签字面量散在字符串里**，全部靠手写 `esc()`/`tplEsc()` 转义。

**XSS 面**：`rowHTML` 的 8 个插值点全部过 `esc()`（实测：`r.id/cn/en/fr/structure/threshold/tone/family/errorCode` 都过）；
`renderTemplateLayer` 的 `tplEsc` 也覆盖了用户输入（L1737-1741 有一段专门讲为什么不能用 `innerHTML = head`）。
**今天没有可利用的注入点** —— 数据全部来自磁盘、无一来自 URL/表单。
但 `state.q` 被插进 `#e-why`/`#e-next`/`lead` 的地方（`app.js:649-661`、`app.js:770-799`、`prompt-copy.js:1688-1705`）
走的是 `textContent` 与 `esc()` 混用；`syncEmptyNext` 的 `box.innerHTML = parts.join(' ')`（L809）里
`parts` 含 `esc(state.q)` —— 正确，但**这是 92 个插值点里唯一几处靠人记得**。

### 5.7 【半径中】没有模块系统，靠 `<script>` 顺序维持依赖（详见 §7）

5 个 `<script>` 标签，**零 `defer`、零 `type="module"`、零 `import`**。依赖图是：
`data.js → prompts.js → prompt-copy.js(在 DOMContentLoaded 挂芯片) → self-gate.js → app.js(立即执行)`。
`prompt-copy.js:17` 有 `var P = window.STYLE_PROMPTS; if (!P) return;` —— **静默短路**（缺 prompts.js 时
整个复制功能消失，无报错）。`app.js:9` 有 `(window.SCHEMES || []).slice()` —— 同样静默。
**唯一显式报错的是 `wizard.js:14-18`**（`if (!ALL.length) 显示"读不到 data.js"`）—— 三个入口三种策略。

### 5.8 【半径小但真实】死代码 / 死数据

| 对象 | 位置 | 状态 |
|------|------|------|
| `axColor(c)` | `app.js:189-191` | **零调用**（return 一个 `<i class="sw">` 字符串，从未被拼进去） |
| `window.benchClearSceneIds` | `app.js:1629` | 场景芯片已改调 `…KeepQuery`/`…ParkingQuery`；仅作为 else 分支兜底 |
| `window.benchTemplateHits` | `prompt-copy.js:1552` | 只有调试用（注释自称"CDP 里可以直接断言"），仓内零调用 |
| `scenesNo` | `data.js` 30/30 有值（22–85 字） | **零 UI 消费者**（面板用 `r.scenes`，搜索用 `r.scenesYes`） |
| `axes.ground:"中间调"` / `band:"纯中性暗带"` / `band:"中性中带"` | `collect-schemes.mjs:606-628` | 三个声明分支 30 案 0 次命中 |
| `auditText(r)` | `app.js:1005-1007` | 只是 `return r.audit || ''`，一行包装（保留作"这里曾经有一刀"的碑） |
| `o.mood` | `buildPrompt` opts | 函数体零读取（`prompt-copy.js:131-160` 有一整段交代为什么留着） |
| `prompt-copy.js:4` 注释「app.js 是选型台主逻辑（485 行）」 | — | **实际 1654 行**，注释陈旧 3.4 倍 |

### 5.9 【半径小】state 靠"传全局 + 手工重置"管理，没有 reducer / 没有订阅

- `render()` 是唯一的重绘入口（L858），但**有 3 处绕过它直接改 DOM**：
  `paintViewer`（L1415，只重绘 stage/strip/note）、`syncParked`（L341，只挪/显隐暂存条）、
  `syncCurrent`（L893，只改 `aria-current`）。四套局部刷新没有统一失效策略。
- `state.vp` / `state.shotIdx` 用 `renderDetail` 重置（`open()` L1240-1242），
  而 `1/2/3` 快捷键改 `state.vp` 后**只调 `paintViewer`**（L1597-1598）—— 不走 `renderDetail`，
  于是 viewer-tabs 的 `aria-pressed` 靠 `paintViewer` 末尾那段（L1439-1442）单独补。
- 详情面板每次 `open()` **整树 innerHTML 重铺**（`#d-body`），所有监听器随之重建；
  只有 `<summary>Esc` 那一处用了事件委托（L1485-1501，注释解释了为什么必须委托）。

### 5.10 【半径小】`state.qParked` 是第四个状态位，无类型/无断言

`q`（已生效的搜索词）/ `qParked`（挂起的搜索词）/ `sceneIds`（行业白名单）/
输入框 `#q.value`（可能是第四个真相，因为 `state.q` 是 `input.value.trim().toLowerCase()` 的副本）
—— **四个地方表示同一件事**。`reset`（L1509-1557，真正的清理在 L1527-1539）要同时清四个；`syncParked` 要保证条子和
`state.qParked` 一致；`clearQueryAxis`（L319-330）专门清"搜索轴的一切痕迹"。
L314-318 与 L1518-1538 记录了这个四元组历史上出过的 3 个不一致 bug。

---

## 6. 可测试性

### 6.1 有没有任何 app.js 行为的自动测试？

**没有。** 全仓库**没有 `package.json`、没有 `node_modules`、没有 `*.test.js` / `*.spec.js`、
没有 `.github/workflows`**。唯一被跑的浏览器是 `tools/taste-skill/.../inspect.mjs`（205 行），
而它只做：`goto` → `document.fonts.ready` → 截图 → `window.scrollTo` 逐屏 → `probe` 量 DOM → `judge`。
**零 click、零 keydown、零 fill、零 hash 变化**（`grep -c "click\|dispatchEvent"` = 0）。

因此 `_selection/.inspect/report.json` 记录的一切（`screens:10, words:1466, img:90, realPictures:30` 等）
都是**初始状态**的测量值：列表页第 0 屏 + 30 张行卡的静态 DOM。**它测不到详情面板**（`#detail hidden`），
测不到任何筛选结果，测不到复制按钮。

### 6.2 什么会静默坏掉（按"坏了没人知道"排序）

| # | 坏法 | 为什么静默 | 用户看到什么 |
|---|------|-----------|-------------|
| 1 | `prompt-copy.js` 里 `buildPrompt` 的任意一条约束被删 | `check-prompts.mjs` 只对**配色/线宽/字号**做独立对账；8 条防退化 / 5 条结构约束 / 风险段**零断言** | 少一条约束，AI 输出跑偏，用户不知道少了什么 |
| 2 | `window.bench*` 任一侧改名 | 两侧调用都有 `if (window.X)` 兜底 | 芯片点了没反应 / 模板层不出现 |
| 3 | 任一 `#d-close`/`#q`/`#sort`/`#reset` 的 id 被改 | 无守卫的 `addEventListener` 会抛错 → 但**只在装配阶段**，且 `app.js` 是最后加载 | 整页白屏（这是唯一**会**炸的） |
| 4 | `#e-why` / `#e-next` 的内部结构被改 | `syncEmptyNext` L692-712 的清理逻辑靠"#e-why 之后的文本节点与元素"判据 | 空状态里两句话互相打架 |
| 5 | `flex/折叠`默认态被 CSS 改 | 折叠默认态在 `index.html` 内联脚本（L343-360）与 `style.css`（L1229-1346）**两处** | 首屏显示几行变了 |
| 6 | `paintViewer` 的 `fold-thumb`/`fold-tag` 更新被删 | 无断言 | 收起折叠条后缩略图停在旧视口 |
| 7 | `paletteLine` 的"长度 ≥2 才标主色"分支 | 30 案都是 3–4 色，长度 1/2 的路径**从未执行** | 未来某案若只有 1 色，标签会自相矛盾 |
| 8 | `countPoints` 的三种编号法 | 只在 `auditFold` 的 summary 里显示"N 条"；`check-docs` 只查 audit 的字数不查 N | summary 上的"（3 条）"数错，无人发现 |
| 9 | `sorted()` 的 `gate` 排序把 `fail` 当降序 | 无断言 | 排序结果看起来"差不多对" |
| 10 | `405 行` 的 `syncEmptyNext` 退路 | 只在 0 行时执行；`inspect.mjs` 从不搜索 | 0 行时给出的行数说错 |

### 6.3 唯一被真正执行的两块

1. **`buildPrompt(id)`** —— `check-docs.mjs:374-401` 用 vm + mock document 装载，
   取 30 个长度并与 README L80 的 `1814–2138` 对账。**这是全仓对 prompt-copy 的唯一运行时测试**，
   且它只校验**长度**，不校验内容。
2. **`check-docs` 的静态源码断言**（数 `field(`、比两个字符串的 `indexOf` 大小、查 `AUDIT_CUT_AT` 不在）
   —— 这是"读代码"而不是"跑代码"。

### 6.4 一个已经成立的正面例子（值得保留）

`check-docs.mjs:134-215` 有 `--selftest`：把三处已知腐化**改回去**（在临时目录里，不碰真仓库），断言恰好那几条红 + 退出码 1；外加中文数字解析器 30+ 条自检。
这是这个仓库里唯一一处"检查器自身的测试"，README L310 有记录。
但它只覆盖 `check-docs` 自己的 3 条断言，且需要人工跑（没有任何脚本会自动调它）。

---

## 7. 加载顺序 / 依赖图

`index.html:362-366`（**全部同步、无 defer、无 module**）：

```html
<script src="data.js"></script>        <!-- 362  定义 window.SCHEMES（30 案 × 33 键） -->
<script src="prompts.js"></script>     <!-- 363  定义 window.STYLE_PROMPTS（sceneIndex/unsupported/hardIds/schemes） -->
<script src="prompt-copy.js"></script> <!-- 364  var P = window.STYLE_PROMPTS; if (!P) return;  → 末尾注册 DOMContentLoaded -->
<script src="self-gate.js"></script>   <!-- 365  定义 window.SELECTION_REPORT -->
<script src="app.js"></script>         <!-- 366  立即执行：读 SCHEMES + SELECTION_REPORT + STYLE_PROMPTS -->
```

外加 `index.html:343-360` 一段**内联脚本**（在 data.js 之前），只为在首次绘制前把 4 个
`<details>` 按宽度收起。

### 7.1 真实依赖（谁能缺谁）

| 消费者 | 硬依赖 | 缺失时的行为 |
|--------|--------|-------------|
| `prompt-copy.js` | `window.STYLE_PROMPTS`（L17） | **静默 return**，整个 IIFE 不执行 → 复制按钮/场景芯片/模板层全消失，无报错 |
| `prompt-copy.js` 的 `buildPrompt` | `window.SCHEMES`（L345, L438） | 静默降级：tone 句省略、`hasVoid` 判 false |
| `prompt-copy.js` 的模板层 | `P.sceneIndex`（L1597+） | `renderTemplateLayer` 里 `if (!strip || !cards || !lead || !emptyBox) return;` |
| `app.js` | `window.SCHEMES`（L9） | `(window.SCHEMES || []).slice()` → `ALL=[]`，页面渲染 0 行、报头全 0，**无报错** |
| `app.js` 的 `plainOf` | `window.STYLE_PROMPTS`（L466） | 回退到 `r.def`（95 字专业定义） |
| `app.js` 的 `capacityHTML` | `window.STYLE_PROMPTS`（L483） | 返回 `''`（行卡少一行提示） |
| `app.js` 的 `syncEmptyFacts` | `P.sceneIndex`（L612） | `idx={}`，空状态说"44 个词"用 `Object.keys({}).length` = **0** |
| `app.js` 的 `SELFGATE` | `window.SELECTION_REPORT`（L99-105） | 显示"没有闸门报告（没渲染过）"，**这是唯一诚实的降级** |

### 7.2 顺序**必须**满足，但没有一行代码或注释统一声明它

唯一写下来的地方是 `prompt-copy.js:306-307` 的一句旁注：
「注意 tone 在 window.SCHEMES 上，不在 P.schemes 上（见 index.html 的加载顺序：data.js 在前）」。

**反例**：`prompt-copy.js` 在 **app.js 之前**加载，但它在 `DOMContentLoaded` 里调
`window.benchSetSceneIds*` —— 那是 app.js 定义的。这个"倒序依赖"靠
「prompt-copy 的挂载被推迟到 DOMContentLoaded，而 app.js 同步执行」这个**隐式时序**成立。
如果哪天把 `mountSceneChips()` 改成同步调用（或把脚本加上 `defer` 而另一个不加），
芯片点击会全部变成 no-op（因为 `if (window.benchSetSceneIdsParkingQuery)` 兜底，不报错）。

**`self-gate.js` 的位置也是隐式的**：它在 `app.js` 之前，因为 `app.js:99` 的 IIFE 立即读
`window.SELECTION_REPORT`。位置换了 → `SELFGATE=null` → 页面显示"没渲染过"（诚实但错）。

### 7.3 `wizard.html` 是另一套加载图

`wizard.html:102-103` 只加载 `data.js` + `wizard.js`。`wizard.js:13` 自带显式守卫：
`if (!ALL.length) { …'读不到 data.js'… return; }` —— 这是三个入口里**唯一**检查依赖是否到位的。

---

## 8. 新开发者第一天会踩的 10 个坑

1. **改 `data.js` 会被覆盖。** 它是 `collect-schemes.mjs:715` 的产物，文件第 1 行就写着"勿手改"。
   要改数据 → 改 `_specs/*.md` 或 `_CURRENT-VALUES.md` → 跑 `node prototypes/_build/collect-schemes.mjs`。
   同理 `prompts.js`（`build-prompts.mjs`）、`self-gate.js`（`render-scheme.mjs`）。
2. **`data.js` 的 `fontsSpec` 和 `prompts.js` 的 `dna.fonts` 完全不是一个东西。**
   前者是 228–514 字的规格**散文**，后者是 `{display, body, mono, displayStack, bodyStack}`。
   2026-10-31 才把前者从 `fonts` 改名成 `fontsSpec`，兜底 `|| r.fonts` 被**故意删掉**（`app.js:236-243`）。
3. **`data.js` 的 `palette` 与 `prompts.js` 的 `dna.palette` 顺序不同、长度不同、语义不同。**
   `data.palette[0]` 恒等于 `bg`（30/30）；`dna.palette` 是字符串 `"#33505C（slate）、…"`，
   第一格可能是主色、可能是纸色（9 案没识别出主色）。`prompt-copy.js:752-790` 有一整段
   记录"第一次修就把这两套顺序搞混，反而把错误固化"。
4. **`#detail` 是 `position:fixed` 的面板，不在文档流里。** 加内容不会让页面变长，
   但会让面板内滚距离变长。所有"首屏可见"的实测都是相对面板顶部（`scrollTop`），不是 `window.scrollY`。
5. **`#detail` 的 innerHTML 每次 `open()` 整树重铺。** 任何 `addEventListener` 都要重新绑；
   想绑一次就活得久，必须挂在 `#detail` 上用委托（今天只有 `<summary>Esc` 一处这么做，L1468）。
6. **`state.q` 是 `input.value.trim().toLowerCase()` 的副本，不是 DOM 的映射。** 改 `#q.value`
   不同步 `state.q` = 界面与筛选分叉；反过来亦然。四个表示同一件事的地方见 §5.10。
7. **`match()` 里加字段会让搜索命中数变，且没有任何闸门看得见。** 加之前先想清楚
   该进 `scenesYes` 还是 `scenes`（后者会让"不适合"生效成"适合"，实测 7/7 反向信号）。
8. **改 `field()` 的调用数会让 `check-docs` 红。** README 第 70 行写着"全部 12 段字段"，
   `check-docs.mjs:764-770` 会剥注释数 `field('` 字面量 + 1（`auditFold`）。
   把 4 个折字段改名成 `longField()` 会让段数数成 8 —— 这个坑在 `field()` 注释 L1136-1148 里记着。
9. **`980` 是四个地方的同一个数**（`app.js:338` / `prompt-copy.js:1248` / `index.html:347` / `style.css:998`）。
   改一处不会炸，但会让"窄档"在四个文件里指四个不同的宽度。
10. **"跑一遍闸门"不是一条命令。** 没有 `npm test`、没有 `make`、没有 CI。要手动跑：
    `collect-schemes.mjs`（如需）→ `render-scheme.mjs _selection`（如改了源）→
    `check-docs.mjs` → `check-twolines.mjs` → `check-prompts.mjs` → `check-texture.mjs` →
    `check-contract.mjs` → `check-anchors.mjs` → `check-stale.mjs` → `verify-prototype.mjs --all`。
    **没有任何脚本把这 9 个串起来**（`grep -rl "spawnSync.*check-"` 只在 `deliverables/` 下有命中）。

---

## 9. 附录：本报告用到的复算脚本

- `deliverables/74-recon/_stats.js` —— 字段表、去重率、枚举分布、hard/degrades 集合
- `deliverables/74-recon/_dead.js` —— 符号调用计数（剥注释后）
- `deliverables/74-recon/s07-s15.json` —— S07 / S15 完整对象逐字导出

实测复核（本机，本次运行）：
- `node prototypes/_build/check-twolines.mjs` → **FAIL 0 / WARN 0**（R1 30/30、R6 30/30、R7 30/30、R8 30/30、R5 INFO 33/53）
- `node prototypes/_build/check-docs.mjs` → **0 FAIL / 0 WARN / 13 PASS**
- `buildStylePrompt` 30 案长度：1814–2138，中位 1988（与 README L80 一致）
- `data.risk === prompts.dna.risk`：**30/30**
- `data.palette ⊆ prompts.dna.palette`：**30/30**
- `dna.degrades === (capacity.degrades === "yes")`：**30/30**
- `s.hard` 集合 === `P.hardIds` 集合：**4/4**（S15 S18 S21 S29）

## 10. 运行时调用 / 数据流图（一张图看全）

```
┌─ 浏览器加载（同步，无 defer/module）───────────────────────────────────────────────────┐
│                                                                                       │
│  <script> index.html:343-360 内联：4 个 <details>.open = !narrow(980)                  │
│  <script src=data.js>         → window.SCHEMES[30]                                    │
│  <script src=prompts.js>      → window.STYLE_PROMPTS{sceneIndex(44),unsupported(29),   │
│                                                        hardIds(4),schemes(30×10)}       │
│  <script src=prompt-copy.js>  → var P=STYLE_PROMPTS; if(!P)return;   ← 静默短路点       │
│       └ 末尾：DOMContentLoaded → mountSceneChips()      ← 推迟到 app.js 执行之后         │
│  <script src=self-gate.js>    → window.SELECTION_REPORT{at,findings[1]}                 │
│  <script src=app.js>          → IIFE 立即执行                                            │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘

── app.js 启动序列（L5-1654，一次执行完）───────────────────────────────────────────────
  var ALL = (window.SCHEMES||[]).slice()                       L9     ← 硬依赖，缺失=空清单
  var state = {21 键}                                          L12
  var stats = {total,built,clean,shots}                        L51    ← 4 个报头数字
  $('#f-total/f-built/f-clean/f-shots').textContent = …         L71-87,157   ← 无守卫
  var SELFGATE = IIFE(window.SELECTION_REPORT)                  L99    ← 缺失=null=诚实降级
  chips(#flt-ground/band/load/loud/fr/thr/tone/state/gate)      L190-200    ← 9 组，29 颗
  ledger = $('#ledger')                                         L436
  io = null; observeRows() 在 render() 里调                     L578
  $('#d-close').addEventListener('click', close)                L1456   ← 无守卫
  $('#q').addEventListener('input', …)                          L1494   ← 无守卫
  $('#sort').addEventListener('change', …)                      L1508   ← 无守卫
  $('#reset').addEventListener('click', …)                      L1509   ← 无守卫
  detail.addEventListener('keydown', Esc→focusIntoDetail)        L1468
  document.addEventListener('keydown', 全局快捷键)                L1531
  window.addEventListener('hashchange', /^S\d{2}$/)             L1608
  render()                                                      L1616   ← 首次渲染
  if (/^S\d{2}$/.test(location.hash)) open(h,{focus:false})     L1619   ← 深链
  window.benchSetSceneIds / ClearSceneIds / ParkQuery /         L1625-1653
    SetSceneIdsParkingQuery / ClearSceneIdsKeepQuery / Parked

── render() 一轮（L858-892）─────────────────────────────────────────────────────────────
  rows = sorted(ALL.filter(match))                                       ← match: 10 Set AND + q 子串
    └ match(r)  L204-260
         sceneIds → ground → band → load → loud → fr → thr → tone → st → gate
         → hay.indexOf(q)  [hay = 20 字段 + axes + palette，全 toLowerCase]
  ledger.innerHTML = rows.map(rowHTML).join('')            L860   ← 整表重铺
    └ rowHTML(r)  L517-577
         <li><p.no>Sxx</p><div.row-main>
              row-head: cn / en / fr tag / threshold tag / tone tag
              row-def : plainOf(r)      ← 跨文件读 STYLE_PROMPTS.schemes[].plain
              row-meta: family / swatches / errorCode / capacityHTML(r)
                        └ capacityHTML ← 跨文件读 STYLE_PROMPTS.schemes[].capacity.degrades
              <div.shots> desktop+tablet+mobile 各 1 张（无 lazy）
              row-foot: gateTags(r) + screens/realPictures/overflow/failIds/warnIds
  $('#empty').hidden = rows.length>0 ; #count.textContent                 L862-863
  if (!rows.length) syncEmptyFacts() → syncEmptyNext(idx)                 L864
       └ 4 条退路按 state 分岔，每条挂一个当场可点的按钮（reset/drop-q/drop-chip/drop-axes/use-chip）
  syncParked()                                                           L867
  window.onBenchRender({q, rows, total})   ← 跨文件回调 prompt-copy.js    L879-880
       └ renderTemplateLayer(ctx)  L1597
            currentTerm(ctx): ctx.q || 读 DOM 的 .scene-chip[aria-pressed]
            resolveTemplateHits(term) → {exact(3 表), adjacent(6 条 why)}
            #tpl-strip (有结果时) / #empty-tpl (0 行时) 二选一
  $$('.row').forEach(bind click→open / keydown Enter,Space→open)           L885-890
  syncCurrent() → aria-current                                           L891
  observeRows() → IntersectionObserver 入场动效                           L892

── open(id) → renderDetail(r)（L1236 / L1266）───────────────────────────────────────────
  state.open=id; vp='desktop'; shotIdx=0
  renderDetail(r):
    #d-no / #d-cn / #d-en = id / cn / en+fr+structure
    viewerHTML = .viewer{viewer-tabs(3), #stage, #strip, #vnote}
    viewer  = fold('fold-view',  foldSum(thumb, '原型截图预览', …, N 张), viewerHTML, false)
    proto   = <a href="../{r.dir}/index.html">   ← 相对路径，依赖整个 prototypes/ 树
    gate    = fold('fold-gate',  foldSum(null,'闸门与报告',…, gateTags), gateBox, false)
    parts   = fold('fold-parts', foldSum(null,'上站文案 4 段',…), <ul.parts>…, false)
    fields  = <dl.fields> + 12 段（4 平铺 + 4 折 + auditFold 折 + 3 平铺）
    #d-body.innerHTML = viewer + proto + gate + parts + fields            L1397  ← 整树重铺
    mountPromptButton($('#d-body'), r.id)   ← 跨文件；插到 #d-body 最前   L1403
    $$('.viewer-tabs button').forEach(bind click → paintViewer)            L1405
    paintViewer(r) → #stage/#strip/#vnote + fold-view 缩略图/张数同步        L1415

── 跨文件调用（全部经 window.*，两侧都有 if 兜底 ⇒ 缺后端静默 no-op）─────────────────────
   app.js ──→ prompt-copy.js :  window.onBenchRender(ctx)            L879-880
                              window.mountPromptButton(host,id)     L1403
   prompt-copy ──→ app.js    :  window.benchSetSceneIdsParkingQuery(ids) L1332
                               window.benchClearSceneIdsKeepQuery()      L1312
                               window.benchSetSceneIds(ids)  [else 兜底]  app.js:1625
       （prompt-copy 的 mountSceneChips 在 DOMContentLoaded 里跑，
         必须晚于 app.js 的同步执行 —— 这个时序是隐式的，没有注释统一声明）

── 数据流：一个字段的三条路径 ──────────────────────────────────────────────────────────
   _specs/S07.md 字段8
        └→ collect-schemes.mjs:395 cutAuditMarker(标记「反套路改造三指标」)
             └→ data.js  r.audit（S13 780→306 字，其余原样）
                  ├→ app.js:1391 auditFold(r) → countPoints() 现算「N 条」→ <details>
                  ├→ app.js:246  hay 索引（搜索"审计"/"C-1.3"能命中）
                  └→ build-prompts.mjs ✗ 不读 audit（提示词里没有它）
                       └→ 理由见 app.js:1040-1060：77 处条款编号对模型是噪声，对人却是唯一证据

   _specs/S07.md 字段9 risk
        ├→ data.js r.risk
        │    ├→ app.js:1392 field('反 AI 味风险与规避', r.risk)
        │    └→ build-prompts.mjs:44 正则回读 → prompts.js dna.risk（**逐字副本**）
        │         └→ prompt-copy.js:780-810 截 220 字 → 提示词「这一案最容易做成的错误样子」
        └→ （无第三消费者）
```

## 11. 本次侦察新发现的两处「界面在说半真话」（不在原任务清单里，但属架构债）

### 11.1 `index.html:211` 仍写着「多数案 10 段、个别 9 段」，而面板今天渲染 **12 段 / 30 案全部**

- `index.html:211`：「点任意一行展开它的全部字段与整页截图（**多数案 10 段、个别 9 段**——缺失原因在 README…）」
- `app.js:1357-1394`：`field()` 11 次 + `auditFold()` 1 次 = **12 段**。
- `README.md:70`：「下面才是…与**全部 12 段字段**」；`README.md:157`：「这 12 段在选型台上**全部渲染出来**（30/30，不是抽样）」。
- 实测（`_stats.js`）：11 个文本字段 + `palette` 在 **30/30 案**全部非空 ⇒ **没有一案是 10 段或 9 段**。

**为什么它没被任何闸门抓到**：`check-docs.mjs` 的一致性断言全部**只读 `README.md`/`README-EN.md`**，
从不读 `index.html`。`check-docs.mjs:859` 只把 `index.html` 列进 `PREFIXES` 用于**路径存在性**检查。
`check-anchors.mjs` 只查 `href="#X"` vs `id="X"`。**`index.html` 里的散文数字与标签数没有任何闸门看**。
这是一条完整的盲区：README 有 13 条断言，而同为"给用户读的文案"的 `index.html` 是 **0 条**。

### 11.2 `index.html:153` 的 `summary` 写着「11 组 47 颗芯片」，两半都过时

实测（`_stats.js` 复算）：

| 说法 | 实测 | 差 |
|------|------|-----|
| 「11 组」 | **10 组**（scene + ground/band/load/loud/fr/thr/tone/state/gate） | 多报 1 组 |
| 「47 颗芯片」 | **73 颗**（scene 44 颗 + 另 9 组 29 颗） | 少报 26 颗 |
| — | 首屏默认可见 **45 颗**（16 实心行业 + 29 组内芯片），余 28 颗行业芯片收在 toggle 里 | — |

`index.html:145` 的注释与 `prompt-copy.js:1245` 也各自复述了同一个「11 组 47 颗」（后者是给
`collapseRailAfterPick` 的"焦点退到 summary 时读什么"做说明的），所以这个错数字有**三处副本**。
`47` 大概率是"44 行业词 + 3"或某个早期快照，但**没有任何代码或注释记录它的口径** ——
这是一条已经被复述三次、却从未被复算过的数字。

**同一类问题的另一处**：`index.html:211` 说「多数案 10 段」而 README 说 12 段 ——
两个入口对同一件事给出两个答案，而 `check-docs` 只守住其中一个。

**为什么这条对架构重要（而不是文案小事）**：这个仓库的核心纪律是"界面上的每个数字都来自磁盘"
（`app.js:4` 的契约原话）。`summary` 与「怎么用」这两处**违反了它自己的契约**，
而违反者恰好是**唯一没有闸门覆盖的那个文件**。修法不是改这几个字，而是把
`index.html` 的可复算数字纳入 `check-docs`（它已经有 `nums/scenes`、`nums/warn-axes` 这种现成模式）。

---

## 12. 报告自检

- 所有 file:line 在本机当前文件状态下逐一核对过（`data.js` 2026-11-03 22:54 / `app.js` 10-31 04:04 /
  `prompt-copy.js` 10-30 03:30 / `prompts.js` 10-31 05:07 / `index.html` 10-29 / `style.css` 10-29）。
- 所有数字都由 `_stats.js` / `_dead.js` / 直接 `node -e` 现算，无引用二手报告。
- 两个闸门在本机实跑：`check-twolines.mjs` FAIL 0 / WARN 0；`check-docs.mjs` 0 FAIL / 0 WARN / 13 PASS。
- 本次侦察**未修改任何 tracked 文件**；新增产物仅 `deliverables/74-recon/` 下的
  `arch.md` / `s07-s15.json` / `_stats.js` / `_dead.js`（全部为 `??` 未跟踪）。
