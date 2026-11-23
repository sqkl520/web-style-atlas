# A7-NEG-01 —— 负对照：五类判据全过、产物明显是坏的

> A7 判据盲区审计　2026-11-24　HEAD `6482356`

## 这是什么

一份**故意做坏**的合成产物，唯一目的是证明 `score.mjs` 的五类判据可以同时报"通过"，
而页面在四个维度上是错的。它不是产物，不是原型，**不许被当成任何一案的交付物**。

目录里有三份文件：

| 文件 | 作用 |
|---|---|
| `_prompt.txt` | **S01 的真实提示词，一字未改**。不新造提示词，否则"判据过"可以归因于提示词变了 |
| `index.html` | 合成产物。每一处坏都对准一个判据的读法 |
| `README.md` | 这份说明 |

`score.mjs` 的 `--all` 用 `/^S\d{2}(-r\d+)?$/` 过滤目录（`score.mjs:1559`），
`A7-NEG-01` 不在这个集合里，所以它**不会污染批量评分**。要跑它必须显式给 id。

## 评分原始输出

```
$ node deliverables/78-northstar/_blindtest/score.mjs A7-NEG-01

══ A7-NEG-01   137 行 / 3377 字节　〔提示词：最早〕
  ① 配色   4/4 个 hex 出现
     底色   #EFE7D7 → ✓ 用在 background 上
  ② 字体   3/3（Noto Sans SC, Source Han Sans SC, Martian Mono）
  ③ 圆角   规则「全站一律 0」；声明 0 条，违反 0 条
     线宽   允许 1px/3px；实际用了 2 处，全在允许级内
     字号   标题 96px（要 96）✓　正文 16px（要 16）✓
  ④ 结构   条目 应排 5 条（版式规模 6，不是目标）；HTML <article>=5 ✓　〔其他标签仅供参考：section=2 figure=5〕
     图片   版式 6 位 / 用户 5 条 → 合格线 5；实得 5 个 img（唯一 src 5）✓
  ⑤ 禁项   无违反　〔渐变按旧措辞判〕　〔字体 3 个在链上〕　〔来源：远程〕　〔无系统默认字体〕
```

## 这个页面实际是什么样（真浏览器量出来的）

用 `node deliverables/78-northstar/_probe/_render-audit.mjs A7-NEG-01` 量：

| 项 | 判据报 | 真浏览器量到 |
|---|---|---|
| 底色 | #EFE7D7 用在 background 上 ✓ | `html/body` 都是 **#000000** |
| 标题字号 | 96px ✓ | 可见最大 **40px**（96px 那条规则挂在一个页面上不存在的 class） |
| 正文字体 | 3/3 在链上 | `Papyrus`（body）/ `Impact`（h1），**提示词链上没有一个字被真的使用** |
| 字体来源 | 远程 ✓ | `<link href="fonts/site.css">` **指向不存在的文件**，磁盘上没有 |
| 圆角 | 违反 0 条 | 一张卡片 **18px** 圆角（longhand 四角，判据只认 `border-radius:` 简写） |
| 线宽 | 全在允许级内 | 上边 **9px**（`border-top-width` longhand，判据只认 `border:` 简写） |
| 图片 | 5 个、5 个唯一 src ✓ | **5 张全部 display:none**，解码 0 张 |
| 条目 | `<article>=5` ✓ | 5 条内容**全部 display:none**，屏上只有 2 条 |
| 阴影 | 无违反 | `filter: drop-shadow(0 6px 8px ...)`（判据只查 `box-shadow`） |

`--render-audit` 的原始行：

```
A7-NEG-01  #EFE7D7/#000000 XX   0/16/16   96/40   0/1   3/4   5/0   Impact→Impact+Noto Sans SC Papyrus→Noto Sans SC
```

（`5/0` = 源码 5 个 img / 实际解码 0 个；`0/1` = 源码圆角 0 条 / 渲染出 1 个非零圆角）

## 每一处坏对准的判据

