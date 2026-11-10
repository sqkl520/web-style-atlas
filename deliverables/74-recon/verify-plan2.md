# 独立复核：D1–D4（第二轮，重写）

仓库根：`D:/Web/style`。全部结论只依据 Read/Grep/Glob 与只读 `node -e` 一行脚本（无 `_build/`/`_prompts/` 脚本、无 playwright/CDP、无生成器）。
方法与指标凡属自定，均在下文显式声明。

---

## D1 — `verify-prototype.mjs` 规则 4 是「注释盲」

### a) 规则 4 原文

`prototypes/_build/verify-prototype.mjs:75-78`：

```js
  // 4 body 不得挂背景图（契约 §9.2：会让对比度检查整条静默跳过）
  for (const m of C.matchAll(/(?:^|\})\s*(body|html)\s*\{([^}]*)\}/g)) {
    if (/background-image|background\s*:[^;]*url\(/.test(m[2])) out.problems.push(`${m[1]} 规则挂了背景图 → 对比度检查会静默跳过`);
  }
```

`C` 在 `:38` 直接 `readFileSync(css)`，**未经任何剥离**。

### b) `stripNonRendered()` 的全部调用点 —— 只有一处

`grep -n stripNonRendered prototypes/_build/verify-prototype.mjs` 仅给三行：

- `:18` 定义
- `:21`/`:22`/`:23`/`:24` 其内部（分别剥 HTML 注释、`/* */`、`<script>`、`<style>`、`//`）
- **`:69` 唯一调用**：`for (const [tag, txt] of [['html', stripNonRendered(H)], ['css', stripNonRendered(C)]])`

`:69` 属于 **规则 3（Emoji）**。规则 1（远程资源，`:47`）、规则 2（禁用字体，`:60`）、**规则 4（`:76`）**、规则 6（本地引用，`:94`）全部直接吃原始 `H`/`C`。

→ 声明前半句「有剥注释工具但只用在 Emoji 上」**属实**（更准确说：只用在 Emoji 一处，其余四条规则都不用）。

### c) 规则 4 确实命中 S02 注释里的那句 `background-image`

`prototypes/S02-gilded-symmetry-salon/style.css:49-70` 是 `body { … }` 块。其中 `:52-63` 是一大段 `/* … */`，`:55` 写着：

```css
   * 原本 `background-image: url("assets/card-grain.png")` 直接挂在 body 上，
```

实测（`node -e` 复刻规则 4 于 S02）：

```
RULE4 FIRES. tag=body
captured: "background-image: url(\"assets/card-grain.png\")"
position inside a /* */ comment: true
```

即：捕获到的子串就是**注释正文**，且字符偏移落在注释区间内。注释之外，该 `body` 块只有 `background-color: var(--card)`（`:51`）与 `background-repeat: repeat`（`:64`），**没有**任何真背景图。

→ 声明后半句「因此误报 S02」**属实**（就规则 4 这条而言）。

### d) 关键：这条规则**早已是死的** —— 它抓不到真违规，只在注释上"复活"

#### d-1 正则本身的结构缺陷

`(?:^|\})\s*(body|html)\s*\{([^}]*)\}` 的 `}` 是**被消耗的**。`matchAll` 从上次匹配末尾继续，因此**上一条规则的收尾 `}` 一旦被吃，紧接着的下一条规则就失去锚点**。

`node -e` 合成串实测：

| 合成 CSS | 规则 4 是否命中 |
| --- | --- |
| `body { background-image: url(x.png); }` | **命中** |
| `*{box-sizing:border-box}\nbody { background-image: url(x.png); }` | **命中** |
| `.a{color:red}\nbody{background-image:url(x.png)}` | **命中** |
| `/* hi */\nbody { background-image: url(x.png); }` | **未命中** |
| `html { … }\n\nbody {\n background-image: url(x.png);\n}` | **未命中**（只命中 `html`） |
| `html, body { background-image: url(x.png); }` | **未命中** |
| `body::before { background-image: url(x.png); }` | **未命中**（正确，伪元素不算） |
| `@media (min-width:600px){ body { … } }` | **未命中** |
| `a{color:red}\n/* c */ body { … }` | **未命中** |

