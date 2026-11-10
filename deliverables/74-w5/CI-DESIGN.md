# W5 · GitHub Actions 设计（CI-DESIGN）

**结论先说**：CI 需要一个 workflow、五个 job。其中 **4 个阻塞合并，1 个只报不拦**。
但**今天直接推上去会红**——我在干净 clone 上实测到 1 条真缺陷（`check-docs` 的
`paths/exist` 指向一个被 `.gitignore` 排除的文件），必须先修掉，否则第一天就是一盏红灯。

本文所有数字来自本机实跑（`D:/Web/style`，Node v26.12.1，Windows）。
凡是推断到 ubuntu runner 上的，都标了「估算」并给出换算依据。

---

## 0. 一句话回答七个问题

| # | 问题 | 答案 |
|---|---|---|
| 1 | 哪些硬失败？ | `check-anchors / check-texture / check-twolines / check-contract / check-prompts / check-docs / check-ui-copy / collect-schemes --check / check-docs --selftest / probe-ui`（8 条断言）**全部硬**；`verify-prototype --all` **只报不拦** |
| 2 | `check-stale` 怎么办？ | **在 CI 里换判据**：不用 mtime，改问「源的最后一个 commit 是否晚于 `report.json` 的最后一个 commit」。实测 HEAD 上 31 个入口 **0 陈旧**，且**必须 `fetch-depth: 0`**——depth-1 下它会安静地报 0（见 §3，我做了变异测试证明） |
| 3 | Chrome？ | `findChrome()` **已经**列了 `/usr/bin/google-chrome`（`vendor/cdp.mjs:33`），`ubuntu-latest` 上就在那个路径。**不要 apt-get，不要 setup-chrome**——两者都只是把「runner 换镜像」这一个风险换成「第三方 action 换行为」这个新风险 |
| 4 | 跑 `render-scheme` 吗？ | **不跑**。改成 `inspect.mjs --out $RUNNER_TEMP/...` 的**渲染冒烟**（1 案，判「报告有没有被写出来」，不判 FAIL 数）。仓库不会被弄脏，"站点还渲不渲得出来"也有答案 |
| 5 | `probe-ui` 的 job？ | **与渲染冒烟共用一个 `browser` job（顺序执行）、独占整棵 checkout、硬失败**，`timeout-minutes: 10`。实测 80–113 秒。`--selftest` **不进 PR 流水线**（实测 387 秒，且它会临时改写 5 个 tracked 文件），挪到每晚定时 |
| 6 | prompt-len 的 WARN 算失败吗？ | **不算**，但必须进 `$GITHUB_STEP_SUMMARY`。理由见 §6——把 WARN 变成硬失败正是本仓库已经吃过一次的「恒亮红灯」 |
| 7 | 缓存/耗时？ | **什么都不缓存**（无 `package.json`，`setup-node` 的 `cache: npm` 会直接报错）。四个 job 并行，关键路径是 `browser`，**总计 ≈ 3 分钟**（实测分项见 §8.1） |

---

## 1. 现场勘察（改设计前先量到的数字）

### 1.1 仓库的形状

| 量 | 值 | 怎么量的 |
|---|---:|---|
| 跟踪文件数 | 2251 | `git ls-files \| wc -l` |
| commit 数 | 95 | `git rev-list --count HEAD` |
| `.git` 大小（无历史压缩） | 358 MiB | `git count-objects -vH` → `size-pack` |
| `--depth 1` clone 落到盘上 | 345 MiB | `du -sh` |
| 跟踪的 `.inspect/*` | **321** 个 | `git ls-files 'prototypes/*/.inspect/*'` |
| `prototypes/_fonts/` 跟踪文件 | 925 | 33 MiB |
| `.github/` | 无（本次新建） | |
| `package.json` / `node_modules` | **都没有** | |
| `tools/` | 被 `.gitignore:2` 排除，**CI 上不存在** | `git ls-files tools/` = 0 |
| `prototypes/_build/vendor/` | **已入库**（4 件，MIT） | `git ls-files prototypes/_build/vendor/` = 4 |

> ⚠️ `.gitignore:2` 的 `tools/` 是**未锚定**模式，任意深度都匹配。改 CI 时如果有人
> 往 `prototypes/tools/` 放过东西，clone 里会没有它。当前 0 例。

### 1.2 八个闸门实跑（干净 clone，本机）

我把 HEAD 用 `git clone file://` 做成一份干净副本，在那里逐个跑，因为**CI 看到的
就是这个**，而不是我这台机器上被各路 agent 改过的树。

| 闸门 | 退出码 | 耗时（本机） | 输出尾巴 |
|---|---:|---:|---|
| `check-anchors.mjs` | 0 | 3.2 s | `✓ 无死锚点` |
| `check-texture.mjs` | 0 | 3.3 s | `合计 FAIL 0 / WARN 0` |
| `check-twolines.mjs` | 0 | 2.4 s | `合计 FAIL 0 / WARN 0` |
| `check-contract.mjs` | 0 | 4.2 s | `合计 FAIL 0 / WARN 1 / INFO 2` |
| `check-prompts.mjs` | 0 | 3.2 s | `合计 FAIL 0 / WARN 1` |
| `check-docs.mjs` | **1** | 3.5 s | `README.md: 1 FAIL / 0 WARN / 12 PASS` |
| `check-docs.mjs --selftest` | **1** | 12.9 s | `✗ 自测失败：用例里有没通过的` |
| `check-stale.mjs` | **1** | 2.9 s | `⚠️ 31 项陈旧` —— **全是假的**，见 §3 |
| `verify-prototype.mjs --all` | **1** | 5.3 s | `达标 29 / 不达标 1 / 共 30` —— **设计如此** |
| `check-ui-copy.mjs` | 0 | 5.1 s | `合计 FAIL 0 / WARN 0` |
| `collect-schemes.mjs --check` | 0 | 6.4 s | 不写盘 ✅ |

本机全量静态串行：**18.3 秒**（7 个闸门）。加上 `--selftest` 20 秒、`ui-copy` 5 秒、
`collect --check` 6 秒，静态部分本机 ≈ **50 秒**。

### 1.3 浏览器侧

| 目标 | 耗时（本机） | 备注 |
|---|---:|---|
| `probe-ui.mjs`（8 条断言） | 46 / 48 / 50 / 51 s；**干净 clone 105 / 113 s** | 本机跑得快是热缓存；干净 clone 才是 CI 的样子 |
| `probe-ui.mjs --selftest` | **387 s** | 只识别 7/7 条变异 ✅，但代价 6.5 分钟 |
| `inspect.mjs`（1 案 × 2 视口，`--out` 到临时目录） | 38 s | 完整 3 视口 + 滚动截图会更慢 |

`probe-ui.mjs` 在**干净 clone 上两次都是 8 PASS / 0 FAIL**。我中间在真仓库里量到过
3 PASS / 5 FAIL ——那是别的 agent 正在改 `data.js` 造成的，**不是探针的噪声**。
结论：它需要**独占一棵干净的树**，这条要落成 job 约束（§5.2）。

---

## 2. 四条必须先处理的 CI 阻断（否则第一天就红）

### 2.1 🔴 `check-docs` 在干净 clone 上是 FAIL —— README 引用了一个被 gitignore 的文件

```
✗ paths/exist   1 个文档路径在仓库里不存在：deliverables/59-scratch/s13-duotone.mjs
```

事实链，全部实测：

| 环节 | 证据 |
|---|---|
| README 引用了它 | `README.md:546`、`README-EN.md:539` 都写着 `` `deliverables/59-scratch/s13-duotone.mjs` `` |
| 文件在本机**存在** | `-rw-r--r-- 6985 B deliverables/59-scratch/s13-duotone.mjs` |
| 但它**不在 git 里** | `git ls-files deliverables/59-scratch/` = 0 行 |
| 因为被忽略 | `git check-ignore -v` → `.gitignore:62:deliverables/*-scratch/` |
| 于是干净 clone 里没有 | `git ls-files \| grep -c '^deliverables/59'` = **0** |

这是我在这台机器上**看不到**这个 FAIL、而 CI 会看到的原因——这也是把「干净 clone」
当作唯一真相来源的价值。

**修法（二选一，改 README，不改 `.gitignore`）**：

- **A（推荐）**：把那句引用改成不落地的说明，例如
  `` `prototypes/_build/` 下的离线双色调脚本 ``（该脚本本质是一次性工序，不是产品的一部分）；
  同时在 `README.md` 同段补一句「工序脚本不入库，理由见 `.gitignore:62`」。
- **B**：把 `deliverables/59-scratch/s13-duotone.mjs` 移出 scratch，
  放进 `prototypes/_build/`（它确实是一条可复现的工序），README 指过去。

我倾向 A：`*-scratch/` 这条忽略规则是为了防「2833 个文件、75 万行误提交」
（`.gitignore:57-58` 的注释记着这件事），为了一个引用去动它就是拿止血带换创可贴。

