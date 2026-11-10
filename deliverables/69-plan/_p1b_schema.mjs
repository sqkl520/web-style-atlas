// 探针 1b：P.schemes 的 capacity / hard / minItems / minPics / scenes 实际形状
import { loadCtx, out } from './_lib.mjs';

const w = loadCtx();
const P = w.STYLE_PROMPTS;
out('P.schemes[0] =', JSON.stringify({ ...P.schemes[0], dna: undefined }, null, 1).slice(0, 1200));
out('\ncapacity 有值案数 =', P.schemes.filter((s) => s.capacity).length);
out('capacity 键 =', [...new Set(P.schemes.flatMap((s) => Object.keys(s.capacity || {})))].join(' '));
out('capacity.degrades 取值 =', [...new Set(P.schemes.map((s) => s.capacity && s.capacity.degrades))].join(' '));
const dy = P.schemes.filter((s) => s.capacity && s.capacity.degrades === 'yes').map((s) => s.id);
out('degrades=yes (P.capacity) =', dy.join(' '), '  共', dy.length);
out('dna.degrades=true =', P.schemes.filter((s) => s.dna.degrades === true || s.dna.degrades === 'yes').map((s) => s.id).join(' '),
  ' 取值 =', [...new Set(P.schemes.map((s) => JSON.stringify(s.dna.degrades)))].join(' '));

out('\nhard 有值案数 =', P.schemes.filter((s) => s.hard).length);
out('hard 取值分布 =', JSON.stringify(P.schemes.reduce((a, s) => { const k = JSON.stringify(s.hard); a[k] = (a[k] || 0) + 1; return a; }, {})));
out('hard=true 的案 =', P.schemes.filter((s) => s.hard === true || s.hard === 'yes').map((s) => s.id).join(' '));

out('\nscenes 形状 S01 =', JSON.stringify(P.schemes[0].scenes));
out('minItems 范围 =', Math.min(...P.schemes.map((s) => s.minItems)), '-', Math.max(...P.schemes.map((s) => s.minItems)));
out('minPics 有值 =', P.schemes.filter((s) => s.minPics).length, '/30  范围',
  Math.min(...P.schemes.filter((s) => s.minPics).map((s) => s.minPics)), '-', Math.max(...P.schemes.filter((s) => s.minPics).map((s) => s.minPics)));
