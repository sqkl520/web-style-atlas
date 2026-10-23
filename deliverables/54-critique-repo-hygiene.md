# 54 · 仓库卫生锐评（第 2 轮 / 第 7 席）

> 审计对象：`D:\Web\style`（GitHub: `sqkl520/web-style-atlas`）
> 立场：只读审计 + 受控 dry-run。不 commit、不改仓库文件、不运行 `_build/`。
> 状态：Lead 定稿（续跑席死在收尾空消息，正文已全实，见文末批注）

## §0 已证实问题（复核 + 加细）

### 0.1 git log subject BOM 病

**现象**：`U+FEFF`（UTF-8 BOM，字节 `EF BB BF`）被当成 message 的第一个字符写进了 commit 对象，于是 `git log %s` 的每条 subject 都以一个零宽字符开头。不是显示层的锅——`git cat-file commit` 的原字节能直接看到 body 首三字节就是 `EF BB BF`。

**实测（当前 HEAD，`git log --format=%H%x09%s` 经 `--output=` 落盘后按字节判定，绕开 PowerShell 重编码）**：

| 项 | 数字 |
|---|---|
| 提交总数（审计结束时） | **39**（Lead 给的 34 是旧快照；我这次审计期间 HEAD 从 `e15a6ee`→`73bdecb` 前进了 5 条。**关键点：BOM 集合恒为 26，一条没新增**——止血是真的） |
| subject 以 BOM 开头 | **26 / 39 = 66.7%**（在 34 条快照上是 26/34=76.5%） |
| subject 干净 | **13 / 39** |
| BOM 出现在 subject 中部 | **0**（每条污染都是整块前缀，好清理） |
| 中招范围 | `caefdd9`（2026-10-20 00:06，最早）→ `0e28503`（2026-10-24），**连续 26 条，一段整块污染** |
| 断点 | 干净的是 `80eb40e`(10-20) 一条 + `23ec068…73bdecb`(10-22 起) 12 条；**污染不是"全程"，是"某段时期用错写文件姿势"** |
| 最新一条 `73bdecb` | 首字节 `E6 8C 89`（"按"），**无 BOM** |

26 条中招 SHA：`0e28503 7f9962b f24caca 3e72f6c e3a0726 d27497d 99e2cad 493b074 f8cf3e6 6be3668 1f30e7d 64026d4 bce1814 b2e0ea8 e935882 a844e48 f71c5d2 149ddd8 1986b6a 7710187 1263e5d 74fc3fa 2b5e4aa 49b5ac6 68f949e caefdd9`

**GitHub 页面可见吗？可见——已实测**。`api.github.com` 拉 `/commits?per_page=100` 返回 **38 条**，逐条取 subject 首字符算码点：**26 条首码点 = `U+FEFF`**，12 条首码点是正常汉字/数字。中样与本地 26 条 SHA 清单**逐个一致**。也就是说这 26 个零宽字符现在就挂在公开提交列表、`git log` 拉取端、以及任何抓 API 做时间线的第三方里。

**根因**：PowerShell 5.1 的 `Out-File -Encoding utf8` 写 BOM；已改 `[IO.File]::WriteAllText` + `UTF8Encoding($false)`，所以 10-22 之后的新提交干净。**未来已止血，病只在历史**。

**影响谁**：
- **clone 者**：`git log --oneline` 里 subject 前有个看不见的字符。肉眼无害，但 `git log --format='%s' | sort`、`grep '^修'`、`awk` 切第一列、把提交列表贴进 README 时间线——全都会因为首字符不可见而错位。
- **脚本/CI**：任何拿 subject 前缀判类型的（`Conventional Commits` 解析、changelog 生成、`git log --grep`）对 26 条静默失配。本仓库 README 自己就在做提交规约叙事（`docs(...)` 前缀的 `d27497d` 正是中招者之一），所以这不是假想风险。
- **Pages**：**无影响**。`/pages` API 返回 **404（Pages 未启用）**，即使启用，渲染的是 blob 而非 commit message。
- **贡献者**：`git log --format='%an'` 分组只有 **1 个作者**（`sqkl520 <sqkl520soap@gmail.com>`，38/38），**0 fork、0 star、0 open issue、0 subscriber**（API 实测）。重写历史的"作废别人 clone"这一项，代价是 **0 个人**。

**修法对比**：

| | (a) 重写 26 条历史 | (b) 只治未来 + README 记一句 |
|---|---|---|
| 手段 | `git filter-branch --msg-filter` 逐条删前导 BOM | 不动历史；README「已知问题」写 26/38 + 根因 |
| 前置坑 | 需 `SET LC_ALL=C`，否则 `sed` 把 BOM 当非法字节；`git filter-repo` 本机未装，`python` 兜底 | 无 |
| 后果 | **所有 38 个 commit SHA 全变**（改一条→其后每条的 parent 变）；需 `push --force`；别人 clone 作废 | 无 |
| 重算成本 | pack **159 MB / in-pack 2324 对象** 重打包 + 重新上传 171 MB | 0 |
| 收益 | 零宽字符从公开历史消失 | 读者知道有这回事 |

**推荐：(b)。** 理由一句话：**重写的全部风险落在"作废 clone"上，而这个仓库 star 0 / fork 0 / 贡献者 1——风险敞口为 0 的同时，收益也只有一点点洁癖；为 0 收益冒 159 MB 重打包 + force-push 的险，性价比是负的。**（若哪天它有了外部使用者，(a) 才翻身——成本随 fork 数上升，收益随外部脚本数上升，而本仓库这两个方向现在都贴着 0。）

**附带发现（比 BOM 更该修）**：subject **最长 200 字节**，`git log --oneline` 默认在 80 列终端上折行；平均 subject 长度干净段 **124 字节** vs BOM 段 **96 字节**。BOM 是化妆病，**subject 长度失控才是每天影响可读性的病**。

### 0.2 盘上取证废料（gitignored，未入库）

**实测**：`git ls-files --others --ignored --exclude-standard` = **7,050 个被忽略文件 / 1,541.4 MB**。整个工作树（含 .git）= **1,718.9 MB**，其中被 git 追踪的只有 **177.4 MB（2,029 文件）**——**盘上 90% 的字节是过程废料**。上一位报的 1,401 MB 偏小：他漏了 `deliverables/` 里 419.7 MB 的 scratch/tool-runs/_backup 家族（他只点了 42/40/43 三个）。

按"最新写入时间 + 结论是否已内联进已交卷的报告"两把尺子分三档。**实测总数：盘上被忽略的废料 7,050 文件 / 1,541.4 MB。其中我判定可删 = 1,186.9 MB / 5,189 文件（= 20 个死目录 1,186.5 MB / 5,183 文件 + 6 个根目录散件）；把有引用风险的 `tool-runs`（26.5 MB / 281 文件）剔掉后的零风险安全档 = 1,160.4 MB / 4,908 文件；在途活数据 15.1 MB / 434 文件；灰色待裁 268.4 MB / 1,100 文件（42+43+48-scratch）。**

> **与上一位 1,401 MB 的差**：他把 `internship-portal`（外来项目，6.0）和 `prototypes/*/build/`（唯一证据，57.5）也算进了废料；我按"删了会不会丢证据/丢别人的项目"剔掉这两块，所以我的上限更低但更安全。**他的 `_audit3 653 / _audit2 395 / 42-scratch 212 / 40-scratch 49 / 43-scratch 26` 五项，我用 `DirStat` 逐个复核，数字一致（±0.1 MB）。**

#### ✅ 现在可删（**1,186.9 MB / 5,189 文件**；剔除 `tool-runs` 后的零风险安全档 **1,160.4 MB / 4,908 文件**）

| 路径 | MB | 文件 | 最后写入 | 为什么可删 |
|---|---|---|---|---|
| `_audit3/` | **653.4** | 1,924 | 2026-10-22 23:49 | 第 1 轮 21–23 号批次取证；`22/23-visual-audit-batch*.md` 已把逐案数字内联（README 引用的都是内联数字，不是这里的图） |
| `_audit2/` | **395.3** | 960 | 2026-10-21 05:01 | 同上（`22-visual-audit-batch2.md` §取证目录自述全部数字已入正文） |
| `deliverables/40-scratch/` | **48.8** | 1,728 | 2026-10-24 02:06 | `40-critique-fixbenefit.md` **已 tracked 交卷**（结论内联）。1,728 文件里 855 个是无扩展名中间件 |
| `deliverables/tool-runs/` | ⚠️**26.5** | 281 | 2026-10-17 05:35 | **陷阱，建议归档不是删**：`12/14/16-*` 三份 **tracked** 报告正文逐路径引用它 30+ 次（`12-…-v4.md:12` 称 `tool-runs/v4/_RULES.md` 为"判定依据（唯一）"）。**它不在"零风险安全档"里** |
| `deliverables/39-scratch/` | **39.1** | 118 | 2026-10-22 05:03 | `39-critique-toolchain-repro.md` 已交卷（tracked） |
| `deliverables/38-scratch/` | **20.5** | 103 | 2026-10-22 17:17 | `38-…-doc-intent-defense.md` 已交卷（tracked） |
| `deliverables/37-scratch/` | **0.2** | 8 | 2026-10-22 04:49 | 已交卷 |
| `deliverables/44-scratch/` | **0.1** | 7 | 2026-10-24 03:05 | 无报告，体量可忽略 |
| `deliverables/45/47/49/53-scratch/` | **0.0** | 26 | 10-24 03:53–05:18 | 对应报告都已 tracked 交卷 |
| `deliverables/_backup-*`（5 个目录） | **2.2** | 12 | 2026-10-15~16 | 9–10 天前的临时备份 |
| `_audit_s08/`、`.taste-skill/`、`_readme-skill-fetch/` | **0.2** | 16 | 10-22~10-24 | 本地校验工具缓存 |
| 根目录散件（`_tmp_gate_final.txt` 0.1、`new_api_internship_project_plan.md` 0.22、`_compiler-*.ps1` ×4、`.tmp_s19c_pixels.py`） | **0.4** | 6 | — | 一次性脚本/外来计划文档 |
| **合计（含 tool-runs）** | **1,186.9** | **5,189** | — | 实测 `DirStat` 逐个累加 |
| **零风险安全档（不含 tool-runs）** | **1,160.4** | **4,908** | — | **建议只删这一档** |

