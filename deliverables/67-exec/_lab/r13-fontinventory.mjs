// r13-fontinventory.mjs — 逐处列出 style.css 的 font-size 声明（含注释剥离），并按值判定是否 <13px
//   node r13-fontinventory.mjs <file.css> <label>
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const label = process.argv[3] || file;
const raw = readFileSync(file, 'utf8');

// 逐行扫描，同时跟踪是否在注释里；记录 selector（上一个含 { 的行）
const lines = raw.split(/\r?\n/);
let inComment = false;
let selector = '';
const rows = [];
lines.forEach((line, i) => {
  const original = line;
  // 剥离块注释，保留"该行是否有代码"
  let code = '';
  let j = 0;
  while (j < line.length) {
    if (inComment) {
      const end = line.indexOf('*/', j);
      if (end === -1) { j = line.length; break; }
      inComment = false; j = end + 2;
    } else {
      const start = line.indexOf('/*', j);
      if (start === -1) { code += line.slice(j); j = line.length; break; }
      code += line.slice(j, start);
      inComment = true; j = start + 2;
    }
  }
  if (code.includes('{')) selector = code.slice(0, code.indexOf('{')).trim() || selector;
  const m = code.match(/font-size:\s*([^;}]+)/);
  if (m) rows.push({ line: i + 1, selector, value: m[1].trim(), commentedOut: false, raw: original.trim() });
});

// 解析 :root 里的 --s-* 变量值
const vars = {};
for (const m of raw.matchAll(/(--s-[\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();

const resolve = (v) => {
  const vm = v.match(/var\((--s-[\w-]+)\)/);
  if (vm) return vars[vm[1]] || '(undefined!)';
  return v;
};
const numeric = (v) => {
  const r = resolve(v);
  const px = r.match(/^([\d.]+)px$/);
  if (px) return parseFloat(px[1]);
  const cl = r.match(/clamp\(\s*([\d.]+)px/);
  if (cl) return parseFloat(cl[1]); // 用 clamp 的下限做保守判断
  const em = r.match(/^([\d.]+)em$/);
  if (em) return null; // 相对，单列
  const mx = r.match(/max\(\s*([\d.]+)px/);
  if (mx) return parseFloat(mx[1]);
  return null;
};

console.log(`### ${label}  (${rows.length} 条 font-size 声明，注释已剥离)\n`);
console.log('行号  选择器                                 声明值                     解析后            <13px');
console.log('-'.repeat(118));
let violations = 0;
for (const r of rows) {
  const n = numeric(r.value);
  let flag = '';
  if (n != null && n < 13) { flag = '← 违规'; violations++; }
  else if (n == null) flag = '(相对单位)';
  console.log(
    String(r.line).padStart(4) + '  ' +
    r.selector.slice(0, 38).padEnd(39) + '  ' +
    r.value.slice(0, 26).padEnd(27) + '  ' +
    String(resolve(r.value)).slice(0, 16).padEnd(16) + '  ' + flag
  );
}
console.log(`\n<13px 的声明：${violations} 处`);
console.log('字号档位定义：' + Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('  '));
