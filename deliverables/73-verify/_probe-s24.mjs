import { readFileSync } from 'node:fs';

const F = 'D:/Web/style/prototypes/S24-cyanotype-rainforest-path/style.css';
const css = readFileSync(F, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const re = /(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g;

let m, n = 0;
const sels = [];
while ((m = re.exec(css))) {
  const parts = m[2].trim().split(',').map((s) => s.trim());
  if (parts.some((s) => s === 'body' || s === 'html')) {
    n++;
    sels.push(m[2].trim());
  }
}
console.log('gate matched body/html rules in S24:', n);
console.log('selectors:', JSON.stringify(sels));

/* 手工枚举：每个 { 前面的选择器（含 @media 内） */
const decls = [];
let cur = '', depth = 0;
for (let i = 0; i < css.length; i++) {
  const c = css[i];
  if (c === '{') {
    const s = cur.trim();
    decls.push({ sel: s, depth });
    depth++;
    cur = '';
  } else if (c === '}') { depth--; cur = ''; } else cur += c;
}
const bodyLike = decls.filter((d) => d.sel.split(',').map((x) => x.trim()).some((p) => p === 'body' || p === 'html'));
console.log('\nselector-ish entries total:', decls.length);
console.log('body/html-ish by full enumeration:', bodyLike.length);
console.log(bodyLike.map((d) => `  depth=${d.depth} sel=${JSON.stringify(d.sel.slice(0, 70))}`).join('\n'));
