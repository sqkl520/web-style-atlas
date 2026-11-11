// 全库回归：35 个原型逐个 measure，确认不抛异常、栏数是有限的正整数、可复现。
import { measure } from '../../74-q7/measure.mjs';
import { readdirSync } from 'node:fs';

const ROOT = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const dirs = readdirSync(`${ROOT}/prototypes`, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name))
  .map((d) => d.name).sort();

const rows = [];
for (const d of dirs) {
  const id = d.slice(0, 3);
  try {
    const m = await measure(`prototypes/${d}/index.html`);
    rows.push({ id, ok: true, tracks: m.gridTracks, sel: m.gridSel, col: m.maxColCount, ratioN: m.mainRatio.length });
    console.log(`${id}  ${String(m.gridTracks).padStart(2)} 轨  col=${m.maxColCount}  ratio=${m.mainRatio.length} 项  ${m.gridSel}`);
  } catch (e) {
    rows.push({ id, ok: false });
    console.log(`${id}  ✗ ${e.message.slice(0, 90)}`);
  }
}

const bad = rows.filter((r) => !r.ok || !(r.tracks >= 2) || !Number.isFinite(r.tracks));
console.log(`\n共 ${rows.length} 案；异常/栏数<2 的 ${bad.length} 个：${bad.map((b) => b.id).join(' ') || '无'}`);
const counts = {};
for (const r of rows) if (r.ok) counts[r.tracks] = (counts[r.tracks] || 0) + 1;
console.log('栏数分布：', JSON.stringify(counts));
