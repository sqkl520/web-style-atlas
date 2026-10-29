# 第 70 轮计划：把四个数据缺陷修进提示词（`dna-clean.json` → `prompts.js`）

> 本文件的所有数字都由 `deliverables/70-plan/probes/` 下的探针实测产出，括号里给命令。
> 每一条声称都能用一条命令重跑；不能重跑的声称我不写。

---

## 开工基线

| 项 | 值 |
|---|---|
| `git rev-parse HEAD` | `03f6fd47e364c43dffdf240f3eb298987f840625` |
| `git status --porcelain` 已跟踪文件被改 | **0**（1717 条全部是 `??` 未跟踪，均在 `deliverables/`） |
| 记录时刻 | 2026-10-29T22:43:36+08:00（Asia/Shanghai） |
| node | v26.12.1 |
| Chrome（CDP 探针用） | `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| 本次写入范围 | 仅 `deliverables/70-plan/`（报告 + `probes/`） |

> ⚠️ **收尾时这个 0 变成了 4**，且不是本 Agent 造成 —— 存在并发的第二个写者。
> 完整证据与影响见 **§12.1**。读这份计划前请先看那一节。

**必读报告存在性核对（先确认再读，全部存在）**

| 文件 | 字节 | mtime |
|---|---|---|
| `deliverables/69-audit/PROMPT-VERIFIABILITY.md` | 57,400 | 2026-10-29 03:33 |
| `deliverables/69-audit/PATCH-linewidth.md` | 47,892 | 2026-10-29 03:56 |
| `deliverables/69-audit/UNVERIFIABLE.md` | 28,565 | 2026-10-29 03:56 |
| `deliverables/69-test/REPORT.md` | 26,386 | 2026-10-29 03:26 |
| `deliverables/69-plan/PLAN-five-gaps.md` | 52,374 | 2026-10-29 03:51 |
| `deliverables/69-plan/LEAD-color-violation-finding.md` | 6,800 | 2026-10-29 03:56 |
| `deliverables/69-plan/LEAD-dimension-gap.md` | 7,108 | 2026-10-29 03:48 |

---

## 0. 先说结论（一页）

| # | 缺陷 | 根因（文件:行号 + 函数） | 我的推荐修法 | 影响 30 条提示词？ |
|---|---|---|---|---|
| 1 | 参考页用了色板外颜色 | `clean-dna.mjs:511` `pickPalette()` 的 `MAX = 7` + `:516` 的 `rootHexes` 白名单 | **不是「20/30 都要补」**。实测只有 **7 案 11 色**是真正的骨架色缺失 → 补这 11 色，其余按实现漂移处理 | 7/30 变化 |
| 2 | 从不给字号层级 | `extract-dna.mjs:111-114` 只抽 h1；**`prompt-copy.js:280-286` 的 `h1Size` 事实句在死分支里** | 抽出「桌面实测 h1 px + 正文 px + 倍率 + 档数」，写进硬约束段 | 30/30 变化 |
| 3 | 色板给值不给配比 | `build-prompts.mjs:261-273` 只格式化 hex，丢弃一切面积/频率 | 给每色附实测占比（像素% 与墨迹% 取大者），≥3% 才标 | 30/30 变化 |
| 4 | 线宽 | `clean-dna.mjs:452-502` `lineWidthVerdict()` 只读 `style.css`，读不到 `index.html` 内联 `stroke-width` | 传入 `index.html` 一并抽；并把「不要自创第三级」改成与档数一致的措辞 | 档位：**21/30**（原始口径）/ 措辞：9/30 |

**本次计划最重要的三个新发现（都是本轮实测、不在任务书里）**

1. **缺陷 2 比任务书说的更严重：`h1Size` 在 30/30 案里**一个都**没进提示词**，不是「29/30 缺失」。
   原因是死分支（证据 §2.2）。任务书说的 29/30 是「dna-clean.json 里没有值」，
   而实际上连有的那 26 个值也从未被渲染。**结论不变（要修），但修的位置不是补数据，是接线路。**
2. **生成链目前不可复现**：`dna-raw.json` 与 `dna-clean.json` 重跑后与 HEAD 不一致（`p4-repro.mjs` 退出码 1）。
   `prompts.js` 反而字节一致。根因是 S07/S13/S21 的 `style.css` 里混进了带 `EXEC-mono-empty.md` 字样的**事故注释**，
   被 `extract-dna.mjs:55` 的 `font-family` 正则吞进字体名。**修数据前必须先决定这三处注释怎么办**，
   否则任何重生成都会顺手把脏字体名写进 `dna-raw.json`。详见 §5。
3. **修缺陷 2/3 一定会让 `check-docs` 的 `nums/prompt-len` 报红**（实测：中位 1829 → 1894，偏差 3.43% > 容差 3%）。
   所以「改数据」这个动作**必须包含改 README 的两个数字**，否则闸门从 0 FAIL 变 1 FAIL。详见 §4。

---

## 1. 链路与数据形状（先摆事实，后面所有行号都对着这张图）

```
prototypes/Sxx-*/style.css + index.html
        │
        │  extract-dna.mjs      ← :root 的 hex / 字族 / 圆角 / 阴影 / 线宽 / h1 字号 / 机制句
        ▼
prototypes/_prompts/dna-raw.json     (30 rows，tracked)
        │
        │  clean-dna.mjs        ← 展开 var()、判圆角语义、选调色板、判线宽档位、解析字体栈
        ▼
prototypes/_prompts/dna-clean.json   (30 rows，tracked)
        │
        │  build-prompts.mjs    ← 拼人话版/场景/内容量/risk/reuse，格式化 palette
        ▼
prototypes/_selection/prompts.js     (window.STYLE_PROMPTS，tracked，60,460 B)
        │
        │  prompt-copy.js:151 buildPrompt()  ← 唯一模板真源
        ▼
