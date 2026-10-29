# 闸门 FAIL 定性审计（69）

- 审计时间：2026-10-29 02:27–03:05 (+08:00)
- 仓库基线：`git rev-parse HEAD` = **`9d842c7ae58e9772b965a37d118c69726ea1dfbd`**
- 开工时 `git status --porcelain`（受跟踪区域 `prototypes/ templates/ README* tools/`）：**无改动**
- 收工时复查：HEAD 未变、受跟踪区域仍无改动 ⇒ 本报告的全部读数对应同一个修订
- 本审计**只读**：`prototypes/`、`templates/`、`README*`、`tools/` 一个字节都没动。
  所有实验都在 `deliverables/69-audit/exp*/` 的**副本**上做（副本自带 `_fonts/`，否则 `../_fonts/` 404 → 字体回落 → `isMono` 误判，见 §7 坑 3）。

---

## 0 结论摘要（先看这 5 条）

1. **不是 8 条，是 6 条。** 当前全库 FAIL = 6，落在 4 案：`S07 mono`、`S08 palette-terracotta + font-count`、`S13 mono + empty-screens`、`S21 mono`。
   `verify-prototype.mjs --all` 的 `达标 26 / 不达标 4 / 共 30` 这个**汇总数是对的**，但它底下挂的明细**过期了**。
2. **Lead 记忆正确，用户数字过期，README 也过期。** S13 的 `shadow` 与 `button-fx` 是在 **`1753f94`（2026-10-27 20:16:40）** 清掉的，不是更早、也不是"记错了"。README 中英两版至今仍写 8 条 / 仍写"shadow（17 处）+ button-fx 真的未清"。
3. **`mono` 三条全部可以零像素代价清掉**，而且**不需要放弃等宽字体**。实测：把等宽文本包进 `<code>` + 一条 `code{font-family:inherit}`，三案 15 张截图**逐字节相同**，S07/S21 的 `mono` FAIL 直接归零、S13 的 `mono` 也归零。代价是改标记，不是改设计。
4. **`empty-screens` 是可修正的度量错配，不是"大留白设计"。** S13 正文 `max-width:480px`（规格写的"32 汉字"），却排在 897px 宽的栏里；把 `max-width` 放到 **640px**，`empty-screens` 与 `mono` 双双消失，`RESULT: 0 FAIL`。规格写的是"行长 32 汉字"，不是"每屏必须有 80% 空白"。
5. **文档腐化 5 处（C1–C5），全部是"把已清的写成未清"或"把 6 写成 8"**：README 中英两版的 8 条清单（`:160`、`:419`/`:423`、`:550`/`:554`）、README 的"shadow 与 button-fx 真的未清"（`:422`/`:426`）、以及 `_CONTRACT.md:110` 的"现行欠款"。
   **`check-docs.mjs` 抓不到这些**——它的 `status/fixed-claims` 只匹配"已知未修/known unfixed"等关键词，而 README 写的是"没有豁免记录""真的未清"，一个字都不匹配（§5.3）。

---

## 1 任务 1 复核：真实当前状态

### 1.1 `verify-prototype.mjs --all` 原文（剥离逐案行，只留不达标）

```
✗ S07 … 闸门 FAIL=1：mono
✗ S08 … 闸门 FAIL=2：palette-terracotta font-count
✗ S13 … 闸门 FAIL=2：mono empty-screens
✗ S21 … 闸门 FAIL=1：mono

达标 26 / 不达标 4 / 共 30      [exit 1]
```

完整输出落盘：`_verify-all.txt`。

### 1.2 逐条完整 message（不是只有 id）

`report.json` 的 `findings[].message` 原文，四案逐字照抄：

| 案 | 规则 | message（原文） |
|---|---|---|
| S07 | `mono` | `Monospace type outside code: IBM Plex Mono — e.g. "46", "2026-02", "118", "G-4"` |
| S08 | `palette-terracotta` | `Terracotta / rust-orange accent (button #c46a1f).` |
| S08 | `font-count` | `4 typefaces in use (Source Serif 4, Noto Serif SC, Overprint Numerals, Gloock).` |
| S13 | `mono` | `Monospace type outside code: DM Mono — e.g. "0.4mm", "0.4mm", "0.4mm", "0.4mm"` |
| S13 | `empty-screens` | `3 of 6 desktop screens are almost empty ground (under 20% of the screen holds text, a picture or a colour field): screens 3, 5, 6.` |
| S21 | `mono` | `Monospace type outside code: IBM Plex Mono — e.g. "22:04", "22:00", "23:00", "23:00"` |

四份 `report.json` 的 `allow` 字段**全是 `[]`** —— 即入库产物是用**没有**申诉的命令渲染的，没有靠 `--allow` 换清白。

### 1.3 `shadow` / `button-fx` 是什么时候清的

```
$ git log --format='%h %ci %s' -- prototypes/S13-blind-debossed-dispatch/style.css
1753f94 2026-10-27 20:16:40 +0800  修 6 个「界面在说谎」的地方…
e935882 2026-10-21 23:13:30 +0800  修选型台四条…+ S13 级联缺陷 + S21 素材接线
…
```

`1753f94` 的提交说明原文：

