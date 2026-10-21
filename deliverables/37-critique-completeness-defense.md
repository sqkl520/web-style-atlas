# 37 · 成品完成度辩护

## 1 逐条裁定表

> 对撞对象：`deliverables/30-critique-assets-license.md`（903 行 / 117,544 B）。
> 本节覆盖它的 **17 条风险（R-01…R-17）+ 4 条字体风险（F-01…F-04）+ 未引用清单 + 模板层 + 它自己的 §2.3 计数 + §9.5 编码描述**，共 **32 行**。
> 裁定口径：**成立** / **成立但不必修** / **误报** / **无法判定**。所有反证都给了实测数字或"文件名+行号"。
> 我自己的复算全部走 `deliverables/37-scratch/{lic,chain,verify,backfill}.mjs`，读 json 一律 `utf-8-sig`。

### 1.1 主表

| # | 条目 | 它的指控 | 我的裁定 | 反证或实测 | 修复成本（人时+风险） | 建议 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | R-01 声明层 | S04/S07/S08/S13/S17 五案 `CREDITS.md` 自述"未闭合的缺口"，与 README/LICENSE 的普遍性断言冲突 | **成立** | 5 份文件确为 `write-credits.mjs` 模版文案（1,824 / 1,320 / 1,194 / 1,391 / 1,271 B，与 `:73-75` 逐字一致）；`README.md:154` 那句"每一张照片的作者、许可与原件链接都逐张列在各原型的 assets/CREDITS.md 里"在这 5 案上不成立 | 数据层 0（离线不可补）；声明层已修 | 它给的最低成本闭合（加"已知例外"）已落地。**剩下的是数据层，离线补不了** —— 见 §4 与本表 #2 |
| 2 | R-01 计数 | "这 5 案共 **38 个被引用的第三方位图**" | **误报（13/38）** | S04 那 13 个是纯生成物：`S04/build/make-plates.py:3`「**没有摄影原稿**，因此按同一条工艺链直接生成"分色后印出来的纸"」，`:9` 只有 `import math, random` + `PIL`（**无任何图片输入**）。实际第三方位图 = **25 个**（S07 7 + S08 7 + S17 5 + S13 5 + S04 0… 按其口径 S13 另计） | — | 把 S04 从"缺署名"名单移出 —— 与它自己的 R-06 对齐；否则同一份报告里 S04 是"第三方位图"又是"生成物" |
| 3 | R-02 现象 | `见来源页` 被当许可字段，11 行，其中 10 行同时无作者无 URL | **成立** | 我用 `utf-8-sig` 独立解析全库 **27 份** `assets` 级 `credits*.json`：命中 **11 行**（S20×2、S21×1 在 `credits-unused.json`、S22×2、S23×5、S24×1），**逐案逐行与它一致**。另测得这 11 行的 `artist` 全为 `（原件未标注作者）`、`page`/`source`/`original`/`origin` 全空 | 见 §3（整体 4 人时） | 见 §3 |
| 4 | R-02 根因 | `assign-assets.mjs` 跨案复用只搬文件名、丢 page/artist/license | **成立（可定位到行）** | `assign-assets.mjs:238-240` 三个字段各写死一个占位（`'（原件未标注作者）'` / `'见来源页'` / `''`）；`:358-359` 是另一条"找到就抄、找不到写占位"的分支；`:187` 的 `loadCredits` 白名单是 `['assets/credits.json','build/raw/credits.json','build/raw-s01/credits.json','build/credits.json','build/raw/credits-raw.json']` —— **不含 `credits.fetch.json`** | — | 修根因要动 2 个脚本（`assign-assets.mjs` + `write-credits.mjs`），不只是"回填一次"。见 §3 |
| 5 | R-02 修法 | "先修源案 S13/S25 再回填 S22/S23/S24/S28/S30，顺序反了白做" | **成立** | 源案字段确实存在：`S13/assets/credits.fetch.json` 5 行的 `file` 是 `assets/src-shelving.jpg` / `src-embossstamp.jpg` / `src-washi.jpg` / `src-paraguay.jpg` / `src-storagebw.jpg`，各带 `creator` / `license` / `page`；`S25/assets/credits.json` 5 行带 `source` URL。**它这条判断是对的** | 含在上一条 | **但它的修法漏了一步**：`write-credits.mjs:36` 是 `.filter(n => !existsSync(assets/CREDITS.md))` —— **无条件**跳过已有 `CREDITS.md` 的案子，就算把案号当参数传进去也一样跳过。S13/S25 都有 `CREDITS.md`，所以"改一行重跑"重生成不出任何东西，必须先删表或加 `--force` |
| 6 | R-03 | 183 张被引用派生件的许可落在两条声明之外 | **成立** | `LICENSE:16-21` 用目录划第三方、`:23-25` 用文件名模式 `assets/texture-*.png` 划 MIT，两个集合的补集就是派生件。我复算被引用位图 **287** 张（磁盘 398 − 未引用 111），与它一致 | 声明层已修（`2bis`）；逐张记录 15 人时 | 逐张记录收益低（见 §5）；**声明层 + 生成器记录制（它的 §2.3 第 3 条）足够** |
| 7 | R-04 | 约 27.3 MB 未处理第三方原图嵌在交付目录 `assets/` 内 | **成立** | 我独立复算 8 个池 = **45 个 / 28,374,859 B**，与它逐案一致（S02 4,293,143 / S05 1,586,877 / S06 4,426,361 / S07 2,284,834 / S09 7,140,055 / S10 2,906,320 / S13 2,873,877 / S15 2,863,392） | 它的方案 1（git mv）3 人时 + 中风险；方案 2（README 写明）0.5 人时 | **加它没提的第三条、也是最省的**：`.gitignore:9-10` 已经把 `prototypes/S09-batik-price-board/assets/raw/` 逐字声明为"未被页面引用的素材副本（已核：S09 的 8 张 raw 原图没有一个被引用）"，`git check-ignore` 实测命中 → **S09 那 7,140,055 B（占全部 28.37 MB 的 25.2%）现在就不在交付面里**。照这个先例给其余 7 池加 7 行 `.gitignore`：0.5 人时、零风险、立即把 **21,234,804 B** 移出交付面 |
| 8 | R-05 | S08 把自己的生成物写成"第三方照片 + 缺署名致歉" | **成立** | `S08/index.html:286`「套准样张、污染层与折射高光**均由构建期生成**」 vs `S08/assets/CREDITS.md` §一「照片本身是从 Wikimedia Commons 抓的」；`Test-Path prototypes/S08-amber-overprint-lightbox/build` = **False**（生成脚本确未随包）| 1.5 人时，低 | 改分类；参数只能标注"构建脚本未随包保留" |
| 9 | R-06 | S04 同样把生成物说成第三方照片，还编了一条不存在的缺署名 | **成立** | 见本表 #2 的行号证据；另外 `S04/assets/CREDITS.md` 把**全部 26 个**文件（9 `.webp` + 9 `.png` + 4 + 4）列在「### 盘上存在但署名表里没有对应记录的位图」下，而这一小节挂在「## 一、真实照片」之下 | 1 人时，低 | 参数可直接抄 `make-plates.py` 的 `ORANGE/GREEN/BLACK/PAPER` 与 `cell=8, angle=15.0` |
| 10 | R-07 | S15 `CREDITS.md` §二 0 行数据、§一 未刷新 | **成立** | 我复现：S15 `assets/CREDITS.md` 里「待页面引用」**7 处**；**且它的前置输入是齐的** —— `S15/build/bake-report.json` 4,310 B，`plates[]` 含 `photo-01-boat.jpg`…`photo-06-chart.jpg` 全 6 张及 `source` 映射；`build/textures.json` 4,111 B 也在 | 0.25 人时，低 | 它提的"先确认 `bake-report.json` 是否存在"**已可排除**：存在。§二 空是"生成时 `bake-report.json` 还没产出（`write-credits.py:91` 的 `or {"plates": []}` 兜底）"，重跑即修 |
| 12 | R-09 | S16 `assets/credits.json` 指向不存在的 `.jpg` | **成立** | 我核：`S16/assets/credits.json`（5,965 B / 7 行）`file` 写 `plate-0N-*.jpg`，磁盘 `assets/` 下是 `.png`（`.jpg` 只在 `build/raw/`，9 个文件）→ 机器可读层 100% 指空 | 0.25 人时，低 | 照 S10 的 `file`（成品）＋`raw`（原图）双字段写法 |
| 13 | R-10 | S02 `leak-patch@2x.ivory-backup.png` 三重缺记 | **成立** | 我核：引用判定 NO（`chain.json` 中 S02 verdict=NO）、`credits.json` 无该 `file`、`CREDITS.md` 无该串 | 0.1 人时，低 | 删，或加一行"生成物，未引用" |
| 14 | R-11 | S04 的 13 个未引用 `.png`（1,707,150 B）无加载路径 | **成立** | 我核：S04 未引用 13 个（1,864,936 B 含 13 个未引用项，其中 `.png` 9 个 + `torn-edge-*.png` 4 个）；`chain.json` 里 S04 被引用的 13 个全是 `.webp` | 0.1 人时，低（生成器可重跑，可逆） | 删 `.png`；不建议加 `<picture>`（S04 图版是生成物，无损回退无意义） |
| 15a | R-12 事实 | 重复文件 31 组 / 19,204,114 B | **成立（抽查 2/2 印证）** | 抽查：S19 `jean-feltgen-herbarium-sheet-phelipea-ramosa.jpg` = `reuse-s24-reuse-s19-jean-feltgen-herbarium-sheet-p.jpg` = S24 `reuse-s19-jean-feltgen-herbarium-sheet-phelipea-ra.jpg`，三者 SHA-1 均为 `856360beb398` / 508,033 B；S08 `assets/fonts/plex-numerals.woff2` 与 `_fonts/files/ibm-plex-mono/f0d72638--F63fjptAgt5VM-kVkqdyU8n1i8q1w.woff2` SHA-1 均为 `bb87500e3204` / 14,708 B | — | 它的 31 组我只抽了它点名的 2 组，其余未全量复核 |
| 15b | R-12 建议 | "S19 同目录内那一份**没有任何引用者**，删掉即可" | **误报（照做会改坏页面）** | `S19-copperplate-herbarium-cabinet/index.html:189` 与 `:270` **两处**引用 `assets/reuse-s24-reuse-s19-jean-feltgen-herbarium-sheet-p.jpg` —— 它是"同号复份"的第二块图版。删掉会断 2 个 `<img>`。**这也和它自己 §8 表格里"S19：未引用 0 个"直接矛盾** | 0（不该动） | 保留；只在 `credits.json` 里注一句"与规范名同字节" |
| 16 | R-13 | S13 `assets/credits.json` 是 `value`/`Count` 聚合壳，不是行列表 | **成立** | 我核：顶层 3 个元素 = `{value:[…5 行…], Count:5}` + 2 个独立行对象；真正的 5 行 `src-*` 记录在 `assets/credits.fetch.json`（6,359 B） | 0.5 人时，低 | 改 `write-credits.mjs:19` 的 `sub` 列表加 `assets/credits.fetch.json`（**这是 1 行改动**）；并把 S13 从"缺口"名单移出 |
| 17 | R-14 | S11 `assets/credits.json` schema 与全库不兼容 | **成立** | 我核：S11 顶层是 `buckets:images+textures+fonts`，共 14 个对象；而全库其余 24 份是行数组。任何"遍历 `credits.json` 抽许可"的脚本在 S11 上会静默返回 0 条 —— 我自己的第一版 `lic.mjs` 就在 S11 上抓出 11 行 `lic=""` 的假缺许可（见 §6） | 0.25 人时，低 | 加 `rows:[…]`，保留现有键 |
| 18a | R-15 事实 | S21 `candidates.json` 覆盖 27/28，`sheet.jpg` 未登记 | **成立** | 我核：`candidates.json` 是 10 个 `{value:[…]}` 聚合壳，摊平后 **27 条**，磁盘 `_cand/*.jpg` **28 个**，差集恰为 `['sheet.jpg']`；反向差集 0 | 0.1 人时，低 | 补一行或删文件 |
| 18b | R-15 建议 | "22 张带可核对许可的弃用照片没写弃用理由" | **成立但不必修** | 它自己也承认 S21 为 6 张 `reuse-*` 写了逐张 `reason`（我核：`credits-unused.json` 6 行，`reason` 均 >60 字，其中 `reuse-s14-plate-05-chipmunk-cockpit.jpg` 给了两条独立理由）。**那 22 张是候选池里的落选件，不是"未引用素材"** —— 候选池的常识就是"取前 N，其余不用"，逐张写理由反而会把 27 条都变成需要维护的文案 | 0.25 人时（可做可不做） | 在 `CREDITS.md` §一末尾加一句"按题材贴合度取前 6，其余留档"即可，不必逐张 |
| 19 | R-16 | 57 个被引用生成物不叫 `texture-*`，落在 MIT 声明范围外 | **成立但不必修（就它建议的那部分而言）** | 事实成立：`LICENSE:23-25` 用文件名模式划范围。但**它建议的"为 11 案各补一份 `build/texture-job.json`"会把净成本推到十几人时**，而这 11 案里 9 案（S01/S02/S05/S06/S09/S11/S12/S14/S16）的 `CREDITS.md` **已经逐行写了生成器与画法**，不缺证据；剩 3 案（S03/S04/S08）的归类问题已经被 R-05 / R-06 / §4.2 覆盖 | 改 `LICENSE` 一句 = 0.25 人时 | 只改声明；不要补 11 份 `texture-job.json` |
| 21 | F-01 | S04/S07 的 §三 写"页面字体**全部**自托管在 `_fonts/`"，实际另有 3 / 4 支 | **成立** | `S04/assets/CREDITS.md:47`、`S07/assets/CREDITS.md:30` 都是逐字模板句「页面字体**全部**自托管在 `prototypes/_fonts/`」；而 `S04/assets/fonts/` 4 个 woff2（70,464 B）、`S07/assets/fonts/` 4 个（68,052 B）不在共享缓存里 | 0.5 人时，低 | 改句 + 加 `PROVENANCE.txt` |
| 22 | F-02 | S04/S07 这 8 个 woff2 在仓库里无任何许可记录 | **成立** | `_fonts/css/` 48 份样式表里没有 `unbounded` / `redaction` / `libre-franklin` 三族；两案 `CREDITS.md` 也未提及 | 含上一条 | 同上 |
| 23 | F-03 | S08 `plex-numerals.woff2` 是共享缓存的逐字节副本 | **成立** | SHA-1 实测两边均 `bb87500e3204` / 14,708 B（见 #15a） | 0.25 人时，低 | 删并改 `style.css` 指向缓存，或注一句 |
| 24 | F-04 | S07 `--display` 字体栈里 `WenJin Mincho`/文津宋体是永不会命中的死项 | **成立** | `S07/style.css:16`：`--display:"Libre Franklin","WenJin Mincho","文津宋体","Source Han Serif SC",…`；S07 `assets/fonts/` 只有 4 个 woff2（ibm-plex-mono-400、libre-franklin-700/800、newsreader-400），文津宋体只在 S21 分发 | 0.1 人时，低 | 删两段；**不要**引 S21 的 71 片（会连带引入 `LICENSE-WenJinMincho.txt` 的交付义务） |
| 25 | 字体许可 | 声明说"来源**与许可**见 `_fonts/css/*.css` 文件头"，实际 4/48 才写了许可 | **成立** | 我独立复算：`_fonts/css/*.css` **48** 份；头部有**来源**（`来源：`/`上游：`/http URL）**48/48**；头部有**许可字样**（许可/license/OFL/Apache/MIT/SIL）**4/48** → 缺 **44**。与它完全一致。另：48 份里恰有 **2** 份缺 `族：` 行（`lxgw-wenkai__400.css` 105,585 B、`zhuque-fangsong__400.css` 45,353 B），也印证了它点的"最可疑两支" | 1 人时（补 44 行头，可脚本化） | 两处声明（`README.md:151`、`LICENSE:12-14`）都指向这个文件头，所以这 44 份必须补，或者把声明降级为"来源见文件头，许可见各字体官方发布页" |
| 26 | 未引用清单 | 111 个 / 38,486,266 B / 14 案 | **成立（逐案完全一致）** | 我用它的四条抽取规则（含**内联 style 单独再扫一遍**）独立复算：**111 个 / 38,486,266 B**，14 个案号与每案个数**全部一致**（S01 1 / S02 17 / S04 13 / S05 6 / S06 8 / S07 2 / S09 8 / S10 6 / S12 1 / S13 5 / S14 19 / S15 6 / S16 1 / S21 18）；磁盘图像 **398**、被引用 **287**。它的方法自述也可核：S04 `index.html` 确为 **9 处**内联 `style="…--torn:url(…)"`；`S05/style.css:238` 确为一条声明里两个 `url()`（`plate-scanline.png` + `plate-grain.png`） | — | 这个方法学是全报告最扎实的一层。**但同一个方法在我手里第一版就翻车了**：若不做"basename 仅在本案唯一才算命中"这条限制，S02 的 5 张 `assets/_raw/*.jpg` 会被根目录同名件误判成已引用，总数从 111 跌到 106。**它写进了这条限制，我没写——错的是我** |
| 27 | §2.3 计数 | "去重后按'文件确实缺许可记录'计：**58 个文件**" | **误报（20 个归因错 + 8 个类别错 = 28/58）** | 58 = S04 13 + S07 7 + S08 7 + S15 6 + S17 5 + S20 2 + S22 4 + S23 5 + S24 1 + S25 5 + S28 1 + S30 2（加总正确）。但：**S04 13 + S08 7 = 20 个是它自己在 R-05/R-06 判定为"生成物"的同一批文件** —— 生成物不需要第三方许可，"缺许可记录"这个罪名对它不成立；**S25 5 + S28 1 + S30 2 = 8 个的 json 里 `license` 与 `artist` 是齐的**（我逐行读过 S25 的 5 行：CC0/No restrictions/CC BY-SA 4.0/CC BY 4.0/CC BY-SA 4.0 各带作者），缺的只是**来源页 URL** 这一列 → 归到"缺许可记录"是把"缺 URL"记成了"缺许可"。**真正 `license` 字段本身缺失或为占位的 = 30 个** | — | 把 §2.1 末句的公式改成两栏：**缺 license 30 / 缺来源 URL 8**；并把 S04/S08 移出 |
| 28 | §9.5 编码 | "S01 的 `build/raw/credits.json` 与 `build/raw-s01/credits.json`、S02/S05/S06/S09/S11/S13/S15/S25 的 `assets/credits.json` **都是 UTF-16LE**" | **误报（事实错误）** | 我逐文件读前 4 字节：全库 32 份 `credits*.json`（27 份 assets 级 + 5 份 build 级）= **UTF-8 BOM 13 份 / 纯 UTF-8 19 份 / UTF-16 0 份**。没有一份是 UTF-16。它点名的那批实际是 S02/S05/S06/S09/S13(×2)/S14/S15/S25 = 9 份 **UTF-8 BOM**；`S11/assets/credits.json` 更是**连 BOM 都没有**（纯 UTF-8）；而它没提到的 **S14** 反而是 BOM 的 | 0 人时（只是描述） | 描述改成"UTF-8 BOM（`utf-8-sig` 即够），无 UTF-16"。**它把 BOM 说成 UTF-16 不影响结论**（`readJsonLoose` 多处理两种前缀无害），但这条被写进 §9.5 当"工具层待修项"后，会让人去找一个不存在的坑 |
| 29 | 模板层 | "`templates/M01/M02/M03` 不含任何第三方素材"这个声明成立 | **成立（它判对）** | 我独立复算 6 个 `index.html` + `style.css`：`http(s)://` **0**、`@font-face`/`@import` **0**、`data:` **0**、`.woff/.woff2` **0**，六份文件全 0 | 0 | 维持 |
| 30 | S06 自检 | `S06/assets/CREDITS.md:41` 的自检结论是错的 | **成立** | 原文（该文件「## 3 未采用的候选」节）：「`origin/` 中的文件全部被引用；没有被页面引用却留在盘上的原稿一个也没有。」我实测：S06 未引用 8 个 = `origin/` 全 **7** 个（4,426,361 B）+ `cursor-spoon.png` 1,434 B → 这句是错的 | 0.25 人时，低 | 改这一句；`cursor-spoon.png` 那句是对的（`:31` 已标"当前页面未引用，留在盘上备查"） |
| 31 | 三级分级 | A 14 / B 45 / C 52 | **成立但需 1 处改判** | B 档字节我独立复算 = **45 个 / 28,374,859 B**，与它一致；A 档 14 = S04 13 + S16 1 的构成也成立（S04 `CREDITS.md` 通篇无"备用/未引用"字样，S16 `CREDITS.md` 只写"本页实际引用 6 张"）；C 档的声明我也逐条找到（S01 `:20` "—（备用）"、S12 `:27` "16×16 **备用**印纹"、S06 `:31`、S21 `:38` "页面不引用"、`credits-unused.json` 6 条 reason） | 0（分析层） | **需改判 1 处**：S09 的 8 个（7,140,055 B）不只是"已在账上"，还被 `.gitignore:10` 排除出交付面（`git check-ignore` 命中）→ 应从"未引用素材"改判为**"非交付件"**，B 档随之变成 37 个 / 21,234,804 B。细节见 §2 |
| 32 | 外网原出处 | 某个 `credits.json` 里写的 `CC BY-SA 4.0` 在 Commons 文件页上是否真成立 | **无法判定** | 本环境直连外网不通，我只核了仓库内部申报链条的自洽。另：`lxgw-wenkai`/`zhuque-fangsong` 的上游是 `cdn.jsdelivr.net` 上的第三方 npm 重打包（非官方发布渠道）—— 这一点我只验证了"仓库里文件头写的就是这个 URL"，**无法验证该 URL 是否官方/是否合法** | 需联网 | 写进 §7 |

