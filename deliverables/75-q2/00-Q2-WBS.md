# Q2 工作分解结构（WBS）

> 角色：Q2 规划 Agent。**只做拆解与可行性判定，未执行任何工作包。**
> 基线：`D:/Web/style` HEAD `1718b52`，工作区**不干净**（见 §0.2）。
> 侦察口径：本文件所有数字都是本轮 `node` 现算或 `file:line` 原文；「未验证」四处已明确标注。
> 依据：`deliverables/74-plan/{00-MASTER-PLAN,OFFERING,CRITIQUE-OFFERING,DELIVERY,CRITIQUE-DELIVERY,DECISIONS}.md`、
> `deliverables/74-recon/{00-SYNTHESIS,schemes,ux}.md`、`prototypes/_CONTRACT.md`、`prototypes/_specs/_CURRENT-VALUES.md`、
> `prototypes/_build/collect-schemes.mjs`、`prototypes/_prompts/build-prompts.mjs`。

---

## 0. 开工前必须知道的三件事

### 0.1 `check-distribution.mjs` 已经存在了（计划里写「Q2 要做」的那一条，已经做了一半）

计划 §三 Q2 第二条是「**新增** 分布闸门 `check-distribution.mjs`」。**这个文件今天已经在盘上，而且已暂存（`A prototypes/_build/check-distribution.mjs`，635 行），已接进 CI（`.github/workflows/gates.yml:60-64`），11 条内存变异自测全绿。**

本轮实跑：

```
node prototypes/_build/check-distribution.mjs
  ~ [dist-mid-lightness] 1 案 < 地板 2（当前：S09）
  ~ [dist-bright-purple] 0 案 < 地板 1（当前 0 案）
  ~ [dist-very-quiet]    2 案 < 地板 5（当前：S15 S22）
  ~ [dist-low-photo]     0 案 < 地板 2（当前 0 案）
  合计 FAIL 0 / WARN 4      ← 缺口类默认 WARN，--strict 时才 FAIL
  warm-pale-share 18/30 = 60.0% ≤ 60%  ✓
  structure-collision 8 对（基线 8）/ 22 个标签  ✓

node prototypes/_build/check-distribution.mjs --selftest
  11/11 条符合预期  （A 基线、A2 人造完美数据必须绿、B1 空数据、B2 少一案、
                     B3 缺 axes、B4 色值非法、B5 带名漂移、B6 暖浅 65.7%、
                     B7 结构多一对、B8 同标签 ×4、B9 调性塌成 1 种）
```

**对 Q2 的影响**：Q4 的问题不是「该断言什么」，而是「**这份已存在的闸门漏了什么**」。§4 逐条给了漏项与补法。

### 0.2 工作区不干净，且有另一个写入者正在改 `_build/`

本轮开工时 `git status --porcelain` 里非 `deliverables/` 的改动：

| 状态 | 文件 |
|---|---|
| `A`（已暂存） | `prototypes/_build/check-distribution.mjs` |
| `M`（已暂存） | `.github/workflows/gates.yml`、`README.md`、`README-EN.md`、`prototypes/_build/check-docs.mjs` |
| `M`（未暂存） | `prototypes/_build/collect-schemes.mjs`、`extract-specs.mjs`、`summarize-all.mjs`、`check-twolines.mjs` |
| `M` | `prototypes/S17-revenue-stamp-stub/.inspect/{report.json,tablet-page-01.jpg}` |

**四个 `M` 文件是在本轮任务进行中被改的**（本轮一开始读到的 `collect-schemes.mjs:338` 是 `for (let i = 1; i <= 30; i++)`，再读时已变成 `for (const dir of dirs)` 并附了 Q2 注释）。也就是说「把 30 参数化」这件事**正在被另一个写入者同时做**。

⇒ **本 WBS 里的 N00（参数化）工作包与正在进行的改动冲突。** §1 与 §6 按「契约已有写入者、开工前必须先合并或接管」来处理，不假设盘上状态。

另：`prototypes/S17-revenue-stamp-stub/.inspect/` 里 `report.json` 与 `tablet-page-01.jpg` 已被改（`at = 2026-11-10T10:11:55.295Z`）。这看起来是本轮开工前 `_det/run3` 那次渲染留下的痕迹（`deliverables/75-q2/_det/run3/console.txt` 有完整输出，**FAIL=0 / WARN=3**）。**这是 Q2 的一条好消息**，见 §2。

### 0.2b **N03（详情面板分层）也已经被开工了，而且用的是与我独立推出的同一个结论**

本轮写作过程中 `prototypes/_selection/app.js` 被改（`git diff HEAD` 显示 +48/−16，未暂存）：把「一句话视觉定义 / 适用场景 / 不适合的场景 / 当前有效配色」**四段提到字段区最前面**，其余九段顺序一字未动。

**它对我的 Q5 是一个独立的交叉验证**：那段新注释逐字写「MASTER-PLAN 写『判决层 ≤180 字』，实测这个数不成立：能回答该问题的三段（def+scenes+scenesNo）在 30 案里是 **167–334 字、中位 279**，**只有 1/30 装得进 180 字**」—— 与我在 §5.2 独立算出的 **167 / 279 / 334** 完全一致（我用 `data.js` + `prompts.js` 现算，`_det/_judgment-layer.mjs` 是它的探针）。

**它的做法与我的建议不同，而且它的更便宜**：
- 我的建议（§5.3）是「三层预算 + 首句截断 + `fieldOut` 裸 HTML」；
- 它选的是「**只调顺序，一个字不删**」—— 依据是实测「def 568 / family 696 / scenes 902 ⇒ 首屏只装 2 段；调序后 def 568 / scenes 696 / scenesNo 876 ⇒ 首屏 3 段，其中两段直接回答『我的店』」。
- 它明写「**先调顺序，再考虑折叠**。折叠会让用户多一次点击，顺序不会」。

**我的判定：它的方案优于我的建议。** 理由：(a) 不引入任何新的字数预算（少一条会腐烂的阈值）；(b) 不动 `field('` 计数（本轮复核仍是 11，`check-docs` 的 `panel/fields` 仍 `✓ 12 段字段`、`README.md 0 FAIL / 13 PASS`）；(c) 不需要 `README.md:74,157` 的双语改写。

⇒ **N03 的剩余范围因此大幅缩小**：只剩「施工层默认折叠要不要扩」与「`index.html:224` 的『其中 5 段默认折叠』是否仍成立」两件。§2 的 N03 已按此改写。

### 0.3 本轮复核的五个事实（先摆出来，后面全部引用）

| # | 事实 | 证据 |
|---|---|---|
| F1 | **中间明度带是 1 案（S09），不是 0 案。** 计划 §三「中间明度从 0 → 2」的起点写错了。 | `node` 载入 `data.js`：`band==='中间明度带'` 只有 S09。`check-distribution.mjs` 自己也报「1 案 < 地板 2（当前：S09）」。**而 S09 `#F5C842` 的 CIELAB L\*=82.4、WCAG 相对亮度 0.611 —— 按感知口径是亮底，全库中间调是 0 案。** ⇒ 「1 还是 0」取决于尺子，计划选了 HSL 那把却没说是哪把。 |
| F2 | **亮底紫是 0 案**（色相 250–350 全库 0 案，不止 260–320）。 | `data.js` 的 `axes.bandHue` 取值集 = {0,24,36,38,39,40,41,42,43,44,45,47,60,65,100,120,150,190,195,205,207,223,240}，`>=250` 的一个都没有。 |
| F3 | **「很安静」是 2 案（S15/S22），chroma 都是 12。**判定式 `chroma<=25`。 | `data.js` 的 `axes.chroma`：全库最小 12，唯二 ≤25 的就是这两案。 |
| F4 | **`minPics` 全库最小 4（S08、S13 都是 4），`minItems` 全库最小 6。`minPics≤2` 0 案、`minItems≤4` 0 案。** | `node` 读 `prototypes/_prompts/minitems-parsed.json`（30 条，`minItems` 6–46、`minPics` 4–10）。 |
| F5 | **22 个结构标签、8 对撞车（不是 8 个标签各 2 案，是 8 个标签被两案占用，涉及 16 案）。** | 本轮枚举：`SPLIT=S02+S30`、`CHRONO=S03+S23`、`COLLAGE=S04+S28`、`CONSOLE=S05+S21`、`MAG-TOC=S07+S25`、`VERSUS=S10+S26`、`MANUAL=S11+S29`、`DOSSIER=S13+S27`。`22 = 30 − 8`。 |

> **关于「暖浅色带 19/30」**：本轮复算得 **18/30**（`band==='暖浅色带'`）。若把判据换成 `L≥78 ∧ (H≤70 ∨ H≥330)` 会得 **19**（多出 S30 `#EDEDED`，H=0/S=0 —— 它是**无彩色**，H=0 是色相缺失的占位，不是「暖」）。`README.md:429` 用的是 `H28–72 ∧ L≥78`（18 案），`OFFERING.md` §3.1 也是 18。**「19/30」这个数字我没能重现**，唯一接近的是把无彩色算进暖色的口径 —— 那是错的。见 §6-5。

---

## 1. 五个问题的作答

### Q1. Q2 四个子项的硬依赖；「把 30 参数化」是不是前置阻塞？

**结论：是阻塞，但阻塞面比计划 §5.3 列的小，而且「阻塞」的形状不是「必须先做完」，而是「不先做完就会静默少一案」。**

#### 1.1 依赖图（实线=硬阻塞，虚线=顺序建议）

```
        ┌───────────────────────────────────────────────┐
        │ N00 「30」参数化 + 五道闸门的枚举口径          │
        │   （不产出用户可见变化，但决定后面全部能不能跑）│
        └───────┬───────────────┬───────────────┬───────┘
                │               │               │
     ┌──────────▼─────┐  ┌──────▼──────┐  ┌─────▼──────────┐
     │ N01 渲染链复验  │  │ N02 分布闸门 │  │ N03 详情面板分层│
     │ （出第一份新案  │  │ 补漏 + 升    │  │ （不依赖新案，  │
     │  report.json）  │  │ --strict     │  │  但依赖 N02 的  │
     └──────────┬─────┘  └──────┬───────┘  │  判决层字数口径）│
                │               │          └─────┬──────────┘
     ┌──────────▼───────────────▼───────┐        │
     │ N31–N35 五个新案（每案 8 道工序） │        │
     └──────────┬───────────────────────┘        │
                │                                │
     ┌──────────▼───────────┐        ┌───────────▼──────────┐
     │ N04 向导与芯片合并答案│        │ N05 文案与文档迁移    │
     │ （可独立于新案开工）  │        │ （必须最后，因为 N 变了）│
     └──────────────────────┘        └──────────────────────┘
```

#### 1.2 「把 30 参数化」逐条核实：计划 §5.3 的 7 处 + 我补的 9 处

计划 §5.3 表列 7 处。本轮一处一处核，**7 处全部成立，但其中 3 处的「现状」描述已过期**（因为 §0.2 说的并发改动），**另有 9 处计划没列**。

