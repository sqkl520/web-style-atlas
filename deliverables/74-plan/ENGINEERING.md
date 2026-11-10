# 74 轮 · 工程地基方案（ENGINEERING FOUNDATION）

> 职责：让「店主浏览 → 选一个 → 复制提示词 → 交给 AI 做站」这条主路可被回归守住。
> Owner 的固定决策：公开开源、**陌生人只在 GitHub Pages 浏览、不 clone 不本地跑**；方案可自由增删归档；季度节奏、长期维护。
> 所以本方案 **不做** clone 体积优化、陌生人本地 onboarding、`npm install` 体验；只优化两件事：**Pages 上真能跑**、**维护者本地与 CI 能守门**。
> 基线 HEAD：`0432753`；侦察材料：`deliverables/74-recon/{00-SYNTHESIS,arch,toolchain,ux,docs}.md`。
> 口径：本方案里的「实测」如无特别说明，均为本机 Node v26.12.1 / 无头 Chrome CDP 复算；行号均为基线 HEAD 的行号。

---

## 0. 先说结论（七条决策）

1. **不引 Playwright、不 `npm install`。** 新建 `prototypes/_build/vendor/cdp.mjs`（从 `tools/.../lib/cdp.mjs` 复制，MIT，205 行，Node 22+ 内置 WebSocket）、一个 `prototypes/_build/probe-ui.mjs`（约 260 行）。**这就是最小回归装置**：它用真 Chrome 真点击、真按键、真复制，8 条断言逐条对应 8 个已知 UI 缺陷；本机实测冷启动 16.4 s + 页面装完 7.5 s + 断言 7.7 s ≈ **32 s**，CI 预计 15–45 s。
2. **`tools/` 不整体 vendor。** 只 vendor `cdp.mjs` 给回归探针；`check-contract.mjs:47` 额外需要的只是 `rules.mjs:137` 的 `RULE_IDS` 清单，改成读仓库内 `prototypes/_build/vendor/rule-ids.json`（由 `rules.mjs` 的清单抄出、带哈希与来源注释），`check-contract` 的 C1/C2 立刻能在 CI 当**硬闸**。其余 8 个检查器本来就零依赖，GitHub Actions 直接跑。
3. **CI 分三个 job：`static` 硬闸 / `browser` 硬闸 / `advisory` 只报不拦。** `verify-prototype.mjs --all` 因 S08 两条已豁免 FAIL 而**设计上永远 exit 1**，只能 advisory；`check-contract.mjs` 拥有 §9.15 允许表逻辑（`:132` `parseAllowTable`、`:191-202` C1），才是「FAIL 是否合法」的硬闸。
4. **保持零构建，但把「生成器 + 提交产物」制度化。** 47% 注释字节（口径见 §3）在 GitHub Pages 上被 gzip/brotli 吃掉大半，不是产品瓶颈；真正的首屏浪费是 **4.84 MB 隐藏 JPG**。加一个**维护者侧**的 `build.mjs`（跑生成器 + 内容哈希自证，产物仍提交），不上打包器、不引运行时构建。Pages 继续「推 main 即原样发静态文件」，`.nojekyll` 不能删。
5. **立即止血破坏性渲染**：`inspect.mjs:57-58` 的删图移位到 `Browser.launch()` 成功之后；更稳的做法是 `render-scheme.mjs` 传临时 `--out`，成功才原子替换。**两个独立守卫**：`verify-prototype.mjs:134` 改为 `stat` 每张声明的图；`check-stale.mjs:93` 补 `jpgs.length===0 && report 声明有图` 即红。
6. **`index.html` 从 0 断言变成「所有复算量都派生」。** 47 颗→运行时数出的 73（或 45 折叠态）；10 段→运行时数出的 12；其它 8 个量（30 案、44 词、16 直连、18 暖浅、19 扎眼、12 字段、f-total/f-built/f-clean/f-shots）一律由同一份 `data.js` / `prompts.js` 注入，不手打数字。
7. **生成物按内容判新鲜，不按 mtime。** `data.js`/`prompts.js`/`self-gate.js` 三个都是产品；`_entries.mjs:49` 把 `prompts.js` 当源是误分类；`data.js.gate.at` 与 `report.json.at` 必须逐案相等。CI 用 `--check` 重跑生成器、比 SHA-256，不一致即**硬失败并打印重生成命令**，绝不由 CI 偷偷提交。

**与其它 Agent 的接口**：提示词正确性工作依赖本方案的 §1（复制按钮的浏览器探针）、§6（生成链内容哈希）、§7 的 M1 前 10 天（CI 与 gate 可用）；反过来本方案不定义提示词语料与机制句，留给那位 Agent。

---

## 1. 最小可行回归装置（MVRH）

### 1.1 为什么是这个形状

| 选项 | 裁决 | 理由 |
|---|---|---|
| Playwright / `@playwright/test` | **否决** | 要 `package.json` + `npm install` + 下载浏览器；本仓库无 `node_modules`，CI 多一层可腐坏依赖；对 8 条断言是杀鸡用牛刀。 |
| 纯静态读源码（`node:vm` + 正则） | **否决做为唯一防线** | 这正是现有 8 个闸门的病：`check-docs.mjs` 读 `README.md`、`app.js` 只被剥注释后数 `field('` 字面量（`:439-442`），**从不执行 app.js**。它抓不到「28 颗 near 芯片没有样式」「复制后焦点掉到 body」「方向键吃滚动」。 |
| 直接 import `tools/.../lib/cdp.mjs` | **否决** | `.gitignore:2` 的 `tools/` 是**未锚定模式**，任意深度都命中（`git check-ignore -v prototypes/_build/vendor/cdp.mjs` 实测不命中，说明放 `_build/vendor/` 可行；`tools/...` 实测命中）。CI 拉不到它。 |
| **vendor 205 行 `cdp.mjs` + 自写探针** | **采纳** | 零 npm、Node 22+ 内置 `WebSocket`（本机 v26.12.1）、Chrome/Edge 由 `findChrome()` 自动找；GitHub `ubuntu-latest` 自带 Chrome；探针只依赖 `node:*` 与这个 vendor 文件。 |

**具体落地**：

```
prototypes/_build/vendor/cdp.mjs          ← 从 tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs 复制
prototypes/_build/vendor/LICENSE-MIT.txt  ← 从 tools/taste-skill/LICENSE 复制（21 行，Copyright (c) 2026 Leonxlnx）
prototypes/_build/vendor/rule-ids.json    ← rules.mjs:137 的 RULE_IDS 清单，供 check-contract 用
prototypes/_build/probe-ui.mjs            ← 新写，唯一入口：node prototypes/_build/probe-ui.mjs
```

`cdp.mjs` 里唯一需要改的是 `findChrome()`（`:11-38`）：加 `process.env.CHROME_PATH`（已有）与 CI 常见的 `/usr/bin/google-chrome`（已有），并把 `:61` 的 20 s 启动超时放宽到 60 s —— 本机冷启动实测 **16.4 s**，20 s 只剩 1.22× 余量，CI 上必然偶发失败。其余 API 直接用：`Browser.launch()`、`newPage()`、`page.goto(url,{settleMs})`、`page.eval(fn)`、`page.send('Input.dispatchMouseEvent' / 'Input.dispatchKeyEvent')`、`page.wheel()`、`browser.close()`。

**不要 vendor `inspect.mjs` + `probe.mjs` + `rules.mjs`（205+569+137=911 行）**：那是渲染/审美闸门，不是行为回归，且会把外部工具的规则版本锁死进仓库。`render-scheme.mjs` 保持「本机维护者自备 taste-skill」，CI 不跑重渲染（理由见 §2.4）。

### 1.2 一个脚本、一个页面、一次冷加载

`probe-ui.mjs` 的结构（约 260 行，全是 `node:fs` / `node:http` / `node:path` / `node:vm` / `./vendor/cdp.mjs`）：

```js
#!/usr/bin/env node
// node prototypes/_build/probe-ui.mjs [--url https://...] [--json]
import { createServer } from 'node:http';
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { Browser, sleep } from './vendor/cdp.mjs';

const ROOT  = decodeURIComponent(new URL('../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const TARGET = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null;
const CHECKS = [];
const ok   = (id, pass, want, got) => CHECKS.push({ id, pass: !!pass, want, got });

// ① 本地静态服务：与 inspect.mjs:30-49 同一套（root = 仓库根，no-store，404 不吞）
//    这样 ../_fonts/ 与 ../S01-.../.inspect/*.jpg 的相对路径与 Pages 上完全一致。
//    给 --url 时跳过服务，直接测已部署的 Pages URL（发布后自检用）。
// ② 数据期望值不从页面读：用 node:vm 单独装载 data.js / prompts.js（沙箱给一个空 window）
//    算出 chipTotal / fieldTotal / sceneIndex 等期望，避免「拿被测对象给自己出题」。
// ③ Browser.launch() → newPage({width:1440,height:900,dsf:1}) → goto → sleep(400)
// ④ 一次 page.eval() 取静态快照；真点击 / 真按键 / 真复制各一次；再取一次快照
// ⑤ 汇总：任一 pass=false → process.exit(1)，并打印 want/got/定位用的选择器
```