**不做这一步的后果**：`static` job 每天红；`check-docs --selftest` 也会连带红
（它内部会跑一遍 `check-docs`，实测 clone 里 `✗ 误报 2` 就是这么来的），
也就是**同一个缺陷点亮两盏灯**。

### 2.2 🔴 `probe-ui.mjs` 与 `check-ui-copy.mjs` **根本不在 git 里**

这两个 W5 新增的闸门，我在本机都跑通了（`probe-ui` 8 PASS、`check-ui-copy` FAIL 0），
但一放进干净 clone 就当场崩：

```
$ node prototypes/_build/check-ui-copy.mjs
Error: Cannot find module '…/shelltest/prototypes/_build/check-ui-copy.mjs'
    code: 'MODULE_NOT_FOUND'
```

| 事实 | 证据 |
|---|---|
| `probe-ui.mjs` 存在且能跑 | `-rwxr-xr-x 25315 B`，干净 clone 上 8/8 通过 |
| `check-ui-copy.mjs` 存在且能跑 | `-rwxr-xr-x 10915 B`，FAIL 0 |
| **两个都没提交** | `git ls-files prototypes/_build/probe-ui.mjs prototypes/_build/check-ui-copy.mjs` = **0 行** |
| `git status` 里是未跟踪 | `?? prototypes/_build/probe-ui.mjs`、`?? prototypes/_build/check-ui-copy.mjs` |

这两个正是本设计里 `static` 与 `browser` 两个 job 的**核心**：
`probe-ui` 是「`_build/` 原有闸门没有一个执行 app.js」的唯一补丁，
`check-ui-copy` 是 `index.html` 的第一道闸门。**它们没进 git，CI 就是两个空 job**——
`browser` job 会以 `MODULE_NOT_FOUND` 红，`check-ui-copy` 那一步同理。

**修法**：`git add` 这两个文件，与 workflow 一起进同一个 PR。
注意 `probe-ui.mjs` 依赖 `vendor/cdp.mjs`（**已跟踪** ✅），所以它落库后就是自包含的。

> 这个坑的本质跟 §2.1 是同一个：**「我这台机器上它是绿的」不是证据，
> 「干净 clone 上它是绿的」才是。** 我是在干净 clone 里逐条跑 workflow 的每一步时
> 才发现的——这恰好就是 §11.1 那套预演存在的理由。

### 2.3 🟡 `check-ui-copy.mjs --selftest` 是**假绿**

```
$ node prototypes/_build/check-ui-copy.mjs --selftest
合计 FAIL 0 / WARN 0        ← 退出码 0
```

它在 `:17` 的用法注释里写着「`--selftest  # 变异测试`」，
但全文件 `grep -c selftest` = **1**——只有那行注释。
这个参数**根本没实现**，传进去只是又跑了一遍普通检查，然后以 0 退出。

这正是本仓库自己反复记着的那一类缺陷（「闸门打印绿、实际没跑」，
`verify-prototype.mjs` 规则 4 的先例）。**CI 里绝不能调它**，否则
「我们有变异测试」这句话就是假的。要么先把它实现，要么别在 workflow 里写这一行。

（对照：`check-docs --selftest` 是**真的**——我实测到它 9 个用例四红两绿 + 一守门员，
且故意改坏 README 会 exit 1。所以 §5.1 里只让它进去。）

### 2.4 🟡 四个闸门的路径推导不解码 `%20`

```js
const ROOT = new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
```

`URL.pathname` 是**百分号编码**的。我在含空格的路径里实测：

```
check-stale 风格 P = C:/Users/.../Temp/sp%20ace/
check-docs  风格 R = C:/Users/.../Temp/
```

| 闸门 | 是否 `decodeURIComponent` |
|---|---|
| `check-anchors.mjs:22` | ❌ |
| `check-contract.mjs:44` | ❌ |
| `check-stale.mjs:25` | ❌ |
| `check-texture.mjs:38` | ❌ |
| `check-docs.mjs:68` | ✅ |
| `verify-prototype.mjs:13` | ✅ |
| `check-ui-copy.mjs:28` | ✅ |
| `probe-ui.mjs:28` | ✅（用 `fileURLToPath`） |
| `render-scheme.mjs:16` | ✅ |

**对 CI 的影响：今天为零。** `actions/checkout` 的默认 workspace 是
`/home/runner/work/<repo>/<repo>`，没有空格。
**对维护者的影响：真实存在。** 谁把仓库放在 `D:/My Projects/` 下，
这 4 个闸门会找不到任何目录，然后**以 0 退出并打印「✓ 全部新鲜 / ✓ 无死锚点」**
（空集恒真，本仓库的名产）。这不是 CI 的活，但应该顺手记一条 issue。

---

## 3. `check-stale` 在 CI 里怎么处理（本题最硬的一块）

### 3.1 为什么 mtime 判据在 CI 上必然假阳性

`check-stale.mjs` 比的是 **源文件 mtime > `report.json` 内嵌的 `at`**。
`at` 是**渲染那一刻的墙钟时间**，写死在文件里；mtime 是**检出那一刻**。

`git checkout` 把每个文件的 mtime 都刷成检出时间。于是：

> 源文件的 mtime ＝ 现在，`at` ＝ 几个星期前 ⇒ 每一案都陈旧。

实测（`git clone file:// D:/Web/style`，干净副本）：

```
⚠️ 31 项陈旧（源文件比 report.json 新，说明改了没重渲染）：
     S06  style.css 落后 33490 分钟
     S10  style.css 落后 33432 分钟
     …
```

**31/31，全假。** 这个判据在开发机上有意义（mtime 记录了「我最后一次碰它是什么时候」），
在 CI 上则完全是噪声。

### 3.2 我先试过的两条修法，都不够

**修法 A：检出后从 git 恢复 mtime。** 可行，但没用：

```
restored 2251 files in 8784 ms
$ node prototypes/_build/check-stale.mjs
     S13  index.html 落后 15221 分钟
     S08  index.html 落后 13220 分钟
     …
```

仍然 11+ 项陈旧。原因：恢复出来的 mtime 是**源的最后一个 commit 时间**，
而判据比的是 `report.json` 的**内嵌 `at`**（S01 是 `2026-10-17T12:40`）。
只要某案的源在 `at` 之后被 commit 过，就仍然「陈旧」。这不是修法的问题——
**它问的问题本身就问错了**。

**修法 B：`touch` 全部文件、或给闸门加 `--ci` 开关跳过。**
前者是自欺（把判据变成恒假），后者等于删掉这个闸门。都不做。

### 3.3 采用的修法：把判据从 mtime 换成 commit 先后

换成一个**在 CI 上有意义**的问题：

> 这一案的源文件，最后一次被 commit 的时间，是否晚于它的
> `.inspect/report.json` 最后一次被 commit 的时间？

判据成立的理由：重渲染会**同时**改 `report.json` 和截图，所以一次「改源→重渲→提交」
会让两者的 commit 相同 ⇒ 不陈旧。只有「改了源、没重渲就提交」才会让源的 commit 更新。

**实测（HEAD，完整历史）**：

```
report.json dirs: 31, stale: 0
EXIT=0
```

**变异测试（证明它真的会响）**：在克隆里把 `S05-.../style.css` 加一行注释并提交：

```
report.json dirs: 31, stale: 1
  S05-pixel-cold-storage-console  prototypes/S05.../style.css  (source commit newer than report.json commit)
EXIT=1
```

好判据：HEAD 上绿、注入缺陷后红。耗时 **8.5 秒**（一次 `git log --name-only` 全量扫描 + 2251 次 `utimes` 的对照实验是 8.8 秒；本判据只读不写，8.5 秒）。

### 3.4 ⚠️ 这条判据的致命前提：`fetch-depth: 0`

**我实测到的陷阱**：`actions/checkout@v4` 默认 `fetch-depth: 1`，而
**depth-1 的 clone 里 `git log` 只有 1 个 commit**，所有文件都属于同一个 commit，
于是「源比报告新」永远不成立 ⇒ **判据安静地返回 0 陈旧**。

```
depth-1 clone，commits=1，注入「改了源没重渲」并 amend 进同一个 commit：
  → report.json dirs: 31, stale: 0     ← 假绿
```

这正是本仓库最恨的那类缺陷：**它失效的样子是「全部新鲜」，看起来像通过。**

所以：
1. 用这条判据的 job **必须** `fetch-depth: 0`；
2. 闸门里要**自检**：`git rev-list --count HEAD` 若 ≤ 1 或有
   `.git/shallow`，直接 `exit 2` 报「历史不完整，判据不可用」，
   **绝不返回「0 陈旧」**。

> 这与我方案里最初想把它做成「只比 PR 改动」的 delta 检查是同一件事，
> 但全量版本更简单、且在 main 上也能跑。代价是 `fetch-depth: 0` 要拉 358 MiB。
> 如果这 358 MiB 成为瓶颈，替代方案是 `filter: blob:none`（只要 commit + tree，
> 不要 blob）——`git log --name-only` 确实只用 tree。这条我没在 GH 上实测过，
> 写在这里作为备选，不作为默认。

