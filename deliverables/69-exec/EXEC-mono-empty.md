# 执行报告：清 `mono` ×3 + S13 `empty-screens`

- 会话：69-exec ｜ 执行 Agent ｜ 2026-10-29
- 工作目录：`D:\Web\style` ｜ node `v26.12.1`
- 基线提交：`9d842c7ae58e9772b965a37d118c69726ea1dfbd`
- 开工时 `git status --porcelain`（已剥离 `deliverables/` 下的未跟踪文件）：
  ```
   M prototypes/_selection/.inspect/desktop-fold.jpg
   M prototypes/_selection/.inspect/desktop-page-01.jpg
   M prototypes/_selection/.inspect/desktop-page-02.jpg
   M prototypes/_selection/.inspect/desktop-page-03.jpg
   M prototypes/_selection/.inspect/mobile-page-01.jpg
   M prototypes/_selection/.inspect/report.json
   M prototypes/_selection/app.js
   M prototypes/_selection/self-gate.js
   M prototypes/_selection/style.css
  ```

### ⚠️ 本轮存在并发改动（不是我的）

任务书说「仓库有并发改动」，实测确实有，而且**在我工作期间发生了**。下面这些文件的 mtime 落在我的工作时段内，
但**不是我写的**（我的所有写入都在 `prototypes/S07|S13|S21` 与 `deliverables/69-exec/` 下）：

| 文件 | mtime | 归属 |
|---|---|---|
| `prototypes/_selection/app.js` | 03:11:09 | 开工前 |
| `prototypes/_selection/prompt-copy.js` | 04:09:45 | **工作期间由他方改动** |
| `prototypes/_selection/index.html` | 04:39:20 | **工作期间由他方改动** |
| `prototypes/_selection/style.css` | 04:39:20 | **工作期间由他方改动** |
| `prototypes/_selection/self-gate.js` | 04:47:19 | **他方跑了 `render-scheme.mjs _selection`** |
| `deliverables/69-exec/EXEC-bce.md` | 05:00:06 | **他方报告（不是我写的）** |

⇒ 三点影响，必须说清楚：
1. **`_selection/` 当前的绿/红状态不能当作本轮基线**。`self-gate.js` 在 04:47 被重写过，
   如果它红了，原因在并发那条线，不在我的改动（我一行都没碰 `_selection/`）。
2. 我在 §5 用 `data.js` 做证明时，`data.js` 本身**没有被任何人重跑 collect-schemes**（mtime 仍是旧的），
   所以 §5 的结论不受并发影响；但**如果 Concurrent 那条线跑了 collect-schemes，§5 的"假绿"会自动消失、README 会立刻红** ——
   请 Lead 以重跑后的 `check-docs` 为准。
3. 我三次跑 `verify --all` / `check-stale` / `check-anchors` / `check-docs` 都拿到同一组结果
   （29/1、exit 0、exit 0、0 FAIL），说明并发改动**没有**污染我这四条结论。

这三个目标案开工时**全是干净的**（`git status` 对它们无输出），所以下文所有差异都能归因到本轮。
- **未 commit**（按任务书）。

---

## 0 一句话结论

四条 FAIL 全部清零，闸门从 `达标 26 / 不达标 4` 变成 **`达标 29 / 不达标 1`**（只剩 S08 的两条已知豁免）。
**但任务书对 `mono` 的判断有两处需要修正，S13 的实验结论也不完全成立** —— 见 §6，别跳过。

| 案 | 修前 FAIL | 修后 FAIL | 手段 | 像素代价 |
|---|---|---|---|---|
| S07 | `mono` | — | 103 处等宽数据包 `<code>` | **逐字节 0** |
| S21 | `mono` | — | 83 处 | **逐字节 0** |
| S13 | `mono` + `empty-screens` | — | 29 处 `mono` 包 `<code>`；桌面档版心 480→640 | mono 部分 **0**；版心部分**有代价，已量化** |
| S08 | `palette-terracotta` + `font-count` | 不变 | 未动（按任务书） | — |

---

## 1 四道闸门（最终实测，含 exit code）