> **不含** `prototypes/*/build/`（**57.5 MB / 24 个目录**）：见下——它不是废料，是唯一证据。

#### ⛔ 绝对不能动

| 路径 | MB | 为什么 |
|---|---|---|
| `deliverables/46/50/51/52-scratch/`（+ `55/56/57`） | **合计 15.1** | **第 2 轮锐评在途 agent 的活数据**。写入时间戳实锤：51=05:52、56=05:52、46=05:53、57=05:53、54=05:53（我自己）——**审计结束时仍是活的** |
| `deliverables/54-scratch/` | **1.2** | 我自己（第 7 席） |
| `prototypes/S04/S15/S22/S23/S24/S27/.inspect/` + 各自 `style.css` | — | **agent 正在改**。`git status` 实测 **60 条 M**，全落在这六案的 `.inspect/*.jpg`、`report.json`、`style.css`、`assets/CREDITS.md` 上 |
| `prototypes/*/build/texture-job.json` | (57.5 目录内) | LICENSE 划"无第三方权利"的**唯一依据**；`.gitignore:7` 排除 `prototypes/*/build/`，盘上**只有 12/30 案**有这文件（README 415–408 行已自认"克隆者核不了"） |
| `_audit2/` 里被 tracked 报告逐路径点名的取证图 | (395.3 目录内) | 见下方"引用耦合" |

#### ⚠️ 灰色地带（要 Lead 拍板，别自作主张）

- **`deliverables/42-scratch/` 211.9 MB（312 张 PNG）+ 43 号无报告**：**盘上没有 `42-critique-*.md`、`43-critique-*.md`**（`git ls-files deliverables/4*` 里 42/43/44/46 号位是空的）。它们**最新写入 10-24 05:26 / 03:09——就在刚才**。上一位把它们归入"可删（180MB+26MB）"，但"报告不存在 + 还在被写"意味着这**很可能是第 2 轮某席没交卷、或者交卷落点改名了**。删 211.9 MB 之前请先确认 42 号席真的死了。
- **`deliverables/48-scratch/` 30.5 MB**：`48-critique-outsider-walkthrough.md` **已 tracked 交卷**，但正文 14 处逐路径引用 `48-scratch/`，且写入时间 10-24 05:14。→ 引用断链风险，建议**归档压缩**而不是删。
- **`prototypes/S09-batik-price-board/assets/raw/` 6.8 MB（8 张）**：`.gitignore:10` 专门点名它"没有一个被引用"。判定是硬编码的单案；S09 若日后改引用，这里就是死规则。**保留**（体量小、成本零）。
- **`internship-portal/` 6.0 MB（64 文件）**：**外来项目**，`.gitignore:77` 整目录排除。里面有 `data/.gitkeep`(0 B)、`data/events.jsonl`(0 B)、`data/snapshot.json`(75 B)——运行期数据。**不属于本仓库，也别在这里删**（它有自己的用途）。

#### 引用耦合（决定"删了会不会打脸"）

26 份 **tracked** 报告里出现 **142 处**指向被忽略目录的路径引用（`_audit2/` `tool-runs/` `48-scratch/` `40-scratch/` …）。最密集的：`22-visual-audit-batch2.md` 17 处、`48-…` 14 处、`40-…` 12 处、`12-tool-rule-audit-30-v4.md` 把 `tool-runs/v4/_RULES.md` 称为"**判定依据（唯一）**"。**结论：删被引用目录 = 让公开报告里的"可复算"变成空话。** 本仓库 README 第 362 行自己写"这里没有一条断言是估的"——引用断链就是自打。

### 0.3 体量：pack / tracked 文件 / `.inspect/`

**`git count-objects -v`（原样输出，当前 HEAD `73bdecb`）**：

```
count: 393          size: 15875 (KB)     ← 松对象
in-pack: 2324       packs: 1
size-pack: 162786 (KB) = 159.0 MB
prune-packable: 0   garbage: 0   size-garbage: 0
```

`.git/` 目录实测 **174.9 MB** = pack **158.9 MB**（单包 `pack-0ecccb0d….pack`，`.idx` 66,144 B / `.rev` 9,348 B）+ 松对象 **15.6 MB（419 个文件，210 个前缀目录）**。`count-objects` 报 393 而盘上 419：差 26 个是我这次审计用 `--output=` 落盘时 git 写的临时对象文件——**不是仓库的病**。

**tracked 文件 = 2,029 个 / 177.4 MB**（磁盘字节；GitHub API 报 `size=175785 KB = 171.7 MB`，口径为 GitDB，两者差 3% 正常）。构成：

| 类型 | 文件 | 字节 | 占 tracked |
|---|---|---|---|
| `.jpg` | 498 | **128.0 MB** | 72.2% |
| `.woff2` | 951 | **29.2 MB** | 16.5% |
| `.png` | 167 | 10.4 MB | 5.9% |
| `.md` | 134 | 4.6 MB | 2.6% |
| `.css` | 83 | 1.6 MB | 0.9% |
| 其余（json/html/webp/js/avif/mjs/txt） | ~196 | 3.6 MB | 2.0% |
| **真·代码与文档（html+css+js+mjs+md+py+ps1）** | **300** | **7.7 MB** | **4.3%** |

**一句话：95.7% 的字节是图片和字体，4.3% 才是这个仓库"卖的东西"。**

**最大 tracked 单文件 top 5**（逐个 size 实测）：

| # | MB | 路径 |
|---|---|---|
| 1 | **1.49 MB** | `prototypes/S02-gilded-symmetry-salon/assets/_raw/ormolu-gilt-bronze.jpg` |
| 2 | 1.39 MB | `prototypes/S10-grid-versus-sheet/assets/steel-05-raw.jpg` |
| 3 | 1.30 MB | `prototypes/S26-geometric-collision-columns/assets/reuse-s12-memphis-collection.jpg` |
| 4 | 1.30 MB | `prototypes/S30-skate-sticker-split/assets/reuse-s12-memphis-collection.jpg` |
| 5 | 1.23 MB | `prototypes/S07-slate-ink-contents/assets/src-1902-page.jpg` |

**没有单文件逼近 GitHub 的 100 MB 硬上限**（最大 1.5 MB = 上限的 1.5%）。3、4 名是同一内容的两份拷贝（见下"重复"）。

**`.inspect/` 是证据还是负担？——两个都是，比例吓人。**
33 个 `.inspect/` 目录（30 案 + `_selection` + 2 个额外），盘上 332 文件 / 56.0 MB，其中 **tracked 321 文件 / 54.3 MB = tracked 总字节的 30.6%**（11 个文件 / 1.8 MB 是未入库的）。按类型：282 `.jpg` + 31 `.json` + 4 `.txt` + 3 `.png` + 1 `.log`。
它是**证据**：README 第 41–47 行把"272 张三档真截图"当卖点，并给出复算命令 `git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l`——我实测 **272，一条不差**；全库 `.inspect` 下 jpg 是 **282**（多出的 10 张属 `prototypes/_selection/`，不算在 272 口径里）。
它是**负担**：一个克隆者为了看设计标本，必须下载 **321 个文件 / 54.3 MB** 的截图。而 `report.json`（31 个）里有 4 个已被 README 自认是"抽取缺陷"的来源。
**裁定：证据身份成立，但它是"为了 README 的一句复算命令"而付的 30.6% 体积税。**

**真实克隆代价（本地实测，不是估算）**：我跑了一次真 `git clone --depth 1 --no-tags`，得到
**.git = 149.2 MB + 工作树 177.4 MB（2,030 文件）= 落盘 326.6 MB**，传输 pack **148.9 MB**。测完已删除该克隆目录（`deliverables/54-scratch/` 回到 1.2 MB）。
全量克隆（带 39 条历史）pack 会接近本地这枚 **158.9 MB**（本地 .git 174.9 MB），落盘同样是 ~330 MB。

**离 GitHub 红线多远**（口径说明：我三次尝试抓 `docs.github.com` 的 limits 页全部 **HTTP 404**，所以这里用广为记录的数值，不当作贴了链接的实测）：

