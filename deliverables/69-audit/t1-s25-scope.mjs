// S25 取证：@media 作用域 + vector-effect + 装订线（thread）的真实线宽。
import { readFileSync } from 'node:fs';

const F = 'D:/Web/style/prototypes/S25-spotcolor-contents-zine/style.css';
const H = 'D:/Web/style/prototypes/S25-spotcolor-contents-zine/index.html';
const lines = readFileSync(F, 'utf8').split('\n');
const html = readFileSync(H, 'utf8').split('\n');

function mediaOf(targetLine) {
  let depth = 0; const stack = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const o = (ln.match(/\{/g) || []).length, c = (ln.match(/\}/g) || []).length;
    if (/^\s*@media/.test(ln) && i + 1 <= targetLine) stack.push({ line: i + 1, text: ln.trim(), d: depth + o });
    for (let k = 0; k < c; k++) if (stack.length && depth + o - k <= stack[stack.length - 1].d - 1) stack.pop();
    depth += o - c;
    if (i + 1 === targetLine) return stack.length ? stack[stack.length - 1] : null;
  }
  return null;
}

console.log('=== S25 所有 @media 行 ===');
lines.forEach((l, i) => { if (/^\s*@media/.test(l)) console.log('  L' + (i + 1), l.trim()); });

console.log('\n=== S25 所有 stroke-width / outline / border 声明，标注 @media 归属 ===');
lines.forEach((l, i) => {
  if (/stroke-width|outline\s*:|border(-[a-z]+)?\s*:/.test(l) && !/^\s*\/\*/.test(l)) {
    const m = mediaOf(i + 1);
    console.log('  L' + String(i + 1).padEnd(4), (m ? '[媒体 ' + m.text.slice(0, 34) + ']' : '[全站]     ').padEnd(42), l.trim().slice(0, 74));
  }
});

console.log('\n=== S25 vector-effect 出现处 ===');
lines.forEach((l, i) => { if (/vector-effect/.test(l)) console.log('  L' + (i + 1), l.trim().slice(0, 100)); });

console.log('\n=== S25 index.html 里含 stroke-width 的行 ===');
html.forEach((l, i) => { if (/stroke-width/.test(l)) console.log('  L' + String(i + 1).padEnd(4), l.trim().slice(0, 130)); });
