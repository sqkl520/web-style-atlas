# 传参 bug 之后的计划：13 个盲测里哪些需要重跑

> 2026-11-14　规划 Agent
> 只写这一份文件，未改动任何已有文件，未跑沙箱。
> 复算命令全部在 §九。凡是没有实测支撑的地方，明确写「推测」。

---

## §零 结论先行

### 0.1 十案的产物是**有效的**，不需要重跑

这不是判断，是测量。判据与结果：

**这个仓库里唯一一次「零知识命中」发生在传参 bug 期间，而它命中的是产品提示词里的独有值。**

```
把「本案提示词里有、其余 37 份提示词里都没有」的值挑出来（判别值），
再看产物里有没有。这是「模型没有按提示词做过」这个假设下不可能命中的东西。
```

| 案 | 判别 px（38 份提示词中独有） | 产物命中 | 判别 hex（38 份中独有） | 产物命中 |
|---|---|---|---|---|
| S04 | `1.1` | 1/1 | 4 | 4/4 |
| S08 | `10`, `200` | 2/2 | 5 | 5/5 |
| S13 | `5.5`, `14.5` | 2/2 | 4 | 4/4 |
| S15 | — | — | 4 | 4/4 |
| S18 | — | — | 5 | 5/5 |
| S22 | `16.5` | 1/1 | 4 | 4/4 |
| S29 | `75` | 1/1 | 6 | 6/6 |
| S31 | `60`, `34`, `104` | 3/3 | 0 | — |
| S32 | `118` | 1/1 | 7 | 7/7 |
| S35 | — | — | 6 | 6/6 |
| **合计** | **11 个** | **11/11** | **45 个** | **45/45** |

11 + 45 = **56 个判别值，56 个全中**（复核脚本 ② 输出 `TOTAL discriminators: 63 hits: 63`，
多出的 7 个来自 S99：2 个 px + 5 个 hex，同样全中）。而 S98 的 thinking 草稿里那 5 个 hex
（`#F2F0EC #5F5B55 #DEDAD3 #55514B #8A857C`）在**全部 35 份产品提示词里只出现于 S31 一份**
（逐个查过 `prompts.js` 里每个 hex 的出现次数都恰好是 1）。沙箱里这 5 个值只存在于 `task.txt`
（`_run.ps1` 里 `$msg` 265 字符不含任何 px 或 hex；仓库被 Deny ACE 挡住）。**猜不出来。**

S31 的判别值 `60/34/104` 是最硬的一组：它们**只出现在 S31 的 `task.txt`**，
既不在 `_run.ps1`（`$msg` 265 字符，不含任何 px），也不在仓库（被拒），
也不在模型先验里（`60px` 主刻度 + `34px` 刻度长 + `104px` 字号，三者同时命中的概率相当于零）。

**所以任务书里那条「关键区分」（模型是否通过 Read 拿到了完整产品提示词）已经有答案了：
拿到了，而且照着做了。** 判定方法见 §1.1 L0，它对模型内部路径不做任何假设。

### 0.2 但 13 案里确实有一案要重跑：**S21**

不是因为它可疑，是因为**它从未产出过任何东西，而它和所有其他案一样落在「有数值」那一格**。

```
S21  task.txt 6 个 px 值、3 个独有 hex、机制句完整
     实测结局：api_error（Connection lost），0 次 Write，文件不存在
     _staged/ 里没有 S21 的任何副本
```

`27-rerun-critique.md:264-273` 用 S21 反驳「零产物是无数值的专属现象」—— 那条反驳**成立**，
但它同时说明 S21 是一个**悬空的格子**：十案全绿、S98 作废、S97 泛化成立，
唯独 S21 这个「有数值但没跑成」的点从来没被填上。它不改变「提示词有效」这个结论，
但它改变「这个结论有 10 个样本还是有 11 个」。

> ✅ **2026-11-14：这一格已填上。** S21 重跑成功 ——
> `out.html` 27,557B / 426 行 / `</html>` 闭合，判别值 3/3，
> `_artifact-validity3.mjs` 复核配色 5/5、字号比 5.4 命中、机制值 2/2、字体 3/3。
> 十一案变十二案，判别值 64 → 67。详见 `34-s21-rerun.md`。

### 0.3 重跑最小集合：**1 案 × 2 次（S21），加上 1 次 5 分钟的管道空跑。**

```
前置  P1  argv 端到端验证（30 秒，1 次真实调用）        $0.01
最小集 R1  S21 第 1 次                                  ~2.9 h  $7~9
条件 R2    S21 第 2 次（仅当 R1 trusted 且 L1 成立）      ~2.9 h  $7~9
──────────────────────────────────────────────────────
最可能：1 案 1 次 + 前置，约 3 小时，$7~9
最坏：  1 案 2 次 + 前置，约 6 小时，$14~18，跨 1 个夜间窗口
```

### 0.4 我不建议重跑十案，理由是可执行的，不是「不划算」

| 被问到的理由 | 我的回答 | 证据 |
|---|---|---|
| 「模型只收到 Read，产物不是照提示词做的」 | **已被实测推翻**：63 个判别值全中 | §0.1 |
| 「产物可能部分有效（缺元指令）」 | 元指令也被读回来了：模型 `Read` 了 `_run.ps1`，`$msg` 全文在里面 | `_s99-stream-final.jsonl` 第 3 条 tool_use |
| 「重跑才知道稳不稳」 | 稳定性已有 13 份产物、24 个判定格、23 个一致 | `20-reproducibility.md` §0.1 |
| 「重跑才有干净样本」 | 传参 bug 影响的是**元指令**（约束模型行为），不是**产品提示词**（内容）；判别值证明内容通道是通的 | §0.1 |

**一句话**：十案要重跑的前提是「产物不是照提示词做的」。这个前提被 63 次零知识命中否掉了。
**再跑一遍只会得到同一批数，换掉的是 30 小时和 $93。**

---

## §一 旧产物有效性判据（可执行）

### 1.1 三层判据，每层都能被单独跑出来

这套判据的目的是回答一个问题：**这份产物能不能作为「这份提示词做得出这个页面」的证据。**
分三层，任一层的任一条不过，该产物降级为「只可用于检查度量器」。

