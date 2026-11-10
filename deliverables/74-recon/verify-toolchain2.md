# 工具链 6 条主张的独立复核（第二轮）

复核者：独立验证 agent（不复用工具链 agent 的结论）
仓库：D:/Web/style　HEAD：0432753
方法：**只读源码**（Read / Grep / Glob / 少量 git show）。未执行 `prototypes/_build/` 或 `_prompts/` 下任何脚本，未起浏览器，未跑 CDP/playwright。

---

## T1 — `render-scheme.mjs` 失败即毁灭：**PARTLY TRUE（危害成立，措辞两处过强）**

### a) `--out` 的构造与外部引擎的调用

`prototypes/_build/render-scheme.mjs:42`
```js
const outRel = `prototypes/${name}/.inspect`;
```
`prototypes/_build/render-scheme.mjs:43-45`
```js
const r = spawnSync(process.execPath, [
  INSPECT, `prototypes/${name}/index.html`, '--out', outRel, '--widths', '1440,768,390', '--json', ...extra,
], { cwd: ROOT, stdio: 'inherit' });
```
引擎路径写死在 `render-scheme.mjs:19`：`tools/taste-skill/skills/taste-skill/scripts/inspect.mjs`。

### b) 引擎里清目录的位置 —— 在启动浏览器**之前**

`tools/taste-skill/skills/taste-skill/scripts/inspect.mjs:56-59`
```js
mkdirSync(outDir, { recursive: true });
// Screenshots from an earlier run would sit beside the new ones when the page got shorter.
for (const f of readdirSync(outDir)) if (/^(desktop|tablet|mobile)-(fold|page-\d+)\.jpg$/.test(f)) unlinkSync(join(outDir, f));
const browser = await Browser.launch();
```
删除在 L58，`Browser.launch()` 在 L59。`report.json` **不删**（只在 L171 `writeFileSync(join(outDir, 'report.json'), …)` 覆写，而 L171 在整段 try 之后）。

### c) Chrome 启动超时

`tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs:61`
```js
const t = setTimeout(() => reject(new Error('Chrome did not start within 20s')), 20000);
```
另有 `cdp.mjs:67` 的 `proc.on('exit', …)` 早退分支；找不到浏览器则 `cdp.mjs:47` 直接抛。单条 CDP 命令超时是 `cdp.mjs:90`（30000 ms）。

### d) 判定

Chrome 起不来时的**确切终态**：
- `.inspect/` 里所有匹配 `(desktop|tablet|mobile)-(fold|page-N).jpg` 的截图**已被删除**；
- `report.json` **原封不动**（旧的那份，其 `images[].fold/pages` 仍指向这些已不存在的文件）；若本来没有报告，则连报告也没有；
- 子进程以未捕获异常退出，`status=1`，但 `r.error`/`r.signal` 均为空 ⇒ `render-scheme.mjs:51` 的守卫**不触发**；`render-scheme.mjs:57` 因旧 report 仍在而通过；`render-scheme.mjs:58-61` 因逐字节相同命中 **exit 6**，并打印「声称成功但没写报告，判为失败」。

所以「把失败静默当成功」这一层**不存在**（`render-scheme` 已有指纹守卫，L38-40 与 L58）。但「截图已被删除」这一层**完全成立**。

两处措辞需要收紧：
1. 不是「clears the output directory」——只清**截图的 jpg 白名单**，不删 `report.json`，也不清目录（`inspect.mjs:58` 的正则）。
2. 不是「report.json is stale 且无人知晓」——`render-scheme` 会以 exit 6 明确报出这次渲染失败。受害者是**证据文件**，不是退出码。

**更严重的连带后果（原主张没提到，复核补出）**：删除发生后这个状态**没有任何检查器看得见**——
- `verify-prototype.mjs:134-137` 只检查 `report.json` 里 `images[].fold` 字段**存在**，不 stat 文件；
- `check-stale.mjs:90-93` 的截图同步检查是 `if (jpgs.length) { … }`，**截图全被删时 `jpgs.length === 0`，整段检查静默跳过**。

