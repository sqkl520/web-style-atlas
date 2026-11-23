# 2026-11-23 多 Agent 编排记录

> 基线 commit：`6482356`（派出时工作树干净）
> 规划 Agent 用时 39 分钟、168 次工具调用、19.8 万 token。

## 派出的 7 个专家 Agent

| 编号 | 角色 | 文件所有权 | 与其他 agent 的关系 |
|---|---|---|---|
| **A1** | 判据重建者 | `_probe/_font-fallback-chain.mjs` | 与 A3 冲突（C1）：不得自带变量展开，必须 import `_css-fonts.mjs`；A3 有否决权 |
| **A2** | 反例夹具制造者 | 新建 `_probe/_font-fixtures.mjs` | 与 A1 交叉质疑：成功标准是第一轮让 A1 红 |
| **A3** | 共享实现审计者 | `_blindtest/_css-fonts.mjs` + 其自测 | 持 A1 的一票否决权 |
| **A4** | 提示词修法设计者 | 只出提案，不落地 | 与 A5 交叉质疑 |
| **A5** | 修法反例猎手 | 不改文件 | 打 A4 的 8 个向量 |
| **A6** | 渲染层对账者 | 只读 | 产出唯一因果证据，裁决 A4/A1 的方向 |
| **A7** | 判据盲区审计者 | 新增合成案 | 对 `score.mjs` 做负对照 |

**A8（文档对账）未派**——按 C5 串行依赖，必须等 A1 终版输出落地才能派。

## 规划 Agent 推翻的三条前提（我已逐条核实）

### ① 「38 份里只有 1 份够长 = 3%」已作废
现版输出 30/38 = 79% 有退路。那个 3% 是通用族被过滤掉的产物。

### ② 我上一轮加的「正对照」本身是脏的
`noFallbackRate()` 把这两种都算成「无退路」：
- `font-family: inherit`（原型 S01:174、S07:217、S09:232 都有）
- `@font-face{font-family:"Barlow"}` 里的**定义**（S04 有 3 处）

核实：`grep "font-family:\s*inherit"` 在 S01/S07/S09 命中；`@font-face{font-family` 在 S04 命中 3 次。
**原型真实「无退路」是 0/35，不是 9/35。** 所以我打印的那句
「原型的比例不低于产物 ⇒ 这条判据没有可靠合格线」是**错的**。

### ③ 被点名的失败形态（等宽链只有 1 个族）量的是提示词不是产物
35 份提示词的等宽槽给出多于 1 个族名的是 **0/35** —— `monoFamily()` 只返回一个族。
产物照做，**这是合规不是失手**。

## 真缺陷（规划 Agent 用修正口径量出，我已抽验）

**判据 A：有声明不以通用族结尾**
```
产物 10/38 = 26%   原型 0/35 = 0%   Fisher 双侧 p = 0.0011
```

抽验：
```
产物 S01:29   font-family: "Noto Sans SC", "Source Han Sans SC";        ← 缺 sans-serif
原型 S01:20   --f-text: "Noto Sans SC", "Source Han Sans SC", sans-serif;   ← 原型有
产物 S19:25   font-family:"Noto Serif SC",Georgia;
```

提示词自相矛盾：
- 第②条（每案字体行）含通用族 **0/35**
- 第③条（来源约束）举的例子含通用族 **35/35**

## 规划 Agent 列的测量层负债（4 条，会让任何修法的验收失真）

1. `_css-fonts.mjs` 两处硬缺陷：不排除 `@font-face` 块、不解析 `font:` 简写
2. 它的 73/73 等价是**假绿**：只跟有同一盲区的实现比
3. `score.mjs:595` 的 ④ 局部装饰放行近乎恒真（28/38 份产物含 latin/masthead/装饰/局部）
4. 38/38 份产物的 `_prompt.txt` 与现构建不同，`_DONE.json` 存在数 0/38

## 验收双条件（裁决用）

一条判据要升级成 `fail:true`，必须**同时**满足：
- 原型 0 违规
- 产物显著劣于原型（Fisher p < 0.01）

只满足一条一律 `fail:false`。这条直接判死了「等宽链 1 族」。

## 全局验收（收口时跑）

```bash
node prototypes/_build/quarter.mjs --dry-run                          # 28 步
node deliverables/78-northstar/_probe/verify-research.mjs             # 27 项
node deliverables/78-northstar/_blindtest/score.mjs --selftest        # 105/105
node deliverables/78-northstar/_blindtest/score.mjs --positive-control # 35 原型 / 0 违规 / 0 豁免
```

硬指标：
1. 回退链判据的原型侧读数为 **0/35**（不是 9/35）
2. 产物侧判据 A 为 **10/38**，脚本自己给 p 值
3. 「等宽链 1 族」不再作为产物 FAIL，而是显式标注「提示词侧只给 1 个（0/35 案给多族）」
4. 文档里所有字体链数字只有一个来源命令