| 命令 | 结果 | exit |
|---|---|---|
| `verify-prototype.mjs --all` | **达标 29 / 不达标 1 / 共 30**（唯一不达标：S08） | **1**（有 1 案不达标，符合预期） |
| `check-stale.mjs` | ✓ 全部新鲜（30 案 + 1 产品入口） | **0** |
| `check-anchors.mjs` | ✓ 无死锚点（扫 31 个入口） | **0** |
| `check-docs.mjs` | 0 FAIL / 0 WARN / 13 PASS | **0** |

> ⚠️ **`check-docs` 这次是"假绿"，请 Lead 按 §5 处理。** 它没红不是因为不用改 README，
> 而是因为它复算的 `data.js` 是**旧快照**。实测证明见 §5。

---

## 2 任务 1：三条 `mono`

### 2.1 判据复核（与任务书一致）

`rules.mjs:54` 触发条件是 `m.type.monoProseShare > 0`；`probe.mjs:216-219` 只在
`t.inCode`（`el.closest('pre, code, kbd, samp, textarea')`）为假时累加 `monoProse`。
⇒ **规则禁的是"等宽落在 code 之外"，不是等宽本身。** 任务书这一句是对的。

我的独立复述（`m01-inventory.mjs`，1440 档，量的是"等宽字体 + 不在 code + 有文本"的叶子元素）：

| 案 | 原有 `<code>` | 等宽文本节点 | 等宽字符 | 按 tag.class 归并 |
|---|---|---|---|---|
| S07 | 0 | 103 | 327 | `span.p`×46、`span.k`×46、`span.code`×3、`dd`×2、`.folio > span`×6 |
| S13 | 0 | 29 | 147 | `span.depth`×7、`span.mono`×11、`td.mono`×10、`span.mono#azimuthOut`×1 |
| S21 | 0 | 83 | 228 | `td.face-data`×51、`span.slot__t.face-data`×6、`span.lockbar__no.face-data`×15、`dd`×3、`th`×3、`span.excl__no`×4、`span.warn__no`×1 |

三案的数目与任务书给的 327 / 147 / 228 **逐字符吻合**。

### 2.2 做法：包裹式，不是替换式

保留原 `span/td/dd/th` 与 class，只在**内部**套一层 `<code>`。理由：

- 三案的排版全靠 `.p/.k/.code/.depth/.mono/.face-data/.slot__t/.lockbar__no/.excl__no/.warn__no` 这些 **class 选择器**；
  替换元素会把规则的匹配对象一起换掉（`.p{font-family:var(--num)}` 会失效），
  包裹式只把文本节点下移一层，所有既有选择器照旧命中。
- 脚本对每处替换**断言命中数**（46/46/3/2/6、7/11/10、83），数目不对就整体抛错、不做部分成功。

### 2.3 必须处理的失效面（任务书没提，我实测出来的）

**`<code>` 从 UA 样式表里只带来一条**（`m11-ua.mjs`，Chrome 实测，对比对象是原 `span`）：

```
属性              span 基线       裸 <code>        差
font-family      Noto Serif SC   monospace       ★ 变了
letter-spacing   0.96px          normal          ★ 变了（因为 .mono 上设了 tracking，code 不吃）
color            rgb(18,52,86)   rgb(0,0,0)      ★ 变了（继承链被 UA 规则打断）
font-size/padding/border/margin/display/white-space  ——  全部相同
```

所以 CSS 里必须**逐条还原**，我加的是：

```css
code{font-family:inherit;font-size:inherit;font-weight:inherit;font-style:inherit;
     letter-spacing:inherit;line-height:inherit;color:inherit;
     background:none;padding:0;border:0;white-space:inherit}
```

### 2.4 三处「任务书没要求、但漏了会真坏」的地方

1. **S13 `#azimuthOut` 的 id 必须挪到 `<code>` 上。**
   内联脚本写 `azimuthOut.textContent = to + '°'`。若 id 留在 `<span>` 上、`<code>` 在内部，
   **用户点一次签发，`<code>` 就被整个抹掉** —— 初始态合规、交互后不合规，而闸门只渲染静态首屏，抓不到。
   现在写成 `<span class="mono"><code id="azimuthOut">…</code></span>`。

2. **S13 `log()` 动态生成的日志条目，原来会把等宽写到 code 外面。**
   `li.innerHTML = '<span class="log__when mono"></span>'` —— 静态页面里这段不存在，
   但用户点过任何按钮后就会出现。**实测确实发生**：改前点 2 次签发后 `prose` 从 0 变成 15 字符
   （`"10 月 29 日 05:46"`），每点一次涨 15。已改成 `'<span class="log__when mono"><code></code></span>'`。
   > 这一条是任务书完全没有覆盖的：**任务书的"包 code"清单是按静态首屏数的，动态生成的文本不在其中。**

