// 精确统计：30 案里把等宽放进「inCode 语义标签」(pre/code/kbd/samp/textarea) 的分布
import { readFileSync, readdirSync } from 'node:fs';
const ROOT = 'D:/Web/style/prototypes';
const dirs = readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();
const rows = [];
for (const d of dirs) {
  const html = readFileSync(`${ROOT}/${d}/index.html`, 'utf8');
  const count = (re) => (html.match(re) || []).length;
  const j = JSON.parse(readFileSync(`${ROOT}/${d}/.inspect/report.json`, 'utf8'));
  const v = j.viewports.find((x) => x.width === 1440);
  rows.push({
    id: d.slice(0, 3),
    code: count(/<code[\s>]/g), samp: count(/<samp[\s>]/g), kbd: count(/<kbd[\s>]/g), pre: count(/<pre[\s>]/g),
    monoShare: v.metrics.type.monoShare, prose: v.metrics.type.monoProseShare,
  });
}
const withAny = rows.filter((r) => r.code + r.samp + r.kbd + r.pre > 0);
const zero = rows.filter((r) => r.code + r.samp + r.kbd + r.pre === 0);
console.log('把等宽放进 inCode 语义标签的案：', withAny.length);
for (const r of withAny) if (r.prose > 0) console.log('  ⚠️ 有 inCode 标签但 monoProse>0:', JSON.stringify(r));
console.log('\n一个 inCode 语义标签都没有的案：');
for (const r of zero) console.log('  ' + r.id + '  monoShare=' + r.monoShare + ' monoProse=' + r.prose);
const tot = withAny.reduce((a, r) => a + r.code + r.samp + r.kbd + r.pre, 0);
console.log(`\n${withAny.length} 案合计 ${tot} 个 inCode 标签，平均 ${Math.round(tot / withAny.length)} 个/案`);
console.log('其中 <samp> 用量：' + rows.filter((r) => r.samp > 0).map((r) => r.id + '=' + r.samp).join(' '));
