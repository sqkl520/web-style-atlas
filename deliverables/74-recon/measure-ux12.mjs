import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { Browser } from '../../tools/taste-skill/skills/taste-skill/scripts/lib/cdp.mjs';
const ROOT = 'D:/Web/style'; const PORT = 9773;
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
  await new Promise(r => setTimeout(r, 350));
};

const b = await Browser.launch({ width: 1440, height: 900 });
const p = await b.newPage({ width: 1440, height: 900 });
await p.goto(`${BASE}/prototypes/_selection/`, { settleMs: 3000 });

print('chipAria', await p.eval(`(() => {
  document.querySelector('.scene-toggle').click();
  const near = [...document.querySelectorAll('.scene-more .scene-chip')];
  const d = document.querySelector('#flt-scene .scene-chip');
  const t = document.querySelector('.scene-toggle');
  return { nearCount: near.length,
    nearSample: near.slice(0,2).map(b=>({ txt:b.textContent, title:b.title, ariaPressed:b.getAttribute('aria-pressed'), ariaLabel:b.getAttribute('aria-label') })),
    directSample: { txt:d.textContent, title:d.title, ariaLabel:d.getAttribute('aria-label') },
    toggle: { hasExpanded: t.hasAttribute('aria-expanded'), expanded: t.getAttribute('aria-expanded'), controls: t.getAttribute('aria-controls'), role: t.getAttribute('role'), text: t.textContent },
    moreHasId: !!document.querySelector('.scene-more').id };
})()`));

print('rowAria', await p.eval(`(() => {
  document.querySelector('.row').click();
  return new Promise(res => setTimeout(() => {
    const r2 = document.querySelector('.row');
    return res({ ariaExpanded: r2.getAttribute('aria-expanded'), ariaControls: r2.getAttribute('aria-controls'),
      ariaCurrent: r2.getAttribute('aria-current'), role: r2.getAttribute('role'), label: r2.getAttribute('aria-label'),
      detailRole: document.getElementById('detail').getAttribute('role'),
      detailAriaLive: document.getElementById('detail').getAttribute('aria-live'),
      countLive: document.getElementById('count').getAttribute('aria-live'),
      countText: document.getElementById('count').textContent });
  }, 700));
})()`));

// Esc on summary
await p.eval(`document.querySelector('#detail .fold > summary').focus()`);
print('escOnSummaryBefore', await p.eval(`({f:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,20), open:!document.getElementById('detail').hidden})`));
await kk(p, 'Escape', 'Escape', 27);
print('escOnSummaryAfter', await p.eval(`({f:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,22), open:!document.getElementById('detail').hidden, hash:location.hash})`));

// second Esc
await kk(p, 'Escape', 'Escape', 27);
print('escTwice', await p.eval(`({f:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,22), open:!document.getElementById('detail').hidden, hash:location.hash, y:Math.round(scrollY)})`));

// Tab reach to copy button FROM row card: how many
await p.eval(`const r=document.querySelector('.row[data-id=S01]'); r.scrollIntoView({block:'center'}); r.focus()`);
let n = 0, found = false;
for (let i = 0; i < 60; i++) {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  n++;
  const hit = await p.eval(`(() => { const a=document.activeElement; return { cls:(a.className||'').toString(), isCopy:(a.className||'').toString().includes('prompt-copy') }; })()`);
  if (hit.isCopy) { found = true; break; }
}
print('tabToCopyFromRow', { tabs: n, found });

// keyboard open row then tab to copy
await p.eval(`document.querySelector('#d-close').click()`);
await new Promise(r => setTimeout(r, 300));
await p.eval(`const r=document.querySelector('.row[data-id=S01]'); r.focus()`);
await kk(p, 'Enter', 'Enter', 13);
print('afterEnterOnRow', await p.eval(`({open:!document.getElementById('detail').hidden, f:document.activeElement.tagName+'.'+(document.activeElement.className||'').slice(0,22)})`));
let n2 = 0, found2 = false;
for (let i = 0; i < 30; i++) {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  n2++;
  const hit = await p.eval(`(() => { const a=document.activeElement; return { isCopy:(a.className||'').toString().includes('prompt-copy') }; })()`);
  if (hit.isCopy) { found2 = true; break; }
}
print('tabToCopyAfterEnter', { tabs: n2, found: found2 });

// 1/2/3 viewport switch while focus in search box?
await p.eval(`document.getElementById('q').focus()`);
await kk(p, '1', 'Digit1', 49);
print('digitInSearch', await p.eval(`({q:document.getElementById('q').value, focus:document.activeElement.id})`));

await b.close();
server.close();
