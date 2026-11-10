# W5 红队报告：回归防线

> 对象：`prototypes/_build/probe-ui.mjs`（审阅时 425 行，现 488 行——仍在增长）、`prototypes/_build/check-ui-copy.mjs`（180 行）、`.github/workflows/gates.yml`（114 行）
> 基线：HEAD `496807d`；被审代码是 2026-11-09 17:05–18:09 之间仍在被写入的工作树版本
> 方法：读代码 + 在本机无头 Chrome（v26.12.1 / Chrome 1440×900）与 `git archive HEAD` 的干净副本上做变异测试。所有「实测」都有可复现命令。
> 口径声明：审阅期间另一个 Agent 正在并发写这三个文件。我在 `/tmp/rt-w5`（工作树快照）与 `/tmp/ci2`、`/tmp/ci3`（`git archive HEAD` 干净副本）上做变异，**没有在产品文件上留下改动**。凡数字不同处，我都注明测的是哪棵树。

---

> **版本说明（必读）**：这份报告针对的代码在我审阅的 110 分钟里被改了 6 次。① 17:05 版 `--selftest` 打印 `7/7`、`CASES` 有 5 项；② 17:22 版补了 `chip-count-derived`，仍打印 7/7；③ 18:09 版把判据改成 `ok === 8`、打印 `8/8`；④ 18:22 版把 `count-aria-live` 从「运行时摘属性」改成真文件变异（改对了）；⑤ 18:44 版仍 `8/8`，`scenes-no-rendered` 未动；⑥ **18:54 版（md5 `b403d6dc…`，29266 字节）仍 `8/8`，`scenes-no-rendered` 的自检依旧未动**——我在这版字节上重跑决定性实验，结论不变。
> **核验方法**：只在 `probe-ui.mjs` 的 `scenes-no-rendered` 体内插入 `return {ok:true}`（产品树完全健康、一字不动），跑 `--selftest` → 仍打印 `✓ scenes-no-rendered 运行时删掉 .field-out → 红`、`8/8`、exit 0。**一条被掏空的断言，拿到了满分自检。**
> 下面所有行号与引文以 18:44–18:54 版为准，旧版本差异在正文注明。

---

## 0. 先说结论

**W5 的形状是对的，执行是真的，但 `scenes-no-rendered` 的自检证明的是 DOM API 的定义、不是断言本身——我把这条断言掏空后自检照样给它背书；反过来在缺陷真的回来的树上，它去指控一条好断言。**

三句话：

1. `probe-ui.mjs --selftest` 打印「8/8 条变异被对应判据识别」。其中 **7 条是真文件变异**（改源码 → server 返回变异版本 → 断言红；`count-aria-live` 那一条在 18:22 刚被改对），**`scenes-no-rendered` 那一条还是「运行时 `f.remove()` 后看 `querySelector` 返回什么」**——它证明的是一行 DOM API 的行为，不是被测断言。我做了两个方向的实验（都在 18:44 版字节上）：
   - **掏空断言**：只把 `scenes-no-rendered` 改成 `return {ok:true}`（产品树健康）→ `--selftest` 仍打印 **「✓ scenes-no-rendered → 红」**。**一条被掏空的断言拿到了自检的背书。**
   - **保留断言、让缺陷真的回来**：只删 `.field-out` 消费者、断言一字不改 → `probe-ui` **✗ 详情面板里没有「不适合的场景」**（断言行，`7 PASS / 1 FAIL`），而 `--selftest` 打印 **「✗ 没红」**——**指控一条好断言**。

   **同一条自检，在断言坏与断言好两种情况下都给出同一个答案。** 它不是判据，它是一行恒真的代码。这是本仓库那条病的**同一个形状**（闸门与事实脱钩）。

   **附带一个更硬的发现**：`--selftest` 自己不确定。同一份干净代码连跑 3 次 `8/8`；在「断言 8 被掏空」的树上连跑 2 次都出现 `✗ field-count-derived 没红（探针坏了）`、`7/8`。文件自己的注释已承认同类抖动（`runAll` 上方：「连跑三次得到 8/8、4/4、5/3 三种结果」）。**一个会抖的自检当硬闸，等于一盏随机亮灭的红灯**——这正是计划用它否决 `verify-prototype` 当硬闸的同一个理由。

2. `data-derived` 机制本身有三条静默失效路径，其中一条是**已经存在的**：`fillDerived()` 只在 `app.js` 加载时跑两次（`:1742`、`:1743-1747`），**详情面板渲染后从不重跑**，而 `field-count` 数的是 `#d-body .fields .field` —— 详情没打开时该值是 0，`fillDerived` 的 `if (vals[k] === undefined || !vals[k]) continue`（`app.js:1733`）会**跳过它**。所以 `data-derived="field-count"` 今天显示的那 12，**100% 来自 `index.html:211` 的手写兜底值**。我从 HTML 把 12 改成 99，`check-ui-copy` 仍 **FAIL 0 / WARN 0**，只有浏览器探针抓到。所谓「派生」在这一个数字上是装饰。

3. 计划里的 5 人日，有 1 天在一个**在 CI 上必然误报**的闸门上（`check-stale`，见攻击 5），还有 1 天在 `check-ui-copy` 的 `--selftest` 上——那个开关**根本没实现**：`check-ui-copy.mjs:17` 的文档写了它，全文件 grep `selftest` 只命中这一行注释，`process.argv` 只解析 `--quiet`（`:34`）。`--selftest` 被静默接受、跑了一遍正常检查、exit 0。**我在 18:30 复验时该文件自 17:22 起未变更，仍是这个状态。**

---

## 攻击 1（最重）：**`scenes-no-rendered` 的自检是同义反复**，而它在「断言坏了」与「断言好了」两种情况下都报同一个结果

### 证据：当前字节（`probe-ui.mjs` 488 行版本，18:44 复验）

`CASES` 有 6 项文件变异，加上 `count-aria-live` 的**文件变异**（`index.html` 锚点，`:455` 起——这一条在 18:44 前后刚被从「运行时 `removeAttribute`」改成真变异，改对了）与 `scenes-no-rendered` 的一条，`ok` 最大是 8，判据 `process.exit(ok === 8 ? 0 : 1)`。

| 断言（8 条） | 自检形态 | 是判据吗？ |
|---|---|---|
| `chip-direct-vs-near-styling` | 文件变异（摘 `.scene-more button`） | ✅ |
| `chip-count-derived` | 文件变异（退回「11 组 47 颗」） | ✅ |
| `field-count-derived` | 文件变异（`'field-count': 10`） | ✅ |
| `copy-restores-focus` | 文件变异（`if (false)` 禁还原） | ✅ |
| `arrow-key-not-hijacked` | 文件变异（`if (false) return`） | ✅ |
| `no-hidden-screenshot-downloads` | 文件变异（恢复三张图） | ✅ |
| `count-aria-live` | **文件变异**（`index.html` 摘 `aria-live` 后重载） | ✅（已修好） |
| `scenes-no-rendered` | **运行时 `f.remove()` 后看 `querySelector`** | ❌ **同义反复** |

那一处（`probe-ui.mjs:474-480`）：

```js
const bb = await pg.eval(`(() => { const f = document.querySelector('#d-body .fields .field-out');
  if (!f) return null; f.remove();
  return !!document.querySelector('#d-body .fields .field-out'); })()`);
if (bb === false) { ok++; console.log('✓ scenes-no-rendered 运行时删掉 .field-out → 红'); }
```

**它证明的是 DOM API，不是断言的判据。** 段被删掉之后 `querySelector` 必然返回 null —— 无论 `scenes-no-rendered` 断言写成什么（甚至 `return {ok:true}`），这段都会打印「✓ 红」。它与断言唯一的联系是「两者都碰 `.field-out`」，而断言还检查 `textContent.includes('不适合：')`，这一半自检完全没碰。

### 两个方向的实测（18:44 版字节，`/tmp/rt-f3`，`git archive`-等价快照）

**方向 A（18:44 版，`/tmp/rt-f4`）：只掏空断言 8，不动产品。**

