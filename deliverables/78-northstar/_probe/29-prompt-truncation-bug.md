# 「模型没收到任务书」是我的误判 —— 真正的 bug 只是元指令走了绕道

> 2026-11-13 主线程　**2026-11-14 04:xx 大幅更正**
>
> ⚠️ **标题原是「重大发现：此前所有盲测的模型都没收到任务书，只收到一个词」，
> 那个结论是错的。** 保留本文是因为里面的 argv 复现（§八）和运行器三个
> 静默失败（§十）都是真的、都有用。错的是从中推出的后果。
>
> **一句话结论**：产品提示词通过 `Read task.txt` 完整送达（67/67 判别值，
> 阴性对照 3.8%），模型的产物确实是照着提示词做的。**十案不需要重跑。**
> 受影响的只有「行为类」和「模型身份类」结论。详见 §三 和 §九。

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

## 三、影响范围：不是「全部作废」，要按类型分

> **本节 2026-11-14 04:xx 重写。** 原表把 13 个盲测一律判「作废」，
> 那是从「argv 被拆」推出来的**过度结论**（见 §九）。
> 现在的判据是证据类型，不是 bug 是否存在。
> 判别方法见 §十一：**67 个判别值 67 命中，阴性对照非对角线只有 3.8%**。

### 3.1 哪些结论能用

| 结论类别 | 状态 | 依据 |
|---|---|---|
| **十二案配色精确命中** | ✅ 有效 | 53 个唯一 hex 出现在产物 `--var` 里，且语义一一对应 |
| **十二案字号/尺寸精确命中** | ✅ 有效 | 67/67 判别值；阴性对照 3.8% |
| **「按提示词做的，不是自己发挥」** | ✅ 有效 | 判别值只存在于该案提示词；巧合概率近 0 |
| **S97「泛化描述也能做出完整页面」** | ✅ 有效 | 466 行完整产物在 `_staged/S97-judge.html`，本可直读 |
| **S99「虚构风格也能精确执行」** | ✅ 有效 | 7/7 判别值，与真实案同水平 |
| **线宽判据 10/11** | ✅ 有效 | 2026-11-14 重算：只有 S31 一例真违规，且原因是提示词自相矛盾（见 `35-s31-contradiction-evidence.md`） |
| **行为类（耗时、卡不卡、想多久）** | ❌ 不可用 | 元指令走「读 `_run.ps1`」绕道，没有标准 user turn |
| **模型身份（「opus 能复刻」）** | ❌ 不可用 | 网关服务的是 `deepseek-v4.1-flash` |
| **纯聊天路径（店主粘进 ChatGPT）** | ❌ 未覆盖 | 沙箱测的是 agent 路径，有工具、有自纠 |
| **S98「删数值就卡死」** | ❌ 作废 | 524 打断 + 该状态产品里不存在（§28） |

### 3.2 为什么原来那张表是错的

原表说「模型没读到配色段」——**但 53 个唯一 hex 就在产物里。
模型没读到，这些值从哪来？** 原表自己的判据就否证了原表的结论。

真正的 bug 后果只有一个：**元指令不经过对话通道**。
产品提示词（`task.txt`）通过 `Read` 工具完整送达，
`Read` 返回的就是全文，与店主粘进 ChatGPT 的文字没有区别。

### 3.3 仍然成立的事实

那些产物**确实是模型做出来的**（内容完整、闭合 `</html>`），
而且**确实是照着提示词做的**（67/67 判别值）。

这一点用交叉矩阵钉死了：拿 A 案产物去搜 B 案的判别值，平均只命中 3.8%；
搜自己的判别值，命中 100%。**差 26 倍。**

```
产物\判别     S04   S08   S13   S15   S18   S22   S29   S31   S32   S35   S99
S04         5/5   1/7   1/7   0/4   0/5   0/5   0/7   1/3   0/8   0/6   0/7
S08         0/5   7/7   0/7   0/4   0/5   0/5   0/7   2/3   0/8   0/6   0/7
...
对角线平均 100.0%　非对角线平均 3.8% [28/737]
```

### 3.4 剔除巧合后的真实强度

67 个判别值里有 7 个其实不算判别值（在别的产物里也出现过）：
`S08 的 10px`（9/10 份无关产物都有）、`S31 的 34px`（9/10）、
`S31 的 60px`（3/10）、`S04 的 1.1px`（2/10）、`S13 的 14.5px`（2/10）、
`S13 的 0.4mm`（1/10）、`S99 的 132px`（1/10）。

