# shot.mjs — 零依赖截图取证工具

自包含的"反复截图反复取证"工具。**不用 CDP、不装 npm 包**：只用 Node 内置模块 + 系统上已有的
Chrome（命令行无头截图）+ 系统上已有的 Python/Pillow（裁剪、切片、像素统计）。

```
node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ \
     --out .shot-test --widths 1440,768,390 --name S14
```

---

## 1. 它做什么

| 步骤 | 谁做 | 产物 |
| --- | --- | --- |
| 起本地静态服务器（站点根 = 工作目录） | `shot.mjs`（Node `http`） | 页面通过 `http://127.0.0.1:<随机端口>/…` 打开，相对路径与 `../_fonts/` 都能取到 |
| 测量页面（视口尺寸、页高、字体、断链图） | 注入探针 + `sendBeacon` 回连 | `report.json` 里的 `probe` |
| 无头截图：首屏 + 整页长图 | Chrome `--headless=new --screenshot` | `.raw/*.raw.png`（默认用完即删） |
| 裁剪到真实视口、按视口高切片、算像素统计 | `shot-page.py`（Pillow） | `-fold.png` / `-full.png` / `-screen-NN.png` / `-stats.json` |
| 汇总 | `shot.mjs` | `report.json`（无 BOM，`JSON.parse` 直接可读）+ `.shot-http.log` |

### 命名

```
<out>/<前缀>-<档名>-fold.png        首屏（= 该档真实视口的 1:1 截图）
<out>/<前缀>-<档名>-full.png        整页（裁剪到页高）
<out>/<前缀>-<档名>-screen-NN.png   第 NN 屏（从整页图按视口高切）
<out>/<前缀>-<档名>-band-NN.png     --bands 时的"逐屏带"（真实视口单独渲染，见 §4）
<out>/<前缀>-<档名>-stats.json      该档的像素统计（Python 产出）
<out>/<前缀>-<档名>-fold-stats.json 首屏的像素统计
<out>/report.json                   总报告
<out>/.shot-http.log                每个 http 请求（含 404，归因到档）
```

档名就是宽度，如 `S14-1440-fold.png` / `S14-390-screen-14.png`。

### 选项

```
--out DIR            输出目录（默认 .shot）
--width 1440         单档宽        --height 900   视口高（默认 900）
--widths 1440,768,390  多档        --heights 900,1024,900  与 --widths 平行
--name PREFIX        文件名前缀（默认取目标目录名）
--jobs 2             并发上限（硬上限 3）      --gap 700  两次启动 Chrome 的最小间隔 ms
--settle 4000        Chrome --virtual-time-budget（等字体/图片/懒加载的预算）
--max-capture 24000  整页图最大高度，超过标记 truncated
--bands              额外产出"逐屏带"精确截图（每屏一次真实视口渲染，慢但最忠实）
--iframe / --direct  强制视口模式（默认：宽度 < 500 自动 iframe，原因见 §5）
--keep-raw           保留未裁剪的原始截图     --keep-profile  保留临时 Chrome profile
--no-inject          不注入探针               --trim-tail     无探针时用尾部同色估页高
--no-slice           只出首屏 + 整页          --json          只把 report.json 打到 stdout
--chrome / --python / --chrome-timeout / --chrome-flags "…"
```

目标可以是目录（取 `index.html`）、`.html` 文件，或一个 `http(s)://` URL（外部 URL 无法注入探针，
页高退化为窗口高，会在 `report.json` 里写 warning）。

---

## 2. 为什么不用 CDP

上一轮渲染管线（`render-scheme.mjs` → `tools/taste-skill/inspect.mjs`）靠 CDP 连 Chrome：要
websocket、要 node_modules、要版本对得上。它的失败模式是**整条链一起死**——Chrome 升版、
端口被占、puppeteer 装不上，截图就没有了。

本工具反过来：**只用命令行**。代价是失去了 `Page.captureScreenshot` 的 `captureBeyondViewport` 和
一切 `Runtime.evaluate`。为了补上"页面内部信息"，做了三件事：

1. **自己起 http 服务器**，站点根 = 工作目录。页面走 `http://` 打开，`file://` 下的相对路径与
   字体拦截问题不存在；同时我们能看见每一个请求（404 的字体/图片是重要取证信号）。
2. **注入探针 + `sendBeacon` 回连**（只改"服务器发出的那份 HTML"，磁盘上的原型文件一个字节都不动）：
   页面 `load` 后用 `navigator.sendBeacon` 把页高、视口、字体状态、断链图数量报回本地服务器。
   这是没有 CDP 之后唯一的"测量通道"，也是 `report.json` 里页高从哪来的答案。
3. **高窗口 = 长图**，再用 Pillow 切。`--window-size=W,H` 的截图高度就是 H，所以一个 14000 高的
   窗口能一次画完整页，不需要 `captureBeyondViewport`。

