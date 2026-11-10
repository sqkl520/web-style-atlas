# 74-recon — 文档面侦察（README 双语 / CONTRACT / deliverables / 上手实走）

侦察对象：`README.md` (53,219 B)、`README-EN.md` (60,454 B)、`prototypes/_CONTRACT.md` (37,206 B)、
`prototypes/_build/SHOT-README.md` (22,031 B)、`templates/` (12 文件)、`deliverables/` (251 tracked / 205 .md)。

仓库口径：`git ls-files | wc -l` = **2249**；`git ls-files '*.md' | wc -l` = **277**。

---

## 1. 标题树与双语对齐

### 1.1 README.md 标题树（`grep -n '^#'`）

```
L5    # 网站设计风格图集
L41   ## 看效果：打开选型台，272 张真截图摊在一页
L76   ### 选中之后怎么带走：复制 AI 提示词
L118  ## 装上就能用
L123  # 任选一种                    ← 代码块内的 shell 注释，被 ^# 误捕，不是标题
L153  ## 仓库里有什么
L186  ## 模板层：改 12 个变量就是一个站
L220  ## 核心机制
L239  ## 部署四阶段：推到 Pages 只要留一个文件
L243  ### 阶段 1：推到自己的仓库
L252  ### 阶段 2：开 Pages
L265  ### 阶段 3：其他托管
L283  ### 阶段 4：只想取用某一个原型
L295  ## 渲染与验收
L298-301 # 代码块内注释（4 行）
L304-312 # 代码块内注释（4 行）
L324  ## 选型台自己的闸门账（每一条都能复算）
L328  ### 账目一：它的闸门报告曾经是六天前的
L334  ### 账目二：自述清单原先有 4 条与仓库历史不符
L350  ### 账目三：1px 现在只剩真列表行与真控件边
L365  ### 账目四：`mast-kicker` 是类名腐化，不是真违规
L371  ### 复算这几笔账
L376-390 # 代码块内注释（多行）
L397  ## 只做静态这一件事
L408-412 # 代码块内注释
L419  ## 做不到与已知边界
L450  ## 仓库结构
L471  ## 依赖
L479  ## 这个图集是怎么造出来的
L495  ## 反馈与贡献
L511  ## License 与署名：MIT，但三类素材不归它管
L550  ## English
```

真标题 = 1 个 H1 + 15 个 H2 + 8 个 H3（另 5 处 `^#` 是 shell 注释）。

### 1.2 README-EN.md 标题树

```
L5    # Web Style Atlas
L41   ## See the proof: 272 real screenshots on one bench
L76   ### How you take it away: copy the AI prompt
L118  ## Install and open it over HTTP
L123  # pick one                     ← 代码块注释
L153  ## What you get: 30 schemes, 30 prototypes, 3 templates
L186  ## The template layer: change 12 variables and it is yours
L221  ## How this atlas is built: four hard rules
L240  ## Deployment: four stages, and one file you must keep
L244  ### Stage 1: push to your own repository
L253  ### Stage 2: enable Pages
L266  ### Stage 3: other hosts
L284  ### Stage 4: using a single prototype on its own
L296  ## Rendering and verification
L299-304 # 代码块注释
L307-316 # 代码块注释
L328  ## The selection bench's own gate account (every line recomputable)
L332  ### Account 1: its gate report was six days old
L338  ### Account 2: four of the seven self-claims did not match repository history
L354  ### Account 3: the 1px rules that remain are real list rows and real control edges
L369  ### Account 4: `mast-kicker` was class-name rot, not a real violation
L375  ### Recomputing these accounts
L380-393 # 代码块注释
L401  ## Static only: nothing leaves your machine
L412-415 # 代码块注释
L423  ## Limitations: what this atlas cannot do
L453  ## Repository layout
L474  ## Dependencies
L482  ## How this atlas was made
L498  ## Feedback and contributions
L514  ## License and attribution: MIT covers code, not fonts or photos
L553  ## 中文
```

真标题 = 1 个 H1 + 15 个 H2 + 8 个 H3。**结构 1:1 对齐，节数与层级完全一致。**

### 1.3 逐节对齐表

| # | README.md | 行 | README-EN.md | 行 | 对齐 |
|---|---|---|---|---|---|
| H1 | 网站设计风格图集 | 5 | Web Style Atlas | 5 | ✅ |
| 1 | 看效果：打开选型台，272 张真截图摊在一页 | 41 | See the proof: 272 real screenshots on one bench | 41 | ✅ 同数字 |
| 1.1 | 选中之后怎么带走：复制 AI 提示词 | 76 | How you take it away | 76 | ✅ |
| 2 | 装上就能用 | 118 | Install and open it over HTTP | 118 | ✅（EN 更具体） |
| 3 | 仓库里有什么 | 153 | What you get: 30 schemes, 30 prototypes, 3 templates | 153 | ✅（EN 把数量写进标题） |
| 4 | 模板层：改 12 个变量就是一个站 | 186 | The template layer | 186 | ✅ |
| 5 | 核心机制（四条硬规则） | 220 | How this atlas is built: four hard rules | 221 | ✅ 差 1 行 |
| 6 | 部署四阶段 | 239 | Deployment: four stages | 240 | ✅ 差 1 行 |
| 6.1–6.4 | 阶段 1–4 | 243/252/265/283 | Stage 1–4 | 244/253/266/284 | ✅ 各差 1 行 |
| 7 | 渲染与验收 | 295 | Rendering and verification | 296 | ✅ |
| 8 | 选型台自己的闸门账 | 324 | The selection bench's own gate account | 328 | ⚠️ 差 4 行 |
| 8.1–8.4 | 账目一–四 | 328/334/350/365 | Account 1–4 | 332/338/354/369 | ✅ 各差 4 行 |
| 8.5 | 复算这几笔账 | 371 | Recomputing these accounts | 375 | ✅ |
| 9 | 只做静态这一件事 | 397 | Static only: nothing leaves your machine | 401 | ⚠️ 差 4 行 |
| 10 | 做不到与已知边界 | 419 | Limitations | 423 | ⚠️ 差 4 行 |
| 11 | 仓库结构 | 450 | Repository layout | 453 | ⚠️ 差 3 行 |
| 12 | 依赖 | 471 | Dependencies | 474 | ⚠️ 差 3 行 |
| 13 | 这个图集是怎么造出来的 | 479 | How this atlas was made | 482 | ✅ 差 3 行 |
| 14 | 反馈与贡献 | 495 | Feedback and contributions | 498 | ✅ |
| 15 | License 与署名 | 511 | License and attribution | 514 | ✅ |
| 收尾 | English（交叉链接段） | 550 | 中文（交叉链接段） | 553 | ✅ 互为镜像 |

**结构判据：无「只在一份里有」的章节。** 零漂移。

### 1.4 双语漂移不在结构，在内容

结构完全对齐，但**内容漂移严重**，且漂移方向单一：**中文更新、英文滞后**。已实测到的两处硬冲突：

1. **闸门通过数**。README.md L160 写「**29 个闸门 FAIL=0**」；README-EN.md 对应节
   （L158 附近）与两份 README 的**收尾交叉链接段**都还是旧数：README.md L556 写
   `**26 prototypes pass the mechanical gate with FAIL = 0**`、`8 remaining gate failures`。
   > 同一份文件里 L160 说 29/30，L556 说 26/30 且「还剩 8 条失败」——**自相矛盾，且旧值在英文段**。
   > `check-docs.mjs` 的 `i18n/facts` 只比「方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集」**五组**，
   > 而 L556 属于「英文摘要段」，正则口径未覆盖。这是 check-docs 的**口径盲区**，不是它漏跑。
2. **行号引用污染**。中英两份都靠「L## 引用」（如 prompt-copy.js 注释里 `README L78`），
   而两份行号已经分叉（L186 之后 EN 恒偏移）。**任何跨文件行号引用在双语下必然一半是错的。**

### 1.5 SHOT-README 与 templates 的标题树

`prototypes/_build/SHOT-README.md`：1 H1 + 9 H2 + 6 H3（`## 9. --reuse-raw` 下 9.1–9.5 五个 H3）。
`templates/*/README.md` 三份长度差很大（M01 10 节 / M02 12 节含 3 个 H3 / M03 8 节），
**编号风格三份不一致**：M01 用 `## 1`，M02 用 `## 0.`（多一个「0. 三分钟上手」），M03 用 `## 一、`。
同一层三件并列的模板，节号体系分三种 —— 是「模板层规则不同」之外的又一处无谓分叉。

---

## 2. 断言核验（核心交付）

### 2.0 先说方法论

`prototypes/_build/check-docs.mjs` 自称守 13 条断言，实跑 **13 PASS / 0 FAIL**。
但它守的只是**它自己认得的句式**。下表里凡是 check-docs 报绿、而实测不成立的，
都单独标注 —— 这才是本文的价值：**闸门绿 ≠ 断言真**。

两条通用复现命令（下文的 `data.js` / `prompts.js` 读取一律走这个）：