两重失明：
1. **`}` 消耗**：只要 `body` 前面隔着偶数条已闭合规则（含紧邻的 `html{…}`），就抓不到；
2. **`[^}]*` 不能跨 `}`**：`body` 声明里一旦出现任何 `}`（嵌套、或注释里写了 `}`），捕获区被截断甚至整块不成立。

#### d-2 对 30 案实测

复刻规则 4 跑全部 30 个 `style.css`：

```
FLAGGED by rule4 (1):  S02-gilded-symmetry-salon :: background-image: url("assets/card-grain.png")   ← 注释里的
REAL body block exists but rule4 matched NOTHING: 24 案
rule4 matched a body block: 6 案 (S01 S02 S16 S17 S18 S25)
```

且 30 案里 **25 案的 `body` 块紧接在 `html { … }` 之后**（`htmlThenBody: 25`），这正好落在 `}` 被消耗的失明带里。

#### d-3 该规则**从来没有**抓到过 S02 的真实违规

S02 在 `caefdd9`（首个提交）的 `body` 块是**真的**挂了背景图：

```css
body {
  margin: 0;
  background-color: var(--card);
  /* 炭黑卡纸的纤维… */
  background-image: url("assets/card-grain.png");
```

拿规则 4 跑那一版（`git show caefdd9:…style.css`）：

```
tag=html len=26 HIT=false
```

**一条都没命中** —— 因为该 `body` 前面是 `* { … }` 然后是 `html { … }`，两条闭合规则的 `}` 被前序匹配吃掉。

负责抓这条的其实是另一个脚本 `check-texture.mjs`，它的文件头把自己的前科写得很清楚（`prototypes/_build/check-texture.mjs:49-63`）：

> 第一版用正则 `/(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g`，`}` 被匹配消耗后下一个模式要求 `^` 或 `}`，于是**相邻规则只看到隔一条**。实测 S02 的 `body { … background-image: url(...) }` 落在被跳过的一半里，**闸门报「违规 0」**。

这等于仓库自己在另一份文件里**承认了同一族正则的失效**，而 `verify-prototype.mjs:76` 至今仍是那一族。

#### d-4 判定：规则 4 是「死规则 + 唯一活口是假阳性」

- 对真实违规：**0/30 命中**（S02 入库时的真违规也没抓到）；30 案当前 **0 案**存在真违规，故无法证伪"能抓"——但 d-3 已用历史版本给出反证。
- 对注释文本：**1/30 命中**（S02），且是假阳性。
- 更糟：`deliverables/39-critique-toolchain-repro.md:407` 把这条评为「**这是 19 条里实现得最干净的一条**」—— 这个评价本身是错的。

→ 规则 4 = **死规则**（functional=false）。它输出的唯一一条问题，是注释造成的假阳性。

### 附：D1 的"过严/过松"回答

**（c）两者都有，但在不同对象上。**

- 对**注释**：过严 —— 把不渲染的文本当违规（S02 假阳性）。
- 对**真实 body 背景图**：过松到失明 —— 30 案 0 命中，历史真违规也 0 命中（d-3）。
- 即：**该响的时候不响，不该响的时候响**。这不是"阈值调偏"，是判据本身不成立。

### 附：S02 当前是否真被这条误报"拖成不达标"？

**否 —— 规则 4 目前是一条死代码级的误报，不进任何汇总。**

- `prototypes/S02-gilded-symmetry-salon/.inspect/report.json`：`at=2026-10-30T21:04:45.314Z`，`findings=[["font-count","WARN"],["no-footage","WARN"]]`，**FAIL 0**。
- 若规则 4 的这条 problem 真的生效，`verify-prototype.mjs` 会把 S02 计入"不达标"。但仓库最近一次全量记录 `prototypes/_build/_gate-final.txt` 是 **2026-10-17**（`ls` 时间戳）的 UTF-16 旧档，不反映当前状态；也没有任何可读记录显示「S02 因规则 4 被判不达标」。

