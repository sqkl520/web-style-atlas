# 38 · 文档意图辩护：文档描述的是「意图」还是「状态」？

**我的角色**：文档意图辩护员。对抗对象是 `deliverables/34-critique-doc-accuracy.md`（57,845 B / 501 行）。
**写范围**：只写本文件与 `deliverables/38-scratch/`。**未改任何原型、模板、脚本、README 或既有 deliverables**（收尾 `git status --porcelain` 为空；草稿目录被 `.gitignore:62 deliverables/*-scratch/` 覆盖，`git check-ignore -v` 已证）。

---

## §0 我的判定口径（可复核）

审查员只承认四类断言（数字 / 路径 / 命令 / 能力声明），并以"可验证的事实断言"为唯一判据。**我不反对这个维度，我反对它把"口径未定义"和"表述省略"也一律记成"不一致"。** 我的判据必须先能被别人拿去重算，所以先写死。

### 0.1 三类判定

| 类别 | 定义 | 处理 |
| --- | --- | --- |
| **A 文档缺陷** | 断言与**仓库内可复算的事实**冲突，且冲突会改变读者的行动（照抄会失败、会误估工作量、会误判合规范围） | 必须改 |
| **B 表述选择** | 断言为真，只是措辞含糊 / 参照系未写明；**我能给出至少一种可复核的读法使其为真** | 不算缺陷，至多记"可选措辞" |
| **C 可接受的近似** | 相对偏差 ≤5% 或落在"约 / 大约"的语义范围内，且不改变结论 | 不算缺陷 |

判定编号：除 A/B/C 外，允许两个附注——**① 口径越界**（断言真、但按它自己在 §7#7 申明的"只核文档→仓库方向"不该计分）、**② 定级过重**（事实成立但"不一致"的定性不成立）。

### 0.2 四条硬判据（本次每条裁定都按这四条走）

1. **主语检验**：断言的主语是"磁盘上今天能读到的对象"，还是"作者意图 / 某个历史时点的状态"？前者按今天的磁盘判；后者只能按**被审时点的快照**判，不能用后来的修改反推。
2. **可复算检验**：数字能在仓库内复算的 → 必须复算；偏差 >5% 判缺陷，≤5% 判近似（C）。
3. **仓库内部答案检验**：同一份交付物里若已存在正确答案，而另一处与之相反 → 判缺陷（这不是"表述选择"）。
4. **可移植性检验**（只对命令）：判"给出即可执行"是否成立，需要同时满足 **(a) 本机可跑** 与 **(b) 按 README 的部署流程 clone 后仍可跑**。只满足 (a) → 缺陷成立；只满足 (b) 而本机缺工具 → 缺陷不成立（属"未安装"）。

### 0.3 我拒绝接受的一种判法

我**不接受**"因为句子没给出构造算法，所以那个数字就是错的"作为缺陷的唯一理由。要判错，必须证明**在任何自然构造下该数字都不成立**。D5 我就是这么做的（见 §1-D5）：我搜了 4 种构造，全都不给出 4.39——所以那条我**认**，而且我比它说得更重。

### 0.4 快照基准（我把它的快照还原成了 git 对象，这是本次最有用的一步）

它声明快照为 `README.md` 18,702 B / `README-EN.md` 21,317 B / sha256 前 16 位 `C7F59E06…` / `F5DB862E…`。我用 `git cat-file -p <rev>:<path>` 遍历历史，**精确命中 commit `12f2a1e`**：

| 文件 | 字节 | LF 行 | sha256 前 16 | 它的表 |
| --- | --- | --- | --- | --- |
| `README.md`@12f2a1e | 18,702 | 205 | `C7F59E06330BD2ED` | 18,702 / 205 / 同值 ✅ |
| `README-EN.md`@12f2a1e | 21,317 | 205 | `F5DB862E1FA81243` | 21,317 / 205 / 同值 ✅ |
| `LICENSE`@12f2a1e = 今天 | 3,906 | 68 | `0B686C062C3DDD57` | 3,906 / 69 / 同值 ✅（行数差 1 是"末行换行"口径，它 §7#6 已自述） |
| `.gitignore`@12f2a1e = 今天 | 1,713 | 62 | `9A4199B0744696E7` | 1,713 / 59 / 同值 ✅（同上口径差） |

**四个 sha256 全对 → 它的行号是可复核的，不是编的。** 这让我能精确区分"它报错"与"它报对但事后被修"：

| commit | README.md | README-EN.md | 内容 |
| --- | --- | --- | --- |
| `12f2a1e` | 18,702 / 205 | 21,317 / 205 | **= 它的快照**（D1/D2/P1/C1/Q1 全部是原始文本） |
| `d403603` | 18,836 / 205 | 22,103 / 211 | EN：box-shadow 警示、render-scheme 警示、`_CONTRACT.md` 移出 `_build/`；**CN：38 张 → 56 文件 / 43 唯一图** |
| `5c4209d` | 19,703 / 209 | 22,103 / 211 | CN：`12 字段`→`全部字段`、box-shadow 警示、render-scheme 警示 |
| `f8cf3e6`（我落笔时 HEAD） | 未再变（mtime 04:39:15） | 未再变（mtime 04:37:40） | 另 3 个提交，未触碰 README |

**结论先说**：它 12 条不一致里，**11 条站得住**（5 条我只能主张"写作时成立、现已修"，2 条我只能主张"降级"，1 条我只能主张"定性过强"，3 条无可辩护），**1 条我判口径越界**。它判"准确"的 32 条我复算了 31 条，**只有 1 条是实质判松**（§5#31 的因果从句）。它判"无法验证"的 9 条里，**6 条其实可验证**，其中 4 条我已实做并证明**为真**。

---

## §1 逐条裁定表

**裁定口径**：**成立** = 缺陷成立且无可辩护；**部分成立** = 缺陷成立但它的定性/范围有误；**已修** = 在 `12f2a1e` 快照上确认原文成立、事后已被改；**误报** = 按 §0 判据不该计入缺陷。

### 1.1 它报的 12 条

