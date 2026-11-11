// 探针 02：prompts.schemes 与 hardIds 形状
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/data.js', 'utf8'), ctx);
vm.runInContext(readFileSync('D:/Web/style/prototypes/_selection/prompts.js', 'utf8'), ctx);

const S = ctx.window.SCHEMES;
const P = ctx.window.STYLE_PROMPTS;

console.log('hardIds =', JSON.stringify(P.hardIds));
console.log('schemes type =', Array.isArray(P.schemes) ? 'array' : typeof P.schemes);
const keys = Object.keys(P.schemes);
console.log('schemes keys count =', keys.length, '=>', keys.join(' '));

const one = P.schemes[keys[0]];
console.log('\n--- one prompt entry ---');
console.log(JSON.stringify(one, null, 1).slice(0, 3500));

// check capacity
console.log('\n--- capacity across all ---');
for (const k of keys) {
  const e = P.schemes[k];
  const cap = e.capacity || {};
  console.log(k, 'minPics=' + JSON.stringify(cap.minPics), 'minItems=' + JSON.stringify(cap.minItems),
    'degrades=' + JSON.stringify(cap.degrades), 'dnaKeys=' + (e.dna ? Object.keys(e.dna).join('|') : 'none'));
}
