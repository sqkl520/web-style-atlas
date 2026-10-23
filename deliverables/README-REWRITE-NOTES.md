# README 重写执行记录（write-attractive-readme skill）

工作目录 `D:\Web\style`。验收标准 = `_readme-skill-fetch/write-attractive-readme-main/scripts/check-readme.mjs`（24 项静态校验，必须 0 FAIL，全程未用 `--http`）。

**结论先行**：`README.md` **0 FAIL / 0 WARN / 24 PASS**；`README-EN.md` **0 FAIL / 2 WARN / 22 PASS**。
改动文件仅 3 个：`README.md`（+377 行区间）、`README-EN.md`、`deliverables/README-REWRITE-NOTES.md`，另有 `deliverables/44-scratch/`（已 gitignore）。**未 commit、未 push。**

---

## 0. 基线（用户给定，本会话已复现）

```
README.md:    2 FAIL / 10 WARN / 11 PASS   （FAIL = hero/centered, hero/hook）
README-EN.md: 3 FAIL /  9 WARN / 11 PASS   （FAIL = hero/centered, hero/hook, section/honesty）
```

改后：

| 文件 | FAIL | WARN | PASS | 行数 |
|---|---|---|---|---|
| README.md | **0**（2→0） | **0**（10→0） | 24（11→24） | 212 → 433 |
| README-EN.md | **0**（3→0） | **2**（9→2） | 22（11→22） | 214 → 435 |

---

## 1. 备份

- `deliverables/44-scratch/README.orig.md`（21,638 B / 212 行）
- `deliverables/44-scratch/README-EN.orig.md`（24,694 B / 214 行）
- 复算确认：`git check-ignore -v deliverables/44-scratch/README.orig.md` → `.gitignore:62:deliverables/*-scratch/`，**不入库**。
- 本会话辅助脚本也放在该目录（`headings.mjs` / `coverage.mjs` / `parity.mjs` / `isolate-en.mjs`），同样不入库。

---

## 2. 定档：**B 生成物型为主 + A 能力型的机制节**（skill 表里的 A/B/C 之间，偏 B）

判定依据（`references/formula.md` §三）：本仓库的产物是 **30 个可运行 HTML + 3 模板 + 一条文档链**，属"从素材里提炼出产物"；但它又确实带一套可复算的工具链（`_build/` 8 个脚本），所以借 A 档的"核心机制"节。形态不是 C（不面向非中文用户卖产品，双语只是本仓库既定约定）。

采料表（`SKILL.md` 第 2 步）填法：**全部沿用当前 README 已实测值，零新造数字**（见 §8 红线自查）。

### 骨架 14 节的删/留决定（coverage.mjs 实测输出）