3. **`<code>` 在 Chrome 里有一个独立的 AX 角色 `code`**（`m02-ax-check.mjs` 实测：`role="code"`，
   `name` 为空）。这意味着屏幕阅读器可能把「118」念成"代码 118"。
   → 这是本方案**唯一不能靠 CSS 消除**的语义代价，§6.2 单列，请 Lead 裁。

### 2.5 像素级验证（硬要求）

**先说噪声下限 —— 这一步不做，后面所有"逐字节相同"都是假的。** 我花了 **7 轮**才把测量做稳，
过程如实记在下面（每一轮都是先拿到矛盾结果、再定位、再改测量手法）：

| 轮 | 现象 | 定位手段 | 结论与处置 |
|---|---|---|---|
| 1 | 固定 sleep，同一 URL 连测 3 次：S13 整页图漂 1 次、S21 漂 1 次 | `m03-noise` | 等待不足 |
| 2 | 加"等 DOM 收敛"后 S21 仍漂 | `m03` | 不够 |
| 3 | 逐像素定位 | **自写 PNG 解码器**（`png.mjs`，无依赖）`m07-locate` | 差异 **32 px、最大 Δ=1/255**，全落在 `<img>` 覆盖区 ⇒ **图片解码器舍入**，不是排版 |
| 4 | 遮罩 `<img>` 后仍有 1184–1404 px 差（Δ=192！） | `m09-images` / `m16-diffab` | 发现 `_ab/` 里的图**被另一个仍在跑的任务覆盖**了 —— 先 `job_kill` 掉，再做诊断。这是一次**测量事故**，不是页面问题 |
| 5 | 遮罩图逐字节同、几何指纹却有差（自相矛盾） | `m15-s07dbg` / `m17-s07stable` | 差异全在 `.ghost` 的 `<text>`：`y=521.78,h=21.63` vs `y=524.07,h=20.00` |
| 6 | 到底是噪声还是页面行为？ | `m18-ghost` | **两侧各自 3/3 稳定，且两侧取到同一状态** ⇒ 是 S07 自己的两态，与改动无关 |
| 7 | 定稿 | `m19-ab-final` | 见下 |

**第 5–6 轮的根因（值得写进契约）**：S07 的 `buildGhost()`（`app.js:16-46`）用
`getBoundingClientRect()` 量 `.t` 的位置，把结果**烧进 SVG 的 x/y**；若那一刻 webfont 还没换上，
量到的是**回退字体的行盒**（h=21.63），之后不会自动重算 —— 页面只在 `resize` 里重建。
于是它有两个自洽态：
- **α**（字体未就绪时构建）：`y=521.78, h=21.63`
- **β**（字体就绪后构建 / resize 重建）：`y=524.07, h=20.00`

**这是 S07 页面自身的加载时序缺陷**（与本次改动无关：改前树同样两态、同样 3/3 稳定）。
我**没有去改 `app.js`**（不在允许清单里），而是让测量协议两侧都在 `fonts.ready` 之后
各补一次 `resize`（`app.js` 里真实存在的路径：`addEventListener('resize', () => buildGhost(0))`），
把状态统一钉到 β。**这不是给页面打补丁 —— 任意用户拖动一次窗口就会走同一条路径。**

> ⚠️ 顺带发现：`_CONTRACT.md` 若声称"S07 的透印层是可复现的"，这个两态说明**首屏透印的对齐位置取决于字体加载与布局的竞争**，
> 属于该案的真实缺陷（可观测：透印文字的 y 差 2.29px、行高差 1.63px）。**请 Lead 决定是否立一条给 S07 的修补项。**

**同进程 A/B 定稿（`m19-ab-final.mjs`）**：`_before-tree/` 放改前原件（sha256 已核对），与当前树并排跑在同一个 Chrome 里。
连跑 **2 次结论一致**：

