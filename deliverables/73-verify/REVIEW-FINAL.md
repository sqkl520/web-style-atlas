# 终验报告（REVIEW-FINAL）

2026-10-31 · 终验 Agent · 开工 HEAD `0d3d499` · 核验对象：四项返工 + 补充项 `check-texture`

**本报告的每一条都是我自己跑出来的。** 我没有采信任何一份交付说明里的数字，
除非我在本机复现它。下文凡标「实测」的，都可按下文给出的命令重跑。

---

## 0. 先说结论

| 项 | 判定 | 一句话理由 |
|---|---|---|
| **P1a · 契约闸门** | **有条件通过** | 两处 fail-open 真修好了、C5 数字属实；但 **C4 的元语境判据是新的恒真式**（我构造的 9 条真欠款声称全部被放过），且 §7.4 引用没清干净 |
| **P1b · 陈旧度** | **通过（有保留）** | 三项改进都真实生效；`ab-stale` 3/4 与声称一致。但 **M2 失败的解释是错的**，且阈值只改了 1/3 |
| **P2 · fonts 改名** | **通过** | 兜底真删了、R8 是硬断言、30 案无一空串；数字除「中位 363」这个四舍五入外全部复现 |
| **P3 · 规格一致性** | **通过** | 撤回论证成立（我核了规格与 CSS 原文）；重写稿数字自洽；探针 `-7` 与 1800 越界都真修好了 |
| **补充项 · check-texture** | **不通过** | **它今天报「31 个 style.css 全部合规」是错的：S02 的 `body` 上挂着 `background-image: url("assets/card-grain.png")`。** 闸门的选择器正则只看到 34/85 条 body 规则 |

**是否可以提交：否。** 前置条件见 §4。

---

## 1. 逐项判定表（详细理由见 §2 的证据）

| # | 断言 | 交付方声称 | 我的实测 | 判定 |
|---|---|---|---|---|
| A1 | `ab-contract2.mjs` | 8/8 | **8/8** | ✓ 一致 |
| A2 | `ab-c4.mjs` | 4/4 | **4/4** | ✓ 一致 |
| A3 | `ab-failopen.mjs` | 4/4 | **4/4** | ✓ 一致 |
| A4 | `ab-r8.mjs` | 4/4 | **4/4** | ✓ 一致 |
| A5 | `ab-texture.mjs` | 6/6 | **6/6** | ✓ 数一致，但**结论不可信**（见 B14） |
| A6 | `ab-stale.mjs` | 3/4 | **3/4** | ✓ 数一致，但**解释错了**（见 B12） |
| B1 | `font-fallback`/`measure` 无 FAIL 分支 | 是 | **是**，C5 报 `2/5` | ✓ |
| B2 | C5 不是新的恒真式 | 声称稳 | **假阳性 + 假阴性都能造出来** | ✗ |
| B3 | §7.4 引用清干净 | 已改 | `_probe-cc.mjs` **仍在引用** | ✗ |
| B4 | C4 元语境判据不过宽 | 可判定结构特征 | **9/9 真欠款声称被放过** | ✗ 严重 |
| B5 | 移走 `rules.mjs` → 红 | exit 1 | **exit 1** | ✓ |
| B6 | `\|\| r.fonts` 兜底删了 | 已删 | **只剩注释** | ✓ |
| B7 | R8 会不会假阳性 | 不会 | 30 案都有非空 `fontsSpec`，规格 30/30 有该字段 | ✓ |
| B8 | R8 是硬断言还是 WARN | 硬 | **`add('FAIL', …)`** | ✓ |
| B9 | S08 撤回论证成立 | 成立 | **成立** | ✓ |
| B10 | 重写稿无残留错数字 | 已清 | 21/23 与 28/30 只在"我错了"的上下文里 | ✓ |
| B11 | 断点探针切片修好 | 已修 | **S13 不再报「缺 100」，29/30** | ✓ |
| B12 | M2 失败=提示词链独立触发 | 是 | **否，就是 30 案那节自己报的** | ✗ |
| B13 | 5 秒容差必要 | 必要 | 实测 0/30 需要容差；Δ 只有 **0.38s** | ~ 无害但论证失真 |
| B14 | texture 闸门范围 | 只禁 body/html | html 0 例；**但 body 漏检 1 例** | ✗ 严重 |
| B15 | T4 反向测试真跑过 | 6/6 含 T4 | **T4 通过** | ✓ |
| C | 7 个检查器全绿 | 全绿 | **全部 exit 0** | ✓ |
| D | 6 份文档数字一致 | 一致 | 3 处不符（见 D 节） | ✗ 局部 |

---

## 2. 证据

### A. 复跑变异测试

我按顺序逐个跑，**每跑完一个就做一次现场比对**。比对用的是我自己写的
`deliverables/73-verify/_review-snapshot.mjs`：它给 `prototypes/` 下全部
**2247 个文件**算内容 sha256 + mtime，跑前存快照、跑后逐项 diff。

为什么不能只用 `git status`：**git 保护内容，不保护 mtime**，而这一轮的
`check-stale` 判据完全建立在 mtime 上。用 `git checkout` 恢复内容后，
文件 mtime 会变成"现在"，`check-stale` 会立刻变红——这一点我在 §2-B12 里踩到并记录了。

| 套件 | 输出 | 与声称 |
|---|---|---|
| `ab-contract2.mjs` | `═══ 变异测试: 8/8 ═══`，恢复后 exit=0 | ✓ |
| `ab-c4.mjs` | `═══ C4 变异测试: 4/4 ═══`，恢复后 exit=0 | ✓ |
| `ab-failopen.mjs` | `═══ fail-open 修复验证: 4/4 ═══`，恢复后 exit=0 | ✓ |
| `ab-r8.mjs` | `═══ R8 变异测试: 4/4 ═══`，恢复后 R8=30/30 | ✓ |
| `ab-texture.mjs` | `═══ check-texture 变异测试: 6/6 ═══`，恢复后 exit=0 | ✓ |
| `ab-stale.mjs` | `═══ check-stale 变异测试: 3/4 ═══`，**M2 ✗** | ✓ |

每次 diff 结果都是 **`内容变化 0`**。这六套测试的 `restore()` 在**内容**上都是
幂等可靠的——这一点值得记一笔，因为 `ab-contract2.mjs` 的注释里说 v1 曾经
留下过一条 `shadow` FAIL 残留。v2 修对了。

**关于 mtime 的一个真问题（我自己踩到的）**：

`ab-texture.mjs` 与 `ab-failopen.mjs` 都会**重写**被变异文件的完整内容。
内容还原了，但 `writeFileSync` 会把 mtime 刷成"现在"。后果：

