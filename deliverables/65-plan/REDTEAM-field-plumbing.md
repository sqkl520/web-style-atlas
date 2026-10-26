# 红队报告：字段接通计划的四条前提，错在哪里

> 审查对象：`deliverables/65-plan/PLAN-field-plumbing.md`（807 行）+ `LEAD-self-correction.md`
> 审查方式：只读。所有数字本机现跑，不引用任何他人结论。
> 探针脚本：`deliverables/65-plan/_rt_p1..p28*.mjs`（27 个，全部只读；无一个写在仓库根目录）
> 环境：Windows / Node v26.12.1 / Chrome（headless，CDP 直连，非模拟）

---

## 判决

| # | 前提 | 判决 | 一句话理由 |
|---|---|---|---|
| 1 | `机制` 解析了从未使用，是 bug，要修 | **不成立** | 30/30 份规格里**没有一个叫「机制」的字段标题**；它的真身是 `1-附（…机制）`，剥括号后 key 为空串，走 `extract-dna.mjs:101` 的独立通路，`prompts.js` 已 30/30 到位。这是**清单命名与实现的错位**，不是数据漏接。 |
| 2 | 「26,096 字蒸发」 | **不成立（数字）／部分成立（存在性）** | 26,096 用 11 种口径全试过，**无一命中**；可复现的真值只有 10,539 字。Lead 自查后的 11,220 逐案系统性偏小 2–4 字，合计差 100，**同样无法用单一确定口径复现**。而且它不叫「蒸发」——内容在 `02-anti-ai-rules.md` 里以条款形式存在（16 种 `C-*`，116 次引用，30/30 案都有定义）。 |
| 3 | `primary` / `buttonText` / `scenesNo` 零消费，是 bug | **不成立** | `primary === palette[1]` **30/30**（同义反复）；`buttonText` 17 个非空值 **17/17 = argmax(主色)**，是生成算法的中间量而非设计决定，且 S19 的真实按钮字色是算不出来的第三值 `#E4DECD`；`scenesNo` 是 `scenes` 的子串 **30/30**。接通 = 展示重复信息，其中 `scenesNo` 进搜索还会**重演一个已修掉的 bug**（新增 34 行命中，100% 只出现在否定句里）。 |
| 4 | 详情面板 2991px 太深，要重构可发现性 | **部分成立，但诊断与处方互相抵消** | 2991 是旧值（我实测 3274–4073，中位 3844）。**但面板变深的每一步都是「接通死字段」造成的**：2991 → +413(landing) → 3478 → +491(layout) → 3969，逐字段删除实测，加和精确到 **0px**。前提 1/2/3 与前提 4 是同一件事的两面，不能同时成立。 |

**总判**：这轮**不该做字段接通**。四条前提里三条不成立、一条自相抵消。真正的欠账在别处（见末节），其中两条就在 Lead 的**主动线**上。

---

## 前提 1 判决：`机制` 不是孤儿，是清单写错了名字

### 证据 A：30 份规格里，「机制」这个字段标题出现 0 次

复刻 `collect-schemes.mjs:191-201` 的三条切分正则（逐字照抄，含 `-附` 分支与 `dec()`），统计 `spec.fields` 的真实键：

```
$ cd deliverables/65-plan && node _rt_p2_fields.mjs
=== FIELDS 声明 13 项，逐项统计「在 spec.fields 里真实存在的案数」 ===
30/30  ✅ 一句话视觉定义
 0/30  ❌ 机制
30/30  ✅ 美学家族与参考
30/30  ✅ 配色系统
30/30  ✅ 字体策略
27/30  ⚠ 布局与网格
30/30  ✅ 关键视觉元素
30/30  ✅ 动效与交互
30/30  ✅ 去 AI 味审查点
30/30  ✅ 反 AI 味风险与规避
30/30  ✅ 适用场景
30/30  ✅ 可落地要点
30/30  ✅ 设计师签名式怪癖
```

`机制` 是 **0/30**。不是「解析了没赋值」，是**连键都没生成过**。

### 证据 B：那 12 处 `-附` 段，剥掉括号后 key 是空串

```
$ node _rt_p6_splitter.mjs
=== 全 30 案：键被括号剥空而丢弃的段 ===
  S01  原始key="（去掉名字之后的机制）"  段长=74  "一块实色多边形以 11° 切入 4 栏版心，24px 实体隔条撑开栏沟，红块越界"
  S02  原始key="（去掉名字之后的机制）"  段长=75  "同一张位图以一条 2px 中轴做 180° 相位取样，两侧各 7 级与 9 级、"
  ...
  S08  原始key="（反套路改造三指标）"  段长=331  "必须存在——玻璃件必须写出四项物理特征：等效厚度 8mm、倒角 2mm 且角度 "
  S09  原始key="（去掉名字之后的机制）"  段长=91  "价目行以 1.5° 整体倾斜，行高 56px、左端起点错开 4 至 12px，描"
  S10  原始key="（去掉名字之后的机制）"  段长=84  "五栏按 6:7:9:8:5 分宽，红版相对黑版固定右下错 1px、进视口时先错 "
  合计 12 段 / 1465 字被丢弃
```

`collect-schemes.mjs:211` 的 `key.replace(/（[^）]*）/g, '')` 把 `（去掉名字之后的机制）` 整块削成空串，`:213` 的 `if (key && …)` 于是整段丢弃。

### 证据 C：`机制` 走的是另一条路，且已经 30/30 到位

