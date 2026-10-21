# 27 规格漂移审查：实现是否违反明文契约条款

> 审查员：规格漂移审查员。**只判"写了却没做到"**；不判"该不该这么写"（那是规格自洽性审查员的活，它是本报告的对抗对象）。
> 工作目录：`D:\Web\style`（只读原型/模板/脚本，未改任何既有文件；新增仅本文件与 `_crit4b/`）
> 状态：**已完成**（本次为重跑；骨架先落盘，随后按批次增量追加，未攒到最后一次写）

---

## §0 方法与范围

### 0.1 条款源（全部为项目原文，逐行引用）

| 源文件 | 我取用的条款块 | 行号 |
| --- | --- | --- |
| `prototypes/_CONTRACT.md` | §2 目录布局与体积区间 | L25–L35（L27–L28 的 18–27 KB / 12–31 KB） |
| 同上 | §3 唯一渲染命令 | L41–L47 |
| 同上 | §4 字体（禁用字体栈、禁 googleapis `<link>`） | L53、L72 |
| 同上 | §5 图片素材（remote 禁令、realPictures≥4、alt、brokenImages 空） | L78、L91 |
| 同上 | **§6 硬约束 12 行表** | L97–L110 |
| 同上 | §6 工具盲区脚注（font-count 3 族上限） | L112–L114 |
| 同上 | **§7 完成判据 4 条** | L118–L123 |
| 同上 | §8 已知坑 | L127–L135 |
| 同上 | **§9 十六条实战坑**（9.2 / 9.3 / 9.9 / 9.10 / 9.12 / 9.13 / 9.14 / 9.15） | L139–L199 |
| 同上 | §10 环境事实 | L203–L233 |
| `prototypes/_specs/_CURRENT-VALUES.md` | §0 全局硬规则 6 行 | L13–L22 |
| 同上 | §1 逐案当前有效值（30 案） | L33–L44、L50–L59、L67–L76 |
| 同上 | §2 旧值不得出现（26 行） | L82–L112 |
| 同上 | §3 已实测交叉核对锚点 | L116–L129 |
| 同上 | §4 S21–S30 错误码（Lead 补入） | L133–L152 |
| `deliverables/00-BRIEF-AND-CONSTRAINTS.md` | C-1/C-2 绝对禁令、C-3 高危家族、C-4、F.3 近似度栅栏 | L53–L76、L79–L87、L89–L90、L146–L150 |
| `deliverables/02-anti-ai-rules.md` | **§6 一票否决 11 条 V-01…V-11** | L571–L589 |
| 同上 | §3 规则总表 R-01…R-40 | L125–L168 |
| 同上 | §4 各规则检测方法（D-01…D-20） | L176–L468、L80–L101 |
| 同上 | §7.1 黑名单适用位与豁免口径 | L595–L600 |
| 同上 | §7.2 四十词表 | L604–L645 |
| `prototypes/_build/verify-prototype.mjs` | 闸门脚本实现（契约 §7 的声称对象） | L15–L161 |
| `tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs` | 工具实际规则集（52 个 rule id） | L24–L137 |
| `tools/taste-skill/skills/taste-skill/scripts/lint.mjs` | 源码级闸门 + 行级豁免机制 | L73、L107 |
| `tools/taste-skill/skills/taste-skill/scripts/inspect.mjs` | `--allow` 申诉机制 | L20、L28–L29 |

### 0.2 实现体（33 个）

- `prototypes/S01-…` … `prototypes/S30-…`：**30 个**（每个 = `index.html` + `style.css` + `assets/` + `.inspect/report.json`）
- `templates/M01-clean-corporate` / `M02-warm-local` / `M03-bold-creator`：**3 个**（每个 = `index.html` + `style.css` + `README.md` + `TOKENS.md`）

### 0.3 对账口径与规模

我按"一条款 × 一实现 = 一格"计。可机械对账的条款共 **51 条**（12 条 §6 硬约束 + 4 条 §7 完成判据 + §4 的 3 条字体规则 + §5 的 3 条素材规则 + §2 的 2 条体积规则 + §9 的 5 条可实核坑 + `_CURRENT-VALUES` 的 8 个逐案字段 + `02` 的 11 条一票否决 + 3 条另可实核的 R 规则）：

- **33 实现 × 51 条款 = 1,683 格**
- 另加 **R-15 两两近似度 30×29/2 = 435 对**（00-BRIEF F.3 / 02 §6 V-06）
- 另加 **模板层豁免声明 3 模板 × 14 条声明 = 42 条**
- **合计 2,160 次对账**，其中 **2,052 次由脚本机械完成**（脚本：`_crit4b/extract.mjs`、`_crit4b/pairs.mjs`，均只读），108 次为人工判读（语境类：错误态是否可达、40 词是否空洞、注释是否算"出现"）。

不作数的检查（我已排除，原因见 §7）：`_specs/Sxx.md` 的 12 字段逐字比对（那是方案文本层，`12-tool-rule-audit-30*` 已覆盖）；`§9.10 sr-only` 三种写法逐个核（30 案 × 手读，本轮未做）。

### 0.4 主要工具与原始证据

```
D:\Nodejs\node.exe prototypes/_build/verify-prototype.mjs --all      → 达标 26 / 不达标 4
D:\Nodejs\node.exe _crit4b/extract.mjs                              → _crit4b/static.json（33 实现 × 25 项静态指标）
D:\Nodejs\node.exe _crit4b/pairs.mjs                                → 色相差 / 骨架频次 / 模板报告
D:\Nodejs\node.exe tools/.../inspect.mjs templates/M0x/index.html --out _crit4b/m0x --widths 1440,768,390 --json
```

`_crit4b/static.json` 是逐案实测值的机器底稿；本报告所有数字都能在它或 `report.json` 里逐条复算。

---

## §1 漂移总表

判定用三档：**是**（违反，且找不到任何明文授权）／**否**（合规）／**形式命中**（字面命中但法典自身判据判定不空洞，见 §2 逐条）。

