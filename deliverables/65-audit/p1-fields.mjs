// 探针 1：data.js 全字段统计（非空案数 / 总字数 / 最长 / 最短 / 缺失案号）
import { loadSchemes, loadPrompts } from './lib-load.mjs';

const S = loadSchemes();
const P = loadPrompts();

// 所有顶层键
const keySet = new Set();
for (const r of S) for (const k of Object.keys(r)) keySet.add(k);
const keys = [...keySet];

function statOf(v) {
  if (v === null || v === undefined) return { kind: 'null', len: 0, empty: true };
  if (Array.isArray(v)) return { kind: 'array', len: JSON.stringify(v).length, empty: v.length === 0, n: v.length };
  if (typeof v === 'string') return { kind: 'string', len: v.length, empty: v.trim() === '' };
  if (typeof v === 'object') return { kind: 'object', len: JSON.stringify(v).length, empty: Object.values(v).every((x) => x === '' || x === null) };
  return { kind: typeof v, len: String(v).length, empty: v === '' || v === null || v === false };
}

// 只统计“内容型”(字符串/数组) 与标量，分别列
const rows = [];
for (const k of keys) {
  const kinds = new Set();
  let emptyCount = 0;
  let total = 0;
  let max = -1, maxIds = [], min = Infinity, minIds = [];
  const emptyIds = [];
  for (const r of S) {
    const v = r[k];
    const st = statOf(v);
    kinds.add(st.kind);
    if (st.empty) { emptyCount++; emptyIds.push(r.id); }
    else {
      total += st.len;
    }
    if (st.len > max) { max = st.len; maxIds = [r.id]; } else if (st.len === max) maxIds.push(r.id);
    if (st.len < min) { min = st.len; minIds = [r.id]; } else if (st.len === min) minIds.push(r.id);
  }
  rows.push({ k, kinds: [...kinds].join('|'), missing: emptyCount, nonEmpty: 30 - emptyCount, total, max, maxIds: maxIds.join(','), min, minIds: minIds.slice(0, 6).join(',') + (minIds.length > 6 ? `…(${minIds.length})` : ''), emptyIds: emptyIds.join(' ') });
}

console.log('=== data.js 顶层键 逐字段统计（30 案）===');
console.log('字段\t类型\t非空案数\t缺\t总字数\t最大\t最长案\t最小\t最短案');
for (const r of rows) {
  console.log([r.k, r.kinds, r.nonEmpty, r.missing, r.total, r.max, r.maxIds, r.min === Infinity ? '-' : r.min, r.minIds].join('\t'));
}
console.log('\n=== 缺字段的案号 ===');
for (const r of rows) if (r.missing) console.log(r.k + ' (' + r.missing + '): ' + r.emptyIds);
console.log('\n顶层键总数: ' + keys.length);

// prompts.js
console.log('\n=== prompts.js 结构 ===');
console.log('顶层键: ' + Object.keys(P).join(', '));
const sk = new Set();
for (const s of P.schemes) for (const k of Object.keys(s)) sk.add(k);
console.log('scheme 键: ' + [...sk].join(', '));
const dk = new Set();
for (const s of P.schemes) for (const k of Object.keys(s.dna || {})) dk.add(k);
console.log('dna 键: ' + [...dk].join(', '));