| 限制 | 常用数值 | 本仓库实际 | 余量 |
|---|---|---|---|
| 单文件硬上限 | 100 MB | 最大 1.5 MB | **剩 98.5%（远）** |
| 仓库推荐体量（clone 体验） | ≤100 MB | **171.7 MB（API）/ 159 MB pack** | **已越线 1.7 倍** ← 唯一真红点 |
| 仓库软上限（超限提示） | 1 GB | 171.7 MB | 用了 **16.8%** |
| 仓库硬阻断 | 5 GB | 171.7 MB | 3.4% |
| Pages 站点 | ≤1 GB、构建 <10 min | **Pages 根本没开**（`/pages` API = 404） | 不适用 |

**结论：不是"快撑爆"，是"clone 体验已经踩线"。** README 自己也承认了——第 101–105 行写"仓库约 180 MB，建议浅克隆"（实测 177.4 MB，说得准）。所以真正的问题不是红线距离，而是**README 的"建议浅克隆"没有替用户解决任何东西**：浅克隆后落盘仍 326.6 MB，其中 54.3 MB 是 `.inspect/`、29.7 MB 是 `_fonts/`（925 文件）。

**重复素材（pack 里最值得省的钱）**：2,029 个 tracked 条目只对应 **1,988 个不同 OID**——
**31 组内容重复、41 份多余拷贝、去重可省 18.3 MB（未压缩口径，占 tracked 字节 10.3%）**。全在 `prototypes/`，**`.inspect/` 内 0 组**（截图各自不同，这点干净）。命名规律一目了然：`reuse-sNN-*` 是跨案复制文件而非引用：

| 拷贝数 × 单份 KB | 浪费 | 例子 |
|---|---|---|
| 2 × 1,332 | 1,332 KB | `reuse-s12-memphis-collection.jpg`（S26 / S30 各一份） |
| 2 × 1,264 | 1,264 KB | `src-1902-page.jpg` 与 `reuse-s07-src-1902-page.jpg`（S07 / S23） |
| 3 × 604 | 1,207 KB | `src-washi.jpg`（S13 / S22 / S23） |
| 3 × 496 | 992 KB | `jean-feltgen-herbarium-sheet-…`（S19×2 + S24，其中 S19 内就有 `reuse-s24-reuse-s19-…` 双重前缀） |
| 3 × 440 | 879 KB | `plate5.jpg`（S25 / S28 / S30） |

**⚠️ 但这是"设计决定"不是"卫生事故"**：标本库要求每案 `assets/` 自包含才能原地跑（README 阶段 4 明说"能原地跑起来"）。共享引用会破坏自包含。所以**我不建议去重**；只在 §3 里给它标"性价比最低，除非放弃自包含"。

**其他历史卫生**：`git fsck --no-reflogs --unreachable` 报 **10 个不可达对象**（含 **2 个不可达 commit** `18c5c97` / `183fbd7`）。体量可忽略（<1 MB 级），但**说明历史上曾有提交被 amend/reset 掉过**——和 §0.1 "重写历史"的讨论直接相关：**过去已经重写过，只是没人记录**。
`git remote` 只有 `origin → https://github.com/sqkl520/web-style-atlas.git`；`refs/heads/main` 与 `refs/remotes/origin/main` **完全同步**（都是 `73bdecb`，即审计结束时已推送，无未推送提交、无分叉）。**无 `.lock` 残留、`garbage: 0`。**

### 0.4 误提交防呆（`.gitignore` 覆盖率）

**问题**：`.gitignore` 第 51 行自己写着"漏掉这一条我曾把 **2833 个文件、75 万行差异**误提交进去过"。现在的 92 行规则，防得住下一次吗？

**测法（全部受控，绝未真 add）**：
1. 在 `deliverables/54-scratch/faketree/` 造 56 个假文件（`_critX/`、`deliverables/99-scratch/`、`.tmp-*`、`_dom_*/`、`_ud_*/`、`_scan_reports/`、`_srv.log`、`tools/`、`node_modules/`、`build/` 等全部规则族）；
2. **A 组**：另建一次性仓库 `54-scratch/fake_repo/`（`git init` + **复制真实 `.gitignore` 并提交**），把 56 个假文件放进去，跑 `git add -A -n` + 逐路径 `git check-ignore -v`；
3. **B 组**：把 25 个假文件复制到**真实仓库的真实路径**（repo root、`deliverables/`、`prototypes/`），跑 **`git add -A -n`（dry-run）**，再用白名单逐个删回；
4. 清理后校验：残留假文件 **0**、`git status` 被删的 tracked 文件 **0**、`git add -A -n` 回到基线 **50**、`deliverables/` 3,877 文件与 `prototypes/` 2,212 文件**完整无损**。

**基线（真实仓库、未放假文件时）`git add -A -n` 会暂存 50 项**：50 项全是**别的 agent 正在写的活文件**（六案的 `.inspect/*.jpg`+`report.json`+`style.css` 45 项 + `deliverables/{51,54,55,56,57,58}-critique-*.md` 5 项）。**没有一项是我造的。** 这也说明：**现在任何人跑一次裸 `git add -A` 就会把 6 个在途席位的半成品一起提交。**

#### ✅ 命中清单（防得住，规则逐条点名）

| 假路径 | 生效规则（`.gitignore` 行号:模式） |
|---|---|
| `_critX/note.md`、`_critX/shots/big.jpg` | **L52 `_crit*/`** |
| `deliverables/_critX/note.md`、`prototypes/_critX/note.md` | L52 `_crit*/`（未锚定，**任意深度都管**）|
| `deliverables/99-scratch/z.md`、`deliverables/99-scratch/sub/deep/z2.md` | **L62 `deliverables/*-scratch/`** |
| `.tmp-probe.txt` | **L80 `/.tmp-*`** |
| `.tmp_probe.txt` | **L81 `/.tmp_*`** |
| `_dom_audit/out.json` | **L83 `/_dom_*`** |
| `_ud_stuff/out.json` | **L82 `/_ud_*/`** |
| `_probe_x/p.txt` | **L84 `/_probe_*`** |
| `_scan_reports/r.md` | **L85 `/_scan_reports/`** |
| `_srv.log` | **L88 `/_srv.*`** |
| `_tpl-view/p.txt` | L89 `/_tpl-view/` |
| `_vw-out/p.txt` | L59 `_vw-out/` |
| `prototypes/S04-…/_tmp_probe.txt` | L21 `_tmp_*`（未锚定，任意深度） |
| `_audit9/`、`_audit_s99/` | L53 `_audit*/` + L86 `/_audit_*` |
| `deliverables/_backup-20261231-999999/` | L13 `deliverables/_backup-*/` |
| `deliverables/tool-runs/` | L14 `deliverables/tool-runs/` |
| `tools/x.js`、`node_modules/`、`__pycache__/` | L2 / L34 / L35 |
| `prototypes/S99/build/`、`templates/T99/build/` | L7 / L48 |
| `*.tmp`、`*.bak-fonts`、`_compiler-*.ps1` | L23 / L24 / L22 |
| `.DS_Store`、`Thumbs.db`、`desktop.ini`、`.vscode/`、`.idea/` | L29–L33 |
| `internship-portal/data/secret.key`、`new_api_internship_project_plan.md` | **L77 / L78（整目录封死）** |
| `.taste-skill/c.json`、`prototypes/S01/…/.taste-skill/` | L18 `**/.taste-skill/` |

**25 个 B 组假路径里 15 个被正确拦住；`.gitignore:52/53/62` 三条主力（正是 2833 事故的那三条）在所有深度都成立。**

#### ❌ 漏网清单（9 项，实测被 `git add -A -n` 点名暂存）

```
LEAK >>> add 'deliverables/99-scratch2/big.png'
LEAK >>> add 'deliverables/99-work/_dom_audit/out.json'
LEAK >>> add 'deliverables/99-work/_scan_reports/r.md'
LEAK >>> add 'deliverables/scratch_99/big.png'
LEAK >>> add 'prototypes/S04-mango-collage-wall/_dom_audit/out.json'
LEAK >>> add 'prototypes/S04-mango-collage-wall/shot.png'
LEAK >>> add 'prototypes/S31-new-thing/.inspect/junk-not-evidence.png'
LEAK >>> add 'prototypes/S99/assets/_raw/orig.jpg'
LEAK >>> add 'prototypes/S99/screens/shot.png'
```

**三类根因，一条比一条严重：**

1. **根锚定规则一出 root 就失效（最危险）**。L80–L89 九条规则全带前导 `/`。`_dom_audit/`、`_scan_reports/`、`_ud_/` 在仓库根被拦住，**在 `deliverables/99-work/` 或 `prototypes/S04-*/` 里就完全不拦**。而 2833 事故那类 scratch 恰恰长在深层。**修法是删掉这九条的前导 `/`（或补一份未锚定同名规则），零成本、零误伤风险。**
2. **命名漂移防不住**。`99-scratch2/`、`scratch_99/` 都不匹配 `deliverables/*-scratch/`——`*-scratch/` 要求目录名以 `-scratch` **结尾**。任何一位 agent 手滑写成 `42_scratch/`、`scratch-42/`、`42-scratch-bak/`，废料就直接进暂存区。防呆押在**人类起名的纪律**上。
3. **案目录内部的截图/大图全无防护**。`prototypes/S*/` 下的 `shot.png`、`screens/`、`assets/_raw/`、以及 **`.inspect/` 里任何新文件**都会被 add。注意 **L10 只硬编码了 `S09` 一案的 `assets/raw/`**——`S99/assets/_raw/` 不在规则内。`.inspect/` 是"证据目录"，但它**只被当作允许整体入库，没有任何过滤**：一个 agent 把 300 MB 中间截图写进 `.inspect/` 就会原样进仓（这也是 §0.3 里 54.3 MB 的来源）。

