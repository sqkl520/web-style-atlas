// Lead 独立核实：data.js 的 palette 是不是 prompts.js 的子集？
// 这是整个长任务的地基：
//   子集 → 两条链描述同一件事，只是 data.js 截断了 → 合并方案成立
//   非子集 → 两条链描述不同的事 → 合并方案要改
import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';
const P = ROOT + '/prototypes';

const dataJs = readFileSync(P + '/_selection/data.js', 'utf8');
const sbD = { window: {} };
new Function('window', dataJs)(sbD.window);
const SCHEMES = sbD.window.SCHEMES || [];
const dM = new Map(SCHEMES.map((s) => [s.id, s]));

const pr = readFileSync(P + '/_selection/prompts.js', 'utf8');
const sbP = { window: {} };
new Function('window', pr)(sbP.window);
const pM = new Map((sbP.window.STYLE_PROMPTS.schemes || []).map((s) => [s.id, s]));

const HEXT = /#([0-9a-fA-F]{6})(?![0-9a-fA-F])/g;
const hx = (s) => [...String(s).matchAll(HEXT)].map((m) => m[0].toUpperCase());

console.log('=== P1 核实：data.js palette ⊆ prompts.js palette ? ===\n');
console.log('案     data色数  prompts色数  子集?  data独有(不在prompts里的)');
console.log('-'.repeat(100));
let sub = 0, notSub = 0;
const notSubList = [];
for (const id of [...dM.keys()].sort()) {
  const d = hx((dM.get(id).palette || []).join(' '));
  const r = pM.get(id)?.dna?.palette;
  const p = hx(Array.isArray(r) ? r.join(' ') : String(r || ''));
  const dataOnly = d.filter((h) => !p.includes(h));
  const isSub = dataOnly.length === 0;
  if (isSub) sub++; else { notSub++; notSubList.push({ id, d, p, dataOnly }); }
  console.log(`${id}  ${String(d.length).padStart(6)}  ${String(p.length).padStart(10)}   ${(isSub ? '✓ 是' : '✗ 否').padEnd(5)}  ${dataOnly.join(' ') || '—'}`);
}
console.log('-'.repeat(100));
console.log(`\n子集: ${sub}/30    非子集: ${notSub}/30`);
if (notSub) {
  console.log('\n=== 非子集的案（这是关键证据）===');
  for (const x of notSubList) {
    console.log(`  ${x.id}  data 独有: ${x.dataOnly.join(' ')}`);
    console.log(`      data=[${x.d.join(',')}]`);
    console.log(`      prompts=[${x.p.join(',')}]`);
  }
}

console.log('\n\n=== 反向：prompts.js 有、data.js 没有的色（应当很多，因为是截断）===');
let totalExtra = 0;
const extraCounts = [];
for (const id of [...dM.keys()].sort()) {
  const d = hx((dM.get(id).palette || []).join(' '));
  const r = pM.get(id)?.dna?.palette;
  const p = hx(Array.isArray(r) ? r.join(' ') : String(r || ''));
  const extra = p.filter((h) => !d.includes(h));
  totalExtra += extra.length;
  extraCounts.push({ id, n: extra.length, extra });
}
const dist = extraCounts.reduce((a, c) => { a[c.n] = (a[c.n] || 0) + 1; return a; }, {});
console.log(`prompts 独有色的总数: ${totalExtra}`);
console.log(`每案独有数分布: ${JSON.stringify(dist)}`);
console.log('\n样例（独有最多的 5 案）:');
extraCounts.sort((a, b) => b.n - a.n).slice(0, 5).forEach((x) => console.log(`  ${x.id}  多 ${x.n} 个: ${x.extra.join(' ')}`));