| # | 位置（当前行号） | 当前内容 | 现状 | 失效方式 |
|---|---|---|---|---|
| 1 | `README.md:7,10,16,55,74,80,105,155,159,162,164` / `README-EN.md:10,16,153` | 「30 个能跑的风格」「`Schemes: 30` 徽章」「30 schemes」 | 未改 | 文字说谎；`check-docs.mjs:579-591` 的 `nums/schemes` 会**抓到其中一部分**（见 #8） |
| 2 | `prototypes/_selection/index.html:6,7,49,90,326` | `<title>选型台 · 30 个网站设计风格方案`、meta description、`:49`「这三十张卡」、`:90`「30 个里有 18 个落在暖浅色带」、`:326` `#e-total` 兜底值 30 | 未改 | `:90` 更严重：**它是「30 个里有 18 个」这句话本身，两个数都是手写的，而 `check-ui-copy.mjs` 的 `HARDCODED_GUARDS`（`:96-107`）只守 `rail-fold-sum`（组/颗）与 `rail-note`（段数），**`rail-hint` 一条都不守** |
| 3 | `prototypes/_build/check-docs.mjs:579-591` | `nums/schemes` 断言 `F.schemes = SCHEMES.length` | 已改（暂存 diff 在 `nums/gate`，`nums/schemes` 本身原本就是**动态**的） | **这条其实不用改**：它比的是 `SCHEMES.length`，不是字面量 30。计划的清单把它列进来是错的（见 §6-2）。**真正要改的是 `:256,260,265,270,277,282` 那 7 条 selftest 夹具的 `from`/`to` 字面量**——它们硬编码「30 个方案」 |
| 4 | `prototypes/_build/_entries.mjs:24,73` | 注释「原型目录（S01..S30）」 | 未改 | **只是注释**。真正的枚举用 `CASE_DIR_RE = /^S\d{2}-/`（`:24` 上一行），是动态的。**这条也在计划清单里但不是失效点** |
| 5 | `.inspect/` 截图总数 272 | `README.md:41,46,233,501`、`README-EN.md:41,46` 共 14 处 | 未改 | 新增 5 案 = +45 张（实测 30 案 272 张，均 9.07 张/案，最少 6 最多 10）。**没有任何闸门核这个数**（`grep -c 272` 在 `check-*.mjs` / `probe-ui.mjs` 全部为 0） |
| 6 | 向导文案「30 个方案里」 | `prototypes/_selection/wizard.html:7,21,23,65` | 未改 | `:65` 还写着「30 案里有 11 个的认知门槛是"低"，12 个"中"，7 个"高"」——**这是四个手写数字**，新增 5 案后全错，且 `wizard.js` 里 grep `30` 只 1 处（`:139` 注释），**没有任何断言** |
| 7 | `prompts.js` 的 `schemes` 数组长度 | 由 `build-prompts.mjs` 从 `dna-clean.json` 生成 | 结构上是动态的 | 但**上游有三处硬编码**，见 #8–#11 |
| **8** | `prototypes/_build/collect-schemes.mjs:352` | `for (const dir of dirs)` | **本轮已由并发写入者改好**（原为 `:338` 的 `for (let i = 1; i <= 30; i++)`） | 原实现下：往 `prototypes/` 放 `S31-…/` 会被**整段丢弃**，而 `collect-schemes --check` 照打「30 案：有页面 30…」，四道闸门全绿。**这是全库最危险的一处**（失效的样子是绿） |
| **9** | `prototypes/_build/extract-specs.mjs:55,62` | `for (let n = 1; n <= 30; n++)` 两处 | **本轮已改**（改成从 `found.keys()` 推 `maxN`，`:65-66`） | 原实现下：`_specs/S31.md` **永远不会被生成**，而 `collect-schemes.mjs` 读到没有规格的案时 `def` 会是空串 ⇒ 站点上该案是一句话都没有的空壳，**没有闸门会说「你没生成规格」** |
| **10** | `prototypes/_build/summarize-all.mjs:70` | `const total = 30` | **本轮已改**（`const total = rows.length`，`:74`） | 原实现只核「S01..S30 都在吗」，多出来的目录与缺失的目录都看不见 |
| **11** | `prototypes/_build/check-twolines.mjs:308-309` | `if (SCHEMES.length !== 30) … if (PSP.length !== 30) …` | **本轮已改**（改成 `SCHEMES.length !== DISK_CASES` 与 `PSP.length !== SCHEMES.length`，`:321-328`） | 原实现有两个错：①「data.js 31 + prompts.js 31」这个**完全自洽**的状态会被报 2 条 FAIL；② FAIL 文案写「应为 30」，**修法指引是错的** |
| **12** | `prototypes/_prompts/build-prompts.mjs:380` | `console.log("  有机制句的案：30/" + (30 - noMech) + " → 实际 " + (30 - noMech) + "/30")` | 未改 | **只是打印**，但它让「31 案里 30 案有机制句」被写成「30/31 → 实际 30/30」，**读日志的人会以为满覆盖** |
| **13** | `prototypes/_prompts/build-prompts.mjs:242` | `const h = HUMAN[d.id] \|\| { plain: "", scenes: [], minItems: 3, minPics: 3 }` | 未改 | **新案漏填 `HUMAN` 表时静默降级**：`plain` 空串、`minItems/minPics` 兜底 3。而 `plain` 是卡片与判决层的主句（`app.js:611` `esc(plainOf(r))`）、`minPics=3` 会**直接满足「少货少图」地板**（`minPics<=2` 判否，但 3 会污染能力画像）。**没有任何断言检查 `plain` 非空**——`build-prompts.mjs:377` 只是 `console.log('缺人话版的案：…')`，`process.exit` 一次都没有 |
| **14** | `prototypes/_prompts/minitems-parsed.json` | 30 条容量记录 | 未改 | 新案没有 capacity 记录时，`build-prompts.mjs:282` 的 `const cap = CAPACITY[d.id] \|\| null` → `minItems=3/minPics=3/degrades=false`，**且 `prompts.js` 里 `capacity: null`**。本轮实测：`capacity` 全缺时 `check-distribution` 的 `low-photo` 地板**恒为 0，只报 WARN 不报 FAIL** —— 与「真的没有这个能力」完全无法区分 |
| **15** | `prototypes/_build/verify-prototype.mjs:197-208` | `--all` 只扫 `S\d{2}-`（动态） | 不用改 | 但它的汇总行「达标 29 / 不达标 1 / 共 30」与 README 的 `29/30` 是**两个独立的手写/动态值**，新案落地后 README 那一侧要跟（见 #1） |
| **16** | `prototypes/_build/check-stale.mjs:46` | `if (!existsSync(rep)) continue;` | 未改 | **新案若「建了目录但从未渲染」，陈旧度检查直接跳过它**（`continue`）。而 `check-contract.mjs:183-186` 的 `C0-report-missing` 会报 FAIL —— 两道闸门口径相反，一个是「空集是子集」，一个是「无法判定≠成立」。新案开工期这两道闸门会给出矛盾的信号 |

#### 1.3 判定

**「把 30 参数化」是 N31–N35 的前置阻塞，理由不是「跑不通」，而是「跑得通但静默少东西」**：

- 类 A（**硬阻塞**，不做则新案根本进不了站点）：#8 `collect-schemes.mjs`、#9 `extract-specs.mjs`。这两处**本轮已由并发写入者改好**。
- 类 B（**硬阻塞**，不做则新案进去了但是空壳/错的）：#13 `HUMAN` 兜底、#14 `minitems-parsed.json` 缺项、#12 日志口径。
- 类 C（**非阻塞，但决定「别人能不能复算」**）：#1/#2/#6 的文案、#5 的 272、#3 的 selftest 夹具。
- 类 D（**不该改**）：#3 的 `nums/schemes` 本体、#4 `_entries.mjs` 的枚举逻辑。计划把这两个列进迁移清单是**过度清单**。

**建议的切割方式**：不把「参数化」做成一个独立工作包去消灭所有 30，而是**把类 A/B 的 5 处改成从数据推**（这不是「替换字面量」，是「消灭第二真源」），**类 C 的文案改成由 JS 现算**，**类 D 不动**。理由：`README.md:422-425` 记着「29 个闸门 FAIL=0」这一类数字的历史是「改了数据没改文案，13 个 PASS 全绿 8 天」——**消灭手写数字的办法是现算，不是换个更准的手写数字**。

---

### Q2. 渲染链今天能不能跑？

**结论：能跑，而且今天已经跑过。判据在新案一侧还缺三件（不是渲染链本身）。**

#### 2.1 静态判定（未运行渲染，按任务要求）

