# 34 · 文档准确性审查

**审查对象**：`README.md`（202 行）、`README-EN.md`（203 行）、`LICENSE`、`.gitignore`、`.nojekyll`、`index.html`、`prototypes/_CONTRACT.md`、`prototypes/_build/SHOT-README.md`、`templates/M01..M03/README.md` 与 `TOKENS.md`。
**审查日期**：本轮（重跑）。
**审查员立场**：只核**可验证的事实断言**（数字 / 路径 / 命令 / 能力声明），不评文笔、不评结构。
**对抗对象**：文档意图辩护员。本文对每条不一致都给出「为什么这不是意图问题」的论证。

**本轮已确认准确、不重复报的四条（README 已修）**：① 18/30 = 60%（实测 18/30 = 60.0%，复算通过）；② S21 已接 6 张照片（`report.json` `realPictures` = 6，`assets/_cand/` 28 张，复算通过）；③ 选型台中间明度带 1 个（`axes.band` = `中间明度带:1`）；④ 选型台已无 S21 旧闸门残留（`data.js` 的 `gate.at` = `2026-10-21T15:01:01.438Z`，与 `report.json` 同值）。

---

## 1 断言核对总表

行号一律指**该断言所在的文件**（CN = `README.md`，EN = `README-EN.md`）。

