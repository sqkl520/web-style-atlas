# 当前进度与恢复指引

> 2026-11-13　主线程
> 这份文件写给「几小时后回来」或「换一个会话接手」的人。
> **不要从头读所有报告**，从这份开始。

---

## 零、一句话结论

**三轮盲测做完了：这份提示词靠的是数值，不是文字描述。**

```
S31  有数值              → 399 行，六值精确命中      30 分钟
S99  不存在的风格 + 数值   → 459 行，9 值精确命中
S98  有文字、无数值        → 零产物                  2 小时，44788 thinking token
```

对产品是好消息（本来就给施工图），但「只说风格不给数字」的简短版本不可行。

---

## 一、现在没有东西在跑

批量十案全部跑完，两个负对照也跑完。所有沙箱任务已清理、Deny 已撤、
`quarter.mjs` 17 步全过、工作区干净。

---

## 二、产出在哪

| 文件 | 内容 |
|---|---|
| `06-BLIND-RESULT.md` | **主报告**。三轮实验结论 + 十案对账表 + 隔离方式 |
| `07-NEGATIVE-B.md` | 负对照 B（S98）的完整记录 |
| `_probe/16-negative-control.md` | 负对照 A（S99）的完整记录 |
| `_probe/12-main-thread-measure-findings.md` | 度量层的全部实测发现（16 节） |
| `_probe/15-real-isolation.md` | 真隔离的实现与踩过的坑 |
| `_probe/11-sampling-recompute.md` | 11 案抽样的推导 |
| `_probe/09-compare-fix.md` | 判据修复 + 26 条变异测试 |

产物在 `C:\tmp\bb\<案号>\out.html`（或 `index.html`）。

---

## 三、要复算的话

```bash
# 十案对账（读 C:\tmp\bb 下的产物）
node deliverables/78-northstar/_probe/_batch-compare.mjs

# 单案状态
node deliverables/78-northstar/_probe/_stream-stats.mjs S31 S08 S98

# 负对照 B 判定
node deliverables/78-northstar/_probe/_judge-S98.mjs

# 季度体检
node prototypes/_build/quarter.mjs --dry-run
```

---

## 四、还没做的（按价值排序）

| 项 | 为什么值得做 |
|---|---|
| **正对照** | 用「通用漂亮页面」的描述（无机制句、无数值）跑一次，定量「通用页面」的基线高度。用来校准 S98 零产物的分量 |
| `probe.mjs` 画廊判据 | 已定位 13/35 案选错主容器，但未改。需全库重渲染验证 |
| 图片数「多了算不算」 | 现判据只判下限 |
| 栏数判据 | 只报不判。机制句谈的未必是版心（`12-...md` §12 的 S04 实例） |

---

## 五、为什么批量不能并行（重要基础设施约束）

Deny ACE 是**按账户**生效的：

```
icacls D:\Web\style /deny ClaudeBlindBox:(OI)(CI)(RX)
```

不是按进程。两个沙箱同时跑时，任何一方执行「撤掉 deny」都会让另一方**静默失去隔离**，
而且两边的产物都不可信、且不会报错。

要真并行必须给每案一个独立账户。`ClaudeBlindBox2` 建了，`SeBatchLogonRight` 也授了，
但计划任务启动失败，没继续查。

---

## 六、本轮修掉的真缺陷（都有 commit）

| commit | 缺陷 |
|---|---|
| `7d87923` | `measure.mjs` 三处静默失败（站点根错致字体 404 回退、CLI 入口 `endsWith` 误触发、favicon 404 致整页异常） |
| `8e99eeb` | S31–S35 的 `plain` 为空 → 提示词出现「请把整页做成这个风格：。」病句 |
| `7c04243` | 加 C7 闸门守护 `layoutKind`；它立刻抓到 S08 没被重渲染过 |
| `4ef90b2` | S34 零图设计被要求放 3 张图（`minPics: 0 \|\| 3` 的 falsy-0） |
| `4e0394c` | 盲测脚本改用产品实际的 `buildStylePrompt`（原来自己拼的少一半约束） |
| `d542f61` | 沙箱 HOME 留着所有案的历史 transcript（真实泄漏，已改为每轮清空） |
| `214a910` | 负对照 B 结果 |

---

## 七、我这一轮犯的六个同类错误（都写进报告了）

全部是同一个形状：**我在读一个信号，而信号来自我自己写错的判据。**

| # | 错误判据 | 真实情况 |
|---|---|---|
| 1 | 「图片数 0/35」 | 扫了自己拼的简化提示词；产品实际 35/35 |
| 2 | 「隔离可行」 | `bypassPermissions` 能读；`pwsh timed out` 是 PATH 缺 System32 |
| 3 | 「沙箱没跑通」（×3） | 只看 `out.html`，模型写的是 `index.html` |
| 4 | 「S04 越界读了 S31」 | 诊断脚本路径写死 S31，`sed` 没生效 |
| 5 | 「11 案全部引用别案 transcript」 | 命中的都是它自己的目录，少了一个 `grep -v` |
| 6 | 「S98 有 205 处 API Error 524」 | 那些 `524` 全是 UUID 和 `estimated_tokens:524`，真实错误数 0 |

**规则**：改任何分析脚本后先确认改动生效；结论是「发现严重问题」时，
先用独立手段复核再行动。