| # | 条目 | 我的复算（实测数字/文件+行） | 裁定 |
| --- | --- | --- | --- |
| D1 | 「涉及约 **38 张**第三方照片」（CN L157 / EN L158） | 逐份 `CREDITS.md` 的「盘上存在但署名表里没有对应记录的位图」小节逐行 = **26+9+6+10+5 = 56 行**；唯一图 **13+9+6+10+5 = 43**。S04 的 26 行构成已逐条读出：`plate-01…08` 的 png+webp（16）+ `plate-lead` png+webp（2）+ `torn-edge-1…4` png+webp（8）。**"38" = 8+9+6+10+5**，即只数了 S04 的 8 张 `plate`，漏掉 `plate-lead` 与 `torn-edge-1…4` 共 5 张（43−38=5） | **已修（快照时成立）**·仅 CN 侧 |
| D2 | 「点行展开 **12 字段**全文」（CN L20 / EN L20） | `app.js` L336–345 恒发 **10** 个 `field()`；`field()`（L278）对空值返回 `''`；`data.js` 31 个键里**唯一**有空的字段是 `layout`，空值恰为 **S12 / S15 / S19** → 27 案 10 段、3 案 9 段 | **已修（快照时成立）**·仅 CN 侧 |
| D3 | `TOKENS.md` 「**12 个变量**逐个说明」（CN L50 / EN L51） | M01：TOKENS 反引号唯一 **12** / `:root` **12**；**M02：TOKENS 13 / `:root` 12 / 全文件声明唯一 13**，多出的 `--ring` 落在 `style.css` **L298** 与 **L448**（后者在 `.site-foot{}` 里局部覆盖）；M03：12 / 12 | **成立**（未修） |
| D4 | 「**少数**原型的 `index.html` 在 30–48.4 KB」（CN L184 / EN L185） | ≥30,000 B（十进位）与 ≥30,720 B（KiB）**两种阈值都得 13 案**：S29 48.4/S28 43.7/S15 41.4/S18 40.6/S27 38.1/S24 36.9/S19 36.6/S20 35.7/S23 33.9/S26 33.1/S21 32.6/S14 31.9/S22 30.3 KB；最小 S07 = 18.0 KB。13/30 = **43.3%** | **部分成立**（数字/名单全对；我主张降级为"措辞精度"，见 §2-C） |
| D5 | 「（链上最大单步 ΔE76 = **4.39**）」（CN L177 / EN L178） | ΔE76(S13,S27) = **4.39 精确命中**。但我搜了 4 种"链"：完整图 MST 最大单步 **5.47**（S29–S22，且与起点无关）；块内最近邻链最好起点 **5.78**（S16–S13）、最差起点 10.98；块内**宽口径（ΔH≤3 & ΔL≤3）直连边共 16 条，其 ΔE76 从 1.44 到 17.27**，在宽边子图上跑 Kruskal 生成树的**最大单步 = 11.04**；块内最大两两距离 **17.27**（S13–S22）。**S13–S27 与 S29–S22 都不是宽口径直连边**（ΔL 分别 4.1 / 3.9 > 3） | **成立**（比它说得更重，见 §2-D5 附注） |
| P1 | EN L200 仍把 `_CONTRACT.md` 写在 `_build/` 下 | `prototypes/_build/_CONTRACT.md` 不存在；`prototypes/_CONTRACT.md` 存在（19,540 B）。快照 CN L199/L200 已分两行、EN L200 仍是单行合并 | **已修（快照时成立）**·EN 侧已于 `d403603` 拆行 |
| P2 | README 写 `--out .shots` | `.gitignore` L45 只有 `.shot-test/`；`git check-ignore -v .shots/x.png` → **exit 1（未被忽略）**；`.shot` 同样未被忽略；`shot.mjs` L102 默认 `out: '.shot'`、头注释 L5 用 `.shot-test`；`SHOT-README.md` L8 / L215 用 `--out .shot-test` | **成立**（未修；定级低，属一致性缺陷） |
| C1 | `render-scheme.mjs` 双重阻断 | `L16 const ROOT = 'D:/Web/style'`；`L17 INSPECT = join(ROOT,'tools/taste-skill/skills/taste-skill/scripts/inspect.mjs')`；`git ls-files tools` → **0**；`git check-ignore -v` → `.gitignore:2:tools/`；磁盘上 `tools/` 有 **302** 个文件；`LICENSE` §4（L45–L48）自己写明 taste-skill / impeccable「**均未包含在本仓库中**」 | **已修（快照时成立）·仅文档层**；脚本本体未动，仍不可移植 |
| C2 | `verify-prototype.mjs` 把 ROOT 写死 | `L12 const ROOT = 'D:/Web/style'`。我用 `D:\Nodejs\node.exe prototypes\_build\verify-prototype.mjs --all` 复跑：**exit 1，末行「达标 26 / 不达标 4 / 共 30」**（逐字复现） | **成立**（未修） |
| C3 | `shot.mjs` 把 Chrome/Python 写成绝对路径 | `L39 chrome: 'C:\Program Files\Google\Chrome\Application\chrome.exe'`；`L40 python: 'C:\Users\Administrator\.dsh\…\python.exe'`。**但同时**：`L37 const REPO_ROOT = resolve(HERE,'..','..')`（脚本用自身位置推导仓库根，**不硬编码目录**）、`L106` 有 `--chrome`/`--python` 覆盖位 | **误报（口径越界）**，见 §2-A |
| Q1 | 「`box-shadow` **0**」（CN L53 / EN L54） | M01 `style.css` **3 处**：L204（hero）、L284（卡片两层）、L560（`box-shadow:none` 复位）；M03 **1 处**：L122（画汉堡两条杠）；M02 **0 处**。仓库内反证齐备：`templates/M01/README.md` **L162** 写「一段很浅的两层阴影 `0 1px 2px` + `0 16px 30px -24px`」；`templates/M02/README.md` **L188** 写「**全站零 `box-shadow`**」 | **已修（快照时成立）**；附注：M01 的"3 处"含 1 处 `none` 复位，**实体阴影 2 处**（它自己的替换文本写的也是 2） |
| Q2 | L30「可逐字节复算」与 L162 警示块 | 14 个 `gen_*` 全对；**磁盘上有 `build/texture-job.json` 的恰 12/30 案**（S18 S19 S20 S21 S22 S23 S24 S26 S27 S28 S29 S30，与它一致）；`git ls-files` 无 `texture-job`；`.gitignore` L7 排除 `prototypes/*/build/` | **部分成立**（缺陷成立，"自相矛盾/互斥"定性过强），见 §2-B |

