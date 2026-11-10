import { readFileSync, existsSync, readdirSync } from 'node:fs';

const p = 'deliverables/68-plan/_sel-fresh/report.json';
console.log('报告存在:', existsSync(p));
if (existsSync(p)) {
  const j = JSON.parse(readFileSync(p, 'utf8'));
  console.log('\n=== 新鲜报告（本轮实测）===');
  console.log('at:', j.at, ' url:', j.url);
  console.log('allow:', JSON.stringify(j.allow));
  console.log('\n=== findings ===');
  const f = j.findings || [];
  const fails = f.filter(x => x.level === 'FAIL');
  const warns = f.filter(x => x.level === 'WARN');
  console.log(`FAIL ${fails.length} / WARN ${warns.length}`);
  for (const x of f) {
    console.log(`  [${x.level}] ${String(x.id).padEnd(20)} w=${x.width}  ${String(x.message).slice(0, 100)}`);
  }

  // 与 6 天前的旧报告对比
  const old = JSON.parse(readFileSync('prototypes/_selection/.inspect/report.json', 'utf8'));
  console.log('\n=== 6 天前 vs 现在：surfaces 逐项 ===');
  const keys = ['shadowStatic', 'shadowOverlay', 'gradients', 'gradientText', 'hairlines', 'outlinedBoxes', 'dashed', 'blurred', 'textShadow'];
  for (const w of [1440, 768, 390]) {
    const o = (old.viewports || []).find(v => v.width === w);
    const n = (j.viewports || []).find(v => v.width === w);
    if (!o || !n) { console.log(`  ${w}px: 缺一侧`); continue; }
    console.log(`  --- ${w}px ---`);
    for (const k of keys) {
      const ov = o.metrics.surfaces[k], nv = n.metrics.surfaces[k];
      if (ov !== nv) console.log(`    ${k.padEnd(16)} 旧=${ov}  新=${nv}   ← 变了`);
    }
  }

  console.log('\n=== 6 天前 vs 现在：其它关键项 ===');
  for (const w of [1440, 768, 390]) {
    const o = (old.viewports || []).find(v => v.width === w);
    const n = (j.viewports || []).find(v => v.width === w);
    if (!o || !n) continue;
    console.log(`  --- ${w}px ---`);
    console.log(`    hero.size   旧=${o.metrics.hero.size}  新=${n.metrics.hero.size}`);
    console.log(`    page.height 旧=${o.metrics.page.height}  新=${n.metrics.page.height}`);
    console.log(`    page.screens 旧=${o.metrics.page.screens}  新=${n.metrics.page.screens}`);
    console.log(`    type.sizes  旧=${JSON.stringify(o.metrics.type.sizes)}  新=${JSON.stringify(n.metrics.type.sizes)}`);
    console.log(`    body.size   旧=${o.metrics.type.body.size}  新=${n.metrics.type.body.size}`);
    console.log(`    smallText   旧=${o.metrics.type.smallText}  新=${n.metrics.type.smallText}`);
    console.log(`    realPictures 旧=${o.metrics.page.realPictures}  新=${n.metrics.page.realPictures}`);
    console.log(`    overflow    旧=${o.metrics.page.horizontalOverflow}  新=${n.metrics.page.horizontalOverflow}`);
  }
}

console.log('\n=== 输出目录 ===');
if (existsSync('deliverables/68-plan/_sel-fresh')) {
  for (const f of readdirSync('deliverables/68-plan/_sel-fresh')) console.log('  ' + f);
}