```
# 仅在 probe-ui.mjs 的 scenes-no-rendered 体内插入 return {ok:true}；app.js 保持健康
node probe-ui.mjs             → ✓ scenes-no-rendered  NEUTERED（健康树的必然结果）
node probe-ui.mjs --selftest  → ✓ scenes-no-rendered 运行时删掉 .field-out → 红 ; 自检 7/8 ; **exit 1**
```

注意 exit 1 的原因：**不是**「自检发现了断言被掏空」，而是同一轮里 `field-count-derived` 意外报「没红」（见下）。自检对断言 8 **仍然打印 ✓**——一条被掏空的断言，拿到了自检的背书。这就是「假绿」的完整闭环。

**方向 B（18:44 版重跑）：保留断言，只让缺陷回来。**

```
# 只删 app.js 的 fieldOut(...) 那一行，probe-ui.mjs 一字不改
node probe-ui.mjs             → ✗ scenes-no-rendered  详情面板里没有「不适合的场景」 ; 7 PASS / 1 FAIL  ← 断言是好的
node probe-ui.mjs --selftest  → ✗ scenes-no-rendered  没红 ; 自检 7/8 ; exit 1      ← 自检说断言坏了
```

**方向 B 是最关键的**：断言**明明抓到了真缺陷**，自检却说「没红」。因为自检走的不是 `runAll()` 里的断言，是它自己手写的那三行 DOM 探针——它从来没调用过被测断言。**一条恒真的指示灯比没有指示灯更坏**：方向 A 里它给一条坏断言背书，方向 B 里它去指控一条好断言。**两个方向同时错，说明它的返回值与断言的真假无关。**

### 附带发现（更硬）：`--selftest` 自己是不确定的

在方向 A 的树上，`field-count-derived` 连续 2 次报「没红（探针坏了）」：

```
=== rt-f4 run 1 ===  ✗ field-count-derived … 没红（探针坏了）   自检：7/8
=== rt-f4 run 2 ===  ✗ field-count-derived … 没红（探针坏了）   自检：7/8
```

在干净树上（`/tmp/rt-f5`，同一份代码）连续 3 次都是 `✓`、`8/8`：

```
run 1 / run 2 / run 3 → ✓ field-count-derived … 红 ; 自检：8/8
```

两棵树的差异**只有断言 8 的函数体**（方向 A 里被插了 `return`）。我未能把根因钉到单一行（候选：`__onlyCheck` 只跑目标断言、导航状态在多次 `runAll` 之间残留、`location.hash='#S07'` 在已处于 `#S07` 时不触发 `hashchange`），但**现象是可复现的、且方向是「自检自己会抖」**。文件自己的注释（`runAll` 上方）已经承认过同类抖动：「一个独立的变异审计连跑三次、工作树完全没动，得到 8/8、4/4、5/3 三种结果」——也就是说作者知道这套东西会抖，而 CI 的 `browser` job 仍然把它当硬闸。

**这条对 W5 的打击比断言 8 的同义反复更大**：一个会抖的自检，在 CI 上会给出随机的红/绿，而随机的红灯训练所有人无视红灯——这正是计划 §2.2 用它否决 `verify-prototype` 当硬闸的同一个理由。

### 副证：文件变异的锚点是**整段文本**，会随兜底值漂移

`chip-count-derived` 的变异锚点是 `index.html` 的整段 summary 文本：

```js
from: '筛选 · <span data-derived="chip-groups">11</span> 组 <span data-derived="chip-count">45</span> 颗芯片',
to:   '筛选 · 11 组 47 颗芯片',
```

这段文本**含两个数字**（11、45）。只要有人「顺手把兜底值更新成正确值」（11→10、45→73，这正是攻击 2 推荐的修法之一），`from` 就不匹配，自检打印「? 变异锚点不在文件里」并 `continue`，`ok` 不加——`process.exit(ok === 8)` 会因此红，所以不会被静默吞掉；但**红的原因是「锚点漂了」**，日志读起来像「探针坏了」，而不是「芯片数自检失效了」。在一个人会持续更新兜底值的仓库里，这是一个会周期性误报的锚点。建议把变异锚点改成单个 key（`'chip-count': chipCount` → `'chip-count': 47`），与 `field-count` 那条同形。

同理，`no-hidden-screenshot-downloads` 的锚点是 `app.js` 里那整行 `'<div class="shots">' + shotFig(r, 'desktop') + ...` —— 攻击 3 若按计划改成 `data-src` 惰性加载，这一行必然重写，锚点随之失效。

### 弹性在哪 / 哪里脆

两处脆：

1. **运行时改 DOM 这个形态**：它便宜（省掉一次 10 s 冷加载），但测的对象是 **DOM 的行为**，而断言测的是 **产品的行为**。两者只在「断言恰好也在查同一个 DOM 事实」时重合，而 `scenes-no-rendered` 多查了一个 `textContent.includes('不适合：')`——自检完全没碰这一半。正确形状：`mutations` 表同样支持 `index.html`（`count-aria-live` 已经这么改了，可作范式）。把 `app.js` 的 `fieldOut(...)` 删掉、`goto('#S07')`，6 行。
2. **多次 `runAll` 复用的同一个 `pg`**：`__onlyCheck` 让每次只跑一条断言，但导航与页面状态的清理没有对应的「重置」。这是 `field-count-derived` 在方向 A 树上接连报假红的**最可能**原因（我未能钉死单一行，但现象稳定复现）。正确形状：每条变异用 `newPage()`，或变异后强制 `goto('about:blank')` 再回来。

### Steelman（我认真试过的最强反驳）

「7/8 是真文件变异，已经比本仓库任何既有闸门都好——`check-prompts.mjs` 的自检是 **0**（`grep -c selftest` = 0），`check-twolines`/`check-texture`/`check-anchors`/`check-stale` 也全是 0。而那一条运行时变异至少证明了『删掉 DOM 节点后探针不会崩』——那是鲁棒性，不是零价值。」

我接受一半：**标准确实不该只压在 W5 身上**，且「探针不崩」有价值。但这个反驳绕开了要害——`probe-ui.mjs` **自己**把「没有自测的探针就是下一个 verify-prototype 规则 4」写进了文件头，并把 `ok === 8` 当成通过条件。它宣称 8 条都有判据，实际 7 条有。而且两个方向的实测证明：**当断言与自检不一致时，自检的结论在两个方向上都错**——这正是「闸门自身腐坏」的定义，只是这次它腐坏在一个刚写好的文件里。

### 判决

**必须修，且是 W5 的阻断项。** 四条具体改法：

1. `scenes-no-rendered` 的自检改成文件变异：`app.js` 的 `fieldOut('不适合的场景', '不适合：' + r.scenesNo) +` → `''`，走 `mutations` 表 + `goto('#S07')`。**范式已经存在**——`count-aria-live` 在 18:22 就是这么改的（`probe-ui.mjs:455` 起），复制它的形状，6 行。
2. **修自检的抖动**：每条变异用全新的 `pg`（`newPage()` / `Target.closeTarget`），或变异后强制 `goto('about:blank')` 再回来。变异测试自己不稳定，等于把 CI 变成抽奖。
3. 把断言集合与自检集合**从同一个数组派生**——现在 `name: '...'`（自检）与 `await check('...')`（断言）是两份手写清单，加第 9 条断言时自检不会自动跟上。这一条比前两条重要：它让「加了断言忘了加自检」变成不可能。并且把 `ok === 8` 改成 `ok === CHECKS.length`。
4. **变异锚点从整段文本改成单个 key**（见副证），否则兜底值一更新、自检就报「锚点漂了」。

---

## 攻击 2：`data-derived` 是一个**新的静默失效面**，而两个闸门只守住了它的一半

### 证据：三条失效路径，两条无人守

**(a) `fillDerived()` 抛错 → 数字退回 HTML 兜底，`check-ui-copy` 全绿。**

我从工作树副本把 `fillDerived` 第一行插一个 `throw`（模拟将来加第 4 个 key 时的 null 解引用）：