即：一次 Chrome 启动失败 → 30 案的截图证据被删 → `verify-prototype` 仍判达标、`check-stale` 仍报「全部新鲜」。这是 `_entries.mjs:18` 自己写下的那类「检查看不见它」。

**最小安全修复**（按侵入度递增）：
1. 把 `inspect.mjs:57-58` 的清图循环**移到 `Browser.launch()` 成功之后**（该循环的用途只是「页面变短时旧截图会并列」，只有渲染真的开始才需要），一行移动即可；
2. 更稳：渲染到 `.inspect.tmp/`，`report.json` 写完之后整体 rename 覆盖 `.inspect/`（原子替换，报告与截图永不脱节）；
3. 顺带补一条守卫：`verify-prototype` 对 `images[]` 里的每个路径 `existsSync`，缺失即算 problem；`check-stale` 把 `jpgs.length === 0` 而 report 声明有图的情形报为缺陷（现在它被 `if (jpgs.length)` 吞掉）。

**可恢复性**：S01/S08 等案的 `.inspect/*.jpg` 与 `report.json` 都在版本库里（`git show HEAD:prototypes/S08-…/.inspect/` 逐个可列，共 11 个文件），所以「删掉的是已跟踪文件」可用 `git checkout -- prototypes/<name>/.inspect` 复原；真正不可恢复的是**当轮新生成、尚未提交的**截图。

---

## T2 — `verify-prototype.mjs` 不查 §9.15 允许表 ⇒ 永久 exit 1：**PARTLY TRUE（事实全对，定性错）**

### a) 它读什么

`verify-prototype.mjs:9-10` 只 import `readFileSync, existsSync, readdirSync, statSync` 与 `join`；
全文（L1-179）**没有任何** `_CONTRACT`、`9.15`、`allow` 字样（在 `prototypes/_build/` 内 grep `_CONTRACT|9\.15|allow-table` 只命中 `assign-assets.mjs`、`check-contract.mjs`、`check-texture.mjs`）。
它读 `report.json` 的方式在 `verify-prototype.mjs:109-118`：
```js
const fails = (j.findings || []).filter((f) => f.level === 'FAIL');
…
if (fails.length) out.problems.push(`闸门 FAIL=${fails.length}：${out.failIds.join(' ')}`);
```
`j.allow` 字段**从不读取**。

### b) S08 的报告

`prototypes/S08-amber-overprint-lightbox/.inspect/report.json:3` `"at": "2026-10-30T18:26:37.942Z"`，`:4` `"allow": []`（空——因为渲染时没传 `--allow`）。
`:1190` 起 findings 共 4 条：
- `FAIL palette-terracotta`（:1192-1195，`button #c46a1f`）
- `FAIL font-count`（:1203-1206，`4 typefaces … Source Serif 4, Noto Serif SC, Overprint Numerals, Gloock`）
- `WARN no-footage`（:1214）
- `WARN card-rows`（:1221，390px）

`allow: []` 说明「豁免」在报告里根本没被记录——豁免是**契约层**的概念，不是报告层。

### c) §9.15 允许表

`prototypes/_CONTRACT.md:194` 「**9.15 四条对中文站结构性不利的规则**」，表格 `:195-201` 列了 `mono` / `font-count`(:198) / `font-fallback`(:199) / `measure`(:200) / **`palette-terracotta`(:201)**。
`:201` 明写这是 2026-10-24 Lead 补登记的行，且「此前 README 与已知缺口长期写『S08 琥珀是已知豁免』，而 §9.15 从来没有这一行」。
`:124`（§7 完成判据第 2 条）是仲裁句：「**`FAIL = 0`，或 FAIL 集合 ⊆ §9.15 允许表 ∪ 逐案批准记录**，且每条在交付说明里有一条引到文件行号的豁免理由」。

⇒ `palette-terracotta` 与 `font-count` **确实都在表内**，S08 的两条 FAIL 按契约是豁免的。主张 (c) 成立。

