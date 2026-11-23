/* 字体来源的概率估计：约束到底提高了多少概率？
 *
 * 背景：S22 同提示词两次，一次写了 Google Fonts 来源、一次 0 处。
 * 而 S21 无约束时三次里也写了一次。所以「加了约束」的效果至今不明。
 *
 * 这个脚本做两件事：
 *   ① 把同提示词组里 fontSrc 的分布算出来
 *   ② 给出置信区间，明确说「这些样本够不够下结论」
 *
 * 为什么必须给置信区间：
 * 1/2 = 50% 的 95% 置信区间是 [0%, 100%] —— 也就是说两份样本
 * **什么都不能证明**。不给区间就给个百分比，是在制造虚假的确定感。
 *
 * 判定标准（**样本收进来之前就固定，不事后挑**）：
 *   · 每组 < 5 份  → 不断言概率，只报数
 *   · 两组区间重叠 → 不能说「约束提高了概率」
 *   · 两组区间不重叠且实验组下限 > 对照组上限 → 可以说提高了
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const BT = join(resolve(HERE, '..'), '_blindtest');

/* 与 score.mjs / _repeatability.mjs 同口径 */
function fontSrc(html) {
  const hasImport = /@import\s+url\([^)]*fonts|fonts\.googleapis/i.test(html);
  const hasLink = /<link[^>]+(?:fonts\.googleapis|\.css)[^>]*>/i.test(html);
  const hasFace = /@font-face/i.test(html);
  const localOnly = /src\s*:\s*local\(/i.test(html) && !/url\(/i.test((html.match(/@font-face\{[^}]*\}/gi) || []).join(''));
  if (hasImport || hasLink) return 'remote';
  if (hasFace) return localOnly ? 'local-only' : 'embedded';
  return 'none';
}

const dirs = readdirSync(BT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}(-r\d+)?$/.test(d.name))
  .map((d) => d.name).sort();

/* 按 (案号, 提示词 md5, 有无来源约束) 分组 */
const groups = new Map();
for (const id of dirs) {
  const pp = join(BT, id, '_prompt.txt');
  const hp = join(BT, id, 'index.html');
  if (!existsSync(hp)) continue;
  if (!existsSync(pp)) { continue; }   // 没提示词的跳过（无法判组）
  const prompt = readFileSync(pp, 'utf8');
  const md5 = createHash('md5').update(prompt).digest('hex').slice(0, 8);
  const constrained = /字体必须写清来源/.test(prompt);
  const key = `${id.match(/^S\d{2}/)[0]}@${md5}@${constrained ? '有约束' : '无约束'}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ id, src: fontSrc(readFileSync(hp, 'utf8')) });
}

/* Wilson 区间（比正态近似在小样本下更稳，不会给出负的下限） */
function wilson(k, n) {
  if (!n) return [0, 1];
  const z = 1.96, p = k / n;
  const denom = 1 + z * z / n;
  const centre = (p + z * z / (2 * n)) / denom;
  const spread = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom;
  return [Math.max(0, centre - spread), Math.min(1, centre + spread)];
}
const pct = (x) => Math.round(x * 100) + '%';

console.log('同提示词组的字体来源分布\n');
const summary = [];
for (const [key, runs] of [...groups.entries()].sort()) {
  if (runs.length < 2) continue;
  const [base, md5, cons] = key.split('@');
  const n = runs.length;
  const ok = runs.filter((r) => r.src !== 'none').length;
  const [lo, hi] = wilson(ok, n);
  console.log(`══ ${base}  md5=${md5}  ${cons}  产出 ${n} 次`);
  console.log(`   来源：${runs.map((r) => r.id + '=' + r.src).join(' / ')}`);
  console.log(`   有来源 ${ok}/${n} = ${pct(ok / n)}   95% Wilson 区间 [${pct(lo)}, ${pct(hi)}]`);
  console.log(n < 5 ? `   ⚠️ ${n} 份不足以断言概率（至少要 5 份）` : '');
  console.log('');
  summary.push({ base, cons, n, ok, lo, hi });
}

if (!summary.length) {
  console.log('（没有 ≥2 份的同提示词组）');
  process.exit(0);
}

/* ── 两组对比：有约束 vs 无约束 ──────────────────────────────────── */
const withC = summary.filter((s) => s.cons === '有约束');
const withoutC = summary.filter((s) => s.cons === '无约束');

console.log('━━ 约束效果 ━━');
const agg = (arr) => {
  const n = arr.reduce((s, x) => s + x.n, 0);
  const k = arr.reduce((s, x) => s + x.ok, 0);
  return n ? { n, k, rate: k / n, ...Object.fromEntries(['lo', 'hi'].map((kk, i) => [kk, wilson(k, n)[i]])) } : null;
};
const A = agg(withC), B = agg(withoutC);

const line = (label, x) => x
  ? `  ${label}：${x.k}/${x.n} = ${pct(x.rate)}　区间 [${pct(x.lo)}, ${pct(x.hi)}]`
  : `  ${label}：（无样本）`;
console.log(line('有约束', A));
console.log(line('无约束', B));
console.log('');

if (!A || !B) {
  console.log('  只有一组有样本，无法对比。');
} else if (A.n < 5 || B.n < 5) {
  console.log(`  ⚠️ 样本不足（有约束 ${A.n} 份 / 无约束 ${B.n} 份，各需 ≥5）——`);
  console.log('     现在不能断言「约束提高了概率」，只能报数。');
} else if (A.lo > B.hi) {
  console.log('  ✓ 两组区间不重叠，且实验组下限 > 对照组上限 —— 可以说约束提高了概率。');
} else if (A.hi < B.lo) {
  console.log('  ✗ 两组区间不重叠，但方向相反 —— 约束反而降低了概率（先查是不是判据问题）。');
} else {
  console.log('  · 两组区间重叠 —— 数据不支持「约束提高了概率」这个结论。');
  console.log('    重叠说明这个差异可能只是抽样波动。要区分需要更多样本。');
}
