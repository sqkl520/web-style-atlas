# 第 6 轮任务拆解：7 条事实的复算、排序与执行方案

> 规划 Agent · 2026-10-27 · 工作目录 `D:\Web\style` · HEAD `a0c0d54`
> 本轮**只读**：所有探针写在 `deliverables/66-plan/`，未改动 `prototypes/`、`templates/`、`README*`。
> 全部数字都附可复算命令，脚本都在 `deliverables/66-plan/`（`_pNN_*.mjs`）。

**先说结论：7 条事实里，3 条成立（1、3、6）、3 条部分成立（2、4、5）、1 条说错了（7），
另有一条「两句话打架」（1b）也说错了。** 而且本轮我实测出两个任务描述里完全没有的情况：

1. `prompt-copy.js` 此刻正被另一个 Agent 改动；任务书引的两处原文里，**一处已经不在工作树里**
   （「我实际有 N 个」，17:09 被改掉），**另一处在 HEAD 里就从来不是代码**
   （「先把数量凑到 N 个」，只是注释里的历史引文）；
2. **S13 的「17 处 shadow」用今天的 `tools/` 复算不出来，实际是 10**（§7.9）。

---

## 0. 一句话状态（给赶时间的人）

| 事实 | 任务书说法 | 我的复算 | 判定 |
|---|---|---|---|
| 1 `minItems` 被说成用户内容量 | 存在 | HEAD 30/30 存在；**但 17:09 已被并发 Agent 修掉** | ✅ 真（已在修） |
| 1b「两个互相打架的指令」 | 同一段里两句话打架 | **HEAD 代码里没有「先把数量凑到」**，它只是注释里的历史引文；真打架的是「我实际有 N vs 按你真实数量」，**17 案** | ❌ **说错了** |
| 2 模板层不在场景索引 | M0 命中 0 次 | `sceneIndex` 里 M0 = **0 次**（真）；**但模板层已通过 `TEMPLATES` 独立接入**，搜「餐厅」有 M02 卡 | ⚠️ **一半错** |
| 3 `o.mood` 死参数 | 死 | 真死（`mood` 代码行 0 命中）；但它**不是"读了没用"，是读取行早在 `cea8436` 就被整句替换掉了** | ✅ 真（性质不同） |
| — **（新）** S13 的「17 处 shadow」 | 17 处 | **17 = box-shadow 非 none 的元素数（旧判据）；按今天的 `tools/` 只有 10 个含非零外投影**。差的是 7 个 alpha=0 占位 | ⚠️ **数字不可复算** |
| 4 390px 25/30 超标 | 25/30，最差 4668 | **24/30**（上一轮明细也只列了 24 个，结语写 25）；「内容长度不是布局浪费」**只部分成立**（正文 69.4%，布局 24.5%） | ⚠️ 数字与结论都要改 |
| 5 `clamp:2` 括号不配平 | 2 案 vs 9 案口径不明 | **口径差 = 括号字符集**：只算 `（）` = 2 案；含 `「」《》` = 9 案。两个数都对；且**截断是 30/30**，且有省略号 | ⚠️ 两个数都对，但前提被误解 |
| 6 闸门 8 条 FAIL | S13 的 shadow+button-fx 可修 | 真；**且我实测证明了可修**：改 3 个 CSS 变量 → 外投影 13→0，按钮 4→0 | ✅ 真且可证 |
| 7 当前状态 | 26/4/30，工作区干净 | 闸门 26/4/30 真；**工作区不干净**（`M prompt-copy.js`）+ **check-docs 从 0 WARN 变成 1 WARN**；且 24 PASS 是另一个脚本的数 | ❌ **说错了** |

**统计（9 行：7 条事实 + 1b + 1 条新发现）：✅ 成立 3 条（1、3、6）／⚠️ 部分成立 4 条（2、4、5、新）／❌ 说错 2 条（1b、7）。**

---

## 0.5 ⚠️ 我写这份文档期间，工作树又变了两次（必须知道）

我的复算横跨 16:46–18:04，期间**另一个执行 Agent 在持续提交改动**（未 commit，全在工作树）。
到我定稿时：

```
 M README-EN.md                          |   2 +-
 M README.md                             |   2 +-
 M prototypes/_selection/app.js          | 110 ++++++++++
 M prototypes/_selection/prompt-copy.js  | 166 +++++++++++++++++++++----
```

**这些改动让本文档的两条结论当场变化：**

1. **事实 7 彻底过期。** 我写「工作区不干净（`M prompt-copy.js`）」时只有 1 个文件；
   现在是 **4 个**。任何再次引用"工作区干净/只有一处改动"的说法都是错的。
2. **我那两条"部分成立"里，有一条已经被别人当成 P0 修掉了 —— 而且修的是我漏掉的东西。**
   并发 Agent 在 `app.js` 里写明了它实测出的死路：

   > 「44 个 sceneIndex 词逐个跑『先搜该词 → 再点同名芯片』（CDP，1440×900）：
   > · 只搜词 0 行：17 / 44　· 只点芯片 0 行：**0 / 44**
   > · **先搜后点 0 行：18 / 44**（比"只搜 0 行"多一个：摄影 —— 搜出 8 行，点了芯片反而变 0 行）
   > · 先点后搜 0 行：34 / 44」
   > 「而 0 行时界面上那段话仍在教用户『点左侧行业芯片』——**用户照做了，还是 0**。」

   **这是一个我完全没抓到的 P0，而且它比我列的任何一条都更"让用户产出变错"**：
   用户按界面提示操作，得到 0 行，然后以为这个图集没有他要的东西。

**这对本文档的影响：**
- §2 的排序表里，**这一条本该排在 P0**（和 `minItems` 并列，甚至更前 —— `minItems` 只影响
  已选中的人，这条影响还没选中的人）；
- 我没有复算这组数字（不敢在别人正在改的文件上测量），**所以我不把它写成"事实"，
  只记下它的存在与出处**。任何人要用它，请自己在**当前工作树**上重跑一遍
  `deliverables/66-exec/_chip-before.json` 那一支探针。
- §8「如果只能做一件事」的推荐**不变**：因为那条死路已经有人在修，而 S13 没人碰。

---

## 1. 逐条复算

### 事实 1：`minItems` 被当成「我实际有 N 个条目」—— ✅ 真，但**已被并发修掉**

**HEAD 的原文**（`git show HEAD:prototypes/_selection/prompt-copy.js`，第 331–332 行）：

```js
"1. 我实际有 " + count + " 个" + unit + "，就排 " + count + " 个：",
"   不凑整、不留空位、不留占位符、编号连续不跳号。",
```

**30 案的 minItems（复算）**：

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p21_exact.mjs
```

```
minItems 排序 = 6,6,6,6,6,7,7,7,8,8,8,8,9,9,9,10,10,11,12,12,12,13,14,14,16,20,20,23,27,46
n = 30   中位 = 9.5   (第 15/16 位 = 9, 10)
mean = 12.33   max = 46 = S07
```

⚠️ **任务书说「中位 10」，实测中位数是 9.5**（偶数个样本，30 个）。说「中位 10」是把第 16 位
当成了中位数。差 0.5 不影响任何判断，但这是本仓库记在案的老毛病（用近似当实测），记一笔。

**「S07 会说我有 46 个条目」—— 逐字核实：**
`buildStylePrompt('S07')` 的结构约束第 1 条原文就是「我实际有 46 个条目，就排 46 个：」。✅ 真。

**但：这个 bug 在 17:09 已被另一个 Agent 改掉了。** 当前工作树（`M prompt-copy.js`，+107/−15）：

```js
"1. 这个版式设计时排了 " + count + " 个" + unit + "——这是版式的规模，不是你的内容量。",
"2. 用你自己的真实数量排：有几个排几个，不凑整、不留空位、不留占位符、编号连续不跳号。",
```

复算：

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p16_head.mjs
```

```
HEAD 版与工作树不同 = 30 /30
HEAD 长度 min/median/max = 1632 1814 1920
NOW  长度 min/median/max = 1652 1834.5 1946
```

**这是本轮最重要的一条：任务书的 F1 已经过期了。** 如果执行 Agent 再照任务书去改
`buildPrompt`，会和已经落地的修改撞车（同一段代码、同一处编号）。

---

### 事实 1b：「两个互相打架的指令」—— ❌ **任务书这一条说错了**

任务书引的两句是：

> 「1. 我实际有 N 个条目，就排 N 个：不凑整、不留空位…」
> 「3. 请先把数量凑到 N 个再排版」

**第二句在 HEAD 的代码里不存在。** 逐字证据：

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p28_headtext.mjs
```

```
字符数 = 45946
「凑到」出现 = 1
「先把数量凑到」出现 = 1
  line 335 | * 曾经是「2. 数量不够时按实际数量收敛，不要拉高或重复填满」+「3. 请先把数量凑到 N 个再排版」，