**分布：成立 4（D3 / D5 / P2 / C2）· 部分成立 2（D4 / Q2）· 已修（快照时成立）5（D1 / D2 / P1 / C1 / Q1）· 误报 1（C3）＝ 12。**

### 1.2 一个必须并列写出的补救缺陷：**D1 / D2 的修复只落在 CN 一侧**

我落笔时（HEAD `f8cf3e6`）英文版仍是原文，逐字核过：

```
README-EN.md L20 : "... click a row to expand the full twelve fields and a paged full-page view;"
README-EN.md L163: "... covering roughly 38 third-party photographs;"
```

对照 CN（`README.md` L20「…展开**全部字段**…多数案 10 段；S12/S15/S19…只有 9 段」、L161「涉及 **56 个位图文件 / 43 张唯一图**」）。
**这不是审查员的错**（它交卷时 CN 也没改），但它是 P1 那条的同一类问题再次发生：**它只告了 EN 落后一次，实际死了两次。** 修复清单里应补：`README-EN.md` L20（twelve fields）、L163（38 → 56 files / 43 unique images）。附注：CN L53/L54 的警示块末尾有一个 `。。` 双句号（`README.md` L54），属排版瑕疵。

---

## §2 我判「误报 / 不该按它的口径判」的逐条展开

### §2-A【C3】`shot.mjs` 硬编码路径 —— 口径越界，应出缺陷清单

它把"README 没写 `shot.mjs` 的 `--chrome`/`--python` 默认值是本机绝对路径"记成一条**路径/命令类不一致**。三条理由判它越界：

1. **README 没有作任何关于默认路径的断言。** 被审句是 CN L171「渲染与复核工具：Node.js 18+、Python 3.8+（Pillow）、Google Chrome」——这是一个**依赖清单**，为真（我实跑确认：Node v26.12.1、Pillow 12.3.0、Chrome 155 全满足，且 `shot.mjs` 三档跑通 exit 0）。"没提到默认值"是**省略**，不是**反事实**。缺陷类别是 A（断言与事实冲突），不是"文档没写全"。
2. **它自己在 §7#7 申明了不做这一类。** 原文：「我只核了'文档 → 仓库'这一个方向……没有核'仓库里有什么、文档却漏了'（完整性/覆盖度），那属结构审查范畴」。C3 恰恰是"仓库里有个机器绑定的默认值、文档没写"——**计数口径与自述范围冲突**。
3. **它漏掉了反证。** `shot.mjs` L37 用 `resolve(HERE,'..','..')` 推导仓库根，说明作者在同一份文件里**已经**做了目录可移植；被绑定的只是**默认值**，而且 `L106` 明确接受 `--chrome/--python` 覆盖。也就是说：C1/C2 那种"换个目录必失败"的性质，`shot.mjs` **没有**。

**裁定：误报。** 可改为一条"可选补充"（在 README 的依赖列表后加一句默认路径说明），但不应计入"不一致"，更不该与 C1/C2 并列成"命令类 3 条"。

### §2-B【Q2】「逐字节复算」—— 缺陷成立，但"互斥/自相矛盾"定性过强，且漏报同源 2 处

它说 L30 与 L162「两处相距 130 行，**结论相反**」「**互斥**」。我的读法：

- L30 的主语是**工具链能力**：「14 个确定性纹理生成器（参数落盘可逐字节复算）」——`make-textures.py` 是确定性的、且**确有** 12/30 案把参数写进了 `build/texture-job.json`（我逐案核过）。这句为真。
- L162 的主语是**仓库交付状态**：「那份参数文件没进仓库……克隆者核不了」。这句也为真。

两句的主语不同，**可以同时为真**——这是"声明 + 警示"，不是"互斥"。真正的缺陷是 **L30 缺限定词**（读者会以为克隆后可复算），以及 **`LICENSE` L41 把它当法律依据**（"无第三方权利"依赖一份不在库内的文件）。所以缺陷成立，**但定性应是"未加限定词的强声明"，不是"自相矛盾"**——按 §0-B，它至少漏掉了一种可复核的读法。

同时它**漏报两处同源**：`LICENSE` **L37–L38 / L41**（「生成参数记录在 `build/texture-job.json`…可逐字节复算」）与 `README` **L160 / EN L166**（「参数落盘（各案 `build/texture-job.json`）可逐字节复算」）载有**同一句**。真正需要收口的是 **4 处**（README L30、README L160、LICENSE L41、EN L30/L166），它只点了 1 处。

**裁定：部分成立。**

### §2-C【D4】「少数原型」= 13/30 —— 事实成立，"不一致"定级过重

13/30 = 43%，"少数"确实宽松，**这一点它是对的，我不辩护数字**。但我要反对的是**定级**：

1. 同一句已经给出**两个可复算的边界**：「在 30–48.4 KB（最大的 S29 是 49,512 B）」——读者拿到的是**区间下界 + 最大值 + 逐案可查**；这不是"掩盖分布"，而是"量词宽 + 数据全"。
2. 它把这条与 D1/D2/D3 并列成"数字不一致"，会让读者以为发生过计数错误。实际上**没有一个数字错**，只是量词选择。
3. 判据：按 §0-B，"少数"能被读成"相对 30 案的多数而言是一小部分"（13 < 17）——**存在一种可复核的读法使其为真**。这是量词之争，不是事实之争。

**裁定：部分成立 → 建议记为"措辞精度 / 低"，并明说"数字与名单全对"。**

