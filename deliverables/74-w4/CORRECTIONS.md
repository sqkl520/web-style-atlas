# 修正层设计：`prototypes/_prompts/corrections.json`

> 任务：给 `prompts.js` 里三条事实错误的 `dna.mechanism`（S03 / S07 / S17）一个**能活过重生成**的人工修正途径，且不制造第二份真源。
>
> 本文所有数字与行号都是本轮在 `D:/Web/style` 实跑量出来的，复算命令附在每节里。
> 设计对 `deliverables/74-plan/PROMPT-SYSTEM.md` §4.3 是**收紧**，不是背书：那份伪代码有三个洞（哈希粒度、stale 只 WARN、缺「修订已多余」检测），`CRITIQUE-PROMPT.md` §4.2 已经点出两个，本轮实测又发现第三个更硬的：**它的修正层只管得到剪贴板，管不到选型台面板，于是产品里同时存在两句互相矛盾的话**（见 §1.3）。

---

## 0. 结论摘要

| 问题 | 裁决 | 一句话理由 |
|---|---|---|
| Schema | 数组 + `(id, field)` 唯一 + 封闭字段白名单 | 白名单是「不许加新主张」的机器化，不靠文档约束 |
| `sourceHash` | 哈希**该字段的紧邻上游值**，规范化后；不哈希整案、不哈希整文件 | 改配色不该让机制句修订失效；改机制句一个字就该失效 |
| Stale | **硬 FAIL，且不写盘**（fail-closed），无 `--force` 开关 | 仓库的病是「记录 ⇒ 不必修」；`--force` 是下一张 §9.15 豁免表 |
| 冗余检测 | `upstreamDefect[]` 双向断言：编写时**必须命中**，复查时**必须消失** | 一个数组两个检查点，把「无罪推定」换成「举证责任」 |
| 反 fork 不变量 | I1 白名单 / I2 上限即闸门 / I3 举证责任 / I4 数字必须可溯源 / I5 单写者+新鲜度 | I1–I3、I5 完全可执行；I4 部分可执行，已如实标注 |
| 插入点 | `build-prompts.mjs` 第 332 行后（`out` 组装完）、第 334 行 banner 之前 | 再早会被 104–112 的「只填空」合并吃掉；再晚报告数字会撒谎 |
| **S17 该不该进 corrections.json** | **不该**。改 `mechanisms.mjs:45` | 该文件**没有生成器**（实测零 `writeFileSync`），改它就是终态；进修正层是纯粹多一层 |

**上限因此是 2，不是 3。** 理由见 §1.1 —— 这是本轮最重要的一个结构性发现，也是「设计对抗第三份 fork」这件事本身给出的答案：**能在源头修的，修源头；修正层只留给源头改不动的那两案。**

---

## 1. 实证前提：三条句子的上游并不一样

### 1.1 上游归属（实测）

```
$ node --input-type=module -e "…读 dna-clean.json + mechanisms.mjs…"
S03 origin=_specs/S03.md:15   sha1(norm)=b8157bc4b0b722642a6328d23a0d6cc2299ae507 len=91
S07 origin=_specs/S07.md:15   sha1(norm)=8cd3a7c1170eddd565acc3d6f05fc545847ad736 len=87
S17 origin=mechanisms.mjs:45  sha1(norm)=03468cfdba8ffeaf3665d0db3c3b3289af9ff27f len=91
```

链的形状（`collect-schemes.mjs:184` 自己写下了这段）：

```
S01–S10:  deliverables/04-schemes-01-10.md
            └─extract-specs.mjs（"只做机械切分，不改一个字"，:3）
               └─ prototypes/_specs/Sxx.md:15  「1-附（去掉名字之后的机制）：…」
                  └─ extract-dna.mjs:115 正则
                     └─ dna-clean.json[i].mechanism
                        └─ build-prompts.mjs:105 只填空 → prompts.js

S11–S30:  mechanisms.mjs[id].text  ──（build-prompts.mjs:105 只填空）──→ prompts.js
```

**关键不对称（两份文件我都查了写入者）**：

```
$ grep -rn "mechanisms" prototypes/_prompts/*.mjs prototypes/_build/*.mjs | grep -i write
（零命中）
$ grep -rn "_selection/prompts.js" prototypes/ | grep writeFileSync
prototypes/_prompts/build-prompts.mjs:370
```

- `mechanisms.mjs` **没有任何生成器**。它是手写源文件，改它 = 终态，且 `build-prompts.mjs` 下次重跑照样读它。**「活过重生成」这个需求，对 S11–S30 已经天然满足。**
- `_specs/Sxx.md` **有生成器**：`extract-specs.mjs:84` 无条件 `writeFileSync`。改它会在下次重跑被覆盖。所以 S03/S07 确实需要一层能活过重生成的东西。

于是：**S17 进修正层是负收益。** 它会把 `mechanisms.mjs:45` 的 `text` 与 `corrections.json` 的 `text` 摆成两份，而 `mechanisms.mjs:46` 的 `source:` 字段**已经记着 `88px`**（原文：「`:181` 金额右对齐（1024–1439 档 `:320` 压到 88px）」）—— 这是「核对了但没回写」，直接把 `text` 改对就行，`source:` 一个字都不用动，谈不上 `PROMPT-SYSTEM.md` §4.1 担心的「`source:` 语义漂移」。

> 若最终仍选择三案全走修正层，本设计也能承载（`cap: 3`），但必须同时把 `mechanisms.mjs` 声明为**不可再手改**，否则第三份 fork 从第一天就成立。我不建议。

### 1.2 三条句子的错处（本轮逐条对源码复核过，与 `PROMPT-SYSTEM.md` §2.1 一致）

| 案 | 错处 | 源码真值 | 复算 |
|---|---|---|---|
| S03 | 「右侧 **9 栏**」 | `style.css:124` `.chrono{grid-template-columns:var(--axis-w) minmax(0,1fr)}`，**两列**；`:17 --axis-w:264px` | `grep -n "chrono" style.css` |
| S03 | 「游标随**焦距比**移动」 | `index.html:307` 1:1 跟随鼠标自绘十字 | `grep -rn 焦距 prototypes/S03*/` → **0 命中** |
| S07 | 「正面 **5 栏**对背面 **7 栏**」 | `style.css:74` `5fr 1px 7fr` 是**页宽比**；真实栏数 `:81 column-count:2` / `:82 column-count:3` | 见 §1.4 |
| S17 | 「金额列 **96px**」 | S17 的 `style.css`/`index.html` 里 `96px` **出现 0 次**；`style.css:320` 是 `td.num{width:88px}`，且只在 1024–1439 档 | `grep -c "96px" style.css` → `0` |

### 1.3 ⚠️ 同一个错误在 `data.js` 里还有一份，修正层管不到

