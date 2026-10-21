# 39 · 工具链可复现性审查

> 审查对象：`prototypes/_build/` 全部脚本 + 各案 `build/` 脚本 + `SHOT-README.md` + `_CONTRACT.md` §9/§10 + 仓库根 `.gitignore`
> 审查目标：换一台干净机器，`prototypes/_build/` 能否重跑出逐字节相同结果；哪些依赖没写进文档。
> 标注约定：**【实跑】** = 本轮实际执行过命令并留证；**【只读】** = 仅读源码/文档推断。

## 0 复核基线与本次实跑

**本机环境（2026-10-22 实测）**：

| 项 | 值 | 来源 |
| --- | --- | --- |
| Node | **v26.12.1** | 【实跑】`node -v` |
| Python | **3.12.14** + Pillow **12.3.0** | 【实跑】`import PIL` |
| Chrome | **155.0.8059.85** | 【实跑】读 `chrome.exe` 的 `ProductVersion` |
| 仓库工作树 | `git status --short` **为空** | 【实跑】 |
| `tools/` | 磁盘上 **233 个文件**，`git ls-files -- tools` = **0** | 【实跑】 |
| `prototypes/*/build/` | `git ls-files` = **0**；磁盘上 24/30 案有 `build/` | 【实跑】 |
| `.inspect/report.json` | **30/30 案齐全**，`git ls-files` = **321 个 .inspect 文件（入库）** | 【实跑】 |
| `prototypes/_fonts/` | **925 个文件（入库）** | 【实跑】 |

**本次实跑清单**（全部只读；输出只写 `deliverables/39-scratch/`）：

| 编号 | 跑了什么 | 结果 |
| --- | --- | --- |
| R1 | `shot.mjs S14 --out 39-scratch/shot-run1 --widths 1440,768,390` | exit 0，失败 0 档；页高 7569 / 9250 / 12161，屏数 9/11/14，三档 `校准=ok` |
| R2 | 同一条命令再跑一次（`shot-run2`） | exit 0；页高/屏数/切片数与 R1 **完全一致**；**48 个产物里 23 个 PNG 字节不同** |
| R3 | 两轮 `report.json` 去易变字段后逐叶子比较 | **仍有 148 个叶子字段不同**，全部是像素统计量（下表 §7.1） |
| R4 | 8 个主机 + 3 个主机的网络可达性（Node `fetch`，带/不带 `--use-system-ca`） | 见 §4；**§10 的表有一处重大过期、一处前提缺失** |
| R5 | 复刻 `fetch-scheme-assets.mjs` 的 `api()` → `download()` 两步（不写盘） | **Wikimedia 现在可用**：检索 HTTP 200 / 10 命中；缩略图下载 3/4 成功（212 623 B、343 521 B、633 491 B） |
| R6 | `git check-ignore -v` 逐路径核 `.gitignore` 覆盖 | 见 §5；**`.shot` 与 `.shots` 未被忽略，`.shot-test/` 被忽略** |

**抢救自 `_crit14/` 的上一轮成果**（该目录本轮仍在，122 个文件；下面凡用到的数字都已内联，不再依赖它存在）：
`diff-r1r2.txt`（S17 两轮 report.json 差异 17 类）、`corpus.txt`（语料 220 → 189，丢 31 条 = 14.1%）、`assign-dry.txt`（10 案分配明细）、`encdet.txt`（Pillow 写两次逐字节一致 / autocontrast / LANCZOS / `default_rng` 受前序抽样影响）、`stale-now.txt`（`check-stale.mjs` 30 案全新鲜）。

---

## 1 脚本清单表

**`prototypes/_build/` 全部 20 个文件**（18 个脚本 + `SHOT-README.md` + 2 个被忽略的 `_gate-*.txt`；脚本里 16 个 `.mjs`/`.py` 受跟踪，`_gate-*.txt` 不跟踪）。「§10 已记？」= `_CONTRACT.md` §10 的环境事实表或素材脚本清单里有没有它。

| 脚本 | 语言 | 外部依赖 | 硬编码路径 | 需联网？ | 输入在仓库里？ | §10 已记？ | 可复现？ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `render-scheme.mjs` | mjs | Node≥18、**`tools/taste-skill/…/inspect.mjs`（0 受跟踪文件）**、Chrome（CDP） | **L16 `const ROOT='D:/Web/style'` 裸**，无 env / 无参数 | 否 | **否**（工具不在库） | **未记**（§3 只写"唯一命令，不许换"） | **否**，换机第 1 步断 |
| `verify-prototype.mjs` | mjs | 仅 `node:fs`/`node:path` | **L12 `D:/Web/style` 裸** | 否 | ✓（`.inspect/` 入库） | 未记 | 否（仅路径）；L110 无 BOM 剥离 |
| `summarize-all.mjs` | mjs | 仅 `node:fs`/`node:path` | **L12** | 否 | ✓ | 未记 | 否（仅路径）；L36 无 BOM 剥离 |
| `collect-schemes.mjs` | mjs | 仅 `node:fs`/`node:path` | **L15** | 否 | ✓（`_specs/` 与 `.inspect/` 入库） | §9.17 只给了命令链 | 否（路径）；`readdirSync` **已排序** ✓；输出含 `at` ⇒ `data.js` 不可复现 |
| `check-stale.mjs` | mjs | 仅 `node:fs`/`node:path` | **无**——L16 用 `import.meta.url` 推根 | 否 | ✓ | **§9.17 已记** | **是**（`_build` 里唯一换机不断于路径的脚本）；L16 `.pathname` 未 `decodeURIComponent`，路径含空格/中文会断 |
| `shot.mjs` | mjs | Node≥18、Chrome（CLI）、Python+Pillow（子进程）、**`powershell.exe`**（取 Chrome 版本） | **L39 Chrome、L40 dsh-runtime python 绝对路径**（**有 `--chrome`/`--python` 兜底**）；`--root` 默认 L37 由 `import.meta.url` 推 ✓ | 否（只 `127.0.0.1`） | ✓ | SHOT-README §7.8/§8 记了 Chrome+Pillow 与版本；**§10 完全没提 shot.mjs** | 几何**是**（R1/R2 完全一致）；`report.json` **否**（148 个统计叶子字段漂移） |
| `shot-page.py` | py | Pillow | **无** | 否 | ✓ | SHOT-README §6 已记 | **是**（同 Pillow 版本内逐字节稳定，`encdet` 已证） |
| `make-textures.py` | py | Pillow | **无**（`outDir` 来自 job.json） | 否 | **否**——第 5 行等 12 份 `build/texture-job.json` 全被忽略 | §10 已记"参数写在 `build/texture-job.json`，可逐字节复算"——**但没写那份文件不入库** | 脚本**是**，输入**否** ⇒ 净结果不可复算 |
| `assign-assets.mjs` | mjs | Node≥18、`images-api.nasa.gov`、Python+Pillow（`spawnSync`） | **L23 ROOT / L25 PY / L168 UA** 三处裸 | **是**（NASA） | **否**：语料含 `build/raw`（忽略）⇒ 220→189 | §10 已记（作为"兜底"） | 否（路径 + `readdirSync` 未排序 + PY 缺失时**静默**） |
| `fetch-scheme-assets.mjs` | mjs | Node≥18、`commons.wikimedia.org`、Python+Pillow | **L16 / L18 / L19** 三处裸 | **是** | 产物入库，**检索结果不可复现** | §10 已记，且**已过期**（记为"全不可用"，R5 实测 200） | 否（路径 + 搜索排序 + 网络） |
| `fetch-fonts.mjs` | mjs | Node≥18、`fonts.googleapis.com`/`fonts.gstatic.com`、**必须 `--use-system-ca`** | **L20 `resolve('D:/Web/style')`**（等价写死） | **是** | 产物 `_fonts/` 入库 ⇒ **不需重跑** | §4/§8.3/§9.3 记了 `--use-system-ca`；§10 记"fonts 正常"却**没记证书前提** | 部分：不重跑 ✓；重跑需 CA 且上游 css2 内容会变 |
| `fetch-css-fonts.mjs` | mjs | Node≥18、`cdn.jsdelivr.net`（S04 的 LXGW） | **L12** | **是**（R4 实测 jsdelivr 200 / 758 ms） | 产物入库 | **§10 完全没提 jsdelivr，也没提这个脚本** | 部分（同上一行） |
| `selfhost-fonts.mjs` | mjs | 无网络、无第三方 | **L16** | 否 | ✓（`_fonts/css/*.css` 入库） | 未记（只在自身头注释说明） | 否（路径）；**会改 8 案 `index.html`** |
| `write-credits.mjs` | mjs | 无 | **L13** | 否 | **部分**：S01 的 `credits.json` 只在被忽略的 `build/raw/`；S04/S07/S08/S17 **两处都没有** | §9.5 已记"唯一一个写 CREDITS.md 的"——**实际 3 个写入者** | 否（路径 + 输入缺失 + L47 未排序） |
| `extract-specs.mjs` | mjs | 无 | **L10 `resolve('D:/Web/style')`** | 否 | ✓ `deliverables/04\|05\|06` 入库 | 未记 | 否（仅路径）；输入齐、无时间依赖，**改根即可用** |
| `remake-s02-leak.py` | py | numpy + Pillow | **无**（L35 `Path(__file__)` 推根 ✓） | 否 | 输入是原型里的 PNG（入库） | 未记 | 脚本**是**（幂等）；但**原地覆盖 `assets/`**，见 §2-B18 |
| `_s03-probe.mjs` | mjs | **`tools/…/lib/cdp.mjs`（仓库外）**、Chrome | **L8 ROOT / L8 PORT=9179 写死** | 否 | **否**（模块不在库） | **未记**（§10 脚本清单里没有它） | 否 |
| `S13-blind-debossed-dispatch/_fillmap.mjs` | mjs | **`tools/…/lib/cdp.mjs`**、Chrome | **L9 ROOT** | 否 | **否** | 未记 | 否；且 L77 `Math.min(11, …)` **静默砍到 11 屏** |
| `S21-interlocking-release-book/build/pick-and-bake.py` | py | numpy + Pillow（WEBP/AVIF 编码器） | **L37 `D:\Web\style\prototypes\S21-…` 写死** | 否 | 输入 `assets/_cand/`（未被忽略）⇒ ✓ | 未记 | 否（路径）；`assert 两点阶` 中途失败会**留下半写状态**；默认删 `pl-0N.png` |
| 各案 `assets/fetch-assets.ps1`（≥14 份） | ps1 | PowerShell、`commons.wikimedia.org` | **每份都写死 `$assets='D:\Web\style\…'`**（如 S02 L9、S06 L15、S13 L8、S21 L10、S14 L27） | **是** | 产物入库 | 未记 | 部分：产物在，重跑随搜索排序变化 |

**三条统计**（本轮实跑/只读得出）：

1. **`_build` 里 16 个脚本中，12 个把仓库根写成 `D:/Web/style` 字面量**（`render-scheme`、`verify-prototype`、`summarize-all`、`collect-schemes`、`assign-assets`、`fetch-scheme-assets`、`fetch-fonts`、`fetch-css-fonts`、`selfhost-fonts`、`write-credits`、`extract-specs`、`_s03-probe`）。
   **只有 1 个（`check-stale.mjs`）用 `import.meta.url` 推根**，2 个用 `Path(__file__)`（`remake-s02-leak.py`）、1 个用 `resolve(HERE,'..','..')`（`shot.mjs`）。
2. **12 处裸的 `D:/Web/style` 里，0 处有环境变量兜底、0 处有 `--root` 参数**。相比之下 `shot.mjs` 对两个可执行文件有 `--chrome/--python` 兜底 ⇒ **同一个仓库里，只有截图工具做了可移植性设计**。
3. **`§10` 的"网络可达性表 + 素材脚本清单"只覆盖 3 个脚本**（`fetch-scheme-assets.mjs`、`assign-assets.mjs`、`make-textures.py`）；`_build` 里另外 13 个脚本、以及各案 14 份 `fetch-assets.ps1`、`S13/_fillmap.mjs`、`S21/pick-and-bake.py` **在 §10 里一个字都没有**。

## 2 换机断点清单

严重度：**P0** = 干净克隆上该功能=不可用；**P1** = 报错信息误导或静默失败；**P2** = 会跑但产物与仓库里的不一致；**P3** = 只影响观感/整洁。

### B01【P0｜`render-scheme.mjs` L16】契约 §3 强制的那条"唯一渲染命令"在干净机器上第一步就断

