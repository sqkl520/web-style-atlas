# 四项任务实施计划（P1a / P1b / P2 / P3）

> 计划撰写者：规划 Agent（本轮只读）
> 仓库：`D:\Web\style`　基线 commit：`0d3d499`（2026-10-30 20:58:44 +0800）
> 开工 tracked 改动数：**0**　收尾 tracked 改动数：**0**
> 本计划内所有数字均来自 `deliverables/73-plan/plan-probe-*.mjs` 与 `plan-p1a-mutation.mjs` 的实测输出，不是估算。
>
> **⚠️ 开工期间发现另一 Agent 正在并发施工**（02:12–02:28 之间落地了
> `prototypes/_build/check-contract.mjs`（新文件，未跟踪）与 `fonts → fontsSpec` 改名）。
> 本计划已按**施工后的实际状态**撰写，并在第 5 章列为头号翻车风险。

---

## 1 一页结论表

| 项 | 改动文件（行号） | 风险 | 预计影响面 | 「做完了」的可证伪判据 |
| --- | --- | --- | --- | --- |
| **P1a** 契约一致性闸门 | **已有** `prototypes/_build/check-contract.mjs`（205 行，未跟踪）<br>修 `:53` 切片起点<br>改 `:135-136` WARN→FAIL<br>改 `docs/README` 引用 1 行 | **低**（纯新增检查器；唯一改动是 2 处判定级别） | 30 份 `report.json` + 1 份契约表；**不改任何原型** | ① 干净仓库 `node check-contract.mjs` exit 0；② `plan-p1a-mutation.mjs` 9 例全绿，且 **M1b/M1c 这一对必须一红一绿**（证明侧门缺陷存在且被修掉）；③ M2/M3/M4 三例各自 exit 1 且输出含对应规则名；④ **M5/M6 必须从 exit 0 翻成 exit 1**（当前是缺口） |
| **P1b** report 陈旧度 | **无需新增代码** —— `check-stale.mjs:40-61` 已经就是 P1b 要求的全部<br>只建议：`:60` 的 `gapMin > 1` 升到 `> 3`（有实测依据）<br>`.inspect/*.jpg` 判定**采用判据 A**（jpg mtime > report.json mtime，阈值 1 分） | **极低**（判据不动，只调一个常数） | 30 案 + `_selection`；上线实测**只红 1 案**（S08），非全红 | ① `node check-stale.mjs` 现在 exit 1（S08 落后 10025 分 + `_selection` 落后 313 分）；② 重渲染 S08 与 `_selection` 后 exit 0；③ 变异：`touch` 某案 `style.css` 后必须立刻 exit 1 并打出该案的 `render-scheme.mjs` 命令；④ 把 `gapMin > 3` 改成 `> 99999` 后 S08 必须变绿（证明阈值真的在生效，而不是恒红） |
| **P2** `fonts`→`fontsSpec` | **已由并发 Agent 完成大半**：`collect-schemes.mjs:364`、`data.js` 30 处、`app.js:239/1357`<br>**剩余必做**：删掉 `app.js` 两处 `\|\| r.fonts` 兜底（`:239`、`:1357`）<br>建议：`collect-schemes.mjs:719` 的注释同步 | **低**（消费方只有 2 处，且都是原样使用字符串） | 3 个文件 / 34 个消费点（其中 30 个是 data.js 的数据行） | ① 全库 `git ls-files` 内 `r.fonts\b` 命中 **0**（当前 3 处，含 2 处兜底 + 1 处注释）；② `data.js` 的 `"fonts":` 命中 0、`"fontsSpec":` 命中 30；③ 字段字节零损失：30 处 `fontsSpec` 合计 **11232 字符**（改名前后同值，已实测）；④ `node collect-schemes.mjs --check` 打印的「缺 字体策略」为空 |
| **P3** 30 案规格一致性 | **新增** `prototypes/_build/check-spec.mjs`（约 260 行）<br>**不改**任何原型、不改 `_specs/` | **中**（首轮会红 1 条真缺陷 + 4 条需先剥注释；且 19/30 案的 §2 旧值表根本没有行） | 30 案 × 2 文件；**只读** | ① 四条机械判据的「可判定数」必须打印出来，且 `可判定 + 解析不出 = 30` 恒成立（防假绿）；② 剥 CSS 注释后，S04/S10/S19/S28 的四条旧值命中**全部消失**（已实测为假阳性）；③ S04 按钮字色这条必须红（实测 `.btn{color:var(--paper)}` = `#F0E2C8`，而规格写 `#FFFFFF`）；④ 变异：把 S01 的 `--paper` 改成 `#000000`，背景判据必须红 |

**最不值得做的一项：P2。** 详见 §5-1。它不是不重要，而是**性价比最低**：改动面 3 文件、收益是"消歧义"，而真正被同名坑到的那段代码（`prompt-copy.js:180-183` 的数组兜底分支）**跟 `data.js` 完全无关**（它读的是 `dna.fonts`），改名不会让那段消失。而且并发 Agent 已经把它做掉 90%，剩下的价值主要是"删掉两处兜底"。

---

## 2 P1a 契约一致性闸门

### 2.1 现状

**已存在的东西**（2026-10-31 02:12 由并发 Agent 落地）：

- `prototypes/_build/check-contract.mjs`，205 行，**未跟踪**（`git status` 显示 `?? prototypes/_build/check-contract.mjs`）。
- 它已经实现三条断言：
  - `C1`（`:131-149`）逐案 `report.json` 的 FAIL 是否都在 §9.15 允许表里；
  - `C2`（`:116-129`）允许表登记的规则名是否真的存在于 `rules.mjs` 的 `RULE_IDS`；
  - `C3`（`:151-157`）允许表里登记但当前无案触发的规则（INFO，审计线索）。
- 代码风格已对齐 `check-twolines.mjs`：`findings` / `add()` / `stats` / `JSON_OUT` / `QUIET` / `process.exit(FAILS.length ? 1 : 0)`。
- 实测输出：

```
契约一致性闸门：§9.15 允许表(5 条) vs 30 案实测 FAIL
  C1 FAIL 全在允许表内        2/2
  C2 允许表的规则引擎里都存在  5/5
  C3 登记但无案触发（INFO）    4 条
合计 FAIL 0 / WARN 0 / INFO 1
EXIT=0
```

**所以「产品化」这一步已经完成了。本节的真实任务不是"写它"，而是两头**：
① **决定它放哪**（已在 `_build/`，符合预期，见 2.3）；
② **证明它不是恒真式** —— 而这里发现了**两个真缺陷**。

### 2.2 缺陷一：`parseAllowTable()` 的切片起点错位（已用变异钉死）

`check-contract.mjs:53` 写的是：

```js
const i = md.indexOf('9.15');
```

实测（`plan-probe-p1a.mjs`）：

```
md.indexOf('9.15')     → 字符 4700，第 110 行
该行原文               → | **静止态禁 `box-shadow`** | `shadow` 规则（工具侧 `rules.mjs`：任何…
/^\*\*9\.15/ 标题行    → 字符 10019，第 194 行
⇒ 朴素切片多吃了 84 行
```

第 110 行是 **§6 硬约束表里引用 §9.15 的那一行**，不是 §9.15 的标题。于是切片把 §6 整张表（14 行数据行）都吞进了"允许表"范围。

**今天没出事，纯属格式巧合**：§6 用 `| **不得横向溢出** |`（加粗），不匹配 `^\|\s*` + 反引号。实测 §6 里"若写成反引号开头就会被误收"的行数 = **0**。

变异实证（`plan-p1a-mutation.mjs` M1a/M1b/M1c）：

| 用例 | 变异 | 朴素切片 | 修正切片 |
| --- | --- | --- | --- |
| M1a | 只在 §6 加 `\| \`shadow\` \| 侧门 \| 见 §9.15 \|` | exit 0，`shadow` 进 C3 unused 名单 | （同一镜像）`shadow` 不出现 |
| M1b | M1a + 一条 `shadow` FAIL | **exit 0 ← 假绿** | — |
| M1c | M1b + 修好的解析器 | — | **exit 1，C1-fail-not-in-allowlist 命中** |

