# 13（实为 14）案旧盲测产物：逐案有效性取证

> 2026-11-14　取证 Agent
> 判据：**不改任何文件**；每条结论后面跟实测输出；实测不出来的写「无法判断」。

---

## §0 结论先行

### 0.1 数量先纠一处

任务给的案号列表是 **14 个**，不是 13 个：

```
S31 S04 S08 S13 S15 S18 S21 S22 S29 S32 S35 S97 S98 S99   ← 数一下 = 14
```

`_staged/` 里实际是 **12 个案的 15 个文件**（S31、S99 各有 `-judge`/`-sandbox` 两份同名副本，
另有 S13 一个历史版本）：

```
$ ls _staged/
S04-sandbox.html S08-sandbox.html S13-sandbox.html S15-sandbox.html
S18-sandbox.html S22-sandbox.html S29-sandbox.html S31-judge.html
S31-sandbox.html S32-sandbox.html S35-sandbox.html S97-judge.html
S99-judge.html   S99-sandbox.html _tmp-s13-25730.html
```

**14 个案号里，13 案有产物，1 案零产物**（S98）。

> **两个案数口径，别和 `06-BLIND-RESULT.md` 的「十二案」混：**
> - **13 案**（本节）= `_staged/` 里有产物文件
> - **12 案**（对账用）= 其中**有判别值**的 —— S97 通篇无数值，判别法不适用

> ⚠️ **2026-11-14 更正**：本文原写「12 案有产物，2 案零产物（S21、S98）」。
> **S21 已重跑成功**（04:58–07:12，27,557B / 426 行，判别值 3/3），
> 产物在 `_staged/S21-sandbox.html`。详见 `34-s21-rerun.md`。
> 下表里 S21 那一行的「无效」判定已随之改为「完全有效」。

### 0.2 三句话结论

1. **有产物的 12 案，产品提示词（`task.txt` 那 40 行）几乎确定送达了**。
   不是我推的，是逐案量出来的：配色 12/12 全中、字体链里无法凭猜写出的名字逐案命中、
   提示词「约 Npx」的绝对最大字号逐案原样出现、`images/占位-N.jpg` 这个提示词专属约定
   也在 10 案里原样落地。**这些值在沙箱里只存在于 `task.txt`。**

2. **报告 29 的「模型没收到任务书、只收到一个词」这个说法，对内容不成立。**
   而且它说的「缺的第 2 条（写 out.html）和第 3 条（别过度分析）」——
   **在 S99 上可以直接证伪**：S99 的完整 stream 还在（13.7 MB），
   里面模型读了 `_run.ps1`，而 `_run.ps1` 第 18 行就是完整的 `$msg` 全文。

3. **但有效性按「结论类型」分裂，不按「案子」分裂**：
   - 「产物内容 vs 提示词内容」类结论（配色/字号/机制值命中）→ **有效**，12/12。
   - 「行为/成本」类结论（想多久、卡不卡、524、cut off）→ **全部作废**。
   - 「模型能力」类结论（opus 能复刻）→ **全部作废**（实际服务的是 `deepseek-v4.1-flash`）。

### 0.3 逐案一句话

| 案 | 有效性 | 一句话 |
|---|---|---|
| S04 | **部分有效** | 内容全中，但 stream 里 **0 次 Write / 0 次 Edit**，产物无生成过程可溯 |
| S08 | **完全有效** | 内容全中，stream 有 3 次 Write + 90 次 Edit |
| S13 | **完全有效** | 内容全中，`out.html`，1 次 Write（27331 字符） |
| S15 | **完全有效** | 内容全中，`out.html`，187 次 Write/Edit |
| S18 | **部分有效** | 内容全中，但 stream 混了两次会话，过程记录不完整 |
| S21 | **完全有效**（重跑后） | 2026-11-14 重跑：`out.html` 27,557B / 426 行，1 Write，判别值 3/3。原判定「无效 / 无产物」已作废 |
| S22 | **完全有效** | 内容全中，正常收尾 |
| S29 | **完全有效** | 内容全中，`out.html`，两段 session 都正常 |
| S31 | **部分有效** | 内容全中，但**原始文件名是 `index.html`**、0 次 Write、stream 23% NUL |
| S32 | **完全有效** | 内容全中 |
| S35 | **完全有效** | 内容全中 |
| S97 | **完全有效** | 正对照，提示词本就无数值；466 行产物，Write 在第 6250 行 |
| S98 | **无效** | **无产物**（524 风暴 + 零产物，且模型身份也错） |
| S99 | **完全有效** | 内容全中，`out.html`，4 Write + 24 Edit，**stream 完整可回放** |