- **在哪一步断**：脚本第 20 行 `join(ROOT,'prototypes',name)` 之后、第 22 行 `existsSync(html)`。
- **为什么**：`const ROOT = 'D:/Web/style'`（L16）是字面量，没有 env、没有参数、没有 `import.meta.url` 兜底。`_CONTRACT.md` §3 又把这个脚本写成"**唯一，不许换**"的渲染入口。
- **用户会看到什么错误**：`没有 index.html: D:/Web/style/prototypes/S01-red-wedge-broadsheet/index.html`（exit 2）。**这句话指向的是一棵他机器上不存在的树**，而他的仓库就在当前目录 —— 报错本身把他带偏。
- **严重度**：P0（22 个新原型的施工规程都指向这条命令）。
- **可执行修法**：把 L16 换成 `check-stale.mjs` L16 那种写法，并打印解析结果：
  ```js
  import { fileURLToPath } from 'node:url';
  const ROOT = process.env.PROTO_ROOT || fileURLToPath(new URL('../..', import.meta.url));
  console.log('ROOT = ' + ROOT);   // 让"检查了哪棵树"变成可见事实
  ```
  同时在 `_CONTRACT.md` §3 的命令块前补一行"本命令只在仓库根为本脚本的祖父目录时可用"。

### B02【P0｜`render-scheme.mjs` L17 → L34】依赖 `tools/`，而 `tools/` 有 0 个受跟踪文件

- **在哪一步断**：L29 `spawnSync(process.execPath, [INSPECT, …])` —— `INSPECT` 指向不存在**的** `tools/taste-skill/skills/taste-skill/scripts/inspect.mjs`。
- **为什么**：`.gitignore` L2 `tools/` 排除整个目录（【实跑】`git ls-files -- tools` = 0 行、`git check-ignore -v` 命中 `.gitignore:2:tools/`），磁盘上它只有 233 个文件。LICENSE L46 已声明 taste-skill 是 MIT 且给出上游 `https://github.com/Leonxlnx/taste-skill`，**但仓库没有任何一处说"怎么把它弄回来"**。
- **用户会看到什么错误**：先是一大段 `Error: Cannot find module 'D:\Web\style\tools\taste-skill\…\inspect.mjs'`（子进程原样透传），紧接着 L34 打印 `没有生成 report.json —— 渲染失败。` 并 exit 3。**两句话拼在一起，看不出根因是"工具没装"。** 对比：`shot.mjs` L856-859 在启动前显式 `existsSync` 三个依赖并 `die('找不到 Chrome: …')` —— `render-scheme.mjs` 缺这一层。
- **严重度**：P0。
- **可执行修法**：① 在 L28 之前加前置断言 `if (!existsSync(INSPECT)) { console.error('缺渲染引擎：' + INSPECT + '\n  tools/ 不在仓库里（.gitignore L2）。取法：git clone --depth 1 https://github.com/Leonxlnx/taste-skill tools/taste-skill'); process.exit(4); }`；② 在 README「渲染与验收」与 `_CONTRACT.md` §3 各补一行同样的 clone 命令。

### B03【P1｜`render-scheme.mjs` L31】`cwd: ROOT` 会在"另一份同路径仓库"上静默跑错树

- **在哪一步断**：不断 —— 更糟。
- **为什么**：L31 把子进程 `cwd` 设成 `ROOT`（契约 §3 说明这是为了让 `../_fonts/` 取得到）。一旦按 B01 改 ROOT，这个行为是对的；但**保持现状**时，如果一个操作者的机器上恰好**也存在** `D:/Web/style`（另一份副本、或旧快照），脚本会去渲染**那一份**，而报错/产物看起来完全正常。
  "更糟"这个词不是我推测的：`deliverables/34-critique-doc-accuracy.md` §C2 对同型的 `verify-prototype.mjs` 写下了同一句判断。
- **用户会看到什么错误**：没有错误。他会以为"我改了原型但页面没变"。
- **严重度**：P1（静默错误）。
- **可执行修法**：同 B01；另外在 `render-scheme.mjs` 里断言目标文件在 ROOT 之下：`if (!resolve(dir).startsWith(ROOT + sep)) { die('目标不在 ROOT 内：' + dir); }`。

### B04【P1｜`shot.mjs` L39】Chrome 默认路径是机器绑定，但**有**兜底

- **在哪一步断**：L858 `if (!existsSync(opt.chrome)) die('找不到 Chrome: ' + opt.chrome);`
- **为什么**：L39 写死 `C:\Program Files\Google\Chrome\Application\chrome.exe`。Chrome 装在用户目录（`%LOCALAPPDATA%\…`）、或换 Edge/Chromium、或非 Windows 平台，都不匹配。**区别在于 `--chrome PATH` 是存在的**（`SHOT-README` §选项 L53、§7.8 明写"可用 `--chrome`/`--python` 覆盖"）。
- **用户会看到什么错误**：`找不到 Chrome: C:\Program Files\Google\Chrome\Application\chrome.exe`（exit 2）——信息准确、有解，只是解在文档里而不在报错里。
- **严重度**：P1（P0 的严重场景是操作者不知道 `--chrome`，直接判定"这工具在我机器上不能用"）。
- **可执行修法**：① 报错文本里带上覆盖提示：`die('找不到 Chrome: …\n  用 --chrome <路径> 指定，或设环境变量 SHOT_CHROME');` ② L39 改成 `chrome: process.env.SHOT_CHROME || 'C:\\Program Files\\…'`，并在机器上没有该路径时依次探测 `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`、`where.exe chrome`、`chromium`、`google-chrome`。

### B05【P0｜`shot.mjs` L40】Python 默认路径是**本会话运行时私有路径**，同一路径还被写进了契约

- **在哪一步断**：L859 `if (!existsSync(opt.python)) die('找不到 python: ' + opt.python);`
- **为什么**：L40 是 `C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe` —— 这是 **DSH 会话运行时的私有路径**，不是任何正常装机形态。它同时被抄进 `_CONTRACT.md` §5 L86，即**施工规程把这条路径当作"Pillow 就在这儿"教给了 22 个原型建设者**。有 `--python` 兜底。
- **用户会看到什么错误**：`找不到 python: C:\Users\Administrator\.dsh\…\python.exe`（exit 2）。
- **严重度**：P0（错误信息里出现 `Administrator\.dsh\dsh-runtimes` 会让任何外部读者立刻判断"这工具是给一台特定机器写的"）。
- **可执行修法**：① L40 改为 `python: process.env.SHOT_PYTHON || (process.platform === 'win32' ? 'python.exe' : 'python3')`，并在 L859 前置一句 `--python "…"` 提示；② `_CONTRACT.md` §5 L85-89 把那条字面路径换掉，改成"用 `python -c "import PIL, numpy; print(PIL.__version__)"` 确认环境"，只保留版本要求。

### B06【P3｜`shot.mjs` L903】用 `powershell.exe` 取 Chrome 版本 —— 非 Windows 上降级正确，但**取证字段会静默变 null**

- **在哪一步断**：不断。
- **为什么**：`execFileSync('powershell.exe', …)` 在 Linux/macOS 上 ENOENT，但 L906 的 `catch` 把它变成 `report.warnings` 一条 + `report.chromeVersion = null`。**降级是对的**（这点做得比其它脚本好），问题是：`chromeVersion` 是这份报告里"像素结论属于哪个渲染器"的唯一凭证（SHOT-README §3 的 `+16/+95` 常量、§8 的实测表都以 `Chrome 155.0.8059.84` 署名）。
- **用户会看到什么错误**：只有 `warnings` 里一行 `拿 Chrome 版本失败: spawnSync powershell.exe ENOENT`。
- **严重度**：P3（不影响出图，影响"这份像素证据到底出自哪个 Chrome"的可核性）。
- **可执行修法**：加一条跨平台优先路径：先 `execFileSync(opt.chrome, ['--version'])` 解析 `Chrome 155.0.8059.85`，只在 `process.platform === 'win32'` 时回退到现在的 PowerShell 分支。

### B07【P0｜`_s03-probe.mjs` L6】import 未入库的 `cdp.mjs`

- **在哪一步断**：模块解析期（Node 启动的第一件事），早于任何业务逻辑。
- **为什么**：`import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs'` —— 相对路径本身可移植，但目标是 0 受跟踪文件。
- **用户会看到什么错误**：`Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'D:\Web\style\tools\taste-skill\…\lib\cdp.mjs'`，进程 exit 1。
- **严重度**：P0（但只影响想复现 S03 那次读数测量的人）。
- **可执行修法**：同 B02；另外 L8 `PORT = 9179` 写死，改成 `listen(0)`（`S13/_fillmap.mjs` L26 就是这么做的，可直接照抄），否则第二次并发运行直接 `EADDRINUSE`。

### B08【P0｜`S03-long-exposure-observatory/check-palette.mjs` L4】**最坏形式**：`file:///D:/Web/style/…` 绝对 URL import

- **在哪一步断**：模块解析期。
- **为什么**：`import { colourFamily } from "file:///D:/Web/style/tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs";` —— 把**绝对路径写成了 URL 字面量**。这是全仓唯一一处这种写法，比 B07 更硬：它连"相对当前文件"的机会都没有。
- **用户会看到什么错误**：`ERR_UNSUPPORTED_ESM_URL_SCHEME` 或 `ERR_MODULE_NOT_FOUND`，exit 1。
- **严重度**：P0。
- **可执行修法**：改成 `new URL('../../tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs', import.meta.url)`。（该文件在 `prototypes/S03-…/` 下，所以是 `../../tools/…`。）

### B09【P1｜`S03-long-exposure-observatory/verify.mjs` L293】写进被 `.gitignore` 排除、且克隆里不存在的目录

- **在哪一步断**：`page.screenshot({ path: 'D:/Web/style/deliverables/tool-runs/S03-area-full.png', fullPage: true })`。
- **为什么**：两重问题叠加：① 绝对路径；② 目标是 `deliverables/tool-runs/`，被 `.gitignore` L14 排除（【实跑】`git check-ignore -v deliverables/tool-runs/x.txt` → `.gitignore:14`），**干净克隆里这个目录不存在**，截图 API 不会自建父目录。
- **用户会看到什么错误**：`ENOENT: no such file or directory, open 'D:\Web\style\deliverables\tool-runs\S03-area-full.png'`。
- **严重度**：P1。
- **可执行修法**：`const out = join(ROOT, 'deliverables/tool-runs'); mkdirSync(out, { recursive: true });`，其中 `ROOT` 用 `fileURLToPath(new URL('..', import.meta.url))`。或者直接输出到该案自己的 `build/` 下。

### B10【P2｜`assign-assets.mjs` L381】**静默失败**：Python 缺失时纹理不生成，随后仍写出"可逐字节复算"的署名表

- **在哪一步断**：不断。
- **为什么**：L381 `spawnSync(PY, [make-textures.py, jobFile], { stdio: 'inherit' })` —— **返回值被完全丢弃，没有查 `.status`、也没有查 `.error`**。若 `PY`（L25 写死的 dsh 路径）不存在，`spawnSync` 返回 `{ error: ENOENT }`，脚本继续往下：L386 `gen.length = 0`，L409 仍然往 `CREDITS.md` 里写那 3 行"这些是代码生成的纹理……**按 `prototypes/_build/make-textures.py` 与 `build/texture-job.json` 可逐字节复算，无第三方权利**"，L419 仍报 `纹理 0 个`。
  **对照组**：`fetch-scheme-assets.mjs` L247-248 **查了** status 并打印 `! 纹理生成失败，exit=null`。同一个调用在两个脚本里一个有守卫一个没有。
- **用户会看到什么错误**：**没有任何错误**。他会得到一份自称"有程序化纹理"的 `CREDITS.md`，而 `assets/` 里一个 `texture-*.png` 都没有。这条直接落在 LICENSE 的"无第三方权利"依据上。
- **严重度**：P0（对"想用它的人"：署名表与实际内容不符；对"想复现的人"：产物不全）。
- **可执行修法**：`const r = spawnSync(PY, [...], { stdio: 'inherit' }); if (r.error || r.status !== 0) throw new Error('make-textures.py 失败: ' + (r.error || 'exit ' + r.status));`，并在写 `CREDITS.md` 之前断言 `gen.length === cfg.textures.length`。

### B11【P2｜`assign-assets.mjs` L326 + L212/218/296/386/417】`readdirSync` 未排序 → 换文件系统后选出的 6 张照片可能不同

- **在哪一步断**：不断，但输出会变。
- **为什么**：`corpus` 的构建顺序 = `readdirSync` 的返回顺序（L212 扫案目录、L218 扫每个素材根），`cands` 的排序 L326 是 `(b.c.raw - a.c.raw) || (b.c.bytes - a.c.bytes)` —— **不是全序**，并列项（同 `raw`、同 `bytes`）由 V8 的稳定排序退回插入序。NTFS 按名字索引返回、ext4 按哈希返回 ⇒ **同一份代码在另一台机器上会挑到不同的候选**。`own`（L296）、`gen`（L386）、`imgs`（L417）同样未排序，直接决定 `credits.json` 与 `CREDITS.md` 的行序。
  **口径不一致的证据**：同一套脚本里 `collect-schemes.mjs` L167-168、`summarize-all.mjs` L17-20、`write-credits.mjs` L31-37、`verify-prototype.mjs` L142-143 **都** `.sort()` 了，只有 `assign-assets.mjs` 与 `write-credits.mjs` L47 没有。
