# 40 号报告的 39 条断言，实际做了几条

> 2026-11-17　主线程
> 这个问题一直悬着。不能用「数规则名个数」回答 —— 两套编号体系不同，
> 40 号的 T-11 对应实现里的 `typescale-degraded` 一族，一对一数会得出错误答案。
> 本文逐条对照。

---

## 一、映射表

### T 层（24 条，形状断言）

| 40 号 | 说的判据 | 实现里的规则名 | 状态 |
|---|---|---|---|
| T-01 | 开头三行自指句 + 两个空槽行 | `template-marker`（部分） | ⚠️ 部分：只查「我经营＿+。」，不查自指句 |
| T-02 | 风格行存在且唯一 | — | ❌ 未做 |
| T-03 | 调性行整句 | — | ❌ 未做 |
| T-04 | 机制句含 ≥1 带单位值 | `mech-no-measurable` | ✅ 已有（早于本轮） |
| T-05 | 四个段标题各恰好一次 | `section-missing` + `section-duplicated` | ✅ 本轮补全 |
| T-06 | 配色条 ≥3 hex + 固定句尾 | `palette-line` / `palette-empty` | ✅ 已有（部分：不查 ≥3） |
| T-07 | 字体条同时给标题链与正文链 | — | ❌ 未做 |
| T-08 | 字体纪律续行 3 空格缩进 | — | ❌ 未做 |
| T-09 | 圆角/阴影条单句号收尾 | — | ❌ 未做 |
| T-10 | 线宽条是纯 px 档位表 | `linewidth-not-in-css`（反向，非形状） | ⚠️ 部分 |
| **T-11** | **字号三件套** | **`typescale-degraded`** | ✅ 本轮 |
| **T-12** | **字号条尾两句** | **`typescale-detail`** | ✅ 本轮 |
| T-13 | 结构 1 条声明「版式规模」 | — | ❌ 未做 |
| T-14 | 结构 2 条无条件句 | `have-default-changed`（部分） | ⚠️ 部分 |
| T-15 | 结构 3 条两分支不得并存 | — | ❌ 未做 |
| T-16 | 三段编号各自连续 | `acceptance-range`（部分）+ `antidegrade-skips` | ⚠️ 部分 |
| T-17 | 防退化恰 8 条连续 | `acceptance-count` + `antidegrade-skips` | ✅ 本轮 |
| T-18 | risk 段 ≥60 字 | — | ❌ 未做 |
| T-19 | 验收三问恰 3 条 | `acceptance-range`（部分） | ⚠️ 部分 |
| T-20 | 输出要求 4 行齐全 | `template-marker`（部分） | ⚠️ 部分 |
| T-21 | 无退化标记（undefined/NaN/。。） | — | ❌ 未做 |
| **T-22** | **交叉引用真指向** | **`xref-wrong-target` / `xref-missing` / `xref-unknown-topic`** | ✅ 本轮（超出） |
| **T-23** | **验收自陈数字相符** | **`acceptance-count` / `acceptance-claim-missing`** | ✅ 本轮 |
| T-24 | 排版守卫（三重换行等） | — | ❌ 未做 |

**T 层：完全实现 5 条（T-05/T-11/T-12/T-22/T-23），部分 6 条，未做 13 条。**

### W 层（15 条，接线断言）

| 40 号 | 说的判据 | 实现里的规则名 | 状态 |
|---|---|---|---|
| W-01 | 机制句逐字等于 dna.mechanism | `mech-value-not-in-source`（反向） | ⚠️ 部分 |
| **W-02** | **字号三值复算** | **`typescale-{body,h1,ratio}-mismatch`** | ✅ 本轮（还加了 not-in-css） |
| W-03 | 配色 hex 含 dna.palette | `palette-not-in-css`（查 CSS 非 dna） | ⚠️ 部分 |
| W-04 | 线宽数字含 dna.lineWidths | — | ❌ 未做 |
| W-05 | 圆角按 radiusBare 分岔 | — | ❌ 未做 |
| W-06 | 阴影逐字等于 dna.shadow | — | ❌ 未做 |
| W-07 | 字体含 displayStack[0]/bodyStack[0] | — | ❌ 未做 |
| W-08 | 结构 1 条 N = minItems | `minpics-mismatch`（查 minPics 非 minItems） | ⚠️ 部分 |
| W-09 | 结构第 4 条始终存在 | `minpics-falsy-zero` / `minpics-missing-claim` | ✅ 已有 |
| W-10 | tone 等于 SCHEMES[id].tone | — | ❌ 未做 |
| W-11 | plain 两处逐字一致 | `plain-*` 一族（查格式不查一致） | ⚠️ 部分 |
| W-12 | 结构段条数 = (reuse?6:5) | — | ❌ 未做 |
| W-13 | reuse 第 6 条逐字等于 dna.reuse | — | ❌ 未做 |
| W-14 | 风险段前缀 = dna.risk | — | ❌ 未做 |
| **W-15** | **零图案不得要求图片位** | **`minpics-one-*` + `have-pics-*`** | ✅ 本轮 |

