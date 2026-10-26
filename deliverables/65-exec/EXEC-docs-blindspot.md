# EXEC — check-docs 两处盲区 + AUDIT_CUT_AT 死代码 + audit 折叠块位置 + README 同步

**日期**：2026-10-27
**写作用域**（严格未越界）：`prototypes/_build/check-docs.mjs`、`prototypes/_selection/app.js`、`README.md`、`README-EN.md`
**未 commit。未派生任何子 Agent。**

---

## 0. 一句话结论

四个任务全部落地并实跑：`check-docs.mjs` 从「只认阿拉伯数字 + 上界卡在 30」改成「认一–九十九 + 上界 200 + 三条上下文排除规则」，新增 `panel/fields` 断言把这一轮写进 README 的三句新事实也钉住；`AUDIT_CUT_AT` 连同切分分支删干净（S13 展开后仍 306 字）；`auditFold(r)` 移到 `risk` 之前（三案实测 top 提前 154–205px）；两份 README 补上「去 AI 味审查点」是折叠字段、30/30 有值。

**最终状态：`check-docs.mjs` 0 FAIL / 0 WARN / 13 PASS，exit 0；`--selftest` 七个用例全绿。**

---

## 1. 任务 1：两处盲区的根因与修法

### 1.1 盲区 A —— 中文数字一个都抓不到

**原代码**（`check-docs.mjs` 2a）：

```js
const re = /([\d,]{1,4})\s*(?:个设计方案|个可运行原型|个方案(?!的)|个原型|design schemes|runnable prototypes|schemes|prototypes)/g;
```

`[\d,]{1,4}` 只认阿拉伯数字和千分位逗号。这个仓库的 README 是中文写作，`三十一个可运行的原型`、`三十个方案` 这类写法**一个字符都匹配不上**——正则的捕获组根本不参与，`matchAll` 直接跳过。所以独立验证 Agent 把「30 个可运行原型」改成「三十一个」时，检查器连"这里有个数字"都不知道。

**修法**：加一个**受控的**中文数字解析器 `cnToNumber()`，不引依赖：

- 覆盖 一–九十九（`二十一`、`三十`、`三十一`、`四十`…）
- 覆盖 `廿`（二十）、`卅`（三十）、`卌`（四十）三个合体字，靠开头 `replace` 归一化成标准写法再解析
- 顺带认 `一百` 整百写法（上界放宽到 200 后需要）
- **解析不出来返 `null` 并放过**，不猜。理由写在注释里：宁可漏一个畸形写法，也不要把「两千零一十七年」猜成方案总数——猜错的红比漏报更贵，下一个人会照着一条错的断言去改文档。

正则的数字段换成：

```js
const NUM = '(\\d[\\d,]{0,5}|[〇零一二两三四五六七八九十百廿卅卌]{1,6})';
```

### 1.2 盲区 B —— `n <= 30` 把 31 排除

**原代码**：

```js
// 只认"总数"级别的数字：> 30 的多半是别的量（字数、字节），跳过交给别的断言
if (n <= 30 && n !== F.schemes && n > 0) {
```

**这行的真正问题不是"它漏了 31"，而是它用一个恰好等于当前数据规模的魔数替换了判断。** 上界 = 实测值，意味着这条断言的结构是「只抓小于 30 的错值」——把 30 写成 31 / 40 一律放过，而这两个恰恰是最可能出现的错写（把总数写错成相邻数）。

**修法**：上界放到 `1–200`，「这是别的量」改由**上下文**判，三条 skip 规则，每条都配一句实测到的真实句子：

| # | 规则 | 为什么它必须存在（实测原句） |
|---|---|---|
| ① | 中文「一 / 两」当冠词放过 | 「选中**一个**方案」「**一个**能直接打开的 HTML 原型」×4。README 里 6 处会被误伤。**阿拉伯 `1 个方案` 不放过**——中文「一个」可以是冠词也可以是计数，`1 个` 只可能是计数。 |
| ② | 同一**小句**里出现别的轴的语境词就放过 | `模板` `template` `场景` `行业词` `警告` `hard` `degrade` `退化` `机制` `mechanism` `阴影` `shadow` `同质` `homogen` `轴` `axis` `参数` `parameter` `锚点` `anchor`。理由：「3 个模板」「18 案带警告」「hard 4 案」「18 schemes use no shadow」「13 schemes lay their units out by hand」「12 schemes (40%) form a single connected block」「only 2 schemes are "very quiet"」「the other 18 schemes have no parameter file」。 |
| ③ | 紧随其后是别的量词就放过 | `字` `字节` `KB` `MB` `px` `条` `模板` `行业词` `场景词` `场景`。「1815 字」「26 条」「3 个模板」。 |

