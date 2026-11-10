# 静态复核：4 条主张（只读源码，不跑任何脚本）

复核方式：只使用 Read / Grep / Glob + 5 次 `git` 只读命令。**没有**执行 `_build/` 或 `_prompts/` 下任何脚本、没有任何 node/浏览器/CDP、没有 `find`、没有 `sleep`。凡是本该"跑一下就知道"的地方，改成读源码推理，并在文中标明推理链。

---

## CLAIM 1 — rule 4 用未剥注释的原始 CSS 匹配 `body{}`，注释里的 `background-image` 会被当真

**判定：CONFIRMED（且比主张说的更严重：它同时过严与过松，实际近乎失效）**

### a) 规则原文与 `stripNonRendered` 的全部用处

`prototypes/_build/verify-prototype.mjs:75-78`：

```js
  // 4 body 不得挂背景图（契约 §9.2：会让对比度检查整条静默跳过）
  for (const m of C.matchAll(/(?:^|\})\s*(body|html)\s*\{([^}]*)\}/g)) {
    if (/background-image|background\s*:[^;]*url\(/.test(m[2])) out.problems.push(`${m[1]} 规则挂了背景图 → 对比度检查会静默跳过`);
  }
```

`C` 的定义在 `:38` —— `const C = existsSync(css) ? readFileSync(css, 'utf8') : '';`，**原始文本，未剥任何东西**。

`stripNonRendered` 的用处只有两处（`grep -n stripNonRendered` 全量结果）：

- `:18` 定义（剥 `<!-- -->`、`/* */`、`<script>`、`<style>`、`//`）
- `:69` 唯一调用点：`for (const [tag, txt] of [['html', stripNonRendered(H)], ['css', stripNonRendered(C)]])` —— 只喂给 Emoji 规则

主张里"定义了但只给 Emoji 用"这一点**逐字成立**。

### b) S02 的注释确实在 body 块内、确实提到 `background-image`

`prototypes/S02-gilded-symmetry-salon/style.css`：

- `:49` `body {` 开始，`:70` `}` 结束
- `:52` `/* 炭黑卡纸的纤维纹理**不在这里** —— 见下方 body::before。`
- `:55` ` * 原本 \`background-image: url("assets/card-grain.png")\` 直接挂在 body 上，`
- `:56` ` * 违反 \`_CONTRACT.md\` §9.2/§9.16。…`
- 真正的图在 `:44`，属于 `body::before {`（`:39` 开始）——契约**推荐**的写法
- `body{}` 自己的背景只有 `:51` `background-color: var(--card);`

所以这是一次"修好了，却被自己写的修复说明判红"的假阳性。`deliverables/74-recon/toolchain.md:167-169` 记录了同一次复现（`✗ S02 … body 规则挂了背景图`），本次静态复核独立确认其机制。

### c) 关键问题：rule 4 能不能**永远**抓到真的 body 背景图？

**结论：不是"结构性死代码"，但在本仓库 30 案里对绝大多数 body 规则是盲的 —— 它只在 S02 上响，而响的那一次抓的是注释。**

先拆正则语义。`/(?:^|\})\s*(body|html)\s*\{([^}]*)\}/g`：

1. 前缀必须是**字符串开头**或一个 `}`（无 `m` 标志，`^` 只在文件第 0 字符生效）
2. 前缀与 `body|html` 之间只允许 `\s*` —— **不跨注释**
3. `body|html` 与 `{` 之间只允许空白
4. `([^}]*)` **遇第一个 `}` 即停**

逐条心算五个用例：

