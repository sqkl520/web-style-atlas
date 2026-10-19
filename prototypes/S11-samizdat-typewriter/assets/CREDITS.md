# 图版、纹理与字体署名 — 方案 11 铁窗打字本

本页发布的所有位图都是本地文件，页面**不请求任何远端图片或字体**。图版源片取自 Wikimedia Commons，许可为公有领域或 CC BY / CC BY-SA；三张纹理由 `build/make-plates.py` 程序化生成，不含第三方素材。

生成的机器可读版本：[`assets/credits.json`](credits.json)　·　生成脚本：`build/write-credits.py`　·　生成日期：2026-10-17


## 1. 图版（8 张，均为灰度两阶抖动）

| 文件 | 用在哪一节 | 原图标题 | 作者 / 出处 | 许可 | 来源页 |
|---|---|---|---|---|---|
| `plate-01-typewriter.png`  
1040×693 | #ch-06 第六节 字位与跳字 | Paris - A vintage Corona folding typewriter - 2642.jpg | Jorge Royan | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0) | [原文](https://commons.wikimedia.org/wiki/File:Paris_-_A_vintage_Corona_folding_typewriter_-_2642.jpg) |
| `plate-02-carbon-form.png`  
900×1067 | #ch-02 第二节 纸张与木素 | Tape Retention Scratch Control triplicate form.jpg | Jonathan Schilling | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [原文](https://commons.wikimedia.org/wiki/File:Tape_Retention_Scratch_Control_triplicate_form.jpg) |
| `plate-03-samizdat.png`  
1080×718 | #ch-09 第九节 散失件（空状态） | Eesti samizdat 05.jpg | Ivo Kruusamägi | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [原文](https://commons.wikimedia.org/wiki/File:Eesti_samizdat_05.jpg) |
| `plate-04-window-grate.png`  
900×1350 | #ch-10 第十节 存档与调阅 | Bucharest - Casa Paleologu window grate.jpg | Joe Mabel | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [原文](https://commons.wikimedia.org/wiki/File:Bucharest_-_Casa_Paleologu_window_grate.jpg) |
| `plate-05-typescript.png`  
820×1298 | #ch-08 第八节 引用与编号规则 | Jan. 1904 George Sterling and Ambrose Bierce comments on A Wine of Wizardry typescript.jpg | George Sterling and Ambrose Bierce created this document in January 1904, 119 years ago. It is in the public domain. The poem was published in September 1907. | [Public domain](https://commons.wikimedia.org/wiki/Commons:Public_domain) | [原文](https://commons.wikimedia.org/wiki/File:Jan._1904_George_Sterling_and_Ambrose_Bierce_comments_on_A_Wine_of_Wizardry_typescript.jpg) |
| `plate-06-ribbon-spool.png`  
960×720 | #ch-03 第三节 复写层构造 | Bulgarian Cyrillic typewriter Hebros 1300 F - ribbon spool.jpg | Vassia Atanassova - Spiritia | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [原文](https://commons.wikimedia.org/wiki/File:Bulgarian_Cyrillic_typewriter_Hebros_1300_F_-_ribbon_spool.jpg) |
| `plate-07-typescript-copy.png`  
820×1052 | #ch-11 第十一节 复审与留痕 | Typescript Copy of Letter, Ethel Rosenberg to President Dwight D. Eisenhower - DPLA - 90e67e28ee184517bba8b26d45456111 (page 2).jpg | President (1953-1961 : Eisenhower). 1953-1961 | [Public domain](https://commons.wikimedia.org/wiki/Commons:Public_domain) | [原文](https://commons.wikimedia.org/wiki/File:Typescript_Copy_of_Letter,_Ethel_Rosenberg_to_President_Dwight_D._Eisenhower_-_DPLA_-_90e67e28ee184517bba8b26d45456111_(page_2).jpg) |
| `plate-08-broken-scan.png`  
1000×1283 | #ch-04 第四节 色带更换（错误状态 CARBON-04） | Typescript Copy of Letter, Ethel Rosenberg to President Dwight D. Eisenhower - DPLA - 90e67e28ee184517bba8b26d45456111 (page 2).jpg | President (1953-1961 : Eisenhower). 1953-1961 | [Public domain](https://commons.wikimedia.org/wiki/Commons:Public_domain) | [原文](https://commons.wikimedia.org/wiki/File:Typescript_Copy_of_Letter,_Ethel_Rosenberg_to_President_Dwight_D._Eisenhower_-_DPLA_-_90e67e28ee184517bba8b26d45456111_(page_2).jpg) |


### 逐张说明与生成参数