结论：**声明 D1 的机制描述准确（a/b/c 全对），但它暗示的"当前正在误伤 S02"没有证据；而它没说的、更严重的那半（规则 4 对真违规完全失效）成立。**

---

---

## D2 — README 称"故意留一条 `body-size` FAIL"，该说法为假且从来为假

### a) README 原文与行号

两版都有，同一提交引入：

- `README.md:393`
  > 已知仍未清零的一条：`body-size` 判「正文 13px」。这是**选的**，不是漏的——本页正文主体是方案卡的元数据（30 案 × 十几个 13px 字段名与读数），把整页正文抬到 16px 会让列表页首屏从 1 张完整卡掉到 0 张…这一条在 `inspect.mjs` 里保持 FAIL 是诚实的，不靠 `--allow` 放行。
- `README-EN.md:397` 是同句英译。

`git blame -L 393,393 README.md` → `9d842c7 (2026-10-29)`。

### b) `.inspect/report.json` 实际内容：**没有 body-size，`body.size = 16`**

当前入库报告 `prototypes/_selection/.inspect/report.json`：

```
at      = 2026-10-30T21:07:40.597Z
allow   = []
findings= [ { level:"WARN", id:"no-footage", message:"No video anywhere on the page." } ]   ← 仅 1 条
viewports = [1440, 768, 390]
metrics.type.body = { font:"Archivo", size:16, leading:1.45, weight:400, contrast:8.2 }      ← 16px, 三档一致
```

- **FAIL 0 条**，WARN 1 条（`no-footage`）。
- `body.size = 16`。按 `tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs:106` 的判据（`size < 15` → FAIL；`size < 16 && !mobile` → WARN），**16px 连 WARN 都不触发**。
- 报告是新鲜的（mtime `2026-11-03`，早于本次复核；`style.css` mtime `2026-10-29`）。

### c) 它曾经是真的吗？—— **只在 2026-10-27/28 那一个窗口为真，且当轮就修好了**

我逐个历次入库报告核验（`git show <commit>:…/.inspect/report.json`，取 1440 档 `metrics.type.body.size`）：

| 提交 | 报告 `at` | `body.size` | findings |
| --- | --- | --- | --- |
| `1f30e7d`（入库） | 2026-10-21T19:51 | **16** | `no-footage` W, `measure` W |
| `923b6a4` / `a0c0d54` / `1753f94` / `d49ed74` | 仍 2026-10-21（未重渲染） | **16** | 同上 |
| `9d842c7` | 2026-10-28T16:11 | **16** | `no-footage` W（仅 1 条） |
| `0ee3fb5` | 2026-10-29T16:29 | **16** | `no-footage` W |
| `HEAD` | 2026-10-30T21:07 | **16** | `no-footage` W |

**所有 14 次入库报告的 1440 档 `body.size` 无一例外都是 16**；`grep -c '"body-size"'` 对每一个历史版本都是 **0**。

唯一一次 `13px` 出现在**未入库的临时渲染**里：`deliverables/67-exec/_lab/inspect-after.json`（`at=2026-10-27T18:16:27Z`，`body.size=13`，findings 含 `body-size FAIL` + `hairline FAIL`）。那是 `67-exec` 的实验室产物，不是入库报告。

而 `9d842c7` 这条提交**同时**做了两件事：
1. 新增 `.row-family { font-size: var(--s-16); }`（该提交 diff 里的注释自述：「16px：本页 running text 的主导字号（2026-10-28 修 body-size FAIL）」）；
2. 把 `9d842c7^` 的报告（`at=2026-10-21`，`body.size=16`）替换成 `at=2026-10-28T16:11` 的新报告（`body.size=16`，FAIL 0）。

也就是说：**"13px" 这次 FAIL 在写进 README 的那一次提交里，就已经被同一次提交修掉了。**

### d) 判定