`data.js` **没有** `mechanism` 字段（实测 33 键：`id,dir,cn,en,fr,structure,threshold,tone,def,family,fontsSpec,layout,visuals,motion,audit,risk,landing,scenes,quirk,copy,copyParts,bg,primary,buttonText,errorCode,errorCodeSource,palette,built,gate,shots,axes,scenesYes,scenesNo`）。所以「`data.js` 是否也带错的 mechanism」的答案是**否**——它压根不带 mechanism。

但**同样的错误以 `def` / `layout` 的身份存在**：

```
prototypes/_selection/data.js:185  "layout": "…右侧 9 栏放影像带与读数卡，列数 12…"          （S03）
prototypes/_selection/data.js:518  "def":    "…左栏 5 栏窄、右栏 7 栏宽…"                    （S07）
prototypes/_selection/data.js:521  "layout": "跨页版心左 5 栏右 7 栏（栏宽 62px、栏沟 18px）…"（S07）
prototypes/_selection/data.js:1387 "layout": "…金额列宽固定 96px 且右对齐…"                    （S17）
```

而 `app.js:1380` 把 `r.def` 渲染进面板：`field('一句话视觉定义', r.def)`。也就是说——**修完之后，用户在同一页面上会看到面板说「左栏 5 栏右栏 7 栏宽」，剪贴板说「column-count:2 / column-count:3」。** 这是 M01 事故的形状，只是这次是**产品内部自相矛盾**，而且没有任何闸门会红。

`data.js` 由 `collect-schemes.mjs:715` 从 `_specs` 重写，`_specs` 又由 `extract-specs.mjs` 从 `deliverables/04/05/06` 重写。**唯一的真源修复路径是 L0 的 `04-schemes-01-10.md` / `05-schemes-11-20.md`**（手写、无生成器）。这不属于修正层的职责——把修正层扩到 `data.js` 会当场把它变成第二份真源。但它**必须被记录为已知缺口，并由闸门保持可见**（§6 I6）。

### 1.4 ⚠️ 现有 token 闸门会给错的句子判绿——这是「文本替换」不够的原因

`deliverables/74-w4/_mech-trace.mjs` 是现成的「机制句每个数字能否在源码里找到」探测器。本轮实跑它对 S07 的输出：

```
== S07  mech: …正面 5 栏对背面 7 栏、栏线 0.5px，页码竖排 28px 行高…
   5栏      PASS  via /grid-template[^;]*5/  "grid-template-columns:5"      ← 命中的是 5fr
   7栏      PASS  via /repeat\(\s*7\b/       "repeat(7"                     ← 命中的是 .plates 的 repeat(2) 附近
   0.5px    MISS                                                             ← 实际 style.css:80 写的是 `.5px`
```

**一句事实错误的话，token 闸门判它 5/7 通过。** 同一跑里 S17 的 `1.2px` 被判 MISS，而 `style.css` 的 `.perf` 里是真的 `circle r='1.2'`（口径问题）。

结论：**任何以「替换文本 + 数字存在性」为核心的修正层，都修不掉它自己引入的下一句错话。** 修正层的每一条必须自带**可证伪的断言**（§2 `upstreamDefect` + §6 I4），否则它只是把「三句错的」换成「三句没被检查过的」。

### 1.5 现存守卫缺口（`check-stale` 实读）

`check-stale.mjs:219-222` 的 `prompts.js` 链输入只有两项：

```js
{ product: '_selection/prompts.js',
  inputs: () => [join(P, '_prompts/dna-clean.json'), join(P, '_prompts/build-prompts.mjs')],
  hint: 'node prototypes/_prompts/build-prompts.mjs' }
```

而 `build-prompts.mjs` 实际还读 `mechanisms.mjs`（:20）、`data.js`（:40,:76）、`minitems-parsed.json`（:96）。**今天改 S17 的机制句，`prompts.js` 不会被判陈旧。** 加修正层而不补这四个输入，等于新增一个「改了不生效、不报错」的哑弹——正是 `build-prompts.mjs:225-237` 删掉 `TEMPLATE` 常量时记下的那类缺陷。

`check-prompts.mjs` 全文 `mechanism` 出现 **0 次**（`grep -c` 实测）。机制句今天没有任何内容闸门。

---

## 2. Schema

`prototypes/_prompts/corrections.json`：

```json
{
  "$schema": "corrections/1",
  "norm": "n1",
  "cap": 2,
  "entries": [
    {
      "id": "S07",
      "field": "dna.mechanism",
      "origin": {
        "chain": "spec",
        "file": "prototypes/_specs/S07.md",
        "anchor": "1-附（去掉名字之后的机制）",
        "lineHint": 15
      },
      "basedOn": "8cd3a7c1170eddd565acc3d6f05fc545847ad736",
      "upstreamDefect": [
        { "in": "prototypes/_specs/S07.md", "mustContain": "正面 5 栏对背面 7 栏" }
      ],
      "text": "同一张版心用 grid-template-columns: 5fr 1px 7fr 切成窄正面／1px 中缝实线／宽背面…",
      "why": "5fr/7fr 是两页宽度比，不是栏数；真实栏数在 style.css:81-82 的 column-count 2/3。照 5+7 栏做，每栏约 113px，中文标题碎成每行两字。",
      "evidence": [
        "style.css:74   .pages{grid-template-columns:5fr 1px 7fr}",
        "style.css:81-82  .page-recto .toc{column-count:2} / .page-verso .toc{column-count:3}",
        "style.css:12 --gutter:18px / :13 --base:7px / :14 --lead:28px / :80 column-rule:.5px",
        "style.css:169-175 作者自己记录了「5+7 栏把标题压碎」的事故"
      ],
      "reviewedAt": "2026-11-04",
      "reviewer": "owner",
      "untilFixedIn": ["deliverables/04-schemes-01-10.md", "prototypes/_selection/data.js#def", "prototypes/_selection/data.js#layout"]
    }
  ]
}
```

### 2.1 逐字段裁定

| 字段 | 必填 | 作用 | 若缺失/错 |
|---|---|---|---|
| `id` + `field` | ✓ | 定位。`(id, field)` 必须唯一 | 重复 → FAIL（否则两条修订抢同一个槽，谁赢取决于数组顺序） |
| `field` | ✓ | **封闭白名单**：本轮只允许 `dna.mechanism`。见 §6 I1 | 白名单外 → FAIL |
| `origin.chain` | ✓ | `spec`（S01–S10 走 `_specs`）或 `patch`（S11–S30 走 `mechanisms.mjs`）。**决定哈希谁** | 与实际不符 → FAIL（§3.3） |
| `origin.file` + `anchor` | ✓ | 上游的**可搜索锚点**，不依赖行号 | 锚点找不到 → FAIL「上游文件已变」 |
| `origin.lineHint` | ✗ | 只用于报错信息，**不参与判定** | 漂移无害（行号一定会漂） |
| `basedOn` | ✓ | §3 的字段级哈希 | 不匹配 → FAIL（§4） |
| `upstreamDefect[]` | ✓（≥1） | 双向断言：编写时**必须命中**，复查时**必须消失** | 见 §5 |
| `text` | ✓ | 替换值。只能是字符串，只能**替换**已存在的字段 | 见 I1 |
| `why` | ✓ | 一句话说清「错在哪」 | 空 → FAIL（空理由是「记录」不是「裁决」） |
| `evidence[]` | ✓（≥1） | `file:line` + 该行内容摘要，闸门**回读**每一条并确认非空 | 引用的文件/行不存在 → FAIL |
| `reviewedAt` / `reviewer` | ✓ | 追责 | 缺 → FAIL |
| `untilFixedIn[]` | ✗ | 记录「源头还没修，这份 fork 仍然存在」的位置。由闸门读，不进构建 | 缺 → WARN（允许，但不鼓励） |
| `cap` / `norm` | ✓（顶层） | 见 I2 / §3.2 | — |