**W 层：完全实现 3 条（W-02/W-09/W-15），部分 4 条，未做 8 条。**

---

## 二、结论

**39 条里完全实现 8 条，部分实现 10 条，未做 21 条。**

（40 号报告标题说 38 条，实际表格是 T-01..T-24 + W-01..W-15 = 39 条。）

这个数字比「38 条全做了」差很远，也比「只做了 6 条」要好 —— 因为本轮新增的
`section-duplicated`、`xref-unknown-topic`、`acceptance-claim-missing`、
`typescale-*-not-in-css`、`unit-*` 都不在 40 号报告的编号体系里，是红队和边界扫描
带来的**额外**覆盖。

---

## 三、未做的 21 条里，哪些值得做

按「用户可感知的影响」排序：

| 优先 | 40 号编号 | 判据 | 为什么值得 |
|---|---|---|---|
| **1** | T-21 | 无退化标记（`undefined`/`NaN`/`。。`） | 一个 `undefined` 漏进提示词，用户直接看到 |
| **2** | T-09 | 圆角/阴影条单句号 | 历史真实缺陷（21 案曾输出「全部方角。。」） |
| **3** | W-12 | 结构段条数相符 | 条数不对 = 有整段被静默丢弃 |
| 4 | T-07 | 字体条两链齐全 | 只给标题链时 AI 猜正文字体 |
| 5 | W-13 | reuse 第 6 条逐字 | 现在整段无守护 |
| 6 | T-18 | risk 段 ≥60 字 | 「有这一段」≠「有内容」 |
| 7 | T-13 | 结构 1 条声明「版式规模」 | 历史缺陷「我实际有 N 个」的守卫 |
| 8 | T-15 | 结构 3 条两分支不并存 | 13 案曾同时命中矛盾两分支 |

**不建议做的**：T-02/T-03（风格行/调性行唯一性）、T-08（3 空格缩进）、T-24（排版）。
这三类要么是纯排版洁癖，要么改动模板时必然要动，断言会频繁误报。

---

## 四、一条方法上的记录

**「做了几条」这个问题，用规则名个数回答会错得很离谱。**

现在 `check-prompts.mjs` 有 61 个唯一规则名（64 处 add 调用），而 40 号报告只有 39 条断言。
61 > 39，但实际覆盖率远低于 100% —— 因为：

- 有些规则名是同一个概念的多条判据（`typescale-degraded` / `typescale-detail` /
  `typescale-*-mismatch` / `typescale-*-not-in-css` 六条都属 40 号的 T-11+W-02）
- 有些规则名根本不在 40 号报告里（`section-duplicated`、`xref-unknown-topic`、
  `acceptance-claim-missing`、`unit-*`、`why-missing`）

**只有逐条对照原文判据才能回答。** 这与本仓库反复出现的「数个数会骗人」是同一条教训。

---

## 五、复算命令

```bash
# 40 号报告的断言清单
grep -oE '\| \*\*(T-[0-9]+|W-[0-9]+)\*\*' deliverables/78-northstar/_probe/40-text-level-assertions.md | sort -u

# 实现里的规则名
grep -oE "add\('(FAIL|WARN|INFO)', (sp\.)?id, '[a-z0-9-]+'" prototypes/_build/check-prompts.mjs \
  | sed "s/.*'\([a-z0-9-]*\)'$/\1/" | sort -u
```
