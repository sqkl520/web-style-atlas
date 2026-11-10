# CHAIN — `dna.mechanism` 的真源与改动落点

调查对象：`prototypes/_selection/prompts.js` 里每案的 `dna.mechanism`（74–91 字中文机制句）。
问题：它到底从哪来；人要改哪个文件，才能撑过整条生成链的重跑。

结论先说：**它不是一条链，是两条互不相交的链**，分界正好在 S10/S11 之间。
S03/S07 走「规格 markdown → 抽取」链，S17 走「手写补录表 → 填充」链。
改错一条链，另一个文件里的同一句话不会动，而且**没有任何闸门会报错**。

---

## 1. 精确依赖链（有序，含 file:line）

### 链 A — S01–S10（含 S03、S07）：规格 markdown 为源

```
① deliverables/04-schemes-01-10.md
     S03 的机制句在 :95   S07 的机制句在 :255
     （文件头 :3 标注「作者：Generator A｜独占写入」——这是**人/生成器撰写**的原始文档）
        │
        │  prototypes/_build/extract-specs.mjs:23  HEAD = /^###\s*方案\s*(\d+)…/
        │  prototypes/_build/extract-specs.mjs:43  cur.body.push(lines[i])   ← 整段照抄
        │  prototypes/_build/extract-specs.mjs:84  writeFileSync(join(OUT, id + '.md'), out)
        │  （:2 自述「只做机械切分，不做任何判断、不改一个字」）
        ▼
② prototypes/_specs/S03.md:15   prototypes/_specs/S07.md:15
     实测 04:L95 === _specs/S03.md:L15 逐字节相同（今日复算 true）
     实测 04:L255 === _specs/S07.md:L15 逐字节相同（今日复算 true）
        │
        │  prototypes/_prompts/extract-dna.mjs:115
        │    const mm = spec.match(/1-附（去掉名字之后的机制）[：:]\s*([^\n]+)/);
        │  :145   mechanism: mechanism,
        ▼
③ prototypes/_prompts/dna-raw.json          （30 行中 10 行有 mechanism）
        │
        │  prototypes/_prompts/clean-dna.mjs:1433
        │    mechanism: r.mechanism,
        │  ← **纯搬运，零加工**。既不改写也不校验，更不读 CSS。
        ▼
④ prototypes/_prompts/dna-clean.json        （30 案中 10 案有 mechanism：S01–S10）
        │
        │  prototypes/_prompts/build-prompts.mjs:104-112  （fill-only 合并，见 §2）
        │  prototypes/_prompts/build-prompts.mjs:321   mechanism: d.mechanism,
        │  prototypes/_prompts/build-prompts.mjs:370   writeFileSync(…/prompts.js, body)
        ▼
⑤ prototypes/_selection/prompts.js          （"mechanism" 出现在 :424,469,517,566,610,660,709,756,801,846）
```

### 链 B — S11–S30（含 S17）：手写三字段对象为源

```
① prototypes/_prompts/mechanisms.mjs:19   export const MECHANISMS = {
     S17 块在 :44-47
       :44  S17: {
       :45    text: "两联按 3fr、16px、9fr 分栏，……行高 24px、金额列 96px 右对齐……"
       :46    source: "style.css:134（3fr/16px/9fr）/ … :181 金额右对齐（1024–1439 档 :320 压到 88px）…"
       :47  },
     （:2 文件头自述「机制句补录：为 S11–S30 补上缺失的「1-附」」，:14「数值必须来自该案
       style.css 或 _specs，逐条附来源」——**这是人写的数据文件，不是任何脚本的产物**）
        │
        │  prototypes/_prompts/build-prompts.mjs:105-107
        │    if (!d.mechanism && MECHANISMS[d.id]) {
        │      d.mechanism = MECHANISMS[d.id].text;
        │      d.mechanismSource = MECHANISMS[d.id].source;
        │  :321 mechanism: d.mechanism,    :370 writeFileSync(…)
        ▼
② prototypes/_selection/prompts.js:1174     （S17 的 mechanism）
```

### 链 C — 下游消费者（只读，不写回）

