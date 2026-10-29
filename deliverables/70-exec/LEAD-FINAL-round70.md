# 第 70 轮最终交付

> 完成时刻：2026-10-30 00:35
> 基线 HEAD：`03f6fd4`
> 全部验证可重跑，命令见文末

---

## 一句话

**这一轮真正的发现不是「提示词缺什么」，而是「提示词里已经有的东西没有接线」。** 四个缺陷里三个是 `O(1)` 的代码 bug，不是 `O(30)` 的数据缺口。

---

## 一、核心成果：`h1Size` 从 0/30 到 30/30

### 修复前

```
h1Size 在 dna-clean.json 里抽到 30/30
h1Size 渲染进提示词的案 = 0/30
```

**根因**：`prompt-copy.js:277` 的 `if (d.mechanism)` **恒真**——build-prompts 阶段把 mechanism 补到 30/30，所以含 `h1Size` 的 `else` 分支永不执行。

三个 Agent 独立复现了这一结论（规划 Agent 定位 + 红队反事实验证 + 我复核）。

### 我在修复过程中犯的错（EXEC-A 抓出，已修）

第一版我用 `/(\d+)px/` 抓 `h1Size` 的第一个 px：

| 案 | h1Size | 我的第一版 | 1440 实际 | 偏差 |
|---|---|---|---|---|
| S10 | `clamp(32px, 5.55vw, 80px)` | 32px | 79.9px | **−60%** |
| S11 | `clamp(46px, 7.4vw, 106px)` | 46px | 106px | −57% |
| S28 | `clamp(40px, 6.4vw, 92px)` | 40px | 92px | −57% |

**25/30 案偏低 36–60%，且方向与修复目标完全相反**——本意让 AI 把标题做大，实际给了 clamp 下限，AI 会做得更小。

### 正确修法（已实施）

1. `clean-dna.mjs` 新增 `at1440()`：把 `clamp(min, Nvw, max)` 在 1440 视口求实际值
2. `clean-dna.mjs` 新增 `bodySizeVerdict()`：抽正文字号（裸 body/p → :root 基础字号）
3. 产出 `h1SizeAt1440` 与 `bodySize`
4. `build-prompts.mjs` 透传
5. `prompt-copy.js` 第 6 条**只读不算**

### 修复后

```
h1SizeAt1440: 30/30（56–106.6px）
bodySize:     30/30（15–20px）
倍率:         3.7× – 6.7×（中位 5.2）
提示词第 6 条: 30/30 输出，与数据 30/30 一致（±1px）
```

**交叉验证**：红队独立测得「原型 h1/正文中位 5.4」，我得出 5.2 —— 独立来源吻合。

### 提示词实际输出（S19）

```
6. 字号：正文约 16px；最大标题要压到正文的 4.5 倍（约 72px）。
   比这更小就撑不出这个版式——这是本案最容易被做塌的一处。
   中间层级你按内容需要分，但**最大那一档必须够大**。
```

只加 **1 条**约束，不加字阶表。依据：批判 Agent 算出加整张字阶表 ≈ +458 条（+35%），CSE 研究（arXiv 2608.12426）显示 20 条已在崩塌区。

---

## 二、新增闸门 `check-prompts.mjs`（~380 行）

### 为什么必须建

受控 A/B（`LEAD-ab-checkdocs.mjs`）：

```
基线（HEAD 态）            exit=0   PASS 11 / FAIL 0 / WARN 1
篡改 S19 主色 → #FF00FF    exit=0   PASS 11 / FAIL 0 / WARN 1
新增的行: （无）    消失的行: （无）
```

**`check-docs` 对提示词内容零反应。** 改对改错都是绿的。

### 三条设计原则

| 原则 | 依据 |
|---|---|
| **独立来源对账** | 必须与 `style.css` 真实声明对上，不能与 `dna-clean.json` 对上（后者就是来源） |
| **纯文本、零浏览器** | 秒级。上一轮 3 案端到端要证 ≥90% 需 29 次，统计上做不到 |
| **只报可判定的** | 不判「像不像」，只判「说的和做的一致不一致」 |

### 修闸门时我自己踩的 4 个坑

第一版报 9 条 FAIL，**全部是闸门错、数据对**：

| # | 漏了什么 | 误报案 |
|---|---|---|
| 1 | `var(--band-shade)` 变量展开 | S13 的 9px（实际用了 8 处）|
| 2 | `column-rule` 属性 | S07 的 0.5px |
| 3 | `stroke-width` 的 CSS 写法**无单位** | S04 的 1.1、S09 的 3.5/3.6、S11 的 1.25 |
| 4 | `calc(var(--mis) * 2)` 求值 | S27 的 3.6 |

**教训**：闸门口径比被测数据窄时，它会指着正确的数据说它错。

最终：**FAIL 0 / WARN 1**。

---

## 三、交互态线宽的裁决

两个执行 Agent 分歧，我裁决**保留 + 标注**。

