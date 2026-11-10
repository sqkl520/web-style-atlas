import { readFileSync, writeFileSync } from 'node:fs';

const CON = 'D:/Web/style/prototypes/_CONTRACT.md';
const con = readFileSync(CON, 'utf8');

const S = '`S13` 的 17 处 `shadow` 属真未修——该规则从未被任何断言检测到已清。';
const test = con.replace('## 10 ', S + '\n\n## 10 ');

/* 从源文件里取出正则字面量并求值 */
const src = readFileSync('D:/Web/style/prototypes/_build/check-contract.mjs', 'utf8');
const i = src.indexOf('const CLAIM_RE = ');
const j = src.indexOf('/g;', i);
const lit = src.slice(i + 'const CLAIM_RE = '.length, j + 2);
console.log('取出字面量:', lit.slice(0, 60) + '…');

const RE = eval(lit);
const m = [...test.matchAll(RE)];
console.log('\n注入后的匹配数:', m.length);
m.forEach((x) => console.log('  id=' + x[1] + '  n=' + (x[2] ?? x[5]) + '  rule=' + (x[3] ?? x[4])));

/* 预期：至少应有 S13 / 17 / shadow 这一条（来自注入的句子）。
 * 若 0 条，说明正则在完整文档上下文里失败了。 */
console.log('\n=== 若 0 条，试在纯文本上跑 ===');
const m2 = [...S.matchAll(RE)];
console.log('纯句子匹配数:', m2.length);
m2.forEach((x) => console.log('  id=' + x[1] + '  n=' + (x[2] ?? x[5]) + '  rule=' + (x[3] ?? x[4])));

/* 找注入点在文档中的上下文 */
const idx = test.indexOf(S);
console.log('\n=== 注入点上下文（前 120 / 后 120）===');
console.log('前:', JSON.stringify(test.slice(Math.max(0, idx - 120), idx)));
console.log('后:', JSON.stringify(test.slice(idx + S.length, idx + S.length + 120)));