| 骨架节 | 决定 | 落在哪个标题 / 删除理由 |
|---|---|---|
| 1 效果示例 | **留**（提到第 1 节，过 `order/effect-first`） | `## 看效果：打开选型台，272 张真截图摊在一页` |
| 2 装上就能用 | **留** | `## 装上就能用` |
| 3 能做什么（能力/交付物/耗时表） | **改造后留** | `## 仓库里有什么`。**不建"典型耗时"列**——仓库内没有任何实测耗时数字，硬编就是伪造。改为「脚本 \| 它管什么」两列表（内容全部来自原 README 工具链段）。 |
| 4 Demo 画廊 / Showcase | **删** | 3/10 命中，要求"每个能力一张 GIF"。本仓库 0 GIF、无 live demo 站，红线禁止借图。替代物 = 选型台真截图（已进第 1 节）+ ASCII 线框。 |
| 5 核心机制 | **留**（B 档本无此节，按 A 档补） | `## 核心机制` / EN `## How this atlas is built: four hard rules`。四条规则全部指向真实文件（`_specs/`、`verify-prototype.mjs --all`、272 截图、`_CURRENT-VALUES.md`）。 |
| 6 和 X 的关系（竞品对比表） | **删** | 5/10 命中，但本项目**没有真实竞品**可核。原 README 里唯一的近似物对比是"30 案层 vs 模板层"，已写进模板层那节的"为什么这一层规则不同"，不升格为竞品表——没有核查日期的对比表就是编造。 |
| 7 安全与数据流 | **留** | `## 只做静态这一件事` / EN `## Static only: nothing leaves your machine`。断言全部可 grep，并给两条复算命令（第一条实测**空输出**）。 |
| 8 Limitations / 诚实边界 | **留（9 条）** | `## 做不到与已知边界` / EN `## Limitations: what this atlas cannot do` |
| 9 仓库结构 | **留** | `## 仓库结构`（tree 原样保留，含"48 个样式表"） |
| 10 起源 / 背后的故事 | **留（改写为机制来源）** | `## 这个图集是怎么造出来的`。**不写人的经历**，只写三条来源：taste-skill/impeccable 回灌、deliverables 文档链、本 README 自己的写法出处（skill 要求"承认来源"）。 |
| 11 关于作者 | **删**（红线） | 平台表 / 账号 / 二维码 / `© 个人姓名` 一律不写。按 skill 指示改写成 `## 反馈与贡献`（含 3 条提 issue 前必跑的复算命令）。 |
| 12 License | **留** | `## License 与署名：MIT，但三类素材不归它管`（三段许可 + 4 个 ⚠️ 例外块全数保留） |
| 13 居中收尾对句 | **留** | 末尾 `<div align="center">` 两行加粗 + 钩子原句重述。 |
| 14 English / 中文摘要节 | **留** | CN 末 `## English`、EN 末 `## 中文`（6 行摘要，不是全文翻译）。 |
| hero 行 12「Star History」 | **删**（红线） | 0 star，不放。 |
| 骨架「唤起话术代码块」 | **删** | 这是 Agent Skill 的用法装置；本项目是 HTML 标本库，**没有可被唤起的话术**，硬塞即伪功能。 |

另：hero 行 2 的双语切换行**保留但改指向**——原文件第 1 行的 `[English](README-EN.md) | 简体中文` 换成 skill 写法 `<sub>🌐 <b>中文</b> · <a href="README-EN.md">English</a></sub>`，EN 侧用 `**English** · [简体中文](README.md)`（后者是 `section/english` 的另一个合法触发形态）。

---

## 3. 中文 README.md 改动

1. **新增 hero**（13 行顺序照 `formula.md`）：`<div align="center">`（第 3 行，落在前 20 行内）→ `# 网站设计风格图集` → 钩子 `> *「30 个能跑的风格，不是 30 张配色图。」*`（21 字，过 `hero/hook-len`）→ 4 枚 badge → 居中加粗价值主张（第 16 行，独立成行）→ `<sub>纯静态 ——…` 兼容声明 → 问题陈述段（4 行，第二人称 + 反问 + 具体场景）→ 一行安装代码块 → 导航锚点行（5 个锚点）→ `</div>` → `---`。
2. **`## 功能特性` 拆掉**（原 WARN 的泛化标题），内容重排进三节：`## 看效果…`、`## 仓库里有什么`（含工具链表）、`## 只做静态这一件事`。
3. **`## 快速开始` → `## 装上就能用`**（命中 `section/安装`），且**移到效果节之后**。
4. **新增效果节并排在全篇第 1 节**：效果 = "打开选型台看 272 张真截图"，指向 `prototypes/_selection/`；**没有 GIF，也没有借任何图**，视觉证据 = 仓库内可打开的文件 + 一段 ASCII 线框（线框里的每一格都是 `data.js` 的真实字段值，见 §8）。
5. **`## 已知缺口` → `## 做不到与已知边界`**（命中 limHead 的 `做不到` + `边界`），9 条负面结论全部改为行首 `❌`，并补回原文被漏掉的一条（`index.html` 30–48.4 KB / S29 = 49,512 B）。
6. **新增 `## 核心机制`**（命中 `section/机制`）、**`## 只做静态这一件事`**、**`## 这个图集是怎么造出来的`**、**`## 反馈与贡献`**、**`## English`**、居中收尾对句。
7. **`## 部署指南` → `## 部署四阶段：推到 Pages 只要留一个文件`**（断言句标题），四阶段全部子标题与命令原样保留。
8. **`## 目录结构` → `## 仓库结构`**；**`## 授权与署名` → `## License 与署名：MIT，但三类素材不归它管`**（命中 `section/License`）。
9. **语气按 `voice.md` 11 条**：`——` 补刀 34 处、独立加粗断言行 27 处、`不是 X，是 Y` 4 处、反问开头。禁用词零命中（校验器 `voice/hollow-adjectives` = 零空泛形容词）。
10. **本机路径清理**：原 `render-scheme.mjs` 代码块注释里的 `D:/Web/style` 改成"指向开发机上的仓库根"（校验器原本判 PASS，但按指示不新增/不保留本机绝对路径）。