**剩下 60 个「零份无关产物含它」的干净判别值，60 个全中 —— 100%。**
这一行才是排除巧合后的证据。脚本：`_discriminator-crosscheck.mjs`。

### 3.5 语义位置也核了

数字出现还不够，本仓库最老的病是「数字对、对象错」。
`_discriminator-semantic.mjs` 把每个判别值在提示词里的语境和产物里的
CSS 声明并排打出来，`67/67 可定位到语义，0 可疑`。举例：

```
[S99 93px]  提示词：最大标题要压到正文的 6.2 倍（约 93px）
            产物  ：--s1:93px
[S32 118px] 提示词：通道头宽度按编号位数分 74/96/118px 三档
            产物  ：.g4{width:118px;}
[S35 #8A939C] 提示词：#8A939C（rule）
            产物  ：--rule:#8A939C
```

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

> **本节 2026-11-14 重写，并在 S21 跑完后更新。** 原文说「全部盲测都要重跑」，
> 那是 §三 旧表的直接后果。现在按证据分：**该跑的只有 S21，它已经跑完了。**

| 案 | 是否需要重跑 | 理由 |
|---|---|---|
| 十一个已有产物的案 | ❌ 不需要 | 67/67 判别值 + 阴性对照 3.8%，产物有效 |
| S97 | ❌ 不需要 | 466 行完整产物，但它本就无数值，判别法不适用（不代表无效） |
| S99 | ❌ 不需要 | 7/7 判别值 |
| **S21** | ✅ **已重跑，成功** | 2026-11-14 04:58–07:12，27,557B / 426 行，3/3 判别值。详见 `34-s21-rerun.md` |
| S98 | ⚪ 不必 | 它测的状态产品里不存在（§28） |

重跑十案的成本是 30.1 小时 / $93，换来同一批数；S21 一个案 2.1 小时就够了。
**最小集合确实是 1 案，而且它成功了。**

优先级：
1. ~~重跑 S21~~ ✅ 完成
2. 修 `probe.mjs` 画廊判据（C9 已暴露 5 案）—— 已查实 `columns` 不进产品，
   优先级下调，见 `17-gallery-fix-attempt.md` §六
3. S98 可选，或直接删掉这个对照

**在传参修好之前，跑任何盲测都是浪费** —— 这条仍然成立，
而且修好之后的运行器已经验证过（§10.1，265/265 byte-exact）。
S21 这次又验了一遍：`runner.log` 第一行就是整句 prompt 进了 `-p`。

---

## 七、我现在的判断

> **本节 2026-11-14 重写。** 原文的「从十案全绿到全部作废」是错的。
> 正确的一句：**从一个真实的 bug（argv 确实被拆），推出了一个夸大的后果（指令没送达）。**

这一轮真正学到的东西不是「引号」，是 **§9.6 那条规则**：

> 发现 bug 之后，要验证它的实际后果，不要从机制推后果。
> 这个 bug 的机制是「argv 被拆」，我推的后果是「指令没送达」，
> 而实际后果是「模型绕道读了回来」—— 中间那一步我没有验证。

十案的产物一直是有效的。我差点花 30 小时重跑，换来同一批数。

**当前不需要你决定什么** —— 除非你要我跑 S21，那件事我等你点头。

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

---

## 十、运行器验证 Agent 又挖出三个静默失败（我全都复核了）

这三个比我修的那个 argv bug 更难发现，因为**它们失败之后仍然报成功**。

### 10.1 已修好的：完整指令送达 ✅

Agent 在真实沙箱里跑（`ClaudeBlindBox` + 计划任务 + Deny ACE）：

```
expected len=265  received len=265  BYTE-EXACT MATCH: true
```

三种确认都过了：模型复述了任务书三件事、产物 `<title>` 精确命中当次标记
（`FRAMBOISE-77` / `QUINCE-88`，两次用不同标记排除残留）、最终话是
"Wrote out.html — a 5-line standalone page with FRAMBOISE-77 in the title"。

### 10.2 新发现一：路径含空格时 `schtasks /TR` 静默失败

```
/TR = ... -File "C:\tmp\bb space test\V01\_run.ps1" ...
create: 错误: 无效参数/选项 - 'space'。
```

**`/Create` 失败了，但运行器照常进等待循环、空等 90 秒。** 日志看起来像在跑。