| # | 断言原文（带出处行号） | 类别 | 实测 | 一致？ |
| --- | --- | --- | --- | --- |
| A01 | CN L14「**26 个闸门 FAIL=0**」／EN L14 同 | 数字 | 30 份 `report.json` 逐份统计 `findings[].level=="FAIL"`：PASS 26 / FAIL 4 | ✅ |
| A02 | CN L14「**271 张渲染截图**」／EN L14 同 | 数字 | `data.js` `shots` 累计 = **272**（90 fold + 182 page）；30 份 `report.json` `images[]` = **272**；`prototypes/S*/.inspect/*.jpg` = **272**；含选型台自身 10 张则 = **282**。三种读法都不是 271 | ❌ |
| A03 | CN L15「F 型 15 / R 型 15」 | 数字 | `data.js` `fr` 字段 15/15（见 §2-A03） | ✅ |
| A04 | CN L15「30 个美学家族**互不重复**」 | 数字 | `data.js` `family` 30 个取值，去重后 30（trim+lower 后仍 30） | ✅ |
| A05 | CN L20「点行展开 **12 字段全文**」／EN L20「the full **twelve fields**」 | 数字/能力 | `app.js` L335–346 的展开区只渲染 **10 个** `field()` 组；`可落地要点` 没有任何渲染路径（`r.built` 只当"原型是否已建"的布尔用，L320–322）。S12/S15/S19 因 `layout` 为空退化为 9 组 | ❌ |
| A06 | CN L30「**14 个**确定性纹理生成器」／EN L30 同 | 数字 | `make-textures.py` 内生成器分支数（见 §2-A06） | 见 §2 |
| A07 | CN L35「**零外部依赖**：没有图片文件、没有 JS 库、没有 CDN」／EN L35 同 | 能力 | 三个模板 `index.html`+`style.css` 中 `https?://` 出现 **0** 次；`<script>` 0（M01/M02）／1（M03，内联）；无外部 `url()` | ✅ |
| A08 | CN L35「字体走**系统字体栈**，任何机器立刻正确显示」／EN L35 同 | 能力 | 三份 `style.css` `--font*` 全为 `system-ui`/`Georgia`/`"PingFang SC"` 等系统栈，无 `@font-face`、无 `woff2` 引用 | ✅ |
| A09 | CN L39/L40/L41「**12 个 CSS 变量**」×3／EN L39–41 同 | 数字 | 三个模板 `:root{}` 块内声明数 = **12 / 12 / 12**（`_crit10b/tpl.mjs`） | ✅ |
| A10 | CN L50「TOKENS.md —— **12 个变量**逐个说明」／EN L51 同 | 数字 | M01 12 ✓／M03 12 ✓／**M02 的 TOKENS.md 出现 13 个不同 `--x`**（多一个 `--ring`，`style.css` L298、L448 定义，不在 `:root` 内） | ⚠️ 部分 |
| A11 | CN L75「**仓库约 180 MB**」／EN L76「about 180 MB」 | 数字 | `git ls-files --format='%(objectsize)'` 合计 = **185,073,317 B = 176.5 MB**（受跟踪文件 2011 个） | ✅ |
| A12 | CN L93「根目录的 `index.html` 会**自动跳到选型台**」／EN L94 同 | 能力 | `index.html` 含 `<meta http-equiv="refresh" content="0; url=./prototypes/_selection/">` + `rel=canonical` | ✅ |
| A13 | CN L98（EN L99）`gh api -X POST repos/:owner/:repo/pages -f 'source[branch]=main' -f 'source[path]=/'` | 命令 | 语法与 `gh` 现行 REST 代理一致（`repos/:owner/:repo` 占位符、`-f` 即 `--raw-field` 对嵌套键 `source[branch]` 有效）；**本环境无外网/无 gh 认证，未实跑** | 见 §6 |
| A14 | CN L101「**Jekyll 会丢掉所有下划线开头的目录** …… 删掉它整站会 404」／EN L102 同 | 能力 | GitHub Pages 默认 Jekyll 行为属实；本站运行期确实依赖 `_selection/`、`_fonts/`（`app.js` 引 `../Sxx/.inspect/*.jpg`、页面引 `../_fonts/css/*.css`）→ 丢掉即选型台与字体全断 | ✅ |
| A15 | CN L101「必须保留根目录的 `.nojekyll`」／EN L102 同 | 路径 | `.nojekyll` 存在于仓库根、已受跟踪、内容为说明注释 | ✅ |
| A16 | CN L157「涉及约 **38 张**第三方照片」／EN L158「roughly 38 third-party photographs」 | 数字 | 五案 `CREDITS.md` 的「盘上存在但署名表里没有对应记录的位图」清单逐条相加 = **56 个文件 / 43 个唯一图**（S04 26 文件=13 图、S07 9、S08 6、S13 10、S17 5） | ❌ |
| A17 | CN L158「S14 有 **28 处**」／EN L159「28 occurrences in S14」 | 数字 | `prototypes/S14-zero-g-launch-sequence/assets/CREDITS.md` 中 `待页面引用` 出现 **28** 次；S15 为 7 次 | ✅ |
| A18 | CN L160「参数落盘（`build/texture-job.json`）**可逐字节复算**」／EN L161 同 | 路径 | `prototypes/*/build/` 被 `.gitignore` L7 排除；`texture-job.json` **未被跟踪**（`git ls-files \| grep texture-job` 为空）；磁盘上只有 **12/30** 案存在该文件（S18–S28、S30 缺 S25） | ❌ |
| A19 | CN L162「被引用的 287 张位图里约 183 张属这类」／EN L163「roughly 183 of the 287 referenced bitmaps」 | 数字 | 忠实转引 `deliverables/30-critique-assets-license.md` L421/L424 的 287 / 183；我独立复算口径不同（323 条引用路径 / 303 唯一路径 / 我的派生件启发式得 180） | 见 §6 |
| A20 | CN L164「大众模板**不含任何第三方素材**」／EN L165 同 | 能力 | 三个模板目录共 12 个文件（各 4 个），无位图、无字体文件、无外部 URL | ✅ |
| A21 | CN L170「`prototypes/_build/shot.mjs` **完全零依赖**」／EN L171 同 | 能力 | `shot.mjs` 的 import 全为 `node:` 内置模块 | 见 §2-A21 |
| A22 | CN L174「**四个旧原型仍有闸门 FAIL**：`S13`（`empty-screens`）… `S21`（只剩 `mono`）；`S07` 的等宽数字槽与 `S08` 的琥珀主色」／EN L175 同 | 数字 | 逐案 FAIL：S07 `mono`；S08 `palette-terracotta`**＋`font-count`**（4 个字族）；S13 **`mono`＋`shadow`＋`button-fx`＋`empty-screens`（4 条）**；S21 `mono`。合计 8 条 FAIL，README 只列出 4 条 | ❌ |
| A23 | CN L175「**18 / 30 = 60% 落在暖浅色带**（判据 色相 28–72° 且 明度 ≥78）」 | 数字 | 按同一判据在 `data.js` `bg` 上复算 = **18/30 = 60.0%**，案号 S01 S04 S06 S07 S10 S11 S13 S16 S17 S19 S20 S21 S22 S23 S25 S26 S27 S29 | ✅ |
| A24 | CN L175「12 个案子（40%）的底色**在 ΔE76≤5 内**连成单一连通块（链上最大单步 4.39）」／EN L176 同 | 数字 | **判据张冠李戴**：`deliverables/29` §1c L149–151、§6.1 L400–402 明确写该 12 案块出自**宽口径 `ΔH≤3° 且 ΔL≤3°`**；4.39 是那条链上 `S13–S27` 的 ΔE76 值。我按 `ΔE76≤5` 实算连通分量最大块 = **19 案**（63%），不是 12 | ❌ |
| A25 | CN L175「**83%** 的案子首屏没有导航链接、**97%** 圆角为 0」／EN L176 同 | 数字 | 1440 档 `report.json`：`metrics.nav.links == 0` **25/30 = 83%**；`buttons.radius + surfaces.boxRadius + surfaces.mediaRadius == 0` **29/30 = 97%** | ✅ |
| A26 | CN L176「17% / 60% / 73% 三个数……**分母还差 4 案**」 | 数字 | 与 `deliverables/29` §0.3 的四行口径表逐字一致（17% = 5/30；60% = 18/30；73%甲 = 19/26；73%乙 = 22/30） | ✅ |
| A27 | CN L176「近同对 **12 严 / 22 宽**……连续值直接比只有 **8 / 17**」 | 数字 | 与 `deliverables/29` §0.4 表 L55–56 一致（连续 8/435、17/435；取整 12/435、22/435） | ✅ |
| A28 | CN L177「**`tone` 七个词里**"很安静"只有 2 案、"就要扎眼"19 案（63%）」／EN L178 同 | 数字/归类 | `tone` 确有 7 个取值，但**"很安静"/"就要扎眼"根本不是 `tone` 取值**——它们属于 `axes.loud`（就要扎眼 19 / 有态度不吵 9 / 很安静 2）。`tone` 的 7 个词是「混乱活力／街头」等（`deliverables/29` §4.4 正确地把两者分列） | ❌ |
| A29 | CN L177「色相 36 个 10° 桶只用了 **11** 个，紫→品红连续 **110°** 全空，明度 **20–60** 整段 **0** 案」 | 数字 | 排除无彩的 S30（S=0）后 `floor(H/10)` 占用桶 = **11**；空段 250°–359° = **110°**；`bg` HSL 明度落在 20–60 的 = **0 案** | ✅ |
| A30 | CN L182「少数原型的 `index.html` 在 **30–45 KB**，超过内部施工规范的目标区间」／EN L183 同 | 数字 | 落在 30–45 KB 的是 **13 个**（S14 31.9 / S15 41.4 / S18 40.6 / S19 36.6 / S20 35.7 / S21 32.6 / S22 30.3 / S23 33.9 / S24 36.9 / S26 33.1 / S27 38.1 / S28 43.7），**且 S29 = 48.4 KB 已超出所给上界 45** | ❌ |
| A31 | CN L195「`_fonts/` 自托管字体（**46 个样式表** + woff2 分片）」／EN L196「46 stylesheets」 | 数字 | `prototypes/_fonts/css/*.css` 受跟踪文件 = **48**（`git ls-files 'prototypes/_fonts/css/*'` = 48）；`_fonts/` 受跟踪文件共 925 个 | ❌ |
| A32 | CN L197「`_build/` # 全部工具脚本 + **`_CONTRACT.md`**（施工规范）」／EN L198 同 | 路径 | `prototypes/_build/_CONTRACT.md` **不存在**；实际路径是 `prototypes/_CONTRACT.md`（19,540 B）。同文件 L174 自己引的正是 `prototypes/_CONTRACT.md` §9.15 | ❌ |
| A33 | CN L202「跨越若干轮审查后有**二十多处**背景色、主色和字体被替换过」／EN L203「more than twenty」 | 数字 | 见 §2-A33 | 见 §2 |
| A34 | CN L27/L134 `node prototypes/_build/verify-prototype.mjs --all` 等 3 条工具命令 | 命令 | 见 §4 | 见 §4 |
| A35 | CN L137 `shot.mjs … --out .shots` | 命令/路径 | 命令可跑（§4）；但 `.shots` **不在 `.gitignore` 里**（文件有 `.shot-test/`，无 `.shots`），照抄 README 会在工作区留下未忽略目录 | ⚠️ |