window.buildStylePrompt(id)  → 1,639–1,998 字中文提示词
```

实测体积（`node deliverables/70-plan/probes/p5-fix-sim.mjs`）：现状 `1639–1998`，中位 `1829`。

---

## 2. 缺陷 2（字号）：根因在「死分支」，不在「没抽」

### 2.1 抽取链里只有一处 font-size 代码

```
$ grep -n "font-size|fontSize|h1Size" prototypes/_prompts/*.mjs
build-prompts.mjs:308   h1Size: d.h1Size,
clean-dna.mjs:708       h1Size: r.h1Size,
extract-dna.mjs:112     let h1Size = "";
extract-dna.mjs:113     const h1 = css.match(/h1\s*\{[^}]*font-size\s*:\s*([^;}]+)/);
extract-dna.mjs:114     if (h1) h1Size = h1[1].trim();
extract-dna.mjs:130     h1Size: h1Size,
```

全链路只有 `extract-dna.mjs:111-114`。它有三个硬缺陷：

- **只认裸 `h1 {}` 选择器**：`/h1\s*\{/` 匹配不到 `.masthead h1 {`、`h1.d1 {`，也匹配不到 `:is(h1, .lead){`。
- **不展开 `var()`**：S01/S09 抽出来就是字面量 `var(--fs-h1)`。
- **只抽一档**：正文、h2/h3、标签、数字档一概不抽。而原型平均有 5 档（§2.3）。

`dna-clean.json` 的现状（**在 HEAD `03f6fd4` 上**，`node -e` 直接读）：

| 情况 | 案数 | 案号 |
|---|---|---|
| `h1Size` 是 `var(--fs-h1)` 字面量（未解析） | **2** | S01、S09 |
| `h1Size` 是空串（CSS 里没有裸 h1 规则） | **4** | S03、S07、S13、S21 |
| `h1Size` 是 `clamp(...)`（随视口变，不是具体值） | **21** | — |
| `h1Size` 是具体 px | **3** | S04 `72px`、S25 `68px`、S30 `76px` |

（2 + 4 + 21 + 3 = 30，自洽。复算：`git cat-file -p HEAD:…/dna-clean.json` 后按 `var(` / 空串 / `clamp(` / `px` 四类计数。）

> **复核 Lead 的声称**：Lead 说「`h1Size` 有 2/30 未解析（S01、S09 仍是 `var(--fs-h1)` 字面量）」——
> **在 HEAD 上正确**，我复现了 2 条，案号一致。
>
> ⚠️ **但收尾时这个数变了**：并发 Agent 在他那一版 `clean-dna.mjs` 里已经修好了 `h1Size`。
> 收尾实测（23:24，工作区已被改）：`var` 字面量 **0**、空串 **0**、`clamp` **25**、具体 px **5**
> （S03 `68px`、S04 `72px`、S13 `56px`、S25 `68px`、S30 `76px`），**30/30 非空**。
> 也就是说 §2.1 的「抽取」缺陷**已经被并发 Agent 修掉**，
> **但 §2.2 的死分支仍然存在** —— 收尾复核「提示词里含字号/字级」仍是 **1/30**（仅 S22，来自机制句）。
> **这恰恰印证本计划的核心判断：真正让字号进不了提示词的是 `prompt-copy.js:277` 的死分支，
> 不是抽取。抽得再全，不接线路也到不了用户眼前。**

### 2.2 真正的根因：`h1Size` 的渲染代码在死分支里

`prompt-copy.js` 里 `h1Size` 只出现在一处：

```js
276:    var mech;
277:    if (d.mechanism) {
278:      mech = "这个风格的签名动作：" + d.mechanism;
279:    } else {
280:      var facts = [];
281:      if (d.radius === "全直角 0") facts.push("全站直角、零圆角");
282:      ...
284:      if (d.h1Size) facts.push("首屏主标题取 " + d.h1Size + " 这一档");
285:      mech = "这个风格的签名动作：" + s.plain + "。具体到实现：" + facts.join("；") + "。";
286:    }
```

`if (d.mechanism)` 恒为真：`build-prompts.mjs:104-112` 会把 `mechanisms.mjs` 的 20 条补进 `dna-clean` 里
`mechanism` 为空的案（那 20 条正是 S11–S30），于是 `prompts.js` 里 **30/30 都有 mechanism**。

实测（`node deliverables/70-plan/probes/p2-type-scale.mjs`）：

```
prompts.js: 有 mechanism 的案 = 30 /30
→ prompt-copy.js:277 if(d.mechanism) 恒真，:280-286 的 else 分支对 30 案不可达
```

反事实验证（把 S04 的 mechanism 临时置空，只改内存不落盘）：`else` 分支立刻生效，输出

```
…具体到实现：全站直角、零圆角；线宽只分 1px、3px 这几级；首屏主标题取 72px 这一档。
```

对照 30 条真实提示词：**`h1Size` 出现 0/30 次**。

> **这是本轮最容易被漏掉的一条**：任务书说「提示词从不给字号层级，29/30 案缺失（仅 S22 有）」。
> 我复核的结果是 **0/30**。S22 之所以看起来「有」，是因为它的**机制句原文**里恰好带了
> 「字号 17 与 16.5px」这几个字（`mechanisms.mjs` 的作者写的），不是因为渲染链路通了。
> 证据：`p2-type-scale.mjs` 抓「字号/字级句」，只有 S22 命中，且命中的整句是机制句本身。

### 2.3 原型真实的字号层级（1440 视口实测）

口径：每个有直接文本的元素取 `computedStyle.fontSize`，按字符数加权；
「档」= 承担 ≥1% 字符的不同 font-size。

| 指标 | 实测 |
|---|---|
| 档位数 | 中位 **5**，区间 **2–9**（S21 最少 2 档，S08 最多 9 档） |
| h1 渲染 px | 区间 **56–106.56**，27/30 ≥ 72px |
| 正文 px | 区间 **13–20**，众数 16 |
| h1 ÷ 正文 | 中位 **5.4**，区间 **3.73–7.10** |

而提示词里给 AI 的 px 值**全部来自线宽与版面尺寸**，没有一个是字号。
以 S04 为例（`node -e` 逐条打印 px 上下文）：

```
7px  ...色版偏移取 3 至 7px 五档          ← 偏移量
1px  ...5. 线宽只用这几级：1px、3px       ← 线宽
3px  ...5. 线宽只用这几级：1px、3px       ← 线宽
1px  ...但不许用 1px 图或纯色块顶替        ← 图片禁令
```

> 69-test 报告的「字号相似度 S20=0.03、S21=0.001」我用 `LEAD-similarity.mjs` 的口径读过：
> 它用「字号→面积」直方图做余弦相似度。0.03 意味着两边的字号面积分布几乎正交。
> 这与本节的结论一致：**AI 不是做错了字号，是从来没被告知要做几档、多大**。

---

## 3. 缺陷 1（色板）：根因是两道闸，但「该补多少」与任务书不同

### 3.1 抽取链：颜色只从 `:root` 来，且被白名单二次过滤

```
extract-dna.mjs:45-51   const vars = parseRoot(css);  ← 只读 :root 块
                        for (const v of vars) { const h = v.value.match(/#[0-9A-Fa-f]{3,8}\b/); ... }
clean-dna.mjs:510       function pickPalette(decls, rowColors, rawCss) {
clean-dna.mjs:511         const MAX = 7;
clean-dna.mjs:512         const rootHexes = rowColors.map(c => c.hex.toUpperCase());
clean-dna.mjs:516         if (h && primary.indexOf(h) < 0 && rootHexes.indexOf(h) >= 0) primary.push(h);
clean-dna.mjs:554-557     for (const c of rowColors) { if (chosen.length >= MAX) break; push(c); }
```

**两道闸，缺一不可**：

1. **只读 `:root`** → 散落在规则里的字面量色（S14 一个 `:root` 都没有、S02 的 `#0A0A0D` 写在 `.sheet{}`/`footer{}` 里）永远进不来。
2. **`MAX = 7` 截断** → 即使 `:root` 里有，也会被切掉。

S19 是第二道闸的纯样本（`node -e` 直接比对 raw 与 clean）：

```
S19 rowColors from :root = 10
  --paper #E4DECD / --paper-deep #D8CFB6 / --paper-lit #E9E3D2 / --wood #2A241C
  --wood-lit #3A3227 / --green #4A5C3A / --faded #7C7460 / --ink #2A241C
  --ink2 #5E5443 / --note-ink #534C3E
palette picked 7
DROPPED by MAX=7: --ink2=#5E5443  --note-ink=#534C3E
```

而 `#5E5443` 在 S19 的 `style.css` 里是**明文定义的次级墨**：

```
S19-copperplate-herbarium-cabinet/style.css:61   --ink2: #5E5443;       /* 次级墨（小字） */
S19-copperplate-herbarium-cabinet/style.css:62   --note-ink: #534C3E;   /* 批注小字墨 */
```

文件头注释还专门解释了为什么需要它：

```
style.css:16   小字次级墨用 #5E5443（对纸底 5.53:1）
style.css:19   正文一律用全墨 #2A241C（对纸底 11.43:1），次级才用 #5E5443
```

**所以 S19 不是「原型违反了自己的规则」，而是「原型有三个墨色，提示词只给了两个」。**

### 3.2 逐案判决：集合外的色到底重不重要（这是任务书的 Q3）

任务书要求「检查这些集合外颜色是否真的在视觉上重要（用 CDP 量像素面积/元素、是不是正文色、
是不是 SVG stroke 或伪元素），并给出每案的判定表」。我做了三层测量：

**方法（`probes/p1-pixel-share.mjs`）**

1. **像素层**：CDP 截 fullPage PNG（1440 宽，先滚到底再回顶触发懒加载）→ `decodePng` → 逐像素精确计数。
2. **墨迹层**：对每个有直接文本的元素，按 `字符数 × 字号² × 0.42` 估它的墨覆盖面积，
   按 `computedStyle.color` 归集 → 得到「这个色画了全文多少比例的墨」。
   这是「是不是正文色」最硬的判据：**一个色如果画了 30% 的墨，它就是正文色，与它出现几次无关。**
3. **元素层**：伪元素计数、SVG `fill`/`stroke` 计数、字号分布。

**方法学自我更正（写在前面，免得下一个人重踩）**：第一版我用「±6 容差桶」统计像素，
结果 S19 里一个 43% 的纸色邻居 `#DCD4BD` 被算成 19.2%，与纸色 `#E4DECD` 的 44.0% 几乎并列——
桶宽 6 会把所有相邻纸色混成一团，完全失去分辨力。**最终口径只用精确像素 + 墨迹占比**，
容差桶仅作参考列保留。