```
node check-ui-copy.mjs  → 合计 FAIL 0 / WARN 0     ← 完全没看见
node probe-ui.mjs       → ✗ chip-count-derived  组数不符 want 10 got 11
                          7 PASS / 1 FAIL          ← 抓到了（但只因为 11≠10 这个巧合）
```

`probe-ui` 抓到它是**运气**：兜底值 11 与 DOM 的 10 不相等。把 `index.html:153` 的兜底值从 `11` 改成 `10`（一个完全合理的「顺手更新兜底」动作），同一个 `throw` 就会变成 **8 PASS**。我实测过这条链路在另一个数上的版本：

```
# 把 data-derived="field-count" 的 HTML 兜底 12 → 99
check-ui-copy → FAIL 0 / WARN 0
probe-ui      → ✗ field-count-derived 字段数不符 ; 7 PASS / 1 FAIL
```

也就是说：**两个闸门都在拿「兜底值」与「DOM 值」比大小，没有一处证明 `fillDerived` 真的跑过。** 兜底值一旦被改成与真实值相同（极易发生：人会「保持兜底正确」），机制死亡就完全观测不到。

**(b) `fillDerived` 从不因详情面板重渲染而重跑 —— `field-count` 今天就是兜底值。**

`app.js` 里 `fillDerived()` 只有两处调用（`:1742` 与 `:1744/:1746` 的 readyState 分支），都在页面装载期。我在 1440×900 实测：

```
装载完成、未开详情：field-count 文本 = 12，  #d-body .fields 里的字段数 = 0
打开 S01 之后：      field-count 文本 = 12，  字段数 = 12
手动 benchFillDerived() 之后：仍 = 12
```

`fillDerived` 的 `fieldCount` 取 `#d-body .fields .field:not(.field-out)`（`app.js:1725`），而 `#d-body` 在详情打开前是空的——`fieldCount = 0`，被 `:1733` 的 `!vals[k]` 跳过。**所以那个 12 从来不是算出来的，是 `index.html:211` 手写的。** 它恰好等于真实值，因为 W2 的作者把兜底写对了。

这条正好落在计划 §5.2 自己定的判据上：「任何在 UI 文案里复述一个可计算量的数字，必须由计算导出，不能手打」。`field-count` 违反它，而 `check-ui-copy` 的第 1 条断言（`derived-key-unknown`）只看 key 名在不在 `vals` 表里（`:68-72`），不看那个 key 在**页面装载时刻**是否可算。

**(c) 选择器漏 → 静默。** `chipGroups = document.querySelectorAll('.rail-block .chips').length`（`app.js:1719`）。我把 `.scene-more` 从 `.rail-block` 移到 `<main>` 下（正是 W2 那个缺陷的原始形状），`chipCount` 的第三个选择器 `.rail-block .chips button` 仍命中 45，总和仍是 73，`benchFillDerived()` 输出不变——**这条断言对这个回归完全不敏感**。它敏感的是 `.scene-more button` 那一段，而这段的失效只会让 near 芯片样式倒置（断言 1 管），数字仍是 73。这是对的：73 = 45 + 28 是集合基数，与挂载点无关。但它说明**断言 2 不能替代断言 1**，而计划里把两者写成「同一组 id 的两层复核」。

### Steelman

「`check-ui-copy` 的第 2 条断言（`chip-count-hardcoded` / `field-count-hardcoded`）已经把「退回手写」这条最大的风险守住了：我把 HTML 里的 span 全部删掉、改回「11 组 47 颗」与「多数案 10 段」，它报 **FAIL 2**。这是真本事。」

成立。但它守的是「**不再有手写副本**」，不是「**派生真的发生了**」。这两件事在 `field-count` 上是分离的：源码里有 span、有 key、有 `vals` 表项、兜底值正确——`check-ui-copy` 五条断言全绿——而实际显示的是手写值。**闸门守住了形式，没守住语义。**

### 判决

**需要加一条断言，成本 15 行，收益是这一整条机制从「形式上有」变成「事实上在跑」。**

判据的形状必须是「**证明它跑过**」，而不是「比大小」。两条可选：

- 便宜版（推荐）：`fillDerived` 在一次成功的写入后，给每个节点打一个标记属性 `data-derived-at=<DOM 上的真实值>`，`check-ui-copy` 断言 `data-derived-at` 存在且**等于写入后的 textContent**。兜底值被改成与真实值相同也不影响——因为标记由 JS 打，静态 HTML 里没有。变异测试：删掉 `fillDerived()` 任一调用 → 标记消失 → 红。
- 结构版：`check-ui-copy` 对 `field-count` 单独断言「详情面板没打开时，该节点文本必须等于 `fillDerived` 会跳过的信号（即取值 0）→ 说明它不能是静态派生」，从而**要求** `field-count` 改成在 `open()`/详情渲染之后重算。这是把已存在的缺陷（(b)）修掉而不是掩盖。

我倾向前者做闸门、后者做产品修复，两者不互斥。

---

## 攻击 3：浏览器探针的**最脆断言是第 4 条（复制焦点）**，而它在 CI 上会因为一个与本缺陷无关的原因失败——以及它在 headless 下**验不到它声称验的东西**

### 证据 A：容器里的 `loaded` 变量是死代码，说明这条断言没打算验字节

`:242` `const loaded = servedImages - before;` 算出来了，只用于 detail 字符串（`:254`），**没有任何判据使用它**。计划 §1.3#7 写的是「`performance.getEntriesByType('resource')` 里 `.jpg` 请求数 == 显示中的图数；隐藏图字节 0 B」。实测：把每行改回 3 张图，断言靠 `hidden > 0` 抓住（因为 CSS 永久 `display:none` 第 2、3 张）；但如果将来 CSS 那行被删掉（三张都可见），`hidden = 0`、`imgs = 3 × rows > rows`，也会抓；但如果**只把 `loading="lazy"` 换成 `loading="eager"` 且 CSS 还在**，字节浪费回来了（那才是 4.84 MB 的原始缺陷），断言仍然绿。这不是本质问题，但「`loaded` 变量不用」是「本来想验、后来忘了」的化石。

### 证据 B：第 4 条的断言在 headless 里验的不是剪贴板，是焦点——而它的兜底路径没被覆盖

`:153` 的断言把 `navigator.clipboard.writeText` 打桩成 `Promise.resolve()`（`:159-163`），理由是 headless 无手势/权限会失败。这个理由**在今天的 Chrome 上是错的**。我用 CDP 的 `Browser.grantPermissions` 实测：

```
Browser.grantPermissions({origin:'http://127.0.0.1:PORT', permissions:['clipboardReadWrite','clipboardSanitizedWrite']})
→ clipboard.writeText 无手势 → 'ok'
→ 真点产品按钮后 clipboard.readText() → 1893 字符，开头正确
```

也就是说：**headless 完全可以验「复制出去的字节对不对」**，只要一行 `Browser.grantPermissions`。而现在这条断言连「按钮是不是真的复制了」都不验——`showManual` 兜底路径（`prompt-copy.js:990`）在打桩下永不触发，断言对它是盲的。用户真正的交付物是**那 1893 个字符**，W5 一条断言都不看它。这是**攻击 4 的种子**。

### 证据 C：这条断言在 CI 上会失败，原因与本缺陷无关

`:153` 的断言用合成 `btn.focus()` + `btn.click()`，`:172` 的返回用 `setTimeout(..., 500)` 后读 `document.activeElement`。两个脆点：

