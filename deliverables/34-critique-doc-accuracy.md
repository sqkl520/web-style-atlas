# 34 · 文档准确性审查

**审查员立场**：只核**可验证的事实断言**——四类：**数字 / 路径 / 命令 / 能力声明**。不评文笔、不评结构。
**对抗对象**：文档意图辩护员。每个不一致条目都自带「为什么这不是"意图 vs 状态"的问题」。
**写范围**：只写本文件与 `_crit10b/`。**未改任何原型、模板、脚本、README 或既有 deliverables。**

---

## 0 · 审查基准（快照，必须与本文行号配套读）

被审文件在本轮审查期间**被并发修改了两次**（`README.md` 由 17,496 B / 202 行 → 18,702 B / 205 行；`README-EN.md` 由 20,188 B → 21,317 B / 205 行）。因此本文所有行号绑定下面这个快照：

| 文件 | 字节 | 行数 | sha256（前 16） | mtime |
| --- | --- | --- | --- | --- |
| `README.md` | 18,702 | 205 | `C7F59E06330BD2ED` | 2026-10-22 04:02:27 |
| `README-EN.md` | 21,317 | 205 | `F5DB862E1FA81243` | 2026-10-22 04:00:39 |
| `LICENSE` | 3,906 | 69 | `0B686C062C3DDD57` | 2026-10-22 02:48:42 |
| `.gitignore` | 1,713 | 59 | `9A4199B0744696E7` | —— |

快照副本：`_crit10b/snap/{README.md,README-EN.md,LICENSE,.gitignore}`。

> ⚠️ **本次审查期间被并发修复的 8 条**（我已逐条复核通过，不再作为缺陷计入，但列出来供你判断是否要回看）：
> ①「271 张渲染截图」→ **272**（CN L14 / EN L14）；② 闸门 FAIL 清单 → **8 条全列**（CN L176 / EN L177）；③ 同质判据 → **宽口径 ΔH≤3° 且 ΔL≤3°**，并补了「ΔE76≤5 则是 19 案（63%）」（CN L177 / EN L178）；④「`tone` 七个词里很安静」→ 改为 **`axes.loud`**（CN L179 / EN L180）；⑤ 新增 `build/texture-job.json` 未入库的警示块（CN L162 / EN L163）；⑥「46 个样式表」→ **48**（CN L197 / EN L198）；⑦「30–45 KB」→ **30–48.4 KB（S29 = 49,512 B）**（CN L184 / EN L185）；⑧ CN 目录树把 `_CONTRACT.md` 移出 `_build/`（CN L199–L200）。
> 下述 §1/§2 的**全部结论都按快照重新复算过**，不是沿用第一遍的数字。

**未跟踪的并发改动提示**：`prototypes/_build/check-stale.mjs` 在本轮中途出现（现已受跟踪），`prototypes/S14-…/.inspect/report.json` 的 `at` 从 `2026-10-17T20:01:39Z` 变为 `2026-10-21T19:48:43Z`（不是本人所为——本人未跑任何渲染脚本，理由见 §4-C1）。

---

## 1 断言核对总表

**状态**：✅ 一致｜❌ 不一致（本轮报出）｜⚠️ 部分/精度不足｜🔒 无法验证（见 §6）。

### 1a 数字类

| # | 断言原文（出处） | 实测 | 状态 |
| --- | --- | --- | --- |
| N01 | CN L14 / EN L14「26 个闸门 FAIL=0」 | `verify-prototype.mjs --all` 自报「达标 26 / 不达标 4 / 共 30」；逐份 `report.json` 复算 PASS 26 / FAIL 4 | ✅ |
| N02 | CN L14 / EN L14「272 张渲染截图」 | `data.js` `shots` 合计 **272**（90 fold + 182 page）；30 份 `report.json` `images[]` 合计 **272**；`prototypes/S*/.inspect/` jpg+png **272**；含选型台自身 10 张 = **282** | ✅（本轮已修） |
| N03 | CN L15「F 型 15 / R 型 15」 | `data.js` `fr` = `{F:15, R:15}` | ✅ |
| N04 | CN L15「30 个美学家族**互不重复**」 | `data.js` `family` 30 个取值，去重 30 | ✅ |
| N05 | CN L20 / EN L20「点行展开 **12 字段全文**／the full **twelve fields**」 | `app.js` L335–346 只渲染 **10 个** `field()` 组；`可落地要点` 无渲染路径（`r.built` 只当布尔用，L320–322）；`layout` 为空的 S12/S15/S19 退化为 9 组 | ❌ |
| N06 | CN L30 / EN L30「**14 个**确定性纹理生成器」 | `make-textures.py` 里 `gen_*` 定义恰为 **14** 个（`gen_grain gen_scanlines gen_grid gen_halftone gen_streak gen_blotch gen_fiber gen_flake gen_crease gen_band gen_misreg gen_rule gen_groove gen_vignette`） | ✅ |
| N07 | CN L39/L40/L41 / EN L39–41「**12 个 CSS 变量**」×3 | 三个模板 `:root{}` 内声明数 = **12 / 12 / 12** | ✅ |
| N08 | CN L50 / EN L51「`TOKENS.md` —— **12 个变量**逐个说明」 | M01 = 12 ✓、M03 = 12 ✓、**M02 = 13**（多 `--ring`，`style.css` L298 / L448 局部覆盖） | ❌ |
| N09 | CN L75 / EN L76「**仓库约 180 MB**」 | `git ls-files --format='%(objectsize)'` 合计 **185,253,754 B = 176.7 MB**（受跟踪 2,015 个文件） | ✅ |
| N10 | CN L157 / EN L158「涉及约 **38 张**第三方照片」 | 五案 `CREDITS.md` 清单逐条相加 = **56 个文件 / 43 张唯一图**（S04 26 文件=13 图 + S07 9 + S08 6 + S13 10 + S17 5） | ❌ |
| N11 | CN L158 / EN L159「S14 有 **28 处**」 | `S14/assets/CREDITS.md` 中 `待页面引用` 出现 **28** 次（S15 = 7 次） | ✅ |
| N12 | CN L157「全库有 **11 行**把许可写成"见来源页"而来源页为空」 | 30 份 `CREDITS.md` 逐行匹配 `见来源页` / `see source page` = **11** 行 | ✅ |
| N13 | CN L164 / EN L163「被引用的 **287** 张位图里约 **183** 张属这类」 | 忠实转引 `deliverables/30` L421/L424；我的独立口径给出 323 条引用路径 / 303 唯一路径 / 派生件启发式 180 —— 口径不同，未能逐条复现 | 🔒 |
| N14 | CN L176 / EN L177「四个旧原型仍有闸门 FAIL，**合计 8 条**」 | 逐案 FAIL：S07 `mono`(1)、S08 `palette-terracotta`+`font-count`(2)、S13 `mono`+`shadow`+`button-fx`+`empty-screens`(4)、S21 `mono`(1) —— **逐条一致** | ✅（本轮已修） |
| N15 | CN L177「**18 / 30 = 60%** 落在暖浅色带（判据 色相 28–72° 且 明度 ≥78）」 | 同判据复算 = **18 / 30 = 60.0%** | ✅ |
| N16 | CN L177 / EN L178「**12 个案子（40%）**……宽口径 ΔH≤3° 且 ΔL≤3°」 | 同判据连通分量最大块 = **12 案**，成员 S01 S04 S06 S13 S16 S17 S19 S21 S22 S25 S27 S29 —— 与被引的 `deliverables/29` §1c 列表逐号一致 | ✅（本轮已修） |
| N17 | CN L177 / EN L178「换成 ΔE76≤5 口径，最大连通分量是 **19 案（63%）**」 | 实测 `ΔE76≤5` 分量 = 19,7,2,1,1 → 最大 **19 案（63.3%）**，成员 S01 S04 S06 S07 S10 S11 S15 S16 S17 S19 S20 S21 S22 S23 S24 S25 S26 S29 S30 | ✅（本轮已修） |
| N18 | CN L177 / EN L178「（链上最大单步 ΔE76 = 4.39）」 | ΔE76(S13,S27) = **4.39** 精确命中；但 **12 案块的最小生成树最大单步 = 5.47（S29–S22）**，块内最大两两距离 = **17.27（S13–S22）**。"链上最大单步"未定义链，读作上界则不成立 | ⚠️ |
| N19 | CN L177「**83%** 首屏没有导航链接、**97%** 圆角为 0」 | 1440 档：`nav.links==0` = **25/30 = 83%**；`buttons.radius + boxRadius + mediaRadius == 0` = **29/30 = 97%** | ✅ |
| N20 | CN L178「17% / 60% / 73%……分母还差 4 案」 | 与 `deliverables/29` §0.3 口径表四行逐字一致（5/30、18/30、19/26、22/30） | ✅ |
| N21 | CN L178「近同对 **12 严 / 22 宽**……连续值直接比只有 **8 / 17**」 | 与 `deliverables/29` §0.4 表一致（连续 8/435、17/435；取整 12/435、22/435） | ✅ |
| N22 | CN L179 / EN L180「`axes.loud` 里"很安静"只有 2 案、"就要扎眼"19 案（63%）」 | `axes.loud` = `{就要扎眼:19, 有态度不吵:9, 很安静:2}`；`tone` 7 词最大 5 案 —— 与改后文案逐字一致 | ✅（本轮已修） |
| N23 | CN L179「色相 36 个 10° 桶只用了 **11** 个、紫→品红连续 **110°** 全空、明度 **20–60** 整段 **0** 案」 | 排除无彩 S30 后占用桶 = **11**（2,3,4,6,10,12,15,19,20,22,24）；空段 250°–359° = **110°**；`bg` 明度 ∈[20,60] = **0 案** | ✅ |
| N24 | CN L184 / EN L185「`index.html` 在 **30–48.4 KB**（最大的 S29 是 **49,512 B**）」 | S29 = **49,512 B** 精确命中；≥30 KB 的共 **13** 个（S29 48.4 / S28 43.7 / S15 41.4 / S18 40.6 / S27 38.1 / S24 36.9 / S19 36.6 / S20 35.7 / S23 33.9 / S26 33.1 / S21 32.6 / S14 31.9 / S22 30.3）；最小 S07 = 18.0 KB | ✅（本轮已修） |
| N25 | CN L184「**少数**原型……」 | 13/30 = **43%**，不是"少数" | ⚠️ |
| N26 | CN L197 / EN L198「`_fonts/`（**48 个样式表** + woff2 分片）」 | `git ls-files 'prototypes/_fonts/css/*'` = **48** 份 `.css` | ✅（本轮已修） |
| N27 | CN L205 / EN L205「跨越若干轮审查后有**二十多处**背景色、主色和字体被替换过」 | `_specs/_CURRENT-VALUES.md` §1 的 36 行表里，**23 行**在括号内写了被取代的旧 HEX（全文件括号内 HEX 共 29 个） | ✅ |