---

## 2 逐条展开

### 【A02｜中｜数字】「271 张渲染截图」在任何口径下都不是 271，是 272

- **断言原文**：CN L14「**26 个闸门 FAIL=0**，271 张渲染截图」；EN L14「26 pass the gate with FAIL=0, producing 271 rendered screenshots」
- **实测证据**：
  ```
  D:\Nodejs\node.exe _crit10b\bench2.mjs
  data.js shots total: 272  folds: 90  pages: 182
  Get-ChildItem prototypes/S*/.inspect -File -Filter *.jpg   → 272
  30 份 report.json 的 images[]（fold + pages）累计        → 272
  含 prototypes/_selection/.inspect（10 张）             → 282
  ```
- **为什么这不是"意图 vs 状态"的问题**：这句话是**全称计数断言**——它把"271"当作"仓库现有渲染截图的张数"报给读者，且紧跟在"26 个闸门 FAIL=0"（我已复算为真的实测数）后面。数字 272 不是"目标"，而是当前文件系统与 `data.js` 三个互相独立的来源一致给出的同一结果；`deliverables/24-critique-attack-hunter.md` AH-20 记录的"271 vs 281"差值现在两头都变了（`data.js` 272、磁盘 282），说明这个数在被引用后又被渲染改动过而 README 未跟。
- **可直接替换的文字**（CN L14）：把「271 张渲染截图」改为「**272 张渲染截图（选型台另带自身 10 张，磁盘共 282 张）**」；EN L14 对应改为「producing 272 rendered screenshots (282 on disk including the bench's own 10)」。

### 【A05｜中｜数字/能力】「展开 12 字段全文」——展开区只渲染 10 组

- **断言原文**：CN L20「点行展开 **12 字段全文**与整页可翻页大图」；EN L20「click a row to expand the full **twelve fields** and a paged full-page view」
- **实测证据**：`prototypes/_selection/app.js` L335–346 只拼 10 个 `field()`：一句话视觉定义／美学家族与参考／当前有效配色／字体策略／布局与网格／关键视觉元素／动效与交互／反 AI 味风险与规避／适用场景／设计师签名式怪癖；`field()`（L19）对空值返回 `''`，而 `data.js` 中 `layout` 为空的是 **S12/S15/S19** → 这三案只渲染 9 组。`可落地要点` 一栏没有渲染路径（L320–322 的 `r.built` 只用来决定"打开原型"链接是否可点）。
- **为什么这不是"意图 vs 状态"的问题**：断言的主语是**选型台的展开行为**（"点行展开…"），是可点开验证的运行时事实，不是对数据的描述。仓库里的 12 字段**数据**确实存在（`_specs/Sxx.md`），但这句话说的是"展开即见全文"，而展开只给 10 组、且缺 `可落地要点`。**同一句在选型台自身文案里刚被改成"全部字段"**（`prototypes/_selection/index.html` L83），README 未同步。
- **可直接替换的文字**（CN L20）：把「点行展开 12 字段全文与整页可翻页大图」改为「**点行展开 10 段字段全文（S12／S15／S19 为 9 段，因规格里没有独立的「布局与网格」段）与整页可翻页大图**」；EN L20 对应改为「click a row to expand the field text in 10 sections (9 for S12/S15/S19) and a paged full-page view」。

### 【A16｜中｜数字】「约 38 张第三方照片」与五份 CREDITS.md 的清单不符（实为 56 文件 / 43 图）

- **断言原文**：CN L157「涉及约 **38 张**第三方照片」；EN L158「covering roughly **38** third-party photographs」
- **实测证据**：五份 `CREDITS.md` 的「### 盘上存在但署名表里没有对应记录的位图」逐条计数 = S04 **26**、S07 **9**、S08 **6**、S13 **10**、S17 **5** = **56 个文件**；S04 的 26 条是 13 组 `png`+`webp` 同图双编码，按唯一图算 = 13 → 五案合计 **43 张唯一图**。`deliverables/30-critique-assets-license.md` 对同一批另有独立表（§3 的 S08/S17 两行给出 6 个 PNG + 5 张 `heritage-*.jpg`），与 38 也对不上。
- **为什么这不是"意图 vs 状态"的问题**：这是**计数断言**，且"约"只能覆盖 ±1～2 的量级误差，覆盖不了 38 → 43（+13%）或 38 → 56（+47%）的落差。它同时被用作**限制读者复用范围的硬约束**（"这五案的照片不得对外复用"），数字偏小会直接低估受影响素材面。
- **可直接替换的文字**（CN L157）：把「涉及约 **38 张**第三方照片」改为「五案 `CREDITS.md` 自列的「无署名记录位图」共 **56 个文件 / 43 张唯一图**（S04 13、S07 9、S08 6、S13 10、S17 5，S04 的 png/webp 为同图双编码）」；EN L158 同步。

### 【A18｜高｜路径/gitignore】「`build/texture-job.json` 可逐字节复算」——该文件不在仓库里

- **断言原文**：CN L160「参数落盘（**`build/texture-job.json`**）可**逐字节复算**」；EN L161「their parameters are written to disk (`build/texture-job.json`), and they are byte-reproducible」；`LICENSE` L38 与 L41 同样以该文件为许可划界依据。
- **实测证据**：
  ```
  .gitignore L7:  prototypes/*/build/
  git ls-files | Select-String texture-job        → （空，未受跟踪）
  Get-ChildItem prototypes/*/build/texture-job.json  → 12 个（S18,S19,S20,S21,S22,S23,S24,S26,S27,S28,S29,S30）
  Get-ChildItem prototypes/*/build -Directory        → 24 个 build/ 目录
  git status --ignored                               → !! prototypes/S01…/build/ …
  ```
- **为什么这不是"意图 vs 状态"的问题**：`LICENSE` 把"由 `make-textures.py` 生成、参数记在 `build/texture-job.json`"当作**可核验的许可依据**（"无第三方权利"由此成立）。克隆仓库的人拿不到这个文件 → 依据不可核。这是**交付物与许可声明之间的断链**，不是"将来会补"。同类已知一例（`deliverables/tool-runs/`）已被规格漂移审查员记为机制性问题；本条是**同一机制在 README/LICENSE 上的第二例**，且它被 11 份 `assets/CREDITS.md` 与 `S18/index.html` L368 一并引用。
- **可直接替换的文字**（CN L160）：把「参数落盘（`build/texture-job.json`）可逐字节复算」改为「生成参数记在 `prototypes/Sxx-*/build/texture-job.json`（**属构建中间物，被 `.gitignore` L7 排除，不在发行副本内**）；本仓库现只有 12/30 案留有该文件（S18–S24、S26–S30），因此"逐字节复算"**只在本地工作区成立**」。`LICENSE` L38 与 L41 需同步加这句限定；EN L161 同步。

### 【A22｜高｜数字】四处闸门 FAIL 只报了两处，S13 实际 4 条、S08 实际 2 条

- **断言原文**：CN L174「**四个旧原型仍有闸门 FAIL**：`S13`（`empty-screens`，内容偏薄）与 `S21`（只剩 `mono`）……`S07` 的等宽数字槽与 `S08` 的琥珀主色是**已知豁免**」
- **实测证据**（逐份 `report.json` 的 `findings[].level`）：
  ```
  S07  FAIL: mono
  S08  FAIL: palette-terracotta, font-count("4 typefaces in use (Source Serif 4, Noto Serif SC, Overprint Numerals, Gloock)")
  S13  FAIL: mono, shadow("17 box-shadow(s) on elements at rest"), button-fx("Buttons with shadow/glow"), empty-screens("3 of 6 desktop screens are almost empty ground")
  S21  FAIL: mono
  ```
  合计 **8 条 FAIL / 4 案**（`_crit10b/gates.mjs`）。`data.js` 的 `gate.failIds` 与之一致（S13 = `["mono","shadow","button-fx","empty-screens"]`）。
- **为什么这不是"意图 vs 状态"的问题**：括号里的枚举是**对已渲染报告的事实描述**（读者会据此判断"这案只剩一个小毛病"）。S13 被写成只剩 `empty-screens`，实际它还有 `shadow`（17 处 box-shadow，**与 30 案层"`box-shadow` 0"这条明令相冲突**）和 `button-fx` —— 这两条既不是"内容偏薄"，也不在 `_CONTRACT.md` §9.15 的豁免清单里。这直接影响"哪些 FAIL 是被批准豁免的"这一结论。
- **可直接替换的文字**（CN L174）：改为
  > **四个旧原型仍有闸门 FAIL（共 8 条）**：`S13`（`mono`、`shadow`(17 处)、`button-fx`、`empty-screens`）、`S21`（`mono`）、`S07`（`mono`）、`S08`（`palette-terracotta`、`font-count`）。其中 `S07` 的等宽数字槽与 `S08` 的琥珀主色、`S13` 的 `empty-screens` 是**已知豁免**（理由见 `prototypes/_CONTRACT.md` §9.15）；**`S13` 的 `shadow` / `button-fx` 两条未有豁免记录**。

  EN L175 同步。

### 【A24｜高｜数字（判据）】「12 案 / ΔE76≤5」判据张冠李戴

- **断言原文**：CN L175「**12 个案子（40%）的底色在 ΔE76≤5 内连成单一连通块**（链上最大单步 4.39）」；EN L176「12 schemes (40%) form a single connected block within ΔE76 ≤ 5 (largest single step on the chain: 4.39)」
- **实测证据**：
  - 被引来源 `deliverables/29-critique-homogeneity.md` **§1c L149–151**：「宽口径（**ΔH≤3 & ΔL≤3**，连续与取整结果完全一致）：**块 1（12 案）**：S01 S04 S06 S13 S16 S17 S19 S21 S22 S25 S27 S29 …… 链上最大单步只有 `S13–S27` **ΔE76 = 4.39**」；**§6.1 L400–402** 复述同一口径。
  - 我按 README 写的 **ΔE76≤5** 在同样 30 个 `bg` 上实算（`_crit10b/homo.mjs`）：
    ```
    dE76<=5 connected components: 19,7,2,1,1  => largest 19 (63%)
    largest component members: S01,S04,S06,S07,S10,S11,S15,S16,S17,S19,S20,S21,S22,S23,S24,S25,S26,S29,S30
    ```
    → 得到的是 **19 案**，案号集合也不同（多出 S07 S10 S11 S15 S20 S23 S24 S26 S30）。
- **为什么这不是"意图 vs 状态"的问题**：这句话自带判据（"在 ΔE76≤5 内"），而判据是可复算的机械条件。**判据本身给出 19 案，被引文件给出的是另一个判据（ΔH≤3 & ΔL≤3）下的 12 案。** 数字与判据互相矛盾，无论"文档想表达什么"都不成立。更尖锐的是：README 自己的下一行（L176）就是那句警告——「**报同质数字必须附判据**」——而同段落的数字附了一个错的判据。
- **可直接替换的文字**（CN L175）：把
  > **12 个案子（40%）的底色在 ΔE76≤5 内连成单一连通块**（链上最大单步 4.39）

  改为
  > **12 个案子（40%）的底色在「ΔH≤3° 且 ΔL≤3°」下连成单一连通块**（该链上最大单步 **ΔE76 = 4.39**，出自 `S13–S27`）；**若改用 ΔE76≤5 作判据，同一批数据会塌成一个 19 案的大块（63%）** —— 判据必须跟着数字走。

  EN L176 同步。

### 【A28｜中｜数字/归类】「`tone` 七个词里"很安静"只有 2 案」——这两个词不属于 `tone`

- **断言原文**：CN L177「`tone` 七个词里**"很安静"只有 2 案**、"就要扎眼"19 案（63%）」；EN L178「of the seven `tone` words, **only 2 schemes are "very quiet"** while 19 (63%) are "loud"」
- **实测证据**：`data.js` 的 `tone` 取值只有 7 个，分别是「混乱活力／街头」5、「机能冷峻／工业」5、「学术档案／严肃出版」5、「冷静克制／工程感」4、「温暖手作／人味」4、「荒诞幽默／玩心」4、「奢华暗黑／高定」3 —— **没有"很安静"，也没有"就要扎眼"**。它们出现在另一个字段：`axes.loud` = 「就要扎眼」19 /「有态度不吵」9 /「很安静」2。`deliverables/29` §4.4 把两者分列（tone 表 + 「安静度（`axes.loud`）」句），口径是对的。
- **为什么这不是"意图 vs 状态"的问题**：这是**字段归属断言**（"`tone` 七个词里……"）。读者会去 `tone` 里找这两个词，找不到；而 `axes.loud` 只有 3 个词，不是 7 个。数字（2 / 19 / 63%）本身正确，错的是它们挂在哪个字段上。
- **可直接替换的文字**（CN L177）：把「`tone` 七个词里**"很安静"只有 2 案**、"就要扎眼"19 案（63%）」改为「**安静度（`axes.loud`）三档里"很安静"只有 2 案、"就要扎眼"19 案（63%）**（另外 `tone` 的 7 个词里没有"干净／中性／专业"这一类）」；EN L178 同步。

### 【A30｜中｜数字】「在 30–45 KB」这句话的区间容不下最大值

- **断言原文**：CN L182「少数原型的 `index.html` 在 **30–45 KB**，超过内部施工规范的目标区间」；EN L183「A few prototypes have an `index.html` of **30–45 KB**」
- **实测证据**（`statSync(index.html).size/1024`，30 案全量）：
  ```
  min 18.0 KB (S07)  max 48.4 KB (S29)
  30–45 KB 区间内 13 个: S14 31.9 S15 41.4 S18 40.6 S19 36.6 S20 35.7 S21 32.6 S22 30.3 S23 33.9 S24 36.9 S26 33.1 S27 38.1 S28 43.7
  超出 45 KB: S29 = 48.4
  低于 30 KB: 17 个（S01–S13、S16、S17、S25、S30）
  ```
- **为什么这不是"意图 vs 状态"的问题**：区间是一个可测的事实描述。这句话既低估了件数（"少数" vs 13/30 = 43%），又漏掉了唯一真正越过 45 KB 的 S29——而 S29 恰恰是"这批字太大"这条已知缺口里最该点名的案子。
- **可直接替换的文字**（CN L182）：改为「**13 个原型（43%）的 `index.html` 在 30–43.7 KB，S29 已达 48.4 KB**（S07 最小 18.0 KB），超过内部施工规范的目标区间（`_CONTRACT.md` L27–L28）。中文正文本身占字节就大（四千多汉字约 14 KB），压下去只能删内容」；EN L183 同步。

### 【A31｜中｜数字】「46 个样式表」——现有 48 个

- **断言原文**：CN L195「`_fonts/` 自托管字体（**46 个样式表** + woff2 分片）」；EN L196「self-hosted fonts (**46 stylesheets** + woff2 slices)」
- **实测证据**：
  ```
  git ls-files 'prototypes/_fonts/css/*' | Measure-Object -Line   → 48
  (Get-ChildItem prototypes/_fonts/css -File).Count              → 48
  名单: alfa-slab-one__400.css … zhuque-fangsong__400.css（含 literata 三个重量档、ibm-plex-mono 两档、martian-mono 三档等）
  ```
- **为什么这不是"意图 vs 状态"的问题**：这是目录内文件计数，`git ls-files` 与磁盘两个来源都给 48。目录结构段落里的数字被读者当作"仓库现状说明书"使用（同段落还有"30 个原型""3 个模板"——那些都是真的）。
- **可直接替换的文字**（CN L195）：把「（46 个样式表 + woff2 分片）」改为「（**48 个样式表 + woff2 分片**）」；EN L196「46 stylesheets」→「48 stylesheets」。

### 【A32｜中｜路径】`_CONTRACT.md` 不在 `_build/` 里

- **断言原文**：CN L197「│   ├── `_build/`                 # 全部工具脚本 + **`_CONTRACT.md`**（施工规范）」；EN L198 同
- **实测证据**：
  ```
  Test-Path prototypes/_build/_CONTRACT.md   → False
  Get-ChildItem -Recurse -Filter _CONTRACT.md → prototypes\_CONTRACT.md  (19,540 B)
  git ls-files | Select-String CONTRACT       → prototypes/_CONTRACT.md
  ```
  同一份 README 的 L174 引的正是 `prototypes/_CONTRACT.md` §9.15 —— **同文件内自相矛盾**。
- **为什么这不是"意图 vs 状态"的问题**：目录结构块是给读者找文件用的路径说明。按它找会扑空；`prototypes/` 下多一层还是少一层是可验证的静态事实。`deliverables/32-critique-spec-consistency.md` 也在引用 `prototypes/_CONTRACT.md`，说明正确路径在文档链内是既成共识。
- **可直接替换的文字**：把目录块里的
  ```
  │   ├── _build/                 # 全部工具脚本 + _CONTRACT.md（施工规范）
  ```
  改为
  ```
  │   ├── _CONTRACT.md            # 施工规范（工具脚本在 _build/ 下）
  │   ├── _build/                 # 全部工具脚本
  ```
  EN L198 同步。

### 【A10｜低｜数字】M02 的 TOKENS.md 是一个 13 个变量的文档

- **断言原文**：CN L50（EN L51）「`TOKENS.md` —— **12 个变量**逐个说明（作用／默认值／改成什么会怎样）」
- **实测证据**：`templates/M02-warm-local/style.css` 的 `:root{}` 内有 12 个（合规）；但 `templates/M02-warm-local/TOKENS.md` 里以反引号出现的**不同** `--x` 共 **13** 个（多出 `--ring`，它在 `style.css` L298、L448 以局部覆盖形式出现）。M01 / M03 的 TOKENS.md 均为 12。三个模板 `:root{}` 声明数都是 12。
- **为什么这不是"意图 vs 状态"的问题**：这是一份交付文件的**条目计数**。"12 个变量逐个说明"读作"M02 的 TOKENS.md 也说明 12 个"；实际它多讲了一个 `--ring`。要么 M02 的 `style.css` 把 `--ring` 提到 `:root{}`（变成 13，那 README 三处"12 个 CSS 变量"都要改），要么 TOKENS.md 把 `--ring` 降级为附注。二选一，现状两头不一致。
- **可直接替换的文字**：把 CN L50/EN L51 的「12 个变量逐个说明」改为「**模板主变量逐个说明（M01／M03 共 12 个；M02 另附一个仅局部覆盖的 `--ring`）**」。

### 【A06｜待核｜数字】「14 个确定性纹理生成器」

- **断言原文**：CN L30（EN L30）「**14 个**确定性纹理生成器（参数落盘可逐字节复算）」
- 见 §4 实测；见 §6 关于"参数不在仓库内"的限定（与 A18 同因）。

### 【A21｜低｜能力】「`shot.mjs` 完全零依赖」

- **断言原文**：CN L170（EN L171）「`prototypes/_build/shot.mjs` **完全零依赖**」
- 见 §4 实测（import 面核查）。

### 【A33｜待核｜数字】「二十多处背景色、主色和字体被替换过」

- **断言原文**：CN L202（EN L203）「跨越若干轮审查后有**二十多处**背景色、主色和字体被替换过」
- 见 §4 实测（对 `_specs/Sxx.md` 与 `_specs/_CURRENT-VALUES.md` 做机械对账）。

---

## 3 中英双份对照

（见后文追加）

## 4 命令可执行性实测

（见后文追加）

## 5 我判为准确、不用改的项

（见后文追加）

## 6 我无法验证的项

（见后文追加）

## 7 限制

- 本文件只写 `deliverables/34-critique-doc-accuracy.md` 与临时目录 `_crit10b/`；**未改任何原型、模板、脚本、README、既有 deliverables**（`git status` 里唯一由我新增的未跟踪文件是本文件，被 `.gitignore` 的 `_crit*/` 覆盖的是 `_crit10b/`）。
- 所有工具运行产物一律落在 `_crit10b/`；`shot.mjs` 一类的取证命令把 `--out` 指向 `_crit10b/` 而不是 README 写的 `.shots`（见 §4 的逐条说明）。
- 本环境**直连外网几乎不通**，一切"线上站点可访问／可下载"类断言进 §6，不凭猜报缺陷。
- 390 档按任务要求走 `render-scheme.mjs` / `shot.mjs`，未使用 `chrome --window-size=390,844`。