1. **时序**：`execCopySync` 是同步的，`writeText` 的 Promise 是异步的；断言在 `click()` 之后 500 ms 读焦点。打桩下 `writeText` 同步 resolve，`done()` 里的 `announce()` 会 append 一个 `<span role=status>`——我实测这个节点 2 秒后自删（`prompt-copy.js:920`）。如果断言改成 `role=status` 检查（计划 §1.3#6 要求），500 ms 与 2000 ms 的窗口就决定了成败。这是典型的「CI 上偶发」形状。
2. **焦点前置条件**：断言先 `btn.focus()` 再 `click()`，而真实用户是鼠标点。我在 1440×900 上实测**两者结果不同**：合成 click 后 `activeElement = BODY.detail-open`（W2 的焦点还原在**当前工作树**的某个时刻是失效的，见下），真鼠标点后 `activeElement = BUTTON.prompt-copy`。**同一棵代码树、同一断言，两种输入方式两种结论。**

   我实测到的具体数字：工作树在 17:05 那一版上跑 `probe-ui.mjs` 得到 `✗ copy-restores-focus 焦点掉到 body`；20 分钟后同一份文件跑出 `✓ 焦点回到 prompt-copy is-copied`。中间是另一个 Agent 在改 `prompt-copy.js`。我把当时的失败根因定位到了 `execCopySync` 里 `if (lost && ...)` 被改成 `if (false)` 的变异残留（`prompt-copy.js:961` 一度缺失、`:963` 是 `if (false)`）。**这本身就是一条 W5 层面的发现：`probe-ui.mjs --selftest` 的变异是「改文件 → 跑 → finally 还原」，进程被 `Ctrl-C`/超时杀掉时，`finally`（`:382`）不执行，产品文件留在缺陷态。** 我在工作树上就撞到了这份残留：`app.js:1630` 是 `if (false) return;`（方向键守卫被掏空）、`prompt-copy.js` 的焦点还原被注释。这两处都是**产品文件的缺陷态**，而 `git status` 把它们显示成普通修改。

   这比「断言脆」严重：**一个自检工具会把产品改坏并留在坏状态**。CI 上 `timeout-minutes` 到点杀 job、或者用户 Ctrl-C，都会复现。

### 最脆的那条断言，以及怎么稳

**最脆 = 第 4 条 `copy-restores-focus`。** 理由：它同时依赖 (i) 焦点在异步链里保持、(ii) headless 的 clipboard 打桩、(iii) 产品文件没被上一次自检留在变异态。

稳定它需要三件事，按性价比排：

1. **不用打桩**。`Browser.grantPermissions` + `readText()` 断言「复制出去的文本长度 > 1000 且包含本案编号」。这把断言从「焦点在哪」升级成「交付物对不对」，并且顺手把「按钮显示已复制但剪贴板是空的」这个真实缺陷形状覆盖了。成本 ~10 行。
2. **等待条件而不是 sleep**。把 `setTimeout(500)` 换成「轮询 `activeElement` 或按钮文本，最多 2 s，50 ms 一次」。这消除 CI 抖动，成本 3 行。
3. **自检的变异必须落盘可恢复**。见上：`mutations` 表（`:381`）已经是「内存变异、server 返回变异版本」的机制，但**它只在 `runAll` 期间生效**；`:346` 那段旧的 `fs.writeFileSync` 路径（我读到的早期版本）会写盘。当前版本已改成内存（`:381` `mutations.set`），所以**当前版本已经没有这个风险**——但我在工作树上观察到的残留证明**某个中间版本有**，而且没有清理机制（没有 `.mutbak` 的 gitignore，`.gitignore` 里 grep `mutbak` = 0）。

   给 CI 的硬建议：`probe-ui.mjs --selftest` 退出时 `git diff --exit-code` 校验工作树未被改动，否则 exit 2。

### Steelman

「第 4 条断言在你手上**跑绿了**（`✓ copy-restores-focus 焦点回到 prompt-copy is-copied`），8 PASS / 0 FAIL、耗时 107 s。它不是脆的。」

成立，且这是重要的一半：**在干净的树上它是稳的**。我跑了 3 次全量（107 s / 142 s / 363 s 三种负载），断言 4 三次都绿。脆的是：(a) 它在**变异泄漏的树上**会红（而变异泄漏是一个真实的、我亲历的操作风险）；(b) 它验的东西不是产品承诺的东西（焦点 vs 字节）。前者是运行卫生问题，后者是覆盖面问题。

### 判决

**不改断言 4，W5 会交付一个「绿色但验错对象」的探针。** 优先级：`grantPermissions` + 验字节（高）、自检后 `git diff --exit-code`（高）、去掉 sleep（中）。

---

## 攻击 4：这 8 条断言守的是**实例**，不是**类**——而这一类的下一个实例已经在这份文件里了

### 证据：同文件、同一类缺陷、零覆盖

`index.html` 里还有至少 6 处「复述一个可计算量的手写数字」，两个闸门一条都不看：

| 行 | 手写内容 | 实测真值 | `check-ui-copy` | `probe-ui` |
|---|---|---|---|---|
| `:6` / `:7` | `<title>选型台 · 30 个网站设计风格方案`、meta description「30 个…」 | 30（`SCHEMES.length`） | 不看 | 不看 |
| `:88` | 「30 个里有 **18** 个落在暖浅色带」（另 5/3/2/1/1 五个数） | `band` 分组 18/5/3/2/1/1（我复算：暖浅 18、冷暗 5、暖暗 3、中间明度 1、中性浅 2、冷浅 1） | 不看 | 不看 |
| `:97` | 「**19** 个都属于就要扎眼」 | `loud` 分组 19 | 不看 | 不看 |
| `:124` | 「**12** 段——其中 **5** 段默认折叠」 | 12 段（5 段折叠可数） | 只看「多数案 N 段」这个**句式**，`\d+ 段` 裸数字不看 | 不看 |
| `:166` | 「这三十个案」「44 个行业词」「16 个有直连」 | 30 / 44 / 16 | 不看（`#e-*` 有 span 但闸门不校验其值） | 不看 |

我实测了其中两条变异：

```
# M9：:88 的 18 → 27（暖浅色带的真实数字被改错）
check-ui-copy → 合计 FAIL 0 / WARN 0

# M10：:166 的 <span id="e-total">30</span> → 300
check-ui-copy → 合计 FAIL 0 / WARN 0
```

**这就是「闸门只测静态产物、不测用户动作」的同一个病在 W5 里的复发**：`check-ui-copy` 的 `HARDCODED_GUARDS`（`:84-99`）写死两条正则，只覆盖 W2 修过的那两个位置。**它是一份「补丁清单」，不是一条「类判据」。** 计划 §5.3 第 2 条明确要求「断言 HTML 文本里不存在 `/\d+ (颗芯片|段字段|个方案|个行业词)/` 这类手写量」——这条**没实现**，实现的是两个定点正则。

### 更严重的那个类：**没有一条断言读用户复制出去的那段文本**

产品的北极星（计划 §1 第一句）是「一份被复制走的提示词，能让一个店主做出他愿意发布的站」。我做的实验：

```
# 把 buildPrompt 的结果截断到 400 字（交付物坏掉，按钮仍显示「已复制 ✓」，焦点仍还原）
probe-ui.mjs → 8 PASS / 0 FAIL
check-prompts.mjs → 合计 FAIL 0 / WARN 1（WARN 是既有的 mech-value-comment-only）
```

**交付物被砍掉 79%，两个新闸门加一个 W4 闸门全绿。** 这是这一整类缺陷里最贵的一个，而 W5 的 8 条断言一条都不碰它。

（`check-prompts.mjs` 存在 `buildPrompt` 的长度实测——`deliverables/74-plan/ENGINEERING.md:271` 记着 `check-docs` 的 `nums/prompt-len` 断言 1827–2138——所以静态侧**有**这条守卫。但那是**静态读源码/数据**，不是**运行时读剪贴板**。计划自己在 §1.1 里说了：`check-docs` 从不执行 app.js，所以它抓不到「buildPrompt 在运行时被截断/被条件分支绕过」。我的实验证明：运行时截断时静态闸门是绿的，因为它读的是 `prompts.js` 的数据，不是 `buildPrompt` 的输出。）

### Steelman

「8 条断言是**回归测试**，不是**属性测试**。回归测试的天职就是「这条特定的 bug 不再复发」，要求它覆盖整类是把回归测试当验证引擎用，成本会失控。而 W6/Q2 的 `check-distribution`、`ui/total` 等会补上。」