字符串字面量行数 = 70
字符串字面量里「凑到」= 0
```

**唯一那一处「凑到」在注释里，而且注释本身在说「这两句曾经打架，已经修了」。**
任务书引的是注释引用的历史原文，不是现状。

**「凑到」是哪个提交删的**（这一条我一开始也判错了，用 `git log -S` 复算后纠正）：

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p29_hist.mjs
```

```
cea8436 | 凑到 代码行=1 | 我实际有=1 | 按你真实=0   ← 加了两句打架的
87a0235 | 凑到 代码行=0 | 我实际有=1 | 按你真实=2   ← 删掉"凑到"，改成 degrades 分岔
```

所以：`cea8436` **引入**了打架（`请先把数量凑到 N 个` 与 `不要拉高` 并存），
`87a0235` **修掉**了它，`eec843f` 是初始引入「我实际有」。任务书把「修掉的东西」当成了现状。

**真实打架的案数（如果按任务书的读法）= 0。** 真正还剩的、同一段里方向不一致的是另一件小事：

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p8_conflict2.mjs
```

```
assertN present = 30 /30
hasReal present = 17 /30
both = 17 /30        ← "我实际有 N" 与 "按你真实的...排" 同时出现
both AND N>=20 = S07:46 S17:27
both AND dg=no = 17  / both AND dg=yes = 0
```

**这才是真打架的地方**：17 个 `degrades=no` 的案子里，第 1 条说「我有 46 个」、第 2 条说
「按你真实的数量」—— 两句都是"数量从哪来"，一个说 46、一个说"你的"。`degrades=yes` 的 13 案
反而不打架（第 2 条讲的是"不足 N 个怎么办"，是补充不是否定）。

**任务书的定性是对的（确实有矛盾），但引的例子和案数是错的**：不是「凑到 vs 不凑整」，
而是「我实际有 N vs 按你真实的数量」，涉及 **17 案**（S07/S17 是最刺眼的两个）。

---

### 事实 2：模板层不在场景索引 —— ⚠️ **一半对，一半是错的**

**对的那一半**：`prompts.js` 的 `sceneIndex` 里 `M0` 确实 0 命中。

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p1_scene.mjs
```

```
sceneIndex keys = 44
M0 hits inside sceneIndex = 0
P keys top-level = sceneIndex, unsupported, hardIds, schemes
餐厅 -> {"direct":[],"near":["S09","S19"]}
```

**错的那一半**：「后果：用户搜餐厅 → 30 个案里 0 直连、只有 2 个近似，而 M02 模板第一行就写着餐厅」。

**模板层已经接进去了**，走的是 `prompt-copy.js:837` 的 `TEMPLATES` 数组 + `renderTemplateLayer()`，
不经过 `sceneIndex`。CDP 实测（`D:\Nodejs\node.exe deliverables\66-plan\_p10_template.mjs`）：

```
=== 搜索「餐厅」 ===
  行数 0 / count「列出 0 / 30 个方案」
  strip hidden=true cards=[]
  empty hidden=false head「这 30 个案里没有「餐厅」专案。但模板层有：M02 暖调门店站 的 README 适用行业里就写着「餐厅」，它才是为这行做的：」 cards=[M02]
```

用户搜「餐厅」**看得到 M02 卡片**，而且引导语明确说「模板层有…它才是为这行做的」。
所以任务书「用户在找模板，界面在给他看方案」这个结论**不成立**——界面确实给了模板。

**但仍然有一个真缺陷**（这一条任务书没抓到，我加进来）：**模板卡在 390 档首屏外。**

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p18_emptytpl.mjs
```

```
=== 1440 viewportH=900 ===   模板卡顶边 = 552 px → ✓ 首屏内
=== 390 viewportH=844  ===   模板卡顶边 = 1316.3 px → ✗ 首屏外，需滚 472px
```

手机上搜「餐厅」，用户要滚 472px 才看到那张 M02 卡。1440 档没问题。**这是真问题，
但它是移动端首屏问题，不是"模板没接进索引"问题。**

**还有一处口径不一致（新发现）**：`unsupported` 里 29 个词，与模板层的关系是：

```bash
D:\Nodejs\node.exe -e "..."（见 §附录 A）
unsupported ∩ 模板 scenes 逐字 = []
unsupported ∩ TPL_ADJACENT key = ["甜品","美甲"]
sceneIndex 键 ∩ 模板 scenes 逐字 = ["餐厅","烘焙","设计工作室","花店","民宿"]
```

也就是说 `unsupported`（那 29 个「这套图集撑不起来」的词）**没有一个**是模板能套的 —— 这点
任务书 F2 说「相当一部分有模板能套」是**猜的，实测 0 个**。但「甜品」「美甲」在
`TPL_ADJACENT` 里有相邻候选，所以搜它们会得到一张 M02 卡 + 免责句。这是**设计正确**的。

---

### 事实 3：`o.mood` 死参数 —— ✅ 真，但**性质与任务书说的不同**

**真死**：`mood` 在代码行里 0 命中（只在注释里出现 3 次）。

```bash
D:\Git\cmd\git.exe grep -n 'mood' HEAD -- prototypes/
# HEAD:prototypes/_selection/prompt-copy.js:85:  ... o.mood 就是这样死了很久
# HEAD:prototypes/_selection/prompt-copy.js:582: ... o.mood 在 buildPrompt 里**从未被读过**
# HEAD:prototypes/_selection/prompt-copy.js:583: ... （全文 grep：mood 命中 0 次...）
```

**但「死」的机制不是「收下参数不读」，而是「读它的那一行被整句替换了」**：

`d4f19ec`（首次引入）写着 `"气质上更像" + (o.mood || "一个安静、有手艺感的地方") + "..."`。
`cea8436` 修气质时，把**整句**换成读 `window.SCHEMES` 的 `tone`，`o.mood` 的读取行随之消失。

**所以「把 mood 接回去」不是修 bug，是加功能**——而且会和 `tone`（30/30 齐全、7 个值）
形成第二份气质真源。任务书 F3 把它列成待修项，我认为**方向错了**（详见 §4「不该做」）。

⚠️ 另外：当前工作树里这个文件已经被并发 Agent 加上了 20 行注释，把 mood 的来龙去脉
（`d4f19ec` → `cea8436`）写清楚了，但**没删键、没复活**。这个处理是对的。

---

### 事实 4：详情面板 390px 档 25/30 超标 —— ⚠️ **24/30，且「不是布局浪费」这个判断要修正**

**数字复核**：

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p5_panel.mjs
```

```
=== 390 ===
  scrollHeight: min 3538 / max 4668 / avg 4208 / >3800 = 24/30
  最差 3 案: S29=4668  S26=4626  S14=4595
=== 1440 ===
  scrollHeight: min 2752 / max 3579 / avg 3266 / >3800 = 0/30
```

**24/30，不是 25/30。** 差的那一案是 S05（3740px），它没超。而且**「25」的来源我追到了**：

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p34_prevround.mjs
```

```
上一轮自己列出的案数 = 24
S03=3900 S08=4025 S09=3900 ... S30=4579
但它同一段写的是「移动端 25/30 未过」→ 自相矛盾 = 是（列了 24 个却说 25）

我的实测 >3800 = 24 案（逐案数值与前一轮完全一致，0 处差异）
两个集合相同? true
```

`deliverables/65-exec/EXEC-panel-discoverability.md:210` 的 `[mobile]` 那一行**逐案列了 24 个
案号**，紧接着第 178 与 365 行写「25 案」。**同一份文档里，明细是 24、结语是 25。**
我重测的 30 个数值与它逐案**完全相同**（连 `S03=3900` 这种都一字不差），所以差的是
**计数，不是测量**。

这个阈值对时机也不敏感：

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p23_variance.mjs
# a) 立刻量 24/30   b) 字体 ready 24/30   c) 再等 1s 24/30 —— 逐案完全一致
D:\Nodejs\node.exe deliverables\66-plan\_p31_mobileflag.mjs
# mobile=true 24/30   mobile=false 24/30 —— 与视口模拟参数无关
```

顺带：**3800 这个阈值本身没有任何出处。** 全库 grep `3800`，它第一次作为验收判据出现在
`deliverables/65-exec/EXEC-panel-discoverability.md:136`（上一轮执行 Agent 自己定的），
不在 README、不在任何检查器里，也没有给出推导过程。

**「字段本体占 81–84%，是内容长度不是布局浪费」—— 这个判断只对了一半。**

我的第一次拆分（`_p6_waste.mjs` / `_p6b_decomp.mjs`）也得出"文本 ~84%"，**但那个拆分是错的**：
它把 `.field` 的 `padding: 12px 0` 和 `border-bottom: 1px` 算进了文本侧的残差里。重算（`_p17_overhead.mjs`）：