- `ab-texture.mjs` 跑完，`S01/style.css` 的 mtime 变新 → `check-stale` 立刻报
  `S01 style.css 落后 8 分钟`，**并且**连带触发 `提示词链·dna-raw 落后 7 分钟`。
- 于是紧接着跑 `ab-stale.mjs` 时，它的**基线**（要求 `check-stale` exit 0）就不绿了，
  直接打印「⚠ 基线不绿，终止」，**四个变异一个都没跑**。

这不是交付方的错，也不是我的错——是这套变异测试的固有副作用。但它是
**可复现的坑**：任何人按题面顺序 `A` 一条条跑下来，`ab-stale` 都会因基线不绿而空跑，
从而误以为"它没通过"。我用快照把 2247 个文件的 mtime 整体还原之后重跑，
`ab-stale` 才给出真实的 3/4。

> 证据：`node deliverables/73-verify/_review-snapshot.mjs restore` →
> `mtime 已按快照还原：2247 个文件`；随后 `check-stale` → `✓ 全部新鲜`。

### B1. `font-fallback` / `measure` 确实没有 FAIL 分支

`tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs`:

```
103:  if (m.type.notLoaded.length) add('WARN', 'font-fallback', …)
119:  if (m.type.measureChars && … > 88 && !mobile) add('WARN', 'measure', …)
```

两条都是 `add('WARN', …)`，**没有任何 `add('FAIL', 'font-fallback'…` 或
`add('FAIL', 'measure'…`**。C5 的结论正确。

`check-contract.mjs` 实际输出：

```
~ [C5-allow-rule-cannot-fail] 1 条
    _CONTRACT.md §9.15  2/5 条登记规则在规则引擎里**没有 FAIL 分支**（只有 WARN），
    永远不可能出现在 C1 的输入里: font-fallback, measure。
    … C1 的有效判定面因此只有 3/5 条。
```

**报的是「2/5」**，与交付方声称一致。推导也对：允许表 5 条 − 2 条不可能 FAIL = 3/5。
而 3 条里 `mono` 在 30 案触发 0 次（C3 也这么报），所以 C1 今天真正在判的
只有 S08 的 2 条 —— 这就是 `C1 FAIL 全在允许表内 2/2` 的来历。

### B2. C5 是一个**新的、可被证伪的**判据——两个方向都能打穿

这是本轮最需要独立判断的一条。C5 的判据是**读源码文本**：

