> 归档说明：本文是 S15 `table.matrix` fold-card（提交 e3a0726 + last-child 修饰）的**目视复核记录**，原稿在 gitignored 的 45-scratch/，按 _CONTRACT §9.18 升级为正式交付件。
> 复核模型 `read_image` 不可用（与实现者同一模型限制），采用 ASCII 密度图 + 零依赖 PNG 解码像素判定双路互证，> 并用 sticky 修正后的干净重截图闭环了唯一存疑点。**结论：合格。** 其发现的取景缺陷已沉淀为 _CONTRACT §9.20。证据文件（matrix-*.png / ascii-*.txt / vc 系列）留在 45-scratch/，结论不依赖它们存续——全部数字已内联本文。

# 视觉复核：S15 `table.matrix` fold-card @390

**结论：合格。**（2 条非阻断修饰建议，见 §4）

- 复核时间 2026-10-24 03:16–03:55 (+08)｜被复核改动：`prototypes/S15-fishery-floor-ledger/style.css` L474–L502
- 写范围仅本文件；未 commit、未跑 `render-scheme`、未跑 `prototypes/_build/shot.mjs`（避开 `_build/` 争用）。

---

## 0. 用了哪条路

1. `read_image` 读 4 张 png → **全部失败**：`model "virtual/opus" does not declare image input`。真看图这条路对本模型不存在。
2. **兜底 a**：读 `deliverables/43-scratch/ascii-before.txt`、`ascii-after.txt`（Pillow 密度字符图，780×1688 → 60×62，1 字符≈6.5 CSS px、1 行≈13.5 CSS px）。
3. **兜底 b**：Node 零依赖 PNG 解码（自写 inflate + Paeth 反滤镜）+ 逐行中位数自适应的暗/亮判定 → 文本行带、列团、满宽横线、标签墨密度，坐标精确到 CSS px。脚本在 TEMP（`vc2.mjs`/`vc3.mjs`/`vc4.mjs`/`vc5.mjs`），不进仓库。
4. **补证**：用 `tools/.../lib/cdp.mjs` 直接起了一个自己的静态 http server（不碰 `_build/`），在 390/dsf2 重截两张**滚动位预留 220px**的干净图，用来关掉 §1⑤ 的唯一存疑。
5. a 与 b **不冲突**，逐行互证：`ascii-after.txt` L11 全 `:`（=深浅过渡行）→ 与像素测得的纸面起点 CSS 125 对齐；L12 的墨在字符列 3–19（=19.5–123.5 CSS）→ 像素带 `[0] y=288dev, x24.5~137.5`；`ascii-before.txt` L21 四段 `.::.:` 落在校验列 19–23 → 像素 before 列团界 `x134.5~190.5`。**注意：两个 ascii 文件都只来自 `_a.png`**（文件头 L1 写明），`_b.png` 我另做了独立像素解码。诚实声明：我没重装 Pillow 去逐字节复现字符图（本机 `python/py` 均不可用），a 与 b 的一致性建立在结构逐行对上、而非位相同。

**"目视"的性质说明**：我做的是可复现的版面几何/墨量测量，能判"折没折行、粘连、分隔、推歪、标签宽度"这类结构性问题；不能判色彩质感。§1⑤ 原本唯一需要人眼的点，已用干净重截图闭环，因此本次不需要再留人眼关。

---

## 1. 五个评判点逐项

### ① 列名标签在每格前 / 与值有间距 / 会不会折到第二行 —— **通过**

`matrix-after-a.png` 解出 18 个含标签文本行（dev px，CSS=dev/2；版心 x24–366）：

| 列 | 标签墨跨度 x(CSS) | 标签墨宽 | 值起 x | 标签→值间隙 | 标签墨密度 | 值墨密度 |
|---|---|---|---|---|---|---|
| 机制（行 y=144/302/458/616/774） | 24.5–49.0 | 24.5 | 59.0 | 10.0 | 19.0–20.3% | 5.2–9.2% |
| 桌面档（y=179/336/494/651/809） | 24.5–62.0 | 37.5 | 72.0 | 10.0 | 14.6–15.1% | 9.1–16.3% |
| 减少动态时（y=212/370/528/685/837） | 24.5–88.5 | 64.0 | 98.5 | 10.0 | 13.9–14.4% | 10.9–14.4% |
| 单栏窄屏（y=247/405/563/720） | 24.5–75.5 | 51.0 | 85.0 | 9.5–10.5 | 13.6% | 10.6–14.9% |

