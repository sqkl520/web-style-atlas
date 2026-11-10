import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';

const ROOT = 'D:/Web/style';
const PORT = 9633;
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

// ---------- S03 cursor: real pointer via CDP Input, plus ratio probe ----------
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S03-long-exposure-observatory/index.html`, { settleMs: 1200 });
  const r = await page.eval(() => {
    const band = document.querySelector('.band');
    const cur = document.querySelector('.cursor');
    const res = [];
    // scroll so band is in view
    band.scrollIntoView({ block: 'center' });
    const rect = band.getBoundingClientRect();
    for (const [dx, dy] of [[10, 10], [100, 30], [300, 60]]) {
      const x = Math.round(rect.left + dx), y = Math.round(rect.top + dy);
      band.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
      res.push({ clientX: x, clientY: y, inline: cur.style.transform, computed: getComputedStyle(cur).transform, display: cur.style.display });
    }
    return { res, bandRect: { l: Math.round(rect.left), t: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) } };
  });
  out.S03cursor = r;
  await page.close();
}

// ---------- S01: does the red wedge actually cover body text? ----------
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S01-red-wedge-broadsheet/index.html`, { settleMs: 1000 });
  const r = await page.eval(() => {
    const wedge = document.querySelector('.wedge');
    const wr = wedge.getBoundingClientRect();
    const cols = [...document.querySelectorAll('.col')];
    // sample a grid over the wedge's area, record which element is topmost and whether it is text
    const hits = {};
    for (let ix = 0; ix <= 20; ix++) {
      for (let iy = 0; iy <= 12; iy++) {
        const x = Math.round(wr.left + wr.width * (ix / 20));
        const y = Math.round(wr.top + wr.height * (iy / 12));
        if (x < 1 || y < 1 || x >= innerWidth - 1 || y >= innerHeight - 1) continue;
        const el = document.elementFromPoint(x, y);
        if (!el) continue;
        const k = el.tagName + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
        hits[k] = (hits[k] || 0) + 1;
      }
    }
    const slugSlot = document.querySelector('.slug-slot');
    const col1 = document.querySelector('.col-1');
    const colHead = col1.querySelector('.col-head');
    const firstP = col1.querySelector('p.standfirst') || col1.querySelectorAll('p')[1];
    return {
      hitsTopmost: hits,
      slugSlotH: slugSlot ? Math.round(slugSlot.getBoundingClientRect().height) : null,
      firstTextTop: firstP ? Math.round(firstP.getBoundingClientRect().top) : null,
      col1Top: Math.round(col1.getBoundingClientRect().top),
      col1LH: firstP ? getComputedStyle(firstP).lineHeight : null,
      col1FS: firstP ? getComputedStyle(firstP).fontSize : null,
      wedgeBottom: Math.round(wr.bottom),
      col1BlankPx: slugSlot ? Math.round(slugSlot.getBoundingClientRect().height) : null,
      blankLines: slugSlot && firstP ? Math.round(slugSlot.getBoundingClientRect().height / parseFloat(getComputedStyle(firstP).lineHeight)) : null,
    };
  });
  out.S01occl = r;
  await page.close();
}

// ---------- S17: amount column width across the breakpoint range ----------
{
  const page = await b.newPage({ width: 1440, height: 900 });
  const rows = [];
  for (const w of [1920, 1600, 1440, 1439, 1280, 1100, 1024, 1023, 768, 390]) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}/prototypes/S17-revenue-stamp-stub/index.html`, { settleMs: 700 });
    rows.push(await page.eval(() => {
      const num = document.querySelector('.ledger tbody td.num');
      const item = document.querySelector('.ledger td.item');
      const cs = getComputedStyle(num);
      return {
        vw: innerWidth,
        numDeclaredWidth: cs.width,
        numRendered: num ? Math.round(num.getBoundingClientRect().width) : null,
        numMinContent: (() => { const c = document.createElement('canvas').getContext('2d'); const f = getComputedStyle(num); c.font = f.fontWeight + ' ' + f.fontSize + ' ' + f.fontFamily; return Math.ceil(c.measureText(num.textContent.trim()).width) + 24; })(),
        itemRendered: item ? Math.round(item.getBoundingClientRect().width) : null,
        numDisplay: cs.display,
        numTextAlign: cs.textAlign,
      };
    }));
  }
  out.S17widths = rows;
  await page.close();
}

// ---------- S12: block spans, margins, cuts ----------
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S12-lime-knockout-wall/index.html`, { settleMs: 900 });
  out.S12detail = await page.eval(() => {
    const wall = document.querySelector('.wall');
    const ops = [...document.querySelectorAll('.opening')];
    const tracks = getComputedStyle(wall).gridTemplateColumns.split(' ').map(s => Math.round(parseFloat(s)));
    return {
      trackPx: tracks,
      ops: ops.map(o => {
        const cs = getComputedStyle(o);
        const r = o.getBoundingClientRect();
        const gc = cs.gridColumn.split('/').map(s => parseInt(s.trim(), 10));
        return {
          id: o.id, span: gc[1] - gc[0], row: cs.gridRow, colStart: gc[0],
          cut: cs.getPropertyValue('--cut').trim(),
          marginTop: cs.marginTop, marginRight: cs.marginRight,
          height: Math.round(r.height), width: Math.round(r.width),
        };
      }),
    };
  });
  await page.close();
}