### §2-D5 附注【D5】我把它的结论加重了（这条我认，但要更正它的措辞）

它说「'链上最大单步'未定义链，读作上界则不成立」。我复算后认为：**不需要讨论"链"该怎么定义**——因为

- 宽口径判据本身给出的**16 条直连边里，ΔE76 最大 17.27、最小 1.44**；
- 4.39 那条边（S13–S27）**连宽口径直连都不算**（ΔL = 4.1）；
- 任何把整块连起来的生成树（完整图 MST / 宽边子图 Kruskal）最大单步分别是 **5.47 / 11.04**。

所以正确的表述不是"未定义链"，而是：**4.39 只是"块内某一对案子的距离"，它不承担"最大单步"这个修饰语**。建议改法（与它一致，但把理由换掉）：`S13–S27 底色 ΔE76 = 4.39；该 12 案块的最小生成树最大单步为 5.47（S29–S22），块内最远两案 S13–S22 为 17.27`。

### §2-E 头条数字的口径：它的「命令实测通过率 3/3」应写成「2/3 逐字 + 1/3 改参」

它 §4 的总表写「可实跑且允许实跑的 **3/3 通过**」。逐条看：

| # | 文档原命令 | 它实际跑的 | 是否逐字 |
| --- | --- | --- | --- |
| C02 | `node prototypes/_build/verify-prototype.mjs --all` | 同（我复跑同值） | **逐字** ✅ |
| C03 | `… --out .shots --widths 1440,768,390 --name S14` | `--out _crit10b/shots` | **改了 1 个文档参数值** ⚠️ |
| C04 | `python -m http.server 8080` | `… 18080` | 端口必改（环境占用），实质逐字 |

它把 C03 的改参写明了（§4.2 的注），**不算隐瞒**；但"3/3 通过"这个头条会让读者以为文档命令原样跑通。建议写成「**2/3 逐字通过，1/3 改参通过（`--out` 的值被替换，见 §2-P2）**」。这不改变它 C03 = ✅ 的判定，只是头条口径。

---

## §3 它判「准确」的项里我抽核出的问题

**抽样规模：它 §5 的 32 条我独立复算了 31 条**（唯一未全量复算的是 Q04 的"15 个 URL 全 200"清单，我只用 `python -m http.server 18499` + Chrome 实载 S04 页面证明"零配置、站点根 = 仓库根"成立）。**31 条里 27 条完全通过，4 条有问题。**

### §3-1【实质判松】§5#31：`_selection/index.html` L83 它不是"逐字命中"，它替一句假因果背书了

它判 ✅：「`index.html` L83「展开它的**全部字段**……**多数案 10 段；S12/S15/S19 只有 9 段**」——`app.js` L335–346 恒发 10 个 `field()`…**逐字命中**」。

段数部分**确实**逐字命中（我复算：10 段、3 案 9 段）。**但它核的是数字，没核同一句话里的因果从句**：

> L83 原文：「…（多数案 10 段；**S12/S15/S19 因规格里没有独立的「布局与网格」段**只有 9 段）」

我逐案打开 `prototypes/_specs/`：

```
S12.md L25:  **5. 布局与网格**
S15.md L25:  **5. 布局与网格**
S19.md L25:  **5. 布局与网格**
S16.md L25:  **5. 布局与网格**   ← 对照组，同格式、不同结果
```

**三个案子的规格里都有独立的「5. 布局与网格」段，还带正文。** 真正的原因是抽取环节：`collect-schemes.mjs` **L186**

```js
layout: spec && spec.fields['布局与网格'] ? spec.fields['布局与网格'] : '',
```

—— 这条机械切分对 S12/S15/S19 失效（S16 同格式却成功），于是 `data.js` 里这三案的 `layout` 为空。所以 L83 的解释**是假的**，而它把这个解释当成"仓库内部已有的正确答案"来支撑自己的 D2 结论，**并在 D2 的"可直接替换"文本里原样照抄**（§2-D2 替换文本：「S12／S15／S19 为 9 段，**因规格里没有独立的「布局与网格」段**」）。

**这是本次我唯一认定它有实质问题的一条**：它抓到了"README 说 12 字段"这个表面矛盾，却把表面矛盾旁边的错误归因当成事实。可复核：`prototypes/_specs/{S12,S15,S19}.md` 的 L25 + `prototypes/_build/collect-schemes.mjs` L186。

### §3-2【结论对、证据标签错】N02 / §5#2：「30 份 `report.json` `images[]` 合计 272」

实测：`report.json` 的 `images` 数组长度 = **90**（30 案 × 3 档，每档一条 `{viewport,width,fold,pages[]}`）；`272 = 90 个 fold + 182 个 page`（我复算：`data.js` `shots` 路径合计 **272**、每案 fold 合计 **90**、`.inspect` 里 jpg+png 合计 **272**）。所以：

- **272 这个数字是对的**，它"90 fold + 182 page"的拆解也是对的；
- 但"**`images[]` 合计 272**"这个标签不成立（`images[]` 长度是 90）。三个真正能得出 272 的口径它漏写了两个（`data.js` 的 `shots` 路径、`.inspect` 文件数）。

属"结论对、证据表述失准"，不计缺陷，但**报告里的证据行应改**，否则下一个复核者按 `images[]` 去数会得到 90 并怀疑整条。

### §3-3【结论对、归属写错】§5#27 / Q07：「原型页 **CSS** 里确有 `../_fonts/css/` 引用」

实测 **30/30 案的引用都在 `index.html` 的 `<link rel="stylesheet" href="../_fonts/css/*.css">`，`style.css` 里 0/30**。结论（"单个原型要独立跑必须带上 `prototypes/_fonts/`"）成立，我逐案列出 30 条 `<link>` 都命中；但"CSS 里"是**错的文件**。读者按它这句去 `style.css` 里搜会搜不到。

### §3-4【小口径膨胀】Q1：「M01 有 3 处」

