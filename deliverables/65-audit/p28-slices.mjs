// 探针 28：截断式消费取证 —— 读了但只取前 N 字（半死字段的典型形态）
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { ROOT, loadSchemes } from './lib-load.mjs';

const S = loadSchemes();
console.log('=== 所有「只取前 N 字」的消费点 ===');
const hits = [
  { file: 'wizard.js', line: 212, field: 'def', n: 96, note: '向导卡片的视觉定义，追加「…」' },
  { file: 'app.js', line: 235, field: 'family', n: 34, note: '行卡的 family（先按。与：切分再取前 34 字）' },
  { file: 'prompt-copy.js', line: 295, field: 'risk', n: 220, note: '提示词里的 risk 截断' },
];
for (const h of hits) {
  const lens = S.map((r) => (String(r[h.field] || '')).length);
  const truncated = lens.filter((x) => x > h.n).length;
  console.log(`\n${h.file}:${h.line}  字段=${h.field}  上限=${h.n} 字  ${h.note}`);
  console.log(`  被截断的案：${truncated}/30（长度区间 ${Math.min(...lens)}–${Math.max(...lens)}）`);
  const lost = S.map((r) => Math.max(0, String(r[h.field] || '').length - h.n)).reduce((a, b) => a + b, 0);
  console.log(`  被丢弃的总字数：${lost} 字`);
  const worst = S.map((r) => ({ id: r.id, l: String(r[h.field] || '').length })).sort((a, b) => b.l - a.l).slice(0, 5);
  console.log(`  最长 5 案：${worst.map((w) => w.id + '=' + w.l).join(' ')}`);
}

console.log('\n\n=== family 的 34 字切片到底切出了什么（前 3 案）===');
for (const r of S.slice(0, 3)) {
  const f = r.family || '';
  console.log(`  ${r.id}: 全 ${f.length} 字 → "${f.split('。')[0].split('：').pop().slice(0, 34)}"`);
}

console.log('\n\n=== def 的 96 字切片（前 3 案）===');
for (const r of S.slice(0, 3)) {
  console.log(`  ${r.id}: 全 ${(r.def || '').length} 字 → "${(r.def || '').slice(0, 96)}…"`);
}

console.log('\n\n=== 详情面板不渲染哪些有值的字段（有数据但用户看不到）===');
const RENDERED = ['def', 'family', 'fonts', 'layout', 'landing', 'visuals', 'motion', 'risk', 'scenes', 'quirk'];
const viaParts = ['copyParts', 'palette', 'bg', 'errorCode', 'errorCodeSource', 'id', 'cn', 'en', 'fr', 'structure', 'gate', 'shots', 'dir', 'tone', 'threshold'];
const NEVER = [...new Set(S.flatMap((r) => Object.keys(r)))].filter((k) => !RENDERED.includes(k) && !viaParts.includes(k));
for (const k of NEVER) {
  const tot = S.reduce((a, r) => a + (typeof r[k] === 'string' ? r[k].length : JSON.stringify(r[k] || '').length), 0);
  console.log(`  ${k}: ${tot} 字（30 案）`);
}
