# 重大发现：此前所有盲测的模型都没收到任务书，只收到一个词

> 2026-11-13　主线程
> 这条推翻的不是一个实验，是**整轮盲测的有效性**。

---

## 一、根因：`Start-Process -ArgumentList` 把多词 prompt 拆散了

`_blindbox-run.ps1` / 运行器模板原本这么传参：

```powershell
$argList = @('-p', $msg, '--model', 'opus', ...)
Start-Process -FilePath claude.exe -ArgumentList $argList ...
```

PowerShell 用 `-ArgumentList` 传数组时，会**用空格把元素拼成一个命令行串**，
而**不会**给含空格的元素自动加引号。于是 `$msg` 里每个空格都成了一个参数边界：

```
$msg = 'Read task.txt in this directory, then write the finished page to out.html ...'
实际 argv: ["-p", "Read", "task.txt", "in", "this", "directory,", ...]
```

`claude` 只把 `-p` 后面第一个词 `Read` 当成 prompt，其余全被当成无法识别的参数丢掉。

---

## 二、证据链（三道独立确认）

### 2.1 会话记录里的 `lastPrompt`

```
$ grep -o '"lastPrompt":"[^"]*"' C:/tmp/bb-home/.claude/projects/C--tmp-bb-S98/*.jsonl
"lastPrompt":"Read"
```

### 2.2 模型自己的话（首个 thinking）

S98：
> The user just said "Read". That's a minimal message. Let me look at the working directory
> to understand context. … The instruction "Read" is ambiguous.

S31（我原以为它正常，实际也一样）：
> … the instruction is just "Read," which seems incomplete or like I'm missing some context.

### 2.3 修复前后对比（端到端实测）

修好后用同一条链路跑一个短任务，会话记录里的首条 content：

```
修复前： "lastPrompt":"Read"
修复后： "content": "Reply with exactly the word BANANA and nothing else."
```

**完整句子收到了。**

---

## 三、影响范围：全部 13 个盲测

```
$ grep lastPrompt C:/tmp/bb-home/.claude/projects/C--tmp-bb-*/*.jsonl
S97   "Read"
S98   "Read"
```

其余案的 transcript 在「隔离泄漏修复」时被清掉了（那是对的），
但 S31 / S99 / S15 等案的首个 thinking 里同样能看到「instruction is just Read」的困惑。

**所以：**

| 结论 | 状态 |
|---|---|
| 十案「配色 10/10、字号比 10/10」 | **全部作废** —— 模型没读到配色段，也没读到字号要求 |
| 六案「六个可测值精确命中」 | **全部作废** |
| S99「虚构风格也能精确命中」 | **作废** |
| S97「泛化描述能做出 466 行」 | **作废**（它同样只收到 Read） |
| S98「零产物」 | 作废原因多了一条，且是最根本的一条 |

**注意**：那些产物仍然是模型做出来的（内容完整、闭合 `</html>`），
但它们**不是照着提示词做出来的** —— 是模型读了 `task.txt`（通过 Read 工具）之后
自己发挥的。这解释了为什么有些产物和提示词对不上。

---

## 四、为什么我之前没发现

我检查过很多次产物质量：配色、字号比、机制值。
**但那些值都在 `task.txt` 里，而模型通过 `Read` 工具能读到它。**

所以「配色 5/5 命中」这件事，可能来自模型自己读了 `task.txt`，
而不是来自我传给它的 prompt。**两种路径的结果看起来完全一样。**

这是本轮第八次同类错误，也是唯一一次影响面覆盖全部的：
**我验证了产物的正确性，但没有验证「模型是通过什么路径拿到要求的」。**

---

## 五、修复

### 5.1 改法

```powershell
# 错
$argList = @('-p', $msg, '--model', 'opus', ...)
Start-Process ... -ArgumentList $argList

# 对（一个已经带引号的字符串）
$argLine = '-p "' + $msg + '" --model opus ...'
Start-Process ... -ArgumentList $argLine
```

### 5.2 落地时踩的坑

