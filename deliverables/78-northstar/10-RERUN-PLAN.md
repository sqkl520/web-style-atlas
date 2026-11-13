# S98 重跑计划：「删掉数值」这一格必须重做，而且在重做之前要先修三处管道

> 2026-11-13　规划 Agent
> 只写这一份文件，未改动任何已有文件、未跑沙箱。
> 所有数字都附了复算命令或文件行号；凡是推测的地方都写「推测」。

---

## §零 结论先行（先读这一节）

### 0.1 重跑仍然必要，但**不是原来那个理由**

`07-NEGATIVE-B.md` 说 S98 作废，因为结尾是 524 风暴、`terminal_reason: "api_error"`。
这一条我复核了，**成立**：

```
$ tail -1 C:/tmp/bb/S98/stream.jsonl | (取字段)
terminal_reason = "api_error"     api_error_status = 524
subtype = "success"               is_error = true
is_error=true 与 subtype=success 同时存在 —— 谁读 subtype，谁就把它看成成功
```

**但我在核查时发现了三件比 524 更要紧的事，它们会直接决定重跑能不能产出有效结论。**

### 0.2 发现一：**元指令没有走标准对话通道**（2026-11-14 更正）

> ⚠️ **本节结论已更正。** 原文写「模型收到的指令只有 "Read" 这一个词」，
> 那是从 argv 被拆**推**出来的后果，不是实测的后果。实测的结果是：
> 产品提示词（`task.txt`）通过 `Read` 工具**完整送达**，
> 元指令（`_run.ps1` 里那段「别过度分析」）也被模型**自己读取补回**。
> 判别证据：**64/64 判别值命中，阴性对照非对角线 4.2%**。
> 详见 `_probe/29-prompt-truncation-bug.md` §三 §九 §十一。
>
> **受影响的只是行为类观测**（想多久、卡不卡、cut off），
> 内容类结论全部有效。**十案不需要重跑。**

以下是原始观测记录，保留作为 bug 本身的证据：

```
$ grep -o '"lastPrompt":"[^"]*"' C:/tmp/bb-home/.claude/projects/C--tmp-bb-S98/*.jsonl
"lastPrompt":"Read"

$ grep -o '"content":"Read"' C:/tmp/bb-home/.claude/projects/C--tmp-bb-S97/*.jsonl | head -2
"content":"Read"
"content":"Read"
```

十个案子的第一个 thinking 全都在问「用户只说了 Read 是什么意思」：

| 案 | 首个 thinking 原文（截取） |
|---|---|
| S08 | The user's message is just "Read" — that's odd. |
| S13 | The user just sent "Read" as the message. |
| S15 | The user's message is just "Read" with no arguments. |
| S22 | The user's message is just "Read" with essentially no content. |
| S32 | The user's message is just "Read" — which seems like a truncated or odd prompt. |
| S35 | The user's message is just "Read" with no further context. |
| S97 | The user's message is essentially just "Read" with no file path specified. |
| S98 | The user just said "Read". That's a minimal message. |
| S31 | The user has invoked `/init` ... the instruction is just "Read" |

复算：
```bash
node -e 'const fs=require("fs");const l=fs.readFileSync("C:/tmp/s_S98.txt","utf8").split(/\r?\n/);for(const x of l){let d;try{d=JSON.parse(x)}catch(e){continue}if(d.type==="assistant")for(const c of d.message.content||[])if(c.type==="thinking"){console.log(c.thinking.slice(0,200));process.exit()}}'
```

**根因**（已用最小实验复现，不是推测）：

```
C:/tmp/runner-template.ps1:17   $msg = "Read task.txt in this directory, then write the finished page to out.html ..."
C:/tmp/runner-template.ps1:18   $argList = @("-p", $msg, "--model", "opus", ...)
C:/tmp/runner-template.ps1:20   Start-Process -ArgumentList $argList
```

`Start-Process -ArgumentList` 接收数组时，会把元素**用空格拼接后整串交给命令行**，
**不加引号**。实测：

```
$ powershell -File /tmp/t.ps1
ARRAY JOIN (= what Start-Process passes):
  -p Read task.txt in this directory, then write the finished page to out.html ... --model opus
```

于是 `claude.exe` 收到的 argv 是 `-p Read task.txt ...`，`-p` 只吃掉第一个 token `Read`。
**整个运行器提示语（约 240 字符）没有一句话到达模型。**

**影响**（2026-11-14 更正）：模型从没在**对话通道**里被告知「只读一遍 task.txt、
别过度分析、用一次 Write 写 out.html」。它要么自己猜（S31 就是这样，所以写了
`index.html`），要么去读 `_run.ps1` 把指令补回来（S99 就是这样，28 次写操作全部
打到 `out.html`）。

**所以受影响的不是「内容」，是「行为」** —— 耗时、卡不卡、523/524 的可比性。
内容类结论（配色、字号、尺寸、结构）全部有效，因为那些值在 `task.txt` 里，
`Read` 返回的是全文。

原文推测「这解释 S98 的 47,212 token 权衡和 S04/S13 的三次 cut off」——
这条**已查，不成立**（2026-11-14）。

依据：S21 重跑时元指令**完整送达**（`_probe/_staged/S21-runner.log` 第一行就是
整句 `-p "Read task.txt ... write out.html in a single Write call ..."`），
它仍然陷入 **78,876 thinking token** 的长思考，87 分钟零 Write。
所以长思考是这个案型的性质，不是传参 bug 造成的。

完整数据：`_probe/34-s21-rerun.md`、`_probe/_staged/S21-thinking-stall.json`。

> 这一条不影响「任务书本身」的可信度：十个案子都自己找到并读了 `task.txt`
> （实测 `readTask.txt=true` 10/10）。所以**对提示词内容的测量仍然有效**，
> 失效的是「约束模型行为的那一层」。

### 0.3 发现二：`claude -p` 的**流式截断被静默吞掉**，然后模型被要求「接着写」

四个案子出现了 harness 注入的续写指令：

```
S04  3 次  "Your response above was cut off mid-stream. Resume directly ..."
S13  3 次  同上
S98  1 次  同上
S15  1 次  "Output token limit hit. Resume directly ..."
```

对照：S22 / S31 / S32 / S35 / S97 **0 次**。

