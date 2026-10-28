# PLAN-guards — 产品自身的守卫设计

> 规划 Agent 产出。只读轮次，未修改 `prototypes/`、`templates/`、`README*`、`tools/`。
> 探针脚本全部落在 `deliverables/68-plan/`，可逐条复跑。

**测量时刻**：2026-10-28T22:58:20+08:00 → 2026-10-28T23:24:11+08:00（Asia/Shanghai）
**当时 HEAD**：`ce4ea78c0c603a1f1357f1282fc8537349a431ac`（branch `main`）
**当时工作区**：`git status --porcelain` 共 986 行；**tracked-modified = 0**；untracked = 986，全在 `deliverables/6*-*`
**测量结束时复核（23:24）**：HEAD 未变；**tracked-modified 仍为 0**；untracked 986→989（差额是我自己新建的 `deliverables/68-plan/` 一个目录条目，git 对未跟踪目录只记目录本身）

> ### ⚠️ 并发改动声明（23:30–23:31，我已重测）
>
> 在我完成测量、开始写报告之后，**另一个 Agent 改动并提交了工作区里的已跟踪文件**。23:34 复核时 `git status` 出现 12 个 `M`：
>
> ```
> M prototypes/_build/check-stale.mjs          （mtime 23:30:11，+64/−4 行）
> M prototypes/_selection/.inspect/report.json （mtime 23:31:36）
> M prototypes/_selection/.inspect/*.jpg ×10   （mtime 23:31:23）
> ```
>
> 这个改动**恰好就是我本报告 §E 建议的那一件事（P1-1）**：把 `check-stale.mjs` 从只扫 `/^S\d{2}-/` 扩到也扫 `_selection/`，并重新渲染了 `_selection`。
>
> **我按任务书要求重测了受影响的全部数字。重测结论：**
>
> | 我原先的测量（23:0x） | 重测（23:34） | 是否改变结论 |
> |---|---|---|
> | `_selection` 报告 `at=2026-10-21T19:51:17Z`，落后 8562 分钟 | 新报告 `at=2026-10-28T15:30:43Z`，**已新鲜** | 数字变了，**结论不变**（见下） |
> | 重渲染得 `FAIL 2`（`body-size` + `hairline`） | **新报告同样是 `FAIL 2`（`body-size` + `hairline`），逐条一致** | **结论不变，且被独立复现** |
> | `check-stale.mjs` 报 `✓ 全部新鲜` 却漏掉 `_selection` | 现在报 `检查 30 案 + 1 个产品入口`，且**确实会拦 `_selection`** | P1-1 已由他人完成 ✅ |
> | `data.js` vs 磁盘：`mismatches: 1 -> S13` | **仍是 `mismatches: 1 -> S13`** | **结论不变**（P0-2 仍未修） |
> | `templates/` 无 `.inspect/`、无任何守卫 | **仍然无**（`check-stale` 新代码里 `templates` 出现 0 次） | **结论不变**（P1-2 仍未做） |
>
> **最重要的交叉验证**：另一个 Agent 用**它自己的**渲染跑出了和我**完全相同的两个 FAIL**（`body-size 13px @1440` + `hairline 2 处 @768`）。这不是我一个人的测量偏差，是这份代码的真实状态。§0 的"`闸门 FAIL=0` 是假的"因此被独立证实——**那个 0 变成了 2，写进了入库的 `report.json`**。
>
> 下文所有数字，除特别标注外，**仍是 23:0x 的原始测量**；凡是受这次并发改动影响的，我都已在上表和正文相应位置标注"重测"。`_selection` 的 2 个 FAIL 在改动前后**完全一致**，因此 §A–§D 中基于它们的判断无需修改。
>
> 也正因为这件事发生了，**§E 的推荐需要更新**：P1-1 已被别人做掉，见 §E.1。
>
> **23:42 最后复核**：并发改动**仍在进行**（`tracked-modified` 从 12 增至 **13**，`prototypes/_selection/style.css` 于 23:41:20 被改）。HEAD 始终未变（`ce4ea78`）。**结论：这个仓库正被多个 Agent 同时修改，任何"当前状态"的断言都有几分钟的半衰期——这正是本报告 §E 主张"要守卫、不要一次性体检"的根本理由。**

## 00. 我自己的只读合规声明

我这一轮**没有改动任何 `prototypes/`、`templates/`、`README*`、`tools/` 下的文件**。证据：

```
=== 我的全部 report.json 写入都在 deliverables/68-plan/ 下 ===
deliverables\68-plan\probe-out\sel\report.json                  23:08:00
deliverables\68-plan\probe-out\sel2\report.json                 23:10:19
deliverables\68-plan\probe-out\M01-clean-corporate\report.json  23:13:30
deliverables\68-plan\probe-out\M02-warm-local\report.json       23:14:07
deliverables\68-plan\probe-out\M03-bold-creator\report.json     23:14:36
deliverables\68-plan\probe-out\sel-allow\report.json            23:15:30
deliverables\68-plan\probe-out\sel-badcwd\report.json           23:17:42
deliverables\68-plan\probe-out\wizard\report.json               23:19:20
deliverables\68-plan\probe-out\sel-allow2\report.json           23:22:13

=== 只读路径的 mtime 全部早于本轮开始（22:58）===
prototypes\_build\verify-prototype.mjs                2026/10/24 4:08:25
prototypes\_build\collect-schemes.mjs                 2026/10/27 6:21:22
templates\M01-clean-corporate\style.css               2026/10/20 3:49:42
README.md                                             2026/10/27 18:19:04
tools\...\lint.mjs                                    2026/10/14 20:10:30
```

`prototypes/_selection/.inspect/` 下那些 23:30–23:31 的改动（1 个 `report.json` + 10 张 `.jpg`）**不是我的**——是上面并发说明里那位 Agent 的重新渲染。

---

## 0. 先说结论

我实测后认为，本轮的**真正风险不是「产品没被闸门检查过」**——它其实被检查过，`prototypes/_selection/.inspect/report.json` 是**入库文件**，且长时间被当作"0 FAIL"的证据。真正的风险是：

> **守卫存在，但它的输出是陈旧的，而"陈旧"这件事恰好落在所有守卫的盲区里。**

（23:34 补注：这条判断在 23:30 被一位并发 Agent 用行动证实——它正是照这个诊断去补的 `check-stale`。所以下文把这段保留为**当时的诊断记录**，并在受影响处标注"重测"。）

三条实测证据都指向同一个结论：

| 事实 | 实测数字 | 复跑命令 |
|---|---|---|
| `_selection` 的入库报告严重陈旧 | 报告 `at=2026-10-21T19:51:17Z`，产品源码最新 mtime `2026-10-28T02:33:10` → **落后 8562 分钟（5.95 天）**，其间 **25 个 commit** 改过 `_selection/` | `node deliverables/68-plan/probe-reconcile.mjs` |
| `check-stale.mjs` 看不见它 | 它只扫 `/^S\d{2}-/`，输出 `✓ 全部新鲜`，而 `_selection` 当时已陈旧 5.95 天 | `node prototypes/_build/check-stale.mjs`（见 `check-stale.mjs:23`；**此条已于 23:30 被他人修复**） |
| 重渲染后判据变了 | 旧报告 `WARN:no-footage, WARN:measure`；新渲染 **`FAIL:body-size` + `FAIL:hairline`** + `WARN:no-footage` + `WARN:measure` | `node tools/.../inspect.mjs prototypes/_selection/index.html --out deliverables/68-plan/probe-out/sel --widths 1440,768,390 --json` |

> **23:34 重测更新（必读）**：另一个 Agent 已在 23:30–23:31 把 `check-stale.mjs` 扩到覆盖 `_selection` **并重新渲染入库**。新 `report.json` 的 `at=2026-10-28T15:30:43Z`，其 findings 与我独立渲染的结果**逐条一致：同样 2 个 FAIL（`body-size` + `hairline`）+ 2 个 WARN**。
>
> 所以：**"陈旧"这一条现在已不成立**（报告已新鲜、`check-stale` 已能拦住）——**P1-1 被他人完成**。但 **"这个页面真实是 2 FAIL，而此前 5.95 天里面向用户展示的是 0"** 这一条，反而被这次独立复现**证实并固化**了：那 2 个 FAIL 现在写进了入库文件。

换句话说：选型台首页上曾写着「**闸门 FAIL=0**」（截图实证见下），而这个 0 是 5.95 天前、在 **25 次 commit** 改动 `_selection/` 之前算出来的。今天重跑，它是 **2 FAIL**——**而且这个 2 现在已经是仓库里的真相**。

`prototypes/_selection/.inspect/mobile-fold.jpg` 我实际打开看过，报头第二行原文就是：

```
方案总数 30   已建原型 30 / 30   闸门 FAIL=0   26
截图总数 272
```

这个 `26` 来自 `data.js` 的 `"fail": 0` 计数（`app.js:54` `clean: ALL.filter(r => r.gate && r.gate.fail === 0).length`），**不是**现场跑闸门得到的。

---

## A. 产品该被什么守住（守卫设计）

### A.1 先划清「产品界面」与「规格载荷」——这是整个守卫设计的分水岭