```bash
# data.js → window.SCHEMES，prompts.js → window.STYLE_PROMPTS（注意名字不是 PROMPTS）
node -e 'const fs=require("fs"),vm=require("vm");const c={window:{}};vm.createContext(c);
vm.runInContext(fs.readFileSync("prototypes/_selection/data.js","utf8"),c);
console.log(c.window.SCHEMES.length)'   # → 30
```

提示词长度要跑真函数（`buildStylePrompt`），必须给 `document` 打桩：

```bash
node -e 'const fs=require("fs"),vm=require("vm");const noop=()=>{};
function el(){const o={style:{},appendChild:noop,removeChild:noop,insertBefore:noop,setAttribute:noop,
getAttribute:()=>null,addEventListener:noop,classList:{add:noop,remove:noop},querySelectorAll:()=>[],
querySelector:()=>null,children:[],innerHTML:"",textContent:"",dataset:{}};o.parentNode={appendChild:noop};return o}
const d={readyState:"complete",addEventListener:noop,createElement:el,getElementById:el,querySelector:()=>el(),
querySelectorAll:()=>[],body:el(),documentElement:el()};const c={window:{},console,document:d};c.window.document=d;
vm.createContext(c);for(const f of ["data","prompts","prompt-copy"])vm.runInContext(fs.readFileSync("prototypes/_selection/"+f+".js","utf8"),c);
const b=c.window.buildStylePrompt;const L=c.window.SCHEMES.map(s=>b(s.id).length).sort((x,y)=>x-y);
console.log("min",L[0],"median",L[15],"max",L[29])'  # → 1814 / 1988 / 2138
```

### 2.1 断言总表

判据：**TRUE** = 实测等于文档所写；**STALE** = 曾经为真、现在被别处的改动甩下；
**FALSE** = 从来没有为真，或与文档自己的另一处矛盾；**UNVERIFIABLE** = 需要仓库外的东西才能复核。