> **S13 的 shadow + button-fx 清零（FAIL 4 → 2，全库 FAIL 8 → 6）**
> 凹（`--press-1`/`--press-3` 的混合式第二段）改 inset…… 凸（`--press-2`，铅字按钮与烫金击凸块）拒绝改 inset…… 改用 CONTRACT §9.3 认可的 `filter: drop-shadow`
> 附带发现：`button-fx` 的判据是 `boxShadow !== 'none'`，inset 也算 …… 另发现 `taste-skill-ignore` 注释对闸门完全无效（只有 `lint.mjs` 读它，`probe.mjs` 一个字不看）

**怎么清的**（对得上 `style.css` 现状）：

- 凹槽：`inset … , 外投影 …` 的混合式 → 纯 `inset`（`style.css:132` `--press-1`、`:135` `--press-3`）
- 凸起：`--press-2` 撤销 → `filter: drop-shadow()`（`style.css:165-166` `--lift-2` / `--lift-2-hover`）
- 按钮：`box-shadow: none` + `filter: var(--lift-2)`（`:426`、`:454`、`:484`）

**今天仍然成立**：S13 里还有 24 处 `box-shadow`，但每一处都是 `inset`（或 `none`），**非 inset 段为 0**。
`probe.mjs:318` 的判据是 `sh.split(...).some(part => !/inset/.test(part) && …)`，所以 `shadow` 不触发。这不是"藏起来"，凹槽本质就是 inset。

### 1.4 报告新鲜度（防止拿旧报告下结论）

| 案 | report.json `at` | style.css mtime | 报告比 CSS 新？ |
|---|---|---|---|
| S07 | 2026-10-24T08:29Z | 2026-10-24 16:27 | ✅ |
| S08 | 2026-10-23T19:03Z | 2026-10-18 03:43 | ✅ |
| S13 | 2026-10-27T11:37Z | 2026-10-27 19:12 | ✅ |
| S21 | 2026-10-23T19:04Z | 2026-10-21 21:20 | ✅ |

四份报告都不比源文件旧。**并且我另跑了一遍真闸门复核**（输出在 `inspect-S07/`、`inspect-S08/`、`inspect-S13/`、`inspect-S21/`），逐字复现 6 条 FAIL，与入库报告一致 ⇒ 读数可信，不是陈旧数据。

---

## 2 判定表（核心产出）

判定口径：**规则原文**取自 `tools/taste-skill/…/lib/rules.mjs`；**证据**一律给文件行号 + 实测读数 + 截图。

| # | 案 | 规则 | message 原文 | 判定 | 证据 | 建议处置 | 成本 |
|---|---|---|---|---|---|---|---|
| 1 | S07 | `mono` | `Monospace type outside code: IBM Plex Mono — e.g. "46", "2026-02", "118", "G-4"` | **设计意图**（规格字段 4 指派）＋**可零代价合规** | `_specs/S07.md:21` 字段 4：「辅助数字＝IBM Plex Mono（OFL 1.1，排页码、期号与分类编号）」。实测刚文 103 处、327 字符，**`<code>` 里 0**。规则原文 `rules.mjs:54-56`。截图 `shots/` 见 §5 | **修**（改标记，不改字体） | 104 处标记 + 1 条 CSS；实测 **0 FAIL / 像素逐字节不变** |
| 2 | S08 | `palette-terracotta` | `Terracotta / rust-orange accent (button #c46a1f).` | **已知豁免且已记录** | `_CONTRACT.md:201` 有专门一行（Lead 2026-10-24 补登记）；`_specs/S08.md:19` 字段 3 钉死 `#C46A1F` 承担板体与油墨 24%；`_CURRENT-VALUES.md:42` 同值。判定器 `rules.mjs:12` + `:91` | **豁免并记录**（已有记录，只需补"逐案批准记录"载体） | 文档 2 行 |
| 3 | S08 | `font-count` | `4 typefaces in use (Source Serif 4, Noto Serif SC, Overprint Numerals, Gloock).` | **规则不适用**（工具按 2 族，本语料有结构性下限）＋**已记录** | `_CONTRACT.md:117` 裁决补写：「展示体单列一槽时 4 族可接受」；`_specs/S08.md:23` 四角色（Gloock / Source Serif 4 / IBM Plex Mono / 京华老宋体）。判定器 `rules.mjs:100-102`（`realFams.length > 3` 即 FAIL） | **豁免并记录**（记录已在 §6 表，缺逐案载体） | 文档 1 行 |
| 4 | S13 | `mono` | `Monospace type outside code: DM Mono — e.g. "0.4mm", "0.4mm", "0.4mm", "0.4mm"` | **设计意图**（规格字段 4/6 指派）＋**可零代价合规** | `_specs/S13.md` 字段 4：「辅助数字与函号用 `DM Mono`」；实测 `style.css:43` `--font-figure: "DM Mono"`，`:102-103` `.mono,.depth`。实测等宽刚文 147 字符 / 29 元素 | **修**（改标记，不改字体） | 30 处标记 + 1 条 CSS；实测 **0 FAIL / 5 屏像素逐字节不变** |
| 5 | S13 | `empty-screens` | `3 of 6 desktop screens are almost empty ground (under 20% of the screen holds text, a picture or a colour field): screens 3, 5, 6.` | **真缺陷**（度量错配，不是"大留白设计"） | 实测：正文 `max-width:480px`（= 规格的 32 汉字 × 15px），栏宽 897px（= 11 栏，逐位吻合）⇒ 正文只占栏宽 **53.5%**，正文右缘 x=544、签发栏起于 x=1060，中间 516px 永久空着。填充率 `[0.55,0.22,0.14,0.30,0.14,0.17]`。改 `max-width:640px` → `RESULT: 0 FAIL`（§4.2） | **修**（`max-width` 480 → 640px，一行） | 1 行 CSS；实测 **0 FAIL**，页高 4701→4622 |
| 6 | S21 | `mono` | `Monospace type outside code: IBM Plex Mono — e.g. "22:04", "22:00", "23:00", "23:00"` | **设计意图**（规格字段 4 指派）＋**可零代价合规** | `_specs/S21.md` 字段 4：「辅助数字用 `IBM Plex Mono`（道岔号、锁别号与时刻**必须逐位对齐**）」，并写明"值班表上认错数字等于事故"。实测 `style.css:140` `.face-data`，83 处 | **修**（改标记，不改字体） | 83 处标记 + 1 条 CSS；实测 **0 FAIL / 像素逐字节不变** |

