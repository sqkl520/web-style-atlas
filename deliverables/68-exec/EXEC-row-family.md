# EXEC — row-family 提到 16px / hairline @768 判定

日期：2026-10-29（本地 Asia/Shanghai）
执行 Agent：68-exec
工作目录：`D:\Web\style`

---

## 0. 一句话结论

**两个任务在开工时都已经被并发的另一个 Agent 改完了**，且改法与我独立复核后应做的结论一致。
我没有重复修改 `style.css`（避免与并发写入打架），改为**独立复核 + 补齐证据链**。
重渲染后 `body-size` 与 `hairline` 双双消失，**FAIL=0、WARN=1（no-footage）**。

---

## 1. 开工状态（硬性要求：先记 HEAD + sha256）

```
git rev-parse HEAD          = ce4ea78c0c603a1f1357f1282fc8537349a431ac
git status --porcelain       = 已有并发改动（见下）
```

### 1.1 `style.css` 的 sha256

| 时点 | sha256 | 说明 |
|---|---|---|
| **我进入时（开工快照）** | `CD2D6A075632FC63E1649545D85F52D80158324A10260D128A2A07133A771518` | 已含别人的 `.mast-fold`/`.mast-facts`/`.prompt-fill` 2px 改动 |
| 中途（别人继续改） | `6894C4A7…` → `1870678D…` → `991E2D6D…` | 期间被并发 Agent 多次改写 |
| **收工时** | `991E2D6DF0FF1541504FE8B3E88ADC6E1CADFC062D8B29C63C3C209CCD644923` | 已含 `.row-family` 16px |

`index.html` 收工时：`14B0A66EA3C9ACAEE7122C7BB1F7B9F51B4ADAD8FCB827AB1FF9D724E6948453`

> 说明：任务书要求「改前记 sha256」。我**没有做任何源码修改**（原因见 §3），
> 因此「改前」= 我进入时的快照 `CD2D6A07…`，「改后」= 并发 Agent 完成后的 `991E2D6D…`。
> 中间那几次 hash 变化全部来自并发 Agent，不是我。HEAD 从头到尾没变，未 commit。

### 1.2 开工时 `style.css` 已被别人改过

`git diff` 显示 57 insertions / 8 deletions，内容是：
- 文件头自述清单整段重写（7 条散文 → 可复算的「闸门账」）
- `.mast-kicker` → `.mast-label` 改名
- `.mast-fold` 1px → 2px、`.prompt-fill` 1px → 2px

按任务书「若发现 `style.css` 已被别人改，重读最新内容再改」，我**每一次动手前都重读了最新内容**，
并在多轮 hash 监控后确认文件静止（连续 30s 不变）才做最终测量。

---

## 2. 任务 1：`.row-family` 提到 16px

### 2.1 读到的原始规则（开工时，L450）

```css
.row-family {
  color: var(--ink-2);
  flex: 1 1 100%;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}
```

任务书要我确认的四件事，逐条回答：

| 问题 | 答案 |
|---|---|
| 当前 `font-size` 是什么 | **它自己没有 `font-size`** —— 继承 `.row-meta` 的 `var(--s-13)` = 13px。这正是根因：字号是"当初只显示 34 字时"定的，显示全文后没人回来改。 |
| `line-height` 是什么 | `1.5`（显式写在 `.row-family` 里，不继承） |
| 有没有 `-webkit-line-clamp` | 有，`-webkit-line-clamp: 2` + `display:-webkit-box` + `overflow:hidden` |
| 有没有 @media 覆盖它 | **没有**。全文只有 L506 一处 `.row-family {`，`@media` 块里没有任何覆盖（另 3 处提及都在注释里）。 |

### 2.2 我的独立 A/B（13 / 15 / 16px，同页切 `<style>`，不碰文件）

用仓库自己的 `probe.mjs` + `rules.mjs` 判据，不是自己抄一份：

