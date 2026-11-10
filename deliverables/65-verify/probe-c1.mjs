// 精确定位：为什么「30 个方案」改成 31/29 都查不出来
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const L = readFileSync(join(ROOT, 'README.md'), 'utf8').split('\n');

// 复刻 check-docs.mjs:264 的正则与 :274 的守卫
const re = /([\d,]{1,4})\s*(?:个设计方案|个可运行原型|个方案(?!的)|个原型|design schemes|runnable prototypes|schemes|prototypes)/g;
const F_schemes = 30;
const num = (s) => Number(String(s).replace(/[,\s　]/g, ''));

console.log('=== 复刻 nums/schemes 对 README 第 16 行的判定 ===');
for (const line of L) {
  for (const m of line.matchAll(re)) {
    const n = num(m[1]);
    const tail = line.slice(m.index + m[0].length, m.index + m[0].length + 40);
    const reasons = [];
    if (/^\s*(?:pass|passed|passes|达标)/i.test(tail)) reasons.push('尾随"达标"→放行');
    if (n > 30) reasons.push('n>30 → 被 `if (n <= 30 …)` 守卫跳过');
    if (/模板|template/i.test(line)) reasons.push('同一行含「模板」→ 整行 continue');
    const flagged = n <= 30 && n !== F_schemes && n > 0 && !/模板|template/i.test(line)
      && !/^\s*(?:pass|passed|passes|达标)/i.test(tail);
    console.log(`  命中「${m[0]}」 n=${n} ${n === F_schemes ? '(=30 正确)' : ''} ${flagged ? '→ 会 FAIL' : '→ 不判'} ${reasons.length ? '<' + reasons.join('；') + '>' : ''}`);
  }
}
console.log('\n=== 第 16 行原文 ===');
const l16 = L.find((l) => l.includes('风格标本库'));
console.log('  ' + l16.slice(0, 100));
console.log('\n=== 结论 ===');
console.log('  该行同时含「模板」，且 n=31 时 n>30 —— 两条独立机制都让它逃检。');
console.log('  把 30 改成 31 或 29，nums/schemes 都不会红；只有 n 落在 1..29 且该行不含「模板」时才会红。');
