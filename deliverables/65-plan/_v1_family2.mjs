// 裁决 3 续：family 的句子结构 + 行卡上「偷的机制」那段在哪
import { loadData } from './_rt_lib.mjs';
const rows = loadData();

console.log('=== family 的句段结构（按 。 切）===');
let n1 = 0, hasMech = 0;
for (const r of rows) {
  const segs = (r.family || '').split('。').filter(Boolean);
  if (segs.length === 1) n1++;
  if (/偷的|偷的是|拿的是|我们拿的|偷取/.test(r.family)) hasMech++;
}
console.log('只有一句（split 无损）的案:', n1, '/30');
console.log('含「偷/拿」机制句的案  :', hasMech, '/30');

console.log('\n=== 每案：句数 / 第1句字数 / 机制句字数 ===');
let totMech = 0;
for (const r of rows) {
  const segs = (r.family || '').split('。').filter((s) => s.trim());
  const fam = segs[0] || '';
  const mechSeg = segs.find((s, i) => i > 0 && /偷|拿的|不是/.test(s)) || '';
  totMech += mechSeg.length;
  console.log(`${r.id} 句数=${segs.length} 第1句=${String(fam.length).padStart(3)} 机制句=${String(mechSeg.length).padStart(3)} | ${mechSeg.slice(0, 46)}`);
}
console.log('\n机制句合计字数:', totMech);

console.log('\n=== S13 第 1 句 42 字的原文 ===');
const s13 = rows.find((r) => r.id === 'S13');
console.log(JSON.stringify(s13.family.split('。')[0]));
console.log('现状显示:', JSON.stringify(s13.family.split('。')[0].split('：').pop().slice(0, 34)));

console.log('\n=== 若行卡改为「家族名 + 机制句」，字数增量 ===');
let delta = 0;
for (const r of rows) {
  const segs = (r.family || '').split('。').filter((s) => s.trim());
  const mechSeg = segs.find((s, i) => i > 0 && /偷|拿的|不是/.test(s)) || '';
  delta += mechSeg.length;
}
console.log('30 案机制句合计:', delta, '｜每案均值', Math.round(delta / 30), '｜区间');
const ls = rows.map((r) => { const segs = (r.family || '').split('。').filter((s) => s.trim()); const m = segs.find((s, i) => i > 0 && /偷|拿的|不是/.test(s)) || ''; return m.length; }).sort((a, b) => a - b);
console.log('min', ls[0], 'p50', ls[15], 'max', ls[29]);