### 1b 路径类

| # | 断言（出处） | 实测 | 状态 |
| --- | --- | --- | --- |
| P01 | CN L199–L200「`_build/` 全部工具脚本 / `_CONTRACT.md` 在 `prototypes/` 根，不在 `_build/` 下」 | `prototypes/_CONTRACT.md`（19,540 B，受跟踪）✓；`prototypes/_build/_CONTRACT.md` 不存在 ✓ | ✅（CN 已修） |
| P02 | **EN L200**「`_build/` # all tool scripts **+ `_CONTRACT.md`** (the construction specification)」 | 同上：`_build/` 下没有 `_CONTRACT.md`。**EN 侧未随 CN 一起改** | ❌ |
| P03 | CN L137 / EN L138 `--out .shots` | 命令可跑（§4-C3）；但 `.gitignore` 只有 `.shot-test/`（L45），**没有 `.shots`**；`prototypes/_build/SHOT-README.md` L8/L215 自己的示例用的是 `--out .shot-test` | ❌ |
| P04 | CN L131「`node prototypes/_build/render-scheme.mjs S14-…`」 | 脚本存在，但它依赖 `tools/taste-skill/skills/taste-skill/scripts/inspect.mjs`——`git ls-files tools` = **0**（`.gitignore` L2 整目录排除） | ❌ |
| P05 | 其余被点名的路径逐个 `Test-Path` | `index.html` `.nojekyll` `LICENSE` `prototypes/_selection/{index.html,wizard.html,app.js,data.js}` `prototypes/_build/{render-scheme,verify-prototype,shot,shot-page,fetch-fonts,selfhost-fonts,assign-assets,make-textures,collect-schemes,summarize-all,SHOT-README}` `prototypes/_specs/_CURRENT-VALUES.md` `templates/M0{1,2,3}/{index.html,style.css,README.md,TOKENS.md}` 全部 **存在** | ✅ |

### 1c 命令类

| # | 命令（出处） | 实跑？ | 结果 | 状态 |
| --- | --- | --- | --- | --- |
| C01 | CN L131 / EN L132 `node prototypes/_build/render-scheme.mjs S14-…` | **未跑** | 该脚本把 `prototypes/<案>/.inspect/` 当输出目录，而那是**受跟踪的既有产物**，跑它会改写原型目录，越过本轮写范围。改为核前置条件：脚本 `ROOT = 'D:/Web/style'` 硬编码（L16），依赖 `tools/…/inspect.mjs` 未入库 | ❌ |
| C02 | CN L134 / EN L135 `node prototypes/_build/verify-prototype.mjs --all` | **跑了** | exit 1；stdout 45 行；末行「达标 26 / 不达标 4 / 共 30」。脚本只 import `node:fs`/`node:path`，纯只读 ✓。但 `ROOT = 'D:/Web/style'` 硬编码（L12）→ 换机器/换目录即失效 | ⚠️ |
| C03 | CN L137 / EN L138 `node …/shot.mjs prototypes/S14-…/ --out … --widths 1440,768,390 --name S14` | **跑了**（仅把 `--out` 指向 `_crit10b/shots` 以免污染仓库） | exit 0；3 档全部成功：1440 `mode=direct window=1456x995`、768 `window=784x995`、390 **`mode=iframe window=516x995`**；产出 fold/full/逐屏切片 34 张 PNG + report.json；仅 6 次 `/favicon.ico` 404 | ✅ |
| C04 | CN L62 `python -m http.server 8080` + 「然后打开」的 4 个 URL | **跑了**（换 18080 端口） | 15 个 URL 全部 **200**：`/` `/index.html` `/prototypes/_selection/` `…/wizard.html` `…/data.js` `…/app.js` `/templates/M0{1,2,3}/` `/prototypes/S14-…/` `/_fonts/css/noto-serif-sc__400-700.css` `/S14/assets/plate-01-….jpg` `/.nojekyll` `/README.md` `/LICENSE`；`/prototypes/nope/` 正确 404 | ✅ |
| C05 | CN L61 `npx serve .` | **未跑** | 本环境外网不通，`npx` 无法拉包 | 🔒 |
| C06 | CN L63 `php -S localhost:8080` | **未跑** | 本机无 php | 🔒 |
| C07 | CN L98 / EN L99 `gh api -X POST repos/:owner/:repo/pages -f 'source[branch]=main' -f 'source[path]=/'` | **未跑** | 无 `gh` 认证与外网。语法核对：`-f` 即 `--raw-field`，对 `source[branch]` 这类嵌套键有效，`repos/:owner/:repo` 是 `gh` 的占位符约定 —— 形式上正确 | 🔒 |
| C08 | CN L170 / EN L171「`shot.mjs` 完全零依赖」 | **跑了间接验证** | `shot.mjs` 的 import 全为 `node:http / node:child_process / node:fs / node:path / node:os / node:url`，无第三方包；实跑无 `node_modules` 也能成功 | ✅ |

**命令实测通过率**：可实跑且允许实跑的 **3/3 通过**（C02、C03、C04）；**1 条因写范围主动不跑**（C01）；**3 条无环境**（C05–C07）。

### 1d 能力声明类

