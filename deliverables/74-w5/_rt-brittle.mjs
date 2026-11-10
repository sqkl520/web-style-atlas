// Brittleness probes for the 8 proposed assertions.
import { Browser, sleep } from '../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = createServer(async (req, res) => { try { const p = join(ROOT, decodeURIComponent(req.url.split('?')[0])); const b = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const b = await Browser.launch({ width: 1440, height: 900 });
const pg = await b.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html`, { settleMs: 1200 });

// A. near chip style while .scene-more is still display:none
console.log('A. near style while hidden:', JSON.stringify(await pg.eval(`(() => {
  const n = document.querySelector('.scene-more button');
  const s = getComputedStyle(n);
  const r = n.getBoundingClientRect();
  return { font: s.fontSize, borderStyle: s.borderTopStyle, borderWidth: s.borderTopWidth, pad: s.paddingTop, rectW: r.width, rectH: r.height };
})()`)));

// B. click the toggle, then re-measure
console.log('B. toggle exists:', await pg.eval(`!!document.querySelector('.scene-toggle')`));
await pg.eval(`document.querySelector('.scene-toggle').click()`);
await sleep(400);
console.log('B. near style after expanding:', JSON.stringify(await pg.eval(`(() => {
  const n = document.querySelector('.scene-more button');
  const s = getComputedStyle(n);
  const r = n.getBoundingClientRect();
  return { font: s.fontSize, borderStyle: s.borderTopStyle, borderWidth: s.borderTopWidth, pad: s.paddingTop, rectW: Math.round(r.width), rectH: Math.round(r.height), moreDisplay: getComputedStyle(document.querySelector('.scene-more')).display, count: document.querySelectorAll('.scene-more button').length };
})()`)));

// C. what happens if the selector is renamed / mount point moves: querySelectorAll empty
console.log('C. selector robustness:', JSON.stringify(await pg.eval(`(() => {
  // simulate the regression: move .scene-more back outside the .rail-block (the original bug)
  const more = document.querySelector('.scene-more');
  document.querySelector('main').appendChild(more);   // now it is not under .rail-block
  const n = more.querySelector('button');
  const s = getComputedStyle(n);
  const chipCountSel = document.querySelectorAll('#flt-scene button, .scene-more button, .rail-block .chips button').length;
  const groupsSel = document.querySelectorAll('.rail-block .chips').length;
  return { font: s.fontSize, border: s.borderTopWidth + ' ' + s.borderTopStyle, chipCountSel, groupsSel };
})()`)));
console.log('C2. benchFillDerived after moving .scene-more out:', JSON.stringify(await pg.eval(`(() => {
  window.benchFillDerived();
  return [...document.querySelectorAll('[data-derived]')].map(n=>({k:n.getAttribute('data-derived'),v:n.textContent}));
})()`)));

// D. aria-live node lifetime: the copy announce node is removed after 2000ms
await b.close(); srv.close();
