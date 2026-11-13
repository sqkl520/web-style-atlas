# 真隔离方案：NTFS ACL + 独立账户（已实测跑通）

> 2026-11-12　主线程
> 用户决定：「做成真隔离」。这份文档记录为什么需要它、怎么做的、以及每一步的实测证据。

---

## 一、为什么必须做

红队 Agent 把原来的「隔离」证伪了，三条证据都成立：

**① `--permission-mode` 不是隔离，是权限提示。**
改成 `bypassPermissions` 就能读 `D:/Web/style` 下任意文件。

**② 「shell 不可用」是误判。**
原来我观察到 `pwsh timed out after 5000ms`，就认定 shell 被封了。
红队发现那只是 `PATH` 里缺 `C:\Windows\System32`。补上后 `echo hi` 直接返回。
**我把一个环境故障当成了安全控制** —— 这是本仓库那类「量到信号、把信号的名字当结论」的典型。

**③ 更糟的是，我自己的隔离脚本抄错了 HOME。**
脚本里 `HOME=/tmp/blindtest/home` 而 `USERPROFILE='C:\tmp\blindtest\home'`。
在这台机器上 `/tmp` → `C:\Users\...\AppData\Local\Temp`，所以这两个**不是同一个目录**。
Claude Code 在 Windows 上按 `USERPROFILE` 解析，真正生效的 HOME 是 `C:\tmp\...`，
而 `cp` 过去的那份 `.claude.json` 从来没被加载过。

所以「主线程声称隔离可行」这个结论，建立在三处错误之上。

---

## 二、真隔离的机制

用 **NTFS Deny ACE + 独立本地账户**，进程级强制：

```
账户：ClaudeBlindBox（本轮创建，密码 BlindRun-2026-tmp!）
拒绝：icacls D:\Web\style /deny "ClaudeBlindBox:(OI)(CI)(RX)"
```

Deny ACE 优先于任何 Allow（包括 `BUILTIN\Users` 的继承权限），
且由内核在文件系统层强制 —— 模型无论怎么要求 `bypassPermissions` 都改不了它。

### 2.1 三步实测证据

**① 账户能跑、能写**

```
WHOAMI:win10pc-sqkl520\claudeblindbox
```

**② 仓库被拒、对照文件正常**（这条是关键：有对照才能排除「环境坏了」）

```
READ_REPO_DENIED                    ← 读 D:\Web\style\README.md 失败
READ_CONTROL_OK:CONTROL-OK          ← 同一进程读 C:\tmp\blindbox-control.txt 成功
```

**③ claude.exe 在沙箱内可执行**

```
EXE_EXISTS:True
VERSION:2.1.289 (Claude Code)
```

### 2.2 途中踩的三个坑（都记下来，下一个人会撞）

**坑一：新账户没有批处理登录权。**
现象：`schtasks /Run` 报「用户未注册，无法登录」。
原因：`SeBatchLogonRight` 默认只给 Administrators / Backup Operators / Performance Log Users。
修法：`secedit /export` → 在 `SeBatchLogonRight` 行追加该用户的 SID → `secedit /configure`。

**坑二：`claude.exe` 在 Administrator 的目录下，沙箱用户读不到。**
现象：`PATH_TEST:False`，执行报「无法将…识别为 cmdlet」。
修法：复制到 `C:\tmp\bb-bin\claude.exe` 并授 RX。实测沙箱内 `--version` 返回 `2.1.289`。

**坑三：PowerShell here-string 里嵌 `$` 会被提前展开。**
现象：`_blindbox-run.ps1` 报 `MissingEndCurlyBrace`。
修法：把要跑的脚本内容用**文件模板**生成（`_make-runner.ps1` → `C:\tmp\runner-template.ps1`），
不在主脚本里内联 here-string。

---

## 三、它挡住了什么、挡不住什么

**挡住：**
- 用 `Read` / `Glob` / `Grep` 读仓库任意文件
- 用 `Bash` / `PowerShell` 执行 `cat`、`type`、`Get-Content` 读仓库
- 提升 `--permission-mode` 到 `bypassPermissions`（ACL 在模型之上）
- 用相对路径 `..` 上爬（ACL 按路径判定，不按调用方式）