| 环节 | 状态 | 证据 |
|---|---|---|
| `_build/vendor/` 是否存在 | **存在，4 个文件，且在版本库里** | `vendor/{inspect,cdp,probe,rules}.mjs`，`git ls-files` 4 条全在 |
| `vendor/inspect.mjs` 的删图缺陷 | **已修** | `inspect.mjs:57` = `const browser = await Browser.launch();`，**`:64`** 才是清图循环。原缺陷是「先删后 launch」，现在是「先 launch 后删」，且 `:58-63` 有完整注释解释为什么。**修法与计划 Q1-W1 一致。** |
| `cdp.mjs` 超时值 | **60 000 ms** | `vendor/cdp.mjs:64`：`setTimeout(… 60000)`，注释写「20s 曾在本机被测穿（Windows 冷启动 14.1s，1.41× 余量）」。`tools/` 那一份也已是 60000（`tools/…/lib/cdp.mjs:64`）。 |
| `tools/` 那一份是否也修了 | **修了** | `tools/…/inspect.mjs:57` = launch，`:64` = 清图。所以「vendor 与 tools 两份都修好」 |
| `render-scheme.mjs` 的引擎选择 | **优先 vendor，tools 退为可选** | `:24-26` `INSPECT = existsSync(INSPECT_LOCAL) ? LOCAL : TOOLS`；`:40-47` 缺引擎时 `exit 4` 并指路 `shot.mjs` |
| 三重防线是否在 | **在** | `:40` 前置断言（exit 4）、`:61` 拦 `error/signal`（exit 5）、`:68` 前后指纹比对（exit 6）。注释直指 2026-10-24 那次「tools/ 消失后两次『渲染成功』全是旧报告」的事故 |
| `report.json` 写出时机 | `vendor/inspect.mjs:176` `writeFileSync(report.json)` | 与 `render-scheme.mjs:56-60` 的注释对上：「`inspect.mjs:171` 先写 report、`:173` 再因 FAIL 而 exit 1」⇒ 该脚本已把 `status!==0` 从「失败」里摘出来，只按指纹判 |
| Node 版本 | **v26.12.1**，`WebSocket` 是全局 | `cdp.mjs:43-45` 要求 Node 22+；实测 `typeof WebSocket === 'function'` |
| Chrome 是否存在 | **存在** | `findChrome()` 返回 `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| 四个 vendor 文件的语法 | **全部可解析** | `node --check` 四个全部通过 |
| 依赖闭包 | **自包含** | `vendor/inspect.mjs:11-13` 只 import `./cdp.mjs`、`./probe.mjs`、`./rules.mjs` —— 三件都在 vendor 里 |

#### 2.2 **实测证据：这条链今天已经跑通了**

`deliverables/75-q2/_det/run3/` 里有完整一轮的产物（本轮开工前留下的）：

- `console.txt` 是 `render-scheme.mjs` 的完整输出：三档 1440/768/390、每档页高/字数/图数/字体族/标题行数/hero 字号，末尾 `合计 FAIL=0  WARN=3`（WARN 是 `font-count`、`font-fallback`、`no-footage`）。
- `report.json` 的 `at = 2026-11-10T09:08:01.876Z`，`images[]` 三条（1440 fold+1page / 768 fold+2page / 390 fold+2page）。
- 对应地 `prototypes/S17-revenue-stamp-stub/.inspect/report.json` 的 `at` 已更新为 `2026-11-10T10:11:55.295Z`，8 张 jpg 齐全。

⇒ **「新建一个方案 → 三档视口出 report.json」这条链的可行性，不需要推断：今天跑过，且出了 3 档 + 5 张图 + FAIL=0。**

#### 2.3 判据（我为什么判定可行）

1. **引擎存在性**：`vendor/` 四件在版本库内，`render-scheme.mjs:24-26` 的优先路径指向它 ⇒ 干净 clone 不会再 exit 4。
2. **失败可见性**：三重防线齐全 ⇒ 不会再现「打印旧数据的假成功」。
3. **数据破坏性**：清图已移到 `launch()` 之后 ⇒ Chrome 起不来时不再删已入库截图。
4. **实际产出**：`_det/run3/` 是这一条链的端到端证据。
5. **工具盲区已知**：`S17` 那条 `font-fallback` WARN（「文津宋体 声明了但没加载」）是 `_CONTRACT.md` §9.15 登记过的四项之一 ⇒ 已知非缺陷。

#### 2.4 缺什么（新案一侧，不是渲染链）

| 缺件 | 影响 | 补法 |
|---|---|---|
| **新案的 `_specs/S31..35.md`** | `collect-schemes.mjs` 的 `parseSpec` 读不到 ⇒ `def/family/layout/visuals/motion/audit/scenes/copy` 全空 ⇒ 站点上是空壳 | 先写 `deliverables/07-schemes-31-35.md`（沿用 `04/05/06` 的 12 字段式），再进 `extract-specs.mjs` 的 `SOURCES`（`extract-specs.mjs:16-20`） |
| **`_CURRENT-VALUES.md` 的新行** | `collect-schemes.mjs:122-136` 从这张表读 `bg/primary/buttonText/errorCode`；**没有行 ⇒ `rec.bg = null` ⇒ `axes.band = null`、`axes.chroma = 0`（`collect-schemes.mjs:612` 的 `Math.max(0, ...[])`）⇒ `axes.loud = '很安静'`** | 本轮实测：`bg=null` 时 `band=null` 且 `loud='很安静'` 同时发生 ⇒ **新案会白送一个「很安静」，把 `very-quiet` 地板假绿** |
| **`minitems-parsed.json` 的新条目** | `minPics/minItems` 落兜底 3，见 Q1-#14 | 逐案实测后手填（这是 `60-minitems-degrade-audit.md` 的产物，本来就是手工审计） |
| **`font-fallback` 的已知 WARN 接受口径** | 新案若用 `_fonts/` 里声明但未加载的族，会吃同样的 WARN | 沿用 §9.15；**但新案不得新增未登记的 WARN** |
| **`few-pictures` 的冲突** | 见 Q3.4：`minPics≤2` 与 `rules.mjs:113` 的 `realPictures + uiPictures >= 4` 直接对撞 | 必须改闸门或改靶子，二选一 |

---

### Q3. N31–N35 的选题

#### 3.1 缺口复算（我独立验证任务书给的数）

| 缺口 | 任务书给的 | 本轮复算 | 判定 |
|---|---|---|---|
| 中间明度带 | 1 案（S09），计划说 0 | **1 案（S09）** | ✅ 任务书对，**计划错** |
| 亮底紫（H 260–320 ∧ L≥60） | 0 案 | **0 案**；放宽到 H 250–350 仍 0 案 | ✅ |
| 很安静（chroma≤25） | 2 案（S15/S22） | **2 案**，chroma 都是 12 | ✅ |
| `minPics≤2` | 0 案，全库最小 4（S08/S13） | **0 案，最小 4（S08、S13）** | ✅ |
| 暖浅色带 | 19/30 | **18/30**（19 是含无彩色 S30 的错误口径） | ❌ 见 §6-5 |
| 结构撞车 8 对 | 需复算是否 8 对 | **8 对**（22 标签，8 个标签各 2 案） | ✅ |

#### 3.2 选题的硬约束：不能加第 9 对撞车，但这不是选题的主要约束

**`check-distribution.mjs:369` 的 `BASE_PAIRS = 8` 只做一件事：撞车对数 > 8 就 FAIL。** 它**不检查**「新案是否与某案形成新的一对」以外的任何东西。本轮用闸门自己的 `runCheck()` 做过模拟（把 `check-distribution.mjs` 的 `buildRows/runCheck` 抽出来直接调用）：

| 场景 | 闸门判决 | 说明 |
|---|---|---|
| +1 案，全新标签 | **绿**（pairs 仍 8） | |
| +1 案，用**单例**标签（如 `RIVER`）| **FAIL `dist-structure-collision`**（8→9） | ← 这就是「不许第 9 对」 |
| +1 案，用**双例**标签（如 `CONSOLE`，2→3）| **绿**（pairs 仍 8） | **⚠️ 这是漏洞**：契约 §F「同一骨架最多 3 次」允许，但 3 例意味着**用户看到的骨架种类从 22 掉到 22（不变）而可选项没变多** |
| +2 案都进 `CONSOLE`（2→4）| **FAIL `dist-structure-over3`** | |

**另一个约束是 F/R 池已经用满**：`data.js` 实测 **F 型 15 案，用了 10 种骨架（池里正好 10 种）；R 型 15 案，用了 12 种结构（池里正好 12 种）**。`00-BRIEF-AND-CONSTRAINTS.md:29,44` 说 F 骨架池 10 种、R 结构池 12 种「可选（不限于）」——字面上允许自造，但**自造骨架 = 结构标签撞车对数不变而标签种类增加（22→23…）**，这**不违反任何闸门**，却是「同骨架换色」禁令的正向检验：自造标签若其实只是某个既有骨架的换色，闸门看不见（`check-distribution.mjs` 只看字符串是否相等）。

⇒ **5 个新案全部必须用新标签，且必须能回答「它解决哪个现存方案解决不了的处境」。闸门只保证「标签不重复」，不保证「骨架真不同」——后者只能人判。**

#### 3.3 五个选题

每题按 §5.1 的人判第 7、8 条作答。**所有色值都过了三道检查**（本轮实测）：`bandName()` 归类、`colourFamily()` 色族窗口（`vendor/rules.mjs:8-15`，`cream/terracotta/ai-purple` 三个窗口）、`loud` 判据。

---

**N31「四格小店」— 少货少图的唯一正解**

| 项 | 值 |
|---|---|
| 占的空格 | `minPics ≤ 2`（全库 0 案）+ `minItems ≤ 4`（全库 0 案） |
| 底色 / 圆角 / 安静 / 规模 | `#8C6F63`（H18 S17 L47 → **中间明度带**，色族窗口 none）/ 大圆角 16px / chroma≈18 → **很安静** / 4 条 0–2 图 |
| 结构标签 | `FOUR-UP`（新） |
| **第 7 条：解决哪个现存方案解决不了的处境** | 「我只有 4 个 SKU、**一张照片都没有**」。今天 30 案的提示词**全部**写着「版式里至少要 N 个不同的图片位置」，N 最小 4（`prompt-copy.js:699`）。店主只有 3 张图时，**没有一案是不撒谎的**——要么 AI 编图，要么版式塌。这不是「接近」（`OFFERING.md` 把 S08/S13/S25 说成「勉强靠近」）：`minItems≤8 ∧ minPics≤5` 确实只有 S08/S13/S25 三案，但它们的 `minPics` 是 4/4/5，**没有一案能装下 0 图**。 |
| **第 8 条：与最接近的那一案的结构差异** | 最接近是 **S08（6 条/4 图，ISOMETRIC）**。差异是**骨架类别不同**：S08 是「等距层叠 + 厚度侧壁面」的空间透视结构，N31 是「四格按 2:1:1:1 分宽的平面栅格 + 0 图时第四格走纯文字基线对齐」。前者靠纵深，后者靠**分宽比例**，缩略图上不会读成同一个。 |
| 机制句（C7 要过） | 「首屏四格按 2:1:1:1 分宽，第 4 格在 0 图时退化为三行左对齐文字，与前三格的图片底边对齐」——**每个数字都要能在 style.css 找到**（`grid-template-columns: 2fr 1fr 1fr 1fr`、`align-items: end`） |

---

**N32「藕紫账本」— 紫→品红整段空，且落在中间调**

| 项 | 值 |
|---|---|
| 占的空格 | 色相 250–350（全库 0）+ 中间明度带 |
| 底色 / 圆角 / 安静 / 规模 | `#806082`（H296 S15 L44 → **中间明度带**，色族窗口 none —— 注意 S=15 避开了 `ai-purple` 的 `S≥0.42`）/ 小圆角 4px / chroma≈30 → 有态度不吵 / 8 条 4 图 |
| 结构标签 | `LEDGER-PAIR`（新） |
| **第 7 条** | 「我要一个**不是暖米色、也不是黑底**的正式感」。全库底色色相的实测取值集里**没有一个 ≥250**（23 个不同色相值，最大 240）。想走紫/藕/梅子色的店主（美妆、花艺、母婴、设计工作室 —— 这几个词全在 `unsupported` 29 词表里，`prompts.js` 实测）今天**只能拿到近似款**。 |
| **第 8 条** | 最接近是 **S17（税票存根联，RECEIPT，主色 `#5A2A50` H312.5）** —— 但 S17 的**底色**是 `#E1D6BD`（暖浅），紫只是主色。N32 的**底色**是紫 ⇒ 整页面积比反了。结构上 N32 是「两栏账目 + 小数点列对齐 + 专色相压」，与 S17 的「三联存根 + 撕口」不同类。 |
| 风险 | 主色若用 `H244–295 ∧ S≥0.42 ∧ L30–80` 会吃 `palette-purple` FAIL（`vendor/rules.mjs:13`）。**必须让紫是低彩度（S<42）**。本轮实测 `#806082` S=15 安全。 |

---

**N33「雾蓝服务单」— 深中间调 + 少图 + 很安静，三个缺口一次占**

| 项 | 值 |
|---|---|
| 占的空格 | 中间明度带 + `minPics≤2`（第 2 个）+ 很安静（第 3 个） |
| 底色 / 圆角 / 安静 / 规模 | `#374A5C`（H209 S25 L29 → **中间明度带**，色族窗口 none）/ 胶囊按钮 / chroma≈20 → **很安静** / 6 条 3 图 |
| 结构标签 | `SERVICE-LIST`（新） |
| **第 7 条** | 「我卖的是**手艺/服务**，没有货架也没有产品图」。这是 `unsupported` 表里「家教/培训/独立开发者」三个词的共同处境，而**全库 30 案的 `minPics` 都 ≥4**。N33 是「单列服务行 + 状态点」，**结构上不需要图**（3 图是可选装饰，不是槽位）。 |
| **第 8 条** | 最接近是 **S18（磷光检修台，TERMINAL，冷暗带 L5）** —— 都是「行 + 状态」。差异：S18 是**终端命令行驱动**（等宽、满幅、荧光绿），N33 是**单列服务行由 24px 基线串起 + 每行右侧一枚 8px 状态点**（非等宽、居中版心、雾蓝）。S18 的底色 L=5，N33 L=29 —— 缩略图上一个是黑底一个是中灰蓝，**不会读成同一张**。 |
| 风险 | `L29` 距 `bandName` 的 `l<=22` 只有 7 个点。若实测渲染色偏深会被归到「冷暗带」⇒ 缺口没补上而闸门不报（它是地板，深了只会让 `mid-lightness` 少 1）。**必须在 `_CURRENT-VALUES.md` 落值后跑一次 `check-distribution --brief` 确认。** |

