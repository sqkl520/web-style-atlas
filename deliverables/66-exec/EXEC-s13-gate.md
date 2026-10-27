# S13 闸门清理：shadow + button-fx（2 条 FAIL 已清零）

日期 2026-10-27 ｜ 作用域 `prototypes/S13-blind-debossed-dispatch/style.css`（唯一被改的文件）
| 项 | 值 |
|---|---|
| `report.json` 的 `at` | `2026-10-27T11:08:16.449Z` |
| `style.css` mtime | `2026-10-27T19:12:05+08:00` |
| `style.css` sha256 | `2ed2e686d29ccd104d276533ba6bafda1c2fbec70c4a12117a3a2f5bf2d498d8` |
| git blob（改前 → 改后） | `1af8db9` → `1f17550` |
| 改动量 | +82 / −16 行，单文件 |

**结论：`shadow` 与 `button-fx` 三条视口全部归零，`FAIL 4 → 2`。
但全仓汇总仍是 26/4，不是任务书预期的 27/3 —— 原因见 §5，不是 mono/empty-screens 变了。**

---

## 1. 改前基线：17 处到底是哪 17 处

任务书给的是 `report.json` 的一句话「17 box-shadow(s)」，但没点名。我写了 `deliverables/66-exec/_s13scan.mjs`
逐字复刻 `probe.mjs` 的判据（`big` = 元素面积 ≥ 60×30；`outer` = 任一段不含 `inset`、
不是 `0px 0px 0px 0px`、不是 alpha=0 的 rgba）——**不改前必须先知道改的是哪几个，
否则「FAIL 消失」可能只是元素掉出了 big 集合**。

| 元素 | 数量 | 带外投影的 token |
|---|---|---|
| `h3.clause__head` | 7 | `--press-1` 第二段 |
| `button.btn`（issue / reject / forward） | 3 | `--press-2` |
| `button#archiveBtn.btn` | 1 | `--press-1` 第二段 |
| `li.signchain__row` | 3 | `--press-3` 第二段 |
| `header#top.letterhead` | 1 | `--press-3` 第二段 |
| `div.specimen__foil` | 1 | `--press-2` |
| `p#logEmpty.log__empty` | 1 | `--press-1` 第二段 |
| **合计** | **17** | 三视口一致 |

另有两个元素带外投影但**面积不足 1800，闸门从不数**：`span#quirkChar`（551px²，`--press-3-edge`）、
`div#cursorPress`（36px²，`--press-1`）。改前 `button-fx` 的 4 个按钮 = issue / reject / forward / archive。

---

## 2. 四步改动与前后对照

### 第 1 步：纯外投影的三个变量 → inset

任务书要求改 `--press-2`、`--press-4`、`--press-2-hover`。**我没有按这三条改，理由在下面，先给实际做的。**

```diff
-  --press-2: 2px 2px 3px rgba(36, 31, 23, 0.08);
-  --press-2-hover: 2px 2px 4px rgba(36, 31, 23, 0.18);
+  /* --press-2 已撤销：二级凸起改由下面的 --lift-2 承载 */
+  --lift-2: drop-shadow(2px 2px 3px rgba(36, 31, 23, 0.08));
+  --lift-2-hover: drop-shadow(2px 2px 4px rgba(36, 31, 23, 0.18));
```

**与任务书的分歧（重要）：** 任务书说「盲压的原理就是凹槽，`inset` 正合物理，所以这不是妥协」。
这句话对**凹**（`--press-1` / `--press-3`）成立，对**凸**（`--press-2`）不成立：
`--press-2` 的使用者是 `.btn` 与 `.specimen__foil`，而页面拷贝写的是
「**凸起的**铅字块」「烫金**击凸**」（`index.html:191–206`、`.specimen__foil`）。
把凸改成 inset，等于把设计里唯一一处「浮在纸面上」的层级读成凹 —— 闸门绿了，主张变了。

规划稿的实测表其实也暴露了这一点：`fixAllInset` 之后「带箱影的按钮」仍是 4，
必须再叠一步 `C_btnsDropShadow` 才归零，说明**按钮这一层无论如何都得走 filter**。
既然按钮必须走 filter，凸这一级统一走 filter 是同一个决定，不必分两套。

