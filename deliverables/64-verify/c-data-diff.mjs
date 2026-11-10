// C: 对比"已提交的 data.js" 与 "重跑 collect-schemes 产出" 的差异
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const load = (p) => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(p, 'utf8'), ctx);
  return ctx.window.SCHEMES;
};
const A = load('D:/Web/style/deliverables/64-verify/snap/data.js.bak'); // 我进来时的 working tree（= HEAD）
const B = load('D:/Web/style/deliverables/64-verify/snap/data-run2.js'); // 重跑产物

console.log('count A/B:', A.length, B.length);
const keys = new Set();
A.forEach((x) => Object.keys(x).forEach((k) => keys.add(k)));
const diffs = [];
for (let i = 0; i < A.length; i++) {
  const a = A[i], b = B[i];
  for (const k of keys) {
    const sa = JSON.stringify(a[k]), sb = JSON.stringify(b[k]);
    if (sa !== sb) diffs.push({ id: a.id, key: k, old: sa, new: sb });
  }
}
console.log('total field diffs:', diffs.length);
const byKey = {};
for (const d of diffs) byKey[d.key] = (byKey[d.key] || 0) + 1;
console.log('by key:', JSON.stringify(byKey));
for (const d of diffs.filter((x) => x.key === 'palette')) {
  console.log('PALETTE', d.id, '\n  committed:', d.old, '\n  regenerated:', d.new);
}
for (const d of diffs.filter((x) => x.key !== 'palette').slice(0, 12)) {
  console.log('OTHER', d.id, d.key, '\n  committed:', String(d.old).slice(0, 160), '\n  regen    :', String(d.new).slice(0, 160));
}