### 依据

1. **30/30 案的 `:focus-visible` 都定义了 outline**，且用各案主色：
   `S01: 3px solid var(--red)`、`S09: 3px solid var(--ink)`、`S25: 3px solid var(--spot-b)`
2. 提示词要求 AI 做键盘可用页面。抹掉 focus 环线宽 = 告诉 AI「只用 1px 和 2px」，而用户按 Tab 会看到 3px → **提示词与实现不一致，正是闸门要抓的**
3. **S25 是最直接反例**：排除后变成 `"1px、1.2px、2px"`，而规格写明的核心线宽是 3px（只在 focus 环上）

### 实施

- `lineWidths` 保留数值
- 新增 `lineWidthsInteractive` 标注出处
- 字段名从 `lineWidthsDropped` → `lineWidthsInteractive`（原名会让下一个人以为是排除清单，然后按「恢复」思路改回去）

**结果**：26/30 案保留标注，S25 的 3px 恢复。

---

## 四、`extract-dna.mjs` 剥注释（生成链可复现）

### 根因

`extract-dna.mjs:43` 读入原始 CSS 后直接抽取，**不剥注释**。而 `clean-dna.mjs:43` 才剥——它在下游。

后果：上一轮我为修 mono 问题写进 `S07/S13/S21` 的 `style.css` 注释被 `font-family` 正则吞成家族名：

```
families: […, "monospace（Chrome 实测，见 deliverables/69-exec/EXEC-mono-empty.md §2.3），
            下面把这条与其余可能因引擎而异的默认值一并还原成继承值：换标记，不换排版。 */
            code{font-family:inh"]
```

### 修复前后

| 指标 | 修复前 | 修复后 |
|---|---|---|
| 脏字体名的案（注释污染类）| **4/30** | **0/30** |
| 生成链可复现 | **1/3 产物** | **3/3 产物** |

---

## 五、`check-stale.mjs` 加提示词链守卫

### 为什么

这是**连续第二轮**出现「生成物无陈旧守卫」的同类缺陷：

| 轮次 | 遗漏 | 后果 |
|---|---|---|
| 69 | `_selection/.inspect/report.json` 冻结 6 天 | 闸门谎报 FAIL 0（实际 2 条） |
| 70 | `_prompts/dna-raw.json` 落后 S13 的 css **5065 分钟** | 2/3 产物不可复现，差点把脏字体名写进产品 |

共同点：生成物、被 git 跟踪（看起来"有版本"）、依赖会变的源文件、不在任何检查器视野里。

### 实施

新增第③节，检查三条链：

```
Sxx/style.css + index.html → dna-raw.json → dna-clean.json → prompts.js
```

### 我在这里犯的错（最危险的一类）

第一版把 `product` 写成 `'prototypes/_prompts/dna-raw.json'`，而 `P` 已经是 `prototypes/`，拼接后变成 `prototypes/prototypes/...` → `existsSync` 恒 false → **守卫静默失效**。

**它失效的样子是"全部新鲜"，看起来像通过。**

我花了六轮才定位：先用独立脚本验证逻辑正确 → 再对比"文件系统 7529 字节 vs readFileSync 5908 字节" → 最后加 `DEBUG_STALE_CHAIN` 环境变量看到 `[chain]` 一行都没打印。

修复后实测（调新 `dna-clean.json` 六分钟）：

```
⚠️ 提示词链·dna-clean(_prompts/dna-clean.json)  _prompts/dna-raw.json 落后 6 分钟
   →  node prototypes/_prompts/clean-dna.mjs
```

---

## 六、S20 机制句的量纲歧义（EXEC-A 发现，我裁决）

### 问题

机制句原文：「走线 0.35px 按 0.6/1.2/2.4px 三级分档」——读起来像「线宽分三级」，与硬约束第 5 条「线宽只用 0.35/0.5/1/3px」直接冲突。

### 裁决依据

规格 `_specs/S20.md` 字段 6 分得很清楚：

- 「绘图仪针笔单线走位，**线宽 0.35px 单线**，走线不回头…」
- 「量级用**走线间距**表达（间距 0.6px / 1.2px / 2.4px 三级…）」

EXEC-A 独立核实：`0.6/1.2/2.4` 来自 `SP=[0.6,1.2,2.4]`，经 `sp = 8 * s` 变成画布上的 4.8/9.6/19.2px（间距）；真正线宽是 `style.css:206` 的 `stroke-width: 0.35`。

### 裁决

**不是数据源矛盾，是措辞歧义。** 改一个词：

```
旧：「走线 0.35px 按 0.6/1.2/2.4px 三级分档」
新：「走线一律 0.35px 单线，量级靠走线间距 0.6/1.2/2.4px 三档表达
     ——分清粗细与疏密：粗细只有一个值，变化的是线与线的距离」
```

修完后，机制句与紧随其后的风险段「图形只允许 0.35px 单线」一致了（原来这两句互相矛盾）。