| # | 输入 | 结果 | 原因 |
|---|---|---|---|
| 1 | `*{box-sizing:border-box}\nbody{margin:0;background-image:url(a.png)}` | **命中** | `}` 作锚点，块内只到第一个 `}`，`background-image` 被看见 |
| 2 | `html{background:#fff}\nbody{background-image:url(a.png)}` | **漏** | `html{…}` 整体被匹配并**吃掉了那个 `}`**；扫到 `body` 时前一个字符已是"已消费"，`^` 又不成立（非文件首） |
| 3 | `@media(max-width:768px){body{background-image:url(a.png)}}` | **漏** | `body` 前面是 `{` 不是 `}` |
| 4 | `} /* 说明 */ body{background-image:url(a.png)}` | **漏** | `\s*` 不能跨 `/*…*/` |
| 5 | `body{margin:0;/* 原本 background-image: url(x) 在这里 */}` | **误报** | `[^}]*` 把注释文本一起收进捕获组（S02 正是此形） |

用例 2 是决定性的：**`html{}` 与 `body{}` 相邻时，`html` 的匹配会消费掉 `body` 唯一的锚点 `}`。** 而本仓库 30 案几乎全部是这种写法 —— 逐案读到的相邻对（`html {…}` 紧跟 `body {…}`）：

```
S01:39/41  S03:27/29  S06:44/46  S10:45/47  S04:26/27  S09:52/54  S07:22/23
S21:119/125 S15:27/29 S08:37/39  S14:17/19  S13:48/58  S20:31/33  S27:43/46
S30:32/34  S18:33/34 S28:31/33  S29:36/37  S12:34/35  S16:68/71
```

另有三类同样落在盲区：

- **注释隔开**：`S05:33 html{}` / `:35-36` 注释 / `:37 body{}` —— 用例 4
- **媒体查询内**：`S01:460`、`S18:328`、`S18:363`、`S16:440`、`S16:468`、`S21:827`、`S02` 之外的 `@media … body` —— 用例 3
- **唯一的例外**：S02 之所以被命中，是因为 `:39 body::before{}` 这条规则**匹配不上**（`::before` 卡在 `body` 与 `{` 之间），于是它 `:47` 的 `}` 没有被消费，反而成了 `:49 body{}` 的锚点。

所以答案是分层的：

- **不是结构性死代码**（用例 1 就能抓到真图），所以"这条检查完全没用"是**错的**；
- **但在本语料上它的检出力接近 1/30，且那 1 次是假阳性**。它对"真挂背景图"是过松的，对"注释里提到背景图"是过严的。

### d) 结论

**(iii) 两者都是。** 过严：注释文本被当声明（S02 实证）。过松：相邻 `html/body`、注释隔断、`@media` 内 body 全部漏检 —— 而响应式覆盖恰恰最可能把背景图放进 `@media` 里的 `body`。

同仓 `prototypes/_build/check-texture.mjs:49-79` 已经用**花括号配对状态机**解决了同一问题（并在 `:51-61` 逐条记下"正则版相邻规则只看到隔一条""只记录深度 0 的块漏了 22 条"两版前科），且 `:47` 先 `stripComments`。也就是说：同一个仓库里有正确实现，rule 4 是没跟上的那一份。

---

## CLAIM 2 — README 声称选型台"故意保留 body-size FAIL"，这是假的、而且从来不是真的

**判定：PARTLY TRUE（"现在假"成立；"从来不是真的"不成立）**

### a) README 的两处原文

- `README.md:331`：「后果不是"报告有点旧"，是**报告说的话与页面相反**：入库那份写 `FAIL 0`，2026-10-28 用 `inspect.mjs` 重跑实测 `FAIL 2`（`body-size` / `hairline`）。」
  —— 这是**历史陈述**（2026-10-28 的一次重跑），不是"现在仍有"。
- `README.md:393`：「已知仍未清零的一条：`body-size` 判「正文 13px」。这是**选的**，不是漏的——…这一条在 `inspect.mjs` 里保持 FAIL 是诚实的，不靠 `--allow` 放行。」
  —— 这是**状态陈述**（至今仍在）。

英文版同构：`README-EN.md:335` / `README-EN.md:397`。

### b) 入库那份 report.json 的全部 finding id

`prototypes/_selection/.inspect/report.json`（`"at": "2026-10-30T21:07:40.597Z"`，`:3`）：