#### L0 通道层（这份产物是照提示词做的吗）

| 检查 | 判据 | 实测 |
|---|---|---|
| ① 产品提示词完整送达 | 沙箱 `task.txt` 的 md5 == `blind/<id>/task.txt` 的 md5 | `_blindbox-batch.ps1:39` 用 `Copy-Item`，逐字节相同；S99 的 `Read` tool_result 去行号后与 `task.txt` `===` 为真 |
| ② **判别值命中**（核心） | 该案提示词里「其余 37 份提示词都不含」的值，在产物里出现 ≥1 个 | 表 §0.1：10/10 案命中，十案共 56 个值；连 S99 共 63 个 |
| ③ 元指令到手（弱判据，只影响「行为约束」类观测） | stream 里出现 `Read ...\_run.ps1`，且 tool_result 含 `Read task.txt in this directory` | S99 实测：`_run.ps1` 读到 1840 字符，`$msg` 全文在内 |

**② 是可判据的充分条件**：若模型没读到提示词，它无法产出「只存在于那份提示词里的值」。
①③ 是解释性证据，用于回答「为什么 ② 成立」。

> **为什么不用「有没有 Read task.txt」当判据**：那只是路径证据。
> S97 的 stream 已丢（`C:\tmp` 被清），但它的产物里 10 个自选色值一个都不在提示词里——
> 这本身就是「它读到了一份无色彩约束的提示词」的证据（S97 是手写的泛化提示词，0 个 hex）。
> 路径证据会随 tmp 一起丢，值证据留在产物里。

#### L1 产物层（这份产物是完整的吗）

| 检查 | 阈值 | 10 份实测 |
|---|---|---|
| `</html>` / `</style>` 各 1 个 | == 1 | 10/10 |
| CSS 花括号净差 | == 0 | 10/10 |
| 占位标记（`TODO`/`待补`/`lorem`/`省略`） | == 0 | 10/10 |
| 正文可见字符 | ≥ 300 | 1053 ~ 5361 |
| 产物 mtime 与 stream 最后写入差 | ≤ 120 s | `20-reproducibility.md` §4.2：全部 ≤ 68 s |

#### L2 数值层（产物对不对）

| 指标 | 判据 | 10 份实测 |
|---|---|---|
| 配色（缺） | 提示词的 hex 全部出现 | 52/52 |
| 配色（多） | 产物不得含提示词之外的彩色（UA 默认色除外） | 0 例超用 |
| 字号比 | `最大 font-size`（含 `clamp()` 取上界、`var()` 展开）相对提示词倍数偏差 ≤ 2% | 最大 1.38%（S22） |
| 线宽**包含性** | 产物里所有 line 属性（`border*`/`outline*`/`column-rule`）的值都取自提示词档位 | 8/10（见下） |

**L2 线宽判据必须改方向**。现行 `_batch-compare.mjs:133` 判的是「提示词给的每一档都用上了」：

```js
return ![...gotLW].some((v) => Math.abs(v - n) < 0.6 || Math.abs(v - Math.ceil(n)) < 0.01);
```

而产品提示词的原话是**包含性**的 —— 35/35 份都写「全站线条都从这几级里取」，
**0 份**要求「每一级都用上」（实测 35/35 命中 `/全站线条都从这几级里取/`）。
于是现行判据做了两件错事：

1. **它比提示词严**：把「少用一档」记成失败，而提示词没要求用全。
   实测 4 案是这种假失败：S13 缺 `9/14.5`（`var(--w9)` 引用 0 次、`var(--w145)` 2 次）、
   S15 缺 `0.5/1`（`var(--l05)` 0 次、`var(--l1)` 0 次）、S18 缺 `4`（`var(--w5)` 2 次，但用在 `width` 不是 `border`）、
   S29 缺 `1`（CSS 里 `1px` 只出现在 `padding` 与 `vertical-align`）。
2. **0.6px 容差让它恒真**：`0.5/0.8/1/1.2` 四个档位全都会被 `Math.abs(v-n)<0.6` 或 `Math.ceil(n)` 吞掉。
   实测 `miss([0.5,0.8,1,1.2,2,3], {1,2,3})` 返回 `[]` —— **S15 只用了 `{1,2,3}` 也算「6/6 全中」**。
   这正是 `MEMORY.md` 记的「断言恒真」那类缺陷。

**按包含性重测的结果**（把 `var()` 展开、只取 line 属性、容差 0）：

```
S04 1,1.1,3        用 1,1.1,3            合规
S08 1.25,2,3,4     用 1.25,2,3,4         合规
S13 1,1.5,2,3,5.5,9,14.5  用 1,1.5,2,3,5.5   合规（9/14.5 只声明未使用）
S15 0.5,0.8,1,1.2,2,3     用 0.8,1.2,2,3      合规（0.5/1 未使用）
S18 0.8,1,1.25,2,4        用 0.8,1,1.25,2     合规（4 用作 width）
S22 1,3            用 1,3                合规
S29 0.4,0.6,1,1.2,2,3,6   用 0.4,0.6,1.2,2,3,6  合规（1 只用在 padding）
S31 1              用 1,**3**            **违反**：`--tick-major-w:3px` 被 6 处 line 属性使用
S32 1,2            用 1,2                合规
S35 1,2,3          用 1,2,3              合规
S99 1,2            用 1,2,**6**          **违反**：`border-left:6px solid var(--accent)`
```

**S31 的违反是提示词自己的内部矛盾**，不是模型没听话：
`task.txt:6` 的机制句明写「3px 宽」的主刻度，而 `task.txt:13` 写「线宽只用这几级：1px」。
模型选择了机制句（做出了正确的 3px 主刻度），这是**正确的取舍** —— 机制句是本案的签名动作。

这暴露一条比重跑更值钱的产品缺陷：**35 份提示词里有 2 份自相矛盾**
（S27「描边…1.8px 位移」与档位表；S31「主刻度 3px 宽」与档位表只有 1px），
而闸门 `check-prompts.mjs` 的 D3 只检查机制句「有没有」可测值，不检查「与档位表是否相容」。