```
=== 390 === scrollH 合计 126251 (avg 4208)，字段数 330
  正文 行×行高            87636  69.4%   ← 这才是「内容长度」
  dt 标签高度              6945   5.5%   每字段 21.0px
  dt margin-bottom         1320   1.0%   每字段 4.0px
  .field padding           7920   6.3%   每字段 24.0px
  .field border             330   0.3%
  非字段 chrome           14398  11.4%
  ─────────────────────────────────────
  布局开销合计            30914  24.5%
```

**正文只占 69.4%，不是 81–84%。布局开销 24.5%（30,914px），其中「每字段一个 dt 标签 + 4px 间距
+ 24px padding」这三项加起来是 16,185px = 12.8% —— 这是纯布局，与内容长度无关。**

而且这个开销**可以无损压掉**。实测（`_p20_fold.mjs`，模拟折 2 个最长字段）：

```
base    min 3538 max 4668 avg 4208 >3800 24/30
折 1个  min 3169 max 4128 avg 3729 >3800 17/30
折 2个  min 2827 max 3656 avg 3317 >3800  0/30   ← 只折 2 个字段就全进线
每字段 3 行上限 min 2318 max 2408 avg 2364 >3800  0/30
```

再用**真实 CSS** 验证（`_p24_realclamp.mjs`，给 `dd` 加 `-webkit-line-clamp:4`，不是模拟）：

```
base    min 3538 max 4668 avg 4208 >3800: 24/30
clamp4  min 2325 max 2414 avg 2371 >3800: 0/30
```

**结论：上一轮"继续压缩只能删内容"的判断是错的。** 不删一个字，把最长的那 2 个字段折起来
（或每个字段最多 4 行 + 「展开」），24/30 立刻变 0/30，平均高度 4208 → 2371（−44%）。
代价是那 2 个字段要看全文得多点一下。

**但注意：这不是"布局浪费"的错，是"设计选择"的问题。** 详情面板的定位是「把 13 个字段全摊开
给要施工的人读」，全展开本身是刻意的。所以我把它排在**中优先级**（见 §2），不是 P0。

**顺带证伪一个直觉**：我试过把 `dt` 挪到左列做成两栏（`_p19_layout.mjs`），结果**更糟**：

```
base  avg 4208  >3800: 24/30
v1    avg 5169  >3800: 30/30   ← dt 左列 96px，正文列只剩 294px，行数暴涨
v3    avg 4797  >3800: 30/30
```

390 宽下把 96px 让给标签，正文每行少 3 个字，总行数反而增加。**别再试两栏。**

---

### 事实 5：`clamp:2` 括号不配平，2 案 vs 9 案 —— ✅ **口径差查清了**

两个数字都对，差别只在**算哪些括号**：

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p15_kouji.mjs
```

```
=== 1440 ===  截断发生 = 30/30
  口径A 只看圆括号 （）       → 2 案  S10 S18
  口径B 含 「」《》【】〔〕   → 9 案  S10 S12 S14 S15 S16 S17 S18 S19 S20
  原数据全文括号本身不配平    → 0 案

=== 390 ===   截断发生 = 30/30
  口径A 只看圆括号 （）       → 2 案  S05 S27
  口径B 含 「」《》【】〔〕   → 4 案  S05 S07 S24 S27
  原数据全文括号本身不配平    → 0 案
```

**任务书说的「1440 档 2 案（S10/S18）」= 口径 A；「独立验证 Agent 报 9 案」= 口径 B。**
两个都是实测，S10/S18 是两者的交集。**原数据没有任何一案括号本身不配平（0 案）**，
所以这纯粹是"截断切在括号中间"的显示问题。

**这个缺陷的真实严重度比看起来低**：`-webkit-line-clamp` 会补省略号。**我截了图，肉眼可查**
（`_p33_shot3.mjs` → `_out/shots/fam2-S12.jpg`，2× 放大）：S12 行卡第二行末尾是

> `偷的机制是「层压板把图案压进塑料里，…`

**有一个真的 `…`。** 所以用户看到的是「话没说完」，不是「字被切掉了」。`text-overflow` 是
`clip`、`overflow` 是 `hidden`、`-webkit-line-clamp` 是 `2` —— 即使这样，Chromium 仍然画省略号。

**结论：「括号不配平」是有省略号的软截断的一个子情形，不是独立缺陷。**
真正的缺陷只有一种：没有省略号的硬切。这里不存在。

⚠️ 但截图也暴露了另一件事：**被切掉的是 `「` 引号那句，而且是切在句中的逗号后面**
（`…压进塑料里，…`）。读起来像"作者没写完"，而不是"这里省略了"。如果要在**不增大高度**的
前提下改善，正确做法是在 `family` 数据源头加一句能在两行内说完的摘要，而不是放宽 clamp。

⚠️ 另外：**「1440 档只有 2 案被截」这个说法不成立 —— 30/30 全被截**（30 案 family 全文
133–282 字，两行只装得下 111–176 字）。任务书 F5 说「视觉截断后有 2 案括号不配平」是对的，
但如果有人理解成"只有 2 案被截"，那就错了。

---

### 事实 6：闸门 8 条 FAIL 的构成 —— ✅ 真，**且我实测证明了 S13 可修**

**构成本身**（`_p7_gate.mjs`）：

```
S07 FAIL=1 ["mono"]                     WARN=3
S08 FAIL=2 ["palette-terracotta","font-count"]  WARN=2
S13 FAIL=4 ["mono","shadow","button-fx","empty-screens"]  WARN=5
S21 FAIL=1 ["mono"]                     WARN=2
FAIL 合计 = 8      FAIL=0 的案数 = 26      WARN>0 的案数 = 30
```

**「17 处 shadow」与「15 条 box-shadow 声明」是两个量，别混：**

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p22_s13shadow.mjs
```

```
S13 计算样式里 box-shadow 非 none 的元素 = 20
  阴影段总数 = 36；纯 inset 段 = 16；外投影段 = 20
  含外投影的元素 = 20  ← 闸门按"元素"计数，报的是 17（有 3 个被算进 overlay/不可见）
  带阴影的按钮 = 4
```

`style.css` 里是 **15 条 `box-shadow` 声明**（其中 2 条是 `none`），带 `taste-skill-ignore`
注释的有 **15 条**，文件里 `taste-skill-ignore` 共出现 **17 次**。

⚠️ **`taste-skill-ignore` 这个注释对闸门无效。** 它只被源码 linter 读：

```bash
Select-String -Path tools/.../lint.mjs -Pattern 'ignore'
# lint.mjs:73:  if (/taste-skill-ignore/.test(line)) return;
```

`prototypes/_build/shot.mjs` 与 `tools/.../probe.mjs`（真正产生 `report.json` 的那个）**都不读它**。
所以 S13 里那 15 条「这不是默认卡片投影」的辩解，闸门一个字都不看。**这是"写了注释以为能豁免"
的典型案例，值得写进文档。**

**「可修」—— 我用实验证明，不是判断**（`_p25_s13fix.mjs` / `_p26_s13btn.mjs`）：

```
=== base ===           带外投影的元素 13，带阴影按钮 4
=== fixPureOuter ===   带外投影的元素  9，带阴影按钮 1     ← 只改 3 个变量
=== fixAllInset ===    带外投影的元素  0，带阴影按钮 4     ← 全部改成 inset
=== B_btnsNoShadow === 外投影 0，带 box-shadow 的按钮 0    ← button-fx 也清了
=== C_btnsDropShadow === 外投影 0，按钮 box-shadow 0 但 4 个带 filter: drop-shadow
```

**`shadow` 与 `button-fx` 两条都能清，代价是 3 个 CSS 变量 + 4 条按钮规则。**
其中 `C_btnsDropShadow` 用的是 CONTRACT §9.3 明写认可的 `filter: drop-shadow()`——压痕感保留，
闸门不报（因为 `probe.mjs` 只查 `boxShadow`，`§9.3` 的原话就是"它不算 shadow"）。

**所以任务书转述红队的判断（"这两条其实可修"）是对的，而且我现在有可执行的修法。**

---

### 事实 7：当前状态 —— ❌ **工作区不干净，check-docs 已从 0 WARN 变 1 WARN**

任务书说「工作区干净」。实测：

```bash
D:\Git\cmd\git.exe status --porcelain | Where-Object { $_ -match '^ M' }
#  M prototypes/_selection/prompt-copy.js      ← 另一个 Agent 正在改（+107/−15）
```

`?? ` 有 420 项，全部在 `deliverables/`（`.gitignore` 没覆盖 `deliverables/`，但历史上一直
是"草稿不入库"）。**唯一的 tracked 改动是 `prompt-copy.js`。**

**连带后果：`check-docs` 不再是 0 WARN。**

