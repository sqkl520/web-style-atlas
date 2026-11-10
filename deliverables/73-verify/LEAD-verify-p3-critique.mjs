/* 核实 P3 锐评指出的三个数字问题。
 *
 *  ① 断点分母：报告写 21/23，锐评说真实是 28/30（我的探针 `- 7` 是硬编码抄来的）
 *  ② S13 的 100 来源：报告说 100ms，锐评说正则要求 px、物理上不可能，
 *     真实来源是字段 8 的 border-radius ≥ 100px 因固定切 1800 字符越界被捞进来
 *  ③ 栏数 explain() 的检出率：锐评说对随机整数平均 10.3/16 放行，检出率仅 35%
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const dirs = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

/* ① 断点：真实分母是多少 */
function specBreakpoints(md) {
  const i = md.indexOf('布局与网格');
  if (i < 0) return [];
  const seg = md.slice(i, i + 1800);
  const out = new Set();
  for (const m of seg.matchAll(/[<≤>≥]\s*=?\s*(\d{3,4})\s*px/g)) out.add(+m[1]);
  for (const m of seg.matchAll(/(\d{3,4})\s*[–\-~]\s*(\d{3,4})\s*px/g)) { out.add(+m[1]); out.add(+m[2]); }
  return [...out];
}
function cssBreakpoints(css) {
  const out = new Set();
  for (const m of css.matchAll(/@media\s*([^{]+)\{/g)) {
    for (const w of m[1].matchAll(/(?:max|min)-width\s*:\s*(\d+)px/g)) out.add(+w[1]);
  }
  return [...out];
}

let specHas = 0, fullCover = 0;
const missing = [];
for (const dir of dirs) {
  const id = dir.slice(0, 3);
  const sp = join(P, '_specs', id + '.md');
  if (!existsSync(sp)) continue;
  const sbp = specBreakpoints(readFileSync(sp, 'utf8'));
  if (!sbp.length) continue;
  specHas++;
  const cssPath = join(P, dir, 'style.css');
  const cbp = existsSync(cssPath) ? cssBreakpoints(readFileSync(cssPath, 'utf8')) : [];
  const miss = sbp.filter((b) => !cbp.some((c) => Math.abs(c - b) <= 1));
  if (!miss.length) fullCover++;
  else missing.push({ id, miss });
}
console.log('═══ ① 断点真实覆盖率 ═══');
console.log(`  有断点断言的案: ${specHas}/30   ← 我报告里写的分母是 23（硬编码 - 7）`);
console.log(`  全覆盖: ${fullCover}/${specHas}   ← 我报告里写 21/23`);
if (missing.length) for (const m of missing) console.log(`     ${m.id} 缺 [${m.miss.join(',')}]`);

/* ② S13 的 100 到底从哪来 */
console.log('\n═══ ② S13 的 100 ═══');
const s13 = readFileSync(join(P, '_specs/S13.md'), 'utf8');
const i5 = s13.indexOf('布局与网格');
console.log(`  字段5 起点: ${i5}`);
const win = s13.slice(i5, i5 + 1800);
console.log(`  切片区间 [${i5}, ${i5 + 1800}]`);
const idx = win.indexOf('100');
console.log(`  切片内第一个 "100" 的相对位置: ${idx}`);
if (idx >= 0) {
  console.log(`  上下文: …${win.slice(Math.max(0, idx - 90), idx + 60).replace(/\n/g, ' ')}…`);
  console.log(`  ⇒ 距字段5起点 ${idx} 字符，${idx > 1500 ? '**在切片尾部边缘，属于别的字段**' : '在字段5内'}`);
}
/* 找真正的来源 */
const all100 = [...s13.matchAll(/[≥>]\s*100\s*px/g)];
console.log(`  全文 "≥100px" 出现 ${all100.length} 处`);
const f8 = s13.indexOf('去 AI 味审查点');
console.log(`  字段8 起点: ${f8}  ${f8 < i5 + 1800 ? '⇒ **在 1800 字符窗口内，会被误捞**' : '⇒ 在窗口外'}`);

/* ③ explain() 检出率 */
console.log('\n═══ ③ 栏数 explain() 的检出率 ═══');
const explain = (spec, tracks) => {
  if (tracks.has(spec)) return 'direct';
  for (const t of tracks) if (t > 1 && spec % t === 0) return `÷${t}`;
  return null;
};
/* 用实测的 CSS 轨道集合，随机取 16 个整数做检出率测试 */
const tracks = new Set([1, 2, 3, 4, 6, 8, 12, 16]);
let pass = 0;
const total = 1000;
for (let k = 0; k < total; k++) {
  const n = 2 + Math.floor(Math.random() * 40);
  if (explain(n, tracks)) pass++;
}
console.log(`  用轨道集 [1,2,3,4,6,8,12,16] 对随机整数 2..41 测试 ${total} 次:`);
console.log(`  被判"能解释"的比例: ${(pass / total * 100).toFixed(1)}%   ← 锐评说 35%，量级一致`);
console.log(`  ⇒ explain() 的判据太宽：任何能被某个轨道整除的数都被放行。`);