**判决结果（30 案全量，`node deliverables/70-plan/probes/p3-classify-deltae.mjs`）**

分类规则（纯算术、可复算）：
- `ΔE00 < 3` → **DUP**：与色板里某色「并排才看得出」的差别，属实现漂移，**不补**。
- `ΔE00 ≥ 3` 且 墨迹 ≥ 5%（或面积 ≥ 1%）→ **MISSING**：骨架色被漏，**必须补**。
- 其余 → **DECOR**：装饰色。

| 案 | 集合外 | MISSING（必须补） | DUP | DECOR |
|---|---|---|---|---|
| S06 | 2 | **#5A3A1C**（ΔE 11.87，墨 30.89%） | 0 | 1 |
| S14 | 6 | **#9A968C**（ΔE 13.13，墨 8.57%）、**#3A3630**（ΔE 12.25，墨 5.29%） | 1 | 3 |
| S15 | 5 | **#4C5257**（ΔE 6.40，墨 11.15%） | 1 | 3 |
| S19 | 5 | **#5E5443**（ΔE 11.60，墨 12.98%） | 2 | 2 |
| S24 | 6 | **#6E8B7A**（ΔE 28.10，墨 6.23%）、**#1B1136**（ΔE 16.77，面积 12.28%）、**#2A1B50**（ΔE 17.53，面积 1.58%） | 0 | 3 |
| S25 | 3 | **#4A423A**（ΔE 13.19，墨 30.77%） | 0 | 2 |
| S30 | 3 | **#2B2B2B**（ΔE 7.16，墨 49.80%）、**#4A4A4A**（ΔE 17.20，墨 10.59%） | 0 | 1 |
| 其余 23 案 | 51 | **0** | 5 | 46 |

**合计：7 案、11 色需要补进提示词。** 6 个「集合外色」是 ΔE<3 的实现漂移（S02 `#0A0A0D` vs 色板 `#0B0B0F`、
S05 `#101010` vs `#111111`、S14 `#171E24` vs `#12181D`、S15 `#DDE2E0` vs `#E7EBE9`、
S19 `#DCD4BD`/`#24201A`），补进去只会把色板从 7 色撑到 9 色，稀释注意力。

**这个结论与 Lead 的 20/30 差在哪**（必须说清楚，否则下一个人会以为我漏了 13 案）：

Lead 的口径是「浏览器里出现过、且不在色板里」→ 20/30、55 色。
我的口径多了一道「ΔE≥3 且承担 ≥5% 墨迹或 ≥1% 面积」→ 7/30、11 色。
**两个数都对，回答的是不同问题**：Lead 答「提示词与参考图一致吗」（不一致，20/30 不一致）；
我答「补哪些色才能真正改变 AI 做出来的页面」（补 11 色，其余补了也没用）。

支撑「其余补了也没用」的实测：S02 的集合外色 `#0A0A0D` 占 **57.7% 像素**——面积巨大，
但它是**墨迹 0%** 的纯背景块，且与色板里的 `#0B0B0F` 的 ΔE 只有 **1.5**。AI 用 `#0B0B0F` 画那块背景，
人眼分不出。**这就是「面积大 ≠ 该补」的反例，也是不能只按 Lead 的 20/30 去补的理由。**

### 3.3 三种修法的取舍（任务书 Q3 的 (a) vs (b)）

| 方案 | 做法 | 改动 | 风险 |
|---|---|---|---|
| **(a1) 全补 55 色** | Lead 口径的 20/30 全补 | `MAX` 7→12；补 55 色 | 色板变 12 色，AI 守不住；提示词 +440 字 |
| **(a2) 只补 11 个骨架色**（推荐） | 按 ΔE+墨迹判据补 | `MAX` 7→9；补 11 色 | 弱：只覆盖真正影响观感的 |
| **(b) 改原型** | 让 20 个原型只用色板里的色 | 改 20 个 `style.css`（tracked、用户看的设计作品） | **高：等于改 20 件设计作品**，且 S19 `#5E5443` 是作者为对比度刻意加的（5.53:1），删了会破坏可读性论证 |

**推荐 (a2)**。理由不是「改动小」，而是 (b) 在 S19 上会**直接破坏无障碍论证**：
`style.css:16` 写明 `#5E5443` 是为「对纸底 5.53:1」而设，删掉它、只留全墨 `#2A241C`，
次级文字的层次就没了；而如果改用 `#7C7460`（色板里已有的褪色墨），
`style.css:13` 明写它对纸底只有 **3.45:1**、不足 15px 正文的 4.5:1 —— **等于把原型改坏**。

---

## 4. 缺陷 3（配比）与缺陷 4（线宽）：根因与修法

### 4.1 缺陷 3：色板只给值不给配比

`build-prompts.mjs:261-273` 只做格式化：

```js
261:  const pal = d.palette.length
262:    ? d.palette.map((p) => {
269:        const hex = parts[0];
270:        const name = parts[1] && !/^×\d+$/.test(parts[1]) ? parts[1] : "";
271:        return hex + (name ? "（" + name + "）" : "");
272:      }).join("、")
```

`×N` 这个字段本来带频率，但被 `:270` 主动剥掉（理由正当：那是抽取元信息）。
**结果：提示词里没有任何比例信息。**

S28 是最硬的例子（`p1` 实测）：

| 色 | 像素占比 | 墨迹占比 | 在色板里？ |
|---|---|---|---|
| `#0B0D12` 黑 | 46.51% | 41.57% | 是 |
| **`#AF74BE` 梅子紫** | **31.96%** | 只有 1.91% | 是 |
| `#D8D4C6` 纸 | 0.17% | **56.53%** | 是 |

紫色占了近 **1/3 的画面**，但几乎不画字——它是**大色块**。提示词只写「配色只用这几个值：#AF74BE…#0B0D12…」，
AI 完全无法知道「紫色要铺满三分之一」，于是做成纯黑。**这与 69 轮测到的「S28 梅子紫原型 31.6%、复刻 0%」精确对上。**

更普遍：30 案里 **16 案**存在「面积 ≥15% 但墨迹 < 面积 20%」的大色块（S03/S07/S08/S10/S12/S13/S15/S17/S19/S21/S22/S25/S26/S28/S30 等），
这些案的主色/强调色都靠**面积**而不是**笔画**起作用，而提示词对面积零描述。

### 4.2 缺陷 4：线宽只读 CSS，漏掉 HTML 内联 SVG

`clean-dna.mjs:452-502`：

```js
452: function lineWidthVerdict(cleanCss, vars) {
454:   const re = /(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|stroke-width)\s*:\s*([^;}]+)/g;
456:   while ((m = re.exec(cleanCss))) { ... }
...
495:   const fine = list.filter(function (w) { return w < 1; });
497:   for (const w of list.filter(function (w) { return w >= 1; })) {
498:     if (!coarse.some(function (c) { return Math.abs(c - w) < 0.5; })) coarse.push(w);
501:   return finalList.map(...).join("、");
```