```
$ node _rt_p1_mechanism.mjs
方案数：30｜MECHANISMS 条数：20
规格里有「机制」字段的：0/30
规格机制段与 mechanisms.mjs 完全一致的：0
```

`extract-dna.mjs:101` 自己用 `/1-附（去掉名字之后的机制）[：:]\s*([^\n]+)/` 从 md 直抓（**绕开 collect-schemes**），得 `dna-clean.json` 的 10 案；`build-prompts.mjs:104-112` 再用 `MECHANISMS` 补 S11–S30 的 20 条。实测：

```
$ Select-String -Path prototypes\_selection\prompts.js -Pattern '"mechanism":'
（30 条）
```

**10 + 20 = 30，无交集、无空洞。** 这条链是通的。

### 唯一的真 bug 是命名，不是数据

`FIELDS` 数组（`collect-schemes.mjs:136`）是**一句人类可读的注释冒充了机器可读的契约**——它从未被任何代码消费：

```
$ Select-String -Path prototypes\_build\collect-schemes.mjs -Pattern 'FIELDS\s*\.|FIELDS\['
(空=从未被使用)
```

它只在注释里被引用三次。**一个从不被求值的常量，谈不上「声明了却没实现」** —— 它连「声明」的效力都没有。所以「第三次同类问题」这个模式判断也错了：前两次（`landing` / `audit`）是**赋值表漏行**，这次是**注释与实现不同步**。两种病，同一个症状，不该用同一个处方。

> ⚠️ 顺带：Lead 已经在工作区里**未提交地**写了这段结论（`collect-schemes.mjs:114-135` 的新注释：「而它**不是漏了，是走了另一条路**，别再来"修"」）。所以前提 1 已被 Lead 自己推翻了一半——但 `PLAN-field-plumbing.md` §3.2 的结论「不接通」仍写成了「它是真孤儿」，措辞与它自己的代码注释相反。

---

## 前提 2 判决：26,096 复现不出来，11,220 也复现不出来

### 证据 A：11 种口径全试过，26,096 无一命中

```
$ node _rt_p5_calibration.mjs
=== 「第 8 字段 去 AI 味审查点」全 30 案 各种口径合计 ===
   3766  decBodyChars
   3889  bodyChars
   6741  han
   9018  decBodyBytes
   9141  bodyBytes
  10305  nonspace
  11109  decFullChars
  11380  fullChars
  26917  decFullBytes   ★ 与 26,096 相差 821
  27188  fullBytes      ★ 与 26,096 相差 1092

=== 精确命中检查（26,096） ===
无任何口径精确等于 26,096
```

以 `data.js` 实际存储值复核（`_rt_p13`）：`audit` 字符数 **10,539**、UTF-8 字节 **25,767**、汉字 **6,561**。

**26,096 比字符数大 2.48 倍，比字节数小 329。** 它是一个既不等于字、也不等于字节的数——把中文 3 字节当 1 字讲，虚报了 2.44 倍。

### 证据 B：自查后的 11,220，逐案系统性偏小 2–4 字

```
$ node _rt_p24_11220.mjs
口径                         30 案合计   vs 11,220
full.trim().length             11320         100
full.length（含尾空行）              11380         160
dec(full).length               11109        -111

★ 精确命中 11,220 的口径：无
最接近 11,220 的：full.trim()=11320（差 100）｜dec(full)=11109（差 -111）
```

逐案对比 `full.trim()`（字段 8 原文块含标题行、trim 尾空行）与 Lead 张 1：**30 案全部偏小**，S01 差 2、S11 差 4、S13 差 4、S26 差 4……合计差 100。

11,220 恰好是它自己那张表的和（我复算，和值自洽），**但那张表本身的口径复算不出来**。所以「自查后正确」这句话也不成立：数字自洽 ≠ 口径可复现。

**唯一可复现的真值：10,539 字**（`dec()` 之后，即 `data.js` 的 `audit` 字段实际值，两个独立脚本同值）。Lead 两轮都错了，方向还相反：先夸大 2.3 倍，再夸大 6.5%。

### 证据 C：它不是「蒸发」——它在 02 号文件里活着，而且有定义

```
$ node _rt_p28_cite.mjs
audit 字段里的条款引用：
  C-* 总出现 116 次，去重 16 种
  P*  总出现 21 次，去重 12 种
  R-* 总出现 9 次，去重 5 种
  含至少一个条款引用的案：30/30
这些条款定义在哪：
  deliverables/02-anti-ai-rules.md 里出现的 C-1.3 / C-2.11 / C-2.15：C-1.3=有 C-2.11=有 C-2.15=有
```

这 10,539 字不是独立知识，**它是 `02-anti-ai-rules.md` 那套条款的逐案打勾记录**。条款本体在 02 号里、在 README 的「审查链条」一节里被明写为对外承诺。

**所以正确的问题是**：用户需不需要在选风格时读到「本方案反了 C-1.3 与 C-2.14」？还是说这是给评审者看的？

### 证据 D：它是评审文本，不是产品文案——三条内部证据

1. **73 处「跳脱之处」**（`_rt_p28`）。这是评审语汇：回答「这个方案够不够跳脱」，不是「这风格适不适合我」。
2. **S13 的 780 字里，前 307 字是审美判据，后 473 字是评审清单**：

```
$ node _rt_p12_chain.mjs
  含「反套路改造三指标」= true（位于第 307 字）
  ↓ 分界线之后的正文（是评审清单，不是审美判据）：
    反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾） - 必须存在 X：单向硬光源方位角常驻 135°（误差 ±10°）；压印深度 0.4mm 等效；纸纤维起伏由程序化噪声生成、亮度幅度 ±2 级、纤维方向偏 12°；阴影只出现在凹槽一侧并带接触阴影。四条缺一即不成立。 - 必须不存在 Y：全站不得出现圆角胶囊按钮…
```