这一对（M1b 绿 / M1c 红）就是"它不是恒真式"的**最强证据**：同一个变异，只改解析器一行，结论翻转。

### 2.3 缺陷二：报告缺失/损坏只报 WARN，退出码仍是 0

`check-contract.mjs:135-136`：

```js
if (c.missing)    { stats.missingReports++; add('WARN', c.id, 'C0-report-missing', '没有 .inspect/report.json，无法判定该案'); continue; }
if (c.unreadable) { add('WARN', c.id, 'C0-report-unreadable', 'report.json 解析失败'); continue; }
```

而退出码只看 `FAILS`（`:204`）。变异 M5/M6 实测：删掉/写坏一份 `report.json` → 输出含 `C0-report-missing` 但 **exit 0**。

**为什么这比缺陷一更严重**：§7.2 的判据是「FAIL 集合 ⊆ 允许表」。当某案连 FAIL 集合都读不出来时，空集合天然是任何集合的子集 —— **"无法判定"被当成了"成立"**。这正是本仓库 §9.19「量错对象」的同一家族。

### 2.4 决定：放进哪个检查器？—— **新建独立 `check-contract.mjs`，不要塞进 `check-docs.mjs`**

理由三条，都可反驳：

1. **对象不同**。`check-docs.mjs` 的对象是 **README 文本**（它 `--root` 换的是文档目录，数据源固定是真仓库；见 `:76-78`）。而契约闸门的对象是 **契约 + 30 份 report.json**，与 README 无关。塞进 `check-docs` 就要给它加第二个"文档"概念，`--root` 的语义会立刻变得含混。
2. **它已经在了**。`check-contract.mjs` 已由并发 Agent 落地，且已按 `check-twolines.mjs` 的骨架写好。此时"合并进 check-docs"是纯粹的返工。
3. **粒度正确**。`check-twolines`（两条链关系）、`check-prompts`（提示词对账）、`check-contract`（契约豁免表）是三个正交断言，各自能独立红、独立被引用。README:174 已经用「三件"页面本身看不出问题"的检查」这种句式登记过一组，追加第四个是同类扩张。

**但有一件事必须做**：把它**纳入 README 的检查器清单**（`README.md:174-176` 那一段），否则它会是"写了检查、但没人知道要跑"的第二个 `_selection` 事故（`_entries.mjs:11-16` 记的就是这个教训）。

### 2.5 精确改动

#### 改动 A —— 修切片起点

文件：`prototypes/_build/check-contract.mjs`　行：`52-56`

**改前**
```js
function parseAllowTable(md) {
  const i = md.indexOf('9.15');
  if (i < 0) throw new Error('_CONTRACT.md 里找不到 §9.15');
  const j = md.indexOf('9.16', i);
  const sec = j > 0 ? md.slice(i, j) : md.slice(i);
```

**改后**
```js
function parseAllowTable(md) {
  /* ⚠️ 不能写 `md.indexOf('9.15')`：这个字符串在 _CONTRACT.md 里**第一次出现是 L110**
   * （§6 表里引用 §9.15 的那一行），而 §9.15 的标题在 L194。
   * 朴素切片会多吃 84 行，把 §6 整张表纳入"允许表"范围 ——
   * 于是任何人在 §6 写一行 `| `shadow` | … | … |`，shadow 就被自动豁免。
   * 实测（deliverables/73-plan/plan-p1a-mutation.mjs 的 M1b/M1c）：
   *   朴素切片 → exit 0（假绿）；修正切片 → exit 1（C1 命中）。
   * 正确做法：按**标题行**定位（`**9.15 …**`，行首）。 */
  const hm = md.match(/^\*\*9\.15[^\n]*/m);
  if (!hm) throw new Error('_CONTRACT.md 里找不到 §9.15 的标题行（/^\\*\\*9\\.15/）');
  const i = hm.index;
  const j = md.indexOf('9.16', i);
  const sec = j > 0 ? md.slice(i, j) : md.slice(i);
```

#### 改动 B —— 报告缺失/损坏从 WARN 升 FAIL

文件：`prototypes/_build/check-contract.mjs`　行：`135-136`

**改前**
```js
  if (c.missing) { stats.missingReports++; add('WARN', c.id, 'C0-report-missing', '没有 .inspect/report.json，无法判定该案'); continue; }
  if (c.unreadable) { add('WARN', c.id, 'C0-report-unreadable', 'report.json 解析失败'); continue; }
```

**改后**
```js
  /* 2026-10-31：WARN → FAIL。
   *
   * 为什么必须升级：§7.2 的判据是「FAIL 集合 ⊆ 允许表」。
   * 读不出一份 report.json 时，FAIL 集合 = 空集，而**空集是任何集合的子集** ——
   * 「无法判定」被静默当成了「成立」。实测（plan-p1a-mutation.mjs 的 M5/M6）：
   * 删掉 / 写坏一份 report.json ⇒ 只打一行 C0-report-missing，**exit 仍是 0**。
   * 这与 §9.19「量错对象」是同一家族：用一个查不出东西的判据宣布合规。
   * 缺失报告不是"另一类问题"，它就是"这一案无法证明自己合规"，按 FAIL 处理。 */
  if (c.missing) { stats.missingReports++; add('FAIL', c.id, 'C0-report-missing',
    '没有 .inspect/report.json —— 这一案无法证明 FAIL 集合 ⊆ 允许表。' +
    '修复：node prototypes/_build/render-scheme.mjs ' + c.dir); continue; }
  if (c.unreadable) { add('FAIL', c.id, 'C0-report-unreadable',
    'report.json 解析失败（JSON 坏了）—— 同上，无法判定即不成立。' +
    '修复：node prototypes/_build/render-scheme.mjs ' + c.dir); continue; }
```

#### 改动 C —— README 登记（1 行）

文件：`README.md`　行：`174`（那行是三检查器的清单）
在 `check-anchors.mjs` 后追加 `check-contract.mjs`，并补一句它查什么。**注意**：这一改会动 `check-docs.mjs` 的覆盖范围（`README.md` 是它的检查对象），改完必须跑 `node prototypes/_build/check-docs.mjs` 确认仍 0 FAIL。

### 2.6 验证方法

```powershell
# 1 干净仓库必须绿
node prototypes/_build/check-contract.mjs ; $LASTEXITCODE   # 期望 0
# 2 JSON 模式可被机器消费
node prototypes/_build/check-contract.mjs --json | ConvertFrom-Json | Select-Object -Expand stats
# 3 全部变异用例
node deliverables/73-plan/plan-p1a-mutation.mjs              # 期望 9/9
# 4 确认 README 没被改坏
node prototypes/_build/check-docs.mjs --quiet ; $LASTEXITCODE  # 期望 0
```

### 2.7 变异测试设计（可执行，已落地）

`deliverables/73-plan/plan-p1a-mutation.mjs` 用**镜像仓库**做，不碰真仓库一个字节：

```
deliverables/73-plan/_mut/p1a/
├── prototypes/_CONTRACT.md                 ← 真文件逐字节复制
├── prototypes/_build/check-contract.mjs    ← 真检查器逐字节复制
├── prototypes/Sxx-*/.inspect/report.json   ← 30 份真报告逐字节复制
└── tools/taste-skill/.../lib/rules.mjs     ← 真引擎逐字节复制
```

能这样做的原因：`check-contract.mjs:39` 的 `ROOT = new URL('../..', import.meta.url)`，把它放进镜像的 `prototypes/_build/` 后，它读的就是镜像里的契约与报告。

