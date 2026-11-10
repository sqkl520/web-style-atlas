/* P3 其余三类机械断言的批量核验：断点 / 基线 / 线宽等级。
 *
 * 这三类比「栏数」更硬，因为它们是**单一数值**，不需要解释「12 栏如何实现成 4 栏网格」：
 *   断点：规格说 <768px 单栏 → CSS 里应有 @media (max-width: 768px) 之类
 *   基线：规格说基线 8px  → CSS 里 8px 应作为间距单位反复出现
 *   线宽：规格说只有 0.4 与 0.8 两级 → CSS/HTML 的 stroke/border 不应出现第三级
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

const specsOf = (id) => {
  const p = join(P, '_specs', id + '.md');
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
};

/* ── 断点 ── */
function specBreakpoints(md) {
  const i = md.indexOf('布局与网格');
  if (i < 0) return [];
  const seg = md.slice(i, i + 1800);
  const out = new Set();
  for (const m of seg.matchAll(/[<≤]\s*(\d{3,4})\s*px/g)) out.add(+m[1]);
  for (const m of seg.matchAll(/(\d{3,4})\s*[–\-~]\s*(\d{3,4})\s*px/g)) { out.add(+m[1]); out.add(+m[2]); }
  return [...out].sort((a, b) => a - b);
}
function cssBreakpoints(css) {
  const out = new Set();
  for (const m of css.matchAll(/@media[^{]*?(?:max|min)-width\s*:\s*(\d+)px/g)) out.add(+m[1]);
  return [...out].sort((a, b) => a - b);
}

/* ── 基线 ── */
function specBaseline(md) {
  const m = md.slice(Math.max(0, md.indexOf('布局与网格'))).match(/基线\s*(\d+(?:\.\d+)?)\s*px/);
  return m ? parseFloat(m[1]) : null;
}

/* ── 线宽等级（只认「Xpx 与 Ypx 两级」这种明写） ── */
function specLineWidths(md) {
  const m = md.match(/(\d+(?:\.\d+)?)\s*px\s*与\s*(\d+(?:\.\d+)?)\s*px[^。；]{0,10}(?:两级|两档)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}
function cssLineWidths(css, html) {
  const out = new Set();
  const src = [css, html].join('\n');
  // 剥注释
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of clean.matchAll(/(?:border(?:-\w+)?|outline|stroke-width|text-decoration-thickness)\s*[:=]\s*["']?(\d*\.?\d+)/g)) {
    const v = parseFloat(m[1]);
    if (v > 0) out.add(v);
  }
  for (const m of clean.matchAll(/stroke-width\s*=\s*["'](\d*\.?\d+)["']/g)) out.add(parseFloat(m[1]));
  return [...out].sort((a, b) => a - b);
}

const R = { bp: [], base: [], lw: [] };

for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const md = specsOf(id);
  if (!md) continue;
  const cssPath = join(P, dir, 'style.css');
  const htmlPath = join(P, dir, 'index.html');
  const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
  const html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';

  /* 断点 */
  const sbp = specBreakpoints(md);
  if (sbp.length) {
    const cbp = cssBreakpoints(css);
    const missing = sbp.filter((b) => !cbp.some((c) => Math.abs(c - b) <= 1));
    R.bp.push({ id, spec: sbp, css: cbp, missing });
  }

  /* 基线 */
  const sbl = specBaseline(md);
  if (sbl !== null) {
    const re = new RegExp(`\\b${sbl}(?:\\.0)?px\\b`, 'g');
    const hits = (css.match(re) || []).length;
    const varDef = new RegExp(`--[\\w-]+\\s*:\\s*${sbl}px`).test(css);
    R.base.push({ id, base: sbl, hits, varDef });
  }

  /* 线宽等级 */
  const slw = specLineWidths(md);
  if (slw) {
    const clw = cssLineWidths(css, html);
    const extra = clw.filter((v) => !slw.includes(v) && v < 1 && !slw.some((s) => Math.abs(s - v) < 0.06));
    R.lw.push({ id, spec: slw, css: clw, extra });
  }
}

console.log('═══ ① 断点 ═══\n');
let bpOk = 0, bpBad = 0;
for (const r of R.bp) {
  const ok = r.missing.length === 0;
  if (ok) bpOk++; else bpBad++;
  console.log(`${r.id}  规格 [${r.spec.join(',')}]`.padEnd(34) + `CSS [${r.css.join(',')}]`.padEnd(30) + (ok ? '✓' : `⚠ 缺 ${r.missing.join(',')}`));
}
console.log(`\n  全覆盖 ${bpOk}/${R.bp.length}   有缺 ${bpBad}/${R.bp.length}`);

console.log('\n═══ ② 基线 ═══\n');
let baseOk = 0;
for (const r of R.base) {
  const ok = r.varDef || r.hits >= 3;
  if (ok) baseOk++;
  console.log(`${r.id}  基线 ${r.base}px`.padEnd(22) + `${r.hits} 处出现`.padEnd(12) + (r.varDef ? '有变量定义' : '').padEnd(14) + (ok ? '✓' : '⚠'));
}
console.log(`\n  成立 ${baseOk}/${R.base.length}`);

console.log('\n═══ ③ 线宽等级（规格明写「Xpx 与 Ypx 两级」的案）═══\n');
for (const r of R.lw) {
  console.log(`${r.id}  规格 [${r.spec.join(', ')}]`.padEnd(30) + `CSS/HTML 全部 [${r.css.join(',')}]`.padEnd(40) + (r.extra.length ? `⚠ 超出 ${r.extra.join(',')}` : '✓'));
}
