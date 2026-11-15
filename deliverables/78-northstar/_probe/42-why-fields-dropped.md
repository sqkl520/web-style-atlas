# 「字段非空」不是判据：dna 的四个 `Why` 在 build-prompts 这一步被丢掉了

> 2026-11-15　主线程
> 本文记录我在派发五个专家 Agent 之后，自己独立查到的、他们任务书里没有的那一层。
> 结论提前：**我最初那个「加一条 dna 字段非空断言」的想法是错的，而且错在第五类缺陷上。**

---

## 一、我最初发现了什么，以及为什么它不够

### 1.1 变异测试的原始结果

我把 S13 案的 dna 字段逐个手工清空成空串，跑 `node prototypes/_build/check-prompts.mjs --quiet`：

| 字段 | 清空后闸门反应 |
|---|---|
| palette | FAIL 1　「配色段一个 hex 都没有」 |
| radius | FAIL 2　stale-vs-dna-clean |
| shadow | FAIL 2　stale-vs-dna-clean |
| lineWidths | FAIL 2　stale-vs-dna-clean |
| h1Size | FAIL 2　stale-vs-dna-clean |
| mechanism | FAIL 1　「取不到 dna.mechanism」 |
| **bodySize** | **FAIL 0** |
| fonts | 我替换成了空字符串 |

### 1.2 上表有两处是我做错了

**`fonts` 那一行无效。** `dna.fonts` 是对象 `{display, body, mono}`，不是字符串。我把整个对象替换成了 `""`，那是一个真实链路永远不会产生的形态。`prompt-copy.js:300` 的判据是

```js
if (d.fonts && !Array.isArray(d.fonts) && (d.fonts.display || d.fonts.body))
```

对象被换成字符串后 `d.fonts.display` 是 `undefined`，于是走进 `else if (d.fonts && d.fonts.length)` 这个**老版本兼容分支**（`prompt-copy.js:304`），按字符串下标猜字体。这是兼容代码在兜一个不存在的输入，不能算缺陷证据。**这一条撤回。**

**`bodySize` 为空是设计上允许的。** `prototypes/_prompts/clean-dna.mjs:1093`：

```js
return { text: "", why: "该案没有显式的正文字号规则（浏览器默认 16px，不写进提示词以免编造）" };
```

空值带着一个明确的理由：不编造。所以「bodySize 是空串」本身不是缺陷。

---

## 二、第二层：理由字段在 build-prompts 被丢掉

`clean-dna.mjs` 为四个字段各产出一个理由：

```
prototypes/_prompts/clean-dna.mjs
  1528:    bodySize: body.text,
  1529:    bodySizeWhy: body.why,
```

实测 `dna-clean.json` 的字段清单：

```
$ node -e "…打印 dna-clean.json 的键…"
id dir structType threshold tone palette primary fonts radius radiusBare
radiusWhy shadow shadowDetail lineWidths lineWidthsWhy lineWidthsInteractive
h1Size h1SizeWhy bodySize bodySizeWhy h1SizeAt1440 mechanism charBudget
                                    ↑ 四个 Why 都在
```

而 `prototypes/_selection/prompts.js` 里 dna 的字段清单：

```
$ node -e "…打印 prompts.js 的 dna 键…"
palette fonts radius radiusBare shadow lineWidths h1Size bodySize h1SizeAt1440
mechanism degrades risk reuse
                                    ↑ 四个 Why 一个都没有
```

原因在 `prototypes/_prompts/build-prompts.mjs:364-397`：它**手工枚举**字段构造 `dna` 对象——

```js
dna: {
  ...
  radiusBare: !!d.radiusBare,
  lineWidths: d.lineWidths,
  ...
  bodySize: d.bodySize,
  ...
  degrades: degrades,
  ...
  reuse: REUSE[d.id] || "",
}
```

`radiusWhy` / `lineWidthsWhy` / `h1SizeWhy` / `bodySizeWhy` 不在这个枚举里，于是被丢。

### 2.1 这不是「少了个注释」，是判据失去了区分能力

四个 Why 记录的正是「这个值为什么是这个值」。丢掉之后，下游只能看到一个值，无法判断它属于哪种情况：

| 情况 | `bodySize` 的表现 | 该怎么做 |
|---|---|---|
| 抽取成功 | `"15px"` | 写进提示词 |
| 抽取失败 | `""` | **应当报错** |
| 设计上无此值 | `""` + why「没有显式规则，不编造」 | **应当放行** |

后两种在 `prompts.js` 里**完全一样**。任何作用在 `prompts.js` 上的「非空断言」都会把第三种判成缺陷——那会是一次误报，而且误报的是「正确行为」。

### 2.2 这属于第五类缺陷