```js
const re = new RegExp(`add\\(\\s*['"]FAIL['"]\\s*,\\s*['"]${rule}['"]`);
canProduceFail.set(rule, re.test(engineSrc));
```

我先确认了「规则名是否都是字面量」这个前提：`rules.mjs` 里共 **21 处 `add('FAIL'`**，
**全部**写作 `add('FAIL', '<字面量>', …)`。唯一不是纯字面量的是第 73 行：

```js
if (s.hairlines) add(s.hairlines >= 2 ? 'FAIL' : 'WARN', 'hairline', …)
```

它的 level 是三元式，但规则名 `'hairline'` 仍是字面量，且**它确实能产生 FAIL**。
所以"规则名用变量拼"这种漏判**在当前源码里不存在**。

但「当前不存在」不等于「判据稳」。我用 `_review-b2-c5.mjs` 做了两个实验：

**E1（假阳性，零成本）**：把 `hairline` 加进 §9.15 允许表。它明明能 FAIL
（`s.hairlines >= 2` 时），但 C5 的正则只认 `add('FAIL',` 字面，
而源码写的是 `add(s.hairlines >= 2 ? 'FAIL' : 'WARN', 'hairline'`。

```
═══ E1：把 hairline 加进允许表 ═══
  ⇒ C5 把 hairline 算进"不可能 FAIL"了吗？ 是（这就是假阳性）
  ⇒ 允许表规模变成 6 条
```

**E2（假阴性，只需一次无害重构）**：把 `mono` 的规则名换成一个变量
——`const MONO_ID = 'mono'; add('FAIL', MONO_ID, …)`。判定逻辑一字未动：

```
═══ E2：mono 的规则名改成一个变量（行为完全不变） ═══
  ⇒ C5 现在说 3/5 条不能 FAIL（基线是 2/5）
  ⇒ mono 被点名了吗？ 是（重构让它冤枉了 mono）
```

**判定：C5 不是恒真式（它会真的走到两种结果），但它是"读写法"而不是"读行为"，
所以它既会冤枉能 FAIL 的规则，也会被一次无害重构骗过去。**
它今天给出的 `2/5` 恰好是**对的**（我按 B1 独立确认过），所以我不判它不通过；
但它是本轮新增的一处**脆弱判据**，写在注释里的"这比继续往词表里堆词更稳"这句话，是不成立的。

### B3. §7.4 引用**没有**清干净

全仓库 `7.4` 命中 35 处，绝大多数是 CSS 数值（`7.4vw`、`7.4s`、`17.4s`、
`417.4px`）和坐标数据，与章节号无关。真正的章节引用只有 4 处：

| 位置 | 内容 | 判定 |
|---|---|---|
| `prototypes/_CONTRACT.md:201` | 「…但**契约里没有 §7.4**——396 行里 `7.4` 只出现 2 次…已改为不引章节号」 | ✓ 是"说明它不存在" |
| `prototypes/_build/check-contract.mjs:19-20` | 「`§7.4` 在契约里**没有定义章节**…所以本文件不引 §7.4」 | ✓ 是"说明它不存在" |
| **`prototypes/_build/_probe-cc.mjs:17`** | **「按本仓库 §7.4 自己的定义，那是 bug（引用跳空）」** | ✗ **仍在把 §7.4 当依据引用** |
| **`prototypes/_build/_probe-cc.mjs:252`** | **「引用跳空（§7.4）：文档在替一个已经不存在的缺陷要豁免」** | ✗ **同上** |

`_probe-cc.mjs` 显然是被 `check-contract.mjs` 取代的前身（未跟踪文件）。
交付方把新文件里的引用改了，**没有回头改那个被取代的旧文件**。

严重度：低（它是死文件，不参与任何闸门），但它恰好是本轮教训的同一个病——
**"我改了引用"这个声称，在仓库层面并不成立**。要么删掉 `_probe-cc.mjs`，要么把那两处改掉。

另：`_CONTRACT.md` 现在 **397 行**（交付方与 `check-contract.mjs:19` 的注释都写
"396 行"）。`7.4` 现在出现 **4 次**（注释里写"只出现 2 次"）。两个数字都因本轮编辑而漂移了。
这是小的自指错误，但既然这个闸门的整个立论就是"引用跳空"，它自己不该留错数。

### B4. C4 的元语境判据**过宽到失效**（本轮最严重的软件缺陷）

C4 的放过条件（`check-contract.mjs:333`）：

```js
const isMeta = /为什么需要|检查器|断言|闸门|抓到|实测\s*0\s*条|这条断言|C[1-5][\-\s]|check-contract|check-twolines/.test(win);
if (!isClaimOpen || isRetracted || isMeta) continue;
```

窗口是 `text.slice(m.index - 150, m.index + 260)`，即**案号两侧共 410 字符**。
也就是说：只要"欠款声称"的**前后 410 字符内**出现上述任何一个词，C4 就不报。

我写了 `_review-b4-meta.mjs`，构造 **9 条真的在声称欠款**的句子
（都是 `S13` 的 17 处 `shadow`，实测该案 `shadow` = 0，属真·假声称），
每条只嵌一个元语境词：

```
✗ 放过  A 含「为什么需要」（真在要豁免）
✗ 放过  B 含「检查器」
✗ 放过  C 含「断言」
✗ 放过  D 含「闸门」
✗ 放过  E 含「抓到」
✗ 放过  F 含「实测 0 条」（说别的规则）
✗ 放过  G 含「这条断言」
✗ 放过  H 含「C4」字样
✗ 放过  I 含「check-contract」

═══ C4 元语境过宽测试: 抓到 0/9 ═══
```

**0/9。** 为了排除"是我的句子结构没被正则命中"，我做了对照组
（`_review-b4-control.mjs`）：**同一句、同一位置、只差最后半句**

```
✓ 抓到  C0 对照：句子无元词
     句子：**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。这件事从 10-24 留到今天。
✗ 放过  C1 处理组：句子含「检查器」
     句子：**现行欠款**：`S13` 的 17 处 `shadow` 属真未修。人工检查器看不出来，只有栅格化能看。
```

只加"人工检查器"五个字，同一句真欠款就从"抓到"变成"放过"。

**为什么这比原来的假阳性更糟**：前一版的问题是 C4 把"介绍工具的文字"读成欠款（假阳性，
方向是"多报"）。这一版的修法是加一个**宽到覆盖大半个窗口的词表豁免**，方向翻成"漏报"。
而欠款声称的典型写法——"闸门查不出这个，所以留到今天"、"上一轮抓到的是别的"——
**天然会带这些词**。也就是说，最像人话的欠款声称，恰好最容易被放过。

`ab-c4.mjs` 4/4 全过，是因为它的四个变异**都没有嵌元语境词**。
测试没有覆盖这条新判据的反面，所以它没能自己发现这个问题。

### B5. `fail-open` 真修好了

我自己动手，不依赖 `ab-failopen.mjs`：

```
Move-Item rules.mjs rules.mjs.moved
node prototypes/_build/check-contract.mjs   →  exit 1
  C2 允许表的规则引擎里都存在  ?  （引擎不可读）
  ✗ [C2-engine-missing] 读不到规则引擎源码（…）—— C2/C5 无法判定。
    「无法判定」不等于「成立」…
  合计 FAIL 1 / WARN 1 / INFO 2
```

**exit 1**，与声称一致。还原后 sha256 前 16 位回到 `71435CDAC327B71F`，
`check-contract` 回到 exit 0。

### B6. `|| r.fonts` 兜底确实删了

`grep` `app.js` 里 `.fonts`（非 `.fontsSpec`）只剩 **3 处，全部在注释里**：

```
L235: /* 2026-10-31：`r.fonts` → `r.fontsSpec`。…
L237:  * 与 prompts.js 里的 `dna.fonts` 对象同名不同形状。…
L239:  * ⚠️ 曾写成 `r.fontsSpec || r.fonts` 兜底，已删（2026-10-31 锐评验收后）。
```

实际读值处（L245 `var hay = [… r.fontsSpec …]`、L1363 `field('字体策略', r.fontsSpec)`）
都是裸读，**没有兜底**。`verify-p2-fonts.mjs` 也独立报告 `含 fonts 回退: false`。

顺带纠正一个交付说明里的小错：`LEAD-P2-fonts-rename.md:96` 写
「`app.js` 里还有裸 `r.fonts` 吗 → **3 处命中**」。我今天实测**也**是 3 处
（`L235/237/239`），但其中 `L237` 指的是 `dna.fonts`（另一条链的对象），
不是"回退"。所以"3 处全部是回退或注释"这个措辞略微不准——是 2 处注释 + 1 处他链引用。

### B7 / B8. R8 既不会假阳性，也是硬断言

**B8 先答**：`check-twolines.mjs:178-183` 是

```js
const fs = sc.fontsSpec;
if (typeof fs !== 'string' || !fs.trim()) {
  add('FAIL', id, 'R8-fontsSpec-missing', …);
} else stats.r8Ok++;
```

**`add('FAIL', …)`**，硬断言，会让 `check-twolines` exit 1。不是 WARN。

**B7 会不会假阳性**——分两层查：

1. **规格里是否真的有案没写字体会**：我扫了 30 份 `_specs/S*.md`，
   **30/30 都含「字体策略」字样**，没有"没有字体策略字段"的案。
   `collect-schemes.mjs:191` 的 `FIELDS` 也把它列为必抽字段。
2. **`data.js` 里是否有空串**：30 案 `fontsSpec` 长度 min **228**、max **514**，
   **空串 0 个**。最短的 S05 也有 228 字。

所以 R8 今天 **30/30 全绿是真实的**，不是恒真式——`ab-r8.mjs` 的 M1/M2/M3 证明它
在键缺失/空串时确实会红（M1 → R8 0/30，M2/M3 → 29/30）。

**残余风险（诚实记录，不是缺陷）**：`collect-schemes.mjs:365` 是
`fontsSpec: … ? … : ''`。若将来某份规格真的没写「字体策略」，R8 会报 FAIL，
而那不是"改名没做完"而是"规格缺字段"。判据会把两种情况混为一谈。
当前 30 案不触发，可接受；但错误信息 `"生成器改名没做完，或 collect-schemes.mjs 的赋值行被删"`
在这种情况下会指错方向——正是 P3 文档自己说的"归因错比结论错更危险"。

### B9. S08 的撤回论证**成立**——我自己核了原文

**规格确实只有三档。** `prototypes/_specs/S08.md:25`（字段 5）原文逐字：

```
≥1440px 六块板全显并保留右侧 220px 的工艺参数栏；
1024–1439px 折为四块板、层间距压到 16px、参数栏并入底部；
<768px 等距轴转为垂直堆叠；
```

三档，没有 `768–1023`。撤回文件引用无误。

**1023 块实现的就是堆叠。** `prototypes/S08-amber-overprint-lightbox/style.css:277-291`：

```css
@media (max-width: 1023px) {
  .two-col { grid-template-columns: minmax(0, 1fr); }
  .iso-stage { height: auto; perspective: none; }
  .iso-plane { position: static; }
  .plate { position: static; width: auto; height: 54px; … transform: none; animation: none; }
  .plate-wall { transform: none; }
  …
}
```

`perspective: none` + `transform: none` + `position: static` 三件套，
把等距透视、位移变换、绝对定位全部取消，`.plate` 高度固定 54px 回文档流。
**这就是垂直堆叠**，撤回文件说得对。

**方向也对**：规格要求 `<768` 堆叠，CSS 在 `≤1023` 就堆叠 → **超集，不是遗漏**。
原报告"641–767 仍是等距横向布局"是把 1023 块的内容整个说反了。

补充一条我自己的观察：`style.css:267` 还有一个 `@media (max-width: 640px)`，
它做的是 `.states { display: block }`、`.spec-grid` 单列等**排版细节**，
不是堆叠的起点。撤回文件 §5 的判断也正确。

### B10. 重写稿的数字自洽

`LEAD-P3-spec-conformance.md` 里 21/23、28/30、29/30 三个数的关系：

- `:95` 「初版报的『21/23』和重写稿一度写的『28/30』都不对」——**在承认错误**
- `:106-108` 表格：分母 23→30→**30**，全覆盖 21→28→**29**，有缺 2→2→**1（仅 S08）**
- `:93` 标题、`:102` 正文、`:167` 汇总表：都是 **29/30**

三处一致，且 29 + 1 = 30 自洽。我实跑探针得到 **29/30、1 案有缺（仅 S08）**，吻合。

`:169`「随机整数 69% 放行」与交付方声称的 68.8% 一致（四舍五入）。
`:87` 手工核的三个面积和（S02 58+18+20+4、S13 56+27+9+8、S26 44+30+14+12）——
我逐个加过，都 = 100。

**但 `:51-55` 那段"锐评修正"引用块里的数字没有来源**：
「字号 8 条其实全在字段 4」「栏数 118 偏高（字段 5 内仅 83 条，其中 27 条是序数）」
「另有 59 条被漏统计（栏沟 13 / 外距 17 / 行高 12 / 正文字号 10 / 栏宽 5 / 副字号 2）」。
这些是**引用锐评 Agent 的话**，不是交付方自己测的，也没有复算脚本。
`13+17+12+10+5+2 = 59` 内部自洽，所以我按"转述"接受，但它不构成本轮的实测证据。

### B11. 断点探针的 `-7` 与 1800 越界都真修好了

`LEAD-p3-breakpoints2.mjs` 现在的 `field5()`：

```js
const m = rest.slice(5).search(/\n\s*\*{0,2}6[\.．]?\s/);
const end = m >= 0 ? Math.min(m + 5, 1800) : 1800;
```

切到下一个字段标记（`6.`）为止，而不是固定 1800。分母用 `specHas` 实际计数。

实跑：

```
S13  [1024,1439,1440]     [640,641,1023,1024,1439,1440]     OK
…
=== 汇总: 29/30 全覆盖，1 案有缺 ===

S08
  规格区间: <768  |  1024-1439  |  >=1440
  CSS 断点: 640, 1023, 1024, 1439
  缺失的阈值: 768
  注意: 数字缺失 != 行为缺陷。必须打开对应 @media 块看它改了什么，
        一个更宽的断点可能已经用超集覆盖了较窄的要求（S08 即此情况）。
```

**S13 不再被报「缺 100」**，`-7` 硬编码已消失（分母 30），且探针现在主动打印
"数字缺失 ≠ 行为缺陷"的免责标注。三条都到位。

一个观察：探针把 S08 的规格区间正确解析成 `<768 | 1024-1439 | >=1440`，
与我 B9 手工读的一致——说明字段切片的语义也是对的，不只是数字对。

### B12. M2 的失败解释**是错的**（交付方归因错）

交付方在 `LEAD-P1b-stale-guard.md:132-136` 写：

> **M2 的说明（诚实记录）**：M2 报 exit 1，因为把 css 调新 2 分钟同时触发了
> **提示词链**的守卫（`dna-raw.json` 那条，阈值仍是 `> 1` 分钟…）。

我按题面复现了 M2：把 `S12/style.css` 的 mtime 设成 `report.json.mtime + 120s`。

```
闸门陈旧度：检查 30 案 + 1 个产品入口
  ⚠️ 1 项陈旧：
     S12  style.css 落后 11969 分钟  →  node prototypes/_build/render-scheme.mjs S12-lime-knockout-wall
```

**只有一条，是 30 案那一节（`S12`），根本没有提示词链那一条。**
我再打开 `DEBUG_STALE_CHAIN=1` 看数据链四环的真实数值：

```
[chain] 规格链·_specs    gapMin=-2019.28
[chain] 提示词链·dna-raw gapMin=-1.96   which=S01-red-wedge-broadsheet/style.css
[chain] 提示词链·dna-clean gapMin=-0.02
[chain] 提示词链·prompts.js gapMin=-0.00
```

四环**全是负数**（产物比输入新 = 新鲜），**没有一环触发**。

**真正的根因**：`check-stale.mjs:69` 是 `gapMin = (newest - at) / 60000`，
比的是**源文件 mtime vs report.json 里的 `at` 字段**，不是 vs `report.json` 的 mtime。
而 M2 的构造写的是：

```js
const repM = statSync(REP).mtimeMs;
utimesSync(CSS, new Date(repM + 120000), new Date(repM + 120000));
```

它拿 `report.mtime` 当基准。S12 的 `at = 2026-10-22T11:32:12.307Z`，
而 `report.mtime = 2026-10-30T18:59:22.915Z`，两者相差 **11967 分钟**。
所以"report.mtime + 2 分钟"这个时间戳仍然比 `at` 新了约 11969 分钟 → 必然判陈旧。

**判定实验**（`_review-b12` 手工 A/B）：

| 构造 | css 的 mtime | check-stale |
|---|---|---|
| **A：以 `at` 为基准**（at + 120s） | `2026-10-22T11:34:12Z` | **✓ 全部新鲜，exit 0** |
| **B：以 `report.mtime` 为基准**（ab-stale 的写法） | `2026-10-30T19:01:22Z` | ⚠ S12 落后 11969 分钟，exit 1 |

**A 通过、B 失败。** 所以：
- 3 分钟阈值**是有效的**（A 证明：比 `at` 新 2 分钟不报）
- M2 失败**纯粹是测试构造写错了基准**，与提示词链、与阈值都无关
- 交付方"提示词链独立触发"的解释是**归因错误**，而且 `LEAD-P1b-stale-guard.md`
  把一个"测试写错了"包装成了"测试设计的已知局限，不是缺陷"

这恰好是 P3 撤回文件里那句教训的复发：**归因错比结论错更危险，它会让人去修错地方。**
若按这个归因去"修"，会去动提示词链的阈值——那是错的地方。

### B13. 5 秒容差：无害，但论证的实测数字不对

`LEAD-P1b-stale-guard.md:99-100` 与 `check-stale.mjs:101-103` 都说：

> S14 的 `tablet-page-02.jpg` 只比 report 新 **1 秒**

实测（S14 全部 10 张 jpg vs `report.json` mtime）：

```
report.json  2026-10-28T15:13:06.683Z
tablet-page-02.jpg          Δ= +0.4s
tablet-fold.jpg             Δ= +0.2s
tablet-page-01.jpg          Δ= +0.2s
mobile-page-02.jpg          Δ= -34.0s   ← 比 report 旧 34 秒
（其余 −0.4s ~ 0.0s）
```

**是 0.4 秒，不是 1 秒。** 而且全 30 案扫描：

| 判据 | 触发数 |
|---|---|
| `jpg.mtime > at` | **30/30** ← 交付方说 30/30，✓ |
| `jpg.mtime > report.mtime` | **1/30** ← 交付方说 1/30，✓ |
| `> report.mtime + 5s` 容差 | **0/30** |

最大 Δ 全库是 **S14 +0.38s**。所以：

- **5 秒容差今天不改变任何判定**（1/30 与 0/30 的差别，唯一那 1 例是 S14 的 +0.38s，
  它本来就是"正常渲染末尾写入顺序差"，容差把它正确地放过了）
- 容差**方向正确、量级安全**（0.38s ≪ 5s ≪ 真陈旧量级）
- 但"只新 1 秒"这个**实测数字是错的**（实际 0.38–0.4 秒），
  `check-stale.mjs` 的注释里也照抄了这个错数

结论：**判据可用，论证的实测值需要更正。** 这不是掩盖问题——0.4s 和 1s 都不构成缺陷，
但一个以"实测"为立论的仓库，注释里的实测值不该错 2.5 倍。

### B14. `check-texture` **不通过**：它漏掉了 S02 一个真实的 `body` 纹理

这是本轮我发现的**唯一一个"结论本身是错的"**的问题。

**先说结论**：`S02-gilded-symmetry-salon/style.css:1198` 附近

```css
html { background: var(--card); }

body {
  margin: 0;
  background-color: var(--card);
  /* 炭黑卡纸的纤维：程序化生成的 128px 平铺位图，不是渐变 */
  background-image: url("assets/card-grain.png");
  background-repeat: repeat;
  color: var(--ivory);
  …
}
```

`body` 上挂着 `background-image: url("assets/card-grain.png")`，全文件
`card-grain` 只出现 **1 次**，就在 `body` 上，**没有**挪到 `::before`。
而 `check-texture` 报 **`违规 0`、`合计 FAIL 0 / WARN 0`、exit 0**。

**为什么漏掉**——根因是选择器正则：

```js
const re = /(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g;   // check-texture.mjs:53
```

它要求选择器紧跟**行首 `^`** 或 **`}`**。但 `}` 会被**前一次匹配吃掉**，
所以下一条规则前面不再有可用锚点。最小复现（`_probe-minimal.mjs` 用例 1）：

```
CSS:  html { background: red; }
      body { background-image: url(x.png); }
      h1 { color: blue; }

正则看到:  lead=""  sel="html"
           lead="}" sel="h1"        ← body 整条消失
```

**相邻规则只看到隔一条。** body 是否被看到，取决于它排在奇数位还是偶数位，
与它有没有挂图无关。

**在 31 个真实文件上的量化**（`_review-b14-underscan.mjs`）：

```
合计：闸门看到 34 条，实际 85 条，漏检 51 条
（30 案里 29 个都有漏检；S22/S23 漏 3 条，S24 漏 4 条；S17 闸门看到 0 条，实际 1 条）
```

注意 `body/html 规则数 34` 这个输出：闸门自己把它当成"证据"打印出来，
**而这个数字本身就已经说明它只看到 34/85**。

**注入复现**（在 S24 真实的顶层 body 规则里加 background-image）：

```
注入后 check-texture: exit=0
  已检查 style.css        31
  body/html 规则数        34
  违规                     0
  合计 FAIL 0 / WARN 0
⇒ 闸门漏检：一个真实的顶层 body 挂了 background-image，闸门仍报全绿
```

**为什么 `ab-texture.mjs` 6/6 没抓到它**：它的 6 个变异**全部**是
`orig + '\n' + 变异块` —— 即**追加到文件末尾**。我验证了末尾追加在 S01/S02/S24 上
都能被抓到，因为末尾那一块前面恰好有一个未被消耗的 `}`。
所以 6/6 证明的是"末尾追加的违规能抓到"，**不能**证明"任一行上的违规能抓到"。
测试形态单一（只用一种位置），是这个缺陷没能被自己的测试抓住的原因。

**后果有多严重**：`_CONTRACT.md:150` 写得非常明确——

> 纹理挂 `body` 会有两个后果——① 所有对比度问题**静默通过**；
> ② `filled`／空屏判定被刷成假的满分，`empty-screens` 规则失去意义。

`probe.mjs:254-261` 的 `bgBehind()` 从元素往祖先走，`body` 在祖先链上：

```js
if (cs.backgroundImage !== 'none' || …) return null;
```

返回 null 后，`probe.mjs:282` 的 `const bg = bgBehind(t.el); if (!bg) continue;`
**整条跳过**。所以 S02 的 `lowContrast: 0`（我在 report 里确认三档视口都是 0）
**不能作为"对比度没问题"的证据**。

我没有把"所以 S02 一定有对比度缺陷"写死——那需要重渲染才能确证，而重渲染会
动到交付方待提交的产物。我做的替代验证是算 S02 自己声明的调色板
（`_review-s02-contrast.mjs`）：`--ink #111111` on `--card #0B0B0F` = **1.04:1**，
on `--band #14100A` = **1.00:1**，`--gold` on `--dirty` = **4.07:1**（低于正文门槛）。
`--ink` 按 CSS 注释是"暗金填充上的文字"（配 `--gold` 底），
所以它未必真的被用在 `--card` 上——**这条线索不足以定罪，但足以说明
"contrast 在这个案上失明了"，而这正是 §9.2 警告的那个后果。**

**判定：check-texture 不通过。** 不是"范围过宽"（那是 B14 原本的问题），
而是**范围严重不足**：它声称验证了"所有 body 规则"，实际只验证了 34/85。

### B15. T4 反向测试确实跑过且通过

```
✓  T4 body::before 挂图（契约推荐做法）→ 必须绿   （exit=0）
```

`ab-texture.mjs:51-52` 的 T4 变异块确实是 `body::before { … background-image: url(…) }`，
断言 `expectRed=false`。它通过。这条反向测试是有效的——
它保证了闸门不会诱导人删掉正确的伪元素纹理。

（顺带：这也解释了为什么 S02 没被"误判为合规"这件事更讽刺——
闸门连"body 上真有图"都没看到，而它对 `body::before` 的判断倒是正确的。）

### C. 全链 7 个检查器

| 检查器 | 结果 | exit |
|---|---|---|
| `check-prompts.mjs` | `合计 FAIL 0 / WARN 0`（1 条 INFO：S25 配色段外 1 个 hex） | 0 |
| `check-twolines.mjs` | `R1 30/30`、`R6 30/30`、`R7 30/30`、**`R8 30/30`**、R5 33/53 INFO | 0 |
| `check-contract.mjs` | `C1 2/2`、`C2 5/5`、`C3 3 条`；`合计 FAIL 0 / WARN 1 / INFO 2` | 0 |
| `check-texture.mjs` | `违规 0`、`合计 FAIL 0 / WARN 0` | 0 |
| `check-docs.mjs` | `README.md: 0 FAIL / 0 WARN / 13 PASS` | 0 |
| `check-stale.mjs` | `✓ 全部新鲜` | 0 |
| `check-anchors.mjs` | `✓ 无死锚点`（1 处动态拼接需人工确认，不算死锚点） | 0 |

**7/7 exit 0。** 这个"全绿"是真的，但它现在有一个已知的洞：
`check-texture` 的绿是假的（B14），而 `check-contract` 的输入
（那些 `report.json`）正依赖 `check-texture` 守住的那个不变量。
**所以"7 个全绿"这句话的证明力，比它看起来要弱。**

### D. 交付说明的一致性核对

| 文档 | 核对结果 |
|---|---|
| `LEAD-P1a-contract-gate.md` | **3 处不符**（见下） |
| `LEAD-P2-fonts-rename.md` | **2 处小错**（见下） |
| `LEAD-P3-spec-conformance.md` | ✓ 自洽（59 条引用块无复算，标记为转述） |
| `LEAD-P1b-stale-guard.md` | **1 处归因错 + 1 处实测数字错**（B12/B13） |
| `LEAD-check-texture.md` | **结论错**（B14：30 案并非全部合规） |
| `LEAD-RETRACTION-s08.md` | ✓ 论证成立（B9） |

**P1a 的三处不符**：

1. **§2.2「当前结果」贴了 3 行程序根本没打印的输出。** 它展示 6 行：

   ```
   C4 文档声称 vs 实测          0 处矛盾
   C5 登记规则的 FAIL 分支      3/5 条可能产生 FAIL
   C6 未解析的规则行            0 行
   ```

   我逐行核对程序的真实 stdout：**C1/C2/C3 三行打印了，C4/C5/C6 三行没有**。
   `check-contract.mjs:359-372` 只 `console.log` 了 C1/C2/C3。
   把不存在的输出块贴进交付说明，是"文档替一个不存在的输出要可信度"——
   和这个闸门要治的"引用跳空"是同一个形状。

2. **`:81` 说「我在闸门第 17 行写『按本仓库 §7.4 自己的定义…』」。**
   实际 `check-contract.mjs` 第 17 行现在是
   `// 那是「引用跳空」：文档替一个已经不存在的缺陷要豁免。`
   ——改完之后行号漂移了，文档没跟着改。小事，但整份文档的立论就是"引到文件行号"。

3. **`:19-20` 与 `_CONTRACT.md` 都写「396 行里 `7.4` 只出现 2 次」。**
   实测 `_CONTRACT.md` 现在 **397 行**、`7.4` 出现 **4 次**。
   这个错数还被 `check-contract.mjs:19` 的注释复述了一遍。

**P2 的两处小错**：

1. **`:13` 与 `app.js:236` 都说「中位 363」。** 实测 30 案的算术中位数是
   **360.5**（`sorted[14..16] = 358, 363, 371`）。**363 是上中位数**
   （`sorted[15]`），不是中位数。array 有 30 项（偶数），中位应取 15/16 项均值。
2. **`:96` 说 `app.js` 里裸 `r.fonts` 「3 处命中，全部是回退或注释」。**
   实际 3 处是 **2 处注释 + 1 处 `dna.fonts`（另一条链的对象）**，没有"回退"。
   措辞不准，结论（无裸读）正确。

**P2 值得表扬的一处**：改动面拆成了两张表（3 个改名 + 6 个重渲染产物），
并且**逐条给了行号**。我核了行号，有两处是**差 1 行**的（`collect-schemes.mjs`
实际在 `:365`/`:733`，文档写 `:364`/`:732`；`app.js` 实际 `:245`/`:1363`，
文档写 `:239`/`:1357`）。差 1 行在插入了注释行之后是可预期的，不重复计为问题。

---

## 3. 仍存在的问题（按严重度）

### 严重（会让"全绿"这句话失真）

**S1 · `check-texture.mjs` 漏检 51/85 条 body 规则，S02 的真实违规被报成合规**
`prototypes/_build/check-texture.mjs:53`（选择器正则）
+ `prototypes/S02-gilded-symmetry-salon/style.css`（body 上的 `card-grain` 纹理）
表现：闸门 exit 0、`违规 0`，而 S02 的 `body` 确实挂着 `background-image`。
连带：S02 的 `lowContrast: 0` 不能作为对比度证据（`probe.mjs:282` 整条跳过）。
这直接违反 `_CONTRACT.md:148-150`（§9.2）与 `:203-204`（§9.16）。

**S2 · C4 的元语境判据过宽，真欠款声称 9/9 被放过**
`prototypes/_build/check-contract.mjs:333`（`isMeta` 正则）。
`ab-c4.mjs` 4/4 全过，但它没测"嵌了元语境词的真欠款"，所以没能自己发现。
对照实验证明：同一句只加"人工检查器"五个字即从"抓到"翻成"放过"。

### 中等（判据脆弱或论证失真）

**M1 · C5 读"写法"不读"行为"，两个方向都能打穿**
`prototypes/_build/check-contract.mjs:229`。`hairline` 这类
`add(cond ? 'FAIL' : 'WARN', '<name>'` 会被误判为"不能 FAIL"；
把规则名换成变量则会被反向误判。今天的 `2/5` 恰好正确，但判据不设防。

**M2 · `ab-stale.mjs` 的 M2 用例基准写错，且归因写进了交付说明**
`deliverables/73-verify/ab-stale.mjs:58-59`（用 `report.mtime` 当基准，
应类比 `at`）+ `deliverables/73-exec/LEAD-P1b-stale-guard.md:132-136`（错误归因）。
`DEBUG_STALE_CHAIN=1` 证明四环 gapMin 全为负，提示词链没有触发。

**M3 · `check-stale` 的阈值只改了 1/3 处**
`prototypes/_build/check-stale.mjs:78`（30 案：`> 3`）
vs `:134`（产品入口：`> 1`）vs `:219`（提示词链：`> 1`）。
交付说明只声称改了 30 案那节，所以**不算说谎**，但"阈值 1→3"这个表述
会让读者以为全局统一了。三节判据不一致本身就是下一轮的隐患。

**M4 · `LEAD-P1a-contract-gate.md:101-111` 贴了程序没打印的 3 行输出**
即 C4/C5/C6 三行。属于"文档比程序更乐观"。

### 轻微（数字/行号，不影响结论）

**L1 · §7.4 引用清得不干净**：`prototypes/_build/_probe-cc.mjs:17` 与 `:252`
仍在把 §7.4 当依据引用（该文件已被 `check-contract.mjs` 取代，未跟踪）。

**L2 · 自指数字漂移**：`_CONTRACT.md` 现在 397 行、`7.4` 出现 4 次，
而 `_CONTRACT.md:201` 与 `check-contract.mjs:19` 都还写"396 行、2 次"。

**L3 · `LEAD-P1a-contract-gate.md:81` 的行号已失效**（第 17 行不再是那句）。

**L4 · 「中位 363」应为 360.5**（`LEAD-P2-fonts-rename.md:13`、`app.js:236`）。

**L5 · 「只新 1 秒」应为 0.4 秒**（`LEAD-P1b-stale-guard.md:99`、`check-stale.mjs:101`）。

**L6 · `LEAD-P2-fonts-rename.md:96` 的「3 处全部是回退或注释」措辞不准**
（其中 1 处是 `dna.fonts` 他链引用）。

---

## 4. 是否可以提交

### **否。**

理由不是"改动很多"或"还有小错"，而是 **S1**：`check-texture` 是本轮唯一一个
"新增能力"的交付项，它的**核心结论是错的**——它声称"31 个 style.css 全部合规"，
而 S02 有一个真实的 `body` 纹理。这条恰好是交付方自己在
`LEAD-check-texture.md:19-24` 里判定为"最高优先级、一破全假"的那一条：

> ⇒ **本仓库其余所有闸门的绿都变成假的**
> ⇒ **包括 `check-contract.mjs` 自己的输入**（那些 `report.json`）

既然这个判据本身漏检了一半以上的 body 规则，那么"其余闸门全绿"这句话
就失去了它赖以成立的前提。

### 提交前必须做的（最小集合）

1. **修 `check-texture.mjs` 的选择器解析**。不要用
   `/(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g`，改成一次遍历式的花括号状态机
   （我在 `_review-b14-truth.mjs` 里写了一个可用的：逐字符扫描，遇 `{` 记选择器、
   遇 `}` 收声明，能正确处理 `@media` 嵌套）。修完 `body/html 规则数` 应从
   34 变成 85。
2. **处理 S02**：要么把 `card-grain` 挪到 `body::before`（§9.2 要求的做法），
   要么在 §9.15 或逐案裁定里**明确登记豁免并说明理由**——当前是"什么都没写，
   闸门也没看见"。修完要么 S02 合规，要么闸门红得有名有姓。
3. **重渲染 S02 的 `.inspect`**，看 `contrast` 是否报出此前被 `bgBehind` 挡掉的问题。
   这条我**没有做**（会动到交付方待提交的产物），必须由交付方完成。
4. **收窄 C4 的 `isMeta`**。当前 9/9 放过不可接受。方向建议：不要用"窗口内出现
   某些词"做过条件，改成"窗口内出现 `check-contract`/`C4` 且在**同一句**里
   有 `实测 0 条`/`断言`"这类**共现**判据；或更稳的办法——要求元描述必须
   同时包含**当前案的实测值**（如"实测 0 条"），而不只是一个语义词。
   修完必须补一组"嵌元语境词的真欠款"变异（我 `_review-b4-meta.mjs` 里的 9 条可直接用）。
5. **修 `ab-stale.mjs` 的 M2 基准**（用 `at` 而非 `report.mtime`），并把
   `LEAD-P1b-stale-guard.md:132-136` 的归因改对。
6. **删或改 `_probe-cc.mjs` 的 §7.4 引用**；把 396→397、2→4 的数字更正。

### 可以随后再做的（不阻塞提交）

- C5 的 `hairline`/变量名两个脆弱点：至少在注释里写明"本判据只认字面量规则名"，
  或改为解析 `RULE_IDS` + 对每条规则跑一次合成输入。
- `check-stale` 三节阈值统一（`:134`、`:219` 也应该是 3，或者说明为什么不同）。
- 「中位 363」→「360.5」、「1 秒」→「0.4 秒」两处实测数字。
- `LEAD-P1a-contract-gate.md` §2.2 改成程序的真实输出（或标注"预期形状"）。

---

## 5. 我的独立判断：哪一项仍然不达标

**`check-texture`。** 而且不是"差一点"，是**判据本身漏掉了 60% 的输入**。

其余四项我的看法：

- **P1a 最有价值的部分是真的**：两处 fail-open 修得干净（我自己移走 `rules.mjs`
  验过，exit 1），C5 把一个"结构性恒真"从隐性变成显性，这个方向对。
  但它**修出一个新的、更隐蔽的恒真式**（C4 的元语境豁免），
  而且 `ab-c4.mjs` 的 4 个变异恰好都在豁免条件之外，所以测试给了假信心。
  这是本轮最典型的"修 A 引入 B，且 B 被测试的盲区保护着"。
- **P1b 是四项里最诚实的**（它主动承认"原本是伪缺口"），但它的 M2 归因
  错得很有代表性：把一个"测试写错了"解释成"产品设计如此"。
- **P2 是四项里做得最扎实的**：兜底真删、R8 是硬断言、字符数差 0。
  它唯一的软肋是 R8 会把"规格缺字段"和"改名没做完"混为一谈，但当前 30 案不触发。
- **P3 是四项里返工质量最高的**：撤回文件论证严密（我逐字核了规格与 CSS），
  重写稿数字自洽，探针的两个 bug 都真修好了，而且修完之后**探针自己会打印
  "数字缺失 ≠ 行为缺陷"的免责标注**——这是把教训写进工具，比写进文档更持久。

**如果只能提一条**：`check-texture` 的 31/31 合规是假的，S02 的 `body` 上挂着
`card-grain.png`，而这个仓库自己写下了"纹理挂 body 会让 contrast 与 empty-screens
静默通过"。一个为了防这件事而建的闸门，漏掉了这件事本身——这比没有这个闸门更危险，
因为它提供了"已检查"的错觉。

---

## 6. 我造成的改动

**0 处。** 我全程用 `_review-snapshot.mjs` 做内容+mtime 双快照：

```
node deliverables/73-verify/_review-snapshot.mjs save     # 2247 个文件
…（全部测试）…
node deliverables/73-verify/_review-snapshot.mjs restore
node deliverables/73-verify/_review-snapshot.mjs diff
内容变化   0
仅 mtime 变化 0
新增 0 / 消失 0
```

`git status --porcelain` 的 tracked 改动**始终是 19 项，与开工时逐条一致**：

```
 M README-EN.md
 M README.md
 M prototypes/S01-red-wedge-broadsheet/.inspect/report.json
 M prototypes/S08-amber-overprint-lightbox/.inspect/desktop-page-01.jpg
 M prototypes/S08-amber-overprint-lightbox/.inspect/desktop-page-02.jpg
 M prototypes/S08-amber-overprint-lightbox/.inspect/report.json
 M prototypes/_CONTRACT.md
 M prototypes/_build/check-stale.mjs
 M prototypes/_build/check-twolines.mjs
 M prototypes/_build/collect-schemes.mjs
 M prototypes/_selection/.inspect/desktop-fold.jpg
 M prototypes/_selection/.inspect/desktop-page-01.jpg
 M prototypes/_selection/.inspect/mobile-fold.jpg
 M prototypes/_selection/.inspect/mobile-page-01.jpg
 M prototypes/_selection/.inspect/report.json
 M prototypes/_selection/.inspect/tablet-page-01.jpg
 M prototypes/_selection/app.js
 M prototypes/_selection/data.js
 M prototypes/_selection/self-gate.js
```

（题面说 14 个，我实测 19 个——多出来的是 3 个 `.inspect/*.jpg` 与 2 个
`report.json`/`self-gate.js`。这些**都是交付方的待提交改动，我一个都没有 checkout**。）

我新增的文件全部在 `deliverables/73-verify/` 下，都是未跟踪的诊断脚本，
不影响任何闸门的输入：

| 文件 | 用途 |
|---|---|
| `_review-snapshot.mjs` | 内容+mtime 双快照 / diff / restore |
| `_review-b2-c5.mjs` | C5 的假阳性（E1）与假阴性（E2） |
| `_review-b4-meta.mjs` | C4 元语境过宽：9 条真欠款反例 |
| `_review-b4-control.mjs` | C4 对照实验：只差一个元词 |
| `_review-b14-media.mjs` | @media 内 body 挂图（第一版，锚点写错，已修正后保留） |
| `_review-b14-underscan.mjs` | 闸门看到 34 / 实际 85 的量化 + S24 注入复现 |
| `_review-b14-truth.mjs` | 用稳健解析器算地面真值（发现 S02） |
| `_review-b15-parity.mjs` | 末尾追加为何总能被抓到 |
| `_review-s02-contrast.mjs` | S02 调色板理论对比度 |
| `_review-p1b-render.mjs` | 渲染耗时分布（min/中位/max） |
| `_probe-minimal.mjs` | 正则「隔一条」的最小复现 |
| `_probe-s02.mjs` / `_probe-s02b.mjs` / `_probe-s24.mjs` | S02/S24 逐字取证 |
| `_snapshot.json` / `_baseline_status.txt` | 开工基线快照 |

---

## 7. 复算清单

```bash
# A. 变异测试（注意：ab-texture 会把 S01/style.css 的 mtime 刷成现在，
#    导致随后的 ab-stale 基线不绿。先存快照、跑完 restore，再跑 ab-stale）
node deliverables/73-verify/_review-snapshot.mjs save
node deliverables/73-verify/ab-contract2.mjs      # 8/8
node deliverables/73-verify/ab-c4.mjs             # 4/4
node deliverables/73-verify/ab-failopen.mjs       # 4/4
node deliverables/73-verify/ab-r8.mjs             # 4/4
node deliverables/73-verify/ab-texture.mjs        # 6/6（但见 B14）
node deliverables/73-verify/_review-snapshot.mjs restore
node deliverables/73-verify/ab-stale.mjs          # 3/4

# B1/B2  C5 与它的两个脆弱点
node prototypes/_build/check-contract.mjs
node deliverables/73-verify/_review-b2-c5.mjs

# B3     §7.4 残留（应只剩"说明它不存在"的两处）

# B4     C4 元语境过宽（本轮最严重的软件缺陷）
node deliverables/73-verify/_review-b4-meta.mjs      # 期望 0/9 被抓
node deliverables/73-verify/_review-b4-control.mjs   # C0 抓到 / C1 放过

# B5     fail-open：手工 Move-Item 移走 rules.mjs，应 exit 1，还原后 sha256 不变

# B9     S08 撤回论证
#        _specs/S08.md:25（三档）
#        S08/style.css:277-291（perspective:none / transform:none / position:static）

# B11    断点探针
node deliverables/73-plan/LEAD-p3-breakpoints2.mjs   # 29/30，S13 不再"缺 100"

# B12    M2 归因（A 通过 / B 失败）
$env:DEBUG_STALE_CHAIN='1'; node prototypes/_build/check-stale.mjs

# B14    texture 漏检（最重要的一条）
node deliverables/73-verify/_probe-minimal.mjs          # 正则隔一条
node deliverables/73-verify/_review-b14-underscan.mjs   # 34/85 + S24 注入漏检
node deliverables/73-verify/_review-b14-truth.mjs       # 地面真值：S02 违规
node deliverables/73-verify/_review-b15-parity.mjs      # 末尾追加为何总能抓到

# C      全链

# 最后务必
node deliverables/73-verify/_review-snapshot.mjs restore
node deliverables/73-verify/_review-snapshot.mjs diff   # 应全 0
```
