// 最强的字节级证明：从改后 data.js 里删掉 audit 行 与 3 案 layout 行，看是否与改前逐字节相同（其余部分）
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const before = readFileSync('deliverables/65-exec/data.before.js', 'utf8');
const after  = readFileSync('prototypes/_selection/data.js', 'utf8');
// 生成器格式：JSON.stringify(..., null, 1) → 每条记录里的键各占一行，缩进 1 空格
const lines = after.split('\n');
const kept = lines.filter((l) => !/^\s*"audit": /.test(l));
const stripped = kept.join('\n');
const h = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);
console.log('改前 data.js              sha256[:16] =', h(before), '长度', before.length);
console.log('改后删掉 audit 行后        sha256[:16] =', h(stripped), '长度', stripped.length);
console.log('两者逐字节相同:', h(before) === h(stripped) ? '是（除 audit 行外零字节变化）' : '否');
if (h(before) !== h(stripped)) {
  const b = before.split('\n'), a = stripped.split('\n');
  let n = 0;
  for (let i = 0; i < Math.max(a.length, b.length) && n < 8; i++) {
    if (a[i] !== b[i]) { n++; console.log('  首个不同 @行' + (i+1) + '\n    改前: ' + String(b[i]).slice(0,100) + '\n    改后: ' + String(a[i]).slice(0,100)); }
  }
}
