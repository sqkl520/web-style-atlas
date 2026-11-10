#!/usr/bin/env node
// 7 次渲染全量交叉对比 + 变体聚类 + 像素级定位
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const BASE = 'deliverables/75-q2/_det/determinism';
const RUNS = ['run1','run2','run3','run4','run5','run6','run7'];
const sha = (b) => createHash('sha256').update(b).digest('hex');
const files = readdirSync(join(BASE, 'run1')).filter((f) => f.endsWith('.jpg')).sort();
const B = {};
for (const f of files) B[f] = RUNS.map((r) => readFileSync(join(BASE, r, f)));

console.log('=== 每个文件在 7 次渲染里的 sha 聚类 ===');
for (const f of files) {
  const m = new Map();
  B[f].forEach((b, i) => {
    const h = sha(b);
    if (!m.has(h)) m.set(h, []);
    m.get(h).push(RUNS[i]);
  });
  console.log(`\n${f}  len=${B[f][0].length}  不同sha数=${m.size}`);
  for (const [h, rs] of m) console.log(`   ${h.slice(0,16)}  n=${rs.length}  [${rs.join(',')}]`);
}

console.log('\n\n=== tablet-page-01 变体 A vs B 逐字节 ===');
// A = run4 (87c7317a), B = run5 (cb6f1ab6)
const A = readFileSync(join(BASE, 'run4/tablet-page-01.jpg'));
const Bb = readFileSync(join(BASE, 'run5/tablet-page-01.jpg'));
let diff = 0, first = -1; const offs = [];
for (let i = 0; i < A.length; i++) if (A[i] !== Bb[i]) { diff++; if (first < 0) first = i; offs.push(i); }
console.log(`A(run4) vs B(run5): len ${A.length}/${Bb.length} 不同=${diff} 首差=${first} 全部偏移=${offs.join(',')}`);
for (const o of offs) console.log(`  offset ${o}: A=0x${A[o].toString(16).padStart(2,'0')}(${A[o]})  B=0x${Bb[o].toString(16).padStart(2,'0')}(${Bb[o]})  XOR=0x${(A[o]^Bb[o]).toString(16).padStart(2,'0')}`);

// 所有 7 次在 51023 处
console.log('\n=== 各 run 在 offset 51023 的字节 ===');
B['tablet-page-01.jpg'].forEach((b, i) => {
  console.log(`  ${RUNS[i]}  0x${b[51023].toString(16).padStart(2,'0')}  sha=${sha(b).slice(0,12)}`);
});

// 检查是否有任何文件在「同一变体内」还有其他差异 —— 全部两两对比，统计差异字节总数分布
console.log('\n=== 全部文件的变体内一致性 ===');
for (const f of files) {
  const groups = new Map();
  B[f].forEach((b, i) => { const h = sha(b); (groups.get(h) || groups.set(h, []).get(h)).push(i); });
  for (const [h, idx] of groups) {
    if (idx.length < 2) { console.log(`  ${f} ${h.slice(0,8)}: 仅 1 次，无法内部对比`); continue; }
    const x = B[f][idx[0]];
    let worst = 0;
    for (const j of idx.slice(1)) {
      let d = 0; for (let k = 0; k < x.length; k++) if (x[k] !== B[f][j][k]) d++;
      worst = Math.max(worst, d);
    }
    console.log(`  ${f} ${h.slice(0,8)}: n=${idx.length} 组内最大差异字节=${worst}`);
  }
}

console.log('\n\n=== report.json 7 次逐叶子键 ===');
const reps = RUNS.map((r) => JSON.parse(readFileSync(join(BASE, r, 'report.json'), 'utf8')));
function leaves(o, p = '', out = new Map()) {
  if (o === null || typeof o !== 'object') { out.set(p, o); return out; }
  if (Array.isArray(o)) { out.set(p + '.#len', o.length); o.forEach((v, i) => leaves(v, `${p}[${i}]`, out)); return out; }
  const ks = Object.keys(o);
  if (!ks.length) { out.set(p || '(root)', '{}'); return out; }
  for (const k of ks) leaves(o[k], p ? `${p}.${k}` : k, out);
  return out;
}
const ls = reps.map((r) => leaves(r));
const all = new Set(ls.flatMap((m) => [...m.keys()]));
const unstable = [];
for (const k of all) {
  const vals = ls.map((m) => (m.has(k) ? JSON.stringify(m.get(k)) : '<MISSING>'));
  if (new Set(vals).size > 1) unstable.push({ k, n: new Set(vals).size, vals });
}
console.log(`叶子键=${all.size} 不一致=${unstable.length}`);
for (const u of unstable) console.log(`  UNSTABLE ${u.k} (${u.n} 种值)\n      ${u.vals.join('\n      ')}`);