| # | 条款号（出处行） | 要求 | 涉及案 | 实测值 | 是否违反 | 我凭哪一行判的 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `_CONTRACT.md` §6 L99 | 渲染文本中 Emoji 计数 = 0 | 33 全部 | 静态扫描 0；`report.json.page.emoji` 全 0；闸门 `emoji` 无一条发现 | 否 | L99（U+2600–27BF / U+2B00–2BFF / U+1F300–1FAFF） |
| 2 | §4 L53 + §5 L78 + §6 L100 | 无远程资源；`index.html` 不得有 `fonts.googleapis.com` 的 `<link>` | 33 全部 | `remoteSrc`=0（30 案 + 3 模板）；`googleFontsLink`=0；`<a href="http…">`=0 | 否 | L53、L78、L100 |
| 3 | §4 L72 + §6 L101 | 禁用字体栈进入 `font-family` **声明**次数 = 0 | 30 案 | `font-family:` 声明内命中 **0**；S03 的 4 处命中在注释（L33–L34）内、L35 实际栈干净 | 否（30 案） | L72「`font-family` 声明中出现次数必须为 0」 |
| 4 | 同上 | 同上 | M01/M02/M03 | 三模板命中 6/4/6 次（M01 L27、M02 L34–L35、M03 L29–L30），且 M02 L122 的正文栈把 `system-ui` 放首位 | **已声明豁免**（如实申报，非漂移） | M02 README L176、M01 README L162 段、M03 README L161 |
| 5 | §6 L102 | 禁「居中大标题＋3 张等量卡片＋底部 CTA」**组合** | 30 案 | `surfaces.cardRows`：S04[3]、S05[6]、S08[4]、S12[6,4]、S17[5]；工具只出 WARN `card-rows`，无一条 FAIL `icon-cards` | 否（组合要件不全） | L102「三张视觉等量的**功能卡片**算」＋ `report.json.surfaces.cardRows` |
| 6 | §6 L103 | 无 AI 味渐变（紫蓝／粉紫那一类） | 33 全部 | 渲染态 `surfaces.gradients`=0（33/33）；S23 在 CSS 里声明 7 处渐变函数，但都在 `::before/::after`、且是硬停取色 | 否 | L103；S23 `style.css` L192/L197/L203/L215/L216 |
| 7 | §6 L104 | 40 词黑名单命中 **0** | 30 案 + 3 模板 | 40 词逐词扫描：S14「聚焦」@L267（子串，实为「可聚焦」）、S18「全周期」@L309、S26「闭环」@L398；模板 3 个 0 | **形式命中 3 处，判否**（见 §2-#7） | L104 + 02 §7.1 L599 的"可追问"判据 |
| 8 | §6 L105 | 无删减托辞 | 33 全部 | S15 `index.html` L394 表格单元格写「同上，另可按层展开标注」；其余 0 | **形式命中 1 处，判否**（表格 ditto 记号，见 §2-#8） | L105 只列了「由于篇幅限制／以下省略／简要描述／不再展开」 |
| 9 | §6 L106 | 任一标题在任一视口不得超 2 行 | 30 案 | `headingSummary.over2Lines` 在 1440/768/390 **全 0**（30 案 × 3 档） | 否 | L106 |
| 10 | §6 L107 | 正文 ≥15px | 30 案 | `type.body.size`：15px×3（S06/S10/S13）、16px×19、17px×4、18px×1、20px×1 → **最低 15，无 <15** | 否 | L107「<15px 直接 FAIL」 |
| 11 | §6 L108 | 横向溢出 = 0 | 30 案 | `horizontalOverflow` 三档全 0（30 案 × 3 档） | 否 | L108 |
| 12 | §6 L109 + `_CURRENT-VALUES` L20/L141/L145 | 每案有错误态，**且带指定错误码** | 30 案 | 28/30 命中；**S21 无 `LOCK-07`**（全库 grep 0 命中）、**S25 无 `GATHER-04`**（0 命中） | **是（严重，2 案）** | L109；`_CURRENT-VALUES` L141、L145 |
| 13 | §6 L110 | 有 `prefers-reduced-motion` 降级，且不得用"停用/取消/关闭"否掉签名机制 | 30 案 | 30/30 有 ≥1 处 `@media (prefers-reduced-motion)`；S14 L393、S19 块内出现「取消」但在「**不**取消」的否定语境 | 否 | L110 + §9.9 L167（同义否定按语境判） |
| 14 | §5 L91 | 桌面档 `realPictures` ≥4 | 30 案 | 5–15，最低 S17/S25 = 5，全部 ≥4 | 否 | L91 |
| 15 | §5 L91 | `brokenImages` 为空；`<img>` 有 `alt` | 30 案 | `brokenImages` 全 0；30 案 `<img>` 缺 `alt` 计数 0 | 否 | L91；`_crit4b/static.json.imgNoAlt` |
| 16 | **§7.2 L121** | `render-scheme.mjs` 跑通，**FAIL = 0** | 30 案 | **4 案不合格 / 8 个 FAIL 项**：S07 `mono`；S08 `palette-terracotta`+`font-count`；S13 `mono`+`shadow`+`button-fx`+`empty-screens`；S21 `mono` | **是（严重，4 案）** | L121；`verify-prototype.mjs --all` 输出「达标 26 / 不达标 4」 |
| 17 | §7.3 L122 | 三档 `*-fold.jpg` ＋ **≥2 张** `*-page-*.jpg` ＋ `report.json` | 30 案 | fold 30×3 全有；桌面档 page 数：**S05=1、S17=1**，其余 ≥2 | **是（按"每档≥2"读，2 案；按"合计≥2"读则否）** | L122 未写明是每档还是合计 |
| 18 | §7.4 L123 | 交付说明含 FAIL/WARN 计数、字体族与来源、素材来源与署名、两处最弱 | 30 案 | 只有 6 案有（`deliverables/tool-runs/{S04,S07,S08,S13,S17,S21}-adjudication.md`），而该目录被 `.gitignore` L18 排除；其余 24 案无任何交付说明 | **是（机制性，24 案）** | L123；`.gitignore` L18 |
| 19 | §2 L27–L28 | `index.html` 18–27 KB；`style.css` 12–31 KB | 30 案 | html 超上界 13 案（S14 31.9 / S15 41.4 / S18 40.6 / S19 36.6 / S20 35.7 / S21 32.6 / S22 30.3 / S23 33.9 / S24 36.9 / S26 33.1 / S27 38.1 / S28 43.7 / S29 48.4）；css 超上界 3 案（S13 33.4 / S21 37 / S28 37） | **是（轻，16 处出界）** | L27–L28；闸门只查 `<12K`（`verify-prototype.mjs` L40），上界不查 |
| 20 | §9.2 L144–L146 + §9.16 L198 | 纹理不得挂 `body`/`html`（否则对比度与 `empty-screens` 双双失真） | 30 案 | `body`/`html` 规则内 `background-image`／`url()` 命中 **0** | 否 | L146「body 保持纯色，纹理放伪元素」；闸门 `verify-prototype.mjs` L74–L77 同口径 |
| 21 | §9.12 L175–L176 | 必需交互态不得只默认 `hidden`，要有可见入口或可见状态区块 | 30 案 | S21 有可见「登记状态」区块（`index.html` L359–L391，含「故障」态）；**S25 的错误态 `index.html` L196 在默认 `hidden` 的 `#specimen`（L194）里，页面上无可见状态区块，只有 `试读` 按钮（L141/L148/…）作为入口** | **部分违反（1 案）** | L176 给了三条出路，「作为可见的状态区块列出」S25 未走 |
| 22 | `_CURRENT-VALUES` L33–L76 | 30 案背景色＝当前有效值 | 30 案 | `report.json.color.bodyBg` 与表 **30/30 逐字一致**（S25 为 `#e8e4de` 声明值，像素实测 `#E8E5DE` 属 JPEG 偏差，表 L71 已自记） | 否 | L33–L76 各行 + L120–L122 锚点 |
| 23 | `_CURRENT-VALUES` L29 + L82–L112 | 被替换的旧值**不得再出现在原型里** | 26 行 | 6 案字面出现，**全在 CSS 注释**：S04 `style.css` L3（`#E8871E`）、S10 L5（`#F4F1EA`）、S15 L5（`#F1E9DA`）、S16 L7（`#E63312`）、S19 L6（`#EDE6D4`）、S28 L3（`#1F5FA8`） | **形式命中 6 处，判否**（注释不渲染 + 均为"已废"否定语境，见 §2-#23） | L29「旧值不得再出现在原型里」＋ §9.13 L179 的先例 |
| 24 | `_CURRENT-VALUES` L76 | S30 `#00E676` 降为装饰性实色块，其上文字固定 `#007B3F` | S30 | `style.css` L23 `--deco: #00E676`；`index.html` L69/L152 明写「不承载文字与图标，其上文字固定 `#007B3F`」 | 否（**明文授权**） | L76；与 §2 L112 把 `#00E676` 列为"禁用旧值"相冲突（见 §6-2） |
| 25 | `_CURRENT-VALUES` L50–L76 + L139–L150 | S11–S30 的错误码必须落在指定值 | 20 案 | 18/20 命中；S21、S25 缺（与 #12 同源） | **是（严重，2 案）** | L50–L76、L141、L145 |
| 26 | `_CURRENT-VALUES` L18 | 按钮字色按表写死，不得默认白或黑 | 14 案（表内 11 案 + 明文「白字 `#FFFFFF`」3 案） | 表内 `#111111` 系（S02/S05/S08/S12/S14/S18）与 `#FFFFFF` 系（S04/S16/S22/S24/S25/S29/S30）的按钮前景色全部命中；见 §2-#26 逐案行号 | 否 | L18 |
| 27 | 02 §6 V-01 L577 | AI 味渐变／mesh／发光噪点球任 hero 主视觉或背景 ≥40% viewport | 30 案 | 渲染 `gradients`=0；无任何 mesh/aurora blob | 否 | L577 |
| 28 | 02 §6 V-02 L578 | 禁用字体担任标题或正文 | 30 案 | `font-family:` 声明内 0 命中；S03 唯一疑点在注释 | 否 | L578 |
| 29 | 02 §6 V-03 L579 | 任何 Emoji 出现在功能图标位／导航／按钮 | 33 全部 | 0 | 否 | L579 |
| 30 | 02 §6 V-04 L580 | 40 词出现在主张句／按钮／空状态／示例文案 | 30 案 + 3 模板 | S18「全周期」（技术读数行）、S26「闭环」（错误态处置句）；模板 0 | **形式命中 2 处，判否** | L580 + §7.1 L597–L600 的适用位清单 |
| 31 | 02 §6 V-05 L581 | Lorem ipsum /「此处填写」「待补充」「点击这里」 | 33 全部 | 30 案 0；3 模板 0（M01/M02 用 `【换成你的：…】`，README 明示豁免 `R-26`） | 否 | L581；M02 README L177、M03 README L164 |
| 32 | 02 §6 V-06 L582 + 00-BRIEF F.3 L147 | 同结构类型且主色色相差 <25° | **435 对** | 同骨架的 8 对（CONSOLE/CHRONO/MAG-TOC/DOSSIER/MANUAL/SPLIT/COLLAGE/VERSUS 各 2 案）**全部 ≥25°**；跨结构对里有 38 对 <25°，但 F.3 要求"且结构类型相同" | 否 | 00-BRIEF L147 四条件之一「主色色相差 < 25° **且**结构类型相同」 |
| 33 | 02 §3 R-14 L274 + 00-BRIEF B L29/L44 | 同一骨架 ≤3 次；5 F + 5 R 且交错 | 30 案 | 骨架最高 2 次（8 个骨架各 2 次）；F 15 / R 15；S01–S10、S11–S20、S21–S30 均严格 F,R,F,R… 交错 | 否 | L274；`_specs` 头部「结构类型」逐案提取 |
| 34 | 02 §6 V-07 L583 / V-08 L584 / V-09–V-11 L585–L587 | 签名式怪癖／字数／高危家族三闸门 | 30 案 | 实现层只核到机制物存在（S03 `assets/` 有长曝光位图、S08 有琥珀板、S13 有压痕）；签名式怪癖与字数属方案文本层 | 未核（见 §7-4） | L583–L587 |
| 35 | §9.13 L178–L182 + 02 §3 R-21 L325 | 箭头不得作为**独立**按钮/导航的功能图标 | 30 案 | 全库 `>\s*(→\|←\|↑\|↓\|›\|»)\s*<` 命中 1 处，且是正文流程表意（S22 `index.html` L247「折痕 `2px` → `6px`」），不是控件 | 否 | L181「箭头允许出现在正文、注释，以及『步骤 1 → 2』这类流程表意里」 |
| 36 | `_CURRENT-VALUES` L18 + L38 | 按钮字色按实测写死（S04 = 白字 `#FFFFFF`） | S04 | `style.css` L60 `.btn{…color:var(--paper)}`，`--paper:#F0E2C8`（L15）；全库 `#FFFFFF`/`#fff` 在 S04 命中 **0 次**；实现比值 **4.56:1** vs 规格 5.83:1 | **是（中，1 案）** | L18「不得自行默认白或黑」+ L38「**白字 `#FFFFFF`**（5.83:1）」 |
| 37 | `_CURRENT-VALUES` L18 + L50–L76 | 同上（其余 12 个被点名的案） | S02/S05/S08/S12/S14/S16/S18/S22/S24/S25/S29/S30 | CSS 端指定值逐案命中（行号见 §2-#4） | 否 | L18 |

---

## §2 逐条展开

### #1 【严重】S21、S25 没有 `_CURRENT-VALUES` 指定的错误码

**条款原文摘录**
- `prototypes/_CONTRACT.md` L109：`| **必须有错误状态** | 带 _CURRENT-VALUES.md 指定的错误码 |`
- `prototypes/_specs/_CURRENT-VALUES.md` L20：`| 错误状态 | 每案必须有一个具体的错误态，**并带下表给出的错误码** |`
- 码值出处：`_CURRENT-VALUES.md` L141 `| S21 联锁释放簿 | LOCK-07 | 第 7 号道岔的锁闭未释放 |`；L145 `| S25 专色目录帖 | GATHER-04 | 第 4 期的配帖（装订）缺一帖 |`

**实测证据**
```
Select-String -Path prototypes\S21-interlocking-release-book\index.html -Pattern 'LOCK-07'  → 0 命中
Select-String -Path prototypes\S25-spotcolor-contents-zine\index.html  -Pattern 'GATHER-04' → 0 命中
逐案全库 grep 30 个码：28 命中 / 2 缺失
```
- S21 有**可见**的四态区块 `index.html` L359–L391（载入中/停用/**故障**/空簿），L378–L387 的「故障」态写「5 号道岔的锁闭块卡在行程中段，释放路径停在第 5 枚……」——**错误态有，码没有**。
- S25 有 `index.html` L194–L198 的 `#specimen` 三态（loading/error/ready），L196 的错误文案是「这一页还没回片：第 104 页的实拍在等暗房冲洗……」——**错误态有，码没有**；JS 注释 L375 自称「错误、加载、成功三种状态」。

**为什么这条是可执行的**
1. 条款把码值**逐字写死**在 `_CURRENT-VALUES.md` L141/L145，并给出取意依据（S21 取主张句原文"第 7 号道岔未释放"、S25 取"第 4 期印了 300 本"）。
2. 同一条款在另外 28 案上被实现做到了（`S13` `index.html` L263 `EMBOSS-13`、`S26` L395 `<code>MISREG-26</code>`、`S22` `style.css` L304 等），说明它不是"不可执行"。
3. 没有任何另一条契约否定它：`_CONTRACT.md` §9.12（L175–L176）只谈"错误态要有可见入口"，是**追加**要求而不是替代；`02-anti-ai-rules.md` 全文无一条取消错误码。