#### 另外两条实测结论

- **`git add -A` vs 显式路径**：对被规则拦住的假路径跑 `git add -n -- <path>`，git **明确警告**"The following paths are ignored by one of your .gitignore files"——**只要用显式路径就看得见**。危险的只有裸 `git add -A`（静默吞掉）。**结论：本仓库的防呆强度取决于"用不用 `-A`"，而不是取决于 `.gitignore`。**
- **反向误伤：0 命中**。把 2,029 个 tracked 路径全喂给 `git check-ignore --no-index --stdin`，**被任何规则匹配到的 tracked 文件 = 0 个**。所以不存在"正式交付名被 ignore 规则误伤"的现存事故，也不存在"tracked 文件落在 ignore 规则里"的潜在地雷（真有这样的文件，删掉后就再也 add 不回去）。
- **README/LICENSE 承诺的目录没有漂移**：README「仓库结构」列的 13 条路径逐个 `Test-Path` + tracked 计数全中；`S01..S30` **30 个目录一个不缺**；`_fonts/css/*.css` README 写 48，实测 **48**；`272 张截图`实测 **272**。这部分很干净。

**裁定：`.gitignore` 防得住"上一次那个事故的原样重演"（根目录 `_crit*/`、`deliverables/*-scratch/`），防不住"换了名字或换了深度的同类事故"。** 2833 事故的教训被固化成了**具体路径的枚举**，没有固化成**通用形状的规则**。

### 0.5 credits.json BOM 编码债

**同一个根因（PowerShell 5.1 `Out-File/Set-Content -Encoding utf8`），换了个债主**：§0.1 是历史里的 BOM，这里是**文件内容里的 BOM**。

**实测（三个口径，逐个字节判 `EF BB BF`）**：

| 口径 | 文件数 | 带 BOM | 无 BOM |
|---|---|---|---|
| **tracked `credits.json`**（入库的，才真正影响 clone 者） | **25** | **8** | **17** |
| 盘上全部 `credits.json`（含被 `prototypes/*/build/` 忽略的 6 份） | 31 | 12 | 19 |
| 盘上全部 `credits*.json`（再含 `credits-unused/extra/fetch`） | 35 | 14 | 21 |

> Lead 给的"13 带 BOM / 19 无"对应的是**盘上口径**（我实测 12/19；采集期间 `S01/build/raw*/`、`S11/build/raw/`、`S16/build/raw/` 这几份又被动过）。**入库口径是 8/25**——真正需要治的只有这 8 份。

**8 份入库带 BOM 的 `credits.json`（点名）**：

```
prototypes/S02-gilded-symmetry-salon/assets/credits.json
prototypes/S05-pixel-cold-storage-console/assets/credits.json
prototypes/S06-showa-kissaten-ledger/assets/credits.json
prototypes/S09-batik-price-board/assets/credits.json
prototypes/S13-blind-debossed-dispatch/assets/credits.json
prototypes/S14-zero-g-launch-sequence/assets/credits.json
prototypes/S15-fishery-floor-ledger/assets/credits.json
prototypes/S25-spotcolor-contents-zine/assets/credits.json
```

**全库 tracked 文本 BOM 普查**（按字节判，非按扩展名猜）：

| 口径 | 总数 | 带 BOM | 清单 |
|---|---|---|---|
| `.md` | 134 | **1** | `deliverables/23-visual-audit-batch3.md` |
| `.json` | 60 | **10** | 上面 8 份 `credits.json` + `S13/assets/credits.fetch.json` + `S21/assets/_cand/candidates.json` |
| `CREDITS.md`（30 案署名表） | 30 | **0** | **干净**——这条重要：面向 clone 者的署名文件没被污染 |
| 全部文本类（md/json/css/html/js/py/ps1/txt/yml/csv/svg） | **349** | **17 = 4.9%** | 另 7 份：`_fonts/_covcheck.py`、`_fonts/_probe-list.txt`、`S13`/`S21` 的 `fetch-assets.ps1`、`S23/index.html`、`templates/M02-warm-local/style.css` |
| **盘上**（含被忽略的）md/json/txt/css/html/py/ps1 | 1,363 | **154 = 11.3%** | 债主要在 `build/`、`*-scratch/` 这些没人看的过程产物里 |

**读端脚本谁容忍 BOM？逐个查了源码（只读，未运行）**：

| 脚本 | 是否剥 BOM | 证据行 |
|---|---|---|
| `_build/write-credits.mjs` | ✅ 剥 | `:24 // 剥 BOM：PowerShell 写的 json 都会带 EF BB BF，JSON.parse 会直接抛` / `:25 readFileSync(p,'utf8').replace(/^\uFEFF/,'')` |
| `_build/assign-assets.mjs` | ✅ 剥 | `:210` 注释明写"**必须剥掉 UTF-8 BOM**：多数 credits.json 是 PowerShell 写的"，`:213` 同款 replace |
| `_build/check-stale.mjs` | ✅ 剥 | `:28 .replace(/^\uFEFF/,'')` |
| `_build/make-textures.py` | ✅ `utf-8-sig` | `:339-344`，注释还写了踩坑原因（`json.load(encoding='utf-8')` 会抛 "Unexpected UTF-8 BOM"） |
| `_build/shot-page.py` | ✅ `utf-8-sig` 读 + **无 BOM 写** | `:11-12`、`:48-49 read_json_bom_tolerant`、`:54` 注释"写 JSON 绝不带 BOM（否则 Node 的 JSON.parse 会失败）" |
| `_build/shot.mjs` | ✅ `utf-8-sig`；写出用 Node（天然无 BOM） | `:993`、`:1153` |
| **`_build/collect-schemes.mjs`** | ❌ **不剥** | `:28/:50/:65` 读 `_CURRENT-VALUES.md`、`:79` 读规格、**`:248 JSON.parse(readFileSync(rep,'utf8'))` 读 `.inspect/report.json`——四处全是裸 `'utf8'`，零 strip** |

**所以真正的风险不是那 8 份 `credits.json`**（`write-credits.mjs` 和 `assign-assets.mjs` 已经各自剥掉了；它们现在只是"难看"，不"要命"）。**真正的隐患是 `collect-schemes.mjs`：选型台 `data.js` 的生成链完全裸奔。**
现状实测：盘上 **31 个 `report.json` 全部无 BOM**（0 个中招），`_CURRENT-VALUES.md` 无 BOM → **所以现在能跑**。
但这是一个**单点约定维系着的可跑态**：只要有一个 agent 用 `Out-File -Encoding utf8` 写 `report.json` 或改 `_CURRENT-VALUES.md`，选型台 `data.js` 立刻炸。而这条链的产物恰恰是 README 的头号入口（`prototypes/_selection/`）。
更糟的是**这条约束没有任何机械守卫**：仓库里 **0 个 git hooks**（`.git/hooks` 无非 `.sample` 文件，`commit-msg` 不存在）、**0 个 `.gitattributes`**（tracked 里一个都没有）。也就是说**防 BOM 全靠"记得用对写文件姿势"，全靠 §0.1 那次踩过坑的人还记得**。

**统一化代价（实测折算）**：把 tracked 里 17 个带 BOM 的文本文件剥掉前 3 字节，一次遍历重写即可，**约 2–5 分钟**（含跑一遍 `verify-prototype.mjs` + `collect-schemes.mjs` 复算）。风险极低但要**同一批提交里改掉**，否则会出现"改了 credits.json 但没重生成 data.js"的半态。
**给 `collect-schemes.mjs` 补 4 处 `.replace(/^\uFEFF/,'')`：约 5 分钟**，是这节里性价比最高的一条——它把"读端全靠运气"换成"读端两种都吃"，且和 `write-credits`/`assign-assets`/`shot-page` 已有的做法**完全一致**（不是新发明，是补齐漏网的那一个）。

## §1 每条影响面实测（数字内联）

格式：**现象 → 实测数字 → 影响谁 → 修法 + 分钟级代价**。按"影响面 × 修复成本"排，不按发现顺序。

---

**H-1 · commit subject 前导 U+FEFF（§0.1）**
- 现象：26 条提交 subject 以 `EF BB BF` 开头，公开在 GitHub 提交列表。
- 实测：**26 / 39 = 66.7%**；GitHub API 逐条核验首码点 = `U+FEFF` 的同样 **26 条**；污染区间 `caefdd9`(10-20) → `0e28503`(10-24)，中部 BOM **0** 条；新提交已连续 **13 条**干净。
- 影响谁：**clone 者**（`git log --oneline` 每行首字符不可见，`sort`/`grep '^修'`/`awk '{print $2}'` 静默错位）；**第三方脚本**（changelog / Conventional-Commits 解析对这 26 条失配——注意中招者里就有 `d27497d docs(attribution): …`，本仓库自己在用前缀规约）；**贡献者：0 人**（作者唯一 `sqkl520`，fork 0 / star 0 / issue 0，API 实测）；**Pages：不受影响**（Pages 未启用，`/pages` API = 404）。
- 修法 + 代价：**(b) 只治未来 + README 记一句 = 3 分钟**（README 加 4 行"已知问题"）。**(a) 重写 26 条 = 25–40 分钟**（`git filter-branch --msg-filter` + `SET LC_ALL=C` + force-push + 159 MB pack 重打包重传），且**作废 0 个 clone 却只有洁癖收益**。**推荐 (b)。**

