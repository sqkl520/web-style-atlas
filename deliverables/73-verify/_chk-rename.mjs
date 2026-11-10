import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const now = readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8');
const head = execSync('git show HEAD:prototypes/_selection/data.js', { cwd: 'D:/Web/style', encoding: 'utf8', maxBuffer: 1 << 28 });

const countOf = (s, key) => (s.match(new RegExp('"' + key + '":', 'g')) || []).length;

console.log('HEAD  fonts     :', countOf(head, 'fonts'));
console.log('HEAD  fontsSpec :', countOf(head, 'fontsSpec'));
console.log('NOW   fonts     :', countOf(now, 'fonts'));
console.log('NOW   fontsSpec :', countOf(now, 'fontsSpec'));

/* 逐案内容比对：去键名后应完全一致 */
const parse = (src) => JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
const A = parse(head), B = parse(now);
let same = 0;
const diff = [];
for (const b of B) {
  const a = A.find((x) => x.id === b.id);
  if (!a) { diff.push(b.id + ':HEAD缺失'); continue; }
  if (String(a.fonts || '') === String(b.fontsSpec || '')) same++;
  else diff.push(b.id);
}
console.log('逐案内容一致:', same + '/' + B.length);
if (diff.length) console.log('不一致:', diff.join(', '));

const sum = (arr, k) => arr.reduce((x, r) => x + String(r[k] || '').length, 0);
console.log('HEAD fonts 总字符:', sum(A, 'fonts'));
console.log('NOW  fontsSpec 总字符:', sum(B, 'fontsSpec'));