**建议怎么修**：在 S21 `index.html` L378–L387 的「故障」标题旁加 `<code>LOCK-07</code>`（该案 `style.css` 已有 `.state__h` 与 `code` 样式，无需新 CSS）；在 S25 L196 句末加「（`GATHER-04`）」，并把该行从纯 `hidden` 改为可用 `<details>` 展开的可见状态块（同时解掉 #10）。

---

### #2 【严重】4 案闸门 FAIL ≠ 0，违反 §7.2

**条款原文摘录**
- `_CONTRACT.md` L121：`2. render-scheme.mjs 跑通，FAIL = 0（WARN 允许，但要在交付说明里逐条解释为什么 WARN 可接受）。`
- `_CONTRACT.md` §3 L41–L43 给出的**唯一**渲染命令不含 `--allow`。

**实测证据**
```
D:\Nodejs\node.exe prototypes/_build/verify-prototype.mjs --all
→ 达标 26 / 不达标 4 / 共 30

S07   FAIL 1  mono
S08   FAIL 2  palette-terracotta  font-count
S13   FAIL 4  mono  shadow  button-fx  empty-screens
S21   FAIL 1  mono
（逐案原始 message 取自 .inspect/report.json 的 findings[]）
```
FAIL 明细（`report.json.findings`）：
- S07：`Monospace type outside code: IBM Plex Mono — e.g. "46", "2026-02", "118", "G-4"`
- S08：`Terracotta / rust-orange accent (button #c46a1f)` ／ `4 typefaces in use (Source Serif 4, Noto Serif SC, Overprint Numerals, Gloock)`
- S13：`Monospace type outside code: DM Mono` ／ `17 box-shadow(s) on elements at rest` ／ `Buttons with shadow/glow` ／ `3 of 6 desktop screens are almost empty ground … screens 3, 5, 6`
- S21：`Monospace type outside code: IBM Plex Mono — e.g. "22:04", "22:00", "23:00"`

**逐项授权核对**（谁有明文、谁没有）

| FAIL 项 | 授权来源 | 结论 |
| --- | --- | --- |
| `mono`（S07/S13/S21） | `_CONTRACT.md` §9.15 L193：「保留等宽槽；报告原始 FAIL 并说明」 | **有授权**（见 §5-1） |
| `font-count`（S08，4 族） | §9.15 L194 只授权「3 族」 | **无授权**（见 #3） |
| `palette-terracotta`（S08） | 无。§9.15 四行不含它；`_CURRENT-VALUES` 只给 S28 的 `palette-purple` 写了批准记录（L78），没给 S08 | **无授权**（见 #5） |
| `shadow` / `button-fx`（S13） | 无契约授权；但 S13 字段 8（`_specs/S13.md` L35）与字段 11（L51）明文要求单向硬光源压痕 | **实质有案件级授权 → 归 §5-2** |
| `empty-screens`（S13） | 无。§9.2 只是要求"把纹理挂伪元素，好让这条规则不失真" | **无授权**（见 #6） |

**为什么这条是可执行的**
1. `FAIL = 0` 是数值判据，`report.json` 里的 `level: "FAIL"` 是可复算的；`verify-prototype.mjs` L111–L117 就是照这个字段判的（`if (fails.length) out.problems.push(...)`）。
2. 另外 26 案在同一命令下拿到 FAIL 0，证明门槛不是不可达。
3. 工具**自己**提供了合法的减项通道：`inspect.mjs` L20/L28–L29 支持 `--allow a,b`；`deliverables/tool-runs/S13-adjudication.md` L13 记录 `--allow mono,shadow,button-fx,empty-screens` 后为「0 FAIL / 5 WARN」。**但四案的 `.inspect/report.json` 里 `allow` 字段都是 `[]`**，即交付产物是用**没有**申诉的命令渲染的。
4. 没有任何另一条契约说"申诉后可以算达标"——§7.2 只写 FAIL = 0，§3 给的命令也没有 `--allow`。所以按字面，四案都不合格。

**建议怎么修**（择一，并由 Lead 补一条契约）
- 方案 A（改契约，最省）：在 §9.15 的表里补两行——`shadow/button-fx` 对"字段 8/11 明文规定单向硬光源压痕"的案子、`palette-terracotta` 对 S08；并把 §7.2 改写成「FAIL = 0，或 FAIL 全部落在 §9.15 允许表内且有逐条交付说明」。
- 方案 B（改产物）：用 §3 的命令重渲并把 `--allow` 名单写进交付说明；`empty-screens`（S13）与 `font-count`（S08）必须真修——S13 桌面档第 3/5/6 屏 `filled` 只有 0.14/0.16/0.17，把条款正文或函号排到那三屏即可过 20% 线；S08 把 `Overprint Numerals`（11%）并回 `Source Serif 4` 的数字槽，家族数落回 3。

---

### #3 【严重】S08 用了 4 个字族，越过 §6 明写的上限 3

**条款原文摘录**
- `_CONTRACT.md` L114：`font-count 对中文站有**结构性下限**：中文主字体 ＋ 拉丁字体 ＋ 等宽数字槽通常就是 3 族，而工具按 2 族为目标。**3 族是 WARN 不是 FAIL，可以接受**，但不要超过 3，也不要去合并中文字体去讨好它。`

**实测证据**
```
S08 .inspect/report.json @1440 → metrics.type.families:
  Source Serif 4:54% ／ Noto Serif SC:32% ／ Overprint Numerals:11% ／ Gloock:4%
rules.mjs L100-102: realFams = families.filter(f => f.share >= 0.02) → 4 条 → FAIL 'font-count'
```
四族**全部** ≥2% 渲染占比，不是统计噪声。

**为什么这条是可执行的**
1. 条款给了硬上限（"不要超过 3"）与理由（中文+拉丁+数字槽=下限，不是上限）。
2. 同批语料里有 26 案落在 3 族内，说明上限可达。
3. 另一条契约**没有**否定它：`_CURRENT-VALUES` L42 只指定「主标题 `Instrument Serif` → `Gloock`」，并未要求同时保留独立的 `Overprint Numerals` 数字族；`_specs/S08.md` L23（字段 4）把标题/正文/数字分成三档，没有说标题与数字必须是两族不同的**拉丁**面孔。
4. 反过来说，"中文主字体 ＋ 拉丁字体 ＋ 等宽数字槽"这三者 S08 已经占满（Noto Serif SC / Source Serif 4 / Overprint Numerals），`Gloock` 是第四族——正是条款点名的"超过 3"。

**建议怎么修**：把 `Overprint Numerals` 的槽位并回 `Source Serif 4`（字段 4 仍保留"数字用等宽"的意图可由 `font-feature-settings:"tnum"` 承担，或直接用 `Source Serif 4` 的等宽数字），家族数落回 3；`style.css` 里对应 `@font-face` 与 `font-family` 一并删除。

---

### #4 【中】S04 没有使用 `_CURRENT-VALUES` 写死的按钮字色 `#FFFFFF`

**条款原文摘录**
- `_CURRENT-VALUES.md` L18：`| 按钮字色 | 各案按实测写死，**见下表最后一列**；不得自行默认白或黑 |`
- `_CURRENT-VALUES.md` L38（S04 行末）：`| **白字 `#FFFFFF`**（5.83:1） |`

**实测证据**
```
prototypes/S04-mango-collage-wall/style.css
  L15  --orange:#96550F; --green:#2F7D4F; --ink:#14100C; --paper:#F0E2C8;
  L60  .btn{ … background:var(--orange); color:var(--paper); … }
grep S04 style.css 中 #FFFFFF → 0 命中；#fff → 0 命中
grep S04 index.html 中 #FFFFFF|#fff → 0 命中
```
即：按钮前景色 = `#F0E2C8`（纸色）压 `#96550F`，我按 WCAG 相对亮度算得 **4.56:1**；而规格承诺的是白字 `#FFFFFF` 的 **5.83:1**。注意 5.83:1 恰好等于"白 `#FFFFFF` 对 `#96550F`"（`(1.05)/(0.1301+0.05)=5.83`），证明该格说的就是这枚按钮。

**为什么这条是可执行的**
1. 条款指明具体 HEX 与具体比值；比值可复算。
2. 其余 12 个被点名的案都做到了，且都能引到行：S02 `style.css` L18 `--ink:#111111`；S05 L22 `--on-paint:#111111`；S08 L14 `--on-amber:#111111`；S12 L18 `--btn-ink:#111111`；S14 L92 `color:#111111`；S16 L173 `color:#FFFFFF`；S18 L5 注释+按钮规则；S22 L109 `color:#FFFFFF`；S24 L112 `color:#FFFFFF`；S25 `--paper-white:#FFFFFF`（L12）+ 按钮实测 fg `#ffffff`；S29 L124 `color:#FFFFFF`；S30 L97 `color:var(--white)`（`--white:#FFFFFF` L25）。
3. 没有另一条契约允许替换：`_CURRENT-VALUES` L38 同一格里只解释了"主色对纸底 2.07:1 → 4.56:1"，那是**色块对底**的比值，不是按钮文字；把 4.56 挪给按钮字，是把两条不同的对比度要求混成一条。
4. 授权检查：S04 `style.css` L3/L6/L9 的三段自述（压深主色、08 号裁定保留原背景、标红裁定见 `tool-runs/S04-adjudication.md`）**没有一句引用"按钮字色"这一行**；而那份裁定文件位于 `.gitignore` L18 排除的目录。

**建议怎么修**：`style.css` L60 改为 `color:#FFFFFF;`（并把 L7 的注释同步），或把 L15 加一条 `--btn-ink:#FFFFFF` 供按钮与烫金块共用。若坚持纸色，则必须由 Lead 在 `_CURRENT-VALUES` L38 改格——那是规格自洽性审查员的权限，不是实现的自由。

---

### #5 【中】S08 主色落进 `palette-terracotta` 窗口，且找不到任何契约授权

**条款原文摘录**
- `_CONTRACT.md` L121（§7.2 FAIL = 0）。
- 对照组：`_CURRENT-VALUES.md` L78 对同类情形写过明文批准——`**S28 的 #AF74BE 要当心**：色相 287.8° 落在 palette-purple 的 244–295° 窗口内……这是**经批准的单案换色**，不是疏忽`。

**实测证据**
```
S08 .inspect/report.json @1440 → FAIL [palette-terracotta] "Terracotta / rust-orange accent (button #c46a1f)."
#c46a1f → h=27.3° s=0.726 l=0.445；rules.mjs L12 的窗口是 h∈[6,30] ∧ s∈[.38,.85] ∧ l∈[.42,.72] → 命中
该色出处：_CURRENT-VALUES L42 把 S08 主色指向 _specs/S08.md；_specs/S08.md L19 明写
  「`#C46A1F` 琥珀＝主色，承担板体与油墨，24%」
