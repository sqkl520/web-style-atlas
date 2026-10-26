# EXEC — `audit` 的两处数据层修复（S13 评审工件切断 + 键位）

日期：2026-10-27
工作目录：`D:\Web\style`（Windows 10 / node v26.12.1 / PowerShell 5.1 / git 2.x）
任务来源：`deliverables/65-plan/VERDICT-audit-plumbing.md` §3.2 / §3.3 / §9（P0 两条）

## 0. 一句话结论

两条 P0 都落在**数据层**，并且都给出了「其余 29 案字节不变」的逐案证据：

- **偏离 1（切断）已修**：`data.js` 的 `S13.audit` **780 → 306 字**，30 案 `audit` 合计
  **10,539 → 10,065 字**，其余 29 案 `audit` 的 sha256 **逐案相同（29/29）**。
- **偏离 2（键位）**：`Object.keys()` 里 `audit` 的 index(=14) < `risk` 的 index(=15)，
  **30/30 成立** —— 但必须如实说明：**改前就已经是 14 < 15，数据层的键序本轮没有变化**。
  裁决文档说的「audit 在 risk 之后」指的是 `app.js` 的**渲染串**，不是 `data.js` 的键序。
  这一节我做了注释与证据，但**没有改一行代码**（原因见 §2.2）。

## 1. 改动清单（只有这两个文件，都在允许清单内）

| 文件 | 变化 | 说明 |
|---|---|---|
| `prototypes/_build/collect-schemes.mjs` | **+85 / −3 行**（624 → 706 行） | 加 `cutAuditMarker()`；在 `audit:` 赋值处调用；补两段长注释；加一行切断日志；更新一处过期的字数注释 |
| `prototypes/_selection/data.js` | 重跑生成器，**逐行比对只有 1 行不同** | 308,088 B → 307,068 B（−1,020 B） |
| `prototypes/_selection/prompts.js` | 重跑 `build-prompts.mjs`，**字节完全不变** | sha256 前后同为 `1C0D607D…FEEB72`，60,460 B |

**未触碰**（4 个文件的 mtime 全部早于本会话首个工具调用 `06:07:41`，见验收 10）：
`prototypes/_selection/app.js`、`style.css`、`prompt-copy.js`、`wizard.js`；
以及 `prototypes/S*/`、`templates/`、`README*`。

---

## 2. 偏离 1：S13 的评审工件，切断搬到了数据层

### 2.1 事实复核（我独立验了三遍才动手）

| 断言 | 我的实测 | 结论 |
|---|---|---|
| `S13.audit` 全长 780 字 | 780（JS `.length`） | ✓ |
| 污染起点在 `indexOf('反套路改造三指标')` | **307** | ✓ |
| 前 307 字是干净正文 | 前 306 字干净；**第 307 个字符是分隔空格**（`…三个数。␣反套路…`） | ✓（但边界比任务书多一个空格，见 §2.3） |
| 后 473 字是评审工件 | 780 − 307 = **473** | ✓ |
| 全库只有 S13 一例 | 见 §2.4 的双层扫描 | ✓ |
| 30 案合计 10,539 字 | 10,539 | ✓ |

### 2.2 改法（就一处调用 + 一个函数）

函数放在文件顶部、紧跟 `hexes()` 之后：

```js
const AUDIT_CUT_MARK = '反套路改造三指标';
const AUDIT_CUT_LOG = [];
function cutAuditMarker(id, raw) {
  const v = String(raw || '');
  const i = v.indexOf(AUDIT_CUT_MARK);
  if (i > 0) {
    const kept = v.slice(0, i).trimEnd();
    AUDIT_CUT_LOG.push({ id, before: v.length, after: kept.length, at: i });
    return kept;
  }
  return v;
}
```

赋值处由

```js
audit: spec && spec.fields['去 AI 味审查点'] ? spec.fields['去 AI 味审查点'] : '',
```

改为

```js
audit: cutAuditMarker(id, spec && spec.fields['去 AI 味审查点'] ? spec.fields['去 AI 味审查点'] : ''),
```

四个设计点，逐条给理由（也都写进了代码注释）：

1. **按标记切，不按案号**。`indexOf('反套路改造三指标')` 对 30 案一律成立；将来别的案也出现这个标记，
   自动生效 —— 按案号的 `{ S13: … }` 白名单不会。它切的是**工件形状**，不是某一行数据。
2. **`i > 0`，不是 `i >= 0`**。若标记出现在第 0 位，说明字段解析已错位到把工件当正文；
   那时宁可留着让人看见，也不静默清空成空串。
3. **`trimEnd()`**。见 §2.3。
4. **只在 `audit:` 一处调用**。不做成通用的「清扫全字段」，因为那会把 `layout` 那 5 处一起切了
   （见 §2.6），而那一刀是本轮明确放弃的。

### 2.3 边界为什么是 306 而不是 307（差 1 的来源）

| 层 | 切法 | 结果 |
|---|---|---|
| UI 层（上一轮，`app.js`） | `t.slice(0, i)` —— **不 trim** | **307 字**，末尾带一个空格 |
| 数据层（本轮，`collect-schemes.mjs`） | `v.slice(0, i).trimEnd()` —— trim | **306 字** |

为什么选 trim：全库另 29 案的 `audit` **没有一个**以空白开头或结尾（`_cut/ws-probe.mjs` 实测：
`audit 以空白开头：无 / audit 以空白结尾：无`）。留一个尾部空格是 UI 层当时的偶然结果，不是约定。

脚本已断言：**改后的 306 字 === `改前.slice(0, 307).trimEnd()` → `true`**。
即一个字都没改，只去掉了那一个分隔空格。

> ⚠️ 这 1 字的差会让面板 Agent 的 CDP 验收脚本报 FAIL（它硬编码了 `307`）。
> 那是断言的前提过期，不是回归 —— 详见 §5.2。

### 2.4 「只有 S13 一例」的证据：两层独立扫描

扫描脚本 `deliverables/65-exec/_cut/scan-marker.mjs`，四个判定串
（`反套路改造三指标` / `打勾` / `供 V-11` / `必须存在 X` 及其同族）。

#### 改前（`_cut/data.before.js`，即人工复核前的现状）

