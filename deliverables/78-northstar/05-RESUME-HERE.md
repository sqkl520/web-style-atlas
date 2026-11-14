# 当前进度与恢复指引

> 2026-11-13 建，**2026-11-14 更新**（S21 重跑、隔离补全、S31 数值修正）
> 这份文件写给「几小时后回来」或「换一个会话接手」的人。
> **不要从头读所有报告**，从这份开始。

---

## 零、一句话结论

**盲测做完了，而且比之前更硬：十二案产物、67 个判别值全中、阴性对照 3.8%。**

这份提示词靠的是数值，不是文字描述：

```
S31   有数值             → 399 行，六值精确命中
S21   有数值（重跑）      → 426 行，判别值 3/3，配色 5/5
S99   不存在的风格 + 数值  → 459 行，9 值精确命中
S97   纯泛化描述         → 466 行（正对照：没有具体描述也能做出东西）
S98   有文字、无数值       → 零产物，但**已作废**（被 524 打断，未跑完）
```

对产品是好消息（本来就给施工图）。「只说风格不给数字」的简短版本不可行。

**想快速确认这套结论还站得住**（一条命令跑完五项）：

```bash
node deliverables/78-northstar/_probe/verify-research.mjs
```

---

## 一、现在没有东西在跑

所有沙箱任务已清理、Deny ACE 已撤、`quarter.mjs` 17 步全过、工作区干净。

**但要当心一个坑**：`TaskStop` 停掉监控 shell 不等于停掉运行 ——
计划任务起的 `claude.exe` 是独立进程会继续跑。S21 就是这样：
我 06:25 停了监控，它跑到 07:12 写出产物，我据此写了两版错误结论。
**判断「这一轮没产出」之前，先确认进程真的没了。**

---

## 二、产出在哪

| 文件 | 内容 |
|---|---|
| `06-BLIND-RESULT.md` | 主报告。三轮实验结论 + 十案对账表 + 隔离方式（写于 S21 重跑之前，产物数为当时的 10 案） |
| `_probe/29-prompt-truncation-bug.md` | **判别值证据链**（67/67、阴性对照 3.8%）+ 传参 bug 的完整记录 |
| `_probe/30-artifact-validity.md` | 逐案有效性评级（13 案有产物 / 1 案零产物） |
| `_probe/34-s21-rerun.md` | S21 重跑全过程，含两版错误结论的复盘 |
| `_probe/35-s31-contradiction-evidence.md` | **S31 的线宽违规查清了**：提示词自相矛盾，模型忠实执行了其中一句 |
| `_probe/31-content-instability.md` | 内容层不稳**不是缺陷**的定论（§0，2026-11-14） |
| `_probe/17-gallery-fix-attempt.md` | `probe.mjs` 画廊判据为什么不改（§六 有 2026-11-14 补的定论） |
| `_probe/15-real-isolation.md` | 真隔离的实现与坑（**§2.0 是 (RX) 漏写权限那个洞**） |
| `07-NEGATIVE-B.md` | 负对照 B（S98）的完整记录 |
| `_probe/16-negative-control.md` | 负对照 A（S99）的完整记录 |

产物在 `C:\tmp\bb\<案号>\out.html`（或 `index.html`），
**重要副本在 `_probe/_staged/`**（`C:\tmp` 会被系统清理，13 条 stream 曾这样丢过）。

---

## 三、要复算的话

**一条命令跑完整个研究线的体检**（5 项，5 秒内，不碰 claude）：

```bash
node deliverables/78-northstar/_probe/verify-research.mjs
```

它串起这五项：证据闸门（六条断言）、判别值逐案明细、报告数字审计（48 份）、
作废声明检查、事实反向索引。**改任何报告之后跑一次。**

要单独跑其中某一项：

```bash
node deliverables/78-northstar/_probe/_evidence-gate.mjs            # 六条断言
node deliverables/78-northstar/_probe/_report-numbers-audit.mjs     # 报告数字 vs 实测
node deliverables/78-northstar/_probe/_revoked-claims.mjs           # 有没有引用已作废的结论
node deliverables/78-northstar/_probe/_fact-index.mjs               # 一个数字被几份报告引用
node deliverables/78-northstar/_probe/_discriminator-check.mjs      # 逐案判别值
node deliverables/78-northstar/_probe/_discriminator-crosscheck.mjs # 阴性对照矩阵
node deliverables/78-northstar/_probe/_discriminator-semantic.mjs   # 语义位置

# 逐案对账（脚本名沿用早期的 _batch-compare，要起浏览器，慢）
node deliverables/78-northstar/_probe/_batch-compare.mjs

# 产品链的季度体检（与研究线分开，别混跑）
node prototypes/_build/quarter.mjs
```