任务书给的 `lint.mjs` 作用域是 5 个文件。我实测发现 `_selection/` 下有 **9 个** front-end 可扫文件，被漏掉的 4 个里藏着 73.9% 的 FAIL：

```
$ node deliverables/68-plan/probe-ui-vs-payload.mjs

=== UI source only (6 files: html/css/js that build the interface) ===
  files=6  FAIL=30  WARN=16
  eyebrow=2  emoji=15  shadow=2  gradient=1  hairline=9  numbering=1

=== spec payload only (3 files: prose describing the 30 schemes) ===
  files=3  FAIL=85  WARN=2
  mono=45  shadow=36  purple=1  hairline=1  emoji=2

=== whole _selection dir (what a naive "lint the product" does) ===
  files=9  FAIL=115  WARN=17
  payload share of FAILs: 85/115 = 73.9%
```

- **界面源码**（该守）：`index.html` `wizard.html` `style.css` `wizard.css` `app.js` `wizard.js`
- **规格载荷**（换算成网页文本，**不该守**）：`data.js`（2581 行）、`prompts.js`（1722 行）、`prompt-copy.js`（964 行）

`data.js` 第 1 行自己写着「由 `prototypes/_build/collect-schemes.mjs` 生成，勿手改」。它的内容是**描述 30 个方案的中文散文**，例如 `data.js:358`：

```
"landing": "CSS 思路——凹槽用两层 box-shadow: inset 加 1px 边框实现，禁止 border-radius；…"
```

lint 在这里数出 36 处 `shadow`、45 处 `mono`——它数的是**「描述 CSS 的中文句子」**，不是 CSS。把这些算成产品的设计缺陷是**量错对象**：这段文本的工作恰恰是**教用户避开**这些模式。

> **判定**：对 `_selection/` 跑 lint 必须显式枚举 6 个界面文件，**不能**传目录。传目录 = 74% 的噪声，且噪声全在"内容正确"的一侧。

**templates 的情形不同**：3 个模板没有载荷文件，`style.css` 就是真 CSS，`index.html` 就是真 HTML。所以 `templates/` 可以整体扫。实测 60 FAIL：

```
   17  templates/M01-clean-corporate/style.css
   11  templates/M03-bold-creator/style.css
    9  templates/M01-clean-corporate/index.html
    9  templates/M03-bold-creator/index.html
    8  templates/M02-warm-local/style.css
    6  templates/M02-warm-local/index.html
```

**templates 目录里的 60 条，全部落在界面源码上，没有一条是噪声。**

---

### A.2 哪些规则该生效：按「规则在测什么」分三层

我把 lint 的规则表从源码里解析出来（不是抄任务书）：

```
$ node deliverables/68-plan/probe-rules-inventory.mjs
=== lint.mjs static rule inventory (parsed from source) ===
total rule entries: 23  (FAIL 12, WARN 11)
distinct ids: 22 -> mono, gradient, gradient-text, shadow, numbering, eyebrow, micro-label,
purple, claude-palette, emoji, lorem, hairline, outlined-box, glass, copy, cta-copy,
default-font, transition-all, ease-in, scale-zero, h-screen, bounce

rules.mjs RULE_IDS: 52 ids
RENDER-ONLY (in judge/RULE_IDS but no static lint rule): 41
```

注意这里已经和任务书有出入，见 §F。据此我建议**三层分类**：

**第 1 层 · 无条件生效（18 条）**——测的是"界面的机械质量"，与界面类型无关：

`mono`(代码外) `gradient` `gradient-text` `shadow`(静态) `text-shadow` `button-fx` `contrast` `broken-image` `overflow` `ui-wrapper` `font-fallback` `lorem` `purple` `claude-palette` `default-link` `h-screen` `transition-all` `ease-in` `scale-zero` `bounce`

这批的共同点：**违反了就是坏了**。`overflow` / `broken-image` / `contrast` 是可用性缺陷，不是审美偏好；`lorem` 是没写完；`h-screen`/`bounce`/`scale-zero` 是有明确更优解的机械坏味道。

**第 2 层 · 需按界面类型裁定（约 20 条）**——测的是"营销页的修辞习惯"：

`eyebrow` `numbering` `hairline` `outlined-box` `few-pictures` `focal-point` `hero-words` `first-action` `still-page` `card-rows` `icon-cards` `pill-nav` `measure` `all-centred` `no-footage` `no-real-pictures` `palette-cream` `palette-terracotta` `font-count` `micro-label`

这批的共同点：**规则原文假定的对象是「一个品牌落地页」**，而产品的三个界面是**工具**（列表页、问答向导、模板）。规则的意图在工具界面上**部分成立**。

**第 3 层 · 对产品完全不适用（不建议纳入守卫）**：

- `few-pictures`（≥4 张真实图片）：**已实测不误报**，见 A.4。
- `no-footage`（必须有视频）：对工具界面无意义，但它是 WARN，留着不碍事。
- `hero-words`（hero ≤10 词）：`_selection` hero 是「三十个案，一条渲染口径」= 7 个中文词元，通过。
- `statement-length` / `mixed-font-headline` / `blend-text`：产品不涉及该机制。

> **关键实测**：任务书担心的两个"可能不适用"的 FAIL——`focal-point` 与 `few-pictures`——在 `_selection` 上**本来就已经通过**，这不是我豁免出来的，是它们自己过的：

```
$ node deliverables/68-plan/probe-applicability.mjs   （见 §A.4 复跑）
hero: 三十个案，一条渲染口径
hero size=74px (5.1vw)  lines=1
heroMedia[0].ratio = none
uiFragments = 0
-> focal-point PASSED? True

=== few-pictures: realPictures=30（30 张方案缩略图）, rule wants >=4 at >=1100 ===
few-pictures FAIL present = False
```

所以**不要**预先豁免这两条。预先豁免会制造"清单与实际不符"的漂移——正是任务书担心的第二种代价。**让规则自己跑，它不响就是不该响。**

---

### A.3 `_selection` 的 9 处 `hairline`：真缺陷还是设计选择？

任务书问：这 9 处是"真列表分隔线"还是装饰。我逐条看了 CSS 与渲染结果。

**先看渲染侧实际被判的是哪几个**（静态 lint 报 9 处，渲染只报 2 处——两者口径不同，见 F.4）：

```
FAIL [hairline] @768 alsoAt=390 :: 2 thin rule(s)/divider line(s):
     details#mast-fold.mast-fold 712px | dl#facts.mast-facts 712px
```

对应源码：

```
style.css:1098   .mast-fold { border-top: 1px solid var(--rule); margin-top: 8px; }
style.css:1112   .mast-facts { ... border-top: 1px solid var(--ink); }
```

`--rule: #bdbbb2`（`style.css:20`），`--ink` 是正文墨色。这两条是**页头区块的分隔线**，既不是表格线也不是表单线。

**我的判定（附理由，供裁定者复核）**：

- **`#facts` 的 `border-top: 1px solid var(--ink)` — 判为装饰，非缺陷。** 它用的是**满墨 `--ink`** 而不是 `--rule` 灰，1px 实线在 712px 宽上横贯，功能上是"把报头数字区与正文分开"。规则原文允许"用间距、色阶或尺度替代"——这里作者**同时**用了 8px `margin-top` + 5px `padding-top`（`style.css:1110-1111`），线是**叠加**在间距上的，属装饰性复述。
- **`.mast-fold` 的 `border-top: 1px solid var(--rule)` — 边界情况，倾向判为 earned。** 它是 `<details>` 折叠块的顶边，用户需要知道"这里可以展开"。但 `style.css:1069` 已经给了 `::before` 三角标记做同一件事，所以这条线**功能冗余**。

> **判定框架（给裁定者）**：一条 `hairline` 要判 earned，必须同时满足 ①它在 DOM 里承担**分组语义**（不是纯视觉分隔）②移除它会**丢失信息**（不是与间距/色阶重复）③它不是 `table`/`input`/`hr`（后三者 lint 与 probe 都已豁免）。按这三条，`#facts` 不满足 ②，`.mast-fold` 不满足 ②。

**边界上的重要事实**：`lint` 的 `hairline` 与渲染的 `hairline` **不是同一条判据**。lint 按"源码里出现 `border-top: 1px`"计数（9 处）；probe 按"渲染后元素实际尺寸 ≥240px 且只有单边细线"计数（2 处）。**一个界面可以 lint 报 9 而渲染报 0**——所以守卫必须**两个都跑**，不能只跑 lint。

---

### A.4 `templates/M01` 的 17 处 `eyebrow`：设计选择还是违规？

任务书问得很准：名字就叫 `clean-corporate`，kicker 标签是不是设计选择。

**先看它到底是什么**：

```html
<!-- M01 index.html:71 -->
<p class="eyebrow">【换成你的：行业标签，例如 企业法律顾问 / 品牌设计 / 软件外包】</p>
<h1>【换成你的：主标题，一句话说清你为谁解决什么问题】</h1>

<!-- M01 index.html:227 -->
<p class="eyebrow eyebrow-invert">成果</p>
<h2 id="results-h">【换成你的：数据区小标题，例如 用数字说明我们做了什么】</h2>
```