`findings` 数组（`:829-837`）**只有一条**：

| level | id | width | 内容 |
|---|---|---|---|
| WARN | `no-footage` | 1440 | "No video anywhere on the page." |

**没有 `body-size`，也没有 `hairline`。** 三档视口（1440/768/390）的 body 度量一致：

```
:157-164  "body": { "font": "Archivo", "size": 16, "leading": 1.45, "weight": 400, "tracking": 0, "contrast": 8.2 }
:434-441  同上（768 档）
:705-712  同上（390 档）
```

判据在 `tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs:106-107`：

```js
if (m.type.body && m.type.body.size < 15) add('FAIL', 'body-size', ...);
else if (m.type.body && m.type.body.size < 16 && !mobile) add('WARN', 'body-size', ...);
```

`size = 16` → 既不 FAIL 也不 WARN。**这与报告里找不到 `body-size` 完全自洽**；反过来，README:393 的"保持 FAIL"与报告**直接矛盾**。

### c) 历史版本里出现过 `body-size` 吗？没有

`git log --oneline -S"body-size" -- prototypes/_selection/.inspect/report.json` → **无输出**（该字符串在入库报告中的出现次数从未变化过）。

直接读早期版本的 `findings`：

- `caefdd9`（首提交）：`at` 未记，findings = 2 条 WARN：`no-footage`、`measure`
- `9d842c7`（2026-10-28T16:11:15.445Z）：findings = **1 条 WARN：`no-footage`**，三档 body 均 `size: 16`

也就是说：**在任何一个被提交过的 report.json 里，`body-size` 从未出现过一次。**

### d) 判定

**"故意保留 body-size FAIL"这个状态陈述是假的**，而且不是"最近才变假"：

- 现行报告：只有 `no-footage`；body 实测 16px（`:157-164`）
- 现行实现：`.row-family { font-size: var(--s-16) }`（`prototypes/_selection/style.css:524`）—— 这正是 `style.css:493-515` 那段长注释记录的"2026-10-28 修 body-size FAIL"的落点。它把该页唯一成段的散文（每案 133–282 字）从 13px 抬到 16px；注释 `:496-502` 用复刻探针算过：96%（6,958 字）的正文全部来自 `span.row-family` 一个选择器
- **同一提交既是修复、又是那句谎**：`git blame -L 390,394 README.md` 与 `git blame -L 520,526 prototypes/_selection/style.css` 都指向 `9d842c7`（2026-10-29）。即：把 `.row-family` 改成 16px 的那次提交，同时写下了"已知仍未清零 body-size 判正文 13px"

**"从来不是真的"这一半不成立。** 仓内两份文档记录了 2026-10-28 的一次实测确实含 `body-size`：`README.md:331` 与 `deliverables/68-plan/REDTEAM-guards.md:157`（「渲染闸门在 `_selection` 上只报 2 条 FAIL：`body-size`…与 `hairline`」）。那是一次**未入库的重跑**，静态读取无法证伪它当时为真。所以准确说法是：

> `body-size` FAIL 曾经在 2026-10-28 的一次重跑里出现过，但在 `9d842c7` 修掉 `.row-family` 之后**已不存在**；README:393 是那次修复的残留，它描述的缺陷与写它的同一提交相冲突。入库的报告从来没有过它。

附带一条更硬的旁证：README:393 给出的"不能抬到 16px"的理由（`首屏从一张完整卡掉到 0 张`）也被同仓实测否掉 —— `style.css:508-511` 记着 A/B 数据：`1440×900 首卡 top 407.0 → 407.0（Δ0）、卡高 276.8 → 276.8（Δ0）`。代价是 0，理由不成立。

