# 无 API 环境下「盲测复刻验货」可行性实测

> 2026-11-11　角色：可行性验证 Agent
> 方法：全部结论来自 transcript 机器审计（`~/.claude/projects/D--Web-style/.../subagents/*.jsonl`）、
> 实际命令输出、以及在本机跑通度量器与对账器。**未调用任何 AI API，未使用任何发现到的凭证。**
> 文中所有 `agent-xxxx…` 都是 subagent transcript 的目录名（完整路径见 §1.3）。

---

## 〇、结论先行

**两个说法都不完全对。第三种可能才是事实，而且它比两者都更糟。**

| 说法 | 判定 | 一句话证据 |
|---|---|---|
| MASTER-PLAN：验货**依赖一个模型 API key** | **错（描述性错误）** | 上一轮零脚本调 API；16 个生成 agent 全是子 agent（§1.1、§1.2）。全仓库 grep `fetch/api.openai/anthropic/curl/requests` 在 Q7 目录内 **0 命中** |
| 另一个 Agent：上一轮**用的是子 agent** | **对，但只对了上半句** | 16 个盲测 agent 的 transcript 全部存在，工具集只有 `Read/Write/Edit/Bash`（§1.2） |
| 另一个 Agent：真正的障碍是「**模型路由会中途换模型**」 | **方向对，量级和结论都错** | 确实有 1/16 中途换模型（`ad676d`，第 938 条），但**换模型不是主要障碍**——真正的障碍是 16/16 从一开始就没跑在被要求的模型上：`requested=claude-opus-5-5` → `served=SCNet-Max`（§3.1）。**0 个 agent 跑在 Opus 上** |
| **第三种可能（实际发生的事）** | — | 表里 `model:"opus"` 是**名义参数**，实际由本机代理路由到 `SCNet-Max`。所以「固定模型」既不是配置能保证的（plan 假设），也不是「偶尔会漂」（WBS 假设），而是**从未成立过**。同一次盲测的 16 份产物是由一个**未被声明、身份不明**的模型家族生成的 |

**三句话回答「能不能做」：**

1. **对账那一半：能，现在就能跑，已实测**（`compare.mjs` 三案 7/7/7 + 六案 7/7/7/7/7/6，各约 2–5 分钟）。
2. **生成那一半：也能跑，但不是「无 API」，而是「用本机已有模型路由跑子 agent」**——而这恰恰**不能满足「固定同一个模型」**，因为路由层不可控。
3. **「证伪提示词没用」这个目的：达不到。** 原因不是没 API，而是 §5 的认识论问题 + §4.2 的判据问题：7 条判据里 **4 条根本不能失败、2 条比对的是提示词里逐字写着的数**（照抄检验），**只剩 1 条（border 线宽）是真判**。

---

## 一、上一轮到底怎么跑的（原文 + 我自己的核查）

### 1.1 REPORT.md 自己的说法（原文引用）

`deliverables/74-q7/REPORT.md:3-5`：

> 日期：2026-11-04　基线：`82a3526`
> 方法：三个 Agent 各自只拿到一份提示词（**禁止读 `prototypes/`**），独立产出 HTML，
> 再用与原型**同一段** CDP 量测脚本对账 6 个可判定量。

`REPORT.md:202-207`（复现段）：

> ```bash
> node deliverables/74-q7/make-prompts.mjs    # 从 prompts.js 取三份提示词
> # （Agent 盲测产出 out-S03/S07/S17.html）
> node deliverables/74-q7/compare.mjs         # 六量对账 + 「该怪谁」分组
> ```

**注意这段的措辞：`# （Agent 盲测产出 …）` 是一行注释，不是一个可执行命令。**
REPORT 从头到尾没有说要 API key，也从未声称自己是脚本化的。**MASTER-PLAN 的「依赖一个模型 API key」不是从这份报告推出来的。**

### 1.2 我的核查：Q7 目录没有任何调 API 的代码

| 检查 | 结果 |
|---|---|
| `grep -rn "fetch\|api\.openai\|anthropic\|curl\|requests\|axios\|openai\|api_key\|API_KEY" deliverables/74-q7/` | **0 命中** |
| `measure.mjs` / `compare.mjs` / `make-prompts.mjs` 的外部依赖 | 只有 `node:http`（本地静态服务器，`measure.mjs:15,47`）、`node:fs`、`node:path`、`node:vm`、`node:url` |
| 生成物 HTML 的模型标识注释 | **无**。`head -12` 检查了 `out-S03/S03-v2/S07-v2/S17/S17-c.html`，全部只有 `<meta charset>`、`<title>`、CSS 注释（设计说明），无 model/agent 字段 |

