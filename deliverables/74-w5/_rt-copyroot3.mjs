import { Browser } from '../../prototypes/_build/vendor/cdp.mjs';
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
  const log = [];
  const origFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(...a) {
    log.push('focus(' + this.tagName + '.' + (this.className||'') + ')');
    return origFocus.apply(this, a);
  };
  const origRemove = Element.prototype.removeChild;
  Element.prototype.removeChild = function(c) { log.push('removeChild(' + c.tagName + ')'); return origRemove.call(this, c); };
  btn.focus();
  log.push('--click--');
  btn.click();
  log.push('--sync done, active=' + document.activeElement.tagName + '--');
  HTMLElement.prototype.focus = origFocus; Element.prototype.removeChild = origRemove;
  return log;
})()`), null, 1));

// Also: print the actual source of execCopySync lines to see if the restore block matches selftest anchor
console.log('--- source check ---');
const src = await readFile(join(ROOT, 'prototypes/_selection/prompt-copy.js'), 'utf8');
const i = src.indexOf('function execCopySync');
console.log(src.slice(i, i + 1400));
await b.close(); srv.close();