| # | 断言（出处） | 实测 | 状态 |
| --- | --- | --- | --- |
| Q01 | CN L35 / EN L35「三个模板**零外部依赖**：没有图片文件、没有 JS 库、没有 CDN、没有构建步骤」 | 三模板 `index.html`+`style.css` 中 `https?://` = **0**；外部 `url()` = **0**；`<script>` = 0/0/1（M03 为**内联**脚本，非库）；`@font-face` = 0 | ✅ |
| Q02 | CN L35 / EN L35「字体走**系统字体栈**……不跳字」 | 三份 `style.css` 字体变量全为 `system-ui`/`Georgia`/`"PingFang SC"`/`"SimSun"` 等系统栈 | ✅ |
| Q03 | CN L53 / EN L54「模板仍守住的条款（**`box-shadow` 0**、`gradient` 0、`backdrop-filter` 0、Emoji 0）」 | `gradient` 0 ✓ / `backdrop-filter` 0 ✓ / Emoji 0 ✓；**`box-shadow`：M01 `style.css` 有 3 处（L204 hero 阴影、L284 卡片两层阴影、L560 覆盖式 `none`），M03 有 1 处（L122 用 `box-shadow` 画出汉堡菜单的两条杠）** | ❌ |
| Q04 | CN L80 / EN L81「任何静态托管都能直接用，不需要任何配置或环境变量。站点根目录就是仓库根目录」 | 用最裸的 `python -m http.server` 起在仓库根，**零配置**下 15 个文档点名 URL 全 200（§4-C04）；`index.html` 的 `meta refresh` 指向 `./prototypes/_selection/` | ✅ |
| Q05 | CN L93 / EN L94「根目录的 `index.html` 会自动跳到选型台」 | `<meta http-equiv="refresh" content="0; url=./prototypes/_selection/">` + `<link rel="canonical">` | ✅ |
| Q06 | CN L101 / EN L102「必须保留 `.nojekyll`；Jekyll 会丢掉所有下划线开头的目录；删掉整站 404」 | 文件存在且受跟踪；运行期确实依赖下划线目录：选型台引 `../Sxx/.inspect/*.jpg`、页面引 `../_fonts/css/*.css`（`shot.mjs` 实测 3 档字体 `loaded`、断链图 0） | ✅ |
| Q07 | CN L123 / EN L124「单个原型要独立跑需一并带 `prototypes/_fonts/`，因为它引用 `../_fonts/css/*.css`」 | 原型页 CSS 里确有 `../_fonts/css/` 引用；`shot.mjs` 起服务时站点根必须是仓库根（README 未说这点，脚本头注释在说） | ✅ |
| Q08 | CN L125 / EN L126「大众模板没有这个限制——复制一个目录走就能用」 | 三模板目录各 4 个文件，`<link href="style.css">` 单一本地引用，无外部字体/图片 | ✅ |
| Q09 | CN L166 / EN L166「大众模板**不含任何第三方素材**」 | 三目录共 12 个文件，无位图/字体文件/外部 URL | ✅ |
| Q10 | CN L140 / EN L141「Chrome 最小窗口宽约 500 CSS px；`--window-size=768,1024` 实际 `innerWidth` 只有 **752**」 | 旁证：`prototypes/_build/shot.mjs` 自己的 `DEFAULTS` 写死 `frameW: 16`（768−16 = **752**）与 `minWindowWidth: 500`，且 390 档实测走 `mode=iframe`。**我没自己跑裸 chrome 复现** | 🔒 |
| Q11 | CN L142 / EN L143「390 档它用 iframe 造视口」 | 实跑命中：`[390x900] mode=iframe window=516x995` | ✅ |
| Q12 | CN L162 / EN L163「`build/texture-job.json` 没进仓库；磁盘上只有 12/30 案有」 | `git ls-files` 无 `texture-job`；磁盘上 12 个（S18–S24、S26–S30）；`.gitignore` L7 `prototypes/*/build/` | ✅（本轮已修） |
| Q13 | CN L30 / EN L30「14 个确定性纹理生成器（**参数落盘可逐字节复算**）」 | 14 个 ✓（N06）；但"可逐字节复算"被同一文件 CN L162 的新警示块直接否掉（只有 12/30 案有参数文件、且该路径被忽略） | ❌ |
| Q14 | CN L57 / EN L58「唯一要求是**通过 HTTP 打开**而不是双击文件」 | 已用 HTTP 全程验证（§4-C04）；`file://` 反向对照未做 | 🔒 |

---

## 2 逐条展开（12 条不一致）

### D1【中｜数字】「约 38 张第三方照片」——五份 CREDITS.md 自列的清单是 56 文件 / 43 图

- **断言原文**：CN L157「涉及约 **38 张**第三方照片」；EN L158「covering roughly **38** third-party photographs」
- **实测证据**：逐份读 `prototypes/{S04,S07,S08,S13,S17}/assets/CREDITS.md` 的「### 盘上存在但署名表里没有对应记录的位图」小节并计数：
  ```
  S04 = 26 条（plate-01…08 的 png+webp 双编码 + plate-lead + torn-edge-1…4 → 唯一图 13）
  S07 = 9 条（plate-ads/column/detail/edge/gravure/lower/masthead + src-1902-page + src-sample-page）
  S08 = 6 条（detail/grime-macro/grime/overprint/overprint-offset/print）
  S13 = 10 条（plate-laid-paper…src-washi）
  S17 = 5 条（heritage-*.jpg ×5）
  合计 = 56 个文件；按唯一图算 = 13+9+6+10+5 = 43
  ```
- **为什么这不是"意图 vs 状态"的问题**：这是**计数断言**，而且被用作**硬约束**（同一句的下半段是"这五案的照片不得对外复用，直到署名表补齐"）。"约"覆盖不了 38→43（+13%）或 38→56（+47%）。数字偏小会直接低估受影响的素材面与补救工作量。清单本身就在仓库里可逐条数，不存在"描述的是意图"的解释空间。
- **可直接替换**：CN L157 把「涉及约 **38 张**第三方照片」改为「五案 `CREDITS.md` 自列「无署名记录位图」共 **56 个文件 / 43 张唯一图**（S04 13、S07 9、S08 6、S13 10、S17 5；S04 的 png/webp 为同图双编码）」；EN L158 同步改为「**56 files / 43 unique images**」。

### D2【中｜数字】「展开 12 字段全文」——展开区只渲染 10 组

- **断言原文**：CN L20「点行展开 **12 字段全文**与整页可翻页大图」；EN L20「click a row to expand the full **twelve fields** and a paged full-page view」
- **实测证据**：`prototypes/_selection/app.js` L335–346 —— `fields` 只拼 10 个 `field(...)`：一句话视觉定义／美学家族与参考／当前有效配色／字体策略／布局与网格／关键视觉元素／动效与交互／反 AI 味风险与规避／适用场景／设计师签名式怪癖。`field()`（L19）对空值返回 `''`；`data.js` 中 `layout` 为空的恰是 **S12/S15/S19**（复算：`empty layout: S12,S15,S19`）→ 这三案只有 9 组。`可落地要点` 没有任何渲染路径（`r.built` 在 L320–322 只决定"打开原型"链接是否可点）。
- **为什么这不是"意图 vs 状态"的问题**：主语是**选型台的展开行为**（"点行展开…"），是可点开验证的运行时事实。12 字段**数据**确实存在（`_specs/Sxx.md`），但这句说的是"展开即见全文"。同一句在选型台自身文案里已被改成"全部字段"（`prototypes/_selection/index.html` L83：「点任意一行展开它的全部字段与整页截图（**多数案 10 段；S12/S15/S19 …… 只有 9 段**）」），而该 L83 的段数与我的复算**完全一致** —— 也就是说仓库内部已经有了正确答案，只有 README 还停在"12 字段全文"。
- **可直接替换**：CN L20 改为「点行展开 **10 段字段全文（S12／S15／S19 为 9 段，因规格里没有独立的「布局与网格」段）**与整页可翻页大图」；EN L20 改为「expand the field text in **10 sections (9 for S12/S15/S19)** and a paged full-page view」。

### D3【低｜数字】M02 的 TOKENS.md 是一个 13 个变量的文档

- **断言原文**：CN L50 / EN L51「`TOKENS.md` —— **12 个变量**逐个说明（作用／默认值／改成什么会怎样）」
- **实测证据**：`templates/M02-warm-local/style.css` `:root{}` = 12 ✓（合规）；但 `templates/M02-warm-local/TOKENS.md` 中以反引号出现的**不同** `--x` = **13**（多 `--ring`；它在 `style.css` L298、L448 以局部覆盖出现）。M01 / M03 的 TOKENS.md = 12 ✓。
- **为什么这不是"意图 vs 状态"的问题**：这是交付文件的**条目计数**。读者按"12 个变量逐个说明"去核对 M02 会数出 13。现状两头不一致（`:root` 12 / 文档 13），必须二选一收口，而不是"意图上想写 12 个"。
- **可直接替换**：CN L50 / EN L51 改为「模板主变量逐个说明（**M01／M03 共 12 个；M02 另有 1 个仅在局部覆盖的 `--ring`**）」；或让 M02 把 `--ring` 提进 `:root{}` 并把三处"12 个 CSS 变量"一起改成 13。

