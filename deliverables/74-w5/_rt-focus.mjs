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

// open detail via real mouse click on row S01
const row = await pg.eval(`(() => { const r=document.querySelector('.row[data-id=\"S01\"]'); const b=r.getBoundingClientRect(); return {x:Math.round(b.x+b.width/2), y:Math.round(b.y+b.height/2)}; })()`);
await pg.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: row.x, y: row.y, button: 'left', clickCount: 1 });
await pg.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: row.x, y: row.y, button: 'left', clickCount: 1 });
await sleep(700);

// PATH 1: synthetic .click() on the copy button (what a naive probe does)
console.log('synthetic click result:', JSON.stringify(await pg.eval(`(() => {
  document.querySelector('.prompt-copy').click();
  return { activeNow: document.activeElement.tagName + '.' + (document.activeElement.className||'') };
})()`)));
await sleep(900);
console.log('after synthetic click settle:', JSON.stringify(await pg.eval(`({
  active: document.activeElement.tagName + '.' + (document.activeElement.className||''),
  btnText: document.querySelector('.prompt-copy').textContent,
  manualBox: !!document.querySelector('[aria-label="手动复制提示词"]'),
  liveText: [...document.querySelectorAll('[role=status]')].map(n=>n.textContent).filter(Boolean)
})`)));

// close the manual box if present
await pg.eval(`(() => { const bx=document.querySelector('[aria-label="手动复制提示词"]'); if(bx){ const b=bx.querySelector('button'); b&&b.click(); } })()`);
await sleep(400);

// PATH 2: real Input click
await pg.eval(`document.querySelector('.row[data-id=\"S02\"]').click()`);
await sleep(600);
const cb = await pg.eval(`(() => { const b=document.querySelector('.prompt-copy'); const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2)}; })()`);
await pg.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cb.x, y: cb.y, button: 'left', clickCount: 1 });
await pg.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cb.x, y: cb.y, button: 'left', clickCount: 1 });
await sleep(900);
console.log('after REAL click settle:', JSON.stringify(await pg.eval(`({
  active: document.activeElement.tagName + '.' + (document.activeElement.className||''),
  btnText: document.querySelector('.prompt-copy').textContent,
  manualBox: !!document.querySelector('[aria-label="手动复制提示词"]'),
  liveText: [...document.querySelectorAll('[role=status]')].map(n=>n.textContent).filter(Boolean)
})`)));

// How long does the "已复制 ✓" text last? (1800ms per done()) — probe at 1900ms
await sleep(1400);
console.log('at +2300ms after click:', JSON.stringify(await pg.eval(`({ btnText: document.querySelector('.prompt-copy').textContent, liveNodes: document.querySelectorAll('[role=status]').length })`)));

await b.close(); srv.close();
