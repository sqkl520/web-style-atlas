# Lead 侦察记录：第 6 轮开工前的事实清单

> 2026-10-27 16:43 起。所有数字来自我自己的 CDP / 脚本实测。

## 已核实的事实

### F1. `minItems` 被当成「我实际有 N 个条目」

- `_prompts/build-prompts.mjs` 注释：`minItems = 同构重复单元的设计规模（不是"至少要这么多"）`
- `prompt-copy.js` 提示词：「1. **我实际有** N 个条目，就排 N 个」
- 30 案 `minItems`：`6,16,8,9,8,13,46,6,10,12,12,7,7,11,14,9,27,20,20,6,14,6,9,6,8,8,7,12,23,10`
- 中位 **10**，最大 **46（S07）** → S07 的提示词会让 AI 以为用户有 46 条内容
- **同段还有**「按实际数量收敛」（1处）+「先把数量凑到 N 个」（1处）→ 疑似打架

### F2. 模板层不在场景索引（已确认）

- `TEMPLATES` 有完整 scenes：
  - M01：律所 / 咨询 / 软件服务 / 设计工作室 / 代理商
  - M02：餐厅 / 咖啡馆 / 烘焙 / 民宿 / 理发店 / 花店
  - M03：作品集 / 自由职业 / 创意工作室 / 摄影师 / 设计师
- `prompts.js` 的 `sceneIndex`（44 词）里 `M0` **0 命中**
- `unsupported` 29 词（电商、甜品、酒吧、美甲、金融、政务、医疗…）中相当一部分有模板能套

### F3. `o.mood` 死参数（已确认）

- `buildPrompt(id, opts)` 读 `o.mood`，全库无人传值
- 函数体 `mood` 0 次读取（气质走 `SCHEMES.tone`）
- 代码注释自嘲：「`o.mood` 就是这样死了很久」

### F4. 390px 列表页首屏 0 卡片（我实测，比上一轮报的更具体）

```
viewport 390×844
header.mast   top=0    h=489   ← 其中 .mast-id 363px（标题+3行介绍），.mast-facts 74px
div.bench     top=489
  aside.rail  top=489  h=338   ← 筛选栏
  li.row[0]   top=989  h=578   ← 首个方案卡
```
**用户打开手机版首页，首屏（844px）一张方案卡都看不到。**

补充：`rail-fold`（上一轮我以为存在的折叠开关）**实际已被有意删除**。`index.html` 的注释写明：
> 「rail 限高最终改用 CSS `max-height + overflow-y`，这个 `<details>` 从未接上内容，桌面与移动端都只渲染出一条 26px 的空折叠条 —— 一个点开什么都没有的假控件，故删除。」

这个删除是**对的**（删掉了假控件），但它留下的是：rail 仍占 338px，页头仍占 489px，首屏仍是 0 卡。

### F5. 390px 详情面板

```
S15: scrollH=4461 / clientH=844 → 5.28 屏
     首个字段 top=682（首屏内 ✓）
     折叠块 4 个
```
执行 B 上一轮报「25/30 超 3800px」，与我实测的 4461 同类。

### F6. S13 的 4 条 FAIL 明细（决定性）

从 `.inspect/report.json` 与 README L346-349：

| 规则 | 消息 | 是否可修 |
|---|---|---|
| `mono` | `Monospace type outside code: DM Mono — e.g. "0.4mm"` | 已知豁免（CONTRACT §9.15） |
| `shadow` | `17 box-shadow(s) on elements at rest` | **README 说"真的未清"** |
| `button-fx` | `Buttons with shadow/glow` | 同上 |
| `empty-screens` | `3 of 6 desktop screens are almost empty ground` | 未讨论 |

**但**：S13 的设计美学是「盲压 / blind emboss」，其签名机制就是**用压痕深度表达层级**（0.4mm 压深 / 3% 亮度差 / 14% 边缘对比度）。而 `style.css` 里 15 处 box-shadow 中 13 处非零，大量使用 `var(--press-1)` ~ `var(--press-4)` 这套**压痕变量**。

→ **这不是实现 bug，是「设计意图」与「机械判据」的冲突**。闸门规则说 `box-shadow: 0`，但盲压的物理实现就是内阴影。

### F7. 闸门现状

```
26 / 4 / 30
FAIL: S07:1(mono)  S08:2(palette-terracotta, font-count)  S13:4(mono, shadow, button-fx, empty-screens)  S21:1(mono)
```

### F8. 行卡 `clamp:2` 视觉截断（口径存疑）

- 我实测 1440 档 **2 案**（S10 i18n、S18）可见末尾括号不配平
- 上一轮验证 Agent 报 **9 案**
- 差异未查清（可能是判据是否含 `【】「」` 或是否按行尾判）

## 我还没验的

- 提示词约束条数是否超 LLM 可靠执行上限（派了审计 Agent）
- 三个模板的 `scenes` 是否与各自 README 逐字一致（派了 IA Agent）
- 390px 下除页头/rail 外还有多少首屏浪费（派了移动端 Agent）