```bash
D:\Nodejs\node.exe prototypes\_build\check-docs.mjs
# ⚠ nums/prompt-len  提示词长度小幅漂移…区间下限 写 1632，实测 1652；上限 写 1920，实测 1946；
#                     中位 写 1822，实测 1842
# README.md: 0 FAIL / 1 WARN / 12 PASS     exit 0
```

原因：改文案让 30 份提示词各长了 20–26 字，README 的 `1632–1920 / 中位 1822` 现在是
`1652–1946 / 中位 1842`。漂移 1.2–1.4%，落在 `DRIFT=0.03` 容差内 → WARN 而非 FAIL，**exit 码仍是 0**。
但**任务书说的「0 WARN」已经不成立了**，而 README-EN 的第 80 行也有同一个数字（`1,632–1,920
characters … median 1,822`），check-docs 的 `i18n/facts` 会跟着一起动。

**这条必须在收尾前处理**：改 README 的两个数字（zh + en 各一处），否则任何人跑 check-docs 都会
看到 1 WARN，而 README 里那两句话是**给用户看的承诺**（"按下去得到一份 1632–1920 字"）。

⚠️ **还有一条**：任务书说「README 0 FAIL / 0 WARN / **24 PASS**」，但 `check-docs.mjs` 跑出来是
**12 PASS**，24 PASS 是另一个脚本（`_readme-skill-fetch/.../check-readme.mjs`，24 项 README
体例检查）的结果。两个脚本、两套 PASS 计数，任务书把它们的数字并列了。我两个都跑了：

```
check-readme.mjs README.md  → 0 FAIL / 0 WARN / 24 PASS   exit 0
check-docs.mjs  README.md   → 0 FAIL / 1 WARN / 12 PASS   exit 0
```

---

## 2. 排序：按「用户可感知 × 风险」

判据是一条真实路径：**打开选型台 → 筛/搜 → 点开一个方案 → 复制提示词 → 粘给 AI → 拿到网站**。
每一步问「这 7 条里哪一条会让他的产出变错」。

| # | 条目 | 用户在哪一步受伤 | 产出会变错吗 | 判定 |
|---|---|---|---|---|
| **P0** | 🆕 芯片 × 搜索框取交集（18/44 先搜后点变 0 行） | 还没选中方案时 | **会**：界面教他点芯片，点了 0 行，他以为没有 | 真缺陷，**并发 Agent 已在修**（§0.5） |
| **P0** | 1 `minItems` 说成用户内容量 | 复制提示词那一刻 | **会**。S07 说「我有 46 个条目」，AI 排 46 条用户没有的内容 | 真缺陷，已在修 |
| **P1** | 7b `prompt-len` WARN / README 数字过期 | 读 README 的"1632–1920 字" | 不会（数字偏 1.2%） | 真但轻，**必修**因为它是承诺句 |
| **P1** | 6 S13 `shadow`+`button-fx` | 打开 S13 原型 | 不会（用户看不到闸门） | 真缺陷，**且可修** |
| **P2** | 4 390 详情面板 24/30 超长 | 手机上读详情 | 不会（内容是对的，只是长） | **不完美**，不是错 |
| **P2** | 2b 模板卡在 390 首屏外 | 手机搜"餐厅" | 不会（滚 472px 能看到） | 不完美 |
| **P3** | 5 `clamp:2` 截断 | 扫行卡 | 不会（有省略号，详情里有全文） | **设计选择** |
| **P3** | 3 `o.mood` 死键 | 无 | 不会（无人传值，也不该有人传） | 设计遗留，**不该碰** |
| **P4** | 2a 模板不在 sceneIndex | 无 | 不会（已通过 TEMPLATES 接入） | **描述有误，不存在** |

**排序逻辑（三条判据按优先级）：**

1. **"让产出变错" > "让产出变慢" > "让界面不完美"。**
   P0 那两条都会让用户拿到错的东西：一条让人误以为没有方案（18/44 死路），
   一条让 AI 按虚构的 46 条内容排版。P1 的 S13 是原型自己的缺陷，用户看不见闸门，
   但它会被当成"这个图集质量就这样"。

2. **"已经有人在做" > "还没人做"。**
   P0 两条都已经在改（工作树 +110 / +166 行）。**本轮真正该做的是 P1——S13 那两条 FAIL，
   它有可执行的修法且没人碰。** 这是"如果只能做一件事"的答案（见 §8）。

3. **"看起来是 bug 其实是设计"要单独拎出来，不能混进 bug 列表。**
   `clamp:2`（P3）、`mood`（P3）、`unsupported` 里的甜品/美甲（相邻候选，带免责句）都属于这类。

---

## 3. 子任务拆解（可并行）

写作用域严格互斥。**T0 与 T1 都已经有并发 Agent 在做，不要重复做。**

### T0（P0，未被列入任务书，已被并发 Agent 修）芯片 × 搜索框的交集死路

- **状态**：`app.js` 工作树里已有 +110 行（`parkQuery` / `restoreQuery` / `dropParked` / `syncParked`）。
- **写作用域**：`prototypes/_selection/app.js`（`state.qParked` 与四个函数）+ `prompt-copy.js` 的芯片 click handler。
- **为什么它是 P0**：并发 Agent 的实测（`deliverables/66-exec/_chip-before.json`，CDP 1440×900，
  44 个词逐个跑）——「**先搜后点 0 行：18 / 44**」，且 0 行时界面**还在教用户点芯片**。
  用户照做，得到 0 行。这条比 `minItems` 更靠前：**它拦住的是还没选中方案的人。**
- **建议 Agent 数**：0（已有人在写）。**但必须有人独立复核**：1 个只读 Agent。
- **复核验收（脚本可判）**：
  ```bash
  # 44 个 sceneIndex 词 × 4 种操作，统计 0 行数
  #   A 只搜词      期望 ≤ 17（改动前是 17）
  #   B 只点芯片    期望 0
  #   C 先搜后点    期望 0   ← 改动前是 18
  #   D 先点后搜    期望 ≤ 34 且不允许比改动前更多
  ```
  具体探针见 `deliverables/66-exec/`（并发 Agent 的产物），我**没有**在自己的工作目录重跑
  这组数字（不敢在别人正在写的文件上测量），所以本文档不把 18/44 当"我核实过的事实"，
  只当"别人报告、待独立复核"。
- **依赖**：与 T1 同文件但不同函数（T1 在 `prompt-copy.js` 的 `buildPrompt`，T0 在
  `app.js` + 芯片段），可以并行；但**验收要一起做**，因为两者都会改搜索/复制的行为。

### T1（P0，已被并发 Agent 完成）`minItems` 语义

- **状态**：工作树里已完成（`M prompt-copy.js`，`结构约束` 从 2 条拆成 3 条）。
- **写作用域**：`prototypes/_selection/prompt-copy.js` 的 `buildPrompt()` 内「结构约束」段。
- **验收**：`node deliverables/66-plan/_p16_head.mjs` 显示 30/30 与 HEAD 不同，且
  `assertN`（`我实际有 N` 模式）命中 0/30。
- **建议 Agent 数**：0（已完成）。
- **依赖**：无。

### ⚠️ 给所有执行 Agent 的提醒

我引用的**行号、提示词长度、结构约束条数**都会随并发改动继续漂移（我定稿时 `prompt-copy.js`
已经从 +107 行变成 +166 行）。**以你自己 `git show HEAD:…` / 当前工作树的实测为准，
不要以本文档的行号为准。**

### T2（P1）S13 `shadow` + `button-fx` 清零

- **写作用域**：`prototypes/S13-blind-debossed-dispatch/style.css`（唯一文件）。
  **不动** `index.html`，不动 `prototypes/_build/*`，不动 `tools/`。
- **具体改法（已实测有效）**：
  1. `--press-2` / `--press-4` / `--press-2-hover` 三个纯外投影变量改成 `inset` 形式；
  2. `--press-1` / `--press-3` / `--press-1-rev` 里那个非 inset 的第二段改成 `inset`
     （`_p25_s13fix.mjs` 的 `fixAllInset` 已使外投影元素 13 → 0）；
  3. 4 条 `button.btn` 的 `box-shadow` 改成 `none` + `filter: drop-shadow(1.5px 1.5px 0 var(--shade))`
     （CONTRACT §9.3 明写认可；`_p26_s13btn.mjs` 的 `C_btnsDropShadow` 实测：box-shadow 按钮 4 → 0，
     drop-shadow 4，外投影元素 0）。