**统计：真缺陷 1 条；设计意图 3 条（且全部可零代价合规）；规则不适用 1 条；已知豁免且已记录 1 条。**
没有一条属于「已知豁免但无记录」。

---

## 3 `mono` 专章（3 条，判定的重点）

### 3.1 规则原文（`rules.mjs:54-57`）

```js
if (m.type.monoProseShare > 0) {
  add('FAIL', 'mono', `Monospace type outside code: ${m.type.monoFamilies.join(', ')} — e.g. …`,
    'Set it in the text face. Monospace is for literal code inside <pre>/<code> only.');
}
```

判据链（`probe.mjs`）：

- `:216-219` —— 逐个文本节点，`isMono(t.ff)` 为真就累加；**只有当 `t.inCode`（`el.closest('pre, code, kbd, samp, textarea')`）为假时**才计入 `monoProse`
- `:86` —— `inCode` 的定义就是 `!!el.closest('pre, code, kbd, samp, textarea')`
- `:449` —— `monoProseShare: round(monoProse / totalChars)`

⇒ **规则本身并不禁止等宽字体，它禁止的是"等宽落在 `<code>/<pre>` 之外"。** 这是本次审计最关键的一句。

### 3.2 三个案为什么用等宽（都不是装饰）

| 案 | 规格原文 | 等宽承载什么 | 为什么必需 |
|---|---|---|---|
| S07 铅灰油墨目录 | `_specs/S07.md:21`「辅助数字＝IBM Plex Mono……排页码、期号与分类编号」 | 页码 118/44/201…、分类号 G-4/B-1…、日期 | 报纸目录的**页码与分类号要竖向对齐**；比例数字会左右抖 |
| S13 盲压公函 | `_specs/S13.md` 字段 4「辅助数字与函号用 `DM Mono`」 | `0.4mm` 压深、`3.0%` 亮度差、`4.62:1` 对比度 | 这些是**实测工艺参数**，公文里作为证据列出，必须等宽对齐才读得出量级 |
| S21 装订册／联锁释放簿 | `_specs/S21.md` 字段 4「辅助数字用 `IBM Plex Mono`（……**必须逐位对齐**）」＋"值班表上认错数字等于事故" | 时刻 22:04、锁别号、道岔号 | 时刻列与锁号列**逐位对齐**是安全语义，不是排版偏好 |

### 3.3 清 `mono` 要不要改设计？——**不用**

`_CONTRACT.md:197` 的处理栏写「保留等宽槽；报告原始 FAIL 并说明」，隐含假设是"清它 = 改设计"。**这个假设是错的。**

实测（`exp2/`、`exp3/`，全部在副本上做）：

| 案 | 改法 | 改动量 | 闸门结果 | 像素 |
|---|---|---|---|---|
| S13 | `<span class="depth/mono">` → `<code>`；`<td class="mono">` 内加 `<code>`；CSS 追加 `code{font-family:inherit}` | 30 处 + 1 条 | **`mono` 消失**，`RESULT: 1 FAIL`（只剩 empty-screens） | **5 / 5 屏逐字节相同** |
| S21 | `<span/td/dd/th class="face-data">` → 包 `<code>` + 同上 CSS | 83 处 + 1 条 | **`RESULT: 0 FAIL`**（measurements pass） | **5 / 5 屏逐字节相同** |
| S07 | `.p/.k/.code` 的 span、`<dd>` 数值、`.folio` 页码 → 包 `<code>` + 同上 CSS | 104 处 + 1 条 | **`RESULT: 0 FAIL`** | **5 / 5 屏逐字节相同** |

S13 的几何证据：包 `<code>` 前后 **29 个等宽元素坐标/尺寸/字号/行高 0 处差异**，页面总高 4701px 不变（`p17-geom-diff.mjs`）。
S13 的 `monoProse`：**147 → 0**（`exp2-result.json`）。

**为什么能零代价**：`<code>` 只带来两样东西——UA 的 `font-family:monospace`（用 `code{font-family:inherit}` 抵消）与 `font-size:0.85em` 之类的默认值（本案无影响，且实测几何无差）。它不改变字体、不改变排版、不改变语义，只把"这是数据/编号"这件事写进标记。
**这不叫钻空子**：`<code>` 在这里是**语义正确的标记**（页码、时刻、分类号、实测值都是机器可读的 datum），规则要求"等宽只用于 code"，而这三案的等宽本来就**只用在 datum 上**。改用 `<code>` 是把实现说到做到，不是讨好闸门。

