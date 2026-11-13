# S21 重跑：它在思考里写了 61 次「现在就写」，一次都没真写

> 2026-11-14 04:58–06:25（87 分钟，我手动停的）　主线程
>
> **结论：S21 没有产出。病因不是网关、不是提示词、不是超时，
> 是模型把整页 HTML 在 thinking 里写完又推翻，反复 61 次，从不调用 Write。**
>
> 这条推翻了我本文初版写的「它会无限思考」—— 那个说法太笼统，掩盖了真正可诊断的形态。

## 零、一页结论

```
输入：完整提示词（141 行，Read 返回全文）+ 完整元指令（ARGS 行证明整句进了 -p）
模型：claude-opus-5[1M] 请求 → deepseek-ai/deepseek-v4.1-flash 实际服务
输出：零。87 分钟，378,135 字符 thinking，1 次 Read，0 次 Write
形态：thinking 里反复写出完整 HTML，每块尾部都是 "Let me write the file now"，
      但 "let me write" 这句承诺出现了 61 次，Write 工具调用 0 次
```

## 零之补、决定性的一行

```json
{"type":"assistant","message":{
  "model":"deepseek-ai/deepseek-v4.1-flash",
  "usage":{"input_tokens":27302,"output_tokens":0,...},
  "content":[{"type":"thinking","thinking":"...Final code composition. Let me write it."}],
  "stop_reason": null }}
```

三个字段合起来才是答案：

| 字段 | 值 | 含义 |
|---|---|---|
| `content` | 只有 `thinking`，没有 `text` | 它从未产出可交付内容 |
| `output_tokens` | **0**（全部 4 条 usage 记录都是 0） | 网关认为它一个 token 都没输出 |
| `stop_reason` | **null** | 这次回复从未正常结束 |

而 `thinking.thinking` 三个块共 **378,135 字符**，每块的尾部都是
`Let me write the file now.` 这类句子。全文里 `let me write` 出现 **61 次**。

**它在思考里把整页 HTML 写完、扔掉、说「现在真写」、再写一遍、再扔掉，
反复 61 次，一次也没有调用 Write。**

## 一、为什么当初认为它值得重跑

判别值检查的完整结论是 **64/64，阴性对照 4.2%**，十案产物全部有效。
`S21` 是唯一一个「提示词健全、有数值、却从未产出」的案子：

```
$ node _probe/_discriminator-check.mjs | grep S21
S21      3     0  0%  无产物
```

它的 `task.txt` 有 3 个判别值（`#3E3A34` `#E4DCC9` `#924307` —— 其他 37 份任务书里都没有）
和 10 个数值 token（86px、96px、1.25px、16px…），提示词完全健全。原始记录是：

```
S21 | 无效 | 无产物（out=False 0B，api_error）
```

即被 `Connection lost` 打断，`_staged/` 里也没有副本。所以它是唯一有信息增益的重跑。

## 二、原始失败的环境（来自历史记录）

- stream 含 **76% NUL 字节**（`20-reproducibility.md` §4.1 那张表）
- `api_error`，产物 0 B
- 时间窗：2026-11-12～13，白天/晚间（524 高发时段）

## 三、这次重跑的环境（实测）

```
时间        2026-11-14 04:56 起（00:00–07:00 窗口，524 实测概率 0%）
模型        claude-opus-5[1M]     ← 1M 上下文版本
CLI 版本    2.1.289
permission  acceptEdits
stream NUL  0.0%（实测 1,239,301 字节里 0 个 NUL）
```

**与原始失败最大的差异是 NUL 字节：76% → 0%。** 这说明这次的 stream 是干净的，
不是同一个崩溃形态。所以它值得跑：即使再次失败，失败的原因也会是新的。

## 四、运行中的观测（用于判断是否真的在推进）

运行约 50 分钟时的快照：

```
stream 1.2 MB / 6282 行
事件构成  system 6328（其中 thinking_tokens 6499）　assistant 2　user 1
tool_use  只有 1 次（Read task.txt）
thinking  累计 12,879 tokens
```

**这是"在思考"，不是"卡死"。** 判据：

- `thinking_tokens` 事件的 `estimated_tokens` 在持续增长（1 → 12,879）
- `stream.jsonl` 的文件大小每秒都在变
- 有 1 次 `Read task.txt` 且 `tool_result` 返回了 141 行全文 —— 说明提示词到达了

