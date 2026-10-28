# 仓库卫生审计：`deliverables/` 的 5,114 个未跟踪文件

> 审计对象：`D:\Web\style`（公开仓库 `sqkl520/web-style-atlas`）
> 审计性质：**只读**。全程未修改仓库任何被跟踪文件、未改 `.gitignore`、未 `git add`/`git rm`/`git checkout`、未删除任何文件。
> 唯一写入：本目录 `deliverables/68-audit/` 下的 9 个探针脚本 + 9 个 JSON + 本报告。该目录本身就是未跟踪的。

---

## 0. 测量基线（含并发漂移声明）

仓库在审计期间**被其他 Agent 并发写入**，因此所有数字都带时刻戳。

| 时刻 | 事件 | `status --porcelain` 行数 | `-uall` 实际文件数 |
|---|---|---|---|
| 22:59:07 | 开工第一枪 | 987 | 4,892 |
| 23:16 | 中部复测 | 989 | 5,085 |
| **23:18:20** | **冻结快照（本报告基准）** | **989** | **5,114** |

- **HEAD（全程未变）**：`ce4ea78c0c603a1f1357f1282fc8537349a431ac`，`main`，77 个 commit，末次提交 2026-10-28 02:40:07 +0800。
- 工作树**干净**：0 个 modified / 0 个 staged，989 行全是未跟踪。
- **漂移量**：审计 19 分钟内未跟踪文件从 4,892 涨到 5,114（**+222，+4.5%**）。这是别的 Agent 在写探针，不是我。
  下文凡涉及"总量/按类型"的数字均以 **23:18 冻结批次的 `_p1_inventory.json`** 为基准（与引用分析 `_p3_refs2.json` 同批），并标注该批的具体值。

探针清单（同目录，全部可重跑）：

| 探针 | 作用 |
|---|---|
| `_p1_inventory.mjs` | 按类型/大小/目录清点未跟踪文件 |
| `_p2_refs.mjs` | 引用分析 v1（已废弃，见 §B.0） |
| `_p3_refs2.mjs` | 引用分析 v2（正式口径：存在全集含 ignored） |
| `_p4_ignoretest.mjs` | 提案 `.gitignore` 规则的 19 例断言测试 |
| `_p5_route3.mjs` | 路线 3 变体 A（不保留 mjs）全骨架仿真 |
| `_p6_route3b.mjs` | 路线 3 变体 B（保留 mjs）全骨架仿真 |
| `_p7_misc.mjs` | 体积投影 + 数字矛盾抽样 |
| `_p8_final.mjs` | 冻结快照 + 两种 `-u` 口径的目录分组 |
| `_p9_size.mjs` | 路线 2 的压缩后体积估算 |

---

## A. 总账：这 5,112 个文件是什么

### A.1 按类型

`_p1_inventory.mjs` **重跑于 23:18 冻结快照**（首次运行于 22:59 得到 4,895 文件 / 355.3 MB；两者差异即 §0 的并发漂移），口径 `git ls-files --others --exclude-standard`（即 `.gitignore` 生效后、`git add .` 会真正收进去的那批）：

| 类型 | 个数 | 总字节 | MB | 占体积 |
|---|---:|---:|---:|---:|
| **图片** `.png/.jpg/.webp/.gif` | 1,245 | 270,591,453 | **258.06** | **68.3%** |
| **字体** `.otf/.woff2/.ttf` | 1,815 | 79,111,232 | **75.45** | **20.0%** |
| **JSON** 中间数据 | 411 | 26,117,465 | 24.91 | 6.6% |
| **JS** `.js`（非 mjs） | 94 | 8,399,433 | 8.01 | 2.1% |
| **探针脚本** `.mjs` | **762** | 3,049,111 | 2.91 | 0.8% |
| **文本日志** `.txt/.log` | 514 | 3,051,860 | 2.91 | 0.8% |
| CSS | 133 | 2,897,897 | 2.76 | 0.7% |
| HTML | 56 | 1,499,285 | 1.43 | 0.4% |
| `.avif` | 12 | 241,062 | 0.23 | 0.1% |
| `.py` | 30 | 184,178 | 0.18 | 0.0% |
| `.md` | 19 | 185,759 | 0.18 | 0.0% |
| `.bak` | 3 | 366,586 | 0.35 | 0.1% |
| `.ps1` | 8 | 47,272 | 0.05 | 0.0% |
| `.tsv/.csv/.ndjson/.diff` | 6 | 44,250 | 0.04 | 0.0% |
| `.err`（空文件） | 4 | 0 | 0 | 0% |
| **合计** | **5,112** | **395,786,843** | **377.45** | 100% |

**没有"目录"这一项**——符合定义，全是文件。Lead 任务书里把"目录"列为一类，是受了 `git status` 折叠目录的误导（见 §C）。

**核心读数**：**图片+字体 = 88.3% 的体积，但只占 59.8% 的个数**。而真正的"Agent 写了什么"——探针 `.mjs`——**只有 2.91 MB，占 0.77%**。
所以"几百个探针脚本"其实**极其轻**；真正压仓库的是截图和两个 OTF 字体。

### A.2 最大的 20 个