> ⚠️ **必须警告的一点**：`deliverables/66-plan/REDTEAM-round6.md:396` 与 `62-plan/PLAN-three-tasks.md:288` 都写着「`mono` 是 4 条里唯一可修的，改法是**放弃等宽**」。**这个结论是错的。** 放弃等宽会让 S21 的时刻列失去逐位对齐（安全语义）、让 S13 的工艺参数失去量级可比性。正确改法是**换标记**，不是换字体。

### 3.4 §9.15 的前提被证伪

`_CONTRACT.md:197` 说 `mono` 在本语料上「必然触发」，理由是「30 案的字段 4 都规定了辅助数字用等宽字族……这些都在 `<code>` 之外」。

实测反证（`p07-mono-premise.mjs` + `p24-incode-tags.mjs`，30 案全量）：

```
把等宽放进 inCode 语义标签（<code>/<samp>/<kbd>/<pre>）的案：26 案，合计 3048 个标签，平均 117 个/案
  （其中 S03 用的是 <samp> ×59，不是 <code>；其余 25 案用 <code>）

一个 inCode 语义标签都没有的案，全库只有 4 个：
  S07  monoShare=0.14  monoProse=0.14   ← FAIL
  S13  monoShare=0.06  monoProse=0.06   ← FAIL
  S21  monoShare=0.09  monoProse=0.09   ← FAIL
  S25  monoShare=0     monoProse=0      ← 根本没用等宽，自然不触发
```

**这是一个近乎完美的相关：`mono` 的三个 FAIL 案，正是全库仅有的三个「用等宽但一个 inCode 语义标签都没有」的案。** 第四个（S25）不用等宽。
29 案用了等宽字体，26 案做到 `monoProseShare = 0`——靠的不是"不用等宽"，而是把 datum 放进 `<code>`/`<samp>`。

⇒ §9.15 的第一行把「这三案的做法问题」误记成了「语料的语言问题」。**这一行应当改写。**
连带影响：`_CONTRACT.md:198` 的 `font-count` 行也偏保守，但它的"3 族可接受 / 4 族可接受"结论仍然成立（见 #3）。

---

## 4 `empty-screens` 专章（S13）

### 4.1 规则原文（`inspect.mjs:152`）

```js
if (w >= 1100 && empty.length >= 2 && !allow.includes('empty-screens'))
  findings.push({ level:'FAIL', id:'empty-screens',
    message: `${empty.length} of ${frameChecks.length} desktop screens are almost empty ground
              (under 20% of the screen holds text, a picture or a colour field): screens …`,
```

判据（`probe.mjs:537-548`）：把视口切成 **24×15 = 360 个采样点**，每点依次问「有没有文字矩形 / 有没有媒体 / 有没有与页面底色不同的色块」，三者皆无即 `bare`。`filled < 0.2` 判为一屏"几乎空"。

### 4.2 是设计留白还是内容不足？——**都不是，是度量错配**

S13 的规格确实要求大量留白（`_specs/S13.md` 字段 5：「条款之间空 2 个基线单位，函件与附件之间空 6 个基线单位」「正文只占 1–11 栏」「第 12–16 栏本来就是让给右侧签发栏的空白」）。所以第一反应是"规则与该案设计主张冲突"。

**但实测把这个解释推翻了：**

```
正文 <p> 实测：x=64, width=480px, max-width=480px, font-size=15px, 行长实测 480px（= 32 汉字）
栏容器 .clauses 实测：x=64, width=897px
grid: 16 栏 × 67px + 15 × 16px gap = 1072+240 = 1312px（.dossier 满宽 1440）
```

- 规格说的是「**行长**限制 32 个汉字」，实现成了 `max-width: 480px`——**把"行长"当成了"版心"**。
- 精确到栏：`.clauses` 实测 897px = **11 栏**（67×11 + 16×10 = 897，与 16 栏栅格逐位吻合）。
  所以 1–11 栏这个规格要求是**做到了**。
- 但正文行盒只有 480px，占 897px 栏宽的 **53.5%**（`480/897`）。正文右边缘在 x=544，栏右边缘在 x=961
  ——**每屏从 x≈544 到 x≈1060（签发栏起点）这 516px 永久空着**，占全宽 36%。
- 也就是说：规格要的"栏位不对称"是对的、也做到了；错的是**在不该再缩的地方又缩了一次**（行长 ≠ 版心）。

**决定性实验**（`p22-s13-empty-fix.mjs`，副本上做，同时把 mono 包掉以隔离变量）：

| 变体 | `max-width` | 闸门 | 填充率 |
|---|---|---|---|
| base | 480px（原样） | **1 FAIL**（empty-screens） | `[0.55,0.22,0.14,0.30,0.14,0.17]` |
| w600 | 640px | **0 FAIL**（measurements pass） | `[0.55,0.25,0.16,0.31,0.28,0.24]` |
| w720 | 720px | 1 FAIL（剩 screens 3, 6）＋新冒 `measure` WARN | `[0.55,0.25,0.12,0.28,0.25,0.18]` |

**`640px` 是唯一同时满足两边的值**：闸门 0 FAIL，且**不触发 `measure`**。
`720px` 反而更差——它把正文拉到"96 字符/行"（工具口径，中文实际约 48 汉字），越过了 `measure` 的 88 字符线，还引入新的 FAIL 风险。

关键佐证：**640px ÷ 15px = 42.7 汉字/行，仍在规格「32 汉字」的同一量级**；而 480px 的"32 汉字"是**规格作者按汉字宽度手算的理想值**，实现时没考虑到栏宽剩下的一半会空着。
640px 恰好落在 11 栏的 71.3%，既不浪费栏位、也仍然是规格说的"短行"。