**② 里最关键的一处设计是「小句」而不是「整行」**，这是硬着头皮试出来的：

> README L16 = 「**30 个方案**各配一个能直接打开的 HTML 原型，**外加 3 个拿来就用的模板**」。
> 如果按整行判语境，`模板` 在逗号之后，这句**真总数会被自己的后半句毒死** ⇒ 把 30 改成 31 也不报。
> 所以 `clauseOf()` 按 `，。；|` 和换行切段，只看含这个数字的那一小句。

**小句边界取 `，。；|` 的依据**：中文长句里"数字 + 单位"与"另一个轴的名词"分处不同逗号段是常态；把边界取到分号/句号又太粗（一行常有两三件事）。

### 1.3 顺带修掉的两个「检查器自己的口径错」

修完上面两处后单独跑 `check-docs.mjs README-EN.md` 仍然是 **1 FAIL**，但那是检查器在说谎，不是文档有错：

**(a) `GATE_TAIL` 只认英文语序。** README-EN 的中文摘要段写「**26 个原型**机械闸门 FAIL=0」——中文是「数字 + 机械闸门 FAIL=0」，英文是「数字 + prototypes + pass the gate」。旧 `GATE_TAIL` 只有 `pass/达标/at FAIL`，于是这句正确的达标数被判成「总数写错 26」。补上 `机械闸门|闸门|FAIL` 后通过。

**(b) `i18n/facts` 的中文侧不认中文数字。** 三对正则原来都是 `([\d,]{1,4})\s*个设计方案` 这种。如果哪天中文版写成「三十个设计方案」，正则不匹配 ⇒ 报「方案数：**中文缺**」——明明写了，检查器说它缺。**假警报比漏报更贵：它会教下一个人去怀疑一句正确的话。** 现在中文侧也用同一个 `NUM` 和 `readNum()`，读不成数字时明说「中文写「X」，读不成数字」而不是拿 `NaN` 去比（`NaN !== NaN` 会让断言永远红，且红得没有信息量）。

---

## 2. 任务 1 的六个自测用例（实跑输出）

命令：

```bash
node deliverables/65-exec/prove-blindspot.mjs     # 独立复现机（不碰真仓库）
node prototypes/_build/check-docs.mjs --selftest  # 六个用例已固化成断言
```

### 2.1 四个改坏用例 —— 各自必须 FAIL

```
## 改坏 1  三十个可运行的原型 → 三十一个
   期望 FAIL / 实得 FAIL（exit 1）  ✓
   ✗ nums/schemes         方案/原型总数与实测 30 不符：31（原句：三十一个可运行的原型）

## 改坏 2  30 个方案 → 31 个方案
   期望 FAIL / 实得 FAIL（exit 1）  ✓
   ✗ nums/schemes         方案/原型总数与实测 30 不符：31（原句：31 个方案）

## 改坏 3  30 个方案 → 29 个方案
   期望 FAIL / 实得 FAIL（exit 1）  ✓
   ✗ nums/schemes         方案/原型总数与实测 30 不符：29（原句：29 个方案）

## 改坏 4  30 个方案 → 40 个方案
   期望 FAIL / 实得 FAIL（exit 1）  ✓
   ✗ nums/schemes         方案/原型总数与实测 30 不符：40（原句：40 个方案）
```

改坏 1 是盲区 A 的用例（中文数字），改坏 2/4 是盲区 B 的用例（上界），改坏 3 是下界方向（老逻辑本来能抓，留着防回退）。

### 2.2 两个误报用例 + 一个对照 —— 必须不报

```
## 误报 1  追加「30 个场景词」「1815 字」
   期望 PASS / 实得 PASS（exit 0）  ✓
   ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数

## 误报 2  追加「26 条 / 40 个模板 / 120 个行业词」
   期望 PASS / 实得 PASS（exit 0）  ✓
   ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数

## 对照    30 个方案 → 三十个方案（中文写对了，必须不报）
   期望 PASS / 实得 PASS（exit 0）  ✓
   ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数

✓ 7 条全部符合预期
```

> ⚠️ 误报用例一律用**追加**，不用替换。实测踩过：把「44 个行业词」替换成「30 个场景词」时，
> `nums/schemes` 确实放过了，但 `i18n/facts` 红了（「行业词数：中文缺」）——那就分不清
> 红的是我这条断言还是别的断言。**只 grep "FAIL" 会把别的断言红当成自己抓到了，那是"碰巧对"。**

### 2.3 `--selftest` 里的固化（解析器自检 + 六 + 一个守门员）

用例已写进 `--selftest`，每条在**独立临时目录**里跑，断言的是 **exit 码 + 那一条断言行**，不是 grep 关键词：