```
即：实现**忠实执行了**它那一格的规格，而 `_CONTRACT.md` 从未把 `palette-terracotta` 列入允许的 FAIL。S28 遇到同一类冲突时 `_CURRENT-VALUES` 写了批准，S08 没有——这是**授权缺口**，不是实现自选。

**为什么这条是可执行的**：`palette-terracotta` 是数值判定（色相/饱和/明度三段区间），可复算；且已有先例证明"遇到必然命中的颜色，契约有能力写下批准"（L78）。缺的只是把 S08 补上。

**建议怎么修**：由 Lead 在 `_CURRENT-VALUES.md` L42 的 S08 行末补一句与 L78 同格式的批准（写明"`#C46A1F` 落在 palette-terracotta 窗口内，是经批准的单案材料色，建原型时照建"）；或把 S08 主色换算到窗口外（h>30° 或 s<0.38 的最小位移，需重算对底 4.5:1）。

---

### #6 【中】S13 桌面档 6 屏里有 3 屏近空，`empty-screens` FAIL 无授权

**条款原文摘录**：`_CONTRACT.md` L121（FAIL = 0）。§9.2 L144–L146 只规定"纹理要挂伪元素，否则 `empty-screens` 规则失去意义"，属于前置条件，不是豁免。

**实测证据**
```
S13 .inspect/report.json @1440:
  screens=6  filled=[0.55, 0.22, 0.14, 0.31, 0.16, 0.17]
  第 3 屏 14% / 第 5 屏 16% / 第 6 屏 17%  < 20% 阈值
  finding: FAIL [empty-screens] "3 of 6 desktop screens are almost empty ground … screens 3, 5, 6"
@768: screens=6 filled=[0.49,0.29,0.16,0.34,0.32,0.28]（未触发，因为阈值只在 ≥1100px 判）
```
**为什么这条是可执行的**：阈值与算法都在 `inspect.mjs` L152 写明（"under 20% of the screen holds text, a picture or a colour field"，且 `empty.length >= 2` 才判），`filled` 数组逐屏给在报告里，可复算；同批 29 案里 28 案拿到 0 或 1 屏近空。

**建议怎么修**：S13 是公函，第 3/5/6 屏空是因为条款之间的 2 个基线单位留白被拉满整屏。把 `style.css` 里条款块的 `margin-block` 减半、并把「签发栏」(`.agency`) 从固定底部署位改为随流，就能把 3 屏内容压进 2 屏；或给第 5 屏加一块可见的「文件翻拍」图版（该案 `assets/` 已有 `plate-laid-paper.jpg`）。

---

### #7 【形式命中·否】40 词黑名单 3 处命中，全部通不过法典自己的判据

**条款原文摘录**
- `_CONTRACT.md` L104：`| **不用空词** | 赋能／解锁／一站式／无缝体验 等 40 词黑名单，命中 0 |`
- `02-anti-ai-rules.md` L597–L599（§7.1）：黑名单的适用位是**主张句、按钮文字、空状态文字、示例文案、字段 1、字段 10**；`L599` 给出判据：「把这句话拿给一个真实用户，他能追问出**谁**、**做了什么动作**、**带来什么可数变化**吗？」

**实测证据**（40 词逐词正则扫渲染文本，位置保真）
```
S14 index.html L267  「每一枚都可聚焦，焦点环是 2px 直角方框…」      → 命中词「聚焦」，实为「可·聚焦」（子串）
S18 index.html L309  「…周期 530ms，方波（半周期 530ms、全周期 1060ms）」 → 命中词「全周期」
S26 index.html L398  「…量值落在 ±0.5px 以内即闭环。」               → 命中词「闭环」
```
- S14：**纯子串误报**。按 `_CONTRACT.md` §9.9 L166–L167（"禁用词与禁用字体要按词边界查"）应排除，不算命中。
- S18：`全周期 1060ms` 与紧邻的 `半周期 530ms` 构成一对**可数事实**，不是"不说明周期的起止"（`02` L640 对角色的描述）。判据三问全过（谁：光标／动作：周期／可数变化：1060ms）。
- S26：`±0.5px 以内即闭环` 出现在 `role="group" aria-label="错误状态与处置条件"` 的处置句里（L394–L399），给了**具体量值**。`02` L614 说"闭环"空洞是因为"不提具体起点与终点"——这里有终点（复量三处撞口、±0.5px）。

**为什么我判"否"**：`_CONTRACT.md` L104 的四个示例（赋能/解锁/一站式/无缝体验）全是营销词；`02` L595–L600 把口径收窄到六类上站文案并给了可判定的追问测试，而 S18/S26 的两处通过了该测试。若按 §6 的"命中 0"字面判，则任何工程术语（"全周期""闭环"本身就是控制论/电学的标准词）在技术页上都不可用——那不是条款的执行，是条款的失效。**但字面冲突真实存在，已记入 §4-G1 与 §6-3。**

---

### #8 【形式命中·否】S15 表格里的「同上」

**条款原文摘录**：`_CONTRACT.md` L105：`| **无删减托辞** | 不得写"由于篇幅限制""以下省略""简要描述""不再展开" |`；`02` L392（R-30）把"表示与前文重复而跳过的两字惯用语"也列入，D-13（L94）的正则含 `同[上]`。

**实测证据**：`S15 index.html` L394 `<tr><td>年份切换</td><td><code>260ms</code> 交叉叠化，两层参与</td><td><code>100ms</code> 不透明度瞬切</td><td>同上，另可按层展开标注</td></tr>`——在一张"正常／降级／窄屏"三列的**对照表**里。

**为什么我判"否"**：① §6 L105 的四个词条逐个看，不含"同上"；② 这里它是表格 ditto 记号（同一行前两列已给出完整参数），不是"内容被砍掉的托辞"；③ R-30 的目标是"把该写的内容伪装成已完成"，而该单元格额外给了新信息（"另可按层展开标注"）。**但机械 grep 会命中，属条款措辞与实现习惯的擦边**，记入 §6-3 的伴生项。

---

### #9 【形式命中·否】6 案的旧值字面出现在 CSS 注释里

**条款原文摘录**
- `_CURRENT-VALUES.md` L29：`括号内是**被它取代的旧值**——旧值不得再出现在原型里。`
- `_CURRENT-VALUES.md` L82：`## 2 被替换掉的旧值一览（旧值不得出现在原型里）`

**实测证据**（位置保真扫描，26 个旧值逐个查）

| 案 | 文件:行 | 原文片段 |
| --- | --- | --- |
| S04 | `style.css` L3 | `--orange #96550F 主色（07 号审查把 #E8871E 压深以拿到 4.56:1；本页未再使用旧亮橙）` |
| S10 | `style.css` L5 | `无光泽纸 #F2EFE8 58%（背景；旧值 #F4F1EA 已作废）` |
| S15 | `style.css` L5 | `（旧值 #F1E9DA 已废，不得出现）` |
| S16 | `style.css` L7 | `—— 对纸底 4.74:1（旧 #E63312 只有 3.52:1，已废）` |
| S19 | `style.css` L6 | `#E4DECD 标本卡纸（地面，唯一底色；旧值 #EDE6D4 已废，本页不出现）` |
| S28 | `style.css` L3 | `落在 palette-purple 的 244–295 窗口内：Lead 已批准的单案换色（旧值 #1F5FA8 不得出现）。` |

**为什么我判"否"**
1. 六处**全部在 CSS 注释内**，`verify-prototype.mjs` L17–L24 与契约 §9.13 L179–L180 共同确立的口径是"注释不渲染，扫描要剥掉注释"；同一逻辑对色值适用。
2. 六处**全部带否定语境**（"已废""不得出现""未再使用"），与 `02` §7.1 L598 对批判性引用的豁免同型。
3. 六案的实际渲染底色与主色全部合格（`report.json.color.bodyBg` 30/30 与 `_CURRENT-VALUES` 逐字一致，见 §1 行 22）。
4. **但不是零风险**：任何一个 grep 型检查器都会把六案判红。这是条款措辞（"不得出现在原型里"没说"不得在注释里引用"）与工程实践（在注释里留废弃痕迹）的冲突，记入 §6-2。

**建议**：把六处注释改成不含完整旧 HEX 的写法（如 `已压深以拿到 4.56:1`），成本为零，消除歧义。

---

### #10 【轻】S25 的错误态没有任何可见状态区块（§9.12 只满足一半）

**条款原文摘录**：`_CONTRACT.md` L176：`**错误态要在首屏或截图可达的位置有可见入口**（或用 <details> 展开、或作为可见的"状态"区块列出），别只留在 JS 分支里。`

**实测证据**
- 满足的一半：`index.html` L141/L148/L155/L162/L169/L176/L183/L190 有 8 个可见的 `试读` 按钮（`aria-expanded="false"`），是可见入口。错误态**不是**只在 JS 分支里（L196 是静态 HTML）。
- 不满足的一半：`#specimen` 容器 L194 默认 `hidden`，L195/L196/L197 三条状态**全部** `hidden`；页面上没有任何"状态"区块列出三态；`<details>` 一条也没用。
- 对照组：S21 用 L359–L391 的可见「登记状态」区块把载入中/停用/故障/空簿四态**列了出来**，是 §9.12 的正面样本。

**为什么这条是可执行的**：L176 给了三条明确出路（首屏可见入口／`<details>`／可见状态区块），可逐条打勾；S21 与 S02 都走了其中一条。

**建议怎么修**：把 L194 的 `hidden` 去掉、改成 `<details>`（默认收起），或在该 section 末尾加一行可见的「试读状态：正在取件／已回片／待冲洗（`GATHER-04`）」——顺带把 #1 的错误码一并落地。

---

### #11 【轻 / 有争点】桌面档只有 1 张 `*-page-*.jpg`（S05、S17）

**条款原文摘录**：`_CONTRACT.md` L122：`3. .inspect/ 里有三档 *-fold.jpg ＋ 至少 2 张 *-page-*.jpg ＋ report.json。`

**实测证据**
```
从 .inspect/report.json 的 images[] 逐案读 fold / pages 计数：
S05  1440:fold=Y pages=1   768:fold=Y pages=1   390:fold=Y pages=1
S17  1440:fold=Y pages=1   768:fold=Y pages=2   390:fold=Y pages=2
其余 28 案桌面档 pages ≥2
```
按"合计 ≥2 张"读：30 案全过。按"每档 ≥2 张"读：2 案违反。条款没写限定语。

**为什么算可执行**：计数即判据；且闸门脚本 `verify-prototype.mjs` **完全没有查 page 数**（L132–L136 只循环 `fold`），所以这条从来没有被机械执行过——见 §4-G5。