- **用户会看到什么错误**：没有错误。CREDITS.md 的行序变化，选中的图片可能在极端并列时变化。
- **严重度**：P2。
- **可执行修法**：L326 加兜底 `|| a.path.localeCompare(b.path)`；L212/218/296/386/417 与 `write-credits.mjs` L47 各加 `.sort()`。

### B12【P0｜`.gitignore` L7 + `make-textures.py` 的输入】"可逐字节复算"这句在克隆上核不了

- **在哪一步断**：`make-textures.py` 的**调用方**断 —— 它自己没有默认输入（L336 `if len(sys.argv) < 2: print('用法: …')`）。
- **为什么**：`.gitignore` L7 `prototypes/*/build/`（【实跑】`git ls-files -- 'prototypes/*/build/*'` = 0），而 `texture-job.json` 由 `assign-assets.mjs` L380 / `fetch-scheme-assets.mjs` L246 写在 `build/` 下。磁盘上**只有 12/30 案**有它（S18–S24、S26–S30）。
- **用户会看到什么错误**：跑 `python make-textures.py` 时不报错（它只是缺参数），报错的是没有任何参数可给 —— 他会发现**其余 18 案的纹理参数在仓库里不存在**。而 README L164 与两份 `CREDITS.md` 模板都写着"可逐字节复算，无第三方权利"。
- **严重度**：P0（这是 LICENSE 划定 MIT 范围的一句依据）。
- **可执行修法**：把 12 份 `texture-job.json` 复制到 `prototypes/_build/textures/<Sxx>.json`（不受忽略），并把 `assign-assets.mjs` L379 / `fetch-scheme-assets.mjs` L245 的 `jobFile` 改写到那里；`make-textures.py` 增加 `--jobs-dir prototypes/_build/textures` 模式。README L166 已经提出了同样的方案，只差执行。

### B13【P2｜`write-credits.mjs` L19 的 5 条候选路径里 4 条在克隆上恒不存在】

- **在哪一步断**：不断 —— 走进 L73-76 的"未闭合的缺口"分支。
- **为什么**：5 条候选是 `assets/credits.json`、`build/raw/credits.json`、`build/raw-s01/credits.json`、`build/credits.json`、`build/raw/credits-raw.json`，**后 4 条全在被忽略的 `build/` 下**。逐案核（【实跑】）：

  | 情形 | 案 | 数量 |
  | --- | --- | --- |
  | `assets/credits.json` 在库 | 除下列 5 案外全部 | **25/30** |
  | 只有被忽略的 `build/` 里有 | **S01**（`build/raw/` + 另一处，共 2 份） | **1/30** |
  | 两处都没有 | **S04 / S07 / S08 / S17** | **4/30** |

  也就是说：**S01 的 `assets/CREDITS.md` 是从仓库里不存在的文件生成出来的**，谁都无法从仓库复核它的 7 行署名。
- **用户会看到什么错误**：S01 若有人手工删掉 `CREDITS.md` 再跑一次修不回来（会得到 L73 那段"未闭合的缺口"文本）。**当前不会造成破坏**，因为 L36 只处理"缺 CREDITS.md"的目录 —— S01 有，所以会被跳过。
- **严重度**：P2。
- **可执行修法**：把 S01 的 `build/raw/credits.json` 复制进 `prototypes/S01-…/assets/credits.json`（它不该被忽略，`assets/` 是交付面）；对 S04/S07/S08/S17 四案，README L161 已承认缺记录，应在案内放一份 `assets/CREDITS.md` 显式声明"署名不可考，不得对外复用"（README 已经这么写了，只是没有机器可读的那份）。

### B14【P2｜`.gitignore` L14 `deliverables/tool-runs/`】多份审查报告把证据指向克隆里不存在的图

- **在哪一步断**：不断，但引用无法复核。
- **为什么**：`deliverables/16-render-look-audit.md:30` 直接引用 `D:\Web\style\deliverables\tool-runs\S04-inspect-shots\full-1440.png`；`.gitignore` L14 排除整个目录。**报告入库、证据不入库** —— 正是契约 §9.18（"存在临时目录里不算存证"）的同型问题，只不过这次存在一个**被忽略的正式目录**里。
- **用户会看到什么错误**：按图索骥找不到文件。
- **严重度**：P2（对"想核证据的人"是 P1，因为他会怀疑报告在编）。
- **可执行修法**：要么把关键图（每案 1 张首屏 + 1 张整页，约 60 张 JPG）移到 `deliverables/figures/` 并取消忽略，要么把这些图里的数字全部内联进 md（§9.18 要求的做法）。

### B15【P3｜`shot.mjs` 默认 `--out .shot` / README L141 的 `--out .shots`】**两个都没被 `.gitignore` 覆盖**

- **在哪一步断**：不断。
- **为什么**：【实跑】`git check-ignore -v .shot/x.png` → 无命中（TRACKABLE）；`.shots/x.png` → 无命中；而 `.shot-test/x.png` → 命中 `.gitignore:45`。`.gitignore` 只写了 `.shot-test/`，`shot.mjs` 自己的默认值是 `.shot`（L102），README L141 的示例用 `.shots` —— **三个名字互不相同，只有最不常用的那个被忽略了**。
- **用户会看到什么错误**：没有错误，只是跑完 `shot.mjs` 后 `git status` 里多出一堆 PNG（S14 单案 48 个文件 ≈ 7 MB）。
- **严重度**：P3。
- **可执行修法**：`.gitignore` 在 L45 旁加 `.shot/` 与 `.shots/`；README L141 统一改成 `--out .shot-test`。

### B16【P3｜`selfhost-fonts.mjs` L71 的备份守卫只写一次，永不刷新】

- **在哪一步断**：不断。
- **为什么**：`if (!existsSync(html + '.bak-fonts')) copyFileSync(html, html + '.bak-fonts')` —— 备份只建一次。磁盘上现在有 **8 份** `index.html.bak-fonts`（S03/S04/S07/S08/S13/S17/S21/S25），且 `.gitignore` L24 `*.bak-fonts` 使它们不入库 ⇒ **克隆里一份都没有**。回滚路径依赖一个既不刷新、也不入库的文件。
- **用户会看到什么错误**：没有错误；他只是在需要回滚时发现备份是第一次运行时的旧版本（或不存在）。
- **严重度**：P3。
- **可执行修法**：备份名带内容哈希（`index.html.bak-fonts-<sha1 前 8 位>`），或干脆不写备份、把"改前 sha256"写进 stdout 让操作者自己 `git checkout` 回滚（仓库就是版本控制）。

### B17【P3｜`_s03-probe.mjs` L8 PORT=9179 写死】第二次并发运行必 `EADDRINUSE`

- **在哪一步断**：L21 `server.listen(PORT,'127.0.0.1',r)`。
- **为什么**：固定端口。对比 `S13/_fillmap.mjs` L26 用 `listen(0)` + L27 从 `server.address().port` 拼 URL —— 同仓里已经有正确写法。
- **用户会看到什么错误**：`Error: listen EADDRINUSE: address already in use 127.0.0.1:9179`，且**未捕获**（`await new Promise(...)` 的 reject 会直接结束进程）。
- **严重度**：P3。
- **可执行修法**：照抄 `_fillmap.mjs` L26-27。

### B18【P2｜`remake-s02-leak.py` L80 + `S21/pick-and-bake.py` L155/164/133-138】两个"确定性重做"脚本都会**原地覆盖交付面**，且会在中途失败

- **在哪一步断**：`remake-s02-leak.py` 不断（输入是自家 `assets/` 的 PNG）；`pick-and-bake.py` 在 L155/L164 的 `assert len(cols) == 2` 处断。
- **为什么**：
  - `remake-s02-leak.py` L80 直接 `Image.fromarray(out,"RGBA").save(ASSET)` 覆盖 `S02-…/assets/leak-patch@2x.png`；备份守卫见 B16 同型（L56 `if not BACKUP.exists()`）。脚本本身**幂等**（它整体重写 RGB、只保留原 alpha），但**备份 `leak-patch@2x.ivory-backup.png`（26 958 B）落在 `assets/` 里且未被忽略** —— 它会被 `verify-prototype.mjs` L82 的 `imgExt` 当图片资产计数、也会进 `assign-assets.mjs` 的语料候选。
  - `pick-and-bake.py` 的 `assert` 在 `for p in PICK` 循环**内部**（L155/L164），即"先覆盖前 N 张、再在第 N+1 张失败" ⇒ 留下半写状态；而 `libwebp`/`libavif` 换版本时这个 assert 恰好是最可能触发的地方（L135-136 自己记了 AVIF 默认参数会把两阶糊成上千色）。默认（无 `--probe`）还会 **删除** `pl-0N.png` 与 `pl-0N-p.png`（L182-185）。
- **用户会看到什么错误**：`AssertionError: pl-03 不是两阶：[…]`，此时 `pl-01`/`pl-02` 已经被新版本编码覆写。
- **严重度**：P2（对"想复现的人"：重跑会改交付面）。**注意**：`remake-s02-leak.py` 的 L28 自称"同一个输入永远给出同一个输出，可以逐字节复算" —— 这句对**这张图的 RGB 通道**成立，对**整个文件**只在 Pillow 版本相同时成立。
- **可执行修法**：两个脚本都改成"先写到 `<out>.tmp` 目录、全部成功后 `os.replace` 原子替换"；备份移到 `build/`（已忽略，不会污染 `assets/`）；`assert` 提到写盘之前。


## 3 非确定性来源

逐条给【文件+行号｜类型｜会不会改变结果｜证据】。**"会"= 同一台机器跑两次，输出就不同**；标 **【实跑】** 的是我自己跑出来的，标 **【抢救】** 的是从 `_crit14/diff-r1r2.txt` 搬来的（已内联）。

### 3.A 会改变 `report.json` 字节，但不改变像素结论

| # | 位置 | 类型 | 会改结果？ | 证据 |
| --- | --- | --- | --- | --- |
| N01 | `shot.mjs:881` `generatedAt: new Date().toISOString()` | 时间戳 | **会** | 【实跑】R1/R2 `report.json` 88 274 B vs 88 514 B；【抢救】`generatedAt` `19:53:41.721Z` → `19:53:57.648Z` |
| N02 | `shot.mjs:450` `server.listen(0,…)` → 端口泄漏进 `report.server.port`（L893）、`server.origin`、每个 `tiers[].url`（L561/L567/L571） | 端口 | **会** | 【实跑】R1 端口 4105；【抢救】12 544 → 12 655 |
| N03 | `shot.mjs:346/370` 每个 http 条目与每条 beacon 的 `ts`/`at`（`new Date(now).toISOString()`） | 时间戳 | **会** | 【实跑】两轮 `.shot-http.log` 47 580 B vs 47 591 B |
| N04 | `shot.mjs:479/493/497/596/819` `ms`/`startedAt`/`endedAt`/`elapsedMs` | 计时 | **会** | 【抢救】`elapsedMs` 6836 → 6621、`launched[].ms` 2599 → 2514 |
| N05 | `shot.mjs:595` `label: \`${prefix}-${kind}-${Date.now()}\`` → 进临时 profile 目录名 → 进 Chrome stderr 原文（L602 存入报告） | 路径+时间 | **会** | 【抢救】`242940 bytes written to file D:\…\_crit14\r1\.raw\…` → `…r2\.raw\…` |
| N06 | `shot.mjs:842` `outDir` 与 `shot-page.py:240/261/317` 的绝对路径（`os.path.abspath`）进报告 | 绝对路径 | **会** | 【抢救】`tiers[].images.fold.path` `_crit14\r1\…` → `_crit14\r2\…`、`options.out` |
| N07 | `shot.mjs:517-525` Python 子进程的 **stderr/stdout 原文**进报告（首屏裁剪成功时也写） | 外部程序输出 | **会** | 【实跑】R1/R2 `.raw` 路径出现在 stderr |
| N08 | `collect-schemes.mjs:255` `at: j.at` 写进 `data.js` | 时间戳传递 | **不会**（改口，见下） | 【实跑】`summarize-all.mjs --json` 连跑两次 sha256 **完全相同**（`6E7E5A20522BCEF0`）、`table` 模式两次也相同（`C728378AC97876EB`）。**推论同样适用于 `data.js`**：`at` 是**被审产物的渲染时间**，不是"本次运行时间"。 |
| N09 | 见 N08 —— 我原先按代码推断把 `summarize-all.mjs --json` 判成"不稳定"，**实测推翻了这个推断**：只读代码看不出来，"本次运行时间"与"被测产物的时间戳"是两类东西。 | — | **不会** | 【实跑】两次同 sha |
| N10 | `check-stale.mjs:16` `new URL('..', import.meta.url).pathname` —— 未 `decodeURIComponent` | 路径编码 | 路径含空格/中文时**会**（把 `%20` 当字面量送进 `join`） | 只读；本机路径无空格故未触发 |