**守卫缺口**：`check-docs.mjs` 的 `nums/gate`（`:596-608`）只核对"N 个闸门 FAIL=0"这个**数字**（读 `data.js` 的 `s.gate.fail`），它不读 `_selection/.inspect/report.json`，也不核对"某条具体规则仍 FAIL"这种散文断言。所以这句话没有任何检查器看着 —— 这正是 `check-docs.mjs:1-6` 自己声明要治的那类腐化，只是它没覆盖到"某案某规则"这一粒度。

**附带发现（同一段注释里的第二个谎）**：README:393 说把正文抬到 16px 会让首屏从"1 张完整卡"掉到"0 张"。同仓实测正好相反 —— `prototypes/_selection/style.css:508-511` 记着 A/B：`1440×900 首卡 top 407.0 → 407.0（Δ0）、卡高 276.8 → 276.8（Δ0）`。代价是 0，那条"不能修"的理由不成立。

---

## CLAIM 3 — 30 案里 22 案在选型台看到的色块数少于它们的提示词要求的数量

**判定：CONFIRMED 为事实；成因是三层上限叠一层 UI 再截断；性质是"有意的双层设计，但 UI 层缺一句披露"（不是 BUG，也不是完全没问题）**

### a) `data.js` 的 `palette` 怎么建、上限在哪

`prototypes/_build/collect-schemes.mjs:523-527`：

```js
  const pal = [];
  if (rec.bg) pal.push(rec.bg);
  if (rec.primary && !pal.includes(rec.primary)) pal.push(rec.primary);
  for (const h of fromSpec) { if (pal.length >= 4) break; if (!pal.includes(h)) pal.push(h); }
  rec.palette = pal;
```

上限硬编码为 **4**，而且是"先塞 bg、再塞 primary、再用规格色补到 4"。所以长度只有两种结果：能补满 = 4，规格里合格色不足 = 3（`bg` + `primary` + 1 或更少）。实测 `data.js` 里 3 色块恰好 5 处（`:1407`、`:1835`、`:2263`、`:2348`、`:2520`），其余 25 处为 4 色 —— 与任务给的 5/25 完全吻合。

"合格色"为什么可能不足 4：同一段代码前面有三道过滤 —— `:452` `NEG`（否定语境）、`:505-509` `ROLE`／`ROLE_NAME_*`（必须有角色标签）、`:520` `inStyle(dir, h)`（**该色在 style.css 里必须至少出现 1 次**）。`fromSpec` 是三道过滤后的结果（`:517-522`），题目里"5 案只有 3 色"就是这三道过滤卡掉了第 4 个色。

### b) `clean-dna.mjs` 的 `pickPalette()` 上限

`prototypes/_prompts/clean-dna.mjs:1002-1003`：

```js
function pickPalette(decls, rowColors, rawCss, specCtx) {
  const MAX = 7;
```

两处硬上限：`:1223` `if (chosen.length >= MAX) break;`（补规格声明色）、`:1236` `if (chosen.length >= MAX) break;`（补派生色）。文件头 `:997-1000` 写了为什么是 7：「旧实现按 `:root` 声明顺序取前 5 个…S19 的 `--green` 在第 6 位、S24 的 `--grape` 在第 7 位…上限 7 个。7 而不是 5 是权衡结果」。

产物形态在 `prototypes/_selection/prompts.js` 的 `dna.palette`（每案一行字符串）。逐行数出来的长度分布：

| 长度 | 案数 | 案号 |
|---|---|---|
| 4 | 10 | S01 S04 S07 S09 S11 S13 S15 S20 S22 S28 |
| 5 | 3 | S10 S16 S21 |
| 6 | 6 | S08 S18 S25 S27 S29 S30 |
| 7 | 11 | S02 S03 S05 S06 S12 S14 S17 S19 S23 S24 S26 |

与任务给的 10/3/6/11 逐数吻合。

### c) 卡上的色块渲染表达式 —— 又截了一次

两处，都是 `slice(0, 4)`：

- `prototypes/_selection/app.js:518`
  ```js
  var sw = (r.palette || []).slice(0, 4).map(function (h) {
  ```
