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
