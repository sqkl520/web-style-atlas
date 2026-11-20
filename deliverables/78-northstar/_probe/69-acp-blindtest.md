# 69 · DSH ACP 盲测：链路打通 + 首个结果

日期：2026-11-05
目的：验证「提示词到底是不是有效交付物」——前面所有工作都是间接证据。

---

## 1. 结论先说

**链路打通了，而且跑了第一个案。**

S34（石墨零图索引）的盲测成绩：

```
  ① 配色   6/6 个 hex 出现
     底色   #2C3034 → ✓ 用在 background 上
  ② 字体   4/4（Jost, Noto Sans SC, Noto Serif SC, Literata）
  ③ 圆角   规则「全站一律 0」；声明 0 条，违反 0 条
     线宽   允许 1px；实际用了 4 处，全在允许级内
     字号比 想要 6.4×；实测 4.67×（12–56px）
  ④ 结构   想要 7 条；最接近 article=7 ✓
  ⑤ 禁项   无违反
```

**唯一没达标的是字号比**（4.67× vs 6.4×），而这一项恰好是提示词自己写的
「这是本案最容易被做塌的一处」。提示词预警了，模型还是做塌了 ——
这是一条真发现，不是脚手架问题。

---

## 2. 怎么跑起来的（可复现）

DSH 装在 `/d/dsh`，是 Electron 应用。ACP 是官方给自动化用的 profile
（`"automation-only JSON-RPC stdio"`），但**默认没装依赖**。

### 2.1 装 ACP profile

```bash
N=~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe
PNPM=~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.cjs
cd ~/.dsh/profiles/acp
"$N" "$PNPM" add @deepseek-ai/dsh@0.2.1-rc.2 @deepseek-ai/dsh-base@0.2.1-rc.2 \
  @deepseek-ai/dsh-acp-app@0.2.1-rc.2 --ignore-scripts
```

版本必须与 desktop 内置的一致（`desktop-runtime.json` 里写着 `0.2.1-rc.2`）。
用 `next` tag（0.2.2-rc.5）会和 peer 依赖打架。

**pnpm 的 `nodeLinker: hoisted` 不会自动铺平 peer deps**，要手工补三轮：

第一轮 13 个：`dsh-anonymous-user-id` `dsh-attachment` `dsh-compaction`
`dsh-deepseek-account` `dsh-fs` `dsh-llm-deepseek` `dsh-output-retention`
`dsh-ptc-runtime` `dsh-sandbox` `dsh-scope` `dsh-shell` `dsh-spill` `dsh-workflow`

第二轮 5 个：`dsh-jobs` `dsh-session-persistence` `dsh-session-query`
`dsh-session-telemetry` `dsh-util-time`

另外 `@deepseek-ai/cordis-plugin-group@1.0.5` 用 `pnpm add` 会触发全量重解析、
拉平台无关的大包（libreoffice/sherpa 的其它架构版本），网络很慢。
直接下 tarball 解压更快：

```bash
curl -sO https://registry.npmjs.org/@deepseek-ai/cordis-plugin-group/-/cordis-plugin-group-1.0.5.tgz
tar -xzf cordis-plugin-group-1.0.5.tgz
cp -r package ~/.dsh/profiles/acp/node_modules/@deepseek-ai/cordis-plugin-group
```

装完之后 `dsh --profile acp --help` 应该打出：
> Serve automation clients over Agent Client Protocol stdio.

### 2.2 换模型（关键）

bundle 层把模型钉在 `provider: deepseek-official / model: deepseek-v4-flash`，
**那个 provider 余额不足**，实测报：

```
Internal error: turn failed: Insufficient Balance (request_id: ...)
```

所以要用 `--patch` 叠加一份模型覆盖（**不改 profile 本体** ——
这个替换只对盲测成立，不该写进日常配置）：

`acp-blindtest.patch.yml` 做了三件事：
1. 把 acp 的 provider/model 换成 `blindtest-proxy`；
2. 注册那个 provider 走 `openai-completions` 协议；
3. 关掉 `session-title-llm`（每次会话额外调一次模型，盲测不需要）。

**协议必须选 `openai-completions` 而不是 `anthropic-messages`**：
本机代理的 `/v1/messages` 固定路由到一个 2026-11-16 下线的模型，
任何 model 参数都返回 HTTP 410；而 `/v1/chat/completions` 是通的。

### 2.3 跑

```bash
node deliverables/78-northstar/_blindtest/acp-run.mjs S34
node deliverables/78-northstar/_blindtest/score.mjs S34
```

---

## 3. ACP 协议细节（踩过的坑）