### 3.5 落地形态

**✅ 已实现并测过**：`prototypes/_build/check-stale-git.mjs`（约 190 行，本次一并交付）。
保留 `check-stale.mjs` 原样给开发机用。两者**职责不同、都要存在**：

| | 开发机 | CI |
|---|---|---|
| 闸门 | `check-stale.mjs`（mtime） | `check-stale-git.mjs`（commit） |
| 问的问题 | 「我刚改的那一版重渲了没」 | 「这次的提交里有没有漏渲」 |
| 为什么不能互换 | mtime 在 CI 上恒假 | commit 判据在未提交的改动上恒真 |

它的四条自证（全部实测过，命令见附录 A）：

| 场景 | 结果 |
|---|---|
| HEAD、完整历史（95 commit） | `✓ 全部新鲜`，`exit 0`，**8.0 s** |
| 独立交叉验证（逐文件 `git log -1`，另一套代码） | `checked 31, stale 0` —— 与上一条一致 |
| 变异：改 `S05/style.css` 不重渲、只提交 | `⚠️ 1 项陈旧 S05 style.css`，`exit 1` |
| depth-1 clone（`shallow=true`） | `无法判定：历史不完整`，**`exit 2`** —— 不返回假绿 |

**明确的硬失败**：`check-stale-git` 进 `stale` job，阻塞合并。
HEAD 上是 0，所以第一天就是绿的——不会装一盏假红灯。
若真的有人改了源没重渲，它给出的是**精确到文件**的指责，且这条缺陷正是
AH-11 / AH-14 / N1 三次事故的共同根因，值得阻塞。

> **实现时踩到的两个坑，写进注释了，值得单独记一笔**：
>
> 1. **序号方向写反了。** 第一版我用 `seq9` 递增给 commit 编号，
>    然后判「源的 seq > 报告的 seq = 陈旧」。`git log` 是**从新到旧**输出，
>    所以 seq 越小越新 —— 这个判据问的其实是「源比报告旧」。
>    在 HEAD 上它报出 **17 项「陈旧」**，而那 17 项恰好是**最健康**的那些
>    （报告在源之后重渲过）。**方向写反会把绿灯全变成红灯**，
>    与「空集恒真」是同一家族的错误：错在坐标系，不在数据。
>    修法：`seq` 从 -1 起、从新到旧递增，判 `源的 seq < 报告的 seq`。
> 2. **本机 spawn `git` 会 ENOENT。** Windows 上 bash 里的 `git` 是
>    `/mingw64/bin/git`，不在 Node 的 PATH 解析范围内（实测
>    `execFileSync('git',…)` → `spawnSync git ENOENT`）。脚本里做了
>    `GIT_BIN` → `git` → git-bash 常见路径的逐级回退；CI（ubuntu）第一个就成功。

---

## 4. `render-scheme` 的取舍：不跑它，但补一个「渲染冒烟」

### 4.1 为什么 `render-scheme.mjs` 不能进 CI

三条，任一条都够：

1. **它写 tracked 文件。** 输出去 `prototypes/<案>/.inspect/`（321 个跟踪文件），
   产品入口还额外写 `_selection/self-gate.js`（`render-scheme.mjs:104-116`）。
   CI 跑完，工作树是脏的；而 CI 不该 commit 生成物。
2. **它要 30 次渲染。** 单案 2 视口就 38 秒（实测），30 案全量按
   `check-stale.mjs:100` 注释里的实测口径是每案 0.37–1.6 分钟 ⇒ 20–40 分钟。
3. **它是维护者动作，不是检查。** 它回答「把新修订渲成证据」，而 CI 要回答
   「现在这些证据还自洽吗」。`_entries.mjs:22` 把它登记成 `render:` 命令
   （给 stale 报告用的人读提示），这个定位是对的。

**附带纠正一条误解**：本题题干说 `render-scheme.mjs` 需要 Python 3 + Pillow。
**实测它不需要**——`grep -ci python render-scheme.mjs` = 0，
`vendor/inspect.mjs` / `probe.mjs` / `rules.mjs` / `cdp.mjs` 也都是 0。
Python + Pillow 只出现在 **`shot.mjs`**（21 处 Python 引用、1 处 Pillow），
那是截图取证工具，本来就不该进 CI。**所以 CI 不需要 `setup-python`。**

### 4.2 补一个渲染冒烟，判「报告有没有被写出来」

「站点还渲不渲得出来」这个问题确实没人回答——`probe-ui` 只覆盖 `_selection`，
30 个原型一个都不看。答案不是跑 `render-scheme`，是直接调 `vendor/inspect.mjs`：

```bash
node prototypes/_build/vendor/inspect.mjs \
     prototypes/S01-red-wedge-broadsheet/index.html \
     --out "$RUNNER_TEMP/render-smoke" --widths 1440,390 --json
```

**判据必须绕开退出码**——`inspect.mjs:171` 先写报告、`:173` 再因 findings 有 FAIL
而 exit 1。`render-scheme.mjs:66-70` 已经把这条教训写死了：

> 「**exit 码 ≠ 渲染成败，报告有没有被刷新才是**」

所以冒烟步骤的判据是：

| 断言 | 怎么判 |
|---|---|
| 渲染成功 | `$RUNNER_TEMP/render-smoke/report.json` **存在** |
| 截图产出 | `*.jpg` 数 > 0 |
| 页面没崩 | `report.json` 里 `viewports[*].consoleErrors` 全为空 |
| 尺寸合理 | 每视口 `metrics.page.height` > 0 且 `words` > 0 |

实测：1 案 × 2 视口 **38 秒**，退出码 0，产物落在临时目录，`git status` 无变化。

**选 1 案而不是 30 案**：冒烟要证明的是「渲染管线没死」，不是「30 案都完美」。
S01 是矩阵第一案、`check-stale.mjs` 的 render 命令示例也用它，做基准案合适。

---

## 5. `probe-ui.mjs` 的 job 设计

### 5.1 为什么不跟 `inspect.mjs` 挤一个 job

它们都启动 Chrome，但需求不同：

| | `probe-ui` | 渲染冒烟 |
|---|---|---|
| 浏览器用法 | `Browser.launch({width:1440,height:900})` + `newPage` + 键盘/点击事件 | 自己 `Browser.launch()` |
| 同时跑会怎样 | 两个 headless Chrome 抢 CPU，实测本机单跑都到 46–113 s，并发只会更慢且更易超时 | |
| 干净度 | 需要**独占一棵树**（见 5.2） | 只写 `$RUNNER_TEMP` |

放进同一个 job **顺序执行**即可（省一次 checkout ≈ 15 秒），不必拆两个 job、
两个 runner。顺序是 **冒烟先、探针后**：冒烟便宜（38 s）、探针贵（105 s），
贵的先跑会把超时预算烧在便宜的部分之前发现问题之前——不对，应该**便宜的先跑**，
这样便宜的红能立刻止损。所以：冒烟 → 探针。

### 5.2 硬约束：`probe-ui` 需要一棵没人动的树

`probe-ui.mjs --selftest` 会**改写 5 个 tracked 文件**（`:346` `fs.writeFileSync(path, src.replace(...))`，
`:358` 在 `finally` 里还原）。`--selftest` 我挪去定时任务了，但即便如此：

- 它启动**本地 http 服务**（`:42-56`）读盘上的 `data.js` / `app.js`，
  所以树必须是它预期的那一版；
- 我在真仓库里实测到过 3 PASS / 5 FAIL，全因**并行的 agent 正在改 `data.js`**。
  干净 clone 上两次都是 8 PASS / 0 FAIL。

CI 天然满足（每 job 一棵干净 checkout），但要写进注释里，
免得以后有人把它塞进「多个步骤共用一个 workspace」的复合 job。

### 5.3 Chrome 到底怎么找

`vendor/cdp.mjs:11-38` 的 `findChrome()` 顺序：

1. `CHROME_PATH` / `PUPPETEER_EXECUTABLE_PATH` 环境变量（存在即用）
2. Windows 各路径
3. macOS 各路径
4. Linux：`/usr/bin/google-chrome`、`/usr/bin/google-chrome-stable`、
   `/usr/bin/chromium`、`/usr/bin/chromium-browser`、`/snap/bin/chromium`、
   `/usr/bin/microsoft-edge`

`ubuntu-latest`（当前 = ubuntu-24.04）镜像**预装 Google Chrome stable**，路径
`/usr/bin/google-chrome`。**所以 `findChrome()` 找得到，不需要装。**

我的选择：**`apt-get install` 和 `browser-actions/setup-chrome` 都不用。**

- `apt-get install google-chrome-stable` 需要先加 Google 的 apt 源
  （`chrome` 不在 ubuntu 官方源里），多一段会烂的 shell；而且它会把
  「runner 镜像变了」这一个风险，换成「apt 源变了」+「shell 写错了」两个风险。