// ---------- S07: is there any 5-column or 7-column toc anywhere / other breakpoints ----------
{
  const page = await b.newPage({ width: 1440, height: 900 });
  const rows = [];
  for (const w of [1920, 1440, 1280, 1279, 900, 899, 390]) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(`http://127.0.0.1:${PORT}/prototypes/S07-slate-ink-contents/index.html`, { settleMs: 700 });
    rows.push(await page.eval(() => {
      const pg = document.querySelector('.pages');
      const rec = document.querySelector('.page-recto .toc');
      const ver = document.querySelector('.page-verso .toc');
      const rg = document.querySelector('.plate-grid');
      return {
        vw: innerWidth,
        pagesTracks: getComputedStyle(pg).gridTemplateColumns,
        rectoCols: rec ? getComputedStyle(rec).columnCount : null,
        versoCols: ver ? getComputedStyle(ver).columnCount : null,
        plateTracks: rg ? getComputedStyle(rg).gridTemplateColumns.split(' ').length : null,
        plateTracksPx: rg ? getComputedStyle(rg).gridTemplateColumns : null,
      };
    }));
  }
  out.S07bp = rows;
  await page.close();
}

// ---------- S19: rows and per-row span signature ----------
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S19-copperplate-herbarium-cabinet/index.html`, { settleMs: 900 });
  out.S19detail = await page.eval(() => {
    const rows = [...document.querySelectorAll('.row')];
    return {
      rowCount: rows.length,
      perRow: rows.map(r => {
        const dws = [...r.querySelectorAll(':scope > .dw')];
        return dws.map(d => ({ id: d.id, span: getComputedStyle(d).gridColumn.split('/').length > 1 ? null : getComputedStyle(d).getPropertyValue('--s').trim(), rendered: Math.round(d.getBoundingClientRect().width) }));
      }),
      dwWidths: [...document.querySelectorAll('.dw')].slice(0, 6).map(d => Math.round(d.getBoundingClientRect().width)),
      cardH: (() => { const c = document.querySelector('.dw__card'); return c ? Math.round(c.getBoundingClientRect().height) : null; })(),
      inH: (() => { const c = document.querySelector('.dw__in'); return c ? Math.round(c.getBoundingClientRect().height) : null; })(),
      barH: (() => { const c = document.querySelector('.dw__bar'); return c ? Math.round(c.getBoundingClientRect().height) : null; })(),
    };
  });
  await page.close();
}

// ---------- S29: pierce size in the wire image, and 3px claim ----------
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S29-wire-bound-safety-manual/index.html`, { settleMs: 900 });
  out.S29detail = await page.eval(() => {
    const wire = document.querySelector('.wire');
    const num = document.querySelector('.num');
    const cb = document.querySelector('.col-b');
    const spec = document.querySelector('.panel--spec');
    const numR = num ? num.getBoundingClientRect() : null;
    const cbR = cb ? cb.getBoundingClientRect() : null;
    return {
      wireWidth: getComputedStyle(wire).width,
      wireBgSize: getComputedStyle(wire).backgroundSize,
      numRect: numR ? { l: Math.round(numR.left), w: Math.round(numR.width), h: Math.round(numR.height) } : null,
      numLeft: getComputedStyle(num).left,
      colBTop: cbR ? Math.round(cbR.top) : null,
      numTop: numR ? Math.round(numR.top) : null,
      colBMarginTop: getComputedStyle(cb).marginTop,
      specMarginRight: getComputedStyle(spec).marginRight,
      specWidth: spec ? Math.round(spec.getBoundingClientRect().width) : null,
      chGridTracks: (() => { const g = document.querySelector('.ch__grid'); return g ? getComputedStyle(g).gridTemplateColumns : null; })(),
    };
  });
  await page.close();
}

// ---------- S24: is it 4 levels, 2 branches each, 5:3? ----------
{
  const page = await b.newPage({ width: 1440, height: 900 });
  await page.goto(`http://127.0.0.1:${PORT}/prototypes/S24-cyanotype-rainforest-path/index.html`, { settleMs: 900 });
  out.S24detail = await page.eval(() => {
    const fork = document.querySelector('.fork__grid');
    const lvs = [...document.querySelectorAll('.lv')];
    return {
      forkTracks: getComputedStyle(fork).gridTemplateColumns.split(' ').length,
      forkWidth: Math.round(fork.getBoundingClientRect().width),
      axisLeft: getComputedStyle(document.querySelector('.fork__axis')).left,
      axisW: getComputedStyle(document.querySelector('.fork__axis')).width,
      lvs: lvs.map(l => {
        const arts = [...l.querySelectorAll(':scope > .br')];
        return {
          cls: l.className,
          tracks: getComputedStyle(l).gridTemplateColumns,
          n: arts.length,
          widths: arts.map(a => Math.round(a.getBoundingClientRect().width)),
          marginTops: arts.map(a => getComputedStyle(a).marginTop),
        };
      }),
    };
  });
  await page.close();
}

await b.close(); server.close();
console.log(JSON.stringify(out, null, 1));