「供 V-11 / R-40 逐条打勾」——**这是给评审者用的打分表**，作者自己写了用途。

3. **条款号在用户界面上无处可查**：

```
$ node _rt_p28_cite.mjs
从用户能点到的界面能否到达 02-anti-ai-rules.md：
  prototypes/_selection/index.html               命中 0
  prototypes/_selection/app.js                   命中 0
  prototypes/_selection/prompt-copy.js           命中 0
  prototypes/_selection/prompts.js               命中 0
  README.md                                      命中 0
  ⇒ 合计 0 处。
```

用户读到「反 C-1.3」时，界面上**没有任何链接**能查这句话什么意思。

### 证据 E：Lead 说「S11–S20 各 1800 字」是它自己的切分 bug

它的自查已承认并撤回（`LEAD-self-correction.md` L29-30）。我复算真实分布：**276–780 字，中位 327，只有 S13 一个异类（780）**。

这条撤回是对的，也说明一件事：**同一个切分口径，两轮都算错，还都拿去派单了。** 那么「26,096」这个数支撑的整个「体量本身说明它不是给终端用户看的」论证，证据链是断的。

---

## 前提 3 判决：三个字段都是冗余，其中一个是「接回去就重演已修 bug」

### 3.1 `primary` = `palette[1]`，30/30 精确成立

```
$ node _rt_p4_redundancy.mjs
primary === bg            : 0/30
primary === palette[0]    : 0/30
primary ∈ palette         : 30/30   （其中 =palette[1] 的 30，index>1 的 0）
```

逐案表（节选）：

```
S01  #EFE7D7   #C1121F   #EFE7D7    #C1121F    idx=1
S15  #E7EBE9   #3A3F45   #E7EBE9    #3A3F45    idx=1
S30  #EDEDED   #007B3F   #EDEDED    #007B3F    idx=1
```

**而且这不是「碰巧相等」——是构造顺序直接保证的。** `collect-schemes.mjs:411-415`：

```js
const pal = [];
if (rec.bg) pal.push(rec.bg);                                          // pal[0] = 底色
if (rec.primary && !pal.includes(rec.primary)) pal.push(rec.primary);   // pal[1] = 主色
for (const h of fromSpec) { if (pal.length >= 4) break; … }             // pal[2..] = 其余
rec.palette = pal;
```

```
$ node -e "…构造顺序复核…"
palette 由 L411-415 构造即可保证 pal[1]===primary 的案： 30/30
其余： 0
```

紧接着的「兜底」（`collect-schemes.mjs:421-422`）是**同义反复的自我确认**：

```js
if (pal.length >= 2 && (!rec.primary || rec.primary === rec.bg || !pal.includes(rec.primary))) {
  rec.primary = pal[1];   // ← palette 本来就是用它建的，这个分支只可能在 primary 缺失时触发
}
```

另有一半案是被这个兜底**覆写**掉的：

```
$ node _rt_p19_primary.mjs
来自 _CURRENT-VALUES 的：13/30｜被兜底覆写成 palette[1] 的：17/30
```

⇒ **`primary` 与 `palette[1]` 是同一个值的两种写法。** 接通 `primary` = 把调色板第 2 个色块再单独显示一次，30/30 案无一例外。

> 我一开始把它写成「30/30 成立」，力度不够——那听起来像巧合。**实际是代码结构上的必然**：只要 `palette` 非空，`palette[1]` 就定义等于 `primary`。这两个字段**不可能不相等**，所以「接通它」这个动作在语义上是恒等映射。

Lead 的 §3.3 结论（「不接通为独立字段；并进配色行」）方向是对的，但它给的理由是「实测相等」，没有指出**这是构造不变量**——所以它仍然把 `primary` 列为「有值但零消费的死字段」，而这个判断本身就该被撤销：一个恒等于另一个字段的派生量，**不是死字段，是冗余缓存**。

### 3.2 `buttonText` 是生成算法的中间量，不是设计决定

```
$ node _rt_p19_primary.mjs
=== buttonText 是否可由 primary 的 WCAG 对比度唯一确定 ===
非空 buttonText 共 17 案，其中可由 primary 对比度**逐案精确推出**：17 案
空值 13 案
```

**17/17 全中。** 一个「设计字段」被一个二值函数 100% 复现，说明它不是设计输入，是**输出**。

更硬的：真实原型里按钮字色并**不**总是这个二选一。

```
$ node _rt_p26_btntruth.mjs
案  buttonText  真实CSS .btn color      argmax(primary)
S19  (null)      #E4DECD                 #FFFFFF           ✗ 真实用的是第三值
S21  #FFFFFF     (未声明)                   #FFFFFF           —
真实 .btn 声明了 color 的案：8/30
  其中真实值 = argmax 推出的：7
  其中真实值 ≠ argmax（用了非纯白/纯黑的第三值）：1
```

S19 的 `.btn` 真身（`prototypes/S19-copperplate-herbarium-cabinet/style.css:151-153`）：

```css
.btn {
  background: #4A5C3A; color: #E4DECD;   /* 墨绿底 + 卡纸字：5.42:1 */
```

**`#E4DECD` 是卡纸色，不是白也不是黑。** 这个值 argmax 永远算不出来——它是作者为「卡纸字」这个材质决定选的。