（一处形式瑕疵，不影响本判定：`_CONTRACT.md:117` 把 S08 的四个角色钉为 `Gloock / Source Serif 4 / IBM Plex Mono / 京华老宋体`，而报告实测是 `Gloock / Source Serif 4 / Noto Serif SC / Overprint Numerals`。仍是 4 个不同族，但**实现用的族与规格点名的族不是同一组**；§9.15 的豁免前提「四角色确为四个不同族」形式上成立，实质上是一次未经登记的替换。）

### d) 永久失败 vs 目前就是红的 —— 必须分开

**不是「design failure」，是「两个问题被同一个退出码回答」。**

- `verify-prototype.mjs` 问的是「**FAIL = 0** 的案有几个」，口径**有意**固定为 30 案（`verify-prototype.mjs:143-158` 那整段注释：并入 `_selection` 会让 `达标 26/不达标 5/共 31` 撞碎 README 的 26/30 硬断言）。它答：29/30。README `:160` 「**29 个闸门 FAIL=0**」、`:425` 「从 26/30 升到 29/30」与它**完全一致**。所以 exit 1 是**它测的东西如实红着**，不是判据坏了。
- 问「FAIL ⊆ 允许表」（§7.2 / `:124`）的是**另一个脚本**：`prototypes/_build/check-contract.mjs:1` 「契约一致性闸门：FAIL 集合 ⊆ §9.15 允许表」，`:132` `parseAllowTable(...)`，`:191-203` 逐条 FAIL 判是否在表内，`:490` `process.exit(FAILS.length ? 1 : 0)`。S08 那两条正好命中 `stats.failAllowed`。

⇒ 主张里「never consults the allow-table」= **CONFIRMED**；「exit code is PERMANENTLY 1」= **CONFIRMED**（只要 S08 的 2 条 FAIL 在，且 README 也承认 29/30）；但「因此是设计失败 / 是缺陷」= **FALSE**：允许表的职责已被 `check-contract.mjs` C1 覆盖，且 README 的 29/30 陈述与 `verify-prototype` 的 exit 1 是**同一件事的两种表述**。

唯一的真实风险是**工程卫生**：若把 `verify-prototype --all` 直接接进 CI，红灯是**永久**的（29/30 永远不满），而它并不代表有未登记缺陷。仓库目前没有 CI 配置（无 `.github/`、无 `package.json`），所以尚未发生。修法不是让它读允许表（那会破坏它与 README 的对齐），而是 CI 里改用 `check-contract.mjs` 判「FAIL ⊆ 表」，把 `verify-prototype` 只当信息输出。

---

## T3 — `_entries.mjs` 把生成的 `prompts.js` 当 SOURCE：**CONFIRMED（自指缺陷成立）**

### a) 原文（L40-67）

`prototypes/_build/_entries.mjs:43-70`
```js
export const PRODUCTS = [
  {
    dir: '_selection',
    label: '选型台',
    sources: [
      'index.html', 'style.css', 'app.js',
      'prompt-copy.js', 'prompts.js',
      /* `data.js` 不列 —— 它是 `collect-schemes.mjs` 的**产物**（从 `_specs/*.md` 生成），
         不是源。列进来会造成一个死循环式的误报：
           跑 collect-schemes → data.js mtime 变新 → check-stale 报「data.js 落后 N 分钟」
           → 跑 render-scheme _selection → report.at 更新 → 转绿
         但真正的问题（`_specs/*.md` 改了、data.js 没重生成）反而查不到，…
         2026-10-29 实测：刷新 data.js 后立刻报「落后 724 分钟」，而那份 data.js 是刚写的。 */
      'wizard.html', 'wizard.css', 'wizard.js',
      /* `self-gate.js` 不列：它和 report.json 由同一次 render-scheme 生成，…
         它是产物，不是源。 */
    ],
