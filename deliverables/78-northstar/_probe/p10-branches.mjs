// 探针 10：buildPrompt 的实际分岔点 —— 抽样该覆盖的维度只能来自这里
import { readFileSync } from 'node:fs';

const src = readFileSync('D:/Web/style/prototypes/_selection/prompt-copy.js', 'utf8').split('\n');
// buildPrompt 从 275 行开始，到 window.buildStylePrompt 之前
let start = src.findIndex(l => l.includes('function buildPrompt(id, opts)'));
// buildPrompt 实体在 275–994（994 是它自己的收尾 `}`，L995 起是手动复制兜底）
let end = 994;
console.log('buildPrompt 行范围:', start + 1, '-', end + 1, '(共', end - start, '行)');

const body = src.slice(start, end);
// 找所有 s.xxx / d.xxx / o.xxx 的读取
const reads = new Map();
for (let i = 0; i < body.length; i++) {
  const line = body[i];
  if (/^\s*(\/\*|\*|\/\/)/.test(line)) continue; // 跳过注释行
  for (const m of line.matchAll(/\b([sdo])\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    const key = m[1] + '.' + m[2];
    if (!reads.has(key)) reads.set(key, []);
    reads.get(key).push(start + i + 1);
  }
}
console.log('\n=== buildPrompt 内去注释后的字段读取（首次出现行号）===');
for (const [k, lines] of [...reads.entries()].sort()) {
  console.log(k.padEnd(28), 'x' + String(lines.length).padStart(2), ' 首现 L' + lines[0]);
}
