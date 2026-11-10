# 文档腐化核查：S13 的 shadow 声称 vs 实测

2026-10-31 · 由红队与规划 Agent 独立发现，Lead 核实

---

## 1. 三份文档对同一件事的三种说法

| 文档 | 原话 | 实测 |
|---|---|---|
| `prototypes/_CONTRACT.md:110` | 「**现行欠款**：`S13` 的 17 处 `shadow` + `button-fx` 属**真未修**，不在 §9.15 允许表内——出路只有两条：迁移到 `drop-shadow`，或按 §7.4 载体补逐案批准记录。」 | S13 的 `report.json` 里 `shadow` findings = **0** |
| `README.md:425`（中文） | 「`S13` 的 `shadow` 与 `button-fx` 其实早在 `1753f94`（2026-10-27）就清了……**上一版 README 写的「shadow（17 处）真的未清」是错的**——那 17 处是静态 `lint` 计数」 | ✓ 正确 |
| `README-EN.md:425`（英文） | 「**`S13`'s `shadow` (17 occurrences) and `button-fx` have no exemption record** — the 30-scheme layer mandates `box-shadow: 0`, so those two are genuinely unresolved.」 | ✗ **与中文版矛盾** |

**结论：中文 README 已经纠错过，英文 README 与 `_CONTRACT.md` 没有跟上。**

---

## 2. 「17 处」这个数字从哪来，为什么它不算违规

### 实测 1：CSS 源码里确实有 17 处 `box-shadow`

剥掉注释后 `prototypes/S13-blind-debossed-dispatch/style.css` 里 `box-shadow` 出现 **17 次**
（含注释 24 次，注释里 7 次）。契约说的「17 处」是**静态计数**，数字本身没错。

### 实测 2：但这 17 处里只有 1 处是外投影

逐行分类：

| 值 | 处数 | 性质 |
|---|---|---|
| `box-shadow: none` | 6 处（L226/372/396/422/595/600） | **不是阴影** |
| `inset …` 系列（`--press-1` / `--press-3` / `--press-1-rev` / `--press-1-hard` / `--press-3-rev` / `--press-3-narrow`） | 8 处 | **内阴影 = 凹槽**，是本案签名机制「盲压凹槽」的实现 |
| `--press-1-off`（全 0 的 inset） | 1 处 | 等于无阴影 |
| `--press-3-edge` = `0 0 0 0.5px` | 1 处 | **是描边**，不是投影（无模糊、无偏移） |
| `--press-4` = `0 -2px 3px` | 1 处 | **唯一的外投影** |

### 实测 3：工具的判定口径

`tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs:318`：

```js
const outer = sh.split(/,(?![^(]*\))/).some((part) =>
  !/inset/.test(part) && !/ 0px 0px 0px 0px/.test(part) && !/rgba\(\d+, \d+, \d+, 0\)/.test(part));
if (outer) { ... shadowStatic++ ... }
```

**只有外投影才算 `shadowStatic`。** inset（凹槽）与零值被排除。

而 `rules.mjs:70` 的 `shadow` FAIL 依赖 `s.shadowStatic`，所以：

```
S13 report.json @1440: shadowStatic = 0  →  shadow findings = 0
```

### 实测 4：`--press-4` 那处外投影为什么没被抓到

`probe.mjs:314` 是 `for (const b of big)` —— 只遍历**大面积元素**。
`--press-4` 落在（L444）某个小元素上，未进入 `big` 集合，因此未被采样。

**这是探针的采样盲区，不是"阴影不存在"。** 但它也说明：工具的 `shadowStatic = 0`
在这个案上是「采到的样本里 0 个外投影」，而不是「整页绝对没有外投影」。

---

## 3. 裁决

### 3.1 `_CONTRACT.md:110` 的「真未修」是错的，必须改

它的错在于**混淆了两个判据**：

- 静态计数（CSS 源码里 `box-shadow` 出现 17 次）——事实，但**不等于违规**
- 运行时判据（`shadowStatic > 0`）——工具的规则，S13 为 0

契约自己承认「§9.3 允许 `filter: drop-shadow()`」，而 S13 的凹槽用的是 **`inset`**——
`inset` 连 `drop-shadow` 都不需要，它是标准的内阴影，工具明确不判它。
所以那 8 处 `inset` 不是「欠款」，是**正确的实现手段**。

**结论：S13 的 `shadow` 不属于"未修欠款"。契约那句应改为已清，并说明 17 处静态计数与实际判据的差别。**

同理 `button-fx`：S13 的 findings 里也没有 `button-fx`。

### 3.2 `README-EN.md:425` 必须与中文版同步

中文版已经纠错，英文版还是旧说法。这是**双语版的漂移**——
`check-docs.mjs` 有 `i18n/facts` 断言，但它只比「方案数/达标数/行业词数/提示词区间/警告并集」，
**不比这一类叙述性声称**，所以放过。

### 3.3 要不要动工具的采样盲区（`for (const b of big)`）

**不动。** 理由：

- 它是仓库外第三方技能库（`tools/`，`.gitignore` 第 2 行已排除），改它不影响克隆者
- 放宽 `big` 会让 30 案重新跑一遍，可能冒出大量新 FAIL，风险不可控
- 真正重要的是**知道这个盲区存在**，而不是修它

这次记录就是「知道」的载体。

---

## 4. 我（Lead）原本的判断错在哪

我此前在 P1a 报告里写「C1 FAIL 全在允许表内 2/2 → 契约 §7.2 成立」。

**那个「成立」是空的。** 因为它只查了「实测 FAIL 有没有超出允许表」，
没查「文档声称的 FAIL 是否等于实测 FAIL」。

具体到这轮：

- 实测 S13 有 0 条 shadow FAIL
- `_CONTRACT.md:110` 声称 S13 有 17 处 shadow 未修
- 我的闸门对此**完全无反应**

红队把这条总结为「断言方向反了」——守的是「多出来的 FAIL」，
而今天真正的问题是「文档写着有、实际没有」。

**这是 P1a 必须补的一条反向断言。** 见 `deliverables/73-exec/LEAD-P1a-contract-gate.md` 的修订。

---

## 5. 复算

```bash
node -e "const fs=require('fs');const c=fs.readFileSync('prototypes/S13-blind-debossed-dispatch/style.css','utf8');const clean=c.replace(/\/\*[\s\S]*?\*\//g,'');console.log('剥注释后 box-shadow:', (clean.match(/box-shadow/g)||[]).length)"
# → 17

node -e "const j=require('./prototypes/S13-blind-debossed-dispatch/.inspect/report.json');const v=j.viewports.find(x=>x.width===1440);console.log('shadowStatic:', v.metrics.surfaces.shadowStatic);console.log('shadow findings:', j.findings.filter(f=>f.id==='shadow').length)"
# → shadowStatic: 0 / shadow findings: 0
```