| # | 断言（README 行号） | 文档写的 | 实测 | 判定 | 证据命令 |
|---|---|---|---|---|---|
| 1 | `272 张真截图`（L41/L46/L233/L554） | 272 | **272** | **TRUE** | `git ls-files "prototypes/S*/.inspect/*.jpg" \| wc -l` |
| 2 | 30 个方案 / 30 个原型（L16/L155/L159） | 30 | **30** | **TRUE** | `S*` 目录数 30；`SCHEMES.length` 30 |
| 3 | `29 个闸门 FAIL=0`（L160/L502） | 29 | **29**（S08 是唯一 2 FAIL 的案） | **TRUE** | 见 §2.2 的 gate 逐案表 |
| 4 | 剩下 1 个的 2 条失败（L160/L423） | S08 2 条 | **S08**：`palette-terracotta` + `font-count`，**2** | **TRUE** | `data.js` `gate.failIds` |
| 5 | `44 个行业词 / 16 直连 / 28 近似`（L78） | 44/16/28 | **44 / 16 / 28** | **TRUE** | `sceneIndex` 键数 + `direct.length>0` 计数 |
| 6 | `另有 29 个词…如实标为"没有"`（L78） | 29 | **29** | **TRUE** | `P.unsupported.length` |
| 7 | `30/30 有值（最短 276 / 最长 444 / 合计 10,065 / 中位 324）`（L74） | 276/444/10065/324 | **276 / 444 / 10065 / 324** | **TRUE** | `data.js` `audit` 字段长度统计 |
| 8 | `提示词 1814–2138 字，中位 1988`（L80） | 1814/1988/2138 | **1814 / 1988 / 2138**（S09 最短、S23 最长） | **TRUE** | §2.0 第二段脚本 |
| 9 | `4 案的机制绑在特定题材上（S15 S18 S21 S29）`（L107） | 4 案 | **`hardIds = [S15,S18,S21,S29]`** | **TRUE** | `prompts.js` `hardIds` |
| 10 | `13 案的单元位置是手工排定的`（L108，案号逐一列出） | 13 案 | **13 案，案号与文档逐字相同** | **TRUE** | `capacity.degrades==="yes"` |
| 11 | `两个轴正交，只重叠 3 案（S15 S18 S29）；并集 14 案`（L110） | 3 / 14 | **重叠 3（S15/S18/S29）；并集 14** | **TRUE** | 集合运算；`S21` 只在题材轴 |
| 12 | `无阴影 18 案 / 只有 inset 6 案 / 只有 drop-shadow 6 案，外投影 0 案`（L86） | 18/6/6/0 | 详见 §2.3 —— **17/6/6/1** 且 `dna.shadow` 自述 17/6/6/**1** | **FALSE** | `prompts.js` `dna.shadow` 分类统计 = 17/6/6/1 |
| 13 | 配色 `4–5 个色值`（L84） | 4–5 | `data.js` palette：**4 色 25 案 + 3 色 5 案**；`prompts.js` dna.palette **4–7 色** | **FALSE（口径混用）** | 见 §2.3 |
| 14 | `18 / 30 = 60% 落在"暖浅色带"`（L429） | 18 | **18** | **TRUE** | `axes.band` 计数 |
| 15 | `12 个案子（40%）…ΔH≤3° 且 ΔL≤3° 连成单一连通块`（L429） | 12 | **12**（我重算连通分量，最大分量 = 12，成员与文档可对） | **TRUE** | 见 §2.4 脚本 |
| 16 | `19 案（63%）`（换 ΔE76≤5 口径，L430） | 19 | **UNVERIFIABLE**（需 ΔE 换算，data.js 不存 Lab） | **UNVERIFIABLE** | —— |
| 17 | `25/30 = 83.3% 首屏无导航链接`（L429） | 25/30 | **`metrics.nav.links==0` 恰好 25/30** | **TRUE** | `report.json` 逐案 `viewports[0].metrics.nav.links` |
| 18 | `全批仅 S14 一案有圆角 ⇒ 29/30 = 96.7%`（L429） | 29/30 | **`roundedBoxes==0` 是 29/30，唯一非零正是 S14（=1）** | **TRUE** | `report.json` `surfaces.roundedBoxes` |
| 19 | `"很安静"只有 2 案、"就要扎眼"19 案（63%）`（L432） | 2 / 19 | **2 / 19**（余 9 案 = 有态度不吵） | **TRUE** | `axes.loud` 计数 |
| 20 | `色相 36 个 10° 桶只用了 11 个，紫→品红连续 110° 全空`（L433） | 11 桶 | **11 桶**（S30 的 `hue=0` 按无彩剔除后 `floor(h/10)` = {2,3,4,6,10,12,15,19,20,22,24}）；把 0 号桶也算进去则是 12 | **TRUE（口径需注明）** | `axes.bandHue` 排序 = 0,24,36,38,39,40,40,40,41,42,42,42,42,43,43,44,45,47,60,60,65,100,120,150,190,195,205,207,223,240 |
| 21 | `明度 20–60 整段 0 案`（L433） | 0 案 | **0 案**（bandL 全在 5 或 ≥65） | **TRUE** | `axes.bandL` |
| 22 | `F 型 15 / R 型 15`（L162） | 15/15 | **`fr` 字段 = F:15 / R:15** | **TRUE** | `data.js` `s.fr` |
| 23 | `30 个美学家族互不重复`（L162） | 30 | **30 个不同 family** | **TRUE** | `new Set(family heads).size` = 30 |
| 24 | `13/30 案的 index.html 在 30–48.4 KB（最大 S29 是 49,512 B）`（L443） | 13 案 / ≤48.4K / S29=49,512B | **≥30KB 恰好 13 案**，但**最大 S29 = 49,596 B**，且 S29 自己就 **>48.4K** ⇒ 落在区间内的只有 **12 案** | **FALSE（自相矛盾）** | `stat -c %s` 逐案 |
| 25 | `48 个样式表`（`_fonts/css/`，L461） | 48 | **48** | **TRUE** | `git ls-files 'prototypes/_fonts/css/*.css' \| wc -l` |
| 26 | `S21 … 共 71 片`（私有字体分块，L288） | 71 片 | **71 个 .woff2**（目录里另有 1 个 LICENSE 文本 = 72 文件） | **TRUE** | `git ls-files 'prototypes/S21*/fonts/*'` |
| 27 | `S04 26、S07 9、S08 6、S17 5，46 个文件`（L524） | 26/9/6/5=46 | **26 / 9 / 6 / 5 = 46** | **TRUE** | 逐案 assets 位图计数 |
| 28 | `11 行把许可写成"见来源页"而三个 URL 字段全空`（L528，分布 S20/S21/S22/S23/S24） | 11 行 / 5 案 | **11 行，恰好这几个案子，11/11 三 URL 全空** | **TRUE** | 见 §2.5 脚本 |
| 29 | `全库合计因此从 56 降为 51`（L525） | 51 | **51**（46 + S13 剩余 5 个 `src-*`） | **TRUE** | 46+5 |
| 30 | `被引用的 287 张位图里约 183 张`属派生件（L542） | 287 / ~183 | **UNVERIFIABLE**："被引用"口径未给；案目录下位图实测 **468** 个，"index.html/style.css 直接引 96 个" | **UNVERIFIABLE** | 见 §2.6 |
| 31 | `S14 共 9 处，全在 figcaption 的 <a> 里`（L411） | 9 | **9 个 `<a href="http…">`**；`<figcaption>` 出现 10 次 | **TRUE** | `grep -oE '<a href="https?://[^"]+"' \| wc -l` |
| 32 | `仓库约 180 MB`（L141） | ~180 MB | **tracked 184.3 MB** | **TRUE** | `git ls-files -z \| xargs -0 stat -c %s \| awk '{s+=$1}END{print s/1048576}'` |
| 33 | `12 个 CSS 变量`（三个模板，L195-197） | 12 | **M01=12, M02=12, M03=12** | **TRUE** | 各 `:root` 声明计数 |
| 34 | `14 个确定性纹理生成器`（L181） | 14 | **`GENS` 注册表 14 条**（`gen_*` 函数 15 个，多一个 `gen_*` 未注册） | **TRUE** | `prototypes/_build/make-textures.py` `GENS = {...}` |
| 35 | `12 份 JSON` 参数单（L538） | 12 份 | **12 份 S*.json + 1 README** | **TRUE** | `git ls-files prototypes/_build/textures` |
| 36 | `S07 … 闸门 FAIL 1（mono） · 5 屏 / 6 张真图`（L63 ASCII 示意） | FAIL 1 / 5 屏 / 6 图 | **实际 FAIL 0**（mono 已清）；screens **5**、realPictures **6** 对 | **STALE** | `data.js` S07 `gate` |
| 37 | `en 的中位 363`（P2 字体，见 73 报） | 363 | **UNVERIFIABLE** 本文未复算 | **UNVERIFIABLE** | —— |
| 38 | `26 prototypes pass … 8 remaining gate failures`（**L556**） | 26 / 8 条 | **29 / 2 条**（同文件 L160 就写 29） | **FALSE（自相矛盾）** | 同 §2.2 |
| 39 | `18 案盘上本就无参数文件`（L539，其余 18 案） | 18 | **18**（30 − 12） | **TRUE** | 12 案有 JSON |
| 40 | `实测覆盖率仅 19.6%`（L540，纹理参数） | 19.6% | **UNVERIFIABLE**（覆盖率口径未给） | **UNVERIFIABLE** | —— |
| 41 | `index.html:153` 的 summary 写「筛选 · 11 组 47 颗芯片」 | 11 组 / 47 颗 | **11 个 rail-block 成立**；但芯片实际是 **16 颗直连场景 + 29 颗筛选 = 45 颗**（展开后 44+29 = 73 颗）。47 是 `d49ed74` 那一刻的算术：**16 直连 + 31 筛选 = 47**，当时 `gate` 组有 4 颗（FAIL 0/1/2/4），今天 FAIL 只剩 0 与 2 两值 ⇒ 筛选降到 29 | **STALE** | 见 §2.7 的历史复算 |
| 42 | `多数案 10 段、个别 9 段`（`index.html:211`） | 10 / 9 | **30 案一律 11 `field()` + 1 `auditFold` = 12 段**；`check-docs` 明确断言 "12 段字段" | **FALSE（陈旧）** | `grep -oE "field\('[^']+'" app.js` = 11 + auditFold 1 |
| 43 | `9 组筛选 > Miller 7±2`（deliverables 60，非 README） | 9 组 | **10 组 chips 容器**（+1 场景组 = 11） | **STALE** | `grep -c 'class="chips" id=' index.html` = 10 |


### 2.2 逐案闸门实测（对应断言 3/4/36/38）

```bash
node -e 'const fs=require("fs"),vm=require("vm");const c={window:{}};vm.createContext(c);
vm.runInContext(fs.readFileSync("prototypes/_selection/data.js","utf8"),c);
for(const s of c.window.SCHEMES)console.log(s.id,"fail="+s.gate.fail,JSON.stringify(s.gate.failIds))'
```

结果：`fail=0` 的 **29** 案，唯一非零是 **S08 fail=2（`palette-terracotta`, `font-count`）**。
⇒ README L160「29 个闸门 FAIL=0。剩下 1 个的 2 条失败」**完全成立**。

**但是**同一份 `README.md` 的 L556（`## English` 收尾摘要段）写：

> `26 prototypes pass the mechanical gate with FAIL = 0. What this repository cannot do — 8 remaining gate failures, …`

这是 **26/30 时代的旧值**，与 L160、L425（「闸门从 26/30 升到 29/30」）直接冲突。
`README-EN.md` L560 的中文摘要段**已经改成 29**，只有 CN 文件的英文段没跟上。
`check-docs.mjs` 的 `nums/gate` 正则只认 `pass(?:es)? the gate with FAIL\s*=?\s*0`
这种**紧邻**写法，L556 中间夹了 `the mechanical gate`，于是**正则不命中、静默放行**：

```bash
node -e '
const re=/([\d]{1,3})\s*(?:个闸门 FAIL=0|pass(?:es)? the gate with FAIL\s*=?\s*0|案 FAIL=0)/gi;
console.log([..."26 prototypes pass the mechanical gate with FAIL = 0".matchAll(re)].length);  // → 0
console.log([..."29 pass the gate with FAIL = 0".matchAll(re)].length);                        // → 1
'
```

**这是本仓库最该记住的一条：闸门查的是它自己认得的句式，不是它声称的事实。**
`26` + `8 remaining` 这对数字放在一起还可自洽（26 通过 + 8 条失败 ≈ 26 + 8 条），
但和 L160 的 29 + 2 是**同一份文件里的两个互斥世界**。

### 2.3 阴影与配色：两条断言的具体错处（对应断言 12/13）

**断言 12（L86）** 原文：

> `统计全文件实际取值：无阴影 18 案 / 只有 inset 6 案 / 只有 drop-shadow 6 案，**外投影 0 案**`

`prompts.js` 的 `dna.shadow`（由 `clean-dna.mjs` 从 CSS 抽）实际分类：

| 取值 | 案数 |
|---|---|
| 无阴影 | **17** |
| 只用 inset（凹槽，无外投影） | 6 |
| 只用 drop-shadow（硬边厚度，无模糊投影） | 6 |
| **inset 与外投影混用** | **1（S13）** |

```bash
node -e 'const fs=require("fs"),vm=require("vm");const c={window:{}};vm.createContext(c);
vm.runInContext(fs.readFileSync("prototypes/_selection/prompts.js","utf8"),c);
const P=c.window.STYLE_PROMPTS;const t={};
for(const s of P.schemes)t[s.dna.shadow]=(t[s.dna.shadow]||0)+1;console.log(t)'
```

⇒ **17 / 6 / 6 / 1**，同时「无阴影 18」和「外投影 0 案」**两句都不成立**。
`git log -S 'inset 与外投影混用'` 指向 `cea8436`（「修提示词的正确性：7 个 Agent 审出的 P0」）——
**是那轮修提示词时把 S13 重新归了类，README 的 18/6/6/0 没跟着改**。典型的单向漂移。

S13 的源码里确有外投影：`--press-4: 0 -2px 3px rgba(36,31,23,0.06)`（`style.css:136`），
用在「贴底签发栏」这个真浮层上。注意 README **另一处**（L427 的英文/CN 更新）已经承认
「1 outer shadow that sits on a small element and never enters the `big` sampling set」——
**同一份文件里，L86 说外投影 0 案，L427 说有一处外投影**。

**断言 13（L84）「配色（4–5 个色值）」** —— 两个数据链口径不同：

| 数据源 | 色值个数分布 | 出处 |
|---|---|---|
| `data.js` `palette`（选型台展示用） | **3 色 5 案 / 4 色 25 案** | `check-twolines.mjs` 的 R7 说的是这条链 |
| `prompts.js` `dna.palette`（提示词里实际写进去的） | **4 色 10 / 5 色 3 / 6 色 6 / 7 色 11** | 提示词正文的「配色只用这几个值」用的是这条 |

README L84 的表格说的是「**写进提示词的东西** → 配色（4–5 个色值）」，即第二条链。
实测 **20/30 案是 6–7 色**，4–5 色的只有 13 案。**「4–5 个」是 `data.js` 的口径，写到了提示词那一行上。**
（`prompts.js` 文件头自己写着「最多 7 色」，`README` 没采用这个上界。）

### 2.4 同质口径（对应断言 14/15/17/18/19/21）

连通块重算（ΔH≤3° 且 ΔL≤3°，色相按环形距离）：

```bash
node -e 'const fs=require("fs"),vm=require("vm");const c={window:{}};vm.createContext(c);
vm.runInContext(fs.readFileSync("prototypes/_selection/data.js","utf8"),c);
const S=c.window.SCHEMES.map(s=>({id:s.id,h:s.axes.bandHue,l:s.axes.bandL}));
const dh=(a,b)=>{const d=Math.abs(a-b);return Math.min(d,360-d)};
const n=S.length,A=Array.from({length:n},()=>[]);
for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(dh(S[i].h,S[j].h)<=3&&Math.abs(S[i].l-S[j].l)<=3){A[i].push(j);A[j].push(i)}
const seen=new Set(),cs=[];for(let i=0;i<n;i++){if(seen.has(i))continue;const st=[i];seen.add(i);const k=[];
while(st.length){const x=st.pop();k.push(S[x].id);for(const m of A[x])if(!seen.has(m)){seen.add(m);st.push(m)}}cs.push(k)}
cs.sort((a,b)=>b.length-a.length);console.log(cs.map(x=>x.length).join(","),"| largest:",cs[0].join(" "))'
```

输出：`12,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1` —— **最大连通分量 12 案**
（S01 S16 S04 S25 S22 S21 S29 S27 S19 S17 S13 S06）。⇒ L429 的「12 个案子」**成立**。

`nav.links==0` = **25/30**、`roundedBoxes==0` = **29/30 且唯一非零是 S14** ⇒ L429 两个数**都成立**。
`axes.loud` = 就要扎眼 19 / 有态度不吵 9 / 很安静 2 ⇒ L432 **成立**。

⚠️ 但 L429 里「**后者分母是 `roundedBoxes>0`**」这句的表述是反的：
分母应是**全体 30 案**，分子是 `roundedBoxes>0` 的 1 案（S14）。写「分母是 `roundedBoxes>0`」
字面上等于「分母 = 有圆角的案数」，那算出来是 29/1 而不是 29/30。**是措辞把判据说反了，数是对的。**

### 2.5 署名缺口（对应断言 27/28/29）

```bash
node -e 'const fs=require("fs");const D=fs.readdirSync("prototypes").filter(d=>/^S\d\d-/.test(d));
let rows=[];for(const d of D){const a="prototypes/"+d+"/assets";if(!fs.existsSync(a))continue;
for(const f of fs.readdirSync(a).filter(x=>/^credits.*\.json$/.test(x))){let j;try{j=JSON.parse(fs.readFileSync(a+"/"+f,"utf8"))}catch(e){continue}
const A=Array.isArray(j)?j:(j.items||[]);for(const r of A){if(!/见来源页/.test(String(r.license||"")))continue;
rows.push(d.slice(0,3)+" "+(r.file||"?"));}}console.log(rows.join("\n"),"\nTOTAL",rows.length)'
```

输出 **11 行**，分布 **S20(2) / S21-credits-unused(2) / S22(2) / S23(5) / S24(1)**，
且 **11/11 的 `page`/`source`/`original` 三个字段全空**。⇒ L528 逐字成立。
四个"自认未保留"案的位图数 **S04=26 / S07=9 / S08=6 / S17=5 = 46** ⇒ L524 成立。

### 2.6 不可复核的两条（对应断言 16/30/40）

- L542「被引用的 287 张位图里约 **183 张**属派生件」。**「被引用」的口径没给**。
  仓库里 S* 案目录下（排除 `.inspect/`）的位图实测 **468** 个；
  从 `index.html` + `style.css` 里直接 grep 到的引用是 **96** 个。287 既不是 468 也不是 96。
  **这条读者无法复核，与 README L491 自己立的纪律直接冲突**（那里写着「本文尽量把每个数字标注判据与口径」）。
- L540「实测覆盖率仅 **19.6%**，S15 独占 78.9%」 —— 覆盖率的分母未定义。
- L430「换 ΔE76≤5 口径则是 **19 案（63%）**」 —— `data.js` 只存 `bandHue`/`bandL`，
  没有 Lab/ΔE 中间量，要复算得先实现 sRGB→Lab。

### 2.7 「47 颗芯片」的历史复算（对应断言 41）

`index.html:153` 现在写：

```
<summary class="rail-fold-sum">筛选 · 11 组 47 颗芯片（第一组是「你是做什么的」）</summary>
```

**11 组**对（`grep -c 'class="rail-block' index.html` = **11**）。
**47 颗**是 `d49ed74` 那一刻的算术，我今天复算该提交：

| | d49ed74 时 | 今天 |
|---|---|---|
| 场景芯片（直连，可见） | 16 | 16 |
| 场景芯片（近似 + 无对应，折叠） | 28 + 29 | 28 + 29 |
| 筛选芯片 | **31**（gate 组有 FAIL 0 / 1 / 2 / 4 **4 颗**） | **29**（gate 组只剩 FAIL 0 / 2 **2 颗**） |
| **16 + 筛选** | **47** ✓ | **45** ✗ |
| 全部场景 + 筛选 | 75 | 73 |

**机制**：`FAIL 1` 与 `FAIL 4` 是 `S07`/`S13`/`S21` 未清时的值；那三案清零后，
`gateKey()` 的值域从 4 个塌成 2 个，筛选组少 2 颗，于是 **47 变成 45**。
注释里那句「47 颗」是**首屏密度的实测快照**，数变了它没变 —— 和 L556 的 26/8 是同一类病：
**结论写进了文案，判据没有跟着数据走。**

同一处（`index.html:211`）还有断言 42：「多数案 10 段、个别 9 段」。实测**每案都是 12 段**
（`field('...')` 字面量 11 处 + `auditFold(r)` 1 处），`check-docs.mjs` 的 `panel/fields`
正是按「README 写的 N 段 == app.js 实测段数」断言的，且报绿为 **12**。
**选型台自己的界面文案说 10/9 段，README 说 12 段，而两个数都写在同一个产品里。**

---

## 3. `prototypes/_CONTRACT.md`：它要求什么，实际守住了几成

### 3.1 契约的骨架（30 个 H2，含后来的补写节）

```
§1  输入：你要读哪三个文件          §7   完成判据（缺一不算完）
§2  输出：目录布局                  §8   已知坑（都被踩过）
§3  渲染命令（唯一，不许换）        §9   第二轮试点学到的新坑
§4  字体：用共享缓存               §10  【环境事实】到图源的可达性
§5  图片素材：必须真实、必须本地    §10.1/10.2/10.3 三处事后更正
§6  硬约束（违反即返工）            §9.17–§9.23 七条追加的坑（编号已乱序）
```

一个结构事实：**§9.17 之后的所有节都追加在 §10 之后**，于是文件现在的节序是
`… §9 → §10 → §9.17 → §9.18 → §9.19 → §10.1 → §10.2 → §10.3 → §9.20 → §9.22 → §9.23`。
`§9.21` **不存在**（直接从 §9.20 跳到 §9.22）。一份要求别人"不许各自发挥"的规范，
自己的节号已经不单调了 —— 这是它在被持续追写、没人回头整理的直接证据。

### 3.2 契约的自我定位：一份带裁决记录的施工规范

`§7.4` 和 `§6` 里大量出现「**裁决补写（治 32 号矛盾点 4/5/6/7）**」这样的字样。
这不是普通规范文档的写法，而是**把每次被指出的自相矛盾，连同仲裁结论一起钉回原位**。
好处：读者不会看到两个互斥的版本；代价：正文从"要求"变成了"要求 + 争论文档"，
`§6` 里 `box-shadow` 那一格已经长到 700+ 字，一大半在讲「我上一版写的这句话是错的」。

### 3.3 五个我挑的、`check-contract.mjs` 不覆盖的条款

`check-contract.mjs` 只守 §9.15 允许表（C0–C6 全是围绕"FAIL 是否在允许表内"）。
下面五条都是**结构性/需要人来判**的，检查器一条都不碰。

#### 条款 A — §2 的字节范围「`index.html` 18–27 KB」

契约原文：

> ```
>   index.html          18–27 KB   （对齐现有 8 个；太短说明内容不足，多半会被闸门判 empty）
>   style.css           12–31 KB
> ```

实测（`fs.statSync(...).size`）：

| | 落在区间 | 越上界 | 越下界 |
|---|---|---|---|
| `index.html` 18–27 KB (18432–27648 B) | **16 / 30** | **14 案**（S14 32757 … S29 49596） | 0 |
| `style.css` 12–31 KB (12288–31744 B) | **23 / 30** | **7 案**（S13 42845 / S15 32378 / S21 38512 / S22 32910 / S23 34506 / S27 34646 / S28 39129） | 0 |

**判定：不达标 —— 15/30 = 50% 的样本至少越一条界，且方向单一（只超不欠）。**
越界案：S13 S14 S15 S18 S19 S20 S21 S22 S23 S24 S26 S27 S28 S29 S30。
其中 `index.html` 越界 **14 案**、`style.css` 越界 **7 案**、**两者都越界 6 案**（S15 S21 S22 S23 S27 S28）。
契约写这个区间的理由是「太短说明内容不足」，实测却是**没有一案太短、14 案太长**，
说明这个区间是从 8 个试点案身上测出来的描述值，被后来"内容更足"的 22 案系统性地推翻了。
README L443 已经承认了一半（「13/30 案的 index.html 在 30–48.4 KB…超过契约 §2 的目标区间」），
但**契约本体 §2 没改**，于是「契约要求 18–27 KB」和「实际 14 案超、README 承认 13 案超」三者并存。

#### 条款 B — §7.3 交付必须有三档 fold + **至少 2 张** `*-page-*.jpg`

契约原文：

> `3. .inspect/ 里有三档 *-fold.jpg ＋ 至少 2 张 *-page-*.jpg ＋ report.json。`

实测：30 案**全部合规**（每案 3 张 fold + ≥2 张 `desktop-page-NN.jpg` + `report.json`）。
S05 与 S17 的 `desktop-page-*` 只有 1 张，但 `tablet-page-*` / `mobile-page-*` 合计 ≥2 ——
按字面「至少 2 张 `*-page-*.jpg`」（通配，不限档位）是**满足**的。
**判定：字面合规，但判据本身有歧义**：如果本意是"每档至少 2 张"或"桌面档至少 2 张"，
S05/S17 就不合格。这一格是全契约里最容易各自解释的一句，而它恰好没有任何自动化。

#### 条款 C — §6「**正文不得 <15px**」

契约原文：

> `| **正文不得 <15px** | body-size：<15px 直接 FAIL，16–20px 为目标 |`

这条是**合规的**，但要看懂必须读仓库外的规则引擎。实测三案的 `body.size` 都是 **15**：

```bash
node -e 'const fs=require("fs");
for(const d of fs.readdirSync("prototypes").filter(x=>/^S(06|10|13)-/.test(x))){
 const r=JSON.parse(fs.readFileSync("prototypes/"+d+"/.inspect/report.json","utf8"));
 for(const k of Object.keys(r.viewports))console.log(d.slice(0,3),r.viewports[k].width,r.viewports[k].metrics.type.body.size)}'
# S06 15 / 15 / 15   S10 15 / 15 / 15   S13 15 / 15 / 15
```

`rules.mjs:106-107` 是**两条分支**：

```js
if (m.type.body && m.type.body.size < 15)      add('FAIL', 'body-size', …);
else if (m.type.body && m.type.body.size < 16 && !mobile) add('WARN', 'body-size', …);
```

⇒ `size < 15` 才是 FAIL；`15 ≤ size < 16` 是 **WARN**（且窄屏豁免）。
三案都是 15，所以 **WARN 正确、契约原文「<15px 直接 FAIL」也正确**（15 不小于 15）。
**判定：合规。** 保留这一条，是因为它是本报告里唯一"看起来矛盾、查到底其实对"的例子 ——
契约那句话写得够准（`<15` 而不是 `≤15`），是**读者容易看错**，不是文档错。

#### 条款 D — §6「**标题不得超 2 行**」

`§6`：`headline-lines：任一标题在任一视口超 2 行即 FAIL`。

从 30 份 `report.json` 的 `metrics.headings[].lines` 实测，`lines > 2` 的有 **5 处 / 4 案**：
S02@390(3 行)、S04@390(3 行)、S07@1440(3 行)、S07@390(4 行)、S26@390(3 行)。
而 `gate.failIds` / `warnIds` 里**没有任何一案出现 `headline-lines`**。

这**不是**漏报。`rules.mjs:33` 的判据是：

```js
const isStatement = (h) => h.kind === 'statement' && h.size <= stmtMaxPx;  // 390 档 stmtMaxPx=24
const long = m.headings.filter((h) => h.lines > 2 && !isStatement(h));
```

逐条核对这 5 处的 `kind` 与 `size`：

| 案 | 视口 | 行数 | kind | size | 是否豁免 |
|---|---|---|---|---|---|
| S02 | 390 | 3 | statement | 22 | 是（22 ≤ 24） |
| S04 | 390 | 3 | statement | 22 | 是 |
| S07 | 1440 | 3 | statement | 34 | 是（34 ≤ 36） |
| S07 | 390 | 4 | statement | 22 | 是（且 4 ≤ stmtMaxLines 4） |
| S26 | 390 | 3 | statement | 24 | 是（24 ≤ 24） |

**5/5 全部落在"大号陈述句"豁免内。判定：合规且判据正确。**

但契约 §6 那一行**只写了「任一标题在任一视口超 2 行即 FAIL」，一个字都没提 `statement` 豁免**。
读者按契约字面自查，会把这 5 处当成 5 个违规去改 —— 而工具认为它们全对。
**这是契约真正的缺陷：结论抄对了，豁免条件漏了。** `stmtMaxPx`（390 档 24 / 768 档 32 / 1440 档 36）
和 `stmtMaxLines`（4 / 3 / 3）这两个阈值只存在于仓库外的 `rules.mjs` 里，克隆者看不到。


#### 条款 E — §8.7「**位图素材要有真实分辨率**，别把 300×200 的图拉满 1440 宽」

契约原文：

> `7. **位图素材要有真实分辨率**，别把 300×200 的图拉满 1440 宽——会让页面看起来是色块而不是照片（闸门查不出，人一眼看得出）。`

读 30 案 `assets/` 里全部位图的**内在宽高**（PNG 读 IHDR、JPEG 扫 SOF 段）：
**113 张位图宽度 < 600px**。按文件名分两类：**66 张是纹理/颗粒/晕影/光标**（`grain`/`fiber`/`foil`/
`vignette`/`cursor`/`rust-corner`/`stain-ring`/`tile-*` 等，设计上就该小并 `repeat`），
**47 张是照片或图版**（`plate-*` / `eclipse-*` / `heritage-*` / `leak-*` 等）。

其中真正"可能被拉满"的照片里，最小的一批：

| 文件 | 内在尺寸 | 风险 |
|---|---|---|
| `S07/plate-edge.jpg` | **171×800** | 极窄竖条，本意就是书口边缘，不是拉满用的 |
| `S09/rule-shake-ink.png` | **512×6** | 6px 高 = 分隔线素材 |
| `S05/plate-scanline.png` | **8×8** | 8×8 可平铺 |
| `S06/plate-grinder.jpg` 等 | **552×552** | 4 张一组，`.plates{repeat(2,minmax(0,1fr))}`，1440 档每格约 340px ⇒ **552 > 340，不放大** |
| `S03/eclipse-of-the-sun.jpg` 等 8 张 | **458–599 宽** | `.plates{repeat(2,…)}` + `.wrap{max-width:1440px}` ⇒ 每格约 570px；**599 宽基本 1:1，485–555 宽会被放大约 1.03–1.18 倍** |
| `S17/heritage-1913-hejaz-revenue.jpg` | **388×543** | `repeat(auto-fit,minmax(228px,1fr))` ⇒ 约 228–300px 栏宽，不放大 |

**判定：不构成违规，但契约这一行确实有盲点。**
按 CSS 的 `repeat(2, minmax(0,1fr))` 反推，被引用的照片**没有一张被拉到 1440 宽**，
最大放大倍数约 1.18×（S03 那批 Wikimedia 原件本来就只到这个尺寸）。
契约举的例子（"300×200 拉满 1440"）在库里**不存在**，所以这条**没有实际违规样本**。
但它也没有任何量化门槛（"至少多少像素"、"放大倍数不超过多少"），
所以它既不能判违规也不能判合规 —— **这是一条只能靠人看图判断、而本轮没有人看图（`read_image` 不可用）的条款**。
真正的盲点不是"有没有违规"，是**这一条至今没有任何一次独立验证**。

### 3.4 契约合规小结

| 条款 | 检查器覆盖 | 实测结果 |
|---|---|---|
| A §2 字节区间 | 无 | **15/30 至少越一条界，只超不欠** |
| B §7.3 截图与报告 | 无（字面合规） | 30/30 字面合规，**判据有歧义（"2 张 page"是否按档计）** |
| C §6 body-size `<15px` | 无（C1 只判 FAIL 集合） | **合规**：三案 body=15 ⇒ 走 WARN 分支，与契约 `<15` 的字面一致 |
| D §6 headline-lines | 无 | **合规**：5 处超 2 行全在 `statement` 豁免内，但**契约没写这个豁免** |
| E §8.7 真实分辨率 | 无 | **无违规样本**：最大放大 ≈1.18×，但**这条从未被独立验证过** |

**五条里没有一条是"作者没照做"**：B 照做了、C 与 D 判定合规、E 没有违规样本，
A 是**契约的数值区间被后续工作合法地推翻了而没回写**。
契约真正的问题不是被违反，是**它的判据不全在契约里**：D 的豁免阈值、E 的量化门槛
都只存在于仓库外的 `rules.mjs` 或根本不存在，于是**读者按契约自查会得出与工具相反的结论**。

---

## 4. `deliverables/`：这条痕迹是干什么用的

### 4.1 规模先量清

| 指标 | 数值 |
|---|---|
| tracked 文件 | **251** |
| 其中 `.md` | **205**（顶层编号文档 56 份 + 30 个「阶段目录」下的过程件） |
| 体积 / 行数 | **8.1 MB / 92,078 行** |
| 对比：30 案的 `index.html` + `style.css` | **27,171 行** |
| 编号范围 | 00–72，**缺 18 / 42 / 43 / 44 / 59**（61–72 是目录，不占顶层编号） |
| 阶段目录 | `61-plan` … `72-plan`，每个数字下再分 `-plan / -research / -audit / -exec / -verify / -test`，共 **32 个目录** |

`deliverables/` 的散文量是**产品本体源码的 3.4 倍**。这不是副产品，这是另一半工程。

### 4.2 三份抽样读后：它到底在记录什么

**`60-diagnosis-what-feels-wrong.md`（143 行）** —— 用户说了一句「感觉还是有些不对」，
于是开了 30 个 agent 席位（第 1 轮 18 席 + 第 2 轮 12 席），这份是终裁。
它自己的结论是：

> **「它没有骗你——它只是把「我造它时怎么保证它对」的整套后台，当成「你要怎么用它」的封面发出来了。」**
> 「读者价值占全仓 **1.16%**、剩下 **98.84% 是作者自证卷宗**」

**这份文档最诚实的地方，是它对自己这个项目的诊断，恰好也适用于它自己所在的目录。**
`deliverables/` 本身就是那 98.84% 的后台。而它给出的处理意见是「降进单独分支/目录，**不删** ——
它们是内部审计的证据」，这条判断是对的。

**`56a-lead-acceptance.md`（57 行）** —— 验收批注。结构是「被审席声称 X / 我复算 Y / 裁定」。
三条被推翻（S06 的「0.62 递减」是假指控、S08 的「栅格没实现」判错重心、S25 部分成立），
失守机制它自己写明：「**搜不到就判不存在** —— 它在 `index.html` 搜 `--off`，值其实在 `style.css`」。
并且坦白：「我第一轮复算也**差点顺着它走** …… 我自己也在同一个坑里，只是多走了一步。」

**`73-verify/REVIEW-FINAL.md`** —— 终验报告，**判定「是否可以提交：否」**，
逐条列 5 项返工 + 1 项补充项的通过/不通过，其中 `check-texture` 被判**不通过**：

> **它今天报「31 个 style.css 全部合规」是错的：S02 的 `body` 上挂着 `background-image: url("assets/card-grain.png")`。**

我复核了这一条 —— **它是真的**，而且**已被修掉**（`S02/style.css:49-68` 现在把纹理挪到 `body::before`，
留下 20 行注释说明为什么）。今天跑 `check-texture.mjs` 是 `违规 0 / FAIL 0`。
⇒ **这条痕迹的闭环是真的：报缺陷 → 修 → 留注释 → 复跑通过。**

### 4.3 判定：这是决策日志 + 证据档案，不是流程剧场 —— 但只有约 8% 是

**支持「不是剧场」的三条硬证据**：

1. **每条断言都带可复算命令与实测数字**，且**大量断言被后续独立复算推翻**（56a 推翻 2.5/3 条、
   73-verify 推翻 6 条）。一个剧场不会产出推翻自己的记录。
2. **缺陷真的改到了产品里**。抽样验证：`S02` 的 `body` 纹理（真）、`S13` 的 `shadow` 定性与
   「静态计数 ≠ 运行时判据」的教训（真，`style.css:132-143` 的 `--press-*` 全是 inset，
   唯一外投影 `--press-4` 只用在浮层）、`S02` 的 `check-texture` 修复（真）。
3. **它记录了作者自己的错**：60 号 §4「我自己的错 —— `6c7e198` 改 S19 素材名没同步 4 处引用 →
   闸门从 26/30 掉到 25/30」。

**支持「有剧场成分」的三条**：

1. **30 个 agent 席位回答一句「感觉不对」**。60 号自己算出的边际贡献是「第 2 轮 11 席 < 1 分」，
   并给出了三条叫停判据。**记录这个结论是有价值的；产生这个结论的过程是过量的。**
2. **同一个编号下并存互斥版本**：`12-tool-rule-audit-30.md` / `-FULL` / `-v2-authoritative` /
   `-v4` / `-retry5` 五份，其中 v4 在正文里**亲口作废了前几版**。`12-*` 合计 5 份约 **500 KB**。
   读者无法从文件名判断哪份有效 —— 这正是 `_CONTRACT.md` §1 用 `_CURRENT-VALUES.md`
   解决过的问题（"冲突时以它为准"），这里没有对应的机制。
3. **32 个阶段目录里 `plan / research / audit / exec / verify` 五件套重复出现 7 次以上**，
   每一轮都新建一套，从不回收。

**给新开发者的可用性判定**：

- **不能当作入口读**。README 有 53 KB 已经够长，`deliverables/` 再加 8.1 MB，
  新人按编号顺序读会在第 12 号（五份互斥版本）迷路。
- **可以当作"这个数怎么来的"的追溯层用**，前提是有人先告诉他**只看 10 份**。

### 4.4 建议保留的 10 份（可移植、不自我引用、短、能独立成立）

| # | 文件 | 为什么留 |
|---|---|---|
| 1 | `00-BRIEF-AND-CONSTRAINTS.md` | 唯一的总规格，其余文档的上游依据 |
| 2 | `02-anti-ai-rules.md` | **R-01–R-40 法典**，89 KB。整个项目的规则源头，可脱离本仓库复用 |
| 3 | `29-critique-homogeneity.md` | 同质性的**判据与口径演化史**（17%/60%/73% 三个数为什么不同）。README 有 4 处引用它 |
| 4 | `30-critique-assets-license.md` | **许可台账**，398 张图逐文件判引用。有法律用途，不可省 |
| 5 | `50-critique-portability.md` | 取用成本实测（8–16.5 h/案、中位 10.9 h）。README 阶段 4 直接引用它的费率表 |
| 6 | `56a-lead-acceptance.md` | **只有 57 行**，示范「复算后推翻被审者」的正确做法 + 「搜不到≠不存在」的教训 |
| 7 | `60-diagnosis-what-feels-wrong.md` | 143 行，项目自我诊断的收敛件，含诚实的边际收益核算 |
| 8 | `60-minitems-degrade-audit.md` | `capacity.degrades` 那 13 案的原始判定，`prompts.js` 的数据依据 |
| 9 | `73-verify/REVIEW-FINAL.md` | 唯一一份**敢说「是否可以提交：否」**的验收报告，且缺陷已闭环 |
| 10 | `prototypes/_build/SHOT-README.md`（不在 deliverables，但同性质） | Chrome 无头截图的坑（390 ≠ 390、`--window-size` 的 500px 下限），可独立复用 |

**建议合并/折叠**：

- `12-tool-rule-audit-30*` **5 份 → 1 份**（保留 `-v2-authoritative`，其余四份压成一个「历史版本」附录）。
- `11-compiled-30.md`（**486 KB / 2,585 行**，纯拼接件）→ 删或降为 git 标签。
  它自己承认六个组件全在库、占全目录 12.9%。
- `61-*` … `72-*` 共 32 个目录 → 按轮次合成 **3–4 个**（`61-66` / `67-70` / `71-72`）。
  同一轮里 `plan/research/audit/exec/verify` 的**同名脚本**（`plan-probe-*.mjs` 有 11 个、
  `rt-*.mjs` 有 12 个、`_dbg-*.mjs` 有 8 个）**没有一份是给人读的**，它们是一次性探针。
  `deliverables/73-verify/` 下 58 个文件里 **46 个是 `.mjs` 探针**，只有 6 份 `.md` 是结论。

**一句话**：`deliverables/` 是一份**真实但未经整理的证据档案**。
证据是真的（缺陷能逐条回到产品），档案是没整理的（8.1 MB、92k 行、五份互斥版本、32 个平行目录）。
它现在服务的是**作者自己的追溯**，不是新开发者的入职。
把上表 10 份抽出来放进一个 `docs/`，其余压成 `deliverables/archive/`，可读性会从「不可读」变成「可查」。

---

## 5. 上手实走：新开发者 clone 之后按 README 逐条执行

前提：拿到的是 `main`（HEAD = `0432753`），从 GitHub 公开克隆，**没有 `tools/`**（`.gitignore:2` 排除）。
下面按 README 的**自然阅读顺序**走，每条引原文行号。

---

### 步骤 1 — README L27–29：起服务器

> ```
> npx serve . -l 8080                # 或者：python -m http.server 8080
> ```
> 跨平台通用——任何浏览器、任何静态托管都能跑，不需要装任何东西。

**结果：可用，但「不需要装任何东西」不成立。**
`npx serve` 会在第一次运行时从 npm 拉 `serve` 包（需要网络 + Node ≥ 18）；
`python -m http.server` 需要本机有 Python 3。
本机实测：`python --version` **无输出**（Python 不在 PATH）、`python3` 也不可用
⇒ Windows 上按第二条走会直接失败，读者必须自己意识到要用 `py -3` 或换 `npx`。
README 没有为 Windows 给出 `py -3` 这条最常见的写法。

**次要问题**：L124 那行 `php -S localhost:8080  # -l 8080 对齐下面的 URL` ——
`-l` 是 `npx serve` 的参数，`php -S` 没有这个参数。注释描述的是上一行命令的参数。
命令本身（`php -S localhost:8080`）是对的，只是注释会误导。

---

### 步骤 2 — README L138–139：必须走 HTTP

> **必须通过 HTTP 打开，不能双击文件。**

**结果：正确，且证据扎实。** 这条是全 README 最有价值的一条警告，
`5818 种颜色 vs 2 种颜色` 的对照在 `deliverables/21` L41 有原始测量、`deliverables/38` L245 有独立复现
（11,632 → 2,835 整视口 / 8,908 → 1 在掩码包围盒内）。**方向与量级都对。**

---

### 步骤 3 — README L141–147：克隆

> 仓库**约 180 MB**（照片、渲染截图、自托管字体），建议浅克隆：
> ```
> git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
> ```

**结果：可用。** 实测 tracked 总量 **184.3 MB**，与「约 180 MB」吻合
（`git ls-files -z | xargs -0 stat -c %s | awk '{s+=$1}END{print s/1048576}'`）。
远端可达（`git ls-remote` 返回 HEAD `0432753`）。

⚠️ **但「浅克隆」的副作用没写**：`--depth 1` 之后 **`git log` 只有 1 个提交**。
而 README 与 `deliverables/` 里**大量断言依赖 git 历史**：
L336「用 `git log --reverse -- prototypes/_selection/style.css` 逐提交核对」、
L427 引用 `1753f94`、L529「经 `git log -S` 全史核验」、L342 引用 `d49ed74`。
**按 README 的建议浅克隆，会让 README 自己一半的复算方法失效。** README 没提示这个冲突。

---

### 步骤 4 — README L149：装完自检

> 装完自检：`prototypes/_selection/index.html` 能打开、`prototypes/_selection/data.js` 非空、`prototypes/S01-*/index.html` 存在——少任何一个说明你克隆中断了。

**结果：三条全部通过。** 实测三个文件都在且非空。这条写得准。

---

### 步骤 5 — README L46：数截图

> ```
> git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l    # 272 张三档真实渲染截图
> ```

**结果：输出 `272`，与注释一致。** 这条是全文最好的一条：给了命令、给了期望值、可当场对账。
`--depth 1` 克隆后 `git ls-files` 照常工作（索引完整），所以这条不受浅克隆影响。


---

### 步骤 6 — README L297–313：渲染与验收（**这是断掉的地方**）

> ```
> # 渲染一个原型：三档视口真实截图 + 闸门结果
> # ⚠️ 本命令还依赖 prototypes/_build/ 之外的 tools/taste-skill/…/inspect.mjs —— tools/ 被 .gitignore 排除、不在仓库里。
> #    克隆者须先自行取得该工具；脚本本身免改——仓库根由脚本位置自动推导（ROOT 硬编码已在工具链 T0 清除）。
> node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence
> ```

**实测失败**：

```
$ node prototypes/_build/render-scheme.mjs S14-zero-g-launch-sequence
缺渲染引擎：D:\Web\style\tools\taste-skill\skills\taste-skill\scripts\inspect.mjs
  tools/ 不在仓库里（.gitignore:2 排除）——本机需自备 taste-skill；只想截图取证请用 shot.mjs（零依赖，不碰 tools/）。