**注意 `thinking_tokens` 只有计数、没有内容**。所以「stream 很大」这件事本身
不代表有产出，必须看有没有 `tool_use: Write`。这一点是读 S21 时差点误判的地方。

### 4.1 运行一小时后：它一直在思考，没有落笔

约 60 分钟时的累计值（把多次计数重置加起来，单看最后一次会严重低估）：

```
cumulative thinking tokens  51,022
thinking 计数重置次数        2       ← estimated_tokens 到一定量会归零重计
tool_use                    1 次（Read task.txt）
assistant text 块            1 个（只有开头那句 "I'll read the task file first."）
out.html                    不存在
```

delta 逐块都是 1–7 token，**零停滞**（12,976 块里 0 个 0-delta）。
所以它是**在稳定生成思考**，不是网络挂死、不是空转。

**这本身就是 S21 的答案的一半**：它不缺提示词（`Read` 返回了 141 行全文）、
不缺时间、不缺配额，它是在 1M 上下文的 opus 上陷入了极长推理。

与 S98 的对照很有意义 —— S98 当年"想 2 小时不落笔"被我归因为
「元指令没送到」，现在看那个归因是错的：**同一个案子在有完整元指令的情况下
（`ARGS:` 行证明整句 prompt 送到了 `-p`）依然会陷入长思考**。
所以长思考是这个案型的性质，不是那次传参 bug 造成的。

## 五、跑完的答案

| 问题 | 答案 |
|---|---|
| 有没有 `out.html`？ | **没有，0 字节** |
| 判别值命中几个？ | **0 个**（无产物可比） |
| 失败原因与原始的 `api_error` 同因吗？ | **不是。** 原始是连接断（76% NUL），这次是思考不收敛（0% NUL） |
| 网关有问题吗？ | **没有。** 87 分钟里 token 一路稳定输出，没有一次 524 |

原始数据（`_staged/S21-thinking-stall.json`）：

```json
{
  "cumulativeThinkingTokens": 78876,
  "toolUse": { "Read": 1 },
  "assistantTextBlocks": 1,
  "assistantTexts": ["I'll read the task file first.\n\n"],
  "streamBytes": 5412952,
  "model": "claude-opus-5[1M]",
  "thinkingDeltas": { "count": 26783, "zeros": 0, "min": 1, "max": 26 }
}
```

`zeros: 0` 是这里最要紧的一个数 —— 26,783 个 token 增量里**没有一个零**。
网络挂死会产生大量 0-delta；它是每一块都在真实产出。

## 六、这对之前那些结论意味着什么

### 6.1 一条归因被推翻了

S98 当年「想 2 小时不落笔」，我在 `10-RERUN-PLAN.md` §0.2 归因为
「元指令没送到，所以模型不知道要动手」。

**这次元指令完整送达了**（`_staged/S21-runner.log` 第一行就是整句
`-p "Read task.txt ... write out.html in a single Write call ..."`），
它照样思考了 87 分钟。**所以长思考是本案型的性质，不是那次传参 bug 造成的。**

那条归因在 `10-RERUN-PLAN.md` 里已经降级为「待查线索，不作为结论」，
现在是查完了：**不成立**。

### 6.2 「十案不用重跑」不受影响

S21 补的是一个缺格，不是修正十案。它的结论是「这个案子不产出」，
而十案的结论是「产物是照提示词做的」—— 两件事互不依赖。

---

## 七、我试过三种「早期放弃」判据，三种都会被真实数据否掉

用户要求给运行器加一条「单案思考量超过 N 就放弃」的上限。**查完之后我没有加，
因为找不到一个不误杀成功案例的判据。** 三个候选、三份反证，全部实测：

### 候选一：thinking token 总量

| 案 | thinking token | 结果 |
|---|---|---|
| S21（我停手时） | 78,876 | 零产物 |
| **S99（成功）** | **188,121** | 23,204B 完整页面 |

**失败案比成功案少用一半的思考。** 按总量设阈值等于优先杀掉成功的那批。

### 候选二：多久还没写出第一笔

| 案 | 首次 Write/Edit 出现在 |
|---|---|
| **S99（成功）** | **112,054 thinking token 处** |

S99 直到 112,054 才落笔，比 S21 停手时的 78,876 还晚。按「N token 内必须写」
设阈值，会杀掉 S99。