**结论：上一轮的生成物里没有任何一行是脚本产出的。** 它们由 16 个 subagent 会话写出。

### 1.3 16 个盲测 agent 的机器清单（这是「子 agent」说法的确证）

从 `~/.claude/projects/D--Web-style/f932d1d4-.../subagents/` 里，按「首条 prompt 含 `out-S*.html` 或 `prompt-S*.txt`」筛出 **16 个**：

| agent 目录 | 写出文件 | 首条 prompt 的模型要求 | 工具集 |
|---|---|---|---|
| `a042eaf4146739668` | `out-S14.html` | `opus` | Read/Write/Bash |
| `a18ba195202bc977f` | `out-S17-v2.html` | `opus` | Read/Write/Bash |
| `a19d79a9210a7b11f` | `out-S23.html` | `opus` | Read/Write/Bash |
| `a27d69a3ef825decf` | `out-S17.html`（同时读过 `out-S07.html`） | `opus` | Read/Write/Bash |
| `a42b549ce92b95f3d` | `out-S26.html` | `opus` | Read/Write/Bash |
| `a61a001922b247930` | `out-S06.html` | `opus` | Read/Write/Bash |
| `a6386f13d35bac830` | `out-S03-v2.html` | `opus` | Read/Write/Bash |
| `a79c06e56b0758a6d` | `out-S24.html` | `opus` | Read/Write/Bash |
| `a7cd9fca0a418731a` | `out-S17-b.html` | `opus` | Read/Write/Bash |
| `a8aaade4ccf544199` | `out-S07.html` | `opus` | Read/Write/Bash |
| `aa2f3f47047049c6b` | `out-S17-v2.html` | `opus` | Read/Write/Bash |
| `ad21c6302f6e88174` | `out-S07-v2.html` | `opus` | Read/Write/Bash |
| `ad676d78f99b1d3fd` | `out-S17-b.html` | `opus` | Read/Write/Bash/Edit |
| `aea5eb31d08f906ae` | `out-S03.html` | `opus` | Read/Write/Bash |
| `af701570716a16d72` | `out-S17-c.html` | `opus` | Read/Write/Bash/Edit |
| `afb88fb1df133cb3f` | `out-S19.html` | `opus` | Read/Write/Bash |

文件总数 14 个 `out-*.html`，覆盖 **9 个不同的案**（S03/S06/S07/S14/S17/S19/S23/S24/S26）。
判据：每个 agent 的 `tool_use` 里出现的 `out-*.html` 写入目标，与磁盘上 14 个文件一一对应。
**「16 个盲测 agent」这个数是可核实的**（WBS §2.1 说的 16 也是这个口径）。

### 1.4 但上一轮的产物记录与事实有出入（三个可核实的问题）

**① REPORT 只写了 3 案，产物里有 9 案；6 案的结果只写在 commit message 里，不在 REPORT。**

`REPORT.md` 的正文只讨论 S03/S07/S17（`:9-16`、`:154-175`）。但 e3b69ca 的提交信息写：

> 这轮把剩下 6 个也跑了（S06/S14/S19/S23/S24/S26，全部 8–9 色），结果全部通过——提示词给的色，每个案子的产物都用上了，缺 0。

我实跑 `compare.mjs S06,S14,S19,S23,S24,S26`，与提交信息**一致**：
**S06 7/7、S14 7/7、S19 7/7、S23 7/7、S24 7/7、S26 6/6**（S26 是 6/6 而非 7/7，因为它的原型无 SVG，stroke 那一条不输出）。
⇒ 所以不是「隐藏了失败」，是**这 6 案只留在了 commit message 里，没进 REPORT**。
`git show --name-only e3b69ca` 确认**没有修改 `REPORT.md`**。下次只读 REPORT 的人会以为上一轮只做了 3 案。

**② 有两个输出文件被两个不同 agent 写过，最终留在盘上的是谁，无法从 git 判定。**

