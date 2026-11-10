/* P3 核心探针 v2：修正 v1 的判据漏洞。
 *
 * v1 的 bug：`cols.filter(c => tracks.has(c))` 只要**一个**命中就判 MATCH。
 *   S25 规格 [3,7,10]，CSS 只有 3，7 和 10 都没找到 → 却判 MATCH。
 *   这会把真实的偏差洗成绿。
 *
 * v2 判据：逐个数答覆盖率。
 *   FULL   规格里每个栏数都能在 CSS 轨道里找到
 *   PARTIAL 部分能找到（列出缺的）
 *   NONE   一个都找不到
 * 只报 FULL 为通过；PARTIAL/NONE 都要人工看。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name)
  .sort();

function specCols(id) {
  const p = join(P, '_specs', id + '.md');
  if (!existsSync(p)) return [];
  const t = readFileSync(p, 'utf8');
  const i = t.indexOf('布局与网格');
  if (i < 0) return [];
  const seg = t.slice(i, i + 1600);
  const out = new Set();
  for (const m of seg.matchAll(/(\d+)\s*栏/g)) out.add(+m[1]);
  return [...out].sort((a, b) => a - b);
}

function cssTracks(css) {
  const out = new Set();
  for (const m of css.matchAll(/repeat\(\s*(\d+)\s*,/g)) out.add(+m[1]);
  for (const m of css.matchAll(/grid-template-columns\s*:\s*([^;}]+)/g)) {
    const frs = (m[1].match(/\d*\.?\d*fr\b/g) || []).length;
    if (frs) out.add(frs);
  }
  for (const m of css.matchAll(/--(?:cols?|columns|grid-cols?)\s*:\s*(\d+)/gi)) out.add(+m[1]);
  return out;
}

/* 面积匹配：CSS 里该栏数是否有对应轨道，或者能否由已存在的轨道**精确**组合出来。
 * 「12 栏设计栅格」常实现为 4 栏卡片网格（每卡占 3 栏）——那是合法的派生，
 * 但必须能整除，且不能反过来（4 栏不能解释 12 栏的精确版心）。 */
function explain(spec, tracks) {
  if (tracks.has(spec)) return 'direct';
  for (const t of tracks) if (t > 1 && spec % t === 0) return `÷${t}`;
  return null;
}

const stats = { FULL: 0, PARTIAL: 0, NONE: 0, NOSPEC: 0 };
const rows = [];

for (const dir of cases) {
  const id = dir.slice(0, 3);
  const cols = specCols(id);
  if (!cols.length) { stats.NOSPEC++; continue; }
  const cssPath = join(P, dir, 'style.css');
  if (!existsSync(cssPath)) { stats.NONE++; rows.push({ id, cols, tracks: [], missing: cols, verdict: 'NONE' }); continue; }
  const tracks = cssTracks(readFileSync(cssPath, 'utf8'));

  const explained = [];
  const missing = [];
  for (const c of cols) {
    const how = explain(c, tracks);
    if (how) explained.push(`${c}(${how})`);
    else missing.push(c);
  }
  let verdict = missing.length === 0 ? 'FULL' : explained.length ? 'PARTIAL' : 'NONE';
  stats[verdict]++;
  rows.push({ id, cols, tracks: [...tracks].sort((a, b) => a - b), missing, explained, verdict });
}

console.log('案    规格栏数         CSS 轨道              解释              判定');
console.log('─'.repeat(104));
for (const r of rows) {
  console.log(
    `${r.id}  [${r.cols.join(',')}]`.padEnd(22) +
    `[${r.tracks.join(',') || '无'}]`.padEnd(22) +
    `${r.explained.join(' ')}`.padEnd(18) +
    (r.verdict === 'FULL' ? '✓ FULL' : r.verdict === 'PARTIAL' ? `⚠ PARTIAL 缺 ${r.missing.join(',')}` : '✗ NONE')
  );
}

console.log('\n═══ 汇总 ═══');
console.log(`  FULL    ${stats.FULL}/23   （规格里每个栏数都能解释）`);
console.log(`  PARTIAL ${stats.PARTIAL}/23   ← 有栏数找不到，需人工核`);
console.log(`  NONE    ${stats.NONE}/23`);
console.log(`  规格无栏数 ${stats.NOSPEC}`);

const partial = rows.filter((r) => r.verdict !== 'FULL');
if (partial.length) {
  console.log('\n═══ 需人工核的案 ═══');
  for (const r of partial) console.log(`  ${r.id}  规格 [${r.cols.join(',')}]  缺 [${r.missing.join(',')}]  CSS [${r.tracks.join(',') || '无'}]`);
}
