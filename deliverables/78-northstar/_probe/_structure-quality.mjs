/* probe.mjs 的主容器选择在全库的质量审计。
 * 判据：选中的容器是不是页头/页脚/导航这类「非版心」元素。 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const dirs = readdirSync(join(ROOT, 'prototypes')).filter((x) => /^S\d\d-/.test(x)).sort();

const BAD = /^(footer|header|nav|aside)\b|\b(foot|footer|masthead|colophon|nav|topbar|menu|sidebar|breadcrumb)/i;
const rows = [];
for (const d of dirs) {
  let s = null;
  try {
    s = JSON.parse(readFileSync(join(ROOT, 'prototypes', d, '.inspect/report.json'), 'utf8'))
      .viewports[0].metrics.structure;
  } catch { /* 读不到就跳过 */ }
  if (!s) { rows.push({ id: d.slice(0, 3), bad: true, why: '无 structure' }); continue; }
  const sel = s.columnsFrom || '';
  rows.push({
    id: d.slice(0, 3), cols: s.columns, sel,
    bad: BAD.test(sel), why: BAD.test(sel) ? '页头/页脚/导航' : '',
    multi: (s.columnsAll || []).length > 1,
  });
}

const bad = rows.filter((r) => r.bad);
console.log(`全库 ${rows.length} 案，选中非版心元素（页头/页脚/导航）的：${bad.length} 案\n`);
for (const r of bad) console.log(`  ${r.id}  cols=${r.cols}  ${r.sel}  ← ${r.why || ''}`);

console.log(`\n多候选（columnsAll 有多个值）的案：${rows.filter((r) => r.multi).length}`);
for (const r of rows.filter((r) => r.multi)) console.log(`  ${r.id}  选中 ${r.cols}（${r.sel}），另有其他候选`);
