# 21 · 数据链审计（2026-11-13 轮次）

> 审计对象：本轮对 `prototypes/_prompts/build-prompts.mjs` 的两处改动
> （① HUMAN 表补 S31–S35；② `minPics` 显式判 null/undefined，修 falsy-0）
> 全链：`_specs/*.md → extract-dna → clean-dna → collect-schemes → data.js → build-prompts → prompts.js`
> 环境：Windows / git bash / node v26.12.1。所有数字均为本轮实测输出。

---

## §0 结论先行

**数据链自洽。** 八道闸门全绿（FAIL 0），两条链的 35 案一一对应，无编造字段，无空值。

本轮的两处改动**都正确且都已生效**：

- **falsy-0 修复正确**。S34 是刻意零图设计，`minPics=0` 是实测值，不是漏值。
  修复前的 `(cap && cap.minPics) || h.minPics` 会把 `0` 当 falsy 顶回 `HUMAN` 表的 `3`，
  让提示词对着一页零图的版式要求「至少 3 个图片位置」。现已改为显式判 `undefined/null`，
  实测吐出的 `minPics` 与该案 `report.json` 的 `realPictures` 逐案全等。
- **S31–S35 五个 HUMAN 条目无编造**。`plain` 5/5 忠于各案 `def`，`minItems`/`minPics`
  10/10 与 `minitems-parsed.json` 一致。`scenes` 15 个标签里 12 个字面摘自 `scenesYes`，
  3 个是相邻词重组（详见 §3.3，非编造，但口径可以更严）。

**共 6 处问题，均非本轮引入，且都不在数据链自洽性上：**

| # | 问题 | 性质 | 严重度 |
|---|---|---|---|
| 1 | `prompts.js` 头部 banner 三句话全过时且**指错案**：写「最多 7 色」（实为 9）、「21/30 有主色」（实为 31/35）、「这 9 案 palette[0] 是底色」（在 prompts 链上 0/9 成立） | 文档失真 | **高**（误导改配色逻辑的下一个人） |
| 2 | `check-twolines.mjs` R6 的 5 个新案被**静默跳过**（30/35 无任何交代） | 闸门静默 | 中 |
| 3 | 新 5 案在 `sceneIndex` 里**零条目**（芯片/搜索完全不可达） | 数据缺口 | 中 |
| 4 | `check-docs.mjs` 两处 + `build-prompts.mjs` 两处打印「30/30」「31/30」，实际 35 | 标签陈旧 | 中（断言本身对 35 生效） |
| 5 | S31 的 `data.js` 散文 `def`/`audit` 仍写 `#7A756C`，实际页面是 `#5F5B55` | 散文陈旧 | 低 |
| 6 | `extract-specs.mjs` 仍只读 04/05/06（S31–S35 不是它的产物，跑它会静默跳过），末尾硬写「30/30」 | 结构 + 标签陈旧 | 低 |

另有一处**本轮操作产生的假警报**已自证并复原，见 §1.2。

---

## §1 全链重生成 diff 结果

### §1.1 `prompts.js`：与生成器输出**逐字节一致**

备份后重跑生成器：

```
$ cp prototypes/_selection/prompts.js /tmp/prompts-backup.js
$ cp prototypes/_selection/data.js    /tmp/data-backup.js
$ node prototypes/_prompts/build-prompts.mjs
$ git diff --stat prototypes/_selection/prompts.js
(空)
```

**结论：提交的 `prompts.js` 就是生成器的当前输出，没有「改了生成器忘了重生成」。**
`diff -q /tmp/prompts-backup.js prototypes/_selection/prompts.js` 亦为 identical。

### §1.2 ⚠️ 一个假警报：`check-stale` 因我重生成而变红（已复原）

重跑生成器后 `check-stale.mjs` 报：

```
⚠️ 1 项陈旧：选型台(_selection) prompts.js 落后 1699 分钟
```

**这是我自己造成的，不是仓库的问题。** 生成器写出了内容完全相同、但 mtime 变新的文件。
核对：`git log` 里 `prompts.js` 最后改动是 `2026-11-12 17:24:05`（commit 4ef90b2），
`.inspect/report.json` 是 `2026-11-12 17:40:32`（commit 之后重渲染过，正常）。