---

**H-2 · `collect-schemes.mjs` 读端不剥 BOM（§0.5 隐患）**
- 现象：全库 6 个读 JSON/MD 的脚本，5 个剥 BOM，**唯独选型台的生成链裸奔**。
- 实测：`collect-schemes.mjs` **4 处** `readFileSync(…,'utf8')` 无 strip（`:28`、`:50`、`:65` 读 `_CURRENT-VALUES.md`；`:79` 读 `_specs/Sxx.md`；`:248` 读 `.inspect/report.json` 后 `JSON.parse`）。对照：`write-credits.mjs:25`、`assign-assets.mjs:213`、`check-stale.mjs:28` 都有 `.replace(/^\uFEFF/,'')`；`make-textures.py:344`、`shot-page.py:49` 用 `utf-8-sig`。**当前未爆**：盘上 **31/31 个 `report.json` 无 BOM**、`_CURRENT-VALUES.md` 无 BOM。
- 影响谁：**clone 者最重**——`prototypes/_selection/data.js` 是 README 的头号入口（第 49 行"打开选型台"）。一旦某个 agent 用 `Out-File -Encoding utf8` 写 report.json，**整站入口炸成 `JSON.parse` 异常**；**维护者**：这是隐式契约，无文档、无守卫。
- 修法 + 代价：**5 分钟**（4 处补 `.replace(/^\uFEFF/,'')`，与既有 5 个脚本做法一致，不是新发明）。**本表性价比第一。**

---

**H-3 · `.gitignore` 根锚定规则一出 root 就失效（§0.4）**
- 现象：L80–L89 九条临时目录规则带前导 `/`，只护仓库根；同类废料长在深层就完全不拦。
- 实测：`git add -A -n` 造景测试，25 个假路径 **9 个漏网**。`_dom_audit/out.json` 在根 = **KEPT**，在 `deliverables/99-work/_dom_audit/` 和 `prototypes/S04-*/_dom_audit/` = **LEAK**。同族：`_scan_reports/`、`_ud_*/`、`_probe_*`、`_license_probe*`、`_srv.*`、`_tpl-view/`。命名漂移同罪：`99-scratch2/`、`scratch_99/` 不匹配 `deliverables/*-scratch/`（要求以 `-scratch` 结尾），双双 LEAK。`.inspect/` 内部**零过滤**：`S31-new-thing/.inspect/junk-not-evidence.png` 直接 LEAK。
- 影响谁：**贡献者 / agent**（2833 文件事故的原路径就是 scratch 命名漂移；现在换个体裁就重演）；**clone 者**（一旦误提交，159 MB pack 里就多一堆永久删不掉的大二进制）。
- 修法 + 代价：**2 分钟**——把 L80–L89 九条的前导 `/` 去掉（`_dom_*/`、`_scan_reports/`、`_ud_*/`、`_probe_*/`、`_srv.*`、`_license_probe*`、`_tpl-view/`、`/.tmp-*→.tmp-*`、`/.tmp_*→.tmp_*`）。**实测 0 误伤**：2,029 个 tracked 路径喂 `git check-ignore --no-index --stdin`，被任何规则命中的 tracked 文件 = **0**。
- 加一条更狠的：**3 分钟**加 `commit-msg` / `pre-commit` hook 拦 BOM 与大文件——**当前 `.git/hooks` 里 0 个非 `.sample` 钩子、`commit-msg` 不存在、`.gitattributes` 全库 0 个**，所有约定都靠人记。

---

**H-4 · 盘上 1,541 MB 过程废料（§0.2）**
- 现象：`git ls-files --others --ignored` = **7,050 文件 / 1,541.4 MB**；工作树总计 **1,718.9 MB**，tracked 只占 **177.4 MB（10.3%）**。
- 实测：**现在可删 1,186.9 MB / 5,189 文件**（`_audit3` 653.4 + `_audit2` 395.3 + `40-scratch` 48.8 + `39-scratch` 39.1 + `tool-runs` 26.5* + `38-scratch` 20.5 + 5 个 `_backup-*` 2.2 + 44/45/47/49/53-scratch 0.2 + 37-scratch 0.2 + `_audit_s08`/`.taste-skill`/`_readme-skill-fetch` 0.2 + 6 个根散件 0.4）。**在途活数据 15.1 MB / 434 文件不能动**（46/50/51/52/54/55/56/57-scratch，时间戳实测 10-24 05:14–05:53 仍在写）。**灰色待裁 268.4 MB / 1,100 文件**：`42-scratch` 211.9 + `43-scratch` 25.9 + `48-scratch` 30.5 —— **盘上没有 42/43/44 号报告**（tracked `deliverables/` 里 42、43、44 号位空着；46 号 `46-bgroup-cascade-fixes.md` 在我审计期间已被入库），但它们最新写入是 10-24 05:26 / 03:09，**删前须确认席位真死**。*`tool-runs` 有引用风险：`12-tool-rule-audit-30-v4.md` 称 `tool-runs/v4/_RULES.md` 为"判定依据（唯一）"。
- 影响谁：**作者自己（磁盘）**；**clone 者不受影响（全部 gitignored）**；**报告的公信力受影响**：26 份 tracked 报告里有 **142 处**逐路径引用被忽略目录，删了就把"每个数字都可复算"（README 第 362 行）变成空话。
- 修法 + 代价：**零风险安全档 = `_audit2` + `_audit3` + 37/38/39/40-scratch + 5 个 `_backup-*` + 44/45/47/49/53-scratch + `_audit_s08`/`.taste-skill`/`_readme-skill-fetch` + 6 个根散件 = 1,160.4 MB / 4,908 文件 / 约 30 秒**；剩下 26.5 MB `tool-runs` 建议 **压缩归档而非删（3 分钟）**；灰色 268.4 MB **等 Lead 一句话**。

---

**H-5 · 体量：clone 体验已越"建议 100 MB"线（§0.3）**
- 现象：pack 159 MB、tracked 177.4 MB，而"卖的东西"只有 7.7 MB。
- 实测：`git count-objects -v`：`in-pack: 2324` / `size-pack: 162786 KB = 159.0 MB`、`count: 393` 松对象 / 15.6 MB、`.git` 总 **174.9 MB**。**真跑一次 `git clone --depth 1`**：`.git 149.2 MB + 工作树 177.4 MB = 落盘 326.6 MB`（测完已删）。GitHub API `size = 175,785 KB = 171.7 MB` = 软上限 1 GB 的 **16.8%**；单文件最大 **1.49 MB** = 100 MB 硬限的 **1.5%**。构成：`.jpg` 128.0 MB(72.2%) + `.woff2` 29.2 MB(16.5%) + `.png` 10.4 MB；**`.inspect/` 321 文件 = 54.3 MB = tracked 的 30.6%**；`_fonts/` 925 文件 = 29.7 MB；**代码+文档 300 文件 = 7.7 MB = 4.3%**。
- 影响谁：**clone 者**（326 MB 落盘换 7.7 MB 正文，README 第 101–105 行"建议浅克隆"没解决任何事——浅克隆后仍 326.6 MB）；**Pages：暂时无关**（未启用，404），但**一开 Pages 就要把 177 MB 当站点内容传**；**贡献者**（首次 push 前 `git add -A` 的等待时间）。
- 修法 + 代价：README 已如实告知，**这条不该"修"，该"守住"**：**1 分钟**加一条 `check-stale` 或 pre-commit 的体积闸门（tracked > 250 MB 报警）。真要瘦身，唯一大件是 `.inspect/` 54.3 MB，但它是 README 卖点（272 张截图，实测 272 条不差）——**动它就动产品**。

---

**H-6 · tracked 内容重复：31 组 / 41 份多余拷贝 / 18.3 MB（§0.3）**
- 实测：2,029 个 tracked 条目只对应 **1,988** 个不同 OID。最大组 **3 份拷贝**（`src-washi.jpg` S13/S22/S23，各 604 KB）。`.inspect/` 内重复 **0 组**（截图各自不同）。命名规律 `reuse-sNN-*` = 有意跨案复制。
- 影响谁：**clone 者**（多下 18.3 MB）；**维护者**（改一张原图要同步改 3 处，已经是 README 阶段 4 的已知负担）。
- 修法 + 代价：**建议不改（0 分钟）**。标本库要求每案 `assets/` 自包含才能"原地跑"（README 第 239–243 行自己写清了这个代价）；改成共享引用会破坏自包含，收益 18.3 MB（落盘 326.6 MB 的 5.6%）远小于损失。**唯一可做的**：**1 分钟**把 `prototypes/S19-…/assets/reuse-s24-reuse-s19-…jpg` 这种**双重前缀**改名（同案目录内两份同名内容，属于纯粹的整理事故，不涉及跨案共享）。