---

**N34「鼠尾草价签」— 绿系中调 + 少图**

| 项 | 值 |
|---|---|
| 占的空格 | 120–179° 绿（全库仅 2 案：S15 H150、S18 H120）+ 中间明度带 + `minPics≤2`（第 2 个） |
| 底色 / 圆角 / 安静 / 规模 | `#8AA894`（H140 S15 L60 → **中间明度带**，色族窗口 none）/ 大圆角 20px / chroma≈22 → 很安静 / 5 条 2 图 |
| 结构标签 | `PRICE-SLIP`（新） |
| **第 7 条** | 「我是农产品/家居/烘焙，要**价目感但不是 S09 那种亮黄手写**」。S09 是全库唯一中间调，但它是 `#F5C842` 高饱和（S90）、`就要扎眼`、且 Lab L\*=82（其实是亮底）。要「中调的、安静的、能标价的」今天 0 案。 |
| **第 8 条** | 最接近是 **S09（蜡染价目板，PRICE-BOARD，H45 S90 L61）** 与 **S09 同标签无撞车**（PRICE-BOARD 只有 1 案）。差异：S09 是「手写板 + 灯箱 + 分量标注」（高饱和、就要扎眼），N34 是「一枚价签沿 8px 基线错位 3 档，价格与品名共用一条下划线」（低饱和、很安静）。**同一「价目」语义、相反的材质与调性** —— 这正是「同骨架换色」禁令要禁止的形状，所以 **N34 必须用新标签 `PRICE-SLIP` 而不是复用 `PRICE-BOARD`**，并且必须在验收说明里写清「它与 S09 是同一语义、相反材质」。 |
| 风险 | `#8AA894` 的 H140 落在 `bandName` 的 `cool = h>150 && h<290` 边界外（140<150）⇒ 会走 `warm` 分支判为 `暖浅色带`? **不会**：`warm = h<=70 || h>=330`，140 也不满足 ⇒ `band = '中性浅带'` 当 L≥78 时。L=60 ⇒ **`中间明度带`**。✅ 本轮实测确认。 |

---

**N35「亮丁香目录」— 亮底紫（唯一能同时喂两个地板的一案）**

| 项 | 值 |
|---|---|
| 占的空格 | **亮底紫**（H 260–320 ∧ L≥60，全库 0） |
| 底色 / 圆角 / 安静 / 规模 | `#DCD0E8`（H270 S34 L86 → `bandName` 判 **冷浅色带**，但 `bright-purple` 的 pick 是 `hue 260-320 ∧ hslL>=60` ⇒ **命中**）/ 有机椭圆裁切 / chroma≈16 → **很安静** / 10 条 5 图 |
| 结构标签 | `ARC-CATALOG`（新） |
| **第 7 条** | 「要一个**亮的、偏紫的、安静的**目录」。全库 0 案。注意它与 N32 是**两个不同的处境**：N32 是「中调紫 + 正式」，N35 是「亮紫 + 轻盈」。 |
| **第 8 条** | 最接近是 **S25（专色目录帖，MAG-TOC，`#E8E4DE` 中性浅）** 与 **S07（同 MAG-TOC）**。差异：S07/S25 都是「出版物目录页 + 页码系统 + 左右跨页」，N35 是「目录项沿 3° 弧线排布，弧半径 = 版心宽」——**弧线 vs 跨页网格**，缩略图上一个是直线分栏、一个是弯的。 |
| ⚠️ 重要发现 | **`#DCD0E8` 会同时命中 `mid-lightness` 与 `bright-purple` 两个地板吗？** 不会 —— 它被判 `冷浅色带`。**但若改用 `#C9A8DD`（H277 S44 L76）就会同时喂两个地板**（本轮实测：`band='中间明度带'` 且 `bright-purple` pick 命中）。⇒ **闸门存在「一案喂两地板」的漏洞**，见 §4.3。 |
| 风险 | `H270 S34 L86` 不在 `ai-purple` 窗口（需 `S≥0.42 ∧ L≤0.80`），安全。但**S=34 已相当接近**；验收时要复核 `report.json` 的 `palette-purple` = 0。 |

#### 3.4 「少货少图 minPics≤2」的产品含义

**这是一个真实的店主处境，而且是「今天所有方案都不适用」里最硬的一条。** 判据：

1. **提示词是字面硬约束，不是建议**：`prompt-copy.js:699-700` 逐案输出「4. 版式里至少要 N 个**不同的**图片位置（不是 N 个 img 标签就够——同一张图重复用不算）」，N 由 `dna.minPics` 给，**全库 4–10**。
2. **`minItems` 不是硬约束，`minPics` 是**：`prompt-copy.js:640` 明写「这是版式的规模，不是你的内容量」，且 `degrades=no` 的 17 案还说「删条目只会让页面变短」。**但第 4 条图片位没有任何放宽句**。
3. **`CRITIQUE-OFFERING.md:41` 已独立判过这一条**：「0–2 张图的用户**确实与 30/30 案的提示词字面冲突**。这不是『建议』」。
4. **契约侧还有第二道冲突**：`rules.mjs:111-114` 在 1440 档要求 `realPictures + uiPictures >= 4`，否则 `FAIL few-pictures`；`verify-prototype.mjs:166` 又有独立一条 `realPictures < 4` 报 problem；`_CONTRACT.md:93` 把它写成硬要求。⇒ **做 `minPics≤2` 的案会同时撞两处闸门**（见 §4.5）。

**所以「少货少图」不是一个「缺一格」的分布问题，是一个「产品对一整类店主说谎」的问题。** 判为**真实且最高价值**的缺口。

#### 3.5 关于「画一个 0 图版式」的现实性（未验证）

`minPics=0` 的版式在现有闸门下**不可能过**：`rules.mjs:113` 的 `pics = realPictures + uiPictures`，`uiPictures` 只数 `[data-ui]` 元素（`vendor/probe.mjs:418`，全库仅 S03/S08 用了 `data-ui`）。⇒ 除非新案标 `data-ui`，否则 `realPictures` 必须 ≥4。**N31/N33/N34 若真做 0–2 图，必须走 `data-ui` 这条旁路，或者改闸门。** 这是一个**产品决定**，见 §6-6。

---

### Q4. `check-distribution.mjs` 应该断言什么

因为闸门**已经存在**（§0.1），这一节改成「它已经断言了什么 / 还缺什么 / 怎么防假绿」。

#### 4.1 它已经断言的（10 条，逐条给阈值与来历）

| # | 断言 | 阈值 | 为什么是这个阈值（文件自己的理由） | 会误报吗 |
|---|---|---|---|---|
| 1 | `dist-parsed` | 行数 ≠ `SCHEMES.length` 即 FAIL | 防「解析器漏案 ⇒ 后续全部不成立」 | 不会（除非 `SCHEMES` 真的是空） |
| 2 | `dist-axes-missing` | 任何一案缺 `axes.chroma` 或 `axes.bandHue` 即 FAIL 并点名 | 缺字段时「分布断言对它无效」，不许静默跳过 | 不会 |
| 3 | `dist-color-unparsed` | 底色解析不出即 FAIL | 同上 | 不会 |
| 4 | `dist-band-unparsed` | 带名不在 `{浅,中,暗}` 三类即 FAIL | 「不要猜」 | 不会 |
| 5 | `dist-band-consistency` | 闸门自算 band ≠ `data.js` 的 `axes.band` 即 FAIL | 两处判据漂移 = 闸门在核一个站点不显示的字段 | **会**：`collect-schemes.mjs` 改一次分类阈值就会红，而那是**正常重构**。目前靠「两边逐字同构」避免 |
| 6 | `dist-mid-lightness` | ≥2 案 | 「1 案撑不起一个筛选项 —— 用户筛出来的唯一结果没法对比」 | 不会（这是地板） |
| 7 | `dist-bright-purple` | ≥1 案 | 「全库 30 案在 260–320 上一个都没有」 | 不会 |
| 8 | `dist-very-quiet` | ≥5 案 | 「三选一的选项只有 2 个候选，用户选它等于被迫在那 2 个里挑」 | **会**：任何 `chroma` 算成 0 的案都白送（见 4.3） |
| 9 | `dist-low-photo` | ≥2 案（`minPics<=2`） | 「全库最小是 4，没有任何一案是『只有两三张图』能用的」 | **会**：capacity 缺失时恒为 0（见 4.3） |
| 10 | `dist-warm-pale-share` | ≤60% | 「今天正好 18/30 = 60.0%，这是已经发生的同质化，不是目标」 | 不会（占比上限） |
| 11 | `dist-tone-coverage` | 7 种调性各 ≥3 案 + **7 种必须都在** | 契约 `00-BRIEF §F` 第 4 条 | **会**：新案若用第 8 种调性词，它自己会因「只有 1 案 < 3」而 FAIL（本轮实测确认）—— 这**违反 `OFFERING.md` §3.2 E「tone 7 个词扩到 ≥12 个词」** |
| 12 | `dist-structure-collision` | 撞车对数 ≤8 | 「这 8 对是历史包袱，不判红；新增第 9 对必须红」 | 见 4.3 |
| 13 | `dist-structure-over3` | 同一标签 >3 案即 FAIL | 契约 §F「同一骨架最多 3 次」 | 不会 |

#### 4.2 我建议**删/改**的

| 断言 | 问题 | 建议 |
|---|---|---|
| #11 `dist-tone-coverage` 的「7 种必须都在」 | **与 `OFFERING.md` §3.2 E 直接冲突**：「`tone` 7 个词扩到 **≥12 个词**，每词 ≤3 案」。现实现下，**任何用新调性词的新案都会被判 FAIL**（本轮实测：`+'干净克制 / 医疗'` → `dist-tone-coverage` FAIL「只有 1 案（要求 ≥3）」）。这会让「扩到 12 个词」变成**闸门禁止的动作** | 改成 **`expected ∪ actual` 全覆盖检查 + 每个词 ≤3 案**：地板只对 7 个原始词生效，新词按「≤3 案」判。即：**缺词要红（防塌缩），多余词只查上限（防堆积）** |
| #10 `dist-warm-pale-share` 的上限 60% | 18/30 = **恰好** 60.0%，`share > 0.60 + 1e-9` 判 FAIL。新增 1 个非暖浅案 ⇒ 18/31 = 58.1% ✓；新增 1 个暖浅案 ⇒ 19/31 = 61.3% ✗。**阈值本身没错**，但它是「恰好压线」，任何一次数据抖动（如 S30 被判成暖色）都会红 | 保留，但**加一条 INFO 打印分母**（现在只打印占比） |
| #12 `dist-structure-collision` 的 `BASE_PAIRS = 8` | 只用**对数**做上界，不看**分布**。实测漏洞：一个案子从「单例」变「双例」对数 +1 会红；但一个案子从「双例」变「三例」对数**不变**，闸门绿——而契约 §F 允许 ≤3，所以「3 例」是合法的，**但它让骨架种类从 22 掉到 22（不变）而某一格有 3 个候选**。这不是缺陷，只是「对数」这个指标的信息量不足 | 保留对数上界；**另加一条 INFO**：打印 `labels` 数（已有）与「每标签案数直方图」，让人看见「有没有标签堆到 3」 |

#### 4.3 它**漏了**的（防假绿的关键）