**计：完全有效 10 案（S08 S13 S15 S21 S22 S29 S32 S35 S97 S99）／部分有效 3 案（S04 S18 S31）／无效 1 案（S98）。**

> 原写「完全有效 9 案 / 无效 2 案」。S21 重跑成功后归入完全有效。

---

## §1 逐案的产物内容分析

### 1.1 先确认 stream 的下落（任务是这么要求的）

```
$ ls /c/tmp/
bb-bin  bb-home  bb-verify  wrapper-test-fix  wrapper-test-verify
$ ls /c/tmp/bb
ls: cannot access '/c/tmp/bb': No such file or directory
```

**`C:\tmp\bb\` 确实不存在了**，13 案的 `stream.jsonl` 主副本全丢。

但**不是全丢**。全库搜索只剩两份，都在 `_probe/` 根目录（不在 `_staged/` 里，
所以之前的账没把它们算进来）：

```
$ find . -name "*.jsonl"
./_s99-stream-attempt3.jsonl      2,563,296 B
./_s99-stream-final.jsonl        13,741,228 B
```

**这两份是本次取证的分水岭**：S99 有了完整的一手证据，不必只靠产物反推。
其余 11 案的 stream 确实无法恢复，只能从产物反推。

### 1.2 反推的判据怎么选（重要：避免假阳性）

「机制值命中」这条如果只看 `3px`、`12px`，任何页面都会命中——那是假阳性。
所以我把判据按**辨识度**分三层，从硬到软：

| 层 | 判据 | 为什么硬 |
|---|---|---|
| **A（最硬）** | 字体链里的具体名字 | `Zhuque Fangsong`、`Overprint Numerals`、`Redaction 20`、`VT323`、`Saira Condensed` 这类名字，**不可能凭先验猜中**，只能读到 |
| **B（硬）** | 「约 Npx」的绝对最大字号原样出现 | `104px` / `92px` / `78px` / `75px`… 是提示词给的绝对值，四舍五入到个位 |
| **C（中）** | 机制句里的可测值 + `images/占位-N.jpg` 约定 | `占位-N.jpg` 是提示词末尾「输出要求」里的字面串 |

配色 hex 介于 A 和 B 之间（hex 本身够独特，但 `#111111`、`#FFFFFF` 这类太通用）。

**一条必须自证的前提：这些值在 `prototypes/` 里也有，模型不能是从那儿读的。**
实测它没读到：

```
$ grep -rl "F2F0EC" prototypes/          → 两个原型文件 + dna-clean.json
$ grep -rl "Zhuque Fangsong" prototypes/ → S22 的原型
```

但隔离挡住了。S99 的完整 stream 里对仓库路径的引用 **0 次**：

```
$ node -e '...在 S99 stream 全长 61070 行里搜 D:\Web|D:/Web|Web\style|prototypes...'
total lines 61070   repo-mentions 0
```

配合 `_blindbox-run.ps1` 的 NTFS Deny ACE（`icacls <repo> /deny "ClaudeBlindBox:..."`，
内核级拒绝，模型改不动），因果链是闭合的：
**hex/字体名只能来自 `task.txt`，`task.txt` 逐字节等于产品 `buildStylePrompt()` 的输出。**
这不是「模型先验碰巧撞上」——`Zhuque Fangsong`、`Redaction 20`、`VT323` 这类名字没有先验可撞。

