// 探针 13：26,096 的精确溯源 —— 用 data.js 里 audit 字段的**实际存储值**逐口径复算。
import { loadData } from './_rt_lib.mjs';

const D = loadData();
const audit = D.reduce((a, r) => a + (r.audit || '').length, 0);
const auditBytes = D.reduce((a, r) => a + Buffer.byteLength(r.audit || '', 'utf8'), 0);
const landing = D.reduce((a, r) => a + (r.landing || '').length, 0);
const landingBytes = D.reduce((a, r) => a + Buffer.byteLength(r.landing || '', 'utf8'), 0);
const risk = D.reduce((a, r) => a + (r.risk || '').length, 0);
const riskBytes = D.reduce((a, r) => a + Buffer.byteLength(r.risk || '', 'utf8'), 0);
const han = D.reduce((a, r) => a + ((r.audit || '').match(/[\u4e00-\u9fff]/g) || []).length, 0);

console.log('以 data.js 实际存储值为准：');
console.log('  audit  .length       = ' + audit);
console.log('  audit  UTF-8 bytes   = ' + auditBytes);
console.log('  audit  汉字数        = ' + han);
console.log('  landing .length      = ' + landing);
console.log('  landing UTF-8 bytes  = ' + landingBytes);
console.log('  risk   .length       = ' + risk);
console.log('  risk   UTF-8 bytes   = ' + riskBytes);

console.log('');
console.log('与 Lead 的 26,096 比：');
const cands = {
  'audit chars': audit,
  'audit bytes': auditBytes,
  'audit 汉字': han,
  'audit+risk chars': audit + risk,
  'audit+risk bytes': auditBytes + riskBytes,
  'audit+landing chars': audit + landing,
};
for (const [k, v] of Object.entries(cands)) {
  const d = v - 26096;
  console.log(`  ${String(v).padStart(6)}  ${k.padEnd(22)} ${d === 0 ? '★ 精确命中' : '差 ' + (d > 0 ? '+' : '') + d + '（' + ((v / 26096 - 1) * 100).toFixed(1) + '%）'}`);
}
console.log('');
console.log('结论：「26,096」= audit 字段的 **UTF-8 字节数**（' + auditBytes + ' 字节），不是「字」。');
console.log('      同口径下字符数是 ' + audit + '，汉字 ' + han + '。把字节叫成「字」，虚报 ' + (auditBytes / audit).toFixed(2) + ' 倍。');