---

## 4. 英文 README-EN.md 改动（与中文**逐节对译**，约定未破坏）

标题一一配对（14 组）：

| 中文 | 英文 |
|---|---|
| 看效果：打开选型台，272 张真截图摊在一页 | See the proof: 272 real screenshots on one bench |
| 装上就能用 | Install and open it over HTTP |
| 仓库里有什么 | What you get: 30 schemes, 30 prototypes, 3 templates |
| 模板层：改 12 个变量就是一个站 | The template layer: change 12 variables and it is yours |
| 核心机制 | How this atlas is built: four hard rules |
| 部署四阶段：推到 Pages 只要留一个文件 | Deployment: four stages, and one file you must keep |
| 渲染与验收 | Rendering and verification |
| 只做静态这一件事 | Static only: nothing leaves your machine |
| 做不到与已知边界 | Limitations: what this atlas cannot do |
| 仓库结构 | Repository layout |
| 这个图集是怎么造出来的 | How this atlas was made |
| 反馈与贡献 | Feedback and contributions |
| License 与署名：MIT，但三类素材不归它管 | License and attribution: MIT covers code, not fonts or photos |
| English（CN 内）/ 中文（EN 内） | 互为镜像 |

`## Features` 虽不在中文泛化黑名单里（黑名单是全角中文词），但按 skill 精神一并改成断言句 —— 这就是 EN 侧 `voice/headings` 从"本来就 PASS"变成"精神上也 PASS"。
`## Quick start` → `## Install and open it over HTTP`（同时命中 `section/安装`）。
`## Known gaps` → `## Limitations: what this atlas cannot do`（命中 `limitation`）。
原 EN 侧 `evidence/reproducible` 判 PASS 的理由是"未做需复算的断言"（因为中文断言词不在英文正文里）；重写后正文有 `git ls-files … | wc -l` 等命令块，仍是 PASS。

---

## 5. honesty 过关手段（证明**没有**往英文正文塞中文词）

`section/honesty` 判据 = `limHead && negCount>=1`。

**中文**：标题 `## 做不到与已知边界` 命中 `做不到` + `边界`；正文原有 inline 负面结论（`不能`／`无法`／`不支持`／`限制`／`未清`）+ 9 个 `❌` → **`局限节 + 19 处负面结论`**。

**英文**：
1. `limHead` ← 标题 `## Limitations: what this atlas cannot do` 命中 `limitation`（正则大小写不敏感）。
2. `negCount` ← **10 个 `❌` 前缀**，每个都标记一条真实负面结论（8 条闸门 FAIL、底色同质、两条额外同质、选型台抽段缺陷、题材缺口、`#888888` 灰块、`measure` 中文假阳性、`file://` 失效、"不是设计系统"）。`❌` 语言中性，且**本来就是"做不到"的意思**（`voice.md` §8 引 huashu-chrome 原例：`它在效果表里故意留一行 ❌ 做不到`），**不是伪造声明**。

**复算证据**（把英文正文与文末 `## 中文` 镜像节切开后单独跑校验器）：

```
## 中文 at 1-based line 417
English-body negCount = 10 {"❌":10}
CJK chars in English body = 4 -> 简体中文
```