**刻意不设**：`basedOnFileHash`、`appliesTo: "all"`、正则 `match`、`when` 条件、`priority`。每一个都会让修正层从「三处勘误」长成「一套规则引擎」——`_CONTRACT.md` §9.15 的豁免表就是这么变成避难所的。

**为什么是数组不是 `{"S07": {...}}`**：数组让 `cap` 检查是一行 `entries.length > cap`，让 `(id,field)` 重复检查是一行，让 diff 是「加/删一个元素」而不是「改一个键」。顶层 `norm` 与 `cap` 也顺带成了「改语义必须动这个文件」的显式动作。

---

## 3. `sourceHash`：哈希什么，为什么

### 3.1 三个候选及其失败模式

| 候选 | 失效面 | 后果 |
|---|---|---|
| A. 整案 `{mechanism, palette, fonts}` 打包（`PROMPT-SYSTEM.md` §4.3 的原案） | 改任何一个色值 | S07 的修订失效 → **三句错话回来了，而闸门红**，人会以为闸门坏了（`CRITIQUE-PROMPT.md` §4.2 缺陷 1） |
| B. 整个上游文件（`_specs/S07.md` 或 `mechanisms.mjs`） | 改同一文件的**任何**别处：S07 的 `_specs` 有十余个字段（`collect-schemes.mjs:174` 实测 12 个 key），`mechanisms.mjs` 有 20 条（S11–S30） | 一次无关的错别字修正 → 全部修订失效。**这是本仓最不能接受的一种红**，因为它每天都在发生 |
| C. **该字段的紧邻上游值，规范化后**（本设计） | 只有「你正在替换的那句」变了才失效 | 见 §3.3 的三条边界 |

### 3.2 定义

```
upstream(id, chain) =
    chain === "spec"  ? dna-clean.json[where(id)].mechanism
  : chain === "patch" ? MECHANISMS[id].text
  : (throw)

norm_n1(s) = s.normalize("NFC").replace(/[ \t\r\n\f\v\u3000]+/g, " ").trim()

basedOn = sha1(utf8(norm_n1(upstream(id, chain))))
```

`norm: "n1"` 写进文件、写进生成器常量。**规范化只抹格式，不抹内容**：全角空格、换行、尾随空白、Unicode 组合形。

- 抹掉格式，是为了让「编辑器自动整理空白」不触发失效——否则这个闸门会因为一个所有人都会做的无害操作变红，然后被 `--force` 掉。
- **不**抹标点、**不**抹全角/半角数字、**不**做同义词归一。`28px` vs `28 px` 是**内容**差异，必须失效。

规范化函数一旦改动（`n1 → n2`），全部 `basedOn` 同时失效。这不是 bug，这是**故意设置的迁移闸**：改规范化器的人必须同时重算全部 `basedOn`，而文件里 `norm` 字段让这件事成为一次显式提交，不是静默行为。

### 3.3 为什么「紧邻上游、同字段」是正确的粒度（三条边界论证）

**(a) 太紧的一侧：为什么不连 `palette` 一起哈希。**
`dna-clean.json` 的 `palette` 由 `pickPalette` 产出，而 `clean-dna.mjs:1049-1226` 这一段从 2026-10-30 起已经被改过四次（主色判据 4、规格角色名、规格声明色优先、派生色补位）。**配色是这条链里最不稳定的字段**。把机制句的修订挂在它上面，等于给修订层装了一个每周都会响一次的假警报。机制句的正确性与配色无关，哈希就不该包含配色。

**(b) 太松的一侧：为什么不哈希「id + 长度」或「前 20 字」。**
S07 的错句与疑似正句都以「同一」开头。若只哈希前缀，上游把 `5 栏对背面 7 栏` 悄悄改成 `5 栏对背面 5 栏`（依然错，但不同地错），哈希不变、修订照用 —— 而修订里的 `evidence` 指向的 `column-count:2/3` 此时可能已被删。**「松」的定义不是哈希位数，是「允许上游在你没看见的地方变化」**。哈希整句是唯一能做到「你替换的那个东西一动就失效」的口径。

**(c) 上游换了一条路进来怎么办 —— 这是 `chain` 字段存在的理由。**
如果哪天有人给 S07 补一条 `1-附` 进 `mechanisms.mjs`，`build-prompts.mjs:105` 的 `if (!d.mechanism && MECHANISMS[d.id])` 逻辑是**只填空**，`_specs` 赢，`mechanisms.mjs` 那条**永远不生效**（这正是 `PROMPT-SYSTEM.md` §4.1 记下的坑）。此时修订仍然对着 `_specs` 生效——正确。但若有人反过来把 `_specs` 那条删了（`extract-dna.mjs:115` 抓不到 → `mechanism: ""`），那 `MECHANISMS.S07` 就会接管，**上游换了人，而哈希算的是另一个人**。所以：

> **`chain` 是必填且必须与实际生效的那一支相符。** 生成器在算哈希前先判定「这一案当前实际读的是谁」，与 `origin.chain` 不符就 FAIL，错误信息写明「上游已从 `_specs` 换成 `mechanisms.mjs`，请重新裁决」。这不是防御性编程，这是上游真的有两支路，而只有一支生效。

### 3.4 哈希之外的第二道：`origin.anchor` 必须还在

哈希只能证明「值变了/没变」。它证明不了「这个值还是从你以为的地方来的」。所以生成器还要做一次**定位复核**：`origin.file` 里必须仍能搜到 `origin.anchor`。

价值：如果 `extract-specs.mjs` 因为 `04-schemes-01-10.md` 改结构而把 S07 的 `1-附` 行整段丢了，`dna-clean.json` 的 `mechanism` 会变成空串 → 哈希不匹配（能抓到）；但如果它把**另一案的句子**错配给了 S07，哈希也可能不匹配（能抓到）；而如果上游把两句**互换**（S07 拿到 S08 的句子、S08 拿到 S07 的），哈希不匹配同样能抓到。真正只有锚点能抓到的是：`_specs/S07.md` 被整体换成一个不同结构的文件，而 `mechanism` 恰好同值——概率极低，但锚点检查是零成本的。

---

## 4. Stale 行为：硬 FAIL 且**不写盘**