所以 Lead §3.4 的方案「先在数据层补到 30/30」（用 argmax 补 13 个 null）会**系统性伪造设计决定**：S19 已证明真实设计会用第三值。补出来的 13 个值里，没有一个有作者背书。

至于那 13 个 null 本身：两边对比度都过 AA 的 **0/13**，说明作者每次都只在一边合规、另一边不合规——**这是真实的设计约束，不是缺失**。

### 3.3 `scenesNo`：接进搜索 = 重演一个已修的 bug（本节最硬）

`scenesNo` 是 `scenes` 的子串，**30/30**：

```
$ node _rt_p4_redundancy.mjs
scenesNo 为空: 0/30｜是 scenes 的子串: 30/30｜不是: 0/30
=== S01 的 scenes / scenesYes / scenesNo 全文 ===
scenes    (65字): 调查报道类内容媒体、文化机构的年度展报道页、独立出版的选题预告页。不适合：需要低决策风险的 B 端采购站、面向幼儿的亲和型产品页。
scenesYes (33字): 调查报道类内容媒体、…
scenesNo  (28字): 需要低决策风险的 B 端采购站、面向幼儿的亲和型产品页。
```

Lead 也承认这点（§3.5：「接成独立字段是伪需求」）。**但它接着主张把 `scenesNo` 接进搜索。** 我实测了这个改动的后果：

```
$ node _rt_p27_scenesno.mjs
=== 现状（只索引 scenesYes）vs Lead 的 A4（scenesYes + scenesNo 一起进索引）===
查询词    现状命中   A4 命中   新增命中里「只在否定句里出现」的案数
政务             0        7                              7   100%
金融             0        4                              4   100%
医疗             0        4                              4   100%
电商             0        8                              8   100%
教育             1        4                              3   100%
母婴             0        1                              1   100%
儿童             0        2                              2   100%
促销             0        3                              3   100%
合计：A4 新增命中 34 行，其中 34 行是「只在否定句里出现」= 100.0%
```

**34/34 = 100%**。逐案看搜「政务」新增的 7 行原文：

```
   S04  scenesNo 片段：「…网、需要清晰表格的医疗与政务系统页面。…」
   S06  scenesNo 片段：「…情页、要求高对比可读性的政务与无障碍优先页面。…」
   S12  scenesNo 片段：「…金融、政务、医疗等依赖可信感的…」
   S16  scenesNo 片段：「…连续阅读；也不适合金融与政务类站点，斜排与高对比…」
   S25  scenesNo 片段：「…须满足高对比无障碍要求的政务或医疗场景，因为双专…」
   S27  scenesNo 片段：「…须满足高对比无障碍要求的政务公示（墨绿与炭黑在部…」
   S30  scenesNo 片段：「…需要沉稳可信的金融与政务场景；需要长时间阅读…」
   ⇒ 这 7 行没有一行写着「适合政务」。用户看到 7 个结果，全是「不适合政务」。
```

**这正是 `app.js:140-145` 记录并修掉的那个 bug，逐字复现：**

```js
/* ⚠️ 这里只能用 `scenesYes`，**不能用 `scenes`**。
   实测搜"政务"命中 7 行，**7/7 全部只出现在"不适合"从句里**，
   而行卡不印 scenes → 用户看到 7 行却没有一行印出"政务"，
   只能得出"有 7 个方案适合政务"这个**与事实相反**的结论。
   （这是我自己在一次"修复"里引入的反向信号。原来的 0 命中至少诚实。） */
```

Lead 的辩护是「行卡反标就能救」（§3.5 方案 ①）。**不能。** 用户搜「政务」的意图是「我要能用于政务的方案」，A4 给他 7 个写着「⚠ 不适合政务」的行——**标签诚实了，结果仍然全错**。反标救的是「用户在不知情下被误导」，救不了「用户明确知情后仍然拿不到答案」。

而真正的答案早就有了：`sceneIndex` 芯片（`prompts.js`）能筛出相关案，Lead 自己在 §3.5 引用了这个事实（「靠 `sceneIndex` 芯片才找得到」），却在下一步主张改搜索索引而不是把芯片做得更好用。

---

## 前提 4 判决：面板确实深，但「深」正是前三条前提造成的

### 证据 A：2991 是旧值，Lead 的 3028–4120 也不准

真 Chromium 逐案点开，逐字量 `#detail.scrollHeight`：

```
$ node _rt_p11_panel.mjs
id  contentH  screens  第1屏可见字段  复制按钮 top  首屏?
S01      3274     3.64             0         120.4  ✔
S15      3969     4.41             0         120.4  ✔
S26      4052     4.50             0         120.4  ✔
S29      4073     4.53             0         120.4  ✔
contentH: 最小 3274｜中位 3844｜最大 4073
screens : 最小 3.64｜中位 4.27｜最大 4.53
按钮在首屏内的案：30/30
```

| 指标 | Lead 声称 | 我实测 | 差 |
|---|---|---|---|
| contentH 区间 | 3,028 – 4,120（avg 3,706） | **3,274 – 4,073（avg 3,769）** | min +246 / max −47 |
| 最深案 | S26 = 4,120 | **S29 = 4,073**（S26 = 4,052） | 换案了 |
| 字段区起点 | 784 – 1,196（avg 1,014） | **1,109 – 1,208（avg 1,140）** | min +325 |

### 证据 B：面板每深一次，都是「接通死字段」的直接结果 —— 精确到 0px

用逐字段删除法测真实贡献（每轮重新点开，保证 DOM 干净）：