```
（上式即 L47-66 的实际内容，注释按原文照录。）

### b) 分类语义与误判

该 `sources` 的唯一消费者是**陈旧判据**（`_entries.mjs:36-39`：「必须逐项列全…少列一个 = 那个文件的改动永远不会让报告变陈旧」），语义是「**人手改的文件**」。

`prototypes/_selection/prompts.js` 是生成物：`prototypes/_prompts/build-prompts.mjs:370`
```js
writeFileSync(join(ROOT, "prototypes/_selection/prompts.js"), body, "utf8");
```
文件头 `build-prompts.mjs:2` 「生成 prototypes/_selection/prompts.js」，`:16` 「产物：prototypes/_selection/prompts.js」，`:24` 还自称「prompts.js 是 tracked 的构建产物」。

⇒ **误判成立**，且是**同一段注释里自我矛盾**：`data.js` 因「是 collect-schemes 的产物」被排除，`self-gate.js` 因「是 render-scheme 的产物」被排除，唯独 `prompts.js`（build-prompts 的产物）被留下。逻辑比主张说的还拧：`build-prompts.mjs:40,76` **读** `data.js` 来生成 `prompts.js`，即 data.js 是 prompts.js 的上游——被排除的那个是源，被保留的那个是产物。

### c) `check-stale.mjs` 如何用，以及会不会误报

`check-stale.mjs:126-141`
```js
for (const f of e.sources) { … const m = statSync(p).mtimeMs; … }
const gapMin = (newest - at) / 60000;
…
if (gapMin > 3) out.push({ …, which, gapMin: Math.round(gapMin), label: e.label, render: e.render });
```
`at` 来自 `_selection/.inspect/report.json` 的顶层 `at`。所以：**跑一次 `build-prompts.mjs` → prompts.js mtime 变新 → check-stale 立刻报「选型台 陈旧 N 分钟」**，而报告内容其实完全没过期——正是 `_entries.mjs:50-56` 为 data.js 描述并明确要避免的那个死循环（跑生成器 → 报陈旧 → 花 ~54 秒重渲染 → 转绿）。

而真正的链条陈旧**已经有守卫**，在 `check-stale.mjs:195-200`：
```js
{ product: '_selection/prompts.js',
  inputs: () => [join(P, '_prompts/dna-clean.json'), join(P, '_prompts/build-prompts.mjs')],
  hint: 'node prototypes/_prompts/build-prompts.mjs',
  label: '提示词链·prompts.js' },
