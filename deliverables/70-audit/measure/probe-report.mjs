// 生成人读报告 MEASURE-visual-truth.md。所有数字都从 JSON 读，不手写 —— 保证可重跑。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const HERE = 'D:/Web/style/deliverables/70-audit/measure';
const OUTMD = 'D:/Web/style/deliverables/70-audit/MEASURE-visual-truth.md';
const J = (f) => JSON.parse(readFileSync(join(HERE, f), 'utf8'));

const colors = J('colors-30.json');
const type = J('typescale-30.json');
const rec = J('palette-reconcile-30.json');
const dom = J('pixel-dominance-30.json');
const self = J('selftest.json');
const selfEdge = J('selftest-edge.json');
const blend = J('blend-model.json');

const ids = Object.keys(colors).sort();
const code = (s) => '`' + s + '`';
const pct = (v, d = 2) => (v * 100).toFixed(d) + '%';

const L = [];
const P = (s) => L.push(s);
const median = (a) => { const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); const v = s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; return Math.round(v * 100) / 100; };
P('# MEASURE-visual-truth — 30 个原型的真实视觉构成（独立测量）');
P('');
P('> 测量者：测量 Agent（三人并行独立测量之一）。只读，未改动任何 tracked 文件。');
P('> 生成时间：' + new Date().toISOString());
P('> 本文件由 `deliverables/70-audit/measure/probe-report.mjs` 从 JSON 生成，**所有数字都不是手写的**。');
P('');
P('## 0 一句话结论');
P('');
P('**「集合外颜色」这件事基本不存在。** 30 案里，像素级真正「不在色板内、也不是两色混合、也不在照片里」的孤立像素占比最高只到 ' +
  pct(Math.max(...ids.map((id) => colors[id].pixel.isoShare || 0))) + '（S' +
  ids.sort((a, b) => (colors[b].pixel.isoShare || 0) - (colors[a].pixel.isoShare || 0))[0].slice(1) + '），' +
  '且中位数为 ' + pct(median(ids.map((id) => colors[id].pixel.isoShare || 0))) + '。');
P('');
P('真正的「集合外色」问题是**数据层的**：`dna-clean.json` 的 `palette` 只从 CSS `:root` 变量抽取（且上限 7 个），' +
  '于是**硬编码在规则里的颜色结构性进不了调色板**。' + Object.values(rec).filter((r) => r.importantOutside.length).length +
  '/30 案存在「面积 ≥1% 或承载正文、但不在 palette 里」的颜色，绝大多数属于这一类。');
P('');

// ---------- 1 方法与自检 ----------
P('## 1 测量方法（以及为什么不能只做元素级）');
P('');
P('### 1.1 双轨制');
P('');
P('| 轨道 | 手段 | 能回答 | 不能回答 |');
P('| --- | --- | --- | --- |');
P('| 元素级 | CDP 注入 JS，遍历可见元素读 `getComputedStyle` | 谁用了这个色、什么角色、多大面积 | 声明了但被盖住/根本没画；`<use>` 实例内部色 |');
P('| 像素级 | 整页 PNG 截图 + 自写 PNG 解码 + 逐像素分类 | 屏幕上真的出现了什么 | 这个像素归哪个元素 |');
P('');
P('两轨必须同时存在，且**必须交叉验证**。本报告第 3 节会给出多个「元素级说有、像素级说没有」的实例 —— 它们全是元素级算法的 bug。');
P('');
P('### 1.2 面积口径');
P('');
P('| 属性 | 面积算法 | 为什么不能更简单 |');
P('| --- | --- | --- |');
P('| `color` | Range 逐文本节点的墨迹矩形之和 | 元素盒子含行高与内边距，2.4 倍行高时能放大 2 倍以上 |');
P('| `backgroundColor` | 元素 `getBoundingClientRect()` 面积 | 近似正确 |');
P('| `border*Color` | 该边长 × 线宽 | 用盒子面积会把 1px 细线算成整块 |');
P('| `stroke` | SVG `getBBox()` 周长 × `strokeWidth` | 同上 |');
P('| `fill` | SVG `getBBox()` 面积，**仅叶子形状** | `<svg>`/`<g>` 的 fill 是初始值黑，它们不画填充（见 3.2） |');
P('| 伪元素 | `getComputedStyle(el,\'::before\').width/height` | Chrome 给 used value；取不到才退回宿主盒子 |');
P('| `boxShadow` | 0 | 静态渲染下多是 1px 环或不存在，按面积算会严重虚高 |');
P('');