我认真试过这个反驳，它有一半成立：**8 条断言作为回归测试是合格的设计**——每一条都对应一个已确认的缺陷，每一条都有 want/got。问题不在「只有 8 条」，在**W5 的自我描述**：计划 §1.3 的标题是「8 条断言的确切清单」、§5.2 写的是「通用原则」，而交付物的实际覆盖是「W2 的 8 个实例 + 2 条定点正则」。当维护者在 Q2 加第 31 个方案时，`index.html:88` 的 18 会变成错的、`check-ui-copy` 会说 FAIL 0——**因为它的两条正则里根本没有「个落在」这个句式**。

我的反建议很便宜：**把 `HARDCODED_GUARDS` 从「两个位置」改成「一条类判据」**——遍历 `index.html`（剥注释后）所有 `\b\d{1,3}\s*(个|颗|段|组|案|张|种|条)` 的命中，对每一处要求「它在 `data-derived` 里，或在 `KNOWN_PROSE` 白名单里（附理由）」。这是 20 行，且**新增一处手写量会立刻红**。计划 §5.3 第 2 条要的就是这个，只是没落地。

### 判决

**这是 W5 最该补的一块，也是最便宜的。** 20 行换「以后每一处新手写数字都会红」。

---

## 攻击 5：CI 会在 Linux 上**大面积误报**，而且是计划自己预见过、却仍然写进 workflow 的那一条

### 证据 A：`check-stale` 在干净副本上 30/30 假陈旧

我 `git archive HEAD` 到 `/tmp/ci2`（等价于 `actions/checkout`），跑 workflow 里的每一条：

```
check-docs              EXIT=1   README.md: 1 FAIL / 12 PASS
check-docs --selftest   EXIT=1   （见下）
check-prompts           EXIT=0   FAIL 0 / WARN 1
check-twolines          EXIT=0
check-texture           EXIT=0
check-anchors           EXIT=0
check-stale             EXIT=1   ⚠️ 30 项陈旧
check-contract --quiet  EXIT=0
collect-schemes --check EXIT=0
```

`check-stale` 报 30/30 陈旧、每条「落后 32899 分钟」这种量级——这是 `checkout` 把所有 mtime 刷成检出时刻的必然结果，**与产品无关**。计划 §6.3 自己写了「git clone 把所有文件 mtime 设成同一时刻」，并把它归到 `advisory` job、加 `|| true`、加注释说明（`gates.yml:96`、`:112`）。这一步是对的。

但**它占了 `advisory` 的一个 job 跑 30 案的字符串匹配，没有任何断言价值**——在 CI 上它恒红、恒被 `|| true` 吞掉。这是「一盏永远亮着的红灯」（计划 §2.2 自己对 `verify-prototype` 用过的判词）的第二次使用。区别是：`verify-prototype` 的输出**有**价值（远程资源、断链图、溢出），而 `check-stale` 在 CI 上的输出**全是噪声**。正确做法是 CI 里直接不跑它，只在本地跑（文件头 `:19` 已写「可接进 CI / 提交前检查」——应该改成「只做提交前检查」）。

### 证据 B：`check-docs` 在 CI 上会红，因为一个 `.gitignore` 的路径

```
check-docs  EXIT=1
  ✗ paths/exist  1 个文档路径在仓库里不存在：deliverables/59-scratch/s13-duotone.mjs
```

`README.md:546` 与 `README-EN.md:539` 都引用 `deliverables/59-scratch/s13-duotone.mjs`，而 `.gitignore:62` 的 `deliverables/*-scratch/` 把它排除在仓库外（我验过：`git ls-files` 不命中、`git check-ignore` 命中）。**本机绿、CI 红**，原因与产品无关。这是「`paths/exist` 这条断言把 gitignore 目录当成必须存在」的老问题，W5 的 workflow 一上线就会撞到。修法两选一：把该脚本移出 `*-scratch/`（推荐，它是交付物的一部分），或让 `paths/exist` 对 `git check-ignore` 命中的路径降级为 WARN。

### 证据 C：`check-ui-copy.mjs` 的 `ROOT` 推导在 Linux 上会不会静默错位

`:28` `const ROOT = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');`

- Windows：`pathname` = `/D:/Web/style/prototypes/_build` → 正则去掉前导 `/` → `D:/Web/style/...` ✅
- Linux：`pathname` = `/home/runner/work/web-style/web-style/prototypes/_build` → 正则不匹配 → 保留前导 `/` → `/home/.../prototypes/_build` ✅

**这一条在两个平台都对**——因为 Linux 路径本来就以 `/` 开头。真正的问题在**另一类**：如果仓库路径里含空格或非 ASCII（GitHub Actions 的默认路径不含，但自建 runner 或 `$RUNNER_WORKSPACE` 含中文时会），`decodeURIComponent` 是必要的、这里做了。所以 `check-ui-copy` 的路径处理**没问题**。

**但我验过 `check-docs.mjs:206` 与 `:304` 的地方**：`execFileSync(process.execPath, [new URL(import.meta.url).pathname.replace(...), '--root', tmp], ...)`——**没有 `decodeURIComponent`**。在含空格/中文的路径下（本机 `D:\Web\style` 不含空格，所以本机绿），这里传给子进程的脚本路径会被 `%20` 编码污染。CI 的默认路径不含空格，所以不会炸；但**这是一条只在特定环境复现的静默失败**，与 W5 无关，我记下来供 Q2 参考。

**真正会炸的是另一处**：`gates.yml:113` 的 `check-stale || true` 掩盖一切；而 `:100` 的 `verify-prototype || true` 同理。这两条 `|| true` 与 workflow 的「硬/软闸」叙事（文件头 `:5-9`）不一致：**叙事说「只有红了就说明产品坏了的才阻塞」，实际是「我们有两盏永远红的灯，用 `|| true` 关掉」**。这不是错，但它让 `advisory` job 变成一个必然绿的装饰品——与 W5 要治的病同形。

### 证据 D：workflow 本身有三个会在第一次跑就暴露的缺口

1. **`browser` job 没有 `timeout-minutes`。** 计划 §2.2 写的是 `timeout-minutes: 5`；实际 `gates.yml` 全文 grep `timeout` = **0 命中**（三个 job 都没有）。而我实测 `probe-ui.mjs --selftest` 单次 **363 s = 6.05 min**，已经超过计划给的 5 分钟预算；`probe-ui.mjs` 正常跑 **107 s**。没有超时上限意味着：一个卡死的 Chrome 会把 job 挂到 GitHub 默认的 6 小时上限，而那期间 PR 一直是 pending。这是「CI 会失败」里最钝但最贵的一种失败。
2. **`check-ui-copy.mjs --selftest` 不在 workflow 里。** 计划 §2.2 与 §5.3 第 3 条都写了这一行（`run: node prototypes/_build/check-ui-copy.mjs --selftest`）；实际 workflow 只跑 `check-docs.mjs --selftest`（我 grep 确认）。结合攻击 6 的发现（`--selftest` 根本没实现），这里是**计划、文档、实现三处互不相同**：计划要求跑它、`check-ui-copy.mjs:17` 的文档说它存在、实现里没有、workflow 里也没跑。四个位置四种说法——这正是本仓库四大缺陷类里的「声明与实现不符」。
3. **没有 `permissions:` 与 `concurrency:`。** 计划 §2.2 明确写 `permissions: { contents: read }` 与 `concurrency: { group: gates-${{ github.ref }}, cancel-in-progress: true }`；实际都没有。缺 `permissions` 意味着 workflow 默认继承仓库的 `GITHUB_TOKEN` 权限（对 `contents` 是可写），这与计划「CI 绝不 commit 生成物」的承诺不匹配——承诺靠的是「脚本没有写盘代码」，而不是「token 没权限」。缺 `concurrency` 意味着 push 两次会并行跑两套 Chrome（每套 363 s），且旧的那套结果可能后到、覆盖新的结论。

### 判决

**四处必须改：**