把 mtime 复原到提交时间后：

```
$ touch -d "2026-11-12 17:24:05" prototypes/_selection/prompts.js
$ node prototypes/_build/check-stale.mjs
  ✓ 全部新鲜        EXIT=0
```

**记录这一点是因为它本身是个可复现的坑**：任何人在本地跑一次 `build-prompts.mjs`，
即使一个字节都没变，`check-stale` 也会红。这条闸门用 mtime 判「改了没重渲染」，
无法区分「内容变了」和「只是重跑了一遍」。不是本轮引入的，但会被本轮的改动频繁触发。

### §1.3 `data.js`：重生成会改 35 行，但**全是时间戳**

`node prototypes/_build/collect-schemes.mjs` 后 `git diff` 有 35 行变更。逐行核验：

```
$ git diff -U0 prototypes/_selection/data.js | grep -c '^+   "at":'   → 35
$ git diff -U0 prototypes/_selection/data.js | grep '^+[^+]' | grep -v '"at":' | wc -l  → 0
```

**35 处全部是 `gate.at` 时间戳，没有一个字段值变化。** 原因是 `.inspect/report.json`
在 data.js 最后一次提交之后被重渲染过（Q2 补闸门那一轮的产物），
所以「重跑 collect-schemes」会把这些新时间戳写进来。

- 这**不影响数据链自洽**（`at` 只是展示用时间戳）；
- 但它意味着 **`data.js` 已提交版本确实落后于 `_specs` + `report.json` 的当前状态**，
  只是落后的部分是时间戳而非内容。
- 我已从 `/tmp/data-backup.js` 复原，未提交任何东西。

> 纪律遵守：本项**未提交**，按要求先报告。是否要重跑 `collect-schemes` 并提交这 35 个时间戳，
> 留给主线程裁定 —— 它不改变任何结论，只让 `gate.at` 与 `report.json` 对齐。

---

## §2 两条链关系检查

```
$ node prototypes/_build/check-twolines.mjs
  两链关系闸门：data.js(35 案) ↔ prompts.js(35 案)
  R1 data.js ⊆ prompts.js           35/35
  R6 UI 的「主色」= 规格声明的主色   30/35
  R7 调色板条目都带角色名            35/35
  R8 data.js 的 fontsSpec 非空       35/35
  R5 补色有 CSS 角色注释（INFO）     46/76
  合计 FAIL 0 / WARN 0        EXIT=0
```

- **R1（子集关系）35/35 通过** —— 两条链没有被合并，`data.js ⊆ prompts.js` 仍成立。
- **R7、R8 均 35/35** —— 调色板角色名、`fontsSpec` 在全部 35 案上非空。
- **R6 是 30/35，但这不是 5 个不匹配。** 见下。

### §2.1 R6 的 30/35：**5 个新案被静默跳过**（问题 #2）

我复现了 R6 的判据（`check-twolines.mjs:106-128` 的 `specPrimaryOf`）并逐案跑：

```
S31 NO-SPEC ui=#F2F0EC spec={"noHex":true}
S32 NO-SPEC ui=#241A2E spec={"noHex":true}
S33 NO-SPEC ui=#F2F6F5 spec={"noHex":true}
S34 NO-SPEC ui=#EBEEF0 spec={"noHex":true}
S35 NO-SPEC ui=#1A1E22 spec={"noHex":true}
```

根因：R6 从 `_specs/Sxx.md` 的「配色系统」段里找含「**主色**」二字的分句。
S31–S35 的规格用的是「背景色…正文色…次级文字…」的写法，**全文一次「主色」都没有**：

```
$ for i in 31 32 33 34 35; do grep -o '主色' prototypes/_specs/S$i.md | wc -l; done
0 0 0 0 0        ← 对照：S01.md 是 2
```

于是 `specPrimaryOf` 返回 `null`，`if (specPri)` 为假，**整条断言被跳过，且不计入任何「跳过」计数**。
`stats.r6Ok` 只累加真正比对过的案，所以分母是 35、分子是 30，中间 5 个凭空消失。

