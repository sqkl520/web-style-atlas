// Can headless Chrome grant clipboard permission so the copy CONTENT can be verified?
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

// grant clipboard permissions via CDP Browser.grantPermissions
try {
  const r = await pg.browser.send('Browser.grantPermissions', {
    origin: `http://127.0.0.1:${port}`,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
  console.log('grantPermissions ok', JSON.stringify(r || {}));
} catch (e) { console.log('grantPermissions failed:', e.message); }

const clip = await pg.eval(`(async () => {
  const out = { isSecure: isSecureContext };
  try { out.write = await navigator.clipboard.writeText('rt-canary').then(()=> 'ok', e=>e.name); } catch(e){ out.write = e.name; }
  try { out.read = (await navigator.clipboard.readText()).slice(0, 20); } catch(e){ out.read = e.name; }
  return out;
})()`);
console.log('clipboard after CDP grant (no gesture):', JSON.stringify(clip));

// now the REAL path: click the product button, then read the clipboard
const bb = await pg.eval(`(() => { const b=document.querySelector('.prompt-copy'); const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2)}; })()`);
await pg.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: bb.x, y: bb.y, button: 'left', clickCount: 1 });
await pg.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bb.x, y: bb.y, button: 'left', clickCount: 1 });
await sleep(900);
const got = await pg.eval(`(async () => {
  const t = await navigator.clipboard.readText().catch(e => 'ERR:' + e.name);
  return { len: t.length, head: t.slice(0, 80), hasScheme: t.includes('S07'), active: document.activeElement.tagName + '.' + (document.activeElement.className||'') };
})()`);
console.log('clipboard after REAL product click:', JSON.stringify(got));
await b.close(); srv.close();