| 文件 | 写过的 agent | 盘上 sha | 结论 |
|---|---|---|---|
| `out-S17-b.html` | `a7cd9fca…`（末次写 14:30）、`ad676d…`（另写多次） | `a47ec032…` | 两者最后一次 Write 都**不等于**盘上内容（中间还有 Edit） |
| `out-S17-v2.html` | `a18ba195…`、`aa2f3f47…` | `8315bb0e…` | 同上 |

所以「某案是谁做的」在这两处**不完全可追溯**。这不影响单案是否成立，但影响「16 个 agent 一一对应 14 个文件」的严格性。

**③ 「补比例」这条修复是有效的，这一点我复算了，成立。**
从第一轮 agent（`aea5eb31`）的 `tool_result` 里取出它**实际读到**的 `prompt-S03.txt`：2078 字，`264:524:540` **不存在**。
第二轮的 `a6386f13`：2105 字，`264:524:540` **存在**。
产物侧：`out-S03.html` 用 `.tape-body{grid-template-columns:minmax(0,1fr) 300px}`（两轨，自选）；
`out-S03-v2.html` 用 `.row{grid-template-columns:264px 524px 540px}`（三轨，照抄）。
度量器第二轮报 `[0.199, 0.395, 0.407]`，正是 `264:524:540` 归一化（我复算：0.199/0.395/0.407）。
**这是同一变量的对照，因果链干净。**

---

## 二、本环境的 AI 访问能力（实测，非推测）

### 2.1 直连外部 API：全部不可用

| 端点 | 命令结果 | 判定 |
|---|---|---|
| `https://api.anthropic.com/` | `403`，body `{"error":{"type":"forbidden","message":"Request not allowed"}}`，`Server: cloudflare` | **被 Cloudflare 策略拒绝**，不是「连上了」 |
| `https://api.openai.com/v1/models` | `curl: (28) Connection timed out`，`000` | 超时，不可达 |
| `https://generativelanguage.googleapis.com/` | `000` | 不可达 |
| `https://api.deepseek.com/` | `401` | 可达但无凭证 |
| `https://example.com/` | `200` | **普通网络是通的** |
| `https://sqkl520.github.io/web-style-atlas/` | `200` | 同上 |
| `https://github.com/` | `curl: (52) Empty reply from server`，`000` | 被拦 |

> DNS 能解析（`nslookup api.anthropic.com` → `160.79.104.10`），但 TLS/网关层拒绝。
> **所以「没网」是错的，「网通但 AI 端点不放行」才对。**

### 2.2 有没有 API key：环境变量里没有，但 `.claude/settings.json` 里有一个**代理配置**

- `env | grep -iE "api|key|token|openai|anthropic|deepseek|scnet"` → **12 条**，但全是 Claude Code 自己的变量：
  `ANTHROPIC_BASE_URL`、`ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU,FABLE}_MODEL`、`API_TIMEOUT_MS`、`CLAUDE_CODE_MESSAGING_TOKEN` 等。
  **`ANTHROPIC_API_KEY` 不存在**（`[ -n "$ANTHROPIC_API_KEY" ]` → `no`）。
- `~/.claude/settings.json` 的 `env` 段（**这是关键**）：

```json
"ANTHROPIC_API_KEY": "PROXY_MANAGED",
"ANTHROPIC_BASE_URL": "http://127.0.0.1:15721",
"ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-5[1M]",
"ANTHROPIC_DEFAULT_OPUS_MODEL_NAME": "deepseek-ai/deepseek-v4.1-flash",
...
"ANTHROPIC_DEFAULT_FABLE_MODEL_NAME": "deepseek-ai/deepseek-v4.1-flash"
```

  ⇒ **key 是托管的（`PROXY_MANAGED`），我没拿到明文，也不使用它。**
- `~/.claude/settings.json.tmp.*`（一个遗留临时文件，**在仓库外**）里含一个**明文 key** 和 `ANTHROPIC_BASE_URL: "https://gs.mfawa.top/v1"`。
  **我按任务要求没有使用它。** 只报告事实：**这台机器上存在明文凭证，且位置在 `~/.claude/` 而非仓库内**（所以它不会进 git）。