参数只有 `cleanCss`——**`index.html` 从头到尾没被读**。而 S25 的线宽全在内联 SVG 里：

`p6-linewidth-truth.mjs` 实测（**两个口径**，因为第一版口径有自我实现偏差，见下方更正）：

```
① HTML 内联有 CSS 里没有的档位：15/30
   S03(1.2) S06(0.8) S08(1.25) S10(1.25) S13(1.5) S14(1.25)
   S17(0.5/0.8/2.4/5/6) S20(0.2) S21(1.25) S23(1.5)
   S24(3.2) S25(1/1.2/2) S27(0.8) S28(1.2) S30(1.6/2)
② 提示词档位集合 ≠ 真实集合（narrow 口径，保守）：11/30
   S06 S08 S13 S17 S20 S23 S24 S25 S27 S28 S30
②' 提示词档位集合 ≠ 真实集合（原始未收窄口径，权威）：21/30
   S03 S04 S06 S08 S09 S10 S11 S13 S14 S15 S17 S18 S20 S21 S23 S24 S25 S27 S28 S29 S30
③ 自己说「不要自创第三级」却给了 >3 档：9/30 → S13(7) S15(5) S16(4) S18(4) S19(4) S20(4) S24(6) S29(6) S30(4)
```

**关于 ②/②' 我必须自我更正一次**（这是本轮我自己抓到的最重要一个方法论错误）：

第一版 `p6` 判出 11/30，于是我写了「S09 复现不到 3.6，与 Lead 不一致」。
**那是我的探针错了。** 原因是我把 `clean-dna.mjs:495-500` 的 `narrow()`
（<1px 全留，≥1px 按 0.5px 去重）抄进了探针——
于是 `S09-*/style.css:402` 的 `stroke-width: 3.6` 被并进 3.5，**「提示词写 3.5、真实有 3.6」被判成一致**。
探针和被测代码用了同一个收窄函数，判据就变成了自我实现。

改用**未收窄的原始集合**重算，结果是 **21/30**，S09 明确在列（漏 3.6）。
`PATCH-linewidth.md:141` 早就点出了这个 `narrow()` 副作用，我没第一时间接上。

> **所以 Lead 的「S09 声称 2/3/3.5，CSS 实有 3.6」是对的**，见
> `S09-*/style.css:402`：`.ico path { … stroke-width: 3.6; … vector-effect: non-scaling-stroke; }`。
> 我先前写的「复现不到」是误判，已删除。**T3 的验收必须用 ②'（原始口径）**，不能用 ②。

> **复核 Lead 的声称**：「S25 声称只有 `3px`，实际 HTML stroke 用了 1/1.2/2/3 四级」——**完全正确**。
>
> S25 的 `index.html` 里内联 `stroke-width` 去重后是 **`1`、`1.2`、`2`**（已用 `[regex]::Matches` 直接核对原文），
> 加上 `style.css` 的 `3px`，真实集合是 **`{1, 1.2, 2, 3}` 四级**，而提示词只写「线宽只用这几级：3px」。
>
> 我第一版 `p6` 报的是「S25 HTML 只有 1 和 2、无 1.2」——**那是同一个 `narrow()` 盲区**
> （1.2 与 1 差 0.2 < 0.5，被合并）。这条与 S09 是**同一个方法论错误的两次发作**，
> 合起来说明：**任何复用 `narrow()` 的探针都不能用来判「漏没漏档」**。

> **复核 Lead 的声称**：「S09 声称 `2/3/3.5px`，CSS 实有 3.6」——**正确**，而且我一开始判错了。
>
> 我第一次跑 `p6` 得到「S09 提示词 `{2,3,3.5}` = 真实 `{2,3,3.5}`，一致」，
> 于是写下「复现不到 3.6」。**那是我的探针错了，不是 Lead 错了**：
> `S09-*/style.css:402` 明写
> ```
> .ico path { fill: none; stroke: var(--ink); stroke-width: 3.6; ... vector-effect: non-scaling-stroke; }
> ```
> 我的 `p6` 复用了 `clean-dna.mjs:495-500` 的 `narrow()`（<1px 全留，≥1px 按 0.5 去重），
> 于是 **3.6 被并进 3.5**（差 0.1 < 0.5）——这正是 `PATCH-linewidth.md:141` 已经点出的漏讲。
>
> **这条更正的价值**：它证明 `narrow()` 的 0.5px 去重会让「提示词档位 = 真实档位」这个判据
> **自我实现**（探针和被测代码用了同一个收窄函数，当然一致）。
> 所以 `p6` 的 ②「档位集合 ≠ 真实集合」是**保守下界**，真实不一致的案数 **≥ 11**。
> T3 的验收不能只看 `p6` 的 ②，**必须同时用未收窄的原始档位集**再判一次（加 `--raw` 口径）。

**第 4 项最严重的不是漏档，是措辞自相矛盾**：9 案给了 4–7 档，却写着「不要自创第三级」。
AI 读到这句会僵住——照列表做就是「自创」，不照做就丢签名。

**另一处真实互斥（不是误报）**：`p6` 用「线宽/走线/描边/stroke 前后 12 字内的 px」重新判，
真正的完全无交集只有 **2 案**：

- **S19**：机制句「线宽只 0.4 与 0.8px」，硬约束「0.4px、0.8px、1px、3px」，
  风险段又说「所有插画必须是 0.4px 与 0.8px 两级线宽的线稿」。**三句话互斥。**
- **S27**：机制句「`--mis:1.8px`…」，硬约束「1.2px、2.4px、3px」，1.8 不在其中。

> 第一版探针把机制句里所有 px 都当线宽，判出 18/30「互斥」——**那是误报**
> （S01 机制句的 `24px` 是栏宽）。收紧后 2/30。**这条自我更正留在探针注释里，防止下一个人按 18 去修。**
>
> 任务书提到的 S20「同一份提示词给了两组互斥线宽（机制句 `0.6/1.2/2.4` vs 硬约束 `0.35/0.5/1/3`，
> 交集只有 0.35）」——我**复核为正确**，而且比任务书说的更糟：S20 的**风险段**还写着
> 「图形只允许 0.35px 单线，禁止发光」，**第三组约束**。三组数各不相同。

---

## 5. 前置阻塞：生成链当前不可复现（先修这个，再改数据）

`node deliverables/70-plan/probes/p4-repro.mjs`（只读 + 自动 `git checkout` 恢复）：

```
prototypes/_prompts/dna-raw.json
  HEAD 14ddeff5…  重跑 2d6bfe3f…  → 不一致 ❌
prototypes/_prompts/dna-clean.json
  HEAD 50babe3e…  重跑 1a10ac65…  → 不一致 ❌
prototypes/_selection/prompts.js
  HEAD 75a5b1d0…  重跑 75a5b1d0…  → 一致 ✅
结论：1/3 个产物可复现。
```

**根因**（探针打印的语义差异，不是 hash 噪声）：S07/S13/S21 三个 `style.css` 里混进了一段事故注释：

```
monospace（Chrome 实测，见 deliverables/69-exec/EXEC-mono-empty.md §2.3），
   下面把这条与其余可能因引擎而异的默认值一并还原成继承值：换标记，不换排版。 */
code{font-family:inherit
```

`extract-dna.mjs:55` 的 `for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/g))` 把这段注释
当成字体名抽了出来（`clean-dna.mjs:43` 才剥注释，**上游 `extract-dna.mjs` 完全不剥**）。
于是 `rows.6 / rows.12 / rows.20`（S07/S13/S21）的 `families` 多了一个脏元素。

`dna-clean.json` 另外有 S13（`$.12`）的 `shadowDetail` 差异：

| 字段 | HEAD | 重跑 |
|---|---|---|
| `inset` | 8 | 13 |
| `outer` | 9 | 1 |
| `drops` | 0 | 2 |
| `samples.0` | `2px 2px 3px rgba(36,31,23,0.08)` | `0 -2px 3px rgba(36,31,23,0.06)` |

