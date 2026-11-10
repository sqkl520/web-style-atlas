import { readFileSync } from 'node:fs';

const rules = readFileSync('tools/taste-skill/skills/taste-skill/scripts/lib/rules.mjs', 'utf8');

const show = (id) => {
  const re = new RegExp(`add\\([^;]*'${id}'[^;]*;`, 's');
  const m = re.exec(rules);
  console.log(`\n=== ${id} ===`);
  if (m) console.log(m[0].replace(/\s+/g, ' ').slice(0, 700));
  else {
    // 可能是三元或跨行
    const i = rules.indexOf(`'${id}'`);
    if (i >= 0) console.log(rules.slice(Math.max(0, i - 700), i + 260).replace(/\s+/g, ' '));
    else console.log('未找到');
  }
};

for (const id of ['eyebrow', 'few-pictures', 'still-page', 'focal-point', 'no-footage', 'hairline']) show(id);

// 30 案语料上这些规则触发几次
console.log('\n\n=== 30 案语料上这些规则的触发情况 ===');
const { readdirSync, existsSync } = await import('node:fs');
const agg = {};
for (const d of readdirSync('prototypes', { withFileTypes: true })) {
  if (!d.isDirectory() || !/^S\d{2}-/.test(d.name)) continue;
  const p = `prototypes/${d.name}/.inspect/report.json`;
  if (!existsSync(p)) continue;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  for (const f of j.findings || []) {
    const k = f.level + ':' + f.id;
    agg[k] = (agg[k] || 0) + 1;
  }
}
for (const id of ['eyebrow', 'few-pictures', 'still-page', 'focal-point', 'no-footage', 'hairline', 'headline-lines', 'icon-cards', 'outlined-box', 'numbering']) {
  const f = agg['FAIL:' + id] || 0, w = agg['WARN:' + id] || 0;
  console.log(`  ${id.padEnd(18)} 30案中 FAIL=${f}  WARN=${w}`);
}
