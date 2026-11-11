# 已确证的度量层缺陷（主线程复核）

> 2026-11-11　这三条都经我独立复算，不是转述 Agent 的结论

北极星审计的前提是「6 个可度量能与原型对账」。在派 agent 之前我先核实了规划报告里
三条会改变方案设计的发现，结论是**全部成立，且有一条比报告说的更严重**。

---

## 一、验货候选案里，`metrics.structure` 一个都没有

独立复算（`_probe/_known-truth-audit.mjs`）：

```
含 metrics.structure：5/35
  有：S31(cols=4) S32(cols=3) S33(cols=3) S34(cols=3) S35(cols=3)
  无：S01 S02 S03 ... S30（全部 30 个老案）

验货候选案里，有 structure 的：
  ★ 一个都没有
  （S03 S07 S17 S01 S09 S14 S19 S24 S26 S28 十个候选里 0 个有）
```

`metrics.structure` 由 commit `9631426`（2026-11-10）引入，对 `probe.mjs` 是
**纯增补 204 增 / 0 删**（`git show 9631426 --numstat`），没有动既有采集逻辑。
所以缺它的那 30 份是"旧引擎产物"，不是"新引擎失败"。

**后果**：`metrics.structure` 是「栏数／主轴宽／线宽集合」这三个可度量的唯一来源。
验货候选案全部没有它 ⇒ **要做验货，必须先重渲染那些案**。

**这不是阻塞**：审计 Agent 实测 3 案（S01/S17/S05）重渲染后**逐键 diff 只有 `at`
和新增的 `structure` 两处变化**，`words`/`screens`/`page`/`type`/`color`/`findings`
全部逐字节相同。S05 做 `strip(at, structure)` 后整个对象 `JSON.stringify` 相等。
所以重渲染是安全的，代价是每案约 1 分钟。

---

## 二、9 案含 `infinite` 动画，截图会抖 —— 其中 2 案是验货候选

独立复算：

```
含 infinite 动画：9 案
  S02 S05 S11 S14 S17 S18 S21 S22 S23
  其中落在验货候选里：S17 S14
```

这条把两份独立报告串起来了：

- 本项目 Q2 的确定性测试（`deliverables/75-q2/_det/03-determinism-verify.md:36`）
  实测 **S17 的 `tablet-page-01.jpg` 在 7 次渲染里有 4:3 两个离散变体**
  （差 1 个字节，41 个像素，每通道 ±1）；
- 而 S17 的 `style.css:218` 正是 `animation: turn 900ms linear infinite;`

**因果链现在闭合了**：不是"渲染器不确定"，是**页面里有无限动画，截图必然截在不同相位**。

**后果**：季度复刻验货的**对账基准不能用截图**，必须用 `report.json` 里的 DOM 测量值。
这与 Q2 的判断一致，但现在有更硬的证据 —— 而且指出了具体是哪 9 个案不能拿截图对账。

---

## 三、6 个可度量里，实际只有 4 个在判

规划报告说「实际只有 4 个在判（栏数、主轴比例被写死 `ok:true`），其中 3 个比对的是
提示词字面给出的数」。我核实了其中最硬的一条：

### S01 上 `measure.mjs` 选错了元素（可证）

`deliverables/74-q7/measure.mjs:70-82` 的判据是：

```js
if (tracks < 2 || tracks > 4) return;      // ← 问题
const area = r.width * r.height;
if (area > bestArea) { ... }
```

我在真浏览器里（`_probe/_verify-s01c.mjs`）量出 S01 页面上的全部 grid 容器：

```
   7 轨  面积  1047123  DIV.columns                365.5px 24px 292.391px 24px 292.406px 24px 219.312px
   1 轨  面积    30702  DIV.slug-slot              365.5px
   2 轨  面积  3922613  DIV.plate-grid             608.797px 608.812px
   3 轨  面积   120921  DIV.foot-grid              397.859px 397.875px 397.859px

measure.mjs 会选：DIV.plate-grid（2 轨）
```

**真版心是 `DIV.columns`，7 轨**（4 个正文栏 + 3 条 24px 铅条），
CSS 原文在 `prototypes/S01-red-wedge-broadsheet/style.css:195`：

```css
grid-template-columns: 5fr var(--bar) 4fr var(--bar) 4fr var(--bar) 3fr;
```

它被 `tracks > 4` 直接排除，于是度量器退而选中 **`DIV.plate-grid`（图片格，2 轨，
面积更大）** ⇒ 报 2 轨，真值 4 栏。

