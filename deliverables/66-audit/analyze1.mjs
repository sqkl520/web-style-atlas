// analyze1.mjs — 汇总：详情面板 scrollHeight 的三段拆解（390 / 414 / 1440）
import { readFileSync } from 'node:fs';
const m2 = JSON.parse(readFileSync(new URL('./data-m2-detail.json', import.meta.url), 'utf8'));

for (const vp of ['390', '414', '1440']) {
  const v = m2.vps[vp];
  const rows = v.map((c) => {
    const folds = c.folds.reduce((a, b) => a + b.h, 0);
    const cta = c.promptCta.h;
    const proto = c.openProto ? c.openProto.h : 0;
    const head = c.head.h;
    const fields = c.fieldsDl.h;
    const sh = c.detail.scrollHeight;
    return { id: c.id, sh, head, cta, proto, folds: +folds.toFixed(1), fields, other: +(sh - head - cta - proto - folds - fields).toFixed(1) };
  });
  const avg = (k) => +(rows.reduce((a, b) => a + b[k], 0) / rows.length).toFixed(1);
  const pct = (k) => +(rows.reduce((a, b) => a + b[k] / b.sh * 100, 0) / rows.length).toFixed(1);
  console.log(`\n=== ${vp} (n=${rows.length})`);
  console.log(`  scrollHeight  min=${Math.min(...rows.map((r) => r.sh))} max=${Math.max(...rows.map((r) => r.sh))} avg=${avg('sh')}`);
  console.log(`  页头 head      avg=${avg('head')} (${pct('head')}%)`);
  console.log(`  CTA 区         avg=${avg('cta')} (${pct('cta')}%)`);
  console.log(`  打开原型        avg=${avg('proto')} (${pct('proto')}%)`);
  console.log(`  3 折叠块        avg=${avg('folds')} (${pct('folds')}%)`);
  console.log(`  字段区 fields   avg=${avg('fields')} (${pct('fields')}%)`);
  console.log(`  其他(padding)  avg=${avg('other')} (${pct('other')}%)`);
  console.log(`  合计            avg=${(avg('head') + avg('cta') + avg('proto') + avg('folds') + avg('fields') + avg('other')).toFixed(1)}`);
  // 每字段平均高度
  const byLabel = {};
  v.forEach((c) => c.fields.forEach((f) => { (byLabel[f.label] = byLabel[f.label] || []).push(f.h); }));
  console.log('  字段高度（avg/min/max）：');
  Object.entries(byLabel).map(([k, a]) => ({ k, avg: a.reduce((x, y) => x + y, 0) / a.length, min: Math.min(...a), max: Math.max(...a) }))
    .sort((a, b) => b.avg - a.avg)
    .forEach((r) => console.log(`    ${r.k.padEnd(16)} ${String(Math.round(r.avg)).padStart(5)}  ${String(Math.round(r.min)).padStart(5)}–${String(Math.round(r.max)).padStart(5)}`));
}