```
S07 desktop  docH ★同(4146)  几何 ★0差  文本rect ★0差  遮罩像素 ★逐字节同  滚动 ★5/5
S07 tablet   docH ★同(8461)  几何 ★0差  文本rect ★0差  遮罩像素 ★逐字节同  滚动 ★5/5
S07 mobile   docH ★同(8648)  几何 ★0差  文本rect ★0差  遮罩像素 ★逐字节同  滚动 ★5/5
S13 tablet   docH ★同(5410)  几何 ★0差  文本rect ★0差  遮罩像素 ★逐字节同  滚动 ★5/5
S13 mobile   docH ★同(8423)  几何 ★0差  文本rect ★0差  遮罩像素 ★逐字节同  滚动 ★5/5
S21 desktop  docH ★同(3854)  几何 ★0差  文本rect ★0差  遮罩像素 ★逐字节同  滚动 ★5/5
S21 tablet   docH ★同(4702)  几何 ★0差  文本rect ★0差  遮罩像素 ★逐字节同  滚动 ★5/5
S21 mobile   docH ★同(9384)  几何 ★0差  文本rect ★0差  遮罩像素 ★逐字节同  滚动 ★5/5
→ 8/8 全同
```

判据说明（我用的口径，比"整页 PNG 逐字节"更严也更有解释力）：

- **几何签名**：`body *` 全量元素（排除新增的 `CODE`）× `rect` 四舍五入到 0.01px + 15 个排版属性（字号/字重/字距/行高/颜色/背景/display/visibility/opacity/white-space/margin/padding/border/align/transform/overflow/writing-mode）。
- **文本 rect**：每个文本节点的 `Range.getClientRects()` —— 比元素盒子更细，能抓住"字宽或换行变了"。
- **遮罩像素**：`img{visibility:hidden}`（盒子不变）后的整页 PNG，逐字节。
- **5 位滚动**：0/1/2/3/4 屏的视口 PNG，逐字节。
- **不遮罩的整页 PNG 不作为判据** —— 因为图片解码器有 Δ≤7 的抖动（第 3 轮实测），拿它下结论会把噪声当证据。

**S13 desktop 单独列**（那里正是我故意改的版心，不能混进上面的"8/8"）：

```
docH 4701 → 4622（-79px）　遮罩图尺寸不同（4701 vs 4622），无法整页比像素
→ 改用元素级（s13-cost.mjs）：宽度变化的元素 11 个，位置/高度变化 153 个
   11 个宽度变化 = 7×.clause__body + .annex__note + .levels__lead + .levels__note + #logEmpty
   153 个位移 = 上述变化把后续内容整体上移 26px 起的连带
```

### 2.6 交互后仍合规（`m14-interact.mjs`）

跑法是复刻 `probe` 的 mono 判据，在**每次交互之后**重算 `monoProse`：

| 案 | 操作 | `prose` | `<code>` 数 |
|---|---|---|---|
| S13 | 初始 | 0 | 29 |
| S13 | 点签发 ×2（flip 到 315°） | **0** | 30 |
| S13 | 再点 驳回 / 转呈 / 归档 | **0** | 31 / 32 / 33 |
| S21 | 初始 / 悬停 15 枚锁 / 切换 3 个时段 / 号牌翻转中 / 翻转后 / 展开互斥清单 | **全程 0** | 83 |

> 改前 S13 在"点 2 次签发"时 `prose` 已经是 **15**，每多一次操作 +15。这是 §2.4-2 那个缺陷的实测证据。

---

## 3 任务 2：S13 `empty-screens`

### 3.1 独立核实的几何（`s13-geom.mjs`，1440 档）

```
.dossier        1440px，grid-template-columns 16 × 67px，gap 16
.clauses         x=64  w=897  ← 67×11 + 16×10 = 897，正好 1–11 栏
.clause__body    x=64  w=480  max-width=480px（32em @15px）→ 右缘 544，占栏宽 53.5%
.signature       x=1060 w=316
⇒ 每屏 x≈544 → x≈1060 之间 516px 空着（占全宽 35.8%）
```
**审计的这段完全属实**，我复核无误。

### 3.2 但审计的第二个论断不成立

审计说"右边空着 516px，所以放宽 `max-width` 就能修好"。**逐屏按 x/y 分桶后（`s13-attrib` / `s13-ydist`）发现是两种不同的空法**：