- **plate-01-typewriter.png**（1040，693）
  - 用处：#ch-06 第六节 字位与跳字 — 打字机机身与字杆机构：字头落点决定第 1 联的字位，后六联全是它的副本。
  - 原作：Jorge Royan；File:Paris - A vintage Corona folding typewriter - 2642.jpg；Own work
  - 原图说明：A vintage Corona folding typewriter
  - 原图：https://upload.wikimedia.org/wikipedia/commons/5/59/Paris_-_A_vintage_Corona_folding_typewriter_-_2642.jpg（4368x2912）→ 检索宽度 1100px
  - 处理：flatten(大半径 38 估光照并除回) → autocontrast(cutoff=1) → UnsharpMask(radius 2, percent 120, threshold 3) → fit(1040px, 上限高 1500) → Bayer 4×4 有序抖动到两阶调色板 #221E19 / #DCDDD2，gamma 1.22
  - 本地源片：`build/raw/doc-01-typewriter.jpg`　·　sha256 前 16 位：`6d166166d068f74b`
- **plate-02-carbon-form.png**（900，1067）
  - 用处：#ch-02 第二节 纸张与木素 — 三联复写单实物：同一行字在三联上的深浅差，是本册衰减层级的出处。
  - 原作：Jonathan Schilling；File:Tape Retention Scratch Control triplicate form.jpg；Own work
  - 原图说明：A carbon-based triplicate form entitled Tape Retention / Scratch Control, used in the early 1980s in an IBM mainframe EDP department to keep track of 9-track tapes used in production jobs.
  - 原图：https://upload.wikimedia.org/wikipedia/commons/e/e9/Tape_Retention_Scratch_Control_triplicate_form.jpg（1597x1893）→ 检索宽度 1100px
  - 处理：flatten(大半径 38 估光照并除回) → autocontrast(cutoff=1) → UnsharpMask(radius 2, percent 120, threshold 3) → fit(900px, 上限高 1500) → Bayer 4×4 有序抖动到两阶调色板 #221E19 / #DCDDD2，gamma 1.05
  - 本地源片：`build/raw/doc-02-carbon.jpg`　·　sha256 前 16 位：`f3b0e035eb261466`
- **plate-03-samizdat.png**（1080，718）
  - 用处：#ch-09 第九节 散失件（空状态） — 自印本散页照片：空状态里「只留下第 3 联的照片」指的就是这一张。
  - 原作：Ivo Kruusamägi；File:Eesti samizdat 05.jpg；Own work
  - 原图说明：Jaan Roos. "Tuled tuules". Märkmeid ja mälestusi aastaist 1939-41. Katkendid
  - 原图：https://upload.wikimedia.org/wikipedia/commons/8/88/Eesti_samizdat_05.jpg（6016x4000）→ 检索宽度 1100px
  - 处理：flatten(大半径 38 估光照并除回) → autocontrast(cutoff=1) → UnsharpMask(radius 2, percent 120, threshold 3) → fit(1080px, 上限高 1500) → Bayer 4×4 有序抖动到两阶调色板 #221E19 / #DCDDD2，gamma 1.12
  - 本地源片：`build/raw/doc-03-samizdat.jpg`　·　sha256 前 16 位：`b09eae21bdf3c86f`
- **plate-04-window-grate.png**（900，1350）
  - 用处：#ch-10 第十节 存档与调阅 — 方钢窗格实物：截面均匀、投影只朝一个方向，版心外那层网格照此定。
  - 原作：Joe Mabel；File:Bucharest - Casa Paleologu window grate.jpg；photo by Joe Mabel
  - 原图说明：Window and iron grate, Casa Paleologu, Strada Armenească, Bucharest Sector 2, Romania, near the corner of Strada Silvestru in the Armenian Quarter.
  - 原图：https://upload.wikimedia.org/wikipedia/commons/7/7c/Bucharest_-_Casa_Paleologu_window_grate.jpg（4000x6000）→ 检索宽度 1100px
  - 处理：flatten(大半径 38 估光照并除回) → autocontrast(cutoff=1) → UnsharpMask(radius 2, percent 120, threshold 3) → fit(900px, 上限高 1500) → Bayer 4×4 有序抖动到两阶调色板 #221E19 / #DCDDD2，gamma 1.3
  - 本地源片：`build/raw/doc-04-grate.jpg`　·　sha256 前 16 位：`20bf2fd106480459`
