// 探针 12：HEAD 基线 vs 当前工作树 —— 字段差集（证明并发修改改了哪些字段）
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib-load.mjs';

function load(path) {
  const src = readFileSync(path, 'utf8');
  const i = src.indexOf('window.SCHEMES =');
  const j = src.lastIndexOf(';');
  return JSON.parse(src.slice(i + 'window.SCHEMES ='.length, j));
}
const head = load(join(ROOT, 'deliverables/65-audit/baseline/data.HEAD.js'));
const cur = load(join(ROOT, 'prototypes/_selection/data.js'));

const kHead = new Set(head.flatMap((r) => Object.keys(r)));
const kCur = new Set(cur.flatMap((r) => Object.keys(r)));
console.log('HEAD 字段数: ' + kHead.size + '   当前字段数: ' + kCur.size);
console.log('当前新增: ' + [...kCur].filter((k) => !kHead.has(k)).join(' ') || '（无）');
console.log('当前删除: ' + [...kHead].filter((k) => !kCur.has(k)).join(' ') || '（无）');

console.log('\n=== layout 非空案数 ===');
const lh = head.filter((r) => r.layout && r.layout.trim()).map((r) => r.id);
const lc = cur.filter((r) => r.layout && r.layout.trim()).map((r) => r.id);
console.log(`HEAD ${lh.length}/30   空: ${head.filter((r) => !(r.layout || '').trim()).map((r) => r.id).join(' ')}`);
console.log(`当前 ${lc.length}/30   空: ${cur.filter((r) => !(r.layout || '').trim()).map((r) => r.id).join(' ')}`);

console.log('\n=== HEAD 中 layout 为空的案的 layout 长度对比 ===');
for (const id of ['S12', 'S15', 'S19']) {
  const h = head.find((r) => r.id === id), c = cur.find((r) => r.id === id);
  console.log(`${id}  HEAD len=${(h.layout || '').length}  当前 len=${(c.layout || '').length}`);
  console.log(`   当前: ${JSON.stringify((c.layout || '').slice(0, 100))}`);
}

// 逐字段：非空案数 / 总字数
function stats(rows, k) {
  let nonEmpty = 0, total = 0; const empty = [];
  for (const r of rows) {
    const v = r[k];
    const s = v == null ? '' : (typeof v === 'string' ? v : JSON.stringify(v));
    if (s.trim() === '' || s === '[]' || s === '{}') { empty.push(r.id); continue; }
    nonEmpty++; total += s.length;
  }
  return { nonEmpty, total, empty };
}
console.log('\n=== 逐字段 非空案数/总字数：HEAD → 当前 ===');
const all = [...kCur];
for (const k of all) {
  const a = stats(head, k), b = stats(cur, k);
  const diff = (a.nonEmpty !== b.nonEmpty || a.total !== b.total) ? '  ← 变了' : '';
  console.log(`${k}\t${a.nonEmpty}→${b.nonEmpty}\t${a.total}→${b.total}${diff}`);
}