### D4【低｜数字】「少数原型」= 13/30

- **断言原文**：CN L184「**少数**原型的 `index.html` 在 30–48.4 KB……超过内部施工规范的目标区间」；EN L185「A few prototypes…」
- **实测证据**：≥30 KB 的有 **13 个**（见 N24 名单），占 **43%**；区间本身（30–48.4 KB）与本轮修过的 S29 = 49,512 B 已自洽。
- **为什么这不是"意图 vs 状态"的问题**：量词是**可证伪的分布描述**。"少数"在 30 件的样本里用于 13 件（43%）会误导读者把它当成个别偏差，而它其实是接近一半的普遍现象（且规范目标区间是 18–27 KB，见 `_CONTRACT.md` L27–L28）。
- **可直接替换**：CN L184「**少数**原型」→「**13 个原型（43%）**」；EN L185「A few prototypes」→「**13 prototypes (43%)**」。

### D5【低｜数字（精度）】「链上最大单步 4.39」读作上界不成立

- **断言原文**：CN L177 / EN L178「（链上最大单步 ΔE76 = 4.39）」
- **实测证据**：
  ```
  ΔE76(S13,S27) = 4.39        ← 精确命中 29 号与 README 引用的数
  12 案块的最小生成树最大单步 = 5.47（S29–S22）
  12 案块内最大两两距离      = 17.27（S13–S22）
  ```
- **为什么这不是"意图 vs 状态"的问题**："链上最大单步"是一个**可复算的量**，但它依赖"哪条链"。句子没有交代链的构造，读者会自然读成"这团颜色里任意两案的相邻跳跃不超过 4.39"——那是错的（存在 5.47 的跳跃，且任意两案最远 17.27）。这不是"文档表达意图"，因为它给的是一个具体数字配一个未定义的构造。
- **可直接替换**：CN L177 / EN L178 的括号内容改为「（引用的那条链上 `S13–S27` 的 ΔE76 = 4.39；**该 12 案块的最小生成树最大单步为 5.47，块内最远两案 S13–S22 为 17.27**）」——或直接删掉"最大单步"的修饰，只留「`S13–S27` 相邻 ΔE76 = 4.39」。

### P1【中｜路径】EN 仍把 `_CONTRACT.md` 放在 `_build/` 下

- **断言原文**：**EN L200**「`│   ├── _build/                 # all tool scripts + `_CONTRACT.md` (the construction specification)`」
- **实测证据**：`prototypes/_build/_CONTRACT.md` **不存在**；实际是 `prototypes/_CONTRACT.md`（19,540 B，受跟踪）。CN L199–L200 已在并发修改中改对（CN L199 `_build/ # 全部工具脚本（… 陈旧度检查）`、CN L200 `_CONTRACT.md # 施工规范（在 prototypes/ 根，不在 _build/ 下）`）。
- **为什么这不是"意图 vs 状态"的问题**：目录树是找文件的路径说明，按 EN 那一行找会扑空。而且**同一份交付物的中英两版现在说的是两件事**——这不是"英文版描述的是意图"，而是 CN 已改、EN 漏改的**同步缺口**（且 CN L191 / EN L192 自称 "bilingual, translated section by section / 逐节对译"）。
- **可直接替换**：EN L200 拆成两行，与 CN 对齐：
  ```
  │   ├── _build/                 # all tool scripts (render / verify / font fetching / asset prep / textures / staleness check)
  │   ├── _CONTRACT.md            # the construction specification (at prototypes/ root, NOT under _build/)
  ```

### P2【低｜路径 / .gitignore 一致性】README 示例写 `--out .shots`，而 `.gitignore` 与工具自述都写 `.shot-test`

- **断言原文**：CN L137 / EN L138「`node prototypes/_build/shot.mjs … --out .shots --widths 1440,768,390 --name S14`」
- **实测证据**：
  ```
  .gitignore L45: .shot-test/          （无 .shots）
  prototypes/_build/SHOT-README.md L8 / L215: --out .shot-test --widths 1440,768,390 --name S14
  shot.mjs 的默认 --out = .shot
  ```