```
  ✓ 自测零（中文数字解析器）：19 条解析用例全部符合预期（含「十」「廿」「卅」「一百」「两百零一」，以及必须拒绝的「两千零一十七」）

  ✓ 改坏 1：三十个可运行的原型 → 三十一个
      exit=1 期望=1（FAIL）  ✗ nums/schemes         方案/原型总数与实测 30 不符：31（原句：三十一个可运行的原型）
  ✓ 改坏 2：30 个方案 → 31 个方案
      exit=1 期望=1（FAIL）  ✗ nums/schemes         方案/原型总数与实测 30 不符：31（原句：31 个方案）
  ✓ 改坏 3：30 个方案 → 29 个方案
      exit=1 期望=1（FAIL）  ✗ nums/schemes         方案/原型总数与实测 30 不符：29（原句：29 个方案）
  ✓ 改坏 4：30 个方案 → 40 个方案
      exit=1 期望=1（FAIL）  ✗ nums/schemes         方案/原型总数与实测 30 不符：40（原句：40 个方案）
  ✓ 误报 1：追加「30 个场景词」「1815 字」（都不是方案总数）
      exit=0 期望=0（不报）  ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数
  ✓ 误报 2：30 个方案 → 三十个方案（中文数字写对了）
      exit=0 期望=0（不报）  ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数
  ✓ 改坏 5：README「全部 12 段字段」→「全部 13 段字段」
      exit=1 期望=1（FAIL）  ✗ panel/fields         详情面板口径不符：README 写 13 段字段，app.js 实测 12 段（field() 11 + auditFold 1）

  ✓ 自测二（七个用例）：四改坏 + 一守门员全部 FAIL、两误报均不报错
  ✓ 自测通过：三处已知腐化 + 七个用例全部符合预期
```

#### 自测零：为什么需要给「检查器的零件」单独立一条

**这是我这一轮唯一一个自己抓到自己的 bug，值得单独写。**

`cnToNumber` 第一步写的是：

```js
if (t.length === 1) return Object.prototype.hasOwnProperty.call(CN_DIGITS, t) ? CN_DIGITS[t] : null;
```

`CN_DIGITS` 里只有 `一…九` 和 `〇/零`，**没有「十」**。于是单字「十」走进这一行、查表得 `undefined`、返回 `null`——**十位那条正则永远收不到它**。

后果有多隐蔽：解析失败 ⇒ 调用方 `if (n === null) continue` ⇒ **静默放过**。也就是说「十 个方案」这类写法会让检查器直接失明，而**六个 nums/schemes 用例全部照绿**——因为 README 里恰好没有裸「十」。绿得毫无破绽。

修法是把"命中数字表"并入条件，让「十」往下走由十位正则按"省略前导一"解析成 10。

**但我怎么证明这个修法没写错？** 靠 `--selftest` 里那 19 条解析用例表（`CN_CASES`）。我实测过它真的会响——把 bug 版本改回去：

```
$ node prototypes/_build/check-docs.mjs --selftest
  ✗ 自测失败：中文数字解析器有 1 条不符合预期 ——
      「十」期望 10，实际 null
    解析器错了，下面基于它的用例即使"全绿"也不可信（解析失败会被静默放过）。
EXIT=2
```

然后改回来 —— `✓ 自测零：19 条解析用例全部符合预期`，`EXIT=0`。

表里同时放了**必须拒绝**的四个（`一二三` / `三十一五` / `两千零一十七` / `abc`）：证明它不会把不成词的串瞎猜成数字。这半边比"能解析"那半边更重要——解析器的主要破坏方式不是算错，是**乱猜**。

> 附带一个结构问题：`--selftest` 块在文件靠上处就 `process.exit()` 了，而它是普通语句（不是函数体），
> 所以 `CN_DIGITS` / `CN_CASES` 这些 `const` **必须声明在它之前**——放 2a 旁边会撞 TDZ
> （`Cannot access 'CN_DIGITS' before initialization`）。现在的做法是把解析器提到文件头部并写明原因，
> 而不是为一个辅助函数去改整个脚本的结构。

**为什么多出「改坏 5」这一条**（任务书没点名）：我这轮往 README 里新写了三句能被复算的话——「全部 12 段字段」「30/30 有值（276–444，合计 10,065，中位 324）」「它排在风险之前」。**在加 `panel/fields` 之前，这三句话在 check-docs 里一条断言都没有**——我亲手补上去的事实，却没有任何机制在它过期时喊一声，那正是这份脚本第 1 行说要消灭的那种腐化。所以连同断言一起把守门员写进去：给断言加了，就得证明断言真的会响，否则它只是装饰。

---

## 3. 任务 2：删掉 `AUDIT_CUT_AT`

