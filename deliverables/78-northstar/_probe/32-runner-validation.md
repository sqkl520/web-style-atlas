# 运行器传参端到端验证

> 2026-11-14　执行 Agent
> 任务：确认修好的沙箱运行器真的把完整指令送达模型；顺带查还有没有别的传参问题。

---

## §0 结论先行

| 问题 | 结论 | 证据 |
|---|---|---|
| 修好后的运行器真的送达完整指令了吗 | **是**。沙箱账户里实测，transcript 首条 `content` 与模板 `$msg` **逐字节相等**（265/265） | §1.1 |
| 产物里有没有任务书要求的特定内容 | **有**。两次端到端都命中了只能从 task.txt 读到的标记 | §1.3 |
| 路径含空格有问题吗 | **有，而且是两个独立的坑**。`-WorkingDirectory` 安全；`schtasks /TR` **会直接注册失败**，修复前是静默的 | §3 |
| 还有别的传参风险吗 | **有，3 个**：prompt 内双引号被静默删除（**38/38 个生产 task.txt 都含双引号**）、prompt 末尾反斜杠吃掉后续参数、`$cand[0]` 对单元素集合返回**首字符** | §4 |

**一句话**：`-p` 的数组拆分 bug 确实修好了，但修法是「手写引号」，这只挡住了空格，
没挡住引号/反斜杠；另外运行器链路上还有两个与空格相关的坑，其中 `schtasks` 那个会让整次运行**无声地什么都没发生**。

---

## §1 短任务的实测结果（三种确认方式）

### 1.1 方式 a：会话记录里的 content —— 逐字节相等

任务目录 `C:\tmp\bb space test\V02`（故意含空格），用**未修改的** `_runner-template-literal.ps1` 跑真实沙箱
（`ClaudeBlindBox` 账户 + 计划任务 + 仓库 Deny ACE）。

```
$ find "C:/tmp/bb-home/.claude/projects" -name "*.jsonl"
C:/tmp/bb-home/.claude/projects/C--tmp-bb-space-test-V02/31b11d62-…-934f3c9ce1a2.jsonl
```

读首条 user 消息的 `content`：

```
LEN=265
Read task.txt in this directory, then write the finished page to out.html with the Write tool.
Do not over-analyze: read the task once, then write out.html in a single Write call.
It must be a complete standalone HTML file. Reply with one short sentence afterwards.
```

不是靠肉眼比对 —— 直接从模板文件里正则取出 `$msg`，与 transcript 的值做全等比较：

```
expected len=265
received len=265
BYTE-EXACT MATCH: true
```

**这是判据 §29-5.3 要求的那个判据，现在是 true。**

### 1.2 方式 b：模型的响应

模型最终文本：

```
Wrote out.html — a 5-line standalone page with FRAMBOISE-77 in the title, no CSS or script.
```

它复述了任务书里「5 行」「FRAMBOISE-77」「无 CSS/script」三件事。修复前它连
"The user just said \"Read\"" 这种困惑都出现过；现在没有。

### 1.3 方式 c：产物内容

任务书写的是「必须在 `<title>` 里含 `FRAMBOISE-77`」。产物：

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>FRAMBOISE-77</title></head>
<body><p>FRAMBOISE-77</p></body>
</html>
```

第二次端到端换成 `QUINCE-88`，产物：

```html
<!DOCTYPE html>
<html lang="en">
<head><title>QUINCE-88</title></head>
<body><p>QUINCE-88</p></body>
</html>
```

每次都精确命中当次标记 —— 说明它读到的是**本次**的任务书，不是上一案的残留。

---

## §2 修复前后对比

### 2.1 直接测 argv（不启动 claude，用自建的 argv 转储程序）

先造一个只打印自己 `argv` 的 C# 小程序（`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe` 编的），
同一句 94 字符的 prompt，两种传法：

```
=== A) ARRAY form (the old runner bug) ===
  argc=21
  argv[0]=-p
  argv[1]=Read              <-- 只有第一个词
  argv[2]=task.txt
  argv[3]=in
  ... (到 argv[16]=tool.)
  argv[17]=--model
  argv[18]=opus
  argv[19]=--permission-mode
  argv[20]=acceptEdits

