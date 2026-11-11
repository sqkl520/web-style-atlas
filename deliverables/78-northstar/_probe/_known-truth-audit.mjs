// 独立复算：35 案里有多少份 report.json 含 structure、这些案是不是验货样本。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const dirs = readdirSync(join(ROOT, 'prototypes')).filter((d) => /^S\d{2}-/.test(d)).sort();

const rows = dirs.map((d) => {
  const p = join(ROOT, 'prototypes', d, '.inspect', 'report.json');
  if (!existsSync(p)) return { id: d.slice(0, 3), has: false, at: null };
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const v = (j.viewports || [])[0] || {};
  return {
    id: d.slice(0, 3),
    has: !!(v.metrics && v.metrics.structure),
    at: (j.at || '').slice(0, 10),
    cols: v.metrics && v.metrics.structure ? v.metrics.structure.columns : null,
  };
});

const withS = rows.filter((r) => r.has);
const without = rows.filter((r) => !r.has);
console.log(`含 metrics.structure：${withS.length}/${rows.length}`);
console.log('  有：' + withS.map((r) => `${r.id}(cols=${r.cols})`).join(' '));
console.log('  无：' + without.map((r) => r.id).join(' '));

// 验货样本（Q7 做过 / 规划提议的）里有多少有 structure
const SAMPLES = ['S03', 'S07', 'S17', 'S01', 'S09', 'S14', 'S19', 'S24', 'S26', 'S28'];
console.log('\n验货候选案里，有 structure 的：');
const hit = SAMPLES.filter((id) => (rows.find((r) => r.id === id) || {}).has);
console.log('  ' + (hit.length ? hit.join(' ') : '★ 一个都没有'));
console.log(`  （${SAMPLES.length} 个候选里 ${hit.length} 个有）`);

// 含 infinite 动画的案（截图会抖）
const anim = dirs.filter((d) => /infinite/.test(readFileSync(join(ROOT, 'prototypes', d, 'style.css'), 'utf8')));
console.log('\n含 infinite 动画（截图会抖，不能作对账基准）：' + anim.length + ' 案');
console.log('  ' + anim.map((d) => d.slice(0, 3)).join(' '));
const animInSamples = SAMPLES.filter((id) => anim.some((d) => d.startsWith(id)));
console.log('  其中落在验货候选里：' + (animInSamples.join(' ') || '无'));