### 3.1 事实核对（先证明它真的是死代码）

```
$ node -e "…load data.js…"
S13 audit len 306
has mark -1          # indexOf('反套路改造三指标') === -1
```

`indexOf` 返回 −1 ⇒ `if (i > 0)` 不成立 ⇒ 白名单是死代码。与独立验证 Agent 的实测一致。

> 📌 **一处需要 Lead 知道的偏差**：`AUDIT_CUT_AT` **不在 git HEAD 里**。`git show HEAD:prototypes/_selection/app.js`
> 里既没有 `AUDIT_CUT_AT`、也没有 `auditText` / `auditFold` / 「去 AI 味审查点」——整段「接通 audit 折叠块」
> 是本轮某个未 commit 的 Agent 加的（`deliverables/65-verify/frozen/app.T2.js` 是那个中间态）。
> 所以下面的 diff 对比的是**本轮改动前的工作区快照（app.T2.js）**，不是 HEAD。

### 3.2 删除前（`deliverables/65-verify/frozen/app.T2.js` L500–511）

```js
     通用规则会在别的案上误伤正文。 */
  var AUDIT_CUT_AT = { S13: '反套路改造三指标' };

  function auditText(r) {
    var t = r.audit || '';
    var mark = AUDIT_CUT_AT[r.id];
    if (mark) {
      var i = t.indexOf(mark);
      if (i > 0) t = t.slice(0, i);
    }
    return t;
  }
```

### 3.3 删除后（当前 `app.js` L474–502，注释留原地）

```js
  /* ── 字段 8「去 AI 味审查点」的取文：**这里曾经有一刀，2026-10-27 删掉了** ─────
   *
   * 【曾经有什么】这里有过一段：
   *     var AUDIT_CUT_AT = { S13: '反套路改造三指标' };
   *     if (mark) { var i = t.indexOf(mark); if (i > 0) t = t.slice(0, i); }
   * 用来在 UI 层把 S13 的 `audit` 从 780 字切到 307 字 —— 那 473 字（60.6%）是混进来的
   * 评审清单（「反套路改造三指标…供 V-11 / R-40 逐条打勾」），是给评审员打勾的工件，
   * 不是给选型用户看的方案内容。
   *
   * 【为什么现在不需要了】数据层已经修好：`collect-schemes.mjs` 现在按标记切，
   * `data.js` 里 S13 的 `audit` 已经是 **306 字**、且**不含**「反套路改造三指标」这个串。
   * 实测（2026-10-27，本轮）：
   *     s13.audit.length = 306
   *     s13.audit.indexOf('反套路改造三指标') = -1
   * 于是上面那个 `if (i > 0)` **永远不成立** —— 白名单成了死代码。独立验证 Agent 也是
   * 这么判的：它逐案跑过 `indexOf`，返回 −1。
   * 死代码比删掉更贵：下一个读到这里的人会以为「S13 的数据里还有 473 字污染」，
   * 于是去查 data.js、查不到，再怀疑是不是自己看错了文件 —— 一段注释骗走半小时。
   *
   * 【如果将来又出现同类污染，怎么办】**在 `collect-schemes.mjs` 里修，不要在 UI 层打补丁。**
   * 理由不是洁癖，是这一刀本身的代价：白名单只对 S13 一例生效，`AUDIT_CUT_AT` 里多一个
   * 案子就要多读一遍那个案子的 `.md` 才能确认切点；而真正的病根（md 字段切分器只把
   * 「**加粗编号**」当字段起点，无编号的加粗小节整段被吞进上一个字段）不在 UI 层，
   * 在抽取层。修抽取层，30 案一起对；修 UI 层，你只是在给自己看不见的第 31 案留坑。
   * 这条教训留在这里而不是删掉，是因为本仓库的风格就是把犯过的错留在原地：
   * 一个「数据层修好了、UI 层补丁还在」的死代码，只有写清来龙去脉才不会再长出来。 */
  function auditText(r) {
    return r.audit || '';
  }
```

**保留了什么**：`auditText()` 这个函数本身保留（`auditFold()` 还在调它）。它是"取 audit 文本"的唯一入口，将来真需要再处理也有地方落，不必回来重新找调用点。

**注释里写死的三件事**（按任务要求）：曾经存在什么 → 为什么现在不需要（数据层已修，附实测 306/−1）→ 如果再出现同类污染要**在 collect-schemes.mjs 修，不要在 UI 层打补丁**，并给出"为什么不能在 UI 层"的具体代价（白名单只对 S13 生效，多一案就要多读一案；病根在抽取层）。

### 3.4 验证