- 同列 5 行的标签墨跨度**一值不差**（例：机制列 5 行全是 x24.5–49.0，最右端 137.5/121.0/121.5/121.5/105.0 只是值本身长短不同）⇒ 标签从不折行；行高恒 14–15 CSS（单行），**没有** 28–29 CSS 的双行带 ⇒ 格内不折行。
- 间隙实测 9.5–11.0 CSS（代码写 `margin-right: 8px`，多出的是 CJK 侧隙+抗锯齿）⇒ 间距真实存在。
- 20 格全部 `x24.5` 顶格起，起列零漂移。

### ② 20 格一格一行 / 有无两列粘连 —— **通过**

- 几何：`deliverables/43-scratch/matrix-verify-after.json` L11–L241 全 20 格 `display:block / w:342 / h:34.4 / lines:1 / labelVisible:true`；`s15-matrix-pos.json` L113–L122 `.matrix: cells 20, maxLines 1, lineDist {"1":20}, fatCells 0, minCellW 342`。我重跑 DOM 探针（390/dsf2）也一致：20 格全 `w342 h34.4`，标签依次 机制/桌面档/减少动态时/单栏窄屏（5 轮）。
- 像素：`matrix-after-a.png` 解出 **18 条完整行带 = 第 1–18 格**（每格一行，带间距恒 **157–158 CSS** = 4×34.4 等距无挤压）+ 第 19 格只剩 **1 CSS 薄边**（dev y1686-1687，墨只在 x99–174，即被画面底边裁切）；第 19、20 格在 `matrix-after-b.png` 顶部完整出现（其带 `[0] y=286dev / [1] y=356dev`，标签墨分别到 x88.5 / x75.5 ⇒ 正是「减少动态时」「单栏窄屏」）。合计 20 格逐格有像素证据。
- 粘连检验：标签墨宽与值墨之间有实测 ≥9.5 CSS 的空白列，且同列重复值完全相同 ⇒ 不存在"上格尾字顶到下格标签"。
- 改前对照成立：`matrix-before-a.png` 同一表体只有 4 条窄列，列团界 CSS `x34.5~97 / 134.5~190.5 / 223.5~253.5 / 290~352`（列宽 62.5 / 56 / 30 / 62），列内一字一行竖叠 ⇒ **「改前=4 条窄列各自竖叠」成立**；与 `t04-s15-before-390.json` 的 `minCellW 66.8 / maxCellH 202.3 / maxLines 6` 同向。

### ③ 行与行之间有分隔 —— **通过（但只有行间，且收尾多一道）**

- `matrix-after-a.png` 满宽 2 CSS px 横线：dev `y564-567 / 878-881 / 1194-1197 / 1508-1511` = CSS 282 / 439 / 597 / 754；干净重截图 `vc-cap-1` 直接读到 CSS **442 / 599 / 757**，与 5 个 `tr`（DOM：`h157.6`，`borderBottom: "2px rgb(195, 201, 199)"`）边界精确对齐。
- 语义正确：`style.css` L490 `tr{border-bottom:2px}`、L491 `th,td{border-bottom:0}` ⇒ 卡片之间有线、格内不画线，符合 fold-card 意图。
- 瑕疵（非阻断）：`tbody tr:last-child` 的下边线也在画 ⇒ 表末多一道收尾线；格与格之间无分隔（可读，见 §4-1）。

### ④ 表格外是否波及相邻区块 —— **通过**

- 位移全部来自这张表：`.matrix` 表体 `tableH 1006.9 → 854.2`（−152.7），页高 `15398 → 15246`（−152）。
- 邻居内容**形状未变、只整体上移**：`before-b` 带 `[7] 左26.0 右130.5 团5` ↔ `after-b` 带 `[2] 左26.0 右130.5 团5`；`before-b [8]` 27 团 ↔ `after-b [3]` 27 团（同 x 界、同团数、同墨峰）。
- `vc-cap-2.png`（表格后段）里表尾之后接的是下邻居正文（CSS 502.5 起，左 26.0/25.5 起、27/24 团），无重叠、无被推歪、无空白洞。
- 无横向溢出：`s15-matrix-pos.json` L7–9 `canScrollX:false / maxScrollX:0 / overflowCulprits:[]`；`matrix-verify-after.json` L243–245 `scrollW 390 = clientW 390, canScrollX 0`。
- `below45` 改前后恒 4，且全部落在 `.trace--1936`（`trace__head` / `svg>text`），与本表无关 ⇒ 这次改动既没修好也没弄坏它们。

### ⑤ 有没有明显难看的东西 —— **通过**（含 1 个关于**交付截图本身**的提醒）