> **两条线为什么分开**：`quarter.mjs` 是产品链（规格 → DNA → 提示词 → 九道闸门），
> 上面这些是研究线（盲测产物、判别值、报告一致性）。
> 混在一起的后果是耦合：有人清理 `_probe/_staged/` 的研究产物，
> 产品体检就会红 —— 那是一个没人能理解的失败。

---

## 四、还没做的（按价值排序）

| 项 | 为什么值得做 | 状态 |
|---|---|---|
| ~~正对照~~ | — | ✅ 已做，见 `08-POSITIVE-CONTROL.md` |
| `probe.mjs` 画廊判据 | 13/35 案主容器取到页头/页脚；其中 5 案被 C9 标「无分栏却量到多列」（两个口径别混） | **优先级下调** —— 已查实 `columns` 不进产品，见 `17-gallery-fix-attempt.md` §六 |
| 运行器自动放弃逻辑 | 防止无限重试烧钱 | **结论：不该加**。四类判据全有成功案例反例，见 `34-s21-rerun.md` §三 |
| 图片数「多了算不算」 | 现判据只判下限 | 未做 |
| 栏数判据 | 只报不判 | 未做 |

---

## 五、为什么批量不能并行（重要基础设施约束）

Deny ACE 是**按账户**生效的，不是按进程：

```powershell
icacls D:\Web\style /deny "ClaudeBlindBox:(OI)(CI)(RX)"
icacls D:\Web\style /deny "ClaudeBlindBox:(OI)(CI)(W)"
```

两个沙箱同时跑时，任何一方执行「撤掉 deny」都会让另一方**静默失去隔离**，
而且两边的产物都不可信、且不会报错。要真并行必须给每案一个独立账户。

> **2026-11-14 补**：原来只有 `(RX)` 一条，实测**写权限没堵住**
> （`WRITE_REPO_OK`）。两条都要下，`_deny-verify.ps1` 是回归脚本。
> 另外中断运行器后它走不到清理步骤，必须手动
> `icacls 'D:\Web\style' /remove:d ClaudeBlindBox`。

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
| `7cc7482` | **隔离只有半个**：Deny `(RX)` 不挡写，`WRITE_REPO_OK`。且运行器无 BOM 从未能解析 |
| `afe8b41` | **S31 三个数互相矛盾**：CSS 是 1px/1.5px，规格与机制句写 3px/2px。顺带补抽取器的 gradient 盲点 |
| `91058c6` | D4 从 WARN 升为 FAIL（假阳性来源已修掉） |
| `082ab33` | S21 重跑成功，判别值 64 → 67 |

---

## 七、我这一轮犯的错误（都写进报告了）

同一个形状：**我在读一个信号，而信号来自我自己写错的判据。**

| # | 错误判据 | 真实情况 |
|---|---|---|
| 1 | 「图片数 0/35」 | 扫了自己拼的简化提示词；产品实际 35/35 |
| 2 | 「隔离可行」 | `bypassPermissions` 能读；`pwsh timed out` 是 PATH 缺 System32 |
| 3 | 「沙箱没跑通」（×3） | 只看 `out.html`，模型写的是 `index.html` |
| 4 | 「S04 越界读了 S31」 | 诊断脚本路径写死 S31，`sed` 没生效 |
| 5 | 「11 案全部引用别案 transcript」 | 命中的都是它自己的目录，少了一个 `grep -v` |
| 6 | 「S98 有 205 处 API Error 524」 | **先判「全是 UUID，真实错误 0」—— 又错了。** 我只查了 stream 前 2.9 万行，而 10 条 `api_retry` 全在第 5.8 万行之后（`07-NEGATIVE-B.md:13-24` 有行号）。两个方向的错都犯过：先误判有故障，再误判没故障 |
| 7 | 「13 个盲测全部作废」 | 从 argv bug 推出「指令没送达」，实际绕道读了回来。判别值 67/67 证明产物有效 |
| 8 | 「S21 会无限思考 / 说 61 次 let me write 却一次没写」 | **在跑完之前下判断**。我停的是监控，不是运行；它 07:12 写出了 27,557B 完整页 |
| 9 | 「闸门说 1.5px 查不到」 | 闸门和抽取器共享同一个 gradient 盲点，两边都错 |

**规则**：
1. 改任何分析脚本后先确认改动生效。
2. 结论是「发现严重问题」时，先用独立手段复核再行动。
3. **修好被测对象之后闸门反而变红 —— 先怀疑闸门。**
4. **判断「没产出」之前，确认进程真的结束了。**