**挡不住：**
- **模型的先验知识**。S31 是「钟表修理铺 + 尺规刻度」。一个见过类似设计的模型
  可能凭先验做出四栏结构。这不是隔离能解决的，只能靠**负对照**测
  （给一个不存在的风格 S99，看它是否也能做出「像样」的页面）。
- **网络泄漏**。若 agent 能上网搜到本仓库的 GitHub Pages，
  隔离就失效。`WebFetch`/`WebSearch` 目前被域名安全校验挡住（红队 R8/R9），
  但那是**域名校验**，不是网络隔离，两件事不能混。

---

## 四、与「盲测」定义的关系

用户已定：**北极星 = 测复刻保真度**，不是「测提示词够不够」。

理由：这个产品的设计**就是**给精确数值（`prompt-S03.txt` 里有
`264:524:540 三轨分宽`、`至少 8 个不同的图片位置`）。拿掉了数值，测的就不是用户拿到的东西。

所以本轮的正确表述是：

> 给定这份施工图（含精确数值），模型能否做出与原型一致的结果？
> 一致性用 DOM 测量对账，不用截图（9 案有 infinite 动画，截图必抖）。

红队建议的「方案 A（删掉数值测提示词缺口）」是另一个有价值的问题，
但它不是这个产品的北极星，留作后续。

---

## 五、产物与复算方式

| 文件 | 作用 |
|---|---|
| `_probe/_sandbox-setup.ps1` | 创建 `ClaudeBlindBox` 账户 + 首次 ACL 验证 |
| `_probe/_grant-batch.ps1` | 授 `SeBatchLogonRight` + 完整验证（含对照文件） |
| `_probe/_make-runner.ps1` | 生成 `C:\tmp\runner-template.ps1`（避免 here-string 转义） |
| `_probe/_blindbox-run.ps1` | 主运行器：备 HOME → 下 Deny → 起任务 → 等产物 → 撤 Deny |

复算完整隔离性：

```bash
powershell -File deliverables/78-northstar/_probe/_grant-batch.ps1
```

期望输出必须同时出现 `READ_REPO_DENIED` 与 `READ_CONTROL_OK:CONTROL-OK`。
**只有前者没有后者，不能证明隔离，只能证明环境坏了。**

---

## 六、清理

沙箱账户与 `C:\tmp\bb-bin\claude.exe`（238MB）都是本轮新增的。
不再需要时：

```bash
powershell -Command "icacls D:\Web\style /remove:d ClaudeBlindBox"
powershell -Command "Remove-LocalUser ClaudeBlindBox"
rm -rf /c/tmp/bb-bin /c/tmp/bb-home /c/tmp/bb
```

**每次运行都会在结束时撤掉 Deny**（`_blindbox-run.ps1` 第 7 步），
不会影响管理员自己对仓库的访问。已实测确认：撤掉后 `ADMIN_READ_OK`。

---

## 七、执行环境：四个坑（都已解决或定位）

机制验证成功不等于能跑。实际跑通花了额外时间，因为 `claude.exe`（238MB 单文件）在受限账户下有几处环境差异。

### 坑四：输出被缓冲，看不到进度

`& $exe -p ... 2>&1` 在 PowerShell 里会等子进程结束才把输出写进变量，
所以 `stream.jsonl` 一直停在 `LAUNCHING`，看起来像卡死。
**修法**：改用 `Start-Process -RedirectStandardOutput/-RedirectStandardError`，
输出直接流到文件。改完立刻能看到 init 事件。

### 坑五：提示词让模型少干活

第一版让 agent 的提示词结尾是「Output as few words as possible」，
本意是「回复简短」。实际结果：

```
stop_reason: "stop_sequence"
output_tokens: 456
duration_api_ms: 263212
total_cost_usd: 0.241852
```

**它把「少说话」理解成了「少做事」，456 token 就停了，没写 out.html。**
263 秒和 $0.24 白花。

改成明确的动作指令：

> Read task.txt in this directory, then do the work it describes: write the finished
> page to out.html using the Write tool. Write the file first; only after the file
> exists, reply with one short sentence.

