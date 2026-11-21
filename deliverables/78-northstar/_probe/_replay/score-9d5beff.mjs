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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
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
  return {
    scale,
    expect,
    counts,
    got: counts.article != null ? counts.article : null,
    hit: expect != null && counts.article != null ? Math.abs(counts.article - expect) <= 1 : null,
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

function score(id) {
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
  /* 圆角：提示词「圆角：全站一律 0」。查 HTML 有没有非 0 的 border-radius。 */
  if (/圆角：全站一律\s*0/.test(prompt)) {
    const radii = [...html.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
    const nonZero = radii.filter((v) => !/^0(px|em|rem|%)?$/.test(v.replace(/\s+/g, '')));
    geo.radius = { rule: '全站一律 0', declared: radii.length, violations: nonZero.length, samples: nonZero.slice(0, 3) };
  }
  /* 线宽：提示词「线宽只用这几级：1px、1.5px」。查 HTML 里 border 宽度有没有跳出去。
     ⚠️ 必须按**数值**比，不能按字符串比（2026-11-05 修）：
     CSS 允许 `.8px` 和 `0.8px` 两种写法，字符串比对会把同一个值判成越界。
     实测 S19 因此报「越界 .8px .4px」—— 而提示词写的正是 `0.4px`。 */
  const lwM = prompt.match(/线宽只用这几级：([^。]+)/);
  if (lwM) {
    const allowed = new Set((lwM[1].match(/[\d.]+px/g) || []).map((s) => Number(parseFloat(s).toFixed(2))));
    const used = [...html.matchAll(/(?:border|outline)(?:-(?:top|right|bottom|left))?(?:-width)?\s*:\s*([\d.]+)px/g)]
      .map((m) => Number(parseFloat(m[1]).toFixed(2)));
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
      out2.titleOk = out2.wantTitleAbs != null ? near(out2.maxTitle, out2.wantTitleAbs) : null;
      out2.bodyOk = out2.wantBody != null ? near(out2.body, out2.wantBody) : null;
    }
    geo.scale = out2;
  }
  out.geometry = geo;

  /* ── ④ 结构 ──────────────────────────────────────────────────────── */
  out.structure = {
    items: judgeItems(prompt, html),
    pictures: judgePictures(prompt, html),
  };

  /* ── ⑤ 禁项 ──────────────────────────────────────────────────────── */
  const banned = [];
  /* 只看 CSS 声明与元素，不看注释与文案 —— 提示词里提到这些词是"禁止"，不是"要用"。 */
  const css = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/i) || ['', ''])[1] || '';
  if (/无阴影|阴影：无/.test(prompt)) {
    const n = (css.match(/box-shadow\s*:\s*(?!none)[^;}]+/g) || []).length;
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
function selfTest() {
  const S = [];
  const eq = (name, got, want) => S.push([name, JSON.stringify(got) === JSON.stringify(want), got, want]);

  /* ── judgeItems ── 六条 */
  const P19 = '1. 这个版式设计时排了 20 个条目——这是版式的规模，不是你的内容量。\n2. 你手上有 5 条内容，就排 5 条。';
  /* 正常：5 条 → ✓（旧判据在这里会报 ✗，因为 5≠20） */
  eq('items/照做5条算过', judgeItems(P19, '<article></article>'.repeat(5)).hit, true);
  /* 变异 1：排了 20 条（照 minItems 排，是错的行为）→ 必须报 ✗ */
  eq('items/按版式规模排20条算错', judgeItems(P19, '<article></article>'.repeat(20)).hit, false);
  /* 变异 2：差 1 条 → 仍算过（边界差异不算缺陷） */
  eq('items/差1条容差内', judgeItems(P19, '<article></article>'.repeat(6)).hit, true);
  /* 变异 3：差 2 条 → 报 ✗ */
  eq('items/差2条报错', judgeItems(P19, '<article></article>'.repeat(7)).hit, false);
  /* 变异 4：没有 have 句 → 不下结论（null），不能默认通过 */
  eq('items/无have时不下结论', judgeItems('这个版式设计时排了 7 个条目——这是版式的规模', '<article></article>'.repeat(7)).hit, null);
  /* 变异 5：一个 article 都没有 → null，不能算 ✓ */
  eq('items/零article不下结论', judgeItems(P19, '<section></section>'.repeat(5)).hit, null);

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
  /* 真的有颜色跨度的必须报 */
  const realGrad = '<style>.a{background:linear-gradient(#E4DECD,#2C3034)}</style>';
  eq('⑤/真渐变仍然报出', scoreGradient(gNew, realGrad).hits, 1);
  /* var 两端不同变量 → 不知道颜色是否相同，按"可能是真渐变"报出来（宁可报） */
  const diffVars = '<style>.a{background:linear-gradient(var(--a),var(--b))}</style>';
  eq('⑤/不同变量的两端按真渐变处理', scoreGradient(gNew, diffVars).hits, 1);

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
      console.log(`  ④ 结构   条目 应排 ${s.expect} 条（版式规模 ${s.scale}，不是目标）；HTML <article>=${s.got} ${mark(s.hit)}`
        + (Object.keys(s.counts).length > 1 ? `　〔其他标签仅供参考：${Object.entries(s.counts).filter(([t]) => t !== 'article').map(([t, n]) => t + '=' + n).join(' ') || '无'}〕` : ''));
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
    /* 全案汇总用得上：把"未判"累计出来，免得又是"全绿"其实是"没跑"。 */
    if (s && s.hit === null) UNDECIDED.push(`${id}/图片`);
  }
  if (r.structure.items && r.structure.items.hit === null) UNDECIDED.push(`${id}/条目`);
  /* ⑤
   * 渐变那条要显示"匹配到哪一版措辞"。如果一版都没匹配到，就是**没判**，
   * 不能写成"无违反" —— 那正是这条判据过去几个月的样子。 */
  const gradNote = r.gradientChecked === null ? '　〔渐变 – 未判：提示词不含任何一版渐变约束〕'
    : r.gradientChecked === 'old' ? '　〔渐变按旧措辞判〕'
    : (r.gradientDecorative ? `　〔已剔除 ${r.gradientDecorative} 处同色 gradient：那是画线，不是渐变〕` : '');
  console.log(`  ⑤ 禁项   ${r.banned.length ? r.banned.map((b) => b.rule + '×' + b.hits).join('；') : '无违反'}${gradNote}`);
}

if (ids.length > 1) {
  console.log(`\n${'─'.repeat(56)}`);
  if (UNDECIDED.length) {
    console.log(`⚠️ 未判 ${UNDECIDED.length} 项：${UNDECIDED.join('、')}`);
    console.log('   （未判 ≠ 通过。这几项没有对应的判据，或判据没匹配上。）');
  } else {
    console.log('✓ 所有已跑案的五类判据都真正判过（没有"未判"项）');
  }
}
