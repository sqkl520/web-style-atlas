// debug: why are data-flip / data-lever classified as logic keys?
import { readFileSync } from 'node:fs';
const h = readFileSync('D:/Web/style/prototypes/S21-interlocking-release-book/index.html', 'utf8');
const c = readFileSync('D:/Web/style/prototypes/S21-interlocking-release-book/style.css', 'utf8');
const reads = [];
for (const m of h.matchAll(/(?:getAttribute\(\s*['"]([\w-]+)['"]\)|dataset\.([A-Za-z0-9_]+))/g)) reads.push({ name: (m[1] || ('data-' + m[2])).toLowerCase(), at: m.index });
for (const r of reads) {
  if (!/flip|lever|lock/.test(r.name)) continue;
  const tail = h.slice(r.at, r.at + 120);
  const head = h.slice(Math.max(0, r.at - 40), r.at);
  const isCompare = /^\s*\)?\s*(===|!==|==|!=|>|<|\.includes|\.indexOf|\.match)/.test(tail) || /(===|!==|==|!=)\s*$/.test(head.trim());
  const isKey = /^\s*\)?\s*\]/.test(tail);
  const isBranch = /(if|while|switch|filter|some|every|find|toggle)\s*\(/.test(head.slice(-60));
  console.log(`=== ${r.name}  compare=${isCompare} key=${isKey} branch=${isBranch}`);
  console.log('   TAIL ' + JSON.stringify(tail.slice(0, 70)));
  console.log('   HEAD ' + JSON.stringify(head));
}
console.log('--- CSS attr selectors:');
for (const m of c.matchAll(/\[\s*([\w-]+)\s*[=~|^$*]?=/g)) console.log('   ' + m[1] + '   <<' + m[0] + '>>');
console.log('--- querySelector attr refs:');
for (const m of h.matchAll(/querySelector(?:All)?\(\s*['"][^'"]*\[\s*([\w-]+)/g)) console.log('   ' + m[1]);