```text
扫描对象：deliverables/65-exec/_cut/data.before.js（30 案）
═══ A. data.js：30 案 × 全部键，命中标记的字段 ═══
  S13.audit  ←「反套路改造三指标」 (字段长度 780)
  S13.audit  ←「打勾」 (字段长度 780)
  S13.audit  ←「供 V-11」 (字段长度 780)
  S13.audit  ←「必须存在 X」 (字段长度 780)
  S13.audit  ←「必须不存在 Y」 (字段长度 780)
  S13.audit  ←「必须可测量 Z」 (字段长度 780)
  A 合计命中 6 处

═══ B. _specs/Sxx.md 原文：命中的行 ═══
  S03.md:21  ←「反套路改造三指标」  3-附（反套路改造三指标）：**必须存在**——hero 主视觉必须写明长曝光物理证据，本案给出五项中的四项：曝光 30
  S08.md:21  ←「反套路改造三指标」  3-附（反套路改造三指标）：**必须存在**——玻璃件必须写出四项物理特征：等效厚度 8mm、倒角 2mm 且角度 45
  S13.md:37  ←「反套路改造三指标」  **反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾）**
  S13.md:37  ←「打勾」  **反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾）**
  S13.md:37  ←「供 V-11」  **反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾）**
  S13.md:38  ←「必须存在 X」  - **必须存在 X**：单向硬光源方位角常驻 135°（误差 ±10°）；压印深度 0.4mm 等效；纸纤维起伏由程序
  S13.md:39  ←「必须不存在 Y」  - **必须不存在 Y**：全站不得出现圆角胶囊按钮（`border-radius` ≥ 100px 或等价写法）；不得
  S13.md:40  ←「必须可测量 Z」  - **必须可测量 Z**：按下时光源方位角反转量 ≥ 90°（由 135° 翻到 315°），切换时长 120ms（落
  S13.md:57  ←「反套路改造三指标」  依据一：反套路改造三指标的三段式（必须存在 / 必须不存在 / 必须可测量）全部给出可打勾的数值（135°、0.4mm、
  S13.md:57  ←「打勾」  依据一：反套路改造三指标的三段式（必须存在 / 必须不存在 / 必须可测量）全部给出可打勾的数值（135°、0.4mm、
  B 合计命中 10 处

═══ C. 只有 audit 字段时，谁脏 ═══
  audit 含标记的案：S13
```

#### 改后（`prototypes/_selection/data.js`）

```text
扫描对象：prototypes/_selection/data.js（30 案）
═══ A. data.js：30 案 × 全部键，命中标记的字段 ═══
  A 合计命中 0 处

═══ B. _specs/Sxx.md 原文：命中的行 ═══
  S03.md:21  ←「反套路改造三指标」  3-附（反套路改造三指标）：**必须存在**——hero 主视觉必须写明长曝光物理证据，本案给出五项中的四项：曝光 30
  S08.md:21  ←「反套路改造三指标」  3-附（反套路改造三指标）：**必须存在**——玻璃件必须写出四项物理特征：等效厚度 8mm、倒角 2mm 且角度 45
  S13.md:37  ←「反套路改造三指标」  **反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾）**
  S13.md:37  ←「打勾」  **反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾）**
  S13.md:37  ←「供 V-11」  **反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾）**
  S13.md:38  ←「必须存在 X」  - **必须存在 X**：单向硬光源方位角常驻 135°（误差 ±10°）；压印深度 0.4mm 等效；纸纤维起伏由程序
  S13.md:39  ←「必须不存在 Y」  - **必须不存在 Y**：全站不得出现圆角胶囊按钮（`border-radius` ≥ 100px 或等价写法）；不得
  S13.md:40  ←「必须可测量 Z」  - **必须可测量 Z**：按下时光源方位角反转量 ≥ 90°（由 135° 翻到 315°），切换时长 120ms（落
  S13.md:57  ←「反套路改造三指标」  依据一：反套路改造三指标的三段式（必须存在 / 必须不存在 / 必须可测量）全部给出可打勾的数值（135°、0.4mm、
  S13.md:57  ←「打勾」  依据一：反套路改造三指标的三段式（必须存在 / 必须不存在 / 必须可测量）全部给出可打勾的数值（135°、0.4mm、
  B 合计命中 10 处

═══ C. 只有 audit 字段时，谁脏 ═══
  audit 含标记的案：无
```

**判读**：A 段（产物层）从「6 处、全在 S13.audit」变成「0 处」；B 段（`_specs/*.md` 原文）**不变，仍是 10 处** ——
因为源文件我没有改，也不该改（`_specs` 是 collect 的输入，动它等于伪造来源）。
B 段里 S03.md:21 / S08.md:21 那两处带 `3-附（…）：` 编号，被字段起点正则咬住后 key 剥成 `3-附`，
正文落在一个没人读的键下随对象丢弃——所以它们从未进过 `data.js`；S13.md:57 在「自评」之后被 `tailRe` 截断。
**这就是「按标记切」当前只影响 S13 一案的完整证据链。**

### 2.5 改前 / 改后全文（完整贴出）

#### 改前（780 字，含污染）

```text
第一，反 C-2.11「24px 圆角加柔和投影的卡片浮起」：全站圆角为 0，所有容器都是直角铅字块，页面没有任何柔和投影，唯一阴影来自单向硬光源；跳脱之处在于层级是纸被压塌形成的凹槽，不是元素被抬起。第二，反 C-1.4 与 C-2.14「Emoji 图标与三等量图标网格」：图标全部是凹凸符号，只有形变没有颜色，且条款条目数量为 7 条与 4 条两段而非 3 / 6 / 9。第三，反 C-1.6「白 / 灰交替分区」：全站只用 #F4E3BE 一种底，分区靠函号与压痕线。第四，反 C-4 与 R-28：本方案不写「极简」这类形容，立体感一律给成 0.4mm 压深、3% 亮度差、14% 边缘对比度三个数。 反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾） - 必须存在 X：单向硬光源方位角常驻 135°（误差 ±10°）；压印深度 0.4mm 等效；纸纤维起伏由程序化噪声生成、亮度幅度 ±2 级、纤维方向偏 12°；阴影只出现在凹槽一侧并带接触阴影。四条缺一即不成立。 - 必须不存在 Y：全站不得出现圆角胶囊按钮（border-radius ≥ 100px 或等价写法）；不得用「内外阴影切换」做按压反馈；不得用两枚对称阴影（如 8px 8px #d1d1d1 配 -8px -8px #ffffff）伪造凸起；全程无墨、无色差、无色彩插值。 - 必须可测量 Z：按下时光源方位角反转量 ≥ 90°（由 135° 翻到 315°），切换时长 120ms（落在 80–200ms 内）；按压下沉 0.8px（落在 0.5–1.5px 内）；压印边缘对比度 14%（≤ 18%）；盲压区与背景亮度差 3%（≤ 6%，该值按纸色 #F4E3BE 与背光侧 #D6CDB9 在凹槽带内 55:45 面积加权算出）。
```

切点：`audit.indexOf('反套路改造三指标') === 307`

#### 改后（306 字）