> **判定：真缺陷。** 不是"留白太多"，是「把行长上限当成了版心宽度」，导致**每屏右侧一半的栏位永久空着**。
> 这也解释了为什么 `_CONTRACT.md:149` §9.2 会专门警告"纹理挂 body 会刷出假满分"——`empty-screens` 是个敏感指标，本案不是被刷新，是真的掉到 0.14。

### 4.3 这类"规则与设计主张冲突"该怎么处理

本案给的教训是**先验算，再定性**：
1. 先看规则量的是什么（24×15 网格的**面积**填充率）；
2. 再看设计主张要的是什么（**行长** 32 汉字 + 栏位不对称）；
3. 两者是否真冲突？——本案**不冲突**。设计要"行短"，不要"右侧空一半"。把版心撑到 640px，"行长"从 32 汉字变 42.7 汉字（仍短），右侧空档从 47% 降到 29%，两边都保住。

**只有当验算后确认"要过规则就必须放弃设计主张"时，才该走豁免。** 本案没到那一步。

> ⚠️ `12-tool-rule-audit-30-retry5.md:123` 曾把 S13 的 `empty-screens` 判为 **`earned`**，理由是「空状态由签发动作的状态机制产生，正文栏只占 1–11 栏，整页填充率并不低」。
> **这个裁定是错的**：它说的是**空状态区块**（`.log__empty`），而规则量的是**整屏面积**；而且"整页填充率并不低"与实测 `0.14/0.14/0.17` 直接矛盾。该裁定没有跑过 `frame()`，属纸面裁定。

---

## 5 任务 3：豁免记录的真实性核对

### 5.1 `_CONTRACT.md` §9.15 现状（6 行，不是 4 行）

| 规则 | 在表内？ | 原文要点 | 与实际是否一致 |
|---|---|---|---|
| `mono` | ✅ `:197` | 「保留等宽槽；报告原始 FAIL 并说明」 | ⚠️ **前提被证伪**（§3.4）：26/30 案证明可零代价合规 |
| `font-count` | ✅ `:198` | 「3 族可接受；不要为了它去合并中文字体」 | ✅ 与 S08 的 4 族裁决（`:117`）自洽 |
| `font-fallback` | ✅ `:199` | 「永远不可能 earned；把死声明删掉」 | ✅ 已修（S08 的 `KingHwa_OldSong` 已删） |
| `measure` | ✅ `:200` | 见 §9.14 的 0.5em 假设 | ✅ 成立 |
| `palette-terracotta` | ✅ `:201` | S08 琥珀 `#C46A1F` 是矩阵冻结值 | ✅ **已记录**（Lead 2026-10-24 补登记） |
| `shadow` / `button-fx` | ❌ 不在表内 | —— | ✅ **不需要了**：`1753f94` 已清 |

### 5.2 文档腐化清单（逐条核）

| # | 位置 | 文档写的 | 实测 | 结论 |
|---|---|---|---|---|
| C1 | `README.md:160`、`README-EN.md:160` | 「剩下 4 个的 **8 条**失败」 | 6 条 | ❌ **腐化** |
| C2 | `README.md:419`、`README-EN.md:423` | 「合计 **8 条**：… `S13 mono + shadow(17 处) + button-fx + empty-screens`（4）」 | S13 只有 2 条 | ❌ **腐化** |
| C3 | `README.md:422`、`README-EN.md:426` | 「**`S13` 的 `shadow`（17 处）与 `button-fx` 没有豁免记录**——真的未清」 | 已清（`1753f94`） | ❌ **腐化，且是"文档说没修、实际修了"** |
| C4 | `README.md:550`、`README-EN.md:554` | 「剩余 **8 条** FAIL」 | 6 条 | ❌ **腐化** |
| C5 | `_CONTRACT.md:110` | 「**现行欠款**：`S13` 的 17 处 `shadow` + `button-fx` 属真未修」 | 已清 | ❌ **腐化** |
| C6 | `README.md:421`、`README-EN.md:425` | mono/琥珀「是已知豁免（理由见 §9.15）」 | §9.15 确有 `mono` 与 `palette-terracotta` 两行 | ✅ **已修好**（原 P52"引用跳空"已闭合） |
| C7 | `_CONTRACT.md:201` | S08 琥珀豁免「Lead 于 2026-10-24 补登记」 | `git log -S'palette-terracotta'` → `32c1420`（2026-10-24 07:20） | ✅ **属实，时间戳对得上** |
| C8 | `deliverables/tool-runs/S13-adjudication.md:13` | `--allow mono,shadow,button-fx,empty-screens` 后 0 FAIL | 该文件被 `.gitignore:14` 排除 | ⚠️ **记录存在但不在版本库**（§7.4 载体缺失，P1-7 未修） |

### 5.3 `check-docs.mjs` 为什么没抓到 C1–C5

`check-docs.mjs:726-738` 的 `status/fixed-claims` 只匹配**关键词**：

```js
if (!/已知未修|已知未修复|known,? unfixed|still unfixed|未被修复/i.test(line)) return;
```

而 README 写的是「**没有豁免记录**」「**真的未清**」「**合计 8 条**」——**一个字都不匹配**。
`nums/gate` 只校验「26 个闸门 FAIL=0」这个数（`gateFailZero`），**不校验 8/6 这个明细数**。

⇒ **这是检查器的盲区，不是检查器报了但没人管。** 建议给 `check-docs` 增加一条：从 30 份 `report.json` 现算 `FAIL 明细清单`，与 README 的逐案枚举做集合比对。