| # | 变异 | 期望 | 验的是什么 |
| --- | --- | --- | --- |
| 基线 | 无 | exit 0 | 干净仓库不假红 |
| M1a | §6 侧门加一行反引号规则 | exit 0 + 该规则进 C3 unused | 侧门可被观测 |
| M1b | M1a + 一条 `shadow` FAIL | **exit 0（记录缺陷）** | ★ 假绿存在 |
| M1c | M1b + 修解析器 | **exit 1** | ★ 同一变异翻转 ⇒ 修法真的起作用 |
| M2 | 删 §9.15 里 `palette-terracotta` 行 | exit 1 + `C1-fail-not-in-allowlist` | C1 不是恒真 |
| M3 | 规则名拼成 `palette-terracotta-typo` | exit 1 + `C2-allow-rule-not-in-engine` | C2 不是恒真 |
| M4 | 给干净案注入 `hairline` FAIL | exit 1 + `C1` | 新 FAIL 会被抓 |
| M5 | 删一份 report.json | 现状 exit 0 → **改后必须 exit 1** | ★ 缺口 |
| M6 | 把 report.json 写成非法 JSON | 现状 exit 0 → **改后必须 exit 1** | ★ 同一缺口 |

**当前实测：9/9 按"现状"通过**（其中 M1b/M5/M6 的"通过"= 确认了缺陷存在）。改动 A+B 落地后，M1b 应翻成 exit 1、M5/M6 应翻成 exit 1 —— 那时需要把脚本里这三条的 `expectCode` 从 0 改成 1。**这一步本身就是判据**：如果改完还在 exit 0，说明改动没生效。

---

## 3 P1b `report.json` 陈旧度

### 3.1 现状：**这个功能已经存在了**

`check-stale.mjs:40-61` 就是 P1b 要求的全部：

```js
for (const name of caseDirs(P)) {
  const rep = join(P, name, '.inspect', 'report.json');
  ...
  for (const f of CASE_SOURCES) {            // _entries.mjs:28 = ['index.html', 'style.css']
    const p = join(P, name, f);
    ... newest = Math.max(...)
  }
  const gapMin = (newest - at) / 60000;
  if (gapMin > 1) out.push({ id, dir: name, which, gapMin });   // :60
}
```

而打印时（`:193`）的命令拼装也正是 P1b 要求的：

```js
const cmd = s.render || `node prototypes/_build/render-scheme.mjs ${s.dir}`;
```

实测当前输出：

```
闸门陈旧度：检查 30 案 + 1 个产品入口
  ⚠️ 2 项陈旧（源文件比 report.json 新，说明改了没重渲染）：
     S08  style.css 落后 10025 分钟  →  node prototypes/_build/render-scheme.mjs S08-amber-overprint-lightbox
     选型台(_selection)  prompts.js 落后 313 分钟  →  node prototypes/_build/render-scheme.mjs _selection
EXIT=1
```

**所以 P1b 的真实交付不是"加一节"，而是三个决策**：阈值取多少、`.inspect/*.jpg` 纳不纳入、会不会一上线全红。

### 3.2 决策一：阈值 —— `gapMin > 1` 应升到 `gapMin > 3`

实测依据（`plan-probe-stale3.mjs`）：`inspect.mjs:61` 在**渲染开始**时写 `at`，`:171` 在整轮跑完才写 `report.json`。所以

```
report.json.mtime  −  report.at  =  这一轮渲染实际花了多久
```

30 案实测这个差值：**中位 0.7 分钟**，绝大多数 1 分钟，最长（S08）10032 分钟。

含义：阈值 1 分钟 **小于正常渲染耗时**。一次正常的渲染，只要页面跑超过 1 分钟，期间 `style.css` 被谁碰一下（编辑器保存、`git checkout`、另一个 Agent 写文件），就会在渲染"成功"之后立刻被判陈旧。这个仓库已经有过"同一目录两个施工者"的事故（`_CONTRACT.md` §9.1），不是假想。

**取 3 分钟**：＝ 中位渲染耗时的 4 倍余量，仍远小于"人改完文件去喝咖啡"的量级。实测在 1/2/3/5/10/60 全部阈值下都只红 S08 这一案，所以调这个常数**不会改变今天的结论**，只降低未来的假红率。

### 3.3 决策二：`.inspect/*.jpg` **纳入，但用另一个判据**

这是本节最重要的一条实测结论。三个候选判据（`plan-probe-stale2.mjs` / `stale3.mjs`）：

| 判据 | 定义 | 阈值 1 分时红几案 | 结论 |
| --- | --- | --- | --- |
| **A** | `max(jpg).mtime > report.json.mtime` | **0/30** | ✅ 采用 |
| **B** | `max(jpg).mtime > report.at` | **3/30**（S02/S08/S14） | ❌ **设计使然，不能用** |
| C | `max(src).mtime > report.at` | 1/30（S08） | 这是现有的那一节，保留 |

**为什么 B 是错的**：`inspect.mjs` 的写入顺序是
`L61 写 at` → `L87…L128 写 jpg` → `L171 写 report.json`。
对任何一次**成功的**渲染，**jpg 必然比 at 新**（差 0.4–0.9 分钟）。用 B 判陈旧 = 把每一次成功渲染都判成陈旧。实测 B 在阈值 0 时红 **30/30**，阈值 1 时红 3/30 —— 那 3 个不是缺陷，是渲染跑得久。

**为什么 A 是对的**：A 问的是"截图被人重跑过、但闸门报告没跟着重跑吗"。正常渲染下 jpg 一定比 report.json **旧**（report.json 最后写）；实测 30 案里 **29 案的 `jpg − reportM` 都是 −0.0**（同一次渲染，先 jpg 后 report）。唯一例外 S08 是 −1.8（并发渲染交错）。

**判定**：A 阈值 1 分 → **0/30 红**。所以纳入 A 不会全红，是安全的新增判据。

### 3.4 决策三：会不会一上线就全红 —— **不会，只红 1 案**

实测（30 案 + `_selection`，2026-10-31 02:15 快照）：

| 判据 | 会红的案 |
| --- | --- |
| C：`src > at`（现有） | **S08**（style.css 落后 10025 分）＋ `_selection`（prompts.js 落后 313 分） |
| B：`jpg > at` | S02 / S08 / S14（**假阳性**，见 3.3） |
| A：`jpg > reportM` | **0 案** |

**处置**：不重渲染全部 30 案（没必要，29 案都是新鲜的）。只需重渲染触发的 2 项：

```powershell
node prototypes/_build/render-scheme.mjs S08-amber-overprint-lightbox
node prototypes/_build/render-scheme.mjs _selection
```

⚠️ **重渲染 S08 有副作用**：S08 当前 `report.json` 的 `at` 是 `2026-10-23T19:03:46`，FAIL 是 `palette-terracotta` + `font-count`。重渲染会刷新 `at`，并可能改变 FAIL/WARN 集合（S08 的 style.css 落后了 7 天）。**重渲染后必须立刻跑 `check-contract.mjs`**，确认新的 FAIL 集合仍在 §9.15 允许表内 —— 否则 P1a 会在同一天翻红。这是 P1a 与 P1b 的**硬串行依赖**（见第 4 章）。

### 3.5 精确改动

文件：`prototypes/_build/check-stale.mjs`

#### 改动 D —— 阈值常数（`:58-60`）

**改前**
```js
    const gapMin = (newest - at) / 60000;
    // 1 分钟容差：同一次渲染里 html/css 与 report 的写入顺序会有秒级差
    if (gapMin > 1) out.push({ id: name.slice(0, 3), dir: name, which, gapMin: Math.round(gapMin) });
```

**改后**
```js
    const gapMin = (newest - at) / 60000;
    /* 容差 3 分钟（2026-10-31 由 1 改）。
     *
     * 为什么不是 1：`inspect.mjs:61` 在**渲染开始**时写 `at`，`:171` 才写 report.json。
     * 所以「report.json.mtime − at」就是这一轮渲染实际花了多久。
     * 30 案实测（deliverables/73-plan/plan-probe-stale3.mjs）：中位 0.7 分，多数 1 分。
     * 阈值 1 分 ≤ 正常渲染耗时 ⇒ 一次正常渲染中若有任何进程碰了 style.css
     * （编辑器保存 / git checkout / 并发的另一个施工者 —— 见 _CONTRACT.md §9.1），
     * 渲染"成功"之后会立刻被判陈旧。3 分 = 中位耗时的 4 倍余量。
     * 实测：1/2/3/5/10/60 全阈值下都只红 S08 一案 ⇒ 调这个常数不改变今天的结论。 */
    if (gapMin > 3) out.push({ id: name.slice(0, 3), dir: name, which, gapMin: Math.round(gapMin) });
```

