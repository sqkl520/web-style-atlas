// 探针：Q4 的关键检验 —— 「1327 条约束」里有多少是 30 案**逐字重复的模板**，
// 有多少是这一案独有的 DNA？如果大头是模板，那"再加字号/配比"是在给噪声加噪声。
// 方法：把 30 条提示词按行切开，统计"在 ≥28 案里逐字相同"的行 → 模板行。
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'D:/Web/style';
const dump = JSON.parse(readFileSync(join(ROOT, 'deliverables/70-plan/critique/p-prompts-dump.json'), 'utf8'));
const ids = Object.keys(dump.full).sort();

// 按行统计出现频次
const lineCount = new Map();
for (const id of ids) {
  for (const l of new Set(dump.full[id].split('\n').map((s) => s.trim()).filter(Boolean))) {
    lineCount.set(l, (lineCount.get(l) || 0) + 1);
  }
}

const rows = [];
for (const id of ids) {
  const lines = dump.full[id].split('\n').map((s) => s.trim()).filter(Boolean);
  const boiler = lines.filter((l) => (lineCount.get(l) || 0) >= 28);
  const dna = lines.filter((l) => (lineCount.get(l) || 0) < 28);
  const boilerChars = boiler.reduce((a, l) => a + l.length, 0);
  const total = dump.full[id].length;
  rows.push({ id, lines: lines.length, boilerN: boiler.length, dnaN: dna.length, boilerChars, total, pct: boilerChars / total * 100 });
}

const rep = [];
rep.push('=== 每案：逐字模板行 vs 本案独有行 ===');
rep.push('id   总行 模板行 独有行  模板字数/总字数   模板占比');
for (const r of rows) {
  rep.push(`${r.id} ${String(r.lines).padStart(5)} ${String(r.boilerN).padStart(6)} ${String(r.dnaN).padStart(6)}  ${String(r.boilerChars).padStart(6)}/${String(r.total).padStart(5)}  ${r.pct.toFixed(1)}%`);
}
const avgPct = rows.reduce((a, r) => a + r.pct, 0) / rows.length;
rep.push('');
rep.push(`平均模板占比 ${avgPct.toFixed(1)}%（30 案逐字相同的行）`);
rep.push('');

// 列出 30 案逐字相同的那几行（模板骨料）
const common = [...lineCount.entries()].filter(([, n]) => n >= 28).sort((a, b) => b[1] - a[1]);
rep.push(`=== 在 ≥28 案里逐字相同的行共 ${common.length} 条 ===`);
for (const [l, n] of common) {
  rep.push(`[${n}/30] ${l.slice(0, 110)}`);
}
rep.push('');
rep.push('=== 这说明什么 ===');
rep.push(`30 条提示词里平均 ${avgPct.toFixed(0)}% 的字是同一份模板。`);
rep.push('「1327 条约束」是**按 30 条累加**得到的，其中模板部分对每一案都计了一遍。');
rep.push('所以"再加字号层级"加的其实是模板层的条数 × 30，而不是 30 个不同的设计判断。');
writeFileSync(join(ROOT, 'deliverables/70-plan/critique/p-q4-boilerplate.txt'), rep.join('\n'), 'utf8');
console.log('written');