```text
第一，反 C-2.11「24px 圆角加柔和投影的卡片浮起」：全站圆角为 0，所有容器都是直角铅字块，页面没有任何柔和投影，唯一阴影来自单向硬光源；跳脱之处在于层级是纸被压塌形成的凹槽，不是元素被抬起。第二，反 C-1.4 与 C-2.14「Emoji 图标与三等量图标网格」：图标全部是凹凸符号，只有形变没有颜色，且条款条目数量为 7 条与 4 条两段而非 3 / 6 / 9。第三，反 C-1.6「白 / 灰交替分区」：全站只用 #F4E3BE 一种底，分区靠函号与压痕线。第四，反 C-4 与 R-28：本方案不写「极简」这类形容，立体感一律给成 0.4mm 压深、3% 亮度差、14% 边缘对比度三个数。
```

#### 被切掉的 474 字符（780 − 306）

```text
" 反套路改造三指标（对齐 02 号文件 8.3 节，供 V-11 / R-40 逐条打勾） - 必须存在 X：单向硬光源方位角常驻 135°（误差 ±10°）；压印深度 0.4mm 等效；纸纤维起伏由程序化噪声生成、亮度幅度 ±2 级、纤维方向偏 12°；阴影只出现在凹槽一侧并带接触阴影。四条缺一即不成立。 - 必须不存在 Y：全站不得出现圆角胶囊按钮（border-radius ≥ 100px 或等价写法）；不得用「内外阴影切换」做按压反馈；不得用两枚对称阴影（如 8px 8px #d1d1d1 配 -8px -8px #ffffff）伪造凸起；全程无墨、无色差、无色彩插值。 - 必须可测量 Z：按下时光源方位角反转量 ≥ 90°（由 135° 翻到 315°），切换时长 120ms（落在 80–200ms 内）；按压下沉 0.8px（落在 0.5–1.5px 内）；压印边缘对比度 14%（≤ 18%）；盲压区与背景亮度差 3%（≤ 6%，该值按纸色 #F4E3BE 与背光侧 #D6CDB9 在凹槽带内 55:45 面积加权算出）。"
```

改后的 306 字是否恰好 = 改前的 slice(0, 307).trimEnd()：**true**
改前 slice(0,307) 的末 3 字符："数。 "（末位是分隔空格）

### 2.5.1 其余 29 案字节不变：30 案 sha256 逐案对照（全 64 位）

| 案号 | 改前长度 | 改后长度 | 改前 sha256 | 改后 sha256 | 字节不变 |
|---|---:|---:|---|---|---|
| S01 | 292 | 292 | `10b3ca8fa0b9e527f2350b8425ec2812f118c7cab4158c61bd5455ea77ec731e` | `10b3ca8fa0b9e527f2350b8425ec2812f118c7cab4158c61bd5455ea77ec731e` | ✓ 相同 |
| S02 | 337 | 337 | `71d2239cfd89e42bd5604f434d9806f6e7e2cfeb33ec5c58017e2b74015ebe3c` | `71d2239cfd89e42bd5604f434d9806f6e7e2cfeb33ec5c58017e2b74015ebe3c` | ✓ 相同 |
| S03 | 294 | 294 | `5b5121cc7716a2f015d7766e841b3a4cfc1f566439b6df71a6bb9c0c466444eb` | `5b5121cc7716a2f015d7766e841b3a4cfc1f566439b6df71a6bb9c0c466444eb` | ✓ 相同 |
| S04 | 282 | 282 | `5e2b464c837492fb3d2962e4be17a9f92e49c15c30044913ce5240dabcba77fd` | `5e2b464c837492fb3d2962e4be17a9f92e49c15c30044913ce5240dabcba77fd` | ✓ 相同 |
| S05 | 286 | 286 | `4b20cda7f4e8512d77e0d7a0f97a7c2cb46405f9ea87cc52e95af1cfe681d2e1` | `4b20cda7f4e8512d77e0d7a0f97a7c2cb46405f9ea87cc52e95af1cfe681d2e1` | ✓ 相同 |
| S06 | 290 | 290 | `763f768e842c87922524fce00dad56426fd51296f98e3b869257df54e9864a0d` | `763f768e842c87922524fce00dad56426fd51296f98e3b869257df54e9864a0d` | ✓ 相同 |
| S07 | 311 | 311 | `27cb7af267c814a8dca3c635f19f66e07eef31e7d31bb8cb3e568cdf4760bb1c` | `27cb7af267c814a8dca3c635f19f66e07eef31e7d31bb8cb3e568cdf4760bb1c` | ✓ 相同 |
| S08 | 286 | 286 | `e9f76fcfd50a2da14cdb2978f10f2793abf0e2cc5756b51e6bf6ddef4b4bd722` | `e9f76fcfd50a2da14cdb2978f10f2793abf0e2cc5756b51e6bf6ddef4b4bd722` | ✓ 相同 |
| S09 | 293 | 293 | `8a0666a0732b3f38659d1819c615be9f245dced4068db77144ac2be90446d380` | `8a0666a0732b3f38659d1819c615be9f245dced4068db77144ac2be90446d380` | ✓ 相同 |
| S10 | 276 | 276 | `be4b5810ccc7abfc19b78a3574c5e6f08364b2a6cb26ea3c2756571e444c94db` | `be4b5810ccc7abfc19b78a3574c5e6f08364b2a6cb26ea3c2756571e444c94db` | ✓ 相同 |
| S11 | 376 | 376 | `422f675f04234bc2318d94f4deb53705fd9ccb03b9ab462d66338c1793b985be` | `422f675f04234bc2318d94f4deb53705fd9ccb03b9ab462d66338c1793b985be` | ✓ 相同 |
| S12 | 293 | 293 | `43fd072a62a49be391874901cbe37ff577aa1af2bd851a5139ef41d4015292ff` | `43fd072a62a49be391874901cbe37ff577aa1af2bd851a5139ef41d4015292ff` | ✓ 相同 |
| S13 | 780 | 306 | `d9fa07d22af9a7af062ee9903a76349543fcf5482f5a56694ca98a9e2ce75665` | `3fb5ce2daa24387f5947068335090bc5f7a5ce40dbe4a324e4007ce5731ebfd5` | ✗ **变了** |
| S14 | 342 | 342 | `1621fccc055768ac764670c10fbbd6bea67e9ed2f430c12baf22263b58613734` | `1621fccc055768ac764670c10fbbd6bea67e9ed2f430c12baf22263b58613734` | ✓ 相同 |
| S15 | 314 | 314 | `8e999dd89c6efbc002389780d95ca29b87471493ff5f2bab3bfadda6935b2aef` | `8e999dd89c6efbc002389780d95ca29b87471493ff5f2bab3bfadda6935b2aef` | ✓ 相同 |
| S16 | 317 | 317 | `39595df88a4c8bb77c5f0b532dc40dcd37d395af0d0ef580fb252e6adcc4f569` | `39595df88a4c8bb77c5f0b532dc40dcd37d395af0d0ef580fb252e6adcc4f569` | ✓ 相同 |
| S17 | 304 | 304 | `b20828958f05de9771f57121858cb03cb9a0bed3bf04d5379408d5cfa1ba0072` | `b20828958f05de9771f57121858cb03cb9a0bed3bf04d5379408d5cfa1ba0072` | ✓ 相同 |
| S18 | 367 | 367 | `36b7e6c3b1e6689cb186ba534adeec4585e1fa143bfc46a88f16eb24660247a4` | `36b7e6c3b1e6689cb186ba534adeec4585e1fa143bfc46a88f16eb24660247a4` | ✓ 相同 |
| S19 | 324 | 324 | `385371202a34b2a1f4037619e081efeae6fc4df1ace746f922c783e8f29c5d5b` | `385371202a34b2a1f4037619e081efeae6fc4df1ace746f922c783e8f29c5d5b` | ✓ 相同 |
| S20 | 349 | 349 | `85b24f3d5041a70cde54a82820654ee85dbf5864002533f60bed4d2c0ad7acdf` | `85b24f3d5041a70cde54a82820654ee85dbf5864002533f60bed4d2c0ad7acdf` | ✓ 相同 |
| S21 | 327 | 327 | `2d08d72696052393e4617538db1f92efb567a4099adc8efc20628645db4ef824` | `2d08d72696052393e4617538db1f92efb567a4099adc8efc20628645db4ef824` | ✓ 相同 |
| S22 | 371 | 371 | `b484a7facf973b3300961a7543365ba7f2bfa1e41d690b77a9616cb5e6218b68` | `b484a7facf973b3300961a7543365ba7f2bfa1e41d690b77a9616cb5e6218b68` | ✓ 相同 |
| S23 | 299 | 299 | `c1c3f0820e941f7332889d7c88c09f935191e68fb840495caf7a800ccc10a54b` | `c1c3f0820e941f7332889d7c88c09f935191e68fb840495caf7a800ccc10a54b` | ✓ 相同 |
| S24 | 417 | 417 | `2447d5a98964751da7d93fd4a5d663a57aaef5973d95d5a8d15076f944837490` | `2447d5a98964751da7d93fd4a5d663a57aaef5973d95d5a8d15076f944837490` | ✓ 相同 |
| S25 | 363 | 363 | `e41aba9016e367e0476f0901f3a763435197930723161894befbde054e2da0a8` | `e41aba9016e367e0476f0901f3a763435197930723161894befbde054e2da0a8` | ✓ 相同 |
| S26 | 391 | 391 | `26d44d9429756137ae5c92f68ae1c88ad2132a4217ce6f6f1b4ccce642052a5a` | `26d44d9429756137ae5c92f68ae1c88ad2132a4217ce6f6f1b4ccce642052a5a` | ✓ 相同 |
| S27 | 396 | 396 | `f49b26aa18b181f5f5164a3e59897288dd55a5fb8d9456daa782d7e1622244de` | `f49b26aa18b181f5f5164a3e59897288dd55a5fb8d9456daa782d7e1622244de` | ✓ 相同 |
| S28 | 401 | 401 | `142bd0a439b23e031e4ac86bc36d79179b0efc5b0b17e11a64e77f6a6565d1d3` | `142bd0a439b23e031e4ac86bc36d79179b0efc5b0b17e11a64e77f6a6565d1d3` | ✓ 相同 |
| S29 | 417 | 417 | `4fadfe7eee90feed7bc7c54bf69bd1da223cd360e6eac60baed54e1480f53f1c` | `4fadfe7eee90feed7bc7c54bf69bd1da223cd360e6eac60baed54e1480f53f1c` | ✓ 相同 |
| S30 | 444 | 444 | `9ec02fef8cc8cf1edb46e61e0b92652f1ff5f3da872e889ceb9f5a64f896772d` | `9ec02fef8cc8cf1edb46e61e0b92652f1ff5f3da872e889ceb9f5a64f896772d` | ✓ 相同 |