页面必须 **serve 而不是 `file://`**：`index.html:362-366` 依次加载 `data.js / prompts.js / prompt-copy.js / self-gate.js / app.js`，`file://` 下相对资源与 clipboard 权限都不同；而 Pages 是 HTTP。一个 `createServer` 约 25 行，MIME 表照抄 `inspect.mjs:35`。

**实测时长**（本机，2026-11-04，一次冷加载 1440×900）：Chrome 启动 `16,425 ms`、页面 load+settle `7,467 ms`、8 条断言+点击+按键 `7,673 ms`、合计 **25.96 s**（含浏览器关闭）。留余量写成 **30–60 s**；CI `timeout-minutes: 5`。

### 1.3 8 条断言的**确切清单**（逐条对应 8 个已确认缺陷）

以下「基线」是我用同一套 CDP 探针在 HEAD `0432753` 上实测出来的数，全部是**修复前**的失败值；每行给 `id / 期望 / 实际 / 怎么测`。

| # | 断言 id | 期望（修复后） | 基线实测 | 测法与定位 |
|---|---|---|---|---|
| 1 | `near-chip-visual-weight` | 28 颗 `.scene-chip.is-near` 与 16 颗 `.is-direct` 计算样式一致：`font-size` 13px、`border-top` `1px solid`（非 `2px outset`）、`padding-top` 4px（非 1px）、`background` 相同；且 `aria-pressed=true` 时背景/前景变化 | near = `{fontSize:"16px", border:"2px outset", background:"rgb(240,240,240)", padding:"1px"}`；direct = `{fontSize:"13px", border:"1px solid", background:"rgba(0,0,0,0)", padding:"4px"}` | 点 `.scene-toggle` 展开 `.scene-more`，对 two 组各取一颗 `getComputedStyle`。根因：`prompt-copy.js:1345` 把 near 挂到 `host.parentNode`（`.rail-block`）外，`style.css:322` 的 `.chips button` 选不中；`is-direct/is-near` 全仓 CSS 0 条规则。修法：把 `moreHost` 挂进 `#flt-scene`，或选择器扩成 `.chips button, .scene-more button`，并给 `.is-near` 加虚边、`[aria-pressed=true]` 加实心反馈。 |
| 2 | `chip-count-derived` | `#rail-fold summary.rail-fold-sum` 里的芯片总数 == `document.querySelectorAll('#rail-fold .chips button').length + .scene-more button.length`；且 `#flt-scene` 里的组数是 11；`index.html:145` 注释、`prompt-copy.js:1245` 注释、`check-docs.mjs` 的 README 断言三份副本都从同一常量取数 | summary 写 **47**；渲染 **45（折叠态）/ 73（全展开）**；`axesChips=45, chipsMore=28` | 断言必须**同时测折叠态 45 与展开态 73**，不许写死任一数字（方案增删会变）。`index.html:153` 与 `:145`、`prompt-copy.js:1245` 是三份副本。修法见 §5。 |
| 3 | `field-count-derived` | `index.html:211` 里「多数案 10 段、个别 9 段」消失；每个方案 `#d-body .fields > div` 恰好 **12** 段，30/30 一致 | 界面写 10/9；实测 `{"12":30}`，`fields=12` | 点 `.row[data-id="S01"]`，数 `#d-body .fields > div`。权威是 `app.js:1149` `field()` × 11（`:1357-1394`）+ `auditFold(r)` × 1（`:1391`）。同一函数给 `check-docs.mjs:437-442` 的 `panel/fields` 用，不许两处各数一遍。 |
| 4 | `copy-preserves-focus` | 用**真实鼠标事件**点 `.prompt-copy` 后，`document.activeElement` 仍是该按钮（或其 `.prompt-cta` 内元素），且按钮文字变「已复制 ✓」；不得是 `BODY` | `activeElement = BODY`，`className = "detail-open"`，按钮文字「已复制 ✓」 | 根因 `prompt-copy.js:923-939` `execCopySync()`：`:931` `ta.focus()` → `:938` `removeChild(ta)`，没有把焦点还给 `btn`。修法：`execCopySync(text, btn)` 记录 `const prior = document.activeElement`，`finally` 里 `if (prior && prior.isConnected) prior.focus({preventScroll:true})`；`copyPrompt` 的 `done()`（`:954-962`）不改焦点。断言还要覆盖 `:978` 的第二条 exec 路径与 `:899` 的手动框路径。 |
| 5 | `arrowdown-does-not-hijack-scroll` | 焦点在 `BODY` / `<a>` / `.row[role=button]` 时按 `ArrowDown`：`defaultPrevented === false`（捕获阶段观察）、`location.hash` 不变、`#detail.hidden` 不变；滚动按浏览器默认发生（约 +40px/次）。只有焦点在 `#ledger` 或其行上、或显式开启键盘导航时才允许 J/K | `hash "#S02"`、`detailHidden:false`、页面从 y=0 被 `scrollIntoView` 跳到 y=522 | 根因 `app.js:1560-1601` 全局 `document.addEventListener('keydown')`：守卫只排 `input/select/textarea/button`（`:1562,:1574`），`:1582` 把 `ArrowDown` 与 j/J 合并 `preventDefault()` 并 `open()`。修法：把 ArrowUp/Down 从 J/K 分支拆出，仅当 `e.target.closest('#ledger')` 且未修饰键时才接管；其余交还浏览器。 |
| 6 | `live-region-real` | `#count` 具有 `aria-live="polite"` 与 `aria-atomic="true"`；复制成功有 `[role=status]`/`[aria-live]` 可播报元素，且文本随结果变化；`index.html:232` 与 `style.css:1333` 两处注释不再声称一个不存在的属性 | `count.getAttribute('aria-live') === null`；全目录真 `aria-live` 只有 `app.js:350` 的 `#q-parked`（且 hidden） | 加 `<p class="count" id="count" aria-live="polite" aria-atomic="true">`；`app.js:863` 只写 `textContent` 即可被播报。`prompt-copy.js:954-962` 的 `done()` 同时写一个专用 `<span role="status" class="sr-only">`。 |
| 7 | `no-hidden-downloads` | `#ledger .row .shots img` 中**不存在**父级 `display:none` 的 `<img>`；`performance.getEntriesByType('resource')` 里 `.jpg` 请求数 == 显示中的图数；隐藏图字节 **0 B**（允许 `data-*` 惰性属性，但不得有 `src`） | `images=90`、隐藏 `60`、jpg 请求 `90`、传输 `9,868,159 B`；其中隐藏的 60 张实测 **5,070,861 B = 4.84 MiB**（按 `data.js` 的 `shots[desktop/tablet/mobile][0]` 逐文件 stat 复算） | 根因 `app.js:573` 每行发 3 张 `shotFig()`，`style.css:541` 把 `:not(:first-child)` 隐藏；`app.js:444-446` 注释误以为「不 lazy 是闸门需要」，而 `style.css:530-537` 自己写明闸门只扫 `S\d{2}-` 原型目录、不扫选型台。修法：**别再输出后两张 `<img>`**（详情面板 `:1415-1449` 本来就有三档切换），或把 `src` 移进 `data-src` 在 `paintViewer` 时赋值。 |
| 8 | `no-dead-data-fields` | `window.SCHEMES` 里 30/30 有值的 `scenesNo`，必须在详情面板出现：至少一条 `field('不适合的场景', r.scenesNo)` 或等价结构；`app.js` / `prompt-copy.js` / `wizard.js` / `index.html` 至少一个消费者 | `scenesNo` 在 `data.js` 出现 30 次，UI 四文件 grep 命中 **0**；S01 详情 `detailShowsScenesNo:false` | 在 `app.js:1393` `field('适用场景', r.scenes)` 之后插一段 `field('不适合的场景', r.scenesNo, '', '为什么不适合')`；同时把它写进 `buildPrompt()` 的「不要做」段（与提示词正确性 Agent 对齐，避免店主把不合适场景误用）。若字段数因此变 13，§1.3#3 与 `check-docs.mjs` `panel/fields` 必须同步改期望 —— **这正是要有回归测试的理由**。 |