```
$ grep -n AUDIT_CUT_AT prototypes/_selection/app.js
477:   *     var AUDIT_CUT_AT = { S13: '反套路改造三指标' };      ← 注释里的"曾经有什么"
494:   * 理由不是洁癖，是这一刀本身的代价：白名单只对 S13 一例生效，`AUDIT_CUT_AT` 里多一个
```

**0 处活代码，2 处注释命中**（符合验收标准「0 命中（或只剩注释）」）。

CDP 实测 S13 展开后 `audit` = **306 字**，且不含标记（见 §5）。

---

## 4. 任务 3：`auditFold(r)` 移到 `risk` 之前

### 4.1 改动（`app.js` fields 串）

```diff
       field('动效与交互', r.motion) +
-      field('反 AI 味风险与规避', r.risk) +
       /* 「去 AI 味审查点」（2026-10-27 接通，折叠形态）。位置是规格指定的：
-         risk 之后、scenes 之前。… */
+         ⚠️ 位置在 **risk 之前**（2026-10-27 搬过来的，原在 risk 之后）。… */
       auditFold(r) +
+      field('反 AI 味风险与规避', r.risk) +
       field('适用场景', r.scenes) +
```

同时把 `auditFold()` 头上"_为什么放在 risk 之后、scenes 之前：risk 是前置、audit 是回溯，互为背面_"_那段注释改写成了正确的因果（`audit` 是 `risk` 的前提），并把裁决 Agent 的原判据留下。数据层键序 `motion, audit, risk, landing`（`audit` idx=14 < `risk` idx=15）已对齐。

### 4.2 位置调整前后的 top 实测（1440×900，CDP，折叠块默认收起）

**测法**：只把 `foldField` 在 DOM 里 `insertBefore` 到 `riskField.nextSibling`，**不动文本**——
这样差就只来自"顺序"。用 `git stash` 对比会把 `AUDIT_CUT_AT`（改字数）一起混进来，量出来的就不只是位置了。

| 案 | audit top（现在，risk 之前） | audit top（等价改动前，risk 之后） | 差 | risk top（现在） |
|---|---|---|---|---|
| S01 | **2,263.1** | 2,416.7 | +153.6 | 2,308.9 |
| S07 | **2,289.0** | 2,468.5 | +179.5 | 2,334.8 |
| S13 | **2,677.6** | 2,883.0 | +205.4 | 2,723.4 |

三案一致：`auditTop < riskTop` 全部成立（`order_ok: true`），且改动前 `riskTop < auditTop`（`orderBefore_ok: true`，证明换序真的发生了、也确实换回来了 `restored_ok: true`）。

裁决 Agent 报的「risk 约 1,900px / audit 约 2,150px / 2.4 屏」与本轮实测（2,263–2,678px）**数值不同**，
因为这一轮面板前面又摺了预览/闸门/上站文案三块、字段内容也变过。**方向一致、绝对值随内容漂移**——
交付物里写的是此刻的实测值，不是转述裁决 Agent 的数。

---

## 5. CDP 实测汇总（`deliverables/65-exec/verify-audit-position.mjs`）

```json
{"id":"S01","foldOpenByDefault":false,"summary":"去 AI 味审查点（3 条）","summaryH":20.8,
 "foldFieldH_closed":45.8,"foldTop_closed":2263.1,"riskTop_closed":2308.9,"order_ok":true,
 "foldTop_before":2416.7,"riskTop_before":2263.1,"orderBefore_ok":true,"restored_ok":true,
 "bodyLen":292,"markerInBody":-1,
 "bodySample":"①它故意反 C-1.3 与 C-2.14——主体不是居中大标题加三张等宽卡，而是 5"}

{"id":"S07","foldOpenByDefault":false,"summary":"去 AI 味审查点（3 条）","summaryH":20.8,
 "foldFieldH_closed":45.8,"foldTop_closed":2289,"riskTop_closed":2334.8,"order_ok":true,
 "foldTop_before":2468.5,"riskTop_before":2289,"orderBefore_ok":true,"restored_ok":true,
 "bodyLen":311,"markerInBody":-1,
 "bodySample":"①它故意反 C-1.6 与 C-2.14——分区不靠白灰交替也不靠图标格子，而靠栏线"}

{"id":"S13","foldOpenByDefault":false,"summary":"去 AI 味审查点（4 条）","summaryH":20.8,
 "foldFieldH_closed":45.8,"foldTop_closed":2677.6,"riskTop_closed":2723.4,"order_ok":true,
 "foldTop_before":2883,"riskTop_before":2677.6,"orderBefore_ok":true,"restored_ok":true,
 "bodyLen":306,"markerInBody":-1,
 "bodySample":"第一，反 C-2.11「24px 圆角加柔和投影的卡片浮起」：全站圆角为 0，所有容"}

"all_order_ok": true, "all_orderBefore_ok": true, "s13_len_306": true, "all_marker_absent": true
```

