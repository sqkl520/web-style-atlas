import { readFileSync, writeFileSync } from 'node:fs';
const p = 'D:/Web/style/deliverables/70-exec/EXEC-B-linewidth-negative.md';
const FENCE = String.fromCharCode(96).repeat(3);
const lines = readFileSync(p, 'utf8').split('\n');
const out = lines.map((ln) => {
  /* 只修"整行只有 2 个反引号（+可选 text）"的行 —— 那是被压坏的围栏。
   * 正文里的行内反引号不会独占一行，所以这个判据是安全的。 */
  const m = ln.match(/^`{1,2}(text)?\r?$/);
  if (m) return FENCE + (m[1] || '') + '\r';
  return ln;
});
const t = out.join('\n');
writeFileSync(p, t, 'utf8');
const fences = (t.match(new RegExp('^' + FENCE, 'gm')) || []).length;
console.log('fence lines:', fences, fences % 2 === 0 ? 'OK (even)' : 'BAD (odd)');
console.log('total lines:', t.split('\n').length);