- `prototypes/_selection/wizard.js:192`（向导推荐卡，同一刀）

`r.palette` 来自 `data.js`，最长就是 4，所以这第三刀**今天是恒等操作**（no-op）。它是一颗埋着的哑弹：若将来 `collect-schemes` 的上限从 4 抬到 7，卡上仍然只画 4 个 —— 用户看到的会比数据层更少，而且不会有任何报错。

另有一处**不截断**的：详情面板的「当前有效配色」由 `app.js:966-977` `paletteLine()` 生成，`p.slice(2).join('　')` 把 3/4 个色全打出来。所以选型台内部本身一致（都是 4 色）。

### d) 判断：BUG 还是双层设计？

**结构上确实是双层设计，不是同一个数被两个 bug 各算一遍。** 两条链的语义分工有源码与实测双重支撑：

- `prototypes/_build/check-twolines.mjs:12-13`（文件头）：`data.js = 规格字段 3 声明的 4 个主色（面积和 100），忠实转录设计意图` / `prompts.js = data.js 的 4 色 + 从 :root 补的 0–4 个派生色 = 4–7 色`
- 同一文件 `:185-207` 把原来的 R2/R3/R4 三条断言**删掉**了，理由是"它们是构造恒真式"——因为它们直接对应 `collect-schemes.mjs:523-527` 的 push 顺序。这说明维护者清楚两层是两个东西。
- 4 色那层的语义约束是**面积和 100%**（`data.js` 的字段 3 原句就是"面积和 100"），7 色那层补的是实现必需的派生色（`PLAN-final.md:24-25`：补的 53 个里 52 个不在规格，是"次级墨、悬停态、暗部、AA 字色"）。

所以 `PLAN-final.md:28`「两条链都对，它们描述的是不同层次：设计意图 vs 施工细节」**我同意**，`PLAN-final.md:79-80`「让两链相等会丢掉 52 个必需派生色」「修 `data.js` 的截断逻辑 —— 它已精确等于规格字段 3，无需修」也成立。

**但 22/30 这个比例说明"双层"在 UI 上没有被表达出来。** 算术上：`mismatch = 30 − |data 4 色 ∧ prompt 4 色|`；要让总数等于 22，交集只能是 8。也就是 **30 案里只有 8 案的色块数等于提示词要求的色数**，73% 的案子上用户看到的色板严格少于他复制走的那段提示词。

四个选项我逐个判：

| 选项 | 判断 | 理由 |
|---|---|---|
| (a) 把 `data.js` 上限抬到 7 | **错** | 会破坏两条被闸门钉住的不变量：`collect-schemes.mjs:526` 的 4 就是"字段 3 的 4 个主色（面积和 100）"的落地，`check-twolines.mjs` 的 R1（`data.js ⊆ prompts.js`）与 `R6`（UI 印的「主色」= 规格声明的主色）都建立在这个语义上；抬到 7 还会把 52 个 CSS 派生色混进"设计意图"层，让 24/30 的"与规格字段 3 精确一致"塌掉（`PLAN-final.md:55`） |
| (b) 把 prompts 上限压到 4 | **更错** | `PLAN-final.md:79` 已经算过：会丢掉 52 个必需派生色，AI 只能自己编次级墨/悬停态。而且 `clean-dna.mjs:1000` 明确写了 7 是"AI 能守住的上限"这个权衡 |
| (c) UI 披露 | **对，但要做到点上** | `PLAN-final.md:81` 明确拒绝了这一项（「28/30 案的 4 色是合格摘要；实测底色主色都在，用户没被误导」）。该理由只覆盖了"底色/主色都在"（这条确实 30/30 成立），没覆盖"次要色缺了几成"。正确的最小改动不是加一段长文案，而是让色块行有一句 `title`/脚注指向"提示词里还有 N 个派生色"——数据已在 `prompts.js` 里，`app.js:466` 已经在读 `window.STYLE_PROMPTS`，零新增取数成本 |
| (d) 就这样 | **可接受但需把数字写进文档** | 若选它，前提是文档不能继续暗示"4 色 = 全部配色"。当前 `README.md:176` 已经如实写了分工（"=`spec 字段 3 的 4 主色`…含 CSS 派生色"），这一点做得对 |

