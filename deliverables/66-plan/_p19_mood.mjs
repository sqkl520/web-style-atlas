// P19：o.mood 到底会不会改变任何输出（判据：传值后全 30 案逐字节比对）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { join } from 'node:path';
import { ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1500 });

const r = await p.eval(() => {
  const out = [];
  for (const s of window.SCHEMES) {
    const a = window.buildStylePrompt(s.id);
    const bb = window.buildStylePrompt(s.id, { mood: 'MOOD_PROBE_XYZ' });
    const cc = window.buildStylePrompt(s.id, { mood: '' });
    out.push({ id: s.id, sameAsBase: a === bb, sameAsEmpty: a === cc, contaminated: bb.includes('MOOD_PROBE_XYZ') });
  }
  return out;
});
console.log('== 传 {mood:"MOOD_PROBE_XYZ"} 与不传，输出是否逐字节相同 ==');
console.log('  相同：%d / 30；不同：%d', r.filter((x) => x.sameAsBase).length, r.filter((x) => !x.sameAsBase).length);
console.log('  输出里出现探针字符串的案数：%d', r.filter((x) => x.contaminated).length);
console.log('  ⇒ o.mood 是静默吞掉的死键，不是"生成假话"的活参数。');
await b.close();