`maxOutputTokens = 64000`，而 S98 那段 thinking 实测 **165,299 字符 ≈ 4.7 万 token**，
其中从第一个 `<!DOCTYPE html>` 到最后一个 `</html>` 之间是 **120,144 字符**的页面草稿。
token 累积曲线在截断点归零（`estimated_tokens` 47212 → 1 → 43199 → 1 → 40108），
即 **至少 2 次完整的思考体被丢弃**，只留下尾部。

**S98 的 thinking 里其实有一份约 130KB 的 HTML 草稿**（复算见 §三 T6）。
也就是说：**它并没有「想不出来」，它在思考里把页面写出来了，只是没有机会落到文件。**
这直接推翻「有机制、无数值 ⇒ 模型无法收敛」这个读法。

### 0.4 发现三：这份 S98 是**跑在 deepseek-v4.1-flash 上**，不是它声称的 opus

```
init.model        = "claude-opus-5[1M]"
assistant.model   = "deepseek-ai/deepseek-v4.1-flash"   (S98: 10 条)
result.modelUsage = {"claude-opus-5[1M]": {...}}        ← 只有付费口径写 opus
```

十四个 stream 全部如此（S04…S99）。这与 `_probe/07-model-routing-finding.md` 记录一致。
**但 S98 是唯一一个 thinking 达到 4.7 万 token 还一个字没写出来的**，
而其余 9 案在同一网关、同一模板下都产出了产物。所以「模型被换了」不能单独解释 S98。

### 0.5 所以重跑要回答的问题，比原来那个更精确

原来是：「删掉全部数值，模型还能不能做出结构？」——**这个问题在 0.3 之后已经部分有答案了：能，S98 的 thinking 里就有一份。**

要重跑的是这三问：

| # | 问题 | 为什么必须重跑 |
|---|---|---|
| **Q1** | 给足执行指令、且**跑完**的前提下，「有机制无数值」能否产出结构正确的页面？ | 原实验既没给指令也没跑完，两个混淆都没排除 |
| **Q2** | 产出若成立，它自选的数值与 S31 的真值（60/34/3、12/12/2、6.5 倍）差多少？ | 这是「数值承重 vs 文字承重」的真正判据 |
| **Q3** | 同一提示词多次运行，**结构层**稳不稳（不是内容层 —— 内容层已知不稳）？ | `20-reproducibility.md` 证明数值层稳、内容层不稳，但没测过「一种刻意缺值的提示词」 |

---

## §一 重跑前必须先修的管道（都不是跑沙箱）

**这三条不修，重跑就是第二次白跑。** 它们是硬前置。

### T1　修 `-p` 参数传递（阻断级）