```css
/* M01 style.css:89 */
.eyebrow{ margin-bottom:10px; font-size:15px; font-weight:700; letter-spacing:.05em; color:var(--brand); }
```

**我的判定：这是违规，不是设计选择。** 三条证据：

1. **它是规则的教科书正例。** 规则的排除条件是"标签若承载真实信息就折进标题或支撑句"。这里 `<p class="eyebrow">成果</p>` 的整个信息量就是"成果"两个字，而紧跟的 `<h2>` 本身就是数据区小标题——标签与标题**语义重复**。
2. **它连"工具"论点都站不住。** 模板是给用户**改**的，kicker 是**占位符**在教用户"这里可以放一行小标签"。也就是说：模板在**教**用户生产 AI 味。这与整个图集的目的相反。
3. **15px 不是 micro-label，但仍然是 eyebrow。** `font-size:15px`、`letter-spacing:.05em`、非 uppercase——它躲过了 `micro-label`（要求 uppercase + tracking-wide + text-xs）却正好落在 `eyebrow` 的定义里。**两条规则的缝隙不该成为免罪理由。**

**但要区分两类**：M01 有 5 处 eyebrow（渲染计数），M02 有 6 处，M03 有 4 处。其中形如 `【换成你的：行业标签…】` 的**占位符**与形如 `成果`/`菜单`/`到店` 的**真实标签**应分别处置：前者是模板脚手架（可保留，但应改成非 eyebrow 的写法或加豁免），后者是明确的违规。

> **判定框架**：`eyebrow` 判 earned 需要 ①该标签承载**无法折进标题**的信息（如时间戳、状态）②它不是纯占位符 ③同页此类标签 ≤1。按此，M01 的 17 处中**没有一条**满足 ①。

---

### A.5 豁免机制怎么表达：三选一，我选哪个

仓库里现有**三种**豁免通道，我全部实测过：

| 通道 | 存在性实测 | 能否入库 | 对渲染闸门有效 | 可审计 |
|---|---|---|---|---|
| `taste-skill-ignore` 行注释 | `S*` 里 46 处；`_selection`+`templates` 里 **0 处** | ✅ 能 | ❌ **完全无效** | 弱（易空转） |
| `direction.json` 的 `allow[]` | 全仓仅 S03 一处 | ❌ `.gitignore:18 **/.taste-skill/` 已排除 | ⚠️ 路径失配，实际读不到 | ✅ 有 note/raw_value |
| `inspect.mjs --allow` + `report.json.allow[]` | `_selection` 报告 `allow=[]` | ✅ 报告已入库 | ✅ 有效 | ✅ 落在报告里 |

**关键实测 1：`taste-skill-ignore` 对渲染闸门是死的。**

```
$ Select-String -Path .../probe.mjs,.../rules.mjs,.../inspect.mjs,.../lint.mjs -Pattern 'taste-skill-ignore'
probe.mjs=0  rules.mjs=0  inspect.mjs=0  lint.mjs=2
```

只有 `lint.mjs` 读它。而 S13 的作者**自己**在 `style.css` 里写下了这条教训：

```
/* ---------- 凹全改 inset 的理由：2026-10-27（治 shadow FAIL） ----------
闸门 shadow 的判据不是注释，是 computedStyle.boxShadow 里有没有非 inset 段（probe.mjs:318）。
所以「这是单向接触阴影、不是卡片投影」这类 taste-skill-ignore 辩解对闸门一字不起作用
—— 15 条带该注释的 box-shadow 里，有 17 个元素被这条判据数到。
```

**这条注释已经空转了 15 次。** 这是"注释会腐化"的实证，不是担忧。

**关键实测 2：`direction.json` 的自动读取路径是坏的。**

`inspect.mjs:28` 只探两个路径：

```js
for (const p of ['.taste-skill/direction.json', join(outDir, '..', 'direction.json')]) {
```

`draw.mjs:37` 写的是 `join(outDir, 'direction.json')`。当 `--out prototypes/S03/.inspect` 时，`outDir/../direction.json` = `prototypes/S03/direction.json`，而实际文件在 `prototypes/S03/.taste-skill/direction.json`。**两个候选路径都不等于写入路径。**

```
$ node deliverables/68-plan/probe-direction-path.mjs
inspect.mjs probes exactly these two paths:
  1) .taste-skill/direction.json            exists=false
  2) .....inspect/../direction.json         exists=false
the declaration a per-scheme run writes:
  .....taste-skill/direction.json           exists=true
=> neither probed path equals the written path. The declaration cannot be read.
```

**后果实测**：S03 的 `direction.json` 声明 `"allow": ["mono"]`，而它的 `report.json` 里 `allow: []`——**声明从未生效过**。

**关键实测 3：`--allow` 是唯一真正进入报告的通道。**

```
$ node tools/.../inspect.mjs prototypes/_selection/index.html \
    --out deliverables/68-plan/probe-out/sel-allow2 --widths 1440 \
    --allow body-size,few-pictures,broken-image,hairline --json
allow in report = [body-size,few-pictures,broken-image,hairline]
FAIL after allow = 0
```

`--allow` 的值被写进 `report.json.allow`，**入库后随报告一起走**，可被 diff、可被 review、可被 `verify-prototype` 校验。这是我要求的审计闭环。

#### 我的选择：**`--allow` 清单 + 入库的 `report.json.allow[]` 作为唯一豁免载体**

理由，逐条对应任务书提的两种代价：

- **反对 `taste-skill-ignore`**：它已实测对渲染闸门无效（S* 里 46 处，其中 15 处 `box-shadow` 空转）。一个"看起来豁免了、实际没豁免"的机制比没有机制更危险——它给人已经在处理问题的错觉。
- **反对"本仓认可的豁免清单文件"（新造一个）**：会漂移。`data.js` 就是活样本——它是生成物，`S13` 的 `fail` 字段已经和磁盘差 2（见 §B.3）。
- **选 `report.json.allow[]`**：因为**它和被豁免的报告是同一个文件、同一次写入、同一个 commit**。不存在"清单说豁免了但报告没豁免"的时间窗。豁免变更必然出现在 `report.json` 的 diff 里，review 时无法绕过。

**约束（必须写进守卫脚本）**：
1. 每条豁免**必须**附理由，放在**入库的** md 里（如 `deliverables/68-plan/EXEMPTIONS.md`），而不是代码注释里。理由缺失 = 守卫报错。
2. 豁免必须**带作用域**：`allow` 是整份报告的全局豁免。若只想豁免 768 档，现在的机制做不到——这点要在守卫里显式记下来，别假装能做到。
3. **`--allow` 目前不留"被压掉的条目"**：我实测 `report.json` 的键是 `url, at, allow, viewports, findings, images`，**没有 `suppressed` 数组**。所以报告只记"允许了什么"，不记"因此少报了什么"。这是可改进项，列为 P2。

---

### A.6 `emoji` 14 处：该修 lint 吗？——`tools/` 不入库意味着什么

**先纠正事实**：不是 14 处全在 `app.js`。实测分布：

```
$ node tools/.../lint.mjs prototypes/_selection/app.js prototypes/_selection/index.html \
    prototypes/_selection/style.css prototypes/_selection/wizard.html prototypes/_selection/wizard.css --json
=== emoji by file ===
  prototypes/_selection/app.js x8
  prototypes/_selection/index.html x1
  prototypes/_selection/style.css x5
```

加上 `wizard.js` 后是 15×（6 个界面文件口径）。

**而且：`wizard.js:204` 的 ⚠ 不是注释，是真渲染出来的 UI 文本。**

```js
// wizard.js:203-205
var gateNote = fails.length
  ? '<p class="wz-gate">⚠ 机械闸门有 ' + fails.length + ' 项不达标：' + fails.join('、') + ...
```

这是个**真缺陷**：它会被真的画在用户屏幕上。而渲染闸门**没抓到它**（`wizard` 报告里没有 `emoji`），因为 `probe.mjs:430` 只在**加载时**扫 `document.body.innerText`，而这段 HTML 要等用户走完问答才会注入。

> 所以 `emoji` 这条上，**lint 是唯一能抓到的工具**，而它抓的时候把 14 条注释一起抓了。

**lint 的注释豁免为什么漏？** `lint.mjs:80` 只在**行首**匹配：

```js
if ((id === 'copy' || id === 'cta-copy' || id === 'emoji') && /^\s*(\/\/|\/\*|\*|import |@import|<!--)/.test(line)) continue;
```

`/* ... */` 块注释里那些**不以前缀 `*` 开头**的续行，`^\s*` 匹配不到，于是被当成代码。我逐行验证了这个状态机：

```
$ node deliverables/68-plan/probe-comment-state.mjs prototypes/_selection/app.js \
    prototypes/_selection/index.html prototypes/_selection/style.css
  238  lintSkips=false inBlockAtStart=true  effectivelyComment=true
  595  lintSkips=false inBlockAtStart=true  effectivelyComment=true
  599  lintSkips=false inBlockAtStart=true  effectivelyComment=true
  628  lintSkips=false inBlockAtStart=true  effectivelyComment=true
  652  lintSkips=false inBlockAtStart=true  effectivelyComment=true
  720  lintSkips=false inBlockAtStart=true  effectivelyComment=true
 1289  lintSkips=false inBlockAtStart=true  effectivelyComment=true
 1424  lintSkips=false inBlockAtStart=true  effectivelyComment=true
-- lint FLAGS 8, lint SILENTLY SKIPS 9 (both are comments in source) --
```