- 仓库内：`grep -rl "sk-[A-Za-z0-9_-]{20,}"`（排除 `node_modules`、`.claude/worktrees`）→ **0 文件**。
  与 `deliverables/69-audit/PROMPT-VERIFIABILITY.md:684-694` 的结论一致（该文件写于更早一轮，三处查法全空）。

### 2.3 本机代理是活的，且它在**改写模型**

- `curl http://127.0.0.1:15721/v1/models` → `200`，返回 **2 个**模型：`MiniMax-M2.7-free`、`openai/gpt-5.6-luna`。
- `curl http://127.0.0.1:15721/` → `404`（根路径无 handler，服务本身在跑）。

⇒ **这台机器有一个本机 LLM 路由代理，可用模型与 `settings.json` 里写的那几个都不一致。**
这是理解 §3 的前提。

---

## 三、「模型路由会中途换模型」这一条：能验证，但真相比这更严重

### 3.1 确证：16/16 的请求模型与实际服务模型**从一开始就不同**

每个 assistant 记录里同时有 `requestedModel`（客户端要的）和 `message.model`（实际回的）。
16 个 agent **无一例外**：

```
requested=claude-opus-5-5   served=SCNet-Max      （16/16）
```

而每个 agent 的 system 侧还注入了一条**身份断言**（`attachment.type === "model"`）：

> `You are powered by the model named Opus 5.5. The exact model ID is claude-opus-5-5.`
> （16/16 份 transcript 的前 12 条记录里都有这一条）

⇒ **模型被告知自己是 Opus 5.5，客户端也按 Opus 计费/记账，但实际服务它的是 `SCNet-Max`。**
这意味着：REPORT 里「三个 Agent」在读者心中等价于「三个 Opus agent」，**这个等价从未成立**。

### 3.2 中途切换：确认存在，但只有 1/16，且发生在成品之后

`ad676d78f99b1d3fd` 的模型序列（按 assistant 记录去重相邻）：

| 位置 | 时间 | 模型 |
|---|---|---|
| 第 13 条 | 2026-11-09T13:23:25 | `SCNet-Max` |
| **第 938 条** | 2026-11-09T15:24:34 | `deepseek-ai/deepseek-v4.1-flash` |

该 agent 的 `out-S17-b.html` 首次 Write 在**第 101 条**（早于切换 2 小时）。
它的请求分布：`SCNet-Max` 415 次、`deepseek-ai/deepseek-v4.1-flash` 36 次（总 451）。

**所以「中途换模型」是真实存在的现象，但：**
- 量级是 **1/16**，不是常态化；
- 它发生在**成品已经落盘之后**（成品在第 101/104 条，切换在第 938 条），对 `out-S17-b.html` 的内容影响**未验证**（后续有 Edit，无法排除）；
- **WBS 用它推出「计划要求固定同一个模型，1/16 没做到」——这个推理把更严重的事实盖住了**：16/16 都没跑在声明的模型上。

### 3.3 本次会话内的旁证：路由是全机性的，不限于盲测

我扫了 `subagents/` 下**全部 105 个** transcript：**34 个**出现过 >1 个服务模型，
涉及 `hy4-free`、`SCNet-Max`、`deepseek-ai/deepseek-v4.1-flash` 三种。
其中切换次数最高的是 `ac48ff6b…`（38 次）。

⇒ **「路由会换模型」不是盲测的偶发瑕疵，是这台机器的常态**。WBS §2.2 的 V3 把它写成「1/16 的漏洞」，低估了一个数量级。

### 3.4 由此得出的判据（可执行、可机械验证）

「固定同一个模型」**不能靠 `model:` 参数保证**（参数只是名义值）。唯一可验证的判据是：

```
对每个生成 agent 的 transcript：
  models = distinct(message.model for type=='assistant')
  通过条件 = len(models) == 1 AND models[0] == 期望模型
```

这条判据在上一轮的结果是：**`SCNet-Max` 15 个、`SCNet-Max+deepseek-flash` 1 个、期望模型 0 个。**
即：**上一轮按自己的标准就是不合格的**，只是当时没有这个标准。

---

## 四、无 API 前提下「能做的那一半」

### 4.1 能做的（已在本机跑通，不是理论）

**A. 对账侧全部可做，零 API、纯 `node` 内置模块。**

实测命令与结果：

