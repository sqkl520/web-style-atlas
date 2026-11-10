// 探针 22：单案量测的**真实成本**是多少？（任务 4 的数字必须自己跑出来）
// 拆成 4 段计时：起浏览器 / 载入+字体就绪 / DOM 量测 / 截图+像素直方图
// 跑 3 轮取中位数，避免冷启动偏差。
import http from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { Browser, sleep } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style/prototypes';
const OUT = 'D:/Web/style/deliverables/69-audit';
const PORT = 8526;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f).toLowerCase()] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));

const HTML = '/S19-copperplate-herbarium-cabinet/index.html';
const runs = [];
for (let i = 0; i < 3; i++) {
  const t = {};
  let sw = Date.now();
  const b = await Browser.launch({ width: 1440, height: 900 });
  t.launch = Date.now() - sw;

  sw = Date.now();
  const p = await b.newPage({ width: 1440, height: 900 });
  t.newPage = Date.now() - sw;

  sw = Date.now();
  await p.goto(`http://127.0.0.1:${PORT}${HTML}`, { settleMs: 1200 });
  await p.eval(() => (document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true));
  t.goto = Date.now() - sw;

  sw = Date.now();
  const dom = await p.eval(() => {
    const hexOf = (v) => { const m = String(v).match(/rgba?\(([^)]+)\)/); if (!m) return null; const q = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return '#' + q.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase(); };
    const all = Array.from(document.querySelectorAll('*'));
    const o = { els: all.length, colors: new Set(), radii: 0, shadows: { inset: 0, outset: 0 }, families: new Set() };
    for (const el of all) {
      const cs = getComputedStyle(el);
      const a = hexOf(cs.color); if (a) o.colors.add(a);
      const c = hexOf(cs.backgroundColor); if (c) o.colors.add(c);
      for (const s of ['TopLeft', 'TopRight']) if (parseFloat(cs['border' + s + 'Radius']) > 0) { o.radii++; break; }
      if (cs.boxShadow && cs.boxShadow !== 'none') (/inset/.test(cs.boxShadow) ? o.shadows.inset++ : o.shadows.outset++);
      for (const f of (cs.fontFamily || '').split(',')) o.families.add(f.trim());
    }
    return { els: o.els, colors: [...o.colors], radii: o.radii, shadows: o.shadows, fams: [...o.families] };
  });
  t.domProbe = Date.now() - sw;

  sw = Date.now();
  const b64 = await p.screenshot({ format: 'png', fullPage: true });
  t.screenshot = Date.now() - sw;

  sw = Date.now();
  const px = await p.eval(async (dataUrl) => {
    const img = new Image(); img.src = dataUrl; await img.decode();
    const cv = document.createElement('canvas'); cv.width = Math.min(img.width, 1440); cv.height = Math.min(img.height, 20000);
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const m = new Map();
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; m.set(k, (m.get(k) || 0) + 1); }
    return { n: m.size, top: [...m.entries()].sort((a, c) => c[1] - a[1]).slice(0, 5).map(([k, v]) => ['#' + k.toString(16).padStart(6, '0'), v]) };
  }, 'data:image/png;base64,' + b64);
  t.histogram = Date.now() - sw;

  sw = Date.now();
  await p.close(); await b.close();
  t.teardown = Date.now() - sw;

  t.total = Object.values(t).reduce((a, c) => a + c, 0);
  t.els = dom.els; t.pngBytes = Math.round(b64.length * 0.75);
  runs.push(t);
  console.log('run' + i, JSON.stringify(t));
}
const med = {};
for (const k of Object.keys(runs[0])) if (typeof runs[0][k] === 'number') {
  const v = runs.map((r) => r[k]).sort((a, b) => a - b);
  med[k] = v[1];
}
console.log('\n中位数:', JSON.stringify(med));
writeFileSync(join(OUT, 'perf.json'), JSON.stringify({ runs, med }, null, 1), 'utf8');
server.close();