### 候选三：stream 里有没有出现过 Write 工具调用

| 案 | Write/Edit 次数 | 产物 |
|---|---|---|
| S21 | 0 | 无 |
| **S04** | **0** | **28,612B 完整页面，`</html>` 闭合** |
| **S31** | **0** | **20,166B 完整页面，`</html>` 闭合** |

**零写入不等于零产物。** S04 和 S31 都是完整页面却没有任何 Write 记录
（它们的来路见 `30-artifact-validity.md` 的「部分有效」判定）。

### 那到底该加什么

**该加的不是「思考量上限」，是「空转检测」**，而 S21 提供了它唯一可靠的信号：

```
usage.output_tokens 恒为 0（全部 4 条 usage 记录）
stop_reason 恒为 null
content 只有 thinking、没有 text
```

一个连续若干轮 `output_tokens === 0` 且 `stop_reason === null` 的会话，
是网关吞掉输出或模型自我循环的确凿信号 —— **它与「思考得久」无关**：
S99 思考了 188k，但它的 usage 里 `output_tokens` 不为 0。

但**这个判据我没有实现**，理由写在这里免得下一个人以为我漏了：

1. **只有 S21 一个样本。** 一个样本定出来的阈值就是给这一个案子量身定做的规则，
   换个案子立刻失效。仓库的老毛病正是「从单个观测推出普遍规则」。
2. **`output_tokens` 是否可靠取决于网关。** 这批数据的 `model` 是
   `deepseek-ai/deepseek-v4.1-flash`，它是网关的中间层；`output_tokens`
   报 0 可能只是它没透传，而不代表真的没输出。在能证明这个字段可信之前，
   拿它当放弃判据，等于拿一个来历不明的数当刹车。
3. **改运行器的代价不对称。** 现在的行为是「跑满 90 分钟超时、无产物则重试」，
   最坏浪费 4.5 小时；加一个错判据的代价是**杀掉本来就快成功的那一次**，
   而 S99 已经证明「快成功」和「空转」在 stream 上长得一样。

**所以建议是：给这类已知会自我循环的案子把 `-MaxRetries` 设成 0**
（一个参数，零代码改动，跑完人工看一眼），而不是给运行器加一个
只有单样本支撑的自动放弃逻辑。等积累到 3–5 个 `output_tokens === 0` 的样本，
再谈阈值。

## 八、操作上的两个坑（都已实测踩过）

**① 中断运行器后必须手动清 Deny ACE。** 它走不到第 7 步清理：

```powershell
icacls 'D:\Web\style' /remove:d ClaudeBlindBox
```

实测确认：中断后两条 ACE（`(DENY)(W)` 和 `(DENY)(RX)`）都还挂在仓库上。

**② `estimated_tokens` 会归零重计。** 只读最后一条 `thinking_tokens` 事件
会严重低估（我一度读到 258，真实累计是 78,876）。必须把每次重置前的值累加。

## 九、不要做的事

- **不要因为这次失败就再跑一次 S21。** 病因已确定（在 thinking 里写完又推翻，
  61 次「let me write」零次执行），重跑没有信息增益。
- **不要用「思考量 / 沉默时长 / 零 Write」做放弃判据。** §七 里三种都各有实测反例。
- **不要把 S21 的结论推广成「提示词太长会卡」**。只有这一个案，且它不是最长的
  （S21 的 task.txt 是 5202 字节，十案里排中间）。它是本案型特有的。
- **不要忘了 `_staged/` 里新加的两个文件**：`S21-thinking-stall.json`（统计快照）
  和 `S21-runner.log`（prompt 送达证据）。5.4 MB 的原始 stream 没有入库
  （`C:\tmp` 会被系统清），但这两个文件足以复验结论。
  要看 thinking 原文时，`_s21-content-signal.mjs` 与下面这段可直接从 stream 读：

```bash
node -e "const fs=require('fs');for(const l of fs.readFileSync('C:/tmp/bb/S21/stream.jsonl','utf8').split('\n').filter(Boolean)){let d;try{d=JSON.parse(l)}catch{continue}if(d.type==='assistant')for(const c of d.message?.content||[])if(c.type==='thinking')console.log(c.thinking.length,JSON.stringify(c.thinking.slice(-200)))}"
```