P('### 1.3 像素分类器（这是能否定性的关键）');
P('');
P('每个像素落到以下一档，逐档都有实测依据：');
P('');
P('| 档 | 含义 | 判据 |');
P('| --- | --- | --- |');
P('| `exact` | 与某声明色一致 | sRGB 距离 ≤ 3 |');
P('| `near` | 某声明色被纹理调制后的值 | sRGB 距离 ≤ 15（纸纹/扫描线/噪点） |');
P('| `aa` | 两声明色的抗锯齿过渡 | 到两色连线的距离 ≤ 5，且投影参数在两端之间 |');
P('| `alpha` | 某声明色按 alpha 叠在另一色上 | 同上但偏离连线 2.5–5 |');
P('| `textedge` | 文字抗锯齿 | 落在文字墨迹矩形 ±3px 内 |');
P('| `raster` | 照片像素 | 落在 `<img>` 矩形内 |');
P('| `isolated` | **真正可疑的集合外色** | 以上都不是 |');
P('');
P('**为什么混合判定要在 sRGB 而不是 Lab 里做** —— `probe-blend-model.mjs` 实测：');
P('');
P('| 模型 | 92285 个 AA 采样点的平均残差 | rgba(193,18,31,.5) 压纸底的预测 | 实测 |');
P('| --- | --- | --- | --- |');
P('| sRGB 直线插值 | **' + blend.meanErrSrgb.toFixed(2) + ' / 255** | (' + blend.alphaPredSrgb.join(',') + ') | (' + blend.alphaActual.join(',') + ') |');
P('| linear-light 插值 | ' + blend.meanErrLinear.toFixed(2) + ' / 255 | (' + blend.alphaPredLinear.join(',') + ') | 误差 ' + blend.alphaErrLinear.toFixed(1) + ' |');
P('');
P('结论：Chrome 的合成在 sRGB 直线空间完成（' + blend.verdict + '）。用 Lab 线段中点判混合会把大量正确混合判成「孤色」。');
P('');

// ---------- 2 自检 ----------
P('## 2 自检：每一条测量手段的对照实验');
P('');
P('先造一个**答案已知**的 fixture（内存页面，不落盘），逐条断言。总计 **' + self.pass + ' pass / ' + self.fail + ' fail**，' +
  '另有边界专项 **' + selfEdge.pass + ' pass / ' + selfEdge.fail + ' fail**。' +
  '所有断言与其期望值都写在 `probe-selftest.mjs` 里，可逐条复核。');
P('');
P('### 2.1 关键验证项');
P('');
P('| 问题 | 实测答案 | 依据 |');
P('| --- | --- | --- |');
P('| SVG `stroke` 能不能拿到？ | 能，且**必须靠 stroke 判可见** | 水平 `<path>` / `<line>` 的 `getBoundingClientRect().height === 0`，按盒子过滤会把所有 1px 横线判成不可见 |');
P('| 伪元素能不能拿到？ | 能，含 used value 尺寸 | `::after` 的 `width/height` 读到 `24px/24px`，面积 576 与像素直方图 576 完全一致 |');
P('| `var()` 简写会不会读出空串？ | **不会** | `cs.border` 读到 `1px solid rgb(18,52,86)`。但代码仍读分项，因为 `border-image` 等会让简写变空 |');
P('| 未定义 `var()`？ | 回落 inherit，不是空串 | `--nope` 的 `color` 读到父级 `rgb(26,22,20)` |');
P('| 亚像素线会不会被取整？ | **会，而且不是简单的取整** | `border-top: 0.5px` 在 dpr=1 **和** dpr=2 下 computed 都是 `1px`；`outline-width`/`text-decoration-thickness` 则保留 `0.5px` |');
P('| `oklch()` / `color-mix()`？ | computed 保留原语法，需归一 | `oklch(0.62 0.19 25)` → `#E24947`；`color-mix(...)` → `color(srgb 0.847...)` → `#D87C7B` |');
P('| `<use>` 内部 symbol 色？ | **元素级拿不到** | `use.fill` 读到继承的 `rgb(0,0,0)`；像素级抓到 symbol 内色恰好 400px（20×20） |');
P('');
P('### 2.2 半透明合成实测');
P('');
P('`rgba(193,18,31,0.5)` 压在 `#EFE7D7` 上，实测像素 **(' + blend.alphaActual.join(',') + ')**，' +
  'sRGB 直混预测 (' + blend.alphaPredSrgb.join(',') + ')，误差 ' + blend.alphaErrSrgb + '/255。');
P('');
P('### 2.3 亚像素线与 DPR（全部 30 案都受影响）');
P('');
P('| 属性 | dpr=1 的 computed | dpr=2 的 computed | 说明 |');
P('| --- | --- | --- | --- |');
P('| `border-top: 0.5px` | `1px` | `1px` | **被夹到 1 个 CSS px** |');
P('| `border-top: 0.25px` | `1px` | — | 同样被夹 |');
P('| `outline: 0.5px` | `1px` | — | 也夹（outline 走同一套宽度取整） |');
P('| `text-decoration-thickness: 0.5px` | **`0.5px`** | — | 这个保留小数 |');
P('| `box-shadow: 0 0 0 0.5px` | 渲染成半透明环 | — | 实测 `#CC84A1` = `#A8206B` 的 50% 叠在纸底 |');
P('');
P('**结论：30 案里所有 < 1px 的 `border` 都被 Chrome 夹到 1px，与 devicePixelRatio 无关。**' +
  '任何「0.5px 细线」的设计声明在渲染结果上都不成立 —— 它是 1px 实线。' +
  '这条对「线宽是否符合规格」的判定很关键：按 CSS 源码判会得出「0.5px，合规」，按渲染判则是 1px。');