`inBlockAtStart=true` 且 `effectivelyComment=true`——**这 8 处确实在块注释里**，lint 是因为"行首没有注释标记"才误报。`index.html:236` 同样，我用独立状态机确认它在 `<!--`（开于 229 行）之内。

**`tools/` 不入库意味着什么？**

```
$ git ls-files tools | Measure-Object
tracked files under tools/: 0
$ git check-ignore -v tools/.../lint.mjs
.gitignore:2:tools/    tools/taste-skill/skills/taste-skill/scripts/lint.mjs
```

**改 `lint.mjs` 是本地补丁，不进仓库，任何 clone 都没有。** 所以：

> **不该修 `lint.mjs`。** 修了等于给本机打一个只有我看得见的补丁，下次别人（或其他 Agent）clone 后行为不同——这比误报更糟，因为**不可复现**。

**绕法：在仓库自己的守卫脚本里做"注释剥离后再 lint"，不改 vendor。**

具体做法：守卫脚本（入库）在调用 `lint.mjs` 前，先把 6 个界面文件的注释**物理剥离**到临时目录，再对剥离后的副本跑 lint。

- 代价：`lint.mjs` 的行号会指向剥离后的副本 → 需要保留行号映射（注释行替换成空行而不是删除，行号即可对齐）。
- 收益：vendor 零改动、所有 clone 行为一致、误报消失、`wizard.js:204` 的真缺陷**依然会被抓到**（因为它在字符串字面量里，不是注释）。

我已经验证这个思路可行：`stripNonRendered()` 就是现成的实现，`verify-prototype.mjs:18-25` 已经用它剥 `<!-- -->` / `/* */` / `<script>` / `<style>` / `//` 后才扫 emoji。**复用它，不新写。**

---

## B. 哪些 FAIL 是真缺陷，哪些是设计意图

### B.1 判定标准：什么证据才算数

我建议**四级证据**，只有达到 L3 才能判"设计意图"：

| 级别 | 证据形态 | 能否据此判 earned | 例 |
|---|---|---|---|
| **L0** | 代码里写了 `taste-skill-ignore` / 作者注释说"这是故意的" | ❌ **不能** | S13 的 15 处空转注释 |
| **L1** | 规则原文的**例外条款**字面命中 | ⚠️ 弱，需 L2 佐证 | `hairline` 的 "real tables and form fields" |
| **L2** | **渲染态**量测证明该模式在这里不产生规则担心的后果 | ✅ 需要 | 用 probe 证明"这条线不是卡片描边" |
| **L3** | **原始规格/需求文档**明确要求，且**预判并拒绝了**该规则 | ✅ 最强 | S03 `direction.json` note 引 `11-compiled-30.md:366` |

**为什么 L0 不算数**：S13 作者自己的注释就是反例——15 条 `taste-skill-ignore` 一条都没生效。注释是**主张**，不是**证据**。

**为什么 L3 最强**：`direction.json` 里那段 note 是我见过最规范的豁免声明，它做了三件事：①引用**具体文件+行号**的规格原文 ②说明规则**为什么**在这里不适用 ③记录**豁免前后的实测值**（`mono_prose_chars: 6` / `raw_share_percent: 0.248`）。**这个格式应当成为本仓豁免的标准模板**——尽管它因为路径 bug 从未生效（见 A.5），**格式本身是对的**。

### B.2 优先级排序原则

按"用户能否感知"排，不按"规则等级"排：

1. **用户已经看到的错误信息**（最高）——例如选型台写着 `闸门 FAIL=0` 而实际是 2。
2. **用户即将遇到的坏体验**——例如 `body-size 13px`（见 B.4，需裁定）。
3. **产品教用户做错事**——例如模板里的 `eyebrow` 占位符。
4. **守卫本身的缺失**——不直接影响用户，但决定 1–3 会不会复发。
5. **卫生债**——不影响判断，只增加噪声。

**关键：`FAIL`/`WARN` 的等级不是优先级。** `body-size` 是 FAIL 但可能该豁免；`palette-cream` 是 WARN 但可能是真缺陷。

### B.3 已实测确认的**真缺陷**（可以直接开单）

**B.3.1 `data.js` 与磁盘报告不一致（S13）**

```
$ node deliverables/68-plan/probe-reconcile.mjs
dir                                     disk:FAIL/WARN   data.js:FAIL/WARN   match
S13-blind-debossed-dispatch              2/5              4/5                  <-- MISMATCH
...
DISK   : clean(FAIL==0) = 26/30   total FAIL = 6
data.js: clean(FAIL==0) = 26/30   total FAIL = 8
mismatches: 1 -> S13-blind-debossed-dispatch
```

S13 的 `report.json`（`at=2026-10-27T11:37:30Z`）只有 2 个 FAIL（`mono` + `empty-screens`），`data.js` 说 4。`data.js` 是 `collect-schemes.mjs` 生成的（mtime `2026-10-26T22:58:11Z`），比该报告**早 12.7 小时**——即 `data.js` 是陈旧的。

**为什么 `check-stale.mjs` 没抓到**：它只比较 `S*/index.html|style.css` 的 mtime 与 `report.at`，**不比较 `data.js` 与 `report.json` 的一致性**。选型台读的是 `data.js`，所以这是**用户可见的陈旧**（`collect-schemes.mjs:10` 明写它写 `data.js`）。

**B.3.2 选型台报头显示陈旧结论（用户可见）**

见 §0 截图实证：`闸门 FAIL=0  26`。这个 26 是 `data.js` 的 `fail===0` 计数，而 `_selection` 自己那份报告陈旧 5.9 天。**产品把自己没有资格声称的"0"展示给用户。**

**B.3.3 `wizard.js:204` 的 ⚠ 会画到屏幕上**

见 A.6。这是 `emoji` 规则的正例，且现有渲染闸门抓不到（需交互才注入）。

### B.4 需要裁定、我给出判据的**边界项**

**B.4.1 `body-size 13px` —— 我倾向"真缺陷"，但不是靠规则判的**

规则说body 应 16–20px。我做了归因，看 13px 到底是"正文"还是"元数据"：

```
$ node deliverables/68-plan/probe-body-size.mjs
########## width 1440 ##########
ranked by char count (this is what sets body.size):
   13px    8005 chars
           · 目前没有对应风格的行业（共 29 个）：电商、网店、服装、乐队… [{p.rail-hint.scene-unsupported}]
           · ，而别的带只剩零头（冷暗带 5、暖暗带 3…）。如果你觉得可选项看起 [{p.rail-hint}]
           · 苏联构成主义印刷。参考对象：El Lissitzky 1919 年… [{span.row-family}]
           · 桌面 6 屏　·　真实图 6　·　横向溢出 0　·　WARN：palette-cream font-count [{span}]
   15px      97 chars
```

**13px 里 8005 字符压倒性来自"行内补充说明"**：`rail-hint`（筛选提示）、`scene-unsupported`（不支持行业提示）、`row-family`（方案卡里的字体说明）、以及每卡一行的闸门摘要。

这是我的判定分歧点：`probe.mjs:225` 把 `chars >= 60` 的文本块都算进 body 池：

```js
const bodyTexts = texts.filter((t) => t.size >= 10 && t.size <= 24 && t.chars >= 60 && !t.inCode && !t.inUI);
```

`rail-hint` 是**连续散文且每段 >60 字**，所以它把"侧栏提示"当成了"正文"。而它**确实是用户要读的句子**——不是标签、不是数字。

> **判定：倾向真缺陷，但理由不是"规则说 16px"，而是"用户需要连续阅读 8005 个字符，字号 13px"。** WCAG 对正文没有硬性最小字号，但 `rail-hint` 是**引导用户做筛选决策**的文案，13px 中文在 1440 档偏小。
>
> **若裁定为 earned，必须用 L2/L3 证据**，例如："这是辅助说明，主路径不依赖它" + 实测点击热区/阅读距离。**不能用"这是工具界面"一句话带过**——工具界面的说明文字恰恰更该可读。

**B.4.2 `hairline` 2 处 —— 见 A.3，我判装饰、建议删线保间距。**

**B.4.3 `focal-point` / `few-pictures` —— 已实测不误报，不要豁免（见 A.2 末）。**

### B.5 一句话给裁定者的操作口径

> **凡是能用一条命令在渲染态复现"规则担心的后果"的，就不是缺陷；凡是只能靠作者注释辩护的，就是缺陷。**

---

## C. 12 条「必须渲染才能测」的规则怎么补

### C.1 先纠正一个数字

任务书说 12 条。我从源码解析出的**渲染专属规则是 41 条**（`rules.mjs` 有、`lint.mjs` 没有），加上 `inspect.mjs` 独有的 6 条，共 47 条规则分支只能靠渲染测。见 §F。

其中**真正的 FAIL 级、且对产品有意义的**，我列出 15 条，这是必须补的核心：