#### 改动 E —— 新增判据 A（jpg 比 report.json 新），插入 `:61` 之后

**改前**（`:60-61` 之间无内容，直接进 `// ②`）
```js
    if (gapMin > 1) out.push({ id: name.slice(0, 3), dir: name, which, gapMin: Math.round(gapMin) });
  }
```

**改后**
```js
    if (gapMin > 3) out.push({ id: name.slice(0, 3), dir: name, which, gapMin: Math.round(gapMin) });

    /* 判据 A（2026-10-31 新增）：截图比闸门报告新 ⇒ 有人重跑过截图但没重跑闸门。
     *
     * ⚠️ 判据**不能**写成 `jpg.mtime > report.at`。
     * `inspect.mjs` 的写入顺序是：L61 写 at → L87…L128 写 jpg → L171 写 report.json。
     * 对任何一次成功渲染，jpg **必然**比 at 新（30 案实测 0.4–0.9 分）。
     * 实测那个判据在阈值 0 时红 30/30、阈值 1 时红 3/30 —— 全是假阳性。
     *
     * 正确的判据是「jpg > report.json 的落盘时刻」：
     * 正常渲染下 report.json 最后写，所以 jpg 一定更旧（实测 29/30 案是 −0.0）。
     * 只有"截图单独重跑过"才会翻成正。实测阈值 1 分 ⇒ 0/30 红，安全。 */
    let newestJpg = 0, jpgName = '';
    const insDir = join(P, name, '.inspect');
    if (existsSync(insDir)) {
      for (const f of readdirSync(insDir)) {
        if (!/\.jpe?g$/i.test(f)) continue;
        const m = statSync(join(insDir, f)).mtimeMs;
        if (m > newestJpg) { newestJpg = m; jpgName = f; }
      }
    }
    if (newestJpg) {
      const jpgGapMin = (newestJpg - statSync(rep).mtimeMs) / 60000;
      if (jpgGapMin > 1) {
        out.push({
          id: name.slice(0, 3) + '·截图', dir: name,
          which: jpgName, gapMin: Math.round(jpgGapMin),
        });
      }
    }
  }
```

#### 改动 F —— README 的「已知边界」补一句

文件：`README.md`（`check-stale` 那一行附近，`:174` 或 `:388` 的用法段）
说明「陈旧判据有两条：源文件 vs `report.at`、截图 vs `report.json.mtime`；后者**不是** `vs at`，理由是 `inspect.mjs` 的写入顺序」。

### 3.6 验证方法

```powershell
# 1 现在应当红 2 项（S08 / _selection）
node prototypes/_build/check-stale.mjs ; $LASTEXITCODE        # 期望 1，且输出含两条 render-scheme.mjs 命令

# 2 重渲染两项（注意：S08 有 7 天未渲染，见 3.4 的副作用）
node prototypes/_build/render-scheme.mjs S08-amber-overprint-lightbox
node prototypes/_build/render-scheme.mjs _selection

# 3 必须转绿
node prototypes/_build/check-stale.mjs ; $LASTEXITCODE        # 期望 0

# 4 重渲染后立刻复核契约（否则 P1a 可能当天翻红）
node prototypes/_build/check-contract.mjs ; $LASTEXITCODE     # 期望 0
```

### 3.7 变异测试设计

| # | 变异 | 期望 | 验的是什么 |
| --- | --- | --- | --- |
| S1 | `(Get-Item prototypes\S01-*\style.css).LastWriteTime = Get-Date` | exit 1，且输出点名 S01 + 给出 `render-scheme.mjs S01-…` | C 判据真的看 mtime |
| S2 | 同上，但把 `gapMin > 3` 改成 `> 99999` | exit 0 | **证明阈值在起作用，不是恒红** |
| S3 | 只 `touch` 一个 `.inspect/*.jpg`（不动源文件） | exit 1，项名含 `·截图` | 新增的 A 判据真的生效 |
| S4 | 把 A 判据改成 `> report.at` | 立刻红 30/30 | **反证** B 判据是错的（把这条写进注释，防止下一个人"顺手改回去"） |
| S5 | 删掉某案 `report.json` | 该案从 `findStale` 消失（`:43 continue`），**不报** | 记录现状：缺失 ≠ 陈旧，由 `check-contract` 的 C0 管 |

S2 与 S4 是这一组的关键：一个证明"阈值真的在生效"，一个证明"另一种写法是错的"。没有它们，新的 A 判据和旧的 1 分钟容差都只是"看起来在工作"。

---

## 4 P2 `fonts` 字段改名

### 4.1 现状：**已被并发 Agent 做掉 90%**

2026-10-31 02:2x，另一个 Agent 落地了改名。实测（`plan-probe-p2.mjs`）：

| 位置 | 状态 |
| --- | --- |
| `collect-schemes.mjs:364` | `fontsSpec: spec && spec.fields['字体策略'] …`　✅ 已改（`:351-363` 附了 14 行改名理由注释） |
| `data.js` 30 处 | `"fonts":` 命中 **0**，`"fontsSpec":` 命中 **30**　✅ |
| `app.js:239` | `r.fontsSpec \|\| r.fonts`　⚠️ 半改（带旧名兜底） |
| `app.js:1357` | `r.fontsSpec \|\| r.fonts`　⚠️ 半改 |
| `collect-schemes.mjs:732` | `miss((r) => r.fontsSpec)`　✅ |

**字节零损失已验证（对 `git HEAD` 逐案比，不是自己跟自己比）**：`plan-probe-p2b.mjs` 用同一套正则分别量 `git show HEAD:…/data.js` 与工作区：

```
HEAD  : "fonts":     30 处，合计 11232 字符，min=228 max=520
工作区 : "fontsSpec": 30 处，合计 11232 字符，min=228 max=520
工作区 : "fonts":      0 处
逐案（按出现顺序）长度不同的：无
⇒ 改名是纯符号搬家，未丢字节
```

（注：`plan-probe-fonts.mjs` 早先报的「合计 11192」量的是**反转义后的码点数**，`plan-probe-p2b.mjs` 量的是**原始匹配长度**；两个数各自自洽，做前后对比时只能用同一种度量 —— 这正是为什么必须回 `git HEAD` 取旧版重算。）

### 4.2 改动面实测（受跟踪文件，排除 `deliverables/`）

`plan-probe-fields.mjs` 扫 `git ls-files` 的 225 个 `.mjs/.js/.html/.css/.md`：

- **A 类：读 `data.js` 字符串字段** —— 名义上 34 处，但其中 **30 处是 `data.js` 自己的数据行**（生成物）。真正的**人手代码只有 4 处**：
  - `collect-schemes.mjs:364`（赋值，已改）
  - `collect-schemes.mjs:732`（自检表，已改）
  - `app.js:239`（搜索索引 `hay`）
  - `app.js:1357`（详情面板 `field('字体策略', …)`）
- **B 类：读 `prompts.js` 的 `dna.fonts` 对象** —— 18 处，**与本次改名完全无关**：
  - `prompt-copy.js:176-183`（`{display, body, mono}` 分支 + 数组兜底）
  - `prompt-copy.js:225-226`（`displayStack` / `bodyStack`）
  - `build-prompts.mjs:303/385`、`clean-dna.mjs:1491/1501/1502`
- **C 类：两者都碰** —— **0 处**。

**关键结论：改动面就只有 2 个真消费点，且都是"原样使用字符串"，不依赖字段名以外的语义。** 所以风险低，这一点可以放心。

### 4.3 但收益比想象的小 —— 这正是"最不值得做"的理由

