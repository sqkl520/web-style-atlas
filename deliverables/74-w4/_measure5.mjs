import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9635;
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

// S01: screenshot + pixel probe of the wedge region over column 2/3 body text
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S01-red-wedge-broadsheet/index.html`, { settleMs: 1500 });
  await page.screenshot({ path: 'D:/Web/style/deliverables/74-w4/_s01.png', format: 'png' });
  out.S01pix = await page.eval(async () => {
    // Use html2canvas-free approach: read the wedge polygon geometry and check z-stacking via elementFromPoint at many points
    const wedge = document.querySelector('.wedge');
    const wr = wedge.getBoundingClientRect();
    const blockAt = document.querySelectorAll('.col');
    // Is the wedge ever the topmost paint inside a text column?
    let wedgeTopInsideCol = 0, wedgeTopAnywhere = 0;
    for (let ix = 0; ix <= 40; ix++) for (let iy = 0; iy <= 30; iy++) {
      const x = Math.round(wr.left + wr.width * (ix / 40));
      const y = Math.round(wr.top + wr.height * (iy / 30));
      if (x < 1 || y < 1 || x > innerWidth - 2 || y > innerHeight - 2) continue;
      const el = document.elementFromPoint(x, y);
      if (!el) continue;
      const isWedge = el === wedge || el.classList.contains('wedge') || el.classList.contains('wedge-mis');
      if (isWedge) { wedgeTopAnywhere++; if ([...blockAt].some(c => c.contains(el))) wedgeTopInsideCol++; }
    }
    // geometric: how many body-text line boxes fall inside the wedge polygon?
    const w = wr.width;
    const poly = [[0.42 * w, 0], [0.736 * w, 0], [0.456 * w, 0.893 * wr.height]];
    const inside = (x, y) => {
      const [a, b2, c] = poly;
      const d1 = (x - b2[0]) * (a[1] - b2[1]) - (a[0] - b2[0]) * (y - b2[1]);
      const d2 = (x - c[0]) * (b2[1] - c[1]) - (b2[0] - c[0]) * (y - c[1]);
      const d3 = (x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1]);
      const neg = (d1 < 0) || (d2 < 0) || (d3 < 0), pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      return !(neg && pos);
    };
    const hits = [];
    document.querySelectorAll('.col p, .col h2, .col h3, .col li').forEach(t => {
      if (t.classList.contains('sr-only')) return;
      const r = t.getBoundingClientRect();
      if (!r.height) return;
      // sample the right edge of the first line box
      const cy = r.top + parseFloat(getComputedStyle(t).lineHeight) / 2;
      for (let x = r.left + 2; x <= r.right - 2; x += 8) {
        if (inside(x, cy)) { hits.push({ tag: t.tagName, cls: t.className, x: Math.round(x), y: Math.round(cy) }); break; }
      }
      if (r.top < wr.bottom && r.top > wr.top) { /* note */ }
    });
    return {
      wedgeTopAnywhere, wedgeTopInsideCol,
      textLinesInsideWedgePolygon: hits.length,
      sampleTextInsideWedge: hits.slice(0, 8),
      col1SlugHeight: Math.round(document.querySelector('.slug-slot').getBoundingClientRect().height),
      col1LineHeight: getComputedStyle(document.querySelector('.col-1 p.standfirst')).lineHeight,
    };
  });
  await page.close();
}

// S24: branch column occupancy + vein-to-node gap
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S24-cyanotype-rainforest-path/index.html`, { settleMs: 1000 });
  out.S24b = await page.eval(() => {
    const fork = document.querySelector('.fork__grid');
    const fcs = getComputedStyle(fork);
    const fr = fork.getBoundingClientRect();
    const tracks = fcs.gridTemplateColumns.split(' ').map(parseFloat);
    const gap = parseFloat(fcs.columnGap) || 0;
    // column start x for each of 8 tracks
    const colStarts = []; let x = 0;
    for (let i = 0; i < 8; i++) { colStarts.push(Math.round(x)); x += tracks[i] + gap; }
    const res = [];
    for (const lv of document.querySelectorAll('.lv')) {
      const arts = [...lv.querySelectorAll(':scope > .br')];
      if (!arts.length) continue;
      res.push({
        cls: lv.className, tracks: getComputedStyle(lv).gridTemplateColumns,
        branches: arts.map(a => {
          const r = a.getBoundingClientRect();
          const l = r.left - fr.left, rt = r.right - fr.left;
          // which parent columns does it cover?
          const covering = [];
          for (let i = 0; i < 8; i++) {
            const s = colStarts[i], e = s + tracks[i];
            if (rt > s + 0.5 && l < e - 0.5) covering.push(i + 1);
          }
          return { w: Math.round(r.width), leftInGrid: Math.round(l), rightInGrid: Math.round(rt), coversCols: covering, spanCols: covering.length };
        }),
      });
    }
    // vein end vs node centre distance for first branch
    const firstArt = document.querySelector('.lv > .br');
    const vein = firstArt.querySelector('.vein');
    const node = firstArt.querySelector('.node');
    const vm = firstArt.querySelector('.vein .vm');
    let gapPx = null;
    if (vm && node) {
      const p = vm.getPointAtLength(vm.getTotalLength());
      const pts = vm.getScreenCTM ? vm.getPointAtLength(vm.getTotalLength()) : p;
      const svg = vm.ownerSVGElement.getBoundingClientRect();
      // map path end to screen
      const pt = vm.ownerSVGElement.createSVGPoint(); pt.x = p.x; pt.y = p.y;
      const scr = pt.matrixTransform(vm.getScreenCTM());
      const nr = node.getBoundingClientRect();
      const ncx = nr.left + nr.width / 2, ncy = nr.top + nr.height / 2;
      gapPx = Math.round(Math.hypot(scr.x - ncx, scr.y - ncy) * 10) / 10;
    }
    return { colStarts, tracksPx: tracks.map(t => Math.round(t * 100) / 100), gap, levels: res, veinEndToNodeCentrePx: gapPx };
  });
  await page.close();
}

await b.close(); server.close();
console.log(JSON.stringify(out, null, 1));
