#!/usr/bin/env node
/* 残留探针（2026-11-22）：量"判据到底看进去了多少"。
 *
 * ── 为什么这是最有用的那个信号 ─────────────────────────────────────────
 *
 * 8 处误报的共同形状不是"判据写错了某一行"，而是：
 *
 *   产物里有一段 CSS，判据的正则**只吃进去前半截，后半截被静默丢掉**。
 *
 *   `linear-gradient(var(--p) 0 3px, var(--b) 3px 12px)`  ← 双位置
 *     旧正则 `color + 一个带单位的数值` 只吃到 `var(--p) 0`，
 *     `3px` 和后面的整个 stop 被丢掉。判据"没报"不是因为合规，
 *     是因为它根本没看见。
 *
 *   `border-top: var(--line) solid`  ← 线宽在变量里
 *     正则要求 `([\d.]+)px`，整条声明被跳过。S15 有 27 条 border，判据只数到 1 条，
 *     而报告写的是「实际用了 1 处，全在允许级内」—— 读起来像"全部合规"。
 *
 * 所以：**对每条判据，量它吃进去的字符占全部字符的比例。**
 * 比例低 = 判据在盲区里工作 = 它的"通过"不可信。这个信号不需要事先
 * 枚举等价形式，也不需要知道正确答案 —— 它只问"你看全了吗"。
 *
 * ── 三个指标 ────────────────────────────────────────────────────────────
 *   coverage  声明级：该管这条属性的判据，实际解析了几条 / 该管几条
 *   residue   值级：值的字符里有多少没被任何 token 吃掉
 *   silent    静默级：判据量到 0 条 / 量到 null，却输出"合规"而不是"未判"
 *
 * 用法：node _residue-probe.mjs [--all]
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const BT = join(ROOT, 'deliverables/78-northstar/_blindtest');

const cssOf = (h) => ([...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n'));

/* ── 各判据的 token 扫描器：返回 {consumed, total, items} ────────────────
 *
 * consumed/total 都是**字符数**。这不是精确的解析器指标，是一个下界：
 * 判据吃掉的正则匹配覆盖了多少字符。够用来发现"只吃了一半"。
 */
const SCANNERS = {
  /* judgeLineWidth: /(?:^|[\s;{])(border|border-(?:top|right|bottom|left))(?:\s*:\s*)([\d.]+)px\b/ */
  lineWidth(css) {
    /* 该管范围：所有 border 简写 / border-top 等 / border-width。
     * 只比较**值**的字符数（不含属性名），否则两边口径不一致。 */
    const should = [...css.matchAll(/(?:^|[\s;{])(border|border-(?:top|right|bottom|left|width))(?:\s*:\s*)([^;}]+)/g)];
    /* `0` / `none` / `hidden` 是合法的"没有线"，判据不数它们不是盲区。 */
    const isZeroLine = (v) => /^(0|none|hidden)\b/i.test(v.trim());
    const live = should.filter((m) => !isZeroLine(m[2]));
    const total = live.reduce((a, m) => a + m[2].trim().length, 0);
    const consumedM = live.filter((m) => /^[\d.]+px\b/.test(m[2].trim()));
    const consumed = consumedM.reduce((a, m) => a + m[2].trim().length, 0);
    const missed = live.filter((m) => !/^[\d.]+px\b/.test(m[2].trim()));
    return { total, consumed, n: live.length, got: consumedM.length, missed: missed.map((m) => m[1] + ': ' + m[2].trim().slice(0, 46)) };
  },

  /* judgeRadius: /border-radius\s*:\s*([^;}]+)/ */
  radius(css) {
    const should = [...css.matchAll(/(border(?:-[a-z]+)*-radius)(?:\s*:\s*)([^;}]+)/g)];
    const total = should.reduce((a, m) => a + m[2].trim().length, 0);
    /* 判据只认整体属性名 `border-radius`，四个角单独写的（border-top-left-radius）全部漏 */
    const consumedM = should.filter((m) => m[1] === 'border-radius');
    const consumed = consumedM.reduce((a, m) => a + m[2].trim().length, 0);
    const missed = should.filter((m) => m[1] !== 'border-radius');
    return { total, consumed, n: should.length, got: consumedM.length, missed: missed.map((m) => m[1] + ': ' + m[2].trim().slice(0, 40)) };
  },

  /* ⑤无阴影: /box-shadow\s*:\s*((?!none)[^;}]+)/ 然后每段取 px 数值 */
  shadow(css) {
    const should = [...css.matchAll(/box-shadow\s*:\s*([^;}]+)/g)];
    const total = should.reduce((a, m) => a + m[1].trim().length, 0);
    /* 判据能读懂的：组里至少有 1 个 px 数值（否则 nums 为空 → blur=0 → 静默算"画线"） */
    const readable = should.filter((m) => /-?\d*\.?\d+px/.test(m[1]));
    const consumed = readable.reduce((a, m) => a + m[1].trim().length, 0);
    const missed = should.filter((m) => !/-?\d*\.?\d+px/.test(m[1]));
    return { total, consumed, n: should.length, got: readable.length, missed: missed.map((m) => 'box-shadow: ' + m[1].trim().slice(0, 46)) };
  },

  /* scoreGradient: 逐 gradient 取体，再按 stop 正则解析 */
  gradient(css) {
    const bodies = [];
    const re = /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/g;
    let m;
    while ((m = re.exec(css))) {
      let depth = 1, i = re.lastIndex;
      const start = i;
      while (i < css.length && depth > 0) {
        if (css[i] === '(') depth++; else if (css[i] === ')') depth--;
        i++;
      }
      bodies.push(css.slice(start, i - 1));
    }
    const total = bodies.reduce((a, b) => a + b.length, 0);
    /* isDecorativeLine 现在用的 stop 正则（与 score.mjs:206 一致）。
     * 一个 gradient 体里除颜色/位置外还有方向（`to bottom` / `45deg`）、
     * 圆心（`circle at 26px 22px`）—— 那些**本来就不该被 stop 正则吃**。
     * 所以先扣掉"方向/几何前缀"，再算残留，否则恒低、没有信号。 */
    const stopRe = /(transparent|#[0-9A-Fa-f]{3,8}|var\(--[\w-]+\))((?:\s+[\d.]+(?:px|%)?){1,2})/gi;
    let consumed = 0;
    let effectiveTotal = 0;
    const missed = [];
    for (const b of bodies) {
      /* 几何前缀：到第一个颜色 token 之前的所有内容 */
      const firstColor = b.search(/transparent|#[0-9A-Fa-f]{3,8}|var\(--|[a-z]+\(/i);
      const prefix = firstColor > 0 ? b.slice(0, firstColor) : '';
      const rest = b.slice(prefix.length);
      effectiveTotal += rest.length;
      const ms = [...rest.matchAll(stopRe)];
      const c = ms.reduce((a, x) => a + x[0].length, 0);
      consumed += c;
      if (rest.length > 8 && c < rest.length * 0.85) missed.push(b.trim().slice(0, 60));
    }
    return { total: effectiveTotal, consumed, n: bodies.length, got: bodies.length - missed.length, missed };
  },

  /* judgeFontChain: 按逗号切，逐组取首位 */
  font(css) {
    const should = [...css.matchAll(/font-family\s*:\s*([^;}]+)/g)];
    const total = should.reduce((a, m) => a + m[1].trim().length, 0);
    /* 判据能判的：至少有一个非 var() 的部分 */
    const readable = should.filter((m) => m[1].split(',').some((p) => !p.trim().startsWith('var(') && p.trim()));
    const consumed = readable.reduce((a, m) => a + m[1].trim().length, 0);
    const missed = should.filter((m) => !m[1].split(',').some((p) => !p.trim().startsWith('var(') && p.trim()));
    return { total, consumed, n: should.length, got: readable.length, missed: missed.map((m) => 'font-family: ' + m[1].trim().slice(0, 40)) };
  },
};

