// P17：o.count / o.unit 传值后到底改了什么（关键判据用 \u 转义写，绕开一切编码环节）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join } from 'node:path';
import { ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1500 });

const r = await p.eval(() => {
  const KEY = '\u6211\u5B9E\u9645\u6709';        // 我实际有
  const line = (t) => (t.split('\n').find((l) => l.indexOf(KEY) >= 0) || 'NOT FOUND');
  const base = window.buildStylePrompt('S07');
  const c3 = window.buildStylePrompt('S07', { count: 3 });
  const u = window.buildStylePrompt('S07', { unit: '\u4EA7\u54C1' });   // 产品
  return { lens: [base.length, c3.length, u.length], base: line(base), c3: line(c3), unit: line(u) };
});
console.log('长度 base/count3/unit = ' + JSON.stringify(r.lens));
console.log('base    : ' + r.base);
console.log('count:3 : ' + r.c3);
console.log('unit    : ' + r.unit);
await b.close();