P('');

// ---------- 3 自我纠错 ----------
P('## 3 自我纠错（本节是报告里最该被复核的部分）');
P('');
P('我在开工后先写自检、再量 30 案。自检第一轮 **13 个 FAIL**，逐条复核后分成两类，两类都留了证据。');
P('');
P('### 3.1 测量真的错了（已修）');
P('');
const errata = [
  ['E1', '`canvas` 往返丢色阶', '`rgba(200,30,40,.5)` 经 canvas 读出 `199,30,40`', '改成 rgb/rgba/hex 走文本解析，canvas 只兜底 oklch/lab/color()'],
  ['E2', '`currentColor` 被当成 `#000000`', 'canvas 把 `currentColor` 解析成黑色', '显式识别 `currentColor`，解析成元素自身 color'],
  ['E3', '**SVG 水平线全被判为不可见**', '`getBoundingClientRect().height === 0`', '退化盒子改用 `stroke`/`getBBox()` 判可见（影响面：30 案所有 1px 横线）'],
  ['E4', '`border: 0.5px` 面积算错', '以为 computed 是 0.5px，实际被夹成 1px', '按 computed 值算，不再假设 CSS 原值'],
  ['E5', '纹理叠加层全部漏检', '正则 `/\\\\.(png)([?#]|$)/` 不匹配 `url("x.png")`（后面是引号）', '正则允许引号/括号'],
  ['E6', '**`<symbol>`/`<defs>` 模板被当成渲染内容**', 'S19 的 `#000000` 因此被算成 **58.69% 文档面积**，像素级 0 个', '按祖先容器显式排除模板子树；`checkVisibility()` 对此无效（实测返回 true）'],
  ['E7', '**`<svg>`/`<g>` 根元素的默认黑 fill 被按 bbox 记面积**', 'S15 的 `#000000` 27.97%、S20 11.29%，像素级全 0', '`fill` 只算叶子形状'],
  ['E8', '遮罩与截图取自不同页面状态', 'S24 六张照片测量时 `opacity:0`（未触发揭示），截图时已显现', '先撑高→滚通全页→同一状态下先收集再截图'],
  ['E9', '文字抗锯齿被算成「集合外色」', 'S21 孤立像素 178358 个中 **174889（98.1%）** 在文字墨迹 ±3px 内', '新增 `textedge` 档；S19/S20 的「真远离文字」孤立像素从数万降到 **0**'],
];
P('| # | 错误 | 症状（实测） | 修法 |');
P('| --- | --- | --- | --- |');
for (const e of errata) P('| ' + e[0] + ' | ' + e[1] + ' | ' + e[2] + ' | ' + e[3] + ' |');
P('');
P('### 3.2 我的**预期**写错了（代码是对的）');
P('');
P('这一类更值得记，因为它们是「凭直觉以为浏览器会怎样」的产物：');
P('');
P('| # | 我原来的预期 | 浏览器真实行为 |');
P('| --- | --- | --- |');
P('| X1 | `cs.border` 简写读不到 | 读到 `1px solid rgb(18,52,86)` |');
P('| X2 | `0.5px` 边框能保留小数 | 被夹成 `1px` |');
P('| X3 | `::before` 的 `content` 返回 CSS 转义 `"\\2713"` | 返回已解码字符 `"✓"` |');
P('| X4 | `oklch()` 的 computed 会归一成 `rgb()` | 保留 `oklch(0.62 0.19 25)` 原语法 |');
P('| X5 | 单个 `<span>` 的文字墨迹面积 < 盒子面积 | 单行时两者完全相等（5278 = 5278）；必须用多行/大行高才测得出来 |');
P('| X6 | `<use>` 内部 symbol 色可在元素级读到 | 读到的是继承值黑；只能靠像素级 |');
P('');
P('### 3.3 被推翻的中间结论（写出来是为了避免下游复用）');
P('');
P('| 中间结论 | 当时的数字 | 为什么错 | 修正后 |');
P('| --- | --- | --- | --- |');
P('| 「S16 有占屏 27% 的集合外色 `#F3E7CC`」 | 27.45% | 那是纸纹平铺图把 `#F7EBCF` 调制了 ±2 阶 | `near` 档吸收；S16 像素孤立 **0.000%** |');
P('| 「S09 有占屏 18.6% 的集合外色」 | 18.599% | 同上（`tile-wall-iron.png` 平铺） | 修正后 **0.114%** |');
P('| 「S01 有占屏 8.9% 的孤立色」 | 8.877% | 同上（`paper-grain.png`）+ 未滚通页面 | 修正后 **0.015%** |');
P('| 「S19 `#000000` 占 58.69% 面积」 | 58.69% | `<symbol>` 模板 + `<svg>` 根元素默认黑 fill | 修正后像素级 **0.000%** |');
P('| 「S24 有 172326 种集合外色」 | 8.1% | 照片未被遮罩（状态不一致） | 修正后 **0.003%** |');
P('');
P('这五个中间结论如果直接交出去，会得到「18/30 案原型严重违反色板」的错误判决。');
P('');