### 1.2 一句话判据（给不看长文的人）

> **拿该案提示词里「其余 37 份都没有」的值，去产物里搜。搜到 ≥1 个 → 产物有效。
> 一个都搜不到 → 该产物只能用来测度量器。**

现行 10 案全部搜到（§0.1）。S97 / S98 的判别值是 0 个（手写提示词），
这条判据对它们不适用 —— 它们的结论由设计（正/负对照）给出，不由判别值给出。

---

## §二 重跑最小集合与样本量

### 2.1 逐案判定：13 案里哪几案需要重跑

| 案 | 产物 | 判别值 | 该不该重跑 | 理由 |
|---|---|---|---|---|
| S04 | 有，完整 | 5/5 | **不跑** | L0①②③ 全过 |
| S08 | 有，完整 | 7/7 | **不跑** | 同上；且已有 3 份产物、8-gram 0.926/0.965 |
| S13 | 有，完整 | 6/6 | **不跑** | 同上；线宽「缺档」按包含性判据是假失败（§1.1） |
| S15 | 有，完整 | 4/4 | **不跑** | 同上；5 个 hex 在 38 份提示词里独有、4 个全中（另 1 个是 UA 白） |
| S18 | 有，完整 | 5/5 | **不跑** | 同上 |
| S22 | 有，完整 | 5/5 | **不跑** | 同上；`81px` 是 38 份提示词里独有值 |
| S29 | 有，完整 | 7/7 | **不跑** | 同上；`75px` 独有 |
| S31 | 有，完整 | 3/3 | **不跑** | `60/34/104` 三个值只在它自己的提示词里出现过 |
| S32 | 有，完整 | 8/8 | **不跑** | `118px` 独有；`100px` 未用但 `101px` 达成 6.31 倍（判据是「约」） |
| S35 | 有，完整 | 6/6 | **不跑** | 同上；机制句的 `$` 提示符/输出行/命令 三处词汇在产物里都出现（机制句结构复现，非逐字） |
| S97 | 有，完整 | 0（无数值） | **不跑** | 正对照，结论已定（自选 10 色、零机制引用） |
| S98 | **无** | 0 | **不跑** | `28-s98-relevance-check.md`：35/35 案 dna 六字段全非空，产品不会进入「有机制无数值」 |
| **S21** | **无** | 提示词有 3 个独有 hex | **跑，1 案** | **唯一一个「有数值、提示词健全、却从未产出」的格子** |

**为什么只有 S21**：其余 12 案要么有产物且判别值全中，要么（S98）测的是产品不存在的状态。
S21 是唯一的「空位」，而且它的空位**不是设计造成的**（不是负对照），是 `Connection lost` 打断的。

### 2.2 样本量：**1 次，第 2 次条件性**

```
R1 跑完 → 判 run.json.trusted ∧ L1（完整性）∧ L2（3 个独有 hex 命中）
  ├─ 全过 → 停。1 个样本 + 现有 10 案 = 11 案，与十案同级
  └─ trusted=false 或 L1 不过 → 当晚不跑第 2 次，先查管道（见 §六 坑 2）
      管道查清后再跑 R2
```

**为什么不跑 2 次打底**：十案已经给出「数值层 13 份产物零翻转、内容层允许漂移」这个结论，
S21 要回答的不是「稳不稳」，是「这一格能不能填上」。**1 次可信运行就填上了。**
第 2 次的信息增量是「S21 也稳」，而这一点已由另外九案的 13 份产物覆盖。

**为什么不是 0 次**：S21 的空位是唯一的「有数值但零产物」案例。它不填，
「提示词有效」这句话的样本量就永远是 10 而不是 11，而 10 这个数里有一个（S98）已经被作废。

> ✅ **已执行。** 2026-11-14 04:58–07:12 跑了一次，成功。
> 实际耗时 134 分钟（估算 2.9 小时，偏差在合理范围）。
> **不需要第 2 次** —— 本次的判别值 3/3 已经把它钉进证据链，
> 再加一次的增量是「S21 也稳」，而这一点由另外十一案的产物覆盖了。

### 2.3 S98 / S97 / S99 的地位

| 案 | 地位 | 依据 |
|---|---|---|
| S97 | **有效**（正对照） | 产物 466 行完整；提示词本身就是泛化的，判别值不适用 |
| S99 | **有效**（负对照 A，虚构风格） | 判别值 7/7 全中；`#E8E3D9 #1F2A2E #7A8C8E #3C4A4D #C9A227` 这 5 个色在 38 份提示词里只属于 S99；且 stream 里 `Read S99\task.txt` 的 tool_result 与 `task.txt` `===` 为真 |
| S98 | **作废**（不是传参的原因） | `28-s98-relevance-check.md`：产品 35 案的 dna 六个字段全非空、机制句零数字案 0 个 —— 产品不产出这种提示词 |

**S99 有一条要记的**：`_s99-stream-final.jsonl` 里 `type=result` 事件数为 **0**
（跑完被中止，没有 result 行）。它不能用来讨论「耗时」「token」「模型能力」，
但**可以**用来讨论「产物内容 vs 提示词」—— 判别值命中的是产物，与 result 行无关。

---

## §三 时间窗与成本

### 3.1 成本基线（全部取自 `stream.jsonl` 的 `duration_ms` / `total_cost_usd`）

| 案 | 小时 | 花费 | 备注 |
|---|---|---|---|
| S35 | 0.47 | $1.33 | 最快 |
| S32 | 1.20 | $2.76 | |
| S22 | 2.34 | $4.36 | |
| S13 | 2.87 | $2.08 | |
| S18 | 3.17 | $7.95 | |
| S08 | 3.20 | $22.73 | 最贵 |
| S31 | 3.40 | $4.25 | |
| S04 | 4.16 | $0.80 | |
| S98 | 4.27 | $0.62 | 零产物 |
| S15 | 4.37 | $38.25 | 最久 |
| S29 | 4.91 | $8.86 | 两会话合计 |

十案串行合计 **30.1 小时 / $93.37**（`20-reproducibility.md:240` 的「35.1 h / $95」含 S97+S98）。