- 「曾经为真」：**部分成立** —— 2026-10-27 的实验室渲染确实量到 13px/FAIL，但它从未进入入库报告，且 30 案与产品入口的入库报告里 `body.size` 恒为 16。
- 「README 说这是当前仍存在的 FAIL」：**假**。当前报告 `FAIL 0`，`body.size=16`，且 `grep -c '"body-size"'` 对报告 = 0。
- 「从来为假」：**也偏强** —— 有一个真实的历史瞬间（未入库的实验渲染）它成立。

→ **判定：FALSE（就 README 现在这句话的字面主张而言）。** 这句话在 `9d842c7` 落地的那一刻就已经与它自己配套的 `report.json` 矛盾，此后 `report.json` 又被 9 个提交重渲染（`git log 9d842c7..HEAD -- …/report.json` = 9），每一次都是 `body.size=16` / `FAIL 0`，这句话一次都没被校。没有任何闸门看它：`grep body-size` 在 `check-docs.mjs` / `check-contract.mjs` / `check-stale.mjs` 里**全部 0 命中**（只有 `check-stale.mjs:14` 一句注释提到它）。

这才是最锋利的一点：README 自己在 `:348` 写过「**散文清单没有对账机制**」，而这一句正是又一条没有对账机制的散文，且它**断言了一条不存在的 FAIL**。

---

## D3 — 22/30 案台面只给 4 个色块，提示词却要 4–7 色

### 指标定义（显式声明）

- **台面色块数** = `app.js:518` 的 `(r.palette||[]).slice(0,4).length` —— 即 `min(data.js palette.length, 4)`。用 `vm` 加载 `data.js`（`window.SCHEMES`）与 `prompts.js`（`window.STYLE_PROMPTS`），上下文 `{window:{}}`。
- **提示词色数** = `prompts.js` 该案 `dna.palette` 字符串里**去重后的 `#RRGGBB` 个数**。选这个字段而不是"整个提示词对象里的十六进制"，因为 `prompt-copy.js:473` 实际拼进用户提示词的就是这一句：`"1. 配色只用这几个值：" + d.palette`。（普查过：整个 prompt 对象比 `dna.palette` 多出的 hex 只有 S25 一案多 1 个，量级不变。）

### 分布（实测）

```
palette.length 分布 : { "3": 5, "4": 25 }
台面色块数分布      : { "3": 5, "4": 25 }     ← 25 案真的给了 4 块
提示词 hex 数分布   : { "4": 10, "5": 3, "6": 6, "7": 11 }
```

### 精确对数

```
提示词 hex 数 > 台面色块数 : 22 / 30
  其中台面 4 块的 : 17 案
  其中台面 3 块的 :  5 案   （S17,S22,S27,S28,S30 —— 它们的 palette 只有 3 色，台面给满 3 块，但提示词仍多）
提示词 hex 数 == 台面色块数 : 8 / 30
```

不一致的 22 案与差额：

| 案 | palette | 台面 | 提示词 | 差额 |
| --- | --- | --- | --- | --- |
| S02 S03 S05 S06 S12 S14 S19 S23 S24 S26 | 4 | 4 | 7 | 3 |
| S08 S18 S25 S29 | 4 | 4 | 6 | 2 |
| S10 S16 S21 | 4 | 4 | 5 | 1 |
| S17 | 3 | 3 | 7 | 4 |
| S27 S30 | 3 | 3 | 6 | 3 |
| S22 S28 | 3 | 3 | 4 | 1 |

### 这是缺陷还是设计？

- 差额**不是抽错**：`check-twolines.mjs:13` 明写「`prompts.js` = `data.js` 的 4 色 + 从 `:root` 补的 0–4 个派生色 = **4–7 色**」，并把它作为**设计事实**写进闸门（`check-twolines.mjs` 的 R1–R5 明确**不查相等**，只查子集关系）。我实测 R1（`data.js ⊆ prompts.js`）：**30/30 成立，0 违规**。
- 差额**也没被 UI 承认**：`app.js:518` 硬 `slice(0,4)`，**没有任何 `+N` / "更多色" 的指示**（`grep` 该文件里 palette 相关的 `more|+N|超出|更多` = 0 命中）。用户看到的 4 块会被读成"这套配色就 4 个色"，而实际交付给 AI 的提示词是 5–7 个。