四种写法实测：普通引号 ❌、部分转义 ❌、**全部转义成 `\"` ✅**、8.3 短路径 ✅。
已改成全转义，并加了「创建失败即中止」。

### 10.3 新发现二：prompt 里的双引号被静默删除（高危）

Agent 真跑 claude 验证：发 `ALPHA"BETA"GAMMA`，模型收到 **`ALPHABETAGAMMA`**。

我复核了影响面：

```
$ for f in deliverables/78-northstar/blind/*/task.txt; do grep -q '"' "$f" && echo x; done
含双引号的: 38 / 38
```

**38/38 个生产任务书都含双引号**，位置有两类：

```html
<img src="images/占位-N.jpg">           ← 输出要求里的 HTML 示例
方阵"贴左边缘长出"这个不对称             ← 中文引号包裹的短语
```

如果把它们塞进 `-p`，`src="images/..."` 会变成 `src=images/...`（非法 HTML）。

**当前没爆，因为这些任务书走 `task.txt` + Read 工具，不走 `-p`。**
但任何「把 task.txt 塞进 `-p`」的改法会立刻踩中 —— 这是定时炸弹。

### 10.4 新发现三：`$cand[0]` 在单元素时返回首字符（本次真实发生）

```powershell
$single = 'only-one-item'
$single[0]        → 'o'          ← 标量取下标 = 取字符
@('only-one-item')[0] → 'only-one-item'
```

我把管道结果赋给变量时，如果只有一个结果，PowerShell 退化成标量 String，
`$cand[0]` = `'C'`，`Copy-Item` 抛 PathNotFound —— **但仍然打印 OUT_OK、仍然置 hasOutput=true。**

之前一直没发现，是因为 `OutFile` 通常在 `TaskDir` 里、源文件名也恰好是 `out.html`，
复制成了自我覆盖的空操作。

已改成 `@($cand)[0]`。

### 10.5 三个坑是同一个形状

> **失败之后仍然报成功。**

- 路径含空格 → `/Create` 失败 → 空等 90 秒 → 看起来像在跑
- 引号被吃 → HTML 变成非法的 → 产物仍然是「成功写出」
- 标量取下标 → `Copy-Item` 抛错 → 仍然 OUT_OK

Agent 留了一条建议给我：`Invoke-Attempt` 宣布 `hasOutput` 之前应
`Test-Path` 目标文件且字节数 > 0。**这条我没让它改，我来定。**

**我的判断：应该加。** 这一行断言能同时挡住这三个坑和将来的变体。
这是本仓库最老的病（闸门读不到数据也不报错），只是这次发生在运行器里。

### 10.6 一个需要纠正的放大

Agent 提醒：**这个 bug 只影响 PowerShell 沙箱线。**

- `blind-run.mjs` 用 Node 的 `execFile` 传数组，Node 自己加引号，安全
- 40 行任务书走 `task.txt` + Read 工具，不走 `-p`

所以「argv bug 影响了整个项目」这个说法是错的，它只影响沙箱运行器这一条线。

---

## 十一、规划 Agent 给了一个决定性的判别方法（我独立复算一致）

§九 我更正了「模型没收到任务书」，但当时的证据是「配色 5/5 命中」——
那可以被反驳成「配色有 5 个，猜中的概率不算太低」。

规划 Agent 用了更强的方法：**挑出「只属于这一份提示词」的判别值。**

### 11.1 方法

对每一案：
1. 从它的 `task.txt` 抽出全部数值与色值 token
2. **去掉那些在其他 37 份任务书里也出现过的**
3. 剩下的就是「判别值」——模型若没读到这份提示词，不可能命中

这不是「产物里有没有 60px」这种弱检验，
而是「产物里有没有那个**只在这一份**提示词里的值」。

### 11.2 我的独立复算

```
$ node deliverables/78-northstar/_probe/_discriminator-check.mjs
案    判别值  命中
S04      5    5   100%
S08      7    7   100%
S13      7    7   100%
S15      4    4   100%
S18      5    5   100%
S22      5    5   100%
S29      7    7   100%
S31      3    3   100%
S32      8    8   100%
S35      6    6   100%
S99      7    7   100%
──────────────────────
TOTAL discriminators: 67 hits: 67
```

**67 个判别值，67 个全中。** 有产物的案子全是 100%。