### 3.2 S21 的成本（外推）

S21 无历史 `duration_ms`（stream 已丢），用同类案外推：

```
中位数（S13 2.87 / S18 3.17 / S22 2.34 / S32 1.20）→ 约 2.9 小时
花费：$2.08 ~ $7.95 之间，取 $7（S18 3.17h/$7.95 最接近）
```

**R1 预算 3.5 小时 / $8；R1+R2 预算 7 小时 / $16；加前置验证共 $16.01。**

### 3.3 时间窗：只有 0–7 点

`25-gateway-diagnosis.md:§3.2` 实测：本地 00h–07h 的 524 率 **0%**，16h–22h 是 **37%–71%**。

```
一个夜间窗口 = 7 小时
R1（3.5 h）→ 可以在一个窗口内跑完，还剩 3.5 h 余量给重试
R1 + R2（7 h）→ 正好一个窗口，无余量；建议分成两个窗口
```

**具体建议**：
```
Day A 白天     P1 argv 验证（30 秒）+ 判据脚本（§1.1 的三层判据，0 元）
Day A 00:00    R1 S21 起跑（-TimeoutSec 5400，-MaxRetries 4，退避 @(120,300,600,900)）
Day A 上午     判 R1（run.json + L1 + L2，10 分钟）
Day A 晚        若 R1 不过 → 查管道；若 R1 过 → 结束
```

### 3.4 一个被低估的成本项：**S21 的产物落盘位置**

`_blindbox-batch.ps1:38` 每案开跑前 `Remove-Item $taskDir -Recurse -Force`。
所以同一案跑两次会**静默覆盖**第一次的证据 —— 这是 `10-RERUN-PLAN.md` T7 记的缺口，
至今未修（实测 `grep -rn "RunTag" _probe/*.ps1` → 0 命中）。

**S21 只跑 1 次可以绕过这个缺口**，但仍必须**跑完立刻把 `out.html` + `run.json` + `stream.jsonl` 复制进 `_staged/`**。
`C:\tmp` 已经被系统清过一次，十案产物全丢，靠 `_staged/` 的副本才留下证据。

---

## §四 并行度

### 4.1 硬约束：Deny ACE 按账户生效

```powershell
icacls D:\Web\style /deny ClaudeBlindBox:(OI)(CI)(RX)
```

`_blindbox-batch.ps1:1-9` 写明：几个沙箱重叠时，任一撤 Deny 都会**静默解隔离**其余，
产物看起来 100% 正常、`trusted === true`、数值全中 —— **没有任何判据能发现**。

**所以所有 R 任务串行。**

### 4.2 第二账户能救回并行吗？**能，但我不建议这次用**

实测 `net user` 显示 `ClaudeBlindBox` 与 `ClaudeBlindBox2` 两个账户都在。
理论上一案一账户可以真并行。**但这次的量只有 1 案 1 次**，并行的收益是 0，
而风险是「隔离静默失效且不可检测」。`10-RERUN-PLAN.md` 坑 4 已经把这条列为明确否决方向，
我同意，且本计划不需要碰它。

### 4.3 并行图（本计划）

```
第一批（全离线，可并行，0 元）
┌────────────────────────────────────────┐
│ P1  argv 端到端验证（30 s，$0.01）        │  ← 唯一花真钱的前置
│ P2  §1.1 三层判据脚本（0 元）             │
│ P3  S21 任务书冻结（md5 台账，0 元）       │
└────────────────────────────────────────┘
              ↓ 验收门（P1 必须过）
第二批（串行，一条时间线）
┌────────────────────────────────────────┐
│ R1  S21 × 1（00:00–07:00 窗口内）         │
│   ↓ 跑完立刻复制产物进 _staged/           │
│ J1  判 R1（run.json → L1 → L2，10 分钟）  │
└────────────────────────────────────────┘
              ↓ 条件：R1 不过才继续
              R2  S21 × 1（下一个夜间窗口）
```

**关键路径**：P1 → R1 → J1。P2/P3 与 P1 完全独立，可同一天白天做完。

---

## §五 任务表

编号规则：P = 前置/管道，R = 重跑，J = 判定，D = 文档。

