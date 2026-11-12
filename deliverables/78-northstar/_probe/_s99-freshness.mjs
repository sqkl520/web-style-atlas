/* 验证 S99 的新鲜性：它的机制值必须不在 35 案的 CSS 里成组出现。
 * 判据不是「每个值都全新」（那太苛），而是「这组值的组合是新的」——
 * 尺寸链 / 行数读数这套手法，任何一案的 style.css 都不该有。 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const dirs = readdirSync(join(ROOT, 'prototypes')).filter((d) => /^S\d\d-/.test(d)).sort();

const s99 = readFileSync(join(ROOT, 'deliverables/78-northstar/blind/S99/task.txt'), 'utf8');
const mech = s99.split('\n').find((l) => l.includes('签名动作')) || '';
console.log('S99 机制句:', mech.slice(0, 120), '...\n');

/* S99 的标志值 */
const SIG = ['132px', '1×9px', '12px', '24px', '18px'];
console.log('S99 标志值:', SIG.join(' '));

console.log('\n=== 逐案检查：这些值在该案 style.css 里出现几个 ===');
let suspicious = [];
for (const d of dirs) {
  const css = readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8');
  const hit = SIG.filter((v) => {
    /* 1×9px 这种写法 CSS 里不会有，查它的两个分量 */
    if (v === '1×9px') return /width:\s*1px/.test(css) && /height:\s*9px/.test(css);
    return css.includes(v);
  });
  if (hit.length >= 3) suspicious.push({ id: d.slice(0, 3), hit });
}
if (suspicious.length) {
  console.log('⚠ 有 3 个以上标志值同时出现的案（需人工确认）:');
  for (const s of suspicious) console.log(`  ${s.id}: ${s.hit.join(' ')}`);
} else {
  console.log('✓ 没有任何一案同时含 3 个以上 S99 标志值');
}

/* 关键：尺寸链这个手法本身 —— 查「尺寸线 / dimension / ruler / 行数」这类词 */
console.log('\n=== 「尺寸链 / 行数读数」手法在 35 案里出现过吗 ===');
const PATTERNS = [/尺寸链/, /dimension-line/i, /ruler/i, /行数/, /line-count/i];
let found = [];
for (const d of dirs) {
  const css = readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8');
  const html = readFileSync(join(ROOT, 'prototypes', d, 'index.html'), 'utf8');
  for (const p of PATTERNS) {
    if (p.test(css) || p.test(html)) { found.push({ id: d.slice(0, 3), p: p.source }); break; }
  }
}
console.log(found.length ? `⚠ ${found.length} 案命中：${found.map((f) => f.id + '(' + f.p + ')').join(' ')}`
                        : '✓ 零命中 —— 这是一个手法上全新的设计');