本仓库归纳的五类：

1. 闸门读不到数据 → 不报错 → 打印漂亮结果
2. 数字对但对象错
3. 断言恒真
4. 量错了对象（元层级）
5. **闸门与被测对象共用一个盲点**

我原本打算加的「dna 关键字段非空」断言，与 `check-prompts.mjs` 末尾那条 `KEY_FIELDS` 陈旧度检查**共用同一个盲点**：两者都假设「值是空串 ⇒ 有问题」。而真实世界里有第三种状态（合法空）。新断言不会让这个盲点变窄，只是把它复制到第二个地方。

更麻烦的是：这条新断言**无法用变异测试证伪**。我注入的变异是「把值改成空串」，断言当然会响。但真实失效形态是「clean-dna 走到 `text: ""` 那条 return」，它产生的**也是**空串——断言会响，却把「不编造」这个正确行为也一起判成了错。**变异测试通过，不等于断言正确。**

---

## 三、真正的缺陷：整层 provenance 没有任何消费者

`dna-clean.json` 有 23 个字段。我写了个脚本（已删）统计每个字段在 `prototypes/` 与
`deliverables/` 源码里的**读取点**（排除 json 自身、build 产物、worktrees），然后用
独立的 `Grep` 逐个复核，不是只看脚本输出：

| 字段 | 生产 | 读取点 | 说明 |
|---|---|---|---|
| id, dir, threshold, tone, palette, primary, fonts, radius, radiusBare, shadow, lineWidths, h1Size, bodySize, h1SizeAt1440, mechanism | ✓ | 2–31 | 正常 |
| **structType** | ✓ | **0** | 无任何读者 |
| **radiusWhy** | ✓ | **0** | 出处，无读者 |
| **shadowDetail** | ✓ | **0** | 结构化的阴影明细，无读者 |
| **lineWidthsWhy** | ✓ | **0** | 出处，无读者 |
| **lineWidthsInteractive** | ✓ | **0** | 交互态线宽，无读者 |
| **h1SizeWhy** | ✓ | **0** | 出处，无读者 |
| **bodySizeWhy** | ✓ | **0** | 出处，无读者 |
| **charBudget** | ✓ | 1 | 只在 `clean-dna.mjs:1596` 给自己的终端打印用，不流向下游 |

**23 个字段里 8 个没有任何消费者，占 34.8%。**

### 3.1 这些字段是**有意**不进提示词的，所以「没进提示词」不是缺陷

我查了引入它们的那个 commit（`cea8436`，2026-10-26）的原始注释：

```js
/* 判据留档：这句话是怎么得出的（"0 处 border-radius" / "0 与 50% 并存" …）。
 * 不进提示词（AI 不需要看抽取过程），只留在 dna-clean.json 里供人复核 ——
 * 这个仓库的教训是「结论不带依据，下一轮就会有人按自己的理解改回去」。 */
radiusWhy: rad.evidence,
```

设计意图很明确：**Why 是给人和未来的审查者看的，不是给 AI 看的。**
`build-prompts.mjs:364-397` 不带它们，符合这个意图。所以「Why 没进提示词」本身不是缺陷。

**真正的缺陷是「供人复核」这个意图从来没有被机器执行过。** 一句「供人复核」在两年里
没有兑现成任何东西：没有断言读它、没有报告引用它、没有 UI 显示它。留档退化成死数据，
而它记的恰恰是「结论的依据」——正是这个仓库认为最重要的东西。

本仓库自己写下的反射正好描述这件事：

> **有值但没人读** —— 一个字段存在于数据里，但没有任何 UI/断言读它，那是缺陷，不是功能。

### 3.2 这条证据同时否掉了我的第一个方案

我原本打算在 `check-prompts.mjs` 里读 `dna-clean.json` 的 Why 字段来判断「合法空」。
但上面这张表说明：**既然没有任何读者在读 Why，Why 自己就没有任何断言在守它。**
如果我新加的断言是它的第一个读者，那么它一旦被写坏（比如 `clean-dna.mjs` 某次改动让
`body.why` 变成 undefined），我的断言会因为「why 为空」而 FAIL——方向是对的，但
**它守的是一条从未被验证过的数据**。这是同一个病再犯一次：新闸门建在没被守护的地基上。

正确顺序应该是：先给 Why 加一条「非空且内容是出处描述」的断言（让 Why 自己可信），
再用它去判「合法空 vs 失败空」。**两步不能合并成一步。**

## 四、Why 本身可靠吗？我实测了三种问法

上一条说「先给 Why 加断言，再用它去判」。但 Why 自己可不可信？我实测了：