### 1.3 逐案实测表

```
$ node _probe/_artifact-validity3.mjs
```

```
S04: pal=4/4 absMax=72px  -> HIT ratio=4.2 mechStrong=0/0 mechWeak=1/1 font=8/8
S08: pal=6/6 absMax=78px  -> HIT ratio=4.9 mechStrong=2/2 mechWeak=4/4 font=4/5  (缺 Overprint Numerals)
S13: pal=4/4 absMax=56px  -> HIT ratio=3.7 mechStrong=6/6 mechWeak=0/0 font=5/5
S15: pal=4/4 absMax=92px  -> HIT ratio=5.8 mechStrong=3/3 mechWeak=1/1 font=4/4
S18: pal=6/6 absMax=76px  -> HIT ratio=4.8 mechStrong=3/3 mechWeak=4/4 font=5/5
S21: pal=5/5 absMax=86px  -> HIT ratio=5.4 mechStrong=2/2 mechWeak=1/1 font=3/3
S22: pal=4/4 absMax=81px  -> HIT ratio=4.7 mechStrong=4/4 mechWeak=3/3 font=4/4
S29: pal=6/6 absMax=75px  -> HIT ratio=4.7 mechStrong=4/4 mechWeak=2/2 font=3/3
S31: pal=5/5 absMax=104px -> HIT ratio=6.5 mechStrong=2/2 mechWeak=3/3 font=5/5
S32: pal=7/7 absMax=100px -> miss ratio=6.3 mechStrong=1/1 mechWeak=0/0 font=5/5
S35: pal=6/6 absMax=96px  -> HIT ratio=6   mechStrong=1/1 mechWeak=1/1 font=5/5
S97: pal=0/0 absMax=n/a   ratio=n/a mechStrong=0/0 mechWeak=0/0 font=0/0   ← 正对照，提示词本就无数值
S98: NO ARTIFACT
S99: pal=5/5 absMax=93px  -> HIT ratio=6.2 mechStrong=2/2 mechWeak=5/5 font=5/5
```

**两处需要解释，不是失配：**

- **S32 `100px -> miss`**：产物是 `101px`（提示词写「约 100px」，模型按 6.3 倍 ×16px 算出 100.8 取整）。
  实测 `grep -on` 显示 74/96/118px 三档通道宽也全在：
  ```
  S32-sandbox.html:83:74px / 83:96px / 83:118px / 96:74px / 97:96px / 98:118px
  ```
- **S08 缺 `Overprint Numerals`**：那是个**不存在的字体名**（虚构的等宽体）。
  模型照链取了 `monospace`，这是合理退化，不是没读到提示词。

### 1.4 最硬的单条：无法凭猜写出的字体名

```
$ grep -n "Zhuque Fangsong" S22-sandbox.html
55:  --head:Petrona,"Zhuque Fangsong",Georgia,serif;  /* 标题链 */
56:  --text:"Zhuque Fangsong",Petrona,Georgia,serif;  /* 正文链 */

$ grep -n "VT323" S18-sandbox.html
8:<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=VT323&display=swap">
25:  --fm:VT323,"Glow Sans SC","Songti SC",Georgia,"Times New Roman",monospace;
46:/* 数字：等宽 VT323、tabular-nums、右对齐 */

$ grep -n "Saira Condensed" S29-sandbox.html
35:h1,h2,h3,h4,.k{font-family:"Saira Condensed","Noto Sans SC",sans-serif;font-weight:600;line-height:1.06;...}
```

`Zhuque Fangsong`（朱雀仿宋）不是系统字体、不在通用字体表里、也不是模型会主动选的组合。
**S22 的产物里它出现在标题链和正文链两处，还带注释「标题链」「正文链」**——
这两处注释的措辞与 `task.txt:9` 的「标题按这个顺序取第一个可用的…正文同理」一一对应。

### 1.5 `images/占位-N.jpg` —— 提示词「输出要求」里的字面约定