**守卫自身的可信度**：`probe-ui.mjs` 必须带 `--selftest`（与 `check-docs.mjs --selftest` 同思路）：在**临时目录**里复制 `prototypes/_selection/`，逐条把 8 个修复改回缺陷态（例如把 `.scene-more` 再挂回 `parentNode`、删掉 `aria-live`、恢复 3 张 `<img>`），断言恰好对应的 8 个 id 变红、其余保持绿、退出码 1。改不回去了要 `exit 2` 报「自测需更新」，不许静默跳过变成假绿。**没有自测的探针就是下一个 `verify-prototype` 规则 4。**

### 1.4 `tools/` 被 gitignore，CI 怎么办

- **不要**取消 `.gitignore:2`（`tools/` 是带自己 LICENSE 与 `.git` 的第三方 vendor，注释明写入库理由）；**不要**把整个 taste-skill 塞进仓库（93 个文件、会连带锁死规则引擎版本）。
- `.gitignore` 的 `tools/` 是**未锚定**模式，所以新文件**不能放在任何叫 `tools/` 的目录**下。实测 `git check-ignore -v prototypes/_build/vendor/cdp.mjs` 无输出 ⇒ 可入库。
- vendor 只拿两样：`cdp.mjs`（205 行、MIT、Node 22+ 零依赖）+ `LICENSE-MIT.txt`；`rule-ids.json` 是从 `rules.mjs:137` 抄的 **52 个规则 id 清单 + 25 条有 `add('FAIL', …)` 分支的 `canFail` 表**（本机复算 52 ids / 25 canFail / 27 仅 WARN），用 `sha256(rules.mjs)` 注释标明来源版本。
- **`check-contract.mjs:47` 改读清单**，不再 `existsSync(RULES)`：

```js
// 旧：const RULES = join(ROOT,'tools/taste-skill/.../lib/rules.mjs');
// 新：
const RULE_IDS = JSON.parse(readFileSync(join(ROOT,'prototypes/_build/vendor/rule-ids.json'),'utf8'));
function engineRuleIds() {
  // C2/C5 的「引擎里真有这条规则」现在由入库清单保证；
  // 若本机有 tools/，再额外用 rules.mjs 的 sha256 校一次，不一致报 WARN（不静默绿）。
  return new Set(RULE_IDS.ids);
}
```

  `:224` 的 `const engineSrc = existsSync(RULES) ? readFileSync(RULES,'utf8') : ''` 同理：CI 无 `tools/` 时用清单里的 `canFail: true/false` 布尔表（从 `rules.mjs` 里 `add('FAIL','<id>'` 逐条抄出，C5 用），本机有工具时再交叉校验。**「无法判定 ≠ 成立」这条原则保住**：清单缺失/解析失败必须 FAIL（照 `:242-247` 的 C2 语义）。
- **CI 不跑 `render-scheme.mjs`**：那是维护者本机重渲染（依赖 `inspect.mjs/probe.mjs/rules.mjs` + Chrome + 大量截图写入），耗时长且会改 tracked 产物；CI 只验证**已经提交的产物**是否自洽（§6）。

### 1.5 顺手修掉的两个「假绿」生成器缺陷（各 ≤ 10 行，不扩大范围）

| 位置 | 现状 | 修法 |
|---|---|---|
| `verify-prototype.mjs:75-78` 规则 4 | 正则 `(?:^\|\})\s*(body\|html)\s*\{([^}]*)\}` 不剥注释、只看每隔一条相邻规则、看不到 `@media` 内嵌套。反事实：S02 原始提交 `caefdd9` 真挂了 `body{background-image}`，命中 **0**；今天 100% 假阳性来自注释 | **直接 import `check-texture.mjs:67-92` 的 `parseRules()` + `:47` `stripComments()` + `:101-106` `bareTagsOf()`**，或把这三个函数抽到 `_build/lib/css-rules.mjs` 两处共用。禁止再写第四份正则。 |
| `check-stale.mjs:172` | 规格链输入写成 `['04-…','05-…','05-…']`，而实际文件是 `deliverables/06-schemes-21-30.md`（`extract-specs.mjs:15-17` 三个都对）。第三个输入不存在 ⇒ S21–S30 规格改了，这条守卫**静默跳过** | 改成 `'06-schemes-21-30.md'`；并在 `CHAIN` 循环 `:204` 的 `if (!existsSync(prod)) continue` 处补一句「输入一个都不存在 ⇒ 报 FAIL 而不是跳过」。 |

---

## 2. GitHub Actions：能跑，且这样跑

### 2.1 能不能跑：能

| 依赖 | CI 上有没有 | 结论 |
|---|---|---|
| `node` 22+（本机 v26.12.1） | `actions/setup-node@v4` + `node-version: 22` | 8 个静态检查器只用 `node:*`，全部可跑 |
| 已跟踪的 `report.json` / `.jpg` / `data.js` / `prompts.js` | `actions/checkout@v4` 全拿到（`git ls-files "prototypes/S*/.inspect/*.jpg"` 实测 **272** 张） | 静态闸门不需要重渲染 |
| `tools/taste-skill` | **没有**（`git ls-files tools/` = 0） | 影响原本 3 个：`render-scheme.mjs` exit 4、`check-contract.mjs` C2 exit 1、`_s03-probe.mjs` 模块找不到。前两个按 §1.4 / §2.3 处理，第三个是一次性探针不进 CI |
| Chrome/Edge | `ubuntu-latest` 自带 `google-chrome`（`cdp.mjs:33` 已列 `/usr/bin/google-chrome`）；显式 `CHROME_PATH` 更稳 | `probe-ui.mjs` 可跑 |
| Pillow / Python | `shot.mjs` 需要 | **不进 CI**（截图取证，不是断言） |

`check-docs` / `check-prompts` / `check-twolines` / `check-texture` / `check-anchors` / `check-stale` / `verify-prototype` 实测在移走 `tools/` 后**退出码不变**（`deliverables/74-recon/toolchain.md:369-390`）。所以答案是：**8 个闸门 + 新探针全部能在 Actions 跑，前提是 `check-contract` 改读入库清单、CI 不调用 `render-scheme`。**

### 2.2 workflow 形状（`.github/workflows/gates.yml`，新建）

```yaml
name: gates
on:
  push:        { branches: [main] }
  pull_request:
  workflow_dispatch:

permissions: { contents: read }     # 全程只读；CI 绝不 commit 生成物
concurrency: { group: gates-${{ github.ref }}, cancel-in-progress: true }

jobs:
  static:                            # ← 硬闸，任一红即合并失败
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - name: 内容一致性（八个静态检查器）
        run: |
          set -e
          node prototypes/_build/check-artifacts.mjs --check   # §6 新增，内容哈希
          node prototypes/_build/check-docs.mjs
          node prototypes/_build/check-docs.mjs --selftest
          node prototypes/_build/check-prompts.mjs
          node prototypes/_build/check-twolines.mjs
          node prototypes/_build/check-texture.mjs
          node prototypes/_build/check-anchors.mjs
          node prototypes/_build/check-stale.mjs               # §4 补空集守卫后
          node prototypes/_build/check-contract.mjs --quiet     # ← 允许表的硬闸
          node prototypes/_build/check-ui-copy.mjs              # §5 新增，index.html
      - name: 检查器自身的变异自测（其余几个）
        run: node prototypes/_build/check-ui-copy.mjs --selftest

  browser:                           # ← 硬闸
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - name: 行为回归（8 条 UI 断言）
        env: { CHROME_PATH: /usr/bin/google-chrome }
        run: |
          node prototypes/_build/probe-ui.mjs
          node prototypes/_build/probe-ui.mjs --selftest
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: ui-probe, path: .probe-ui-out/, if-no-files-found: ignore }

  advisory:                          # ← 只报不拦；continue-on-error: true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - name: 永久 exit 1 的机械复核（保留输出，不判成败）
        continue-on-error: true
        run: node prototypes/_build/verify-prototype.mjs --all
      - name: Pages 发布后烟测（仅 workflow_dispatch 带 url 时）
        if: ${{ github.event_name == 'workflow_dispatch' && inputs.url != '' }}
        run: node prototypes/_build/probe-ui.mjs --url "${{ inputs.url }}"
```

**硬闸 / advisory 的界线**：

