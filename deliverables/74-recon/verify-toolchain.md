# 工具链 6 条主张的独立复核

复核者：独立验证 agent（不复用工具链 agent 的任何结论）
仓库：D:/Web/style　HEAD：`0432753cbe6066d00f2654cf484ab093597f6099`
基线 `git status --porcelain | grep -v '^??'`：**空**
终态 `git status --porcelain | grep -v '^??'`：**空**（全程未产生任何已跟踪文件改动）

破坏性实验做法：把 `inspect.mjs` 工具目录与 S02 的 `.inspect/` 都复制到 `/tmp`
（`/tmp/toolcopy`、`/tmp/t1`），在副本上打补丁复现。**源码树与 30 份真实截图全程未动。**

---

## T1 — render-scheme.mjs 失败即毁灭 → **CONFIRMED**

### 调用关系与顺序（已读全文）

`prototypes/_build/render-scheme.mjs:19` 定位外部引擎，`:43-45` 用 spawnSync 调它：

```js
const INSPECT = join(ROOT, 'tools/taste-skill/skills/taste-skill/scripts/inspect.mjs');
const r = spawnSync(process.execPath, [
  INSPECT, `prototypes/${name}/index.html`, '--out', outRel, '--widths', '1440,768,390', '--json', ...extra,
], { cwd: ROOT, stdio: 'inherit' });
```

引擎（gitignored 的 `tools/`）里的删除发生在**任何渲染之前**：

`tools/taste-skill/skills/taste-skill/scripts/inspect.mjs:56-61`
```js
mkdirSync(outDir, { recursive: true });
// Screenshots from an earlier run would sit beside the new ones when the page got shorter.
for (const f of readdirSync(outDir)) if (/^(desktop|tablet|mobile)-(fold|page-\d+)\.jpg$/.test(f)) unlinkSync(join(outDir, f));
const browser = await Browser.launch();
const helper = await browser.newPage({ width: 1600, height: 1000 });
const report = { url: ..., at: new Date().toISOString(), ... };
```

`report.json` 只在 `:171` 才写，`at` 却是 `:61`（在 launch 之前）取的。所以顺序是
**先 unlink 全部 jpg → 再启 Chrome**，不是 render-to-temp-then-swap。没有 try/catch 包住这段，
`try {` 从 `:90` 才开始。

### 该快照是否入库

`.inspect/` **不在** `.gitignore` 里（搜过全文：只有 `.taste-skill/`、`prototypes/*/build/` 等），
S02 的 9 个文件全部被跟踪：
```
$ git ls-files prototypes/S02-gilded-symmetry-salon/.inspect/
.inspect/desktop-fold.jpg  .inspect/desktop-page-01.jpg  .inspect/desktop-page-02.jpg
.inspect/mobile-fold.jpg   .inspect/mobile-page-01.jpg   .inspect/mobile-page-02.jpg
.inspect/report.json       .inspect/tablet-fold.jpg     .inspect/tablet-page-01.jpg
```

### 实测复现（在副本上把 launch 换成必然抛错的 20s 超时）

补丁位置就是真实抛错点 `:59 const browser = await Browser.launch();`。

```
=== BEFORE ===  9 files（8 张 jpg + report.json）
=== RUN patched inspect (simulated CDP 20s timeout) ===
Error: Chrome did not start within 20s [SIMULATED CDP TIMEOUT]
    at /tmp/toolcopy/scripts/inspect.mjs:59:41
EXIT=1
=== AFTER ===
total 28
-rw-r--r-- 1 ... 23389 ... report.json        ← 只剩 report.json
$ md5sum report.json → 6d038f6bf51cf12357711ac28f6bcfdc  ← 与运行前逐字节相同
```

**8 张 tracked jpg 全部被删，report.json 一字节未变。** 主张成立。

### render-scheme.mjs 事后能否兜住

- `:51` `if (r.error || r.signal)` —— 子进程正常以 exit 1 结束，`error`/`signal` 均为空，**不触发**。
- `:57` `!existsSync(rep)` —— 旧报告还在，**不触发**。
- `:58` 指纹比对 —— 内容相同 → `exit 6`「声称成功但没写报告」。

也就是说：**非零退出的确发生（exit 6），但树已经被破坏**，且损坏发生在退出码之前。主张「can leave the tree damaged」成立。

### 两条需要精确化的地方（不影响结论，但影响定级）