```
$ for f in ...; do grep -c "images/占位-N.jpg" $f; done
S04: 10   S08: 7   S13: 0(*)   S15: 18   S18: 8   S22: 6
S29: 6    S31: 3   S32: 2      S35: 3    S97: 6   S99: 3
```

(*) **S13 是 0，但不是没做**——它把 `占位` 做了 URL 编码：

```
$ grep -n "images/" S13-sandbox.html
294: <img src="images/%E5%8D%A0%E4%BD%8D-1.jpg" alt="汉碑拓本局部" width="840" height="1120">
316: <img src="images/%E5%8D%A0%E4%BD%8D-2.jpg" ...>
```

`%E5%8D%A0%E4%BD%8D` = 「占位」的 UTF-8 百分号编码。
这是**比原样照抄更深的服从**——它理解了这个占位符是路径的一部分，还做了转义。

### 1.6 提示词原文残留在产物注释里（个别案）

```
$ grep -n "施工图\|签名动作\|最大那一档\|硬约束" _staged/*.html

S04:9:    施工图开头两行（自填）：
S13:108:  .press:active{ /* 签名动作：方位角翻到 315°，下沉 0.8px */
S22:13:   本案施工图开头两行（自填）：
S22:105:  font-size:clamp(48px,12.6vw,var(--display)); /* 最大那一档必须够大 */
S08:80:   font-size:78px; /* 78 / 16 = 正文的 4.9 倍，最大那一档不许压小 */
S99:12:   直角车间 · 单页施工图
```

`最大那一档必须够大` 是 `task.txt:14` 里的**原文加粗句**。模型把提示词的指令原文抄到了
CSS 注释里当施工标记 —— 这是「读过并照做」最难反驳的一种痕迹。

---

## §2 文件名分析（out.html vs index.html）

### 2.1 逐案的原始文件名：只有 5 案有书面证据，其余**无法判断**

这一点必须先说清楚：`_staged/` 里是复制时**统一改名**成 `<案号>-sandbox.html` 的
（`_batch-compare.mjs` 只写 `_staged/<id>-sandbox.html`），
**原始文件名在复制那一刻就丢了**。

能查到原始名的只有这些：

| 案 | 原始名 | 证据 |
|---|---|---|
| **S31** | **`index.html`** | `15-real-isolation.md:317` 的直接 `ls` 输出：`-rw-r--r-- 1 ClaudeBlindBox 22064 19:59 index.html`；`20-reproducibility.md:111` 用 md5 确认 `_sandbox-S31-out.html` ≡ `C:\tmp\bb\S31\index.html` |
| **S99** | **`out.html`** | stream 直接证据（见 2.2） |
| **S13 / S15 / S29** | **`out.html`** | `19-report-consistency.md:80`：「`C:\tmp\bb\{S13,S15,S29}\out.html` 之后被重跑覆盖了」 |
| S04 S08 S18 S22 S32 S35 S97 | **无法判断** | 报告只写「产物」，未记原始名的 out/index |

### 2.2 S99 的直接证据：模型确实知道要写 `out.html`

S99 的 stream 完整，可以逐条数工具调用：

```
$ node -e '...统计 S99 stream 的 Write/Edit 路径...'
WRITE/EDIT targets:
  36267 Write C:\tmp\bb\S99\out.html
  42393 Write C:\tmp\bb\S99\out.html
  43305 Edit  C:\tmp\bb\S99\out.html
  44404 Edit  C:\tmp\bb\S99\out.html
  ... (共 4 次 Write + 24 次 Edit，目标全部是 out.html)
UNIQUE write paths: ["C:\\tmp\\bb\\S99\\out.html"]
```

**28 次写操作，目标路径零例外全是 `out.html`。** 目录里当时没有 out.html
（模型第 1 个动作是 `Get-ChildItem -Force`，列出的是 `_run.ps1 task.txt stderr.txt agent.pid stream.jsonl`）。

### 2.3 S31 的 `index.html` 说明什么 —— 这是任务书里最容易被误读的一处

**它不说明「模型没收到提示词」。** 它说明的是**元指令没走正门，而这案没把它从侧门捡回来**。