合计：**29/30 相同**；唯一变化的是 S13（预期内）。
audit 总字数：**10539 → 10065**

合计：**29/30 相同**；唯一变化的是 S13（预期内）。
`audit` 总字数：**10,539 → 10,065**。

### 2.6 我**没有**修的：同一个机制在 `layout` 上还有 5 处

无编号加粗小节被并进上一个字段，这个 bug 在 `audit` 上是 S13 一案，
在 `layout` 上是 S14/S15/S16/S17/S20 五案。修切分器会让 `layout` 五案合计 **−2,426 字**
（S14 −648/−364、S15 −396/−183、S16 −330、S17 −190、S20 −315），撞碎字节验收线、要重跑全部闸门。
裁决 §3.4 明确放弃、另立 P3 待办。**所以本轮只切 `audit`，并且把这段理由写进了代码注释** ——
免得下一个人以为「顺手把切分器一起修了」是安全的。

### 2.7 UI 层现在是冗余逻辑（待办，我不改）

`app.js` 里仍留着 `var AUDIT_CUT_AT = { S13: '反套路改造三指标' };` 与 `auditText()` 里的 `indexOf` 切片。
数据层修好后这段**已是 no-op**：`data.js` 里 S13 的 `audit` 不再含该标记，`indexOf` 返回 **−1**，
`if (i > 0)` 不成立。实测（`deliverables/65-verify/v2-audit.mjs`）：

```text
S13 body 长度 306；data.js audit 306；切点 indexOf=-1
S13 含评审工件关键词：无
其余 29 案逐字相同：29/29
```

**应由面板负责人删除**（连同那段 42 行「这是权宜之计」的注释一起改）。
留着一段「解释自己为什么必要」的死代码，比留着活代码更容易误导下一个读者。
我在 `collect-schemes.mjs` 的注释里留了明确指向：

```text
⚠️ 于是 UI 层那份切分现在是**重复逻辑**：`app.js` 的 `var AUDIT_CUT_AT = { S13: '反套路改造三指标' };`
   与 `auditText()` 里的 `indexOf` 切片，数据层修好后**应当由面板负责人删除**
```

---

## 3. 偏离 2：`audit` 在 `risk` 之前

### 3.1 验收要求（第 6 条）达成

```text
Object.keys() 里 auditIdx < riskIdx：30/30 案成立
  逐案 auditIdx/riskIdx：S01:14/15 S02:14/15 … S30:14/15
```