**为什么 `prompts.js` 仍然字节一致**：这些脏值只落进 `dna-raw.json` / `dna-clean.json`，
而 `build-prompts.mjs` 目前不消费 `families`（它读 `fonts.display/body/mono`）也不消费 `shadowDetail`
（只读 `shadow` 这个字符串）。**这是一次「差一点就污染产品」的侥幸**：
只要下一轮有人让提示词消费 `families`，脏字体名就会直接进用户看到的提示词。

**必须先做的决策**（三条路，我推荐 B）：

| | 做法 | 代价 |
|---|---|---|
| A | 删掉 S07/S13/S21 里的那三处事故注释 | 改 3 个 tracked 的 `style.css`（但删的是**代码外的野注释片段**，不是设计） |
| **B（推荐）** | `extract-dna.mjs` 开头加 `stripComments(css)`，与 `clean-dna.mjs:43` 对齐 | 改 1 个文件 2 行；让「上游不剥注释」这个历史包袱消失 |
| C | 什么都不做，把 `p4-repro` 的失败当已知噪声 | 违反仓库「声称必须可重跑」的规矩；下一个人跑完就 `git status` 变脏 |

推荐 B 的额外理由：它同时修掉 `extract-dna.mjs` 里另外两个同源隐患——
`:62` 的 `@font-face` 正则、`:113` 的 h1 正则（`h1` 前若有注释也会被吞）。
**B 是「修根因」，A 是「修症状」**，而 A 还需要重跑 3 个原型的 `.inspect`（`check-stale` 会报）。

---

## 6. `prompts.js` 是生成物：重生成后哪些校验会红（任务书 Q4）

### 6.1 `prompts.js` / `data.js` 的消费方（逐项，全部实测）

| 消费方 | 读什么 | 会不会因本次重生成而变 |
|---|---|---|
| `prototypes/_selection/index.html` | 顺序加载 `data.js` 再 `prompts.js` | 不变 |
| `prototypes/_selection/prompt-copy.js:151` `buildPrompt()` | `P.schemes[i].dna.*`（palette/fonts/radius/shadow/lineWidths/h1Size/mechanism/risk/reuse）+ `window.SCHEMES`（tone/void 词） | **变**（palette、字号句、线宽、配比） |
| `prototypes/_build/check-docs.mjs:376-395` `buildPromptLengths()` | 用 `vm` 跑 `data.js`→`prompts.js`→`prompt-copy.js`，真调 `buildStylePrompt(id)` 量字数 | **变**（`nums/prompt-len`） |
| `prototypes/_build/check-docs.mjs:401-419` `loadData()` | `SCHEMES.length`、`P.schemes.length`、`P.schemes[].hard`、`P.schemes[].capacity.degrades` | 不变（字段不动） |
| `prototypes/_build/check-docs.mjs:462-495` `ids/exist` | `data.js` 的 30 个 dir/id | 不变 |
| `prototypes/_build/check-docs.mjs:702-760` `nums/scenes` | `P.sceneIndex` / `P.unsupported` | 不变（本次不碰场景） |
| `prototypes/_build/check-docs.mjs:755-801` `panel/fields` | 从 `data.js` 数 audit 字数 | 不变 |
| `prototypes/_build/render-scheme.mjs:112` | 只在注释里提到 `prompts.js` | **不变**（无代码依赖） |
| `prototypes/_build/check-stale.mjs` | `_entries.mjs` 的 `PRODUCTS` 里**列了 `prompts.js`** 作为 `_selection` 的源文件 | **会报陈旧**（见 §6.3） |
| `prototypes/_selection/self-gate.js` | 由 `render-scheme.mjs` 生成，只含 `SELECTION_REPORT` | 不读 prompts |

### 6.2 逐项：`check-docs.mjs` 的 13 条断言，哪几条依赖 `prompts.js` 的内容

基线（`node prototypes/_build/check-docs.mjs`）：**0 FAIL / 0 WARN / 13 PASS**，exit 0。
英文版（`node prototypes/_build/check-docs.mjs README-EN.md`）：**0 FAIL / 1 WARN / 12 PASS**，exit 0
（WARN 是 `i18n/pair` 不做双语比对，属正常）。

| 断言 | 依赖 `prompts.js`？ | 本次重生成后 |
|---|---|---|
| `ids/exist` | 只读 `data.js` | ✅ 不变 |
| `nums/schemes` | 只读 `data.js` 的 30 案 | ✅ 不变 |
| `nums/gate` | 只读 `data.js` 的 `gate.fail`（实测 29/30 案 FAIL=0，仅 S08=2） | ✅ 不变 |
| `nums/warn-axes` | `P.schemes[].hard` / `capacity.degrades` | ✅ 不变（4 / 13 / 14） |
| **`nums/prompt-len`** | **真跑 `buildStylePrompt`** | 🔴 **必红**（见 §6.4） |
| `nums/scenes` | `P.sceneIndex` / `P.unsupported` | ✅ 不变 |
| `status/fixed-claims` | `data.js` 的 gate/audit + README 措辞 | ✅ 不变 |
| `status/layout-fix` | `data.js` 的 `layout` 长度 | ✅ 不变 |
| `panel/fields` | `data.js` 的 audit 字段 | ✅ 不变 |
| `i18n/facts` | 综合上面这些 | ⚠️ 若 `nums/prompt-len` 变红，`i18n/facts` 也可能连带红 |
| `paths/exist` | 只查文件存在 | ✅ 不变 |
| `paths/templates` | 只查模板编号 | ✅ 不变 |
| `regression/banned` | 6 条已腐化原话 | ✅ 不变（实测零命中） |

### 6.3 `check-stale.mjs` 会报「选型台的报告过期」

`_entries.mjs` 的 `PRODUCTS` 把 `prompts.js` 列进 `_selection` 的 `sources`。
只要 `prompts.js` 的 mtime 变新，`check-stale` 就会报「落后来 N 分钟」并 **exit 1**。
`_entries.mjs` 的注释已经写了正确的修法：跑 `node prototypes/_build/render-scheme.mjs _selection`
重渲染报告即可（它会重写 `_selection/self-gate.js` 与 `.inspect/report.json`）。
**这是本次改动的必做收尾步骤，不是可选项**——否则交付时 `check-stale` 是红的。

### 6.4 `nums/prompt-len` 的红是**必然的**，容差救不了

`check-docs.mjs:654` 定义 `DRIFT = 0.03`，`near(doc, actual) = |doc - actual| / actual ≤ 0.03`；
超出即 `fail()`（红），不是 `warn()`。

`p5-fix-sim.mjs` 在内存里模拟了三种修法（**不落盘**）：

| 方案 | 影响面 | 长度区间 | 中位 | 对 README「1639–1998，中位 1829」 |
|---|---|---|---|---|
| 现状 | — | 1639–1998 | 1829 | — |
| A 补骨架色 | 7/30 案，每案 +8~24 字 | 1639–1998 | 1829 | ✅ 仍成立 |
| **B 字号进硬约束** | **30/30，每案 +64~88 字** | **1706–2062** | **1894** | 🔴 下限 3.93% / 上限 3.10% / 中位 3.43% —— **三项全超 3%** |
| C 配比 | 30/30，每案 +12~69 字 | 1656–2021 | 1852 | ✅ 仍成立（中位 1.28%） |
| A+B+C | 30/30 | **1723–2085** | **1921** | 🔴 下限 4.88% / 上限 4.17% / 中位 4.79% |

**结论：修缺陷 2 必须同时改 `README.md:80` 与 `README-EN.md:80` 的区间与中位**，
否则闸门从 0 FAIL 变 1 FAIL（而且 `i18n/facts` 会连带红）。