---

## 七、README 同步（两处数字）

| 文件 | 原 | 现 |
|---|---|---|
| `README.md:80` | 1639–1998 字，中位 1829 | **1799–2123 字，中位 1973** |
| `README-EN.md:80` | 1,639–1,998，median 1,829 | **1,799–2,123，median 1,973** |

### 我在这里犯的错

用 PowerShell `-replace` 批量改 README，**把两个文件的 UTF-8 编码破坏成乱码**（`git diff` 显示整篇变成 `馃寪`）。

已 `git checkout` 恢复，改用 `edit` 工具精确改，验证：
```
README.md    BOM=false  乱码字符=0
README-EN.md BOM=false  乱码字符=0
```

**教训**：中文文件不要用 PowerShell 正则批量替换。这个仓库已踩过三次同类坑。

---

## 八、最终验证（全部通过）

```
1 提示词闸门     check-prompts.mjs    FAIL 0 / WARN 1        ✓
2 文档一致性     check-docs.mjs       0 FAIL / 0 WARN / 13 PASS   ✓
3 锚点           check-anchors.mjs    ✓ 无死锚点              ✓
4 陈旧度         check-stale.mjs      ✓ 全部新鲜（30 案 + 1 入口 + 3 条链）✓
5 闸门 30 案     verify-prototype     达标 29 / 不达标 1 / 共 30 ✓（与基线一致，S08 已知豁免）
6 可复现性       三个产物             3/3 可复现              ✓
```

---

## 九、未做的事（及理由）

| 事项 | 为什么不做 |
|---|---|
| 补 55 个集合外颜色 | 53 个有份量的超纲色里，**47 个灰阶/同色相派生、5 个 AA 对比度派生、0 个真违规**。提示词原文是「不新增更多**彩色**」 |
| 补百分比配比 | 规格称 S16 主色 41.6%，像素实测 **1.4%**（虚报 30 倍）；11/30 案 Σ≠100% |
| 加字阶表 | +458 条约束（+35%），20 条已在崩塌区 |
| 继续端到端验证 | 要证 ≥90% 需 29 次，统计上做不到 |
| 改 `#6366F1` 负向句 | 30/30 提示词都点名它（闸门 WARN 抓到）。**留待下一轮**——改模板层影响面大，需单独验证 |

---

## 十、文件改动清单

```
M README-EN.md                        2 行
M README.md                           2 行
M prototypes/_build/check-stale.mjs   +59 行（提示词链守卫）
M prototypes/_prompts/build-prompts.mjs  +2 字段透传
M prototypes/_prompts/clean-dna.mjs   A+B 混合（at1440 / bodySizeVerdict / 交互态保留）
M prototypes/_prompts/dna-clean.json  重跑生成
M prototypes/_prompts/dna-raw.json    重跑生成
M prototypes/_prompts/extract-dna.mjs +16 行（剥注释）
M prototypes/_prompts/mechanisms.mjs  S20 措辞
M prototypes/_selection/prompt-copy.js  +241 行（第 6 条 + 线宽措辞）
M prototypes/_selection/prompts.js     重跑生成
M prototypes/_selection/.inspect/*     重渲染
A prototypes/_build/check-prompts.mjs  新增闸门（~380 行）
```

---

## 十一、可重跑命令

```bash
# 提示词闸门
node prototypes/_build/check-prompts.mjs

# 生成链（顺序不能错）
node prototypes/_prompts/extract-dna.mjs
node prototypes/_prompts/clean-dna.mjs
node prototypes/_prompts/build-prompts.mjs

# 检查器
node prototypes/_build/check-docs.mjs
node prototypes/_build/check-stale.mjs
node prototypes/_build/check-anchors.mjs
node prototypes/_build/verify-prototype.mjs --all
```

**关键探针**：
- `deliverables/70-plan/LEAD-verify-clause6.mjs` — 第 6 条 30/30 正确性
- `deliverables/70-plan/LEAD-ab-checkdocs.mjs` — 证明 check-docs 零反应
- `deliverables/70-plan/LEAD-repro-test.mjs` — 生成链可复现性
- `deliverables/70-plan/LEAD-adjudicate-11.mjs` — 11 个 MISSING 色分类
- `deliverables/70-plan/LEAD-verify-D5.mjs` — D5 误读的证据
- `deliverables/70-plan/LEAD-test-stale-guard2.mjs` — 守卫有效性测试

---

## 十二、留给下一轮

| 优先级 | 事项 |
|---|---|
| P1 | 30/30 提示词都点名 `#6366F1`（「反的是」）→ 改成正向表述 |
| P1 | 把 `check-prompts.mjs` 接进 README 的检查器清单 |
| P2 | `S22` 的「字号」来自机制句原文而非链路（闸门 WARN） |
| P2 | `collect-schemes.mjs:486` 的 palette 上限 4（不影响 prompts.js，但影响 data.js/选型台） |