**这不是数据错，是闸门的静默缺口**，而且正是本仓库记忆里反复记录的那种病
（「读不到数据 → 不报错」）。R6 的语义是「UI 印的主色必须等于规格声明的主色」，
对 5 个新案它**一票都没投**，却仍打印一个看起来只是「略低」的 30/35。

可行的修法（任选，未实施）：让 R6 在 `specPri === null` 时 `add('WARN', ...)` 或
单独计一个 `r6Skipped` 并在汇总行里印出来，与 R1/R7/R8 的「全量」口径对齐。

---

## §3 S31–S35 五个条目逐项核对

### §3.1 `plain`（5/5 合理，无编造）

| 案 | plain | 字数 | 对照该案 def 的机制 | 判 |
|---|---|---|---|---|
| S31 | 只给读数不表态，刻度当骨架 | 13 | def：「整页的"图"就是刻度本身」 | ✅ |
| S32 | 紫色卡片柜，编号代替图片 | 12 | def：「三只档案柜抽屉…整页没有一张花照」 | ✅ |
| S33 | 两组信息并排对账，青灰底 | 12 | def：「左边客户原话／右边合同的数…青灰（#4A6763）」 | ✅ |
| S34 | 一张图都不放，纯文字索引 | 12 | def：「全页零位图，没有 img、没有背景图、没有 SVG」 | ✅ |
| S35 | 器物开口说话，命令行语气 | 12 | def：「整页是一台自动售货机的输出窗口…命令+输出」 | ✅ |

全部 ≤20 字、无 px/HEX/角度，符合 `check-prompts.mjs` 的 D1 判据
（`plain-too-long` / `plain-not-human`，`check-prompts.mjs:454-460`）。

### §3.2 `minItems` / `minPics`（10/10 与 `minitems-parsed.json` 一致）

| 案 | HUMAN 表 | `minitems-parsed.json` | 实际吐出 | 判 |
|---|---|---|---|---|
| S31 | 6 / 1 | 6 / 1 | 6 / 1 | ✅ |
| S32 | 3 / 1 | 3 / 1 | 3 / 1 | ✅ |
| S33 | 8 / 1 | 8 / 1 | 8 / 1 | ✅ |
| S34 | 7 / **3** | 7 / **0** | **7 / 0** | ✅（靠修复生效） |
| S35 | 7 / 1 | 7 / 1 | 7 / 1 | ✅ |

**注意 S34：`HUMAN` 表里写的是 `minPics: 3`，而真相是 `0`。** 现在能吐出 `0`
完全依赖新加的 null/undefined 判据 —— `minitems-parsed.json` 有该案，所以
`cap.minPics` 是 `0`（不是 `undefined`），新判据放行 `0`。

> 这是一个**隐性脆弱点**：`HUMAN[S34].minPics = 3` 仍是一份错的手写兜底。
> 只要哪天 `minitems-parsed.json` 少了 S34 这一行，就会静默退回 `3`，
> 重新要求零图页放 3 张图。`CAPACITY_MISSING` 只守「整案缺失」，
> 守不住「有行但值被兜底表覆盖」。建议把 `HUMAN[S34].minPics` 一并改成 `0`（未实施）。

### §3.3 `scenes`（12/15 字面摘自 `scenesYes`，3/15 为相邻词重组）

逐标签对 `data.js:scenesYes` 做字面子串测试：

| 案 | 标签 | 在 scenesYes 里？ |
|---|---|---|
| S31 | 修表修鞋 / 零件目录 | ✅ / ✅ |
| S31 | B端采购 | ❌（scenesYes 原话是「B 端说明页」，中间有空格且有「说明页」） |
| S32 | 花艺工作室 / 香氛 / 定制家具 | ✅ / ✅ / ✅ |
| S33 | 法务 | ✅ |
| S33 | 装修施工 / 咨询顾问 | ❌ / ❌（原话是「装修 / 施工」「咨询 / 设计 / 法务」） |
| S34 | 写作课 / 编辑服务 / 政策说明 | ✅ / ✅ / ✅ |
| S35 | 小众硬件 / 更新日志 | ✅ / ✅ |
| S35 | 独立工具 | ❌（原话是「独立项目（个人工具、小众硬件）」） |

**判定：不是编造。** 3 个 ❌ 全部能在 `scenesYes` 里找到直接依据：