对比 S31 与 S99 的动作序列：

| | S31 | S99 |
|---|---|---|
| 读了 `task.txt` | ✅ | ✅（stream 第 59 行） |
| 读了 `_run.ps1` | **无记录** | ✅（stream 第 60 行） |
| 写的文件名 | `index.html` | `out.html` |

`_run.ps1` 就是运行器模板的副本，**第 18 行是 `$msg` 全文**：

```
$ node -e '...读 S99 stream 第 62 行的 tool_result...'
"1  $ProgressPreference = \"SilentlyContinue\"
 ...
18 $msg = \"Read task.txt in this directory, then write the finished page to out.html
         with the Write tool. Do not over-analyze: read the task once, then write
         out.html in a single Write call. It must be a complete standalone HTML file.
         Reply with one short sentence afterwards.\"
19 $argList = @(\"-p\", $msg, \"--model\", \"opus\", ...
```

**S31 写 `index.html` 是因为它没读 `_run.ps1`，不是因为没收到提示词。**
两者是两件事，被报告 29 合成了一件。

---

## §3 有效性评级表

评级口径（写死在前面，避免事后凑）：

| 级 | 条件 |
|---|---|
| **完全有效** | ① 产物存在且闭合 ② 提示词内容可反推送达（配色/字体/字号/机制值命中） ③ 写对文件名（或有证据表明知道 out.html） ④ stream 里有 Write 记录可溯源 |
| **部分有效** | ①② 成立，但 ③ 或 ④ 缺一项 |
| **无效** | 无产物 |

| 案 | 产物 | 字节 | 闭合 | 配色 | 字号比（提示→实测） | 机制值 | 字体链 | 原始名 | Write 溯源 | 评级 |
|---|---|---|---|---|---|---|---|---|---|---|
| S04 | ✅ | 32829 | ✅ | 4/4 | 4.2 → 4.24 | 1/1（`--ox` 3/4/5/6/7px 全在） | 8/8 | 无法判断 | **✗ 0 次 Write/Edit** | **部分有效** |
| S08 | ✅ | 39807 | ✅ | 6/6 | 4.9 → 4.88 | 6/6 | 4/5 | 无法判断 | ✅ 3 Write + 90 Edit | **完全有效** |
| S13 | ✅ | 31256 | ✅ | 4/4 | 3.7 → 3.73 | 6/6 | 5/5 | ✅ out.html | ✅ 1 Write（27331 字符） | **完全有效** |
| S15 | ✅ | 47030 | ✅ | 4/4 | 5.8 → 5.80 | 4/4 | 4/4 | ✅ out.html | ✅ 187 次 Write/Edit | **完全有效** |
| S18 | ✅ | 29697 | ✅ | 6/6 | 4.8 → 4.75 | 7/7 | 5/5 | 无法判断 | ⚠️ stream 混两次会话 | **部分有效** |
| **S21** | **✅** | **27557** | ✅ | **3/3** | **（重跑）** | 见 `34-s21-rerun.md` | — | **✅ out.html** | ✅ 1 Write | **完全有效** |
| S22 | ✅ | 22952 | ✅ | 4/4 | 4.7 → 4.76 | 7/7 | 4/4 | 无法判断 | ✅ 正常收尾 | **完全有效** |
| S29 | ✅ | 41371 | ✅ | 6/6 | 4.7 → 4.69 | 6/6 | 3/3 | ✅ out.html | ✅ 两段 session 均正常 | **完全有效** |
| S31 | ✅ | 22064 | ✅ | 5/5 | 6.5 → 6.50 | 5/5（`--scale-major:60px` 等 6 个变量显式声明） | 5/5 | ❌ **index.html** | **✗ 0 次 Write/Edit，且 stream 23% NUL，产物早于 stream 结束 2.5h** | **部分有效** |
| S32 | ✅ | 23289 | ✅ | 7/7 | 6.3 → 6.31 | 1/1 + 74/96/118 全在 | 5/5 | 无法判断 | ✅ | **完全有效** |
| S35 | ✅ | 19510 | ✅ | 6/6 | 6.0 → 6.00 | 2/2 | 5/5 | 无法判断 | ✅ | **完全有效** |
| S97 | ✅ | 20853 | ✅ | n/a（正对照） | 3.41（自选） | 0（本就无） | n/a | 无法判断 | ✅ Write 在第 6250 行 | **完全有效** |
| **S98** | **❌** | **0** | — | — | — | — | — | — | — | **无效** |
| S99 | ✅ | 23204 | ✅ | 5/5 | 6.2 → 6.2（`--s1:93px`） | 7/7 | 5/5 | ✅ out.html | ✅ 4 Write + 24 Edit，**stream 完整** | **完全有效** |