- `browser-actions/setup-chrome@v1` 是第三方 action，引入一个 `uses:` 供应链依赖，
  换来的能力是「把版本钉住」。本仓库的需求是「跑得动」，不是「版本可复现」——
  `probe-ui` 的 8 条断言判的是 computed style 与 DOM 计数，不是像素。

**但要做一件事**：显式 `env: CHROME_PATH: /usr/bin/google-chrome`，
把「找得到」从**推断**降级成**声明**。这样万一镜像真挪了路径，
失败信息会是「no such file: /usr/bin/google-chrome」而不是
`cdp.mjs` 那句含糊的「No Chrome/Edge/Chromium found」。

**并且**：冒烟步骤之前加一条 10 行的自检，把 `google-chrome --version` 打出来。
镜像变更时第一个红的是它，不是探针。

### 5.4 `--no-sandbox` 的问题（诚实记录，不预设结论）

`cdp.mjs:48-57` 的启动参数里**没有** `--no-sandbox`。
`Browser.launch()` 接受 `extraArgs`，所以需要时能加，但 `probe-ui.mjs:240`
调用时没传。

- **GitHub 托管 runner**：以非 root 用户跑，user namespace 可用，
  通常**不需要** `--no-sandbox`。
- **自托管 / 容器里以 root 跑**：会报 `Running as root without --no-sandbox is not supported`。

我的处理：**先不加**（加了会削弱一个真实的安全边界，而 CI 是公开仓库），
在 workflow 里留一注释说明「若换成容器 runner，需在 `probe-ui.mjs:240` 传
`extraArgs: ['--no-sandbox']`」。**第一次真跑红了再说**，不在没有证据时预防性削弱。

### 5.5 超时

| 步骤 | 实测（干净 clone，本机） | CI 预算 |
|---|---:|---:|
| Chrome 冷启动 | 最长实测 16.4 s（`cdp.mjs:63` 已把启动超时放宽到 60 s） | 60 s |
| 渲染冒烟 | 38 s | 120 s |
| `probe-ui` 8 条 | 105–113 s | 300 s |
| **job 总** | | **`timeout-minutes: 10`** |

10 分钟不是拍脑袋：`probe-ui` 的 105 秒里有 16 秒是 Chrome 冷启动、
7.5 秒是页面装载、其余是 8 条断言各自的 `settleMs` 等待。给 5 倍余量，
因为 ubuntu runner 的 CPU 比本机慢且是共享的。

---

## 6. prompt-len 的 3% WARN 该不该让 CI 红

### 6.1 机制是什么

`check-docs.mjs:654` `const DRIFT = 0.03;`，三档判据（`:650-652` 注释）：

```
精确相等              → PASS
偏差 ≤ 3%             → WARN   （该更新了，但不算错，也没有人会被误导）
偏差 > 3%             → FAIL   （这就是腐化）
```

退出码只看 FAIL：`process.exit(nf ? 1 : 0)`（`check-docs.mjs` 末尾），
所以 **WARN 现在是 exit 0，不阻塞**。

### 6.2 量级：3% 的带子有多宽

当前实测 min 1827 / median 1988 / max 2138。3% 分别是：

| 量 | 值 | 3% 带宽 |
|---|---:|---:|
| 区间下限 | 1827 | ±**55 字** |
| 中位 | 1988 | ±**60 字** |
| 区间上限 | 2138 | ±**64 字** |

W4 这轮把下限从 1814 改成 1827，动了 **13 字**——在带宽内，所以 W4 之后
如果只改 README 不改 `prompt-copy.js`，`nums/prompt-len` 会走 WARN 而不是 FAIL。

### 6.3 论证：**不应该**把 WARN 变成失败

三条理由，第一条是决定性的：

1. **它会把「文档该更新了」和「文档在说谎」混为一谈，而这个区分正是这条容差存在的理由。**
   `check-docs.mjs:652-653` 的注释写得很清楚：
   > 「这条容差不是放水，而是把『文档该不该改』与『文档有没有说谎』分开：
   > 15 个字的漂移不该红，一句差 700 字的话必须红。」
   把 WARN 接成 `exit 1` 就是把这句话撕了。**改一句机制句 → 提示词长 40 字 →
   PR 阻塞**，而那个 PR 可能正是在做 W4 要求的正确的事。

2. **本仓库已经吃过「恒亮红灯」的教训。** `verify-prototype --all` 因为 S08 两条
   §9.15 已豁免的 FAIL 而永久 exit 1，`ENGINEERING.md:211` 的处置就是把它降级成
   advisory，理由原话是「把它接成硬闸等于给 CI 装一盏**永远亮着的红灯**，
   两天后所有人开始忽略红灯」。同一个逻辑在这里成立：3% 带宽内发生的每一次
   合法编辑都会亮灯，一周内所有人学会无视。

3. **有更强的守卫已经在管这件事。** 提示词**内容**的正确性由
   `check-prompts.mjs` 管（30 条提示词 ↔ `style.css` 真实渲染值对账，
   实测 FAIL 0 / WARN 1），它比长度敏感得多——W4 的 A/B 实测是把
   `#4A5C3A` 改成 `#FF00FF`，`check-docs` 零反应而 `check-prompts` 会响。
   长度的 WARN 是**提示**，内容才是**断言**。

### 6.4 但也不能就这么让它消失

采纳的折中：**WARN 不阻塞，但必须可见。**

````yaml
- name: 静态闸门
  run: |
    set -o pipefail
    node prototypes/_build/check-docs.mjs | tee "$RUNNER_TEMP/docs.log"
    # WARN 不判失败，但把它顶到 job 摘要里，免得淹在 60 行输出里
    if grep -q '^  ⚠ ' "$RUNNER_TEMP/docs.log"; then
      {
        echo '### ⚠ check-docs 有 WARN（不阻塞，但请确认）'
        echo '```'
        grep '^  ⚠ ' "$RUNNER_TEMP/docs.log"
        echo '```'
      } >> "$GITHUB_STEP_SUMMARY"
    fi
````

一次性把「不阻塞」和「不许消失」同时落实。任何看 CI 的人打开 job 摘要就看见它。

**另外**（跟本条无关但同因）：`check-prompts` 和 `check-contract` 也各有一条常驻 WARN
（`WARN 1`）。它们是**稳定存在的**（C5 允许表里有 2/5 条规则没有 FAIL 分支，
`font-count` 是中文站的结构性下限），不是「该修没修」。这类 WARN 应该被
**登记进文档并允许豁免**，而不是每次 CI 都重新提示一遍——否则它就是下一个被无视的灯。
这条留给后续轮次，本设计只保证它不会**阻塞**。

---

## 7. 最终的 `.github/workflows/ci.yml`

````yaml
# 闸门流水线（2026-11-04 新增，W5）
#
# 设计原则只有一条：**只有「红了就说明产品坏了」的闸门才阻塞合并。**
#
# 这个仓库为此付过学费：`verify-prototype --all` 因 S08 的两条已豁免 FAIL
# （`_CONTRACT.md` §9.15 允许表内）而**设计上永久 exit 1**。它一旦被接成硬闸，
# 就是一盏永远亮着的红灯，两天后所有人开始忽略红灯。
# 所以它在这里是 advisory，而不是 static。
#
# 四个 job：
#   static   —— 9 个纯文本闸门 + 闸门自检。硬失败。不碰浏览器。
#   browser  —— 渲染冒烟 + 运行时探针。硬失败。独占一棵树。
#   stale    —— commit 判据的陈旧度。硬失败。**必须 fetch-depth: 0**。
#   advisory —— verify-prototype 与 mtime 判据的陈旧度。只报不拦。
#
# 不进 CI 的东西与理由，逐条写在文件末尾的注释里。

name: ci

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

# 只读。CI 绝不 commit 生成物、绝不写仓库。
permissions:
  contents: read

