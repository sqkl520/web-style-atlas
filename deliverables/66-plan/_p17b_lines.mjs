// P17b：为什么 P17 找不到「我实际有」——把 S07 的每行按行号打印（不信任何字符匹配）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1500 });

const r = await p.eval(() => {
  const t = window.buildStylePrompt('S07');
  const c = window.buildStylePrompt('S07', { count: 3 });
  const u = window.buildStylePrompt('S07', { unit: 'XU' });
  const lines = t.split('\n');
  return {
    n: lines.length,
    all: lines.map((l, i) => i + '|' + l),
    cLines: c.split('\n').map((l, i) => i + '|' + l),
    uLines: u.split('\n').map((l, i) => i + '|' + l),
  };
});
writeFileSync(join(HERE, 'p17b-lines.json'), JSON.stringify(r, null, 1), 'utf8');
console.log('S07 行数 = %d', r.n);
r.all.forEach((l) => console.log('  ' + l));
console.log('\n=== count:3 差异行 ===');
const a = r.all, c = r.cLines, u = r.uLines;
for (let i = 0; i < Math.max(a.length, c.length); i++) if (a[i] !== c[i]) console.log(`  [${i}] base=${a[i]}\n       c3  =${c[i]}`);
console.log('\n=== unit:"XU" 差异行 ===');
for (let i = 0; i < Math.max(a.length, u.length); i++) if (a[i] !== u[i]) console.log(`  [${i}] base=${a[i]}\n       unit=${u[i]}`);
await b.close();