- **验收（脚本可判）**：
  ```bash
  # 1) ⚠️ 不要断言「17 → 0」：17 那个数用今天的 tools/ 复算不出来（实际是 10，
  #    见 §7.9）。正确断言是"用现行判据，外投影元素数 = 0"。
  node deliverables/66-plan/_p25_s13fix.mjs
  #    期望 base 与 fixAllInset 两行数字一致，且"带外投影的元素 = 0"
  node deliverables/66-plan/_p26_s13btn.mjs
  #    期望"带 box-shadow 的按钮 = 0"，且"带 drop-shadow" ≥ 4（视觉没丢）
  # 2) 闸门（需要仓库外 tools/；clone 者可能跑不了，README 已写明）
  node prototypes/_build/render-scheme.mjs S13-blind-debossed-dispatch
  #    期望 findings 里 shadow / button-fx 消失，FAIL 从 4 条降到 2 条（mono + empty-screens 留）
  # 3) 不允许回归：check-stale 必须 exit 0（改了 css 就要重渲染）
  node prototypes/_build/check-stale.mjs
  ```
- **建议 Agent 数**：1（单个文件、单案、有实测配方）。
- **依赖**：无。可与 T3/T4 并行。
- **⚠️ 风险**：改了 `style.css` 必须重渲染 S13，否则 `check-stale` 报"源文件比 report.json 新"。
  重渲染需要仓库外 `tools/`（`render-scheme.mjs` 依赖它，README 已写明 exit-4 提示）。

### T3（P1）README 提示词长度数字同步（zh + en）

- **写作用域**：`README.md` 第 80 行、`README-EN.md` 第 80 行（**只改这两行的数字**）。
- **具体**：`1632–1920` → 实测值，`中位 1822` → 实测中位数；EN 同理（`1,632–1,920` / `1,822`）。
- **验收**：
  ```bash
  node prototypes/_build/check-docs.mjs | findstr prompt-len
  #    期望 PASS（不是 WARN），且 README.md: 0 FAIL / 0 WARN
  node _readme-skill-fetch/write-attractive-readme-main/scripts/check-readme.mjs README.md
  #    期望仍然 24 PASS（不能因为改数字掉项）
  ```
- **建议 Agent 数**：1。
- **依赖**：**必须在 T1 定稿之后**（T1 的文案还在变，长度会跟着变；先改 README 会再过期一次）。
- **⚠️ 风险**：改 README 会触发 `check-docs` 的 `i18n/facts`（zh/en 必须同值）。

### T4（P2）390 详情面板：折 2 个最长字段

- **写作用域**：`prototypes/_selection/app.js`（`renderDetail()` 的 `field()` 调用处）
  + `prototypes/_selection/style.css`（`.field` 相关的 clamp/summary 样式）。**两处都必须改，
  但改的是不同文件，不与别的任务冲突。**
- **具体改法（实测配方）**：把 `关键视觉元素` 与 `可落地要点` 两个最长字段换成
  `<details>` 折叠（summary 保留字段名 + 首 40 字），其余 9 个字段不动。
  `_p20_fold.mjs` 实测：折 2 个 → max 3656，>3800 = 0/30。
- **验收**：
  ```bash
  node deliverables/66-plan/_p5_panel.mjs
  #    期望 "=== 390 ===  scrollHeight: ... / >3800 = 0/30"
  #    且 "=== 1440 ===" 的最差案不许变差（现在 3579，允许 ±3%）
  ```
- **建议 Agent 数**：2（一个改 app.js 的 DOM，一个改 style.css 并跑 30 案两档回归）。
  或者 1 个，因为两个文件改动都很小。
- **依赖**：与 T1 无依赖（不同文件、不同函数），但**与任何改 `app.js` 的任务互斥**。
- **⚠️ 风险**：`app.js` 是这轮别的东西（详情首屏）刚改过的热点文件。改前先 `git diff` 确认
  没有别的 Agent 在动它。

### T5（P3，建议不做）`clamp:2` 改成 `clamp:3`

- 见 §4。**建议不做。**
- 如果非做：写作用域 `prototypes/_selection/style.css:295-304`（`.row-family` 一条规则），
  验收 = `_p9_clamp.mjs` 的"发生截断"从 30/30 下降、且 390 档总行高涨幅 ≤ 6%。

### T6（P3，建议不做）`o.mood` 删除或复活

- 见 §4。**建议不做。**

### 依赖图

```
T1（已完成，等定稿）
   └── T3（README 数字）        ← 必须等 T1 定稿

T2（S13 css）  ─┐
T4（390 折叠） ─┴─ 互相独立，可并行
```

---

## 4. 这一轮**不该做**的

### 4.1 ❌ 不要再改 `minItems` 那一段提示词（T1 已做）

这是它**第 3 次**被改（`eec843f` 加 → `cea8436` 加矛盾 → `87a0235` 修矛盾 → 本轮第 3 次改语义）。
任务书自己引的注释里就写着「第三次修」。再加一句会变成第 4 次。
**如果对并发 Agent 的改法有意见，应该在 review 里提，而不是再叠一层自己改。**

### 4.2 ❌ 不要复活 `o.mood`

三个理由：
1. **它没有入口**。`buildPrompt` 的 `opts` 只有 2 个界面消费者（`biz` / `action`）。复活 mood
   意味着要么加第三个输入框（`prompt-copy.js:580` 的注释明确论证过"三个输入框里必然有一个
   传下去是死的，宁可两个都真"），要么留一个永远没人传的键——那正是要修的病。
2. **会和 `tone` 打架**。`tone` 30/30 齐全（7 个值），是 `data.js` 的权威字段。加 mood 覆盖
   = 第二份气质真源，而这个仓库为"两份副本静默分叉"付过代价（`prompt-copy.js:819` 的注释）。
3. **删键也是加功能**。它是 `window.buildStylePrompt` 公开签名的一部分；删掉会让任何按老签名
   传 `{mood}` 的调用方从"静默忽略"变成"传了没反应但也不报错"——没有变好。

**正确做法**：就留在注释里（并发 Agent 已经写清了来龙去脉）。**这是设计遗留，不是 bug。**

### 4.3 ❌ 不要把 `clamp:2` 改成 `3`

「括号不配平」听起来像 bug，但它**有省略号**（我截图逐字确认，见 §1 事实 5 与
`_out/shots/fam2-S12.jpg`：S12 第二行末尾是 `…压进塑料里，…`，有一个真的 `…`），
而且 `style.css:288-291` 的注释里有实测依据：「1440 档行卡有 75px 余量，3 行也放得下、
不涨高，**但 390 档会从 +21~48px 涨到 +42~90px（30 行总高 +11.8%）**」。

**这是一个已经权衡过的设计选择，而且权衡记录在案。** 改成 3 行会让手机档清单再长 11.8%，
而收益是"少切 30 个字"。

如果真觉得截断难受，**正确的方向是缩短数据源的 `family` 字段**（现在 133–282 字，
是"家族名 + 两句参考对象 + 偷什么机制"的合体），而不是放宽显示。
⚠️ 而且截图显示现在的切点落在「，」后面 —— 读起来像"作者没写完"而不是"这里省略了"。
这个观感问题只能靠"在源头写一句两行内能说完的摘要"解决，不是 CSS 能修的。

### 4.4 ❌ 不要动 `verify-prototype.mjs` 或 `probe.mjs`

任务书的提示是对的：`verify-prototype.mjs` 只扫 `prototypes/S\d{2}-/`（`--all` 那行是
`readdirSync(PROTO).filter(d => /^S\d{2}-/.test(d.name))`），**不读 `_selection/`**。
所以任何 `_selection/` 的改动都不会让它变红。反过来说：

**改 `probe.mjs` 会静默改变 30 案里已经记在案的 WARN 集合。** `report.json` 里 `font-count`
在 29 案是 WARN、在 S08 是 FAIL（因为 S08 有 4 族、其余 3 族），这是阈值行为不是 bug。
改探针 = 让全部 30 份报告同时过期，需要重渲染 30 案 ×3 视口。

### 4.5 ❌ 不要给 S13 的 15 条 `box-shadow` 加豁免记录（走"批准"那条路）

CONTRACT §9.15 给了两条出路：**迁移到 `drop-shadow`**，或**逐案批准记录**。
后者要写 `deliverables/<Sxx>-adjudication.md` 并含三个值（report 的 `at`、两文件 mtime 与 sha256），
而 `deliverables/tool-runs/` 被 `.gitignore` 排除、clone 者看不到（CONTRACT 自己标了⚠️）。
**走这条路 = 写一份别人看不见的豁免。** 而 `_p26` 已经证明迁移到 `drop-shadow` 一行 CSS 就够。

### 4.6 ❌ 不要用「_regen 生成链」来修这些问题

`collect-schemes.mjs` 与 `build-prompts.mjs` **都不在本轮任何一条修法的路径上**：

- T1 改的是 `prompt-copy.js`（手写文件，不是生成物）；
- T2 改的是 S13 的 `style.css`（原型，不是 `_selection/`）；
- T3 改的是 `README`（文档）。

**重跑生成链不会修任何一条**，但会重写 `data.js`（307KB）和 `prompts.js`（60KB），
把并发 Agent 的改动一起卷进去。**这是本轮最大的风险源，见 §5。**

---

## 5. 风险与回滚

### 5.1 会破坏闸门的改动

