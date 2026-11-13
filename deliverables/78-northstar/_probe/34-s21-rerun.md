# S21 重跑：环境与原始失败的差异对照

> 2026-11-14 05:2x　主线程（运行进行中，本文件先记录可观测的差异，结果待补）

## 一、为什么要重跑 S21

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

## 五、跑完要回答的问题

1. 有没有 `out.html`？字节数多少？
2. 判别值命中几个（`_discriminator-check.mjs` 会把它算进去）？
3. 如果失败，`terminalReason` 是什么？与原始的 `api_error` 是否同因？
4. 如果成功，S21 的 `columns` / `layoutKind` 是什么？它是不是又一个
   「`no-column-layout` 但从 landmark 量到列」（C9 那 5 案的模式）？

## 六、不要做的事

- **不要因为这次成功就推翻"十案不用重跑"**。S21 补的是一个缺格，不是修正十案。
- **不要把 S21 的结果混进 `_staged/`** 而不更新 `_evidence-gate.mjs` 的
  `DEFAULT_CASES` 与 `expectTotal`。产物数从 11 变 12、判别值从 64 变 67，
  闸门会红 —— 那是**正确**的红，要按新数字同时更新脚本与
  `29-prompt-truncation-bug.md` 里的表。