```
prototypes/_selection/prompt-copy.js:308-309
    if (d.mechanism) { mech = "这个风格的签名动作：" + d.mechanism; }
```
这是机制句**唯一**的产品出口。三条 `check-*.mjs` 对它零校验（见 §5）。

### 无关的旁支（已排除，读代码确认）

| 脚本 | 对 mechanism 的动作 | 证据 |
| --- | --- | --- |
| `prototypes/_build/collect-schemes.mjs` | **完全不产出 mechanism 字段**。它只写 `data.js`（:715 唯一 writeFileSync） | `grep -c '"mechanism"' prototypes/_selection/data.js` → **0**；`grep -c '"risk"' data.js` → 30（对照：risk 有，mechanism 没有） |
| `build-prompts.mjs:39-50` (RISK) | 对 `data.js` 做**行级正则抓取**（:44 `/"id":\s*"(S\d{2})"[\s\S]*?"risk":…`） | 存在，但抓的是 `risk` |
| `build-prompts.mjs:75-86` (REUSE) | 同样对 `data.js` 做行级正则抓取（:78 `"landing"`） | 存在，但抓的是 `landing` |
| `clean-dna.mjs` 全文 | 不解析机制，不读 CSS 生成机制句 | :1433 只有 `r.mechanism` 一个赋值点 |
| `extract-dna.mjs` | **不从 CSS 抽机制**，只从 `_specs/*.md` 正则抓 | :106 注释「机制句（直接从 specs 抓，绕开 collect-schemes 的 bug）」 |

**关键否定结论**：`mechanism` 与 `risk`/`landing` **不是**同一条路。`risk`/`landing` 来自
`data.js` 的行级 regex 抓取；`mechanism` 从不经过 `data.js`。所以重跑 `collect-schemes.mjs`
**不会**、也不可能覆盖机制句——`data.js` 里没有这个字段可写。

---

## 2. 「fill-only」断言：验证成立，但原判据说漏了一半

`build-prompts.mjs:101-112` 原文：

```js
/* 机制句合并：S01–S10 用 _specs 里原有的（dna-clean 已抓到），S11–S30 用 mechanisms.mjs 补的。
 * 补的这 20 条都附了数值来源（哪个文件哪一行），可逐条复核。 */
let mechFromSpec = 0, mechFromPatch = 0;
for (const d of dna) {
  if (!d.mechanism && MECHANISMS[d.id]) {
    d.mechanism = MECHANISMS[d.id].text;
    d.mechanismSource = MECHANISMS[d.id].source;
    mechFromPatch++;
  } else if (d.mechanism) {
    mechFromSpec++;
  }
}
```

`:105` 的 `!d.mechanism &&` 确实是**只填空值**。我用实际数据跑了这段逻辑并注入假值复算：

```
结论：从 specs 来的(被保留,注入无效) = 10 | 从 patch 来的(注入生效) = 1
S03 最终值前30字: 一条 264px 宽的纵向刻度轴随滚动固定，右侧 9 栏的高   ← 注入被丢弃
S07 最终值前30字: 同一段文字在纸背以 8% 至 14% 不透明度做镜像并整体偏   ← 注入被丢弃
S17 最终值前30字: 注入S17-改                                          ← 注入生效
```

**所以：「改 mechanisms.mjs 对 S03/S07 零效果」成立。** 但原因比「fill-only」更硬一层：

```
MECHANISMS keys: S11,S12,…,S30
count 20
has S03: false   has S07: false   has S17: true
```

`MECHANISMS` 的对象字面量里**根本没有 S03/S07 这两个键**——不是「被 fill-only 挡住」，
而是「没有那条记录可改」。`mechanisms.mjs:2` 自己写明范围是「为 S11–S30 补上」。
所以对 S03/S07，`!d.mechanism` 为 false（它们已有值）**且** `MECHANISMS[d.id]` 为 undefined，
两个条件同时不成立。想靠改 `mechanisms.mjs` 修 S03/S07，连改的位置都不存在。

反过来，S17 在 `dna-clean.json` 里 mechanism 是**空串**（复算：`dna-clean.json` 中有 mechanism 的
只有 10 案 = S01–S10；空的 20 案 = S11–S30），因为 `_specs/S17.md` **没有 `1-附` 这一行**：