**建议怎么修**：由 Lead 在 L122 补限定语（"合计"还是"每档"）；若定为"每档 ≥2"，在 `verify-prototype.mjs` L133 的循环里同时判 `im.pages.length >= 2`，并对 S05/S17 在 1440 档补一张 `desktop-page-02.jpg`（重跑 `render-scheme.mjs` 即可，S05 页高 4 屏、S17 3 屏，都有内容可拍）。

---

### #12 【严重·机制性】§7.4 的交付说明：24 案根本没有，6 案的存放在被 gitignore 的目录

**条款原文摘录**：`_CONTRACT.md` L123：`4. 交付说明里给出：**FAIL/WARN 计数**、**实际用到的字体族与来源方式**、**素材来源与署名**、**你自己知道的两处最弱的地方**。`（`§9.11` L173 重复了最后一项）

**实测证据**
```
deliverables/ 下逐案交付说明只有 6 份：
  tool-runs/S04-adjudication.md  S07-adjudication.md  S08-adjudication.md
  S13-adjudication.md            S17-adjudication.md  S21-adjudication.md
.gitignore L18: deliverables/tool-runs/     ← 整个目录被排除
⇒ S01–S03、S05、S06、S09–S12、S14–S16、S18–S20、S22–S30 共 24 案：无任何交付说明
```
`deliverables/14-tool-runs-report.md` 有工具说明（L38 给命令用法、L406 给"规则判定可靠"），但**不含**逐案的 FAIL/WARN 计数与"两处最弱"。

**为什么这条是可执行的**：四项内容都是可枚举字段；6 份 `*-adjudication.md` 就是同一模板做出来的（例如 `S07-adjudication.md` L11–L15 给命令与原始输出、L29 给裁定口径、L31 起逐条列保留项），证明格式可复制。

**建议怎么修**：① 把 `deliverables/tool-runs/*-adjudication.md` 从 `.gitignore` L18 移出或复制进一个不被排除的路径——**这是最要紧的一步**：目录里有"两处最弱"和 FAIL 授权讨论，被排除等于授权链断裂；② 其余 24 案按同一模板补交付说明。

---

### #13 【轻】§2 的体积区间：16 处越上界

**条款原文摘录**：`_CONTRACT.md` L27–L28：`index.html 18–27 KB（对齐现有 8 个；太短说明内容不足，多半会被闸门判 empty）` ／ `style.css 12–31 KB`。

**实测证据**（`statSync().size / 1024`，闸门同刻度）
```
index.html >27KB（13 案）：S14 31.9  S15 41.4  S18 40.6  S19 36.6  S20 35.7  S21 32.6
                          S22 30.3  S23 33.9  S24 36.9  S26 33.1  S27 38.1  S28 43.7  S29 48.4
style.css >31KB（3 案）：S13 33.4  S21 37.0  S28 37.0
无下界越界（最小 S07 18.0K / css 12.2K，均在区间内）
```
**为什么这条是可执行的**：体积是字节数；闸门已经算了 `htmlKB`（`verify-prototype.mjs` L38）并只判下界（L40 `if (out.htmlKB < 12)`），上界从未判。

**建议怎么修**：这是"区间"而不是"上限"（措辞是"对齐现有 8 个"），三种处置都成立：① 由 Lead 把 L27–L28 改成"下限 18K / 12K，无上限"；② 或把上限抬高到实测最大值并说明；③ 若坚持 27K，S29（48.4K）需要把 `<svg><use>` 图例表拆到外部 sprite。**在契约定性之前，这 16 处只能算"越界"而不能算"缺陷"。**

---

### #14 【否·明文授权】S30 的 `#00E676`

**条款原文摘录**：`_CURRENT-VALUES.md` L76：`**#00E676 降为装饰性实色块，其上文字固定 #007B3F`；`_CURRENT-VALUES.md` L19（§0）：`被降级为"装饰性实色块"的颜色**不承载文字与图标**`。

**实测证据**
```
S30 style.css L23  --deco: #00E676;  /* 装饰性实色块，不承载文字与图标 */
S30 index.html L69 「…带里是装饰用的实色 <code>#00E676</code>：不承载文字与图标，若带上有文字，文字固定用 <code>#007B3F</code>。」
S30 index.html L152 「<code>#00E676</code> 装饰性实色块：不承载文字与图标，其上文字固定 <code>#007B3F</code>。」
```
**判"否"的依据**：L76 明文授权保留该色为装饰，实现同时满足了 L19 的"不承载文字"约束，并在页面上把约束写了出来。
**但要记一笔**：`_CURRENT-VALUES` §2 的 L112 又把 `#00E676` 列进"禁用旧值"表（"旧值 `#00E676` → 现行 `#007B3F`"）。**同一份文件的两张表对同一个色互相矛盾**——见 §6-2。

---

## §3 模板层豁免声明核验

核验对象：`templates/M0x/README.md` 里"豁免了什么"与"仍然守住的"两类声明。
方法：每条声明 → 找实现里的对应事实 → 判 **属实 / 夸大 / 漏项**。实测证据来自 `_crit4b/static.json`（静态扫描）与 `_crit4b/m01|m02retry|m03/report.json`（用同一把 taste-skill `inspect.mjs` 三档实测）。

### 3.1 M01 清爽企业站

| 声明（行号） | 内容 | 实测 | 判定 |
| --- | --- | --- | --- |
| M01 README L154/L156 | "下面这些条款在这一层**明示豁免**，豁免范围写清楚" | 表内 10 行条款 + 豁免范围列齐全；L168 另起"没有豁免"清单 | **属实** |
| L162 | R-16 豁免：`--radius:10px` + 两层浅阴影 | `inspect` @1440 → `FAIL [shadow] 3 box-shadow(s) on elements at rest`（`article.card` 命 `0 1px 2px`+`0 16px 30px -24px`）；`static.json.boxShadows=3`；`radius16-32` 命中 0（10px 不在 16–32 窗内） | **属实**（自认违规，且数量与实测一致） |
| L163 | R-07/R-08 豁免：`--font` 就是系统栈，且同时出现 `system-ui`、`-apple-system`、`Segoe UI`、`Roboto`、`Helvetica`、`Arial`… | `style.css` L27 一处命中全部 6 个；`inspect` @1440 `families=[{system-ui, share:1}]` | **属实** |
| L160 | R-05 豁免：`--bg-2 #F4F7FA` 与白底交替 | `inspect` 的 `color.sectionBgs` 含 `#f4f7fa`；`bodyBg=#ffffff` | **属实** |
| L161 | R-04 豁免：白底保留，**没有用纯黑字**（用 `#141B23`） | `grep '#000000'` 于 M01 `index.html` = **0**、`style.css` = **0**；`#000` 亦 0 | **属实** |
| L165 | R-17 只豁免"吸顶"：`backdrop-filter` **一次都没出现** | `static.json.backdropFilter = 0`；`inspect` → `blurred = 0`，且**无** `glass` 发现 | **属实**（这句是本层最容易被夸大的一句，实测干净） |
| L166 | R-01/R-02 豁免：**实际一个 CSS 渐变都没有** | `static.json.gradients = 0`（`linear/radial/conic/repeating` 全 0）；`inspect` @1440 `surfaces.gradients = 0` | **属实** |
| L170 | R-21 无豁免：全站 **0 个 Emoji**（脚本扫渲染文本三区间） | `static.json.emoji = 0`；`inspect` 无 `emoji` 发现 | **属实** |
| L174 | 第 7 节 40 词命中 **0** | `static.json.black40 = []`；`cutPhrases = []` | **属实** |
| L176 | 三档 `scrollWidth == innerWidth`（0px 溢出） | `inspect` 1440/768/390 全部 `horizontalOverflow = 0` | **属实** |
| L177 | 正文不得 <15px、对比度 ≥4.5:1 | `inspect` @1440 `type.body.size = 16`；`color.lowContrast` 为空（**0 处**）；只有 1 条 `WARN [grey-body] 6.7:1`（>4.5） | **属实** |
| L178 | 无远程资源：`http(s)` 的 `src`/`url()` 一处都没有 | `static.json.remoteSrc = 0`、`googleFontsLink = 0`、`aHrefHttp = 0` | **属实** |
| L180 | 无构建步骤 | 目录内只有 `index.html`/`style.css`/`README.md`/`TOKENS.md`，无 `package.json` | **属实** |
| L115–L119 | 三档实测页高 4607 / 5768 / 7698、横向溢出 0 | 实测 `metrics.page.height` = **4607 / 5768 / 7698**，溢出 0/0/0（逐字相符） | **属实** |
| L227 | 实测修订记录：`index.html 25283 bytes`、`style.css 19422 bytes` | `statSync` = **25283** / **19422**（逐字相符） | **属实** |
| **L20** | 全站共 **84 处**标记 | `换成你的` = **95** 处；`【换成你的：` = **85** 处；`【换成你的` = **86** 处 | **夸大（三种口径都不是 84）** |
| **L141** | "每个内联 SVG 占位框都写了 `role="img"` + `aria-label` + `<title>`" | `<svg` 起始标签 **14** 个、`role="img"` **9** 处、`aria-label` **20** 处、`<title>` **10** 处。差值可由 `brand-mark`（README §4 说明用 `currentColor`、无 `role="img"`）与嵌套 `<svg>` 解释 | **存疑（已记 §6-3）** |
| L154 表 vs 工具实测 | README §7 之后写"拿 30 案那把闸门跑，你会看到 FAIL（`eyebrow`、`hairline`、`few-pictures`、`still-page` 等）" | 实测 FAIL 共 **10 个 id**：`headline-lines`、`eyebrow`、`numbering`、`shadow`、`hairline`、`outlined-box`、`icon-cards`、`few-pictures`、`focal-point`、`still-page`；WARN 3 个：`grey-body`、`no-footage`、`side-scroll` | **漏项**：`numbering` / `outlined-box` / `icon-cards` / `focal-point` / `headline-lines` / `side-scroll` 未被任何豁免行点名，只被"等"字兜住 |

### 3.2 M02 暖调门店站