```
=== 闸门 findings ===
1440  13px → F:body-size  W:no-footage W:measure
1440  15px → W:body-size  W:no-footage W:measure     ← 15px 消掉 FAIL，但留下 WARN
1440  16px → W:no-footage                            ← 只剩 no-footage（与本改动无关）
 768  13px → F:body-size  W:measure
 768  15px → W:body-size                             ← 同上，768 不是 mobile(600)，WARN 生效
 768  16px → clean
 390  13px → F:body-size
 390  15px → clean                                   ← 390 是 mobile，body-size WARN 被 width<600 豁免
 390  16px → clean
```

**这推翻了任务书里"15px 是可接受选项"的推测的一半，并证实了另一半。**
15px 确实消掉了 FAIL（`< 15` 为 false），但**在 1440 与 768 两档都会留下 `WARN:body-size`**
（`else if (size < 16 && !mobile)`，而 `mobile = width < 600`，768 不算 mobile）。
390 档因为 `mobile=true` 才碰巧干净。

所以「15px 就能同时消掉 FAIL 和 WARN」**不成立** —— 只有 16px 能在三档全清。**用数据选定 16px。**

### 2.3 基线复核（16px 现状 vs 13px 强制回退）

同页 A/B，`forced13` 是我注入 `!important` 把 `.row-family` 压回 13px 作对照：

| 视口 | 指标 | 16px（现状） | 13px（对照） | Δ | 任务书基线 | 判定 |
|---|---|---|---|---|---|---|
| 1440×900 | 首卡 top | 430.5 | 430.5 | **0** | ≈407 † | 见 §2.5 |
| 1440×900 | 首卡高 | 276.8 | 276.8 | **0** | ≈277 | PASS |
| 1440×900 | 首屏完整卡 | 1 | 1 | 0 | =1 | PASS |
| 1440×900 | h1 | 74px | 74px | 0 | 74 | PASS |
| 1440×900 | rail | 900 | 900 | 0 | 900 | PASS |
| 390×844 | 首卡 top | 402.4 | 402.4 | **0** | ≈402 | PASS |
| 390×844 | 首卡高 | 389.3 | 382.0 | **+7.3** | ≈390 | PASS |
| 390×844 | 详情 scrollH | 2406 | 2406 | 0 | 2301–2690 | PASS |
| 768×1024 | 首卡高 | 506.3 | 498.9 | +7.4 | — | — |
| 三档 | 横向溢出 | 0 | 0 | 0 | =0 | PASS |
| 三档 | `font-size` < 13px 声明数 | 0 | 0 | 0 | =0 | PASS |

**五种排序 × 首屏完整卡（16px 现状）**

```
=== 1440×900 ===
  排序    | 首卡 id | top     | h      | 完整
  n      | S01    | 430.5   | 276.8  | 1
  fr     | S01    | 430.5   | 276.8  | 1
  thr    | S01    | 430.5   | 276.8  | 1
  gate   | S13    | 430.5   | 276.8  | 1
  built  | S01    | 430.5   | 276.8  | 1

=== 768×1024 ===
  n/fr/thr/built | S01 | 442.9 | 506.3 | 1     gate | S13 | 442.9 | 527.3 | 1

=== 390×844 ===
  n/fr/thr/built | S01 | 402.4 | 389.3 | 1     gate | S13 | 402.4 | 431.2 | 1
```

**五档排序 × 三档视口，首屏完整卡全部 = 1。首卡 top 在 13px/16px 之间 Δ0。**

### 2.4 `line-clamp: 2` 在 16px 下是否还成立

成立，且**三档一致**（30/30 案全部恰好 2 行、全部处于截断态）：

| 字号 | `clientH` | 每行 | 行数直方图 | 截断数 |
|---|---|---|---|---|
| 13px | 39 | 19.5 | `{2: 30}` | 30/30 |
| 15px | 45 | 22.5 | `{2: 30}` | 30/30 |
| **16px** | **46** | **23.2** | **`{2: 30}`** | **30/30** |

每行字数变少是必然的（390 档约 46 → 约 38 字），但 `-webkit-line-clamp` 的省略号行为不受影响：
`scrollHeight`（162–282）远大于 `clientHeight`（46），浏览器照常渲染 `…`。
**没有出现"行数从 2 掉到 1"或"clamp 失效"的情况。**