三个结论：
1. **S13 展开 = 306 字，`markerInBody = -1`** —— `AUDIT_CUT_AT` 删掉后没有任何回归，因为数据层已是终态。
2. **三案 `audit` top < `risk` top** —— 任务 3 的 UI 判据成立。
3. 折叠块收起态恒 **45.8px**（summary 20.8 单行）—— 注释里原来写「+46px」，实测 45.8，已按实测改。

截图旁证：`deliverables/65-exec/shots-panel/S01-audit-before-risk.jpg`、`S07-…`、`S13-…`。

---

## 6. 任务 4：README 同步

### 6.1 中文版（`README.md`）

**(a) 「看效果」章节，点开一行的说明后面新增一段**（这是任务点名的位置）：

> **第 12 段字段「去 AI 味审查点」是折叠的**：`data.js` 里 **30/30 有值**（最短 276 字、最长 444 字、全库合计 10,065 字，中位数 324），此前它只存在数据里、页面上一个字都看不到。默认收起，summary 上写「去 AI 味审查点（N 条）」——N 从正文里的编号符现算（`①②③` / `第一，第二，` / `（1）（2）` 三派写法取最大，不写死），展开后一个字不截。它排在**「反 AI 味风险与规避」之前**：审查点讲「这案故意反了哪几条 AI 陈词」（逐条带 `C-x.y` 条款编号），风险讲「所以照抄它时最容易做错成什么样」——前者是后者的前提，反过来读，风险里那些「别把 X 做成 Y」就没有前文可指。

**(b) 上一行原来写「全部字段（多数案子 10 段）」**——这句本身就是腐化（实测 30/30 都是 12 段，见 `panel/fields`）。改成「全部 12 段字段」。

**(c)「仓库里有什么」→ 12 个字段那段后面补一句**：

> 这 12 段在选型台上**全部渲染出来**（30/30，不是抽样）；其中「去 AI 味审查点」是折叠的一段，因为它最长且最"给评审员看"——展开方式见[看效果](…)。

### 6.2 英文版（`README-EN.md`）同步

对应三处：

- `all 12 fields`（原 `all the fields (10 sections in most schemes)`）
- `**The 12th field, "anti-AI-cliché review points", is collapsed**: data.js carries it for **30 of 30 schemes** (shortest 276 characters, longest 444, 10,065 in total, median 324) … It sits **before "anti-AI-cliché risks and how they are avoided"** …`
- `All 12 are **rendered in the selection bench** (30 of 30, not a sample); …`

### 6.3 中英一致性（`i18n/facts`）

```
✓ i18n/facts        中英两版的关键事实一致（方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集）
```

另外单独跑 `check-docs.mjs README-EN.md`：**0 FAIL / 1 WARN（i18n/pair 是设计上的退化）/ 12 PASS，exit 0**。

### 6.4 写 README 时踩到的一个坑（值得记）

第一版写的是「276–444 字，中位 324」——`nums/prompt-len` 立刻红了：

```
✗ nums/prompt-len  提示词长度断言不成立：区间下限 写 276，实测 1632；区间上限 写 444，实测 1920
```

因为那条断言把所有 `N–M 字` 都当提示词长度。这不是它写错了（README 里别的 `N–M 字` 都确实在讲提示词），是我用了一个**在这个语境里已经有主的句式**。改成「最短 276 字、最长 444 字、全库合计 10,065 字，中位数 324」既避开歧义，也更好读。

> 同一类问题在英文版又来了一次：我写 `10,065 in total, median 324`，`panel/fields` 的合计正则是
> `(?:合计|in total)[^\d]{0,12}(\d{3,7})`，**只认中文语序**，于是先撞上 `median 324` ⇒ 报「合计 写 324，实测 10065」。
> 已改成双语两种语序都认。

---

## 7. 验收（全部实跑，原文粘贴）

### 7.1 `node prototypes/_build/check-docs.mjs` → 0 FAIL / 0 WARN / 13 PASS，exit 0