```
$ grep -n "1-附" prototypes/_specs/S17.md
--- exit:1 ---      ← 零命中
$ grep -c "1-附" prototypes/_specs/S03.md prototypes/_specs/S07.md
prototypes/_specs/S03.md:1
prototypes/_specs/S07.md:1
```

`_specs/S17.md` 的字段是 `**1. 一句话视觉定义**` … `**12. 设计师签名式怪癖**`（markdown 粗体
独占行惯例 B），**没有 1-附**。这解释了 10/30 的分布，也解释了为什么 S17 必须走链 B。

---

## 3. 真源文件（有证据）

| 案 | 真源文件:行 | 证据 |
| --- | --- | --- |
| **S03** | `deliverables/04-schemes-01-10.md:95` | 该行 === `_specs/S03.md:15` 逐字节相同；`_specs/S03.md` 头部自述「机械切分，未改一字」+「源：`deliverables/04-schemes-01-10.md` 第 89–130 行」。上游只有一个，`_specs` 是副本。 |
| **S07** | `deliverables/04-schemes-01-10.md:255` | 同上，该行 === `_specs/S07.md:15`；`_specs/S07.md` 头部「源：`deliverables/04-schemes-01-10.md` 第 249–286 行」。 |
| **S17** | `prototypes/_prompts/mechanisms.mjs:45` | 全库无更上游。`_specs/S17.md` 无 `1-附` 行；`deliverables/05-schemes-11-20.md` 全文 `grep -c "两联按 3fr"` → **0**。`mechanisms.mjs:45` 是这句话**第一次出现**的地方。 |

S17 的 `96px` 数字本身另有上游（`_specs/S17.md:26` 字段 5「金额列宽固定 96px 且右对齐」），
但它**不是机制句的容器**——机制句这个字符串只由 `mechanisms.mjs:45` 首次产出。

---

## 4. 改哪里才能撑过两条重跑命令

### 4.1 先确认威胁面

| 脚本 | 读 | 写 | 对机制句的威胁 |
| --- | --- | --- | --- |
| `node prototypes/_prompts/build-prompts.mjs` | `dna-clean.json`, `data.js`(risk/landing), `mechanisms.mjs`, `minitems-parsed.json` | `prompts.js` | 会把 `prompts.js` 里的手改**全部冲掉** |
| `node prototypes/_build/collect-schemes.mjs` | `_specs/*.md`, `_specs/_CURRENT-VALUES.md`, 各案 css/html/svg, `.inspect/report.json` | **仅 `data.js`**（:715） | **零威胁**。data.js 无 mechanism 字段，写不到机制句 |

所以提问里担心的「`collect-schemes.mjs` 会覆盖」**不成立**。真正的威胁是另外两件事：
(a) `build-prompts.mjs` 重跑 → 必须改它的**输入**；
(b) `prototypes/_build/extract-specs.mjs` 重跑 → **会覆盖 `_specs/*.md`**（:84），
    这是提问没列、但实际存在的第三个脚本。

### 4.2 落点

**S03 / S07 —— 改 `deliverables/04-schemes-01-10.md` 的 :95 / :255。**
理由：`_specs/*.md` 是 `extract-specs.mjs` 的产物，只改 `_specs` 会撑过 `build-prompts` 与
`collect-schemes`，但被 `extract-specs.mjs` 一次重跑抹掉。改 04 是改在**切分的上游**，
`_specs` 重生成后仍是新句子。

然后（缺一不可）：

```
node prototypes/_build/extract-specs.mjs      # 04 → _specs/*.md（若改了 04）
node prototypes/_prompts/extract-dna.mjs      # _specs/*.md → dna-raw.json   ← 易漏
node prototypes/_prompts/clean-dna.mjs        # dna-raw.json → dna-clean.json ← 易漏
node prototypes/_prompts/build-prompts.mjs    # dna-clean.json → prompts.js
```

顺序为什么不能跳：`build-prompts.mjs:28` 只读 `dna-clean.json`，它**不读 `_specs`**。
只改 `_specs` 而不跑 `extract-dna` + `clean-dna`，`prompts.js` 一个字都不会变——
而且 `build-prompts.mjs` 不会报错，它只会照旧输出 `dna-clean.json` 里的旧句子。