### 3.B 会改变像素统计量（**本次最重要的发现**）

| # | 位置 | 类型 | 会改结果？ | 证据 |
| --- | --- | --- | --- | --- |
| N11 | `shot.mjs:473` `--virtual-time-budget=${settle}`（默认 4000）+ 页面自身的 CSS 动画/字体栅格时序 | 渲染时序 | **会**：同一页两轮，34 个切片里 **21 个有统计量漂移**，最大 `top3[0].share` 漂 **0.331 个百分点** | 【实跑】R1/R2：48 个产物 **23 个 PNG 字节不同**（25 个逐字节相同）；去易变字段后 **148 个叶子字段仍不同** |
| N12 | 同上，但**几何/拓扑不发生漂移** | — | **不会** | 【实跑】页高 7569/7569、9250/9250、12161/12161；屏数 9/9、11/11、14/14；切片数一致；`mode` 与 `calibrated` 一致；**主色 hex 34/34 全同；`blank`/`uniform` 标记 0 变化；`nearWhiteShare`/`nearBlackShare` 0 变化** |

**这就推翻了 `SHOT-README.md` L233-235 的两句话**：

> 原文：「同一页两次运行，PNG 字节数会差几百 B 到几 KB……**但尺寸、屏数、亮度/主色统计稳定。**要比对"改了 CSS 之后有没有变"时，**比 `report.json` 的像素统计，别比字节数**。」

前半句（字节数会差）**正确**；后半句**不成立**：像素统计本身也漂移，只是幅度小。按 README 推荐的方法做"改了 CSS 有没有变"的判定，**在不改动页面时会得到 21 个切片的"有变化"**。这不是理论风险 —— 本项目已经用这条链路下过视觉结论。

### 3.C `readdirSync` / 排序：**同仓口径不一致**

| # | 位置 | 会改结果？ | 证据 |
| --- | --- | --- | --- |
| N13 | `assign-assets.mjs:212,218,296,386,417` **未排序** | **会**（换文件系统） | 只读；NTFS 与 ext4 的目录返回顺序不同 ⇒ `credits.json`/`CREDITS.md` 行序变、极端并列时选图变 |
| N14 | `write-credits.mjs:47` `readdirSync(assets)` **未排序** | **会**（同上） | 只读 |
| N15 | `verify-prototype.mjs:82` `readdirSync(assetsDir)` **未排序** | 只影响内部 `assetCount`（不进结论文本） | 只读 |
| N16 | `assign-assets.mjs:326` `cands.sort((a,b)=>(b.c.raw-a.c.raw)\|\|(b.c.bytes-a.c.bytes))` —— **非全序** | **会** | 只读；并列项退回 N13 的插入序 |
| ❌ 已排序（不用改） | `collect-schemes.mjs:167-168`、`summarize-all.mjs:17-20`、`write-credits.mjs:31-37`、`verify-prototype.mjs:142-143`、`check-stale.mjs:44` | 不会 | 只读 |

### 3.D `shot.mjs` 的 404 归因：**取决于调度时序，且已经被两次独立观测到**

| # | 位置 | 类型 | 会改结果？ | 证据 |
| --- | --- | --- | --- | --- |
| N17 | `shot.mjs:443-447` `attribute()` —— 只在"恰好一个 tier 的时间窗命中"时返回该 tier，重叠即 `null`；窗口是 L593 的 `[t, t+chromeTimeout]`（默认 120 000 ms），**几乎必然重叠**（`--jobs 2`、`--gap 700`、每档 Chrome 只跑 2–3 s） | 并发归因 | **会**：`http.missing[].tier` 在 `"768x900"` 与 `null` 之间摆 | 【抢救】`diff-r1r2` 第 17 类：`http.missing[].tier` `"768x900"` → `null`；【实跑】我这一轮同一批 6 个 favicon 404 里 **4 个 `tier=null`、2 个 `tier="390x900"`** —— 同一批请求一部分有归因一部分没有 |
| 修法 | 把 `mark.t1` 从 `t+chromeTimeout` 改成"该次 Chrome 真正退出时的时间"（L596 已经在算 `mark.t1 = Date.now()`，只是 L593 先写了一个**错的初值**并让 `attribute` 在有重叠时直接投降）。最小改动：`attribute` 改为取"唯一最小时间距离"而不是"唯一命中窗口"。 | | | |

### 3.E 判定为**确定性**（不用担心，也不要"修"）

| 位置 | 为什么确定 | 证据 |
| --- | --- | --- |
| `make-textures.py:57,122,143,165,182,……` 全部随机数走显式 `random.Random(seed)`，seed 来自 job.json | 无时间源、无 `uuid`、无 `os.urandom`，全文件 0 处 `time`/`now` | 只读（已逐生成器核） |
| `make-textures.py:41` `img.save(p,"PNG",optimize=True)` | 同 Pillow 版本内写两次逐字节相同 | 【抢救】`encdet.txt`：`PNG/optimize 60632 B same=True sha=ab76e5a286ac8123`、`PNG/default 68187 B same=True`、`WEBP/lossless-m6 29356 B same=True`、`AVIF/q100-444 61329 B same=True`、`AVIF/default 30826 B same=True` |
| `S21/pick-and-bake.py:120-121` `Image.LANCZOS` + `ImageOps.autocontrast` | 两者在同版本内确定 | 【抢救】`encdet.txt`：`autocontrast 确定一致: True`、`LANCZOS 确定一致: True`（`remake-s02-leak.py` 不用 LANCZOS，只用 numpy 整数算术） |
| `shot-page.py:86-89` 亮度统计走 **PIL C 级整数直方图**（0–255 桶），不是浮点累加 | 整数运算无累积误差 | 只读（逐行核）；这也解释了为什么 N11 的漂移来自**渲染**而不是**统计** |
| `shot-page.py:108-110` 抽样步长由 `w*h` 算出 + `Image.Resampling.NEAREST` | 同图同版本确定 | 只读 |
| `shot-page.py:53-61` `write_json_no_bom` `newline="\n"`、`ensure_ascii=False`、`indent=2`、`sort_keys=False` | 键序由字典插入序决定，同位同序 | 只读 |
| 浮点累积 | `collect-schemes.mjs:283/305` 的 `Math.pow`/`Math.max` 是单次 IEEE-754 运算，不跨轮累加 | 只读 |
| 并发写同一目录 | `shot.mjs:576-580,689,754,796` 所有产物名都带 `${prefix}`（含档位宽），多 worker 不撞名 | 只读；【实跑】R1/R2 都是 48 个文件、无相互覆盖迹象 |
| `nc`：`shot.mjs` 的 Chrome 临时 profile（L861 `mkdtempSync` + L866 `profileDir`） | 每轮独立目录、用完 `rmSync`（L980） | 只读 |

**⚠️ 一个反例（不是"非确定性"，是"假非确定性"）**：`S21/pick-and-bake.py:133-138` 与 `remake-s02-leak.py` 用 **WEBP/AVIF 编码器**。`libwebp`/`libavif` 的版本一变，同一份 numpy 像素阵列会编出不同字节（`pick-and-bake.py:135-136` 自己记录了 AVIF 默认参数下"两阶糊成上千色"的版本敏感行为）。**渲染尺寸与色数不变，比特变了** —— 这正是 §7 要划的那条线。

## 4 网络依赖的现状核验

§10 那张表的日期是 **2026-10-18 04:15**，本报告的核验日期是 **2026-10-22**。结论：**表有 3 处需要更正，其中 1 处会直接改变"该怎么建原型"的结论；另有 1 处关键前提没写进表。**

### 4.1 `fonts.googleapis.com` / `fonts.gstatic.com`（§10 列为"正常，1 秒内响应"）

- 【实跑】**不带 `--use-system-ca`：失败**。`TypeError: fetch failed`，`cause=UNABLE_TO_VERIFY_LEAF_SIGNATURE`，**117 ms**（fonts.googleapis.com）/ **15 ms**（fonts.gstatic.com）。这是本机 TLS 拦截代理的证书问题 —— 失败得**很快**，所以看起来像 DNS 而不是证书。
- 【实跑】**带 `--use-system-ca`：成功**。`HTTP 200 2689 B 1331 ms`（css2 端点）；`Noto Serif SC` 的 css2 `HTTP 200 226 260 B 1742 ms`。
- **还能不能跑**：`fetch-fonts.mjs` **能跑，但必须带 `--use-system-ca`**。不加就**全族失败**（`fetch-fonts.mjs:71` 打印 `✗ <族>: css2 没有返回 @font-face（族名拼错？）` —— **报错归因是错的**，它会让人去查族名而不是证书）。
- **§10 的问题**：表里这一行没有写"从 Node 取需要 `--use-system-ca`"这个前提。前提只出现在 `_CONTRACT.md` §4 步骤 2 与 §9.3/§8.3（都是讲 `fetch-fonts.mjs` 时顺带说的）。**一个照 §10 表格做可用性判断的读者，会在第一次 `fetch` 失败后得出"字体源也不通了"的错误结论。**
- **对两种读者的影响**：对"想复现的人"= 中（会白折腾一轮）；对"想用它的人"= 无（`_fonts/` 925 个文件已入库，页面离线可跑）。

### 4.2 `commons.wikimedia.org`（§10 列为"ECONNRESET … 连发 10 次成功率 0/10"）

- 【实跑】**现在通了。**
  - 裸探测：`commons.wikimedia.org/w/api.php` → **HTTP 200 / 2465 B / 1023–2271 ms**（带与不带 CA 都通）。
  - 精确复刻 `fetch-scheme-assets.mjs` 的检索（`action=query&generator=search&gsrsearch=oscilloscope screen&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=1200`）→ **HTTP 200 / 10 个命中页**。
  - 精确复刻它的 `download()`（取 `thumburl`）→ **3/4 成功**：212 623 B（4.8 s）、343 521 B（2.7 s）、633 491 B（27.0 s）；1 个 `DuMont oscilloscope 304…` 出现 `UND_ERR_CONNECT_TIMEOUT` —— **`fetch-scheme-assets.mjs:154` 的 6 次指数退避正是为这种间歇失败准备的，能兜住**。
- **还能不能跑**：**能跑，而且这是文档里的"姿势 1"**。
- **§10 的问题**：**整节的前提（"能检索的图源在本环境全部不可用"、"这不是配置问题，是硬约束"）已经过期。** 连带失效的还有基于它的三条决策：
  1. `_CONTRACT.md` §10 让建原型走"姿势 2"（`assign-assets.mjs` 从已有语料交叉分配）；
  2. 10 个案件因此用**跨案复用**的照片顶上（【抢救】`assign-dry.txt`：S19/S20/S21/S22/S23/S24/S26/S27/S28/S29/S30 全部是 `自带 N + 取用 0`，例如 **S21 拿了 S14 的驾驶舱与 NASA 的肯尼迪中心照片**去做"瑞士铁路联锁释放簿"、**S28 爵士凹版墙**没有爵士唱片）；
  3. README「已知缺口」L184 把这些题材缺口写成了既成事实（"**可用语料里没有爵士唱片本身**"）。
- **对两种读者的影响（这条要给"修复收益评估员"）**：
  - **对"想复现的人"**：**负向**。图源一活，"按 §10 复现"与"仓库里实际交付的素材"就走两条路 —— 他现在能跑 `fetch-scheme-assets.mjs`，但拿到的会是一套**与仓库不同的照片**（检索排序 + Commons 内容都会变）。也就是说 §10 过期**降低了可复现性**，而不是提高。
  - **对"想用它的人"**：**零**。页面已在库、素材已在库，源活不活不影响打开页面。
  - **唯一真正的收益面**：S20/S21/S22/S23/S28 这几案的**题材错配**（车/舰/舱内照片用在铁路与爵士题材上）现在**技术上可修**，但要付出"重烘素材 + 重渲染 + 重跑闸门 + 改 CREDITS + 改 README 缺口段"的连锁成本，而且**会改变已交付页面的像素**。**收益是实现文档里承诺的题材一致性，代价是动了一批已验收的产物。**
- **可执行修法**：§10 那段表改成"**观测日期 + 判据 + 复验命令**"三列，例如
  `| commons.wikimedia.org | 2026-10-18 0/10 ECONNRESET ／ 2026-10-22 HTTP 200（复验：node --use-system-ca -e "fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=File:Foo.jpg').then(r=>console.log(r.status))"）|`
  —— **一张不带日期的硬约束表，在下一次审查里一定会被当成事实引用**（本报告就是那个"下一次"）。