改名想消灭的是「同名不同形状」的误读。实测这个误读的**实际发生地**是：

`prototypes/_selection/prompt-copy.js:157-183`

```js
/* 字体：**不再猜**。prompts.js 里的 dna.fonts 已经是 {display, body, mono} 三个结构化字段，
 * 旧实现按数组顺序「第一个非 mono 非 CJK 的族」当标题 —— 而 dna.fonts 的顺序是 …
 * 兼容：老版 prompts.js 里 fonts 还是数组，读到数组就退回旧的猜法，不至于白屏。 */
if (d.fonts && !Array.isArray(d.fonts) && (d.fonts.display || d.fonts.body)) { … }
else if (d.fonts && d.fonts.length) { … }          // ← 这一段：为"fonts 是数组"写的兼容分支
```

**这段代码读的是 `dna.fonts`（prompts.js），跟 `data.js` 一个字节的关系都没有。** 实测 `prompts.js` 的 `dna.fonts`：**对象 30/30、数组 0**（`plan-probe-p2b.mjs`）—— 也就是说**这段兼容分支是死代码，但它不会因为改名而消失**。

所以：
- 改名**真解决了**：读 `data.js` 的人不会再看到 `fonts` 而以为是对象。
- 改名**没解决**：真正被"同名不同形状"坑到的那段死代码还在原地。要清它得单独做（删 `prompt-copy.js:180-183` 的数组分支，并把 `:176` 的 `!Array.isArray` 守卫一起简化）。

**如果只能做一件事，做"删死分支"比"改名"收益更高** —— 但改名已经做完了，删分支的成本也因此降到 5 行。

### 4.4 精确改动（剩余部分）

#### 改动 G —— 删掉 `app.js` 两处旧名兜底

文件：`prototypes/_selection/app.js`

**`:239` 改前**
```js
      var hay = [r.id, r.cn, r.en, r.family, r.fontsSpec || r.fonts, r.def, r.tone, r.structure,
```
**`:239` 改后**
```js
      /* 2026-10-31：去掉 `|| r.fonts` 兜底。data.js 只产出 `fontsSpec`（30/30），
       * 旧名 `fonts` 已不存在。留着兜底 = 让"改名没做完"这件事永远静默可用，
       * 而 P2 的全部意义就是让这种混用变成**编译期就看得见**的错误。 */
      var hay = [r.id, r.cn, r.en, r.family, r.fontsSpec, r.def, r.tone, r.structure,
```

**`:1357` 改前**
```js
      field('字体策略', r.fontsSpec || r.fonts) +
```
**`:1357` 改后**
```js
      field('字体策略', r.fontsSpec) +
```

#### 改动 H —— `collect-schemes.mjs:735` 的注释同步（1 行）

原文写「它只查 def / family / fonts / layout / copy 五项」。`fonts` 已改名，注释里的字段名要改成 `fontsSpec`，否则下一个读注释的人会去 grep `fonts` 然后找不到。

**改前**
```js
   * 它只查 def / family / fonts / layout / copy 五项，赋值表里少一行时脚本照样打印「无」，
```
**改后**
```js
   * 它只查 def / family / fontsSpec / layout / copy 五项，赋值表里少一行时脚本照样打印「无」，
```

#### 改动 I（可选，收益最高，建议同批做）—— 删 `prompt-copy.js` 的死数组分支

文件：`prototypes/_selection/prompt-copy.js`　行：`176-183`
把 `!Array.isArray(d.fonts) && …` 与整个 `else if (… .length)` 数组分支删掉，只留对象分支。**风险**：若某天有人重建 `prompts.js` 且 `build-prompts.mjs` 退化回数组，这里会白屏。安全做法是保留一个**显式断言**而不是静默兜底：

```js
if (!d.fonts || Array.isArray(d.fonts)) {
  throw new Error('prompts.js 的 dna.fonts 必须是 {display, body, mono} 对象；' +
    '数组形态已废弃（build-prompts.mjs:303 保证这一点）。');
}
```

这样"退化"会立刻炸在明处，而不是悄悄地走旧猜法。

### 4.5 验证方法

```powershell
# 1 改名彻底性
node deliverables/73-plan/plan-probe-p2.mjs
#    期望：data.js "fonts": = 0；"fontsSpec": = 30；app.js r.fonts\b = 0

# 2 生成器可复现（--check 不写盘）
node prototypes/_build/collect-schemes.mjs --check
#    期望：控制台「缺 字体策略： 无」

# 3 数据链未被破坏
node prototypes/_build/check-twolines.mjs ; $LASTEXITCODE   # 期望 0
node prototypes/_build/check-docs.mjs --quiet ; $LASTEXITCODE  # 期望 0
node prototypes/_build/check-prompts.mjs --quiet ; $LASTEXITCODE # 期望 0

# 4 浏览器实证（唯一能证明 UI 没白屏的方法）
#    起本地静态服务后打开 prototypes/_selection/，搜「字体」或任一字体名（如 Gloock），
#    然后打开任一案的详情面板，确认「字体策略」一段有正文。
```

### 4.6 变异测试设计

| # | 变异 | 期望 | 验的是什么 |
| --- | --- | --- | --- |
| P1 | 把 `app.js:1357` 改回 `r.fonts`（旧名） | 详情面板「字体策略」一段应为空 → **但 exit 码不变**，`check-docs` 也不会红 | ⚠️ **记录缺口**：改名没有闸门看着。要补一条断言（见 P2 判据④） |
| P2 | 把 `collect-schemes.mjs:364` 的 `fontsSpec` 改回 `fonts` 并重跑生成器 | `plan-probe-p2.mjs` 显示 `"fonts":` = 30 | 探针能抓住回退 |
| P3 | 让 `collect-schemes.mjs` 不写 `fontsSpec`（模拟漏赋值） | `--check` 打印「缺 字体策略：S01 S02 …」全 30 案 | 自检表覆盖到这个字段 |
| P4 | 删掉 `data.js` 的 `fontsSpec` 键但保留 `app.js` 的兜底 | **UI 仍正常**（兜底读到 `undefined` 但 `field()` 对空值返回空串）| ★ 证明兜底不能防住任何东西，删它没有风险 |

P1 与 P4 一起说明：**兜底既保护不了什么，又掩盖了失败**。这是删它的充分理由。

**建议补的闸门**（1 处，低成本）：在 `check-twolines.mjs` 里加一条 `S1: data.js 的每个 rec 必须有非空 fontsSpec`，因为该脚本已经在读 `SCHEMES`（`:77`）。这是目前唯一能自动发现"改名没做完"的地方。

---

## 5 P3 30 案规格一致性抽查

### 5.1 现状：**九轮没做过，且比想象的难**

已有的事实：

- `_specs/Sxx.md` 是**修正前原文**，`_CONTRACT.md:133`（§8.1）明写：「不要照字段 3／4 直接建——那是修正前原文，先看 `_CURRENT-VALUES.md`」。
- `_CURRENT-VALUES.md` 是**唯一权威**。它的 §1 逐案表（L33-76）与 §2 旧值表（L84-112）是**几乎纯机械**的：一律 `#RRGGBB` 或明确的错误码字符串。
- `check-prompts.mjs` 已经在做一件相关的事（提示词里的配色/线宽/字号 vs `style.css`），但**它核的是"提示词对不对"，不是"页面符不符合规格"**。

### 5.2 第一类：机械可核 —— 实测能跑的有 5 条，但每条都要标注"解析不出"的案数

`plan-probe-p3.mjs`（对 `_CURRENT-VALUES.md`）与 `plan-probe-spec.mjs`（对 `_specs/Sxx.md` 字段 3/5）分别实测：

**（甲）来自 `_CURRENT-VALUES.md` —— 可核、直接可写**