被否掉的路线（都试过）：
- **JS 滚动 + 逐屏截图**：`window.scrollTo(0, 900)` 之后 Chrome 交出的是一张**全白图**（见 §5）。
  已彻底放弃，`--bands` 改用"注入 CSS 上移布局"的等价手段。
- **`--dump-dom` / `--print-to-pdf`**：拿不到可靠的页高与像素证据。
- **`--headless=old`**：Chrome 132 之后已移除（本机是 155，直接不可用）。

---

## 3. 页面几何：把 Chrome 的窗口"量"清楚

命令行截图最大的坑是 `--window-size` **不等于 CSS 视口**。用 100px 刻度尺页面 + 像素扫描实测
（Chrome 155.0.8059.84，`--force-device-scale-factor=1 --hide-scrollbars`）：

| 传入 `--window-size` | 图像尺寸 | CSS 视口（`innerWidth/Height`、媒体查询、`vh`） | 布局坐标 → 图像像素 |
| --- | --- | --- | --- |
| 1440×900 | 1440×900 | **1424×805** | 1:1、偏移 0 |
| 1456×995 | 1456×995 | **1440×900** | 1:1、偏移 0 |
| 14000 高 | 14000×1440 | 高 − 95 | 1:1、偏移 0 |
| 390×900 | 390×900 | **500×805**（被最小窗宽夹住） | — |

所以：

- 想要 1440×900 的**真实视口**（媒体查询按 1440 判、`100vh` = 900），必须传 `--window-size=1456,995`；
  多画出来的右边 16px / 下边 95px 内容在视口之外，裁剪掉即可。`--frame-w/--frame-h` 可覆盖这两个常量。
- 每档都会用探针**复核**（`vw==W && vh==H`）；不一致就按差值重试一次（最多两次），
  重试仍不收敛则写 warning 并记录 `calibrated:false`。`report.json` 的 `options.frame` 里能看到实际用的值。
- 窗口宽被 Chrome 夹到最小 500 CSS px，**390 这档靠 iframe 造视口**：外层窗口 ≥ 516 宽，里面放一个
  `width:390px;height:900px` 的 iframe；iframe 内部的媒体查询看到的就是 390（用
  `@media (max-width:500px)` 验过）。截图后按 `(0,0,390,900)` 裁，就是一张真正的 390 视口截图。
  宽度 < 500 时自动走这条路，`--direct` / `--iframe` 可强制。

---

## 4. 页高从哪来（这一条最容易踩）

无 CDP 之后页高只能从探针拿，而**`documentElement.scrollHeight` 会被视口高夹紧**：内容比视口矮时它
等于视口高。整页图的高度如果直接用它，长窗口截图（视口 8000+）就会把"页高"读成窗口高，
整页图尾巴塞进近千像素的纯背景，屏数也跟着多一屏。实测就是先踩了这个坑：

```
--height 3000 → 真视口页高 7569，长窗口读数 8526
--height 8600 → 真视口页高 8600（= 视口高，夹紧），长窗口读数 9660
```

所以探针同时量三样并全部写进 `report.json`：

- `docH`：`documentElement.scrollHeight`（会被视口夹紧）
- `contentH` / `elemMax`：所有非 `fixed`、非 `display:none` 元素 `bottom` 的最大值（**不夹紧**）
- `viewportClamped`：是否发生了夹紧

**整页高以"真视口那一趟（fold）"的读数为准**（`pageHeightRealViewport`，来源
`fold-viewport`）：页高的语义是"用户真实需要滚动的距离"。长窗口只负责把长图**渲染**出来。
长窗口那一趟另有两类读数，只做记录、不用于裁剪：

- `vhDistortion`：长窗口下 `docH` 反而更大 → 视口高确实影响了布局（`100vh`、高度媒体查询、
  读 `innerHeight` 的脚本、懒加载全部命中），此时按长窗口的实际渲染高度裁，并在 warning 里说明。
- `tallOnlyContent`：长窗口里最底元素比真视口页高更低（S14 实测：`ol.near` 伸出 `footer` 下方
  921px）——**这是长窗口工件的痕迹，已排除在整页图之外**，字段里留着数字可查。

### `--bands`：比切片更忠实的逐屏证据

切片来自"一张长图"，因此**长图里只出现一次的固定/粘性元素，在第 2 屏以后的切片里就没了**。
实测（S14，`position:fixed; height:62px` 的顶栏）：

```
screen-01 vs band-01  平均|Δ| 0.15   差>8 像素占 0.20%
screen-03 vs band-03  平均|Δ| 5.64   差>8 像素占 9.33%   最大差异行 y=61
screen-07 vs band-07  平均|Δ| 12.31  差>8 像素占 7.06%   最大差异行 y=8
```

