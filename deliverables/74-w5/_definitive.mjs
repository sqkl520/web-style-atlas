// Definitive read of the 3 derived values + near/direct chip styles, no poisoning,
// at two states: collapsed rail (initial) and after expanding .scene-more.
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
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
await pg.goto(`http://127.0.0.1:${port}/prototypes/_selection/index.html`, { settleMs: 1400 });

console.log('INITIAL (rail collapsed):', JSON.stringify(await pg.eval(`(() => {
  const cs = el => { if (!el) return null; const s = getComputedStyle(el); return { font: s.fontSize, border: s.borderTopWidth + ' ' + s.borderTopStyle, pad: s.paddingTop, bg: s.backgroundColor, color: s.color }; };
  return {
    derived: [...document.querySelectorAll('[data-derived]')].map(n => n.getAttribute('data-derived') + '=' + n.textContent),
    summary: document.querySelector('.rail-fold-sum').textContent.trim(),
    chipsInScene: document.querySelectorAll('#flt-scene button').length,
    chipsInMore: document.querySelectorAll('.scene-more button').length,
    moreDisplay: getComputedStyle(document.querySelector('.scene-more')).display,
    near: cs(document.querySelector('.scene-more button')),
    direct: cs(document.querySelector('#flt-scene button.is-direct')),
    nearParent: document.querySelector('.scene-more').parentElement.className,
  };
})()`), null, 1));

// expand .scene-more via its toggle
await pg.eval(`(() => { const t = document.querySelector('.scene-toggle'); t && t.click(); })()`);
await sleep(400);
console.log('AFTER expanding near-chips:', JSON.stringify(await pg.eval(`(() => {
  const cs = el => { if (!el) return null; const s = getComputedStyle(el); return { font: s.fontSize, border: s.borderTopWidth + ' ' + s.borderTopStyle, pad: s.paddingTop, bg: s.backgroundColor, color: s.color }; };
  return {
    derived: [...document.querySelectorAll('[data-derived]')].map(n => n.getAttribute('data-derived') + '=' + n.textContent),
    moreDisplay: getComputedStyle(document.querySelector('.scene-more')).display,
    near: cs(document.querySelector('.scene-more button')),
    direct: cs(document.querySelector('#flt-scene button.is-direct')),
    nearAriaPressed: document.querySelector('.scene-more button').getAttribute('aria-pressed'),
  };
})()`), null, 1));

// press the near chip and read pressed style
await pg.eval(`(() => { document.querySelector('.scene-more button').click(); })()`);
await sleep(400);
console.log('AFTER pressing near chip:', JSON.stringify(await pg.eval(`(() => {
  const btn = document.querySelector('.scene-more button[aria-pressed="true"]');
  if (!btn) return { none: true };
  const s = getComputedStyle(btn); return { border: s.borderTopWidth + ' ' + s.borderTopStyle, bg: s.backgroundColor, color: s.color, font: s.fontSize };
})()`)));

// images
console.log('images:', JSON.stringify(await pg.eval(`(() => {
  const imgs = [...document.querySelectorAll('#ledger .row img')];
  const hidden = imgs.filter(i => { let n = i; while (n && n !== document.body) { const s = getComputedStyle(n); if (s.display === 'none') return true; n = n.parentElement; } return false; });
  return { total: imgs.length, hidden: hidden.length, withSrc: imgs.filter(i => i.getAttribute('src')).length, loading: imgs.map(i => i.getAttribute('loading')).filter((v,i2,a)=>a.indexOf(v)===i2), jpgResources: performance.getEntriesByType('resource').filter(e=>/\\.jpg/i.test(e.name)).length };
})()`)));

// aria-live
console.log('aria-live:', JSON.stringify(await pg.eval(`(() => ({ count: (()=>{const c=document.getElementById('count'); return {live:c.getAttribute('aria-live'),atomic:c.getAttribute('aria-atomic'),role:c.getAttribute('role')}})(), all: [...document.querySelectorAll('[aria-live]')].map(e => (e.id||e.className) + '=' + e.getAttribute('aria-live')) }))()`)));

await b.close(); srv.close();