### 4.3 仍然不通 / 与 §10 一致的主机（§10 这部分**准确**）

| 主机 | §10 记载 | 【实跑】2026-10-22 | 一致？ |
| --- | --- | --- | --- |
| `www.loc.gov` | HTTP 403 + 约 5 KB 拦截页 | **HTTP 403 / 5657 B** | ✓（连字节量级都对得上） |
| `picryl.com` | HTTP 403 | **HTTP 403 / 5667 B** | ✓ |
| `www.pexels.com` | HTTP 403 | **HTTP 403 / 5713 B** | ✓ |
| `pixabay.com` | HTTP 403 | **HTTP 403 / 5646 B** | ✓ |
| `cdn.pixabay.com` | 未单列（pexels/pixabay 一起说） | **HTTP 403 / 243 B**（`content-type: image/jpeg` 的 403 体） | — |
| `archive.org` | ETIMEDOUT | **`UND_ERR_CONNECT_TIMEOUT` / 10.7 s** | ✓ |
| `api.openverse.org` | ETIMEDOUT | **`UND_ERR_CONNECT_TIMEOUT` / 10.7 s** | ✓ |
| `duckduckgo.com` | ETIMEDOUT | **`UND_ERR_CONNECT_TIMEOUT` / 10.7 s** | ✓ |
| `collectionapi.metmuseum.org/objects/<id>` | 仍可用 | **HTTP 200 / 2250 B / 1043 ms** | ✓ |

### 4.4 §10 里**现象描述已不准确**的 3 行

| 主机 | §10 | 【实跑】 | 差异性质 |
| --- | --- | --- | --- |
| `en.wikipedia.org` | 与 commons 同组，"ECONNRESET（40–49 秒后）或 30 秒超时" | **`UND_ERR_CONNECT_TIMEOUT` / 10.2 s** | 失败**类型变了**（连接超时，不是重置），耗时从 40–49 s 降到 10 s ⇒ §10 的"现象"列不能当判据用 |
| `www.wikidata.org` | ECONNRESET 组 | **HTTP 200 / 314 155 B / 2958 ms** | **已通** |
| `iiif.wellcomecollection.org` | HTTP 403 | **HTTP 404 / 162 B（`application/problem+json`）** | **可达**（404 是对象 id 不对，不是被拦） |

### 4.5 未测但**应当**测的（写进本节限制）

- `collectionapi.metmuseum.org` 的 **search 端点**（§10 称 HTTP 410 已下线）—— 我只测了 `objects/<id>`。**没测**。
- 各案 `assets/fetch-assets.ps1`（≥14 份）走的 **PowerShell `Invoke-RestMethod` 通道**：它与 Node `fetch` 共用系统证书库，理论上**不需要** `--use-system-ca`。我**没有实跑**任何一份 `.ps1`（它们都会写进原型 `assets/`，越界）。**这是一个明确的取证空白**：`_CONTRACT.md` §9.3 说的"`--use-system-ca` 必加"是针对 Node 的，`.ps1` 侧的证书行为没有人验证过。
- `images.unsplash.com` **HTTP 200 / 7891 B / 201 ms**、`images.pexels.com` **HTTP 200 / 3502 B / 627 ms**（§10 说"只认直链、不给检索"，✓ 与直链取图不矛盾）。
- `images-api.nasa.gov` **HTTP 200 / 2559 B / 732 ms**、`images-assets.nasa.gov` **HTTP 200 / 452 B / 650 ms**（§10 说"唯一还能检索+下载的真图源"，✓ 一致；即 `assign-assets.mjs` 的 NASA 通道现在仍可用）。
- `registry.npmjs.org` **HTTP 200**、`github.com` **HTTP 200 / 573 409 B**（带 CA）／`UNABLE_TO_VERIFY_LEAF_SIGNATURE`（不带 CA）—— 与本环境的既定事实一致，**再确认一次 `--use-system-ca` 是全局性的、不是字体源特有的**。

### 4.6 结论表：每个"需联网"的脚本现在还能不能跑

| 脚本 | 联哪些主机 | §10 列为不通？ | **现在能不能跑** | 判据 |
| --- | --- | --- | --- | --- |
| `fetch-scheme-assets.mjs` | `commons.wikimedia.org` | **是（"0/10"）** | **能跑**（R5 三步全通，只有 1/4 下载需重试） | 需联网 + 需写原型 `assets/` ⇒ 本轮**未实跑整脚本**，只实跑了它的两条网络调用 |
| `fetch-fonts.mjs` | `fonts.googleapis.com`、`fonts.gstatic.com` | 否（列为"正常"） | **能跑，但必须 `--use-system-ca`**；不加则全族失败且报错归因错误 | 未实跑整脚本（会写 `_fonts/`），实跑了两个端点 |
| `fetch-css-fonts.mjs` | `cdn.jsdelivr.net` | **§10 完全没提** | **能跑**（`HTTP 200 / 248 B / 758 ms`） | 同上 |
| `assign-assets.mjs` | `images-api.nasa.gov` | 否（列为"唯一可用"） | **能跑**（NASA 两个端点都 200）；但它的**主要输入**（语料）来自被忽略的 `build/` ⇒ 见 §5 | 实跑端点；整脚本未跑（会写 10 案 assets） |
| 各案 `fetch-assets.ps1` | `commons.wikimedia.org` | 未记 | **很可能能跑**（源已通），但**证书通道未验证** | **未实跑** |
| `shot.mjs` / `shot-page.py` / `render-scheme.mjs` | 无外网（只 `127.0.0.1`） | — | **能跑**（`shot.mjs` 已实跑 R1/R2；`render-scheme.mjs` 断在 `tools/`，见 B02） | — |


## 5 `.gitignore` 造成的输入缺失

`.gitignore` 共 62 行、**19 条路径规则**。逐条核"有脚本依赖它吗"的结果如下（【实跑】`git check-ignore -v` + `git ls-files`）。

| # | 规则 | 忽略的路径 | 谁依赖它 | 克隆后会发生什么 | 会影响谁 | 修法 |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | L2 `tools/` | **0 受跟踪文件**（盘上 233 个） | `render-scheme.mjs:17`、`_s03-probe.mjs:6`、`S13/_fillmap.mjs:7`、`S03/check-palette.mjs:4`、契约 §3、§9 的 `inspect.mjs` 全链路 | **契约 §3 那条"唯一"渲染命令完全不可用** | 想复现的人：**功能级不可用** ／ 想用它的人：无（截图与报告都入库了） | 见 §2-B02。LICENSE L46 已有上游 URL，只差把它写进 README 与契约 |
| M2 | L7 `prototypes/*/build/` | **0 受跟踪文件**（24/30 案盘上有 `build/`） | ① `make-textures.py` 的**参数单** `build/texture-job.json`（**12/30** 案有）② `assign-assets.mjs:216/187` 的语料根 `build/raw`、`build/raw-s01`、`build` ③ `write-credits.mjs:19` 的 4 条候选 `credits.json` 路径 ④ 各案 `bake-plates.py`/`make-plates.py` 的中间物 | ① **"可逐字节复算，无第三方权利"这句核不了**（README L166 已自认）② **语料索引 220 → 189 条（丢 31 条 = 14.1%）**，按案：**S01 8 / S11 7 / S12 6 / S16 6 / S26 3 / S15 1**（【抢救】`corpus.txt`）③ **S01 的 `credits.json` 只在被忽略的 `build/raw/`** ⇒ 它那份已交付的 `CREDITS.md`（7 行署名）无法从仓库复核 ④ 纹理/图版不能重烘 | 想复现的人：**主要断点** ／ 想用它的人：**仅一处**——LICENSE 的"无第三方权利"依据不可核（这是法务面，不是页面面） | 把 12 份 `texture-job.json` 复制到 `prototypes/_build/textures/`；S01 的 `build/raw/credits.json` 复制成 `assets/credits.json` |
| M3 | L10 `prototypes/S09-batik-price-board/assets/raw/` | 8 张 raw 原图 | 无（注释已写明"已核：没有一个被引用"） | 无 | 无 | **不用改**（见 §8.8） |
| M4 | L13 `deliverables/_backup-*/` | 盘上 **5 个**目录（`_backup-20261015-195940`、`_backup-20261015-200251`、`_backup-nulfix-20261016-013610`、`_backup-nulfix2-20261016-014745`、`_backup-S25-spec-20261016-012234`） | `deliverables/11-compiled-30.md:2557-2559` 逐份列出"备份=D:\…\_backup-20261015-200251\04-schemes-01-10.md" | 那 90 行批量插入的**改前状态与改后对照**都不可核 | 想核证据的人：**中**（报告点名了具体备份文件） | 要么把关键 diff（不是整目录）内联进 11 号文，要么把 `_backup-*` 收进库（它们是纯文本 md，总字节很小） |
| M5 | L21 `_tmp_*`、L22 `_compiler-*.ps1` | `_compiler-insert-annotations.ps1`（**盘上存在 = True，且被 `.gitignore:22` 命中** ——【实跑】） | `deliverables/11-compiled-30.md:2451` 与 `11f-compiler-appendix.md:451` 把它写成"脚本路径"并描述了它的 4 条断言 | **那段"30 案各插 3 行、合计 90 行"的操作不可复现**，而它正是 11 号文的核心产物 | 想复现的人：**中**（有脚本名、无脚本） | 把该脚本改名为不带 `_compiler-` 前缀（例如 `deliverables/_tools/insert-annotations.ps1`）并入库；11 号文的引用同步改路径 |
| M6 | L14 `deliverables/tool-runs/` | 全部工具运行产物 | `deliverables/16-render-look-audit.md:30` 直接引用 `deliverables/tool-runs/S04-inspect-shots/full-1440.png`；`deliverables/22/23` 多处以它为工作目录 | 报告入库、**证据不入库** | 想核证据的人：**高**（这是"报告说了数字但你查不到图"的同型问题，即 §9.18） | 见 §2-B14 |
| M7 | L17-18 `.taste-skill/`、`**/.taste-skill/` | `inspect.mjs` 的缓存 | 无脚本依赖（是工具自己的缓存） | 无 | 无 | **不用改** |
| M8 | L24 `*.bak-fonts` | 8 份 `index.html.bak-fonts`（盘上存在） | `selfhost-fonts.mjs:71` 的回滚路径 | 克隆里一份都没有；而**盘上那 8 份也不会随源码更新** | 想复现的人：低（仓库本身就是版本控制） | 见 §2-B16 |
| M9 | L25 `prototypes/_build/_gate-*.txt` | `_gate-final.txt`（**103 577 B**）、`_gate-old8.txt`（**416 455 B**） | 无脚本依赖 | **30 案闸门的一次完整原始输出**（含新旧对照）在克隆里不存在 | 想核"30 案闸门是什么时候跑出来的"的人：中 | 若这两份是 §9.6 意义上"我验证的是哪个修订"的凭证，就该入库；否则在引用它们的报告里内联结论 |
| M10 | L45 `.shot-test/` | —— | —— | **这条本身没问题，问题是它旁边缺两条**：`shot.mjs` 的**默认** `--out` 是 `.shot`（L102），README L141 的示例是 `.shots`，**两者都没被忽略**（【实跑】`git check-ignore .shot/x.png` 与 `.shots/x.png` 均无命中；`.shot-test/x.png` 命中`.gitignore:45`） | 想用它的人：低（git status 变脏） | 见 §2-B15 |
| M11 | L52 `_crit*/`、L62 `deliverables/*-scratch/` | 全部审查中间物 | `_CONTRACT.md` §9.18 明确要求"证据必须内联进报告正文" | 审查完成后中间物消失 | —— | **这条是设计正确的**：`deliverables/*-scratch/` 是本轮唯一允许的草稿区，它**不在 sweeper 的扫描模式里**（`_crit*` 才是），且被 L62 忽略。本报告的全部中间产物在 `deliverables/39-scratch/` |

**汇总：5 条规则造成真实的输入缺失（M1、M2、M4、M5、M6），其中 M1 与 M2 是"功能级"的。**

## 6 契约 §9 的坑：已固化的 vs 还在裸奔的

`_CONTRACT.md` §9 共 **19 条**（9.1–9.19，其中 9.16 是 9.2 的重述）。判据：**"已固化"= 有一个脚本会在违反时**自己**报错/退出非 0；"部分"= 有脚本但覆盖不到该条的全部要求；"裸奔"= 只能靠人读文档记住。**

### 6.1 逐条

