import { readFileSync, existsSync, readdirSync } from 'node:fs';

const DUMP = 'deliverables/69-plan/dump';
const online = readFileSync(`${DUMP}/S19.txt`, 'utf8');
const manual = readFileSync('deliverables/99-scratch/prompt-s19.md', 'utf8');

console.log('=== 长度对比 ===');
console.log('  线上 buildStylePrompt(S19):', online.length, '字');
console.log('  那次手工验证 prompt-s19.md :', manual.length, '字');

// 剥掉 md 的头部说明
const manualBody = manual.split('---').slice(1).join('---').trim();
console.log('  手工版正文:', manualBody.length, '字');

console.log('\n=== 结构对比：段落标题 ===');
const headOf = (s) => [...s.matchAll(/^#+\s*(.+)$/gm)].map(m => m[1].trim());
console.log('  线上段落:', JSON.stringify([...new Set([...online.matchAll(/\*\*([一二三四五六七八九十]、[^*]{2,20})\*\*/g)].map(m=>m[1]))]));
console.log('  手工段落:', JSON.stringify([...new Set([...manual.matchAll(/\*\*([一二三四五六七八九十]、[^*]{2,20})\*\*/g)].map(m=>m[1]))]));

console.log('\n=== 色值对比 ===');
const hexes = (s) => [...new Set((s.match(/#[0-9a-fA-F]{6}/g) || []).map(x => x.toUpperCase()))];
const ho = hexes(online), hm = hexes(manualBody);
console.log('  线上:', JSON.stringify(ho));
console.log('  手工:', JSON.stringify(hm));
console.log('  线上有、手工无:', JSON.stringify(ho.filter(x => !hm.includes(x))));
console.log('  手工有、线上无:', JSON.stringify(hm.filter(x => !ho.includes(x))));

console.log('\n=== 字体对比 ===');
const fonts = (s) => [...new Set([...s.matchAll(/([A-Z][A-Za-z ]{2,24}(?:\s+(?:Mono|Serif|Sans|Sans SC|Plex Mono))?)/g)].map(m => m[1].trim()))].filter(f => /Spectral|Noto|Plex|Archivo|Anton|Inter|Roboto|Playfair/i.test(f));
console.log('  线上:', JSON.stringify(fonts(online).slice(0, 12)));
console.log('  手工:', JSON.stringify(fonts(manualBody).slice(0, 12)));

console.log('\n=== 关键：两版是否「同一条链路」 ===');
const norm = s => s.replace(/\s+/g, '').replace(/[「」""'']/g, '');
console.log('  归一化后完全相同?', norm(online) === norm(manualBody));
// 找最长公共子串（粗略）
let best = 0, bestStr = '';
const a = norm(online), b = norm(manualBody);
for (let i = 0; i < a.length; i += 40) {
  for (let len = 200; len >= 80; len -= 40) {
    const sub = a.slice(i, i + len);
    if (sub.length === len && b.includes(sub)) { if (len > best) { best = len; bestStr = sub.slice(0, 60); } break; }
  }
}
console.log('  最长公共片段(约):', best, '字 →', bestStr ? bestStr.slice(0, 60) : '(无 80 字以上公共片段)');

console.log('\n=== 手工版正文前 600 字（看它到底写了什么）===');
console.log(manualBody.slice(0, 600));