```
=== 现状：Why 是否全部非空 ===
  radiusWhy      空: 0/35
  lineWidthsWhy  空: 0/35
  h1SizeWhy      空: 0/35
  bodySizeWhy    空: 0/35
```

四个 Why 现在 35/35 全非空。所以「Why 非空」这条断言**当下是恒真的**——它只有在
将来 `clean-dna.mjs` 被改坏时才会响。这不是缺陷（预防性断言本来就该这样），但必须
配上变异测试才算数。清空 S13 的 `bodySizeWhy`，假设的断言检出 1 处，**会响**。

### 4.1 但 Why 的信息量差异极大

| 字段 | 35 案里的唯一值数 | 判断 |
|---|---|---|
| h1SizeWhy | 31 / 35 | 每条都指向具体的 h1 规则，真有信息 |
| bodySizeWhy | 8 / 35 | 19 案共用同一句「裸 body 规则 `body` 声明 16px」 |
| radiusWhy | **4 / 35** | 几乎全是「border-radius 只出现过 0」 |

`radiusWhy` 的 4 个值里，有两个是「不存在」的两种说法：

```
"border-radius 只出现过 0"
"该案 CSS 里 0 处 border-radius，所有元素一律直角"
```

**这两句意思完全一样，同一条事实被写成两种措辞。** 谁读谁都得自己再判一次
「这两种说法算不算同一件事」。如果将来有断言要读 `radiusWhy`，它会立刻遇到这个问题。

### 4.2 「含失败词」的判据不成立

我试过用 `/失败|读不到|找不到|未找到|抽取不|无法|error|空/` 去识别「这条 Why 在说
抽取失败了」。结果 `lineWidthsWhy` 有 7 案命中——但打开看：

```
"1 ← border: 1px solid var(--ink)  ⓐ.error"
"1 ← border: 1px solid var(--ink)  ⓐ.error-code"
```

命中的是 S31 的 `.error` / `.error-code` **选择器名**，是人写的 CSS 类名，跟抽取失败
毫无关系。**这条判据 100% 误报。** 记在这里，免得下一个人重试同样的路。

结论：**没法靠关键词判断 Why 的语义**。可靠的做法只剩两条：
(a) 让 `clean-dna.mjs` 在失败时返回一个结构化标记，而不是自由文本；
(b) 断言只判「Why 非空且引用了一个真实的 CSS 文件位置」，不判语义。

## 五、正确的判据应该建在哪一层

判据必须能区分「合法空」与「失败空」，所以它必须读到 why。可行的位置只有两个：

**A. 在 `check-prompts.mjs` 里读 `dna-clean.json` 的 Why 字段**，而不是读 `prompts.js` 的 dna。这样：

- 值为空 + why 是「没有显式规则」→ 放行
- 值为空 + why 是空/缺失/含「失败」「读不到」→ FAIL
- 值非空 → 放行

**B. 让 Why 进入 `prompts.js`**，把它作为提示词内容的一部分，或者至少作为可被闸门读到的元数据。目前提示词的第 6 条在降级分支里写「最大标题取 56px 这一档，比这更小就撑不出这个版式的气势」——它**没有告诉用户「正文大小未知」**。如果用户想知道为什么提示词里没有正文字号，现在的提示词答不出来。

B 的副作用是需要改 `build-prompts.mjs` 的字段枚举并重跑生成链；A 的副作用是闸门要读第二个文件，而「闸门读第二份数据」正是这个仓库反复吃亏的地方（两份数据会漂移）。

**我倾向 A，但必须先等批判 Agent 的结论**——它正在被要求回答「这件事该不该做」，包括历史事故里有没有一次能被这条断言拦住。

---

## 六、复算命令

```bash
# 1. 四个 Why 在 dna-clean.json 里
node -e "const c=require('./prototypes/_prompts/dna-clean.json');const a=Array.isArray(c)?c:Object.values(c);console.log(Object.keys(a[0]).filter(k=>/Why\$/.test(k)))"

# 2. 它们不在 prompts.js 里
node -e "const fs=require('fs');const W={};new Function('window',fs.readFileSync('prototypes/_selection/prompts.js','utf8'))(W);console.log(Object.keys(W.STYLE_PROMPTS.schemes[0].dna))"

# 3. 丢在哪一步
sed -n '360,400p' prototypes/_prompts/build-prompts.mjs

# 4. 合法空分支的原话
sed -n '1090,1096p' prototypes/_prompts/clean-dna.mjs

# 5. 当前 35 案没有一案的 bodySize 为空（说明这是「将来可能发生」而非「现在正在发生」）
node -e "const c=require('./prototypes/_prompts/dna-clean.json');const a=Array.isArray(c)?c:Object.values(c);console.log(a.filter(x=>!String(x.bodySize||'').trim()).map(x=>x.id))"
```