3 处里 **L560 是 `box-shadow:none`（复位，不是阴影）**。实体阴影 2 处（L204 hero、L284 卡片），**它自己的替换文本写的正是"2 处实体阴影"**——同一份报告里两个口径打架。这处 3 已被写进修后的 README（`README.md` L54「M01 有 3 处」）。建议统一为"M01 实体 2 处（另 1 处 `none` 复位）"。

### §3-5【已复核它转引的三项工具版本，无误】

`Node v26.12.1` / `Pillow 12.3.0` / `Chrome 155.0.8059.85` —— 我逐个实测，**与它 §4.6 完全一致**。

### §3-6 抽核通过的 27 条（逐条数字）

| 条目 | 我的独立复算 |
| --- | --- |
| N01 / N14 闸门 | `report.json` 逐份复算 **PASS 26 / FAIL 4**；FAIL 逐条 id：S07 `mono`(1)、S08 `palette-terracotta`+`font-count`(2)、S13 `mono`+`shadow`+`button-fx`+`empty-screens`(4)、S21 `mono`(1) = **8 条**。与它逐条吻合 |
| N03 F/R | `data.js` `fr` = `{F:15, R:15}` |
| N04 家族不重复 | `family` 30 取值、去重 **30** |
| N06 纹理生成器 | `gen_*` = **14**，逐个列名一致 |
| N07 12 个 CSS 变量 ×3 | 三模板 `:root` 声明数 = **12 / 12 / 12** |
| N09 仓库约 180 MB | `12f2a1e` 上 `ls-tree -r -l` = **2,015 blobs / 185,253,754 B = 176.7 MB** —— **精确命中它的数字**（HEAD 已变 2,017 / 176.8 MB） |
| N11 占位文本 | S14 `待页面引用` = **28**、S15 = **7** |
| N12 「见来源页」 | 全库 **11** 行（S20=2 S21=1 S22=2 S23=5 S24=1） |
| N15 暖浅色带 | 判据 `H 28–72° 且 L≥78` → **18/30 = 60.0%**（成员 18 个逐号对上） |
| N16 宽口径 12 案块 | 连通分量最大块 = **12**，成员 `S01 S04 S06 S13 S16 S17 S19 S21 S22 S25 S27 S29` —— **与它和 `deliverables/29` §1c 逐号一致** |
| N17 `ΔE76≤5` | 分量大小序列 `19,7,2,1,1` → 最大 **19 案（63.3%）**，成员 19 个与它逐号一致 |
| N19 83% / 97% | `nav.links==0` = **25/30 = 83%**；`buttons.radius + surfaces.boxRadius + surfaces.mediaRadius == 0` = **29/30 = 97%**（唯一非零是 S14）——**两条都精确复现** |
| N20 / N21 口径表 | 严连续 **8** / 严取整 **12** / 宽连续 **17** / 宽取整 **22**；`ΔE76≤5` 对数 **53** —— 与 `deliverables/29` §0.4 全对 |
| N22 `axes.loud` | `{就要扎眼:19, 有态度不吵:9, 很安静:2}`；`tone` 7 词最大 **5** |
| N23 色相桶 | 非无彩案占 **11** 个 10° 桶（2,3,4,6,10,12,15,19,20,22,24）；最长连续空段 **11 桶 = 110°（250°–360°）**；`L∈[20,60]` = **0 案** |
| N24 `index.html` 体积 | S29 = **49,512 B**；≥30 KB = **13** 案（名单全对） |
| N26 字体样式表 | `prototypes/_fonts/css/*.css` = **48** |
| N27 「二十多处」 | `_CURRENT-VALUES.md` §1 表 **30 行**，括号内含旧 HEX 的 = **23 行**；全文件括号内 HEX = **29 个** |
| Q02 系统字体栈 | 三模板 `--font*` 全为 `system-ui/-apple-system/"Segoe UI"/Georgia/"PingFang SC"/"SimSun"` 等 |
| Q05 根 `index.html` 跳转 | L11 `meta refresh 0; url=./prototypes/_selection/` + L12 `rel=canonical` |
| Q06 `.nojekyll` | 受跟踪；页面 `/` 与 `/.nojekyll` 均 200 |
| Q09 模板无第三方素材 | 三目录各 **4 个文件**（index/style/README/TOKENS），位图 **0**、`https?://` **0** |
| Q11 390 档 iframe | 我复跑 `shot.mjs`：**`[390x900] mode=iframe window=516x995`** |
| Q12 `texture-job.json` | 磁盘 **12/30**（S18–S24、S26–S30），名单与它一致 |
| §5#30 选型台文案 | L38「九组…前四组…后五组」；`data.js` `axes` 恰 **10** 键（ground, groundL, band, bandHue, bandL, bandSat, load, words, loud, chroma）——数字自洽 |
| §5#32 实测值来源 | L38 第二句列的 4 类输入与 `axes.groundL/bandHue/bandL/bandSat/words/chroma` 一一对应 |

---

## §4 它判「无法验证」的项里其实可验证的（9 条里 **6 条**）

它的 🔒 分类理由写得很克制（"不是没找到证据，而是本环境或写范围不允许"），但**其中 6 条我实做了，4 条证明为真**。