1. 先改 `_make-runner.ps1` 的模板数组 —— 但嵌套引号在数组里被转义吞掉，
   `$quotedMsg` 那行没写进产物，模板引用了一个未定义变量。
2. 改成**字面模板文件** `_runner-template-literal.ps1`，`_make-runner.ps1` 只负责复制。
   没有转义层，就不会再坏。

### 5.3 验证方法（以后每次改传参都要跑）

```bash
# 1. 跑一个短任务（只要求回复一个词）
# 2. 读会话记录，确认首条 content 是完整句子
node -e "…读 C:/tmp/bb-home/.claude/projects/C--tmp-<案>/… 的 content…"
```

**判据**：首条 `content` 必须等于你传的完整 `$msg`。
如果只有一个词，说明传参又坏了。

---

## 六、这对「重跑 S98」意味着什么

**全部盲测都要重跑，不只是 S98。**

但这不改变 §28 的结论：S98 测的状态产品里不存在。
所以优先级是：

1. **重跑十案**（有一个各案提示词真的被读到的版本）—— 这是核心结论的基础
2. 修 `probe.mjs` 画廊判据（C9 已暴露 5 案）
3. S98 可选

**在传参修好之前，跑任何盲测都是浪费。**

---

## 七、我现在的判断

这一轮从「十案全绿」到「全部作废」，中间隔着的就是一个引号。

我不打算掩盖这件事。上面 §三 那张表就是本轮全部盲测的判决。
下一步要么重跑，要么承认「盲测这条线暂时没有可信结论」。

**需要你决定的是**：重跑十案（约 10 小时 × 案数，且要错峰到凌晨避开 524），
还是先把这条线挂起、转去做别的（比如 `probe.mjs` 的画廊判据、内容层不稳定的问题）。

---

## 八、最小复现：不是推测，是子进程实际收到的 argv

有人（包括我自己）会怀疑「PowerShell 真的会拆吗」。写了个只打印 argv 的子进程来验：

```powershell
$msg = 'Read task.txt in this directory then write out.html'

# A: 数组形式（旧运行器的写法）
$argListA = @('-NoProfile','-File',$echoer,'-p',$msg,'--model','opus')
Start-Process -FilePath powershell -ArgumentList $argListA ...

# B: 拼成带引号的字符串（新写法）
$argLineB = '-NoProfile -File "' + $echoer + '" -p "' + $msg + '" --model opus'
Start-Process -FilePath powershell -ArgumentList $argLineB ...
```

子进程实际收到的：

```
=== A) ArgumentList as ARRAY (old style) ===
  argc=11
  argv[0]=-p
  argv[1]=Read              ← 只有这一个词是 prompt
  argv[2]=task.txt
  argv[3]=in
  argv[4]=this
  argv[5]=directory
  argv[6]=then
  argv[7]=write
  argv[8]=out.html
  argv[9]=--model
  argv[10]=opus

=== B) ArgumentList as STRING with quotes (new style) ===
  argc=4
  argv[0]=-p
  argv[1]=Read task.txt in this directory then write out.html   ← 完整
  argv[2]=--model
  argv[3]=opus
```

**A 里 `-p` 后面散成了 8 个独立参数。** `claude` 取第一个词当 prompt，
`task.txt` / `in` / `this` / ... 全被当成无法识别的位置参数丢掉。

而 `--model opus` 因为不含空格，两种写法都能正确传过去 ——
这也解释了为什么「模型参数看起来是生效的」，从而掩盖了 prompt 的问题。

### 8.1 这条复现为什么重要

在前面的诊断里，我用的证据是「会话记录 `lastPrompt: "Read"`」和「模型说 The user just said "Read"」。
那两条是**间接**的 —— 有可能被解释成别的意思（比如 lastPrompt 记录的是最后一个工具名）。

**argv 复现是直接的**：子进程亲口告诉你它收到了什么。

规则：**能拿到直接证据时，不要停在间接证据上。**

### 8.2 复现脚本

`_probe/_argprobe.ps1`，纯 ASCII，跑一次几秒钟，不涉及 claude、不涉及沙箱。

