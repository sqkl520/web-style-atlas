// 修正 t4-crosscheck 暴露的 5 处数字错误。
// 错误清单（我自己写报告时手抄/口径不一致造成的）：
//   ① 「19 案抽到 HTML 内联」的**成员名单**写错（数字对，名单错）
//   ② U 类被标 item 数写成 362，实为 383（含 U6 的 case-level 条目）
//   ③ 由此 U 占比写成 35.8%，应为 37.9%
//   ④⑤ 「6 句模板 ×30 = 180」错了，实为 **7 句 ×30 = 210**
// 本脚本给出唯一权威口径，并把 ②/③ 的两种口径都算清，避免报告里再混用。
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'D:/Web/style/deliverables/69-audit';
const T = JSON.parse(readFileSync(OUT + '/t1-truth.json', 'utf8'));
const u = JSON.parse(readFileSync(OUT + '/t3-uclass.json', 'utf8'));
const con = JSON.parse(readFileSync(OUT + '/constraints.json', 'utf8'));

// ── ① HTML 内联成员 ──
const inline = Object.keys(T).filter((id) => T[id].C_htmlInline.length > 0 || T[id].C2_dataUri.length > 0).sort();
console.log('① 有 HTML 内联 / data-URI stroke 的案：' + inline.length + ' 案');
console.log('   ' + inline.join(','));
console.log('   其中只有内联属性（无 data-URI）：' +
  Object.keys(T).filter((id) => T[id].C_htmlInline.length > 0 && T[id].C2_dataUri.length === 0).sort().join(','));
console.log('   其中只有 data-URI（无内联属性）：' +
  Object.keys(T).filter((id) => T[id].C_htmlInline.length === 0 && T[id].C2_dataUri.length > 0).sort().join(','));

// ── ②③ U 类被标条数：两种口径都算 ──
const itemLevel = u.hits.filter((h) => h.cat !== '?');
const caseLevel = u.hits.filter((h) => h.cat === '?');
const uniqItemLevel = new Set(itemLevel.map((h) => h.id + '\u0000' + h.text));
const uniqAll = new Set(u.hits.map((h) => h.id + '\u0000' + h.text));

// 检查 case-level U6 的 21 案是否与 item-level 的 U5-c 21 案完全重合
const cL = new Set(caseLevel.map((h) => h.id));
const iL = new Set(itemLevel.filter((h) => h.code === 'U6').map((h) => h.id));
const sameCases = [...cL].sort().join(',') === [...iL].sort().join(',');
console.log('\n② U 类被标条数：');
console.log('   item-level 去重后        : ' + uniqItemLevel.size + '  → ' + (uniqItemLevel.size / 1011 * 100).toFixed(1) + '%');
console.log('   含 case-level 多重计数后 : ' + uniqAll.size + '  → ' + (uniqAll.size / 1011 * 100).toFixed(1) + '%');
console.log('   case-level 条目数        : ' + caseLevel.length);
console.log('   case-level 与 item-level U6 的案集是否完全相同：' + (sameCases ? '是 → case-level 是冗余计数' : '否'));
console.log('   ⟹ **权威口径 = ' + uniqItemLevel.size + ' 条 / 1011 = ' + (uniqItemLevel.size / 1011 * 100).toFixed(1) + '%**（case-level 冗余，不重复计）');

// ── ④⑤ U1 的 30 条模板句 ──
const u1 = itemLevel.filter((h) => h.code === 'U1');
const byReason = {};
for (const h of u1) byReason[h.reason] = (byReason[h.reason] || 0) + 1;
const full = Object.entries(byReason).filter(([, n]) => n === 30).sort((a, b) => b[1] - a[1]);
console.log('\n④ U1 中"恰好 30 条"（= 30 案各一条）的判据：' + full.length + ' 句');
full.forEach(([r, n], i) => console.log('   ' + (i + 1) + '. ' + n + ' 条  ' + r));
const sum = full.reduce((a, [, n]) => a + n, 0);
console.log('   合计 ' + sum + ' 条，占 U1 的 ' + (sum / u1.length * 100).toFixed(1) + '%，占全部 U 类的 ' + (sum / uniqItemLevel.size * 100).toFixed(1) + '%');
console.log('\n   非 30 条的 U1 判据：');
Object.entries(byReason).filter(([, n]) => n !== 30).sort((a, b) => b[1] - a[1])
  .forEach(([r, n]) => console.log('     ' + n + ' 条  ' + r));

// ── 按 M/S/J 的 U 占比（用 item-level 口径重算） ──
const seen = new Set(); const byCat = {};
for (const [id, v] of Object.entries(con.per)) for (const it of v.items) {
  const k = id + '\u0000' + it.text;
  if (seen.has(k)) continue;
  seen.add(k); byCat[it.cat] = (byCat[it.cat] || 0) + 1;
}
const fl = {};
for (const h of itemLevel) {
  const k = h.id + '\u0000' + h.text;
  if (fl[h.cat] && fl[h.cat].has(k)) continue;
  fl[h.cat] = fl[h.cat] || new Set(); fl[h.cat].add(k);
}
console.log('\n⑤ 按 M/S/J 的 U 占比（item-level 去重口径）：');
let tf = 0, tt = 0;
for (const c of ['M', 'S', 'J']) {
  const n = fl[c] ? fl[c].size : 0; tf += n; tt += byCat[c];
  console.log('   ' + c + ': ' + n + ' / ' + byCat[c] + ' = ' + (n / byCat[c] * 100).toFixed(1) + '%');
}
console.log('   合计: ' + tf + ' / ' + tt + ' = ' + (tf / tt * 100).toFixed(1) + '%');

writeFileSync(OUT + '/t4-authoritative.json', JSON.stringify({
  inlineCases: inline,
  uFlaggedItemLevel: uniqItemLevel.size,
  uFlaggedWithCaseLevel: uniqAll.size,
  uRatio: +(uniqItemLevel.size / 1011 * 100).toFixed(1),
  u1Templates30: full.map(([r, n]) => ({ reason: r, n })),
  u1TemplatesSum: sum,
  byCat, flaggedByCat: Object.fromEntries(Object.entries(fl).map(([k, v]) => [k, v.size])),
}, null, 1), 'utf8');