### 4.1 三个选项的实价

| 选项 | 具体后果 | 判定 |
|---|---|---|
| (c) 应用再说 | 用**旧的**修订覆盖**新的**上游。上游若已修对，这一步把对的改回错的，且无人知情 | **不可接受**。这是「修正层成为权威真源」的准确机理 |
| (b) WARN + 跳过 | 三句错话静默回到 `prompts.js`，闸门绿。`check-stale` 的整部历史（`README`、`00-SYNTHESIS.md` §D-5、`check-stale.mjs:7-15` 记的 AH-11/AH-14/N1 三次事故）都是「警告没人看」 | **不可接受**。仓库自己把这条写成了病 |
| (a) FAIL | 构建红。代价是「一条烂条目挡住 30 案的提示词重生成」 | **采纳**，代价由 §4.2 与 §10 收缩 |

### 4.2 精确行为规格

```js
// build-prompts.mjs，out 组装完（:332）之后、banner（:334）之前
const CORR = loadCorrections();          // 解析失败 → 直接 throw，不写盘
const errs = [];
for (const c of CORR.entries) {
  const o = out.find((x) => x.id === c.id);
  if (!o) { errs.push(`${c.id}: 案号不存在`); continue; }

  // ① 定位
  if (!anchorPresent(c.origin))            errs.push(`${c.id}: 上游锚点消失（${c.origin.file} 里找不到「${c.origin.anchor}」）`);
  if (actualChain(c.id) !== c.origin.chain) errs.push(`${c.id}: 上游支路已变（声明 ${c.origin.chain}，实际 ${actualChain(c.id)}）`);

  // ② 值
  const h = hashField(c.id, c.origin.chain);
  if (h !== c.basedOn)                     errs.push(`${c.id}: 上游已变（basedOn ${c.basedOn.slice(0,8)} → 实际 ${h.slice(0,8)}）`);

  // ③ 举证（编写时的方向：缺陷必须还在）
  for (const d of c.upstreamDefect)
    if (!contains(d.in, d.mustContain))    errs.push(`${c.id}: 声称的缺陷「${d.mustContain}」已不在 ${d.in} —— 上游可能已修，请删除本条修订（见 §5）`);

  // ④ 白名单 + 不许新增字段
  if (!ALLOWED_FIELDS.has(c.field))        errs.push(`${c.id}: 字段 ${c.field} 不在白名单`);
  if (!hasPath(o, c.field))                errs.push(`${c.id}: 生成物里没有 ${c.field}，修正层不许新增字段`);

  // ⑤ 证据回读
  for (const e of c.evidence)
    if (!evidenceResolves(e))              errs.push(`${c.id}: 证据无法回读：${e}`);
}
if (errs.length) {
  for (const e of errs) console.error("[corrections] FAIL " + e);
  console.error(`[corrections] ${errs.length} 条不成立，prompts.js **未写入**（fail-closed）。`);
  process.exit(1);                          // ← 在 writeFileSync(:370) 之前
}
for (const c of CORR.entries) setPath(out.find((x) => x.id === c.id), c.field, c.text);
```

四条硬性质：

1. **`process.exit(1)` 发生在 `writeFileSync` 之前**。磁盘上不会留下一个「已生成、但少了一条修订」的 `prompts.js`。fail-closed 的定义就是这个：**宁可没有产物，也不要有一个说谎的产物**。`check-stale` 随后会把这个案子报成「prompts.js 落后于 build-prompts.mjs」，链条自洽。
2. **错误信息必须分类，不能合并成一句「上游变了」**。这是 §5 的全部前提：`basedOn` 不匹配 + 缺陷仍在 = 「重新裁决」；`basedOn` 不匹配 + 缺陷消失 = 「上游已修，删掉本条」。两者退出码相同，文案与 `code` 不同，测试要断言 `code`（§9 M3）。
3. **无 `--force`、无 `--skip-corrections`、无环境变量开关。** 唯一的合法出路是编辑 `corrections.json`（改 `text`+`basedOn`，或删条目）——一次可见的 diff。加一个开关，就等于给「红着上线」发了一张通行证，而 §9.15 的教训是**这些通行证会被用来合法化别的通行证**。
4. **计数必须被断言**：`applied === entries.length`（在无错误分支上恒真，因为错误分支已 exit）。另加 `console.log("[corrections] 应用 N 条")`，且 N 写进 `prompts.js` banner。**下游能看见修正层动过手**，而不是靠读源码才知道。

### 4.3 为什么 banner 里要写 N

`prompts.js` 是 tracked 构建产物，读它的人有权知道「哪几句不是生成器的原话」。banner 加一行：

```
 * 人工修订：2 条（S03, S07 的 dna.mechanism），来源 prototypes/_prompts/corrections.json。
 *   上游一旦变化，构建会失败而不是静默沿用；排查见 deliverables/74-w4/CORRECTIONS.md。
```

这一行是**低成本的反 fork 措施**：任何拿到 `prompts.js` 的人（包括下一个 AI）都会立刻知道有两处不是实测产出。`build-prompts.mjs:334-353` 的 banner 已经是这种「读端需知」风格，加一段完全同构。

---

## 5. 冗余检测：靠 `upstreamDefect` 双向断言

### 5.1 问题

上游被真修好之后（有人去改了 `04-schemes-01-10.md`，`extract-specs` 重跑，`_specs/S07.md:15` 变成正句）：
- `basedOn` 不匹配 → 按 §4 构建红。**好消息**：不会静默。**坏消息**：报的是「上游已变，请重新裁决」，一个会让人去**重算哈希并把旧 text 写回去**的指令 —— 于是修订永生化。
- 这正是 `CRITIQUE-PROMPT.md` §4.2 缺陷 2 与它 §4.3 的三时点剧本（T0 入库 → T2 上游修好 → T3 忘删 → 三份文档三个说法）。

### 5.2 机制：一个数组，两个检查点

每条修订必须声明它**声称上游错在哪**，用**字符串存在性**表达（不用正则、不用 CSS 解析——那条路已经被 §1.4 证明不可靠）：

```json
{ "upstreamDefect": [{ "in": "prototypes/_specs/S07.md", "mustContain": "正面 5 栏对背面 7 栏" }] }
```

| 时点 | 判定 | 输出 |
|---|---|---|
| **编写/复核时** | 每个 `mustContain` **必须命中** `in` | 未命中 → `FAIL code=defect_not_found`：「你在改一条不存在的话」。这一条挡的是「修正层变成意见层」 |
| **每次构建** | 每个 `mustContain` **必须仍命中** | 全部消失 → `FAIL code=upstream_fixed`：「上游已修好，请**删除**本条修订（不是重算 basedOn）」 |
| **部分消失** | 部分命中、部分不命中 | `FAIL code=defect_partially_fixed` + 逐条列出哪几条没了。**必须红**：半修的上游配旧的整句替换，是典型的两份文档打架 |

### 5.3 为什么「全部消失才算冗余」而不是「任一条消失」