```
即「dna-clean.json 或 build-prompts.mjs 比 prompts.js 新」这件事独立成条（阈值同为 3 分钟，L232）。所以把 prompts.js 列进 `sources` **没有增加任何覆盖，只增加假阳性**。

「fresh clone 会不会报 stale」：会，但**不是这条缺陷特有的**——`check-stale` 比的是「源 mtime vs report 内嵌的 `at`（2026-10-30）」，而 clone 会把所有文件 mtime 刷成检出时刻，于是**每一条**源都远比 `at` 新，全部报陈旧。`_entries.mjs` 这条的独立后果是：**在正常开发中**（每晚 clear 一次报告）它产生假警报，正如 L52-56 实测记录的那样。

修法：从 `sources` 删掉 `'prompts.js'`，与 data.js / self-gate.js 同处理；其新鲜度交 `check-stale.mjs:195-200` 的 CHAIN 条（已存在）。

---

## T4 — `collect-schemes.mjs` 零 `process.exit` ⇒ 永远不能让 CI 红：**PARTLY TRUE（字面真，推论假）**

### a) grep 结果

在 `prototypes/_build/collect-schemes.mjs` 内 grep `\bthrow\b|process\.exit|process\.exitCode|console\.error`：**零命中**。
`process.exit` 出现 0 次。全文以 `console.log` 收尾（L746），正常路径落到文件尾，退出码由 node 决定。

### b) 精确结论

- **字面主张为真**：确实没有一处 `process.exit` / `process.exitCode` / `throw` / `console.error`。
- **推论「所以它永远不能让 CI 失败」为假**：未捕获异常即 `exit 1`。本文件有明确的抛点——
  `collect-schemes.mjs:122` `readFileSync(join(SPECS, '_CURRENT-VALUES.md'), 'utf8')`（无 `existsSync` 守卫，L144、L159 同样），文件缺失即 ENOENT 抛出；`L715 writeFileSync(...)` 在只读盘/权限不足时抛出。这两种情况 CI 都会红。
- **主张真正想说的那件事成立**：它没有任何**数据质量**失败信号。规格缺失时 `parseSpec` 返回 `null`（L194），记录落成空串；`palette.length < 2`、`没解析出一句话定义` 等全部只走 `console.log('⚠ …')`（L680-682），**照旧写盘并 exit 0**。`built` / `gate` 缺失也不阻断（L417 `gate: null`）。
- 附带：「CI」在本仓库目前是假设——无 `.github/`、无 `package.json`，无任何 CI 配置引用 `collect-schemes`。

⇒ **PARTLY TRUE**：修辞层（"zero process.exit"）为真，因果层（"can never fail CI"）为假；实质层（"数据坏了也不会红"）为真。

---

## T5 — `check-docs.mjs:407` 失败开放：**CONFIRMED（逻辑成立）；但当前不可达，降级**

### a) 原文

`prototypes/_build/check-docs.mjs:404-409`
```js
const F = {
  schemes: SCHEMES.length,
  promptSchemes: P.schemes.length,
  gateFailZero: SCHEMES.filter((s) => !s.gate || !(s.gate.fail > 0)).length,
  gateFailTotal: SCHEMES.reduce((a, s) => a + ((s.gate && s.gate.fail) || 0), 0),
  gateFailIds: SCHEMES.filter((s) => s.gate && s.gate.fail > 0).map((s) => s.id),
```
注意：主张引的是 `!(s.gate.fail > 0)`，实际代码多一个显式析取 `!s.gate ||` —— **比主张描述的更直白地失败开放**（连 `gate` 整个缺失都算进 `gateFailZero`）。

### b) 逻辑

`undefined > 0` → `false`；`!false` → `true` → 该案被计入「闸门 FAIL=0」。`!s.gate` 更是短路直接为 `true`。两路同一结论。对照 `:408` / `:409` 的写法（`(s.gate && s.gate.fail) || 0`、`s.gate && …`）可见作者在相邻两行**认得** `gate` 可能为空，只在 `gateFailZero` 这一行把它算成通过。

下游后果：`check-docs.mjs:597-608` 把文档里的「N 个闸门 FAIL=0」与 `F.gateFailZero` 对齐。若某案报告消失，`gateFailZero` **变大或不变**（S08 仍 FAIL、被剔的那案若原本干净则数字掉不下但也不会报警），文档断言照样通过。

### c) 可达性

`collect-schemes.mjs:417` 确实会产出 `gate: null`：`built: false, gate: null, shots: {…}`；只有 `existsSync(rep)` 成立才在 `L546` 赋值 `rec.gate`。
所以**代码路径存在**，触发条件 = 某案 `.inspect/report.json` 缺失/被删。

**当前不可达**：`prototypes/_selection/data.js` 里 `"gate": {` 出现 30 次、`"gate": null` **0 次**、`"built": true` 30 次——30 案全有报告（已核对 30 个 `report.json` 在盘上）。

⇒ 逻辑 **CONFIRMED**；**当前不可达**；只需 `rm prototypes/S0x-…/.inspect/report.json` 再跑一次 `collect-schemes` 即变为可达，届时失效形态是「一个真实回归变成不可见」。**严重度：低（潜在），但属于本仓库反复在治的「空集是任何集合的子集」同族**（`check-contract.mjs:164-174` 已为同类问题把缺失报告升级为 FAIL，此处未同步）。
修法：与 `:409` 对齐——`SCHEMES.filter((s) => s.gate && !(s.gate.fail > 0)).length`，另加一条「`gate` 缺失的案数」单独报出。

---

## T6 — `data.js` 提交即陈旧，且无闸门比对：**CONFIRMED**

### a) 两个 `at`

- `prototypes/_selection/data.js:43-58`，S01 的 `gate` 块，`:53` `"at": "2026-10-30T19:58:35.701Z"`。
- `prototypes/S01-red-wedge-broadsheet/.inspect/report.json:3` `"at": "2026-10-30T21:09:07.391Z"`。

`git show HEAD:` 逐字复核两个文件，值与工作树相同（HEAD 的 data.js S01 gate 段 `at` 仍是 `19:58:35.701Z`，HEAD 的 report.json `at` 仍是 `21:09:07.391Z`）⇒ **差异是提交进版本库的**，不是本地未提交改动。data.js 落后 **70 分 32 秒**。

### b) 谁比？

- `check-stale.mjs` **不比**：它比的是「源 mtime vs report 的 `at`」（L46、L121），而 `data.js` **被明确排除在 `_selection.sources` 之外**（`_entries.mjs:50-62`），且 `CHAIN`（`check-stale.mjs:159-201`）四条里**没有 data.js**（只有 `_specs`、`dna-raw.json`、`dna-clean.json`、`prompts.js`）。
- `check-docs.mjs` **不比**：全文 grep `report.json` **零命中**；它只 `vm.runInContext` 读 `data.js` / `prompts.js` / `prompt-copy.js`（`:390-392`），用 `data.js` 的 `gate.fail` 数值去核 README 的数字（`:407-409`、`:597-608`），**从不读任何 report.json**，因此无从知道 `data.js` 里的 `at` 已经落后。

于是形成闭环缺陷：`data.js` 的 `gate` 是 report.json 的**快照**，快照陈旧却无任何东西比对快照与原件；而 `check-docs` 拿这份陈旧快照去校验文档，文档一旦按陈旧快照写就自洽地"通过"。

`_entries.mjs:58-62` 自己写的分工是：「`collect-schemes` 的产物是否过期，应由 `check-docs` 的 `nums/gate` 之类数值一致性检查管」。**实测不成立**：`nums/gate` 只查「data.js ↔ README」一致，不查「data.js ↔ report.json」一致。该注释为 data.js 的排除给出的免责理由，是这一组缺陷的成因之一。

### c) 附加事实（比主张更硬）

30 案里 S01 不是孤例：`data.js` 里 30 个 `gate` 块的 `at` 全部来自 `collect-schemes` 最后一次运行，而 30 份 `report.json` 的 `at` 是各自最后一次渲染时刻——两者只在「渲染完立刻 collect」的瞬间同步。S01 相差 70 分钟即证明当前已不同步。

### 修法

在 `check-stale.mjs` 的 `CHAIN` 里补一条：产物 `_selection/data.js`，输入 = 30 份 `.inspect/report.json`，判据用**内容**而非 mtime（比较 `data.js` 里每个 `id` 的 `gate.at` 与对应 report 的 `at`，不等即陈旧）。这样既可抓「渲染了没 collect」，也不会重蹈 `_entries.mjs:52-56` 记录的那个 mtime 假阳性。

---

## 判定表

| # | 主张 | 判定 | 关键证据 |
| --- | --- | --- | --- |
| T1 | render-scheme 失败即销毁截图 | **PARTLY TRUE** | `inspect.mjs:58`（删图）早于 `:59`（launch）；`report.json` 不删（`:171`）。「清空整个输出目录」过强；但危害成立，且删除后 `verify-prototype:134`（只查 JSON 字段不 stat）与 `check-stale:93`（`if (jpgs.length)`）双双看不见。 |
| T2 | verify-prototype 不查允许表 ⇒ 永久 exit 1 | **PARTLY TRUE** | 不查允许表属实（全文无 `_CONTRACT`/`allow`），exit 1 属实；但「设计失败」定性错——`check-contract.mjs:1,191-203,490` 专司该判据，README `:160,:425` 的 29/30 与它同义。 |
| T3 | prompts.js 被当源（自指） | **CONFIRMED** | `_entries.mjs:49` 列 `prompts.js`，而 `build-prompts.mjs:370` 生成它；同段注释 `:50-62` 以「产物不是源」排除 data.js、`:64-66` 排除 self-gate.js。真链条陈旧已由 `check-stale:195-200` 覆盖。 |
| T4 | 零 process.exit ⇒ 永不红 CI | **PARTLY TRUE** | grep 零命中属实；但未捕获抛点存在（`:122`、`:144`、`:159`、`:715`）→ exit 1。「数据坏了只打 ⚠、照写盘、exit 0」为真。 |
| T5 | `check-docs:407` 失败开放 | **CONFIRMED（当前不可达）** | `:407` `!s.gate \|\| !(s.gate.fail > 0)`；`collect-schemes:417` 可产 `gate: null`；但 data.js 现为 30/30 非空，触发需删报告。 |
| T6 | data.js 提交即陈旧、无闸门比对 | **CONFIRMED** | data.js `:53` = 19:58:35.701Z vs S01 report `:3` = 21:09:07.391Z（HEAD 同值）；`check-docs` 全文无 `report.json`；`check-stale` 的 data.js 被 `_entries.mjs:50-62` 排除、CHAIN `:159-201` 无此条。 |

## 按真实后果排序

1. **T1**（数据丢失 + 检查不可见）——唯一一个**常规操作会造成破坏**的：一次 Chrome 起不来，30 案已跟踪的截图证据被删，而 `verify-prototype` 与 `check-stale` 恰好都在这个状态下给出绿色。已跟踪部分可用 git 复原，未提交的新截图不可复原。
2. **T6**（闸门不诚实）——`data.js` 的 `gate` 快照落后 70 分钟，且**没有任何检查器比对快照与原件**；`check-docs` 拿快照去核 README，形成自洽的假绿。`_entries.mjs:58-62` 为自己的免责给出的理由经实测不成立。这不是「会崩」，而是「结论不可信」。
3. **T5**（失败开放）——逻辑确凿，但当前不可达（`gate: null` 计数为 0）。一次 `rm` 就可达，且失效形态恰是「回归不可见」；与 `check-contract.mjs:164-174` 已修的同类缺陷不同族处理，属遗留不一致。
4. **T3**（分类颠倒）——不制造假绿，只制造**噪声**（跑一次 `build-prompts` 就报一次假陈旧，诱使无谓重渲染约 54 秒）。真正的陈旧覆盖已存在（`check-stale:195-200`），所以是纯卫生问题。修法一个词的删除。
5. **T2**（永久 exit 1）——**不是缺陷**，是两个问题共用了一个退出码；允许表由 `check-contract.mjs` 覆盖，README 的 29/30 与 exit 1 同义。唯一真实风险是「若接进 CI 会永久红」，而仓库当前无 CI。
6. **T4**（修辞失真）——字面真、推论假；实质（无数据质量失败信号）为真，但脚本本身是生成器而非闸门，且未被任何 CI 调用。

## 唯一应先阻断后续工作的主张：**T1**

理由：其余五条都是「结论不诚实/不精确/有噪声」，代价是**判断错误**，可事后纠正，且 T6/T3/T5 的修法都只是加一条断言或删一个字符串。T1 不同——它让**常规执行**（`node render-scheme.mjs <案>`，一个 Chrome 缺依赖、磁盘满、权限不足就会触发）删除**已跟踪的证据文件**，并且删除后的状态恰好是两个检查器的盲区：`verify-prototype.mjs:134-137` 只查 `report.json` 的 `images[].fold` 字段是否存在、不 stat 文件；`check-stale.mjs:93` 的 `if (jpgs.length)` 在截图被清零时整段跳过。也就是说，破坏发生后，工具链会同时宣称「达标」与「全部新鲜」。

在修好 `inspect.mjs:57-58` 的位置（移到 `Browser.launch()` 之后）或改为临时目录 + 原子 rename 之前，不应在这个工作区里跑批量渲染；同理，在 T6 的 `data.js ↔ report.json` 比对上闸之前，`check-docs` 的「29 个闸门 FAIL=0」不应被当作独立证据引用——它是拿 10 月 30 日 19:58 的快照在核文档。