`contrast` `broken-image` `overflow` `ui-wrapper` `font-count` `font-fallback` `body-size` `small-text` `palette-terracotta` `palette-purple` `palette-claude` `headline-lines` `few-pictures` `focal-point` `still-page` `empty-screens`

### C.2 起什么服务器

**不能用 `file://`。** 实测原因有两条，都验证过：

1. **`fetch()` / ES module 受 CORS 限制** —— 但更硬的是第 2 条。
2. **`_selection` 依赖 `../_fonts/`**：

```html
<!-- index.html:8-10 -->
<link rel="stylesheet" href="../_fonts/css/archivo-vf__wdth-wght.css">
<link rel="stylesheet" href="../_fonts/css/noto-sans-sc__100..900.css">
<link rel="stylesheet" href="../_fonts/css/ibm-plex-mono__400-500.css">
```

`inspect.mjs` 的**内建静态服务器**已经解决了这个问题：它把 **`cwd`** 当站点根（`inspect.mjs:38` `const root = file.startsWith(cwd + sep) ? cwd : dirname(file)`）。所以：

> **守卫必须在仓库根跑 `inspect.mjs`，不能 `cd` 到产品目录。**

我把这个约束实测成了一个"错误示范"，证明它不是理论风险：

```
run A: cwd=repo root        -> realPictures@1440 = 30   notLoaded = []
run B: cwd=prototypes/_selection -> realPictures@1440 = 0   broken-image FAIL present = True
```

**在错误 cwd 下，闸门会凭空造出 `broken-image` 与 `few-pictures` 两个 FAIL，而 `notLoaded` 依然是空的**（因为字体 CSS 拿到 404 后 `document.fonts` 里根本没有那些 face，于是"未加载"检测也失灵）。

**这是最危险的一类错误：闸门不会报错，它会给你一组看起来合理的假数字。** `render-scheme.mjs:7-10` 的注释已经踩过并记下了这一点。

所以守卫脚本必须：
- `cwd` 固定为仓库根（用 `new URL('../..', import.meta.url)` 推导，抄 `render-scheme.mjs:18`）
- 加一条**前置断言**：确认 `prototypes/_fonts/css/archivo-vf__wdth-wght.css` 可达；不可达就 `exit 4` 而不是继续跑
- **可选（更稳）**：加一条**自检**——先渲染一个已知基准页（例如 `S01`），若其 `realPictures` 与记录值不符，说明 root 配错，直接失败

### C.3 测哪几个视口

**1440 / 768 / 390**，与仓库惯例一致（`inspect.mjs:19` 默认值、`render-scheme.mjs:44` 显式、`verify-prototype.mjs:134` 断言三档 fold 图都在）。

补充两条**只对产品适用**的约束：

- **`_selection` 必须测 `390`**：它的 `.inspect` 里已有 `mobile-fold.jpg`，且 `style.css` 有大量 390 档覆盖（`1097`、`1109`、`1121` 都是窄档块）。**只测 1440 会漏掉 `hairline`**——实测 `hairline` 在 1440 **不报**，只在 768/390 报（`alsoAt=390`）。
- **`templates` 必须单独测**，因为它们的 `index.html` 是**独立文档**，不共享 `_selection` 的 CSS。

### C.4 哪些规则对「工具型界面」不适用

任务书问 `focal-point` 对列表页、`few-pictures` 对选型台。我实测的答案是：**这两条都不需要豁免，因为它们本来就不响。**

但要区分**"不响"**与**"不该响"**：

```
$ node deliverables/68-plan/probe-applicability.mjs
rule          index.html    wizard.html   M01           M02           M03
focal-point   -             -             FAIL          -             -
few-pictures  -             FAIL          FAIL          FAIL          FAIL
still-page    -             FAIL          FAIL          FAIL          FAIL
empty-screens -             -             -             -             -
body-size     FAIL          WARN          -             -             -
hairline      FAIL          -             FAIL          FAIL          FAIL
eyebrow       -             -             FAIL          FAIL          FAIL
contrast      -             -             -             -             -
```

| 规则 | `_selection` 实测 | `wizard` 实测 | 模板实测 | 我的建议 |
|---|---|---|---|---|
| `focal-point` | ✅ 通过（hero 74px / 5.1vw） | ✅ 通过（74px） | **仅 M01 报**（44px / 3.1vw，无图）；M02 通过（44px 但**首图占视口 49%**）、M03 通过（136px / 9.4vw） | **不豁免**。M01 是真缺陷：44px 且没有任何图救它 |
| `few-pictures` | ✅ 通过（30 张缩略图） | ❌ 报（0 张） | ❌ 全报（0 张） | **对 wizard 需豁免**（纯表单页没有图是合理的）；对模板**不豁免**（模板应当带示例图） |
| `still-page` | ✅ **通过**（`motionElements=30`） | ❌ 报（0） | ❌ 全报（0） | **对 wizard 与模板需豁免/或补动效**，见下 |
| `empty-screens` | ✅ 通过 | ✅ 通过 | ✅ 全通过 | 不豁免 |

> **注意我此处修正了自己**：初稿我写"`still-page` 在 `_selection` 报"以及"`focal-point` 在 M01/M02 报"，实测**都不对**——`_selection` 有 30 个动效元素（通过），`focal-point` 只打 M01（M02 的 44px hero 之所以通过，是因为它另有主导元素）。这正说明**不能靠推理预判哪条会响，必须跑**。

**`few-pictures` 对 wizard：我建议豁免，理由是 L2 级证据。** `wizard.html` 是一个 5 步问答表单，**它的整个设计目的就是"不要视觉噪声，让用户回答问题"**。给它塞 4 张图片会直接违背它的用途。这与 `_selection`（列表页，30 张缩略图是内容本身）不同。

**`still-page` 的实测分布很关键**：`_selection` 有 **30 个动效元素**（通过，阈值 8），而 `wizard` 与 3 个模板都是 **0**。所以这不是"工具界面都该豁免动效"——**选型台自己就做对了**。

> **我的建议**：
> - `_selection`：**不豁免**（它已通过，证明工具界面能做到）。
> - `wizard`：**豁免 `still-page`，但要求补 L2 证据**——即证明所有交互控件有可见的状态反馈（`:focus-visible`、`aria-pressed` 变化）。`wizard.js` 有 `aria-pressed`（`wizard.js:204` 附近可见状态机），可作为证据来源。
> - 模板：**不豁免**。模板是"可以抄的成品"，0 动效与 `still-page` 所反对的"死页面"一致；M03 的 `hero 136px` 说明它有意识地做了大字，动效缺失更像是没做而不是不做。

**`empty-screens` 对工具界面高度相关**：一个"几乎空白"的屏幕在列表页意味着"筛出 0 结果"——这是真问题，不该豁免。实测 5 个界面全部通过，说明当前实现没有这个问题。

### C.5 守卫在哪跑、产物在哪

建议新增**入库**的守卫脚本 `prototypes/_build/verify-product.mjs`（不是改 `tools/`）：

```
node prototypes/_build/verify-product.mjs            # 全部：_selection + wizard + 3 模板
node prototypes/_build/verify-product.mjs --only sel  # 只跑选型台
```

它做四件事：
1. `cwd` = 仓库根；断言 `_fonts` 可达（C.2）
2. 对 6 个界面文件**剥注释后**跑 lint（A.6 的绕法），对 `templates/` 直接跑 lint
3. 对 4 个 HTML 入口跑 `inspect.mjs`，`--widths 1440,768,390`，产物落各自的 `.inspect/`
4. 比较 `data.js` 与磁盘报告的一致性（B.3.1），不一致就 FAIL

**`templates/*/.inspect/` 目前不存在**，实测确认：

```
$ Get-ChildItem templates -Recurse -Filter .inspect
(无输出)
$ git ls-files | Where-Object { $_ -match '^templates/' }
（12 个文件：3×(index.html, style.css, README.md, TOKENS.md) —— 没有任何 .inspect）
```

即**模板从未被任何闸门跑过**，一次都没有。这是任务书"事实 1"里最硬的一条，我独立复现了。

---

## D. 优先级与工作量

> 行数为我的估算；"验收命令"全部可直接复制运行，期望输出是我**实测过的真实值**。

### P0 — 用户能感知的缺陷

**P0-1 让选型台的"闸门 FAIL=0"变成真的**

- **现状**：报头显示 `闸门 FAIL=0  26`。这个 26 是 `data.js` 的 `fail===0` 计数（`app.js:54`），**不包含 `_selection` 自身**。而我实测 `_selection` 自身是 **2 FAIL**（`body-size` + `hairline`）——**产品把自己排除在自己的统计之外**。注：报告在 23:31 已被他人刷新为新鲜（`at=2026-10-28T15:30:43Z`），但**报头那个 `26` 仍然不含它有病的自己**，所以本条依然立得住。
- **改哪里**：
  - `prototypes/_build/collect-schemes.mjs`（503 行）——生成 `data.js` 时**同时**写入 `_selection` 自身的闸门结论，而不是只写 30 个方案的
  - `prototypes/_selection/app.js:51-56`（`stats` 块，约 6 行）——报头增加"本页自身闸门"字段
  - 重跑 `collect-schemes.mjs` 刷新 `data.js`