```
$ node _rt_p17_contribution.mjs
═══ S15  基线 contentH = 3969px
     491px  布局与网格
     413px  可落地要点
     310px  动效与交互
     284px  字体策略
     284px  关键视觉元素
     206px  美学家族与参考
     206px  反 AI 味风险与规避
     180px  适用场景
     154px  一句话视觉定义
     154px  设计师签名式怪癖
      76px  当前有效配色

关键复算（S15）：
  「可落地要点」真实贡献 413px
  「布局与网格」真实贡献 491px
  2991 + 413 = 3404  vs 65-audit 实测 3478  → 差 74px（＝块间距 + 段落收尾）
  3478 + 491 = 3969  vs 本轮实测 3969  → 差 0px
```

**这条链是：**

```
2991px（prompt-copy.js:510 记录的 2026-10-25 值，11 字段）
  + 413px   ← 上一轮把「可落地要点」的 landing 接通（commit d669ddb）
= 3478px（65-audit/lab/baseline-stdout.json 实测，10 字段 —— 因为 S15 的 layout 当时为空）
  + 491px   ← 本轮工作区把「布局与网格」的切分修好（collect-schemes.mjs:193）
= 3969px（本轮实测，11 字段）
```

**所以：面板变深 977px 的 92.5% 是「接通死字段」直接付的账。** 前提 1/2/3 要接通、前提 4 嫌太深——这两件事在像素层是同一笔账，不能同时做。

### 证据 C：如果接通 `audit`，面板会到 4.9 屏（浏览器内预演实测）

不改任何文件，只在内存 DOM 里插入 `audit` 字段（与 `app.js` 的 `field()` 同构）：

```
$ node _rt_p15_inject.mjs
=== 预演：把「去 AI 味审查点」接进详情面板后，面板深多少 ===
id   注入前 contentH  注入后 contentH     +px    +屏
S13            3840            4408     568   0.63
S15            3969            4226     257   0.29
S29            4073            4408     335   0.37
S01            3274            3531     257   0.28
S30            4000            4387     387   0.43
  +px 最小 257｜最大 568｜中位 335
  注入后最大 contentH = 4408px = 4.9 屏
```

Lead §3.1 的「形态 A 全文平铺 +257~+594px」与我的 +257~+568px 吻合。它选的「B+ `<details>` 收起 +51px」也合理——**但它没算这一笔：`<details>` 在 `_measure-baseline.mjs` 探针下会被算进 `affordances.details`，而当前面板的 `details/summary` 数量是 0。**

```
$ node _rt_p11_panel.mjs
=== 折叠/跳转构件（全案合计）===
{"details":0,"summary":0,"ariaExpanded":0,"nav":0,"inPageAnchorLinks":0}
```

**引入 `<details>` 意味着面板第一次拥有原生折叠语义**——这是**架构变更**，不是「加一个字段」。Lead 把它放进 A2「详情面板」里当小任务，低估了。

### 证据 D：主导线没坏，「用户读不到」是未经测量的假设

| 断言 | 实测 | 结论 |
|---|---|---|
| 复制按钮在主导线上 | **120.4px，30/30 首屏内** | ✔ 上一轮修好了，没回退 |
| 首屏可见内容字段数 | **0/30** | ✔ Lead 说对了（这条确实是已知痛点，见 `60-diagnosis` §2.2） |
| 有没有用户抱怨面板深 | `deliverables/*.md` 全文检索 `面板太深/滚不动/读不到`：**命中全是审查者自述**，无一条用户反馈 | ⚠️ 「用户读不到」是**审查者推论**，不是观测 |
| 有没有使用数据 | `README.md:310`：「零网络请求、无 CDN、无远端接口、**无埋点**」；`README-EN.md:313` 同 | ❌ **不存在**任何访问统计/停留/点击数据 |
| 有没有用户调研 | `29-critique-homogeneity.md:447` 自认「本审查**没有问卷或可用性数据支撑**」；`53` 号报告：`19` 号定义的「5 名非设计岗真实用户 30 秒任务测试」**从未执行** | ❌ **不存在** |

**⇒ Lead 的「用户读不到深字段」与我的「用户读得到」都是假设，两边都没有数据。** 在这种条件下为次要动线重构面板，等于拿主导线的确定性去换一个未测量的猜想。

而「图集/图鉴本来就是深读」这条定位，`README.md:350` 自己写着：「**这是一个 80 分的标本库，不是 100 分的成品站**」；`60-diagnosis` 更直接：「**病不在假，在错位**」——错位指的是「把自证卷宗当封面」，不是「详情面板太深」。

---

## 如果只能做一件事

**不做字段接通。做一件事：把 `FIELDS` 从注释改造成会报警的契约，然后立刻停手。**

理由：

### 1. 这轮的前提结构是坏的

四条前提里，三条不成立（1、2、3），第四条与前三**互相抵消**（接通 = 变深，实测 0px 级精确）。在这种前提下继续执行 A1–A6 六个任务，是在用确定的复杂度换不确定的收益。

### 2. 真正的「同一半」不是死字段，是自检表

`collect-schemes.mjs:605-618`（WIP 已补，但只在 `--check` 分支打印）暴露了真病：

> 「自检表覆盖的字段必须与赋值表的字段同一份清单，否则它就是一张安慰剂。」

这才是「第三次同类问题」的正确模式识别：**`FIELDS`（136）与赋值表（268-296）与自检表（605-618）是三份手抄清单，从未互相校验。** `landing` 丢了一轮、`audit` 丢了一轮——都不是因为难，是因为没人对账。

**该做的最小修复**（1 小时，零风险）：

