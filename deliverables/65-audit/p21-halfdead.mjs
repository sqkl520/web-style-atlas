// 探针 21：半死字段取证 —— 命中处到底读的是 data.js 字段还是同名的别的东西
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib-load.mjs';

const SEL = join(ROOT, 'prototypes/_selection');
const F = (f) => readFileSync(join(SEL, f), 'utf8').split(/\r?\n/);

function show(file, lines, ctx = 0) {
  const L = F(file);
  for (const n of lines) {
    console.log(`\n--- ${file}:${n} ---`);
    for (let i = Math.max(1, n - ctx); i <= Math.min(L.length, n + ctx); i++) console.log(`${String(i).padStart(4)}| ${L[i - 1]}`);
  }
}

console.log('=========== 1) def 是否真的被渲染？===========');
show('app.js', [193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205]);
console.log('\n--- rowHTML 里用的是 plainOf 还是 r.def ---');
show('app.js', [266]);
console.log('\n--- 详情面板用的是 r.def 吗 ---');
show('app.js', [438]);

console.log('\n\n=========== 2) prompt-copy.js 的 scenes 命中是不是 TEMPLATES 的 scenes？===========');
show('prompt-copy.js', [646, 651, 660, 669, 737, 751, 764]);
console.log('\n--- prompt-copy.js 里有没有读 window.SCHEMES[..].scenes ---');
const pc = F('prompt-copy.js');
pc.forEach((l, i) => { if (/SCHEMES\s*\[[^\]]*\]\.scenes|\.scenes\b/.test(l) && !/TEMPLATES|tpl|\.tpl\./.test(l)) console.log(`${i + 1}| ${l.trim()}`); });

console.log('\n\n=========== 3) style.css 的 family 41 次命中是什么 ===========');
const css = F('style.css');
let n = 0;
css.forEach((l, i) => { if (/family/.test(l)) { n++; if (n <= 3) console.log(`${i + 1}| ${l.trim()}`); } });
console.log(`共 ${n} 处；其中 'font-family' 出现 ${css.filter((l) => /font-family/.test(l)).length} 次，'.family' 访问 ${css.filter((l) => /\.family\b/.test(l)).length} 次`);

console.log('\n\n=========== 4) index.html 有消费任何 data.js 字段吗 ===========');
const html = F('index.html');
html.forEach((l, i) => { if (/SCHEMES|STYLE_PROMPTS|\.id\b|\.cn\b|\.tone\b|\.palette\b/.test(l)) console.log(`${i + 1}| ${l.trim().slice(0, 150)}`); });