- **目标**：让运行器提示语完整送达模型。
- **输入**：`C:/tmp/runner-template.ps1:17-20`；仓库副本 `_probe/_runner-template2.ps1:18-24`。
- **输出**：改后的模板 + 一个可离线验证的断言。
- **判据（可执行）**：
  ```bash
  # 改法：把数组换成单串 + 内嵌引号
  #   $argList = "-p `"$msg`" --model opus --permission-mode acceptEdits --output-format stream-json --verbose"
  # 验证：用 cmd echo 回显真实 argv 分词，必须看到 msg 作为一整段
  powershell -File /tmp/verify-argv.ps1   # 断言输出包含完整 msg 且不含 " -p Read task.txt "
  ```
  **退出码 0 且 stderr 为空**才算过。
- **依赖**：无。
- **给谁**：Runner Agent（1 人，20 分钟，不需沙箱）。

> ⚠️ 这条有一个「改完看起来更好但其实没生效」的陷阱：`claude.exe` 可能自己再做一次
> argv 重组。所以验收必须**看模型端收到了什么**，不是看 PowerShell 端拼出了什么。
> 最小验证：跑一次 30 秒的空任务，读 `C:/tmp/bb/<id>/stream.jsonl` 里第一个
> `type=assistant` 的 thinking，它**不该**再说「The user just said "Read"」。
> 这条验证要花一次真实调用（约 $0.01），**必须做**。

### T2　把 `terminal_reason` 与「可信」写进 `run.json`（阻断级）——**核查时发现已基本完成**

> ⚠️ **本节状态是我在写这份计划的过程中变的。** 我核查时发现 `_probe/` 下有四个
> 未被 git 跟踪的新文件（`_blindbox-verdict.ps1`、`-verdict-test.ps1`、
> `-verdict-regress.ps1`、`-syntax-check.ps1`）以及一份**未提交的** `_blindbox-run.ps1` 修改。
> 有另一个 Agent 正在并发处理这条，并且做得比计划更完整。**下面的判据按实测改写。**

- **已完成**：
  - `_blindbox-run.ps1` 已是 v2：每次尝试都写 `run.json`，字段含
    `terminalReason / terminalReasonRaw / apiErrorStatus / trusted / timedOut / attempts / retries`。
  - `_blindbox-verdict.ps1` 把「终态解析 + 重试决策 + worker 存活」抽成纯函数，可离线测。
  - `_blindbox-batch.ps1` 已改为**读 `run.json` 为准**（`:50` 起），汇总打印
    `terminalReason` 与 `trusted` 两列（`:89`）。
- **实测自检全部通过**（复算命令见文末附 8）：
  ```
  _blindbox-verdict-test.ps1    → 51 passed, 0 failed
  _blindbox-driver-test.ps1     → 92 passed, 0 failed
  _blindbox-syntax-check.ps1    → ALL_PARSE_OK
  _blindbox-verdict-regress.ps1 → 14 个真实 stream 全部分类符合预期
  ```
  其中 driver 测试里有一条正好覆盖我原本担心的场景：
  `T api_error + real page -> NO retry = False` / `output survives in run.json = True`
  —— **S97 那种「页面已写完、之后才 524」的情况不会被误重试覆盖**。
- **判据（现在只剩这一条要验）**：
  `_blindbox-run.ps1 -DryRun` 对 S98 的旧 stream 必须输出
  `terminalReason=api_error, apiErrorStatus=524, retry=True`。
  实测已过（`[dry] would classify as terminalReason=api_error -> retry=True (api_error)`）。
- **还没做的部分（我建议保留为独立任务）**：
  ① `run.json` 的 `attempts>1` 时，产物是**哪一次**尝试写的，当前没有字段记录。
     串行重试会清空前一次的 `out.html`（`Clear-CaseArtifacts`），所以不会混，
     但 `J3` 审计需要能回答「这份产物来自第几次」。
  ② `_blindbox-run.ps1` 超时后**不杀进程**（实测 `grep -c "Stop-Process\|taskkill"` = 0）。
     见 §九 表格最后一行。
- **给谁**：Runner Agent（收尾这 2 小项），30 分钟。

### T3　判据必须读全量 stream（阻断级）

- **目标**：任何「有没有发生 X」的断言，对**完整** stream 跑。
- **判据**：
  ```bash
  # 每个判定脚本开头必须打印实际读了多少行 / 多少字节 / 是否含 NUL
  # 且脚本必须自证「读到的行数 == 文件的真实行数」
  node _probe/xx.mjs  # 输出必须含 "READ full: <lines> lines / <bytes> B (verified == file size)"
  ```
- **已知反例**：S18 40% NUL、S21 76% NUL、S31 22% NUL。
  任何 `grep` 在这三份上都会**静默返回错误结果**。
  实测命令：`tr -d '\0' < file | wc -c` 对比 `stat -c%s`。
- **给谁**：Verify Agent，可与 T1/T2 并行。

---

## §二 任务表

编号规则：T = 工具/管道，R = 重跑运行，J = 判定，D = 文档。

| # | 目标 | 输入 | 输出路径 | 验收判据（可执行、有数字） | 依赖 | Agent |
|---|---|---|---|---|---|---|
| **T1** | 修 `-p` 传参 | `runner-template.ps1:17-20` | 改后模板 + 验证脚本 | cmd 回显含完整 msg；一次 30s 空跑的首个 thinking **不含** `The user just said "Read"` | 无 | Runner |
| **T2** | `run.json` 收尾 2 小项 | 现有 v2 runner | 改后 runner | ① `run.json` 记「产物来自第几次 attempt」；② 超时后杀 worker。现有 143 项自检（51+92）仍全过 | 无 | Runner |
| **T3** | 全量读断言 | 全部 `_probe/*.mjs` 判定脚本 | 改后脚本 | 每个脚本打印 `READ full: N lines / B bytes == file size`；对 S18/S21/S31 三个 NUL 文件不误判 | 无 | Verify |
| **T4** | 冻结 S98 任务书 | `blind/S98/task.txt` | md5 台账 | 记录 `76e26f192e4f60a81c00c4ba8716934f`（实测值）；39 行 / 5090 B；`grep -c px` = 0；`grep -cE '[0-9]+ *倍'` = 0；5 个 hex | 无 | Verify |
| **T5** | 从 S98 thinking 抢救草稿 | `C:/tmp/bb/S98/stream.jsonl` | `_probe/_staged/S98-thinking-draft.html` | 提取成功（实测 120,144 字符）；**文件名与首行都标注「非模型交付物，只作旁证」**；不得进入任何达标统计 | 无 | Verify |
| **T6** | 建立「结构层」判据 | S31 真值 + `_batch-compare.mjs` | `_judge-structure.mjs` | 区分 **L1 结构在不在**（主次两级/贯穿基线/SVG 刻度）与 **L2 数值对不对**（六值命中）；两层分数分开报；线宽容差 = 0（现行 0.6px 容差必须移除） | T3 | Judge |
| **T7** | 让同一案能跑多次 | `_blindbox-batch.ps1:29-36` | 改后 batch | batch 目前按 `blind/<id>/task.txt` 找任务书、按 `C:\tmp\bb\<id>` 建目录，**同一 id 无法跑第二遍**（第二遍会 `Remove-Item -Recurse` 掉第一遍）。加 `-RunTag` 参数或用 `blind/S98-r1..r3` 硬链接；判据：连跑两次后两份 `run.json` **同时存在**且 `task.txt` md5 相同 | T4 | Runner |
| **R1** | **S98 重跑 #1** | 任务书 md5 冻结 | `C:/tmp/bb/S98-r1/` | `run.json.trusted === true`；`out.html` 存在；§6.3 产物层全过；§6.2 指令层过 | T1,T2,T3,T4,T7 | Runner |
| **R2** | **S98 重跑 #2** | 同 R1，**同 md5** | `C:/tmp/bb/S98-r2/` | 同 R1 | R1 | Runner |
| **R3** | **S98 重跑 #3**（条件性，见 §5.3） | 同 R1 | `C:/tmp/bb/S98-r3/` | 同 R1 | R2 | Runner |
| **R4** | **S31 对照重跑**（尽量同一网关窗口） | `blind/S31/task.txt` | `C:/tmp/bb/S31-r1/` | `trusted === true`；六值命中 ≥ 5/6；**stream 里必须有 ≥1 次 Write 记录**（这是本次要解决的溯源问题） | R1 | Runner |
| **J1** | S98 结构判定 | R1/R2/R3 产物 | `_probe/_S98-rerun-judge.md` | 对每个产物报 L1/L2 两层；三次之间的结构层一致性 | R1,R2 | Judge |
| **J2** | S98 vs S31 数值偏离 | R 系产物 + S31 基线 | 同上 | 报「S98 自选值 / S31 真值」逐项比值；**不设通过/失败阈值，只报数** | J1,R4 | Judge |
| **J3** | 运行可信度审计 | 全部 `run.json` + stream | `_probe/_rerun-trust-audit.md` | 逐次核对：`trusted`、`attempts`、`api_retry` 次数、NUL 比例、mtime 差、**收到的指令全文** | 每次跑完立即做一次 | Verify |
| **D1** | 重写 `07-NEGATIVE-B.md` | J1/J2/J3 | 覆盖 07 | 必须写清：旧结论作废的原因（三个，不是两个）；新结论的样本量 | J1,J2,J3 | Main |
| **D2** | 修 `06-BLIND-RESULT.md` §零 | D1 | 覆盖 06 | §零 的 S98 行改成实测结论；§四「正对照❌未做」这句矛盾一并修（`19-report-consistency.md` §3.1） | D1 | Main |

**总计 16 个任务**：7 个工具/管道（其中 T2 已基本完成）、3 次 S98 重跑、1 次 S31 对照、3 个判定、2 个文档。

> **T7 是写这份计划时才发现的缺口**：`_blindbox-batch.ps1:34` 每次先
> `Remove-Item $taskDir -Recurse -Force`，而目录名就是案号。
> 所以「同一个案跑三次」这件事**当前脚本做不到** —— 第二次会把第一次的产物删掉。
> 如果不先修，R2 会覆盖 R1 的证据，而这正是 `06-BLIND-RESULT.md:96-102` 记录过的
> 「产物没有版本化，每次重跑都被覆盖」那个缺陷的**原样复发**。

---

## §三 关键任务的实测依据（为什么这么设计）

### T5：S98 的 thinking 里到底有什么

```bash
# 复算
node -e '
const fs=require("fs");
const l=fs.readFileSync("C:/tmp/s98.txt","utf8").split(/\r?\n/);
const d=JSON.parse(l[30094].trim());
const th=d.message.content.find(c=>c.type==="thinking").thinking;
console.log("thinking chars:",th.length);
const a=th.indexOf("<!DOCTYPE html>"), b=th.lastIndexOf("</html>")+7;
console.log("html region:",b-a,"chars");
console.log("hexes:",[...new Set(th.match(/#[0-9A-Fa-f]{6}/g)||[])].join(" "));
console.log("--maj block:", th.slice(th.indexOf("--maj:")-40, th.indexOf("--maj:")+300));
'
```

实测输出（节选）：

```
thinking chars: 165299
html region: 120144 chars   (第一个 DOCTYPE 到最后一个 </html>，含收尾标签)
hexes: #F2F0EC #5F5B55 #DEDAD3 #55514B #8A857C        ← 5/5，提示词给的色全中
:root{ --lw:2px; --maj:48px; --min:12px; --majlen:24px; --minlen:6px; }
<svg class="ruler-svg" ...>
  <pattern id="majTicks" width="48" height="24"> <rect width="2" height="24"/>
  <pattern id="minTicks" width="12" height="6">  <rect width="2" height="6"/>
  <rect y="0"   width="100%" height="2"/>   <!-- 上基线 -->
  <rect y="174" width="100%" height="2"/>   <!-- 下基线 -->
```

**这是本计划里最重要的一组证据**：

1. **配色 5/5 全中** —— 与 S31 相同的 5 个 hex。说明「照着值做」的通道是通的。
2. **它自己造了一套主次刻度**：`48 / 12`（1:4）、`24 / 6`（1:4）、线宽 `2px`。
   S31 的真值是 `60 / 12`（1:5）、`34 / 12`、线宽 `3+2` 两级。
3. **它做出了两条贯穿基线 + 两排刻度**，与机制句要求的完全一致。
4. `48px` 与 `60px` 差 **20%**，`2px` 相对 S31 的 `3px` 差 **33%**。

**所以在 thinking 层面，「文字能否传递结构」这个问题已经有偏正面的答案：
结构传到了，精确值没传到。** 这正是 `_judge-S98.mjs` 设计时预期的「L2 成立、L3 偏离」那一格。

> ⚠️ **但它不能当结论用**，原因有三，必须写进报告：
> ① 这是 thinking，不是交付物；② 这段 thinking 里有 98 处 `...` 省略（全段 141 处），
> 最长连续代码块只有 16 行；③ 它发生在一次**未跑完**的运行里。
> **它只能作为「重跑时值得验证的假设」，不能替代重跑。**

### T6：判据必须分两层，否则会重犯 `19-report-consistency.md` §1.2 的错

现行的 `_batch-compare.mjs:108` 有一个 0.6px 容差：

```js
return ![...gotLW].some((v) => Math.abs(v - n) < 0.6 || Math.abs(v - Math.ceil(n)) < 0.01);
```

它把 `1.5` 认成 `2`、`0.8` 认成 `1`，于是「S18 五档只用了两档」被报成「缺一档」。
**S98 的产物恰恰会用一堆非整数 px**（48/12/24/6/17/56/176），这个容差会把它糊成一片。
新判据必须**先打印原始值集合，再做匹配**，且容差设 0。

### T4：任务书是冻结点，不是可改的东西

```
$ md5sum deliverables/78-northstar/blind/S98/task.txt
76e26f192e4f60a81c00c4ba8716934f
$ wc -l -c deliverables/78-northstar/blind/S98/task.txt
39  5090
$ grep -c 'px' ...  → 0     $ grep -cE '[0-9]+ *倍' ...  → 0
$ grep -o '#[0-9A-Fa-f]\{6\}' ... | sort -u | wc -l → 5
```

**三次重跑必须是同一份字节。** `20-reproducibility.md` §1.2 已经因为「两次提示词不同」
（S31 短版 2338B vs 长版 5025B）废掉过一次对比，不要重犯。

---

## §四 并行度

### 4.1 硬约束（实测，不是估计）

**沙箱 Deny ACE 按账户生效**：`icacls D:\Web\style /deny ClaudeBlindBox:(OI)(CI)(RX)`。
`_blindbox-batch.ps1:4-9` 已写明：几个沙箱重叠时，任一撤 Deny 都会静默解隔离其余。
**所以所有 R 任务必须串行。**

（`05-RESUME-HERE.md` §五提到 `ClaudeBlindBox2` 已建、`SeBatchLogonRight` 已授，
但计划任务启动失败、未继续查。**本计划不依赖双账户并行**，理由见 §八 的坑 4。）

### 4.2 并行图

```
第一批（可全并行，都不碰沙箱/网关）  第二批（串行，一条时间线）
┌──────────────┐                 ┌──────────────────────────────────┐
│ T1 修 -p 传参 │──┐              │ R1 S98#1 → R2 S98#2 → R3 S98#3    │
├──────────────┤  │              │              ↘ R4 S31 对照         │
│ T2 run.json  │──┤              │  （每次跑完立刻 J3 审计那一次）      │
├──────────────┤  │              └──────────────────────────────────┘
│ T3 全量读断言 │──┤   验收门                    ↓
├──────────────┤  │  (T1 空跑验证      J1 结构判定（R1+R2 到手即可开）
│ T4 冻 md5    │──┼── 必须过) ──→   J2 数值偏离（等 R4）
├──────────────┤  │                  D1 改 07（等 J1+J2+J3）
│ T5 抢救草稿   │──┤                  D2 改 06（等 D1）
├──────────────┤  │
│ T6 结构判据   │──┤
├──────────────┤  │
│ T7 多次跑支持 │──┘
└──────────────┘
```

### 4.3 关键路径

**T1 的空跑验证 → T7（同一案跑多次的支持）→ R1 → R2 → J1 → D1 → D2。**

两个「不通过就全停」的节点：

- **T1**：如果空跑验证做了但模型仍抱怨指令不全，先查 argv，
  **不能带着这个缺陷去跑 3 次 × 4 小时**。
- **T7**：如果 batch 仍然按案号覆盖目录，R2 会静默删掉 R1 的证据。
  这个不报错 —— 它只是让第一份产物消失，而报告里会看起来「跑了两次」。

---

## §五 样本量论证：**跑 3 次，其中第 3 次是条件性的**

### 5.1 为什么不是 1 次

一次运行**无法区分**这三种情况：

```
产物 = 结构正确 + 数值自选    →  "文字传递结构，数值靠模型"
产物 = 结构缺失              →  "文字不传递结构"
无产物                       →  "卡住了"  还是  "网关又挂了"
```

第三种在 S98 上已经发生过一次。**单次运行 + 网关会 524 = 结论不可用。**

### 5.2 为什么不是 2 次

两次能区分「有没有」和「稳不稳」，但**两次一致也可能是巧合**。
参考实测分布：`20-reproducibility.md` §1.4 显示同一提示词两次产物的**标题全换**（S04/S13/S29，8-gram 0.000~0.042）。
内容层两次就能翻盘，结构层没有先验。

### 5.3 为什么是 3 次，以及第 3 次的条件

| 观察结果（前两次） | 第三次 | 结论强度 |
|---|---|---|
| 两次都 `trusted` 且结构 L1 都成立 | **不跑** | 「文字能传结构」有 2 个独立样本，够了 |
| 两次都 `trusted` 但 L1 一次成一次不成 | **跑** | 需要第 3 个点定它是「偶发」还是「50/50」 |
| 一次 `trusted` 一次不 `trusted` | **跑** | 不可信运行必须补足 2 个可信样本 |
| 两次都不 `trusted` | **停，不跑** | 问题在管道不在模型，先查 §六 的坑 |

**这条规则要写死成脚本判据**，不能靠人临场决定 —— 本仓库记录在案的失误里，
有一半是「临场判断时用了坏判据」。

### 5.4 S31 对照为什么必须跑

现有 S31 数据有两个污点，**都已被独立 agent 查明**：

```
20-reproducibility.md §4.4：S31 的 stream 有 41422 个事件、0 次 Write、0 次 Edit
                           产物 mtime 比 stream 结束早 2.5 小时
                           → 标记 UNVERIFIED-PROVENANCE
20-reproducibility.md §4.5：S31 的 stream 有 2,499,790 个 NUL 字节（22%）
```

**当前的「六值精确命中」是从一份无法溯源到写入动作的产物上量出来的。**
如果重跑 S98 而不重跑 S31，那么「S98 自选 48px vs S31 的 60px」这个对比，
一侧是干净的新数据、另一侧是旧的可疑数据 —— **不成立**。

**R4 的作用**：在同一个网关窗口下产出一份**可溯源**的 S31 基线。
判据：S31 重跑必须也 `trusted`，且六值命中 ≥ 5/6（允许 1 个偏差，因为这是采样不是复刻）。

---

## §六 失败判定：什么样的结果算「这次运行不可信」

按「先判运行、再判产物、最后判结论」三层。**任何一层不过，该次运行不进入统计。**

### 6.1 第 0 层：运行层（一票否决）

`run.json` 由 v2 runner 自动写。**必须逐条核对，不能只看有没有文件。**

```jsonc
{
  "trusted": true,              // ← 唯一准入条件。= (terminalReason === 'success')
  "terminalReason": "success",  // ← 允许值只有这一个
  "terminalReasonRaw": "completed",
  "apiErrorStatus": null,
  "attempts": 1,                // >1 说明重试过，要记录但不必否决
  "hasOutput": true,
  "outputBytes": 20000
}
```

**判 `不可信` 的条件（任一命中）**：

| 条件 | 实测先例 |
|---|---|
| `terminalReason !== 'success'` | S97 与 S98 都是 `api_error` |
| `is_error === true` 但 `subtype === 'success'` | **S97/S98 都是这个组合**，必须靠 `is_error` 压过 `subtype` |
| stream 末 200 行内出现连续 `api_retry` 且 `error_status: 524` | S98 第 58031–58038 行，8 连 |
| `out.html` 不存在 | S98 |
| 产物完整性检查不过（`</html>` / `</body>` / `</style>` 缺任一、花括号不平） | `20-reproducibility.md` §4.1 那套 |
| stream 含 NUL 字节且未去零 | S18 40% / S21 76% / S31 22% |

### 6.2 第 1 层：指令层（本轮新增，最容易漏）

**这是 §0.2 那件事的直接产物。** 每次运行必须回答：**模型收到的指令是什么？**

```bash
# 判据：从 sandbox transcript 读 lastPrompt / content
grep -o '"lastPrompt":"[^"]*"' C:/tmp/bb-home/.claude/projects/C--tmp-bb-<id>/*.jsonl
# 通过 = 前 200 字符与 $msg 的前 200 字符相同
# 失败 = 等于 "Read"   ← 旧运行器（数组传参）必然落到这里
# 注意：lastPrompt 硬截断在 201 字符（实测），所以判据只能是前缀比对，不能要求全文相等。
```

> ⚠️ **2026-11-14 更正**：本轮十个案「10/10 全失败」指的是**元指令**没走对话通道，
> 不是**产品提示词**没送到。产品提示词走 `Read task.txt`，字节完整（64/64 判别值证明）。
> 所以这一层应该拆成两个断言：
>
> | 断言 | 本轮结果 | 修好运行器后 |
> |---|---|---|
> | 产品提示词是否到达 | ✅ 到达（`Read task.txt`） | 应仍到达 |
> | 元指令是否走对话通道 | ❌ 未走（`lastPrompt = "Read"`） | 应走 |
>
> **只断言后者，别把前者一起判死** —— 那正是 §三 旧表犯的错。
```

**这一条如果不过，整个重跑等于没做**：因为「模型想多久才动手」这个观测，
在「有指令」和「没指令」两种情况下不可比。

### 6.3 第 2 层：产物层

| 检查 | 阈值 | 依据 |
|---|---|---|
| `</html>` / `</body>` / `</style>` 各 1 个 | == 1 | §4.1 的 12 份产物全过 |
| CSS 花括号净差 | == 0 | 同上 |
| 占位标记（`TODO`/`省略`/`lorem`/`xxx`） | == 0 | 同上 |
| 正文可见字符 | ≥ 300 | `< 300` 警示偷工（`20-reproducibility.md` §3.2） |
| mtime 与 stream 最后一次写入 差 | ≤ 120 s | 实测最大 68s（S22） |

### 6.4 第 3 层：结论层

**只有满足以下全部，才能写「删掉数值会怎样」的结论：**

```
1. 至少 2 次 S98 运行 trusted === true
2. 至少 2 个可信产物的完整性检查全过
3. 有 1 次可溯源的 S31 基线（R4）
4. 判据对全量 stream 跑过（T3 的断言成立）
```

**任一条不满足 → 报告里只能写「仍未回答」，不能写「倾向」。**
参照 `06-BLIND-RESULT.md` §0.1 已经犯过一次的错：把 `2 小时` 这种中途快照当终值发表。

---

## §七 成本估计

### 7.1 基线（全部取自 `stream.jsonl` 的 `duration_ms` 与 `total_cost_usd`，不是报告里的估算表）

| 案 | duration_ms | 小时 | 花费 | terminal_reason | 产物 |
|---|---|---|---|---|---|
| S35 | 1,692,533 | 0.47 | $1.33 | completed | 19510 B |
| S97 | 2,618,689 | 0.73 | $1.14 | **api_error/524** | 20853 B |
| S32 | 4,318,787 | 1.20 | $2.76 | completed | 23289 B |
| S22 | 8,408,269 | 2.34 | $4.36 | completed | 22952 B |
| S13 | 10,316,958 | 2.87 | $2.08 | completed | 31256 B |
| S31 | 12,252,177 | 3.40 | $4.25 | **api_error** | 22064 B |
| S98 | 15,381,773 | 4.27 | $0.62 | **api_error/524** | **无** |
| S04 | 14,980,528 | 4.16 | $0.80 | **api_error** | 32829 B |
| S15 | 15,737,672 | 4.37 | $38.25 | completed | 47030 B |

> ⚠️ `06-BLIND-RESULT.md` §3.1 那张耗时表（S18 331s、S15 1027s、S29 5582s）**与实测差 5~15 倍**，
> 已由 `19-report-consistency.md` §1.3 证实不可复算。**成本估算只能用上表。**

### 7.2 S98 重跑的成本区间

S98 自己的历史数据点：**4.27 小时 / $0.62**（它没写出东西，所以 token 花得少）。
但 §0.3 查明它在 thinking 里写了一份 130KB 草稿，所以**一旦修好 T1，它很可能会真的落盘**，
成本会显著上升。

用同类案外推：

```
一次 S98 重跑：   3.5 ~ 5.5 小时，$1 ~ $6     （不确定区间大，因为 T1 修好后行为会变）
3 次 S98：        10.5 ~ 16.5 小时，$3 ~ $18
1 次 S31 对照：   3.4 小时（实测基线），$4.25
──────────────────────────────────────────
合计（3 次全部要跑）：  14 ~ 20 小时，$7 ~ $22
合计（第 3 次不跑）：    7 ~ 9 小时，  $5 ~ $10
```

### 7.3 时间安排建议

**不要一个晚上跑完。** 串行 3~4 次 × 4 小时，中间只要有 1 次网关抽风就全线延后。
建议：

```
Day 1 上午   第一批 T1-T6（全部离线，2-3 小时，0 成本）
Day 1 下午   T1 的空跑验证（30 秒，$0.01）→ 过了才继续
Day 1 晚     R1 S98#1 启动（跑一整夜）
Day 2 上午   R1 结果 + J3 审计第一段 → 决定 R2 跑不跑
Day 2 白天   R2 S98#2（+ R4 S31 对照，如果时间允许）
Day 2 晚     R3（仅当 §5.3 的条件触发）
Day 3        J1 / J2 / D1 / D2
```

**关键**：每次跑完立刻做 J3 的**运行层**审计（只读 `run.json`，5 分钟），
**不要等三次跑完再一起看**。如果 R1 的 `trusted === false`，当晚就不该跑 R2。

---

## §八 我认为主线程最可能再次弄错的地方

> **这一节是本文件最重要的部分。** 每一条都对应本轮已经发生过的一次真实失误，
> 或者是我在核查时发现的、还没人写的下一次。

### 坑 1（最可能）**用 `subtype === "success"` 判成功**

```json
{"type":"result","subtype":"success","is_error":true,"api_error_status":524,"terminal_reason":"api_error"}
```

**S97 和 S98 都是这个组合。** 一行 `jq '.subtype'` 会告诉你「成功」。
`_blindbox-verdict.ps1` 已经写明了「is_error=true 压过一切」，但那是**新代码**；
主线程读旧报告、写新汇总时，极可能又去看 `subtype`。

**防御**：任何统计脚本只允许读 `run.json.trusted`，**禁止直接读 stream 的 `subtype`**。

### 坑 2　**把「跑完了」当成「模型做得出」**

S97 的 `terminal_reason` 也是 `api_error`，但它有 20853 字节的完整产物 ——
因为 Write 发生在 524 风暴**之前**（第 6250 行 Write，6252 行才开始 retry）。

所以 `terminal_reason=api_error` **既不蕴含「没跑完」也不蕴含「产物无效」**。
反过来，`terminal_reason=success` **也不蕴含「产物是这次写的」**（见坑 3）。

**正确读法**：`trusted` 只说明「这次运行正常收尾」，产物有效性要另判（§6.3）。

### 坑 3　**不核对产物 mtime 与 stream 写入时刻**

S31 的产物 mtime 比 stream 结束早 **2.5 小时**，且 stream 里 **0 次 Write**。
`20-reproducibility.md` §4.4 已经把它标成 `UNVERIFIED-PROVENANCE`，但
`06-BLIND-RESULT.md` §一 的十案表里，S31 仍然是第一行、没有任何标记。

**重跑时**：每次收集产物必须记 `mtime` 与 `stream 最后写入时刻` 的差，
**差 > 120 秒就标 `PROVENANCE-UNSURE`**。

### 坑 4　**为了赶时间去做双账户并行**

`05-RESUME-HERE.md` §五 说 `ClaudeBlindBox2` 建好了、权限也授了，「但计划任务启动失败，没继续查」。

**这是本计划里唯一一个我建议明确否决的方向。**
理由不是技术难度，是**失败模式**：并行跑起来后如果隔离静默失效，
产物看起来 100% 正常、`trusted === true`、数值全中 —— **没有任何判据能发现**。
而这一轮的教训恰恰是「判据看到的东西 ≠ 实际发生的事」。

**串行 3 次 = 14~20 小时，是可接受的代价。用这个换一个不可检测的失败模式，不划算。**

### 坑 4b　**让 R2 静默覆盖 R1 的产物**

这是我写这份计划时发现的、**还没有人记录**的一个缺口：

```powershell
# _blindbox-batch.ps1:33-36
$taskDir = Join-Path $outRoot $id           # 目录名 = 案号
if (Test-Path $taskDir) { Remove-Item $taskDir -Recurse -Force }
```

「同一个案跑三次」=「三次都进 `C:\tmp\bb\S98`」= **第二、三次把前一次的产物删掉**。
`batch-result.json` 也会被覆盖（实测现在只剩 S97 一条，`19-report-consistency.md` §1.3 已记）。

**这正是 `06-BLIND-RESULT.md:96-102` 自己写下的那个缺陷**：
「产物没有版本化，`C:\tmp\bb\<案号>\out.html` 每次重跑都被覆盖。这是本轮一个真实的方法论缺陷。」
**如果不先修 T7，重跑会原样再犯一次，而且这次会毁掉 14~20 小时的证据。**

**防御**：目录必须带 run tag（`S98-r1/`、`S98-r2/`），并且**跑完立刻把产物与 `run.json`
复制进版本库**（`_staged/` 或直接 git commit），不要留在 `C:\tmp`。
`C:\tmp` 已经丢过一次证据（`batch-result.json`）。

### 坑 5　**以为修了 T1 就万事大吉，不验证指令真的到了**

§0.2 那个 bug 的形状是：**PowerShell 端拼出来的字符串是对的，模型端收到的是错的。**
`Start-Process -ArgumentList @("-p", $msg, ...)` 在 PowerShell 里打印出来完全正常。

如果只做「改代码 + 看代码」，会 100% 以为修好了。**必须看 `lastPrompt`。**

### 坑 6　**把 S98 thinking 里那份 130KB 草稿当成结果**

它存在（T5 有完整复算），而且**看起来非常有说服力**：配色 5/5、主次刻度、两条基线齐全。

**但它是一段被截断两次的思考体**：`estimated_tokens` 47212 → 1 → 43199 → 1 → 40108，
草稿区里 98 处 `...` 省略，最长连续代码块只有 16 行。
把它当成「S98 其实做出来了」的证据，**就是本仓库第八次「判据量的不是它声称量的东西」**。

**它的正确用法**：作为重跑前写下的**可证伪假设**——
「如果 R1 产出结构，预期它会用一组 1:4 比例的刻度值，而不是 S31 的 1:5」。
然后让 R1 去验。

### 坑 7　**样本量临场改**

跑完 R1 发现产物不理想，就想「再跑一次看看」；跑完 R2 发现一致，就想「两次够了」。
`§5.3` 那张表就是为了防这个。**把它写成脚本，不要留给人判断。**

### 坑 8　**在旧报告上做增量修改，留下自相矛盾**

`19-report-consistency.md` §3.1 已经抓到过一次：`06` 的 §零 把 S97 当既成事实，
而 §四 同一份文件里写着「正对照 ❌ 未做」。

**重跑结论出来时，`06` / `07` / `08` 三份必须整段重写，不能局部补。**
特别是 `08-POSITIVE-CONTROL.md` §二、§四.1、§五 三处都直接用了 S98 当反例。

---

## §九 我认为不可行 / 不建议的方案

| 方案 | 为什么不建议 |
|---|---|
| **用 `--resume` 续跑 S98 的旧 session** | session `0f87a98b` 的 transcript 只剩 13 条系统事件，对话体已不在（实测该 jsonl 只有 8344 字节）。且续跑会继承「只收到 Read」的错误上下文。 |
| **只跑 1 次 S98** | 见 §5.1。524 已经毁过一次，单次样本没有抗风险能力。 |
| **降 `CLAUDE_CODE_EFFORT_LEVEL` 提速** | 实测 14 个 stream 的 `init` 事件里 `effort` 字段**全部是 `undefined`**，说明这个参数未必真传到模型侧。改它可能只改元数据，而且会破坏「同条件重跑」的前提（`20-reproducibility.md` §2.3 已论）。 |
| **并行跑（多账户）** | 见坑 4。 |
| **用 S98 的 thinking 草稿直接下结论，省掉重跑** | 见坑 6。 |
| **把超时从 2400s 提高** | 方向对但不够：`_blindbox-run.ps1` 在超时后**不杀进程**（实测 `grep -c "Stop-Process\|taskkill"` = 0），只是停止等待。这会让下一次运行与上一次的 worker 重叠，**而重叠正好破坏 Deny ACE 的按账户假设**。这是我在核查时发现的**尚未被记录的缺陷**，建议并入 T2。 |

---

## §十 需要主线程先确认的两个问题

1. **是否接受把「重跑」从 1 次扩到最多 3 次（14~20 小时）**？
   如果不接受，退而求其次的最小方案是：**R1 + R4 两次（约 7~9 小时）**，
   结论强度降级为「1 个可信样本 + 1 个可溯源基线」，报告里必须如实写这个样本量。

2. **T1 修复后是否愿意接受「S98 这次可能真的产出页面」**？
   如果产出，那原来的「半个具体 = 卡死」就彻底不成立了，产品侧的风险描述要改写
   （`08-POSITIVE-CONTROL.md` §4.2 那段「真实的脆弱点」要重写）。
   **这是好事，但它会让「加闸门 D3」的理由从「防失效」降级为「防内容丢失」**，
   这个连带影响要提前想清楚。

---

## 附：本文件所有数字的复算命令

> **前置**：下面几条命令读的是去零后的临时副本。先跑这一步（`C:/tmp` 会被清，不要假设它还在）：
> ```bash
> cd "C:/tmp/bb" && for id in S04 S08 S13 S15 S18 S21 S22 S29 S31 S32 S35 S97 S98 S99; do
>   [ -f "$id/stream.jsonl" ] && tr -d '\0' < "$id/stream.jsonl" > "C:/tmp/s_$id.txt"
> done
> # 校验：去零后字节数应与原文件相同（本机这 14 份目前 NUL=0 的 11 份，
> # S18/S21/S29/S31 四份会变小 —— 那正是 §六 说的 NUL 污染）
> ```

```bash
# 0. 一次性体检：14 个 stream 的 terminal_reason / 524 / NUL（第一批要看的第一个数字）
cd "C:/tmp/bb" && for d in */; do id=${d%/}; f="$id/stream.jsonl"; [ -f "$f" ] || continue
  o=$(stat -c%s "$f"); n=$(tr -d '\0' < "$f" | wc -c)
  printf "%-4s %10sB nul=%5s%% %s\n" "$id" "$o" "$(( (o-n)*100/o ))" \
    "$(tr -d '\0' < "$f" | grep -o '"terminal_reason":"[a-z_]*"' | tail -1)"