S07 的修订可能声称两个缺陷（`5 栏对 7 栏` 与 `1px 整体偏移`）。若上游只修了第一个，第二条仍是错的，此时**整条修订仍然需要**——只是它的 `text` 可能该改。所以「任一消失」判冗余会误删还在生效的修订。这是「宁可少报，也要报得准」的同一条纪律（`check-stale.mjs:47-51` 与 `clean-dna.mjs` 反复写下的）。

### 5.4 与最终产物联动的第四个检查点（防「删了修订但错话回来了」）

`check-corrections.mjs`（新闸门）对**最终 `prompts.js`** 也跑一遍 `upstreamDefect[].mustContain`：

> 最终 `prompts.js` 里 **不得出现**任何 `mustContain` 字符串。

理由：如果有人把 `corrections.json` 里的 S07 条目删掉（以为上游修好了，其实没有），`build-prompts.mjs` 会成功（没有条目要应用），`prompts.js` 里错句回归，而 §5.2 的三个检查点全绿（文件里没条目 = 没断言）。**第四检查点独立于文件是否存在**，它断言的是产物。这就是 §9 M1 的判据。

这一条也顺带修掉了 `§1.5` 的「机制句零内容闸门」：`mustContain` 是四条机制句断言，跑在 `prompts.js` 上。

---

## 6. 反第三份 fork：不变量，及哪几条真能执行

### I1 · 封闭字段白名单，且**不许新增字段** —— 完全可执行

```js
const ALLOWED_FIELDS = new Set(["dna.mechanism"]);
if (!hasPath(o, c.field)) errs.push("修正层不许新增字段");
```

`hasPath` 要求 `field` 必须已经存在于 `out[i]` 对象里。所以修正层**只能替换已有值**，永远不能创建新值。这是「只能替换文本，不能加新主张」的机器化。

**为什么这条是核心**：`_CONTRACT.md` §9.15 的豁免表之所以变成避难所，是因为它接受**任意文本**。一个能新增字段的修正层会在三个月内长成「30 案的 `needsJS`、`spec.grid`、`spec.rhythm` 都从这儿来」——`PROMPT-SYSTEM.md` §4.3 的样例里已经能看到这个苗头（`"set": {"needsJS": "A", "spec": {...}}` 就在新增字段）。那是把修正层变成了产品规格的第二真源。

> 若将来确实需要 `needsJS`，它的正确位置是 `build-prompts.mjs` 的 `HUMAN` 表（与 `plain`/`scenes`/`minItems` 同处，那是已经存在的、集中维护的人工裁定层），不是 `corrections.json`。**修正层修的是「事实错误」，不是「产品配置」。** 两者混在一处，就是 §9.15。

### I2 · 上限即闸门 —— 完全可执行

```js
if (CORR.entries.length > CORR.cap) errs.push(`修订条数 ${n} 超过上限 ${cap}`);
```

`cap: 2`。要加第三条修订，必须在**同一次提交里**改 `cap` 这个整数。这是与「上限写进文档」的全部区别：改 `cap` 是一次显式、可评审、出现在 diff 里的动作，而「文档说不要超过 5 条」是一句没人读的期望。

**为什么不用「corrections.json 变长就红」**：git 历史在 squash/rebase/cherry-pick 下不可依赖，`git rev-list` 的成本与假阳性都高，且 clone 出来的仓库没有历史。**不可执行的不变量比没有不变量更坏**——它给人一种有守卫的错觉（`check-stale.mjs:186-190` 记的 `05-` 写成 `06-` 就是这种错觉）。

### I3 · 举证责任：每条修订必须自证「上游确实错了」 —— 完全可执行

三件事同时做到才算一条合法修订：
1. `upstreamDefect[]` 非空，且当前命中（§5.2）；
2. `evidence[]` 至少一条能被回读的 `file:line`（生成器打开该文件、确认该行非空、且该行是 `evidence` 里声明的内容或其前缀）；
3. `why` 非空。

**这一条与 §9.15 的分界线**：§9.15 的每一行是**散文**，散文无法被反驳，所以能无限加。这里的每一行是**可执行的断言**——上游命中不了就红。一条「说不出上游错在哪」的修订加不进来。

**可执行性的诚实边界**：`evidence` 的「回读」只能验到「这一行存在且非空」，验不到「这一行真的支持这个结论」。后者需要人。所以 I3 的真实强度是「挡住手滑和编造，挡不住精心编造」。这是可接受的上限——因为 §8 的变异测试 M4 会覆盖「编造一个数字」这一类。

### I4 · `text` 里每个数字必须可溯源 —— **部分可执行**，必须如实标注

规则：`text` 里每个 `<数字><单位>` token，必须能在该案的 `style.css` / `index.html` / `_specs` 里找到，或者是某个已声明公式的计算结果。

**本轮实测证明这条今天不成立，两个方向都不成立**（§1.4）：

| 方向 | 实例 | 原因 |
|---|---|---|
| 假阳（错的判绿） | S07 `5栏` PASS via `grid-template-columns:5fr` | 单位不匹配：`5fr` ≠ 5 栏 |
| 假阴（对的判红） | S07 `0.5px` MISS（实际 `.5px`）；S17 `1.2px` MISS（实际 `r='1.2'`） | 口径未归一 |

所以 I4 **不能**作为 blocking 闸门直接上线。落地方式：

> **I4 先做「fixtures 锁定 + 只报不拦」**：把 `_mech-trace.mjs` 的 30 案当前判定写成 `deliverables/74-w4/mech-trace-fixtures.json`。`check-corrections.mjs` 只断言「`corrections.json` 里 `text` 的每个 token，在 fixtures 里的判定不得比修订前更差」——即**不许引入新的 MISS**。修好 tracer 的口径（单位归一、`.5px`≡`0.5px`、`r='1.2'` 算长度）是另一件独立工作，做完后再把 I4 升为 blocking。

这样 I4 今天就有价值：它是 S17「96px」那个原始缺陷的直接守卫（`96px` 在 S17 的 CSS/HTML 里 0 命中）。但它不会因为 tracer 的已知假阴而挡路。**「部分可执行」必须写在文档里**，否则下一个人会以为它比实际强。

### I5 · 单写者 + 新鲜度 —— 完全可执行

两件事：
1. `corrections.json` **只能被人写**。零 `writeFileSync` 指向它（与 `mechanisms.mjs` 同等待遇）。
2. `check-stale.mjs:219-222` 的 `prompts.js` 输入链**必须补四个**：

```js
inputs: () => [
  join(P, '_prompts/dna-clean.json'),
  join(P, '_prompts/build-prompts.mjs'),
  join(P, '_prompts/corrections.json'),      // 新增：改修正层必须让 prompts.js 变陈旧
  join(P, '_prompts/mechanisms.mjs'),        // 补：S11–S30 机制句唯一来源（实测漏了）
  join(P, '_selection/data.js'),             // 补：risk / reuse 从这儿来
  join(P, '_prompts/minitems-parsed.json'),  // 补：minItems / minPics 从这儿来
]
```

