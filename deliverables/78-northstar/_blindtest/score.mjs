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

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');

function loadScheme(id) {
  const win = {};
  new Function('window', readFileSync(join(ROOT, 'prototypes/_selection/data.js'), 'utf8'))(win);
  return (win.SCHEMES || []).find((s) => s.id === id);
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
  const st = {};
  const itemM = prompt.match(/这个版式设计时排了\s*(\d+)\s*个条目/);
  if (itemM) {
    /* 启发式：数 HTML 里重复出现最多的那类元素（li / article / section / .card…）。
       只在"最相近的那个数"与提示词相差 ≤2 时算命中，否则记下来但不打分 ——
       结构猜测不可靠，报数比报结论诚实。 */
    const counts = {};
    for (const tag of ['li', 'article', 'section', 'figure']) {
      const n = (html.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length;
      if (n) counts[tag] = n;
    }
    const want = Number(itemM[1]);
    const best = Object.entries(counts).sort((a, b) => Math.abs(a[1] - want) - Math.abs(b[1] - want))[0];
    st.items = { want, counts, closest: best ? best[0] + '=' + best[1] : null, hit: best ? Math.abs(best[1] - want) <= 2 : false };
  }
  const picM = prompt.match(/至少要\s*(\d+)\s*个\*{0,2}不同的\*{0,2}图片位置/);
  if (picM) {
    const imgs = (html.match(/<img[\s>]/g) || []).length;
    st.pictures = { want: Number(picM[1]), got: imgs };
  }
  out.structure = st;

  /* ── ⑤ 禁项 ──────────────────────────────────────────────────────── */
  const banned = [];
  /* 只看 CSS 声明与元素，不看注释与文案 —— 提示词里提到这些词是"禁止"，不是"要用"。 */
  const css = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/i) || ['', ''])[1] || '';
  if (/无阴影|阴影：无/.test(prompt)) {
    const n = (css.match(/box-shadow\s*:\s*(?!none)[^;}]+/g) || []).length;
    if (n) banned.push({ rule: '无阴影', hits: n });
  }
  if (/允许渐变时只用相邻两级/.test(prompt) || /不用渐变/.test(prompt)) {
    const n = (css.match(/(?:linear|radial|conic)-gradient\s*\(/g) || []).length;
    if (n) banned.push({ rule: '渐变受限', hits: n });
  }
  out.banned = banned;

  return out;
}

/* ── 输出 ──────────────────────────────────────────────────────────── */
const arg = process.argv[2] || '--all';
const ids = arg === '--all'
  ? readdirSync(BT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}$/.test(d.name)).map((d) => d.name).sort()
  : [arg];

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
  /* ④ */
  if (r.structure.items) {
    const s = r.structure.items;
    console.log(`  ④ 结构   想要 ${s.want} 条；最接近 ${s.closest}${s.hit ? ' ✓' : '（启发式，仅供参考）'}`);
  }
  if (r.structure.pictures) {
    const s = r.structure.pictures;
    console.log(`     图片   提示词要 ${s.want} 个位置；HTML 里 ${s.got} 个 img`);
  }
  /* ⑤ */
  console.log(`  ⑤ 禁项   ${r.banned.length ? r.banned.map((b) => b.rule + '×' + b.hits).join('；') : '无违反'}`);
}
