#!/usr/bin/env node
// 三次渲染产物的确定性分析：sha256 / 逐字节差异 / report.json 去 at 全等 / 逐键对比
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const BASE = 'deliverables/75-q2/_det';
const RUNS = ['run1', 'run2', 'run3'];
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const files = readdirSync(join(BASE, 'run1')).filter((f) => f.endsWith('.jpg')).sort();

console.log('=== A. sha256 对照表 ===');
const bufs = {};
for (const f of files) {
  bufs[f] = RUNS.map((r) => readFileSync(join(BASE, r, f)));
  const hashes = bufs[f].map(sha);
  const uniq = new Set(hashes).size;
  console.log(`${f}\tlen=${bufs[f][0].length}\tunique=${uniq}`);
  hashes.forEach((h, i) => console.log(`   ${RUNS[i]}  ${h}`));
}

console.log('\n=== B. 逐字节差异 ===');
for (const f of files) {
  const [a, b, c] = bufs[f];
  const pairs = [['run1', a, 'run2', b], ['run1', a, 'run3', c], ['run2', b, 'run3', c]];
  for (const [n1, x, n2, y] of pairs) {
    if (x.length !== y.length) {
      console.log(`${f} ${n1} vs ${n2}: 长度不同 ${x.length} vs ${y.length}`);
      continue;
    }
    let diff = 0, first = -1, offsets = [];
    for (let i = 0; i < x.length; i++) {
      if (x[i] !== y[i]) { diff++; if (first < 0) first = i; if (offsets.length < 64) offsets.push(i); }
    }
    console.log(`${f} ${n1} vs ${n2}: 不同=${diff}/${x.length} 首差=${first}` +
      (diff ? `  offsets(前${offsets.length})=${offsets.join(',')}` : '  全等'));
  }
}

console.log('\n=== C. report.json 去 at 后全等? ===');
const reps = RUNS.map((r) => JSON.parse(readFileSync(join(BASE, r, 'report.json'), 'utf8')));
reps.forEach((j, i) => console.log(`${RUNS[i]} at=${j.at}  keys=${Object.keys(j).join(',')}`));
const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.at; return JSON.stringify(c, null, 1); };
const stripped = reps.map(strip);
console.log('去 at 后 run1==run2:', stripped[0] === stripped[1]);
console.log('去 at 后 run1==run3:', stripped[0] === stripped[2]);
console.log('去 at 后 run2==run3:', stripped[1] === stripped[2]);

// 逐键叶子对比，列出所有不一致路径
console.log('\n=== D. report.json 逐叶子键对比（不剔 at）===');
function leaves(o, p = '', out = new Map()) {
  if (o === null || typeof o !== 'object') { out.set(p, o); return out; }
  if (Array.isArray(o)) {
    if (out.has(p + '#len')) {} // noop
    out.set(p + '#len', o.length);
    o.forEach((v, i) => leaves(v, `${p}[${i}]`, out));
    return out;
  }
  const ks = Object.keys(o);
  if (!ks.length) { out.set(p, '{}'); return out; }
  for (const k of ks) leaves(o[k], p ? `${p}.${k}` : k, out);
  return out;
}
const ls = reps.map((r) => leaves(r));
const allKeys = new Set(ls.flatMap((m) => [...m.keys()]));
const unstable = [];
for (const k of allKeys) {
  const vals = ls.map((m) => (m.has(k) ? JSON.stringify(m.get(k)) : '<MISSING>'));
  if (new Set(vals).size > 1) unstable.push({ k, vals });
}
console.log(`叶子键总数=${allKeys.size}  不一致键数=${unstable.length}`);
for (const u of unstable) console.log(`  UNSTABLE ${u.k}: ${u.vals.join(' | ')}`);

// 高频数字摘要（用户关心的 6 个可度量）
console.log('\n=== E. 6 个可度量在三次渲染里的值 ===');
for (const v of reps[0].viewports) {
  const i = reps.indexOf(v);
  const pick = (j) => {
    const m = (j.viewports || []).find((x) => x.width === v.width) || {};
    const mt = m.metrics || {};
    return {
      cols: mt.page && mt.page.columns,
      axis: mt.page && mt.page.axisWidth,
      maxH: mt.headingSummary && mt.headingSummary.maxSize,
      typeRatio: mt.type && mt.type.bodyRatio,
      lineWidths: m.metrics && m.metrics.rules && m.metrics.rules.widths,
      imgCount: mt.page && mt.page.realPictures,
    };
  };
  console.log(`width=${v.width}`);
  reps.forEach((j, ri) => console.log(`  ${RUNS[ri]} ${JSON.stringify(pick(j))}`));
}
