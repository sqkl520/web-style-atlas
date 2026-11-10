// 回归核查：新过滤器丢掉的色，是否本就在 style.css / 样式面里存在（= 误杀）
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = 'D:/Web/style';
const PROTO = join(ROOT, 'prototypes');
const load = (p) => { const c = { window: {} }; vm.createContext(c); vm.runInContext(readFileSync(p, 'utf8'), c); return c.window.SCHEMES; };

const HEAD_OLD = load(ROOT + '/deliverables/64-verify/snap/data.js.bak');       // 我进场时的 working tree (= HEAD)
const NOW = load(PROTO + '/_selection/data.js');                                 // 现在的（执行者正在改）

function styleSurface(dir) {
  const parts = [];
  const css = join(PROTO, dir, 'style.css');
  if (existsSync(css)) parts.push(readFileSync(css, 'utf8'));
  const html = join(PROTO, dir, 'index.html');
  if (existsSync(html)) {
    const t = readFileSync(html, 'utf8');
    for (const m of t.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)) parts.push(m[1]);
    for (const m of t.matchAll(/\b(?:fill|stroke|stop-color)\s*=\s*["']([^"']*)["']/gi)) parts.push(m[1]);
  }
  const ad = join(PROTO, dir, 'assets');
  if (existsSync(ad)) for (const f of readdirSync(ad)) if (/\.svg$/i.test(f)) parts.push(readFileSync(join(ad, f), 'utf8'));
  return parts.join('\n');
}
const has = (t, h) => new RegExp(h + '(?![0-9A-Fa-f])', 'i').test(t);

console.log('id  oldPalette -> newPalette   被删掉的色是否在样式面里');
let falseNeg = [], changed = 0;
for (let i = 0; i < HEAD_OLD.length; i++) {
  const o = HEAD_OLD[i], n = NOW[i];
  const oldP = o.palette.map((x) => x.toUpperCase());
  const newP = n.palette.map((x) => x.toUpperCase());
  const dropped = oldP.filter((h) => !newP.includes(h));
  const added = newP.filter((h) => !oldP.includes(h));
  if (!dropped.length && !added.length) continue;
  changed++;
  const surf = styleSurface(n.dir);
  const report = [];
  for (const h of dropped) {
    const inSurf = has(surf, h);
    report.push(`${h}${inSurf ? ' ← 仍在样式面！(误杀)' : '(样式面 0 次，删得对)'}`);
    if (inSurf) falseNeg.push(`${n.id} ${h}`);
  }
  console.log(`${n.id}  [${oldP.join(',')}] -> [${newP.join(',')}]`);
  if (added.length) console.log(`      新增: ${added.join(',')}`);
  if (dropped.length) console.log(`      删除: ${report.join('  ')}`);
}
console.log('\n调色板发生变化的案数:', changed, '/30');
console.log('误杀（删掉的色其实还在样式面）:', falseNeg.length ? falseNeg.join(' ') : '无');
// 长度退化
const short = NOW.filter((s) => s.palette.length < 2).map((s) => s.id);
console.log('palette < 2 的案:', short.length ? short.join(' ') : '无');
const lens = NOW.map((s) => s.palette.length);
console.log('长度分布:', JSON.stringify(lens.reduce((a, n) => (a[n] = (a[n] || 0) + 1, a), {})));
