# 74 · 工具链侦察（TOOLCHAIN specialist）

仓库：`D:/Web/style` · Git Bash · Node **v26.12.1**

## 0. 起始状态

```
$ git status --porcelain | grep -v '^??'
（空）
```
未跟踪文件很多（deliverables/62-74 的取证脚本），**无已修改的跟踪文件**。因此后续 `git checkout --` 安全。

---
## Gate 1 — `check-docs.mjs`

```
$ node prototypes/_build/check-docs.mjs
EXIT = 0        wall = 17.1s
```
输出末尾：
```
文档一致性：README.md ↔ data.js / prompts.js / prompt-copy.js
  ✓ ids/exist            文档提到的方案编号全部存在（data.js 30 案）
  ✓ nums/schemes         方案/原型总数 = 30，文档未出现别的总数
  ✓ nums/gate            闸门 FAIL=0 的案数 = 29，与实测一致
  ✓ nums/warn-axes       警告两轴：hard 4 / degrades 13 / 并集 14，文档口径一致
  ✓ nums/prompt-len      提示词长度 = 1814–2138，中位 1988，文档一致
  ✓ nums/scenes          场景词 44 / 直连 16 / 近似 28 / 标为没有 29，文档一致
  ✓ status/fixed-claims  没有把已修项写成未修
  ✓ status/layout-fix    layout 抽取 30/30 有值，S12/S15/S19 = 549/640/420 字
  ✓ panel/fields         12 段字段（field() 11 + auditFold 1），audit 30/30 有值（276–444，中位 324，合计 10065），顺序 audit → risk，S13 = 306 字且无评审工件
  ✓ i18n/facts           中英两版的关键事实一致（方案数 / 达标数 / 行业词数 / 提示词区间 / 警告并集）
  ✓ paths/exist          文档里 16 条仓库路径全部存在
  ✓ paths/templates      文档提到的模板编号都存在
  ✓ regression/banned    6 条已腐化原话均未回归

README.md: 0 FAIL / 0 WARN / 13 PASS
```
写入性：无（只读 README + data.js/prompts.js/prompt-copy.js）。git status 仍干净。

## Gate 2 — `check-docs.mjs --selftest`

```
$ node prototypes/_build/check-docs.mjs --selftest
EXIT = 0        wall = 53.3s
```
自测在临时副本上把三处已修腐化「改回原位」，验证断言确实会红。实测 5 FAIL / 8 PASS（副本），
然后两组用例全绿：
```
  ✓ 自测一（三处已知腐化）：全部被对应断言抓出，退出码 1
  ✓ 改坏 1..4 / 误报 1..2 / 改坏 5（panel/fields 守门员）
  ✓ 自测通过：三处已知腐化 + 七个用例全部符合预期
```
写入性：自测只在临时目录操作（`--root`），结束删除。仓库未被触碰。

## Gate 3 — `check-contract.mjs`

```
$ node prototypes/_build/check-contract.mjs
EXIT = 0        wall = 10.1s
```
```
契约一致性闸门：§9.15 允许表(5 条) vs 30 案实测 FAIL
  查的是「FAIL ⊆ 允许表」（契约 §7.2），不是「FAIL = 0」
  C1 FAIL 全在允许表内        2/2
  C2 允许表的规则引擎里都存在  5/5
  C3 登记但无案触发（INFO）    3 条
  C4 文档声称 vs 实测           0 处声称被核，0 处矛盾
  C5 登记规则的 FAIL 分支       3/5 条可能产生 FAIL
  C6 未解析的规则行             0 行
· [C3-allow-rule-unused] 3 条登记规则当前没有任何案触发: mono, font-fallback, measure
· [C4-no-claims-found] 三份文档里没有抽取到「某案有 N 处 X 未清」这类硬声称，C4 本次无输入
~ [C5-allow-rule-cannot-fail] 2/5 条登记规则没有 FAIL 分支（只有 WARN）: font-fallback, measure
合计 FAIL 0 / WARN 1 / INFO 2
```
**关键自曝**：本闸门自己的 C5 就指出 5 条豁免里 2 条（font-fallback / measure）**永远不可能红**，
C1 的有效判定面只有 3/5。这是「注册了但没法失败」的规则，已由闸门自己记录为 WARN。

写入性：只读 `_CONTRACT.md`、30 份 report.json、`tools/.../rules.mjs`。

## Gate 4 — `check-prompts.mjs`

```
$ node prototypes/_build/check-prompts.mjs
EXIT = 0        wall = 15.9s
```
```
提示词闸门：检查 30 条提示词（源: prototypes/_selection/prompts.js + prompt-copy.js
  vs prototypes/Sxx/style.css + index.html）
  长度 1814–2138，中位 1988  配色段 hex 合计 168
· [hex-outside-palette-line] 1 条（信息，不需动作）
    S25  配色段之外还有 1 个 hex: #181c0d
合计 FAIL 0 / WARN 0
```
写入性：只读。

## Gate 5 — `check-twolines.mjs`

```
$ node prototypes/_build/check-twolines.mjs
EXIT = 0        wall = 11.7s
```
```
两链关系闸门：data.js(30 案) ↔ prompts.js(30 案)
  R1 data.js ⊆ prompts.js           30/30
  R6 UI 的「主色」= 规格声明的主色   30/30   ← 替换已删除的 R2/R3/R4（恒真式）
  R7 调色板条目都带角色名            30/30   ← 色值不带语义，角色名是 AI 的唯一依据
  R8 data.js 的 fontsSpec 非空       30/30
  R5 补色有 CSS 角色注释（INFO）     33/53
· [R5-extra-no-role] prompts.js 补了 20 个没有 CSS 角色注释的色（排查线索，非缺陷）
合计 FAIL 0 / WARN 0
```
**作者自述 R2/R3/R4 是恒真式，已删除换成 R6** —— 这是少数主动清掉同义反复断言的门。
写入性：只读。

## Gate 6 — `check-texture.mjs`

```
$ node prototypes/_build/check-texture.mjs
EXIT = 0        wall = 11.3s
```
```
纹理载体闸门：31 个 style.css（30 案 + 产品入口）
  已检查 style.css        31
  body/html 规则数        85
  违规                     0
合计 FAIL 0 / WARN 0
```
写入性：只读。

## Gate 7 — `check-anchors.mjs`

```
$ node prototypes/_build/check-anchors.mjs
EXIT = 0        wall = 9.8s
```
```
锚点完整性：扫了 31 个入口
  动态拼接的（需人工确认，不算死锚点）：1 处
     S05  href="#dg-' + keys[i] + '"
  ✓ 无死锚点
```
写入性：只读。

## Gate 8 — `check-stale.mjs`

```
$ node prototypes/_build/check-stale.mjs
EXIT = 0        wall = 13.6s
```
```
闸门陈旧度：检查 30 案 + 1 个产品入口
  ✓ 全部新鲜
```
写入性：只读（stat mtime）。

## Gate 9 — `verify-prototype.mjs --all`

```
$ node prototypes/_build/verify-prototype.mjs --all
EXIT = 1        wall = 6.6s
```
汇总行：`达标 28 / 不达标 2 / 共 30`

两个 ✗：
```
✗ S02 S02-gilded-symmetry-salon
    html 25.7K / css 21.1K / FAIL 0 / WARN 2 / 真图 7 / 截图 8
    · body 规则挂了背景图 → 对比度检查会静默跳过
✗ S08 S08-amber-overprint-lightbox
    html 20.2K / css 15.4K / FAIL 2 / WARN 2 / 真图 6 / 截图 10
    · 闸门 FAIL=2：palette-terracotta font-count
```

### S02 —— 这是 **checker bug**（注释盲正则），不是真缺陷

