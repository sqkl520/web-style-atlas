import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join } from 'node:path';
import { ROOT } from './_lib.mjs';
const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1500 });
const r = await p.eval(() => {
  const base = window.buildStylePrompt('S07');
  const c3 = window.buildStylePrompt('S07', { count: 3 });
  const u = window.buildStylePrompt('S07', { unit: '产品' });
  const line = (t) => (t.split('\n').find((l) => /我实际有/.test(l)) || 'NOT FOUND');
  return { baseLen: base.length, lens: [base.length, c3.length, u.length], a: line(base), bb: line(c3), c: line(u), head: base.slice(0, 80) };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
