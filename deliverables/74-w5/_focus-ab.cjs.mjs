// Focus after copy: programmatic .click() vs real mouse events. Also whether the
// temp-textarea removal is the mechanism, and whether focus is restorable.
import { Browser, sleep } from '../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const srv = createServer(async (req, res) => { try { const p = join(ROOT, decodeURIComponent(req.url.split('?')[0])); const b = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const b = await Browser.launch({ width: 1440, height: 900 });

const act = p => p.eval(`(() => { const a = document.activeElement; return a ? a.tagName + '.' + (a.className||'') : null; })()`);

// ---- A: programmatic .click() (what _ux_rootcause.mjs does) ----
{
  const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
  await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html`, { settleMs: 1200 });
  await pg.eval(`document.querySelector('.row[data-id="S01"]').click()`); await sleep(700);
  const r = await pg.eval(`(() => {
    const btn = document.querySelector('.prompt-copy'); btn.focus();
    const before = document.activeElement.className;
    const log = [];
    document.addEventListener('focusin', e => log.push('in:' + e.target.tagName + '.' + (e.target.className||'')), true);
    document.addEventListener('focusout', e => log.push('out:' + e.target.tagName + '.' + (e.target.className||'')), true);
    btn.click();
    return { before, after: document.activeElement.tagName + '.' + (document.activeElement.className||''), log };
  })()`);
  console.log('A programmatic click:', JSON.stringify(r));
  await sleep(700);
  console.log('A settled:', JSON.stringify({ active: await act(pg), btn: await pg.eval(`document.querySelector('.prompt-copy').textContent`) }));
  await pg.close();
}

// ---- B: real mouse events (what probe-ui 断言 #4 requires) ----
{
  const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
  await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html`, { settleMs: 1200 });
  await pg.eval(`document.querySelector('.row[data-id="S01"]').click()`); await sleep(700);
  const box = await pg.eval(`(() => { const b=document.querySelector('.prompt-copy'); const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}; })()`);
  console.log('B before click:', JSON.stringify({ active: await act(pg), box }));
  await pg.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
  await pg.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await pg.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  console.log('B immediately after:', JSON.stringify({ active: await act(pg) }));
  await sleep(150);
  console.log('B +150ms:', JSON.stringify({ active: await act(pg) }));
  await sleep(600);
  console.log('B +750ms:', JSON.stringify({ active: await act(pg), btn: await pg.eval(`document.querySelector('.prompt-copy').textContent`) }));
  await pg.close();
}
await b.close(); srv.close();