### 1.2 裁定分布（表共 34 行）

| 裁定 | 条数 | 条目号 |
| --- | --: | --- |
| **成立** | **26** | 1、3、4、5、6、7、8、9、10、11、12、13、14、15a、16、17、18a、20、21、22、23、24、25、26、29、30 |
| **成立但不必修** | **3** | 18b、19、31 |
| **误报** | **4** | 2、15b、27、28 |
| **无法判定** | **1** | 32 |
| 合计 | 34 | — |

**一句话读法**：它的**事实层与计数层几乎全对**（未引用 111/38,486,266 B、B 档 45/28,374,859 B、S14 28 处、字体 4/48、48/48 来源、模板层 0 外链、`见来源页` 11 行、SHA-1 抽查 2/2 —— 我全部独立复现一致）。错在**三处归因**和**一处建议**：把生成物算成"缺第三方许可"（20 个）、把"缺 URL"算成"缺许可"（8 个）、把 UTF-8 BOM 写成 UTF-16（0 个真 UTF-16）、以及一条**照做会改坏 S19 页面**的删除建议。

## 2 未引用素材的分类裁定

### 2.1 我复核它的三级分级：站得住，但要改判 1 类

它把 111 个拆成 A/B/C 三档（A 14 / B 45 / C 52）。这是**这份报告里对"这算不算没做完"最有用的一步**，我逐档复核：