- `装修施工` = 把「装修 / 施工」两个并列词合成一个标签；
- `咨询顾问` = 把「咨询 / 设计」里的「咨询」补成职业名；
- `B端采购` / `独立工具` = 语义对得上，只是措辞与原文不同。

但生成器注释（`build-prompts.mjs:179`）写的是「从各案 data.js 的 `scenesYes` 里**摘出**
可直接命中的行业名」，而「摘出」严格讲只覆盖 12/15。**口径与实现有 3 处偏差**，
不算编造，但如果要完全对齐注释，这 3 个应当改成原文词或补一句「允许相邻词重组」。

### §3.4 重点：S34 的 `minPics = 0` 对不对 —— **对，三路证据一致**

1. **设计意图**：`data.js:def` 明写「全页零位图，没有 img、没有背景图、没有 SVG」；
   `_specs/S34.md` 抬头写「本案是**全库第一个零位图页**（`realPictures = 0`，`minPics = 0`）」。
2. **源码实测**：
   ```
   $ grep -o '<img'              prototypes/S34-graphite-zero-photo-index/index.html | wc -l  → 0
   $ grep -o 'url('              .../style.css                                            → 0
   $ grep -o '<picture|<image'   .../index.html                                             → 0
   $ grep -c  '<svg'             .../index.html                                             → 0
   ```
3. **渲染实测**（`prototypes/S34-…/.inspect/report.json` 的 `viewports[0].metrics.page`）：
   ```
   "img": 0, "video": 0, "canvas": 0, "svg": 0, "realPictures": 0
   ```

**三路一致：0 张图。`minPics = 0` 正确。**

并且 5 个新案的 `minPics` 与该案**实测 `realPictures` 逐案全等**，不是照抄 `minitems-parsed.json`：

| 案 | 吐出 minPics | report.json `realPictures` |
|---|---|---|
| S31 | 1 | 1 |
| S32 | 1 | 1 |
| S33 | 1 | 1 |
| S34 | 0 | 0 |
| S35 | 1 | 1 |

**下游也正确**：`prompt-copy.js:826` 用 `s.minPics ? ... : ""`，`0` 是 falsy 所以
S34 的提示词**不会**出现「至少要 N 个图片位置」那句 —— 与零图设计一致。
这条由 `check-prompts.mjs` 的 D2（`minpics-falsy-zero`）看守，`--selftest` 实测会响：

```
$ node prototypes/_build/check-prompts.mjs --selftest
✓ plain-empty / plain-not-human / minpics-falsy-zero / mech-no-measurable
全部变异都响了 —— 断言有效。
```

---

## §4 35 案完整性

自写脚本逐一核验（`/tmp/dq.mjs`）：

```
SCHEMES 35  PROMPTS 35
only in data.js:     (none)
only in prompts.js:  (none)
dir mismatch:        (none)
dna keys distribution: {"13": 35}      ← 35 案全部 13 字段
data palette lengths:  {"3": 5, "4": 30}   ← 无空数组
prompts dna.palette empty: (none)
data.js 12 必要字段缺失: (none)
```

- **ID 集合完全一致**：35 ↔ 35，双向差集为空。
- **`dir` 全部对齐**：无一案两边目录名不同。
- **`data.js` 12 个必要字段**（`id/dir/cn/tone/structure/palette/scenes/def/threshold/family/scenesYes/scenesNo`）**35/35 非空**。
- **`prompts.js` `dna` 13 字段**（`fonts/palette/radius/shadow/lineWidths/h1Size/bodySize/h1SizeAt1440/mechanism/degrades/risk/reuse/radiusBare`）**35/35 存在**。
- **`palette` 无空数组**（`data.js` 最短 3 色、`prompts.js` 无一为空）。
- **`mechanism` 无空字符串**（0 处）。

### §4.1 唯一的「空」：S02–S10 的 `dna.reuse` 是空串

```
reuse empty string: S02 S03 S04 S05 S06 S07 S08 S09 S10
```

**这是刻意设计，不是缺失。** `build-prompts.mjs:457` 明写：

```
取到该句的案：26/30；缺的：S02 S03 S04 S05 S06 S07 S08 S09 S10（缺的案提示词里整句省略，不编）
```