- **预计**：`collect-schemes.mjs` +15 行；`app.js` +8 行；`index.html:89-92`（报头 `<dl>`）+4 行
- **验收**：
  ```
  node prototypes/_build/collect-schemes.mjs
  node prototypes/_build/verify-prototype.mjs --all | Select-String "达标"
  ```
  期望：`达标 26 / 不达标 4 / 共 30`（实测值，**不变**）；且 `data.js` 中 `_selection` 自身记录 = 重渲染结果
  ```
  node deliverables/68-plan/probe-reconcile.mjs
  ```
  期望：`mismatches: 0 -> (none)`（现在是 `1 -> S13-blind-debossed-dispatch`）

**P0-2 修 S13 的 data.js 漂移**

- **现状**：`data.js` 说 S13 有 4 FAIL，磁盘报告是 2。
- **改哪里**：无需改代码——重跑 `collect-schemes.mjs`。**根因是它没被定时重跑。**
- **预计**：0 行代码（含在 P0-1 里）
- **验收**：
  ```
  node deliverables/68-plan/probe-reconcile.mjs
  ```
  期望：`S13-blind-debossed-dispatch  2/5  2/5`（match 列空）

**P0-3 删掉 `wizard.js:204` 的 ⚠**

- **现状**：用户答完问题、命中 4 个 FAIL 方案时，屏幕出现 `⚠ 机械闸门有 N 项不达标`。
- **改哪里**：`prototypes/_selection/wizard.js:204`（1 行，把 `⚠ ` 换成文字如 `注意：` 或删掉）
- **预计**：1 行
- **验收**：
  ```
  node tools/taste-skill/skills/taste-skill/scripts/lint.mjs prototypes/_selection/wizard.js
  ```
  期望：该文件 `emoji` 计数为 **0**（现在是 1，实测）

### P1 — 守门员缺失（不直接影响用户，但决定 P0 会不会复发）

**P1-1 让 `check-stale.mjs` 看见产品**

- **现状（原始测量时）**：`check-stale.mjs:23` 只扫 `/^S\d{2}-/`，输出 `✓ 全部新鲜`，而 `_selection` 当时陈旧 8562 分钟。
- **改哪里**：`prototypes/_build/check-stale.mjs:23`（1 行）+ 一个产品清单常量
- **预计**：**+12 行**（把 `_selection`、`wizard.html`、`templates/M01..M03` 纳入同一套 mtime-vs-`report.at` 比较）
- **验收**：
  ```
  node prototypes/_build/check-stale.mjs
  ```
  期望（修复前，应**先报错**）：`⚠ N 案陈旧` 中至少含 `_selection`，退出码 **1**
  修完并重渲染后：`✓ 全部新鲜`，退出码 **0**

> ### ✅ 本条已由另一个 Agent 在 23:30 完成（我 23:34 重测确认）
>
> `check-stale.mjs` 现在是 `+64/−4` 行，新增了 `EXTRA` 数组（`check-stale.mjs:36-47`），把 `_selection` 的 **9 个源文件**全部列入：
>
> ```js
> const EXTRA = [{
>   dir: '_selection', label: '选型台',
>   render: 'node prototypes/_build/render-scheme.mjs _selection',
>   sources: ['index.html','style.css','app.js','prompt-copy.js','data.js','prompts.js',
>             'wizard.html','wizard.css','wizard.js'],
> }];
> ```
>
> 实测输出已变为：
> ```
> $ node prototypes/_build/check-stale.mjs
> 闸门陈旧度：检查 30 案 + 1 个产品入口
>   ✓ 全部新鲜
> ```
>
> **但它只做了一半，留下两个缺口（这才是我这份计划现在要指出的）：**
>
> 1. **`templates/` 仍完全未覆盖。** 实测：新 `check-stale.mjs` 全文 `templates` 出现 **0 次**，`M0[123]` 出现 **0 次**。三个模板至今**没有任何 `.inspect/`，也没有任何脚本会提醒它们需要**。
> 2. **`_selection` 的 `sources` 里含 `data.js`，而 `data.js` 是 `collect-schemes.mjs` 的**产物**（不是源）。把它列为"源"意味着：只要 `data.js` 被重新生成（哪怕内容没变），`_selection` 就会被判陈旧、要求重渲染。这是**误报方向**的偏差，会让守卫被噪声淹没。正确的断言应是"`data.js` 的内容一致性"（P0-2），不是"`data.js` 的 mtime"。

**P1-2 新增 `verify-product.mjs`（C.5 的守卫）**

- **改哪里**：新文件 `prototypes/_build/verify-product.mjs`（入库，非 `tools/`）
- **预计**：**+180 行**（含剥注释 40 行复用 `stripNonRendered`、4 个入口 × 3 档渲染编排 60 行、`data.js` 一致性检查 30 行、豁免理由校验 30 行、CLI 20 行）
- **验收**：
  ```
  node prototypes/_build/verify-product.mjs
  ```
  期望（诚实版，即现状应当报红 —— **以下每行的 FAIL 数都是我实测的**）：
  ```
  ✗ _selection/index.html          FAIL=2  [body-size hairline]
  ✗ _selection/wizard.html         FAIL=2  [few-pictures still-page]   ← 建议豁免后应为 0
  ✗ templates/M01-clean-corporate  FAIL=11 [headline-lines eyebrow numbering shadow hairline
                                            outlined-box icon-cards few-pictures focal-point still-page]
  ✗ templates/M02-warm-local       FAIL=4  [eyebrow hairline few-pictures still-page]
  ✗ templates/M03-bold-creator     FAIL=7  [eyebrow mono numbering hairline outlined-box
                                            few-pictures still-page]
  ✗ data.js vs 磁盘报告            S13 不一致（data.js 4 vs 磁盘 2）
  ```
  合计 **26 个 FAIL 分布在这 5 个入口上**（2+2+11+4+7）。对照：30 个原型当前合计只有 6 个 FAIL（`verify-prototype --all` 实测 `达标 26 / 不达标 4`）。

  **密度对比**（这是本节最值得看的一个数）：

  | 口径 | 产品（5 入口） | 30 个原型 | 倍数 |
  |---|---|---|---|
  | FAIL 总数 | 26 | 6 | **4.3×** |
  | 每入口平均 FAIL | 5.2 | 0.2 | **26×** |

  即：**产品每个入口平均背 5.2 个 FAIL，而它要求每个原型背 0.2 个。** 产品是图集里最脏的一块。

  > 注意口径：原型的 6 个 FAIL 是 `verify-prototype` 对**渲染报告**的统计；产品的 26 个是我用同一个 `inspect.mjs` 跑出来的同口径数字。三个模板从未被告知过这 26 个中的任何一个，因为**没有任何脚本跑过它们**（`.inspect/` 不存在，实测）。

  **一条值得单列的发现：两条规则对"内联 SVG"的态度不一致。**

  ```
  M01 : heroMedia=svg@11%   realPictures=0   （14 个 <svg>，全是占位图）
  M02 : heroMedia=svg@49%   realPictures=0
  ```

  `focal-point` 把内联 SVG 当"主导媒体"（`heroMedia` 里 `type=svg`），所以 **M02 靠一张 49% 的 SVG 占位图通过了 `focal-point`**；而 `few-pictures` 明确说"Drawings in SVG do not count"，把同一批 SVG 判为 0 张图。

  > **后果**：M02 一边 `focal-point` 通过、一边 `few-pictures` FAIL。两条规则对同一批素材给出相反判断。这不是产品的问题，是**规则集内部的不一致**，应在豁免决策时记录，避免有人拿"focal-point 过了"来论证"首屏没问题"。

**P1-3 复用 `stripNonRendered` 消掉 14 处 emoji 误报**

- **改哪里**：`verify-product.mjs` 内部（不碰 `tools/`）
- **预计**：含在 P1-2 的 40 行里
- **验收**：
  ```
  node prototypes/_build/verify-product.mjs --lint-only
  ```
  期望：`_selection` 界面文件 `emoji` = **0**（现在 15，其中 14 是注释、1 是真缺陷——P0-3 修完后应全消）

### P2 — 卫生债

**P2-1 把 986 个未跟踪文件收进 `.gitignore`**

- **现状**：`deliverables/6*-*` 全未跟踪；`.gitignore` 有 `deliverables/*-scratch/`，**没有** `*-plan`/`*-audit`
- **改哪里**：`.gitignore`（+3 行：`deliverables/*-plan/`、`deliverables/*-audit/`、`deliverables/*-exec/`）
- **注意**：这会连带忽略我这份 `PLAN-guards.md`。**我建议不忽略 `68-plan`**，或者显式 `!deliverables/68-plan/PLAN-guards.md` 白名单——否则计划本身丢失。
- **预计**：3 行 + 1 行白名单
- **验收**：`git status --porcelain | Measure-Object` 期望从 **989** 降到 <50

**P2-2 `report.json` 记录"被压掉的条目"**