- negCount 的**全部 10 个命中都是 `❌`**，零个中文负面词。
- 英文正文里唯一的 CJK 是第 1 行语言切换条的 `简体中文` 四个字符（原本就有，非为校验而加）。
- 用 `EN-body-only.md` 单跑校验器：`0 FAIL / 2 WARN / 22 PASS`，`section/honesty` 仍 **PASS**。→ honesty 的 PASS **不依赖任何中文词**。

（注：整份 `README-EN.md` 报 13 处，因为文末 `## 中文` 摘要节里有 3 个 `做不到`——那是**本仓库既有的中文镜像约定**，不是为凑正则塞进英文正文的。）

---

## 6. 改标题 → 锚点影响清单

`links/anchors` 在两轮之间**一度真的崩过一次**，修法与最终状态如下。

### 被删除的旧标题（原文里没有任何 `[..](#..)` 指向它们，所以删除不产生死链）

| 语言 | 旧标题 | 旧 slug | 处置 |
|---|---|---|---|
| CN | `## 功能特性` | `#功能特性` | 拆分重排（泛化标题 WARN 清零） |
| CN | `## 3 个大众化模板（templates/）` | `#3-个大众化模板templates` | → `## 模板层：改 12 个变量就是一个站` |
| CN | `## 快速开始` | `#快速开始` | → `## 装上就能用` |
| CN | `## 部署指南` | `#部署指南` | → `## 部署四阶段：推到 Pages 只要留一个文件` |
| CN | `## 授权与署名` | `#授权与署名` | → `## License 与署名：MIT，但三类素材不归它管` |
| CN | `## 已知缺口` | `#已知缺口` | → `## 做不到与已知边界` |
| CN | `## 目录结构` | `#目录结构` | → `## 仓库结构` |
| EN | `## Features` / `## The 3 mainstream templates` / `## Quick start` / `## Deployment` + 4 个 `### Step N` / `## Licensing and attribution` / `## Known gaps` / （`## Repository layout` 与 `## Rendering and verification`、`## Dependencies` 保留原名） | — | 同上逐节对应；`### Step N` → `### Stage N`（正文交叉引用"see Deployment, step 2"同步改成 stage 2） |

### 新增标题及其被引用情况

CN 新增 8 个节标题，其中 **5 个被导航行引用**、**3 个被正文引用**：
`#看效果打开选型台272-张真截图摊在一页`（导航行）、`#装上就能用`（导航行 + badge `Build: none`）、`#仓库里有什么`（导航行 + badge `Schemes: 30`）、`#核心机制`（导航行）、`#做不到与已知边界`（导航行 + 正文 2 处）、`#模板层改-12-个变量就是一个站`（正文）、`#渲染与验收`（正文）、`#只做静态这一件事`（badge `Static-only`）。
EN 同构：`#see-the-proof-272-real-screenshots-on-one-bench`、`#install-and-open-it-over-http`、`#what-you-get-30-schemes-30-prototypes-3-templates`、`#how-this-atlas-is-built-four-hard-rules`、`#limitations-what-this-atlas-cannot-do`（+ 正文）、`#the-template-layer-change-12-variables-and-it-is-yours`、`#rendering-and-verification`、`#static-only-nothing-leaves-your-machine`（badge）。

### 中途踩到的一次真崩（两轮内解决，按要求贴原文）

第一次写完后校验器报：

```
FAIL links/anchors            死锚点 1 个：[看效果](#看效果打开选型台272-张真截图摊在一页)
```

原因：我把节标题写成 `## 打开选型台：272 张真截图摊在一页`，`slugify` 后是 `#打开选型台272-张真截图摊在一页`，而导航行按"效果"节名拼了 `#看效果…`。
修法：把标题改成 `## 看效果：打开选型台，272 张真截图摊在一页`（`，` 被 slugify 吃掉，结果正好等于锚点）。
同轮还修了 `section/License`：`## 许可与署名…` → `## License 与署名…`（`License` 是英文正则项）。