- 对齐：20 格左起 x24.5 零漂移；行距恒 157–158 CSS；无空白洞。
- 标签比值：值墨密度 9–20% vs 标签 13.6–20.3%，标签不压过值。最低的一行（「机制 / 比例尺」：标签 20.3%、值 5.2%）是内容本身只有 3 字，不是版面缺陷。
- 右缘参差（105–361 CSS）是折表必然结果，可接受。
- ⚠️ **原交付图框错了**（不是实现的错）：`deliverables/43-scratch/matrix-shot.mjs` L29 只预留 `geo.top - 60`，而 sticky `.strip` 实测高 **125 CSS**（`.strip{position:sticky;top:0}`，`style.css` L72–73），所以 `matrix-before-a.png` / `matrix-after-a.png` 的 CSS 125–143.5 是一段 **15.5 CSS 的空白**（逐行实测：after-a 到 CSS 143.5 才重新出现墨，左 x71），**caption 被条带盖住了**。改前的 `matrix-before-a.png` 因此把"深色 thead（CSS 128–236.5，内部亮字正好落在 4 条窄列 x34.5–59 / 135.5–180.5 / 223–253.5 / 292–352）"当成可见内容，改后 thead 已 `display:none`，那块深色就只剩条带+空白。→ **别拿 `_a.png` 判 caption 的可见性**。
- 重截的干净图 `vc-cap-1.png`（TEMP）里 caption 完整可读、落在纯纸面上：2 行墨带 CSS **226.5–240.5**（右端 x322.0）与 **254–267**（右端 x266.5），行距 27.5 与 `caption{line-height:27.2px}` 一致，深色地面只有 CSS 0–124.5（就是 `.strip`），其下 125–843.5 全为浅纸面 ⇒ **无明暗交界、无吞字、无重叠**。
- 顶部深色块与本次改动无关的证据：`before-a` 与 `after-a` 的 dev `y0–249` 区域**逐像素比对差异 0/195000（0.00%）**，是同一个条带覆盖层。

---

## 2. 最终一句

**合格**——列名进每格前且从不折行、20 格一格一行且无粘连、卡片间 2px 分隔到位、邻居只平移不变形、无横向溢出，几何（`matrix-verify-after.json`、`s15-matrix-pos.json`）与像素（4 张 png 逐行解码）两条独立证据链同向。

## 3. 复现方式

- 版面本身：`deliverables/43-scratch/matrix-shots/matrix-after-a.png` 第 1 屏 CSS 144–844（表体）+ `matrix-after-b.png` 第 2 屏（表尾与下邻居）；改前对照 `matrix-before-a.png` 同位置。
- 不能看图的模型：`ascii-after.txt` L12–L63（左起顶格、行行分隔）对 `ascii-before.txt` L21–L63（4 条窄列竖叠）。
- **caption 可见性必须用干净图**：`C:/Users/Administrator/AppData/Local/Temp/vc-shots/vc-cap-1.png`（第 1 屏 CSS 226–267）。重生成命令（只依赖 `tools/.../lib/cdp.mjs`，不碰 `_build/`）：`node C:\Users\Administrator\AppData\Local\Temp\vc5.mjs`。若要把交付图修对，改 `matrix-shot.mjs` L29 的 `- 60` 为 `- 220` 即可。

## 4. 修饰建议（非阻断，不改判定）

1. `.matrix tbody tr:last-child { border-bottom: 0 }`（接 `style.css` L490 后）：去掉表末那道多余的收尾线。
2. 若要更强的卡片感：`.matrix tbody td + td { border-top: 1px solid rgba(195,201,199,.55) }`。当前 1 行/格 + 行距已经读得清，这条纯装饰，可不做。
3. 想让 4 个标签的起值点对齐成一条竖线：`.matrix tbody td::before { display:inline-block; width:70px }`（实测最宽标签「减少动态时」墨跨度 x24.5–88.5 = 墨宽 **64.0 CSS**，70 装得下且值起 x 从 98.5 提前到 94.5，给值多出约 4 CSS）。当前值起 x 已按列分别恒定（59.0 / 72.0 / 98.5 / 85.0），所以"参差"只发生在**跨列之间**、而同一列内完全对齐，读起来不成问题。**这条与 `style.css` L479–481 里"刻意不照搬 S29 固定标签列"的理由相抵触**（那是关于 6.5em=104px 的更宽固定列），属于"整齐 vs 值行更宽"的取舍；要动请先用 `vc-cap-1` 这种干净图目视一次。