**newline-delimited JSON-RPC 2.0 over stdio。**

```
→ initialize     {protocolVersion:1, clientCapabilities:{fs:{...}}}
← {agentInfo:{name:"deepseek-harness-acp"}, agentCapabilities:{...}}
→ session/new    {cwd:"<绝对路径>", mcpServers:[]}
← {sessionId, configOptions:[...]}
→ session/prompt {sessionId, prompt:[{type:"text", text:"..."}]}
← session/update 通知 × N（agent_message_chunk / tool_call / usage_update）
← result {stopReason:"end_turn"}
```

**坑 1：`session/new` 的 `cwd` 必须存在。**
不存在时报 `Internal error: turn failed: working-directory: directory does not exist`，
而这个错误在 `session/new` 的 result 里不在 error 里 —— 第一次看会以为是别的问题。

**坑 2：agent 不一定把 HTML 写进文件。**
实测它直接把代码吐在 `agent_message_chunk` 里。所以 runner 两种都要接住：
文件走 agent 自己的 fs 工具，消息里的 HTML 由 runner 提取落盘
（优先 ```html 围栏；没有围栏就找 `<!DOCTYPE html` 到 `</html>`）。

**坑 3：agent 会先 `glob` 探索目录。**
空目录里 glob 之后有时会卡住不继续。这不是确定性行为（S34 第一次成功那次
就没 glob），但出现频率不低。目前的对策只是给足超时。

---

## 4. 评分器的判据，以及它的自我限制

`score.mjs` 量五类，每类都要求「能从提示词里逐字取出、能在 HTML 里精确查证」：

| 类 | 判据 | 可信度 |
|---|---|---|
| ① 配色 | 提示词里的每个 hex 在 HTML 里出现没有；底色赋值句对不对 | **高** —— hex 是精确串 |
| ② 字体 | 字体链里的族名在 `font-family` 里出现没有 | 中 —— 只查"出现过"，不查优先级 |
| ③ 几何 | 圆角/线宽/字号比三项，各自从 CSS 量 | **高** —— 都是数值 |
| ④ 结构 | 提示词说的条目数 vs HTML 里重复元素数 | **低** —— 启发式，只能报数不能下结论 |
| ⑤ 禁项 | 提示词明令禁止的（阴影/渐变）在 CSS 里出现没有 | 中 —— 只看声明，不看实际渲染效果 |

**不做总分。** 五类可信度差太多，合成一个数字会让不可信的那类污染可信的那类，
而人看到"78 分"就不会再看分项。所以只报分项 + 每项的实测数。

**已知的判据缺陷（写在这里，免得下一个人以为是满分）**：
- ③ 的圆角只看 `border-radius` 声明值，不追 `var()` 展开。要追展开得写一个
  小 CSS 求值器，那会引入它自己的 bug。S34 没用 var 定义圆角所以不受影响，
  换一个案可能误判。
- ④ 的"条目数"靠数字对重复元素数，是启发式。S34 命中（article=7）可能只是巧合。

---

## 5. 卡在哪：上游模型服务

跑完 S34 之后，本机代理 `127.0.0.1:15721` 开始返回 **HTTP 504 Gateway Timeout**
（端口在监听，但 30 秒无有效响应，上游不可用）。所以 S01 / S13 / S19 三个案
都跑不完。

**这不是脚手架的问题**：同一条链路在 S34 上是通的，证据是它产出了 371 行 HTML
且配色 6/6 全中。是外部依赖在跑完之后挂掉了。

恢复之后直接：

```bash
for id in S01 S13 S19; do
  node deliverables/78-northstar/_blindtest/acp-run.mjs $id --timeout 400000
done
node deliverables/78-northstar/_blindtest/score.mjs --all
```

---

## 6. 这一轮验证了什么

**「页面底色用 X」那句是有效的。** 生成结果里 `--paper: #2C3034` 同时铺在
`html` 和 `body` 上，而 `#2C3034` 在 `dna.palette` 里是第一个 —— 也就是说
如果没有那句赋值，模型很可能把它当强调色而不是底色。这是上一轮那次改动的
**直接证据**，不是推理。

**防退化那 8 条也被遵守了**：圆角 0 条声明、线宽全在允许级内、禁项无违反。

**「最容易被做塌的一处」真的会塌**：字号比 4.67× vs 期望 6.4×。提示词已经
用加粗写了「最大那一档必须够大」，模型还是没做到。这说明：
- 这类"比例"要求，光写文字不够，得给具体像素值（提示词里其实给了
  「约 56px」之类的推导值，但模型没用上）；
- 或者判据本身该改成"给一个下限阈值"，而不是"压到 N 倍"。