| 档（定义） | 它的数 | 我的复核结论 | 我的修正数 |
| --- | --: | --- | --: |
| **A** 未接线且账上无"备用/留档"字样 | 14 | **成立** | 14 |
| **B** 未接线但已声明用途（原始池） | 45 / 28,374,859 B | **字节与个数完全一致** | **37 / 21,234,804 B**（S09 的 8 个 / 7,140,055 B 移到"非交付件"） |
| **C** 已声明备用/否决 | 52 | **成立**（我逐条找到声明） | 52 + S09 8 = 60 |
| **新 D** 非交付件（已被 `.gitignore` 排除） | — | 它没设这一档 | **8 / 7,140,055 B** |

**A 档 14 个的复核**（它的构成 = S04 13 + S16 1）：

- S04 13 个：`S04/assets/CREDITS.md` 全文我读过 —— 结构是「## 一、真实照片」→「### 盘上存在但署名表里没有对应记录的位图」下逐条列 **26 个**文件（9 `.webp` + 9 `.png` + 4 `torn-edge-*.webp` + 4 `torn-edge-*.png`），**通篇没有"备用""未引用""留档""仅供复核"任何一个词**。**判 A 档成立。**
- S16 1 个：`S16/assets/CREDITS.md` 明写「本页**实际引用 6 张**：plate-01-figaro-manifesto.png, …plate-06-composing-stick.png」并给出 6 行表；第 7 张 `assets/plate-07-marinetti.png`（69,345 B）**不入表、也没有任何状态词**。**判 A 档成立。**
- 它自己加的边界（"加 S02 的 `leak-patch@2x.ivory-backup.png` 与 S09 的 2 个则到 17"）我核过：`leak-patch@2x.ivory-backup.png` 26,958 B 确实三重缺记（引用 NO / `credits.json` NO / `CREDITS.md` NO）= 它的 R-10，成立；但 **S09 的 8 个不该进这个边界**，见下。