### 5.4 `shadow`/`button-fx` 到底有没有"无记录豁免"

用户说「这两条没有豁免记录，是实际未清理」。**当时是对的**：
- `README.md:422` 中英两版**都明写**"没有豁免记录"；
- §9.15 表里确实**没有**这两行；
- `deliverables/tool-runs/S13-adjudication.md` 里有过裁定（把 `[shadow]`、`[button-fx]` 判为"世界挣来的，留"），但该文件**被 `.gitignore` 排除、不在版本库**。

**但它们现在不需要记录了**——`1753f94` 是用**改实现**（凹改 inset、凸改 drop-shadow）解决的，不是用豁免。**这是本仓库处理得最干净的一条**：既没藏、也没靠 `--allow`，而是把"外投影与压进去的物理相反"这个真问题修掉了。

---

## 6 任务 4：处置建议（按"该做什么"排序）

### 6.1 立刻做（零风险，可复算）

**A. 清三条 `mono` —— 改标记，不改字体**

| 案 | 改哪个文件 | 改什么 | 行数 | 破坏设计主张？ | 验收命令 |
|---|---|---|---|---|---|
| S07 | `index.html` | 104 处：`.p`/`.k`/`.code` 的 `<span>`、`<dd>` 数值、`.folio` 页码 → 包 `<code>` | ~104 行内联标记 | **不会**：字体、字号、排版全不动；实测 5 屏像素逐字节相同 | `node tools/taste-skill/.../inspect.mjs prototypes/S07-…/index.html --widths 1440,768,390` → 找 `RESULT` |
| S13 | `index.html` | 30 处：`.depth`/`.mono` 的 `<span>`、`<td class="mono">` → 包 `<code>` | ~30 行 | **不会**：29 个等宽元素几何 0 差异 | 同上（S13 路径） |
| S21 | `index.html` | 83 处：`.face-data` 的 `<span>/<td>/<dd>/<th>` → 包 `<code>` | ~83 行 | **不会**：时刻列逐位对齐不变 | 同上（S21 路径） |

每个案再加 **1 行 CSS**（放 `style.css` 末尾或字体分工节）：

```css
/* 页码/时刻/分类号/实测值是 datum，用 <code> 标；字体仍由各案的等宽 token 承载 */
code { font-family: inherit; font-size: inherit; }
```

⚠️ `font-size: inherit` 也要加——`<code>` 的 UA 默认 `font-size: 0.85em` 左右，虽然本案实测几何无差（因为它们的等宽元素本身有显式 `font-size`），但**别的案不保证**，写上更稳。

**实测验收**（我在副本上跑过）：

```
S07  RESULT: 0 FAIL, 3 WARN — measurements pass.
S21  RESULT: 0 FAIL, 2 WARN — measurements pass.
S13  RESULT: 1 FAIL, 5 WARN — 剩 empty-screens
```

**B. 修 S13 的 `empty-screens` —— 一行 CSS**

文件：`prototypes/S13-blind-debossed-dispatch/style.css`
位置：`.clause p` 的规则（当前 `max-width:480px`，实测 480px）
改法：

```css
/* 原 480px = 15px × 32 汉字，是「行长」上限，被当成了版心宽度，
   导致 897px 宽的栏里右侧 47% 永久空着（empty-screens 量到 0.14）。
   640px = 42.7 汉字/行，仍在规格「32 汉字」的同一量级，且不触发 measure。 */
max-width: 640px;
```

预计：**1 行**（若 `.annex p, .levels p, .log p` 也各有一处，则 2–4 行）。
修完是否破坏设计主张：**不会**。规格要的是"行短 + 栏位不对称"，640px 仍然行短（42.7 字），
不对称（1–11 栏 + 13–16 栏签发）完全保留。
验收：`inspect.mjs … --widths 1440` → `RESULT: 0 FAIL`；填充率应从 `[0.55,0.22,0.14,0.30,0.14,0.17]` 变到 `[0.55,0.25,0.16,0.31,0.28,0.24]`。

> **注意**：改 `max-width` 会让页高从 4701 → 4622（少 79px）。这是真正的内容重排，
> **需要重渲染 `.inspect/` 并更新 3 张 fold 图 + 截图**，否则 `check-stale` 会红。

**C. 修 5 处文档腐化（C1–C5）**

| 位置 | 现在写的 | 改成 |
|---|---|---|
| `README.md:160` / `README-EN.md:160` | 剩下 4 个的 **8 条**失败 | 剩下 4 个的 **6 条**失败 |
| `README.md:419` / `README-EN.md:423` | `S13 mono + shadow(17 处) + button-fx + empty-screens`（4） | `S13 mono + empty-screens`（2），并注明 shadow/button-fx 已在 `1753f94` 清除 |
| `README.md:422` / `README-EN.md:426` | 「shadow 与 button-fx 没有豁免记录——真的未清」 | **整句删除**，替换为「`S13` 的 `shadow`（17 处）与 `button-fx` 已于 2026-10-27 清除：凹槽改 `inset`、凸起改 `filter: drop-shadow`（契约 §9.3）」 |
| `README.md:550` / `README-EN.md:554` | 剩余 **8 条** FAIL | 剩余 **6 条** FAIL |
| `_CONTRACT.md:110` | 「**现行欠款**：S13 的 17 处 shadow + button-fx 属真未修」 | 改为「已清（`1753f94`，2026-10-27）：凹改 inset、凸改 drop-shadow。本条保留为历史记录」 |