**我的结论：这是设计，不是 bug；但"22/30"这个覆盖率让 (c) 的必要性成立，(d) 只在不加披露时才算缺陷。** 真正该修的是 `wizard.js:192` / `app.js:518` 那两处 `slice(0, 4)`：今天恒等，但它是把"数据层上限"和"UI 显示上限"耦合在一个字面量 4 上，一改就静默退化。

---

## CLAIM 4 — `templates/` 除了"路径存在"没有任何闸门

**判定：CONFIRMED（且比主张更糟：连"路径存在"这条闸门也只看文档里提到的编号，不看模板内容）**

### a) `prototypes/_build/` 里 `templates` 的全部命中

`grep -rn templates prototypes/_build/` 只有 **一个文件**命中：`check-docs.mjs`。

| 位置 | 做什么 |
|---|---|
| `check-docs.mjs:855-859` | 注释 + `PREFIXES = ['prototypes/', 'templates/', 'deliverables/', 'tools/', 'index.html', 'LICENSE']` —— 决定"文档里的反引号路径要不要按仓库根解析" |
| `check-docs.mjs:881-887` | `templates/M01` → `templates/M01-clean-corporate/` 的缩写补齐（只判目录名前缀） |
| `check-docs.mjs:905-912` | `for (const m of src.matchAll(/templates\/(M\d{2})/g))` → 在 `templates/` 下找 `startsWith(M01)` 的目录；找不到就 `fail('paths/templates', …)`，否则 `pass('paths/templates', '文档提到的模板编号都存在')` |

除此之外，**没有任何一条针对模板内容的判据**。逐个检查其它入口脚本的目录选择器，全部只认 `S\d{2}-`（外加 `_selection`）：

| 脚本 | 覆盖范围 | 依据 |
|---|---|---|
| `verify-prototype.mjs:159-160` | `/^S\d{2}-/`（`--all`），且 `:143-158` 明确决定**不**并入产品入口 | 有意 |
| `_entries.mjs:25,74-79` | `CASE_DIR_RE = /^S\d{2}-/`；`PRODUCTS` 只有 `_selection` | 单一来源定义 |
| `check-anchors.mjs:20,29` | `allDirs()` = `caseDirs` + `productEntries` → 只有 S01–S30 + `_selection` | 模板的 `index.html` 锚点**从不被查** |
| `check-stale.mjs:34,41,115,185` | `caseDirs` + `productEntries` | 模板无 `.inspect/report.json`，天然不在覆盖内 |
| `check-texture.mjs:111-119` | `/^S\d{2}-/` + `_selection/style.css` | 模板 `style.css` 的 body 背景**从不被查** |
| `check-contract.mjs:111-114` | `/^S\d{2}-/` | 同上 |
| `check-prompts.mjs:71-74` | `/^S\d{2}-/` | 与提示词无关，合理 |
| `summarize-all.mjs:18-21` | `/^S\d{2}-/` | 同上 |

唯一一个"看模板内容"的脚本是 `deliverables/66-audit/tpl-audit/verify-templates.mjs`，但它：① 在 `deliverables/` 不在 `_build/`；② 没有任何 `_build/` 脚本 import 它；③ 只核对 `TEMPLATES` 的 `scenes`／`colors`／`desc` 是否逐字出现在 README 与 `:root`（`:30-44`），**完全不看 `box-shadow`、溢出、对比度、锚点**。它是一次性审计工件，不是闸门。

### b) `box-shadow` 逐模板计数（`grep -c`）

