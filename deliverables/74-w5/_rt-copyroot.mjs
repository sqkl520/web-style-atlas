import { Browser, sleep } from '../../prototypes/_build/vendor/cdp.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(fileURLToPath(import.meta.url), '../../..');
const MIME = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json' };
const srv = createServer(async (req, res) => { try { const p = join(ROOT, decodeURIComponent(req.url.split('?')[0])); const b = await readFile(p); res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' }); res.end(b); } catch { res.writeHead(404); res.end(); } });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const b = await Browser.launch({ width: 1440, height: 900 });
const pg = await b.newPage();
await pg.setViewport({ width: 1440, height: 900 });
const goto = async (h='') => pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html${h}`, { settleMs: 1200 });

await goto('#S07');

// Case A: exactly what probe-ui does (synthetic click + focus)
const A = await pg.eval(`(() => {
  try { Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.resolve()},configurable:true}); } catch(e){}
  const btn = document.querySelector('.prompt-copy');
  btn.focus();
  const before = document.activeElement === btn;
  const log = [];
  log.push('afterFocus:' + document.activeElement.tagName + '.' + (document.activeElement.className||''));
  // instrument focus/blur
  const seen = [];
  const origFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(...a){ seen.push('focus:' + this.tagName + '.' + (this.className||'')); return origFocus.apply(this,a); };
  const origRemove = Element.prototype.removeChild;
  Element.prototype.removeChild = function(c){ seen.push('removeChild:' + c.tagName); return origRemove.call(this,c); };
  btn.click();
  const afterSync = document.activeElement.tagName + '.' + (document.activeElement.className||'');
  return new Promise(res => setTimeout(() => {
    Element.prototype.removeChild = origRemove; HTMLElement.prototype.focus = origFocus;
    res({ before, afterSync, after500: document.activeElement.tagName + '.' + (document.activeElement.className||''), seen });
  }, 500));
})()`);
console.log('A (probe-ui style):', JSON.stringify(A));

// Case B: real mouse click at 1440 with detail open via hash
await goto('#S08');
const B = await pg.eval(`(() => { const b=document.querySelector('.prompt-copy'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2)}; })()`);
await pg.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: B.x, y: B.y, button: 'left', clickCount: 1 });
await pg.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: B.x, y: B.y, button: 'left', clickCount: 1 });
await sleep(600);
console.log('B (real mouse):', JSON.stringify(await pg.eval(`({active: document.activeElement.tagName + '.' + (document.activeElement.className||''), btn: document.querySelector('.prompt-copy').textContent, box: !!document.querySelector('[aria-label="手动复制提示词"]')})`)));

// Case C: real mouse click WITHOUT stubbing clipboard (clipboard.writeText real, no gesture allowance)
await goto('#S09');
const C0 = await pg.eval(`(() => { const b=document.querySelector('.prompt-copy'); const r=b.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2)}; })()`);
await pg.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: C0.x, y: C0.y, button: 'left', clickCount: 1 });
await pg.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: C0.x, y: C0.y, button: 'left', clickCount: 1 });
await sleep(900);
console.log('C (real mouse, real clipboard):', JSON.stringify(await pg.eval(`({active: document.activeElement.tagName + '.' + (document.activeElement.className||''), btn: document.querySelector('.prompt-copy').textContent, box: !!document.querySelector('[aria-label="手动复制提示词"]'), boxTa: !!document.querySelector('[aria-label="手动复制提示词"] textarea')})`)));

await b.close(); srv.close();