### 判定

- 「22 of 30 案台面给 4 个色块」：**不精确** —— 实测 **25 案**给 4 块，**5 案给 3 块**。
- 「提示词要 4–7 色」：**属实**（分布 `4:10 / 5:3 / 6:6 / 7:11`，全部落在 4–7）。
- 「22 案台面 4 块却提示词 4–7 色」：**数字巧合成立但归因错** —— 22 是"提示词色数 > 台面色块数"的案数（17 案台面 4 块 + 5 案台面 3 块），不是"台面 4 块的案数"（那是 25）。
- 真正的缺陷在于**台面与交付物之间的口径不透明**（`slice(0,4)` 静默截断且无 `+N`），而不在于"22 案"这个数字。

→ **判定：PARTLY TRUE。** 核心现象（色块数与提示词色数不一致、且不止 4 案）成立；具体数字与覆盖率归因错误。

---

## D4 — `templates/` 除 `check-docs.mjs` 的路径存在性检查外无任何闸门

### a) `prototypes/_build/` 里所有 `templates` 命中

`grep -rn templates prototypes/_build/` 共 **8 处，全部在 `check-docs.mjs`**，其余 23 个脚本命中数均为 **0**（`_entries.mjs`：0、`check-stale.mjs`：0、`check-anchors.mjs`：0、`check-texture.mjs`：0、`check-contract.mjs`：0、`verify-prototype.mjs`：0、`check-twolines.mjs`：0、`collect-schemes.mjs`：0 …）。

8 处逐条：

| 行 | 内容 | 实际作用 |
| --- | --- | --- |
| `:855` | 注释：`templates/M01` 这类相对写法… | 注释 |
| `:859` | `PREFIXES = ['prototypes/','templates/','deliverables/','tools/','index.html','LICENSE']` | 把 `templates/...` 纳入"文档路径是否存在"的白名单前缀 |
| `:881` | 注释：`templates/M01` → `templates/M01-clean-corporate/` | 注释 |
| `:905` | 注释：模板编号存在性 | 注释 |
| `:907` | `for (const m of src.matchAll(/templates\/(M\d{2})/g))` | 扫 README 里出现的模板编号 |
| `:908` | `readdirSync(join(REAL_ROOT,'templates')).filter(d=>d.startsWith(m[1]))` | 看该编号目录是否存在 |
| `:911-912` | `fail('paths/templates', …)` / `pass(…)` | **唯一的动作：目录存在性** |

即：**`check-docs.mjs` 对 `templates/` 只做两件事——文档里提到的路径存在、文档里提到的 M 编号有对应目录。** 它不打开 `templates/*/index.html`、不读 `style.css`、不跑渲染、不数 box-shadow、不查字体栈、不查 Emoji、不查远程资源。

### b) `templates/M01-clean-corporate/README.md` 的 box-shadow 主张 vs 实测

M01 README `:162`（豁免表 R-16/C-2.11 行）自述用了"一段很浅的两层阴影 `0 1px 2px` + `0 16px 30px -24px`"——这是**承认用了**，不是"零阴影"。

去注释后统计 `templates/*/style.css` 的 `box-shadow`：

```
M01-clean-corporate  total=3  real(non-none)=2
   "0 20px 32px -22px rgba(20,27,35,.45)"                          ← style.css:204  .nav-toggle:checked ~ .site-nav（移动下拉菜单）
   "0 1px 2px …, 0 16px 30px -24px …"                              ← style.css:284  .card
   （第三处是 style.css:560 的 box-shadow:none，桌面档重置）
M02-warm-local       total=0  real=0
M03-bold-creator     total=1  real=1
   "0 -5px 0 currentColor, 0 5px 0 currentColor"                   ← style.css:122  汉堡两条杠
```

根 `README.md:215` / `README-EN.md:216` 的告警：