**这条的教训不在隔离，而在提示词**：给 agent 的元指令（「简短」）会溢出到任务执行上。
本仓库那些「系统替用户编了一个假前提」的缺陷是同一个机理的另一面 ——
任务描述里的每一个形容词都会被执行者当成对任务的约束。

### 坑六（已定位，未阻塞）：沙箱内每次工具调用更慢

受限账户下 PowerShell 启动、ACL 检查都更慢。同一案在管理员侧约 700 秒，
沙箱侧的前 100 行 stream 用了约 20 分钟。

这不影响正确性，但影响批量成本。若要跑 35 案，必须并行多个沙箱用户
（每个用户一份 HOME + 一份 Deny），不能串行。

---

## 八、当前状态（如实写）

| 项 | 状态 |
|---|---|
| ACL 拒绝机制 | ✅ **已验证**：`READ_REPO_DENIED` + `READ_CONTROL_OK` 同时出现 |
| 沙箱用户能跑 claude | ✅ **已验证**：stream.jsonl 里有完整 init 事件，`cwd=C:\tmp\bb\S31` |
| 沙箱内产出 HTML | ⏳ 修正提示词后重跑中 |
| 35 案批量 | ❌ 未做（单案都还没跑通） |

**没有做到的事不要写成做到了。** 这份文档只写到「机制成立、单案在跑」，
不写「盲测已完成」。

---

## 九、我重犯了红队指出的同一个错

红队报告的**第一条**就是：

> 主线程赖以判定「shell 不可用、读不到仓库」的 `pwsh timed out`，实测是 **PATH 配错**
> 导致的环境故障，不是任何安全控制（`PATH` 里补上 `/c/Windows/System32` 后
> `echo hi` 直接返回 `hi`）。

我在读完这份报告、还专门在本文档 §一 里复述了它之后，
**写沙箱 runner 时又手写了一份残缺的 PATH**：

```powershell
$env:PATH = "C:\tmp\bb-bin;C:\Windows\System32;C:\Windows"
```

结果沙箱里的 agent 每次调 PowerShell 都得到：

```
Command contains malformed syntax that cannot be parsed: pwsh timed out after 5000ms (2 attempts)
```

跑了 20 多分钟、2274 行 stream、629KB，**一个文件都没写出来**，
全耗在两次失败的 `Get-ChildItem` 上。

### 为什么这个错值得单独记

不是「忘了」，是**知道正确答案的情况下仍然写错**。
原因是我把 PATH 当成一个「够用就行」的配置项，而它实际是**执行环境的完整性前提**——
少一个目录，agent 的工具链就整条失效，而失败信息（`pwsh timed out`）
读起来像是沙箱在限制它，进一步强化「沙箱真严格」的错误印象。

这与本仓库那类「量到信号、把信号的名字当结论」的缺陷同源：
`pwsh timed out` 这个信号既可能来自「沙箱禁止 shell」，也可能来自「PATH 不完整」，
而我只取了与当前假设一致的那个解释。

### 正确写法

```powershell
$env:PATH = "C:\tmp\bb-bin;" +
    [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" +
    [System.Environment]::GetEnvironmentVariable("PATH", "User")
```

**不要手写一份 PATH。** 用系统的，再往前接上沙箱自己的 bin 目录。

---

## 十、沙箱内的行为异常：模型陷在思考里（未解决）

隔离机制成立之后，遇到一个新问题：**模型在沙箱里不肯落笔**。

### 10.1 三次尝试的实测数据

| 尝试 | PATH | effort | 元指令 | 结果 |
|---|---|---|---|---|
| v3 | 不完整 | max | 「Output as few words as possible」 | 456 output token 就停（`stop_reason: stop_sequence`），无产物 |
| v4 | 不完整 | max | 「先写 out.html 再回复」 | 2274 行 stream、629KB，2 次工具调用**全部失败**（`pwsh timed out`），无产物 |
| v5 | **完整** | max | 同上 | 17347 行 stream，**17329 个 thinking 事件**、4 次工具调用全部成功、**0 错误**，仍无 `out.html` |
| v5b | 完整 | **medium** | 加「不要过度分析，一次 Write 写完」 | 2899 行，**2891 个 thinking 事件**、2 次工具调用，仍无产物 |