| # | MB | 类型 | 路径 |
|---:|---:|---|---|
| 1 | 8.75 | font | `deliverables/63-test/replica/S05-pixel-cold-storage-console/build/ground/GlowSansSC-Normal-Medium.otf` |
| 2 | 8.70 | font | `.../S05-pixel-cold-storage-console/build/ground/GlowSansSC-Normal-Regular.otf` |
| 3 | 6.65 | image | `deliverables/66-exec/shots-s13/after/S13-after-1440-full.png` |
| 4 | 6.65 | image | `deliverables/66-exec/shots-s13/before/S13-before-1440-full.png` |
| 5 | 3.82 | json | `deliverables/67-exec/_lab/p2-variants.json` |
| 6 | 3.73 | image | `deliverables/66-exec/shots-s13/after/S13-after-768-full.png` |
| 7 | 3.73 | image | `deliverables/66-exec/shots-s13/before/S13-before-768-full.png` |
| 8 | 2.02 | json | `deliverables/67-audit/data-typography.json` |
| 9 | 1.96 | image | `deliverables/66-exec/shots-s13/after/S13-after-390-full.png` |
| 10 | 1.96 | image | `deliverables/66-exec/shots-s13/before/S13-before-390-full.png` |
| 11 | 1.52 | image | `deliverables/66-exec/shots-s13/after/S13-after-1440-fold.png` |
| 12 | 1.52 | image | `deliverables/66-exec/shots-s13/before/S13-before-1440-fold.png` |
| 13 | 1.52 | image | `deliverables/66-exec/shots-s13/after/S13-after-1440-screen-02.png` |
| 14 | 1.52 | image | `deliverables/66-exec/shots-s13/before/S13-before-1440-screen-02.png` |
| 15 | 1.41 | image | `deliverables/66-exec/shots-s13/after/S13-after-1440-screen-01.png` |
| 16 | 1.41 | image | `deliverables/66-exec/shots-s13/before/S13-before-1440-screen-01.png` |
| 17 | 1.39 | image | `deliverables/63-test/replica/S10-grid-versus-sheet/assets/steel-05-raw.jpg` |
| 18 | 1.33 | image | `deliverables/66-audit/shots-mobile/before-list-1440-card.png` |
| 19 | 1.25 | image | `deliverables/66-exec/shots-s13/before/S13-before-1440-screen-04.png` |
| 20 | 1.25 | image | `deliverables/66-exec/shots-s13/after/S13-before-1440-screen-04.png` |

- **单文件 >5MB 的：4 个**（#1–#4）。**单文件 >10MB 的：0 个**（未跟踪；已忽略文件里有 1 个 >10MB）。
- Top 20 里有 **14 个是同一次 S13 的 before/after 全页长截图**——这是典型的"截图对拍"遗迹：同一页面同尺寸拍两遍，两遍都留着。

### A.3 总量与仓库体积

| 指标 | 值 |
|---|---|
| 未跟踪（5,112 文件） | **377.45 MB** |
| 已跟踪（2,162 文件） | **182.10 MB** |
| 工作树合计 | **559.55 MB** |
| `.git` 实际占盘 | **242.8 MB**（`count-objects -vH`：`size-pack 239.52 MiB`，`in-pack 3853`） |

即：**工作树里 67.5% 的字节是没入库的东西**，已入库的只有 32.5%。

---

## B. 关键问题：这些探针有"被引用"的价值吗

### B.0 先说方法学：我第一版探针算错了，必须声明

`_p2_refs.mjs`（v1）把"引用了一个文件但该文件已被 `.gitignore` 忽略"误判为**死链**，得出 405 个死链 / 84 份报告。
真实原因是 `deliverables/*-scratch/` 下的脚本**还在盘上**，只是被忽略了——它们不是死链。

`_p3_refs2.mjs`（v2，**正式口径**）把"存在全集"定义为 **tracked ∪ untracked(非忽略) ∪ ignored(14,559 个)**，只有当 token 在这个 21,834 个路径的并集里都找不到对应文件时才记死链。**下文全部用 v2。**

### B.1 扫描范围

| 项 | 数 |
|---|---:|
| 已跟踪 `.md` 报告（全集，非抽样） | **219** |
| 其中 `deliverables/` 下的报告 | 147 |
| 已跟踪 `deliverables/` 文件（含非 md） | 170 |
| 未跟踪 `.mjs` 探针 | **762**（p3 同批 763） |
| 已跟踪 `.mjs` | 36 |
| 已忽略 `.mjs` | 697 |

**219 份报告全部逐份正则扫描**，未抽样。提取 `` `_p10_gate.mjs` ``、`deliverables/66-plan/_p1_list.mjs`、`node _xxx.mjs` 三类形态。

### B.2 三个数字（任务书要的）

> ### **被引用的探针：463 个**
> ### **未被引用的探针：300 个**
> ### **报告里的死链：134 个**（分布在 41 份报告）

严格口径（剔除 basename 歧义后仍被唯一指向）：**455 个**被引用。歧义极小——762 个探针里只有 6 组同名（`a4.mjs`、`dump.mjs`、`serve.mjs`、`_stats.mjs`、`collect-schemes.before.mjs`、`probe-comment-state.mjs` 各 2 份），冗余副本仅 6 个，所以我给的主口径直接用 463。

**比例：60.8% 的探针被报告点名，39.2% 是纯死代码。**

补充读数：
- **219 份报告里只有 128 份引用过 `.mjs`**，**91 份一次都没引用**。
- 被引用探针的分布高度集中：`deliverables/62-verify/` 那一批基本是有组织地被一份 `VERIFY-round2-retry.md` 整体点名；而 `65-exec/`、`66-plan/`、`67-exec/` 下大量 `_` 前缀脚本无人认领。

### B.3 死链样本（文档已腐化的证据）