- **硬**：`check-contract.mjs`（C0 报告缺失即 FAIL、C1 `FAIL ⊆ §9.15`、C2 规则存在、C6 表格格式；`:490` `process.exit(FAILS.length ? 1 : 0)`）、`check-artifacts.mjs`、`check-ui-copy.mjs`、`probe-ui.mjs`、其余 5 个 `check-*.mjs`。
- **advisory**：`verify-prototype.mjs --all`。理由必须写在 workflow 注释里：`README.md:160` 与 `check-docs nums/gate` 的口径是 **29/30 FAIL=0**；S08 的 2 条 FAIL（`palette-terracotta` + `font-count`）已在 §9.15 允许表登记，`check-contract.mjs:191-202` C1 判它们合法（实测 2/2 通过）。`verify-prototype.mjs:206` `if (fails.length) out.problems.push(...)` 不看允许表 ⇒ `:178` 永远 `exit 1`。把它接成硬闸等于给 CI 装一盏**永远亮着的红灯**，两天后所有人开始忽略红灯。它的输出仍有价值（远程资源、禁用字体栈、Emoji、断链图、真图数、溢出、截图存在），所以保留为 advisory 并归档日志。
- **不进 CI**：`render-scheme.mjs`（需 tools/、写 tracked 文件、30 案 × ~50 s）、`shot.mjs`（Pillow）、`summarize-all.mjs` / `backfill-credits.mjs`（无断言，`deliverables/74-recon/toolchain.md:541-542`）、`_s03-probe.mjs`。
- **Pages 部署**：本 workflow **不部署**。仓库已有 `.nojekyll`（`git ls-files .nojekyll` 实测已跟踪，文件内注释解释 Jekyll 会丢 `_selection/`、`_fonts/`、`_specs/`、`_build/` 全部下划线目录），GitHub Pages 设「Deploy from a branch / main / /(root)」即可；`index.html` 是 0 秒 meta 跳转指向 `./prototypes/_selection/`。**CI 与 Pages 解耦**：CI 红只挡合并，不影响站点；站点发布后另用 `workflow_dispatch` 带 URL 跑一次 `--url` 烟测。

### 2.3 为什么不把 `verify-prototype` 改成看允许表

 tempting，但会毁掉口径：`_entries.mjs:7-9` 与 `verify-prototype.mjs:144-157` 明确写它只扫 30 个原型、汇总行「达标 26/29 / 共 30」要与 README 的 `nums/gate` 对上。让它读允许表，汇总会变成 30/30，而 README 写 29 ⇒ `check-docs` 立刻红。**正确分工是两道闸各管一件事**：`verify-prototype` 报「几案零 FAIL」，`check-contract` 判「非零 FAIL 是否都合法」。

---

## 3. 构建问题：保持零构建，但把生成显式化

### 3.1 先把「47%」这个数校准（避免拿错数做架构决策）

Owner 给的 47% 是「shipped JS/CSS 注释字节占比」。我在 HEAD 上用 `node:zlib` 复算：

| 口径 | raw B | 注释 B | 占比 |
|---|---:|---:|---:|
| 手写三件套 `app.js + prompt-copy.js + style.css` | 322,177 | 217,549 | **67.5%** |
| 选型台全部 8 个 JS/CSS（含 `data.js`/`prompts.js` 生成物） | 711,410 | 224,794 | **31.6%** |
| 再加 `index.html`/`wizard.html` 的 HTML 注释（共 743,650 B） | — | 242,788 | 32.6% |

`deliverables/74-recon/arch.md:505` 另记「`prompt-copy.js` 的 `buildPrompt` 单函数 54.3% 行是注释（986/1817）」。**47% 落在手写文件与全部文件之间，量级成立**；无论按哪个口径，结论不变：

- GitHub Pages 走 gzip/brotli，本机复算 8 个 JS/CSS：gzip -9 从 **259,255 B → 158,628 B**（省 100,627 B）、brotli **211,350 B → 127,385 B**（省 83,965 B）。
- 而**真正的首屏浪费是 4.84 MiB 的 60 张隐藏 JPG**（§1.3#7 实测 `5,070,861 B`；全部 jpg 传输 `9,868,159 B`）。注释省下的 ~100 KB 是它的 **1/50**。
- 所以「为省注释字节上打包器」是**拿最大的工程改动换最小的用户收益**。

### 3.2 裁决：**零构建 + 维护者侧显式生成**（不是「无构建」，也不是 bundler）

| 方案 | 裁决 | 对 Pages 的具体后果 |
|---|---|---|
| 维持现状：手改源 + 手跑生成器 + 提交产物，无统一入口 | 否决 | 季度增删方案时最容易忘跑一个生成器；`data.js.at` 已经比 `report.json.at` 落后 **70 分 32 秒**而无人发现（`toolchain.md:261-278`）。 |
| **零构建 + `node prototypes/_build/build.mjs --check`** | **采纳** | Pages 仍按原样发布主分支静态文件，`.nojekyll` 继续生效；陌生人零负担；维护者一条命令生成全部 committed 产物；CI 一条命令只做内容自证。 |
| 上 Vite/esbuild 打包器 | 否决 | Pages 不会替你跑构建：要么把 `dist/` 也提交（多一份产物、多一层漂移），要么加 Actions `actions/deploy-pages` 并改成 workflow 部署（把「推 main 即发布」变成「CI 绿才发布」）。这两条对「陌生人只看页面」都没有收益，却让 `index.html:362-366` 的全局脚本顺序、`<script src>` 相对路径、`file://` 兼容、`../_fonts/` 路径全部要重验。 |
| 全量 Jekyll/静态站生成器 | 否决 | 与 `.nojekyll` 的设计直接冲突，且会吃掉下划线目录。 |

**`build.mjs` 的形状**（新增，约 80 行；只跑已存在的生成器，不重写它们）：

```js
// node prototypes/_build/build.mjs [--check] [--only prompts|data|specs]
// 源 → 产物 的唯一登记处（§6 的表就是这份 STEPS 常量）
const STEPS = [
  { cmd: 'prototypes/_build/extract-specs.mjs',
    inputs: ['deliverables/04-schemes-01-10.md','05-…','06-…'], products: ['prototypes/_specs/S01.md'…] },
  { cmd: 'prototypes/_prompts/extract-dna.mjs',  inputs: [...30×style.css,index.html], product: '_prompts/dna-raw.json' },
  { cmd: 'prototypes/_prompts/clean-dna.mjs',    product: '_prompts/dna-clean.json' },
  { cmd: 'prototypes/_prompts/build-prompts.mjs',product: '_selection/prompts.js' },
  { cmd: 'prototypes/_build/collect-schemes.mjs',product: '_selection/data.js' },
];
// --check：把每个生成器在临时副本目录里跑一遍，逐字节比 sha256；
//          不一致 → exit 1 + 打印「跑 node prototypes/_build/build.mjs 再提交」。
//          绝不在 CI 里写工作区、绝不替人 commit。
// 不带 --check：按依赖顺序 spawnSync，任一非 0 即停止（修掉 collect-schemes.mjs
//          零 process.exit、数据坏了只 console.log('⚠') 照旧写盘的病，toolchain.md:565）。
//          生成器自己写盘位置保持不动：collect-schemes.mjs:715、build-prompts.mjs:370、
//          render-scheme.mjs:122（self-gate.js）。
```

**为什么正好服务「方案自由增删」**：新加 S31 时，维护者改 `_specs/S31.md` + `_CURRENT-VALUES.md`、加 `prototypes/S31-*/`，跑一次 `build.mjs`，`data.js` / `prompts.js` / 截图清单全部重算；`check-ui-copy.mjs` 与 `probe-ui.mjs` 的期望值也从 `data.js` 派生（§5），所以「30」这个锚不会在 6 处硬编码里各自腐坏。归档方案同理：从 `caseDirs()`（`_entries.mjs:66-71` 按 `/^S\d{2}-/` 扫目录）自然消失。

**注释怎么处理**：**不 strip**。它们是本项目的决策日志（例如 `app.js:1139-1147` 解释了为什么字段数必须 11+1、`app.js:444-446` 记录了 lazy 的误判），删掉等于把下一轮排查的路标拆了。若季度末真的在意 100 KB，做**可选的** `build.mjs --emit dist/` 生成压缩副本并让 Pages 指向它 —— 但那是另一个决策，本季度不做。

---

## 4. 杀死「破坏性渲染」这一类 bug（P0，明天第一件事）

### 4.1 事故链（已实测，不是推测）

```
render-scheme.mjs:43-45  ──spawn──► inspect.mjs  --out prototypes/<name>/.inspect
  inspect.mjs:56      mkdirSync(outDir)
  inspect.mjs:57-58   删掉 outDir 里全部 ^(desktop|tablet|mobile)-(fold|page-\d+)\.jpg$
  inspect.mjs:59      await Browser.launch()    ← 删完了才启动；本机冷启动 16.4 s / 超时 20 s
        Chrome 起不来 ⇒ 8 张已跟踪截图没了，report.json 仍是旧的
  verify-prototype.mjs:134-137  只查 report.json 里 images[].fold 字段**存在**，从不 stat 文件 ⇒「达标」
  check-stale.mjs:93           if (jpgs.length) { … }  ← 0 张时整段静默跳过 ⇒「全部新鲜」
```