### 10.2 这不是 PATH 问题，也不是 effort 问题

v5 的 `errors count: 0`，工具调用全部成功（`ls`、`Read task.txt`、`Read _run.ps1` 都返回了正确内容）。
所以环境是通的。模型读了任务、列了目录、然后开始思考，之后**17329 个 thinking 事件里没有一次落到 Write**。

降 effort 到 medium 没有改变这个模式（仍是 99.7% 的流是 thinking）。

### 10.3 对照：管理员环境下同样的任务 704 秒完成

这是最有力的对照 —— 同样的提示词、同样的模型参数、同样的任务，
在管理员环境里 704 秒产出了 414 行 HTML（六个可测值全部命中）。

**差异只有运行身份和 exe 路径。** 但 v5 已经证明工具链在沙箱里是通的。

### 10.4 我目前能给的最可能解释（未验证）

沙箱用户的 `HOME` 是 `C:\tmp\bb-home`，里面只有从管理员复制来的
`settings.json` 与 `.claude.json`。管理员那边还有 `cache/`、`session-env/`、
`plugins/`、`skills/`、`shell-snapshots/` 等目录。

可能其中某个（例如 plugin/skill 的元数据，或 shell snapshot 缓存）
影响了模型的工具使用倾向。**但这只是假设，我没有证据。**

### 10.5 停在哪

我停在这里，没有再试第四种组合。理由：

1. 已经投入约 3 小时在沙箱执行环境上，而**隔离机制本身早已验证成立**
2. 剩下的问题（模型在特定 HOME 下的行为）与「隔离是否有效」无关
3. 继续盲试的组合空间很大（HOME 内容 × effort × 元指令 × exe 版本），
   而每一步都要 20-40 分钟

**如实记录：真隔离的机制成立，但沙箱内产出 HTML 尚未跑通。**
没有把它写成「已完成」。

---

## 十一、更正 §十：**沙箱是跑通的，是我判错了**

§十 我写了「四次尝试都没跑通」。**这个结论错了。**

后台任务最终退出后我检查目录，发现：

```
-rw-r--r-- 1 ClaudeBlindBox 22064 19:59 index.html
-rw-r--r-- 1 ClaudeBlindBox   0   19:34 stderr.txt
```

**模型写出了 399 行 / 22064 字节的完整页面，只是文件名叫 `index.html` 而不是 `out.html`。**

我的收集逻辑（`_blindbox-run.ps1` 第 6 步）只找 `out.html`，于是把它报成了 `NO_OUT_HTML`。

### 11.1 那 17329 个 thinking 事件是什么

不是卡住，是**在正常构思**。产物质量证明它在干活：

| 约束 | 提示词 | 产物 | 判定 |
|---|---|---|---|
| 五个色值 | `#F2F0EC #5F5B55 #DEDAD3 #55514B #8A857C` | 恰好这 5 个 | ✅ |
| 主刻度 | 每 60px、长 34px、3px 宽 | `--scale-major:60px; --tick-major-len:34px` | ✅ |
| 次刻度 | 每 12px、长 12px、2px 宽 | `--scale-minor:12px; --tick-minor-len:12px` | ✅ |
| 最大标题 | 正文 6.5 倍 ≈104px | `clamp(46px, 10.4vw, 104px)` | ✅ |
| 圆角/阴影 | 全站 0 / 无 | `border-radius:0;box-shadow:none` 的 reset | ✅ |
| 图片位 | 至少 3 个 | 度量实测 3/3 | ✅ |

度量器对账（`_probe/_compare-S31.mjs`）：

```
✓ 标题/正文比: 原型 6.5  生成 6.5
✗ 栏数(tracks): 原型 4  生成 12      ← 原型是 auto-fit，4 是 1440 下的展开值，不算失败
✗ 主容器: 原型 div#blocks.blocks  生成 section.matrix
  字宽集合 原型 1.00  生成 1.00/3.00   ← 提示词只给 1px，产物多用了 3px
```

### 11.2 一处真实偏差

产物第 9-11 行引了 3 次 `fonts.googleapis.com` / `fonts.gstatic.com`，
而任务书第一句写「不用任何 CDN」。**这是真偏差**，而且它会连带影响字体度量
（外链字体在外网不可达时会回退，同一个页面两次渲染的字体可能不同）。

