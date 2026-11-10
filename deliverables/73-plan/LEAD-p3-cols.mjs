/* P3 核心探针：规格里的「N 栏」断言，原型 CSS 里真的成立吗？
 *
 * 这是 260 条机械断言里最多的一类（118 条 / 24 案）。
 * 判据：从规格字段 5 抽出「N 栏」，与 style.css 里 grid-template-columns
 * 的列数、以及 @media 断点里的列数对比。
 *
 * 注意：规格里「12 栏」可能指设计栅格（用于定位），而 CSS 里未必用
 * grid-template-columns: repeat(12,...) —— 可能用绝对定位或 flex 模拟。
 * 所以本探针分三级判定：
 *   MATCH    CSS 里有 repeat(N, ...) 或 N 个轨道
 *   DERIVED  CSS 里没有 N 栏网格，但能用 N 整除/派生的轨道数解释
 *   MISS     两者都对不上 —— 需要人工看
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

/* 规格里「N 栏」——只取字段 5（布局与网格）里那一段，避免把字段 1/2 的比喻算进来 */
function specCols(id) {
  const p = join(P, '_specs', id + '.md');
  if (!existsSync(p)) return [];
  const t = readFileSync(p, 'utf8');
  const i = t.indexOf('布局与网格');
  if (i < 0) return [];
  const seg = t.slice(i, i + 1600);
  const out = new Set();
  for (const m of seg.matchAll(/(\d+)\s*栏/g)) out.add(+m[1]);
  return [...out];
}

/* CSS 里的网格轨道数 */
function cssTracks(css) {
  const out = new Set();
  // repeat(N, ...)
  for (const m of css.matchAll(/repeat\(\s*(\d+)\s*,/g)) out.add(+m[1]);
  // grid-template-columns: 1fr 1fr 1fr ...（数 1fr 个数）
  for (const m of css.matchAll(/grid-template-columns\s*:\s*([^;}]+)/g)) {
    const frs = (m[1].match(/\d*\.?\d*fr\b/g) || []).length;
    if (frs) out.add(frs);
  }
  // --cols: N 这类变量
  for (const m of css.matchAll(/--(?:cols?|columns|grid-cols?)\s*:\s*(\d+)/gi)) out.add(+m[1]);
  return out;
}

console.log('案    规格栏数        CSS 轨道数                判定');
console.log('─'.repeat(96));

const stats = { MATCH: 0, DERIVED: 0, MISS: 0, NOSPEC: 0 };
const misses = [];

for (const dir of cases) {
  const id = dir.slice(0, 3);
  const cols = specCols(id);
  if (!cols.length) { stats.NOSPEC++; continue; }
  const cssPath = join(P, dir, 'style.css');
  if (!existsSync(cssPath)) { console.log(`${id}  规格 ${cols.join('/')}   ✗ 没有 style.css`); continue; }
  const tracks = cssTracks(readFileSync(cssPath, 'utf8'));

  let verdict = 'MISS';
  const hits = cols.filter((c) => tracks.has(c));
  if (hits.length) verdict = 'MATCH';
  else {
    // DERIVED：某个轨道数能被规格栏数整除，或反过来
    const derived = [...tracks].some((t) => cols.some((c) => t % c === 0 || c % t === 0));
    if (derived) verdict = 'DERIVED';
  }
  stats[verdict]++;
  if (verdict === 'MISS') misses.push({ id, cols, tracks: [...tracks] });

  console.log(`${id}  [${cols.join(',')}]${' '.repeat(Math.max(0, 14 - String(cols.join(',')).length))}  [${[...tracks].join(',')}]${' '.repeat(Math.max(0, 22 - String([...tracks].join(',')).length))}  ${verdict}`);
}

console.log('\n═══ 汇总 ═══');
console.log(`  MATCH   ${stats.MATCH}`);
console.log(`  DERIVED ${stats.DERIVED}`);
console.log(`  MISS    ${stats.MISS}   ← 需要人工看`);
console.log(`  规格无栏数 ${stats.NOSPEC}`);

if (misses.length) {
  console.log('\n═══ MISS 明细 ═══');
  for (const m of misses) console.log(`  ${m.id}  规格 [${m.cols.join(',')}]  CSS [${m.tracks.join(',') || '无网格'}]`);
}