### 最终状态

```
README.md     links/anchors  PASS  全部 29 个页内锚点可解析   （原 21 个）
README-EN.md  links/anchors  PASS  全部 30 个页内锚点可解析   （原 22 个）
```

页内锚点链接条数：CN 9 条、EN 8 条（`headings.mjs` 逐条列出，全部命中真实标题）。
最后一次改标题（收尾对句、钩子句、"第 20 个"改写）之后**重跑确认仍全 PASS**（见 §9 的最终原样输出）。

---

## 7. 保留的 WARN 与理由

CN：0 个 WARN。

EN 保留 2 个，都是**工具语种盲区，不是内容缺陷**：

1. **`WARN section/机制`** — 判据是中文词表 `机制|原则|工作原理|怎么造|工作流|流程`。英文正文对应节是 `## How this atlas is built: four hard rules`，内容确实存在（四条硬规则、每条指向真实文件），**语义完全命中"机制/怎么造"**，只是词表没有英文同义词。唯一"安全过检"的办法是往英文标题里塞中文词——已被明令禁止。**保留。**
2. **`WARN voice/not-but`** — 判据正则 `不是[^。，、\n]{1,20}[，,]\s*(而?是|就?是|它|那)`，要求中文逗号与中文"不是/是"。英文等价句式在文中大量存在（`not a colour skin but a complete design argument`、`five questions about your situation, not "what style do you like"`、`no build step, no backend`、`it is a functional precondition, not a style suggestion`、`not a design system`）。要让正则命中只能插中文标点或中文词。**保留。**

其它 WARN 全部已消除（`hero/badges` 0→4、`hero/nav` 缺→有、`section/效果`/`安装`/`License`→命中、`order/effect-first`→效果节在前、`section/english`→新增摘要节；EN 侧 `voice/dash` 1→42）。

---

## 8. 红线自查