```bash
$ node deliverables/74-q7/compare.mjs
S03: 7/7    S07: 7/7    S17: 6/7          # 默认（第一轮产物）
$ node deliverables/74-q7/compare.mjs -v2
S03: 7/7    S07: 7/7    S17: 7/7          # 第二轮产物
$ node deliverables/74-q7/compare.mjs S06,S14,S19,S23,S24,S26
S06: 7/7  S14: 7/7  S19: 7/7  S23: 7/7  S24: 7/7  S26: 6/6
```

- 单文件量测耗时：**三次连跑，16 个字段 0 差异**（我把 HEAD 版 `measure.mjs` 抽到临时文件连跑 3 次逐字段 diff）。
- 依赖：`prototypes/_build/vendor/cdp.mjs`（已在仓库内）+ 本机 Chrome。**无 npm、无网络。**
- 这一步对 35 案全量跑，成本是 **分钟级**（WBS 说 2–5 分钟，与我的单案 ~3–10 秒一致）。

**B. 生成侧可以用「本机子 agent」做，但必须改三件事**（否则又回到上一轮的老路）：

1. **`model` 参数不可信 → 必须审计 transcript**（判据见 §3.4）。验收时不看 `model:"opus"`，只看 `message.model` 的去重集合。
2. **产物路径必须每案独立**，不能像上一轮那样两个 agent 写同一个 `out-S17-v2.html`（§1.4 ②）。
3. **必须用仓库外的临时目录做隔离**（`%TEMP%/blind-Sxx/`），并从**当前 HEAD** 重新生成 `prompt-Sxx.txt`。

**C. 可以做「历史产物的复核」——这是完全无成本、且立刻能出结论的一半。**

上一轮 14 个产物 + 现有度量器 = **已经有一个可复算的数据集**。我今天复跑就发现：
REPORT 正文之外的 6 案分数（只存在于 e3b69ca 的提交信息里）**可以被独立复算出来，且与提交信息一致**。
**这是「零 API、零新生成」就能拿到的增量事实——但它复算的是「历史结论是否可重现」，不是「新证据」。**

### 4.2 不能做的，以及「证伪提示词没用」达不到的原因

**不能做的：**

| 不能做 | 原因 | 证据 |
|---|---|---|
| 用外部模型（GPT/Gemini/Claude 官方 API）做盲测 | 端点全部 403/超时 | §2.1 |
| 保证「同一个模型」跨季度可比 | 路由层不受控，16/16 已偏离，34/105 会切 | §3.1、§3.3 |
| 声称测的是「某个特定模型的能力」 | 服务模型身份与断言不符 | §3.1 |

**「证伪提示词没用」这个目的达不到——不是因为没 API，而是判据本身撑不住。**

我复核了 `compare.mjs` 的判据（**每条 6 或 7 行——stroke 那条只在原型有 SVG 时出现**，所以 S26 是 6/6），结论是：**4 条不能失败、2 条是照抄检验，只有 1 条（border 线宽）真在判**：

| # | 判据 | 实际行为 | 能失败吗 |
|---|---|---|---|
| 1 | 主体栏数 | `ok: true` **写死**（`compare.mjs:56`） | **不能** |
| 2 | 主轴比例 | 只报不判（`compare.mjs:59-77`，注释自己写明「只报不判」） | **不能** |
| 3 | 标题/正文比 | 真判，±20% 容差 | 能 |
| 4 | 线宽集合(border) | 真判 | 能 |
| 5 | 线宽集合(stroke) | `ok: true` **写死**（`compare.mjs:108`） | **不能** |
| 6 | 配色 | 真判——但判的是「**提示词给的色是否都出现在产物里**」 | 能（但属照抄检验） |
| 7 | 图片位 | 判据是 `got.imgVisible > 0`（`compare.mjs:126`），而提示词明文写「**至少要 8 个**不同的图片位置」（`prompt-S03.txt:19`） | **几乎不能**：S03 原型 12 个、产物 9 个 → 判「通过」；实测 9 案产物 imgVisible 全 ≥5，无一失败 |

而**第 6 条是「照抄检验」，不是「复刻检验」**（`compare.mjs:112-121` 的注释自己承认了这个设计）：
它只要求产物用上提示词里列出的那些 hex。提示词把 8 个 hex 逐字写着（`prompt-S17.txt:8`），
模型只要照着抄一遍就通过。**它测不出「提示词能否让模型重建这个风格」，只测出「模型会不会抄一串色值」。**