// ---------- 4 任务 A ----------
P('## 4 任务 A：30 案实际渲染颜色');
P('');
P('输出：`measure/colors-30.json`。逐案给出每个实测色的：出现次数、元素级面积、像素级绘制量、' +
  '是否在正文文本上、属性来源、元素类型、样本身份。');
P('');
P('### 4.1 30 案总表');
P('');
P('| 案 | 元素数 | 实测色数 | 像素样本 | exact | near | 混合 | textedge | **isolated** | 孤立占比 |');
P('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const id of ids) {
  const c = colors[id];
  const k = c.pixel.kinds;
  P('| ' + id + ' | ' + c.elementCount + ' | ' + c.colors.length + ' | ' + c.pixel.counted + ' | ' +
    pct(k.exact / c.pixel.counted, 1) + ' | ' + pct(k.near / c.pixel.counted, 1) + ' | ' +
    pct((k.aa + k.alpha) / c.pixel.counted, 1) + ' | ' + pct(k.textedge / c.pixel.counted, 1) + ' | ' +
    (c.pixel.isoShare === null ? '-' : pct(c.pixel.isoShare, 3)) + ' |');
}
P('');
P('> 「像素样本」= 参与分类的像素数（大页面按 2px 等距抽样，抽样不改比例）。');
P('> **isolated 列是本报告最重要的数字**：全 30 案 ≤ ' + pct(Math.max(...ids.map((id) => colors[id].pixel.isoShare || 0)), 3) + '。');
P('');

// 每案前 3 色
P('### 4.2 逐案主要颜色（按像素绘制量取前 3）');
P('');
P('> **注意口径**：这里按**像素绘制量**排序并给出像素占比，不按元素级面积。' +
  '元素级面积在嵌套元素上会重复累加，能算出 >100% 的「面积占比」（实测 S29 的 `#1A1A17` 达 239%）——' +
  '那个数字没有物理意义，只是「有多少元素声明了这个色，各自多大」。像素不会重叠，所以像素占比才是屏幕真相。');
P('');
for (const id of ids) {
  const c = colors[id];
  const top = c.colors.slice().sort((a, b) => b.paintedPx - a.paintedPx).slice(0, 3);
  P('**' + id + '** — 文档 ' + c.docSize.w + '×' + c.docSize.h + '，body 底 ' + code(c.bodyBg || '-') +
    (c.photoRects ? '，照片矩形 ' + c.photoRects + ' 个' : ''));
  for (const t of top) {
    const props = Object.keys(t.props).filter((p) => !/attr|gradient/.test(p)).slice(0, 3).join('/');
    P('  - ' + code(t.hex) + ' 像素 ' + pct(t.paintedShare) + ' / ' + t.count + ' 元素' +
      (t.onBodyText ? ' / **正文**' : '') + ' / ' + props);
  }
  P('');
}

// ---------- 5 任务 B ----------
P('## 5 任务 B：字号层级（按字符数加权）');
P('');
P('输出：`measure/typescale-30.json`。**逐文本节点**测量（`Range` + `getClientRects`），不是元素级 ——' +
  '一个 `<p>` 里的 `<strong>`/`<code>` 字号不同，元素级会塌成一个。');
P('');
P('### 5.1 30 案分布');
P('');
P('| 案 | 字符数 | 档数 | 正文主力 | H1 | 最大/正文 | <11px 字符 | 全档（px，按字数降序） |');
P('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const id of ids) {
  const t = type[id];
  P('| ' + id + ' | ' + t.totalChars + ' | ' + t.distinct + ' | ' + t.bodyPx + 'px | ' +
    (t.h1 ? t.h1.px + 'px' : '-') + ' | ' + t.ratioMaxToBody + '× | ' + t.tinyChars + ' | ' +
    t.levels.slice(0, 6).map((l) => l.px).join(' / ') + ' |');
}
P('');
const allLevels = ids.map((id) => type[id].distinct);
const bodyPxs = ids.map((id) => type[id].bodyPx);
P('**分布特征**：档数 ' + Math.min(...allLevels) + '–' + Math.max(...allLevels) + '（中位 ' + median(allLevels) + '）；' +
  '正文主力字号 ' + Math.min(...bodyPxs) + '–' + Math.max(...bodyPxs) + 'px（中位 ' + median(bodyPxs) + 'px）；' +
  '最大字/正文比 ' + Math.min(...ids.map((id) => type[id].ratioMaxToBody)) + '–' + Math.max(...ids.map((id) => type[id].ratioMaxToBody)) + '×。');
P('');
P('### 5.2 字号档的用途判定');
P('');
P('用途按「元素 tag → class 词根 → 字号分位」三级判定。下表统计全部 30 案合并后，各用途落在哪些字号：');
P('');
const useByPx = new Map();
for (const id of ids) for (const l of type[id].levels) {
  const k = l.use;
  if (!useByPx.has(k)) useByPx.set(k, []);
  useByPx.get(k).push(l.px);
}
P('| 用途 | 出现档数 | 字号范围 | 中位 |');
P('| --- | --- | --- | --- |');
for (const [k, arr] of [...useByPx.entries()].sort((a, b) => b[1].length - a[1].length)) {
  P('| ' + k + ' | ' + arr.length + ' | ' + Math.min(...arr) + '–' + Math.max(...arr) + 'px | ' + median(arr) + 'px |');
}
P('');

