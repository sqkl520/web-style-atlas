import { readFileSync } from 'node:fs';

const F = 'D:/Web/style/prototypes/S02-gilded-symmetry-salon/style.css';
const raw = readFileSync(F, 'utf8');
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

console.log('去注释后长度: ' + css.length);
console.log('body 是否还在: ' + /body\s*\{/.test(css));
const bi = css.indexOf('body {');
console.log('去注释后 `body {` 位置: ' + bi);
console.log('该处前后: ' + JSON.stringify(css.slice(Math.max(0, bi - 120), bi + 60)));

console.log('\n=== 正则逐个匹配（前 12 个） ===');
const re = /(^|\})\s*([^{}]+?)\s*\{([^{}]*)\}/g;
let m, k = 0;
while ((m = re.exec(css)) && k < 12) {
  k++;
  console.log(`${k}. start=${m.index} lead=${JSON.stringify(m[1])} sel=${JSON.stringify(m[2].trim().slice(0, 50))} declsLen=${m[3].length}`);
  if (k >= 12) break;
}

/* 关键：从 html 规则结束的位置继续，手动看能否匹配到 body */
const htmlIdx = css.indexOf('html {');
const htmlEnd = css.indexOf('}', htmlIdx);
console.log('\nhtml 块结束于: ' + htmlEnd);
console.log('其后 80 字符: ' + JSON.stringify(css.slice(htmlEnd, htmlEnd + 80)));
re.lastIndex = 0;
let found = null;
while ((m = re.exec(css))) {
  if (m.index >= htmlEnd) { found = m; break; }
}
console.log('html 之后第一个正则匹配: ' + (found ? JSON.stringify({ sel: found[2].trim(), idx: found.index }) : '无'));