$ echo $?
4
```

- **退出码 4**（不是 0，也不是 1）。README **没有列这个退出码的含义**。
- 错误信息本身**清楚有用** —— 这是全仓库做得最好的一处失败提示。
- **但 README 那句「克隆者须先自行取得该工具」没有任何指向**：
  没给 `taste-skill` 的仓库地址、没给版本、没给安装命令。
  L483 说「这两个工具都不在本仓库里——见 `LICENSE` 第 4 条」，而 `LICENSE` 第 4 条只写
  「第三方工具…不属于本仓库许可范围」。**读者从这里开始无路可走。**

**这一条之下紧跟的四条命令，读者会以为一样能跑：**

| 命令（README 行） | 实测 | 说明 |
|---|---|---|
| `node prototypes/_build/verify-prototype.mjs --all`（L305） | 可跑，**exit 1** | 报 **`达标 28 / 不达标 2`**，而 README L160 写 **29 个 FAIL=0** |
| `node prototypes/_build/check-docs.mjs`（L309） | 可跑，**13 PASS exit 0** | 不依赖 `tools/`（`tools/` 只出现在路径白名单里） |
| `node prototypes/_build/check-docs.mjs --selftest`（L310） | 可跑 | —— |
| `node prototypes/_build/shot.mjs …`（L313） | 可跑 | 但需 **Python + Pillow**（见步骤 7） |

#### 步骤 6 的最严重问题：`verify-prototype.mjs --all` 与 README 自相矛盾

README L502 在「反馈与贡献」里**明确要求贡献者跑这条并把输出贴上来**：

> ```
> node prototypes/_build/verify-prototype.mjs --all        # 文中写 29 案 FAIL=0
> ```

读者照做，看到的是：

```
✗ S02 S02-gilded-symmetry-salon
    · body 规则挂了背景图 → 对比度检查会静默跳过