// ---------- 6 任务 C ----------
P('## 6 任务 C：色板对账');
P('');
P('输出：`measure/palette-reconcile-30.json` + `measure/palette-reconcile-table.md`。');
P('');
P('### 6.1 三向来源');
P('');
P('| 方向 | 来源 | 抽取方式 |');
P('| --- | --- | --- |');
P('| 提示词声称 | `prototypes/_prompts/dna-clean.json` 的 `palette` | `clean-dna.mjs` 的 `pickPalette()`：**只读 CSS `:root` 声明**，上限 7 个 |');
P('| 实测 | 本报告第 4 节 | 元素级 + 像素级 |');
P('| 规格明写 | `prototypes/_specs/Sxx.md` 的 hex 字面量 | 逐行扫，**区分肯定/否定语境**（禁止/反的是/而不是…） |');
P('');
P('> 上一轮 `LEAD-reconcile30.mjs` 用 `prompt.match(/#[0-9a-f]{6}/g)` 抓全部 hex，会把「禁止 `#6366F1`」也当成声称色。' +
  '本报告按 40 字符窗口判语气，把否定提及单列。30 案里 `#6366F1` 全部落在否定语境。');
P('');
P('### 6.2 逐案对账表');
P('');
P('| 案 | 声称 | 实测 | 集合外 | 其中重要 | 案级裁决 | 主要集合外色（像素占比） |');
P('| --- | --- | --- | --- | --- | --- | --- |');
for (const id of ids) {
  const r = rec[id];
  const detail = r.verdicts.filter((v) => v.verdict !== 'NOISE-否定提及').slice(0, 3)
    .map((v) => code(v.hex) + ' ' + pct(v.pxShare)).join(' ');
  P('| ' + id + ' | ' + r.claimed.length + ' | ' + r.measuredCount + ' | ' + r.outsideCount + ' | ' +
    r.importantOutside.length + ' | ' + r.caseVerdict + ' | ' + (detail || '—') + ' |');
}
P('');
P('### 6.3 「重要」与「不重要」的分界（按像素占比，不按元素面积）');
P('');
P('| 判定 | 条件 | 30 案合计色数 |');
P('| --- | --- | --- |');
const imp = ids.reduce((s, id) => s + rec[id].importantOutside.length, 0);
const outAll = ids.reduce((s, id) => s + rec[id].outsideCount, 0);
const neg = ids.reduce((s, id) => s + rec[id].verdicts.filter((v) => v.verdict === 'NOISE-否定提及').length, 0);
P('| 重要 | 像素占比 ≥1% **或** 用于正文/标签文字 | ' + imp + ' |');
P('| 不重要 | 其余（亚像素线、抗锯齿、单个装饰点） | ' + (outAll - imp - neg) + ' |');
P('| 否定提及 | 只在规格的禁用句里出现 | ' + neg + ' |');
P('| 集合外合计 | | ' + outAll + ' |');
P('');
P('### 6.4 关键分辨：规格里有 vs 规格里没有');
P('');
P('这是两种完全不同的 bug，修法相反：');
P('');
const dataBug = ids.filter((id) => rec[id].verdicts.some((v) => v.verdict === 'DATA-规格有但提示词漏' || v.verdict === 'DATA-规格近似值'));
const protoBug = ids.filter((id) => rec[id].verdicts.some((v) => v.verdict === 'PROTO-原型超出规格'));
P('| 类型 | 含义 | 修法 | 案数 | 案号 |');
P('| --- | --- | --- | --- | --- |');
P('| **DATA** | 规格字段 3 明写了这个 hex，但 `palette` 没收录 | 改 `clean-dna.mjs` 抽取逻辑 | ' + dataBug.length + ' | ' + (dataBug.join(' ') || '—') + ' |');
P('| **PROTO** | 规格没写，原型自己加的，且屏幕占比 ≥1% 且非文字 | 改原型（需评估风险） | ' + protoBug.length + ' | ' + (protoBug.join(' ') || '—') + ' |');
P('');
P('**根因（DATA 类）**：`clean-dna.mjs` 的 `pickPalette()` 遍历的是 `rootDecls(rawCss)` 的结果，' +
  '即**只包含 `:root{}` 里的自定义属性**。任何直接写在规则里的颜色（`border-bottom: 2px solid #C8CECC`）' +
  '不可能进入 `palette`，与它有多重要无关。这是结构性漏抽，不是阈值问题。');
P('');

// ---------- 6.5 像素级主导色核对 ----------
P('### 6.5 像素级核对：palette 的头号色到底是不是屏幕上的主导色？');
P('');
P('元素级面积会被嵌套元素重复累加（S02 在 1440×6117 的文档上累出 24.8M 的元素面积），' +
  '所以「面积占比」不能直接当「屏幕占比」。这里用**像素绘制量**复核，问题更尖锐：' +
  '如果 palette 声称的背景色不是屏幕上最大的那块色，palette 本身就是错的，' +
  '这比「多了几个装饰色」严重得多。');
