/* 为什么 parseRules 少了 1878 个块、22 个 body？
 * 逐个候选分析：是真实规则、还是 @media 嵌套/字符串里的 { }、还是我的独立方法多算？
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const P = 'D:/Web/style/prototypes';
const cases = readdirSync(P, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* 看一个具体案：S16 有 5 个 body 出现，我的解析器命中几个 */
for (const id of ['S16', 'S24', 'S02']) {
  const dir = cases.find((d) => d.startsWith(id + '-'));
  const css = stripComments(readFileSync(join(P, dir, 'style.css'), 'utf8'));
  console.log(`\n=== ${id} ===`);
  console.log('总 { :', (css.match(/\{/g) || []).length);
  /* 列出所有 body/html token 的上下文 */
  const hits = [...css.matchAll(/(?:^|[\s{},])(body|html)\s*(?=[,{])/g)];
  console.log('body/html token 数:', hits.length);
  for (const m of hits) {
    const before = css.slice(Math.max(0, m.index - 60), m.index).replace(/\n/g, ' ');
    const after = css.slice(m.index, m.index + 90).replace(/\n/g, ' ');
    console.log(`  …${before}【${m[1]}】${after}…`);
  }
}

/* 全局：{ 与 } 数量是否平衡（不平衡说明字符串里有花括号，破坏深度计数） */
console.log('\n=== 全局花括号平衡 ===');
let openTot = 0, closeTot = 0;
const unbalanced = [];
for (const dir of cases) {
  const css = stripComments(readFileSync(join(P, dir, 'style.css'), 'utf8'));
  const o = (css.match(/\{/g) || []).length;
  const c = (css.match(/\}/g) || []).length;
  openTot += o; closeTot += c;
  if (o !== c) unbalanced.push({ id: dir.slice(0, 3), o, c });
}
console.log(`  所有案合计 { = ${openTot}, } = ${closeTot}  ${openTot === closeTot ? '平衡' : '不平衡！'}`);
if (unbalanced.length) console.log('  不平衡的案:', unbalanced.map((x) => `${x.id}(${x.o}/${x.c})`).join(' '));

/* 检查 CSS 里有没有字符串含花括号（如 content: "{"） */
console.log('\n=== 含花括号的字符串字面量 ===');
let strHits = 0;
for (const dir of cases) {
  const css = stripComments(readFileSync(join(P, dir, 'style.css'), 'utf8'));
  for (const m of css.matchAll(/"[^"\n]*[{}][^"\n]*"|'[^'\n]*[{}][^'\n]*'/g)) {
    if (strHits < 6) console.log(`  ${dir.slice(0, 3)}: ${m[0].slice(0, 70)}`);
    strHits++;
  }
}
console.log('  合计:', strHits);
