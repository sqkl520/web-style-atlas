/* 核实解析器是否还有漏：用独立方法（简单字符串搜索）数 body 规则 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* 独立方法：找所有「body {」或「html {」出现位置，再往前确认它不在注释里、后面紧跟 { */
let bruteBody = 0;
let bruteAll = 0;
const perCase = [];

for (const dir of cases) {
  const css = stripComments(readFileSync(join(P, dir, 'style.css'), 'utf8'));
  bruteAll += (css.match(/\{/g) || []).length;
  /* 逐个找 body/html 后跟 { 或 , 的 token 边界 */
  let c = 0;
  for (const m of css.matchAll(/(?:^|[\s{},])(body|html)\s*(?=[,{])/g)) c++;
  bruteBody += c;
  if (c) perCase.push({ id: dir.slice(0, 3), n: c });
}

console.log('=== 独立方法（正则 token 边界）===');
console.log('  总 { 数:', bruteAll);
console.log('  body/html 选择器出现次数:', bruteBody);
console.log('  有 body/html 规则的案:', perCase.length);
console.log('  每案:', perCase.map((x) => x.id + ':' + x.n).join(' '));

/* 与 check-texture 的 parseRules 对比 */
const src = readFileSync('D:/Web/style/prototypes/_build/check-texture.mjs', 'utf8');
const fnSrc = src.slice(src.indexOf('function parseRules'), src.indexOf('/* 从一个块的选择器串里抽'));
const parseRules = new Function('css', fnSrc.replace('function parseRules(css)', '') + '; return parseRules(css);');

let mineBody = 0, mineAll = 0;
for (const dir of cases) {
  const css = stripComments(readFileSync(join(P, dir, 'style.css'), 'utf8'));
  const rules = parseRules(css);
  mineAll += rules.length;
  for (const r of rules) {
    const tags = String(r.sel).split(/[{},]/).map((s) => s.trim()).filter((t) => t === 'body' || t === 'html');
    if (tags.length && r.decls) mineBody++;
  }
}

console.log('\n=== check-texture 的 parseRules ===');
console.log('  总规则数:', mineAll);
console.log('  body/html 规则:', mineBody);
console.log('\n=== 差异 ===');
console.log('  总 { 数 vs 解析规则数:', bruteAll, 'vs', mineAll, bruteAll === mineAll ? 'OK' : '差 ' + (bruteAll - mineAll));
console.log('  body 出现次数 vs 命中规则:', bruteBody, 'vs', mineBody, bruteBody === mineBody ? 'OK' : '差 ' + (bruteBody - mineBody));
