/* plan-probe-p3b.mjs — 只读：把 P3 探针的两个假阳性来源量清楚
 *   ① 4 处「旧值残留」是否全在 CSS **注释**里（若是，必须先剥注释，否则 4/4 假红）
 *   ② S04 的按钮字色为什么不是规格声明的 #FFFFFF
 */
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const P = join(ROOT, 'prototypes');

const OLD = [
  ['S04-mango-collage-wall', 'E8871E', '主色'],
  ['S10-grid-versus-sheet', 'F4F1EA', '背景'],
  ['S19-copperplate-herbarium-cabinet', 'EDE6D4', '背景'],
  ['S28-jazz-intaglio-wall', '1F5FA8', '主色'],
];

const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

console.log('═══ P3 · 假阳性①：旧值命中是否全在注释里 ═══\n');
for (const [dir, hex, field] of OLD) {
  const raw = readFileSync(join(P, dir, 'style.css'), 'utf8');
  const bare = strip(raw);
  const inRaw = new RegExp(hex, 'i').test(raw);
  const inBare = new RegExp(hex, 'i').test(bare);
  console.log(`  ${dir.slice(0, 3)} 旧${field} #${hex}：剥注释前=${inRaw ? '命中' : '—'}  剥注释后=${inBare ? '**仍命中（真残留）**' : '不命中（假阳性）'}`);
  if (inRaw) {
    raw.split(/\r?\n/).forEach((L, i) => {
      if (new RegExp(hex, 'i').test(L)) {
        const isComment = /^\s*(\/\*|\*)/.test(L);
        console.log(`      style.css:${i + 1}  ${isComment ? '[注释]' : '[代码]'}  ${L.trim().slice(0, 110)}`);
      }
    });
  }
}

console.log('\n═══ P3 · 假阳性②：S04 按钮字色 ═══\n');
const s04 = readFileSync(join(P, 'S04-mango-collage-wall/style.css'), 'utf8');
const rootM = s04.match(/:root\s*\{([\s\S]*?)\}/);
console.log('  :root 变量：');
for (const L of rootM[1].split(/\r?\n/)) if (/(--\w+)\s*:\s*(#[0-9A-Fa-f]{6})/.test(L)) console.log('     ' + L.trim());
const btnM = s04.match(/\.btn\s*\{([^}]*)\}/);
console.log('\n  .btn 规则：', btnM[1].replace(/\s+/g, ' ').trim().slice(0, 200));
console.log('\n  规格（_CURRENT-VALUES.md §1 S04 行）声明的按钮字色是 **白字 `#FFFFFF`**（5.83:1）');
console.log('  实际 .btn 用 `color:var(--paper)` = `#F0E2C8`（不是 #FFFFFF）');

/* 算对比度，判断这是不是真的缺陷 */
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const cr = (a, b) => { const x = lum(a), y = lum(b); return ((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
console.log(`  对比度实测： #F0E2C8 on #96550F = ${cr('#F0E2C8', '#96550F')}:1`);
console.log(`               #FFFFFF on #96550F = ${cr('#FFFFFF', '#96550F')}:1   ← 规格声明的 5.83:1`);
console.log('  ⇒ 两种都过 AA（≥4.5），但**实测值 ≠ 规格声明值** —— 这是"规格说 A、实现是 B"的真偏离。');
console.log('     按 P3 的分类它属于「机械可核」：判据是"声明的按钮字色必须出现在 .btn 的 color 上"。');