- **为什么这不是"意图 vs 状态"的问题**：这是一条**照抄即产生副作用**的指令。按 README 跑一次，工作区里就多一个 `D:\Web\style\.shots\`（34 张 PNG + report.json，实测 S14 单案就 2.8–3.6 MB/档），而它**不被任何忽略规则覆盖**，会直接出现在 `git status` 里。工具自己的文档与 `.gitignore` 用的是另一个名字，说明命名不一致是 README 单方面的偏差。
- **可直接替换**：CN L137 / EN L138 的 `--out .shots` 改为 `--out .shot-test`（与 `.gitignore` L45 和 `SHOT-README.md` 一致）；若坚持 `.shots`，则 `.gitignore` 需补一行 `.shots/`。

### C1【高｜命令】`render-scheme.mjs` 被两重阻断：硬编码 `D:/Web/style` + 依赖未入库的 `tools/`

- **断言原文**：CN L131 / EN L132「`node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence`」——列在「## 渲染与验收」下的第一条，是这套仓库宣称的验收入口。
- **实测证据**：
  ```
  render-scheme.mjs L16:  const ROOT = 'D:/Web/style';
  render-scheme.mjs L17:  const INSPECT = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/inspect.mjs');
  git ls-files tools | Measure-Object -Line        → 0
  git check-ignore -v tools/…/scripts/inspect.mjs  → .gitignore:2:tools/   tools/…
  ```
- **为什么这不是"意图 vs 状态"的问题**：这是一条**给出即可执行的命令**。两项都是**静态事实**：脚本里写死的 `ROOT` 只在本机这台机器上成立；而它的唯一测量通道 `inspect.mjs` 属于 `.gitignore` L2 排除的 `tools/`（0 个受跟踪文件）。README 的「阶段 1」又明确让读者把仓库 clone 到**自己的目录、自己的机器**（`cd web-style-atlas`）。所以对任何按 README 操作的读者，这条命令要么找不到 `inspect.mjs`、要么去操作 `D:/Web/style` 这个不存在的树 —— 与"文档想表达什么"无关。
- **可直接替换**（CN L131，EN L132 同步）：
  ```
  # 渲染一个原型：三档视口真实截图 + 闸门结果
  # ⚠️ 需要 vendor 工具 tools/taste-skill/…/scripts/inspect.mjs —— 该目录被 .gitignore 排除、不在仓库内；
  #    且脚本把 ROOT 写死为 D:/Web/style。克隆副本需先把 ROOT 改成自己的仓库根，并自备该工具。
  node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence
  ```
  更彻底的做法：让 `render-scheme.mjs` 用 `fileURLToPath(import.meta.url)` 推导 `ROOT`，并把 `INSPECT` 改成可用环境变量覆盖。

### C2【中｜命令】`verify-prototype.mjs` 把仓库根写死为 `D:/Web/style`

- **断言原文**：CN L134 / EN L135「`node prototypes/_build/verify-prototype.mjs --all`（不带参数则复核全部）」
- **实测证据**：
  ```
  verify-prototype.mjs L12: const ROOT = 'D:/Web/style';
  verify-prototype.mjs L13: const PROTO = join(ROOT, 'prototypes');
  实跑: D:\Nodejs\node.exe prototypes\_build\verify-prototype.mjs --all
        → exit 1；45 行输出；末行「达标 26 / 不达标 4 / 共 30」
  ```
- **为什么这不是"意图 vs 状态"的问题**：脚本能跑、且结论正确（26/4 与我用 `report.json` 独立复算一致）——但它**只在 `D:/Web/style` 这一个位置正确**。README 「阶段 1」教读者 `cd web-style-atlas`，也就是换目录换机器。届时脚本会去检查一个不存在的 `D:/Web/style/prototypes`，或者更糟，去检查**另一份**同路径仓库。这是导入路径的静态事实，不是意图问题。
- **可直接替换**（CN L134，EN L135 同步）：
  ```
  # 机械复核（不带参数则复核全部）
  # ⚠️ 脚本把 ROOT 写死为 D:/Web/style；换目录请先改 L12，或改用 --root <你的仓库根>（若脚本支持）
  node prototypes/_build/verify-prototype.mjs --all
  ```

### C3【低｜命令】`shot.mjs` 把 Chrome 与 Python 写成绝对路径（有 flag 可覆盖）

- **断言原文**：CN L137 / EN L138 的那条命令；CN L171 / EN L170 把它列为「渲染与复核工具：Node.js 18+、Python 3.8+（Pillow）、Google Chrome」。
- **实测证据**：
  ```
  shot.mjs L39: chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  shot.mjs L40: python: 'C:\\Users\\Administrator\\.dsh\\dsh-runtimes\\...\\python.exe',
  实跑（本机）: exit 0，3 档全部成功
  ```
- **为什么这不是"意图 vs 状态"的问题**：`C:\Users\Administrator\.dsh\dsh-runtimes\…` 是**本会话运行时**的私有路径。README L170 只说"需要 Python 3.8+（Pillow）"，没提这条路径依赖。本机能跑通不构成"文档准确"——这是**可移植性断言**，而默认值是机器绑定的静态常量（有 `--chrome`/`--python` 覆盖位，README 未提）。
- **可直接替换**（CN L137 之后加一句，EN L138 同步）：
  > `shot.mjs` 的 `--chrome` / `--python` 默认值是本机绝对路径；换机器请显式传入，例如
  > `node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ --out .shot-test --widths 1440,768,390 --name S14 --python "C:\Python313\python.exe"`

### Q1【中｜能力声明】「模板仍守住 `box-shadow` 0」——M01 有 3 处、M03 有 1 处

- **断言原文**：CN L53「并列出仍然守住的条款（**`box-shadow` 0**、`gradient` 0、`backdrop-filter` 0、Emoji 0、无空洞营销词）」；EN L54「also lists what it still holds to (**`box-shadow: 0`**, `gradient: 0`, `backdrop-filter: 0`, zero emoji, no empty marketing words)」
- **实测证据**（剥掉注释后统计，全部落在会渲染的规则里）：
  ```
  M01-clean-corporate/style.css L204: box-shadow:0 20px 32px -22px rgba(20,27,35,.45);        ← hero
  M01-clean-corporate/style.css L284: box-shadow:0 1px 2px rgba(20,27,35,.04), 0 16px 30px -24px rgba(20,27,35,.3);  ← 卡片
  M01-clean-corporate/style.css L560: box-shadow:none;                                        ← 覆盖式复位
  M03-bold-creator/style.css   L122: box-shadow: 0 -5px 0 currentColor, 0 5px 0 currentColor;  ← 汉堡菜单两条杠
  M02-warm-local/style.css      : 0 处
  ```
  且 **M01 自己的 README.md L162 明确承认这是有意的豁免**：「**R-16 / C-2.11** 禁 24px 圆角 + 柔和投影的"卡片浮起" | `--radius:10px` + 一段很浅的两层阴影 `0 1px 2px` + `0 16px 30px -24px` | …模板必须让第一次见到它的人立刻知道**哪里能点**」。M02 的 README.md L188 则写「**全站零 `box-shadow`**」。
- **为什么这不是"意图 vs 状态"的问题**：这句话不是主张，是一个**可 grep 的计数声明**（"守住 `box-shadow` 0"）。它还有仓库内部的直接反证：README 说"我在每份模板 README 里列出了仍守住的条款（含 box-shadow 0）"，而被指向的 M01/README.md 自己写的是**"这里有一处两层阴影，理由如下"**。上下两层文档对同一处样式给出相反结论，二者必有一错，不存在"意图"解释空间。
- **可直接替换**：CN L53 / EN L54 把括号内容改为「（`gradient` 0、`backdrop-filter` 0、Emoji 0、无空洞营销词；**`box-shadow` 则按案分别处理：M02 全站 0 处，M01 有 2 处实体阴影并已在 `M01/README.md` 说明理由，M03 用 1 处 `box-shadow` 画汉堡菜单的两条杠**）」。

### Q2【低｜能力声明】L30 仍宣称"逐字节复算"，与同一文件 L162 的新警示块直接冲突

- **断言原文**：CN L30「`make-textures.py` —— … **14 个确定性纹理生成器（参数落盘可逐字节复算）**」；EN L30「**14 deterministic texture generators** (parameters are written to disk and are byte-reproducible)」
- **实测证据**：14 个生成器 ✓（见 N06）。但 CN L162 / EN L163 新增的警示块写：「**但那份参数文件没进仓库**：`.gitignore` 排除了 `prototypes/*/build/`，而磁盘上**只有 12/30 案**有 `build/texture-job.json`。所以"参数落盘可逐字节复算"这句**克隆者核不了**」。两处相距 130 行，结论相反。
- **为什么这不是"意图 vs 状态"的问题**：这与 §2-P1 同类——**同一份文件里两句互斥**。L30 是"工具链能力清单"里的一行（读者据此认为"这是可复算的"），L162 是"不行，参数没入库"。修复只能是把限定词搬到第一处，或删掉 L30 的口号。
- **可直接替换**：CN L30 / EN L30 括号改为「（**14 个生成器**；参数记在各案 `build/texture-job.json`——**该路径被 `.gitignore` 排除，见本文件"授权与署名"节的警示**）」。

---

## 3 中英双份对照

**方法**：①逐节比对标题（20 个标题一一对应，行号偏移 0–2，**结构未漂移**）；②把两份 README 的**全部数字 token**（带单位）与**全部路径**各自抽成集合做差（`_crit10b/cnendiff.mjs`）。

**结论：路径集合完全相同（零差异）。数字集合的差异全部是"单位后缀"造成的假差异**（中文写"12 个 / 38 张 / 19 案"，英文写裸数字 `12 / 38 / 19`），逐条回核后**同一段落的数字与结论一一对应**。真正的不一致只有 **1 条 + 1 条不对称**：

### 3.1 【不一致 · 中】目录树里 `_CONTRACT.md` 的位置：CN 已改、EN 未改

| 侧 | 行 | 原文 |
| --- | --- | --- |
| CN | L199–L200 | `│   ├── _build/                 # 全部工具脚本（渲染 / 复核 / 抓字体 / 备素材 / 生成纹理 / 陈旧度检查）`<br>`│   ├── _CONTRACT.md            # 施工规范（在 prototypes/ 根，不在 _build/ 下）` |
| EN | L200 | `│   ├── _build/                 # all tool scripts + _CONTRACT.md (the construction specification)` |

实测：`prototypes/_CONTRACT.md` 存在（19,540 B，受跟踪）；`prototypes/_build/_CONTRACT.md` 不存在。
**为什么这不是"意图 vs 状态"的问题**：两份 README 在第 1/2 行互相声明是同一份文档的两版（CN L191 / EN L192：「中英双语，逐节对译」/「bilingual, translated section by section」）。CN 说的是"在 `prototypes/` 根、**不在** `_build/` 下"，EN 说的是"在 `_build/` 下"——**两份文档互相否定**，其中必有一份与文件系统不符，而实测判定是 EN。这不是"英文版描述意图"，而是同一轮修复只改了一侧。
**可直接替换**：见 §2-P1 的英文两行。

### 3.2 【不对称 · 低】CN 的 `_build/` 描述比 EN 多了一串能力清单

- CN L199：「（渲染 / 复核 / 抓字体 / 备素材 / 生成纹理 / **陈旧度检查**）」
- EN L200：无括号内容。

实测这 6 项都成立：`render-scheme.mjs`+`shot.mjs`+`check-stale.mjs`（渲染/陈旧度）、`verify-prototype.mjs`（复核）、`fetch-fonts.mjs`/`selfhost-fonts.mjs`/`fetch-css-fonts.mjs`（抓字体）、`assign-assets.mjs`/`fetch-scheme-assets.mjs`（备素材）、`make-textures.py`（生成纹理）。其中 `check-stale.mjs` 是本轮审查期间**新出现**的文件（已受跟踪，2,728 B）。
**这不是缺陷**，但既然 EN 声称"逐节对译"，两边信息量应对齐。**可直接替换**：把 CN L199 的括号内容译进 EN L200（已并入 §2-P1 的替换文本）。

### 3.3 已复核"说法一致"的关键段落（各条数字两侧同值）

| 段落 | CN | EN | 两侧数字是否同值 |
| --- | --- | --- | --- |
| 闸门 + 截图张数 | L14「26 个闸门 FAIL=0，**272** 张渲染截图」 | L14「26 pass … producing **272** rendered screenshots」 | 一致（且均已修对） |
| 展开字段数 | L20「**12 字段**全文」 | L20「the full **twelve fields**」 | 一致（**两侧同时错**，见 §2-D2） |
| 纹理生成器 | L30「**14 个**……可逐字节复算」 | L30「**14** deterministic … byte-reproducible」 | 一致（**两侧同时错**，见 §2-Q2） |
| 模板变量 | L39/40/41「**12 个** CSS 变量」×3 | L39/40/41「**12** CSS variables」×3 | 一致 |
| TOKENS 说明 | L50「**12 个变量**逐个说明」 | L51「the **12** variables explained one by one」 | 一致（**两侧同时错**，见 §2-D3） |
| 仓库体积 | L75「约 **180 MB**」 | L76「about **180 MB**」 | 一致 |
| 截图命令参数 | L137「`--out .shots --widths 1440,768,390 --name S14`」 | L138 同 | 一致（**两侧同时错**，见 §2-P2） |
| 第三方照片 | L157「约 **38 张**」 | L158「roughly **38**」 | 一致（**两侧同时错**，见 §2-D1） |
| 灰块两处占比 | L181「**49.86%** / **24.27%**」「**246** 张」「**0.236%**」 | L182 同 | 一致（引 `deliverables/16` L404–405、`deliverables/21` L370/L41，见 §6） |
| 坑：752 / 500px | L140「**752**」「约 **500** CSS px」 | L141「**752**」「about **500** CSS px」 | 一致 |
| 同质三组数 | L177–L178「**18/30=60%**、**12 案(40%)**、**19 案(63%)**、**83%**、**97%**、**17%/60%/73%**、**8/17**、**12/22**、**4.39**」 | L178/L180 同 | 一致（均已修对；仅 4.39 的措辞问题见 §2-D5） |
| 色相/明度空白 | L179「**36** 个 10° 桶 / **11** 个 / **110°** / **20–60** / **0 案**」 | L180 同 | 一致 |
| `index.html` 体积 | L184「**30–48.4 KB**（S29 **49,512 B**）」 | L185 同 | 一致（均已修对） |
| 字体样式表数 | L197「**48** 个样式表」 | L198「**48** stylesheets」 | 一致（均已修对） |
| 修正值处数 | L205「**二十多处**」 | L205「more than **twenty**」 | 一致 |
| HTTP 打开警告 | L183「**5818** 种颜色 vs **2** 种颜色」 | L184「**5818** distinct colours vs **2**」 | 一致 |

**中英不一致条数：1 条（§3.1）+ 1 条信息量不对称（§3.2）。**

---

## 4 命令可执行性实测

**总表**：可实跑且允许实跑的 **3/3 通过**；**1 条因写范围主动不跑**；**3 条无环境**。

### 4.1 ✅ `node prototypes/_build/verify-prototype.mjs --all`（CN L134 / EN L135）

```
> D:\Nodejs\node.exe prototypes\_build\verify-prototype.mjs --all
  ✓ S01 S01-red-wedge-broadsheet   html 19.1K / css 20.1K / FAIL 0 / WARN 4 (palette-cream font-count no-footage side-scroll) / 真图 6 / 6 屏 / 截图 7 / report at 2026-10-16T23:17:30.053Z
  …
  ✗ S07 …  html 18K / css 12.8K / FAIL 1 / WARN 3 / 真图 6 / 截图 9
      · 闸门 FAIL=1：mono
  ✗ S08 …  FAIL=2：palette-terracotta font-count
  ✗ S13 …  html 24.6K / css 33.4K / FAIL 4 / WARN 5 / 真图 5 / 截图 8
      · 闸门 FAIL=4：mono shadow button-fx empty-screens
  ✗ S21 …  html 32.6K / css 37K / FAIL 1：mono
  ✓ S29 S29-wire-bound-safety-manual   html 48.4K / … / 真图 10 / 12 屏
  …
  达标 26 / 不达标 4 / 共 30
  [exit code: 1]
```
- **结论**：跑得通，且它是**独立第三方口径**证实了 §1-N01（26/4）与 §1-N14（8 条 FAIL 逐条对上）以及 §1-N24（S29 = 48.4K）。
- 全量输出：`_crit10b/verify-all.txt`（45 行）。
- ⚠️ 但 `verify-prototype.mjs` L12 `const ROOT = 'D:/Web/style'` 硬编码（见 §2-C2）。

### 4.2 ✅ `node prototypes/_build/shot.mjs prototypes/S14-…/ --widths 1440,768,390 --name S14`

> **注**：文档写的 `--out .shots` 未照抄，改指 `_crit10b/shots`，理由见 §2-P2（`.shots` 不被 `.gitignore` 覆盖，照抄会往仓库根塞 34 张 PNG）。除此之外参数与文档逐字相同。

```
> D:\Nodejs\node.exe prototypes\_build\shot.mjs prototypes/S14-zero-g-launch-sequence/ --out _crit10b/shots --widths 1440,768,390 --name S14
shot.mjs  target=prototypes/S14-zero-g-launch-sequence/index.html
         server=http://127.0.0.1:13674  root=D:\Web\style
         out=D:\Web\style\_crit10b\shots  tiers=1440x900, 768x900, 390x900  jobs=2 gap=700ms

[1440x900] mode=direct window=1456x995
   页高 7569（真视口 7569，长窗口独有内容到 8490 已排除）  来源=fold-viewport  9 屏  校准=ok
   首屏 1440x900 457.0 KB   整页 1440x7569 3.02 MB   切片 9 张  对得上=true
   整页平均亮度 64.674 主色 #12181d 48.3%  字体 loaded  断链图 0
[768x900] mode=direct window=784x995
   页高 9250  11 屏  切片 11 张  对得上=true
[390x900] mode=iframe window=516x995
   页高 12161  14 屏  切片 14 张  对得上=true
! 有 6 个资源 404：全部是 /favicon.ico
失败 0 档：[]
[exit code: 0]
```
- **结论**：跑得通、3 档全部成功、字体 `loaded`、断链图 0、零失败档。**正向验证了 CN L142 / EN L143「390 档它用 iframe 造视口」**（实测 `mode=iframe`），也间接支撑 CN L140 的 752（脚本 `DEFAULTS.frameW = 16`）。
- 产出：34 张 PNG（fold / full / 逐屏）+ 3 份 `*-stats.json` + `report.json`（+ `.shot-http.log`）。

### 4.3 ✅ `python -m http.server` + 文档点名的全部 URL

```
> python -m http.server 18080 --bind 127.0.0.1      （站点根 = 仓库根，零配置）
/                                                                      200  1569 bytes
/index.html                                                            200  1569 bytes
/prototypes/_selection/                                                200  6191 bytes
/prototypes/_selection/wizard.html                                     200  5558 bytes
/prototypes/_selection/data.js                                         200  261831 bytes
/prototypes/_selection/app.js                                          200  23672 bytes
/templates/M01-clean-corporate/                                        200  25283 bytes
/templates/M02-warm-local/                                             200  26589 bytes
/templates/M03-bold-creator/                                           200  13049 bytes
/prototypes/S14-zero-g-launch-sequence/                                200  32652 bytes
/prototypes/_fonts/css/noto-serif-sc__400-700.css                      200  223569 bytes
/prototypes/S14-zero-g-launch-sequence/assets/plate-01-lm-flight-controls.jpg  200  135211 bytes
/.nojekyll                                                             200  585 bytes
/README.md                                                             200  18702 bytes
/LICENSE                                                               200  3906 bytes
/prototypes/nope/                                                      404（预期）
```
- **结论**：**正向验证 CN L80 / EN L81「任何静态托管都能直接用，不需要任何配置或环境变量。站点根目录就是仓库根目录」**，也验证 CN L69–L72 的 4 个入口 URL 全部可达（选型台、向导、一个模板、一个原型）。

### 4.4 ⛔ 主动未跑：`node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence`（CN L131 / EN L132）

**不跑的理由（写范围）**：`render-scheme.mjs` L28–L31 把输出目录固定为 `prototypes/<案>/.inspect`，而那是**受跟踪的既有产物**（`.inspect/*.jpg` 与 `report.json` 都在 `git ls-files` 里）。跑它会改写原型目录 → 越出「不许改任何原型」。
**改为核前置条件**（两项都为真，且两项都构成阻断）：
```
render-scheme.mjs L16:  const ROOT = 'D:/Web/style';
render-scheme.mjs L17:  const INSPECT = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/inspect.mjs');
Test-Path tools/taste-skill/skills/taste-skill/scripts/inspect.mjs   → True   （本工作区有）
git ls-files tools | Measure-Object -Line                            → 0      （仓库里没有）
git check-ignore -v tools/…/scripts/inspect.mjs                      → .gitignore:2:tools/
```
**判定**：脚本本身在**本机**可用；但在**按 README 部署流程 clone 出来的副本里必失败**（唯一测量通道 `inspect.mjs` 不在仓库内），且换目录后 `ROOT` 也不对。详见 §2-C1。

### 4.5 🔒 无环境未跑

| 命令 | 出处 | 原因 |
| --- | --- | --- |
| `npx serve .` | CN L61 / EN L62 | 本环境直连外网几乎不通，`npx` 无法临时拉包 |
| `php -S localhost:8080` | CN L63 / EN L64 | 本机无 php 可执行体 |
| `gh api -X POST repos/:owner/:repo/pages -f 'source[branch]=main' -f 'source[path]=/'` | CN L98 / EN L99 | 无 `gh` 认证与外网；只做了语法核对（`-f` = `--raw-field`，对 `source[branch]` 嵌套键有效；`repos/:owner/:repo` 是 gh 的占位符约定） |
| `git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git` | CN L85 / EN L86 | 外网不通，无法确认该仓库存在/可访问 |

### 4.6 ✅ 附带实测（文档能力声明的支撑证据）

| 被验证的声明 | 命令 | 结果 |
| --- | --- | --- |
| CN L170 / EN L171「`shot.mjs` 完全零依赖」 | `Select-String` 扫 `shot.mjs` 的 `^import` | 只有 `node:http / node:child_process / node:fs / node:path / node:os / node:url` |
| CN L170 / EN L170「渲染与复核工具：Node.js 18+、Python 3.8+（Pillow）、Google Chrome」 | `node -v`；`python -c "import PIL"`；Chrome 版本 | Node **v26.12.1** ✓；Python **3.12.14** + Pillow **12.3.0** ✓；Chrome **155.0.8059.85** ✓。三者都满足下限，且 4.2 的实跑用到了这三样 |
| CN L182 / EN L183「`measure` 按 **0.5em** 估算字符宽」 | `Select-String tools/…/lib/probe.mjs 'measureChars'` | `probe.mjs` L447：`measureChars: longest ? Math.round(longest.w / (longest.size * 0.5)) : null` → **0.5em 系数逐字命中**，规则体在 `rules.mjs` L119（阈值 `> 88`，仅非移动档报 WARN）。**声明为真**（但该文件在未入库的 `tools/` 下，见 §6） |

---

## 5 我判为准确、不用改的项

**全部经本轮实测复算，非转引。**

**数字（13 条）**
1. CN L14 / EN L14「**26 个闸门 FAIL=0**」——`verify-prototype.mjs --all` 自报「达标 26 / 不达标 4 / 共 30」，且我用 30 份 `report.json` 的 `findings[].level` 独立复算同值。
2. CN L14 / EN L14「**272** 张渲染截图」——`data.js` `shots` = 272、`report.json` `images[]` = 272、`S*/.inspect/` = 272，三源同值。
3. CN L15「F 型 **15** / R 型 **15**」——`data.js` `fr` = `{F:15,R:15}`。
4. CN L15「30 个美学家族**互不重复**」——`family` 30 个取值、去重 30。
5. CN L30 / EN L30「**14 个**确定性纹理生成器」——`make-textures.py` 的 `gen_*` 恰 14 个（逐个列名见 §1-N06）。
6. CN L39/40/41「**12 个** CSS 变量」×3——三个模板 `:root{}` 各 12。
7. CN L75 / EN L76「仓库约 **180 MB**」——受跟踪 2,015 个文件合计 **185,253,754 B = 176.7 MB**。
8. CN L157「全库有 **11 行**把许可写成"见来源页"而来源页为空」——逐行匹配 = **11**。
9. CN L158 / EN L159「S14 有 **28 处**占位文本」——`S14/assets/CREDITS.md` 的 `待页面引用` = **28** 次（S15 = 7）。
10. CN L176 / EN L177「四个旧原型仍有闸门 FAIL，**合计 8 条**」+ 每案逐条 id——与 `report.json` 与 `verify-prototype.mjs` 两个口径都逐条吻合。
11. CN L177「**18 / 30 = 60%**（判据 色相 28–72° 且 明度 ≥78）」——复算 18/30。
12. CN L177 / EN L178「**12 案**（宽口径 ΔH≤3° 且 ΔL≤3°）」与「**ΔE76≤5 是 19 案（63%）**」——两个判据各自复算命中，案号列表与被引的 `deliverables/29` §1c 逐号一致。
13. CN L177「**83%** 无导航链接 / **97%** 圆角为 0」；CN L179「**11** 个色相桶 / 紫→品红 **110°** 全空 / 明度 **20–60** = **0 案**」；CN L184「**30–48.4 KB**、S29 = **49,512 B**、13 个 ≥30 KB」；CN L197「**48** 个样式表」；CN L205「**二十多处**」（`_CURRENT-VALUES.md` §1 有 23 行写明被取代的旧值）。

**路径（3 条）**
14. CN L199–L200「`_CONTRACT.md` 在 `prototypes/` 根、不在 `_build/` 下」——实测吻合（EN 侧未同步，见 §2-P1）。
15. CN L189–L203 目录树里被点名的每一个条目——`index.html`、`README.md`/`README-EN.md`、`LICENSE`、`.nojekyll`、`templates/`、`prototypes/{_selection,_fonts,_specs,_build,_CONTRACT.md,S01…S30}`、`deliverables/` **全部存在**。
16. CN L24–L31 工具链点名的 10 个脚本 + `templates/M0{1,2,3}/{index.html,style.css,README.md,TOKENS.md}`（12 个文件）——**全部存在**。

**命令（4 条）**
17. `verify-prototype.mjs --all`（§4.1）、18. `shot.mjs` 三档（§4.2）、19. `python -m http.server` + 15 URL 全 200（§4.3）、20. `shot.mjs` 零依赖（§4.6）。

**能力声明（9 条）**
21. CN L35「模板零外部依赖」——`https?://` = 0、外部 `url()` = 0、`@font-face` = 0、`<script>` = 0/0/1（M03 为**内联**，非库）。
22. CN L35「字体走系统字体栈」——三份 `style.css` 字体变量全为系统栈。
23. CN L53 里的 `gradient` 0 / `backdrop-filter` 0 / Emoji 0——三个模板逐项实测 0（**但同一括弧里的 `box-shadow` 0 不成立，见 §2-Q1**）。
24. CN L80「任何静态托管都能直接用，零配置，站点根 = 仓库根」——§4.3 正向验证。
25. CN L93「根 `index.html` 自动跳到选型台」——`meta refresh` + `rel=canonical` 指向 `./prototypes/_selection/`。
26. CN L101「必须保留 `.nojekyll`」+「下划线目录会被 Jekyll 丢掉」——文件存在；运行期确实依赖 `_selection/`（截图为相对路径）与 `_fonts/`（`shot.mjs` 三档 `字体 loaded`）。
27. CN L123 / CN L125「单个原型需带 `_fonts/`；大众模板无此限制」——原型 CSS 引 `../_fonts/css/`；三模板只有 `href="style.css"` 一条本地链接。
28. CN L142「390 档用 iframe 造视口」——`shot.mjs` 实测 `[390x900] mode=iframe window=516x995`。
29. CN L166 / EN L166「大众模板不含任何第三方素材」——三目录共 12 个文件、零位图零字体文件零外部 URL。另：CN L162 新增的 `texture-job.json` 警示块（12/30 案）实测吻合。