| # | 判据 | 可判定 | 通过 | 失败 | 解析不出 |
| --- | --- | --- | --- | --- | --- |
| 1 | §1 声明的**背景** HEX 必须出现在案文件里 | 30/30 | 30 | 0 | 0 |
| 2 | §1 声明的**主色** HEX 必须出现在案文件里 | 30/30 | 30 | 0 | 0 |
| 3 | §1 声明的**按钮字色**必须出现在案文件里 | 13/30 | 12 | **1（S04）** | **17** |
| 4 | 错误码必须出现在 `index.html` 里 | 20/30 | 20 | 0 | **10** |
| 5 | §2 的**旧值零残留** | 11/30 | 7 | **4（假阳性，见下）** | **19** |

**判据 5 的 4 个失败全是假阳性，已实证。** `plan-probe-p3b.mjs` 剥离 CSS 注释后重测：S04 `#E8871E`、S10 `#F4F1EA`、S19 `#EDE6D4`、S28 `#1F5FA8` —— **四条全部消失**。它们都在 `style.css` 的头部注释里，而且是**正确地**写着"旧值已作废／不得出现"：

```
S04 style.css:3   --orange #96550F 主色（07 号审查把 #E8871E 压深以拿到 4.56:1；本页未再使用旧亮橙）
S10 style.css:5   无光泽纸 #F2EFE8 58%（背景；旧值 #F4F1EA 已作废）
S19 style.css:6   #E4DECD 标本卡纸（地面，唯一底色；旧值 #EDE6D4 已废，本页不出现）
S28 style.css:3   … Lead 已批准的单案换色（旧值 #1F5FA8 不得出现）。
```

**⇒ 判据 5 必须先剥注释（`css.replace(/\/\*[\s\S]*?\*\//g, '')`），否则 4/4 假红。** 这是本节第一个必须写进代码的细节，也是"机械可核"最容易翻车的地方：`check-prompts.mjs:84` 已经有 `stripCssComments`，照抄即可。

**判据 3 的 S04 是唯一真失败，且已定位到根因：**

```
规格（_CURRENT-VALUES.md §1 S04 行）：按钮字色 **白字 `#FFFFFF`**（5.83:1）
实现（S04 style.css .btn）：background:var(--orange); color:var(--paper);
     :root  --paper:#F0E2C8
