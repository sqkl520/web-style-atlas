/* 为什么 probe.mjs 没把 S17 的 .sheet 当候选？逐条件排查。 */
import { Browser } from '../../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
console.log('ROOT =', ROOT);
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8',
  '.js': 'text/javascript;charset=utf-8', '.woff2': 'font/woff2', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]);
  if (/\/favicon\.ico$/.test(rel)) { res.writeHead(204); res.end(); return; }
  const p = resolve(ROOT, '.' + rel);
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  try {
    const b = await readFile(p);
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(b);
  } catch {
    console.error('[404]', rel);
    res.writeHead(404); res.end();
  }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const b = await Browser.launch({ width: 1440, height: 900 });
const pg = await b.newPage();
await pg.setViewport({ width: 1440, height: 900 });
await pg.goto(`http://127.0.0.1:${port}/prototypes/S17-revenue-stamp-stub/index.html`, { settleMs: 1500 });

const out = await pg.eval(`(() => {
  const sheet = document.querySelector('.sheet');
  if (!sheet) return { err: '没有 .sheet' };
  const cs = getComputedStyle(sheet);
  const gtc = cs.gridTemplateColumns;
  const trackList = gtc.split(/\\s+/).filter(t => t && t !== 'none');
  const kids = [...sheet.children];
  const withImg = kids.filter(k => k.querySelector('img, picture, svg, canvas')).length;
  return {
    display: cs.display,
    gtc,
    trackCount: trackList.length,
    trackList,
    kids: kids.length,
    kidsTag: kids.map(k => k.tagName + '.' + (k.className || '')).slice(0, 6),
    withImg,
    wouldBeGallery: kids.length >= 3 && withImg >= kids.length / 2,
    ownTextLen: (sheet.innerText || '').replace(/\\s+/g, '').length,
  };
})()`);
console.log(JSON.stringify(out, null, 1));
await b.close(); srv.close(); process.exit(0);