| # | 目标 | 输入 | 输出 | 验收判据（可执行、有数字） | 依赖 | Agent |
|---|---|---|---|---|---|---|
| **P1** | 证明 `$msg` 完整送达模型（不是证明代码改了） | `_runner-template-literal.ps1:21`；`C:\tmp\runner-template.ps1`（已 md5 相同） | `C:\tmp\argverify\` 下的 stream + 一行结论 | ① `md5sum C:\tmp\runner-template.ps1` == `29a808e4192202035cbd6c2d56987a81`（= `_runner-template-literal.ps1`，实测已相同）；② 跑一次 30 秒空任务，stream 里首个 `assistant` 的 `content` 必须**等于** `$msg` 全文（265 字符），或首个 thinking 里出现 `Read task.txt in this directory` 且**不出现** `just said "Read"`；③ 成本 ≤ $0.05 | 无 | Runner |
| **P2** | 三层判据脚本（L0 判别值 / L1 完整性 / L2 包含性线宽） | `blind/*/task.txt`、`_staged/*.html` | `_probe/_artifact-validity.mjs` | 对现有 12 份产物跑出与 §1.1 表**逐格相同**的结果（10 案 L0 判别值命中、L1 全过、L2 包含性 2 例外）；脚本必须打印「读了 N 份 task.txt / M 份产物」，且 N==38、M==12 | 无 | Verify |
| **P3** | 冻结 S21 任务书 | `blind/S21/task.txt` | md5 台账（写进 D1） | 记录 md5、行数、字节数；`grep -cE 'px' == 6`；`grep -o '#[0-9A-Fa-f]{6}' \| sort -u \| wc -l == 5`；跑前跑后 md5 相同 | 无 | Verify |
| **R1** | S21 第 1 次重跑 | P3 冻结点 | `C:\tmp\bb\S21\` + `_staged/S21-sandbox.html` | `run.json.trusted === true` ∧ `hasOutput === true` ∧ `outputBytes > 2000` ∧ L1 全过 ∧ L2 的 3 个独有 hex（`#3E3A34` `#E4DCC9` `#924307`）全中 ∧ `api_retry` 中 `error_status==524` 条数 == 0 | P1,P3 | Runner |
| **J1** | 判 R1 | R1 产物 + stream | `_probe/_S21-rerun-judge.md` | 逐条报：`trusted`、`attempts`、524 条数、NUL 比例、mtime 差、判别 hex 命中、L1、L2 包含性违规清单。**判据不通过时必须写「不可判」，不得写「倾向」** | R1 | Verify |
| **R2** | S21 第 2 次（**条件性**） | 同 R1 | `C:\tmp\bb\S21-r2\` | 同 R1；且 `task.txt` md5 与 R1 相同 | J1 判不过 | Runner |
| **D1** | 改 `06-BLIND-RESULT.md` 与 `_staged/README.md` | J1 | 覆写两份 | `06` 的 S98 行、`08` 的 §4.1/§五 必须与 §2.3 一致；`_staged/README.md` 必须写明「10 案产物在 L0 判据下有效，判别值 56/56」；`grep -c "证明不了任何事"` == 0 | J1 | Main |

**总计 7 个任务**：3 个前置（P1 花 30 秒，P2/P3 零成本）、1 次重跑 + 1 次条件重跑、1 个判定、1 次文档。

---

## §六 我认为主线程最可能再次弄错的地方

> **这一节是本文件最重要的部分。** 每条都对应本轮已经发生过的失误，或者我在核查时发现的、还没人写的下一次。

### 坑 1（最可能，且已经在发生）**把「传参 bug」当成「产物作废」的理由，而不是「元指令作废」的理由**

这一轮的原话是「模型从未收到任务书」。**实测是错的**：
`task.txt` 就是产品提示词（`buildStylePrompt('S31')` 与 `blind/S31/task.txt` 都是 1971 字符，`===` 为真），
模型通过 `Read` 拿到了全文，并照着做出了 56 个「其余 37 份提示词都不含」的值。

**误判的代价是可量化的**：按「全部作废」重跑十案 = **30.1 小时 / $93.37**，
换来一批与现有 13 份产物数值层一致的产物。而现有产物的判别值命中率是 **56/56**。

**防御**：任何「作废」的结论，必须先回答「在这个假设下，产物里那 56 个判别值是怎么来的」。
答不上来就不许作废。

### 坑 2　**R1 一次不成功就想「再跑一次看看」，而不是先查管道**

样本量规则（§2.2）已经写死：`trusted=false` → 当晚不跑第 2 次。
这条不是保守，是因为**连续两次都不可信说明问题在管道**，再跑第三次是第三次白跑。

**防御**：把 §2.2 那张表写成脚本判据（`if (-not trusted) { exit 2 }`），不要留给人临场判断。

### 坑 3　**用 `subtype === "success"` 判成功**

```json
{"type":"result","subtype":"success","is_error":true,"api_error_status":524,"terminal_reason":"api_error"}
```

S97 / S98 都是这个组合。**只允许读 `run.json.trusted`**，禁止直接读 stream 的 `subtype`。
`_blindbox-verdict.ps1` 已经这么做了，但**汇总报告时**仍可能有人 `grep subtype`。

### 坑 4　**把 `_staged/` 里那 13 份产物当成「有 13 个独立样本」**

实测 md5：13 个文件里 **11 个不同**（`S31-judge` ≡ `S31-sandbox`，`S99-judge` ≡ `S99-sandbox`，
`_tmp-s13-25730` 是历史版本）。而 `20-reproducibility.md` 已经查明：
S08 的三份是**同一次会话内的迭代**（stream 里 Write 3 次 + Edit 90 次），不是三次独立采样。

**真实的独立样本数**：S04 2、S08 1（3 份同会话）、S13 2、S15 2、S29 2、S31 2 → **约 11 份独立产物 / 6 案有重复**。
任何「n=13」的表述都是把快照当采样。

### 坑 5　**沿用 `_batch-compare.mjs:133` 的 0.6px 容差，然后报「线宽全中」**

实测：`miss([0.5,0.8,1,1.2,2,3], {1,2,3})` 返回 `[]`。
也就是**S15 只用了 `{1,2,3}` 也会被判成「6/6 全中」**。
这条容差把 `1.25→1`、`0.8→1`、`0.5→1` 全部吞掉，对 4 个案的 8 个档位来说判据是恒真的。

**防御**：新判据（P2）容差 0，且必须把 `var()` 展开后再比 —— 只比源码里的字面 px 会漏掉
S13 的 `--w9:9px`（引用 0 次）与 S29 的 `--w1`（不存在，`1px` 只出现在 `padding`）。

### 坑 6　**把「线宽缺档」记成模型没听话**

按包含性判据（提示词原话是「全站线条都从这几级里取」），4 案的「缺档」全部是假失败：
S13/S15/S18/S29 的缺口都是「声明了但没用于任何 line 属性」。
**这是提示词给了多余的档位，不是模型少做了。** 记 WARN，不记 FAIL。

### 坑 7　**修好 S31 的 3px 违反，把它当成 bug 修掉**

S31 的产物里 `--tick-major-w:3px` 被 6 处 line 属性使用，而 `task.txt:13` 只给了 `1px`。
**这不是模型的错**：`task.txt:6` 的机制句明写「主刻度…3px 宽」。
模型选择了机制句，做出了正确的刻度 —— 这是**正确的取舍**。

真正的缺陷在提示词生成器：**35 份里有 2 份（S27、S31）机制句的线宽与档位表矛盾**。
要修的是 `prompt-copy.js` 的档位行（把机制句里出现的线宽并进档位表），不是产物。

### 坑 8　**把 S98 的 thinking 草稿当成结果**

它存在（120,144 字符），而且非常有说服力（5 个 hex 全中、主次刻度、两条基线齐全）。
**但它是被截断两次的思考体**：98 处 `...` 省略，`<section class="sect services">...</section>` 里的正文全被省了。
正确用法只有一个：作为**重跑前写下的可证伪假设**。S98 本身不重跑（§2.3），所以这份草稿的用途只剩
「证明模型读到了那 5 个色」—— 这一条已经被 §0.1 的判别值法覆盖，不需要它。

### 坑 9　**用 8-gram 度量中文文本的相似度，然后相信那个 0.004**

`20-reproducibility.md` 的 0.004 / 0.000 是用空格切词算的 8-gram。
**中文没有空格**，`split(/\s+/)` 会把整段正文当成一个 token，于是 8-gram 集合几乎是空的。
实测复算（字符 5-gram，去掉标签与注释）：

```
S04  0.0755   （原报告 0.042）
S13  0.0086   （原报告 0.004）
S29  0.0042   （原报告 0.000）
S08  0.9780   （原报告 0.926）
S15  0.8981   （原报告 0.878）
```

**方向一致（S04/S13/S29 换题、S08/S15 同题），但数值全都不对。**
「同一个提示词能把菜市场展览变成印社」这个**定性结论成立**（S04 两版标题一个是「野电流·菜市场二楼」、
一个是「贴满印社·第04面墙」；句子级重合 0/28）。但**任何引用 0.004 这个数的句子都要改**。

### 坑 10　**以为 `_blindbox-run.ps1` 超时会杀进程**

实测 `grep -c "Stop-Process\|taskkill"` 在三个 runner 脚本里都是 **0**。
超时只是停止等待，`claude.exe` 会继续跑。下一次运行开始时 `Clear-CaseArtifacts` 会清掉它的产物目录，
但**进程还在** —— 而两个进程同时活着正好破坏「Deny ACE 按账户」这个假设。
本计划只跑 1 案 1 次，风险可控，但**跑 R2 之前必须确认上一次的 worker 已退出**
（`Get-CimInstance Win32_Process -Filter "Name='claude.exe'"` 里 `ExecutablePath == C:\tmp\bb-bin\claude.exe` 的个数 == 0）。

### 坑 11　**把「内容层不稳」当成比盲测更该做的事，然后拿它当不重跑的借口**

「内容层不稳」这条观察是**真的**（S04 从菜市场展览变印社），
但它不是缺陷 —— 产品承诺是「按我的店做我的站」，同一提示词给出两个不同的店名**符合**这个承诺。
它只有在「用户期待两次结果一致」时才成为缺陷，而产品没有这个承诺。

**所以它不是「更该做的事」，它是「该写进产品说明的一句话」。** `27-rerun-critique.md:§2` 把它排在第 3 位，我同意排位，但不同意把它当成工作项 —— 它是一个决策，不是一次实验。

### 坑 12　**在 `06` / `07` / `08` 上做局部修补，留下自相矛盾**

`06-BLIND-RESULT.md:224` 仍写「负对照 B（S98）✅ 不承重，2 小时零产物」，
而同一份文件的 §零 已标它作废。`08-POSITIVE-CONTROL.md:96` 还写「最坏的情况是给了一半」。

**重写时整段换，不要局部补。** 判据：`grep -c "不承重" 06-BLIND-RESULT.md` 必须 == 0。

---

## §七 我认为不必做的事（明确否决）

| 方案 | 为什么不必 |
|---|---|
| **重跑十案** | 判别值 56/56 已证明产物是照提示词做的。重跑换不来新信息，成本 30.1 h / $93.37（§3.1） |
| **重跑 S98** | 产品 35 案的 dna 六字段全非空、机制句零数字案 0 个（`28-s98-relevance-check.md` §一）。两个答案都不改变产品决策（`27-rerun-critique.md` §1） |
| **重跑 S97 / S99** | S97 是正对照（结论已定）；S99 判别值 7/7 全中，且它的 stream 里 `Read task.txt` 的 tool_result 与 `task.txt` `===` 为真 |
| **把十案重跑 2 次看一致性** | 一致性已有 13 份产物 / 24 个判定格 / 23 个一致（`20-reproducibility.md` §0.1）。再跑是重复测量同一个量 |
| **双账户并行** | 本计划只有 1 案 1 次，并行收益 0；而隔离静默失效不可检测（`10-RERUN-PLAN.md` 坑 4） |
| **降 `CLAUDE_CODE_EFFORT_LEVEL` 提速** | 实测 14 个 stream 的 `init.effort` 全是 `undefined`，改了可能只改元数据；且破坏「同条件重跑」 |
| **从 S98 的 thinking 草稿抢救结论** | 见坑 8。它只能当假设，而当假设的价值已被判别值法覆盖 |
| **把「内容层不稳」做成一个实验** | 见坑 11。它是产品口径问题，不是实验问题 |

---

## §八 我认为该做但不在本次重跑范围内的事（按优先级）

这些不占用夜间窗口、不花 API 钱，且都能在 §1.1 的判据里被验证。

| 优先 | 做什么 | 成本 | 判据 |
|---|---|---|---|
| **1** | **改线宽判据的方向**：`_batch-compare.mjs:133` 从「每档都用上」改成「所有 line 属性都取自档位」，容差 0，`var()` 展开 | 30 分钟 | 对 12 份产物跑，必须给出 §1.1 那张表（含 S31/S99 两处违反），且 `miss([0.5,0.8,1,1.2,2,3], {1,2,3})` **不再**返回 `[]` |
| **2** | **补一条闸门 D4**：机制句里出现的线宽（`Npx 宽`）必须在「线宽只用这几级」的档位表里 | 30 分钟 | 对现状报 **2 案 FAIL**（S27、S31）；`--selftest` 变异必须响 |
| **3** | **把中文相似度脚本从 8-gram 换成字符 5-gram**，并在 `20-reproducibility.md` 上标注数值已更正 | 20 分钟 | S04 从 0.042 → 0.0755、S13 0.004 → 0.0086、S29 0.000 → 0.0042，且 S08 0.926 → 0.9780 |
| **4** | **给 batch 加 `-RunTag`**（`_blindbox-batch.ps1:33-38` 每次 `Remove-Item -Recurse`） | 20 分钟 | 同一案连跑两次后两份 `run.json` 同时存在，`task.txt` md5 相同 |
| **5** | 把「同一提示词可产出不同文案」写进产品说明 | 10 分钟（决策） | 一句话：产品承诺是「按你的店做你的站」，不是「两次结果一致」 |

> 回归审计报的另外两处（`@media` 盲区、UA 默认色、`/30` 分母）**已在 `2a5efa0` 修掉，本计划不重做**。
> 实测复核：`node prototypes/_prompts/build-prompts.mjs` 现在输出「识别出主色的案：**31/35**（其余 4 案…S32 S33 S34 S35）」，31+4 == 35。

**第 1、2 条与重跑无关，但它们是这次审计发现的唯一两个真缺陷**：判据恒真（坑 5）与提示词自相矛盾（坑 7）。
它们比多跑一次 S21 更接近「防止店主拿到一份用不动的提示词」这个目标。

---

## §九 本文件所有数字的复算命令

```bash
cd /d/Web/style

# ① 产品提示词 == 盲测任务书（10 案逐字节）
node -e '
const fs=require("fs"),vm=require("vm");
const ctx={window:{}};
const el={style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},value:"",textContent:"",hidden:false,focus(){},click(){},getAttribute(){return null},insertBefore(){},remove(){}};
ctx.document={readyState:"complete",addEventListener(){},getElementById(){return null},querySelector(){return el},querySelectorAll(){return []},createElement(){return Object.create(el)},createTextNode(){return {}},body:el,head:el,documentElement:el};
ctx.setTimeout=setTimeout;ctx.console={log(){}};ctx.navigator={clipboard:{writeText(){return Promise.resolve()}}};ctx.localStorage={getItem(){return null},setItem(){},removeItem(){}};ctx.location={href:"x"};ctx.matchMedia=()=>({matches:false,addEventListener(){}});
vm.createContext(ctx);
for(const f of ["prototypes/_selection/data.js","prototypes/_selection/prompts.js","prototypes/_selection/prompt-copy.js"])vm.runInContext(fs.readFileSync(f,"utf8"),ctx);
const n=s=>s.replace(/\r\n/g,"\n").trim();
for(const id of ["S04","S08","S13","S15","S18","S22","S29","S31","S32","S35"]){
 const b=ctx.window.buildStylePrompt(id);
 const f=fs.readFileSync(`deliverables/78-northstar/blind/${id}/task.txt`,"utf8");
 console.log(id, n(b)===n(f) ? "== task.txt" : "DIFFERS");
}'
# 期望：10 行全部 "== task.txt"

# ② 判别值（本案提示词独有）与产物命中：十案 56 个 + S99 的 7 个 = 63
node -e '
const fs=require("fs"),path=require("path");
const blind="deliverables/78-northstar/blind";
const tasks={};for(const d of fs.readdirSync(blind)){const p=path.join(blind,d,"task.txt");if(fs.existsSync(p))tasks[d]=fs.readFileSync(p,"utf8")}
const px=t=>[...new Set([...t.matchAll(/(?<![\w.])([0-9]+(?:\.[0-9]+)?)px/g)].map(m=>parseFloat(m[1])))];
const hx=t=>[...new Set((t.match(/#[0-9A-Fa-f]{6}/g)||[]).map(h=>h.toUpperCase()))];
const staged="deliverables/78-northstar/_probe/_staged";
const arts={};for(const f of fs.readdirSync(staged)){const m=f.match(/^(S\d{2})-(sandbox|judge)\.html$/);if(m){const k=m[1];if(!arts[k]||m[2]==="sandbox")arts[k]=path.join(staged,f)}}
let tot=0,hit=0;
for(const c of Object.keys(arts).sort()){
 if(!tasks[c]){console.log(c,"(not a product prompt)");continue}
 const art=fs.readFileSync(arts[c],"utf8");
 const aPx=new Set(px(art)),aHex=new Set(hx(art));
 const oPx=new Set(),oHex=new Set();
 for(const [id,t] of Object.entries(tasks))if(id!==c){for(const v of px(t))oPx.add(v);for(const h of hx(t))oHex.add(h)}
 const uP=px(tasks[c]).filter(v=>!oPx.has(v)),uH=hx(tasks[c]).filter(h=>!oHex.has(h));
 const hP=uP.filter(v=>aPx.has(v)).length,hH=uH.filter(h=>aHex.has(h)).length;
 tot+=uP.length+uH.length; hit+=hP+hH;
 console.log(c.padEnd(4),"uniqPx",uP.length,"hit",hP,"| uniqHex",uH.length,"hit",hH);
}
console.log("\nTOTAL discriminators:",tot,"hits:",hit);'
# 期望：TOTAL discriminators: 63 hits: 63

# ③ S31 的 5 个 hex 在 35 份产品提示词里只属于 S31
grep -rl "#F2F0EC" prototypes/_selection/prompts.js >/dev/null && \
node -e '
const fs=require("fs");
const t=fs.readFileSync("prototypes/_selection/prompts.js","utf8");
for(const h of ["F2F0EC","5F5B55","DEDAD3","55514B","8A857C"]){
 const n=(t.match(new RegExp("#"+h,"gi"))||[]).length;
 console.log("#"+h,"occurrences in prompts.js:",n);
}'
# 期望：每个都是 1（只有 S31 那条）

# ④ 线宽包含性（S31 / S99 两处违反）
node -e '
const fs=require("fs"),path=require("path");
const blind="deliverables/78-northstar/blind";
const LINE=/^(border(?:-(?:top|bottom|left|right|block|inline)(?:-(?:start|end|width))?)?(?:-width)?|outline(?:-width)?|column-rule(?:-width)?|text-decoration-thickness|box-shadow)$/;
for(const id of ["S31","S99","S13","S15","S29"]){
 const t=fs.readFileSync(path.join(blind,id,"task.txt"),"utf8");
 const lw=(t.match(/线宽只用这几级：([^\n]+)/)||[])[1]||"";
 const tiers=[...new Set((lw.match(/([0-9.]+)px/g)||[]).map(x=>parseFloat(x)))];
 const css=(fs.readFileSync(`deliverables/78-northstar/_probe/_staged/${id}-sandbox.html`,"utf8").match(/<style[^>]*>([\s\S]*?)<\/style>/)||[])[1]||"";
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,"");
 const vars=new Map();for(const m of clean.matchAll(/--([a-z0-9-]+)\s*:\s*([0-9.]+)px/gi))vars.set(m[1],parseFloat(m[2]));
 const used=new Set();
 for(const m of clean.matchAll(/([a-z-]+)\s*:\s*([^;}]+)/g)){
  if(!LINE.test(m[1].toLowerCase()))continue;
  for(const n of m[2].matchAll(/(?<![\w.])([0-9.]+)px/g)){const v=parseFloat(n[1]);if(v>0)used.add(v)}
  for(const r of m[2].matchAll(/var\(--([a-z0-9-]+)\)/gi))if(vars.has(r[1])&&vars.get(r[1])>0)used.add(vars.get(r[1]));
 }
 const viol=[...used].filter(v=>!tiers.some(t2=>Math.abs(t2-v)<0.01)).sort((a,b)=>a-b);
 console.log(id,"tiers",tiers.join(","),"| used",[...used].sort((a,b)=>a-b).join(","),"| violation",viol.join(",")||"none");
}'
# 期望：S31 violation 3；S99 violation 6；其余 none

# ⑤ 0.6px 容差恒真（坑 5）
node -e '
const miss=(c,g)=>c.filter(n=>![...g].some(v=>Math.abs(v-n)<0.6||Math.abs(v-Math.ceil(n))<0.01));
console.log("claims [0.5,0.8,1,1.2,2,3] vs {1,2,3} ->",miss([0.5,0.8,1,1.2,2,3],new Set([1,2,3])));'
# 期望输出：[] （空数组 = 判据认为全中）

# ⑥ 中文 8-gram 度量失真（坑 9）
node -e '
const fs=require("fs");
const text=t=>t.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<!--[\s\S]*?-->/g,"").replace(/<[^>]+>/g," ").replace(/\s+/g,"");
const cg=(t,n)=>{const s=new Set();for(let i=0;i+n<=t.length;i++)s.add(t.slice(i,i+n));return s};
for(const [id,a,b] of [["S04","_staged/S04-sandbox.html","_tmp_repro/S04-3ddf808.html"],["S13","_staged/S13-sandbox.html","_tmp_repro/S13-de5b939.html"],["S29","_staged/S29-sandbox.html","_tmp_repro/S29-06477d4.html"],["S08","_staged/S08-sandbox.html","_tmp_repro/S08-3ddf808.html"],["S15","_staged/S15-sandbox.html","_tmp_repro/S15-06477d4.html"]]){
 const A=text(fs.readFileSync("deliverables/78-northstar/_probe/"+a,"utf8")),B=text(fs.readFileSync("deliverables/78-northstar/_probe/"+b,"utf8"));
 const ga=cg(A,5),gb=cg(B,5);let i=0;for(const g of ga)if(gb.has(g))i++;
 console.log(id,"char5-jaccard",(i/(ga.size+gb.size-i)).toFixed(4));
}'
# 期望：S04 0.0755 / S13 0.0086 / S29 0.0042 / S08 0.9780 / S15 0.8981

# ⑦ 成本基线（本机 stream 已随 C:\tmp 清空，以下为报告内实测值的复算口径）
#     S35 1693s/$1.33  S32 4319s/$2.76  S22 8408s/$4.36  S13 10317s/$2.08
#     S18 11422s/$7.95  S08 11512s/$22.73  S31 12252s/$4.25  S04 14981s/$0.80
#     S98 15382s/$0.62  S15 15738s/$38.25  S29 17666s/$8.86
#     十案合计 30.1 h / $93.37

# ⑧ runner 没有杀进程路径（坑 10）
grep -c "Stop-Process\|taskkill\|\.Kill(" \
  deliverables/78-northstar/_probe/_blindbox-run.ps1 \
  deliverables/78-northstar/_probe/_blindbox-batch.ps1 \
  deliverables/78-northstar/_probe/_blindbox-verdict.ps1
# 期望：三个文件都是 0

# ⑨ batch 会覆盖同案目录（§3.4）
grep -n "Remove-Item \$taskDir -Recurse" deliverables/78-northstar/_probe/_blindbox-batch.ps1
# 期望：38:    if (Test-Path $taskDir) { Remove-Item $taskDir -Recurse -Force ... }

# ⑩ 模板已修且已部署（P1 的第一个判据）
md5sum C:/tmp/runner-template.ps1 \
  deliverables/78-northstar/_probe/_runner-template-literal.ps1
# 期望：两行 md5 相同 = 29a808e4192202035cbd6c2d56987a81

# ⑪ 提示词自相矛盾（坑 7 / §八 第 2 条）
node -e '
const fs=require("fs"),vm=require("vm");
const ctx={window:{}};
const el={style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(){},addEventListener(){},querySelector(){return null},querySelectorAll(){return []},value:"",textContent:"",hidden:false,focus(){},click(){},getAttribute(){return null},insertBefore(){},remove(){}};
ctx.document={readyState:"complete",addEventListener(){},getElementById(){return null},querySelector(){return el},querySelectorAll(){return []},createElement(){return Object.create(el)},createTextNode(){return {}},body:el,head:el,documentElement:el};
ctx.setTimeout=setTimeout;ctx.console={log(){}};ctx.navigator={clipboard:{writeText(){return Promise.resolve()}}};ctx.localStorage={getItem(){return null},setItem(){},removeItem(){}};ctx.location={href:"x"};ctx.matchMedia=()=>({matches:false,addEventListener(){}});
vm.createContext(ctx);
for(const f of ["prototypes/_selection/data.js","prototypes/_selection/prompts.js","prototypes/_selection/prompt-copy.js"])vm.runInContext(fs.readFileSync(f,"utf8"),ctx);
for(const id of ["S27","S31"]){
 const p=ctx.window.buildStylePrompt(id);
 console.log(id,"档位:",(p.match(/线宽只用这几级：([^\n]+)/)||[])[1]);
 console.log(id,"机制:",(p.match(/这个风格的签名动作：([^\n]+)/)||[])[1]);
}'
# 期望：S31 档位只有 1px，而机制句写「主刻度…3px 宽」
```