```
文档一致性：README.md ↔ data.js / prompts.js / prompt-copy.js
  ✓ ids/exist            文档提到的方案编号全部存在（data.js 30 案）
  ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数
  ✓ nums/gate            闸门 FAIL=0 的案数 = 26，与实测一致
  ✓ nums/warn-axes       警告两轴：hard 4 / degrades 13 / 并集 14，文档口径一致
  ✓ nums/prompt-len      提示词长度 = 1632–1920，中位 1822，文档一致
  ✓ nums/scenes          场景词 44 / 直连 16 / 近似 28 / 标为没有 29，文档一致
  ✓ status/fixed-claims  没有把已修项写成未修
  ✓ status/layout-fix    layout 抽取 30/30 有值，S12/S15/S19 = 549/640/420 字
  ✓ panel/fields         12 段字段（field() 11 + auditFold 1），audit 30/30 有值（276–444，中位 324，合计 10065），顺序 audit → risk，S13 = 306 字且无评审工件
  ✓ i18n/facts           中英两版的关键事实一致（方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集）
  ✓ paths/exist          文档里 15 条仓库路径全部存在
  ✓ paths/templates      文档提到的模板编号都存在
  ✓ regression/banned    6 条已腐化原话均未回归

README.md: 0 FAIL / 0 WARN / 13 PASS
EXIT=0
```

（要求「≥12 PASS」；现在 13，多的一条是新增的 `panel/fields`。）

### 7.2 `--selftest` → 全部通过（含新增用例）

```
  ✓ 自测一（三处已知腐化）：全部被对应断言抓出，退出码 1
  ✓ 自测二（七个用例）：四改坏 + 一守门员全部 FAIL、两误报均不报错
  ✓ 自测通过：三处已知腐化 + 七个用例全部符合预期
EXIT=0
```

自测一那一段的 5 FAIL 是**故意改坏后**的输出（README.md: 5 FAIL / 0 WARN / 8 PASS），正是它应该红的样子。

### 7.3 四个改坏 + 两个误报 → 见 §2.1 / §2.2（原文已贴）

### 7.4 `verify-prototype.mjs --all` → 26 / 4 / 30

```
✓ S30 S30-skate-sticker-split   html 27.5K / css 24.7K / FAIL 0 / WARN 2 (no-footage measure) / 真图 8 / 11 屏 / 截图 10 / report at 2026-10-25T00:45:56.624Z

达标 26 / 不达标 4 / 共 30
EXIT=1
```

> exit 1 是**既有状态**，不是本次引入：4 个不达标案（S07/S08/S13/S21，共 8 条 FAIL）本来就写在 README
> 「做不到与已知边界」里。26/4/30 与要求一致。

### 7.5 `node --check prototypes/_selection/app.js`

```
$ node --check prototypes/_selection/app.js
EXIT=0
```

### 7.6 CDP 实测 → S13 audit 306 字 / audit top < risk top（三案）→ 见 §5

### 7.7 `grep AUDIT_CUT_AT` → 只剩注释

```
prototypes\_selection\app.js:477:   *     var AUDIT_CUT_AT = { S13: '反套路改造三指标' };
prototypes\_selection\app.js:494:   * 理由不是洁癖，是这一刀本身的代价：白名单只对 S13 一例生效，`AUDIT_CUT_AT` 里多一个
```

### 7.8 编码：三/四个文件全部无 BOM + LF

```
prototypes/_selection/app.js       BOM=false CRLF=0 LF=899  bytes=53186
prototypes/_build/check-docs.mjs   BOM=false CRLF=0 LF=945  bytes=61985
README.md                          BOM=false CRLF=0 LF=488  bytes=43899
README-EN.md                       BOM=false CRLF=0 LF=492  bytes=49550
```

另外核活代码里的 `AUDIT_CUT_AT`（剥注释后数）：

```
live AUDIT_CUT_AT occurrences: 0
```

——`grep` 那 2 处命中全部在注释里，剥掉注释后是干净的 0。

全程用 `edit` / `write` 工具改，没有用 `Set-Content` 重写这四个文件（临时探针脚本才用 `Set-Content`，且都已删除）。

---

## 8. 我可能弄坏的地方

按"最可能先炸"排序。

### 8.1 🔴 2a 的 ② 规则（小句语境）可能**吞掉一个真错写**

这是本次改动**最危险的一处**，也是最难自证的一处。

`OTHER_AXIS` 里有个 `轴` 字。如果将来有人在**同一小句**里写「30 个方案这条轴上…」——真总数、但含 `轴` ——就会被放过。同理 `机制` `场景`。

**为什么还是这么写**：不放宽就会像旧版那样靠魔数；而中文里"总数"和"别的轴"高度依赖语境，没有纯语法解。**折中办法是让规则的输出可读**：一旦它真误放过了，`nums/schemes` 会显示 "= 30，文档未出现别的总数"，此时改坏 2/4 那两个用例仍会红 —— 也就是说**整数附近的错写（30→31/29/40）这四类有确定性保护**，不确定的只是"这句话算不算在讲总数"。想彻底消灭这类漏报，出路是给 README 的关键数字加**不可见的锚点标记**（如 `<!--n:30-->`），让检查器读标记而不是读句子 —— 那是另一个项目级的改动，本轮没做。

### 8.2 🟠 `cnToNumber` 的覆盖边界（实测过，不是猜的）

