// 探针 26：26,096 这个数字能不能复算出来（多个口径逐一试）
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSchemes, readSpec, specIds } from './lib-load.mjs';

const S = loadSchemes();
const f8 = S.map((r) => r.audit || '');
const totalChars = f8.reduce((a, s) => a + s.length, 0);
const totalBytes = f8.reduce((a, s) => a + Buffer.byteLength(s, 'utf8'), 0);

console.log('口径试验（目标 26,096）：');
console.log(`  A data.js audit 字符数合计            = ${totalChars}`);
console.log(`  B data.js audit UTF-8 字节合计        = ${totalBytes}`);
console.log(`  C audit + risk 字符                   = ${totalChars + S.reduce((a, r) => a + (r.risk || '').length, 0)}`);
console.log(`  D audit 全文（含标点空白）            = 同上 A`);

// 从 md 原始段落统计（不 dec，含空白与换行）
const NAME = '([^\\n：*\\d][^\\n：*]{0,38}?)';
const RES = [
  new RegExp('^(\\d{1,2})(-附|[.．])\\s*' + NAME + '：', 'gm'),
  new RegExp('^\\*\\*(\\d{1,2})(-附)?[.．]?\\s*' + NAME + '\\*\\*\\s*$', 'gm'),
  new RegExp('^(\\d{1,2})(-附)?[.．]?\\s*\\*\\*' + NAME + '\\*\\*\\s*[：:]', 'gm'),
];
let rawSum = 0, rawByteSum = 0;
for (const id of specIds()) {
  const text = readSpec(id);
  const s = [];
  for (const re of RES) for (const m of text.matchAll(re)) s.push({ i: m.index, end: m.index + m[0].length, key: m[3] });
  s.sort((a, b) => a.i - b.i);
  const byLine = new Map();
  for (const x of s) { const ln = text.lastIndexOf('\n', x.i) + 1; if (!byLine.has(ln)) byLine.set(ln, x); }
  const st = [...byLine.values()].sort((a, b) => a.i - b.i);
  const idx = st.findIndex((x) => x.key.replace(/（[^）]*）/g, '').trim() === '去 AI 味审查点');
  const raw = text.slice(st[idx].end, st[idx + 1].i);
  rawSum += raw.length;
  rawByteSum += Buffer.byteLength(raw, 'utf8');
}
console.log(`  E md 原始段落（含空白/换行）字符       = ${rawSum}`);
console.log(`  F md 原始段落 UTF-8 字节               = ${rawByteSum}`);

// 是否 = 全部 13 字段里某几项之和
const keys = ['def', 'family', 'fonts', 'layout', 'visuals', 'motion', 'audit', 'risk', 'landing', 'scenes', 'quirk', 'copy'];
const lens = Object.fromEntries(keys.map((k) => [k, S.reduce((a, r) => a + (typeof r[k] === 'string' ? r[k].length : 0), 0)]));
console.log('\n各正文字段合计：');
for (const [k, v] of Object.entries(lens)) console.log(`  ${k}\t${v}`);

// 试二元组合
console.log('\n接近 26096 的字段组合：');
const ent = Object.entries(lens);
for (let i = 0; i < ent.length; i++) for (let j = i + 1; j < ent.length; j++) {
  const s = ent[i][1] + ent[j][1];
  if (Math.abs(s - 26096) < 1200) console.log(`  ${ent[i][0]} + ${ent[j][0]} = ${s}`);
}
console.log('\n全部正文字段相加 = ' + Object.values(lens).reduce((a, b) => a + b, 0));