差异几乎全部落在每屏顶部约 60px —— 正是那条 fixed 顶栏。`--bands` 用一次性注入的 CSS
`body{margin-top:-Npx !important}` 把布局整体上移 N px（**不滚动页面**），于是每次都在真实视口里
渲染第 N 屏，fixed 元素的位置与真人滚动时一致。代价：每屏一次 Chrome（9 屏约 +40s，含 `--gap`），
且 sticky 元素不再表现"吸顶跟随"。

---

## 5. Chrome 无头截图的坑（都实测过）

| 坑 | 现象 | 处理 |
| --- | --- | --- |
| `--window-size` ≠ 视口 | 媒体查询按 1424 判而你以为在测 1440 | 传 `W+16, H+95`，再裁掉；每档探针复核 |
| 最小窗口宽 500 | 传 390 得到 500，移动端布局根本测不到 | 窄档走 iframe 套壳 |
| **截图前滚动页面** | `scrollY=900` 时交出**整屏纯白 PNG**（静默失败，不报错） | 绝不 JS 滚动；改注入 CSS 上移。探针会报 `sy`，非 0 就 warning；空白屏也会被 Python 标 `blank` |
| 字体/图片还没到 | 截图里字体是回退字体、图片是空位 | `--virtual-time-budget`（默认 4000）。实测不传这个参数时，`load` 后 800ms 才插入的 DOM **完全没进截图**；传了就会等到预算跑完。探针会上报 `fonts.status` 与 `imagesPending` |
| 窗口高度上限 | 实测 1440×30000 仍正常出图（PNG 356KB，尺寸与窗口一致），未见到 16384 的截断 | 仍设 `--max-capture`（默认 24000）兜底，超限写 `truncated:true` |
| 懒加载 | 视口只有 900 时，首屏外的图未加载，页高会被低估 | 探针 `imagesPending` + 长窗口渲染（高视口把懒加载全部命中） |
| 长页面里的 fixed/sticky | 长图切片里只在第 1 屏出现 | `--bands` 逐屏渲染 |
| Chrome 已在运行 | 不隔离 profile 会复用已有实例，`--screenshot` 直接失效 | 每次启动都用独立 `--user-data-dir`（临时目录，默认用完删） |
| 实例互踩 | 同时启动多个 Chrome 时偶发抢资源 | 并发上限 3（默认 2）+ 启动间隔 `--gap`（默认 700ms），点击以外一律串行化启动 |
| `favicon.ico` 404 | 每趟日志里都有，噪音 | 只提示不判失败；`.shot-http.log` 里可查全部 404 |
| BOM | PowerShell 写的 json 带 BOM，Node `JSON.parse` 与 Python `json.load` 都会炸 | 本工具写 json 一律无 BOM；`shot-page.py` 读输入 json 一律 `utf-8-sig` |
| Python 输出编码 | Windows 下中文经管道变乱码（本地代码页 vs UTF-8） | `shot-page.py` 启动时把 stdout/stderr `reconfigure(encoding="utf-8")` |

---

## 6. `shot-page.py`

```
python shot-page.py --image RAW.png --out DIR --prefix P-1440 --viewport 1440x900 \
       --crop 1440x7569 --page-height 7569 [--measure m.json] [--stats s.json] \
       [--no-slice --fold-name P-1440-fold.png] [--trim-tail] [--format png|jpg] [--extra img.png:标签]
```

- 页高优先级：`--page-height` > `--measure` 的 `pageHeight` > 图像高。
- `--measure` 用 **`utf-8-sig`** 读，容忍 BOM（实测：前 4 字节 `ef bb bf 7b` 的 json 正常读入）。
- 统计：平均亮度、亮度 σ、近白/近黑占比、R/G/B 均值与 σ、出现最多的 3 个颜色及占比、
  抽样唯一色数；颜色用 **NEAREST 抽样**（不插值出新色）后精确计数，抽样步长自适应（默认上限 25 万像素）。
- `blank`：亮度 σ < 1 且近白/近黑 > 99.5% → 标记"疑似整屏空白"，正是 §5 里那种静默失败的形态。
- 输出 `<prefix>-stats.json`（无 BOM），单独跑时也打印人看的摘要表。

---

## 7. 已知限制

1. **必须能起本地 http 服务**：外部 URL 无法注入探针 → 页高只能用窗口高近似（会多带背景），
   且无法判断字体/断链图。
2. **视口高会影响布局的页面**（`100vh` 英雄区、高度媒体查询、读 `innerHeight` 的脚本）：
   长窗口渲染与真实视口不同。工具会标记 `vhDistortion` / `tallOnlyContent`，但**逐屏证据应加 `--bands`**。