> 这条**不在任务书的四个缺陷里**，是改数据的连带义务。
> 它也是「为什么不能只改 `clean-dna.mjs` 就交差」的最硬理由：
> 改数据 → 提示词变长 → README 数字假 → 文档闸门红。

---

## 7. 闸门 29/30 会不会受影响（任务书 Q5）

**不会。** 逐条说明，附实测：

| 检查器 | 读什么 | 受本次重生成影响？ |
|---|---|---|
| **原型闸门（29/30）** | `data.js` 的 `gate.fail`（`collect-schemes.mjs` 从各案 `.inspect/report.json` 聚合） | ❌ 完全无关。本次不改任何 `prototypes/Sxx/` 的 `index.html`/`style.css`/`.inspect/` |
| `verify-prototype.mjs --all` | 各案页面 + `.inspect/report.json` | ❌ 无关 |
| `check-anchors.mjs` | 各 `index.html` 的锚点 | ❌ 无关 |
| `check-stale.mjs` | 源文件 mtime vs `report.json.at` | ⚠️ **只对 `_selection` 报**（因为 `prompts.js` 在它的 sources 里）。修法见 §6.3 |
| `prompt-copy.js` 的运行期逻辑 | `P.schemes` 字段 | ⚠️ 会读到新值，但没有任何「校验」性质，不像闸门 |

实测确认闸门基线：`data.js` 里 `gate.fail > 0` 的只有 **S08（=2）**，其余 29 案 `=0`；
30 案全部有 `gate` 字段（缺 0 个）。`check-docs` 的 `nums/gate` 也独立复核为 29。

**唯一要留意的间接影响**：如果 §5 选了方案 A（删 `style.css` 里的野注释），那就是**改了 3 个原型的源文件**，
`check-stale` 会对 S07/S13/S21 报「落后 N 分钟」，必须跑 `render-scheme.mjs` 重渲这三个案（每个约 20–60 秒）。
这也是我推荐方案 B（改 `extract-dna.mjs`）的又一个理由——**B 完全不碰原型，闸门与陈旧度都不受影响。**

---

## 8. 验证协议：怎么证明「提示词真的能产出该风格」比修之前好（任务书 Q6）

### 8.1 为什么不能只靠机械判据（上一轮的教训，必须继承）

69-test 已经证明：机械判据（颜色合规、字体名、圆角、线宽档位）对**布局崩坏无感**，
而真正拉开差距的是**字号与配比**。所以协议必须三层，且每层都有「改前 vs 改后」的对照。

### 8.2 三层验收 + 可执行判据

| 层 | 判据 | 命令 | 通过标准 | 成本 |
|---|---|---|---|---|
| **L1 数据层** | 提示词里的「色 / 字号 / 线宽」是否与原型实测**同源** | `p1`、`p2`、`p6` | 色：MISSING 色数 = 0；字号：30/30 有具体 px；线宽：`p6` **②' = 0/30**（原始口径，不是 ②） | 约 **5 min**（`p1` 全量 30 案 CDP） |
| **L2 机械层** | 拿提示词做 3 案复刻，逐条判 | `deliverables/69-plan/verify-style.mjs --prompt Sxx --page …` | 与 69-test 基线比，**PASS 数不下降**（S20 18/21、S21 25/26、S28 22/24） | 约 **1.5 h/案**（含写实现） |
| **L3 感知层** | 「字号相似度」与「主色面积占比」两个数改善 | `deliverables/69-test/LEAD-similarity.mjs` + `p1` | 字号相似度：S20 0.03→**≥0.5**、S21 0.001→**≥0.5**；主色面积：S28 紫 0%→**≥15%**（原型 31.96%） | 约 **40 min**（复用已有复刻产物 + 2 次 CDP 采样） |

### 8.3 为什么阈值定在 0.5（不是拍脑袋）

`LEAD-similarity.mjs` 的 `simSize` 是「字号 → 面积」直方图的余弦相似度。
- 完全一致 = 1.0。
- 现状 S20 = 0.03、S21 = 0.001 → **几乎正交**（连一个共同档位都算不上）。
- 修完若 AI 只做到「h1 对了、正文对了」两档，其余蒙对，余弦约 0.5–0.7；
  三档全对会到 0.85+。定 **0.5** 是「至少把最主要的档位做对」的下界，**不是「像」的标准**。
- **反作弊**：同时报 `simColor` 与 `simFam`，防止出现「只把字号调对、颜色/字体崩了」还判通过。

### 8.4 成本汇总

| 项 | 人日 |
|---|---|
| 修 + 重生成 + 文档同步（§9 的 T1–T4） | **0.5** |
| L1 数据层验收（含 30 案 CDP 采样 2 次：改前/改后） | **0.2** |
| L2 三案复刻（3 × 1.5h） | **0.6** |
| L3 感知层对照 | **0.3** |
| 意外余量（含 §5 的注释决策） | **0.4** |
| **合计** | **约 2.0 人日** |

---

## 9. 任务切分（可并行，写入范围不重叠）

依赖图：`T0` 是所有事的前置（它改 `extract-dna.mjs`，而 T1/T2/T3 都要在此基础上重生成）。
`T1/T2/T3` 三者**改的是不同的生成器文件**，可并行；但它们最后都要跑同一条重生成链，
所以 `T4`（统一重生成 + 文档同步）必须串在最后、且由**一个** Agent 独占执行。

| 单元 | 写入范围（互不重叠） | 前置 | 验收命令 | 预计 |
|---|---|---|---|---|
| **T0 修上游剥注释** | `prototypes/_prompts/extract-dna.mjs`（仅 2 行） | 无 | `node deliverables/70-plan/probes/p4-repro.mjs` → 期望 **dna-raw 一致**（dna-clean 仍可能差，见下） | 0.5 h |
| **T1 缺陷 1 色板** | `prototypes/_prompts/clean-dna.mjs` 的 `pickPalette()`（:510-559） | T0 | `node deliverables/70-plan/probes/p3-classify-deltae.mjs` → MISSING 色数 = **0** | 2 h |
| **T2 缺陷 2+3 字号与配比** | `prototypes/_prompts/clean-dna.mjs` 的**输出段**（:690-712）+ `prototypes/_prompts/extract-dna.mjs` 的 h1 段（:111-114） | T0 | `node deliverables/70-plan/probes/p2-type-scale.mjs` → 字号句 **30/30** | 3 h |
| **T3 缺陷 4 线宽** | `prototypes/_prompts/clean-dna.mjs` 的 `lineWidthVerdict()`（:452-502）+ 调用处 `:688` + `prompt-copy.js:456` 的措辞 | T0 | `node deliverables/70-plan/probes/p6-linewidth-truth.mjs` → ②' = **0/30**、③ = **0/30**、④ = **0/30** | 2 h |
| **T4 重生成 + 文档同步 + 收尾** | `dna-raw.json`、`dna-clean.json`、`prompts.js`（生成物，由脚本写）+ `README.md`、`README-EN.md`（仅提示词长度那两个数）+ `prototypes/_selection/.inspect/*`、`self-gate.js`（由 `render-scheme` 写） | T0–T3 | 见 §9.1 | 2 h |

**冲突提示**：T1/T2/T3 都改 `clean-dna.mjs`，写入范围**在同一文件的不同函数**——
文件级不重叠做不到。所以要么**串行**跑 T1→T2→T3（推荐，总 7h 仍在半日内），
要么让 T1 独占 `pickPalette`、T2 独占输出段、T3 独占 `lineWidthVerdict`，
**由 T4 的 Agent 统一做一次 `clean-dna.mjs` 的合并**。我推荐**串行**：
三个单元都要改同一个文件，并行的合并冲突成本高于串行的时间成本。

> 如果一定要并行，唯一干净的分法是：T2 独占 `extract-dna.mjs`，T1+T3 串行改 `clean-dna.mjs`。
> 这样有两个并行槽，总时长约 4h。