```
templates/M01-clean-corporate/style.css   3   （:204、:284、:560）
templates/M01-clean-corporate/TOKENS.md   1   （:176 表格里描述 .card 的投影）
templates/M01-clean-corporate/README.md   0
templates/M02-warm-local/style.css        0
templates/M02-warm-local/README.md        1   （:188 声明"全站零 box-shadow"）
templates/M03-bold-creator/style.css      1   （:122 汉堡两条杠）
templates/M03-bold-creator/README.md      1   （:160 承认这 1 处）
templates/M03-bold-creator/TOKENS.md      1
```

M01 的三处性质完全不同，必须分开看：

- `:284` `.card{ box-shadow:0 1px 2px rgba(20,27,35,.04), 0 16px 30px -24px rgba(20,27,35,.3); }` —— 真正的外投影（卡片浮起）
- `:204` `.nav-toggle:checked ~ .site-nav{ box-shadow:0 20px 32px -22px rgba(20,27,35,.45); }` —— 手机菜单展开面板的投影
- `:560` `box-shadow:none;` —— 平板断点里的**重置**，不是阴影

也就是说按"真的画了外投影"数，M01 是 **2 处**；按字符串出现数，是 3 处。

### c) M01 README 的阴影声明 vs 根 README 的模板层声明

- `templates/M01-clean-corporate/README.md:162`（R-16 豁免行）：「`--radius:10px`…+ 一段很浅的两层阴影 `0 1px 2px` + `0 16px 30px -24px`」—— 这**逐字就是** `style.css:284` 的 `.card`。所以这是**明示豁免**，不是遗漏。
- `README.md:215-216`：「⚠️ **`box-shadow` 0 其实没守住**：M01 有 3 处、M03 有 1 处（用 `box-shadow` 画汉堡两条杠）。**而 M01 自己的 `README.md` 就承认这是有意豁免**——两层文档对同一处声明给过相反结论。」

**三者并不构成"互相矛盾"，而是一条被写坏的豁免链。** 具体三处错：

1. **括号里的理由只对 M03 成立**。`templates/M03-bold-creator/style.css:122` 的 `box-shadow: 0 -5px 0 currentColor, 0 5px 0 currentColor` 才是"画汉堡两条杠"；M01 的三处里没有一处是汉堡（M01 的汉堡在 `:188`，用的是 `background:var(--ink)` + `height:2px`，没有 `box-shadow`）。`README.md:215` 那句话「M01 有 3 处、M03 有 1 处（用 `box-shadow` 画汉堡两条杠）」的括号要么只修饰 M03（则漏解释 M01 的 2 处），要么修饰整个列表（则对 M01 是错的）。两种读法都不合格。
2. **"3 处"里有一处是 `box-shadow:none`**（`:560`），把它算作"没守住"是计数口径错——`none` 恰恰是"守住"。
3. **M01 README 的豁免表只覆盖了 `.card` 那一处，没覆盖 `:204` 的菜单面板投影**。所以严格说，M01 里有 **1 处真外投影是它自己的 README 没披露的**。

而根 README 说"两层文档给过相反结论"——在这份仓库的现状里，M01 的 README **不**说"零阴影"（它明说豁免），M02 的 README **说**"全站零"（且实测为 0，成立），只有根 README 的 `box-shadow: 0` 这个**总括数字**与事实不符。真正"相反"的只有：根 README 的 "box-shadow 0" vs M01/M03 的实测非零。

### d) 判定

**CONFIRMED。** `templates/` 的守卫强度是：

- 文档提到 `templates/M01` 时，那个目录存在 → 查（`check-docs.mjs:905-912`）
- 文档里的 `templates/...` 路径存在 → 查（`check-docs.mjs:859`）
- **模板自己的 CSS / HTML / 声称的实测数字 → 一条都不查**

而这一层恰恰是三条已知不可靠声明的所在地（根 README:215 的计数与理由、M01 README 未披露的 `:204`、M02 的"全站零"只是因为恰好为 0）。换句话说：这个仓库对 30 个案建了 8 个闸门，对 3 个模板建了 0 个内容闸门 —— 而模板层是唯一声称"12 个变量改一个站"、会被用户**直接复制走**的一层。