| 声明（行号） | 内容 | 实测 | 判定 |
| --- | --- | --- | --- |
| L169 | "**豁免范围仅限 `templates/M0x/` 目录**" | 与 L161–L167 的层对照表一致；且 L204 明确"以后再加模板继续守这条线" | **属实** |
| L176 | R-07/R-08 豁免：标题 `Georgia/Times/宋体` 衬线栈，正文 `system-ui/Segoe UI/苹方/微软雅黑` | `style.css` L34–L35 命中 `system-ui`、`-apple-system`、`Segoe UI`、`Arial`；`inspect` @1440 `families=[{system-ui,87%},{Georgia,13%}]` | **属实** |
| L177 | R-26 豁免：占位标记；且"`此处填写`、`待补充`、`点击这里`、`Lorem ipsum` 一个都没用" | `static.json.placeholders = []`（四词与 `lorem/ipsum/示例文案/文本内容` 全部 0）；`换成你的` = 76 处，`【换成你的：` = 75 处 | **属实** |
| L178 | R-24 豁免：只保留"价目表点线引导 + 手绘强调线" | `inspect` 无 `feature`/`icon-cards` 发现；`surfaces.cardRows = []` | **属实** |
| L180 | R-23 豁免："本层一张照片都不带" | `inspect` @1440 `realPictures = 0`、`uiPictures = 0` → 触发 `FAIL [few-pictures] 0 picture(s)`，与 README §8.4 L285 的申报一致 | **属实** |
| **L188** | "不用 24px 圆角 + 柔和投影（R-16）：圆角只有 `8px`，**全站零 `box-shadow`**" | `static.json.boxShadows = 0`；`inspect` @1440/768/390 `surfaces.shadowStatic = 0`、无 `shadow` 发现；`--radius: 8px`（`style.css` L119） | **属实**（本层最硬的一句，实测零命中） |
| L189 | "全站**没有任何渐变**" | `gradients = 0`；`inspect` `surfaces.gradients = 0` 三档 | **属实** |
| L190 | "**没有 `backdrop-filter`**" | `static.json.backdropFilter = 0`；`surfaces.blurred = 0` | **属实** |
| L191 | "图形全部是内联 SVG，零 Emoji" | `emoji = 0`；`inspect` 无 `emoji` 发现 | **属实** |
| L192 | 不用空洞营销词：文案是「步行 6 分钟」「出餐约 15 分钟」这类具体句 | `black40 = []`；`cutPhrases = []` | **属实** |
| L221–L224 | 页高 **5870 / 7779 / 8242**，横向溢出 0，文档宽＝视口宽 | 实测 `page.height` = **5870 / 7779 / 8242**，溢出 0/0/0（逐字相符） | **属实** |
| L277 | §8.4 对工具跑一遍：`overflow 0、broken-image 0、consoleErrors 0、contrast 无发现、body-size、small-text、covered-text、clipped-text、pinned-over-picture、headline-lines、emoji、gradient、shadow、glass 均无发现`；字体族数 2（`system-ui 87% + Georgia 13%`） | 实测 `overflow=0`、`brokenImages=0`、`consoleErrors=0`、`color.lowContrast=0`、`smallText=0`、`gradients=0`、`shadowStatic=0`、`blurred=0`、`over2Lines=0`、`families=[system-ui 87%, Georgia 13%]` — **逐项对上**；其中 `body-size` 一项实测为 `null`（该案正文不是固定 px，规则无法判定，属"空过"而非"通过"） | **属实**（`body-size` 标"空过"） |
| L283–L289 | 预期中的 FAIL/WARN：`eyebrow`、`hairline`、`few-pictures`、`still-page` ＋ `palette-cream`、`dashed`、`no-footage` | 实测 FAIL 恰好这 **4 个**、WARN 恰好这 **3 个**（`dashed` 17 处、`palette-cream` 列出 `#fdf7ee/#e6e2db/#f7eada`、`no-footage`） | **属实，无漏项** |
| L265 | §8.3 "正文 ≥16px ✅ 全部文本 ≥16px，**0 处小于 16px**" | `static.json.minFontPx = 16`（px 声明最小值）；但 `inspect` 的 `type.body = null` → 无法从渲染层复核 | **基本属实 / 渲染层不可核** |
| L232 | "1440 与 390 两档都是 0 处不达标、0 处字号小于 16px" | `color.lowContrast = 0` 与 `smallText = 0` 两档都为 0 | **属实** |

**M02 的结论：14 条声明中 13 条属实、1 条"空过"，无夸大、无漏项。** 这一份 §7 豁免表是本层三份里质量最高的一份——它把工具会报的 FAIL 全部预先列了出来并逐条给理由。

### 3.3 M03 醒目作品集

| 声明（行号） | 内容 | 实测 | 判定 |
| --- | --- | --- | --- |
| L131–L135 | 列出 30 案禁止的 7 条，L145 声明"这一层明确豁免上述全部 7 条" | 7 条与 `00-BRIEF-AND-CONSTRAINTS.md` C-1/C-2 对得上 | **属实** |
| L161 | 豁免 5：系统字体栈，`--font` 一个变量控制 | `style.css` L29–L30 命中 `system-ui`、`-apple-system`、`Segoe UI`、`Roboto`、`Helvetica`、`Arial`；`inspect` @1440 `families=[ui-sans-serif 75%, ui-monospace 25%, Arial 1%]` | **属实** |
| L162 | 豁免 6：**本层不用渐变** | `gradients = 0`；`inspect` `surfaces.gradients = 0` 三档 | **属实** |
| L163 | 豁免 7：导航是**不透明**纯色吸顶条，只用一条 1px 底线 | `static.json.backdropFilter = 0`；`position:sticky` 存在（豁免的就是吸顶本身） | **属实** |
| L185 | `prefers-reduced-motion: reduce` 时关闭全部过渡动画 | `static.json.reducedMotion = 1` | **属实** |
| L189 | "三个断点实测……**三档横向滚动宽度 = 视口宽度，零横向溢出**" | `inspect` 1440/768/390 `horizontalOverflow = 0`；页高实测 5527 / 4860 / 4338 | **属实** |
| **L160** | 豁免 4："本层用 `--radius:2px`（几乎直角）+ 1px 硬边线 + **零投影**" | `style.css` **L122** `box-shadow: 0 -5px 0 currentColor, 0 5px 0 currentColor;`（`.nav-toggle .bars` 汉堡条的两条横线）→ 全站投影声明数 = **1**，不是 0 | **夸大**（"零投影"字面不成立；实质无害：16×1px 的汉堡条上两条硬边线，不属于 R-16 的"柔和浮起"；工具三档都没计数到它，见 §4-G8） |
| **L31 vs L164** | §二"一共 **32 处**"；§六 末"真正的成品请把 **27 处**全部替换掉" | `index.html` 中 `换成你的` / `【换成你的：` / `【换成你的` **三者都等于 33** | **夸大（两个数字都不对，且互相矛盾）** |
| **§六全段 vs 工具实测** | L135–L144 逐条解释 7 条豁免，但**没有任何一处声明"工具会报哪些 FAIL/WARN"**（不像 M01 §7 末、M02 §8.4） | 实测 @1440 FAIL **7 个**：`eyebrow`(4)、`mono`（`ui-monospace 25%`，样本「【换成你的：身份 / 城市…】」「作品」「01」）、`numbering`(01–05)、`hairline`(11)、`outlined-box`(5)、`few-pictures`(0 张)、`still-page`(0 动件)；WARN：`card-rows`、`no-footage` | **漏项**：7 条 FAIL 一个都没申报；其中 `mono` 与 `Arial 1%` 是本层自己的系统栈造成的，属**未申报的后果** |
| L174 | 正文最小 16px，没有比 16px 更小的正文 | 排版用 `rem`/`clamp`，`static.json.minFontPx = 34`（px 声明最小值，实际来自 `clamp` 的上限），`inspect` 的 `type.body = null` | **渲染层不可核**（记 §7-3） |
| L191 | 首屏标题 `clamp()`：390px→48px、768px→80.6px、1440px→136px | `inspect` @1440 `hero.size = 34px`（探针量到的是最大文本节点，不是标题元素）；三档未逐值复核 | **存疑（未核）** |

**M03 的结论：8 条属实、2 条夸大（零投影、标记数）、1 条漏项（未申报任何工具 FAIL）、2 条渲染层不可核。**

---

## §4 闸门与契约的不一致

口径：`_CONTRACT.md` §7 声称的验收标准（§7.2 的 `FAIL = 0` + §3 的"唯一"命令）vs `_build/verify-prototype.mjs` 与 `tools/taste-skill/…/inspect.mjs` + `lib/rules.mjs` + `lint.mjs` 实际查的东西。

**共 12 条不一致。** 分两类：契约要求但工具不查（G1–G7）、工具在查但契约没写（G8–G12）。

| 编号 | 方向 | 契约的写法 | 工具的实情 | 后果 |
| --- | --- | --- | --- | --- |
| **G1** | 契约有·工具无 | §6 L104「40 词黑名单，**命中 0**」 | `grep -nE '赋能\|解锁\|一站式\|无缝' rules.mjs lint.mjs inspect.mjs verify-prototype.mjs` → **0 命中**；52 个 rule id 里没有任何词表规则 | 40 词的合规**全靠人工**；本报告 §1 行 7 是我自己扫的 |
| **G2** | 契约有·工具无 | §6 L105「无删减托辞」 | 三脚本对 `由于篇幅\|以下省略\|简要描述\|不再展开\|同上` → **0 命中** | 同上 |
| **G3** | 契约有·工具无 | §6 L109「必须有错误状态｜带 `_CURRENT-VALUES.md` 指定的错误码」 | 三个脚本**不读任何错误码**；`report.json` 里没有错误态字段 | **S21/S25 缺码能一路走到交付**（§1 行 12）——这条一旦不机械执行，它就必然掉 |
| **G4** | 契约有·工具无 | §6 L110「必须有 `prefers-reduced-motion` 降级」 | `grep -nE 'reduced\|prefers' rules.mjs probe.mjs inspect.mjs` → **0 命中**；`RULE_IDS`（rules.mjs L137）52 个里没有它 | 30 案的降级路径质量同样未被任何工具约束 |
| **G5** | 契约有·工具无 | §7.3「三档 `*-fold.jpg` ＋ **至少 2 张** `*-page-*.jpg`」 | `verify-prototype.mjs` L132–L136 只循环判 `im.fold`，**从不读 `im.pages`** | S05/S17 桌面档只有 1 张 page 却判定达标（§1 行 17） |
| **G6** | 契约有·工具无 | §7.4「交付说明含 FAIL/WARN 计数、字体族与来源、素材来源与署名、**两处最弱**」 | L84 只查 `assets/CREDITS.md` 存在；L85 对 `credits.json` 缺失只记 `notes`（不判不合格）；"两处最弱"无检查 | 24 案无交付说明仍算达标（§1 行 18） |
| **G7** | 契约有·工具无 | §2 L27–L28「`index.html` 18–27 KB；`style.css` 12–31 KB」 | L40 只有 `if (out.htmlKB < 12)`；上界不判 | 16 处越上界（§1 行 19） |
| **G8** | 工具查·契约无 | §6 的 12 行表里**没有** `box-shadow` 这一行 | rules.mjs L70 `if (s.shadowStatic) add('FAIL','shadow', …)` ——任何静止态 `box-shadow` 即 FAIL | S13 的 `shadow`/`button-fx` 是不是违规，完全取决于读 §6 表还是读 §7.2（见 §5-2） |
| **G9** | 工具查·契约无 | §6 表只有 **12 行**；连同 §5 L91、§9.14 L184 共点名 **9 个** rule id（`emoji`／远程资源／禁用字体栈／`gradient`／`headline-lines`／`body-size`／`overflow`／`few-pictures`／`measure`） | rules.mjs 的 `RULE_IDS` 有 **52 个** id，其中**能发 FAIL 的有 29 个**（`eyebrow`/`numbering`/`micro-label`/`gradient-text`/`shadow`/`text-shadow`/`button-fx`/`hairline`/`outlined-box`/`icon-cards`/`palette-claude`/`palette-terracotta`/`palette-purple`/`contrast`/`font-count`/`small-text`/`broken-image`/`focal-point`/`ui-wrapper`/`empty-screens`/`covered-text`/`clipped-text`/`mono`/`font-fallback`/`still-page` …） | **22 个 FAIL 级规则在 `_CONTRACT.md` 里没有对应条文**，但 §7.2 的 `FAIL = 0` 把它们全部拉成硬要求 |
| **G10** | 契约内部冲突 | §6 表是**枚举式**（"违反即返工"的 12 条）+ §6 L112–L114 只承认两条工具盲区 | §7.2 是**全称式**（`FAIL = 0`，不限于 §6 表） | 同一条工具发现，按 §6 读可以留、按 §7.2 读必须修；`_CONTRACT.md` 没写哪条优先 |
| **G11** | 工具查·契约无（减项通道） | `_CONTRACT.md` 全文（233 行）**0 次**提到 `--allow` 或 `taste-skill-ignore`（`grep -n 'allow\|ignore' _CONTRACT.md` → 0） | 减项通道有三条且都在用：① `lint.mjs` L73 `if (/taste-skill-ignore/.test(line)) return;`（行级豁免）；② `inspect.mjs` L20/L28–L29 `--allow a,b`（规则级申诉）；③ `draw.mjs` 写的 `.taste-skill` 允许表（L27–L29 自动并入） | S13 源码里有 **18 处** `taste-skill-ignore`（`S13-adjudication.md` L35 自记："闸一报 0 FAIL, 0 WARN，但这个 0 是在**使用工具自带逐行豁免**的前提下取得的"）；S23 `style.css` L192/197/203/215/216 另有 5 处。契约没有承认这套机制，"FAIL = 0" 的含义因此不确定 |
| **G12** | 契约内部冲突 | §3 L41–L43：「渲染命令（**唯一，不许换**）」——给的是不带任何参数的形式 | `render-scheme.mjs` 自己支持 `--allow`（用法行 L8 `node render-scheme.mjs S01-… --allow hairline,font-count`；L26–L27 解析） | 「唯一命令」与「命令支持申诉」并列存在；`report.json.allow` 会记录用的是哪一种，但契约没规定交付时该用哪种 |