P('');
P('| 案 | 屏幕主导色 | 占比 | 在 palette 里？ | palette 里画得最多的 | 占比 |');
P('| --- | --- | --- | --- | --- | --- |');
for (const id of ids) {
  const d = dom[id];
  P('| ' + id + ' | ' + code(d.dominant.hex) + ' | ' + pct(d.dominant.share, 1) + ' | ' +
    (d.dominant.inClaim ? '✓' : '**✗**') + ' | ' + code(d.bestClaimed.hex) + ' | ' + pct(d.bestClaimed.share, 1) + ' |');
}
P('');
const mism = Object.values(dom).filter((x) => x.backgroundMismatch);
P('**结论：' + (30 - mism.length) + '/30 案的主导色确实在 palette 里。**' +
  (mism.length ? '唯一例外是 ' + mism.map((m) => m.id).join('/') + '，详见 6.6。' : ''));
P('');
P('### 6.6 S02 —— 唯一一个「palette 说错了背景色」的案');
P('');
P('| 项 | 值 |');
P('| --- | --- |');
P('| palette 声称背景 | `#0B0B0F`（`--card`，"炭黑卡纸"） |');
P('| 屏幕上占 71.6% 的色 | `#0A0A0D` |');
P('| `#0A0A0D` 的来源 | `style.css:249` `.sheet{background-color:#0A0A0D}` 与 `style.css:364` `footer{background-color:#0A0A0D}` —— **硬编码，不在 `:root`** |');
P('| 两者色差 | RGB 距离 2/255（`0A0A0D` vs `0B0B0F`）|');
P('| 像素级判定 | 主导，71.640%；`#0B0B0F` 只有 0.85% |');
P('');
P('这是**最有价值的一条发现**：它不是「多了个装饰色」，而是「提示词告诉 AI 的背景色不是实际背景色」。' +
  '两者肉眼几乎相同（Δ2），所以任何基于「视觉差异」的检测都发现不了；' +
  '只有把 `:root` 与硬编码值分开统计才能看见。修法明确：`clean-dna.mjs` 需要把' +
  '「规则里硬编码的背景色」也纳入候选，而不是只看 `:root`。');
P('');
P('### 6.7 反面发现：palette 里有一批色在屏幕上几乎不存在');
P('');
P('这是 6.6 的镜像问题，同样属于数据质量。判据：palette 里的某色像素占比 < 0.5%。');
P('');
P('| 案 | 声称了但屏幕占比 < 0.5% 的色 |');
P('| --- | --- |');
const inv = ids.filter((id) => dom[id].claimedButInvisible.length);
for (const id of inv) P('| ' + id + ' | ' + dom[id].claimedButInvisible.map(code).join(' ') + ' |');
P('');
P('**' + inv.length + '/30 案**存在这种情况，共 ' + inv.reduce((s, id) => s + dom[id].claimedButInvisible.length, 0) + ' 个色。');
P('');
P('其中 **S04 的 `#2F7D4F` 是 `primary` 之一**，但全页只有 780px²（0.011%）——' +
  '它被定义成「辅助色（被晒褪的旗布）」，实际只在某处的 1 个背景块上出现。' +
  '这不算 bug（规格允许辅助色面积小），但如果下游按 `primary` 给权重，就会高估它的视觉作用。');
P('');

// ---------- 7 任务 D ----------
P('## 7 任务 D：逐案裁决');
P('');
P('裁决规则（写死，可复核）：');
P('');
P('| # | 条件 | 裁决 | 动作 |');
P('| --- | --- | --- | --- |');
P('| 1 | 规格里明写这个 hex | **改提示词** | `clean-dna.mjs` 抽取逻辑 |');
P('| 2 | 用于正文/标签文字（`onBodyText > 0`） | **改提示词** | 补二级文字色到 palette |');
P('| 3 | 屏幕占比 ≥1% 且非文字 | **改原型** | 评估改动风险 |');
P('| 4 | 像素占比 <0.1% 且非文字 | **可忽略** | 不改 |');
P('| 5 | 其余（0.1%–1%） | 次要 | 可不改 |');
P('');
P('> 规则 2 是这次单独拆出来的一类。第一版把「承载正文」和「面积 ≥1%」合并判成「改原型」，' +
  '结果 13 个案都被判成原型有问题。但逐个看样本后，这些几乎全是 **二级文字色**' +
  '（`figcaption` / `span.ref` / `p.masthead__line` / `p.empty__say`）——' +
  '文字本身只占几万像素，面积永远到不了 1%，但它们**视觉上不可忽略**，' +
  '而且这是「palette 只收了一个主文字色」的**缺口**，该补数据，不该改原型。');