**B 档的复核**：我按池子逐个数，字节与它**一分不差**：

| 池 | 个数 | 字节 |
| --- | --: | --: |
| S02 `assets/_raw/` | 5 | 4,293,143 |
| S05 `assets/source/` | 6 | 1,586,877 |
| S06 `assets/origin/` | 7 | 4,426,361 |
| S07 `assets/src-*.jpg` | 2 | 2,284,834 |
| S09 `assets/raw/` | 8 | **7,140,055** |
| S10 `assets/*-raw.jpg` | 6 | 2,906,320 |
| S13 `assets/src-*.jpg` | 5 | 2,873,877 |
| S15 `assets/source/` | 6 | 2,863,392 |
| **合计** | **45** | **28,374,859** |

**C 档的复核**：声明我逐条找到 —— S01 `CREDITS.md:20` 的"—（备用）"、S12 `:27` 的"16×16 **备用**印纹（页面正式的斜纹走 CSS `data:image/svg+xml` 的 SVG pattern）"、S06 `:31` 的"当前页面未引用，留在盘上备查"（以及 `:9` 的"`origin/`…未经处理，仅供复核分色是否忠实"）、S21 `:38` 的"页面不引用"+实测理由、S21 `credits-unused.json` 6 条逐张 `reason`、S14 的 §一 14 行 + §二 14 行映射。**C 档成立。**

### 2.2 我唯一要改判的一类：S09 的 8 个不是"未引用素材"，是"非交付件"

它的 §1.1 把 S09 的 8 个 `assets/raw/*.jpg`（7,140,055 B，**占 111 个总字节的 18.55%，是单一最大的一块**）判成 B 档"原始池、位置问题、账目是对的"。这个判断没错，但**漏了一件能用一条命令证明的事**：

```
.gitignore:9   # ── 未被页面引用的素材副本（已核：S09 的 8 张 raw 原图没有一个被引用） ──
.gitignore:10  prototypes/S09-batik-price-board/assets/raw/
```

`git check-ignore -v prototypes/S09-batik-price-board/assets/raw/city-kiosk.jpg` 实测命中 `.gitignore:10`；同批测试的 S02 `assets/_raw/`、S06 `assets/origin/`、S15 `assets/source/`、S14 `assets/cabin-01*.jpg` **均未被忽略**（输出为空）。

**结论**：S09 这 7,140,055 B **本来就不在仓库的交付面里**（而且 `.gitignore:9` 的注释就是"已核：没有一个被引用"——**这个仓库自己在上游就核对过一次**）。所以：

- 对 S09 而言，"未引用"这个通报**不该算进"交付成品"的口径**；它已经被明确排除。
- 它的 R-04（"这 45 个原始池嵌在交付目录里"）因此**高估了 25.2%**：真正随仓库分发的原始池是 **37 个 / 21,234,804 B**。
- **这同时给了 R-04 的最优解**：不需要 `git mv`（对 gitignore 的路径 `git mv` 本来就别扭），照 S09 的先例给其余 7 池加 7 行 `.gitignore` 就行 —— **0.5 人时、不动任何文件、不动任何脚本、不可逆风险为零**，效果与 `git mv` 在"交付面干净"这一目标上等价。它给的方案 1（`git mv` + 改 8 处路径常量）是 3 人时 + 中风险（要重跑生成器验证产物不变）。

### 2.3 "哪些根本不该在仓库里"

按可复核判据，111 个里真正**属于"不该出现在交付物里"**的只有两类，且都不是"没做完"：

1. **S04 的 13 个 `.png`（1,707,150 B）** —— 全库 `<picture>`/`<source>` 命中 0，`.png` 没有任何加载路径，且它是生成物（可重跑再生）→ 属于"过程产物误留在交付目录"。**判据**：`index.html` 只写 `src="assets/plate-0N.webp"` 与 `--torn:url('assets/torn-edge-N.webp')`。
2. **S09 的 8 个 `raw/`（7,140,055 B）** —— 已被 `.gitignore` 排除。**判据**：`git check-ignore` 命中。

其余 90 个（B 档其余 37 + C 档 52 + A 档里 S16 的 1）都是**有用途或已登记的留存件**，是设计选择。

### 2.4 那 111 个"到底算不算没做完"

**我的裁定：不算。** 三条可复核的理由：

1. **97 个（B 37 + C 52 + 已改判的 8）在账上或本就不交付** —— 它有声明、有许可记录、或有 `reason` 字段。
2. **A 档 14 个里 13 个是 S04 一处，性质是"说错了"（生成物说成照片）而不是"没做完"** —— 该案页面完整、图版齐全、加载路径齐全，只是 `CREDITS.md` 的归类写反了。**"没做完"的判据应该是"页面缺图/缺功能"，S04 一条都不缺。**
3. **唯一两处既是"没接线"又能被外部察觉的是**：S16 的第 7 张图版（页面只用 6 张，第 7 张未用也未标状态）与 S02 的 `leak-patch@2x.ivory-backup.png`（26,958 B，三重缺记）。**这两处的合计影响面 = 96,303 B / 111 个文件的 0.25%。**

**所以对"成品完成度"这个问题的最终答复是**：111 个未引用文件里，**与"完成度"有关的只有 2 处 / 96,303 B**；其余 109 个是资产池、备用件、被否决的规格产物、或非交付件。它自己在 §1.5 也承认了这一点（"111 里 97 个我承认是设计选择或已登记的留档，14 个是真正需要处理的"）—— **我同意它的口径，只把"14 个"改成"2 个 + 12 个归类文案错误"**。

## 3 回填链可行性

### 3.1 它说"先修源案 S13/S25 再回填，顺序反了白做" —— 我去核了三件事

**① 源案里那些字段是否真的存在？（grep 引行）**

