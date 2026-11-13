# 这些是什么

13 个沙箱盲测的产物副本（+ 2 份历史版本），共 456 KB。

## 为什么要入库

原本它们只是对账时的临时落地（`measure()` 的静态服务器以仓库根为根，
路径越出仓库会被拒绝，所以对账脚本要先把产物复制进来）。

2026-11-13 系统把整个 `C:\tmp` 清掉了，十案产物一次全丢 —— 而 `_staged/` 里的副本还在，
证据因此没丢。所以这两个目录不再 gitignore：**不能把唯一的证据只放在 tmp 里。**

## 重要：这些产物证明不了任何事

它们是在一个**传参 bug** 下生成的：

`Start-Process -ArgumentList` 传数组时，PowerShell 用空格把元素拼成命令行串、
不给含空格的元素加引号。于是任务指令里每个空格都成了参数边界，
`claude` 只收到第一个词 `Read`，其余全丢。

**模型从未收到任务书。** 它通过 `Read` 工具读了 `task.txt` 拿到了要求 ——
所以产物本身是完整、可读、闭合 `</html>` 的，但**不是「按提示词做出来的」**，
而是「自己读了文件之后发挥的」。

详细证据见 `../29-prompt-truncation-bug.md`：
- 会话记录 `lastPrompt: "Read"`
- 模型首个 thinking 原话：`The user just said "Read". That's a minimal message.`
- 修复后实测首条 content 是完整句子

## 所以它们的用途是

- ❌ 不能用来说明「提示词有效」
- ✅ 可以用来检查**度量器**的行为（`measure.mjs` 在这些真实页面上量出什么）
- ✅ 可以用来复现「传参 bug 的后果」
- ✅ 作为「这一轮盲测作废」的物证

## 文件命名

- `<案号>-sandbox.html` —— 该案当时的产物
- `<案号>-oldverify.html` —— 更早一次运行的产物
- `<案号>-v<字节数>.html` —— 报告里引用过、但后来被重跑覆盖的版本
  （比如 `S13-v25730.html` 恰好 25730 字节，对应报告里那个数字）

## 复算

```bash
node deliverables/78-northstar/_probe/_batch-compare.mjs S31 S04 S08
```

它会优先读 `C:\tmp\bb\<案号>\out.html`，没有就回落到这里的副本。
