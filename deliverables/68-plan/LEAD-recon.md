# Lead 侦察记录 · 第 8 轮

- 测量时刻：2026-10-28 22:52 – 23:10 (Asia/Shanghai)
- HEAD：`ce4ea78`
- 工作区：干净（除 986 个未跟踪的 deliverables 探针文件）

---

## 核心发现：`_selection` 有一个冻结 6 天的闸门报告

这是本轮最重要的发现。它不是"产品没有守门员"，而是**"产品有过守门员，报告还在库里，但已经 6 天没更新，且没有任何机制发现这件事"**。

### 事实

```
prototypes/_selection/.inspect/report.json
  at:                 2026-10-21T19:51:17.207Z
  url:                prototypes/_selection/index.html
  findings:           2 条（都是 WARN: no-footage, measure）
  viewports:          1440 / 768 / 390
  已入库:             是（1f30e7d, 2026-10-22 03:52）
```

而 `_selection/` 在那之后被改了 **29 次提交**，最近一次是 `d49ed74`（2026-10-28 02:33）。

### `check-stale.mjs` 为什么不报警

```js
// 实测
check-stale.mjs 提到 _selection: false
check-stale.mjs 提到 templates : false
```

它只遍历 `/^S\d{2}-/` 的目录。`_selection` 和 `templates` 不在其中，所以**这个报告永远不会被判定为"陈旧"**。

### 报告之后，`_selection/` 被改了多少

```
文件              提交次数   行数变化
app.js               9 次    +1118 / -42
style.css            7 次     +842 / -36
index.html          10 次     +228 / -35
prompt-copy.js       8 次    +1590 / -91
data.js             11 次     +216 / -150
prompts.js           8 次    +2152 / -421
wizard.html          1 次       +2 / -2
wizard.css           1 次       +7 / -0
wizard.js            2 次      +59 / -6
────────────────────────────────────────────
合计                          +6214 / -783 行
```

### 报告数据 vs 现状：已完全不符

| 指标 | 2026-10-22 报告 | 现在实测 | 差 |
|---|---|---|---|
| `surfaces.hairlines` | **0**（三档全 0） | **24**（CSS 里 1px border 数） | 报告说零，实际 24 处 |
| `surfaces.shadowStatic` | **0** | **2** | 报告说零，实际有 |
| `surfaces.gradients` | **0** | **1** | 报告说零，实际有 |
| `type.sizes` | `[13,14,16,17,20,24,74]` | token 定义 `[13,14,15,16,17,20,24,34]` | 报告缺 15/34，多 74 |
| `page.screens` | 15.2 屏（height 13635） | 本轮 390 档实测 scrollH ≈ 2752–3579 | 数量级不同 |

报告里 `hero.size = 74px`（1440 档，5.1vw），`39.9px`（768 档），`28px`（390 档）。

**注意**：`surfaces.hairlines = 0` 这一项特别值得警惕——报告声称「三档全 0 处细线」，而现在 CSS 里有 24 处 1px border。要么当时 CSS 里真的没有（即这 24 处全是之后加的），要么当时的检测口径不同。无论哪种，**这份报告都不能用来证明"现在没问题"**。

---

## 一个我差点搞错的点：verify-prototype **能**跑 `_selection`

```
$ node prototypes/_build/verify-prototype.mjs _selection
✗ _se _selection
    html 22K / css 71.6K / FAIL 0 / WARN 2 / 真图 30 / 截图 10
    · 缺 assets/CREDITS.md
    ~ 缺 assets/credits.json（若素材全是程序化生成可接受）

达标 0 / 不达标 1 / 共 1
```

**只要把目录名当参数传进去，它就跑。** 所以"产品不在闸门范围内"不是能力的缺失，**只是 `--all` 的正则 `/^S\d{2}-/` 选不到它**。

但这里有个陷阱：它报的 `FAIL 0 / WARN 2` **不是当场算的**，是读 `report.json`（第 109-118 行）：

```js
const rep = join(dir, '.inspect', 'report.json');
if (!existsSync(rep)) { out.problems.push('没有 .inspect/report.json（没渲染过）'); return out; }
const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
```

→ **`FAIL 0` 是 6 天前的结论。** 当场算的那 6 项（远程资源/禁用字体/Emoji/body 背景图/引用缺失/CREDITS）它确实跑了，都通过。

唯一的真问题：**缺 `assets/CREDITS.md`**。而对照 30 个原型：

```
30 案里有 assets/CREDITS.md 的: 30 / 30
_selection 有 assets/ 目录:     False
```

产品把 30 案的截图渲染给用户看（`app.js` 的 `shotFig() → <img src="prototypes/Sxx/.inspect/*.jpg">`），**自己却不承担署名义务**。这是真实的不对称。

---

## 根因链：`--s-h1` 的往返

`eed3587`（2026-10-25）的 commit message 里写着完整决策过程：

> ① h1 从 `clamp(34px,5.2vw,74px)` 降到 `clamp(30px,4vw,56px)`，max-width 15ch→22ch
>    ⇒ 标题从 2 行收成 1 行，高度 169px → 59px
> ...
> 改动面 3 个文件，都在 _selection/ 内（**三道闸门本就不扫这个目录**）

`d49ed74`（2026-10-28，本轮前一个 commit）又把 `font-size: clamp(30px, 4vw, 56px)` 改回 `font-size: var(--s-h1)`，注释里写着：

> 这里原来是 `clamp(30px, 4vw, 56px)` 的字面值，于是 `--s-h1`（clamp(34px, 5.2vw, 74px)）
> 在 2026-10-28 之前**零引用**...（与上一轮 --s-15 是同一类 bug 的两个方向）