**S17 —— 只改 `prototypes/_prompts/mechanisms.mjs:45`（建议连带 :46 的 `source` 一起改）。**
理由：`dna-clean.json` 里 S17 的 mechanism 是空串，链 A 完全不参与。改完只需跑
`node prototypes/_prompts/build-prompts.mjs`。不需要 `extract-dna` / `clean-dna`
（它们不产出 S17 的机制句），也不需要 `collect-schemes`。

### 4.3 一处必须同时改两处的案

S17 的 `96px` **同时**存在于两条链：
- 链 B：`mechanisms.mjs:45`（机制句，进提示词）
- 链 A 的源：`_specs/S17.md:26` 字段 5 与 `:29` / `:49`（规格散文，进 `data.js` 字段 5）
  ← 但注意 `05-schemes-11-20.md:348` 是 `_specs/S17.md` 的上游，改规格要改那里。

只改 `mechanisms.mjs` 能让提示词正确，但 `data.js` 与规格文档仍写着 96px。
这是**同一事实的两条独立存储**，属于 §6 的分叉风险。

---

## 5. 闸门覆盖：零

```
prototypes/_build/check-anchors.mjs  : 0 处 mechanism
prototypes/_build/check-contract.mjs : 0 处
prototypes/_build/check-prompts.mjs  : 0 处      ← 最该管它的那个，也不管
prototypes/_build/check-stale.mjs    : 0 处
prototypes/_build/check-texture.mjs  : 0 处
prototypes/_build/check-twolines.mjs : 0 处
prototypes/_build/check-docs.mjs     : 5 处（仅出现在「别把机制当数字轴」的跳过规则 OTHER_AXIS 里，:560）
```

`check-prompts.mjs` 只验两件事：配色段每个 hex 必须在 CSS 里存在（:245-255），
线宽每一级必须在 CSS/HTML/JS 里存在（:264-278）。**机制句里的数字完全不过闸。**
所以机制句可以长期写着与 CSS 矛盾的数值，而全绿。这正是三案硬错能存活至今的机制原因。

---

## 6. 影响面表（S03 / S07 / S17 各错在哪）

错的到底是什么（逐条对 CSS 复核）：

| 案 | 机制句原话 | CSS/JS 实况 | 判定 |
| --- | --- | --- | --- |
| **S03** | 「右侧 **9 栏**的高度按 30 秒曝光折成 28px 一档」 | `style.css:124` `.chrono{grid-template-columns: var(--axis-w) minmax(0,1fr)}` —— 两条轨道：264px 轴 + **一个弹性栏**。全文件 `repeat(` 只有 `:188` 的 `repeat(2,…)`。「12 栏 / 右 9 栏」只存在于 `style.css:120` 的**注释**里 | 错。9 栏是注释散文，不是网格 |
| **S03** | 「**游标随焦距比移动**」 | `index.html:306` `cursor.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"` —— 1:1 跟随鼠标。全文件 `grep 焦距` → **0** | 错。该行为不存在 |
| **S07** | 「正面 **5 栏**对背面 **7 栏**」 | `style.css:74` `.pages{grid-template-columns:5fr 1px 7fr}` 是**两页宽度比**；真实文字栏数是 `:81` `.page-recto .toc{column-count:2}` 与 `:82` `.page-verso .toc{column-count:3}` | 错。把页宽比当栏数 |
| **S07** | 「栏线 0.5px」 | `style.css:80` `.toc{column-rule:.5px solid var(--slate)}` | **对**（唯一对的一项） |
| **S17** | 「金额列 **96px** 右对齐」 | `style.css:181` `td.num{text-align:end}` —— 桌面档**无 width**；`:320` `td.num{width:88px}` 在 `@media(min-width:1024px) and (max-width:1439px)` 内（:308 开）。审查视口 1440px 落在 :302 的 `@media(min-width:1440px)`，该档只给 `--gutter` 与 `.sheet` | 错。88px 是 1024–1439 档的值，且桌面档根本没有写死宽度 |
| **S17** | 「3fr、16px、9fr 分栏」 | `style.css:134` 桌面 `grid-template-columns: minmax(210px,3fr) 16px 9fr`；`:304` ≥1440 档 `3fr 16px 9fr` | **对** |