# 同一分支连推时取消上一轮，省 runner 分钟，也避免两轮抢同一份 PR 评论。
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ══════════════════════════════════════════════════════════════════════
  # static —— 纯文本闸门。全部硬失败。
  # ══════════════════════════════════════════════════════════════════════
  static:
    name: 静态闸门
    runs-on: ubuntu-latest
    timeout-minutes: 8
    steps:
      # fetch-depth: 1 是默认值，这里显式写出来：static 不需要历史。
      # （需要历史的是 stale job，它单独声明 fetch-depth: 0。）
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: actions/setup-node@v4
        with:
          node-version: '22'      # vendor/cdp.mjs 用内置 WebSocket，需 Node 22+
          # ⚠️ 不要加 cache: 'npm' —— 本仓库没有 package.json / lockfile，
          #    加了 setup-node 会直接报 "Dependencies lock file is not found"。

      - name: Node 版本自证
        run: |
          node --version
          # 内置 WebSocket 是 Node 22+ 的硬要求（vendor/cdp.mjs:43）
          node -e 'if (typeof WebSocket === "undefined") { console.error("需要 Node 22+"); process.exit(1) }'

      # ── 9 个闸门。逐个 `run:`，不用 `set -e` 串成一条 ────────────────
      # 理由：串成一块时，第一个红的会掩盖后面的。分成 9 个 step 之后，
      # GitHub 的 UI 会直接列出「哪几个红了」，而不是「第 1 个红了、后面没跑」。
      - name: check-anchors（死锚点）
        run: node prototypes/_build/check-anchors.mjs

      - name: check-texture（纹理必须挂伪元素）
        run: node prototypes/_build/check-texture.mjs

      - name: check-twolines（data.js ↔ prompts.js 的关系）
        run: node prototypes/_build/check-twolines.mjs

      - name: check-prompts（提示词 vs style.css 真实渲染值）
        run: node prototypes/_build/check-prompts.mjs

      - name: check-contract（实测 FAIL ⊆ §9.15 允许表）
        run: node prototypes/_build/check-contract.mjs

      - name: check-ui-copy（选型台界面文案不得手写数字）
        run: node prototypes/_build/check-ui-copy.mjs

      - name: collect-schemes --check（数据完整性，不写盘）
        run: node prototypes/_build/collect-schemes.mjs --check

      - name: check-docs（README ↔ 数据）+ WARN 顶到摘要
        # check-docs 的退出码只看 FAIL：WARN 是 0（见 check-docs.mjs 末尾
        # `process.exit(nf ? 1 : 0)`）。3% 漂移带内的编辑不该阻塞 PR，
        # 但也不许消失 —— 所以把 WARN 塞进 job 摘要。
        run: |
          set -o pipefail
          mkdir -p "$RUNNER_TEMP"
          node prototypes/_build/check-docs.mjs | tee "$RUNNER_TEMP/docs.log"
          if grep -q '^  ⚠ ' "$RUNNER_TEMP/docs.log"; then
            {
              echo ''
              echo '### ⚠ check-docs 有 WARN（不阻塞，但请确认）'
              echo ''
              echo '```'
              grep '^  ⚠ ' "$RUNNER_TEMP/docs.log"
              echo '```'
            } >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: check-docs --selftest（证明这个检查器不是恒真）
        # 20 秒，值。它会逐条把 README 的三处已知腐化改回原位，
        # 断言对应的三条断言各自变红、退出码 = 1。
        # ⚠️ 不要在这里加 check-ui-copy.mjs --selftest：
        #    那个参数**没有实现**（grep -c selftest = 1，只有用法注释那一行），
        #    传进去只是又跑一遍普通检查然后 exit 0 —— 假绿。
        run: node prototypes/_build/check-docs.mjs --selftest

      - name: 闸门不得弄脏工作树
        # 这一条是元断言：上面 9 个闸门如果哪个偷偷写了 tracked 文件，
        # 下一个读它的人就会读到被改过的数据。实测全绿。
        run: |
          set -e
          dirty="$(git status --porcelain --untracked-files=no)"
          if [ -n "$dirty" ]; then
            echo '::error::以上闸门修改了 tracked 文件：'
            echo "$dirty"
            exit 1
          fi
          echo '✓ 工作树干净'

  # ══════════════════════════════════════════════════════════════════════
  # stale —— 陈旧度，commit 判据。硬失败。**必须 fetch-depth: 0**。
  # ══════════════════════════════════════════════════════════════════════
  stale:
    name: 陈旧度（commit 判据）
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      # ⚠️⚠️ fetch-depth: 0 是**判据成立的前提**，不是优化。
      # depth-1 的 clone 里 `git log` 只有 1 个 commit，所有文件属于同一个 commit，
      # 「源比报告新」永远不成立 ⇒ 判据安静地返回「0 陈旧」，看起来像通过。
      # 我在 depth-1 上做过变异测试：改了 style.css 不重渲、amend 进同一个 commit，
      # 判据仍然报 stale: 0。这正是本仓库最恨的那类失效（失效的样子是绿）。
      # 闸门自身也会再自检一次（git rev-parse --is-shallow-repository）。
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: check-stale-git（源文件的最后 commit 晚于 report.json 的最后 commit）
        # 为什么不用 check-stale.mjs：它比「源 mtime > report.json 内嵌的 at」，
        # 而 git checkout 会把每个文件的 mtime 刷成检出时刻 ⇒ 31/31 全假陈旧
        # （实测，见 §3）。这个 job 用 commit 先后代替 mtime，
        # 在 HEAD 上实测 31 个入口 0 陈旧，注入缺陷后 1 陈旧、exit 1。
        run: node prototypes/_build/check-stale-git.mjs

  # ══════════════════════════════════════════════════════════════════════
  # browser —— 渲染冒烟 + 运行时探针。硬失败。独占一棵树。
  # ══════════════════════════════════════════════════════════════════════
  browser:
    name: 浏览器（渲染冒烟 + 运行时探针）
    runs-on: ubuntu-latest
    timeout-minutes: 10
    env:
      # 显式声明，把「找得到 Chrome」从推断降级成声明。
      # vendor/cdp.mjs:12 优先读这个变量，其次才去猜路径。
      CHROME_PATH: /usr/bin/google-chrome
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: 确认 Chrome 与内置 WebSocket
        # 不 apt-get、不 setup-chrome：ubuntu-latest 镜像预装 Google Chrome stable，
        # 路径就是 /usr/bin/google-chrome（vendor/cdp.mjs:33 已列）。
        # 这一行的价值是：镜像哪天挪了路径，第一盏红的是它，而不是探针里那句含糊的
        # 「No Chrome/Edge/Chromium found」。
        run: |
          set -e
          "$CHROME_PATH" --version
          node -e 'if (typeof WebSocket === "undefined") { console.error("需要 Node 22+"); process.exit(1) }'

      - name: 渲染冒烟（证明站点还渲得出来）
        # 调 vendor/inspect.mjs，不调 render-scheme.mjs。
        #   render-scheme 写 tracked 的 .inspect/（321 个文件）+ self-gate.js，
        #   跑完仓库就脏了；而且它要 30 次渲染（单案 38 秒 × 30）。
        # 这里 1 案 × 2 视口，--out 到临时目录，只回答一个问题：
        #   「渲染管线还活着吗」。
        #
        # ⚠️ 判据**不能**是退出码：inspect.mjs 先写 report、再因 findings 有 FAIL
        #    而 exit 1（render-scheme.mjs:66-70 记着这条教训）。
        #    「exit 码 ≠ 渲染成败，报告有没有被刷新才是」。
        run: |
          set -e
          # $RUNNER_TEMP 在 Actions 上必然存在；这一行是为了让本步骤能在本地
          # 原样复现（§11.1 的预演），否则会因目录不存在而误报"渲染失败"。
          mkdir -p "$RUNNER_TEMP"
          OUT="$RUNNER_TEMP/render-smoke"
          rm -rf "$OUT"
          set +e
          node prototypes/_build/vendor/inspect.mjs \
               prototypes/S01-red-wedge-broadsheet/index.html \
               --out "$OUT" --widths 1440,390 --json > "$RUNNER_TEMP/smoke.json"
          code=$?
          set -e
          echo "inspect 退出码 = $code（有 FAIL 时会是 1，不代表渲染失败）"

          test -f "$OUT/report.json" || { echo '::error::没写出 report.json，渲染失败'; exit 1; }
          jpgs=$(find "$OUT" -name '*.jpg' | wc -l)
          test "$jpgs" -gt 0 || { echo '::error::一张截图都没产出'; exit 1; }

          # 页面没崩：任何视口的 consoleErrors 必须为空
          node -e '
            const j = require(process.argv[1]);
            const bad = (j.viewports || []).flatMap(v => (v.consoleErrors || []).map(e => `${v.width}px: ${e}`));
            for (const v of j.viewports || []) {
              if (!(v.metrics && v.metrics.page && v.metrics.page.height > 0))
                throw new Error(`${v.width}px 页高为 0 —— 页面没渲染`);
              if (!(v.metrics.page.words > 0))
                throw new Error(`${v.width}px 字数 0 —— 内容是空的`);
            }
            if (bad.length) throw new Error("控制台报错:\n" + bad.join("\n"));
            console.log(`✓ ${j.viewports.length} 个视口渲染正常，${bad.length} 条控制台报错`);
          ' "$OUT/report.json"
          echo "✓ 产出 $jpgs 张截图"

      - name: 运行时探针（8 条断言，真点击 / 真按键 / 真复制）
        # 这个探针补的是一段真空：原有闸门**没有一个**执行 app.js，
        # 所以 8 条「界面在说谎」的缺陷在全绿闸门背后活了几个月。
        # 它需要一棵没人动的树：它起本地 http 服务读盘上的 data.js / app.js。
        # 干净 clone 上实测 8 PASS / 0 FAIL，105–113 秒。
        run: node prototypes/_build/probe-ui.mjs --verbose

      - name: 失败时留证据
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: browser-evidence
          path: |
            ${{ runner.temp }}/render-smoke/
            ${{ runner.temp }}/smoke.json
          if-no-files-found: ignore

  # ══════════════════════════════════════════════════════════════════════
  # advisory —— 只报不拦
  # ══════════════════════════════════════════════════════════════════════
  advisory:
    name: 参考项（不阻塞合并）
    runs-on: ubuntu-latest
    timeout-minutes: 8
    continue-on-error: true
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      # 为什么 continue-on-error 挂在 job 级而不是 step 级：
      #   挂 job 级时整个 job 显示为"通过（有一个警告）"，不会被误读成"阻塞"；
      #   挂 step 级会让 job 整体变绿，掩盖了「这个 job 本来就只报不拦」这件事。

      - name: verify-prototype --all（29/30 与 exit 1 都是设计值）
        run: |
          set +e
          mkdir -p "$RUNNER_TEMP"
          node prototypes/_build/verify-prototype.mjs --all | tee "$RUNNER_TEMP/verify.log"
          code=${PIPESTATUS[0]}
          {
            echo ''
            echo '### verify-prototype（参考）'
            echo ''
            echo "退出码 $code。**29/30 且 exit 1 是设计上的正常值**："
            echo 'S08 的两条 FAIL（`palette-terracotta` / `font-count`）已在'
            echo '`_CONTRACT.md` §9.15 允许表内登记，`check-contract` 判它们合法。'
            echo '这个脚本不读允许表（那是 check-contract 的职责），所以它永远 exit 1。'
            echo ''
            echo '```'
            grep -E '^[✓✗~]' "$RUNNER_TEMP/verify.log" | tail -40
            echo '```'
          } >> "$GITHUB_STEP_SUMMARY"

      - name: check-stale.mjs（mtime 判据 —— 在 CI 上无意义，仅作对照）
        run: |
          set +e
          node prototypes/_build/check-stale.mjs | head -20
          echo ''
          echo '::notice::check-stale 比的是「源 mtime > report.json 内嵌的 at」，'
          echo '::notice::而 checkout 会把所有 mtime 刷成检出时刻 ⇒ CI 上必然假陈旧。'
          echo '::notice::真正的陈旧度由 stale job 的 commit 判据负责。'
