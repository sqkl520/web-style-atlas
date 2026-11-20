# 传参 bug 的独立复核：机制是真的，后果被夸大了

> 2026-11-14　独立复核 Agent
> 任务：质疑主线程的诊断（`29-prompt-truncation-bug.md`），它可能夸大，也可能漏了什么。
> 纪律：不改任何已有文件；临时脚本全部在 `C:\tmp\review\`；每条结论跟实测输出。

---

## §0 结论先行

**部分成立。**

| 主张 | 判定 | 依据 |
|---|---|---|
| `Start-Process -ArgumentList` 传数组会把多词 prompt 按空格拆散 | ✅ **成立，确定性复现** | 13 份真实 `task.txt` 全部实测：argc 46–111，`argv[1]` 只剩 96–102 字符（应 1305–2117）|
| `lastPrompt:"Read"` 证明模型只收到一个词 | ✅ **成立（但字段语义要说准）** | `lastPrompt` 记的是**最后一条字符串型用户输入**，不是工具名；201 字符截断 |
| 模型原话证明 prompt 被截断 | ✅ **成立，且是模型自述** | S99 stream 第 19152 行：`The actual user message is "Read"` + 它自己把 `_run.ps1` 读回来补全 |
| 修复后首条 content 是完整句子 | ⚠️ **结论对，但主线程那份"端到端"证据是坏的** | 它保留的两份 argtest transcript 都是 `Not logged in · Please run /login`（model=`<synthetic>`）。我用同一链路重跑，拿到真模型回 `PINEAPPLE` |
| **此前所有盲测的模型都没收到任务书** | ❌ **不成立** | **产品提示词从来不走 `-p`**，它在 `task.txt` 里，一直是文件通道送达 |
| 13 个盲测全部作废 | ❌ **夸大** | 内容类结论有效（10/10 配色全中、字体名、绝对字号、`占位-N` 约定）；行为类与模型身份类作废 |

**一句话**：主线程抓到了一个真 bug（argv 被拆），但把它推成了「指令没送达」。
实际后果是「**265 字的元指令没走对话通道，模型绕道读 `_run.ps1` 补回来**」。
产品提示词（那 40 行施工图）**从头到尾都不在命令行上**，所以它没被这个 bug 碰过。

主线程已经在 `2978b71`（`29-prompt-truncation-bug.md:225-302` §九）自行更正了这一点。
**但 §三 那张「全部作废」表（`:60-84`）还在，`10-RERUN-PLAN.md:25` 与 `:456` 还在。**
下一个读报告的人会照着那张表做决策 —— 所以本报告的主要价值是把「还没改干净的地方」指出来。

---

## §1 `lastPrompt` 字段的真实含义

### 1.1 它不是工具名

实测（本机当前会话 transcript，35370 行，1221 条 `last-prompt`）：

```
$ node …统计 C:/Users/Administrator/.claude/projects/D--Web-style/f932d1d4-….jsonl
Read tool_use count: 67
last-prompt records: 1221
lastPrompt that are tool names: 0 []
```

**67 次 `Read` 工具调用，1221 条 `last-prompt` 记录，工具名出现 0 次。**
主线程担心的那个误读（「lastPrompt 记的是最后一个工具名」）**可以排除**。

### 1.2 它记的是「最后一条字符串型用户输入」，且截断到 201 字符

记录形状（`C:\tmp\bb-home\.claude\projects\C--tmp-review-e2e-array\*.jsonl`）：

```json
{"type":"last-prompt","lastPrompt":"Reply","leafUuid":"c3b4fcf8-…","sessionId":"026efa41-…"}
```

- 工具结果（`type:user` + `content` 是数组）**不会**写进 `lastPrompt`。我抽查了当前会话 6 条
  记录，前一条 user 消息是 `array(tool_result)` 的，`lastPrompt` 仍然是那条字符串输入。
- **截断长度是 201 字符（含省略号 `…`）**。实测：
  - 当前会话 142 条截断记录，长度全部 = 201，末尾全部是 `…`
  - 我的端到端长句测试：用户消息 249 字符 → `lastPrompt` 201 字符，尾 `…abcdefghi…`
- 首尾空白会被裁掉：我传入 `"Reply with exactly the word PINEAPPLE and nothing else."`，
  转录里的 user content 是 `"…afterwards.\n\r\n"`（多了 stdin 换行），`lastPrompt` 是干净的原句。

### 1.3 所以证据 1 有效，但主线程的措辞要改

`lastPrompt:"Read"` 确实证明**模型那一轮收到的用户消息就是 `Read` 这一个词**。
它不证明「claude 把多余参数丢了」—— 它证明「命令行里本来就只有这一个词是 prompt」。

> **这条对第 2 号验收判据有直接影响，见 §4.3。**

---

## §2 `-ArgumentList` 的最小复现结果

### 2.1 机制：数组会被空格拼接、且不加引号

`C:\tmp\review\argrepro2.ps1`（PowerShell 5.1.19041.7802，子进程是只打印 argv 的 node 脚本）：

```
--- array ---
  { "argc": 21, "argv": [ "-a", "Read", "task.txt", "in", "this", "directory,",
    "then", "write", "the", "finished", "page", "to", "out.html", "with",
    "the", "Write", "tool.", "Do", "not", "over-analyze.", "-b" ] }