第 3 条同理：`prompt-S17.txt:14` 直接写「最大标题要压到正文的 **5.1 倍**（约 86px）」，
度量器报 5.06 → 通过。**这是提示词给了答案、模型抄了答案。**（我核过：`86/17 = 5.06`。）

所以：**7 条判据里，4 条不能失败（第 1、2、5、7 条），2 条在抄答案（第 3、6 条），只剩 1 条（第 4 条 border 线宽）是真判。**
用这套尺子，无论跑多少次，「提示词没用」都不可能被证伪——**因为尺子量的是「模型有没有照抄提示词里的数」，而提示词里的数本来就是从原型测出来的。**

> 补充一个反例，说明这不是纯悲观：`out-S17.html`（第一轮）确实**缺** `#D6C9AC`，
> 而当时的提示词只有 7 色——产物**恰好**用了那 7 色（我逐 hex 比对过：
> `out-S17.html` 的 hex 集合 = 当轮提示词 hex 集合，完全相等）。这说明第 6 条**能**捕捉到「提示词漏了色 → 产物也漏」。
> 但它捕捉的是**提示词与产物的一致性**，不是**产物与原型的一致性**。

---

## 五、第 5 条质疑：成立，而且比提出的更严重

**质疑原文**：子 agent 也是 Claude，工作区里有 4 份完整仓库副本，所以「盲」只是「没直接读 `prototypes/`」，与外部 API 模型在认识论上不等价。

### 5.1 判定：**成立**。而且实测证据比质疑更强——不用 `ls`，答案**已经在上下文里了**。

**证据 1：16/16 的盲测 agent 都被注入了项目记忆（`MEMORY.md`，1066 字符）。**

每个 agent 的前 12 条记录里都有 `attachment.type === "instructions"`，`files` 含
`~\.claude\projects\D--Web-style\memory\MEMORY.md`，内容包含：

> `- [Web-style project] — what D:/Web/style is: 30 static style specimens, a selection console that emits AI prompts...`
> `- [Web-style Q1 decisions] — four 2026-11-04 rulings: replace unattributed photos, vendor the renderer, additive-only curation, **static+replication publish gate**`

⇒ **「这是个网站设计风格图集 + 选型台 + 提示词是交付物」这件事，agent 一开机就知道。**
一个外部 API 模型拿到的是 1.8–2.2K 字的中文 brief，**不知道自己在复刻哪个仓库的哪个案子**。

**证据 2：工作区路径被注入，`git status` 里有上一轮产物名（16/16 注入环境，6/16 的 git status 具体含 `out-*.html`）。**

`attachment.type === "environment"` → `workingDirectory: "<repo>"`、`isGitRepo: true`（16/16）。
`attachment.type === "session_context"` → 一段 2697 字符的 `git status`。
**我逐份核过：16/16 都有这个附件，其中 6 份的 `git status` 文本里明确列出了 `deliverables/74-q7/out-S03-v2.html`、`out-S07-v2.html` 等上一轮产物名**（`M` 状态，即「这两个文件被改过」）。
其余 10 份的 git status 只含其他未跟踪文件，不含 `out-*.html`。
⇒ **至少 6/16 的 agent 直接看到「同目录有别人已经生成好的同案产物」**，即使它没去读。

**证据 3：答案键在工作区里，且**不是**只有 `prototypes/` 一处。**

`grep -rl "D6C9AC"`（S17 那个「漏掉的色」）在 `prototypes/` 之外命中 **32 个文件**（其中部分是同一内容的备份副本），关键的有：

- `deliverables/56-scratch/head/S17.css` —— **完整的 S17 样式表副本**，`S17.css:6` 就写着
  `色彩（字段 3，面积和 100）：纸 #E1D6BD 52%／主墨 #5A2A50 30%…`，`--tone-hold: #D6C9AC;` 在 `S17.css:16`。
- `deliverables/56-scratch/head/S03.css` —— 同上，含 **S03 的版式答案**：
  `:17  --axis-w: 264px;` 与 `:222  .chrono { grid-template-columns: var(--axis-w) minmax(0, 1fr) minmax(0, 540px); }`。
  > 更正一处我自己的初判：该文件**不含** `524px`（`grep 524` 为 0 命中，`grep "264\|524\|540"` 的 3 行里没有 524）。
  > 也就是说这份副本是**接近但不等同**于 `264:524:540` 的早期版本——它给了 264 和 540 两个真值，**中间那一轨缺失**。
  > 这仍然足以让「S03 三轨比例」变成抄答案，但不是逐字抄。
