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

{{SCAN}}

### 2.5 改前 / 改后全文（完整贴出）

{{S13FULL}}

### 2.5.1 其余 29 案字节不变：30 案 sha256 逐案对照（全 64 位）

{{SHATABLE}}

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

{{KEYORDER}}

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
{{ACCEPT}}
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
{{REGEX}}
```

**结论：没有失配。** 最硬的证据是 `prompts.js` 重跑后**字节完全相同**
（sha256 前后都是 `1C0D607D…FEEB72`，60,460 B）—— 若 `risk` 抽错，`dna.risk` 会变，字节不可能一样。

**但这个机制本身是脆的，失败模式是静默的**：若某条记录**缺 `risk` 键**，正则不报错，
会跨到下一条记录去取值 —— S01 的提示词里会印出 S02 的风险禁令。可复现：

```text
{{FRAGILE}}
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
