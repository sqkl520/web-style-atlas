[English](CONTRIBUTING-EN.md) | 简体中文

# 参与贡献

## 这个项目接受什么样的改动

**风格方案本身**（`prototypes/S01…S35/` 的 `style.css` / `index.html`）不收——
每一个案都是逐案实测过的，改动它会让 20 多条闸门的基准全部失效。

可以提 PR 的方向：

- 修**工具链**（`prototypes/_build/`）的缺陷
- 修**选型台 / 向导**（`prototypes/_selection/`）的缺陷或可访问性问题
- 修**文档**与代码不一致的地方
- 修**自托管字体**的子集或加载问题

如果你想要一个新的风格方案，请先开 issue 讨论——新增一个案要同时满足
`_CONTRACT.md` 的约束、`check-distribution.mjs` 的分布要求，并通过全部闸门，
不是加一个目录就能完成的。

## 环境要求

- **Node 18+**
- 不需要 `npm install` —— 全仓库零依赖，只用 `node:` 内置模块
- 部分截图脚本需要系统中装有 Chrome / Edge（用 CDP，不引入 Playwright）

## 跑闸门

改动前后都应该跑这一条。它是全量自检，包含 17 个步骤：

```bash
node prototypes/_build/quarter.mjs
```

只看其中某一项时：

```bash
node prototypes/_build/check-docs.mjs      # README 与 data.js 的数字/编号是否一致
node prototypes/_build/check-prompts.mjs   # 提示词里的配色/字号是否与 style.css 对得上
node prototypes/_build/check-anchors.mjs   # 站内锚点是否有对应 id
node prototypes/_build/check-stale.mjs     # 渲染产物是否比源文件旧
```

**闸门红了不要绕过。** 每一道闸门都有一条 `--selftest`，它会故意改坏一处再跑一遍自己，
证明判据真的会响。看到红灯时先跑 `--selftest` 确认判据本身没坏：

```bash
node prototypes/_build/check-docs.mjs --selftest
node prototypes/_build/check-prompts.mjs --selftest
```

### 改了源文件之后

改了 `style.css` / `index.html` / 数据文件之后，必须重新渲染对应案的闸门报告，
否则 `check-stale` 会红（它检查源文件是否比 `.inspect/report.json` 新）：

```bash
node prototypes/_build/render-scheme.mjs S19            # 单个案
node prototypes/_build/render-scheme.mjs _selection     # 选型台
```

改了 `data.js` 的来源数据之后，还要重跑生成链：

```bash
node prototypes/_build/collect-schemes.mjs    # 重新生成选型台的 data.js
node prototypes/_prompts/build-prompts.mjs    # 重新生成 prompts.js
```

## 提 PR

1. 从 `main` 拉分支，分支名用 `fix/xxx` 或 `docs/xxx`
2. 只改你这一次要改的东西——不要把无关的格式化、重排混进同一个 PR
3. **同一次提交里更新对应文档**。改了行为就改 README，不要"代码先合、文档后面补"
4. 提交前确认 `node prototypes/_build/quarter.mjs` 全绿
5. commit message 用 `type(scope): 描述`，写**为什么改**而不只是改了什么

```
fix(build): check-stale 漏扫 _specs，改了规格不重渲也能绿
docs: 选型台的芯片角标说明补上直连/近似两档
```

## 关于截图和图片

仓库里带真实照片（`assets/`）。**不要新增来路不明的图片**——
版权与肖像问题在这个仓库是硬约束，见 `prototypes/_CONTRACT.md` §10。
需要新图时先开 issue 说明来路。

## 语言

面向公众的文档都是中英双语，缺一边会出现「点进去回不来」的单向链接：

| 中文 | 英文 |
| --- | --- |
| `README.md` | `README-EN.md` |
| `CONTRIBUTING.md` | `CONTRIBUTING-EN.md` |

新增文档时两边都要写，且首行加语言互链。

> 本仓库没有 `SECURITY.md`：它是纯静态站点，没有后端、没有账号、没有用户输入，
> 只发布静态文件。有安全问题请直接开 issue 说明。