### 2.5 ⚠️ 一份必须说清的偏差：1440 首卡 top 是 430.5，不是 407

这不是我的改动造成的，也不是 `.row-family` 造成的。归因实验（同页三态）：

```
[A 现状]              首卡 top=430.5   mast=346.6  (#self-gate 19.5px 可见)
[B 隐藏 #self-gate]   首卡 top=407.0   mast=323.1  (#self-gate 0)
[C B + 强制 13px]     首卡 top=407.0   mast=323.1
```

- **B → C：13px 与 16px 的首卡 top 完全相同（407.0）。** 所以 `.row-family` 对 top 的贡献是 **0**。
- **A → B：430.5 − 407.0 = 23.5px，全部来自并发 Agent 新加的 `#self-gate` 一行**（`<p class="self-gate">`，19.5 + 4 边距）。
- 隐藏它之后，top 精确落回 **407.0**，与任务书给的基线 **完全一致**。

所以任务书基线 `top ≈407` 是**正确的**，它对应的是「没有 `#self-gate` 那一行」的页头。
当前 430.5 的偏差 100% 由并发 Agent 在同一时段加入的 `#self-gate` 引入，**与任务 1/2 无关**。
`#self-gate` 的内容是「本页自身：闸门 0 条 FAIL、1 条 WARN —— 报告时间 2026-10-28。」，
是并发 Agent 在做的另一件事（把本页自身的闸门结果摊到页面上）。我没有动它，也没有权力动它。

**完整卡仍然 = 1**（430.5 + 276.8 = 707.3 < 900），所以这条偏差没有造成任何功能退化。

---

## 3. 我为什么没有修改 `style.css`（关键偏离，必须说明）

任务书授权我改 `.row-family` 相关规则。但我进入时实测发现：

1. `.row-family` **已经是** `font-size: var(--s-16); line-height: 1.45;`（L506–515），
   连同 620 档三条补偿规则（`.row padding 5px`、`.row-meta margin-top 4px`、缩略图 152px）都已就位；
2. `.mast-fold`（L1157）与 `.mast-facts`（L1175）**都已经是 2px**，`hairline` 三档实测 `hairlines = 0`；
3. `style.css` 在我开工的 20 分钟内 hash 变了 4 次（`CD2D6A07` → `6894C4A7` → `1870678D` → `991E2D6D`），
   且 `index.html` 一度被别的进程独占锁住（`The process cannot access the file ... being used by another process`）。

**在这种状态下再写一遍同样的规则，只会做无用功，并有覆盖掉并发 Agent 正在写的补偿规则的真实风险**（两份改动写同一段 CSS，后写的赢，前一份的注释与实测数据会变成谎言——这个文件历史上正是这么腐化的，见文件头自述）。
所以我的处置是：**不重复修改，改为独立复核结论 + 补齐证据链**。
如果 lead 要求"必须有一份我签名的写入"，请明确告知，我可以在文件静止时再执行（但那是纯重复，不改变任何计算值）。

---

## 4. 任务 2：`hairline` @768 判定

### 4.1 状态

开工时已是 2px（并发 Agent 改的）。重渲染后三档 `hairlines` 全为 **0**，`hairline` finding 已消失。

### 4.2 我的独立判定：这两条线**不该删，也不该保留 1px**，2px 是正确解

**（a）`<dl id="facts">` 算不算规则说的 "real tables"？—— 不算，而且这个问法本身是陷阱。**

我从源码读的判据（`probe.mjs:309`）：

```js
const formish = (el) => el.matches('input, textarea, select, table, thead, tbody, tr, td, th, hr')
  || !!el.closest('table, [data-ui]');
```

`dl` / `dt` / `dd` **不在白名单里**，`#facts` 也不在任何 `<table>` 或 `[data-ui]` 内部。
所以按运行时探针，`<dl>` **不享受 "real tables" 豁免**——它和 `<div>` 一视同仁。
（`rules.mjs` 里对 hairline 的说明文字是给人的判据，探针是给机器的判据，二者在这一点上一致：
只有真表格的表意标签才算。）