### 3.2 但**改前也是 14/15**，数据层键序本轮没变

| 项 | 改前 | 改后 |
|---|---|---|
| `audit` 在 `Object.keys()` 的 index | 14 | 14 |
| `risk` 在 `Object.keys()` 的 index | 15 | 15 |
| 相对顺序 | audit 在 risk 之后？ **false** | audit 在 risk 之后？ **false** |
| 记录里键的总数 | 33 | 33 |
| 键集合是否一致 | — | **true** |

改前 30 案的键序（S01 代表，30 案完全同构）：

```text
id, dir, cn, en, fr, structure, threshold, tone, def, family, fonts, layout, visuals, motion, audit, risk, landing, scenes, quirk, copy, copyParts, bg, primary, buttonText, errorCode, errorCodeSource, palette, built, gate, shots, axes, scenesYes, scenesNo
```

改后 30 案的键序：

```text
id, dir, cn, en, fr, structure, threshold, tone, def, family, fonts, layout, visuals, motion, audit, risk, landing, scenes, quirk, copy, copyParts, bg, primary, buttonText, errorCode, errorCodeSource, palette, built, gate, shots, axes, scenesYes, scenesNo
```

**为什么任务书说「要改」而实测是「已经是」**：上一轮加 `audit` 字段时，它就是写在
`motion`（字段 7）与 `risk`（字段 9）之间的 —— 因为规格里字段 8 本来就在字段 9 之前。
裁决文档 `VERDICT-audit-plumbing.md` §3.2 说的「现状 audit 在 idx 9、risk 在 idx 8」
指的是 **`app.js` 的字段渲染顺序**，不是 `data.js` 的键序。两件事被混在了一起。

所以我在这处**没有改代码**，只做了：

1. 在 `audit:` 上方补注释，把两个「位置」分开写清楚，并把实测数字（30/30、14/15）钉进去，
   免得下一个人以为还要再挪一次、或反过来把它挪错。
2. 在注释里写明 **UI 侧渲染顺序需同步（当前 app.js 里 audit 在 risk 之后），由面板负责人改**。

### 3.3 `app.js` 的渲染串确实是反的（留给面板负责人）

```js
field('反 AI 味风险与规避', r.risk) +     // ← 约 L702，先
auditFold(r) +                            // ← 约 L708，后
```

裁决 §3.2 的实测：`risk` 已在约 **1,900px**，`audit` 放它后面 → 约 **2,150px**，用户要滚 **2.4 屏**。
语义上也是反的 —— `audit`（凭什么说它反了 AI）是 `risk`（所以最容易做错什么）的**前提**。
**我没改 `app.js`。**

---

## 4. 10 条验收，原文输出

以下来自 `deliverables/65-exec/_cut/accept.mjs` 的**一次运行**（日志 `_cut/accept.txt`，UTF-8）。
重跑方式：`node deliverables/65-exec/_cut/accept.mjs`。**逐字粘贴，未编辑。**