1. `check-stale` 从 CI 里删掉（本地保留），或给它加一个 `--ci` 模式只比内容哈希、不比 mtime。**最多 0.2 天。**
2. `deliverables/59-scratch/s13-duotone.mjs` 移出 gitignore（它被 README 引用为「脚本见」），或改 `paths/exist` 的判据。**0.2 天。**
3. workflow 的 `advisory` job 改成「输出归档 + 一条 `::notice::`」，不要用 `|| true` 掩盖 exit code——**至少让日志里能一眼看出它红了**（现在是 `continue-on-error` 在 job 级，`|| true` 在 step 级，双重掩盖）。
4. 按计划补 `timeout-minutes: 5`（`browser`）/ `8`（`static`）、`permissions: {contents: read}`、`concurrency`，并把 `check-ui-copy.mjs --selftest` 加进 `static`——**前提是它先有一个真实现**（攻击 6）。



（关于「Windows 特有假设」的全面扫描：`grep -rn "D:\\\\|/d/Web\|C:\\\\" prototypes/_build/*.mjs` 只命中两处，都在注释或 `shot.mjs:50` 的默认 Chrome 路径——`shot.mjs` 不进 CI。`check-*.mjs` 与 `verify-prototype.mjs` 的 8 个 `new URL(...).pathname.replace(/^\/([A-Za-z]:)/,'$1')` 在 Linux 上都正确。**这一项 W5 没有隐患**，可以放心。）

---

## 攻击 6：W5 漏了什么

### 漏 1（最贵）：**W4 的机制闸门没有自检**，而它抓不到自己承认的那一类

W4 在 `check-prompts.mjs:413` 起加了第 5 块：机制句的每个带单位数字必须在该案 CSS/HTML 里找到。它**没有 `--selftest`**（`grep -c selftest` = 0），W4 的变异测试写在 commit message 里（「改回 S17 96px → FAIL 1」「改回 S07 5 栏对 7 栏 → 抓不到」）。我复跑了第一条：

```
# 在干净副本上把 S17 的 mechanism「窄档 88px」改回「96px」
check-prompts → ✗ [mech-value-not-in-source] 1 条   ← 抓到了
```

**它能抓，但抓它的那次运行是一次性的、不可重复的人肉动作。** 而 W5 的任务恰恰是「把这类一次性验证变成常设的」。`check-prompts` 是 `static` job 的硬闸（`gates.yml:44-45`），它的 5 块断言里只有第 5 块是 W4 新加的、也是最容易腐坏的（它依赖正则抽 CSS 数字），却没有任何变异自检。W5 的自检基础设施（`--selftest` + 临时副本）**可以 10 行复用**到它身上，但没做。

**判定：W5 应该给 `check-prompts` 加一个 `--selftest`，至少覆盖 W4 那 3 条已知变异（S17 96px、S03 焦距、S10 1px）。** 这是「新机制必须自带自检」这条纪律的一致应用——W5 对 `probe-ui` 用了这条纪律，对 W4 的机制闸门没用。

### 漏 2：**没有任何闸门会抓一个说谎的 CREDITS.md**（W3 的产出无守卫）

W3 重写了 `LICENSE`/`README`/30 份 `CREDITS.md` 的数字（46 → 7）。我往 `prototypes/S17-*/assets/CREDITS.md` 追加一段「本文件所有 5 张图的作者均已逐张核实并保留许可，可自由商用」——**这是一句谎**（该文自己的正文写着 3 张是「推定」）：

```
check-docs       EXIT=1  ← 但红的是 paths/exist（5 个文件），与 CREDITS 无关
check-texture    EXIT=0
check-anchors    EXIT=0
check-prompts    EXIT=0
check-twolines   EXIT=0
verify-prototype S17 EXIT=0
```

`verify-prototype.mjs:124` 只查 `existsSync(CREDITS.md)`——文件在就行。`check-docs` 提到 CREDITS 只在 `:890` 的一条路径解析注释里。**W3 的「法律面干净」是一个纯人工结论，没有任何闸门守它。** 而 W3 的更正过程本身就证明了这类声明会腐坏（commit `d645df9` 的正文：「我一度以为重跑过了并得出逐字节一致——那是把脚本静默失败当成了成功」）。

可判定的部分至少有一条：**CREDITS 声明「生成」的案，必须能 stat 到生成脚本**；**声明「已核实」的图，必须逐张有 URL 或 Commons 文件名**。S17 的 CREDITS 今天有逐张表（commit 说的），所以这条断言现在就能绿；它是廉价且真的。

**判定：W5 没做，且应该做。** 但这是 W3 的债，不是 W5 的失职——我把它列为「W5 之后最近的一次补」。

### 漏 3：`fieldOut()` 让「12 段」这条断言**从今以后不能再变**

W3/W4 加的 `fieldOut()`（`app.js:1189`）是为了让 `check-docs` 的 `field('` 计数保持 11+1=12。我验过它今天是对的：

```
app.js 剥注释后 field( 字面量 = 11，auditFold(r)+ = true，fieldOut = 1
check-docs panel/fields → ✓ 12 段字段（field() 11 + auditFold 1）
probe-ui field-count   → ✓ 界面 12 段 = 实际 12 段
```

但这是一个**刻意维持的巧合**：页面实际渲染 13 段（`fieldsNotOut=12`、`fieldsOut=1`，我实测），而「12」这个数同时出现在 README、`index.html:211`、`app.js` 注释、`check-docs` 判据里。`fieldOut` 的存在意味着：**只要有人把「不适合的场景」改成 `field()`（一个极自然的动作——它就是同一形状的字段），`check-docs` 会红、`probe-ui` 会红、`index.html` 的 12 会变成 13 而 README 还是 12。** 三个闸门会同时红，所以是安全的。**但 `field-count` 的 `data-derived` 是假的（攻击 2b），所以这条链上唯一的真守卫是 `probe-ui` 的断言 3**——而断言 3 没有自检（攻击 1 的差集里有它吗？没有，它有文件变异，`'field-count': fieldCount` → `'field-count': 10`）。它测的是「`fillDerived` 里写死 10」→ 红，但那是**读的是同一份假派生**。真正该测的变异是「把 `fieldOut` 改回 `field`」，现在没人测。

**判定：加一条自检变异 `fieldOut(...) +` → `field(...) +`，预期 `probe-ui` 断言 3 与 `check-docs panel/fields` 都红。** 这验证的是「12」这条不变量真的被两侧同时守着。

### 漏 4：`collect-schemes --check` 被放进硬闸，但它**不是**计划里的 `check-artifacts`

`gates.yml:53-54` 跑 `collect-schemes.mjs --check`。计划 §6.3 设计的 `check-artifacts.mjs`（内容哈希、`data.js.gate.at` 与 `report.json.at` 逐案对账、A1–A5）**不存在**（`ls` 确认）。`collect-schemes --check` 我在干净副本上跑是 `EXIT=0`、输出是「缺 X：无」的字段完整性——它是个好东西，但它**不验**计划里最要紧的那条：`data.js` 是 `report.json` 的快照，S01 实测落后 70 分钟（计划 §6.2 自己记的）。**W5 的 workflow 把一个占位符写成了硬闸的名字。**

**判定：这不是 W5 的锅（`check-artifacts` 是 §7 第 16 项，2 天），但 workflow 的注释应该说清「`collect-schemes --check` ≠ 生成物新鲜度」，否则下一个人会以为 §6 已经守住了。**

---

## 排名（按「不修就会让 W5 变成下一个假绿」的严重性）