done

# 1. S98 结尾的 524 与 terminal_reason（注意：subtype=success 与 is_error=true 并存）
tail -1 "C:/tmp/bb/S98/stream.jsonl" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.subtype,j.is_error,j.api_error_status,j.terminal_reason)})'

# 2. 模型实际收到的指令（§0.2 的核心证据）
grep -o '"lastPrompt":"[^"]*"' "C:/tmp/bb-home/.claude/projects/C--tmp-bb-S98/"*.jsonl
grep -o '"content":"Read"' "C:/tmp/bb-home/.claude/projects/C--tmp-bb-S97/"*.jsonl | head -2

# 3. 十案首个 thinking 都在问 "Read" 是什么意思
node -e 'const fs=require("fs");for(const id of ["S04","S08","S13","S15","S22","S31","S32","S35","S97","S98"]){const p="C:/tmp/s_"+id+".txt";if(!fs.existsSync(p))continue;let f=null;for(const l of fs.readFileSync(p,"utf8").split(/\r?\n/)){let d;try{d=JSON.parse(l)}catch(e){continue}if(d.type==="assistant")for(const c of d.message.content||[])if(c.type==="thinking"&&!f)f=c.thinking;if(f)break}console.log(id,"::",(f||"").slice(0,90).replace(/\n/g," "))}'