`deliverables/74-recon/toolchain.md:300-345` 记录两次复现（exit 6 / 52.2 s 与 41.4 s）。**这是「常规执行即丢已入库证据，且丢完两个闸门同时绿」**，必须先修，修完前不要批量渲染。

### 4.2 具体补丁（三层，缺一不可）

**第 1 层：`inspect.mjs` 本地最小修（一行移位，维护者本机立即生效）。** 注意 `tools/` 不入库，所以这层只是本机止血，**不能当 CI 守卫**：

```js
// tools/taste-skill/skills/taste-skill/scripts/inspect.mjs:56-59 改成：
mkdirSync(outDir, { recursive: true });
const browser = await Browser.launch();          // ← 先启动成功
for (const f of readdirSync(outDir))
  if (/^(desktop|tablet|mobile)-(fold|page-\d+)\.jpg$/.test(f)) unlinkSync(join(outDir, f));
const helper = await browser.newPage({ width: 1600, height: 1000 });
// 顺带 cdp.mjs:61 的 20000 → 60000（本机冷启动实测 16.4 s，余量仅 1.22×）
```

**第 2 层：`render-scheme.mjs` 的临时目录 + 原子替换（真正入仓、真正可复现）。** 这层不依赖改 `tools/`：

```js
// prototypes/_build/render-scheme.mjs:42-45 附近
import { mkdtempSync, renameSync, rmSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';

const outDir = join(dir, '.inspect');
const tmpOut = mkdtempSync(join(tmpdir, `inspect-${name}-`));   // 系统临时目录，与已跟踪目录完全隔离
const r = spawnSync(process.execPath, [
  INSPECT, `prototypes/${name}/index.html`,
  '--out', tmpOut, '--widths', '1440,768,390', '--json', ...extra,
], { cwd: ROOT, stdio: 'inherit' });

const tmpRep = join(tmpOut, 'report.json');
if (r.error || r.signal || !existsSync(tmpRep)) {
  console.error('渲染失败，已跟踪的 .inspect/ 一个字节都没动：' + tmpOut);
  rmSync(tmpOut, { recursive: true, force: true });
  process.exit(5);
}
const j = JSON.parse(readFileSync(tmpRep, 'utf8'));
// 提交前验货：report 声明的每张图都真实存在且非 0 字节；把绝对路径改写成相对
// （inspect.mjs:171 写出的 images[].fold/pages 是绝对路径，历史 report.json 也是，
//   所以这步顺手修掉「Windows 绝对路径入库」的可移植性问题）
const declared = (j.images || []).flatMap(i => [i.fold, ...(i.pages || [])]).filter(Boolean);
for (const p of declared) {
  const f = join(tmpOut, String(p).split(/[\\/]/).pop());
  if (!existsSync(f) || statSync(f).size === 0) { rmSync(tmpOut,{recursive:true,force:true}); process.exit(7); }
  if (p.endsWith('.jpg') && p !== f) { /* 把 j.images 里的路径归一化成 basename */ }
}
const swap = join(dir, '.inspect.tmp');
rmSync(swap, { recursive: true, force: true });
mkdirSync(swap, { recursive: true });
for (const f of readdirSync(tmpOut)) copyFileSync(join(tmpOut,f), join(swap,f));
writeFileSync(join(swap,'report.json'), JSON.stringify(j,null,1));
// 同一分区内 rename：先备份旧目录，再换；失败则回滚
const backup = join(dir, '.inspect.bak');
rmSync(backup, { recursive: true, force: true });
if (existsSync(outDir)) renameSync(outDir, backup);
try { renameSync(swap, outDir); rmSync(backup,{recursive:true,force:true}); }
catch (e) { if (existsSync(backup)) renameSync(backup, outDir); throw e; }
const rep = join(outDir, 'report.json');
// ↓ 下面原有的「before 指纹必须变」(render-scheme.mjs:38-40, :52-55) 保持不变，
//   但 now 比的是新 report 与渲染前旧 report；注意 j.at 在 inspect.mjs:61 是渲染开始时刻。
```

**为什么必须 temp-dir + atomic rename 而不只是「移位删除」**：移位只能防「Chrome 起不来」，防不了渲染到一半崩、截图只写了一半、`report.json` 写了但某张 `page-*.jpg` 缺失（这正是 `check-stale.mjs:88-89` 注释记录的「实测 1/30 是真的」那种状态）。临时目录让**任何**失败都碰不到已跟踪目录。

**第 3 层：两个独立守卫，谁都不能再瞎。**

```js
// A) prototypes/_build/verify-prototype.mjs:133-137 替换整段
// 8 每档 fold 图 + report 声明的全部截图，必须真实存在且非 0 字节
const declared = [];
for (const w of [1440, 768, 390]) {
  const im = (j.images || []).find(i => i.width === w);
  if (!im || !im.fold) out.problems.push(`缺 ${w}px 的 fold 截图`);
  else declared.push(im.fold);
  if (im) for (const p of im.pages || []) declared.push(p);
}
for (const p of declared) {
  const f = /[\\/]/.test(p) && isAbsolute(p) ? p : join(dir, '.inspect', String(p).split(/[\\/]/).pop());
  let size = 0; try { size = statSync(f).size; } catch {}
  if (!size) out.problems.push(`report 声明的截图在盘上不存在或为 0 字节：${p}`);
}
// isAbsolute 从 node:path 补 import；statSync 文件头已 import（:7）
```

```js
// B) prototypes/_build/check-stale.mjs:90-93 之后，把 if (jpgs.length) 改成显式三分支
const declaredJpgs = (() => {
  try {
    const jj = JSON.parse(readFileSync(rep, 'utf8').replace(/^﻿/, ''));
    return (jj.images || []).flatMap(i => [i.fold, ...(i.pages || [])]).filter(Boolean)
      .map(p => String(p).split(/[\\/]/).pop());
  } catch { return []; }
})();
if (declaredJpgs.length && jpgs.length === 0) {
  out.push({ id: name.slice(0,3), dir: name, which: '.inspect/*.jpg 全部缺失',
    gapMin: 0, label: '截图被清空（report 仍声明 ' + declaredJpgs.length + ' 张）',
    render: 'node prototypes/_build/render-scheme.mjs ' + name });
} else if (declaredJpgs.length) {
  for (const f of declaredJpgs) {
    if (!existsSync(join(insp, f)) || statSync(join(insp, f)).size === 0)
      out.push({ id: name.slice(0,3), dir: name, which: f + ' 缺失或 0 字节', gapMin: 0,
                 label: '声明的截图不在盘上', render: 'node prototypes/_build/render-scheme.mjs ' + name });
  }
  // 原有的 newestJpg > repM + 5000 判据保留（:100-110）
}
// 产品入口 _selection 的 ② 段（:170-190）同样加一遍 declaredJpgs 检查
```

守卫 A 与 B **互相独立**：A 在「机械复核」里、B 在「陈旧度」里；任一个瞎了另一个仍能报。两者都判「存在且非 0 字节」，因为 `report.json` 只是字段声明，`stat` 才是事实。`check-stale.mjs:93` 那个 `if (jpgs.length)` 的**空集即跳过**必须彻底删除，不许保留。

**验收（当天可做，0.5 天）**：`cp -r prototypes/S02-.../.inspect /tmp/...` 备份 → 人为让 `CHROME_PATH` 指向不存在的 exe 跑 `render-scheme.mjs S02-...` → 断言 `git status --short prototypes/S02-.../.inspect` 为空 → 手工 `rm prototypes/S02-.../.inspect/*.jpg` → `verify-prototype.mjs S02-...` 与 `check-stale.mjs` **都要 exit 1** → 恢复备份 → 两脚本都 exit 0（`check-stale` 恢复后可能触发原有 mtime 判据，按 `:428-434` 的说明重跑一次渲染即可）。

---

## 5. 让 `index.html` 进闸门（0 → 有断言）

### 5.1 现状（精确到行）

`check-docs.mjs` 13 条断言**全部**作用于 `README.md`（`:13-15` 默认 docName；`:859` `PREFIXES` 里 `index.html` 只用于「路径存在性」）；`prototypes/_selection/index.html` 是 **0 条**。于是三份副本的错数字一路活到生产：