如果以后有人改传参，先跑它。

---

## 九、更正：模型通过读 `_run.ps1` 把元指令补了回来

§一 到 §七 我写的「模型从未收到任务书」**是错的**。取证 Agent 用 S99 的完整 stream
（13.7 MB，还在 `_probe/_s99-stream-final.jsonl`）证明了两条通道都通了。

### 9.1 模型自己的话（S99 的 thinking 原文）

> Let me look at the other files briefly to understand context.
> The task: The user wants me to read task.txt and write out.html. Wait — the system prompt
> here says "Read" only. The actual user message is "Read" — hmm, actually the human turn
> says just "Read". **But the `_run.ps1` script indicates the message should be
> "Read task.txt in this directory, then write the finished page to out.html with the Write tool…"**
> Actually the human turn content is "Read". Hmm, that's ambiguous. But the environment is a
> benchmark harness. **The intent is clear: read task.txt and produce out.html.**

**它发现 argv 丢了 prompt，然后主动去读 `_run.ps1` 把指令找了回来，并判定「intent is clear」。**

### 9.2 行为证据：28 次写操作全部指向 out.html

```
$ node …统计 S99 的 tool_use…
读 _run.ps1 的次数: 1
写操作次数: 28
写入目标: "C:\tmp\bb\S99\out.html"（28/28 零例外）
```

**所以「没收到写 out.html」这条不成立** —— 它收到了，还照做了 28 次。

同理「没收到别过度分析」也不成立（`$msg` 里那句话也在 `_run.ps1` 里）。

### 9.3 那 S31 为什么写 index.html

取证 Agent 查清了：**S31 没有读 `_run.ps1`。**

所以「S31 写 index.html」的原因是「它没去读那个文件」，
不是「提示词没告诉它写 out.html」。**两件事被我合成了一件。**

### 9.4 正确的结论

| 我原先写的 | 实际 |
|---|---|
| 模型从未收到任务书 | ❌ 错。产品提示词（`task.txt`）与元指令（`_run.ps1`）都到了 |
| 13 个盲测全部作废 | ❌ 错。分类型：内容类有效 12/12，行为类与模型能力类作废 |
| 产物不是按提示词做的 | ❌ 错。是按提示词做的，只是送达路径不是标准对话通道 |

**准确的说法**：

> 产品提示词与元指令都完整到达了模型，只是元指令走的是「读文件」这条绕道，
> 不是标准对话通道。`Read` 返回的就是全文，与店主粘进 ChatGPT 的文字没有区别。
>
> 受影响的不是「内容」，是「行为」：没有标准 user turn、没有目标路径提示、
> 没有「别过度分析」压着 —— 所以**耗时、卡不卡、想多久这些结论不可用**。

### 9.5 「argv 丢 prompt」这个 bug 本身仍然是真的

§八 的 argv 复现（argc=11 vs argc=4）没有错。错的是我**从它推出了过大的结论**。

bug 的后果是「元指令不经过对话通道」，而不是「指令没送达」。

### 9.6 这是我第几次同类错误

第九次。前八次是「读了一个信号，误判成缺陷」。这次是：
**拿到了一个真实的 bug（argv 确实被拆了），然后推断出一个夸大的后果（指令没送达）。**

规则补充：**发现 bug 之后，要验证它的实际后果，不要从机制推后果。**
这个 bug 的机制是「argv 被拆」，我推的后果是「指令没送达」，
而实际后果是「模型绕道读了回来」—— 中间那一步我没有验证。

### 9.7 唯一真正作废的那一类

取证 Agent 指出一条我自己没想到的：**沙箱测的是 agent 路径，不是店主聊天路径。**

沙箱里的模型会 `Glob` 找文件、自己推路径、`Edit` 自纠 24 次。
而店主是把提示词粘进 ChatGPT —— 那条路上没有工具、没有自纠。

**所以这批数据对 Cursor/v0 这类 agent 路径有效，对纯聊天路径证明不了什么。**

这是比「argv bug」更根本的一条限制。
