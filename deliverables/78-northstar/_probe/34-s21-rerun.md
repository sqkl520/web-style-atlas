# S21 重跑：它跑完了，产物完整、三个判别值全中

> 2026-11-14 04:58 起跑，**07:12 写出产物**，07:13 结束
>
> ## ⚠️ 本文作废了两版中间结论，都是一样的错误：在跑完之前下判断
>
> - 第一版：「它会无限思考」（依据 06:25 的快照，78,876 token 零 Write）
> - 第二版：「它在 thinking 里写了 61 次「现在就写」，一次都没真写」
>   （依据 06:47 的快照，仍然零 Write）
>
> **两版都错，因为我读到的是中途快照。** 我在 06:25 停掉了监控任务，
> 但沙箱进程（计划任务起的、独立的 `claude.exe`）**没有被杀掉**，
> 它继续跑到 07:12，写出了一个完整页面。
>
> 这是本仓库最老那类错误的一个新变种：**把"我的观测结束了"当成"事件结束了"。**
> 与「collector 找 out.html 而模型写了 index.html」是同一个形状。

## 零、结果

```
产物      C:\tmp\bb\S21\out.html   27,557 字节 / 426 行 / </html> 闭合
判别值    3/3 命中（#3E3A34 #E4DCC9 #924307）
耗时      04:58 → 07:12，约 134 分钟
模型      claude-opus-5[1M] 请求 → deepseek-ai/deepseek-v4.1-flash 实际服务
```

判别器复验（产物已放进 `_staged/`）：

```
$ node _probe/_discriminator-check.mjs | grep S21
S21      3     3  100%

TOTAL discriminators: 67 hits: 67
```

**十二案的判别值现在是 67/67，全数命中。**

## 一、为什么它值得重跑

判别值检查的结论是 64/64，阴性对照 4.2%，十案产物全部有效。
`S21` 是唯一「提示词健全、有数值、却从未产出」的案子：

```
S21 | 无效 | 无产物（out=False 0B，api_error）
```

它的 `task.txt` 有 3 个判别值（`#3E3A34` `#E4DCC9` `#924307`，其他 37 份任务书都没有）
和 10 个数值 token（86px、96px、1.25px、16px…），提示词完全健全。

## 二、这次跑的过程（修正后的时间线）

| 时刻 | 事件 | 我当时的判断 |
|---|---|---|
| 04:58 | 起跑，Deny ACE 已下 | — |
| 05:22 | stream 1.2MB，1 次 Read，0 Write | 以为要卡 |
| 06:25 | stream 5.4MB，7 万 thinking token，0 Write | **我停了监控，以为确定了** |
| 06:47 | 复查，仍 0 Write | **我写了"一次都没真写"** |
| **07:12** | **写出 out.html，27,557 字节** | **错了** |

**关键教训**：S21 在 0 Write 状态下持续了 **134 分钟里的前 130 分钟**，
最后 4 分钟才落笔。任何基于「多久没 Write」的判据都会在 06:25 就杀它。

## 三、我试过三种「早期放弃」判据，三种都被真实数据否掉

用户要求给运行器加「单案思考量超过 N 就放弃」。查完之后没有加，
因为三个候选各有实测反例 —— **而 S21 的成功让第三个反例更硬**：

### 候选一：thinking token 总量

| 案 | thinking token | 结果 |
|---|---|---|
| **S21（成功）** | **114,937** | 27,557B 完整页面 |
| S99（成功） | 188,121 | 23,204B 完整页面 |

思考量的跨度是 11.5 万到 18.8 万，**几百个 token 的差别不预示成败**。

### 候选二：多久还没写出第一笔

| 案 | 首次 Write 出现在 |
|---|---|
| S21（成功） | 约 134 分钟处（几乎是最后一刻） |
| S99（成功） | 112,054 thinking token 处 |

**两个成功案例的"第一次落笔"都非常晚。** 按「N 分钟内必须写」设阈值会全杀。

### 候选三：stream 里有没有 Write 工具调用