```js
// 让 FIELDS 变成会失败的门，而不是注释
const ASSIGNED = { '一句话视觉定义':'def', '美学家族与参考':'family', /* … */ };
const missing = FIELDS.filter(f => !ASSIGNED[f] && f !== '机制（走 mechanisms.mjs）');
if (missing.length) { console.error('FIELDS 有未赋值的项：' + missing.join(' ')); process.exit(1); }
```

这样「下一次有人加字段忘了赋值」会**当场红**，而不是靠红队数 `data.js` 的键。附带把 `机制` 按 §3.2 改名，让清单与实现字面一致。

### 3. 如果一定要写代码，去做一个已在 README 上自认欠账的修复

`README.md:335` 自己写着：

> **`S13` 的 `shadow`（17 处）与 `button-fx` 没有豁免记录**——30 案那层明令 `box-shadow: 0`，这两条是**真的未清**。

`_CONTRACT.md:110` 同样明写「属真未修，不在 §9.15 允许表内」。这是**唯一一条既被 README 承认、又被契约承认、且没有豁免**的缺陷。它的优先级高于任何死字段——因为它是一条**已知的、公开承认的、可修的**债。

### 4. 但最该做的是：先收掉工作区里那轮未提交的 WIP

见下节第 1 条。**在两条链路不同步、README 已腐化三处的情况下继续叠加改动，会让下一个人无法判断哪个状态是「对的」。**

---

## 你没列到的缺口

### ① 工作区里有一轮**未提交**的 WIP，它刚刚制造了第 4 个孤儿字段

```
$ git status --porcelain prototypes/_build/collect-schemes.mjs prototypes/_selection/data.js
 M prototypes/_build/collect-schemes.mjs
 M prototypes/_selection/data.js
```

`data.js` 已经被加上 `audit` 字段（30/30，10,539 字），但**展示层一个字都没接**：

```
$ node _rt_p16_orphans.mjs
键                  app.js  prompt-copy.js  prompts.js  verdict
audit             false    false          false      ★ 零消费
primary           false    false          false      ★ 零消费
buttonText        false    false          false      ★ 零消费
scenesNo          false    false          false      ★ 零消费
零消费键：audit primary buttonText scenesNo
```

`schema` 从 32 键变成 33 键，孤儿从 3 个变成 **4 个**——**第 4 个是这一轮自己长出来的**，而且它正是 Lead 计划要「接通」的那个。

更麻烦的是两条链路已经不同步：

```
$ node _rt_p12_chain.mjs
═══ C2. data.js vs prompts.js 是否同步（工作区状态）═══
  data.js 有 audit 的案数：30/30
  prompts.js 里 "audit" 出现次数：0
```

**⇒ Lead 在 §1.0 说「仓库在本轮执行期间被并发修改了」。那个「并发」就是它自己的 WIP。** 在一个自己都没提交的状态上评估「什么事该做」，基准是漂的。

### ② README 已腐化三处，其中一处是这句 WIP 刚修好但文档没追上的

**腐化 1**：`README.md:342` 与 `README-EN.md` 同句

```
$ node _rt_p12_chain.mjs
═══ C. README 关于 S12/S15/S19「已知未修」是否过期 ═══
  README.md:342  - ❌ **选型台对三个案子抽少了段**：`S12`/`S15`/`S19` 只展开 9 段。…**这是本项目一个已知未修的抽取缺陷**，不是规格缺陷。
  但本轮 data.js 实测：
    S12 layout.length = 549  ← 已有值，README 的「已知未修」已过期
    S15 layout.length = 640  ← 已有值，README 的「已知未修」已过期
    S19 layout.length = 420  ← 已有值，README 的「已知未修」已过期
```

**README 在向世界声明一个已经修好的缺陷为「未修」。** Lead 计划里 A6 是「全链路回归」，但没有人列出「README 一致性」这一项。

**腐化 2**：`README.md:103` / `README-EN.md:103` 说 9 个方案会报警告，实际是 4 个

```
$ node _rt_p18_harddrift.mjs
prompts.js hardIds = ["S15","S18","S21","S29"]
README 承诺 9 个，实际 hardIds 4 个。差的 5 个：S03 S05 S10 S14 S20

=== 不一致明细 ===
  S03  hard=false degrades=no → README 说会报，实际不报（用户被承诺了不存在的警告）
  S10  hard=false degrades=no → README 说会报，实际不报（用户被承诺了不存在的警告）
  ...（另有 S02/S04/S08/S12/S19/S22/S23 共 7 案：README 没写，实际会报）
```

`d669ddb`（"hard 标注重新实测：9 个缩到 4 个"）**没有改 README**：

```
$ git show --stat --name-only d669ddb | Select-String -Pattern 'README'
(空=没改)
```

而其中 **S03 与 S10 现在连数量警告都没有**（`degrades=no`）——README 承诺「按钮旁边会直接标⚠」，实际那个按钮上是「粘给 ChatGPT / Claude / v0 都行」。**这是一句会误导用户的可执行承诺。**

**腐化 3**：`README.md:78` 的「1100 字左右」与 `:82` 的「4–5 个色值」

```
$ node _rt_p22_readme_claims.mjs
README.md:78 断言：「按下去得到一份 1100 字左右的一段话」
  实测：最小 1617｜中位 1807｜最大 1905
  与「1100 字左右」的偏差：中位超 707 字（+64%）；30/30 全部 > 1100
  落在 1100±10% (990–1210) 的案数：0/30

README.md:82 断言：「配色（4–5 个色值）」
  实测 palette 项数分布：3 个色 → 5 案｜4 个色 → 25 案
  4–5 个的案数：25/30
```

