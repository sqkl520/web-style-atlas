// 去掉 audit 行 + 3 案 layout 行后，应与改前逐字节相同
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const before = readFileSync('deliverables/65-exec/data.before.js', 'utf8');
const after  = readFileSync('prototypes/_selection/data.js', 'utf8');
const lines = after.split('\n');
const kept = [];
let layoutFixed = 0;
for (const l of lines) {
  if (/^\s*"audit": /.test(l)) continue;
  if (/^\s*"layout": "8 栏，基线 6px|^\s*"layout": "12 栏，基线 8px/.test(l)) { layoutFixed++; kept.push('  "layout": "",'); continue; }
  kept.push(l);
}
console.log('被还原成空串的 layout 行数:', layoutFixed, '（应为 3）');
const stripped = kept.join('\n');
const h = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
console.log('改前 data.js        sha256 =', h(before));
console.log('改后（扣 audit+3 layout） sha256 =', h(stripped));
console.log('逐字节相同:', h(before) === h(stripped) ? '是 ✅ 其余 27 案 + 所有非目标字段零字节变化' : '否');
