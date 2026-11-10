import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9776;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/prototypes/_selection/index.html';
  let f = normalize(join(ROOT, u));
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!f.startsWith(normalize(ROOT)) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;
const print = (k, v) => console.log('### ' + k + '\n' + JSON.stringify(v, null, 1));
const kk = async (p, k, code, vk) => {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await new Promise(r => setTimeout(r, 320));
};

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });

// ensure focus is truly on body by blurring any active element
async function reset() { await p.eval(`(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); window.scrollTo(0,0); })()`); await new Promise(r=>setTimeout(r,250)); }
async function st() { return p.eval(`(() => { const a=document.activeElement; return { y:Math.round(scrollY), hash:location.hash, detail:!document.getElementById('detail').hidden, active:a.tagName+'|'+(a===document.body?'BODY':'x')+'|'+(a.className||'').toString().slice(0,20) }; })()`); }

await reset(); print('base', await st());
await kk(p, ' ', 'Space', 32); print('afterSpaceOnBody', await st());
await reset(); print('reset', await st());
await kk(p, 'End', 'End', 35); print('afterEndOnBody', await st());
await reset();
await kk(p, 'Home', 'Home', 36); print('afterHomeOnBody', await st());
await reset();
await kk(p, 'ArrowRight', 'ArrowRight', 39); print('afterArrowRightOnBody', await st());
await reset();
await kk(p, 'ArrowLeft', 'ArrowLeft', 37); print('afterArrowLeftOnBody', await st());

// with focus on a row card
await p.eval(`(() => { const r=document.querySelector('.row[data-id=S03]'); r.scrollIntoView({block:'center'}); r.focus(); })()`);
await new Promise(r=>setTimeout(r,300));
print('focusOnRow', await st());
await kk(p, ' ', 'Space', 32); print('afterSpaceOnRowCard', await st());

await b.close();
server.close();