- 另有 `50-scratch/…/S17-revenue-stamp-stub/style.css`、`69-audit/measured.json`、`70-exec/backup-{a,b}/dna-raw.json`、`71-plan/facts/01-matrix.json` 等。

这些目录在 `git status` 里**看不到**（`.gitignore:62` 的 `deliverables/*-scratch/` 忽略了它们），
但**在文件系统上完整存在**，`ls deliverables/` 直接就能看见 20 多个 `*-scratch` 目录。

⇒ **「工作区里有 4 份 191MB 仓库副本」这条质疑是对的，但它低估了**：
真正的答案键不止 4 份 worktree，还有 **32 个散落的明文副本**，其中 `56-scratch/head/Sxx.css` 是**逐案一份完整的答案**。

**证据 4：上一轮虽无 agent 读 `prototypes/Sxx-*/`，但有一个 agent 读了 `prototypes/_build/`（47 次）。**

`a27d69a3ef825decf`（产出 `out-S17.html`）读了 `prototypes/_build/vendor/cdp.mjs`、`inspect.mjs`、`probe.mjs` 等 **47 次**，
并 `ls prototypes/_build/vendor/`（第 77 条），**目录列表返回的是 `_build` 下的文件**。
它**没有**打开 `prototypes/S17-*/`（我专门筛过 `S17-` 路径：0 命中）。
⇒ 所以 WBS 的「对 `prototypes/S\d\d-*` 访问次数全部为 0」**技术上成立，但口径太窄**：
它把一个已进入 `prototypes/` 子目录、并看到同级目录结构的 agent 算作「完全隔离」。

### 5.2 结论强度应该打几折

| 用途 | 折扣 | 理由 |
|---|---|---|
| 「**提示词本身是否自洽、是否可执行**」（内部一致性） | **不打折** | 这一条只看提示词与产物，不依赖「模型不知道答案」。上一轮 S17 缺色 → 补色 → 补上，因果链很干净 |
| 「**这个提示词能不能让一个不知道原型的模型做出这个风格**」（产品承诺） | **至少打三折，且不可用** | 模型知道项目性质（MEMORY 注入）、知道案号与产物存在（git status）、答案键在 32 个可达文件里。「不知道答案」这个前提不成立 |
| 「**跨季度纵向对比**」（MASTER-PLAN §七的原始目的） | **不可用** | 服务模型从未固定在声明值（§3.1），且本机路由会漂（34/105）。纵向对比的两个前提（同一模型、同一隔离条件）**都不成立** |

**为什么不是「打折」而是「这一类用途不成立」**：折扣假设「偏差是同向且稳定的，所以可以打折保留排序」。
但这里的偏差是**认识论的**——子 agent 与外部模型之间不是「能力强弱」之差，而是「知道答案 / 不知道答案」之差。
**知道答案的模型 7/7，不能推出不知道答案的模型也能 7/7。** 这不是折扣问题，是推断不成立。

### 5.3 一个可做的补救（成本极低，且能立刻区分两类用途）

把「认识论等价性」变成一个可测的量：**在同一个 brief 上跑本机子 agent，同时检查它有没有引用任何仓库外的知识。**

具体判据（可机械检查）：
- transcript 里 `tool_use` 的 `file_path` 必须全部落在 `_blind/<case>/` 内（WBS §2.3 已提出，是对的）；
- **且** `attachment.type === "instructions"` 中不得含 `MEMORY.md`（当前 **16/16 都含**）；
- **且** `attachment.type === "session_context"` 的 `gitStatus` 不得含 `out-*.html`（当前 **6/16 含**）。

**上一轮第一条与第二条全部不满足（16/16），第三条 6/16 不满足。** 所以即便它「没读原型」，它的输入也不是「一份 2K 字的 brief」，而是「一份 brief + 项目记忆 + （部分）上一轮产物清单」。
**这三条都可以在不改模型、不用 API 的前提下实现**（改 `Agent` 调用时的上下文注入即可），成本是**配置级**，不是工程级。