顺带一提 S33：它选中了 `LI.row`（3 轨的镜像行，单行），而不是主版心。

**后果**：这不是"精度不够"，是**选错了测量对象**。而且它指向一个更根本的问题：
「栏数」不等于「grid 轨道数」，至少两种情况下背离：
1. 栏沟是独立轨道（S01 的 `var(--bar)`、S07 的 `1px`、S33 的 `1px`）
2. 图片格/卡片网格不是正文栏（S01 的 `.plate-grid`、S17 的 `.plates`、S33 的 `.row`）

我在 Q2 修 `probe.mjs` 时解决过同一个问题（`metrics.structure` 用了括号感知切分 +
剔窄轨道 + 排除画廊 + 按文字量选主容器），方法论可以直接搬到 `measure.mjs`。
**修复 Agent 正在做这件事。**

---

## 四、这三条对验货方案的净影响

| 原方案 | 实测约束 | 调整 |
|---|---|---|
| 6 个可度量对账 | 实际 4 个在判，其中 1 个（栏数）在 S01/S33 上选错元素 | 先修度量器，再加量 |
| 用截图做基准 | 9 案有 infinite 动画，截图必然抖 | 只用 DOM 测量 |
| 抽 3–8 案盲测 | 候选案 0 个有 `structure` | 每案先重渲染（1 分钟/案） |

**结论**：验货这件事**现在还不具备执行条件**，差的不是 agent 算力，
是度量层三个具体缺陷。修完才能谈抽样与成本。

---

## 五、被证伪的一条：`cdp.mjs` 的「每页多挂 22.7 秒」

规划报告说：

> `measure.mjs` 每页多挂 22.7 秒：单页 `real` 26.1s 而脚本自身只耗 3.4s，原因是
> `cdp.mjs` 的 `close()` 没销毁 `proc.stderr`。加一行 `b.proc.stderr.destroy()`
> 后 1.3 秒退出（20 倍）。

我按这个说法改了 `cdp.mjs`（加 `stderr.destroy()`），**实测没有改善**。继续查下去发现结论完全错：

### 实测过程（三步二分）

**① 基线：纯 node 脚本（无子进程、无浏览器）**

```
开始
纯 node 脚本退出耗时: 1 ms
real 0m0.761s
```

**② 只 `launch()` + `close()`，不 newPage**（改完 cdp.mjs 之后）

```
launch 完成: 7771 ms
close 完成: 3095 ms
总耗时: 12833 ms
real 0m16.602s
```

→ `launch + close = 10.9s`，进程总耗时 12.8s，**close 之后只多等约 2 秒**。

**③ 加 `newPage()` + `goto()` 之后**，close 后多等的时间变成 16 秒 —— 但那多出来的
14 秒是**测试脚本自己的**：`server.close()` 没等回调、`goto` 的 `settleMs`，
以及 HTTP 服务器的 keep-alive socket。

### 关键证据

在 `close()` 之后立刻列出 active handles：

```
剩余 handle:
  1. Socket fd=2 ← 是 process.stderr        ← 主进程自己的 stderr，不是 Chrome 的
  2. Server                                  ← 测试脚本自己的 HTTP server
  3. Socket fd=1 ← 是 process.stdout
proc.stderr 存在 = true  destroyed = true   ← 库自己的 pipe 确实已经关了
proc.exitCode = null  signalCode = SIGTERM  ← 子进程已收到信号
```

**`proc.stderr` 已经被正确销毁**（`destroyed = true`），挂住进程的是
`process.stderr` / `process.stdout` / 测试的 `Server` —— **跟这个库无关**。

### 结论

「加一行 `stderr.destroy()` 后 20 倍提速」**不成立**。
真实的 close 之后延迟约 2 秒（不是 22.7 秒），且那 2 秒来自 `await sleep(300)`
与临时目录删除，不是 pipe 泄漏。

**我已 `git checkout` 回退了那次改动。** 留下的理由是：
在一个没有泄漏的地方加 destroy + 等 exit + SIGKILL 兜底，只会让这段代码
多出 30 行没人能验证的逻辑，而它解决的"问题"不存在。

这条值得记，因为它是本轮唯一一条**看起来最技术、最确凿、实则错误**的发现。
如果我没有实测就照改，会往 vendored 代码里塞一个假修复，
而且下一个人会以为那段注释里的实测是真的。