**选型台自身文案（3 条，本轮你刚改的部分）**
30. `prototypes/_selection/index.html` L38「照下面**九组**问题挑……**前四组**是人话问题，**后五组**是设计口径与质检状态」——与 `app.js` L95「先挂用户能回答的四组轴，再挂设计口径与质检状态」一致；`data.js` `axes` 恰 10 个键（4 个人话轴 + 6 个质检轴，其中 `band/bandHue/bandL/bandSat` 同属底色带一组）。
31. `index.html` L83「展开它的**全部字段**……**多数案 10 段；S12/S15/S19 只有 9 段**」——`app.js` L335–346 恒发 10 个 `field()`，`field()` 对空值返回 `''`，而 `layout` 为空者恰为 **S12/S15/S19** → 27 案 10 段、3 案 9 段，**逐字命中**。
32. `index.html` L38「全部由实测值算出（底色相对亮度、底色色相与明度、正文字数、调色板最高彩度）」——`data.js` 的 `axes.groundL/bandHue/bandL/bandSat/words/chroma` 字段齐备。

---

## 6 我无法验证的项

**分类理由：不是"没找到证据"，而是"本环境或本轮写范围不允许得出可复算结论"。**

1. **`deliverables/16` / `21` 的像素级数字**：`S08 desktop-page-03` 的 `#888888` 占 **49.86%**、`S17 desktop-page-01` **24.27%**（README CN L181 / EN L182）；246 张 PNG 全量扫描「无一张超过 2%、最高 **0.236%**」（`deliverables/21` L346/L370）。**我核的是转引的忠实度**：README 与 `12-tool-rule-audit-30-v4.md` L582、`16-render-look-audit.md` L404–405、`21-visual-audit-batch1.md` L346/L370 **四处逐字一致**，我没有重新做像素扫描（需另起一套 Pillow 采样，且要重建 `_audit1` 下那批 PNG）。**按任务要求，此处不凭猜报缺陷。**
2. **`file://` 下 `mask-image` 失效 +「**5818** 种颜色 vs **2** 种颜色**」**（README CN L183 / EN L184）。我全程走 HTTP，未做 file/https 同尺寸像素对照。可追溯到的原始测量在 `deliverables/21` L41（该报告已结案为"不构成交付缺陷"）。
3. **`287 张被引用的位图 / 约 183 张派生件`**（CN L164 / EN L163）。README 忠实转引 `deliverables/30` L421/L424。我用自己的口径复算：30 案 `index.html`+`style.css` 里引用到的位图路径 **323 条**、唯一路径 **303 条**、按我的派生件命名启发式得 **180** —— 与 287/183 **口径不同**（它按 `job` 记录与生成器归属逐文件判，我按文件名模式），未能逐条复现其分类，故判为不可验证而非错误。
4. **线上可访问性一类**（本环境外网几乎不通）：`git clone https://github.com/sqkl520/web-style-atlas.git` 是否可达；`npx serve .`；`php -S`；`gh api …/pages`；「推到自己的仓库后一两分钟访问 `https://<用户名>.github.io/<仓库名>/`」；Cloudflare Pages / Netlify / Vercel 三个平台表格（CN L105–L110 / EN L106–L111）的 Build command 留空、环境变量"无"是否真能用。**其中 C04 已证伪"需要配置"这一半**（裸 http.server 零配置全通），但平台侧无法验证。
5. **「Chrome 最小窗口宽约 500 CSS px」的独立复现**（CN L140）。我只拿到**旁证**：`shot.mjs` 自己的 `DEFAULTS` 写死 `minWindowWidth: 500`、`frameW: 16`（768−16 = 752，与 README 的 752 吻合），且 390 档实测必须走 iframe。未自己跑裸 `chrome --window-size=390,844` 对照。
6. **`measure` / `inspect.mjs` / `#888888` 这几条"工具行为"声明的可核性本身**：它们指向的代码在 `tools/taste-skill/…` 下，而 `tools/` 被 `.gitignore` L2 排除（**0 个受跟踪文件**）。我**在本工作区**核到了 `probe.mjs` L447 的 `… / (longest.size * 0.5)`（见 §4.6，声明为真），但**克隆副本里没有任何办法核这几条**。这既是"验证能力"的限制，也是与 §2-C1 同源的仓库缺口。
7. **`templates/M0x/README.md` 里的"用途级理由"论证**（"因为模板要给第一次见到的人指路，所以用浅阴影"之类）：属**论证**而非四类可验证断言，按任务口径不评。我核的是这些文件**存在**、且它们与顶层 README 的**可验证断言**是否冲突（冲突已报：§2-Q1 的 `box-shadow`）。
8. **"无空洞营销词"**：无机械判据，不可验证。
9. **`deliverables/` 文档链内部的自洽性**（档位数、`29` 的 ΔE76 参数、`30` 的分类表）：这是别的审查员的活，我只在需要判断 README 是否"忠实转引"时读它们。

