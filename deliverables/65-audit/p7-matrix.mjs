// 探针 7：32 个 data.js 字段 × 6 个 UI 消费方的命中矩阵（只认访问形态，避免 id/copy 这类短词误报）
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadSchemes } from './lib-load.mjs';

const SEL = join(ROOT, 'prototypes/_selection');
const FILES = ['app.js', 'index.html', 'prompt-copy.js', 'wizard.js', 'wizard.html', 'style.css'];

// 字段清单从 data.js 动态取（避免漏掉新增字段）
const S = loadSchemes();
const FIELDS = [...new Set(S.flatMap((r) => Object.keys(r)))];

const src = {};
for (const f of FILES) {
  const p = join(SEL, f);
  src[f] = existsSync(p) ? readFileSync(p, 'utf8') : null;
}

// 一行里所有访问形态：X.field / X['field'] / {field} 解构 / "field": 
function hitsOf(text, field) {
  if (!text) return { n: 0, lines: [] };
  const out = [];
  const lines = text.split(/\r?\n/);
  const pats = [
    new RegExp('\\.' + field + '\\b', 'g'),                 // r.def
    new RegExp('\\[\\s*[\'"]' + field + '[\'"]\\s*\\]', 'g'), // r['def']
    new RegExp('\\{\\s*[^}]*\\b' + field + '\\b[^}]*\\}', 'g'), // { def } 解构
    new RegExp('\\b' + field + '\\s*:', 'g'),               // 对象字面量键
  ];
  lines.forEach((l, i) => {
    let n = 0;
    for (const p of pats) { p.lastIndex = 0; const m = l.match(p); if (m) n += m.length; }
    if (n) out.push({ ln: i + 1, n, text: l.trim().slice(0, 160) });
  });
  return { n: out.reduce((a, b) => a + b.n, 0), lines: out };
}

const matrix = [];
for (const f of FIELDS) {
  const row = { field: f };
  for (const file of FILES) { const h = hitsOf(src[file], f); row[file] = h.n; row['_' + file] = h.lines; }
  matrix.push(row);
}

console.log('字段\t' + FILES.join('\t') + '\t合计');
for (const r of matrix) {
  const tot = FILES.reduce((a, f) => a + r[f], 0);
  console.log(r.field + '\t' + FILES.map((f) => r[f] || '').join('\t') + '\t' + tot);
}

console.log('\n\n=== 零命中的字段（6 个文件全 0）===');
for (const r of matrix) {
  const tot = FILES.reduce((a, f) => a + r[f], 0);
  if (!tot) console.log('  ' + r.field);
}

console.log('\n=== 有命中但只在 1–2 个文件里的字段 ===');
for (const r of matrix) {
  const on = FILES.filter((f) => r[f] > 0);
  if (on.length && on.length <= 2) console.log(`  ${r.field}: ${on.map((f) => f + '×' + r[f]).join(', ')}`);
}

// 明细
console.log('\n\n=== 命中明细（供人工确认是否真读了该字段）===');
for (const r of matrix) {
  const tot = FILES.reduce((a, f) => a + r[f], 0);
  if (!tot) continue;
  console.log('\n### ' + r.field + '  (合计 ' + tot + ')');
  for (const f of FILES) {
    for (const h of r['_' + f]) console.log(`  ${f}:${h.ln}  ${h.text}`);
  }
}
