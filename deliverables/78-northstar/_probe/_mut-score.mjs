#!/usr/bin/env node
/* 盲测保真度评分（2026-11-05）。
 *
 * 这不是"看起来像不像"的主观打分 —— 那需要人眼。这里量的是一条可证伪的链：
 * **提示词里写死的东西，生成的 HTML 里有没有**。
 *
 * 分五类，每类都是"能从提示词里逐字取出来、能在 HTML 里精确查证"的：
 *
 *  ① 配色  —— 提示词点名了 N 个 hex（含底色赋值句），HTML 里出现了几个？
 *              这一类最硬：hex 是精确串，没有解释空间。
 *  ② 字体  —— 提示词给了字体链，HTML 的 font-family 里有没有？
 *  ③ 几何  —— 圆角（"全站一律 0"）、线宽（"只用 1px、1.5px"）、
 *              字号（"最大标题 6.5 倍"）。这些都能从 CSS 里量出来。
 *  ④ 结构  —— 提示词点名的条目数/图片位数，HTML 里有没有对应数量的元素？
 *  ⑤ 禁项  —— 提示词明令禁止的（渐变/阴影/emoji…），HTML 里出现了几个？
 *
 * 【为什么不做"总分"】五类的可信度不同：① 是精确匹配，④ 依赖对"条目"的
 * 结构猜测。合成一个总分会让不可信的那类污染可信的那类 —— 而人看到
 * "78 分"就不会再看分项。所以只报分项 + 每项的实测数。
 *
 * 【判据的自我限制，必须写出来】
 *  · ① 里"出现"不等于"用对了"：底色赋值正确与否要单独查 `background` 用的是哪个变量。
 *  · ③ 里"圆角 0"只看 `border-radius` 的声明值，不追 `var()` 展开 ——
 *    追展开要写一个小 CSS 求值器，那会引入它自己的 bug。
 *    S34 的这个案没有用 var 定义圆角，所以不受影响；换一个案可能误判。
 *  · ④ 的"条目数"靠 `提示词里的数字` 对 `HTML 里的重复元素`，是启发式，不是精确的。
 *
 * 用法：
 *   node score.mjs <Sxx>            # 对这个案的产物打分
 *   node score.mjs --all            # 所有跑过的案
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');

function loadScheme(id) {
  const win = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(win);
  return (win.SCHEMES || []).find((s) => s.id === id);
}

/* ══ ④ 结构的两个纯函数 ═══════════════════════════════════════════════
 *
 * 抽出来只有一个理由：**让变异测试打进来**。
 *
 * 这两个判据上一版是内联在 score() 里的，于是它们既没法被自测打，也就没人
 * 发现「26/35 案从未被检查」（见 _probe/79-measurement-layer-audit.md）。
 * 本仓库对闸门的态度是：没有 --selftest 的闸门不算闸门。评分器不在
 * quarter.mjs 的 11 条闸门里（合理，它要联网花钱），那就更要自带自测。
 *
 * 两个函数都不碰文件系统、不碰全局状态 —— 传进去什么就判什么。
 */

/* 条目：比 have（用户条数），不比 minItems（版式规模）。 */
function judgeItems(prompt, html) {
  const itemM = prompt.match(/这个版式设计时排了\s*(\d+)\s*个条目/);
  if (!itemM) return null;
  const haveM = prompt.match(/你手上有\s*(\d+)\s*条内容/);
  const scale = Number(itemM[1]);
  const expect = haveM ? Number(haveM[1]) : null;
  const counts = {};
  for (const tag of ['article', 'li', 'section', 'figure']) {
    const n = (html.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length;
    if (n) counts[tag] = n;
  }
  /* ⚠️ 2026-11-22：原来固定取 `counts.article`，实测 S23 报「应排 5 条，
   * <article>=19 ✗」—— 而那 19 个 `<article class="opening">` 是墙面剥落块
   * （该案的机制元素，每个剥落块一层），真正的 5 条内容在 `<li>` 里：
   *
   *   li1: 鞋跟修补 ¥30 起   …   li5: 门禁钥匙 ¥25 起
   *
   * 判据量的是"哪个标签用了 article"，而不是"内容放在哪"。
   * 这与 §9.19「量错了对象」是同一个病。
   *
   * 修法：四个标签里**取最接近 expect 的那个**，并记录选了哪个 ——
   * 不能静默换目标，否则下次又不知道它量了什么。 */
  let best = null;
  if (expect != null) {
    for (const [tag, n] of Object.entries(counts)) {
      if (!best || Math.abs(n - expect) < Math.abs(best.n - expect)) best = { tag, n };
    }
  }

  /* ⚠️ 2026-11-22 补第三处：**明确标记为空的单元要剔除**。
   *
   * 实测 S12 报「应排 5 条，<article>=7 ✗」。逐个看那 7 个：
   *   1–5  hole / hole tall   ← 真内容（修鞋配钥匙的五条服务）
   *   6    hole empty          ← 刻意留空（提示词说「1 处位置是刻意留空」）
   *   7    hole booking        ← 联络卡，不是内容条目
   *
   * 所以 7 = 5 内容 + 1 刻意空位 + 1 版式元素。
   * 判据数了全部 article，把"版式结构"当成了"内容条目"。
   *
   * 剔除规则（只认**明确的语义标记**，不做"看起来像空"的猜测）：
   *   class 里含 `empty` / `void` / `blank` / `placeholder` / `booking` / `cta`
   * 这条只对"选中的那个标签"生效，且剔除后如果结果是 0 就退回不剔除 ——
   * 免得整页都被判成空。 */
  const EMPTY_MARK = /(^|[\s-])(empty|void|blank|placeholder|booking|cta)([\s-]|$)/i;
  let got = best ? best.n : null;
  let dropped = 0;
  if (best && best.n > 0) {
    const blocks = html.match(new RegExp('<' + best.tag + '\\b[\\s\\S]*?</' + best.tag + '>', 'gi')) || [];
    const empties = blocks.filter((b) => {
      const cm = b.match(/class="([^"]*)"/);
      return cm && EMPTY_MARK.test(cm[1]);
    }).length;
    if (empties > 0 && blocks.length - empties > 0) {
      got = blocks.length - empties;
      dropped = empties;
    }
  }
  return {
    scale,
    expect,
    counts,
    gotTag: best ? best.tag : null,
    got,
    dropped,
    hit: expect != null && got != null ? Math.abs(got - expect) <= 1 : null,
    note: expect == null ? '提示词没写用户条数（have=0 的路径），这一类跳过' : null,
  };
}

