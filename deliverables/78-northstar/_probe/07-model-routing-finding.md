# 模型路由发现：本机所有「Claude 模型名」都被映射到别的模型

> 2026-11-11　由「无 API 可行性」Agent 发现，主线程独立复核

## 事实

`~\.claude\settings.json` 的 `env` 段：

```
ANTHROPIC_API_KEY                = PROXY_MANAGED
ANTHROPIC_BASE_URL               = http://127.0.0.1:15721
ANTHROPIC_DEFAULT_OPUS_MODEL     = claude-opus-5[1M]
ANTHROPIC_DEFAULT_OPUS_MODEL_NAME   = deepseek-ai/deepseek-v4.1-flash
ANTHROPIC_DEFAULT_SONNET_MODEL_NAME = deepseek-ai/deepseek-v4.1-flash
ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME  = deepseek-ai/deepseek-v4.1-flash
ANTHROPIC_DEFAULT_FABLE_MODEL_NAME  = deepseek-ai/deepseek-v4.1-flash
CLAUDE_CODE_EFFORT_LEVEL         = max
```

`~\.claude\config.json` 里 `primaryApiKey: "any"`，
`customApiKeyResponses.approved` 含 `PROXY_MANAGED`。

## 实测：实际跑的是谁

### 子 agent transcript（105 个文件，本会话目录下）

| model 值 | 文件数 |
|---|---|
| `SCNet-Max` | 97 |
| `hy4-free` | 36 |
| `deepseek-ai/deepseek-v4.1-flash` | 6 |

**没有一个是 Claude。**（同一文件内可能有多个值，所以列合计 > 105。）

### 本会话主 transcript

最近 400 条里出现的 `model` 值：**`SCNet-Max`**。

## 这意味着什么

### 1. `Agent` 工具的 `model` 参数是名义的

我这一整轮都在写 `model: "opus"`。那个参数**没有生效** —— 它只是让路由层知道
"用户希望这是 opus 档"，而路由层把它映射成了 `SCNet-Max` 或 `deepseek-v4.1-flash`。

我在多处注意解里写过「派了 opus agent」「用 opus 做规划」——**那些说法是错的**。
不是在撒谎，是我信了一个没验证过的假设。

### 2. 这直接影响「北极星审计」的可行性判断

`00-WBS.md` 说「真正的障碍是模型路由会中途换模型（16 个里 1 个从 SCNet-Max 切到
deepseek-v4.1-flash）」。

实际是**更糟的情况**：不是"偶尔漂移"，是**从来没有一个 agent 跑在被声明的模型上**。
所以「固定同一个模型做纵向对比」这条方法论前提，在这个环境下**从未成立过**。

具体到盲测验货：如果同一轮 16 份产物来自两个不同模型家族，那它们之间的差异
既可能来自提示词，也可能来自模型 —— **无法归因**。

### 3. 对「我这个助手是谁」的影响

本会话的 `model` 字段是 `SCNet-Max`。这不是 Claude 的模型名。

我不打算对此做判断——这是你的机器、你的代理配置，你可能完全知道这件事并且在用它。
但**你应该知道我知道这件事**，因为：

- 我此前所有的「这条结论来自 opus 的独立复核」都是**无效论证**（同模型不同实例不算独立）；
- 反过来说，我那些**靠实测数字而不是靠"哪个模型说的"成立的结论仍然成立** ——
  比如 S01 在 `measure.mjs` 上选错元素、`structure` 只有 5/35、23 个结构标签、
  重渲染只改 `at`。这些是数据，不是观点。
- 而所有**依赖"判断力"的结论**（抽样是否代表、判读纪律是否成立、方案是否可行）
  都应该降级看待。

## 我没有做的事

- **没有修改** `settings.json` / `config.json` / 任何环境变量。那是你的账号配置。
- **没有**用那个 `ANTHROPIC_API_KEY` 发任何请求。
- 没有因此中断工作 —— 因为大部分产出是实测数据与代码，不依赖"谁在想"。

## 需要你决定

1. 这是**预期的配置**吗？如果是（比如你故意用本地代理省钱/提速），那我继续按现状工作，
   但会在所有报告里不再声称"opus 复核"。
2. 如果不是预期的（比如你以为在用 Claude），那**在修正之前**，
   `00-WBS.md` 里所有"多 agent 交叉验证"的结论强度都要重新评估。
3. **北极星审计要不要继续**：它的核心是「盲测复刻」，而盲测的前提是
   「固定一个已知能力的模型」。在当前路由下这个前提不成立。
   替代方案是用**不依赖模型判断**的那一半：只做对账侧（35 案全测 2–5 分钟，
   已实测可行），不做生成侧。