---

**H-7 · 交付物编号卫生：重号 / 断号 / 截断名（§2 新发现）**
- 实测（tracked `deliverables/` = **63 个文件**）：**重号 4 组**——`11` 号 **4 份**（`11-compiled-30.md`、`11d`、`11e`、`11f`）、`12` 号 **5 份**（裸版 + `-FULL` + `-retry5` + `-v2-authoritative` + `-v4`，合计 **469 KB**）、`21` 号 **2 份**（`21-lead-verify-homogeneity.md` 与 `21-visual-audit-batch1.md`——**同号不同题材**）、`22` 号 **2 份**（`22-lead-verify-chrome-viewport.md` 与 `22-visual-audit-batch2.md`）。**断号 6 个**：`18`、`42`、`43`、`44`、`46`、`51`。
- **文件名被截断**：`deliverables/52-critique-leness.md`——用 UTF-8 读首行是 `# 52｜数量凑数检察官：30 案里有多少是"一个方案的两张脸"`。**"凑数" 的正确 slug 该是 `count-padding`／`number-stuffing` 之类，`leness` 是一个被砍掉前缀的残骸**（提交 `e15a6ee` 的 subject 明写"52 号入库"，所以是**入库时就带着残名**）。README / README-EN **没有任何一处引用 `52-`**，所以断链风险为零，但**读者按名字找不到它**。
- 影响谁：**读者 / 后来审计者**（README 第 358 行说"`deliverables/` 里从 00 号排到 40 号"——实际排到 **53**，且中间 6 个空洞；`12` 号 5 份里只有 1 份自称 `v2-authoritative`，剩下 4 份并存 = 读者不知道以哪份为准）。
- 修法 + 代价：**5 分钟**在 `deliverables/` 加一个 `INDEX.md` 说明"12 号以 v2-authoritative 为准、11 号四份的关系、42/43/44/46/51 空位的原因"；重命名 `52-critique-leness.md` 另需 **1 分钟**（无引用，改名零风险）。

---

**H-8 · EOL 三分天下：1,660 / 327 / 36 / 4（§2）**
- 实测：`git ls-files --eol` 分类：**i/-text 1,660**（二进制，正常）、**i/lf 327**、**i/crlf 36**、**i/mixed 4**、**i/none 3**。`.gitattributes` **全库 0 个**；`core.autocrlf=false` + `core.eol=lf`（来自 `C:/Users/Administrator/.gitconfig`，**机器级配置，不在仓库里**）。
  **36 个 CRLF 入库文件**：`.md` 15 / `.json` 14 / `.html` 2 / `.css` 2 / `.ndjson` 1 / `.log` 1 / `.txt` 1。全部 `w/crlf`（盘上也是 CRLF），**没有一个被 attr 管着**。
  **4 个混用文件**（同一文件内 CRLF 与裸 LF 并存）：`deliverables/11-compiled-30.md`（**CRLF 1,651 + LF 933**）、`deliverables/11d-compiler-wrapper.md`（49 + 211）、`prototypes/S21-…/assets/fetch-assets.ps1`（1 + 109）、`prototypes/_fonts/_covcheck.py`（1 + 26）。
- 影响谁：**跨平台 clone 者**（Linux/macOS 上 `diff` 会看到整文件重写；`deliverables/*.md` 是给人读的 4.6 MB 文档，改一行 = 全行红）；**Python 脚本**（`_covcheck.py` 混用换行，某些工具的 AST/行号统计会飘）；**git 历史**（CRLF/LF 互换污染 diff，`11-compiled-30.md` 485.7 KB 是全库最大 md，任何脚本重写它都会产生 2,584 行假差异）。
- 修法 + 代价：**3 分钟**——加一份 `.gitattributes`（`*.md text eol=lf`、`*.json text eol=lf`、`*.css text eol=lf`、`*.html text eol=lf`、`*.py text eol=lf`、`*.ps1 text eol=crlf`、`*.jpg/-binary`）；`git add --renormalize .` 一次落地，代价是**这 40 个文件产生一次全行 diff**（建议单独一个提交，别混进功能改）。

## §2 我（Lead）漏扫的

> 标注：**[新]** = Lead 清单之外我扫出来的；末尾四条是 **[Lead 已列 · 加细]**，逐个给了实测数。

**N-1 [新] `.gitignore` 里 10 条根锚定规则 = §0.4 漏网的直接原因，而且同一份文件里已经有"未锚定版"了**
L80–L89 带前导 `/` 的共 **10 条**：`/.tmp-*`、`/.tmp_*`、`/_ud_*/`、`/_dom_*`、`/_probe_*`、`/_scan_reports/`、`/_audit_*`、`/_license_probe*`、`/_srv.*`、`/_tpl-view/`。
其中 **`/_tpl-view/`(L89) 与未锚定的 `_tpl-view/`(L42) 完全重复**——写的人显然已经发现锚定有问题，但没有删掉旧的锚定条目。
**重复规则共 5 条**：`_m0*-test/`×2（L39/L56）、`_m0*-verify*/`×2（L40/L57）、`_audit*/`×2（L41/L53）、`_tpl-view/`×2（L42/L89）、`_vw-out/`×2（L43/L59）。非注释规则 **50 条，10% 是纯冗余**。**删冗余 1 分钟、去锚定 2 分钟、0 误伤风险（实测见 N-2）。**

**N-2 [新] `_crit*/` 与 `_audit*/` 确实会误伤"正经交付名"（Lead 问的那条，答案是"会"）**
实测 `git check-ignore -v`：

| 试的路径 | 结果 |
|---|---|
| `deliverables/_critique-round2/x.md` | **IGNORED**（L52 `_crit*/`） |
| `_critique/notes.md` | **IGNORED**（L52） |
| `prototypes/_audit-notes/x.md` | **IGNORED**（L53） |
| `_dom_results/x.md` | **IGNORED**（L83，仅在根；深一层就 LEAK，见 §0.4） |
| `deliverables/_criterion.md`（无尾斜杠） | ok，可 add |
| `prototypes/S01-…/_probe.mjs`（是文件不是目录） | ok，可 add |
| `deliverables/99-critique-something.md`、`deliverables/55-report.md` | ok，可 add |
| `deliverables/54-scratch-backup/x.md`（`-backup` 后缀） | **不被 `*-scratch/` 覆盖**（要它 add，是漏网面） |

`_crit*` 的前缀匹配吃掉 **`_critique` / `_criteria` / `_critical`**。本仓库交付物命名全是 `NN-critique-*.md`（不带下划线前缀），所以现在**侥幸没踩**；下一位起 `deliverables/_critique-round-2/` 的 agent 会**静默丢整份交付物**——显式 `git add <path>` 时 git 会警告，裸 `git add -A` 时不会。**反向全局扫描：2,029 个 tracked 路径里被任何规则命中的 = 0**，所以不存在"已经在库里的文件被忽略规则覆盖"的地雷。

**N-3 [新] 交付物编号：真重号 3 组、断号 8 个、README 的号段声明已过期**
最新 tracked `deliverables/` = **65 个文件**（我审计期间从 63 涨到 65），按 `^(\d+)-` 严格解析 = **56 个带号 + 9 个不带号附件**，最大编号 **57**。
- **真重号（同号多份、无后缀区分）3 组**：
  - `12` 号 **5 份全入库**：`12-tool-rule-audit-30.md`(32.4 KB)、`-FULL.md`(120.2 KB)、`-retry5.md`(40.2 KB)、`-v2-authoritative.md`(122.5 KB)、`-v4.md`(55.4 KB)，**合计 370.7 KB 并存**，只有 1 份自称 `authoritative`；
  - `21` 号 **2 份**：`21-lead-verify-homogeneity.md`(7.0 KB) 与 `21-visual-audit-batch1.md`(38.8 KB)——**同号不同题材**；
  - `22` 号 **2 份**：`22-lead-verify-chrome-viewport.md`(4.2 KB) 与 `22-visual-audit-batch2.md`(59.3 KB)——同样不同题材。
  - ⚠️ **更正上一位的"11 号 4 份"**：那是正则不加 dash 锚定的假阳性。`11d/11e/11f-compiler-*.md` 是 11 的**合法字母后缀族**，`11-compiled-30.md`(485.7 KB) 只有一份主体。**重号是 3 组不是 4 组。**
- **断号 8 个**：`18`、`42`、`43`、`44`、`51`、`54`、`55`、`56`。`51/54/55/56` = 在途席位（盘上有文件未提交）；`42/43` = 盘上有 scratch（211.9 + 25.9 = 237.8 MB，属 §0.2 **灰色待裁**）、**没有报告**；`44` 同样无报告但只有 0.1 MB，我已归入可删；`18` = 纯空洞。
- **README 号段声明已经错了**：`README.md:358` 写"`deliverables/` 里从 00 号约束简报**排到 40 号**"，`README-EN.md:361` 同口径 "**runs from brief 00 to report 40**"。实测最大 **57**，41–57 段有 **10 份已入库**。而 README `:368` 自己把"**文中路径与仓库实际结构不符**"定义为 bug 并要求复算——按它自己的定义这条就是 bug。**代价：改两行，1 分钟。**

