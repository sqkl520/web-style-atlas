#!/usr/bin/env node
/* 形态普查（2026-11-22）：判据"量字面 vs 实现用等价形式"这一类误报的结构性探针。
 *
 * 问题不是"某条判据写错了"，而是**没有任何机制检查判据的语法覆盖面**。
 * 8 处误报里有 7 处是这个形状：判据认识写法 A，产物用了等价的写法 B，
 * 判据把 B 当成"违规"。每次都是跑真实产物才发现，然后一条条补。
 *
 * 这个脚本做的事：
 *   1. 把每条被判据检查的声明，归一成一个**形态签名**（form signature）——
 *      不是值，是"这个值由哪些语法成分按什么顺序组成"。
 *        `0`            → Z
 *        `0 !important` → Z+IMP
 *        `0 0 0 0`      → Z Z Z Z
 *        `0 3px`        → Z LEN
 *   2. 数全库每种属性出现了多少种签名。
 *   3. 与 DECLARED 表比对：签名的**每一维**都必须在声明的集合里。
 *      未登记的维度值 → 报警。这正是"判据遇到了它没处理过的写法"。
 *
 * 与 score.mjs 的关系：只读，不改。score.mjs 的判据一行不动。
 *
 * 用法：
 *   node _form-census.mjs            # 普查 + 比对 DECLARED
 *   node _form-census.mjs --verbose  # 连每条的原文一起打
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');
const VERBOSE = process.argv.includes('--verbose');

/* ── 归一：把一个 CSS 值切成"语法成分" ─────────────────────────────────
 *
 * 只做到足够区分"形态"的粒度，不做通用 CSS 解析。
 * 每一类都必须对应一个**判据可能踩坑的等价形式**，否则这一层就是噪音。
 */
const GLOBAL_KW = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer', 'none', 'auto', 'normal']);