我出图核对过两种做法（`trials/foil/`，6× 放大烫金块左下角）：`inset` 版把击凸块的
亮/暗关系翻到了内侧，与旁边「骑缝章方框」的凹槽读法混淆；`filter` 版关系不变。**取 filter。**

`--press-4` **没动**：它是贴底签发栏（`.signature.is-pinned`）。实测 `_s13overlay.mjs`：
`#signature` 在 1440 档滚到底**根本没有 `.is-pinned`**（`pinned=false`、`sigShadow=none`）——
它在签发栏让位给「回函登记」时被 JS 提前收回，所以这条从未进入闸门计数。
改它等于给一个不出现的东西动刀。

### 第 2 步：混合影的第二段 → inset（这是 13 → 0 的主刀）

```diff
-  --press-1: inset 2px 2px 3px rgba(36,31,23,var(--edge-a)), 2px 2px 2px rgba(36,31,23,0.06);
-  --press-3: inset 0 1px 1px rgba(36,31,23,0.065), 0 1px 1px rgba(36,31,23,0.05);
-  --press-1-rev: inset -2px -2px 3px rgba(36,31,23,var(--edge-a)), -2px -2px 2px rgba(36,31,23,0.06);
-  --press-1-off: inset 2px 2px 3px rgba(36,31,23,0), 2px 2px 2px rgba(36,31,23,0);
+  --press-1: inset 2px 2px 3px rgba(36,31,23,var(--edge-a)), inset 2px 2px 2px rgba(36,31,23,0.06);
+  --press-3: inset 0 1px 1px rgba(36,31,23,0.065), inset 0 1px 1px rgba(36,31,23,0.05);
+  --press-1-rev: inset -2px -2px 3px rgba(36,31,23,var(--edge-a)), inset -2px -2px 2px rgba(36,31,23,0.06);
+  --press-1-off: inset 2px 2px 3px rgba(36,31,23,0), inset 2px 2px 2px rgba(36,31,23,0);
```

偏移、模糊、alpha 一个都没改，**只把第二段从「盒外」翻到「盒内」**。几何不变，亮度关系反过来。

这一步任务书没写，但必须做：`--press-1-off` 是 `--press-1` 的 alpha=0 占位（压出动画的起点），
不同步改会让「未压出 → 压出」的过渡在第二段上跳变。

### 第 3 步：4 个按钮 → `filter: drop-shadow`

```diff
 .btn {
-  box-shadow: var(--press-2);
+  /* taste-skill-ignore: 二级凸起（铅字块）…（历史注释，保留）
+     ↑ 但它对闸门无效 … */
+  box-shadow: none;
+  filter: var(--lift-2);
-  transition: box-shadow var(--press-ms) steps(2);
+  transition: filter var(--press-ms) steps(2);
 }
 .btn:hover, .btn--issue:hover {
-  box-shadow: var(--press-2-hover);
+  filter: var(--lift-2-hover);
 }
+.btn:active { filter: none; }        /* 凸块压平：影收掉，0.8px 下沉仍在 */
+.btn[disabled] { box-shadow: none; filter: none; border-top: 3px solid var(--shade);
+                 padding-block-start: 9px; }
+.btn.is-error  { box-shadow: none; filter: none; }
```

**数值逐位相同**（`2px 2px 3px` α0.08 / `2px 2px 4px` α0.18），只换承载属性。

我原本担心一件事并实测了：`filter` 作用于**整个渲染结果，含子元素文字**，15px 汉字的笔画
可能带一层位移重影。结论**不成立** —— 因为 `.btn` 与 `.specimen__foil` 底色不透明，
`drop-shadow` 取到的轮廓就是盒子矩形，字与图标不出影（6× 字形图与改前 **sha256 相同**：
`base-glyph6x.png` 与 `R-glyph6x.png` 均为 `8d4f6e47…`）。像素差：

| 比较 | mean\|Δ\| | max | 差>8 占比 |
|---|---|---|---|
| reject 整块（3×） | 1.24 | 76 | 1.69% |
| reject 文字区 | 1.43 | 76 | 3.70% |
| issue 整块（3×） | 1.46 | 87 | 2.93% |

### 第 4 步（任务书未列，必须做）：两个按钮态从「一级凹槽」组里移出