| 源案 | 记录文件 | 行数 | 关键字段是否在 | 实测引证 |
| --- | --- | --: | --- | --- |
| **S13** | `assets/credits.fetch.json`（6,359 B，UTF-8 BOM） | 5 | **在**：`creator` / `license` / `page` 齐全 | 该文件 5 行的 `file` 分别是 `assets/src-shelving.jpg`、`assets/src-embossstamp.jpg`、`assets/src-washi.jpg`、`assets/src-paraguay.jpg`、`assets/src-storagebw.jpg` —— **正是 `reuse-s13-src-*.jpg` 的源件**。例：`src-shelving.jpg` → `"creator": "The National Archives (United Kingdom)"`、`"license": "CC BY 3.0"`、`"page": "https://commons.wikimedia.org/wiki/File:Boxes_of_documents_on_repository_shelving_at_The_National_Archives.jpg"` |
| **S25** | `assets/credits.json`（1,695 B） | 5 | **在**：`artist` / `license` / `source` 齐全 | 5 行的 `file` = `plate1.jpg`…`plate5.jpg`，`source` 全是 `upload.wikimedia.org` 直链。例：`plate5.jpg` → `Kaethe17` / `CC BY-SA 4.0` / `…/Risograph-herr-und-frau-rio-muc-2020.jpg` |
| **S07** | **不存在** | 0 | **不在** | `S07/assets/` 只有 9 个位图 + `CREDITS.md`（1,320 B）**一个 `credits*.json` 都没有**，也没有 `fetch-assets.ps1`；`Test-Path S07/build` = **False**。S07 的 `CREDITS.md` 全文就是那句缺口模版 + 9 行"盘上存在但署名表里没有对应记录的位图" |

**② 回填脚本能否按 `file` 匹配？** —— 我写了一个真跑（`deliverables/37-scratch/backfill.mjs`）：扫全库 57 行 `reuse-*`，按 `reuse-sXX-<stem>` 剥前缀后拿 `<stem>` 去源案 `SXX/assets/credits*.json` + `SXX/build/**/credits*.json` 里按 `file`/`filename`/`raw` 的 basename 精确匹配。

**结果：57 行里有 16 行的许可或来源有缺；其中 `file` 精确匹配能命中源行并取到 `artist/creator` + `license` + `page/source` 的 = 10 行。**

**③ 哪些根本回填不了？** —— 精确匹配失手的 6 行里，**4 行仍可回填，但必须走"非精确映射"，不能只按 `file` 匹配**；**只有 2 行真的回填不了**：

| 行 | 源案 | 精确匹配 | 能不能回填 | 依据 |
| --- | --- | --- | --- | --- |
| S20 `reuse-s14-plate-05-chipmunk-cockpit.jpg` | S14 | NONE | **能，但要 2 跳** | S14 `credits.json` 的 14 行 `file` **只有 `cabin-*` / `pad-*`**，没有 `plate-*`；映射在 **`S14/assets/CREDITS.md:42`**：`\| assets/plate-05-chipmunk-cockpit.jpg \| … \| assets/cabin-05-cockpit-1960s.jpg \| silver \| 同上：Art Scholl, De Havilland Canada Ltd / CC0 \|`，而 `:21` 的 `cabin-05` 行带完整 Commons URL → **许可、作者、URL 三项都能拿到，但必须解析 MD 表格或硬编 `plate-NN ↔ cabin-NN`** |
| S21 同一文件（在 `credits-unused.json`，未进页面） | S14 | NONE | 同上 | 同上 |
| S20 `reuse-s15-photo-06-chart.jpg` | S15 | NONE | **能，但要按尾号匹配** | S15 `credits.json` 的 6 行 `file` 是 `source/fishery-0N-*.jpg`，**但每行还有一个 `slot` 字段**，值就是 `fishery-01-boat … fishery-06-chart`。派生件 `photo-06-chart.jpg` 与 `slot=fishery-06-chart` 共享尾部 `06-chart` → 可解析（`license: Public domain`、`artist: United Kingdom Hydrographic Office`） |
| S24 `reuse-s09-plate-06-batik.png` | S09 | NONE | **能，但要读生成脚本** | S09 `credits.json` 的 8 行 `file` 是裸原始名（`pattern-batik-cloth.jpg` 等），没有 `plate-06-batik.png`；映射在 **`S09/build/make-plates.py:272`**：`("pattern-batik-cloth.jpg","plate-06-batik.png", 163, 1.74, 3.10)`（属于 `PLATES` 列表，`:276` 循环消费）→ 可解析 |
| **S23 `reuse-s07-src-1902-page.jpg`** | S07 | NONE | **回填不了** | S07 无任何机器可读记录（见 ①）。唯一可用信息是 `S07/index.html:170`「图版来源：公有领域报纸缩微扫描（1902 年《同业世界》及同期地方报）」，**不含作者、不含文件页** → 离线拿不到 |
| **S23 `reuse-s07-src-sample-page.jpg`** | S07 | NONE | **回填不了** | 同上 |

### 3.2 结论：14 行能回填 / 2 行回填不了

| | 行数 | 明细 |
| --- | --: | --- |
| **精确匹配一次成功** | **10** | S22 `reuse-s13-src-shelving`、`reuse-s13-src-washi`、`reuse-s25-plate2`、`reuse-s25-plate4`；S23 `reuse-s13-src-paraguay`、`reuse-s13-src-shelving`、`reuse-s13-src-washi`；S28 `reuse-s25-plate5`；S30 `reuse-s25-plate1`、`reuse-s25-plate5` |
| **需非精确映射（可做，成本 +1.5 人时）** | **4** | S20 ×2（S14 MD 的 `plate↔cabin` 表、S15 json 的 `slot` 尾号）、S21 ×1（同 S14）、S24 ×1（S09 `make-plates.py` 的 `PLATES` 表） |
| **根本回填不了** | **2** | S23 `reuse-s07-src-1902-page.jpg`、`reuse-s07-src-sample-page.jpg` |
| 合计 | **16** | — |

**它判断对的部分**：`assign-assets.mjs` 丢字段这个根因判断**完全正确**，且能精确定位 —— `:238-240` 写死三个占位、`:358-359` 的第二条分支、`:187` 的白名单不含 `credits.fetch.json`。**它判断"源案字段存在、先修源案再回填"也正确**（S13/S25 的字段我逐行看到了）。

**它的修法缺 1 步（这条是我加的反证）**：它说"改 `write-credits.mjs` 让它把 `credits.fetch.json` 一并读入并改名匹配，再重跑"。但 `write-credits.mjs:36` 是

```js
.filter((n) => !existsSync(join(PROTO, n, 'assets', 'CREDITS.md')))
```

**无条件**过滤掉已有 `CREDITS.md` 的案子 —— 把案号当参数传（`:34` 的 `only.includes(n)`）也救不了，因为 `:36` 在后面。而 S13/S25 都有 `CREDITS.md`。**所以"改一行重跑"的结果是"什么都没发生"，而且不报错。** 要么先删表，要么加 `--force`。

**还有一层它没分清**：**S22/S23/S28/S30 的 `CREDITS.md` 不是 `write-credits.mjs` 写的，是 `assign-assets.mjs:387-415` 写的**。判据是表结构 —— `assign-assets.mjs:401` 的输出是

```
| `file` | title | artist | license | [原件页](page) 或 — · origin |
```

即**多一个 `· origin` 尾巴**，而 `write-credits.mjs:70` 只有 5 列、没有 `· origin`。S23 的 `CREDITS.md` 里那 5 行写成 `— · Wikimedia Commons（为本案重新抓取）`，正是 `:401` 的格式。**所以对下游四案，MD 层的修点在 `assign-assets.mjs:401`，json 层的修点在 `:238-240` / `:358-359`；而重跑 `assign-assets.mjs` 会重新下载/重新分配（`:346` 的 `dry` 之外还会 `unlinkSync` 并改写 `credits.json`），风险高。** → **正解是写一个只读的独立回填脚本**（读全库、写回 `credits.json` + 改 `CREDITS.md` 对应行），**不要重跑两个生成器**。