1. **不是不可逆的数据丢失。** `.inspect/` 是入库的，`git checkout -- <paths>` 可完整恢复。
   实测现在的损坏是 4 天前留下的，且**只有 S02 一例**：
   ```
   JPGS NEWER  S02-gilded-symmetry-salon  jpg=2026-11-04 01:31:50  report=2026-10-31 05:05:22
   ```
   （全 30 案扫描，无第二例。`check-stale.mjs` 也独立抓到：`截图与报告不同步(S02) tablet-page-01.jpg 落后 5547 分钟`。）
2. **20s 不是「所有 CDP 调用的超时」。** `cdp.mjs:61` 的 20s 只覆盖 Chrome **启动握手**
   （等 stderr 里 `DevTools listening on ws://`）：`setTimeout(..., 20000)`。
   `goto` 是 25000（`cdp.mjs:149`），`send` 是 30000（`:87`/`:138`）。
   但**任何**在 `:171` 写报告之前失败的路径，后果都一样（jpg 已删），所以结论不变。

### 子主张：cdp.mjs:61 是 20s、Chrome 冷启动 14,140 ms

- `20s / 20000` → **CONFIRMED**，`cdp.mjs:61` 逐字为
  `const t = setTimeout(() => reject(new Error('Chrome did not start within 20s')), 20000);`
- `14,140 ms` → **无法逐毫秒复现，但量级与余量得到证实**。本机实测
  `Browser.launch()` 成功耗时 **14,368 ms**（`launch OK in 14368 ms`）。
  对 20s 上限只剩 **~5.6 秒余量**。这是 T1 从"理论"变成"随时会发生"的**实证依据**：
  一旦冷启动慢 40%，就会走上面那条删图路径。

---

## T2 — verify-prototype.mjs 规则 4 盲注释 + 永久 exit 1 → **CONFIRMED**

### 是否读 §9.15 / 任何允许表？

```
$ grep -n "_CONTRACT\|9\.15\|allow\|ALLOW\|exempt\|豁免" prototypes/_build/verify-prototype.mjs
（无输出，EXIT=1）
```

**零命中。** 全文 179 行只读 `index.html`/`style.css`/`assets/`/`.inspect/report.json`（`:109`），
从不打开 `_CONTRACT.md`。`:118` 直接 `if (fails.length) out.problems.push(...)`。

### 规则 4 是否真的注释盲？—— 有**活体假阳性**

`:76-78`：
```js
for (const m of C.matchAll(/(?:^|\})\s*(body|html)\s*\{([^}]*)\}/g)) {
  if (/background-image|background\s*:[^;]*url\(/.test(m[2])) out.problems.push(`${m[1]} 规则挂了背景图 → ...`);
}
```
`C` 是原始 CSS，没有先过 `stripNonRendered()`（该函数只在规则 3 的 Emoji 扫描里用）。

对真实的 S02 `style.css:49-68` 实测：
```
RAW rule4 hits:               ["body"]      ← 报错
COMMENT-STRIPPED rule4 hits:  []            ← 剥掉注释后 0 处，证明是假阳性
```
S02 的 body 块里那段文字是 **2026-10-31 修掉该缺陷的注释**，原文写着
「原本 `background-image: url("assets/card-grain.png")` 直接挂在 body 上」，实际生效行是 `background-repeat: repeat`。
**一个已修复的缺陷，被它自己留下的"修复说明"重新判为存在。** 这是活证据，不是理论推演。

### S08 的两条 FAIL 是否真在 §9.15

`S08/.inspect/report.json`（allow=`[]`）：
```
FAIL: palette-terracotta@1440, font-count@1440     WARN: no-footage@1440, card-rows@390
```
`_CONTRACT.md:194-201` 的 §9.15 表**恰好含 `font-count` 与 `palette-terracotta` 两行**，
且 `palette-terracotta` 那行明确写「保留琥珀、报告原始 FAIL 并说明」。
→ 这两条 FAIL 是**真豁免**，`:124` 的裁决句也说「表内规则的 FAIL 不计入缺一不算完」。

### exit 1 是"永久"吗

`node verify-prototype.mjs --all` 实测：**`达标 28 / 不达标 2 / 共 30`，EXIT=1**
（不达标：S02 规则 4 假阳性 + S08 两条 §9.15 FAIL）。
S08 单跑同样 EXIT=1，且打印 `闸门 FAIL=2：palette-terracotta font-count`。