`verify-prototype.mjs:76-77`：
```js
for (const m of C.matchAll(/(?:^|\})\s*(body|html)\s*\{([^}]*)\}/g)) {
  if (/background-image|background\s*:[^;]*url\(/.test(m[2])) out.problems.push(...)
```
它拿到的 `body {…}` 块正文（实测，`node -e` 直接复现）：
```
"\n  margin: 0;\n  background-color: var(--card);\n  /* 炭黑卡纸的纤维纹理**不在这里** …\n
   * 原本 `background-image: url(\"assets/card-grain.png\")` 直接挂在 body 上，\n …"
MATCH?: true      ← 命中位置全是 CSS 注释里的说明文字
```
真正的 `background-image` 在 `style.css:44`，属于 `body::before`（契约 §9.2 **推荐**的做法）。
`body` 块本身只有 `background-color: var(--card)`（L51）。

决定性反证：**同一份 report.json 写着 `FAIL 0`**（S02 的两条 WARN 是 card-rows 一类，
不含 contrast 相关 FAIL）。若 body 真挂了背景图，`bgBehind()` 短路会让 contrast 全部静默通过，
但那不是 FAIL。也就是说 `verify-prototype` 自己加的这条检查比真闸门更严且更错。

**同文件内自相矛盾**：`verify-prototype.mjs:18-25` 定义了 `stripNonRendered()`（剥 `/* */`），
但只给 Emoji 检查用；第 76 行的 body 检查**没有**先剥注释。全仓其它 CSS 检查器
（`check-texture.mjs:47` 的 `stripComments`、`clean-dna.mjs:43` 的 `CSS_COMMENT_RE`）都剥了。
后果：`--all` 的汇总 `达标 28 / 30` 与 README L160「29 个闸门 FAIL=0」、与
`check-docs` 的 `nums/gate = 29` **直接冲突**，而 `check-docs` 读的是 report.json
（不含这条伪检查），所以这个冲突**没有任何闸门会报**。

### S08 —— 真 FAIL，但已被 §9.15 豁免

`palette-terracotta` + `font-count` 两条，均在 §9.15 允许表内（`check-contract` C1 = 2/2 通过）。
README L160 写「29 个闸门 FAIL=0，剩下 1 个的 2 条失败」——与此一致。
所以 S08 不是缺陷，是**已登记的豁免**；`verify-prototype` 把「FAIL≠0」一律算不达标，
不查允许表 —— 这是口径差异，不是 bug，但使 `--all` 的退出码**永远为 1**（见覆盖矩阵）。

写入性：只读。

## Gate 10 — `collect-schemes.mjs --check`（干跑，不写盘）

```
$ node prototypes/_build/collect-schemes.mjs --check
EXIT = 0        wall = 14.9s
```
尾部（字段缺失扫描，全部为空）：
```
缺 一句话视觉定义：无        缺 美学家族：      无        缺 字体策略：      无
缺 布局与网格：    无        缺 去 AI 味审查点：无        缺 可落地要点：    无
缺 真实上站文案：  无        缺 背景或主色：    无        缺 错误码：        无
配色 < 3 个：      无
```
30 案逐行表格全部 `✓ FAIL=0 WARN=n`。`git status` 后仍干净（`--check` 不写盘）。

## 可复现性 A — `build-prompts.mjs` 重生成 `prompts.js`

```
$ sha256sum prototypes/_selection/prompts.js   # 重生成前
e896829a7751fe3b2542c5e4f9f4116845d7ad7dfa041544a6d6a2df034ba6da

$ node prototypes/_prompts/build-prompts.mjs
EXIT = 0        wall = 20.6s
sha256sum prototypes/_selection/prompts.js     # 重生成后
e896829a7751fe3b2542c5e4f9f4116845d7ad7dfa041544a6d6a2df034ba6da
```
**逐字节相同。** `git status` 干净（无变化即无需 checkout）。
也就是说 `prompts.js` 是**可复算的 tracked 产物**，不是手搓的。

## 可复现性 B — `collect-schemes.mjs` 重生成 `data.js`

第一次（写盘）：
```
原型 sha256 = 18b1d7e120f622b3b400e4465dbf8e56b9725c9b5b017b18dbbd68a8649feb42
$ node prototypes/_build/collect-schemes.mjs
EXIT = 0        wall = 13.9s
后   sha256 = 4132d82ecfab3f76c6d885cacd05fc163a1f8e1d27ab87ae487630444d3ad340
git status → M prototypes/_selection/data.js    (1 file changed, 1 insertion(+), 1 deletion(-))
```

逐行对比（2574 行 vs 2574 行）：**只有 1 行不同**，L53：
```diff
-   "at": "2026-10-30T19:58:35.701Z",
+   "at": "2026-10-30T21:09:07.391Z",
```
归一化掉所有 `"at": "…"` 后：`normalized identical? true`，长度同为 158066 字节。

第二次（连续跑）：`4132d82e… → 4132d82e…` **完全稳定**（7.0s）。
⇒ 生成器本身是**确定性的**，唯一的非确定量是 `at` 时间戳。

### ⚠️ 但这条 diff 暴露了一个真缺陷：入库的 `data.js` 是**陈旧**的

我逐案把 `data.js` 里内嵌的 `at` 与对应 `.inspect/report.json` 的 `at` 对了一遍：
```
mismatched at: 1 / 30
  S01  data= 2026-10-30T19:58:35.701Z   report= 2026-10-30T21:09:07.391Z
```
即：**S01 在 21:09 重渲染过（报告更新），但 `data.js` 还停在 19:58 那一版**，
选型台展示的 S01 闸门摘要/屏数/截图清单是 71 分钟前的。

而 `check-stale.mjs` 只比「源文件 mtime vs report.at」，**它不看 `data.js` 内嵌的 `at`**，
所以这个陈旧度**没有任何闸门会报**（它报的是「全部新鲜」）。
这是「生成物陈旧」这一类缺陷的漏网：`data.js` 是 `collect-schemes` 的产物，
而 `_entries.mjs:50-62` 明确把 `data.js` 从 check-stale 的 sources 里**排除**了
（理由写得对：避免自我循环误报），但**没有补上替代的守卫**。
理论上 `check-docs` 的 `nums/*` 应兜底——实测它确实没报，因为 S01 的屏数/真图数在新旧两版里相同，
只有 `at` 变了；`nums/*` 只查「数量」，不查「时间戳」。

**结论**：`at` 这类元数据在生成物里完全无守卫。修法应在 `check-stale` 加一条：
「`data.js` 每个 `Sxx.at` 必须 === 该案 `report.json.at`」——这条不会自我循环。

已恢复：`git checkout -- prototypes/_selection/data.js` → 确认干净（sha 回到 `18b1d7e1…`）。

## 生成器 A — `render-scheme.mjs S02-gilded-symmetry-salon` ❌ 本机跑不通

```
$ node prototypes/_build/render-scheme.mjs S02-gilded-symmetry-salon
EXIT = 6        wall = 52.2s
```
```
file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs:61
      const t = setTimeout(() => reject(new Error('Chrome did not start within 20s')), 20000);
Error: Chrome did not start within 20s
report.json 与渲染前逐字节相同（inspect exit=1）—— 声称成功但没写报告，判为失败。
```
原因：`cdp.mjs` 以「连接已存在 profile 的 Chrome 实例 / 特定启动参数」的方式拉 Chrome，
本机（Windows, Chrome 已安装于 `C:\Program Files\Google\Chrome\Application\chrome.exe`）
20s 内没等到 CDP 端口。

### 🔴 顺带抓到一个破坏性缺陷：渲染失败会**删掉已入库的截图**

失败后 `git status`：
```
 D prototypes/S02-gilded-symmetry-salon/.inspect/desktop-fold.jpg
 D prototypes/S02-gilded-symmetry-salon/.inspect/desktop-page-01.jpg
 D prototypes/S02-gilded-symmetry-salon/.inspect/desktop-page-02.jpg
 D prototypes/S02-gilded-symmetry-salon/.inspect/mobile-fold.jpg
 D prototypes/S02-gilded-symmetry-salon/.inspect/mobile-page-01.jpg
 D prototypes/S02-gilded-symmetry-salon/.inspect/mobile-page-02.jpg
 D prototypes/S02-gilded-symmetry-salon/.inspect/tablet-fold.jpg
 D prototypes/S02-gilded-symmetry-salon/.inspect/tablet-page-01.jpg
（8 张 .jpg 全被删除；report.json 侥幸没变）
```
机制：`render-scheme.mjs:42` 把 `--out prototypes/<name>/.inspect` 传给 `inspect.mjs`，
`inspect.mjs` 开跑前会清空输出目录（`unlinkSync` 见其 import），然后在写截图之前
Chrome 起不来就崩了 ⇒ **目录被清、图没了、report 还是旧的**。
commit 里 321 个 `.inspect/*` 文件是 tracked 的，所以这是一次真实的交付物破坏。
唯一挡住它的是 git；若在未提交的工作区跑，8 张图直接丢失。

**已恢复**：`git checkout -- prototypes/S02-gilded-symmetry-salon/.inspect/` → 干净（0 项）。

### 重试确认（同一台机器、同一命令，第二次）

```
$ node prototypes/_build/render-scheme.mjs S02-gilded-symmetry-salon
EXIT = 6        wall = 41.4s
Error: Chrome did not start within 20s   （cdp.mjs:61）
```
两次一致失败，排除了偶然。

### 根因量化

我直接用 `cdp.mjs` 的**同一组参数**（`--headless=new --remote-debugging-port=0
--user-data-dir=<tmp> --enable-unsafe-swiftshader --window-size=1440,900 about:blank`）
拉 Chrome 并打点：
```
DevTools line at 14140 ms
```
即本机 Chrome 从 spawn 到打出 `DevTools listening on ws://…` 需要 **14.1 s**，
而 `cdp.mjs:61` 的硬超时是 **20000 ms** —— 只有 1.41× 余量。
Windows + 冷启动 + 该 Chrome 版本在枚举 USB 设备（stderr 里有
`usb_descriptors.cc` 报错）时抖动，就会越线。
⇒ 这是**环境敏感的超时**，不是「本机没装 Chrome」。换台更快的机器能跑，
但这条链的失败模式是「静默 + 破坏性」（见下），所以它是真风险。

## 生成器 B — `shot.mjs`（零第三方依赖的截图取证）

```
$ node prototypes/_build/shot.mjs prototypes/S01-red-wedge-broadsheet/ \
    --out <tmp> --widths 1440 --name S01
EXIT = 0        wall = 151.8s
```
```
[1440x900] mode=direct window=1456x995
   页高 5069（真视口 5069）  来源=fold-viewport  6 屏  校准=ok
   首屏 1440x900 793.6 KB   整页 1440x5069 5.89 MB   切片 6 张  对得上=true
   整页平均亮度 139.579 主色 #1a1614 18.2%  字体 loaded  断链图 0
   ! 最后一屏只有 569 像素高（5069 - 5*900）
! 有 2 个资源 404：/favicon.ico（两次，间隔 60s）
report.json -> <tmp>/report.json
失败 0 档：[]
```
**这条链在本机可用**，且零 npm 依赖（只用 Node 内置 http + 系统 Chrome CLI + Pillow）。
耗时 152 s（单档 1440）—— `--widths 1440,768,390` 三档会接近 7–8 分钟量级。
`favicon.ico` 404 是所有原型共有的噪声（页面没放 favicon），不阻断。

写入性：输出到 `--out` 指定目录（本次在 tmp），**未触碰仓库**，git 仍干净。

## 硬依赖实测：把 `tools/` 整个移走后逐个跑

`tools/` 是 `.gitignore` 第 2 行排除的（未锚定模式，任意深度匹配），**不在仓库里**。
本机存在 `tools/taste-skill/…`（vendored，93 个文件），所以能跑。为确定「哪些脚本在没有
`tools/` 时硬失败、错误原文是什么」，我把 `tools/taste-skill` 移到临时目录后逐个跑：

| 脚本 | 无 `tools/` 时 exit | 行为 |
| --- | --- | --- |
| `check-docs.mjs` | **0** | 不受影响（不 import tools） |
| `check-prompts.mjs` | **0** | 不受影响 |
| `check-twolines.mjs` | **0** | 不受影响 |
| `check-texture.mjs` | **0** | 不受影响 |
| `check-anchors.mjs` | **0** | 不受影响 |
| `check-stale.mjs` | **1** | ⚠️ 见下 —— 与 tools/ 无关，是我自己的写入触发的 |
| `check-contract.mjs` | **1** | **正确红**：`[C2-engine-unreadable] 读不到规则引擎的 RULE_IDS (…/rules.mjs)，C2 无法判定` → `合计 FAIL 1` |
| `verify-prototype.mjs --all` | **1** | 同前（28/30），**不因 tools/ 变化** —— 它是纯文本检查器 |
| `render-scheme.mjs` | **4** | 显式报错：`缺渲染引擎：…/inspect.mjs  tools/ 不在仓库里（.gitignore:2 排除）——本机需自备 taste-skill` |
| `_s03-probe.mjs` | 立即 `ERR_MODULE_NOT_FOUND` | import `../../tools/.../cdp.mjs` |

**结论**：`check-contract`、`render-scheme`、`_s03-probe` 三个是硬依赖 `tools/` 的；
其余 8 个检查器完全不碰它。`check-contract` 在缺引擎时**会红**而不是静默通过 ——
这点做得对（它自己的注释 §9.22 记录过 tools/ 无声蒸发的事故）。

---
## 🔴 真缺陷 2 — `check-stale.mjs` 有 2 类假阳性，其中一类会**把干净 clone 判成脏**

把 `tools/` 移回后那次 `check-stale` 报了两条「陈旧」：
```
⚠️ 2 项陈旧（源文件比 report.json 新，说明改了没重渲染）：
   截图与报告不同步(S02)  tablet-page-01.jpg（截图比 report.json 新）落后 5547 分钟
   选型台(_selection)  prompts.js 落后 5505 分钟
```
两条都**不是**「改了没重渲染」，逐条查：

### (a) `prompts.js` 被当成「源」，但它其实是**生成物**
`_entries.mjs:47-49` 把 `prompts.js` 列进 `_selection` 的 `sources`：
```js
sources: [
  'index.html', 'style.css', 'app.js',
  'prompt-copy.js', 'prompts.js',
```
而 `prototypes/_prompts/build-prompts.mjs` 就是**生成 `prompts.js` 的脚本**（文件头第 1 行自述：
「生成 prototypes/_selection/prompts.js」）。同一文件 L50-62 已经为 `data.js` 写了一段很长的
理由解释「产物不能列进 sources，否则会自我循环误报」—— **`prompts.js` 犯了完全相同的错，
却漏掉了**。实测：我跑一次 `build-prompts.mjs`（输出**逐字节相同**，sha 不变），
`prompts.js` 的 mtime 就跳到 2026-11-03T16:52，而 `_selection/.inspect/report.json` 的 `at`
还是 2026-10-30T21:07 ⇒ 落后 5505 分钟。**任何一次重生成 prompts.js 都会立刻把
check-stale 打红，而实际上什么都没变。**

### (b) `tablet-page-01.jpg` 的判据在**我的恢复操作**下误报
判据（check-stale.mjs:35-39）是 `jpg.mtime > report.json.mtime`。注释里说实测 1/30，
且解释「成功渲染必然让 jpg 比 at 新，所以不能用 at」—— 这个推理是对的。
但 `report.json.mtime` **不是只被渲染更新**：我用 `git checkout -- .inspect/` 恢复被我
弄坏的截图时，**report.json 也一起被 checkout 了**（内容没变，mtime 变了）。
实测：report.json mtime = 2026-11-03T13:24，tablet-page-01.jpg mtime = 2026-11-03T17:31
（我恢复 S02 两次，第二次只 checkout 了 jpg？—— 不，是因为 `git checkout` 只重写
内容有差异的文件：第一次恢复了 8 张 jpg + 0 个 report；第二次 8 张 jpg 又恢复一次，
而 report.json 两次内容都没变 ⇒ 只有 jpg 的 mtime 被刷新）。
⇒ **判据把「mtime」当成「内容新鲜度」，而 git checkout 只改 mtime 不改内容。**
这是 `check-stale` 的**结构性局限**：它无法区分「有人改了源」与「有人把文件恢复成原样」。
好消息是它只影响本地工作区，不影响 clone；坏消息是它会逼人在恢复后去重跑一次渲染。

**判定**：(a) 是**真 bug**（生成物被当源，必然在每次重生成后误报）；
(b) 是**判据固有局限**（可容忍，但应写进文档，否则下一个人会以为真的陈旧了）。
两者都**不是**内容层面的缺陷。

## 1. 资产清单（`prototypes/_build/` 23 个 .mjs + 3 个 .py，`_prompts/` 4 个 .mjs + 1 个助手）

> 类型：**G**=生成器（写 tracked 文件）、**C**=检查器/闸门（断言）、**T**=工具/一次性取证、**S**=库

| 脚本 | 类型 | 产出 / 断言 | 输入 | 输出（是否 tracked） |
| --- | --- | --- | --- | --- |
| `_entries.mjs` | S | 「哪些目录有闸门报告」的**唯一定义处**：`caseDirs` / `productEntries` / `allDirs` | `prototypes/` 目录名 | 无（被 3 个检查器 import） |
| `check-docs.mjs` | C | 13 条：README 的编号/总数/闸门计数/警告轴/提示词长度/场景词/已修未修/layout/12 段字段/中英一致/路径存在/模板存在/腐化回归 | README.md、`_selection/data.js`、`prompts.js`、`prompt-copy.js`、`.inspect/report.json` | `--selftest` 写临时目录 |
| `check-contract.mjs` | C | C0–C6：FAIL ⊆ §9.15 允许表；允许表规则在引擎里存在；登记的规则是否**可能**红；表格格式 | `_CONTRACT.md`、30 份 `report.json`、**`tools/…/rules.mjs`（仓库外）** | 无 |
| `check-prompts.mjs` | C | 30 条提示词的配色/字体/线宽/字号必须等于 `style.css` 真实声明（独立来源对账） | `prompts.js`、`prompt-copy.js`、`data.js`、30 份 `style.css`+`index.html` | 无 |
| `check-twolines.mjs` | C | R1 `data.js ⊆ prompts.js`、R6 UI 主色=规格主色、R7 调色板带角色名、R8 `fontsSpec` 非空、R5 补色有注释(INFO) | `data.js`、`prompts.js`、`_specs/*.md` | 无 |
| `check-texture.mjs` | C | T1–T3：`body`/`html` 规则不得挂 `background-image`/`url()`/`gradient()` | 31 份 `style.css` | 无 |
| `check-anchors.mjs` | C | `href="#X"` 必须有 `id="X"`；含引号/`+`/`[` 的动态拼接另列不计 | 31 个 `index.html`（`allDirs`） | 无 |
| `check-stale.mjs` | C | 源文件 mtime > `report.json.at` ⇒ 陈旧；jpg mtime > report mtime ⇒ 截图不同步 | 30 案 + `_selection` 的源与 `.inspect/` | 无 |
| `verify-prototype.mjs` | C | 每案 8 类：缺文件、html 体量、远程资源、禁用字体栈、Emoji、缺失本地引用、body 挂背景图、report 指标（真图≥4/溢出=0/标题≤2行/断链/控制台错）、每档 fold 图 | 30 案 `index.html`+`style.css`+`.inspect/` | 无 |
| `collect-schemes.mjs` | **G** | 生成选型台数据 `data.js`（30 案 × 33 键） | `_specs/_CURRENT-VALUES.md`（权威色值）→ `_specs/Sxx.md`（描述文字）→ `.inspect/report.json`（闸门结果） | **`prototypes/_selection/data.js`（tracked）**；`--check` 干跑 |
| `render-scheme.mjs` | **G** | 调 `tools/…/inspect.mjs` 渲染一案三档，写 `.inspect/`；`_selection` 模式另写 `self-gate.js` | 原型 `index.html`、**`tools/`（仓库外）** | **`prototypes/<案>/.inspect/*`（tracked，321 个文件）**、`_selection/self-gate.js` |
| `shot.mjs` | **G** | **零依赖**截图取证：本地 http + 系统 Chrome CLI + Pillow；整页长图/切片/像素统计 | 原型目录 | `--out` 指定目录的 `report.json` + jpg（默认不写仓库） |
| `summarize-all.mjs` | C/T | 读 30 份 `report.json` 输出统一口径汇总（table / `--md` / `--json`） | `.inspect/report.json` | stdout |
| `extract-specs.mjs` | **G** | 从 `deliverables/04|05|06-schemes-*.md` 机械切出 30 份 12 字段规格 | `deliverables/04,05,06-*.md` | **`prototypes/_specs/S01..S30.md`（tracked）** |
| `fetch-fonts.mjs` | **G** | 抓 Google Fonts css2 端点的 woff2 并改写成本地 `@font-face` | 网络（fonts.googleapis.com） | **`prototypes/_fonts/{files,css}/`（tracked）** |
| `fetch-css-fonts.mjs` | **G** | 同上，但抓任意远程 CSS（jsdelivr 的 LXGW WenKai） | 网络（`--url`） | `_fonts/`（tracked） |
| `selfhost-fonts.mjs` | **G** | 把原型里残留的外链字体 `<link>` 换成自托管；先备份 `.bak-fonts` | `_fonts/css/`、各案 `index.html` | **各案 `index.html`（tracked）** + `.bak-fonts`（gitignore） |
| `assign-assets.mjs` | **G** | 从已有 246 张语料交叉分配照片、生成纹理与署名表 | 本地语料、`make-textures.py` | **各案 `assets/`、`credits.json`、`CREDITS.md`（tracked）** |
| `fetch-scheme-assets.mjs` | **G** | 按配置表抓 Wikimedia/NASA 素材 | 网络 | **各案 `assets/`（tracked）** |
| `write-credits.mjs` | **G** | 由 `credits.json` 生成人可读的 `CREDITS.md` | `assets/credits*.json` | **各案 `assets/CREDITS.md`（tracked）** |
| `backfill-credits.mjs` | C/T | **只读**分析：扫 `reuse-*` 行，报告哪些能回填署名 | 全库 `credits*.json` | stdout / `--out`（默认不写） |
| `checked-spawn.mjs` | S | `spawnSync` 的「必须查返回值」版本：error/非零/被信号杀死一律抛错并带 stderr | — | 无 |
| `_s03-probe.mjs` | T | S03 读数表探针（量内容盒宽度/行盒数/单元格高） | **`tools/…/cdp.mjs`（仓库外）** | stdout |
| `make-textures.py` | **G** | 14 个确定性纹理生成器（README 称为「14 个」） | `texture-job.json` | **各案 `assets/texture-*.png`（tracked）** |
| `remake-s02-leak.py` | T | 一次性重做 S02 的 leak-patch | S02 素材 | S02 `assets/` |
| `shot-page.py` | T | `shot.mjs` 的 Pillow 助手（裁剪/切片/像素统计） | 截图 | 切片 |
| `_prompts/extract-dna.mjs` | **G** | 从 30 案 `style.css`/`index.html` 抽「可移植风格 DNA」 | 各案 CSS/HTML | **`_prompts/dna-raw.json`（tracked）** |
| `_prompts/clean-dna.mjs` | **G** | 二次解析：CSS 变量引用 → 真实字体名；压成给 AI 的紧凑形态 | `dna-raw.json` | **`_prompts/dna-clean.json`（tracked）** |
| `_prompts/build-prompts.mjs` | **G** | 合成 30 条提示词数据 | `dna-clean.json`、`data.js`(risk)、`mechanisms.mjs`、`prompt-copy.js` 模板 | **`prototypes/_selection/prompts.js`（tracked）** |
| `_prompts/mechanisms.mjs` | S | 20 条机制句（S11–S30）的手写数据模块 | — | 无（被 build-prompts import） |

## 2. 依赖现实（硬判决）

### `node --version`
```
v26.12.1
```
**没有任何 `package.json` 是给构建用的。** 全仓唯一的 `package.json` 在
`internship-portal/`（一个无关的外来项目，见 .gitignore 末尾）。根目录**没有** `node_modules/`。
⇒ **零 npm 依赖是真的**：全部 27 个脚本只用 Node 内置模块
（`node:fs` / `node:path` / `node:http` / `node:child_process` / `node:crypto` / `node:vm` / `node:url`）。
**没有 playwright、没有 puppeteer、没有 sharp、没有 jsdom。** 我用 `grep` 逐文件确认过：
唯一的第三方 import 是 `_s03-probe.mjs` → `../../tools/taste-skill/…/lib/cdp.mjs`（仓库外的自有代码）。
`cdp.mjs` 自带一个 60 行的 CDP 客户端，用 Node 22+ 的**内置 `WebSocket`**（`cdp.mjs:42-44`
会检查 `typeof WebSocket === 'undefined'` 并抛 `Node 22+ is required`）。
⇒ **Node 下限 = 22**（因内置 WebSocket）；本机 26.12.1 满足。

### 真正的硬依赖是这三样（不是 npm）

| 依赖 | 谁需要 | 缺了会怎样 | 本机状态 |
| --- | --- | --- | --- |
| **系统 Chrome/Edge/Chromium** | `render-scheme.mjs`、`shot.mjs`、`_s03-probe.mjs` | `cdp.mjs:47` 抛 `No Chrome/Edge/Chromium found`；`shot.mjs` 走 `--headless=new --screenshot` 也会失败 | ✅ 有（`C:\Program Files\Google\Chrome\Application\chrome.exe`） |
| **Python 3 + Pillow** | `shot.mjs`、`assign-assets.mjs`、`make-textures.py`、`shot-page.py`、`fetch-scheme-assets.mjs` | Pillow 缺 ⇒ 裁剪/切片/像素统计全崩；`shot.mjs` 报告生成不出来 | ✅ 有（DSH runtime Python 3.12.14 + Pillow 12.3.0） |
| **`tools/taste-skill/`（gitignored，不在仓库）** | `render-scheme.mjs`(exit 4)、`check-contract.mjs`(exit 1)、`_s03-probe.mjs`(模块找不到) | 见上表实测 | ✅ 本机有；**clone 者没有** |

### 精确回答：**fresh clone 之后哪些脚本跑不了、为什么**

**能跑（11 个）**：`check-docs`、`check-docs --selftest`、`check-prompts`、`check-twolines`、
`check-texture`、`check-anchors`、`check-stale`、`verify-prototype --all`、`collect-schemes --check`、
`summarize-all`、`backfill-credits`。这些都只读仓库内文件。

**跑不了（6 个）**：

| 脚本 | 精确错误 |
| --- | --- |
| `render-scheme.mjs` | `exit 4`：`缺渲染引擎：D:\…\tools\taste-skill\…\inspect.mjs  tools/ 不在仓库里（.gitignore:2 排除）——本机需自备 taste-skill` |
| `check-contract.mjs` | `exit 1`：`[C2-engine-unreadable] 读不到规则引擎的 RULE_IDS (…/rules.mjs)，C2 无法判定` → `合计 FAIL 1` |
| `_s03-probe.mjs` | `ERR_MODULE_NOT_FOUND`（静态 import `../../tools/…/cdp.mjs`） |
| `fetch-fonts.mjs` / `fetch-css-fonts.mjs` / `fetch-scheme-assets.mjs` | 依赖**网络**（Google Fonts / jsdelivr / Wikimedia / NASA）。README 与 `assign-assets.mjs` 头注释都实测记录过：Wikimedia 等源在 2026-10-18 后集体不可用（ECONNRESET / ETIMEDOUT / 403）。**素材已在库里**，所以这些只用于「从零重抓」，不是复算必需。 |

**本机实测跑不了的（第 7 个，与环境有关）**：`render-scheme.mjs` 即使有 `tools/` 也**失败了**
（详见上文「生成器 A」）—— Chrome CDP 冷启动 14.1 s vs 20 s 超时。这是本机性能问题，
不是 clone 问题。

### 结论（一句话）

> **「纯 Node + Python，无 npm 依赖」这句话是真的**，但**只说了一半**：
> 复算「渲染类」产物需要三样仓库外的东西 —— Chrome、Pillow、`tools/taste-skill` ——
> 而其中 `tools/` 被 `.gitignore` 排除、没有安装说明、没有版本锁定、没有 submodule、
> 没有 `npm install` 之类的一键步骤。README 在「渲染与验收」里承认了 `tools/` 的缺失
> （并给了 exit-4 的提示），但**没有说怎么获得它**（只有一句「克隆者须先自行取得该工具」）。

---
## 5. 闸门覆盖矩阵（抓得住什么 / **可证抓不住什么**）

> 「可证抓不住」不是我的推测：凡是我能实测的都用变异/复现验证过，标了 ✅实测；
> 纯读代码推出的标了 📖读码。

| 闸门 | 抓得住（缺陷类） | **可证抓不住** | 失败分支存在吗 |
| --- | --- | --- | --- |
| `check-docs` | 文档里的**可复算数字**腐化：方案总数、FAIL=0 案数、警告轴、提示词长度、场景词、路径存在性、**已修项被写回未修** | ① 文档里**没有数字**的陈述（如「性能良好」「无障碍达标」）——它只核 13 个具名量<br>② **`gateFailZero` 把 `gate` 缺失的案算成 FAIL=0**（`check-docs.mjs:407`：`!(s.gate.fail>0)`；`undefined>0===false` ⇒ `!false===true`）✅实测 —— 若 `collect-schemes` 少产一个 `gate`，文档写 30 反而是「对的」<br>③ 只查 README.md（默认）/ README-EN.md（显式），不查 `_CONTRACT.md`、`deliverables/` | ✅ 有（13 条各自 fail()，且 `--selftest` 用 7 个变异证明会红） |
| `check-docs --selftest` | **它自己会不会响**（3 处腐化 + 6 个总数用例 + 1 个 panel 守门员） | ① 只测**已知的**那几处腐化；新增的断言类型没有对应变异用例<br>② 自测本身若写错（如断言"必须红"而实际红在别的规则上）→ 它只断言 exit=1 + 那一行，**不校验"红在正确的规则上"**（实测输出里它确实打了期望/实际行，算部分覆盖） | ✅ 有（漏一条 ⇒ exit 1 / exit 2「自测需更新」） |
| `check-contract` | ① FAIL 是否都在 §9.15 允许表<br>② 允许表的规则是否真存在于引擎<br>③ 登记的规则是否**可能**产生 FAIL（C5，实测 2/5 空转）<br>④ 表格反引号丢失导致判据静默缩小（C6）<br>⑤ ��擎源码缺失（C2 缺失即红） | ① **WARN 完全不查**（契约只约束 FAIL）<br>② `C4 文档声称 vs 实测` 当前是 **`0 处声称被核`**，只发 INFO 不阻断 —— 即「反向断言」这一整条**今天等于没开**：桩在、永远绿 ✅实测（本次跑出 `C4 文档声称 vs 实测 0 处声称被核，0 处矛盾`）<br>③ 只覆盖 30 案的 `report.json`，不覆盖 `_selection` 自身<br>④ **无法判断一条规则「该不该存在」**——它只查集合关系 | ✅ 有（C1/C2/C6 均能 FAIL，实测 C2 在移走 tools 后 exit 1） |
| `check-prompts` | 提示词里的配色/字体/线宽/字号 ≠ `style.css` 真实声明 | ① **只查"可判定"的四类**，不查语义：删掉「去 AI 味」禁令整段、把语气改坏、把机制句换成废话 → 全绿<br>② 与 `style.css` 对账，但 `style.css` 本身就是"设计意图"，**不是渲染结果** —— 与 `check-twolines` 的立论（"要拿独立来源对账"）自相矛盾：它的"独立来源"仍是同一仓库的文件<br>③ 只认提示词里**出现**的 hex；少给一个色它可能查不到（取决于实现） | ✅ 有（`process.exit(...)` 在末尾） |
| `check-twolines` | ① `data.js ⊆ prompts.js`（漏抽）<br>② R6 UI 主色 = 规格主色<br>③ 调色板条目缺角色名<br>④ `fontsSpec` 为空 | ① **R1 是集合包含关系**：`data.js` 和 `prompts.js` **同时**把某色改错 ⇒ 仍然成立（这正是它自己删掉 R2/R3/R4 的理由，**但 R1 有同样的病**：两边同错仍绿）📖读码<br>② R6 只在 `palette[1]` 与规格主色**都变了**时能抓；若规格源 `_specs/*.md` 与 `data.js` 一起错，同样绿<br>③ 不查两链的**语义**（颜色用在哪个角色、字号层级） | ✅ 有（5 条 fail 分支） |
| `check-texture` | `body`/`html` 规则里出现 `background-image`/`url(`/`gradient(` | ① 只认 `body`/`html` **选择器**；`body *`、`:where(body)`、`html > body` 等变体需看 token 切分（状态机按 `{}`/`,` 切 token，`body *` 不会命中 `<body>`）📖读码<br>② **不查 `html` 上的纹理**（作者明确写"先不扩大范围"，因实测 0 例）<br>③ 不查 JS 动态设置的 `style.backgroundImage`<br>④ 不查 `body` 的 `background` **简写里的** `url()`？—— 作者写了 T3 覆盖，但需实测确认 | ✅ 有（`process.exit(FAILS.length?1:0)`） |
| `check-anchors` | `href="#X"` 无对应 `id="X"` | ① **含 `'` `"` `+` `[` `]` 的锚点全部豁免**（`check-anchors.mjs:45`），S05 那一条就是靠这个豁免掉的 —— 若真死锚点是动态拼接的，**永远不会报**<br>② 只查**同文件内**锚点；跨文件 `page.html#x` **完全不查**（正则只 `href="#`）<br>③ 不查 `id` 重复<br>④ 不查 JS 生成的链接目标 | ✅ 有（`exit 1`） |
| `check-stale` | 源 mtime > `report.json.at`；jpg mtime > report mtime | ① **`prompts.js` 被误列为「源」**（它其实是 `build-prompts.mjs` 的产物）⇒ 每次重生成都误报 ✅实测（落后 5505 分钟）<br>② **`data.js` 内嵌的 `at` 无人校验** ⇒ S01 的 `data.js.at` 停在 19:58 而 report 已是 21:09，**本闸门报「全部新鲜」** ✅实测（1/30 不一致）<br>③ mtime 判据无法区分「内容变了」与「被 checkout 恢复」（我恢复文件后它立刻误报 tablet-page-01）✅实测<br>④ 只比 mtime，不比内容哈希 | ✅ 有（`exit 1`） |
| `verify-prototype` | 8 类机械项：远程资源、禁用字体栈、Emoji、断链图、真图数、溢出、标题行数、控制台错 | ① **`body` 挂背景图这条是注释盲的**：`style.css` 里**注释文字**含 `background-image: url(...)` 就误报 ✅实测（S02，`verify-prototype.mjs:76-77` 未先剥注释，而同文件 `stripNonRendered()` 只给 Emoji 用）<br>② **不查 §9.15 允许表** ⇒ S08 的 2 条已豁免 FAIL 被算成「不达标」⇒ **汇总永远 28/30，退出码永远 1**<br>③ 不查视觉质量（对比度、留白、层次）——它只跑文本与 report 指标 | ✅ 有，但**恒为 1**（见 ②）⇒ 这条"红灯"已经失去信号价值 |
| `collect-schemes --check` | 30 案 × 10 个必填字段缺失、配色 <3 个 | 不校验数值**正确性**（只查"有没有"）；`--check` 不写盘也不比对新旧 | 部分（缺字段时列出来，但 `--check` 退出码未在字段缺失时改成 1？📖读码需确认） |
| `summarize-all` | 无断言，纯汇总 | **不是闸门**，永远 exit 0 | ❌ 没有 FAIL 分支 |
| `backfill-credits` | 无断言，纯分析 | **不是闸门** | ❌ 没有 FAIL 分支 |

### 3 个「注册了但永远无法失败」的断言
1. **`check-contract` 的 C4** — 有分支、有 FAIL 等级，但输入恒为 0 条 ⇒ 实际上 INFO。
   它自己的注释（`:430-432`）承认「C4 本次无输入」。
2. **`check-twolines` 的 R5** — 等级是 INFO，`R5-extra-no-role` 永不阻断（设计如此）。
3. **`verify-prototype` 的退出码** — 因为 S08 的 2 条 FAIL 已被 §9.15 合法豁免，
   而它不查允许表，所以 **`--all` 永远 exit 1**。「按下葫芦」的信号已经无效。
   注意 `_entries.mjs:7-9` 明确写了「verify-prototype 有意只扫 30 案，口径必须固定」，
   但**没有解决「豁免案算不算不达标」**。

### 1 个**同义反复**（作者已自删，但同病仍在 R1）
`check-twolines.mjs:185-206` 的注释把 R2/R3/R4 的自证性写得很清楚：
```
if (rec.bg) pal.push(rec.bg);                 ← palette[0] 就是 bg
if (rec.primary && ...) pal.push(rec.primary) ← palette[1] 就是 primary
⇒ R2/R3 永远成立
批判 Agent 注入「一致的错」（palette[1] 与 primary 同时改成 #123456）→ R2/R3/R4 全绿
```
**同一推理适用于 R1**（`data.js ⊆ prompts.js`）：若两边把同一色改错，R1 仍绿。
作者没把这条也删掉，因为 R1 抓的是「漏抽」（单向缺色），不是「错色」——
这是合理的分工，但**它抓不住"两条链一起错"这个类**，应写进覆盖矩阵。

### ✅ 追加实测：`collect-schemes.mjs` **完全没有退出码**

```
$ grep -c "process.exit" prototypes/_build/collect-schemes.mjs
0
```
它是「数据完整性自述」（`缺 一句话视觉定义：无` 那 10 行）的产出者，但**一个字段缺失时也只打印、不返回非零**。
⇒ 在 CI / 提交前钩子里用 `node prototypes/_build/collect-schemes.mjs` 当守卫是**无效的**：
它永远 exit 0。唯一能判定的是 `--check` 的**人眼读输出**。
同理 `summarize-all.mjs`、`backfill-credits.mjs` 也是纯输出、无断言、无退出码。

这条应记为真缺陷（「注册了但没有 FAIL 分支」的第 4 例），而且它比前 3 例更严重：
前 3 例至少有 `add('INFO'|'WARN')` 或显式分支，这个是**连 exit 都没写**。

---
## 3. 结果表（本机实测，Node v26.12.1，2026-11-04）

| # | 命令 | exit | 墙钟 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | `check-docs.mjs` | **0** | 17.1 s | ✅ 0 FAIL / 0 WARN / 13 PASS |
| 2 | `check-docs.mjs --selftest` | **0** | 53.3 s | ✅ 自测通过（3 腐化 + 7 用例全绿） |
| 3 | `check-contract.mjs` | **0** | 10.1 s | ✅ FAIL 0 / WARN 1 / INFO 2（C5 自曝 2/5 豁免空转） |
| 4 | `check-prompts.mjs` | **0** | 15.9 s | ✅ FAIL 0 / WARN 0 |
| 5 | `check-twolines.mjs` | **0** | 11.7 s | ✅ FAIL 0 / WARN 0（R2/R3/R4 已换成 R6） |
| 6 | `check-texture.mjs` | **0** | 11.3 s | ✅ 31 份 style.css / 85 条 body 规则 / 违规 0 |
| 7 | `check-anchors.mjs` | **0** | 9.8 s | ✅ 31 入口 / 1 处动态拼接 / 死锚点 0 |
| 8 | `check-stale.mjs` | **0** | 13.6 s | ✅ 全部新鲜（**注**：在我跑过生成器后变红，见「真缺陷 2」） |
| 9 | `verify-prototype.mjs --all` | **1** | 6.6 s | ❌ **达标 28 / 30** — S02 是 checker bug，S08 是已豁免 FAIL ⇒ **退出码恒为 1** |
| 10 | `collect-schemes.mjs --check` | **0** | 14.9 s | ✅ 30 案表格 ✓；10 类字段"缺：无"（但**它没有 FAIL 分支**） |
| 11 | `build-prompts.mjs`（重生成） | **0** | 20.6 s | ✅ **sha256 逐字节相同** |
| 12 | `collect-schemes.mjs`（重生成） | **0** | 13.9 s | ⚠️ 只 1 行不同（`at`），**但暴露入库 data.js 陈旧** |
| 13 | `collect-schemes.mjs`（再跑一次） | **0** | 7.0 s | ✅ 逐字节稳定（生成器确定性） |
| 14 | `render-scheme.mjs S02` | **6** | 52.2 s | ❌ **Chrome CDP 20 s 超时**（本机 14.1 s，余量 1.4×）+ **删掉了 8 张 tracked jpg** |
| 15 | `render-scheme.mjs S02`（重试） | **6** | 41.4 s | ❌ 一致失败 |
| 16 | `shot.mjs S01 --widths 1440` | **0** | 151.8 s | ✅ 页高 5069 / 6 屏 / 断链图 0 / 失败 0 档（零依赖路径可用） |

**汇总**：9 个检查器里 **8 绿 1 红**，唯一的红是 `verify-prototype --all`，
而它的红**两半都不是内容缺陷**（一半 checker bug、一半合法豁免）。
生成器里 `build-prompts` / `collect-schemes` 确定性良好，`render-scheme` 在本机不可用。

### 写入性与已恢复的文件
- `build-prompts.mjs` 写入 `prompts.js` —— 内容不变，**未触发 git 变更**（无 checkout 需要）。
- `collect-schemes.mjs` 写入 `data.js` —— **已 `git checkout -- prototypes/_selection/data.js` 恢复**。
- `render-scheme.mjs`（2 次失败）**删除了** `prototypes/S02-gilded-symmetry-salon/.inspect/` 下
  8 张 jpg —— **已 `git checkout -- prototypes/S02-gilded-symmetry-salon/.inspect/` 恢复两次**，
  report.json sha256 回到原值 `e2b57d80…`。
- `tools/` 曾被临时移走用于依赖测试 —— **已移回**，`tools/taste-skill/…/rules.mjs` 存在。
- 最终 `git status --porcelain | grep -v '^??'` = **0 项**。
- 临时目录（`s02-inspect-backup`、`shottest`）已删除。

---
## 7. 流水线：从零重生成全部产物的**准确**命令序列

### 依赖前置（一次性）
```bash
node --version            # 必须 ≥ 22（cdp.mjs 用内置 WebSocket）
# 系统 Chrome/Edge/Chromium（render-scheme / shot / _s03-probe）
# Python 3 + Pillow      （shot / assign-assets / make-textures / shot-page）
# tools/taste-skill/     （render-scheme / check-contract / _s03-probe）—— 不在仓库里，无安装说明
```

### 数据链（DAG，实测过的顺序）

```
① deliverables/04,05,06-schemes-*.md
      └─ extract-specs.mjs        → prototypes/_specs/S01..S30.md

② 各案 style.css + index.html
      └─ extract-dna.mjs          → prototypes/_prompts/dna-raw.json
      └─ clean-dna.mjs            → prototypes/_prompts/dna-clean.json

③ 各案 style.css + index.html（素材/字体，与上面并行）
      ├─ fetch-fonts.mjs / fetch-css-fonts.mjs → prototypes/_fonts/
      ├─ selfhost-fonts.mjs                    → 各案 index.html（改写 <link>）
      ├─ fetch-scheme-assets.mjs / assign-assets.mjs → 各案 assets/
      └─ write-credits.mjs                     → 各案 assets/CREDITS.md

④ 各案 index.html（渲染，需 tools/ + Chrome）
      └─ render-scheme.mjs <案>   → 各案 .inspect/{report.json,*.jpg}
         （30 案 × 三档 = 30 次，每次 1–3 分钟）

⑤ prototypes/_specs/*.md + ④ 的 report.json
      └─ collect-schemes.mjs      → prototypes/_selection/data.js

⑥ 各案 style.css（由 ② 得到 dna-clean.json） + ⑤ 的 data.js + mechanisms.mjs + prompt-copy.js
      └─ build-prompts.mjs        → prototypes/_selection/prompts.js

⑦ _selection 自身渲染（需 tools/ + Chrome）
      └─ render-scheme.mjs _selection → _selection/.inspect/report.json + self-gate.js

⑧ 验收（顺序无关，全部只读）
      ├─ check-docs.mjs            （+ --selftest）
      ├─ check-contract.mjs        （需 tools/）
      ├─ check-prompts.mjs
      ├─ check-twolines.mjs
      ├─ check-texture.mjs
      ├─ check-anchors.mjs
      ├─ check-stale.mjs
      └─ verify-prototype.mjs --all
```

**关键顺序约束**（都有实测依据）：
- `collect-schemes` **必须在 `render-scheme` 之后** —— 它读 `.inspect/report.json` 的
  `at`/屏数/真图数/截图清单（`collect-schemes.mjs:7, 538`）。
- `build-prompts` **必须在 `collect-schemes` 之后** —— 它从 `data.js` 读 `risk` 字段
  （`build-prompts.mjs:40-49`）。
- `clean-dna` 必须在 `extract-dna` 之后（读 `dna-raw.json`）。
- `write-credits` 必须在素材分配/抓取之后。
- `selfhost-fonts` 必须在 `fetch-*fonts` 之后（读 `_fonts/css/`）。
- `render-scheme` 必须在 `selfhost-fonts` 之后 —— 否则渲染的是外链字体的旧页面。

### 文档有没有把这条链写对？

**没有。** 逐条核：
- `README.md:168-183` 的工具表**只有单脚本一句说明**，没有顺序、没有依赖箭头。
- `README.md:296-313`「渲染与验收」给了 4 条**验收**命令 + 1 条 `render-scheme`，
  但**完全没有提到** `extract-specs` → `collect-schemes` → `build-prompts` 这条数据链。
- 全仓（README / README-EN / `_CONTRACT.md`）**没有任何一处**写出
  「`render-scheme` 之后要跑 `collect-schemes`，再跑 `build-prompts`」这个顺序。
- `_CONTRACT.md` 是**施工规范**（怎么建一个原型），不是构建手册，也没有这条链。
- 唯一的顺序线索散落在各脚本头注释里（例：`build-prompts.mjs:40` 说「从 data.js 读」），
  需要读 27 个文件的注释才能拼出来。

⇒ **结论：流水线只存在于代码里，不存在于文档里。** 一个 clone 者若按 README 操作，
会得到「能跑验收、不会重生成数据」的半套流程；而 `data.js`/`prompts.js` 一旦与
`_specs`/`style.css` 脱节，**没有任何文档告诉他该按什么顺序修**。

### README 工具表与代码的三处背离（真缺陷）
1. `README.md:173` 说 `check-twolines` 有 **`palette[0]===bg`、`palette[1]===primary`（R2/R3）** ——
   **这两条已在 2026-10-30 被删除**（`check-twolines.mjs:185-206` 有完整删除说明，
   理由是同义反复）。README 仍在描述死规则。
2. `README.md:174` 说 `check-contract` 有 6 条断言 **C0–C6** —— 实际 C4 当前**恒无输入**
   （`0 处声称被核`），且 `README` 说「C4 上线当天就抓到两处」，**今天它抓不到任何东西**。
3. `README.md:502` 把 `verify-prototype.mjs --all` 当复算命令并注明「文中写 29 案 FAIL=0」——
   实测**永远输出 28/30 且 exit 1**，复算者会以为仓库坏了。

## 8. 缺陷清单（按严重度，全部有实测或读码依据）

| # | 严重度 | 位置 | 缺陷 | 证据 |
| --- | --- | --- | --- | --- |
| D1 | 🔴 破坏性 | `render-scheme.mjs:42` + `inspect.mjs` | **渲染失败会先清空 `.inspect/` 再崩**，删掉 8 张 tracked jpg | 两次实测：`git status` 出现 8 个 `D`；只有 git 兜住了 |
| D2 | 🔴 闸门失效 | `verify-prototype.mjs:76-77` | body 挂背景图的检查**注释盲**，被 CSS 注释里的 `background-image: url(...)` 误报 | S02 `style.css:55` 只是注释文字；同文件 `stripNonRendered()` 未用于此行 |
| D3 | 🔴 闸门失效 | `verify-prototype.mjs` 全局 | 不查 §9.15 允许表 ⇒ S08 的合法豁免被算不达标 ⇒ **`--all` 永远 exit 1** | 实测 `达标 28 / 30`，而 README/check-docs 都说 29 |
| D4 | 🟠 守卫缺失 | `check-stale` / `_entries.mjs:50` | `data.js` **内嵌的 `at` 无人校验**，S01 的 `data.js.at`(19:58) ≠ `report.at`(21:09) 而闸门报「全部新鲜」 | 逐案比对：1/30 不一致；commit 里 report 已是 21:09 |
| D5 | 🟠 假阳性 | `_entries.mjs:47-49` | `prompts.js` 是 `build-prompts.mjs` 的**产物**却被列为「源」⇒ 每次重生成必误报 | 实测重生成后（sha 不变）报「落后 5505 分钟」 |
| D6 | 🟠 无退出码 | `collect-schemes.mjs` | **0 个 `process.exit`** ⇒ 字段缺失也只打印不返回非零，无法当守卫 | `grep -c process.exit` = 0 |
| D7 | 🟠 fail-open | `check-docs.mjs:407` | `!(s.gate.fail>0)` 把**缺 `gate` 的案**算成 FAIL=0（`undefined>0===false`） | `node -e` 实测 `filter keeps it? 1` |
| D8 | 🟡 超时脆弱 | `cdp.mjs:61` | Chrome CDP 20 s 硬超时，本机冷启动 **14.1 s**，余量仅 1.41× ⇒ `render-scheme` 不可用 | 两次实测 `Chrome did not start within 20s`；打点 14140 ms |
| D9 | 🟡 死断言 | `check-contract.mjs` C4 | 「文档声称 vs 实测」**恒 0 条输入**，只发 INFO ⇒ 反向断言整条未开 | 实测输出 `C4 文档声称 vs 实测 0 处声称被核` |
| D10 | 🟡 文档背离 | `README.md:173` | 仍写 `check-twolines` 有 R2/R3（`palette[0]===bg` 等），代码已删（恒真式） | `check-twolines.mjs:185-206` 有删除说明 |
| D11 | 🟡 文档背离 | `README.md:174, 502` | 说 C4「上线当天抓到两处」（今天 0 输入）；说 `--all` 复算「29 案 FAIL=0」（实测 28） | 实测 |
| D12 | 🟡 判据局限 | `check-stale.mjs:35-39` | mtime 判据无法区分「内容变了」与「被 git checkout 恢复」⇒ 恢复后误报 | 实测恢复 jpg 后报 tablet-page-01 落后 5547 分钟 |
| D13 | 🔵 口径 | `check-anchors.mjs:45` | 含 `'` `"` `+` `[` `]` 的锚点**全部豁免** ⇒ 动态拼接的真死锚点永不报 | 读码；S05 那条就是靠此豁免 |
| D14 | 🔵 同义反复 | `check-twolines` R1 | `data.js ⊆ prompts.js` 在「两边一起改错」时仍绿（作者已删掉 R2/R3/R4 的同款病，R1 保留了） | 作者自己的变异测试记录（`:202-203`） |
| D15 | 🔵 范围 | `check-anchors` / `check-texture` | 只查同文件锚点；只查 `body`/`html` 精确选择器，不查 `body *`/JS 动态背景 | 读码 |
| D16 | 🔵 文档缺失 | 全仓 | **没有任何文档写出数据链的生成顺序**（`render-scheme` → `collect-schemes` → `build-prompts`） | 逐节核 README / README-EN / `_CONTRACT.md` |

## 9. 最终状态核验

```
$ git status --porcelain | grep -v '^??' | wc -l
0

$ test -f tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs && echo YES
YES

$ sha256sum prototypes/S02-gilded-symmetry-salon/.inspect/report.json
e2b57d80c7ab71549a69b6fb7eecea6884c8005e024fcec2f184237f6482f483   ← 与起始值一致

$ sha256sum prototypes/_selection/data.js
18b1d7e120f622b3b400e4465dbf8e56b9725c9b5b017b18dbbd68a8649feb42   ← 与起始值一致

$ sha256sum prototypes/_selection/prompts.js
e896829a7751fe3b2542c5e4f9f4116845d7ad7dfa041544a6d6a2df034ba6da   ← 与起始值一致
```

**一句话总结**：这套闸门的设计水平高于它的实现水平。
每个检查器的头注释都写清了「为什么需要我、我抓什么、我不抓什么」，
`check-docs --selftest` 甚至自带变异测试 —— 但实测下来，
**9 个检查器里唯一红的那一个（`verify-prototype --all`）红得是错的**，
而 3 个真正的守卫缺口（`data.js.at`、`prompts.js` 被当源、`collect-schemes` 无退出码）
**全部是绿的**。设计意图与运行时行为之间的落差，集中在这三处。