**结论：不能靠"`<dl>` 是定义列表所以算表格"来豁免它。** 这条路是走不通的——
即便语义上 `dl` 是"名称/值对"，它在这里排的是四个 KPI 读数（方案总数 / 已建原型 / 闸门 FAIL=0 / 截图总数），
视觉上是一个**统计条**，不是表格行，也没有列对齐的表头。把它论证成表格是自欺。

**（b）那这两条线本身该不该存在？—— 该，但必须是"分节线"而不是"细线"。**

规则的原文是 "Separate with space, a tone change, or scale. **Lines are only for real tables and form fields.**"
它禁的是**用 1px 细线做装饰**，不是禁"分节"。这个页面里页头已经有一条 `border-bottom: 2px solid var(--ink)`（`.mast`），
全文其它分节线（`.fold` / `.parts` / `.rail-sep` / `.row` / `.bar` / `.mast-facts > div`）**本来就是 2px**。

- `#mast-fold` 的 `border-top`：分「页头主体」与「折叠起来的 claim/exit」。**是分节，不是列表行。**
- `#facts` 的 `border-top`：分「向导按钮」与「四个读数」。**是分节，不是列表行。**

两条 1px 线既不是表格行、也不是字段行，正好落在规则禁止的那一类里 —— 所以它们**判 FAIL 判得对**。
改成 2px 之后，它们与 `.mast` 那条 `border-bottom: 2px` 同一口径，从"装饰性细线"变成"结构性分节线"，
**与页头那条 2px 是呼应、不是冲突**（同粗、同色系，只是 `#facts` 用 `var(--ink)`、`#mast-fold` 用 `var(--rule)`）。

**（c）会不会破坏设计？** 实测代价（并发 Agent 的补偿）：`#mast-fold` 的 +1px 由 `margin-top 8→6` 抵消（Δ0）；
`#facts` 的 +1px 无 margin 可抵，390 档净 +1px。我的复核：390 首卡 top **402.4 未变**，首屏完整卡 **1**。
**代价确实为零。**

**（d）为什么不删掉？** 删掉会让「页头主体 / claim-exit」「向导 / 读数」两组内容直接贴在一起。
规则给的第三种替代是 "a tone change"（换底色）——但页头已经有 `--ground` / `--card` 两层，
再加一层会让页头变成三种底色，比一道 2px 线更吵。**2px 是这个页面里最省的解法。**

---

## 5. 重渲染与四个验证器

```
node prototypes/_build/render-scheme.mjs _selection
```

**重渲染结果（exit 0）：**

```
[desktop 1440x900] 页高 8816  字 1480  真图 30  横向溢出 0  字号 7 档  hero 74px/1 行
[tablet  768x1024] 页高 15272 字 1360  真图 30  横向溢出 0  字号 6 档  hero 39.9px/2 行
[mobile  390x844]  页高 11564 字 1360  真图 30  横向溢出 0  字号 6 档  hero 26px/1 行

发现：
  [WARN] no-footage @1440  No video anywhere on the page.
合计 FAIL=0  WARN=1
已写 prototypes/_selection/self-gate.js（本页自身 0 条 FAIL / 1 条 WARN）
```

**新的 `report.json`（at = 2026-10-28T16:08:46.825Z，我那次重渲染是 16:02:53，之后并发又重渲染过一次，结论一致）：**

```
finding 列表：仅 [WARN] no-footage @1440
每档 body：1440 → 16px/1.45   768 → 16px/1.45   390 → 16px/1.45
每档 hairlines：1440 = 0   768 = 0   390 = 0
```

- ✅ `body-size` **消失**（不再是 FAIL，也不再是 WARN）
- ✅ `hairline` **消失**（三档 hairlines 全 0）

### 四个验证器的 exit code

| 命令 | exit | 输出 |
|---|---|---|
| `node prototypes/_build/verify-prototype.mjs --all` | **1** | `达标 26 / 不达标 4 / 共 30` ✅ 与期望一致 |
| `node prototypes/_build/check-stale.mjs` | **0** | `✓ 全部新鲜` ✅ |
| `node prototypes/_build/check-anchors.mjs` | **0** | `✓ 无死锚点` ✅ |
| `node prototypes/_build/check-docs.mjs` | **0** | `README.md: 0 FAIL / 0 WARN / 13 PASS` ✅ |

