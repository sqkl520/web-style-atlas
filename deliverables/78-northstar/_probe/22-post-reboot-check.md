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