这 9 案的 `_specs` 里没有「最难被复用」那半句，生成器选择**整句省略而不是编一句**。
`prompt-copy.js` 据此把「结构约束第 6 条」省掉（9 案 5 条、26 案 6 条），两处口径一致。
**判：自洽，无误。**（注：吐出的 26/30 里已含 S31–S35 —— 这 5 案都有 reuse。）

---

## §5 `_specs/*.md` 状态

### §5.1 当前内容与 `deliverables/04|05|06` 一致（S01–S30）

备份 `_specs` 后重跑 `extract-specs.mjs`：

```
$ cp -r prototypes/_specs /tmp/specs-backup
$ node prototypes/_build/extract-specs.mjs      → 30/30 全部切出
$ diff -rq /tmp/specs-backup prototypes/_specs  → (无输出)
```

**S01–S30 逐字节一致**，`_specs` 没有被污染。

### §5.2 `_specs` 有**两个源**，不是「全部从 04/05/06 生成」

- **S01–S30**：`extract-specs.mjs` 从 `deliverables/04/05/06-schemes-*.md` 机械切分（产物）。
- **S31–S35**：**不是** `extract-specs.mjs` 生成的。`SOURCES` 硬写三份文件：
  ```js
  const SOURCES = ['04-schemes-01-10.md','05-schemes-11-20.md','06-schemes-21-30.md'];
  ```
  三份各 10 个 `### 方案 N`，**没有 31+**。新 5 案的 `_specs` 抬头自述：
  ```
  > 源：`deliverables/75-q2/05-N32-N35-DESIGN.md`（Q2 新增）
  ```
  即它们是**手写的源文件**，不是 extract-specs 的产物。

**这是一处结构性不一致**：同一个目录里混了两种性质的 `.md` ——
30 个「产物」（会被覆盖）+ 5 个「源」（不能被覆盖）。跑 `extract-specs.mjs` 会
**静默跳过** S31–S35（既不重写也不报错），所以「重跑生成器会不会冲掉新案」的答案是
**不会冲掉，但也不会更新它们** —— 因为生成器根本不知道它们存在。

### §5.3 本轮改 `build-prompts.mjs` 会不会导致 `_specs` 需要重新生成？

**不会。** `build-prompts.mjs` 只读 `_specs`/`dna-clean.json`/`minitems-parsed.json`，
**不写 `_specs`**。依赖方向是单向的：`_specs → … → prompts.js`。
本轮两处改动都在链条末端（生成器的人写表 + 取值判据），不回流。

---

## §6 「30/30」标签疑点（F 项）

### §6.1 结论：`check-docs.mjs` 那两处是**陈旧标签**，不是数据只覆盖 30 案

数据源覆盖的是 **35 案**，断言比较的也是 35：

```js
// check-docs.mjs:445,458
schemes:      SCHEMES.length,                                                    // = 35
layoutFilled: SCHEMES.filter((s) => (s.layout || '').trim()).length,             // = 35
```

实测：

```
layout 非空   : 35 / 35
audit  非空   : 35 / 35
```

但打印字符串是硬写的 `30/30`：

```
// check-docs.mjs:853
else pass('status/layout-fix', `layout 抽取 30/30 有值，S12/S15/S19 = …`);

// check-docs.mjs:909
else pass('panel/fields', `…audit 30/30 有值（…）…`);
```

实际输出（跑出来是这样）：

```
✓ status/layout-fix    layout 抽取 30/30 有值，S12/S15/S19 = 549/640/420 字
✓ panel/fields         12 段字段…，audit 30/30 有值（216–444，中位 314，合计 11365）
```

**判：标签陈旧。** 分母写死成 30，而校验用的是 `F.schemes`（35）。
如果哪天真有 5 案 `layout` 空了，错误信息会说「layout 只有 30/35 案有值」——
那时候两个数才第一次对上，反而更像巧合。

> 注：`audit` 的**数值区间**（216–444 / 中位 314 / 合计 11365）是新 35 案的真实值，
> README:74 也写的是 35/35（216/444/11,365/314）—— 只有闸门那行文案没跟上。

### §6.2 全仓「30/30」共 30 处，分两类

`grep -rc "30/30"` 命中 10 个文件。逐类判：

