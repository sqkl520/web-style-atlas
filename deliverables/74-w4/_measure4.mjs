import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9634;
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

// S01: exact text tops per column vs wedge bottom
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S01-red-wedge-broadsheet/index.html`, { settleMs: 1100 });
  out.S01 = await page.eval(() => {
    const wedge = document.querySelector('.wedge').getBoundingClientRect();
    const cols = [...document.querySelectorAll('.col')];
    const info = cols.map((c, i) => {
      const r = c.getBoundingClientRect();
      const texts = [...c.querySelectorAll('p, h2, h3, li')];
      const first = texts.map(t => t.getBoundingClientRect()).filter(x => x.height > 0).sort((a, b) => a.top - b.top)[0];
      return {
        idx: i + 1, left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top),
        firstTextTop: first ? Math.round(first.top) : null,
      };
    });
    // Does the wedge horizontally overlap any text that starts above wedge.bottom?
    const covered = [];
    cols.forEach((c, i) => {
      [...c.querySelectorAll('p, h2, h3, li')].forEach(t => {
        const r = t.getBoundingClientRect();
        if (r.height === 0) return;
        if (r.top < wedge.bottom && r.right > wedge.left && r.left < wedge.right) {
          covered.push({ col: i + 1, tag: t.tagName, cls: t.className, top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right) });
        }
      });
    });
    // Count text lines that geometrically intersect the wedge polygon bbox before wedge bottom
    return {
      wedge: { left: Math.round(wedge.left), right: Math.round(wedge.right), top: Math.round(wedge.top), bottom: Math.round(wedge.bottom) },
      cols: info,
      textOverlappingWedgeBox: covered.length,
      samples: covered.slice(0, 6),
      firstColBlankLines: (() => {
        const s = document.querySelector('.slug-slot');
        const p = document.querySelector('.col-1 p.standfirst');
        return Math.round(s.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight));
      })(),
      zOrder: { wedge: getComputedStyle(document.querySelector('.wedge')).zIndex, col: getComputedStyle(document.querySelector('.col')).zIndex },
    };
  });
  await page.close();
}

// S19: rows
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S19-copperplate-herbarium-cabinet/index.html`, { settleMs: 900 });
  out.S19 = await page.eval(() => {
    const rows = [...document.querySelectorAll('.row')];
    const dws = [...document.querySelectorAll('.dw')];
    const rowVals = [...new Set(dws.map(d => getComputedStyle(d).getPropertyValue('--row').trim()))];
    return {
      rowContainers: rows.length,
      distinctRowVars: rowVals,
      rowVarCount: rowVals.length,
      dwCount: dws.length,
      spanVals: [...new Set(dws.map(d => getComputedStyle(d).getPropertyValue('--s').trim()))].sort(),
      perRowCounts: rows.map(r => r.querySelectorAll(':scope > .dw').length),
    };
  });
  await page.close();
}

// S05: per-row span pattern
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S05-pixel-cold-storage-console/index.html`, { settleMs: 900 });
  out.S05 = await page.eval(() => {
    const ps = [...document.querySelectorAll('.panel')];
    return {
      n: ps.length,
      areas: ps.map(p => {
        const c = getComputedStyle(p).gridColumn.split('/').map(s => parseInt(s.trim(), 10));
        const r = getComputedStyle(p).gridRow.split('/').map(s => parseInt(s.trim(), 10));
        return { cls: p.className.replace('panel ', '').replace(' is-scanned', ''), span: c[1] - c[0], rows: r[1] - r[0], w: Math.round(p.getBoundingClientRect().width), h: Math.round(p.getBoundingClientRect().height) };
      }),
    };
  });
  await page.close();
}

// S24: is '2 columns each side' true? and does 2px gap exist in stroke?
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S24-cyanotype-rainforest-path/index.html`, { settleMs: 900 });
  out.S24 = await page.eval(() => {
    const fork = document.querySelector('.fork__grid');
    const fcs = getComputedStyle(fork);
    const tracks = fcs.gridTemplateColumns.split(' ').map(parseFloat);
    const colW = tracks[0], gap = parseFloat(fcs.columnGap) || 0;
    const axis = document.querySelector('.fork__axis').getBoundingClientRect();
    const lv = document.querySelector('.lv');
    const lvR = lv.getBoundingClientRect();
    const arts = [...lv.querySelectorAll(':scope > .br')];
    const aW = arts.map(a => a.getBoundingClientRect().width);
    const colOf = (px) => (px + gap) / (colW + gap);
    const vp = [...document.querySelectorAll('.vein .vm, .vein .vb, .vein .vc, .vein .vd')].slice(0, 4);
    return {
      trackPx: colW, gap, axisCenter: Math.round(axis.left + axis.width / 2),
      lvLeft: Math.round(lvR.left), lvRight: Math.round(lvR.right), lvWidth: Math.round(lvR.width),
      branchWidths: aW.map(Math.round),
      branchCols: aW.map(w => Math.round(colOf(w) * 100) / 100),
      ratio: Math.round(aW[0] / aW[1] * 1000) / 1000,
      dashed: vp.map(p => ({ cls: p.getAttribute('class'), dash: getComputedStyle(p).strokeDasharray, len: p.getAttribute('pathLength'), dLen: p.getTotalLength ? Math.round(p.getTotalLength()) : null })),
    };
  });
  await page.close();
}

// S03: does the 9-col / 12-col exist at ANY breakpoint? enumerate all grid track counts
{
  const page = await b.newPage({ width: 1440, height: 900 });
  const rows = [];
  for (const w of [1920, 1440, 1200, 1023, 767, 390]) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}/prototypes/S03-long-exposure-observatory/index.html`, { settleMs: 700 });
    rows.push(await page.eval(() => {
      const all = [...document.querySelectorAll('body *')];
      const multicol = [];
      all.forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.columnCount && cs.columnCount !== 'auto') multicol.push(el.className + '=' + cs.columnCount);
      });
      const grids = all.filter(el => getComputedStyle(el).display.includes('grid')).map(el => ({
        cls: (typeof el.className === 'string' ? el.className : '') + '',
        tracks: getComputedStyle(el).gridTemplateColumns.split(/\s+/).length,
        raw: getComputedStyle(el).gridTemplateColumns,
      }));
      return { vw: innerWidth, multicol, maxTracks: Math.max(...grids.map(g => g.tracks)), gridsWithMany: grids.filter(g => g.tracks > 3) };
    }));
  }
  out.S03grids = rows;
  await page.close();
}

await b.close(); server.close();
console.log(JSON.stringify(out, null, 1));
