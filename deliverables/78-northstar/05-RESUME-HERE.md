# 当前进度与恢复指引（长跑中）

> 2026-11-13　主线程
> 这份文件写给「几小时后回来」或「换一个会话接手」的人。
> **不要从头读所有报告**，从这份开始。

---

## 一、现在正在跑什么

### 1.1 批量盲测（约 9 小时）

```
powershell -File deliverables/78-northstar/_probe/_blindbox-batch.ps1 \
  -Ids "S04,S08,S13,S15,S18,S21,S22,S29,S32,S35" -TimeoutSec 3300
```

- 后台 task id：`bkf57378d`
- 输出：`C:\Users\ADMINI~1\AppData\Local\Temp\claude\D--Web-style\f932d1d4-572a-4f84-a764-bd6764f60b93\tasks\bkf57378d.output`
- 每案产物：`C:\tmp\bb\<案号>\out.html`（或 `index.html`）
- 汇总：`C:\tmp\bb\batch-result.json`
- **顺序执行**，不能并行（原因见 §三）

进度怎么查：

```bash
node deliverables/78-northstar/_probe/_stream-stats.mjs S04 S08 S13
```

它会打印每案的 `行数 / thinking / 工具数 / result 状态 / 产物有无`。
`result=success` 且有产物 = 该案跑完。

### 1.2 负对照 S99（未跑）

`deliverables/78-northstar/blind/S99/task.txt` 第一版**撞车了**（详见 §四），
已要求 Agent 重设计。**重设计完成后才能跑**，而且要等批量跑完（同一个沙箱账户）。

---

## 二、回来第一件事：对账

批量跑完后：

```bash
node deliverables/78-northstar/_probe/_batch-compare.mjs
```

不带参数时自动读 `batch-result.json`，只对账有产物的案。

它会打印一张表：`配色 / 线宽 / 字号比 / 图片 / 轨道 / 字节`，以及汇总的达标率。

判据的真源是**提示词**（`blind/<id>/task.txt`），不是原型 —— 因为原型可以有
提示词没说的派生值。

---

## 三、为什么批量不能并行

Deny ACE 是**按账户**生效的：

```
icacls D:\Web\style /deny ClaudeBlindBox:(OI)(CI)(RX)
```

不是按进程。两个沙箱同时跑时，任何一方执行「撤掉 deny」都会让另一方**静默失去隔离**，
而且两边的产物都不可信、且不会报错。

要真并行必须给每案一个独立账户。我试过建第二个（`ClaudeBlindBox2`），
`SeBatchLogonRight` 授了但计划任务仍启动失败，没继续查（不阻塞主线）。

---

## 四、S99 第一版撞车（重要）

第一版 S99 的机制句是「左侧尺寸链 + 1px 尺寸线 + 1×9px 端点短线」。

**它撞了 S31。** 实测：

```
S31  .ruler { position:relative; height:34px; border-bottom:1px solid ...;
              background-size:100% 6px, 100% 14px; }
```

而 S31 正是已经跑完盲测、六个精确命中的那个案子。
用它的变体当负对照，等于拿正例当负例。

**为什么这个失败值得单独记**：一个撞车的 S99 读起来和正常产品提示词一模一样。
如果不 grep `.ruler` 就一路跑完，产出一个像样的页面，会被误读成
「负对照通过，说明 S31 的命中是真的」——
**把一条本该降低信心的证据，变成一条抬高信心的伪证。**

已列出的「不可用手法」清单在 `_probe/12-main-thread-measure-findings.md` §13.4，
重设计时要避开。至少包括：

| 案 | 手法 |
|---|---|
| S01 | 斜切多边形压版心 |
| S03 | 纵向年代轴 |
| S04 | 色块压边 + 12 列隐网格 |
| S07 | 镜像透印 |
| S14 | 质心漂移分档 |
| S16 | 标尺进度条 |
| S17 | 孔列中缝 |
| S22 | 折尺 / 纸张折叠 |
| S31 | 横向尺规（主次刻度） |
| S32 | 卡片柜编号 |
| S33 | 对账双联 |
| S35 | 终端命令行体 |

---

## 五、本轮已确认的事实（可直接引用）

### 5.1 单案盲测成立

S31 在真隔离下产出 399 行 / 22KB：

| 约束 | 产物 | 判定 |
|---|---|---|
| 五个色值 | 恰好那 5 个 | ✅ |
| 主刻度 | `--scale-major:60px; --tick-major-len:34px` | ✅ |
| 次刻度 | `--scale-minor:12px; --tick-minor-len:12px` | ✅ |
| 最大标题 | `clamp(46px, 10.4vw, 104px)` | ✅ |
| 圆角/阴影 | reset 归零 | ✅ |
| 图片位 | 3/3 | ✅ |

一处真偏差：产物引了 3 次 `fonts.googleapis.com`，而任务书写「不用任何 CDN」。

### 5.2 真隔离机制成立

```
READ_REPO_DENIED              ← 读 D:\Web\style 被拒
READ_CONTROL_OK:CONTROL-OK    ← 同一进程读别处正常（排除环境故障）
WHOAMI:...\claudeblindbox
```

**两者必须同时出现**。只有前者不能证明隔离 —— 环境故障也会那样。

### 5.3 抽样定论：11 案

`S04 S08 S13 S15 S18 S21 S22 S29 S31 S32 S35`

边际理由：8→9 买到全部 4 条 `hard` 案；11→12 只多一个 S33，
而 S22 与 S33 的 `structure` 都是 `MIRROR`、`tone` 都是「温暖手作 / 人味」，完全相同。

### 5.4 闸门状态

```
季度体检：17 步全部通过
六个 selftest 全绿
```

---

## 六、本轮修掉的真缺陷（都有 commit）

| commit | 缺陷 |
|---|---|
| `7d87923` | `measure.mjs` 三处静默失败（站点根错致字体 404 回退、CLI 入口 `endsWith` 误触发、favicon 404 致整页异常） |
| `8e99eeb` | S31–S35 的 `plain` 为空 → 提示词出现「请把整页做成这个风格：。」病句 |
| `7c04243` | 加 C7 闸门守护 `layoutKind`；它立刻抓到 S08 没被重渲染过 |
| `4ef90b2` | S34 零图设计被要求放 3 张图（`minPics: 0 \|\| 3` 的 falsy-0） |
| `4e0394c` | 盲测脚本改用产品实际的 `buildStylePrompt`（原来自己拼的少一半约束） |
| `e80d0f5` | 更正：沙箱跑通了，是我三次判成失败 |
| `f087da9` | S99 撞车 + 一次自我误判的记录 |

---

## 七、我的三个错误（都写进报告了，不要重犯）

1. **「图片数 0/35」** —— 扫了自己拼的简化提示词，不是产品输出。真实是 35/35。
2. **「隔离可行」** —— 被红队证伪（`bypassPermissions` 能读；`pwsh timed out` 是 PATH 缺 System32；
   我的脚本把 HOME 和 USERPROFILE 指向了两个不同目录）。
3. **「沙箱没跑通」** —— 三次都只看 `out.html`，而模型写的是 `index.html`。

共同点：**我读的信号来自我自己写错的工具，不是来自被测对象。**
所以改任何分析脚本后，先确认改动生效，再解读结果。