### 3.3 还核了它没提的一条：`（原件未标注作者）` 这个串本身不能当证据

`write-credits.mjs:70` 的默认值是 `${c.artist || '（原件未标注作者）'}`，所以这个串**既能表示"原件确实没标作者"，也能表示"字段丢了"**。反证：`S03/assets/CREDITS.md` 的 8 行真照片（来源是 `metmuseum.org` 的 CC0 藏品）`artist` 全部是 `（原件未标注作者）` —— **这是合法取值**（那些 19 世纪的月球摄影确实佚名），不是数据丢失。

所以判"丢字段"必须**拿源案的值去比**，我这一节就是这么做的：S13 的 5 行源记录里 `creator` 全都**有值**（The National Archives / Nakagita Yoshiaki / Southwold1966 / …），S25 的 5 行 `artist` 也全有值 → 对这批而言 `（原件未标注作者）` **可证是丢字段**。S07 的 2 行则无从比对（源案无记录）→ 不能判断是"佚名"还是"丢了"。

## 4 S23 三重缺失专项

### 4.1 结论先给：是"一半从来没记、一半记了但下游丢了"

我把 `S23-exposed-plaster-chronology-wall/assets/credits.json`（1,592 B，UTF-8 **BOM**）逐字读出来，5 个坏行分成两组，**根因不同**：

| S23 行 | 现状（json 原文） | 根因 | 证据 |
| --- | --- | --- | --- |
| `reuse-s07-src-1902-page.jpg` | `artist:"（原件未标注作者）"` / `license:"见来源页"` / `page:""` / `original:""` | **从来没记** | 源案 S07 `assets/` 里**没有任何 `credits*.json`**，也没有抓取脚本、没有 `build/`。S07 的 `CREDITS.md`（1,320 B）就是模版缺口文案。**没有任何地方记过这两张扫描件的作者与许可** |
| `reuse-s07-src-sample-page.jpg` | 同上 | **从来没记** | 同上 |
| `reuse-s13-src-paraguay.jpg` | 同上 | **记了，下游丢了** | 源案 S13 `assets/credits.fetch.json` 有对应行：`"creator": "Southwold1966"`、`"license": "CC0"`、`"page": "https://commons.wikimedia.org/wiki/File:Nouvelles_des_missions_du_Paraguay_-Twy16_-_IMG_2752.jpg"` |
| `reuse-s13-src-shelving.jpg` | 同上 | **记了，下游丢了** | `"creator": "The National Archives (United Kingdom)"`、`"license": "CC BY 3.0"`、`"page": "…/File:Boxes_of_documents_on_repository_shelving_at_The_National_Archives.jpg"` |
| `reuse-s13-src-washi.jpg` | 同上 | **记了，下游丢了** | `"creator": "Nakagita Yoshiaki"`、`"license": "CC BY-SA 4.0"`、`"page": "…/File:IseWashidrop.jpg"` |

**"丢了"的机制我已经定位到代码行**：`assign-assets.mjs:187` 的

```js
for (const sub of ['assets/credits.json', 'build/raw/credits.json', 'build/raw-s01/credits.json', 'build/credits.json', 'build/raw/credits-raw.json']) {
```

**白名单里没有 `assets/credits.fetch.json`** → S13 的 5 行 `src-*` 记录在本次分配里根本不可见 → `:229` 的 `const c = creds.get(f.name) || … || null` 返回 `null` → `:238-240` 三个字段各写死一个占位 → `:385` 落盘成 json、`:401` 落盘成 MD。

**反证"机制确实是这个"的那一行**：S23 的第 6 行 `reuse-s11-doc-04-grate.jpg` **数据是完整的** —— `"title": "File:Bucharest - Casa Paleologu window grate.jpg"`、`"artist": "Joe Mabel"`、`"license": "CC BY-SA 4.0"`、`page` 有 URL。为什么这张没丢？因为 S11 的记录就在 `build/raw/credits.json` 里（**在白名单内**）。**同一个脚本、同一批 `reuse-*`、唯一差异是源案记录落在哪个文件名上** —— 这就是根因的干净证明。

### 4.2 "5/6" 这个数我也核了

S23 `credits.json` 共 6 行，其中 5 行是坏行（上表），第 6 行完整 → **5/6 成立**。这 6 行对应的位图我独立测过：S23 磁盘 9 张图，**6 张被引用**（另 3 张是 `texture-*.png` 生成物），**未引用 0 个** → 所以"页面上的第三方照片 5/6 无记录"这个说法**成立**。

### 4.3 但要给两处降级

1. **它的 MD 描述"来源列 5 行写 `—`"不完整**。S23 `CREDITS.md` 的来源列实际写的是 **`— · Wikimedia Commons（为本案重新抓取）`** —— 那个 `—` 只是 `page` 位置缺失，后面 `·` 之后还有 `origin` 字段的内容（在 json 里 `"origin": "Wikimedia Commons（为本案重新抓取）"`，由 `assign-assets.mjs:372` 写入）。**所以"来源"不是完全空白，是"知道来自 Commons、不知道是哪一个文件"。** 这影响严重度判断：从"来源不明"降为"来源可定性、不可定位"。
2. **S23 的页面自述是诚实的**。`S23/assets/CREDITS.md` 顶部那 8 行把网络断供的时间窗、逐主机状态、以及"复用的每一张都在下表里注明原本属于哪个方案"都写了；文件名前缀 `reuse-s07-` / `reuse-s13-` 也确实标出了来源方案。**它的问题是把举证责任推给一个不存在的 `见来源页`，而不是"假装对上了"** —— 在 `_CONTRACT.md:229`「绝对不要用生成图冒充照片」这条硬要求上，S23 **没有违反**（违反的是 S04/S08，方向相反）。

## 5 按性价比排序的处理建议

排序口径：**（能让"外部读者察觉到的矛盾"减少的量）÷（人时 + 改坏风险）**。所有建议都满足"不动原型页面、不动模板、不重跑生成器"。

