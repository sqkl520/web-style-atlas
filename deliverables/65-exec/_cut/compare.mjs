/* 改前/改后逐案对比：audit 的 sha256、长度、键序。要求「其余 29 案字节不变」。 */
import fs from 'node:fs';
const B = JSON.parse(fs.readFileSync('deliverables/65-exec/_cut/before.json', 'utf8'));
const A = JSON.parse(fs.readFileSync('deliverables/65-exec/_cut/after.json', 'utf8'));
const bm = new Map(B.cases.map((c) => [c.id, c]));
const am = new Map(A.cases.map((c) => [c.id, c]));

console.log('═══ 1. audit 总字数 ═══');
console.log(`改前 ${B.totalAuditLen}  改后 ${A.totalAuditLen}  差 ${A.totalAuditLen - B.totalAuditLen}`);
console.log(`（= 10539 − S13 780 + S13 306 = ${10539 - 780 + 306}）`);

console.log('\n═══ 2. 逐案 audit sha256 / 长度 ═══');
console.log('案号  len前  len后   Δ    sha256 前 16 位    同？');
let same = 0, diff = [];
for (const id of bm.keys()) {
  const b = bm.get(id), a = am.get(id);
  const eq = b.auditSha === a.auditSha;
  if (eq) same++; else diff.push(id);
  console.log(`${id}  ${String(b.auditLen).padStart(5)}  ${String(a.auditLen).padStart(5)}  ${String(a.auditLen - b.auditLen).padStart(4)}   ${b.auditSha.slice(0, 16)}  ${a.auditSha.slice(0, 16)}  ${eq ? '✓同' : '✗变'}`);
}
console.log(`\n相同 ${same}/30；变化：${diff.join(' ') || '无'}`);

console.log('\n═══ 3. risk 的 sha256 是否也被动过（应当全部不变）═══');
const riskChanged = [];
for (const id of bm.keys()) if (bm.get(id).riskSha !== am.get(id).riskSha) riskChanged.push(id);
console.log('risk 变化的案：' + (riskChanged.join(' ') || '无（30/30 不变）'));

console.log('\n═══ 4. 键序：audit 必须早于 risk ═══');
let bad = 0;
for (const id of am.keys()) {
  const c = am.get(id);
  const ok = c.auditIdx >= 0 && c.riskIdx >= 0 && c.auditIdx < c.riskIdx;
  if (!ok) bad++;
  if (id === 'S01' || id === 'S13') {
    console.log(`${id}  auditIdx=${c.auditIdx}  riskIdx=${c.riskIdx}  ${ok ? '✓' : '✗'}`);
    console.log(`   keys: ${c.keys.join(',')}`);
  }
}
console.log(`30 案中 auditIdx < riskIdx 成立 ${30 - bad}/30`);

console.log('\n═══ 5. 键集合本身有没有增删（键序之外的回归）═══');
const keySetChanged = [];
for (const id of bm.keys()) {
  const bk = [...bm.get(id).keys].sort().join(',');
  const ak = [...am.get(id).keys].sort().join(',');
  if (bk !== ak) keySetChanged.push(id);
}
console.log('键集合变化的案：' + (keySetChanged.join(' ') || '无（30/30 键集合一致）'));

console.log('\n═══ 6. S13 污染串是否还在数据层 ═══');
const s13 = am.get('S13');
console.log(`S13.audit 长度 = ${s13.auditLen}（期望 306 ±2）`);
