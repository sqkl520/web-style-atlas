// 校对报告里引用的几个数（只读）。
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');

// 1) 改前行卡显示字数
let before = 0;
for (const r of B) before += (r.family || '').split('。')[0].split('：').pop().slice(0, 34).length;
console.log('改前行卡合计显示:', before);

// 2) S13 行卡改前显示的那半句
const s13 = (B.find((r) => r.id === 'S13').family || '').split('。')[0].split('：').pop().slice(0, 34);
console.log('S13 行卡改前:', JSON.stringify(s13));

// 3) family 全长
const lens = B.map((r) => (r.family || '').length);
console.log('family 全长 min/p50/max/合计:', Math.min(...lens), lens.slice().sort((a, b) => a - b)[15], Math.max(...lens), lens.reduce((a, b) => a + b, 0));

// 4) 行卡高度：改前 390 的总高 vs clamp=1 的总高
console.log('\n（下面三个数来自实测 JSON）');
const a = JSON.parse(readFileSync('deliverables/65-exec/audit-before.json', 'utf8'));
const b = JSON.parse(readFileSync('deliverables/65-exec/audit-after.json', 'utf8'));
for (const i of [0, 1]) {
  const A = a.viewports[i].rowsClosed, Bv = b.viewports[i].rowsClosed;
  const sa = A.reduce((x, y) => x + y.rowH, 0), sb = Bv.reduce((x, y) => x + y.rowH, 0);
  console.log(`  ${a.viewports[i].label} 行总高 改前 ${sa.toFixed(0)} → 改后 ${sb.toFixed(0)}  (${((sb / sa - 1) * 100).toFixed(1)}%)`);
}

// 5) S13 前 307 字最后是否有空格
const t = B.find((r) => r.id === 'S13').audit;
console.log('\nS13 slice(0,307) 最后一个字符:', JSON.stringify(t[306]), '码位 U+' + t.charCodeAt(306).toString(16).toUpperCase());

// 6) 全新 780 字里那 473 字占比
console.log('473/780 =', (473 / 780 * 100).toFixed(1) + '%');