| 顺位 | 动作 | 人时 | 风险 | 收益（可核） | 出处 |
| --: | --- | --: | --- | --- | --- |
| **T0-1** | **写一个只读的回填脚本**：扫全库 57 行 `reuse-*`，10 行按 `file` 精确匹配、4 行按 S14 MD 的 `plate↔cabin` 表 / S15 json 的 `slot` 尾号 / S09 `make-plates.py:272` 的 `PLATES` 表补齐，写回各案 `credits.json` 与 `CREDITS.md` 对应行 | **4** | **低**（只改 JSON/MD，不碰素材与生成器） | 14 行 `artist`+`license`+`page` 从占位变实测值；S22/S23/S24/S28/S30 五案从 BREAK 转 OK | §3.2 |
| **T0-2** | 同时给两个生成器打补丁**但先不重跑**：`assign-assets.mjs:187` 加 `assets/credits.fetch.json`；`write-credits.mjs:19` 同样加；`write-credits.mjs:70` 把 `c.source` 纳入来源列候选；`write-credits.mjs:36` 加 `--force` 开关 | **1** | 低 | 让"下次再跑"不会重犯；S13 摘出缺口名单 | #5、#11、#16 |
| **T0-3** | **`.gitignore` 加 7 行**，照 `.gitignore:9-10` 的 S09 先例排除其余 7 个池（S02 `_raw`、S05 `source`、S06 `origin`、S07/S13 `src-*`、S10 `*-raw`、S15 `source`），并在 `README.md` 目录结构块补一句层说明 | **0.5** | **零**（不改文件、不改脚本） | 交付面减少 **21,234,804 B**（37 个文件）；R-04 从"27.3 MB 风险"降到"已声明排除" | §2.2 |
| **T0-4** | 跑 S15 `build/write-credits.py` 与 S14 `build/write-credits.py` | **0.5** | 低（脚本是纯 M→M） | S15「待页面引用」7 处 → 真实引用，§二 空表 → 6 行（`bake-report.json` 4,310 B 里的 6 个 `plate` 已确认在）；S14 28 处 → 真实引用 | #10、#20 |
| **T0-5** | 补 `_fonts/css/*.css` 缺的 44 份"许可"行（Google Fonts 渠道统一 OFL 1.1/Apache-2.0；`lxgw-wenkai`、`zhuque-fangsong` 两支另写"官方仓库 + OFL 1.1"） | **1** | 低（纯注释） | 让 `README.md:151` 与 `LICENSE:12-14` 的"来源**与许可**见文件头"从 4/48 变成 48/48 成立 | #25 |
| **T1-1** | 重写 `S04/assets/CREDITS.md`（13 行生成物归到"程序化生成"节 + 参数抄 `make-plates.py`）与 `S08/assets/CREDITS.md`（6 行同样迁移 + 注明生成脚本未随包） | **2.5** | 低 | 消掉**全库唯一**一处"生成图冒充照片"（`_CONTRACT.md:229` 的硬要求）；顺带让 S04/S08 从"缺署名"名单消失 | #8、#9 |
| **T1-2** | 改 `S16/assets/credits.json` 的 7 个 `file` 为 `.png` 并加 `raw` 字段 | **0.25** | 低 | 机器可读层不再 100% 指空 | #12 |
| **T1-3** | 删 `S04` 13 个 `.png`（1,707,150 B）+ `S02` 的 `leak-patch@2x.ivory-backup.png`（26,958 B）+ `S08` 的 `plex-numerals.woff2` 副本（14,708 B） | **0.25** | 低（生成器可重跑，可逆；`plex-numerals.woff2` 需同时改 `style.css` 路径） | 瘦身 1,748,816 B；消掉 R-10/R-11 与风格 F-03 | #13、#14、#23 |
| **T1-4** | 改 `S06/assets/CREDITS.md` 那句错的自检结论 | **0.1** | 低 | 消掉一处"自述与实测相反" | #30 |
| **T2-1** | 逐张记录 183 张派生件的许可（生成 `build/derive-license.json`） | **15** | 中（每案要读生成脚本反推源素材） | 兑现它 §2.3 第 3 条；但 `2bis` 声明层已闭合主要矛盾 | #6 |
| **T2-2** | 给 8 个池做 `git mv` 到 `build/` 并改各案生成脚本的路径常量 | **3** | **中**（S04 `make-plates.py:10` 这类 `parents[1]/"assets"` 硬编码要逐个改；重跑会改产物） | 与 T0-3 在"交付面干净"上等价，但多 2.5 人时与重跑风险 | #7 |
| **T3** | 给 11 案补 `build/texture-job.json` 登记 57 个非 `texture-*` 生成物 | **~8** | 低 | 只在"把宣称变成可核"上有增量；改 `LICENSE` 一句即可达到同等声明效果 | #19 |
| **✗ 不要做** | **删 S19 的 `reuse-s24-reuse-s19-jean-feltgen-herbarium-sheet-p.jpg`** | — | **会改坏页面** | `S19/index.html:189` 与 `:270` 都在引用它 | #15b |
| **✗ 不要做** | **重跑 `assign-assets.mjs`** | — | **高**（`:299` 会 `unlinkSync` 复用件、`:364` 会重新下载、`:385/:415` 重写 json 与 MD） | 目的是补 14 行字段，用 T0-1 的只读回填即可 | §3.2 |
| **✗ 不要做** | **"改一行重跑 `write-credits.mjs`"** | — | 无风险但**无效果**（`:36` 跳过已有 CREDITS.md） | 要么加 `--force`，要么走 T0-1 | §3.2 |

**如果只做一件事**：做 **T0-1 + T0-2**（5 人时）。它一次闭合 14 行跨案丢链、消掉 S23 的"5/6 无记录"、把 S22/S24/S28/S30 从 BREAK 转 OK，并且把根因堵住。
**如果只做两件事**：加 **T0-3**（0.5 人时、零风险），交付面立刻少 21.2 MB。

## 6 我辩护成功 / 辩护失败的

### 6.1 总账

| | 条数 | 占 34 条 |
| --- | --: | --: |
| **我辩护失败（它是对的）** | **29** | 85% |
| — 其中它完全成立、我唯一能做的是承认 | 26 | 76% |
| — 其中事实成立、但我把优先级/成本压下来了 | 3 | 9% |
| **我辩护成功（推翻，并有反证）** | **4** | 12% |
| **无法判定** | **1** | 3% |

**先认错**：这份重跑里我第一版的引用判定算成 **106 个未引用**，向它通报时才发现差 5 个。差的正是 S02 的 5 张 `assets/_raw/*.jpg` —— 它们与 `assets/` 根目录下的同名件重名，我的"basename 命中即算引用"规则把根目录那份的引用错记到了 `_raw/` 那份头上。**它的规则（"仅当该 basename 在本案内唯一时才接受 basename 匹配"）比我的严，也比我的对。** 修正后我复算出的 111 / 38,486,266 B、14 案逐个数字、B 档 45 / 28,374,859 B 与它**完全一致**。**这一条不是"它错我对"，是"它的方法学比我的好"。**

### 6.2 我辩护成功的 4 条（每条都有反证）

| 条 | 它的说法 | 我的反证 | 性质 |
| --- | --- | --- | --- |
| **#2** | "这 5 案共 **38 个被引用的第三方位图**"（S04 占 13） | `S04/build/make-plates.py:3`「**没有摄影原稿**，因此按同一条工艺链直接生成"分色后印出来的纸"」，`:9` 只 `import math, random` + `PIL`，**无任何图片输入** → S04 的 13 个是生成物，不能计为"第三方位图"。**它自己的 R-06 也是这么说的** —— 同一份报告里 S04 既被算作"第三方位图"又被判定为"生成物"，是内部矛盾 | 计数误报 |
| **#15b** | "S19 同目录内那一份**没有任何引用者**，只把那一份重复删掉即可" | `S19-copperplate-herbarium-cabinet/index.html:189` 与 `:270` 各引用一次 `assets/reuse-s24-reuse-s19-jean-feltgen-herbarium-sheet-p.jpg`（alt 写"同号复份的压制标本卡，卡纸深一档"）→ **删掉会断 2 个 `<img>` / 2 个图版位**。且与它自己 §8 表格"S19：未引用 0 个"直接冲突 | **照做会改坏交付物** |
| **#27** | "去重后按'文件确实缺许可记录'计：**58 个文件**" | 58 的加总没错，但归因有两类错：**① 20 个是它自己判定的生成物**（S04 13 + S08 7）—— 生成物不需要第三方许可；**② 8 个的 `license`/`artist` 在 json 里是齐的**（S25 5 + S28 1 + S30 2，我逐行读过：CC0 / No restrictions / CC BY-SA 4.0 / CC BY 4.0 / CC BY-SA 4.0，各带作者名），缺的只是**来源页 URL** 一列。真正 `license` 缺失或为占位的 = **30 个** | 归因误报 |
| **#28** | "S01 的 `build/raw/credits.json`、`build/raw-s01/credits.json` 与 S02/S05/S06/S09/S11/S13/S15/S25 的 `assets/credits.json` **都是 UTF-16LE**" | 逐文件读前 4 字节：32 份 `credits*.json` = **UTF-8 BOM 13 / 纯 UTF-8 19 / UTF-16 0**。它点名的那批是 **UTF-8 BOM**；`S11` 连 BOM 都没有；它没提的 **S14** 才是 BOM 的。**"UTF-16 坑"在本仓库不存在**，`utf-8-sig` 就够 | 事实误报（不影响结论） |

**另外 2 条我算"部分成功"（事实全成立，我压下来的是量级与成本，不是正确性）**：

