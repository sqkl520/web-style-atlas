# ACP 盲测

把选型台生成的提示词原样交给 DSH 的 ACP agent，让它建页面，再量保真度。

## 前置

`~/.dsh/profiles/acp` 必须装好依赖（见 `../_probe/69-acp-blindtest.md` §2.1）。
验证：`dsh --profile acp --help` 打出 "Serve automation clients over Agent
Client Protocol stdio."

## 跑

```bash
node acp-run.mjs <Sxx> [-out DIR] [--timeout MS]
node score.mjs <Sxx>          # 单案
node score.mjs --all          # 所有跑过的
```

产物落在 `<Sxx>/`：`index.html`（生成的页面）、`_prompt.txt`（发出去的提示词，
现场从 prompt-copy.js 取，不另存副本）、`_acp-events.json`（完整 JSON-RPC 轨迹）。

## 模型

`acp-blindtest.patch.yml` 把模型从默认的 `deepseek-official`（余额不足）
换到本机代理。用 `--patch` 叠加，不改 profile 本体。

代理当前走 `openai-completions` 协议（`/v1/chat/completions`）；
它的 `/v1/messages` 已不可用（固定路由到一个 2026-11-16 下线的模型，恒返回 410）。

## 已知不稳定

agent 有时会先 `glob` 探索空目录然后卡住不继续。不是确定性行为，
但出现频率不低。对策目前只是给足超时（默认 10 分钟）。