| § | 内容 | 判定 | 证据 / 缺什么 |
| --- | --- | --- | --- |
| 9.1 | 一个方案目录只能有一个写入者 | **裸奔** | 全 `_build` **没有任何锁 / 单写者守卫**。grep 无 `lock`/`flock`/`O_EXCL`。这条是纯纪律（S01/S02 已经因此丢过版本） |
| 9.2 | 纹理挂 `body` 会伪造通过 | **已固化** | `verify-prototype.mjs:74-77`：正则抓 `(body\|html)\s*\{…\}`，命中 `background-image|background:…url(` 就 push `对比度检查会静默跳过`。**这是 19 条里实现得最干净的一条** |
| 9.3 | `drop-shadow` 合法、不算 `shadow` | **N/A** | 这是工具语义说明，不是可脚本化的约束 |
| 9.4 | 彩色分区里继承色是隐藏陷阱 | **裸奔** | 无脚本检查"红底/墨底分区内后代色是否重新声明"。这条只能由工具的对比度规则部分兜住 |
| 9.5 | `CREDITS.md` 是构建产物，只能**一个**写入者写 | **裸奔** | 这条被违反了**三次**：`write-credits.mjs:98`、**`assign-assets.mjs:415`**、**`fetch-scheme-assets.mjs:285`**、**`S21/pick-and-bake.py:186`** —— **4 个写入者**。`§9.5` 原文写的就是"由**唯一一个** `write-credits.py` 生成，不要手抄"，而 `_build/` 里根本**没有** `write-credits.py`（只有 `.mjs`） |
| 9.6 | `report.json` 的 `at` + `index.html`/`style.css` 的 mtime + **sha256** 三个值才能说清"我验证的是哪个修订" | **部分** | `check-stale.mjs:28/33-42` 固化了 **`at` vs mtime**；**`sha256` 没有任何脚本产出** —— 全仓 `createHash` 只出现在 `fetch-fonts.mjs:81`、`fetch-css-fonts.mjs:67`（用来命名 woff2）。【实跑】`check-stale.mjs` exit 0、30 案全新鲜 |
| 9.7 | `familyCount` 只按"声明在最前的字族"统计 | **裸奔** | 无脚本。全仓 grep 无 `familyCount` 的计算侧（只有 `report.json` 的读取侧 `summarize-all.mjs:53`、`render-scheme.mjs:54`） |
| 9.8 | `monoProseShare` 盯到 0；同族**只链一个** `_fonts/css/` 文件 | **部分** | `selfhost-fonts.mjs:45-46` 只检查"样式表**存在**"，不检查"同一字族链了多个"。§9.8 点名的 `martian-mono__400-500.css` 与 `__400-600.css` 并存这种情况**没有脚本能发现** |
| 9.9 | 禁用词/禁用字体按**词边界**查 | **已固化** | `verify-prototype.mjs:59-63` 用 `(?<![A-Za-z-])…(?![A-Za-z-])`，注释直接点了 `IntersectionObserver` / `ArialNarrow` |
| 9.10 | `sr-only` 只有三种写法被认出 | **裸奔** | 无脚本 |
| 9.11 | 验收不要只看闸门 | **部分** | `verify-prototype.mjs` 在闸门之外加了 **6 类**脚本判据（远程资源 L45-55、禁用字体 L58-64、Emoji L67-72、`body` 背景图 L75-77、素材与署名 L80-85、本地引用存在 L92-105）。**但 §9.11 真正要求的是"列出你自己知道的两处最弱的地方"—— 人写的文本，不可脚本化** |
| 9.12 | 必需的交互态不能默认 `hidden` | **裸奔** | 无脚本（S02 的 `BOOK-409` 就是这么漏掉的） |
| 9.13 | 箭头不是 Emoji；只扫**渲染文本** | **已固化** | `verify-prototype.mjs:17-24` `stripNonRendered()`（剥 `<!-- -->`、`/* */`、`<script>`、`<style>`）+ L25 的码位范围只含 `2600-27BF/2B00-2BFF/1F300-1FAFF`（**不含 2190-21FF**） |
| 9.14 | `measure` 的 0.5em 假设对中文把行长算成两倍 | **裸奔** | 没有任何脚本做"中文报数 ÷2"的换算。§9.14 的方法论（除以 2）**只存在于文档里**，每个读者各自执行 |
| 9.15 | 四条对中文结构性不利的规则：按"报原始值 + 说明豁免理由"处理 | **部分** | `render-scheme.mjs:25-26` 有 `--allow a,b` 参数（把豁免传给 inspect），但**豁免清单没有任何地方落盘** —— 磁盘上唯一记录是 `_gate-final.txt`，而它**被 `.gitignore:25` 排除**（见 M9）。于是"哪些 FAIL 是已豁免的"在克隆里无法判定 |
| 9.16 | （= 9.2 的重述：纹理挂 `body` 会伪造通过） | **已固化** | 同 9.2。**这一条与 9.2 是同一处代码** —— §9 号称 19 条，实际是 18 条独立内容 |
| 9.17 | 闸门陈旧度：任何闸门规则都发现不了的缺陷 | **已固化** | `check-stale.mjs` 全文件（60 行、退出码 1 可接 CI、`--quiet`、【实跑】exit 0 / 30 案全新鲜）。**十九条里唯一"发现问题→写脚本→接 CI"闭环的一条** |
| 9.18 | 临时取证目录会被清理，证据必须**内联**进报告正文 | **裸奔** | 不可脚本化（是写作纪律）。**但可以部分固化**：本轮实测 `deliverables/39-scratch/` **不在 sweeper 的扫描模式里**（被扫的是 `_crit*`），说明"把草稿放到 `deliverables/*-scratch/`"是一条可执行的规避 —— 它已经在 `.gitignore:62` 里了，**只要把这条写进 §9.18 就不再是裸奔** |
| 9.19 | 量错了对象（先答分母/分子/口径三问） | **裸奔** | 无脚本。§9.19 自己的表里 6 个实例，全部是**人类口径错误**，不是可机械检查的 |

### 6.2 固化比例

| 判定 | 条数 | 占比 | 是哪几条 |
| --- | --- | --- | --- |
| **已固化**（脚本会自己报错） | **5** | **26.3%** | 9.2、9.9、9.13、9.16、9.17 |
| **部分**（有脚本，覆盖不全） | **5** | **26.3%** | 9.5、9.6、9.8、9.11、9.15 |
| **裸奔**（只能靠人记住） | **8** | **42.1%** | 9.1、9.4、9.7、9.10、9.12、9.14、9.18、9.19 |
| N/A | 1 | 5.3% | 9.3 |
| 合计 | 19 | 100% | —— |

**若把"部分"折半计入：固化度 = (5 + 5×0.5) / 19 = 39.5%。**
**去重后（9.16 与 9.2 同源）：固化度 = 4/18 = 22.2%。**

### 6.3 §8/§10 的四个"经典坑"：固化情况与 §9 不同

| 坑 | 固化情况 | 证据 |
| --- | --- | --- |
| **BOM（UTF-8 EF BB BF）** | **7 处主动剥 / 4 处裸奔 ⇒ 63.6%** | **剥**：`shot.mjs:827-828`（`charCodeAt(0)===0xfeff` 判断）、`shot-page.py:49`（`utf-8-sig`）、`make-textures.py:344`（`utf-8-sig`）、`assign-assets.mjs:195`（`.replace(/^\uFEFF/,'')`）、`check-stale.mjs:28`（同）、`write-credits.mjs:24`（同）、`S21/pick-and-bake.py:90`（`utf-8-sig`）。**裸**：`verify-prototype.mjs:110`、`collect-schemes.mjs:247`、`summarize-all.mjs:36`、`fetch-scheme-assets.mjs:239` —— 这 4 处读的都是**可能由 PowerShell 写出**的 json。 |
| **`>` 在 PowerShell 里写 UTF-16LE** | **产物侧 100% 固化 / stdout 侧 0% 固化** | **产物侧**：每个脚本写自己的文件都显式 `utf8`（`shot.mjs:943/955` 并附注释"Node 写 = 无 BOM"、`shot-page.py:53-61` 的 `write_json_no_bom`、`assign-assets.mjs:385/415`、`fetch-scheme-assets.mjs:252/285`、`fetch-fonts.mjs:105`、`fetch-css-fonts.mjs:89`、`collect-schemes.mjs:365`、`extract-specs.mjs:83`、`write-credits.mjs:98`）。**stdout 侧**：无法在脚本内自保 —— `collect-schemes.mjs:368` 与 `summarize-all.mjs:3-4` 只在**注释**里警告。 |
| **`Select-Object -First N` 杀管道** | **不构成风险，判为不用改** | 【实跑】grep 命中 20 处，全部在各案 `fetch-assets.ps1`（S06:67、S25:30、S15:96、S10×4、S21:60、S14:90）与 `deliverables/anti-ai-auditor-scripts.md`，**作用对象都是已物化的内存数组**（`$cands`、`$seg`），不是正在写文件的外部进程的管道。`_build` 的 16 个脚本**没有一个**会把自己接进 pwsh 管道。§8.5 记的 `UV_HANDLE_CLOSING` 是**操作者**用法造成的，不是脚本缺陷 |
| **`chrome --window-size=390,844` 不可信** | **工具侧已固化 / 操作者侧裸奔** | **固化**：`shot.mjs:548` 当 `W < 500` 自动 `mode='iframe'`、L622 `Math.max(500,W)+dx`、L652-667 每档探针复核 `vw==W && vh==H` 并**按差值重试一次**。【实跑】R1 390 档 `mode=iframe window=516x995 校准=ok`。**裸奔**：没有任何东西阻止操作者绕开 `shot.mjs` 直接敲裸 chrome —— 而这**已经害过至少一个批次**（`deliverables/22-lead-verify-chrome-viewport.md:56`："我派出去的视觉审查批次 1（S01–S10）**受影响**"）。`templates/M02-warm-local/README.md:214-216` 里还留着一条裸 chrome 调用 |

### 6.4 §9 之外：三条**已经踩过、但没有进 §9** 的坑

这三条在本轮实跑里都出现了，值得补进 §9：

1. **`node --use-system-ca` 的缺失会把失败归因引向错的方向**（§4.1）。`fetch-fonts.mjs:71` 在证书失败时打印的是"族名拼错？"。
2. **`spawnSync` 的返回值不查 = 静默成功**（§2-B10）。`assign-assets.mjs:381` 与 `fetch-scheme-assets.mjs:247-248` 是同一调用、两种写法。
3. **`powershell.exe` 在非 Windows 上不存在**（§2-B06），`shot.mjs:903` 用它取 Chrome 版本 —— 本仓多处工具是 Windows-only，但**没有任何文档说明"这套工具链只能在 Windows 上跑"**。


## 7 本来就不可逐字节复现的产物

**这一节不是缺陷清单** —— 它划的是"**哪些产物的逐字节复现本来就做不到**"，以及"**验收标准应该换成什么**"。

### 7.1 实测噪声底（这是本节的核心证据）

【实跑】R1 与 R2 是**同一条命令、同一台机器、间隔约 2 分钟**：

```
node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ \
     --out <dir> --widths 1440,768,390 --name S14
```

**产物层**：各 48 个文件；**23/48 的 PNG 字节不同**，**25/48 逐字节相同**。差异最大的几组：

| 产物 | R1 字节 | R2 字节 | 差 |
| --- | --- | --- | --- |
| `S14-1440-full.png` | 3 159 516 | 3 156 794 | **−2 722** |
| `S14-768-full.png` | 3 557 467 | 3 556 865 | −602 |
| `S14-390-full.png` | 2 924 049 | 2 923 203 | −846 |
| `S14-1440-screen-03.png` | 326 482 | 321 943 | **−4 539** |
| `S14-390-fold.png` | 101 955 | 101 997 | +42 |
| `S14-1440-screen-04/07/08/09.png`、`S14-768-screen-01/05/06/08/09/10/11.png`、`S14-390-screen-02/05…14.png` | —— | —— | **0（完全相同）** |

**几何层（100% 一致，一个像素都不差）**：

```
1440x900 mode=direct 页高 7569/7569  屏 9/9    切片 9/9   校准 true/true
 768x900 mode=direct 页高 9250/9250  屏 11/11  切片 11/11 校准 true/true
 390x900 mode=iframe 页高 12161/12161 屏 14/14 切片 14/14 校准 true/true
```

**统计层（会漂移，但幅度小且可量化）** —— 34 个切片 + fold + full，最大绝对偏差：

| 统计量 | 两轮 max\|Δ\| | 换算 | 变化面 |
| --- | --- | --- | --- |
| `top3[0].share` / `dominant.share` | **0.003305** | **0.331 个百分点** | 出现于 slice3 |
| `top3[1].share` | 0.001125 | 0.113 pp | slice3 |
| `top3[2].share` | 0.000646 | 0.065 pp | slice3 |
| `luminanceMean` | **0.132** | —— | slice3 |
| `luminanceStdev` | **0.112** | —— | slice3 |
| `meanRgb[*]` | **0.14** | —— | slice3 |
| `rgbStdev[*]` | 0.02 | —— | full |
| `sampling.uniqueSampled` | **35** | 35/2521 ≈ **1.4%** | slice2（`3122` 采样点） |
| `dominant.hex`、`top3[*].hex` | **0 / 34** | 全同 | —— |
| `blank`、`uniform`、`nearWhiteShare`、`nearBlackShare` | **0** | 全同 | —— |
| 后 10 个切片（slice5–slice14） | **全部 0** | —— | —— |