| 红线 | 结论 |
|---|---|
| 不写作者身份内容 | **无**平台表 / 账号 / 二维码 / `关于作者` 节 / `© 个人姓名`。出口改写成 `## 反馈与贡献`。 |
| 0 star 不放 Star History | **未放**。`evidence/assets` PASS（无 `.gif`/`.mp4`/`star-history`/star 数/教程账号链接）。 |
| 不伪造证据、不新造数字 | **无新造数字**。全文数字逐条沿用原 README 实测值：30 案 / 26 达标 / 8 条 FAIL / 272 张截图 / 18/30=60% / ΔE76 4.39 / 19 案 63% / 83% / 97% / 17%·60%·73% / 8·17 / axes.loud 2 案·19 案 / 110° / 20–60 / 246 张 / 49.86%·24.27%·0.236% / 5818 vs 2 / 56 位图·43 唯一图·38 复现不出 / 11 行·7 行·5 行 / 183 of 287 / 12/30 案 / 28 处 / 30–48.4 KB·49,512 B·14 KB / 48 个样式表 / 500·752 CSS px / 180 MB / 12 变量·12 字段 / 9.15·§9.15 未引用不新增。新增的**唯一**一个新数：`9 处` 署名链接（本会话 `Select-String` 实测 `S14/index.html` 中 `<a href="https?://` = 9）。另外把两处**非实测**的修辞数字**删掉了**：hero 问题陈述段的"翻到第 20 个"改成"越翻越眼熟"；收尾自贬句的"80 分 / 100 分"补注"这是定位说法，不是实测评分"。 |
| badge 只放可复算事实 | 4 枚：`License-MIT`（LICENSE 在库）、`Schemes-30`（`git ls-files prototypes/S*/index.html` = 30）、`Build-none`、`Static-only-no backend`。License 放第一。**没有** `Quality:A+` 这类无依据 badge。 |
| 没有真 GIF 就不借图 | **未借图**。效果节 = `prototypes/_selection/`（可打开的文件）+ 一段 ASCII 线框。线框里每一格都用 `data.js` 真实值核对过：`S07` = `cn:"铅灰油墨目录"`、`fr:"F"`、`threshold:"低"`、`tone:"学术档案 / 严肃出版"`、`errorCode:"MIR-47"`、`gate.fail:1` + `failIds:["mono"]`、`screens:5`、`realPictures:6`。（**这一条我最初写错过**：第一版线框凭印象写了 `调性：克制` 和 `闸门 FAIL 0 · 错误码 LEAD-07`，实测后改为真值 `学术档案 / 严肃出版` 与 `FAIL 1（mono） · MIR-47`。这是本次执行中唯一的自造内容，已修正并在此记录。） |
| 改写不是新增功能，保留全部技术信息 | 部署四阶段（含 `.nojekyll` 与 Jekyll 丢下划线目录的警告、`gh api` 等价命令、4 平台表、nginx 缓存、阶段 4 的 `_fonts/` 依赖）、许可三段表 + 4 个 ⚠️ 例外块（56/43/38 两口径、11 行、6 条根因机制、5 行无 URL、28 处占位、texture-job.json 依据不可核、2bis 派生件）、已知缺口 9 条 —— **逐条保留**。用 `coverage.mjs` 对 143 项关键事实串做了双向存在性扫描；`parity.mjs` 对 142 项做了中英对齐扫描，报出的差异全部是措辞粒度差异（如 EN 写 `12 of 30 schemes` 而 CN 写 `12/30 案`），无缺失事实。 |
| 不碰其他文件、不 commit | `git status --porcelain` 中属于我的只有 ` M README.md`、` M README-EN.md`、`?? deliverables/README-REWRITE-NOTES.md`（`?? _readme-skill-fetch/` 是用户预先下载的 skill，`deliverables/44-scratch/` 被 gitignore 不显示）。`git diff --stat -- README.md README-EN.md` = 605 insertions / 163 deletions。**未执行任何 git commit / push / add。** |
| 本机路径 | 正文**无** `D:/Web/style`、`D:\`、`C:\Users`、`/Users/`、`/home/`、`Desktop\`（用禁用词+路径联合 grep 扫过，两文件零命中）。`privacy/paths` PASS。 |
| 占位符 | 无 `{{}}` / `TODO:` / `FIXME`。`lint/placeholders` PASS。 |

### 一处需要用户知情的仓库并发现象（不是我做的）

本会话期间**有另一个 agent 在同时改工作树**：`prototypes/S15/S22/S25/S26` 的 `style.css`（对比度修色，注释里标 `T0-6（U–G2）`）与它们的 `.inspect/*.jpg`、`report.json`（重新渲染）被改成 ` M`，并且在 `02:10:21` 有一个不属于本会话的 commit `99e2cad docs(attribution): 修正署名缺口数字并保护仓库…`。
我核对过影响：
- 那些 `report.json` 的 diff 只有 `at` 时间戳与像素 `share` 的抖动，**闸门计数没变**——`data.js` 现算仍是 `gate.fail===0` 的案数 **26/30**、总 FAIL **8**（与文中数字一致）。
- `git ls-files "prototypes/S*/.inspect/*.jpg"` 仍是 **272**。
- `CREDITS.md` / `credits.json` 在本会话内**没有任何文件被改动**（按 mtime 与 git status 双向确认），所以授权节里的 56 / 43 / 38 / 11 / 7 / 5 等数字未受影响。
- 我**没有**触碰 `prototypes/` `templates/` `_build/` `deliverables/` 既有文件、`LICENSE`、`.gitignore`。
建议：定稿前把这两条线（README 与对比度修色）分开 commit，或让用户确认对方已完成。

---

## 9. 校验输出（最终原样，2026-10-24 实跑，不带 `--http`）

### README.md

```
PASS hero/centered            <div align="center"> 需在文件前 20 行内
PASS hero/hook-len            钩子 21 字：「30 个能跑的风格，不是 30 张配色图。」
PASS hero/badges              badge 4 个
PASS hero/div-balance         <div> 2 开 / 2 闭
PASS hero/value               ok
PASS hero/nav                 ok
PASS links/anchors            全部 29 个页内锚点可解析
PASS section/效果               ok
PASS section/安装               ok
PASS section/机制               ok
PASS section/License          ok
PASS section/honesty          局限节 + 19 处负面结论
PASS order/effect-first       ok
PASS voice/hollow-adjectives  零空泛形容词
PASS evidence/reproducible    有可复算命令块
PASS evidence/assets          无需外部资产的证据
PASS privacy/paths            无本机路径泄漏
PASS lint/placeholders        无占位残留
PASS voice/dash               破折号补刀 34 处
PASS voice/not-but            「不是 X，是 Y」句式 4 处
PASS voice/bold               独立加粗断言行 27 处
PASS voice/headings           标题无泛化命名
PASS section/english          有 English 节/双语切换行
PASS lint/length              433 行

README.md: 0 FAIL / 0 WARN / 24 PASS
```

### README-EN.md

```
WARN section/机制               缺「机制」节。
WARN voice/not-but            「不是 X，是 Y」句式 0 处（22 处 / 10 样本，是定位差异的主力句式）
PASS hero/centered            <div align="center"> 需在文件前 20 行内
PASS hero/hook-len            钩子 34 字："30 runnable styles, not mockups."
PASS hero/badges              badge 4 个
PASS hero/div-balance         <div> 2 开 / 2 闭
PASS hero/value               ok
PASS hero/nav                 ok
PASS links/anchors            全部 30 个页内锚点可解析
PASS section/效果               ok
PASS section/安装               ok
PASS section/License          ok
PASS section/honesty          局限节 + 13 处负面结论
PASS order/effect-first       ok
PASS voice/hollow-adjectives  零空泛形容词
PASS evidence/reproducible    未做需复算的断言
PASS evidence/assets          无需外部资产的证据
PASS privacy/paths            无本机路径泄漏
PASS lint/placeholders        无占位残留
PASS voice/dash               破折号补刀 42 处
PASS voice/bold               独立加粗断言行 29 处
PASS voice/headings           标题无泛化命名
PASS section/english          有 English 节/双语切换行
PASS lint/length              435 行

README-EN.md: 0 FAIL / 2 WARN / 22 PASS
```

---

## 10. 改前 vs 改后结构对照

| # | 改前（CN / EN） | 改后（CN / EN） |
|---|---|---|
| 1 | 第 1 行纯文本语言切换 + 一段 `> ⚠️` 免责 + `#` 标题 + 功能描述段 | hero 13 行：`<div align="center">` + `#` + 钩子 + 4 badge + 加粗价值 + `<sub>` 兼容 + 问题陈述 + 一行安装 + 导航锚点行 + `</div>` + `---` |
| 2 | `## 功能特性`（泛化，WARN） | `## 看效果：打开选型台，272 张真截图摊在一页` ← **新第 1 节，排在安装前** |
| 3 | `## 3 个大众化模板（templates/）` | `## 仓库里有什么`（内容 + 工具链表） |
| 4 | `## 快速开始`（在模板节之后） | `## 装上就能用`（第 2 节，命中安装） |
| 5 | — | `## 模板层：改 12 个变量就是一个站` |
| 6 | — | `## 核心机制`（新增，四条硬规则，命中机制） |
| 7 | `## 部署指南` | `## 部署四阶段：推到 Pages 只要留一个文件`（四阶段全留） |
| 8 | `## 渲染与验收`（含 `D:/Web/style` 注释） | 同名保留，本机路径改为"开发机上的仓库根" |
| 9 | — | `## 只做静态这一件事`（新增，可 grep 断言 + 2 条复算命令） |
| 10 | `## 授权与署名` / `## 已知缺口`（标题不含判据词 → FAIL/WARN） / `## 目录结构` | `## License 与署名：MIT…` / `## 做不到与已知边界`（9 条 `❌`，honesty PASS） / `## 仓库结构`；末尾新增 `## 这个图集是怎么造出来的`、`## 反馈与贡献`、`## English`、居中收尾对句 |