| 改动 | 会不会破闸门 | 为什么 |
|---|---|---|
| `_selection/*`（app.js / style.css / prompt-copy.js） | **不会** | `verify-prototype.mjs` 的 `--all` 只扫 `/^S\d{2}-/`，`_selection` 不在其中 |
| `prototypes/S13/style.css` | **会（并且是目标）** | 它就是闸门的对象；改完必须重渲染，否则 `check-stale` 报陈旧 |
| `prototypes/_build/*` | **会（灾难性）** | 改 `shot.mjs`/`probe.mjs` 会让 30 份 `report.json` 全部失真 |
| `README*` | 不会 | 但会动 `check-docs` 的 `nums/prompt-len` 与 `i18n/facts` |

**`check-stale` 是那个会咬人的**：它比 `index.html` / `style.css` 的 mtime 与 `report.json.at`。
改 S13 的 css 而不重渲染 → 立刻红。

### 5.2 需不需要重跑生成链

**本轮所有建议的修法都不需要。** 但要知道跑了的后果：

| 脚本 | 输入 | 输出 | 重跑后谁变 |
|---|---|---|---|
| `collect-schemes.mjs` | `_specs/Sxx.md` + 各案 `.inspect/report.json` + `_CURRENT-VALUES.md` | `_selection/data.js` | **整个 data.js 覆写**（307KB）。会覆盖任何手改，并可能把 `gate.failIds` 刷成新值 |
| `build-prompts.mjs` | `dna-clean.json` + `data.js` + `minitems-parsed.json` + 生成器内的 `HUMAN`/`SCENE_INDEX` | `_selection/prompts.js` | **整个 prompts.js 覆写**（60KB）。`sceneIndex` 与 `HUMAN` 在生成器里，改 prompts.js 会被抹掉 |
| `clean-dna.mjs` | 各案 `style.css` | `dna-clean.json` | 会重算 30 案色板/字体；`prompts.js` 的 `dna` 随之变 |

⚠️ **`prompt-copy.js` 不在生成链上**（它是手写的，`build-prompts.mjs:358` 只写 `prompts.js`）。
这一点很重要：**T1 的改动是安全的，不会被生成器覆盖。**

### 5.3 每个子任务的回滚点

| 任务 | 回滚点 | 回滚命令 |
|---|---|---|
| T1 | `HEAD`（`a0c0d54`）的 `prompt-copy.js` | `git checkout HEAD -- prototypes/_selection/prompt-copy.js` ⚠️ **会丢掉并发 Agent 的改动，先问** |
| T2 | S13 `style.css` 改动前 | `git diff prototypes/S13-blind-debossed-dispatch/style.css > /tmp/s13.patch` 先存；回滚 `git checkout -- <file>` + 重渲染 |
| T3 | README 两行 | `git checkout -- README.md README-EN.md` |
| T4 | `app.js` + `style.css` | 同上，先 `git diff > patch` |

**T1 的回滚点是个陷阱**：工作树里的 `prompt-copy.js` 是**别人未提交的成果**。
`git checkout` 会抹掉它。**本轮任何 Agent 都不该对这个文件做 `git checkout` / `git restore`。**

### 5.4 三条跨任务风险

1. **并发写同一文件。** 我开工时 `prompt-copy.js` 被另一个 Agent 改了 2 次（16:50 → 17:09）。
   我自己的 `_p4` 与 `_p12` 因此得出了不同的长度数字（1632 vs 1652）——**我一开始以为是
   我的测量错了，重跑了 3 次才发现是文件在脚下变**。执行 Agent 必须每步先
   `git status --porcelain prototypes/` 确认自己的写作用域没被别人动过。

2. **`tools/` 是仓库外的（`.gitignore` 第 2 行 `tools/`）。** `render-scheme.mjs` 依赖它。
   clone 者跑不了闸门。T2 的验收如果依赖 `render-scheme.mjs`，就必须同时给一个
   **不依赖 `tools/` 的替代断言**（我给的 `_p25_s13fix.mjs` 就是干这个的）。

3. **`deliverables/` 全部未跟踪（420 项）。** 任何"交付物"都不会进 git。
   如果这一轮的结论要留痕，得手动 `git add`——但任务书没要求，我不越界。

---

## 6. 我核实后认为任务描述**说错了**的地方

1. **「事实 1 的两个互相打架的指令」—— 引的是注释里的历史引文，不是现状。**
   HEAD 里「先把数量凑到 N 个」的代码命中 = **0**（`_p28_headtext.mjs`）。
   真实打架的是「我实际有 N vs 按你真实的数量」，**17 案**（`_p8_conflict2.mjs`），
   并且**只发生在 `degrades=no` 的案子上**（`degrades=yes` 的 13 案不打架）。

2. **「事实 2 的后果：用户在找模板，界面在给他看方案」—— 不成立。**
   模板层早在 `87a0235` 就通过 `TEMPLATES` 接进反查了。搜「餐厅」给的是
   「这 30 个案里没有「餐厅」专案。但模板层有：M02…它才是为这行做的」+ M02 卡片。
   （`_p10_template.mjs`）模板**不在 `sceneIndex`**（M0 = 0 命中，这点任务书对），
   但**在 UI 里**。真的问题变成了：390 档那张卡在首屏外 472px（新发现，见 §3 T-none）。

3. **「事实 4 的 25/30」—— 实测 24/30。** 差的那案是 S05（3740px）。
   **而且「25」是上一轮自己的笔误**：`deliverables/65-exec/EXEC-panel-discoverability.md:210`
   逐案列了 **24** 个案号，第 178/365 行却写「25 案」。我重测的 30 个数值与那份文档
   **逐案完全相同**，差的是计数不是测量。另外「3800」这个阈值**全库没有出处**，
   第一次作为判据出现在同一份文档的 :136，是上一轮自己定的。

4. **「字段本体占 81–84%，是内容长度不是布局浪费」—— 实际正文只占 69.4%。**
   81–84% 是「字段高度占 scrollHeight」（那个数是对的：83.5%），
   **但字段高度里只有 69.4/83.5 = 83% 是正文行**，其余是 dt 标签 + padding + border，
   合计 24.5% 的 scrollHeight 是布局开销。压掉它不需要删一个字（`_p24_realclamp.mjs`：4208 → 2371）。

5. **「事实 5 的 1440 档有 2 案视觉截断后括号不配平」—— 措辞会误导。**
   被截断的是 **30/30**，其中"括号不配平"按圆括号算是 2 案、按全角括号算是 9 案。
   而且 `-webkit-line-clamp` **会画省略号**（我截图逐字确认：S12 末尾是真的 `…`），
   "不配平"只是软截断的子情形。**任务书说"视觉截断后括号不配平"，但真实情况是
   "每一案都被视觉截断了，其中 2/9 案的切点恰好落在括号里"。**

6. **「事实 7 工作区干净 / README 0 FAIL 0 WARN」—— 都不成立。**
   工作区有 `M prompt-copy.js`；`check-docs` 是 **0 FAIL / 1 WARN / 12 PASS**（不是 24 PASS；
   24 PASS 是另一个脚本 `check-readme.mjs` 的数，两个脚本被并列了）。

7. **「30 案的 minItems 中位 10」—— 实测中位 9.5**（30 个样本，第 15/16 位是 9 和 10）。

8. **「`o.mood` 是死参数，上一轮修了 biz/what/action，mood 仍是死的」这个叙事 —— 缺了关键一环。**
   它不是"被漏掉"，是 `cea8436` 修气质时**整句替换**掉的（`d4f19ec` 的读取行随之消失）。
   这个区别决定了修法：**"接回去"是加功能，不是补 bug。**

---

## 7. 我抓到的、任务描述里没提到的问题

### 7.1 ⚠️【P1】S13 的 15 条 `taste-skill-ignore` 注释对闸门**完全无效**

`style.css` 里 15 条 `box-shadow` 声明后面都跟着 `/* taste-skill-ignore: 二级凸起…非默认卡片投影 */`
这样的辩解。但读这个注释的只有源码 linter：

```bash
Select-String -Path tools/taste-skill/skills/taste-skill/scripts/lint.mjs -Pattern 'ignore'
# lint.mjs:73:    if (/taste-skill-ignore/.test(line)) return;
```

**产生 `report.json` 的 `probe.mjs` 与 `shot.mjs` 都不读它。** 所以 S13 的作者写了 15 条理由，
闸门一条都不看，照报 17 处。**这是"以为注释能豁免"的典型**，建议写进 CONTRACT 的注意事项：
`taste-skill-ignore` 只对 `lint.mjs`（源码级）有效，对渲染级闸门无效。
（本轮不要改这个机制——改它会改变全部 30 案的 WARN 集合，见 §4.4。）

### 7.2 ⚠️【P2】`source linter` 与 `render gate` 对同一份 S13 给出**不同的 FAIL**