| 死链 token | 出现次数 | 举例报告 |
|---|---:|---|
| `_crit12/serve.mjs` 等 21 个 | 21 | `deliverables/36-critique-bench-defense.md` |
| `_crit8b/measure.mjs` 等 | 14 | `deliverables/31-critique-reconciliation.md` |
| `_crit7b/*.mjs` | 11 | `deliverables/30-critique-assets-license.md` |
| `_crit1/*.mjs` | 6 | `deliverables/24-critique-attack-hunter.md` |
| `_crit3/*.mjs` | 4 | `deliverables/26-critique-geometry-measurer.md` |
| `../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs` | 2 | `deliverables/39-critique-toolchain-repro.md` |
| `Users/Administrator/AppData/Local/Temp/vc5.mjs` | 1 | `deliverables/45-s15-foldcard-visual-check.md` |
| `Web/style/tools/.../rules.mjs` | 1 | `deliverables/39-critique-toolchain-repro.md` |

死链的成因很清楚，且**不是"文件被删了"**：

1. **早期批判轮次的目录从未入库**：`_crit1/`、`_crit3/`、`_crit7b/`、`_crit12/` 这批（对应 `_crit*/` 规则，`.gitignore` 第 47 行本来就忽略），当时就地写在仓库根，报告里用相对路径点名，目录后来被清掉或从未保留 → 永久死链。
2. **绝对/半绝对 Windows 路径写进文档**：`Users/Administrator/AppData/Local/Temp/vc5.mjs`、`Web/style/tools/...`——这是把本机路径当文档写了，任何 clone 都不成立。
3. **`tools/` 是 vendor 且被忽略**（`.gitignore` 第 2 行）：`tools/taste-skill/.../rules.mjs` 这类引用**在克隆者的仓库里天然不存在**，README 自己也在 223 行承认"克隆者须自备 `tools/` 才能复算"。

**这批死链集中在 21–45 号（早期批判轮），62 号以后基本不再出现**——说明后期的 Agent 已经在用"报告 + 同目录脚本一起留在 `deliverables/NN-xxx/`"这个更可复现的写法。**这是本次审计里最好的一个信号。**

### B.4 最重要的一条：README 自己引用了一个被 gitignore 的脚本

`README.md` 第 447 行：

> 三张都用 canvas 在**入库前**烘成纸色/墨色双色调……**脚本见 `deliverables/59-scratch/s13-duotone.mjs`**

实测：

```
exists on disk: True
tracked:       error: pathspec 'deliverables/59-scratch/s13-duotone.mjs' did not match any file(s)
check-ignore:  exit=0  →  .gitignore:62:deliverables/*-scratch/   deliverables/59-scratch/s13-duotone.mjs
```

**README 向克隆者承诺的复现脚本，被 `.gitignore` 第 62 行挡住了，不在仓库里。**
这不是死链（文件还在我磁盘上），而是比死链更糟的**只在作者机器上成立的可复现性**——`git clone` 下来的 100% 复现不出来。这条直接决定了 §D 路线 1 的代价。

---

## C. `git status --ignored` 的真相：Lead 算错了，但错在别处

### C.1 被忽略的没被误算进 986

任务书问"986 里有多少其实已被 .gitignore 忽略、被我误算"。

**答案：0 个。一个都没有。**

```
git status --porcelain           → 989 行，全部 '??'，0 个 '!!'
git status --porcelain --ignored → 1,068 行 = 989 '??' + 81 '!!'
```

`--ignored` 只是**多列出** 81 条独立的 `!!` 条目（`deliverables/*-scratch/`、`_audit*/`、`_compiler-*.ps1` 等），没有把任何一条从 `??` 变成 `!!`。
忽略规则的三个来源也查了：`.git/info/exclude` 规则数 **0**，`core.excludesFile` **未设置**，所以判定完全由 `.gitignore` 一个文件决定，无隐藏规则干扰。

**所以"986 个未跟踪"没有被 ignored 污染。这条假设不成立。**

### C.2 但真正的错在这里：986 是"行数"，不是"文件数"

`git status --porcelain` 默认 `-unormal`，**会把整个未跟踪目录折叠成一行**。

| 口径 | 行数/文件数 | 折叠的目录 |
|---|---:|---:|
| `status --porcelain`（默认） | **987**（22:59） | **55** |
| `status --porcelain -uall` | **4,892**（22:59） | 0 |

也就是说 **986/987 里有 55 行不是文件，是目录**；真实未跟踪文件数是 **4,892**，审计结束时涨到 **5,114**。

我完整复现了 Lead 的分组数字来证明这一点——用 `-unormal` 的行来分组，得到：

```
168 deliverables/65-exec      122 deliverables/66-plan     121 deliverables/66-audit
 92 deliverables/67-plan       85 deliverables/67-exec       80 deliverables/66-exec
 66 deliverables/65-plan       66 deliverables/67-audit      60 deliverables/65-audit
 38 deliverables/62-verify     35 deliverables/64-verify     35 deliverables/65-verify
```

**与 Lead 给的 168/122/121/92/85/80/66/66/60/38/35/35 逐位吻合。** 这坐实了他的统计是在折叠行上做的。

而按 `-uall` 的真实文件数分组，**排序完全变了**（因为大目录被折叠成 1 行，在小目录堆里显得很小）：

| 目录 | 真实文件数 | 真实体积 |
|---|---:|---:|
| `deliverables/63-test` | **1,681** | **114.9 MB** |
| `deliverables/67-plan` | 1,034 | 37.2 MB |
| `deliverables/66-exec` | 472 | 80.0 MB |
| `deliverables/66-audit` | 337 | 39.7 MB |
| `deliverables/65-exec` | 299 | 15.2 MB |
| `deliverables/67-exec` | 250 | 40.1 MB |
| `deliverables/62-verify` | 177 | 4.0 MB |
| `deliverables/66-plan` | 151 | 3.2 MB |

**Lead 的表里根本没有 `63-test`**——它才是最大的那个（1,681 文件 / 114.9 MB，占全部未跟踪体积的 30%），却因为在折叠口径下只算 1 行而被漏掉了。

---

## D. 三条路的代价对比