这是本节的核心。仓库反复出现的病是「闸门读错字段 → undefined → 整段静默跳过 → 打印 FAIL 0」。**这份新闸门在 `dist-parsed` / `dist-axes-missing` 两条上做得很好**（参照 `check-prompts.mjs:421-425` 的 `mech-empty`：`if (!mech) add('FAIL', id, 'mech-empty', …)` —— **取不到就 FAIL，不许 `if (mech) { … }` 跳过**）。但它有**四处同形状的漏洞**，本轮全部实测过：

**漏洞 1（最严重）：`chroma: 0` 白送「很安静」地板**

`collect-schemes.mjs:612`：
```js
const chroma = Math.max(0, ...(rec.palette || []).map((h) => (hslOf(rgbOf(h)) || { s: 0 }).s));
```
`palette` 为空时 `Math.max(0)` = **0**。而 `check-distribution.mjs:145` 的 pick 是 `r.chroma <= 25` ⇒ **0 命中**。

本轮实测：把 3 个 `chroma: 0` 的假案塞进去 ⇒ `very-quiet` 从 2 秒变 5，**地板达标**，闸门全绿。

**而 `palette` 为空是真实可达的**：`_CURRENT-VALUES.md` 缺行 + 规格里色值全被剔除（`collect-schemes.mjs:520-527` 的三道剔除）时，`pal = []`。

**补法**（照 `mech-empty` 的形状）：
```js
// 在 TARGETS 之前，加一条
const zeroChroma = rows.filter((r) => r.chroma === 0);
if (zeroChroma.length) add('FAIL', 'dist-chroma-zero',
  `这些案的 chroma = 0：要么 palette 为空、要么色值全被剔除 —— 它们会白送「很安静」地板：${ids}`);
```
判据：**`chroma === 0` 在全库 30 案里一次都没出现过**（实测最小 12）⇒ 出现即数据坏了，不是「真的很安静」。

**漏洞 2：`minPics` 缺失 ⇒ `low-photo` 恒 0，且与「真的没有这个能力」不可分**

`buildRows`（`:234`）`minPics: cap.minPics` —— `cap` 缺失时是 `undefined`；pick（`:152`）是 `typeof r.minPics === 'number' && r.minPics <= 2` ⇒ `undefined` 永不命中。

本轮实测：把 `prompts.js` 的 capacity 全清空 ⇒ `low-photo` = `{count:0, min:2, ids:[]}`，**FAIL 一条没有**，只报 WARN（缺口类）。

**补法**：
```js
const noCap = rows.filter((r) => typeof r.minPics !== 'number' || typeof r.minItems !== 'number');
if (noCap.length) add('FAIL', 'dist-capacity-missing',
  `这些案没有 numeric minPics/minItems（prompts.js 的 capacity 缺失）—— 「少货少图」地板对它们无效：${ids}`);
```
判据：**`minPics/minItems` 是 `_CONTRACT.md` §7 与 §5.1 第 6 条要求的必填字段**（「`capacity.minItems` / `minPics` 有值，并如实标注 `degrades`」）⇒ 缺失即契约违约，本来就该 FAIL。

**漏洞 3：一案可同时喂两个地板 ⇒ 「补 2 个缺口」可以只加 1 案**

本轮实测：`#C9A8DD`（H277 S44 L76）同时满足 `mid-lightness`（band=中间明度带）与 `bright-purple`（hue 260-320 ∧ L≥60）。

后果：Q2 的验收「中间明度 1→2、亮底紫 0→1」**可以用一案完成**，而计划假设是两案。

**这不是 bug，是「地板」这个指标的性质**。**补法不是改判据，是加一条报告**：
```js
// 在 floor 统计之后
const feeds = {};  // id -> [地板名]
for (const t of TARGETS.filter((x) => x.kind === 'floor')) for (const r of rows.filter(t.pick)) (feeds[r.id] = feeds[r.id] || []).push(t.key);
const multi = Object.entries(feeds).filter(([, v]) => v.length > 1);
if (multi.length) add('INFO', 'dist-multi-feeder',
  `这些一案同时喂饱多个地板（Q2 验收时不许把它们当多个缺口算）：${multi.map(([id, v]) => id + '=' + v.join('+')).join(' ')}`);
```
**注意：这一条现在是 `add('INFO', …)`，而 `check-distribution.mjs` 里 `add('INFO', …)` 的调用数为 0**（本轮 grep 确认）—— 文件头 `:173` 注释承诺过「会记一条 INFO 让人看见」，**从未实现**。见 §6-7。

**漏洞 4：`dist-band-consistency` 只比对 HSL，`bandLab` 是死字段**

`buildRows` 算出 `bandLab`（`:228-236`，用 CIELAB L\* 映射到同一套带名），`printTable` 也打印它，**但没有任何断言用它**。本轮实测：

- HSL 口径：暖浅 18 / 中间调 **1**（S09）
- Lab 口径：暖浅 **19** / 中间调 **0**

⇒ 「全库有 1 个中间明度方案」**完全是尺子造出来的**。而 `index.html:90` 的对外文案用的是 HSL 口径。

**这不是「闸门漏了一条断言」，是「产品口径没定」。** 补法不是加断言，是**加一条 INFO 把两把尺子的差打印出来**（`printTable` 已打印，但 `--brief` 之外的默认输出不打印表）：
```js
const labDiff = {}; for (const r of rows) labDiff[r.bandLab] = (labDiff[r.bandLab] || 0) + 1;
add('INFO', 'dist-ruler-divergence', `HSL 口径 ${…} / Lab 口径 ${JSON.stringify(labDiff)} —— 中间调在 Lab 下是 0 案`);
```

#### 4.4 断言清单（最终的、建议的）

| 名字 | 类型 | 阈值 | 会不会误报 | 现状 |
|---|---|---|---|---|
| `dist-parsed` | 前置 | 行数 = `SCHEMES.length` | 否 | ✅ 已有 |
| `dist-axes-missing` | 前置 | 0 案缺 axes | 否 | ✅ 已有 |
| `dist-color-unparsed` | 前置 | 0 案解析失败 | 否 | ✅ 已有 |
| `dist-band-unparsed` | 前置 | 0 案带名 `null` | 否 | ✅ 已有 |
| **`dist-chroma-zero`** | **前置** | **0 案 `chroma===0`** | **否**（全库最小 12） | **❌ 缺** |
| **`dist-capacity-missing`** | **前置** | **0 案缺 numeric minPics/minItems** | **否**（契约必填） | **❌ 缺** |
| `dist-band-consistency` | 前置 | 自算 band = data.js band | 会（重构分类阈值时） | ✅ 已有 |
| `dist-mid-lightness` | floor（gap） | ≥2 | 否 | ✅ 已有 |
| `dist-bright-purple` | floor（gap） | ≥1 | 否 | ✅ 已有 |
| `dist-very-quiet` | floor（gap） | ≥5 | **会**（`chroma=0` 白送，靠 `dist-chroma-zero` 兜住） | ✅ 已有（需配对） |
| `dist-low-photo` | floor（gap） | ≥2 | **会**（capacity 缺失，靠 `dist-capacity-missing` 兜住） | ✅ 已有（需配对） |
| `dist-warm-pale-share` | shareCap | ≤60% | 会（压线值） | ✅ 已有 |
| `dist-tone-coverage` | perValueFloor | 7 词各 ≥3；**新词只查 ≤3** | 会（现实现禁止新词） | ⚠️ **需改** |
| `dist-structure-collision` | noNewPairs | ≤8 对 | 否 | ✅ 已有 |
| `dist-structure-over3` | 硬 | 无标签 >3 案 | 否 | ✅ 已有 |
| **`dist-multi-feeder`** | **INFO** | **打印一案喂多地板** | — | **❌ 缺** |
| **`dist-ruler-divergence`** | **INFO** | **打印 HSL vs Lab 两套带的计数差** | — | **❌ 缺** |

#### 4.5 与 `few-pictures` 的冲突（计划 `CRITIQUE-OFFERING.md:127` 提过，本轮确认仍存在）

`minPics≤2` 的新案照现有渲染链做原型，**每一案都会吃 `few-pictures` FAIL**：

- `vendor/rules.mjs:113`：`pics = realPictures + uiPictures; if (pics < 4) add('FAIL', 'few-pictures', …)`
- `verify-prototype.mjs:166`：`if (p.realPictures < 4) out.problems.push(…)`
- `_CONTRACT.md:93`：「`realPictures` 在桌面档 **≥4**」
- `_CONTRACT.md` §9.15 的允许表**只有 5 条**（`mono` / `font-count` / `font-fallback` / `measure` / `palette-terracotta`），**没有 `few-pictures`**

⇒ **`check-distribution --strict` 要求的 `low-photo ≥2` 与 `check-contract` 的「FAIL ⊆ 允许表」正面冲突**，且 `check-contract.mjs:199-204` 会因 `few-pictures` 不在允许表而 FAIL。

**补法（三选一，是产品决定）**：
1. 把 `few-pictures` 加进 §9.15 允许表，**限定给 `minPics≤2` 的案**（不是全局豁免）；
2. 新案用 `data-ui` 标记把可选装饰块算进 `uiPictures`（`vendor/probe.mjs:418`），让 `realPictures+uiPictures ≥4`；
3. 改 `rules.mjs:113` 的阈值 —— **最不推荐**（那是 vendor 来的第三方规则，改它等于丢上游）。

**未验证**：`data-ui` 这条路能不能真的把 `uiPictures` 撑到 4（`uiPictures` 要求元素 `getBoundingClientRect()` 宽 ≥300 且高 ≥200，见 `vendor/probe.mjs:418`）。这需要在 N31 上实跑一次 `render-scheme.mjs` 才知道。

---

### Q5. 「≤180 字判决层」这个数从哪来

**结论：这个数是拍的，但拍得基本合理 —— 只是在当前数据下，它装不下计划自己要求的内容。给出替代数与拆法。**

#### 5.1 溯源

`≤180 字` 只出现在两处：`00-MASTER-PLAN.md:121`（「判决层（≤180 字）」）与 `DELIVERY.md:125,144`（「≤1 屏 / ≤180 字」「它就是用户判断『是我的店吗』的全部输入，≤180 字」）。**两份文档都没有给这个数的推导。**

#### 5.2 我实测的字段字数（30 案，去空白计）

| 字段 | 来源 | min | 中位 | max |
|---|---|---:|---:|---:|
| `plain`（一句人话） | `prompts.js` | 10 | 14 | 17 |
| `scenesYes` | `data.js`（切分后） | 33 | 67 | 121 |
| `scenesNo` | `data.js`（切分后） | 22 | 49 | 84 |
| `def`（一句话视觉定义） | `data.js` | 69 | 92 | 110 |
| 12 段合计 | `data.js` | — | **3,084** | — |

**四种组合的实测区间**：

| 组合 | min | 中位 | max | ≤180 的案数 |
|---|---:|---:|---:|---:|
| `plain + scenesYes + scenesNo` | 70 | 137 | **181** | **29/30** |
| 同上 + `def` | 153 | 224 | **269** | 3/30 |
| `def + scenesYes + scenesNo`（`_det/_judgment-layer.mjs` 的口径） | 167 | 279 | 334 | 0/30（那脚本按 `>180` 判，报 29/30 超） |
| 同上 + `risk` | 324 | 469 | 613 | 0/30 |

**所以：`≤180` 这个数在「plain + 适合 + 不适合」这一组上刚好是 29/30 通过、1 案（S21 = 181 字）差 1 个字。** 这更像是「量完之后定的」，不是「先定后量」——但也没有任何文档记录这个巧合。