| 位置 | 写的 | 实测 |
|---|---|---|
| `index.html:153` 可见 summary | 11 组 **47 颗**芯片 | 折叠态 45 / 全展开 **73** |
| `index.html:145` 注释 | 同上 | 同上 |
| `prompt-copy.js:1245` 注释 | 「筛选 · 11 组 47 颗芯片」 | 同上 |
| `index.html:211` | 多数案 **10** 段、个别 **9** 段 | **30/30 都 12 段** |
| `index.html:232` 注释 | `#count` 是 aria-live 活口 | `#count[aria-live] = null` |
| `index.html:309` | 静态写死 `30 / 44 / 16 / 16` | 由 `data.js` / `prompts.js` 现算（恰好对，但换个方案数就全错） |
| `index.html:175` | 「30 个里有 18 个暖浅色带」「冷暗 5、暖暗 3、中性浅 2、中间明度 1、冷浅 1」 | 6 个数字恰好对，但全是手打 |
| `index.html:186` | 「19 个都属于就要扎眼」 | 恰好对，手打 |
| 根 `index.html` | `<title>30 个方案</title>`、meta description「30 个…」 | 同上 |

### 5.2 通用原则（写进 `check-ui-copy.mjs` 文件头）

> **任何在 UI 文案里复述一个可计算量的数字，必须由计算导出，不能手打。**
> 允许两类存在：① 渲染时由 JS 注入（`textContent`）；② 静态 HTML 里用 `<span data-derived="...">` 占位，由 `check-ui-copy.mjs` 在生成期回填并校验。**不允许**第三种：复制粘贴的字面量（包括注释里的解释性复述）。
> 判定「可计算」的标准：能从 `window.SCHEMES` / `window.STYLE_PROMPTS` / DOM 现场数出来，就算。

### 5.3 最小断言集（`prototypes/_build/check-ui-copy.mjs`，新增约 170 行）

用 `node:vm` 装载 `data.js` / `prompts.js` 作**唯一期望源**（与 `check-docs.mjs:374-401` 装载 `prompt-copy.js` 同法），再静态解析 `index.html`。给每个量一个 id：

| id | 期望来源 | 断言 |
|---|---|---|
| `ui/total` | `SCHEMES.length` | 根 `index.html` 的 `<title>`/meta、`prototypes/_selection/index.html` 的 `#e-total`、`:309`、`:175` 里的「30」都等于它 |
| `ui/chips` | `SCHEMES` 的 9 组轴去重数 + `STYLE_PROMPTS.sceneIndex` 的键数（当前 45 + 28 = 73） | `#rail-fold summary` 里 `N 颗芯片` == 折叠态可见数；`data-chips-expanded` == 全展开数；`index.html:145` 与 `prompt-copy.js:1245` 注释**不得再含阿拉伯数字芯片总数**（改成「数量由 `probe-ui` 复算」） |
| `ui/fields` | `app.js` 里 `field('` 调用数 + `auditFold` 1 = 12（剥注释后数，照 `check-docs.mjs:439-442`） | `index.html:211` 不得出现「10 段」「9 段」；必须含 `data-fields="12"` 且值等于期望；30 案 DOM 现场由 `probe-ui.mjs` 再验一遍 |
| `ui/scene-index` | `Object.keys(sceneIndex).length` = 44；有 `direct.length` 的 = 16 | `:309` 的 `#e-terms` / `#e-direct` / `#e-direct2` 与 `:164` 注释、`:309` 静态文本一致 |
| `ui/band` / `ui/loud` | `SCHEMES` 按 `axes.band` / `axes.loud` groupBy 现算 | `:175` 的 18/5/3/2/1/1 与 `:186` 的 19 必须逐项相等（我复算：`band` = 暖浅 18、冷暗 5、暖暗 3、中间明度 1、中性浅 2、冷浅 1；`loud` = 扎眼 19、有态度不吵 9、很安静 2） |
| `ui/facts` | `SCHEMES.length` / `built` / `gate.fail===0` / `shots` 三档长度和 | `index.html:110-120` 的 `#f-total/#f-built/#f-clean/#f-shots` 初始占位必须是 `—`（由 `app.js:71-72, :83, :156` 注入），不得写死数字 |
| `ui/live-region` | 常量 | `#count` 必须有 `aria-live="polite"` + `aria-atomic="true"`；`:232` 注释不得说「是 aria-live」而实际没有 |
| `ui/img-src` | 常量 | `app.js` 生成的行卡模板里不得出现 3 个 `shotFig()` 调用（§1.3#7），或每张隐藏图不得带 `src` |
| `ui/scenesNo` | `SCHEMES.filter(s=>s.scenesNo).length` = 30 | `app.js` 详情字段注册表里必须有一条消费 `r.scenesNo`；`prompt-copy.js` 的 `buildPrompt` 必须引用 `scenesNo`（与提示词 Agent 对齐） |

**落地方式（明天可开工，不依赖浏览器）**：

1. `index.html` 里所有可见数字改成 `<span data-derived="<id>">—</span>`；`index.html:343-360` 那段**先于 `data.js` 执行**的折叠同步脚本之后，加一小段 `hydrateFacts()`（约 25 行，放在 `app.js` 末尾 `render()` 之前亦可，因为 `app.js` 在 `data.js` 之后加载）：遍历 `[data-derived]`，从 `SCHEMES` / `STYLE_PROMPTS` 查表赋值。这样 `file://` 双击打开也不会显示「—」（页面已有无脚本降级要求，见 `:331-342`）。
2. `check-ui-copy.mjs` 读 `index.html` + `app.js` + `data.js` + `prompts.js`，逐 id 复算；**同时**断言「HTML 文本里不存在 `/\d+ (颗芯片|段字段|个方案|个行业词)/` 这类手写量」（只允许 `data-derived` 占位与 prose 里的历史叙述），防止有人再加一份副本。
3. `check-ui-copy.mjs --selftest`：临时副本里把 47 改回 73 之外的任意数、把 12 改回 10、删掉 `aria-live`、把 `scenesNo` 消费者删掉，断言四条分别红 —— 照 `check-docs.mjs` 的变异自测套路。
4. `probe-ui.mjs` 在真浏览器里再做**同一组 id 的运行时复核**（§1.3#2/#3/#6/#7/#8）：静态闸门管「源码没写死」，浏览器闸门管「运行时真的算对了」。两层缺一，就还会出现「注释说有 aria-live、实际没有」这种病。

**注意与 `check-docs.mjs` 的分工**：它继续守 `README.md` / `README-EN.md` 的 13 条；`check-ui-copy.mjs` 守 `index.html` + `wizard.html` + `app.js` 模板里的量。**不要**把新断言塞进已经 61 KB 的 `check-docs.mjs`（它的 `--selftest` 结构复杂，`:151` 的自测块在最前面、有 TDZ 陷阱，见 `:72-78` 注释）。

---

## 6. 生成物纪律：源 / 产品 / 内容判新鲜

### 6.1 正确的模型（写进 `build.mjs` 的 `STEPS` 与 `check-artifacts.mjs` 的表）

| 层 | 文件 | 身份 | 谁生成 | 输入（权威） |
|---|---|---|---|---|
| 源 | `deliverables/04-schemes-01-10.md`、`05-schemes-11-20.md`、`06-schemes-21-30.md` | 源 | 人 | — |
| 源 | `prototypes/_specs/S01..S30.md`、`prototypes/_specs/_CURRENT-VALUES.md` | **既是源也是产品**（对下游是源、对 deliverables 是产品） | `extract-specs.mjs:84` | 上行三份 md |
| 源 | 30 × `prototypes/Sxx-*/{index.html,style.css}`、`.inspect/report.json` | 源 | 人 / `render-scheme.mjs` | — |
| 中间产品 | `_prompts/dna-raw.json`、`_prompts/dna-clean.json` | 产品 | `extract-dna.mjs` / `clean-dna.mjs` | CSS+HTML / dna-raw |
| **产品** | `prototypes/_selection/data.js`（307 KB，`window.SCHEMES`） | **产品，非源** | `collect-schemes.mjs:715` | `_specs/*.md` + `_CURRENT-VALUES.md` + 30 份 `report.json` |
| **产品** | `prototypes/_selection/prompts.js`（62 KB，`window.STYLE_PROMPTS`） | **产品，非源** | `build-prompts.mjs:370` | `dna-clean.json` + 生成器内 HUMAN 表 + `mechanisms.mjs` + 从 `data.js` 正则回读的 `risk`（`build-prompts.mjs:39-50`） |
| **产品** | `prototypes/_selection/self-gate.js`（11 行） | **产品，非源** | `render-scheme.mjs:122-126` | `_selection/.inspect/report.json` 的 `at` + `findings[].level/id` |
| 源（手写） | `app.js` / `prompt-copy.js` / `style.css` / `index.html` / `wizard.*` | 源 | 人 | — |

**两条链不能合并**（`deliverables/71-plan/PLAN-final.md` 三次自我推翻后的裁决）：`data.js.palette` 是 4 色上限的「设计意图」，`prompts.js.dna.palette` 是 4–7 色的「施工细节」；`check-twolines.mjs` 的 R1/R6/R7/R8 守的正是两者的**关系**。§6 只管「各自是否由源重新生成得出」，不管合并。

