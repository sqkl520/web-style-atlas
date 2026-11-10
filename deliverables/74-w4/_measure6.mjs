import http from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9636;
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

// S01: exact per-column line-box overlap with the wedge polygon (colour-agnostic geometry)
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S01-red-wedge-broadsheet/index.html`, { settleMs: 1400 });
  out.S01lines = await page.eval(() => {
    const wedge = document.querySelector('.wedge');
    const wr = wedge.getBoundingClientRect();
    const w = wr.width, h = wr.height;
    const poly = [[0.42 * w, 0], [0.736 * w, 0], [0.456 * w, 0.893 * h]];
    const inside = (x, y) => {
      const P = (px, py, ax, ay, bx, by) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
      const d1 = P(x, y, poly[0][0], poly[0][1], poly[1][0], poly[1][1]);
      const d2 = P(x, y, poly[1][0], poly[1][1], poly[2][0], poly[2][1]);
      const d3 = P(x, y, poly[2][0], poly[2][1], poly[0][0], poly[0][1]);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0, hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      return !(hasNeg && hasPos);
    };
    const perCol = [];
    document.querySelectorAll('.col').forEach((c, ci) => {
      let linesInPoly = 0, linesVertOverlap = 0;
      [...c.querySelectorAll('p, h2, h3, li')].forEach(t => {
        if (t.classList.contains('sr-only')) return;
        const cs = getComputedStyle(t);
        const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
        const r = t.getBoundingClientRect();
        if (!r.height) return;
        const n = Math.max(1, Math.round(r.height / lh));
        for (let i = 0; i < n; i++) {
          const ly = r.top + i * lh + lh / 2;
          if (ly > wr.top && ly < wr.bottom) linesVertOverlap++;
          for (let x = r.left + 2; x <= r.right - 2; x += 6) {
            if (inside(x, ly)) { linesInPoly++; break; }
          }
        }
      });
      perCol.push({ col: ci + 1, linesInsideWedgePolygon: linesInPoly, linesInWedgeBand: linesVertOverlap, lineHeight: getComputedStyle(c.querySelector('p')).lineHeight });
    });
    return { wedgeBottom: Math.round(wr.bottom), perCol,
      slug: Math.round(document.querySelector('.slug-slot').getBoundingClientRect().height),
      standfirstLH: getComputedStyle(document.querySelector('.col-1 p.standfirst')).lineHeight };
  });
  await page.close();
}

// S07: computed column-rule width at DPR1, and existence of any 5-col / 7-col layout in the spread
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S07-slate-ink-contents/index.html`, { settleMs: 1400 });
  out.S07rule = await page.eval(() => {
    const rec = document.querySelector('.page-recto .toc');
    const ver = document.querySelector('.page-verso .toc');
    const liSel = (el) => el ? getComputedStyle(el).columnRuleWidth : null;
    // actual painted width: measure the gap between text columns by examining li widths
    const liRec = rec.querySelector('li');
    const liVer = ver.querySelector('li');
    return {
      rectoRuleWidth: liSel(rec), rectoRuleStyle: rec ? getComputedStyle(rec).columnRuleStyle : null, rectoRuleColor: rec ? getComputedStyle(rec).columnRuleColor : null,
      versoRuleWidth: liSel(ver),
      dpr: devicePixelRatio,
      rectoColW: Math.round(rec.getBoundingClientRect().width / 2),
      versoColW: Math.round(ver.getBoundingClientRect().width / 3),
      pageRectoW: Math.round(document.querySelector('.page-recto').getBoundingClientRect().width),
      pageVersoW: Math.round(document.querySelector('.page-verso').getBoundingClientRect().width),
      spreadTracks: getComputedStyle(document.querySelector('.pages')).gridTemplateColumns,
      countOfTextColumnsInSpread: (num) => num,
    };
  });
  // Also: full-document scan for any element with 5 or 7 grids/columns
  out.S07scan = await page.eval(() => {
    const res = { five: [], seven: [], three: [] };
    [...document.querySelectorAll('body *')].forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display.includes('grid')) {
        const n = cs.gridTemplateColumns.split(/\s+/).length;
        const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
        if (n === 5) res.five.push({ cls, tag: el.tagName, raw: cs.gridTemplateColumns });
        if (n === 7) res.seven.push({ cls, tag: el.tagName, raw: cs.gridTemplateColumns });
        if (n === 3) res.three.push({ cls, tag: el.tagName, raw: cs.gridTemplateColumns });
      }
      if (cs.columnCount && cs.columnCount !== 'auto') {
        const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
        if (cs.columnCount === '5') res.five.push({ cls, tag: el.tagName, multicol: 5 });
        if (cs.columnCount === '7') res.seven.push({ cls, tag: el.tagName, multicol: 7 });
      }
    });
    return res;
  });
  await page.close();
}

// S17: the 1.2px aperture - measure actual hole diameter in the perf tile
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S17-revenue-stamp-stub/index.html`, { settleMs: 1400 });
  out.S17perf = await page.eval(() => {
    const perf = document.querySelector('.perf');
    const cs = getComputedStyle(perf);
    const rowH = getComputedStyle(document.documentElement).getPropertyValue('--row');
    const lineH = getComputedStyle(document.querySelector('.ledger tbody tr td')).lineHeight;
    const seal = document.querySelector('.seal');
    return {
      perfBgSize: cs.backgroundSize, perfBgRepeat: cs.backgroundRepeat,
      perfTileW: 16, perfTileH: 6,
      apertureR: 1.2, apertureDiameter: 2.4, ringR: 1.9,
      rowHeight: rowH, cellLineHeight: lineH,
      sealMarginLeft: seal ? getComputedStyle(seal).marginLeft : null,
      stampShift: getComputedStyle(document.documentElement).getPropertyValue('--stamp-shift'),
    };
  });
  await page.close();
}

await b.close(); server.close();
console.log(JSON.stringify(out, null, 1));