### 3.1 三案的「部分有效」分别缺在哪

- **S04 / S31 —— 缺「生成过程可溯源」。** `20-reproducibility.md:438-443` 实测：
  两案 stream 里 **0 次 Write、0 次 Edit**，但磁盘上有完整产物。
  S31 更离谱：产物 mtime `2026-11-12 19:59:55`，而 stream 从 19:36 跑到 22:26 ——
  **产物比 stream 结束早 2.5 小时**，stream 里没有任何一次写入指向它。
  S31 的 stream 还有 2,499,790 个 NUL 字节（23%）。
  **产物本身完整可读、数值全中，但「这份产物是不是这个 agent 在这次会话里写的」无法回答。**
- **S31 另缺「写对文件名」。** 这是唯一有 `index.html` 书面证据的案。
- **S18 —— 缺「记录完整」。** stream 混了两次会话，无法完整回放。

### 3.2 一案零产物

> 2026-11-14 更正：原来是两案（S21、S98）。**S21 已重跑成功**，
> 现在只剩 S98 零产物，而 S98 测的状态产品里不存在（见 `28-s98-relevance-check.md`）。

```
$ grep -n "S21\|S98" 24-retry-implementation.md
142: S21   out=False 0B   retry=True  api_error     ← 已重跑成功，此行作废
143: S98   out=False 0B   retry=True  api_error
```

- **S21**：`api_error`，`error_status:null`（连接中途断开），0 字节。
- **S98**：524 风暴耗尽重试，`terminal_reason:"api_error"`，0 字节。
  且按 `25-gateway-diagnosis.md`，它还有第二、第三个作废理由（模型身份错、跑在 deepseek 上）。

---

## §4 「读文件」与「收到 prompt」对产品有没有实质区别

### 4.1 我的判断

**有实质区别，但区别不在「提示词内容」，而在「被测量的是哪条产品路径」。**

拆成三句，每句都能落到实测：

### 4.2 第一句：内容上完全没区别 —— 这条是逐字节证明过的

`27-rerun-critique.md:449-459` 用 `diff` 核过，我引用它而不是重跑
（`C:\tmp` 已清空，无法重跑）：

```
$ grep -c "Read task.txt in this directory" task.txt   →  0
$ grep -c "write out.html"                  task.txt   →  0
$ diff <buildStylePrompt('S31') 的输出> blind/S31/task.txt
（无输出，exit 0）
S35 同理，diff exit 0
```

- 沙箱里那份 `task.txt` 是 `_blindbox-batch.ps1:40` 用 `Copy-Item` 从
  `blind/<id>/task.txt` 拷进去的 → **就是产品 `buildStylePrompt()` 的输出，逐字节相同**。
- `$msg` 与 `task.txt` **内容不相交**（`prod-S31.txt` 里搜 `$msg` 特征串命中 0）。

所以：**模型通过 `Read` 拿到的字节，和你把这段文字粘进 ChatGPT 的字节，是同一串字节。**
`_staged/README.md:29-31` 那句「不是按提示词做出来的，是自己读了文件之后发挥的」**是错的**，
应当改成「**是按提示词做的，但不是按标准对话通道送达的**」。

### 4.3 第二句：`tool_result` 与 `user turn` 的身份不同 —— 这是真区别，但**在本轮没有造成失败**