| # | 它判 🔒 的项 | 我的实做 | 结论 |
| --- | --- | --- | --- |
| §6#1 | 像素级数字：S08 `desktop-page-03` `#888888` 占 **49.86%**、S17 `desktop-page-01` **24.27%** | Pillow 逐像素统计 `prototypes/S08-amber-overprint-lightbox/.inspect/desktop-page-03.jpg`（1600×500）与 `S17-revenue-stamp-stub/.inspect/desktop-page-01.jpg`（1600×1000） | **已验证为真**：精确 `#888888` = **49.94%** / **24.41%**，与文档差 **0.08 / 0.14 个百分点**（`.inspect` 存的是有损 JPEG，原测量用的是 PNG，偏差方向与量级完全合理）。**该项不该判 🔒** |
| §6#2 | `file://` 下 `mask-image` 失效 +「**5818** 种颜色 vs **2** 种颜色」 | 起 `python -m http.server 18499`，用真 Chrome 155 对同一 URL 出两张 1456×995 PNG（http / file），Pillow 对比：整视口 distinct colors **11,632 → 2,835**；两图差异的包围盒 **704×308**（x200–903, y687–994）内 distinct colors = **8,908（http）vs 1（file，216,832 像素全是底色 `#F0E2C8`）** | **已验证为真**（方向、量级、机制全对：掩码元素在 file 下整片塌成底色）。我给的 8,908 vs 1 与文档的 5818 vs 2 是**同一现象的不同区域**。**该项不该判 🔒** |
| §6#3 | 「被引用的 **287** 张位图 / 约 **183** 张派生件」 | 按 `deliverables/30` **§0.2 逐条列出的正则与 YES/SIBLING/STEMONLY 判法**自己重写了一遍（语料 65 个文件、图像清单 397 个，对照它 398） | **前半可验证**：我的独立实现得 **YES = 293**（对 287 差 **+6 = +2.1%**，来自我第 4 条兜底引号正则按它的写法更宽 + 语料差 1 个文件）。**后半（183 的归属）确实难**：它依赖"生成器归属"，而**只有 12/30 案有 `build/texture-job.json`** —— 这半条 🔒 成立。它自称"口径不同未能复现"是对的，但它用的是**文件名启发式**（得 180），而 30 号用的是**文档化的引用判法 + job 记录**，两者不是同一个口径——**它至少可以把 287 复现出来** |
| §6#5 | 「Chrome 最小窗口宽约 **500** CSS px；`--window-size=768,1024` 实际 `innerWidth` 只有 **752**」 | 真 Chrome 探针（`--headless=new --dump-dom`）：`--window-size=390,844` → **innerWidth=500**、`mq500=true mq390=false`；`--window-size=768,1024` → **innerWidth=752**；`--window-size=500,900` → 500；`--window-size=1456,995` → **1440** | **已验证为真，4/4 命中**。它说的"旁证"（`shot.mjs` `minWindowWidth: 500`、`frameW: 16`）之外，`deliverables/22` L18/L27 本来就存着探针页的原始输出。**该项不该判 🔒** |
| §6#6 | `measure` / `inspect.mjs` 的行为声明"可核性本身" | `tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs` **L447**：`measureChars: longest ? Math.round(longest.w / (longest.size * 0.5)) : null,` —— **0.5em 逐字命中**（它在 §4.6 也核到了） | **半条可验证**：在本工作区（`tools/` 有 302 个文件）完全可核且为真；在克隆副本不可核 —— 它对后半的判断成立，但"本工作区可核"这点它的 §6#6 写成了限制，其实是可用证据 |
| §6#8 | 「无空洞营销词」——它判「**无机械判据，不可验证**」 | 仓库**有**机械判据：`deliverables/02-anti-ai-rules.md` **§7.2「四十词对照表」= 恰好 40 个词**（赋能/解锁/一站式/无缝/…/开启新篇章），配 **R-25** 检测口径、**V-04** 否决、**§9 D-08** 给了现成正则 `grep -nE '…'`。我用 D-08 正则跑三模板：**index.html 0 命中、style.css 0 命中（3/3 模板全 0）**；把 40 词全表逐词扫，命中的只有三类合法情形：① M01 的 `README.md` **在引述黑名单本身**（§7.1 规则 2 允许批判性引用）、② `聚焦` 是键盘 "focus" 的同形词、③ M02 的 `一键` 出现在**否定句**里（§7.1 规则 2 允许）。**零真实违规 → 声明为真** | **它这句是事实错误**：判据存在、就在同一份文档链里（`02` 号 §7.2），且我实测声明成立 |

**维持不可验证的 3 条**：§6#4（线上可访问性 / `npx` / `php` / `gh`，本环境直连外网不通）、§6#7（`templates/M0x/README.md` 的"用途级理由"——属**论证**不是断言，它按口径排除是对的）、§6#9（`deliverables/` 文档链内部自洽，它自限范围，合理）。
**另**：§6#1 里还夹着一句「246 张 PNG 全量扫描，最高 **0.236%**」（引 `deliverables/21` L346/L370）——那批 PNG 不在仓库内，我只验证了旁边两个占比数，**这半条维持不可验证**。

---

## §5 §4 命令实测的复核（含那个"主动不跑"的理由）

### 5.1 逐字复跑

| 命令 | 我跑的结果 | 与它是否一致 |
| --- | --- | --- |
| `node prototypes/_build/verify-prototype.mjs --all` | **exit 1**；44 行（它记 45，差 1 属计数口径）；末行「**达标 26 / 不达标 4 / 共 30**」；S07/S08/S13/S21 四行 ✗ 与 FAIL id 如上 | **结论完全一致**（只读脚本，无副作用；我复跑后再查 `git status` 无变化） |
| `node prototypes/_build/shot.mjs prototypes/S14-…/ --out … --widths 1440,768,390 --name S14` | **exit 0**；`1440 mode=direct window=1456x995`、`768 mode=direct window=784x995`、**`390 mode=iframe window=516x995`**；页高 7569/9250/12161、切片 9/11/14；字体 `loaded`、断链图 0；`失败 0 档：[]`；6 次 `/favicon.ico` 404 | **完全一致**（我改的也只有 `--out`，落到 `deliverables/38-scratch/shots`，被 `.gitignore:62` 覆盖） |
| `python -m http.server` | 我起在 **18499**，`/.nojekyll` → 200；Chrome 经 http 成功出图（用于 §4 的像素对照） | **实质一致**，但**它那条"15 个 URL 全 200"的清单我没重跑**，只证明了"零配置、站点根 = 仓库根"成立 |

### 5.2 那个"主动不跑"（C01 / `render-scheme.mjs`）的理由**成立**

它的理由是：该脚本的输出目录是**受跟踪的既有产物**，跑它会越过"不许改任何原型"的写范围。我逐项核：