- **现状**：`--allow` 让条目**消失**，报告键只有 `url,at,allow,viewports,findings,images`，无 `suppressed`
- **改哪里**：`tools/` 里的 `inspect.mjs`（**不能改，不入库**）→ 只能由 `verify-product.mjs` 在**外层**重跑一次不豁免的渲染并 diff，把差异写进自己的产物
- **预计**：+35 行（外层双跑 + diff）
- **验收**：`verify-product.mjs` 输出里出现 `suppressed: [id...]` 列表

**P2-3 修 `direction.json` 路径 bug（上游报 issue）**

- **现状**：`inspect.mjs:28` 探的两个路径都不等于 `draw.mjs:37` 写的路径；S03 的声明从未生效过
- **改哪里**：`tools/`（**不能改**）→ 报给 taste-skill 上游；本仓改用 `--allow`
- **预计**：0 行（本仓）；记录在案
- **验收**：无法在本仓验收，标注为"已知上游缺陷"

---

## E. 如果只能做一件事

> ### **让 `check-stale.mjs` 覆盖产品，并把"陈旧"当成 FAIL 处理。**
>
> 即 **P1-1**，约 **12 行代码**。

**为什么它比其它所有事都重要——用数据说：**

1. **它一次性覆盖 5 个入口。** `check-stale` 修好后，`_selection`、`wizard.html`、`M01`、`M02`、`M03` 全部进入"源文件变了就要重渲染"的约束。而 P1-2 那个 180 行的守卫，**在陈旧数据上跑出来仍是假的**——守卫跑得再勤，只要它读的是 5.9 天前的报告，结论就还是错的。

2. **产品的核心谎言正是"陈旧"。** 我实测的三条最严重问题——`闸门 FAIL=0` 是假的（差 5.95 天）、`S13` 的 fail 数差 2（`data.js` 比报告早 12.7 小时）、`_selection` 重渲染多出 2 个 FAIL——**根因全部是同一个：没人发现报告过期了。** 而 `check-stale.mjs` 明明就是为这件事写的，它的文件头注释写着：

   ```
   // 为什么需要它：这是 **AH-11 与 AH-14、N1 三次缺陷的共同根因** ——
   // 改了原型之后忘了重渲染，于是选型台展示的是**旧修订的闸门结果与截图**。
   ```

   **作者已经诊断出这个病、写了药、然后药只喂给了 30 个原型，没喂给产品。**

3. **它是所有选项里性价比最高的。** 12 行 vs 180 行（P1-2）vs 全域治理（P2）；而它挡住的正是**最容易复发**的一类错误——因为产品还在活跃开发：报告过期后的 5.9 天里，`_selection/` 已被 **25 个 commit** 改动。

4. **它是唯一能立刻产生"红"的改动。** 实测现状：

   ```
   $ node prototypes/_build/check-stale.mjs
   闸门陈旧度：检查 30 案
     ✓ 全部新鲜
   ```

   修完后它**当场就会报 `_selection` 陈旧 8562 分钟、退出码 1**。也就是说：**改完立刻就能证明改动有效**，不需要等下一次缺陷发生。（事实证明正是如此——23:30 那位 Agent 改完之后，输出立刻从 `检查 30 案` 变成 `检查 30 案 + 1 个产品入口`。）

**一句话**：其它所有工作都是在"把闸门造得更准"，而这一件是"让闸门说的话还有人信"。数据上，产品当前**唯一确定说错的话**就是陈旧造成的（`闸门 FAIL=0`），而它恰好是用户第一眼看到的那行字。

---

### E.1 变化：这一件事已经在 23:30 被别人做了

我写完上面这段之后（23:34 复核），发现 `check-stale.mjs` 已被另一个 Agent 改成 `+64/−4` 行，并重新渲染了 `_selection`。**P1-1 的核心目标已达成**（`_selection` 进入陈旧检查、报告已刷新）。

**而且它在我收尾时（23:41）就已经抓到第一次真实漂移，这是本报告最有力的一条现场证据：**

```
$ node prototypes/_build/check-stale.mjs
闸门陈旧度：检查 30 案 + 1 个产品入口
  ⚠️ 1 项陈旧（源文件比 report.json 新，说明改了没重渲染）：
     选型台(_selection)  style.css 落后 11 分钟  →  node prototypes/_build/render-scheme.mjs _selection
```

我核对了这条报警的原始数据，它是真的：

```
report.at        = 2026-10-28T15:30:43Z   （23:30:43 本地）
style.css mtime  = 2026-10-28T15:41:20Z   （23:41:20 本地）
gap              = 10.6 分钟（脚本四舍五入报 11）
```

**这就是守卫从"存在"变成"会响"的那一步。** 注意它抓到的是一个 **10.6 分钟**的漂移——我 23:34 复核时它还是"全部新鲜"，短短 7 分钟内 `style.css` 又被改了。这说明：

> **陈旧不是偶发事故，而是这个仓库的**常态**。** 产品的源码改动频率（5.95 天内 25 个 commit ≈ 每 5.7 小时一次）远高于任何人手动重渲染的频率。**没有自动守卫，报告必然长期落后。**

**（23:42 补记：此刻 `style.css` 已被另一个 Agent 改动并处于 `M` 状态，产品正在被实时修改。本报告的所有数字都是 23:0x 的快照——这也正说明为什么 §E 的结论是"守卫"而不是"再查一遍"。）**

**因此"只做一件事"的答案必须顺延到下一条。我推荐：**

> ### **补上 `templates/`——让三个模板第一次被闸门看见。**
>
> 即 **P1-2 的一个子集**，约 **40 行**（不是 30 行，见下"我踩到的坑"）。

**为什么它现在是第一优先——数据：**

1. **它是唯一"从未被检查过"的部分。** `_selection` 现在有了新鲜报告；`templates/` 三个模板**至今没有任何 `.inspect/`**（实测 `Get-ChildItem templates -Recurse -Filter .inspect` 无输出），新 `check-stale.mjs` 里 `templates` 出现 **0 次**。
2. **它的 FAIL 密度高于 `_selection`。** 我实测：M01 **11** FAIL、M02 **4**、M03 **7**，合计 **22**；而 `_selection` 是 **2**。
3. **它是用户真正会拷走的东西。** 30 个原型是"看的"，3 个模板是"用的"——用户会 `M01` 改吧改吧上线。**把 22 个 FAIL 交给用户，比选型台上一个不准确的数字严重得多。**

#### ⚠️ 我踩到的坑（这一条必须照做，否则改了等于没改）

我最初的建议是"在 `EXTRA` 数组里加 3 项即可，约 30 行"。**这是错的**，我实测推翻了自己：

```js
// check-stale.mjs:78-81
for (const e of EXTRA) {
  const rep = join(P, e.dir, '.inspect', 'report.json');
  // 没有报告就不归这里管：那是「从未渲染过」，不是「陈旧」，该由别的检查报。
  if (!existsSync(rep)) continue;      // ← 这一行
```

三个模板都没有 `.inspect/report.json`（实测 `exists = False ×3`），所以**只把它们加进 `EXTRA`，会被第 81 行静默 `continue` 掉，零输出、零报错**。

而且那条注释的立场是正确的：**"从未渲染过"确实不是"陈旧"**，混在一起会让两种完全不同的病共用一个药。

#### 正确做法：两件事分开做，各约 20 行

**① 先让模板有报告**（否则没东西可查陈旧）：

```powershell
node prototypes/_build/render-scheme.mjs M01-clean-corporate --out templates/M01-clean-corporate/.inspect
# 注意：render-scheme.mjs 目前把路径写死成 prototypes/<name>/（见 render-scheme.mjs:22,42）
# 所以需要先给它加一个 --root 参数，或复制一份 render-template.mjs
```

**② 再加一条"缺报告"检查**（这是"从未渲染过"该有的守卫，不是"陈旧"）：

```js
// check-stale.mjs 里新增，与 findStale 并列
const REQUIRED = ['_selection', '../templates/M01-clean-corporate',
                  '../templates/M02-warm-local', '../templates/M03-bold-creator'];
const neverRendered = REQUIRED.filter((d) => !existsSync(join(P, d, '.inspect', 'report.json')));
if (neverRendered.length) {
  console.log(`  ✗ ${neverRendered.length} 个入口从未渲染过（没有 .inspect/report.json）：`);
  for (const d of neverRendered) console.log(`     ${d}`);
  process.exit(1);
}
```

**验收**：
```
node prototypes/_build/check-stale.mjs
```
- **修①之前**：应输出 `✗ 3 个入口从未渲染过`（含 3 个模板），退出码 **1**
- **修①之后**：输出 `检查 30 案 + 4 个产品入口` 且 `✓ 全部新鲜`

> **一句话**：P1-1 修好的是"已存在的守卫没看全"；现在剩下的最大窟窿是"模板根本没有守卫，而且没有守卫这件事**本身也没有守卫**"。前者已被做掉，后者还没有。
>
> **这个坑值得单独强调**：它是本轮我犯的唯一一个我自己的技术错误，而它之所以能被发现，只是因为我**去读了要改的那段代码**，而不是照着"加 3 行"的直觉写进计划。这也印证了 §E 开头的判断——**守卫的价值不在于它存在，而在于它真的会响**。`if (!existsSync(rep)) continue` 就是一行"不会响的守卫"。