=== B) SINGLE STRING, prompt quoted (the fixed runner) ===
  argc=6
  argv[0]=-p
  argv[1]=Read task.txt in this directory, then write the finished page to out.html with the Write tool.
  argv[2]=--model
  argv[3]=opus
  argv[4]=--permission-mode
  argv[5]=acceptEdits
```

`-p` 之后从 1 个词变成完整 94 字符。**这就是那个 bug 的机制本身**，与 §29 的描述一致。

### 2.2 端到端（沙箱账户 + 计划任务）

| | 修复前（§29 记录） | 修复后（本次实测） |
|---|---|---|
| transcript 首条 content | `"lastPrompt":"Read"` | 265 字符完整句子，**逐字节相等** |
| 模型原话 | The user just said "Read". That is a minimal message. | Wrote out.html — a 5-line standalone page with FRAMBOISE-77… |
| 产物是否照任务书 | 与提示词对不上（模型自己读 task.txt 发挥） | 精确命中当次任务书里的标记 |

---

## §3 路径含空格的测试

把工作目录换成 `C:\tmp\bb space test\V01`，测了两个不同的环节。

### 3.1 `-WorkingDirectory` —— 安全，不用改

```
=== 1) -WorkingDirectory with a SPACE ===
  -WorkingDirectory: C:\tmp\argprobe\dir with space\inner  exists=True
  argc=4
  argv[1]=hello world test
  cwd=C:\tmp\argprobe\dir with space\inner      <-- 正确切换
```

`Start-Process -WorkingDirectory` 走的是 .NET 的进程 API，不经过命令行字符串拼接，空格无害。

### 3.2 `schtasks /TR` —— **有坑，而且失败是静默的**

运行器把启动命令拼成 `$action` 交给 `schtasks /Create /TR`。`/TR` 收的是**一整条字符串，schtasks 自己再解析一遍**。
只要路径里有空格、而引号是普通 `"`，`/Create` **直接失败**：

```
/TR = powershell -NoProfile -ExecutionPolicy Bypass -File "C:\tmp\bb space test\V01\_run.ps1" …
create: 错误: 无效参数/选项 - 'space'。
```

失败后运行器**照常进入等待循环**（因为它不检查 `/Create` 的返回），实测空等了 90 秒、
`stream=0B` 一直不动。这就是「什么都没发生，但日志看起来像在跑」。

四种写法实测（用 `/Query` 是否存在判断，不看中文本地化的提示语）：

| 写法 | created |
|---|---|
| 普通引号 `"path"` | **False** |
| 只转义部分引号 | **False** |
| **全部**引号转义成 `\"` | **True** |
| 8.3 短路径（无空格） | True |

全转义时，schtasks 存下来的 `Arguments` 是**正确的带引号形式**：

```
STORED Arg=[-NoProfile -ExecutionPolicy Bypass -File "C:\tmp\bb space test\V01\_run.ps1"
            "C:\tmp\bb-home" "C:\tmp\bb space test\V01"]
```

非空格路径用新写法也照样工作（回归检查）：

```
no-space path created=True
STORED=[-NoProfile -ExecutionPolicy Bypass -File "C:\tmp\bb\S31\_run.ps1" "C:\tmp\bb-home" "C:\tmp\bb\S31"]
```

### 3.3 `icacls` —— 安全，不用改

`icacls $TaskDir /grant …` 传的是 PowerShell 参数（原生 exe，参数边界由 PowerShell 正确给出），
含空格目录下实测正常：

```
icacls 'C:\tmp\bb space test\V03' /grant "ClaudeBlindBox:(OI)(CI)(M)" /T /T  -> 成功处理 2 个文件
查询: C:\tmp\bb space test\V03 WIN10PC-SQKL520\ClaudeBlindBox:(OI)(CI)(M)
```

---

## §4 还有没有别的传参风险

### 4.1 prompt 内的双引号被**静默删除**（高危，会命中真实生产提示词）

现在的修法是 `'-p "' + $msg + '"'` —— 手写一层引号。如果 `$msg` 自己含 `"`，那个引号会提前结束参数，
而 Windows 的命令行解析会把**它删掉**，不报错：

