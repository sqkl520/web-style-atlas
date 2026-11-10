import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9772;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/prototypes/_selection/index.html';
  let f = normalize(join(ROOT, p));
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
  await new Promise(r => setTimeout(r, 400));
};

{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });
  await p.eval(`document.body.focus()`);
  print('scrollKeysNoDetail', { start: await p.eval(`({y:Math.round(scrollY),hash:location.hash})`) });
  await kk(p, 'ArrowDown', 'ArrowDown', 40);
  print('afterArrow1', await p.eval(`({y:Math.round(scrollY),hash:location.hash,detail:!document.getElementById('detail').hidden})`));
  // close detail then try space + arrow
  await kk(p, 'Escape', 'Escape', 27);
  print('afterEsc', await p.eval(`({y:Math.round(scrollY),hash:location.hash,detail:!document.getElementById('detail').hidden,focus:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,20)})`));
  await p.eval(`window.scrollTo(0,0); document.body.focus()`);
  await kk(p, ' ', 'Space', 32);
  print('afterSpaceBody', await p.eval(`({y:Math.round(scrollY),hash:location.hash,detail:!document.getElementById('detail').hidden})`));
  await kk(p, 'End', 'End', 35);
  print('afterEnd', await p.eval(`({y:Math.round(scrollY),hash:location.hash})`));
  await b.close();
}

// Esc on a <summary> inside detail: does it close panel or just refocus head?
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });
  await p.eval(`document.querySelector('.row').click()`);
  await new Promise(r => setTimeout(r, 800));
  await p.eval(`document.querySelector('#detail .fold > summary').focus()`);
  print('escOnSummary', {
    before: await p.eval(`({focusCls:document.activeElement.tagName, detail:!document.getElementById('detail').hidden})`)
  });
  await kk(p, 'Escape', 'Escape', 27);
  print('escOnSummaryAfter', await p.eval(`({focus:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,22), detail:!document.getElementById('detail').hidden, hash:location.hash})`));
  await b.close();
}

// ArrowDown while focus is on a row card (tabindex=0) — does it move the card or scroll?
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });
  await p.eval(`const r=document.querySelector('.row'); r.scrollIntoView({block:'center'}); r.focus()`);
  const before = await p.eval(`({y:Math.round(scrollY), id:document.activeElement.getAttribute('data-id'), hash:location.hash})`);
  await kk(p, 'ArrowDown', 'ArrowDown', 40);
  const after = await p.eval(`({y:Math.round(scrollY), id:document.activeElement.getAttribute('data-id'), hash:location.hash, detail:!document.getElementById('detail').hidden})`);
  print('arrowOnRowCard', { before, after });
  await b.close();
}

// chip label / aria for near chips after expand
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });
  print('chipAria', await p.eval(`(() => {
    document.querySelector('.scene-toggle').click();
    const near = [...document.querySelectorAll('.scene-more .scene-chip')];
    return { nearCount: near.length,
      sample: near.slice(0,3).map(b=>({ txt:b.textContent, title:b.title, ariaPressed:b.getAttribute('aria-pressed'), ariaLabel:b.getAttribute('aria-label'), role:b.getAttribute('role') })),
      directSample: (()=>{ const d=document.querySelector('#flt-scene .scene-chip'); return { txt:d.textContent, title:d.title, ariaLabel:d.getAttribute('aria-label') }; })(),
      toggleRole: document.querySelector('.scene-toggle').getAttribute('aria-expanded'),
      toggleHasExpanded: document.querySelector('.scene-toggle').hasAttribute('aria-expanded'),
      toggleControls: document.querySelector('.scene-toggle').getAttribute('aria-controls'),
      moreHasId: !!document.querySelector('.scene-more').id
    };
  })()`));
  await b.close();
}

// Does the row card have aria-expanded?
{
  const b = await Browser.launch({ width: 1440, height: 900 });
  const p = await b.newPage({ width: 1440, height: 900 });
  await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });
  print('rowAria', await p.eval(`(() => {
    const r = document.querySelector('.row');
    r.click();
    return new Promise(res => setTimeout(() => {
      const r2 = document.querySelector('.row');
      return res({ ariaExpanded: r2.getAttribute('aria-expanded'), ariaControls: r2.getAttribute('aria-controls'),
        ariaCurrent: r2.getAttribute('aria-current'), role: r2.getAttribute('role'), label: r2.getAttribute('aria-label'),
        detailNoRole: document.getElementById('detail').getAttribute('role'),
        detailNoAriaLive: document.getElementById('detail').getAttribute('aria-live'),
        countLive: document.getElementById('count').getAttribute('aria-live') });
    }, 600));
  })()`));
  await b.close();
}
server.close();
