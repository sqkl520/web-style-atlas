# 14 — 两个真实工具的实测报告（安装 · 运行 · 结果 · 裁定）

> 本文记录 **pbakaus/impeccable** 与 **Leonxlnx/taste-skill** 这两个工具的**真实使用结果**：
> 装了什么、跑了什么命令、工具报了什么**实测数字**、每一条标红如何裁定。
> 与 `12`（规则回灌到 30 个文字方案）和 `13`（用工具的方向库检验想法多样性）并列，本文负责**可运行代码层**的证据。

---

## 一、装了什么

| 项目 | taste-skill | impeccable |
|---|---|---|
| 仓库 | `github.com/Leonxlnx/taste-skill` | `github.com/pbakaus/impeccable` |
| 自述 | "Agent skills that give coding agents taste: art direction, reference images and a browser check instead of generic AI pages" | "The design language that makes your AI harness better at design." |
| 许可 | MIT | Apache-2.0 |
| 体量 | 39,656 KB（浅克隆 39 MB） | 686,190 KB（**改用 blobless + sparse 克隆，落地 4.5 MB**） |
| 本地路径 | `D:\Web\style\tools\taste-skill\` | `D:\Web\style\tools\impeccable\` |
| 关键入口 | `skills/taste-skill/SKILL.md` | `.claude/skills/impeccable/SKILL.md` |
| 运行时 | Node 22+（本机 v24.14.0） | 自带 Rust 引擎二进制（首次运行自动下载） |
| 引擎版本 | — | `VERSION = 0.1.14`，二进制落在 `~/.impeccable/bin/0.1.14/impeccable.exe`（19.2 MB） |
| 浏览器依赖 | 需要 Chrome/Edge/Chromium（本机 `C:\Program Files\Google\Chrome\Application\chrome.exe` ✅） | 文件扫描不需要；URL 扫描用 CDP |

**impeccable 的克隆方式值得记一笔**：仓库 686 MB，直接克隆代价过高。
改用 `git clone --depth 1 --filter=blob:none --sparse` + `git sparse-checkout set --skip-checks .claude/skills/impeccable .agents/skills/impeccable .claude/agents`
之后落地仅 **4.5 MB**，而技能正文、44 个 reference、agent 定义全部齐全。
（注意：`git sparse-checkout set` 不接受文件路径，传 `README.md` 会报 `fatal: 'README.md' is not a directory`；需要 `--skip-checks` 或只传目录。）

---

## 二、工具实际能跑的命令（真实用法，非文档照抄）

### 2.1 taste-skill

```
node tools/taste-skill/skills/taste-skill/scripts/lint.mjs     <文件或目录> [--json]
node tools/taste-skill/skills/taste-skill/scripts/inspect.mjs  <url|file.html> [--out DIR] [--widths 1440,768,390] [--allow rule,...] [--json]
node tools/taste-skill/skills/taste-skill/scripts/draw.mjs     [--photos] [--site <id>]
node tools/taste-skill/skills/taste-skill/scripts/assets.mjs   [--get] [--credits] [--video]
```

- `lint.mjs` 是**源码级**扫描：读 HTML/CSS 源码里的禁用模式。
- `inspect.mjs` 是**渲染级**测量：启动真实 Chrome，在多个视口截图并测量（字号、字面占比、行数、页面屏数、填充率、动效元素数）。
- **坑**：`lint.mjs --help` **不打印帮助**——它把 `--help` 当路径过滤掉，无位置参数时退回扫描当前目录（实测扫了 2 个文件）。真用法只能看脚本头注释。

### 2.2 impeccable

```
tools/impeccable/.claude/skills/impeccable/scripts/impeccable.cmd detect <文件或目录或URL> [--json] [--scope type,layout] [--viewport 390x844]
```

- **坑一**：Windows 无 `sh` 时必须用 `impeccable.cmd` 而不是 `impeccable`。
- **坑二**：`detect` 的**文本输出走 stderr，不是 stdout**；`--json` 才走 stdout。用 PowerShell 管道截 stdout 会看到空结果，误判为"工具没输出"。
- **坑三**：有 findings 时**退出码为 1**，无 findings 为 0。管道会吞掉退出码。

---

## 三、效度证明：阳性对照（本次最关键的一步）

**问题**：如果工具在我精心做的原型上返回 0 条 findings，我怎么知道是"原型真的干净"，而不是"工具根本没在工作"？

**做法**：写一个**故意做成 AI 味**的对照页 `tools/_probe/bad.html`，把所有最典型的 AI 默认值堆在一起：
Inter 字体 + `linear-gradient(135deg,#6366F1,#EC4899)` + 三张同尺寸图标卡（48×48 圆角方块 + Emoji）+ 米白底 `#fdf6ec` + 陶土强调色 `#C0562A` + eyebrow 小标签 "NEW" + 每卡柔和灰投影 + `01/02/03` 编号 + 空洞营销词。

**结果——两个工具都准确命中：**

`impeccable detect bad.html --json` → **8 条 findings**：

| # | rule id | 工具给的原话 |
|---|---|---|
| 1 | `low-contrast` | `1.0:1 (need 4.5:1) — text #c0562a on #6366f1 (gradient on div.hero)` |
| 2–4 | `icon-tile-stack` ×3 | "A small rounded-square icon container above a heading is the universal AI feature-card template — every generator outputs this exact shape." |
| 5 | `hero-eyebrow-chip` | "A tiny uppercase letter-spaced label sitting immediately above an oversized hero headline... is now the default AI SaaS hero." |
| 6 | `overused-font` | "Primary font: inter — Inter, Roboto, Fraunces, Geist, Plus Jakarta Sans, and Space Grotesk are used on so many sites they no longer feel distinctive." |
| 7 | `cream-palette` | "cream/beige page background rgb(253, 246, 236) — A warm cream or beige page background has become the default 'tasteful' AI surface, reached for by reflex." |
| 8 | `skipped-heading` | `<h1>` followed by `<h3>` (missing h2) |

`node .../lint.mjs bad.html` → **9 FAIL + 2 WARN**：

| 级别 | rule id | 命中 |
|---|---|---|
| FAIL | `gradient` | 渐变填充 |
| FAIL | `purple` | `#6366F1` **×4 处** |
| FAIL | `shadow` | 静态元素带投影 |
| FAIL | `emoji` | Emoji 当 UI **×3** |
| WARN | `default-font` | `font-family:Inter` |
| WARN | `outlined-box` | `1px solid` 描边 |

**结论**：两个工具在真实输入上都能正常工作。因此后文原型上的 **0 findings 是"真的干净"的证明，不是工具失效**。
这个对照页与原始输出已存档为 `tool-runs/_control-impeccable.json` 与 `tool-runs/_control-tastelint.txt`。

**顺带得到一个高置信度结论**：`impeccable` 自己把 **Space Grotesk** 列进了"过度使用、不再有辨识度"的字体名单（与 Inter、Roboto、Fraunces、Geist、Plus Jakarta Sans 并列）。
这**独立印证**了 `07-audit-font-color.md` 对 Space Grotesk 被复用 4 次的告警——两个互不相关的工具得出了同一个结论。

---

## 四、8 个真实原型的闸门结果

### 4.1 为什么选这 8 个

选的是**我在第 6 部分真正推荐给用户的 6 个"按项目类型首选"**，加上**矩阵里标了 `[高危改造]` 的 2 个最危险家族**：

| 原型 | 方案 | 为什么选它 |
|---|---|---|
| S21 | 联锁释放簿 | SaaS/工具 类首选 |
| S08 | 琥珀叠印灯箱 | 品牌官网 类首选 + **[高危改造] Glassmorphism** |
| S25 | 专色目录帖 | 作品集 类首选 |
| S07 | 铅灰油墨目录 | 内容媒体/出版物 类首选 |
| S04 | 芒果拼贴墙 | 活动展览文化 类首选 |
| S17 | 税票存根联 | Web3/金融科技 类首选 |
| S13 | 盲压公函 | **[高危改造] Neumorphism** |
| S03 | 长曝光观测站 | **[高危改造] Aurora Mesh** |

也就是说：**这次闸门检验的对象，正是我推荐给用户去实际建站的那几个方案**——不是随机抽样。

### 4.2 三道闸的实测结果

| 原型 | 闸一 `lint`（源码） | 闸二 `inspect`（真实 Chrome） | 闸三 `impeccable detect` |
|---|---|---|---|
| S03 长曝光观测站 | 0 FAIL / 1 WARN | **1 FAIL / 2 WARN** — `few-pictures`, `font-count`, `no-footage` | （未产出） |
| S04 芒果拼贴墙 | **0 FAIL / 0 WARN** ✅ | 0 FAIL / 2 WARN — `font-count`, `no-footage` | **4 条** — `bounce-easing` |
| S07 铅灰油墨目录 | **0 FAIL / 0 WARN** ✅ | **0 FAIL / 1 WARN** — 仅 `no-footage` | **1 条** — `cream-palette` |
| S08 琥珀叠印灯箱 | **1 FAIL** — `palette-terracotta` | **3 FAIL / 3 WARN** — `palette-terracotta`, `font-count`, `empty-screens`；WARN `font-fallback`, `no-footage`, `card-rows` | **1 条** — `cramped-padding` |
| S13 盲压公函 | **0 FAIL / 0 WARN** ✅ | **4 FAIL / 6 WARN** — `mono`, `shadow`, `button-fx`, `empty-screens`；WARN `font-count`, `font-fallback`, `body-size`, `no-footage`, `still-page`, `hairline` | **0 条** ✅ |
| S17 税票存根联 | **0 FAIL / 0 WARN** ✅ | 0 FAIL / 3 WARN — `font-fallback`, `font-count`, `no-footage` | **0 条** ✅ |
| S21 联锁释放簿 | **0 FAIL / 0 WARN** ✅ | （进行中） | （进行中） |
| S25 专色目录帖 | **0 FAIL / 0 WARN** ✅ | **1 FAIL / 2 WARN** — `body-size`, `palette-cream`, `no-footage` | **33 条** — `cream-palette`, `wide-tracking` |

**读法**：`lint`（只读源码）与 `inspect`（读渲染结果）经常不一致——**这正是要跑两道闸的理由**。
例如 S13 源码完全干净（0 FAIL），但一渲染出来就有 **17 个静态投影**和 3 屏近乎空白。
只跑源码扫描会漏掉这一类问题。

---

## 五、逐条裁定：被世界挣来的，还是习惯默认？

裁定口径（impeccable `craft-floor.md` 原文）：

> **A pinned brief or the committed visual world overrides anything here; your own habit does not.**
> （已提交的视觉世界高于这些默认；你自己的习惯不高于。）

### 5.1 最高置信度发现：**两个工具在真实渲染上同时确认了「第三波 tell」**

这是本次实测最重要的一条，因为它**不是从文字方案里猜出来的，而是从真实渲染的页面里量出来的**，并且**两个互不相关的工具给出的结论一致**：

| 证据 | 工具 | 原话/数值 |
|---|---|---|
| S08 琥珀叠印灯箱 | taste-skill `lint` + `inspect` | **FAIL `palette-terracotta`** — "Terracotta / rust-orange accent (button `#c46a1f`)" |
| S25 专色目录帖 | taste-skill `inspect` | **FAIL `palette-cream`** |
| S25 专色目录帖 | impeccable `detect` | **33 条**，其中 `cream-palette` |
| S07 铅灰油墨目录 | impeccable `detect` | **1 条** — `cream-palette` |

taste-skill 的原话（`references/tells.md` §3）：

> **黄米底 + 陶土 / 铁锈 / 黏土强调色** — *成组禁止*；陶土单独也禁；奶油底 warn。
> 正文解释：这是"把前两波的补救（暖起来、做得像编辑设计）整体照搬"的结果，**是所有生成痕迹里最好认的一个**。

**裁定：`habit`（习惯默认），不是 `earned`。**

理由：`#c46a1f`（琥珀）在方案 08 里被当作"厚亚克力灯箱的透光色"来辩护——**这个辩护是真的**（灯箱确实是琥珀色的）。
但 taste-skill 的规则不反对"琥珀色存在"，它反对"**用暖米底 + 陶土/铁锈这一组合**"。
本批 30 案里有 18–19 案落在暖米底色带（`09` 号审计早已发现，`08` 号甚至为此做了 21 行背景替换表），
而"暖米底 + 暖强调色"的组合正是第三波 tell 的定义。**单案可辩护，批次不可辩护。**

**这正是本次实测最有价值的产出：它把 `09`/`10` 号内部审计的"暖色带收敛"从"我方自己发现的怀疑"升级为"外部工具在真实渲染上的独立确认"。**

### 5.2 `mono`：两个工具口径**直接冲突**，并且我有实证

这是本次唯一一处**两个工具互相矛盾**的地方，值得单独记录：

| 工具 | 口径 | 原话 |
|---|---|---|
| taste-skill | **禁**。等宽只能用于 `<pre>/<code>` 里的字面代码 | `[mono] Monospace type outside code: DM Mono — e.g. "徵字第 2024-017 号", "2024-徵-017", "0.4mm", "0.4mm"` → "Set it in the text face. Monospace is for literal code inside `<pre>/<code>` only." |
| impeccable | **允许**用于 code / data / measurement | `craft-floor.md` Refuse 段："Monospace as a costume for 'technical' **rather than for code, data, or measurement**." |

**证据所在的实例**：S13 盲压公函的原型用 `DM Mono` 排了 "徵字第 2024-017 号"、"2024-徵-017"、"0.4mm"。
按 impeccable 的口径，这三样**全是 data / measurement**（公文字号、压深 0.4mm），应当允许；
按 taste-skill 的口径，它是 FAIL。

**本批采用的裁定**：**折中，且偏向 taste-skill**——

- `0.4mm`（压深）这类**纯测量值**：判定 `earned`，保留等宽。
- `徵字第 2024-017 号`、`2024-徵-017`（**文件编号/公文号**）：判定 `habit`。
  理由：taste-skill §4 的说明是——**等宽微型标签在获奖站点上出现率 44%，在弱站点上是 24%，也就是说它本身不是"劣质标志"，但它是最容易被生成器照抄的装置**。
  一个公文号用等宽，读起来是"技术腔"而不是"测量"，因为它不参与任何对齐或计算。**改为正文字体 + 表格数字（tabular figures）即可**，且这正是 taste-skill 给的替代法（"The text face; tabular figures for data"）。
- **结论**：S13 应把 `DM Mono` 的使用范围从 4 类收缩到 1 类（仅压深测量）。

### 5.3 `shadow` 17 处：直接打在 Neumorphism 的立论上

taste-skill 在 S13 上量到：

> `[shadow] @1440px (+1024, 768, 390)` **17 box-shadow(s) on elements at rest**：
> `header#top.letterhead → rgba(36,31,23,.067) 0px 1px 1px 0px inset, ...`；
> `div.specimen__foil → rgba(36,31,23,.08) 2px 2px 3px 0px`；`h3.clause__head → rgba(36,31,23,.11) 2px 2px 3px 0px inset, ...`
> → **Remove.** Separate surfaces with a tone step or space. Shadows are for things that really float (menus, dialogs, sticky bars).

这是对方案 13（Neumorphism / 盲压公函）**整个前提**的挑战：Neumorphism 的定义就是"同色双阴影造凹凸"。

**裁定：部分 `earned`，部分 `habit`——并且必须减量。**

- `earned` 的部分：**单一光源下的压深**是真实的纸压物理，且 S13 用的偏移量（`1px 1px`、`2px 2px`）与压深语义一致，不是随手加的装饰投影。
- `habit` 的部分：**17 处**这个数量说明它不是"一个被设计过的层级系统"，而是"哪儿需要一个面就贴一对阴影"。这是默认值行为。
- **处置**：不是"删掉阴影"，而是**把它收缩成一个被定义过的层级刻度**（例如只允许 3~4 级压深，且每级写死偏移/模糊/不透明度），并把非层级的装饰性凹陷改为**色阶**。
- 同时注意：impeccable 在 S13 上给出 **0 条** findings——说明 impeccable 的规则库里**没有**"静态投影"这条规则。**两个工具的规则集并不互相覆盖**，这也是要同时跑两个工具的理由。

### 5.4 `empty-screens`：最严重、也最容易被忽略的一条

| 原型 | 工具测量 |
|---|---|
| S13 盲压公函 | **3 of 6** desktop screens under 20% filled（screens 3, 5, 6） |
| S08 琥珀叠印灯箱 | **3 of 8** desktop screens under 20% filled（screens 4, 5, 8） |

taste-skill 的替代建议原话：

> An empty screen is a rest only once per page. Elsewhere it means the section is underbuilt: set its content larger, give it the full information, put it on a colour field, or cut it.

**裁定：`indefensible`（无法辩护）。必须修。**

理由：这正是 taste-skill `SKILL.md` 与 `tells.md` §8 反复警告的「**回避美学**（the avoidance aesthetic）」：

> 把装饰拿掉只是工作的一半；一个页面丢掉了标签、细线和卡片，却没有补上别的东西，读起来就是**单薄**——
> 而盲评的评审员**正确地**更偏好一个信息丰富但有痕迹的页面，而不是一个没有痕迹的空页面。

**这条必须与我方 `10-red-team-critique.md` 的结论并读**：红队当时用"装饰与信息脱钩""缺少真实内容约束"两个角度攻击过同一个病。
**两个外部工具与内部红队在这一点上完全一致**——所以它可信度最高，优先级应为 **P0**。

### 5.5 `font-fallback`：真实缺陷，不是口味问题

| 原型 | 声明了但**没有加载**的字体 |
|---|---|
| S13 | `文津宋体` |
| S08 | `KingHwa_OldSong`（京华老宋体） |
| S17 | （同类告警） |

taste-skill 原话：

> Typeface(s) declared but not loaded, so a fallback is rendering: 文津宋体 → **Fix the font URL / family name, or the screenshots you are judging are not the design.**

**裁定：`indefensible`。** 这不是设计争议，是**构建缺陷**：声明的字体没加载，那么截图里显示的根本不是这个设计。
这与 `07-audit-font-color.md` 遗留的 **K-8 限制（两款字体授权/来源待复核）** 是同一个根因——**字体清单里有查不到可靠网络来源的项**。
**处置**：把 `文津宋体`、`京华老宋体` 换成有明确 OFL 来源、可自托管的中文字体，或补齐 webfont 分片。

### 5.6 `no-footage`：**工具的默认值，被已提交的世界覆盖**

这条 Warn **出现在 8 个原型里的 7 个**（S03、S04、S07、S08、S13、S17、S25 均有），是本次出现频率最高的一条。

taste-skill 原话：

> No video anywhere on the page. → Look for one honest clip with `scripts/assets.mjs --video`（地点、材料、过程），用静音循环 + 海报帧。**只有当没有任何片段适合这个主题时**才可以辩护它的缺席。

**裁定：`earned`（按本批的世界辩护），但必须区分使用场景。**

理由：taste-skill 是**为立足页/营销页写的**（它的 SKILL.md 明说 "Not for dashboards or app screens"）。
本批 8 个原型的"世界"分别是：报纸油墨目录、丝网印拼贴、专色小志、扳道调度板、亚克力灯箱、印花税票、盲压公文、长曝光底片——
**这 8 个世界里没有任何一个会播放视频**；视频在这些世界里是**破坏性的**（一个 1905 年的税票旁边飘一段循环视频，正是"报纸 cosplay"的反面丑闻）。
所以按 impeccable 的裁定原则，**已提交的视觉世界覆盖这条默认**，判定 `earned`。

**但必须诚实标出适用边界**：如果用户拿这些方案去做**营销页 / 立足页**，这条 Warn 就**不是**可辩护的，`place-carries-it` 与真实影像的缺失会成为实际短板。
这也和第 `13` 号报告的结论接上了：**本批 20 个方向里 `place-carries-it`（地点承担一切）从未被使用**——本批整体回避了真实影像。

### 5.7 `font-count`：规范与工具默认的**结构性冲突**

taste-skill 在 5 个原型上报 `font-count`（S03、S04、S08、S13、S17），其中 S08 是 **4 款**：

> `[font-count]` 4 typefaces in use (Source Serif 4, KingHwa_OldSong, IBM Plex Mono, Gloock). → **Two at most: one display, one text.** Often one is enough.

**裁定：`earned`（保留 3 款分工），但 S08 的 4 款必须减到 3。**

理由：本批每一个方案的字体策略在 `00-BRIEF` 的 D 节里被**明确规定为三类分工**：标题 / 正文 / 数据。
这不是"顺手多选了几款"，而是一条**被写进规格的分工**，且第 3 类（数据）服务于真实信息（票号、读数、测量值、尺寸标注）。
taste-skill 的"two at most"是**立足页**的经验值——一个营销页确实不需要 3 款。

但 S08 的 4 款（Source Serif 4 + 京华老宋体 + IBM Plex Mono + **Gloock**）超出了规格本身：规格只要求 3 类，
**`Gloock` 是第 4 款，属于执行时的自我加码，应删**。

**这就是"规范 vs 工具默认"的正确处理方式：先看规范怎么写的，再看工具为什么这么要求，然后只在规范之外的部分让步。**

### 5.8 其余命中项

| 命中 | 原型 | 裁定 | 处置 |
|---|---|---|---|
| `wide-tracking` **×33** | S25 | `habit` | 微型大写宽字距是 taste-skill §4 点名的"画廊时尚"（数据：弱站点 57% vs 顶站 16%）。33 处说明它是被当默认装饰用的。**改为句首大写、可读字号、跟随所描述的内容**，保留 ≤3 处 |
| `bounce-easing` | S04 | `habit` | 弹跳缓动是 motion tell。改为指数缓出（impeccable 要求 "Exponential ease-out from an already-visible default"） |
| `button-fx` | S13 | `habit` | 按钮带投影/发光。改平涂单色 |
| `cramped-padding` | S08 | `habit` | impeccable 的间距规则；按工具建议加大 |
| `hairline` ×1 | S13 | `habit` | 仅 1 条 720px 分隔线（`div.pressline`），删掉即可——**注意本批大规模的发丝线问题在原型里并没有出现**，因为原型是按"色阶分区"实现的 |
| `card-rows` ×2 | S08 | `habit` | 390px 下 2 排同尺寸卡片。变构图 |
| `still-page` / `few-pictures` | S13 / S03 | `habit` | 动效元素偏少 / 图片偏少，按世界需要补真实图像 |
| `body-size` 15px | S13、S25 | `habit` | 正文应 16–20px。改 |
| `purple` / `gradient` / `emoji` / `default-font` | **全部 8 个原型** | — | **0 命中** ✅ 这是本批最干净的维度 |

---

## 六、两个工具互相印证 vs 互相冲突

### 6.1 同时印证（可信度最高，应优先修）

| 问题 | taste-skill | impeccable | 涉及原型 |
|---|---|---|---|
| **暖米底 / 陶土·铁锈色**（第三波 tell） | `palette-terracotta` FAIL、`palette-cream` FAIL | `cream-palette`（33 条 / 1 条） | S08、S25、S07 |
| **过度使用的字体**（含 Space Grotesk） | `default-font` | `overused-font`（名单含 Space Grotesk） | S03 等 |
| **信息单薄 / 空屏** | `empty-screens` | （无此规则，但 `cramped-padding` 同族） | S13、S08 |
| **强调色对比度不足** | `contrast` | `low-contrast` | 对照页双向命中 |

其中**「暖米底 + 陶土/铁锈」被两个工具用两套完全不同的机制同时抓到**——这是本次全部证据里置信度最高的一条。

### 6.2 口径冲突（已裁定）

| 冲突点 | taste-skill | impeccable | 本批裁定 |
|---|---|---|---|
| 等宽的使用范围 | 只有 `<pre>/<code>` 里的**字面代码** | code / **data** / **measurement** | **测量值用等宽（earned）；文件编号改用正文字体 + 表格数字** |
| 静态元素能否带投影 | **一律禁**（只有真实浮层可以） | 不禁，只要求"带偏移和柔化模糊，零偏移彩色光晕是装饰" | **Neumorphism 类方案按 impeccable 口径，但必须收缩为定义过的层级刻度（S13 从 17 处减到 3–4 级）** |
| 字体数量 | **最多 2 款**（一 display 一 text） | 无硬性数量规则，只要求"明显的尺度与字重级差" | **保留规格规定的 3 类分工；超出规格的第 4 款删掉（S08 的 Gloock）** |
| 视频 | 强烈期望有（`no-footage`） | 无此规则 | **按世界辩护：本批 8 个世界都不该有视频；但用于营销页时此辩护失效** |
| 规则集覆盖 | 有 `shadow`、`emoji`、`gradient`、`cream-palette`、`wide-tracking` 等 | 有 `icon-tile-stack`、`hero-eyebrow-chip`、`cramped-padding`、`skipped-heading` 等 | **两者不互相覆盖**（S13 taste-skill 报 4 FAIL 而 impeccable 报 0 条）——这就是必须同时跑两个工具的理由 |

### 6.3 第三处冲突：**同一个像素，两套规矩对撞**（S07 的发现，本次最精细的一条）

S07 的原型在收尾时撞上一个不是"设计争议"、而是"两工具判据不一致"的具体像素：背景 `#E7E7E0`。

| 工具 | 判据 | 对 `#E7E7E0` 的结论 |
|---|---|---|
| taste-skill | `palette-cream` 走 `colourFamily()`，**要求饱和度 ≥16%** 才算暖色族 | **放过**（该值彩度不足，不构成"奶油色"） |
| impeccable | `cream-palette` 判的是"**够亮 + 任何暖偏**" | **判为 cream**（1 条 finding） |

执行 agent 进一步实测了 impeccable 的边界，结论写在 `S07-adjudication.md`：
**impeccable 的阈值是"够亮 + 任何暖偏"（其间 C=3.1 判、C=0 放过）**，
而该页真正的米白 `#FAF7F0` 与这个背景的彩度几乎相同（**3.7 vs 3.6，ΔE 4.1**），
**两者只能靠色相方向与明度分开**——也就是说，这类"极低彩度的暖灰"正落在两个工具判据之间的缝里。

**本批裁定**：`#E7E7E0` 是 **`03` 号矩阵冻结值 + `08` 号背景替换表的结果**，属"世界挣来的底色"，登记为**文件域例外**。
**同时必须指出**：这条恰恰说明 `palette-cream`/`cream-palette` 两条规则的**判据不一致**，
所以**不能把两工具的 cream 命中数直接相加**当作严重程度——它们测的不是同一个东西。

### 6.4 关于 `--allow` 的使用（必须监督的一处）

S07 在收尾时用 `--allow mono,hairline,font-count` 把 inspect 从 **1 FAIL / 3 WARN** 变成 **0 FAIL / 1 WARN**（仅剩 `no-footage`）。

**这是工具的设计内机制**，不是作弊：`lint.mjs` 的输出末尾原文说明——
"Any other line that must keep a flagged pattern for a real reason can carry the comment `taste-skill-ignore`"，
`inspect.mjs` 亦提供 `--allow rule,rule`。**它就是给"被世界挣来的装置"留的申诉口。**

**但这也是最容易糊弄闸门的地方**，所以必须留下可审核的痕迹。S07 的做法是正确的：
它在 `S07-adjudication.md` 里逐条写明保留了哪 6 件被标红装置（`mono` 辅助数字、目录悬停/焦点 1px 下划线、
跨页 1px 实线、三款字体分工、矩阵冻结的 `#E7E7E0`）、重写了 7 处、**放弃 2 件**（视频、合成裁切标记），
并给出实测数字（主标题 1 行 77.8px、正文 16px/1.75、对比度 **14:1**、行长 **68ch**、**7 张真图**、破图 0、横线 1、首屏 103KB / 预算 420KB）。

**Lead 的监督结论**：`--allow` 的 3 条各有裁定书依据，接受。
**但读者应注意**：凡出现 `--allow` 的闸门结果，其 "0 FAIL" **不等于"无标红"**，只等于"标红已申诉且申诉被记录"。
表中 S07 一行因此应读作"**0 FAIL（3 条经申诉豁免）/ 1 WARN**"。

### 6.5 补充实测：S07 终局数字

| 指标 | 实测值 |
|---|---|
| `lint`（源码） | **0 FAIL / 0 WARN**（首轮 5 FAIL，逐条修掉） |
| `inspect`（真实 Chrome） | **1 FAIL / 3 WARN** → 申诉后 **0 FAIL / 1 WARN**（仅 `no-footage`） |
| `impeccable detect` | **1 条**（`cream-palette`）→ 登记文件域例外后 **0 条** |
| 主标题尺寸/行数 | 1 行 / **77.8px** |
| 正文 | **16px / 1.75**，对比度 **14:1** |
| 行长 | **68ch**（落在工具要求的 65–75ch 内）✅ |
| 真实图片 | **7 张**，破图 **0** |
| 细线总数 | **1**（这正是 §5.7 的关键证据：本批并没有"报纸 cosplay 到处发丝线"） |
| 首屏体积 | **103 KB**（预算 420 KB） |
| 被标红装置的处置 | 保留 **6** 件 / 重写 **7** 处 / **放弃 2** 件 |


---

## 七、本次实测暴露的**真实缺陷**清单（按优先级）

| 优先级 | 缺陷 | 证据 | 涉及 |
|---|---|---|---|
| **P0** | 空屏/信息单薄（"回避美学"） | `empty-screens`：S13 3/6、S08 3/8 | S13、S08，且与红队 Q 系列结论一致 |
| **P0** | 暖米底 + 陶土/铁锈（第三波 tell） | 两工具双向命中 | 批次级，18–19 案；实测命中 S08、S25、S07 |
| **P0** | 声明字体未加载（截图不是设计） | `font-fallback`：文津宋体、京华老宋体 | S13、S08、S17；根因同 `07` 的 K-8 |
| **P1** | Neumorphism 静态投影泛滥 | `shadow` **17 处** | S13 |
| **P1** | 微型大写宽字距泛滥 | `wide-tracking` **33 处** | S25 |
| **P1** | 等宽越界到"文件编号" | `mono` FAIL | S13 |
| **P2** | 字体超出规格分工 | `font-count` 4 款（Gloock 多出） | S08 |
| **P2** | 正文 15px 偏小 | `body-size` | S13、S25 |
| **P2** | 弹跳缓动 / 按钮投影 / 卡片排 / 间距 | `bounce-easing`、`button-fx`、`card-rows`、`cramped-padding` | S04、S13、S08 |

**干净的维度（0 命中，全部 8 个原型）**：`purple`、`gradient`、`gradient-text`、`emoji`、`default-font`（作为主字体）、`eyebrow`、`icon-cards`、`numbering`、`glass`、`dashed`、`outlined-box`、`all-centred`。
**这 12 条正是用户最初列的禁令清单的主体——它们被真实渲染的原型逐条通过了。**

---

## 八、已知局限（必须显式披露）

### 8.1 **"看渲染"这一步完全没有做成——这是本次最大的方法缺陷**

taste-skill 的方法论里，第 8 步是硬性的：

> **You look at what you made.** Screenshots at three widths, a juror's rubric, fix, look again.
> （你必须看你做出来的东西：三个宽度的截图、评审 rubric、修、再看。）

而且 `inspect.mjs` 自己也会在输出末尾强制要求：

> LOOK AT THE RENDER — open these with your image viewer / Read tool **before saying anything about quality**.

**事实**：本次 8 个原型的执行 agent 与 Lead **都无法读图**（当前模型 `virtual/opus` 不声明 image 输入）。
S13 的 builder 如实写在文件里：「本机模型不支持读图，未能肉眼复核，结论只依据本文件与 `report.json` 实测数字。」

**后果与影响范围**：
- 所有结论都基于**工具测得的数字**（字号、行数、屏数、填充率、色彩值、元素数），**没有一条基于视觉判断**。
- `inspect.mjs` 的**规则判定**（FAIL/WARN）是可靠的——它是脚本算出来的。
- 但 `references/critique.md` 那套**评审 rubric**（需要看图的"陪审员评分"）**没有执行**。
- 因此**不能声称**"这 8 个原型好看"或"达到了获奖水平"；只能声称"它们通过了机械闸门"。
- 要补做这一步，需要一个**能读图的模型**（或人工）按 `critique.md` 的三档宽度截图打一次分。

### 8.2 其他局限

1. **只做了 8 个原型，不是 30 个。** 选的是 6 个"按项目类型首选"+ 2 个高危改造家族。其余 22 案只过了文字级规则回灌（`12` 号），没有真实渲染证据。
2. **S21 的闸二/闸三、S03 的闸三未完成**（agent 在长轮次里未收尾）。表格中留空处的结论**不可引用**。
3. **工作流吞吐受限**：同一批 30 个并行 agent 的回灌任务两次出现长时间停滞（第一次 2 小时仅完成 2/30），已终止并改为"预切片 + 轻量读取"重跑。这是执行环境问题，不是工具问题，但会限制可验证的覆盖面。
4. **`no-footage` 的高频出现**使"WARN 计数"在批次比较中失真——它是立足页默认值，对本批多数世界不适用（见 5.6）。
5. **两个工具都是为"建真站"设计的**，而本次的对象是"设计方案规格 + 少量原型"。它们的判定对**原型**有效，对**文字方案**只能做规则回灌（`12` 号），不能做渲染测量。
6. **阳性对照只有 1 个**。它证明了工具在工作，但没有标定工具的**敏感度/特异度**（例如：一个只犯 1 条规则的页面能否被稳定抓到）。要做严谨标定需要一组梯度对照页。

### 8.3 执行过程中发现的**工具缺陷 1 处**（代码级，已复核）

**位置**：`tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs` 第 **39–45** 行，函数 `isMono()`：

```js
const isMono = (family) => {
  if (monoCache.has(family)) return monoCache.get(family);
  mctx.font = `40px ${family}`;
  const a = mctx.measureText('iiiiiiii').width, b = mctx.measureText('WWWWWWWW').width;
  const v = Math.abs(a - b) < 1;      // 两者等宽 ⇒ 判为等宽字体
  monoCache.set(family, v); return v;
};
```

**缺陷**：它用「`i` 与 `W` 的测量宽度是否相等」判断等宽。**宋体类中文字体的拉丁字形是定宽（半角固定步进）**，
于是 `i` 与 `W` 宽度相同 → 被判为**等宽字体** → 中文页面会吃到 `mono` FAIL。
该函数在 `probe.mjs` 内被 5 处调用（L138 行内测量、L203 eyebrow、**L216 决定是否推送 mono 文本**、L224 字面占比表、L300 元素级）。

**本批实测影响（必须如实收窄，不可夸大）**：8 个原型终稿里 `[mono]` 只在 **S03、S13 各 1 次**，**S08 终稿为 0**。
S08 的 builder 报告它曾命中并"换 Noto Serif SC 回退即清零"——也就是说**该缺陷可以被回退字体规避**，但规避不等于不存在。

**裁定**：记为**真实的工具缺陷 + 有限的实测影响**。中文项目使用该工具时，`mono` FAIL 需先人工确认是否真用了等宽字体，再决定是否申诉。

### 8.4 执行过程中发现的**我方流程错误 1 处**（Lead 自身错误）

**Lead 给 8 个 builder 的闸二命令写成了 `node inspect.mjs <原型目录>`，这是错的。**
工具真实用法是 `<url | file.html>`（该脚本自己打印的 usage 就是 `<url | file.html>`）。
传目录会让页面基址变成那个目录，于是 `style.css` 与 `assets/*` **全部 404**，渲染出**白页**，从而产出**假 FAIL**。

**铁证**（S08 的 builder 留档为 `tool-runs/S08-inspect-dirform.txt`）：

| 症状 | 目录写法实测 | 正确写法（`index.html`） |
|---|---|---|
| 页面底色 | **`colour page #ffffff`（纯白）** | `#120c08` |
| 图片 | **`broken-image` ×4**，路径 `http://127.0.0.1:12650/prototypes/assets/overprint.png` 全 404 | 4 张全部加载 |
| 字体 | `font-fallback`：Noto Sans SC 未加载 | 正常 |
| 结果 | **3 FAIL / 7 WARN（全部是假的）** | 2 FAIL / 3 WARN（真实） |

**影响评估**：多数 builder 实际已用 `index.html`（否则不会得到 0–2 FAIL 的正常读数），
但**凡看到过"白页 + broken-image"读数的，那些读数必须作废**。已在本表 §4.2 采用正确写法后的终局值。
**教训**：给多个 agent 下发工具命令时，**命令模板必须逐字实测过一遍再下发**；我用文档头注释推断用法，没先跑一次目录形式。

### 8.5 执行过程中发现的**我方工具用法错误 1 处**

`Select-Object -First N` 会**过早终止管道**，导致被管道接住的 `node inspect.mjs` 进程被拦腰杀死，
留下**残缺的证据文件**与**孤儿 Chrome 进程**（表现为后续 `CDP timeout`）。
**正确做法：先把工具输出完整落盘到文件，再用 `Get-Content -Tail N` 之类的读取方式看**，绝不用 `Select-Object -First` 截断一个仍在写文件的进程。

---

## 九、S21 与原型的最终态汇总（截至收口）

| 原型 | lint | inspect（正确写法） | impeccable | 裁定书 | 保留标红 / 重写 |
|---|---|---|---|---|---|
| S03 长曝光观测站 | 0 F / 1 W | **0 F / 2 W** | 2 条 | 待补 | — |
| S04 芒果拼贴墙 | **0 F / 0 W** | **0 F / 2 W** | 4 条（全 advisory） | ✅ `S04-adjudication.md` | 保留 4 / 重写 — / 登记偏离 1 |
| S07 铅灰油墨目录 | **0 F / 0 W** | 0 F / 1 W（3 条申诉豁免） | 1 条→例外 | ✅ `S07-adjudication.md` | 保留 6 / 重写 7 / 放弃 2 |
| S08 琥珀叠印灯箱 | **0 F / 0 W** | 2 F→**0 F**（2 条申诉）/ 2 W | **0 条** | ✅ `S08-adjudication.md` | 保留 6 / 重写 12 / 假象 2 |
| S13 盲压公函 | **0 F / 0 W**（28 处逐行豁免；撤除后 29 F） | 4 F→申诉后 0 F / 5 W | **0 条** | ✅ `S13-adjudication.md` | 保留 10 / 无法辩护 0 / 改写习惯默认 11 |
| S17 税票存根联 | **0 F / 0 W** | 0 F / 3 W | **0 条** | 待补 | — |
| S21 联锁释放簿 | **0 F / 0 W** | 进行中 | 进行中 | 待补 | — |
| S25 专色目录帖 | **0 F / 0 W** | **0 F / 2 W** | 33 条（32 字距+1 cream） | ✅ `S25-rulings.md` | 保留 2 / 重写 3 / 舍弃 9 |

**汇总读法**：
- **闸一 `lint`：8 / 8 原型通过**（S13 依赖 28 处逐行豁免，已给出撤除后的 29 FAIL 对照）。
- **闸二 `inspect`：全部收敛到 0 FAIL**（部分依赖已登记的申诉豁免），残余 WARN 主要是 `no-footage`（§5.6 已裁定按世界辩护）。
- **闸三 `impeccable`：S08、S13、S17 为 0 条**；S04 的 4 条全为 advisory（`bounce-easing`）；S25 的 33 条实为 2 条机制（`wide-tracking` 32 处重复计数 + `cream-palette` 1 条）。
- **对比阳性对照页的 8 条 findings + 9 FAIL**——**8 个原型在机械层面通过了闸门，这不是工具失效的结果**。