```
=== C) production prompt containing HTML attributes with quotes ===
  line: -p "Write the page. Include <img src="images/1.jpg"> and … exactly." --model opus
  argv[1]=Write the page. Include <img src=images/1.jpg> and <img src=images/2.jpg> exactly.
                                  ^^ 引号没了，且没有报错
```

真跑 claude 确认模型这一侧看到的就是删掉引号的版本：

```
SENT          : "Echo back exactly this token and nothing else: ALPHA\"BETA\"GAMMA"
MODEL RECEIVED: "Echo back exactly this token and nothing else: ALPHABETAGAMMA"
```

**这不是理论风险**：扫了 `deliverables/78-northstar/blind/*/task.txt` ——

```
task.txt files scanned: 38
containing double quotes: 38
```

**38/38 全部含双引号**，典型是第 4 条结构约束里的 `<img src="images/占位-N.jpg">`。
虽然当前这些 task.txt 是**让模型用 Read 工具去读**、不经过 `-p`（见 4.4），
但任何「把 task.txt 内容直接塞进 `-p`」的改法都会立刻踩中，且产物看起来仍然正常 —— 只是少了引号。

### 4.2 prompt 末尾反斜杠会吃掉后续参数

```
=== A) prompt ENDS with a backslash ===
  line: -p "write to C:\tmp\out\" --model opus
  argc=2
  argv[1]=write to C:\tmp\out" --model opus     <-- --model opus 被吞进 prompt
```

任务书里写 Windows 路径是很自然的事。本例里 `--model opus` 整个消失，
等于**悄悄用了默认模型**（配合本机网关的实际行为，这会改变 served model）。
当前模板的 `$msg` 结尾是人话，不触发；但这是同一类「手写引号」缺陷。

### 4.3 `$cand[0]`：单元素时返回**首字符**（已在本次实测中真实发生）

`_blindbox-run.ps1` 收集产物那段：

```powershell
$cand = @('out.html','index.html') | ... | Where-Object { Test-Path ... }
if ($cand) {
    $src = $cand[0]
    Copy-Item -LiteralPath $src -Destination $OutFile -Force
    $hasOutput = $true
```

PowerShell 管道只有**一个**结果时会退化成标量 String，于是 `$cand[0]` 取的是第一个**字符**：

```
$cand type  = System.String
$cand Count = 1
$cand[0]    = [C]                                  <-- 不是路径
@($cand)[0] = [C:\tmp\bb space test\V02\out.html]  <-- 正确
```

实测日志（V02，未打补丁时）：

```
Copy-Item : 找不到路径“C”，因为该路径不存在。
  OUT_OK src=C bytes=113          <-- 抛了异常，却仍然打印 OUT_OK、仍然置 hasOutput=true
```

**为什么一直没被发现**：平时 `OutFile` 就在 `TaskDir` 里、并且源文件名恰好也是 `out.html`，
所以「复制」是一次自我覆盖的空操作，异常无关紧要、文件本来就在正确位置。一旦 `OutFile` 在别处
（批量脚本改路径、或模型写成 `index.html`），就会**要么崩溃、要么把错的东西当成产物收下**。
它同时继承了本仓库那个老病：**抛异常之后仍然报成功**。

### 4.4 生产主路径其实不走 `-p`（重要边界说明）

`blind-run.mjs` 用的是 `execFile('claude', ['-p', '请读当前目录下的 task.txt…'])` —— Node 的
`execFile` 传数组是**安全**的（Node 自己按 Windows 规则加引号），而且它传的是一句固定短句，
40 行任务书走的是 `task.txt` + Read 工具。

所以：**`-p` 的数组拆分 bug 只影响 PowerShell 沙箱这条线**（`_blindbox-run.ps1` / 模板），
不影响 `blind-run.mjs`。这一点值得写进报告，否则容易把结论扩大化。

---

## §5 修法与验证

### 5.1 三处改动

**(1) `_runner-template-literal.ps1`：用引号转义函数代替手写 `"…"`**

新增 `Quote-Arg`，实现 Windows `CommandLineToArgvW` 的官方转义规则
（与 .NET `ProcessStartInfo.ArgumentList`、C 运行时同一个变换）：