```
render-scheme.mjs L28: const outRel = `prototypes/${name}/.inspect`;
render-scheme.mjs L30:  INSPECT, `prototypes/${name}/index.html`, '--out', outRel, '--widths','1440,768,390','--json'
render-scheme.mjs L31:  { cwd: ROOT, stdio: 'inherit' }
render-scheme.mjs L33: const rep = join(dir, '.inspect', 'report.json');

git ls-files | Select-String '\.inspect/'   → 321 个受跟踪文件
   其中 jpg 282 / report.json 31 / png 3 / other 5
```

**321 个 `.inspect/` 文件在 `git ls-files` 里**（含 31 份 `report.json`）。所以：跑 `render-scheme.mjs` 会**就地改写受跟踪的 `S14/.inspect/*.jpg` 与 `report.json`** —— **它的"主动不跑"理由成立，不是规避**。（我中途一度用错误的引号写法得出"0 个受跟踪"，随后用 `git ls-files -- prototypes/S14-…/.inspect` 与全库 grep 两法重核，纠正为 321。这条我自己先错后对，记在这里。）

### 5.3 那它还算不算"可跑的文档命令"？——**分两半，且两半都指向 C1 成立**

| 口径 | 事实 | 判定 |
| --- | --- | --- |
| 本机（`D:/Web/style`） | `Test-Path tools/…/inspect.mjs` = **True**（磁盘 302 个文件），ROOT 恰好正确 | **可跑** |
| 按 README 的部署流程 clone 后 | `git ls-files tools` = **0**（`.gitignore:2` 整目录排除），`LICENSE` §4 自认两个工具「均未包含在本仓库中」；且 `ROOT` 写死 `D:/Web/style`，README 阶段 1 教读者 `cd web-style-atlas` | **必失败**（找不到 inspect.mjs；且若该路径存在会去操作别的仓库） |

所以：**它算"给出即可执行"的文档命令，且按 §0.2 判据 4 缺陷成立**——(a) 满足、(b) 不满足。它用**静态前置条件**替代实跑是合理的取证方式，结论也**已经被我独立证实**（321 个受跟踪 + 0 个受跟踪 `tools/`）。**它 §7#2 自述"这是本报告唯一一处命令类结论未由实跑支撑"是诚实的，而且这处不做实跑反而是对的。**

### 5.4 一条环境事实（支持它、也支持我另加的限制）

我落笔前一度观察到 `git status` 里出现 `M prototypes/S07-slate-ink-contents/.inspect/report.json`、`M …/tablet-fold.jpg`、`M …/index.html` 与 `?? prototypes/_build/check-anchors.mjs`（**别的进程正在重渲染受跟踪产物**），随后被提交；HEAD 也从 `5c4209d` 推进到 `f8cf3e6`。**这反证了 C01 的谨慎有实据**：这个仓库里 `prototypes/<案>/.inspect/` 确实会被并发改写。

---

## §6 我辩护失败（它是对的）——诚实分类

**12 条里 11 条它站得住，1 条我判误报。**

| 我失败的程度 | 条数 | 条目 |
| --- | --- | --- |
| **完全无法辩护**（结论与数字全对，我拿不出反证） | **3** | D3（M02 TOKENS 13 vs `:root` 12，`--ring` 在 L298/L448）、D5（4.39 不是任何自然链的最大单步——**我复算后把它的结论加重了**）、C2（`verify-prototype.mjs` L12 写死 ROOT） |
| **只能争"写作时成立、现已修"**（缺陷实存，只是已被改掉） | **5** | D1、D2、P1、C1、Q1 —— 其中 **D1/D2 的修复只落在 CN 一侧，EN 仍是 `38` 与 `twelve fields`**（`README-EN.md` L20/L163），这使"已修"实际只完成一半 |
| **只能争"降级"**（事实成立，但"不一致"的定性过重） | **2** | D4（13/30，"少数"是量词精度不是计数错误）、P2（`.shots` 不被忽略是真，定级应为"低/一致性"） |
| **只能争"定性"**（缺陷成立，但"自相矛盾"过强 + 它漏报同源 2 处） | **1** | Q2（LICENSE L37–L38/L41 与 README L160 载有同一句） |
| **真误报** | **1** | C3（README 未作默认路径断言；它自己的 §7#7 自限范围把这类排除；`shot.mjs` L37 用 `HERE` 推导仓库根 + L106 有覆盖位） |

**在它判"准确"的 32 条里我失败的也是压倒性的**：31 条复算，27 条全通、4 条只有表述瑕疵，**实质判松只有 1 条**（§5#31 的因果从句），而那条恰恰是它拿来支撑自己 D2 结论的"仓库内部正确答案"。
**在它判"无法验证"的 9 条里我推翻它 6 条**——这不是"它错得多"，而是**它把可验证的项过度保守地归入 🔒**（它的口径是"我没做像素对照就叫不可验证"）。这几条我实做后**全部证明文档为真**，等于替它把覆盖率补上。

---

## §7 本次辩护的限制