### 9.1 T4 的完整验收清单（一条都不能少）

```powershell
# 1) 重生成三级产物
node prototypes/_prompts/extract-dna.mjs
node prototypes/_prompts/clean-dna.mjs
node prototypes/_prompts/build-prompts.mjs

# 2) 可复现性：三个产物必须全部与"重生成后"一致（第二次跑不再变）
node deliverables/70-plan/probes/p4-repro.mjs      # 期望 exit 0（注意：它会把产物 checkout 回 HEAD，
                                                   # 所以要先跑 1) 并先 commit，或改用 --no-restore）

# 3) 选择器台报告重渲（否则 check-stale 红）
node prototypes/_build/render-scheme.mjs _selection

# 4) 文档闸门（中英各一次）
node prototypes/_build/check-docs.mjs              # 期望 0 FAIL
node prototypes/_build/check-docs.mjs README-EN.md # 期望 0 FAIL

# 5) 陈旧度 + 锚点
node prototypes/_build/check-stale.mjs             # 期望 exit 0
node prototypes/_build/check-anchors.mjs           # 期望 exit 0

# 6) 数据层验收（改前/改后各跑一次，对比 JSON）
node deliverables/70-plan/probes/p1-pixel-share.mjs --json probes/p1-after.json
node deliverables/70-plan/probes/p3-classify-deltae.mjs --in probes/p1-after.json --json probes/p3-after.json
node deliverables/70-plan/probes/p2-type-scale.mjs --json probes/p2-after.json
node deliverables/70-plan/probes/p6-linewidth-truth.mjs
```

> ⚠️ `p4-repro.mjs` 的设计是「跑生成器 → 比对 HEAD → `git checkout` 恢复」。
> **它假设你还没提交改动。** T4 在提交前跑它是合适的（此时 HEAD 还是旧产物，
> 会用 exit 1 告诉你「产物变了」——这是**预期的**，不是失败）。
> 提交后再跑一次，才应该是 exit 0。这条要写进 T4 的交付说明，否则下一个人会误读。

---

## 10. 我认为最可能出错的地方（给下一轮的人）

1. **`MAX=7` 改成 9 之后，`nums/prompt-len` 的上限会顶到 2062，而 A+B+C 合并到 2085。**
   如果 T4 只改 README 的中位数忘了改上限，`check-docs` 会红（上限偏差 4.17%）。
   **两个数（区间+中位）必须一起改。**

2. **`p4-repro.mjs` 会 `git checkout` 三个产物。** 如果有人在 T4 里跑它、而工作区里有
   未提交的修改，**那些修改会被静默丢掉**。跑之前先 `git add` 或先提交。

3. **S19 的 `#5E5443` 是作者为对比度刻意加的**（`style.css:16` 明写 5.53:1）。
   补色时**不要顺手把它改名或"归一"到 `#7C7460`** —— 那个色对纸底只有 3.45:1，会破坏无障碍论证。

4. **`extract-dna.mjs` 的 `stripComments` 会让 `families` 变短**，某些案的 `fonts.display`
   可能因此改选到另一个族（`stackFromVars` / `dominantStack` 的计数会变）。
   T0 之后**必须重跑 `p2` 与 `build-prompts` 对一遍 30 个字体名**，不能只看 `p4` 的 hash。

5. **`narrow()`（`clean-dna.mjs:495-500`）会把 3.6 并进 3.5。**
   `PATCH-linewidth.md:141` 已经点出这是「漏讲」。如果 T3 顺手改了 `narrow()`，
   会连带改变 S13/S19 的档位，**而这两案的档位是它们的设计签名**（S13 七档、S19 蚀刻两级）。
   **T3 只允许「补读 HTML」，不允许动 `narrow()`。**

6. **9 案的「不要自创第三级」措辞**：改成「只用这几级」可以，但**不要改成「最多三档」**——
   S13 有 7 档、S24/S29 有 6 档，改了就是新的自相矛盾。

7. **别用 Lead 的 20/30、55 色去补。** 那会补进 6 个 ΔE<3 的漂移色（S02 `#0A0A0D` 等）
   和 38 个装饰色，色板从 7 撑到 12+，AI 守不住。用 §3.2 的 11 色。

8. **不要拿「和被测代码共用同一个格式化/收窄函数」的探针去验收。**
   我这一轮踩了两次同一个坑：`p6` 复用了 `clean-dna.mjs` 的 `narrow()`，
   于是 S09 的 3.6 被并进 3.5、S25 的 1.2 被并进 1，两案都判成「一致」，
   真实结果是 21/30 漏档而不是 11/30。**验收探针必须用未收敛的原始值集合**，
   否则它测的是「我自己跟自己一致」。这条对 T1（色板）同样适用：
   验收 `p3` 时不要复用 `pickPalette()` 的 hex 归一逻辑。

---

## 11. 复核任务书数字：哪些对、哪些不对

| 任务书/Lead 的声称 | 我的复核 | 证据 |
|---|---|---|
| `h1Size` 有 2/30 未解析（S01、S09 是 `var(--fs-h1)`） | ✅ **正确** | `dna-clean.json` 直读，案号一致 |
| `lineWidths` 有 30 条，形如「1px、3px」 | ✅ **正确**（30/30 非空） | 同上 |
| S13 有 7 档、S29 有 6 档、S24 有 6 档 | ✅ **正确**，且 S24/S29 并列 6 档 | 实测 `S13:7 S24:6 S29:6` |
| 缺陷 2「29/30 缺失（仅 S22 有）」 | 🔴 **更严重：0/30** | `h1Size` 在 30 条提示词里出现 0 次；S22 的「字号」来自机制句原文 |
| 缺陷 1「20/30 案参考页用了色板外颜色」 | ✅ **正确**（但我判「需要补」的只有 7 案） | `p1` 全量；见 §3.2 的口径说明 |
| S19 声称 7 色实画 12 色，`#5E5443` 247 次 | ✅ 7 色/12 色正确；`#5E5443` 是**正文次级墨**（墨迹 12.98%） | `p1`；`style.css:61` |
| S14 声称 6 色实画 12 色 | ✅ **正确** | `p1`：claimed 6 / painted 12 |
| 缺陷 3「S28 梅子紫原型 31.6%」 | ✅ **正确**：`#AF74BE` 面积 **31.96%**、墨迹仅 1.91% | `p1` |
| 缺陷 4「S25 声称只有 3px，HTML stroke 用了 1/1.2/2/3」 | ✅ **正确**：S25 的 `index.html` 内联 `stroke-width` 去重 = `1, 1.2, 2`，加 CSS 的 `3` = 四级 | `p6` ①＋原文正则核对 |
| 缺陷 4「S09 声称 2/3/3.5，CSS 实有 3.6」 | ✅ **正确**（我第一版误判为「复现不到」，已更正）：`style.css:402` 有 `stroke-width: 3.6`，被 `narrow()` 并进 3.5 | `p6` ②' |
| 缺陷 4「S20 两组互斥线宽，交集只有 0.35」 | ✅ **正确，且更糟**：还有第三组（风险段「只允许 0.35px 单线」） | 提示词全文 |
| 线宽根因在 `clean-dna.mjs:452` 附近 | ✅ **正确**（`lineWidthVerdict()` 定义在 452） | `grep -n "^function lineWidthVerdict"` |
| `PATCH-linewidth.md` 引用的 `lineWidths: lines` 在 `:487` | ❌ **已漂移**：现在在 **`:707`**（`:452` 的函数起点仍对） | `grep -n "lineWidths: lines"` |
| 69-audit「M646 / S540 / J141，共 1327 条」 | ✅ **正确**（重新按 `cat` 聚合，逐案 S 恒 18） | `constraints.json` 复算 |
| 69-audit「U 占 35.8%（362/1011）」 | ✅ **正确** | `UNVERIFIABLE.md:58,73` 与去重口径自洽 |
| S19 的 `#5E5443` 用了 247 次 | ✅ 复现（我测的是墨迹 12.98% / 966 字，次数口径未冲突） | `p1` |