```powershell
$argLine = '-p ' + (Quote-Arg $msg) + ' --model opus --permission-mode acceptEdits --output-format stream-json --verbose'
```

实测边界（全部逐字节相等）：

| 用例 | 结果 |
|---|---|
| 普通句子 | EXACT=True |
| 内部双引号 `<img src="…">` | EXACT=True（引号保留） |
| 末尾反斜杠 `C:\tmp\out\` | EXACT=True |
| 反斜杠 + 引号混合 | EXACT=True |
| 多行 prompt | EXACT=True |
| 空串 / 以 `-` 开头 / 前后空格 / 制表符 | argc 与值都正确 |

再用真 claude 确认模型侧：

```
SENT          : Echo back exactly this token and nothing else: ALPHA"BETA"GAMMA
MODEL RECEIVED: Echo back exactly this token and nothing else: ALPHA"BETA"GAMMA
quotes intact : true
MODEL REPLY   : ALPHA"BETA"GAMMA          <-- 回声精确
```

**(2) `_blindbox-run.ps1`：`schtasks` 全部引号转义 + 创建失败即中止**

```powershell
$esc = '\' + [char]34     # -> \"
$action = 'powershell -NoProfile -ExecutionPolicy Bypass -File ' + $esc + $runner + $esc + …
schtasks /Create … | Out-Null
if (-not (schtasks /Query /TN $taskName 2>$null)) {
    Write-Host '  TASK CREATE FAILED -- refusing to wait'
    icacls $repo /remove:d $user 2>$null | Out-Null
    return @{ Started = $false; AbortReason = 'task_create_failed'; TaskAction = $action }
}
```

**特意没改成 8.3 短路径**：短路径依赖卷上的短名生成状态，机器之间不可复现，属于另一种「看起来绿」。

**(3) `_blindbox-run.ps1`：`@($cand)[0]`**

```powershell
if (@($cand).Count -gt 0) {
    $src = @($cand)[0]
```

### 5.2 补丁后整体回归（真实沙箱，路径含空格，OutFile 在 TaskDir 之外）

这样同时压到三个改动：空格路径（schtasks）、外部 OutFile（`$cand`）、prompt 送达。

```
[attempt 1] launching scheduled task
[attempt 1] waiting up to 420s
  stream=2658B out=False worker=2 (identity) idle=0
  stream=19684B out=False worker=1 (identity) idle=0
  stream=24248B out=True  worker=1 (identity) idle=0
  worker gone [identity: sandbox exe was seen and is gone]
[attempt 1] collect
  OUT_OK src=out.html bytes=109          <-- 无异常，真的复制了
[attempt 1] removing deny
  verdict: terminalReason=success raw=completed stopReason=end_turn
STOP: trusted
FINAL terminalReason=success trusted=True attempts=1 hasOutput=True bytes=109
```

- 外部 `OutFile` 收到 109 字节，内容含当次标记 `QUINCE-88`：`C:\tmp\val-collect\V04-out.html`
- transcript 首条 content 仍是完整 265 字符
- 收尾 `icacls D:\Web\style` 无残留 Deny ACE
- 两个改动文件 `Parser::ParseFile` 语法错误数均 0

### 5.3 建议加进闸门的一条

这次三个坑有同一个形状：**失败之后仍然报成功**（schtasks 没建成 → 空等；Copy-Item 抛错 → OUT_OK）。
`_blindbox-run.ps1` 已经有 `_blindbox-verdict.ps1` 那套「run.json 是权威」的机制，
但上面两处是它的**盲区** —— 它们发生在 `flag` 之前。

建议在 `Invoke-Attempt` 里加一句断言：**宣布 `hasOutput` 之前，必须 `Test-Path` 目标文件且字节数 > 0**。
一行代码，能同时挡住 4.3 与将来任何「产物没落地却报成功」的变体。
（本次未擅自加，因为超出「验证传参」的范围；列在这里供主线程决定。）

---

## 附：清理

测试目录、计划任务、临时脚本全部删除；`C:\tmp` 只剩 `bb-bin` / `bb-home` / 原有文件；
仓库无残留 Deny ACE。沙箱账户密码 `BlindRun-2026-tmp!` **正确**（多次 `/Create /RP` 与 `/Run` 均成功）。