后三个是 `CRITIQUE-PROMPT.md` §4.1 已经查出的既有缺口，与本设计同批修——因为**加了 `corrections.json` 而不同批补这三个，会让「漏一个输入」从三处变成四处**，而它们漏掉的样子是「全部新鲜」，看起来像通过（`check-stale.mjs:203-207` 自己记下的教训）。

### I6 · 残余 fork 必须可见 —— 用 `untilFixedIn`，只报不拦

`data.js:518` 的 `def` 与 `data.js:521` 的 `layout` 仍然说「左 5 栏右 7 栏」（§1.3）。修正层修不到它们，而 L0（`deliverables/04-schemes-01-10.md`）是唯一真源、是历史交付文档，本轮不动。

处理：每条修订的 `untilFixedIn[]` 列出这些位置；`check-corrections.mjs` 对每一项跑**同样的 `mustContain`**（`data.js#def` 用 `def` 字段里那个错串），命中就报 **WARN 并计入「残余 fork 面 N 处」**，打印在闸门汇总里。

**为什么是 WARN 不是 FAIL**：它不在修正层的修复能力范围内，FAIL 会长期红着——而长期红着的闸门等于没有闸门（`check-stale.mjs:70-77` 为了 3 分钟容差反复调整，就是因为假阳性会摧毁闸门的信用）。但它**必须可见**：不能因为「修正层绿了」就宣布问题解决了。这是本设计最重要的一条诚实性要求：**修正层的绿，不等于 `data.js` 的绿。**

---

## 7. 插入点，以及 `collect-schemes.mjs` 之后会发生什么

### 7.1 唯一插入点：`build-prompts.mjs` 第 332 行之后、第 334 行之前

```
:242  for (const d of dna) { … out.push({…}) }   ← 逐案组装，dna.mechanism 在这里才落进 out
:332  }                                          ← 组装结束
      ┌──────────────────────────────────────┐
      │  applyCorrections(out)  ← 唯一位点    │
      └──────────────────────────────────────┘
:334  const banner = […]                          ← 这里开始读 out 做报告/banner
:370  writeFileSync(…prompts.js…)
```

**为什么必须在这之后（不能更早）**：

1. `out[i].dna.mechanism` 在第 321 行才被赋上。此前它只存在于 `dna[i].mechanism`（第 105 行合并后）与 `MECHANISMS` 里。
2. 若在 `dna` 数组上改（比如第 28 行读完之后立刻覆盖 `d[i].mechanism`），会被第 104–112 行的合并逻辑反过来影响：那段是 `if (!d.mechanism && MECHANISMS[d.id])`，**只填空**。在它之前写值会让 `mechFromSpec` / `mechFromPatch` 的计数（第 103、108-111 行）变成假数——报告会说「20 条来自 mechanisms.mjs」，而实际有一条是修正层给的。**报告撒谎比没有报告坏**。
3. 若在 `writeFileSync`（第 370 行）之前一点点做（比如碰 `body` 字符串），则 banner 已经拼好，修正层无法在 banner 里声明「有 2 条人工修订」（§4.3）。banner 是读端唯一的线索，必须能包含它。

**为什么不能更晚（`prompt-copy.js` 运行时）**：那是第五层（L5），`buildPrompt()` 是 30 案共用的一个函数。在那里插修正，等于让 30 条提示词的拼装路径都对一个 JSON 做运行时判断，且 `file://` 下 `fetch` 被 CORS 拦（`build-prompts.mjs:10` 已经把这条写进设计前提）。修正层必须**内联进 `prompts.js`**，这是既定约束。

### 7.2 有人之后跑 `collect-schemes.mjs` 会怎样

| 问题 | 答案 | 依据 |
|---|---|---|
| `data.js` 会覆盖 `prompts.js` 吗 | 不会。`collect-schemes.mjs:715` 只写 `_selection/data.js`；`prompts.js` 的唯一写入者是 `build-prompts.mjs:370` | 实测 `grep writeFileSync` |
| `data.js` 有 `mechanism` 字段吗 | **没有**（33 键已列，无 `mechanism`）。`collect-schemes.mjs:170-190` 明确写下了「为什么不能在这里也读一遍」：那会让 `data.js` 带一份 10/30 的残缺机制句，下一个读它的人会以为 S11–S30 没有机制句，**「这就是分叉」** | 实测 |
| 所以修正层与 `collect-schemes` 有交互吗 | 对 `mechanism` **零交互**。修正层不碰 `data.js`，`collect-schemes` 不碰 `prompts.js` | — |
| 但 `data.js` 里同样的错话会怎样 | **留在那儿**（`data.js:185/518/521/1387`）。它会随 `collect-schemes.mjs` 从 `_specs` 重新生成，而 `_specs` 从 L0 生成。修它 = 改 L0 | §1.3 |
| 有没有新的陈旧风险 | 有：`collect-schemes.mjs` 重写 `data.js` 后，`prompts.js` 的 `risk` / `reuse` 字段已经旧了。这是**既有缺口**（`check-stale.mjs:220` 没把 `data.js` 列为输入），本设计在 I5 里同批补 | §6 I5 |

**结论**：修正在 `mechanism` 这条线上是自洽的、与 `collect-schemes` 正交的。**但「修正层修好了」不等于「产品里没有这句错话」**——剪贴板修好了，面板没修好。这句话必须写进交付说明，否则下一个人会以为修完了。

---

## 8. S07 完整样例（可直接落地）

`norm: "n1"` 下 `upstream(S07, "spec")` 的实测哈希：`8cd3a7c1170eddd565acc3d6f05fc545847ad736`（长度 87）。

```json
{
  "id": "S07",
  "field": "dna.mechanism",
  "origin": {
    "chain": "spec",
    "file": "prototypes/_specs/S07.md",
    "anchor": "1-附（去掉名字之后的机制）",
    "lineHint": 15
  },
  "basedOn": "8cd3a7c1170eddd565acc3d6f05fc545847ad736",
  "upstreamDefect": [
    { "in": "prototypes/_specs/S07.md", "mustContain": "正面 5 栏对背面 7 栏" }
  ],
  "text": "同一张版心用 grid-template-columns: 5fr 1px 7fr 切成窄正面／1px 中缝实线／宽背面，两页宽度比 5:7；正面目录 column-count:2、背面 column-count:3（共 5 栏），栏沟 18px、栏线 0.5px，基线 7px／正文行高 28px，页码贴右缘竖排；纸背镜像不是整块翻转：用内联脚本遍历 .toc li，按每行 getBoundingClientRect() 的 left/top 与 getComputedStyle().fontSize，在覆盖版心的 svg 里逐行生成 text，整组 translate(版心宽,1) scale(-1,1)（1px 纸厚），不透明度锁 8%–14% 且随滚动线性加深，resize／字体加载后重算，prefers-reduced-motion 下固定 8%。正反两面同时进入同一张版心。",
  "why": "5fr/7fr 是两页宽度比，不是栏数。真实栏数在 style.css:81-82 的 column-count 2 与 3。若照「5 栏 + 7 栏」做，1440 档每栏约 113px，中文标题会碎成每行两字——这是 style.css:169-175 作者自己记录的事故。",
  "evidence": [
    "style.css:74 .pages{position:relative;display:grid;grid-template-columns:5fr 1px 7fr}",
    "style.css:81 .page-recto .toc{column-count:2}",
    "style.css:82 .page-verso .toc{column-count:3}",
    "style.css:12 --gutter:18px",
    "style.css:13 --base:7px",
    "style.css:14 --lead:28px",
    "style.css:80 .toc{column-rule:.5px solid var(--slate);column-gap:var(--gutter)}",
    "style.css:169-175 作者注释：5+7 栏把中文标题压碎的事故记录"
  ],
  "reviewedAt": "2026-11-04",
  "reviewer": "owner",
  "untilFixedIn": [
    "deliverables/04-schemes-01-10.md",
    "prototypes/_selection/data.js#def",
    "prototypes/_selection/data.js#layout"
  ]
}
```