# 4. 截断续写指令
node -e 'const fs=require("fs");for(const id of ["S04","S08","S13","S15","S22","S31","S32","S35","S97","S98"]){const p="C:/tmp/s_"+id+".txt";if(!fs.existsSync(p))continue;const n=fs.readFileSync(p,"utf8").split(/\r?\n/).filter(l=>/cut off mid-stream|Output token limit/i.test(l)).length;if(n)console.log(id,n)}'

# 5. S98 thinking 里的 120K 字符草稿与自选刻度值
node -e 'const fs=require("fs");const l=fs.readFileSync("C:/tmp/s_S98.txt","utf8").split(/\r?\n/);const d=JSON.parse(l[30094].trim());const th=d.message.content.find(c=>c.type==="thinking").thinking;const a=th.indexOf("<!DOCTYPE html>"),b=th.lastIndexOf("</html>")+7;console.log("draft chars",b-a);console.log(th.slice(th.indexOf("--maj:")-30,th.indexOf("--maj:")+200))'

# 6. 十案耗时与花费（成本基线）
cd "C:/tmp/bb" && for id in S04 S08 S13 S15 S22 S31 S32 S35 S97 S98; do printf "%s " $id; tr -d '\0' < $id/stream.jsonl | grep -o '"duration_ms":[0-9]*\|"total_cost_usd":[0-9.]*' | tail -2 | tr '\n' ' '; echo; done

