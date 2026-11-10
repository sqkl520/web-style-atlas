// 探针 24：修正版 —— copy 与 copyParts 的真实覆盖关系；primary 是否在 palette 里
import { loadSchemes } from './lib-load.mjs';

const S = loadSchemes();

console.log('=== A) copyParts 的四个值是否都是 copy 的子串（即 copy 的信息是否被 copyParts 完整承载）===');
let allCovered = 0;
for (const r of S) {
  const c = r.copy || '';
  const p = r.copyParts || {};
  const vals = ['claim', 'button', 'empty', 'error'].map((k) => (p[k] || '').trim()).filter(Boolean);
  const notIn = vals.filter((v) => !c.includes(v));
  if (!notIn.length) allCovered++;
  else console.log(`  ${r.id}: ${notIn.length} 段不在 copy 里 → ${notIn.map((v) => JSON.stringify(v.slice(0, 30))).join(' , ')}`);
}
console.log(`copyParts 全部能从 copy 里找到的案: ${allCovered}/30`);

console.log('\n=== B) 反过来：copy 里有没有 copyParts 之外的信息（标签外的残留文字）===');
let residual = 0;
for (const r of S) {
  let c = r.copy || '';
  const p = r.copyParts || {};
  for (const k of ['claim', 'button', 'empty', 'error']) {
    const v = (p[k] || '').trim();
    if (v) c = c.split(v).join('');
  }
  // 去掉标签词与标点
  const rest = c.replace(/主张句|按钮|空状态|错误状态|错误码|[\s；;。，、"「」“”"':：]/g, '').trim();
  if (rest.length > 6) { residual++; if (residual <= 6) console.log(`  ${r.id} 残留 ${rest.length} 字: ${JSON.stringify(rest.slice(0, 110))}`); }
}
console.log(`copy 里有 copyParts 之外残留信息的案: ${residual}/30`);

console.log('\n=== C) primary 在 palette 里的案数 ===');
let inPal = 0; const outPal = [];
for (const r of S) {
  if ((r.palette || []).includes(r.primary)) inPal++; else outPal.push(r.id);
}
console.log(`primary ∈ palette: ${inPal}/30；不在的: ${outPal.join(' ') || '无'}`);

console.log('\n=== D) primary 是否等于 palette[1]（collect-schemes 的兜底值）===');
let eq1 = 0; const notEq1 = [];
for (const r of S) {
  if ((r.palette || [])[1] === r.primary) eq1++; else notEq1.push(`${r.id}(${r.primary} vs ${(r.palette || [])[1]})`);
}
console.log(`primary === palette[1]: ${eq1}/30`);
console.log('不等的: ' + (notEq1.join(' ') || '无'));

console.log('\n=== E) buttonText 是否等于 _CURRENT-VALUES 的按钮字色（抽样 3 案原文）===');
for (const id of ['S02', 'S04', 'S29']) {
  const r = S.find((x) => x.id === id);
  console.log(`  ${id}: buttonText=${JSON.stringify(r.buttonText)} errorCode=${r.errorCode} errorCodeSource=${JSON.stringify(r.errorCodeSource)}`);
}