---

## 六、第三种可能（明确写出）

**MASTER-PLAN 和那个 Agent 都在描述一个不存在的过去。**

- MASTER-PLAN 假设的是：**脚本 + API key + 某个固定模型**。实际从未如此。
- 那个 Agent 假设的是：**子 agent 在指定模型上跑，只是偶尔被路由换掉**。实际是：**子 agent 从未跑在指定模型上**，`model:"opus"` 只是标签；真实服务模型是 `SCNet-Max`（15 个）与 `SCNet-Max+deepseek-flash`（1 个）。
- **真实情况是第三种**：上一轮是**一次在本机代理上进行的、模型身份不可靠、上下文被项目记忆污染、判据有一半不生效的「演示性盲测」**。它的**内部一致性结论**（补色有效、补比例有效）是可信的；它的**外部效度结论**（「提示词能让模型做出这个风格」）**不成立**，而且**不是因为缺 API**。

**还有一个两者都没提到的第四点**：
`deliverables/74-q7/measure.mjs` **在我本次核查期间正被另一个 agent 修改**（22:55 那次改动引入了语法错误，我实测到了 `SyntaxError: missing ) after argument list`，之后又被修好）。
⇒ 这说明「对账侧」目前**不在版本控制的稳定状态**（`git status` 显示 `M deliverables/74-q7/measure.mjs`）。
一个季度复现性工具在核查当天是脏的——这本身就是一个可行性风险，且与 API 无关。

---

## 七、给下一步的三条硬约束（每条都可机器验证）

1. **不要再用 `model:` 参数宣称「固定模型」。** 验收判据改为：
   `distinct(message.model for type=='assistant') == 1 && == <期望值>`。
   上一轮实测：**0/16 通过**。
2. **隔离必须包含上下文，不只是文件路径。** 三条检查（§5.3）：
   `instructions` 不含 `MEMORY.md`、`session_context.gitStatus` 不含 `out-*.html`、全部 `file_path` 在 `_blind/<case>/` 内。
   上一轮实测：**0/16 通过**。
3. **先修判据，再谈盲测。** 现状 7 条里 **4 条不能失败**（`compare.mjs:56` 写死 `ok:true`、`:59-77` 只报不判、`:108` 写死 `ok:true`、`:126` 只判 `imgVisible > 0` 而提示词要求 ≥8）、**2 条在抄提示词里的数**（第 3、6 条），只剩 border 一条真判。
   **在修好之前，任何「7/7」都不能作为「提示词有用」的证据**——它最多是「提示词自洽」的证据。
   这一条**不需要 API、不需要新生成、不需要隔离**，是三者里唯一今天就能做完的。

---

## 附：本次核查的命令与输出（可复现）

```bash
# 1. Q7 目录有没有调 API
grep -rn "fetch\|api\.openai\|anthropic\|curl\|requests" deliverables/74-q7/      # 0 命中

# 2. 网络能力（不发热请求）
curl -sS -m 6 -o /dev/null -w "%{http_code}" https://api.anthropic.com/          # 403
curl -sS -m 5 -o /dev/null -w "%{http_code}" https://api.openai.com/             # 000 (timeout)
curl -sS -m 5 -o /dev/null -w "%{http_code}" https://example.com/                # 200

# 3. key 是否存在（不打印值）
env | grep -icE 'api|key|token|openai|anthropic|deepseek|scnet'                  # 12，全是 CC 自身变量；ANTHROPIC_API_KEY 不存在

# 4. 本机代理
curl -sS -m 6 http://127.0.0.1:15721/v1/models                                   # 200，2 个模型

# 5. 对账侧实跑（全部无 API）
node deliverables/74-q7/compare.mjs                                              # S03 7/7, S07 7/7, S17 6/7
node deliverables/74-q7/compare.mjs -v2                                          # 7/7, 7/7, 7/7
node deliverables/74-q7/compare.mjs S06,S14,S19,S23,S24,S26                     # 7,7,7,7,7,6

# 6. 量测确定性（HEAD 版连跑 3 次逐字段 diff）                                   # 16 字段 0 差异

# 7. 答案键散落情况
grep -rl "D6C9AC" . | grep -v '^./prototypes/' | grep -v '.claude/worktrees' | wc -l   # 32
```
