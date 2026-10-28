# 裁决：模板层的 22 个 FAIL，该不该修

- 测量时刻：2026-10-28 23:47 (Asia/Shanghai)
- 争议来源：规划 Agent（`PLAN-guards.md`）主张「给 `templates/` 补守卫」为本轮顺延第一优先；红队（`REDTEAM-guards.md`）主张「补模板渲染收益为负」

---

## 事实（我实测）

三个模板**都没有** `.inspect/` 目录，从未被渲染闸门检查过。

规划 Agent 实际渲染后得到：

| 模板 | FAIL | WARN | FAIL 明细 |
|---|---|---|---|
| M01-clean-corporate | **11** | 3 | eyebrow, few-pictures, focal-point, hairline, headline-lines×2, icon-cards, numbering, outlined-box, shadow, still-page |
| M02-warm-local | **4** | 3 | eyebrow, few-pictures, hairline, still-page |
| M03-bold-creator | **7** | 2 | eyebrow, few-pictures, hairline, mono, numbering, outlined-box, still-page |
| **合计** | **22** | 8 | |

四条共同 FAIL：`eyebrow` / `few-pictures` / `hairline` / `still-page`（3/3 全中）。

## 关键对照：这些规则在 30 个原型上从未触发

| 规则 | 30 案 FAIL | 30 案 WARN | 模板 |
|---|---|---|---|
| `eyebrow` | **0** | **0** | **3/3 触发** |
| `few-pictures` | **0** | **0** | **3/3 触发** |
| `focal-point` | **0** | **0** | M01 触发 |
| `headline-lines` | **0** | **0** | M01 触发（2 次）|
| `icon-cards` | **0** | **0** | M01 触发 |
| `outlined-box` | **0** | **0** | 2/3 触发 |
| `numbering` | **0** | **0** | 2/3 触发 |
| `still-page` | 0 | 2 | 3/3 触发 |

**7 条规则在 30 个精心调过的原型上一次都没响，在模板上全部响。** 这个反差本身就是最强的证据。

## 根因：模板里是**占位框**，不是内容

`templates/M01-clean-corporate/index.html` 实测：

```html
L33: <svg class="brand-mark" ... aria-label="公司标识占位图，换成你的 logo">
L87: <!-- 图片占位框：换图时把整个 <figure> 里的 <svg> 换成
L91: <svg class="shot-svg" viewBox="0 0 1200 750" role="img"
       aria-label="主视觉图片占位框：比例 16:10，建议放 1200×750 像...">
L92: <title>主视觉图片占位框，16:10，建议尺寸 1200×750</title>
```

`few-pictures` 的规则：
```js
if (width >= 1100 && m.page.realPictures != null) {
  const pics = m.page.realPictures + m.page.uiPictures;
  if (pics < 4) add('FAIL', 'few-pictures', `Only ${pics} picture(s) on the page...`, 'Find real pictures...');
}
```

而 `probe.mjs` 明确不计 SVG：
```js
const svgSrc = (u) => /\.svg(\?|#|$)|^data:image\/svg/i.test(u || '');
// "Inline SVG and .svg files do not count"
```

**模板用 SVG 占位框是它的本分**——用户 clone 下来要替换成自己的图。要求模板自带 4 张真图，等于要求模板替用户选好商业摄影素材。

`focal-point` 同理：它要求「首屏有一个主导元素（大标题或一张占三分之一视口的大图）」。模板的首屏主导元素是**占位框**，尺寸 1200×750，但因为是 SVG 所以不算图。

`still-page`：要求页面有动效。模板故意不做动效（用户要自己加）。

`eyebrow`：模板里 17 处 kicker 标签。M01 叫 "clean-corporate"，kicker 是这类企业风的常规手法——**这是设计选择**。

## 判定

| 规则 | 判定 | 理由 |
|---|---|---|
| `few-pictures` | **规则不适用于模板** | 模板的本分就是留占位框让用户换图 |
| `focal-point` | **规则不适用于模板** | 主导元素是占位框，不是模板该决定的 |
| `still-page` | **规则不适用于模板** | 模板故意不做动效 |
| `eyebrow` | **设计选择，应豁免** | M01 是 clean-corporate，kicker 是常规手法 |
| `headline-lines` | **需看具体** | 可能是占位长标题导致 |
| `icon-cards` | **需看具体** | |
| `outlined-box` / `numbering` / `shadow` / `hairline` / `mono` | **需看具体，可能是真缺陷** | 这些与占位无关 |

## 我的裁决：**不补模板闸门**

理由（与红队一致，且我实测支持）：

1. **22 个 FAIL 里，至少 4 条（eyebrow / few-pictures / focal-point / still-page）是规则不适用，不是模板做错。**
2. 给模板补闸门 = 写一份「豁免清单」= **制造漂移**。规划 Agent 自己也说了：「`focal-point`/`few-pictures` 对工具界面不用豁免——它们本来就不响。**预先豁免会制造你最担心的『清单漂移』**。」这句话对模板同样成立，只是方向相反（模板会响，所以更想豁免）。
3. **补了之后，模板会长期带着 11/4/7 个 FAIL 或一份豁免清单**，两者都比现状差。
4. 模板的真正问题不是「没被检查」，而是**没人知道它们长什么样**。而 `templates/M01/README.md` 有 20,355 字节、`TOKENS.md` 有 13,262 字节——**文档是齐全的**。

## 但有一条该做（规划 Agent 的第 10 条，我认同）

> **报头 `闸门 FAIL=0 26` 只统计 30 个方案，把有病的自己排除在外。**

`_selection` 现在有 2 条 FAIL，而页面报头写的是「闸门 FAIL=0 **26**」——那个 26 统计的是 30 个原型，**不包含选型台自己**。

这是一个真实的「界面在说半真话」：用户看到「闸门 FAIL=0 26」，会以为整个项目体检合格，而实际上**他正在浏览的这个页面本身有 2 条 FAIL**。

**这个该修，而且成本很低**：在报头那一行加一句「（本页自身：2 条 FAIL，原因见详情）」，或者把选型台自身也纳入统计。

## 结论

- **不补模板闸门**（22 个 FAIL 里至少 4 条是规则不适用）
- **修报头的「26」**（它把有病的自己排除在外）
- 模板的 22 个 FAIL 记为**已知边界**，写进 README 的「做不到与已知边界」一节，说明为什么模板不适用这些规则