### 11.3 这条错误的性质

和本轮其他几个错误同源：**我看到了一个信号（`NO_OUT_HTML`），就把它当成了结论（失败）。**
实际信号只说明「收集逻辑没找到 out.html」，不说明「模型没产出」。

已改收集逻辑：`out.html` > `index.html` > 目录里最大的 `.html`。

**教训具体化为一条规则**：任何「失败」判定，都要先确认**判据本身看到的东西**与
**实际发生的事**之间没有缺口。`NO_OUT_HTML` 和「模型没写文件」之间有缺口，
它的真实含义是「我的 finder 没匹配上」。

### 11.4 修正后的状态

| 项 | 状态 |
|---|---|
| 真隔离机制 | ✅ 已验证（`READ_REPO_DENIED` + `READ_CONTROL_OK`） |
| 沙箱内产出 HTML | ✅ **已跑通**：399 行 / 22KB，六项约束中五项精确命中 |
| 单案耗时 | 约 30 分钟（v5b，effort=medium） |
| 35 案批量 | ❌ 未做 |

**所以「真隔离盲测」在单案上是成立的。** 下一步是批量，以及红队要求的负对照。

---

## 十二、两处判据缺陷（S99 报告指出，已修）

### 12.1 `stderr.txt` 全程 0 字节 —— 错误信息一直是隐形的

`Start-Process -RedirectStandardError $errLog` 会**独占**该文件句柄。
之后再 `Add-Content -Path $errLog` 会静默失败，不报错。

实测：`C:\tmp\bb\S31\stderr.txt` 整个运行过程 **0 字节**
（对比 `S29/stderr.txt` 54 字节，那份是 Start-Process 自己写的）。

**后果**：我调试了十几轮「为什么没产物」，而真正的错误信息可能一直在 stderr 里，
只是写不进去。这也解释了为什么我看不到任何报错。

**修法**：生命周期日志写到独立文件 `runner.log`，不要和被 redirect 的文件抢句柄。

### 12.2 存活判据用错了对象

我原来的等待循环：

```powershell
if (-not $hasOut -and $idle -ge 15) { break }   # stream 停了 15×20s = 5 分钟就判失败
```

这个判据有三个洞，S99 的报告逐个实测到了：

| 洞 | 实测现象 |
|---|---|
| `stream.jsonl` 安静不等于结束 | S99 的 stream 冻在 13KB 五分钟，之后又产出 43,892 个 thinking token |
| 计划任务的 `powershell.exe` wrapper 比 `claude.exe` 先退出 | 某次 900 秒就报 "exited"，而 `claude.exe` 还在跑 |
| `stderr` 里自报的 PID 不可用 | 见 12.1，文件是空的 |

**修法**：判据改成「**`claude.exe` 进程是否还活着**」，并且只统计本轮启动时间之后的进程
（避免误判别的会话）。

```powershell
$alive = @(Get-Process claude -ErrorAction SilentlyContinue |
           Where-Object { $_.StartTime -gt $script:startedAt }).Count
if (-not $alive) { break }
```

### 12.3 这两条与本仓库的老病同源

- 12.1 是「**读不到数据 → 不报错**」：stderr 写不进去，但没有任何提示，
  于是我以为「没有错误」。
- 12.2 是「**量错了对象**」：我量的是「文件安静程度」和「wrapper 进程」，
  而不是「真正干活的那个进程」。

两次都是同一句话：**判据看到的东西 ≠ 实际发生的事。**

---

## 十三、发现一个真实的隔离泄漏：沙箱 HOME 里留着所有案的历史 transcript

### 13.1 现象

跑 S98 时，它的工具调用里有这一条：

```
Read {"file_path":"C:\tmp\bb-home\.claude\projects\C--tmp-bb-S98\memory\MEMORY.md"}
```

`MEMORY.md` 不存在（Read 失败），所以**那一次没有泄漏**。
但顺着这个目录查下去，发现了更严重的东西：