#### 5.3 我推的替代数与拆法

**建议拆成三条独立、可机器判定的预算**（而不是一个总数）：

| 层 | 内容 | 预算 | 依据 |
|---|---|---:|---|
| **判决层 A：能不能用在我这行** | `plain` + `scenesYes 首句` + `scenesNo 首句` + `capacityHTML` | **≤180 字（P95）** | 实测：`plain+首句 yes+首句 no` = 60–113 字（min 60 / med 85 / max 113），加 `capacityHTML` 的 12–15 字 ⇒ **72–128 字，30/30 全部 ≤180**。**这个 180 是真的宽裕，不是压线。** |
| **判决层 B：像不像我的店** | `def`（一句话视觉定义）+ 两个色块 + 一张 desktop-fold 截图 | **不设字数上限，只设「≤1 屏」** | `def` 的 69–110 字是不可压缩的（它要「在脑中成像」）；再加字数只会删掉它存在的理由 |
| **施工层** | 其余 11 段（含 `scenesYes/No` 全文、`risk`、`audit`、`layout`…） | 全折，summary 印字数 | 今天 `field()` 第 4 参已有此能力（`app.js:1161` 的 `foldHint`） |

**为什么用「首句」而不是全文**：`scenesNo` 全文的 max 是 84 字，但 `capacityHTML` + `def` 一加就破 180。而「首句」已经承载了极性判断（`app.js:1418-1424` 明写「25/30 案的首句里没有否定词 ⇒ 前缀必须自己带」—— 本轮复算：**28/30**，见 §6-8）。首句截断**不会翻转语义**，因为 `scenesNo` 的负向语义由字段名前缀「不适合：」承担，不由首句承担。

**关键验证**：`DELIVERY.md:352` 建议卡片上 `scenesNo` 截到 42 字。本轮实测 **30 案的首句全部 ≤42 字**（超 42 的 0 案）⇒ 那条截断规则**在实际数据上从不触发**，是安全的。

#### 5.4 判决层与「施工层的折叠态」是**替换**还是**叠加**？

**是叠加，但叠加的代价被低估了 —— 而且会打红一条现有闸门。** 逐条：

1. **折叠机制今天已经存在**：`app.js:1161` `function field(label, val, cls, foldHint)`，第 4 参有值就折。今天 **11 个 `field()` 里 4 个带 `foldHint`**（布局与网格 / 可落地要点 / 关键视觉元素 / 动效与交互），**7 个平铺**，加 `auditFold(r)`（第 5 个折叠）+ `fieldOut('不适合的场景')`（第 13 段内容、不计入 12）。本轮实测：`field('` = 11、`fieldOut('` = 1、`auditFold(r) +` 存在 ⇒ `totalFields = 12`。
2. **`check-docs.mjs:443` 用 `field('` 字面量数段数**：`const fieldCalls = (js.match(/\bfield\(\s*'/g) || []).length`，`:447` `totalFields: fieldCalls + (hasAuditFold ? 1 : 0)`，`:770` 与 README 的「全部 N 段字段」比。
3. **判决层若用 `field()` 实现，就会 +N 段**：
   - 判决层用 2 个 `field('适合')`/`field('不适合')` ⇒ `fieldCalls = 13` ⇒ `totalFields = 14` ⇒ `check-docs` **FAIL「README 写 12 段，app.js 实测 14 段」**。
   - `CRITIQUE-DELIVERY.md:214-219` 已经算过这个（「变体 A：fieldCalls 12 → totalFields 13 ⇒ FAIL」），**本轮复核结论相同**。
4. **判决层若用裸 HTML（`fieldOut` 或新函数）**：`fieldOut` 不计入（`app.js:1189`，`check-docs` 的正则 `\bfield\(\s*'` 不匹配 `fieldOut('`）⇒ 12 段不变，`check-docs` 绿。**这是唯一不动闸门的写法。**
5. **但 README 会变成假话**：`README.md:74,157` 写「第 12 段字段『去 AI 味审查点』是折叠的」「其中一段折叠」。全折之后是「其中五段折叠」⇒ **`check-docs` 不解析这两句**（本轮 grep 确认），**闸门不会替你发现**。

⇒ **结论：判决层与施工层的折叠态是「叠加」，但必须 (a) 判决层用 `fieldOut` 式的裸 HTML 外壳，(b) 同步改 `README.md:74,157` + `README-EN.md` 的双语句，(c) 把「5 段折叠」改成从 `app.js` 现算（`fillDerived` 已算 `field-count`，再加一个 `fold-count` 是 5 行）。**

**这条改动的最小一致迁移成本**：`CRITIQUE-DELIVERY.md:250` 估「1.5–3 人日，不是 3 小时」，本轮复核受影响面为 8 处（app.js / style.css / index.html:224 / collect-schemes 的 `scenesNoBrief` / check-docs 的计数口径 / 双语 README / 两个 CDP 探针 / 冻结产物）。**接受这个估法。**

---

## 2. 工作包

每个包：编号 / 目标 / 输入 / 产出（文件路径）/ 验收判据（**可机器判定**）/ 人天 / 依赖 / 风险。

> 人天按「一个人、熟悉本仓、可被打断」估。**「可机器判定」一律给可执行命令或 `file:line` 断言，不写「检查是否合理」。**

### N00 · 「30」的第二真源清理（**前置，必须最先**）

| 项 | 内容 |
|---|---|
| 目标 | 让「有几案」只有**一个来源**（磁盘目录），消灭手工数字的静默失效 |
| 输入 | §1.2 的 16 条清单 |
| 产出 | `prototypes/_build/{collect-schemes,extract-specs,summarize-all,check-twolines}.mjs`（**4 个已由并发写入者改好，本包只需复核 + 补测试**）；`prototypes/_prompts/build-prompts.mjs`（`:380` 的日志口径）；`prototypes/_build/{check-stale,check-contract}.mjs`（补「新案无报告」口径对齐） |
| 验收 | ① `node prototypes/_build/collect-schemes.mjs --check` 退出 0，且输出行数 = `ls -d prototypes/S\d\d-*/ \| wc -l`<br>② **临时**建一个 `prototypes/S99-probe/{index.html,style.css,assets/}`（不改任何数据文件），跑 `collect-schemes --check`，**输出行数必须自动变 31**，删目录后回 30 —— 这是「参数化真的生效」的**唯一可证伪判据**<br>③ `node prototypes/_build/check-twolines.mjs` 在 S99 存在时报 `coverage` FAIL（而不是静默） |
| 人天 | **2**（4 个文件已改，本包主要是复核 + 写 ①②③ 三条断言；③ 要新增一个 `check-*.mjs --selftest` 用例） |
| 依赖 | 无。**但必须与 §0.2 那个并发写入者合并，不能并行改同一文件** |
| 风险 | **高**：`_CONTRACT.md` §9.1「一个方案目录只能有一个写入者」的同类问题在这里以「一个构建脚本只能有一个写入者」的形式出现。本轮已实测到同一文件被另一个写入者改动的现象 |

### N01 · 渲染链复验 + 新案脚手架

| 项 | 内容 |
|---|---|
| 目标 | 证明「新建一案 → 三档 report.json」这条链在**新案**上今天可跑；把「新案要几步」固化成脚本 |
| 输入 | `vendor/` 四件、`_CONTRACT.md` §3、§2.2 的 `_det/run3` 证据 |
| 产出 | ① `deliverables/75-q2/N01-render-verify.md`（一轮完整实录：命令 / 耗时 / FAIL/WARN 计数 / `report.json.at`）<br>② `prototypes/_build/new-scheme.mjs`（**新脚本**：建目录骨架 + 断言 7 个必填输入齐全 + 打印「还差什么」，**不生成内容**） |
| 验收 | ① `node prototypes/_build/render-scheme.mjs S17-revenue-stamp-stub` 退出码 ∈ {0,1}，且 `report.json` 的 `at` **必须变**（`git diff --stat prototypes/S17…/.inspect/report.json` 非空）<br>② 跑完 `git status --porcelain prototypes/S17…/.inspect/` **不得出现 `D`**（删图缺陷不复发）<br>③ `node prototypes/_build/new-scheme.mjs S99-probe` 在缺 `_specs/S99.md`、缺 `_CURRENT-VALUES.md` 行、缺 `minitems-parsed.json` 条目时，**三条都报出来并 exit 1**（照 `mech-empty` 的形状：缺就 FAIL，不许跳过） |
| 人天 | **1.5**（渲染一次 63 s + 写脚手架） |
| 依赖 | N00（否则新目录被静默丢弃） |
| 风险 | 中：`new-scheme.mjs` 若写成「缺什么就报警但继续」，就变成下一个 §9.15 |

### N02 · 分布闸门补漏

| 项 | 内容 |
|---|---|
| 目标 | 把 §4.3 的四处漏洞补上，并把 `dist-tone-coverage` 改成不禁止新调性 |
| 输入 | `check-distribution.mjs`（已存在）、§4.1–4.4 |
| 产出 | `prototypes/_build/check-distribution.mjs`（改）+ 自测用例从 11 条扩到 **15 条**（新增 `dist-chroma-zero` / `dist-capacity-missing` / `dist-multi-feeder` / `dist-ruler-divergence` 各一条变异） |
| 验收 | ① `node prototypes/_build/check-distribution.mjs --selftest` 输出 **15/15**，且**必须包含一条「4 个新断言在对应故障下会红」**<br>② **反证恒假**：`--selftest` 里有一例「把 3 个 `chroma:0` 的假案塞进去 ⇒ `dist-chroma-zero` 必须红」；再一例「正常 30 案 ⇒ 它必须绿」（照 A2 那条的写法）<br>③ `node prototypes/_build/check-distribution.mjs` 在**当前真实数据**上仍是 `FAIL 0 / WARN 4`（补漏不得造成新假红）<br>④ 新增一例「用第 8 种调性词的新案 ⇒ 只报 `dist-tone-overflow` 的 INFO/上限，不报 `dist-tone-coverage` FAIL」 |
| 人天 | **2**（改 4 处 + 4 条变异） |
| 依赖 | N00（`dist-parsed` 靠 `SCHEMES.length` 与行数比，新案落地后才有意义） |
| 风险 | 中：`dist-tone-coverage` 一改，`00-BRIEF §F.4`「7 种每种 ≥3」这条**契约原文**就与闸门不一致了 ⇒ **必须同步改 `00-BRIEF-AND-CONSTRAINTS.md`，或在闸门注释里写明「以 OFFERING §3.2 E 为准」**。这是一处真实的文档冲突，见 §6-9 |

### N03 · 详情面板分层