```text

══════════════════════════════════════════════════════════════════════════════
【验收 1】node prototypes/_build/collect-schemes.mjs → exit 0
══════════════════════════════════════════════════════════════════════════════
$ node prototypes/_build/collect-schemes.mjs
_CURRENT-VALUES.md 解析出 30 案
§2 旧值黑名单：21 案，共 29 个作废色
§4 Lead 补入错误码 10 条（S21 S22 S23 S24 S25 S26 S27 S28 S29 S30）
30 案：有页面 30｜有截图 30｜FAIL=0 26
字段 8 评审工件切断（标记「反套路改造三指标」，按标记不按案号）：S13 780→306 字（切于第 307 字）
调色板剔除 87 个候选 hex：否定语境或无角色标签 66｜样式面 0 次（规格有、CSS/SVG 没用） 12｜§2 作废旧值 9
已写 prototypes/_selection/data.js（155.0 KB）
[exit code: 0]

══════════════════════════════════════════════════════════════════════════════
【验收 2】node --check prototypes/_selection/data.js
══════════════════════════════════════════════════════════════════════════════
$ node --check prototypes/_selection/data.js

[exit code: 0]

══════════════════════════════════════════════════════════════════════════════
【验收 3】data.js 的 audit 总字数 = 10,066（±2）
══════════════════════════════════════════════════════════════════════════════
$ node -e "读 data.js，reduce 求和 audit.length"
audit 总字数 = 10065   （期望 10,066，容差 ±2 → PASS）
  逐案长度：292 337 294 282 286 290 311 286 293 276 376 293 306 342 314 317 304 367 324 349 327 371 299 417 363 391 396 401 417 444
  校验式：10,539（改前合计）− 780（S13 旧值）+ 306（S13 新值）= 10065
[exit code: 0]

══════════════════════════════════════════════════════════════════════════════
【验收 4】S13 的 audit 长度 = 306（±2），且不含「反套路改造三指标」「打勾」「供 V-11」
══════════════════════════════════════════════════════════════════════════════
$ node -e "读 data.js 的 S13.audit"
S13.audit 长度 = 306   （期望 306，容差 ±2 → PASS）
S13.audit 含污染串：无（0 命中，检查 6 个串）
S13.audit 尾部 40 字：…形容，立体感一律给成 0.4mm 压深、3% 亮度差、14% 边缘对比度三个数。
[exit code: 0]

══════════════════════════════════════════════════════════════════════════════
【验收 6】Object.keys() 里 audit 在 risk 之前
══════════════════════════════════════════════════════════════════════════════
$ node -e "读 data.js，逐案 Object.keys().indexOf"
Object.keys() 里 auditIdx < riskIdx：30/30 案成立
  逐案 auditIdx/riskIdx：S01:14/15 S02:14/15 S03:14/15 S04:14/15 S05:14/15 S06:14/15 S07:14/15 S08:14/15 S09:14/15 S10:14/15 S11:14/15 S12:14/15 S13:14/15 S14:14/15 S15:14/15 S16:14/15 S17:14/15 S18:14/15 S19:14/15 S20:14/15 S21:14/15 S22:14/15 S23:14/15 S24:14/15 S25:14/15 S26:14/15 S27:14/15 S28:14/15 S29:14/15 S30:14/15
  S13 完整键序：id,dir,cn,en,fr,structure,threshold,tone,def,family,fonts,layout,visuals,motion,audit,risk,landing,scenes,quirk,copy,copyParts,bg,primary,buttonText,errorCode,errorCodeSource,palette,built,gate,shots,axes,scenesYes,scenesNo
[exit code: 0]

══════════════════════════════════════════════════════════════════════════════
【验收 5】其余 29 案 audit 的 sha256 与改前逐案相同
══════════════════════════════════════════════════════════════════════════════
$ node deliverables/65-exec/_cut/compare.mjs   （节选：逐案表）
═══ 2. 逐案 audit sha256 / 长度 ═══
案号  len前  len后   Δ    sha256 前 16 位    同？
S01    292    292     0   10b3ca8fa0b9e527  10b3ca8fa0b9e527  ✓同
S02    337    337     0   71d2239cfd89e42b  71d2239cfd89e42b  ✓同
S03    294    294     0   5b5121cc7716a2f0  5b5121cc7716a2f0  ✓同
S04    282    282     0   5e2b464c837492fb  5e2b464c837492fb  ✓同
S05    286    286     0   4b20cda7f4e8512d  4b20cda7f4e8512d  ✓同
S06    290    290     0   763f768e842c8792  763f768e842c8792  ✓同
S07    311    311     0   27cb7af267c814a8  27cb7af267c814a8  ✓同
S08    286    286     0   e9f76fcfd50a2da1  e9f76fcfd50a2da1  ✓同
S09    293    293     0   8a0666a0732b3f38  8a0666a0732b3f38  ✓同
S10    276    276     0   be4b5810ccc7abfc  be4b5810ccc7abfc  ✓同
S11    376    376     0   422f675f04234bc2  422f675f04234bc2  ✓同
S12    293    293     0   43fd072a62a49be3  43fd072a62a49be3  ✓同
S13    780    306  -474   d9fa07d22af9a7af  3fb5ce2daa24387f  ✗变
S14    342    342     0   1621fccc055768ac  1621fccc055768ac  ✓同
S15    314    314     0   8e999dd89c6efbc0  8e999dd89c6efbc0  ✓同
S16    317    317     0   39595df88a4c8bb7  39595df88a4c8bb7  ✓同
S17    304    304     0   b20828958f05de97  b20828958f05de97  ✓同
S18    367    367     0   36b7e6c3b1e6689c  36b7e6c3b1e6689c  ✓同
S19    324    324     0   385371202a34b2a1  385371202a34b2a1  ✓同
S20    349    349     0   85b24f3d5041a70c  85b24f3d5041a70c  ✓同
S21    327    327     0   2d08d72696052393  2d08d72696052393  ✓同
S22    371    371     0   b484a7facf973b33  b484a7facf973b33  ✓同
S23    299    299     0   c1c3f0820e941f73  c1c3f0820e941f73  ✓同
S24    417    417     0   2447d5a98964751d  2447d5a98964751d  ✓同
S25    363    363     0   e41aba9016e367e0  e41aba9016e367e0  ✓同
S26    391    391     0   26d44d9429756137  26d44d9429756137  ✓同
S27    396    396     0   f49b26aa18b181f5  f49b26aa18b181f5  ✓同
S28    401    401     0   142bd0a439b23e03  142bd0a439b23e03  ✓同
S29    417    417     0   4fadfe7eee90feed  4fadfe7eee90feed  ✓同
S30    444    444     0   9ec02fef8cc8cf1e  9ec02fef8cc8cf1e  ✓同

相同 29/30；变化：S13
[exit code: 0]

══════════════════════════════════════════════════════════════════════════════
【验收 7】node prototypes/_prompts/build-prompts.mjs（键序变化是否打坏 RISK / REUSE 两个正则闭包）
══════════════════════════════════════════════════════════════════════════════
$ node prototypes/_prompts/build-prompts.mjs
=== prompts.js 已生成 ===
  体积：59.0 KB（30 案 DNA + 场景索引）
  场景索引：44 个行业词，其中 unsupported 单列 29 个
  不能大众化的案：S15, S18, S21, S29
  缺人话版的案：无
  有机制句的案：30/30 → 实际 30/30
  平均每案 DNA 字数：775

=== 字体（P0-2：标题字＝h1 规则解析结果，不再按数组顺序猜）===
  S01  标题 Noto Sans SC ｜ 正文 Noto Sans SC ｜ 等宽 Martian Mono
  …（30 行字体表、调色板分布、reuse 抽样略，全文见 deliverables/65-exec/_cut/build-prompts.after.txt）
[exit code: 0]
prompts.js sha256 改前 = 1C0D607D62E1B854CD82D08273367668D459C7F89F97A53A54AA57AB41FEEB72
prompts.js sha256 改后 = 1C0D607D62E1B854CD82D08273367668D459C7F89F97A53A54AA57AB41FEEB72
字节相同 = true

$ node deliverables/65-exec/_cut/regex-probe.mjs   （RISK / REUSE 正则的键序敏感性）
═══ A. 改前 / 改后：正则抽到的 risk 与 landing ═══
  改前 risk 命中 30/30，landing 命中 30/30
  改后 risk 命中 30/30，landing 命中 30/30
  risk 值变化的案：无（30/30 逐字相同）
  landing 值变化的案：无（30/30 逐字相同）

═══ B. 关键问题：正则会不会因为 audit 挡在 risk 前面而"跨条吞"？ ═══
  抽取值与 data.js 里 risk 字段的真实值比对：30/30 相同
  landing 同理：30/30 相同

═══ C. 顺序无关性：把 risk 挪到 audit 之前，正则还成立吗 ═══
  键序 [audit < risk < landing]  → risk="RRR" landing="LLL" ✓
  键序 [risk < audit < landing]  → risk="RRR" landing="LLL" ✓
  键序 [landing < risk < audit]  → risk="RRR" landing="LLL" ✓

═══ D. 关键判据：每次匹配是否**跨过了本条记录的 } 边界** ═══
  检查 30 次匹配，跨条 0 次 ✓ 全部落在本条记录内
  旁证：改后 data.js 的**序列化文本**里 "audit" 在 "risk" 之前的记录数 = 30/30
[exit code: 0]

══════════════════════════════════════════════════════════════════════════════
【验收 8】node prototypes/_build/verify-prototype.mjs --all → 26/4/30，FAIL = S07:1 S08:2 S13:4 S21:1
══════════════════════════════════════════════════════════════════════════════
$ node prototypes/_build/verify-prototype.mjs --all
✗ S07 S07-slate-ink-contents
    · 闸门 FAIL=1：mono
✗ S08 S08-amber-overprint-lightbox
    · 闸门 FAIL=2：palette-terracotta font-count
✗ S13 S13-blind-debossed-dispatch
    · 闸门 FAIL=4：mono shadow button-fx empty-screens
✗ S21 S21-interlocking-release-book
    · 闸门 FAIL=1：mono
达标 26 / 不达标 4 / 共 30
[exit code: 1]   （--all 在有不达标案时按设计返回 1）
基线文件编码：UTF-16LE(BOM)，10150 B / 现在 5581 B
与改前基线的输出逐行比对：完全相同（0 行差异，换行归一化后）

══════════════════════════════════════════════════════════════════════════════
【验收 9】node prototypes/_build/check-docs.mjs → exit 0
══════════════════════════════════════════════════════════════════════════════
$ node prototypes/_build/check-docs.mjs
文档一致性：README.md ↔ data.js / prompts.js / prompt-copy.js
  ✓ ids/exist            文档提到的方案编号全部存在（data.js 30 案）
  ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数
  ✓ nums/gate            闸门 FAIL=0 的案数 = 26，与实测一致
  ✓ nums/warn-axes       警告两轴：hard 4 / degrades 13 / 并集 14，文档口径一致
  ✓ nums/prompt-len      提示词长度 = 1632–1920，中位 1822，文档一致
  ✓ nums/scenes          场景词 44 / 直连 16 / 近似 28 / 标为没有 29，文档一致
  ✓ status/fixed-claims  没有把已修项写成未修
  ✓ status/layout-fix    layout 抽取 30/30 有值，S12/S15/S19 = 549/640/420 字
  ✓ i18n/facts           中英两版的关键事实一致（方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集）
  ✓ paths/exist          文档里 15 条仓库路径全部存在
  ✓ paths/templates      文档提到的模板编号都存在
  ✓ regression/banned    6 条已腐化原话均未回归

README.md: 0 FAIL / 0 WARN / 12 PASS
[exit code: 0]

══════════════════════════════════════════════════════════════════════════════
【验收 10】不要碰 app.js / style.css / prompt-copy.js（git diff --stat 证明）
══════════════════════════════════════════════════════════════════════════════
$ git diff --stat
 README-EN.md                          |  21 ++-
 README.md                             |  20 ++-
 prototypes/_build/check-anchors.mjs   |   8 +-
 prototypes/_build/collect-schemes.mjs | 160 ++++++++++++++++++-
 prototypes/_selection/app.js          | 284 ++++++++++++++++++++++++++++++++--
 prototypes/_selection/data.js         |  36 ++++-
 prototypes/_selection/prompt-copy.js  | 231 ++++++++++++++++++++++++---
 prototypes/_selection/style.css       | 260 ++++++++++++++++++++++++++++++-
 8 files changed, 962 insertions(+), 58 deletions(-)

（注意：app.js / style.css / prompt-copy.js 的改动行数**在我开工前就存在**——本轮已有 5 个 Agent 改过这两个目录，全部未 commit。证明"我没碰"靠 mtime + 行数不变，见下。）

$ Get-Item <4 个禁改文件> | mtime   （我的会话首个工具调用 = 2026-10-27T06:07:41）
  prototypes/_selection/app.js               2026-10-26T22:06:08.008Z  51673 B
  prototypes/_selection/style.css            2026-10-26T22:01:35.908Z  40282 B
  prototypes/_selection/prompt-copy.js       2026-10-26T21:36:44.731Z  70907 B
  prototypes/_selection/wizard.js            2026-10-26T12:31:58.964Z  15149 B

另：本次改动跑完后，这四个文件的 SHA256（开工时未单独留档，故用 mtime 早于 06:07:41 作证）；以及本轮我实际写过的文件清单。
  prototypes/_selection/app.js               29F7248BED9D3AAF1F605935CA5F2B846CC74B68FBC6D38D06954208540FCFAB
  prototypes/_selection/style.css            6AE802E3BE6F1ADFCED8A5E3453C6B342E7CCBB24705D8852240C49FF60E3EFC
  prototypes/_selection/prompt-copy.js       30181BACCB7F49B6636A3BC37D211C05EA1B724D279D76967C8C2E61EE3A9BF3
  prototypes/_selection/wizard.js            BEF385A7E5A50B4E92BC70CCF577B65707A0553C982BBE3712F4634EB83DFFAF
```