**关键**：`eed3587` 当时**是有意**改的（为了让首屏出 1 张完整卡），`d49ed74` 也是**有意**改回去的（为了让 `--s-h1` 不再是死变量）。两次都有充分理由，矛盾的是**两个目标本身冲突**：

- 目标 A：首屏 1 张完整卡 → 需要 h1 小
- 目标 B：`focal-point` 要求主导元素 → 需要 h1 大

而**没有任何机制记录这个往返**，也没有机制说"接回 `--s-h1` 会让 1024×900 的首屏完整卡从 1 变 0"（这是我上一轮自己 A/B 测出来的，写在了 `LEAD-h1-regression.md`）。

---

## 静态 vs 动态规则：两套判据，同级不同级

规则有两份实现：

| | 位置 | 规则数 |
|---|---|---|
| 静态 lint | `tools/.../scripts/lint.mjs` | 23 条 |
| 动态闸门 | `tools/.../scripts/lib/rules.mjs` | 53 条（含 51 唯一 id） |

**同名但分级不一致（2 条）**：
| 规则 | 静态 | 动态 |
|---|---|---|
| `numbering` | WARN | **FAIL** |
| `outlined-box` | WARN | **FAIL** |

**只在动态里有、静态完全覆盖不到的 35 条**：
`headline-lines statement-length hero-words mixed-font-headline text-shadow button-fx dashed icon-cards card-rows pill-nav palette-claude palette-terracotta palette-cream palette-purple default-link contrast font-count font-fallback size-count body-size grey-body first-action few-pictures no-real-pictures no-footage side-scroll blend-text measure small-text all-centred ui-wrapper overflow broken-image no-hero focal-point`

**只在静态里有的 11 条**：`purple claude-palette lorem copy cta-copy default-font transition-all ease-in scale-zero h-screen bounce`

→ 两套实现不是同一套规则的不同粒度，而是**两个不完整的投影**。

---

## `tools/` 完全不入库，所以 lint 的豁免机制对下游不存在

```
$ git check-ignore -v tools/.../lint.mjs
.gitignore:2:tools/  tools/.../lint.mjs
$ git ls-files tools | measure
0
```

**`tools/` 被跟踪的文件数 = 0。**

这意味着：
- `lint.mjs` 不在仓库里 → 克隆仓库的人拿不到它
- 它的豁免机制 `taste-skill-ignore` 也不在仓库里
- 任何"给产品加 lint 豁免注释"的做法，都只在**本机**有效，对下游无效

---

## `lint.mjs` 扫数据文件会报 30 FAIL

```
$ node lint.mjs prototypes/_selection/data.js
  [mono]   27×
  [shadow]  3×
  [em-dash] 1×
→ RESULT: 30 FAIL, 1 WARN
```

`data.js` 是 307KB 的**数据文件**，内容全是「S01 用了 Martian Mono / S02 有 box-shadow: ...」这类**描述别的网站**的文本。lint 按行正则，把它们当成了产品自己的违规。

→ **裸跑 lint 得到的数字不可用。** 必须区分「代码/CSS」与「数据」。

---

## `hairline`：静态 FAIL 但闸门里其实只是 WARN

```js
// lint.mjs 静态：无条件 FAIL
['FAIL', 'hairline', /...border-(top|bottom|left|right)\s*:\s*(0?\.5|1)px.../]

// rules.mjs 动态：按数量分级
if (s.hairlines) add(s.hairlines >= 2 ? 'FAIL' : 'WARN', 'hairline', ...)
```

**30 案实测**：`hairline` 出现 **FAIL=0, WARN=3**。

`style.css` L10 自述「5 行分隔线 1px → 2px（1px 被判为装饰性细线）」——「被判为」这个说法在静态 lint 下成立（FAIL），在动态闸门下不成立（WARN）。

且实测 `style.css` 剥注释后 border 宽度分布：
```
{"1":24, "2":14, "3":1, "4":2, "5":3}
```
**24 处 1px**，不是自述暗示的"已全部改成 2px"。

---

## `mast-kicker`：类名腐化，不是真违规

```
index.html:39   <p class="mast-kicker">网站设计风格方案 · 选型台</p>
wizard.html:20  <p class="mast-kicker">网站设计风格方案 · 选型向导</p>
style.css:123   .mast-kicker { font-size: var(--s-14); color: var(--ink-3); margin-bottom: 8px; }
```

样式已经没有 kicker 特征（14px、无 `text-transform`、无 `letter-spacing`）。但 `lint.mjs` 的 `eyebrow` 规则匹配 `class="...(kicker|eyebrow)...`，所以永远报 FAIL。

→ 这是**类名腐化**（该清理，但不影响渲染），不是真缺陷。

---

## 30 案闸门现状（复核，与上一轮一致）

```
FAIL 总数 6 / WARN 总数 79
  mono            FAIL=3  （S07 S13 S21）
  font-count      FAIL=1  （S08，WARN=27）
  palette-terracotta FAIL=1 （S08）
  empty-screens   FAIL=1  （S13）
  达标 26 / 30
```

`hairline` 在 30 案里全是 WARN（3 案），从未 FAIL。

---

## 待裁决的问题

1. `_selection` 的冻结报告算不算"说了一半真话"？它有报告、报告入库、但数据已过期 6 天。**这个状态下，"有守门员"和"没守门员"哪个更危险？**（我的判断：有冻结报告更危险，因为它给人"检查过了"的错觉。）
2. `--s-h1` 的往返暴露了「首屏完整卡」与「focal-point」两个目标冲突。**该保留哪个？** 我上一轮已记录 1024×900 从 1 卡退化成 0 卡，并选择接受退化保留 `--s-h1`。
3. 静态/动态两套规则的分级不一致，要不要统一？统一到哪一边？
4. `tools/` 不入库，那"守卫"这个词在这个仓库里到底能不能成立？