**N-4 [新] `52-critique-leness.md` 是被砍掉前缀的残名（改名零风险）**
用 UTF-8 读首行确认标题为 `# 52｜数量凑数检察官：30 案里有多少是"一个方案的两张脸"`——"凑数" 的 slug 该是 `count-padding`/`number-stuffing`，`leness` 只剩后缀残骸。**由 `e15a6ee`（subject 明写"…+ 52 号入库"）带病入库**。
实测引用面：`README.md`、`README-EN.md`、全部 `deliverables/*.md` 中 **0 处引用 `52-`** → 改名安全（1 分钟）。
顺带扫了文件名风险面（Lead 没要求）：**tracked 里 CJK 文件名 0 个、含空格 0 个、含 `@` 7 个（全是 `@1x/@2x` 资产，合法）**；**最长相对路径 140 字符**、`D:\Web\style\` 下最长绝对路径 **153 字符**、**超过 260（MAX_PATH）0 个**、>120 字符 412 个（全在 `prototypes/_fonts/files/<family>/<hash>.<n>.woff2`）。**结论：文件名本身不是病，但 clone 者把仓库放很深（`C:\Users\<长用户名>\Documents\…`）就会撞 MAX_PATH——这是 `_fonts/` hash 命名的隐性税，README 值得提一句"别放太深"。**

**N-5 [新] README 说"工具链都在 `prototypes/_build/`"——实际 22 个脚本散在案目录，其中 18 个混在 `assets/` 里**
README `:127` 明写"**工具链**（都在 `prototypes/_build/`…）"。实测 tracked 脚本：`_build/` **20 个**（19 脚本 + `SHOT-README.md`），**另有 22 个 tracked 脚本在案目录内**：`S03/` 4（`check-palette.mjs`、`make-masks.mjs`、`measure-area.py`、`verify.mjs`）、`S10/assets/` **7**（`bake-plates.py`、`bake-scale.py`、`write-credits.py`、`fetch-assets{,-bitmap,-plate6,-topup}.ps1`）、`S13/` 2（`_fillmap.mjs`、`_plate.py`）、其余为 8 个案子各一份 `assets/fetch-assets.ps1` + `S08/build-assets.py` + `S25/assets/fetch-and-bake.py`。
**更该修的是位置语义：18 个 `.py`/`.ps1` 躺在 `assets/`（素材目录）里**——README `:142` 讲 `assets/` 是素材，clone 者按目录语义会漏掉这些生成器；而 **`S10/assets/write-credits.py` 正是 §0.5 那 8 份带 BOM `credits.json` 的写方**。
**代价 2 分钟**：README 工具链一节补一句"案目录内另有 22 个私有生成脚本（含 18 个放在 `assets/` 下）"。

**N-6 [新] `.gitignore` 自身编码：干净**（顺手核了一条）
首三字节 `23 20 E2`（`#` + `␣` + `─` 的 UTF-8 首字节），**无 BOM**；**CRLF = 0**（纯 LF）；3,016 B / 92 行。对照：**tracked 里的 `S13/assets/fetch-assets.ps1`、`S21/assets/fetch-assets.ps1` 反而是 BOM 中招者**——写 ignore 的人用了对的姿势，写脚本的人没用。**同一次修复的知识没有全库铺开**，这就是 N-7"无机械守卫"要补的东西。

**N-7 [新] 0 钩子 / 0 `.gitattributes` / 0 CI：所有约定都是口头契约**
- `.git/hooks` 下**非 `.sample` 文件 = 0**（`commit-msg` 不存在）→ §0.1 的"未来已止血"**没有任何东西防止下一次 `Out-File` 把 BOM 带回提交信息**。
- **`.gitattributes` tracked = 0 个**（`git ls-files '*gitattributes*'` 空）。EOL 全靠 `git config --show-origin` 实测出的 **`file:C:/Users/Administrator/.gitconfig` 里的 `core.autocrlf=false` + `core.eol=lf`**——**这是机器级配置，不在仓库里**。换一台 Windows 机器（Git for Windows 常见默认 `autocrlf=true`），§1 H-8 的 36 个 CRLF + 4 个混用会当场扩大，新贡献者 diff 整片红。
- 无 `.github/workflows/`、无 `.editorconfig` → README `:362`"这里没有一条断言是估的"这条**最重要的产品承诺，没有一条机械检查在守**。
- **代价**：`.gitattributes` 3 分钟；`commit-msg` 剥 BOM 钩子 3 分钟。**这两条是全表里唯二能同时挡住 §0.1 与 §0.5 复发的措施。**

**N-8 [新] 此刻的实时风险：裸 `git add -A` 会把 6 份未定稿评审一起钉进历史**
基线 dry-run 的 **50 项全是别的席位的活文件**（45 项六案 `.inspect/*`+`style.css` + 5 项 `51/55/56/57/58-critique-*.md`）；`git status` 现在 **60 条 M + 6 条 ??**。
→ **任何人此刻跑一次裸 `git add -A && git commit`，就会把 6 份在途锐评正文和 45 个半成品截图一起提交。** 这是本仓库**当前最高频**的卫生风险，而它只需要 `git add <明确路径>` 就能规避。**代价：README 贡献一节写一句"本仓库禁用裸 `git add -A`"，1 分钟。**

---

**[Lead 已列 · 加细] `git ls-files --eol` CRLF 混用**：见 §1 H-8。准确分类（按 `^i/<x>\s+w/<y>\s+attr/` 正则，不是按空格粗暴切）：**i/-text 1,660（二进制，正常）/ i/lf 327 / i/crlf 36 / i/mixed 4 / i/none 3**，且 **36 个全部是 `i/crlf w/crlf attr/`（无属性管辖）**；4 个 mixed 实测字节：`11-compiled-30.md` **CRLF 1,651 + 裸 LF 933**、`11d-compiler-wrapper.md` 49+211、`S21/assets/fetch-assets.ps1` 1+109、`_fonts/_covcheck.py` 1+26。
**[Lead 已列 · 加细] 0 字节 / 无扩展名 / 临时命名**：**0 字节 tracked = 0**（干净）、**无扩展名 tracked = 1**（`LICENSE`，正常）。按词边界正则（`(^|[/_.-])(tmp|temp|bak|backup|orig|old|copy|wip|draft|untitled|scratch|test|verify|probe|diag|final)([/_.-]|$)`）命中 **20 个**，真正有"临时感"的是 **9 个**：`S09/.inspect/diag*`（`diag-log.txt`、`diag-m.txt`、`diag-rm.txt`、`diag-t.txt`、`diag/{fold,pricebox,rows}.png`）、`S05/.inspect/gate-final.log`、`_fonts/_probe-list.txt`、`_build/_s03-probe.mjs`、`S02/assets/leak-patch@2x.ivory-backup.png`。其余（`verify.mjs`、`*-copy.jpg`、`typescript-copy.png`）是**内容真名**不是副本。**裁定：都别删（是证据），但 `ivory-backup.png` 这种名字该在 CREDITS 里解释一句。**
**[Lead 已列 · 加细] `.gitignore` 误伤正式交付名**：见 N-2 —— **会误伤**（`_critique*`/`_audit*` 前缀匹配），只是当前命名侥幸避开；反向（tracked 落在规则内）实测 **0 命中**。
**[Lead 已列 · 加细] LICENSE/README 承诺目录 vs 实际结构**：**主干零漂移**——README「仓库结构」13 条路径 `Test-Path` 与 tracked 计数**全部命中**（`_selection` 18 / `_fonts` 925 / `_specs` 31 / `_build` 20 / `_CONTRACT.md` 1 / `templates` 12 / `prototypes` 1949 / `deliverables` 63→65）；`S01..S30` **30/30 不缺**；`_fonts/css/*.css` 声称 48 实测 **48**；`.inspect` 截图声称 272 实测 **272**；CN/EN **各 15 节一一对应**；LICENSE 38 行、条款号 `1/2/2bis/3/4` 与 README 引用的"第 2 条 / 第 4 条 / 2bis"**一致**。**只有两处漂移：号段声明（N-3）与"工具链都在 `_build/`"（N-5）。**

## §3 修复代价表（按性价比排序）

"性价比" = 影响面 ÷ 分钟。**"不修"一栏同样给理由——一份只列 TODO 的表没有价值。**