### 8.1 三条落地时必须做的修正（否则这条修订会引入新问题）

1. **必须去掉反引号。** `PROMPT-SYSTEM.md` §2.1 给的正句带 Markdown 反引号（`grid-template-columns: 5fr 1px 7fr`、`column-count:2`、`.toc li`…）。而 `prompt-copy.js:309` 的输出是**纯文本剪贴板**（`mech = "这个风格的签名动作：" + d.mechanism`，随后 join 进 `lines`）。反引号会原样出现在用户复制的提示词里，而现有 30 条机制句**一条反引号都没有**（实测）。上文的 `text` 已全部剥离。这是一次真实的规格缺陷，不是排版偏好。
2. **不加「这个风格的签名动作：」前缀。** 那是 `prompt-copy.js:309` 加的，写进 `text` 会变成双前缀。
3. **`0.5px` 与 `.5px` 的写法。** 源码是 `.5px`，`text` 写 `0.5px`（与 `dna.lineWidths` 的格式一致，且 §1.4 的 tracer 对 `.5px` 判 MISS）。这是**已知的 tracer 口径债**，不是这句话的错；I4 的 fixtures 机制（§6 I4）会把它记成「既有 MISS，非新增」。

### 8.2 三条机制句的处置汇总

| 案 | 处置 | 位置 |
|---|---|---|
| S03 | 进 `corrections.json` | `_specs/S03.md` 会被 `extract-specs.mjs` 覆盖，只能走修正层 |
| S07 | 进 `corrections.json` | 同上 |
| **S17** | **不进。直接改 `mechanisms.mjs:45` 的 `text`（删 `96px`，写断点行为）** | 该文件无生成器，改它就是终态；`source:`（:46）已经记着 `88px`，不动 |

于是 `cap: 2`。若业主坚持三案统一走修正层，`cap` 改 3，并把 §1.1 的论证作为已知取舍记录下来。

---

## 9. 变异测试（4 条，其中 3 条是必需的）

全部落在 `check-corrections.mjs`（新闸门）+ `build-prompts.mjs` 的组合上。判据是**退出码 + 错误 code**，不是 grep 日志。

### M1 · 删掉 S07 条目 → 闸门必须红（错句回归）

```bash
node -e "删 corrections.json 的 S07"
node prototypes/_prompts/build-prompts.mjs      # 应 exit 0（没有条目要应用）
node prototypes/_build/check-corrections.mjs    # 应 exit 1
```

必须断言：`code === "defect_present_in_output"`，且信息里含 `正面 5 栏对背面 7 栏` 与 `prompts.js`。

**这条测的是 §5.4 的第四检查点**，即「产物里有错话」独立于「文件里有条目」。没有它，删条目就是一条静默回退路径——而「删一条记录来让闸门变绿」正是这个仓库最熟悉的操作。

### M2 · 改上游一个字 → 构建必须拒绝且**不写盘**

```bash
# 在 _specs/S07.md:15 末尾加一个空格 + 把「5 栏」改成「5」
node prototypes/_prompts/build-prompts.mjs      # 期望 exit 1
stat -c %Y prototypes/_selection/prompts.js     # 期望 mtime 未变
```

必须断言两件事：`exit 1`，**且 `prompts.js` 的 mtime/内容未变**。只断言退出码会漏掉最常见的一种错实现——先写盘再校验。同时断言错误 `code === "upstream_changed"`（不是 `upstream_fixed`），因为缺陷仍在。

### M3 · 上游真修好 → 冗余检测必须报「删掉这条」，而不是「重算哈希」

```bash
# 把 _specs/S07.md:15 整句换成 §8 的正确文本
node prototypes/_build/extract-specs.mjs
node prototypes/_prompts/extract-dna.mjs
node prototypes/_prompts/clean-dna.mjs
node prototypes/_prompts/build-prompts.mjs      # 期望 exit 1
```

必须断言：`code === "upstream_fixed"`，且错误文案含「请删除」+「不是重算 basedOn」。**断言文案不是多余**：这类错误唯一的价值就是给出正确的下一步动作；一条报着「上游已变，请重新裁决」的失败会让人把旧 `text` 写回去，把修订永生化。

同时断言：此时若不是「硬 FAIL」而是「跳过并继续」，M3 会以 `exit 0` + 错句入档 的形式通过 —— 于是 M3 同时也是「stale 必须是 FAIL 不是 WARN」的回归测试。

### M4 · 往 `text` 里塞一个不可溯源的数字 → I4 必须报（本轮新增，非必需但强烈建议）

```bash
# 把 §8 的 text 里「共 5 栏」改成「金额列 96px」
node prototypes/_build/check-corrections.mjs    # 期望 exit 1
```

必须断言：`code === "unsourced_number"`，token 是 `96px`。

**这条直接映射到原始缺陷**：S17 的 96px 就是这么进来的（`mechanisms.mjs:46` 的 `source` 记着 88px，`text` 写着 96px）。M4 的存在证明修正层不是「把三句错话换成三句没被检查过的话」。注意它依赖 §6 I4 的 fixtures 机制——**在 tracer 口径修好之前，M4 可能因为假阴/假阳而不成立，此时按 I4 的降级方案只断「不新增 MISS」**。这一点必须写进测试的注释，否则下一个人会以为 M4 是硬的。

---

## 10. 对我自己这套设计的最强反驳

### 反驳

> **这套设计把三份互相矛盾的文本变成了机器管理的三份互相矛盾的文本，并且给其中一份盖了绿章。**

具体地（全部是实测数字，不是假设）：

1. 修正之后，`prompts.js` 说「column-count:2 / column-count:3（共 5 栏）」；
2. `data.js:518` 的 `def` 仍然说「左栏 5 栏窄、右栏 7 栏宽」，而 `app.js:1380` 把它**渲染在同一个产品的面板上**；
3. `_specs/S07.md:15` 仍然是错的那句（修正层刻意不改它，改了会被 `extract-specs.mjs:84` 覆盖）；
4. `deliverables/04-schemes-01-10.md` 也仍然是错的，而它是 L0 真源。