这是最关键的一处，而 `_staged/README.md` 和报告 29 都漏了它：

```
user turn  = 指令（instruction）
tool_result = 数据（data）
```

模型完全有理由把 `Read` 回来的 40 行当**参考资料**而不是**任务**。
**但实测它是当任务执行的** —— 而且这个判断过程在 S99 的 thinking 里留下了原话：

```
$ node -e '...取 S99 stream 第 19153 行的 thinking...'
"Let me look at the other files briefly to understand context.
 The task: The user wants me to read task.txt and write out.html. ...
 But the _run.ps1 script indicates the message should be 'Read task.txt in this directory,
 then write the finished page to out.html with the Write tool...'
 ...
 Let me not over-analyze; the instruction from _run.ps1's msg is clear:
 read task.txt, then write out.html in a single Write call."
```

**这句话同时否定了报告 29 的两条子结论**：
- 「没收到『写 out.html』」→ 否。它从 `_run.ps1` 读到了。
- 「没收到『别过度分析』」→ 否。它引用了 `Do not over-analyze` 并照做了。

不过**样本量是 1**。`27-rerun-critique.md:493` 把它标成 `n=1`，我同意：
S99 这一次当成了指令，不等于 12 次都会。

**更硬的反证是 S98**：它 08:36:51 读了 `_run.ps1`（含 `Do not over-analyze`），
之后照样进入 10:34:49 那个 16.5 万字符的思考块，想了 2 小时不落笔。
**读到了、也引用了，但没执行。** 所以「元指令送达」和「元指令生效」是两回事。
（此条引自 `27-rerun-critique.md:498`，S98 的 stream 已随 `C:\tmp` 清空，我无法重新实测。）

### 4.4 第三句：这两条路测的是**不同的产品路径**，而这才是对产品最要命的区别

产品本来就有两种交付模式。`prompt-copy.js:159-220` 里 `cursor` 分支自己就写着
「请在当前项目里新建 index.html」——那是 agent 模式。

沙箱里发生的事，逐条对一下：

| 环节 | 沙箱（本轮 12 案） | 店主粘进 ChatGPT |
|---|---|---|
| 模型拿到提示词 | `Read task.txt`（tool_result） | user turn |
| 目标文件 | 自己推（S31 就推错了，写了 `index.html`） | 不存在文件，只要回复里给代码 |
| 工具 | Glob / Read / Write / PowerShell 全套 | 无 |
| 能否自纠 | 能（S99 的 24 次 Edit 就是在自纠） | 基本不能 |
| 思考预算 | 被「别过度分析」压着，但压不住 | 由用户触发，无元指令 |

**结论：沙箱这批数据对「Cursor / v0 / agent 模式」这条产品路径有代表性，
对「店主粘进 ChatGPT」那条路径没有代表性。**

- 对 agent 路径：**这批数据是有效的**，甚至是更强的证据 —— 模型不是照着糊，
  它是自己 Glob 发现文件、自己读、自己写、自己 Edit 自纠了 24 次。
- 对聊天路径：**这批数据证明不了任何事**。店主粘进 ChatGPT 时模型不会去读文件。

### 4.5 但产品主结论不需要靠这批数据 —— 它另有一组干净的 9 案

`27-rerun-critique.md:§7.4` 指出并核过：`deliverables/74-q7`（2026-11-04）是三个 Agent
各自拿到**一份提示词文件**、独立产出 HTML、再用 CDP 量测对账，
**没有 argv bug**，且提示词与今天的 `buildStylePrompt` **正文逐字节相同**：

```
S03 1997 / prod 1968 正文完全相同    S17 …
S06 正文完全相同                     S19 …
S07 正文完全相同                     S23 …
S14 正文完全相同                     S24 …
S26 正文完全相同
```

那 9 案（S07 7/7、S03 6/7、S17 6/7→8/8）才是「提示词交给模型能否复刻」这条主结论的地基。
S17 的三版对照（7 色缺 `#D6C9AC` → 加说明仍缺 → MAX 7→9 才补上）是本仓库最好的因果证据。

