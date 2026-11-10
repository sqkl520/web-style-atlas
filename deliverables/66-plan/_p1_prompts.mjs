// P1：把 30 份提示词从真实页面里取出来（走 window.buildStylePrompt，与用户点复制同一条路径）
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HERE, ROOT } from './_lib.mjs';

const PAGE = 'file:///' + join(ROOT, 'prototypes', '_selection', 'index.html').replace(/\\/g, '/');
const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900, dsf: 1 });
await p.goto(PAGE, { settleMs: 1500 });

const info = await p.eval(() => ({
  build: typeof window.buildStylePrompt,
  n: window.SCHEMES ? window.SCHEMES.length : -1,
  hasPrompts: !!window.STYLE_PROMPTS,
  tplHits: typeof window.benchTemplateHits,
}));
console.log('buildStylePrompt=%s schemes=%d prompts=%s benchTemplateHits=%s', info.build, info.n, info.hasPrompts, info.tplHits);

const out = await p.eval(() => window.SCHEMES.map((s) => {
  const t = window.buildStylePrompt(s.id);
  const lines = t.split('\n');
  const i1 = lines.findIndex((l) => /我实际有/.test(l));
  return {
    id: s.id,
    len: t.length,
    minItems: s.minItems,
    degrades: s.capacity && s.capacity.degrades,
    line1: i1 >= 0 ? lines[i1] : null,
    line2: i1 >= 0 ? lines[i1 + 1] : null,
    // 结构约束段整段（从「结构约束」到「防退化」）
    structBlock: (() => {
      const a = lines.findIndex((l) => l.trim() === '结构约束：');
      const z = lines.findIndex((l) => /^防退化/.test(l.trim()));
      return a >= 0 && z > a ? lines.slice(a, z).join('\n') : null;
    })(),
    hasRealCount: /按你真实的数量排即可/.test(t),
    hasRealCount2: /请先用你真实的/.test(t),
    has不成: /不足 \d+ 个/.test(t),
    full: t,
  };
}));

writeFileSync(join(HERE, 'p1-prompts.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('wrote p1-prompts.json  n=%d', out.length);
console.log('len min/med/max: %d / %d / %d', Math.min(...out.map((o) => o.len)),
  [...out.map((o) => o.len)].sort((a, b) => a - b)[15], Math.max(...out.map((o) => o.len)));
for (const o of out) {
  console.log(`${o.id} minItems=${String(o.minItems).padStart(2)} degrades=${o.degrades} len=${o.len} | ${o.line1}`);
}
await b.close();