✗ S08 S08-amber-overprint-lightbox
    · 闸门 FAIL=2：palette-terracotta font-count
达标 28 / 不达标 2 / 共 30
exit=1
```

**两个不同判据被混在了「达标」一个词里：**

- README 说的「29 案 FAIL=0」= `data.js` 里 `gate.fail===0` 的案数（实测 **29**，见 §2.2）。
- `verify-prototype.mjs --all` 的「达标」= **另一套静态判据**（含「缺 `assets/CREDITS.md`」、
  「`body` 挂了背景图」等）。S08 那条是真的（2 条 FAIL），**S02 那条是正则误报**。

**S02 假阳性的机制**（我逐行核过）：

```js
// prototypes/_build/verify-prototype.mjs:76-78
for (const m of C.matchAll(/(?:^|\})\s*(body|html)\s*\{([^}]*)\}/g)) {
  if (/background-image|background\s*:[^;]*url\(/.test(m[2])) out.problems.push(...);
}
```

S02 的 `body { … }` 块里**只挂着注释**，而注释正文里写着
`原本 background-image: url("assets/card-grain.png") 直接挂在 body 上`
（那 20 行是在解释「我为什么把它移走了」）。
**正则不看注释，于是把一段解释"我不用背景图"的注释判成了"用了背景图"。**

所以：**README 让所有人跑的那条命令，存在一个已知的假阳性，且它给出的总数（28）与 README 的主断言（29）不同。**
新人第一次跑就会撞上两个数字不一致，而 README 没有一句话解释「达标」和「FAIL=0」是两套口径。

`verify-prototype.mjs` 自己的注释（L146-157）**解释过这个混淆**
（「`--all` = 「30 个展品达标了没有」——口径固定为 30，README 的 26/30 对得上」），
**但那段解释在脚本里，不在 README 里。**

---

### 步骤 7 — README L313：`shot.mjs`（被推荐为「零依赖」的替代）

> ```
> # 零依赖截图取证：整页 + 逐屏切片 + 像素统计
> node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ --out .shots --widths 1440,768,390 --name S14
> ```

README L475 进一步承诺：

> `- **不使用**任何第三方设计审查工具；prototypes/_build/shot.mjs 完全零依赖`

**「完全零依赖」不成立。** `shot.mjs:10` 自己写着：

```
 *   3) 系统已有的 Python + Pillow 做裁剪/切片/像素统计。
