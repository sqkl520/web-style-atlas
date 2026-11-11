# D:\ 根目录零散文件归属查证

> 2026-11-11　业主问：「检查 D:\ 内的零散文件是不是你干的」

## 结论

**不是本会话产生的。** 那 106 个文件来自另一个 Claude 会话（`MC 自动化测试工具整合` 等五个会话），
内容是 Minecraft Paper 服务端安装脚本的产物，与本仓库（纯静态网站设计风格图集）无关。

## 一、文件清单

D:\ 根目录下的零散文件（非目录），按时间分三批：

| 批次 | 时间 | 内容 | 归属 |
|---|---|---|---|
| 早期 | 2026-05-08 ~ 2026-10-24 | `packetevents-spigot-2.12.1.jar`、`MentorExpress-*.jar`、`BadTrackRecord*.rpt`、`tmp_exec_only.txt`、`tmp_nat.txt`、`stops.json`（58 MB） | 未知，早于本会话 |
| **集中批** | **2026-11-10 17:26–17:55** | **106 个 `sim*` / `nest*` / `nat*` / `nr*` / `tt*` / `lk*` 的 `.out` / `.err`** | **另一个会话（非本会话）** |
| 零星 | 2026-11-01 | `tmp_p26.jar` | 未知 |

## 二、为什么不是本会话

### 证据一：内容与本仓库无关

抽读四个文件（`sim1-1.out`、`sim1-2.err`、`tt-1.out`、`nest1-1.out`），内容全是：

```
[17:52:14][OK] Copied server jar: paper-1.21.4-232.jar
[17:52:15][OK] Created manifest: servers\sim\server.psd1
Server folder already exists: ...\Temp\r4v03\th7\servers\sim (use -Force to overwrite)
所在位置 ...\Temp\r4v03\th7\scripts\new-server.ps1:38
```

这是 Minecraft Paper 服务端的实例创建脚本。本仓库是纯静态的 HTML/CSS 网站设计风格图集
（35 个 `prototypes/Sxx`），**不含任何 Java、不含任何服务端、不使用 Paper**。

### 证据二：来源路径在别人的临时工作区

报错里反复出现三个不同目录：

```
C:\Users\Administrator\AppData\Local\Temp\r4v03\th2\scripts\new-server.ps1
C:\Users\Administrator\AppData\Local\Temp\r4v03\th3\scripts\new-server.ps1
C:\Users\Administrator\AppData\Local\Temp\r4v03\th7\scripts\new-server.ps1
```

`th2` / `th3` / `th7` 是三个独立的临时工作区，每个都在反复创建 `servers\sim`、
`servers\nest`、`servers\nat`、`servers\leak1`、`servers\newrace` 这些实例。
这些目录**现在都已被清理**（`Temp\r4v03\` 不存在了），说明是临时跑完就删的任务。

### 证据三：找到了原始会话

用 `search_session_transcripts` 搜 `paper-1.21.4-232.jar`，命中五个会话：

| 会话 | 工作目录 | 命中内容 |
|---|---|---|
| **MC 自动化测试工具整合** | `D:\Server\MCServers\Server plugin\testharness` | `servers/_shared/paper-1.21.4-232.jar 拷贝` |
| Let's learn English! | `D:\Server\MCServers\Server plugin\Let's learn English!` | `Copied server jar: paper-1.21.4-232.jar [17:42:44]...` |
| OmniSight | `D:\Projects\Overwatch` | 同款输出（18:04） |
| dsh-fcl-android-launcher | `D:\Projects\dsh-fcl-android-launcher` | 同款输出（17:42:44） |
| PerfScope | `D:\Server\MCServers\Server plugin\PerfScope` | 文件列表里出现 `paper-1.21.4-232.jar` |

`D:\Server\MCServers\Server plugin\` 这个路径本身就说明了：那批任务的真实工作目录在
`D:\Server\`，而它们把日志写到了 **D:\ 根目录**（可能是脚本里用了绝对路径、或 cd 到了 D:\）。

### 证据四：时间对不上

本会话在 2026-11-10 的 commit 记录：

```
18:40  9631426  Q2 开工：修好 README 一处对外说错的数字...
15:08  c02d813  Q2：按裁定建完剩下 4 个新案...
```

集中批文件是 **17:26–17:55**，这半小时里本会话**没有任何 commit**，
也没有任何工具调用记录指向 Minecraft 或 `Temp\r4v03`。

## 三、唯一需要解释的一条

部分输出末尾有：

```
Shell cwd was reset to D:\Web\style
```

看起来像指向本会话，但它不是。

- 这是 **shell 的兜底消息**，语义是「shell 回到了它的默认目录」，
  不是「这条命令由 `D:\Web\style` 的会话发起」。
- 真正标明发起者的是同一批输出里的**来源路径**（`Temp\r4v03\th*`）和**transcript 归属**（证据三）。
- 多会话同时在一台机器上跑时，`cwd` 这类共享状态会互相串味。这条消息是其中一例。

## 四、我没有动它们

按业主的要求「不是你干的不要动」，我没有删除、移动、或修改这 106 个文件中的任何一个。

如果以后要清理，建议先确认那几个 MC 会话是否还需要这些日志——
`stops.json` 有 58 MB，其余 `.out`/`.err` 合计不到 100 KB，删不删对磁盘几乎没影响。
