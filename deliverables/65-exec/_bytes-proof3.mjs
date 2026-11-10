// 逐记录重建：从改后 JSON 里删 audit、把 S12/S15/S19 的 layout 还原成空串，
// 再按生成器同样的 JSON.stringify(out, null, 1) 序列化，与改前文件逐字节比。
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const before = readFileSync('deliverables/65-exec/data.before.js', 'utf8');
const after  = readFileSync('prototypes/_selection/data.js', 'utf8');
const hdr = (s) => s.slice(0, s.indexOf('window.SCHEMES'));
const parse = (s) => JSON.parse(s.replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = parse(after);
const target = new Set(['S12','S15','S19']);
const stripped = B.map((r) => {
  const o = {};
  for (const k of Object.keys(r)) {
    if (k === 'audit') continue;
    o[k] = (k === 'layout' && target.has(r.id)) ? '' : r[k];
  }
  return o;
});
const rebuilt = hdr(after) + 'window.SCHEMES = ' + JSON.stringify(stripped, null, 1) + ';\n';
const h = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
console.log('改前 data.js（本轮进场时）      sha256 =', h(before), ' 长度', before.length);
console.log('改后扣掉 audit + 还原 3 案 layout sha256 =', h(rebuilt), ' 长度', rebuilt.length);
console.log('逐字节相同:', h(before) === h(rebuilt) ? '是 —— 除 30 个 audit + 3 个 layout 外，零字节变化' : '否');
