# 真隔离方案：NTFS ACL + 独立账户（已实测跑通）

> 2026-11-12　主线程
> 用户决定：「做成真隔离」。这份文档记录为什么需要它、怎么做的、以及每一步的实测证据。

---

## 一、为什么必须做

红队 Agent 把原来的「隔离」证伪了，三条证据都成立：

**① `--permission-mode` 不是隔离，是权限提示。**
改成 `bypassPermissions` 就能读 `D:/Web/style` 下任意文件。

**② 「shell 不可用」是误判。**
原来我观察到 `pwsh timed out after 5000ms`，就认定 shell 被封了。
红队发现那只是 `PATH` 里缺 `C:\Windows\System32`。补上后 `echo hi` 直接返回。
**我把一个环境故障当成了安全控制** —— 这是本仓库那类「量到信号、把信号的名字当结论」的典型。

**③ 更糟的是，我自己的隔离脚本抄错了 HOME。**
脚本里 `HOME=/tmp/blindtest/home` 而 `USERPROFILE='C:\tmp\blindtest\home'`。
在这台机器上 `/tmp` → `C:\Users\...\AppData\Local\Temp`，所以这两个**不是同一个目录**。
Claude Code 在 Windows 上按 `USERPROFILE` 解析，真正生效的 HOME 是 `C:\tmp\...`，
而 `cp` 过去的那份 `.claude.json` 从来没被加载过。

所以「主线程声称隔离可行」这个结论，建立在三处错误之上。

---

## 二、真隔离的机制

用 **NTFS Deny ACE + 独立本地账户**，进程级强制：

```
账户：ClaudeBlindBox（本轮创建，密码 BlindRun-2026-tmp!）
拒绝：icacls D:\Web\style /deny "ClaudeBlindBox:(OI)(CI)(RX)"
```

Deny ACE 优先于任何 Allow（包括 `BUILTIN\Users` 的继承权限），
且由内核在文件系统层强制 —— 模型无论怎么要求 `bypassPermissions` 都改不了它。

### 2.1 三步实测证据

**① 账户能跑、能写**

```
WHOAMI:win10pc-sqkl520\claudeblindbox
```

**② 仓库被拒、对照文件正常**（这条是关键：有对照才能排除「环境坏了」）

```
READ_REPO_DENIED                    ← 读 D:\Web\style\README.md 失败
READ_CONTROL_OK:CONTROL-OK          ← 同一进程读 C:\tmp\blindbox-control.txt 成功
```

**③ claude.exe 在沙箱内可执行**

```
EXE_EXISTS:True
VERSION:2.1.289 (Claude Code)
```

### 2.2 途中踩的三个坑（都记下来，下一个人会撞）

**坑一：新账户没有批处理登录权。**
现象：`schtasks /Run` 报「用户未注册，无法登录」。
原因：`SeBatchLogonRight` 默认只给 Administrators / Backup Operators / Performance Log Users。
修法：`secedit /export` → 在 `SeBatchLogonRight` 行追加该用户的 SID → `secedit /configure`。

**坑二：`claude.exe` 在 Administrator 的目录下，沙箱用户读不到。**
现象：`PATH_TEST:False`，执行报「无法将…识别为 cmdlet」。
修法：复制到 `C:\tmp\bb-bin\claude.exe` 并授 RX。实测沙箱内 `--version` 返回 `2.1.289`。

**坑三：PowerShell here-string 里嵌 `$` 会被提前展开。**
现象：`_blindbox-run.ps1` 报 `MissingEndCurlyBrace`。
修法：把要跑的脚本内容用**文件模板**生成（`_make-runner.ps1` → `C:\tmp\runner-template.ps1`），
不在主脚本里内联 here-string。

---

## 三、它挡住了什么、挡不住什么

**挡住：**
- 用 `Read` / `Glob` / `Grep` 读仓库任意文件
- 用 `Bash` / `PowerShell` 执行 `cat`、`type`、`Get-Content` 读仓库
- 提升 `--permission-mode` 到 `bypassPermissions`（ACL 在模型之上）
- 用相对路径 `..` 上爬（ACL 按路径判定，不按调用方式）

**挡不住：**
- **模型的先验知识**。S31 是「钟表修理铺 + 尺规刻度」。一个见过类似设计的模型
  可能凭先验做出四栏结构。这不是隔离能解决的，只能靠**负对照**测
  （给一个不存在的风格 S99，看它是否也能做出「像样」的页面）。
- **网络泄漏**。若 agent 能上网搜到本仓库的 GitHub Pages，
  隔离就失效。`WebFetch`/`WebSearch` 目前被域名安全校验挡住（红队 R8/R9），
  但那是**域名校验**，不是网络隔离，两件事不能混。

---

## 四、与「盲测」定义的关系

用户已定：**北极星 = 测复刻保真度**，不是「测提示词够不够」。

理由：这个产品的设计**就是**给精确数值（`prompt-S03.txt` 里有
`264:524:540 三轨分宽`、`至少 8 个不同的图片位置`）。拿掉了数值，测的就不是用户拿到的东西。

所以本轮的正确表述是：

> 给定这份施工图（含精确数值），模型能否做出与原型一致的结果？
> 一致性用 DOM 测量对账，不用截图（9 案有 infinite 动画，截图必抖）。

红队建议的「方案 A（删掉数值测提示词缺口）」是另一个有价值的问题，
但它不是这个产品的北极星，留作后续。

---

## 五、产物与复算方式

| 文件 | 作用 |
|---|---|
| `_probe/_sandbox-setup.ps1` | 创建 `ClaudeBlindBox` 账户 + 首次 ACL 验证 |
| `_probe/_grant-batch.ps1` | 授 `SeBatchLogonRight` + 完整验证（含对照文件） |
| `_probe/_make-runner.ps1` | 生成 `C:\tmp\runner-template.ps1`（避免 here-string 转义） |
| `_probe/_blindbox-run.ps1` | 主运行器：备 HOME → 下 Deny → 起任务 → 等产物 → 撤 Deny |

复算完整隔离性：

```bash
powershell -File deliverables/78-northstar/_probe/_grant-batch.ps1
```

期望输出必须同时出现 `READ_REPO_DENIED` 与 `READ_CONTROL_OK:CONTROL-OK`。
**只有前者没有后者，不能证明隔离，只能证明环境坏了。**

---

## 六、清理

沙箱账户与 `C:\tmp\bb-bin\claude.exe`（238MB）都是本轮新增的。
不再需要时：

```bash
powershell -Command "icacls D:\Web\style /remove:d ClaudeBlindBox"
powershell -Command "Remove-LocalUser ClaudeBlindBox"
rm -rf /c/tmp/bb-bin /c/tmp/bb-home /c/tmp/bb
```

**每次运行都会在结束时撤掉 Deny**（`_blindbox-run.ps1` 第 7 步），
不会影响管理员自己对仓库的访问。已实测确认：撤掉后 `ADMIN_READ_OK`。
