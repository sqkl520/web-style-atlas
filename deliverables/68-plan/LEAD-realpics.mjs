import { readFileSync } from 'node:fs';

const old = JSON.parse(readFileSync('prototypes/_selection/.inspect/report.json', 'utf8'));
const now = JSON.parse(readFileSync('deliverables/68-plan/_sel-fresh/report.json', 'utf8'));

console.log('=== realPictures / pictureSamples 逐档 ===');
for (const w of [1440, 768, 390]) {
  for (const [tag, rep] of [['旧(6天前)', old], ['新(今天)', now]]) {
    const v = (rep.viewports || []).find(x => x.width === w);
    if (!v) { console.log(`  ${w} ${tag}: 缺`); continue; }
    const p = v.metrics.page;
    console.log(`  ${w}px ${tag}: realPictures=${p.realPictures}  img=${p.img}  uiPictures=${p.uiPictures}  uiFragments=${p.uiFragments}`);
    console.log(`           samples=${JSON.stringify((p.pictureSamples || []).slice(0, 3))}`);
  }
}

console.log('\n=== few-pictures / no-real-pictures 规则定义 ===');
const rules = readFileSync('tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs', 'utf8');
for (const id of ['few-pictures', 'no-real-pictures', 'ui-wrapper']) {
  const i = rules.indexOf(`'${id}'`);
  if (i >= 0) console.log(`\n  [${id}]\n    ` + JSON.stringify(rules.slice(i - 260, i + 180)));
}

console.log('\n=== 新报告的 WARN/FAIL 全量（确认 few-pictures 是否被触发）===');
for (const f of now.findings || []) console.log(`  [${f.level}] ${f.id} w=${f.width}`);

console.log('\n=== probe.mjs 里 realPictures 的计算 ===');
const probe = readFileSync('tools/taste-skill/skills/taste-skill/scripts/lib/probe.mjs', 'utf8');
const j = probe.indexOf('realPictures');
console.log(JSON.stringify(probe.slice(Math.max(0, j - 900), j + 400)));
