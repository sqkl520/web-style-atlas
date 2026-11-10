import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9631;
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

async function probe(name, path, fn, viewports = [1440, 1280, 900, 390]) {
  const page = await b.newPage({ width: viewports[0], height: 900 });
  const rows = [];
  for (const w of viewports) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}${path}`, { settleMs: 900 });
    try { rows.push({ w, ...(await page.eval(fn)) }); }
    catch (e) { rows.push({ w, error: String(e).slice(0, 300) }); }
  }
  out[name] = rows;
  await page.close();
}

// ---- S03: actual column track count of .chrono and .plates, cursor behaviour
await probe('S03', '/prototypes/S03-long-exposure-observatory/index.html', () => {
  const g = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { cols: cs.gridTemplateColumns, display: cs.display, w: Math.round(el.getBoundingClientRect().width) };
  };
  // count actual `.band` children in stream, and bands per visual row
  const bands = [...document.querySelectorAll('.stream .band')];
  const tops = [...new Set(bands.map(b => Math.round(b.getBoundingClientRect().top)))];
  const cursor = document.querySelector('.cursor');
  const cs = cursor ? getComputedStyle(cursor) : null;
  return {
    chrono: g('.chrono'), plates: g('.plates'), split: g('.split'),
    bandCount: bands.length,
    distinctBandTops: tops.length,
    bandsPerRow: bands.length / Math.max(1, tops.length),
    axisHeight: document.querySelector('.axis') ? Math.round(document.querySelector('.axis').getBoundingClientRect().height) : null,
    band1Height: bands[0] ? Math.round(bands[0].getBoundingClientRect().height) : null,
    cursorPos: cs ? cs.position : null,
    cursorTransform: cs ? cs.transform : null,
    hasColumnCount: ['.chrono', '.stream', '.plates', '.readouts'].map(s => {
      const e = document.querySelector(s); return e ? getComputedStyle(e).columnCount : 'no-el';
    }),
    bandsStickyAxis: (() => { const a = document.querySelector('.axis'); return a ? getComputedStyle(a).position : null; })(),
    bandHeightsCss: bands.map(b => b.style.getPropertyValue('--h')),
  };
});

// ---- S07: page column counts, plate-grid tracks
await probe('S07', '/prototypes/S07-slate-ink-contents/index.html', () => {
  const recto = document.querySelector('.page-recto .toc');
  const verso = document.querySelector('.page-verso .toc');
  const pg = document.querySelector('.pages');
  const tocCols = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const w = r.width / Math.max(1, parseInt(cs.columnCount, 10) || 1);
    return { columnCount: cs.columnCount, columnWidth: cs.columnWidth, elWidth: Math.round(r.width), derivedColW: Math.round(w), columnRule: cs.columnRuleWidth };
  };
  const ghost = document.querySelector('.ghost');
  const firstText = ghost && ghost.querySelector('text');
  return {
    pagesTracks: pg ? getComputedStyle(pg).gridTemplateColumns : null,
    pagesWidth: pg ? Math.round(pg.getBoundingClientRect().width) : null,
    recto: tocCols(recto), verso: tocCols(verso),
    folioLH: (() => { const f = document.querySelector('.folio'); return f ? getComputedStyle(f).lineHeight : null; })(),
    folioWM: (() => { const f = document.querySelector('.folio'); return f ? getComputedStyle(f).writingMode : null; })(),
    ghostTransform: ghost ? getComputedStyle(ghost.querySelector('g') || ghost).transform : null,
    ghostOpacity: firstText ? getComputedStyle(firstText).opacity : null,
    plateGridTracks: (() => { const p = document.querySelector('.plate-grid'); return p ? getComputedStyle(p).gridTemplateColumns.split(' ').length : null; })(),
  };
});

// ---- S17: amount column widths at desktop and 1024-1439
await probe('S17', '/prototypes/S17-revenue-stamp-stub/index.html', () => {
  const t = document.querySelector('.ledger');
  const num = document.querySelector('.ledger td.num');
  const sheet = document.querySelector('.sheet');
  const perf = document.querySelector('.perf');
  return {
    sheetTracks: sheet ? getComputedStyle(sheet).gridTemplateColumns : null,
    sheetWidth: sheet ? Math.round(sheet.getBoundingClientRect().width) : null,
    tableLayout: t ? getComputedStyle(t).tableLayout : null,
    numWidthComputed: num ? getComputedStyle(num).width : null,
    numWidthRendered: num ? Math.round(num.getBoundingClientRect().width) : null,
    numText: num ? num.textContent.trim() : null,
    perfWidth: perf ? Math.round(perf.getBoundingClientRect().width) : null,
    rowHeight: document.documentElement ? getComputedStyle(document.documentElement).getPropertyValue('--row') : null,
  };
});

await b.close(); server.close();
console.log(JSON.stringify(out, null, 1));