### 6.2 两个已确认的错，逐条修

| 错 | 位置 | 修法 |
|---|---|---|
| `prompts.js` 被当「源」 | `_entries.mjs:49` `sources: [...,'prompt-copy.js','prompts.js',...]`，而同文件 `:50-62` 已用一大段论证把 `data.js` 排除、`:64-68` 把 `self-gate.js` 排除 —— 唯独漏了 `prompts.js`。实测：跑一次 `build-prompts.mjs`（输出逐字节相同）就报「选型台 prompts.js 落后 5505 分钟」 | 从 `sources` 删 `'prompts.js'`，并把它挪到本文件新增的 `export const PRODUCT_SOURCES`（给 `check-artifacts.mjs` 用）。注释补一句「三个产品一视同仁」。 |
| `data.js.gate` 是 `report.json` 的**快照**，无比较器 | `collect-schemes.mjs:556-559` 读 `j.images`、`:671` 附近写 `gate`（含 `at`）；`check-docs.mjs` 全文 grep `report.json` **0 命中**，拿陈旧快照去核 README ⇒ 自洽的假绿。S01 实测落后 **70 分 32 秒** | `check-artifacts.mjs` 新增 `A-gate-at`：对 `SCHEMES` 30 案逐一比 `s.gate.at === report.json.at`、`s.gate.fail/warn/screens/realPictures/overflow/words` 与 report 的 1440 档逐项相等；`s.shots` 三档文件名与 `report.images` 逐项相等且 `stat().size>0`。任一不等即 FAIL 并打印 `node prototypes/_build/collect-schemes.mjs`。 |

### 6.3 内容判新鲜，不判 mtime

**为什么**：`git clone` 把所有文件 mtime 设成同一时刻，`git checkout` 只重写内容有差异的文件 —— `check-stale.mjs:428-434` 已实测「恢复一份截图后立刻误报 tablet-page-01.jpg 落后 5547 分钟，而内容一字未变」。mtime 判据在干净 clone 上必然是噪声。

**新脚本 `prototypes/_build/check-artifacts.mjs`**（约 130 行，零依赖，`--check` / 默认两种模式）：

```js
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
// A1 可复现性：在 tmpdir 里复制仓库的「源」，按 STEPS 顺序跑每个生成器，
//    把 stdout 重定向到临时 OUTDIR（生成器写盘路径由 env 覆盖；collect-schemes.mjs
//    已有 --check 干跑，build-prompts.mjs 无 --check，需要给它加一个 --out <dir>，约 6 行）。
//    逐字节比 sha256(临时产物) vs sha256(已提交产物)；不一致 → FAIL。
// A2 元信息一致：data.js 的 gate.at / gate.fail / shots 与 30 份 report.json 对账（§6.2）。
// A3 产品身份：三个产品文件头必须带「由 X 生成，勿手改」；
//    _entries.mjs 的 PRODUCTS[].sources 不得含三个产品名（防 T3 复发）。
// A4 源清单完整：STEPS 里列的输入路径必须全部 existsSync；缺一个即 FAIL
//    （修掉 check-stale.mjs:172 把 06- 写成 05- 导致静默跳过的病）。
// A5 CI 行为：--check 只读、只比、只打印；绝不 writeFileSync 到工作区、绝不 git commit。
//    失败信息固定格式：`STALE <product>  →  node prototypes/_build/build.mjs`。
```

**CI 该怎么做**：`static` job 第一步跑 `check-artifacts.mjs --check`，**硬失败**；输出直接给维护者一条重生成命令。**不**由 Actions 自动跑 `build.mjs` 后 `git push`（那会让「谁改了什么」不可追，且给 workflow 写权限；本仓库 `permissions: contents: read`）。**不**用 CI 产物覆盖 Pages（Pages 部署的是分支本身，见 §2.2）。

**保留 `check-stale.mjs` 的 mtime 判据，但降级**：它仍有用（本地「改了源忘了重渲染」的即时提示），保留 `>3 min` 阈值与 §4 新增的空集守卫；在输出里给一行注记「mtime 仅本地提示，CI 以 `check-artifacts.mjs` 的内容哈希为准」。不要把两套判据合成一套 —— 本地体验与 CI 真理各管一段。

---

## 7. 前三个月排序（每项都能明天开工）

> 估算为「一个人日 = 6 小时有效工程时间」。标记 **★ = 提示词正确性工作的前置条件**（另一位 Agent 正在设计）。
> 总约 **34 人日 / 12 周**，留 1 周缓冲与季度复盘。

### 第 1–2 周（D1–D10）：止血 + 把地基放到能跑的状态

| 序 | 任务 | 估时 | 交付 / 验收 | 前置 |
|---|---|---:|---|---|
| 1 | §4 破坏性渲染三层补丁 | **0.5 d** | `render-scheme.mjs` temp+rename；`verify-prototype:134` stat；`check-stale:93` 空集守卫；按 §4.2 的变异验收脚本跑通 | — |
| 2 | ★ **vendor `cdp.mjs` + `probe-ui.mjs` 骨架** | **1.5 d** | `git ls-files prototypes/_build/vendor/` = 2；`node probe-ui.mjs` 能打开页面并打印 8 条基线（当前应 8 红） | 1（避免探针运行期间被渲染删图） |
| 3 | ★ **8 条 UI 断言 + `--selftest` 变异** | **1.5 d** | 8 个 id 逐条给出 want/got；自测把修复改回缺陷态时恰好对应 8 红 | 2 |
| 4 | `check-contract.mjs:47/:224` 改读 `rule-ids.json` + C2 缺失即 FAIL | **0.5 d** | 临时移走本机 `tools/` 后 `check-contract --quiet` 仍 exit 0（当前 exit 1） | — |
| 5 | `.github/workflows/gates.yml` 三 job（§2.2） | **1 d** | PR 上 `static`/`browser` 绿、`advisory` 有输出但不拦；`permissions: contents: read` | 2,4 |
| 6 | §1.5 两个假绿：`verify-prototype` 规则 4 改共用 `parseRules()`；`check-stale:172` 改 `06-` | **0.5 d** | 反事实 `caefdd9` 的 S02 必须红；21–30 规格改动能被规格链守卫报出 | 1 |

**D10 门槛**：CI 第一次完整跑通；8 条断言**允许全红**（它们是在给修复写规格），但 `--selftest` 必须证明「每条都真的会响」。这一步是提示词正确性工作的 **★ 前置**：没有真复制按钮的浏览器断言，改 `buildPrompt()` 时无法确认店主还能复制。

### 第 3–5 周（D11–D25）：修 8 个缺陷 + 让 UI 数字进闸门

| 序 | 任务 | 估时 | 交付 / 验收 | 前置 |
|---|---|---:|---|---|
| 7 | 修 near 芯片样式（`style.css:322` + `prompt-copy.js:1345`） | **0.5 d** | `near-chip-visual-weight` 转绿 | 2 |
| 8 | 修芯片数三份副本 + `check-ui-copy.mjs` 的 `ui/chips` | **1 d** | 折叠 45 / 展开 73 都由 `data-derived` 注入；`--selftest` 变异红 | 8 与 9 可并行 |
| 9 | 修字段数 + `ui/fields`（`index.html:211`、`app.js:1149`、`check-docs:437`） | **0.5 d** | 30/30 DOM = 12；README 与页面同一期望源 | 2 |
| 10 | 修复制焦点（`prompt-copy.js:923-939` 记录 prior / finally 归还） | **0.5 d** | `copy-preserves-focus` 转绿（真鼠标事件） | 2 |
| 11 | 修方向键（`app.js:1560-1601` 拆 Arrow/J-K + `closest('#ledger')`） | **0.5 d** | body/`<a>`/行卡三处 `defaultPrevented=false`、hash 不变；`#ledger` 内 J/K 仍可用 | 2 |
| 12 | 修 `aria-live`（`index.html:223,232`、`style.css:1333`、`prompt-copy.js:954`、`app.js:863`） | **0.5 d** | `live-region-real` 转绿；两处注释与事实一致 | 2 |
| 13 | 修隐藏图（`app.js:573` 只发 1 张 + `data-src` 详情加载） | **0.5 d** | 隐藏图字节 5,070,861 → 0；jpg 请求 90 → 30；首屏 jpg 9.84 MB → 4.55 MB | 2 |
| 14 | 接 `scenesNo` 进详情 + 提示词「不适合」段（**★ 与提示词 Agent 联合**） | **1 d** | `no-dead-data-fields` 转绿；字段数改 13 时 9 与 `check-docs` 同步 | 9, 提示词 Agent 的字段规范 |
| 15 | `check-ui-copy.mjs` 全 9 个 id + 双文件（含根 `index.html`、`wizard.html`） | **1.5 d** | §5.3 表全绿；`--selftest` 四类变异各红一次 | 8,9,12,13 |
| 16 | ★ **`build.mjs` + `check-artifacts.mjs`（§3.2 / §6.3）** | **2 d** | `node build.mjs --check` 在干净 clone 上 exit 0；手工改 `_specs/S07.md` 一个字 → exit 1 且打印重生成命令 | 4 |
| 17 | ★ 修 `_entries.mjs:49` + `A2 gate.at` 对账 | **0.5 d** | 跑 `build-prompts.mjs` 后 `check-stale` 不再误报；S01 的 70 分陈旧被 `check-artifacts` 抓出并修掉 | 16 |