**最要紧的一条是 G3。** 契约里唯一一条"每案必须有、且带具体值"的条款（错误码），是**唯一一个工具完全不看的条款**，而它恰好就是本次唯一出现缺失的地方（S21/S25）。这不是巧合，是"没有闸门就没有执行"的直接演示。

---

## §5 我判为"设计意图而非违反"的项

判据：`_CONTRACT.md` §6 的"故意犯规必须能找到明文授权"——授权必须落在**具体文件的具体行**，且没有另一条契约否定它。凡是靠"看起来像故意的"或"人不觉得难看"过桥的，我都不收。

### 5-1 `mono` FAIL（S07 / S13 / S21）——§9.15 明文授权

- 授权行：`_CONTRACT.md` L193 `| mono | 30 案的字段 4 都规定了"辅助数字用等宽字族"（编号、时刻、页码、尺寸），这些都在 <code> 之外 | 保留等宽槽；报告原始 FAIL 并说明 |`
- 实测吻合：S07 `46`/`2026-02`/`118`/`G-4`、S21 `22:04`/`22:00`/`23:00`、S13 `0.4mm` —— 全部是编号/时刻/尺寸，正是 L193 描述的那类。
- 为什么我不判违反：条款**预见到会必然触发**，并给出了处理方式（保留槽 + 报告原始 FAIL + 说明）。`_CURRENT-VALUES` 也逐案钉死了等宽槽（L54 S15 `Reddit Mono`、L56 S17 `Sometype Mono`、L52 S13 `DM Mono`）。授权链完整。

### 5-2 S13 的 `shadow` / `button-fx`——字段 8 与字段 11 授权"单向硬光源压痕"

- 授权行：`_specs/S13.md` L35（字段 8）`第一，反 C-2.11"24px 圆角加柔和投影的卡片浮起"：全站圆角为 0，所有容器都是直角铅字块，页面没有任何柔和投影，**唯一阴影来自单向硬光源**`；L51（字段 11）`凹槽用**单向内阴影加单向外接触阴影两条**实现，方向由 CSS 变量 --light-azimuth 统一控制，按下时把变量从 135deg 改为 315deg`。
- 实测吻合：`report.json` 的 `shadow` 样本 `h3.clause__head → rgba(36,31,23,0.11) 2px 2px 3px 0px inset, rgba(36,31,23,0.06) 2px 2px …` —— 两条阴影**同向**（`2px 2px`），一条 `inset`（内）一条外接触，正是字段 11 写的"两条"。`buttons.withShadow = 4` 对应字段 7 L32 的"按下时光源方位角由 135° 反转为 315°，下沉 0.8px"。
- 为什么我不判违反（实质层）：规格**点名要求**用单向阴影实现盲压；把 `filter: drop-shadow` 换成 `box-shadow` 只是实现手段的选择，`§9.3` L148–L149 承认 `drop-shadow` 是"合规手段"，两者在物理上同源。**但形式层仍然违反 §7.2**（FAIL ≠ 0），且 §9.15 L190–L196 的允许表**没有把这两条写进去**——这是契约的缺口，不是 S13 的缺口。已记入 §4-G8/G10、§6-3。

### 5-3 S23 的 7 处渐变函数——硬停取色出单色实线，不是 AI 味渐变

- 授权行：`_CONTRACT.md` L103 `| **无 AI 味渐变** | 紫蓝／粉紫那一类；gradient 规则会查 |`（禁区是**那一类配色**，不是函数名）
- 实测：`style.css` L191–L208 三处 `linear-gradient(to bottom, …)`，色标全部成对紧贴（`var(--x1) 0 calc(50% - 1px), var(--lime) calc(50% - 1px) 50%`）→ 输出的是**离散色带**，相邻色标之间没有过渡区；L215–L216 两处 `repeating-linear-gradient(62deg, …)` 是 62° 铲痕的 1px 平铺图案。
- 颜色：`var(--lime)` / `var(--oxide)` 是 S23 的石灰白与锈色（该案主色 `#A8206B`，见 `_CURRENT-VALUES` L69），**不是紫蓝、不是粉紫**，也不落 `rules.mjs` L13 的 `ai-purple` 窗口。
- 为什么我不判违反：§6 L103 的禁区是配色配对，这两处不命中；`report.json` 三档 `surfaces.gradients` 全 0（伪元素不在探针的元素集合里），所以连工具都没判它。**但要记一笔**：`style.css` L192/197/203/215/216 那 5 条注释写的是 `/* taste-skill-ignore … */`，而 `taste-skill-ignore` 是 **lint.mjs L73 的行级机制**，对 `inspect` 的渲染判定无效——作者显然以为写了注释就豁免了渲染闸门，这是对工具的误解（记入 §4-G11）。

### 5-4 S03 注释里的 `Inter / Roboto / Arial / system-ui`

- 授权行：`_CONTRACT.md` L72 `**字体里的禁用项**（font-family 声明中出现次数必须为 0）`；`_CURRENT-VALUES.md` L17 同口径。
- 实测：`style.css` L33–L34 是注释 `/* 中文主字体＝思源黑体；西文正文＝IBM Plex Sans。字栈不含 Inter / Roboto / Arial / system-ui。 */`，L35 的实际声明 `"IBM Plex Sans", "Noto Sans SC", …` 干净。
- 为什么我不判违反：条款限定"进入 `font-family` **声明**"；注释不是声明。§9.13 L179–L180 已经在 Emoji 上确立了同类口径（"注释根本不渲染，那是规则过宽造成的无效劳动"）。`report.json` @1440 `families` 也只有 `IBM Plex Sans`/`IBM Plex Mono`/`Space Grotesk` 三族。

### 5-5 S14 / S19 降级块里的「取消」

- 授权行：`_CONTRACT.md` L110 的后半句 + §9.9 L166–L167（"反向也要查：`关掉／收起来` 一类同义否定也算 R 型要求里被禁的'否定机制'"）。
- 实测：S14 `style.css` L393→`/* 漂移半径归 0 → 静态定格 */`，但同一行上方 L376 的窄屏再发明是 `--dr2: 8`（配合 `_CURRENT-VALUES` L53 的"漂移半径 12px→8px"）；L393 的 `--dr:0` 出现在 `@media (prefers-reduced-motion: reduce)` **内部**，即降级动作本身。S19 的注释直接写「抽拉机制**不**取消：点一下才抽出、无过渡，位移仍 24px」。
- 为什么我不判违反：这两处「取消」都在**否定否定**的语境里，按 §9.9 的口径不构成"否掉签名机制"；窄屏再发明形式都带数值（S14 L325 `--dr:24`、L338 `--dr2:12`、L376 `--dr2:8`）。

### 5-6 S30 的 `#00E676`——`_CURRENT-VALUES` L76 明文授权

已写在 §2-#14，不重复。

### 5-7 模板层 6 条豁免（R-05 / R-07 / R-08 / R-12 / R-13 / R-16 / R-17 / R-26）

- 授权行：三份 README 各自的范围声明 —— M01 L154 + L156 表、M02 L169「**豁免范围仅限 `templates/M0x/` 目录**」+ L173–L180 表、M03 L145 + L161–L164。
- 为什么我不判违反：豁免是**逐条**给出的，每条都写了"本层实际怎么做"，且范围被限定在目录内（M02 L169 写得最明确）。三份 README 互相独立、口径一致（"30 案的目标是被记住，这一层的目标是不犯错"）。
- 我唯一判掉的模板层问题是**声明与实现不符**（§3.1 的 L20、§3.3 的 L160/L31-vs-L164），不是"该不该豁免"。

### 5-8 R-15 跨结构的 38 对色相接近——条件不成立