| 屏 | 填充 | 空在哪 | 真正的原因 |
|---|---|---|---|
| 3 | 0.14 | bare 点**均匀散布在全部 12 个 x 桶**（17–30 个/桶） | 整屏内容稀疏，**与 `max-width` 相关** |
| 5 | 0.14 | x≥840 的 4 个桶 **30/30 全空** | `.levels/.log` 只占 1–11 栏，**放宽正文也填不到 x>960** |
| 6 | 0.17 | 同上（x≥840 全空） | 同上，且这是**末屏**，内容天生少 |

⇒ 屏 5/6 的空**不是正文行长造成的**，是「栏位只用到 11/16」+「末屏内容少」造成的。

### 3.3 我试了什么（`s13-variants` / `s13-matrix` / `s13-optB` / `s13-final`）

**（a）照任务书试 560/600/640/680/720，逐个跑 `inspect.mjs`** —— 结果与任务书给的不一样：

| `max-width` | FAIL | `measure` WARN | filled (1440) |
|---|---|---|---|
| 480（原样） | `empty-screens` | 无 | `[0.55,0.22,0.14,0.30,0.14,0.17]` |
| 560 | `empty-screens` | 无 | `[0.55,0.24,0.16,0.30,0.20,0.18]` |
| 600 | `empty-screens` | 无 | `[0.55,0.24,0.16,0.31,0.26,0.16]` |
| 640（只改正文这一组） | `empty-screens` | 无 | `[0.55,0.25,0.16,0.32,0.26,0.17]` |
| **640（改全套 6 个选择器）** | **0** | **无** | `[0.55,0.25,0.16,0.31,0.28,0.24]` |
| 680 | 0 | **有（91 字符）** | `[0.55,0.25,0.13,0.31,0.25,0.24]` |
| 720 | `empty-screens` 复发 | **有（96 字符）** | `[0.55,0.25,0.12,0.31,0.25,0.18]` |

**任务书说"640 → 0 FAIL"，只有在同时放宽 6 个选择器时才成立；只放宽 `.clause__body` 时 640 仍然 FAIL（屏 5/6 的 0.17/0.17）。**
我在图省事之前先做了 24 组交叉矩阵（clause × notes），**24 组全部 FAIL** —— 原因是我那批矩阵把 `.colophon__*` 也放宽了，页高被压短、末屏内容更少。
这说明**这个指标对"末屏多高"极其敏感，能不动的地方不能动**。

**（b）我也试了另一条路：不动行长，改收窄栏位**（`s13-optB`：`.clauses/.levels/.log` 改成 1–8 / 1–9 / 1–10 栏）：

| 变体 | FAIL | `measure` | filled |
|---|---|---|---|
| 1–8 栏 | `few-pictures` + `empty-screens` | 无 | `[0.55,0.22,0.15,0.26,0.15,0.19]` |
| **1–9 栏** | **0** | 无 | `[0.55,0.22,0.15,0.28,0.23,0.20]` |
| 1–10 栏 | `empty-screens` | 无 | `[0.55,0.22,0.15,0.27,0.16,0.18]` |

1–9 栏也能过，而且**完整保留 32 汉字的行长**。但我**没选它**，理由见 §3.5。

### 3.4 我选的值与理由

**选中：`max-width: 640px`，只作用于 ≥1440px，且只作用于 6 个「正文 + 附注」选择器。**

```css
@media (min-width: 1440px) {
  .clause__body, .annex__note, .levels__lead,
  .levels__note, .log__empty, .log__error { max-width: 640px; }
}
```

理由（不只是"能过闸门"）：

1. **设计意图还在不在**：`_specs/S13.md` 字段 5 写「正文 15px / 26px 行高，**行长限制 32 个汉字**」。
   640 / 15 = **42.7 汉字/行**。**行长从 32 变成 43，这是对规格的实质偏离，我不掩饰。**
   但同一句里还有「正文条款只占 1–11 栏」——897px 的框里装 480px 的行，右半截永久空着，
   这不是"留白节奏"（规格另有明文：条款之间 2 个基线、函件与附件之间 6 个基线），是实现把"行长"当成了"版心"。
   ⇒ 我认为这属于**实现缺陷**，不是设计主张；修正它需要动一个数，动哪个都有代价。