> ⚠️ **`box-shadow` 0 其实没守住**：M01 有 3 处、M03 有 1 处（用 `box-shadow` 画汉堡两条杠）。
> **而 M01 自己的 `README.md` 就承认这是有意豁免**——两层文档对同一处声明给过相反结论。

### c) 是真矛盾，还是豁免？

**是豁免，而且根 README 已经把它标成"已知破例"。** 三层证据链：

1. 更早的 `README.md`@`68f949e:53` 确实声称模板层"`box-shadow` 0、`gradient` 0、`backdrop-filter` 0"——那是**过时且与 M01 实况相反**的说法。
2. `d27497d5`（2026-10-24）在 README 里加了那条 ⚠️ 告警，把"0"改成"没守住，M01 3 处 / M03 1 处"。
3. M01 自己的 `README.md:162` 与 `TOKENS.md:176` 都**明确写出**那两层阴影的值与用途（"可点性符号"），属于**逐条豁免 + 用途级理由**，不是隐瞒。

所以：**M01 的 README 与根 README 当前并不矛盾**（根 README 已承认破例）；矛盾只存在于"历史版本的根 README"与"M01 README 一直的写法"之间，且被发现并写进告警。

但**关键缺陷仍在**：这条告警是**手写散文，没有任何闸门复核它**。`templates/` 目录里：

- 三个模板目录**都没有 `.inspect/`**（`ls -a templates/*/ | grep inspect` 全空）→ 从未被渲染过、从未过运行时闸门。
- `verify-prototype.mjs --all` 的选择器是 `readdirSync(PROTO).filter(d=>/^S\d{2}-/)`（`:159-160`，`_entries.mjs` 的 `CASE_DIR_RE=/^S\d{2}-/`）→ **`templates/` 不在任何门的扫描范围**。
- `_entries.mjs` 的 `PRODUCTS` 只列了 `_selection`，没有 `templates/`。
- 唯一提到模板内容的 `check-docs.mjs` 只查路径存在。

### d) 判定

- 「`templates/` 只被 `check-docs.mjs` 的路径存在性检查覆盖」：**CONFIRMED**（`_build/` 里 8 处命中全在 `check-docs.mjs`，其中 4 处是注释、3 处是路径/编号存在性、1 处是 fail/pass 输出）。
- 「所以 README 的 box-shadow 说法与模板实况矛盾」：**不成立为"矛盾"** —— 当前 README 已改成"没守住"的告警，M01 README 也自认豁免。
- 但"**没有闸门能复核这条告警**"成立：模板层是**零渲染、零运行时校验**的一层。

→ **判定：CONFIRMED（就"无闸门覆盖"这一主张）。** 但需修正一处：这不是"文档撒谎"，而是"文档说了实话、而没有任何机械机制能证明或证伪它"。

---

## 裁决表

| 声明 | 判定 | 关键证据 |
| --- | --- | --- |
| **D1** 规则 4 注释盲、只对 Emoji 剥注释、误报 S02 | **PARTLY TRUE**（机制全对，后果被低估） | `verify-prototype.mjs:76` 吃原始 `C`；`stripNonRendered` 唯一调用在 `:69`（Emoji）；S02 `style.css:55` 注释里的 `background-image` 确实被捕获（偏移在 `/* */` 内）。**但**规则 4 对真违规 0/30 命中（`}` 消耗 + `[^}]*` 不跨 `}`），`check-texture.mjs:49-63` 自述同族正则曾"报违规 0"；S02 入库时的真违规也没被它抓到 |
| **D2** README 称故意留 `body-size` FAIL，为假且从来为假 | **FALSE** | `README.md:393` 明文；`prototypes/_selection/.inspect/report.json` `findings` 只有 `no-footage` WARN、`FAIL 0`、`body.size=16`（`rules.mjs:106` 判 `size<15` 才 FAIL）；14 个历史入库版本 `body.size` 恒 16、`grep -c '"body-size"'` 恒 0。13px 只出现在未入库的 `deliverables/67-exec/_lab/*.json`（`at=2026-10-27`），且 `9d842c7` 同一次提交既改字号又换了报告——写进 README 时它已经不存在 |
| **D3** 22/30 案台面 4 色块 vs 提示词 4–7 色 | **PARTLY TRUE** | 实测台面 4 块 = **25 案**、3 块 = 5 案；提示词 hex 分布 `4:10 / 5:3 / 6:6 / 7:11`；"提示词色数 > 台面色块数" = **22 案**（17 案台面4 + 5 案台面3）。数字 22 对，但归因（"台面 4 块的那些案"）错。`app.js:518` 硬 `slice(0,4)` 且无 `+N` 提示 |
| **D4** `templates/` 除 `check-docs` 路径检查外无闸门 | **CONFIRMED** | `_build/` 里 `templates` 命中 8 处全在 `check-docs.mjs`（4 注释 + 3 路径/编号存在性 + 1 输出）；其余 23 个脚本 0 命中；`templates/*/` 无 `.inspect/`；`verify-prototype.mjs:159` 选择器只认 `S\d{2}-`；`_entries.mjs` PRODUCTS 只列 `_selection` |