```bash
D:\Nodejs\node.exe tools/taste-skill/skills/taste-skill/scripts/lint.mjs prototypes/S13-blind-debossed-dispatch/style.css
# RESULT: 2 FAIL — [emoji] Emoji used as UI. (2×)  style.css:808 / :850  ⚠
```

而 `report.json` 的 `page.emoji` 是 `[]`、`findings` 里没有 `emoji`。

**原因**：`lint.mjs` 扫的是**源码文本**，`probe.mjs` 扫的是**渲染后的 DOM**。
S13 的 `⚠` 出现在 CSS 注释里（`:808` 与 `:850` 都是注释块），注释不进 DOM 所以闸门看不到。

**结论：源码 lint 在 S13 上报了两个假阳性。** 这解释了为什么 S13 的报告"看起来比源码更干净"。
**两个工具的口径不同，不该互相引用对方的结果。** 这条值得记进文档，因为它会让下一个人
「按 lint 修 S13 的 emoji」——而那是两个注释字符，修了没有任何效果。

### 7.3 ⚠️【P2】`unsupported` 的 29 个词里，「甜品」「美甲」其实有相邻候选

任务书 F2 说「`unsupported` 29 词里相当一部分有模板能套」。实测：

```
unsupported ∩ 模板 scenes 逐字 = []          ← 0 个
unsupported ∩ TPL_ADJACENT key = ["甜品","美甲"]   ← 2 个有相邻候选
```

所以「相当一部分」是 0 个逐字、2 个相邻。而 `renderTemplateLayer` 对这两个词的处理是**正确的**：
它给 M02 卡 + `why` 免责句（"M02 的适用清单里没有「甜品」，它写的是…"）。
**这不是 bug，是设计。** 但文档里「相当一部分有模板能套」这句话是错的。

### 7.4 ⚠️【P2】`_p9`/`_p15` 揭示：390 档的括号不配平案与 1440 档**完全不同**

```
1440: 口径A = S10 S18    口径B = S10 S12 S14 S15 S16 S17 S18 S19 S20
390 : 口径A = S05 S27    口径B = S05 S07 S24 S27
```

**只有 S05 在 390 档口径 A 里、不在 1440 档。** 也就是说"哪一案被切坏"完全由视口决定，
而任务书/上一轮都在讨论"1440 档有几案"。如果要做任何修复，**必须两档一起验**。

### 7.5 ⚠️【P1，与 7.9 同一件事，但角度不同】`--press-1-off` 是 alpha=0 的占位阴影，
**它的 7 个实例撑起了 "17 处" 里的 7/17，而它们视觉上完全不存在**

`--press-1-off: inset 2px 2px 3px rgba(36,31,23,0), 2px 2px 2px rgba(36,31,23,0)` —— 两个 alpha 都是 0，
视觉上不存在。`probe.mjs:318` 的现行判据已经能排除它（`/rgba\(\d+, \d+, \d+, 0\)/`），
所以今天算出来是 10；但 `report.json` 里的 17 是**旧判据**留下的（详见 §7.9）。

**"真未清"的实际规模是 10 个外投影元素（其中 4 个是按钮），不是 17。**
这不改变「S13 该修」的结论（10 也该修），但改变了工作量估算和验收断言。

### 7.6 ⚠️【P1，本轮最该知道】任务书引用的两处原文，现在**在 HEAD 里都不是代码**

- 「1. 我实际有 N 个条目，就排 N 个」：HEAD 里是代码（line 331），**工作树里已不是**。
- 「3. 请先把数量凑到 N 个再排版」：**HEAD 里就不是代码**，只是 `line 335` 的注释引文。

**如果执行 Agent 照任务书去"修这两句"，会改一段已经不存在的代码。** 这是本轮最容易浪费
一个 Agent 的坑，所以放在这条独立列出。

### 7.7 ⚠️【P2】上一轮的验收文档**自己就自相矛盾**，而那个数字被当成了本轮的事实基线

`deliverables/65-exec/EXEC-panel-discoverability.md` 里：

- `:210` `[mobile]` 那一段**逐案列出 24 个案号**（S03=3900 … S30=4579）；
- `:178` 与 `:365` 写「**25 案** scrollHeight > 3800」「25/30 未过」。

**同一份文档，明细 24、结语 25。** 这个 "25" 后来进了 `deliverables/65-plan/LEDGER-round5.md:78`
（标题就叫「390px 档 scrollHeight 25/30 超 3800px」），再进了本轮任务书。

**教训与本仓库记录过的一致**：结语里的数字必须由明细重新数一遍，不能凭印象写。
建议任何"N/M 超标"的断言都配一条 `assert(ids.length === N)`，否则明细与结语会静默分叉
（这正是 `check-docs.mjs` 存在的原因，只是它没查这类 deliverables 文档）。

### 7.8 ⚠️【P2】`mobile: true/false` 对测量结果**没有影响**，所以"移动端档"其实只是"390 宽"

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p31_mobileflag.mjs
# mobile=true   min 3538 max 4668 avg 4208 >3800 24/30
# mobile=false  min 3538 max 4668 avg 4208 >3800 24/30
```

两者逐字节相同。说明 `_selection` 的布局**不依赖 `mobile` 标志**（它靠 CSS 媒体查询），
所以"390×844 移动端档"实际上是"390 宽视口档"。**这不影响任何结论**，但如果有人以为
"移动端有独立的 UA/触屏行为、所以数字会不同"，那是误解——数字不会不同。

### 7.9 ⚠️【P1，会让 T2 的验收口径出错】`report.json` 的 "17 处 shadow" **用今天的 `tools/` 复算不出来，实际是 10**

这条我是在准备 T2 的验收脚本时撞上的：我按 `probe.mjs` 现版判据跑，只得到 **10**，不是 17。

```bash
D:\Nodejs\node.exe deliverables\66-plan\_p36_what17.mjs
```

```
big=193  box-shadow 非 none = 17  ← 这个数恰好等于 report.json 的 17
  其中 OUTER（含任一非 inset 段）= 10
  其中 INSET-ONLY（纯压痕）      = 7  ← h3.clause__head × 7
```

再把这 17 条的 computed value 打出来（`_p37_dump17.mjs`），那 7 条是：

```
h3.clause__head | rgba(36, 31, 23, 0) 2px 2px 3px 0px inset, rgba(36, 31, 23, 0) 2px 2px 2px 0px
```

**两段 alpha 都是 0 —— 视觉上完全不存在。** 它们是 `--press-1-off`（"一级的 alpha=0 占位，
与压出态同位移同模糊"，`style.css:290` 的注释原话）。

而 `probe.mjs:318` 的现行判据里有 `/rgba\(\d+, \d+, \d+, 0\)/` 这一段，**会把 alpha=0 的段排除**：

```js
const outer = sh.split(/,(?![^(]*\))/).some((part) => !/inset/.test(part)
  && !/ 0px 0px 0px 0px/.test(part) && !/rgba\(\d+, \d+, \d+, 0\)/.test(part));