**（a）陈旧标签，应改（共 3 处活代码）：**
- `check-docs.mjs:853`（layout，见上）
- `check-docs.mjs:909`（audit，见上）
- `check-prompts.mjs:707`（`共 ${staleCases}/30 案的 prompts.js 落后于 dna-clean.json`）

**（b）历史注释 / 已固化的历史实测值，不需改（绝大多数）：**
`build-prompts.mjs:30,54,94,272,273,298,361,365`、`clean-dna.mjs:16,492,505,684,706,856,917,921,1059,1095`、
`collect-schemes.mjs:183,184,187,302,307,311,411,423,676,678,691`、
`check-twolines.mjs:104,105,189,190,191`、`check-stale.mjs:87,88`、
`probe-ui.mjs:303`、`check-contract.mjs:311` —— 这些要么在讲「2026-10-30 那一轮实测」，
要么引用的是 30 案时代的判据（如 `_CONTRACT.md` §9 的规则集本身就是 30 案口径）。
它们描述的是**历史事实**，改掉反而会伪造。

### §6.3 `build-prompts.mjs` 自己也有两处活的分母写死（问题 #4 的同族）

```
$ node prototypes/_prompts/build-prompts.mjs
  识别出主色的案：31/30（其余 9 案…）；没认出主色的：S32 S33 S34 S35
  取到该句的案：26/30；缺的：S02 … S10
```

**「31/30」这个数本身就自证了标签是错的** —— 分子 31 超过分母 30。
两处都是 `withPrimary.length + "/30"` 与 `withReuse.length + "/30"`（`build-prompts.mjs:451,456`），
分母写死，分子随案数增长。

**这不是本轮引入的**（`grep` 显示这两行的字符串在 S31 之前就写死了），
但本轮的改动让它们从「30/30（看着正常）」变成「31/30（一眼是错的）」，**暴露**了问题。

同一句里还有第二个陈旧数：`其余 9 案`。实测不是 9，是 **4**：

```
$ node prototypes/_prompts/build-prompts.mjs
  识别出主色的案：31/30（其余 9 案…）；没认出主色的：S32 S33 S34 S35
                                                        ↑ 只有 4 个
$ node -e "数 dna-clean.json"  → with primary: 31  |  no primary: S32 S33 S34 S35 (4)
```

31 + 4 = 35。所以正确的话应当是「**31/35**（其余 4 案没有可靠主色标记）」。

### §6.4 `prompts.js` 头部 banner 的三句话**全部过时**（问题 #1 最严重的一处）

`prompts.js:5-11` 的 banner 是「2026-10-26 数据形状变更（读端需知）」，
它明确写给「读这个文件的下一个人」。三句话逐条核对：

| banner 原文 | 实测 | 判 |
|---|---|---|
| `dna.fonts … 30/30 与实测一致` | 35 案（分母陈旧） | 陈旧 |
| `dna.palette 由最多 5 色放宽到**最多 7 色**` | **实测最大 9 色**（`clean-dna.mjs` 的 `MAX = 9`） | **错** |
| `优先放主色（**21/30** 案能检出主色）` | **31/35** | **错** |
| `注意：**9 案**（S01 S08 S13 S14 S17 S18 S20 S25 S26）没有可靠的「主色」标记，**它们的 palette[0] 是纸色/底色**` | 这 9 案**现在都有主色**；而**真正**没有主色的是 S32–S35 | **错，且指错了案** |

逐项证据：

```bash
# 「最多 7 色」→ 实际 9 色
$ node prototypes/_prompts/build-prompts.mjs | grep -A7 '调色板色数'
  4 色：10 案 / 5 色：4 案 / 6 色：8 案 / 7 色：6 案 / 8 色：2 案 / 9 色：5 案
$ grep -n 'const MAX' prototypes/_prompts/clean-dna.mjs
  const MAX = 9;                    ← 上限已从 7 提到 9（commit 7113468, 2026-11-09）
```

```bash
# 「21/30 案能检出主色」→ 实际 31/35；「9 案没有主色」→ 实际 4 案
$ node -e "数 dna-clean.json"
  with primary: 31 / 35     no primary: S32 S33 S34 S35 (4)
```