```

`shot.mjs:43` 的实现是先找 `~/.dsh/dsh-runtimes/.../python.exe`，找不到回退到 `"python"`。
实测本机 `python -c "import PIL"` **无输出**（Python 不在 PATH）⇒ 这条路走不通。
**它「零」的是 npm 依赖，不是零依赖**：需要 Chrome + Python 3 + Pillow 三样。

README L474 的「依赖」节确实列了 `Node.js 18+、Python 3.8+（Pillow）、Google Chrome`，
**但它与紧接着的 L475「完全零依赖」在同一节里互相打脸。**

另：`shot.mjs` 本身**有完整 `--help`**（25 行选项、全部有中文说明），实测 `node shot.mjs` 无参数时打印用法并 exit 0。
这是全仓库第二处做得好的失败提示。

---

### 步骤 8 — README L376–390：复算选型台的闸门账

> ```
> # ① 1px 只剩哪几处（应为 5 处，全在真列表/真字段行上）
> node tools/taste-skill/skills/taste-skill/scripts/lint.mjs prototypes/_selection/ | grep -A6 '\[hairline\]'
> ```

**① ② ③ 三条直接 `node tools/...`，新克隆者三条全部 `Cannot find module`。**
README L373 在上方写了「`lint.mjs` 与 `inspect.mjs` 在仓库外的 `tools/` 里，克隆者要先自备」，
所以**它知情且声明了** —— 诚实，但代价是这一整节（README **L324–393，70 行，占全文 12%**）
对克隆者**只读不可验**。而这恰是全 README 论证最密的一节（四个账目、七条自述逐条核对）。

**四条里唯一能克隆者复算的是 ④**：`node prototypes/_build/check-stale.mjs`
实测输出：

```
闸门陈旧度：检查 30 案 + 1 个产品入口
  ⚠️ 2 项陈旧（源文件比 report.json 新，说明改了没重渲染）：
     截图与报告不同步(S02-gilded-symmetry-salon)  tablet-page-01.jpg 落后 5547 分钟
     选型台(_selection)  prompts.js 落后 5505 分钟