### ③ 主动线上真正的缺陷：30/30 份提示词的首行都是空模板（比任何死字段值钱）

```
$ node _rt_p22_readme_claims.mjs
README.md:91 示例首行：「我经营一家手冲咖啡店，5 个产区的豆子，加微信订、不做在线支付。页面需要让访客看完就想问价。」
  实际默认产出首行（30 案全部同句）：
    「我经营一家小店，有一些内容和图片要放上去。」
  相同的案数：30/30
  原因：buildPrompt 的 o.biz / o.what / o.action 三个参数全库**没有任何调用方传值**
    prompt-copy.js 里 o.biz 出现次数 = 1（仅读取，从不接收）
    index.html 里的 <input> = 1 个，只有搜索框 #q
```

`prompt-copy.js:211-212`：

```js
"我经营" + (o.biz || "一家小店") + "，" + (o.what || "有一些内容和图片要放上去") + "。",
"页面需要" + (o.action || "让访客看懂我在做什么、并能联系我") + "。",
```

`window.buildStylePrompt = buildPrompt`（:520）对外暴露，但 `app.js` / `wizard.js` **任何一个调用方都不传 opts**：

```
$ Select-String -Path prototypes\_selection\*.js -Pattern 'buildStylePrompt|o\.count|opts\.count'
prompt-copy.js:170:    var count = o.count || s.minItems;
prompt-copy.js:520:  window.buildStylePrompt = buildPrompt;
```

**⇒ 用户拿到一份 1807 字的精密设计约束，开头写着「我经营一家小店」。** 这份提示词交给 AI，AI 会用这套报纸风格去排一个不存在的店。README 第 78 行说这是「选中就能带走」的那条线——**这条路是通的，但货物是空箱**。

这比「26,096 字蒸发」严重得多：那 10,539 字用户根本不需要，这 3 行用户**每次都读、每次都无用**。

### ④ `minItems` 被当成「我实际有 N 个条目」讲给 AI，且同一段里自相矛盾

```
$ node _rt_p10_count.mjs
S07  N=46  degrades=no   老报纸目录跨页，左窄右宽
S17  N=27  degrades=no   印花税票对账联，小数点对齐
S29  N=23  degrades=yes  钢丝圈装订的工业规程册
N 分布：最小 6｜中位 10｜最大 46
N ≥ 20 的案：5/30 → S07=46 S17=27 S29=23 S18=20 S19=20
自动流案（degrades=no）共 17 个，全部同时命中上面两句
```

提示词实文（S07，`_rt_out/prompt-S07.txt:14-16`）：

```
1. 我实际有 46 个条目，就排 46 个：
   不凑整、不留空位、不留占位符、编号连续不跳号。
2. 这个版式是自动流排版，条目增减只会让页面变短、不会留空位。按你真实的数量排即可，不要为了凑数编造内容。
```

**第 1 条断言一个事实（我有 46 个），第 2 条又说「按你真实的数量排」——AI 只能二选一。** 而 `build-prompts.mjs:90` 自己写着：

```
*  · minItems = 同构重复单元的**设计规模**（不是"至少要这么多"）；
```

`app.js:210` 也写着同样的话。**同一个概念在三个地方被正确定义为「设计规模」，然后在提示词里被当成「用户的实际条目数」输出。** 这是一个 17/30 案命中的自相矛盾，比死字段的代价高一个数量级。

### ⑤ `S13` 的 `audit` 混入了评审清单；而 S03/S08 的同类内容被整段丢弃

```
$ node _rt_p21_asymmetry.mjs
案   在spec里出现  以独立 3-附 行写  写在字段8正文里  data.audit 是否含它
S03  true          true             false            false
S08  true          true             false            false
S13  true          false            true             true
★ 内容保住的：S13
★ 内容丢掉的：S03 S08（2 案）
被丢弃的：S03 = 319 字，S08 = 345 字，合计 664
```

**同一类内容，只因为换行位置不同，一存一亡。** 而且存下来的那个（S13）是**污染**——473 字评审清单混进了审美判据字段。

Lead 计划 §3.1 要把 `audit` 做成折叠块给用户看。它没有发现：**S13 展开后用户会读到「必须存在 X：单向硬光源方位角常驻 135°（误差 ±10°）… 供 V-11 / R-40 逐条打勾」**——这是评审者的打分表。

### ⑥ 闸门 8 条 FAIL 里，3 条 `mono` 是判据冲突而非缺陷

```
$ node _rt_p8_gate.mjs
=== 闸门汇总：FAIL 8 条 / WARN 79 条 ===
不达标案：S07(FAIL 1) S08(FAIL 2) S13(FAIL 4) S21(FAIL 1)
  mono: 3 条 → S07 S13 S21
  palette-terracotta: 1 条 → S08
  font-count: 1 条 → S08
  shadow: 1 条 → S13
  button-fx: 1 条 → S13
  empty-screens: 1 条 → S13
```

`_CONTRACT.md:197` 已把 `mono` 登记为「对中文站结构性不利的规则，保留等宽槽、报告原始 FAIL 并说明」；`:198` 对 `font-count` 同处理。`README.md:334` 说这四条是「已知豁免」。

我实测了「30 案字段 4 是否都规定辅助数字用等宽」：

```
$ node _rt_p9_mono.mjs
  合计明示「等宽用于数字/编号」：20/30
（S11–S20 用词不同，`等宽/Mono` 命中 3–5 次/案，但未用「数字/编号」触发我的判定正则）
```

