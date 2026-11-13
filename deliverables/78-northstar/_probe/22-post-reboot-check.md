# 重启后的状态检查

> 2026-11-13　主线程
> 电脑重启导致五个验证 Agent 全部未产出。这份记录重启后的核对结果与处理。

---

## 一、Agent 状态：五个全部未产出

| Agent | 预期产出 | 实际 |
|---|---|---|
| 规划 | `09-VERIFY-PLAN.md` | 未产出 |
| 闸门红队 | `_probe/18-gate-redteam.md` | 未产出 |
| 报告验证 | `_probe/19-report-consistency.md` | 未产出 |
| 复现性 | `_probe/20-reproducibility.md` | 未产出 |
| 数据链审计 | `_probe/21-datachain-audit.md` | 未产出 |

按既定纪律「agent 因任何问题报错都必须全量重跑，不缩水、不推给主线程」，五个全部重新派出。

---

## 二、环境核对：一切正常

```
沙箱账户      ClaudeBlindBox / ClaudeBlindBox2  都 Enabled
计划任务残留   0
仓库 deny 残留 无
管理员可读    True
```

闸门自测也正常：

```
node prototypes/_build/check-prompts.mjs --selftest
  ✓ plain-empty
  ✓ plain-not-human
  ✓ minpics-falsy-zero
  ✓ mech-no-measurable
  全部变异都响了 —— 断言有效。
```

---

## 三、重启后立刻发现的一个问题：测量残留污染了工作区

一打开仓库，`git status` 显示 2 项修改：

```
 M deliverables/78-northstar/_probe/_staged/S15-sandbox.html
 M deliverables/78-northstar/_probe/_staged/S29-sandbox.html
```

**这不是源码改动**，是 `_batch-compare.mjs` 的副产物。

原因：`measure()` 的静态服务器以**仓库根**为根，路径越出仓库会被拒绝
（本轮早先踩过：直接传 `C:/tmp/...` 会得到 `ERR_CONNECTION_REFUSED`）。
所以对账脚本要把沙箱产物复制进 `_probe/_staged/` 再量。

问题在于那个目录**被 git 追踪**，14 个 HTML 副本每次测量都产生 diff。

**后果**：重启后我第一眼看到的「有未提交改动」是假的。
如果不去看具体是哪些文件，会误以为有工作没保存。

### 已修

```
.gitignore +
  deliverables/78-northstar/_probe/_staged/
git rm -r --cached deliverables/78-northstar/_probe/_staged
```

文件留在磁盘上（脚本照常工作），只是不再进入版本库。修后 `git status` 归零。

---

## 四、这一条与本轮别的错误是同一个形状

本轮我已经因为「判据量的不是它声称量的东西」栽过六次：
`NO_OUT_HTML`、`C--tmp-bb-S31`、`NO_HTML_FOUND`、`stream 安静`、
`引用 transcript 目录`、`524`。

这次是**第七次的近亲**，但方向反过来：

- 前六次是「我读了一个信号，误判成缺陷」
- 这次是「我看到工作区不干净，差点当成有活没干完」

区别在于**这次我没有立刻采信**，先看了具体文件才下结论。
前六次都是先行动（停批量、写报告、发更正）后核实。

**规则**：`git status` 非空时，先看是哪些文件，再判断它意味着什么。

---

## 五、数据链审计 Agent 的结果（已独立核实两条）

### 5.1 数据链自洽 ✅

```
prompts.js 重生成后与提交版本逐字节一致（git diff 空）
35 案 ID 双向差集为空
data.js 12 字段 / prompts.js 的 13 个 dna 字段 35/35 非空
无空 palette、无空 mechanism
八道闸门全绿
```

`S34` 的 `minPics=0` 三路证据一致（`<img>`=0、CSS `url()`=0、`<svg>`=0；
`report.json` 的 `realPictures: 0`）。

### 5.2 但它发现三类我没注意的问题

**① `prompts.js` 头部 banner 三句话全过时且指错案（Agent 评为高危）**

它写「最多 7 色」（实为 9，`clean-dna.mjs` 的 `MAX = 9`）、
「21/30 有主色」（实为 31/35）、
「这 9 案 palette[0] 是底色」（在 prompts 链上 **0/9** 成立 —— 那是 `data.js` 那条链的事实，
被写进了 prompts 的文件里）。

banner 正是写给「下一个改配色逻辑的人」看的。这条我认同是高危。

**② 8/35 案在 `sceneIndex` 里零条目，用户点芯片点不到（我独立复现了）**

```
$ node -e "…统计 sceneIndex 覆盖…"
被索引的案数: 27 / 35
未索引的案: S10 S15 S21 S31 S32 S33 S34 S35
```

根因与 `plain` 缺陷**完全相同**：`SCENE_INDEX` 是 `build-prompts.mjs` 里的**手写映射表**，
只覆盖旧的 30 案，S31–S35 从未加进去。

而 `check-scenes.mjs` 发现了但只报 **INFO**：
「这些案的正向段里，一个词表成员都没有（用户点不到）：S02 S10 S21 S33 S35」。
它列 5 个、我实测 8 个 —— 因为它查的是「正文里有没有词表成员」，
我查的是「索引里有没有」。两个口径都真实，但都没让这件事变成 FAIL。

**③ `HUMAN` 表里 S34 仍写 `minPics: 3`（真相是 0）**

现在靠 `minitems-parsed.json` 那行存在才能吐出 0；那行没了就静默退回 3。
这是我上一轮修 falsy-0 时留下的兜底没跟着改。

**④ `R6` 对 5 个新案静默跳过**（规格里没有「主色」二字，不计分母也不报警）

**⑤ 一个可复现的坑**：任何人本地重跑 `build-prompts.mjs` 都会让 `check-stale` 变红
（只改了 mtime、内容没变）。

### 5.3 我的判断

①② 是真缺陷，该修。③④⑤ 是脆弱点，该记。

但按纪律，先等其余四个 Agent 回来，一起汇总冲突再动手 ——
否则容易边修边改出新问题。