```

所以 **17 = "box-shadow 非 none 的元素数"（旧判据），10 = "含非零外投影的元素数"（现判据）。**
差的那 7 个，正是 S13 里唯一被 alpha=0 占位的那一族。

**三个后果：**

1. **任何人今天重渲染 S13，都会得到 `shadow` FAIL 的数字从 17 变成 10**（如果不清它），
   而 README、CONTRACT §6、§9.15 全都在引用 "17 处"。**这个数字无法复算。**
2. **这解释了 §7.1**：`taste-skill-ignore` 对闸门无效，那 15 条辩解写了等于没写。
   而现在还多一层：**连"有效"那部分判据都在漂移**。
3. **`tools/` 在 `.gitignore` 里（第 2 行），`check-stale` 只比 `index.html`/`style.css`
   的 mtime，不比 `tools/`。** 所以 `probe.mjs` 改了以后，30 份 `report.json` 全部静默过期，
   **没有任何检查器会发现**。这是本轮发现的、比 S13 那两条 FAIL 更隐蔽的一类问题。

**对 T2 的影响**：验收脚本**不能**断言"17 → 0"。正确断言是
「用今天的 `tools/` 判据，外投影元素数 = 0」（`_p25_s13fix.mjs` 的 `fixAllInset` 已经过）。
并且在交付说明里写清「17 是旧判据下的元素数，其中 7 个是 alpha=0 占位、视觉不存在」，
否则下一个读 README 的人会以为修掉了 17 处。

---

## 8. 如果只能做一件事

**修 S13 的 `shadow` + `button-fx`（T2）。**

理由：

1. **它是 8 条 FAIL 里唯一"真未清且真能清"的一组。**
   其余 6 条：`mono` ×3（CONTRACT §9.15 明写"保留、报告原始 FAIL"）、
   `palette-terracotta`（S08 的琥珀是矩阵冻结值，§9.15 已登记豁免）、
   `font-count`（S08 有 4 族，中文站结构性下限是 3）、
   `empty-screens`（S13 的设计就是留白，是美学选择）。
   **只有 `shadow` + `button-fx` 是"没人辩解、也没人修"的两条。**

2. **它有实测背书，不是猜。** `_p25`/`_p26` 已经跑出 13 → 0、按钮 4 → 0 的具体配方，
   而且用的是 CONTRACT §9.3 明写认可的 `filter: drop-shadow()`。
   ⚠️ 但**"17 处"这个数字要重新定义**（§7.9）：按今天的判据是 **10 个外投影元素**，
   其中 7 个是 alpha=0 的视觉占位。交付时不能写"清掉了 17 处"，那句不可复算。

3. **它把闸门从 26/4/30 推到 26/3/30 里最难看的那个案子上。**
   S13 现在是 4 条 FAIL、最脏的一个。修掉 2 条后它剩 2 条（`mono` + `empty-screens`），
   两条都有豁免理由，闸门叙事从"S13 真未清"变成"S13 全部有据可查"。

**4. 其他候选都不如它。**
   - T1 已经被别人做了（做了就是重复劳动 + 撞车风险）；
   - T0（芯片死路）也被别人做了，而且它比我列的任何一条都更 P0 —— **正因为它有人在修，
     S13 才是"没人做且真该做"的那一件**；
   - T3 只是文档数字，不做也不影响任何用户动作；
   - T4 是"不完美"不是"错"，而且改的是热点文件 `app.js`（现在正被别人改，碰它必撞）；
   - `mood` / `clamp` 都是设计选择，碰它们是负收益。

**一件事的完整定义**：
改 `prototypes/S13-blind-debossed-dispatch/style.css` 的 3 个变量 + 4 条按钮规则，
用 `_p26_s13btn.mjs` 验证「外投影元素 0 / 带 box-shadow 按钮 0 / 带 drop-shadow ≥4」，
然后重渲染 S13 让 `check-stale` 保持绿，最后把 README 里 S13 那行的 FAIL 从 4 改成 2
（**这一处 README 改动是 T2 的一部分，不单独开工**）。

⚠️ **两处不能照抄现成数字**：
- 不能说"清掉 17 处 shadow"——按今天的判据是 10 个外投影元素（§7.9）；
- 不能说"FAIL 从 8 条降到 6 条"就完事——要同时更新 README L346-349 的逐案明细，
  否则 `check-docs` 的 `nums/gate`（FAIL=0 的案数是 26）不变，但人读的那一段会与报告不符。

---

## 附录 A：全部复算命令

```bash
# 纯静态（不需要浏览器）
D:\Nodejs\node.exe deliverables\66-plan\_p1_scene.mjs        # sceneIndex 44 词 / M0 命中 0
D:\Nodejs\node.exe deliverables\66-plan\_p3_pshape.mjs       # prompts.js 30 案 minItems/capacity/hard
D:\Nodejs\node.exe deliverables\66-plan\_p4_conflict.mjs     # 结构约束段逐案提取
D:\Nodejs\node.exe deliverables\66-plan\_p8_conflict2.mjs    # 打架案数 = 17（degrades=no 全部）
D:\Nodejs\node.exe deliverables\66-plan\_p11_hard.mjs        # hard 4 / degrades 13 / 并集 14
D:\Nodejs\node.exe deliverables\66-plan\_p12_lenrisk.mjs     # 改文案的长度风险
D:\Nodejs\node.exe deliverables\66-plan\_p16_head.mjs        # HEAD vs 工作树 30/30 全不同
D:\Nodejs\node.exe deliverables\66-plan\_p21_exact.mjs       # minItems 中位 9.5 / S13 17 处 shadow
D:\Nodejs\node.exe deliverables\66-plan\_p28_headtext.mjs    # 「凑到」在 HEAD 代码里 = 0
D:\Nodejs\node.exe deliverables\66-plan\_p29_hist.mjs        # 谁加的 / 谁删的
D:\Nodejs\node.exe deliverables\66-plan\_p30_textdefect.mjs  # 「真实的 条目数」多空格 13/30

# 需要浏览器（headless Edge/Chrome via tools/.../cdp.mjs）
D:\Nodejs\node.exe deliverables\66-plan\_p5_panel.mjs        # 390 档 24/30 > 3800，max 4668
D:\Nodejs\node.exe deliverables\66-plan\_p6b_decomp.mjs      # 首次拆分（注意：数错了，见 _p17）
D:\Nodejs\node.exe deliverables\66-plan\_p17_overhead.mjs    # 正确拆分：正文 69.4% / 布局 24.5%
D:\Nodejs\node.exe deliverables\66-plan\_p9_clamp.mjs        # 截断 30/30，逐案可见字数
D:\Nodejs\node.exe deliverables\66-plan\_p15_kouji.mjs       # 口径 A=2 / 口径 B=9（1440）
D:\Nodejs\node.exe deliverables\66-plan\_p19_layout.mjs      # 两栏更糟（+23%）
D:\Nodejs\node.exe deliverables\66-plan\_p20_fold.mjs        # 折 2 个 → 0/30
D:\Nodejs\node.exe deliverables\66-plan\_p24_realclamp.mjs   # 真 CSS clamp4 → 0/30
D:\Nodejs\node.exe deliverables\66-plan\_p10_template.mjs    # 搜「餐厅」→ 有 M02 卡
D:\Nodejs\node.exe deliverables\66-plan\_p13_alias.mjs       # 咖啡馆/咖啡店/餐厅/民宿/花店/律师
D:\Nodejs\node.exe deliverables\66-plan\_p18_emptytpl.mjs    # 模板卡 390 档在 1300px
D:\Nodejs\node.exe deliverables\66-plan\_p22_s13shadow.mjs   # S13 36 段阴影：16 inset / 20 外投影
D:\Nodejs\node.exe deliverables\66-plan\_p25_s13fix.mjs      # 改 3 变量：外投影 13 → 0
D:\Nodejs\node.exe deliverables\66-plan\_p26_s13btn.mjs      # 按钮：box-shadow 4 → 0（drop-shadow 保留）
D:\Nodejs\node.exe deliverables\66-plan\_p31_mobileflag.mjs  # mobile=true/false 结果相同；省略号截图
D:\Nodejs\node.exe deliverables\66-plan\_p33_shot3.mjs       # 用页面坐标截 family（记：clip 是页面坐标）
D:\Nodejs\node.exe deliverables\66-plan\_p34_prevround.mjs   # 上一轮明细 24 却说 25（自相矛盾）
D:\Nodejs\node.exe deliverables\66-plan\_p35_probe17.mjs     # 按 probe.mjs 判据复算：17 里只有 10 是外投影
D:\Nodejs\node.exe deliverables\66-plan\_p36_what17.mjs      # 17 条逐元素分类：10 OUTER + 7 INSET-ONLY
D:\Nodejs\node.exe deliverables\66-plan\_p37_dump17.mjs      # 那 7 条的 computed 值：两段 alpha 都是 0

# 闸门与检查器
node prototypes/_build/check-stale.mjs      # exit 0
node prototypes/_build/check-anchors.mjs    # exit 0
node prototypes/_build/check-docs.mjs       # 0 FAIL / 1 WARN / 12 PASS（WARN 来自 prompt-len 漂移）
node _readme-skill-fetch/write-attractive-readme-main/scripts/check-readme.mjs README.md  # 24 PASS
```

## 附录 B：本目录文件清单

| 文件 | 用途 |
|---|---|
| `PLAN-round6.md` | **本文** |
| `_p1_scene.mjs` … `_p30_textdefect.mjs` | 30 个探针，每个文件头注释写明「在验证什么」 |
| `_out/panel-measure.json` | 30 案 × 2 档详情面板全量测量（含逐段高度） |
| `_out/decomp.json` / `_out/layout-waste.json` | 字段高度拆分（后者是错的版本，保留作对照） |
| `_out/clamp.json` / `_out/clamp-kouji.json` | 行卡截断逐案可见字数与括号口径 |
| `_out/candidate-layouts.json` / `_out/real-clamp.json` | 布局实验（两栏更糟 / clamp4 达标） |
| `_out/s13-shadow.json` / `_out/s13-fixability.json` / `_out/s13-buttonfix.json` | S13 阴影可修性证据 |
| `_out/shots/s13-{A,B,C}*.jpg` | S13 三种修法的视觉对照 |
| `_out/head-vs-now.json` | HEAD 与工作树 30 案逐案对比 |
| `_out/empty-tpl-pos.json` | 模板卡在 1440/390 的位置 |
| `_out/check-docs.txt` | check-docs 完整输出（12 项 PASS 逐条） |
| `_out/shots/fam2-S12.jpg` | **决定性证据**：`-webkit-line-clamp:2` 末尾真的有 `…` |
