// _r6_bench.mjs — 用仓库自己的尺子量：30 个原型页在 390 档有多深？
// 如果「详情面板 4.2–5.5 屏算深」，那被它描述的 30 个页面本身是多少屏？
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PROTO = join(ROOT, 'prototypes');

const ids = readdirSync(PROTO, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^S\d{2}-/.test(d.name)).map((d) => d.name).sort();

const M = () => ({
  scrollH: document.documentElement.scrollHeight,
  clientH: document.documentElement.clientHeight,
  screens: +(document.documentElement.scrollHeight / document.documentElement.clientHeight).toFixed(2),
  chars: (document.body.innerText || '').replace(/\s+/g, '').length,
  nav: document.querySelectorAll('nav a, header a').length,
  anchors: document.querySelectorAll('a[href^="#"]').length,
});

const br = await Browser.launch({ width: 1440, height: 900 });
const rows = [];
for (const d of ids) {
  const f = join(PROTO, d, 'index.html');
  if (!existsSync(f)) { rows.push({ id: d.slice(0, 3), missing: true }); continue; }
  const p = await br.newPage({ width: 390, height: 844, dsf: 1, mobile: true });
  try {
    await p.goto('file:///' + f.replace(/\\/g, '/'), { settleMs: 1200, timeoutMs: 20000 });
    const m = await p.eval(M);
    rows.push({ id: d.slice(0, 3), ...m });
  } catch (e) {
    rows.push({ id: d.slice(0, 3), err: String(e).slice(0, 80) });
  }
  await p.close();
}
await br.close();
const ok = rows.filter((r) => r.scrollH);
const s = ok.map((r) => r.scrollH).sort((a, b) => a - b);
const med = s[Math.floor(s.length / 2)];
const mean = Math.round(s.reduce((a, b) => a + b, 0) / s.length);
const over3800 = ok.filter((r) => r.scrollH > 3800).length;
const overScreens = ok.filter((r) => r.screens > 5.53).length;
const out = { at: new Date().toISOString(), n: ok.length, min: s[0], median: med, mean, max: s[s.length - 1], over3800, overScreens, rows };
writeFileSync(join(HERE, '_r6_bench.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('n=' + ok.length, 'min=' + s[0], 'median=' + med, 'mean=' + mean, 'max=' + s[s.length - 1]);
console.log('>3800:', over3800 + '/' + ok.length, ' >5.53屏:', overScreens + '/' + ok.length);
console.log('屏数中位 ' + (med / 844).toFixed(2) + ' 屏，最大 ' + (s[s.length - 1] / 844).toFixed(2) + ' 屏');
console.log('逐案：', ok.map((r) => r.id + '=' + r.scrollH).join(' '));
