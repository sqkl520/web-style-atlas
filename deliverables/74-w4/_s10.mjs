// 只读诊断：S10 的 1px 判据到底命中了什么。
import { readFileSync } from 'node:fs';
const sb = { window: {} };
new Function('window', readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8'))(sb.window);
const s = sb.window.STYLE_PROMPTS.schemes.find((x) => x.id === 'S10');
let raw = readFileSync('D:/Web/style/prototypes/' + s.dir + '/style.css', 'utf8');
try { raw += readFileSync('D:/Web/style/prototypes/' + s.dir + '/index.html', 'utf8'); } catch {}
const blob = raw.replace(/\/\*[\s\S]*?\*\//g, '');

console.log('dir:', s.dir);
console.log('mechanism:', s.dna.mechanism);
console.log('literal standalone /(?<![\\d.])1px/ in stripped source:', [...blob.matchAll(/(?<![\d.])1px/g)].length);

const re = /1\s*px/g;
const all = [...blob.matchAll(re)];
console.log('/1\\s*px/ matches:', all.length);
const seen = new Set();
for (const m of all) {
  const lead = blob.slice(Math.max(0, m.index - 4), m.index + 5);
  if (seen.has(lead)) continue;
  seen.add(lead);
  console.log('   hit', JSON.stringify(m[0]), 'context', JSON.stringify(lead));
}
const pxVals = [...new Set([...blob.matchAll(/[\d.]+px/g)].map((x) => x[0]))];
console.log('px values whose text contains "1px":', pxVals.filter((x) => x.includes('1px')).join(' ') || '(none)');