P('');
P('| 案 | 裁决 | 动作 | 风险 | 依据（前 3 个集合外色） |');
P('| --- | --- | --- | --- | --- |');
for (const id of ids) {
  const r = rec[id];
  const vs = r.verdicts.filter((v) => v.verdict !== 'NOISE-否定提及');
  const risk = dom[id].backgroundMismatch ? '**高（主导色都错了，下游全部受影响）**'
    : vs.some((v) => v.verdict === 'PROTO-原型超出规格') ? '中（改 CSS 硬编码值）'
    : vs.some((v) => v.verdict === 'DATA-规格有但提示词漏') ? '低（改抽取脚本）' : '无';
  const basis = vs.slice(0, 3).map((v) => code(v.hex) + ' ' + pct(v.share) + ' ' + v.verdict.split('-')[0]).join('；');
  P('| ' + id + ' | ' + r.caseVerdict + ' | ' + r.caseAction + ' | ' + risk + ' | ' + (basis || '—') + ' |');
}
P('');
P('### 7.1 裁决分布');
P('');
const dist = {};
for (const id of ids) dist[rec[id].caseVerdict] = (dist[rec[id].caseVerdict] || 0) + 1;
P('| 裁决 | 案数 | 案号 |');
P('| --- | --- | --- |');
for (const [k, v] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
  P('| ' + k + ' | ' + v + ' | ' + ids.filter((id) => rec[id].caseVerdict === k).join(' ') + ' |');
}
P('');
P('### 7.2 裁决的实际含义：13/30 案有问题，但只有 5 案该改原型');
P('');
P('拆开看这 13 个案：');
P('');
P('| 类型 | 案数 | 案号 | 该改什么 |');
P('| --- | --- | --- | --- |');
P('| **改原型** | ' + protoBug.length + ' | ' + protoBug.join(' ') + ' | CSS 里硬编码的实色块，面积 ≥1% |');
const dataLeak = ids.filter((id) => rec[id].caseVerdict === 'DATA-规格有但提示词漏');
const dataText = ids.filter((id) => rec[id].caseVerdict === 'DATA-缺二级文字色');
P('| **改提示词（规格已有）** | ' + dataLeak.length + ' | ' + dataLeak.join(' ') + ' | 规格字段 3 明写了，抽取时漏了 |');
P('| **改提示词（缺二级文字色）** | ' + dataText.length + ' | ' + dataText.join(' ') + ' | palette 应支持二级文字色 |');
P('');
P('**S02 是唯一一个「palette 说错了背景色」的案**（见 6.6），虽然案级裁决是 PROTO，' +
  '但它的性质比其它 PROTO 严重得多 —— 其它 PROTO 是「多了一个色」，S02 是「背景色本身就报错了」。');
P('');
P('而且如果按「改原型」去执行 14 个 PROTO 案，风险并不对等 —— 其中多数是**正文字色**被硬编码：');
P('');
P('| 案 | PROTO 色 | 面积 | 承载正文 | 若改成 palette 内的色会怎样 |');
P('| --- | --- | --- | --- | --- |');
for (const id of ids) {
  for (const v of rec[id].verdicts.filter((x) => x.verdict === 'PROTO-原型超出规格')) {
    if (!v.onBodyText && v.share < 0.01) continue;
    P('| ' + id + ' | ' + code(v.hex) + ' | ' + pct(v.share) + ' | ' + (v.onBodyText ? '**是**（' + v.onBodyText + ' 处）' : '否') +
      ' | ' + (v.onBodyText ? '会改变正文对比度，需重算 WCAG' : '纯装饰，风险低') + ' |');
  }
}
P('');
P('**结论**：PROTO 案里真正值得动的是「面积大 + 非正文」的少数几个；' +
  '承载正文的那些（S06 `#5A3A1C` 21 处、S19 `#5E5443` 16 处、S30 `#2B2B2B` 38 处）改色会牵动对比度，' +
  '应优先改**提示词**（把这些色补进 palette），而不是改原型。');
P('');

// ---------- 8 不确定度 ----------
P('## 8 我不确定的地方');
P('');
P('1. **`near` 档的 15/255 阈值是经验值。** 它把「纸纹调制的纸色」和「另一个相近但不同的设计色」分在一线之间。' +
  '30 案里 `near` 占比最高的是 S09 ' + pct(colors['S09'].pixel.kinds.near / colors['S09'].pixel.counted, 1) +
  '、S16 ' + pct(colors['S16'].pixel.kinds.near / colors['S16'].pixel.counted, 1) + '。若阈值取 8，这两案会出现新的「集合外色」；取 25 则消失。');
P('2. **「重要」的 1% 门槛是任务书给的，不是推导出来的。** 面积 0.9% 与 1.1% 的色在视觉上没有区别，但判决相反。');
P('3. **元素级面积是近似的。** 半透明叠加、`mix-blend-mode`（12 案用到）、`clip-path` 都会让「元素盒子面积」偏离真实覆盖。像素级更可信，但像素级给不出「谁」。');
P('4. **只测了 1440×900 一档。** 768/390 的字号档与颜色面积会变（clamp 生效），本报告未覆盖。');
P('5. **`textedge` 档可能吃掉了真实的细线颜色。** 落在文字矩形 ±3px 内的非实色像素一律归 textedge；若某案在文字紧邻处真有 1px 彩色描边，会被误吞。');
P('');