---

## 四案判定表

| # | 主张 | 判定 | 决定性证据 |
|---|---|---|---|
| 1 | rule 4 用未剥注释的原始 CSS 匹配 `body{}`；`stripNonRendered` 只给 Emoji 用 | **CONFIRMED**（且过严+过松并存） | `verify-prototype.mjs:76`（用 `C`）/ `:69`（唯一 `stripNonRendered` 调用）/ `S02/style.css:52-63`（注释在 body 块内且提到 `background-image`）/ `S02/style.css:44`（真图在 `body::before`） |
| 2 | README 声称选型台故意保留 `body-size` FAIL，这是假的、从来不是真的 | **PARTLY TRUE** | "现在假"成立：`_selection/.inspect/report.json:829-837` 只有 `WARN no-footage`，body 实测 `size:16`（`:157-164`），`style.css:524` 已改 `var(--s-16)`，`git blame` 证明修复与那句话是同一提交 `9d842c7`。"从来不是真的"不成立：`README.md:331` 与 `deliverables/68-plan/REDTEAM-guards.md:157` 记录了 2026-10-28 一次**未入库**的重跑确实含 `body-size` + `hairline`；`git log -S"body-size" -- …/report.json` 无输出，证明入库报告从未有过它 |
| 3 | 22/30 案的色块数少于提示词要求的色数 | **CONFIRMED 为事实；成因是设计** | 上限链：`collect-schemes.mjs:526`（4）→ `clean-dna.mjs:1003`（`MAX = 7`，`:1223`/`:1236` 两处 break）→ `app.js:518`/`wizard.js:192`（再 `slice(0,4)`，今日恒等）。`PLAN-final.md:28,79-80` 的"设计意图 vs 施工细节"我同意；(a)(b) 都错，(c) 或 (d)+已披露的 `README.md:176` 可接受 |
| 4 | `templates/` 只有路径存在检查 | **CONFIRMED**（比主张更弱） | `_build/` 里 `templates` 只命中 `check-docs.mjs:855-912`；八个入口脚本全用 `/^S\d{2}-/`（`_entries.mjs:25`）；`M01/style.css` 3 处 `box-shadow`（含 1 处 `none`）vs `README.md:215` 的错误理由与 `M01/README.md:162` 的豁免只覆盖 `.card` |

---

## 最要紧的一条

**CLAIM 1 的结构性部分，但结论与提问方向相反。**

提问者希望我判"rule 4 是不是结构性死代码"。答案是**不是**，而这一点比"是"更糟：

- 如果它是死代码，`--all` 报 `达标 28 / 30` 就只是噪声，删掉即可。
- 实际上它在 30 案里对**真**背景图几乎全盲（相邻 `html{}` 吃掉 `body{}` 的锚点、注释隔断、`@media` 内 body 三类盲区，逐案可指：`S01:39/41`、`S05:33/35-37`、`S18:328`…），却在**唯一一次触发**时抓的是注释（S02）。也就是说：**它有 100% 的误报率、约 0% 的真报率，而它的输出被 `verify-prototype.mjs:167-171` 计入 `bad++`，再经 `:178` 的汇总行变成 README 的"29 个闸门 FAIL=0"这个可复算断言的一部分。**

更严重的是它所在的这条规则本应是"唯一一条一破全假"的规则（`check-texture.mjs:1-18` 原文：「它一旦破了，其余检查器的绿都是假的」）。同仓已有正确实现（`check-texture.mjs:47` 先 `stripComments`、`:67-79` 花括号配对状态机），却在 `verify-prototype.mjs` 里留了一个正则版；而 `check-texture.mjs:55-57` 自己就记着"第一版因为正则吃掉 `}` 只看到 34 条 body 规则、漏掉 51 条"——**同一个坑在这个仓库里被踩了至少两次，第二次还留在主力复核脚本里。**