# 7. NUL 污染（T3 的依据）
cd "C:/tmp/bb" && for id in S18 S21 S29 S31; do o=$(stat -c%s $id/stream.jsonl); n=$(tr -d '\0' < $id/stream.jsonl | wc -c); echo "$id $((o-n)) NUL / $o = $(( (o-n)*100/o ))%"; done

# 8. v2 runner 的自检（复核 T2 的「已完成」结论）
cd deliverables/78-northstar/_probe
powershell -NoProfile -File _blindbox-verdict-test.ps1      # 实测 51 passed, 0 failed
powershell -NoProfile -File _blindbox-driver-test.ps1       # 实测 92 passed, 0 failed
powershell -NoProfile -File _blindbox-syntax-check.ps1      # 实测 ALL_PARSE_OK
powershell -NoProfile -File _blindbox-verdict-regress.ps1   # 实测 14 个真实 stream 全部分类正确
powershell -NoProfile -File _blindbox-run.ps1 -TaskDir C:/tmp/bb/S98 -OutFile C:/tmp/bb/S98/out.html -DryRun
# 期望末行：[dry] would classify as terminalReason=api_error -> retry=True (api_error)

# 9. T7 的依据：batch 会按案号覆盖目录
grep -n "Remove-Item \$taskDir -Recurse" deliverables/78-northstar/_probe/_blindbox-batch.ps1

# 10. S98 任务书冻结值（T4 的判据）
md5sum deliverables/78-northstar/blind/S98/task.txt        # 76e26f192e4f60a81c00c4ba8716934f
wc -l -c deliverables/78-northstar/blind/S98/task.txt     # 39  5090
grep -c 'px' deliverables/78-northstar/blind/S98/task.txt # 0
grep -oE '[0-9]+ *倍' deliverables/78-northstar/blind/S98/task.txt | wc -l  # 0
grep -o '#[0-9A-Fa-f]\{6\}' deliverables/78-northstar/blind/S98/task.txt | sort -u | wc -l  # 5
```