2. **不触发 `measure`**：85 字符，低于 88 的告警线。680 就会到 91，不能取。
3. **不连页脚一起放宽**：实测会把填充从 0.24 压到 0.17 并重新 FAIL。
4. **只写桌面档**：768 / 390 两档的 `filled`、`docH`、`measureChars` 与改前**逐项相同**
   （768: `5410 / 64 / [0.51,0.30,0.32,0.30,0.29,0.28]`；390: `8423 / 46 / [0.48,…,0.36]`）。
5. **代码里写了解释**（style.css 末尾 33 行注释）：逐屏归因、梯度表、为什么是 640、为什么不碰页脚、为什么必须放在文件末尾（本文件已有 3 处"基础规则写在媒体查询之后"的先例）。

### 3.5 为什么没选"1–9 栏"（虽然它保住了 32 汉字）

它把 `filled` 压到 `[0.55,0.22,0.15,0.28,0.23,0.20]`，**末屏 0.20 —— 正好压在阈值线上**，而 `empty-screens` 的判据是 `< 0.2`。
我在 `s13-sensitivity.mjs` 里做过敏感性测试：对 640 方案施加"与改动无关的扰动"（只改页脚内距 8/16/32/64px），
`p-32` 那一档就 FELL 到 `0.12` 并 FAIL。**两个候选都站在刀刃上**，1–9 栏更靠边（0.20 vs 0.24）。
选 640 是因为它的余量更大。

> ⚠️ **这一点必须如实说：`empty-screens` 在本案上是"结构性的临界指标"。** 它不是在"过/不过"之间稳定二分的，
> 而是在 ±0.04 的范围内摆动。今天能过，未来任何一处无关的排版微调都可能让它复发。见 §6.4。

---

## 4 改前备份与哈希

```
deliverables/69-exec/_before/    ← 6 个源文件的改前副本
deliverables/69-exec/_before/SHA256-BEFORE.txt
deliverables/69-exec/_before-tree/  ← 完整可运行树（含 _fonts），用于同进程 A/B
```

| 文件 | 改前 sha256（前 16） | 改后 sha256（前 16） | 字节（前 → 后） |
|---|---|---|---|
| S07 index.html | `3686dfb167597c80` | `354f0db3d1308f1e` | 18498 → 19837 |
| S07 style.css | `b3d3932ccfdd4a4f` | `5af44828329c2061` | 13478 → 14104 |
| S13 index.html | `2e3bf3d86853ec26` | `feadb3699c5ea575` | 25482 → 26237 |
| S13 style.css | `2ed2e686d29ccd10` | `75f35a7501d38b74` | 40133 → 42845 |
| S21 index.html | `a9b03a0c3d0722b6` | `1b36c5bb5a64f38d` | 33357 → 34436 |
| S21 style.css | `21a7d3bc2c63c8b8` | `0a60c9c0fc5f880a` | 37886 → 38512 |

只动了允许改的 6 个文件。`_specs/`、`_selection/`、`templates/`、`tools/`、`README*`、`_build/` **一个字节都没动**
（`git status` 对它们的改动全部在开工前就已存在，见页首）。

---

## 5 ⚠️ `check-docs` 是假绿：README 必须改，但我不改

### 5.1 事实链（`docs-proof2.mjs`，只读，用 `vm` 执行 data.js，和 check-docs 同法）

```
--- data.js 快照（仓库里那份）---
  30 案中 FAIL=0：26
  有 FAIL：S07(1:mono) S08(2:palette-terracotta/font-count) S13(4:mono/shadow/button-fx/empty-screens) S21(1:mono)

--- 模拟「重新生成 data.js 之后」（gate 取当前 report.json）---
  30 案中 FAIL=0：29
  有 FAIL：S08(2:palette-terracotta/font-count)
  相对快照变化的案：S07 S13 S21
```

`data.js` 文件头写着「由 collect-schemes.mjs 生成，勿手改」，它是 `collect-schemes.mjs` 从
`.inspect/report.json` 读出来写死的**快照**。而 `check-docs` 的 `nums/gate`
（`check-docs.mjs:407,598-607`）正是拿这个快照去复算 README 里的「26 案 FAIL=0」。

⇒ **`check-docs` 报 `✓ nums/gate 闸门 FAIL=0 的案数 = 26，与实测一致`，是因为它和 README 引用的是同一个旧快照，
不是因为它测到了真实当前状态。** 这是一个"自洽但不正确"的绿灯。

### 5.2 一旦 `collect-schemes.mjs` 重跑，会立刻红的 README 句子