改完跑 `node prototypes/_build/check-docs.mjs` 必须仍 exit 0（`nums/gate` 只认 26，不会红）。

### 6.2 应该做（记录层的真问题）

**D. 把 §9.15 的 `mono` 行改写掉。** 现在这一行在**教后来者放弃等宽**，而实测证明不需要。
建议改成：

> | `mono` | 等宽若落在 `<code>/<pre>` 之外即 FAIL。本语料 30 案里 29 案用等宽，**26 案靠把 datum 放进 `<code>` 做到了 0**（S07/S13/S21 是仅有的三个 `<code>` 数为 0 的案） | **把页码/时刻/分类号/实测值包进 `<code>`，并加 `code{font-family:inherit;font-size:inherit}`。不许靠放弃等宽来过关** |

**E. 给 `palette-terracotta` / `font-count` 补 §7.4 要求的"逐案批准记录"。**
`_CONTRACT.md:124` 的裁决句要求「FAIL 集合 ⊆ §9.15 允许表 **∪ 逐案批准记录**，且每条在交付说明里有一条**引到文件行号**的豁免理由」，而 `:127` 又说载体应是 `deliverables/<Sxx>-adjudication.md`。
现状：`deliverables/tool-runs/S08-adjudication.md` 存在，但 `tool-runs/` 被 `.gitignore:14` 排除 ⇒ **clone 者看不到**（这正是契约 `:127` 自己承认的 P1-7 未修项）。
**建议**：在 `prototypes/_specs/S08.md` 末尾追加「闸门豁免记录」小节，写清 `palette-terracotta`（冻结值 `#C46A1F`，`_CURRENT-VALUES.md:42`）与 `font-count`（四角色，契约 `:117`）两条，并引到具体行号。这样即使 `deliverables/` 不入库，记录仍在受跟踪区域。

**F. 给 `check-docs.mjs` 加一条"FAIL 明细对账"。**
从 30 份 `report.json` 现算 `{id, failIds, 条数}`，与 README「做不到与已知边界」一节的逐案枚举做集合比对。
这会直接抓住这次的 C1–C4，且以后 `shadow` 再被清掉时不会重演。

### 6.3 不建议做

- ❌ **不要用 `--allow mono` 等放行**。`inspect.mjs` 支持 `--allow`，但四案的 `allow` 都是 `[]`，这是本仓库少见的"诚实"证据。一旦放行，`README.md:389` 那句"这一条在 `inspect.mjs` 里保持 FAIL 是诚实的，不靠 `--allow` 放行"就自相矛盾。
- ❌ **不要为了 `mono` 放弃等宽字体**。见 §3.3：换标记即可，放弃会伤 S21 的安全语义与 S13 的工艺证据。
- ❌ **不要为了 `empty-screens` 去给 S13 加色块/图片填满**。那会毁掉"全站只用 `#F4E3BE` 一种底"（`_specs/S13.md` 字段 8 第三点明令）。改行长就够。

---

## 7 我核实后认为任务书说错了的地方

| # | 任务书/Lead 的说法 | 实测 | 依据 |
|---|---|---|---|
| 1 | 用户：「4 个不达标方案的 **8 条 FAIL**」 | **6 条** | `--all` 逐案 + 四份 `report.json` 逐条 |
| 2 | 用户：「shadow 和 button-fx 没有豁免记录，是**实际未清理**」 | **已清理**（`1753f94`，2026-10-27 20:16）。说"没有豁免记录"在当时是对的，但结论"实际未清理"在 `1753f94` 之后不成立 | `git log` + `style.css:132/165/426` |
| 3 | 任务书：「S13 是活字印刷？」 | 不是活字印刷，是**盲压凸版（blind emboss）+ 烫金击凸**：`_specs/S13.md` 字段 1「用棉纸印的公函……条款标题是靠 0.4mm 深的盲压凹槽被读出来的」 | `_specs/S13.md` |
| 4 | 任务书：「S21 是装订册？」 | 更准确是**联锁释放簿 / 值班台**：字段 1「一张摊在值班台上的联锁释放簿……14 枚锁闭条拼成的释放路径」。等宽承载的是**时刻与锁号的对齐**，属安全语义 | `_specs/S21.md` |
| 5 | 任务书：「`mono` 如果是设计上必需的，那清 `mono` = 改设计，代价是什么？」 | **前提不成立**：清 `mono` ≠ 改设计。改标记即可，三案 15 张截图**逐字节相同** | `exp2/`、`exp3/` |
| 6 | 任务书：「`empty-screens` 如果是大留白，这就是规则与设计主张冲突的典型」 | **不是大留白，是度量错配**。`max-width:480px` 被当成版心，897px 栏里右侧 47% 永久空着。改 640px 立刻 0 FAIL | `p22-s13-empty-fix.mjs` |
| 7 | Lead：「上一轮已经清掉了 S13 的 shadow 和 button-fx」 | ✅ **正确**。就是 `1753f94`（2026-10-27），不是更早 | `git log` |
| 8 | `_CONTRACT.md:197`：「`mono` 在**本语料上必然触发**」 | **反证**：26/30 案做到 `monoProseShare = 0`（合计 3048 个 `<code>`/`<samp>`，均值 117 个/案）。全库仅 4 案一个 inCode 标签都没有，其中 3 案正是 `mono` 的 FAIL 案（第 4 个 S25 不用等宽） | `p07-mono-premise.mjs`、`p24-incode-tags.mjs` |
| 9 | `12-tool-rule-audit-30-retry5.md:123`：S13 `empty-screens` 判 `earned` | **错**。它讲的是 `.log__empty` 空状态区块，而规则量的是整屏面积填充率；且"整页填充率并不低"与实测 0.14/0.14/0.17 矛盾 | `p14-s13-bands.mjs` |
| 10 | 任务书：「工作目录 D:\Web\style，只读」 | ✅ 已遵守。`git status --porcelain -- prototypes templates README* tools` 收工时为空 | §0 |