| 位置 | 写法 | 绕过的判据 |
|---|---|---|
| `index.html:17` | CSS 注释里的 `font-family: "Noto Sans SC", …` | ② `score.mjs:900` 不剥注释 |
| `index.html:33,92` | `font-family: Papyrus` × 2 | ⑤ `score.mjs:595` 的 `localUse`：文件里出现 `masthead` 就放行 |
| `index.html:98` | `class="masthead"` | 同上（`masthead` 是这个词的唯一来源） |
| `index.html:60-62` | `.never-mounted-headline{font-size:96px}` | ③ `score.mjs:762` 取全页最大 font-size，不查元素是否存在 |
| `index.html:77-80` | `border-top-left-radius` 等四条 longhand | ③ `score.mjs:383` 只匹配 `border-radius:` |
| `index.html:81` | `filter: drop-shadow(...)` | ⑤ `score.mjs:986` 只查 `box-shadow` |
| `index.html:74` | `border-top-width: 9px` | ③ `score.mjs:433` 只匹配 `border:`/`border-top:` 简写 |
| `index.html:7` | `<link href="fonts/site.css">`（文件不存在） | ⑤ `score.mjs:621` 只要串里有 `.css` 就记 `remote` |
| `index.html:121-125` | 5 个 `<article class="item hidden-item">` | ④ `score.mjs:65` 数标签，不管可见性 |
| `index.html:127-131` | 5 个 `<img>` 在 `.hidden-item` 里 | ④ `score.mjs:128` 同上 |
| `index.html:18` | 四个 hex 写在同一行 CSS 注释里 | ① `score.mjs:855` 全文匹配 hex，注释里的也算"出现" |

## 消融（把每一处改回正常写法，看哪一处让判据变红）

`/tmp/ablate.mjs` 的输出：

```
V0 原样（负对照）                        ② 3/3   ⑤ 无违反        圆角 v=0  线宽 越界=[]   标题 max=96 ok=true
V1 去掉 masthead 类名                    ② 3/3   ⑤ 链外:Papyrus/Impact/Papyrus   圆角 v=0  线宽 越界=[]   max=96 ok=true
V2 删掉 CSS 注释里的 font-family          ② 0/3   ⑤ 无违反        圆角 v=0  线宽 越界=[]    max=96 ok=true
V3 删掉 96px 幽灵规则                     ② 3/3   ⑤ 无违反        圆角 v=0  线宽 越界=[]    max=40 ok=false
V4 圆角改成简写 border-radius:18px       ② 3/3   ⑤ 无违反        圆角 v=1  线宽 越界=[]    max=96 ok=true
V5 线宽改成 border-top:9px 简写          ② 3/3   ⑤ 无违反        圆角 v=0  线宽 越界=["9px"] max=96 ok=true
V6 条目与图片从 display:none 改为可见      ② 3/3   ⑤ 无违反        圆角 v=0  线宽 越界=[]    max=96 ok=true
```

五次单点改动分别按预期让 ② / ⑤ / ③字号 / ③圆角 / ③线宽 变红 —— 说明这五处
是**独立的五个盲区**，不是同一个原因的五种表现。而 V6（把条目和图恢复可见）
**没有任何一个判据变红**，因为 ④ 从来看不见可见性。

## 复现

```bash
# 负对照本身
node deliverables/78-northstar/_blindtest/score.mjs A7-NEG-01

# 三个锚点必须仍然绿（这三条是本目录存在的约束条件）
node deliverables/78-northstar/_blindtest/score.mjs --selftest          # 105/105
node deliverables/78-northstar/_blindtest/score.mjs --positive-control    # 35 原型 / 0 违规 / 0 豁免
node deliverables/78-northstar/_blindtest/score.mjs --all                 # 38 案，不含 A7-NEG-01

# 真浏览器对照（会改写 _probe/_render-audit.json，跑完请 git checkout 还原）
node deliverables/78-northstar/_probe/_render-audit.mjs A7-NEG-01
```

## 边界

- **不是**产品缺陷的证据。提示词本身没要求"必须可见"、"不许用注释写字体"。
  这份样本证明的是**判据读不到这些**，不是"模型会这么做"。
- 它过不了双条件里的第二条：38 份真实产物里，这些盲区被触发的次数都不足以
  让 Fisher p < 0.01（见 A7 的判据评估表）。所以这些只能记 `fail:false`。
- 生成时机：HEAD `6482356`。之后主线程提交了 `21e1639`（只加编排记录），
  `score.mjs` 与该提交逐字节相同；本目录的三条验收在 `21e1639` 的工作树上复跑通过。