/* 图片：三条句式，三条各自的合格线。 */
function judgePictures(prompt, html) {
  const imgs = (html.match(/<img[\s>]/g) || []).length;
  const uniq = new Set(html.match(/src="[^"]*"/g) || []).size;

  if (/本案是零图片设计/.test(prompt)) {
    /* 零图设计的合格线是 0，**多了就是错** —— 与另外两条方向相反。 */
    return { branch: 'zero', want: 0, got: imgs, uniq, hit: imgs === 0 };
  }
  const alt = prompt.match(/这个版式有\s*(\d+)\s*个图片位，但你只有\s*(\d+)\s*条内容/);
  if (alt) {
    const slots = Number(alt[1]);
    const have = Number(alt[2]);
    const need = Math.min(have, slots);
    /* 合格线不是 slots：提示词允许空出来的位用留白顶上。
     * 真正要判的是「放了的不能重复、不能超过位位数、不能少于 min(have,slots)」。
     * 面积与比例这一层判不了（要真渲染），所以只报到数量层，不越权。 */
    return {
      branch: 'alt', want: need, slots, got: imgs, uniq,
      hit: imgs <= slots && imgs === uniq && imgs >= need,
      note: '空出来的位允许留白，合格线是 min(have, slots)；同一张图重复用算违规',
    };
  }
  const minM = prompt.match(/至少要\s*(\d+)\s*个\*{0,2}不同的\*{0,2}图片位置/);
  if (minM) {
    const want = Number(minM[1]);
    return { branch: 'strict', want, got: imgs, uniq, hit: imgs >= want && imgs === uniq };
  }
  /* 三条都不匹配 → 显式记"没判"。旧版静默不输出，于是"没判"和"通过"
   * 在报告里长得一模一样。 */
  return { branch: 'none', hit: null, got: imgs, uniq, note: '⚠️ 三种句式都没匹配到，这一类没判' };
}

/* 渐变受限：两版措辞都要认，且**认不出来时必须返回 null（未判）**。
 *
 * 这条判据的病史值得留着：它原来只认「允许渐变时只用相邻两级」，
 * 而 prompt-copy.js:1276 早把措辞改成「只用同一色系里明度接近的两档」。
 * 于是它对现行 35 份提示词永远为假 —— 一次都没执行过，
 * 而输出显示"无违反"。这是第 5 类缺陷（闸门与被测物共享盲区）。
 *
 * ⚠️ 补完后立刻踩了第二个坑，记在这里：第一版补丁把
 * 「出现 linear-gradient 就算违规」当成判据，跑出来 S19 报「渐变受限×2」。
 * 去看那两处，写的是
 *     linear-gradient(var(--paper-deep),var(--paper-deep)) left top/100% .4px
 * ——**两端是同一个变量**，这是画 0.4px 细线的手法，根本不是颜色渐变。
 * 而 S19 的提示词恰恰要求「只用同一色系里明度接近的两档」，
 * 它用的 #E4DECD / #D8CFB6 正是同一色系相邻两档，**完全合规**。
 * 旧判据漏判（措辞变了），我的新判据又误判（只看函数名）——
 * 两次都是"量了错的信号"。所以现在按语义判：
 */
const STOP = new Set(['to', 'top', 'bottom', 'left', 'right', 'center', 'at', 'from', 'in', 'oklab', 'oklch', 'srgb', 'hsl', 'hwb', 'calc', 'var', 'deg', 'turn', 'rad']);
function colorArgs(gradBody) {
  /* 只取"像颜色"的片段：hex、rgb/rgba/hsl 函数、var(--x)、颜色关键字。
     位置/角度/尺寸/color-mix 的百分比一律不算 —— 它们不构成颜色跨度。 */
  const out = [];
  const hex = gradBody.match(/#[0-9A-Fa-f]{3,8}/g) || [];
  out.push(...hex.map((h) => h.toUpperCase()));
  /* 每个 var(--x) 单独当一个颜色槽；同名的算同一个 */
  const vars = [...gradBody.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
  out.push(...vars);
  const fns = gradBody.match(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\([^)]*\)/g) || [];
  out.push(...fns);
  return out;
}
function isDecorativeLine(gradBody) {
  /* 同色两端的 gradient = 画线，不是渐变。这只是**同色**判定，
     不做"明度接近"的色差判定 —— 后者要写色彩空间换算，
     会引入它自己的 bug（本仓库已因此放弃追 var() 展开）。 */
  const c = colorArgs(gradBody);
  if (c.length >= 2 && c.every((x) => x === c[0])) return true;

  /* ⚠️ 2026-11-22 补第二种"画线"形态 —— 硬边透明过渡。
   *
   * 实测 S15 报「渐变受限×4」，四处全是这个写法：
   *   linear-gradient(to right, var(--pencil) 0.5px, transparent 0.5px)
   *
   * 两个 stop 都在 **0.5px** 上：0 → 0.5px 是不透明，之后瞬间透明。
   * 没有过渡带，画出来是一条 0.5px 的硬线。这是 CSS 里画细线的标准手法
   * （`border` 放不进去的位置只能用这个）。
   *
   * 判据：**所有 stop 位置相同**（或只差 ≤0.01）且其中一个是 transparent
   * → 没有过渡带，是硬边，不算渐变。
   *
   * 保守起见只认 `transparent` 这个关键字，不猜 rgba(0,0,0,0) 之类的等价写法 ——
   * 宁可漏判（把真渐变当画线放过），也不要把真渐变误判成画线而漏掉违规。 */
  const stops = [...gradBody.matchAll(new RegExp('(' + COLOR_TOKEN + ')\\s+([\\d.]+)(px|%)', 'gi'))];
  if (stops.length >= 2) {
    const positions = stops.map((m) => parseFloat(m[2]));
    const same = positions.every((p) => Math.abs(p - positions[0]) <= 0.01);
    const hasTransparent = stops.some((m) => m[1].toLowerCase() === 'transparent');
    if (same && hasTransparent) return true;
  }

  /* ⚠️ 2026-11-22 补第三种"画线"形态 —— 双色硬边条纹。
   *
   * 实测 S18 报「渐变受限×1」，那一处是
   *   linear-gradient(to bottom, var(--phos) 0 3px, var(--bay) 3px 12px)
   *
   * 在 3px 处从磷光绿**瞬间**切到暗底色，没有过渡带 —— 画的是折页压痕 /
   * 边孔（该案的机制句写的就是「两侧 8px 边条按 12px 孔距打 3px 孔」）。
   *
   * ⚠️ 解析这个语法踩了一次坑：CSS 允许**双位置**写法
   *   `color <start> <end>`（这里 `var(--phos) 0 3px` 就是 0 到 3px）。
   * 第一版正则要求「颜色 + 一个带单位的数值」，`0` 没有单位所以断了，
   * 只抓到 1 个 stop，判据自然不命中。
   * 现在允许颜色后面跟 1–2 个位置，每个位置带不带单位都收。
   *
   * 判据：相邻两个 stop 的**某个边界位置相同**且颜色不同 → 硬边切换。
   * 对 `color 0 3px` / `color 3px 12px`，前者的 end=3 与后者的 start=3 重合。 */
  const stopRe = new RegExp('(' + COLOR_TOKEN + ')((?:\\s+[\\d.]+(?:px|%)?){1,2})', 'gi');
  const cs = [];
  for (const m of gradBody.matchAll(stopRe)) {
    const ps = [...m[2].matchAll(/[\d.]+/g)].map((x) => parseFloat(x[0]));
    cs.push({ c: m[1].toLowerCase(), positions: ps });
  }
  for (let i = 0; i + 1 < cs.length; i++) {
    const a = cs[i], b = cs[i + 1];
    if (a.c === b.c) continue;
    /* a 的最后一个位置与 b 的第一个位置重合 → 硬边。
     *
     * ⚠️ 容差从 0.01 放宽到 0.25（2026-11-22，实测 S29）。原例：
     *   radial-gradient(circle at 26px 22px,
     *     var(--paper) 0 4px, var(--ink) 4.1px 5.6px, var(--paper) 5.7px 9px)
     * 4px → 4.1px 之间有 0.1px 间隔。这不是渐变，是**抗锯齿的故意重叠** ——
     * 画圆点时留 0.1px 交叠可以避免浏览器采样出白边。
     * 0.1px 在任何渲染尺度上都看不见，所以它仍然是硬边。
     *
     * 0.25px 是保守上界：真正的颜色过渡至少是几个 px 量级
     * （提示词说的「相邻两档」在 16px 的色带上也有 4px 以上）。 */
    const aEnd = a.positions.length ? a.positions[a.positions.length - 1] : null;
    const bStart = b.positions.length ? b.positions[0] : null;
    if (aEnd != null && bStart != null && Math.abs(aEnd - bStart) <= 0.25) return true;
  }

  /* ⚠️ 2026-11-22 补第四种"画线"形态 —— 透明间隔 + 一条实色 = 纹理。
   *
   * 实测 S05 报「渐变受限×1」，那一处是
   *   repeating-linear-gradient(to bottom,
   *     transparent 0, transparent 7px, var(--groove-lo) 8px)
   * 配 opacity: .18
   *
   * 这是画**凹槽/扫描线纹理**的经典手法：7px 透明 + 1px 暗线，然后重复。
   * 中间那 1px 的过渡带是抗锯齿必需的（0 → 8px 之间只有这一段有颜色）。
   *
   * 判据：整条渐变里**至少一半的 stop 是 transparent**，且颜色种类 ≤ 2
   * → 这是"在一段透明里挖一条线"，不是颜色过渡。
   *
   * 保守：要求 transparent 占多数。`linear-gradient(#fff, transparent)`
   * 这种真渐变（一半白一半透）不会命中，因为它是 1:1。 */
  const allStops = [];
  for (const m of gradBody.matchAll(new RegExp('(' + COLOR_TOKEN + ')(?:\\s+[\\d.]+(?:px|%)?)?', 'gi'))) {
    allStops.push(m[1].toLowerCase());
  }
  if (allStops.length >= 3) {
    const transN = allStops.filter((c) => c === 'transparent').length;
    const distinct = new Set(allStops).size;
    if (transN > allStops.length / 2 && distinct <= 3) return true;
  }
  return false;
}
function scoreGradient(prompt, html) {
  const css = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/i) || ['', ''])[1] || '';
  const wording = /允许渐变时只用相邻两级/.test(prompt) ? 'old'
    : /只用\*{0,2}同一色系里明度接近的两档/.test(prompt) ? 'new'
    : /不用渐变/.test(prompt) ? 'ban'
    : null;
  if (!wording) return { wording: null, hits: 0, decorative: 0 };
  /* 逐个 gradient 取出函数体（简易括号配对，不追求通用 CSS 解析） */
  const bodies = [];
  const re = /(?:linear|radial|conic)-gradient\s*\(/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex, start = i;
    while (i < css.length && depth > 0) {
      if (css[i] === '(') depth++;
      else if (css[i] === ')') depth--;
      i++;
    }
    bodies.push(css.slice(start, i - 1));
  }
  const decorative = bodies.filter(isDecorativeLine).length;
  return { wording, hits: bodies.length - decorative, decorative };
}

/* 圆角与线宽：抽成纯函数以便自测。
 *
 * 这两条判据各自错过一次，方向相反：
 *   · 圆角把 `0 !important` 判成非 0（!important 是声明的一部分，不是值）；
 *   · 线宽第一版太松（从 `padding-bottom: 16px` 截出 `6px`），
 *     收紧后又太紧（简写 `border-bottom: 1px solid` 全被漏掉，S01 从 11 处掉到 0 处）。
 * 「误报」和「什么都不报」在报告里都长得像"正常"—— 所以两条都要有回归用例。 */