于是同一个事实有四份表述、三份是错的，而这套设计新增的 `check-corrections.mjs` 会打出 **PASS**——它检查的是「修正层是否生效」，而修正层生效恰恰意味着**fork 被固化了**。

这比修之前更糟：修之前，四份文本都是错的，所以它们**一致**（一致的错）；修之后它们不一致，而且多了个闸门说没问题。这正是 `README.md:101` 的 M01 形状，也正是 `PROMPT-SYSTEM.md` §4.3 承诺要避免的那个结局。**「记录 ⇒ 不必修」的下一代会是「修正 ⇒ 不必修源」。**

而且这套设计还给了这种状态一个**看起来负责任的形态**：有哈希、有证据、有上限、有变异测试。§9.15 的豁免表当初也是这么长出来的——每一行都有人签字。

### 为什么我不因此放弃这套设计

因为另外两个选项更糟，且已实测：

- **直接改 `_specs`**：`extract-specs.mjs:84` 无条件重写，改完下次重跑静默回退，且 `check-stale.mjs:184-201` 会立刻判 `_specs` 陈旧。**「改了会消失」比「改了有分叉」更坏**——它让人以为自己修好了。
- **只改 `04-schemes-01-10.md`（L0）**：这是唯一真源修复，也是**正确**的终态。但它要连带处理 `data.js` 的 `def`/`layout`/`landing`/`palette` 与 `11-compiled-30.md`、`12-tool-rule-audit-30-v2-authoritative.md` 里引用同一数字的地方（实测至少 5 处），且改写历史交付文档。成本高一个数量级——**但这恰好说明它才是该做的事**，而不是说明它不该做。

### 缓解（按有效性排序，第一条是实质性的）

**R1 · 修正层的输出里必须携带「这不是修好，这是止血」的标记，并且闸门必须把残余 fork 面报出来。**
即 §6 I6 的 `untilFixedIn[]` + `check-corrections.mjs` 的 WARN 汇总。修正层自身的 PASS 行必须写成：

```
[corrections] PASS 2/2 条修订生效（S03, S07）
[corrections] WARN 残余 fork 面 5 处（修正层修不到的源头）：
    data.js#def S07      「左栏 5 栏窄、右栏 7 栏宽」仍在
    data.js#layout S07   「左 5 栏右 7 栏」仍在
    _specs/S07.md:15     「正面 5 栏对背面 7 栏」仍在（extract-specs 会重写，不能手改）
    deliverables/04-schemes-01-10.md  L0 真源仍在
    ── 修正层是止血带，不是手术。彻底修好 = 改 L0 并删掉对应修订。
```

关键点是**这两行必须一起打**。只打 PASS 就是在说「解决了」，而那正是这个仓库反复付学费的那句话。

**R2 · 给修正层设一个到期压力，不是到期日。**
`cap: 2` 已经是压力（要加第三条必须动一个整数）。再加一条：`check-corrections.mjs` 对每条修订报 `ageDays`（`reviewedAt` 至今），超过 60 天仍未 `untilFixedIn` 清零的，WARN 文案升级为「这条修订已经活了 N 天，源头仍未修」。**这不是自动失效**——自动失效会让错话静默回归，比永久修订更坏。它只是让「临时措施永久化」这件事每周出现在闸门输出里。

**R3 · 终态的判据写死在文件里，不靠人记。**
`corrections.json` 顶层加一个注释字段不合法（JSON），所以在 `CORRECTIONS.md` 与 `prompts.js` banner 里同时写：

> 本修正层的**成功判据是它变空**。`entries: []` 且 `cap` 降为 0 的那一刻，才说明三句错话在源头修好了。任何让 `entries` 变长的操作，都需要先回答「为什么不在源头修」。

**R4 · 接受反驳的一部分，并把 S17 移出修正层。**
§1.1 的结论（S17 该改 `mechanisms.mjs` 而不是进修正层）就是这条反驳的第一个胜利：**能在源头修的，一律不进修正层**。于是 `entries` 从 3 降到 2，而 `mechanisms.mjs:45` 的那一改是真正的源头修复、零分叉。这个取舍是反驳逼出来的，也是本设计里我认为最正确的一个决定。

### 我还需要承认的第二个风险（不是最强，但必须说）

**fail-closed 的可用性代价**：一条烂修订 → 构建不写盘 → 30 案的提示词全部停在旧版本。若上游正在被改（比如有人正在 UPDATE `_specs`），任何人都无法重新生成 `prompts.js`，直到有人去调 `corrections.json`。

缓解：错误信息必须给出**逐条可执行的修复指令**（改 `text` + `basedOn` / 删条目），且 `check-stale` 会把这个状态报成「prompts.js 落后于 build-prompts.mjs」——链条上不会出现「看起来新鲜」的假象。另外这是**有意的**：修正层只有 2 条时，这个代价是「5 分钟改一个 JSON」；等到它有 30 条时，这个代价才是真的。**而到那时，`cap` 早就该拦下来了。** 也就是说，可用性代价由 `cap` 自动封顶——这是 I2 与 §4 之间的协同，不是巧合。

---

## 11. 落地清单（顺序不能换）

1. `prototypes/_prompts/corrections.json` — `cap: 2`，S03 + S07 两条完整条目（含 `upstreamDefect` / `evidence` / `untilFixedIn`）。
2. `prototypes/_prompts/mechanisms.mjs:45` — 改 S17 的 `text`（删 `96px`，写「1024–1439px 收为 88px 且 ≥1440 由内容撑开」）。**这一步不进修正层。**
3. `prototypes/_prompts/build-prompts.mjs` — 在 :332 与 :334 之间插入 `applyCorrections(out)`；`writeFileSync`（:370）前 `exit 1`；banner 加「人工修订 N 条」一段。
4. `prototypes/_build/check-corrections.mjs` — 新闸门：§5.2 三个时点 + §5.4 产物断言 + §6 I6 残余 fork WARN + M1–M4 的判据。
5. `prototypes/_build/check-stale.mjs:219-222` — 输入链补 4 个（`corrections.json`、`mechanisms.mjs`、`data.js`、`minitems-parsed.json`）。
6. 变异测试 M1/M2/M3 各跑一次并留证据；M4 视 I4 的 fixtures 是否就位（未就位则记为已知限制）。

已知缺口（必须写进交付说明，不许省略）：**`data.js:185/518/521/1387` 与 L0 的同一批错误句子仍然存在**。修正层修的是剪贴板，不是面板。彻底修 = 改 `deliverables/04-schemes-01-10.md` / `05-schemes-11-20.md` 并重跑 `extract-specs → extract-dna → clean-dna → build-prompts → collect-schemes`，然后**把 `corrections.json` 清空到 `entries: []`、`cap: 0`**。