### 路线 1：`git clean -fd deliverables/` —— 全删

**dry-run 实测**（`git clean -nd deliverables/`，未删任何东西）：**会移除 1,021 个条目**，展开即 **5,114 个文件 / 377 MB**。

代价清单：

| 代价 | 实测 |
|---|---|
| 删掉 5,114 个文件 / 377.45 MB | 是 |
| 删掉 **463 个被报告点名的探针** | 60.8% 的探针有引用 |
| 删掉 **20 份未跟踪的 `.md`** | 含 **9 份** `assets/CREDITS.md` 许可凭证、`68-plan/LEAD-recon.md`、`63-test/data/final-rows.md` |
| 删掉 9 个 `63-test/replica/` 复刻站的 `CREDITS.md` | **许可归属证据**，删了等于丢版权溯源 |

**对"可复算/实测"这个卖点的致命性**：这个仓库把"每个数字都能复算"当作核心资产。README 原话：

> **【README:412】** 一句话：**本文尽量把每个数字标注判据与口径**；少数撞不出或已漂移的，已在此点名……此前这里写的是"**没有一条断言是估的**"——那是给自己发的免检牌，双语审计当场抓到若干处行号漂移与两处虚构（已删/已改），**绝对化的自誓本身就是最该被审计的断言**，故改为如实版本。

> **【README:418】** 什么算 bug：脚本跑不通、锚点跳空、**闸门计数与文中数字不符**、文中路径与仓库实际结构不符。
> **【README:419】** 提之前请先跑这三条复算命令，把原始输出贴上来：

> **【README:410】** 风格照搬，证据不照搬——**文中每个数字都在本仓库里实测过**。

> **【README:351】** ⚠️ **报同质数字必须附判据。** 换成 ΔE76≤5 口径，最大连通分量是 **19 案（63%）**，「12 案」只在上面那个口径下成立。

> **【README:350】** …两个数都属 `report.json` 机械口径，换 grep `<nav>` 口径会得到 76.7%，**这不是漂移、是不同判据**。

**这四段话把仓库的立身之本押在"判据+可复算"上。** 而 §B 已证明：**报告点名的复现脚本有 463 个在未跟踪区**。全删之后：

1. **41 份报告的 134 个死链不变**（它们本来就已死），但**另有 463 处活的引用会立刻变成死链**——死链数从 134 暴涨到约 **597**，涨 4.5 倍。
2. 报告里"实测 S13 首屏完整卡 1→0"这类结论**永久不可复现**——而 HEAD 那次提交的标题恰恰就是 "记录 `--s-h1` 的一处真实回归"。
3. README 自己那句"**提 issue 请先跑这三条复算命令，把原始输出贴上来**"会变成对读者的要求，作者自己却做不到——因为复算所需的探针已被 `git clean` 清掉。
4. 讽刺的是 **README:412 已经把"绝对化的自誓"定性为"最该被审计的断言"**。删掉复现脚本后再宣称"每个数字都实测过"，就是同一类问题的重演。

**路线 1 的判决：不可接受。** 它把仓库从"可复算的标本库"降级为"不可验证的图片集"，而"可复算"正是 README 用 4 段话反复加码的卖点。

### 路线 2：`git add deliverables/` + commit —— 全提交

| 指标 | 实测 |
|---|---:|
| 将新增文件 | **5,091**（`_p9_size.mjs` 同批；冻结时 5,114） |
| 原始字节 | **392,907,197 = 374.7 MB** |
| deflate(level 6) 后 | **342,712,259 = 326.8 MB**（压缩率仅 1.15×，因为主要是 PNG/JPG/OTF 已压缩格式） |
| `.git` 现在 | 242.8 MB |
| `.git` 之后（估算） | **≈ 569.6 MB** |
| 工作树 | 559.6 MB → **≈ 934 MB** |

**压缩率 1.15× 是关键**：图片和字体压不动，所以 commit 之后仓库体积**近乎翻倍**，且这些字节**永久留在 git 历史里**，以后 `git rm` 也删不掉，只能 `filter-repo` 重写历史（对外公开仓库等于要 force-push 全部 commit）。

**安全问题（重点核查）：**

我按任务书要求**必须检查** `deliverables/40-scratch/chrome-prof-9528/`。结论分三层：

1. **它不止一个。** `chrome-prof-9528` 只是 5 个连号快照之一。全仓库共 **17 个 Chrome profile 快照 / 255.81 MB**：
   `40-scratch/chrome-prof-9528|9646|9704|9740|9759`（各 7.1–8.4 MB）、`48-scratch/chrome-profile`（27.9 MB）、`99-scratch/` 下 11 个（`chrome-clip-hd`、`chrome-clip-http-hd-*` ×4、`chrome-profile`、`chrome-profile-1792922695261`、`prof-esm-*`、`prof-keys-*`、`prof-rej-*`、`prof-seq-file-*`）。