**根因的指纹很清楚**：漂移**只出现在 slice1–slice4**（首屏附近），slice5 之后 10/10 全部零偏差。S14 的动画／定时器集中在首屏区，`shot.mjs:473` 的 `--virtual-time-budget=4000` 决定"跑到哪一帧"，两轮截到的帧不同 ⇒ **只有首屏附近的像素变了，统计量跟着动，几何完全不动**。这与 `SHOT-README.md:233` 说的"动画/字体栅格时序"是同一个原因，只是 README 认为它**只影响字节数、不影响统计**，实测**两者都影响**。

### 7.2 属于"不可逐字节复现"的产物

| 产物 | 为什么不可逐字节 | 影响面 |
| --- | --- | --- |
| `prototypes/*/.inspect/*.jpg`（3 档 fold + page-01..N，**321 个文件已入库**） | ① 走 `inspect.mjs` 的 CDP 截图；② 是 **JPG（有损）**，同一张原图两次编码都可能不同；③ `inspect.mjs` 的滚动拼接本身有缺陷（README L185 记的 `#888888` 灰块） | **全部 30 案的已交付截图**。它们是"页面长什么样"的唯一视觉证据 |
| `shot.mjs` 的 `*-fold.png` / `*-full.png` / `*-screen-NN.png` | 7.1 实测 | 使用 shot.mjs 做验收的一切流程 |
| `shot.mjs` 的 `*-stats.json` / `report.json` 里的像素统计 | 7.1 实测 | 同上；**这正是"比统计量、不比字节"这条建议失效的地方** |
| `S21-interlocking-release-book/build/pick-and-bake.py` 的 `.avif`（`pl-0N.avif`） | `libavif` 版本敏感；脚本自己在 L135-136 记了"默认参数会把两阶糊成上千色" | 已交付的 6 个图版的 AVIF 版（页面引用的是 `.webp`，见该文件 L12） |
| 任何含 CSS 动画 / `transition` / JS 定时器的页面的**首屏附近** | 7.1 的指纹 | 30 案里凡有动效的 |
| `prototypes/*/.inspect/report.json` 的 `at` | 是渲染时间 | `check-stale.mjs` 用它做判据，**这是正确用法** |

### 7.3 验收标准应该是什么（可执行判据）

**① 必须严格相等（0 容差）** —— 这些量在两轮里实测 100% 一致，一旦不等就是**真的变了**：

- 文件**名集合**与**个数**；
- 每张图的**宽 × 高**；
- `pageHeight`、`pageHeightRealViewport`、`pageHeightSource`、`screens`；
- 每个切片的 `index`/`y0`/`y1`/`width`/`height`，及**切片高之和 == 页高**；
- `mode`（direct/iframe）、`calibrated`、`truncated`、`slicesMatch`；
- `dominant.hex`、`top3[*].hex`；
- `blank`、`uniform`、`nearWhiteShare`、`nearBlackShare`；
- `http.byStatus` 的**键集合**（值允许 ±0？见下）、`probe.brokenImages`、`probe.fonts`【3.A 实测：R1/R2 `byStatus` 全同】

**② 带容差（阈值取实测上限的约 3 倍余量）**：

| 量 | 阈值 | 实测上限 |
| --- | --- | --- |
| `top3[*].share`、`dominant.share` | **≤ 0.01**（1 个百分点） | 0.003305 |
| `luminanceMean` | **≤ 0.5** | 0.132 |
| `luminanceStdev` | **≤ 0.5** | 0.112 |
| `meanRgb[*]` | **≤ 0.5** | 0.14 |
| `rgbStdev[*]` | **≤ 0.1** | 0.02 |
| `sampling.uniqueSampled` | **≤ 5%** | 1.4% |
| `http.byStatus[200]`、`http.requests` | **≤ 5%** | 【抢救】S17：242 vs 242 全同；【实跑】S14 两轮 404 计数相同 |

**③ 明确不比较**：PNG/JPG 字节数与文件大小、`.shot-http.log`、`generatedAt`、`server.port`/`origin`、`tiers[].url`、`launched[].ms`/`startedAt`/`endedAt`/`stderr`、`timings`、`probe.beacons[].at`、`images.*.path`、`options.out`、一切绝对路径。

**④ 这份判据的适用限制（必读）**：容差是在 **S14 一个案、3 档、2 轮**上标定的。不同案子的动画密度不同，**不能把 0.01 / 0.5 / 5% 当成普适常量**。正确用法是：**对每个案子先跑一次 A/A 建立它自己的噪声底，再拿它去比 A/B**。如果 `shot.mjs` 加一个 `--ab <dir1>,<dir2>` 子命令按上面 ①②③ 出一张判定表，这件事就从"每个人自己记口径"变成"一条命令"。

### 7.4 **不**属于此类：这些产物反而是**逐字节可复现**的

这一条很重要，因为它把"该修什么"的范围缩小了：

| 产物 | 为什么可复现 | 证据 |
| --- | --- | --- |
| `make-textures.py` 的 14 类 `texture-*.png` | 整数/固定 seed + PNG 编码在同版本内确定 | 【抢救】`encdet.txt`：`PNG/optimize 60632 B same=True`、`PNG/default 68187 B same=True`、`WEBP/lossless-m6 29356 B same=True`、`AVIF/q100-444 61329 B same=True`、`AVIF/default 30826 B same=True`；`autocontrast / LANCZOS` 各 `True` |
| `shot-page.py` 从**同一张输入 PNG** 产出的 `-fold/-full/-screen-NN.png` 与 `-stats.json` | 是**纯函数**：Pillow crop/resize(NEAREST)/整数直方图/显式 utf8 无 BOM | 只读（逐行核）+ `encdet` 的同版本两次写盘一致 |

**由 7.4 直接推出一条最便宜的修法（建议优先于本轮其它任何"修可复现性"的动作）**：

> `shot.mjs` 每轮都把 Chrome 的原始图删掉了（L816-818 `if (!ctx.opt.keepRaw) rmSync(rawFold/rawFull)`）。**给 `shot.mjs` 加一个 `--reuse-raw <dir>`：把上一轮 `.raw/` 里已有的原始 PNG 当作输入，跳过 Chrome，只重跑 `shot-page.py` 的裁剪/切片/统计。**
>
> 收益：**"统计量可复现"从"依赖 Chrome 渲染时序"降级为"依赖输入文件"** —— 只要 `.raw/` 在，`-stats.json` 与 `report.json` 的统计部分就是逐字节可复现的（7.4 已证）。**§7.3 的容差表就可以整段删掉，换成"逐字节相等"。**
> 代价：改动量在 `captureTier()` 里约 20–40 行（在 L628 `await launch(...)` 与 L712 两处加"若 `--reuse-raw` 且目标图存在则跳过 launch"）。**因为 `--keep-raw` 已经存在（L816），raw 图的保留机制不用新写。**
> 这条同时解决"想复现的人"（能拿到逐字节稳定的统计）与"想用它的人"（A/B 比对 CSS 改动时不会因为噪声报警）两个诉求。

## 8 我判为可复现、不用改的项

**给"修复收益评估员"用：下面 11 项我明确判定"不需要动"。**

| # | 项 | 为什么不用改 |
| --- | --- | --- |
| 8.1 | **`shot-page.py` 全文件** | 无一处绝对路径；L49 `utf-8-sig` 读入；L53-61 无 BOM 写出、`newline="\n"`；L86-89 亮度统计走整数直方图（不是浮点累加）；L108-110 抽样步长自适应 + NEAREST（不会插值出新色）；L219-235 `--trim-tail` 只用像素比较。**这是全仓写得最干净的一个脚本** |
| 8.2 | **`make-textures.py` 全文件** | 无一处绝对路径（`outDir` 来自 job.json）；`random.Random(seed)` 显式传种（L57/122/143/165/182）；全文件 **0 处时间源、0 处 `uuid`**；14 个生成器都是纯算术 + 绘图。**它的问题在输入（§5-M2），不在自己** |
| 8.3 | **`check-stale.mjs:16` 的推根写法** | `new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')` —— 处理了 Windows 盘符、**不需要写死任何东西**。**应作为其余 12 处硬编码的改造模板**（唯一小瑕疵是缺 `decodeURIComponent`，见 §3-N10） |
| 8.4 | **`shot.mjs:37` + L169-174 的根解析** | `REPO_ROOT = resolve(HERE,'..','..')`；`resolveTarget` 在"目标不在 root 下"时依次退到 `process.cwd()`、再退到目标目录本身。**换机不因路径断**（断的只是 L39/L40 两个可执行文件默认值，且有覆盖位） |
| 8.5 | **`shot.mjs:29` 用 `process.execPath`** | 不写死 `node.exe` 位置。（对照：`_CONTRACT.md` §3 的命令块写死了 `& 'D:\Nodejs\node.exe'` —— **文档比脚本差**） |
| 8.6 | **`extract-specs.mjs` 的逻辑** | 输入 `deliverables/04\|05\|06` 均已入库；纯正则切分，无时间依赖、无随机、无排序依赖（输出顺序由 `for n=1..30` 决定）。**只差 L10 一个根** ⇒ 修它是"一行改动换一个可用工具"，性价比最高 |
| 8.7 | **`S13/_fillmap.mjs:20/26/27` 的三件事** | L20 有越界守卫（`f !== ROOT && !f.startsWith(ROOT+sep)` → 403）；L26 用 `listen(0)`；L27 从 `server.address().port` 拼 URL。**`_s03-probe.mjs` 应整体照抄这三行** |
| 8.8 | **`.gitignore:10` 排除 `S09-batik-price-board/assets/raw/`** | 规则注释已写明"**已核：S09 的 8 张 raw 原图没有一个被引用**" —— 与 `assets/` 里被引用的位图无关，**不影响页面**，也不影响任何脚本（`assign-assets.mjs:222-225` 的 `DERIVED` 过滤恰好不会碰它，因为它在 `assets/raw/` 而不是 `assets/`） |
| 8.9 | **`prototypes/_fonts/`（925 文件）与 `prototypes/*/.inspect/`（321 文件）都入库** | 这两处**是这份仓库可复现性的底盘**：克隆后①页面能离线打开（README L187 要求走 http，字体本地）②30 案的闸门结果与截图可读 ③`verify-prototype.mjs --all`、`summarize-all.mjs`、`check-stale.mjs` **三个工具无需网络、无需 `tools/`、无需渲染就能跑**（【实跑】三者全跑通，见 §8 末） |
| 8.10 | **各案 `fetch-assets.ps1` 里的 20 处 `Select-Object -First`** | 全部作用在**已物化的内存数组**（`$cands`、`$seg`）上，不是"正在写文件的外部进程的 stdout 管道" ⇒ **不可能触发 §8.5 那个 `UV_HANDLE_CLOSING` 断言崩溃**。这是一个**很容易被后续审查误报成缺陷**的点，我明确判定不用改 |
| 8.11 | **三个 Python 侧的 BOM 处理** | `make-textures.py:344`、`shot-page.py:49`、`S21/pick-and-bake.py:90` 都用 `encoding='utf-8-sig'`（**两种都吃**，而不是"要求写文件的人不带 BOM"）。`make-textures.py:339-343` 的注释还解释了为什么不靠调用方 —— **这是本条坑的最优解，其它 4 处照这个改即可** |

**本节末尾的实跑记录**（三个只读工具，全部在干净的 `D:/Web/style` 上跑通，证明 8.9 的"底盘"成立）：

```
> node prototypes/_build/check-stale.mjs            → exit 0   「闸门陈旧度：检查 30 案 ✓ 全部新鲜」
> node prototypes/_build/verify-prototype.mjs --all → exit 1   「达标 26 / 不达标 4 / 共 30」
> node prototypes/_build/summarize-all.mjs --json   → 两次运行 sha256 完全相同（6E7E5A20522BCEF0）
> node prototypes/_build/summarize-all.mjs          → 两次运行 sha256 完全相同（C728378AC97876EB）
```

`verify-prototype.mjs` 的 `exit 1` 是**设计如此**（不达标的 4 案见 README L180：S07/S08/S13/S21 的 `mono` 等已豁免项）。它与 `deliverables/27-critique-spec-drift.md:60` 记录的「达标 26 / 不达标 4」**逐字一致** —— 说明这个脚本在两个不同时间点上给出同一结论，**它自己是可复现的**。