- **#7（R-04）**：8 个池 45 个 / 28,374,859 B 我复算**一分不差**。但我证明 **S09 的 7,140,055 B（25.2%）已被 `.gitignore:10` 排除、`git check-ignore` 实测命中** → "随仓库分发的原始池"是 **37 个 / 21,234,804 B**；而且它给的两条修法都比必要成本高（第三条：加 7 行 `.gitignore`，0.5 人时、零风险）。
- **#19（R-16）**：事实成立，但它主张的成本我否掉了 —— 那 57 个生成物里 9 个案的 `CREDITS.md` 已有逐行生成器记录，改 `LICENSE` 一句（0.25 人时）即可，不必给 11 案各补一份 `build/texture-job.json`（~8 人时）。

### 6.3 我辩护失败的 29 条里，最后必须点名的三条

**这三条我试过推，推不动，它是对的：**

1. **R-02 的 `见来源页` 11 行** —— 我用 `utf-8-sig` 独立解析全库 27 份 `credits.json`，**一行为不差地复现了 11 行**，且这 11 行的 `artist` 全为 `（原件未标注作者）`、`page`/`source`/`original` 全空。它把根因定位到 `assign-assets.mjs` 丢字段，我也定位到了同一处（`:238-240` / `:358-359` / `:187`）。**唯一能反驳的余地是"`（原件未标注作者）` 可能是合法取值"（S03 的 8 行 Met 藏品就是合法的佚名），但对 S13/S25 那 8 行，源案的 `creator`/`artist` 明明有值 —— 可证是丢字段，不是佚名。** 这条防守失败。
2. **R-05 / R-06：全库唯一一处实质性违反 `_CONTRACT.md:229`「绝对不要用生成图冒充照片」** —— S04 的 `make-plates.py:3` 自证"没有摄影原稿"，而 `CREDITS.md` 写"照片本身是从 Wikimedia Commons 抓的"，还为此编了一条不存在的"逐张作者与许可没有保留下来"。S08 同方向（`index.html:286`「均由构建期生成」 vs `CREDITS.md` §一"真实照片"）。**这不是"没接线"、也不是"记录不全"，方向是"把自己做的东西说成别人的东西" —— 这一条我没有任何辩护空间，且它定性得比"完成度"这个词更准。**
3. **S23 的 5/6** —— 我的独立测量（S23 磁盘 9 张/引用 6 张/未引用 0 张）与它的"6 张被引用照片里 5 张无记录"完全吻合；我又把 5 行拆成"3 行下游丢 + 2 行从来没记"，**拆完之后结论对它更不利**：那 2 行（S07 系）连"回填"这条路都没有，而 S07 的 `plate-*` 7 张派生件同样无记录 → **同一个根因影响的文件数是 9 个，比它报的 2 行更多**。

### 6.4 三条它没报、但我在核它的过程中撞到的（对我方不利，照记）

1. **S07 的缺口模版给的补救路径是死路**：`S04/S07/S08/S13/S17` 的 `CREDITS.md` 都写"需要按 `build/` 下的抓取脚本与检索词重新核对一遍来源"，但 `Test-Path` 实测：**S08 / S13 / S17 / S07 四案连 `build/` 目录都没有**（只有 S04 有）。这句话在 4/5 个案子上指向一个不存在的目录。
2. **S25 的 `CREDITS.md` 文件头本身是错的**：它写"由 `write-credits.mjs` 从**本目录的 `build/` 目录中的** `credits.json` 汇总生成"，但 `S25-spotcolor-contents-zine` 下**没有 `build/` 目录**（全案 11 个文件，最大的是 `index.html` 26,279 B）。而且这句话与当前 `write-credits.mjs:56` 的文案**不同**（当前版是"从本目录**及** `build/` 下已有的 `credits.json`"）→ S25 的表是一个**旧版生成器**的产物，这也解释了为什么它只认 `page` 不认 `source`：新版旧版都不认，但"改一行重跑"这个方案必须面对"重跑的是哪一个版本、以及 `:36` 会跳过它"。
3. **S03 的 `（原件未标注作者）` 是合法取值**（8 行 Met Museum 的 19 世纪月球摄影确实佚名）→ 说明**这个串本身不能当"缺字段"的证据**，判"丢字段"必须拿源案的值去比。它没做这个比对（它的 §3 R-02 只靠"这个串 + 空 URL"），我替它补上了（§3.3）—— **补完之后它的结论仍然成立**，因为 S13/S25 的源案有值。

## 7 限制

1. **没有核网上的原始出处，也不核"某个 CC BY-SA 4.0 在 Commons 文件页上是否真成立"。** 本环境直连外网基本不通，我只核**仓库内部申报链条的自洽**（`credits.json` → `CREDITS.md` → 磁盘上实际被引用的文件）。所以：S25/S22/S28/S30 里那些 URL **在外网是否仍可达、是否指向正确的文件页**，我判不了；`lxgw-wenkai` / `zhuque-fangsong` 两支 `cdn.jsdelivr.net` 上游**是否官方渠道、授权是否可继承**，我判不了（它自己在 §9.2 也承认这只是"基于命名常识的可疑标注"）。
2. **"生成物 vs 照片"是人工判断，不是自动检测。** 我用了它同样的三条交叉证据（文件名规则 / 该案 `build/` 下生成器是否存在 / 生成脚本里有无图片输入），并**只对 S04 与 S08 逐字读了生成脚本与页面自述**（`S04/build/make-plates.py:3,9`、`S08/index.html:286`）。S02/S03/S05/S09/S14 等案的"生成物"定性沿用其 `CREDITS.md` 的自述，**没有逐案独立复算**。
3. **R-12 的"31 组重复 / 19,204,114 B"我没有全量复核。** 只抽了它点名的 2 组（S19 标本卡三份 SHA-1 `856360beb398`；S08 字体副本 SHA-1 `bb87500e3204`），**2/2 印证**。剩下 29 组未算 SHA-1。
4. **我没有验证任何 `credits.json` 里申报的 `width`/`height`/`bytes` 与磁盘实测是否一致**（S06/S10/S13/S14/S15 的 json 里有这些字段，S13 的 `credits.fetch.json` 里 `"bytes": 406988` 与磁盘 `src-shelving.jpg` 的 406,988 B 是吻合的，但只此一例）。
5. **`build/` 与 `.inspect/` 未计入"未引用"**，与它的口径一致（前者是复算输入、后者是渲染证据）。**但我把 `assets/` 内部的四个池计入了**，理由同样是"它们和被引用的成品在同一个交付目录里"。
6. **没有跑浏览器**，所有"被引用"判定都来自静态源码抽取（CSS `url()`、属性值、内联 `style` 体、引号字符串兜底，四条规则），并在注释剥离后再匹配。30 案实测没有运行时拼串引用（各案 `src` 全是字面量），但这是方法的已知边界。
7. **本轮未改动任何原型、模板、脚本、README、既有 deliverables。** 唯一的写入是 `deliverables/37-critique-completeness-defense.md`（本文件）与 `deliverables/37-scratch/`（`lic.mjs` / `chain.mjs` / `verify.mjs` / `backfill.mjs` 与 `rows.json` / `chain.json` / `unref.json` / `backfill.json`）。`37-scratch/` 已被 `.gitignore` 的 `deliverables/*-scratch/` 覆盖。
8. **临时目录被并发清理过。** 本次实测：`_crit7b/`（它报告里引用的全部脚本所在的目录）**在磁盘上已经不存在**；`_crit13/`（4 个文件）、`_crit14/`、`_crit10b/` 仍在。**所以它报告里所有对 `_crit7b/*.mjs` 的引用现在都无法复现** —— 我用 `deliverables/37-scratch/`（不在 sweeper 扫描模式里）重写了一套等价脚本，本文所有数字都可用这四个脚本重跑。
9. **本节所有字节数都是实测值，不是从它报告里抄的**（除我在表格里明确标注"与它一致"的那些，那些是我自己算完再比它，两边独立得出同一个数）。
