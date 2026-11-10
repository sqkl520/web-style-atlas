// 静态：数 style.css / wizard.css / index.html 内联 / app.js cssText 里 <13px 的 font-size 声明。
// 判据：font-size 的值是裸 px 数字（不是 var()/百分比/em/rem），且 < 13。
import { readFileSync } from 'node:fs';

const files = [
  'prototypes/_selection/style.css',
  'prototypes/_selection/wizard.css',
  'prototypes/_selection/index.html',
  'prototypes/_selection/app.js',
  'prototypes/_selection/wizard.js',
];

let total = 0;
const perFile = {};
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split(/\r?\n/);
  const hits = [];
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/font-size\s*:\s*([^;}"'`]+)/g)) {
      const v = m[1].trim();
      const pm = v.match(/^(-?\d+(?:\.\d+)?)px$/);
      if (pm && parseFloat(pm[1]) < 13) hits.push({ line: i + 1, decl: `font-size: ${v}`, ctx: l.trim().slice(0, 70) });
    }
  });
  perFile[f] = hits;
  total += hits.length;
}
for (const [f, h] of Object.entries(perFile)) {
  console.log(`${f}: ${h.length}`);
  for (const x of h) console.log(`   L${x.line}  ${x.ctx}`);
}
console.log(`\n合计 <13px 裸 px font-size 声明 = ${total}`);