---

## F. 我核实后认为任务书说错了的地方

> 全部以我实测为准；每条附复跑命令。

**F.1 「产品自身完全不在任何闸门范围内」——不准确。**

`prototypes/_selection/.inspect/report.json` 是**入库文件**：

```
$ git ls-files prototypes/_selection/.inspect/report.json
prototypes/_selection/.inspect/report.json
```

它在 5 个 commit 里被更新过（最早 `caefdd9`，最近 `1f30e7d 2026-10-22`）。所以准确表述是：**产品被渲染闸门检查过，但最后一次是 5.95 天前，且当时的机制不保证它会再被检查。**

（23:34 补：该机制已被另一 Agent 补上并重渲染，见 §E.1。）

`templates/` 才真正是"从未被检查过"——实测三个模板都没有 `.inspect/` 目录：

```
$ Get-ChildItem templates -Recurse -Directory -Filter ".inspect"
(无输出)
```

**F.2 「`emoji` 14×（全在 app.js，全是注释行里的 ⚠️）」——两处错。**

- **不是全在 `app.js`**：实测 `app.js x8`、`index.html x1`、`style.css x5`（Lead 的 5 文件口径共 14）；加上 `wizard.js` 是 15。
- **不是全是注释**：`wizard.js:204` 的 ⚠ 在**字符串字面量**里，会被 `innerHTML` 画到屏幕上，是**真缺陷**。

复跑：`node tools/.../lint.mjs <5 files> --json` → 看 `emoji` 项的 `file`/`line`。

**F.3 「`templates` 的 17+12+27+3 = 59」——实际 60 FAIL。**

任务书列的 `eyebrow 17 / numbering 12 / hairline 27 / shadow 3` 漏了一项：**`emoji` 1×**（`templates/M03-bold-creator/style.css:6`，是 `★`，在 `/* */` 块注释里 → 又是注释误报）。

```
$ node tools/.../lint.mjs templates
RESULT: 60 FAIL, 12 WARN
```

**F.4 「25 条 FAIL 里有一批」与「51 条：25 FAIL + 26 WARN」——数字对，但产品实际面对的是 58 条。**

`rules.mjs` 的 `judge()` 确实是 51 个 `(level,id)` 分支、25 FAIL + 26 WARN，这点任务书**完全正确**（我解析源码确认）。但 `inspect.mjs` 额外 push 了 7 个分支（含 `still-page` 的 FAIL/WARN 两档、`empty-screens`、`covered-text`、`clipped-text`、`pinned-over-picture`、`long-pin`）：

```
$ node deliverables/68-plan/probe-rules-inventory.mjs
TOTAL distinct (level,id) pairs across both: 58
  of which FAIL: 29, WARN: 29
```

所以**产品实际会被 58 条判据中的一部分审到**，不是 51。

**F.5 「12 条必须渲染才能测」——实际 41 条（含 inspect 专属共 47 条）。**

```
RENDER-ONLY (in judge/RULE_IDS but no static lint rule): 41
```

任务书列的 12 条只是**其中一部分**。漏掉的包括 `headline-lines`（产品模板 M01 正是被它判 FAIL 的）、`still-page`、`empty-screens`、`font-fallback` 等。

**F.6 「`lint.mjs` 共 23 条静态规则（FAIL:mono … + WARN:…）」——正确，但「23」是规则条目数，不是 id 数。**

`FAIL` 有 12 条、`WARN` 11 条，共 23 条目，但**不同 id 只有 22 个**（`numbering` 在 FAIL 和 WARN 各一条）。任务书括号里列的清单本身是对的。

**F.7 「裸跑 `lint.mjs` 扫了 1343 个文件」——正确，我复现了。**

```
files scanned = 1343
total findings = 4525   (FAIL 3889, WARN 636)
```

但「`[shadow] (1200×)` 里 1194 个来自那个扩展」——**不准确**。我实测 `shadow` 共 1200×，其中来自 `chrome-prof*` 的只有 **56**。真正的头部来源是 `prompts.js` 的 10 份副本（每份 30×）：

```
$ node tools/.../lint.mjs --json | (按 file 分组 shadow)
    30  deliverables/65-exec/_cut/prompts.before.js
    30  deliverables/65-verify/tmp/sel-head/prompts.js
    30  deliverables/65-audit/lab/snapshot/prompts.js
    ...
    30  prototypes/_selection/prompts.js          <-- 这个就是产品自己的载荷
shadow from chrome-prof* = 56
```

**这个差别很重要**：噪声的主源不是外来的 Chrome 扩展，而是**前几轮 Agent 拷来拷去的 `prompts.js` 快照**——也就是本仓自己的产物。这更说明 P2-1（.gitignore）是必要的。

**F.8 「全仓 18 个 build/check 脚本」——`prototypes/_build/` 下实测 21 个。**

```
files: 21 -> _s03-probe.mjs, assign-assets.mjs, backfill-credits.mjs, check-anchors.mjs,
check-docs.mjs, check-stale.mjs, checked-spawn.mjs, collect-schemes.mjs, extract-specs.mjs,
fetch-css-fonts.mjs, fetch-fonts.mjs, fetch-scheme-assets.mjs, make-textures.py,
remake-s02-leak.py, render-scheme.mjs, selfhost-fonts.mjs, shot-page.py, shot.mjs,
summarize-all.mjs, verify-prototype.mjs, write-credits.mjs
```

（若只算 `.mjs` 是 19 个。差异取决于是否计入 2 个 `.py`。）

**F.9 「只有 `check-docs.mjs` 和 `collect-schemes.mjs` 提到它们」——正确。**

我复现了：在 `prototypes/_build` + `tools` 的 24 个 `.mjs` 里，只有这两个命中 `_selection`/`templates`。补充一条任务书没提的：**`check-stale.mjs` 也提到「选型台」**，但它扫的是 `S*` 目录，所以"提到"和"检查到"是两件事。

**F.10 任务书没提、但我认为最重要的一条遗漏：`check-stale.mjs` 也有同样的 `/^S\d{2}-/` 盲区。**

任务书把 `verify-prototype.mjs` 的正则点出来了，但 `check-stale.mjs:23` **用的是同一个正则**。后果是：**闸门陈旧度检查自己看不见产品的陈旧**。这是 §E 建议的唯一一件事的全部依据。

---

## 附录：全部探针与复跑清单

| 脚本 | 作用 | 独立运行 |
|---|---|---|
| `probe-comment-state.mjs` | 逐行复算 lint 的注释跳过状态机，证明 14 处 emoji 在块注释内 | ✅ 无参数跑全 3 文件 |
| `probe-html-comment.mjs` | 独立状态机证明 `index.html:236` 在 `<!--` 内 | ✅ 默认 index.html:236 |
| `probe-body-size.mjs` | 归因 13px body 由哪些文本块构成（8005 字符来自 rail-hint 等） | ✅ |
| `probe-rules-inventory.mjs` | 从源码解析 23 条 lint 规则 / 52 条 RULE_IDS / 41 条渲染专属 | ✅ |
| `probe-reconcile.mjs` | `data.js` vs 磁盘报告 vs 头部计数三方差值 | ✅ |
| `probe-factcheck.mjs` | 逐条核对任务书的数字（51/25/26、21 脚本、gitignore 等） | ✅ |
| `probe-direction-path.mjs` | 证明 `direction.json` 的探测路径 ≠ 写入路径 | ✅ |
| `probe-ui-vs-payload.mjs` | 界面源码 vs 规格载荷的 FAIL 拆分（85/115 = 73.9% 是噪声） | ✅ |
| `probe-applicability.mjs` | 8 条重点规则在 5 个入口上的触发矩阵（依赖 `probe-out/`） | ⚠️ 需先跑 C.5 的渲染 |

```powershell
# 一次性全部复跑（需已存在 probe-out/ 里的渲染产物）
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
cd D:\Web\style
Get-ChildItem deliverables\68-plan\probe-*.mjs | Sort-Object Name | ForEach-Object {
  Write-Output "`n===== $($_.Name) ====="
  & D:\Nodejs\node.exe $_.FullName
}
```

**渲染取证产物**（**注意：这些不是 gitignore 覆盖的，只是未跟踪**）：

```
$ git check-ignore -v deliverables/68-plan/PLAN-guards.md
(无输出，exit 1)   ← 未被忽略，只是 untracked
$ git status --porcelain deliverables/68-plan
?? deliverables/68-plan/
```

- `probe-out/sel/` — `_selection` 1440/768/390 全档
- `probe-out/wizard/` — `wizard.html` 全档
- `probe-out/M01-clean-corporate/` `M02-warm-local/` `M03-bold-creator/` — 三模板全档
- `probe-out/sel-badcwd/` — **错误 cwd 的反例证据**（`realPictures=0` + `broken-image`）
- `probe-out/sel-allow/` `sel-allow2/` — `--allow` 生效证据
- `probe-out/dirtest/` — `direction.json` 路径 bug 的证据

> 若要清理：`Remove-Item -Recurse deliverables\68-plan\probe-out`（**只会删渲染产物，9 个 `probe-*.mjs` 与 `PLAN-guards.md` 保留**）。