---

## 单条最要紧的是哪一条

**D1。**

理由不是它最"新"，是**它把一个已经失效的检查伪装成了有效的检查**：

1. D2 的错误是"文档说了一句过期的话"。它的代价是**信任**——有人会去查、会发现对不上，可以靠人纠正。而且它指向的是一条**假 FAIL**（虚报），不会让坏页面通过。
2. D3 的错误是"UI 少显示了 1–3 个色块"。代价是**信息丢失**，但用户复制到提示词时拿到的是全的 5–7 色——**交付物是对的**，只是台面给人第一印象不完整。
3. D4 的错误是"`templates/` 整层没人管"。代价是**覆盖缺口**，但这一层自己写了 10 节 README、有 `TOKENS.md`、明确豁免清单，且 `README.md:215` 已经自曝了唯一的实况偏差（box-shadow）。它是**已知的、写下来的**缺口。

D1 不同，它是**假的安全感**：

- 规则 4 在 `verify-prototype.mjs` 里占着一个"契约 §9.2"的位置，`deliverables/39-critique-toolchain-repro.md:407` 还把它评为"19 条里实现得最干净的一条"。**这条评价本身就是被这条死规则骗出来的。**
- 它唯一的输出是假阳性（S02 的注释），而假阳性会训练人去**忽略**这条规则——于是当真有人把纹理挂回 `body` 上时，第 27 条、第 29 条案都不会报，而且没人会怀疑。
- 这个仓库已经在 `check-texture.mjs:49-63` 把**同一个正则缺陷**完整记录成"第一版前科"，并为此写了第三版状态机。也就是说**仓库知道这个坑，但只在一个脚本里填了它，另一个脚本里的同一条规则至今留在坑里。**
- 与 D4 叠加后更糟：`templates/` 连 `verify-prototype` 都跑不到，规则 4 对模板层的 body 背景图**连假阳性都不会给**——完全静默。

一句话：D2 让**人**读到假话；D1 让**机器**说假话，而人以为机器在看。

---

## D1 的"过严 / 过松"归属

**（c）两者都有，但在不同对象上，且方向相反。**

| 对象 | 行为 | 归类 |
| --- | --- | --- |
| 注释里的 `background-image`（S02 `style.css:55`） | 报违规 → 假阳性 | **过严** |
| 真实挂在 `body` 上的 `background-image`（S02 `caefdd9` 原版、任何 `html{…}` 之后接 `body{…}` 的写法） | 不报 → 漏报 | **过松** |
| `html, body { … }` 合并选择器 | 不报 | 过松 |
| `@media { body { … } }` | 不报 | 过松 |
| `body::before { … }`（契约**推荐**的做法） | 不报（正确） | 正确 |

30 案里 **25 案的 `body` 块紧接在 `html { … }` 之后**，这正好落进失明带——所以"过松"不是边缘情况，是**主要情况**。

净效果：**该响的时候不响（过松到死），不该响的时候响（过严到假阳性）。判据本身不成立，不是阈值调偏。**