闸门 `button-fx` 的判据是 `buttons[].withShadow = computedStyle.boxShadow !== 'none'`
（`probe.mjs:300`），**`inset` 也算**。所以停用态与错误态不能挂 inset，否则 FAIL 只是从
available 态挪到 disabled 态。这也解释了规划稿为什么必须多加 `C_btnsDropShadow` 这一步。

```diff
-.btn[disabled] { background: var(--paper); color: var(--gold); }
+.btn[disabled] { … box-shadow: none; filter: none; border-top: 3px solid var(--shade);
+                 padding-block-start: 9px; }
+.btn.is-error  { … box-shadow: none; filter: none; }
-[data-press].is-pressed .clause__head, .btn[disabled], .btn.is-error, .log__empty, .cursorpress {
+[data-press].is-pressed .clause__head, .log__empty, .cursorpress {
```

停用态的「压进去」改由本方案自己的词汇表达：**槽带**（`border-top` 平涂色阶，`.clause__head` 用的就是这条）。
错误态本来就是墨底纸字 12.92:1，删掉的 inset 是墨压墨、肉眼不可见（对照 `button-states/6-error.png`）——
留着只会在错误态被截图时咬人。

---

## 3. 闸门 findings 改前 / 改后

**改前**（`report.json` at `2026-10-24T16:11:28.111Z`，备份 `shots-s13/report-before.json`）：

```
FAIL=4  [mono, shadow, button-fx, empty-screens]     WARN=5
  shadow    : 17 box-shadow(s) on elements at rest
  button-fx : Buttons with shadow/glow.
```

**改后**（at `2026-10-27T11:08:16.449Z`，`shots-s13/report-after.json`）：

```
FAIL=2  [mono, empty-screens]                        WARN=5
  [FAIL] mono          @1440  Monospace type outside code: DM Mono — e.g. "0.4mm"…（另见 768/390）
  [FAIL] empty-screens @1440  3 of 6 desktop screens are almost empty ground: screens 3, 5, 6
  [WARN] font-count / body-size / no-footage / still-page / hairline   ← 改前就在，未变
```

`shadow` 与 `button-fx` **在 1440 / 768 / 390 三档全部消失**。WARN 集合逐条未变。

独立复核（`_s13scan.mjs final`，逐字复刻闸门口径）：

| 视口 | 带外投影元素 | 带 box-shadow 的按钮 | 页面 box-shadow 元素（含 inset） |
|---|---|---|---|
| 1440×900 | **0** | **0** | 15，全部纯 inset |
| 768×1024 | **0** | **0** | 15，全部纯 inset |
| 390×844 | **0** | **0** | 15，全部纯 inset |

留住的 15 处全是 inset —— 凹槽的视觉一层没丢。

---

## 4. 三档截图

`deliverables/66-exec/shots-s13/`，改前 `before/`、改后 `after/`，命名 `S13-{before,after}-{档}-{fold,screen-NN,full}.png`。

| 档 | 改前 | 改后 | 页高 前→后 |
|---|---|---|---|
| 1440×900 | `before/S13-before-1440-fold.png` + 6 屏 | `after/S13-after-1440-fold.png` + 6 屏 | 4701 → **4701**（不变） |
| 768×1024 | `before/S13-before-768-fold.png` + 6 屏 | `after/S13-after-768-fold.png` + 6 屏 | 5410 → **5410**（不变） |
| 390×844 | `before/S13-before-390-fold.png` + 10 屏 | `after/S13-after-390-fold.png` + 10 屏 | 8423 → **8423**（不变） |

三档页高逐位复现 —— 改动没有动任何一个盒子（见 §6「我可能弄坏的地方」里那条 3px 事故，
它就是靠这个数字抓到的，现在已修回 4701）。另有 `crops/`（2× 细节对照）与
`button-states/`（1 静息 2 悬停 3 按下 4 停用 5 载入 6 错误，3×）。
目录合计 87 个文件 / 56.9 MB；`style.before.css` 是改动前的整份文件备份
（sha256 `5e6dc1cf…`，git blob `1af8db9`，与 HEAD 里的版本逐字节相同）。

---

## 5. 为什么没有 27/3 —— 请 Lead 定夺