---

## 12. 收尾基线

| 项 | 值 |
|---|---|
| `git rev-parse HEAD` | `03f6fd47e364c43dffdf240f3eb298987f840625`（与开工**相同**，未提交任何东西） |
| `git status --porcelain` 已跟踪文件被改 | **4**（**不是 0，但不是我改的** —— 见 §12.1；这个数在收尾核对期间**一直在变**：3 → 4 → 3 → 4，因为并发 Agent 还在写） |
| 记录时刻 | 2026-10-29T23:24:00+08:00（Asia/Shanghai），最后复核 23:26 |
| 本次新增 | 仅 `deliverables/70-plan/PLAN-prompt-data.md` + `deliverables/70-plan/probes/`（6 个探针 + 6 个 JSON + 2 个 log） |

> **收尾时工作区仍在被并发 Agent 变动**（`prompts.js` 在 3 分钟内被改、恢复、又改）。
> 下表取**最后一次观测**（23:26）。它随时可能再变，所以**不要把这里的数字当稳定状态**。

### 12.1 收尾时工作区**不干净**，原因必须在场记录

收尾核对时 `git status` 有 **3 个已跟踪文件被改**（23:21 时是 4 个，随后 `prompts.js` 回到 HEAD）：

```
 M prototypes/_prompts/clean-dna.mjs      (+305 行)
 M prototypes/_prompts/dna-clean.json
 M prototypes/_prompts/dna-raw.json
?? prototypes/_build/check-prompts.mjs    （并发 Agent 新建的检查器）
```

**这不是我写的。** 判据有四条：

1. 我这一轮所有写入目标都在 `deliverables/70-plan/` 下，全程没对 `prototypes/` 发起写入
   （除 §12.2 那次已恢复的误改）。
2. 这些文件的 mtime 落在 **23:20–23:24**，而我最后一次碰 `prototypes/` 是 23:03
   （`p4-repro` 的自动 `git checkout`，之后立刻验过 0 改动）。
3. `clean-dna.mjs` 的 diff 是与本计划方向一致的**功能实现**：新增
   `conditionApplies(cond, viewport)` 判 `@media` 是否在 1440 下成立、`eachRule` 加第三个
   `media` 参数，注释里写明「S27 的 `--mis` 就这么漏的」「断点几乎全是 `max-width: 1439`」，
   还新建了 `prototypes/_build/check-prompts.mjs`。这是**另一个 Agent 正在实施线宽/字号修复**。
4. `deliverables/70-plan/_backup-prototypes__prompts_*.json` 三份备份创建于 23:03，也是它做的。

**对本计划的影响**：

- 计划里**所有根因行号**都对着 **HEAD `03f6fd4`**（并发改动之前）。照这份计划动手的人
  **必须先 `git stash` / `git checkout` 回到 HEAD**，否则行号会错。
- 如果并发 Agent 的改动最终保留，T1/T3 的部分工作**已经被做了**；
  接手前应先读 `git diff prototypes/_prompts/clean-dna.mjs` 再决定还差什么。
- **我没有恢复这些文件**：不是我改的，`git checkout` 会**丢掉另一个 Agent 的工作**。
  这比「让工作区脏着」危险得多。

**关键结论在并发改动之后仍然成立**（23:24 重新复核）：

| 结论 | 复核方式 | 结果 |
|---|---|---|
| 提示词里没有字号 | 重跑 `p2` 的口径：抓 `字号/字级` | **1/30**（仅 S22，来自机制句原文）→ 结论不变 |
| 现状提示词长度 1639–1998 / 中位 1829 | 重跑 `p5-fix-sim.mjs` | **完全一致** → §6.4 的 `nums/prompt-len` 推论不变 |
| `dna-clean.json` 的 `h1Size` 26/30 非空 | 直读 | **26** → 与 §2.1 一致 |
| 骨架色 7 案 11 色 | 重跑 `p3` | **一致** |

也就是说：并发 Agent 动的是**线宽与媒体查询**那一块，**没有动字号渲染路径**，
所以我这份计划的核心结论（尤其是 §2 的死分支、§6.4 的长度连带义务）不受其影响。

### 12.2 过程中我唯一一次误改（已恢复，无残留）

为测量生成链耗时，我执行过
`node extract-dna.mjs && node clean-dna.mjs && node build-prompts.mjs`，
它重写了 `dna-raw.json` / `dna-clean.json`（`prompts.js` 字节未变）。
已用 `git checkout --` 恢复并在当时复核为 0 改动；这个发现随后固化成了 `probes/p4-repro.mjs`（§5）。
**它的副作用是好的**：正因为踩了一次，才查出 §5 那条「生成链不可复现」的缺陷。

### 12.3 给接手的 Agent 的一句实话

本计划的**数据与结论是在 HEAD `03f6fd4` 上测的**，而收尾时工作区已被另一个 Agent 改动。
如果要用这份计划，请先做一件事：

```powershell
git stash            # 或 git checkout -- prototypes/
node deliverables/70-plan/probes/p4-repro.mjs   # 确认回到 1/3 可复现的已知状态
```

然后再按 §9 切分。**不要**在我这些行号上直接 `patch`，先 `git diff` 看一眼现实。

---

## 13. 探针清单（全部可独立重跑，零 npm 依赖）

| 探针 | 干什么 | 耗时 | 产出 |
|---|---|---|---|
| `probes/p1-pixel-share.mjs` | 30 案全量：像素占比 + 墨迹承载 + 伪元素/SVG/字号分布 | ~4 min | `p1-all30.json` |
| `probes/p2-type-scale.mjs` | 30 案真实字号层级 vs 提示词给的字号信息 | ~3 min | `p2-all30.json` |
| `probes/p3-classify-deltae.mjs` | 用 CIEDE2000 把集合外色分 DUP/MISSING/DECOR | ~1 s | `p3-deltae.json` |
| `probes/p4-repro.mjs` | 生成链可复现性（跑完自动 `git checkout` 恢复） | ~2 s | `p4-repro.json` |
| `probes/p5-fix-sim.mjs` | 三种修法对提示词长度的影响（纯内存，不落盘） | ~2 s | `p5-fix-sim.json` |
| `probes/p6-linewidth-truth.mjs` | 提示词线宽档位 vs CSS+HTML 真实档位 | ~1 s | `p6-linewidth.json` |

常用过滤：`node probes/p1-pixel-share.mjs --only S19,S14`

**已知探针边界**（诚实标注，防止下一个人过度解读）：

1. **`p1` 的墨迹估算是几何近似**（`字符数 × 字号² × 0.42`），不是真渲染的墨点像素。
   它对「谁是正文色」排序可靠（同字号下与字符数严格单调），但**绝对百分比不可当精确值**引用。
   若要更严格，可用 69-audit 的 `probe-pixels-masked.mjs` 那种像素掩码法。
2. **`p1` 的像素计数是「精确 hex 命中」**，抗锯齿会把 1px 描边摊成过渡色，
   所以细线的像素占比会**偏低**。这也是为什么「线宽」必须用 `p6` 的静态口径判，不能靠像素。
3. **`p2` 的「档」定义是「承担 ≥1% 字符」**。小于 1% 的档（如只在 3 个标签上出现的 11px）
   不计入，所以 `tierN` 会**低估**真实档位数（全站档位数另列在 `allSizeN`）。
4. **`p4-repro` 的 `git checkout` 会丢弃未提交改动**，跑之前先提交或 `git add`。
5. **`p6` 的 HTML 正则只认 `stroke-width="N"` 字面量**，不认 CSS 里的
   `[stroke-width]` 属性选择器或 JS 运行时设置的描边。