19 条解析用例（`CN_CASES`，每次 `--selftest` 都跑）盖住的是：一–九、十–九十九、廿/卅/卌、一百/两百/一百二十三/两百零一。

**没盖住的**：`一千`、`两千零一十七` 这类千位写法（返 `null` ⇒ 放过，方向是漏报不是误报）；`一百一` 这种口语省「十」的写法（会被读成 101 而不是 110——**这是唯一的"读错"而不是"读不出"**，但它要求文档里出现「一百一 个方案」，现实中不会这么写）。

README 现在最大的中文数字是 44（44 个行业词），离边界很远。**如果将来文档开始用中文写四位数，这段必须扩**——扩的时候往 `CN_CASES` 里加行，不要只改正则。

### 8.3 🟠 `panel/fields` 数 `field()` 调用**依赖 app.js 的代码形态**

它是字符串匹配（剥注释后数 `field('`）。如果有人把 `field(` 改写成 `field (\n  '×'`（换行 + 空格不同）或改成数组驱动渲染，计数会掉，`panel/fields` 会红。**这个方向是安全的（红而不是绿）**，但会让人误以为"README 写错了"。注释里已写明"本项目没有正则字面量里带 `/*` 的写法；有的话后果是漏数一个 field()，错在安全侧"。

### 8.4 🟡 注释剥离是 `\/\*[\s\S]*?\*\/` —— 对**字符串里的** `/*` 会误剥

app.js 里目前没有 `'/*'` 这种字面量。若将来出现（比如正则或 CSS 片段），注释剥离会多吃一段，可能少算 `field()` ⇒ `panel/fields` 误红。同 8.3，错在安全侧。

### 8.5 🟡 我在 README 里新加了 4 个数字（276 / 444 / 10,065 / 324）+「12 段」

它们现在**全部被 `panel/fields` 钉住**——这是好事，但也意味着：**任何一次 `data.js` 里 `audit` 内容的正常更新（哪怕只改一句话）都会让 `check-docs` 红**，然后必须同步改 README。这是刻意的（数字进文档就得被查），但下一个只改数据、没跑 check-docs 的人会被这条红拦住一次。如果觉得太紧，把 `panel/fields` 里那四个数改成容差（像 `nums/prompt-len` 的 3% DRIFT）是合理的下一步，**但不要直接删断言**。

### 8.6 🟡 我改了 `README.md` 「多数案子 10 段 → 全部 12 段字段」

这句原来就是错的（实测 30/30 都是 12 段）。但如果 Lead 那边的口径是"12 个字段"指**规格字段**、而面板只渲染其中 11+1，那么这两处措辞可能需要再对一次。我按 `data.js` 实测（12 个有值字段，30/30）写的。

### 8.7 🟢 没碰的东西（明确声明）

`data.js`、`prompts.js`、`collect-schemes.mjs`、`style.css`、`prompt-copy.js`、`wizard.js`、`prototypes/S*/`、`templates/` —— **一个字节都没改**。`git status` 里这些文件的 `M` 是本轮别的 Agent 留下的。

我只新增了三个**交付物目录下的取证文件**（不是产品代码）：
`deliverables/65-exec/verify-audit-position.mjs`（CDP 实测）、`deliverables/65-exec/prove-blindspot.mjs`（改坏/误报复现机）、`deliverables/65-exec/shots-panel/*.jpg`（截图旁证）。

### 8.8 🟢 一处已知的"不进仓"残留

`deliverables/65-exec/_app.diff` / `_app.head.js` / `_acc*.txt` 是我取证时的临时产物，留在交付物目录里作原始输出备份。**`_app.diff` 是二进制（含中文，git 判成 binary）**，别指望 `git diff` 能读它；要看 diff 直接 `git diff prototypes/_selection/app.js`。

---

## 9. 复现命令一览

```bash
# 主检查（0 FAIL / 0 WARN / 13 PASS）
node prototypes/_build/check-docs.mjs

# 英文版单跑（0 FAIL / 1 WARN 设计内退化 / 12 PASS）
node prototypes/_build/check-docs.mjs README-EN.md

# 自测：三处已知腐化 + 七个用例
node prototypes/_build/check-docs.mjs --selftest

# 盲区复现机（四个改坏 + 两个误报 + 一个对照，独立临时目录）
node deliverables/65-exec/prove-blindspot.mjs

# 位置 / 字数实测（需本机 Chrome；CDP）
node deliverables/65-exec/verify-audit-position.mjs

# 原型机械复核（26 / 4 / 30，exit 1 是既有状态）
node prototypes/_build/verify-prototype.mjs --all

# 语法
node --check prototypes/_selection/app.js
```