````

---

## 8. 闸门 × job × 硬/软 对照表

| 闸门 | job | 硬/软 | 为什么 | 耗时（本机实测 / CI 估算） |
|---|---|---|---|---|
| `check-anchors` | static | **硬** | 纯文本、0 依赖、当前 exit 0。死锚点是「点了没反应」的直接缺陷 | 3.2 s / ~2 s |
| `check-texture` | static | **硬** | 这条一破，`contrast` 与 `empty-screens` 会**静默通过**，其余所有绿都变假（`_CONTRACT.md` §9.2） | 3.3 s / ~2 s |
| `check-twolines` | static | **硬** | 两条数据链的关系（data.js ⊆ prompts.js 等 R1/R6/R7/R8）。当前 30/30 | 2.4 s / ~2 s |
| `check-prompts` | static | **硬** | 30 条提示词 ↔ `style.css` 真实渲染值对账。**唯一**能抓到「提示词内容被改错」的闸门（W4 的 `#4A5C3A`→`#FF00FF` A/B 实测） | 3.2 s / ~3 s |
| `check-contract` | static | **硬** | §9.15 允许表的**权威**：`FAIL ⊆ 允许表`、允许表里每条规则在引擎里存在 | 4.2 s / ~4 s |
| `check-ui-copy` | static | **硬** | `index.html` 的第一道闸门。「界面里复述可计算量的数字必须派生」 | 5.1 s / ~5 s |
| `collect-schemes --check` | static | **硬** | 数据完整性，不写盘 | 6.4 s / ~6 s |
| `check-docs` | static | **硬**（需先修 §2.1） | README ↔ data.js / prompts.js 13 条断言。**当前在干净 clone 上 1 FAIL**（README:546 引用了一个 gitignore 掉的文件） | 3.5 s / ~3 s |
| `check-docs --selftest` | static | **硬** | 证明上一个闸门不是恒真。9 个用例（四改坏 + 一守门员 + 两误报） | 12.9–23.7 s / ~15 s |
| `check-stale-git`（新，已交付） | stale | **硬** | commit 判据。AH-11 / AH-14 / N1 三次事故的共同根因。HEAD 上 31 入口 0 陈旧、变异后 1 陈旧 | 8.0 s / ~10 s |
| 渲染冒烟（`vendor/inspect.mjs`，1 案 × 2 视口） | browser | **硬** | 「站点还渲不渲得出来」目前无人回答。判据是 report.json 存在 + 截图 > 0 + consoleErrors 空，**不是**退出码 | 45.8 s / ~55 s |
| `probe-ui`（8 条断言） | browser | **硬** | `_build/` 原有闸门**没有一个**执行 app.js。补的就是这一段 | 80–113 s / ~120 s |
| `verify-prototype --all` | advisory | **软** | **设计上永久 exit 1**（S08 两条 §9.15 已豁免 FAIL，且它不读允许表）。接成硬闸 = 永远亮着的红灯 | 5.3 s / ~5 s |
| `check-stale.mjs`（mtime） | advisory | **软** | CI 上 31/31 全假陈旧（见 §3.1）。留作对照，不判成败 | 2.9 s / ~3 s |
| `probe-ui --selftest` | **定时任务**（见 §9） | 软 | 387 秒，且临时改写 5 个 tracked 文件。PR 流水线负担不起 | 387 s / ~500 s |
| `render-scheme.mjs` | **不跑** | — | 写 tracked 文件 + 30 案 × 0.4–1.6 分钟 | 20–40 min |
| `shot.mjs` | **不跑** | — | 需 Python 3 + Pillow；截图取证不是断言 | — |
| `_s03-probe.mjs` | **不跑** | — | 一次性探针 | — |
| `summarize-all` / `backfill-credits` / `write-credits` | **不跑** | — | 无断言 | — |
| `fetch-fonts` / `fetch-css-fonts` / `fetch-scheme-assets` / `assign-assets` / `selfhost-fonts` | **不跑** | — | 要网络，且**写**仓库 | — |
| `extract-specs` / `clean-dna` / `build-prompts`（生成链） | **不跑** | — | 生成器不是检查器；产物已入库，由 `check-stale-git` 判它是否过期 | — |

### 8.1 预期总耗时

| job | 本机实测（逐 step 加总） | CI 估算（ubuntu runner ≈ 1.3× 本机） |
|---|---:|---:|
| static（9 闸门 + selftest + 树干净） | ~50 s | **~90 s**（含 checkout + setup-node） |
| stale（`check-stale-git`） | 8.0 s | **~35 s**（`fetch-depth: 0` 拉 358 MiB 是大头） |
| browser（冒烟 45.8 s + 探针 80.2 s） | **~126 s** | **~3 分钟** |
| advisory（verify 5 s + stale-mtime 3 s） | ~8 s | **~30 s** |
| **关键路径（四个 job 并行，最长是 browser）** | | **≈ 3 分钟** |

四个 job 并行。**总墙上时间 ≈ 3 分钟**（不含 runner 排队）。
关键路径是 `browser`：Chrome 冷启动 ~16 s + 冒烟 ~46 s + 探针 ~80 s，实测合计 126 s。

---

## 9. `probe-ui --selftest` 挪到定时任务

```yaml
# .github/workflows/ci-nightly.yml（单独文件，因为触发条件不同）
name: ci-nightly
on:
  schedule:
    - cron: '17 3 * * *'      # 每天 03:17 UTC（避开整点高峰）
  workflow_dispatch:

permissions:
  contents: read

jobs:
  probe-selftest:
    name: 探针自检（变异测试）
    runs-on: ubuntu-latest
    timeout-minutes: 20
    env:
      CHROME_PATH: /usr/bin/google-chrome
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      # ⚠️ --selftest 会**改写 5 个 tracked 文件**（probe-ui.mjs:346 writeFileSync，
      #    :358 在 finally 里还原）。跑完必须是干净的；不干净说明它中途被杀了。
      #    这条断言就是为了抓那种情况 —— 否则下一次的探针会读到被变异过的源码。
      - name: 探针自检
        run: node prototypes/_build/probe-ui.mjs --selftest

      - name: 自检后树必须干净
        if: always()
        run: |
          dirty="$(git status --porcelain --untracked-files=no)"
          if [ -n "$dirty" ]; then
            echo '::error::selftest 没有把文件还原：'
            echo "$dirty"
            exit 1
          fi
```

放这里的理由：387 秒是 PR 流水线负担不起的（本机实测，CI 上只会更久），
但它是**唯一**能证明探针活着的东西（`probe-ui.mjs:271-276` 原话：
「selftest 是唯一能证明探针活着的东西」）。每天跑一次，够。

---

## 10. CI **明确不做**的事，以及为什么