| # | 攻击 | 证据 | 严重性 | 修复成本 |
|---|---|---|---|---|
| 1 | `probe-ui --selftest` 的 `scenes-no-rendered` 自检是同义反复：它在**断言被掏空**和**断言正确**两种情况下都给出同一个答案，与断言真假无关；且整个 `--selftest` 会抖 | 方向 A（只掏空断言）→ 自检仍打「✓ 红」；方向 B（只放回缺陷、断言不动）→ 断言正确报红、自检打「✗ 没红」；`field-count-derived` 在 A 树上 2/2 次假红、在干净树上 3/3 次真绿 | **阻断** | 6 行（照 `count-aria-live` 已改好的范式）+ 修抖动 |
| 2 | `field-count` 的 `data-derived` 从不派生（详情渲染前 `#d-body` 为空、`:1733` 跳过）；兜底 12 被改成 99 时 `check-ui-copy` 仍全绿 | 实测 field-count 文本 12 而字段数 0；99 变异 `check-ui-copy FAIL 0` | **高** | 15 行（加 `data-derived-at` 标记） |
| 3 | `copy-restores-focus` 验的是焦点不是字节；headless 明明可以 `grantPermissions` 拿真剪贴板 | 截断 buildPrompt 到 400 字 → 8 PASS / 0 FAIL | **高** | 10 行 + 3 行 |
| 4 | 闸门守实例不守类：`index.html` 还有 ≥6 处同类的裸数字（18/19/30/44/16），两条正则一条都不覆盖 | `:88` 18→27、`:166` 30→300 两次变异均 `FAIL 0` | **高** | 20 行（一条类判据） |
| 5 | CI 上 `check-stale` 30/30 恒红（mtime）、`check-docs` 因 gitignore 路径恒红；另缺 `timeout-minutes`/`permissions`/`concurrency`，而 `--selftest` 实测 363 s 已超计划给的 5 min | 干净副本实测 EXIT=1/1；`grep timeout` = 0 命中 | **中** | 0.5 天 |
| 6 | W4 的机制闸门无自检；`check-ui-copy --selftest` 文档写了但未实现 | `grep -c selftest` = 0 / 仅注释命中；`--selftest` exit 0 与正常跑无差别（17:22 版，18:30 复验未变） | **中** | 0.5 天 |
| 7 | W3 的 CREDITS 无内容守卫（谎报「已核实」不红） | 注入假声明 → 6 个闸门全绿 | **中**（W3 的债） | 1 天 |
| 8 | `fieldOut` 维持的「12 段」不变量只有 `probe-ui` 一条真守卫，而它无反变异 | `fieldOut → field` 无一闸门测 | **低** | 0.2 天 |

---

## 「比另外 7 条更重要的那一条断言」

**第 4 条，`copy-restores-focus`——但不是因为它现在测的东西。**

理由不是「焦点」重要。是这个：**它是 8 条里唯一一条站在「交付动作」上的断言**，而产品的北极星是「一份被复制走的提示词」。其余 7 条测的都是**界面陈述**（数字对不对、样式倒没倒、属性在不在、隐藏图多不多）。只有第 4 条碰了「用户按下去、东西带走」这条链。

而它现在恰恰**在链条的起点就停了**：验的是按钮之后焦点去哪，不是剪贴板里有什么。我实测证明 headless 完全能验字节（`grantPermissions` + `readText` → 1893 字符），并且证明把 `buildPrompt` 截断到 400 字时**没有任何闸门会红**。所以这条断言的正确形态是：

> 真鼠标点 `.prompt-copy` → `clipboard.readText()` 的长度 > 1000、包含本案的 `S\d{2}`、包含提示词的开头两句 → **并且**焦点回到按钮。

一条断言，同时覆盖「交付物存在」「交付物是本案的」「键盘用户没被踢出去」。它比现在这条强一个数量级，成本 10 行。如果 W5 只修一处，修这里。

（第二重要是攻击 1 的**自检派生化**：现在断言清单与自检清单是两份手写数组，`ok === 8` 是第三个手写常量。把它改成一个数组派生出的三个视图，W5 往后加断言就再也不会出现「断言有、自检没有」这个形状。这比补哪一条具体断言都重要。）

---

## 「能抓住整类、而不只是实例的最便宜的东西」

**一条『类判据』：遍历 UI 源码里每一个「数字 + 量词」，要求它要么在 `data-derived` 节点里、要么在带理由的白名单里。**

```js
// check-ui-copy.mjs，约 20 行，替换现在的 HARDCODED_GUARDS 两条正则
const QTY = /\b(\d{1,3})\s*(个|颗|段|组|案|张|种|条)/g;
const WHITELIST = new Set(['index.html:41', 'index.html:124']); // 「3 个推荐 + 3 个明确排除」这类有上下文的散文
for (const [file, src] of [['index.html', html], ['wizard.html', wizardHtml]]) {
  for (const m of src.matchAll(QTY)) {
    const line = lineOf(src, m.index);
    if (insideDerivedSpan(src, m.index)) continue;
    if (WHITELIST.has(`${file}:${line}`)) continue;
    add('FAIL', 'naked-quantity', `${file}:${line} 手写了「${m[0]}」——要么改成 data-derived，要么进白名单并写理由`);
  }
}
```

**为什么这是「整类」而不是「实例」**：这一类缺陷的定义是「界面复述了一个可计算量，但数字是手打的」。判据不关心**哪一个**量（芯片数、字段数、色带数、行业词数），它只关心**形状**：裸数字 + 量词 + 不在派生节点里。我实测这条正则在**剥掉注释后**的 `index.html` 上一共命中 **8 行**（`:6` 30 个、`:7` 30 个、`:14` 11 组、`:41` 3 个 ×2、`:88` 30 个 + 18 个、`:97` 19 个、`:124` 5 段、`:166` 30 个），其中 5 行是**真该改的**（`:6`/`:7` 的 30、`:88` 的 18、`:97` 的 19、`:166` 的 30/44/16 那一组），另外 3 行是散文（`:14`、`:41`、`:124` 的「5 段默认折叠」）——正好对应白名单 3 条。计划 §5.3 明确要求 `ui/total`、`ui/band`、`ui/loud`、`ui/scene-index` 四个 id 覆盖那 5 行。

我实测过：把这 5 行里任意一处改错，现有闸门 **0 反应**（M9 改 `:88` 的 18→27、M10 改 `:166` 的 30→300，两次 `check-ui-copy` 都是 FAIL 0 / WARN 0）。加上这条，改错会红、新加会红、加第 31 个方案时忘改会红——**这才是「以后同类缺陷不再复发」的字面意思**。

成本：20 行 + 1 次清 6 处白名单/改派生 ≈ 0.5 天。比 W5 现在花在 `check-ui-copy` 的 5 条定点断言（约 1.5 天）便宜，覆盖大一个数量级。

**唯一的 steelman**：「类判据会误报——`\d+ 个` 在中文散文里到处是（「3 个推荐 + 3 个明确排除」「5 段默认折叠」）。」对，但误报是**可穷举的、一次性的**（今天实测就 3 行散文），而漏报是**无限的、每次加内容都增长**。而这个仓库处理误报的既有纪律就是白名单 + 理由（`check-docs` 的 `PREFIXES`、`check-prompts` 的 `MECH_VOCAB`），不是放弃类判据。

---

## W5 按现在的范围值不值 5 天

**不值 5 天。值 2.5–3 天，前提是砍掉一半、加上那条类判据。**

拆一下它现在的 5 天（按计划 §7 与实测工时）：

| 项 | 计划 | 实测（我跑的） | 值不值 |
|---|---|---|---|
| vendor `cdp.mjs` + 探针骨架 | 1.5 d | 已有（W1 就 vendor 了），骨架 ~2 h | 已完成 |
| 8 条断言 + `--selftest` | 1.5 d | 8 条真跑通 107 s（3 次复跑稳定）；`--selftest` 363 s，**7 条真变异 + 1 条同义反复**，且**自身会抖**（同一份代码 8/8 与 7/8 都出现过） | **值 1 d，但必须换掉最后 1 条、并修抖动** |
| `check-ui-copy` 9 个 id + `--selftest` | 1.5 d | 实际交付 5 条断言（规则名与 `ui/*` 对不上）、0 个 selftest。计划 §5.3 的 9 个 id 里，**只有 `ui/chips` 与 `ui/fields` 有等价断言**（以 `chip-count-hardcoded` / `field-count-hardcoded` 之名），`ui/live-region` 以 `count-not-live` 覆盖了一半（不验 `aria-atomic`）；`ui/total`、`ui/scene-index`、`ui/band`、`ui/loud`、`ui/facts`、`ui/img-src` **六个完全没有** | **只值 0.5 d，欠 1 d** |
| GitHub Actions 三 job | 1 d | 已交付，但 CI 上 2 个 job 会红（stale + paths） | **值 0.5 d，欠 0.5 d** |
| `check-prompts` 的机制闸门自检 | 未列 | 0 | **该加，0.5 d** |

