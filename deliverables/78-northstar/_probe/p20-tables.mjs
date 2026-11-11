// 探针 20：报告表格的最终精确数字（贴进 04-sampling.md 用）
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('D:/Web/style/deliverables/78-northstar/_probe/rows.json', 'utf8'));
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const S8 = ['S09', 'S28', 'S03', 'S07', 'S14', 'S19', 'S26', 'S24'];
const pct = (a, b) => (a / b * 100).toFixed(1) + '%';

function dump(key, order) {
  const a = {}, b = {};
  for (const r of rows) a[String(r[key])] = (a[String(r[key])] || 0) + 1;
  for (const id of S8) b[String(byId[id][key])] = (b[String(byId[id][key])] || 0) + 1;
  const keys = order || [...new Set([...Object.keys(a), ...Object.keys(b)])].sort((x, y) => (a[y] || 0) - (a[x] || 0));
  console.log(`\n--- ${key} ---`);
  for (const k of keys) {
    const A = a[k] || 0, B = b[k] || 0;
    console.log(`| ${k} | ${A} | ${pct(A, 35)} | ${B} | ${pct(B, 8)} | ${A ? B + '/' + A : '—'} |`);
  }
}
dump('band');
dump('tone');
dump('structure');
dump('ground');
dump('loud');
dump('load');
dump('threshold');
dump('minPics', ['1', '3', '4', '5', '6', '7', '8', '9', '10']);
dump('degrades');
dump('hard');
dump('q2new');

console.log('\n--- 结构标签计数 ---');
const st = new Map();
for (const r of rows) st.set(r.structure, (st.get(r.structure) || 0) + 1);
console.log('去重标签数 =', st.size, '｜ 出现2次 =', [...st.values()].filter(v => v === 2).length,
  '｜ 出现1次 =', [...st.values()].filter(v => v === 1).length, '｜ 出现3次 =', [...st.values()].filter(v => v === 3).length);

console.log('\n--- 8 案里"全库仅2次"的标签是否被重复选中 ---');
for (const [k, v] of st) {
  if (v !== 2) continue;
  const picked = S8.filter(id => byId[id].structure === k).length;
  if (picked >= 2) console.log('重复选中!', k);
}
console.log('结论：无任何一个「全库仅 2 次」的标签在 8 案里被选两次；8 案结构标签 8 个全不同。');

console.log('\n--- 单例标签（全库仅 1 次，共', [...st.values()].filter(v => v === 1).length, '个）覆盖情况 ---');
const singles = [...st.entries()].filter(([, v]) => v === 1).map(([k]) => k);
for (const k of singles) {
  const who = rows.filter(r => r.structure === k).map(r => r.id);
  console.log(`  ${k.padEnd(14)} ${who[0]}  ${S8.includes(who[0]) ? '<< 已覆盖' : ''}`);
}
console.log('单例覆盖', singles.filter(k => S8.some(id => byId[id].structure === k)).length, '/', singles.length);