`verify-prototype` 的 exit 1 来自 S07 / S08 / S13 / S21 四案的历史 FAIL（mono、palette-terracotta、font-count、empty-screens），
与 `_selection` 无关（它不在该脚本扫描范围内），26/4/30 与任务书期望一致。

`check-stale` 在我改完之前**确实报了 stale**（`index.html 落后 2 分钟`），原因是并发 Agent 刚改过 `index.html`；
按任务书说明这属预期，重渲染后转绿（exit 0）。**不是 bug。**

---

## 6. 我拒绝执行的步骤 / 与任务书不符的地方

1. **拒绝了「修改 `.row-family`」这个动作本身**（任务 1 的核心指令）。
   理由：进入时它已经是 16px，且 620 档三条补偿规则也已就位；再写一遍是纯重复，
   并会在并发写入下制造两份互相覆盖的 CSS。见 §3。
   **我改为做独立复核，并证明「16px 是正确的」**（含推翻 15px 备选的数据）。

2. **拒绝了「保留 15px 作为可接受选项」这个推测**。
   任务书说「如果 15px 就能同时消掉 FAIL 和 WARN，那也是可接受的选项」。
   实测：15px 在 **1440 与 768 两档仍报 `WARN:body-size`**（因为 `mobile = width < 600`，768 不算 mobile）。
   只有 16px 三档全清。**这条推测不成立，我按数据否决了它。**

3. **未能提交「我签名的 diff」**。本轮 `style.css` 的全部变更都来自并发 Agent。
   我这一轮的产出是**证据与判定**，不是代码行。若 lead 需要我在文件静止时写入一份等价改动，请下指令。

4. **任务书基线「1440 首卡 top ≈407」与实测 430.5 差 23.5px**。
   已归因：100% 来自并发 Agent 新增的 `#self-gate`（隐藏它后 top 精确回到 407.0）。
   我没有为了让数字对上而去动别人的 `#self-gate` —— 那是越界。

5. **一处小坑记录**：任务书提醒「`Browser.launch({width,height})` 不切换视口，必须 `page.setViewport`」——
   属实。我每个页面都显式调了 `setViewport`。**另有一个任务书没提到的坑**：
   `document.fonts.ready` 之后仍需要 ~900ms 让布局稳定，早测会让 `completeCards` 偶发读到 0（我复现过一次，
   加 2.5s 静置后稳定为 1）。这是测量噪声，不是回归。

---

## 7. 复现命令

```powershell
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
cd D:\Web\style

# 13/15/16px 三档 × 三视口，闸门判据 + 基线 + clamp 检查（约 3 分钟）
D:\Nodejs\node.exe deliverables/68-exec/rf-decide.mjs

# 16px vs 强制 13px 的同页 A/B（净 delta）
D:\Nodejs\node.exe deliverables/68-exec/rf-verify.mjs
D:\Nodejs\node.exe deliverables/68-exec/rf-summary.mjs

# 首卡 top 偏差归因（#self-gate vs row-family）
D:\Nodejs\node.exe deliverables/68-exec/rf-final-attrib.mjs

# 稳定性复测（连开 3 次）
D:\Nodejs\node.exe deliverables/68-exec/rf-stable.mjs
```

产出 JSON：`rf-decide.json`（三档决策）、`rf-verify.json`（16/13 A/B）、`rf-attrib.json`、`rf-diag.txt`。

---

## 8. 一句话给 lead

**`.row-family` 16px 与两条 hairline 2px 都已在文件里并经过我独立复核：三档 `body-size`/`hairline` 全清，
五档排序 × 三视口首屏完整卡全 = 1，首卡 top 对 `.row-family` 的敏感度为 0，四个验证器全部符合期望。
1440 首卡 top 从 407 变 430.5 的 23.5px 全部来自并发 Agent 新增的 `#self-gate`，与本轮两个任务无关。**
