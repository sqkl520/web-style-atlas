# P2 · `fonts` 字段改名：消除同名不同形状

2026-10-31 · 开工 HEAD `0d3d499`

---

## 1. 问题

这个仓库有两条数据链，各自有一个叫 `fonts` 的字段，**形状完全不同**：

| 链 | 字段 | 形状 | 内容 |
|---|---|---|---|
| `_specs/*.md` → `collect-schemes.mjs` → **`data.js`** | `fonts` → **`fontsSpec`** | **字符串** | 规格字段 4 的原文，30 案合计 11,192 字（min 228 / 中位 360.5 / max 514 / 均值 **373** 字） |
| `style.css` → `clean-dna.mjs` → **`prompts.js`** | `dna.fonts` | **对象** | `{display, body, mono, displayStack, bodyStack}` |

> ⚠️ 本文件初版写「约 775 字」，是错的（锐评验收实测 avg 373.1、max 514）。775 比本仓库最长的字段还长。
> 已同步修正 `collect-schemes.mjs:354` 与 `app.js:236` 两处注释。

同名不同形状。读代码的人会以为是同一个东西。

这个猜测**已经在仓库里留下了痕迹**——`prompt-copy.js:180` 有一段兼容分支：

```js
} else if (d.fonts && d.fonts.length) {
  for (var i = 0; i < d.fonts.length; i++) {
    var f = d.fonts[i];
```

它的注释解释这段是「万一 fonts 是数组」。而**两条链现在都不产生数组**——`data.js` 是字符串、
`prompts.js` 是对象。这段分支是死代码，也是"同名不同形状"这个问题的化石证据。

## 2. 改法

把 `data.js` 的字段从 `fonts` 改名成 **`fontsSpec`**（`Spec` = 规格原文，一眼看出是哪条链的）。

### 改动面实测：3 个文件 4 处代码

**改名本身**只碰 3 个文件：

| 文件 | 行 | 改什么 |
|---|---|---|
| `prototypes/_build/collect-schemes.mjs` | 364 | `fonts:` → `fontsSpec:`（生成器，**不能手改 data.js**） |
| `prototypes/_build/collect-schemes.mjs` | 732 | 诊断输出 `miss((r) => r.fonts)` → `r.fontsSpec` |
| `prototypes/_selection/app.js` | 239 | 搜索索引 `r.fonts` → `r.fontsSpec` |
| `prototypes/_selection/app.js` | 1357 | 字段展示 `field('字体策略', r.fonts)` → `r.fontsSpec` |

**另有 6 个 tracked 文件是重渲染的顺带产物**（不是改名的一部分，必须分开看）：

`data.js`（生成物本身）、`.inspect/report.json` ×3、`.inspect/*.jpg` ×2、`self-gate.js`。
它们的 diff 来自 `render-scheme.mjs` 的 `at` 时间戳与元素计数变化，与改名无关。

> ⚠️ 本文件初版写「改动面实测 4 处」，把重渲染产物混在了一起。锐评验收指出应为「9 个 tracked 文件、其中 3 个是改名」。已分两张表。

### 为什么是替换而不是新增

**保留旧名一并输出是错的**——那等于让两个名字继续并存，问题原封不动。
所以 `data.js` 现在只有 `fontsSpec`，`fonts` 归零（实测 `'fonts' in r` → 0/30）。

### 关于兜底分支：最终删掉了（锐评验收后改主意）

初版写了 `r.fontsSpec || r.fonts`，理由是给「改了生成器、还没重跑」的中间态兜底。

**锐评 Agent 做了一个决定性实验**：把 `data.js` 的 30 处 `fontsSpec` 全部退回 `fonts`
（模拟"改名没做完"），**六个检查器全绿、exit 全 0**。

所以：
- 「6 个检查器全绿」是真的，但它**证明不了这个改法是安全的**——那六个根本不看这个字段
- 兜底的唯一实际效果，是让「改名没做完」**永远无法被观测**
- 而且 `field()` 在 `app.js:1144` 是 `if (!val) return ''`，`undefined` 与空串**输出完全相同**
  ——所以兜底在可观测行为上是恒等变换（作用为 0），却掩盖了状态

**结论：删兜底 + 补闸门**（锐评给的二选一，选了这条）。

### 补的闸门：`check-twolines.mjs` 的 R8

```
R8 data.js 的 fontsSpec 非空       30/30
```

判据用「键存在且非空」而不是「键名等于 fontsSpec」——前者能抓「改名没做完」
（键变回 `fonts`，`fontsSpec` 为 undefined），后者只是把常量再写一遍。

**变异测试 `deliverables/73-verify/ab-r8.mjs` 4/4**：

| 变异 | 结果 |
|---|---|
| M1 全部 30 处 `fontsSpec` 退回 `fonts` | ✓ 抓到，R8 **30/30 → 0/30**，exit 1 |
| M2 只把 S01 一处退回 | ✓ 抓到，R8 29/30 |
| M3 把 S01 的改成空串 | ✓ 抓到，R8 29/30 |
| M4（反向）只改内容、保留键名 | ✓ 仍绿 |

## 3. 验证（`deliverables/73-verify/verify-p2-fonts.mjs`）

| 检查 | 结果 |
|---|---|
| `app.js` 里还有裸 `r.fonts` 吗 | 3 处命中，**全部**是回退或注释，无裸读 |
| 搜索索引含 `fontsSpec` | ✓ |
| 字段展示读 `fontsSpec` | ✓ |
| **用每案 fontsSpec 里第一个字体名反查搜索** | **命中 30 / 未命中 0** |
| 与 HEAD 的字符总数对比 | HEAD `fonts` 11,192 字 / NOW `fontsSpec` 11,192 字，**差 0** |
| 逐案内容一致 | **30/30** |

「字符总数差 0 + 逐案内容一致」这一对证明：改名**没有丢任何内容**，只是换了键名。

## 4. 闸门

改名后全链重跑：

```
check-prompts    合计 FAIL 0 / WARN 0
check-twolines   合计 FAIL 0 / WARN 0
check-contract   合计 FAIL 0 / WARN 0 / INFO 1
check-docs       README.md: 0 FAIL / 0 WARN / 13 PASS
check-stale      ✓ 全部新鲜
check-anchors    ✓ 无死锚点
```

`check-stale` 在改 `app.js` 后正确报出「选型台落后 2 分钟」——守卫在工作，重渲染后转绿。

## 5. 收益与代价的诚实评估

**收益**：读代码的人不会再误以为两条链的 `fonts` 是同一个东西。
`prompt-copy.js:180` 那段死分支的存在证明这个误读**真实发生过**。

**代价**：
- 4 处改动，其中 1 处是生成器（改错会导致 `data.js` 全量重写失败，但它有 diff 可查）
- 2 处回退分支成为死代码（未来可以删，但现在保留更安全）

**没做的事**：
- **没有删 `prompt-copy.js:180` 那段死分支**。它读的是 `prompts.js` 的 `dna.fonts`，
  与 `data.js` 无关；删它属于另一项清理，混在这次改动里会让 diff 难以 review。
- **没有把 `prompts.js` 侧的 `dna.fonts` 也改名**。它是对象、形状正确，
  且 `prompt-copy.js` 有 6 处引用它；改它风险大收益小。

## 6. 复算

```bash
node prototypes/_build/collect-schemes.mjs          # 重新生成 data.js
node deliverables/73-verify/verify-p2-fonts.mjs     # 6 项验证
node prototypes/_build/render-scheme.mjs _selection # 重渲染选型台
```