## 9 限制

1. **§7.3 的容差只在 S14 一个案上标定**（3 档 × 2 轮 × 34 切片）。**它不是一个可以套到其它 29 案上的常量。** 任何跨案使用都必须先跑该案的 A/A 建立自己的噪声底。我在 §7.3 里已经把这个限制写进了判据本身，而不是只在限制节里提一句 —— 因为它是最容易被误用的一处。
2. **未实跑任何会写原型/模板/README 的脚本。** 具体是：`render-scheme.mjs`、`assign-assets.mjs`（只跑了 `--dry`，用上一轮抢救的结果）、`fetch-scheme-assets.mjs`（只跑了 `--list` 与两条网络调用的**复刻**）、`fetch-fonts.mjs`、`fetch-css-fonts.mjs`、`selfhost-fonts.mjs`、`write-credits.mjs`、`extract-specs.mjs`、`collect-schemes.mjs` 的写盘模式（未跑，因为 `--check` 模式才只读）、`remake-s02-leak.py`、`S21/pick-and-bake.py`、各案 14 份 `fetch-assets.ps1`、`S03/verify.mjs`、`S03/measure-area.py`、`S03/make-masks.mjs`、`S13/_fillmap.mjs`、`_s03-probe.mjs`。
   ⇒ **§2 里绝大多数断点是"只读代码推断 + 实跑网络 + 实跑 shot.mjs"三层证据推出来的，不是我亲手把它跑断了。** 标 P0 的两条（B01/B02、B05、B12）我有最强的间接证据（`git ls-files` = 0 行、`existsSync` 的静态可判性），但没有"在另一台机器上跑一遍"的实机证据 —— 本轮**没有第二台机器可用**。
3. **`fetch-assets.ps1` 的 PowerShell 证书通道未验证。** §4.1 证明的是 **Node `fetch`** 不带 `--use-system-ca` 会挂在 `UNABLE_TO_VERIFY_LEAF_SIGNATURE`。PowerShell 的 `Invoke-RestMethod` 走系统证书库，**理论上不受影响，但我没有实跑任何一份 `.ps1`**。如果它也受影响，那 14 份抓图脚本的结论要改。
4. **`collectionapi.metmuseum.org` 的 search 端点未测**（§10 称它在 2026-10-18 是 HTTP 410 已下线）。我只测了 `objects/45734` → 200，与 §10 的记载一致，但没测那个"已下线"的端点。
5. **单案构建脚本只做了模式扫描，没有逐个通读。** 各案 `build/` 与 `assets/` 下共约 **60 个** `.py`/`.mjs`/`.ps1`（S01 的 9 个、S02 的 9 个、S04 的 6 个、S05 的 8 个、S09 的 4 个、S10 的 10 个、S11 的 14 个、S12 的 6 个、S14 的 5 个、S15 的 4 个、S16 的 4 个、S21 的 2 个、S23 的 3 个……）。我对它们做的是**三问 grep**（① 是否含 `D:\`/`C:\` 绝对路径 ② 是否含 HTTP 调用 ③ 是否含时间源/随机未传种），命中结果已并入 §1/§2；**没有逐行读**。所以"§1 的表覆盖了全部脚本"这句话**不成立** —— 它覆盖了 `_build/` 全部 20 个 + 任务点名的 3 个案内脚本，其余约 60 个只到 grep 粒度。
6. **没有验证"闸门 `report.json` 与磁盘上的 `index.html` 是同一修订"之外的更深一层**：`check-stale.mjs` 用的是 `mtime`，而 `git clone` 会把所有文件的 mtime 设成 clone 时刻 —— 也就是说**在克隆上跑 `check-stale.mjs`，它对比的是"clone 时间"与"report.json 里的 ISO 时间"**，只要 report 的 `at` 早于 clone 时刻就会报"全部陈旧 30 案"。**我没有在克隆上验证这一点**（本机工作树不是新鲜克隆）。这是 §9.17 那条工具的**一个未验证的可移植性缺口**，建议下一个审查员用一个 `git clone --depth 1 . /tmp/x` 的副本实测。
7. **本次审查自身的证据存活面**：所有中间产物写在 `deliverables/39-scratch/`（`net-probe2-ca.txt`、`wikimedia-sim-ca.txt`、`shot-run1/`、`shot-run2/`、`dropcmp.txt`、`noisefloor.txt`、`verify-all.txt`、`check-stale.txt` 等）。按 §9.18，**凡写进本报告结论的数字都已内联**，`39-scratch/` 消失不影响本报告的结论。**唯一例外是 §7.1 的两张表**：它们是完整数值（34 个切片 × 多个统计量），我只内联了**最大值与变化面**，逐切片全表在 `39-scratch/noisefloor.txt` 与两份 `report.json` 里。**要完整复算噪声底需要那两个 `report.json`（各约 88 KB）—— 若它们消失，`noisefloor.txt` 里的 max|Δ| 仍可复看，但无法按切片展开。**
8. **我改了哪些文件 / 工作树的真实状态**：我只新增/改写了两处 —— 本文件，与 `deliverables/39-scratch/` 下的新增文件。**未改任何脚本、原型、模板、README、既有 deliverables。**
   但 `git status --short` 在收尾时**不是空的**，两点必须说清（否则下一个审查员会误判）：
   - ` M deliverables/39-critique-toolchain-repro.md` —— 本文件是**受跟踪**的。`HEAD` 里已有一个 **1004 B** 的版本，内容正好是我在"第 0 步"写下的那份骨架 ⇒ **在我按任务要求落盘骨架之后、写正文之前，有另一个进程把它 `git commit` 了**（本会话最近三次提交是 `5c4209d` / `d403603` / `12f2a1e`，主题都是"修文档准确性终版指出的若干条"，其中 `d403603` 明确包含"**render-scheme 不可复现**"、`12f2a1e` 包含"**texture-job 未入库**"）。**我没有执行任何 `git add`/`git commit`/`git push`。**
   - ` M deliverables/37-critique-completeness-defense.md`（+285 行）—— **不是我改的**，它在本轮任何时刻都没有进入我的写范围。这是一个**并发进程**在改（本任务的环境事实里已警告过并发）。**若要做提交前检查，请先把这一条排除，不要把它算到本报告头上。**
   - `deliverables/39-scratch/` 对 git 不可见（命中 `.gitignore:62`）⇒ 上面那些中间产物不会污染工作树。
   - **与本报告结论的关系**：因为并发进程正在按 `34-critique-doc-accuracy.md` 修文档，**§2-B01/B02 在 README 里已经有警示文本了**（见 README L132-134），但 `_CONTRACT.md` §3 的施工规程**还没有** —— 那才是 22 个原型建设者真正读的东西。**修 B01/B02 的最后一步落在契约，不在 README。**

---

## 10 最该先修的 3 条（给"修复收益评估员"的排序依据）

排序原则：**先修"能同时改善两类读者、且改动量小"的**，把"只改善一类读者、且会动已验收产物"的排后面。

### 第 1 条：`shot.mjs` 加 `--reuse-raw <dir>`（§7.4 末尾）

| | |
| --- | --- |
| **改什么** | 允许把上一轮 `.raw/` 里的原始 PNG 当输入，跳过 Chrome，只重跑 `shot-page.py` 的裁剪/切片/统计。约 20–40 行，加在 `captureTier()` 的 L628 与 L712 两处。 |
| **为什么它排第一** | **唯一一条同时解决两类读者、而且修完可以删掉一整节容差表**的改动。修完：统计量从"漂移 0.33 个百分点"变成"**逐字节相等**"（§7.4 已证 `shot-page.py` 是纯函数）。 |
| **对"想复现的人"** | 高：`report.json` 的统计部分变成可复算，§7.3 那张容差表整段作废，验收从"带容差"降级为"逐字节"。 |
| **对"想用它的人"** | 高：README 推荐的"比统计量、不比字节"这条工作流**目前是坏的**（改一行无关 CSS 与不改 CSS 报出同样的变化量）。修完 A/B 比对才成立。 |
| **不做会怎样** | 每一个用 `shot.mjs` 做"改了没有"判断的人，都会拿到 21/34 个切片的假阳性。**本项目已经用这条链路下过视觉结论。** |
| **风险** | 低。不改变任何现有产物的生成路径（新参数默认关闭），不动原型/模板。 |

### 第 2 条：把 12 处 `D:/Web/style` 换成 `check-stale.mjs:16` 那种推根（§2-B01/B04/B05/B07/B08/B10/B11/B17/B18 等多条同源）

| | |
| --- | --- |
| **改什么** | ① `_build` 里 12 个脚本的 `ROOT` 字面量 → `process.env.PROTO_ROOT \|\| fileURLToPath(new URL('<相对>', import.meta.url))`；② `assign-assets.mjs:25` 与 `fetch-scheme-assets.mjs:18` 的 `PY` 加 env 兜底 **并检查 `spawnSync` 返回值**（§2-B10 的静默失败）；③ `S03/check-palette.mjs:4` 的 `file:///D:/…` → `new URL(…, import.meta.url)`。 |
| **为什么它排第二** | **一次机械改动消掉 §2 里 9 条断点中的"路径"成因**。模板已经在仓里（`check-stale.mjs:16`），不需要设计。 |
| **对"想复现的人"** | 高：`render-scheme.mjs`、`verify-prototype.mjs`、`extract-specs.mjs`、`collect-schemes.mjs --check`、`summarize-all.mjs`、`check-stale.mjs` **这六个工具立刻在任意目录可用**（其中 `verify`/`summarize`/`check-stale` 本来就不需要网络与 `tools/`）。 |
| **对"想用它的人"** | **零**。这条纯属"让想复现的人能动手"。 |
| **不做会怎样** | 每个拿到仓库的人都得自己改脚本源码 —— 而"改脚本才能跑"这件事本身会让多数人直接放弃。 |
| **风险** | 极低，但仍有一条**必须先做**：`render-scheme.mjs` 改 ROOT 之后 `cwd`（L31）也跟着变，而契约 §3 的"cwd 必须是工作区根"是**功能要求**（否则 `../_fonts/` 403）—— 改完要实跑一次三档渲染确认 `.inspect/` 仍能产出。**这一步本轮没做（会写 `.inspect/`，越界）。** |

### 第 3 条：把纹理参数单搬出被忽略的 `build/`（§2-B12 / §5-M2）

| | |
| --- | --- |
| **改什么** | 12 份 `build/texture-job.json` 复制到 `prototypes/_build/textures/<Sxx>.json`（不受忽略），`assign-assets.mjs:379` 与 `fetch-scheme-assets.mjs:245` 的 `jobFile` 改写到那里；`make-textures.py` 增一个 `--jobs-dir` 模式。**README L166 已经写下了完全相同的方案，只差执行。** |
| **为什么它排第三而不是第一** | 它改善的是**法务面的可核性**（LICENSE 划"程序化纹理无第三方权利"的依据），不是页面功能的；而且修完**不能**让 18 个缺文件的案子变得可复算（它们本来就只有 12 份）。 |
| **对"想复现的人"** | 中：12 案的纹理变得可逐字节复算（`make-textures.py` 本身是可复现的，§8.2）。 |
| **对"想用它的人"** | 中：`LICENSE` 那句"可逐字节复算，无第三方权利"从"**依据不可核**"变成"可核"。这是**授权可追溯性**，比页面像素更硬。 |
| **不做会怎样** | 任何人 clone 之后都无法验证"`assets/` 里那些 `texture-*.png` 是代码生成的、不是抓来的照片" —— 而这正是它们能进 MIT 范围的理由。 |
| **风险** | 零（只增加文件与一个可选参数，不改现有输出路径）。 |

### 明确**不建议**先修的（与上面三条相对）

- **§2-B18（`remake-s02-leak.py` / `pick-and-bake.py` 的原地覆盖）**：收益是"避免重跑时破坏交付面"，但**当前无人需要重跑**（产物都在库）。等真有人要重烘时再做。
- **§6 里 8 条"裸奔"的 §9 条款**：它们大多是**不可脚本化的写作纪律**（9.11/9.18/9.19），剩下的是**工具侧规则**（9.7/9.10/9.12 由 `inspect.mjs` 管，而 `inspect.mjs` 不在本仓库）。**在没有 `tools/` 的前提下写脚本去检查它们，会把工具链变得更不可复现。**
- **§4.2 的"Wikimedia 活了 ⇒ 重做题材错配"**：技术上可行，但要重烘素材 + 重渲染 + 重跑闸门 + 改 CREDITS + 改 README，**并且会改变已验收页面的像素**。它改善的是"方法论的一致性"，不是"复现性"或"可用性"。**如果目标是本轮的审查主题（换机能不能重跑出同样结果），这条不该做 —— 它会让仓库里的素材更不可复现。**