⇒ **`mono` 这 3 条 FAIL 是「规格要求等宽」与「工具禁止等宽」的正面冲突**，不是实现缺陷。真正未清、无豁免、README 自己承认的只有 **S13 的 `shadow`(17 处) + `button-fx`**。Lead 在 §1.5 把 8 条 FAIL 平铺列出，没有区分「3 条判据冲突 / 4 条已豁免 / 1 条真未清」——这让「8 条 FAIL 该不该修」这个判断无法做出。

### ⑦ `check-anchors.mjs` 打印 `undefined`，且两个检查器都在悄悄腐化

```
$ node prototypes\_build\check-anchors.mjs
锚点完整性：扫了 30 案
  动态拼接的（需人工确认，不算死锚点）：1 处
     undefined  href="#dg-' + keys[i] + '"
```

`check-anchors.mjs:36` 的 `dynamic.push({ dir: d.name, href: h })` 没有 `three` 字段，`:44` 却读 `x.three`：

```js
if (/['"+\[\]]/.test(h)) dynamic.push({ dir: d.name, href: h });
...
for (const x of dynamic) console.log(`     ${x.three}  href="#${x.href.slice(0, 40)}"`);
```

只影响日志，但它让人以为存在一个叫 `undefined` 的方案。而 `check-stale.mjs` 走的是 mtime 比对：

```
$ node prototypes\_build\check-stale.mjs
闸门陈旧度：检查 30 案
  ✓ 全部新鲜
```

**两个检查器都只覆盖「锚点存在」与「report 不过期」，都不覆盖「README 的数字与 data.js 是否一致」。** 这正是①②③能悄悄腐化的原因——**缺一个 `check-docs.mjs`**。

### ⑧ `data.js` 键数：32 → 33，而 Lead 的表写的是 32

```
$ node _rt_p25_final.mjs
═══ C. data.js 键数 ═══
  Object.keys(SCHEMES[0]).length = 33
  键：id dir cn en fr structure threshold tone def family fonts layout visuals motion audit risk landing scenes quirk copy copyParts bg primary buttonText errorCode errorCodeSource palette built gate shots axes scenesYes scenesNo
  （WIP 新增 audit 后是 33；Lead 表里写 32 = 加 audit 之前的值）
```

小事，但它印证①：**Lead 的基线表与工作区不同步。**

---

## 附：本报告数字的复算入口

全部只读，全部在 `deliverables/65-plan/` 内：

| 结论 | 脚本 | 关键输出 |
|---|---|---|
| `机制` 不是孤儿 | `_rt_p1_mechanism.mjs`、`_rt_p2_fields.mjs` | FIELDS 13 项里 `机制` = 0/30 |
| 12 处 `-附` 段被丢 | `_rt_p6_splitter.mjs` | 12 段 / 1,465 字 |
| 26,096 复现不出 | `_rt_p5_calibration.mjs`、`_rt_p13_provenance.mjs` | 11 口径无一命中；真值 10,539 字 |
| 11,220 复现不出 | `_rt_p24_11220.mjs` | 逐案偏小 2–4 字，合计差 100 |
| `primary`=附义 | `_rt_p4_redundancy.mjs`、`_rt_p19_primary.mjs` | 30/30；17/30 是兜底覆写 |
| `buttonText`=算法产物 | `_rt_p19_primary.mjs`、`_rt_p26_btntruth.mjs` | 17/17=argmax；S19 真实值 `#E4DECD` 例外 |
| `scenesNo` 重演 bug | `_rt_p27_scenesno.mjs` | 新增 34 行命中，34/34=100% 否定句 |
| 面板深度因果链 | `_rt_p11_panel.mjs`、`_rt_p17_contribution.mjs` | 2991+413+491=3969，差 0px |
| 接 audit 的代价 | `_rt_p15_inject.mjs` | +257~+568px，最大 4,408px |
| 折叠构件现状 | `_rt_p11_panel.mjs` | details/summary/nav = 0 |
| 孤儿字段 4 个 | `_rt_p16_orphans.mjs` | audit/primary/buttonText/scenesNo |
| README 腐化 | `_rt_p12_chain.mjs`、`_rt_p18_harddrift.mjs`、`_rt_p22_readme_claims.mjs` | 342 / 103 / 78 三处 |
| 提示词首行空模板 | `_rt_p22_readme_claims.mjs`、`_rt_p7_prompts.mjs` | 30/30 同句；1,617–1,905 字 |
| `minItems` 语义错位 | `_rt_p10_count.mjs` | 17/30 自相矛盾 |
| audit 含评审清单 | `_rt_p21_asymmetry.mjs`、`_rt_p12_chain.mjs` | S13 后 473 字；S03/S08 丢 664 字 |
| 闸门 FAIL 分类 | `_rt_p8_gate.mjs`、`_rt_p9_mono.mjs` | 3 判据冲突 / 4 豁免 / 1 真未清 |
| 条款不可达 | `_rt_p28_cite.mjs` | 用户界面 0 处链接指向 02 号 |
| 键数 32→33 | `_rt_p25_final.mjs` | 33（含 audit） |

生成的 30 份提示词全文：`deliverables/65-plan/_rt_out/prompt-S01..S30.txt`
面板实测原始数据：`deliverables/65-plan/_rt_out/panel-measure.json`、`field-contrib.json`、`panel-inject-audit.json`

---

*红队 · 只读审查 · 未改动 `prototypes/` `templates/` `README*` 任何字节；所有写入限于 `deliverables/65-plan/`。*
