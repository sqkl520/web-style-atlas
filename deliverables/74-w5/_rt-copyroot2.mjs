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
await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html#S07`, { settleMs: 1200 });

console.log(JSON.stringify(await pg.eval(`(() => {
  const btn = document.querySelector('.prompt-copy');
  btn.focus();
  const prev = document.activeElement;
  const log = [];
  const origRemove = Element.prototype.removeChild;
  Element.prototype.removeChild = function(c) {
    const r = origRemove.call(this, c);
    log.push({ step: 'afterRemoveChild', active: document.activeElement.tagName, isBody: document.activeElement === document.body, containsPrev: document.contains(prev), prevIsBtn: prev === btn });
    return r;
  };
  const d = () => { const a = document.activeElement; return a.tagName + '.' + (a.className||''); };
  log.push({ step: 'before', active: d() });
  btn.click();
  log.push({ step: 'afterClickSync', active: d() });
  Element.prototype.removeChild = origRemove;
  return { log, prevTag: prev.tagName + '.' + prev.className, liveCode: document.querySelector('.prompt-copy').textContent };
})()`), null, 1));

// Second: is the source of the console error page-side? check window.onerror
console.log('errors:', JSON.stringify(await pg.eval(`(window.__e||[]).slice(0,5)`)));

// Third: check whether removeChild is even called — maybe showManual path is used and its ta.focus wins
await b.close(); srv.close();
