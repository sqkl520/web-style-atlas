// 查某一颜色是从哪些元素来的。用法: node findcolor.mjs S20 000000
import { readFileSync } from 'node:fs';
const [id, hex] = process.argv.slice(2);
const r = JSON.parse(readFileSync(`D:/Web/style/deliverables/69-test/${id}/raw-measure.json`, 'utf8'));
const v = r.viewports['1440'];
const hits = v.raw.colorSamples.filter((c) => c.hex === '#' + hex.toUpperCase());
console.log('total samples for #' + hex + ':', hits.length);
const byEl = {};
for (const h of hits) { const k = h.el + ' :: ' + h.where; byEl[k] = (byEl[k] || 0) + 1; }
for (const k of Object.keys(byEl)) console.log(' ', byEl[k] + 'x', k);