| 案 | 中间过程 Write 次数 | 最终产物 |
|---|---|---|
| S21 | 前 130 分钟 **0 次** | **有，27,557B** |
| S04 | 全程 **0 次** | **有，28,612B** |
| S31 | 全程 **0 次** | **有，20,166B** |

**零写入完全不能预测零产物。**

### 我一度以为找到的判据，也被否掉了

`usage.output_tokens` 恒为 0 看起来像空转信号。实测：

```
S21（成功）  UsageRecords=7   ZeroOutput=7   MissingStop=7   LetMeWrite=61
S99（成功）  UsageRecords=96  ZeroOutput=95  MissingStop=95  LetMeWrite=59
```

**两个都是成功案例，两个的 output_tokens 几乎全是 0，"let me write" 次数几乎一样。**
这个字段来自网关中间层，它根本不通传真实的输出量。

### 结论：不存在 stream 层面的安全放弃判据

四类信号（思考量 / 沉默时长 / Write 次数 / output_tokens）全部有成功案例反例。
**所以运行器不该自动放弃，只该观测。**

## 四、我实际改了什么

**只加观测，不加刹车。** 在 `_blindbox-verdict.ps1` 的 `Get-ServedModelInfo`
里多记五个字段，run.json 会带上：

```
UsageRecords / ZeroOutputRecords / MissingStopReasons / ThinkingChars / LetMeWriteCount
```

并在 `_blindbox-run.ps1` 里打一行诊断：

```
ZERO-OUTPUT SIGNAL: 7/7 usage records report output_tokens=0; thinking=385592 chars;
"let me write" x61  (diagnostic only, not a verdict)
```

措辞里明写 `diagnostic only, not a verdict` —— 因为上面那张表证明它不能当判据。
它的用处只有一个：**下次有人在 06:25 那个时点看日志时，能立刻看到发生了什么事，
而不是像我这样读了 5.4MB 才发现。**

## 五、对于「自动重试」的建议

现在的行为：跑满 90 分钟超时 → 无产物 → 重试，最多 3 轮。

S21 这次在 134 分钟才写完，**超过了 90 分钟超时**。如果让它自然跑完而不是我手动停，
它会先被判超时、然后清空 case 目录重试 —— **把那个刚写好的产物删掉**。

所以对这个案型的正确参数是：

```powershell
-TimeoutSec 10800    # 3 小时，覆盖 S21 的 134 分钟与 S29 的 4.9 小时
-MaxRetries 0        # 不自动重试：超时后人工看一眼，别清目录
```

`-MaxRetries 0` 是关键 —— 它保证超时后**不删已有产物**。

## 六、操作上的坑（都实测踩过）

**① 停掉监控 ≠ 停掉运行。** 我用 `TaskStop` 停掉了 shell 任务，
但计划任务起的 `claude.exe` 是独立进程，继续跑了 45 分钟并写出了产物。
**要真正停，得 `schtasks /End` 或杀那个进程。**

**② 中断运行器后必须手动清 Deny ACE**（它走不到第 7 步清理）：

```powershell
icacls 'D:\Web\style' /remove:d ClaudeBlindBox
```

**③ `estimated_tokens` 会归零重计。** 只读最后一条会严重低估
（我一度读到 258，真实累计 114,937）。必须累加每次重置前的值。

**④ 无 BOM 的 .ps1 里有中文注释 = 无法解析。** 今天踩了四次
（`_blindbox-run.ps1`、`_blindbox-verdict.ps1`、`_runner-template2.ps1` 两次）。
加 BOM 之后全部 errors=0。

## 七、不要做的事

- **不要用「N 分钟没 Write 就放弃」做判据。** S21 是第 130 分钟才写的。
- **不要用 `output_tokens === 0` 做判据。** 成功的 S99 也有 95/96 条是 0。
- **不要把本文的前两版当结论。** 它们都在跑完之前写的，都错了。
- **不要忘了 S21 的产物已进 `_staged/S21-sandbox.html`**，
  判别值总数因此从 64 变成 67。`_evidence-gate.mjs` 的
  `DEFAULT_CASES` 与 `expectTotal` 要同步更新。