exit=0
```

而 README L389 说这条的用途是「④ 产品入口的闸门报告**不再陈旧**」。
**实测它现在报的就是陈旧**，且 **exit 0**（陈旧只警告不失败）。
读者会困惑「这条到底过没过」。README 没写 `check-stale` 的退出码语义。

---

### 步骤 9 — README L243–263：部署

> ```
> git clone --depth 1 https://github.com/sqkl520/web-style-atlas.git
> cd web-style-atlas
> git remote set-url origin https://github.com/<你的用户名>/<你的仓库名>.git
> git push -u origin main
> ```

**结果：可用，但三步里缺一步。** `--depth 1` 克隆出来的是**浅仓库**，
直接 `git push` 到新远端会推上去一个只有 1 个提交、无历史的仓库。
对「部署一个静态站」这个目的可以接受，但对「推到自己的仓库继续开发」是隐性损失。
**README 没提示要先 `git fetch --unshallow`。**

`.nojekyll` 的警告（L263）**正确且关键**：实测 `git ls-files .nojekyll` 存在，
且站内确实全在下划线目录（`_selection`/`_fonts`/`_specs`/`_build`）⇒ 这条警告是真知识。
`gh api` 那条命令行等价写法（L260）语法正确。

---

### 步骤 10 — README L132–135：打开四个 URL

| URL | 实测 |
|---|---|
| `/prototypes/_selection/` | 存在 |
| `/prototypes/_selection/wizard.html` | 存在 |
| `/templates/M01-clean-corporate/` | 存在（`index.html` 在） |
| `/prototypes/S14-zero-g-launch-sequence/` | 存在 |

四条全部有效。根 `index.html` 的 meta refresh 跳转（`url=./prototypes/_selection/`）路径正确。

---

### 5.1 上手失败清单（按严重度排序）

| # | 严重度 | 位置 | 原文 | 实际结果 |
|---|---|---|---|---|
| 1 | **阻断** | L302 | `node prototypes/_build/render-scheme.mjs S14-…` | **exit 4**，缺 `tools/…/inspect.mjs`；README 没给获取途径 |
| 2 | **阻断** | L377/381/386 | `node tools/taste-skill/…/lint.mjs` ×3 | **`Cannot find module`**；L324–393 整节不可复算（占全文 12%） |
| 3 | **高** | L502 | `verify-prototype.mjs --all  # 文中写 29 案 FAIL=0` | 实测 **`达标 28 / 不达标 2`、exit 1**；S02 那条是**正则误报注释** |
| 4 | **高** | L556 | `26 prototypes pass … 8 remaining gate failures` | 与同文件 **L160「29 个 … 2 条」** 直接矛盾 |
| 5 | 中 | L475 vs L474 | 「`shot.mjs` **完全零依赖**」vs「需要 Python 3.8+（Pillow）」 | 同一节自相矛盾；实测需 Chrome+Python+Pillow |
| 6 | 中 | L144 | `git clone --depth 1`（建议浅克隆） | 使 L336/L427/L529 等**依赖 git 历史的复算方法失效**，未提示 |
| 7 | 中 | L249 | 浅克隆后 `git push -u origin main` | 推上去是 1 提交的 orphan 历史，未提示 `--unshallow` |
| 8 | 低 | L28 | `python -m http.server 8080` | Windows 上 `python` 常不可用（本机实测无输出），未给 `py -3` |
| 9 | 低 | L124 | `php -S localhost:8080  # -l 8080 对齐下面的 URL` | 注释里的 `-l` 属于 `npx serve`，`php` 无此参数 |
| 10 | 低 | L390 | `node prototypes/_build/check-stale.mjs`（L389 说「报告不再陈旧」） | 实测**报 2 项陈旧**且 **exit 0**，退出码语义未写 |