| 不做 | 为什么 |
|---|---|
| **不跑 `render-scheme.mjs`** | 写 321 个 tracked 文件 + `self-gate.js`；30 案 × 0.4–1.6 min = 20–40 min。它是**维护者动作**（`_entries.mjs:22` 把它登记为 `render:` 提示命令），不是检查 |
| **不部署 GitHub Pages** | 仓库已有 `.nojekyll`（`git ls-files .nojekyll` 确认已跟踪），Pages 设「Deploy from a branch / main / root」即可，`index.html` 是 0 秒 meta 跳转。**CI 与发布解耦**：CI 红只挡合并，不影响站点在线 |
| **不做任何写操作** | `permissions: contents: read`。CI 不 commit 生成物、不 push、不开 PR。生成物入库是维护者的显式动作 |
| **不装 Python / Pillow** | 实测 `render-scheme.mjs` 与 `vendor/*` 里 Python 引用数 = 0；只有 `shot.mjs` 需要（21 处），而它不进 CI |
| **不装 `tools/taste-skill`** | `.gitignore:2` 排除 `tools/`，且 `render-scheme.mjs:22-25` 与 `check-contract.mjs:47-50` 已改成**优先用入库的 `vendor/`**。`tools/` 退为本地开发的可选覆盖 |
| **不缓存任何东西** | 没有 `package.json`、没有 `node_modules` ⇒ **没有东西可缓存**。`setup-node` 的 `cache: 'npm'` 在无 lockfile 时会直接**报错**，所以必须不写。仓库 358 MiB 的 `.git` 由 Actions 自己的 git cache 处理，我们不该再叠一层 |
| **不设 `continue-on-error` 在硬闸的 step 上** | 那会让 job 变绿而红灯消失。advisory 的软是挂在 **job 级**的 |
| **不加 `--no-sandbox`** | GitHub 托管 runner 非 root、user namespace 可用，不需要。加了等于无故削弱一个真实的安全边界。若将来换容器 runner，在 `probe-ui.mjs:240` 传 `extraArgs: ['--no-sandbox']` |
| **不跑 `check-ui-copy --selftest`** | **该参数没实现**（§2.3），跑它等于写一句假话进 workflow |
| **不做「中文/英文各跑一遍 `check-docs`」** | `check-docs` 的 `i18n/facts` 断言已经在主运行里对账两版。单独跑 `README-EN.md` 会退化成单向（脚本头注释自己写着） |
| **不用 `browser-actions/setup-chrome`** | 引入第三方 `uses:` 供应链依赖，换来的「版本可复现」本仓库不需要（8 条断言判 computed style 与 DOM 计数，不判像素） |

---

## 11. 测试计划：推之前怎么证明它是对的

### 11.1 本地预演（不推就能抓 90% 的问题）

**关键：不要在你现在这棵树上预演。** 它被各路 agent 改过
（`git status` 里 `data.js` / `app.js` / S03.md / S17.md 全是 M），
任何一条红都会是假的（我实测过一次：`probe-ui` 报 3 PASS / 5 FAIL，
原因就是并行的 agent 正在改 `data.js`）。

```bash
# 1) 造一棵干净树，路径里不要有空格（见 §2.4）
git clone --depth 1 . /tmp/ci-dry && cd /tmp/ci-dry

# 2) 逐条跑 workflow 里 static 的命令，一条不落
node --version                                  # 需要 ≥ 22
node -e 'if (typeof WebSocket === "undefined") process.exit(1)'
node prototypes/_build/check-anchors.mjs
node prototypes/_build/check-texture.mjs
node prototypes/_build/check-twolines.mjs
node prototypes/_build/check-prompts.mjs
node prototypes/_build/check-contract.mjs
node prototypes/_build/check-ui-copy.mjs
node prototypes/_build/collect-schemes.mjs --check
node prototypes/_build/check-docs.mjs
node prototypes/_build/check-docs.mjs --selftest
git status --porcelain -uno                    # 必须为空

# 3) stale job —— 必须拉全历史，否则它是假绿
git fetch --unshallow
node prototypes/_build/check-stale-git.mjs     # 期望 exit 0

# 4) browser job
CHROME_PATH=/usr/bin/google-chrome node prototypes/_build/probe-ui.mjs --verbose
```

**我已经把整套 workflow 的每一步都跑过一遍了**（不是"等价"，是真的把 YAML 里的
`run:` 抽成脚本逐条执行）。做法：从本文的 YAML 块里程序化抽出 18 个 `step` 的
shell 体，在一棵 `git clone file://` 出来的干净副本里逐条跑。

结果（干净 clone + 已修 §2.1 + 已 `git add` §2.2 那三件）：

| job | 步骤 | 结果 |
|---|---|---|
| static | s00 Node 自证 | `v26.12.1` ✅ |
| static | s01–s09 九个闸门 + selftest | **全 0** ✅ |
| static | s10 工作树不得变脏 | `✓ 工作树干净` ✅ |
| stale | s11 `check-stale-git` | `✓ 全部新鲜`，`exit 0` ✅ |
| browser | s12 Chrome 自检 | `--version` 打印版本 ✅ |
| browser | s13 渲染冒烟 | `✓ 2 个视口渲染正常，0 条控制台报错 / ✓ 产出 5 张截图`，**45.8 s** ✅ |
| browser | s14 `probe-ui --verbose` | `8 PASS / 0 FAIL`，**80.2 s** ✅ |
| advisory | s15 `verify-prototype --all` | `达标 29 / 不达标 1`（设计值），摘要已写入 ✅ |
| advisory | s16 `check-stale.mjs` | 3 条 `::notice::` 已输出 ✅ |

> ⚠️ 一个必须记住的次序：s10（树干净）**第一次跑是红的**，因为我在测试 clone 里
> 改了 README 但**没提交**。先 commit 再跑，它才绿。CI 上不存在这个问题
> （checkout 出来的东西按定义是干净的），但本地预演时它很容易骗你一次。
>
> 另外：s13 的 `$RUNNER_TEMP/smoke.json` 那次本地跑**红过一次** —— 因为
> `$RUNNER_TEMP` 在本地未必存在，`> "$RUNNER_TEMP/smoke.json"` 直接
> `No such file or directory`。三个用到 `$RUNNER_TEMP` 的步骤（s08 / s13 / s15）
> 现在都加了 `mkdir -p "$RUNNER_TEMP"`。Actions 上它必然存在，但加上之后
> **§11.1 这套本地预演才能真正逐字复现 workflow**，否则预演本身会误报。

### 11.2 第一次真跑一定要在分支上

```
1. git checkout -b ci/add-workflow
2. git add .github/workflows/ci.yml .github/workflows/ci-nightly.yml \
             prototypes/_build/check-stale-git.mjs \
             prototypes/_build/probe-ui.mjs \
             prototypes/_build/check-ui-copy.mjs \
             README.md README-EN.md          # 那一处引用修法（§2.1）
   # ⚠️ 中间三件最容易漏：它们在本机都能跑，但 git ls-files 里没有（§2.2）。
   #    漏了 probe-ui / check-ui-copy，browser 与 static 各有一盏灯是空的。
3. git push -u origin ci/add-workflow
4. 开 PR 到 main —— 让 pull_request 触发一次
```

**绝不先推 main。** 理由：`push: branches: [main]` 一旦触发，一次失败就是主分支红 +
一次 force-push 的诱惑。PR 触发能拿到同样的信息，且可以随便改。

### 11.3 承认「第一次会红」，并且提前给每盏灯准备好解释

| 可能红的地方 | 是缺陷还是环境 | 处置 |
|---|---|---|
| `check-docs` / `paths/exist` | **真缺陷**（§2.1） | 先修 README，再开 PR |
| `check-docs --selftest` 连带红 | 同一个真缺陷 | 同上 |
| `stale` job 报大量陈旧 | **判据用错了**（fetch-depth 没设 0） | 检查 `git rev-parse --is-shallow-repository` |
| `browser` / Chrome 找不到 | 镜像变了 | `README_镜像` 或临时 `apt-get`；先看那一步打印的 `--version` |
| `browser` / `probe-ui` 超时 | runner 比本机慢 | 把 `timeout-minutes` 从 10 抬到 15；**不要**删断言 |
| `browser` / 探针某条红 | **大概率是真缺陷** | 干净 clone 上它两次都是 8/8；红了就是环境真的坏了 |

### 11.4 变异测试：证明 workflow 自己会响

闸门有 selftest，**workflow 没有**。补一轮手工的，在 PR 分支上各做一次：

| 注入 | 期望哪个 job 红 | 注入方式 |
|---|---|---|
| 删掉 S03 `index.html` 里一个 `id=` | `static` / check-anchors | 改一行 |
| 把某案 `body { background-image: ... }` 加回去 | `static` / check-texture | 改一行 |
| 改 `prompts.js` 里一个 hex | `static` / check-prompts | 改一行 |
| 改「30 个方案」→「31 个方案」 | `static` / check-docs | 改一行 |
| 只改 `S05/style.css`，不重渲、只提交 | `stale` | 一个 commit |
| 把 `index.html` 的 `data-derived` 换成手写数字 | `static` / check-ui-copy | 改一行 |
| 破坏 `app.js` 的第一个 `{` | `browser` / 渲染冒烟（consoleErrors） | 改一行 |