只要 §9.15 要求 S08 保留这两条 FAIL，这个检查器就**永远红**——它是**按设计注定失败**，
不是"暂时红"。主张成立。附带发现：所以 `_entries.mjs:8` 与 `verify-prototype.mjs:143-158`
注释里反复引用的「README 的 26/30」与实测 28/30 已经不一致（`_entries.mjs:61` 也写「实测抓到过达标 29 vs 文档 26」）。

---

## T3 — `_entries.mjs:49` 把 prompts.js 当源 → **PARTLY TRUE**

### 分类确实错了

`_entries.mjs:43-71`（逐字，含作者自己写下的自相矛盾）：

```js
export const PRODUCTS = [
  { dir: '_selection', label: '选型台',
    sources: [
      'index.html', 'style.css', 'app.js',
      'prompt-copy.js', 'prompts.js',
      /* `data.js` 不列 —— 它是 `collect-schemes.mjs` 的**产物**（从 `_specs/*.md` 生成），
         不是源。列进来会造成一个死循环式的误报：
           跑 collect-schemes → data.js mtime 变新 → check-stale 报「data.js 落后 N 分钟」
           → 跑 render-scheme _selection → report.at 更新 → 转绿 */
      'wizard.html', 'wizard.css', 'wizard.js',
```

`prompts.js` 就紧挨在 `data.js` 上方两行被列为源，而它**同样是生成物**——
它自己的文件头（`prototypes/_selection/prompts.js:1`）写着：
```
/* 自动生成，勿手改。生成器：prototypes/_prompts/build-prompts.mjs
```
生成器**确实存在**：`prototypes/_prompts/build-prompts.mjs`（另有 4 份备份）。
且 `check-stale.mjs:196-200` 自己就把 `_selection/prompts.js` 登记为**链条产物**：
```js
{ product: '_selection/prompts.js',
  inputs: () => [join(P, '_prompts/dna-clean.json'), join(P, '_prompts/build-prompts.mjs')],
  hint: 'node prototypes/_prompts/build-prompts.mjs', label: '提示词链·prompts.js' },
```
**同一个文件，在同一个脚本里既是"产物"又是"源"。** 与 `data.js` 完全同构，却只给 `data.js` 写了豁免。
主张的核心（自指归类错误）成立。

### 但后果被过度描述

- **"regenerating it makes check-stale report thousands of minutes behind"** —— 现象实测存在：
  ```
  $ node prototypes/_build/check-stale.mjs
    选型台(_selection)  prompts.js 落后 5505 分钟  →  node prototypes/_build/render-scheme.mjs _selection
    EXIT=1
  ```
  5505 分钟 ≈ **3.8 天**，是"数千分钟"没错。但
- **归因不同**：这 5505 分钟不是"自指循环永久把报警卡死"，而是**今天真的重跑了生成器**——
  `prompts.js` mtime = `2026-11-04 00:52:20`，而 `_selection/.inspect/report.json` mtime = `2026-11-03 21:24:23`，
  at = `2026-10-30T21:07:40.597Z`。生成器跑了、报告没重渲染，这**正是 check-stale 该报的那件事**。
- 真正的问题是**重复覆盖**：`:196-200` 那条链已经在管 prompts.js，`_entries.mjs:49` 又管一次，
  于是同一次改动报两条、且其中一条的修法是错的（它建议 `render-scheme --out`，而正确修法是重跑生成器）。
  循环本身**能自愈**（render 后 report.at 变新→转绿），不会永久卡死。

判定：归类错误 CONFIRMED，是 `data.js` 那条警告的活体复现；"thousands of minutes" 现值为真但属真实陈旧；
"永久自指"不成立。

---

## T4 — collect-schemes.mjs 零 process.exit，故永不失败 → **字面 TRUE，含义 FALSE**

```
process.exit   : 0 处
throw          : 0 处
process.exitCode: 0 处
```
字面全对。`collect-schemes.mjs` 通篇没有任何 FAIL/失败/聚合退出机制（`grep FAIL|失败|bad`
只命中 `:543` 一处读取 report 的 `fails`，与自身退出无关）。它是**生成器**，不是闸门。

但结论"can never fail CI"是错的：

1. **未捕获异常即非零退出。** `:122` `const t = readFileSync(join(SPECS, '_CURRENT-VALUES.md'), 'utf8');`
   是裸 readFileSync，没有 try（`:540` 那处 report.json 才有 `try/catch`）。
   `_CURRENT-VALUES.md` 缺失 → `ENOENT` 未捕获 → Node 退出码 1。Node 对未捕获异常的默认行为就是 exit 1，
   不需要脚本自己写 `process.exit`。同理 `JSON.parse` 失败也会抛。
   **所以它确实能"失败 CI"，只是失败的样子是崩栈而不是一句判词。**
2. **更严重的是反过来的那一半**：它没有判词，所以它"跑完但产出了错数据"时**无声通过**。
   `:417` 默认 `gate: null`，`:561` `catch { /* 报告坏了就当没有 */ }`；
   `:677` `const clean = out.filter((r) => r.gate && r.gate.fail === 0).length`
   —— 只用来打印一行「FAIL=0 N」。缺报告/坏报告被**静默降级为"没有闸门"**，脚本照样 exit 0 并覆盖 `data.js`。
   **T6 正是这条路径的产物。**

判定：主张的**事实**对，主张的**推论**错；它真正的缺陷是"没有判据"，而不是"没有 exit"。

---

## T5 — check-docs.mjs:407 失败开放 → **PARTLY TRUE（机制对，路径错）**

`:407` 逐字：
```js
gateFailZero: SCHEMES.filter((s) => !s.gate || !(s.gate.fail > 0)).length,
```
推理复现（实跑）：
```
missing fail -> true     ← {gate:{warn:2}}：undefined>0 为 false，!(false) 为 true → 计入"达标"
gate null   -> true      ← {gate:null}：!s.gate 短路上 true → 计入"达标"
```
"失败开放"这一性质 **CONFIRMED**。

### 但主张给的路径是够不着的

主张说"missing gate ⇒ FAIL=0"。实际上"gate 存在但没有 fail 字段"**产生不出来**：
`collect-schemes.mjs:546-548` 是唯一的 gate 构造点，`fail` 是无条件赋值的
```js
rec.gate = { fail: fails.length, warn: warns.length, ... }
```
实测 30 案：`no gate prop: 0 / gate null/undefined: 0 / gate without fail: 0`。
报告解析失败时走的是 `:561` 的 catch，`gate` 保持 `:417` 的 `null`——**是 null，不是缺字段**。

### 真正够得着的那条是 `!s.gate`

`!s.gate ||` 这个**前半个短路**才是活缺陷：从未渲染过的案会以 `gate:null` 存在，
被 `:407` 计为"达标"。这正是 `check-stale.mjs:48-58` 刚刚修过、并明确点名的同一类缺陷
——「"空集是子集"缺陷，与 check-contract.mjs 的 C0 同款」，**在 check-docs 里还没修**。
当前 30/30 都有 gate，所以**今天是空转的**（harmless-but-silent），但任何一次新增案/丢报告就会谎报。

另注：主张里引的表达式 `!(s.gate.fail > 0)` **不带** `!s.gate ||`，对 `gate:null` 会直接
`TypeError: Cannot read properties of null`（已实测）——引文与源码有出入，结论方向不变。

实测该行当前取值 29（S08 是唯一 FAIL>0），`check-docs` 全绿 `0 FAIL / 0 WARN / 13 PASS`，`nums/gate` 通过。

---

## T6 — data.js 入库即陈旧，无闸门比对 → **CONFIRMED（范围仅 S01）**

### 两个数字（HEAD 与工作区一致）

```
HEAD data.js  S01.gate.at  = 2026-10-30T19:58:35.701Z
HEAD report.json   .at     = 2026-10-30T21:09:07.391Z   ← 晚 70 分 31 秒
```
（`git diff --stat HEAD -- prototypes/_selection/data.js` 为空，工作区即 HEAD；
`git show HEAD:.../report.json` 与工作区同为 `21:09:07.391Z`。）

全 30 案逐案比对：
```
MISMATCH S01 data.js= 2026-10-30T19:58:35.701Z report= 2026-10-30T21:09:07.391Z
mismatch count: 1 / 30
```
→ **只有 S01 一例**，主张举的例子就是唯一的例子。

### 是否真的没有闸门比对

全仓库搜 `gate.at` 的读取者，**两个都没有比较逻辑**：
```
deliverables/59-scratch/probe-3unique.js:29   ... 只打印
deliverables/73-verify/_reviewer-premises.mjs:44  只打印 data.js 里 S08.gate.at 的值
```
`prototypes/_build/` 下零命中。`check-docs.mjs` 只用 `gate.fail/failIds/failTotal`（`:407-409`），
`check-stale.mjs` 只用 `report.json` 自身的 `at`（`:46`/`:121`），从不打开 `data.js` 的 `gate.at`。
→ 「no gate compares them」**CONFIRMED**。

### 成因（与 T4 同源，这条把它串起来了）

`data.js` mtime = `2026-11-04 01:51:02`，**晚于** `S01/.inspect/report.json` 的 mtime `2026-11-03 21:32:02`。
也就是说生成器**在报告之后**跑的，却写出了更旧的 `at`。说明生成当时读到的 S01 报告内容里 `at` 是
`19:58:35`，此后该文件被换成 `21:09:07` 的版本（HEAD 版本）。
成因链与 T4 一致：`collect-schemes.mjs` **没有任何"生成物与输入是否一致"的校验**
（`:551` 只是把 `at: j.at` 抄进 `data.js`），所以这份不一致被静默写进了入库产物。

---

## 判决表

| # | 主张 | 判决 | 决定性证据 |
|---|---|---|---|
| T1 | render-scheme 失败即删 tracked jpg，report 不动 | **CONFIRMED** | `inspect.mjs:58` unlink 在 `:59` launch 之前；副本实测 8 张 jpg 全灭、report md5 不变；S02 现存该损伤（jpg 11-04 01:31 vs report 10-31 05:05） |
| T1a | `cdp.mjs:61` = 20s | **CONFIRMED** | 逐字 `..., 20000)` |
| T1b | 冷启动 14,140 ms | **量级证实** | 本机实测 `launch OK in 14368 ms`（余量仅 ~5.6s） |
| T2 | 规则4盲注释 + exit 永久 1 | **CONFIRMED** | grep 允许表/§9.15 **零命中**；S02 剥注释后命中 0（假阳性活体）；`--all` = 28/30 EXIT=1 |
| T3 | prompts.js 被当源，自指 | **PARTLY TRUE** | `_entries.mjs:49` 归类错、`check-stale.mjs:196-200` 同时把它当产物；但"永久/自指卡死"不成立，5505 分钟是真实陈旧 |
| T4 | 零 process.exit ⇒ 永不失败 | **字面 TRUE / 含义 FALSE** | 0 处 exit、0 处 throw 属实；但 `:122` 裸 `readFileSync` 未捕获即 exit 1；真缺陷是**没有判据**（`:417` gate:null、`:561` 静默 catch） |
| T5 | `:407` 失败开放 | **PARTLY TRUE** | 性质证实（两条实测均返回 true）；但"缺 fail 字段"不可达（`:547` 无条件赋值），**可达的是 `!s.gate`**，今天 30/30 有空转 |
| T6 | data.js 入库陈旧、无闸门比对 | **CONFIRMED（1/30）** | S01 `19:58:35.701Z` vs `21:09:07.391Z`；`gate.at` 在全仓库无任何比较者 |

## 按现实后果排序

1. **T1（数据丢失）** —— 唯一会**毁掉工作区文件**的一条，且毁的时候不退非零（旧 report 还在，
   `:51`/`:57` 两道闸都放行）。8 张 tracked 证据图被删而 report 仍"看起来正常"，
   这正是 `check-stale.mjs:82-83` 说的"一张看起来正常的旧截图"。可 `git checkout` 恢复，故非不可逆；
   但叠加 T1b 的 5.6 秒余量，**下一次渲染就有 40% 概率级别的机会踩中**。
2. **T2（闸门失信）** —— 一个**注定永远红**的检查器会被学会忽略；同时它对注释开火，
   S02 的"已修复"被读成"仍存在"。二者合起来使 `verify-prototype` 的退出码不再承载信息。
3. **T4 + T6（同一条链，静默产出错数据）** —— 生成器无判据 → `gate:null`/陈旧 `at` 被静默写进入库产物 → 无人比对。
   T6 是 T4 的已知产物，不是独立事故。
4. **T5（失败开放）** —— 机制真实但当前空转（30/30 有 gate）。
5. **T3（卫生/重复报警）** —— 归类错误确凿，但会自愈，效果是"多一条修法更差的报警"，噪声而非失真。

## 应当阻断后续工作的那一条

**T1。** 它是六条里唯一"再执行一次标准命令就可能造成文件损失"的缺陷，而
`render-scheme.mjs:2` 明确要求 30 案**必须用同一条命令**渲染——也就是说任何人继续干活都会经过它。
在把 `inspect.mjs:56-58` 的删除改成"渲染成功后再换"（或 render 到临时 `--out` 再原子替换）之前，
**任何对原型的再渲染都应被视为有损操作**；最低限度也必须在跑之前 `cp -r .inspect /tmp/backup`，
并在失败后立刻 `git checkout -- prototypes/<name>/.inspect/`。