实测对比度： #F0E2C8 on #96550F = 4.56:1   （仍过 AA，但 ≠ 声明的 5.83:1）
```

这是"规格说 A、实现是 B"的真偏离，属于机械可核，且**不影响可访问性**（4.56 ≥ 4.5）。所以它应该是 **WARN 而不是 FAIL** —— 判据要按"声明的值没出现"报，但级别要给人工裁决留口。

**（乙）来自 `_specs/Sxx.md` 字段 5 —— 可核，但覆盖率只有 30%**

| 判据 | 可判定 | 结论 |
| --- | --- | --- |
| 规格栏数 ∈ CSS `repeat(N)` 集合 | **6/30** | 命中 4/6（S13/S27/S28/S30 命中；S01 规格 4 vs CSS `[3]`、S02 规格 2 vs `[4,6]` 不一致） |
| 规格栏沟出现在 CSS `gap` 里 | 14/30 | 未逐一核 |
| 基线值出现在 CSS 里 | 25/30 | 未逐一核 |
| 字段 3 声明「面积和 100」 | **29/30**（S11 缺） | — |
| 字段 3 唯一 hex 恰为 4 个 | **0/30** | ❌ 这条判据本身不成立，弃用 |

**⇒ 字段 5 的「栏数」判据覆盖率只有 6/30，不能作为主判据。** 原因（`plan-probe-spec2.mjs` 打了 30 案字段 5 的开头 100 字）：写法有五种

```
S01  四栏，栏宽比 5:4:4:3…            （中文数字）
S03  纵向年代轴占左侧 3 栏…列数 12      （先描述结构，后给总数）
S05  以 8px 为一个像素单元，12 列 × 8px （列 vs 栏）
S14  基线 8px，不使用固定栏数…          （明确声明不用栏）
S16  基线 8px，不使用正交栏…            （同上）
```

所以「规格说 12 栏，CSS 里是否真是 `repeat(12,…)`」这个原始设想，**只在 6 个案上可判定**，且在 S01/S02 上会给出"不一致"的结论 —— 而那两案的规格本来就不是"12 栏"（S01 是"四栏，栏宽比 5:4:4:3"，用 `grid-template-columns` 的 `fr` 比例实现，压根不该出现 `repeat(4)`）。

**结论：字段 5 的机械判据必须收窄成"若规格明写 `列数 N`／`N 栏栅格`，则 CSS 里必须出现 `repeat(N`"。** 按这个更严的口径，可判定案数会降到个位数 —— 但**不会产生假红**。宁可只核 6 个案都核对，也不要核 30 个案红 24 个假红。

### 5.3 第二类：纯审美 —— 明确不做机器判定

以下**不做**机器判定，只做人工抽查清单（每案 3 分钟，抽 6 案，覆盖三个区间各 2 案）：

| 抽什么 | 怎么判 | 为什么不能机器判 |
| --- | --- | --- |
| 「调性是否成立」（字段 12 那一栏的 `调性`） | 打开页面 3 秒，问：如果只看到这一屏，你会用规格里那两个词形容它吗 | 这是设计判断，不是属性比对 |
| 「去 AI 味审查点」那 3 条是否真的反了 | 逐条读字段 8 的 `它故意反 C-x.y`，去页面上找那个机制的实物 | 规格里写的是**论证**，不是可测属性 |
| 「设计师签名式怪癖」是否真的无功能 | 确认那个元素不参与点击、不进 tab 序、无 aria | 可部分机器核（`tabindex`/`aria`），但"它是否成立为怪癖"是判断 |
| 首屏是否有一个主导物 | 肉眼：3 秒内视线落在哪 | `focal-point` 规则已经查了尺寸/占比，但"主导"是感知 |

**为什么坚持不做**：本仓库已经有 §9.11 的教训（「验收时不要只看闸门」）和 §9.19（「量错对象」）。给审美判断装一个自动打分器，产出的会是"看起来有闸门、实际是随机数"的东西 —— 比没有更糟。

### 5.4 精确改动

#### 新文件 —— `prototypes/_build/check-spec.mjs`（约 260 行）

结构（照 `check-twolines.mjs` 的骨架）：

```js
// 规格一致性闸门：30 案是否符合 _CURRENT-VALUES.md（唯一权威）
//
// 为什么需要它
// ────────────
// 前九轮全在修数据链（collect-schemes → data.js → prompts.js），
// **没有一轮系统核过"30 个页面是否真的符合各自规格"**。
// check-prompts.mjs 核的是「提示词 vs CSS」，方向相反：
// 它保证 AI 拿到的描述是真的，不保证页面对得上规格。
//
// 权威来源不是 _specs/Sxx.md（契约 §8.1：那是修正前原文），
// 而是 _specs/_CURRENT-VALUES.md §1（当前有效值）与 §2（被替换掉的旧值）。
//
// 刻意**不查**的（见 §5.3）：调性、去 AI 味审查点、签名式怪癖。
// 那三项是审美判断，机器判不了；给它们装自动打分器只会产出"看起来有闸门"的假象。
//
// 用法：
//   node prototypes/_build/check-spec.mjs [--quiet] [--json]
//   退出码 0 = 无 FAIL；1 = 有 FAIL
```

八条判据（每条都必须同时打印**可判定数**与**解析不出数**）：

```js
const RULES = [
  { id: 'S1-bg-in-files',      level: 'FAIL', src: §1, col: '背景' },
  { id: 'S2-primary-in-files', level: 'FAIL', src: §1, col: '主色' },
  { id: 'S3-button-text',      level: 'WARN', src: §1, col: '按钮字色' },   // S04 实测偏离
  { id: 'S4-error-code',       level: 'FAIL', src: §1+§4, col: '错误码' },
  { id: 'S5-old-value-gone',   level: 'FAIL', src: §2, stripComments: true },
  { id: 'S6-spec-cols',        level: 'WARN', src: _specs 字段5, 仅「列数 N」/「N 栏栅格」写法 },
  { id: 'S7-fonts-role',       level: 'FAIL', src: §1 字体修正列 + CSS @font-face },
  { id: 'S8-coverage',         level: 'FAIL', 断言「可判定 + 解析不出 = 30」对每条都成立 },
];
```

**S8 是这一节的核心防假绿装置**：如果某天解析器坏了、`§1` 一行都抽不出来，前 7 条会全部"通过"（0 个可判定 ⇒ 0 个失败）。S8 让这种"全绿"立刻变成 FAIL。

#### 三个必须写进代码的细节

1. **剥 CSS 注释**（否则判据 5 有 4/4 假红）。直接复用 `check-prompts.mjs:84` 的 `stripCssComments`。
2. **`_CURRENT-VALUES.md §2` 只覆盖 11/30 案**（实测）。剩下 19 案**没有任何"旧值"记录**，所以判据 5 的可判定数只有 11。这是数据本身的缺口，不是检查器的缺口 —— 检查器要把 19 案显式列进"解析不出"并**在输出里说明原因**（"§2 表里没有该案行"），而不是静默跳过。
3. **错误码有第二个权威源**：`_CURRENT-VALUES.md §4`（L133-151）是「Lead 补入的 S21–S30 错误码（源文件缺失）」。判据 4 对 S21–S30 必须从 §4 取，不能从 §1 取（§1 那 10 行写的是"见规格"，而规格里根本没有）。

#### 不改的东西

- **不改任何 `prototypes/Sxx-*/`**：本计划全程只读。
- **不改 `_specs/`**：`_CURRENT-VALUES.md` 的 19 案缺口是数据问题，要单独一轮补，不在 P3 范围。

### 5.5 验证方法

```powershell
# 1 首轮基线（期望：S04 按钮字色 1 条 WARN；其余 0 FAIL）
node prototypes/_build/check-spec.mjs ; $LASTEXITCODE

# 2 覆盖率恒等式（每条判据都必须满足）
node prototypes/_build/check-spec.mjs --json |
  ConvertFrom-Json | Select-Object -Expand findings |
  Group-Object rule | Select-Object Name,Count

# 3 与既有闸门交叉：背景/主色两判据应当与 check-prompts 的配色段结论一致
node prototypes/_build/check-prompts.mjs --quiet

# 4 确认没碰原型
git status --porcelain prototypes/S*
```

### 5.6 变异测试设计

| # | 变异 | 期望 | 验的是什么 |
| --- | --- | --- | --- |
| T1 | 把 `S01/style.css` 的 `--paper` 改成 `#000000` | S1-bg 红 | 判据 1 不是恒真 |
| T2 | 把 `S01/index.html` 里的错误码 `P-03` 改成 `P-99` | S4 红 | 判据 4 真的在查 |
| T3 | 往 `S10/style.css` 的**代码段**（非注释）加 `#F4F1EA` | S5 红 | 剥注释后仍能抓真残留 |
| T4 | 往 `S10/style.css` 的**注释**里加 `#F4F1EA` | **不红** | ★ 证明剥注释生效（当前 4 条假阳性的根因） |
| T5 | 把 `_CURRENT-VALUES.md §1` 的整张表删掉 | **S8-coverage 必须红** | ★ 防"解析器坏了 ⇒ 全绿" |
| T6 | 把 `S04/style.css` 的 `.btn{color:var(--paper)}` 改成 `color:#FFFFFF` | S3 转绿 | 证明这条判据是可修的，不是永红 |

T4 与 T5 是这一组的关键。T4 证明"剥注释"不是可选项；T5 证明"覆盖率恒等式"能挡住最危险的那种绿。

---

## 6 执行顺序与依赖

```
                    ┌─────────────────────────────────────────┐
P1a（修 check-contract）│ 独立，可任意时刻做                      │
                    └─────────────────────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              P1b（阈值 + jpg 判据）      P2（删兜底）
                        │                       │
                        ▼                       │
        ┌───────────────────────────────┐       │
        │ 重渲染 S08 + _selection       │       │
        │ → 必须回头跑 check-contract   │◄──────┘  （P2 与 P1b 无依赖，可并行）
        └───────────────────────────────┘
                        │
                        ▼
              P3（新 check-spec.mjs）—— 必须最后，因为它要读稳定后的 report.json
```

### 6.1 必须串行的三处

1. **P1b 的重渲染 → P1a 的复跑**（硬依赖）。
   S08 的 `style.css` 落后 7 天，重渲染会刷新 FAIL 集合。若新的 FAIL 里出现 §9.15 之外的规则，P1a 会在当天翻红。
   **判据**：`render-scheme.mjs S08-…` 之后**必须**立刻 `check-contract.mjs`，exit 0 才能继续。

2. **P2 的改名 → P3 的判据 7（`S7-fonts-role`）**（软依赖）。
   P3 要核「§1 声明的字体修正是否真的落在 CSS 的 `@font-face` 里」，它读的是 `style.css`，不读 `data.js`。所以严格说不依赖 P2。但如果 P2 的兜底没删干净，调试 P3 时会被"字段名有两个"干扰。**建议 P2 先收尾。**

3. **P3 必须在 P1b 之后**（读稳定快照）。
   P3 的核心是"页面是否符合规格"，它要读 `report.json` 的 FAIL 做交叉。P1b 重渲染期间 `report.json` 正在变，此时跑 P3 会拿到半新半旧的快照。

### 6.2 可以并行的两处

- **P1a 与 P1b 的代码改动**完全独立：一个在 `check-contract.mjs`，一个在 `check-stale.mjs`，不共享文件。
- **P2 与 P1a/P1b** 完全独立：P2 只碰 `app.js` / `collect-schemes.mjs` / `data.js`。

### 6.3 建议的落地顺序（含时间估）

| 步 | 动作 | 估时 | 前置 |
| --- | --- | --- | --- |
| 1 | P1a 改动 A（切片起点）+ 改动 B（WARN→FAIL） | 20 分 | 无 |
| 2 | 跑 `plan-p1a-mutation.mjs`，把 M1b/M5/M6 的 `expectCode` 从 0 改成 1，确认 9/9 | 15 分 | 1 |
| 3 | P1a 改动 C（README 登记）+ 跑 `check-docs` | 10 分 | 2 |
| 4 | P1b 改动 D（阈值 3 分）+ 改动 E（jpg 判据 A）| 30 分 | 无（可与 1-3 并行） |
| 5 | P2 改动 G（删两处兜底）+ 改动 H（注释）| 10 分 | 无（可并行） |
| 6 | **重渲染 S08 + `_selection`**，立刻复跑 `check-contract` + `check-stale` + `check-docs` | 10 分 + 渲染耗时 | 3、4 |
| 7 | P3 新建 `check-spec.mjs` + 首轮基线 | 3 小时 | 6 |
| 8 | P3 变异 T1–T6 | 1 小时 | 7 |
| 9 | P2 改动 I（删死数组分支，可选）| 20 分 | 5、6 |

**总计约 5.5 小时**，其中 P3 占 4 小时。若时间不够，**先做完 1-6（约 1.5 小时）**，那四步把「契约、陈旧、改名」三条闸门收口，P3 可以留到下一轮。

---

## 7 最可能翻车的地方（7 条，按概率排序）

### 7.1 并发施工 —— 本计划撰写期间就已经发生

**现象（实测）**：开工时 tracked 改动 **0**。写计划过程中，`check-contract.mjs` 从无到有（02:12）、`fonts→fontsSpec` 改名落地（02:2x）、S08 与 `_selection` 的 `.inspect/` 被重渲染（02:13）。收尾时 tracked 改动 **9**，全部不是本 Agent 造成的。

**为什么危险**：`_CONTRACT.md` §9.1 记的就是这个 ——「一个方案目录只能有一个写入者」。而 P1b 的重渲染恰好是最容易被两个 Agent 同时触发的动作。

**怎么防**：
- 动手前先 `git status --porcelain | Where-Object { $_ -notmatch '^\?\?' }` 记基线，收工再记一次，差值必须能逐条解释。
- 重渲染前先看 `.inspect/report.json` 的 mtime，**比自己的会话开始时间新就停手**（说明别人刚渲染过）。
- P1b 的重渲染建议放在**其他 Agent 收工后**做，或先 `git stash list` 确认没有在途改动。

### 7.2 P1b 的 jpg 判据写错方向 —— 会 30/30 全红

这是本计划里最容易犯且最容易"看起来对"的错。

**错的写法**：`jpg.mtime > report.at`（直觉上"截图比报告时刻新就是陈旧"）。
**为什么错**：`inspect.mjs` 的写入顺序是 `at(L61)` → `jpg(L87-128)` → `report.json(L171)`。**成功的渲染必然让 jpg 比 at 新。**
**实测**：阈值 0 → 红 30/30；阈值 1 → 红 3/30（全是假阳性）。

**怎么防**：用 `jpg.mtime > report.json.mtime`（判据 A），实测 0/30 红。并在代码里写死这段注释 + 变异 S4（把阈值改成 `> at` 必须立刻 30/30 红，作为反证）。

### 7.3 P3 的假绿 —— "解析不出"被读成"合规"

`plan-probe-p3.mjs` 的实测把这件事摊开了：

```
错误码判据：可判定 20/30，通过 20 —— 看起来完美
但**解析不出 10 案**（S21–S30 的 §1 那格写的是"见规格"，而规格里根本没有）
```

如果检查器只打印"通过 20/20"，读者会以为 30 案都合规。**实际有 10 案从未被检查过。**

**怎么防**：
- 每条判据的输出格式强制三列：`可判定 / 通过 / 解析不出`，并断言 `可判定 + 解析不出 === 30`（P3 的 S8-coverage）。
- 变异 T5：删掉 `_CURRENT-VALUES.md §1` 整张表 → **必须立刻红**。若还绿，说明覆盖率恒等式没生效。

### 7.4 P3 的假红 —— 旧值命中全在注释里

实测 4/4 假阳性（S04/S10/S19/S28），全在 `style.css` 头部注释里，而且**是正确地写着"旧值已作废"**。不剥注释就上线，首轮会报 4 条假 FAIL，而这四条恰好是"作者做得最对的地方"（他主动标注了旧值）。

**这类假红的代价特别高**：读者会开始不信整份输出。`check-anchors.mjs:40-44` 记过一次同类的自伤（"检查器自己说谎比漏报更伤"）。

**怎么防**：`stripCssComments` 必须在判据 5 之前；变异 T3/T4 成对（代码段命中要红、注释段命中不能红）。

### 7.5 P1a 的 C0 升级会立刻让仓库变红

改动 B 把「报告缺失/损坏」从 WARN 升 FAIL。当前 30 案都有 `report.json`，所以**今天不会立刻红**。但它会与 P1b 的重渲染互动：渲染中途（`inspect.mjs` 已 `unlink` 旧 jpg、尚未写新 report）若有人跑 `check-contract`，会看到一份**缺失或半写**的 report → 立即 FAIL。

**这不是 bug，是正确行为**（那一刻确实无法判定）。但**会让"渲染 + 检查"并行的人困惑**。

**怎么防**：文档里写清「渲染期间不要跑契约闸门」；或者给 C0 加一个"报告 mtime 在 5 分钟内"的豁免（不推荐 —— 那又会变成 §9.19 那类假绿）。

### 7.6 P2 的兜底删掉后，`field()` 对 undefined 静默返回空串

`app.js:1357` 的 `field('字体策略', r.fontsSpec)`，若 `fontsSpec` 是 undefined，`field()` 返回**空串**（已在 `:1347-1368` 的用法里确认：它对空值不渲染、不留空标题）。所以**改名没做完也不会红、不会报错、只是那一段消失**。

**今天不危险**（`data.js` 30/30 都有 `fontsSpec`），但它是"静默失败"的典型形状。

**怎么防**：在 `check-twolines.mjs` 里补一条 `S1`（该脚本已在读 `SCHEMES`）：`data.js 的每个 rec 必须有非空 fontsSpec`。这是目前唯一能自动发现"改名没做完"的地方。

### 7.7 P3 的判据 3（按钮字色）只有 13/30 可判定

`_CURRENT-VALUES.md §1` 的按钮字色列，17 案写的是"见规格"。而"见规格"在多数案的规格文本里**根本不是一句可解析的话**（要读完整段文案才知道按哪个色）。

**所以这条判据的覆盖只有 13/30，且会长期保持这个数。** 若有人为了"提高覆盖率"去猜，就会开始产生假红/假绿。

**怎么防**：把这 17 案显式列成一份"待人工核"清单（放进 `check-spec.mjs` 的输出里，每次跑都打印），而不是想办法"解析出来"。宁可承认覆盖不到，也不要猜。

---

## 8 附录：本计划用到的探针

全部在 `deliverables/73-plan/`，全部只读，全部可重跑：

| 文件 | 作用 | 关键输出 |
| --- | --- | --- |
| `LEAD-contract-check.mjs` | 前置探针（已存在，非本 Agent 写） | §9.15 解析 5 条、S08 2 条 FAIL 全在表内 |
| `plan-probe-p1a.mjs` | 钉死 `parseAllowTable` 的切片偏移与 C0 级别 | 朴素切片多吃 84 行；注入 `shadow` 后朴素吃进、修正不吃 |
| `plan-p1a-mutation.mjs` | **P1a 的变异测试，可执行** | 9/9；M1b（假绿）与 M1c（修好翻转）成对 |
| `plan-probe-stale.mjs` | 陈旧度分布 + §9.15 切片边界 | 0/30 源文件比 report 新（02:13 快照）；阈值 1–1440 全红 0 |
| `plan-probe-stale2.mjs` | 三个 jpg 判据的差值 | A=0/30、B=30/30（阈值 0）、C=1/30 |
| `plan-probe-stale3.mjs` | 判据 A/B/C + 单轮渲染耗时 | 渲染耗时中位 0.7 分 ⇒ 1 分钟容差偏小 |
| `plan-probe-fonts.mjs` | `data.js` 的 `fonts` 长度 + 消费点 | 30 处，反转义后 min 228 / max 514 |
| `plan-probe-p2b.mjs` | **对 `git HEAD` 的改名前后逐案对比** | 30 处 / 合计 11232 / min 228 max 520，**前后全同**；`dna.fonts` 对象 30、数组 0 |
| `plan-probe-fields.mjs` | 受跟踪文件的全部消费点（225 文件） | A 类真消费点 4 处、B 类 18 处、C 类 0 处 |
| `plan-probe-p2.mjs` | 改名**当前状态**（并发 Agent 落地后） | `"fonts":`=0 / `"fontsSpec":`=30 / 合计 11232 字符 |
| `plan-probe-spec.mjs` | 字段 5/3 的机械可核性 | 栏数可解析 9/30，可比 6/30，命中 4/6 |
| `plan-probe-spec2.mjs` | 字段 5 开头 100 字 + 字段 3 的 `面积和100` | 29/30 有「面积和 100」；唯一 hex 恰 4 个 = 0/30 |
| `plan-probe-p3.mjs` | 对 `_CURRENT-VALUES.md` 的五条判据 | 背景 30/30、主色 30/30、按钮字色 13/30、错误码 20/30、旧值 11/30 |
| `plan-probe-p3b.mjs` | 4 条旧值假阳性的根因 + S04 按钮字色 | 剥注释后 4/4 消失；S04 实测 4.56:1 vs 声明 5.83:1 |

**纪律声明**：本 Agent 全程只读 `prototypes/` `templates/` `tools/` `README*`，未修改任何已跟踪文件。
开工 tracked 改动数 **0**，收尾 tracked 改动数 **0**（`git status --porcelain` 中 `prototypes/` 下的 9 处改动全部由并发 Agent 在 02:12–02:28 之间产生，本 Agent 期间只增不减、逐条可解释）。