| 位置 | 原文 |
|---|---|
| `README.md:160` | `**26 个闸门 FAIL=0**。剩下 4 个的 8 条失败逐条列在…` |
| `README.md:496` | `node prototypes/_build/verify-prototype.mjs --all        # 文中写 26 案 FAIL=0` |
| `README-EN.md:554` | `26 个原型机械闸门 FAIL=0。…剩余 8 条 FAIL…` |

再加上审计报告 §5.2 已列的 C1–C5（「剩下 4 个的 8 条失败」「剩余 8 条 FAIL」等），
这些数在本次修复后全是错的（应为 29 案达标 / 1 案 2 条 FAIL）。

### 5.3 我为什么不改

任务书明写「若 `check-docs` 报 FAIL 停下报告，不要改 README」。它**没报 FAIL**，但原因是 §5.1。
按同一条理由（README 改动涉及中英两版 + 多处 + 与 `data.js` 重生成必须原子），**我不动 README，也不重跑 `collect-schemes.mjs`** —— 后者会改写 `_selection/data.js`，而 `_selection/` 在禁止清单里。
**请 Lead 把这三件事当成一个原子动作处理：重跑 collect-schemes → 更新 README 中英两版 → 跑 check-docs。**

---

## 6 我拒绝执行的步骤 / 与任务书不符的地方

### 6.1 与任务书不符（3 条实测结论）

1. **「640px → RESULT: 0 FAIL」并不普遍成立。**
   只在"同时放宽 6 个选择器"时成立；只放宽 `.clause__body` 时 640 仍 FAIL（屏 5/6 = 0.17/0.17）。
   而且我这批实验里 24 组交叉矩阵**全部 FAIL** —— 与我多放宽了 `.colophon__*` 有关。
   ⇒ 结论：**"改一个数就能过"这个叙述是真的，但它对"改哪几个选择器"极其敏感，不是单一变量。**

2. **`max-width` 不是 empty-screens 的唯一成因，屏 5/6 的空与它无关。**
   屏 5/6 的 bare 点在 x≥840 处 30/30 全空，因为 `.levels/.log/colophon` 只占 1–11 栏。
   放宽正文填不到那里。审计"右侧 516px 永久空着"的说法只描述了屏 3，没描述屏 5/6。

3. **`<code>` 并非"零语义代价"。** 见 §6.2。

### 6.2 我不建议照单全收的地方：`<code>` 的 AX 语义

任务书说「`<code>` 只是把'这是数据/编号'写进标记，不改变语义」。**这句话只对了一半。**

实测（`m02-ax-check.mjs`，Chrome `Accessibility.getFullAXTree`）：

```
<p>第 <span>118</span> 页</p>          →  StaticText "第 " / StaticText "118" / StaticText " 页"
<p>第 <span><code>118</code></span> 页</p> →  StaticText "第 " / **role=code** / StaticText " 页"
```

`<code>` 在 AX 树里是**独立角色**（`role="code"`，`name` 为空）。后果：
- 屏幕阅读器可能把它读成"代码 118"或在停顿上不同；
- 页面上有 **215 处**（103+29+83）这样的节点。

**我的判断**：页码、分类号、时刻、实测值确实是 datum，`<code>` 在语义上不算错（全库另外 26 案、3048 处也是这么用的，
一致性能带来好处）；但"完全不影响读法"这个说法**不成立**，我不替它背书。
若 Lead 认为 AX 一致性优先，正确做法是**不用 `<code>`，改用 `role="text"`/`<data>` + 把等宽限制在真正的测量语境内**
—— 但那样 `mono` 规则仍会报（`probe` 只认 `pre/code/kbd/samp/textarea`），等于放弃清零。
**这是一次真实的取舍，不是零代价。**

### 6.3 我拒绝做的

- **没有 commit**（任务书要求）。
- **没有改 README / 没重跑 collect-schemes**（§5.3）。
- **没有用"整页 PNG 逐字节"这个口径去宣称 mono 修复"零像素代价"而隐去 S13 desktop 的版心改动** ——
  两者分开报（§2.5），S13 desktop 的代价单列并量化到 11 个宽度变化元素 + 153 个位移元素。
