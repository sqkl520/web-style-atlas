// 裁决 3 实测：family 在行卡上的损失，到底是谁造成的？
import { loadData } from './_rt_lib.mjs';

const rows = loadData();

const cur = (f) => (f || '').split('。')[0].split('：').pop();
let totFull = 0, totAfterSplit = 0, totShown = 0;
let nSplitLoss = 0, n34Loss = 0;
const detail = [];
for (const r of rows) {
  const full = r.family || '';
  const a = cur(full);           // 只做 split，不 slice
  const b = a.slice(0, 34);      // 现状
  totFull += full.length; totAfterSplit += a.length; totShown += b.length;
  const splitLoss = full.length - a.length;
  const loss34 = a.length - b.length;
  if (splitLoss > 0) nSplitLoss++;
  if (loss34 > 0) n34Loss++;
  detail.push({ id: r.id, full: full.length, afterSplit: a.length, shown: b.length, splitLoss, loss34, head: b });
}
console.log('=== family 损失的归因（30 案）===');
console.log('family 全长合计           :', totFull);
console.log('只 split 后（不 slice34） :', totAfterSplit, ' → split 造成损失:', totFull - totAfterSplit);
console.log('现状实际显示（slice 34）  :', totShown, ' → slice34 追加损失:', totAfterSplit - totShown);
console.log('被 split 截过的案数      :', nSplitLoss, '/30');
console.log('被 slice(0,34) 追加截的案数:', n34Loss, '/30');
console.log('');
console.log('id  全长 split后 显示 split损 34损');
for (const d of detail) {
  console.log(`${d.id}  ${String(d.full).padStart(3)}  ${String(d.afterSplit).padStart(3)}  ${String(d.shown).padStart(3)}  ${String(d.splitLoss).padStart(4)}  ${String(d.loss34).padStart(3)}`);
}
console.log('');
console.log('=== 5 案样本：split 后（34 字以内原样）===');
for (const d of detail.slice(0, 5)) {
  const r = rows.find((x) => x.id === d.id);
  console.log(`\n[${d.id}] 行卡现显示: ${d.head}`);
  console.log(`     全长: ${r.family}`);
}
console.log('\n=== 30 案 split 后名字长度分布 ===');
const lens = detail.map((d) => d.afterSplit).sort((a, b) => a - b);
console.log('min', lens[0], 'p50', lens[15], 'max', lens[29], 'mean', Math.round(lens.reduce((a, b) => a + b, 0) / 30));
console.log('超过 34 字的案数:', lens.filter((x) => x > 34).length, '/30');
