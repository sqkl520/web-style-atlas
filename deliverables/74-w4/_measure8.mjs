import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9638;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  const f = normalize(join(ROOT, p));
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f)) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const b = await Browser.launch({ width: 1440, height: 900 });
const out = {};

{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S01-red-wedge-broadsheet/index.html`, { settleMs: 1500 });
  out.S01paint = await page.eval(() => {
    const wedge = document.querySelector('.wedge');
    const wr = wedge.getBoundingClientRect();
    const W = wr.width, H = wr.height;
    const poly = [[0.42 * W, 0], [0.736 * W, 0], [0.456 * W, 0.893 * H]];
    const inside = (x, y) => {
      const P = (px, py, ax, ay, bx, by) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
      const d1 = P(x, y, poly[0][0], poly[0][1], poly[1][0], poly[1][1]);
      const d2 = P(x, y, poly[1][0], poly[1][1], poly[2][0], poly[2][1]);
      const d3 = P(x, y, poly[2][0], poly[2][1], poly[0][0], poly[0][1]);
      const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
      return !(neg && pos);
    };
    const probes = [
      { x: 648, y: 194 }, { x: 656, y: 232 }, { x: 748, y: 198 },
    ];
    const results = probes.map(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      const stack = document.elementsFromPoint(x, y).map(e => e.tagName + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''));
      return { x, y, insidePoly: inside(x, y), top: el ? el.tagName + '.' + (el.className || '') : null, stack: stack.slice(0, 6) };
    });
    // Count how many text line-boxes have their centre inside the polygon AND the topmost paint at that x is NOT the wedge
    let coveredByWedge = 0, topmostIsText = 0, polygonHits = 0;
    document.querySelectorAll('.col p, .col h2, .col h3, .col li').forEach(t => {
      if (t.classList.contains('sr-only')) return;
      const cs = getComputedStyle(t), lh = parseFloat(cs.lineHeight) || 20, r = t.getBoundingClientRect();
      if (!r.height) return;
      const n = Math.max(1, Math.round(r.height / lh));
      for (let i = 0; i < n; i++) {
        const y = r.top + i * lh + lh / 2;
        for (let x = r.left + 2; x <= r.right - 2; x += 6) {
          if (!inside(x, y)) continue;
          polygonHits++;
          const el = document.elementFromPoint(x, y);
          if (!el) continue;
          if (el === wedge || el.classList.contains('wedge')) coveredByWedge++;
          else if (el.closest('.col')) topmostIsText++;
          break;
        }
      }
    });
    return { probes: results, polygonHits, coveredByWedge, topmostIsText, wedgeZ: getComputedStyle(wedge).zIndex, colZ: getComputedStyle(document.querySelector('.col')).zIndex };
  });
  await page.close();
}

await b.close(); server.close();
console.log(JSON.stringify(out, null, 1));