---

## 7 限制

1. **被审文件在本轮审查期间被并发修改了两次**，本报告行号绑定 §0 的快照（`README.md` sha256 `C7F59E06…` / 205 行，`README-EN.md` sha256 `F5DB862E…` / 205 行）。**若文件继续被改，§1 的行号会漂移——请以 sha256 + 原文片段为准。** 中途有 8 条已被并发修复（§0 列出），我在快照上逐条复算确认修复正确，才把它们从缺陷清单移出。
2. **我未跑 `render-scheme.mjs`**，因为它的输出目录是受跟踪的 `prototypes/<案>/.inspect/`，跑它会改写原型目录（§4.4）。因此我对它的判定基于**静态前置条件**（硬编码 `ROOT`、依赖未入库的 `tools/`），不是运行结果。这是本报告唯一一处"命令类结论未由实跑支撑"。
3. **`_crit10b/` 在本轮中途被并发进程删除过一次**（同批消失的还有 `_crit4c/_crit8b/_crit9/_crit11`；现在根目录只剩 `_crit13/_crit14`）。因此**所有证据都以"命令 + 原文输出"内嵌本文件**，不依赖临时目录存活；`_crit10b/` 只是快照与脚本的一次性存放处。**这也是"上一轮做这个的 agent 没留下文件"的合理解释：其草稿目录被同一个 sweeper 扫掉了。**
4. **`_fonts/` 的 48 个样式表只数了个数**（README 的断言是计数）；我未核"48 份 CSS 声明的 41 个字族"是否每份都被页面用到，也未核未被引用的 CSS 有没有。
5. **中英对照用的是"数字 token + 路径集合"的机械差集**（`_crit10b/cnendiff.mjs`），它能抓出"3 与 three"这类等价、"12 个"与"12"这类单位差异，但**抓不出两句话语义相反而数字相同**的情况。§3.1 那条是我逐节读出来的，不是脚本抓的——因此**不能排除还有同类纯语义分歧**（脚本覆盖的只是可数项）。
6. **`line 数`的口径**：本环境 PowerShell `Get-Content` 的 `.Count` 与按 `\n` 切分的结果不一致（`README.md`：151 vs 206；`LICENSE`：37 vs 69）。我采用**按 LF 切分**（与 `read` 工具一致，且用 grep 抽出的哨兵行号互相印证：L14/L20/L30/L50/L157/L184/L197 两侧同号）。
7. **我只核了"文档 → 仓库"这一个方向**：文档说 X，仓库是不是 X。没有核"仓库里有什么、文档却漏了"（完整性/覆盖度），那属结构审查范畴。
8. **本文件只写 `deliverables/34-critique-doc-accuracy.md` 与 `_crit10b/`**；`git status` 里由我产生的新增未跟踪文件只有本文件（`_crit10b/` 被 `.gitignore` L52 `_crit*/` 覆盖）。**未改任何原型、模板、脚本、README 或既有 deliverables。**

---

### 附：本轮产出物

| 路径 | 内容 |
| --- | --- |
| `deliverables/34-critique-doc-accuracy.md` | 本文件 |
| `_crit10b/snap/{README.md,README-EN.md,LICENSE,.gitignore}` | 被审文件快照（行号基准） |
| `_crit10b/verify.mjs` | 闸门 / data.js / 同质判据 / 尺寸 / 字体的合并复算脚本 |
| `_crit10b/extra.mjs` | ΔE76 对点距离、`make-textures.py` 生成器清单、`_CURRENT-VALUES` 计数 |
| `_crit10b/cnendiff.mjs` | 中英数字与路径差集 |
| `_crit10b/verify-all.txt` | `verify-prototype.mjs --all` 的 45 行全量输出 |
| `_crit10b/shots/` | `shot.mjs` 对 S14 的三档取证产物（34 张 PNG + stats + report.json） |