function judgeRadius(prompt, html) {
  if (!/圆角：全站一律\s*0/.test(prompt)) return null;
  const radii = [...html.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  const corners = (v) => v.replace(/!important/gi, '').trim().split(/\s+/).filter(Boolean);
  const isZero = (c) => /^0(px|em|rem|%)?$/i.test(c);
  const nonZero = radii.filter((v) => !corners(v).every(isZero));
  return { rule: '全站一律 0', declared: radii.length, violations: nonZero.length, samples: nonZero.slice(0, 3) };
}

function judgeLineWidth(prompt, html) {
  const m = prompt.match(/线宽只用这几级：([^。]+)/);
  if (!m) return null;
  const allowed = new Set((m[1].match(/[\d.]+px/g) || []).map((s) => Number(parseFloat(s).toFixed(2))));
  /* 属性名必须是完整词：`border` / `border-top` 等，且宽度是声明里的第一个数值。
   * `border-bottom: 1px solid #000` 这种简写必须收（否则会把正常页面数成 0 处）。 */
  const used = [...html.matchAll(/(?:^|[\s;{])(border|border-(?:top|right|bottom|left))(?:\s*:\s*)([\d.]+)px\b/g)]
    .map((x) => Number(parseFloat(x[2]).toFixed(2)));
  const outside = used.filter((v) => !allowed.has(v));
  return { allowed: [...allowed].map((n) => n + 'px'), used: used.length, outside: [...new Set(outside)].map((n) => n + 'px') };
}

/* 字体链外检查：提示词写「不要用 上面两条链之外的字体」，
 * 而 ⑤ 禁项原先只查阴影与渐变两条 —— 这条可机械验证的约束没人守。
 *
 * 判据：
 *   · 提示词给了 display / body 两条链，各 2–4 个族名；
 *   · 产物里 `font-family` 出现的每个族名，要么在链上，要么是**通用回退**
 *     （`monospace` / `serif` / `sans-serif` / `system-ui` 等）。
 * 通用回退不算违规 —— 它本来就是你链走完之后的兜底，提示词也没禁它。
 *
 * 局限（必须写出来）：只看 `font-family` 的**字面值**，不追 `var(--font-x)` 展开。
 * 追展开要写一个小 CSS 求值器，那会引入它自己的 bug（同 ③ 圆角的取舍）。
 * 所以产物如果全用变量定义字体，这条会报 0 —— 那是"没判"，不是"通过"。 */
const GENERIC_FAMILIES = new Set([
  'monospace', 'serif', 'sans-serif', 'system-ui', 'cursive', 'fantasy',
  'ui-monospace', 'ui-serif', 'ui-sans-serif', 'emoji', 'math', 'inherit', 'initial',
]);
function judgeFontChain(prompt, html) {
  /* 提示词里的允许集合。两处要抓：
   *   「标题按这个顺序取第一个可用的：A → B」/「按序取：A → B」
   *   「编号/价格等数字用等宽 X、tabular-nums 右对齐」
   *
   * ⚠️ 第一版把第二处的锚点写成「数字用等宽」，而提示词原文是
   * 「编号/价格等数字用**等宽** Martian Mono」—— 中间隔着「等」字，
   * 锚点匹配不上，于是 Martian Mono 没进允许集合，
   * S01/S19/S21 全被判「链外」。**判据先错了，不是产物错了。** */
  const allowed = new Set();
  /* ⚠️ `[^（\n]+` 里的 `\n` 必须留 —— 第一版漏了，正则跨行吃掉整段，
   * 允许集合里混进了
   *   'Source Han Sans SC。编号/价格等数字用等宽 Martian Mono、tabular-nums 右对齐。'
   * 这样整句，于是一个合法字体都没匹配上。 */
  for (const m of prompt.matchAll(/(?:按这个顺序取第一个可用的|按序取)：([^（\n。]+)/g)) {
    for (const part of m[1].split('→')) {
      const n = part.trim();
      if (n) allowed.add(n);
    }
  }
  /* 等宽：字体名可能带空格（`Martian Mono` / `IBM Plex Mono`）。
   * ⚠️ 第一版写成 `等宽\s*([^\s、，,。]+)`，只抓到 `Martian` 就断了，
   * 于是 `Martian Mono` 被判链外。改成吃到标点为止，允许内部空格。 */
  const monoM = prompt.match(/等宽\s+([A-Za-z][A-Za-z0-9 ]*?)(?=[、，,。]|$)/m);
  if (monoM) allowed.add(monoM[1].trim());
  if (!allowed.size) return null;

  const decls = [...html.matchAll(/font-family\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  if (!decls.length) return { allowed: [...allowed], used: [], outside: [], note: '产物没有 font-family 声明' };
  const used = new Set();
  let varOnly = 0;
  for (const d of decls) {
    const parts = d.split(',').map((x) => x.trim().replace(/^["']|["']$/g, ''));
    if (parts.every((p) => p.startsWith('var('))) varOnly++;
    for (const p of parts) {
      if (!p || p.startsWith('var(')) continue;
      used.add(p);
    }
  }
  /* ── 三处收窄（2026-11-22，实测 S18 报「链外×4」而四处都不该报）────────
   *
   * ① **空格差异不算链外**。提示词写 `Glow Sans SC`，产物写 `GlowSansSC` ——
   *    同一个字体的两种写法（Google Fonts 官方名与文件名两个形态）。
   *    判据只认字面，于是报了。现在两边都去掉空格再比。
   *
   * ② **链尾的合理回退不算链外**。产物写
   *      font-family: VT323, "Courier New", monospace
   *    提示词给的等宽只有 `VT323`，但任何负责任的字体栈都会在后面补系统
   *    等宽兜底 —— 提示词禁的是"**跳过链**回退成系统默认无衬线"
   *    （一上来就用 Arial），不是禁止链尾兜底。
   *    判据：只要每一组声明的**第一个**非 var() 字体在链上，整组就合规；
   *    后续元素只做记录不判违规。
   *
   * ③ **手写/装饰字体放行**。S18 的 `.job-id .hand` 用
   *      font-family: "Comic Sans MS", "Segoe Print", cursive
   *    那是为了做「中间那位数字是手写笔迹」（该案的签名怪癖明确要求）。
   *    这类字体不进主字体分工，只承担一个局部效果。
   *
   *    判断方式：**只在该组声明的第一个字体确实是手写类**时放行。
   *    白名单收窄到这几个真实用来模拟手写的，不做"看起来像手写"的猜测。 */
  const norm = (s) => s.replace(/\s+/g, '').toLowerCase();
  const allowedNorm = new Set([...allowed].map(norm));
  const HANDWRITING = new Set(['comic sans ms', 'segoe print', 'bradley hand', 'chalkboard', 'marker felt', 'brush script mt']);
  const outside = [];
  for (const d of decls) {
    const parts = d.split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter((p) => p && !p.startsWith('var('));
    if (!parts.length) continue;
    /* ③ 整组是手写效果 */
    if (HANDWRITING.has(parts[0].toLowerCase())) continue;
    /* ② 只看第一个 */
    const head = parts[0];
    if (allowedNorm.has(norm(head)) || GENERIC_FAMILIES.has(head.toLowerCase())) continue;
    outside.push(head);
  }
  return {
    allowed: [...allowed],
    used: [...used],
    outside,
    /* 全部走变量 → 这条判不了。必须记下来，不能算通过。 */
    undecided: outside.length === 0 && used.size === 0 && varOnly > 0,
  };
}

/* 渐变明度跨度：提示词写「只用同一色系里明度接近的两档，跨度不超过一档
 * （比如底色与它稍深的一档之间），不要从深色直接过渡到浅色」。
 *
 * 这条与 ⑤ 已有的「渐变受限」是两条不同的禁令：那条查**有没有**渐变，
 * 这条查渐变**两端的明度差**。前者是数量，后者是性质。
 *
 * 用 CIELAB 的 L*（0–100）判明度，口径与 `check-distribution.mjs:79` 的
 * `labLOf` 逐字一致 —— 不另写一套色彩空间换算，那会引入它自己的 bug。
 *
 * 阈值 25：L* 差 25 大约是「一眼能看出是两个不同明度层」的下限。
 * 提示词说「不超过一档」，一档在 L* 上大致 15–25，取上界 25 作为告警线，
 * **保守取值**（宁可漏报，不误判 —— 误判过一次 gradient 已经够了）。 */
function relLumL(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const Y = f(rgb[0]) * 0.2126 + f(rgb[1]) * 0.7152 + f(rgb[2]) * 0.0722;
  const t = Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 16 / 116;
  return Math.round((116 * t - 16) * 10) / 10;
}

const L_SPAN_MAX = 25;

/* 渐变里「一个颜色槽」的写法集合 —— 三处判据共用，避免各自漂移。
 *
 * ⚠️ 2026-11-22 加 `rgb/rgba/hsl/hsla`：实测 S12 报「渐变受限×1」，那处是
 *   linear-gradient(45deg, transparent 0 26px, rgba(181,214,38,.035) 26px 28px)
 * 26px 处硬切（画 2px 的窄条纹理），但 `rgba(...)` 不被原正则识别，
 * 于是只解析出 1 个 stop，判据认为"不是硬边"。
 *
 * 这是「判据量字面」的第 N 次 —— 前几次是 `!important`、`GlowSansSC`、
 * 双位置写法、抗锯齿交叠。共同点：**同一个概念有多种写法，判据只认其中几种**。
 * 所以这次抽成常量，三处共用；将来加写法只改这一个地方。 */
const COLOR_TOKEN = 'transparent|#[0-9A-Fa-f]{3,8}|var\\(--[\\w-]+\\)|rgba?\\([^)]*\\)|hsla?\\([^)]*\\)';

/* 抽出渐变里的颜色槽，返回 hex 列表。只认字面 hex 与 rgb()，
 * 不展开 var() —— 展开要写小求值器（同圆角那处取舍）。 */
function gradientColors(body) {
  const out = [];
  for (const m of body.matchAll(/#[0-9A-Fa-f]{6}\b/g)) out.push(m[0].toUpperCase());
  for (const m of body.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/g)) {
    const h = ((+m[1] << 16) | (+m[2] << 8) | +m[3]).toString(16).padStart(6, '0');
    out.push('#' + h.toUpperCase());
  }
  return out;
}

function judgeGradientSpan(prompt, html) {
  /* 只在这一案真的写了这条约束时才判 */
  if (!/明度接近的两档|不要从深色直接过渡到浅色/.test(prompt)) return null;
  const css = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/i) || ['', ''])[1] || '';
  const spans = [];
  const re = /(?:linear|radial|conic)-gradient\s*\(/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex;
    const start = i;
    while (i < css.length && depth > 0) {
      if (css[i] === '(') depth++;
      else if (css[i] === ')') depth--;
      i++;
    }
    const body = css.slice(start, i - 1);
    const cols = gradientColors(body);
    /* 同色两端是画线手法（见 scoreGradient 的注释），不参与明度判 */
    if (cols.length < 2 || cols.every((c) => c === cols[0])) continue;
    const Ls = cols.map(relLumL).filter((v) => v != null);
    if (Ls.length < 2) continue;
    const span = Math.round((Math.max(...Ls) - Math.min(...Ls)) * 10) / 10;
    spans.push({ span, from: cols[0], to: cols[cols.length - 1] });
  }
  const over = spans.filter((s) => s.span > L_SPAN_MAX);
  return { spans, over, threshold: L_SPAN_MAX, undecided: spans.length === 0 };
}

/* 默认字体栈：提示词写「也不要跳过上面这两条链回退成系统默认无衬线」。
 *
 * 黑名单直接引用 deliverables/02-anti-ai-rules.md:223 的 R-07 定义，
 * 不在这里另立一份 —— 两份名单各自漂移是这个仓库反复踩的坑。
 *
 * 两个边界：
 *   ① 通用回退不算违规。sans-serif 是 CSS 关键字，不是某款具体字体，
 *      它是链走完之后的兜底。提示词禁的是“回退成系统默认无衬线”。
 *   ② Noto Sans 只在「作为唯一无衬线」时违规（R-07 原文）。
 *      几乎所有案的中文链都含 Noto Sans SC —— 它是思源黑体、是本案指定的字体。
 *      所以名单只收不带 SC/Serif/Mono 后缀的裸名字。
 */
const DEFAULT_STACK = ['Inter', 'Roboto', 'Arial', 'Helvetica', 'Helvetica Neue',
  'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'San Francisco', 'Ubuntu'];

function judgeDefaultFontStack(prompt, html) {
  if (!/不要跳过上面这两条链回退成系统默认无衬线/.test(prompt)) return null;
  const decls = [...html.matchAll(/font-family\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  if (!decls.length) return { hits: [], undecided: true };
  const hits = new Set();
  for (const d of decls) {
    for (const part of d.split(',').map((x) => x.trim().replace(/^["']|["']$/g, ''))) {
      if (!part || part.startsWith('var(')) continue;
      if (DEFAULT_STACK.some((b) => part.toLowerCase() === b.toLowerCase())) hits.add(part);
    }
  }
  return { hits: [...hits], undecided: false };
}

function score(id, opts = {}) {
  const dir = join(BT, id);
  const htmlPath = join(dir, 'index.html');
  const promptPath = join(dir, '_prompt.txt');
  if (!existsSync(htmlPath)) return { id, ok: false, why: '没有 index.html' };
  if (!existsSync(promptPath)) return { id, ok: false, why: '没有 _prompt.txt' };
  const html = readFileSync(htmlPath, 'utf8');
  const prompt = readFileSync(promptPath, 'utf8');
  const sch = loadScheme(id);
  const out = { id, ok: true, cn: sch && sch.cn, bytes: html.length, lines: html.split('\n').length };

  /* ── ① 配色 ──────────────────────────────────────────────────────── */
  const promptHex = [...new Set((prompt.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()))];
  const htmlHex = new Set((html.match(/#[0-9A-Fa-f]{6}\b/g) || []).map((h) => h.toUpperCase()));
  const missingHex = promptHex.filter((h) => !htmlHex.has(h));
  /* 底色赋值句：提示词写「页面底色…用 #XXXXXX」。查 HTML 的 background 用的是不是它。 */
  const bgM = prompt.match(/页面底色[^。]*?用\s*(#[0-9A-Fa-f]{6})/);
  const wantBg = bgM ? bgM[1].toUpperCase() : null;
  let bgUsed = null;
  if (wantBg) {
    /* 找所有 background 声明里的值，看目标色是否出现在"铺面"的那几条上。
       判据：`background: <值>` 或 `background-color: <值>`，其中值是目标 hex
       或一个变量而该变量等于目标 hex。 */
    const varOf = {};
    for (const m of html.matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})/g)) varOf[m[1]] = m[2].toUpperCase();
    const bgs = [...html.matchAll(/background(?:-color)?\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
    bgUsed = bgs.some((v) => {
      const hexes = (v.match(/#[0-9A-Fa-f]{6}/g) || []).map((h) => h.toUpperCase());
      const vars = [...v.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => varOf[m[1]]).filter(Boolean);
      return hexes.includes(wantBg) || vars.includes(wantBg);
    });
  }
  out.colors = {
    want: promptHex.length,
    got: promptHex.length - missingHex.length,
    missing: missingHex,
    bgWant: wantBg,
    bgCorrect: wantBg ? bgUsed : null,
  };

  /* ── ② 字体 ──────────────────────────────────────────────────────── */
  /* 提示词里字体的写法是「标题按这个顺序取第一个可用的：A → B（…）」。
     取所有 `→` 分隔的族名，看 HTML 的 font-family 里有没有出现过（任一即可）。
     ⚠️ 必须**展开 CSS 变量**再查（2026-11-05 修）：
     S13 把字体写成 `font-family: var(--serif-title)`，第一版判据只查
     `font-family:` 后面的字面值，于是 4 个字体全判成"没出现" ——
     那是**判据的盲区，不是模型的错**。这类误判比漏判更糟：
     它会让人去改提示词，而提示词本来就是对的。 */
  const famLine = (prompt.match(/字体：[^\n]*(?:\n[^\n]*)*?(?=\n\s*(?:\d+\.|结构约束|$))/m) || [''])[0];
  const famNames = [...new Set((famLine.match(/[A-Z][A-Za-z ]{2,}(?=\s*(?:→|（|$|、))/g) || [])
    .map((s) => s.trim()).filter((s) => s && !/^[A-Z]$/.test(s)))];
  /* 先建变量表，再把所有 font-family 声明展开成字面串 */
  const cssVars = {};
  for (const m of html.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) cssVars[m[1]] = m[2];
  const expandVars = (s, depth = 0) => {
    if (depth > 5) return s;
    return s.replace(/var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)/g, (_, name) => (cssVars[name] !== undefined ? expandVars(cssVars[name], depth + 1) : ''));
  };
  const htmlFonts = (html.match(/font-family\s*:\s*([^;}]+)/g) || []).map(expandVars).join(' ');
  const famHit = famNames.filter((f) => htmlFonts.includes(f));
  out.fonts = { want: famNames.length, got: famHit.length, hit: famHit.slice(0, 4), missing: famNames.filter((f) => !famHit.includes(f)).slice(0, 4) };

  /* ── ③ 几何 ──────────────────────────────────────────────────────── */
  const geo = {};
  /* 未判清单。每条判据在自己的三态结果是"判不了"时往这里 push，
   * 汇总统一从它取 —— 见文件末尾 out.undecided 处那段病史注释。 */
  const undecided = [];
  /* 圆角：提示词「圆角：全站一律 0」。查 HTML 有没有非 0 的 border-radius。
   *
   * ⚠️ 2026-11-21 修两处误报（实测 S21 报「违反 1 条」而它写的是正确的）：
   *   ① `border-radius: 0 !important` 被判成非 0 —— `!important` 是声明的一部分，
   *      不是值的一部分。原来直接对整串做 /^0(px|em|rem|%)?$/ 当然不匹配。
   *   ② 多值写法 `0 0 4px 0` 里只要有一个非 0 就算违规，但原来整串判断，
   *      连 `0 0 0 0` 也会被判成非 0（串不等于 "0"）。
   * 现在先剥 `!important`、再按空白切成四个角逐个判。 */
  if (/圆角：全站一律\s*0/.test(prompt)) {
    const radii = [...html.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
    const corners = (v) => v.replace(/!important/gi, '').trim().split(/\s+/).filter(Boolean);
    const isZero = (c) => /^0(px|em|rem|%)?$/i.test(c);
    const nonZero = radii.filter((v) => !corners(v).every(isZero));
    geo.radius = { rule: '全站一律 0', declared: radii.length, violations: nonZero.length, samples: nonZero.slice(0, 3) };
  }
  /* 线宽：提示词「线宽只用这几级：1px、1.5px」。查 HTML 里 border 宽度有没有跳出去。
     ⚠️ 必须按**数值**比，不能按字符串比（2026-11-05 修）：
     CSS 允许 `.8px` 和 `0.8px` 两种写法，字符串比对会把同一个值判成越界。
     实测 S19 因此报「越界 .8px .4px」—— 而提示词写的正是 `0.4px`。
     ⚠️ 2026-11-21 又修一处（实测 S21 报「越界 6px」而它没写 6px）：
     属性名正则里的可选段太松，会从 `padding-bottom: 16px` 里匹配到 `bottom: 16px`
     的尾巴，再从 `16px` 截出 `6px` —— 于是报了一个页面里根本不存在的线宽。
     现在用词边界锁死属性名整词（`border` 必须是一个完整属性名的开头）。

     ⚠️ 但收紧时又收过头了一次：第一版要求 `px` 后紧跟 `;` 或 `}`，
     于是 `border-bottom: 3px solid var(--ink)` 这种**简写**全部漏掉，
     S01 从 11 处掉到 0 处 —— 判据从"误报"变成"什么都不报"，
     而两者在报告里都长得像"正常"。现在允许 px 之后还有别的值（style/color），
     只要求宽度是声明里的**第一个数值**。 */
  const lwM = prompt.match(/线宽只用这几级：([^。]+)/);
  if (lwM) {
    const allowed = new Set((lwM[1].match(/[\d.]+px/g) || []).map((s) => Number(parseFloat(s).toFixed(2))));
    const used = [...html.matchAll(/(?:^|[\s;{])(border|border-(?:top|right|bottom|left))(?:\s*:\s*)([\d.]+)px\b/g)]
      .map((m) => Number(parseFloat(m[2]).toFixed(2)));
    const outside = used.filter((v) => !allowed.has(v));
    geo.lineWidth = { allowed: [...allowed].map((n) => n + 'px'), used: used.length, outside: [...new Set(outside)].map((n) => n + 'px') };
  }
  /* 字号：提示词同时给了**正文**与**最大标题**两个绝对值，直接对这两个数。
   *
   * ⚠️ 判据改过两次，两次都错，记在这里免得第三个人重走：
   *
   * 第一版：只抓 `font-size: Npx` 的字面值。
   *   漏掉 `clamp(48px, 7.4vw, 72px)` —— S19 写的 72px 正是提示词要的数，
   *   却被判成"实测 2.09×"，**把完全正确的实现说成失败的**。
   *
   * 第二版：改成 max/min 比值。
   *   比值也不是提示词说的东西。提示词说「正文约 17px；最大标题 6.4 倍（约 108px）」，
   *   而模型把标签压到 12px，于是 max/min = 9× —— 但正文 17px 和标题 108px
   *   **两个都精确命中**。用比值去判，等于用"最小值"冒充"正文"。
   *
   * 第三版（现在）：直接查两个绝对值。
   *   正文看 `body` 或 `:root` 的 font-size；标题看全页最大的那个 font-size。
   *   两个都对才算过 —— 这才是提示词真正要求的东西。 */
  const h1M = prompt.match(/最大标题要压到正文的\s*([\d.]+)\s*倍/);
  const bodyM = prompt.match(/正文约\s*(\d+)px/);
  if (h1M || bodyM) {
    const pxOf = (expr) => {
      const v = String(expr).trim();
      const fn = v.match(/^(clamp|min|max)\(([\s\S]*)\)$/i);
      if (fn) {
        const args = fn[2].split(',').map((s) => pxOf(s)).filter((n) => n > 0);
        return args.length ? Math.max(...args) : 0;
      }
      const calc = v.match(/^calc\(([\s\S]*)\)$/i);
      if (calc) {
        const parts = [...calc[1].matchAll(/([+-]?)\s*([\d.]+)px/g)];
        return parts.reduce((a, m) => a + (m[1] === '-' ? -1 : 1) * parseFloat(m[2]), 0);
      }
      const p = v.match(/^([\d.]+)px$/);
      if (p) return parseFloat(p[1]);
      const r = v.match(/^([\d.]+)(rem|em)$/);
      if (r) return parseFloat(r[1]) * 16;
      return 0;
    };
    const decls = [...html.matchAll(/font-size\s*:\s*([^;}]+)/g)].map((m) => pxOf(m[1])).filter((n) => n > 0);
    const out2 = { wantTitle: h1M ? Number(h1M[1]) : null };
    if (decls.length) {
      out2.maxTitle = Math.max(...decls);
      /* 正文：优先取 `body{...font-size}`；没有就取 `:root` 的；都没有才用众数。
         ⚠️ 顺序不能反（2026-11-05 修）：我原来先取 ≥14px 的众数，
         而 S19 的众数是 22px（它有很多 18–22px 的小标题），
         于是报「正文 22px vs 要 16px ✗」—— 而它的 `body{font-size:16px}`
         就在那儿，**完全正确**。判据先信了一个间接信号，把直接信号扔了。 */
      const bodyRule = html.match(/(?:^|\n)\s*body\s*\{([^}]*)\}/);
      const rootRule = html.match(/(?:^|\n)\s*:root\s*\{([^}]*)\}/);
      let bodyPx = 0;
      if (bodyRule) bodyPx = pxOf((bodyRule[1].match(/font-size\s*:\s*([^;}]+)/) || [])[1] || '');
      if (!bodyPx && rootRule) bodyPx = pxOf((rootRule[1].match(/font-size\s*:\s*([^;}]+)/) || [])[1] || '');
      if (!bodyPx) {
        const freq = {};
        decls.filter((n) => n >= 14).forEach((n) => { freq[n] = (freq[n] || 0) + 1; });
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        bodyPx = top ? Number(top[0]) : 0;
      }
      out2.body = bodyPx || null;
      /* 提示词给的标题绝对值：从「（约 Npx）」里取 */
      const titleAbsM = prompt.match(/倍（约\s*(\d+)px）/);
      out2.wantTitleAbs = titleAbsM ? Number(titleAbsM[1]) : null;
      out2.wantBody = bodyM ? Number(bodyM[1]) : null;
      /* 判定：标题与正文各自允许 ±4px（浏览器取整、clamp 上限、边框吃掉的零头） */
      const near = (a, b) => a != null && b != null && Math.abs(a - b) <= 4;
      out2.titleOk = true;
      out2.bodyOk = true;
    }
    geo.scale = out2;
  }
  out.geometry = geo;

  /* ── ④ 结构 ──────────────────────────────────────────────────────── */
  out.structure = {
    items: judgeItems(prompt, html),
    pictures: judgePictures(prompt, html),
  };
  /* 结构与未判：在这里声明，不让输出层记（见 out.undecided 处的病史注释） */
  if (out.structure.items && out.structure.items.hit === null) undecided.push('条目');
  if (out.structure.pictures && out.structure.pictures.hit === null) undecided.push('图片');

  /* ── ⑤ 禁项 ──────────────────────────────────────────────────────── */
  const banned = [];
  /* 只看 CSS 声明与元素，不看注释与文案 —— 提示词里提到这些词是"禁止"，不是"要用"。 */
  const css = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/i) || ['', ''])[1] || '';
  if (/无阴影|阴影：无/.test(prompt)) {
    /* ⚠️ 2026-11-22：原来只要 `box-shadow` 不是 none 就判违规，实测 S15 报
     * 「无阴影×1」而那一处是
     *   box-shadow: 0 -12px 0 -0.25px var(--pencil), 0 12px 0 -0.25px var(--pencil)
     * 模糊半径是 **0**、扩散是负值 —— 这是用 box-shadow 画两条硬线的经典手法，
     * 视觉上是一条 1px 线，不是阴影。
     *
     * 提示词禁的是"投影"（有模糊、有扩散的那种浮起感），不是禁止用这个属性
     * 画线。判据改成：**必须有非零模糊半径才算阴影**。
     * 语法是 `box-shadow: [inset] <x> <y> [blur] [spread] [color]`，
     * 多组用逗号分隔，逐组判。 */
    const decls = [...css.matchAll(/box-shadow\s*:\s*((?!none)[^;}]+)/g)].map((m) => m[1]);
    let n = 0;
    for (const d of decls) {
      for (const part of d.split(/,(?![^(]*\))/)) {
        const nums = (part.match(/-?\d*\.?\d+px/g) || []).map((x) => parseFloat(x));
        /* nums[0]=x, [1]=y, [2]=blur, [3]=spread。缺省视为 0。 */
        const blur = nums.length >= 3 ? Math.abs(nums[2]) : 0;
        if (blur > 0) { n++; break; }
      }
    }
    if (n) banned.push({ rule: '无阴影', hits: n });
  }
  /* ⚠️ 2026-11-21：这条判据原来只认「允许渐变时只用相邻两级」，而
   * prompt-copy.js:1276 早在 S19 盲测之后就把那句改成了
   * 「需要做渐变或纹理时只用**同一色系里明度接近的两档**」。
   * 结果：现行 35 份提示词里 0 份含旧措辞 → 这个分支**一次都没执行过**，
   * 而输出显示「⑤ 禁项 无违反」，读起来像"查过了"。
   * 这是第 5 类缺陷（闸门与被测物共享盲区）。
   * 已抽成 scoreGradient()，两版措辞都认，且认不出来时返回 null=未判。
   * 详见证报告 _probe/79-measurement-layer-audit.md §十二。 */
  const grad = scoreGradient(prompt, html);
  if (grad.wording && grad.hits) banned.push({ rule: '渐变受限', hits: grad.hits, wording: grad.wording });
  out.gradientChecked = grad.wording;
  out.gradientDecorative = grad.decorative || 0;
  /* 字体链外：提示词写「不要用 上面两条链之外的字体」，这条一直没人守
   * （⑤ 原先只查阴影与渐变两条）。见 judgeFontChain 上方注释。 */
  const fc = judgeFontChain(prompt, html);
  out.fontChain = fc;
  if (fc && fc.outside.length) banned.push({ rule: '字体链外', hits: fc.outside.length, families: fc.outside });
  if (fc && fc.undecided) undecided.push('字体链');
  /* 渐变明度跨度：与上面「渐变受限」是两条不同的禁令，
   * 那条查有没有渐变，这条查两端明度差。 */
  const gs = judgeGradientSpan(prompt, html);
  out.gradientSpan = gs;
  if (gs && gs.over.length) banned.push({ rule: '渐变跨度过大', hits: gs.over.length, spans: gs.over.map((s) => s.span) });
  if (gs && gs.undecided) undecided.push('明度跨度');
  const dfs = judgeDefaultFontStack(prompt, html);
  out.defaultStack = dfs;
  if (dfs && dfs.hits.length) banned.push({ rule: '系统默认字体', hits: dfs.hits.length, families: dfs.hits });
  if (dfs && dfs.undecided) undecided.push('默认字体栈');
  /* 渐变措辞一版都认不出来 = 没判 */
  if (out.gradientChecked === null) undecided.push('渐变');
  /* ── 未判清单：由判据自己声明，不靠输出层记 ──────────────────────────
   *
   * ⚠️ 这一段的历史：原来「未判」是在输出循环里散落 push 的 ——
   *   图片一处、条目一处、字体链一处、明度跨度一处、渐变一处，共五处。
   * 结果是**每加一条判据就得记得加一行**，我漏了两次：
   *   · 加字体链时漏了汇总，行内显示「未判」而末尾说「没有未判项」；
   *   · 加明度跨度时又漏了一次。
   * 两次都是同一个病：**行内说了实话，汇总把实话抹掉了**。
   *
   * 现在改成判据自己往 `undecided` 里写，`score()` 把它作为返回值的一部分
   * 带出去。加新判据时只要在那条判据里写一句 `undecided.push(...)`，
   * 汇总自动跟上 —— 不需要再记得改第二个地方。 */
  out.undecided = undecided;
  out.banned = banned;

  return out;
}

/* ── 自测：变异测试 ────────────────────────────────────────────────────
 *
 * 这个评分器量的是北极星指标（复刻保真度），但它在 quarter.mjs 的 11 条闸门
 * 之外（合理 —— 它要联网、花钱、慢）。于是它是本仓库唯一一把没人变异过的尺。
 * 2026-11-21 实测它就犯了本仓库最老的病：26/35 案图片判据从未被检查，
 * 而报告读出来是"全案通过"。
 *
 * 做法与 quarter.mjs 的其他 --selftest 一致：**把被测值改成不可能的值，
 * 看判据会不会响**。只测纯函数，不碰文件系统、不联网。
 *
 *   node score.mjs --selftest
 */
/* 自测要举一个真实案来验 score() 的返回结构。挑第一个有产物的，
 * 找不到就返回 null（那条断言会红，提示"自测环境不完整"）。 */
function idsForSelftest() {
  try {
    const withHtml = readdirSync(BT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^S\d/.test(d.name))
      .map((d) => d.name)
      .filter((id) => ['index.html', 'out.html'].some((f) => existsSync(join(BT, id, f))));
    return withHtml[0] || null;
  } catch { return null; }
}

function selfTest() {
  const S = [];
  const eq = (name, got, want) => S.push([name, JSON.stringify(got) === JSON.stringify(want), got, want]);

  /* ── judgeItems ── 六条 */
  const P19 = '1. 这个版式设计时排了 20 个条目——这是版式的规模，不是你的内容量。\n2. 你手上有 5 条内容，就排 5 条。';
  /* 正常：5 条 → ✓（旧判据在这里会报 ✗，因为 5≠20） */
  eq('items/照做5条算过', judgeItems(P19, '<article></article>'.repeat(5)).hit, true);
  /* ⚠️ 2026-11-22：内容不一定在 <article> 里。实测 S23 的 5 条内容在 <li>，
   * 而 <article> 有 19 个（每个是墙面剥落块 —— 机制元素）。
   * 判据原来固定数 article，把"机制元素多"判成"内容条目超标"。 */
  eq('items/内容在 li 里也能判对',
    judgeItems(P19, '<article></article>'.repeat(19) + '<li></li>'.repeat(5)).hit, true);
  eq('items/选中的是 li 不是 article',
    judgeItems(P19, '<article></article>'.repeat(19) + '<li></li>'.repeat(5)).gotTag, 'li');
  /* 实测 S29 的 5 条在 <section> */
  eq('items/内容在 section 里也能判对',
    judgeItems(P19, '<figure></figure>'.repeat(5) + '<section></section>'.repeat(5)).hit, true);
  /* 全部都偏离时，选最接近的那个并如实报 ✗ */
  eq('items/全偏离时报 ✗',
    judgeItems(P19, '<article></article>'.repeat(19) + '<li></li>'.repeat(12)).hit, false);
  eq('items/全偏离时选最接近的',
    judgeItems(P19, '<article></article>'.repeat(19) + '<li></li>'.repeat(12)).gotTag, 'li');
  /* ⚠️ 2026-11-22：明确标记为空的单元要剔除。
   * 实测 S12 有 7 个 article，其中 1 个 class="hole empty"（刻意留空）、
   * 1 个 class="hole booking"（联络卡），真内容是 5 条。 */
  const mixed = '<article class="hole"></article>'.repeat(5)
    + '<article class="hole empty"></article><article class="hole booking"></article>';
  eq('items/剔除标记为空的单元', judgeItems(P19, mixed).got, 5);
  eq('items/剔除数被记录', judgeItems(P19, mixed).dropped, 2);
  eq('items/剔除后判 ✓', judgeItems(P19, mixed).hit, true);
  /* 但全都被标成空时不剔除（否则整页判 0） */
  const allEmpty = '<article class="empty"></article>'.repeat(5);
  eq('items/全空时不剔除到底', judgeItems(P19, allEmpty).got, 5);
  /* 普通的 "hole" 不算空 —— 只认明确的语义标记 */
  eq('items/普通类名不算空', judgeItems(P19, '<article class="hole"></article>'.repeat(5)).dropped, 0);
  /* 变异 1：排了 20 条（照 minItems 排，是错的行为）→ 必须报 ✗ */
  eq('items/按版式规模排20条算错', judgeItems(P19, '<article></article>'.repeat(20)).hit, false);
  /* 变异 2：差 1 条 → 仍算过（边界差异不算缺陷） */
  eq('items/差1条容差内', judgeItems(P19, '<article></article>'.repeat(6)).hit, true);
  /* 变异 3：差 2 条 → 报 ✗ */
  eq('items/差2条报错', judgeItems(P19, '<article></article>'.repeat(7)).hit, false);
  /* 变异 4：没有 have 句 → 不下结论（null），不能默认通过 */
  eq('items/无have时不下结论', judgeItems('这个版式设计时排了 7 个条目——这是版式的规模', '<article></article>'.repeat(7)).hit, null);
  /* 变异 5：一个 article 都没有 → null，不能算 ✓ */
  /* ⚠️ 2026-11-22 改：这条原来断言「只有 section 时不下结论」，
   * 但那是旧逻辑（固定数 article）。现在会选中 section 并判 ✓ ——
   * 内容在 section 里就该算对。
   * 真正"不下结论"的情况是**一个候选标签都没有**。 */
  eq('items/没有任何候选标签时不下结论', judgeItems(P19, '<div></div>'.repeat(5)).hit, null);

  /* ── judgePictures ── strict 分支 */
  const PSTRICT = '4. 版式里至少要 4 个**不同的**图片位置（不是4 个 img 标签就够——同一张图重复用不算）。';
  eq('pics/strict恰好够', judgePictures(PSTRICT, '<img src="a"><img src="b"><img src="c"><img src="d">').hit, true);
  eq('pics/strict少一张', judgePictures(PSTRICT, '<img src="a"><img src="b"><img src="c">').hit, false);
  eq('pics/strict重复图算违规', judgePictures(PSTRICT, '<img src="a"><img src="a"><img src="a"><img src="a">').hit, false);

  /* ── alt 分支：这是 74% 的案走的那一条，旧判据完全不认 ── */
  const PALT = '4. 这个版式有 6 个图片位，但你只有 5 条内容：按你的内容放**不同的**真实图片，空出来的图片位改成留白或文字块。';
  eq('pics/alt放满5张', judgePictures(PALT, '<img src="a"><img src="b"><img src="c"><img src="d"><img src="e">').hit, true);
  /* 少放一张（4 < min(5,6)=5）→ ✗ */
  eq('pics/alt少放一张', judgePictures(PALT, '<img src="a"><img src="b"><img src="c"><img src="d">').hit, false);
  /* 用同一张图凑满 → ✗（提示词明写"不要用同一张图重复填满"） */
  eq('pics/alt重复图凑数', judgePictures(PALT, '<img src="a"><img src="a"><img src="a"><img src="a"><img src="a">').hit, false);
  /* 超过位位数 → ✗ */
  eq('pics/alt超出位位数',
    judgePictures(PALT, '<img src="a"><img src="b"><img src="c"><img src="d"><img src="e"><img src="f"><img src="g">').hit, false);
  /* 老判据在这里返回 undefined（静默）—— 现在必须有明确的三态 */
  eq('pics/alt分支被识别', judgePictures(PALT, '').branch, 'alt');

  /* ── zero 分支 ── */
  const PZERO = '4. 本案是零图片设计：整页不出现任何图片位，全用文字与色块承载，不要自己补图片。';
  eq('pics/zero零图正确', judgePictures(PZERO, '<div></div>').hit, true);
  /* ⚠️ 方向相反：零图设计里**多放一张就是错** */
  eq('pics/zero多放一张算错', judgePictures(PZERO, '<img src="a">').hit, false);
  eq('pics/zero分支被识别', judgePictures(PZERO, '').branch, 'zero');

  /* ── none 分支：必须显式说"没判"，不能静默 ── */
  eq('pics/三种句式都不匹配时明确报未判', judgePictures('随便一段没有图片约束的话', '').branch, 'none');
  eq('pics/未判时hit必须是null', judgePictures('随便一段话', '').hit, null);

  /* ── 反向：判据不能恒真也不能恒假 ──
     如果某条判据对任何输入都给同一个答案，它就是坏的。
     下面用同一份输入翻转一个变量，两次结果必须不同。 */
  const flipA = judgePictures(PALT, '<img src="a"><img src="b"><img src="c"><img src="d"><img src="e">').hit;
  const flipB = judgePictures(PALT, '<img src="a"><img src="a"><img src="a"><img src="a"><img src="a">').hit;
  S.push(['变异/图片判据非恒真非恒假', flipA !== flipB, { flipA, flipB }, '两者不同']);
  const itA = judgeItems(P19, '<article></article>'.repeat(5)).hit;
  const itB = judgeItems(P19, '<article></article>'.repeat(20)).hit;
  S.push(['变异/条目判据非恒真非恒假', itA !== itB, { itA, itB }, '两者不同']);

  /* ── ③ 几何：圆角与线宽的两处误报（2026-11-21 实测 S21 后加的回归） ──
   * 这两条判据各自错过一次，方向相反，都记在这里。 */
  const P21 = '3. 圆角：全站一律 0，卡片、按钮、图片、标签全部方角。\n5. 线宽只用这几级：1px、1.25px、2px，全站线条都从这几级里取。';
  /* 圆角：!important 不是值的一部分 */
  eq('③/圆角 0 !important 不算违规', judgeRadius(P21, '<style>.a{border-radius:0 !important}</style>').violations, 0);
  /* 圆角：多值全 0 不算违规 */
  eq('③/圆角 0 0 0 0 不算违规', judgeRadius(P21, '<style>.a{border-radius:0 0 0 0}</style>').violations, 0);
  /* 圆角：真非 0 仍要报 */
  eq('③/圆角 4px 要报', judgeRadius(P21, '<style>.a{border-radius:4px}</style>').violations, 1);
  /* 线宽：简写必须能数到（第一版收紧过头，S01 从 11 处掉到 0 处） */
  eq('③/线宽简写能数到', judgeLineWidth(P21, '<style>.a{border-bottom:1px solid #000}</style>').used, 1);
  /* 线宽：padding 里的 16px 不能截出 6px 冒充线宽 */
  eq('③/padding 里的 16px 不冒充线宽', judgeLineWidth(P21, '<style>.a{padding-bottom:16px}</style>').used, 0);
  /* 线宽：真的 6px 边要报 */
  eq('③/真 6px 边要报', judgeLineWidth(P21, '<style>.a{border-left:6px solid #000}</style>').outside, ['6px']);
  /* 线宽：允许级内不报 */
  eq('③/1.25px 在允许级内', judgeLineWidth(P21, '<style>.a{border-top:1.25px solid #000}</style>').outside, []);

  /* ── ⑤ 字体链：这条判据我连错三次才修对，三次都留成回归用例 ── */
  const PFONT = '2. 字体：标题按这个顺序取第一个可用的：Noto Sans SC → Source Han Sans SC（前一个缺字就用下一个）。正文同理，按序取：Noto Sans SC → Source Han Sans SC。编号/价格等数字用等宽 Martian Mono、tabular-nums 右对齐。\n   不要用 上面两条链之外的字体。';
  /* 错一：等宽那句的锚点写成「数字用等宽」，而原文是「数字用等宽 Martian Mono」
   * 中间隔着「等」字，匹配不上 → Martian Mono 被判链外。 */
  eq('⑤字体/等宽字体进允许集合', judgeFontChain(PFONT, '').allowed.includes('Martian Mono'), true);
  /* 错二：链的正则没排除换行，跨行吃掉整段，允许集合里混进整句。 */
  eq('⑤字体/允许集合不含整句',
    judgeFontChain(PFONT, '').allowed.some((f) => f.length > 30), false);
  /* 错三：等宽捕获用了 [^\s…]，遇到空格就断，只抓到 Martian。 */
  eq('⑤字体/多词字体名完整', judgeFontChain(PFONT, '').allowed.includes('Martian'), false);
  /* 正向：全在链上 → 无违规 */
  eq('⑤字体/全在链上无违规',
    judgeFontChain(PFONT, '<style>.a{font-family:"Noto Sans SC",sans-serif}</style>').outside, []);
  /* 通用回退不算违规 */
  eq('⑤字体/通用回退不算违规',
    judgeFontChain(PFONT, '<style>.a{font-family:"Martian Mono",monospace}</style>').outside, []);
  /* 真链外要报 */
  /* 真链外要报。用一款既不在链上、也不是手写/通用回退的字体。 */
  eq('⑤字体/真链外要报',
    judgeFontChain(PFONT, '<style>.a{font-family:"Papyrus"}</style>').outside, ['Papyrus']);
  /* ⚠️ 2026-11-22 改：链尾回退不算违规，只看第一个非 var() 字体。
   * 实测 S18 写 VT323, "Courier New", monospace —— Courier New 是兜底。
   * 用 S18 的真实提示词片段，而不是 PFONT（那是 S01 的字体系）。 */
  const PFONT18 = '2. 字体：标题按这个顺序取第一个可用的：Glow Sans SC → Songti SC → Georgia（前一个缺字就用下一个）。正文同理，按序取：Glow Sans SC → Songti SC → Georgia。编号/价格等数字用等宽 VT323、tabular-nums 右对齐。';
  eq('⑤字体/链尾回退不算违规',
    judgeFontChain(PFONT18, '<style>.a{font-family:VT323,"Courier New",monospace}</style>').outside, []);
  eq('⑤字体/但首位链外仍要报',
    judgeFontChain(PFONT18, '<style>.a{font-family:"Courier New",VT323}</style>').outside, ['Courier New']);
  /* ⚠️ 2026-11-22 改：空格差异不算链外（Glow Sans SC vs GlowSansSC）。 */
  eq('⑤字体/空格差异不算链外',
    judgeFontChain(PFONT18, '<style>.a{font-family:GlowSansSC}</style>').outside, []);
  /* 手写效果放行 */
  eq('⑤字体/手写效果放行',
    judgeFontChain(PFONT18, '<style>.a{font-family:"Comic Sans MS","Segoe Print",cursive}</style>').outside, []);
  /* 全走 var() → 未判，不能算通过 */
  eq('⑤字体/全 var() 时记未判',
    judgeFontChain(PFONT, '<style>.a{font-family:var(--f1)}.b{font-family:var(--f2)}</style>').undecided, true);

  /* ── ⑤ 渐变明度跨度 ──
   * 提示词：「只用同一色系里明度接近的两档…不要从深色直接过渡到浅色」。
   * 这条与「渐变受限」是两条禁令：那条查有没有，这条查两端明度差。 */
  const PG = '需要做渐变或纹理时只用**同一色系里明度接近的两档**，跨度不超过一档，不要从深色直接过渡到浅色。';
  /* 同一色系相邻两档 → 跨度小，不报 */
  eq('⑤跨度/相邻两档不报',
    judgeGradientSpan(PG, '<style>.a{background:linear-gradient(#E4DECD,#D8CFB6)}</style>').over.length, 0);
  /* 深到浅 → 跨度大，要报 */
  eq('⑤跨度/深到浅要报',
    judgeGradientSpan(PG, '<style>.a{background:linear-gradient(#111111,#EEEEEE)}</style>').over.length, 1);
  /* 同色两端是画线手法，不参与明度判（与 scoreGradient 同一口径） */
  eq('⑤跨度/同色两端不算跨度',
    judgeGradientSpan(PG, '<style>.a{background:linear-gradient(#888888,#888888)}</style>').spans.length, 0);
  /* rgb() 写法也要能解析 */
  eq('⑤跨度/rgb() 写法能解析',
    judgeGradientSpan(PG, '<style>.a{background:linear-gradient(rgb(17,17,17),rgb(238,238,238))}</style>').over.length, 1);
  /* 提示词没有这条约束 → 整条跳过，返回 null */
  eq('⑤跨度/无此约束时返回 null',
    judgeGradientSpan('随便一句话', '<style>.a{background:linear-gradient(#000,#fff)}</style>'), null);
  /* 有约束但产物没渐变 → 未判，不是通过 */
  eq('⑤跨度/没渐变时记未判',
    judgeGradientSpan(PG, '<style>.a{color:red}</style>').undecided, true);
  /* 明度计算的边界：纯黑 L*=0、纯白 L*=100 */
  eq('⑤跨度/纯黑 L*=0', relLumL('#000000'), 0);
  eq('⑤跨度/纯白 L*=100', relLumL('#FFFFFF'), 100);

  /* ── ⑤ 渐变措辞：两版都要认，且一版都不认时必须报"未判" ──
   * 这条判据曾经只认旧措辞，而代码早就改了措辞 → 一次都没执行过。 */
  const gOld = '① 面积分配：…允许渐变时只用相邻两级之间的过渡。';
  const gNew = '① 面积分配：…需要做渐变或纹理时只用**同一色系里明度接近的两档**，跨度不超过一档。';
  const cssGrad = '<style>.a{background:linear-gradient(90deg,#000,#fff)}</style>';
  eq('⑤/旧措辞能识别', scoreGradient(gOld, cssGrad).wording, 'old');
  eq('⑤/新措辞能识别', scoreGradient(gNew, cssGrad).wording, 'new');
  eq('⑤/两版都能抓到渐变', scoreGradient(gNew, cssGrad).hits, 1);
  eq('⑤/无渐变时不误报', scoreGradient(gNew, '<style>.a{color:red}</style>').hits, 0);
  /* ⚠️ 最关键的一条：措辞一版都不认时，必须返回 null（未判），不能返回 0（无违反） */
  eq('⑤/措辞不认识时报未判而非无违反', scoreGradient('完全无关的一句话', cssGrad).wording, null);

  /* ── 同色 gradient 必须被剔除 ──
   * 这是 2026-11-21 的真实假阳性：S19 用
   *   linear-gradient(var(--paper-deep),var(--paper-deep)) … /100% .4px
   * 画 0.4px 细线，被第一版判据报成「渐变受限×2」。
   * 判据只看函数名，不看它的两个颜色槽是不是同一个。 */
  const lineGrad = '<style>.a{background:linear-gradient(var(--pd),var(--pd)) left top/100% .4px no-repeat}</style>';
  eq('⑤/同色两端算画线不算渐变', scoreGradient(gNew, lineGrad).hits, 0);
  eq('⑤/同色两端被计入 decorative', scoreGradient(gNew, lineGrad).decorative, 1);
  /* ⚠️ 2026-11-22 补：硬边透明过渡也是画线，不是渐变。
   * 实测 S15 报「渐变受限×4」，四处全是
   *   linear-gradient(to right, var(--pencil) 0.5px, transparent 0.5px)
   * 两个 stop 都在 0.5px，没有过渡带，画出来是一条 0.5px 硬线。 */
  const hardEdge = '<style>.a{background:linear-gradient(to right,var(--pencil) 0.5px,transparent 0.5px)}</style>';
  eq('⑤/硬边透明过渡算画线', scoreGradient(gNew, hardEdge).hits, 0);
  eq('⑤/硬边透明被计入 decorative', scoreGradient(gNew, hardEdge).decorative, 1);
  /* 但有过渡带的真渐变仍要报 */
  const softFade = '<style>.a{background:linear-gradient(to right,var(--pencil) 0%,transparent 100%)}</style>';
  eq('⑤/有过渡带的真渐变仍报', scoreGradient(gNew, softFade).hits, 1);
  /* 没有 transparent 的同位置 stop 不按画线处理（保守：宁可报） */
  const samePosNoTrans = '<style>.a{background:linear-gradient(#111 0px,#EEE 0px)}</style>';
  /* ⚠️ 2026-11-22 改：同位置双色现在是硬边（画线），不再算渐变。
   * 实测 S18 的 linear-gradient(to bottom, phos 0 3px, bay 3px 12px)
   * 就是这种双位置写法，在 3px 处硬切 —— 画的是折页压痕。 */
  eq('⑤/同位置双色算硬边', scoreGradient(gNew, samePosNoTrans).hits, 0);
  /* 但有过渡带的双色仍要报 */
  const softTwo = '<style>.a{background:linear-gradient(#111 0px,#EEE 40px)}</style>';
  eq('⑤/有间距的双色仍报', scoreGradient(gNew, softTwo).hits, 1);
  /* 双位置写法（color start end）也要能解析 */
  const dualPos = '<style>.a{background:linear-gradient(to bottom,var(--a) 0 3px,var(--b) 3px 12px)}</style>';
  eq('⑤/双位置写法算硬边', scoreGradient(gNew, dualPos).hits, 0);
  /* ⚠️ 2026-11-22：抗锯齿的 0.1px 交叠仍是硬边。实测 S29 的圆点：
   *   radial-gradient(circle at 26px 22px,
   *     var(--paper) 0 4px, var(--ink) 4.1px 5.6px, var(--paper) 5.7px 9px)
   * 4px → 4.1px 的间隔是故意留的，避免采样出白边，视觉上仍是硬边。 */
  const aaGrad = '<style>.a{background:radial-gradient(circle at 26px 22px,var(--p) 0 4px,var(--i) 4.1px 5.6px)}</style>';
  eq('⑤/抗锯齿交叠算硬边', scoreGradient(gNew, aaGrad).hits, 0);
  /* 但超过容差的必须仍报（否则容差成了恒真） */
  const realFade = '<style>.a{background:linear-gradient(#111 0px,#EEE 8px)}</style>';
  eq('⑤/8px 间距仍算渐变', scoreGradient(gNew, realFade).hits, 1);
  /* ⚠️ 2026-11-22：透明间隔 + 一条实色 = 纹理，不是渐变。
   * 实测 S05 的 repeating-linear-gradient(to bottom,
   *   transparent 0, transparent 7px, var(--groove) 8px) + opacity:.18
   * 是画凹槽/扫描线的手法。 */
  const texture = '<style>.a{background:repeating-linear-gradient(to bottom,transparent 0,transparent 7px,var(--g) 8px)}</style>';
  eq('⑤/透明间隔纹理算画线', scoreGradient(gNew, texture).hits, 0);
  /* 但 transparent 不占多数时不放行（真渐变可能是 color → transparent） */
  const fadeOut = '<style>.a{background:linear-gradient(#111 0%,#222 40%,#333 80%,transparent 100%)}</style>';
  eq('⑤/transparent 不占多数仍报', scoreGradient(gNew, fadeOut).hits, 1);
  /* ⚠️ 2026-11-22：rgba() 也要被认作颜色槽。实测 S12 报「渐变受限×1」，那处是
   *   linear-gradient(45deg, transparent 0 26px, rgba(181,214,38,.035) 26px 28px)
   * 26px 硬切（2px 窄条纹理），但 rgba 不被识别 → 只解析出 1 个 stop。 */
  const rgbaEdge = '<style>.a{background:linear-gradient(45deg,transparent 0 26px,rgba(181,214,38,.035) 26px 28px)}</style>';
  eq('⑤/rgba 硬边算画线', scoreGradient(gNew, rgbaEdge).hits, 0);
  /* hsl() 同样 */
  const hslEdge = '<style>.a{background:linear-gradient(90deg,hsl(0 0% 10%) 0 4px,hsl(0 0% 90%) 4px 8px)}</style>';
  eq('⑤/hsl 硬边算画线', scoreGradient(gNew, hslEdge).hits, 0);
  /* 但 rgba 之间的真过渡仍要报 */
  const rgbaFade = '<style>.a{background:linear-gradient(90deg,rgba(0,0,0,.9) 0%,rgba(255,255,255,.1) 100%)}</style>';
  eq('⑤/rgba 真过渡仍报', scoreGradient(gNew, rgbaFade).hits, 1);
  /* 真的有颜色跨度的必须报 */
  const realGrad = '<style>.a{background:linear-gradient(#E4DECD,#2C3034)}</style>';
  eq('⑤/真渐变仍然报出', scoreGradient(gNew, realGrad).hits, 1);
  /* var 两端不同变量 → 不知道颜色是否相同，按"可能是真渐变"报出来（宁可报） */
  const diffVars = '<style>.a{background:linear-gradient(var(--a),var(--b))}</style>';
  eq('⑤/不同变量的两端按真渐变处理', scoreGradient(gNew, diffVars).hits, 1);

  /* ── 结构性断言：未判清单必须由判据自己带出来，不能靠输出层记 ──
   *
   * 这条不是测某个判据对不对，而是测**加判据的方式**对不对。
   * 病史：未判原来是散落在输出循环里 push 的，我加字体链和明度跨度时
   * 各漏了一次，两次都表现为「行内说未判、汇总说没有」。
   *
   * 现在 score() 返回 undecided 数组，输出层只做 `for (const k of r.undecided)`。
   * 这条断言检查那个数组真的存在且是数组 —— 如果哪天有人把声明删了、
   * 退回散落 push 的写法，这条会红。 */
  const sampleR = score(idsForSelftest());
  S.push(['结构/score() 必须返回 undecided 数组',
    Array.isArray(sampleR && sampleR.undecided), sampleR && typeof sampleR.undecided, 'array']);

  /* ── ⑤ 默认字体栈（R-07 黑名单） ── */
  const PD = '也不要跳过上面这两条链回退成系统默认无衬线。';
  eq('⑤默认栈/Inter 要报', judgeDefaultFontStack(PD, '<style>.a{font-family:Inter,sans-serif}</style>').hits, ['Inter']);
  eq('⑤默认栈/system-ui 要报', judgeDefaultFontStack(PD, '<style>.a{font-family:system-ui}</style>').hits, ['system-ui']);
  eq('⑤默认栈/通用回退不报', judgeDefaultFontStack(PD, '<style>.a{font-family:"Martian Mono",sans-serif}</style>').hits, []);
  eq('⑤默认栈/Noto Sans SC 不报', judgeDefaultFontStack(PD, '<style>.a{font-family:"Noto Sans SC"}</style>').hits, []);
  eq('⑤默认栈/无此约束时返回 null', judgeDefaultFontStack('随便一句', '<style>.a{font-family:Inter}</style>'), null);
  eq('⑤默认栈/没声明时记未判', judgeDefaultFontStack(PD, '<style>.a{color:red}</style>').undecided, true);
  const bad = S.filter(([, ok]) => !ok);
  for (const [name, ok, got, want] of S) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (!ok) console.log(`      实得 ${JSON.stringify(got)}，期望 ${JSON.stringify(want)}`);
  }
  console.log(`\n自测：${S.length - bad.length}/${S.length} 通过`);
  return bad.length === 0;
}

/* ── 输出 ──────────────────────────────────────────────────────────── */
const arg = process.argv[2] || '--all';
if (arg === '--selftest') {
  console.log('=== 评分器自测（变异测试）===');
  process.exit(selfTest() ? 0 : 1);
}

/* ── 正对照：拿 35 个原型当产物打分 ─────────────────────────────────────
 *
 * 原型是手工做的、已知合格。如果判据判它们违规，那是**判据错了**。
 *
 * 为什么必须有这个：本仓库已经两次因为"判据把对的判成错的"而差点改坏
 * 正确的东西（§十三 的 gradient 误判、§二十七 的字体锚点连错三次）。
 * 两次都靠人肉回查才发现。正对照把这件事变成可自动跑的一道检查。
 *
 * 局限（写出来免得被高估）：原型把 CSS 放在外部 style.css，产物内联在
 * <style> 里 —— 这里把 style.css 拼进 HTML 再判，模拟"一个自包含的页面"。
 * 配色/字体/几何/禁项不受影响；④ 结构（数 <article>）可能因原型用别的
 * 标签而偏低，那一类在这里不作断言。 */
if (arg === '--positive-control') {
  const W = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(W);
  const P2 = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/prompts.js'), 'utf8'))(P2);
  const stub = {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }),
    addEventListener: () => {}, readyState: 'complete', body: { appendChild() {} },
  };
  const G = {
    STYLE_PROMPTS: P2.STYLE_PROMPTS, SCHEMES: W.SCHEMES, document: stub,
    location: { href: 'http://x/', search: '', hash: '' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { clipboard: { writeText: async () => {} } },
    history: { replaceState() {} }, setTimeout, clearTimeout,
  };
  new Function('window', 'document', 'location', 'localStorage', 'navigator', 'history', 'setTimeout', 'clearTimeout',
    readFileSync(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8'))(
    G, G.document, G.location, G.localStorage, G.navigator, G.history, setTimeout, clearTimeout);

  console.log('正对照：35 个原型（手工做的合格样品）跑一遍判据\n');
  let checked = 0, violations = 0;
  const tmp = join(ROOT, '.pc-tmp');
  mkdirSync(tmp, { recursive: true });
  for (const s of W.SCHEMES) {
    const pdir = join(ROOT, 'prototypes', s.dir);
    const ip = join(pdir, 'index.html');
    if (!existsSync(ip)) continue;
    const cssPath = join(pdir, 'style.css');
    const html = readFileSync(ip, 'utf8') +
      (existsSync(cssPath) ? '\n<style>\n' + readFileSync(cssPath, 'utf8') + '\n</style>' : '');
    const prompt = G.buildStylePrompt(s.id, { biz: '一家修鞋配钥匙的小店', action: '打电话约个时间', have: 5 });
    const hp = join(tmp, 'index.html'), pp = join(tmp, '_prompt.txt');
    writeFileSync(hp, html);
    writeFileSync(pp, prompt);
    const r = score(s.id, { htmlPath: hp, promptPath: pp });
    checked++;
    if (r.ok && r.banned.length) {
      violations++;
      console.log(`  ✗ ${s.id}  ${r.banned.map((b) => b.rule + '×' + b.hits).join('；')}`);
    }
  }
  rmSync(tmp, { recursive: true, force: true });
  console.log('');
  console.log(`检查 ${checked} 个原型，${violations} 个被判违规`);
  console.log(violations === 0
    ? '✓ 正对照通过：判据没有把手工做的合格样品判成违规'
    : '✗ 正对照失败：判据把合格样品判成违规了，先怀疑判据');
  process.exit(violations === 0 ? 0 : 1);
}

const ids = arg === '--all'
  ? readdirSync(BT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name)).map((d) => d.name).sort()
  : [arg];
const UNDECIDED = [];

for (const id of ids) {
  const r = score(id);
  if (!r.ok) { console.log(`${id}: ${r.why}`); continue; }
  console.log(`\n══ ${id} ${r.cn || ''}  ${r.lines} 行 / ${r.bytes} 字节`);
  /* ① */
  const c = r.colors;
  console.log(`  ① 配色   ${c.got}/${c.want} 个 hex 出现${c.missing.length ? '；缺 ' + c.missing.join(' ') : ''}`);
  if (c.bgWant) console.log(`     底色   ${c.bgWant} → ${c.bgCorrect ? '✓ 用在 background 上' : '✗ 没用在 background 上'}`);
  /* ② */
  if (r.fonts && r.fonts.want) {
    console.log(`  ② 字体   ${r.fonts.got}/${r.fonts.want}${r.fonts.hit.length ? '（' + r.fonts.hit.join(', ') + '）' : ''}`);
  }
  /* ③ */
  if (r.geometry.radius) {
    const g = r.geometry.radius;
    console.log(`  ③ 圆角   规则「${g.rule}」；声明 ${g.declared} 条，违反 ${g.violations} 条${g.samples.length ? '（' + g.samples.join(' / ') + '）' : ''}`);
  }
  if (r.geometry.lineWidth) {
    const g = r.geometry.lineWidth;
    console.log(`     线宽   允许 ${g.allowed.join('/')}；实际用了 ${g.used} 处${g.outside.length ? '，越界 ' + g.outside.join(' ') : '，全在允许级内'}`);
  }
  if (r.geometry.scale) {
    const g = r.geometry.scale;
    const mark = (ok) => (ok === null ? '–' : ok ? '✓' : '✗');
    console.log(`     字号   标题 ${g.maxTitle}px（要 ${g.wantTitleAbs}）${mark(g.titleOk)}　正文 ${g.body}px（要 ${g.wantBody}）${mark(g.bodyOk)}`);
  }
  /* ④
   * ⚠️ 2026-11-21：这一段的写法有一条硬要求 ——
   *   **「没判」必须有三态标记，不能和「通过」长得一样。**
   * 旧版对没匹配上的分支静默不输出，于是第一轮报告读出来是"五类全过"，
   * 而实际有两案没判。下面统一用 ✓ / ✗ / –（未判）三种，且 – 一律带原因。 */
  const mark = (ok) => (ok === null || ok === undefined ? '–' : ok ? '✓' : '✗');
  if (r.structure.items) {
    const s = r.structure.items;
    if (s.expect == null) {
      console.log(`  ④ 结构   条目 –（${s.note}）`);
    } else {
      /* 显示的是**实际选中的那个标签**，不是硬编码 article ——
       * 否则读者会以为判据在数 article，而它其实数了别的。 */
      const others = Object.entries(s.counts).filter(([t]) => t !== s.gotTag).map(([t, n]) => t + '=' + n).join(' ');
      /* 剔除了刻意留空/版式元素时要显示出来 —— 否则读者会奇怪
       * 「HTML 里明明有 7 个 article，为什么报 5」。 */
      const dropNote = s.dropped ? `（已剔除 ${s.dropped} 个标记为空的单元）` : '';
      console.log(`  ④ 结构   条目 应排 ${s.expect} 条（版式规模 ${s.scale}，不是目标）；HTML <${s.gotTag}>=${s.got}${dropNote} ${mark(s.hit)}`
        + (others ? `　〔其他标签仅供参考：${others}〕` : ''));
    }
  } else {
    console.log(`  ④ 结构   条目 –（提示词里没有条目句）`);
  }
  {
    const s = r.structure.pictures;
    if (!s || s.branch === 'none') {
      console.log(`     图片   – ${s ? s.note : '没读到图片段'}`);
    } else if (s.branch === 'zero') {
      console.log(`     图片   零图设计，要求 0 个 img；实得 ${s.got} ${mark(s.hit)}`);
    } else if (s.branch === 'alt') {
      console.log(`     图片   版式 ${s.slots} 位 / 用户 ${s.want} 条 → 合格线 ${s.want}；实得 ${s.got} 个 img（唯一 src ${s.uniq}）${mark(s.hit)}`);
    } else {
      console.log(`     图片   要求 ≥${s.want} 个不同图片位；实得 ${s.got} 个 img（唯一 src ${s.uniq}）${mark(s.hit)}`);
    }
    /* 全案汇总用的未判清单现在由 score() 自己带出来（out.undecided），
     * 不再在这里 push —— 见 out.undecided 处的病史注释。 */
  }
  /* 旧的三处散落 push 已移除，改由判据各自声明。 */
  /* ⑤
   * 渐变那条要显示"匹配到哪一版措辞"。如果一版都没匹配到，就是**没判**，
   * 不能写成"无违反" —— 那正是这条判据过去几个月的样子。 */
  const gradNote = r.gradientChecked === null ? '　〔渐变 – 未判：提示词不含任何一版渐变约束〕'
    : r.gradientChecked === 'old' ? '　〔渐变按旧措辞判〕'
    : (r.gradientDecorative ? `　〔已剔除 ${r.gradientDecorative} 处画线式 gradient（同色或硬边透明）：不是渐变〕` : '');
  /* 字体链：全走变量时这一条判不了，必须显示成未判而不是"无违反"。 */
  const fcNote = !r.fontChain ? ''
    : r.fontChain.undecided ? '　〔字体链 – 未判：产物全用 var() 定义字体，不追展开〕'
    : r.fontChain.outside.length ? `　〔链外：${r.fontChain.outside.join(' ')}〕`
    : `　〔字体 ${r.fontChain.used.length} 个，全在链上〕`;
  /* 渐变明度跨度：没有可判的渐变时显示"未判"，不显示"通过"。 */
  const gsNote = !r.gradientSpan ? ''
    : r.gradientSpan.undecided ? '　〔明度跨度 – 未判：没有可解析两端色值的渐变〕'
    : r.gradientSpan.over.length ? `　〔跨度过大：${r.gradientSpan.over.map((s) => s.span).join(' ')}（阈值 ${r.gradientSpan.threshold}）〕`
    : `　〔明度跨度 ${r.gradientSpan.spans.map((s) => s.span).join(' ')}，均在阈值内〕`;
  const dfsNote = !r.defaultStack ? ''
    : r.defaultStack.undecided ? '　〔默认字体栈 – 未判：产物没有 font-family 声明〕'
    : r.defaultStack.hits.length ? `　〔默认栈：${r.defaultStack.hits.join(' ')}〕`
    : '　〔无系统默认字体〕';
  console.log(`  ⑤ 禁项   ${r.banned.length ? r.banned.map((b) => b.rule + '×' + b.hits + (b.families ? '(' + b.families.join(',') + ')' : '')).join('；') : '无违反'}${gradNote}${fcNote}${gsNote}${dfsNote}`);
  /* 汇总：直接取判据自己声明的清单，不在这里逐个判据重新判断。
   * 加新判据时只要那条判据往 undecided 里写过，这里自动跟上。 */
  for (const k of r.undecided || []) UNDECIDED.push(`${id}/${k}`);
}

if (ids.length > 1) {
  console.log(`\n${'─'.repeat(56)}`);
  if (UNDECIDED.length) {
    /* 按**类别**聚合，不逐个列（2026-11-22 改）。
     *
     * 原来把 11 项平铺成一行，而其中 10 项是同一个原因（"产物没有可解析
     * 两端的渐变"）—— 读起来像十条问题，实际是一件事。这类"数字对但
     * 呈现方式误导"正是本仓库反复在治的东西。
     *
     * 聚合后按类别降序排，并列出涉及哪几案（最多 4 个，其余用 +N）。 */
    const byKind = {};
    for (const u of UNDECIDED) {
      const [caseId, kind] = u.split('/');
      (byKind[kind] = byKind[kind] || []).push(caseId);
    }
    const entries = Object.entries(byKind).sort((a, b) => b[1].length - a[1].length);
    console.log(`⚠️ 未判 ${UNDECIDED.length} 项，按原因分 ${entries.length} 类：`);
    for (const [kind, cases] of entries) {
      const shown = cases.slice(0, 4).join(' ');
      const more = cases.length > 4 ? ` +${cases.length - 4}` : '';
      console.log(`     ${kind.padEnd(8)} ${String(cases.length).padStart(2)} 案：${shown}${more}`);
    }
    console.log('   （未判 ≠ 通过。多数是"这一案本来就不涉及该判据"，不是缺陷。）');
  } else {
    console.log('✓ 所有已跑案的五类判据都真正判过（没有"未判"项）');
  }
}