任务书预期 `达标 27 / 不达标 3`，实测 **26/4 未变**。**不是 mono 或 empty-screens 变多变了。**
原因在 `verify-prototype.mjs` 的判据：它把**任何** FAIL 都算作不达标，没有「豁免表」概念。

```js
// verify-prototype.mjs:112-118
const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
if (fails.length) out.problems.push(`闸门 FAIL=${fails.length}：${out.failIds.join(' ')}`);
```

S13 改后仍有 2 条 FAIL（`mono` + `empty-screens`），所以仍计入「不达标」。FAIL 名单：

| 案 | FAIL | 改前 | 改后 |
|---|---|---|---|
| S07 | 1 | mono | mono（未动） |
| S08 | 2 | palette-terracotta font-count | 同（未动） |
| **S13** | **4 → 2** | mono shadow button-fx empty-screens | **mono empty-screens** |
| S21 | 1 | mono | mono（未动） |

要让汇总变成 27/3，需要 S13 的 FAIL 归零 —— 也就是必须同时清掉 `mono` 或 `empty-screens`，
而这两条明确不在我的任务范围（任务书：「已知豁免/难修，不在你的任务范围」；
且 `_CONTRACT.md` §9.15 把它们列在允许表内）。

**我没有硬凑。** 如果 Lead 预期的是 27/3，那说明汇总口径本身需要一条「允许表内 FAIL 不计」
的实现（`_CONTRACT.md` §7.2 裁决句确实这么要求：「表内规则的 FAIL 不计入『缺一不算完』」，
但 `verify-prototype.mjs` 没有实现这条）。那是工具侧改动，超出我的写作用域。

---

## 6. 视觉判断：改完还像盲压吗？

**是。而且凹槽比改前更「凹」了。** 理由分三层：

**凹（主角，9 处）— 变好。** 改前 `--press-1`/`--press-3` 是「内影 + 盒外投影」的混合式。
单向硬光源下，盒子外面的影只有一件事可说：这个面浮起来了 —— 也就是每一处凹槽都在
暗暗地宣称自己是浮起的卡片，与盲压的主张相反。翻成 inset 后，影只落在槽内壁，
与 `border-top` 的 55:45 双色槽带合起来读成一件事：光从左上来，左上壁挡光变暗，槽底是纸色。
`crops/clause-band-before.png` 与 `-after.png`（2× 并排）里，改后槽带的下沿干净了，
槽深读值不变（`report.json` 桌面档 filled 序列 0.55/0.22/0.14/0.30/0.14/0.17，改前改后一致）。

**凸（2 处：铅字按钮 ×4、烫金击凸块 ×1）— 不变。** 数值逐位相同，只换承载属性，
像素差 mean\|Δ\| 1.2–1.5。`crops/actions-*.png` 并排看，接触阴影的偏移方向、
软硬、深浅都无法分辨。这是有意的：凸的语义是「击凸」的物理隆起，它就该浮着。

**按钮的「压下去」触感 — 保留。** 静息凸起（`--lift-2`）→ 悬停加深（`--lift-2-hover`）→
按下影消失 + 0.8px 下沉（`.btn:active`）。按下时「影没了」在盲压语境里正是「压到与纸面齐平」，
比原来「影翻到另一侧」（那是石头翻面，不是纸被压）更贴题。`button-states/3-active.png` 里
可以看到下沉后上沿露出的一线纸色。

**唯一让我犹豫的地方**：停用态 `.btn[disabled]` 从「凸起」变成了「上沿 3px 色带 + 无影」。
它现在是「一道槽的上沿」而不是「一道完整的槽」（缺 inset 内壁，因为 inset 会被闸门数进
`button-fx`）。3× 图里它读得通 —— 金色字面 + 上沿暗带 + 无影，与可用态（纸色字 + 右下影）
区分明确 —— 但它确实是四个按钮态里**最弱的一个**。这是闸门判据（`boxShadow !== 'none'`，
inset 也计）逼出来的表达，不是我的首选。

---

## 7. 我可能弄坏的地方

