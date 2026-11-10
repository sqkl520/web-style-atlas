// Clipboard permission in headless Chrome with NO prior user gesture, and with a gesture.
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
await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html`, { settleMs: 800 });

// NO interaction at all yet
const noGesture = await pg.eval(`(async () => {
  const out = { isSecure: isSecureContext, hasApi: !!(navigator.clipboard && navigator.clipboard.writeText) };
  try { const p = await navigator.permissions.query({ name: 'clipboard-write' }); out.perm = p.state; } catch (e) { out.perm = 'query-failed:' + e.name; }
  try { await navigator.clipboard.writeText('x'); out.write = 'ok'; } catch (e) { out.write = e.name + ':' + e.message.slice(0,60); }
  return out;
})()`);
console.log('clipboard NO gesture:', JSON.stringify(noGesture));

// Now do a real click somewhere inert, then read.
await pg.eval(`document.querySelector('.row[data-id="S01"]').click()`);
await sleep(600);
const afterClick = await pg.eval(`(async () => {
  try { await navigator.clipboard.writeText('y'); return 'ok'; } catch (e) { return e.name; }
})()`);
console.log('clipboard after programmatic click:', afterClick);

// does clipboard.readText work (asserting content)?
const read = await pg.eval(`(async () => { try { return (await navigator.clipboard.readText()).slice(0,40); } catch(e){ return e.name; } })()`);
console.log('clipboard.readText:', read);

// execCommand copy under headless, no gesture
const execNoGesture = await pg.eval(`(() => {
  const t = document.createElement('textarea'); t.value='zzz'; document.body.appendChild(t); t.focus(); t.select();
  let r; try { r = document.execCommand('copy'); } catch(e){ r = 'throw:'+e.name; }
  document.body.removeChild(t); return r;
})()`);
console.log('execCommand(copy) no gesture:', execNoGesture);

// check whether the page can even tell the copy "succeeded" - what does the button say?
console.log('button after programmatic copy path (no real click):', await pg.eval(`(() => {
  const b = document.querySelector('.prompt-copy');
  if (!b) return 'no-btn';
  const r = b.getBoundingClientRect(); return { text: b.textContent, cls: b.className, x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2) };
})()`));

await b.close(); srv.close();