| # | 修什么 | 代价 | 影响面（实测数） | 谁受益 | 建议 |
|---|---|---|---|---|---|
| 1 | 删 5 条重复 `.gitignore` 规则（N-1） | **1 分钟** | 50 条规则里 5 条冗余（10%） | 维护者 | 顺手做 |
| 2 | README 号段声明 `40 号`→`57 号`（N-3，CN L358 + EN L361） | **1 分钟 / 2 行** | 全库 65 份交付物的可寻址性；README `:368` 自定"路径不符=bug" | **clone 者 / 读者** | **立刻做（这是自家定义下的 bug）** |
| 3 | README 贡献节写一句"禁用裸 `git add -A`"（N-8） | **1 分钟** | 此刻 50 项在途文件（45 半成品截图 + 5 份未定稿评审）随时会被一锅端 | 维护者 / 同批 agent | **立刻做** |
| 4 | `.gitignore` 去掉 10 条规则的前导 `/`（N-1 / §0.4 漏网主因） | **2 分钟** | 实测 9 个漏网路径全部因此产生；tracked 误伤 **0** | 贡献者 / clone 者（一旦入库就永久占 pack） | **立刻做** |
| 5 | 重命名 `52-critique-leness.md`（N-4） | **1 分钟** | 全库 **0 处**引用它（改名零风险） | 读者 | 顺手做 |
| 6 | README 工具链一节补"案目录内另有 22 个私有脚本"（N-5） | **2 分钟** | 22 个 tracked 脚本（其中 18 个在 `assets/`）此前无处可查，含 `credits.json` 的写方 | clone 者 / 复算者 | 立刻做 |
| 7 | 加 `.gitattributes`（`*.{md,json,css,html,py} text eol=lf`、`*.ps1 text eol=crlf`、`*.{jpg,png,woff2,avif} binary`）（N-7 / H-8） | **3 分钟** | 36 个 CRLF + 4 个 mixed + **当前 0 个 .gitattributes**；EOL 只靠 `C:/Users/Administrator/.gitconfig` 这台机器的配置 | **跨平台 clone 者** | **立刻做**（本机配置不进仓库 = 没有防线） |
| 8 | `collect-schemes.mjs` 补 4 处 `.replace(/^\uFEFF/,'')`（H-2） | **5 分钟** | 选型台 `data.js` 是全库头号入口；同批 6 个脚本里 **5 个已剥、1 个裸奔**；`report.json` 31/31 无 BOM = 现在能跑、**约定一破就炸** | **clone 者** | **立刻做（性价比第一）** |
| 9 | `commit-msg` 钩子剥 BOM（N-7，防 §0.1 复发） | **3 分钟** | 26 条历史中招 + 当前 **0 个钩子** | 未来所有提交 | 立刻做 |
| 10 | README「已知问题」写 §0.1 BOM 结论（H-1 方案 b） | **3 分钟** | 26/39 = 66.7% 公开可见（GitHub API 逐条核验） | clone 者 / 第三方脚本 | **立刻做（代替重写历史）** |
| 11 | `tool-runs/` 压缩归档而非删（H-4） | **3 分钟** | 26.5 MB；`12-tool-rule-audit-30-v4.md` 称其 `v4/_RULES.md` 为"判定依据（**唯一**）" | 报告公信力 | 做 |
| 12 | 加一条 tracked 体积闸门（`_build/check-stale.mjs` 或 pre-commit） | **1 分钟** | 现在 171.7 MB（建议线 100 MB 的 1.7 倍） | clone 者 | 做 |
| 13 | 删死废料（H-4 零风险安全档：`_audit2`+`_audit3`+37/38/39/40-scratch+5 个 `_backup-*`+44/45/47/49/53-scratch+`_audit_s08`/`.taste-skill`/`_readme-skill-fetch`+6 个根散件） | **30 秒** | **1,160.4 MB / 4,908 文件**（gitignored，clone 者零感知；再加 `tool-runs` 26.5 则 1,186.9 / 5,189） | 作者磁盘 | **可做，但要 Lead 点头**（在途 agent 数据在隔壁目录） |
| 14 | 建 `deliverables/INDEX.md` 说明重号/空号（N-3） | **5 分钟** | 3 组重号（`12` 号 5 份 = 370.7 KB 并存、`21`、`22`）+ 8 个断号 | 读者 / 后来审计者 | 值得做 |
| 15 | tracked 17 个带 BOM 文本统一剥 BOM（§0.5） | **2–5 分钟** | 17/349 = **4.9%**；`CREDITS.md` 30/30 干净、`.md` 只中 1 份 | 洁癖 + 读端不再需要 strip | **等第 8 项做完再做**（读端先容忍，写端再统一，顺序不能反） |
| 16 | `git add --renormalize .` 落地 EOL（H-8） | **3 分钟**（+ 一次 40 文件的全行 diff） | 36 CRLF + 4 mixed；最大受影响 `11-compiled-30.md` 485.7 KB / 2,584 行 | 跨平台 diff 体验 | **单独一个提交**，别混进功能改 |
| — | **H-1 (a) filter-branch 重写 26 条历史** | **25–40 分钟** + force-push + 159 MB 重打包重传 + 全 39 个 SHA 变化 | 收益=洁癖；**风险敞口 0 人**（作者 1、fork 0、star 0、issue 0） | 没人 | ❌ **不修（推荐 (b)）** |
| — | **H-6 去重 31 组 / 18.3 MB** | 需放弃每案 `assets/` 自包含 | 落盘 326.6 MB 的 5.6% | — | ❌ **不修（是设计决定）**；仅建议把 `S19/assets/reuse-s24-reuse-s19-*.jpg` 这种**双重前缀**改名（1 分钟，纯整理事故） |
| — | **§0.3 `.inspect/` 54.3 MB 瘦身** | 需删 321 个 tracked 文件 | README `:41-47` 把"272 张真截图"当卖点，实测 272 条不差 | — | ❌ **不修。动它就动产品。** |
| — | **42/43/48-scratch 268.3 MB** | 30 秒 | 盘上**无对应报告**（42/43/44 号空位），但最后写入 10-24 05:26/05:14 —— **可能是没交卷的活席位** | — | ❌ **等 Lead 确认席位生死再动** |
| — | **internship-portal/ 6.0 MB / `S09/assets/raw/` 6.8 MB** | — | 前者是外来项目（L77 整目录封死，含 `data/secret.key` 防线）；后者体量可忽略且防的是已知事故 | — | ❌ **不动** |

**合计：把 1–14 全做完 ≈ 34 分钟**（其中 1–10 是"今天就该做"的 **26 分钟**核心包，全是改文本 / 加配置 / 补一行 replace，**不碰任何在途 agent 的文件、不碰 `.inspect/`、不碰历史**）。
**唯一需要授权的是 13 项（删 1,153 MB）与 15/16 项（会产生 diff）**。

## §4 裁定

- **新 clone 者视角的卫生水平：内容层 A-，仓库层 C+——你拿到的是一个自我核查到变态的成品站（README 声称的 13 条路径、30 案、48 个样式表、272 张截图，实测一条不差），但代价是 326.6 MB 落盘里只有 7.7 MB 是正文，历史里有 26 条提交顶着看不见的光标，而这一切的防线全在这台机器的 `~/.gitconfig` 和作者的记性上——0 个 hook、0 个 `.gitattributes`、0 个 CI。**

**一句话展开（三层）**：
1. **面向读者的东西，卫生水平高于绝大多数商业仓库**：0 字节文件 0 个、CJK 文件名 0 个、`.gitignore` 自身无 BOM 无 CRLF、`CREDITS.md` 30/30 干净、tracked 路径与 ignore 规则**零冲突**、README 每个数字可复算。
2. **面向 git 的东西是它的短板**：26/39 提交带 BOM 且**公开可见（API 逐条核验）**、36 个文件 CRLF 入库 + 4 个混用 + **0 个 `.gitattributes`**、pack 159 MB / 落盘 326.6 MB 已越"建议 <100 MB"1.7 倍、`deliverables/` 3 组重号 + 8 个断号 + README 号段声明停在 40 而实际到 57。
3. **面向未来的东西最危险**：`_gitignore_ 的 10 条根锚定规则一出 root 就失效（实测 9 个漏网路径），`collect-schemes.mjs` 读端不剥 BOM（同批 6 脚本唯一裸奔的，而它产出全站头号入口 `data.js`），**裸 `git add -A` 此刻会把 6 份未定稿评审 + 45 个半成品截图一起钉进历史**。三件事的修复代价合计 **12 分钟**。

**给 Lead 的一句话**：**这个仓库不需要"大扫除"，它需要把已经存在的正确做法（`utf-8-sig`、`.replace(/^\uFEFF/,'')`、`[IO.File]::WriteAllText`）从"5 个脚本 / 1 个 `.gitignore`"铺到"6 个脚本 / 10 条规则 / 0 个钩子"的空位上——§3 表里 1–10 项，26 分钟，全是我逐条实测过的。**


---

## 附 · Lead 验收批注（续跑席，含它对我的一处正确更正）

- **它纠正我是对的**：提交数不是 34 而是 **39→41**（我引的是旧快照），**但 BOM 恒为 26 一条没新增——止血属实**（我 _dup 独立复算现 HEAD 41 条、带 BOM 26=63.4%，与其一致）。

- **新发现（前 12 席无一报出）**：`reuse-sNN-*`/`src-*` 跨案是**复制**而非引用 → 31 组内容重复、41 份多余拷贝、可省 18.3 MB。
  我独立复算方向一致（数量级对得上）。**采纳它的裁定：不修**——标本库每案 `assets/` 自包含才能'原地跑'，
  改共享引用会破坏自包含、收益(落盘 5.6%)远小于损失。仅做 1 分钟卫生项：`S19/assets/reuse-s24-reuse-s19-*.jpg` 双重前缀改名。

- 它还抓到 `.inspect/` 内重复 0 组（截图各自不同，干净）——这条给 §9.22 的静默失败讨论补了正面证据。
- 它的 H-6（去重不修）与 50 号'30 案 8 件不可替代'、47 号'工位卷宗'不冲突：都指向'体积不是主要矛盾，错位才是'。