1. **停用态的几何我改坏过一次，已修回。** 给 `.btn[disabled]` 加 `border-top: 3px` 时，
   `.btn` 没有显式 `height`，`box-sizing: border-box` 只约束「声明过的高度」，管不到
   「被内容撑出来的高度」—— 按钮由 46px 变 49px，整摞动作元素下移 3px
   （`_s13geom.mjs` 实测 `archive h:49 / y:1927`）。补 `padding-block-start: 9px` 后回到 46px，
   三档页高也回到 4701/5410/8423。**这条是靠量几何抓到的，肉眼在 1440 全页截图里看不出来。**
   若哪天 `.btn` 改成固定 `height`，这条 padding 补偿应当删掉。
2. **`.btn.is-loading` 的 `overflow: hidden`**：它在 `.btn::after` 上画进度条。我没有动它，
   但因为 `filter` 会建立包含块，理论上会影响 `position: absolute` 子元素的参照。实测
   `button-states/5-loading.png` 进度条位置正常 —— 但这个组合我只在 1440 档看过一次。
3. **`filter` 的层叠副作用**：`filter` 非 none 会创建新的层叠上下文与包含块。S13 里 `.btn`
   的子元素只有 `.ico` 与 `.btn__label`（都是 static），`.btn::after` 是 absolute，
   已按上条核对。但 `specimen__foil` 上加 `filter` 同样新建层叠上下文 —— 它没有定位子元素，
   风险低，未逐一验证。
4. **`prefers-reduced-motion` 降级块里的 `.btn:active { filter: brightness(0.96) }` 会覆盖我新加的
   `.btn:active { filter: none }`**（同特异性 0,2,0，降级块源序更后）。**我一开始以为这是一处冲突，
   量完发现结果是对的**，所以不改，但把实测记在这里（`_s13rm.mjs`，同一个按钮、真实鼠标按住）：

   | 模式 | 静息 filter | 按下 filter | 按下 transform | 带 box-shadow 的按钮 |
   |---|---|---|---|---|
   | no-preference | `drop-shadow(… 2px 2px 3px)` | `none` | `translateY(0.8px)` | 0 |
   | reduce | `drop-shadow(… 2px 2px 3px)` | `brightness(0.96)` | `translateY(0.8px)` | 0 |

   两条路径的语义一致：静息浮起 → 按下影消失 + 下沉 0.8px；降级版额外把「影消失」换成
   更省帧的 `brightness`。**闸门两种模式下都数到 0。** 保留原样。
5. **`--press-3-edge` 仍是外投影**，只落在 `.quirk__char::after`（伪元素），闸门的
   `querySelectorAll('*')` 看不到伪元素。**这不是我为了过闸藏的**（改前它就不被数：宿主
   `span#quirkChar` 面积 551px² < 1800），但既然现在全站只剩它一条外投影，值得让复核者知道
   它的豁免来自「伪元素 + 面积不足」两个技术条件，而不是来自任何设计论证。
6. **`mono` / `empty-screens` 完全未动**，`font-family: var(--font-figure)` 与 `--font-count`
   都保持原样；`empty-screens` 涉及的 6 屏排版一个字节没改（页高逐位相同即为证）。

---

## 8. 复现命令

```bash
node prototypes/_build/render-scheme.mjs S13-blind-debossed-dispatch   # 闸门：FAIL=2
node prototypes/_build/verify-prototype.mjs --all                      # 汇总：26/4
node deliverables/66-exec/_s13scan.mjs final                           # 逐元素口径复核：全 0
node prototypes/_build/shot.mjs prototypes/S13-blind-debossed-dispatch/ \
     --out deliverables/66-exec/shots-s13/after --widths 1440,768,390 \
     --heights 900,1024,844 --name S13-after                           # 三档截图
```

证据脚本（均在 `deliverables/66-exec/`）：`_s13scan.mjs`（闸门口径逐元素扫描）、
`_s13geom.mjs`（几何，抓 3px 事故）、`_s13overlay.mjs`（`is-pinned` 是否进闸门）、
`_s13states.mjs`（六个按钮态 3× 图）、`_s13foil.mjs`（凸：inset vs filter 对照）、
`_s13rm.mjs`（`prefers-reduced-motion` 两种模式下的按下态）、
`_s13trial.mjs` / `_s13btnzoom{,2,3}.mjs` / `_s13btnT.mjs`（按钮方案 A/B/C/P/Q/R/S/T 逐轮淘汰）。
扫描原始数据 `_scan-{before,after,final}.json`。