1. **快照是 git 对象，不是磁盘副本**：我绑 `12f2a1e`（四个 sha256 与它的表逐一吻合），因此我的行号对"它审的那一版"有效。磁盘在期间被推进到 `f8cf3e6`；`README.md`（04:39:15）与 `README-EN.md`（04:37:40）自 `5c4209d`/`d403603` 起未被新提交触碰，故"已修"结论成立。
2. **我同样没跑 `render-scheme.mjs`**（理由与它一样且已被我独立证实：`.inspect/` 321 个受跟踪文件）。所以我对 C1 的判定也**只建立在静态前置条件 + `.inspect` 受跟踪统计**上，不是运行结果。
3. **外网不通**：线上可访问性、`npx serve`、`php -S`、`gh api …/pages`、平台表（Cloudflare/Netlify/Vercel 留空是否可行）一律未验。
4. **"被引用 293 张"是我的重写实现，不是逐条对齐**：我给 293、30 号给 287（+2.1%），差异来自我第 4 条兜底引号正则更宽 + 图像清单 397 vs 398。这是**口径差不是复现失败**，但必须列为"我未能逐条对齐 287"。
5. **像素对照的区域不是原测量区域**：`5818 vs 2` 我用的是"两图差异包围盒"（8,908 vs 1）与整视口（11,632 vs 2,835）。**我验证的是机制与量级，不是那个精确数字。**
6. **`#888888` 用的是有损 JPEG**：`.inspect` 里是 `.jpg`，原测量用 PNG。我的 49.94% / 24.41% 比文档的 49.86% / 24.27% 各高 0.08 / 0.14 pp，方向一致（JPEG 会把邻近像素往 `#888888` 拉齐），但不能当"精确复现"。
7. **`deliverables/21` 的"246 张全量扫描 / 最高 0.236%"我没核**：那批 PNG 已不在仓库内，需要重建采样环境；这半条维持不可验证。
8. **我只核了"文档 → 仓库"与"命令能否跑"两个方向**：不评文笔、不评结构、不评完整性（这与它的自述范围一致）；§2-A 对 C3 的反对，正是**它自己在 §7#7 划出范围却又计了分**，而不是我要求扩范围。
9. **我未核 `deliverables/29` 与 `30` 之外的文档链内部自洽**（那是别的审查员的活）；`29` 的底色表 30 行与我的复算**逐行一致**，`30` 的 §0.2 判法我按其文字重实现。
10. **只写两个位置**：本文件与 `deliverables/38-scratch/`（被 `.gitignore:62 deliverables/*-scratch/` 覆盖，`git check-ignore -v` 已证）。收尾 `git status --porcelain` 为空。

---

## 附 · 证据索引（命令 + 关键数字，全部内联，不依赖临时目录存活）

```
# 快照绑定（critique 快照 = 12f2a1e）
git cat-file -p 12f2a1e:README.md            → 18702 B / LF 205 / sha256 C7F59E06330BD2ED
git cat-file -p 12f2a1e:README-EN.md         → 21317 B / LF 205 / sha256 F5DB862E1FA81243
git ls-tree -l HEAD -- README.md             → 19703 B（= a1d0931…/f88d95f…）
git log --oneline -S "38 张" -- README.md    → 引入 bce1814、移除 d403603

# 数字复算（Node 26 / 无第三方依赖）
D:\Nodejs\node.exe deliverables\38-scratch\check6.mjs   同质：18/30、12 案块、19 案 63.3%、8/12/17/22/53、11 桶/110°/0 案
D:\Nodejs\node.exe deliverables\38-scratch\check7.mjs   闸门 26/4/30 + FAIL 8 条
D:\Nodejs\node.exe deliverables\38-scratch\check8.mjs   「链」4 种构造：5.47 / 5.78 / 11.04 / 17.27；S13–S27 不是宽边
D:\Nodejs\node.exe deliverables\38-scratch\check1.mjs   box-shadow 3/0/1、TOKENS 12/13/12、:root 12/12/12、index.html 13 案 ≥30 KB、shot.mjs 默认 .shot
D:\Nodejs\node.exe deliverables\38-scratch\check11.mjs  data.js shots=272 / fold=90 / .inspect=272 / report.json images[]=90；30/30 案 <link ../_fonts/css/>
D:\Nodejs\node.exe deliverables\38-scratch\check9.mjs   按 30 §0.2 复现被引用位图 = 293（对照 287）

# 像素（Pillow 12.3.0，Python 3.12.14）
python px3.py prototypes/S08-amber-overprint-lightbox/.inspect/desktop-page-03.jpg 3 → exact #888888 49.94%（1600x500）
python px3.py prototypes/S17-revenue-stamp-stub/.inspect/desktop-page-01.jpg 3        → exact #888888 24.41%（1600x1000）
python px2.py s04-http.png s04-file.png → 差异包围盒 704x308；该区内 distinct colors 8908 → 1；整视口 11632 → 2835

# 真 Chrome（155.0.8059.85）
chrome --headless=new --dump-dom --window-size=390,844  file:///…/probe.html → innerWidth=500 mq500=true mq390=false
chrome --headless=new --dump-dom --window-size=768,1024  file:///…/probe.html → innerWidth=752
chrome --headless=new --dump-dom --window-size=1456,995 file:///…/probe.html → innerWidth=1440
chrome --headless=new --screenshot=… --window-size=1456,995 http://127.0.0.1:18499/prototypes/S04-mango-collage-wall/index.html
chrome --headless=new --screenshot=… --window-size=1456,995 file:///D:/Web/style/prototypes/S04-mango-collage-wall/index.html

# 命令复跑
D:\Nodejs\node.exe prototypes\_build\verify-prototype.mjs --all   → exit 1；达标 26 / 不达标 4 / 共 30
D:\Nodejs\node.exe prototypes\_build\shot.mjs prototypes/S14-zero-g-launch-sequence/ --out deliverables/38-scratch/shots --widths 1440,768,390 --name S14
                                                                 → exit 0；390 档 mode=iframe window=516x995；失败 0 档

# 受跟踪状态
git ls-files | Select-String '\.inspect/'   → 321（jpg 282 / report.json 31 / png 3 / other 5）
git ls-files tools                          → 0 行；tools/ 磁盘 302 个文件
git check-ignore -v tools/…/inspect.mjs     → .gitignore:2:tools/
git check-ignore -v .shots/x.png            → exit 1（未被忽略）；.shot-test/x.png → .gitignore:45
git check-ignore -v deliverables/38-scratch/check1.mjs → .gitignore:62:deliverables/*-scratch/

# 40 词黑名单（"无空洞营销词"的机械判据）
deliverables/02-anti-ai-rules.md L593 §7、L602 §7.2（40 词）、L355 R-25、L580 V-04、L89 D-08 正则
→ 三模板 index.html / style.css 用 D-08 正则均 0 命中
```

**落盘自检**：`D:\Web\style\deliverables\38-critique-doc-intent-defense.md`（本文件）与 `deliverables/38-scratch/` 下的脚本与转储（`check1..check12`、`*.txt`、`px*.py`、`probe.html`、`s04-{http,file}.png`、`snap/`）。除本文件外无任何受跟踪文件被创建或修改。
