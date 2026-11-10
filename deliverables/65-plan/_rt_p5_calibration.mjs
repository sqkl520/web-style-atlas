// 探针 5：穷举「去 AI 味审查点」的各种度量口径，检验 Lead 的 26,096 是哪种口径。
// 结论影响判决：如果 26,096 是 **UTF-8 字节**，那它不是"字"，是把中文 3 字节当 1 字讲大了 2.4 倍。
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PROTO } from './_rt_lib.mjs';

const SPECS = join(PROTO, '_specs');
const ids = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name.slice(0, 3)).sort();

const dec = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

// 切「第 8 字段」的原文块（含标题行，含尾部空行）
function block8(md) {
  const re = /^[ \t]*(?:\*\*)?[ \t]*8[ \t]*\.[ \t]*[^\n]*$/gm;
  const m = re.exec(md);
  if (!m) return { full: '', body: '' };
  const nextRe = /^[ \t]*(?:\*\*)?[ \t]*9[ \t]*\.[ \t]*/gm;
  nextRe.lastIndex = m.index + m[0].length;
  const n = nextRe.exec(md);
  return { full: md.slice(m.index, n ? n.index : md.length), body: md.slice(m.index + m[0].length, n ? n.index : md.length) };
}

const T = {};
const add = (k, v) => { T[k] = (T[k] || 0) + v; };
let perCase = [];
for (const id of ids) {
  const md = readFileSync(join(SPECS, id + '.md'), 'utf8');
  const { full, body } = block8(md);
  const d = {
    id,
    fullChars: full.length, fullBytes: Buffer.byteLength(full, 'utf8'),
    bodyChars: body.length, bodyBytes: Buffer.byteLength(body, 'utf8'),
    decFull: dec(full), decBody: dec(body),
  };
  d.decFullChars = d.decFull.length; d.decFullBytes = Buffer.byteLength(d.decFull, 'utf8');
  d.decBodyChars = d.decBody.length; d.decBodyBytes = Buffer.byteLength(d.decBody, 'utf8');
  d.han = (full.match(/[\u4e00-\u9fff]/g) || []).length;
  d.nonspace = full.replace(/\s/g, '').length;
  perCase.push(d);
  for (const [k, v] of Object.entries(d)) if (k !== 'id' && k !== 'decFull' && k !== 'decBody') add(k, v);
}

console.log('=== 「第 8 字段 去 AI 味审查点」全 30 案 各种口径合计 ===');
for (const [k, v] of Object.entries(T).sort((a, b) => a[1] - b[1])) {
  const near = Math.abs(v - 26096) < 1200 ? '   ★ 与 26,096 相差 ' + (v - 26096) : '';
  console.log(String(v).padStart(7) + '  ' + k + near);
}

console.log('');
console.log('=== 精确命中检查（26,096） ===');
const hit = Object.entries(T).filter(([, v]) => v === 26096);
console.log(hit.length ? hit.map(([k]) => k).join(', ') : '无任何口径精确等于 26,096');

console.log('');
console.log('=== 最接近的三种 ===');
Object.entries(T).sort((a, b) => Math.abs(a[1] - 26096) - Math.abs(b[1] - 26096)).slice(0, 4)
  .forEach(([k, v]) => console.log(`  ${k} = ${v}　差 ${v - 26096}（${((v / 26096 - 1) * 100).toFixed(1)}%）`));

console.log('');
console.log('=== 若 26,096 是字节，换算成"字"是多少 ===');
const bytesKey = 'decFullBytes';
console.log(`decFullBytes=${T[bytesKey]} → 按 CJK 均 3 字节折字约 ${Math.round(T[bytesKey] / 3)} 字；实际 JS .length = ${T.decFullChars}`);
console.log(`字节/字符 比 = ${(T[bytesKey] / T.decFullChars).toFixed(2)}`);

console.log('');
console.log('=== 逐案：decFullChars ===');
console.log(perCase.map((d) => d.id + '=' + d.decFullChars).join(' '));