```bash
# 「这 9 案的 palette[0] 是纸色」—— 在 prompts.js 自己的 dna.palette 上 0/9 成立
$ node -e "比 prompts.dna.palette[0] vs data.bg"
  S01 → #C1121F（red）     = 主色，不是纸色
  S08 → #C46A1F（amber）   = 主色
  S13 → #7B612C（gold）    = 主色
  S14 → #E4572E（主色）    = 主色
  S17 → #5A2A50（ink）     = 主色
  S18 → #2FA84F（phos）    = 主色
  S20 → #26485C（blue）    = 主色
  S25 → #914A27（spot-a）  = 主色
  S26 → #485270（blue）    = 主色
  成立于 prompts.dna.palette: 0 / 9
  成立于 data.js palette:     9 / 9      ← 这句话说的是另一条链
```

**根因**：这句话描述的是 `data.js` 的 `palette`（那一链确实 `palette[0] === bg`，9/9 成立），
但被写进了 `prompts.js` 的 banner。而 `prompts.js` 的 `dna.palette` 早就改成主色优先了
（`dna.palette[0] === primary` 在 30/35 案成立）。**同一个「palette[0]」在两条链上含义相反**，
banner 把 A 链的事实写在了 B 链的文件里。

**这是本轮审计中最值得修的一处**：它误导的对象正是「下一个人」——
读 `prompts.js` 想改配色逻辑的人会以为这 9 案的第一格是底色，从而把主色排到后面去。
建议把 banner 改成从数据现算，或至少把「9 案」改成「S32 S33 S34 S35」、
「7 色」改成「9 色」、「21/30」改成「31/35」（未实施）。

### §6.5 `check-distribution.mjs` 的表头也是 30

```
$ node prototypes/_build/check-distribution.mjs
  分布闸门：30 案的底色 / 彩度 / 内容量 / 结构标签      ← 表头
  …（下面全部按 35 案算：暖浅色带 18/35，地板统计含 S31–S35）
```

表头写 30，正文的每个数都是 35 口径（`warm-pale-share 18/35 = 51.4%`）。
**判：标签陈旧，计算正确。** 与 §6.1 同族。

### §6.6 `extract-specs.mjs` 末尾硬写「30/30」

```js
// extract-specs.mjs:160（末行）
console.log(`合计 ${...} 汉字，30/30 全部切出。`);
```

而它实际只切 30 个（`SOURCES` 不含 31–35，见 §5.2），所以「30/30」在这里
**碰巧是对的**，但它是写着 30 而不是算出来的 —— 一旦有人把 `07` 加进 `SOURCES`，
这句话会说「40/30 全部切出」。

---

## §7 其他不一致

### §7.1 S31 的散文色值陈旧（`data.js` `def` / `audit` vs 实际 CSS）

`_specs/S31.md` 字段 3 记录了 S31 改色的经过：原本底色 `#7A756C`（Lab 49.4）
在渲染实测里对比度不可能达标，**已降到 `#5F5B55`**，并注明「以本文件为准」。

实际页面确实用了新值：

```
$ grep -n -- '--paper:' prototypes/S31-quiet-mid-grey-rulesheet/style.css
22:  --paper: #5F5B55;
```

**但 `data.js` 的一句话定义与审查点仍写着旧值**：

```
data.js:2582  "def": "一张通体中性中灰（#7A756C）的价目页…
data.js:2588  "audit": "…全页只有一个底色 #7A756C…底色是 #7A756C 而非 #FFFFFF，
                        正文是 #1C1B19 而非 #000000"
```

而 `#1C1B19` 也已不是当前的正文色（`style.css:24  --ink: #F2F0EC`）。

我扫了全部 35 案的 `def`/`audit`/`tone`/`structure`，剔除注释后比对真实声明值：

```
def 里的 hex 不在真实声明里：
  S31 def 里的 #7A756C 不是任何声明值
小计 1 / 35
```

**只有 S31 一案，且是本轮之前就存在的**（`git log` 显示 `_specs/S31.md` 与
`style.css` 都在 `0df5a57` 一次提交，改色时只更新了 CSS 与规格字段 3，
没有回头改字段 1 的散文与 `collect-schemes` 抽出的 `audit`）。

