# 沙箱运行器：重试机制与结束原因记录

> 2026-11-14　执行 Agent
> 任务：给 `_blindbox-run.ps1` 加重试与 `run.json`，作为重跑 S98 的前提。
> 纪律：未启动 claude.exe、未跑长任务、未改 `prototypes/`。备份在 `/tmp/backup-24/`。

---

## §1 改了什么（逐处，带行号）

### 1.1 新增 `_blindbox-verdict.ps1`（524 行）—— 判读与决策的唯一实现

| 行 | 函数 | 作用 |
|---|---|---|
| 26 | `Read-ResultLines` | 字节级读 stream 尾部，找不到才全文逐行扫 |
| 90 | `ConvertTo-ResultObject` | 解析一行并确认 `type` 是**顶层**字段 |
| 105 | `Get-StreamVerdict` | 只报事实：raw / status / stop_reason / is_error / 扫描模式 |
| 162 | `Resolve-TerminalReason` | 归一化成 `success` / `api_error` / `timeout` / `no_result` / `unknown` |
| 187 | `Test-NeedsRetry` | 唯一的重试判据 |
| 236 | `Test-OutputLikelyComplete` | 「有产物」vs「产出的东西像个完整页面」 |
| 254 | `New-RunJsonDocument` | run.json 的唯一序列化入口 |
| 303 | `Invoke-AttemptLoop` | 重试驱动循环（运行器与测试共用同一份） |
| 398 | `Resolve-CaseState` | 批量汇总的状态标签 |
| 428 | `Get-ServedModelInfo` | 记录网关实际服务的模型（新增，见 §4.1） |
| 488 | `Test-WorkerAlive` | 存活判据（改成按身份识别） |

**为什么要独立成文件**：任务要求 4c「把这部分逻辑抽成一个可独立调用的函数或脚本，让测试能跑它」。若判据留在运行器里，测试只能复制一份——而复制品永远不会失败，所以测不出真回归。

### 1.2 `_blindbox-run.ps1`（127 → 308 行）

