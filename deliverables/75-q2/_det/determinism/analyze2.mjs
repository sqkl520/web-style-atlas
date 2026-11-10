#!/usr/bin/env node
// 三次渲染产物的确定性分析（快照在 determinism/run1..run3，互不干扰）
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const BASE = 'deliverables/75-q2/_det/determinism';
const RUNS = ['run1', 'run2', 'run3'];
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

const files = readdirSync(join(BASE, 'run1')).filter((f) => f.endsWith('.jpg')).sort();
const bufs = {};
for (const f of files) bufs[f] = RUNS.map((r) => readFileSync(join(BASE, r, f)));

console.log('=== A. sha256 对照表 ===');
for (const f of files) {
  const hashes = bufs[f].map(sha);
  console.log(`${f}\tlen=${bufs[f][0].length}\tunique_sha=${new Set(hashes).size}`);
  hashes.forEach((h, i) => console.log(`   ${RUNS[i]}  ${h}`));
}

console.log('\n=== B. 逐字节差异 ===');
const diffReport = [];
for (const f of files) {
  const [a, b, c] = bufs[f];
  for (const [n1, x, n2, y] of [['run1', a, 'run2', b], ['run1', a, 'run3', c], ['run2', b, 'run3', c]]) {
    if (x.length !== y.length) { console.log(`${f} ${n1} vs ${n2}: LEN ${x.length} vs ${y.length}`); continue; }
    let diff = 0, first = -1; const offs = [];
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) { diff++; if (first < 0) first = i; if (offs.length < 32) offs.push(i); }
    console.log(`${f} ${n1} vs ${n2}: 不同=${diff}/${x.length} 首差=${first}` + (diff ? ` offsets=${offs.join(',')}` : ' 全等'));
    diffReport.push({ f, n1, n2, diff, total: x.length, first, offs });
  }
}

console.log('\n=== C. report.json 去 at 后全等? ===');
const reps = RUNS.map((r) => JSON.parse(readFileSync(join(BASE, r, 'report.json'), 'utf8')));
reps.forEach((j, i) => console.log(`${RUNS[i]} at=${j.at} keys=${Object.keys(j).join(',')}`));
const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); delete c.at; return JSON.stringify(c, null, 1); };
const st = reps.map(strip);
console.log('去 at: r1==r2', st[0] === st[1], '| r1==r3', st[0] === st[2], '| r2==r3', st[1] === st[2]);

console.log('\n=== D. report.json 逐叶子键对比 ===');
function leaves(o, p = '', out = new Map()) {
  if (o === null || typeof o !== 'object') { out.set(p, o); return out; }
  if (Array.isArray(o)) { out.set(p + '.#len', o.length); o.forEach((v, i) => leaves(v, `${p}[${i}]`, out)); return out; }
  const ks = Object.keys(o);
  if (!ks.length) { out.set(p || '(root)', '{}'); return out; }
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
for (const u of unstable) console.log(`  UNSTABLE ${u.k}\n      ${u.vals.join('\n      ')}`);

console.log('\n=== E. 季度复刻验货的 6 个可度量 ===');
// 从实际 metrics 提取：栏数 / 主轴宽 / 最大标题字号 / 正文比 / 线宽集合 / 图片位数
const get = (j, w) => (j.viewports || []).find((x) => x.width === w);
for (const w of [1440, 768, 390]) {
  console.log(`\nviewport ${w}`);
  const vals = reps.map((j) => {
    const v = get(j, w), m = v.metrics, p = m.page, t = m.type;
    return {
      height: p.height, words: p.words, realPictures: p.realPictures, sections: p.sections,
      svg: p.svg, horizontalOverflow: p.horizontalOverflow,
      maxHeadingSize: m.type.max.size, headingCount: m.headingSummary.count,
      bodySize: t.body.size, bodyContrast: t.body.contrast, bodyLeading: t.body.leading,
      sizeCount: t.sizeCount, familyCount: t.familyCount,
      heroSize: m.hero.size, heroVw: m.hero.vw, heroWidthRatio: m.hero.widthRatio,
      familyShare0: t.families[0].share,
    };
  });
  const keys = Object.keys(vals[0]);
  for (const k of keys) {
    const s = vals.map((v) => JSON.stringify(v[k]));
    console.log(`  ${s.every((x) => x === s[0]) ? 'OK  ' : 'DIFF'} ${k}: ${s.join(' | ')}`);
  }
}

console.log('\n=== F. 关键阈值（用于定容差） ===');
for (const w of [1440, 768, 390]) {
  const j = reps[0]; // 三次相同
  const row = [];
  for (const v of j.viewports) if (v.width === w) {
    const m = v.metrics;
    row.push({
      w,
      pageHeight: m.page.height,
      heroSize: m.hero.size,
      maxHeading: m.type.max.size,
      bodySize: m.type.body.size,
      sizes: m.type.sizes,
      files: (j.images || []).find((i) => i.width === w),
    });
  }
  console.log(JSON.stringify(row[0], null, 1));
}