> 此表 2026-11-14 重算。原版逐案数偏大（用了宽松的 token 规则，
> 且 S04/S08/S15/S18 等案的个数写错），但**总数 64 恰好一致**。
> 现在 `_discriminator-check.mjs` 与 `_discriminator-semantic.mjs` 用完全
> 相同的语料库和规则，两边都输出 64/64，可互相验证。

### 11.2b 阴性对照：这个方法自己在测什么

「数字出现了」不等于「模型知道这个数字」。所以我又做了一次交叉矩阵：
**拿 A 案产物去搜 B 案的判别值。**

```
对角线（本案×本案）平均: 100.0%
非对角线（本案×他人）平均:  3.8%   [28/737]
```

**差 26 倍。** 这个比值就是「知识」与「巧合」的分界。

再剔除那 7 个「在别的产物里也出现过」的弱判别值后：

```
干净判别值（零份无关产物含它）: 60 个
其中自身产物命中: 60 个 = 100.0%
```

脚本：`_discriminator-crosscheck.mjs`

### 11.3 这为什么是决定性的

判别值举例：

```
S31 的 60px / 34px / 104px    ← 其他 37 份任务书里没有这三个数
S04 的 1.1px                  ← 只有它有
S22 的 16.5px                 ← 只有它有
S32 的 118px                  ← 只有它有
以及 50 个独一无二的 hex
```

**在「模型没读到提示词」的假设下，命中这 67 个值的概率接近 0。**
它只能是通过 `Read task.txt` 拿到的。

### 11.4 这把结论钉在哪儿

```
✅ 产品提示词完整送达（67/67 判别值，阴性对照 3.8%）
✅ 模型照着提示词做了（不只是碰巧像）
✅ 语义位置也对（67/67 可定位，0 可疑）
❌ 行为类结论（耗时、卡不卡）不可用 —— 元指令走的是绕道
❌ 模型身份类结论不可用 —— 网关服务的是 deepseek-v4.1-flash
```

**十案的产物不需要重跑。** 重跑十案的成本是 30.1 小时 / $93，
换来的是同一批数。

### 11.5 这条结论怎么复验（三个脚本，几秒，不碰 claude）

```bash
node deliverables/78-northstar/_probe/_evidence-gate.mjs            # 六条断言
node deliverables/78-northstar/_probe/_evidence-gate.mjs --selftest # 证明闸门会响
node deliverables/78-northstar/_probe/_discriminator-check.mjs      # 逐案 64/64
node deliverables/78-northstar/_probe/_discriminator-crosscheck.mjs # 阴性对照矩阵
node deliverables/78-northstar/_probe/_discriminator-semantic.mjs   # 语义位置
```

`_evidence-gate.mjs` 的六条断言：

| 断言 | 阈值 | 实测 |
|---|---|---|
| A. 判别值总数与逐案满分 | = 67 且 100% | 67/67 ✅ |
| A′. 有产物的案数 = 12（写死，不从文件推） | 12 案 | ✅ |
| B. 阴性对照非对角线 < 15%，且倍数 ≥ 5× | 3.8% / 26.3× | ✅ |
| C. 干净判别值（零份无关产物含它）100% | 60/60 | ✅ |
| D. 报告引用的 53 个 hex 与实测一致，且 hex+数值 = 67 | 53 + 14 | ✅ |

A′ 单独存在的理由：分母变小有两种原因 —— **产物丢了** 还是 **该改常数**。
只有 A 的话，删掉 S31 的两份文件只会报「总数 61，期望 64」，
下一个人会以为要改常数，而真正要做的是恢复文件。实测过这个区别。

**为什么需要这个闸门**：这三个数字原来只存在于本文和 `30-artifact-validity.md` 里。
如果 `_staged/` 的产物被清理、或判别逻辑改坏，报告里的「64/64」就变成
一句无源之谈，而**没有任何东西会报错** —— 这正是本仓库最老的病。
产物已经在 git 里（`_staged/` 下 16 个文件，460 KB），所以这条证据是可永久复验的。

自测证明它不是恒真：8 个变异（总数改成 65 / 对角线少 1 / 非对角线 50% /
干净值少 1 / hex 数写成 45 / hex+数值对不上 / 删掉一个案的产物 / 产物目录换成空的）**全部让闸门响了**。

> 这个闸门**没有**接进 `quarter.mjs`。那是产品链的季度体检，
> 而这份证据属于研究线。接进去的后果是「有人清理研究产物 → 产品体检失败」，
> 那是一个没人能理解的失败。
