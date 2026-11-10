// RT 探针 5：任务书点名的那个例子 ——「规格说 12 栏，CSS 里是不是真的 repeat(12, …)」
// 这一条是 P3 唯一的、无可争议的机械判据。全部 30 案跑一遍，看它有没有用。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

function fieldText(lines, label) {
  const i = lines.findIndex((l) => l.includes(label));
  if (i < 0) return '';
  let out = lines[i].replace(/^\s*\*\*\d+\.\s*[^*]*\*\*\s*/, '');
  if (out.trim().length < 4) {
    for (let k = i + 1; k < lines.length; k++) {
      if (/^\s*\*\*\d+[.\-]/.test(lines[k]) && k > i + 1) break;
      out += ' ' + lines[k];
    }
  }
  return out;
}

const rows = [];
for (const dir of cases) {
  const id = dir.slice(0, 3);
  const specP = join(P, '_specs', id + '.md');
  const cssP = join(P, dir, 'style.css');
  if (!existsSync(specP) || !existsSync(cssP)) continue;
  const lines = readFileSync(specP, 'utf8').split(/\r?\n/);
  const css = readFileSync(cssP, 'utf8');
  const f5 = fieldText(lines, '布局与网格');

  // 规格声明的列数：「N 栏」「列数 N」「grid N」
  const colDecl = [];
  for (const m of f5.matchAll(/([0-9]{1,2})\s*栏(?!沟|宽|线|高)/g)) colDecl.push(+m[1]);
  for (const m of f5.matchAll(/列数\s*([0-9]{1,2})/g)) colDecl.push(+m[1]);
  const specCols = [...new Set(colDecl)].filter((n) => n >= 2 && n <= 24);

  // CSS 里所有 repeat(N, …)
  const repeats = [...new Set([...css.matchAll(/repeat\(\s*([0-9]{1,2})\s*,/g)].map((m) => +m[1]))];
  const repeatsVar = [...new Set([...css.matchAll(/repeat\(\s*var\((--[\w-]+)\)/g)].map((m) => m[1]))];
  // 变量形式的列数
  const vars = new Map();
  for (const d of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    const v = d[2].trim();
    if (/^\d{1,2}$/.test(v)) vars.set(d[1], +v);
  }
  const varCols = repeatsVar.map((n) => vars.get(n)).filter((x) => x != null);
  const cssCols = [...new Set([...repeats, ...varCols])];

  const hit = specCols.filter((n) => cssCols.includes(n));
  rows.push({ id, specCols: specCols.join('/'), cssCols: cssCols.join('/'), hit: hit.join('/'),
    ok: specCols.length ? hit.length > 0 : null });
}

console.log('== 规格声明列数 vs CSS 里的 repeat(N, …) ==\n');
console.log('id   规格声明栏数     CSS 的 repeat 栏数        命中');
for (const r of rows) {
  console.log(`${r.id}   ${String(r.specCols || '—').padEnd(16)} ${String(r.cssCols || '—').padEnd(24)} ${r.ok === null ? '（规格未声明）' : (r.ok ? '✔ ' + r.hit : '✘ 无交集')}`);
}
const testable = rows.filter((r) => r.ok !== null);
console.log('\n== 汇总 ==');
console.log(`  规格声明了列数: ${testable.length}/30 案`);
console.log(`  其中 CSS 有对应 repeat(N): ${testable.filter((r) => r.ok).length}/${testable.length}`);
console.log(`  无交集（可疑）: ${testable.filter((r) => !r.ok).map((r) => r.id + ' 规格[' + r.specCols + '] CSS[' + (r.cssCols || '无') + ']').join('; ') || '无'}`);