**D25 门槛**：`probe-ui.mjs` 8/8 绿；`static` job 全绿；`advisory` 的永久 exit 1 有据可查。**这是提示词正确性工作真正可以开始改语料的时点**：生成链有内容哈希守卫、复制按钮有回归断言、`scenesNo` 已进提示词，改 `buildPrompt()` 不会静默破坏交付物。

### 第 6–9 周（D26–D45）：正确性落地 + 季度可增删

| 序 | 任务 | 估时 | 说明 |
|---|---|---:|---|
| 18 | ★ 提示词正确性 Agent 的方案落地（机制句 S03/S07/S17、栏数断言、789 个带单位数字的覆盖率） | **5 d** | 本方案不定义内容；只提供 `check-artifacts`（改 `mechanisms.mjs` / `_specs` 后必须重生成）与 `probe-ui`（复制按钮）两层守卫。新增断言接进 `check-prompts.mjs` 并进 `static` job |
| 19 | `probe-ui.mjs` 扩到 3 个视口 + 向导页（`wizard.html`） | **2 d** | 1440 主路径已够抓 8 缺陷；390 档补 `<details>` 开合、详情全屏模态、深链 `#S07`；`wizard.js:245-248` 结果区 `aria-live` 缺失（ux recon F-20）一并补 |
| 20 | 方案增删演练：加一个 S31 走完整链路 | **2 d** | 验证 `caseDirs()`、`build.mjs`、`data-derived`、`check-docs` 的「30」硬编码、`README` 的 `nums/schemes` 全都能跟着变；把发现的第 7 份硬编码收进 `check-ui-copy.mjs` |
| 21 | 归档路径：把弱方案移出 `prototypes/Sxx-*` 时，截图 / `report.json` / `data.js` / `prompts.js` 的一致性 | **1.5 d** | 与 20 共用 `build.mjs`；归档清单是新的源，需写进 `STEPS` |
| 22 | Pages 发布后 `--url` 烟测接进 `workflow_dispatch` | **0.5 d** | 验证线上 `index.html` 不再是「47 颗 / 10 段」（memory 记录 2026-11-04 线上仍是旧值） |

### 第 10–12 周（D46–D60）：收口与季度复盘

| 序 | 任务 | 估时 | 说明 |
|---|---|---:|---|
| 23 | `README.md` / `README-EN.md` 的已知漂移（`L160` 29/2 vs `L556` 26/8、`body-size` 谎、43 条断言复核） | **2 d** | 由 `check-docs.mjs` 守，注意 `:556` `pass the mechanical gate` 不命中现有正则，需先修正则再改文案 |
| 24 | `deliverables/74-recon` 的 11 条「只记录不改产品」清单逐条裁决：修 / 明确不修 / 删 | **1.5 d** | 本方案只承诺「记录不再代替修复」；具体条目归产品 Agent |
| 25 | 闸门自身的季度体检：哪些断言恒真/恒假、哪些 `--selftest` 已腐坏 | **1 d** | 照 `check-contract.mjs` C5 的思路：给每条断言记「最近一次真实触发时间」，超过一季度没响过的列为可疑 |
| 26 | 复盘 + 下季度路线（是否引入 `dist/` 压缩副本、是否上 Actions 部署 Pages） | **1 d** | 只有实测到注释字节成为首屏瓶颈才考虑；当前 4.84 MiB 隐藏图已清零，优先级低 |

**依赖关系一句话**：`1 → 2/3 → 5 → 7–15 → 18`；`4 → 16/17 → 18`；`14` 与提示词 Agent 的字段规范互为前置。**提示词正确性工作的四个 ★ 前置是：2、3、16、17**（真浏览器复制断言、内容可复现的生成链、gate 快照对账）；第 1 项虽不直接属于它，但排在最前，因为渲染会删掉整个证据目录。

---

## 8. 开工清单（明天早上照着敲）

```bash
cd /d/Web/style                                    # 仓库根；所有脚本用绝对路径或根相对路径

# ① 止血
cp -r prototypes/S02-gilded-symmetry-salon/.inspect /tmp/s02-inspect-backup
git diff --stat                                    # 确认工作区基线
# 编辑 render-scheme.mjs:42-45 / verify-prototype.mjs:133-137 / check-stale.mjs:90-93
node prototypes/_build/verify-prototype.mjs S02-gilded-symmetry-salon
node prototypes/_build/check-stale.mjs

# ② vendor（不要放进任何叫 tools/ 的目录）
mkdir -p prototypes/_build/vendor
cp tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs prototypes/_build/vendor/cdp.mjs
cp tools/taste-skill/LICENSE                              prototypes/_build/vendor/LICENSE-MIT.txt
node -e "const s=require('fs').readFileSync('tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs','utf8');console.log(s.match(/export const RULE_IDS\s*=\s*\[([\s\S]*?)\]/)[1])"  # → rule-ids.json 的来源
git check-ignore -v prototypes/_build/vendor/cdp.mjs     # 必须无输出

# ③ 基线探针（此刻应 8 红，这正是它的价值）
node prototypes/_build/probe-ui.mjs                # 预期 ~30 s，8 FAIL / exit 1
node prototypes/_build/probe-ui.mjs --selftest     # 预期 exit 0（自测自身通过）

# ④ CI 前置
node prototypes/_build/check-contract.mjs --quiet  # 修完 rule-ids.json 后，移走 tools/ 也应 exit 0
git add .github/workflows/gates.yml prototypes/_build/vendor prototypes/_build/probe-ui.mjs
```

**明天的完成判据**：`probe-ui.mjs` 能稳定打印 8 条带 want/got 的基线失败；`--selftest` 绿；`check-contract` 在 `tools/` 缺席时绿；`verify-prototype` 与 `check-stale` 在人为清空 S02 截图后**都**红。四条齐了，后面 11 周才有地基。

---

## 附：本方案引用的关键行号速查

| 事实 | 位置 |
|---|---|
| 删图在启动浏览器之前 | `tools/taste-skill/skills/taste-skill/scripts/inspect.mjs:57-58` vs `:59` |
| 20 s 启动超时 | `tools/.../lib/cdp.mjs:61`；`findChrome()` `:11-38` |
| 截图字段只查存在、不 stat | `prototypes/_build/verify-prototype.mjs:133-137` |
| `if (jpgs.length)` 空集跳过 | `prototypes/_build/check-stale.mjs:90-93` |
| 规则 4 死正则 | `prototypes/_build/verify-prototype.mjs:75-78`；正确实现 `check-texture.mjs:47,67-92,101-106` |
| 规格链拼错 `06-` | `prototypes/_build/check-stale.mjs:172`（对照 `extract-specs.mjs:15-17`） |
| `prompts.js` 误列为源 | `prototypes/_build/_entries.mjs:49`（对照 `:50-62`、`:64-68`） |
| 允许表 / C1 / C2 / C5 | `prototypes/_build/check-contract.mjs:47,132,151-162,191-202,224-247`；`:490` exit |
| `verify-prototype --all` 恒 exit 1 | `prototypes/_build/verify-prototype.mjs:206` → `:178`；口径说明 `:144-157` |
| 生成器写盘点 | `collect-schemes.mjs:715`、`build-prompts.mjs:370`、`render-scheme.mjs:122-126` |
| `check-docs` 只查 README | `check-docs.mjs:13-15,74-76,859`；`panel/fields` `:437-442,759-801` |
| 8 个 UI 缺陷定位 | `prompt-copy.js:1345,923-939,954-962,1245,1286`；`app.js:573,1149,1356-1395,1391,1393,1560-1601,350`；`index.html:145,153,211,223,232,309`；`style.css:322,541,1333` |
| Pages 无需构建 | `.nojekyll`（已跟踪）+ 根 `index.html:9-12` meta 跳转 + `_selection/index.html:362-366` 脚本顺序 |