讽刺的是 S17 的 `mechanisms.mjs:46` **自己写了正确值**：
「`:181 金额右对齐（1024–1439 档 :320 压到 88px）`」——出处注释已经点明 88px，
句子里却仍写 96px。**这条出处不是证据，是自证其伪。**

### 每个错误串出现的文件（活源，排除 `_backup`/`snap`/`frozen`/`_head`/`probes`/`_chrome*` 缓存）

**S07「5 栏对背面 7 栏」**

| 文件 | 行 | 性质 |
| --- | --- | --- |
| `deliverables/04-schemes-01-10.md` | 255 | **真源**（人写） |
| `prototypes/_specs/S07.md` | 15 | 派生副本（`extract-specs.mjs` 产出） |
| `deliverables/11-compiled-30.md` | 518 | 派生副本（与 04 逐字节相同） |
| `prototypes/_prompts/dna-raw.json` | — | 派生（`extract-dna.mjs`） |
| `prototypes/_prompts/dna-clean.json` | — | 派生（`clean-dna.mjs`） |
| `prototypes/_selection/prompts.js` | 709 | **产品**（`build-prompts.mjs`） |
| `deliverables/74-plan/{OFFERING,PROMPT-SYSTEM,00-MASTER-PLAN,CRITIQUE-OFFERING}.md` | 64 / 187 等 | 分析文档，**引用**该句作为缺陷证据 |
| `deliverables/74-recon/{redteam,redteam2}.md` | — | 同上 |
| `deliverables/70-exec/probes-b/prompts/S07.txt` | — | 渲染快照 |
| `deliverables/69-audit/{dump30.json,dump30-default.txt,dump30-filled.txt,constraints.json,t3-uclass.json}` | — | 审计快照 |
| `deliverables/99-scratch/**`（iv/mirror 整套镜像、dna-*.json） | — | 取证镜像 |
| `deliverables/tool-runs/scheme-specs/S07.md`、`tool-runs/v4/S07.md` | — | 旧快照 |

**S17「金额列 96px」**

| 文件 | 行 | 性质 |
| --- | --- | --- |
| `prototypes/_prompts/mechanisms.mjs` | 45（46 自证 88px） | **真源**（人写） |
| `prototypes/_selection/prompts.js` | 1174 | **产品** |
| `prototypes/_specs/S17.md` | 26 / 29 / 49 | **并行**真源（规格散文，96px 原文） |
| `deliverables/05-schemes-11-20.md` | 348 / 351 / 371 | `_specs/S17.md` 的上游（规格散文） |
| `deliverables/74-plan/OFFERING.md` / `PROMPT-SYSTEM.md` | 64 / 187 | 分析文档，**引用**为缺陷证据 |
| `deliverables/69-audit/**`、`70-exec/probes-b/**`、`99-scratch/**` | — | 快照/镜像 |
| `deliverables/63-audit/hard-S11-S20.md` | 204 | 审计文档，**引用**该句 |

**S03「9 栏」**

| 文件 | 行 | 性质 |
| --- | --- | --- |
| `deliverables/04-schemes-01-10.md` | 95 | **真源**（人写） |
| `prototypes/_specs/S03.md` | 15 | 派生副本 |
| `prototypes/_specs/S03.md` | 25 | 同一 9 栏在字段 5 再现（「右侧 9 栏放影像带」，与 CSS 同样不符） |
| `deliverables/11-compiled-30.md` | 358 | 派生副本 |
| `prototypes/S03-*/style.css` | 120 | **CSS 注释**「12 栏，左 3 栏年代轴，右 9 栏影像带」——第 4 个独立存储点 |
| `prototypes/_prompts/{dna-raw,dna-clean}.json` | — | 派生 |
| `prototypes/_selection/prompts.js` | 517 | **产品** |
| `deliverables/74-plan/OFFERING.md` | 64 / 248 | 分析文档，引用为缺陷证据 |
| `deliverables/74-w4/sentence.json` | — | 本轮调查产物 |
| `deliverables/99-scratch/**`、`52-scratch/**`、`56-scratch/head/S03.spec.md` | — | 快照/镜像 |
| `deliverables/tool-runs/scheme-specs/S03.md` | — | 旧快照 |

