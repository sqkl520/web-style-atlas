import { readFileSync } from 'node:fs';
const ROOT = 'D:/Web/style';

const files = { S04: 'S04-mango-collage-wall', S24: 'S24-cyanotype-rainforest-path', S09: 'S09-batik-price-board' };
const targets = { S04: '1.1', S24: '3.2', S09: '3.6' };

console.log('=== EXEC-B 的指控 1：这些可疑值是不是源码手写？===\n');
for (const [id, d] of Object.entries(files)) {
  const v = targets[id];
  const css = readFileSync(`${ROOT}/prototypes/${d}/style.css`, 'utf8');
  const html = readFileSync(`${ROOT}/prototypes/${d}/index.html`, 'utf8');
  console.log(`--- ${id}  找 ${v}px ---`);
  let hit = 0;
  css.split(/\r?\n/).forEach((l, i) => {
    if (new RegExp('\\b' + v.replace('.', '\\.') + 'px\\b').test(l)) { hit++; console.log(`  css:${i + 1}  ${l.trim().slice(0, 130)}`); }
  });
  html.split(/\r?\n/).forEach((l, i) => {
    if (new RegExp('stroke-width\\s*=\\s*["\']?' + v.replace('.', '\\.')).test(l)) { hit++; console.log(`  html:${i + 1}  ${l.trim().slice(0, 130)}`); }
  });
  if (!hit) console.log('  （源码里找不到 —— 可能是计算值）');
  console.log();
}

console.log('=== EXEC-B 的指控 2：Chrome 把 border-width 量化成 max(1,floor(w))？===\n');
console.log('这条要在浏览器里测。先看仓库里 S04 的 1.1px 是怎么写的：');
const css = readFileSync(`${ROOT}/prototypes/S04-mango-collage-wall/style.css`, 'utf8');
const lines = css.split(/\r?\n/);
lines.forEach((l, i) => { if (/1\.1px/.test(l)) console.log(`  L${i + 1}: ${l.trim()}`); });

console.log('\n=== 全库源码字面值 vs 渲染值（验证 EXEC-B 说的 29 > 22）===');
import { readdirSync } from 'node:fs';
const DIRS = readdirSync(`${ROOT}/prototypes`, { withFileTypes: true })
  .filter((x) => x.isDirectory() && /^S\d{2}-/.test(x.name)).map((x) => x.name).sort();

const literal = new Set();
const stripC = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
for (const d of DIRS) {
  const c = stripC(readFileSync(`${ROOT}/prototypes/${d}/style.css`, 'utf8'));
  const h = readFileSync(`${ROOT}/prototypes/${d}/index.html`, 'utf8');
  // border/outline 简写与分离写法
  for (const m of c.matchAll(/(?:border(?:-(?:top|right|bottom|left))?(?:-width)?|outline(?:-width)?|column-rule)\s*:\s*([^;}]+)/g)) {
    const w = m[1].match(/(?:^|\s)(\d*\.?\d+)px/);
    if (w && +w[1] > 0 && +w[1] <= 40) literal.add(+w[1]);
  }
  for (const m of c.matchAll(/stroke-width\s*:\s*([\d.]+)/g)) if (+m[1] > 0) literal.add(+m[1]);
  for (const m of h.matchAll(/stroke-width\s*=\s*["']?([\d.]+)/g)) if (+m[1] > 0) literal.add(+m[1]);
}
console.log('源码字面值: ' + literal.size + ' 种 → ' + [...literal].sort((a, b) => a - b).join(' '));
const rendered = JSON.parse(readFileSync(`${ROOT}/deliverables/70-plan/pixel-ratio-30.json`, 'utf8'));
console.log('（渲染值 22 种是之前 CDP 测的）');