- 授权行：`00-BRIEF-AND-CONSTRAINTS.md` L147 `两个方案的**主色色相差 < 25° 且结构类型相同**`；`02` L582 逐字重复。
- 实测：同骨架的 8 对（`CONSOLE` S05/S21、`CHRONO` S03/S23、`MAG-TOC` S07/S25、`DOSSIER` S13/S27、`MANUAL` S11/S29、`SPLIT` S02/S30、`COLLAGE` S04/S28、`VERSUS` S10/S26）色相差**全部 ≥25°**（最近的是 S04 `#96550F` h31° 对 S28 `#AF74BE` h288°，差 103°）。跨结构对里有 38 对 <25°，但"且结构类型相同"不成立（例：S03 h178 vs S27 h173 差 5°，但 CHRONO ≠ DOSSIER）。
- 为什么我不判违反：条款是**合取**（`且`）。这 38 对属 §F.3 另外三条件（标题字体超家族／关键视觉元素语义重复／动效主机制相同）的管辖范围，那三条在实现上不可机械判（需要读字段 2/6/7 的语义），所以我既不能判违反也不能判通过——记入 §7-3。

### 5-9 S24 的 `buttonFg = #0a1116`（与底色同值）——工具指标失效，不是实现问题

- 现象：`report.json` @1440 `button.bg = #0a1116`、`button.fg = #0a1116`，看似"按钮文字与底色同色"。
- 实情：S24 `style.css` L110–L112 `.btn{ background:var(--grape); color:#FFFFFF; }`（主按钮白字，符合 `_CURRENT_VALUES` L70），L117 `.btn--deep{ background:var(--ink); color:var(--paper); }`。探针 `probe.mjs` L459 的 `buttons` 指标取的是**众数**（`mode(buttons.map(...))`），S24 页面上 `.btn--deep` 的实例多于 `.btn`，众数落在另一种按钮上。
- 为什么我不据此判违反：判据必须是实现里能引到的行；`#FFFFFF` 在 L112 明确存在。**同时这条暴露一个通用风险**：拿 `report.json.buttons.*` 当"按钮字色合规"的证据是不可靠的，任何按钮族异质的页面都会被误读（S04 也受此影响，但 S04 是**真的**没有 `#FFFFFF`，见 §2-#4，我用的是 grep 而不是探针）。

---

## §6 我最不确定的 3 条

### 6-1 S08 的 4 族到底算不算违反 §6 L114

- 我判"是"的依据：L114 写死「不要超过 3」；4 族全部 ≥2% 渲染占比；§9.15 L194 的授权只到 3 族。
- 对抗对象可能的反驳（我认为它站得住）：L114 的算术是"中文主字体 ＋ 拉丁字体 ＋ 等宽数字槽 = 3 族"，它**没有给展示体留位置**；而 `_CURRENT_VALUES` L42 明令 S08 主标题改用 `Gloock`，`_specs/S08.md` L23（字段 4）又要求"辅助数字"用单独一族。三条要求相加必然是 4 族——那么真正自相矛盾的是 §6 L114 与 S08 的字段 4／`_CURRENT_VALUES` L42，而不是实现。若 Lead 采信这条，判定整体翻转（S08 的 `font-count` FAIL 变成授权项，只剩 `palette-terracotta`）。
- 我为什么不撤：我的任务只判"写了却没做到"。L114 是明文且可数；而"三条要求相加必然 4 族"这个论证需要规格自洽性审查员先改 L114 或 L42 才生效。**改之前，实现超出明文上限就是漂移。**

### 6-2 `_CURRENT-VALUES` 内部的两处自相矛盾（同一个文件的两张表打架）

- **冲突 A（S30 的 `#00E676`）**：L76 授权"降为装饰性实色块，其上文字固定 `#007B3F`"；L112（§2 表）却把 `#00E676` 列进"旧值（禁用）→ 现行 `#007B3F`"。同一个文件，一处批准、一处禁用。我按 L76（逐案表、带理由）判"否"，但这属于我在**替规格选边**。
- **冲突 B（旧值出现在注释里）**：L29「旧值不得再出现在原型里」+ L82 的表头「旧值不得出现在原型里」——**没有豁免语**；而 §9.9 L166 与 §9.13 L179–L180 在两处确立了"注释不渲染、扫描要剥注释"的通用口径。我按通用口径判"否"，并且六处命中都在"已废/不得出现"的否定语境里。
- 为什么算不确定：这两处的判定都会因为"以 L29 字面为准还是以 §9 的扫描口径为准"而翻转；而任务规则只写了"_specs 与 _CURRENT-VALUES 冲突时以后者为准"，**没有写 _CURRENT-VALUES 内部冲突或 _CONTRACT 与 _CURRENT-VALUES 冲突时怎么办**。我把两处都按"对实现最不苛刻且能引到口径行"的方式判了，并在 §2-#9、§2-#14 留了修法。

### 6-3 §7.2 的「FAIL = 0」是否允许用 `--allow` 申诉达成

- 判"是违规"的依据：§7.2 只有一句 `FAIL = 0`；§3 声称给出的命令是**唯一**且不含 `--allow`；四案的 `.inspect/report.json` 里 `allow` 字段全是 `[]`，说明交付产物走的是"原始"读法。
- 对抗对象可能的反驳：`render-scheme.mjs` L8 的用法行**自己**把 `--allow hairline,font-count` 写成了示例（L26–L27 实现解析）；`S13-adjudication.md` L13/L30–L31 明确给出「原始 4 FAIL / 5 WARN」与「申诉后 0 FAIL / 5 WARN」两种读数，并把申诉名单写成了记录（`--allow mono,shadow,button-fx,empty-screens`）；L28 还写了一句口径：「凡出现 `--allow` 的地方，"0 FAIL" 只等于"标红已申诉且有记录"」。如果 Lead 认定"有记录的申诉算达标"，那么 §1-#2 的四案里 S07/S21/S13 全部落回合格（`mono` 另有 §9.15 授权、`shadow`/`button-fx` 有字段 8/11 授权），**只剩 S08 的 `font-count`、`palette-terracotta` 与 S13 的 `empty-screens` 三条真正不合格**。
- 我为什么不撤：`allow` 是**申诉通道**，"有没有记录"与"标准是什么"是两件事。契约没有把申诉写进完成判据，而 `deliverables/tool-runs/` 被 `.gitignore` L18 排除——连"有记录"都不在版本库里。**这条一旦由 Lead 定性，本报告 §1 行 16 的"4 案"会变成"1 案"或"3 案"，请把结论落到契约行号上。**

（伴生的小不确定，一并登记：M01 README L20 的"84 处"与 M01 L141 的 `role="img"` 覆盖率，我在 §3.1 分别判了"夸大"与"存疑"。M01 那 84 处有三种计数口径（85/86/95）都不是 84，判夸大是稳的；L141 的 `role="img"` 9 处 vs `<svg>` 14 处的差额能由 `brand-mark`（README §4 明说用 `currentColor`）解释一部分，剩下可能是嵌套 `<svg>`，我没有逐个展开 DOM 去确认，所以留"存疑"。）

---

## §7 本次审查的限制

1. **390 档没有做像素级人工复看。** 按环境事实绕开了 `chrome --window-size=390,844`（Windows 最小窗宽约 500px，那是 500px 布局的左侧裁切），全部走 `inspect.mjs` 的 `Emulation.setDeviceMetricsOverride` 三档。因此本报告**不含任何肉眼排版判断**，"三档都好看"这类问题不在覆盖范围内。
2. **`prefers-reduced-motion` 的"机制在窄屏的再发明形式"只做了存在性检查。** 我逐个读了 30 案的降级块首 420 字符，检查了：媒体查询存在、有数值、有/无"停用/取消/关闭"及其语境。**没有**逐案验证"签名机制是否真的在窄屏被重建"（那需要 30 案 × 2 档手读，且要读懂每案的签名机制是什么）。所以 §1 行 13 的"否"是**形式上**的否。
3. **属方案文本层的条款在实现上不可核。** `02-anti-ai-rules.md` 的 R-09/R-10/R-11/R-31/R-32/R-33/R-34/R-36/R-37、§5 的四维评分、§6 的 V-07/V-08/V-09–V-11，判据都指向"字段""字数""评分"，而实现里没有这些东西。我只核了它们留下的机制物（如三个高危家族案页面上是否存在对应物理机制）。§1 行 34、行 33（F.3 另外三条件）因此是"未核"而不是"通过"。
4. **模板层的"上级规格"不在仓库里。** M01 README L162 与 `TOKENS.md` L114 引用"本层规格要求 8–12px"、M02 README L164 引用"你手上这份任务书"——全库 md 搜「本层规格」只命中模板 README 自己，找不到那份规格文件。所以我只能核 **README 的自述 vs 实现**，不能核"README 的自述 vs 它的规格"。§3 的结论都限定在这个口径内。
5. **我没有重渲 30 案。** `.inspect/report.json` 的 `at` 从 2026-10-16T23:17:30Z（S01）到 2026-10-21T15:30:46Z（S28），我原样读了它们而没有重跑 `render-scheme.mjs`——重跑会覆盖既有产物，违反"不许改任何原型"。所以渲染层数字来自既有报告，静态层数字是本次新算；两者交叉一致处（30/30 底色逐字相符）已在 §1 行 22 标出。**唯一的例外**：三个模板我跑到了 `_crit4b/` 下的独立目录（不改模板），其中 M02 第一次挂在 `Page.goto`（`lib/cdp.mjs` L153），重跑成功，用的第二次结果（`_crit4b/m02retry/report.json`，页高 5870/7779/8242 与 README §8.1 逐字相符，可交叉印证）。
6. **一份"裁定也会错"的先例，我没有据此放宽。** `deliverables/tool-runs/S21-adjudication.md` 曾把 S21 的 `few-pictures`/`empty-screens` 判成"世界挣来的 → 保留"，前提是"字段 9(2) 禁火车/钢轨而本案题材是铁路"。该前提已被实测推翻，S21 现已接上 6 张对题照片、只剩 `mono`（我这次的实测与之一致：`report.json` @1440 `realPictures = 6`，`findings` 里没有 `few-pictures`/`empty-screens`）。**这条说明"有裁定记录"不等于"裁定成立"**——所以 §2-#2 的授权表里，我只收能引到**契约行号或案件字段行号**的授权，不收"某份 adjudication 说可以"。
7. **与既有交付物未做去重。** `24-critique-attack-hunter.md`（AH-16 报过模板层 README 的数字）、`30-critique-assets-license.md`（§6 核过模板层零素材）可能与本报告 §3 部分重合；我按本任务口径重算了，没有引用它们的结论，也没有为了"新"而避开它们。
8. **`_specs/Sxx.md` 与 `_CURRENT-VALUES.md` 的逐案冲突我只查了可核的部分。** 我核了：错误码（30 案）、字段 3 的 HEX（`#C46A1F`/`#7B612C` 等有明确值的案）、字段 4 的字体名、头部"结构类型"。**没有**逐字段比对 30 案 × 12 字段（那属于方案文本层审查）。已发现的冲突：S30 的 `#00E676`（`_CURRENT-VALUES` 内部 L76 vs L112，见 §6-2）、S08 的 4 族与 L114（见 §6-1）。