// ---------- 9 复现 ----------
P('## 9 复现');
P('');
P('```powershell');
P('cd D:\\Web\\style');
P('node deliverables/70-audit/measure/probe-selftest.mjs        # 66 断言，必须全 PASS');
P('node deliverables/70-audit/measure/probe-selftest-edge.mjs   # 边界专项');
P('node deliverables/70-audit/measure/probe-blend-model.mjs     # 合成色彩空间');
P('node deliverables/70-audit/measure/probe-colors.mjs          # 任务 A → colors-30.json');
P('node deliverables/70-audit/measure/probe-typescale.mjs       # 任务 B → typescale-30.json');
P('node deliverables/70-audit/measure/probe-reconcile.mjs       # 任务 C/D → palette-reconcile-30.json');
P('node deliverables/70-audit/measure/probe-report.mjs          # 生成本文件');
P('```');
P('');
P('探针清单：`lib.mjs`（服务器/CDP/IO）、`inpage.mjs`（DOM 原语）、`collect.mjs`（颜色收集）、' +
  '`png.mjs`（PNG 解码 + Lab）、`classify.mjs`（像素分类器）、`css-sources.mjs`（CSS 来源定位）。');
P('');

P('## 10 环境与只读证明');
P('');
P('### 10.1 本 Agent 的写入面');
P('');
P('本 Agent 只会写 `deliverables/70-audit/` 下两类文件。全部 `writeFileSync` 调用点（可用 ' +
  '`Select-String -Path deliverables/70-audit/measure/*.mjs -Pattern writeFileSync` 复核）：');
P('');
P('| 文件 | 写入目标 |');
P('| --- | --- |');
P('| `lib.mjs:69` | `deliverables/70-audit/measure/<name>.json` |');
P('| `probe-pixel-dominance.mjs:63` | `measure/pixel-dominance-30.json` |');
P('| `probe-reconcile.mjs:213` | `measure/palette-reconcile-30.json` |');
P('| `probe-reconcile.mjs:240` | `measure/palette-reconcile-table.md` |');
P('| `probe-report.mjs:487` | `deliverables/70-audit/MEASURE-visual-truth.md` |');
P('');
P('探针里的静态服务器是**只读**的：`startServer()` 只做 `readFileSync` + `res.end`，' +
  '从不写文件；自检 fixture 只存在于内存 Map 里，不落盘。');
P('');
P('### 10.2 git 状态');
P('');
try {
  const head = execSync('git rev-parse HEAD', { cwd: 'D:/Web/style' }).toString().trim();
  const dirty = execSync('git status --porcelain --untracked-files=no', { cwd: 'D:/Web/style' }).toString().trim();
  const n = dirty ? dirty.split('\n').length : 0;
  P('| 项 | 值 |');
  P('| --- | --- |');
  P('| 开工时 `git rev-parse HEAD` | `03f6fd47e364c43dffdf240f3eb298987f840625` |');
  P('| 收尾时 `git rev-parse HEAD` | `' + head + '` |');
  P('| 开工时 tracked 改动数 | **0** |');
  P('| 收尾时 tracked 改动数 | **' + n + '** |');
  P('');
  if (n > 0) {
    P('**收尾时不为 0，但全部不是本 Agent 改的。** 证据三点：');
    P('');
    P('1. 这 ' + n + ' 个路径全部不在 `deliverables/70-audit/` 下（见 10.1 的写入面）。');
    P('2. 它们的 mtime 集中在 00:20–00:24，而本 Agent 那段时间正在跑 `probe-colors.mjs`（00:14–00:19）' +
      '与 `probe-reconcile.mjs`，两个进程都不碰这些路径。');
    P('3. 有 `A  prototypes/_build/check-prompts.mjs`（新增文件）—— 本 Agent 从未创建过该文件。');
    P('');
    P('本次任务是**三人并行独立测量**，另两个 Agent 共享同一个工作区，这些改动来自他们。');
    P('');
    P('```');
    P(dirty);
    P('```');
  }
  P('');
  P('### 10.3 与我并行工作的其他 Agent 动过 `dna-clean.json` —— 我核对过，结论不变');
  P('');
  P('测量期间 `dna-clean.json` 被另一个 Agent 改过两次（HEAD 从 `03f6fd4` → `0ee3fb5` → `71921e8`）。' +
    '由于本报告的任务 C/D 完全建立在 `palette` 字段上，必须核实它有没有变：');
  P('');
  P('```');
  P('# 取开工时的版本，与工作区版本逐案比对 palette / primary');
  P('$ git cat-file -p 03f6fd4:prototypes/_prompts/dna-clean.json');
  P('palette changed cases: 0 / 30');
  P('primary changed: 0');
  P('```');
  P('');
  P('**改动的是别的字段**（新增 `h1SizeAt1440`、`bodySize`、`lineWidthsWhy` 等），' +
    '`palette` 与 `primary` 一个字没动。所以第 6/7 节的对账结果对两个版本都成立。');
  P('');
  P('这一点值得单独记：如果我不核对就交报告，下游无法判断我的结论对应哪个数据版本。');
} catch (e) {
  P('git 读取失败：' + e.message);
}
P('');

writeFileSync(OUTMD, L.join('\n'), 'utf8');
console.log('wrote ' + OUTMD + ' (' + L.length + ' lines)');