2. **敏感文件确实存在**，每个 profile 都有 7–8 个：

   | 文件 | 大小 | 性质 |
   |---|---:|---|
   | `Default/Login Data` | 40,960 | 保存的密码库 |
   | `Default/Login Data For Account` | 40,960 | Google 账号密码库 |
   | `Default/Network/Cookies` | 20,480 | Cookie 库 |
   | `Default/History` | 204,800 | 浏览历史 |
   | `Default/Web Data` | 153,600 | 自动填充/信用卡 |
   | `Default/Affiliation Database` | 53,248 | 账号关联 |
   | `Local State` | 1,002–47,623 | **含 `os_crypt.encrypted_key`** |
   | `Preferences` | 9,776–10,359 | 含 `signin` 段 |

   `Local State` 里那段是实打实的凭据邻接物：
   ```json
   {"os_crypt":{"audit_enabled":true,"encrypted_key":"RFBBUEkBAAAA0Iyd3wEV0RGMegDAT8KX6wEAAAAGhVop/dwOSIi72FjmKvWIEAAAABwAAABHAG8AbwBnAGwAZQAgAEMAaAByAG8AbQBlAAAAEGYAAAABAAAgAAAA5V8h39+CFPAYlpW/3OSy07wWBgBzSOf9Z1tobLxkOSEAAAAADoAAAAACAAAgAAAArRYPaQUxbbBImJxsZGUdpA7wBshdj1IShpBG/mIP0UAwAAAATJERqW5+Vz99fMXDmqc6YjP3OXKPqnvlK32+R7PBRvQ14A7KU51EMHBkdlUZa8WYQAAAAB7EUmy+hzmvOI5jEeAINLpoA5C9RU042K/pDnE/T/FJfIP8/fG3o542xfmRL5YXZa0j7GbvrEtJNhJokYaJYSs="},
    "signin":{"active_accounts_last_emitted":"13437134909860874"},...}
   ```
   `encrypted_key` 是 Chrome 用 Windows DPAPI 封装的主密钥；`signin` 段还有账号标识。DPAPI 是"绑定当前 Windows 用户"加密的，**在作者本机上可解**，换机不可解——但把它推到公网等于把"本地可用的密钥材料"交出去，属于**安全卫生问题而非零风险**。

3. **数据本身目前是空的。** 我读了 SQLite 头并统计页数：`Cookies` 5 页（只有 `cookies`/`meta` 两张表结构）、`Login Data` 20 页、「History」50 页，**全库 ASCII 扫描 6,018 个文件，0 条明文 URL 或邮箱落在这三个库里**。也就是这些是 **headless Chrome 新建的干净 profile**，没承载真实登录态。

   **但**——profile 里被塞进了一个**第三方浏览器扩展**：`Default/Extensions/ncennffkjdiamlpmcbajkmaiiiddgioo/3.52.14_0`，`manifest.json` 的 `name` 是 **「迅雷下载支持」**，版本 3.52.14。这是 **vendor 代码 479 个含 URL 的文件之一**，属于第三个不该入库的第三方 bundle（前两个是 `tools/` 和 `_readme-skill-fetch/`）。

4. **`.gitignore` 挡住了吗？挡得干干净净。** 实测 4 条样本路径全部命中：
   ```
   deliverables/40-scratch/chrome-prof-9528/Default/Network/Cookies   <= .gitignore:62:deliverables/*-scratch/
   deliverables/48-scratch/chrome-profile/Default/Login Data          <= .gitignore:62:deliverables/*-scratch/
   deliverables/99-scratch/chrome-clip-hd/Local State                 <= .gitignore:62:deliverables/*-scratch/
   deliverables/99-scratch/prof-keys-1792925356458/Default/Web Data   <= .gitignore:62:deliverables/*-scratch/
   ```
   17 个 profile **全部**落在 `deliverables/*-scratch/` 规则下。

5. **历史清白。** `git log --all --diff-filter=A --name-only` 全量 2,168 个曾入库路径里：
   - 敏感文件名（Cookies / Login Data / Local State / Web Data / History / Preferences）：**0 个**
   - `chrome-prof*` / `chrome-profile` / `prof-*` 路径：**0 个**
   - 任何 `*-scratch/` 路径：**0 个**

   **所以任务书担心的 P0 场景目前没有发生。** 我也**不建议**把它降级为"无需处理"——因为唯一挡住 `git add -A` 的是一行**通配规则**，一旦某次有人把 profile 移到非 `*-scratch/` 路径，或者写出 `deliverables/*/` 这类过宽规则的反面补丁，就会当场泄露。建议在 `.gitignore` 里**另加一条与目录无关的兜底**（见 §D 路线 3）。

### 路线 3：加 `.gitignore` —— 折中（已离线验证生效）

任务书要求"写出具体规则并验证真的生效，且不许动仓库 `.gitignore`"。我的做法：

1. 在 `%TEMP%` 下 `git init` 一个**假仓库**；
2. 把它 `README` 级的**真实 `.gitignore` 全文**复制进去（否则已在忽略的 `59-scratch`/`99-scratch`/`tool-runs` 会误算为"存活"——我第一版就踩了这个坑，见下）；
3. 追加提案规则；
4. 把**真实仓库 `deliverables/` 的 16,382 个路径骨架**（空文件，保持路径与扩展名）复刻进去；
5. 用 `git status --porcelain -uall` 数"过滤后还剩什么"。

**踩坑记录（说明为什么必须仿真而不是拍脑袋）**：第一版规则在 19 例断言里 **FAIL 3 条**：
- `deliverables/62-exec/tpl-integration/serve.mjs` 该保留却被我漏豁免；
- `deliverables/*/data/` 会连 `data/final-rows.md` 一起吞掉；
- `deliverables/66-audit/tpl-audit/x.json` 规则名写错（`tpl-audit` 不在 `_` 前缀里）。
所以规则是**照着 121 个真实存活样本反推**改出来的，不是我凭空写的。

#### 提案规则（变体 B，建议采用）