### 4.1 关于验收 8 的 `exit code: 1`

`verify-prototype.mjs --all` 在**有不达标案时按设计返回 1**，不是崩溃。
改前基线同样是 1，且改前改后的输出**逐行完全相同（0 行差异）**；
26/4/30 与 FAIL 名单 `S07:1 S08:2 S13:4 S21:1` 均未变。

### 4.2 关于验收 1 的「调色板剔除 87 个」

这个数与本轮改动无关（改前也是 87），列在这里只是因为它出现在同一条命令的输出里。

---

## 5. 我可能弄坏的地方

按「有多确定」排序。前两条是**真风险**，后面几条是我核过、确认没坏的。

### 5.1 ⚠️ 真风险：`build-prompts.mjs` 的两个正则依赖**键存在**，不依赖键序

`build-prompts.mjs:44` 与 `:78` 有两个从 `data.js` 抽字段的闭包：

```js
const re = /"id":\s*"(S\d{2})"[\s\S]*?"risk":\s*"((?:[^"\\]|\\.)*)"/g;      // RISK
const re = /"id":\s*"(S\d{2})"[\s\S]*?"landing":\s*"((?:[^"\\]|\\.)*)"/g;   // REUSE
```

它们靠 `[\s\S]*?` 惰性段**跨过本条记录的所有中间键**去够目标键。本轮 `audit` 在 `risk` 之前，
中间键从 0 个变成 1 个 —— 正是可能出问题的地方，所以专项验了：

```text
═══ A. 改前 / 改后：正则抽到的 risk 与 landing ═══
  改前 risk 命中 30/30，landing 命中 30/30
  改后 risk 命中 30/30，landing 命中 30/30
  risk 值变化的案：无（30/30 逐字相同）
  landing 值变化的案：无（30/30 逐字相同）

═══ B. 关键问题：正则会不会因为 audit 挡在 risk 前面而"跨条吞"？ ═══
  抽取值与 data.js 里 risk 字段的真实值比对：30/30 相同
  landing 同理：30/30 相同

═══ C. 顺序无关性：把 risk 挪到 audit 之前，正则还成立吗 ═══
  键序 [audit < risk < landing]  → risk="RRR" landing="LLL" ✓
  键序 [risk < audit < landing]  → risk="RRR" landing="LLL" ✓
  键序 [landing < risk < audit]  → risk="RRR" landing="LLL" ✓

═══ D. 关键判据：每次匹配是否**跨过了本条记录的 } 边界** ═══
  检查 30 次匹配，跨条 0 次 ✓ 全部落在本条记录内
  旁证：改后 data.js 的**序列化文本**里 "audit" 在 "risk" 之前的记录数 = 30/30
```

**结论：没有失配。** 最硬的证据是 `prompts.js` 重跑后**字节完全相同**
（sha256 前后都是 `1C0D607D…FEEB72`，60,460 B）—— 若 `risk` 抽错，`dna.risk` 会变，字节不可能一样。