| 行 | 改动 |
|---|---|
| 19-22 | 新增 `-MaxRetries 2`（共 3 次）与 `-RetryDelaySec @(30,60)` |
| 23-27 | 新增 `-RetryOnTimeout`（默认关）、`-DryRun` |
| 44 | `Write-AbortRunJson`：环境拒绝隔离时也写 run.json，不静默退出 |
| 52 | `Get-SandboxWorkerCount`：按 `ExecutablePath == C:\tmp\bb-bin\claude.exe` 数进程 |
| 76 | `Set-DenyAce`：施加 Deny 并**回读 ACL 确认**，返回 bool |
| 88 | `Clear-CaseArtifacts`：清 stream/产物/**并重建** `.claude\projects` |
| 117 | 每次尝试开头调用它（原实现只在第 1 步做一次） |
| 136 | Deny 没确认就**拒绝启动**（原来只是 `\| Out-Null` 忽略结果） |
| 175-179 | 等待循环改用身份判据，`StartTime` 仍未使用（见 §3.5） |
| 216 | Deny 在每次尝试收尾时撤掉（保持原语义） |
| 227 | 采集 `Get-ServedModelInfo` |
| 245-276 | `-DryRun` 分支：走完整判读并打印将要写的 run.json，不启动任何东西 |
| 282-296 | 驱动改为调用 `Invoke-AttemptLoop`，`-OnBeforeRetry` 里**每次重试前重新施加并验证 Deny** |

原有踩过的坑全部保留：不按 `StartTime` 过滤进程（原第 90-96 行的注释保留并扩写）、`stderr.txt` 仍不 `Add-Content`（16-real-isolation §12.1）、`out.html > index.html > 最大 .html` 的收集顺序。

### 1.3 `_blindbox-batch.ps1`（84 → 106 行）

- 25 行：dot-source 判读库
- 54-70 行：**改为读 `run.json`**，不再用「文件存在 + `type":"result"` grep」猜状态
- 逐案输出 `reason` 与 `attempts`

原来的判据会产生 `OK(early)`：只要 `out.html` 在、stream 里**任意一行**含 `type":"result"` 就算发布，哪怕最终是 `api_error`（S97 就是这样，`batch-result.json` 里记成了 `ok:true`、`finished:false`、`state:"OK(early)"`）。

### 1.4 新增测试与工具

| 文件 | 行数 | 用途 |
|---|---|---|
| `_blindbox-verdict-test.ps1` | — | 51 条：伪造 stream 的判读 |
| `_blindbox-driver-test.ps1` | — | 106 条：驱动循环 + run.json |
| `_blindbox-verdict-regress.ps1` | — | 对 **14 个真实 stream** 回归 |
| `_blindbox-syntax-check.ps1` | — | 5 个脚本的 PARSE 闸门 |

---

## §2 判读逻辑的测试结果

### 2.1 三种假 stream（任务要求 4b）

```
=== A. Get-StreamVerdict: facts read from file ===
  PASS  success terminalReasonRaw = completed
  PASS  success hasResult = True
  PASS  success isError = False
  PASS  success stopReason = end_turn
  PASS  api_error terminalReasonRaw = api_error
  PASS  api_error apiErrorStatus = 524
  PASS  api_error isError = True
  PASS  no_result hasResult = False
  PASS  no_result scanMode = full

=== C. Test-NeedsRetry: the actual retry decision ===
  PASS  success -> no retry = False        (reason: trusted)
  PASS  api_error -> retry = True          (reason: api_error)
  PASS  no_result -> retry = True          (reason: no_result)
  PASS  missing stream -> retry = True     (reason: no_result)
  PASS  timeout -> NO retry by default = False
```

三份夹具的判断都正确。另加了三类测试夹具，都通过：

- **陷阱行**：一条 assistant 消息正文里写着 `"type":"result"`。朴素 grep 会把它当成结束事件；`ConvertTo-ResultObject` 确认 `type` 必须是顶层字段，计数仍为 1。
- **追加污染**：两份 result 拼在一个文件里（S18/S29 的真实形态）。必须取**最后一条**——取第一条会把已结束的旧会话当成本次结果。
- **截断行**：末尾半行 JSON。解析失败被 `continue` 跳过，仍能取到上一条好 result。

### 2.2 全套结果

```
===== SYNTAX =====
PARSE_OK    _blindbox-run.ps1  (1870 tokens)
PARSE_OK    _blindbox-verdict.ps1  (3079 tokens)
PARSE_OK    _blindbox-verdict-test.ps1  (1203 tokens)
PARSE_OK    _blindbox-verdict-regress.ps1  (483 tokens)
PARSE_OK    _blindbox-batch.ps1  (765 tokens)
ALL_PARSE_OK

===== VERDICT UNIT =====     51 passed, 0 failed
===== DRIVER =====          106 passed, 0 failed
```

### 2.3 对 14 个真实 stream 的回归（不是夹具，是本机全部历史数据）

```
id  raw       canon     status isErr retry scan lines  ms    bytes
S04 api_error api_error         True  True tail     1 841 16500319
S08 completed success          False False tail     1  45 13624080
S13 completed success          False False tail     1  27 11590831
S15 completed success          False False tail     1  23 26006146
S18 completed success          False False tail     1  21 12003935
S21 api_error api_error         True  True tail     1  33 12779508
S22 completed success          False False tail     1  42  8728105
S29 completed success          False False tail     1  32 20120501
S31 api_error api_error 500     True  True tail     1  78 11022668
S32 completed success          False False tail     1  49  4945220
S35 completed success          False False tail     1  55  2162987
S97 api_error api_error 524     True  True tail     1  31  1386130
S98 api_error api_error 524     True  True tail     1  33 11572986
S99           no_result               True full     0 305 13741228

  all 14 real streams classify as expected
```

**14/14 与已发布报告一致**（S98/S31/S04/S21/S97 = `api_error`，S99 = 无 result，其余 `completed`）。13 例走尾部快路径（21-78ms），只有真正没有 result 的 S99 回退全量扫描（305ms）。合计 1.6s。

### 2.4 加了产物保护后的最终决策表

```
  S04   out=True  32829B   retry=False api_error_with_complete_output
  S08   out=True  39807B   retry=False trusted
  ...
  S21   out=False 0B       retry=True  api_error
  S97   out=True  20853B   retry=False api_error_with_complete_output
  S98   out=False 0B       retry=True  api_error
  S99   out=True  23204B   retry=False no_result_with_complete_output
```

S21（`api_error` + 0B）与 S98（`api_error` + 0B）会重试；S97/S99/S04/S31 保产物不重跑。理由见 §3.3。

---

## §3 重试的边界条件

### 3.1 `terminal_reason` 的真实取值（实测，全量扫描 14 个 stream）

```
      5 "terminal_reason":"api_error"
     10 "terminal_reason":"completed"
```

**只有两个值。** 这个数字很重要，因为任务书里假设的是 `success`：

> `"terminalReason": "success"` / `stopReason: "stop_sequence"`

而 CLI 实际从不发 `success`，它发 `completed`。所以 `Resolve-TerminalReason` 做了一次显式映射，并在 run.json 里同时保留 `terminalReason`（归一化）与 `terminalReasonRaw`（原值）。判据 `terminalReason === 'success'` 仍然成立，但生产者那一侧的名字不会被丢掉。

**`subtype` 不是可用信号**：14 个 stream 里 `subtype` 一律是 `"success"`，包括 5 个 `api_error` 的（S98 就是 `subtype:"success"` + `is_error:true` + `terminal_reason:"api_error"`）。任何按 `subtype` 判成功的写法都会把网关错误读成成功。

`api_error_status` 的三种形态都见过：`524`（S97/S98）、`500`（S31）、`null`（S04/S21，连接中途断开，没有 HTTP 状态）。代码里 `null` 与 `0` 严格区分。

### 3.2 什么情况重试

| `terminalReason` | 重试 | 理由 |
|---|---|---|
| `api_error`（无像样产物） | ✅ | 网关故障，与模型无关。S98 跑了 4.24h 零产物 |
| `no_result`（无像样产物） | ✅ | stream 没有结尾行 = 被切断，不是「什么都没发生」 |
| 缺失 / 文件不存在 | ✅ | 归入 `no_result` |
| `success` | ❌ | 可信，再跑就是烧钱 |

上限 **`-MaxRetries 2`，即总共 3 次尝试**，退避 30s → 60s。

### 3.3 什么情况**不**重试（每个都有实测依据）

**① `timeout` —— 默认不重试。**
超时和 `api_error` 不是一回事：`api_error` 意味着 claude.exe 已退出、不会再有数据；`timeout` 意味着**我们不看了，但它还在干**。S99 的 stream 冻结在 13KB 五分钟后，又产出 43,892 个 thinking token，最终写出 23,204B 的完整页面。重跑会扔掉这些工作并全额再付一次。需要时用 `-RetryOnTimeout` 显式开启。

**② `api_error` 但已有像样产物 —— 不重试。**
S97 实测：第 6250 行 `Write` 成功、第 6251 行 tool_result 返回，**然后**第 6252-6260 行连续 9 次 524，第 6262 行 `terminal_reason:"api_error"`。产物是 466 行 / 20,853 字节的完整页面。按「api_error → 清空重跑」的朴素规则，这个真页面会被删掉。所以加了 `Test-OutputLikelyComplete`（默认阈值 2,000 字节），命中则保留产物、标记 `api_error_with_complete_output` 并停下。

**③ `no_result` 但已有像样产物 —— 不重试。**
S99 完全没有 result 事件，产物是 459 行 / 23,204 字节、正常收尾 `</body></html>`。同样不删。

**④ 未知 `terminal_reason` —— 不重试，也不接受。**
`unrecognized:<值>`，原值写进 run.json，交给人看。静默重试会在 CLI 语义变化时无限循环。

**⑤ Deny 施加失败 —— 中止（exit 2）。**
不能在未隔离的状态下继续跑：那样产出的页面看起来完全正常，但已经泄漏。

### 3.4 每次重试前重新施加 Deny

`_blindbox-run.ps1` 第 293 行，`-OnBeforeRetry` 里调用 `Set-DenyAce` 并**回读 ACL** 确认。理由：上一轮正常结束会撤掉 Deny（第 216 行），被中途杀掉则根本没撤。实测 `icacls /deny` 重复施加会产生两条相同 DENY ACE（不报错），`/remove:d` 一次清干净，所以重复施加是安全的。

### 3.5 存活判据换成了「身份」而不是「计数」

原实现：`(Get-Process claude).Count > baseline`。**本机现在有 22 个 `claude.exe`**，全部属于 Administrator，路径是
`C:\Program Files\WindowsApps\AnthropicPBC.Claude_3.6556.2.0_x64__fnn82j28hfe8t\app\Claude.exe`
（Claude 桌面端）。沙箱用的是 `C:\tmp\bb-bin\claude.exe`。

于是 baseline ≈ 22，比较会因**与沙箱无关**的原因漂移：桌面端开一个窗口 → 23 > 22 → 明明已经死了还判「活着」；关一个窗口 → 沙箱进程活着也仍是 22，不满足 `>` → 判「死了」而它还在干活。后者正是 15-real-isolation §12.2 记录的 S98「204 秒就宣布结束」。

新判据按 `ExecutablePath` 匹配。实测跨账户可读（`Get-CimInstance` 能拿到别的用户的路径，`Get-Process .Path` 不能）——用一个真实计划任务以 `ClaudeBlindBox` 启动探测确认：

```
FOUND pid=48740
  CommandLine=["C:\Windows\system32\cmd.EXE" /c C:\tmp\_probe-sleep.cmd]
  ExecutablePath=[C:\Windows\system32\cmd.EXE]
  Owner=WIN10PC-SQKL520\ClaudeBlindBox
```

未用 `StartTime`（跨账户不带提权读不到，这正是原来的坑）。加 150 秒 warmup，避免「还没起来就判死」。

---

## §4 我发现的、你没提到的问题

### 4.1 【最重要】CLI 声明 opus，网关实际服务 deepseek —— 14/14 全部如此

```
case | init_model                | served_model (assistant events)      | cost_usd
S08  | claude-opus-5[1M]         | deepseek-ai/deepseek-v4.1-flash      | 22.73
S15  | claude-opus-5[1M]         | deepseek-ai/deepseek-v4.1-flash      | 38.25
S97  | claude-opus-5[1M]         | deepseek-ai/deepseek-v4.1-flash      | 1.14
S98  | claude-opus-5[1M]         | deepseek-ai/deepseek-v4.1-flash      | 0.62
```

`runner-template.ps1` 传的是 `--model opus`，init 事件和 `modelUsage` 都回显 `claude-opus-5[1M]`，但**每一条 assistant 事件**的 `message.model` 都是 `deepseek-ai/deepseek-v4.1-flash`。网关是本地代理 `D:\CC Switch\cc-switch.exe`，正在 `127.0.0.1:15721` 监听（pid 17088），它改写了请求。

**为什么这件事比 524 严重**：整个盲测的结论是「给定这份施工图，模型能否做出与原型一致的结果」。如果记录里写的是 opus、实际答题的是另一个模型，那么所有关于「模型能力」的结论都不成立——**包括 S98 作废之后要重跑的那一次**。而 524 只是让一轮作废，这个是让全部轮次的归因失效。

我没有改动路由（那超出本任务范围，且改网关会影响你其他会话）。我在 run.json 里加了三个字段把这件事固定下来：

```json
"modelInit": "claude-opus-5[1M]",
"modelServed": "deepseek-ai/deepseek-v4.1-flash",
"modelMismatch": true
```

`Get-ServedModelInfo` 只做记录，不参与任何 pass/fail 判定。**建议在重跑前先决定这件事怎么处理**——否则重跑出来的仍然不是 opus 的结果。

#### 4.1.1 补记：同期另一个 Agent 发现 `-p` 只传进了第一个词，这两件事必须一起看

我写这份报告时，工作区里 `_make-runner.ps1` 出现了并行 Agent 的修改，指出
`Start-Process -ArgumentList` 传数组时 PowerShell 用空格拼接、**不给含空格的元素加引号**，
于是 `$msg` 只在第一个空格前被当成参数。实测证据：

```
grep -oa '"lastPrompt":"[^"]*"' C:/tmp/bb-home/.claude/projects/C--tmp-bb-S98/*.jsonl
  → "lastPrompt":"Read"
```

**这条对我是致命的，因为它改写了 §4.1 的解释。** 我原来只看到「模型是 deepseek」，
但真正的问题链是：

1. 提示词只剩一个词 `Read` —— 模型没收到任务书；
2. 它能产出页面，是因为它先自己 `Glob *` 找到目录里有 `task.txt`，再去 `Read` 它。
   我实测 S97 的前两个动作正是 `Glob {"pattern":"*"}` → `Read task.txt`，
   S98 也确实读了 `task.txt`（`grep -c` = 1）。
3. 而服务它的是 `deepseek-v4.1-flash`，不是 opus。

所以「十案的结论是否可信」有两个独立且叠加的理由，我这份报告只负责记录第二个。
**重跑前这两处都得先修**：`_make-runner.ps1` 的参数拼接（已有并行 Agent 在处理），
以及网关模型路由（我记录了但没改）。

一个连带推论：`lastPrompt` 只有 `Read`，说明模型的任务来源是**它自己翻目录找到的**，
而不是提示词指定的。这意味着各案之间「拿到任务的方式」一致但都很脆弱——
只要目录里没有 `task.txt` 或命名不同，模型就无从下手。`Invoke-Attempt` 里加了
`task.txt` 缺失告警（`_blindbox-run.ps1` 第 127 行）正是为此。

### 4.2 中文回复会让「朴素读法」把成功判成失败（我改代码时踩到的）

`Get-Content` 不带 `-Encoding` 时，PowerShell 5.1 按 ANSI 代码页解码。含中文的行被破坏，`ConvertFrom-Json` 直接抛异常：

```
S15 convert=FAILS len=2804
S22 convert=FAILS len=3126
S29 convert=FAILS len=2326
S32 convert=FAILS len=2383
S35 convert=FAILS len=2116
```

**14 个真实 stream 里有 5 个中招，全部是成功案例**（收尾回复是中文）。如果读不出来就当成「没有 result」，这 5 个会被判为不可信并**重试，删掉 5 份 19-47KB 的完整页面**。

修法：所有读取走 `.NET` 显式 UTF8。`Get-Content -Encoding UTF8` 也正确但慢（26MB 用 4.2s；字节级尾部读 23ms，全文逐行 1.2s）。

顺带：写本任务的 `.ps1` 时，**中文字面量在无 BOM 的 .ps1 里同样会被破坏**（同一个 ANSI 解析）。所以四个脚本全部保持纯 ASCII，测试里需要中文字符串时用码点构造（`[char[]](0x5199,...)`）。

### 4.3 S98 的 10 次 `api_retry` 里有 2 次不是 524（07-NEGATIVE-B.md 漏了这个区分）

07-NEGATIVE-B.md §1.2 写「所有 524 事件都集中在第 58031 行之后」——**这一条是对的**，实测 8 个 `error_status:524` 全部在第 58031-58038 行。但它同时说「`api_retry` 总数 10 次」，那另外 2 次是什么，报告没有交代。实测：

```
line 14892: "attempt":1 "error_status":null
line 44797: "attempt":1 "error_status":null
line 58031: "attempt":1 "error_status":524
line 58032: "attempt":2 "error_status":524
...
line 58038: "attempt":8 "error_status":524
```

两次 `error_status:null` 是 CLI 内部的 `attempt:1, max_retries:10` 重试（传输层中断，没有 HTTP 状态），与末尾耗尽的 524 风暴不是同一类。这不改变 S98 作废的结论，但它说明「`api_retry` 计数 = 网关错误数」这个读法是错的——和 S04/S21 一样，`api_error_status` 为 null 的错误确实存在，所以 `run.json` 里 null 与 0 必须分开记录。

### 4.4 重试会与 `MaxRetries` 语义错位的风险点（已处理）

初版我把「最终尝试」也写进了 `retries[]`，导致 `attempt: 2` 与 `retries.length: 2` 自相矛盾。现在只有在**后面还有一次尝试**时才记入 `retries[]`，并另加 `retryCount` / `maxAttempts` 两个冗余字段便于外部核对。

### 4.5 `stream.jsonl` 里的 NUL 字节

S31 有 2,499,790 个 NUL（22.7%），S18 有 4,917,622 个。新读取器按字节寻址 + UTF8 解码，天然不受影响；但任何 `grep`/`Select-String` 直接扫原文件的做法仍可能漏行（15-real-isolation §13.6 的 `grep -a` 教训）。

---

## §5 复算

```bash
cd D:/Web/style/deliverables/78-northstar/_probe

# 1. 语法
powershell -NoProfile -ExecutionPolicy Bypass -File _blindbox-syntax-check.ps1
# 期望末行：ALL_PARSE_OK

# 2. 判读单测（伪造 stream）
powershell -NoProfile -ExecutionPolicy Bypass -File _blindbox-verdict-test.ps1
# 期望：51 passed, 0 failed

# 3. 驱动循环单测（不启动 claude）
powershell -NoProfile -ExecutionPolicy Bypass -File _blindbox-driver-test.ps1
# 期望：106 passed, 0 failed

# 4. 对 14 个真实 stream 回归
powershell -NoProfile -ExecutionPolicy Bypass -File _blindbox-verdict-regress.ps1
# 期望：all 14 real streams classify as expected

# 5. 不花钱地检查一次真实运行器接线
powershell -NoProfile -ExecutionPolicy Bypass -File _blindbox-run.ps1 `
  -TaskDir C:\tmp\bb\S98 -OutFile C:\tmp\bb\S98\out.html -DryRun
# 期望：[dry] would classify as terminalReason=api_error -> retry=True (api_error)
#       [dry] model: asked=claude-opus-5[1M] served=deepseek-ai/deepseek-v4.1-flash mismatch=True
```

---

## §6 未做的事（如实写）

- **没有真跑任何一次 claude.exe**，所以「重试在真实 524 下确实能救回一轮」这一点**未经端到端验证**。已验证的是：判读正确（14 个真实 stream）、循环时序正确（106 条模拟）、接线正确（`-DryRun` 走真实分支）。
- **没有解决 §4.1 的模型路由问题**，只做了记录。重跑 S98 前需要你决定。
- 批量脚本的状态标签已改，但**没有跑过真批量**（那要 30-40 分钟/案）。
