# 补充项 · `check-texture.mjs`：一条"一破全假"的规则，此前无人检查

2026-10-31 · 由 P1a 锐评 Agent 指出「最该做却没做」后新增 · **终验后重写两版**

---

## 0. 这个闸门自己先"静默通过"了一次

第一版上线时报「违规 0 / exit 0」。终验 Agent 发现 **S02 的 `body` 上就挂着
`background-image: url("assets/card-grain.png")`**，而闸门没报。

**一个专门防"静默通过"的闸门，自己在静默通过。** 这比没有这个闸门更危险，
因为它提供了"已检查"的错觉。

### 三版演进（每一版都是被独立证据打穿后重写的）

| 版本 | 做法 | 缺陷 | 谁发现 |
|---|---|---|---|
| v1 | 正则抓「选择器 { 声明 }」 | 匹配消耗了 `}`，下一个模式又要求它以 `}` 或行首开头 ⇒ **相邻规则只看到隔一条**。S02 恰在被跳过的一半里 | 终验 Agent（在 S24 注入 `background-image` 复现 escape）|
| v2 | 花括号状态机，但只记**深度 0 进入的块** | `@media { body { … } }` 里内层规则的 `decls` 永远是 null ⇒ 被 `if (!r.decls) continue` 跳过，漏 22 条 | Lead 自查（body 规则数 61 vs 独立方法 83）|
| **v3** | 对**每个 `{`** 记录块、配对 `}` 取声明；选择器回溯到上一个 `}`/`;`/`{` | — | 规则数 **85**，与独立计数一致 |

### 为什么 ab-texture 6/6 没能发现 v1 的缺陷

第一版的 6 个变异**全部是"追加到文件末尾"**，而那个位置恰好有未被消耗的 `}` 作锚点。
**测试盲区保护了这个缺陷。** 这与本仓库 §9.23 记的是同一类：
验证器写错时，它会给你绿灯。

v3 的变异测试（`ab-texture.mjs`，**7/7**）专门覆盖前两版漏掉的形态：

| 变异 | 形态 | 期望 |
|---|---|---|
| M1 | **插到文件中间**（不是末尾） | 红 |
| M2 | **`@media` 内嵌的 body 规则** | 红 |
| M3 | **两个相邻 body 规则，第二个带图** | 红 |
| M4 | `background` 简写含 gradient | 红 |
| M5 | （反向）`body::before` 挂图 | 绿 |
| M6 | （反向）`body.is-running` 挂图（非裸 body） | 绿 |
| M7 | （反向）纯色 body | 绿 |

---

## 1. 为什么这条规则是"一破全假"

`_CONTRACT.md` §9.2 原话：

> 这是**会伪造通过**的一条：探测器 `bgBehind()` 会在祖先链上找到
> `background-image` 就整条跳过对比度检查。纹理挂 `body` 会有两个后果——
> ① 所有对比度问题**静默通过**；② `filled`／空屏判定被刷成假的满分，
> `empty-screens` 规则失去意义。

代码证据 `tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs`：

```js
// :254-262
const bgBehind = (el) => {
  for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (cs.backgroundImage !== 'none' || ...) return null;   // body 有图就在这里短路
    ...
  }
};
// :282
const bg = bgBehind(t.el); if (!bg) continue;                 // 整条跳过
```

⇒ 该案**所有文字的对比度检查被跳过**，`lowContrast` 恒为 0。

而 2026-10-31 之前，`prototypes/_build/` 下没有任何脚本检查过它。

---

## 2. 它抓到的真实违规：S02

### 事实

`prototypes/S02-gilded-symmetry-salon/style.css` 的 `body` 规则里原本有：

```css
body {
  margin: 0;
  background-color: var(--card);
  /* 炭黑卡纸的纤维：程序化生成的 128px 平铺位图，不是渐变 */
  background-image: url("assets/card-grain.png");
  ...
}
```

注释说明作者**知道**自己在挂纹理——但挂错了载体。

### 实测：S02 本来是"侥幸正确"

手工算 S02 的文字对比度：

| 前景 | 背景 | 比值 | 判定 |
|---|---|---|---|
| `--ivory` #EFE6D0 | `--card` #0B0B0F | **15.81:1** | AA |
| `--ivory-2` #B9B09A | 同上 | **9.11:1** | AA |
| `--gold` #B8860B | 同上 | **6.04:1** | AA |
| `--gold` | `--band` #14100A（表头） | **5.82:1** | AA |

`--dirty`(1.48:1) 与 `--band`(1.04:1) 只用于**边框与背景**，不承载文字
（`--dirty` 全部出现在 `border`/`inset`，`--band` 是表头底色、文字用 `--gold`）。

所以 `lowContrast: 0` 的结果是对的 —— 但**是因为碰巧，不是因为闸门检查过**。

### 修法

按契约 §9.2 把纹理移到伪元素：

```css
/* body 保持纯色 */
body { background-color: var(--card); ... }

body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image: url("assets/card-grain.png");
  background-repeat: repeat;
  pointer-events: none;
}
```

`z-index: -1` + `position: fixed` 让它铺在内容之下、又不参与滚动
（与原 body 背景的视觉行为一致）；`pointer-events: none` 保证不吃鼠标事件。

### 修完后重渲染，验证闸门恢复视力

```
w=1440  lowContrast=0  body=#0b0b0f
w=768   lowContrast=0  body=#0b0b0f
w=390   lowContrast=0  body=#0b0b0f
findings: WARN:font-count, WARN:no-footage
```

`body` 现在被正确读成纯色 `#0b0b0f`，`lowContrast=0` 是**经过检查的 0**，
不再是失明的 0。重渲染后 FAIL=0、WARN=2（均为既有警告）。

---

## 3. 其余 30 案：全部合规

```
纹理载体闸门：31 个 style.css（30 案 + 产品入口）
  解析到的 CSS 规则总数    4821
  其中 body/html 规则     85
  违规                     0
合计 FAIL 0 / WARN 0
```

85 条 body/html 规则全部检查过，**0 违规**。
这个数字与独立方法（正则 token 边界）的结果完全一致 —— v3 的解析器没有漏。

### 刻意不查的

- **`body::before` 等伪元素** —— 契约**推荐**的做法（M5 反向测试专门验证不会被误判）
- `html` 上的纹理 —— 契约只点名 `body`；实测本仓库 0 例，先不扩大范围。

---

## 4. 自检告警：防止解析器再坏一次

v1 报「违规 0」时自己打印的「body 规则数 34」就是征兆，但**它没有任何自检**。

v3 加了：

```js
if (stats.allRules < stats.checked * 20) {
  add('WARN', '*', 'T0-too-few-rules', '只解析到 N 条 CSS 规则 …解析器可能有缺陷');
}
```

实测每文件平均 155 条规则，阈值 20 有足够余量；一旦解析器再退化，这条会先红。

---

## 5. 复算

```bash
node prototypes/_build/check-texture.mjs            # 闸门本体
node prototypes/_build/check-texture.mjs --json     # 机器可读
node deliverables/73-verify/ab-texture.mjs          # 变异测试 7/7
node deliverables/73-verify/_chk-parse.mjs          # 解析器与独立方法交叉验证
node deliverables/73-verify/_chk-s02-contrast.mjs   # S02 手工对比度复算
```