| 项 | 内容 |
|---|---|
| 目标 | 12 段压成「判决层 A + 判决层 B + 施工层」；判决层能回答「这是不是我的店」；折叠不丢内容 |
| 输入 | `app.js:1161 field()`、`:1189 fieldOut()`、`:1289 renderDetail`、`:1380-1430` 的 13 个调用点、`:490 capacityHTML`、`:506 plainOf`；`check-docs.mjs:437-448` 的 `panel/fields` |
| 产出 | `prototypes/_selection/app.js`、`style.css`、`index.html:224`、`README.md:74,157`、`README-EN.md` 同段；`prototypes/_build/check-docs.mjs`（若改计数口径） |
| 验收 | ① `grep -o "\bfield('" prototypes/_selection/app.js \| wc -l` **必须仍是 11**（判决层用 `fieldOut`，不许 +1）<br>② `node prototypes/_build/check-docs.mjs` 的 `panel/fields` 仍 `✓ 12 段字段`<br>③ `node prototypes/_build/probe-ui.mjs` 的 `scenes-no-rendered` 断言仍绿（`.field-out` 仍在）<br>④ **判决层字数**：新加一条 `check-ui-copy.mjs` 断言 —— 从 `data.js`/`prompts.js` 现算「`plain` + `scenesYes` 首句 + `scenesNo` 首句」的 30 案 max，**必须 ≤180**（本轮实测 max = 113，加 `capacityHTML` 的 15 字 = 128）<br>⑤ `index.html:224` 的「其中 5 段默认折叠」改成 `data-derived="fold-count"`，且 `fillDerived` 的 `vals` 里加这个 key（否则 `check-ui-copy` 的 `derived-key-unknown` 会红） |
| 人天 | **3**（`CRITIQUE-DELIVERY.md:250` 估 1.5–3；本轮复核受影响面 8 处，取上限） |
| 依赖 | N02（判决层的字数口径要进闸门）、N00（`README` 双语句同步） |
| 风险 | 中高：**`README.md:74,157` 的「其中一段折叠」会变成假话，而 `check-docs` 不解析这两句** ⇒ 必须人工改，且写进 N04 的验收 |

### N31–N35 · 五个新案（每案 8 道工序，见 §3.3）

| 项 | 内容 |
|---|---|
| 目标 | 补 4 个缺口：中间明度 ≥2、亮底紫 ≥1、很安静 ≥5、`minPics≤2` ≥2；不加第 9 对结构撞车 |
| 输入 | `_CONTRACT.md`、`_CURRENT-VALUES.md`、`_CURRENT-VALUES.md §4` 的错误码表（新案要新增错误码）、`minitems-parsed.json`、`02-anti-ai-rules.md` |
| 产出（每案） | ① `deliverables/07-schemes-31-35.md`（12 字段，沿用 04/05/06 的书写惯例）<br>② `prototypes/_specs/S3x.md`（由 `extract-specs.mjs` 生成）<br>③ `prototypes/_specs/_CURRENT-VALUES.md` 新增行（bg/primary/buttonText/errorCode）<br>④ `prototypes/S3x-<kebab>/{index.html,style.css,assets/}`<br>⑤ `.inspect/`（三档 + ≥2 page + report.json）<br>⑥ `prototypes/_prompts/minitems-parsed.json` 新增条目（实测 minItems/minPics/degrades）<br>⑦ `deliverables/S3x-adjudication.md`（`_CONTRACT.md:127` 指定的交付说明载体）<br>⑧ `prompts.js` 重生成 |
| 验收（每案，逐条可机器判定） | ① `node prototypes/_build/render-scheme.mjs S3x-…` → `FAIL=0` 或 FAIL ⊆ §9.15 允许表（`check-contract.mjs` C1）<br>② `node prototypes/_build/verify-prototype.mjs S3x-…` 退出 0<br>③ `node prototypes/_build/check-prompts.mjs` 的机制句断言对该案 PASS（**`mech-value-*` 不出现该案 id**）<br>④ `assets/CREDITS.md` 逐张有 artist + license + 许可允许再分发（`schemes.md` §5.3 的五类：CC0/PD/CC BY/CC BY-SA/无已知限制）<br>⑤ `minitems-parsed.json` 有该案条目且 `degrades` 有值<br>⑥ `node prototypes/_build/check-distribution.mjs --brief` 里该案**出现在预期地板**上<br>⑦ **人判**（写进 `adjudication.md`）：第 7 条「解决哪个现存方案解决不了的处境」+ 第 8 条「与最接近那一案的结构差异」<br>⑧ `git status --porcelain prototypes/S3x-…/.inspect/` **无 `D`** |
| 人天 | **每案 4–6 人天**（`schemes.md` §6.3 实测：机器时间 1 分 24 秒；**真正成本在写作与素材**）。5 案 = **20–30 人天** |
| 依赖 | N00、N01、N02。**N31/N33/N34 还依赖 §4.5 的 `few-pictures` 决定** |
| 风险 | **最高**。三条：(a) `few-pictures` 冲突未定 ⇒ N31/N33/N34 可能根本过不了闸门；(b) `minPics≤2` 在 `prompt-copy.js:699` 的输出是「至少要 2 个不同的图片位」，**0 图时第 4 条仍会要求 2 张** ⇒ **提示词必须新增一条「0 图降级规则」，今天没有**（`grep 0 图 prototypes/_selection/prompt-copy.js` = 0 命中）；(c) `_CURRENT-VALUES.md` 缺行会让 `axes.loud` 白送「很安静」（§4.3 漏洞 1） |

### N04 · 向导与芯片合并答案

| 项 | 内容 |
|---|---|
| 目标 | 行业芯片 / 「你经营什么」输入框 / 向导五问 —— 三处各存一份答案，收成一份 |
| 输入 | `prompt-copy.js:1128-1133`（两个输入框）、`:1307-1390 mountSceneChips`、`:96-116 promptOpener`；`wizard.js:52-80`（五问）、`:275-284`（回放）；`app.js:604-660 syncEmptyFacts` |
| 产出 | 一份共享的用户自述（localStorage 或 URL 单一真源）+ 三处读它；`prompt-copy.js`、`wizard.js`、`app.js` |
| 验收 | ① `node prototypes/_build/probe-ui.mjs` 新增断言：**在芯片上点「咖啡店」后，`buildPrompt()` 输出的首行包含「咖啡店」** —— 今天不可能（芯片只筛卡片、输入框才进提示词）<br>② 向导答完后，`buildPrompt()` 的首行包含向导里的答案（今天 `grep buildStylePrompt wizard.js` = 0 命中）<br>③ 三处不得各自写 localStorage：`grep -c "localStorage" app.js prompt-copy.js wizard.js` 必须只在一处出现 |
| 人天 | **3** |
| 依赖 | 无（可并行）。**但改 `prompt-copy.js` 与 N03 冲突（同一文件）** ⇒ 与 N03 串行 |
| 风险 | 中：`prompt-copy.js` 125 KB，`check-prompts.mjs` 依赖它跑 `buildStylePrompt`；任何签名变更要同步 `check-prompts.mjs:53-70` 的 stub |

### N05 · 文案与文档迁移（**必须最后**）

| 项 | 内容 |
|---|---|
| 目标 | 所有「30」类数字改成现算；所有闸门数字与实测对上 |
| 输入 | §1.2 的类 C 清单、`check-docs.mjs --selftest` 的 6 个夹具 |
| 产出 | `README.md` / `README-EN.md` / `index.html` / `_selection/index.html` / `wizard.html` / `check-docs.mjs`（selftest 夹具） |
| 验收 | ① `node prototypes/_build/check-docs.mjs` 0 FAIL / 13 PASS<br>② `node prototypes/_build/check-docs.mjs --selftest` 全绿（**注意：夹具里 7 处硬编码「30 个方案」，案例数变了要一起改，否则 `--selftest` 会 `exit 2` 并说「README 又变了」——这是它设计好的行为，不是 bug**）<br>③ `node prototypes/_build/check-ui-copy.mjs` 0 FAIL<br>④ `node prototypes/_build/probe-ui.mjs` 全绿<br>⑤ **新增一条 `check-ui-copy` 断言**：`index.html` 剥注释后，`rail-hint`/`wizard.html`/`title`/`meta description` 里的裸数字必须为 0（今天 `:90` 的「30 个里有 18 个」两个数都裸奔，`check-ui-copy.mjs:96-107` 的 `HARDCODED_GUARDS` 一条都不覆盖）<br>⑥ `grep -c "272\|18 / 30" README.md` 必须为 0（或改成 `<span data-derived>` 的出处） |
| 人天 | **2.5** |
| 依赖 | N00、N03、N31–N35 全部完成 |
| 风险 | 中：`--selftest` 的夹具依赖 README 原文，改 README 必然改夹具；**这个连锁是本仓已知的**（`check-docs.mjs:49-50` 自己写着「README 变了它会当场告诉我」） |

---

## 3. 建议执行顺序（拓扑序）

```
阶段 0（串行，1 天）   合并 §0.2 的并发改动 → N00 复核（2 天）
                       ↓
阶段 1（并行，2 天）   N01 渲染复验 ──┐
                       N02 分布补漏 ──┤  （两者都只改 _build/，可并行）
                       N05 的第一步：决定 few-pictures 口径（§4.5 三选一）── 这是 N31/N33/N34 的前置
                       ↓
阶段 2（串行，3 天）   N03 详情面板分层（改 app.js / style.css / prompt-copy.js 的调用点）
                       ↓
阶段 3（并行，20–30 天）N31 / N32 / N33 / N34 / N35  ── 每个案子独立，可 5 人并行
                       但 **必须与 N04 串行**（同一批文件的写入者）
                       ↓
阶段 4（串行，3 天）   N04 向导与芯片合并
                       ↓
阶段 5（串行，2.5 天） N05 文案与文档迁移 + check-distribution --strict 打开
```

**总计：34–48 人天**（不含缓冲）。与 `DELIVERY.md` 的季度 38 人天同量级，但**Q2 只是它的一个季度** —— 建议按 40 人天上限排，超出就砍 N04（它没有用户可见的即时收益）。

**可以并行的**：N01 ∥ N02 ∥（N05 的 few-pictures 决定）；五个新案彼此完全独立。
**不能并行的**：N00 与任何其他（改同一个文件）；N03 与 N04（同改 `prompt-copy.js`）；N05 与 N31–N35（数字要等最后定）。

---

## 4. 与 MASTER-PLAN 的分歧

### 4-1. 「中间明度从 0 → 2」的起点错了：实际是 1 案（S09），不是 0

`00-MASTER-PLAN.md:123` 写「中间明度从 0 → 2」。实测 `data.js` 的 `band==='中间明度带'` 只有 **S09**（`#F5C842`）。`check-distribution.mjs` 自己也报「1 案 < 地板 2（当前：S09）」。

**但这个分歧有个更深的一层，而且那一层支持计划**：S09 的 CIELAB L\* = **82.4**、WCAG 相对亮度 **0.611**——按感知口径它是**亮底**。本轮用 Lab 重算 30 案的带：**中间调 0 案**（全库 Lab L\* 的分布是 8 案在 3.1–16.2、22 案在 82.4–95.9，**中间是空的**）。

⇒ **分歧成立但方向两面**：HSL 口径 1 案、Lab 口径 0 案。计划选了 0 这个数却没写口径。**建议在计划里写成「HSL 口径 1 案 / Lab 口径 0 案，Q2 目标按 Lab 口径 ≥2」** —— 因为店主的「亮/暗」判断跟感知明度走，不跟 HSL 的 L 走。

### 4-2. §5.3 迁移清单有 2 处列错、漏了 9 处

**列错的 2 处**：
- `check-docs.mjs` 的 `nums/schemes`（计划 §5.3 第 3 行）**不用改**：`check-docs.mjs:579-591` 比的是 `F.schemes = SCHEMES.length`，本来就是动态的。要改的是 `:256,260,265,270,277,282` 那 **7 条 selftest 夹具的 `from`/`to` 字面量**（它们写死「30 个方案」）。
- `_build/_entries.mjs`（第 4 行）**不用改**：枚举用 `CASE_DIR_RE = /^S\d{2}-/`（`:24`），动态。计划引的是 `:24,73` 的**注释**。

**漏的 9 处**（全部是「静默失效」，比列出来的那两处更危险）：见 §1.2 的 #8–#16。其中最危险的三条：