--- quoted ---
  { "argc": 3, "argv": [ "-a", "Read task.txt in this directory, then write the
    finished page to out.html with the Write tool. Do not over-analyze.", "-b" ] }
```

**机制确认。** 主线程 §八 的 argv 复现方向正确。

### 2.2 拿 13 份真实提示词跑：数组模式下 `-p` 只吃到第一个片段

`C:\tmp\review\all-tasks-array.ps1`，用的是仓库里真实的 `blind/<案>/task.txt`：

```
id     chars |   argc argv1len
S04     1827 |    100      99
S08     1883 |     98      98
S13     1936 |     92      98
S15     1984 |    101      99
S18     2028 |    111      99
S22     2065 |    109      99
S29     2117 |    105      96
S31     1971 |     72      98
S32     1979 |     87      97
S35     1923 |     83      97
S99     2069 |     97     102
S97     1305 |     46     189
S98     1932 |     64      98
```

每份 1800–2100 字符的提示词，到子进程手上只剩 **96–102 字符**（第一段到第一个空格）。
数组模式下 `argc` 是 46–111 段 —— 空格就是边界，与有没有引号无关。

（对照：换成朴素 `'-p "' + $msg + '"'` 后 `argc` 会降到 4，但**内容被改字**，见 §5.1。
S31 是损伤最重的一案：13 个 ASCII 双引号把整串切成 19 段，prompt 在 1628/1971 处被切断。）

**但请注意：这 13 份提示词，没有任何一个运行器版本是通过 `-p` 传的。**

### 2.3 关键事实：产品提示词从来不走命令行

翻全部历史（`git log --all -p -- _probe/_make-runner.ps1`）：

| 版本 | 命令行上放的东西 | 产品提示词在哪 |
|---|---|---|
| `4ef90b2:19-21` | `$msg = "Please read task.txt … Output as few words as possible."` | `task.txt` 文件 |
| `2041ab7:25-28` 起 | `$msg = "Read task.txt in this directory, then write …"` | `task.txt` 文件 |
| 至今（`_runner-template-literal.ps1:21`、`_runner-template2.ps1:18`） | 同上，265 字符元指令 | `task.txt` 文件 |
| `blind-run.mjs`（另一条线） | `execFile('claude',['-p','请读当前目录下的 task.txt…'])` | `task.txt` 文件 |

**逐版本核对，没有一版把 40 行施工图放到 `-p` 上。**

所以这个 bug 的**打击面天然只是那条 265 字符的元指令**（「读 task.txt、写 out.html、别过度分析」），
不可能碰到配色、字号、机制句 —— 那些字只在 `task.txt` 里，只能通过 `Read` 到达。

> 这是主线程诊断里最根本的一处推理错误：**它把「元指令被拆」直接等同于「任务书没送达」。**
> 两者中间隔着一张文件系统。

---

## §3 模型原话的完整上下文

### 3.1 S99 原文（`_s99-stream-final.jsonl` 第 19152 行，非截断）

> The task: The user wants me to read task.txt and write out.html. Wait — the system prompt
> here says "Read" only. The actual user message is "Read" — hmm, actually the human turn
> says just "Read". **But the `_run.ps1` script indicates the message should be
> "Read task.txt in this directory, then write the finished page to out.html with the Write tool…"**
>
> Actually the human turn content is "Read". Hmm, that's ambiguous. But the environment is a
> benchmark harness. **The intent is clear: read task.txt and produce out.html.**
>
> … Let me not over-analyze; the instruction from `_run.ps1`'s msg is clear: read task.txt,
> then write out.html in a single Write call.

**这是一份「困惑 + 自我修复」的完整记录，不是「模型收到了完整 prompt 只是在规划」。**

它做了三件事，都可以在 stream 里数出来：

```
$ node …统计 S99 的 tool_use…
Read 调用 13 次
其中读 _run.ps1：1 次（第 61 行 tool_result，内容是完整 $msg）
写操作：27 次带路径的 Write/Edit，全部指向 C:\tmp\bb\S99\out.html（+1 次 __unparsedToolInput）
```

### 3.2 同一条 stream 证明产品提示词完整到达

第 60 行的 tool_result 是模型 `Read` 回来的 `task.txt`，**2180 字符，第 1 行到第 40 行齐全**：

```
HEAD: "1\t下面这份是这个风格的施工图。开头两行要你自己填（我不知道你做什么生意）：…
TAIL: …39\t图片位置写成 <img src="images/占位-N.jpg">，…40\t移动端单列，顺序不变。回复里只放这一份代码。"
```

**Read 返回的就是全文，与店主粘进 ChatGPT 的文字没有区别。**

### 3.3 主线程引用的 S98/S31 原话也成立

S31 的「the instruction is just "Read"」同样是困惑而非规划。但注意 S31 的分叉：
`30-artifact-validity.md:§0.3` 查到 **S31 没读 `_run.ps1`**，它写了 `index.html`。
这正好说明「元指令走绕道」的后果是**逐案不同的** —— 读了 `_run.ps1` 的照做，没读的各写各的。
这是行为层不可比的直接原因。

---

## §4 修复对比是否成立

### 4.1 主线程自己保留的那份证据是坏的

`C:\tmp\bb-home\projects` 旁边的 `~\.claude\projects\C--tmp-argtest\`
两份 transcript（`be209efe` = array 模式，`f5f54024` = quoted 模式）**都是失败运行**：

```
assistant model= <synthetic> text= ["Not logged in · Please run /login"]
cost-state {"totalCostUSD":0,"totalAPIDuration":0,…}
```

**两份都没到模型。** 所以 `29-prompt-truncation-bug.md:47-56` 那个「修复后 content 是完整句子」
的 `BANANA`，来自 user message 记录（送达证明），**不是端到端实测**。
主线程在 §2.3 写「端到端实测」，这一处措辞不成立。

### 4.2 我用同一链路重跑，补上了真正的 A/B

`C:\tmp\review\e2e-test.ps1`，同一个 `C:\tmp\bb-bin\claude.exe`、同一个
`HOME=C:\tmp\bb-home`、同一个网关 `127.0.0.1:15721`，只改传参形式：

| 模式 | 子进程收到的 prompt | 模型输出 |
|---|---|---|
| array | `Reply` | `I'm here — what would you like me to do in C:\tmp\review\e2e-array?` |
| quoted | `Reply with exactly the word PINEAPPLE and nothing else.` | `PINEAPPLE` |

array 模式的 thinking 原文：

> The user just said "Reply" — seems like a test. There's no actual task.

**和十个案子的首 thinking 是同一个形态。修复对比成立** —— 只是主线程引的那份证据不是它。
两次运行的 `result.subtype` 都是 `success`，`is_error:false`，排除了「运气」这一项。

### 4.3 ⚠️ 新发现：主线程写下的验收判据永远不可能通过

`27-rerun-critique.md:607`：

```
判据：run.json.trusted === true ∧ lastPrompt == 完整 $msg（不是 "Read"）
```

`10-RERUN-PLAN.md:455-456` 是同一个判据的另一种写法：「通过 = 包含完整的 240 字符提示语」。

**但 `lastPrompt` 硬截断在 201 字符（§1.2 实测），而 `$msg` 是 265 字符。**
所以即使传参完全正确，`lastPrompt == $msg` 也**永远为假**。这条判据会把一次正确的
修复判成失败 —— 又一个「判据量的不是它声称量的东西」，也是本轮最容易被继承下去的那种。

**正确写法**（两种都行，我推荐第一种）：

```bash
# A. 比前 200 字符（避开截断）
#    通过 = lastPrompt 去掉尾部 … 后，等于 $msg 的前 200 字符
# B. 直接比 user message 的 content 字段（不截断），这是我 e2e 用的字段
node -e "读 <案>.jsonl 里 type==='user' && typeof content==='string' 的那条，与 $msg 逐字节比"
```

我实测两种都判别正确：array → `"Reply"`，quoted → 全文；长句 249 字符 → `lastPrompt` 201 字符 + `…`，
但 user content 是完整 249 字符。

---

## §5 有没有更简单的解释

四个候选逐个排除，**但排到最后发现了三个比「argv 被拆」更容易再犯的坑**。

| 候选解释 | 判定 | 实测 |
|---|---|---|
| 命令行长度限制 | ❌ 排除 | 1971 字符经 Quote-Arg 后 4 个参数完整往返；Windows 上限 32767 |
| `$msg` 构造时被截断 | ❌ 排除 | `$msg` 硬编码在模板里，265 字符，无变量拼接；`runner.log` 的 `ARGS:` 行也是全文 |
| 特殊字符导致截断 | ⚠️ **是另一个真 bug，但不是本案原因** | 见 5.1 |
| `-p` 之后多余位置参数被静默丢弃 | ✅ **这才是直接原因** | array 模式下 prompt 是 `Reply`，其余 20 段连同 `--model opus` 一起被吞，claude 不报错、正常退出 |

### 5.1 潜在 bug 1：HEAD 的「修复」对含引号的 prompt 会静默改字

`_runner-template-literal.ps1:55`（HEAD 版本）用的是朴素拼接：

```powershell
$argLine = '-p "' + $msg + '" --model opus …'
```

当前 `$msg` 是纯 ASCII、零个双引号，所以**今天是对的**。
但仓库里**每一份** `task.txt` 都含 `<img src="images/占位-N.jpg">`。实测这一形式：

```
id     naive exact?  naive argc   quotearg exact?
S04    False          4            True
S08    False          4            True
S13    False          4            True
S15    False          4            True
S18    False          4            True
S22    False          4            True   （8 个引号被吞）
S29    False          4            True
S31    False         19            True   （prompt 在 1628/1971 处被切断）
S32    False          4            True
S35    False          4            True
S99    False          4            True
S97    False          4            True
S98    False          4            True
```

S04 的损伤最小也最能说明问题（`t_S04_naive.out`）：

```
want: …图片位置写成 <img src="images/占位-N.jpg">，带该案实际可用的宽高属性…
got : …图片位置写成 <img src=images/占位-N.jpg>，带该案实际可用的宽高属性…
```

**引号被删掉，静默，不报错。** 如果下一步为了「让提示词走对话通道」而把它塞进 `$msg`，
13 案会全部静默改字，S31 还会被切断 —— 而且这次产物的外观仍然正常，比原 bug 更难发现。

工作区**已经有一个正确的修法**（未提交）：`Quote-Arg`（`_runner-template-literal.ps1:31-53`，
按 `CommandLineToArgvW` 规则转义）。我独立验证了往返：

```
plain          roundtrip=True argc=4
dquote         roundtrip=True argc=4
trailing_bs    roundtrip=True argc=4
bs_and_quote   roundtrip=True argc=4
newline        roundtrip=True argc=4
+ 13 份真实 task.txt 全部 roundtrip=True
```

**结论：这个修法该提交。** 但它是「防下一个 bug」，不是「修好了这一个」。

### 5.2 潜在 bug 2：PowerShell 5.1 按 ANSI 读无 BOM 的 UTF-8 脚本

三个运行器模板都没有 BOM（首三字节 `24 50 72` = `$Pr`，`23 20 44` = `# D`）。实测：

```
无 BOM：  literal codepoints: 37719,29361,32133   ← '占位' 被读成 3 个乱码字符
有 BOM：  literal codepoints: 21344,20301         ← 正确
```

当前 `$msg` 纯 ASCII，所以没事。**但任何人往 `$msg` 或模板里写中文，都会变成乱码后再传给模型**，
而这条路径同样静默。要写中文就加 BOM，或者把中文放进 `task.txt`（现在是这么做的，正确）。

### 5.3 潜在 bug 3：`_runner-template2.ps1:19` 仍是数组形式，且仍被引用

`_blindbox-run5.ps1:45` 明确 `$template = 'C:\tmp\runner-template2.ps1'`，
而 `_runner-template2.ps1:19` 还是 `$argList = @("-p", $msg, …)`。
**谁跑 run5，这个 bug 就原样复活。** 仓库里现在有两套模板、一套坏的一套好的，没有任何标记区分。

---

## §6 影响面的准确评估

### 6.1 数量先纠一处：是 14 个案号，不是 13

`_blindbox-batch.ps1:13` 默认 11 个（`S04,S08,S13,S15,S18,S21,S22,S29,S31,S32,S35`），
加上 `S97,S98,S99` = **14**。其中 ~~`S21`（`api_error`）和 `S98`（524）零产物，
**有产物的 12 案**~~ → **2026-11-14 更正：S21 已重跑成功，只剩 S98 零产物，
有产物的 13 案。** 主线程的「13 个盲测」两头都不对（案号 13 与「有产物 12」都不是正数）。

### 6.2 模型读没读 `task.txt`：读了，逐案可证

判据不用「配色命中」（hex 在 `prototypes/` 里也有，会假阳性），用**只存在于产品提示词里的串**：

| 判据 | 为什么硬 | 实测 |
|---|---|---|
| `images/占位-N.jpg` 约定 | `grep -rl "占位-N" prototypes/` 只命中 `prompt-copy.js`（生成器本身），**原型 HTML 里没有** | 10 案产物全部落地 `占位-1..N`；S13 还用了 `%E5%8D%A0%E4%BD%8D-` URL 编码形式 |
| 无法凭猜的字体名 | `Zhuque Fangsong` / `Redaction 20` / `Martian Mono` / `LXGW WenKai` | S22 `Zhuque Fangsong`×2 + `IBM Plex Mono`×2 + `tabular-nums`×4；S04 `LXGW WenKai`×2 + `Martian Mono` + `Redaction 20` |
| 提示词给的绝对 h1 像素 | 「约 Npx」是提示词独有的绝对量 | S31 `104px`、S08 `78px`、S15 `92px`、S18 `76px`、S29 `75px`、S35 `96px`、S13 `56px`、S99 `93px`、S04 `72px`、S22 `81px` 全部在产物里命中；S32 提示词写「约 100px」，产物 `.mega{font-size:101px}`（偏 1%） |

S99 的完整 stream 还直接证伪了「值是从 `prototypes/` 读的」：全长 61070 行里
`D:\Web` / `D:/Web` / `prototypes` **0 次命中**。

**所以「模型没拿到施工图」这个前提不成立。产物是按施工图做的，只是施工图走的是 `Read` 通道。**

### 6.3 结论按类型分裂（这才是准确的判决表）

| 结论类 | 例 | 状态 | 理由 |
|---|---|---|---|
| **内容类** — 产物 vs 提示词 | 配色（10 案逐案 4–7 色、合计 52 处色值，去重 51 个，唯一重合是 S08/S18 共用的 `#111111`）、线宽、字号比、机制值、`占位-N` | ✅ **有效**（12/12 有产物的案子） | 产品提示词完整到达（§3.2 + §6.2） |
| **通道类** — 元指令怎么到模型 | 「读 task.txt / 写 out.html / 别过度分析」 | ⚠️ **路径不可比** | S99 读了 `_run.ps1` 补回；S31 没读，写了 `index.html`。**逐案不同** |
| **行为类** — 耗时、卡不卡、想多久 | 「S98 想了 2 小时」「S31 用了 30 分钟」 | ❌ **作废** | 没有标准 user turn、没有目标路径、没有「别过度分析」压着；且 `C:\tmp` 已清空，stream 不可重算 |
| **模型能力类** — opus 能不能复刻 | 「opus 精确复刻」 | ❌ **作废** | `27-rerun-critique.md` 记 14 份 stream 的 `assistant.message.model` 全是 `deepseek-ai/deepseek-v4.1-flash`；我独立复核的 S99 stream 与我今天两次 e2e 都是同一个值，而 `init` 事件写 `claude-opus-5-5` / `claude-opus-5[1M]`。名义与实际不一致，今天仍在发生 |
| **路径代表性** | 「产品提示词对店主有效」 | ⚠️ **只能外推到 agent 路径** | 沙箱里模型会 `Glob` 找文件、`Edit` 自纠 27 次；店主粘进 ChatGPT 那条路没有工具 |

### 6.4 还站着的那部分有多硬

**`74-q7`（2026-11-04）是同一结论的独立证据，完全没被这个 bug 碰过。**
我复核了几份 `prompt-*.txt` 与今天的 `buildStylePrompt` 逐字节比：

```
74-q7 S07 diskBytes 4654 builtBytes 4571 bodyIdentical true
74-q7 S17 diskBytes 5130 builtBytes 5047 bodyIdentical true
```

（差 83 字节是 q7 版填了店名的前缀，正文从「请把整页做成这个风格」起完全相同。）
那 9 案是三个 Agent 各自拿到**一份提示词文件**、禁止读 `prototypes/`、独立产出后再量测 ——
**「把这段文字交给模型，它能做出这个风格」这件事从来不需要这批 argv 数据来支撑。**

同样，我复核了 10 案的 `task.txt` 与今天的 `buildStylePrompt` **逐字节相同**：

```
S04 4577/4577 true   S08 4659/4659 true   S13 4896/4896 true   S15 4980/4980 true
S18 5017/5017 true   S22 5171/5171 true   S29 5328/5328 true   S31 5025/5025 true
S32 5035/5035 true   S35 4946/4946 true
```

（S97/S98/S99 是手写提示词，`buildStylePrompt` 返回 0，本就该不同。）
**所以这 10 案测的就是产品实际给的东西，这一点没有因传参 bug 而变。**

---

## §7 我认为正确的版本

> **发现**：`Start-Process -ArgumentList` 传数组会把 265 字符的元指令按空格拆成 20–100 段，
> `claude -p` 只把第一段当 prompt，其余位置参数被静默丢弃。13 份真实提示词实测全部复现。
>
> **后果（准确版）**：产品提示词（40 行施工图）**始终在 `task.txt` 里，不走命令行**，
> 因此内容层从未被这个 bug 触及 —— 12 案产物的配色、字体、绝对字号、`占位-N` 约定
> 都能逐案追到 `task.txt`。受影响的是**元指令的送达通道**：模型收到的是一个孤零零的 `Read`，
> 必须自己 `Glob` 找目录、`Read task.txt` 拿任务、部分案子再 `Read _run.ps1` 补回元指令。
>
> **影响面**：
> - 内容类结论 **有效**（12/12）
> - 行为类（耗时、卡不卡）与模型身份类 **作废**
> - 通道形态逐案不同（读了 `_run.ps1` 的照做，没读的各写各的），**行为观测不可横比**
> - 沙箱测的是 agent 路径，对纯聊天路径**只能外推，不能宣称**

### 7.1 必须跟着改的三处（否则下一个人会照着错表决策）

| 位置 | 现状 | 应改为 |
|---|---|---|
| `29-prompt-truncation-bug.md:60-84` §三 | 「影响范围：全部 13 个盲测」+ 五条「全部作废」 | 换成 §6.3 的分类型表；并把案数改成 14（12 有产物） |
| `10-RERUN-PLAN.md:25` | 「每一次运行收到的指令都只有 "Read" 这一个词」 | 「元指令只到一个词；产品提示词经 `task.txt` 完整到达」 |
| `10-RERUN-PLAN.md:455-456` | 「通过 = 包含完整的 240 字符提示语」「失败 = 等于 "Read" ← 本轮 10/10 全失败」 | 判据改成「user content 逐字节等于 `$msg`」或「`lastPrompt` 前 200 字符等于 `$msg` 前 200 字符」；否则假 FAIL（§4.3）。另 `:75`「整个运行器提示语（约 240 字符）没有一句话到达模型」也要改成「经 `_run.ps1` 绕道到达」 |

### 7.2 修 bug 的优先级（这次真的按后果排）

1. **提交 `Quote-Arg`**（工作区已有，13/13 真实提示词往返精确）—— 它防的是下一个人
   「把提示词塞进 `-p`」时踩到引号静默改字，那是比原 bug 更隐蔽的形态。
2. **删掉或标注 `_runner-template2.ps1`**（仍是数组形式，`_blindbox-run5.ps1:45` 还在引用）。
   两套模板一好一坏、无标记，是下一轮事故的标准配方。
3. **改 §4.3 那条判据** —— 它是本轮唯一一条「即使修对了也会报错」的验收。
4. 模板加 BOM，或明确约定「中文只放 `task.txt`」。
5. 重跑本身：**不急着跑十案**。内容类已有 12 案 + 74-q7 的 9 案兜底；
   真正缺的是行为类，而行为类还卡在「网关服务的是 deepseek」这条上，重跑也修不好。

---

## §8 复现清单（都可几秒内重跑，不碰 claude）

| 脚本 | 验证什么 |
|---|---|
| `C:\tmp\review\argrepro2.ps1` | 数组 vs 加引号字符串的 argv 差异（最小） |
| `C:\tmp\review\all-tasks-array.ps1` | 13 份真实提示词在数组模式下的 argc 与截断长度 |
| `C:\tmp\review\all-tasks-naive.ps1` | 朴素引号 vs `Quote-Arg`，13 份真实提示词的往返精确性 |
| `C:\tmp\review\real-prompt-test.ps1` | 单案（S31）三模式对照，含首个分歧字符位置 |
| `C:\tmp\review\quotearg-test.ps1` | `Quote-Arg` 在引号/尾反斜杠/换行上的往返 |
| `C:\tmp\review\enc-test.ps1` | PowerShell 5.1 无 BOM 读 UTF-8 的乱码（在 `pwsh51-encoding.ps1` 里） |
| `C:\tmp\review\e2e-test.ps1 <array\|quoted>` | 真模型端到端 A/B（几十秒，要网关在线） |

---

## §9 一句话给主线程

机制你对，证据链你有一半是坏的（argtest 那两份是 `Not logged in`），
后果你推大了一个数量级 —— **因为产品提示词根本不在命令行上**。
你已经自己更正了（§九），但 §三 那张表和两处验收判据还没改；
其中 `lastPrompt == $msg` 这条**在修复正确时也会报失败**，别把它带进重跑。

---

## 主线程对这份复核的回应：三件都对，都改了

### 1. ✅ 我写的验收判据永远不可能通过 —— 已修

复核指出：`lastPrompt` 硬截断在 201 字符，而 `$msg` 是 265 字符，
所以「`lastPrompt == 完整 $msg`」这个判据永远报失败，**即使修对了也一样**。

我独立复核：

```
$ node -e "…读 C:/tmp/bb-home/.claude/projects/*/… 的 lastPrompt 长度…"
review-e2e-array   长度    5  "Reply"
review-e2e-long    长度  201  "This is a 265-character probe. abcdefghij…"
review-e2e-quoted  长度   55  "Reply with exactly the word PINEAPPLE and nothing else."
```

`review-e2e-long` 的 probe 是 265 字符、`lastPrompt` 只有 201 —— **确实硬截断。**

已改两处：
- `27-rerun-critique.md:607` → 改成「前 200 字符 == 前 200 字符」
- `10-RERUN-PLAN.md:457` → 同，并注明「判据只能是前缀比对，不能要求全文相等」

**这条错误的性质**：我定判据的时候没有验证「这个判据在正确输入下会不会通过」。
一个永远报失败的判据，和一个永远报成功的判据一样无用。

### 2. ✅ 我的端到端证据是坏的 —— 但复核替我做了一份更硬的

复核说：我保留的两份 argtest transcript 是 `model=<synthetic>` + `Not logged in · Please run /login`。

那两份 transcript 已随 `C:\tmp` 清空消失了，我无法验证，但**这个描述与我当时看到的现象吻合**
（那次两种写法都回 "Not logged in"）。

复核用同一链路重做了，我独立核了它的数据：

```
e2e-array  | model: deepseek-ai/deepseek-v4.1-flash | Not logged in: false
  lastPrompt: "Reply"

e2e-quoted | model: deepseek-ai/deepseek-v4.1-flash | Not logged in: false
  lastPrompt: "Reply with exactly the word PINEAPPLE and nothing else."
```

**真模型、无认证问题、A/B 对比干净。** 这比我的原始证据更强。

### 3. ✅ 产品提示词从来不走命令行 —— 结构性不可能受影响

复核逐版本核了 `_make-runner.ps1` 的全部历史，
**没有一版把 40 行施工图放在 `-p` 上**；`-p` 上永远是那 265 字符的元指令。

所以这个 bug **在结构上不可能碰到配色、字号、机制句**。

这一条与我 §九 的更正一致，但复核给的是更强的论证：
不是我「发现了模型绕道」，而是「它本来就只能走 `task.txt`」。

### 4. ⚠️ 它指出的第三件事我还没修

> 当前 HEAD 的朴素引号修复对含引号的 prompt 会静默改字：
> 13 份真实 `task.txt` 全含 `<img src="…">`，实测引号被删、S31 在 1628/1971 处被切断。

而工作区已有 `Quote-Arg`（Windows `CommandLineToArgvW` 官方转义规则），
复核独立验证了 13/13 往返精确，**但这个还没提交**。

另外 `_runner-template2.ps1:19` 仍是数组形式且被 `_blindbox-run5.ps1:45` 引用，
**两套模板一好一坏无标记** —— 这是真实隐患。

这条我接着处理。

---

## 一句话总结这份复核的价值

它没有推翻「argv 会拆 prompt」这个机制（那是真的，我用 13 份真实 task.txt 验证过），
但它把**后果**从「全部作废」拉回到「内容类不受影响」，
而且指出我两条具体的技术错误：一个不可能通过的判据、一份坏掉的端到端证据。

这三条我都独立复核过，全部成立。
