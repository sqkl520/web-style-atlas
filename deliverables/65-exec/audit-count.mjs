// 统计 audit 里的编号符，决定 summary 的 N 怎么算（本地探针，只读）。
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8').replace(/^[\s\S]*?window\.SCHEMES\s*=\s*/, '').replace(/;\s*$/, ''));
const B = load('prototypes/_selection/data.js');

const marks = {
  circ: /[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]/g,
  di: /第[一二三四五六七八九十]+[，,、]/g,
  full: /（\d+）/g,
  half: /\(\d+\)/g,
};

for (const r of B) {
  const a = r.audit || '';
  const c = {};
  for (const k of Object.keys(marks)) c[k] = (a.match(marks[k]) || []).length;
  console.log(r.id, 'len', a.length, JSON.stringify(c), c.circ || c.di || c.full || c.half);
}