七条全中，这个 workflow 才算被证明过。**任何一条没响，那一盏灯就是装饰。**

### 11.5 Windows → Linux 的路径假设：逐条审计

用户在本机 Windows 上工作，CI 是 ubuntu。我逐条审了闸门里的平台假设：

| 假设 | 位置 | CI 上会不会坏 |
|---|---|---|
| `new URL(...).pathname.replace(/^\/([A-Za-z]:)/, '$1')` 剥盘符 | 4 个闸门 | **不会**。Linux 上 `pathname` 以 `/` 开头，这个正则**不匹配**，`$1` 分支不执行 —— 是死代码，无害 |
| `URL.pathname` 不解码 `%20` | `check-anchors:22`、`check-contract:44`、`check-stale:25`、`check-texture:38` | **不会**。`actions/checkout` 的 workspace 是 `/home/runner/work/<repo>/<repo>`，无空格。**但维护者本机若放在含空格路径下，这 4 个闸门会静默全绿**（§2.4） |
| 反斜杠路径 | `check-stale.mjs:236` 有 `f.replace(/\\/g, '/')`，是**故意**做的显示归一化 | **不会**。它只影响打印，不影响判据 |
| 大小写不敏感 | `check-docs.mjs:887` `d.name.toLowerCase().startsWith(leaf.toLowerCase())` | **不会坏，但会掩盖**。Linux 是大小写敏感的，这个 toLowerCase 兜底会把「README 里大小写写错了」判成「合法缩写」。我实测当前 README 里 **0 处**大小写不匹配，所以今天不爆；但这是**未来**的假绿来源，应记为一条 issue |
| 文档内路径分隔符 | `check-docs` 的 `paths/exist` 用 `join(REAL_ROOT, v)`，`v` 来自 README 且用 `/` | **不会**。Node 在 Linux 上按 `/`，在 Windows 上两种都认。反过来（文档写 `\`）才会在 Linux 上坏——当前 0 例 |
| **换行符** | 无 `.gitattributes`，48 个文件以 **CRLF** 入库 | **不会坏**。我把 README.md / README-EN.md 改成 LF 后重跑 `check-docs`，结果**不变**（仍只有 1 条 `paths/exist`）。所以行尾不是 CI 风险。**但建议不要现在加 `.gitattributes`**：`* text=auto eol=lf` 会让 48 个文件全部重写，制造一个 2251 文件的假 diff |
| `execFileSync(process.execPath, [new URL(import.meta.url).pathname...])` | `check-docs.mjs:206,304` | **不会**。`pathname` 未解码，但 CI 路径无空格；且这只在 `--selftest` 里传自己 |
| `spawnSync` / `process.execPath` | `render-scheme.mjs` | **不跑** |
| 硬编码 `python.exe` | `shot.mjs:43` | **不跑** |
| `C:\\Program Files` 兜底 | `vendor/cdp.mjs:17-19` | **不会**。只在 Windows 分支上用；Linux 走 `:33` 的 `/usr/bin/*` |
| 文件权限位 | `ls -l` 显示部分 `.mjs` 是 `-rwxr-xr-x`，部分是 `-rw-r--r--` | **不会**。workflow 里一律 `node <file>`，从不依赖可执行位 |

**结论：闸门的平台假设在 CI 上是安全的。** 唯一需要动的不是闸门，是 §2.1 那条 README 引用。

---

## 12. 待办清单（按顺序）

1. **🔴 修 `README.md:546` / `README-EN.md:539` 的 `deliverables/59-scratch/` 引用**（§2.1）。
   不改它，`static` 与 `check-docs --selftest` 两盏灯每天都红。
2. **✅ 已交付 `prototypes/_build/check-stale-git.mjs`**（190 行，含 shallow 自检；
   HEAD 上 exit 0 / 变异后 exit 1 / depth-1 上 exit 2，四条自证见 §3.5）。
   **别忘 `git add` 它** —— 跟 §2.2 那两件一样，本机绿不代表 clone 里有。
3. **`git add prototypes/_build/probe-ui.mjs prototypes/_build/check-ui-copy.mjs`**（§2.2）。
   不 add 这两个，`static` 与 `browser` 两个 job 是空的。
4. **加 `.github/workflows/ci.yml`**（§7 全文）与 `.github/workflows/ci-nightly.yml`（§9）。
5. **在分支上开 PR 跑第一遍**（§11.2），按 §11.3 的表逐盏灯对账。
6. **做 §11.4 的七个变异**，七条全中才算 workflow 被证明过。
7. （可选，后续轮）把 `check-ui-copy.mjs --selftest` 真正实现，或者把
   `:17` 那行用法注释删掉——现在它是一句假话（§2.3）。
8. （可选，后续轮）修 4 个闸门的 `decodeURIComponent`（§2.4）——不是 CI 的活，
   但含空格路径的维护者会踩，且踩到时的症状是**假绿**。

---

## 附录 A：所有实测命令与输出（可复现）

```text
# 干净 clone
$ git clone --quiet --depth 1 file:///D:/Web/style clonetest   → 345 MiB, 2251 文件

# 七个静态闸门（逐个跑，记录退出码）
check-anchors        EXIT=0  3163ms
check-texture        EXIT=0  3299ms
check-twolines       EXIT=0  2371ms
check-contract       EXIT=0  4241ms
check-prompts        EXIT=0  3226ms
check-docs           EXIT=1  3548ms   ← 真缺陷（§2.1）
check-stale          EXIT=1  2913ms   ← 31/31 假陈旧（§3.1）
verify-prototype     EXIT=1  5271ms   ← 设计值（S08）
check-docs --selftest EXIT=1 12880ms  ← 连带红（同一个真缺陷）

# 修掉 §2.1 那处引用之后
$ node prototypes/_build/check-docs.mjs --quiet
README.md: 0 FAIL / 0 WARN / 13 PASS
$ node prototypes/_build/check-docs.mjs --selftest
✓ 自测通过：三处已知腐化 + 七个用例全部符合预期
EXIT=0

# mtime 恢复实验（证明 check-stale 的判据问错了问题）
$ node restore-mtime.mjs      → restored 2251 files, 8784 ms
$ node prototypes/_build/check-stale.mjs
     S13  index.html 落后 15221 分钟
     S08  index.html 落后 13220 分钟
     … 仍 11+ 项 ← 恢复 mtime 也救不了

# commit 判据（已交付的 check-stale-git.mjs）
$ node prototypes/_build/check-stale-git.mjs            # HEAD，95 commit
闸门陈旧度（commit 判据）：检查 31 个入口 / 历史 95 个 commit
  ✓ 全部新鲜                                            EXIT=0   8000ms

# 独立交叉验证（另一套代码：逐文件 git log -1，比较绝对时间戳）
checked 31 stale 0                                      ← 与上一条一致

# 变异测试：改 S05/style.css 不重渲、只提交
$ node prototypes/_build/check-stale-git.mjs
  ⚠️ 1 项陈旧（改了源、没重渲就提交）：
     S05  style.css  落后 95 个 commit
                                                        EXIT=1

# 势头不对时它会自己说"判不了"，而不是报绿
$ （depth-1 clone，shallow=true，commit 数=1）
陈旧度闸门（commit 判据）无法判定：历史不完整（shallow=true，commit 数=1）。
  … 修法：checkout 时用 fetch-depth: 0
                                                        EXIT=2

# 含空格路径
$ node probe.mjs（在 "sp ace/_build/" 下）
check-stale 风格 P = C:/Users/.../Temp/sp%20ace/     ← %20 未解码

# 浏览器侧（干净 clone）
probe-ui            8 PASS / 0 FAIL   105723ms
probe-ui            8 PASS / 0 FAIL   113504ms
probe-ui            8 PASS / 0 FAIL    80232ms   ← 最终预演（已 add 三个新文件）
probe-ui --selftest 7/7 变异被识别     386914ms
inspect.mjs 1案×2视口（--out 临时目录）  38345ms / 45795ms, 仓库无变化

# 三个"看起来该跑但其实不该跑"的
render-scheme.mjs  → grep -ci python = 0（题干说的 Python 依赖不成立）
shot.mjs           → grep -ci python = 21（Python 在这里）
check-ui-copy --selftest → grep -c selftest = 1（只有注释，参数未实现）

# 最终预演：把 workflow 的 18 个 step 抽成脚本，在干净 clone 里逐条跑
s00 Node 自证              EXIT=0
s01..s09 九闸门+selftest    EXIT=0 ×9
s10 树不得变脏             EXIT=0  ✓ 工作树干净
s11 check-stale-git        EXIT=0  ✓ 全部新鲜
s12 Chrome 自检            EXIT=0  （--version 打印版本）
s13 渲染冒烟               EXIT=0  ✓ 2 视口 / 0 报错 / 5 张截图   45795ms
s14 probe-ui --verbose     EXIT=0  8 PASS / 0 FAIL               80232ms
s15 verify-prototype       EXIT=0  达标 29/30（设计值）
s16 check-stale.mjs        EXIT=0  3 条 ::notice::
```