3. **懒加载 / 无限滚动 / 点击才出现的分页**：长窗口只能命中"视口内 + Chrome 预载边距"的内容，
   之后的不会渲染。`--settle` 加大只能救"慢"，救不了"要滚动"。
4. **sticky 吸顶**：`--bands` 与长图都不模拟真实滚动位置，吸顶元素表现为"停在文档原位"。
5. **`--max-capture` 之外**：超高页面会被截断（`truncated:true`）。
6. **像素统计是抽样估计**：主色占比在 NEAREST 抽样上精确计数，步长会随图变大（`sampling.sampleStep` 可查）；
   需要全图精确直方图时亮度/RGB 均值仍走全图像素（PIL C 级直方图）。
7. **CDP 专属能力没有**：网络瀑布、console 报错、`getComputedStyle` 全量导出、点击/输入交互
   —— 这些本工具一律不提供。要 console 报错请另找路。
8. **依赖系统程序的绝对路径**：默认写死本机 Chrome / Python 路径，可用 `--chrome` / `--python` 覆盖。
9. **Chrome 版本的几何常量**：`+16/+95`、最小 500 是 155.0.8059.84 实测值；换版本可能变，
   但每档都会复核并自动纠正（`calibrated` 字段）。

---

## 8. 实测样本（真实运行，Chrome 155.0.8059.84 / Node v24.14.0 / Pillow 12.3.0）

```
node prototypes/_build/shot.mjs prototypes/S14-zero-g-launch-sequence/ \
     --out .shot-test --widths 1440,768,390 --name S14
```

三档 6 次 Chrome 启动，**20.5s**（默认 `--jobs 2 --gap 700`）。

| 档 | 模式 | 窗口 | 页高（真视口） | 屏数 | 首屏图 | 整页图 | 切片数 | 校验 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1440×900 | direct | 1456×995 | 7569 | 9 | 1440×900 468 292 B | 1440×7569 3 158 449 B | 9 | ok |
| 768×900 | direct | 784×995 | 9250 | 11 | 768×900 395 225 B | 768×9250 3 613 971 B | 11 | ok |
| 390×900 | iframe | 516×995 | 12161 | 14 | 390×900 101 973 B | 390×12161 2 963 337 B | 14 | ok |

切片实测（宽×高/字节）：1440 档 `900,900,900,900,900,900,900,900,369`；768 档 10×900 + `250`；
390 档 13×900 + `461`。

校验项（对磁盘上的字节核对，不采信报告自述）：首屏宽高 == 档位、整页高 == `pageHeight`、
`屏数 == ceil(页高/视口高)`、切片文件数 == 屏数、切片尺寸与声明一致、切片高之和 == 页高、
`report.json` 无 BOM（前 4 字节 `7b 0a 20 20`）且 `JSON.parse` 通过 —— 三档全过。

> 同一页两次运行，PNG 字节数会差几百 B 到几 KB（动画/字体栅格时序、`--settle` 内跑到哪一帧），
> 但尺寸、屏数、亮度/主色统计稳定。要比对"改了 CSS 之后有没有变"时，比 `report.json` 的
> 像素统计，别比字节数。

主色统计与页面自称的配色对得上（S14 声明 `#12181D` 62% / `#E4572E` 18% / `#D8D2C4` 15% /
`#8A3320` 5%）：

```
1440 第 1 屏  亮度 49.09 σ54.31  主色 #12181d 66.3%  次 #171e24 9.0%  再 #181f25 1.5%
1440 第 6 屏  亮度 148.43 σ84.08 主色 #d8d2c4 59.0%  次 #12181d 28.3%
1440 第 8 屏  亮度 27.99 σ24.61  主色 #12181d 94.5%
```

### 失败路径

- 找不到输入图：`[shot-page] 找不到输入图：…`（原文，exit 1）
- Chrome 没出图：`report.json` 的 `failed[]` 与 tier 的 `error` 里带上 `exit code`、
  `killed`、以及 **Chrome 的 stdout/stderr 原文**（不吞）；进程整体 exit 1。
- 静态服务器：任何请求异常都被捕获（不会因为一个坏请求把整轮截图带走），原文写 stderr。


---

## ⚠️ 【2026-10-22 实测更正】本文 L233 那句「比像素统计，别比字节数」不成立

同一命令、间隔 2 分钟、S14 两轮：拓扑 100% 一致、主色 hex 34/34 全同，

**但 148 个统计叶子字段不同**（dominant.share 最大漂 0.331 个百分点、uniqueSampled 漂约 1.4%），

漂移只在切片 1–4（首屏动画区）——--virtual-time-budget 截到的帧不同。

**后果：页面完全没改也会报约 14 个单元「变了」。** 正确判据见 deliverables/39-critique-toolchain-repro.md §7.3；

根治办法是加 --reuse-raw <dir>，把统计量从「依赖 Chrome 时序」降级为「依赖输入文件」。