**但这个机制本身是脆的，失败模式是静默的**：若某条记录**缺 `risk` 键**，正则不报错，
会跨到下一条记录去取值 —— S01 的提示词里会印出 S02 的风险禁令。可复现：

```text
═══ 正常两案 ═══
{"S01":"RISK-1","S02":"RISK-2"}

═══ 把 S01 的 risk 键整个删掉 ═══
  抽到 = {"S01":"RISK-2"}
  S01 的 risk = "RISK-2"
  判定：✗ 静默失配 —— S01 拿到了 S02 的值，build-prompts 不会报错，提示词里会印出别人的风险禁令

═══ 把 S01 的 risk 改成空串（键还在）═══
  抽到 = {"S01":"","S02":"RISK-2"}
  判定：✓ 正确取空（键存在即可，空值安全）

═══ 对照：audit 的值里含 "risk" 这个词 ═══
  抽到 = {"S01":"RISK-1"}  判定：✓ 安全（裸词不构成 "risk": 键形态）

═══ 结论 ═══
  本轮改动（audit 在 risk 之前）不触发上面任何一种：实跑 30/30 逐字正确（见 regex-probe.mjs §B/§D）。
  但「记录缺键 ⇒ 静默拿邻居的值」这条**先于我的改动就存在**，
  触发条件是「某案 risk 或 landing 字段整个缺失」，而 collect-schemes 永远写这两个键（空串也算有），
  所以当前不可达。写在这里是因为下一个改生成器的人可能会「顺手」把空值键省掉。
```

当前**不可达**：`collect-schemes.mjs` 永远写 `risk` / `landing` 这两个键（空串也算「有键」），
空串情形实测安全（`"risk": ""` 被正确抽成空串）。
**但这条要记着**：下一个改生成器的人若为了「省体积」把空值键省掉，`prompts.js` 会静默印错。

### 5.2 ⚠️ 真风险：别的 Agent 的验收脚本硬编码了 `307`

`deliverables/65-exec/accept-audit.mjs`（面板 Agent 写的 CDP 验收）断言：

```js
ok(s13.opened.textLen === 307, 'S13 展开后字数 = 307', '实测 ' + s13.opened.textLen);
```

它测的是「UI 层切分后的长度」。数据层 trim 后是 306，且 UI 不再切，于是**这条断言现在 FAIL**：

```text
[验收 2] S13 显示 307 字，不含评审工件字样
  FAIL  S13 展开后字数 = 307  实测 306
  FAIL  S13 展开后与前 307 字逐字相同
  PASS  S13 展开后不含「打勾 / 供 V-11 / 反套路改造三指标 / 必须存在 X」等字样
  PASS  逐字相同（不含 S13）  29/29
```

**这不是回归，是断言的前提过期了**：它把「UI 层切在哪」当成了期望值。
正确口径现在是 `S13 展开后字数 === data.js 的 audit.length`（= 306），或干脆不写死数字。
同理 `deliverables/65-verify/v2-audit.mjs` 里的 `expectS13 = audit.slice(0, idx)` 在 `idx === -1`
时退化成全文，恰好仍然通过（它打印 `切点 indexOf=-1`）—— 属于「碰巧还对」，也值得一并改口径。
**这两个文件不在我的写作用域，我没改**，只在这里记明。

### 5.3 已核过、没坏的：S13 的正文一个字没丢

改后的 306 字恰好等于 `改前.slice(0, 307).trimEnd()`（脚本断言 `true`）。
切掉的 474 字符 =「␣反套路改造三指标（…）…盲压区与背景亮度差 3%（…）。」整段。
那 474 字**不属于字段 8**；按裁决 §3.4，它被明确接受为「暂时丢失」，另立 P3 待办。
**11 个阈值（135° / 0.4mm / 120ms / 0.8px / 14% / 3% 等）仍在 `prototypes/_specs/S13.md:37–40` 原文里，没有丢。**

### 5.4 已核过、没坏的：其他字段

- `risk` 的 sha256：**30/30 不变**（`_cut/compare.mjs` §3）。
- 键集合（排序后）：**30/30 一致** —— 没有多键、没有少键。
- `layout` 仍 30/30 有值（`check-docs` 的 `status/layout-fix` PASS，S12/S15/S19 = 549/640/420 字）。
- 生成器**幂等**：连跑两次 `data.js` 的 sha256 相同（`6D1AEEC0…387FA`）。

### 5.5 我明确**没有**修的东西（别以为我漏了）

1. **无编号加粗小节串段的根因**（§2.6）。只切 `audit`，`layout` 五案不动。
2. **`app.js` 的 `AUDIT_CUT_AT` 死代码**（§2.7）。
3. **`app.js` 的 `audit`/`risk` 渲染顺序**（§3.3）。
4. **硬编码 `307` 的验收脚本**（§5.2）。
5. **任何 `_specs/*.md`** —— 源文件里那 10 处标记是历史记录，改源文件等于伪造来源。

---

## 6. 附：探针脚本与改前快照（都在 `deliverables/65-exec/_cut/`）

| 脚本 | 作用 | 产物 |
|---|---|---|
| `dump.mjs` | 把 `data.js` 每案的 `audit` 长度 / sha256 / 键序 dump 成 JSON | `before.json` `after.json` |
| `compare.mjs` | 改前/改后逐案对比（29 案字节、键序、键集合、risk） | `compare.txt` |
| `show.mjs` | 打印某案 `audit` 全文与标记位置 | `s13.after.txt` |
| `scan-marker.mjs` | 标记在 `data.js` 全键与 `_specs/*.md` 的分布；可传路径 | `scan-before-after.md` |
| `ws-probe.mjs` | 29 案 `audit` 是否带首尾空白（决定要不要 trim） | §2.3 |
| `regex-probe.mjs` | `RISK`/`REUSE` 正则的键序敏感性 + 是否跨条 | `regex-probe.txt` |
| `regex-fragility.mjs` | 正则的**静默失配**边界（缺键 ⇒ 拿邻居的值） | `regex-fragility.txt` |
| `for-doc.mjs` | 生成 §2.5 / 键序对照 / sha256 表 | `for-doc.md` |
| `accept.mjs` | 一次跑完 10 条验收，写 UTF-8 日志 | `accept.txt` |

改前快照（回滚对照用）：

| 快照 | 大小 | 说明 |
|---|---|---|
| `_cut/data.before.js` | 308,088 B | 改动前的 `data.js` 全文 |
| `_cut/collect-schemes.before.mjs` | 43,401 B / 624 行 | 改动前的生成器 |
| `_cut/prompts.before.js` | 60,460 B | 改动前的 `prompts.js`（与改后字节相同） |