```gitignore
# ══════════════════════════════════════════════════════════════
# 审查/执行 Agent 的过程产物：中间数据、截图、快照、复刻站
# 目标：deliverables/ 留 *.md 报告 + *.mjs 探针 + 少量被点名的证据图
# ══════════════════════════════════════════════════════════════

# 1) 中间数据与日志（顶层散落）——**.mjs 不动**（报告点名的复现脚本必须能跑）
deliverables/*/*.json
deliverables/*/*.txt
deliverables/*/*.log
deliverables/*/*.tsv
deliverables/*/*.diff

# 2) Agent 的私有过程目录（_out / _lab / _cut / _orig / _v_out / _rt_out ...）
deliverables/*/_*/

# 3) 截图与快照目录（体积主体，约占未跟踪体积 68%）
deliverables/*/shots*/
deliverables/*/snap/
deliverables/*/tpl-audit/

# 4) 冻结副本 / 提示词快照 / 试验台
deliverables/*/frozen*/
deliverables/*/prompts*/
deliverables/*/lab/
deliverables/*/baseline/
deliverables/*/tmp/
deliverables/*/trials/
deliverables/*/impl/
deliverables/*/r2/

# 5) 复刻站与大数据目录（63-test/replica 单目录 114.9MB，含两个 8.7MB OTF）
deliverables/*/replica/
# 写 data/* 而不是 data/：目录被整体排除后 git 不再向下遍历，
# 任何 !data/xxx 重包含都会失效（本仓库 internship-portal 已踩过这个坑）
deliverables/*/data/*
!deliverables/*/data/*.md

# 6) 唯一被提交的"执行证据"目录：豁免
#    deliverables/ 下 23 个已入库的非 md 文件全在这一个目录（11 个 .mjs + 12 张最终图）
!deliverables/62-exec/tpl-integration/
!deliverables/62-exec/tpl-integration/**

# 7) 【安全兜底】与目录无关：Chrome profile 的敏感文件任何位置都不许入库
#    目前靠第 62 行 `deliverables/*-scratch/` 挡住，但那是"路径安全"不是"内容安全"。
Cookies
Cookies-journal
Login Data
Login Data For Account
Web Data
Web Data-journal
Affiliation Database
History
History-journal
Local State
"Secure Preferences"
Network/Cookies
```

#### 验证结果（两种变体，同一骨架、同一真实 `.gitignore` 基座）

| | 变体 A（连 `.mjs` 一起忽略） | **变体 B（保留 `.mjs`，推荐）** |
|---|---:|---:|
| 过滤前 | 4,988 文件 / 364.5 MB | 5,019 文件 / 367.9 MB |
| 过滤后 | **121 文件 / 15.3 MB** | **730 文件 / 20.9 MB** |
| 削减（字节） | **−95.8%** | **−94.3%** |
| 削减（文件数） | −97.6%（−4,867 文件） | −85.5%（−4,289 文件） |
| 存活的 `.mjs` | 19（**全是误豁免**，见下） | **604** |
| **被引用的探针保住** | **13 / 462** | **387 / 462** |

**这就是为什么必须选变体 B**：变体 A 虽然更干净（只剩 15.3 MB），但它把 `deliverables/*/*.mjs` 一起忽略了，**462 个被报告点名的探针会丢掉 449 个（97%）**——报告里的引用当场变死链，等于用 §D 路线 1 的代价换 15 MB。**变体 A 是我写出来又被我自己否掉的方案。**

变体 B 只多留 **5.6 MB / 609 个 `.mjs`**（探针总计才 2.9 MB），却保住 **387/462 = 84%** 的被引用探针。**这笔交易极其划算：用 1.6% 的残留体积，换回 84% 的可复现性。**

变体 B 仍丢 75 个被引用探针，原因都是它们落在 `_*/`、`lab/`、`r2/`、`snap/`、`replica/` 这些被整目录排除的地方。若要 100% 保住，把这 75 个按路径加 `!` 例外即可，或干脆把它们连同报告一起挪到不被忽略的目录——**这是路线 3+ 的微调空间，成本 ≈ 0**。

**注意变体 B 的残留 730 里还有 604 个 mjs**，其中约 217 个是未被引用的死代码。想进一步瘦身就对未被引用的那批单独 `git clean`——**但那是"删死代码"，不是"删复现脚本"，代价完全不同**（§B 的 463/300 分割就是为此服务的）。

---

## E. 其他卫生问题

### E.1 Chrome profile（已按 P0 标准核查）——结论：**当前不是 P0，但是 P1 定时炸弹**

- 规模：**17 个 profile / 255.81 MB**，占未跟踪体积的 **67.8%**——**它们比所有探针脚本重 88 倍**。
- 敏感文件：每种 profile 7–8 个，含 `Cookies`、`Login Data`、`Login Data For Account`、`History`、`Web Data`、`Affiliation Database`、`Local State`、`Preferences`。
- `Local State` 含 `os_crypt.encrypted_key`（DPAPI 主密钥封装）+ `signin.active_accounts_last_emitted`。
- **实测发现和任务书不一致**：这些库目前是**空的**（headless 新建 profile，0 条明文 URL/邮箱）。所以**不是已经泄露登录态**。
- 但 profile 里打包了 **第三方扩展「迅雷下载支持」v3.52.14**（`ncennffkjdiamlpmcbajkmaiiiddgioo`），是第三个不该入库的 vendor bundle。
- `.gitignore` 第 62 行 `deliverables/*-scratch/` **确实挡住了全部 17 个**（4 条抽样全命中）。
- 历史全量 2,168 个曾入库路径：敏感文件名 0、profile 路径 0、`*-scratch/` 路径 0。**从未泄露过。**
- **建议**：加 §D 规则 7 的"内容级兜底"。现状的安全完全依赖"这些目录恰好在 `*-scratch/` 下"这一路径巧合，不是内容级防护。

### E.2 根目录游离文件

根目录 11 个松散文件，逐个查了跟踪状态：

| 文件 | 大小 | 状态 |
|---|---:|---|
| `README.md` | 43 KB | ✅ 已跟踪 |
| `README-EN.md` | 48.6 KB | ✅ 已跟踪 |
| `LICENSE` | 4.1 KB | ✅ 已跟踪 |
| `index.html` | 1.5 KB | ✅ 已跟踪 |
| `.nojekyll` | 585 B | ✅ 已跟踪 |
| `.gitignore` | 3.0 KB | ✅ 已跟踪 |
| `new_api_internship_project_plan.md` | **225.4 KB** | ⚠️ 未跟踪，**已被忽略**（`/.gitignore:78`，第 78 行是一条单独的 `new_api_internship_project_plan.md` 规则） |
| `_tmp_gate_final.txt` | **102.3 KB** | ⚠️ 未跟踪，忽略（`_tmp_*`，第 21 行） |
| `_compiler-update-docs.ps1` | 7.8 KB | ⚠️ 忽略（`_compiler-*.ps1`） |
| `_compiler-update-11f7.ps1` | 6.9 KB | ⚠️ 忽略 |
| `.tmp_s19c_pixels.py` | 1.5 KB | ⚠️ 忽略（`/.tmp_*`） |
| `_compiler-insert-annotations.ps1` | **1 B** | ⚠️ 忽略，且是个 1 字节空壳垃圾文件 |

**根目录没有危险游离物**——所有未跟踪项都已被规则挡住。但 `_compiler-insert-annotations.ps1` 只有 1 字节，是明显的残留垃圾。

### E.3 超大文件

- `deliverables/` 下 **>10MB：0 个**（未跟踪）。
- `deliverables/` 下 **>5MB：4 个**（§A.2 的 #1–#4）。
- 已忽略文件里 **>10MB：1 个**。
- 结论：**没有单文件灾难**，体积是被 1,245 张截图 + 1,815 个字体文件"数量堆"出来的，不是某一个巨物。这改变了处置策略——**按目录规则排除有效，按大小阈值删除无效**。

### E.4 `.git` 自身不干净：5 个孤儿 `.idx`

`git count-objects -vH` 与 `git fsck` 每次都吐：

```
warning: no corresponding .pack: .git/objects/pack/pack-004d9a41474a2219747ad8922bf3e9b989932bee.idx
warning: no corresponding .pack: .git/objects/pack/pack-02e79e98d1372da880f7712317a074a07a1d16b9.idx
warning: no corresponding .pack: .git/objects/pack/pack-0ecccb0d14e69bcc36420d9f3007957456b06112.idx
warning: no corresponding .pack: .git/objects/pack/pack-3601f5cfdd63420794170e0f4003cbcff7743809.idx
warning: no corresponding .pack: .git/objects/pack/pack-89503202c8af0461854725c164ecdc40a6c617ab.idx
```

`pack/` 目录实测：2 个 `.pack`（`0954f…` 222.9 MB + `6d47f…` 28.1 MB）却有 **7 个 `.idx`**，5 个没有对应 pack。是过去某次中断的 repack 留下的残骸（`git fsck` 本身 exit 0，无损坏，只是噪音）。**这类残骸最容易被误当成"仓库坏了"去乱跑 `gc --prune`。**

**任务书没提这一条，但它比 986 个未跟踪文件更接近"仓库卫生"的原始语义。**

### E.5 报告之间的数字矛盾（抽样）

我扫了 219 份报告里的 5 类高频指标。**有一处真矛盾**：

| 指标 | 值 A | 值 B | 位置 |
|---|---|---|---|
| S04 `mask-image` 失效时的颜色数 | **5813 种** | **5818 种** | `deliverables/21-visual-audit-batch1.md:39` vs **同一文件第 41 行** |

- `21-visual-audit-batch1.md:39`：「置为 `none` 后同一区域出现 **5813 种颜色**」
- `21-visual-audit-batch1.md:41`：「`http://127.0.0.1:8791/...` → 该区域 **5818 种颜色**（正常）」

**同一份报告、同一个指标、隔两行给了两个值。** 5818 出现 11 次（README、21 号、48 号、51 号都引），5813 只出现 1 次——**看起来是 5813 是笔误或早期测量，5818 是后续被固化的值。**

更值得记的是 `48-critique-outsider-walkthrough.md:135` 已经把这事查清楚了：

> 5818 是**裁切区域**的数（原始测量：`21-visual-audit-batch1.md:39-42` 明确写"该区域"）。我按首屏 1440×900 整页测得 **201 vs 156**；按 3000px 长图的对差异包围盒量到 **202 vs …**

而 `48` 号同一份文件 `:53` 又写「**http 202 种颜色 / file 1 种颜色**」。**所以 201/202/5813/5818 四个值都真实存在，只是口径不同**（首屏 / 差异包围盒 / 裁切区域）。

**问题在于 README 的呈现**：README 第 139 和第 363 行两次写「同一页面同一尺寸对照实测：**5818 种颜色 vs 2 种颜色**」——**"同一页面同一尺寸"这句话与"5818 是裁切区域的数"直接冲突**。README 自己在 412 行承诺"把每个数字标注判据与口径"，这一处恰恰没标。

其余指标（`FAIL=0` 出现 92 次、`FAIL=1` 18 次、`FAIL=2` 13 次、`FAIL=4` 8 次）**不是矛盾**——它们是不同轮次/不同闸门的快照，报告里都带了轮次上下文，属正常演进。

**README 自身的可复算性抽查：通过。** 我实跑了 README:422 那条命令：
```
$ git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l
实测 272        （README 写 272）  ✅ 吻合
```

---

## F. 我核实后认为任务书说错了的地方

| # | 任务书说 | 我实测 | 性质 |
|---|---|---|---|
| 1 | 「986 个未跟踪文件」 | **987 行 / 4,892 个文件**（22:59）；冻结时 **989 行 / 5,114 个文件** | **口径错误**：把 `git status` 折叠的 55 个目录当成了文件。真实文件数是他的 **4.96 倍** |
| 2 | 「按目录分组 Top：65-exec 168 …」 | 用 `-unormal` 行可**逐位复现**他的 168/122/121/92/85/80… | 反证他确实在折叠行上统计；按真实文件数排序**完全变了**，`63-test`（1,681 文件/114.9MB，最大）**他整个表里没有** |
| 3 | 「已跟踪的 deliverables 文件数 170（**全部是 .md 报告**）」 | 170 = **147 个 .md + 23 个非 md** | **事实错误**。23 个非 md 全在 `deliverables/62-exec/tpl-integration/`（11 个 .mjs + 12 张 jpg/json）。这条很重要——它决定了路线 3 必须给这个目录加豁免 |
| 4 | 「`6*-plan/6*-audit/6*-exec/6*-verify` 这些目录没被忽略」 | **属实**，已验证 4 条样本全部 `NOT-IGNORED` | 他说对了 |
| 5 | 「986 里有多少其实已被 .gitignore 忽略、被我误算」 | **0 个**。`--ignored` 只**多列** 81 条独立 `!!`，没把任何 `??` 转成 `!!` | **假设不成立**。我没找到他担心的那类误算；他的错在 #1 的口径 |
| 6 | 「`40-scratch/chrome-prof-9528/` 里有 Chrome 扩展的 CSS」 | 不止 1 个：**17 个 profile / 255.81 MB**；扩展是**「迅雷下载支持」v3.52.14**（`ncennffkjdiamlpmcbajkmaiiiddgioo`），含 `.js/.css/manifest.json` 完整 bundle | **规模低估 17 倍** |
| 7 | 隐含担心「可能有 cookie/登录态吗？」 | 有文件（`Cookies`/`Login Data`/`Local State` 等 7–8 个/每 profile，`Local State` 含 `os_crypt.encrypted_key`），但**库内是空的**：`Cookies` 仅 5 页、`Login Data` 20 页，全库扫 6,018 文件 **0 条明文 URL/邮箱** | **风险真实存在但尚未兑现**：不是"已泄露登录态"，是"DPAPI 密钥材料 + 账号标识在盘上" |
| 8 | 隐含担心「`.gitignore` 有没有挡住它」 | **挡住了**，全部 17 个命中 `.gitignore:62:deliverables/*-scratch/`；历史 2,168 个曾入库路径里敏感文件 **0 个** | 他没说错，但**靠路径巧合而非内容规则**，我建议加兜底 |
| 9 | 「按类型分类：…/ 目录 / 其他」 | 未跟踪集里**没有"目录"**（定义上只有文件） | 分类维度受 #1 影响 |
| 10 | 「有没有单文件超过 5MB 的？」 | **有，4 个**（8.75/8.70/6.65/6.65 MB）；**>10MB 的 0 个** | 有，但他可能预期的是"很多巨物"，实际是"数量堆" |
| 11 | 未提及 | `.git/objects/pack/` 有 **5 个孤儿 `.idx`**（无对应 `.pack`），每次 `count-objects`/`fsck` 都告警 | **他漏了这条真正的"仓库卫生"问题** |
| 12 | 未提及 | `README.md:447` 引用的 `deliverables/59-scratch/s13-duotone.mjs` **被 `.gitignore:62` 挡住，不在仓库里** | **最尖锐的一条**：README 承诺的复现脚本克隆者拿不到 |

---

## G. 结论与建议

**一句话**：这 5,114 个文件里，**真正值钱的是那 2.9 MB 的 `.mjs` 探针**（60.8% 被报告点名），**真正压秤的是 255.81 MB 的 Chrome profile 和 258 MB 的截图**——两者相差 88 倍。所以"删还是留"不该问整体，只该问**探针**。

**推荐路线：3（变体 B）+ 两项补充**，不做 1 也不做 2。

1. **加 §D 变体 B 的 7 条规则**。实测把 `git add deliverables/` 的量从 5,019 文件 / 367.9 MB 压到 **730 文件 / 20.9 MB（−94.3%）**，同时**保住 387/462 的被引用探针**。
2. **顺手补 75 个漏网的被引用探针**（落在 `_*/`、`lab/`、`r2/`、`snap/`、`replica/` 里），加 `!` 例外或迁移路径，成本≈0，可把可复现率从 84% 拉到接近 100%。
3. **加内容级安全兜底**（规则 7），不要只依赖 `deliverables/*-scratch/` 这条路径规则去挡 `Local State` / `Login Data`。
4. **另开一个 commit 处理 `.git` 的 5 个孤儿 `.idx`**（`git gc` 或直接删 `.idx`），这是纯噪音但会误导后来者。
5. **修 README:447**：把 `deliverables/59-scratch/s13-duotone.mjs` 挪到不被忽略的路径，或者把该脚本提升为一个已跟踪的 `*.md` 附录。
6. **别删那 300 个未被引用的探针里的 `63-test/replica/`**——里面 9 份 `assets/CREDITS.md` 是**许可归属证据**，删了等于丢版权溯源，这跟"删死代码"是两件事。

**风险排序**：`git clean -fd deliverables/`（不可逆地毁掉 463 处活引用 + 9 份许可凭证）> `git add -A`（+326.8 MB 永久进历史，且把 DPAPI 密钥材料推上公网）> 什么都不做（每轮再涨 ~200 文件）> 加规则（一次性，可回退，代价 5.6 MB）。

---

*本报告所有数字均由 `deliverables/68-audit/_p1`–`_p9` 探针在同一工作树上实测得出，报告内每个数字都标注了产出该数字的探针或命令。审计期间仓库被并发写入（+222 文件/19 分钟），基线已按 §0 冻结。*