function atom(tok) {
  const t = tok.trim();
  if (!t) return null;
  if (t === '!important') return 'IMP';
  if (/^var\(/i.test(t)) return 'VAR';
  if (/^(calc|min|max|clamp)\(/i.test(t)) return 'CALC';
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return 'HEX';
  if (/^(rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/i.test(t)) return 'COLORFN';
  if (/^-?0(px|em|rem|%|vh|vw|s|deg)?$/i.test(t)) return 'ZERO';
  if (/^-?[\d.]+(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|fr|s|ms|deg|turn|rad)$/i.test(t)) return 'LEN';
  if (t === '0') return 'ZERO';
  if (/^-?[\d.]+$/.test(t)) return 'NUM';
  if (/^["'].*["']$/.test(t)) return 'QUOTED';
  if (GLOBAL_KW.has(t.toLowerCase())) return 'GKW:' + t.toLowerCase();
  if (/^[a-z-]+$/i.test(t)) return 'KW';
  if (/^(transparent|currentcolor)$/i.test(t)) return 'GKW:' + t.toLowerCase();
  return 'OTHER:' + t.slice(0, 12);
}

/* 顶层切分：先把括号内的逗号/空格保护起来，再切 */
function topSplit(s, seps = /\s+/) {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (depth === 0 && seps.test(ch)) { if (cur.trim()) out.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/* 一个声明的形态签名 = 顶层逗号分组的序列，每组是成分序列 */
function signature(value) {
  /* `0!important` 与 `0 !important` 是同一条声明的两种写法，先归一成同一形态。
   * 这正是误报 #1 的形状 —— 判据看到的是同一个值，只是分词边界不同。 */
  const raw = String(value).trim().replace(/\s*!\s*important/i, ' !important');
  const groups = topSplit(raw, /,/);
  return groups.map((g) => topSplit(g, /\s+/).map(atom).filter(Boolean));
}

/* ── DECLARED：每条判据声明它认识的形态 ─────────────────────────────────
 *
 * 这里的每一项都是**从 score.mjs 的实际代码反推出来的**，不是想象的。
 * 一维一项，项的值就是该判据的判据表达式能处理的成分。
 *
 * 这是本方案的核心：判据改了，这张表必须跟着改；表没跟上，普查会报
 * "产物里出现了你声明之外的形态" —— 那正是误报的前兆。
 *
 * ⚠️ 报告与判据的绑定是**人工维护**的，会有漂移。所以本脚本末尾会打印
 * 每条判据在 score.mjs 里的行号，改判据时能对上。防漂移的机制在
 * `--as-of` 里演示：表是可替换的，替换成历史版本就复现历史盲区。
 */
const DECLARED_TODAY = {
  /* judgeRadius: corners(v) 剥 !important → 按空白切 → 每个必须是 /^0(px|em|rem|%)?$/ */
  'border-radius': {
    judge: 'judgeRadius (score.mjs:288)',
    atoms: ['ZERO', 'IMP'],
    groups: 1,
    note: '判据只认 0/0px/0em/0rem/0% 与 !important',
  },
  /* judgeLineWidth: /(border|border-{top,...})\s*:\s*([\d.]+)px\b/ ——
   * 只认 px 字面；em/rem/%/var()/calc() 全部量不到 */
  'border-width': {
    judge: 'judgeLineWidth (score.mjs:297)',
    atoms: ['LEN'],
    groups: 1,
    note: '正则要求 ([\d.]+)px；em/rem/var()/0 无量纲 0 都量不到',
  },
  /* ⑤无阴影: box-shadow 每部分 nums 取 px → [x,y,blur,spread]，blur>0 才算阴影 */
  'box-shadow': {
    judge: 'score() ⑤无阴影 (score.mjs:701)',
    atoms: ['LEN', 'COLORFN', 'HEX', 'VAR', 'KW', 'ZERO', 'IMP'],
    groups: Infinity,
    note: '要求 px 数值组；var() 展开后才知道模糊半径 → 量不到',
  },
  /* scoreGradient: 括号配对取体 → isDecorativeLine 四道判据 */
  gradient: {
    judge: 'scoreGradient/isDecorativeLine (score.mjs:161)',
    atoms: ['GKW:transparent', 'HEX', 'VAR', 'COLORFN', 'ZERO', 'LEN', 'KW', 'CALC'],
    groups: Infinity,
    note: 'stop 位置只认 px/%；色值只认 transparent/#hex/var()/rgb 家族',
  },
  /* judgeFontChain: split(',') → 去引号 → 比首位的族名 */
  'font-family': {
    judge: 'judgeFontChain (score.mjs:325)',
    atoms: ['QUOTED', 'KW', 'VAR', 'OTHER:'],
    groups: Infinity,
    note: '按逗号切，首位判违规；var() 组记未判',
  },
  /* pxOf: clamp/min/max/calc/px/rem/em */
  'font-size': {
    judge: 'score() ③字号 pxOf (score.mjs:625)',
    atoms: ['LEN', 'CALC', 'VAR', 'ZERO', 'KW'],
    groups: 1,
    note: 'px/rem/em/calc/clamp/min/max；vw/vh/% 量不到（返回 0）',
  },
};

/* ── 历史声明表（从对应 commit 的 score.mjs 反推） ───────────────────────
 *
 * 用途：证明"如果当时就有这道闸门，它会报出后来出事的那一形态"。
 * 这是本方案唯一能自证的证据 —— 不是"理论上能防"，是"回放当时的状态会红"。
 *
 * 每一版只写**当时判据真正能处理的成分**，多一个都算作弊。
 */
const DECLARED_ASOF = {
  /* 9d5beff（修 #1 #2 之前）：judgeRadius 内联在 score() 里，
   * 直接对整串做 /^0(px|em|rem|%)?$/ —— 不认识 !important，
   * 也不做多值切分（`0 0 0 0` 整串比不过）。 */
  '9d5beff': {
    'border-radius': { judge: '(内联 v1, 9d5beff)', atoms: ['ZERO'], groups: 1, note: '只认整串恰好是 0' },
    'border-width': { judge: '(内联 v1, 9d5beff)', atoms: ['LEN'], groups: 1, note: '属性名无词边界' },
    'box-shadow': { judge: '(内联 v1, 9d5beff)', atoms: ['LEN', 'COLORFN', 'HEX', 'VAR', 'KW', 'ZERO', 'IMP'], groups: Infinity, note: '有 box-shadow 就算' },
    gradient: { judge: '(v1, 9d5beff)', atoms: ['GKW:transparent', 'HEX', 'VAR', 'COLORFN', 'ZERO', 'LEN', 'KW', 'CALC'], groups: Infinity, note: '只看函数名' },
    'font-family': { judge: '(v1, 9d5beff)', atoms: ['QUOTED', 'KW', 'VAR', 'OTHER:'], groups: Infinity, note: '首位字面比' },
    'font-size': { judge: '(v1, 9d5beff)', atoms: ['LEN'], groups: 1, note: '只认 px 字面' },
  },
  /* e8e2bad（修 #3 #4 之后、#5 之前）：渐变已认同色与硬边透明，
   * 但 stop 正则仍要求颜色后跟**一个带单位**的数值 —— 双位置 `0 3px` 断掉。 */
  'e8e2bad': {
    ...{
      'border-radius': { judge: '(v2, e8e2bad)', atoms: ['ZERO', 'IMP'], groups: 1, note: '已剥 !important' },
      'border-width': { judge: '(v2, e8e2bad)', atoms: ['LEN'], groups: 1, note: '已加词边界；仍只认 px 字面' },
      'box-shadow': { judge: '(v2, e8e2bad)', atoms: ['LEN', 'COLORFN', 'HEX', 'VAR', 'KW', 'ZERO', 'IMP'], groups: Infinity, note: '已要求 blur>0' },
      'font-family': { judge: '(v2, e8e2bad)', atoms: ['QUOTED', 'KW', 'VAR', 'OTHER:'], groups: Infinity, note: '首位字面比' },
      'font-size': { judge: '(v2, e8e2bad)', atoms: ['LEN', 'CALC'], groups: 1, note: '已认 clamp' },
    },
    gradient: {
      judge: '(v2, e8e2bad)',
      atoms: ['GKW:transparent', 'HEX', 'VAR', 'COLORFN', 'ZERO', 'LEN', 'KW', 'CALC'],
      groups: Infinity,
      /* 关键：位置只认"带单位"的单个数值。`0 3px` 里的无量纲 0 让它多抓一个 stop，
       * 于是"相邻边界重合"的判据失效。这一条正是 #6。 */
      stopPositions: 'unit-required',
      note: 'stop 位置必须带单位；双位置写法只解析到第一个',
    },
  },
};

let DECLARED = DECLARED_TODAY;
const asof = (() => { const i = process.argv.indexOf('--as-of'); return i > 0 ? process.argv[i + 1] : null; })();
if (asof) {
  if (!DECLARED_ASOF[asof]) { console.error(`未知的历史版本 ${asof}；可选：${Object.keys(DECLARED_ASOF).join(' ')}`); process.exit(2); }
  DECLARED = DECLARED_ASOF[asof];
}

/* ── 抽出所有声明 ──────────────────────────────────────────────────────── */
function cssOf(html) {
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  return blocks.join('\n');
}
/* 简易声明抽取：只在 `{...}` 内取 `prop: value`。注释先剥掉 ——
 * 注释里的 `border-radius: 0` 不该进普查，这与 score.mjs 的口径一致
 * （它不剥注释，是它自己的一个盲区，但不属于本探针要查的东西）。 */
function decls(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out = [];
  for (const m of clean.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    out.push({ prop: m[1].toLowerCase().trim(), val: m[2].trim().replace(/\s+/g, ' ') });
  }
  return out;
}

const PROP_OF_INTEREST = (p) => {
  if (p === 'border-radius' || /^border-(top|bottom|left|right)-(start-)?(start-)?(end-)?radius$/.test(p)) return 'border-radius';
  if (p === 'border' || p === 'border-width' || /^border-(top|bottom|left|right)$/.test(p)) return 'border-width';
  if (p === 'box-shadow') return 'box-shadow';
  if (p === 'font-family') return 'font-family';
  if (p === 'font-size') return 'font-size';
  return null;
};

/* ── 主流程 ────────────────────────────────────────────────────────────── */
const ids = readdirSync(BT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d/.test(d.name))
  .map((d) => d.name).sort();

const byProp = {};          /* prop → { sig → { n, samples[] } } */
let gradCount = {};         /* 渐变函数体的形态 */

for (const id of ids) {
  const hp = join(BT, id, 'index.html');
  if (!existsSync(hp)) continue;
  const html = readFileSync(hp, 'utf8');
  const css = cssOf(html);

  for (const { prop, val } of decls(css)) {
    const key = PROP_OF_INTEREST(prop);
    if (!key) continue;
    let sig;
    if (key === 'border-width') {
      /* 线宽判据只取声明里的**第一个 px 数值**，所以形态签名也只取首位。
       * 首位不是数值（如 `border-top: var(--line) solid`）→ NOVALUE，
       * 那是判据**量不到**的写法，比"未登记"更值得单独标出来。 */
      const m = /^(-?[\d.]+)(px|em|rem|%)?\b/.exec(val.trim());
      sig = JSON.stringify([[m ? atom(m[1] + (m[2] || '')) : 'NOVALUE']]);
    } else {
      sig = JSON.stringify(signature(val));
    }
    byProp[key] = byProp[key] || {};
    byProp[key][sig] = byProp[key][sig] || { n: 0, samples: [] };
    byProp[key][sig].n++;
    if (byProp[key][sig].samples.length < 3) byProp[key][sig].samples.push(`${id}: ${prop}: ${val}`);
  }

  /* 渐变单独普查：函数体里的 stop 形态 */
  const re = /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex;
    const start = i;
    while (i < css.length && depth > 0) {
      if (css[i] === '(') depth++; else if (css[i] === ')') depth--;
      i++;
    }
    const body = css.slice(start, i - 1);
    const fn = m[0].split('(')[0].replace(/-gradient\s*$/, '');
    /* stop 形态：颜色 + 0/1/2 个位置 */
    const stopRe = /(transparent|#[0-9A-Fa-f]{3,8}|var\(--[\w-]+\)|(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\([^()]*\))((?:\s+[\d.]+(?:px|%|deg|turn|rad)?){0,2})/gi;
    const stops = [...body.matchAll(stopRe)].map((x) => {
      const posN = (x[2].match(/[\d.]+/g) || []).length;
      const colorKind = /^transparent$/i.test(x[1]) ? 'transparent'
        : /^#/.test(x[1]) ? 'hex'
        : /^var\(/i.test(x[1]) ? 'var'
        : 'fn';
      return `${colorKind}:${posN}pos`;
    });
    const gsig = `${fn} [${stops.join(',')}]`;
    gradCount[gsig] = (gradCount[gsig] || 0) + 1;
  }
}

/* ── 输出 ──────────────────────────────────────────────────────────────── */
console.log(`形态普查：${ids.length} 份产物（${BT}）\n`);
console.log('═'.repeat(70));

let undeclared = 0;
for (const [prop, sigs] of Object.entries(byProp)) {
  const D = DECLARED[prop];
  if (!D) continue;
  const rows = Object.entries(sigs).sort((a, b) => b[1].n - a[1].n);
  console.log(`\n## ${prop}   ${rows.length} 种形态，${rows.reduce((a, [, v]) => a + v.n, 0)} 条声明`);
  console.log(`   判据 ${D.judge}`);
  console.log(`   声明可处理：${D.atoms.join(' ')}${D.groups === 1 ? '（单组）' : '（多组）'}`);
  for (const [sig, v] of rows) {
    const groups = JSON.parse(sig);
    const atomsUsed = new Set();
    for (const g of groups) for (const a of g) atomsUsed.add(a);
    if (D.groups === 1 && groups.length > 1) atomsUsed.add('<多组>');
    const bad = [...atomsUsed].filter((a) => !D.atoms.includes(a) && !a.startsWith('OTHER:'));
    if (bad.length) undeclared++;
    const flag = bad.length ? `  ⚠️ 未登记：${bad.join(' ')}` : '';
    console.log(`   ${String(v.n).padStart(3)}  ${sig}${flag}`);
    if (VERBOSE || bad.length) for (const s of v.samples) console.log(`        · ${s}`);
  }
}

console.log('\n' + '═'.repeat(70));
console.log(`\n## 渐变函数体形态（${Object.values(gradCount).reduce((a, b) => a + b, 0)} 处）`);
for (const [sig, n] of Object.entries(gradCount).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(3)}  ${sig}`);
}

/* ── 关键一步：把"形态"接到"判据会不会误报"上 ────────────────────────────
 *
 * 只报"出现了未登记形态"还不够 —— 未登记不等于误报（有些是合规的）。
 * 真正要回答的是：**这个形态，判据判对了吗？**
 *
 * 做法：对产物里真实出现的每一条 border-radius / border / box-shadow /
 * gradient 声明，跑一次真实判据，把它的判定与"人读一眼就知道的答案"对齐。
 *
 * 但"人读一眼的答案"没法自动化。所以退一步，用**可机械判定的必要条件**：
 *   圆角规则「全站一律 0」下，值里**只有一个 0**（任意零写法）→ 该合规。
 *   若判据报违规 → 误报。
 * 这类断言不需要知道全部答案，只需要几个**必然**的。这就是本探针的判据。
 */
console.log('\n' + '═'.repeat(70));
console.log('\n## 必然断言：产物里真实出现的声明，判据判对了吗\n');

function loadJudgesForCensus(asof) {
  const { readFileSync: rf } = { readFileSync };
  const path = asof
    ? join(ROOT, `deliverables/78-northstar/_probe/_replay/score-${asof}.mjs`)
    : join(ROOT, 'deliverables/78-northstar/_blindtest/score.mjs');
  if (!existsSync(path)) return null;
  const src = rf(path, 'utf8');
  const cut = src.indexOf('/* ── 输出 ──');
  const body = (cut > 0 ? src.slice(0, cut) : src)
    .replace(/^#!.*\n/, '').replace(/^import .*$/gm, '')
    .replace(/const ROOT = [\s\S]*?\n/, '').replace(/const BT = [\s\S]*?\n/, '');
  try {
    return new Function(body + `
      return {
        judgeRadius: (typeof judgeRadius==='function'?judgeRadius:null),
        judgeLineWidth: (typeof judgeLineWidth==='function'?judgeLineWidth:null),
        scoreGradient: (typeof scoreGradient==='function'?scoreGradient:null),
      };`)();
  } catch (e) { console.log('  ⚠️ 判据加载失败：' + e.message); return null; }
}

const J = loadJudgesForCensus(asof);
if (!J) {
  console.log('  （找不到对应版本的 score.mjs，跳过）');
} else {
  /* 断言 1：圆角「全站一律 0」下，单个零写法必须判合规 */
  const P_RADIUS = '3. 圆角：全站一律 0，卡片、按钮全部方角。';
  const zeroForms = ['0', '0px', '0em', '0rem', '0%', '0 !important', '0!important', '0 0 0 0', '0.0px'];
  let radBad = 0;
  for (const f of zeroForms) {
    if (!J.judgeRadius) break;
    const r = J.judgeRadius(P_RADIUS, `<style>.a{border-radius:${f}}</style>`);
    if (r && r.violations > 0) { radBad++; console.log(`  ✗ 圆角合规写法被报违规：border-radius: ${f}`); }
  }
  if (J.judgeRadius && !radBad) console.log('  ✓ 圆角：9 种零写法全部判合规');

  /* 断言 2：线宽——同一数值的 px 字面与 var() 必须等价 */
  const P_LW = '5. 线宽只用这几级：1px、1.25px、2px。';
  if (J.judgeLineWidth) {
    const a = J.judgeLineWidth(P_LW, '<style>.a{border-top:6px solid #000}</style>');
    const b = J.judgeLineWidth(P_LW, '<style>:root{--w:6px}.a{border-top:var(--w) solid #000}</style>');
    const same = JSON.stringify(a.outside) === JSON.stringify(b.outside);
    console.log(`  ${same ? '✓' : '✗'} 线宽：6px 字面 vs var(--w)=6px → ${JSON.stringify(a.outside)} / ${JSON.stringify(b.outside)}`);
  }

  /* 断言 4（最关键）：产物里**真实存在**的每一处 gradient，判据的 stop 正则
   * 能不能看见它的全部颜色？看不见 → 那个颜色参与不了"同色判定"，
   * 判据在这处 gradient 上就是瞎的。
   *
   * 这正是 #6/#7/#8 三处的共同形状，而且不需要我事先知道正确答案：
   * 只问"这个 gradient 里有 N 个颜色 token，判据认出了几个"。
   */
  if (J.scoreGradient) {
    /* ⚠️ 重要更正：`COLOR_TOKEN`（score.mjs:472）**包含** rgba()/hsl()，
     * 所以 rgb 家族不是盲区 —— 我一开始以为它是，实测推翻了。
     *
     * 真正的盲区是**具名颜色**（`black` / `white` / `red`）与
     * `currentColor`、`oklch()`、`color-mix()`：它们不在 COLOR_TOKEN 里。
     * 后果不是"漏判成违规"，而是更隐蔽的一种 —— 颜色一个都认不出，
     * allStops 为空，"同色"与"硬边"两道判据都不命中 → 默认算渐变。
     * 也就是说：**用具名颜色写的画线会被报成渐变**。
     *
     * 实测（见 /tmp 复现）：linear-gradient(black,black) → hits=1；
     * 同一件事写成 #000 → hits=0。这是 #4 的第二种形态，尚未在产物里出现，
     * 但语法完全合法，随时可能被生成出来。 */
    const P_G = '需要做渐变或纹理时只用同一色系里明度接近的两档，跨度不超过一档。';
    const pairs = [
      ['同色两端（画线）', 'linear-gradient(black,black)', 'linear-gradient(#000000,#000000)'],
      ['硬边双色', 'linear-gradient(black 0 2px,white 2px 4px)', 'linear-gradient(#000000 0 2px,#FFFFFF 2px 4px)'],
    ];
    for (const [name, named, hexed] of pairs) {
      const a = J.scoreGradient(P_G, `<style>.a{background:${named}}</style>`).hits;
      const b = J.scoreGradient(P_G, `<style>.a{background:${hexed}}</style>`).hits;
      const same = a === b;
      console.log(`  ${same ? '✓' : '✗'} 渐变${name}：具名颜色 hits=${a} vs hex hits=${b}`);
      if (!same) console.log(`        具名颜色不在 COLOR_TOKEN 里 → 颜色认不出 → 默认算渐变（误报）`);
    }
  }
}

console.log(`\n${'─'.repeat(70)}`);
console.log(undeclared === 0
  ? '✓ 所有出现的形态都在声明内'
  : `⚠️ ${undeclared} 种未登记形态（判据没处理过，可能误报）`);
process.exit(0);