---

## 7. 分叉风险（同一句话存在两条以上独立链）

**存在，共 4 处，按危险度排序：**

### ① S03 的「9 栏」有 4 个独立存储点，3 个是人手可编辑的

```
deliverables/04-schemes-01-10.md:95      ← 机制句（人写）
deliverables/04-schemes-01-10.md 字段5   ← 同一数字的散文版
prototypes/S03-*/style.css:120           ← CSS 注释，第 3 份
prototypes/_specs/S03.md:15 与 :25       ← 副本（会被 extract-specs 覆盖）
```
改 04 的 :95 之后，`style.css:120` 的注释仍写着「右 9 栏」，`_specs/S03.md:25` 仍写着
「右侧 9 栏放影像带」。**没有任何机制把它们绑在一起**，也没有闸门比对注释与 grid 声明。

### ② S17 的「96px」在两条链上，且互相矛盾

```
链 B（进提示词）：mechanisms.mjs:45          → prompts.js:1174   「96px」
链 A（进 data.js / 规格文档）：_specs/S17.md:26 → data.js 字段5    「96px」
同一文件 mechanisms.mjs:46 的出处注释          「…:320 压到 88px」  ← 88px
实现：S17-*/style.css:320（1024–1439 档）      88px；:181 桌面档无 width
```
这里是**三条口径互相打架**：机制句 96、自己的出处注释 88、CSS 88、规格散文 96。
改任一处都不能让其余三处一致。

### ③ S01–S10 与 S11–S30 是两套完全不同的维护方式，但产品里长得一样

`prompts.js` 里 30 条 `mechanism` 字段形状相同，来源却是两个文件、两条链、两种格式：
链 A 是 markdown 里的一行散文（改动要重跑 4 个脚本），链 B 是 JS 对象（改完重跑 1 个）。
`prompts.js` 的 banner（`build-prompts.mjs:334-353`）**只说明 fonts/palette/radius/lineWidths
的来源，一个字没提 mechanism 分两部分**。下一个维护者从 `prompts.js` 反推，必然推错。

`collect-schemes.mjs:187-190` 的注释其实已经预见了这个坑，并给了错误的一半建议：

```
 * 为什么不能在这里也读一遍：那会让 data.js 也带一份机制句（只有 10/30，S11–S30 是空的），
 * 同一个概念就此有两个来源、且其中一个天生残缺 20 案。……
 * 要动机制句，改 mechanisms.mjs（它自己写了判据与行号来源），不要动这里。
```

「改 `mechanisms.mjs`」对 S11–S30 **对**，对 S01–S10 **错且无效**（那里连键都没有）。
注释没有写这个分界。

### ④ `dna.mechanism` 与 `data.js` 的字段 1/5 讲同一件事，但从不互校

S07 的「5 栏对 7 栏」在 `_specs/S07.md:13`（字段 1「左栏 5 栏窄、右栏 7 栏宽」）与 :15
（机制句）出现两次；S03 的「9 栏」在 :15 与 :25 出现两次。机制句是字段 1/5 的**摘要**，
但摘要与原文是两份手写文本，没有生成关系，也没有一致性检查。

---

## 8. 一句话答案

- **S03 / S07**：真源是 `deliverables/04-schemes-01-10.md`（:95 / :255）。
  改这里 → `extract-specs` → `extract-dna` → `clean-dna` → `build-prompts`。
  只改 `_specs/*.md` 能撑过 `build-prompts` 和 `collect-schemes`，但撑不过 `extract-specs`。
  改 `mechanisms.mjs` 对这些案**完全无效**（该文件无 S03/S07 键）。
- **S17**：真源是 `prototypes/_prompts/mechanisms.mjs:45`。改这里，跑 `build-prompts` 即可。
  但「96px」这个数字另有 3 个存储点（`_specs/S17.md` 三处 + CSS 实况 88px），要一并处理。
- `collect-schemes.mjs` 重跑**不影响**机制句（`data.js` 无该字段），提问里的这一半担心可以撤销。
- 全库 6 个 `check-*.mjs` 里对 mechanism 的校验数为 **0**，所以这些错能长期存活且全绿。