**总的判断**：README 的**静态阅读体验**很好（命令都给了、期望值都写了、坑都标注了），
但**执行体验在「渲染与验收」这一节断裂**。断裂的根因只有一个：
**`tools/` 是 gitignore 的外部依赖，而 README 有 3 节、约 130 行建立在它上面。**
这不是「文档写得不用心」—— README 里**有 5 处**主动承认 `tools/` 不在仓库
（L172、L227、L299-301、L369、L373），作者完全知情。
问题在**知情之后的选择**：把「克隆者须先自行取得」写成了读者的任务，
而没有把这一节改成「本机可跑 / 需外部工具」两栏，或直接把它标成「本机文档，非克隆者可执行」。

---

## 6. 结论（一页）

### 6.1 断言核验总计

**43 条量化断言**（比要求的多，因为我一并把 `index.html` 里的界面文案也算了进来）：

| 判定 | 条数 | 占比 |
|---|---|---|
| **TRUE** | 31 | 72% |
| **STALE**（曾为真，被后续改动甩下） | 3 | 7% |
| **FALSE**（从不成立，或自相矛盾） | 5 | 12% |
| **UNVERIFIABLE**（口径未给 / 需仓库外） | 4 | 9% |

**最重要的一条不是那 5 条 FALSE，而是这个事实：**
`check-docs.mjs` 13 条断言**全绿**，而上面有 **12 条**它管不着或管错。
「闸门绿」和「断言真」是两件事，这份仓库把前者当成了后者的证据。

### 6.2 五条必须修的（按优先级）

| 优先级 | 问题 | 位置 | 一句话修法 |
|---|---|---|---|
| **P0** | 同一份 README 里 26/8 与 29/2 并存 | `README.md:556` | 把 L556 的 `26` → `29`、`8 remaining gate failures` → `2` |
| **P0** | `verify-prototype.mjs --all` 假阳性 + 与 README 口径冲突 | `verify-prototype.mjs:77` | 匹配前先剥 CSS 注释（同文件 `stripNonRendered` 已有能力） |
| **P1** | `无阴影 18 案 … 外投影 0 案` 两句都不成立 | `README.md:86` / `README-EN.md:86` | 改成 `17 / 6 / 6 / 1`，并说明那 1 处是 S13 的浮层 |
| **P1** | 「配色（4–5 个色值）」用了 `data.js` 口径来讲提示词 | `README.md:84` / `README-EN.md:84` | 改成「4–7 个色值（多数字色 6–7）」，或明确标注「这一行指 data.js 的展示链」 |
| **P1** | 「11 组 **47** 颗芯片」/「多数案 **10 段**、个别 9 段」 | `index.html:153`、`:211` | `47` → `45`；`10 段/9 段` → `12 段` |

（`index.html:211` 的「10 段/9 段」尤其值得修：它与 README「12 段字段」直接冲突，
且 `check-docs` 的 `panel/fields` 断言是照 12 段报绿的 —— 也就是**产品界面在说一件它自己的检查器已经否掉的事**。）

### 6.3 结构性判断（比单条错值更重要）

1. **这个仓库的文档纪律是「单向的」。** 代码改了 → 文档不一定改；文档改了 → 代码不一定改。
   `check-docs.mjs` 只在一个方向上装了眼（它读文档、比对代码），所以**任何一边单独变动都能漏过去**。
   L556 的 26 与 `index.html` 的 47 颗芯片、10 段，全是这么留下的。

2. **「口径」是本仓库唯一真正的技术难点，而它被反复写进正文却没被写进断言。**
   README 自己在 L491 承认过「此前这里写的是『没有一条断言是估的』——那是给自己发的免检牌」。
   实测下来这条自我修正**方向对、力度不够**：43 条里仍有 4 条 UNVERIFIABLE，
   而 `无阴影 18` 这种**有明确数据源却写错**的反而更危险（它看起来可核，其实错）。

3. **`tools/` 是这份仓库最大的单点断口。** 它被 gitignore、被 README 引用 5 次、
   支撑着 3 节 130 行内容和 `render-scheme` / `lint` / `inspect` 三个入口。
   副本读者拿到的是一份**能看不能验**的图集。这不是疏漏，是**已知且被接受的设计取舍** ——
   但代价应该写在 README 最顶上，而不是散在 5 处脚注里。

4. **`deliverables/` 是真实证据 + 未整理档案。** 8.1 MB / 92k 行 / 五份互斥版本 / 32 个平行目录。
   抽上 §4.4 那 10 份出来就能从「不可读」变「可查」；其余压进 `archive/` 不损失任何证据。

### 6.4 一句话

**这份文档面是全仓库质量最高的部分，也是最会骗人的部分** ——
因为它的证据装置（命令、期望值、判据、口径声明）做得比大多数开源项目都好，
于是**当它写错的时候，读者没有任何理由怀疑**。
L556 的 `26 prototypes` 就印在一句语法完美的英文里，隔 396 行是同一份文件的 `29 个`。