### 7.1 踩到的坑（给后来者）

1. **`launch({width,height})` 不切视口** —— 必须 `page.setViewport(...)`。本审计全部显式设了。
2. **别用 `file://`** —— 写 http server。但**还有一个更深的坑**：
3. **http server 的根必须让 `../_fonts/` 解析得到。** S07/S13/S21 的 `index.html` 都链 `../_fonts/css/*.css`。
   我一开始把 server root 设成案目录，`../_fonts/` 直接 404 → 字体回落 → **`isMono` 把回退字体全判成等宽**（Chrome 对缺失字族的 canvas 回退行为），得出"S13 的正文族也是等宽"的**假结论**。
   正确做法：server root 设成 `prototypes/` 或仓库根，页面路径带完整前缀。改对之后 `document.fonts` 才真正 loaded 到 `DM Mono` / `EB Garamond` / `Noto Serif SC`。
4. **`screenshot({path})` 默认 `format:'jpeg'`** —— 存成 `.png` 会得到"扩展名骗人"的文件，`read_image` 会拒读。全部显式 `format` 或统一 `.jpg`。
5. **像素比对必须先冻结动效** —— S13 有 120ms `steps(2)` 压出 + 520ms 载入序列，不冻结就会把时序差误读成视觉差（我第一轮就这样误判过 3 屏"不同"，冻结后 5/5 相同）。
6. **PowerShell 的引号转义** —— 用 `-replace` 改含反引号/`$` 的 JS 模板字符串会把代码写坏。一律写 `.mjs` 文件。

---

## 8 证据文件索引

| 文件 | 内容 |
|---|---|
| `_verify-all.txt` | `verify-prototype.mjs --all` 完整输出 |
| `p01-fails.mjs` | 四案完整 FAIL/WARN message（含 `fix` 原文） |
| `p02-metrics.mjs` | 四案 `monoProseShare` / `filled` / `families` 读数 |
| `p04-filled30.mjs` | 30 案 `empty-screens` 填充率标定（证明 S13 是唯一 <2 屏的 FAIL） |
| `p05-mono30.mjs` | 30 案 `monoShare` / `monoProseShare` 全景 |
| `p07-mono-premise.mjs` | **证伪 §9.15「mono 必然触发」**：26 案做到 0 |
| `p13-s13-shots-fixed.mjs` → `shots/S13-s1..s6.jpg` | S13 六屏截图（字体正确加载） |
| `shots/S13-clauses-3x.jpg` | 3 倍放大：盲压凹槽 + `.depth` 的 DM Mono 实测值 |
| `p14-s13-bands.mjs` | S13 每屏按「正文栏 / 签发栏」分带的填充率归因 |
| `p15-s13-measure.mjs` | 正文 `max-width:480px` vs 栏宽 897px 的实测 |
| `p16/p18`（`exp2/`） | **S13 包 `<code>` 实验：mono 147→0，5/5 屏像素逐字节相同** |
| `p19/p20/p21`（`exp3/`） | **S07、S21 包 `<code>` 实验：双双 0 FAIL，5/5 屏像素逐字节相同** |
| `p22-s13-empty-fix.mjs`（`exp4/`） | **`max-width` 480→640px：empty-screens 消失，0 FAIL** |
| `p23-pixel-0721.mjs` | S07/S21 包 `<code>` 前后像素比对 |
| `inspect-S07/ S08/ S13/ S21/` | 我自己重跑的闸门报告（复核 6 条 FAIL） |

### 截图清单（`shots/`）

| 文件 | 说明 |
|---|---|
| `S13-s1.jpg` … `S13-s6.jpg` | S13 六屏，1440×900，字体已加载 |
| `S13-clauses-3x.jpg` | 条款区 3 倍放大，可看到 `.depth` 的 `0.4mm` 等宽实测值与压痕槽带 |

> 截图证据对「S13 的空白是不是设计」是关键：`S13-s3.jpg`（填充 0.14，第三屏）与 `S13-s5.jpg`（0.16，第五屏）
> 肉眼可见**正文窄栏贴在左侧，正文右边缘止于 x≈544，从那里到签发栏（x≈1060）一大片空着**——
> 这与 §4.2 的度量错配吻合。注意区分：`S13-s3.jpg` **不是全空**，它有 7 条条款与「附件目录」表格，
> 内容并不少；掉到 0.14 是因为**面积**口径下正文只覆盖左半，不是"这屏没东西"。
> 这恰好说明 `empty-screens` 量的是**版面占用**而非**内容量**，而本案的问题是版面，不是内容。

---

## 9 一句话给 Lead

**6 条不是 8 条；`shadow`/`button-fx` 你记对了，`1753f94` 清的；三条 `mono` 全部可以零像素代价清掉（换标记不换字体），`empty-screens` 是一行 `max-width`；真正要花力气的不是清 FAIL，是修 README 里那 5 处已经在说假话的文档。**