- **plate-05-typescript.png**（820，1298）
  - 用处：#ch-08 第八节 引用与编号规则 — 1904 年打字稿首页：稿面两色批注与删改行，支撑「批注只写行外」这一条。
  - 原作：George Sterling and Ambrose Bierce created this document in January 1904, 119 years ago. It is in the public domain. The poem was published in September 1907.；File:Jan. 1904 George Sterling and Ambrose Bierce comments on A Wine of Wizardry typescript.jpg；This January 1904 document's typescript poem and black ink comments were by George Sterling. The black pencil rules and red ink comments were by Ambrose Bierce.
  - 原图说明：First page of January 1904 first typewritten draft of "A Wine of Wizardry" with comments in black ink by George Sterling and comments in red ink and rules in black pencil by Ambrose Bierce
  - 原图：https://upload.wikimedia.org/wikipedia/commons/9/96/Jan._1904_George_Sterling_and_Ambrose_Bierce_comments_on_A_Wine_of_Wizardry_typescript.jpg（2034x3220）→ 检索宽度 1100px
  - 处理：flatten(大半径 38 估光照并除回) → autocontrast(cutoff=1) → UnsharpMask(radius 2, percent 120, threshold 3) → fit(820px, 上限高 1500) → Bayer 4×4 有序抖动到两阶调色板 #221E19 / #DCDDD2，gamma 1.26
  - 本地源片：`build/raw/doc-05-typescript.jpg`　·　sha256 前 16 位：`899583cf59a6ab4f`
- **plate-06-ribbon-spool.png**（960，720）
  - 用处：#ch-03 第三节 复写层构造 — 色带盘与上行机构：4.2 节更换顺序按这台机的压紧螺母方向写。
  - 原作：Vassia Atanassova - Spiritia；File:Bulgarian Cyrillic typewriter Hebros 1300 F - ribbon spool.jpg；Own work
  - 原图说明：Bulgarian Cyrillic typewriter model "Hebros 1300 F" according to the Bulgarian State Standard
  - 原图：https://upload.wikimedia.org/wikipedia/commons/d/d3/Bulgarian_Cyrillic_typewriter_Hebros_1300_F_-_ribbon_spool.jpg（2272x1704）→ 检索宽度 1100px
  - 处理：flatten(大半径 38 估光照并除回) → autocontrast(cutoff=1) → UnsharpMask(radius 2, percent 120, threshold 3) → fit(960px, 上限高 1500) → Bayer 4×4 有序抖动到两阶调色板 #221E19 / #DCDDD2，gamma 1.1
  - 本地源片：`build/raw/doc-06-ribbon.jpg`　·　sha256 前 16 位：`4b1a3acba0a6d089`
- **plate-07-typescript-copy.png**（820，1052）
  - 用处：#ch-11 第十一节 复审与留痕 — 复写件第 2 页：行距固定、字迹比正联浅一档，是本册衰减数值的比对基准。
  - 原作：President (1953-1961 : Eisenhower). 1953-1961；File:Typescript Copy of Letter, Ethel Rosenberg to President Dwight D. Eisenhower - DPLA - 90e67e28ee184517bba8b26d45456111 (page 2).jpg；File URL Catalog record
  - 原图：https://upload.wikimedia.org/wikipedia/commons/6/67/Typescript_Copy_of_Letter%2C_Ethel_Rosenberg_to_President_Dwight_D._Eisenhower_-_DPLA_-_90e67e28ee184517bba8b26d45456111_%28page_2%29.jpg（1350x1732）→ 检索宽度 1100px
  - 处理：flatten(大半径 38 估光照并除回) → autocontrast(cutoff=1) → UnsharpMask(radius 2, percent 120, threshold 3) → fit(820px, 上限高 1500) → Bayer 4×4 有序抖动到两阶调色板 #221E19 / #DCDDD2，gamma 1.18
  - 本地源片：`build/raw/doc-07-copy.jpg`　·　sha256 前 16 位：`067c828cc8173a79`
- **plate-08-broken-scan.png**（1000，1283）
  - 用处：#ch-04 第四节 色带更换（错误状态 CARBON-04） — 在公有领域扫描件上叠加程序化损坏：中段丢行、右侧拖影、斜向撕口，给 CARBON-04 一张真图。
  - 原作：President (1953-1961 : Eisenhower). 1953-1961；File:Typescript Copy of Letter, Ethel Rosenberg to President Dwight D. Eisenhower - DPLA - 90e67e28ee184517bba8b26d45456111 (page 2).jpg；File URL Catalog record
  - 原图：https://upload.wikimedia.org/wikipedia/commons/6/67/Typescript_Copy_of_Letter%2C_Ethel_Rosenberg_to_President_Dwight_D._Eisenhower_-_DPLA_-_90e67e28ee184517bba8b26d45456111_%28page_2%29.jpg（1350x1732）→ 检索宽度 1100px
  - 处理：flatten(38) → autocontrast(1) → UnsharpMask(2,120%,3) → fit(1000px) → 丢行：h×0.30–0.72 区间按 2–7 行块抬到纸色；拖影：w×0.55 右侧高斯模糊 3.2；撕口：h×0.52 两条斜向白带 → Bayer 4×4 两阶，random.Random(1104)
  - 本地源片：`build/raw/doc-07-copy.jpg`　·　sha256 前 16 位：`93bf9cd3e4c3266a`