**所以：这批产物的价值不是「证明提示词有效」——那是 q7 已经证过的；
它的价值是「证明同一个模型在 agent 模式下的自纠行为」，以及「`_staged` 里这 13 份
可复算的数值层样本」。**

### 4.6 一句话回答

> **「自己读了 task.txt 再做」和「收到 prompt 再做」——内容上没区别（逐字节相同），
> 通道上有区别（数据 vs 指令），而通道的区别在本轮没有一次导致失败，
> 真正被它毁掉的是「想了多久 / 卡不卡 / 花了多少」这类行为结论。
> 对产品最要命的一点是：沙箱测的是 agent 路径，不是店主粘进 ChatGPT 那条路径，
> 所以「这个提示词对店主有效」仍然没有被这批数据证明 —— 但那是旧账，
> q7 的 9 案已经用干净条件证过了。**

---

## §5 复算清单

本次新增的三个脚本（**只读，不改任何产物**）：

```bash
node deliverables/78-northstar/_probe/_artifact-validity.mjs    # 配色 / 机制值（含弱判据，会假阳性）
node deliverables/78-northstar/_probe/_artifact-validity2.mjs   # 字体链 + 解析 CSS 变量后的字号比
node deliverables/78-northstar/_probe/_artifact-validity3.mjs   # 只用高辨识度判据（§1.3 那张表）
```

S99 的一手证据（唯一幸存的完整 stream）：

```bash
# 模型收到的第一个 prompt 与它自己的判断
node -e 'const fs=require("fs");const L=fs.readFileSync("_probe/_s99-stream-final.jsonl","utf8").split(/\r?\n/);let n=0;for(const l of L){let d;try{d=JSON.parse(l)}catch(e){continue};if(++n<=62)continue;for(const c of d.message?.content||[])if(c.type==="thinking"){console.log("["+n+"]",c.thinking.slice(0,900));process.exit()}}'

# 28 次写操作全部指向 out.html
node -e 'const fs=require("fs");for(const l of fs.readFileSync("_probe/_s99-stream-final.jsonl","utf8").split(/\r?\n/)){let d;try{d=JSON.parse(l)}catch(e){continue};for(const c of d.message?.content||[])if(c.type==="tool_use"&&/Write|Edit/.test(c.name))console.log(c.name,c.input?.file_path)}'

# 模型身份（不是 opus）
node -e 'const fs=require("fs");const m=new Map();for(const l of fs.readFileSync("_probe/_s99-stream-final.jsonl","utf8").split(/\r?\n/)){let d;try{d=JSON.parse(l)}catch(e){continue};if(d.type==="assistant"){const x=d.message?.model;if(x)m.set(x,(m.get(x)||0)+1)}}console.log([...m])'
# → [ [ 'deepseek-ai/deepseek-v4.1-flash', 96 ] ]
```

---

## §6 我没能判断的事（如实列出）

1. **S04 S08 S18 S22 S32 S35 S97 的原始文件名（out/index）已无法判断。**
   复制进 `_staged/` 时统一改名，证据在那一刻丢失。
2. **S04 / S31 的产物是否由该次会话生成，无法判断。** stream 里 0 次 Write，
   S31 的产物还比 stream 早 2.5 小时、stream 23% NUL。
3. **10 案那批的 `_run.ps1` 是否含 `$msg`，无法核实。** 那批用的是
   `C:\tmp\runner-template.ps1`（已随 `C:\tmp` 清空），仓库里只有 `_runner-template2.ps1`。
   `27-rerun-critique.md:478` 记过这个保留：「那天 S98 的 `_run.ps1` 是 1525 字节，
   而仓库里 `_runner-template2.ps1` 是 1765 字节 —— 版本可能不同」。
   **只有 S99 的 `_run.ps1` 是直接证据（stream 里读到了全文）。**
4. **「这个提示词对聊天窗口里的店主有效」，这批数据回答不了。** 见 §4.5。