```
C:\tmp\bb-home\.claude\projects\
  C--tmp-bb-S04\  3 个 .jsonl
  C--tmp-bb-S08\  2 个 .jsonl
  C--tmp-bb-S13\  2 个 .jsonl
  C--tmp-bb-S15\  2 个 .jsonl
  C--tmp-bb-S98\  2 个 .jsonl
  ...
  合计 38 个文件
```

**Claude Code 在每个 session 结束后，把完整对话写进 `<HOME>\.claude\projects\C--tmp-bb-<案号>\`。**
所以跑了几轮之后，沙箱 HOME 里就攒下了**每一个案子的完整对话**，
包括它们的答案。

### 13.2 为什么这是真泄漏

- 仓库路径被 ACL 拒绝，但 `C:\tmp\bb-home` 是沙箱用户自己的 HOME，**完全可读**
- agent 已经证明它会主动去找 `MEMORY.md`（它读了那个路径）
- 一个 agent 只要 `Glob **/*.jsonl` 再 `Read`，就能拿到前面所有案的完整提示词、产物、对账结果
- **而这一切不会报错、不会留下异常** —— 产物看起来完全正常

实测：S98 这一轮**没有**去读别案的 transcript
（`grep 'C--tmp-bb-S3[0-9]\|C--tmp-bb-S0[0-9]' S98/stream.jsonl` → 0 命中）。
所以 S98 的结果目前是干净的。

### 13.3 已修

`_blindbox-run.ps1` 第 1 步现在会在每次运行前**清空 `$sbHome\.claude\projects`**：

```powershell
$projRoot = Join-Path $sbHome '.claude\projects'
if (Test-Path $projRoot) { Remove-Item $projRoot -Recurse -Force -ErrorAction SilentlyContinue }
```

### 13.4 这条对前面十案的影响：需要复核

S31/S08/S13/S22 等案的运行**发生在这次修复之前**，所以它们的 transcript 确实留在了沙箱里。
需要检查它们有没有读过更早的 transcript。

判据：在每案的 `stream.jsonl` 里 grep 别案的目录名。

```bash
for id in S31 S04 S08 S13 S22 S32 S15 S18 S29 S35; do
  n=$(grep -c 'bb-home.*C--tmp-bb-S' /c/tmp/bb/$id/stream.jsonl 2>/dev/null)
  echo "$id: $n"
done
```

**这个核查必须做，否则前面十案的结论都带着一个未排除的污染途径。**

### 13.5 核查结果：十案全部干净

按「引用了**别案**的 transcript 目录」这个判据逐案查（`grep -a` 避免 binary 提示）：

```
S31  → 只引用自己
S04  → 只引用自己
S08  → 只引用自己
S13  → 只引用自己
S22  → 只引用自己
S32  → 只引用自己
S15  → 只引用自己
S18  → 只引用自己
S29  → 只引用自己
S35  → 只引用自己
S98  → 只引用自己
```

**没有一案读过别案的 transcript。** 所以前面十案的结论不带这个污染。

### 13.6 但核查过程本身又踩了一次同一个坑

第一次核查我用的是：

```bash
grep -c 'C--tmp-bb-S[0-9][0-9]' "$f"
```

结果 **11 案全部"命中"**，看起来像全线污染。实际呢？

命中的内容是：

```
"memory_paths":{"auto":"C:\tmp\bb-home\.claude\projects\C--tmp-bb-S18\memory\\"}
Glob {"path":"C:\tmp\bb-home\.claude\projects\C--tmp-bb-S18\memory"}
```

—— **都是它自己的目录**，一个是 init 事件里系统打印的 `memory_paths`，
一个是 agent 去 Glob 自己的 memory 目录。

**判据写的是「有没有引用 transcript 目录」，而不是「有没有引用别案的」。**
少了一个 `grep -v "^$id$"`。

这与本仓库那些「量错了对象」的闸门是同一个病，只是这次发生在我的核查脚本里。
也是本轮第 **五** 次了。

**正确写法**：

```bash
others=$(grep -oa 'C--tmp-bb-S[0-9][0-9]' "$f" | sed 's/C--tmp-bb-//' | sort -u | grep -v "^$id$")
[ -n "$others" ] && echo "$id: 引用了 $others"
```

注意 `grep -a`：不加它，二进制内容的文件只会输出 "Binary file matches"，**看起来像命中但拿不到内容**。