## 2. 程序化纹理（3 张，无第三方素材）

| 文件 | 尺寸 | 随机种子 | 页面用途 | 配方 |
|---|---|---|---|---|
| `paper-lignin.png` | 320×320 | seed 11 | 纸面木素斑点与横向纤维（全透明底，叠在 paper 伪元素上） | 46 条短横线纤维（#6E7A64，alpha 10–30，两端随机 ±1px）+ 90 个木素斑点（#221E19，半径 0–2px，alpha 14–46）+ 14 个脱墨点（白，alpha 10–22），最后 GaussianBlur(0.35)；random.Random(11) |
| `grain-128.png` | 128×128 | seed 23 | 全页颗粒 tile（content 伪元素平铺，正文之上、控件之下） | numpy default_rng(23) 取 0–15 的随机整数，82% 取正、18% 取负并夹到 0–15，作为 #221E19 的 alpha 上限 15/255 ≈ 6% |
| `carbon-bleed.png` | 480×320 | seed 37 | 复写油墨不匀叠印层（首屏三层重影样张上，只加深、不留白） | 1/8 尺度画 70 个随机圆斑（灰 40–255）→ GaussianBlur(3) → BICUBIC 放大回 480×320 → 按离心距离衰减到 55%（中心 0.5/0.42 处最实）→ alpha 上限 92/255，颜色 #1B4A4A；random.Random(37) |


三张纹理全部在 `#DCDDD2` 纸色之上做叠加，不引入第五种颜色：木素层用 `#6E7A64` 与 `#221E19`，颗粒用 `#221E19`（alpha 上限 6%），复写油墨层用主色 `#1B4A4A`。


## 3. 字体（3 族，全部自托管）

| 字体族 | 字重 | 自托管 CSS | 许可 | 分片 | 用处 |
|---|---|---|---|---|---|
| EB Garamond | 400 / 600 | `_fonts/css/eb-garamond__400-600.css` | SIL Open Font License 1.1 | 14 片 / 254.4 KB | 标题（h1 106px 与全部 h2/h3）与拉丁文副题；本册用它替代规格指定的 Redaction |
| LXGW WenKai TC | 400 | `_fonts/css/lxgw-wenkai-tc__400.css` | SIL Open Font License 1.1 | 115 片 / 4527.0 KB | 正文汉字（约占全部字形 91%）：书写纸上的楷体，近打字机网点而不漫画化 |
| Martian Mono | 400 / 600／wdth 75% | `_fonts/css/martian-mono-narrow__wdth75-400-600.css` | SIL Open Font License 1.1 | 8 片 / 51.2 KB | 编号与错误码：章—节—条条号、CARBON-04、三位损坏件编号、份号 SN-0300 |


- 页面 `<head>` 只链这三个本地 CSS，**没有** `fonts.googleapis.com` / `gstatic` 之类的远端引用；字体文件本体在 `prototypes/_fonts/files/`，由 `prototypes/_build/fetch-fonts.mjs` 一次性取回后自托管。
- **Redaction 替代说明**：规格指定的 Redaction（Titus Kaphar & Reginald Dwayne Betts）不通过 Google Fonts 分发，在本次唯一允许的取字路径上返回 HTTP 400，且没有可自托管的许可副本；因此按规格的降级条款改用同为衬线、同为 OFL 的 EB Garamond，字号、字距、行距与版面位置一律不改，标题的度量与折断点因此与规格表一致。
- LXGW WenKai TC 是 TC（繁体）字面：本页是简体正文，共享码位的中文字形因此偏繁体笔形。已逐字核对本页用到的全部汉字都在该子集内（覆盖率 100%，无缺字），但字面风格属于此替代字体本身，不是本册的设计选择。
- Martian Mono 取 `wdth 75` 窄体并按 `font-stretch: 75%` 声明，目的是让「章—节—条」条号在 5.2em 的悬挂列里不换行。


## 4. 重算

```powershell
# 1) 图版：从 build/raw/doc-*.jpg 重新抖动到两阶（会覆写 assets/plate-*.png 与 plates.json）
python build/make-plates.py
# 2) 署名：按当前 plates.json 刷新 assets/credits.json 与本文件
python build/write-credits.py
# 3) 字体：重新自托管三个字体族（写入 prototypes/_fonts/）
node prototypes/_build/fetch-fonts.mjs
node prototypes/S11-samizdat-typewriter/build/fetch-martian-narrow.mjs
```

许可与署名要求：CC BY-SA 的图版在页面内保留了「作者 + 许可 + 来源」三要素（见图注右下的 `.src` 行），纸质手册的转载版本需照同一格式携带署名；CC BY-SA 3.0/4.0 的图版为**同许可共享**，改动后的两阶抖动版本沿用原许可。