**影响面**：`def` 在详情面板里作为「一句话视觉定义」直接渲染（`app.js:1442`），
用户看到的是旧色号。**提示词不受影响** —— `prompts.js` 里 S31 的 `dna.palette`
是 `#5F5B55`，全文检索 `7A756C` 为 false。所以这条只污染选型台的展示层，不污染交付物。

**判：散文陈旧，与数据链自洽性无关。** 建议改 `_specs/S31.md` 字段 1 与
`deliverables/75-q2/03-S31-STATUS.md` 之外的那两处（`def` 由 collect-schemes 从
`_specs` 字段 1 抽，改源头即可）。

### §7.2 新 5 案在 `sceneIndex` 里零条目（问题 #3）

`sceneIndex` 是 44 个行业词到案号的映射，是选型台**行业芯片**和**搜索索引**的数据源。
实测：

```
sceneIndex 里指向 S31–S35 的条目：(无)
直连可达案数:            10 / 35
直连或近似都不可达:       S10 S15 S21 S31 S32 S33 S34 S35
```

**S31–S35 全部不可达。** 不是「只缺直连」——连 `near` 里都没有。

更值得注意：`HUMAN` 表给这 5 案精心写的 15 个 `scenes` 标签（修表修鞋、花艺工作室、
写作课…）**没有一个**是 `sceneIndex` 的键：

```
15 个新标签里，作为 sceneIndex 键的：0 / 15
```

而 `app.js:1443` 只渲染 `r.scenes`（散文串），芯片来自 `sceneIndex`。
所以这 5 案的「适用场景」在 UI 上是**只能是纯文本**，用户无法通过芯片或搜索触达它们。
`check-scenes.mjs` 也印证了这点（INFO 级）：`S02 S10 S21 S33 S35` 的行业说法全在词表外。

**这不是本轮改 `build-prompts.mjs` 造成的**（`sceneIndex` 是另一张表，本轮没碰），
但它意味着「35 案」这个数字在**场景维度**上仍是 30 案的供给。

### §7.3 无其他不一致

除上述外，以下均已核验一致：
- `prompts.js` 与人写表 `HUMAN` + 实测 `minitems-parsed.json` 一致；
- `capacity.degrades`（13 案 yes）/ `hard`（4 案）与 README:164 的「warning 两轴」口径一致（并集 14）；
- 八道闸门（check-twolines/docs/prompts/stale/anchors/texture/contract/scenes）全绿；
- `check-prompts --selftest` 四个变异全部触发。

---

## 附：本轮操作的可复现清单

```bash
# 备份
cp prototypes/_selection/prompts.js /tmp/prompts-backup.js
cp prototypes/_selection/data.js    /tmp/data-backup.js
cp -r prototypes/_specs              /tmp/specs-backup

# A. 全链重生成
node prototypes/_prompts/build-prompts.mjs
git diff --stat prototypes/_selection/prompts.js        # → 空（一致）
node prototypes/_build/collect-schemes.mjs
git diff prototypes/_selection/data.js                  # → 35 行，全是 gate.at
cp /tmp/data-backup.js prototypes/_selection/data.js    # 复原，未提交
touch -d "2026-11-12 17:24:05" prototypes/_selection/prompts.js   # 复原 mtime

# E. _specs
node prototypes/_build/extract-specs.mjs
diff -rq /tmp/specs-backup prototypes/_specs             # → 无输出（一致）

# 最终状态
git status --short                                      # → 空（工作树干净）
```

**未提交任何东西。** 工作树与审计开始时内容一致
（`diff -q /tmp/prompts-backup.js prototypes/_selection/prompts.js` → identical，
`diff -q /tmp/data-backup.js prototypes/_selection/data.js` → identical，
`diff -rq /tmp/specs-backup prototypes/_specs` → 无差异）。

> 说明：审计开始时的 `git status` 快照里有
> `M deliverables/78-northstar/_probe/_staged/S15-sandbox.html` 与 `S29-sandbox.html`。
> 这两个文件实测被 `.gitignore:98`（`deliverables/78-northstar/_probe/_staged/`）忽略、
> 且未被跟踪（`git ls-files` 为空），本审计的所有命令都没有触及它们。
> 结束时 `git status` 干净，与那两条快照记录不可复现一致。