const rows = [];
const ids = readdirSync(BT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d/.test(d.name)).map((d) => d.name).sort();
for (const id of ids) {
  const hp = join(BT, id, 'index.html');
  if (!existsSync(hp)) continue;
  const css = cssOf(readFileSync(hp, 'utf8'));
  const rec = { id };
  for (const [k, fn] of Object.entries(SCANNERS)) {
    const r = fn(css);
    rec[k] = r;
  }
  rows.push(rec);
}

/* ── 输出 ──────────────────────────────────────────────────────────────── */
const pct = (a, b) => (b ? Math.round((100 * a) / b) : null);
const fmt = (p) => (p == null ? '  -' : String(p).padStart(3) + '%');

console.log('残留探针：判据"看进去"了多少（按字符计）');
console.log('═'.repeat(88));
const cols = ['lineWidth', 'radius', 'shadow', 'gradient', 'font'];
const names = { lineWidth: '线宽', radius: '圆角', shadow: '阴影', gradient: '渐变', font: '字体' };
console.log('案      ' + cols.map((c) => (names[c] + '   ').padStart(8)).join(''));
for (const r of rows) {
  console.log(r.id.padEnd(8) + cols.map((c) => fmt(pct(r[c].consumed, r[c].total)).padStart(8)).join(''));
}

console.log('\n' + '─'.repeat(88));
console.log('\n低于 90% 的（判据在盲区里工作）：\n');
let n = 0;
for (const r of rows) {
  for (const c of cols) {
    const p = pct(r[c].consumed, r[c].total);
    if (p != null && p < 90) {
      n++;
      console.log(`  ⚠️ ${r.id} ${names[c]} 覆盖 ${p}%（${r[c].got}/${r[c].n} 条）`);
      for (const m of r[c].missed.slice(0, 3)) console.log(`        · ${m}`);
    }
  }
}
if (!n) console.log('  （无）');

console.log('\n' + '═'.repeat(88));
const stat = (c) => {
  const vals = rows.map((r) => pct(r[c].consumed, r[c].total)).filter((x) => x != null);
  if (!vals.length) return '无数据';
  const low = vals.filter((x) => x < 90).length;
  return `中位 ${vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)]}%，${low}/${vals.length} 案低于 90%`;
};
for (const c of cols) console.log(`  ${names[c]}   ${stat(c)}`);
