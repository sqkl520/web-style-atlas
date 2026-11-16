# 六条已知问题的核实：全部成立

> 2026-11-17　主线程
> 本轮派出的 5 个 agent 里只有 1 个真正跑起来（与之前多轮同一个故障形态：output 文件 0 字节）。
> 所以这六条我自己核实，不依赖 agent 的结论。

---

## 零、agent 状态

| 角色 | 结果 |
|---|---|
| 规划 | **0 字节，8 分钟后判定死掉并停止** |
| 核实六条问题 | 运行中（12 分钟，969KB 输出） |
| 红队攻击闸门 | **0 字节，3 分钟后停止** |
| 产品优先级 | **0 字节，3 分钟后停止** |
| 逐字读提示词 | **0 字节，3 分钟后停止** |

这是**第三次**观察到同一形态。规律：并行的 5 个里通常只有 1 个能启动。
所以本轮改为串行 + 主线程自查。

---

## 一、`h1Size` 是死字段 —— 成立

```
改 h1Size 后提示词变了的案: 0/35 → 死字段（成立）
```

哨兵法：把每案的 `dna.h1Size` 改成 `'999px'`，重新生成提示词，逐案比对。

它曾经出过一次事故（抽到 30/30 但渲染 0/30），当时的修法是改用 `h1SizeAt1440`。
值接上了，但 `h1Size` 本身既没接上也没删掉，于是一直留在产品数据里。
`build-prompts.mjs:416` 现在有注释说明这一点。

**它并非无用**：裸 px 的 5 案（S03/S04/S13/S25/S30）里它与 `h1SizeAt1440` 相同，
clamp 的 30 案里它是展开前原文，可作出处回看。但它对产品输出零影响。

---

## 二、`radius` 对 31 案完全无效 —— 成立

```
radiusBare=true 的案: 31/35
其中改 radius 后提示词不变: 31/31 → 完全无效（成立）
```

`prompt-copy.js:672` 的判据：

```js
"3. 圆角：" + (d.radiusBare || d.radius === "全直角 0"
  ? "全站一律 0，卡片、按钮、图片、标签全部方角"
  : d.radius) + "。"
```

`radiusBare` 为真时直接用固定句，`d.radius` 整句丢弃。

**这个设计本身是对的**（31 案确实是全直角）。问题是闸门 88.6% 的注意力
花在了一个不影响输出的字段上 —— `KEY_FIELDS` 陈旧度检查、`stale-vs-dna-clean`
都在认真守它。

⚠️ 同一个判据出现**两次**：`prompt-copy.js:672`（硬约束第 3 条）和 `:990`（防退化 ②）。
所以改 `radius` 对 31 案的影响面是两处，不只是第 3 条。

---

## 三、`clean-dna.mjs` 三处「抽取失败写成设计」—— 成立

| 位置 | 抽不到时输出 | 与「设计上真的没有」的区别 |
|---|---|---|
| `clean-dna.mjs:952` | 「无边框线条（全站不画描边，只用色块与留白分隔）」 | 无 |
| `clean-dna.mjs:1579` | 「无阴影」 | 无 |
| `clean-dna.mjs:463` | 「全直角 0」 | 无 |

三者都是：**抽取失败与设计上无此值，产出逐字相同的文本。**

这正是 2026-10-26 那次 S27 事故的形态（抽出空数组 → 提示词说「未声明」）。
当时的修法是把「未声明」换成一句看起来像设计的话 ——
**修的是措辞，不是判据。换完之后，失败看起来更像成功了。**

对照：`clean-dna.mjs:1093` 的 `bodySize` 分支是对的 ——
返回 `""` 并给理由「该案没有显式的正文字号规则（浏览器默认 16px，不写进提示词以免编造）」。
**抽不到就说抽不到，不要把「抽不到」写成「没有」。**

---

## 四、`o.unit` 拼病句 —— 成立

```
传 {count:5, unit:'款产品'} 第 1 条:
  1. 这个版式设计时排了 5 个款产品——这是版式的规模，不是你的内容量。
含病句「5 个款产品」: true
```

`prompt-copy.js:770` 是 `"1. …排了 " + count + " 个" + unit + "——…"`，
`"个" + unit` 直接拼接。`unit` 默认值 `"条目"`，所以只有没人用它的时候是对的。

目前零调用方，所以没暴露。但谁要开始用它就得先修这句。

---

## 五、内容层在已填形态下从未测过 —— 成立

```
提到已填形态 buildStylePrompt 调用的报告: 0 份
```

唯一的复现性数据（`_probe/20-reproducibility.md`）来自**空槽形态**：
开头是「我经营＿＿＿＿」，模型自填生意，两次填成不同行业（8-gram 重合 0.004）。

**那是留白，不是数据。** 模型填留白时两次不一样是采样，不是缺陷。
用户实际用的是已填形态，而那个形态从来没跑过重复盲测。

---

## 六、`check-prompts.mjs` 现有 52 条断言

`why-missing` 用 `sp.id` 而非 `id`，所以第一版正则漏了它。完整清单：

```
prompt-build            prompt-missing          mech-missing
mech-no-measurable      mech-width-vs-scale     minpics-falsy-zero
minpics-missing-claim   minpics-mismatch        plain-empty
plain-multiline         plain-ends-sentence     plain-no-content
plain-too-long          plain-not-human         plain-garbled
palette-line            palette-not-in-css      palette-empty
linewidth-not-in-css    linewidth-wording       hex-in-negative-context
hex-outside-palette-line no-typescale           mech-empty
mech-value-comment-only mech-value-in-script-only mech-value-not-in-source
mech-vocab-unimplemented mech-column-claim-unchecked
typescale-degraded      typescale-detail        typescale-body-mismatch
typescale-h1-mismatch   typescale-ratio-mismatch typescale-unverifiable
have-throws             have-phantom-number     have-default-changed
have-not-wired          have-pics-conflict-ignored have-pics-lost-distinct
have-pics-needless-degrade minpics-one-nonsense  minpics-one-lost-constraint
section-missing         xref-missing            xref-wrong-target
acceptance-count        acceptance-range        template-marker
stale-vs-dna-clean      why-missing
```

其中 **T 层（文本层）** 的：typescale×6、have×4、have-pics×3、minpics-one×2、
section-missing、xref×2、acceptance×2 = **20 条**。

40 号报告设计了 38 条文本层断言，但那是**另一套编号**（它的 T-11 对应这里的
`typescale-degraded` 一族）。所以「做了几条」不能简单对数字——
需要在 40 号报告的编号与实际规则名之间建一张映射表才能回答。

---

## 七、复算命令

```bash
# 1-2：哨兵法
#   （脚本已删，方法：改一个字段为哨兵值 → 重新生成 → 逐案比对文本）

# 3：三处失败路径
sed -n '952p;1579p;463p' prototypes/_prompts/clean-dna.mjs
sed -n '1093p' prototypes/_prompts/clean-dna.mjs    # 对照：正确的那一个

# 4：unit 病句
node -e "…buildStylePrompt('S13',{biz:'a',action:'b',count:5,unit:'款产品'})…"

# 5：已填形态的盲测记录
grep -rl "buildStylePrompt(id, {biz" deliverables/

# 6：断言清单
grep -o "add('FAIL', \(sp\.\)\?id, '[a-z0-9-]*'" prototypes/_build/check-prompts.mjs
```
