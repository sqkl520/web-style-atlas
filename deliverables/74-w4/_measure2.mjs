import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9632;
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

async function probe(name, path, fn, viewports = [1440]) {
  const page = await b.newPage({ width: viewports[0], height: 900 });
  const rows = [];
  for (const w of viewports) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}${path}`, { settleMs: 1000 });
    try { rows.push({ w, ...(await page.eval(fn)) }); }
    catch (e) { rows.push({ w, error: String(e).slice(0, 400) }); }
  }
  out[name] = rows;
  await page.close();
}

// S03: vignette PNG actual corner alpha + readouts table column count + cursor 1:1 test
await probe('S03', '/prototypes/S03-long-exposure-observatory/index.html', async () => {
  const rows = document.querySelectorAll('.readouts thead th');
  const c = document.createElement('canvas');
  const img = new Image();
  img.src = 'assets/vignette.png';
  await new Promise(r => { img.onload = r; img.onerror = r; });
  let cornerAlpha = null, centerAlpha = null, size = null;
  if (img.naturalWidth) {
    size = img.naturalWidth + 'x' + img.naturalHeight;
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    cornerAlpha = ctx.getImageData(0, 0, 1, 1).data[3];
    centerAlpha = ctx.getImageData(Math.floor(img.naturalWidth / 2), Math.floor(img.naturalHeight / 2), 1, 1).data[3];
  }
  // cursor 1:1 test: dispatch pointermove at two points, read transform
  const band = document.querySelector('.band');
  const cur = document.querySelector('.cursor');
  function fire(x, y) { band.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true })); return getComputedStyle(cur).transform; }
  const t1 = fire(300, 400);
  const t2 = fire(600, 800);
  return {
    tableCols: rows.length,
    tableColHeaders: [...rows].map(t => t.textContent.trim()),
    vignette: { size, cornerAlpha, centerAlpha, cornerPct: cornerAlpha == null ? null : Math.round(cornerAlpha / 255 * 100) },
    cursorT1: t1, cursorT2: t2,
    cursorSize: getComputedStyle(cur).width + ' x ' + getComputedStyle(cur).height,
    cursorMargin: getComputedStyle(cur).margin,
    cursorFixed: getComputedStyle(cur).position,
  };
});

// S01: wedge angle + does it actually occlude text
await probe('S01', '/prototypes/S01-red-wedge-broadsheet/index.html', () => {
  const front = document.querySelector('.front');
  const wedge = document.querySelector('.wedge');
  const cols = document.querySelector('.columns');
  const col1 = document.querySelector('.col-1');
  const fr = front.getBoundingClientRect(), wr = wedge.getBoundingClientRect();
  // left slope: (42%,0) -> (45.6%, 89.3% of 300px)
  const dx = (0.456 - 0.42) * wr.width;
  const dy = 0.893 * wr.height;
  const angleDeg = Math.atan(dx / dy) * 180 / Math.PI;
  // who paints on top at a point inside the wedge over col-1's blank zone
  const px = wr.left + wr.width * 0.44, py = wr.top + 60;
  const top = document.elementFromPoint(px, py);
  const tracks = getComputedStyle(cols).gridTemplateColumns;
  const bars = [...document.querySelectorAll('.lead-bar')].map(e => Math.round(e.getBoundingClientRect().width));
  const slug = document.querySelector('.slug-dot');
  return {
    frontWidth: Math.round(fr.width), wedgeW: Math.round(wr.width), wedgeH: Math.round(wr.height),
    angleDeg: Math.round(angleDeg * 100) / 100,
    columnsTracks: tracks, trackCount: tracks.split(' ').length,
    leadBarWidths: bars,
    topElementAtPoint: top ? (top.tagName + '.' + (top.className || '')) : null,
    colZ: getComputedStyle(col1).zIndex, wedgeZ: getComputedStyle(wedge).zIndex,
    slugDotSize: slug ? getComputedStyle(slug).width + 'x' + getComputedStyle(slug).height : null,
    col1BlankH: slug ? Math.round(slug.parentElement.getBoundingClientRect().height) : null,
    srLineCount: (document.querySelector('.sr-only') || {}).textContent,
  };
});

// S05: grid tracks + panel spans
await probe('S05', '/prototypes/S05-pixel-cold-storage-console/index.html', () => {
  const g = document.querySelector('.console-grid');
  const panels = [...document.querySelectorAll('.panel')];
  return {
    consoleGridTracks: getComputedStyle(g).gridTemplateColumns,
    trackCount: getComputedStyle(g).gridTemplateColumns.split(' ').length,
    panelCount: panels.length,
    spans: panels.map(p => {
      const cs = getComputedStyle(p);
      return { cls: p.className, col: cs.gridColumn, row: cs.gridRow };
    }),
    groove: getComputedStyle(document.documentElement).getPropertyValue('--groove'),
    unit: getComputedStyle(document.documentElement).getPropertyValue('--unit'),
  };
});

// S24: branches per level, 2px gap implementation
await probe('S24', '/prototypes/S24-cyanotype-rainforest-path/index.html', () => {
  const fork = document.querySelector('.fork__grid');
  const lvs = [...document.querySelectorAll('.lv')];
  return {
    forkTracks: getComputedStyle(fork).gridTemplateColumns,
    forkTrackCount: getComputedStyle(fork).gridTemplateColumns.split(' ').length,
    levelCount: lvs.length,
    levels: lvs.map(l => ({
      cls: l.className,
      gridColumn: getComputedStyle(l).gridColumn,
      childArticles: l.querySelectorAll(':scope > .br').length,
      tracks: getComputedStyle(l).gridTemplateColumns,
    })),
    axisWidth: getComputedStyle(document.querySelector('.fork__axis')).width,
    veinWidths: [...document.querySelectorAll('.vein .vm,.vein .vb,.vein .vc,.vein .vd')].slice(0, 8).map(p => p.getAttribute('class') + '=' + getComputedStyle(p).strokeWidth),
    leafGap: (() => { const g = document.querySelector('.leaf__gap'); return g ? g.getAttribute('d') : null; })(),
  };
});

// S19: stroke widths present in etch defs
await probe('S19', '/prototypes/S19-copperplate-herbarium-cabinet/index.html', () => {
  const e = document.querySelector('#ec');
  const paths = e ? [...e.querySelectorAll('path,line,circle,ellipse,polyline')] : [];
  const widths = {};
  paths.forEach(p => { const w = p.getAttribute('stroke-width') || getComputedStyle(p).strokeWidth; widths[w] = (widths[w] || 0) + 1; });
  return {
    etchStrokeWidthCounts: widths,
    classWidths: {
      e4: (() => { const x = document.querySelector('.e4'); return x ? getComputedStyle(x).strokeWidth : null; })(),
      e8: (() => { const x = document.querySelector('.e8'); return x ? getComputedStyle(x).strokeWidth : null; })(),
    },
    drawerCount: document.querySelectorAll('.dw').length,
    rows: [...new Set([...document.querySelectorAll('.row')].map(r => getComputedStyle(r).gridTemplateColumns))].length,
    bar: getComputedStyle(document.documentElement).getPropertyValue('--bar'),
    win: getComputedStyle(document.documentElement).getPropertyValue('--win'),
    card: getComputedStyle(document.documentElement).getPropertyValue('--card'),
  };
});

// S29: pierce geometry, plumbing of 18px, bleed
await probe('S29', '/prototypes/S29-wire-bound-safety-manual/index.html', () => {
  const wire = document.querySelector('.wire') || document.querySelector('[class*=wire]');
  const num = document.querySelector('.num');
  const cb = document.querySelector('.col-b');
  const spec = document.querySelector('.panel--spec');
  return {
    wireWidth: wire ? getComputedStyle(wire).width : null,
    wireBgSize: wire ? getComputedStyle(wire).backgroundSize : null,
    numLeft: num ? getComputedStyle(num).left : null,
    numWidth: num ? getComputedStyle(num).width : null,
    colBMarginTop: cb ? getComputedStyle(cb).marginTop : null,
    specMarginRight: spec ? getComputedStyle(spec).marginRight : null,
    bl: getComputedStyle(document.documentElement).getPropertyValue('--bl'),
  };
});

// S12: cut overrides, row tiers
await probe('S12', '/prototypes/S12-lime-knockout-wall/index.html', () => {
  const ops = [...document.querySelectorAll('.opening')];
  const byRow = {};
  ops.forEach(o => { const r = getComputedStyle(o).gridRow; byRow[r] = (byRow[r] || 0) + 1; });
  return {
    opCount: ops.length,
    byRow,
    cutPerBlock: ops.map(o => ({ id: o.id, cut: getComputedStyle(o).getPropertyValue('--cut').trim(), height: Math.round(o.getBoundingClientRect().height) })),
    wallTracks: getComputedStyle(document.querySelector('.wall')).gridTemplateColumns.split(' ').length,
  };
});

await b.close(); server.close();
console.log(JSON.stringify(out, null, 1));