**为什么砍到 3 天还更强**：现在的 5 天里，有 1.5 天在补 W2 的 8 个实例（8 条断言），1.5 天在补 W2 的 2 个实例（`check-ui-copy` 的 5 条），1 天在一个会在 CI 上误报的 job。**全部工作在追已经修完的 bug。** 而攻击 4 那条类判据（20 行、0.5 天）会覆盖**下一次**的 bug——那才是 W5 承诺的「以后同类缺陷不再复发」。

**我的建议（3 天版）：**

1. **0.5 d**：把 `probe-ui` 的自检改成「断言集合 = 自检集合」（数组派生），补 `scenes-no-rendered`、`count-aria-live` 的文件变异、`fieldOut→field` 的交叉变异。**这是阻断项。**
2. **0.5 d**：`copy-restores-focus` 换 `grantPermissions` + 验字节。**这是唯一碰交付物的断言。**
3. **0.5 d**：`check-ui-copy` 的 `HARDCODED_GUARDS` 换成类判据 + 6 条白名单；**顺手修 `field-count` 的假派生**（在详情渲染后重算，或改成 `fieldOut` 同款的「不声明派生」）。
4. **0.5 d**：CI 修两处（`check-stale` 移出 CI、`s13-duotone.mjs` 移出 gitignore）；给 `check-prompts` 加 3 条机制变异自检。
5. **0.5 d**：`--selftest` 跑完 `git diff --exit-code`，把「自检把产品改坏留在坏状态」这条堵死。
6. **0.5 d** 缓冲 / 补 `check-ui-copy --selftest` 的真实现（或删掉那行文档——**文档写了没实现比没写更坏**）。

**Q1 验收里的「probe-ui 8 条全绿」这一句，现在有 12.5% 的自检是假的（8 条里 1 条同义反复）。** 修掉攻击 1 之前，这句话不该出现在验收清单里——因为「绿」在今天这个实现下，既可能是断言对了，也可能是断言被掏空了。

---

## 附：复现命令

```bash
# 干净副本（等价 CI checkout）
rm -rf /tmp/ci2 && mkdir /tmp/ci2 && git archive HEAD | tar -x -C /tmp/ci2
cd /tmp/ci2
node prototypes/_build/check-stale.mjs        # EXIT=1，30/30 假陈旧
node prototypes/_build/check-docs.mjs         # EXIT=1，paths/exist 命中 gitignore 文件

# 攻击 1a：只掏空断言 8（产品树健康）→ 自检仍给它「✓」
#   在 probe-ui.mjs 的 scenes-no-rendered 体内插入 return {ok:true}，app.js 不动
#   基线 md5（18:54 版）：b403d6dcb3933ecece243d3b5be6c96d  probe-ui.mjs
node prototypes/_build/probe-ui.mjs            # ✓ scenes-no-rendered NEUTERED
node prototypes/_build/probe-ui.mjs --selftest # ✓ scenes-no-rendered → 红 ; 8/8 ; exit 0   ← 给坏断言背书

# 攻击 1b：只让缺陷回来（断言不动）→ 断言对、自检指控它
#   只删 app.js 的 fieldOut('不适合的场景', ...) 那一行
node prototypes/_build/probe-ui.mjs            # ✗ 详情面板里没有「不适合的场景」7 PASS / 1 FAIL
node prototypes/_build/probe-ui.mjs --selftest # ✗ scenes-no-rendered 没红   ← 指控好断言

# 攻击 1c：自检自己抖
#   在攻击 1a 的树上连跑：field-count-derived 连续 2 次「没红（探针坏了）」→ 7/8
#   在干净树上连跑 3 次：8/8

# 攻击 2：field-count 是假派生
node prototypes/_build/probe-ui.mjs            # field-count 文本 12，而 #d-body 字段数 0（详情未开时）
#   把 index.html:211 的 >12< 改成 >99<
node prototypes/_build/check-ui-copy.mjs       # FAIL 0 / WARN 0

# 攻击 3：截断交付物，无人发现
#   在 prompt-copy.js 的 copyPrompt 里把 buildPrompt(...) 包一层 .slice(0, 400)
node prototypes/_build/probe-ui.mjs            # 8 PASS / 0 FAIL
node prototypes/_build/check-prompts.mjs       # FAIL 0 / WARN 1

# 攻击 3 的正面证据：headless 能验剪贴板字节
node deliverables/74-w5/_rt-clipgrant.mjs      # Browser.grantPermissions → readText 1893 字符

# 攻击 4：同类缺陷零覆盖
#   index.html:88 的 18 → 27 / :166 的 30 → 300
node prototypes/_build/check-ui-copy.mjs       # FAIL 0 / WARN 0

# 攻击 6：CREDITS 谎报不红
#   往 prototypes/S17-*/assets/CREDITS.md 追加「均已逐张核实并保留许可，可自由商用」
for g in check-docs check-texture check-anchors check-prompts check-twolines; do node prototypes/_build/$g.mjs; done
node prototypes/_build/verify-prototype.mjs S17-revenue-stamp-stub   # 全绿

# 本次所有红队探针（不进产品）
ls deliverables/74-w5/_rt-*.mjs
```

> 探针清单：`_rt-probe.mjs`（DOM 总览）、`_rt-derived.mjs`（派生失效）、`_rt-clip.mjs` / `_rt-clipgrant.mjs`（剪贴板权限）、`_rt-focus.mjs` / `_rt-copyroot{,2,3}.mjs`（复制焦点根因）、`_rt-brittle.mjs` / `_rt-taut.mjs` / `_rt-counts.mjs`（断言弹性）。全部可独立运行，不修改产品文件。

---

## 附二：审阅期间的树卫生（必须记录）

这份报告是在**另一个 Agent 正在写这三个文件**的时候做的。我因此观察到两件与 W5 直接相关的事实，它们不是「审阅环境噪声」，而是产品的风险：

1. **`probe-ui.mjs --selftest` 的中间版本会在产品文件里留下缺陷态。** 我在 17:05 拿到的工作树上，`app.js:1630` 是 `if (false) return;`（方向键守卫被掏空）、`prompt-copy.js` 的焦点还原块被注释成 `if (false)`，两者都是 selftest 变异没还原的残留，而 `git status` 只把它们显示成普通修改。当前版本已改用内存变异（`mutations` 表，`probe-ui.mjs:381`），风险已消除——但**没有任何机制保证它下次不会被改回去**，也没有 `.gitignore` 条目兜底（`.gitignore` 里 grep `mutbak` = 0）。
   **建议**：selftest 收尾强制 `git diff --exit-code -- prototypes/_selection/`，非零即 `exit 2`。这是 4 行。

2. **18:21 的工作树带着 `app.js:7` 的 `throw new Error("x");`。** 这是一次变异测试的残留（页面会整个不渲染）。**任何在那 2 分钟内跑 `probe-ui.mjs` 的人都会拿到 8 条 FAIL，并得到完全错误的结论。** 这恰好演示了攻击 3 的论点：一个会改产品的自检工具，必须自己带「我有没有改坏东西」的检查。

3. **`check-docs.mjs --selftest` 在本机退出 0，在干净副本上退出 1。** 我最初在 `/tmp/freshclone` 上看到它 exit 1、并把中间那段 6 FAIL 误读成真实缺陷；实际上那是 selftest **故意**注入的腐化输出，末尾是 `✓ 自测通过`。本机与干净副本的差别是 `deliverables/59-scratch/` 目录存在与否（gitignored）。**这条差异本身是攻击 5 证据 B 的独立复现**：`paths/exist` 的绿/红取决于一个不在 git 里的目录。

**W5 的 `static` job 第一条就是 `check-docs.mjs`（`gates.yml:36`），它在干净 checkout 上会红。** 我实测过：
```
rm -rf /tmp/ci3 && mkdir /tmp/ci3 && git archive HEAD | tar -x -C /tmp/ci3
cd /tmp/ci3 && node prototypes/_build/check-docs.mjs
  ✗ paths/exist  1 个文档路径在仓库里不存在：deliverables/59-scratch/s13-duotone.mjs
```
**这是 W5 上线第一天的第一条红灯，且与产品无关。**