| 漏项 | 后果 |
|---|---|
| `collect-schemes.mjs` 的 `for (let i = 1; i <= 30; i++)` | 放 `S31-…/` 会被**整段丢弃**，闸门全绿 |
| `extract-specs.mjs` 的 `for (let n = 1; n <= 30; n++)` | `_specs/S31.md` **永远不生成** ⇒ 该案是空壳 |
| `build-prompts.mjs:242` 的 `HUMAN[d.id] \|\| {plain:"", minItems:3, minPics:3}` | 漏填表时**静默兜底**，且 `minPics=3` 会污染「少货少图」画像；`plain=""` 会让卡片主句为空 |

> 注：前两条**已由本轮并发写入者改好**（`collect-schemes.mjs:352`、`extract-specs.mjs:65-66`）。**分歧仍然成立**，因为计划清单里没有它们。

### 4-3. 「暖浅色带 19/30」这个数我重现不出来

任务书给「暖浅色带：19/30」。本轮复算：`band==='暖浅色带'` = **18/30**，与 `README.md:429` 与 `OFFERING.md` §3.1 一致。

唯一能得 19 的口径是 `L≥78 ∧ (H≤70 ∨ H≥330)` —— 这会多算进 **S30 `#EDEDED`（H=0 / S=0）**。S30 是**无彩色**（`bandSat = 0`），它的 `bandHue = 0` 是「色相缺失填 0」，不是「暖」。把它算成暖色会让「暖浅」这个词失去意义。

⇒ **建议统一为 18/30**，并在 `check-distribution.mjs` 的 `warm-pale-share` 注释里写明判据是 `bandName() === '暖浅色带'`（它已经是这么判的，只是没写清）。

### 4-4. 「8 对结构撞车」的口径要说成「8 个标签各被 2 案占用」，不是「8 个方案对」

计划 §5.1 第 8 条与 `OFFERING.md` §3.1 都写「22 个结构标签里已有 8 对撞车」。本轮复算：**22 个标签、8 个标签各 2 案、涉及 16 案、8 对**。`22 = 30 − 8`。这个数对，但「8 对」容易被读成「16 案之外还有 8 对」⇒ 建议写成「**22 个标签 / 30 案 / 8 个标签被两案共用 / 涉及 16 案**」。

**另有一处更实质的问题**：`CRITIQUE-OFFERING.md:101` 说「全库真正同时满足『RGB<12 ∧ 四元组相同』的 5 对是 S04/S13、S06/S19、S10/S20、S10/S30、S26/S29」——**这是「四元组撞车」，与「结构标签撞车」是两个不同的集合**。本轮复算的 8 对**全部**是「结构标签撞车」，其中**只有 3 对四元组相同**（`MAG-TOC` S07/S25、`VERSUS` S10/S26、`DOSSIER` S13/S27）。⇒ **计划把两个集合混成了一个**。建议在 §5.1 第 8 条里写清：「结构标签撞车 8 对；其中 3 对连 `band+loud` 四元组也相同（S07/S25、S10/S26、S13/S27）—— **这 3 对才是真正读不出区别的**」。

### 4-5. 「`check-distribution.mjs` 是 Q2 要做的事」已过期

计划 §三 Q2 第二条写「**新增** 分布闸门」。**它已经存在、已接 CI、11 条自测全绿。** 计划需要改成「**补齐** 分布闸门的 4 处漏洞 + 改 `dist-tone-coverage`」。（这不影响计划的意图，只影响工作量估算：从「新建一个闸门」变成「改一个 635 行的闸门」，后者更小。）

### 4-6. `dist-tone-coverage` 与 `OFFERING.md` §3.2 E 直接冲突（**计划内部矛盾**）

- `OFFERING.md` §3.2 E：「`tone` 7 个词扩到 **≥12 个词**，每词 ≤3 案」。
- `check-distribution.mjs:166-178` 的 `dist-tone-coverage`：`expectValues` 写死 7 个词、`min: 3`。本轮实测：**新增任何用第 8 个调性词的案子 ⇒ `dist-tone-coverage` FAIL**（`'+干净克制 / 医疗'` → 「只有 1 案（要求 ≥3）」）。

⇒ **两份 74-plan 文档对同一件事给了互斥的要求，而闸门实现了错的那一份。** 这不是我的判断，是实测：闸门的输出就是「新词 = FAIL」。

**修法**：见 §4.2 —— 地板只对 7 个原始词生效，新词只查「≤3 案」。

### 4-7. 「`≤180 字`」这个数没有出处

`00-MASTER-PLAN.md:121` 与 `DELIVERY.md:125,144` 都用了这个数，**没有任何推导**。本轮补了实测（§5.2）：`plain+适合+不适合` 的 30 案 max 是 **181**（S21），中位 137。⇒ **180 这个数在「不加 `def`」的口径上刚好卡住 29/30**。建议改成三条预算（§5.3），把「≤180」还给「能不能用在我这行」那一层，而不是让它同时管「像不像我的店」。

### 4-8. `CRITIQUE-DELIVERY.md:345` 的「27/30 首句不含否定词」，实测是 28/30

`CRITIQUE-DELIVERY.md:345`：「我看数了 30 案：**27/30 的首句不含任何否定词**」。`app.js:1423` 的注释写「**25/30**」。本轮复算（首句 = 到第一个 `。；;` 为止，否定词表 `不|非|勿|避免|禁止|慎用|别`）：**28/30**。

三个数（25 / 27 / 28）互不相同，而这条判据**决定了「截断会不会翻转语义」**这一个安全问题。**建议写成一个可从数据现算的断言**，而不是三个手写数字。

### 4-9. `§5.3` 的「`.inspect/` 截图总数 272 张」没有守护

计划把 272 列为迁移点。本轮发现：**272 在 `check-docs.mjs` / `check-ui-copy.mjs` / `probe-ui.mjs` 里 grep 全部为 0 命中** —— 14 处「272」（README 7 处 + README-EN 7 处）**一个闸门都不管**。而它是一个**可精确复算**的量（`git ls-files "prototypes/S*/.inspect/*.jpg" | wc -l`）。⇒ 这是「计划列了但没安排守护」的一条，建议并入 N05。

---

## 5. 未验证清单（不猜）

| # | 未验证的事 | 为什么不验证 | 怎么验 |
|---|---|---|---|
| U1 | `data-ui` 旁路能否把 `uiPictures` 撑到 4，从而让 `minPics=0` 的新案过 `few-pictures` | 需要真跑渲染（任务要求不跑） | 在 N31 上跑一次 `render-scheme`，看 `report.json` 的 `metrics.page.uiPictures` |
| U2 | 新案 `#374A5C`（L29）会不会被渲染成更深的实际底色 | 需要真渲染 + 像素统计 | 渲染后跑 `check-distribution --brief`，看 `band` 是否仍是「中间明度带」 |
| U3 | `font ≤220 KB` 这个性能预算 | 只测到 871 个 woff2 / 30.3 MB 总量（`CRITIQUE-DELIVERY.md:405` 也说未测） | 与 Q2 无关，属 W2 遗留 |
| U4 | 「首屏 1.2 MB」是否达标 | 属 Q1-W2，不属 Q2 | — |

---

## 6. 逐条证据索引（便于复核）

| 条目 | 证据 |
|---|---|
| 渲染链已修 | `prototypes/_build/vendor/inspect.mjs:57`（launch）<br>`prototypes/_build/vendor/cdp.mjs:64`（60000）<br>`prototypes/_build/render-scheme.mjs:24-26,40,61,68` |
| 渲染链今天跑过 | `deliverables/75-q2/_det/run3/{console.txt,report.json}`，`at=2026-11-10T09:08:01.876Z`，`FAIL=0 WARN=3` |
| 分布闸门已存在 | `prototypes/_build/check-distribution.mjs`（635 行，`git status` 显示 `A`）；`.github/workflows/gates.yml:60-64`；`--selftest` 11/11 |
| `chroma=0` 白送很安静 | `prototypes/_build/collect-schemes.mjs:612`（`Math.max(0, ...[])`）<br>`prototypes/_build/check-distribution.mjs:145`（`r.chroma <= 25`）<br>本轮实测：3 个 `chroma:0` 假案 ⇒ `very-quiet` 2→5 且全绿 |
| capacity 缺失 ⇒ low-photo 恒 0 | `prototypes/_build/check-distribution.mjs:234`（`minPics: cap.minPics`）<br>`:152`（`typeof r.minPics === 'number'`）<br>`prototypes/_prompts/build-prompts.mjs:282-292`（`CAPACITY[d.id] \|\| null` 兜底） |
| 一案喂两地板 | 本轮实测 `#C9A8DD`：`band='中间明度带'` 且 `bright-purple` 命中 |
| `few-pictures` 冲突 | `vendor/rules.mjs:113`、`verify-prototype.mjs:166`、`_CONTRACT.md:93`、`_CONTRACT.md:194-201`（§9.15 只有 5 条） |
| 提示词没有 0 图降级规则 | `grep "0 图\|零图\|没有图" prototypes/_selection/prompt-copy.js` = 0 命中；`prompt-copy.js:699-700` 只有「至少要 N 个」 |
| 判决层字数 | 本轮实测：`plain` 10–17、`scenesYes` 33–121、`scenesNo` 22–84、`def` 69–110；`plain+yes+no` max 181（S21） |
| 折叠现状 | `app.js:1161`（`foldHint` 第 4 参）、`:1189`（`fieldOut`）、`:1380-1430`（13 个调用点）；本轮实测 `field('`=11、`fieldOut('`=1、`auditFold(r) +` 存在 ⇒ 12 |
| `check-docs` 段数口径 | `check-docs.mjs:437`（`field('` 正则）、`:447`（`totalFields`）、`:770`（与 README 比） |
| 结构撞车 8 对 | 本轮枚举：`SPLIT=S02+S30` 等 8 条；22 标签 = 30 − 8 |
| F/R 池已满 | 本轮枚举：F 15 案用 10 种（池 10 种）、R 15 案用 12 种（池 12 种） |
| 底线闸门的两处好样板 | `check-prompts.mjs:421-425`（`mech-empty`：取不到就 FAIL）<br>`check-contract.mjs:183-186`（`C0-report-missing`：无法判定≠成立） |
| `check-stale` 与新案口径相反 | `check-stale.mjs:46`（`if (!existsSync(rep)) continue;`）vs `check-contract.mjs:183`（缺失即 FAIL） |

---

## 7. 一句话结论

**Q2 的四件事里，两件比计划想的容易、两件比计划想的难。**

- **容易的**：渲染链（`vendor/` 已入库、删图缺陷已修、超时已改 60s、今天跑出过 FAIL=0）、分布闸门（已存在、已接 CI、11 条自测全绿）。
- **难的**：`minPics≤2` 与 `few-pictures` 的正面冲突（要改允许表或改靶子，是产品决定，不是工程活儿）；12 段分层要动 8 处文件且会打红 `check-docs` 的段数断言。

**而「把 30 参数化」确实是前置阻塞 —— 但不是计划说的那 7 处，是计划漏掉的 9 处里最危险的三处**（`collect-schemes` 的 `i<=30`、`extract-specs` 的 `n<=30`、`build-prompts` 的 `HUMAN` 兜底）。前两处本轮已被另一个写入者改好，第三处还在。**这三处的共同形状是「失效的样子是绿」—— 正是这个仓库 74 轮里反复记录的那一个病。**