- **没有为了过闸门而收窄栏位到 1–9 栏**（虽然它保住了 32 汉字行长）—— 因为它的填充余量更小（0.20 vs 0.24），
  且会偏离规格里明写的「1–11 栏」。**我选了偏离"行长"而不是偏离"栏位"**，理由写在 §3.4；
  如果 Lead 认为「1–11 栏」比「32 汉字行长」更不可动，**请驳回我的选择，改走 1–9 栏**。

### 6.4 必须由 Lead 决策的遗留风险

1. **`empty-screens` 在 S13 上是临界指标。** 640 方案最差屏 0.24、阈值 0.20；无关扰动（页脚内距 32px）就能把它打到 0.12。
   今天过，不代表下次改动后还过。建议在 `_CONTRACT.md` 里登记这个脆弱性，而不是当作"已修好"。
2. **S13 的行长从 32 汉字变成 42.7 汉字**，与 `_specs/S13.md` 字段 5 的明文有偏离。规格若不能改，这个修复就是"用规格换闸门"。
3. **`font-count` WARN 三案都还在**（3 族）。任务书没要求，我没动。
4. **新发现（不在任务书范围内）：S07 的透印层有两个自洽态**，取决于 `buildGhost()` 量矩形时 webfont 是否已就绪：
   - 状态 α：`y=521.78, h=21.63`（回退字体行盒）
   - 状态 β：`y=524.07, h=20.00`（真正字体）
   两者的透印文字相差 **y 2.29px、行高 1.63px**，也就是说"纸背镜像与正面几何对齐"这件事在两个状态下不完全一致
   （`app.js:24` 只做了 `translate(W,1) scale(-1,1)`，1px 纸厚偏移是对的，但行盒高度不同）。
   这不是本次改动造成的（改前树同样两态），但它是 S07 的真实缺陷。**建议立项修补**：在 `fonts.ready` 之后补一次 `buildGhost(0)`。
   我没有改 —— `app.js` 不在允许清单里。

---

## 7 证据文件索引

| 文件 | 内容 |
|---|---|
| `deliverables/69-exec/_before/` | 6 个改前源文件 + `SHA256-BEFORE.txt` |
| `deliverables/69-exec/_before-tree/` | 完整可运行改前树（含 `_fonts`），A/B 用 |
| `deliverables/69-exec/m01-inventory.mjs` | 等宽元素清单（§2.1） |
| `deliverables/69-exec/m02-ax-check.mjs` | `<code>` 的 AX 角色（§6.2） |
| `deliverables/69-exec/m03..m09-*.mjs` | 噪声下限的逐级定位（PNG 逐像素、flags、图片遮罩） |
| `deliverables/69-exec/png.mjs` | 自写 PNG 解码器（零依赖；逐像素定位用） |
| `deliverables/69-exec/m10-capture.mjs` / `_pix/` | 三案×三档×两次的全量基线 |
| `deliverables/69-exec/m15-s07dbg.mjs` / `m17-s07stable.mjs` / `m18-ghost.mjs` | S07 `.ghost` 两态的定位（§2.5 第 5–6 轮、§6.4-4） |
| **`deliverables/69-exec/m19-ab-final.mjs` / `_ab2/`** | **定稿的同进程 A/B（§2.5）** |
| `deliverables/69-exec/m13-ab.mjs` / `_ab/` | 中间版本的 A/B（保留，用于说明为什么改测量手法） |
| `deliverables/69-exec/m14-interact.mjs` | 交互后 mono 合规（§2.6） |
| `deliverables/69-exec/s13-geom.mjs` | S13 几何（§3.1） |
| `deliverables/69-exec/s13-attrib.mjs` / `s13-ydist.mjs` | 逐屏 x/y 归因（§3.2） |
| `deliverables/69-exec/s13-variants.mjs` / `s13-matrix.mjs` / `s13-optB.mjs` / `s13-final.mjs` / `s13-sensitivity.mjs` | 变体梯度、24 组矩阵、栏位方案、敏感性（§3.3–3.5） |
| `deliverables/69-exec/s13-cost.mjs` / `_ab/s13-cost.json` | S13 desktop 的改动代价（11 + 153） |
| `deliverables/69-exec/docs-proof2.mjs` / `_docsim/data.sim.js` | check-docs 假绿的证明（§5） |
| `deliverables/69-exec/png.mjs` | 自写 PNG 解码器（逐像素定位用；不依赖任何库） |
